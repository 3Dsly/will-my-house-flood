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
