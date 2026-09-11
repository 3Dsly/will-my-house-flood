export function parseState(search) {
  const p = new URLSearchParams(search || "");
  if (!p.has("lat") || !p.has("lon") || !p.has("rise")) {
    return null;
  }
  const lat = Number(p.get("lat"));
  const lon = Number(p.get("lon"));
  const rise = Number(p.get("rise"));
  const ok = [lat, lon, rise].every(Number.isFinite) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && rise >= 0 && rise <= 70;
  return ok ? { lat, lon, rise } : null;
}

export function buildQuery({ lat, lon, rise }) {
  return `?lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}&rise=${Math.round(rise)}`;
}

export function writeState(state) {
  if (typeof history !== "undefined") history.replaceState(null, "", buildQuery(state));
}
