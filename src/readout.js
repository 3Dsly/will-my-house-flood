import { floodDepth } from "./datum.js";

export function formatReadout({ groundMslM, riseM, placeName }) {
  const who = placeName ? placeName : "This spot";
  if (groundMslM === null || groundMslM === undefined || !Number.isFinite(groundMslM)) {
    return `${who}: ground elevation is unavailable here, so the depth can't be computed. ` +
           `The water shown is a ${riseM} m sea-level rise.`;
  }
  const rounded = Math.round(groundMslM);
  const today = rounded < 0
    ? `${Math.abs(rounded)} m below sea level`
    : `${rounded} m above sea level`;
  const depth = floodDepth(riseM, groundMslM);
  if (depth > 0) {
    return `${who} is about ${today} today. With a ${riseM} m rise it would be ` +
           `${Math.round(depth)} m underwater.`;
  }
  return `${who} is about ${today} today. With a ${riseM} m rise it stays ` +
         `${Math.abs(Math.round(depth))} m above the new sea level.`;
}
