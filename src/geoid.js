// src/geoid.js
// Parse a GeographicLib-format EGM96 .pgm geoid grid and bilinearly sample it.

function parsePgm(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  // Header is ASCII up to and including the line after maxval.
  let pos = 0;
  const readToken = () => {
    // skip whitespace, but a '#' starts a comment line we must scan for Offset/Scale
    for (;;) {
      while (pos < u8.length && (u8[pos] === 32 || u8[pos] === 9 || u8[pos] === 10 || u8[pos] === 13)) pos++;
      if (u8[pos] === 35 /* # */) {
        const start = pos;
        while (pos < u8.length && u8[pos] !== 10) pos++;
        commentLines.push(String.fromCharCode(...u8.subarray(start, pos)));
        continue;
      }
      break;
    }
    const start = pos;
    while (pos < u8.length && !(u8[pos] === 32 || u8[pos] === 9 || u8[pos] === 10 || u8[pos] === 13)) pos++;
    return String.fromCharCode(...u8.subarray(start, pos));
  };
  const commentLines = [];
  const magic = readToken();
  if (magic !== "P5") throw new Error(`not a binary PGM: ${magic}`);
  const width = parseInt(readToken(), 10);
  const height = parseInt(readToken(), 10);
  const maxval = parseInt(readToken(), 10);
  // exactly one whitespace byte follows maxval before the raster
  pos += 1;
  if (maxval < 256) throw new Error("expected 16-bit PGM");
  let offset = -108, scale = 0.003;
  for (const line of commentLines) {
    const mo = line.match(/Offset\s+(-?[\d.]+)/i);
    const ms = line.match(/Scale\s+(-?[\d.eE]+)/i);
    if (mo) offset = parseFloat(mo[1]);
    if (ms) scale = parseFloat(ms[1]);
  }
  const raster = new DataView(u8.buffer, u8.byteOffset + pos, width * height * 2);
  return { width, height, offset, scale, raster };
}

export function createGeoid(pgmBytes) {
  const { width, height, offset, scale, raster } = parsePgm(pgmBytes);
  const raw = (col, row) => raster.getUint16(2 * (row * width + col), false); // big-endian
  const h = (col, row) => offset + scale * raw(col, row);

  function undulation(latDeg, lonDeg) {
    let lon = ((lonDeg % 360) + 360) % 360;          // 0..360
    let lat = Math.max(-90, Math.min(90, latDeg));
    const fx = lon / (360 / width);                   // 0..width (wraps)
    const fy = (90 - lat) / (180 / (height - 1));     // 0..height-1 (row 0 == +90)
    const x0 = Math.floor(fx) % width;
    const x1 = (x0 + 1) % width;
    const y0 = Math.min(height - 1, Math.floor(fy));
    const y1 = Math.min(height - 1, y0 + 1);
    const tx = fx - Math.floor(fx);
    const ty = fy - y0;
    const top = h(x0, y0) * (1 - tx) + h(x1, y0) * tx;
    const bot = h(x0, y1) * (1 - tx) + h(x1, y1) * tx;
    return top * (1 - ty) + bot * ty;
  }

  return { undulation };
}
