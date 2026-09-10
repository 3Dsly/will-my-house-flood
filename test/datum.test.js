import test from "node:test";
import assert from "node:assert/strict";
import { waterEllipsoidHeight, floodDepth, mslElevation } from "../src/datum.js";

const near = (a, b) => Math.abs(a - b) < 1e-9;

test("mslElevation converts a WGS84-ellipsoidal terrain sample to MSL by subtracting N", () => {
  // Miami Beach: raw ellipsoidal sample ~ -26.3 m, geoid low N ~ -28 m -> ~ +1.7 m MSL
  assert.ok(near(mslElevation(-26.3, -28), 1.7));
  // Denver: raw ~ 1579.5 m, N ~ -17 m -> ~ 1596.5 m MSL
  assert.ok(near(mslElevation(1579.5, -17), 1596.5));
  // Amsterdam: raw ~ 48.4 m, strong geoid high N ~ 42.9 m -> ~ 5.5 m MSL
  assert.ok(near(mslElevation(48.4, 42.9), 5.5));
  // Badwater Basin: raw ~ -76.7 m, N ~ 8.3 m -> ~ -85 m MSL (still below sea level)
  assert.ok(near(mslElevation(-76.7, 8.3), -85));
});

test("mslElevation with N = 0 is a pass-through (geoid grid unavailable)", () => {
  assert.equal(mslElevation(123.4, 0), 123.4);
  assert.equal(mslElevation(-50, 0), -50);
});

test("waterEllipsoidHeight adds the geoid undulation to the rise", () => {
  assert.equal(waterEllipsoidHeight(70, 46), 116);
  assert.equal(waterEllipsoidHeight(0, -30), -30);
  assert.equal(waterEllipsoidHeight(10, 0), 10);
});

test("floodDepth: Badwater Basin (-85 m MSL) is underwater at every rise", () => {
  assert.equal(floodDepth(0, -85), 85);
  assert.equal(floodDepth(70, -85), 155);
});

test("floodDepth: Denver (~1600 m MSL) stays above the sea at +70 m", () => {
  assert.equal(floodDepth(70, 1600), -1530);
});

test("floodDepth: a 2 m-elevation coast is ~68 m under at +70 m", () => {
  assert.equal(floodDepth(70, 2), 68);
});
