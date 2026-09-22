# Animation and simplification verification

User flow: address search or globe tap -> selected coordinates -> Cesium terrain + EGM96 correction -> local depth/clearance -> human-scale diagram and shared URL.

## Confirmed
- 35 automated tests pass: datum math, geoid references, scale ratios, tap/drag/pinch discrimination, readouts, shared URLs, and release asset versioning.
- Packaged build tested at 390 x 844 and 1440 x 1000; no horizontal overflow.
- Canvas comparison: water pixels change over time; the ruler/person canvas remains unchanged. Pause freezes water. Reduced-motion preference switches to Play water.
- Example slider covers 1 m underwater, exact waterline, 30 m above water, zero-rise setting, and return to 6 m underwater.
- Live Miami Beach address lookup resolves, calculates depth, and updates shareable coordinates.
- Direct globe selection works without an enable switch. Keyboard Enter measures the globe center without moving the camera.
- Shared Denver coordinates reopen as an above-water result using live terrain.
- About dialog opens, closes with Escape, and restores focus.
- Unknown address tested with empty provider responses: helpful message and enabled retry.
- Missing geoid tested by blocking the grid request: unavailable result, hidden comparison, and no invented depth. Stale captions were corrected.
- No page errors in normal success flows. Failure-path request warnings are intentional.

## Simplification
Removed device-location shortcut, selection-mode toggle, Measure center button, and duplicate depth statistic. Preserved address lookup, direct globe selection, zoom controls, sea-level slider, pause/play, and About. Keyboard equivalents retain accessibility without extra visible buttons.

## Scope
Browser phone viewport testing is not a physical-device performance test. Results remain approximate terrain-based elevation comparisons, not a hydrological flood assessment.
