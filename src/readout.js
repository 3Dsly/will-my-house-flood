import { floodDepth } from "./datum.js";

// Dry land within this margin of the new sea level reads as "at risk"
// rather than flatly "safe" — a purely presentational tier over the same
// depth number (no new inputs).
const AT_RISK_MARGIN_M = 2;

function statusForDepth(depthM) {
  if (depthM > 0) return "underwater";
  if (depthM > -AT_RISK_MARGIN_M) return "atrisk";
  return "safe";
}

// Returns either { available: false, note } when elevation couldn't be
// sampled, or { available: true, placeName, elevationM, riseM, depthM,
// status, note } — depthM is always >= 0 (metres underwater or above,
// per status).
export function buildResult({ groundMslM, riseM, placeName }) {
  const who = placeName || "This spot";
  if (groundMslM === null || groundMslM === undefined || !Number.isFinite(groundMslM)) {
    return {
      available: false,
      placeName: who,
      riseM,
      note: `${who}: ground elevation is unavailable here, so the depth can't be computed. ` +
            `The selected scenario is a ${riseM} m sea-level rise.`
    };
  }
  const elevationM = Math.round(groundMslM);
  const rawDepth = floodDepth(riseM, groundMslM);
  const status = statusForDepth(rawDepth);
  const depthM = Math.round(Math.abs(rawDepth));
  const note = status === "underwater"
    ? `At a sea-level rise of ${riseM} m, ${who} would be about ${depthM} m underwater.`
    : `At a sea-level rise of ${riseM} m, ${who} would stay about ${depthM} m above the new sea level.`;
  return { available: true, placeName: who, elevationM, riseM, depthM, status, note,
    rawElevationM: groundMslM, rawDepthM: rawDepth };
}
