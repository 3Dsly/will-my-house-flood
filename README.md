# How Deep Here?

If all Earth’s land ice melted, where would you stand?

**Public app:** https://3dsly.github.io/will-my-house-flood/

**Companion film:** https://youtu.be/Pc2LmfgvHQU

Enter an address or use device location to compare local ground elevation with a selected sea-level rise from 0 to 70 metres.

- Underwater: a 2 m person stands on the ground beneath animated water and soft sun rays.
- Above water: the person stands on solid land, with a ruler measuring down the cliff to the sea.
- One pixels-per-metre scale drives the person, ruler and waterline. A 6 m depth is exactly three person heights; a 30 m clearance is exactly fifteen.
- The cliff is a schematic cross-section, not reconstructed local terrain.
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

Pushes to `main` run the tests, stage only the public app files, and deploy through GitHub Pages. The existing repository URL is preserved so older links continue to work.

For a fork, set **Settings → Pages → Source → GitHub Actions**, configure your Cesium client token, and update the canonical sharing URL in `index.html`.

## Scope and privacy

This is a simplified elevation comparison, not a flood-risk assessment. It does not model ocean connectivity, storm surge, drainage, coastal defences or future terrain changes. +70 m is an illustrative all-land-ice-melt scenario without a prediction date. The person is a 2 m reference, not an average adult height.

Address queries go to Cesium ion and OpenStreetMap Nominatim. Device location requires the visitor’s permission. Coordinates appear in the URL for sharing. There is no app-owned database or analytics service.

## Verification

`npm test` covers datum conversion, geoid lookup, readouts, shared URLs, and exact underwater/above-water scale ratios at phone and desktop sizes. Browser checks cover address lookup, slider transitions, dialog, responsive layout and motion controls.
