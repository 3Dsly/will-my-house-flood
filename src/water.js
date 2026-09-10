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
