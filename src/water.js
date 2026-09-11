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
    // Kept small on purpose: a flat rectangle is only planted on the ellipsoid
    // at its own vertices, so triangle edges cut straight chords between them.
    // At the old 0.75deg (~166km) half-span those chords sagged away from the
    // true curved surface by hundreds of metres — the water visibly detached
    // from the terrain ("blocky" seams). ~5.5km half-span keeps plenty of
    // margin around the 3000m-altitude view while staying cheap to build.
    const span = 0.05;
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
          // ~500m between vertices — comfortably sub-metre curvature error
          // at this extent (the old default gave 2-3 giant panels total),
          // without the vertex count that triggered a Primitive rendering
          // glitch (full-screen colour artifacts) at a finer setting.
          granularity: 500 / 6378137,
          vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT
        })
      }),
      asynchronous: false,
      appearance: new Cesium.EllipsoidSurfaceAppearance({
        material: Cesium.Material.fromType("Water", {
          baseWaterColor: new Cesium.Color(0.10, 0.35, 0.55, 0.72),
          frequency: 900.0,
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
