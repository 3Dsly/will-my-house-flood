// src/geocode.js
// Two geocoders are cross-checked because neither is reliably precise alone:
// Cesium ion's default (Bing-backed) geocoder often returns only a bounding
// box for a match with no actual point — for anything outside dense city
// cores that box can be 1-2 km across, and blindly centring on it can land
// far from the real address. Nominatim (OpenStreetMap) exposes a match
// "type" (house/building = rooftop-precise) we can trust when present.
const PRECISE_TYPES = new Set(["house", "building"]);

async function geocodeIon(viewer, query) {
  const svc = new Cesium.IonGeocoderService({ scene: viewer.scene });
  const results = await svc.geocode(query);
  const r = results && results[0];
  if (!r) return null;
  if (r.destination instanceof Cesium.Rectangle) {
    const c = Cesium.Rectangle.center(r.destination);
    return {
      lat: Cesium.Math.toDegrees(c.latitude),
      lon: Cesium.Math.toDegrees(c.longitude),
      name: r.displayName || query,
      rectangle: r.destination,
      precise: false
    };
  }
  const c = Cesium.Cartographic.fromCartesian(r.destination);
  return {
    lat: Cesium.Math.toDegrees(c.latitude),
    lon: Cesium.Math.toDegrees(c.longitude),
    name: r.displayName || query,
    rectangle: null,
    precise: true
  };
}

async function geocodeNominatim(query) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" +
    encodeURIComponent(query);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const results = await res.json();
  const r = results && results[0];
  if (!r) return null;
  const [south, north, west, east] = r.boundingbox.map(Number);
  return {
    lat: +r.lat,
    lon: +r.lon,
    name: r.display_name || query,
    rectangle: Cesium.Rectangle.fromDegrees(west, south, east, north),
    precise: PRECISE_TYPES.has(r.type)
  };
}

// Returns { lat, lon, name, rectangle, precise } or null.
// rectangle is the match's uncertainty area (null when destination is an
// exact point); precise is true only for a rooftop/building-level match.
export async function geocodeAddress(viewer, query) {
  const [nomiResult, ionResult] = await Promise.allSettled([
    geocodeNominatim(query),
    geocodeIon(viewer, query)
  ]);
  const n = nomiResult.status === "fulfilled" ? nomiResult.value : null;
  const i = ionResult.status === "fulfilled" ? ionResult.value : null;
  if (n && n.precise) return n;
  return i || n;
}
