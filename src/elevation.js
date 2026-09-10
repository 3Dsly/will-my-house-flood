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
