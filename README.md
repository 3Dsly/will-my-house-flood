# How Deep Here?

If all Earth’s land ice melted, where would you stand?

**Public app:** https://3dsly.github.io/will-my-house-flood/

**Companion film:** https://youtu.be/Pc2LmfgvHQU

Enter an address or tap a point on the globe to compare local ground elevation with a selected sea-level rise from 0 to 70 metres.

- Underwater: a 1.7 m person stands on the ground beneath animated water and soft sun rays.
- Above water: the person stands on solid land, with a ruler measuring down the cliff to the sea.
- One pixels-per-metre scale drives the person, ruler and waterline. A 6 m depth is about 3.5 person heights; a 30 m clearance is about 17.6.
- The cliff is a schematic cross-section, not reconstructed local terrain.
- Tap or click the globe directly to measure: zoom with pinch or + / −. Keyboard users can focus the globe, use arrow keys to explore, and press Enter to measure its center. Dragging or pinching does not trigger a measurement, and selecting a point preserves the camera view.
- Desktop and phone layouts, pause motion, reduced-motion support, keyboard-accessible About dialog, and shareable location URLs.

The opening scene is explicitly labelled as an illustrative example. Searching replaces it with a terrain-based result. `?example=dry` opens the illustrative 100 m elevation / +70 m sea-level case.

## Run locally

This is a static JavaScript app with no build step.

```sh
python -m http.server 8080 --bind 127.0.0.1
# Open http://localhost:8080/
npm test
```

`config.js` contains the existing public Cesium ion client token. For a fork, use your own client token from Cesium ion and restrict its assets and allowed origins appropriately. Do not put private API secrets into client files.

## Elevation and scale

The app retains Cesium terrain sampling, address geocoding and the bundled EGM96 geoid grid. Terrain samples use WGS84 ellipsoidal heights. The local geoid undulation N converts those to mean sea level:

- ground MSL elevation = terrain ellipsoid height − N
- water ellipsoid height = selected sea-level rise + N
- signed local water depth = selected rise − ground MSL elevation

Full-precision depth drives the visualization; labels round separately. When elevation or its datum correction is unavailable, the app does not present a computed local depth.

## Deployment

Pushes to `main` run the tests, stage only the public app files, version the complete JavaScript module graph and stylesheet using the release commit, and deploy through GitHub Pages. The existing repository URL is preserved so older links continue to work.

For a fork, set **Settings → Pages → Source → GitHub Actions**, configure your Cesium client token, and update the canonical sharing URL in `index.html`.

## Scope and privacy

This is a simplified elevation comparison, not a flood-risk assessment. It does not model ocean connectivity, storm surge, drainage, coastal defences or future terrain changes. +70 m is an illustrative all-land-ice-melt scenario without a prediction date. The person is a 1.7 m reference, a representative adult reference rather than a universal average height.

Address queries go to Cesium ion and OpenStreetMap Nominatim. Coordinates appear in the URL for sharing. There is no app-owned database or analytics service.

## Verification

`npm test` covers datum conversion, geoid lookup, readouts, shared URLs, and exact underwater/above-water scale ratios at phone and desktop sizes. Browser checks cover address lookup, slider transitions, dialog, responsive layout and motion controls.

## Science and visitor guide

The main page includes a companion-video link and expandable usage, ice-sheet, calculation, accuracy and tool explanations.

- The +70 m setting is a rounded educational scenario (approximately 230 ft), consistent with the [USGS all-glaciers-melt FAQ](https://www.usgs.gov/faqs/how-would-sea-level-change-if-all-glaciers-melted).
- [NSIDC](https://nsidc.org/learn/parts-cryosphere/ice-sheets) quotes approximately 58 m for Antarctica and 7.4 m for Greenland. These separate estimates total 65.4 m; they are not an exact partition of the 70 m scenario. Smaller glaciers do not account for that entire difference.
- Heights use the EGM96 geoid as an approximate mean-sea-level reference, with bilinear interpolation of the bundled 15-arc-minute grid. Datum consistency and a precisely scaled drawing do not establish survey-grade accuracy.
- Real local sea-level change is not uniform. Regional gravity, land motion and ocean effects are outside this comparison, as are thermal expansion and physical flood connectivity.

Sources checked 22 September 2026. The interface credits Cesium/ion, Nominatim/OpenStreetMap, EGM96/GeographicLib-format data, browser technologies, OpenAI Codex development assistance and GitHub Pages hosting.
