// src/water.js
export function createWater(viewer) {
  let primitive = null;
  let center = null;
  let visible = false;
  let lastHeight = 0;

  function rebuild(heightM) {
    lastHeight = heightM;
    if (primitive) { viewer.scene.primitives.remove(primitive); primitive = null; }

    const src = center || (() => {
      const c = viewer.camera.positionCartographic;
      return { lat: Cesium.Math.toDegrees(c.latitude), lon: Cesium.Math.toDegrees(c.longitude) };
    })();
    const span = 0.75;
    const lat = Math.max(-90 + span, Math.min(90 - span, src.lat));
    let west = src.lon - span, east = src.lon + span;
    if (west < -180) west += 360;
    if (east > 180) east -= 360;
    const rectangle = Cesium.Rectangle.fromDegrees(west, lat - span, east, lat + span);

    primitive = viewer.scene.primitives.add(new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.RectangleGeometry({
          rectangle,
          height: heightM,
          vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT
        })
      }),
      asynchronous: false,
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
    setCenter(lat, lon) { center = { lat, lon }; },
    setHeight(h) { rebuild(h); },
    show() { visible = true; if (primitive) primitive.show = true; else rebuild(lastHeight); },
    hide() { visible = false; if (primitive) primitive.show = false; }
  };
}
