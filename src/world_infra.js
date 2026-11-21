import * as THREE from 'three';

// ============================================================================
// GTA: Đại Lộ & Bờ Biển 3D — World Infrastructure, Multi-Level Freeways,
// Cable-Stayed Bridge, Luxury Yacht Marina, Côn Lôn Tiên Sơn Observatory,
// Walk-In Linh Thạch Bảo Khố Vault & 12 Cinematic Monster Ngự Phong Phi Độ
// Exclusively owns: src/world_infra.js -> ctx.worldInfra
// ============================================================================

const FREEWAY_DECK_Y = 12.5;
const FREEWAY_HALF_W = 8.4; // 16.8m 4-lane divided highway deck
const RAMP_HALF_W = 5.4;    // 10.8m 2-lane smooth highway on/off-ramp
const BRIDGE_HALF_W = 8.5;  // 17.0m 2-lane + dual pedestrian coastal bridge
const ISLAND_DECK_Y = 4.0;
const MARINA_DECK_Y = 1.25;
const YACHT_CENTER_X = -295.0;
const YACHT_CENTER_Z = 115.0;
const OBSERVATORY_TERRACE_Y = 28.0;
const BANK_EXT_POS = { x: 111.0, y: 0.22, z: -120.0 };
const BANK_INT_ORIGIN = { x: 2100.0, y: 0.02, z: 2100.0 };
const STUNT_STORAGE_KEY = 'gtav_world_infra_stunts_v1';

// Deterministic Mulberry32 PRNG for reproducible civil-engineering details
function createInfraRNG(seed = 20261118) {
  let s = seed >>> 0;
  return function nextRand() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(e0, e1, x) {
  if (Math.abs(e1 - e0) < 1e-8) return x >= e1 ? 1 : 0;
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

function smootherstep(e0, e1, x) {
  if (Math.abs(e1 - e0) < 1e-8) return x >= e1 ? 1 : 0;
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function wrapAngle(a) {
  let r = a;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return r;
}

function damp(cur, target, lambda, dt) {
  return lerp(cur, target, 1 - Math.exp(-lambda * dt));
}

function dampAngle(cur, target, lambda, dt) {
  const diff = wrapAngle(target - cur);
  return wrapAngle(cur + diff * (1 - Math.exp(-lambda * dt)));
}

function dist2D(x1, z1, x2, z2) {
  return Math.hypot(x2 - x1, z2 - z1);
}

function distSq2D(x1, z1, x2, z2) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  return dx * dx + dz * dz;
}

// Project 2D point (px, pz) onto line segment (ax, az) -> (bx, bz)
function projectPointOnSegment2D(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const lenSq = vx * vx + vz * vz;
  if (lenSq < 1e-8) {
    const dx = px - ax;
    const dz = pz - az;
    return { t: 0, cx: ax, cz: az, distSq: dx * dx + dz * dz, signedLat: 0 };
  }
  const t = clamp(((px - ax) * vx + (pz - az) * vz) / lenSq, 0, 1);
  const cx = ax + vx * t;
  const cz = az + vz * t;
  const dx = px - cx;
  const dz = pz - cz;
  const invLen = 1 / Math.sqrt(lenSq);
  const rightX = -vz * invLen;
  const rightZ = vx * invLen;
  const signedLat = dx * rightX + dz * rightZ;
  return { t, cx, cz, distSq: dx * dx + dz * dz, signedLat };
}

// ============================================================================
// 1. Exact Non-Overlapping Infrastructure Centerline Definitions
// ============================================================================

// Build densely sampled smooth 3D highway centerline with rounded corners & S-curves:
//   - South Perimeter Viaduct: Z = +232, X in [-118, +235], y = 12.5m
//   - SE Banked Highway Curve: (235, +232) -> (253, +214), y = 12.5m
//   - East Coastal Viaduct: X = +253, Z in [-22, +214], y = 12.5m (clear East of [214,244] towers)
//   - Downtown Elevated S-Curve: (253, -22) -> (253, -40) -> (200, -40) -> (200, -58), y = 12.5m (clear South of Casino Z=-68!)
//   - Upper-Deck Casino Corridor Viaduct: X = +200, Z in [-197, -58], y = 12.5m (wide straddle piers over X=200!)
//   - NE Sweeping Curve: (200, -197) -> (182, -215), y = 12.5m -> joins North On/Off-Ramp #2!
function buildFreewayCenterlineNodes() {
  const pts = [];

  function pushPt(x, y, z, bank = 0, overGroundRoad = false) {
    if (pts.length > 0) {
      const prev = pts[pts.length - 1];
      if (Math.hypot(x - prev.x, z - prev.z) < 0.05) return;
    }
    pts.push({ x, y, z, bank, overGroundRoad });
  }

  function pushQuarterArc(cx, cz, radius, angStart, angEnd, steps, y, bankVal, overRoad = false) {
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const a = lerp(angStart, angEnd, u);
      const bankFade = Math.sin(u * Math.PI);
      pushPt(
        cx + Math.cos(a) * radius,
        y,
        cz + Math.sin(a) * radius,
        bankVal * bankFade,
        overRoad
      );
    }
  }

  // 1) South Perimeter Viaduct: X from -118 to +235 at Z = +232
  for (let x = -118; x <= 235; x += 8) {
    pushPt(x, FREEWAY_DECK_Y, 232.0, 0, false);
  }
  pushPt(235.0, FREEWAY_DECK_Y, 232.0, 0, false);

  // 2) SE Sweeping Curve: center (235, 214), radius 18m, angle +PI/2 -> 0
  pushQuarterArc(235.0, 214.0, 18.0, Math.PI * 0.5, 0, 12, FREEWAY_DECK_Y, -0.045, false);

  // 3) East Perimeter Viaduct: X = +253, Z from +214 North to -24
  for (let z = 206; z >= -24; z -= 8) {
    const overStreet =
      Math.abs(z - 200) < 10 ||
      Math.abs(z - 120) < 10 ||
      Math.abs(z - 40) < 10;
    pushPt(253.0, FREEWAY_DECK_Y, z, 0, overStreet);
  }
  pushPt(253.0, FREEWAY_DECK_Y, -24.0, 0, false);

  // 4) Smooth Elevated S-Curve Westward along Z = -40 Corridor to X = +200
  //    Turn 4A: (253, -24) -> (237, -40), center (237, -24), radius 16m, angle 0 -> -PI/2
  pushQuarterArc(237.0, -24.0, 16.0, 0, -Math.PI * 0.5, 10, FREEWAY_DECK_Y, 0.04, true);

  //    Short straight at Z = -40 from X = 237 to X = 216
  pushPt(226.5, FREEWAY_DECK_Y, -40.0, 0, true);
  pushPt(216.0, FREEWAY_DECK_Y, -40.0, 0, true);

  //    Turn 4B: (216, -40) -> (200, -56), center (216, -56), radius 16m, angle +PI/2 -> PI
  pushQuarterArc(216.0, -56.0, 16.0, Math.PI * 0.5, Math.PI, 10, FREEWAY_DECK_Y, -0.04, true);

  // 5) Upper-Deck Power Street / Casino Viaduct: X = +200, Z from -56 to -197
  for (let z = -64; z >= -196; z -= 8) {
    pushPt(200.0, FREEWAY_DECK_Y, z, 0, true);
  }
  pushPt(200.0, FREEWAY_DECK_Y, -197.0, 0, true);

  // 6) NE Sweeping Curve into North Ramp: center (182, -197), radius 18m, angle 0 -> -PI/2
  pushQuarterArc(182.0, -197.0, 18.0, 0, -Math.PI * 0.5, 12, FREEWAY_DECK_Y, 0.04, true);

  // Compute cumulative arc length & unit tangents/normals at each vertex
  let totalLen = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) {
      pts[i].s = 0;
    } else {
      totalLen += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
      pts[i].s = totalLen;
    }
  }
  for (let i = 0; i < pts.length; i++) {
    const pPrev = pts[Math.max(0, i - 1)];
    const pNext = pts[Math.min(pts.length - 1, i + 1)];
    let tx = pNext.x - pPrev.x;
    let tz = pNext.z - pPrev.z;
    const tLen = Math.hypot(tx, tz) || 1;
    tx /= tLen;
    tz /= tLen;
    pts[i].tx = tx;
    pts[i].tz = tz;
    pts[i].rx = -tz;
    pts[i].rz = tx;
    pts[i].yaw = Math.atan2(tx, tz);
  }

  return pts;
}

// Smooth On/Off-Ramp #1 (South-West): connects Z = +200 Bích Thủy Kênh Avenue / X = -120 intersection
// along Z = +215 (X: -112 -> -42, y: 0.03m -> 12.5m) into South Viaduct (Z = +232)
function buildSouthRampNodes() {
  const pts = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = lerp(-112.0, -34.0, u);
    const curveZ = u < 0.72
      ? 214.8
      : lerp(214.8, 224.2, smoothstep(0.72, 1.0, u));
    const y = lerp(0.03, FREEWAY_DECK_Y, smootherstep(0.0, 0.94, u));
    pts.push({ x, y, z: curveZ, bank: 0, u });
  }
  finalizeSplineFrame(pts);
  return pts;
}

// Smooth On/Off-Ramp #2 (North-East): connects Elevated NE Curve (182, 12.5, -215)
// smoothly Westward along Z = -215 (X: 182 -> 120, y: 12.5m -> 0.03m) down to (120, -200) Avenue!
function buildNorthRampNodes() {
  const pts = [];
  const steps = 22;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = lerp(182.0, 120.0, u);
    const z = u > 0.82
      ? lerp(-215.0, -208.2, smoothstep(0.82, 1.0, u))
      : -215.0;
    const y = lerp(FREEWAY_DECK_Y, 0.03, smootherstep(0.06, 1.0, u));
    pts.push({ x, y, z, bank: 0, u });
  }
  finalizeSplineFrame(pts);
  return pts;
}

// Côn Lôn Tiên Sơn Scenic Switchback Hill-Climb Road:
//   - Starts off Z = -200 Avenue at (26, 0.04, -208) -> turns East onto Leg 1 (Z = -215.5, X: 30 -> 104, y: 0.22 -> 14.5m)
//   - Sweeps around Banked Hairpin Overlook at (104..112, -221.5, y: 14.5 -> 17.6m)
//   - Climbs West along Leg 2 (Z = -227.5, X: 104 -> 78, y: 17.6 -> 28.0m) onto Galileo Observatory Terrace!
function buildObservatoryRoadNodes() {
  const pts = [];

  // Entry apron curving from (24, 0.04, -207.5) into Leg 1 (32, 0.45, -215.5)
  for (let i = 0; i <= 6; i++) {
    const u = i / 6;
    const a = lerp(Math.PI, Math.PI * 0.5, u);
    const x = 32.0 + Math.cos(a) * 8.0;
    const z = -207.5 - Math.sin(u * Math.PI * 0.5) * 8.0;
    const y = lerp(0.04, 0.55, smoothstep(0, 1, u));
    pts.push({ x, y, z, bank: 0 });
  }

  // Leg 1: Eastward climb along Z = -215.5 from X = 35 to X = 103
  for (let i = 1; i <= 17; i++) {
    const u = i / 17;
    const x = lerp(32.0, 103.0, u);
    const y = lerp(0.55, 14.6, smootherstep(0, 1, u));
    pts.push({ x, y, z: -215.5, bank: 0 });
  }

  // Scenic Hairpin Turn: Semicircle centered at (103.0, -221.8), radius 6.3m, angle +PI/2 -> -PI/2
  for (let i = 1; i <= 14; i++) {
    const u = i / 14;
    const a = lerp(Math.PI * 0.5, -Math.PI * 0.5, u);
    const x = 103.0 + Math.cos(a) * 6.8;
    const z = -221.8 + Math.sin(a) * 6.3;
    const y = lerp(14.6, 18.2, u);
    pts.push({ x, y, z, bank: 0.04 * Math.sin(u * Math.PI) });
  }

  // Leg 2: Westward upper climb along Z = -228.1 from X = 103 to X = 78.0 arriving at y = 28.0m Terrace!
  for (let i = 1; i <= 14; i++) {
    const u = i / 14;
    const x = lerp(103.0, 78.0, u);
    const z = lerp(-228.1, -234.0, smoothstep(0.65, 1.0, u));
    const y = lerp(18.2, OBSERVATORY_TERRACE_Y, smootherstep(0, 0.96, u));
    pts.push({ x, y, z, bank: 0 });
  }

  finalizeSplineFrame(pts);
  return pts;
}

// Iconic Red Cable-Stayed Coastal Bridge Profile: X from -127.5 to -245.5 along Z = +200
function evalRedBridgeDeckY(x) {
  if (x >= -127.5) return 0.03;
  if (x <= -245.5) return ISLAND_DECK_Y;
  // Smooth asymmetric coastal arch:
  //   x = -127.5 -> y = 0.03m (Bích Thủy Kênh South Ave connection)
  //   x = -186.0 -> y = 7.85m (Main Ocean Channel Crown!)
  //   x = -245.5 -> y = 4.00m (Lighthouse Island Peninsula connection)
  if (x >= -186.0) {
    const u = (-127.5 - x) / (186.0 - 127.5);
    return lerp(0.03, 7.85, smootherstep(0, 1, u));
  }
  const u = (-186.0 - x) / (245.5 - 186.0);
  return lerp(7.85, ISLAND_DECK_Y, smootherstep(0, 1, u));
}

function buildRedBridgeNodes() {
  const pts = [];
  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = lerp(-127.5, -245.5, u);
    pts.push({ x, y: evalRedBridgeDeckY(x), z: 200.0, bank: 0, u });
  }
  finalizeSplineFrame(pts);
  return pts;
}

function finalizeSplineFrame(pts) {
  let totalLen = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) {
      pts[i].s = 0;
    } else {
      totalLen += Math.hypot(
        pts[i].x - pts[i - 1].x,
        pts[i].y - pts[i - 1].y,
        pts[i].z - pts[i - 1].z
      );
      pts[i].s = totalLen;
    }
  }
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b.x - a.x;
    let ty = b.y - a.y;
    let tz = b.z - a.z;
    const hLen = Math.hypot(tx, tz) || 1;
    const txH = tx / hLen;
    const tzH = tz / hLen;
    pts[i].tx = txH;
    pts[i].tz = tzH;
    pts[i].slope = ty / hLen;
    pts[i].rx = -tzH;
    pts[i].rz = txH;
    pts[i].yaw = Math.atan2(txH, tzH);
  }
  return pts;
}

// ============================================================================
// 2. All 12 Monster Ngự Phong Phi Độ Definitions ("Điểm Bay Xe Mạo Hiểm")
// ============================================================================
// Convention: `yaw` is world launch direction where forward = (sin(yaw), 0, cos(yaw)):
//   yaw = 0         -> +Z (South)
//   yaw = Math.PI   -> -Z (North)
//   yaw = Math.PI/2 -> +X (East)
//   yaw = -Math.PI/2-> -X (West)
const STUNT_JUMP_SPECS = [
  {
    id: 1,
    name: 'Cầu Phóng Công Trường Boulevard Bồng Lai Tiên Đảo',
    zone: 'Boulevard Bồng Lai Tiên Đảo',
    style: 'girder',
    x: 45.2,
    z: -4.0,
    baseY: 0.02,
    yaw: 0, // Launches South (+Z) down Boulevard Bồng Lai Tiên Đảo!
    length: 14.5,
    width: 5.4,
    height: 2.85,
    minDist: 26,
  },
  {
    id: 2,
    name: 'Xe Đầu Kéo Chở Xe Đại Lộ Phía Bắc',
    zone: 'Bắc Boulevard Bồng Lai Tiên Đảo',
    style: 'trailer',
    x: 34.8,
    z: -146.0,
    baseY: 0.02,
    yaw: Math.PI, // Launches North (-Z) across Côn Lôn Tiên Sơn intersection!
    length: 15.5,
    width: 5.2,
    height: 3.05,
    minDist: 28,
  },
  {
    id: 3,
    name: 'Bệ Phóng Gỗ Cuối Cầu Cảng Mặt Trời',
    zone: 'Cầu Cảng Bồng Lai Tiên Đảo Pier',
    style: 'boardwalk',
    x: -278.0,
    z: -4.5,
    baseY: 3.80,
    yaw: Math.PI * 0.5, // Launches East (+X) down the Amusement Pier deck!
    length: 14.0,
    width: 5.6,
    height: 2.75,
    minDist: 26,
  },
  {
    id: 4,
    name: 'Đồi Cát Cứu Hộ Bãi Biển Thái Bình Dương',
    zone: 'Bãi Biển Pacific Beach',
    style: 'dune_wood',
    x: -148.0,
    z: 24.0,
    baseY: 0.14,
    yaw: 0, // Launches South (+Z) over Pacific Beach sand!
    length: 15.0,
    width: 6.0,
    height: 2.95,
    minDist: 25,
  },
  {
    id: 5,
    name: 'Cầu Tàu Bến Du Thuyền Hạng Sang',
    zone: 'Bến Du Thuyền Bồng Lai Tiên Đảo Marina',
    style: 'girder',
    x: -168.0,
    z: 108.0,
    baseY: 0.02,
    yaw: -Math.PI * 0.5, // Launches West (-X) over the Marina shoreline onto the Pier!
    length: 14.5,
    width: 5.5,
    height: 2.90,
    minDist: 24,
  },
  {
    id: 6,
    name: 'Nhịp Cầu Đỏ Đang Thi Công Vượt Eo Biển',
    zone: 'Cầu Dây Văng Đỏ Ven Biển',
    style: 'bridge_gap',
    x: -150.0,
    z: 204.2,
    baseY: 4.35,
    yaw: -Math.PI * 0.5, // Launches West (-X) high through the Red Bridge cables!
    length: 15.0,
    width: 5.0,
    height: 2.80,
    minDist: 28,
  },
  {
    id: 7,
    name: 'Mỏm Đá Đảo Hải Đăng Bay Về Đất Liền',
    zone: 'Đảo Hải Đăng Thái Bình Dương',
    style: 'cliff_rock',
    x: -254.0,
    z: 195.8,
    baseY: 4.00,
    yaw: Math.PI * 0.5, // Launches East (+X) from Lighthouse Island onto Red Bridge!
    length: 14.5,
    width: 5.4,
    height: 3.10,
    minDist: 28,
  },
  {
    id: 8,
    name: 'Nhịp Cao Tốc Bỏ Dở Trên Không (Độ Cao 12.5m)',
    zone: 'Cao Tốc Trên Cao Phía Nam',
    style: 'freeway_gap',
    x: -102.0,
    z: 232.0,
    baseY: FREEWAY_DECK_Y,
    yaw: -Math.PI * 0.5, // Launches West (-X) off the 12.5m Elevated Freeway stub!
    length: 16.0,
    width: 6.8,
    height: 3.25,
    minDist: 38,
  },
  {
    id: 9,
    name: 'Dốc Thép Vượt Trạm Thu Phí Cao Tốc Nam',
    zone: 'Cao Tốc Trên Cao Nam',
    style: 'girder',
    x: 152.0,
    z: 235.6,
    baseY: FREEWAY_DECK_Y,
    yaw: Math.PI * 0.5, // Launches East (+X) along the 12.5m South Freeway!
    length: 15.5,
    width: 5.4,
    height: 2.85,
    minDist: 30,
  },
  {
    id: 10,
    name: 'Bệ Phóng Hẻm Núi Cao Ốc Đông Thành Phố',
    zone: 'Cao Tốc Trên Cao Phía Đông',
    style: 'trailer',
    x: 253.0,
    z: 104.0,
    baseY: FREEWAY_DECK_Y,
    yaw: Math.PI, // Launches North (-Z) along the 12.5m East Skyscraper Viaduct!
    length: 15.5,
    width: 5.4,
    height: 2.95,
    minDist: 30,
  },
  {
    id: 11,
    name: 'Xe Tải Phóng Qua Quảng Trường Tháp FIB',
    zone: 'Trung Tâm Tài Chính Downtown',
    style: 'trailer',
    x: 123.8,
    z: 12.0,
    baseY: 0.02,
    yaw: Math.PI, // Launches North (-Z) past FIB Skyscraper Plaza!
    length: 15.0,
    width: 5.0,
    height: 2.95,
    minDist: 26,
  },
  {
    id: 12,
    name: 'Cú Bay Thần Thánh Đỉnh Đài Thiên Văn Côn Lôn Tiên Sơn (28m!)',
    zone: 'Đài Thiên Văn Đồi Côn Lôn Tiên Sơn',
    style: 'cliff_mega',
    x: 44.0,
    z: -234.5,
    baseY: OBSERVATORY_TERRACE_Y,
    yaw: 0, // Launches South (+Z) from 28m Observatory Terrace straight down Boulevard Bồng Lai Tiên Đảo!
    length: 15.0,
    width: 6.2,
    height: 3.45,
    minDist: 48,
  },
];

// ============================================================================
// 3. High-Speed BufferGeometry Merger & Low-Draw-Call Static Batcher (< 18 DC)
// ============================================================================

const _bPos = new THREE.Vector3();
const _bEuler = new THREE.Euler();
const _bQuat = new THREE.Quaternion();
const _bScale = new THREE.Vector3();

function makeMat4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _bPos.set(x, y, z);
  _bEuler.set(rx, ry, rz, 'YXZ');
  _bQuat.setFromEuler(_bEuler);
  _bScale.set(sx, sy, sz);
  const m = new THREE.Matrix4();
  m.compose(_bPos, _bQuat, _bScale);
  return m;
}

function makeBasisMat4(cx, cy, cz, rightX, rightY, rightZ, upX, upY, upZ, fwdX, fwdY, fwdZ, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Matrix4();
  m.set(
    rightX * sx, upX * sy, fwdX * sz, cx,
    rightY * sx, upY * sy, fwdY * sz, cy,
    rightZ * sx, upZ * sy, fwdZ * sz, cz,
    0, 0, 0, 1
  );
  return m;
}

function mergeInfraBufferGeometries(items) {
  if (!items || items.length === 0) return null;

  let totalVerts = 0;
  let totalIndices = 0;
  let useColors = false;

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const g = it?.geo;
    if (!g || !g.attributes?.position) continue;
    const vc = g.attributes.position.count;
    totalVerts += vc;
    totalIndices += g.index ? g.index.count : vc;
    if (g.attributes.color || it.color) useColors = true;
  }

  if (totalVerts === 0) return null;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const colors = useColors ? new Float32Array(totalVerts * 3) : null;
  const indices = totalVerts > 65535
    ? new Uint32Array(totalIndices)
    : new Uint16Array(totalIndices);

  let vOffset = 0;
  let iOffset = 0;

  for (let idx = 0; idx < items.length; idx++) {
    const { geo, matrix, color } = items[idx];
    if (!geo || !geo.attributes?.position) continue;

    const posAttr = geo.attributes.position;
    const normAttr = geo.attributes.normal;
    const uvAttr = geo.attributes.uv;
    const colAttr = geo.attributes.color;
    const vCount = posAttr.count;

    const e = matrix ? matrix.elements : null;
    const m00 = e ? e[0] : 1, m01 = e ? e[4] : 0, m02 = e ? e[8] : 0, m03 = e ? e[12] : 0;
    const m10 = e ? e[1] : 0, m11 = e ? e[5] : 1, m12 = e ? e[9] : 0, m13 = e ? e[13] : 0;
    const m20 = e ? e[2] : 0, m21 = e ? e[6] : 0, m22 = e ? e[10] : 1, m23 = e ? e[14] : 0;

    const sx2 = m00 * m00 + m10 * m10 + m20 * m20 || 1;
    const sy2 = m01 * m01 + m11 * m11 + m21 * m21 || 1;
    const sz2 = m02 * m02 + m12 * m12 + m22 * m22 || 1;
    const n00 = m00 / sx2, n01 = m01 / sy2, n02 = m02 / sz2;
    const n10 = m10 / sx2, n11 = m11 / sy2, n12 = m12 / sz2;
    const n20 = m20 / sx2, n21 = m21 / sy2, n22 = m22 / sz2;

    const cr = color ? color.r : 1;
    const cg = color ? color.g : 1;
    const cb = color ? color.b : 1;

    for (let v = 0; v < vCount; v++) {
      const px = posAttr.getX(v);
      const py = posAttr.getY(v);
      const pz = posAttr.getZ(v);

      const pBase = (vOffset + v) * 3;
      positions[pBase] = m00 * px + m01 * py + m02 * pz + m03;
      positions[pBase + 1] = m10 * px + m11 * py + m12 * pz + m13;
      positions[pBase + 2] = m20 * px + m21 * py + m22 * pz + m23;

      if (normAttr) {
        const nx = normAttr.getX(v);
        const ny = normAttr.getY(v);
        const nz = normAttr.getZ(v);
        const tnx = n00 * nx + n01 * ny + n02 * nz;
        const tny = n10 * nx + n11 * ny + n12 * nz;
        const tnz = n20 * nx + n21 * ny + n22 * nz;
        const nLen = Math.hypot(tnx, tny, tnz) || 1;
        normals[pBase] = tnx / nLen;
        normals[pBase + 1] = tny / nLen;
        normals[pBase + 2] = tnz / nLen;
      } else {
        normals[pBase] = 0;
        normals[pBase + 1] = 1;
        normals[pBase + 2] = 0;
      }

      const uBase = (vOffset + v) * 2;
      if (uvAttr) {
        uvs[uBase] = uvAttr.getX(v);
        uvs[uBase + 1] = uvAttr.getY(v);
      }

      if (colors) {
        if (colAttr) {
          colors[pBase] = colAttr.getX(v) * cr;
          colors[pBase + 1] = colAttr.getY(v) * cg;
          colors[pBase + 2] = colAttr.getZ(v) * cb;
        } else {
          colors[pBase] = cr;
          colors[pBase + 1] = cg;
          colors[pBase + 2] = cb;
        }
      }
    }

    if (geo.index) {
      const idxArr = geo.index.array;
      const ic = geo.index.count;
      for (let k = 0; k < ic; k++) {
        indices[iOffset + k] = idxArr[k] + vOffset;
      }
      iOffset += ic;
    } else {
      for (let k = 0; k < vCount; k++) {
        indices[iOffset + k] = k + vOffset;
      }
      iOffset += vCount;
    }

    vOffset += vCount;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  if (colors) {
    merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  return merged;
}

function createStaticBatcher(targetParent, labelPrefix = 'InfraBatch') {
  const buckets = new Map();
  const colorCache = new Map();

  function getColor(hexOrColor) {
    if (hexOrColor === null || hexOrColor === undefined) return null;
    if (hexOrColor.isColor) return hexOrColor;
    let c = colorCache.get(hexOrColor);
    if (!c) {
      c = new THREE.Color(hexOrColor);
      colorCache.set(hexOrColor, c);
    }
    return c;
  }

  function ensureBucket(bucketKey, material, castShadow = true, receiveShadow = true) {
    let b = buckets.get(bucketKey);
    if (!b) {
      b = {
        key: bucketKey,
        material,
        castShadow: Boolean(castShadow),
        receiveShadow: Boolean(receiveShadow),
        items: [],
      };
      buckets.set(bucketKey, b);
    } else {
      if (castShadow) b.castShadow = true;
      if (receiveShadow) b.receiveShadow = true;
    }
    return b;
  }

  function add(bucketKey, material, geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, hexColor = null, castShadow = true, receiveShadow = true) {
    if (!geo) return;
    const b = ensureBucket(bucketKey, material, castShadow, receiveShadow);
    b.items.push({
      geo,
      matrix: makeMat4(x, y, z, rx, ry, rz, sx, sy, sz),
      color: getColor(hexColor),
    });
  }

  function addMatrix(bucketKey, material, geo, matrix, hexColor = null, castShadow = true, receiveShadow = true) {
    if (!geo || !matrix) return;
    const b = ensureBucket(bucketKey, material, castShadow, receiveShadow);
    b.items.push({
      geo,
      matrix,
      color: getColor(hexColor),
    });
  }

  // Span a beam or cable between 3D endpoints p1 -> p2 with exact alignment along local +Y cylinder/box
  function addStrut(bucketKey, material, unitGeoAlongY, x1, y1, z1, x2, y2, z2, radiusOrWidthX, radiusOrDepthZ, hexColor = null, castShadow = false, receiveShadow = false) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-4) return;
    const upX = dx / len;
    const upY = dy / len;
    const upZ = dz / len;
    let refX = 0, refY = 0, refZ = 1;
    if (Math.abs(upZ) > 0.92) {
      refX = 1;
      refZ = 0;
    }
    let rx = upY * refZ - upZ * refY;
    let ry = upZ * refX - upX * refZ;
    let rz = upX * refY - upY * refX;
    const rLen = Math.hypot(rx, ry, rz) || 1;
    rx /= rLen; ry /= rLen; rz /= rLen;

    const fx = ry * upZ - rz * upY;
    const fy = rz * upX - rx * upZ;
    const fz = rx * upY - ry * upX;

    const mat = makeBasisMat4(
      (x1 + x2) * 0.5,
      (y1 + y2) * 0.5,
      (z1 + z2) * 0.5,
      rx, ry, rz,
      upX, upY, upZ,
      fx, fy, fz,
      radiusOrWidthX,
      len,
      radiusOrDepthZ
    );
    addMatrix(bucketKey, material, unitGeoAlongY, mat, hexColor, castShadow, receiveShadow);
  }

  function flush() {
    const builtMeshes = [];
    for (const [key, b] of buckets.entries()) {
      if (b.items.length === 0) continue;
      const mergedGeo = mergeInfraBufferGeometries(b.items);
      if (!mergedGeo) continue;
      const mesh = new THREE.Mesh(mergedGeo, b.material);
      mesh.name = `${labelPrefix}_${key}`;
      mesh.castShadow = b.castShadow;
      mesh.receiveShadow = b.receiveShadow;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      if (targetParent) targetParent.add(mesh);
      builtMeshes.push(mesh);
      b.items.length = 0;
    }
    return builtMeshes;
  }

  return { add, addMatrix, addStrut, flush, getColor };
}

// ============================================================================
// 4. Parametric Civil-Engineering & Architectural Geometry Generators
// ============================================================================

// Build continuous curved ribbon road/viaduct top surface geometry along spline nodes
function createRibbonRoadSurfaceGeometry(nodes, width, uvRepeatLength = 16.0, yOffset = 0.02) {
  const n = nodes.length;
  const halfW = width * 0.5;
  const positions = new Float32Array(n * 2 * 3);
  const normals = new Float32Array(n * 2 * 3);
  const uvs = new Float32Array(n * 2 * 2);
  const indices = new Uint16Array((n - 1) * 6);

  for (let i = 0; i < n; i++) {
    const pt = nodes[i];
    const bank = pt.bank || 0;
    const cosB = Math.cos(bank);
    const sinB = Math.sin(bank);

    const lx = pt.x - pt.rx * halfW * cosB;
    const ly = pt.y + yOffset - halfW * sinB;
    const lz = pt.z - pt.rz * halfW * cosB;

    const rx = pt.x + pt.rx * halfW * cosB;
    const ry = pt.y + yOffset + halfW * sinB;
    const rz = pt.z + pt.rz * halfW * cosB;

    const v0 = i * 2;
    const v1 = v0 + 1;

    positions[v0 * 3] = lx;
    positions[v0 * 3 + 1] = ly;
    positions[v0 * 3 + 2] = lz;

    positions[v1 * 3] = rx;
    positions[v1 * 3 + 1] = ry;
    positions[v1 * 3 + 2] = rz;

    normals[v0 * 3] = -pt.rx * sinB;
    normals[v0 * 3 + 1] = cosB;
    normals[v0 * 3 + 2] = -pt.rz * sinB;

    normals[v1 * 3] = -pt.rx * sinB;
    normals[v1 * 3 + 1] = cosB;
    normals[v1 * 3 + 2] = -pt.rz * sinB;

    const vCoord = (pt.s || 0) / uvRepeatLength;
    uvs[v0 * 2] = 0.0;
    uvs[v0 * 2 + 1] = vCoord;
    uvs[v1 * 2] = 1.0;
    uvs[v1 * 2 + 1] = vCoord;
  }

  let k = 0;
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices[k++] = a;
    indices[k++] = c;
    indices[k++] = b;
    indices[k++] = b;
    indices[k++] = c;
    indices[k++] = d;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeVertexNormals();
  return geo;
}

// Extrude an arbitrary closed 2D cross-section profile [(x, y), ...] along a 3D spline!
// Ideal for continuous trapezoidal box-girder viaduct decks, New Jersey concrete crash barriers,
// retaining walls, and molded stone cornices with zero gaps on curves!
function createSweptProfileGeometry(nodes, profile2D, capEnds = true) {
  const n = nodes.length;
  const m = profile2D.length;
  const sideVerts = (n - 1) * m * 4;
  const capVerts = capEnds ? (m - 2) * 3 * 2 : 0;
  const totalVerts = sideVerts + capVerts;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);

  let vc = 0;

  function evalRingPoint(pt, px, py) {
    const bank = pt.bank || 0;
    const cosB = Math.cos(bank);
    const sinB = Math.sin(bank);
    const ox = px * cosB - py * sinB;
    const oy = px * sinB + py * cosB;
    return [
      pt.x + pt.rx * ox,
      pt.y + oy,
      pt.z + pt.rz * ox,
    ];
  }

  function pushVert(p, nx, ny, nz, u, v) {
    positions[vc * 3] = p[0];
    positions[vc * 3 + 1] = p[1];
    positions[vc * 3 + 2] = p[2];
    normals[vc * 3] = nx;
    normals[vc * 3 + 1] = ny;
    normals[vc * 3 + 2] = nz;
    uvs[vc * 2] = u;
    uvs[vc * 2 + 1] = v;
    vc++;
  }

  const indices = [];

  for (let i = 0; i < n - 1; i++) {
    const n0 = nodes[i];
    const n1 = nodes[i + 1];
    const v0 = (n0.s || 0) * 0.12;
    const v1 = (n1.s || 0) * 0.12;

    for (let j = 0; j < m; j++) {
      const jNext = (j + 1) % m;
      const [px0, py0] = profile2D[j];
      const [px1, py1] = profile2D[jNext];

      const a = evalRingPoint(n0, px0, py0);
      const b = evalRingPoint(n0, px1, py1);
      const c = evalRingPoint(n1, px0, py0);
      const d = evalRingPoint(n1, px1, py1);

      const e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2];
      const e2x = c[0] - a[0], e2y = c[1] - a[1], e2z = c[2] - a[2];
      let fnx = e1y * e2z - e1z * e2y;
      let fny = e1z * e2x - e1x * e2z;
      let fnz = e1x * e2y - e1y * e2x;
      const fLen = Math.hypot(fnx, fny, fnz) || 1;
      fnx /= fLen; fny /= fLen; fnz /= fLen;

      const base = vc;
      pushVert(a, fnx, fny, fnz, j / m, v0);
      pushVert(b, fnx, fny, fnz, (j + 1) / m, v0);
      pushVert(c, fnx, fny, fnz, j / m, v1);
      pushVert(d, fnx, fny, fnz, (j + 1) / m, v1);

      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }

  if (capEnds && m >= 3) {
    // Start cap (normal -tangent)
    const startNode = nodes[0];
    const p0 = evalRingPoint(startNode, profile2D[0][0], profile2D[0][1]);
    for (let j = 1; j < m - 1; j++) {
      const p1 = evalRingPoint(startNode, profile2D[j + 1][0], profile2D[j + 1][1]);
      const p2 = evalRingPoint(startNode, profile2D[j][0], profile2D[j][1]);
      const base = vc;
      pushVert(p0, -startNode.tx, 0, -startNode.tz, 0, 0);
      pushVert(p1, -startNode.tx, 0, -startNode.tz, 1, 0);
      pushVert(p2, -startNode.tx, 0, -startNode.tz, 0.5, 1);
      indices.push(base, base + 1, base + 2);
    }

    // End cap (normal +tangent)
    const endNode = nodes[n - 1];
    const q0 = evalRingPoint(endNode, profile2D[0][0], profile2D[0][1]);
    for (let j = 1; j < m - 1; j++) {
      const q1 = evalRingPoint(endNode, profile2D[j][0], profile2D[j][1]);
      const q2 = evalRingPoint(endNode, profile2D[j + 1][0], profile2D[j + 1][1]);
      const base = vc;
      pushVert(q0, endNode.tx, 0, endNode.tz, 0, 0);
      pushVert(q1, endNode.tx, 0, endNode.tz, 1, 0);
      pushVert(q2, endNode.tx, 0, endNode.tz, 0.5, 1);
      indices.push(base, base + 1, base + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, vc * 3), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals.subarray(0, vc * 3), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs.subarray(0, vc * 2), 2));
  geo.setIndex(indices);
  return geo;
}

// Sculpted Classical Fluted Marble Column (Plinth + Torus Base + Entasis Fluted Shaft + Capital + Abacus)
function createClassicalColumnGeometry(height = 8.4, baseRadius = 0.62) {
  const parts = [];
  const plinthH = height * 0.065;
  const capH = height * 0.085;
  const shaftH = height - plinthH - capH;

  // Square plinth + torus base moldings
  parts.push({
    geo: new THREE.BoxGeometry(baseRadius * 2.55, plinthH, baseRadius * 2.55),
    matrix: makeMat4(0, plinthH * 0.5, 0),
  });
  parts.push({
    geo: new THREE.CylinderGeometry(baseRadius * 1.14, baseRadius * 1.24, plinthH * 0.55, 16),
    matrix: makeMat4(0, plinthH + plinthH * 0.27, 0),
  });
  const baseTorus = new THREE.TorusGeometry(baseRadius * 1.06, baseRadius * 0.12, 8, 18);
  baseTorus.rotateX(Math.PI * 0.5);
  parts.push({
    geo: baseTorus,
    matrix: makeMat4(0, plinthH * 1.48, 0),
  });

  // Fluted shaft with classical entasis taper (16 flutes around circumference)
  const radialSegs = 32;
  const heightSegs = 8;
  const shaftGeo = new THREE.CylinderGeometry(baseRadius * 0.86, baseRadius * 1.0, shaftH, radialSegs, heightSegs, false);
  const pos = shaftGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    const r = Math.hypot(px, pz);
    if (r > 1e-4) {
      const ang = Math.atan2(pz, px);
      const hNorm = (py + shaftH * 0.5) / shaftH;
      const entasis = 1.0 + Math.sin(hNorm * Math.PI) * 0.032;
      const fluteFade = smoothstep(0.03, 0.12, hNorm) * (1 - smoothstep(0.88, 0.97, hNorm));
      const fluteGroove = 1.0 - Math.max(0, Math.cos(ang * 16)) * 0.048 * fluteFade;
      const scale = entasis * fluteGroove;
      pos.setX(i, px * scale);
      pos.setZ(i, pz * scale);
    }
  }
  shaftGeo.computeVertexNormals();
  parts.push({
    geo: shaftGeo,
    matrix: makeMat4(0, plinthH + shaftH * 0.5, 0),
  });

  // Necking ring + Corinthian flared bell capital + square abacus crown
  const neckTorus = new THREE.TorusGeometry(baseRadius * 0.88, baseRadius * 0.08, 8, 18);
  neckTorus.rotateX(Math.PI * 0.5);
  parts.push({
    geo: neckTorus,
    matrix: makeMat4(0, plinthH + shaftH, 0),
  });
  parts.push({
    geo: new THREE.CylinderGeometry(baseRadius * 1.28, baseRadius * 0.86, capH * 0.68, 16),
    matrix: makeMat4(0, plinthH + shaftH + capH * 0.34, 0),
  });
  parts.push({
    geo: new THREE.BoxGeometry(baseRadius * 2.62, capH * 0.34, baseRadius * 2.62),
    matrix: makeMat4(0, height - capH * 0.17, 0),
  });

  return mergeInfraBufferGeometries(parts);
}

// Sculpted Astronomical Observatory Hemisphere Dome with Shuttered Sky-Slit Slot
function createObservatoryDomeGeometry(radius = 6.2, slitWidth = 1.55) {
  const parts = [];
  // Main hemisphere shell
  const hemi = new THREE.SphereGeometry(radius, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.52);
  parts.push({ geo: hemi, matrix: makeMat4(0, 0, 0) });

  // Raised meridian shutter track ribs framing the telescope viewing slot
  const archSegs = 14;
  for (const side of [-1, 1]) {
    const ribX = side * (slitWidth * 0.5 + 0.16);
    const localR = Math.sqrt(Math.max(0.5, radius * radius - ribX * ribX));
    for (let s = 0; s < archSegs; s++) {
      const a0 = (s / archSegs) * (Math.PI * 0.68) - Math.PI * 0.12;
      const a1 = ((s + 1) / archSegs) * (Math.PI * 0.68) - Math.PI * 0.12;
      const am = (a0 + a1) * 0.5;
      const segLen = localR * (a1 - a0) + 0.08;
      const cy = Math.cos(am) * (localR + 0.12);
      const cz = Math.sin(am) * (localR + 0.12);
      parts.push({
        geo: new THREE.BoxGeometry(0.24, 0.28, segLen),
        matrix: makeMat4(ribX, cy, cz, am, 0, 0),
      });
    }
  }

  // Base cornice drum ring
  const baseRing = new THREE.TorusGeometry(radius + 0.18, 0.24, 10, 28);
  baseRing.rotateX(Math.PI * 0.5);
  parts.push({ geo: baseRing, matrix: makeMat4(0, 0.08, 0) });

  return mergeInfraBufferGeometries(parts);
}

// Lofted Multi-Station 62m Luxury Linh Chu Thượng Cổ Naval Hull Geometry (local Z = -31m bow to +31m stern)
function createSuperyachtHullGeometry(length = 62.0, maxBeam = 12.4, hullDepth = 4.6) {
  // Stations along u in [0..1] from raked clipper bow (z = -length/2) to wide beach-club transom (z = +length/2)
  const zStations = 26;
  const profileSteps = 12; // Cross-section from keel center -> bilge -> flared topside -> gunwale -> deck center

  const rings = [];
  for (let zi = 0; zi <= zStations; zi++) {
    const u = zi / zStations;
    const z = lerp(-length * 0.5, length * 0.5, u);

    // Beam envelope: knife-sharp flared bow -> full beam midship -> gently tapered transom
    let beamFrac;
    if (u < 0.34) {
      beamFrac = Math.pow(u / 0.34, 0.68);
    } else if (u < 0.78) {
      beamFrac = 1.0;
    } else {
      beamFrac = lerp(1.0, 0.86, smoothstep(0.78, 1.0, u));
    }
    const halfB = Math.max(0.12, maxBeam * 0.5 * beamFrac);

    // Sheerline height: proud raised bow (y = 4.9m) sweeping down to sleek main deck (y = 3.2m) & swim transom (y = 1.15m)
    let sheerY;
    if (u < 0.30) {
      sheerY = lerp(5.05, 4.75, u / 0.30);
    } else if (u < 0.44) {
      sheerY = lerp(4.75, 3.22, smoothstep(0.30, 0.44, u));
    } else if (u < 0.88) {
      sheerY = 3.22;
    } else {
      sheerY = lerp(3.22, 1.18, smoothstep(0.88, 1.0, u));
    }

    // Keel & raked bow stem profile
    const keelY = u < 0.14
      ? lerp(2.2, -1.55, smoothstep(0.0, 0.14, u))
      : lerp(-1.55, -0.95, smoothstep(0.7, 1.0, u));

    const ring = [];
    // Port (-X) gunwale -> port chine -> keel -> starboard chine -> starboard (+X) gunwale
    for (let si = 0; si <= profileSteps; si++) {
      const s = (si / profileSteps) * 2 - 1; // -1 .. +1
      const absS = Math.abs(s);
      const flare = u < 0.32 ? 1.0 + Math.pow(absS, 2.4) * 0.16 * (1 - u / 0.32) : 1.0;
      const x = Math.sign(s) * Math.pow(absS, 0.74) * halfB * flare;
      const y = lerp(keelY, sheerY, Math.pow(absS, 1.45));
      ring.push([x, y, z]);
    }
    rings.push(ring);
  }

  const cols = profileSteps + 1;
  const totalVerts = (zStations + 1) * cols;
  const positions = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const indices = [];

  for (let zi = 0; zi <= zStations; zi++) {
    for (let ci = 0; ci < cols; ci++) {
      const idx = zi * cols + ci;
      const p = rings[zi][ci];
      positions[idx * 3] = p[0];
      positions[idx * 3 + 1] = p[1];
      positions[idx * 3 + 2] = p[2];
      uvs[idx * 2] = ci / (cols - 1);
      uvs[idx * 2 + 1] = zi / zStations;
    }
  }

  for (let zi = 0; zi < zStations; zi++) {
    for (let ci = 0; ci < cols - 1; ci++) {
      const a = zi * cols + ci;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  // Close stern transom cap
  const sternBase = zStations * cols;
  const midIdx = sternBase + Math.floor(cols / 2);
  for (let ci = 0; ci < cols - 1; ci++) {
    if (ci === Math.floor(cols / 2)) continue;
    indices.push(midIdx, sternBase + ci + 1, sternBase + ci);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Precision Toothed Steel Vault Gear Wheel Geometry (for Linh Thạch Bảo Khố Vault Door!)
function createToothedGearGeometry(outerR = 0.72, innerR = 0.22, thickness = 0.10, teeth = 18) {
  const parts = [];
  const disk = new THREE.CylinderGeometry(outerR * 0.88, outerR * 0.88, thickness, 24);
  disk.rotateX(Math.PI * 0.5);
  parts.push({ geo: disk, matrix: makeMat4(0, 0, 0) });

  const hub = new THREE.CylinderGeometry(innerR, innerR, thickness * 1.45, 16);
  hub.rotateX(Math.PI * 0.5);
  parts.push({ geo: hub, matrix: makeMat4(0, 0, 0) });

  const toothW = (2 * Math.PI * outerR * 0.88) / (teeth * 2.1);
  const toothH = outerR * 0.22;
  const toothGeo = new THREE.BoxGeometry(toothW, toothH, thickness * 0.92);
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const rMid = outerR * 0.90;
    parts.push({
      geo: toothGeo,
      matrix: makeMat4(Math.cos(a) * rMid, Math.sin(a) * rMid, 0, 0, 0, a - Math.PI * 0.5),
    });
  }

  // 4 machined spoke cutouts / crossbars
  const spokeGeo = new THREE.BoxGeometry(outerR * 1.65, outerR * 0.14, thickness * 1.18);
  parts.push({ geo: spokeGeo, matrix: makeMat4(0, 0, 0, 0, 0, 0) });
  parts.push({ geo: spokeGeo, matrix: makeMat4(0, 0, 0, 0, 0, Math.PI * 0.5) });

  return mergeInfraBufferGeometries(parts);
}

// Map a rectangular PlaneGeometry cleanly onto a specific row [0..totalRows-1] of our Signage Atlas!
function createAtlasSignPlaneGeometry(width, height, rowIndex, totalRows = 8, doubleSided = false) {
  const geo = new THREE.PlaneGeometry(width, height);
  const uv = geo.attributes.uv;
  const vTop = 1 - rowIndex / totalRows;
  const vBot = 1 - (rowIndex + 1) / totalRows;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    uv.setXY(i, u, v > 0.5 ? vTop - 0.004 : vBot + 0.004);
  }
  uv.needsUpdate = true;

  if (!doubleSided) return geo;

  const backGeo = geo.clone();
  backGeo.rotateY(Math.PI);
  return mergeInfraBufferGeometries([
    { geo, matrix: makeMat4(0, 0, 0.02) },
    { geo: backGeo, matrix: makeMat4(0, 0, -0.02) },
  ]);
}

// Sculpted 14m Offshore Racing Sailboat (Lofted Monohull + Bulb Keel + Mast + Billowed Mainsail & Jib!)
function createRacingSailboatGeometry(pal = {}) {
  const cHull = pal.yachtWhite || new THREE.Color(0xf8fafc);
  const cTeak = pal.teakWarm || new THREE.Color(0x9a5b2d);
  const cNavy = pal.yachtNavy || new THREE.Color(0x0f172a);
  const cCabin = pal.stuccoWhite || new THREE.Color(0xf5f5f4);
  const cSteel = pal.steelDark || new THREE.Color(0x334155);
  const cRed = pal.goldenRed || new THREE.Color(0xc83226);
  const cChrome = pal.chrome || new THREE.Color(0xe2e8f0);
  const cGalv = pal.steelGalv || new THREE.Color(0x94a3b8);
  const cJib = pal.travertine || new THREE.Color(0xede6d6);

  const parts = [];
  const hullLen = 13.8;
  const halfBeam = 1.95;
  const hullCols = 14;
  const hullRows = 6;
  const pos = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= hullCols; i++) {
    const u = i / hullCols;
    const z = lerp(-hullLen * 0.5, hullLen * 0.5, u);
    const beamFactor = u < 0.55
      ? Math.pow(Math.sin((u / 0.55) * Math.PI * 0.5), 0.72)
      : lerp(1.0, 0.62, (u - 0.55) / 0.45);
    const sheerY = lerp(1.38, 0.92, u) + Math.pow(1 - u, 2.2) * 0.28;
    const keelY = lerp(-0.25, -0.78, Math.sin(u * Math.PI));

    for (let j = 0; j <= hullRows; j++) {
      const v = (j / hullRows) * 2 - 1;
      const absV = Math.abs(v);
      const x = Math.sign(v) * Math.pow(absV, 0.78) * halfBeam * beamFactor;
      const y = lerp(keelY, sheerY, Math.pow(absV, 1.35));
      pos.push(x, y, z);
      uvs.push(u * 2.0, (v + 1) * 0.5);
    }
  }
  const stride = hullRows + 1;
  for (let i = 0; i < hullCols; i++) {
    for (let j = 0; j < hullRows; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, d, b, b, d, c);
    }
  }
  const hullGeo = new THREE.BufferGeometry();
  hullGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  hullGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  hullGeo.setIndex(indices);
  hullGeo.computeVertexNormals();
  parts.push({ geo: hullGeo, matrix: makeMat4(0, 0, 0), color: cHull });

  // Teak deck cap, navy waterline stripe, hydrodynamic fin keel + lead torpedo bulb & twin helm wheels
  const deckGeo = new THREE.BoxGeometry(halfBeam * 1.48, 0.12, hullLen * 0.78);
  parts.push({ geo: deckGeo, matrix: makeMat4(0, 0.98, 0.45), color: cTeak });
  const stripeGeo = new THREE.BoxGeometry(halfBeam * 1.66, 0.18, hullLen * 0.72);
  parts.push({ geo: stripeGeo, matrix: makeMat4(0, 0.42, 0.35), color: cNavy });
  const cabinGeo = new THREE.BoxGeometry(1.95, 0.58, 3.8);
  parts.push({ geo: cabinGeo, matrix: makeMat4(0, 1.28, -0.35), color: cCabin });
  const finGeo = new THREE.BoxGeometry(0.16, 2.1, 1.25);
  parts.push({ geo: finGeo, matrix: makeMat4(0, -1.45, 0.2), color: cSteel });
  const bulbGeo = new THREE.CylinderGeometry(0.24, 0.18, 2.1, 10);
  bulbGeo.rotateX(Math.PI * 0.5);
  parts.push({ geo: bulbGeo, matrix: makeMat4(0, -2.42, 0.25), color: cRed });

  // 18.2m Tapered Aluminum Mast + Horizontal Boom + Spreaders
  const mastGeo = new THREE.CylinderGeometry(0.07, 0.14, 18.2, 10);
  parts.push({ geo: mastGeo, matrix: makeMat4(0, 10.0, -1.15), color: cChrome });
  const boomGeo = new THREE.CylinderGeometry(0.06, 0.08, 6.8, 8);
  boomGeo.rotateX(Math.PI * 0.5);
  parts.push({ geo: boomGeo, matrix: makeMat4(0.18, 2.25, 2.25, 0, 0.05, 0), color: cChrome });
  const spreaderGeo = new THREE.BoxGeometry(2.8, 0.06, 0.08);
  parts.push({ geo: spreaderGeo, matrix: makeMat4(0, 8.5, -1.15), color: cGalv });
  parts.push({ geo: spreaderGeo, matrix: makeMat4(0, 13.4, -1.15, 0, 0, 0, 0.72, 1, 1), color: cGalv });

  // Helper to build a double-sided billowed triangular Dacron sail mesh
  function buildBillowedSail(zLuff, zFootEnd, yTack, yHead, camber = 0.55) {
    const sPos = [];
    const sUv = [];
    const sIdx = [];
    const segU = 7;
    const segV = 9;
    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      const y = lerp(yTack, yHead, v);
      const chordSpan = (1 - v * 0.92);
      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const z = lerp(zLuff, lerp(zLuff, zFootEnd, chordSpan), u);
        const belly = Math.sin(u * Math.PI) * Math.sin((1 - v * 0.65) * Math.PI * 0.85) * camber * chordSpan;
        sPos.push(belly, y, z);
        sUv.push(u, v);
      }
    }
    const st = segU + 1;
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * st + iu;
        const b = a + 1;
        const c = (iv + 1) * st + (iu + 1);
        const d = (iv + 1) * st + iu;
        sIdx.push(a, b, c, a, c, d);
        sIdx.push(a, c, b, a, d, c);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(sUv, 2));
    g.setIndex(sIdx);
    g.computeVertexNormals();
    return g;
  }

  // Towering Billowed Mainsail (-1.05 -> +5.55m) + Forward Genoa Headsail Jib (-6.55 -> -1.35m)
  const mainSailGeo = buildBillowedSail(-1.05, 5.55, 2.35, 18.6, 0.68);
  const jibSailGeo = buildBillowedSail(-6.55, -1.35, 1.55, 15.8, 0.52);
  parts.push({ geo: mainSailGeo, matrix: makeMat4(0, 0, 0), color: cHull });
  parts.push({ geo: jibSailGeo, matrix: makeMat4(0, 0, 0), color: cJib });

  // High-visibility Regatta Racing Banner Stripe across Mainsail Mid-Belly
  const accentBandGeo = new THREE.BoxGeometry(0.75, 0.55, 4.2);
  parts.push({ geo: accentBandGeo, matrix: makeMat4(0.32, 7.2, 1.15, 0, -0.06, 0), color: cRed });

  return mergeInfraBufferGeometries(parts);
}

// ============================================================================
// 5. Procedural PBR Civil-Engineering Textures, Normal Maps & Signage Atlas
// ============================================================================

function makeInfraCanvasTexture(w, h, drawFn, isSRGB = true) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  drawFn(g, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (isSRGB) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function createSobelNormalTextureFromHeight(w, h, heightPainter, strength = 2.2) {
  if (typeof document === 'undefined') return null;
  const hc = document.createElement('canvas');
  hc.width = w;
  hc.height = h;
  const hg = hc.getContext('2d');
  heightPainter(hg, w, h);
  const src = hg.getImageData(0, 0, w, h).data;

  const nc = document.createElement('canvas');
  nc.width = w;
  nc.height = h;
  const ng = nc.getContext('2d');
  const dstImg = ng.createImageData(w, h);
  const dst = dstImg.data;

  const lumAt = (x, y) => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = lumAt(x - 1, y - 1);
      const t = lumAt(x, y - 1);
      const tr = lumAt(x + 1, y - 1);
      const l = lumAt(x - 1, y);
      const r = lumAt(x + 1, y);
      const bl = lumAt(x - 1, y + 1);
      const b = lumAt(x, y + 1);
      const br = lumAt(x + 1, y + 1);

      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1.0;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;

      const idx = (y * w + x) * 4;
      dst[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }

  ng.putImageData(dstImg, 0, 0);
  const tex = new THREE.CanvasTexture(nc);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function createInfraTextureSuite(engineTextures) {
  const rng = createInfraRNG(881234);

  // 1) 4-Lane Divided Elevated Freeway Asphalt Texture (with shoulders, rumble strips, dashed lane lines & double-yellow center)
  const freewayAsphalt = makeInfraCanvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#242830';
    g.fillRect(0, 0, w, h);

    // Aggregate asphalt grain & subtle oil-track wear bands in the 4 wheel lanes
    const laneCenters = [0.16, 0.37, 0.63, 0.84];
    for (const lc of laneCenters) {
      const grad = g.createLinearGradient(w * (lc - 0.08), 0, w * (lc + 0.08), 0);
      grad.addColorStop(0, 'rgba(18,20,25,0)');
      grad.addColorStop(0.32, 'rgba(12,14,18,0.34)');
      grad.addColorStop(0.5, 'rgba(26,29,35,0.08)');
      grad.addColorStop(0.68, 'rgba(12,14,18,0.34)');
      grad.addColorStop(1, 'rgba(18,20,25,0)');
      g.fillStyle = grad;
      g.fillRect(w * (lc - 0.09), 0, w * 0.18, h);
    }

    for (let i = 0; i < 4200; i++) {
      const v = 28 + Math.floor(rng() * 28);
      g.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      g.fillRect(Math.floor(rng() * w), Math.floor(rng() * h), 2, 2);
    }

    // Outer white fog lines + rumble strip notches
    g.fillStyle = '#e6ebf2';
    g.fillRect(w * 0.045, 0, 5, h);
    g.fillRect(w * 0.955 - 5, 0, 5, h);

    g.fillStyle = '#3b414d';
    for (let y = 0; y < h; y += 16) {
      g.fillRect(w * 0.015, y, w * 0.022, 7);
      g.fillRect(w * 0.963, y, w * 0.022, 7);
    }

    // Double yellow median lines flanking center concrete barrier
    g.fillStyle = '#eab308';
    g.fillRect(w * 0.478, 0, 4, h);
    g.fillRect(w * 0.522 - 4, 0, 4, h);

    // Dashed white 4-lane highway dividers
    g.fillStyle = '#f1f5f9';
    for (let y = 18; y < h; y += 64) {
      g.fillRect(w * 0.265 - 3, y, 5, 32);
      g.fillRect(w * 0.735 - 3, y, 5, 32);
    }

    // Transverse concrete bridge deck expansion joint seam
    g.fillStyle = '#17191f';
    g.fillRect(0, h - 5, w, 5);
    g.fillStyle = '#47505e';
    g.fillRect(0, h - 7, w, 2);
  });

  // 2) 2-Lane Ramp / Bridge / Mountain Switchback Asphalt
  const twoLaneRoad = makeInfraCanvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#272b34';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      const v = 30 + Math.floor(rng() * 26);
      g.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
      g.fillRect(Math.floor(rng() * w), Math.floor(rng() * h), 2, 2);
    }
    g.fillStyle = '#e5e9f0';
    g.fillRect(w * 0.06, 0, 4, h);
    g.fillRect(w * 0.94 - 4, 0, 4, h);
    g.fillStyle = '#eab308';
    g.fillRect(w * 0.486, 0, 3, h);
    g.fillRect(w * 0.514 - 3, 0, 3, h);
  });

  // Asphalt / Concrete Normal Map (reuse engine roadNormal if available, else generate Sobel normal!)
  const existingRoadNormal = engineTextures?.roadNormal?.isTexture
    ? engineTextures.roadNormal
    : engineTextures?.roadStandard?.normalMap || null;

  const asphaltNormal = existingRoadNormal || createSobelNormalTextureFromHeight(128, 128, (g, w, h) => {
    g.fillStyle = '#808080';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
      const v = 90 + Math.floor(rng() * 75);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(Math.floor(rng() * w), Math.floor(rng() * h), 2, 2);
    }
  }, 1.8);

  // 3) Luxury Checkerboard Carrara & Nero Marquina Gold-Veined Marble (for Linh Thạch Bảo Khố!)
  const bankMarble = makeInfraCanvasTexture(512, 512, (g, w, h) => {
    const tiles = 4;
    const ts = w / tiles;
    for (let ty = 0; ty < tiles; ty++) {
      for (let tx = 0; tx < tiles; tx++) {
        const isDark = (tx + ty) % 2 === 1;
        const x0 = tx * ts;
        const y0 = ty * ts;
        g.fillStyle = isDark ? '#181b22' : '#eef0f4';
        g.fillRect(x0, y0, ts, ts);

        // Organic diagonal marble veining
        g.save();
        g.beginPath();
        g.rect(x0, y0, ts, ts);
        g.clip();
        for (let v = 0; v < 5; v++) {
          g.strokeStyle = isDark
            ? (v === 0 ? 'rgba(212,175,55,0.42)' : 'rgba(255,255,255,0.12)')
            : 'rgba(130,140,156,0.25)';
          g.lineWidth = v === 0 ? 2.2 : 1.3;
          g.beginPath();
          let vx = x0 - 10 + rng() * 30;
          let vy = y0 + rng() * ts;
          g.moveTo(vx, vy);
          for (let seg = 0; seg < 5; seg++) {
            vx += ts * 0.24;
            vy += (rng() - 0.45) * 26;
            g.lineTo(vx, vy);
          }
          g.stroke();
        }
        g.restore();

        // Subtle brass inlay grout border
        g.strokeStyle = 'rgba(196,162,72,0.55)';
        g.lineWidth = 2;
        g.strokeRect(x0 + 1, y0 + 1, ts - 2, ts - 2);
      }
    }
  });
  if (bankMarble) bankMarble.repeat.set(6, 5);

  // 4) Marine Caulked Burmese Teak Planking (for Bồng Lai Tiên Đảo Marina Pontoons & 62m Linh Chu Thượng Cổ Decks!)
  const yachtTeak = makeInfraCanvasTexture(256, 256, (g, w, h) => {
    const planks = 8;
    const pw = w / planks;
    for (let i = 0; i < planks; i++) {
      const shade = 148 + ((i * 19) % 26);
      g.fillStyle = `rgb(${shade},${Math.round(shade * 0.68)},${Math.round(shade * 0.40)})`;
      g.fillRect(i * pw, 0, pw, h);
      // Black marine Sikaflex caulking seam
      g.fillStyle = '#1e1915';
      g.fillRect(i * pw, 0, 2.5, h);
      // Staggered butt joint
      const buttY = ((i * 83) % (h - 24)) + 12;
      g.fillRect(i * pw, buttY, pw, 2);
      // Subtle wood grain streaks
      g.fillStyle = 'rgba(65,38,18,0.16)';
      for (let k = 0; k < 12; k++) {
        g.fillRect(i * pw + 4 + ((k * 7) % (pw - 6)), (k * 23) % h, 1.5, 28);
      }
    }
  });
  if (yachtTeak) yachtTeak.repeat.set(4, 4);

  // 5) Architectural Ashlar Limestone / Precast Concrete Formwork Texture
  const concreteFormwork = makeInfraCanvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#cfd4dc';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) {
      const v = 192 + Math.floor(rng() * 34);
      g.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
      g.fillRect(Math.floor(rng() * w), Math.floor(rng() * h), 2, 2);
    }
    g.strokeStyle = 'rgba(110,118,130,0.38)';
    g.lineWidth = 2;
    for (let y = 0; y < h; y += 64) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
      const offset = (y / 64) % 2 === 0 ? 0 : 64;
      for (let x = offset; x < w; x += 128) {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x, y + 64);
        g.stroke();
      }
    }
  });

  // 6) 8-Row High-Contrast Signage, Highway Gantry & Hazard Chevron Atlas (1 Single Draw Call!)
  const signRows = [
    {
      bg: '#0b5d3b', border: '#f8fafc', badge: 'INTERSTATE LS-1',
      title: 'ĐẠI LỘ VEN BIỂN • SÂN BAY • CASINO',
      sub: '↓ LÀN TRÁI: VINEWOOD     ↓ GIỮA: CASINO     ↑ LỐI RA: CẦU ĐỎ',
      fg: '#ffffff', acc: '#fde047', style: 'gantry',
    },
    {
      bg: '#0b5d3b', border: '#f8fafc', badge: 'EXIT 1A • 200M',
      title: 'ĐẠI LỘ VESPUCCI • CẦU ĐỎ HẢI ĐĂNG',
      sub: '↗ GIẢM TỐC ĐỘ KHI VÀO ĐƯỜNG DẪN XUỐNG PHỐ BIỂN',
      fg: '#ffffff', acc: '#fde047', style: 'gantry',
    },
    {
      bg: '#0a4f33', border: '#f8fafc', badge: 'DOWNTOWN EXPRESS',
      title: 'DIAMOND CASINO & RESORT • THÁP FIB',
      sub: '↓ ĐI THẲNG: ĐẠI LỘ POWER ST     ↗ RẼ ĐÔNG: BỜ BIỂN NAM',
      fg: '#ffffff', acc: '#67e8f9', style: 'gantry',
    },
    {
      bg: '#0b5d3b', border: '#f8fafc', badge: 'NORTH SCENIC ROUTE',
      title: 'ĐỒI VINEWOOD • ĐÀI THIÊN VĂN • NGÂN HÀNG',
      sub: '↖ LỐI RA BẮC: NGÂN HÀNG PACIFIC STANDARD & ĐÈO NÚI 28M',
      fg: '#ffffff', acc: '#fde047', style: 'gantry',
    },
    {
      bg: '#0c241b', border: '#eab308', badge: 'FOUNDED 1904 • FEDERAL VAULT',
      title: 'NGÂN HÀNG TRUNG ƯƠNG PACIFIC STANDARD',
      sub: 'PACIFIC STANDARD PUBLIC DEPOSIT BANK • TRỤ SỞ CHÍNH',
      fg: '#fef3c7', acc: '#facc15', style: 'bank',
    },
    {
      bg: '#0c1e38', border: '#38bdf8', badge: 'DEL PERRO HARBOR CLUB',
      title: 'BẾN DU THUYỀN HẠNG SANG DEL PERRO',
      sub: 'SIÊU DU THUYỀN M/Y GALAXY • BẾN CANO CAO TỐC & JET SKI',
      fg: '#f0f9ff', acc: '#fbbf24', style: 'marina',
    },
    {
      bg: '#1c1917', border: '#d6a856', badge: 'GALILEO PARK • ALTITUDE 28M',
      title: 'ĐÀI THIÊN VĂN ĐỒI VINEWOOD',
      sub: 'ĐÀI QUAN SÁT TOÀN CẢNH THÀNH PHỐ & THÁI BÌNH DƯƠNG',
      fg: '#fafaf9', acc: '#f59e0b', style: 'observatory',
    },
    {
      bg: '#facc15', border: '#111827', badge: 'STUNT JUMP',
      title: '⚠ ĐIỂM BAY XE MẠO HIỂM • TĂNG TỐC > 65 KM/H ⚠',
      sub: 'LAO QUA DỐC ĐỂ KÍCH HOẠT CAMERA ĐIỆN ẢNH +$2,000!',
      fg: '#090d16', acc: '#dc2626', style: 'hazard',
    },
  ];

  const signAtlas = makeInfraCanvasTexture(1024, 1024, (g, w, h) => {
    const rowH = h / signRows.length; // 128px per row
    for (let i = 0; i < signRows.length; i++) {
      const r = signRows[i];
      const y0 = i * rowH;

      g.fillStyle = r.bg;
      g.fillRect(0, y0, w, rowH);

      if (r.style === 'hazard') {
        // Diagonal black-and-yellow construction hazard stripes along left/right edges!
        g.save();
        g.beginPath();
        g.rect(0, y0, w, rowH);
        g.clip();
        g.fillStyle = '#111827';
        for (let sx = -rowH; sx < 150; sx += 34) {
          g.beginPath();
          g.moveTo(sx, y0 + rowH);
          g.lineTo(sx + 18, y0 + rowH);
          g.lineTo(sx + 58, y0);
          g.lineTo(sx + 40, y0);
          g.closePath();
          g.fill();

          const rx = w - sx - 58;
          g.beginPath();
          g.moveTo(rx, y0 + rowH);
          g.lineTo(rx + 18, y0 + rowH);
          g.lineTo(rx + 58, y0);
          g.lineTo(rx + 40, y0);
          g.closePath();
          g.fill();
        }
        g.restore();
      }

      // Crisp retroreflective highway border
      g.strokeStyle = r.border;
      g.lineWidth = 6;
      g.strokeRect(8, y0 + 8, w - 16, rowH - 16);

      // Top highway shield / landmark badge pill
      g.fillStyle = r.acc;
      g.font = 'bold 18px Arial, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(r.badge, w * 0.5, y0 + 25);

      // Main Vietnamese Display Title
      g.fillStyle = r.fg;
      g.font = 'bold 37px "Arial Black", Impact, Arial, sans-serif';
      g.fillText(r.title, w * 0.5, y0 + 64);

      // Bottom directional lane arrows / subtitle
      g.fillStyle = r.style === 'hazard' ? '#b91c1c' : r.acc;
      g.font = 'bold 22px Arial, sans-serif';
      g.fillText(r.sub, w * 0.5, y0 + 101);
    }
  });

  return {
    freewayAsphalt,
    twoLaneRoad,
    asphaltNormal,
    bankMarble,
    yachtTeak,
    concreteFormwork,
    signAtlas,
  };
}

// ============================================================================
// 6. Main Module Factory: createWorldInfra(ctx)
// ============================================================================

export function createWorldInfra(ctx = {}) {
  let activeCtx = ctx;
  let initialized = false;
  let worldChained = false;
  let vehiclesHooked = false;
  let cameraHooked = false;

  const infraRoot = new THREE.Group();
  infraRoot.name = 'GTAWorldInfraRoot';

  const bankInteriorGroup = new THREE.Group();
  bankInteriorGroup.name = 'PacificStandardBankInterior';
  bankInteriorGroup.visible = false;

  // Dynamic hero scene nodes (kept minimal for strict < 18 draw calls!)
  let lighthouseRotorGroup = null;
  let yachtRadarGroup = null;
  let yachtHotTubRipples = null;
  let bankExteriorCoronaGroup = null;
  let bankExitCoronaGroup = null;
  let vaultDoorPivot = null;
  let vaultSpokeWheelGroup = null;
  const vaultBoltMeshes = [];
  let vaultGearA = null;
  let vaultGearB = null;
  let securityLaserGroup = null;
  const securityLaserBeams = [];
  let stuntBeaconInst = null;
  const stuntBeaconSeeds = [];
  let regattaSailboatInst = null;
  const regattaFleet = [];
  const bankGoldCartGroups = [];
  const bankCashPalletGroups = [];

  // Precomputed spline spines
  const freewayNodes = [];
  const southRampNodes = [];
  const northRampNodes = [];
  const obsRoadNodes = buildObservatoryRoadNodes();
  const redBridgeNodes = buildRedBridgeNodes();

  // Fast segment bounding boxes for O(1) heightfield rejection
  function computePolylineBounds(nodes, pad = 12) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const p = nodes[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }
    return { minX: minX - pad, maxX: maxX + pad, minZ: minZ - pad, maxZ: maxZ + pad };
  }

  const freewayBounds = computePolylineBounds(freewayNodes, FREEWAY_HALF_W + 4);
  const southRampBounds = computePolylineBounds(southRampNodes, RAMP_HALF_W + 4);
  const northRampBounds = computePolylineBounds(northRampNodes, RAMP_HALF_W + 4);
  const obsRoadBounds = computePolylineBounds(obsRoadNodes, 9.0);

  // Precompute Ngự Phong Phi Độ runtime state & oriented basis vectors
  const completedStuntIds = new Set();
  const stuntJumps = STUNT_JUMP_SPECS.map((spec) => {
    const fwdX = Math.sin(spec.yaw);
    const fwdZ = Math.cos(spec.yaw);
    const rightX = Math.cos(spec.yaw);
    const rightZ = -Math.sin(spec.yaw);
    const launchAngle = Math.atan2(spec.height, spec.length);
    return {
      ...spec,
      fwdX,
      fwdZ,
      rightX,
      rightZ,
      halfL: spec.length * 0.5,
      halfW: spec.width * 0.5,
      lipX: spec.x + fwdX * (spec.length * 0.5),
      lipY: spec.baseY + spec.height,
      lipZ: spec.z + fwdZ * (spec.length * 0.5),
      launchAngle,
      completed: false,
      attempts: 0,
      bestDistance: 0,
      bestHeight: 0,
      bestFlips: 0,
    };
  });

  // Restore persisted stunt jump completions from localStorage
  function loadPersistedStunts() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STUNT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.completedIds)) {
        for (const id of parsed.completedIds) {
          const numId = Number(id);
          const sj = stuntJumps.find((s) => s.id === numId);
          if (sj) {
            sj.completed = true;
            completedStuntIds.add(numId);
          }
        }
      }
      if (parsed && parsed.records && typeof parsed.records === 'object') {
        for (const sj of stuntJumps) {
          const rec = parsed.records[sj.id];
          if (rec) {
            sj.bestDistance = Number(rec.bestDistance) || 0;
            sj.bestHeight = Number(rec.bestHeight) || 0;
            sj.bestFlips = Number(rec.bestFlips) || 0;
          }
        }
      }
    } catch (_) {}
  }

  function savePersistedStunts() {
    if (typeof localStorage === 'undefined') return;
    try {
      const records = {};
      for (const sj of stuntJumps) {
        if (sj.bestDistance > 0 || sj.completed) {
          records[sj.id] = {
            bestDistance: Math.round(sj.bestDistance * 10) / 10,
            bestHeight: Math.round(sj.bestHeight * 10) / 10,
            bestFlips: sj.bestFlips,
          };
        }
      }
      localStorage.setItem(
        STUNT_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          completedIds: Array.from(completedStuntIds),
          records,
        })
      );
    } catch (_) {}
  }
  loadPersistedStunts();

  // ==========================================================================
  // 6A. Spatial-Hashed Infrastructure AABB System (Outdoor + Bank Interior)
  // ==========================================================================
  const INFRA_CELL = 24;
  const infraAABBs = [];
  const bankInteriorAABBs = [];
  const infraCells = new Map();
  let infraQueryStamp = 1;
  const infraQueryOut = [];
  let vaultClosedBlockerAABB = null;

  function infraCellKey(cx, cz) {
    return `${cx},${cz}`;
  }

  function registerInfraAABB(minX, maxX, minZ, maxZ, maxY, minY = 0, tag = 'infra_solid', isInterior = false) {
    if (maxX <= minX || maxZ <= minZ) return null;
    const box = {
      minX,
      maxX,
      minZ,
      maxZ,
      maxY,
      minY,
      tag,
      isInterior,
      enabled: true,
      _infraStamp: 0,
      _stamp: 0,
    };
    if (isInterior) {
      bankInteriorAABBs.push(box);
    } else {
      infraAABBs.push(box);
      if (Array.isArray(activeCtx?.world?.aabbs)) {
        activeCtx.world.aabbs.push(box);
      }
    }

    const c0x = Math.floor(minX / INFRA_CELL);
    const c1x = Math.floor(maxX / INFRA_CELL);
    const c0z = Math.floor(minZ / INFRA_CELL);
    const c1z = Math.floor(maxZ / INFRA_CELL);
    for (let cx = c0x; cx <= c1x; cx++) {
      for (let cz = c0z; cz <= c1z; cz++) {
        const k = infraCellKey(cx, cz);
        let arr = infraCells.get(k);
        if (!arr) {
          arr = [];
          infraCells.set(k, arr);
        }
        arr.push(box);
      }
    }
    return box;
  }

  function queryInfraAABBs(minX, maxX, minZ, maxZ) {
    infraQueryOut.length = 0;
    infraQueryStamp = (infraQueryStamp + 1) | 0;
    if (infraQueryStamp <= 0) {
      infraQueryStamp = 1;
      for (let i = 0; i < infraAABBs.length; i++) infraAABBs[i]._infraStamp = 0;
      for (let i = 0; i < bankInteriorAABBs.length; i++) bankInteriorAABBs[i]._infraStamp = 0;
    }

    const c0x = Math.floor(minX / INFRA_CELL);
    const c1x = Math.floor(maxX / INFRA_CELL);
    const c0z = Math.floor(minZ / INFRA_CELL);
    const c1z = Math.floor(maxZ / INFRA_CELL);

    for (let cx = c0x; cx <= c1x; cx++) {
      for (let cz = c0z; cz <= c1z; cz++) {
        const bucket = infraCells.get(infraCellKey(cx, cz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const b = bucket[i];
          if (!b.enabled || b._infraStamp === infraQueryStamp) continue;
          b._infraStamp = infraQueryStamp;
          if (b.maxX >= minX && b.minX <= maxX && b.maxZ >= minZ && b.minZ <= maxZ) {
            infraQueryOut.push(b);
          }
        }
      }
    }
    return infraQueryOut;
  }

  // ==========================================================================
  // 6B. Exact Analytical Heightfield Engine: getExtraGroundHeight(x, z, refY)
  // ==========================================================================

  // Track player pre-step coordinates when updatePlayerOnFoot queries getGroundHeight(p.x, p.z)
  // so resolveCircleAABB can seamlessly un-clamp Bank (2100,2100) and West Marina/Yacht/Island (x < -226)!
  const playerPreStep = { x: 26, y: 0.22, z: 28, valid: false };

  // Infer reference altitude when callers (vehicles.js / characters.js / gameplay.js) invoke getGroundHeight(x, z) with 2 args
  function inferEntityRefY(x, z, explicitRefY) {
    if (typeof explicitRefY === 'number' && Number.isFinite(explicitRefY)) {
      return explicitRefY;
    }
    const p = activeCtx?.player;
    if (p && Number.isFinite(p.x) && Number.isFinite(p.z) && Number.isFinite(p.y)) {
      const pCar = p.inCar && typeof p.inCar === 'object' ? p.inCar : null;
      if (pCar && Number.isFinite(pCar.x) && Number.isFinite(pCar.y)) {
        if (Math.abs(x - pCar.x) <= 5.2 && Math.abs(z - pCar.z) <= 5.2) {
          return pCar.y;
        }
      } else if (Math.abs(x - p.x) <= 3.6 && Math.abs(z - p.z) <= 3.6) {
        return p.y;
      }
    }

    const vList = activeCtx?.vehicles?.list;
    if (Array.isArray(vList)) {
      let bestY = undefined;
      for (let i = 0; i < vList.length; i++) {
        const v = vList[i];
        if (!v || !Number.isFinite(v.x) || !Number.isFinite(v.y)) continue;
        // Kinematic un-carjacked expressConvoy cars are stepped directly on FREEWAY_DECK_Y by world_infra,
        // so skip them here unless queried at their exact center to prevent ground cars underneath from snapping up
        if (v.isExpressConvoy && !v.isPlayerDriving && (Math.abs(x - v.x) > 0.35 || Math.abs(z - v.z) > 0.35)) {
          continue;
        }
        if (Math.abs(x - v.x) <= 4.6 && Math.abs(z - v.z) <= 4.6) {
          if (bestY === undefined || v.y > bestY) {
            bestY = v.y;
          }
        }
      }
      if (bestY !== undefined) return bestY;
    }
    return undefined;
  }

  function sampleRibbonElevation(x, z, nodes, bounds, halfWidth) {
    if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) {
      return null;
    }
    const maxDistSq = (halfWidth + 0.35) * (halfWidth + 0.35);
    let bestDistSq = maxDistSq;
    let bestY = null;
    let bestOverRoad = false;

    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i];
      const b = nodes[i + 1];
      const segMinX = (a.x < b.x ? a.x : b.x) - halfWidth - 0.5;
      const segMaxX = (a.x > b.x ? a.x : b.x) + halfWidth + 0.5;
      if (x < segMinX || x > segMaxX) continue;
      const segMinZ = (a.z < b.z ? a.z : b.z) - halfWidth - 0.5;
      const segMaxZ = (a.z > b.z ? a.z : b.z) + halfWidth + 0.5;
      if (z < segMinZ || z > segMaxZ) continue;

      const proj = projectPointOnSegment2D(x, z, a.x, a.z, b.x, b.z);
      if (proj.distSq <= bestDistSq && Math.abs(proj.signedLat) <= halfWidth) {
        bestDistSq = proj.distSq;
        const baseY = lerp(a.y, b.y, proj.t);
        const bank = lerp(a.bank || 0, b.bank || 0, proj.t);
        bestY = baseY + proj.signedLat * Math.sin(bank);
        bestOverRoad = Boolean(a.overGroundRoad || b.overGroundRoad);
      }
    }

    if (bestY === null) return null;
    return { y: bestY, overGroundRoad: bestOverRoad };
  }

  // Evaluate Stunt Ramp surface height if (x, z) lies on one of the 12 ramps
  function sampleStuntRampHeight(x, z, resolvedRefY) {
    for (let i = 0; i < stuntJumps.length; i++) {
      const sj = stuntJumps[i];
      const dx = x - sj.x;
      const dz = z - sj.z;
      if (Math.abs(dx) > sj.halfL + sj.halfW + 1.5 || Math.abs(dz) > sj.halfL + sj.halfW + 1.5) {
        continue;
      }
      // For elevated ramps (baseY >= 10m), ensure ground-level entities underneath don't snap up
      if (sj.baseY >= 8.0 && resolvedRefY !== undefined && resolvedRefY < sj.baseY - 4.5) {
        continue;
      }
      const localZ = dx * sj.fwdX + dz * sj.fwdZ;
      const localX = dx * sj.rightX + dz * sj.rightZ;
      if (Math.abs(localX) <= sj.halfW && localZ >= -sj.halfL - 0.8 && localZ <= sj.halfL + 0.35) {
        if (localZ <= -sj.halfL) {
          return sj.baseY;
        }
        const u = clamp((localZ + sj.halfL) / sj.length, 0, 1);
        // Smooth concave-to-linear transition at toe (first 18%) so cars never snag bumper!
        const profile = u < 0.18
          ? Math.pow(u / 0.18, 1.35) * 0.18
          : u;
        return sj.baseY + sj.height * profile;
      }
    }
    return null;
  }

  function isOnWestInfraWalkable(x, z, y = 4.0) {
    // Red Cable-Stayed Bridge & Lighthouse Island Peninsula
    if (x >= -312 && x <= -125 && z >= 166 && z <= 234) return true;
    // Bồng Lai Tiên Đảo Luxury Marina & Moored 62m Linh Chu Thượng Cổ
    if (x >= -310 && x <= -188 && z >= 72 && z <= 152 && y >= -0.6) return true;
    return false;
  }

  function getExtraGroundHeight(x, z, refY) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;

    // 1) Walk-In Linh Thạch Bảo Khố Interior at (2100, 0, 2100) (36m x 30m)
    if (x >= 2078 && x <= 2122 && z >= 2082 && z <= 2118) {
      // Raised marble teller counter floor behind cages
      if (z >= 2096.2 && z <= 2099.6 && (x <= 2096.6 || x >= 2103.4)) {
        return 0.18;
      }
      // Reinforced steel vault floor
      if (z <= 2091.8 && x >= 2090.5 && x <= 2109.5) {
        return 0.04;
      }
      return 0.02;
    }

    const resolvedRefY = inferEntityRefY(x, z, refY);

    // 2) Check 12 Monster Stunt Ramps first (so ramps placed ON the freeway/bridge/terrace add their incline!)
    const rampY = sampleStuntRampHeight(x, z, resolvedRefY);
    if (rampY !== null) {
      return rampY;
    }

    // 3) Elevated Outer Freeway Overpass (y = 12.5m) & Merge Gore Decks + Ramps #1 & #2
    //    3A. South-West Merge Gore Deck (connects top of South Ramp X in [-44, -20], Z in [214, 232] cleanly to Z=232 viaduct)
    if (x >= -44.0 && x <= -18.0 && z >= 214.0 && z <= 233.0) {
      if (resolvedRefY === undefined || resolvedRefY >= 6.0) {
        return FREEWAY_DECK_Y;
      }
    }

    //    3B. Main Elevated Freeway Spine (y = 12.5m)
    const fwHit = sampleRibbonElevation(x, z, freewayNodes, freewayBounds, FREEWAY_HALF_W);
    if (fwHit !== null) {
      // If directly above an active ground street (e.g. X = +200 Power Street or Z = -40),
      // only return 12.5m when the entity is on the upper level (y >= 6.2m); ground traffic stays at 0.02m!
      if (!fwHit.overGroundRoad) {
        if (resolvedRefY === undefined || resolvedRefY >= 4.5) {
          return fwHit.y;
        }
      } else if (resolvedRefY !== undefined && resolvedRefY >= 6.2) {
        return fwHit.y;
      }
    }

    //    3C. South-West On/Off-Ramp #1 (Z ~ +215, X: -112 -> -34, y: 0.03 -> 12.5m)
    const sRampHit = sampleRibbonElevation(x, z, southRampNodes, southRampBounds, RAMP_HALF_W);
    if (sRampHit !== null) {
      if (sRampHit.y < 3.5 || resolvedRefY === undefined || resolvedRefY >= sRampHit.y - 4.8) {
        return sRampHit.y;
      }
    }

    //    3D. North-East On/Off-Ramp #2 (Z ~ -215, X: 182 -> 120, y: 12.5 -> 0.03m)
    const nRampHit = sampleRibbonElevation(x, z, northRampNodes, northRampBounds, RAMP_HALF_W);
    if (nRampHit !== null) {
      if (nRampHit.y < 3.5 || resolvedRefY === undefined || resolvedRefY >= nRampHit.y - 4.8) {
        return nRampHit.y;
      }
    }

    // 4) Iconic Red Cable-Stayed Coastal Bridge (X in [-245.5, -124.0], Z in [191.5, 208.5])
    if (x >= -245.5 && x <= -124.0 && z >= 191.5 && z <= 208.5) {
      const bridgeY = x > -127.5 ? 0.04 : evalRedBridgeDeckY(x);
      // Allow boats in the deep channel (x in [-212, -162], y < 1.2m) to pass underneath the 7.85m bridge arch without dropping bridge walkers/cars!
      const inUnderChannel = x <= -162.0 && x >= -212.0 && resolvedRefY !== undefined && resolvedRefY < 1.2;
      if (!inUnderChannel) {
        // Raised pedestrian walkways along outer 1.6m edges
        const edgeSidewalk = Math.abs(z - 200.0) > 6.6 ? 0.14 : 0.0;
        return bridgeY + edgeSidewalk;
      }
    }

    // 5) Scenic Lighthouse Island & Helipad Peninsula centered around (-275, 4.0, +200)
    if (x >= -312.0 && x <= -241.0 && z >= 166.0 && z <= 234.0) {
      // Elliptical rocky coastal island plateau with flat 4.0m terrace & helipad
      const nx = (x - (-276.0)) / 33.0;
      const nz = (z - 200.0) / 31.0;
      const rad = Math.hypot(nx, nz);
      if (rad <= 0.84) {
        // Slight raised concrete pad at VIP Helipad (-275, 4.06, 185) and Lighthouse Plinth (-292, 4.35, 215)
        if (Math.hypot(x - (-275.0), z - 185.0) <= 9.0) return ISLAND_DECK_Y + 0.06;
        if (Math.hypot(x - (-292.0), z - 215.0) <= 6.2) return ISLAND_DECK_Y + 0.32;
        return ISLAND_DECK_Y;
      }
      if (rad <= 1.08) {
        const edgeT = smoothstep(1.08, 0.84, rad);
        return lerp(-1.8, ISLAND_DECK_Y, edgeT);
      }
    }

    // 6) Bồng Lai Tiên Đảo Luxury Yacht Marina (X in [-288, -188], Z in [74, 148]) & 62m Linh Chu Thượng Cổ (-295, 0, 115)
    if (x >= -304.0 && x <= -188.0 && z >= 74.0 && z <= 148.0) {
      // 6A. 62m Luxury Linh Chu Thượng Cổ "M/Y Galaxy Bồng Lai Tiên Đảo" (X in [-301.2, -288.8], Z in [84.0, 146.0])
      if (x >= -301.0 && x <= -289.0 && z >= 84.5 && z <= 146.0) {
        // Tapered bow footprint check (Z in [84.5, 102.0])
        let halfBeam = 5.8;
        if (z < 103.0) {
          const uBow = clamp((z - 84.5) / 18.5, 0, 1);
          halfBeam = 5.8 * Math.pow(uBow, 0.68);
        }
        if (Math.abs(x - YACHT_CENTER_X) <= halfBeam) {
          // Bow Helipad Deck (Z in [86.0, 102.5], y = 4.82m)
          if (z <= 102.5) {
            return 4.82;
          }
          // Exterior Stairs from Main Aft Deck (Z = 133.5, y = 3.22m) up to Upper Jacuzzi Sun Deck (Z = 128.5, y = 6.22m)
          if (x >= -292.6 && x <= -290.2 && z >= 128.5 && z <= 134.5) {
            const stairT = clamp((134.5 - z) / 6.0, 0, 1);
            if (resolvedRefY === undefined || resolvedRefY >= 2.6) {
              return lerp(3.22, 6.22, stairT);
            }
          }
          // Upper Bridge & Bubbling Hot-Tub Sun Deck (Z in [105.0, 129.0], X in [-299.4, -290.6], y = 6.22m)
          if (
            z >= 105.0 &&
            z <= 129.0 &&
            Math.abs(x - YACHT_CENTER_X) <= 4.35 &&
            (resolvedRefY === undefined || resolvedRefY >= 4.7)
          ) {
            return 6.22;
          }
          // Stern Teak Swim Platform & Twin Stairs (Z in [139.5, 146.0], y = 1.18m -> 3.22m)
          if (z >= 141.5) {
            return 1.18;
          }
          if (z >= 138.2) {
            return lerp(3.22, 1.18, clamp((z - 138.2) / 3.3, 0, 1));
          }
          // Main Lounge & Starboard/Port Walkaround Promenade Deck (y = 3.22m)
          return 3.22;
        }
      }

      // 6B. Aluminum Boarding Gangplank from Main Marina Pier (-278, 1.25, 108) -> Linh Chu Thượng Cổ Deck (-289.2, 3.22, 108)
      if (x >= -289.4 && x <= -277.6 && z >= 106.4 && z <= 109.6) {
        const gpT = clamp((-277.8 - x) / (289.2 - 277.8), 0, 1);
        return lerp(MARINA_DECK_Y, 3.22, gpT);
      }

      // 6C. Beach-to-Marina Access Ramp (X: -189 -> -207, Z in [104.0, 112.0])
      if (x >= -207.0 && x <= -189.0 && z >= 104.0 && z <= 112.0) {
        const rT = clamp((-189.0 - x) / 18.0, 0, 1);
        return lerp(0.05, MARINA_DECK_Y, smootherstep(0, 1, rT));
      }

      // 6D. Concrete Boat Launch Slipway into Water (X: -190 -> -214, Z in [131.5, 139.5])
      if (x >= -214.0 && x <= -190.0 && z >= 131.5 && z <= 139.5) {
        const sT = clamp((-190.0 - x) / 24.0, 0, 1);
        return lerp(0.06, -1.35, sT);
      }

      // 6E. North-South Marina Main Promenade Pier (X in [-213.2, -206.8], Z in [76.0, 144.0])
      if (x >= -213.2 && x <= -206.8 && z >= 76.0 && z <= 144.0) {
        return MARINA_DECK_Y;
      }

      // 6F. Linh Chu Thượng Cổ Spine Pier (Z in [104.5, 111.5], X in [-278.5, -206.8])
      //     Note: (-218, 0, 95) lies in Z = 95 (between Z = 85 and Z = 104.5), keeping (-218, 0, 95) 100% open water!
      if (x >= -278.5 && x <= -206.8 && z >= 104.5 && z <= 111.5) {
        return MARINA_DECK_Y;
      }

      // 6G. Finger Slip Pontoons at Z = 80..84, Z = 122..125.6, Z = 140..144 (X in [-238, -206.8])
      if (x >= -238.0 && x <= -206.8) {
        if (
          (z >= 79.5 && z <= 83.5) ||
          (z >= 122.0 && z <= 125.6) ||
          (z >= 140.0 && z <= 144.0)
        ) {
          return MARINA_DECK_Y;
        }
      }
    }

    // 7) Côn Lôn Tiên Sơn Mountain Observatory Terrace & Winding Overlook Road (X in [18, 118], Z in [-266, -206])
    if (x >= 18.0 && x <= 118.0 && z >= -266.0 && z <= -206.0) {
      // 7A. Galileo Domed White Observatory Panoramic Terrace & Forecourt (X in [28, 84], Z in [-256.5, -229.5])
      if (x >= 28.0 && x <= 84.0 && z >= -256.5 && z <= -229.5) {
        // Raised Neoclassical Observatory Entrance Steps & Rotunda Plinth (X in [46, 70], Z in [-256.5, -246.5])
        if (x >= 46.0 && x <= 70.0 && z <= -246.5) {
          const stepT = clamp((-246.5 - z) / 2.2, 0, 1);
          return OBSERVATORY_TERRACE_Y + stepT * 0.65;
        }
        return OBSERVATORY_TERRACE_Y;
      }

      // 7B. Winding Switchback Hill-Climb Road (Leg 1 + Hairpin Vista + Leg 2)
      const obsHit = sampleRibbonElevation(x, z, obsRoadNodes, obsRoadBounds, 5.8);
      if (obsHit !== null) {
        return obsHit.y;
      }

      // Hairpin Vista Overlook Apron around (106, 16.4, -221.8)
      const dHairpin = Math.hypot(x - 104.5, z - (-221.8));
      if (x >= 101.0 && dHairpin <= 11.8) {
        const ang = Math.atan2(z - (-221.8), x - 103.0);
        const uTurn = clamp((Math.PI * 0.5 - ang) / Math.PI, 0, 1);
        return lerp(14.6, 18.2, uTurn);
      }
    }

    // 8) Bồng Lai Tiên Đảo Coastal Sunset Boardwalk & Hexagonal Ocean Gazebo (X in [-213.5, -182.0], Z in [46.0, 76.5])
    if (x >= -213.5 && x <= -182.0 && z >= 46.0 && z <= 76.5) {
      // Beach ramp onto North end of boardwalk (X: -182 -> -196, Z in [47.0, 53.0])
      if (x >= -196.0 && z >= 47.0 && z <= 53.0) {
        const bT = clamp((-182.0 - x) / 14.0, 0, 1);
        return lerp(0.08, MARINA_DECK_Y, smootherstep(0, 1, bT));
      }
      // Boardwalk promenade spine (X in [-213.2, -206.8], Z in [50.0, 76.5]) + Gazebo platform at (-202, 62)
      if (x >= -213.2 && x <= -206.8 && z >= 48.0 && z <= 76.5) {
        return MARINA_DECK_Y;
      }
      if (x >= -207.0 && x <= -195.5 && z >= 48.0 && z <= 53.2) {
        return MARINA_DECK_Y;
      }
      if (Math.hypot(x - (-201.5), z - 63.0) <= 6.2) {
        return MARINA_DECK_Y + 0.08;
      }
    }

    // 9) Southern Marina Stone Breakwater Jetty & Harbor Beacon Walk (X in [-264.0, -209.0], Z in [145.0, 150.5])
    if (x >= -264.0 && x <= -209.0 && z >= 145.0 && z <= 150.5) {
      return 1.65;
    }

    // 10) Downtown Elevated Glass Pedestrian Skybridge across Linh Đan Đỉnh Ave (X in [108.5, 131.5], Z in [-90.2, -85.8], y = 8.9m)
    if (x >= 108.5 && x <= 131.5 && z >= -98.5 && z <= -85.5) {
      // Elevated enclosed glass skybridge deck spanning X in [109.0, 131.0], Z in [-90.1, -85.9]
      if (
        z >= -90.1 &&
        z <= -85.9 &&
        resolvedRefY !== undefined &&
        resolvedRefY >= 5.2
      ) {
        return 8.90;
      }
      // West & East Sidewalk Access Stair Flights (Z: -98.2 -> -88.0 climbing y = 0.22m -> 8.90m, clear of X in [111.5, 128.5] road!)
      if ((x >= 108.8 && x <= 111.2) || (x >= 128.8 && x <= 131.2)) {
        if (z >= -98.2 && z <= -88.0 && (resolvedRefY === undefined || resolvedRefY >= 0.1)) {
          const stT = clamp((z - (-98.2)) / 10.2, 0, 1);
          if (resolvedRefY === undefined || resolvedRefY >= stT * 8.9 - 2.6) {
            return lerp(0.22, 8.90, stT);
          }
        }
      }
    }

    // 11) East Freeway Cantilevered Ocean Overlook & Highway Patrol Turnout Bay (X in [260.5, 271.5], Z in [140.0, 166.0], y = 12.5m)
    if (x >= 260.5 && x <= 271.5 && z >= 140.0 && z <= 166.0) {
      if (resolvedRefY === undefined || resolvedRefY >= 5.5) {
        return FREEWAY_DECK_Y;
      }
    }

    return null;
  }

  // ==========================================================================
  // 6C. Clean Non-Destructive Chaining into ctx.world
  // ==========================================================================

  function chainIntoWorld(world) {
    if (!world || worldChained) return;
    worldChained = true;

    // Expand world bounds so helicopters/UI know about Marina (-305), Lighthouse Island (-310), & East Freeway (+262)
    if (world.bounds) {
      world.bounds.minX = Math.min(world.bounds.minX ?? -320, -320);
      world.bounds.maxX = Math.max(world.bounds.maxX ?? 280, 280);
      world.bounds.minZ = Math.min(world.bounds.minZ ?? -280, -280);
      world.bounds.maxZ = Math.max(world.bounds.maxZ ?? 260, 260);
    }

    // Register new iconic landmarks into ctx.world.landmarks
    if (world.landmarks && typeof world.landmarks === 'object') {
      world.landmarks.pacificStandardBank = { ...BANK_EXT_POS };
      world.landmarks.bankInterior = {
        ...BANK_INT_ORIGIN,
        spawnX: 2100.0,
        spawnY: 0.05,
        spawnZ: 2111.5,
        exitX: 2100.0,
        exitY: 0.05,
        exitZ: 2113.5,
        vaultX: 2100.0,
        vaultZ: 2088.5,
      };
      world.landmarks.lighthouseIsland = { x: -275.0, y: ISLAND_DECK_Y, z: 200.0, helipadX: -275.0, helipadZ: 185.0 };
      world.landmarks.redBridge = { x: -186.0, y: 7.85, z: 200.0 };
      world.landmarks.delPerroMarina = { x: -215.0, y: MARINA_DECK_Y, z: 108.0, boatSlipX: -218.0, boatSlipZ: 95.0 };
      world.landmarks.superyacht = { x: YACHT_CENTER_X, y: 3.22, z: YACHT_CENTER_Z, helipadZ: 94.0, hotTubZ: 124.0 };
      world.landmarks.vinewoodObservatory = { x: 58.0, y: OBSERVATORY_TERRACE_Y, z: -240.0 };
    }

    // Push already-created outdoor infraAABBs into world.aabbs if not already present
    if (Array.isArray(world.aabbs)) {
      for (let i = 0; i < infraAABBs.length; i++) {
        if (!world.aabbs.includes(infraAABBs[i])) {
          world.aabbs.push(infraAABBs[i]);
        }
      }
    }

    const baseGetGroundHeight = typeof world.getGroundHeight === 'function'
      ? world.getGroundHeight.bind(world)
      : () => 0.22;
    const baseGetZoneInfo = typeof world.getZoneInfo === 'function'
      ? world.getZoneInfo.bind(world)
      : null;
    const baseQueryAABBs = typeof world.queryAABBs === 'function'
      ? world.queryAABBs.bind(world)
      : null;
    const baseResolveCircleAABB = typeof world.resolveCircleAABB === 'function'
      ? world.resolveCircleAABB.bind(world)
      : null;
    const baseResolveCarAABB = typeof world.resolveCarAABB === 'function'
      ? world.resolveCarAABB.bind(world)
      : null;
    const baseRaycastWorld = typeof world.raycastWorld === 'function'
      ? world.raycastWorld.bind(world)
      : null;

    // 1. Chained getGroundHeight(x, z, refY)
    world.getGroundHeight = function chainedGetGroundHeight(x, z, refY) {
      const p = activeCtx?.player;
      if (p && !p.inCar && x === p.x && z === p.z) {
        playerPreStep.x = p.x;
        playerPreStep.y = p.y;
        playerPreStep.z = p.z;
        playerPreStep.valid = true;
      }

      const extraY = getExtraGroundHeight(x, z, refY);
      if (extraY !== null && Number.isFinite(extraY)) {
        return extraY;
      }
      return baseGetGroundHeight(x, z, refY);
    };

    // 2. Chained getZoneInfo(x, z)
    if (baseGetZoneInfo) {
      world.getZoneInfo = function chainedGetZoneInfo(x, z) {
        if (x >= 2070 && x <= 2130 && z >= 2075 && z <= 2125) {
          return {
            streetName: ' Đại Sảnh & Hầm Vàng Tối Mật',
            zoneName: 'Ngân Hàng Trung Ương Linh Thạch Bảo Khố',
          };
        }
        if (x >= -312 && x <= -241 && z >= 166 && z <= 234) {
          return {
            streetName: 'Mũi Hải Đăng & Sân Đỗ Trực Thăng',
            zoneName: 'Đảo Hải Đăng Thái Bình Dương',
          };
        }
        if (x >= -245.5 && x <= -127.5 && z >= 190 && z <= 210) {
          return {
            streetName: 'Cầu Dây Văng Đỏ Vượt Biển',
            zoneName: 'Eo Biển Nam Bích Thủy Kênh',
          };
        }
        if (x >= -304 && x <= -285 && z >= 82 && z <= 148) {
          return {
            streetName: 'Siêu Du Thuyền M/Y Galaxy (62m)',
            zoneName: 'Bến Du Thuyền Hạng Sang Bồng Lai Tiên Đảo',
          };
        }
        if (x >= -285 && x <= -195 && z >= 74 && z <= 148) {
          return {
            streetName: 'Cầu Tàu Du Thuyền & Bến Cano',
            zoneName: 'Bến Du Thuyền Hạng Sang Bồng Lai Tiên Đảo',
          };
        }
        if (x >= 24 && x <= 116 && z >= -260 && z <= -212) {
          return {
            streetName: z < -230 ? 'Quảng Trường Đài Thiên Văn Galileo' : 'Đèo Ngoằn Ngoèo Đồi Côn Lôn Tiên Sơn',
            zoneName: 'Đài Thiên Văn Đồi Côn Lôn Tiên Sơn (28m)',
          };
        }
        const fwCheck = sampleRibbonElevation(x, z, freewayNodes, freewayBounds, FREEWAY_HALF_W + 2);
        if (fwCheck && (activeCtx?.player?.y ?? 0) >= 6.5) {
          return {
            streetName: 'Cao Tốc Trên Cao Liên Bang LS-1',
            zoneName: 'Đường Vành Đai Trên Cao (12.5m)',
          };
        }
        return baseGetZoneInfo(x, z);
      };
    }

    // 3. Chained queryAABBs
    world.queryAABBs = function chainedQueryAABBs(minX, maxX, minZ, maxZ) {
      const baseList = baseQueryAABBs ? baseQueryAABBs(minX, maxX, minZ, maxZ) : [];
      const extraList = queryInfraAABBs(minX, maxX, minZ, maxZ);
      if (extraList.length === 0) return baseList;
      const merged = baseList.slice();
      for (let i = 0; i < extraList.length; i++) {
        merged.push(extraList[i]);
      }
      return merged;
    };

    // 4. Chained resolveCircleAABB (handles player & NPC collisions + restores Bank (2100,2100) & Marina/Island x < -226!)
    world.resolveCircleAABB = function chainedResolveCircleAABB(ent, radius = 0.42) {
      if (!ent || !Number.isFinite(ent.x) || !Number.isFinite(ent.z)) {
        return { hit: false, normalX: 0, normalZ: 0 };
      }

      const isPlayer = ent === activeCtx?.player;
      const stepDt = clamp(activeCtx?.dt || 0.016, 0.001, 0.1);

      // Seamless Bank (2100, 2100) & West Coastal Marina/Linh Chu Thượng Cổ/Island un-clamping for characters.js!
      if (isPlayer && playerPreStep.valid) {
        const preX = playerPreStep.x;
        const preZ = playerPreStep.z;
        playerPreStep.valid = false;

        // Case 1: Inside Linh Thạch Bảo Khố (2100, 0, 2100) where characters.js clamped >500 to [791, 809]
        if ((ent.inBank || (preX >= 2070 && preX <= 2130 && preZ >= 2075 && preZ <= 2125)) && ent.x <= 815) {
          ent.x = clamp(preX + (ent.vx || 0) * stepDt, 2082.6, 2117.4);
          ent.z = clamp(preZ + (ent.vz || 0) * stepDt, 2085.6, 2114.4);
        } else if (preX <= -220 && ent.x === -226 && isOnWestInfraWalkable(preX, preZ, ent.y)) {
          // Case 2: Walking West past x = -226 on Red Bridge, Lighthouse Island, Marina Pontoons, or 62m Linh Chu Thượng Cổ!
          ent.x = clamp(preX + (ent.vx || 0) * stepDt, -310.0, 276.0);
        }
      }

      const inBankRoom = ent.x >= 2070 && ent.x <= 2130 && ent.z >= 2075 && ent.z <= 2125;
      let res = { hit: false, normalX: 0, normalZ: 0 };

      if (!inBankRoom && baseResolveCircleAABB) {
        res = baseResolveCircleAABB(ent, radius) || res;
      } else if (inBankRoom) {
        ent.x = clamp(ent.x, 2082.55, 2117.45);
        ent.z = clamp(ent.z, 2085.55, 2114.45);
      }

      const r = Math.max(0.15, radius);
      const entY = Number.isFinite(ent.y) ? ent.y : 0;
      const nearby = queryInfraAABBs(ent.x - r - 0.5, ent.x + r + 0.5, ent.z - r - 0.5, ent.z + r + 0.5);

      let hit = Boolean(res.hit);
      let lastNX = res.normalX || 0;
      let lastNZ = res.normalZ || 0;

      for (let i = 0; i < nearby.length; i++) {
        const b = nearby[i];
        if (entY >= b.maxY - 0.06) continue;
        if (b.minY > -90 && entY + 1.82 < b.minY) continue;

        const cx = clamp(ent.x, b.minX, b.maxX);
        const cz = clamp(ent.z, b.minZ, b.maxZ);
        const dx = ent.x - cx;
        const dz = ent.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;

        hit = true;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          const nx = dx / d;
          const nz = dz / d;
          const push = r - d;
          ent.x += nx * push;
          ent.z += nz * push;
          lastNX = nx;
          lastNZ = nz;
        } else {
          const dL = ent.x - b.minX;
          const dR = b.maxX - ent.x;
          const dT = ent.z - b.minZ;
          const dB = b.maxZ - ent.z;
          const m = Math.min(dL, dR, dT, dB);
          if (m === dL) { ent.x = b.minX - r; lastNX = -1; lastNZ = 0; }
          else if (m === dR) { ent.x = b.maxX + r; lastNX = 1; lastNZ = 0; }
          else if (m === dT) { ent.z = b.minZ - r; lastNX = 0; lastNZ = -1; }
          else { ent.z = b.maxZ + r; lastNX = 0; lastNZ = 1; }
        }
      }

      return { hit, normalX: lastNX, normalZ: lastNZ };
    };

    // 5. Chained resolveCarAABB (guardrails on y = 12.5m Freeway, Red Bridge trusses, Piers, Observatory walls!)
    world.resolveCarAABB = function chainedResolveCarAABB(car) {
      const baseRes = baseResolveCarAABB
        ? baseResolveCarAABB(car)
        : { hit: false, normalX: 0, normalZ: 0, impactSpeed: 0 };

      if (!car || !Number.isFinite(car.x) || !Number.isFinite(car.z)) {
        return baseRes;
      }

      const carY = Number.isFinite(car.y) ? car.y : 0;
      const yaw = Number.isFinite(car.yaw) ? car.yaw : (car.rotation || 0);
      const hw = car.halfW || (car.width ? car.width * 0.5 : 0.98);
      const hl = car.halfL || (car.length ? car.length * 0.5 : 2.25);
      const boundR = Math.hypot(hw, hl) + 0.5;

      const ux = Math.cos(yaw);
      const uz = -Math.sin(yaw);
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);

      const nearby = queryInfraAABBs(car.x - boundR, car.x + boundR, car.z - boundR, car.z + boundR);
      if (nearby.length === 0) return baseRes;

      const axesX = [1, 0, ux, fx];
      const axesZ = [0, 1, uz, fz];

      let hit = Boolean(baseRes.hit);
      let outNX = baseRes.normalX || 0;
      let outNZ = baseRes.normalZ || 0;

      for (let i = 0; i < nearby.length; i++) {
        const b = nearby[i];
        if (carY >= b.maxY - 0.16) continue;
        if (b.minY > -90 && carY + 2.15 < b.minY) continue;

        const bcx = (b.minX + b.maxX) * 0.5;
        const bcz = (b.minZ + b.maxZ) * 0.5;
        const bhw = (b.maxX - b.minX) * 0.5;
        const bhl = (b.maxZ - b.minZ) * 0.5;
        const dx = car.x - bcx;
        const dz = car.z - bcz;

        let minOverlap = Infinity;
        let bestAX = 0;
        let bestAZ = 0;
        let separated = false;

        for (let a = 0; a < 4; a++) {
          const ax = axesX[a];
          const az = axesZ[a];
          const projCar = hw * Math.abs(ux * ax + uz * az) + hl * Math.abs(fx * ax + fz * az);
          const projBox = bhw * Math.abs(ax) + bhl * Math.abs(az);
          const distProj = dx * ax + dz * az;
          const overlap = projCar + projBox - Math.abs(distProj);
          if (overlap <= 0) {
            separated = true;
            break;
          }
          if (overlap < minOverlap) {
            minOverlap = overlap;
            const sign = distProj >= 0 ? 1 : -1;
            bestAX = ax * sign;
            bestAZ = az * sign;
          }
        }

        if (!separated && minOverlap < Infinity) {
          car.x += bestAX * minOverlap;
          car.z += bestAZ * minOverlap;
          hit = true;
          outNX = bestAX;
          outNZ = bestAZ;
        }
      }

      let impactSpeed = baseRes.impactSpeed || 0;
      if (hit && !baseRes.hit) {
        const nLen = Math.hypot(outNX, outNZ) || 1;
        outNX /= nLen;
        outNZ /= nLen;
        if (Number.isFinite(car.vx) && Number.isFinite(car.vz)) {
          const vn = car.vx * outNX + car.vz * outNZ;
          impactSpeed = vn < 0 ? -vn : Math.hypot(car.vx, car.vz) * 0.35;
        } else {
          impactSpeed = Math.abs(car.speed || 0);
        }
      }

      return { hit, normalX: outNX, normalZ: outNZ, impactSpeed };
    };

    // 6. Chained raycastWorld & checkLOS (for camera occlusion & bullet wall impacts inside Bank & around Piers!)
    if (baseRaycastWorld) {
      world.raycastWorld = function chainedRaycastWorld(x1, y1, z1, x2, y2, z2) {
        const baseHit = baseRaycastWorld(x1, y1, z1, x2, y2, z2);
        const candidates = queryInfraAABBs(
          Math.min(x1, x2),
          Math.max(x1, x2),
          Math.min(z1, z2),
          Math.max(z1, z2)
        );
        if (candidates.length === 0) return baseHit;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;
        let closestT = baseHit.hit ? baseHit.t : 1.0;
        let hitBox = null;
        let hitNX = 0, hitNY = 0, hitNZ = 0;

        for (let i = 0; i < candidates.length; i++) {
          const b = candidates[i];
          // Skip low guardrails (< 1.6m tall) for camera LOS rays so freeway chase cam never clips!
          if (b.tag === 'guardrail') continue;
          const bMinY = b.minY ?? 0;
          const bMaxY = b.maxY;

          let tmin = 0.0005;
          let tmax = closestT;
          let nx = 0, ny = 0, nz = 0;

          if (Math.abs(dx) < 1e-8) {
            if (x1 < b.minX || x1 > b.maxX) continue;
          } else {
            const inv = 1 / dx;
            let t1 = (b.minX - x1) * inv, t2 = (b.maxX - x1) * inv, s = -1;
            if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; s = 1; }
            if (t1 > tmin) { tmin = t1; nx = s; ny = 0; nz = 0; }
            if (t2 < tmax) tmax = t2;
            if (tmin > tmax) continue;
          }

          if (Math.abs(dy) < 1e-8) {
            if (y1 < bMinY || y1 > bMaxY) continue;
          } else {
            const inv = 1 / dy;
            let t1 = (bMinY - y1) * inv, t2 = (bMaxY - y1) * inv, s = -1;
            if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; s = 1; }
            if (t1 > tmin) { tmin = t1; nx = 0; ny = s; nz = 0; }
            if (t2 < tmax) tmax = t2;
            if (tmin > tmax) continue;
          }

          if (Math.abs(dz) < 1e-8) {
            if (z1 < b.minZ || z1 > b.maxZ) continue;
          } else {
            const inv = 1 / dz;
            let t1 = (b.minZ - z1) * inv, t2 = (b.maxZ - z1) * inv, s = -1;
            if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; s = 1; }
            if (t1 > tmin) { tmin = t1; nx = 0; ny = 0; nz = s; }
            if (t2 < tmax) tmax = t2;
            if (tmin > tmax) continue;
          }

          if (tmin < closestT && tmin >= 0.0005) {
            closestT = tmin;
            hitBox = b;
            hitNX = nx; hitNY = ny; hitNZ = nz;
          }
        }

        if (hitBox) {
          return {
            hit: true,
            t: closestT,
            x: x1 + dx * closestT,
            y: y1 + dy * closestT,
            z: z1 + dz * closestT,
            normalX: hitNX,
            normalY: hitNY,
            normalZ: hitNZ,
            aabb: hitBox,
          };
        }
        return baseHit;
      };

      world.checkLOS = function chainedCheckLOS(x1, y1, z1, x2, y2, z2) {
        return !world.raycastWorld(x1, y1, z1, x2, y2, z2).hit;
      };
    }
  }

  // ==========================================================================
  // 7. Architectural & Civil-Engineering Scene Construction (init)
  // ==========================================================================

  function buildAllWorldInfraGeometry(scene) {
    const texSuite = createInfraTextureSuite(activeCtx?.engine?.textures);
    const envMap = scene?.environment || activeCtx?.engine?.envMap || null;

    // 8 Coalesced Static Materials -> Guarantees < 14 Total Added Draw Calls Outdoors!
    const mats = {
      freewayAsphalt: new THREE.MeshStandardMaterial({
        map: texSuite.freewayAsphalt,
        normalMap: texSuite.asphaltNormal,
        roughness: 0.72,
        metalness: 0.08,
        envMap,
      }),
      twoLaneRoad: new THREE.MeshStandardMaterial({
        map: texSuite.twoLaneRoad,
        normalMap: texSuite.asphaltNormal,
        roughness: 0.74,
        metalness: 0.08,
        envMap,
      }),
      concrete: new THREE.MeshStandardMaterial({
        map: texSuite.concreteFormwork,
        vertexColors: true,
        roughness: 0.78,
        metalness: 0.08,
      }),
      metal: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.28,
        metalness: 0.82,
        envMap,
        envMapIntensity: 1.35,
      }),
      wood: new THREE.MeshStandardMaterial({
        map: texSuite.yachtTeak,
        vertexColors: true,
        roughness: 0.64,
        metalness: 0.06,
      }),
      marble: new THREE.MeshStandardMaterial({
        map: texSuite.bankMarble,
        vertexColors: true,
        roughness: 0.22,
        metalness: 0.12,
        envMap,
        envMapIntensity: 1.15,
      }),
      signAtlas: new THREE.MeshStandardMaterial({
        map: texSuite.signAtlas,
        emissive: new THREE.Color(0xffffff),
        emissiveMap: texSuite.signAtlas,
        emissiveIntensity: 0.42,
        roughness: 0.34,
        metalness: 0.15,
      }),
      emissive: new THREE.MeshBasicMaterial({
        vertexColors: true,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0x8ad4f5,
        metalness: 0.12,
        roughness: 0.06,
        transparent: true,
        opacity: 0.42,
        clearcoat: 1.0,
        side: THREE.DoubleSide,
        depthWrite: false,
        envMap,
        envMapIntensity: 1.5,
      }),
    };

    const batch = createStaticBatcher(infraRoot, 'WorldInfra');
    const bankBatch = createStaticBatcher(bankInteriorGroup, 'BankInterior');

    // Shared reusable unit primitives (transformed via Matrix4 during batching -> zero extra allocations!)
    const uBox = new THREE.BoxGeometry(1, 1, 1);
    const uCyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
    const uOctCyl = new THREE.CylinderGeometry(0.5, 0.56, 1, 8);
    const uCone = new THREE.ConeGeometry(0.5, 1, 12);
    const uSphere = new THREE.SphereGeometry(0.5, 14, 10);
    const uTorus = new THREE.TorusGeometry(0.5, 0.08, 8, 20);
    const uRock = new THREE.DodecahedronGeometry(0.65, 1);
    const classicalColGeo = createClassicalColumnGeometry(1.0, 0.075); // Scalable unit-height classical column!

    // Architectural & Civil-Engineering Color Palette
    const COL = {
      concreteLight: 0xd8dde4,
      concreteMed: 0xb8c0cc,
      concreteDark: 0x7d8694,
      jerseyBarrier: 0xcbd1da,
      stuccoWhite: 0xf4f5f7,
      travertine: 0xe6dccb,
      ashlarStone: 0xafa89c,
      coastalRock: 0x595e66,
      darkRock: 0x3f434a,
      goldenRed: 0xc92a22,      // International Orange / Golden Gate Crimson!
      crimsonDark: 0x8f1d17,
      stayCable: 0xd0d8e2,
      steelDark: 0x242b35,
      steelGalv: 0x9aa5b4,
      chrome: 0xeef3f8,
      gold24k: 0xf5c542,
      brass: 0xd4a438,
      copperDome: 0x3b8c7a,
      yachtWhite: 0xf8fafc,
      yachtNavy: 0x102a4c,
      teakWarm: 0xc99a6b,
      mahogany: 0x5c2c18,
      hdpeFloat: 0x1b222c,
      emeraldDark: 0x0d3b2a,
      velvetRed: 0x991b1b,
      cashGreen: 0x4d8c57,
      amberGlow: 0xffd166,
      warmLamp: 0xfff3d1,
      beaconRed: 0xff2424,
      cyanGlow: 0x38f2ff,
      limeGlow: 0x4ade80,
      hazardYellow: 0xfacc15,
      safetyOrange: 0xf97316,
    };

    // ========================================================================
    // ZONE 1A: ELEVATED OUTER FREEWAY OVERPASS (y = 12.5m), RAMPS & GANTRIES
    // ========================================================================
    {
      // 1) 4-Lane Divided Freeway Asphalt Ribbon Surface
      const fwSurfaceGeo = createRibbonRoadSurfaceGeometry(freewayNodes, FREEWAY_HALF_W * 2 - 0.6, 18.0, 0.025);
      batch.add('freewayAsphalt', mats.freewayAsphalt, fwSurfaceGeo, 0, 0, 0, 0, 0, 0, 1, 1, 1, null, false, true);

      // 2) Pre-stressed Trapezoidal Concrete Box-Girder Deck Soffit & Cantilever Wings
      const hw = FREEWAY_HALF_W;
      const boxGirderProfile = [
        [-hw - 0.35, 0.01],
        [hw + 0.35, 0.01],
        [hw + 0.25, -0.34],
        [hw * 0.62, -0.52],
        [hw * 0.46, -1.68],
        [-hw * 0.46, -1.68],
        [-hw * 0.62, -0.52],
        [-hw - 0.25, -0.34],
      ];
      const fwGirderGeo = createSweptProfileGeometry(freewayNodes, boxGirderProfile, true);
      batch.add('concrete', mats.concrete, fwGirderGeo, 0, 0, 0, 0, 0, 0, 1, 1, 1, COL.concreteMed, true, true);

      // 3) Swept Left, Right & Center New Jersey Concrete Crash Barriers!
      //    Note: On South leg around South Ramp merge (X in [-44, -18], left/north side Z = 223.6),
      //    we split the barrier cleanly so South Ramp #1 merges seamlessly onto the Freeway without a wall!
      const barrierLeftProfile = [
        [-hw - 0.32, 0.0],
        [-hw + 0.26, 0.0],
        [-hw + 0.18, 0.36],
        [-hw + 0.08, 1.08],
        [-hw - 0.26, 1.08],
      ];
      const barrierRightProfile = [
        [hw - 0.26, 0.0],
        [hw + 0.32, 0.0],
        [hw + 0.26, 1.08],
        [hw - 0.08, 1.08],
        [hw - 0.18, 0.36],
      ];
      const medianBarrierProfile = [
        [-0.28, 0.0],
        [0.28, 0.0],
        [0.14, 0.86],
        [-0.14, 0.86],
      ];

      // Right (outer) barrier runs uninterrupted along the entire freeway!
      const rightBarrierGeo = createSweptProfileGeometry(freewayNodes, barrierRightProfile, true);
      batch.add('concrete', mats.concrete, rightBarrierGeo, 0, 0, 0, 0, 0, 0, 1, 1, 1, COL.jerseyBarrier, true, true);

      // Left (inner) barrier splits around South Ramp merge [-46, -16] on South Viaduct
      const leftPartA = freewayNodes.filter((n) => !(n.z > 228 && n.x >= -46 && n.x <= -16) && n.s < 85);
      const leftPartB = freewayNodes.filter((n) => !(n.z > 228 && n.x >= -46 && n.x <= -16) && n.s >= 85);
      if (leftPartA.length >= 2) {
        batch.add('concrete', mats.concrete, createSweptProfileGeometry(leftPartA, barrierLeftProfile, true), 0, 0, 0, 0, 0, 0, 1, 1, 1, COL.jerseyBarrier, true, true);
      }
      if (leftPartB.length >= 2) {
        batch.add('concrete', mats.concrete, createSweptProfileGeometry(leftPartB, barrierLeftProfile, true), 0, 0, 0, 0, 0, 0, 1, 1, 1, COL.jerseyBarrier, true, true);
      }

      // Center median divider (starts East of Stunt #8 & South Ramp merge so cars can cross lanes freely at ramps!)
      const medianPart = freewayNodes.filter((n) => n.s >= 120 && n.s <= freewayNodes[freewayNodes.length - 1].s - 35);
      if (medianPart.length >= 2) {
        batch.add('concrete', mats.concrete, createSweptProfileGeometry(medianPart, medianBarrierProfile, true), 0, 0, 0, 0, 0, 0, 1, 1, 1, COL.concreteLight, false, true);
      }

      // Register segmented elevated guardrail AABBs (minY = 12.35, maxY = 13.8) along straight freeway tangents
      // so speeding supercars bounce cleanly along highway barriers without falling off!
      // South Viaduct outer/south barrier (Z = 240.4):
      registerInfraAABB(-116, 240, 240.1, 241.0, 13.85, 12.3, 'guardrail');
      // South Viaduct inner/north barrier (Z = 223.6, leaving open gap X in [-46, -16] for South Ramp #1!):
      registerInfraAABB(-94, -46, 223.0, 223.9, 13.85, 12.3, 'guardrail');
      registerInfraAABB(-16, 226, 223.0, 223.9, 13.85, 12.3, 'guardrail');
      // East Viaduct outer/east & inner/west barriers (X = 261.4 & X = 244.6):
      registerInfraAABB(261.0, 261.9, -28, 220, 13.85, 12.3, 'guardrail');
      registerInfraAABB(244.1, 245.0, -18, 210, 13.85, 12.3, 'guardrail');
      // Upper-Deck Power St Viaduct barriers (X = 208.4 & X = 191.6, Z in [-196, -58]):
      registerInfraAABB(208.0, 208.9, -196, -58, 13.85, 12.3, 'guardrail');
      registerInfraAABB(191.1, 192.0, -192, -58, 13.85, 12.3, 'guardrail');

      // 4) South-West Merge Gore Deck Slab (X in [-45, -18], Z in [214, 232], y = 12.5m)
      batch.add('freewayAsphalt', mats.twoLaneRoad, uBox, -31.5, FREEWAY_DECK_Y - 0.04, 223.2, 0, 0, 0, 27.0, 0.12, 17.5, null, false, true);
      batch.add('concrete', mats.concrete, uBox, -31.5, FREEWAY_DECK_Y - 0.88, 223.2, 0, 0, 0, 27.4, 1.60, 17.8, COL.concreteMed, true, true);

      // 5) Smooth On/Off-Ramp #1 (South-West) & On/Off-Ramp #2 (North-East)
      for (const rampCfg of [
        { nodes: southRampNodes, solidUnder: true },
        { nodes: northRampNodes, solidUnder: true },
      ]) {
        const rNodes = rampCfg.nodes;
        const rw = RAMP_HALF_W;
        const rSurf = createRibbonRoadSurfaceGeometry(rNodes, rw * 2 - 0.4, 14.0, 0.025);
        batch.add('twoLaneRoad', mats.twoLaneRoad, rSurf, 0, 0, 0, 0, 0, 0, 1, 1, 1, null, false, true);

        const rDeckProf = [
          [-rw - 0.25, 0.0],
          [rw + 0.25, 0.0],
          [rw + 0.15, -0.95],
          [-rw - 0.15, -0.95],
        ];
        const rLeftWall = [
          [-rw - 0.25, 0.0],
          [-rw + 0.15, 0.0],
          [-rw + 0.10, 0.92],
          [-rw - 0.22, 0.92],
        ];
        const rRightWall = [
          [rw - 0.15, 0.0],
          [rw + 0.25, 0.0],
          [rw + 0.22, 0.92],
          [rw - 0.10, 0.92],
        ];
        batch.add('concrete', mats.concrete, createSweptProfileGeometry(rNodes, rDeckProf, true), 0, 0, 0, 0, 0, 0, 1, 1, 1, COL.concreteMed, true, true);
        batch.add('concrete', mats.concrete, createSweptProfileGeometry(rNodes, rLeftWall, true), 0, 0, 0, 0, 0, 0, 1, 1, 1, COL.jerseyBarrier, true, true);
        batch.add('concrete', mats.concrete, createSweptProfileGeometry(rNodes, rRightWall, true), 0, 0, 0, 0, 0, 0, 1, 1, 1, COL.jerseyBarrier, true, true);

        // Support columns under elevated half of each ramp
        for (let i = 4; i < rNodes.length - 3; i += 4) {
          const rn = rNodes[i];
          if (rn.y < 2.4) continue;
          const colH = rn.y - 0.85;
          batch.add('concrete', mats.concrete, uOctCyl, rn.x, colH * 0.5, rn.z, 0, rn.yaw, 0, 1.55, colH, 1.55, COL.concreteDark, true, true);
          batch.add('concrete', mats.concrete, uBox, rn.x, rn.y - 1.15, rn.z, 0, rn.yaw, 0, rw * 1.75, 0.72, 1.85, COL.concreteLight, true, true);
        }
      }

      // 6) Concrete Hammerhead T-Piers, Portal Straddle Bents (over X=+200!), Reflector Studs & Cobra-Head Highway Lights
      const registeredExtraLamps = [];

      for (let i = 2; i < freewayNodes.length - 2; i++) {
        const fn = freewayNodes[i];

        // Glowing amber/red highway barrier cat's-eye reflectors every ~16m
        if (i % 2 === 0) {
          const lx = fn.x - fn.rx * (hw - 0.05);
          const lz = fn.z - fn.rz * (hw - 0.05);
          const rx = fn.x + fn.rx * (hw - 0.05);
          const rz = fn.z + fn.rz * (hw - 0.05);
          batch.add('emissive', mats.emissive, uBox, lx, fn.y + 1.12, lz, 0, fn.yaw, 0, 0.14, 0.10, 0.28, COL.amberGlow, false, false);
          batch.add('emissive', mats.emissive, uBox, rx, fn.y + 1.12, rz, 0, fn.yaw, 0, 0.14, 0.10, 0.28, COL.amberGlow, false, false);
        }

        // High-mast twin highway luminaires every ~32m
        if (i % 4 === 1) {
          const px = fn.x + fn.rx * (hw + 0.12);
          const pz = fn.z + fn.rz * (hw + 0.12);
          batch.add('metal', mats.metal, uCyl, px, fn.y + 4.2, pz, 0, fn.yaw, 0, 0.22, 6.8, 0.22, COL.steelGalv, true, false);
          batch.add('metal', mats.metal, uBox, px - fn.rx * 1.45, fn.y + 7.55, pz - fn.rz * 1.45, 0, fn.yaw, 0.08, 3.1, 0.12, 0.16, COL.steelGalv, false, false);
          batch.add('emissive', mats.emissive, uBox, px - fn.rx * 2.75, fn.y + 7.44, pz - fn.rz * 2.75, 0, fn.yaw, 0, 0.68, 0.14, 0.38, COL.warmLamp, false, false);
          registeredExtraLamps.push({ x: px - fn.rx * 2.75, y: fn.y + 7.1, z: pz - fn.rz * 2.75 });
        }

        // Structural Concrete Piers every ~24m (3 nodes = 24m)
        if (i % 3 !== 0) continue;

        // Skip placing ground columns directly inside cross-street intersections!
        const nearCrossStreet =
          Math.abs(fn.z - 200) < 11 ||
          Math.abs(fn.z - 120) < 11 ||
          Math.abs(fn.z - 40) < 11 ||
          Math.abs(fn.z - (-40)) < 11 ||
          Math.abs(fn.z - (-120)) < 11 ||
          Math.abs(fn.z - (-200)) < 11;

        // Also keep Vạn Bảo Đổ Phường entrance (209.5, -110) & Heist side door (209.5, -92) & Thần Binh Các (209.5, 10) 100% clear!
        const nearCasinoEntrance =
          fn.x > 188 && fn.x < 215 &&
          (Math.abs(fn.z - (-110)) < 12 || Math.abs(fn.z - (-92)) < 8);

        if (nearCrossStreet || nearCasinoEntrance) continue;

        const capY = fn.y - 2.05;
        const colH = capY - 0.0;

        if (Math.abs(fn.x - 200.0) < 6.0 && fn.z < -48 && fn.z > -196) {
          // WIDE ARCHITECTURAL PORTAL STRADDLE BENT over X = +200 Avenue!
          // Columns sit cleanly on sidewalks at X = 190.6 and X = 209.4 so all 4 ground lanes of X = +200 flow 100% unobstructed!
          batch.add('concrete', mats.concrete, uBox, 200.0, capY, fn.z, 0, 0, 0, 20.4, 1.15, 1.85, COL.concreteLight, true, true);
          for (const sideX of [190.6, 209.4]) {
            batch.add('concrete', mats.concrete, uBox, sideX, colH * 0.5, fn.z, 0, 0, 0, 1.45, colH, 1.65, COL.concreteMed, true, true);
            batch.add('concrete', mats.concrete, uBox, sideX, 0.55, fn.z, 0, 0, 0, 1.95, 1.1, 2.15, COL.concreteDark, false, true);
            registerInfraAABB(sideX - 0.85, sideX + 0.85, fn.z - 0.95, fn.z + 0.95, capY, 0, 'freeway_portal_pier');
          }
        } else {
          // CLASSIC MONUMENTAL HAMMERHEAD CONCRETE T-PIER!
          // Flared crosshead beam + elastomeric steel bearing pads + octagonal column + ground pile cap!
          batch.add('concrete', mats.concrete, uBox, fn.x, capY + 0.18, fn.z, 0, fn.yaw, 0, hw * 1.82, 0.92, 2.25, COL.concreteLight, true, true);
          batch.add('concrete', mats.concrete, uBox, fn.x, capY - 0.42, fn.z, 0, fn.yaw, 0, hw * 1.18, 0.65, 2.05, COL.concreteMed, true, true);
          batch.add('metal', mats.metal, uBox, fn.x - fn.rx * 3.8, capY + 0.68, fn.z - fn.rz * 3.8, 0, fn.yaw, 0, 1.2, 0.18, 1.2, COL.steelDark, false, false);
          batch.add('metal', mats.metal, uBox, fn.x + fn.rx * 3.8, capY + 0.68, fn.z + fn.rz * 3.8, 0, fn.yaw, 0, 1.2, 0.18, 1.2, COL.steelDark, false, false);

          batch.add('concrete', mats.concrete, uOctCyl, fn.x, (capY - 0.65) * 0.5, fn.z, 0, fn.yaw, 0, 2.45, capY - 0.65, 2.45, COL.concreteMed, true, true);
          batch.add('concrete', mats.concrete, uBox, fn.x, 0.48, fn.z, 0, fn.yaw, 0, 3.6, 0.96, 3.6, COL.concreteDark, false, true);
          registerInfraAABB(fn.x - 1.35, fn.x + 1.35, fn.z - 1.35, fn.z + 1.35, capY, 0, 'freeway_tpier');
        }
      }

      // 7) 4 Full-Span Overhead Green Highway Gantry Sign Bridges!
      //    Row 0: "ĐẠI LỘ VEN BIỂN • SÂN BAY • CASINO"
      //    Row 1: "ĐẠI LỘ VESPUCCI • CẦU ĐỎ HẢI ĐĂNG"
      //    Row 2: "DIAMOND CASINO & RESORT • THÁP FIB"
      //    Row 3: "ĐỒI VINEWOOD • ĐÀI THIÊN VĂN • NGÂN HÀNG"
      function buildOverheadHighwayGantry(nodeIdx, signRowIdx) {
        const gn = freewayNodes[clamp(nodeIdx, 2, freewayNodes.length - 3)];
        const spanW = FREEWAY_HALF_W * 2 + 1.6;
        const postOffset = FREEWAY_HALF_W + 0.55;
        const gantryH = 6.6;
        const trussY = gn.y + gantryH;

        // Left & right galvanized tubular steel gantry upright columns
        for (const s of [-1, 1]) {
          const px = gn.x + gn.rx * (s * postOffset);
          const pz = gn.z + gn.rz * (s * postOffset);
          batch.add('metal', mats.metal, uCyl, px, gn.y + gantryH * 0.5, pz, 0, gn.yaw, 0, 0.36, gantryH + 0.6, 0.36, COL.steelGalv, true, false);
          batch.add('metal', mats.metal, uCyl, px - gn.tx * 0.75, gn.y + gantryH * 0.5, pz - gn.tz * 0.75, 0, gn.yaw, 0, 0.28, gantryH + 0.4, 0.28, COL.steelGalv, false, false);
          // Diagonal column bracing
          for (let hStep = 1.2; hStep < gantryH; hStep += 1.8) {
            batch.addStrut(
              'metal', mats.metal, uCyl,
              px, gn.y + hStep, pz,
              px - gn.tx * 0.75, gn.y + hStep + 1.4, pz - gn.tz * 0.75,
              0.10, 0.10, COL.steelGalv
            );
          }
        }

        // Upper & lower horizontal 3D box-truss chords spanning across all 4 lanes
        for (const dy of [-0.45, 0.45]) {
          for (const dzOff of [-0.75, 0.0]) {
            const cx = gn.x + gn.tx * dzOff;
            const cz = gn.z + gn.tz * dzOff;
            batch.add('metal', mats.metal, uBox, cx, trussY + dy, cz, 0, gn.yaw, 0, spanW, 0.14, 0.14, COL.steelGalv, true, false);
          }
        }

        // Warren diagonal truss struts across the gantry span
        const segs = 10;
        for (let k = 0; k < segs; k++) {
          const xA = -spanW * 0.48 + (k / segs) * (spanW * 0.96);
          const xB = -spanW * 0.48 + ((k + 1) / segs) * (spanW * 0.96);
          const p1x = gn.x + gn.rx * xA, p1z = gn.z + gn.rz * xA;
          const p2x = gn.x + gn.rx * xB, p2z = gn.z + gn.rz * xB;
          const yLow = trussY - 0.45;
          const yHigh = trussY + 0.45;
          if (k % 2 === 0) {
            batch.addStrut('metal', mats.metal, uCyl, p1x, yLow, p1z, p2x, yHigh, p2z, 0.09, 0.09, COL.steelGalv);
          } else {
            batch.addStrut('metal', mats.metal, uCyl, p1x, yHigh, p1z, p2x, yLow, p2z, 0.09, 0.09, COL.steelGalv);
          }
        }

        // Retroreflective Green Vietnamese Highway Signboard (Double-sided!) + Overhead Downlight Fixtures
        const signW = 13.4;
        const signH = 2.65;
        const signGeo = createAtlasSignPlaneGeometry(signW, signH, signRowIdx, 8, true);
        batch.add('signAtlas', mats.signAtlas, signGeo, gn.x + gn.tx * 0.18, trussY + 0.15, gn.z + gn.tz * 0.18, 0, gn.yaw, 0, 1, 1, 1, null, true, false);
        batch.add('metal', mats.metal, uBox, gn.x, trussY + 0.15, gn.z, 0, gn.yaw, 0, signW + 0.25, signH + 0.22, 0.18, COL.steelDark, true, false);

        // 4 upward-angled sign floodlights along bottom catwalk ledge
        batch.add('metal', mats.metal, uBox, gn.x + gn.tx * 0.65, trussY - 1.25, gn.z + gn.tz * 0.65, 0, gn.yaw, 0, signW * 0.92, 0.08, 0.65, COL.steelDark, false, false);
        for (const lxOff of [-4.5, -1.5, 1.5, 4.5]) {
          const fx = gn.x + gn.rx * lxOff + gn.tx * 0.88;
          const fz = gn.z + gn.rz * lxOff + gn.tz * 0.88;
          batch.add('emissive', mats.emissive, uBox, fx, trussY - 1.18, fz, 0, gn.yaw, 0, 0.52, 0.10, 0.26, COL.warmLamp, false, false);
        }
      }

      buildOverheadHighwayGantry(11, 1); // South-West near Exit 1A ("ĐẠI LỘ VESPUCCI • CẦU ĐỎ HẢI ĐĂNG")
      buildOverheadHighwayGantry(32, 0); // South Main ("ĐẠI LỘ VEN BIỂN • SÂN BAY • CASINO")
      buildOverheadHighwayGantry(68, 2); // East Viaduct ("DIAMOND CASINO & RESORT • THÁP FIB")
      buildOverheadHighwayGantry(116, 3); // Casino / North Viaduct ("ĐỒI VINEWOOD • ĐÀI THIÊN VĂN • NGÂN HÀNG")
    }

    // ========================================================================
    // ZONE 1B: ICONIC RED CABLE-STAYED COASTAL BRIDGE & LIGHTHOUSE ISLAND
    //          Bridge: X in [-245.5, -127.5], Z = +200
    //          Lighthouse Island & Helipad Peninsula: (-275, 4.0, +200)
    // ========================================================================
    {
      // 1) Parabolic Arched Bridge Roadway + Raised Dual Pedestrian Walkways
      const brRoadGeo = createRibbonRoadSurfaceGeometry(redBridgeNodes, 12.8, 15.0, 0.03);
      batch.add('twoLaneRoad', mats.twoLaneRoad, brRoadGeo, 0, 0, 0, 0, 0, 0, 1, 1, 1, null, false, true);

      const brW = BRIDGE_HALF_W;
      const bridgeDeckProfile = [
        [-brW, 0.16],
        [-6.5, 0.16],
        [-6.4, 0.01],
        [6.4, 0.01],
        [6.5, 0.16],
        [brW, 0.16],
        [brW, -0.45],
        [-brW, -0.45],
      ];
      batch.add('concrete', mats.concrete, createSweptProfileGeometry(redBridgeNodes, bridgeDeckProfile, true), 0, 0, 0, 0, 0, 0, 1, 1, 1, COL.concreteLight, true, true);

      // International-Red Steel Edge Stiffening Girders & Pedestrian Ornate Railings
      const redRailLeft = [
        [-brW - 0.18, -0.55],
        [-brW + 0.14, -0.55],
        [-brW + 0.14, 1.28],
        [-brW - 0.18, 1.28],
      ];
      const redRailRight = [
        [brW - 0.14, -0.55],
        [brW + 0.18, -0.55],
        [brW + 0.18, 1.28],
        [brW - 0.14, 1.28],
      ];
      batch.add('metal', mats.metal, createSweptProfileGeometry(redBridgeNodes, redRailLeft, true), 0, 0, 0, 0, 0, 0, 1, 1, 1, COL.goldenRed, true, false);
      batch.add('metal', mats.metal, createSweptProfileGeometry(redBridgeNodes, redRailRight, true), 0, 0, 0, 0, 0, 0, 1, 1, 1, COL.goldenRed, true, false);

      // Underside Steel Warren Stiffening Truss Chords & Cross-Beams along the entire 118m span
      for (let i = 0; i < redBridgeNodes.length - 1; i++) {
        const a = redBridgeNodes[i];
        const b = redBridgeNodes[i + 1];
        for (const sideZ of [-brW + 0.35, brW - 0.35]) {
          // Lower chord at y - 2.35m
          batch.addStrut('metal', mats.metal, uBox, a.x, a.y - 2.35, 200 + sideZ, b.x, b.y - 2.35, 200 + sideZ, 0.28, 0.28, COL.crimsonDark, false, false);
          // Vertical hanger post
          batch.add('metal', mats.metal, uBox, a.x, a.y - 1.35, 200 + sideZ, 0, 0, 0, 0.22, 2.0, 0.22, COL.goldenRed, false, false);
          // Diagonal Warren web member
          if (i % 2 === 0) {
            batch.addStrut('metal', mats.metal, uBox, a.x, a.y - 0.45, 200 + sideZ, b.x, b.y - 2.35, 200 + sideZ, 0.18, 0.18, COL.goldenRed, false, false);
          } else {
            batch.addStrut('metal', mats.metal, uBox, a.x, a.y - 2.35, 200 + sideZ, b.x, b.y - 0.45, 200 + sideZ, 0.18, 0.18, COL.goldenRed, false, false);
          }
        }
        // Transverse floorbeam every 2 segments + ornate red coastal bridge streetlights every 4 segments
        if (i % 2 === 0) {
          batch.add('metal', mats.metal, uBox, a.x, a.y - 0.72, 200.0, 0, 0, 0, 0.32, 0.48, brW * 2 - 0.4, COL.crimsonDark, false, false);
          batch.add('metal', mats.metal, uBox, a.x, a.y - 2.35, 200.0, 0, 0, 0, 0.24, 0.24, brW * 2 - 0.6, COL.crimsonDark, false, false);
        }
        if (i % 4 === 2) {
          for (const s of [-1, 1]) {
            const lz = 200.0 + s * (brW - 0.12);
            batch.add('metal', mats.metal, uCyl, a.x, a.y + 3.1, lz, 0, 0, 0, 0.18, 4.2, 0.18, COL.goldenRed, true, false);
            batch.add('metal', mats.metal, uBox, a.x, a.y + 5.15, lz - s * 0.65, 0, 0, 0, 0.14, 0.14, 1.4, COL.goldenRed, false, false);
            batch.add('emissive', mats.emissive, uSphere, a.x, a.y + 4.95, lz - s * 1.22, 0, 0, 0, 0.38, 0.32, 0.38, COL.warmLamp, false, false);
          }
        }
      }

      // Bridge North & South Guardrail Colliders (minY = 0, maxY = 9.5m along Z = 191.3 & Z = 208.7)
      registerInfraAABB(-244.5, -128.0, 191.0, 191.9, 9.6, 0.0, 'bridge_rail_n');
      registerInfraAABB(-244.5, -128.0, 208.1, 209.0, 9.6, 0.0, 'bridge_rail_s');

      // East & West Massive Concrete Bridge Abutments
      batch.add('concrete', mats.concrete, uBox, -128.8, -0.9, 200.0, 0, 0, 0, 5.2, 2.4, brW * 2 + 2.4, COL.concreteMed, true, true);
      batch.add('concrete', mats.concrete, uBox, -244.8, 1.1, 200.0, 0, 0, 0, 5.6, 5.8, brW * 2 + 2.6, COL.concreteMed, true, true);

      // 2) Twin Monumental 43m Golden-Gate-Style Red H-Frame Pylon Towers & 64 Harp Stay Cables!
      const towerXs = [-158.0, -214.0];
      const legZOff = brW + 1.15; // Z = 190.35 & Z = 209.65 (completely outside roadway & walkways!)
      const towerTopY = 43.5;

      for (let ti = 0; ti < towerXs.length; ti++) {
        const tx = towerXs[ti];
        const deckAtTowerY = evalRedBridgeDeckY(tx);

        // Stepped Concrete Ocean Fender Caisson + Black Rubber Ship Bumpers
        batch.add('concrete', mats.concrete, uBox, tx, -1.2, 200.0, 0, 0, 0, 7.6, 4.8, brW * 2 + 6.4, COL.concreteDark, true, true);
        batch.add('concrete', mats.concrete, uBox, tx, 1.65, 200.0, 0, 0, 0, 6.2, 1.5, brW * 2 + 4.8, COL.concreteLight, true, true);
        batch.add('metal', mats.metal, uBox, tx, 0.65, 200.0, 0, 0, 0, 7.9, 0.85, brW * 2 + 6.7, COL.hdpeFloat, false, false);

        // Twin Stepped Art-Deco Red Steel Pylon Legs (North & South of deck)
        for (const s of [-1, 1]) {
          const lz = 200.0 + s * legZOff;
          // 3 gracefully stepped vertical tiers like Golden Gate Bridge!
          batch.add('metal', mats.metal, uBox, tx, 9.2, lz, 0, 0, 0, 2.85, 14.2, 2.45, COL.goldenRed, true, true);
          batch.add('metal', mats.metal, uBox, tx, 23.6, lz, 0, 0, 0, 2.35, 15.0, 2.05, COL.goldenRed, true, true);
          batch.add('metal', mats.metal, uBox, tx, 37.2, lz, 0, 0, 0, 1.88, 12.8, 1.72, COL.goldenRed, true, true);

          // Art-Deco vertical fluted side pilasters on each tower leg
          batch.add('metal', mats.metal, uBox, tx, 22.5, lz + s * 0.95, 0, 0, 0, 1.15, 39.5, 0.45, COL.crimsonDark, false, false);
          // Finial cap + blinking red aviation warning beacon at y = 44.4m!
          batch.add('metal', mats.metal, uBox, tx, towerTopY + 0.35, lz, 0, 0, 0, 2.25, 0.72, 2.1, COL.crimsonDark, false, false);
          batch.add('metal', mats.metal, uCyl, tx, towerTopY + 1.35, lz, 0, 0, 0, 0.14, 1.4, 0.14, COL.chrome, false, false);
          batch.add('emissive', mats.emissive, uSphere, tx, towerTopY + 2.15, lz, 0, 0, 0, 0.48, 0.48, 0.48, COL.beaconRed, false, false);

          registerInfraAABB(tx - 1.5, tx + 1.5, lz - 1.3, lz + 1.3, towerTopY, -3.0, 'bridge_pylon');
        }

        // Sub-deck crosshead girder + 3 overhead Art-Deco portal cross-struts with X-bracing!
        batch.add('metal', mats.metal, uBox, tx, deckAtTowerY - 1.55, 200.0, 0, 0, 0, 2.5, 1.65, legZOff * 2, COL.crimsonDark, true, true);
        const portalHeights = [19.5, 30.2, 40.4];
        for (let pi = 0; pi < portalHeights.length; pi++) {
          const py = portalHeights[pi];
          batch.add('metal', mats.metal, uBox, tx, py, 200.0, 0, 0, 0, 1.65, 1.85, legZOff * 2 - 1.2, COL.goldenRed, true, false);
          batch.add('metal', mats.metal, uBox, tx, py + 1.05, 200.0, 0, 0, 0, 1.85, 0.28, legZOff * 2 - 0.8, COL.crimsonDark, false, false);
          // Architectural Art-Deco X-diagonals between portal struts
          if (pi < portalHeights.length - 1) {
            const pyNext = portalHeights[pi + 1];
            batch.addStrut('metal', mats.metal, uBox, tx, py + 0.8, 200 - legZOff + 1.1, tx, pyNext - 0.8, 200 + legZOff - 1.1, 0.24, 0.24, COL.crimsonDark, false, false);
            batch.addStrut('metal', mats.metal, uBox, tx, py + 0.8, 200 + legZOff - 1.1, tx, pyNext - 0.8, 200 - legZOff + 1.1, 0.24, 0.24, COL.crimsonDark, false, false);
          }
        }

        // 32 Tensioned Diagonal Steel Stay Cables per Tower (8 East + 8 West on BOTH North & South Pylon Legs = 64 cables total!)
        for (const s of [-1, 1]) {
          const anchorZ = 200.0 + s * (brW - 0.08);
          const pylonZ = 200.0 + s * legZOff;
          for (let ci = 1; ci <= 8; ci++) {
            const reach = ci * 3.45; // Spans up to 27.6m East & West from each tower!
            const saddleY = 23.5 + ci * 2.28;

            for (const dirSign of [-1, 1]) {
              const ax = tx + dirSign * reach;
              if (ax > -128.2 || ax < -244.8) continue;
              const ay = evalRedBridgeDeckY(ax) + 0.55;
              batch.addStrut(
                'metal', mats.metal, uCyl,
                tx, saddleY, pylonZ,
                ax, ay, anchorZ,
                0.095, 0.095, COL.stayCable, false, false
              );
              // Red steel deck cable socket anchorage
              batch.add('metal', mats.metal, uCyl, ax, ay + 0.15, anchorZ, 0, 0, dirSign * 0.45, 0.26, 0.85, 0.26, COL.goldenRed, false, false);
            }
          }
        }
      }

      // 3) Scenic Lighthouse Island & Helipad Peninsula centered around (-275, 4.0, +200)
      {
        const islX = -276.0;
        const islZ = 200.0;

        // Multi-tiered coastal granite bedrock base + flat paved limestone island terrace at y = 4.0m
        batch.add('concrete', mats.concrete, uCyl, islX, 0.65, islZ, 0, 0, 0, 62.0, 6.7, 58.0, COL.coastalRock, true, true);
        batch.add('concrete', mats.concrete, uCyl, islX, 2.35, islZ, 0, 0.2, 0, 56.0, 3.3, 52.0, COL.concreteDark, true, true);
        // Paved circular limestone promenade deck at exact y = 4.0m
        batch.add('concrete', mats.concrete, uCyl, islX, ISLAND_DECK_Y - 0.18, islZ, 0, 0, 0, 52.5, 0.36, 49.0, COL.travertine, false, true);

        // Ring of 22 jagged coastal wave-breaker rocks around the island shoreline (y = -1.5m .. +3.2m)
        for (let ri = 0; ri < 22; ri++) {
          const ang = (ri / 22) * Math.PI * 2;
          // Leave clean bridge entry channel on East side (ang near 0)!
          if (Math.abs(wrapAngle(ang)) < 0.32) continue;
          const rx = islX + Math.cos(ang) * (27.5 + (ri % 3) * 2.4);
          const rz = islZ + Math.sin(ang) * (25.5 + ((ri + 1) % 3) * 2.2);
          const sx = 5.2 + (ri % 4) * 1.4;
          const sy = 3.2 + (ri % 3) * 1.1;
          const sz = 4.8 + ((ri + 2) % 4) * 1.2;
          batch.add(
            'concrete', mats.concrete, uRock,
            rx, 0.6 + (ri % 2) * 0.4, rz,
            ri * 0.35, ang, 0.18,
            sx, sy, sz,
            ri % 2 === 0 ? COL.coastalRock : COL.darkRock,
            true, true
          );
        }

        // Stone coastal parapet posts & iron promenade railings around outer perimeter (leaving East road & Stunt #7 clear!)
        for (let pi = 0; pi < 28; pi++) {
          const ang = (pi / 28) * Math.PI * 2;
          if (Math.abs(wrapAngle(ang)) < 0.42) continue; // East bridge throat + Stunt #7 launch clear!
          const px = islX + Math.cos(ang) * 24.8;
          const pz = islZ + Math.sin(ang) * 23.2;
          batch.add('concrete', mats.concrete, uBox, px, ISLAND_DECK_Y + 0.52, pz, 0, -ang, 0, 0.55, 1.04, 0.55, COL.stuccoWhite, true, true);

          const nextAng = ((pi + 1) / 28) * Math.PI * 2;
          if (Math.abs(wrapAngle(nextAng)) >= 0.42) {
            const qx = islX + Math.cos(nextAng) * 24.8;
            const qz = islZ + Math.sin(nextAng) * 23.2;
            batch.addStrut('metal', mats.metal, uCyl, px, ISLAND_DECK_Y + 0.88, pz, qx, ISLAND_DECK_Y + 0.88, qz, 0.08, 0.08, COL.steelDark);
            batch.addStrut('metal', mats.metal, uCyl, px, ISLAND_DECK_Y + 0.48, pz, qx, ISLAND_DECK_Y + 0.48, qz, 0.07, 0.07, COL.steelDark);
          }
        }

        // Connecting road apron from Red Bridge West end (-245.5, 4.0, 200) into Island Plaza (-275, 4.0, 200)
        batch.add('twoLaneRoad', mats.twoLaneRoad, uBox, -260.0, ISLAND_DECK_Y + 0.01, 200.0, 0, Math.PI * 0.5, 0, 12.4, 0.05, 30.0, null, false, true);

        // Coastal VIP Helipad ('H') at (-275.0, 4.06, +185.0)
        const hpX = -275.0;
        const hpY = ISLAND_DECK_Y + 0.06;
        const hpZ = 185.0;
        batch.add('concrete', mats.concrete, uCyl, hpX, hpY - 0.04, hpZ, 0, 0, 0, 17.6, 0.14, 17.6, COL.steelDark, false, true);
        const hpRing = new THREE.RingGeometry(7.2, 7.85, 32);
        hpRing.rotateX(-Math.PI * 0.5);
        batch.add('concrete', mats.concrete, hpRing, hpX, hpY + 0.04, hpZ, 0, 0, 0, 1, 1, 1, COL.hazardYellow, false, false);
        // Crisp white 'H' helipad bars
        batch.add('concrete', mats.concrete, uBox, hpX - 2.2, hpY + 0.04, hpZ, 0, 0, 0, 1.15, 0.03, 6.6, COL.stuccoWhite, false, false);
        batch.add('concrete', mats.concrete, uBox, hpX + 2.2, hpY + 0.04, hpZ, 0, 0, 0, 1.15, 0.03, 6.6, COL.stuccoWhite, false, false);
        batch.add('concrete', mats.concrete, uBox, hpX, hpY + 0.04, hpZ, 0, 0, 0, 4.4, 0.03, 1.15, COL.stuccoWhite, false, false);

        // 12 Glowing Green/Amber Perimeter Helipad Deck Lights + Orange Aviation Windsock Mast
        for (let li = 0; li < 12; li++) {
          const la = (li / 12) * Math.PI * 2;
          batch.add(
            'emissive', mats.emissive, uSphere,
            hpX + Math.cos(la) * 8.35, hpY + 0.10, hpZ + Math.sin(la) * 8.35,
            0, 0, 0, 0.28, 0.18, 0.28,
            li % 2 === 0 ? COL.limeGlow : COL.amberGlow,
            false, false
          );
        }
        batch.add('metal', mats.metal, uCyl, hpX - 9.8, hpY + 2.6, hpZ - 4.5, 0, 0, 0, 0.14, 5.2, 0.14, COL.chrome, true, false);
        batch.add('concrete', mats.concrete, uCone, hpX - 8.7, hpY + 4.95, hpZ - 4.5, 0, 0, -Math.PI * 0.46, 0.68, 2.1, 0.68, COL.safetyOrange, false, false);

        // Iconic 26m Red-and-White Striped Coastal Lighthouse at (-292.0, 4.32, +215.0)!
        const lhX = -292.0;
        const lhY = ISLAND_DECK_Y + 0.32;
        const lhZ = 215.0;

        // Octagonal stone plinth + charming coastal Lighthouse Keeper's Cottage
        batch.add('concrete', mats.concrete, uOctCyl, lhX, lhY - 0.15, lhZ, 0, 0, 0, 11.2, 0.72, 11.2, COL.ashlarStone, true, true);
        batch.add('concrete', mats.concrete, uBox, lhX + 6.8, lhY + 2.1, lhZ - 1.5, 0, 0.25, 0, 7.4, 4.2, 5.8, COL.stuccoWhite, true, true);
        batch.add('concrete', mats.concrete, uCone, lhX + 6.8, lhY + 5.15, lhZ - 1.5, 0, Math.PI * 0.25 + 0.25, 0, 6.8, 2.1, 6.8, COL.goldenRed, true, true);
        registerInfraAABB(lhX + 2.8, lhX + 10.8, lhZ - 4.8, lhZ + 1.8, lhY + 5.5, ISLAND_DECK_Y, 'lighthouse_cottage');

        // 6 Alternating Candy-Red & Crisp-White Tapered Masonry Lighthouse Bands (21m shaft)
        const bandCount = 6;
        const bandH = 3.35;
        for (let bi = 0; bi < bandCount; bi++) {
          const rBot = lerp(3.45, 2.05, bi / bandCount);
          const rTop = lerp(3.45, 2.05, (bi + 1) / bandCount);
          const bandGeo = new THREE.CylinderGeometry(rTop, rBot, bandH, 18);
          const by = lhY + 0.2 + bi * bandH + bandH * 0.5;
          batch.add(
            'concrete', mats.concrete, bandGeo,
            lhX, by, lhZ,
            0, 0, 0, 1, 1, 1,
            bi % 2 === 0 ? COL.stuccoWhite : COL.goldenRed,
            true, true
          );
          // Narrow spiral staircase window slit on each band
          const winAng = bi * 1.05;
          batch.add(
            'metal', mats.metal, uBox,
            lhX + Math.cos(winAng) * ((rBot + rTop) * 0.5),
            by,
            lhZ + Math.sin(winAng) * ((rBot + rTop) * 0.5),
            0, -winAng + Math.PI * 0.5, 0,
            0.52, 0.92, 0.22,
            COL.steelDark, false, false
          );
        }

        // Cantilevered Observation Gallery Deck, Iron Railing, Glass Fresnel Lantern Room & Red Dome Cupola
        const galY = lhY + 0.2 + bandCount * bandH; // y ~ 24.6m
        batch.add('concrete', mats.concrete, uCyl, lhX, galY + 0.22, lhZ, 0, 0, 0, 5.6, 0.45, 5.6, COL.concreteDark, true, true);
        for (let gi = 0; gi < 12; gi++) {
          const ga = (gi / 12) * Math.PI * 2;
          batch.add('metal', mats.metal, uCyl, lhX + Math.cos(ga) * 2.62, galY + 0.95, lhZ + Math.sin(ga) * 2.62, 0, 0, 0, 0.08, 1.1, 0.08, COL.steelDark, false, false);
        }
        const galRing = new THREE.TorusGeometry(2.62, 0.06, 6, 20);
        galRing.rotateX(Math.PI * 0.5);
        batch.add('metal', mats.metal, galRing, lhX, galY + 1.45, lhZ, 0, 0, 0, 1, 1, 1, COL.steelDark, false, false);

        // Glass Lantern Cylinder + Glowing Fresnel Lens Core + Copper-Red Dome + Lightning Spire
        batch.add('glass', mats.glass, uCyl, lhX, galY + 2.15, lhZ, 0, 0, 0, 3.65, 3.3, 3.65, null, false, false);
        batch.add('emissive', mats.emissive, uCyl, lhX, galY + 2.15, lhZ, 0, 0, 0, 1.45, 1.85, 1.45, COL.warmLamp, false, false);
        const cupolaGeo = new THREE.SphereGeometry(2.05, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52);
        batch.add('metal', mats.metal, cupolaGeo, lhX, galY + 3.75, lhZ, 0, 0, 0, 1, 1, 1, COL.goldenRed, true, false);
        batch.add('metal', mats.metal, uCyl, lhX, galY + 6.45, lhZ, 0, 0, 0, 0.10, 2.2, 0.10, COL.chrome, false, false);
        batch.add('emissive', mats.emissive, uSphere, lhX, galY + 7.62, lhZ, 0, 0, 0, 0.36, 0.36, 0.36, COL.beaconRed, false, false);

        registerInfraAABB(lhX - 3.6, lhX + 3.6, lhZ - 3.6, lhZ + 3.6, galY + 6.0, ISLAND_DECK_Y, 'lighthouse_tower');

        // Rotating Twin Volumetric Lighthouse Searchlight Beams (1 Single Merged Mesh inside lighthouseRotorGroup!)
        lighthouseRotorGroup = new THREE.Group();
        lighthouseRotorGroup.position.set(lhX, galY + 2.15, lhZ);
        const beamLen = 58.0;
        const coneA = new THREE.ConeGeometry(7.2, beamLen, 16, 1, true);
        coneA.translate(0, -beamLen * 0.5, 0);
        coneA.rotateX(-Math.PI * 0.5); // Extends along +Z
        const coneB = coneA.clone();
        coneB.rotateY(Math.PI);        // Opposite beam along -Z
        const twinBeamGeo = mergeInfraBufferGeometries([
          { geo: coneA, matrix: makeMat4(0, 0, 0.8) },
          { geo: coneB, matrix: makeMat4(0, 0, -0.8) },
        ]);
        const twinBeamMat = new THREE.MeshBasicMaterial({
          color: 0xfff3c4,
          transparent: true,
          opacity: 0.20,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const twinBeamMesh = new THREE.Mesh(twinBeamGeo, twinBeamMat);
        twinBeamMesh.frustumCulled = false;
        lighthouseRotorGroup.add(twinBeamMesh);
        infraRoot.add(lighthouseRotorGroup);

        // Scenic Park Benches & Coastal Palm Clusters on Lighthouse Island
        for (const [bx, bz, byaw] of [
          [-268.0, 212.0, -0.5],
          [-282.0, 204.0, 1.4],
          [-265.0, 186.0, 0.3],
        ]) {
          batch.add('wood', mats.wood, uBox, bx, ISLAND_DECK_Y + 0.42, bz, 0, byaw, 0, 2.2, 0.12, 0.62, COL.teakWarm, true, true);
          batch.add('wood', mats.wood, uBox, bx, ISLAND_DECK_Y + 0.78, bz - Math.cos(byaw) * 0.25, 0.18, byaw, 0, 2.2, 0.55, 0.10, COL.teakWarm, true, false);
          batch.add('metal', mats.metal, uBox, bx - Math.cos(byaw) * 0.85, ISLAND_DECK_Y + 0.22, bz + Math.sin(byaw) * 0.85, 0, byaw, 0, 0.12, 0.44, 0.58, COL.steelDark, false, false);
          batch.add('metal', mats.metal, uBox, bx + Math.cos(byaw) * 0.85, ISLAND_DECK_Y + 0.22, bz - Math.sin(byaw) * 0.85, 0, byaw, 0, 0.12, 0.44, 0.58, COL.steelDark, false, false);
        }
      }
    }

    // ========================================================================
    // ZONE 2: DEL PERRO LUXURY YACHT MARINA & 62M BOARDABLE SUPERYACHT
    //         Marina Pontoons & Boat Slips: X in [-278, -190], Z in [+75, +145]
    //         Moored 62m Linh Chu Thượng Cổ "M/Y Galaxy": (-295, 0, +115)
    // ========================================================================
    {
      // Helper to build a floating timber/concrete marina pontoon section with HDPE floats, pilings & bollards!
      function buildMarinaPontoon(cx, cz, lenX, lenZ, addPilings = true, bollardStep = 10) {
        // Dark HDPE buoyancy tubs sitting in the ocean water (y = -0.25m .. +0.85m)
        batch.add('metal', mats.metal, uBox, cx, 0.30, cz, 0, 0, 0, lenX - 0.3, 1.15, lenZ - 0.3, COL.hdpeFloat, false, true);
        // Precast concrete edge trim frame
        batch.add('concrete', mats.concrete, uBox, cx, MARINA_DECK_Y - 0.16, cz, 0, 0, 0, lenX + 0.14, 0.30, lenZ + 0.14, COL.concreteLight, true, true);
        // Warm caulked Burmese teak planking deck at y = MARINA_DECK_Y (1.25m)
        batch.add('wood', mats.wood, uBox, cx, MARINA_DECK_Y - 0.04, cz, 0, 0, 0, lenX - 0.18, 0.10, lenZ - 0.18, COL.teakWarm, false, true);

        const alongX = lenX >= lenZ;
        const mainSpan = alongX ? lenX : lenZ;
        const halfCross = (alongX ? lenZ : lenX) * 0.5 - 0.28;

        for (let d = -mainSpan * 0.44; d <= mainSpan * 0.44; d += bollardStep) {
          for (const s of [-1, 1]) {
            const bx = alongX ? cx + d : cx + s * halfCross;
            const bz = alongX ? cz + s * halfCross : cz + d;
            // Cast-iron T-head mooring cleat/bollard + solar LED bollard cap
            batch.add('metal', mats.metal, uCyl, bx, MARINA_DECK_Y + 0.22, bz, 0, 0, 0, 0.24, 0.44, 0.24, COL.steelDark, true, false);
            batch.add('metal', mats.metal, uBox, bx, MARINA_DECK_Y + 0.38, bz, 0, alongX ? 0 : Math.PI * 0.5, 0, 0.52, 0.10, 0.16, COL.steelDark, false, false);
            if (Math.abs(d) % (bollardStep * 2) < 1) {
              batch.add('emissive', mats.emissive, uBox, bx, MARINA_DECK_Y + 0.45, bz, 0, 0, 0, 0.16, 0.06, 0.16, COL.cyanGlow, false, false);
            }
          }
        }

        if (addPilings) {
          const pilePositions = alongX
            ? [[cx - lenX * 0.45, cz - halfCross - 0.35], [cx - lenX * 0.45, cz + halfCross + 0.35], [cx, cz - halfCross - 0.35], [cx, cz + halfCross + 0.35], [cx + lenX * 0.45, cz - halfCross - 0.35], [cx + lenX * 0.45, cz + halfCross + 0.35]]
            : [[cx - halfCross - 0.35, cz - lenZ * 0.44], [cx + halfCross + 0.35, cz - lenZ * 0.44], [cx - halfCross - 0.35, cz], [cx + halfCross + 0.35, cz], [cx - halfCross - 0.35, cz + lenZ * 0.44], [cx + halfCross + 0.35, cz + lenZ * 0.44]];
          for (const [px, pz] of pilePositions) {
            batch.add('metal', mats.metal, uCyl, px, 0.45, pz, 0, 0, 0, 0.34, 5.4, 0.34, COL.steelDark, true, false);
            batch.add('concrete', mats.concrete, uCone, px, 3.25, pz, 0, 0, 0, 0.40, 0.25, 0.40, COL.stuccoWhite, false, false);
          }
        }
      }

      // 1) Beach-to-Marina Sloped Timber & Concrete Access Ramp (X: -189 -> -207, Z = 108)
      const rampSteps = 12;
      for (let i = 0; i < rampSteps; i++) {
        const u0 = i / rampSteps;
        const u1 = (i + 1) / rampSteps;
        const um = (u0 + u1) * 0.5;
        const rx = lerp(-189.0, -207.0, um);
        const ry0 = lerp(0.05, MARINA_DECK_Y, smootherstep(0, 1, u0));
        const ry1 = lerp(0.05, MARINA_DECK_Y, smootherstep(0, 1, u1));
        const pitch = Math.atan2(ry1 - ry0, 18.0 / rampSteps);
        batch.add('wood', mats.wood, uBox, rx, (ry0 + ry1) * 0.5 - 0.08, 108.0, 0, 0, -pitch, 1.65, 0.22, 7.6, COL.teakWarm, true, true);
      }
      // Marina Entrance Illuminated Yacht Club Archway at (-206.8, 1.25, 108.0)
      for (const sz of [103.8, 112.2]) {
        batch.add('concrete', mats.concrete, classicalColGeo, -206.8, MARINA_DECK_Y, sz, 0, 0, 0, 5.4, 5.4, 5.4, COL.stuccoWhite, true, true);
      }
      batch.add('concrete', mats.concrete, uBox, -206.8, MARINA_DECK_Y + 5.85, 108.0, 0, 0, 0, 1.25, 1.15, 9.8, COL.stuccoWhite, true, true);
      const marinaSignGeo = createAtlasSignPlaneGeometry(8.4, 1.65, 5, 8, true); // Row 5: "BẾN DU THUYỀN HẠNG SANG DEL PERRO"
      batch.add('signAtlas', mats.signAtlas, marinaSignGeo, -206.8, MARINA_DECK_Y + 5.85, 108.0, 0, Math.PI * 0.5, 0, 1, 1, 1, null, true, false);

      // 2) Concrete Boat Launch Slipway into Ocean (X: -190 -> -214, Z = 135.5)
      batch.add('concrete', mats.concrete, uBox, -202.0, -0.65, 135.5, 0, 0, 0.058, 24.5, 0.35, 8.2, COL.concreteMed, false, true);
      for (const sz of [131.2, 139.8]) {
        batch.add('concrete', mats.concrete, uBox, -201.0, -0.15, sz, 0, 0, 0.058, 22.0, 0.85, 0.55, COL.hazardYellow, true, true);
      }

      // 3) North-South Promenade Pier (X = -210, Z in [76, 144]) + Linh Chu Thượng Cổ Spine (Z = 108, X in [-278, -210]) + 3 Finger Piers
      buildMarinaPontoon(-210.0, 110.0, 6.4, 68.0, true, 11);
      buildMarinaPontoon(-244.2, 108.0, 68.5, 6.8, true, 11);
      buildMarinaPontoon(-224.0, 81.5, 28.0, 4.0, true, 9);   // North finger pier (leaves Z = 95 open water for Speedboat/Jet Ski!)
      buildMarinaPontoon(-224.0, 123.8, 28.0, 3.6, true, 9);  // Mid-South finger pier
      buildMarinaPontoon(-224.0, 142.0, 28.0, 4.0, true, 9);  // South finger pier

      // Shore-power white/blue dock pedestals & red lifebuoy rings along main yacht pier
      for (let px = -218; px >= -272; px -= 13.5) {
        batch.add('concrete', mats.concrete, uBox, px, MARINA_DECK_Y + 0.52, 110.8, 0, 0, 0, 0.38, 1.04, 0.34, COL.stuccoWhite, true, false);
        batch.add('emissive', mats.emissive, uBox, px, MARINA_DECK_Y + 0.92, 110.8, 0, 0, 0, 0.28, 0.14, 0.28, COL.cyanGlow, false, false);
        batch.add('concrete', mats.concrete, uTorus, px + 4.5, MARINA_DECK_Y + 0.65, 105.1, 0, 0, 0, 0.72, 0.72, 0.72, COL.goldenRed, false, false);
      }

      // 2 Decorative Moored Luxury Cabin Cruisers in Side Slips (Z = 116.8 & Z = 132.2, keeping Z = 95 100% clear!)
      for (const [bx, bz, hullTrimCol] of [
        [-224.5, 116.8, COL.yachtNavy],
        [-223.5, 132.2, COL.goldenRed],
      ]) {
        // Sleek 13m V-hull cruiser facing West (-X)
        batch.add('metal', mats.metal, uBox, bx + 1.2, 0.35, bz, 0, 0, 0, 9.6, 1.35, 3.45, COL.yachtWhite, true, true);
        batch.add('metal', mats.metal, uCone, bx - 5.2, 0.52, bz, 0, 0, Math.PI * 0.5, 3.45, 3.8, 1.35, COL.yachtWhite, true, true);
        batch.add('metal', mats.metal, uBox, bx + 0.5, 0.78, bz, 0, 0, 0, 11.2, 0.16, 3.56, hullTrimCol, false, false);
        batch.add('wood', mats.wood, uBox, bx + 3.6, 1.06, bz, 0, 0, 0, 4.4, 0.08, 3.1, COL.teakWarm, false, true);
        batch.add('metal', mats.metal, uBox, bx - 0.6, 1.52, bz, 0, 0, 0.08, 5.2, 1.05, 2.75, COL.yachtWhite, true, false);
        batch.add('glass', mats.glass, uBox, bx - 1.1, 1.65, bz, 0, 0, 0.18, 3.8, 0.72, 2.82, null, false, false);
      }

      // 4) Brushed-Aluminum Boarding Gangplank (-278, 1.25, 108) -> Linh Chu Thượng Cổ Starboard Promenade (-289.2, 3.22, 108)!
      {
        const gpX1 = -277.8, gpY1 = MARINA_DECK_Y + 0.04;
        const gpX2 = -289.2, gpY2 = 3.24;
        const gpLen = Math.hypot(gpX2 - gpX1, gpY2 - gpY1);
        const gpPitch = Math.atan2(gpY2 - gpY1, Math.abs(gpX2 - gpX1));
        const gpMidX = (gpX1 + gpX2) * 0.5;
        const gpMidY = (gpY1 + gpY2) * 0.5;

        batch.add('wood', mats.wood, uBox, gpMidX, gpMidY, 108.0, 0, 0, -gpPitch, gpLen, 0.14, 2.6, COL.teakWarm, true, true);
        for (const sz of [106.65, 109.35]) {
          batch.add('metal', mats.metal, uBox, gpMidX, gpMidY + 0.52, sz, 0, 0, -gpPitch, gpLen, 0.96, 0.10, COL.chrome, true, false);
          batch.add('emissive', mats.emissive, uBox, gpMidX, gpMidY + 0.08, sz, 0, 0, -gpPitch, gpLen * 0.95, 0.05, 0.06, COL.cyanGlow, false, false);
        }
      }

      // 5) 62m Moored Luxury Linh Chu Thượng Cổ "M/Y GALAXY DEL PERRO" at (-295, 0, +115)!
      //    Bow at Z = +84.0 (North), Stern Beach Club at Z = +146.0 (South), Beam = 12.4m
      {
        const yx = YACHT_CENTER_X; // -295.0
        const yz = YACHT_CENTER_Z; // +115.0

        // Lofted 62m Multi-Station Pearl-White Naval Hull
        const hullGeo = createSuperyachtHullGeometry(62.0, 12.4, 4.6);
        batch.add('metal', mats.metal, hullGeo, yx, 0.0, yz, 0, 0, 0, 1, 1, 1, COL.yachtWhite, true, true);

        // Navy-blue boot-top waterline stripe & underwater turquoise hull illumination LEDs!
        batch.add('metal', mats.metal, uBox, yx, 0.25, yz + 3.5, 0, 0, 0, 11.85, 0.42, 48.0, COL.yachtNavy, false, false);
        for (let lz = 96; lz <= 142; lz += 6.5) {
          for (const sx of [-5.8, 5.8]) {
            batch.add('emissive', mats.emissive, uSphere, yx + sx, -0.25, lz, 0, 0, 0, 0.45, 0.22, 0.95, COL.cyanGlow, false, false);
            // Tinted lower-cabin hull porthole windows
            if (lz >= 104 && lz <= 136) {
              batch.add('glass', mats.glass, uBox, yx + sx * 1.02, 1.95, lz, 0, 0, 0, 0.14, 0.58, 1.65, null, false, false);
            }
          }
        }

        // Deck 1: Stern Teakwood Beach-Club Swim Platform (Z in [140.5, 146.0], y = 1.18m) + Twin Teak Stairs
        batch.add('wood', mats.wood, uBox, yx, 1.10, 143.2, 0, 0, 0, 10.4, 0.22, 5.6, COL.teakWarm, true, true);
        for (const sx of [-3.6, 3.6]) {
          for (let st = 0; st < 7; st++) {
            const u = st / 6;
            batch.add('wood', mats.wood, uBox, yx + sx, lerp(1.28, 3.16, u), lerp(141.2, 138.2, u), 0, 0, 0, 1.65, 0.22, 0.55, COL.teakWarm, true, true);
          }
        }

        // Deck 2: Main Aft Lounge & Walkaround Teak Promenade Deck (Z in [102.5, 138.8], y = 3.22m)
        batch.add('wood', mats.wood, uBox, yx, 3.12, 120.8, 0, 0, 0, 11.6, 0.22, 36.4, COL.teakWarm, true, true);

        // Sleek Sculpted Main-Deck Salon Superstructure (X in [-298.5, -291.5] -> leaves 2.2m wide walkaround promenade on Port & Starboard!)
        batch.add('metal', mats.metal, uBox, yx, 4.72, 117.2, 0, 0, 0, 7.0, 2.85, 25.0, COL.yachtWhite, true, true);
        batch.add('glass', mats.glass, uBox, yx, 4.82, 117.2, 0, 0, 0, 7.18, 1.65, 22.8, null, false, false);
        // Raked aerodynamic forward salon windshield nose
        batch.add('metal', mats.metal, uBox, yx, 4.45, 104.2, -0.52, 0, 0, 6.8, 2.4, 3.2, COL.yachtWhite, true, true);
        batch.add('glass', mats.glass, uBox, yx, 4.65, 103.8, -0.52, 0, 0, 6.4, 1.65, 2.6, null, false, false);
        // Solid collision AABB for the enclosed Main Salon cabin (only between y=3.2m and y=6.15m so player walks on top at y=6.22m!)
        registerInfraAABB(yx - 3.55, yx + 3.55, 104.5, 129.6, 6.08, 3.20, 'yacht_main_salon');

        // Aft Deck Luxury U-Lounge Sofas, Mahogany Dining Table & Wet Bar (Z in [131, 137.5])
        batch.add('concrete', mats.concrete, uBox, yx, 3.58, 136.4, 0, 0, 0, 5.6, 0.68, 1.25, COL.stuccoWhite, true, true);
        batch.add('concrete', mats.concrete, uBox, yx - 2.4, 3.58, 134.4, 0, 0, 0, 1.15, 0.68, 3.4, COL.stuccoWhite, true, true);
        batch.add('wood', mats.wood, uBox, yx + 0.2, 3.68, 134.4, 0, 0, 0, 2.8, 0.12, 1.65, COL.mahogany, true, true);
        batch.add('metal', mats.metal, uCyl, yx + 0.2, 3.42, 134.4, 0, 0, 0, 0.24, 0.52, 0.24, COL.chrome, false, false);

        // Exterior Starboard Teak Staircase from Main Aft Deck (Z=134.5, y=3.22m) up to Upper Jacuzzi Deck (Z=128.5, y=6.22m)!
        for (let st = 0; st < 11; st++) {
          const u = st / 10;
          batch.add(
            'wood', mats.wood, uBox,
            -291.4,
            lerp(3.32, 6.18, u),
            lerp(134.4, 128.6, u),
            0, 0, 0,
            1.75, 0.20, 0.62,
            COL.teakWarm, true, true
          );
        }
        batch.addStrut('metal', mats.metal, uCyl, -290.45, 4.15, 134.4, -290.45, 7.05, 128.6, 0.07, 0.07, COL.chrome);

        // Deck 3: Raised Touch-and-Go Bow Helipad Deck (Z in [85.5, 102.5], y = 4.82m)
        const bowPadShape = new THREE.CylinderGeometry(4.6, 4.6, 0.18, 24);
        batch.add('concrete', mats.concrete, bowPadShape, yx, 4.76, 94.2, 0, 0, 0, 1.0, 1.0, 1.45, COL.steelDark, false, true);
        const yPadRing = new THREE.RingGeometry(3.55, 3.92, 28);
        yPadRing.rotateX(-Math.PI * 0.5);
        batch.add('metal', mats.metal, yPadRing, yx, 4.87, 94.2, 0, 0, 0, 1, 1, 1, COL.gold24k, false, false);
        batch.add('metal', mats.metal, uBox, yx - 1.1, 4.87, 94.2, 0, 0, 0, 0.55, 0.02, 3.2, COL.yachtWhite, false, false);
        batch.add('metal', mats.metal, uBox, yx + 1.1, 4.87, 94.2, 0, 0, 0, 0.55, 0.02, 3.2, COL.yachtWhite, false, false);
        batch.add('metal', mats.metal, uBox, yx, 4.87, 94.2, 0, 0, 0, 2.2, 0.02, 0.55, COL.yachtWhite, false, false);
        // Register Bow Helipad into infraAABBs (maxY = 4.82m) so Maverick helicopters can land right on the Linh Chu Thượng Cổ bow!
        registerInfraAABB(yx - 4.4, yx + 4.4, 88.5, 99.8, 4.82, 3.2, 'yacht_helipad');

        // Deck 4: Upper Captain's Bridge & Bubbling Jacuzzi Sun Deck (Z in [105.0, 129.0], y = 6.22m)!
        batch.add('wood', mats.wood, uBox, yx, 6.15, 117.0, 0, 0, 0, 8.7, 0.22, 24.2, COL.teakWarm, true, true);
        // Forward Captain's Wheelhouse Cabin (Z in [106.5, 115.5], y = 6.22..8.75m)
        batch.add('metal', mats.metal, uBox, yx, 7.48, 111.5, 0, 0, 0, 6.2, 2.45, 8.8, COL.yachtWhite, true, true);
        batch.add('glass', mats.glass, uBox, yx, 7.62, 110.8, -0.25, 0, 0, 6.36, 1.35, 7.8, null, false, false);
        registerInfraAABB(yx - 3.15, yx + 3.15, 106.8, 116.0, 8.8, 6.22, 'yacht_wheelhouse');

        // Swept Aerodynamic Radar Mast, Twin White Satcom Radomes & Spinning Marine Radar Scanner!
        batch.add('metal', mats.metal, uBox, yx, 9.55, 113.2, -0.28, 0, 0, 4.8, 1.85, 1.15, COL.yachtWhite, true, false);
        batch.add('metal', mats.metal, uBox, yx, 10.55, 113.6, 0, 0, 0, 6.8, 0.28, 1.65, COL.yachtWhite, true, false);
        batch.add('concrete', mats.concrete, uSphere, yx - 2.3, 11.15, 113.6, 0, 0, 0, 1.15, 1.15, 1.15, COL.stuccoWhite, true, false);
        batch.add('concrete', mats.concrete, uSphere, yx + 2.3, 11.15, 113.6, 0, 0, 0, 1.15, 1.15, 1.15, COL.stuccoWhite, true, false);

        yachtRadarGroup = new THREE.Group();
        yachtRadarGroup.position.set(yx, 11.45, 113.6);
        const radarBar = new THREE.Mesh(
          new THREE.BoxGeometry(2.85, 0.18, 0.32),
          mats.metal
        );
        yachtRadarGroup.add(radarBar);
        infraRoot.add(yachtRadarGroup);

        // Bubbling Glowing Turquoise Jacuzzi Hot-Tub on Upper Sun Deck (-295.0, 6.22, +123.5)!
        const htX = yx;
        const htY = 6.22;
        const htZ = 123.5;
        batch.add('wood', mats.wood, uOctCyl, htX, htY + 0.46, htZ, 0, 0, 0, 4.4, 0.92, 4.4, COL.mahogany, true, true);
        batch.add('concrete', mats.concrete, uCyl, htX, htY + 0.88, htZ, 0, 0, 0, 4.15, 0.14, 4.15, COL.stuccoWhite, false, true);
        batch.add('emissive', mats.emissive, uCyl, htX, htY + 0.82, htZ, 0, 0, 0, 3.65, 0.08, 3.65, COL.cyanGlow, false, false);

        // Animated Jacuzzi Foam/Bubble Ring
        yachtHotTubRipples = new THREE.Mesh(
          new THREE.RingGeometry(0.65, 1.55, 24),
          new THREE.MeshBasicMaterial({ color: 0xe0faff, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
        );
        yachtHotTubRipples.rotation.x = -Math.PI * 0.5;
        yachtHotTubRipples.position.set(htX, htY + 0.89, htZ);
        infraRoot.add(yachtHotTubRipples);

        // 4 Teak Sunbeds flanking the Hot-Tub + Stainless Yacht Guardrails
        for (const sx of [-3.1, 3.1]) {
          batch.add('wood', mats.wood, uBox, yx + sx, htY + 0.28, 118.8, 0, 0, 0, 1.05, 0.24, 2.25, COL.teakWarm, true, true);
          batch.add('concrete', mats.concrete, uBox, yx + sx, htY + 0.52, 117.9, -0.45, 0, 0, 0.98, 0.14, 0.78, COL.stuccoWhite, false, false);
        }
        // Stainless handrails along Main & Upper Decks (leaving Starboard Gangplank mouth Z in [106, 110] wide open!)
        for (let rz = 104; rz <= 138; rz += 3.4) {
          batch.add('metal', mats.metal, uCyl, yx - 5.55, 3.72, rz, 0, 0, 0, 0.06, 1.0, 0.06, COL.chrome, false, false);
          if (rz < 105.5 || rz > 110.5) {
            batch.add('metal', mats.metal, uCyl, yx + 5.55, 3.72, rz, 0, 0, 0, 0.06, 1.0, 0.06, COL.chrome, false, false);
          }
        }
      }
    }

    // ========================================================================
    // ZONE 3: VINEWOOD MOUNTAIN SWITCHBACK ROAD & GALILEO WHITE OBSERVATORY
    //         Switchback Touge Climb: Z = -208 -> -215.5 -> Hairpin -> -228 -> y = 28m
    //         Galileo Domed White Observatory & Panoramic Terrace: X in [28, 84], Z in [-256, -229.5]
    // ========================================================================
    {
      // 1) Lower Entrance Stone Pylons & Sign Plaque off Z = -200 Côn Lôn Tiên Sơn Avenue at (26, 0.22, -208)
      for (const [gx, gz] of [[20.2, -208.5], [30.8, -208.5]]) {
        batch.add('concrete', mats.concrete, uBox, gx, 1.85, gz, 0, 0, 0, 1.65, 3.7, 1.65, COL.travertine, true, true);
        batch.add('concrete', mats.concrete, uBox, gx, 3.85, gz, 0, 0, 0, 2.05, 0.36, 2.05, COL.stuccoWhite, true, true);
        batch.add('emissive', mats.emissive, uSphere, gx, 4.35, gz, 0, 0, 0, 0.56, 0.56, 0.56, COL.warmLamp, false, false);
        registerInfraAABB(gx - 0.9, gx + 0.9, gz - 0.9, gz + 0.9, 4.2, 0, 'obs_gate_pillar');
      }
      // Entrance directional monument sign (Row 6: "ĐÀI THIÊN VĂN ĐỒI VINEWOOD")
      batch.add('concrete', mats.concrete, uBox, 18.2, 1.45, -212.5, 0, 0.35, 0, 4.8, 2.4, 0.65, COL.ashlarStone, true, true);
      const obsEntrySign = createAtlasSignPlaneGeometry(4.3, 1.35, 6, 8, true);
      batch.add('signAtlas', mats.signAtlas, obsEntrySign, 18.2, 1.65, -212.5, 0, 0.35, 0, 1, 1, 1, null, true, false);

      // 2) Winding 2-Leg Paved Mountain Touge Road + Retaining Walls + Hillside Viaduct Arches!
      const obsSurfGeo = createRibbonRoadSurfaceGeometry(obsRoadNodes, 11.2, 14.0, 0.03);
      batch.add('twoLaneRoad', mats.twoLaneRoad, obsSurfGeo, 0, 0, 0, 0, 0, 0, 1, 1, 1, null, false, true);

      const obsDeckProf = [
        [-6.05, 0.01],
        [6.05, 0.01],
        [5.85, -1.35],
        [-5.85, -1.35],
      ];
      const obsParapetLeft = [
        [-6.05, 0.0],
        [-5.62, 0.0],
        [-5.62, 0.88],
        [-6.05, 0.88],
      ];
      const obsParapetRight = [
        [5.62, 0.0],
        [6.05, 0.0],
        [6.05, 0.88],
        [5.62, 0.88],
      ];
      batch.add('concrete', mats.concrete, createSweptProfileGeometry(obsRoadNodes, obsDeckProf, true), 0, 0, 0, 0, 0, 0, 1, 1, 1, COL.ashlarStone, true, true);
      batch.add('concrete', mats.concrete, createSweptProfileGeometry(obsRoadNodes, obsParapetLeft, true), 0, 0, 0, 0, 0, 0, 1, 1, 1, COL.travertine, true, true);
      batch.add('concrete', mats.concrete, createSweptProfileGeometry(obsRoadNodes, obsParapetRight, true), 0, 0, 0, 0, 0, 0, 1, 1, 1, COL.travertine, true, true);

      // Stone Viaduct Support Buttresses & Vintage Cast-Iron Hilltop Lampposts along the Switchback Climb
      for (let i = 3; i < obsRoadNodes.length - 2; i += 3) {
        const on = obsRoadNodes[i];
        if (on.y > 2.2) {
          const pierH = on.y - 0.6;
          batch.add('concrete', mats.concrete, uBox, on.x, pierH * 0.5, on.z, 0, on.yaw, 0, 10.6, pierH, 1.95, COL.ashlarStone, true, true);
          batch.add('concrete', mats.concrete, uBox, on.x, on.y - 1.35, on.z, 0, on.yaw, 0, 11.8, 0.55, 2.45, COL.travertine, false, true);
        }
        // Ornate bronze/black globe streetlamps on outer city-view parapet
        const lx = on.x + on.rx * 5.82;
        const lz = on.z + on.rz * 5.82;
        batch.add('metal', mats.metal, uCyl, lx, on.y + 2.45, lz, 0, 0, 0, 0.14, 3.2, 0.14, COL.steelDark, true, false);
        batch.add('emissive', mats.emissive, uSphere, lx, on.y + 4.18, lz, 0, 0, 0, 0.42, 0.42, 0.42, COL.warmLamp, false, false);
      }

      // Scenic Hairpin Vista Turnaround Overlook Apron at (105.0, 16.4, -221.8)
      batch.add('concrete', mats.concrete, uCyl, 104.5, 8.2, -221.8, 0, 0, 0, 22.8, 16.6, 21.5, COL.ashlarStone, true, true);
      batch.add('concrete', mats.concrete, uCyl, 104.5, 16.52, -221.8, 0, 0, 0, 23.4, 0.45, 22.0, COL.travertine, false, true);

      // 3) Monumental 56m x 27.0m Galileo Observatory Cliffside Terrace at y = 28.0m!
      //    Bounds: X in [28.0, 84.0], Z in [-256.5, -229.5], Deck Y = 28.0m
      {
        const terCenterX = 56.0;
        const terCenterZ = -243.0;
        const terW = 56.0;
        const terD = 27.0;

        // Massive Masonry Foundation Substructure & 8 Vaulted Roman/Art-Deco Cliffside Arcade Buttresses!
        batch.add('concrete', mats.concrete, uBox, terCenterX, 13.8, terCenterZ, 0, 0, 0, terW - 1.2, 27.6, terD - 1.2, COL.ashlarStone, true, true);
        // Travertine top slab + projecting molded classical cornice ledge at y = 28.0m
        batch.add('concrete', mats.concrete, uBox, terCenterX, OBSERVATORY_TERRACE_Y - 0.28, terCenterZ, 0, 0, 0, terW + 0.8, 0.56, terD + 0.8, COL.travertine, true, true);
        batch.add('concrete', mats.concrete, uBox, terCenterX, OBSERVATORY_TERRACE_Y - 1.15, terCenterZ, 0, 0, 0, terW + 1.4, 0.48, terD + 1.4, COL.stuccoWhite, true, true);

        // 9 Projecting South-Face Stone Buttress Pilasters & Recessed Shadow Arches facing Downtown!
        for (let bx = 30.0; bx <= 82.0; bx += 6.5) {
          batch.add('concrete', mats.concrete, uBox, bx, 13.6, -229.4, 0, 0, 0, 1.55, 27.2, 1.85, COL.travertine, true, true);
          batch.add('concrete', mats.concrete, uBox, bx, 2.2, -228.5, -0.18, 0, 0, 1.85, 6.5, 2.2, COL.ashlarStone, true, true);
          if (bx < 80.0) {
            // Arch crown spandrel between pilasters
            batch.add('concrete', mats.concrete, uCyl, bx + 3.25, 23.8, -229.6, Math.PI * 0.5, 0, 0, 4.8, 1.1, 4.8, COL.stuccoWhite, false, true);
          }
        }
        // Register solid cliffside foundation AABB (from y = 0 up to y = 27.85m so ground cars can't drive through cliff, while y = 28.0m terrace is 100% drivable!)
        registerInfraAABB(28.0, 84.0, -256.5, -229.5, OBSERVATORY_TERRACE_Y - 0.15, 0.0, 'observatory_cliff_base');

        // Ornate Classical Stone Balustrades around West, South & East Terrace Edges!
        //   - East side leaves open throat Z in [-239, -230] for Switchback Road Leg 2 arrival!
        //   - South side leaves open 7.2m launch throat X in [40.4, 47.6] for Monster Ngự Phong Phi Độ #12!
        const balY = OBSERVATORY_TERRACE_Y;
        for (let sx = 28.5; sx <= 83.5; sx += 2.2) {
          // Skip Stunt #12 Mega-Jump launch chute at X in [40.2, 47.8]!
          if (sx >= 40.2 && sx <= 47.8) continue;
          batch.add('concrete', mats.concrete, uBox, sx, balY + 0.52, -229.8, 0, 0, 0, 0.36, 1.04, 0.36, COL.stuccoWhite, true, true);
          batch.add('concrete', mats.concrete, uCyl, sx + 1.1, balY + 0.48, -229.8, 0, 0, 0, 0.22, 0.85, 0.22, COL.travertine, false, false);
        }
        // Continuous South balustrade top handrails (split around X in [40.2, 47.8])
        batch.add('concrete', mats.concrete, uBox, 34.1, balY + 1.02, -229.8, 0, 0, 0, 11.8, 0.22, 0.48, COL.stuccoWhite, true, true);
        batch.add('concrete', mats.concrete, uBox, 65.8, balY + 1.02, -229.8, 0, 0, 0, 35.8, 0.22, 0.48, COL.stuccoWhite, true, true);
        registerInfraAABB(28.0, 40.0, -230.2, -229.3, balY + 1.25, balY - 0.2, 'guardrail');
        registerInfraAABB(48.0, 84.0, -230.2, -229.3, balY + 1.25, balY - 0.2, 'guardrail');

        // West Terrace Balustrade (X = 28.3, Z in [-256.0, -229.8])
        batch.add('concrete', mats.concrete, uBox, 28.3, balY + 0.55, -242.8, 0, 0, 0, 0.48, 1.10, 26.2, COL.stuccoWhite, true, true);
        registerInfraAABB(27.9, 28.8, -256.2, -229.5, balY + 1.25, balY - 0.2, 'guardrail');

        // Decorative Compass-Rose Marble & Brass Inlay Mosaic in Center Forecourt (60.0, 28.02, -236.5)
        const monX = 60.0;
        const monZ = -236.5;
        const mosaicRing = new THREE.RingGeometry(4.2, 4.85, 32);
        mosaicRing.rotateX(-Math.PI * 0.5);
        batch.add('metal', mats.metal, mosaicRing, monX, balY + 0.03, monZ, 0, 0, 0, 1, 1, 1, COL.brass, false, true);
        batch.add('marble', mats.marble, uCyl, monX, balY + 0.02, monZ, 0, 0, 0, 8.4, 0.04, 8.4, COL.stuccoWhite, false, true);

        // Iconic Art-Deco Astronomers Obelisk & Bronze Armillary Sphere Sundial at (60.0, 28.0, -236.5)!
        batch.add('concrete', mats.concrete, uOctCyl, monX, balY + 0.35, monZ, 0, 0, 0, 3.4, 0.70, 3.4, COL.travertine, true, true);
        batch.add('concrete', mats.concrete, uOctCyl, monX, balY + 2.35, monZ, 0, 0, 0, 1.55, 3.4, 1.55, COL.stuccoWhite, true, true);
        batch.add('concrete', mats.concrete, uCone, monX, balY + 4.55, monZ, 0, Math.PI * 0.25, 0, 1.45, 1.15, 1.45, COL.stuccoWhite, true, false);
        // Intersecting bronze celestial armillary rings atop the obelisk!
        batch.add('metal', mats.metal, uTorus, monX, balY + 5.75, monZ, 0.35, 0.2, 0, 1.65, 1.65, 1.65, COL.brass, true, false);
        batch.add('metal', mats.metal, uTorus, monX, balY + 5.75, monZ, -0.55, 1.2, 0.4, 1.52, 1.52, 1.52, COL.gold24k, true, false);
        batch.add('metal', mats.metal, uCyl, monX, balY + 5.75, monZ, 0.62, 0, 0, 0.07, 2.45, 0.07, COL.gold24k, false, false);
        registerInfraAABB(monX - 1.5, monX + 1.5, monZ - 1.5, monZ + 1.5, balY + 6.5, balY, 'astronomers_obelisk');

        // 5 Chrome Coin-Operated Panoramic Viewing Binoculars along the South Overlook Balustrade!
        for (const tx of [33.5, 52.0, 58.0, 66.0, 74.0]) {
          batch.add('metal', mats.metal, uCyl, tx, balY + 0.72, -230.8, 0, 0, 0, 0.14, 1.44, 0.14, COL.chrome, true, false);
          batch.add('metal', mats.metal, uBox, tx, balY + 1.46, -230.75, 0.15, 0, 0, 0.36, 0.20, 0.52, COL.chrome, true, false);
        }

        // 4) Griffith / Galileo-Style 3-Dome White Neoclassical Observatory Building!
        //    Footprint: X in [34.0, 82.0], Z in [-260.2, -247.2], Base Y = 28.65m (leaves (68, 28, -245) wide-open plaza!)
        const obsX = 58.0;
        const obsY = OBSERVATORY_TERRACE_Y + 0.65; // 28.65m raised stylobate
        const obsZ = -253.8;

        // Wide Limestone Entrance Stylobate Steps (X in [46, 70], Z in [-248.8, -246.5])
        for (let st = 0; st < 4; st++) {
          const sy = OBSERVATORY_TERRACE_Y + (st + 0.5) * 0.16;
          const sz = -246.7 - st * 0.55;
          batch.add('concrete', mats.concrete, uBox, obsX, sy, sz, 0, 0, 0, 22.0 - st * 0.6, 0.18, 2.6, COL.travertine, false, true);
        }

        // Main Symmetrical Beaux-Arts White Stucco Exhibition Wings & Central Octagonal Planetarium Drum
        batch.add('concrete', mats.concrete, uBox, obsX, obsY + 4.1, obsZ, 0, 0, 0, 44.0, 8.2, 11.4, COL.stuccoWhite, true, true);
        // Molded Art-Deco Roof Parapet & Fluted Pilasters across the South Facade
        batch.add('concrete', mats.concrete, uBox, obsX, obsY + 8.35, obsZ, 0, 0, 0, 45.2, 0.65, 12.2, COL.travertine, true, true);
        for (let px = 37.5; px <= 78.5; px += 4.55) {
          batch.add('concrete', mats.concrete, uBox, px, obsY + 4.1, obsZ + 5.78, 0, 0, 0, 0.65, 8.0, 0.36, COL.travertine, true, false);
          if (px < 76.0 && Math.abs(px - obsX) > 6.5) {
            batch.add('glass', mats.glass, uBox, px + 2.27, obsY + 4.2, obsZ + 5.72, 0, 0, 0, 2.2, 4.6, 0.14, null, false, false);
          }
        }

        // 6-Column Classical Corinthian Entrance Portico + Bronze Doors + Observatory Plaque!
        batch.add('concrete', mats.concrete, uBox, obsX, obsY + 7.6, obsZ + 6.9, 0, 0, 0, 14.2, 1.15, 3.2, COL.travertine, true, true);
        for (let ci = 0; ci < 6; ci++) {
          const cx = obsX - 5.75 + ci * 2.3;
          batch.add('concrete', mats.concrete, classicalColGeo, cx, obsY, obsZ + 7.95, 0, 0, 0, 7.1, 7.1, 7.1, COL.stuccoWhite, true, true);
        }
        // Bronze Main Entrance Double Doors
        batch.add('metal', mats.metal, uBox, obsX, obsY + 2.45, obsZ + 5.75, 0, 0, 0, 3.4, 4.8, 0.25, COL.brass, true, false);
        const obsBuildingSign = createAtlasSignPlaneGeometry(11.6, 1.45, 6, 8, false);
        batch.add('signAtlas', mats.signAtlas, obsBuildingSign, obsX, obsY + 7.62, obsZ + 8.55, 0, 0, 0, 1, 1, 1, null, false, false);

        // Central Giant 13.2m Rotunda Drum + Iconic Verdigris-Copper & White Planetarium Dome (peaks at y = 46.2m!)
        batch.add('concrete', mats.concrete, uCyl, obsX, obsY + 10.2, obsZ - 0.5, 0, 0, 0, 14.4, 4.4, 14.4, COL.stuccoWhite, true, true);
        const centerDomeGeo = createObservatoryDomeGeometry(6.85, 1.85);
        batch.add('metal', mats.metal, centerDomeGeo, obsX, obsY + 12.3, obsZ - 0.5, 0, 0.15, 0, 1, 1, 1, COL.copperDome, true, true);

        // East (X = 76.5) & West (X = 39.5) Cylindrical Astronomical Turrets + 8.2m Copper Telescope Domes!
        const sideDomeGeo = createObservatoryDomeGeometry(4.25, 1.35);
        for (const [dx, rotY] of [[39.5, -0.45], [76.5, 0.48]]) {
          batch.add('concrete', mats.concrete, uCyl, dx, obsY + 5.6, obsZ + 0.8, 0, 0, 0, 9.2, 11.2, 9.2, COL.stuccoWhite, true, true);
          batch.add('metal', mats.metal, sideDomeGeo, dx, obsY + 11.1, obsZ + 0.8, 0, rotY, 0, 1, 1, 1, COL.copperDome, true, true);

          // Giant Brass & Pearl-White Refracting Telescope Optical Tube aiming skyward through each open dome slot!
          const scopeX = dx + Math.sin(rotY) * 1.35;
          const scopeZ = obsZ + 0.8 + Math.cos(rotY) * 1.35;
          batch.add('metal', mats.metal, uCyl, scopeX, obsY + 13.1, scopeZ, -0.78, rotY, 0, 0.72, 5.4, 0.72, COL.yachtWhite, true, false);
          batch.add('metal', mats.metal, uCyl, scopeX + Math.sin(rotY) * 1.9, obsY + 14.8, scopeZ + Math.cos(rotY) * 1.9, -0.78, rotY, 0, 0.82, 0.65, 0.82, COL.brass, true, false);
        }

        // Solid collision AABB for the Observatory Building (y = 28.0 .. 46.5m)
        registerInfraAABB(34.5, 81.5, -260.2, -247.4, 46.5, OBSERVATORY_TERRACE_Y - 0.5, 'galileo_observatory');
      }
    }

    // ========================================================================
    // ZONE 4: WALK-IN "NGÂN HÀNG TRUNG ƯƠNG PACIFIC STANDARD"
    //         4A. Exterior Neoclassical Marble Portico & Corona at (111, 0.22, -120)
    //         4B. Furnished 36m x 30m Walk-In Vault Interior at (2100, 0, 2100)
    // ========================================================================
    {
      // ----------------------------------------------------------------------
      // 4A. EXTERIOR NEOCLASSICAL MARBLE PILLAR FACADE & ENTRY CORONA
      //     Placed cleanly on sidewalk block X in [99.2, 111.0], Z in [-151.0, -128.8]
      //     facing South-East onto the (111, 0.22, -120) Bank Corona without blocking traffic!
      // ----------------------------------------------------------------------
      const bExtX = 105.0;
      const bExtZ = -139.5;
      const porticoZ = -129.1; // Strictly North of Z = -128 street edge!

      // Monumental Rusticated Granite & Carrara Marble Temple Facade Mass
      batch.add('marble', mats.marble, uBox, bExtX, 7.6, bExtZ, 0, 0, 0, 11.4, 14.8, 20.6, COL.stuccoWhite, true, true);
      batch.add('concrete', mats.concrete, uBox, bExtX, 15.35, bExtZ, 0, 0, 0, 12.2, 0.95, 21.4, COL.travertine, true, true);
      batch.add('concrete', mats.concrete, uBox, bExtX, 0.62, porticoZ + 0.35, 0, 0, 0, 11.8, 0.82, 2.4, COL.concreteLight, false, true);

      // 6 Towering 10.5m Fluted Corinthian Marble Columns along South & East Corner Colonnades!
      for (let ci = 0; ci < 4; ci++) {
        const cx = 100.2 + ci * 3.2;
        batch.add('marble', mats.marble, classicalColGeo, cx, 0.85, porticoZ + 0.65, 0, 0, 0, 10.2, 10.2, 10.2, COL.stuccoWhite, true, true);
      }
      for (let ez = -133.5; ez >= -146.5; ez -= 4.3) {
        batch.add('marble', mats.marble, classicalColGeo, 110.85, 0.45, ez, 0, 0, 0, 10.6, 10.6, 10.6, COL.stuccoWhite, true, true);
      }

      // Classical Entablature + Carved Triangular Pediment + Gilded Crest Emblem facing South (-Z -> +Z street)
      batch.add('concrete', mats.concrete, uBox, bExtX, 11.65, porticoZ + 0.55, 0, 0, 0, 12.0, 1.45, 2.2, COL.travertine, true, true);
      // Sloped Left & Right Pediment Raking Cornices + Tympanum Gold Crest
      batch.add('concrete', mats.concrete, uBox, bExtX - 3.05, 13.35, porticoZ + 0.62, 0, 0, 0.32, 6.5, 0.48, 1.95, COL.stuccoWhite, true, true);
      batch.add('concrete', mats.concrete, uBox, bExtX + 3.05, 13.35, porticoZ + 0.62, 0, 0, -0.32, 6.5, 0.48, 1.95, COL.stuccoWhite, true, true);
      batch.add('metal', mats.metal, uTorus, bExtX, 13.05, porticoZ + 1.58, 0, 0, 0, 1.55, 1.55, 1.55, COL.gold24k, false, false);
      batch.add('metal', mats.metal, uSphere, bExtX, 13.05, porticoZ + 1.58, 0, 0, 0, 0.88, 0.88, 0.35, COL.gold24k, false, false);

      // Emerald & Gold "NGÂN HÀNG TRUNG ƯƠNG PACIFIC STANDARD" Frieze Signboards (South & East faces!)
      const bankSignSouth = createAtlasSignPlaneGeometry(10.8, 1.42, 4, 8, false);
      batch.add('signAtlas', mats.signAtlas, bankSignSouth, bExtX, 11.65, porticoZ + 1.70, 0, 0, 0, 1, 1, 1, null, false, false);
      const bankSignEast = createAtlasSignPlaneGeometry(14.5, 1.55, 4, 8, false);
      batch.add('signAtlas', mats.signAtlas, bankSignEast, 111.38, 11.85, bExtZ, 0, Math.PI * 0.5, 0, 1, 1, 1, null, false, false);

      // Heavy Bronze Bank Double Entrance Doors + Flanking Gilded Wall Lanterns
      batch.add('metal', mats.metal, uBox, bExtX + 1.5, 3.1, porticoZ + 0.12, 0, 0, 0, 3.4, 5.2, 0.32, COL.brass, true, false);
      batch.add('metal', mats.metal, uBox, bExtX + 1.5, 3.1, porticoZ + 0.30, 0, 0, 0, 0.18, 4.8, 0.12, COL.gold24k, false, false);
      for (const lx of [bExtX - 0.8, bExtX + 3.8]) {
        batch.add('emissive', mats.emissive, uSphere, lx, 4.35, porticoZ + 0.48, 0, 0, 0, 0.42, 0.55, 0.42, COL.warmLamp, false, false);
      }

      registerInfraAABB(99.2, 111.2, -150.2, -129.0, 16.0, 0.0, 'pacific_standard_bank_ext');

      // Pulsing Emerald & Gold Exterior Entry Corona at Exact Required Coordinate (111.0, 0.22, -120.0)!
      bankExteriorCoronaGroup = new THREE.Group();
      bankExteriorCoronaGroup.position.set(BANK_EXT_POS.x, BANK_EXT_POS.y + 0.03, BANK_EXT_POS.z);

      const coronaRingsGeo = mergeInfraBufferGeometries([
        { geo: new THREE.RingGeometry(1.45, 1.92, 32), matrix: makeMat4(0, 0, 0, -Math.PI * 0.5, 0, 0), color: new THREE.Color(0x10b981) },
        { geo: new THREE.RingGeometry(0.85, 1.15, 28), matrix: makeMat4(0, 0.02, 0, -Math.PI * 0.5, 0, 0), color: new THREE.Color(0xfacc15) },
      ]);
      const extRingsMesh = new THREE.Mesh(
        coronaRingsGeo,
        new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.88, side: THREE.DoubleSide })
      );
      bankExteriorCoronaGroup.add(extRingsMesh);

      const extCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(1.68, 1.68, 2.85, 28, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.26,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      extCyl.position.y = 1.42;
      bankExteriorCoronaGroup.add(extCyl);
      infraRoot.add(bankExteriorCoronaGroup);

      // ----------------------------------------------------------------------
      // 4B. FURNISHED 36m x 30m WALK-IN BANK INTERIOR AT (2100, 0, 2100)!
      //     Bounds: X in [2082.0, 2118.0] (36m), Z in [2085.0, 2115.0] (30m), Height = 9.4m
      //     Zones inside (2100, 0, 2100):
      //       - Grand Marble Lobby & Crystal Skylight: Z in [2099.6, 2115.0]
      //       - 6 Armored Teller Cages & Raised Dais: Z in [2096.2, 2099.6] (Left & Right of center arch)
      //       - High-Security Red Laser Corridor: X in [2096.8, 2103.2], Z in [2091.8, 2099.6]
      //       - Massive Hinged Circular Steel Vault Door: (2100.0, 2.35, 2091.8)
      //       - Bullion & Cash Vault Chamber: X in [2090.6, 2109.4], Z in [2085.0, 2091.8]
      // ----------------------------------------------------------------------
      {
        const bx = BANK_INT_ORIGIN.x; // 2100.0
        const bz = BANK_INT_ORIGIN.z; // 2100.0
        const roomW = 36.0;
        const roomD = 30.0;
        const roomH = 9.4;

        // 1) Checkered Carrara & Nero Gold-Veined Marble Lobby Floor + Perimeter Walls + Coffered Ceiling
        bankBatch.add('marble', mats.marble, uBox, bx, -0.18, bz, 0, 0, 0, roomW + 1.0, 0.38, roomD + 1.0, COL.stuccoWhite, false, true);

        // Outer structural walls (West X=2082, East X=2118, North Z=2085, South Z=2115)
        bankBatch.add('concrete', mats.concrete, uBox, bx - roomW * 0.5 - 0.25, roomH * 0.5, bz, 0, 0, 0, 0.5, roomH, roomD + 1.0, COL.travertine, false, true);
        bankBatch.add('concrete', mats.concrete, uBox, bx + roomW * 0.5 + 0.25, roomH * 0.5, bz, 0, 0, 0, 0.5, roomH, roomD + 1.0, COL.travertine, false, true);
        bankBatch.add('concrete', mats.concrete, uBox, bx, roomH * 0.5, bz - roomD * 0.5 - 0.25, 0, 0, 0, roomW + 1.0, roomH, 0.5, COL.concreteDark, false, true);
        bankBatch.add('concrete', mats.concrete, uBox, bx, roomH * 0.5, bz + roomD * 0.5 + 0.25, 0, 0, 0, roomW + 1.0, roomH, 0.5, COL.travertine, false, true);

        // Mahogany Wainscoting & Gilded Crown Moldings around Grand Lobby
        for (const sx of [-roomW * 0.5 + 0.12, roomW * 0.5 - 0.12]) {
          bankBatch.add('wood', mats.wood, uBox, bx + sx, 1.15, 2107.2, 0, 0, 0, 0.18, 2.3, 15.6, COL.mahogany, false, true);
          bankBatch.add('metal', mats.metal, uBox, bx + sx, 2.35, 2107.2, 0, 0, 0, 0.22, 0.12, 15.6, COL.gold24k, false, false);
        }

        // Register Perimeter Interior Wall AABBs
        registerInfraAABB(2081.2, 2082.2, 2084.5, 2115.5, 10.0, -1.0, 'bank_wall_w', true);
        registerInfraAABB(2117.8, 2118.8, 2084.5, 2115.5, 10.0, -1.0, 'bank_wall_e', true);
        registerInfraAABB(2081.2, 2118.8, 2084.2, 2085.2, 10.0, -1.0, 'bank_wall_n', true);
        registerInfraAABB(2081.2, 2118.8, 2114.8, 2115.8, 10.0, -1.0, 'bank_wall_s', true);

        // 2) Coffered Ceiling & Vaulted Crystal Skylight Atrium (X in [2091, 2109], Z in [2102, 2112], y = 9.4..11.8m)!
        //    Outer ceiling slabs framing the 18m x 10m central Crystal Skylight opening
        bankBatch.add('concrete', mats.concrete, uBox, bx, roomH + 0.2, 2093.5, 0, 0, 0, roomW + 0.8, 0.4, 17.0, COL.stuccoWhite, false, false);
        bankBatch.add('concrete', mats.concrete, uBox, bx, roomH + 0.2, 2113.5, 0, 0, 0, roomW + 0.8, 0.4, 3.2, COL.stuccoWhite, false, false);
        bankBatch.add('concrete', mats.concrete, uBox, 2086.5, roomH + 0.2, 2107.0, 0, 0, 0, 9.2, 0.4, 10.2, COL.stuccoWhite, false, false);
        bankBatch.add('concrete', mats.concrete, uBox, 2113.5, roomH + 0.2, 2107.0, 0, 0, 0, 9.2, 0.4, 10.2, COL.stuccoWhite, false, false);

        // Vaulted Barrel/Pyramid Crystal Skylight Glass Canopy & Gilded Muntin Ribs!
        const skyCenterZ = 2107.0;
        bankBatch.add('metal', mats.metal, uBox, bx, roomH + 0.25, skyCenterZ, 0, 0, 0, 18.4, 0.35, 10.4, COL.gold24k, false, false);
        bankBatch.add('glass', mats.glass, uBox, bx, roomH + 1.45, skyCenterZ - 2.6, 0.42, 0, 0, 18.0, 0.14, 5.8, null, false, false);
        bankBatch.add('glass', mats.glass, uBox, bx, roomH + 1.45, skyCenterZ + 2.6, -0.42, 0, 0, 18.0, 0.14, 5.8, null, false, false);
        bankBatch.add('emissive', mats.emissive, uBox, bx, roomH + 2.45, skyCenterZ, 0, 0, 0, 17.6, 0.18, 2.2, COL.warmLamp, false, false);
        for (let rx = 2091.5; rx <= 2108.5; rx += 2.83) {
          bankBatch.addStrut('metal', mats.metal, uBox, rx, roomH + 0.3, skyCenterZ - 5.1, rx, roomH + 2.4, skyCenterZ, 0.14, 0.14, COL.gold24k);
          bankBatch.addStrut('metal', mats.metal, uBox, rx, roomH + 0.3, skyCenterZ + 5.1, rx, roomH + 2.4, skyCenterZ, 0.14, 0.14, COL.gold24k);
        }

        // 3) 2 Ornate Tiered Crystal & Brass Chandeliers + Warm Indoor PointLights!
        for (const czPos of [2104.2, 2109.8]) {
          for (const cxPos of [2093.5, 2106.5]) {
            bankBatch.add('metal', mats.metal, uCyl, cxPos, roomH - 0.9, czPos, 0, 0, 0, 0.08, 1.8, 0.08, COL.gold24k, false, false);
            bankBatch.add('metal', mats.metal, uTorus, cxPos, roomH - 1.75, czPos, Math.PI * 0.5, 0, 0, 2.2, 2.2, 2.2, COL.gold24k, false, false);
            bankBatch.add('metal', mats.metal, uTorus, cxPos, roomH - 2.15, czPos, Math.PI * 0.5, 0, 0, 1.35, 1.35, 1.35, COL.gold24k, false, false);
            bankBatch.add('emissive', mats.emissive, uSphere, cxPos, roomH - 1.95, czPos, 0, 0, 0, 1.15, 0.65, 1.15, COL.warmLamp, false, false);
          }
        }
        const lobbyLight = new THREE.PointLight(0xfff2d6, 1.85, 38);
        lobbyLight.position.set(bx, 7.8, 2107.0);
        bankInteriorGroup.add(lobbyLight);

        const vaultRoomLight = new THREE.PointLight(0xe6f4ff, 1.65, 24);
        vaultRoomLight.position.set(bx, 6.2, 2088.5);
        bankInteriorGroup.add(vaultRoomLight);

        // 4) Upper VIP Mezzanine Balcony Gallery along South, East & West Lobby Walls (y = 5.2m)
        bankBatch.add('marble', mats.marble, uBox, bx, 5.15, 2113.4, 0, 0, 0, roomW - 0.6, 0.32, 3.1, COL.stuccoWhite, false, true);
        bankBatch.add('metal', mats.metal, uBox, bx, 5.82, 2111.9, 0, 0, 0, roomW - 0.8, 0.95, 0.12, COL.brass, false, false);
        for (const sideX of [2084.2, 2115.8]) {
          bankBatch.add('marble', mats.marble, uBox, sideX, 5.15, 2106.5, 0, 0, 0, 4.2, 0.32, 11.2, COL.stuccoWhite, false, true);
          const railX = sideX < bx ? sideX + 2.02 : sideX - 2.02;
          bankBatch.add('metal', mats.metal, uBox, railX, 5.82, 2106.5, 0, 0, 0, 0.12, 0.95, 11.2, COL.brass, false, false);
        }

        // 5) 8 Monumental Fluted Corinthian Marble Columns Framing the Grand Banking Hall!
        const lobbyColumns = [
          [2088.5, 2103.0], [2095.5, 2103.0], [2104.5, 2103.0], [2111.5, 2103.0],
          [2088.5, 2110.2], [2095.5, 2110.2], [2104.5, 2110.2], [2111.5, 2110.2],
        ];
        for (const [cx, cz] of lobbyColumns) {
          bankBatch.add('marble', mats.marble, classicalColGeo, cx, 0.02, cz, 0, 0, 0, roomH - 0.1, roomH - 0.1, roomH - 0.1, COL.stuccoWhite, true, true);
          registerInfraAABB(cx - 0.68, cx + 0.68, cz - 0.68, cz + 0.68, roomH, 0.0, 'bank_lobby_column', true);
        }

        // 6) Lobby Customer Deposit Islands, Crimson Velvet Queue Stanchions & Wall ATMs
        for (const ix of [2092.0, 2108.0]) {
          const iz = 2106.6;
          bankBatch.add('wood', mats.wood, uBox, ix, 0.56, iz, 0, 0, 0, 2.8, 1.08, 1.35, COL.mahogany, true, true);
          bankBatch.add('marble', mats.marble, uBox, ix, 1.12, iz, 0, 0, 0, 3.0, 0.08, 1.52, COL.stuccoWhite, false, true);
          // Classic green glass banker's desk lamp!
          bankBatch.add('metal', mats.metal, uCyl, ix, 1.32, iz, 0, 0, 0, 0.10, 0.36, 0.10, COL.brass, false, false);
          bankBatch.add('emissive', mats.emissive, uBox, ix, 1.50, iz, 0, 0, 0, 0.42, 0.16, 0.24, COL.limeGlow, false, false);
          registerInfraAABB(ix - 1.55, ix + 1.55, iz - 0.8, iz + 0.8, 1.4, 0.0, 'bank_writing_desk', true);
        }

        // Velvet Stanchion Queue Rope Corridor guiding patrons toward Teller Cages
        for (const qx of [2097.6, 2102.4]) {
          for (let qz = 2102.2; qz <= 2108.2; qz += 2.0) {
            bankBatch.add('metal', mats.metal, uCyl, qx, 0.50, qz, 0, 0, 0, 0.09, 0.96, 0.09, COL.gold24k, false, false);
            bankBatch.add('metal', mats.metal, uCyl, qx, 0.05, qz, 0, 0, 0, 0.34, 0.06, 0.34, COL.gold24k, false, false);
            if (qz < 2108.0) {
              bankBatch.addStrut('concrete', mats.concrete, uCyl, qx, 0.82, qz, qx, 0.82, qz + 2.0, 0.07, 0.07, COL.velvetRed);
            }
          }
        }

        // 4 Recessed Illuminated Linh Thạch Bảo Khố Wall ATMs on West & East Lobby Walls
        for (const [ax, az] of [[2082.35, 2104.5], [2082.35, 2108.5], [2117.65, 2104.5], [2117.65, 2108.5]]) {
          bankBatch.add('metal', mats.metal, uBox, ax, 1.35, az, 0, 0, 0, 0.45, 2.1, 1.15, COL.steelDark, false, false);
          bankBatch.add('emissive', mats.emissive, uBox, ax + (ax < bx ? 0.24 : -0.24), 1.52, az, 0, 0, 0, 0.05, 0.62, 0.78, COL.cyanGlow, false, false);
        }

        // Grand Bronze Front Entrance Double Doors (South Wall Z = 2114.7) + Glowing Exit Corona at (2100, 0.05, 2113.5)!
        bankBatch.add('metal', mats.metal, uBox, bx, 2.35, 2114.72, 0, 0, 0, 3.8, 4.6, 0.24, COL.brass, false, false);
        const intCrestSign = createAtlasSignPlaneGeometry(11.0, 1.45, 4, 8, false);
        bankBatch.add('signAtlas', mats.signAtlas, intCrestSign, bx, 7.35, 2099.78, 0, 0, 0, 1, 1, 1, null, false, false);

        bankExitCoronaGroup = new THREE.Group();
        bankExitCoronaGroup.position.set(bx, 0.05, 2113.5);
        const exitRing = new THREE.Mesh(
          new THREE.RingGeometry(0.95, 1.32, 28),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.86, side: THREE.DoubleSide })
        );
        exitRing.rotation.x = -Math.PI * 0.5;
        bankExitCoronaGroup.add(exitRing);
        const exitBeam = new THREE.Mesh(
          new THREE.CylinderGeometry(1.14, 1.14, 1.9, 24, 1, true),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.24, side: THREE.DoubleSide, depthWrite: false })
        );
        exitBeam.position.y = 0.95;
        bankExitCoronaGroup.add(exitBeam);
        bankInteriorGroup.add(bankExitCoronaGroup);

        // 7) 6 Armored Teller Cages (West Wing X in [2082.4, 2096.6], East Wing X in [2103.4, 2117.6], Z = 2099.6)
        //    Leaves a 6.4m central Security Archway X in [2096.8, 2103.2] leading straight to the Laser Hallway & Vault!
        for (const wing of [
          { minX: 2082.3, maxX: 2096.6, sideDoorX: 2083.5 },
          { minX: 2103.4, maxX: 2117.7, sideDoorX: 2116.5 },
        ]) {
          const wCenter = (wing.minX + wing.maxX) * 0.5;
          const wSpan = wing.maxX - wing.minX;

          // Raised marble floor behind teller counter (Z in [2096.0, 2099.6])
          bankBatch.add('marble', mats.marble, uBox, wCenter, 0.09, 2097.8, 0, 0, 0, wSpan, 0.16, 3.6, COL.stuccoWhite, false, true);
          // Heavy Mahogany & Carrara Marble Teller Counterfront at Z = 2099.6
          bankBatch.add('wood', mats.wood, uBox, wCenter, 0.58, 2099.6, 0, 0, 0, wSpan, 1.12, 0.82, COL.mahogany, true, true);
          bankBatch.add('marble', mats.marble, uBox, wCenter, 1.16, 2099.6, 0, 0, 0, wSpan + 0.16, 0.10, 0.98, COL.stuccoWhite, false, true);

          // Upper Partition Wall above Teller Cages (y = 3.4..9.4m) + Rear Partition Wall at Z = 2095.8
          bankBatch.add('concrete', mats.concrete, uBox, wCenter, 6.4, 2099.6, 0, 0, 0, wSpan, 6.0, 0.45, COL.travertine, false, true);
          bankBatch.add('concrete', mats.concrete, uBox, wCenter, 4.7, 2095.8, 0, 0, 0, wSpan, 9.4, 0.45, COL.travertine, false, true);

          // Bulletproof Laminated Glass + 3 Individual Brass-Framed Teller Windows per Wing!
          bankBatch.add('glass', mats.glass, uBox, wCenter, 2.28, 2099.6, 0, 0, 0, wSpan - 0.3, 2.15, 0.10, null, false, false);
          for (let ti = 0; ti < 3; ti++) {
            const tx = wing.minX + 2.4 + ti * 4.7;
            // Brass divider mullions, circular stainless voice grille & recessed cash deal tray
            bankBatch.add('metal', mats.metal, uBox, tx - 2.2, 2.28, 2099.6, 0, 0, 0, 0.16, 2.2, 0.24, COL.brass, false, false);
            bankBatch.add('metal', mats.metal, uBox, tx + 2.2, 2.28, 2099.6, 0, 0, 0, 0.16, 2.2, 0.24, COL.brass, false, false);
            bankBatch.add('metal', mats.metal, uCyl, tx, 1.82, 2099.6, Math.PI * 0.5, 0, 0, 0.32, 0.14, 0.32, COL.chrome, false, false);
            bankBatch.add('metal', mats.metal, uBox, tx, 1.20, 2099.6, 0, 0, 0, 0.68, 0.06, 0.52, COL.chrome, false, false);

            // Teller Workstation inside cage: PC Monitor, Cash Bill Counter, Desk Safe & Loose Cash Stacks!
            bankBatch.add('metal', mats.metal, uBox, tx - 0.65, 1.48, 2098.8, 0, 0.22, 0, 0.62, 0.42, 0.06, COL.steelDark, false, false);
            bankBatch.add('emissive', mats.emissive, uBox, tx - 0.65, 1.48, 2098.76, 0, 0.22, 0, 0.56, 0.36, 0.02, COL.cyanGlow, false, false);
            bankBatch.add('concrete', mats.concrete, uBox, tx + 0.65, 1.32, 2098.85, 0, 0, 0, 0.42, 0.26, 0.34, COL.concreteLight, false, false);
            bankBatch.add('concrete', mats.concrete, uBox, tx + 0.15, 1.24, 2099.0, 0, 0.1, 0, 0.34, 0.09, 0.20, COL.cashGreen, false, false);
            bankBatch.add('metal', mats.metal, uBox, tx, 0.65, 2096.45, 0, 0, 0, 1.35, 1.15, 0.68, COL.steelDark, false, true);
          }

          registerInfraAABB(wing.minX, wing.maxX, 2099.1, 2100.1, 9.4, 0.0, 'bank_teller_counter', true);
          registerInfraAABB(wing.minX, wing.maxX, 2095.5, 2096.1, 9.4, 0.0, 'bank_teller_backwall', true);
        }

        // Central Security Archway Header above X in [2096.6, 2103.4], Z = 2099.6 (opening height 4.4m)
        bankBatch.add('concrete', mats.concrete, uBox, bx, 6.9, 2099.6, 0, 0, 0, 7.0, 5.0, 0.65, COL.travertine, false, true);

        // 8) High-Security Red Laser Hallway (X in [2096.8, 2103.2], Z in [2091.8, 2099.6])!
        for (const sideX of [2096.6, 2103.4]) {
          bankBatch.add('concrete', mats.concrete, uBox, sideX, roomH * 0.5, 2095.7, 0, 0, 0, 0.48, roomH, 8.0, COL.concreteDark, false, true);
          registerInfraAABB(sideX - 0.28, sideX + 0.28, 2091.6, 2099.6, roomH, 0.0, 'bank_corridor_wall', true);
        }
        // Riveted Steel Blast Portal Ribs & Ceiling CCTV Cameras inside Security Corridor
        for (const rz of [2098.2, 2095.6, 2093.2]) {
          bankBatch.add('metal', mats.metal, uBox, 2096.92, 2.35, rz, 0, 0, 0, 0.26, 4.7, 0.35, COL.steelDark, false, false);
          bankBatch.add('metal', mats.metal, uBox, 2103.08, 2.35, rz, 0, 0, 0, 0.26, 4.7, 0.35, COL.steelDark, false, false);
          bankBatch.add('metal', mats.metal, uBox, bx, 4.65, rz, 0, 0, 0, 6.4, 0.32, 0.35, COL.steelDark, false, false);
          // Emitter nodes on corridor walls
          bankBatch.add('emissive', mats.emissive, uSphere, 2097.06, 1.35, rz, 0, 0, 0, 0.14, 0.14, 0.14, COL.beaconRed, false, false);
          bankBatch.add('emissive', mats.emissive, uSphere, 2102.94, 1.35, rz, 0, 0, 0, 0.14, 0.14, 0.14, COL.beaconRed, false, false);
        }

        // Interactive Biometric Keypad & Vault Thermal-Drill Control Console at (2102.45, 1.38, 2092.45)
        bankBatch.add('metal', mats.metal, uBox, 2102.45, 1.38, 2092.35, 0, 0, 0, 0.82, 1.15, 0.32, COL.steelDark, false, false);
        bankBatch.add('emissive', mats.emissive, uBox, 2102.45, 1.54, 2092.52, 0, 0, 0, 0.56, 0.38, 0.04, COL.limeGlow, false, false);

        // Animated Crisscrossing Red Security Laser Grid (10 Glowing Laser Beams!)
        securityLaserGroup = new THREE.Group();
        securityLaserGroup.name = 'BankSecurityLasers';
        const laserGeo = new THREE.CylinderGeometry(0.022, 0.022, 6.0, 6);
        laserGeo.rotateZ(Math.PI * 0.5);
        const laserMat = new THREE.MeshBasicMaterial({
          color: 0xff1e2d,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });

        const laserConfigs = [
          { z: 2097.8, baseY: 0.85, ampY: 0.55, speed: 1.8, tiltZ: 0.08, phase: 0.0 },
          { z: 2097.8, baseY: 1.95, ampY: 0.45, speed: -1.5, tiltZ: -0.08, phase: 1.4 },
          { z: 2096.2, baseY: 1.25, ampY: 0.65, speed: 2.2, tiltZ: 0.16, phase: 0.8 },
          { z: 2096.2, baseY: 2.35, ampY: 0.35, speed: -1.9, tiltZ: -0.14, phase: 2.5 },
          { z: 2094.6, baseY: 0.72, ampY: 0.48, speed: 2.5, tiltZ: -0.10, phase: 1.9 },
          { z: 2094.6, baseY: 1.68, ampY: 0.52, speed: -2.1, tiltZ: 0.12, phase: 3.1 },
          { z: 2093.3, baseY: 1.05, ampY: 0.60, speed: 1.9, tiltZ: 0.0, phase: 0.4 },
          { z: 2093.3, baseY: 2.10, ampY: 0.40, speed: -1.7, tiltZ: 0.05, phase: 2.1 },
        ];
        for (let li = 0; li < laserConfigs.length; li++) {
          const lc = laserConfigs[li];
          const beam = new THREE.Mesh(laserGeo, laserMat);
          beam.position.set(bx, lc.baseY, lc.z);
          beam.rotation.z = lc.tiltZ;
          securityLaserGroup.add(beam);
          securityLaserBeams.push({ mesh: beam, ...lc });
        }
        bankInteriorGroup.add(securityLaserGroup);

        // 9) MASSIVE CIRCULAR STEEL BANK VAULT DOOR & ARMORED VESTIBULE WALL AT Z = 2091.8!
        //    Vault Chamber occupies X in [2090.6, 2109.4], Z in [2085.0, 2091.8]
        //    Left & Right solid 1.2m-thick reinforced concrete/steel vault walls flanking the 4.2m circular doorway!
        bankBatch.add('metal', mats.metal, uBox, 2094.0, roomH * 0.5, 2091.8, 0, 0, 0, 7.6, roomH, 1.15, COL.steelDark, true, true);
        bankBatch.add('metal', mats.metal, uBox, 2106.0, roomH * 0.5, 2091.8, 0, 0, 0, 7.6, roomH, 1.15, COL.steelDark, true, true);
        bankBatch.add('metal', mats.metal, uBox, bx, 7.05, 2091.8, 0, 0, 0, 4.6, 4.7, 1.15, COL.steelDark, true, true);

        // Vault Chamber East & West Reinforced Steel Side Walls (X = 2090.4 & X = 2109.6, Z in [2085.0, 2091.8])
        bankBatch.add('metal', mats.metal, uBox, 2090.4, roomH * 0.5, 2088.4, 0, 0, 0, 0.65, roomH, 7.0, COL.steelDark, false, true);
        bankBatch.add('metal', mats.metal, uBox, 2109.6, roomH * 0.5, 2088.4, 0, 0, 0, 0.65, roomH, 7.0, COL.steelDark, false, true);

        registerInfraAABB(2090.0, 2097.8, 2091.2, 2092.4, roomH, 0.0, 'vault_front_wall_w', true);
        registerInfraAABB(2102.2, 2110.0, 2091.2, 2092.4, roomH, 0.0, 'vault_front_wall_e', true);
        registerInfraAABB(2090.0, 2090.8, 2084.8, 2092.0, roomH, 0.0, 'vault_side_wall_w', true);
        registerInfraAABB(2109.2, 2110.0, 2084.8, 2092.0, roomH, 0.0, 'vault_side_wall_e', true);

        // Dynamic Blocker AABB across the 4.4m Vault Doorway when Vault is CLOSED (automatically disabled when Vault opens!)
        vaultClosedBlockerAABB = registerInfraAABB(2097.7, 2102.3, 2091.25, 2092.35, 5.2, 0.0, 'vault_closed_door', true);

        // Stepped Brushed-Chrome Circular Vault Vestibule Ring Frame (centered at (2100.0, 2.35, 2091.8))
        const frameRing = new THREE.TorusGeometry(2.26, 0.28, 14, 36);
        bankBatch.add('metal', mats.metal, frameRing, bx, 2.35, 2092.18, 0, 0, 0, 1, 1, 1, COL.chrome, true, true);
        // Threshold steel bridge ramp across lower vault lip so players walk smoothly into the vault!
        bankBatch.add('metal', mats.metal, uBox, bx, 0.05, 2091.8, 0, 0, 0, 3.4, 0.08, 1.65, COL.steelGalv, false, true);

        // Hinged 8-Ton Circular Steel Bank Vault Door Assembly!
        // Pivots around heavy vertical crane hinge at (2097.82, 0, 2092.32), swinging outward into corridor!
        vaultDoorPivot = new THREE.Group();
        vaultDoorPivot.name = 'PacificStandardVaultDoorPivot';
        vaultDoorPivot.position.set(2097.82, 2.35, 2092.32);

        const doorLocalX = 2.18; // Places door center at world X = 2100.0 when rotation.y = 0!
        const doorParts = [];

        // Main 4.15m-diameter, 0.64m-thick Machined Steel & Chrome Circular Vault Slab
        const mainSlab = new THREE.CylinderGeometry(2.06, 2.06, 0.64, 36);
        mainSlab.rotateX(Math.PI * 0.5);
        doorParts.push({ geo: mainSlab, matrix: makeMat4(doorLocalX, 0, 0), color: new THREE.Color(COL.steelGalv) });

        // Stepped inner & outer beveled chrome pressure rings
        const innerStep = new THREE.CylinderGeometry(1.72, 1.82, 0.74, 32);
        innerStep.rotateX(Math.PI * 0.5);
        doorParts.push({ geo: innerStep, matrix: makeMat4(doorLocalX, 0, 0.04), color: new THREE.Color(COL.chrome) });

        const outerBezel = new THREE.TorusGeometry(1.88, 0.11, 10, 32);
        doorParts.push({ geo: outerBezel, matrix: makeMat4(doorLocalX, 0, 0.36), color: new THREE.Color(COL.brass) });

        // Heavy Dual External Crane Hinge Arms connecting pivot X=0 to door center X=doorLocalX
        for (const hy of [-1.05, 1.05]) {
          doorParts.push({ geo: new THREE.CylinderGeometry(0.24, 0.24, 0.82, 14), matrix: makeMat4(0, hy, 0.12), color: new THREE.Color(COL.steelDark) });
          doorParts.push({ geo: new THREE.BoxGeometry(doorLocalX * 0.92, 0.34, 0.22), matrix: makeMat4(doorLocalX * 0.45, hy, 0.42), color: new THREE.Color(COL.chrome) });
        }

        const vaultSlabMesh = new THREE.Mesh(mergeInfraBufferGeometries(doorParts), mats.metal);
        vaultSlabMesh.castShadow = true;
        vaultSlabMesh.receiveShadow = true;
        vaultDoorPivot.add(vaultSlabMesh);

        // 12 Radially Retracting Chrome Locking Bolts around the Vault Door Circumference!
        const boltCylGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.72, 10);
        for (let bi = 0; bi < 12; bi++) {
          const ang = (bi / 12) * Math.PI * 2;
          // Skip hinge attachment sector near PI
          if (Math.abs(wrapAngle(ang - Math.PI)) < 0.38) continue;
          const boltMesh = new THREE.Mesh(boltCylGeo, mats.metal);
          const extRadius = 1.98;
          boltMesh.position.set(
            doorLocalX + Math.cos(ang) * extRadius,
            Math.sin(ang) * extRadius,
            0.02
          );
          boltMesh.rotation.z = ang - Math.PI * 0.5;
          vaultDoorPivot.add(boltMesh);
          vaultBoltMeshes.push({ mesh: boltMesh, ang, extendedR: 1.98, retractedR: 1.62, doorLocalX });
        }

        // Dual Exposed Precision Toothed Steel Clockwork Gears on Vault Face!
        const gearGeoA = createToothedGearGeometry(0.58, 0.16, 0.10, 16);
        const gearGeoB = createToothedGearGeometry(0.42, 0.12, 0.10, 12);
        vaultGearA = new THREE.Mesh(gearGeoA, mats.metal);
        vaultGearA.position.set(doorLocalX - 0.62, 0.42, 0.44);
        vaultDoorPivot.add(vaultGearA);

        vaultGearB = new THREE.Mesh(gearGeoB, mats.metal);
        vaultGearB.position.set(doorLocalX + 0.32, 0.68, 0.44);
        vaultDoorPivot.add(vaultGearB);

        // Central 3-Spoke Brass & Chrome Vault Spin Handwheel!
        vaultSpokeWheelGroup = new THREE.Group();
        vaultSpokeWheelGroup.position.set(doorLocalX, -0.12, 0.52);
        const swParts = [
          { geo: new THREE.TorusGeometry(0.56, 0.048, 10, 24), matrix: makeMat4(0, 0, 0), color: new THREE.Color(COL.gold24k) },
          { geo: new THREE.CylinderGeometry(0.14, 0.16, 0.22, 16), matrix: makeMat4(0, 0, -0.04, Math.PI * 0.5, 0, 0), color: new THREE.Color(COL.chrome) },
        ];
        for (let si = 0; si < 3; si++) {
          const sa = (si / 3) * Math.PI * 2;
          swParts.push({
            geo: new THREE.CylinderGeometry(0.032, 0.032, 0.56, 8),
            matrix: makeMat4(Math.cos(sa) * 0.28, Math.sin(sa) * 0.28, 0, 0, 0, sa - Math.PI * 0.5),
            color: new THREE.Color(COL.chrome),
          });
          swParts.push({
            geo: new THREE.CylinderGeometry(0.036, 0.036, 0.22, 8),
            matrix: makeMat4(Math.cos(sa) * 0.56, Math.sin(sa) * 0.56, 0.10, Math.PI * 0.5, 0, 0),
            color: new THREE.Color(COL.gold24k),
          });
        }
        vaultSpokeWheelGroup.add(new THREE.Mesh(mergeInfraBufferGeometries(swParts), mats.metal));
        vaultDoorPivot.add(vaultSpokeWheelGroup);
        bankInteriorGroup.add(vaultDoorPivot);

        // 10) INSIDE THE VAULT CHAMBER (X in [2090.8, 2109.2], Z in [2085.2, 2091.4]):
        //     - 400+ Gleaming Safe-Deposit Lockbox Walls
        //     - 6 Heavy Rolling Steel Gold Bullion Carts stacked with 24K Gold Ingots!
        //     - 4 Shrink-Wrapped $100 Cash Pallets on Wooden Skids!
        for (const wallX of [2090.88, 2109.12]) {
          const sgn = wallX < bx ? 1 : -1;
          for (let rowY = 0.55; rowY <= 4.15; rowY += 0.45) {
            for (let colZ = 2085.8; colZ <= 2090.8; colZ += 0.62) {
              bankBatch.add(
                'metal', mats.metal, uBox,
                wallX + sgn * 0.06, rowY, colZ,
                0, 0, 0,
                0.08, 0.39, 0.56,
                (Math.round(rowY * 10 + colZ * 10) % 3 === 0) ? COL.brass : COL.chrome,
                false, false
              );
            }
          }
        }

        // Pre-build reusable Merged Gold Bullion Cart & Cash Pallet Geometries so lootable carts are ultra-fast!
        const goldCartParts = [
          // Heavy tubular steel cart bed & push handle + 4 caster wheels
          { geo: new THREE.BoxGeometry(1.42, 0.10, 0.88), matrix: makeMat4(0, 0.32, 0), color: new THREE.Color(COL.steelDark) },
          { geo: new THREE.BoxGeometry(1.42, 0.08, 0.88), matrix: makeMat4(0, 0.78, 0), color: new THREE.Color(COL.steelDark) },
          { geo: new THREE.CylinderGeometry(0.03, 0.03, 0.88, 8), matrix: makeMat4(-0.68, 0.62, -0.40), color: new THREE.Color(COL.chrome) },
          { geo: new THREE.CylinderGeometry(0.03, 0.03, 0.88, 8), matrix: makeMat4(-0.68, 0.62, 0.40), color: new THREE.Color(COL.chrome) },
          { geo: new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), matrix: makeMat4(0.68, 0.52, -0.40), color: new THREE.Color(COL.chrome) },
          { geo: new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), matrix: makeMat4(0.68, 0.52, 0.40), color: new THREE.Color(COL.chrome) },
          { geo: new THREE.CylinderGeometry(0.03, 0.03, 0.82, 8), matrix: makeMat4(-0.68, 1.04, 0, Math.PI * 0.5, 0, 0), color: new THREE.Color(COL.chrome) },
        ];
        for (const [wx, wz] of [[-0.58, -0.36], [0.58, -0.36], [-0.58, 0.36], [0.58, 0.36]]) {
          goldCartParts.push({
            geo: new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10),
            matrix: makeMat4(wx, 0.12, wz, Math.PI * 0.5, 0, 0),
            color: new THREE.Color(COL.hdpeFloat),
          });
        }
        // Pyramid of 28 Gleaming Beveled 24K Gold Bullion Bars on Top & Lower Shelves!
        const ingotGeo = new THREE.CylinderGeometry(0.075, 0.098, 0.28, 4);
        ingotGeo.rotateY(Math.PI * 0.25);
        ingotGeo.rotateZ(Math.PI * 0.5);
        for (let tier = 0; tier < 3; tier++) {
          const cols = 4 - tier;
          for (let gx = 0; gx < cols; gx++) {
            for (let gz = -1; gz <= 1; gz++) {
              goldCartParts.push({
                geo: ingotGeo,
                matrix: makeMat4((gx - (cols - 1) * 0.5) * 0.30, 0.86 + tier * 0.095, gz * 0.22),
                color: new THREE.Color(COL.gold24k),
              });
            }
          }
        }
        for (let gx = -1; gx <= 1; gx++) {
          for (let gz = -1; gz <= 1; gz++) {
            goldCartParts.push({
              geo: ingotGeo,
              matrix: makeMat4(gx * 0.34, 0.40, gz * 0.22),
              color: new THREE.Color(COL.gold24k),
            });
          }
        }
        const mergedGoldCartGeo = mergeInfraBufferGeometries(goldCartParts);

        const goldCartSpots = [
          [2094.2, 2088.8, 0.18],
          [2096.4, 2086.6, -0.12],
          [2098.6, 2086.4, 0.05],
          [2101.4, 2086.4, -0.06],
          [2103.6, 2086.6, 0.15],
          [2105.8, 2088.8, -0.22],
        ];
        for (let gi = 0; gi < goldCartSpots.length; gi++) {
          const [gcx, gcz, gyaw] = goldCartSpots[gi];
          const cartMesh = new THREE.Mesh(mergedGoldCartGeo, mats.metal);
          cartMesh.position.set(gcx, 0.04, gcz);
          cartMesh.rotation.y = gyaw;
          cartMesh.castShadow = true;
          bankInteriorGroup.add(cartMesh);
          bankGoldCartGroups.push({ id: `gold_cart_${gi + 1}`, mesh: cartMesh, x: gcx, z: gcz, looted: false, value: 8500 });
        }

        // 4 Shrink-Wrapped Green $100 Cash Pallets on Wooden Skids!
        const cashPalletParts = [
          { geo: new THREE.BoxGeometry(1.36, 0.14, 1.16), matrix: makeMat4(0, 0.07, 0), color: new THREE.Color(COL.teakWarm) },
          { geo: new THREE.BoxGeometry(1.22, 0.86, 1.02), matrix: makeMat4(0, 0.57, 0), color: new THREE.Color(COL.cashGreen) },
          { geo: new THREE.BoxGeometry(1.25, 0.88, 0.08), matrix: makeMat4(0, 0.57, -0.28), color: new THREE.Color(COL.stuccoWhite) },
          { geo: new THREE.BoxGeometry(1.25, 0.88, 0.08), matrix: makeMat4(0, 0.57, 0.28), color: new THREE.Color(COL.stuccoWhite) },
          { geo: new THREE.BoxGeometry(0.08, 0.88, 1.05), matrix: makeMat4(-0.32, 0.57, 0), color: new THREE.Color(COL.stuccoWhite) },
          { geo: new THREE.BoxGeometry(0.08, 0.88, 1.05), matrix: makeMat4(0.32, 0.57, 0), color: new THREE.Color(COL.stuccoWhite) },
        ];
        const mergedCashPalletGeo = mergeInfraBufferGeometries(cashPalletParts);

        const cashSpots = [
          [2092.6, 2086.6, 0.08],
          [2092.6, 2089.6, -0.05],
          [2107.4, 2086.6, -0.08],
          [2107.4, 2089.6, 0.06],
        ];
        for (let pi = 0; pi < cashSpots.length; pi++) {
          const [cpx, cpz, cyaw] = cashSpots[pi];
          const palletMesh = new THREE.Mesh(mergedCashPalletGeo, mats.concrete);
          palletMesh.position.set(cpx, 0.04, cpz);
          palletMesh.rotation.y = cyaw;
          palletMesh.castShadow = true;
          bankInteriorGroup.add(palletMesh);
          bankCashPalletGroups.push({ id: `cash_pallet_${pi + 1}`, mesh: palletMesh, x: cpx, z: cpz, looted: false, value: 4000 });
        }
      }
    }

    // ========================================================================
    // ZONE 5: 12 SCULPTED MONSTER STUNT JUMPS & CONSTRUCTION / TRAILER SCENES
    //         ("Điểm Bay Xe Mạo Hiểm" — Pier, Boulevard, Freeway, Island,
    //          Bridge, Marina, Downtown & 28m Côn Lôn Tiên Sơn Observatory!)
    // ========================================================================
    {
      // Helper: transform local (lx, ly, lz) around ramp center (sj.x, sj.baseY, sj.z) & launch yaw
      function rampWorldPos(sj, lx, ly, lz) {
        return [
          sj.x + sj.rightX * lx + sj.fwdX * lz,
          sj.baseY + ly,
          sj.z + sj.rightZ * lx + sj.fwdZ * lz,
        ];
      }

      // Build all 12 distinct angled Stunt Ramps with rich civil-engineering & vehicle/construction props!
      for (let idx = 0; idx < stuntJumps.length; idx++) {
        const sj = stuntJumps[idx];
        const L = sj.length;
        const W = sj.width;
        const H = sj.height;
        const slopePitch = -Math.atan2(H, L); // Negative X rotation tilts +Z lip UPWARD in YXZ Euler!
        const rampHypot = Math.hypot(L, H);

        // 1) Core Inclined Deck Surface + Heavy Side Stringer Beams (matches analytical heightfield 1:1!)
        const [midX, midY, midZ] = rampWorldPos(sj, 0, H * 0.5 - 0.08, 0);
        const deckMat = (sj.style === 'boardwalk' || sj.style === 'dune_wood') ? mats.wood : mats.metal;
        const deckBucket = (sj.style === 'boardwalk' || sj.style === 'dune_wood') ? 'wood' : 'metal';
        const deckCol = (sj.style === 'boardwalk' || sj.style === 'dune_wood')
          ? COL.teakWarm
          : sj.style === 'trailer'
            ? COL.goldenRed
            : COL.steelDark;

        batch.add(
          deckBucket, deckMat, uBox,
          midX, midY, midZ,
          slopePitch, sj.yaw, 0,
          W, 0.20, rampHypot,
          deckCol, true, true
        );

        // High-visibility Yellow/Cyan/Gold Glowing Neon Edge Guide Strips up BOTH sides of every Stunt Ramp!
        const edgeGlowCol = (idx % 2 === 0) ? COL.amberGlow : COL.cyanGlow;
        for (const side of [-1, 1]) {
          const [ex, ey, ez] = rampWorldPos(sj, side * (W * 0.5 + 0.08), H * 0.5 + 0.08, 0);
          batch.add(
            'metal', mats.metal, uBox,
            ex, ey - 0.12, ez,
            slopePitch, sj.yaw, 0,
            0.22, 0.38, rampHypot + 0.2,
            sj.style === 'trailer' ? COL.chrome : COL.hazardYellow,
            true, false
          );
          batch.add(
            'emissive', mats.emissive, uBox,
            ex, ey + 0.10, ez,
            slopePitch, sj.yaw, 0,
            0.12, 0.09, rampHypot,
            edgeGlowCol,
            false, false
          );
        }

        // Smooth Steel Entry Toe Plate at z = -L/2 so low supercar splitters glide smoothly onto ramp!
        const [toeX, toeY, toeZ] = rampWorldPos(sj, 0, 0.04, -L * 0.5 - 0.55);
        batch.add('metal', mats.metal, uBox, toeX, toeY, toeZ, -0.06, sj.yaw, 0, W + 0.15, 0.06, 1.25, COL.hazardYellow, false, true);

        // High-Contrast Hazard Signboard on Rear / Side of Ramp (Row 7: "⚠ ĐIỂM BAY XE MẠO HIỂM ⚠")
        const [sgnX, sgnY, sgnZ] = rampWorldPos(sj, W * 0.5 + 1.35, 1.35, -L * 0.32);
        const hazSignGeo = createAtlasSignPlaneGeometry(3.6, 0.92, 7, 8, true);
        batch.add('signAtlas', mats.signAtlas, hazSignGeo, sgnX, sgnY, sgnZ, 0, sj.yaw + Math.PI, 0, 1, 1, 1, null, true, false);
        batch.add('metal', mats.metal, uCyl, sgnX, sj.baseY + 0.72, sgnZ, 0, 0, 0, 0.10, 1.45, 0.10, COL.steelGalv, false, false);

        // Register 2 animated floating Golden Chevron Beacons per Stunt Ramp (toe + crest lip)!
        const [b1x, b1y, b1z] = rampWorldPos(sj, -(W * 0.5 + 0.55), H + 1.15, L * 0.46);
        const [b2x, b2y, b2z] = rampWorldPos(sj, +(W * 0.5 + 0.55), H + 1.15, L * 0.46);
        stuntBeaconSeeds.push({ stuntIndex: idx, x: b1x, y: b1y, z: b1z, yaw: sj.yaw, phase: idx * 0.6 });
        stuntBeaconSeeds.push({ stuntIndex: idx, x: b2x, y: b2y, z: b2z, yaw: sj.yaw, phase: idx * 0.6 + Math.PI });

        // 2) Style-Specific Civil-Engineering & Vehicle Support Structures!
        if (sj.style === 'trailer') {
          // SCULPTED HEAVY AMERICAN CAR-HAULER SEMI-TRUCK + HYDRAULIC TRAILER!
          // Tractor cab parked ahead/beside or integrated under the high end (+L/2 + 2.8m offset to side so launch path is 100% clear!)
          // Under-ramp dual-axle trailer chassis, 8 rubber tires, & hydraulic lift rams:
          for (const zFrac of [-0.15, 0.18, 0.42]) {
            const supportH = H * (zFrac + 0.5);
            const [sx, sy, sz] = rampWorldPos(sj, 0, supportH * 0.5, L * zFrac);
            batch.add('metal', mats.metal, uCyl, sx - sj.rightX * (W * 0.36), sy, sz - sj.rightZ * (W * 0.36), 0.12, sj.yaw, 0, 0.22, supportH, 0.22, COL.chrome, true, false);
            batch.add('metal', mats.metal, uCyl, sx + sj.rightX * (W * 0.36), sy, sz + sj.rightZ * (W * 0.36), 0.12, sj.yaw, 0, 0.22, supportH, 0.22, COL.chrome, true, false);
          }
          // Lower trailer frame rails & dual rear bogie wheels under ramp belly
          const [trX, trY, trZ] = rampWorldPos(sj, 0, 0.52, L * 0.12);
          batch.add('metal', mats.metal, uBox, trX, trY, trZ, 0, sj.yaw, 0, W * 0.82, 0.28, L * 0.68, COL.steelDark, true, true);
          for (const zAxle of [L * 0.05, L * 0.22, L * 0.38]) {
            for (const side of [-1, 1]) {
              const [wx, wy, wz] = rampWorldPos(sj, side * (W * 0.44), 0.48, zAxle);
              batch.add('metal', mats.metal, uCyl, wx, wy, wz, 0, sj.yaw, Math.PI * 0.5, 0.94, 0.42, 0.94, COL.hdpeFloat, true, false);
              batch.add('metal', mats.metal, uCyl, wx, wy, wz, 0, sj.yaw, Math.PI * 0.5, 0.48, 0.45, 0.48, COL.chrome, false, false);
            }
          }

          // Parked Semi-Truck Warning Service Cab offset cleanly 4.6m to the right of ramp so car flies freely over lip!
          const cabLat = W * 0.5 + 2.45;
          const [cabX, cabY, cabZ] = rampWorldPos(sj, cabLat, 0, L * 0.26);
          batch.add('metal', mats.metal, uBox, cabX, cabY + 1.35, cabZ, 0, sj.yaw, 0, 2.55, 2.1, 3.6, COL.goldenRed, true, true);
          batch.add('metal', mats.metal, uBox, cabX + sj.fwdX * 2.3, cabY + 0.95, cabZ + sj.fwdZ * 2.3, 0, sj.yaw, 0, 2.35, 1.25, 1.85, COL.goldenRed, true, true);
          batch.add('glass', mats.glass, uBox, cabX + sj.fwdX * 1.42, cabY + 1.82, cabZ + sj.fwdZ * 1.42, -0.22, sj.yaw, 0, 2.25, 0.78, 0.12, null, false, false);
          // Twin vertical chrome exhaust stacks & amber roof strobe bar
          for (const s of [-1, 1]) {
            batch.add('metal', mats.metal, uCyl, cabX + sj.rightX * (s * 1.32) - sj.fwdX * 0.8, cabY + 1.95, cabZ + sj.rightZ * (s * 1.32) - sj.fwdZ * 0.8, 0, 0, 0, 0.16, 2.8, 0.16, COL.chrome, true, false);
          }
          batch.add('emissive', mats.emissive, uBox, cabX, cabY + 2.48, cabZ + sj.fwdZ * 0.4, 0, sj.yaw, 0, 1.45, 0.16, 0.32, COL.amberGlow, false, false);
        } else if (sj.style === 'girder' || sj.style === 'bridge_gap' || sj.style === 'freeway_gap') {
          // STEEL TRUSS / I-BEAM CONSTRUCTION CRIBBING + ORANGE ATTENUATOR BARRELS!
          for (let step = 1; step <= 4; step++) {
            const u = step / 4.2;
            const bH = H * u - 0.18;
            if (bH <= 0.25) continue;
            const zLoc = -L * 0.5 + L * u;
            for (const side of [-1, 1]) {
              const [px, py, pz] = rampWorldPos(sj, side * (W * 0.42), bH * 0.5, zLoc);
              batch.add('metal', mats.metal, uBox, px, py, pz, 0, sj.yaw, 0, 0.28, bH, 0.28, COL.hazardYellow, true, false);
            }
            const [bx, by, bz] = rampWorldPos(sj, 0, bH - 0.14, zLoc);
            batch.add('metal', mats.metal, uBox, bx, by, bz, 0, sj.yaw, 0, W * 0.92, 0.24, 0.28, COL.steelDark, false, false);
          }

          // Orange & white striped highway crash barrels flanking ramp approach funnel
          for (let bi = 0; bi < 4; bi++) {
            for (const side of [-1, 1]) {
              const [ox, oy, oz] = rampWorldPos(sj, side * (W * 0.5 + 0.55 + bi * 0.18), 0.46, -L * 0.5 - 0.6 - bi * 1.65);
              batch.add('concrete', mats.concrete, uCyl, ox, oy, oz, 0, 0, 0, 0.64, 0.92, 0.64, COL.safetyOrange, true, false);
              batch.add('concrete', mats.concrete, uCyl, ox, oy + 0.05, oz, 0, 0, 0, 0.66, 0.26, 0.66, COL.stuccoWhite, false, false);
            }
          }

          // For Stunt #1 (Boulevard) & Stunt #5 (Marina): add a sculpted Yellow Hydraulic Excavator beside the site!
          if (sj.id === 1 || sj.id === 5) {
            const [exX, exY, exZ] = rampWorldPos(sj, -(W * 0.5 + 3.1), 0, 1.2);
            // Tracked undercarriage + rotating yellow house + articulated boom & dipper bucket!
            batch.add('metal', mats.metal, uBox, exX - sj.rightX * 0.9, exY + 0.38, exZ - sj.rightZ * 0.9, 0, sj.yaw, 0, 0.62, 0.72, 3.4, COL.hdpeFloat, true, true);
            batch.add('metal', mats.metal, uBox, exX + sj.rightX * 0.9, exY + 0.38, exZ + sj.rightZ * 0.9, 0, sj.yaw, 0, 0.62, 0.72, 3.4, COL.hdpeFloat, true, true);
            batch.add('concrete', mats.concrete, uBox, exX, exY + 1.28, exZ, 0, sj.yaw + 0.35, 0, 2.35, 1.25, 2.85, COL.hazardYellow, true, true);
            batch.add('glass', mats.glass, uBox, exX - sj.rightX * 0.65, exY + 1.95, exZ + sj.fwdZ * 0.45, 0, sj.yaw + 0.35, 0, 0.95, 1.15, 1.25, null, false, false);
            batch.add('concrete', mats.concrete, uBox, exX + sj.fwdX * 1.9, exY + 2.85, exZ + sj.fwdZ * 1.9, -0.68, sj.yaw + 0.35, 0, 0.42, 0.52, 3.8, COL.hazardYellow, true, false);
            batch.add('concrete', mats.concrete, uBox, exX + sj.fwdX * 3.4, exY + 2.35, exZ + sj.fwdZ * 3.4, 0.62, sj.yaw + 0.35, 0, 0.34, 0.42, 2.8, COL.hazardYellow, true, false);
          }

          // For Stunt #8 (Unfinished 12.5m Freeway Stub Jump): add a towering 34m Yellow Lattice Construction Crane!
          if (sj.id === 8) {
            const crX = -114.5;
            const crZ = 243.8;
            batch.add('concrete', mats.concrete, uBox, crX, 0.9, crZ, 0, 0, 0, 4.8, 1.8, 4.8, COL.concreteDark, true, true);
            batch.add('metal', mats.metal, uBox, crX, 17.5, crZ, 0, 0, 0, 1.65, 33.0, 1.65, COL.hazardYellow, true, false);
            batch.add('glass', mats.glass, uBox, crX, 31.8, crZ - 1.2, 0, 0, 0, 1.85, 2.1, 1.85, null, false, false);
            // Horizontal 26m jib boom + counterweight + hook cable
            batch.add('metal', mats.metal, uBox, crX + 5.5, 34.2, crZ, 0, 0, 0, 26.0, 1.15, 1.15, COL.hazardYellow, true, false);
            batch.add('concrete', mats.concrete, uBox, crX - 5.8, 33.6, crZ, 0, 0, 0, 3.2, 1.85, 1.65, COL.concreteDark, true, false);
            batch.add('emissive', mats.emissive, uSphere, crX + 18.2, 35.1, crZ, 0, 0, 0, 0.46, 0.46, 0.46, COL.beaconRed, false, false);
            registerInfraAABB(crX - 2.4, crX + 2.4, crZ - 2.4, crZ + 2.4, 35.0, 0, 'construction_crane');
          }
        } else if (sj.style === 'boardwalk' || sj.style === 'dune_wood') {
          // HEAVY COASTAL TIMBER TRESTLE BENTS & CROSS-BRACED PILINGS!
          for (let step = 1; step <= 4; step++) {
            const u = step / 4.2;
            const bH = H * u - 0.15;
            if (bH <= 0.2) continue;
            const zLoc = -L * 0.5 + L * u;
            for (const side of [-1, 0, 1]) {
              const [px, py, pz] = rampWorldPos(sj, side * (W * 0.42), bH * 0.5, zLoc);
              batch.add('wood', mats.wood, uCyl, px, py, pz, 0, 0, 0, 0.28, bH, 0.28, COL.mahogany, true, false);
            }
            const [pL, , zL] = rampWorldPos(sj, -W * 0.42, 0, zLoc);
            const [pR, , zR] = rampWorldPos(sj, +W * 0.42, 0, zLoc);
            batch.addStrut('wood', mats.wood, uBox, pL, sj.baseY + 0.2, zL, pR, sj.baseY + bH - 0.1, zR, 0.12, 0.12, COL.teakWarm);
          }
        } else {
          // CLIFF_ROCK & CLIFF_MEGA (Stunt #7 Island & Stunt #12 28m Observatory Mega-Jump!):
          // Sculpted granite wedge base + brushed-chrome architectural sky-ramp wings!
          const [wX, wY, wZ] = rampWorldPos(sj, 0, H * 0.34, L * 0.15);
          batch.add('concrete', mats.concrete, uBox, wX, wY, wZ, slopePitch * 0.65, sj.yaw, 0, W * 0.94, H * 0.72, L * 0.72, COL.ashlarStone, true, true);
          for (const side of [-1, 1]) {
            const [gx, gy, gz] = rampWorldPos(sj, side * (W * 0.5 + 0.15), H * 0.5 + 0.35, 0);
            batch.add('glass', mats.glass, uBox, gx, gy, gz, slopePitch, sj.yaw, 0, 0.08, 0.62, rampHypot * 0.92, null, false, false);
          }
        }
      }

      // Single InstancedMesh for all 24 Floating Spinning Stunt-Jump Diamond Beacons (1 Draw Call!)
      const beaconOctGeo = new THREE.OctahedronGeometry(0.46, 0);
      const beaconInstMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      stuntBeaconInst = new THREE.InstancedMesh(beaconOctGeo, beaconInstMat, stuntBeaconSeeds.length);
      stuntBeaconInst.frustumCulled = false;
      const colGoldBeacon = new THREE.Color(0xfacc15);
      const colDoneBeacon = new THREE.Color(0x10b981);
      const dummyB = new THREE.Object3D();
      for (let i = 0; i < stuntBeaconSeeds.length; i++) {
        const sb = stuntBeaconSeeds[i];
        dummyB.position.set(sb.x, sb.y, sb.z);
        dummyB.rotation.set(0, sb.yaw, 0);
        dummyB.scale.set(1, 1.35, 1);
        dummyB.updateMatrix();
        stuntBeaconInst.setMatrixAt(i, dummyB.matrix);
        const done = stuntJumps[sb.stuntIndex]?.completed;
        stuntBeaconInst.setColorAt(i, done ? colDoneBeacon : colGoldBeacon);
      }
      stuntBeaconInst.instanceMatrix.needsUpdate = true;
      if (stuntBeaconInst.instanceColor) stuntBeaconInst.instanceColor.needsUpdate = true;
      infraRoot.add(stuntBeaconInst);
    }

    // ========================================================================
    // ZONE 6: CIVIL-ENGINEERING INFRASTRUCTURE LANDMARKS (0 EXTRA DRAW CALLS!)
    //         - Electronic ETC Freeway Toll Plaza (X = +86, Z = +232, y = 12.5m)
    //         - Côn Lôn Tiên Sơn Foothills Twin Concrete Tunnel Portals (X = +160, Z = -228)
    //         - Bồng Lai Tiên Đảo Marina Harbor Master Pavilion, Fuel Dock & Buoys
    //         - Bank Interior CCTV Security Control Room & Gold Assay Scales
    // ========================================================================
    {
      // 6A. Electronic Overhead ETC / FasTrak Freeway Toll Canopy at (86.0, 12.5, 232.0)
      //     (High 6.2m clearance across all 4 freeway lanes -> zero lane obstruction!)
      const tollX = 86.0;
      const tollZ = 232.0;
      const tollY = FREEWAY_DECK_Y;
      for (const sideZ of [tollZ - FREEWAY_HALF_W - 0.65, tollZ + FREEWAY_HALF_W + 0.65]) {
        batch.add('concrete', mats.concrete, uBox, tollX, tollY + 3.4, sideZ, 0, 0, 0, 2.2, 6.8, 1.35, COL.stuccoWhite, true, true);
        batch.add('metal', mats.metal, uBox, tollX, tollY + 3.4, sideZ, 0, 0, 0, 2.35, 0.45, 1.45, COL.yachtNavy, false, false);
      }
      // Aerodynamic cantilevered toll canopy roof + solar array + 4 lane green transponder beacons
      batch.add('metal', mats.metal, uBox, tollX, tollY + 6.95, tollZ, 0, 0, 0, 5.4, 0.68, FREEWAY_HALF_W * 2 + 3.6, COL.yachtWhite, true, true);
      batch.add('metal', mats.metal, uBox, tollX, tollY + 7.35, tollZ, 0, 0, 0, 4.2, 0.12, FREEWAY_HALF_W * 2 + 1.2, COL.yachtNavy, false, false);
      for (const laneZ of [tollZ - 6.0, tollZ - 2.2, tollZ + 2.2, tollZ + 6.0]) {
        batch.add('metal', mats.metal, uBox, tollX - 2.3, tollY + 6.25, laneZ, 0, 0, 0, 0.35, 0.72, 1.65, COL.steelDark, false, false);
        batch.add('emissive', mats.emissive, uBox, tollX - 2.52, tollY + 6.25, laneZ, 0, 0, 0, 0.06, 0.48, 1.35, COL.limeGlow, false, false);
        batch.add('emissive', mats.emissive, uBox, tollX + 2.52, tollY + 6.25, laneZ, 0, 0, 0, 0.06, 0.48, 1.35, COL.limeGlow, false, false);
      }

      // 6B. Côn Lôn Tiên Sơn Foothills Twin Mountain Highway Tunnel Portals at (156.0, 0.22, -231.0)
      //     (Architectural interstate tunnel headwall built into the northern Côn Lôn Tiên Sơn mountain base!)
      const tunX = 156.0;
      const tunZ = -232.5;
      batch.add('concrete', mats.concrete, uBox, tunX, 5.2, tunZ, 0, 0, 0, 26.0, 10.4, 3.6, COL.concreteMed, true, true);
      batch.add('concrete', mats.concrete, uBox, tunX, 10.65, tunZ + 0.35, 0, 0, 0, 27.4, 0.95, 4.2, COL.travertine, true, true);
      // Angled concrete retaining wing-walls flanking the tunnel headwall
      batch.add('concrete', mats.concrete, uBox, tunX - 15.2, 3.6, tunZ + 2.8, 0, 0.45, 0, 6.2, 7.2, 1.2, COL.concreteLight, true, true);
      batch.add('concrete', mats.concrete, uBox, tunX + 15.2, 3.6, tunZ + 2.8, 0, -0.45, 0, 6.2, 7.2, 1.2, COL.concreteLight, true, true);

      for (const boreOff of [-5.8, 5.8]) {
        const bx = tunX + boreOff;
        // Arched horseshoe bore recess + dark tunnel depth + glowing warm sodium ceiling lights!
        batch.add('concrete', mats.concrete, uCyl, bx, 5.4, tunZ + 1.85, Math.PI * 0.5, 0, 0, 8.4, 0.8, 8.4, COL.stuccoWhite, false, false);
        batch.add('metal', mats.metal, uBox, bx, 3.2, tunZ + 1.55, 0, 0, 0, 7.6, 6.4, 0.55, COL.hdpeFloat, false, false);
        for (const lx of [-2.1, 2.1]) {
          batch.add('emissive', mats.emissive, uBox, bx + lx, 5.85, tunZ + 1.88, 0, 0, 0, 0.65, 0.16, 0.25, COL.amberGlow, false, false);
        }
      }
      registerInfraAABB(tunX - 13.5, tunX + 13.5, tunZ - 2.0, tunZ + 1.9, 11.2, 0.0, 'vinewood_tunnel_headwall');

      // 6C. Bồng Lai Tiên Đảo Marina Harbor Master Gazebo, Marine Fuel Pumps & Channel Navigation Buoys!
      const hmX = -210.0;
      const hmZ = 78.2;
      for (const [cx, cz] of [[-2.1, -2.1], [2.1, -2.1], [-2.1, 2.1], [2.1, 2.1]]) {
        batch.add('wood', mats.wood, uCyl, hmX + cx, MARINA_DECK_Y + 1.6, hmZ + cz, 0, 0, 0, 0.22, 3.2, 0.22, COL.stuccoWhite, true, false);
      }
      batch.add('metal', mats.metal, uCone, hmX, MARINA_DECK_Y + 4.05, hmZ, 0, Math.PI * 0.25, 0, 6.8, 1.85, 6.8, COL.yachtNavy, true, true);
      // Marine Diesel / Super-Unleaded Fuel Dispenser Island on North Finger Pier (-232.0, 1.25, 81.5)
      batch.add('concrete', mats.concrete, uBox, -231.5, MARINA_DECK_Y + 0.85, 81.5, 0, 0, 0, 0.85, 1.7, 0.62, COL.stuccoWhite, true, false);
      batch.add('metal', mats.metal, uBox, -233.2, MARINA_DECK_Y + 0.85, 81.5, 0, 0, 0, 0.85, 1.7, 0.62, COL.goldenRed, true, false);
      batch.add('emissive', mats.emissive, uBox, -231.5, MARINA_DECK_Y + 1.28, 81.83, 0, 0, 0, 0.52, 0.28, 0.04, COL.cyanGlow, false, false);

      // Red (Starboard Return) & Green (Port) Floating Harbor Channel Navigation Buoys!
      for (const [buoyX, buoyZ, buoyCol, lampCol] of [
        [-248.0, 86.0, COL.emeraldDark, COL.limeGlow],
        [-248.0, 100.5, COL.goldenRed, COL.beaconRed],
        [-240.0, 168.0, COL.emeraldDark, COL.limeGlow],
      ]) {
        batch.add('metal', mats.metal, uCyl, buoyX, 0.25, buoyZ, 0, 0, 0, 1.45, 0.95, 1.45, buoyCol, false, false);
        batch.add('metal', mats.metal, uCone, buoyX, 1.35, buoyZ, 0, 0, 0, 1.05, 1.55, 1.05, buoyCol, false, false);
        batch.add('emissive', mats.emissive, uSphere, buoyX, 2.25, buoyZ, 0, 0, 0, 0.32, 0.32, 0.32, lampCol, false, false);
      }

      // 6D. Bank Interior Security CCTV Control Wall & Precision Bullion Assay Table inside (2100, 0, 2100)!
      //     Security Monitor Bank in West Executive Alcove (2083.2, 1.8, 2112.2)
      bankBatch.add('metal', mats.metal, uBox, 2083.1, 1.65, 2112.0, 0, 0, 0, 0.55, 2.1, 3.6, COL.steelDark, false, false);
      for (let my = 1.15; my <= 2.15; my += 0.5) {
        for (let mz = 2110.8; mz <= 2113.2; mz += 0.8) {
          bankBatch.add('emissive', mats.emissive, uBox, 2083.40, my, mz, 0, 0, 0, 0.04, 0.40, 0.68, COL.cyanGlow, false, false);
        }
      }
      // Central Vault Gold-Weighing Assay Table inside Vault Chamber (2100.0, 0.04, 2088.6)
      bankBatch.add('metal', mats.metal, uBox, 2100.0, 0.48, 2088.6, 0, 0, 0, 2.1, 0.86, 1.1, COL.steelDark, true, true);
      bankBatch.add('metal', mats.metal, uBox, 2100.0, 0.94, 2088.6, 0, 0, 0, 2.22, 0.08, 1.22, COL.chrome, false, true);
      bankBatch.add('metal', mats.metal, uBox, 2099.4, 1.08, 2088.6, 0, 0, 0, 0.48, 0.20, 0.42, COL.brass, false, false);
      bankBatch.add('emissive', mats.emissive, uBox, 2099.4, 1.12, 2088.82, 0, 0, 0, 0.32, 0.10, 0.02, COL.limeGlow, false, false);
      registerInfraAABB(2098.85, 2101.15, 2087.95, 2089.25, 1.15, 0.0, 'vault_assay_table', true);

      // 6E. Linh Chu Thượng Cổ Captain's Bridge Helm Console & Upper Champagne Sky-Bar (0 extra draw calls!)
      {
        const yx = YACHT_CENTER_X;
        // Interior Captain's Helm Console visible right through tinted raked bridge glass (y = 6.22..7.8m, Z = 109.6)
        batch.add('wood', mats.wood, uBox, yx, 6.82, 109.4, -0.18, 0, 0, 3.8, 0.92, 1.05, COL.mahogany, false, false);
        // Ship's Spoked Brass & Teak Helm Wheel
        batch.add('metal', mats.metal, uTorus, yx, 7.36, 109.95, -0.35, 0, 0, 0.68, 0.68, 0.68, COL.gold24k, false, false);
        batch.add('metal', mats.metal, uCyl, yx, 7.22, 109.78, Math.PI * 0.35, 0, 0, 0.12, 0.42, 0.12, COL.chrome, false, false);
        // Triple Glowing Marine Chartplotter / Sonar MFD Screens + Twin Engine Chrome Throttles
        for (const mxOff of [-1.05, 0.0, 1.05]) {
          batch.add('metal', mats.metal, uBox, yx + mxOff, 7.42, 109.25, -0.35, 0, 0, 0.78, 0.46, 0.08, COL.steelDark, false, false);
          batch.add('emissive', mats.emissive, uBox, yx + mxOff, 7.43, 109.30, -0.35, 0, 0, 0.70, 0.38, 0.03, mxOff === 0 ? COL.limeGlow : COL.cyanGlow, false, false);
        }
        batch.add('metal', mats.metal, uBox, yx + 0.58, 7.34, 109.65, 0.45, 0, 0, 0.08, 0.28, 0.06, COL.chrome, false, false);
        batch.add('metal', mats.metal, uBox, yx + 0.70, 7.34, 109.65, 0.45, 0, 0, 0.08, 0.28, 0.06, COL.chrome, false, false);
        // Leather Captain's Helm Chair
        batch.add('concrete', mats.concrete, uBox, yx, 6.85, 110.85, 0, 0, 0, 0.78, 0.16, 0.74, COL.stuccoWhite, false, false);
        batch.add('concrete', mats.concrete, uBox, yx, 7.35, 111.16, 0.12, 0, 0, 0.74, 0.95, 0.14, COL.stuccoWhite, false, false);
        batch.add('metal', mats.metal, uCyl, yx, 6.52, 110.85, 0, 0, 0, 0.16, 0.56, 0.16, COL.chrome, false, false);

        // Upper Sun-Deck Onyx & Teak Champagne Bar Counter behind Wheelhouse (Z = 116.8, y = 6.22m)
        batch.add('wood', mats.wood, uBox, yx + 1.8, 6.74, 116.9, 0, 0, 0, 2.8, 1.04, 0.76, COL.mahogany, true, true);
        batch.add('marble', mats.marble, uBox, yx + 1.8, 7.28, 116.9, 0, 0, 0, 2.96, 0.08, 0.92, COL.stuccoWhite, false, true);
        batch.add('emissive', mats.emissive, uBox, yx + 1.8, 6.74, 117.30, 0, 0, 0, 2.5, 0.68, 0.03, COL.amberGlow, false, false);
        for (const stoolX of [yx + 0.85, yx + 1.8, yx + 2.75]) {
          batch.add('metal', mats.metal, uCyl, stoolX, 6.58, 117.85, 0, 0, 0, 0.08, 0.72, 0.08, COL.chrome, false, false);
          batch.add('concrete', mats.concrete, uCyl, stoolX, 6.96, 117.85, 0, 0, 0, 0.42, 0.10, 0.42, COL.stuccoWhite, false, false);
        }
      }

      // 6F. Bồng Lai Tiên Đảo Marina Waterfront Cafe Bistro Tables, Striped Parasols & Surfboard/Kayak Racks!
      {
        const bistroSpots = [
          [-209.6, 89.5],
          [-209.6, 97.5],
          [-209.6, 117.5],
          [-209.6, 129.5],
        ];
        for (let bi = 0; bi < bistroSpots.length; bi++) {
          const [bx, bz] = bistroSpots[bi];
          // Round teak cafe table + chrome pedestal + navy/white parasol umbrella!
          batch.add('metal', mats.metal, uCyl, bx, MARINA_DECK_Y + 0.42, bz, 0, 0, 0, 0.10, 0.82, 0.10, COL.chrome, false, false);
          batch.add('wood', mats.wood, uCyl, bx, MARINA_DECK_Y + 0.84, bz, 0, 0, 0, 1.18, 0.07, 1.18, COL.teakWarm, true, true);
          batch.add('metal', mats.metal, uCyl, bx, MARINA_DECK_Y + 1.48, bz, 0, 0, 0, 0.07, 2.55, 0.07, COL.chrome, true, false);
          batch.add(
            'concrete', mats.concrete, uCone,
            bx, MARINA_DECK_Y + 2.68, bz,
            0, bi * 0.4, 0,
            2.65, 0.58, 2.65,
            bi % 2 === 0 ? COL.yachtNavy : COL.goldenRed,
            true, false
          );
          // Pair of cafe chairs
          for (const czOff of [-0.92, 0.92]) {
            batch.add('wood', mats.wood, uBox, bx, MARINA_DECK_Y + 0.46, bz + czOff, 0, 0, 0, 0.48, 0.08, 0.48, COL.teakWarm, false, false);
            batch.add('metal', mats.metal, uBox, bx, MARINA_DECK_Y + 0.24, bz + czOff, 0, 0, 0, 0.42, 0.44, 0.42, COL.steelDark, false, false);
          }
        }

        // Kayak & Stand-Up Paddleboard Wooden Rack on South Marina Promenade (-211.6, 1.25, 136.5)
        const krX = -211.8;
        const krZ = 136.5;
        batch.add('wood', mats.wood, uBox, krX, MARINA_DECK_Y + 0.95, krZ - 1.2, 0, 0, 0, 0.16, 1.9, 0.95, COL.mahogany, true, false);
        batch.add('wood', mats.wood, uBox, krX, MARINA_DECK_Y + 0.95, krZ + 1.2, 0, 0, 0, 0.16, 1.9, 0.95, COL.mahogany, true, false);
        const kayakCols = [COL.safetyOrange, COL.cyanGlow, COL.hazardYellow];
        for (let ki = 0; ki < 3; ki++) {
          batch.add(
            'metal', mats.metal, uCone,
            krX, MARINA_DECK_Y + 0.52 + ki * 0.56, krZ,
            Math.PI * 0.5, 0, 0,
            0.62, 3.6, 0.28,
            kayakCols[ki],
            true, false
          );
        }
      }

      // 6G. Red Cable-Stayed Bridge Concrete Cable Anchorages, Foghorn Trumpets & Island Helipad Hangar Shed!
      {
        // Massive Fluted Art-Deco Concrete Cable Anchorage Blocks at East (-130.5) & West (-243.5) Bridge Approaches
        for (const ax of [-130.5, -243.5]) {
          const ay = evalRedBridgeDeckY(ax);
          for (const sz of [190.4, 209.6]) {
            batch.add('concrete', mats.concrete, uBox, ax, ay + 1.45, sz, 0, 0, 0, 4.6, 3.8, 2.2, COL.travertine, true, true);
            batch.add('metal', mats.metal, uBox, ax, ay + 3.45, sz, 0, 0, 0, 4.8, 0.32, 2.4, COL.goldenRed, false, false);
            batch.add('emissive', mats.emissive, uSphere, ax, ay + 3.92, sz, 0, 0, 0, 0.42, 0.42, 0.42, COL.warmLamp, false, false);
          }
        }
        // Brass Dual-Horn Coastal Foghorns mounted on Mid-Span Bridge Rail (-186.0, 7.85, 208.8)
        batch.add('metal', mats.metal, uCone, -186.0, 9.35, 209.1, Math.PI * 0.46, 0, 0, 0.52, 1.35, 0.52, COL.brass, false, false);
        batch.add('metal', mats.metal, uCone, -185.3, 9.35, 209.1, Math.PI * 0.46, 0.15, 0, 0.44, 1.15, 0.44, COL.brass, false, false);

        // Lighthouse Island Aviation Fuel Tank & Helipad Rescue Service Booth at (-286.5, 4.0, 178.5)
        const shX = -286.5;
        const shZ = 178.5;
        batch.add('concrete', mats.concrete, uBox, shX, ISLAND_DECK_Y + 1.65, shZ, 0, 0.32, 0, 5.2, 3.3, 3.8, COL.stuccoWhite, true, true);
        batch.add('metal', mats.metal, uBox, shX, ISLAND_DECK_Y + 3.42, shZ, 0, 0.32, 0, 5.6, 0.28, 4.2, COL.goldenRed, true, true);
        // Horizontal White Jet-A1 Aviation Fuel Cylinder Tank on Cradles
        batch.add('metal', mats.metal, uCyl, shX + 4.8, ISLAND_DECK_Y + 1.25, shZ - 1.2, 0, 0.32, Math.PI * 0.5, 1.55, 4.2, 1.55, COL.yachtWhite, true, true);
        batch.add('metal', mats.metal, uBox, shX + 4.8, ISLAND_DECK_Y + 1.25, shZ - 1.2, 0, 0.32, 0, 1.2, 1.62, 0.35, COL.goldenRed, false, false);
        registerInfraAABB(shX - 2.8, shX + 2.8, shZ - 2.2, shZ + 2.2, ISLAND_DECK_Y + 3.6, ISLAND_DECK_Y, 'helipad_service_shed');
      }

      // 6H. Freeway Gore Impact Attenuator Cushions & Emergency Yellow SOS Highway Callboxes!
      {
        // Crash Cushion Barrel Arrays at South Ramp Gore (-45.2, 12.5, 223.4) & North Ramp Gore (184.5, 12.5, -208.5)
        for (const [gx, gz] of [[-45.5, 223.4], [185.0, -207.2]]) {
          for (let row = 0; row < 3; row++) {
            batch.add('concrete', mats.concrete, uCyl, gx + row * 0.78, FREEWAY_DECK_Y + 0.48, gz, 0, 0, 0, 0.68, 0.96, 0.68, COL.hazardYellow, true, false);
            batch.add('metal', mats.metal, uCyl, gx + row * 0.78, FREEWAY_DECK_Y + 0.50, gz, 0, 0, 0, 0.71, 0.22, 0.71, COL.steelDark, false, false);
          }
        }
        // Yellow Emergency SOS Highway Callboxes every ~96m along Freeway Outer Barrier
        for (let i = 8; i < freewayNodes.length - 8; i += 12) {
          const fn = freewayNodes[i];
          const cx = fn.x + fn.rx * (FREEWAY_HALF_W + 0.16);
          const cz = fn.z + fn.rz * (FREEWAY_HALF_W + 0.16);
          batch.add('metal', mats.metal, uCyl, cx, fn.y + 1.45, cz, 0, fn.yaw, 0, 0.12, 1.15, 0.12, COL.hazardYellow, false, false);
          batch.add('concrete', mats.concrete, uBox, cx, fn.y + 1.95, cz, 0, fn.yaw, 0, 0.34, 0.52, 0.28, COL.hazardYellow, false, false);
          batch.add('emissive', mats.emissive, uSphere, cx, fn.y + 2.32, cz, 0, 0, 0, 0.16, 0.16, 0.16, COL.cyanGlow, false, false);
        }
      }

      // 6I. Côn Lôn Tiên Sơn Observatory Cypress Colonnade Trees & Foucault Pendulum Glass Cupola!
      {
        // Sculpted Italian Cypress Trees lining the Côn Lôn Tiên Sơn Switchback Road & Observatory Terrace!
        const cypressSpots = [
          [34.0, 1.2, -210.2], [48.0, 3.8, -210.2], [64.0, 6.8, -210.2], [80.0, 10.1, -210.2], [96.0, 13.2, -210.2],
          [31.0, OBSERVATORY_TERRACE_Y, -249.5], [31.0, OBSERVATORY_TERRACE_Y, -242.5], [31.0, OBSERVATORY_TERRACE_Y, -235.5],
          [82.5, OBSERVATORY_TERRACE_Y, -249.5], [82.5, OBSERVATORY_TERRACE_Y, -243.5],
        ];
        for (let ci = 0; ci < cypressSpots.length; ci++) {
          const [tx, ty, tz] = cypressSpots[ci];
          batch.add('concrete', mats.concrete, uBox, tx, ty + 0.32, tz, 0, 0, 0, 1.45, 0.64, 1.45, COL.travertine, true, true);
          batch.add('wood', mats.wood, uCyl, tx, ty + 1.15, tz, 0, 0, 0, 0.28, 1.5, 0.28, COL.mahogany, true, false);
          // Tall slender Mediterranean Cypress foliage spire
          batch.add('concrete', mats.concrete, uCone, tx, ty + 4.15, tz, 0, ci * 0.7, 0, 1.55, 5.4, 1.55, COL.emeraldDark, true, false);
          batch.add('concrete', mats.concrete, uCone, tx, ty + 5.65, tz, 0, ci * 0.7 + 0.5, 0, 1.12, 3.8, 1.12, COL.emeraldDark, true, false);
        }

        // Solar Coelostat Astronomical Tower on West Observatory Roof (48.0, 37.0, -253.8)
        batch.add('concrete', mats.concrete, uOctCyl, 48.0, OBSERVATORY_TERRACE_Y + 10.2, -253.8, 0, 0, 0, 2.8, 3.2, 2.8, COL.stuccoWhite, true, false);
        batch.add('metal', mats.metal, uSphere, 48.0, OBSERVATORY_TERRACE_Y + 12.0, -253.8, 0, 0, 0, 2.6, 2.6, 2.6, COL.copperDome, true, false);
      }

      // 6J. Linh Thạch Bảo Khố Grand Marble Mezzanine Staircases, Manager's Office & Safe-Deposit Booths!
      {
        // Twin Sweeping Marble Staircases rising along West (X = 2084.2) & East (X = 2115.8) Lobby Walls to Mezzanine (y = 5.2m)
        for (const sideSign of [-1, 1]) {
          const sx = 2100.0 + sideSign * 15.8;
          for (let st = 0; st < 14; st++) {
            const u = st / 13;
            const sy = 0.20 + u * 4.95;
            const sz = lerp(2100.8, 2108.6, u);
            bankBatch.add('marble', mats.marble, uBox, sx, sy * 0.5, sz, 0, 0, 0, 2.4, sy, 0.65, COL.stuccoWhite, false, true);
            bankBatch.add('metal', mats.metal, uCyl, sx - sideSign * 1.12, sy + 0.48, sz, 0, 0, 0, 0.06, 0.96, 0.06, COL.gold24k, false, false);
          }
          bankBatch.addStrut('metal', mats.metal, uCyl, sx - sideSign * 1.12, 1.15, 2100.8, sx - sideSign * 1.12, 6.10, 2108.6, 0.08, 0.08, COL.gold24k);
          registerInfraAABB(sx - 1.3, sx + 1.3, 2100.4, 2109.0, 5.4, 0.0, 'bank_mezzanine_stair', true);
        }

        // Private Safe-Deposit Box Client Inspection Booths in East & West Rear Corridors (Z in [2087, 2094.8])
        for (const [bxPos, bzPos] of [[2085.5, 2092.5], [2085.5, 2088.5], [2114.5, 2092.5], [2114.5, 2088.5]]) {
          bankBatch.add('wood', mats.wood, uBox, bxPos, 1.25, bzPos, 0, 0, 0, 3.2, 2.5, 2.6, COL.mahogany, false, true);
          bankBatch.add('glass', mats.glass, uBox, bxPos + (bxPos < 2100 ? 1.62 : -1.62), 1.45, bzPos, 0, 0, 0, 0.08, 1.65, 2.2, null, false, false);
          bankBatch.add('metal', mats.metal, uBox, bxPos, 0.82, bzPos, 0, 0, 0, 1.4, 0.10, 0.85, COL.brass, false, false);
        }

        // Exterior Linh Thạch Bảo Khố Anti-Ramming Granite & Gold Bollards along Sidewalk Edge (Z = -128.7)
        for (let bx = 99.6; bx <= 110.4; bx += 2.16) {
          batch.add('concrete', mats.concrete, uCyl, bx, 0.62, -128.75, 0, 0, 0, 0.34, 0.92, 0.34, COL.darkRock, true, false);
          batch.add('metal', mats.metal, uCyl, bx, 1.06, -128.75, 0, 0, 0, 0.36, 0.14, 0.36, COL.gold24k, false, false);
        }

        // Executive Mezzanine Boardroom Suite at (2100.0, 5.22, 2113.4) overlooking the Crystal Skylight Hall!
        {
          const mzY = 5.32;
          const mzZ = 2113.4;
          // 7.2m Mahogany Conference Table + Brass Inlay + 8 Leather Executive Chairs!
          bankBatch.add('wood', mats.wood, uBox, 2100.0, mzY + 0.74, mzZ, 0, 0, 0, 7.2, 0.10, 1.65, COL.mahogany, false, true);
          bankBatch.add('metal', mats.metal, uBox, 2100.0, mzY + 0.79, mzZ, 0, 0, 0, 6.4, 0.02, 0.24, COL.gold24k, false, false);
          for (const legX of [2097.4, 2100.0, 2102.6]) {
            bankBatch.add('wood', mats.wood, uBox, legX, mzY + 0.38, mzZ, 0, 0, 0, 0.35, 0.72, 1.05, COL.mahogany, false, false);
          }
          for (let ci = 0; ci < 4; ci++) {
            const chX = 2097.3 + ci * 1.8;
            for (const chZOff of [-1.15, 1.02]) {
              bankBatch.add('concrete', mats.concrete, uBox, chX, mzY + 0.45, mzZ + chZOff, 0, 0, 0, 0.62, 0.12, 0.58, COL.velvetRed, false, false);
              bankBatch.add(
                'concrete', mats.concrete, uBox,
                chX, mzY + 0.85, mzZ + chZOff + (chZOff > 0 ? 0.24 : -0.24),
                0, 0, 0, 0.58, 0.76, 0.12, COL.velvetRed, false, false
              );
              bankBatch.add('metal', mats.metal, uCyl, chX, mzY + 0.22, mzZ + chZOff, 0, 0, 0, 0.10, 0.42, 0.10, COL.gold24k, false, false);
            }
          }
          // Wall-mounted Live Vạn Thương Linh Các Financial Index Ticker Display on South Mezzanine Wall (2100.0, 7.45, 2114.68)
          bankBatch.add('metal', mats.metal, uBox, 2100.0, 7.45, 2114.66, 0, 0, 0, 11.2, 1.15, 0.16, COL.steelDark, false, false);
          bankBatch.add('emissive', mats.emissive, uBox, 2100.0, 7.62, 2114.56, 0, 0, 0, 10.6, 0.24, 0.03, COL.limeGlow, false, false);
          bankBatch.add('emissive', mats.emissive, uBox, 2100.0, 7.26, 2114.56, 0, 0, 0, 10.6, 0.24, 0.03, COL.amberGlow, false, false);
        }

        // Ground-Floor Lobby Security X-Ray Archway & Bulletproof Heritage Gold Ingot Display Pedestal!
        {
          // Walk-through Metal Detector Archway near Lobby Entrance (2096.2, 0.02, 2110.8)
          const mdX = 2095.8;
          const mdZ = 2111.2;
          bankBatch.add('metal', mats.metal, uBox, mdX - 0.68, 1.15, mdZ, 0, 0, 0, 0.16, 2.3, 0.55, COL.steelGalv, false, false);
          bankBatch.add('metal', mats.metal, uBox, mdX + 0.68, 1.15, mdZ, 0, 0, 0, 0.16, 2.3, 0.55, COL.steelGalv, false, false);
          bankBatch.add('metal', mats.metal, uBox, mdX, 2.26, mdZ, 0, 0, 0, 1.52, 0.24, 0.58, COL.steelDark, false, false);
          bankBatch.add('emissive', mats.emissive, uBox, mdX, 2.26, mdZ + 0.30, 0, 0, 0, 0.92, 0.10, 0.03, COL.limeGlow, false, false);

          // Center Lobby Museum-Style Bulletproof Display Pedestal showcasing the 1904 Founding Gold Bar (2100.0, 0.02, 2105.5)
          const pdX = 2100.0;
          const pdZ = 2105.5;
          bankBatch.add('marble', mats.marble, uOctCyl, pdX, 0.58, pdZ, 0, 0, 0, 1.18, 1.12, 1.18, COL.stuccoWhite, true, true);
          bankBatch.add('metal', mats.metal, uCyl, pdX, 1.18, pdZ, 0, 0, 0, 1.24, 0.08, 1.24, COL.gold24k, false, false);
          bankBatch.add('glass', mats.glass, uBox, pdX, 1.56, pdZ, 0, 0, 0, 0.86, 0.68, 0.86, null, false, false);
          bankBatch.add('metal', mats.metal, uBox, pdX, 1.34, pdZ, 0, 0.4, 0, 0.44, 0.16, 0.22, COL.gold24k, false, false);
          registerInfraAABB(pdX - 0.65, pdX + 0.65, pdZ - 0.65, pdZ + 0.65, 1.95, 0.0, 'bank_gold_pedestal', true);
        }
      }

      // 6K. Downtown Elevated Glass & Steel Pratt-Truss Pedestrian Skybridge across Linh Đan Đỉnh Ave!
      //     Spans X in [109.0, 131.0], Z = -88.0 at y = 8.90m (8.6m vertical clearance over X = 120 road!)
      {
        const sbZ = -88.0;
        const sbY = 8.90;
        const spanLen = 22.4;

        // Walkway floor slab + dark steel underside girder + glass panoramic enclosure + solar louver roof!
        batch.add('concrete', mats.concrete, uBox, 120.0, sbY - 0.18, sbZ, 0, 0, 0, spanLen, 0.36, 4.2, COL.concreteLight, true, true);
        batch.add('metal', mats.metal, uBox, 120.0, sbY - 0.48, sbZ, 0, 0, 0, spanLen, 0.28, 3.6, COL.steelDark, true, false);
        batch.add('metal', mats.metal, uBox, 120.0, sbY + 3.25, sbZ, 0, 0, 0, spanLen + 0.4, 0.26, 4.5, COL.steelGalv, true, true);

        // North & South Tinted Curtain Glass Walls + Pratt Diagonal Steel Truss Framing!
        for (const zSide of [sbZ - 2.02, sbZ + 2.02]) {
          batch.add('glass', mats.glass, uBox, 120.0, sbY + 1.55, zSide, 0, 0, 0, spanLen - 0.6, 3.05, 0.08, null, false, false);
          for (let tx = 110.0; tx <= 130.0; tx += 2.5) {
            batch.add('metal', mats.metal, uBox, tx, sbY + 1.55, zSide, 0, 0, 0, 0.18, 3.2, 0.18, COL.steelDark, false, false);
            if (tx < 129.5) {
              const odd = Math.round((tx - 110.0) / 2.5) % 2 === 0;
              batch.addStrut(
                'metal', mats.metal, uBox,
                tx, odd ? sbY + 0.1 : sbY + 3.05, zSide,
                tx + 2.5, odd ? sbY + 3.05 : sbY + 0.1, zSide,
                0.12, 0.12, COL.steelGalv
              );
            }
          }
        }
        // Underside warm LED downlights illuminating X = 120 Avenue traffic below!
        for (const lx of [115.5, 120.0, 124.5]) {
          batch.add('emissive', mats.emissive, uBox, lx, sbY - 0.64, sbZ, 0, 0, 0, 1.4, 0.06, 0.42, COL.warmLamp, false, false);
        }

        // West (X = 110.0) & East (X = 130.0) Sidewalk Support Columns & Stepped Glass Access Stair Flights!
        for (const sideX of [110.0, 130.0]) {
          batch.add('concrete', mats.concrete, uBox, sideX, sbY * 0.5, sbZ, 0, 0, 0, 2.2, sbY, 3.8, COL.concreteMed, true, true);
          registerInfraAABB(sideX - 1.15, sideX + 1.15, sbZ - 1.95, sbZ + 1.95, sbY - 0.2, 0.0, 'skybridge_pier');

          // Climbable Exterior Stair Flight rising from Z = -98.2 (y = 0.22m) to Z = -89.8 (y = 8.90m)!
          for (let st = 0; st < 16; st++) {
            const u = st / 15;
            const stepY = lerp(0.32, sbY - 0.08, u);
            const stepZ = lerp(-98.0, -89.8, u);
            batch.add('concrete', mats.concrete, uBox, sideX, stepY, stepZ, 0, 0, 0, 2.1, 0.24, 0.68, COL.travertine, true, true);
          }
          batch.addStrut('metal', mats.metal, uBox, sideX - 1.02, 0.15, -98.0, sideX - 1.02, sbY - 0.15, -89.8, 0.16, 0.28, COL.steelDark);
          batch.addStrut('metal', mats.metal, uBox, sideX + 1.02, 0.15, -98.0, sideX + 1.02, sbY - 0.15, -89.8, 0.16, 0.28, COL.steelDark);
          batch.addStrut('metal', mats.metal, uCyl, sideX - 1.02, 1.12, -98.0, sideX - 1.02, sbY + 0.95, -89.8, 0.07, 0.07, COL.chrome);
          batch.addStrut('metal', mats.metal, uCyl, sideX + 1.02, 1.12, -98.0, sideX + 1.02, sbY + 0.95, -89.8, 0.07, 0.07, COL.chrome);
        }
      }

      // 6L. Bồng Lai Tiên Đảo Coastal Sunset Timber Boardwalk, Hexagonal Ocean Gazebo & Southern Marina Breakwater Jetty!
      {
        // Timber Coastal Boardwalk linking Pacific Beach (Z = 48) directly South to Bồng Lai Tiên Đảo Marina (Z = 76)!
        batch.add('wood', mats.wood, uBox, -210.0, MARINA_DECK_Y - 0.08, 62.2, 0, 0, 0, 6.2, 0.22, 28.6, COL.teakWarm, true, true);
        batch.add('wood', mats.wood, uBox, -201.2, MARINA_DECK_Y - 0.08, 50.5, 0, 0, 0, 11.8, 0.22, 5.2, COL.teakWarm, true, true);
        // Sloped beach access ramp at (-189.0, 0.65, 50.5)
        batch.add('wood', mats.wood, uBox, -189.0, 0.65, 50.5, 0, 0, -0.085, 14.2, 0.22, 5.2, COL.teakWarm, true, true);

        // Timber support pilings & nautical rope-post railings along the Sunset Boardwalk
        for (let bz = 50.0; bz <= 74.0; bz += 6.0) {
          for (const px of [-212.6, -207.4]) {
            batch.add('wood', mats.wood, uCyl, px, 0.45, bz, 0, 0, 0, 0.28, 2.6, 0.28, COL.mahogany, true, false);
            batch.add('wood', mats.wood, uCyl, px, MARINA_DECK_Y + 0.48, bz, 0, 0, 0, 0.16, 0.96, 0.16, COL.teakWarm, false, false);
          }
        }

        // Scenic Hexagonal Ocean Sunset Gazebo at (-201.5, 1.33, 63.0)
        const gzX = -201.5;
        const gzY = MARINA_DECK_Y + 0.08;
        const gzZ = 63.0;
        batch.add('wood', mats.wood, uOctCyl, gzX, gzY - 0.12, gzZ, 0, 0, 0, 11.8, 0.32, 11.8, COL.teakWarm, true, true);
        for (let gi = 0; gi < 6; gi++) {
          const ga = (gi / 6) * Math.PI * 2;
          const colX = gzX + Math.cos(ga) * 4.6;
          const colZ = gzZ + Math.sin(ga) * 4.6;
          batch.add('wood', mats.wood, uCyl, colX, gzY + 1.85, colZ, 0, 0, 0, 0.24, 3.7, 0.24, COL.stuccoWhite, true, false);
        }
        batch.add('metal', mats.metal, uCone, gzX, gzY + 4.65, gzZ, 0, 0.25, 0, 11.6, 2.2, 11.6, COL.copperDome, true, true);
        batch.add('emissive', mats.emissive, uSphere, gzX, gzY + 3.45, gzZ, 0, 0, 0, 0.48, 0.48, 0.48, COL.warmLamp, false, false);

        // Southern Marina Armored Stone Breakwater Jetty & Green Harbor Mole Beacon Light (X in [-264, -210], Z = 147.8)!
        batch.add('concrete', mats.concrete, uBox, -237.0, 0.45, 147.8, 0, 0, 0, 54.0, 2.45, 4.8, COL.ashlarStone, true, true);
        batch.add('concrete', mats.concrete, uBox, -237.0, 1.60, 147.8, 0, 0, 0, 52.5, 0.16, 3.6, COL.concreteLight, false, true);
        for (let rx = -263.0; rx <= -212.0; rx += 5.5) {
          for (const rzOff of [-2.8, 2.8]) {
            batch.add('concrete', mats.concrete, uRock, rx, 0.15, 147.8 + rzOff, rx * 0.2, rx * 0.5, 0.1, 2.8, 1.9, 2.6, COL.coastalRock, true, true);
          }
        }
        // Green Harbor Entrance Mole Beacon Tower at (-262.5, 1.65, 147.8)
        batch.add('concrete', mats.concrete, uOctCyl, -262.5, 4.45, 147.8, 0, 0, 0, 2.1, 5.6, 2.1, COL.stuccoWhite, true, true);
        batch.add('metal', mats.metal, uCyl, -262.5, 7.65, 147.8, 0, 0, 0, 1.55, 1.15, 1.55, COL.emeraldDark, true, false);
        batch.add('emissive', mats.emissive, uSphere, -262.5, 8.45, 147.8, 0, 0, 0, 0.62, 0.62, 0.62, COL.limeGlow, false, false);
      }

      // 6M. East Freeway Cantilevered Ocean Overlook & Medevac/Highway Patrol Turnout Bay (X in [261, 271.5], Z in [140, 166])!
      {
        const byX = 266.2;
        const byZ = 153.0;
        const byY = FREEWAY_DECK_Y;

        batch.add('twoLaneRoad', mats.twoLaneRoad, uBox, byX, byY - 0.02, byZ, 0, 0, 0, 10.6, 0.08, 25.0, null, false, true);
        batch.add('concrete', mats.concrete, uBox, byX, byY - 0.85, byZ, 0, 0, 0, 11.2, 1.65, 25.8, COL.concreteMed, true, true);
        // Twin heavy diagonal steel cantilever struts braced back into East Freeway T-piers
        for (const sz of [byZ - 8.5, byZ + 8.5]) {
          batch.add('concrete', mats.concrete, uOctCyl, 267.5, (byY - 1.5) * 0.5, sz, 0, 0, 0, 1.85, byY - 1.5, 1.85, COL.concreteDark, true, true);
          batch.addStrut('metal', mats.metal, uBox, 255.0, 4.5, sz, 270.8, byY - 0.9, sz, 0.55, 0.55, COL.steelDark, true, false);
        }
        // Scenic Eastern Ocean Overlook Parapet, Binoculars & Emergency Highway Patrol Solar Radio Mast!
        batch.add('concrete', mats.concrete, uBox, 271.4, byY + 0.55, byZ, 0, 0, 0, 0.48, 1.1, 25.6, COL.jerseyBarrier, true, true);
        batch.add('concrete', mats.concrete, uBox, byX, byY + 0.55, byZ - 12.6, 0, 0, 0, 10.8, 1.1, 0.48, COL.jerseyBarrier, true, true);
        batch.add('concrete', mats.concrete, uBox, byX, byY + 0.55, byZ + 12.6, 0, 0, 0, 10.8, 1.1, 0.48, COL.jerseyBarrier, true, true);

        batch.add('metal', mats.metal, uCyl, 270.4, byY + 4.2, byZ - 9.5, 0, 0, 0, 0.22, 8.4, 0.22, COL.steelGalv, true, false);
        batch.add('metal', mats.metal, uBox, 270.4, byY + 7.2, byZ - 9.5, 0.4, 0, 0, 1.35, 0.08, 0.95, COL.yachtNavy, false, false);
        batch.add('emissive', mats.emissive, uSphere, 270.4, byY + 8.55, byZ - 9.5, 0, 0, 0, 0.34, 0.34, 0.34, COL.cyanGlow, false, false);

        for (const bz of [byZ - 4.0, byZ + 4.0]) {
          batch.add('metal', mats.metal, uCyl, 270.5, byY + 0.72, bz, 0, 0, 0, 0.14, 1.44, 0.14, COL.chrome, false, false);
          batch.add('metal', mats.metal, uBox, 270.55, byY + 1.46, bz, 0, Math.PI * 0.5, 0.12, 0.36, 0.20, 0.52, COL.chrome, false, false);
        }
      }

      // 6N. Côn Lôn Tiên Sơn Observatory Foucault Pendulum Compass Pit & Brass Solar-System Orrery Atrium!
      {
        // Sculpted Brass Celestial Orrery Monument on East Observatory Plaza (75.0, 28.0, -236.5)
        const orX = 75.0;
        const orY = OBSERVATORY_TERRACE_Y;
        const orZ = -236.5;
        batch.add('concrete', mats.concrete, uCyl, orX, orY + 0.38, orZ, 0, 0, 0, 3.8, 0.76, 3.8, COL.travertine, true, true);
        batch.add('marble', mats.marble, uCyl, orX, orY + 0.80, orZ, 0, 0, 0, 3.4, 0.10, 3.4, COL.stuccoWhite, false, true);
        // Glowing Golden Central Sun + 4 Concentric Brass Planetary Orbit Rings & Planet Spheres!
        batch.add('emissive', mats.emissive, uSphere, orX, orY + 1.95, orZ, 0, 0, 0, 0.68, 0.68, 0.68, COL.amberGlow, false, false);
        batch.add('metal', mats.metal, uCyl, orX, orY + 1.38, orZ, 0, 0, 0, 0.14, 1.15, 0.14, COL.gold24k, false, false);

        const orbits = [
          { r: 0.85, tiltX: 0.18, tiltZ: -0.10, pAng: 0.8, pSize: 0.18, pCol: COL.cyanGlow },
          { r: 1.28, tiltX: -0.22, tiltZ: 0.16, pAng: 2.4, pSize: 0.24, pCol: COL.emeraldDark },
          { r: 1.72, tiltX: 0.14, tiltZ: 0.24, pAng: 4.1, pSize: 0.32, pCol: COL.safetyOrange },
          { r: 2.18, tiltX: -0.12, tiltZ: -0.20, pAng: 5.5, pSize: 0.26, pCol: COL.gold24k },
        ];
        for (let oi = 0; oi < orbits.length; oi++) {
          const ob = orbits[oi];
          batch.add('metal', mats.metal, uTorus, orX, orY + 1.95, orZ, Math.PI * 0.5 + ob.tiltX, 0, ob.tiltZ, ob.r * 2, ob.r * 2, ob.r * 2, COL.brass, false, false);
          const px = orX + Math.cos(ob.pAng) * ob.r;
          const pz = orZ + Math.sin(ob.pAng) * ob.r;
          const py = orY + 1.95 - Math.sin(ob.pAng) * ob.r * Math.sin(ob.tiltX);
          batch.add('metal', mats.metal, uSphere, px, py, pz, 0, 0, 0, ob.pSize, ob.pSize, ob.pSize, ob.pCol, false, false);
        }
        registerInfraAABB(orX - 1.9, orX + 1.9, orZ - 1.9, orZ + 1.9, orY + 2.8, orY, 'observatory_orrery');
      }

      // 6O. Linh Thạch Bảo Khố Vault Rear Bullion Depository Racks & Sealed Federal Reserve Bond Crates!
      {
        // Heavy Industrial Steel Shelving Racks lining the North Vault Wall (Z = 2085.55, X in [2093.5, 2106.5])
        for (const rackX of [2095.2, 2100.0, 2104.8]) {
          const rackZ = 2085.55;
          for (const postOff of [-1.45, 1.45]) {
            bankBatch.add('metal', mats.metal, uBox, rackX + postOff, 2.05, rackZ - 0.25, 0, 0, 0, 0.10, 4.0, 0.10, COL.steelDark, false, false);
            bankBatch.add('metal', mats.metal, uBox, rackX + postOff, 2.05, rackZ + 0.25, 0, 0, 0, 0.10, 4.0, 0.10, COL.steelDark, false, false);
          }
          for (const shelfY of [0.75, 1.65, 2.55, 3.45]) {
            bankBatch.add('metal', mats.metal, uBox, rackX, shelfY, rackZ, 0, 0, 0, 3.0, 0.07, 0.62, COL.steelGalv, false, true);
            // Alternate 24K Gold Bullion Bars & Sealed Emerald Federal Reserve Bond Boxes on each shelf!
            for (let gx = -1.05; gx <= 1.05; gx += 0.52) {
              const isBondCrate = Math.round(shelfY * 10 + gx * 10) % 3 === 0;
              bankBatch.add(
                'metal', mats.metal, uBox,
                rackX + gx, shelfY + 0.15, rackZ,
                0, 0, 0,
                isBondCrate ? 0.42 : 0.36,
                isBondCrate ? 0.24 : 0.14,
                0.44,
                isBondCrate ? COL.emeraldDark : COL.gold24k,
                false, false
              );
            }
          }
        }
      }
      // 6P. Pacific Offshore Regatta Cruising Sailboat Fleet (1 InstancedMesh = 8 Yachts!) & Bank Reserve Totem!
      {
        // Linh Thạch Bảo Khố Exterior Gold Exchange & Federal Reserve Monolith Totem at (99.8, 0.22, -128.8)
        batch.add('marble', mats.marble, uBox, 99.8, 2.05, -128.85, 0, 0, 0, 1.35, 3.75, 0.58, COL.darkRock, true, true);
        batch.add('metal', mats.metal, uBox, 99.8, 3.98, -128.85, 0, 0, 0, 1.52, 0.22, 0.68, COL.gold24k, false, false);
        batch.add('metal', mats.metal, uSphere, 99.8, 4.35, -128.85, 0, 0, 0, 0.56, 0.56, 0.56, COL.gold24k, false, false);
        for (const rowY of [1.45, 2.05, 2.65, 3.25]) {
          batch.add('emissive', mats.emissive, uBox, 99.8, rowY, -128.53, 0, 0, 0, 1.05, 0.16, 0.03, rowY > 2.3 ? COL.limeGlow : COL.amberGlow, false, false);
        }

        // 8 Offshore Regatta Turn-Marker Buoys anchored in North Bay & South Cove (0 extra draw calls!)
        const regattaBuoys = [
          [-286.0, -158.0], [-252.0, -108.0], [-292.0, -62.0], [-248.0, -148.0],
          [-284.0, 32.0], [-250.0, 62.0], [-312.0, -18.0], [-312.0, 128.0],
        ];
        for (let bi = 0; bi < regattaBuoys.length; bi++) {
          const [bx, bz] = regattaBuoys[bi];
          batch.add('metal', mats.metal, uCyl, bx, 0.25, bz, 0, 0, 0, 1.45, 0.65, 1.45, COL.safetyOrange, false, false);
          batch.add('metal', mats.metal, uCone, bx, 1.25, bz, 0, bi * 0.6, 0, 1.10, 1.55, 1.10, bi % 2 === 0 ? COL.goldenRed : COL.hazardYellow, true, false);
          batch.add('emissive', mats.emissive, uSphere, bx, 2.15, bz, 0, 0, 0, 0.36, 0.36, 0.36, bi % 2 === 0 ? COL.amberGlow : COL.cyanGlow, false, false);
        }

        // 8 Cruising Offshore Racing Sailboats rendered in a SINGLE InstancedMesh draw call!
        // Courses stay strictly in open Pacific waters (clear of Bồng Lai Tiên Đảo Pier Z in [-34,+14], Marina Z in [74,150], & Island Z in [166,234])!
        const sailboatGeo = createRacingSailboatGeometry(COL);
        const fleetCourses = [
          { cx: -274.0, cz: -134.0, rx: 24.0, rz: 28.0, omega: 0.085, phase: 0.2, dir: 1, tint: 0xffffff },
          { cx: -268.0, cz: -84.0, rx: 22.0, rz: 22.0, omega: 0.095, phase: 1.9, dir: -1, tint: 0xfef3c7 },
          { cx: -296.0, cz: -112.0, rx: 18.0, rz: 36.0, omega: 0.072, phase: 3.4, dir: 1, tint: 0xe0f2fe },
          { cx: -256.0, cz: -152.0, rx: 16.0, rz: 18.0, omega: 0.105, phase: 4.8, dir: -1, tint: 0xffe4e6 },
          { cx: -272.0, cz: 47.0, rx: 22.0, rz: 17.0, omega: 0.092, phase: 0.9, dir: 1, tint: 0xffffff },
          { cx: -294.0, cz: 48.0, rx: 16.0, rz: 16.0, omega: 0.108, phase: 3.8, dir: -1, tint: 0xdcfce7 },
          { cx: -314.0, cz: -8.0, rx: 8.5, rz: 44.0, omega: 0.068, phase: 2.1, dir: 1, tint: 0xfef08a },
          { cx: -315.0, cz: 112.0, rx: 7.5, rz: 38.0, omega: 0.074, phase: 5.2, dir: -1, tint: 0xe0e7ff },
        ];

        regattaFleet.length = 0;
        regattaSailboatInst = new THREE.InstancedMesh(sailboatGeo, mats.concrete, fleetCourses.length);
        regattaSailboatInst.castShadow = true;
        regattaSailboatInst.receiveShadow = true;
        regattaSailboatInst.frustumCulled = false;
        regattaSailboatInst.userData.dynamic = true;
        regattaSailboatInst.userData.animated = true;

        const tintCol = new THREE.Color();
        for (let si = 0; si < fleetCourses.length; si++) {
          const fc = fleetCourses[si];
          const initX = fc.cx + Math.cos(fc.phase) * fc.rx;
          const initZ = fc.cz + Math.sin(fc.phase) * fc.rz;
          regattaFleet.push({ ...fc, x: initX, y: -0.35, z: initZ, yaw: 0, heel: 0, pitch: 0 });
          regattaSailboatInst.setMatrixAt(si, makeMat4(initX, -0.35, initZ, 0, fc.phase, 0, 1, 1, 1));
          tintCol.setHex(fc.tint);
          regattaSailboatInst.setColorAt(si, tintCol);
        }
        regattaSailboatInst.instanceMatrix.needsUpdate = true;
        if (regattaSailboatInst.instanceColor) regattaSailboatInst.instanceColor.needsUpdate = true;
        infraRoot.add(regattaSailboatInst);
      }
    }

    // Mark all animated hero pivots so `perf_core` static transform freezer leaves them live!
    const dynamicNodes = [
      lighthouseRotorGroup,
      yachtRadarGroup,
      yachtHotTubRipples,
      bankExteriorCoronaGroup,
      bankExitCoronaGroup,
      vaultDoorPivot,
      vaultSpokeWheelGroup,
      vaultGearA,
      vaultGearB,
      securityLaserGroup,
      stuntBeaconInst,
      regattaSailboatInst,
    ];
    for (let di = 0; di < dynamicNodes.length; di++) {
      const dn = dynamicNodes[di];
      if (!dn) continue;
      dn.matrixAutoUpdate = true;
      dn.userData = dn.userData || {};
      dn.userData.dynamic = true;
      dn.userData.animated = true;
    }

    // Flush ALL Outdoor & Bank-Interior Static Geometry Batches!
    // Outdoor static meshes = 9 merged meshes total; dynamic outdoor meshes = 5 -> 14 Total Draw Calls (< 18 strictly)!
    batch.flush();
    bankBatch.flush();

    if (scene) {
      if (infraRoot.parent !== scene) scene.add(infraRoot);
      if (bankInteriorGroup.parent !== scene) scene.add(bankInteriorGroup);
    }
  }

  // ==========================================================================
  // 8. Procedural Web Audio Synth for Stunt Cinema, Vault Hydraulics & Landmarks
  // ==========================================================================

  function createInfraAudioSynth() {
    let fallbackCtx = null;
    let windNodes = null;

    function getAudioCtx() {
      const existing =
        activeCtx?.audio?.ctx ||
        activeCtx?.audio?.audioCtx ||
        activeCtx?.audio?.context ||
        null;
      if (existing && typeof existing.createOscillator === 'function') {
        if (existing.state === 'suspended') {
          existing.resume?.().catch?.(() => {});
        }
        return existing;
      }
      if (typeof window === 'undefined') return null;
      if (!fallbackCtx) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return null;
        try {
          fallbackCtx = new Ctor();
        } catch (_) {
          return null;
        }
      }
      if (fallbackCtx.state === 'suspended') {
        fallbackCtx.resume?.().catch?.(() => {});
      }
      return fallbackCtx;
    }

    function playTone(freqStart, freqEnd, duration, type = 'sine', gainPeak = 0.14, delaySec = 0) {
      const ac = getAudioCtx();
      if (!ac) return;
      try {
        const t0 = ac.currentTime + delaySec;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(20, freqStart), t0);
        if (freqEnd !== freqStart) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + duration);
        }
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.linearRampToValueAtTime(gainPeak, t0 + Math.min(0.025, duration * 0.25));
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + duration + 0.03);
      } catch (_) {}
    }

    function playNoiseBurst(duration = 0.28, filterFreq = 900, q = 1.8, gainPeak = 0.12, delaySec = 0) {
      const ac = getAudioCtx();
      if (!ac) return;
      try {
        const t0 = ac.currentTime + delaySec;
        const sampleCount = Math.max(256, Math.floor(ac.sampleRate * duration));
        const buf = ac.createBuffer(1, sampleCount, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < sampleCount; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
        }
        const src = ac.createBufferSource();
        src.buffer = buf;

        const filt = ac.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.setValueAtTime(filterFreq, t0);
        filt.Q.setValueAtTime(q, t0);

        const gain = ac.createGain();
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.linearRampToValueAtTime(gainPeak, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

        src.connect(filt);
        filt.connect(gain);
        gain.connect(ac.destination);
        src.start(t0);
        src.stop(t0 + duration + 0.02);
      } catch (_) {}
    }

    // Dramatic Tu Tiên Ngự Phong Phi Độ Launch: Sub-bass time-dilation drop + upward turbine whoosh!
    function playStuntLaunch(speed = 24, cinematic = true) {
      if (cinematic) {
        playTone(96, 29, 0.75, 'sine', 0.24, 0);
        playTone(192, 58, 0.55, 'triangle', 0.11, 0.02);
      }
      const boost = clamp(speed / 35, 0.6, 1.5);
      playNoiseBurst(0.42, 650 * boost, 1.4, 0.14, 0);
      playTone(220, 520 * boost, 0.26, 'sawtooth', 0.06, 0);
    }

    // Continuous Mid-Air Wind Rush while soaring off a Ngự Phong Phi Độ
    function updateAirborneWind(speed = 22, altitude = 6, flipSpin = 0) {
      const ac = getAudioCtx();
      if (!ac) return;
      try {
        if (!windNodes) {
          const dur = 1.5;
          const len = Math.floor(ac.sampleRate * dur);
          const buf = ac.createBuffer(1, len, ac.sampleRate);
          const ch = buf.getChannelData(0);
          for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;

          const src = ac.createBufferSource();
          src.buffer = buf;
          src.loop = true;

          const filt = ac.createBiquadFilter();
          filt.type = 'bandpass';
          filt.frequency.value = 480;
          filt.Q.value = 2.2;

          const gain = ac.createGain();
          gain.gain.value = 0.001;

          src.connect(filt);
          filt.connect(gain);
          gain.connect(ac.destination);
          src.start();
          windNodes = { src, filt, gain };
        }
        const now = ac.currentTime;
        const targetFreq = clamp(320 + speed * 14 + altitude * 18 + Math.abs(flipSpin) * 90, 240, 1850);
        const targetGain = clamp(0.025 + speed * 0.0022 + altitude * 0.002, 0.01, 0.11);
        windNodes.filt.frequency.setTargetAtTime(targetFreq, now, 0.06);
        windNodes.gain.gain.setTargetAtTime(targetGain, now, 0.06);
      } catch (_) {}
    }

    function stopAirborneWind() {
      if (!windNodes) return;
      try {
        const ac = getAudioCtx();
        if (ac) {
          windNodes.gain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.05);
        }
        const ref = windNodes;
        windNodes = null;
        setTimeout(() => {
          try {
            ref.src.stop();
            ref.src.disconnect();
            ref.gain.disconnect();
          } catch (_) {}
        }, 140);
      } catch (_) {
        windNodes = null;
      }
    }

    // Stunt Touchdown: Heavy 4-wheel suspension thud + triumphant Tu Tiên chord fanfare!
    function playStuntLanding(passed = true, isNewRecord = false) {
      stopAirborneWind();
      // Heavy tire/suspension impact thump
      playTone(115, 34, 0.24, 'sine', 0.22, 0);
      playNoiseBurst(0.18, 420, 1.2, 0.14, 0);

      if (passed) {
        // Tu Tiên Ngự Phong Phi Độ Completed Warm Synth Brass Arpeggio (C5 - E5 - G5 - B5 - D6)
        const notes = isNewRecord
          ? [523.25, 659.25, 783.99, 987.77, 1174.66]
          : [440.0, 554.37, 659.25, 880.0];
        for (let i = 0; i < notes.length; i++) {
          playTone(notes[i], notes[i] * 1.004, 0.36, 'triangle', 0.095, 0.06 + i * 0.075);
          playTone(notes[i] * 0.5, notes[i] * 0.5, 0.42, 'sine', 0.06, 0.06 + i * 0.075);
        }
      } else {
        playTone(220, 146, 0.32, 'sawtooth', 0.08, 0.05);
      }
    }

    function playVaultRatchetTick(unlockedPin = false) {
      if (unlockedPin) {
        playTone(880, 1320, 0.16, 'triangle', 0.13, 0);
        playTone(1320, 1760, 0.22, 'sine', 0.10, 0.07);
      } else {
        playTone(620, 380, 0.035, 'square', 0.045, 0);
      }
    }

    function playVaultOpenSequence() {
      // 1) Rapid handwheel spin clicks
      for (let i = 0; i < 7; i++) {
        playTone(540 + i * 28, 410, 0.045, 'triangle', 0.06, i * 0.055);
      }
      // 2) Heavy radial steel locking bolts retracting
      for (let b = 0; b < 4; b++) {
        playTone(155, 62, 0.14, 'sawtooth', 0.12, 0.42 + b * 0.09);
        playNoiseBurst(0.09, 1100, 2.5, 0.09, 0.42 + b * 0.09);
      }
      // 3) 8-Ton Circular Steel Vault Door Hydraulic Groan & Air-Seal Release
      playNoiseBurst(0.55, 1400, 3.2, 0.10, 0.82);
      playTone(58, 36, 1.15, 'sawtooth', 0.16, 0.85);
      playTone(116, 74, 1.05, 'sine', 0.14, 0.88);
    }

    function playLaserAlarm() {
      playTone(960, 620, 0.20, 'sawtooth', 0.12, 0);
      playTone(960, 620, 0.20, 'sawtooth', 0.12, 0.24);
    }

    function playGoldLoot(isGold = true) {
      if (isGold) {
        playTone(1046.5, 1046.5, 0.22, 'triangle', 0.11, 0);
        playTone(1567.98, 1567.98, 0.30, 'sine', 0.10, 0.06);
      } else {
        playNoiseBurst(0.12, 2200, 1.6, 0.09, 0);
        playTone(784, 1174.6, 0.20, 'triangle', 0.09, 0.04);
      }
    }

    function playBankPortalDoor() {
      playTone(110, 46, 0.28, 'triangle', 0.16, 0);
      playNoiseBurst(0.16, 520, 1.5, 0.08, 0.02);
    }

    function playSpeedTrapShutter() {
      playNoiseBurst(0.07, 2800, 1.4, 0.14, 0);
      playTone(1174.66, 1567.98, 0.24, 'sine', 0.10, 0.06);
    }

    function playHarborFoghorn() {
      playTone(65.41, 64.2, 1.35, 'sawtooth', 0.09, 0);
      playTone(82.41, 81.0, 1.35, 'triangle', 0.08, 0.02);
    }

    function playTelescopeClick() {
      playTone(920, 680, 0.04, 'triangle', 0.06, 0);
    }

    return {
      playStuntLaunch,
      updateAirborneWind,
      stopAirborneWind,
      playStuntLanding,
      playVaultRatchetTick,
      playVaultOpenSequence,
      playLaserAlarm,
      playGoldLoot,
      playBankPortalDoor,
      playSpeedTrapShutter,
      playHarborFoghorn,
      playTelescopeClick,
    };
  }

  const sfx = createInfraAudioSynth();

  // ==========================================================================
  // 9. Walk-In Linh Thạch Bảo Khố, Vault Hydraulics & Rotary Safe-Cracker
  // ==========================================================================

  let insideBankState = false;
  let bankDoorCooldown = 0;
  let vaultOpenTarget = false;
  let vaultAnimProgress = 0; // 0.0 (locked) -> 1.0 (fully swung open 108 deg)
  let lasersActiveState = true;
  let laserAlarmCooldown = 0;
  let savedOutdoorReturn = { x: 111.0, y: 0.22, z: -116.8, yaw: 0 };

  function syncPlayerCashSafe(delta) {
    const p = activeCtx?.player;
    if (!p || !Number.isFinite(delta) || delta === 0) return;
    const cur = Number.isFinite(p.cash) ? p.cash : Number.isFinite(p.money) ? p.money : 7860;
    const next = Math.max(0, Math.round(cur + delta));
    if (ctx?.antiCheat?.commitCash) ctx.antiCheat.commitCash(next);
    else { p.cash = next; p.money = next; }
    activeCtx?.ui?.showCashDelta?.(delta);
  }

  function enterBank() {
    const p = activeCtx?.player;
    if (!p || bankDoorCooldown > 0) return false;
    if (insideBankState && p.x > 2070 && p.x < 2130) return true;

    // Exit vehicle cleanly outdoors before stepping through the Bank's neoclassical bronze doors
    if (p.inCar && typeof activeCtx?.vehicles?.exitVehicle === 'function') {
      activeCtx.vehicles.exitVehicle();
    }

    if (p.x < 500) {
      savedOutdoorReturn = {
        x: 111.0,
        y: 0.22,
        z: -116.8,
        yaw: 0,
      };
    }

    insideBankState = true;
    bankDoorCooldown = 0.55;
    p.inBank = true;
    p.inSafehouse = false;

    bankInteriorGroup.visible = true;

    p.x = 2100.0;
    p.y = 0.05;
    p.z = 2111.5;
    p.vx = 0;
    p.vy = 0;
    p.vz = 0;
    p.yaw = Math.PI; // Face North toward Teller Cages, Crystal Skylight & Circular Steel Vault!
    p.isGrounded = true;

    playerPreStep.x = p.x;
    playerPreStep.y = p.y;
    playerPreStep.z = p.z;
    playerPreStep.valid = true;

    const pMesh = p.mesh || p.rig?.root;
    if (pMesh) {
      pMesh.visible = true;
      pMesh.position.set(p.x, p.y, p.z);
      pMesh.rotation.set(0, p.yaw, 0);
    }
    if (activeCtx?.engine) {
      activeCtx.engine.camYaw = 0; // Look North (-Z) in engine.js camera convention!
      activeCtx.engine.camPitch = -0.08;
    }

    sfx.playBankPortalDoor();
    activeCtx?.ui?.showNotification?.(
      'Đã vào Ngân Hàng Trung Ương Linh Thạch Bảo Khố • Khu Hầm Vàng Tối Mật ở phía Bắc!',
      3.8
    );
    return true;
  }

  function exitBank() {
    const p = activeCtx?.player;
    if (!p || bankDoorCooldown > 0) return false;
    if (!insideBankState && !(p.x >= 2070 && p.x <= 2130)) return false;

    closeVaultDialOverlay();

    insideBankState = false;
    bankDoorCooldown = 0.55;
    p.inBank = false;
    bankInteriorGroup.visible = false;

    p.x = savedOutdoorReturn.x;
    p.y = savedOutdoorReturn.y;
    p.z = savedOutdoorReturn.z;
    p.vx = 0;
    p.vy = 0;
    p.vz = 0;
    p.yaw = savedOutdoorReturn.yaw;
    p.isGrounded = true;
    playerPreStep.valid = false;

    const pMesh = p.mesh || p.rig?.root;
    if (pMesh) {
      pMesh.visible = true;
      pMesh.position.set(p.x, p.y, p.z);
      pMesh.rotation.set(0, p.yaw, 0);
    }
    if (activeCtx?.engine) {
      activeCtx.engine.camYaw = Math.PI;
    }

    sfx.playBankPortalDoor();
    activeCtx?.ui?.showNotification?.('Đã rời Ngân Hàng Trung Ương ra Đại lộ Downtown!', 2.8);
    return true;
  }

  function openVault(silent = false) {
    if (!vaultOpenTarget) {
      vaultOpenTarget = true;
      lasersActiveState = false;
      if (securityLaserGroup) securityLaserGroup.visible = false;
      if (vaultClosedBlockerAABB) vaultClosedBlockerAABB.enabled = false;
      if (!silent) {
        sfx.playVaultOpenSequence();
        activeCtx?.engine?.addShake?.(0.32);
        activeCtx?.ui?.showNotification?.(
          '🔓 CỬA HẦM VÀNG THÉP PACIFIC STANDARD ĐÃ MỞ! Vàng thỏi 24K & Tiền mặt đang chờ!',
          4.2
        );
      }
    }
    return true;
  }

  function closeVault() {
    vaultOpenTarget = false;
    if (vaultClosedBlockerAABB) vaultClosedBlockerAABB.enabled = true;
    return true;
  }

  function setVaultOpen(flag) {
    return flag ? openVault() : closeVault();
  }

  function setLasersActive(flag) {
    lasersActiveState = Boolean(flag);
    if (securityLaserGroup) {
      securityLaserGroup.visible = lasersActiveState && !vaultOpenTarget;
    }
    return lasersActiveState;
  }

  function resetVaultLoot() {
    for (let i = 0; i < bankGoldCartGroups.length; i++) {
      bankGoldCartGroups[i].looted = false;
      bankGoldCartGroups[i].mesh.visible = true;
      bankGoldCartGroups[i].mesh.scale.set(1, 1, 1);
    }
    for (let i = 0; i < bankCashPalletGroups.length; i++) {
      bankCashPalletGroups[i].looted = false;
      bankCashPalletGroups[i].mesh.visible = true;
      bankCashPalletGroups[i].mesh.scale.set(1, 1, 1);
    }
    return true;
  }

  function lootNearestVaultStack(px, pz) {
    if (!vaultOpenTarget || vaultAnimProgress < 0.55) return null;

    let bestItem = null;
    let bestIsGold = true;
    let bestD2 = 2.6 * 2.6;

    for (let i = 0; i < bankGoldCartGroups.length; i++) {
      const gc = bankGoldCartGroups[i];
      if (gc.looted) continue;
      const d2 = distSq2D(px, pz, gc.x, gc.z);
      if (d2 < bestD2) {
        bestD2 = d2;
        bestItem = gc;
        bestIsGold = true;
      }
    }
    for (let i = 0; i < bankCashPalletGroups.length; i++) {
      const cp = bankCashPalletGroups[i];
      if (cp.looted) continue;
      const d2 = distSq2D(px, pz, cp.x, cp.z);
      if (d2 < bestD2) {
        bestD2 = d2;
        bestItem = cp;
        bestIsGold = false;
      }
    }

    if (!bestItem) return null;

    bestItem.looted = true;
    bestItem.mesh.visible = false;
    sfx.playGoldLoot(bestIsGold);
    syncPlayerCashSafe(bestItem.value);
    activeCtx?.ui?.showNotification?.(
      bestIsGold
        ? `🪙 Đã thu giữ Xe Vàng Thỏi 24K (+$${bestItem.value.toLocaleString('en-US')})!`
        : `💵 Đã thu giữ Kiện Tiền Mặt $100 (+$${bestItem.value.toLocaleString('en-US')})!`,
      3.0
    );
    return bestItem;
  }

  // --------------------------------------------------------------------------
  // Interactive Free-Roam Rotary Safe-Cracker Canvas Widget (when outside Heist #4)
  // --------------------------------------------------------------------------
  const vaultDialState = {
    open: false,
    el: null,
    canvas: null,
    ctx2d: null,
    dialAngle: 0, // 0 .. 100 ticks mapped around 2*PI
    currentNumber: 0,
    targetCombo: [28, 74, 15, 62],
    pinIndex: 0,
    holdTimer: 0,
    lastTickInt: 0,
    dragging: false,
    lastMouseAngle: 0,
  };

  function ensureVaultDialDOM() {
    if (vaultDialState.el || typeof document === 'undefined') return vaultDialState.el;

    const wrap = document.createElement('div');
    wrap.id = 'gta-bank-vault-dial-modal';
    wrap.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:9400',
      'display:none',
      'align-items:center',
      'justify-content:center',
      'background:radial-gradient(circle at center, rgba(6,14,24,0.84), rgba(2,6,12,0.95))',
      'font-family:"Segoe UI",system-ui,sans-serif',
      'user-select:none',
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'width:min(500px, 92vw)',
      'background:linear-gradient(160deg, #0f172a 0%, #111827 60%, #09131c 100%)',
      'border:2px solid #eab308',
      'border-radius:16px',
      'box-shadow:0 24px 64px rgba(0,0,0,0.85), 0 0 28px rgba(234,179,8,0.22)',
      'padding:18px 20px',
      'color:#f8fafc',
      'text-align:center',
    ].join(';');

    const header = document.createElement('div');
    header.innerHTML = `
      <div style="font-size:12px;letter-spacing:2px;color:#34d399;font-weight:700;">PACIFIC STANDARD FEDERAL VAULT</div>
      <div style="font-size:20px;font-weight:900;color:#fde047;margin:4px 0;">MỞ KHÓA CƠ CẤU CỬA HẦM VÀNG 8 TẤN</div>
      <div style="font-size:13px;color:#cbd5e1;margin-bottom:10px;">Xoay núm khóa bằng <b>[A / D]</b>, <b>[← / →]</b> hoặc kéo chuột đúng mã số mục tiêu và giữ 0.45s!</div>
    `;
    card.appendChild(header);

    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 320;
    canvas.style.cssText = 'width:340px;height:302px;max-width:100%;cursor:grab;display:block;margin:0 auto;';
    card.appendChild(canvas);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:center;margin-top:12px;';

    const btnQuickDrill = document.createElement('button');
    btnQuickDrill.type = 'button';
    btnQuickDrill.textContent = '⚡ Kích Nổ Nhiệt Phá Khóa Ngay (+3★ Thiên Đình Chấp Pháp)';
    btnQuickDrill.style.cssText = [
      'padding:9px 14px',
      'border-radius:8px',
      'border:1px solid #f59e0b',
      'background:linear-gradient(135deg,#b45309,#d97706)',
      'color:#fff',
      'font-weight:700',
      'cursor:pointer',
      'font-size:13px',
    ].join(';');
    btnQuickDrill.addEventListener('click', () => {
      closeVaultDialOverlay();
      openVault(false);
      activeCtx?.gameplay?.addCrimeHeat?.(62, 'bank_vault_breach');
    });

    const btnClose = document.createElement('button');
    btnClose.type = 'button';
    btnClose.textContent = '✕ Đóng (Esc)';
    btnClose.style.cssText = [
      'padding:9px 14px',
      'border-radius:8px',
      'border:1px solid #475569',
      'background:#1e293b',
      'color:#e2e8f0',
      'font-weight:700',
      'cursor:pointer',
      'font-size:13px',
    ].join(';');
    btnClose.addEventListener('click', () => closeVaultDialOverlay());

    btnRow.appendChild(btnQuickDrill);
    btnRow.appendChild(btnClose);
    card.appendChild(btnRow);
    wrap.appendChild(card);
    document.body.appendChild(wrap);

    // Mouse / Touch rotary dial drag interaction
    const getPointerAngle = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.54;
      return Math.atan2(clientY - cy, clientX - cx);
    };

    canvas.addEventListener('pointerdown', (ev) => {
      vaultDialState.dragging = true;
      vaultDialState.lastMouseAngle = getPointerAngle(ev.clientX, ev.clientY);
      canvas.setPointerCapture?.(ev.pointerId);
    });
    canvas.addEventListener('pointermove', (ev) => {
      if (!vaultDialState.dragging) return;
      const ang = getPointerAngle(ev.clientX, ev.clientY);
      const delta = wrapAngle(ang - vaultDialState.lastMouseAngle);
      vaultDialState.lastMouseAngle = ang;
      vaultDialState.dialAngle = wrapAngle(vaultDialState.dialAngle + delta);
    });
    const endDrag = () => {
      vaultDialState.dragging = false;
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    vaultDialState.el = wrap;
    vaultDialState.canvas = canvas;
    vaultDialState.ctx2d = canvas.getContext('2d');
    return wrap;
  }

  function openVaultDialOverlay() {
    if (vaultOpenTarget || activeCtx?.heists?.activeActivity) return false;
    if (activeCtx?.activeModal && activeCtx.activeModal !== 'bank_vault') return false;
    const wrap = ensureVaultDialDOM();
    if (!wrap) return false;

    const rng = createInfraRNG(Date.now() & 0xfffffff);
    vaultDialState.targetCombo = [
      12 + Math.floor(rng() * 76),
      10 + Math.floor(rng() * 80),
      15 + Math.floor(rng() * 72),
      8 + Math.floor(rng() * 84),
    ];
    vaultDialState.pinIndex = 0;
    vaultDialState.holdTimer = 0;
    vaultDialState.open = true;
    wrap.style.display = 'flex';
    activeCtx.activeModal = 'bank_vault';
    if (typeof document !== 'undefined' && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    return true;
  }

  function closeVaultDialOverlay() {
    if (!vaultDialState.open) return;
    vaultDialState.open = false;
    vaultDialState.dragging = false;
    if (vaultDialState.el) vaultDialState.el.style.display = 'none';
    if (activeCtx && activeCtx.activeModal === 'bank_vault') {
      activeCtx.activeModal = null;
    }
  }

  function updateAndRenderVaultDial(rawDt) {
    if (!vaultDialState.open || !vaultDialState.ctx2d) return;

    const k = activeCtx?.input?.keys || {};
    if (k.Escape) {
      closeVaultDialOverlay();
      return;
    }

    let spinInput = 0;
    if (k.KeyA || k.a || k.ArrowLeft) spinInput -= 1;
    if (k.KeyD || k.d || k.ArrowRight) spinInput += 1;
    if (spinInput !== 0) {
      vaultDialState.dialAngle = wrapAngle(vaultDialState.dialAngle + spinInput * 1.85 * rawDt);
    }

    const normAngle = ((-vaultDialState.dialAngle / (Math.PI * 2)) % 1 + 1) % 1;
    const curNum = Math.round(normAngle * 100) % 100;
    vaultDialState.currentNumber = curNum;

    if (curNum !== vaultDialState.lastTickInt) {
      vaultDialState.lastTickInt = curNum;
      sfx.playVaultRatchetTick(false);
    }

    const targetNum = vaultDialState.targetCombo[vaultDialState.pinIndex] ?? 50;
    let numDiff = Math.abs(curNum - targetNum);
    if (numDiff > 50) numDiff = 100 - numDiff;

    if (numDiff <= 1) {
      vaultDialState.holdTimer += rawDt;
      if (vaultDialState.holdTimer >= 0.45) {
        vaultDialState.holdTimer = 0;
        vaultDialState.pinIndex++;
        sfx.playVaultRatchetTick(true);
        if (vaultDialState.pinIndex >= vaultDialState.targetCombo.length) {
          closeVaultDialOverlay();
          openVault(false);
          activeCtx?.gameplay?.addCrimeHeat?.(42, 'bank_vault_crack');
          return;
        }
      }
    } else {
      vaultDialState.holdTimer = Math.max(0, vaultDialState.holdTimer - rawDt * 2.0);
    }

    // Render High-Contrast Brushed-Chrome & Gold Combination Dial on Canvas
    const g = vaultDialState.ctx2d;
    const w = vaultDialState.canvas.width;
    const h = vaultDialState.canvas.height;
    g.clearRect(0, 0, w, h);

    // 4 Tumbler Pin Status Pills at Top
    for (let i = 0; i < 4; i++) {
      const px = 38 + i * 74;
      const unlocked = i < vaultDialState.pinIndex;
      const active = i === vaultDialState.pinIndex;
      g.fillStyle = unlocked ? '#065f46' : active ? '#422006' : '#1e293b';
      g.strokeStyle = unlocked ? '#10b981' : active ? '#facc15' : '#475569';
      g.lineWidth = 2;
      g.fillRect(px, 8, 64, 34);
      g.strokeRect(px, 8, 64, 34);

      g.fillStyle = unlocked ? '#6ee7b7' : active ? '#fde047' : '#94a3b8';
      g.font = 'bold 15px Consolas, monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const valTxt = unlocked || active ? String(vaultDialState.targetCombo[i]).padStart(2, '0') : '??';
      g.fillText(`CHỐT ${valTxt}`, px + 32, 25);
    }

    const cx = w * 0.5;
    const cy = h * 0.57;
    const outerR = 112;

    // Outer Steel Bezel
    const bezelGrad = g.createRadialGradient(cx - 24, cy - 24, 18, cx, cy, outerR + 12);
    bezelGrad.addColorStop(0, '#e2e8f0');
    bezelGrad.addColorStop(0.55, '#64748b');
    bezelGrad.addColorStop(1, '#1e293b');
    g.fillStyle = bezelGrad;
    g.beginPath();
    g.arc(cx, cy, outerR + 10, 0, Math.PI * 2);
    g.fill();

    // Top Red/Gold Index Arrow Marker + Alignment Progress Arc
    g.fillStyle = numDiff <= 1 ? '#4ade80' : '#facc15';
    g.beginPath();
    g.moveTo(cx, cy - outerR + 2);
    g.lineTo(cx - 9, cy - outerR - 14);
    g.lineTo(cx + 9, cy - outerR - 14);
    g.closePath();
    g.fill();

    if (vaultDialState.holdTimer > 0.02) {
      g.strokeStyle = '#4ade80';
      g.lineWidth = 5;
      g.beginPath();
      g.arc(
        cx,
        cy,
        outerR + 14,
        -Math.PI * 0.5,
        -Math.PI * 0.5 + (vaultDialState.holdTimer / 0.45) * Math.PI * 2
      );
      g.stroke();
    }

    // Rotating Numbered Safe Dial Face
    g.save();
    g.translate(cx, cy);
    g.rotate(vaultDialState.dialAngle - Math.PI * 0.5);

    g.fillStyle = '#0f172a';
    g.beginPath();
    g.arc(0, 0, outerR - 4, 0, Math.PI * 2);
    g.fill();

    for (let n = 0; n < 100; n++) {
      const a = (n / 100) * Math.PI * 2;
      const isMajor = n % 10 === 0;
      const isMid = n % 5 === 0;
      const r0 = outerR - (isMajor ? 20 : isMid ? 14 : 9);
      const r1 = outerR - 5;
      g.strokeStyle = isMajor ? '#fde047' : '#cbd5e1';
      g.lineWidth = isMajor ? 2.2 : 1.1;
      g.beginPath();
      g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      g.stroke();

      if (isMajor) {
        g.save();
        g.translate(Math.cos(a) * (outerR - 33), Math.sin(a) * (outerR - 33));
        g.rotate(a + Math.PI * 0.5);
        g.fillStyle = '#f8fafc';
        g.font = 'bold 13px Arial, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(String(n), 0, 0);
        g.restore();
      }
    }
    g.restore();

    // Central Knurled Gold & Chrome Knob + Live Digital Readout
    g.fillStyle = '#eab308';
    g.beginPath();
    g.arc(cx, cy, 42, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#090d16';
    g.beginPath();
    g.arc(cx, cy, 34, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = numDiff <= 1 ? '#4ade80' : '#fde047';
    g.font = 'bold 26px Consolas, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(curNum).padStart(2, '0'), cx, cy + 1);
  }

  // ==========================================================================
  // 10. Côn Lôn Tiên Sơn Observatory Panoramic Telescope, Yacht Jacuzzi & Freeway Radar
  // ==========================================================================

  const telescopeState = {
    active: false,
    anchorX: 58.0,
    anchorY: 29.55,
    anchorZ: -230.6,
    yaw: 0, // Looking South (+Z) over Boulevard Bồng Lai Tiên Đảo, Downtown & Pacific Ocean!
    pitch: -0.14,
    zoom: 3.5,
    hudEl: null,
  };

  const OBSERVATORY_RECON_LANDMARKS = [
    { name: 'Tháp Liên Bang FIB (78m)', x: 160, y: 55, z: -40 },
    { name: 'Vạn Bảo Đổ Phường & Resort', x: 235, y: 36, z: -110 },
    { name: 'Ngân Hàng Trung Ương Linh Thạch Bảo Khố', x: 108, y: 12, z: -135 },
    { name: 'Boulevard Bồng Lai Tiên Đảo', x: 40, y: 2, z: 20 },
    { name: 'Vòng Quay Mặt Trời Bồng Lai Tiên Đảo Pier', x: -245, y: 24, z: -12 },
    { name: 'Siêu Du Thuyền M/Y Galaxy (62m)', x: -295, y: 6, z: 115 },
    { name: 'Cầu Dây Văng Đỏ & Đảo Hải Đăng', x: -214, y: 24, z: 200 },
    { name: 'Cao Tốc Trên Cao Liên Bang (12.5m)', x: 120, y: 12.5, z: 232 },
  ];

  function ensureTelescopeDOM() {
    if (telescopeState.hudEl || typeof document === 'undefined') return telescopeState.hudEl;
    const el = document.createElement('div');
    el.id = 'gta-observatory-telescope-hud';
    el.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:8800',
      'display:none',
      'pointer-events:none',
      'background:radial-gradient(circle at center, transparent 36%, rgba(4,8,15,0.96) 52%)',
      'font-family:"Segoe UI",Consolas,monospace',
      'color:#7dd3fc',
    ].join(';');
    el.innerHTML = `
      <div style="position:absolute;left:50%;top:50%;width:min(68vmin,620px);height:min(68vmin,620px);transform:translate(-50%,-50%);border:2px solid rgba(56,189,248,0.65);border-radius:50%;box-shadow:0 0 35px rgba(56,189,248,0.22) inset;">
        <div style="position:absolute;left:50%;top:8%;bottom:8%;width:1px;background:rgba(56,189,248,0.32);"></div>
        <div style="position:absolute;top:50%;left:8%;right:8%;height:1px;background:rgba(56,189,248,0.32);"></div>
      </div>
      <div id="gta-scope-info" style="position:absolute;bottom:34px;left:50%;transform:translateX(-50%);background:rgba(9,16,28,0.88);border:1px solid #38bdf8;border-radius:10px;padding:10px 20px;text-align:center;"></div>
    `;
    document.body.appendChild(el);
    telescopeState.hudEl = el;
    return el;
  }

  function toggleObservatoryTelescope(enable, binocX = 58.0, binocZ = -230.8) {
    const next = enable !== undefined ? Boolean(enable) : !telescopeState.active;
    if (next) {
      ensureTelescopeDOM();
      telescopeState.active = true;
      telescopeState.anchorX = binocX;
      telescopeState.anchorY = OBSERVATORY_TERRACE_Y + 1.62;
      telescopeState.anchorZ = binocZ;
      telescopeState.yaw = 0;
      telescopeState.pitch = -0.14;
      telescopeState.zoom = 3.5;
      if (telescopeState.hudEl) telescopeState.hudEl.style.display = 'block';
      sfx.playTelescopeClick();
    } else if (telescopeState.active) {
      telescopeState.active = false;
      if (telescopeState.hudEl) telescopeState.hudEl.style.display = 'none';
      const cam = activeCtx?.engine?.camera;
      if (cam) {
        cam.fov = 62;
        cam.updateProjectionMatrix();
      }
      sfx.playTelescopeClick();
    }
    return telescopeState.active;
  }

  // Track Freeway Speed-Trap Radar Flash & Personal Top Speed Record!
  const speedTrapState = {
    cooldown: 0,
    bestSpeedKmh: 145,
    flashEl: null,
    flashAlpha: 0,
  };

  function triggerSpeedTrapFlash(kmh, trapLabel) {
    speedTrapState.cooldown = 9.0;
    speedTrapState.flashAlpha = 0.72;
    const isRecord = kmh > speedTrapState.bestSpeedKmh;
    if (isRecord) speedTrapState.bestSpeedKmh = kmh;
    const reward = isRecord ? 1200 : 500;
    syncPlayerCashSafe(reward);
    sfx.playSpeedTrapShutter();

    if (typeof document !== 'undefined' && !speedTrapState.flashEl) {
      const fl = document.createElement('div');
      fl.id = 'gta-speedtrap-flash';
      fl.style.cssText = 'position:fixed;inset:0;background:#ffffff;pointer-events:none;z-index:8500;opacity:0;';
      document.body.appendChild(fl);
      speedTrapState.flashEl = fl;
    }

    activeCtx?.ui?.showNotification?.(
      `📸 RADAR CAO TỐC (${trapLabel}): ${kmh} KM/H ${isRecord ? '• KỶ LỤC TỐC ĐỘ MỚI!' : ''} (+$${reward})`,
      4.0
    );
  }

  // ==========================================================================
  // 11. 12 Monster Ngự Phong Phi Độ: True 3D Ballistic Flight & Cinematic Camera
  // ==========================================================================

  const airborneVehicles = new Map(); // car -> ballistic flight state
  let stuntSlowMoActive = false;

  const cinematicStuntCam = {
    active: false,
    lingerTimer: 0,
    car: null,
    ramp: null,
    sideSign: 1,
    camX: 0,
    camY: 2,
    camZ: 0,
    lookX: 0,
    lookY: 1,
    lookZ: 0,
    fov: 56,
  };

  // Live Mid-Air Telemetry HUD + Interactive 12-Stunt-Jumps Challenge & GPS Directory
  const stuntUI = {
    hudEl: null,
    distValEl: null,
    heightValEl: null,
    flipValEl: null,
    progValEl: null,
    nameValEl: null,
    menuOpen: false,
    menuEl: null,
    mapCanvas: null,
    mapCtx: null,
    listContainer: null,
    prevKeyJ: false,
    prevKeyG: false,
  };

  function ensureStuntLiveHUD() {
    if (stuntUI.hudEl || typeof document === 'undefined') return stuntUI.hudEl;

    const el = document.createElement('div');
    el.id = 'gta-stunt-live-hud';
    el.style.cssText = [
      'position:fixed',
      'right:26px',
      'bottom:148px',
      'z-index:8200',
      'display:none',
      'min-width:278px',
      'padding:14px 18px',
      'background:linear-gradient(145deg, rgba(10,15,28,0.92), rgba(24,18,8,0.90))',
      'border-left:5px solid #facc15',
      'border-top:1px solid rgba(250,204,21,0.45)',
      'border-radius:10px',
      'box-shadow:0 16px 38px rgba(0,0,0,0.72)',
      'color:#f8fafc',
      'font-family:"Segoe UI",system-ui,sans-serif',
      'pointer-events:none',
      'transform:skewX(-4deg)',
    ].join(';');

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:11px;font-weight:800;letter-spacing:1.6px;color:#facc15;">🎬 STUNT CAMERA • 0.45x SLOW-MO</span>
        <span id="gta-stunt-hud-prog" style="font-size:12px;font-weight:800;color:#34d399;">0/12</span>
      </div>
      <div id="gta-stunt-hud-name" style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Điểm Bay Xe Mạo Hiểm</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;background:rgba(0,0,0,0.36);padding:8px;border-radius:7px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;font-weight:700;">KHOẢNG CÁCH</div>
          <div id="gta-stunt-hud-dist" style="font-size:20px;font-weight:900;color:#fde047;font-family:Consolas,monospace;">0.0m</div>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;font-weight:700;">ĐỘ CAO</div>
          <div id="gta-stunt-hud-height" style="font-size:20px;font-weight:900;color:#38bdf8;font-family:Consolas,monospace;">0.0m</div>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;font-weight:700;">NHÀO LỘN</div>
          <div id="gta-stunt-hud-flip" style="font-size:20px;font-weight:900;color:#f472b6;font-family:Consolas,monospace;">0°</div>
        </div>
      </div>
      <div style="font-size:11px;color:#cbd5e1;margin-top:6px;text-align:center;">Giữ <b>[A/D]</b> hoặc <b>[W/S]</b> trên không để cân bằng & xoay xe!</div>
    `;

    document.body.appendChild(el);
    stuntUI.hudEl = el;
    stuntUI.distValEl = el.querySelector('#gta-stunt-hud-dist');
    stuntUI.heightValEl = el.querySelector('#gta-stunt-hud-height');
    stuntUI.flipValEl = el.querySelector('#gta-stunt-hud-flip');
    stuntUI.progValEl = el.querySelector('#gta-stunt-hud-prog');
    stuntUI.nameValEl = el.querySelector('#gta-stunt-hud-name');
    return el;
  }

  // Set GPS Route to any Ngự Phong Phi Độ or Infrastructure Landmark cleanly
  function setInfraGPSWaypoint(targetX, targetZ, label = 'Điểm Bay Mạo Hiểm') {
    const p = activeCtx?.player;
    const px = Number.isFinite(p?.x) && p.x < 500 ? p.x : 26;
    const pz = Number.isFinite(p?.z) && p.z < 500 ? p.z : 28;

    let path = null;
    if (typeof activeCtx?.world?.findGPSPath === 'function') {
      path = activeCtx.world.findGPSPath(px, pz, targetX, targetZ);
    }
    if (!Array.isArray(path) || path.length === 0) {
      path = [{ x: px, z: pz }, { x: targetX, z: targetZ }];
    }
    if (Array.isArray(activeCtx?.gameplay?.gpsWaypoints)) {
      activeCtx.gameplay.gpsWaypoints.length = 0;
      for (let i = 0; i < path.length; i++) {
        activeCtx.gameplay.gpsWaypoints.push(path[i]);
      }
    }
    activeCtx?.ui?.showNotification?.(`📍 Đã đặt lộ trình GPS tới: ${label}`, 3.2);
  }

  // Interactive 12-Stunt-Jumps Directory & Radar Map Modal (toggle with [J] or API)
  function ensureStuntDirectoryModal() {
    if (stuntUI.menuEl || typeof document === 'undefined') return stuntUI.menuEl;

    const modal = document.createElement('div');
    modal.id = 'gta-stunt-directory-modal';
    modal.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:9350',
      'display:none',
      'align-items:center',
      'justify-content:center',
      'background:rgba(4,9,18,0.84)',
      'backdrop-filter:blur(6px)',
      'font-family:"Segoe UI",system-ui,sans-serif',
      'user-select:none',
    ].join(';');

    const panel = document.createElement('div');
    panel.style.cssText = [
      'width:min(940px, 95vw)',
      'max-height:88vh',
      'display:flex',
      'flex-direction:column',
      'background:linear-gradient(160deg,#0f172a,#111827)',
      'border:2px solid #facc15',
      'border-radius:16px',
      'box-shadow:0 24px 64px rgba(0,0,0,0.88)',
      'overflow:hidden',
      'color:#f8fafc',
    ].join(';');

    const topBar = document.createElement('div');
    topBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:14px 20px;background:rgba(0,0,0,0.45);border-bottom:1px solid rgba(250,204,21,0.3);';
    topBar.innerHTML = `
      <div>
        <div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#facc15;">LOS SANTOS EXTREME STUNT CHALLENGE</div>
        <div id="gta-stunt-modal-title" style="font-size:20px;font-weight:900;color:#ffffff;">BẢN ĐỒ 12 ĐIỂM BAY XE MẠO HIỂM (0/12)</div>
      </div>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '✕ Đóng [J / Esc]';
    closeBtn.style.cssText = 'padding:8px 14px;border-radius:8px;border:1px solid #475569;background:#1e293b;color:#f8fafc;font-weight:700;cursor:pointer;';
    closeBtn.addEventListener('click', () => closeStuntDirectory());
    topBar.appendChild(closeBtn);
    panel.appendChild(topBar);

    const bodyGrid = document.createElement('div');
    bodyGrid.style.cssText = 'display:grid;grid-template-columns:320px 1fr;gap:16px;padding:16px;overflow-y:auto;';

    const mapWrap = document.createElement('div');
    mapWrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;background:#090f1c;border:1px solid #334155;border-radius:12px;padding:10px;';
    const mapCanvas = document.createElement('canvas');
    mapCanvas.width = 296;
    mapCanvas.height = 296;
    mapCanvas.style.cssText = 'width:296px;height:296px;border-radius:8px;display:block;';
    mapWrap.appendChild(mapCanvas);

    const mapLegend = document.createElement('div');
    mapLegend.style.cssText = 'font-size:12px;color:#cbd5e1;margin-top:10px;line-height:1.5;text-align:left;width:100%;';
    mapLegend.innerHTML = `
      <div>🟡 <b>Vàng:</b> Chưa hoàn thành (+$2,000)</div>
      <div>🟢 <b>Xanh ngọc:</b> Đã chinh phục</div>
      <div>⚡ <b>Yêu cầu:</b> Phóng qua dốc ở tốc độ <b>&gt; 18 m/s (65 km/h)</b>!</div>
      <div>🏆 <b>Đủ 12/12:</b> Thưởng nóng <b>+$25,000</b> Siêu Cúp!</div>
    `;
    mapWrap.appendChild(mapLegend);

    const listWrap = document.createElement('div');
    listWrap.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:10px;overflow-y:auto;max-height:64vh;padding-right:4px;';

    bodyGrid.appendChild(mapWrap);
    bodyGrid.appendChild(listWrap);
    panel.appendChild(bodyGrid);

    // Quick Infrastructure Landmark GPS & Challenge Bar at Bottom of [J] Directory
    const quickBar = document.createElement('div');
    quickBar.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;padding:12px 16px;background:rgba(0,0,0,0.42);border-top:1px solid #334155;';

    const quickItems = [
      {
        label: '🏦 GPS Ngân Hàng Linh Thạch Bảo Khố',
        color: '#10b981',
        fn: () => {
          setInfraGPSWaypoint(BANK_EXT_POS.x, BANK_EXT_POS.z, 'Ngân Hàng Trung Ương Linh Thạch Bảo Khố');
          closeStuntDirectory();
        },
      },
      {
        label: '🛥 GPS Bến Du Thuyền & Siêu Du Thuyền 62m',
        color: '#38bdf8',
        fn: () => {
          setInfraGPSWaypoint(-194.0, 108.0, 'Bến Du Thuyền Hạng Sang Bồng Lai Tiên Đảo');
          closeStuntDirectory();
        },
      },
      {
        label: '🔭 GPS Đài Thiên Văn Đồi Côn Lôn Tiên Sơn (28m)',
        color: '#a78bfa',
        fn: () => {
          setInfraGPSWaypoint(26.0, -206.0, 'Lối Lên Đèo Đài Thiên Văn Côn Lôn Tiên Sơn');
          closeStuntDirectory();
        },
      },
      {
        label: '🏁 Đua Tính Giờ Hạ Tầng (+$15,000)',
        color: '#f59e0b',
        fn: () => {
          closeStuntDirectory();
          startInfraTimeTrial();
        },
      },
      {
        label: '🎥 Flycam 5 Kỳ Quan',
        color: '#facc15',
        fn: () => {
          closeStuntDirectory();
          startScenicTour();
        },
      },
    ];

    for (let qi = 0; qi < quickItems.length; qi++) {
      const q = quickItems[qi];
      const qb = document.createElement('button');
      qb.type = 'button';
      qb.textContent = q.label;
      qb.style.cssText = [
        'padding:7px 11px',
        'border-radius:7px',
        `border:1px solid ${q.color}`,
        'background:rgba(15,23,42,0.85)',
        'color:#f8fafc',
        'font-size:12px',
        'font-weight:700',
        'cursor:pointer',
      ].join(';');
      qb.addEventListener('click', q.fn);
      quickBar.appendChild(qb);
    }

    panel.appendChild(quickBar);
    modal.appendChild(panel);
    document.body.appendChild(modal);

    stuntUI.menuEl = modal;
    stuntUI.mapCanvas = mapCanvas;
    stuntUI.mapCtx = mapCanvas.getContext('2d');
    stuntUI.listContainer = listWrap;
    return modal;
  }

  function renderStuntDirectoryContents() {
    if (!stuntUI.menuEl || !stuntUI.mapCtx || !stuntUI.listContainer) return;

    const titleEl = stuntUI.menuEl.querySelector('#gta-stunt-modal-title');
    if (titleEl) {
      titleEl.textContent = `BẢN ĐỒ 12 ĐIỂM BAY XE MẠO HIỂM (${completedStuntIds.size}/12 ĐÃ HOÀN THÀNH)`;
    }

    // 1) Render Crisp Overview Radar Map of Ocean, Beach, Pier, Bridge, Island, Freeway, Observatory & 12 Ramps!
    const g = stuntUI.mapCtx;
    const w = stuntUI.mapCanvas.width;
    const h = stuntUI.mapCanvas.height;
    const toMapX = (wx) => ((wx - (-325)) / (285 - (-325))) * w;
    const toMapY = (wz) => ((wz - (-285)) / (265 - (-285))) * h;

    g.fillStyle = '#0c2238';
    g.fillRect(0, 0, w, h);

    // Sandy Beach & City Landmass
    g.fillStyle = '#7c6f56';
    g.fillRect(toMapX(-212), toMapY(-240), toMapX(-128) - toMapX(-212), toMapY(235) - toMapY(-240));
    g.fillStyle = '#1b2432';
    g.fillRect(toMapX(-128), toMapY(-230), toMapX(260) - toMapX(-128), toMapY(235) - toMapY(-230));
    g.fillStyle = '#1e3329';
    g.fillRect(toMapX(-190), toMapY(-285), toMapX(265) - toMapX(-190), toMapY(-220) - toMapY(-285));

    // Lighthouse Island & Marina & Pier
    g.fillStyle = '#57534e';
    g.beginPath();
    g.arc(toMapX(-275), toMapY(200), 14, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ef4444';
    g.fillRect(toMapX(-245), toMapY(196), toMapX(-127) - toMapX(-245), 5);
    g.fillStyle = '#92400e';
    g.fillRect(toMapX(-292), toMapY(-30), toMapX(-128) - toMapX(-292), 22);

    // City Road Grid
    g.strokeStyle = '#475569';
    g.lineWidth = 1.6;
    for (const ax of [-120, -40, 40, 120, 200]) {
      g.beginPath();
      g.moveTo(toMapX(ax), toMapY(-225));
      g.lineTo(toMapX(ax), toMapY(232));
      g.stroke();
    }
    for (const sz of [-200, -120, -40, 40, 120, 200]) {
      g.beginPath();
      g.moveTo(toMapX(-128), toMapY(sz));
      g.lineTo(toMapX(246), toMapY(sz));
      g.stroke();
    }

    // Elevated Freeway Polyline in Cyan
    g.strokeStyle = '#38bdf8';
    g.lineWidth = 2.5;
    g.beginPath();
    for (let i = 0; i < freewayNodes.length; i++) {
      const fn = freewayNodes[i];
      if (i === 0) g.moveTo(toMapX(fn.x), toMapY(fn.z));
      else g.lineTo(toMapX(fn.x), toMapY(fn.z));
    }
    g.stroke();

    // 12 Ngự Phong Phi Độ Numbered Pins
    for (let i = 0; i < stuntJumps.length; i++) {
      const sj = stuntJumps[i];
      const mx = toMapX(sj.x);
      const my = toMapY(sj.z);
      g.fillStyle = sj.completed ? '#10b981' : '#facc15';
      g.strokeStyle = '#090d16';
      g.lineWidth = 1.8;
      g.beginPath();
      g.arc(mx, my, 7.5, 0, Math.PI * 2);
      g.fill();
      g.stroke();

      g.fillStyle = '#090d16';
      g.font = 'bold 9px Arial, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(sj.id), mx, my + 0.5);
    }

    // Player Live Position Dot
    const p = activeCtx?.player;
    if (p && Number.isFinite(p.x) && p.x < 500) {
      g.fillStyle = '#ffffff';
      g.strokeStyle = '#ef4444';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(toMapX(p.x), toMapY(p.z), 5, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }

    // 2) Populate 12 Stunt Cards with 1-Click GPS Routing
    stuntUI.listContainer.innerHTML = '';
    for (let i = 0; i < stuntJumps.length; i++) {
      const sj = stuntJumps[i];
      const item = document.createElement('div');
      item.style.cssText = [
        'padding:10px 12px',
        'border-radius:10px',
        `border:1px solid ${sj.completed ? '#10b981' : '#334155'}`,
        `background:${sj.completed ? 'rgba(6,78,59,0.28)' : 'rgba(30,41,59,0.55)'}`,
        'display:flex',
        'flex-direction:column',
        'justify-content:space-between',
        'gap:6px',
      ].join(';');

      const bestTxt = sj.bestDistance > 0
        ? `Kỷ lục: <b>${sj.bestDistance.toFixed(1)}m</b> • Cao: ${sj.bestHeight.toFixed(1)}m`
        : `Tối thiểu: ${sj.minDist}m • Thưởng: <b>+$2,000</b>`;

      item.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:11px;font-weight:800;color:${sj.completed ? '#34d399' : '#fde047'};">#${sj.id} • ${sj.zone}</span>
          <span style="font-size:11px;font-weight:800;color:${sj.completed ? '#34d399' : '#94a3b8'};">${sj.completed ? '✓ ĐÃ XONG' : 'CHƯA BAY'}</span>
        </div>
        <div style="font-size:13px;font-weight:700;color:#f8fafc;">${sj.name}</div>
        <div style="font-size:11px;color:#cbd5e1;">${bestTxt}</div>
      `;

      const gpsBtn = document.createElement('button');
      gpsBtn.type = 'button';
      gpsBtn.textContent = '📍 Đặt GPS Dẫn Đường Đến Dốc';
      gpsBtn.style.cssText = [
        'padding:6px 10px',
        'border-radius:6px',
        'border:1px solid #eab308',
        'background:rgba(234,179,8,0.16)',
        'color:#fde047',
        'font-size:12px',
        'font-weight:700',
        'cursor:pointer',
      ].join(';');
      gpsBtn.addEventListener('click', () => {
        // Point GPS 18m behind the ramp's entry toe so player lines up straight onto the ramp!
        const approachX = sj.x - sj.fwdX * (sj.halfL + 16.0);
        const approachZ = sj.z - sj.fwdZ * (sj.halfL + 16.0);
        setInfraGPSWaypoint(approachX, approachZ, `Dốc Bay #${sj.id}: ${sj.name}`);
        closeStuntDirectory();
      });

      item.appendChild(gpsBtn);
      stuntUI.listContainer.appendChild(item);
    }
  }

  function openStuntDirectory() {
    if (activeCtx?.activeModal && activeCtx.activeModal !== 'stunt_map') return false;
    const modal = ensureStuntDirectoryModal();
    if (!modal) return false;
    renderStuntDirectoryContents();
    stuntUI.menuOpen = true;
    modal.style.display = 'flex';
    activeCtx.activeModal = 'stunt_map';
    if (typeof document !== 'undefined' && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    return true;
  }

  function closeStuntDirectory() {
    if (!stuntUI.menuOpen) return;
    stuntUI.menuOpen = false;
    if (stuntUI.menuEl) stuntUI.menuEl.style.display = 'none';
    if (activeCtx && activeCtx.activeModal === 'stunt_map') {
      activeCtx.activeModal = null;
    }
  }

  function refreshStuntBeaconColors() {
    if (!stuntBeaconInst) return;
    const colGold = new THREE.Color(0xfacc15);
    const colDone = new THREE.Color(0x10b981);
    for (let i = 0; i < stuntBeaconSeeds.length; i++) {
      const sb = stuntBeaconSeeds[i];
      const done = stuntJumps[sb.stuntIndex]?.completed;
      stuntBeaconInst.setColorAt(i, done ? colDone : colGold);
    }
    if (stuntBeaconInst.instanceColor) {
      stuntBeaconInst.instanceColor.needsUpdate = true;
    }
  }

  function releaseStuntSlowMo() {
    if (stuntSlowMoActive) {
      stuntSlowMoActive = false;
      if (activeCtx && !activeCtx.player?.specialActive && !activeCtx.player?.isDead && !activeCtx.player?.isBusted) {
        activeCtx.timeScale = 1.0;
      }
    }
    sfx.stopAirborneWind();
    if (stuntUI.hudEl) {
      stuntUI.hudEl.style.display = 'none';
    }
  }

  // Trigger a Ballistic Stunt Launch for `car` off `ramp`!
  function launchVehicleFromStuntRamp(car, ramp, horizSpeed, isPlayerDriving) {
    const isCinematic = Boolean(isPlayerDriving && horizSpeed > 18.0);
    const liftVy = horizSpeed * Math.tan(ramp.launchAngle) * 1.16 + 2.65;

    // Project horizontal velocity cleanly forward along ramp heading while keeping slight player steer
    const curVx = Number.isFinite(car.vx) && Math.hypot(car.vx, car.vz) > 1
      ? car.vx
      : ramp.fwdX * horizSpeed;
    const curVz = Number.isFinite(car.vz) && Math.hypot(car.vx, car.vz) > 1
      ? car.vz
      : ramp.fwdZ * horizSpeed;

    const airState = {
      car,
      ramp,
      isPlayer: isPlayerDriving,
      cinematic: isCinematic,
      startX: car.x,
      startY: Math.max(car.y || ramp.lipY, ramp.lipY - 0.35),
      startZ: car.z,
      x: car.x,
      y: Math.max(car.y || ramp.lipY, ramp.lipY - 0.25),
      z: car.z,
      vx: curVx * 1.03,
      vy: liftVy,
      vz: curVz * 1.03,
      launchSpeed: horizSpeed,
      pitch: -ramp.launchAngle * 0.92,
      roll: 0,
      accumRoll: 0,
      accumPitch: 0,
      maxHeightAboveGround: 0,
      currentDistance: 0,
      airTime: 0,
    };

    airborneVehicles.set(car, airState);
    ramp.attempts++;

    if (isPlayerDriving) {
      sfx.playStuntLaunch(horizSpeed, isCinematic);
      activeCtx?.engine?.addShake?.(0.24);

      if (isCinematic) {
        ensureStuntLiveHUD();
        if (stuntUI.hudEl) stuntUI.hudEl.style.display = 'block';
        if (stuntUI.nameValEl) stuntUI.nameValEl.textContent = `#${ramp.id} • ${ramp.name}`;
        if (stuntUI.progValEl) stuntUI.progValEl.textContent = `${completedStuntIds.size}/12`;

        // Choose side-tracking angle (prefer ocean/open vista side via LOS check!)
        let chosenSide = 1;
        if (activeCtx?.world?.checkLOS) {
          const testDist = 10.5;
          const rightClear = activeCtx.world.checkLOS(
            car.x, airState.y + 1.5, car.z,
            car.x + ramp.rightX * testDist, airState.y + 1.8, car.z + ramp.rightZ * testDist
          );
          const leftClear = activeCtx.world.checkLOS(
            car.x, airState.y + 1.5, car.z,
            car.x - ramp.rightX * testDist, airState.y + 1.8, car.z - ramp.rightZ * testDist
          );
          if (!rightClear && leftClear) chosenSide = -1;
        }

        cinematicStuntCam.active = true;
        cinematicStuntCam.lingerTimer = 0;
        cinematicStuntCam.car = car;
        cinematicStuntCam.ramp = ramp;
        cinematicStuntCam.sideSign = chosenSide;
        cinematicStuntCam.camX = car.x + ramp.rightX * chosenSide * 9.5 - ramp.fwdX * 3.8;
        cinematicStuntCam.camY = airState.y + 0.85;
        cinematicStuntCam.camZ = car.z + ramp.rightZ * chosenSide * 9.5 - ramp.fwdZ * 3.8;
        cinematicStuntCam.lookX = car.x;
        cinematicStuntCam.lookY = airState.y + 0.65;
        cinematicStuntCam.lookZ = car.z;
        cinematicStuntCam.fov = 55;

        if (!activeCtx?.player?.specialActive && !activeCtx?.player?.isDead) {
          activeCtx.timeScale = 0.45; // Authentic Tu Tiên 0.45x Stunt Slow-Motion!
          stuntSlowMoActive = true;
        }
      } else {
        activeCtx?.ui?.showNotification?.(
          `⚡ Phóng qua Dốc #${ramp.id} (${Math.round(horizSpeed * 3.6)} km/h) — Đạt trên 65 km/h (18 m/s) để kích hoạt Camera Điện Ảnh!`,
          3.4
        );
      }
    }
  }

  // Step all airborne stunt vehicles & check ramp crest triggers
  function postStepVehiclesInfra(dt) {
    const vList = activeCtx?.vehicles?.list;
    if (!Array.isArray(vList) || vList.length === 0) return;

    const safeDt = clamp(dt || 0.016, 0.0005, 0.08);
    const p = activeCtx?.player;
    const playerCar = p?.inCar && typeof p.inCar === 'object' ? p.inCar : null;

    // 1) Compensate hardcoded `x < -206` surf drag in vehicles.js when driving on dry elevated structures
    //    (Red Cable-Stayed Bridge, Lighthouse Island y=4.0m, Marina Access Ramp, Bồng Lai Tiên Đảo Pier y=3.8m)
    for (let i = 0; i < vList.length; i++) {
      const car = vList[i];
      if (!car || car.isHeli || car.destroyed || airborneVehicles.has(car)) continue;
      if (car.x < -206.0 && (car.y || 0) >= 0.65) {
        const extraY = getExtraGroundHeight(car.x, car.z, car.y);
        if (extraY !== null && extraY >= 0.65) {
          const boostBack = Math.exp(3.45 * safeDt);
          car.vx *= boostBack;
          car.vz *= boostBack;
          const maxSpd = (car.maxSpeed || 38) * 1.12;
          const curSpd = Math.hypot(car.vx, car.vz);
          if (curSpd > maxSpd) {
            const sc = maxSpd / curSpd;
            car.vx *= sc;
            car.vz *= sc;
          }
          car.absSpeed = Math.hypot(car.vx, car.vz);
        }
      }
    }

    // 2) Check Stunt Ramp Lip Launch Triggers for Grounded Vehicles!
    for (let i = 0; i < vList.length; i++) {
      const car = vList[i];
      if (!car || car.isHeli || car.destroyed || airborneVehicles.has(car)) continue;

      const vx = car.vx || 0;
      const vz = car.vz || 0;
      const hSpd = Math.max(Math.hypot(vx, vz), Math.abs(car.speed || 0));
      if (hSpd < 10.5) continue;

      for (let r = 0; r < stuntJumps.length; r++) {
        const sj = stuntJumps[r];
        if (Math.abs((car.y || 0) - sj.lipY) > 2.8) continue;

        const dx = car.x - sj.x;
        const dz = car.z - sj.z;
        const localZ = dx * sj.fwdX + dz * sj.fwdZ;
        const localX = dx * sj.rightX + dz * sj.rightZ;

        if (Math.abs(localX) <= sj.halfW + 0.45 && localZ >= sj.halfL * 0.64 && localZ <= sj.halfL + 1.35) {
          const dirX = hSpd > 0.5 ? vx / (Math.hypot(vx, vz) || 1) : Math.sin(car.yaw || 0);
          const dirZ = hSpd > 0.5 ? vz / (Math.hypot(vx, vz) || 1) : Math.cos(car.yaw || 0);
          const alignDot = dirX * sj.fwdX + dirZ * sj.fwdZ;
          if (alignDot >= 0.58) {
            launchVehicleFromStuntRamp(car, sj, hSpd, car === playerCar);
            break;
          }
        }
      }
    }

    // 3) Integrate Active Ballistic Airborne Stunt Flights!
    if (airborneVehicles.size === 0) return;

    const k = activeCtx?.input?.keys || {};

    for (const [car, st] of airborneVehicles.entries()) {
      if (!car || car.destroyed || !vList.includes(car)) {
        if (st.isPlayer) releaseStuntSlowMo();
        airborneVehicles.delete(car);
        continue;
      }

      const stillPlayerDriving = car === playerCar;
      if (st.isPlayer && !stillPlayerDriving) {
        releaseStuntSlowMo();
        st.isPlayer = false;
        st.cinematic = false;
        cinematicStuntCam.active = false;
      }

      st.airTime += safeDt;

      // Maintain Tu Tiên 0.45x slow-mo throughout cinematic player flight
      if (st.cinematic && stillPlayerDriving && !p?.specialActive && !p?.isDead && !p?.isBusted) {
        activeCtx.timeScale = 0.45;
        stuntSlowMoActive = true;
      }

      // Mid-air aerodynamic attitude controls (W/S nose pitch, A/D barrel roll)
      let pitchCtrl = 0;
      let rollCtrl = 0;
      if (stillPlayerDriving && !activeCtx?.activeModal && !activeCtx?.paused) {
        if (k.KeyW || k.w || k.ArrowUp) pitchCtrl += 1;
        if (k.KeyS || k.s || k.ArrowDown) pitchCtrl -= 1;
        if (k.KeyA || k.a || k.ArrowLeft) rollCtrl += 1;
        if (k.KeyD || k.d || k.ArrowRight) rollCtrl -= 1;
      }

      const dPitch = (0.36 + pitchCtrl * 1.45) * safeDt;
      const dRoll = rollCtrl * 2.65 * safeDt;
      st.pitch = clamp(st.pitch + dPitch, -0.95, 0.95);
      st.roll = wrapAngle(st.roll + dRoll);
      st.accumPitch += Math.abs(dPitch);
      st.accumRoll += Math.abs(dRoll);

      // Integrate 3D parabolic ballistic trajectory (overrides vehicles.js ground snap!)
      st.vy -= 17.2 * safeDt;
      st.vx *= Math.exp(-0.08 * safeDt);
      st.vz *= Math.exp(-0.08 * safeDt);

      st.x = clamp(st.x + st.vx * safeDt, -315, 275);
      st.y += st.vy * safeDt;
      st.z = clamp(st.z + st.vz * safeDt, -275, 255);

      car.x = st.x;
      car.y = st.y;
      car.z = st.z;
      car.vx = st.vx;
      car.vz = st.vz;
      car.suspVelY = 0;

      // Mid-air building AABB deflection check at current altitude `st.y`
      const midCol = activeCtx?.world?.resolveCarAABB?.(car);
      if (midCol && midCol.hit) {
        st.x = car.x;
        st.z = car.z;
        const nx = midCol.normalX || 0;
        const nz = midCol.normalZ || 0;
        const vn = st.vx * nx + st.vz * nz;
        if (vn < 0) {
          st.vx -= 1.4 * vn * nx;
          st.vz -= 1.4 * vn * nz;
          st.vx *= 0.65;
          st.vz *= 0.65;
        }
      }

      const groundBelowY = activeCtx?.world?.getGroundHeight
        ? activeCtx.world.getGroundHeight(st.x, st.z, st.y)
        : 0.02;

      const curClearance = Math.max(0, st.y - groundBelowY);
      if (curClearance > st.maxHeightAboveGround) {
        st.maxHeightAboveGround = curClearance;
      }
      st.currentDistance = Math.hypot(st.x - st.startX, st.z - st.startZ);

      // Update vehicle 3D transform, spinning wheels & seated player mesh in mid-air!
      if (car.mesh) {
        car.mesh.position.set(car.x, car.y, car.z);
        car.mesh.rotation.y = car.yaw;
      }
      if (car.chassis) {
        car.chassis.rotation.x = st.pitch;
        car.chassis.rotation.z = st.roll;
        car.chassis.position.y = 0;
      }
      if (Array.isArray(car.wheels)) {
        const wheelSpin = (st.launchSpeed / 0.34) * safeDt;
        for (let wi = 0; wi < car.wheels.length; wi++) {
          if (car.wheels[wi]?.spinGroup) {
            car.wheels[wi].spinGroup.rotation.x += wheelSpin;
          }
        }
      }

      if (stillPlayerDriving && p) {
        p.x = car.x;
        p.y = car.y;
        p.z = car.z;
        p.vx = car.vx;
        p.vz = car.vz;
        if (car.isOpenTop && car.driverSeatAnchor && (p.mesh || p.rig?.root)) {
          const pMesh = p.mesh || p.rig.root;
          car.chassis.updateMatrixWorld(true);
          car.driverSeatAnchor.getWorldPosition(_bPos);
          car.chassis.getWorldQuaternion(_bQuat);
          const seatOff = new THREE.Vector3(0, -0.35, 0.03).applyQuaternion(_bQuat);
          pMesh.position.copy(_bPos).add(seatOff);
          pMesh.quaternion.copy(_bQuat);
        }
      }

      // Live Telemetry HUD & Mid-Air Wind Synth Update
      if (st.cinematic && stillPlayerDriving) {
        sfx.updateAirborneWind(Math.hypot(st.vx, st.vz), curClearance, dRoll / safeDt);
        const totalDeg = Math.round(((st.accumRoll + st.accumPitch * 0.4) * 180) / Math.PI);
        if (stuntUI.distValEl) stuntUI.distValEl.textContent = `${st.currentDistance.toFixed(1)}m`;
        if (stuntUI.heightValEl) stuntUI.heightValEl.textContent = `${st.maxHeightAboveGround.toFixed(1)}m`;
        if (stuntUI.flipValEl) stuntUI.flipValEl.textContent = `${totalDeg}°`;
      }

      // 4) Check Touchdown Condition (after clearing ramp lip > 0.16s)!
      const landed = st.airTime > 0.16 && st.vy <= 0 && st.y <= groundBelowY + 0.08;
      const timedOut = st.airTime > 7.5;

      if (landed || timedOut) {
        // Rescue safety if player launched from Coastal Bridge / Freeway into deep Pacific Ocean!
        const inDeepOcean = st.x < -215 && groundBelowY < -0.70 && getExtraGroundHeight(st.x, st.z, 4.0) === null;
        if (inDeepOcean && stillPlayerDriving) {
          // Place car safely onto nearest coastal apron / Lighthouse Island / Beach sand
          const safeX = st.z > 165 ? -258.0 : -186.0;
          const safeZ = st.z > 165 ? 200.0 : clamp(st.z, -180, 180);
          const safeY = activeCtx?.world?.getGroundHeight?.(safeX, safeZ, 5.0) ?? 0.22;
          car.x = safeX;
          car.y = safeY;
          car.z = safeZ;
          car.vx = 0;
          car.vz = 0;
          if (car.mesh) car.mesh.position.set(car.x, car.y, car.z);
        } else {
          car.y = groundBelowY;
          car.suspVelY = -3.4; // Satisfying 4-wheel suspension compression bounce!
        }

        car.roll = 0;
        car.pitch = 0.08;
        if (car.chassis) {
          car.chassis.rotation.z = 0;
          car.chassis.rotation.x = 0.08;
        }

        // Landing Sparks & Tire Smoke Burst
        activeCtx?.characters?.spawnParticles?.(car.x, car.y + 0.22, car.z, 'sparks', 14, 7.5);
        activeCtx?.characters?.spawnParticles?.(car.x, car.y + 0.25, car.z, 'smoke', 8, 3.2);

        if (stillPlayerDriving) {
          releaseStuntSlowMo();
          activeCtx?.engine?.addShake?.(0.36);

          if (cinematicStuntCam.active) {
            cinematicStuntCam.lingerTimer = 0.42; // Brief dramatic Tu Tiên landing linger before returning to chase cam!
          }

          const distM = Math.round(st.currentDistance);
          const peakM = Math.round(st.maxHeightAboveGround * 10) / 10;
          const flips = Math.floor((st.accumRoll + 0.45) / (Math.PI * 2));
          const cleanLanding = !inDeepOcean && Math.abs(st.roll) < 1.35 && distM >= Math.min(18, st.ramp.minDist * 0.65);

          if (cleanLanding && st.launchSpeed > 18.0) {
            const wasFirstTime = !st.ramp.completed;
            const isNewRecord = st.currentDistance > st.ramp.bestDistance;
            st.ramp.completed = true;
            completedStuntIds.add(st.ramp.id);
            if (st.currentDistance > st.ramp.bestDistance) st.ramp.bestDistance = st.currentDistance;
            if (st.maxHeightAboveGround > st.ramp.bestHeight) st.ramp.bestHeight = st.maxHeightAboveGround;
            if (flips > st.ramp.bestFlips) st.ramp.bestFlips = flips;

            savePersistedStunts();
            refreshStuntBeaconColors();

            let cashAward = 2000;
            if (flips > 0) cashAward += flips * 1000;
            if (!wasFirstTime && !isNewRecord) cashAward = 750; // Repeat jump bonus

            // All 12/12 Ngự Phong Phi Độ Grand Jackpot!
            let allTwelveBonus = false;
            if (wasFirstTime && completedStuntIds.size === stuntJumps.length) {
              cashAward += 25000;
              allTwelveBonus = true;
            }

            syncPlayerCashSafe(cashAward);
            sfx.playStuntLanding(true, isNewRecord);

            const flipBadge = flips > 0 ? ` • Nhào lộn ${flips} vòng` : '';
            const subtitle = allTwelveBonus
              ? `CHINH PHỤC ĐỦ 12/12 ĐIỂM BAY! Khoảng cách: ${distM}m • +$${cashAward.toLocaleString('en-US')}`
              : `Khoảng cách: ${distM}m • Độ cao: ${peakM}m${flipBadge} • +$${cashAward.toLocaleString('en-US')} (${completedStuntIds.size}/12)`;

            // Exact Tu Tiên Landing Banner required by specification!
            activeCtx?.ui?.showBanner?.('PHA BAY XE ĐẲNG CẤP!', subtitle, 'passed');
            activeCtx?.ui?.showNotification?.(
              `🏆 PHA BAY XE ĐẲNG CẤP! Khoảng cách: ${distM}m • +$${cashAward.toLocaleString('en-US')} (Đã hoàn thành ${completedStuntIds.size}/12)`,
              5.0
            );
          } else {
            sfx.playStuntLanding(false, false);
            const failReason = inDeepOcean
              ? 'Rơi xuống vùng nước sâu — Đã cứu hộ xe lên bờ!'
              : st.launchSpeed <= 18.0
                ? `Cần tốc độ phóng > 65 km/h (Khoảng cách: ${distM}m)`
                : `Tiếp đất lệch bánh (${distM}m) — Hãy giữ cân bằng xe trên không!`;
            activeCtx?.ui?.showNotification?.(`⚠ Chưa tính Điểm Bay Mạo Hiểm: ${failReason}`, 3.8);
          }
        }

        airborneVehicles.delete(car);
      }
    }
  }

  // Hook into `ctx.vehicles.updateVehicles` so ballistic airborne physics runs immediately after `stepGroundCar`
  // within the exact same frame BEFORE camera & renderer!
  function ensureVehiclePhysicsHooked() {
    if (vehiclesHooked || !activeCtx?.vehicles || typeof activeCtx.vehicles.updateVehicles !== 'function') {
      return;
    }
    vehiclesHooked = true;
    const origUpdateVehicles = activeCtx.vehicles.updateVehicles.bind(activeCtx.vehicles);
    activeCtx.vehicles.updateVehicles = function wrappedUpdateVehicles(dt, ctxArg) {
      const res = origUpdateVehicles(dt, ctxArg);
      postStepVehiclesInfra(dt);
      return res;
    };
  }

  // ==========================================================================
  // 11B. Elevated Freeway & Red Bridge Express Convoy + Armored Bank Cash Van!
  // ==========================================================================

  const freewayTotalArc = freewayNodes[freewayNodes.length - 1]?.s || 600;
  const expressConvoy = [];
  const highwayCashDrops = [];
  let convoyInitialized = false;

  // Interpolate position, elevation, tangent & right basis at arc-length `s` along freewayNodes
  function sampleFreewayArc(s) {
    const clampedS = clamp(s, 0, freewayTotalArc);
    let lo = 0;
    let hi = freewayNodes.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((freewayNodes[mid].s || 0) <= clampedS) lo = mid;
      else hi = mid - 1;
    }
    const a = freewayNodes[lo];
    const b = freewayNodes[Math.min(freewayNodes.length - 1, lo + 1)];
    const segLen = Math.max(0.01, (b.s || 0) - (a.s || 0));
    const t = clamp((clampedS - (a.s || 0)) / segLen, 0, 1);

    let tx = lerp(a.tx, b.tx, t);
    let tz = lerp(a.tz, b.tz, t);
    const tLen = Math.hypot(tx, tz) || 1;
    tx /= tLen;
    tz /= tLen;

    return {
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      z: lerp(a.z, b.z, t),
      tx,
      tz,
      rx: -tz,
      rz: tx,
    };
  }

  function spawnHighwayCashCaseDrops(cx, cy, cz) {
    const scene = activeCtx?.engine?.scene;
    if (!scene) return;

    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2 + 0.4;
      const dx = cx + Math.cos(ang) * 2.4;
      const dz = cz + Math.sin(ang) * 2.4;

      const grp = new THREE.Group();
      grp.position.set(dx, cy + 0.35, dz);

      const caseMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.24, 0.48),
        new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.45, roughness: 0.32 })
      );
      const ringMesh = new THREE.Mesh(
        new THREE.RingGeometry(0.65, 0.92, 20),
        new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
      );
      ringMesh.rotation.x = -Math.PI * 0.5;
      ringMesh.position.y = -0.28;
      grp.add(caseMesh, ringMesh);
      scene.add(grp);

      highwayCashDrops.push({
        group: grp,
        caseMesh,
        x: dx,
        y: cy,
        z: dz,
        value: 3000,
        age: 0,
      });
    }

    activeCtx?.characters?.spawnParticles?.(cx, cy + 0.9, cz, 'sparks', 16, 8.0);
    activeCtx?.ui?.showNotification?.(
      '💼 XE BỌC THÉP NGÂN HÀNG BỊ ĐÁNH CHẶN! 3 Vali Tiền Mặt Liên Bang ($9,000) rơi trên Cao Tốc!',
      4.5
    );
  }

  function initExpressFreewayConvoy() {
    if (convoyInitialized || !activeCtx?.vehicles || typeof activeCtx.vehicles.spawnVehicle !== 'function') {
      return;
    }
    convoyInitialized = true;

    const specs = [
      { type: 'swat_van', arc: 95, dir: 1, laneOff: 2.35, baseSpd: 19.5, isArmoredBankVan: true, color: 0x0f3d2e },
      { type: 'obey9f', arc: 245, dir: 1, laneOff: 5.85, baseSpd: 26.5, isArmoredBankVan: false, color: 0xfacc15 },
      { type: 'banshee', arc: 420, dir: -1, laneOff: -2.35, baseSpd: 25.0, isArmoredBankVan: false, color: 0xef4444 },
      { type: 'sedan_lux', arc: 530, dir: -1, laneOff: -5.85, baseSpd: 21.5, isArmoredBankVan: false, color: 0x38bdf8 },
    ];

    for (let i = 0; i < specs.length; i++) {
      const sp = specs[i];
      const sample = sampleFreewayArc(sp.arc);
      const wx = sample.x + sample.rx * sp.laneOff;
      const wz = sample.z + sample.rz * sp.laneOff;
      const wyaw = Math.atan2(sample.tx * sp.dir, sample.tz * sp.dir);

      const car = activeCtx.vehicles.spawnVehicle(sp.type, wx, FREEWAY_DECK_Y + 0.04, wz, wyaw, {
        aiControlled: false,
        hasAIDriver: true,
        color: sp.color,
        maxHp: sp.isArmoredBankVan ? 260 : 145,
      });
      if (car) {
        car.isExpressConvoy = true;
        expressConvoy.push({
          car,
          arc: sp.arc,
          dir: sp.dir,
          laneOff: sp.laneOff,
          baseSpd: sp.baseSpd,
          curSpd: sp.baseSpd,
          isArmoredBankVan: sp.isArmoredBankVan,
          droppedLoot: false,
        });
      }
    }
  }

  function updateExpressFreewayConvoy(dt) {
    if (!convoyInitialized) {
      initExpressFreewayConvoy();
      return;
    }

    const p = activeCtx?.player;
    const vList = activeCtx?.vehicles?.list || [];

    // Update & collect dropped Federal Cash Briefcases on Freeway!
    for (let i = highwayCashDrops.length - 1; i >= 0; i--) {
      const drop = highwayCashDrops[i];
      drop.age += dt;
      drop.caseMesh.rotation.y += dt * 2.4;
      drop.caseMesh.position.y = Math.sin(drop.age * 3.5) * 0.10;

      const pickedUp =
        p &&
        Math.hypot((p.x || 0) - drop.x, (p.z || 0) - drop.z) <= 2.85 &&
        Math.abs((p.y || 0) - drop.y) <= 2.6;

      if (pickedUp || drop.age > 120) {
        if (pickedUp) {
          sfx.playGoldLoot(false);
          syncPlayerCashSafe(drop.value);
          activeCtx?.ui?.showNotification?.(
            `💵 Đã nhặt Vali Tiền Bọc Thép Linh Thạch Bảo Khố (+$${drop.value.toLocaleString('en-US')})!`,
            3.2
          );
        }
        if (drop.group.parent) drop.group.parent.remove(drop.group);
        highwayCashDrops.splice(i, 1);
      }
    }

    for (let i = expressConvoy.length - 1; i >= 0; i--) {
      const unit = expressConvoy[i];
      const car = unit.car;
      const playerAttackedCar =
        Boolean(car && (car._damagedByPlayer || car._lastAttacker === p)) &&
        Boolean(p && Math.hypot((p.x || 0) - car.x, (p.z || 0) - car.z) < 95);

      if (!car || car.destroyed || !vList.includes(car)) {
        if (unit.isArmoredBankVan && !unit.droppedLoot && car && playerAttackedCar) {
          unit.droppedLoot = true;
          spawnHighwayCashCaseDrops(car.x, car.y || FREEWAY_DECK_Y, car.z);
        }
        expressConvoy.splice(i, 1);
        continue;
      }

      // Release kinematic spline control immediately if the player carjacks this express vehicle!
      if (car.isPlayerDriving || p?.inCar === car) {
        car.isExpressConvoy = false;
        car.aiControlled = false;
        expressConvoy.splice(i, 1);
        continue;
      }

      // Prevent AI traffic / barrier bumps from ever damaging or detonating unprovoked convoy vehicles!
      if (!car._damagedByPlayer && car._lastAttacker !== p) {
        car.hp = car.maxHp;
        car.onFire = false;
        if (typeof car.smokeTimer === 'number') car.smokeTimer = 0;
      }

      // Check Armored Bank Van intercept (< 62% HP strictly from direct player attack within 95m!)
      if (unit.isArmoredBankVan && !unit.droppedLoot && car.hp < car.maxHp * 0.62 && playerAttackedCar) {
        unit.droppedLoot = true;
        spawnHighwayCashCaseDrops(car.x, car.y || FREEWAY_DECK_Y, car.z);
        activeCtx?.gameplay?.addCrimeHeat?.(36, 'armored_van_robbery');
      }

      // Check spacing ahead toward player so express traffic brakes politely instead of ramming parked player!
      let targetSpd = unit.baseSpd;
      if (p && Math.abs((p.y || 0) - FREEWAY_DECK_Y) < 3.2) {
        const dx = p.x - car.x;
        const dz = p.z - car.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < 26 * 26) {
          const fwdX = Math.sin(car.yaw);
          const fwdZ = Math.cos(car.yaw);
          const ahead = dx * fwdX + dz * fwdZ;
          const lat = Math.abs(-dx * fwdZ + dz * fwdX);
          if (ahead > 0 && ahead < 24 && lat < 3.4) {
            targetSpd = ahead < 10 ? 0 : unit.baseSpd * 0.35;
          }
        }
      }

      unit.curSpd = damp(unit.curSpd, targetSpd, 4.5, dt);
      car.braking = unit.curSpd < unit.baseSpd * 0.65;

      // Advance along elevated freeway spline & U-turn cleanly at safe outer stubs (s in [26 .. totalArc - 18])
      unit.arc += unit.dir * unit.curSpd * dt;
      if (unit.arc >= freewayTotalArc - 18) {
        unit.arc = freewayTotalArc - 18;
        unit.dir = -1;
        unit.laneOff = -Math.abs(unit.laneOff);
      } else if (unit.arc <= 26) {
        unit.arc = 26;
        unit.dir = 1;
        unit.laneOff = Math.abs(unit.laneOff);
      }

      const smp = sampleFreewayArc(unit.arc);
      const nextX = smp.x + smp.rx * unit.laneOff;
      const nextZ = smp.z + smp.rz * unit.laneOff;
      const desiredYaw = Math.atan2(smp.tx * unit.dir, smp.tz * unit.dir);

      car.x = nextX;
      car.y = smp.y + 0.02;
      car.z = nextZ;
      car.yaw = dampAngle(car.yaw, desiredYaw, 10.0, dt);
      if (car.mesh) {
        car.mesh.position.set(car.x, car.y, car.z);
        car.mesh.rotation.y = car.yaw;
      }
    }
  }

  // ==========================================================================
  // 11C. VIP Helipad Fast-Shuttle, Scenic Cinema Tour & Grand Infra Time-Trial
  // ==========================================================================

  const HELI_SHUTTLE_DESTINATIONS = [
    { id: 'island', name: 'Đảo Hải Đăng & Cầu Dây Văng Đỏ', sub: 'Sân trực thăng ven biển Thái Bình Dương', x: -275.0, y: 4.10, z: 185.0, yaw: Math.PI * 0.5 },
    { id: 'yacht', name: 'Siêu Du Thuyền 62m M/Y Galaxy', sub: 'Bãi đáp mũi tàu & Bể sục Jacuzzi VIP', x: -295.0, y: 4.86, z: 94.2, yaw: 0 },
    { id: 'observatory', name: 'Đài Thiên Văn Đồi Côn Lôn Tiên Sơn (28m)', sub: 'Quảng trường toàn cảnh & Cú bay #12', x: 64.0, y: 28.08, z: -236.0, yaw: 0 },
    { id: 'fib_roof', name: 'Đỉnh Cao Ốc Liên Bang FIB (78m)', sub: 'Bãi đáp trực thăng trung tâm Downtown', x: 160.0, y: 78.08, z: -42.0, yaw: 0 },
    { id: 'bank', name: 'Ngân Hàng Trung Ương Linh Thạch Bảo Khố', sub: 'Đại sảnh cẩm thạch & Hầm vàng 8 tấn', x: 111.0, y: 0.25, z: -116.5, yaw: Math.PI },
    { id: 'freeway_south', name: 'Cao Tốc Trên Cao Liên Bang (12.5m)', sub: 'Làn tốc độ cao & Cổng thu phí ETC', x: -30.0, y: 12.56, z: 226.0, yaw: Math.PI * 0.5 },
  ];

  const shuttleUI = {
    open: false,
    el: null,
    prevKeyV: false,
  };

  function ensureHeliShuttleModal() {
    if (shuttleUI.el || typeof document === 'undefined') return shuttleUI.el;

    const wrap = document.createElement('div');
    wrap.id = 'gta-heli-shuttle-modal';
    wrap.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:9380',
      'display:none',
      'align-items:center',
      'justify-content:center',
      'background:rgba(4,9,18,0.84)',
      'backdrop-filter:blur(5px)',
      'font-family:"Segoe UI",system-ui,sans-serif',
      'user-select:none',
    ].join(';');

    const box = document.createElement('div');
    box.style.cssText = [
      'width:min(640px, 94vw)',
      'background:linear-gradient(155deg,#0f172a,#111827)',
      'border:2px solid #38bdf8',
      'border-radius:16px',
      'padding:18px 20px',
      'color:#f8fafc',
      'box-shadow:0 24px 60px rgba(0,0,0,0.88)',
    ].join(';');

    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
    head.innerHTML = `
      <div>
        <div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#38bdf8;">MAVERICK VIP HELI-SHUTTLE & INFRASTRUCTURE</div>
        <div style="font-size:19px;font-weight:900;color:#ffffff;">ĐIỀU VẬN BAY NHANH & THỬ THÁCH HẠ TẦNG</div>
      </div>
    `;
    const btnX = document.createElement('button');
    btnX.type = 'button';
    btnX.textContent = '✕ Đóng';
    btnX.style.cssText = 'padding:7px 12px;border-radius:8px;border:1px solid #475569;background:#1e293b;color:#f8fafc;font-weight:700;cursor:pointer;';
    btnX.addEventListener('click', () => closeHeliShuttle());
    head.appendChild(btnX);
    box.appendChild(head);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill, minmax(265px, 1fr));gap:10px;margin-bottom:14px;';

    for (let i = 0; i < HELI_SHUTTLE_DESTINATIONS.length; i++) {
      const dest = HELI_SHUTTLE_DESTINATIONS[i];
      const card = document.createElement('div');
      card.style.cssText = 'padding:10px 12px;border-radius:10px;border:1px solid #334155;background:rgba(30,41,59,0.65);display:flex;flex-direction:column;gap:6px;';
      card.innerHTML = `
        <div style="font-size:13px;font-weight:800;color:#fde047;">🚁 ${dest.name}</div>
        <div style="font-size:11px;color:#cbd5e1;">${dest.sub}</div>
      `;
      const goBtn = document.createElement('button');
      goBtn.type = 'button';
      goBtn.textContent = 'Bay Tới Ngay (Miễn Phí VIP)';
      goBtn.style.cssText = 'padding:6px 10px;border-radius:6px;border:1px solid #38bdf8;background:rgba(56,189,248,0.18);color:#bae6fd;font-weight:700;font-size:12px;cursor:pointer;';
      goBtn.addEventListener('click', () => {
        closeHeliShuttle();
        executeVIPShuttleTeleport(dest);
      });
      card.appendChild(goBtn);
      grid.appendChild(card);
    }
    box.appendChild(grid);

    const actionFooter = document.createElement('div');
    actionFooter.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;border-top:1px solid #334155;padding-top:12px;';

    const btnTimeTrial = document.createElement('button');
    btnTimeTrial.type = 'button';
    btnTimeTrial.textContent = '🏁 Bắt Đầu Đua Tính Giờ: Đảo Hải Đăng → Cao Tốc → Đài Thiên Văn (+$15,000)';
    btnTimeTrial.style.cssText = 'flex:1;padding:9px 12px;border-radius:8px;border:1px solid #10b981;background:linear-gradient(135deg,#065f46,#059669);color:#fff;font-weight:800;font-size:12px;cursor:pointer;';
    btnTimeTrial.addEventListener('click', () => {
      closeHeliShuttle();
      startInfraTimeTrial();
    });

    const btnTour = document.createElement('button');
    btnTour.type = 'button';
    btnTour.textContent = '🎥 Xem Camera Toàn Cảnh 5 Kỳ Quan';
    btnTour.style.cssText = 'padding:9px 14px;border-radius:8px;border:1px solid #facc15;background:rgba(250,204,21,0.16);color:#fde047;font-weight:800;font-size:12px;cursor:pointer;';
    btnTour.addEventListener('click', () => {
      closeHeliShuttle();
      startScenicTour();
    });

    actionFooter.appendChild(btnTimeTrial);
    actionFooter.appendChild(btnTour);
    box.appendChild(actionFooter);

    wrap.appendChild(box);
    document.body.appendChild(wrap);
    shuttleUI.el = wrap;
    return wrap;
  }

  function openHeliShuttle() {
    if (activeCtx?.activeModal && activeCtx.activeModal !== 'heli_shuttle') return false;
    const el = ensureHeliShuttleModal();
    if (!el) return false;
    shuttleUI.open = true;
    el.style.display = 'flex';
    activeCtx.activeModal = 'heli_shuttle';
    if (typeof document !== 'undefined' && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    return true;
  }

  function closeHeliShuttle() {
    if (!shuttleUI.open) return;
    shuttleUI.open = false;
    if (shuttleUI.el) shuttleUI.el.style.display = 'none';
    if (activeCtx && activeCtx.activeModal === 'heli_shuttle') {
      activeCtx.activeModal = null;
    }
  }

  function executeVIPShuttleTeleport(dest) {
    const p = activeCtx?.player;
    if (!p || !dest) return false;
    if (insideBankState) exitBank();
    if (p.inCar && typeof activeCtx?.vehicles?.exitVehicle === 'function') {
      activeCtx.vehicles.exitVehicle();
    }
    p.x = dest.x;
    p.y = dest.y;
    p.z = dest.z;
    p.vx = 0;
    p.vy = 0;
    p.vz = 0;
    p.yaw = dest.yaw;
    p.isGrounded = true;
    const pMesh = p.mesh || p.rig?.root;
    if (pMesh) {
      pMesh.visible = true;
      pMesh.position.set(p.x, p.y, p.z);
      pMesh.rotation.set(0, p.yaw, 0);
    }
    sfx.playStuntLaunch(22, false);
    activeCtx?.ui?.showNotification?.(`🚁 Trực thăng VIP đã đưa bạn tới: ${dest.name}!`, 3.6);
    return true;
  }

  // 5-Shot Scenic Infrastructure Flythrough Tour
  const scenicTour = {
    active: false,
    shotIdx: 0,
    shotTimer: 0,
    shots: [
      { title: 'CẦU DÂY VĂNG ĐỎ & ĐẢO HẢI ĐĂNG', camA: [-142, 24, 232], camB: [-232, 22, 228], look: [-192, 12, 200], dur: 4.2 },
      { title: 'CAO TỐC TRÊN CAO 4 LÀN & CỔNG BIỂN BÁO (12.5M)', camA: [35, 22, 248], camB: [135, 21, 246], look: [95, 14, 232], dur: 4.2 },
      { title: 'BẾN DU THUYỀN DEL PERRO & SIÊU DU THUYỀN 62M M/Y GALAXY', camA: [-242, 16, 78], camB: [-278, 15, 142], look: [-295, 5, 115], dur: 4.4 },
      { title: 'ĐÀI THIÊN VĂN GALILEO & ĐÈO ĐỒI VINEWOOD (28M)', camA: [92, 39, -214], camB: [34, 41, -218], look: [58, 33, -248], dur: 4.4 },
      { title: 'NGÂN HÀNG TRUNG ƯƠNG PACIFIC STANDARD', camA: [128, 12, -106], camB: [118, 9, -144], look: [105, 8, -135], dur: 3.8 },
    ],
  };

  function startScenicTour() {
    scenicTour.active = true;
    scenicTour.shotIdx = 0;
    scenicTour.shotTimer = 0;
    activeCtx?.ui?.showNotification?.(
      `🎥 Đang trình chiếu Toàn Cảnh Hạ Tầng: ${scenicTour.shots[0].title} (Nhấn [Esc / Space] để thoát)`,
      4.2
    );
    return true;
  }

  function stopScenicTour() {
    if (!scenicTour.active) return false;
    scenicTour.active = false;
    const cam = activeCtx?.engine?.camera;
    if (cam) {
      cam.fov = 62;
      cam.updateProjectionMatrix();
    }
    return true;
  }

  // Grand Infrastructure Checkpoint Time-Trial ("Đảo Hải Đăng -> Cầu Đỏ -> Cao Tốc 12.5m -> Đài Thiên Văn 28m")
  const infraTrial = {
    active: false,
    cpIndex: 0,
    timeLeft: 115.0,
    elapsed: 0,
    ringGroup: null,
    checkpoints: [
      { x: -238.0, y: 4.2, z: 200.0, label: 'Chân Cầu Dây Văng Đỏ' },
      { x: -158.0, y: 6.4, z: 200.0, label: 'Nhịp Chính Cầu Đỏ Vượt Biển' },
      { x: -102.0, y: 1.5, z: 214.8, label: 'Đường Dẫn Lên Cao Tốc Nam' },
      { x: -18.0, y: 12.6, z: 232.0, label: 'Cao Tốc Trên Cao Phía Nam (12.5m)' },
      { x: 145.0, y: 12.6, z: 232.0, label: 'Cổng Thu Phí Cao Tốc Nam' },
      { x: 253.0, y: 12.6, z: 120.0, label: 'Cao Tốc Ven Biển Phía Đông' },
      { x: 200.0, y: 12.6, z: -95.0, label: 'Cầu Vượt Tầng 2 Vạn Bảo Đổ Phường' },
      { x: 132.0, y: 1.2, z: -214.5, label: 'Đường Dẫn Xuống Đại Lộ Côn Lôn Tiên Sơn' },
      { x: 76.0, y: 9.4, z: -215.5, label: 'Đèo Ngoằn Ngoèo Đồi Côn Lôn Tiên Sơn' },
      { x: 58.0, y: 28.1, z: -236.5, label: 'ĐÍCH: Quảng Trường Đài Thiên Văn (28m)!' },
    ],
  };

  function ensureTrialCheckpointMesh() {
    if (infraTrial.ringGroup) return infraTrial.ringGroup;
    const scene = activeCtx?.engine?.scene;
    if (!scene) return null;

    const grp = new THREE.Group();
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(4.2, 0.24, 10, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    torus.position.y = 3.2;
    const baseDisc = new THREE.Mesh(
      new THREE.RingGeometry(3.2, 4.2, 28),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
    );
    baseDisc.rotation.x = -Math.PI * 0.5;
    baseDisc.position.y = 0.08;
    grp.add(torus, baseDisc);
    grp.visible = false;
    scene.add(grp);
    infraTrial.ringGroup = grp;
    return grp;
  }

  function startInfraTimeTrial() {
    const p = activeCtx?.player;
    if (!p) return false;
    if (insideBankState) exitBank();

    ensureTrialCheckpointMesh();
    infraTrial.active = true;
    infraTrial.cpIndex = 0;
    infraTrial.timeLeft = 118.0;
    infraTrial.elapsed = 0;

    // Place player in a tuned sports car on Lighthouse Island facing East toward the Red Bridge if not already nearby in a car!
    let car = p.inCar && typeof p.inCar === 'object' ? p.inCar : null;
    if (!car || car.isHeli) {
      if (car && typeof activeCtx?.vehicles?.exitVehicle === 'function') {
        activeCtx.vehicles.exitVehicle();
      }
      if (typeof activeCtx?.vehicles?.spawnVehicle === 'function') {
        car = activeCtx.vehicles.spawnVehicle('obey9f', -266.0, ISLAND_DECK_Y + 0.06, 200.0, Math.PI * 0.5, {
          color: 0x38bdf8,
        });
        if (car && typeof activeCtx.vehicles.enterVehicle === 'function') {
          activeCtx.vehicles.enterVehicle(car);
        }
      }
    } else if (Math.hypot(car.x - (-266.0), car.z - 200.0) > 45) {
      car.x = -266.0;
      car.y = ISLAND_DECK_Y + 0.06;
      car.z = 200.0;
      car.vx = 0;
      car.vz = 0;
      car.yaw = Math.PI * 0.5;
      if (car.mesh) {
        car.mesh.position.set(car.x, car.y, car.z);
        car.mesh.rotation.y = car.yaw;
      }
    }

    syncTrialCheckpointVisual();
    sfx.playStuntLaunch(26, false);
    activeCtx?.ui?.showBanner?.(
      'THỬ THÁCH TỐC ĐỘ HẠ TẦNG',
      'Đảo Hải Đăng → Cầu Đỏ → Cao Tốc 12.5m → Đài Thiên Văn 28m (118s • +$15,000)',
      'passed'
    );
    return true;
  }

  function syncTrialCheckpointVisual() {
    const cp = infraTrial.checkpoints[infraTrial.cpIndex];
    if (!cp || !infraTrial.ringGroup) return;
    infraTrial.ringGroup.visible = true;
    infraTrial.ringGroup.position.set(cp.x, cp.y, cp.z);
    setInfraGPSWaypoint(cp.x, cp.z, `Trạm ${infraTrial.cpIndex + 1}/${infraTrial.checkpoints.length}: ${cp.label}`);
  }

  function updateInfraTimeTrial(dt, rawDt) {
    if (!infraTrial.active) return;

    infraTrial.elapsed += dt;
    infraTrial.timeLeft -= rawDt;

    if (infraTrial.ringGroup) {
      infraTrial.ringGroup.children[0].rotation.y += rawDt * 2.2;
    }

    if (infraTrial.timeLeft <= 0) {
      infraTrial.active = false;
      if (infraTrial.ringGroup) infraTrial.ringGroup.visible = false;
      sfx.playStuntLanding(false, false);
      activeCtx?.ui?.showBanner?.('HẾT GIỜ THỬ THÁCH!', 'Hãy thử lại từ Menu Hạ Tầng [V] hoặc [J]', 'failed');
      return;
    }

    const p = activeCtx?.player;
    const cp = infraTrial.checkpoints[infraTrial.cpIndex];
    if (!p || !cp) return;

    const dXZ = Math.hypot((p.x || 0) - cp.x, (p.z || 0) - cp.z);
    const dY = Math.abs((p.y || 0) - cp.y);
    if (dXZ <= 8.8 && dY <= 5.5) {
      infraTrial.cpIndex++;
      if (infraTrial.cpIndex >= infraTrial.checkpoints.length) {
        infraTrial.active = false;
        if (infraTrial.ringGroup) infraTrial.ringGroup.visible = false;
        const finishSec = infraTrial.elapsed.toFixed(1);
        syncPlayerCashSafe(15000);
        sfx.playStuntLanding(true, true);
        activeCtx?.ui?.showBanner?.(
          'VÔ ĐỊCH ĐẠI LỘ & ĐÈO VINEWOOD!',
          `Thời gian: ${finishSec}s • Thưởng nóng +$15,000!`,
          'passed'
        );
      } else {
        sfx.playVaultRatchetTick(true);
        syncTrialCheckpointVisual();
        activeCtx?.ui?.showNotification?.(
          `✅ Trạm ${infraTrial.cpIndex}/${infraTrial.checkpoints.length} • Còn ${Math.ceil(infraTrial.timeLeft)}s!`,
          2.2
        );
      }
    }
  }

  // Hook into `ctx.engine.updateCamera` so Tu Tiên Cinematic Stunt Camera, Observatory Telescope & Scenic Tour
  // frame the 3D scene cleanly right before rendering!
  function ensureEngineCameraHooked() {
    if (cameraHooked || !activeCtx?.engine || typeof activeCtx.engine.updateCamera !== 'function') {
      return;
    }
    cameraHooked = true;
    const origUpdateCamera = activeCtx.engine.updateCamera.bind(activeCtx.engine);

    activeCtx.engine.updateCamera = function wrappedUpdateCamera(rawDt = 0.016, overrideCtx) {
      const safeRawDt = clamp(Number(rawDt) || 0.016, 0.0005, 0.1);

      // Mode 0: 5-Shot Scenic Infrastructure Postcard Tour!
      if (scenicTour.active && activeCtx?.engine?.camera) {
        const cam = activeCtx.engine.camera;
        const k = activeCtx?.input?.keys || {};
        if (k.Escape || k.Space) {
          stopScenicTour();
          return origUpdateCamera(rawDt, overrideCtx);
        }
        const shot = scenicTour.shots[scenicTour.shotIdx];
        if (!shot) {
          stopScenicTour();
          return origUpdateCamera(rawDt, overrideCtx);
        }
        scenicTour.shotTimer += safeRawDt;
        const u = clamp(scenicTour.shotTimer / shot.dur, 0, 1);
        const sU = smoothstep(0, 1, u);
        cam.position.set(
          lerp(shot.camA[0], shot.camB[0], sU),
          lerp(shot.camA[1], shot.camB[1], sU),
          lerp(shot.camA[2], shot.camB[2], sU)
        );
        cam.lookAt(shot.look[0], shot.look[1], shot.look[2]);
        if (Math.abs(cam.fov - 56) > 0.1) {
          cam.fov = 56;
          cam.updateProjectionMatrix();
        }
        if (scenicTour.shotTimer >= shot.dur) {
          scenicTour.shotTimer = 0;
          scenicTour.shotIdx++;
          if (scenicTour.shotIdx >= scenicTour.shots.length) {
            stopScenicTour();
          } else {
            activeCtx?.ui?.showNotification?.(
              `🎥 Kỳ quan ${scenicTour.shotIdx + 1}/${scenicTour.shots.length}: ${scenicTour.shots[scenicTour.shotIdx].title}`,
              3.8
            );
          }
        }
        return;
      }

      // Mode 1: Côn Lôn Tiên Sơn Galileo Observatory Panoramic Optical Telescope!
      if (telescopeState.active && activeCtx?.engine?.camera) {
        const cam = activeCtx.engine.camera;
        const inp = activeCtx?.input || {};
        const k = inp.keys || {};

        if (k.Escape || inp.interactJustPressed) {
          toggleObservatoryTelescope(false);
          return origUpdateCamera(rawDt, overrideCtx);
        }

        const dx = Number(inp.camDeltaX) || 0;
        const dy = Number(inp.camDeltaY) || 0;
        if ('camDeltaX' in inp) inp.camDeltaX = 0;
        if ('camDeltaY' in inp) inp.camDeltaY = 0;

        const sens = (Math.abs(dx) >= 0.45 || Math.abs(dy) >= 0.45) ? 0.0016 : 0.65;
        telescopeState.yaw = wrapAngle(telescopeState.yaw - dx * sens / Math.max(1, telescopeState.zoom * 0.35));
        telescopeState.pitch = clamp(telescopeState.pitch - dy * sens / Math.max(1, telescopeState.zoom * 0.35), -0.68, 0.48);

        if (k.KeyA || k.ArrowLeft) telescopeState.yaw = wrapAngle(telescopeState.yaw + 0.75 * safeRawDt);
        if (k.KeyD || k.ArrowRight) telescopeState.yaw = wrapAngle(telescopeState.yaw - 0.75 * safeRawDt);
        if (k.KeyW || k.ArrowUp) telescopeState.zoom = clamp(telescopeState.zoom + 3.8 * safeRawDt, 1.8, 12.0);
        if (k.KeyS || k.ArrowDown) telescopeState.zoom = clamp(telescopeState.zoom - 3.8 * safeRawDt, 1.8, 12.0);

        const fwdX = -Math.sin(telescopeState.yaw) * Math.cos(telescopeState.pitch);
        const fwdY = Math.sin(telescopeState.pitch);
        const fwdZ = Math.cos(telescopeState.yaw) * Math.cos(telescopeState.pitch); // South (+Z) at yaw = 0!

        cam.position.set(telescopeState.anchorX, telescopeState.anchorY, telescopeState.anchorZ);
        cam.lookAt(
          telescopeState.anchorX + fwdX * 100,
          telescopeState.anchorY + fwdY * 100,
          telescopeState.anchorZ + fwdZ * 100
        );
        const targetFov = clamp(62 / telescopeState.zoom, 5.2, 36);
        cam.fov = damp(cam.fov, targetFov, 12, safeRawDt);
        cam.updateProjectionMatrix();

        // Update Live Optical Rangefinder & Landmark Recon Overlay
        const infoEl = telescopeState.hudEl?.querySelector('#gta-scope-info');
        if (infoEl) {
          let bestLandmark = null;
          let bestDot = 0.965;
          let bestDist = 0;
          for (let i = 0; i < OBSERVATORY_RECON_LANDMARKS.length; i++) {
            const lm = OBSERVATORY_RECON_LANDMARKS[i];
            const vx = lm.x - telescopeState.anchorX;
            const vy = lm.y - telescopeState.anchorY;
            const vz = lm.z - telescopeState.anchorZ;
            const d = Math.hypot(vx, vy, vz) || 1;
            const dot = (vx * fwdX + vy * fwdY + vz * fwdZ) / d;
            if (dot > bestDot) {
              bestDot = dot;
              bestLandmark = lm;
              bestDist = d;
            }
          }
          const compassDeg = Math.round(((180 - (telescopeState.yaw * 180) / Math.PI) % 360 + 360) % 360);
          infoEl.innerHTML = bestLandmark
            ? `<div style="font-size:14px;font-weight:800;color:#fde047;">🔭 ĐANG NGẮM: ${bestLandmark.name} (${Math.round(bestDist)}m)</div>
               <div style="font-size:12px;color:#bae6fd;">Độ phóng đại: <b>${telescopeState.zoom.toFixed(1)}x</b> • Hướng: ${compassDeg}° • [W/S] Thu phóng • [F/Esc] Rời kính</div>`
            : `<div style="font-size:13px;font-weight:700;color:#7dd3fc;">🔭 KÍNH VIỄN VỌNG ĐÀI THIÊN VĂN VINEWOOD (ĐỘ CAO 28M)</div>
               <div style="font-size:12px;color:#cbd5e1;">Độ phóng đại: <b>${telescopeState.zoom.toFixed(1)}x</b> • Hướng: ${compassDeg}° • Rê chuột ngắm toàn cảnh Thành phố & Biển • [F/Esc] Thoát</div>`;
        }
        return;
      }

      // Run standard Tu Tiên/V camera first so internal smooth states stay warm
      origUpdateCamera(rawDt, overrideCtx);

      // Mode 2: Tu Tiên Dramatic Low-Angle Side-Tracking Cinematic Stunt Camera!
      if (!cinematicStuntCam.active || !activeCtx?.engine?.camera) return;

      const cam = activeCtx.engine.camera;
      const car = cinematicStuntCam.car;
      if (!car || car.destroyed) {
        cinematicStuntCam.active = false;
        return;
      }

      const isStillAirborne = airborneVehicles.has(car);
      if (!isStillAirborne) {
        cinematicStuntCam.lingerTimer -= safeRawDt;
        if (cinematicStuntCam.lingerTimer <= 0) {
          cinematicStuntCam.active = false;
          return;
        }
      }

      const vx = car.vx || 0;
      const vz = car.vz || 0;
      const vLen = Math.hypot(vx, vz);
      const dirX = vLen > 1.0 ? vx / vLen : Math.sin(car.yaw || 0);
      const dirZ = vLen > 1.0 ? vz / vLen : Math.cos(car.yaw || 0);
      const rightX = -dirZ * cinematicStuntCam.sideSign;
      const rightZ = dirX * cinematicStuntCam.sideSign;

      // Dramatic low-angle side-tracking position framing both the soaring supercar and the city/ocean below!
      const desiredX = car.x + rightX * 9.2 - dirX * 3.4;
      const desiredZ = car.z + rightZ * 9.2 - dirZ * 3.4;
      const camGroundY = activeCtx?.world?.getGroundHeight
        ? activeCtx.world.getGroundHeight(desiredX, desiredZ, car.y)
        : 0.22;
      const desiredY = Math.max(camGroundY + 1.18, car.y - 1.35);

      const blendWeight = isStillAirborne
        ? 1.0
        : smoothstep(0.0, 0.42, cinematicStuntCam.lingerTimer);

      cinematicStuntCam.camX = damp(cinematicStuntCam.camX, desiredX, 6.8, safeRawDt);
      cinematicStuntCam.camY = damp(cinematicStuntCam.camY, desiredY, 6.8, safeRawDt);
      cinematicStuntCam.camZ = damp(cinematicStuntCam.camZ, desiredZ, 6.8, safeRawDt);

      cinematicStuntCam.lookX = damp(cinematicStuntCam.lookX, car.x + dirX * 1.4, 14.0, safeRawDt);
      cinematicStuntCam.lookY = damp(cinematicStuntCam.lookY, car.y + 0.55, 14.0, safeRawDt);
      cinematicStuntCam.lookZ = damp(cinematicStuntCam.lookZ, car.z + dirZ * 1.4, 14.0, safeRawDt);

      cam.position.set(
        lerp(cam.position.x, cinematicStuntCam.camX, blendWeight),
        lerp(cam.position.y, cinematicStuntCam.camY, blendWeight),
        lerp(cam.position.z, cinematicStuntCam.camZ, blendWeight)
      );
      cam.lookAt(
        cinematicStuntCam.lookX,
        cinematicStuntCam.lookY,
        cinematicStuntCam.lookZ
      );
      // Subtle heroic Dutch angle roll during slow-motion apex!
      cam.rotation.z += 0.048 * cinematicStuntCam.sideSign * blendWeight;
      const targetStuntFov = lerp(cam.fov, 54, blendWeight);
      if (Math.abs(cam.fov - targetStuntFov) > 0.05) {
        cam.fov = targetStuntFov;
        cam.updateProjectionMatrix();
      }
    };
  }

  // ==========================================================================
  // 12. Bank Interior Living Staff/Guards, Ambient Chopper & Per-Frame Update
  // ==========================================================================

  let spawnedIslandHeli = false;
  let spawnedBankStaff = false;
  let infraElapsed = 0;
  let jacuzziHealTick = 0;
  let foghornTimer = 22.0;
  const bankStaffActors = [];

  function summonHelipadChopper(padX = -275.0, padY = ISLAND_DECK_Y + 0.08, padZ = 185.0, yaw = Math.PI * 0.5) {
    if (!activeCtx?.vehicles || typeof activeCtx.vehicles.spawnVehicle !== 'function') {
      return null;
    }
    const existing = (activeCtx.vehicles.list || []).find(
      (v) => v && v.isHeli && !v.destroyed && Math.hypot((v.x || 0) - padX, (v.z || 0) - padZ) < 10.5
    );
    if (existing) return existing;
    return activeCtx.vehicles.spawnVehicle('heli', padX, padY, padZ, yaw, {
      isParked: true,
      color: 0xd92626,
    });
  }

  function ensureIslandHelipadChopper() {
    if (spawnedIslandHeli || !activeCtx?.vehicles || typeof activeCtx.vehicles.spawnVehicle !== 'function') {
      return;
    }
    spawnedIslandHeli = true;
    summonHelipadChopper(-275.0, ISLAND_DECK_Y + 0.08, 185.0, Math.PI * 0.5);
  }

  // Populate Linh Thạch Bảo Khố Interior (2100, 0, 2100) with Tellers, Patrolling Security Guards & Patrons!
  // Attached directly inside `bankInteriorGroup` -> 0 draw calls / 0 CPU cost whenever player is outdoors!
  function ensureBankInteriorStaff() {
    if (spawnedBankStaff) return;
    const chars = activeCtx?.characters;
    if (!chars) return;
    const createRigFn =
      chars.createCharacterRig ||
      chars.buildHumanoidRig ||
      chars.createHumanoidRig ||
      chars.createNPCRig ||
      null;
    if (typeof createRigFn !== 'function') return;

    spawnedBankStaff = true;

    const specs = [
      // 4 Bank Tellers behind bulletproof glass cages (West & East wings)
      { role: 'teller', preset: 'female_urban', x: 2087.2, y: 0.18, z: 2098.1, yaw: 0 },
      { role: 'teller', preset: 'business_suit', x: 2091.9, y: 0.18, z: 2098.1, yaw: 0 },
      { role: 'teller', preset: 'female_urban', x: 2108.1, y: 0.18, z: 2098.1, yaw: 0 },
      { role: 'teller', preset: 'business_suit', x: 2112.8, y: 0.18, z: 2098.1, yaw: 0 },
      // 2 Uniformed Linh Thạch Bảo Khố Vault & Lobby Security Guards (patrolling!)
      {
        role: 'guard',
        preset: 'cop',
        x: 2096.2,
        y: 0.02,
        z: 2101.8,
        yaw: 0,
        patrolA: [2094.0, 2101.8],
        patrolB: [2094.0, 2109.2],
      },
      {
        role: 'guard',
        preset: 'cop',
        x: 2103.8,
        y: 0.02,
        z: 2108.8,
        yaw: Math.PI,
        patrolA: [2106.0, 2109.2],
        patrolB: [2106.0, 2101.8],
      },
      // 2 Banking Hall VIP Clients at Writing Islands / Queue
      { role: 'patron', preset: 'business_suit', x: 2092.0, y: 0.02, z: 2105.5, yaw: 0 },
      { role: 'patron', preset: 'casual_citizen', x: 2100.0, y: 0.02, z: 2103.6, yaw: Math.PI },
    ];

    for (let i = 0; i < specs.length; i++) {
      const sp = specs[i];
      let rig = null;
      try {
        rig = createRigFn(sp.preset);
      } catch (_) {
        rig = null;
      }
      if (!rig) continue;

      const rootObj = rig.root || rig;
      if (!rootObj || !rootObj.isObject3D) continue;
      rootObj.position.set(sp.x, sp.y, sp.z);
      rootObj.rotation.set(0, sp.yaw, 0);

      if (sp.role === 'guard' && typeof chars.equipWeapon === 'function') {
        try {
          chars.equipWeapon(rig, 'pistol');
        } catch (_) {}
      }

      bankInteriorGroup.add(rootObj);
      bankStaffActors.push({
        ...sp,
        rig,
        mesh: rootObj,
        patrolDir: 1,
        patrolT: i % 2 === 0 ? 0.15 : 0.75,
        alerted: false,
        shotCooldown: 1.2,
      });
    }
  }

  function updateBankInteriorStaff(dt) {
    if (!insideBankState) return;
    ensureBankInteriorStaff();
    if (bankStaffActors.length === 0) return;

    // Yield cleanly if Grand Heist #4 in `ctx.heists` is running its own Bank Guard combat encounter!
    const heistFourActive = Boolean(
      activeCtx?.heists?.activeActivity &&
      (activeCtx.heists.activeActivity.id === 4 || String(activeCtx.heists.activeActivity.type || '').includes('bank'))
    );
    for (let i = 0; i < bankStaffActors.length; i++) {
      bankStaffActors[i].mesh.visible = !heistFourActive;
    }
    if (heistFourActive) return;

    const p = activeCtx?.player;
    const playerArmedFiring = Boolean(
      p &&
      (activeCtx?.input?.fire || p._recentFireTimer > 0 || vaultOpenTarget || (activeCtx?.gameplay?.wanted?.stars || 0) >= 2)
    );

    for (let i = 0; i < bankStaffActors.length; i++) {
      const act = bankStaffActors[i];
      if (playerArmedFiring) act.alerted = true;

      let anim = 'idle';

      if (act.role === 'guard') {
        if (act.alerted && p) {
          const dx = p.x - act.x;
          const dz = p.z - act.z;
          act.yaw = dampAngle(act.yaw, Math.atan2(dx, dz), 9.0, dt);
          anim = 'aim_1h';
          act.shotCooldown -= dt;
          if (act.shotCooldown <= 0 && Math.hypot(dx, dz) < 24 && !p.isDead) {
            act.shotCooldown = 1.35;
            sfx.playVaultRatchetTick(false);
            if (typeof p.hp === 'number' && (p.rollInvulnTimer || 0) <= 0) {
              if ((p.armor || 0) > 0) p.armor = Math.max(0, p.armor - 5);
              else p.hp = Math.max(0, p.hp - 5);
              activeCtx?.engine?.triggerDamageFlash?.(0.35);
            }
          }
        } else if (act.patrolA && act.patrolB) {
          act.patrolT += act.patrolDir * 0.14 * dt;
          if (act.patrolT >= 1.0) {
            act.patrolT = 1.0;
            act.patrolDir = -1;
          } else if (act.patrolT <= 0.0) {
            act.patrolT = 0.0;
            act.patrolDir = 1;
          }
          const nx = lerp(act.patrolA[0], act.patrolB[0], act.patrolT);
          const nz = lerp(act.patrolA[1], act.patrolB[1], act.patrolT);
          const moveYaw = Math.atan2(nx - act.x, nz - act.z);
          if (Math.hypot(nx - act.x, nz - act.z) > 0.0002) {
            act.yaw = dampAngle(act.yaw, moveYaw, 8.0, dt);
          }
          act.x = nx;
          act.z = nz;
          anim = 'walk';
        }
      } else if (act.alerted) {
        anim = 'flee';
      }

      act.mesh.position.set(act.x, act.y, act.z);
      act.mesh.rotation.y = act.yaw;
      activeCtx?.characters?.animateHumanoid?.(act.rig, anim, dt);
    }
  }

  function getInteractiveStationNear(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;

    // Exterior Linh Thạch Bảo Khố Entry Corona (111, 0.22, -120)
    if (!insideBankState && Math.hypot(x - BANK_EXT_POS.x, z - BANK_EXT_POS.z) <= 3.8) {
      return {
        type: 'bank_enter',
        id: 'pacific_standard_enter',
        label: 'Vào Ngân Hàng Trung Ương Linh Thạch Bảo Khố',
      };
    }

    // Inside Linh Thạch Bảo Khố (2100, 0, 2100)
    if (insideBankState || (x >= 2075 && x <= 2125 && z >= 2080 && z <= 2120)) {
      if (Math.hypot(x - 2100.0, z - 2113.5) <= 3.2) {
        return {
          type: 'bank_exit',
          id: 'pacific_standard_exit',
          label: 'Rời Ngân Hàng ra Đại Lộ',
        };
      }
      if (!vaultOpenTarget && Math.hypot(x - 2100.8, z - 2092.8) <= 3.2) {
        return {
          type: 'bank_vault_panel',
          id: 'pacific_standard_vault_lock',
          label: 'Mở Khóa Cửa Hầm Vàng Cỡ Lớn',
        };
      }
      if (vaultOpenTarget && vaultAnimProgress >= 0.55 && z <= 2091.6) {
        return {
          type: 'bank_vault_loot',
          id: 'pacific_standard_loot',
          label: 'Thu Giữ Vàng Thỏi 24K & Tiền Mặt',
        };
      }
    }

    // Côn Lôn Tiên Sơn Observatory Panoramic Viewing Binoculars (y = 28.0m, Z ~ -230.8)
    if (Math.abs(z - (-230.8)) <= 2.4 && x >= 31.0 && x <= 76.5 && (activeCtx?.player?.y ?? 0) >= 26.0) {
      for (const bx of [33.5, 52.0, 58.0, 66.0, 74.0]) {
        if (Math.abs(x - bx) <= 1.85) {
          return {
            type: 'observatory_telescope',
            id: `telescope_${bx}`,
            x: bx,
            z: -230.8,
            label: 'Ngắm Toàn Cảnh Thành Phố qua Kính Viễn Vọng (28m)',
          };
        }
      }
    }

    // VIP Helipad Shuttle Pads (Lighthouse Island Helipad & Linh Chu Thượng Cổ Bow Helipad)
    if (Math.hypot(x - (-275.0), z - 185.0) <= 6.5 || Math.hypot(x - (-295.0), z - 94.2) <= 4.5) {
      return {
        type: 'vip_helipad_shuttle',
        id: 'vip_helipad_shuttle',
        label: 'Mở Điều Vận Trực Thăng VIP & Đua Tính Giờ Hạ Tầng',
      };
    }

    return null;
  }

  // Analytical Pacific Ocean multi-band swell height & slope evaluator (matches world.js GLSL ocean shader!)
  function evalPacificWaveState(x, z, t) {
    const w1 = Math.sin(x * 0.085 + t * 1.45) * 0.26;
    const w2 = Math.cos(z * 0.072 - t * 1.18) * 0.21;
    const w3 = Math.sin((x * 0.052 + z * 0.048) + t * 0.92) * 0.16;
    const y = -0.34 + w1 + w2 + w3;
    const dwdx =
      Math.cos(x * 0.085 + t * 1.45) * 0.085 * 0.26 +
      Math.cos((x * 0.052 + z * 0.048) + t * 0.92) * 0.052 * 0.16;
    const dwdz =
      -Math.sin(z * 0.072 - t * 1.18) * 0.072 * 0.21 +
      Math.cos((x * 0.052 + z * 0.048) + t * 0.92) * 0.048 * 0.16;
    return { y, dwdx, dwdz };
  }

  // Step all 8 Offshore Regatta Racing Sailboats along elliptical courses with real wave heave, pitch & windward heel!
  function updatePacificRegattaFleet(dt) {
    if (!regattaSailboatInst || regattaFleet.length === 0 || insideBankState) return;
    for (let i = 0; i < regattaFleet.length; i++) {
      const boat = regattaFleet[i];
      boat.phase = (boat.phase + dt * boat.omega * boat.dir) % (Math.PI * 2);
      const cosP = Math.cos(boat.phase);
      const sinP = Math.sin(boat.phase);
      const bx = boat.cx + cosP * boat.rx;
      const bz = boat.cz + sinP * boat.rz;

      // Tangent velocity vector along elliptical regatta course (-Z is bow in sailboat local space!)
      const vx = -sinP * boat.rx * boat.dir;
      const vz = cosP * boat.rz * boat.dir;
      const yaw = Math.atan2(-vx, -vz);

      const wave = evalPacificWaveState(bx, bz, infraElapsed);
      const fwdX = -Math.sin(yaw);
      const fwdZ = -Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);

      // Wave pitch along hull keel + realistic 15-degree windward sailing heel when beam-reaching the Pacific breeze!
      const wavePitch = clamp((wave.dwdx * fwdX + wave.dwdz * fwdZ) * 1.85, -0.18, 0.18);
      const windHeel = fwdZ * 0.25 + (wave.dwdx * rightX + wave.dwdz * rightZ) * 1.35;
      boat.x = bx;
      boat.y = wave.y;
      boat.z = bz;
      boat.yaw = yaw;
      boat.pitch = lerp(boat.pitch || 0, wavePitch, clamp(dt * 4.5, 0, 1));
      boat.heel = lerp(boat.heel || 0, clamp(windHeel, -0.30, 0.30), clamp(dt * 3.8, 0, 1));

      regattaSailboatInst.setMatrixAt(
        i,
        makeMat4(bx, wave.y, bz, boat.pitch, yaw, boat.heel, 1, 1, 1)
      );
    }
    regattaSailboatInst.instanceMatrix.needsUpdate = true;
  }

  function init(ctxArg) {
    if (ctxArg && typeof ctxArg === 'object') {
      activeCtx = ctxArg;
    }
    if (initialized) {
      if (activeCtx?.world && !worldChained) chainIntoWorld(activeCtx.world);
      ensureVehiclePhysicsHooked();
      ensureEngineCameraHooked();
      return api;
    }

    const scene = activeCtx?.engine?.scene || activeCtx?.scene || null;
    if (!scene && !activeCtx?.world) {
      return api;
    }

    initialized = true;
    buildAllWorldInfraGeometry(scene);

    if (activeCtx?.world) {
      chainIntoWorld(activeCtx.world);
    }
    ensureVehiclePhysicsHooked();
    ensureEngineCameraHooked();
    ensureIslandHelipadChopper();
    initExpressFreewayConvoy();

    if (activeCtx) {
      activeCtx.worldInfra = api;
    }
    return api;
  }

  function update(dtArg = 0.016, secondArg, thirdArg) {
    if (secondArg && typeof secondArg === 'object') activeCtx = secondArg;
    else if (thirdArg && typeof thirdArg === 'object') activeCtx = thirdArg;

    if (!initialized && (activeCtx?.engine?.scene || activeCtx?.world)) {
      init(activeCtx);
    }
    if (activeCtx?.world && !worldChained) {
      chainIntoWorld(activeCtx.world);
    }
    ensureVehiclePhysicsHooked();
    ensureEngineCameraHooked();
    ensureIslandHelipadChopper();

    const safeDt = clamp(Number(dtArg) || 0.016, 0.0005, 0.1);
    const rawDt = clamp(
      typeof secondArg === 'number' && Number.isFinite(secondArg)
        ? secondArg
        : Number(activeCtx?.rawDt) || safeDt,
      0.0005,
      0.1
    );

    infraElapsed += safeDt;
    if (bankDoorCooldown > 0) bankDoorCooldown = Math.max(0, bankDoorCooldown - rawDt);
    if (laserAlarmCooldown > 0) laserAlarmCooldown = Math.max(0, laserAlarmCooldown - rawDt);
    if (speedTrapState.cooldown > 0) speedTrapState.cooldown = Math.max(0, speedTrapState.cooldown - rawDt);

    // Step Express Freeway Convoy + Armored Bank Cash Van, Regatta Sailboats, Bank Staff & Time-Trial!
    if (!activeCtx?.paused && activeCtx?.started !== false) {
      updateExpressFreewayConvoy(safeDt);
      updatePacificRegattaFleet(safeDt);
      updateInfraTimeTrial(safeDt, rawDt);
      updateBankInteriorStaff(safeDt);
    }

    // Fade Speed-Trap White Camera Strobe Flash
    if (speedTrapState.flashAlpha > 0 && speedTrapState.flashEl) {
      speedTrapState.flashAlpha = Math.max(0, speedTrapState.flashAlpha - rawDt * 2.8);
      speedTrapState.flashEl.style.opacity = String(speedTrapState.flashAlpha.toFixed(3));
    }

    const p = activeCtx?.player;
    const inp = activeCtx?.input || {};
    const k = inp.keys || {};

    // Sync insideBankState if another module (e.g. Heist #4 in heists_activities.js!) teleported player into (2100, 2100)!
    if (p && Number.isFinite(p.x) && Number.isFinite(p.z)) {
      const physicallyInBank = p.x >= 2070 && p.x <= 2130 && p.z >= 2075 && p.z <= 2125;
      if (physicallyInBank !== insideBankState) {
        insideBankState = physicallyInBank;
        p.inBank = physicallyInBank;
        bankInteriorGroup.visible = physicallyInBank;
      }
    }

    // Auto-sync Vault Open if Heist #4 in `ctx.heists` reaches Vault Open phase!
    const heistAct = activeCtx?.heists?.activeActivity;
    if (
      !vaultOpenTarget &&
      heistAct &&
      (heistAct.vaultOpened || heistAct.vaultOpen || (heistAct.id === 4 && heistAct.phase >= 3))
    ) {
      openVault(false);
    }

    // 1) Rotate Twin Volumetric Lighthouse Searchlight Beams & Adjust Visibility by Time/Weather!
    if (lighthouseRotorGroup) {
      lighthouseRotorGroup.matrixAutoUpdate = true;
      lighthouseRotorGroup.rotation.y = (infraElapsed * 0.52) % (Math.PI * 2);
      const weather = activeCtx?.engine?.timeWeather || 'BRIGHT_DAY';
      const beamMesh = lighthouseRotorGroup.children[0];
      if (beamMesh && beamMesh.material) {
        beamMesh.material.opacity =
          weather === 'NEON_NIGHT' ? 0.34
          : weather === 'OVERCAST_RAIN' ? 0.24
          : weather === 'SUNSET_GOLD' ? 0.22
          : 0.08;
      }
    }

    // 2) Spin 62m Linh Chu Thượng Cổ Marine Radar Array & Pulse Bubbling Jacuzzi Hot-Tub Ripples!
    if (yachtRadarGroup) {
      yachtRadarGroup.matrixAutoUpdate = true;
      yachtRadarGroup.rotation.y = (infraElapsed * 2.4) % (Math.PI * 2);
    }
    if (yachtHotTubRipples) {
      yachtHotTubRipples.matrixAutoUpdate = true;
      const pulse = 0.86 + Math.sin(infraElapsed * 4.8) * 0.16;
      yachtHotTubRipples.scale.set(pulse, pulse, 1);
      yachtHotTubRipples.rotation.z = infraElapsed * 0.9;
    }

    // Ambient Harbor Foghorn when player is near Lighthouse Island or Linh Chu Thượng Cổ
    if (p && !insideBankState && (p.x < -215 && p.z > 85)) {
      foghornTimer -= rawDt;
      if (foghornTimer <= 0) {
        foghornTimer = 34.0;
        sfx.playHarborFoghorn();
      }
    }

    // 3) Linh Chu Thượng Cổ Upper-Deck Bubbling Jacuzzi HP & Special Regeneration!
    if (p && !p.inCar && Math.hypot(p.x - YACHT_CENTER_X, p.z - 123.5) <= 2.35 && Math.abs((p.y || 0) - 6.22) <= 1.2) {
      p.hp = Math.min(p.maxHp || 100, (p.hp || 100) + 14.0 * safeDt);
      if (typeof p.special === 'number') {
        p.special = Math.min(p.maxSpecial || 100, p.special + 12.0 * safeDt);
      }
      jacuzziHealTick -= rawDt;
      if (jacuzziHealTick <= 0) {
        jacuzziHealTick = 2.4;
        activeCtx?.characters?.spawnParticles?.(YACHT_CENTER_X, 7.15, 123.5, 'water', 5, 1.8);
        activeCtx?.ui?.showPrompt?.('♨ Đang thư giãn trong Bể Sục Jacuzzi Siêu Du Thuyền (+Hồi Máu & Kỹ Năng)', 1.2);
      }
    }

    // 4) Spin & Bob All 24 Stunt-Jump Floating Chevron Beacons + Bank Entry/Exit Coronas!
    if (stuntBeaconInst && !insideBankState) {
      for (let i = 0; i < stuntBeaconSeeds.length; i++) {
        const sb = stuntBeaconSeeds[i];
        const bobY = sb.y + Math.sin(infraElapsed * 3.2 + sb.phase) * 0.22;
        const m = makeMat4(sb.x, bobY, sb.z, 0, sb.yaw + infraElapsed * 2.1, 0, 1, 1.35, 1);
        stuntBeaconInst.setMatrixAt(i, m);
      }
      stuntBeaconInst.instanceMatrix.needsUpdate = true;
    }
    if (bankExteriorCoronaGroup) {
      bankExteriorCoronaGroup.matrixAutoUpdate = true;
      bankExteriorCoronaGroup.rotation.y = infraElapsed * 1.4;
    }
    if (bankExitCoronaGroup && insideBankState) {
      bankExitCoronaGroup.matrixAutoUpdate = true;
      bankExitCoronaGroup.rotation.y = -infraElapsed * 1.5;
    }

    // 5) Animate 8-Ton Circular Steel Bank Vault Door (3-Spoke Wheel -> 12 Bolts -> 108° Hydraulic Swing!)
    const targetProg = vaultOpenTarget ? 1.0 : 0.0;
    if (Math.abs(vaultAnimProgress - targetProg) > 0.0005) {
      const speed = vaultOpenTarget ? 0.42 : 0.65;
      vaultAnimProgress = vaultOpenTarget
        ? Math.min(1.0, vaultAnimProgress + rawDt * speed)
        : Math.max(0.0, vaultAnimProgress - rawDt * speed);

      // Phase 1 [0.00..0.30]: Spin 3-spoke brass wheel & counter-rotating 16:12 steel gears
      const wheelPhase = clamp(vaultAnimProgress / 0.30, 0, 1);
      if (vaultSpokeWheelGroup) {
        vaultSpokeWheelGroup.matrixAutoUpdate = true;
        vaultSpokeWheelGroup.rotation.z = wheelPhase * Math.PI * 4.0;
      }
      if (vaultGearA) { vaultGearA.matrixAutoUpdate = true; vaultGearA.rotation.z = wheelPhase * Math.PI * 3.0; }
      if (vaultGearB) { vaultGearB.matrixAutoUpdate = true; vaultGearB.rotation.z = -wheelPhase * Math.PI * 4.0; }

      // Phase 2 [0.28..0.52]: Retract all radial chrome locking bolts inward
      const boltPhase = smoothstep(0.28, 0.52, vaultAnimProgress);
      for (let bi = 0; bi < vaultBoltMeshes.length; bi++) {
        const bm = vaultBoltMeshes[bi];
        bm.mesh.matrixAutoUpdate = true;
        const curR = lerp(bm.extendedR, bm.retractedR, boltPhase);
        bm.mesh.position.x = bm.doorLocalX + Math.cos(bm.ang) * curR;
        bm.mesh.position.y = Math.sin(bm.ang) * curR;
      }

      // Phase 3 [0.48..1.00]: Swing 8-ton circular steel door smoothly open 108 degrees!
      const swingPhase = smootherstep(0.48, 1.0, vaultAnimProgress);
      if (vaultDoorPivot) {
        vaultDoorPivot.matrixAutoUpdate = true;
        vaultDoorPivot.rotation.y = -swingPhase * 1.88;
      }
    }

    // 6) Sweep Red Security Laser Beams & Check Player Laser Tripwire inside Bank Corridor!
    if (insideBankState && securityLaserGroup) {
      const showLasers = lasersActiveState && !vaultOpenTarget;
      securityLaserGroup.visible = showLasers;
      if (showLasers) {
        for (let i = 0; i < securityLaserBeams.length; i++) {
          const lb = securityLaserBeams[i];
          const curY = lb.baseY + Math.sin(infraElapsed * lb.speed + lb.phase) * lb.ampY;
          lb.mesh.position.y = curY;

          // Check if player touches an active red security laser without disarming!
          if (
            p &&
            laserAlarmCooldown <= 0 &&
            p.x >= 2097.1 &&
            p.x <= 2102.9 &&
            Math.abs(p.z - lb.z) < 0.36 &&
            curY >= (p.y || 0) + 0.15 &&
            curY <= (p.y || 0) + 1.72
          ) {
            laserAlarmCooldown = 5.5;
            sfx.playLaserAlarm();
            activeCtx?.engine?.triggerDamageFlash?.(0.45);
            activeCtx?.gameplay?.addCrimeHeat?.(38, 'bank_laser_trip');
            activeCtx?.ui?.showNotification?.(
              '🚨 CẢNH BÁO: Bạn đã chạm Tia Laser An Ninh Ngân Hàng! Cảnh sát Thiên Đình Chấp Pháp đang bao vây!',
              4.0
            );
          }
        }
      }
    }

    // 7) Update Interactive Free-Roam Vault Combination Dial Canvas if open (auto-close if ui_audio cleared activeModal)
    if (vaultDialState.open) {
      if (activeCtx && activeCtx.activeModal !== 'bank_vault') {
        closeVaultDialOverlay();
      } else {
        updateAndRenderVaultDial(rawDt);
      }
    }

    // 8) Toggle 12-Stunt-Jumps Challenge & GPS Map Modal via [J] key, or Heli-Shuttle via Esc!
    const keyJDown = Boolean(k.KeyJ || k.j);
    const keyJJust = keyJDown && !stuntUI.prevKeyJ;
    stuntUI.prevKeyJ = keyJDown;
    if (keyJJust && !activeCtx?.paused && activeCtx?.started !== false) {
      if (stuntUI.menuOpen) closeStuntDirectory();
      else if (!activeCtx?.activeModal) openStuntDirectory();
    }
    if (stuntUI.menuOpen && (k.Escape || (activeCtx && activeCtx.activeModal !== 'stunt_map'))) {
      closeStuntDirectory();
    }
    if (shuttleUI.open && (k.Escape || (activeCtx && activeCtx.activeModal !== 'heli_shuttle'))) {
      closeHeliShuttle();
    }

    // 9) Check Elevated Freeway Electronic Speed-Trap Radars (South X=86,Z=232 & East X=253,Z=40)!
    const pCar = p?.inCar && typeof p.inCar === 'object' ? p.inCar : null;
    if (pCar && !pCar.isHeli && speedTrapState.cooldown <= 0 && (pCar.y || 0) >= 10.5) {
      const spdMs = Math.hypot(pCar.vx || 0, pCar.vz || 0);
      if (spdMs >= 34.0) {
        const kmh = Math.round(spdMs * 3.6);
        if (Math.abs(pCar.x - 86.0) < 6.0 && Math.abs(pCar.z - 232.0) < 9.0) {
          triggerSpeedTrapFlash(kmh, 'Cổng Thu Phí ETC Nam');
        } else if (Math.abs(pCar.x - 253.0) < 9.0 && Math.abs(pCar.z - 40.0) < 6.0) {
          triggerSpeedTrapFlash(kmh, 'Cao Tốc Bờ Đông');
        }
      }
    }

    // 10) Contextual Prompts & [F] / [G] Interactions (Bank Enter/Exit, Vault Lock, Bullion Loot, Telescope, VIP Shuttle)
    const keyGDown = Boolean(k.KeyG || k.g);
    const rawGJust = keyGDown && !stuntUI.prevKeyG;
    stuntUI.prevKeyG = keyGDown;
    const keyGJust = Boolean(
      rawGJust ||
      inp.secondaryInteractJustPressed ||
      inp.interactGJustPressed ||
      inp.shopInteractJustPressed
    );
    const interactJust = Boolean(inp.interactJustPressed);

    if (p && !p.inCar && !activeCtx?.activeModal && !telescopeState.active && !scenicTour.active && !activeCtx?.paused) {
      const nearStation = getInteractiveStationNear(p.x, p.z);
      if (nearStation) {
        if (nearStation.type === 'bank_enter') {
          activeCtx?.ui?.showPrompt?.('Nhấn [F] để vào Ngân Hàng Trung Ương Linh Thạch Bảo Khố', 0.2);
          if (interactJust) enterBank();
        } else if (nearStation.type === 'bank_exit') {
          activeCtx?.ui?.showPrompt?.('Nhấn [F] để rời Ngân Hàng ra Đại Lộ Downtown', 0.2);
          if (interactJust) exitBank();
        } else if (nearStation.type === 'bank_vault_panel') {
          if (!activeCtx?.heists?.activeActivity) {
            activeCtx?.ui?.showPrompt?.('Nhấn [G] để bẻ khóa Cửa Hầm Vàng Thép 8 Tấn (Hoặc bắt đầu Phi Vụ Ngân Hàng)', 0.2);
            if (keyGJust) openVaultDialOverlay();
          }
        } else if (nearStation.type === 'bank_vault_loot') {
          const hasRemainingLoot =
            bankGoldCartGroups.some((c) => !c.looted) ||
            bankCashPalletGroups.some((c) => !c.looted);
          if (hasRemainingLoot) {
            activeCtx?.ui?.showPrompt?.('Nhấn [G] hoặc [F] để thu giữ Vàng Thỏi 24K & Kiện Tiền Mặt!', 0.2);
            if (keyGJust || interactJust) {
              lootNearestVaultStack(p.x, p.z);
            }
          }
        } else if (nearStation.type === 'observatory_telescope') {
          activeCtx?.ui?.showPrompt?.('Nhấn [G] để ngắm Toàn Cảnh Thành Phố qua Kính Viễn Vọng Đài Thiên Văn', 0.2);
          if (keyGJust) {
            toggleObservatoryTelescope(true, nearStation.x, nearStation.z);
          }
        } else if (nearStation.type === 'vip_helipad_shuttle') {
          activeCtx?.ui?.showPrompt?.('Nhấn [G] để mở Trực Thăng Đưa Đón VIP & Thử Thách Hạ Tầng', 0.2);
          if (keyGJust) {
            openHeliShuttle();
          }
        }
      }
    }
  }

  // ==========================================================================
  // 13. Public API Object attached at `ctx.worldInfra`
  // ==========================================================================

  const api = {
    init,
    update,
    updateWorldInfra: update,
    getExtraGroundHeight,

    // Expose BOTH `stuntJampsCompleted` (exact brief key) & `stuntJumpsCompleted`!
    get stuntJampsCompleted() {
      return completedStuntIds.size;
    },
    set stuntJampsCompleted(val) {
      if (typeof val === 'number' && val === 0) {
        completedStuntIds.clear();
        for (const sj of stuntJumps) sj.completed = false;
        refreshStuntBeaconColors();
      }
    },
    get stuntJumpsCompleted() {
      return completedStuntIds.size;
    },
    totalStuntJumps: stuntJumps.length,
    stuntJumps,
    completedStuntIds,
    openStuntDirectory,
    closeStuntDirectory,
    openStuntTracker: openStuntDirectory,
    setStuntGPS: setInfraGPSWaypoint,

    // Linh Thạch Bảo Khố & Circular Steel Vault Controls
    enterBank,
    exitBank,
    openVault,
    closeVault,
    setVaultOpen,
    openBankVault: openVault,
    closeBankVault: closeVault,
    unlockVault: openVault,
    setLasersActive,
    disableLasers: () => setLasersActive(false),
    resetVaultLoot,
    lootNearestVaultStack,
    openVaultDialOverlay,
    closeVaultDialOverlay,

    get inBank() {
      return insideBankState;
    },
    get isInsideBank() {
      return insideBankState;
    },
    get vaultOpen() {
      return vaultOpenTarget;
    },
    set vaultOpen(v) {
      setVaultOpen(Boolean(v));
    },
    get isVaultOpen() {
      return vaultOpenTarget;
    },
    set isVaultOpen(v) {
      setVaultOpen(Boolean(v));
    },
    get lasersActive() {
      return lasersActiveState;
    },
    set lasersActive(v) {
      setLasersActive(Boolean(v));
    },

    // VIP Shuttle, Scenic Tour, Time-Trial & Landmarks
    openHeliShuttle,
    closeHeliShuttle,
    summonHelipadChopper: ensureIslandHelipadChopper,
    startScenicTour,
    stopScenicTour,
    startInfraTimeTrial,
    toggleObservatoryTelescope,
    getInteractiveStationNear,
    closeModal: () => {
      closeStuntDirectory();
      closeHeliShuttle();
      closeVaultDialOverlay();
    },
    expressConvoy,
    regattaFleet,
    aabbs: infraAABBs,
    interiorAABBs: bankInteriorAABBs,
    goldCarts: bankGoldCartGroups,
    cashPallets: bankCashPalletGroups,
    bankExterior: { ...BANK_EXT_POS },
    bankInterior: {
      ...BANK_INT_ORIGIN,
      spawnX: 2100.0,
      spawnY: 0.05,
      spawnZ: 2111.5,
      exitX: 2100.0,
      exitY: 0.05,
      exitZ: 2113.5,
      vaultDoorX: 2100.0,
      vaultDoorY: 0.02,
      vaultDoorZ: 2091.8,
      vaultCenterX: 2100.0,
      vaultCenterZ: 2088.2,
    },
    root: infraRoot,
    bankInteriorGroup,
  };

  if (ctx && typeof ctx === 'object') {
    ctx.worldInfra = api;
    // Auto-initialize immediately if `ctx.world` and `ctx.engine.scene` are already present!
    if (ctx.world && ctx.engine?.scene) {
      init(ctx);
    }
  }

  return api;
}
