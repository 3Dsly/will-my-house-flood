# Will My House Flood? Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static CesiumJS web app where a visitor enters an address (or uses GPS), the 3D globe flies there, and a water surface renders at a chosen sea-level rise with a readout of how far underwater the spot is.

**Architecture:** Build-less static site. Pure logic modules (datum math, EGM96 geoid lookup, readout text, URL state) are plain ES modules unit-tested with `node --test`. Browser-integration modules (Cesium viewer, geocode, geolocation, terrain sampling, water primitive, DOM UI) are thin wrappers verified manually in a browser against explicit expected results — there is no headless-browser harness and standing one up is not justified at this size. `main.js` wires them together. Deployed to GitHub Pages via a build-less Actions workflow.

**Tech Stack:** CesiumJS 1.124 (CDN, pinned), vanilla JS ES modules, no framework, no bundler. Node 24 (`node --test`) for unit tests only. EGM96 15-arc-minute geoid grid (public domain, GeographicLib/NGA) vendored into the repo.

**Spec:** `docs/superpowers/specs/2026-09-10-will-my-house-flood-design.md`

## Global Constraints

- No backend, no build step, no bundler. The deployed artifact is the repo root served as static files.
- No framework. Vanilla JS ES modules, plain CSS, system font stack.
- CesiumJS pinned to exactly `1.124.0` from `https://cdnjs.cloudflare.com/ajax/libs/cesium/1.124.0/`. `window.CESIUM_BASE_URL` set to that same URL.
- Cesium ion access token is read from `window.APP_CONFIG.ionToken` (set in `config.js`). Never hardcode a token in any other file. `config.js` IS committed (client-side token, same model as a Mapbox token); `config.example.js` carries a placeholder.
- Vertical datum rule (from spec): terrain heights from Cesium are in the **geoid (≈MSL)** frame; Cesium geometry `height` is **ellipsoidal**. `waterEllipsoidHeight = riseMeters + N`, where `N` is the EGM96 undulation at the point. `floodDepth = riseMeters - groundElevationMslMeters` (positive = underwater). The depth readout needs **no** datum conversion; only the water surface height does.
- Rise slider range `0`–`70` metres, integer step, default `70`. Presets: `1`, `10`, `30`, `70`.
- Deep-link params: `?lat=<deg>&lon=<deg>&rise=<m>`. Written on every state change (throttled `replaceState`); read on load.
- `.nojekyll` present so Pages serves `vendor/` and every path verbatim.
- Every user-facing string must keep the "bathtub model / approximation, not a survey" framing where the spec calls for it (About panel + README Limitations).
- License: MIT (code). Vendored geoid data: public domain — note provenance in `vendor/egm96/README.md`.
- Commit after every task. Commit messages: `feat:` / `test:` / `chore:` / `docs:` prefix, present tense.

---

## File Structure

```
will-my-house-flood/
  index.html                     # markup, overlay UI containers, Cesium CDN tags, module entry
  style.css                      # overlay UI + responsive layout
  config.js                      # window.APP_CONFIG = { ionToken: "<real token>" }  (committed)
  config.example.js              # window.APP_CONFIG = { ionToken: "YOUR_CESIUM_ION_TOKEN" }
  package.json                   # { "type": "module", "scripts": { "test": "node --test" } }
  .gitignore
  .nojekyll
  LICENSE                        # MIT
  README.md
  src/
    main.js                      # orchestrator, no exports
    viewer.js                    # createViewer(containerId, ionToken) -> Promise<Cesium.Viewer>
    geocode.js                   # geocodeAddress(viewer, query) -> Promise<{lat,lon,name}|null>
    geolocate.js                 # getCurrentLocation() -> Promise<{lat,lon}>
    elevation.js                 # sampleGroundElevation(viewer, lat, lon) -> Promise<number|null>
    geoid.js                     # createGeoid(pgmBytes) -> { undulation(lat, lon): number }
    datum.js                     # waterEllipsoidHeight(riseM, N); floodDepth(riseM, groundMslM)
    water.js                     # createWater(viewer) -> { setHeight(ellipsoidM), show(), hide() }
    readout.js                   # formatReadout({ groundMslM, riseM, placeName }) -> string
    urlstate.js                  # parseState(search); buildQuery(state); readState(); writeState(state)
  vendor/
    egm96/egm96-15.pgm           # ~2 MB, big-endian uint16 raster, GeographicLib format
    egm96/README.md              # provenance + public-domain note
  assets/
    favicon.png
    og-image.png
  test/
    datum.test.js
    geoid.test.js
    readout.test.js
    urlstate.test.js
  .github/workflows/pages.yml
  docs/superpowers/specs/2026-09-10-will-my-house-flood-design.md
  docs/superpowers/plans/2026-09-10-will-my-house-flood.md
```

**Testable with `node --test`:** `datum.js`, `geoid.js`, `readout.js`, `urlstate.js` (its pure parts `parseState` / `buildQuery`).
**Manual browser verification:** `viewer.js`, `geocode.js`, `geolocate.js`, `elevation.js`, `water.js`, `ui`-in-`index.html`/`style.css`, `main.js`.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `.gitignore`, `.nojekyll`, `LICENSE`, `config.example.js`, `config.js`, `index.html`, `style.css`
- Create: `src/` and `test/` directories (with a `.gitkeep` in `test/` removed once real tests land)

**Interfaces:**
- Consumes: nothing.
- Produces: `window.APP_CONFIG.ionToken` (string) available to all `src/` modules; `window.CESIUM_BASE_URL` set before Cesium loads; global `Cesium` from the CDN.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "will-my-house-flood",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Type your address, see it under a risen sea. Companion app for the 'When All The Ice Melts' video.",
  "scripts": {
    "test": "node --test",
    "serve": "python -m http.server 8080"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: Create `.gitignore`**

```
.DS_Store
Thumbs.db
node_modules/
*.log
.vscode/
```

- [ ] **Step 3: Create `.nojekyll` (empty file) and `LICENSE` (standard MIT text, year 2026, copyright holder "Sylvain Demers")**

- [ ] **Step 4: Create `config.example.js`**

```js
// Copy this file to config.js and paste your free Cesium ion token.
// Get one at https://cesium.com/ion  ->  Access Tokens  ->  default token.
window.APP_CONFIG = {
  ionToken: "YOUR_CESIUM_ION_TOKEN"
};
```

- [ ] **Step 5: Create `config.js` with the same shape and the placeholder value for now**

```js
window.APP_CONFIG = {
  ionToken: "YOUR_CESIUM_ION_TOKEN"
};
```

(The real token is pasted in Task 12.)

- [ ] **Step 6: Create `index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Will My House Flood?</title>
  <meta name="description" content="Type your address and see it under a risen sea. Companion to the film 'When All The Ice Melts'.">
  <meta property="og:title" content="Will My House Flood?">
  <meta property="og:description" content="Type your address and see it under a risen sea.">
  <meta property="og:image" content="assets/og-image.png">
  <link rel="icon" href="assets/favicon.png">
  <script>window.CESIUM_BASE_URL = "https://cdnjs.cloudflare.com/ajax/libs/cesium/1.124.0/";</script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/cesium/1.124.0/Widgets/widgets.css" rel="stylesheet">
  <link href="style.css" rel="stylesheet">
</head>
<body>
  <div id="cesium" role="application" aria-label="3D globe"></div>

  <div id="tokenError" class="panel error" hidden>
    <h1>Set a Cesium ion token</h1>
    <p>This site needs a free Cesium ion token in <code>config.js</code>.
       See the <a href="https://github.com/3Dsly/will-my-house-flood#readme">README</a>.</p>
  </div>

  <header id="searchBar" class="panel">
    <h1>Will my house flood?</h1>
    <form id="searchForm">
      <input id="addressInput" type="text" placeholder="Enter an address or place" autocomplete="off" enterkeyhint="search">
      <button id="searchBtn" type="submit">Search</button>
      <button id="locateBtn" type="button">Use my location</button>
    </form>
    <p id="statusLine" class="status" aria-live="polite"></p>
  </header>

  <footer id="controls" class="panel">
    <div class="presets" role="group" aria-label="Rise presets">
      <button type="button" data-rise="1">1 m</button>
      <button type="button" data-rise="10">10 m</button>
      <button type="button" data-rise="30">30 m</button>
      <button type="button" data-rise="70">70 m</button>
    </div>
    <label class="slider">
      Sea-level rise: <output id="riseOut">70</output> m
      <input id="riseInput" type="range" min="0" max="70" step="1" value="70">
    </label>
    <p id="readout" class="readout" aria-live="polite">Search a place to begin.</p>
    <button id="aboutBtn" type="button" class="link">About &amp; limitations</button>
  </footer>

  <div id="aboutPanel" class="panel about" hidden>
    <button id="aboutClose" type="button" class="close" aria-label="Close">&times;</button>
    <h2>About this map</h2>
    <p>This is a <strong>&ldquo;bathtub&rdquo; model</strong>: it fills every point of
       land that sits below the line you choose, whether or not the ocean could
       physically reach it. It is an approximation for illustration, not a survey
       or a flood-risk assessment.</p>
    <p>+70&nbsp;m is the sea level if all land ice on Earth melted. It says nothing
       about <em>when</em> &mdash; realistic rise this century is under about a metre.</p>
    <p><a id="videoLink" href="#">Watch the video</a> &middot;
       <a href="https://github.com/3Dsly/will-my-house-flood">Source on GitHub</a></p>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/cesium/1.124.0/Cesium.js"></script>
  <script src="config.js"></script>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

- [ ] **Step 7: Create `style.css`** — minimal skeleton now (full styling in Task 10). Enough that panels are visible and the globe fills the screen:

```css
:root { color-scheme: dark; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: #0b1622; }
#cesium { position: fixed; inset: 0; }
.panel { position: fixed; z-index: 2; background: rgba(12,22,34,.82); color: #eaf2f8;
  backdrop-filter: blur(6px); padding: 12px 14px; border-radius: 10px; }
#searchBar { top: 12px; left: 12px; right: 12px; max-width: 460px; }
#controls  { bottom: 12px; left: 12px; right: 12px; max-width: 460px; }
#searchBar h1, .about h2 { margin: 0 0 8px; font-size: 1rem; }
input[type=text] { width: 100%; padding: 8px; margin-bottom: 6px; }
.readout { margin: 8px 0 0; font-size: .95rem; line-height: 1.35; }
.error { top: 50%; left: 50%; transform: translate(-50%,-50%); max-width: 340px; text-align: center; }
.about { top: 50%; left: 50%; transform: translate(-50%,-50%); max-width: 380px; }
[hidden] { display: none !important; }
```

- [ ] **Step 8: Verify the scaffold**

Run: `npm test`
Expected: exits 0, reports `tests 0` (no test files yet).

Run: `python -m http.server 8080` then open `http://localhost:8080/`.
Expected: dark page, the "Will my house flood?" search bar top-left, the rise controls bottom-left, an empty black `#cesium` area behind them (Cesium not wired yet — no errors in console except possibly a benign one from `main.js` not existing; if so, create `src/main.js` as an empty file with `// entry` and re-check: console clean).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold static site, config, index skeleton"
```

---

## Task 2: Datum math (`datum.js`) — TDD

**Files:**
- Create: `src/datum.js`
- Test: `test/datum.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `waterEllipsoidHeight(riseMeters: number, geoidUndulationMeters: number): number` — returns `riseMeters + geoidUndulationMeters`.
  - `floodDepth(riseMeters: number, groundElevationMslMeters: number): number` — returns `riseMeters - groundElevationMslMeters`. Positive ⇒ that many metres underwater; negative ⇒ that many metres above the new sea.

- [ ] **Step 1: Write the failing test**

```js
// test/datum.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { waterEllipsoidHeight, floodDepth } from "../src/datum.js";

test("waterEllipsoidHeight adds the geoid undulation to the rise", () => {
  assert.equal(waterEllipsoidHeight(70, 46), 116);
  assert.equal(waterEllipsoidHeight(0, -30), -30);
  assert.equal(waterEllipsoidHeight(10, 0), 10);
});

test("floodDepth: Badwater Basin (-85 m MSL) is underwater at every rise", () => {
  assert.equal(floodDepth(0, -85), 85);
  assert.equal(floodDepth(70, -85), 155);
});

test("floodDepth: Denver (~1600 m MSL) stays above the sea at +70 m", () => {
  assert.equal(floodDepth(70, 1600), -1530);
});

test("floodDepth: a 2 m-elevation coast is ~68 m under at +70 m", () => {
  assert.equal(floodDepth(70, 2), 68);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/datum.test.js`
Expected: FAIL — `Cannot find module '../src/datum.js'`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/datum.js
// Cesium terrain heights are ~geoid (MSL); Cesium geometry `height` is ellipsoidal.
// Convert only the water surface; the depth readout works directly in the MSL frame.

/** Ellipsoidal height to place the water surface at, given rise and local geoid undulation N. */
export function waterEllipsoidHeight(riseMeters, geoidUndulationMeters) {
  return riseMeters + geoidUndulationMeters;
}

/** Metres the given ground point is underwater (positive) or above the new sea (negative). */
export function floodDepth(riseMeters, groundElevationMslMeters) {
  return riseMeters - groundElevationMslMeters;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/datum.test.js`
Expected: PASS — 4 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/datum.js test/datum.test.js
git commit -m "feat: datum math for water height and flood depth"
```

---

## Task 3: EGM96 geoid lookup (`geoid.js`) + vendored grid — TDD

**Files:**
- Create: `src/geoid.js`
- Create: `vendor/egm96/egm96-15.pgm` (downloaded), `vendor/egm96/README.md`
- Test: `test/geoid.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `createGeoid(pgmBytes: Uint8Array | ArrayBuffer): { undulation(latDeg: number, lonDeg: number): number }`
  - `undulation` accepts latitude `90..-90`, longitude in either `-180..180` or `0..360`, wraps longitude, clamps latitude to the grid edge, and bilinearly interpolates. Returns metres (EGM96 height above the WGS84 ellipsoid; i.e. `N`).

**Background — the file format (GeographicLib `egm96-15.pgm`):**
Binary PGM. ASCII header `P5\n`, then comment lines beginning `#`, two of which are `# Offset <number>` and `# Scale <number>`. Then `<width> <height>\n` (`1440 721`), then `65535\n`, then `width*height` big-endian `uint16` samples, row-major from the **north-west** corner: row 0 = latitude `+90`, column 0 = longitude `0`, step `0.25°` east and south. Value in metres = `offset + scale * raw`.

- [ ] **Step 1: Download and vendor the grid**

Run:
```bash
mkdir -p vendor/egm96
curl -L -o /tmp/egm96-15.tar.bz2 \
  "https://downloads.sourceforge.net/project/geographiclib/geoids-distrib/egm96-15.tar.bz2"
tar -xjf /tmp/egm96-15.tar.bz2 -C /tmp
cp /tmp/geoids/egm96-15.pgm vendor/egm96/egm96-15.pgm
ls -l vendor/egm96/egm96-15.pgm   # expect ~2.0 MB
```
If SourceForge is unreachable, get `egm96-15.pgm` from any GeographicLib geoid-data mirror; it must be the 15-arc-minute EGM96 PGM, `1440x721`, ~2 MB. Verify the header:
```bash
head -c 200 vendor/egm96/egm96-15.pgm | tr -c '[:print:]\n' '.'
```
Expected: shows `P5`, a `# Offset -108` line and a `# Scale 0.003` line (values may differ slightly by distribution — the parser reads them, does not assume them), then `1440 721`, then `65535`.

- [ ] **Step 2: Write `vendor/egm96/README.md`**

```markdown
# EGM96 15-arc-minute geoid grid

`egm96-15.pgm` — geoid undulation (height of mean sea level above the WGS84
ellipsoid), 15-arc-minute resolution, 1440x721 samples.

Source: GeographicLib geoid data distribution
(https://geographiclib.sourceforge.io/C++/doc/geoid.html), which repackages the
U.S. National Geospatial-Intelligence Agency EGM96 model. EGM96 and this
repackaging are in the **public domain** (work of the U.S. government).

Used here to convert a chosen sea-level rise (metres above mean sea level) into
the ellipsoidal height CesiumJS geometry needs.
```

- [ ] **Step 3: Write the failing test**

```js
// test/geoid.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createGeoid } from "../src/geoid.js";

const pgm = readFileSync(fileURLToPath(new URL("../vendor/egm96/egm96-15.pgm", import.meta.url)));
const geoid = createGeoid(pgm);

// EGM96 undulation is well-known within these bounds. Tighten to a single
// reference value per point once you have run an independent check (see Step 6).
test("London is a strong geoid high (~ +45 to +47 m)", () => {
  const n = geoid.undulation(51.5074, -0.1278);
  assert.ok(n > 44 && n < 48, `got ${n}`);
});

test("Washington DC area is a geoid low (~ -32 to -35 m)", () => {
  const n = geoid.undulation(38.8895, -77.0353);
  assert.ok(n > -36 && n < -31, `got ${n}`);
});

test("south of India / Indian Ocean is the global minimum (~ -95 to -106 m)", () => {
  const n = geoid.undulation(4.7, 78.0);
  assert.ok(n > -107 && n < -94, `got ${n}`);
});

test("longitude accepted as 0..360 and as -180..180 give the same value", () => {
  assert.ok(Math.abs(geoid.undulation(51.5074, -0.1278) - geoid.undulation(51.5074, 359.8722)) < 1e-6);
});

test("clamps latitude at the poles without throwing", () => {
  assert.equal(Number.isFinite(geoid.undulation(90, 0)), true);
  assert.equal(Number.isFinite(geoid.undulation(-90, 123)), true);
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `node --test test/geoid.test.js`
Expected: FAIL — `Cannot find module '../src/geoid.js'`.

- [ ] **Step 5: Write the implementation**

```js
// src/geoid.js
// Parse a GeographicLib-format EGM96 .pgm geoid grid and bilinearly sample it.

function parsePgm(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  // Header is ASCII up to and including the line after maxval.
  let pos = 0;
  const readToken = () => {
    // skip whitespace, but a '#' starts a comment line we must scan for Offset/Scale
    for (;;) {
      while (pos < u8.length && (u8[pos] === 32 || u8[pos] === 9 || u8[pos] === 10 || u8[pos] === 13)) pos++;
      if (u8[pos] === 35 /* # */) {
        const start = pos;
        while (pos < u8.length && u8[pos] !== 10) pos++;
        commentLines.push(String.fromCharCode(...u8.subarray(start, pos)));
        continue;
      }
      break;
    }
    const start = pos;
    while (pos < u8.length && !(u8[pos] === 32 || u8[pos] === 9 || u8[pos] === 10 || u8[pos] === 13)) pos++;
    return String.fromCharCode(...u8.subarray(start, pos));
  };
  const commentLines = [];
  const magic = readToken();
  if (magic !== "P5") throw new Error(`not a binary PGM: ${magic}`);
  const width = parseInt(readToken(), 10);
  const height = parseInt(readToken(), 10);
  const maxval = parseInt(readToken(), 10);
  // exactly one whitespace byte follows maxval before the raster
  pos += 1;
  if (maxval < 256) throw new Error("expected 16-bit PGM");
  let offset = -108, scale = 0.003;
  for (const line of commentLines) {
    const mo = line.match(/Offset\s+(-?[\d.]+)/i);
    const ms = line.match(/Scale\s+(-?[\d.eE]+)/i);
    if (mo) offset = parseFloat(mo[1]);
    if (ms) scale = parseFloat(ms[1]);
  }
  const raster = new DataView(u8.buffer, u8.byteOffset + pos, width * height * 2);
  return { width, height, offset, scale, raster };
}

export function createGeoid(pgmBytes) {
  const { width, height, offset, scale, raster } = parsePgm(pgmBytes);
  const raw = (col, row) => raster.getUint16(2 * (row * width + col), false); // big-endian
  const h = (col, row) => offset + scale * raw(col, row);

  function undulation(latDeg, lonDeg) {
    let lon = ((lonDeg % 360) + 360) % 360;          // 0..360
    let lat = Math.max(-90, Math.min(90, latDeg));
    const fx = lon / (360 / width);                   // 0..width (wraps)
    const fy = (90 - lat) / (180 / (height - 1));     // 0..height-1 (row 0 == +90)
    const x0 = Math.floor(fx) % width;
    const x1 = (x0 + 1) % width;
    const y0 = Math.min(height - 1, Math.floor(fy));
    const y1 = Math.min(height - 1, y0 + 1);
    const tx = fx - Math.floor(fx);
    const ty = fy - y0;
    const top = h(x0, y0) * (1 - tx) + h(x1, y0) * tx;
    const bot = h(x0, y1) * (1 - tx) + h(x1, y1) * tx;
    return top * (1 - ty) + bot * ty;
  }

  return { undulation };
}
```

- [ ] **Step 6: Run tests; then tighten with an independent reference value**

Run: `node --test test/geoid.test.js`
Expected: PASS — 5 tests.

Then get one authoritative value to lock the calibration. Either install GeographicLib (`pip install geographiclib` gives no CLI; use the C++ `GeoidEval` if available) or use the NOAA/UNAVCO online geoid calculator, for `51.5074 -0.1278` (London). Add an assertion:

```js
test("London matches an independent EGM96 reference within 0.5 m", () => {
  const REFERENCE_N = /* value you looked up, e.g. 46.2 */ 46.2;
  assert.ok(Math.abs(geoid.undulation(51.5074, -0.1278) - REFERENCE_N) < 0.5);
});
```

Re-run; if it fails by a roughly constant offset everywhere, re-check the `offset`/`scale` comment parsing or big-endian flag. If it fails by a half-cell shift, re-check the `fy`/`fx` origin (row 0 is `+90`, not `+90 - step/2`).

- [ ] **Step 7: Commit**

```bash
git add src/geoid.js test/geoid.test.js vendor/egm96/
git commit -m "feat: vendored EGM96 grid and bilinear geoid undulation lookup"
```

---

## Task 4: Readout text (`readout.js`) — TDD

**Files:**
- Create: `src/readout.js`
- Test: `test/readout.test.js`

**Interfaces:**
- Consumes: `floodDepth` from `src/datum.js`.
- Produces: `formatReadout({ groundMslM: number | null, riseM: number, placeName?: string }): string`.
  - `groundMslM === null` ⇒ elevation unavailable branch.
  - depth `> 0` ⇒ "…would be **N m underwater**." depth `<= 0` ⇒ "…stays **N m above** the new sea level." (use `Math.round`, `Math.abs`).
  - Leading clause names the place when `placeName` is given, otherwise "This spot".
  - Always mentions the today-elevation when known.

- [ ] **Step 1: Write the failing test**

```js
// test/readout.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { formatReadout } from "../src/readout.js";

test("underwater case names the place, today's elevation, and the depth", () => {
  const s = formatReadout({ groundMslM: 2, riseM: 70, placeName: "Miami Beach" });
  assert.match(s, /Miami Beach/);
  assert.match(s, /2 m above sea level/);
  assert.match(s, /68 m underwater/);
});

test("above-water case uses the 'above the new sea level' phrasing", () => {
  const s = formatReadout({ groundMslM: 1600, riseM: 70, placeName: "Denver" });
  assert.match(s, /1530 m above the new sea level/);
  assert.doesNotMatch(s, /underwater/);
});

test("exactly at the line reads as 0 m above, not underwater", () => {
  const s = formatReadout({ groundMslM: 70, riseM: 70 });
  assert.match(s, /0 m above the new sea level/);
});

test("null elevation falls back to an honest 'unavailable' line but still states the rise", () => {
  const s = formatReadout({ groundMslM: null, riseM: 30, placeName: "Somewhere" });
  assert.match(s, /elevation.*unavailable/i);
  assert.match(s, /30 m/);
});

test("no placeName uses 'This spot'", () => {
  const s = formatReadout({ groundMslM: 10, riseM: 5 });
  assert.match(s, /^This spot/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/readout.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// src/readout.js
import { floodDepth } from "./datum.js";

export function formatReadout({ groundMslM, riseM, placeName }) {
  const who = placeName ? placeName : "This spot";
  if (groundMslM === null || groundMslM === undefined || !Number.isFinite(groundMslM)) {
    return `${who}: ground elevation is unavailable here, so the depth can't be computed. ` +
           `The water shown is a ${riseM} m sea-level rise.`;
  }
  const today = `${Math.round(groundMslM)} m above sea level`;
  const depth = floodDepth(riseM, groundMslM);
  if (depth > 0) {
    return `${who} is about ${today} today. With a ${riseM} m rise it would be ` +
           `${Math.round(depth)} m underwater.`;
  }
  return `${who} is about ${today} today. With a ${riseM} m rise it stays ` +
         `${Math.abs(Math.round(depth))} m above the new sea level.`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/readout.test.js`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/readout.js test/readout.test.js
git commit -m "feat: readout line formatting"
```

---

## Task 5: URL deep-link state (`urlstate.js`) — TDD

**Files:**
- Create: `src/urlstate.js`
- Test: `test/urlstate.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `parseState(search: string): { lat: number, lon: number, rise: number } | null` — `search` is a `location.search`-style string (`"?lat=..&lon=..&rise=.."`). Returns `null` unless `lat` ∈ [-90,90], `lon` ∈ [-180,180], `rise` ∈ [0,70] all parse as finite numbers.
  - `buildQuery({ lat, lon, rise }): string` — returns `"?lat=..&lon=..&rise=.."`, lat/lon fixed to 5 decimals, rise integer.
  - `readState(): {...} | null` — thin wrapper: `parseState(location.search)`.
  - `writeState(state): void` — thin wrapper: `history.replaceState(null, "", buildQuery(state))`, throttled by the caller.

- [ ] **Step 1: Write the failing test**

```js
// test/urlstate.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { parseState, buildQuery } from "../src/urlstate.js";

test("parseState reads a full valid triple", () => {
  assert.deepEqual(parseState("?lat=25.79&lon=-80.13&rise=70"),
    { lat: 25.79, lon: -80.13, rise: 70 });
});

test("parseState returns null when any field is missing or out of range", () => {
  assert.equal(parseState("?lat=25.79&lon=-80.13"), null);
  assert.equal(parseState("?lat=200&lon=0&rise=10"), null);
  assert.equal(parseState("?lat=0&lon=0&rise=999"), null);
  assert.equal(parseState(""), null);
});

test("buildQuery round-trips through parseState", () => {
  const q = buildQuery({ lat: 25.7907, lon: -80.1300, rise: 42 });
  assert.equal(q, "?lat=25.79070&lon=-80.13000&rise=42");
  assert.deepEqual(parseState(q), { lat: 25.7907, lon: -80.13, rise: 42 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/urlstate.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// src/urlstate.js
export function parseState(search) {
  const p = new URLSearchParams(search || "");
  const lat = Number(p.get("lat"));
  const lon = Number(p.get("lon"));
  const rise = Number(p.get("rise"));
  const ok = [lat, lon, rise].every(Number.isFinite) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && rise >= 0 && rise <= 70;
  return ok ? { lat, lon, rise } : null;
}

export function buildQuery({ lat, lon, rise }) {
  return `?lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}&rise=${Math.round(rise)}`;
}

export function readState() {
  return parseState(typeof location !== "undefined" ? location.search : "");
}

export function writeState(state) {
  if (typeof history !== "undefined") history.replaceState(null, "", buildQuery(state));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/urlstate.test.js`
Expected: PASS — 3 tests.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: all four test files pass, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add src/urlstate.js test/urlstate.test.js
git commit -m "feat: URL deep-link state parse/build"
```

---

## Task 6: Cesium viewer boot (`viewer.js`) — manual verification

**Files:**
- Create: `src/viewer.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: global `Cesium`, `window.APP_CONFIG.ionToken`.
- Produces: `createViewer(containerId: string, ionToken: string): Promise<Cesium.Viewer>` — a Viewer with world terrain + world imagery, and the timeline / animation / fullscreen / base-layer-picker / geocoder-widget / home / navigation-help / scene-mode widgets disabled. Throws if `ionToken` is falsy or the placeholder.

- [ ] **Step 1: Write `src/viewer.js`**

```js
// src/viewer.js
export async function createViewer(containerId, ionToken) {
  if (!ionToken || ionToken === "YOUR_CESIUM_ION_TOKEN") {
    throw new Error("missing-ion-token");
  }
  Cesium.Ion.defaultAccessToken = ionToken;

  const viewer = new Cesium.Viewer(containerId, {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    baseLayerPicker: false,
    geocoder: false,
    timeline: false,
    animation: false,
    fullscreenButton: false,
    homeButton: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    selectionIndicator: false,
    infoBox: false
  });

  // Aerial imagery from ion World Imagery.
  const imagery = await Cesium.IonImageryProvider.fromAssetId(3);
  viewer.imageryLayers.addImageryProvider(imagery);

  viewer.scene.globe.depthTestAgainstTerrain = true;
  return viewer;
}
```

- [ ] **Step 2: Wire a minimal `src/main.js`**

```js
// src/main.js
import { createViewer } from "./viewer.js";

const cfg = window.APP_CONFIG || {};

async function boot() {
  try {
    const viewer = await createViewer("cesium", cfg.ionToken);
    window.__viewer = viewer; // for manual poking during dev
    document.getElementById("searchBar").hidden = false;
  } catch (err) {
    if (err.message === "missing-ion-token") {
      document.getElementById("tokenError").hidden = false;
      document.getElementById("searchBar").hidden = true;
      document.getElementById("controls").hidden = true;
    } else {
      console.error(err);
    }
  }
}
boot();
```

- [ ] **Step 3: Manual check — no token**

With `config.js` still holding `YOUR_CESIUM_ION_TOKEN`, serve and open the page.
Expected: the centered "Set a Cesium ion token" panel is shown; search bar and controls hidden; no uncaught console errors.

- [ ] **Step 4: Manual check — real token (temporary)**

Temporarily paste a real Cesium ion default token into `config.js` (do **not** commit it in this task). Reload.
Expected: a 3D globe with visible terrain relief and aerial (photographic) imagery; no Cesium timeline/animation widgets; the Cesium credit line is visible bottom-left; console clean. Drag/zoom works.
Revert `config.js` to the placeholder before committing.

- [ ] **Step 5: Commit**

```bash
git add src/viewer.js src/main.js
git commit -m "feat: boot Cesium viewer with world terrain and aerial imagery"
```

---

## Task 7: Address search + geolocation (`geocode.js`, `geolocate.js`) — manual verification

**Files:**
- Create: `src/geocode.js`, `src/geolocate.js`

**Interfaces:**
- Consumes: global `Cesium`, a `Cesium.Viewer`.
- Produces:
  - `geocodeAddress(viewer, query: string): Promise<{ lat: number, lon: number, name: string } | null>` — uses `new Cesium.IonGeocoderService({ scene: viewer.scene })`, `.geocode(query)`, takes the first result, returns its destination centre as lat/lon degrees and its `displayName`. Returns `null` on no results.
  - `getCurrentLocation(): Promise<{ lat: number, lon: number }>` — wraps `navigator.geolocation.getCurrentPosition` with `{ enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }`. Rejects with `Error("geolocation-unavailable")` if the API is missing, `Error("geolocation-denied")` on `PERMISSION_DENIED`, `Error("geolocation-failed")` otherwise.

- [ ] **Step 1: Write `src/geolocate.js`**

```js
// src/geolocate.js
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("geolocation-unavailable"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(
        err.code === err.PERMISSION_DENIED ? "geolocation-denied" : "geolocation-failed")),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  });
}
```

- [ ] **Step 2: Write `src/geocode.js`**

```js
// src/geocode.js
export async function geocodeAddress(viewer, query) {
  const svc = new Cesium.IonGeocoderService({ scene: viewer.scene });
  const results = await svc.geocode(query);
  if (!results || results.length === 0) return null;
  const r = results[0];
  // r.destination is a Cartesian3 or Rectangle; normalise to a centre cartographic.
  let carto;
  if (r.destination instanceof Cesium.Rectangle) {
    carto = Cesium.Rectangle.center(r.destination);
  } else {
    carto = Cesium.Cartographic.fromCartesian(r.destination);
  }
  return {
    lat: Cesium.Math.toDegrees(carto.latitude),
    lon: Cesium.Math.toDegrees(carto.longitude),
    name: r.displayName || query
  };
}
```

- [ ] **Step 3: Manual check — geocode**

In the browser console with a real token loaded and `window.__viewer` present:
```js
const { geocodeAddress } = await import("./src/geocode.js");
await geocodeAddress(window.__viewer, "Eiffel Tower");
```
Expected: an object roughly `{ lat: 48.858, lon: 2.294, name: /Eiffel/ }`. Try a vague query (`"Springfield"`) — still returns one result. Try gibberish (`"zzzzzzzzzz qqqq"`) — returns `null` (or an empty-array-driven `null`), no throw.

- [ ] **Step 4: Manual check — geolocation**

```js
const { getCurrentLocation } = await import("./src/geolocate.js");
getCurrentLocation().then(console.log).catch(e => console.log("rejected:", e.message));
```
Allow the prompt ⇒ logs your `{lat, lon}`. Reload, deny the prompt ⇒ logs `rejected: geolocation-denied`.

- [ ] **Step 5: Commit**

```bash
git add src/geocode.js src/geolocate.js
git commit -m "feat: ion geocoder and browser geolocation wrappers"
```

---

## Task 8: Terrain elevation sampling (`elevation.js`) — manual verification

**Files:**
- Create: `src/elevation.js`

**Interfaces:**
- Consumes: global `Cesium`, a `Cesium.Viewer`.
- Produces: `sampleGroundElevation(viewer, lat: number, lon: number): Promise<number | null>` — uses `Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [Cesium.Cartographic.fromDegrees(lon, lat)])` and returns the sampled `height` in metres (this is already in the ~MSL/geoid frame — do not convert). Returns `null` if the sample is `undefined`/`NaN` or the call throws.

- [ ] **Step 1: Write `src/elevation.js`**

```js
// src/elevation.js
export async function sampleGroundElevation(viewer, lat, lon) {
  try {
    const [sample] = await Cesium.sampleTerrainMostDetailed(
      viewer.terrainProvider,
      [Cesium.Cartographic.fromDegrees(lon, lat)]
    );
    const h = sample && sample.height;
    return Number.isFinite(h) ? h : null;
  } catch (e) {
    console.warn("elevation sample failed", e);
    return null;
  }
}
```

- [ ] **Step 2: Manual check against known elevations**

Console, real token:
```js
const { sampleGroundElevation } = await import("./src/elevation.js");
console.log("Badwater", await sampleGroundElevation(window.__viewer, 36.2506, -116.8253)); // ~ -85
console.log("Denver",   await sampleGroundElevation(window.__viewer, 39.7392, -104.9903)); // ~ 1600
console.log("Amsterdam",await sampleGroundElevation(window.__viewer, 52.3676, 4.9041));    // ~ 0-3
```
Expected: Badwater ≈ −85 ± 15; Denver ≈ 1600 ± 60; Amsterdam within a few metres of 0. `null` only where Cesium genuinely lacks data (rare on land).

- [ ] **Step 3: Commit**

```bash
git add src/elevation.js
git commit -m "feat: most-detailed terrain elevation sampling"
```

---

## Task 9: Water surface (`water.js`) — manual verification

**Files:**
- Create: `src/water.js`

**Interfaces:**
- Consumes: global `Cesium`, a `Cesium.Viewer`.
- Produces: `createWater(viewer): { setHeight(ellipsoidHeightM: number): void, show(): void, hide(): void }`.
  - A single translucent blue primitive covering a large area (a `Cesium.RectangleGeometry` spanning roughly ±0.75° around the camera's current longitude/latitude, rebuilt when `setHeight` is called so it follows the view; height set via the geometry's `height`).
  - `show()`/`hide()` toggle visibility. Starts hidden.

- [ ] **Step 1: Write `src/water.js`**

```js
// src/water.js
export function createWater(viewer) {
  let primitive = null;
  let visible = false;
  let lastHeight = 0;

  function rebuild(heightM) {
    lastHeight = heightM;
    if (primitive) { viewer.scene.primitives.remove(primitive); primitive = null; }

    const c = viewer.camera.positionCartographic;
    const lon = Cesium.Math.toDegrees(c.longitude);
    const lat = Cesium.Math.toDegrees(c.latitude);
    const span = 0.75;

    primitive = viewer.scene.primitives.add(new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.RectangleGeometry({
          rectangle: Cesium.Rectangle.fromDegrees(lon - span, lat - span, lon + span, lat + span),
          height: heightM,
          vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT
        })
      }),
      appearance: new Cesium.EllipsoidSurfaceAppearance({
        material: Cesium.Material.fromType("Water", {
          baseWaterColor: new Cesium.Color(0.10, 0.35, 0.55, 0.72),
          frequency: 8000.0,
          animationSpeed: 0.02,
          amplitude: 3.0
        }),
        translucent: true
      }),
      show: visible
    }));
  }

  return {
    setHeight(h) { rebuild(h); },
    show() { visible = true; if (primitive) primitive.show = true; else rebuild(lastHeight); },
    hide() { visible = false; if (primitive) primitive.show = false; }
  };
}
```

- [ ] **Step 2: Manual check**

Console, real token, after flying somewhere coastal (e.g. run the Task 7 geocode for "Miami Beach" and `viewer.camera.flyTo` to it, or just use the globe):
```js
const { createWater } = await import("./src/water.js");
const w = createWater(window.__viewer);
w.setHeight(70); w.show();
```
Expected: a translucent blue sheet appears across the view at ~70 m ellipsoidal height; low ground is covered, higher ground pokes through. `w.setHeight(5)` visibly drops it; `w.hide()` removes it. No console errors.

- [ ] **Step 3: Commit**

```bash
git add src/water.js
git commit -m "feat: translucent water surface primitive with settable height"
```

---

## Task 10: Full UI styling + About panel (`style.css`, `index.html` wiring) — manual verification

**Files:**
- Modify: `style.css` (replace the skeleton), `index.html` (only if markup tweaks are needed for layout)

**Interfaces:**
- Consumes: the element IDs already in `index.html` (`searchBar`, `controls`, `riseInput`, `riseOut`, `readout`, `aboutBtn`, `aboutPanel`, `aboutClose`, `.presets button`).
- Produces: no JS interface. A responsive layout that works at 400 px width and up.

- [ ] **Step 1: Replace `style.css` with the full stylesheet**

Requirements the stylesheet must meet (write concrete CSS for each):
- `#cesium` fixed full-viewport behind everything.
- `#searchBar` top, `#controls` bottom; both `max-width: 460px`, left-aligned on wide screens, full-width (minus 12 px gutters) below 520 px. Respect `env(safe-area-inset-*)` for notched phones.
- Panels: translucent dark card, `backdrop-filter: blur(6px)`, 10 px radius, readable contrast (WCAG AA on the body text).
- `#riseInput` full width, min 44 px tall hit area; `.presets button` min 44x32, wrap on narrow screens; active preset visually marked (`aria-pressed` styled).
- `.readout` at least 0.95 rem, line-height ≥ 1.35.
- `#aboutPanel` centered modal card, max-width 380 px, scrollable if it overflows the viewport, dim page behind (a `::backdrop`-style overlay div or `box-shadow: 0 0 0 100vmax rgba(0,0,0,.5)`).
- `.link` button styled as a text link (no button chrome).
- Reduced-motion: if `@media (prefers-reduced-motion: reduce)`, no CSS transitions.

- [ ] **Step 2: Manual check — desktop**

Serve, open at a wide window with a real token.
Expected: search bar top-left, controls bottom-left, globe fills the rest. Dragging the slider updates the `<output>` number (wiring for water/readout comes in Task 11 — here just the number via the browser's native `<output>`? if not automatic, defer that to Task 11). "About & limitations" opens the centered panel; the × and clicking outside both close it.

- [ ] **Step 3: Manual check — phone width**

DevTools device toolbar at 400x800.
Expected: both bars span the width with 12 px gutters, nothing clipped, slider and presets are thumb-sized, About panel fits with the page scrollable behind it dimmed. No horizontal scrollbar.

- [ ] **Step 4: Commit**

```bash
git add style.css index.html
git commit -m "feat: responsive overlay UI and about panel styling"
```

---

## Task 11: Orchestration (`main.js`) — manual end-to-end verification

**Files:**
- Modify: `src/main.js` (full version, replacing the Task 6 stub)

**Interfaces:**
- Consumes: `createViewer` (`viewer.js`), `geocodeAddress` (`geocode.js`), `getCurrentLocation` (`geolocate.js`), `sampleGroundElevation` (`elevation.js`), `createGeoid` (`geoid.js`), `waterEllipsoidHeight` (`datum.js`), `createWater` (`water.js`), `formatReadout` (`readout.js`), `parseState`/`buildQuery`/`writeState` (`urlstate.js`).
- Produces: no exports.

**Behaviour to implement:**
1. On load: `boot()` creates the viewer (Task 6 error handling retained). Then `fetch("vendor/egm96/egm96-15.pgm")` → `arrayBuffer()` → `createGeoid(...)`; on fetch failure keep a `geoid = null` and treat `N` as `0` with a console warning.
2. Create `water = createWater(viewer)`.
3. State object `{ lat, lon, rise, groundMslM, placeName }`. `rise` starts from `parseState(location.search)?.rise ?? 70`; sync `#riseInput`, `#riseOut`, and the active preset button to it.
4. If `parseState` returned a full triple: skip search, run `applyLocation(lat, lon, "Shared location")` immediately.
5. `#searchForm` submit → `geocodeAddress`; empty input is ignored; on `null` show `#statusLine` "Couldn't find that place — try adding a city or country."; on hit call `applyLocation(hit.lat, hit.lon, hit.name)`.
6. `#locateBtn` click → `getCurrentLocation()`; on reject map the three error messages to `#statusLine` copy ("Location access was denied — type an address instead." / "Location isn't available — type an address instead." / "Couldn't get your location — try again or type an address."); on success `applyLocation(lat, lon, "Your location")`.
7. `applyLocation(lat, lon, name)`:
   - store `lat/lon/placeName`; `viewer.camera.flyTo` to `Cesium.Cartesian3.fromDegrees(lon, lat, 3000)` with `orientation` pitch `-45°`, duration 2 s.
   - `groundMslM = await sampleGroundElevation(viewer, lat, lon)` (may be `null`).
   - `N = geoid ? geoid.undulation(lat, lon) : 0`.
   - `water.setHeight(waterEllipsoidHeight(state.rise, N))`; `water.show()`.
   - `#readout`.textContent = `formatReadout({ groundMslM, riseM: state.rise, placeName: name })`.
   - `writeStateThrottled()`.
8. `#riseInput` `input` event → update `state.rise`, `#riseOut`, active preset; recompute `N` is unchanged (same point) so `water.setHeight(waterEllipsoidHeight(state.rise, N))` with the **cached** `N` and cached `groundMslM`; update `#readout`; `writeStateThrottled()`. Throttle the water rebuild + URL write with `requestAnimationFrame` (one pending frame max).
9. `.presets button` click → set `#riseInput.value`, dispatch its `input` event, mark `aria-pressed`.
10. About panel: `#aboutBtn` shows `#aboutPanel`; `#aboutClose` and a click on the dim backdrop hide it. Set `#videoLink.href` to the real YouTube URL (ask Sylvain in Task 12; until then leave the channel URL `https://www.youtube.com/@UnmarkedFilesArchives`).
11. `writeStateThrottled` = `rAF`-throttled `writeState({ lat: state.lat, lon: state.lon, rise: state.rise })`, only when `lat/lon` are set.

- [ ] **Step 1: Write the full `src/main.js`** implementing every numbered point above. Keep helper functions small and local; if the file passes ~200 lines, split the event wiring into `src/ui.js` exporting `initUI({ onSearch, onLocate, onRiseChange, onAbout })` and keep `main.js` as orchestration only.

- [ ] **Step 2: Manual end-to-end checklist** (real token in `config.js`, served locally):

| # | Action | Expected |
|---|---|---|
| 1 | Load `/` with no query | Globe loads, search bar + controls visible, readout says "Search a place to begin." |
| 2 | Search "Miami Beach" | Camera flies in tilted; water sheet appears; readout ≈ "Miami Beach is about 1–3 m above sea level today. With a 70 m rise it would be ~67–69 m underwater." |
| 3 | Drag slider to 10 | Water visibly drops; readout depth updates to ~7–9 m underwater; URL shows `rise=10`. |
| 4 | Click preset "30 m" | Slider jumps to 30, water + readout update, preset shows pressed. |
| 5 | Search "Denver, Colorado" | Flies there; readout says it stays ~1500+ m **above** the new sea level; water sheet is below the terrain (mostly not visible). |
| 6 | Click "Use my location", allow | Flies to you; readout with "Your location". |
| 7 | Click "Use my location", deny (reload first) | `#statusLine`: "Location access was denied — type an address instead." No crash. |
| 8 | Copy the URL after step 3, open in a new tab | Loads straight to that place and rise with no search step. |
| 9 | Search gibberish | `#statusLine`: "Couldn't find that place…". Previous view unchanged. |
| 10 | Open "About & limitations" | Centered panel with the bathtub-model text; × and outside-click close it. |
| 11 | Throttle CPU 4x in DevTools, drag slider fast | Water/readout keep up without a growing backlog; no errors. |
| 12 | DevTools console through all of the above | No uncaught errors or unhandled rejections. |

- [ ] **Step 3: Fix anything the checklist surfaces, re-run the affected rows.**

- [ ] **Step 4: Run `npm test`** — Expected: still all green (no logic module changed).

- [ ] **Step 5: Commit**

```bash
git add src/main.js src/ui.js 2>/dev/null; git add src/
git commit -m "feat: wire search, geolocation, elevation, geoid, water and readout"
```

---

## Task 12: Deploy — README, Actions workflow, assets, real token, live check

**Files:**
- Create: `.github/workflows/pages.yml`, `README.md`, `assets/favicon.png`, `assets/og-image.png`
- Modify: `config.js` (real token), `src/main.js` (`#videoLink.href` if the video URL is known)

**Interfaces:** none.

**Prerequisites from Sylvain (both one-time):**
- A free Cesium ion **default access token** (cesium.com/ion).
- GitHub CLI authenticated: `winget install --id GitHub.cli` then `gh auth login` (GitHub.com, HTTPS, browser).

- [ ] **Step 1: Create `.github/workflows/pages.yml`**

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Write `README.md`** — sections:
  - One-paragraph what-it-is + the live URL + a link to the video.
  - **Run locally:** `cp config.example.js config.js`, paste a free ion token, `python -m http.server 8080`, open `localhost:8080`.
  - **Deploy your own:** fork → edit `config.js` with your token → Settings ▸ Pages ▸ Source: GitHub Actions → push. URL will be `https://<you>.github.io/will-my-house-flood/`.
  - **Swap the imagery** to keyless OSM (`Cesium.OpenStreetMapImageryProvider`) — 3-line snippet, note the trade-off (no aerial).
  - **Tests:** `npm test` (Node 18+). Explains only the logic modules are unit-tested and why.
  - **Limitations:** copy the spec's Limitations section verbatim (bathtub model, timescale, terrain accuracy, geoid approximation).
  - **Credits:** CesiumJS, Cesium ion, EGM96/GeographicLib (public domain), OpenStreetMap where applicable.
  - License: MIT.

- [ ] **Step 3: Add `assets/favicon.png` (a simple 64x64 wave/house glyph) and `assets/og-image.png` (1200x630, app name + one line + a globe screenshot).** A quick hand-made PNG is fine; if none is ready, use a solid-colour placeholder with the title text so the tags resolve. Note in the commit that art can be swapped later.

- [ ] **Step 4: Paste the real Cesium ion token into `config.js`.**

Confirm with Sylvain this is acceptable to commit publicly (it is the standard model for client-side ion/Mapbox tokens; recommend he restrict it in the ion dashboard to the Pages domain and to the World Terrain + World Imagery + Geocoder assets). Commit it.

- [ ] **Step 5: Set `#videoLink.href`** to the real video URL if Sylvain has it; otherwise leave the channel URL and note a follow-up.

- [ ] **Step 6: Create the GitHub repo and push**

```bash
gh repo create 3Dsly/will-my-house-flood --public --source=. --remote=origin \
  --description "Type your address, see it under a risen sea. Companion to 'When All The Ice Melts'." --push
```

- [ ] **Step 7: Enable Pages via Actions and confirm the run**

```bash
gh api -X POST repos/3Dsly/will-my-house-flood/pages -f build_type=workflow 2>/dev/null || true
gh run watch --exit-status
```
Expected: the "Deploy to GitHub Pages" run succeeds; `gh run view --web` shows the `page_url`.

- [ ] **Step 8: Live verification on the deployed URL** (`https://3dsly.github.io/will-my-house-flood/`)

Re-run end-to-end checklist rows 1, 2, 3, 5, 6, 8, 10 from Task 11 against the **live** site, on desktop and on a phone browser.
Expected: identical behaviour to local. Confirm the ion credit line shows and no token error. Confirm a hard refresh loads fast (< ~5 s on a normal connection).

- [ ] **Step 9: Commit any fixes, final commit**

```bash
git add -A
git commit -m "docs: README, Pages workflow, assets; go live"
git push
```

- [ ] **Step 10: Report the live URL to Sylvain** and note the two follow-ups if still open (video link URL, real favicon/og art), plus the ion-dashboard token restriction recommendation.

---

## Self-Review

**1. Spec coverage:**

| Spec section | Task(s) |
|---|---|
| Purpose / companion app / forkable | 1, 12 |
| User flow (search, locate, fly, sample, slider, about) | 6, 7, 8, 9, 10, 11 |
| Non-goals (no backend/build/framework) | Global Constraints; 1 |
| Architecture file list | File Structure; 1 |
| Components table (viewer/geocode/geolocate/elevation/geoid/water/readout/urlstate/main) | 2–11 one per module |
| Data flow (waterEllipsoidHeight = rise + N; depth = rise − groundMSL) | 2, 11 |
| Vertical datum / EGM96 bundled grid / validation checks | 3 (grid + lookup), 2 (math), 8 & 11 (validation in situ) |
| Rendering details (CDN pin, world terrain, ion imagery, water primitive, camera) | 1, 6, 9, 11 |
| UI (top card, bottom controls, presets, about, mobile) | 1 (markup), 10 (style), 11 (behaviour) |
| Error handling table | 6 (token), 7 (geocode/geolocation), 8 (elevation null), 11 (deep-link malformed, wired), main.js fetch-fail (geoid) in 11 |
| Deep linking | 5 (parse/build), 11 (wire) |
| Hosting / deploy / .nojekyll / Actions | 1 (.nojekyll), 12 |
| Limitations copy | 1 (About markup), 12 (README) |
| External deps Sylvain provides | 12 prerequisites |
| Testing plan | 2–5 unit; 6–12 manual checklists; 12 Step 8 live |

No uncovered spec requirement.

**2. Placeholder scan:** No "TBD/TODO/handle edge cases" left. The one deferred decision in the spec (grid resolution) is resolved here to a concrete choice (`egm96-15.pgm`, ~2 MB). The geoid reference value in Task 3 Step 6 is filled by an explicit lookup step, not left blank. Favicon/og art has a concrete fallback (placeholder PNG with title). Video URL has a concrete fallback (channel URL).

**3. Type consistency:**
- `{ lat, lon, name }` from `geocodeAddress`; `{ lat, lon }` from `getCurrentLocation` — consistent, `name` only where it exists.
- `sampleGroundElevation` returns `number | null`; `formatReadout` and `main.js` both handle `null`; readout tests cover it.
- `waterEllipsoidHeight(riseM, N)` / `floodDepth(riseM, groundMslM)` — same argument order everywhere they're called (Tasks 2, 11).
- `createGeoid(pgmBytes).undulation(lat, lon)` — call sites in Task 11 match.
- `createWater(viewer)` → `{ setHeight, show, hide }` — `setHeight` takes an **ellipsoidal** height; every call site wraps it in `waterEllipsoidHeight(...)`. Consistent.
- `parseState`/`buildQuery`/`writeState` names match between Task 5 and Task 11.
- Element IDs in `index.html` (Task 1) match those referenced in Tasks 6, 10, 11.

No mismatches found.
