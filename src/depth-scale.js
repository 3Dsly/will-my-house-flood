// One scale shared by water, ruler and person; never enlarge the person independently.
export function depthGeometry(depth, height) {
  if (depth < 0) {
    const clearance = -depth;
    const pixelsPerMetre = (height - 110) / Math.max(6, clearance + 2);
    const personHeight = 2 * pixelsPerMetre;
    const ground = 24 + personHeight;
    return { ground, pixelsPerMetre, personHeight, waterHeight: 0,
      clearanceHeight: clearance * pixelsPerMetre,
      surface: ground + clearance * pixelsPerMetre, metres: clearance };
  }
  const ground = height - 32;
  const available = ground - 30;
  const metres = Math.max(3, depth > 0 ? depth : 3);
  const pixelsPerMetre = available / metres;
  return { ground, pixelsPerMetre, personHeight: 2 * pixelsPerMetre,
    waterHeight: Math.max(0, depth) * pixelsPerMetre,
    surface: ground - Math.max(0, depth) * pixelsPerMetre, metres };
}
