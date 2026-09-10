import test from "node:test";
import assert from "node:assert/strict";
import { parseState, buildQuery } from "../src/urlstate.js";

test("parseState reads a full valid triple", () => {
  assert.deepEqual(parseState("?lat=25.79&lon=-80.13&rise=70"),
    { lat: 25.79, lon: -80.13, rise: 70 });
});

test("parseState returns null when any field is missing or out of range", () => {
  assert.equal(parseState("?lat=25.79&lon=-80.13"), null);
  assert.equal(parseState("?lat=200&lon=0&rise=10"), null);
  assert.equal(parseState("?lat=0&lon=0&rise=999"), null);
  assert.equal(parseState(""), null);
});

test("buildQuery round-trips through parseState", () => {
  const q = buildQuery({ lat: 25.7907, lon: -80.1300, rise: 42 });
  assert.equal(q, "?lat=25.79070&lon=-80.13000&rise=42");
  assert.deepEqual(parseState(q), { lat: 25.7907, lon: -80.13, rise: 42 });
});
