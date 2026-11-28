/* The town plan. Metres; +x east, +z south; the default camera looks north. */

export const ISLAND = 135;          // land runs from -ISLAND to +ISLAND on x and z
export const RING = { r: 48, w: 9, foot: 3 };
export const PLAZA = { r: 16 };
export const SPAWN = { x: 0, z: 19, heading: Math.PI }; // heading: angle about Y; PI faces -z (north)

// plots: centre (cx, cz), width along x (w), depth along z (d), and where the spoke road arrives
export const PLOTS = {
  bitsom:  { cx: 0,   cz: -90, w: 72, d: 44, entrance: [0, -68] },
  dtu:     { cx: -74, cz: -64, w: 48, d: 44, entrance: [-50, -42] },
  ailab:   { cx: 74,  cz: -64, w: 48, d: 44, entrance: [50, -42] },
  htl:     { cx: -92, cz: 8,   w: 54, d: 52, entrance: [-65, 8] },
  bb:      { cx: 92,  cz: 8,   w: 54, d: 52, entrance: [65, 8] },
  lss:     { cx: -72, cz: 74,  w: 44, d: 40, entrance: [-50, 54] },
  lead:    { cx: 0,   cz: 94,  w: 60, d: 36, entrance: [0, 76] },
  curious: { cx: 72,  cz: 74,  w: 48, d: 44, entrance: [50, 54] },
  team:    { cx: 24,  cz: -22, w: 14, d: 14, entrance: [17, -15] },
};
Object.entries(PLOTS).forEach(([id, p]) => (p.id = id));

// spoke roads: from a point on the ring to the plot entrance (team sits inside the ring: no spoke)
export const SPOKES = Object.values(PLOTS).filter(p => p.id !== 'team').map(p => {
  const [ex, ez] = p.entrance, a = Math.atan2(ez, ex);
  return { id: p.id, from: [Math.cos(a) * RING.r, Math.sin(a) * RING.r], to: [ex, ez], w: 7 };
});

// footpaths inside the ring: plaza edge to ring, four directions
export const PATHS = [0, Math.PI / 2, Math.PI, -Math.PI / 2].map(a => ({
  from: [Math.cos(a) * PLAZA.r, Math.sin(a) * PLAZA.r],
  to: [Math.cos(a) * (RING.r - RING.w / 2 - RING.foot), Math.sin(a) * (RING.r - RING.w / 2 - RING.foot)],
  w: 4,
}));

// where quick travel drops the player: in front of each place's main door, on the road side
export function arrivalFor(id) {
  const p = PLOTS[id];
  if (!p) return { x: SPAWN.x, z: SPAWN.z };
  const [ex, ez] = p.entrance;
  const dx = p.cx - ex, dz = p.cz - ez, L = Math.hypot(dx, dz) || 1;
  return { x: ex - dx / L * 3, z: ez - dz / L * 3, heading: Math.atan2(dx, dz) };
}

// is a point on land / on a road (used by ambient life to scatter things)
export const onLand = (x, z, margin = 0) => Math.abs(x) < ISLAND - 6 - margin && Math.abs(z) < ISLAND - 6 - margin;
export function inPlot(x, z, margin = 0) {
  for (const p of Object.values(PLOTS)) if (Math.abs(x - p.cx) < p.w / 2 + margin && Math.abs(z - p.cz) < p.d / 2 + margin) return p.id;
  return null;
}
export function onRoad(x, z, margin = 0) {
  const r = Math.hypot(x, z);
  if (Math.abs(r - RING.r) < RING.w / 2 + RING.foot + margin) return true;
  if (r < PLAZA.r + margin) return true;
  for (const s of [...SPOKES, ...PATHS]) {
    const [ax, az] = s.from, [bx, bz] = s.to, vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / L2));
    if (Math.hypot(x - (ax + vx * t), z - (az + vz * t)) < s.w / 2 + 1.5 + margin) return true;
  }
  return false;
}
