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
  if (!carto) return null;
  return {
    lat: Cesium.Math.toDegrees(carto.latitude),
    lon: Cesium.Math.toDegrees(carto.longitude),
    name: r.displayName || query
  };
}
