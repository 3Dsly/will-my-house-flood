// src/depthmarker.js — a vertical pole from the ground to the new sea
// surface at the searched point, so depth reads visually, not just as text.
export function createDepthMarker(viewer) {
  let pole = null;
  let cap = null;
  let visible = false;
  let last = null;

  function rebuild() {
    if (pole) { viewer.entities.remove(pole); pole = null; }
    if (cap) { viewer.entities.remove(cap); cap = null; }
    if (!last) return;
    const { lat, lon, groundEllipM, waterEllipM, depthM } = last;
    if (lat === null || groundEllipM === null) return;

    const flooded = depthM > 0;
    const bottom = Math.min(groundEllipM, waterEllipM);
    const top = Math.max(groundEllipM, waterEllipM);
    const color = flooded
      ? Cesium.Color.fromCssColorString("#ff5a3c")
      : Cesium.Color.fromCssColorString("#3cff8a");

    pole = viewer.entities.add({
      polyline: {
        positions: [
          Cesium.Cartesian3.fromDegrees(lon, lat, bottom),
          Cesium.Cartesian3.fromDegrees(lon, lat, top)
        ],
        width: 5,
        material: new Cesium.PolylineDashMaterialProperty({ color, dashLength: 12 }),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      show: visible
    });

    const label = flooded
      ? `${Math.abs(depthM).toFixed(0)} m underwater`
      : `${Math.abs(depthM).toFixed(0)} m above the new sea`;

    cap = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat, top),
      point: {
        pixelSize: 10,
        color,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      label: {
        text: label,
        font: "600 15px system-ui, sans-serif",
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -20),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      show: visible
    });
  }

  return {
    // groundEllipM/waterEllipM are WGS84-ellipsoidal heights (same frame the
    // water primitive uses); depthM is metres underwater (positive) or above
    // the new sea (negative), from datum.js's floodDepth().
    update(lat, lon, groundEllipM, waterEllipM, depthM) {
      last = { lat, lon, groundEllipM, waterEllipM, depthM };
      rebuild();
    },
    show() {
      visible = true;
      if (pole) { pole.show = true; cap.show = true; }
      else rebuild();
    },
    hide() {
      visible = false;
      if (pole) { pole.show = false; cap.show = false; }
    }
  };
}
