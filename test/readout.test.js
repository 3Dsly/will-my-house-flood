import test from "node:test";
import assert from "node:assert/strict";
import { formatReadout } from "../src/readout.js";

test("underwater case names the place, today's elevation, and the depth", () => {
  const s = formatReadout({ groundMslM: 2, riseM: 70, placeName: "Miami Beach" });
  assert.match(s, /Miami Beach/);
  assert.match(s, /2 m above sea level/);
  assert.match(s, /68 m underwater/);
});

test("above-water case uses the 'above the new sea level' phrasing", () => {
  const s = formatReadout({ groundMslM: 1600, riseM: 70, placeName: "Denver" });
  assert.match(s, /1530 m above the new sea level/);
  assert.doesNotMatch(s, /underwater/);
});

test("exactly at the line reads as 0 m above, not underwater", () => {
  const s = formatReadout({ groundMslM: 70, riseM: 70 });
  assert.match(s, /0 m above the new sea level/);
});

test("null elevation falls back to an honest 'unavailable' line but still states the rise", () => {
  const s = formatReadout({ groundMslM: null, riseM: 30, placeName: "Somewhere" });
  assert.match(s, /elevation.*unavailable/i);
  assert.match(s, /30 m/);
});

test("no placeName uses 'This spot'", () => {
  const s = formatReadout({ groundMslM: 10, riseM: 5 });
  assert.match(s, /^This spot/);
});

test("negative elevation reads as 'below sea level', never a minus sign", () => {
  const nola = formatReadout({ groundMslM: -2, riseM: 70, placeName: "New Orleans" });
  assert.match(nola, /2 m below sea level/);
  assert.doesNotMatch(nola, /-/);

  const badwater = formatReadout({ groundMslM: -85, riseM: 10 });
  assert.match(badwater, /85 m below sea level/);
  assert.doesNotMatch(badwater, /-/);
});
