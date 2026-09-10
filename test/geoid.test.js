// test/geoid.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createGeoid } from "../src/geoid.js";

const pgm = readFileSync(fileURLToPath(new URL("../vendor/egm96/egm96-15.pgm", import.meta.url)));
const geoid = createGeoid(pgm);

// EGM96 undulation is well-known within these bounds. Tighten to a single
// reference value per point once you have run an independent check (see Step 6).
test("London is a strong geoid high (~ +45 to +47 m)", () => {
  const n = geoid.undulation(51.5074, -0.1278);
  assert.ok(n > 44 && n < 48, `got ${n}`);
});

test("Washington DC area is a geoid low (~ -32 to -35 m)", () => {
  const n = geoid.undulation(38.8895, -77.0353);
  assert.ok(n > -36 && n < -31, `got ${n}`);
});

test("south of India / Indian Ocean is the global minimum (~ -95 to -106 m)", () => {
  const n = geoid.undulation(4.7, 78.0);
  assert.ok(n > -107 && n < -94, `got ${n}`);
});

test("longitude accepted as 0..360 and as -180..180 give the same value", () => {
  assert.ok(Math.abs(geoid.undulation(51.5074, -0.1278) - geoid.undulation(51.5074, 359.8722)) < 1e-6);
});

test("clamps latitude at the poles without throwing", () => {
  assert.equal(Number.isFinite(geoid.undulation(90, 0)), true);
  assert.equal(Number.isFinite(geoid.undulation(-90, 123)), true);
});

// Independent reference: GeographicLib online GeoidEval
// (https://geographiclib.sourceforge.io/cgi-bin/GeoidEval), EGM96 model,
// returns 45.9634 m for 51.5074 N, 0.1278 W. GeoidEval uses cubic
// interpolation; this module uses bilinear, so a sub-decimetre difference
// is expected and fine.
test("London matches an independent EGM96 reference within 0.5 m", () => {
  const REFERENCE_N = 45.9634;
  assert.ok(
    Math.abs(geoid.undulation(51.5074, -0.1278) - REFERENCE_N) < 0.5,
    `got ${geoid.undulation(51.5074, -0.1278)}`,
  );
});
