// Cesium terrain heights are ~geoid (MSL); Cesium geometry `height` is ellipsoidal.
// Convert only the water surface; the depth readout works directly in the MSL frame.

/** Ellipsoidal height to place the water surface at, given rise and local geoid undulation N. */
export function waterEllipsoidHeight(riseMeters, geoidUndulationMeters) {
  return riseMeters + geoidUndulationMeters;
}

/** Metres the given ground point is underwater (positive) or above the new sea (negative). */
export function floodDepth(riseMeters, groundElevationMslMeters) {
  return riseMeters - groundElevationMslMeters;
}
