// src/main.js — orchestrator: wires viewer, geoid, geocoder, geolocation,
// elevation sampling, datum math, the water surface and the readout together.
import { createViewer } from "./viewer.js";
import { geocodeAddress } from "./geocode.js";
import { getCurrentLocation } from "./geolocate.js";
import { sampleGroundElevation } from "./elevation.js";
import { createGeoid } from "./geoid.js";
import { waterEllipsoidHeight, mslElevation, floodDepth } from "./datum.js";
import { createWater } from "./water.js";
import { createDepthMarker } from "./depthmarker.js";
import { formatReadout } from "./readout.js";
import { parseState, writeState } from "./urlstate.js";
import { initUI } from "./ui.js";

const cfg = window.APP_CONFIG || {};
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

let viewer = null;
let water = null;
let marker = null;
let geoid = null; // null => treat undulation N as 0
let ui = null;

const state = {
  lat: null,
  lon: null,
  rise: 70,
  groundMslM: null, // MSL metres at (lat, lon); may stay null if unavailable
  groundEllipM: null, // same point, raw WGS84-ellipsoidal height (for the water/marker frame)
  N: 0, // cached geoid undulation for the current point
  placeName: null
};
let applySeq = 0; // guards against a stale applyLocation overwriting a newer one
let warnedNoGeoid = false; // one-time warning when converting without a geoid grid

// --- rAF throttles (one pending frame max) ------------------------------
let writePending = false;
function writeStateThrottled() {
  if (writePending) return;
  writePending = true;
  requestAnimationFrame(() => {
    writePending = false;
    if (state.lat === null || state.lon === null) return;
    writeState({ lat: state.lat, lon: state.lon, rise: state.rise });
  });
}

let waterPending = false;
function rebuildWaterThrottled() {
  if (waterPending) return;
  waterPending = true;
  requestAnimationFrame(() => {
    waterPending = false;
    if (state.lat === null) return;
    const waterM = waterEllipsoidHeight(state.rise, state.N);
    water.setHeight(waterM);
    if (state.groundEllipM === null) return;
    marker.update(
      state.lat,
      state.lon,
      state.groundEllipM,
      waterM,
      floodDepth(state.rise, state.groundMslM)
    );
    marker.show();
  });
}

// --- terrain readiness (mandatory fix #1) ------------------------------
// createViewer() begins loading world terrain asynchronously; until it
// resolves viewer.terrainProvider is an EllipsoidTerrainProvider and
// sampleGroundElevation() returns ~0 m. Gate the first sample on the
// provider actually switching to CesiumTerrainProvider.
// Resolves true once the provider actually became CesiumTerrainProvider, false
// if the 15 s timeout fired first. A timed-out run must NOT sample — the
// EllipsoidTerrainProvider returns ~0 m, which the readout would render as
// "-N m below sea level".
function whenTerrainReady() {
  if (viewer.terrainProvider instanceof Cesium.CesiumTerrainProvider) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ready) => {
      if (settled) return;
      settled = true;
      remove();
      clearTimeout(timer);
      resolve(ready);
    };
    const remove = viewer.scene.terrainProviderChanged.addEventListener(
      () => finish(viewer.terrainProvider instanceof Cesium.CesiumTerrainProvider)
    );
    const timer = setTimeout(() => finish(false), 15000);
  });
}

// --- core action -----------------------------------------------------------
function flyTo(lon, lat) {
  return new Promise((resolve) => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, 3000),
      orientation: { pitch: Cesium.Math.toRadians(-45) },
      duration: 2,
      complete: resolve,
      cancel: resolve
    });
  });
}

// Used when the geocoder could only narrow the address down to an area
// (a rectangle), not an exact point — frame the whole uncertain area
// top-down instead of confidently zooming in on a possibly-wrong spot.
function flyToRectangle(rectangle) {
  return new Promise((resolve) => {
    viewer.camera.flyTo({
      destination: rectangle,
      duration: 2,
      complete: resolve,
      cancel: resolve
    });
  });
}

function applyLocation({ lat, lon, name, rectangle = null, precise = true }) {
  return runApplyLocation({ lat, lon, name, rectangle, precise }).catch((e) =>
    console.error(e)
  );
}

async function runApplyLocation({ lat, lon, name, rectangle, precise }) {
  const seq = ++applySeq;
  ui.setBusy(true);
  ui.setStatus("");
  state.lat = lat;
  state.lon = lon;
  state.placeName = name;
  // The elevation is unknown until the fly-to + terrain sample finish (~2 s+).
  // Clear the stale value and say so, otherwise a slider drag in that window
  // renders "<newPlace> is about <oldElevation> m..." — confidently wrong.
  state.groundMslM = null;
  state.groundEllipM = null;
  marker.hide();
  ui.setReadout("Measuring elevation…");

  try {
    if (precise || !rectangle) {
      await flyTo(lon, lat);
    } else {
      await flyToRectangle(rectangle);
      ui.setStatus(
        "Couldn't pin down the exact address — showing the general area. Pan/zoom to find your house."
      );
    }
    if (seq !== applySeq) return;

    const terrainReady = await whenTerrainReady();
    if (seq !== applySeq) return;

    // Cesium World Terrain samples are WGS84-ELLIPSOIDAL; convert to MSL by
    // subtracting the local geoid undulation N before the readout uses them.
    // A timed-out terrain load leaves the EllipsoidTerrainProvider in place —
    // skip the sample entirely so groundMslM stays null (honest "unavailable").
    let rawEllip = null;
    if (terrainReady) {
      rawEllip = await sampleGroundElevation(viewer, lat, lon);
      if (seq !== applySeq) return;
      if (rawEllip === null) {
        // first sample can miss before detailed tiles arrive — retry once
        await delay(1500);
        if (seq !== applySeq) return;
        rawEllip = await sampleGroundElevation(viewer, lat, lon);
        if (seq !== applySeq) return;
      }
    }

    state.N = geoid ? geoid.undulation(lat, lon) : 0;
    if (!geoid && !warnedNoGeoid) {
      warnedNoGeoid = true;
      console.warn(
        "geoid grid unavailable — elevation readout may be off by up to ~100 m"
      );
    }
    const groundMslM =
      rawEllip === null ? null : mslElevation(rawEllip, state.N);
    state.groundMslM = groundMslM;
    state.groundEllipM = rawEllip;

    const waterM = waterEllipsoidHeight(state.rise, state.N);
    water.setCenter(lat, lon);
    water.setHeight(waterM);
    water.show();

    if (rawEllip !== null) {
      marker.update(lat, lon, rawEllip, waterM, floodDepth(state.rise, groundMslM));
      marker.show();
    }

    ui.setReadout(
      formatReadout({ groundMslM, riseM: state.rise, placeName: name })
    );
    writeStateThrottled();
  } finally {
    if (seq === applySeq) ui.setBusy(false);
  }
}

// --- UI callbacks --------------------------------------------------------
async function handleSearch(query) {
  ui.setStatus("");
  ui.setBusy(true);
  let hit;
  try {
    hit = await geocodeAddress(viewer, query);
  } catch (err) {
    console.error(err);
    hit = null;
  } finally {
    ui.setBusy(false);
  }
  if (!hit) {
    ui.setStatus("Couldn't find that place — try adding a city or country.");
    return;
  }
  applyLocation({
    lat: hit.lat,
    lon: hit.lon,
    name: hit.name,
    rectangle: hit.rectangle,
    precise: hit.precise
  });
}

async function handleLocate() {
  ui.setStatus("");
  ui.setBusy(true);
  let loc;
  try {
    loc = await getCurrentLocation();
  } catch (err) {
    const copy = {
      "geolocation-denied": "Location access was denied — type an address instead.",
      "geolocation-unavailable": "Location isn't available — type an address instead.",
      "geolocation-failed": "Couldn't get your location — try again or type an address."
    };
    ui.setStatus(
      copy[err && err.message] ||
        "Couldn't get your location — try again or type an address."
    );
    ui.focusAddress();
    return;
  } finally {
    ui.setBusy(false);
  }
  applyLocation({ lat: loc.lat, lon: loc.lon, name: "Your location" });
}

function handleRiseChange(rise) {
  state.rise = rise;
  if (state.lat === null) return; // slider still moves before a location is set
  ui.setReadout(
    formatReadout({
      groundMslM: state.groundMslM,
      riseM: rise,
      placeName: state.placeName
    })
  );
  rebuildWaterThrottled();
  writeStateThrottled();
}

// --- boot --------------------------------------------------------------
async function boot() {
  try {
    viewer = await createViewer("cesium", cfg.ionToken);
  } catch (err) {
    // Any boot failure — missing/placeholder token, a restricted token with the
    // wrong domain allowlist, a 401/403/quota on ion imagery — shows the same
    // card. Leaving #searchBar/#controls up would be a silent dead page.
    console.error(err);
    document.getElementById("tokenError").hidden = false;
    document.getElementById("searchBar").hidden = true;
    document.getElementById("controls").hidden = true;
    return;
  }

  window.__viewer = viewer; // for manual poking during dev
  document.getElementById("tokenError").hidden = true;
  document.getElementById("searchBar").hidden = false;
  document.getElementById("controls").hidden = false;

  // Geoid grid — optional. On any failure keep geoid = null and use N = 0.
  try {
    const res = await fetch("vendor/egm96/egm96-15.pgm");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    geoid = createGeoid(await res.arrayBuffer());
  } catch (err) {
    geoid = null;
    console.warn("geoid grid unavailable; using N = 0", err);
  }

  water = createWater(viewer);
  marker = createDepthMarker(viewer);

  const shared = parseState(location.search);
  state.rise = shared?.rise ?? 70;

  ui = initUI({
    onSearch: handleSearch,
    onLocate: handleLocate,
    onRiseChange: handleRiseChange
  });
  ui.setRise(state.rise);

  if (!geoid) {
    ui.setStatus("Using approximate elevations — geoid data didn't load.");
  }

  if (shared) {
    applyLocation({ lat: shared.lat, lon: shared.lon, name: "Shared location" });
  }
}

boot();
