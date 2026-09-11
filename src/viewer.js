// src/viewer.js
export async function createViewer(containerId, ionToken) {
  if (!ionToken || ionToken === "YOUR_CESIUM_ION_TOKEN") {
    throw new Error("missing-ion-token");
  }
  Cesium.Ion.defaultAccessToken = ionToken;

  const viewer = new Cesium.Viewer(containerId, {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    baseLayer: false, // only the explicit IonImageryProvider below loads (no default world imagery on top)
    creditContainer: document.getElementById("credit"), // move the ion attribution out from under #controls
    // Needed for scene.canvas.toDataURL() (the result panel's hero snapshot)
    // to reliably read back real pixels instead of a blank/black canvas.
    contextOptions: { webgl: { preserveDrawingBuffer: true } },
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
  let imagery;
  try {
    imagery = await Cesium.IonImageryProvider.fromAssetId(3);
  } catch (e) {
    viewer.destroy();
    throw e;
  }
  viewer.imageryLayers.addImageryProvider(imagery);

  viewer.scene.globe.depthTestAgainstTerrain = true;
  return viewer;
}
