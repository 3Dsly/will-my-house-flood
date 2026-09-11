/** Ellipsoidal height to place the water surface at, given rise and local geoid undulation N. */
export function waterEllipsoidHeight(riseMeters, geoidUndulationMeters) {
  return riseMeters + geoidUndulationMeters;
}

/**
 * Convert a Cesium terrain sample (WGS84-ELLIPSOIDAL height, what
 * sampleTerrainMostDetailed returns) to an orthometric / mean-sea-level
 * height by subtracting the local geoid undulation N.
 *
 *   mslElevation = ellipsoidalHeight - N
 *
 * Cesium World Terrain is referenced to the WGS84 ellipsoid, NOT the geoid,
 * so raw samples are off from "metres above sea level" by exactly N
 * everywhere (N ranges roughly -100..+85 m). This value feeds the readout
 * text and floodDepth(); the water surface still uses waterEllipsoidHeight().
 * With N = 0 (geoid grid unavailable) this is a pass-through and accuracy
 * degrades by up to ~100 m.
 */
export function mslElevation(ellipsoidalMeters, geoidUndulationMeters) {
  return ellipsoidalMeters - geoidUndulationMeters;
}

/** Metres the given ground point is underwater (positive) or above the new sea (negative). */
export function floodDepth(riseMeters, groundElevationMslMeters) {
  return riseMeters - groundElevationMslMeters;
}
