# Will My House Flood? — Design

**Date:** 2026-09-10
**Status:** approved design, pre-implementation
**Repo (target):** `github.com/3Dsly/will-my-house-flood` (public, MIT)
**Live (target):** `https://3dsly.github.io/will-my-house-flood/`

## Purpose

A companion web app for the "When All The Ice Melts" YouTube video. A visitor
types their address (or taps "Use my location"), the 3D globe flies there, and a
water surface sits at a sea-level rise they choose. A readout tells them how far
underwater — or above — their exact spot would be.

Success = a single link in the video description that opens on any phone or
laptop, loads in a few seconds, and lets someone check their own home in under
30 seconds. Anyone can fork the repo and host their own copy for free.

## Non-goals (YAGNI)

- No backend, database, accounts, or analytics.
- No hydrological modelling — this is a "bathtub" fill (see Limitations).
- No climate-projection scenarios / year timeline. One rise slider only.
- No self-animating water-rise cinematic. The slider is the interaction.
- No custom domain in v1 (github.io URL is fine).

## User flow

1. Page loads → globe view, gentle auto-rotate or a default framing of Earth.
2. Visitor enters an address in the search box **or** taps "Use my location".
   - Address → Cesium ion geocoder → `{lat, lon}`.
   - "Use my location" → browser Geolocation API → `{lat, lon}`. On denial or
     failure, show a short inline message and fall back to the search box.
3. Camera flies to the location, tilted ~45°, framed so terrain context is
     visible (~2–3 km view radius).
4. Terrain elevation at that exact point is sampled. Water surface renders at the
     current rise height. Readout updates.
5. Visitor drags the rise slider (0–70 m, default 70) or taps a preset
     (1 / 10 / 30 / 70 m). Water height + readout update live.
6. "About" link opens a short panel: what this shows, the bathtub caveat, link
     to the video, link to the GitHub repo.

## Architecture

Static site. No build step. No server. Deployed as a folder of files.

```
will-my-house-flood/
  index.html            # markup + overlay UI, loads Cesium from CDN
  app.js                # all app logic (ES module)
  style.css             # overlay UI styling
  config.js             # window.APP_CONFIG = { ionToken: "<token>" }  (committed)
  config.example.js     # template with a placeholder token
  vendor/
    egm96/…             # bundled geoid grid + loader (see Vertical datum)
  assets/
    favicon.png
    og-image.png        # social preview card
  .nojekyll             # let Pages serve /vendor, /_* paths untouched
  .github/workflows/
    pages.yml           # build-less deploy to GitHub Pages on push to main
  README.md
  LICENSE               # MIT
  docs/superpowers/specs/2026-09-10-will-my-house-flood-design.md
```

### Components (each independently testable)

| Unit | Does | Inputs | Depends on |
|---|---|---|---|
| `viewer.js` logic in `app.js` | Boots Cesium `Viewer`, world terrain + imagery, camera fly-to | ion token | CesiumJS, ion |
| geocode module | address string → `{lat, lon}`; wraps ion geocoder | string | Cesium `IonGeocoderService` |
| geolocate module | browser GPS → `{lat, lon}`; handles denial | — | `navigator.geolocation` |
| elevation module | `{lat, lon}` → ground elevation (MSL metres) | coords | `Cesium.sampleTerrainMostDetailed` |
| geoid module | `{lat, lon}` → EGM96 undulation N (metres) | coords | bundled grid in `vendor/egm96` |
| water module | render / update translucent water surface at rise height | rise m, coords, N | Cesium primitives |
| readout module | compute + render "underwater by X" / "X above" text | ground elev, rise | — |
| url-state module | read/write `?lat=&lon=&rise=` deep-link params | URL | — |

Keeping these as small named functions/objects in one `app.js` is fine at this
size; split into `/src` modules only if `app.js` passes ~400 lines.

## Data flow

```
address ──ion geocoder─┐
                       ├─▶ {lat,lon} ──▶ camera fly-to
"use my location" ─────┘                │
                                        ├─▶ sampleTerrainMostDetailed ──▶ groundElevMSL
                                        └─▶ EGM96 lookup ──▶ N
rise slider ──▶ riseM

waterHeightEllipsoidal = riseM + N          (place water surface here)
depth = riseM − groundElevMSL              (＞0 underwater, ＜0 above)
readout: depth text
url-state: write ?lat&lon&rise on each change; on load, if present, skip step 2
```

## Vertical datum — the one real risk

Cesium World Terrain heights are referenced to the **EGM96 geoid** (≈ mean sea
level). A Cesium polygon/rectangle `height` is measured from the **WGS84
ellipsoid**. These differ by the geoid undulation *N*, which ranges roughly
−105 m to +85 m worldwide (commonly ±30 m). Ignoring it puts the waterline tens
of metres wrong in many places — the same trap documented in
`C:\Users\sdeme\Videos\sea-level-cesium\README.md`.

**Fix:** bundle a compact EGM96 grid and look *N* up locally (no network call).

- Candidate: `egm96-universal` (MIT, browser-capable, ~2 MB 15-arc-minute grid)
  or a coarser 1° grid (~small) if 2 MB hurts first load. Decide during
  implementation by measuring load impact; a coarse grid is acceptable because
  we only need metre-ish accuracy for a slider readout.
- `groundElevMSL` from `sampleTerrainMostDetailed` is already in the geoid frame,
  so the **depth readout needs no conversion** — only the water surface's
  ellipsoidal `height` does: `height = riseM + N`.

**Validation checks during implementation:**

- Death Valley (Badwater, ≈ −85 m MSL): underwater at every rise ≥ 0.
- Denver (≈ 1600 m MSL): "above" at rise 70.
- A coastal point at ≈ 2 m MSL: underwater by ≈ 68 m at rise 70.
- Waterline visually meets the real shore at a known coast (e.g. a flat beach)
  at rise ≈ 0–1 m.

## Rendering details

- CesiumJS from CDN, version pinned (e.g. `1.1xx`), integrity-checked if the CDN
  provides SRI.
- Terrain: `Cesium.createWorldTerrainAsync()` (ion asset, free tier).
- Imagery: ion world imagery (aerial) as default. README documents swapping in
  `Cesium.OpenStreetMapImageryProvider` for a zero-ion-quota imagery option.
- Water surface: a translucent blue material on a geometry covering the view
  area at `height = riseM + N`, `perPositionHeight` off. Slight specular /
  animated normal for readability; keep it cheap. Re-created (or its height
  updated) on slider change — throttled with `requestAnimationFrame`.
- Camera: `flyTo` with pitch ≈ −45°, range ≈ 3000 m.
- Cesium's automatic credit display stays visible (license requirement).

## UI

- Full-viewport Cesium canvas.
- **Top overlay card:** app title, address `<input>` + search button, "Use my
  location" button. Collapses to an icon on small screens after first search.
- **Bottom overlay:** rise `<input type=range>` 0–70 (step 1), preset chips
  1 / 10 / 30 / 70, and one readout line, e.g.
  *"Badwater Basin — about 85 m below sea level today. At +70 m it's 155 m
  underwater."*
- **About** link → panel with: bathtub caveat (one paragraph), "this is an
  approximation, not a survey", video link, repo link, credits.
- Mobile: overlays are full-width bars top and bottom; controls stay thumb-reachable.
- No framework. Plain HTML + CSS + one JS module. System font stack.

## Error handling

| Case | Behaviour |
|---|---|
| Missing / invalid ion token | Full-screen message: "This site needs a Cesium ion token — see the README." Link to repo. |
| Geocoder returns nothing | Inline "Couldn't find that address — try adding a city or country." |
| Geolocation denied / unavailable | Inline "Location unavailable — type an address instead." Focus the input. |
| `sampleTerrainMostDetailed` fails / no data | Fly there anyway; readout shows "elevation unavailable here", water still renders at rise height. |
| EGM96 grid fails to load | Fall back to `N = 0` and show a small "approximate" note; log a warning. |
| Deep-link params malformed | Ignore them, load the default globe view. |
| Offline / CDN blocked | Cesium's own failure UI; nothing custom. |

## Deep linking

On any state change, write `?lat=<>&lon=<>&rise=<>` to the URL (replaceState,
throttled). On load, if all three parse, skip the address step and fly straight
there. Lets the video description link a specific place ("here's what my city
looks like: <url>").

## Hosting / deploy

- Public repo, `main` branch.
- `.github/workflows/pages.yml`: on push to `main`, upload the repo root as the
  Pages artifact and deploy. Build-less (`actions/upload-pages-artifact` +
  `actions/deploy-pages`). This makes a fork "just work" once the forker adds
  their token and enables Pages.
- `.nojekyll` so Pages doesn't touch `vendor/` or any `_`-prefixed path.
- README: run locally (`python -m http.server` in the folder), deploy your own
  (fork → set `config.js` token → enable Pages), swap the ion token, swap
  imagery, the Limitations section.

## Limitations (stated in README + About panel)

- **Bathtub model.** Water fills every point below the chosen line in view,
  whether or not the ocean could physically reach it (inland basins, areas
  behind higher ground or levees will over-flood). It is not a hydrological or
  storm-surge model.
- **Timescale removed.** +70 m is the "all land ice melts" end state; it says
  nothing about *when*. Real near-term rise this century is on the order of
  ~0.3–1 m.
- **Terrain accuracy** is whatever Cesium World Terrain has for that spot —
  good in cities, coarser in remote terrain. Local flood defences, sea walls,
  and drainage are not represented.
- **Geoid approximation** — waterline height is good to about a metre, fine for
  a slider readout, not for planning decisions.

## External dependencies Sylvain must provide (one-time)

1. **Cesium ion access token** — free account at cesium.com/ion, copy the
   default token. The app cannot load terrain/imagery without it. (The existing
   `sea-level-cesium` tool uses a *Google Maps* key, not ion, so this is new.)
2. **GitHub CLI auth** — `winget install --id GitHub.cli` then `gh auth login`,
   so the repo can be created and pushed from here.

Everything else is built and tested locally first; these two steps are the only
gate between "done locally" and the live URL.

## Testing plan

- Local static server; manual pass on desktop + a mobile viewport:
  address search, use-my-location, slider + presets, about panel, deep-link
  round-trip.
- Datum validation checks listed under Vertical datum.
- Final live check on the deployed github.io URL before calling it done
  (no "it works" claim without the live check).
