import test from "node:test";
import assert from "node:assert/strict";
import { waterEllipsoidHeight, floodDepth } from "../src/datum.js";

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
