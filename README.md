# Will My House Flood?

Type an address and watch the 3D globe fly there, then see it sitting under a
sea-level rise you choose. A readout tells you how far underwater — or above —
that exact spot would be. It is a companion to the short film
**"When All The Ice Melts"**: one link in the video description that opens on any
phone or laptop and lets someone check their own home in under a minute. Anyone
can fork the repo and host their own free copy.

**Live:** https://3dsly.github.io/will-my-house-flood/
**Video:** https://www.youtube.com/@UnmarkedFilesArchives

_(Both links may be updated once the repo is published and the video goes live.)_

## How it works

It is a static [CesiumJS](https://cesium.com/platform/cesiumjs/) page — no build
step, no server, no backend. It uses the **Cesium ion free tier** for world
terrain and aerial imagery, plus ion's geocoder to turn an address into
coordinates. A translucent blue water surface is drawn at the height you pick on
the slider. Because Cesium places geometry against the WGS84 ellipsoid while its
terrain heights are referenced to mean sea level, the page ships a small bundled
**EGM96 geoid grid** and looks the local undulation up offline to convert
between the two, so the waterline lands in the right place.

## Run locally

```sh
cp config.example.js config.js
# paste a free Cesium ion token into config.js
#   from https://cesium.com/ion  ->  Access Tokens  ->  default token
python -m http.server 8080        # or any static file server
# open http://localhost:8080
```

`npm test` runs the logic unit tests (Node 18+). The Cesium and UI parts are
verified in a browser, not in the test suite.

## Deploy your own

1. **Fork** this repo.
2. Put your own Cesium ion token in `config.js` (see *Run locally* above).
3. Repo **Settings ▸ Pages ▸ Source: GitHub Actions**.
4. Push to `main`. The included workflow (`.github/workflows/pages.yml`) uploads
   the repo root as-is and deploys it — no build.

Your site will be at `https://<you>.github.io/will-my-house-flood/`.

The ion token is a public client-side token by design, but you should still
**restrict it in the ion dashboard** to your Pages domain and to just the assets
this app uses: Cesium World Terrain, Bing / world aerial imagery, and the
geocoder.

## Swap the imagery to a keyless source (optional)

The default aerial imagery counts against your ion imagery quota. To drop ion
imagery entirely and use OpenStreetMap tiles instead, replace this line in
`src/viewer.js`:

```js
const imagery = await Cesium.IonImageryProvider.fromAssetId(3);
```

with:

```js
const imagery = new Cesium.OpenStreetMapImageryProvider({
  url: "https://tile.openstreetmap.org/"
});
```

Trade-off: no aerial photography (you get the OSM map style), but zero ion
imagery quota used. Terrain and the geocoder still use ion.

## Limitations

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

## Tests

```sh
npm test
```

Only the pure logic modules are unit-tested: the vertical-datum math, the EGM96
geoid grid lookup, the readout text builder, and the URL deep-link state
parsing/serialisation. The Cesium viewer, the geocoder, terrain elevation
sampling, the water surface, and the DOM wiring are verified manually in a
browser — there is no headless-browser harness.

## Credits

- [CesiumJS](https://cesium.com/platform/cesiumjs/) and
  [Cesium ion](https://cesium.com/ion/) — terrain, aerial imagery, and geocoding.
- EGM96 geoid data via [GeographicLib](https://geographiclib.sourceforge.io/) /
  U.S. NGA — public domain.
- [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors — used
  only if you switch to the keyless imagery option above.

## License

[MIT](LICENSE).
