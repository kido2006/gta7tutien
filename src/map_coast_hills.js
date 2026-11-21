import * as THREE from 'three';

// ============================================================================
// GTA: Đại Lộ & Bờ Biển 3D — Phase 4 District Expansion
// PHÂN KHU 3: BỜ BIỂN TIỆN ÍCH, SKATEPARK & KÊNH ĐÀO VESPUCCI
// PHÂN KHU 4: ĐỒI VINEWOOD, HẦM CHUI XUYÊN NÚI & BIỆT THỰ CHÂN CẦU HỒ BƠI VÔ CỰC
// Exclusively owns: src/map_coast_hills.js -> export function createMapCoastHills(ctx)
// ============================================================================

const SIDEWALK_Y = 0.22;
const PIER_DECK_Y = 3.80;
const CANAL_WATER_Y = -0.15;
const CANAL_BED_Y = -1.55;
const CANAL_QUAY_Y = 0.62;
const TUNNEL_FLOOR_Y = 0.04;
const TUNNEL_CEIL_CLEAR_Y = 7.50;
const TUNNEL_VAULT_APEX_Y = 7.80;
const TUNNEL_X_MIN = 110.0;
const TUNNEL_X_MAX = 130.0;
const TUNNEL_Z_MIN = -375.0;
const TUNNEL_Z_MAX = -212.0;
const TOUGE_HALF_W = 6.0; // 12.0m 2-lane Mountain Touge Drift Road

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

function createRNG(seed = 20261134) {
  let s = seed >>> 0;
  return function rng() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
// Fast Zero-Dependency BufferGeometry Merger & Transform Helpers
// ============================================================================

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _eul = new THREE.Euler();
const _scl = new THREE.Vector3();

function makeMat4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _pos.set(x, y, z);
  _eul.set(rx, ry, rz, 'YXZ');
  _quat.setFromEuler(_eul);
  _scl.set(sx, sy, sz);
  const m = new THREE.Matrix4();
  m.compose(_pos, _quat, _scl);
  return m;
}

function makeStrutMat4(x1, y1, z1, x2, y2, z2, thickX = 0.2, thickZ = 0.2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dy, dz) || 0.001;
  const midX = (x1 + x2) * 0.5;
  const midY = (y1 + y2) * 0.5;
  const midZ = (z1 + z2) * 0.5;
  const dir = new THREE.Vector3(dx / len, dy / len, dz / len);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const m = new THREE.Matrix4();
  m.compose(new THREE.Vector3(midX, midY, midZ), q, new THREE.Vector3(thickX, len, thickZ));
  return m;
}

function mergeGeos(items) {
  if (!items || items.length === 0) return null;

  let totalVerts = 0;
  let totalIndices = 0;
  let useColors = false;

  for (let i = 0; i < items.length; i++) {
    const g = items[i]?.geo;
    if (!g || !g.attributes?.position) continue;
    const vc = g.attributes.position.count;
    totalVerts += vc;
    totalIndices += g.index ? g.index.count : vc;
    if (g.attributes.color || items[i].color) useColors = true;
  }
  if (totalVerts === 0) return null;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const colors = useColors ? new Float32Array(totalVerts * 3) : null;
  const indices = totalVerts > 65535 ? new Uint32Array(totalIndices) : new Uint16Array(totalIndices);

  let vOff = 0;
  let iOff = 0;
  const tmpCol = new THREE.Color();

  for (let idx = 0; idx < items.length; idx++) {
    const { geo, matrix, color } = items[idx];
    if (!geo || !geo.attributes?.position) continue;

    const posA = geo.attributes.position;
    const normA = geo.attributes.normal;
    const uvA = geo.attributes.uv;
    const colA = geo.attributes.color;
    const vc = posA.count;

    let cr = 1, cg = 1, cb = 1;
    if (color !== undefined && color !== null) {
      if (typeof color === 'number') tmpCol.setHex(color);
      else if (color.isColor) tmpCol.copy(color);
      else tmpCol.set(color);
      cr = tmpCol.r;
      cg = tmpCol.g;
      cb = tmpCol.b;
    }

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

    for (let v = 0; v < vc; v++) {
      const px = posA.getX(v);
      const py = posA.getY(v);
      const pz = posA.getZ(v);
      const pb = (vOff + v) * 3;

      positions[pb] = m00 * px + m01 * py + m02 * pz + m03;
      positions[pb + 1] = m10 * px + m11 * py + m12 * pz + m13;
      positions[pb + 2] = m20 * px + m21 * py + m22 * pz + m23;

      if (normA) {
        const nx = normA.getX(v);
        const ny = normA.getY(v);
        const nz = normA.getZ(v);
        const tnx = n00 * nx + n01 * ny + n02 * nz;
        const tny = n10 * nx + n11 * ny + n12 * nz;
        const tnz = n20 * nx + n21 * ny + n22 * nz;
        const nLen = Math.hypot(tnx, tny, tnz) || 1;
        normals[pb] = tnx / nLen;
        normals[pb + 1] = tny / nLen;
        normals[pb + 2] = tnz / nLen;
      } else {
        normals[pb + 1] = 1;
      }

      if (uvA) {
        const ub = (vOff + v) * 2;
        uvs[ub] = uvA.getX(v);
        uvs[ub + 1] = uvA.getY(v);
      }

      if (colors) {
        if (colA) {
          colors[pb] = colA.getX(v) * cr;
          colors[pb + 1] = colA.getY(v) * cg;
          colors[pb + 2] = colA.getZ(v) * cb;
        } else {
          colors[pb] = cr;
          colors[pb + 1] = cg;
          colors[pb + 2] = cb;
        }
      }
    }

    if (geo.index) {
      const ia = geo.index.array;
      const ic = geo.index.count;
      for (let k = 0; k < ic; k++) indices[iOff + k] = ia[k] + vOff;
      iOff += ic;
    } else {
      for (let k = 0; k < vc; k++) indices[iOff + k] = k + vOff;
      iOff += vc;
    }
    vOff += vc;
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  if (colors) out.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  out.setIndex(new THREE.BufferAttribute(indices, 1));
  out.computeBoundingSphere();
  return out;
}

// ============================================================================
// Exact Analytical Terrain, Canal Bridge, Lifeguard, Skatepark & Hill Math
// ============================================================================

function getBaseBeachHeight(x, z) {
  if (x >= -128) return SIDEWALK_Y;
  if (x >= -212) {
    const t = (-128 - x) / 84;
    const ripple = Math.sin(z * 0.045) * 0.035 * Math.sin(t * Math.PI);
    return lerp(0.22, -0.30, t) + ripple;
  }
  const deepT = clamp((-212 - x) / 60, 0, 1);
  return lerp(-0.30, -2.20, deepT);
}

function getBaseWorldHillHeight(x, z) {
  if (z >= -225) return SIDEWALK_Y;
  const northT = smoothstep(-225, -262, z);
  const peaks = [
    { px: -145, pz: -315, h: 66, rx: 68, rz: 58 },
    { px: -45, pz: -335, h: 78, rx: 74, rz: 62 },
    { px: 60, pz: -308, h: 68, rx: 66, rz: 52 },
    { px: 165, pz: -332, h: 91, rx: 78, rz: 64 },
    { px: 235, pz: -305, h: 56, rx: 56, rz: 52 },
  ];
  let sum = 26 * smoothstep(-225, -285, z);
  for (let i = 0; i < peaks.length; i++) {
    const p = peaks[i];
    const dx = (x - p.px) / p.rx;
    const dz = (z - p.pz) / p.rz;
    sum += p.h * Math.exp(-(dx * dx + dz * dz));
  }
  const ridgeDetail =
    Math.sin(x * 0.045 + z * 0.03) * 2.8 +
    Math.cos(x * 0.09 - z * 0.07) * 1.4;
  return SIDEWALK_Y + northT * Math.min(94.5, Math.max(0, sum + ridgeDetail));
}

// ----------------------------------------------------------------------------
// 1. VESPUCCI CANALS (`X in [-205, -132], Z in [-235, -130]`)
//    Water surface at exact y = -0.15m; 3 Arched Drivable Bridges peaking at y = 2.60m!
// ----------------------------------------------------------------------------
const CANAL_BRIDGES = [
  // Bridge 1: East Canal Arch Bridge connecting Coastal Ave (-132) -> Central Venetian Island (-157)
  {
    id: 'canal_bridge_east',
    axis: 'x',
    minX: -158.0,
    maxX: -132.0,
    minZ: -187.2,
    maxZ: -176.8,
    waterMin: -153.8,
    waterMax: -140.2,
    yStart: 0.62, // -158 (Island side)
    yEnd: 0.28,   // -132 (East street side)
    peakY: 2.60,
  },
  // Bridge 2: West Grand Canal Arch Bridge connecting Central Island (-162) -> Oceanfront Peninsula (-188)
  {
    id: 'canal_bridge_west',
    axis: 'x',
    minX: -188.0,
    maxX: -162.0,
    minZ: -187.2,
    maxZ: -176.8,
    waterMin: -183.8,
    waterMax: -166.2,
    yStart: 0.62, // -188 (West peninsula)
    yEnd: 0.62,   // -162 (Central island)
    peakY: 2.60,
  },
  // Bridge 3: South Venetian Arch Bridge connecting Beach/Promenade (Z=-130) -> Central Island (Z=-156)
  {
    id: 'canal_bridge_south',
    axis: 'z',
    minX: -165.2,
    maxX: -154.8,
    minZ: -156.0,
    maxZ: -130.0,
    waterMin: -151.8,
    waterMax: -138.2,
    yStart: 0.62, // Z = -156 (Central island)
    yEnd: 0.24,   // Z = -130 (South beach promenade)
    peakY: 2.60,
  },
];

function evalCanalBridgeDeck(br, x, z) {
  if (br.axis === 'x') {
    const u = clamp((x - br.minX) / (br.maxX - br.minX), 0, 1);
    const base = lerp(br.yStart, br.yEnd, u);
    const hump = Math.sin(u * Math.PI);
    const humpShaped = hump * hump * (3 - 2 * hump);
    // Peak at u = 0.5 reaches exact br.peakY = 2.60m!
    const midBase = (br.yStart + br.yEnd) * 0.5;
    return base + (br.peakY - midBase) * humpShaped;
  }
  const u = clamp((z - br.minZ) / (br.maxZ - br.minZ), 0, 1);
  const base = lerp(br.yStart, br.yEnd, u);
  const hump = Math.sin(u * Math.PI);
  const humpShaped = hump * hump * (3 - 2 * hump);
  const midBase = (br.yStart + br.yEnd) * 0.5;
  return base + (br.peakY - midBase) * humpShaped;
}

function isInsideCanalWater(x, z) {
  if (x < -208.0 || x > -139.5 || z < -228.5 || z > -136.5) return false;
  // 1) Pacific Ocean Inlet Channel (X in [-208, -176], Z in [-193, -171], avoiding Bridge 2 piers)
  if (x <= -176.0 && z >= -193.0 && z <= -171.0) return true;
  // 2) West Grand Canal (X in [-184, -166], Z in [-226, -138])
  if (x >= -184.0 && x <= -166.0 && z >= -226.0 && z <= -138.0) return true;
  // 3) East Inner Canal (X in [-154, -140], Z in [-226, -138])
  if (x >= -154.0 && x <= -140.0 && z >= -226.0 && z <= -138.0) return true;
  // 4) North Cross-Canal (X in [-184, -140], Z in [-226, -212])
  if (x >= -184.0 && x <= -140.0 && z >= -226.0 && z <= -212.0) return true;
  // 5) South Cross-Canal (X in [-184, -140], Z in [-152, -138])
  if (x >= -184.0 && x <= -140.0 && z >= -152.0 && z <= -138.0) return true;
  return false;
}

function sampleVespucciCanalsElevation(x, z, resolvedY) {
  if (x < -208.0 || x > -130.0 || z < -235.0 || z > -130.0) return null;

  // 1) Check the 3 Arched Drivable Bridges first!
  for (let i = 0; i < CANAL_BRIDGES.length; i++) {
    const br = CANAL_BRIDGES[i];
    if (x >= br.minX && x <= br.maxX && z >= br.minZ && z <= br.maxZ) {
      const deckY = evalCanalBridgeDeck(br, x, z);
      const overWaterSpan = br.axis === 'x'
        ? (x >= br.waterMin && x <= br.waterMax)
        : (z >= br.waterMin && z <= br.waterMax);
      // Multi-elevation: allow Jet Skis / Speedboats (y < 0.25m) to cruise freely underneath the 2.6m bridge arch!
      if (overWaterSpan && resolvedY !== undefined && resolvedY < 0.25 && deckY > 1.35) {
        return CANAL_BED_Y;
      }
      return deckY;
    }
  }

  // 2) Floating Timber Boat Slips (`y = 0.16m` above `-0.15m` canal water!)
  //    Slip A (Ocean Inlet South): X in [-200, -188], Z in [-195.2, -192.4]
  if (x >= -200.0 && x <= -188.0 && z >= -195.2 && z <= -192.4) return 0.16;
  //    Slip B (Grand Canal North-West): X in [-184.0, -180.5], Z in [-204.0, -193.0]
  if (x >= -184.0 && x <= -180.5 && z >= -204.0 && z <= -193.0) return 0.16;
  //    Slip C (Grand Canal South-East Island): X in [-169.5, -166.0], Z in [-170.0, -158.0]
  if (x >= -169.5 && x <= -166.0 && z >= -170.0 && z <= -158.0) return 0.16;
  //    Slip D (East Canal Quay): X in [-143.5, -140.0], Z in [-204.0, -193.0]
  if (x >= -143.5 && x <= -140.0 && z >= -204.0 && z <= -193.0) return 0.16;

  // 3) Canal Water Channels (`water surface = -0.15m`, stone canal bed = `-1.55m`)
  if (isInsideCanalWater(x, z)) {
    return CANAL_BED_Y;
  }

  // 4) Venetian Quayside Promenades & Villa Islands (`y = 0.62m` with smooth outer approach ramps!)
  if (x >= -202.0 && x <= -132.0 && z >= -233.5 && z <= -132.0) {
    // Smooth ramp along East edge X in [-135.5, -132.0] down to street/promenade (0.24m)
    let edgeBlend = 1.0;
    if (x > -135.5) edgeBlend = Math.min(edgeBlend, smoothstep(-132.0, -135.5, x));
    if (z > -135.5) edgeBlend = Math.min(edgeBlend, smoothstep(-132.0, -135.5, z));
    if (z < -230.0) edgeBlend = Math.min(edgeBlend, smoothstep(-234.0, -230.0, z));
    if (x < -198.0) edgeBlend = Math.min(edgeBlend, smoothstep(-202.5, -198.0, x));
    return lerp(0.24, CANAL_QUAY_Y, edgeBlend);
  }

  return null;
}

// ----------------------------------------------------------------------------
// 2. VESPUCCI BEACH CONCRETE SKATEPARK & HALFPIPE BOWL (`X in [-176, -142], Z in [+34, +70]`)
//    Sculpted smooth concrete skatepark with drivable U-shaped Halfpipe (+3.40m lip!),
//    central Spine Transfer (+2.25m), and Southern Quarter-Pipe Bowl (+2.85m)!
// ----------------------------------------------------------------------------
function evalSkateparkHeight(x, z) {
  if (x < -176.5 || x > -141.5 || z < 33.5 || z > 70.5) return null;

  const sandY = getBaseBeachHeight(x, z);
  // Outer 2.2m perimeter blends smoothly from beach sand onto the skatepark coping apron
  const blendX = Math.min(smoothstep(-176.5, -174.2, x), smoothstep(-141.5, -143.8, x));
  const blendZ = Math.min(smoothstep(33.5, 36.2, z), smoothstep(70.5, 68.0, z));
  const parkMask = blendX * blendZ;
  if (parkMask <= 0.0001) return sandY;

  const flatBottomY = -0.32;
  let bowlY = 0.36;

  if (z <= 55.5) {
    // === NORTHERN GIANT DRIVABLE U-SHAPED HALFPIPE (`Z in [36.2, 55.5]`) ===
    // Flat bottom X in [-163.2, -154.8] at y = -0.32m;
    // Parabolic/cubic vert walls curve smoothly up to EXACT +3.40m lip on West (-172.8) & East (-145.2)!
    const distFromCenterX = Math.abs(x - (-159.0));
    let wallH = flatBottomY;
    if (distFromCenterX > 4.2) {
      if (distFromCenterX <= 13.6) {
        const u = clamp((distFromCenterX - 4.2) / 9.4, 0, 1);
        // Smooth tangent=0 at bottom, rising parabolically to +3.40m at lip!
        const curve = 0.68 * u * u + 0.32 * u * u * u;
        wallH = lerp(flatBottomY, 3.40, curve);
      } else {
        // 1.2m flat coping deck at +3.40m, then smooth outer roll-down to beach apron
        const outerT = smoothstep(14.3, 16.8, distFromCenterX);
        wallH = lerp(3.40, 0.42, outerT);
      }
    }

    // North entry roll-in (`Z in [36.2, 39.2]`) lets motorcycles & cars enter straight into the U-channel!
    if (z < 39.4 && distFromCenterX < 6.5) {
      const rollInT = smoothstep(36.2, 39.4, z);
      wallH = lerp(0.32, wallH, rollInT);
    }
    bowlY = wallH;
  } else if (z <= 58.6) {
    // === CENTRAL SPINE TRANSFER RAMP (`Z in [55.5, 58.6]`) ===
    const distFromCenterX = Math.abs(x - (-159.0));
    // Parabolic spine peaking at Z = 57.05 (`y = +2.28m`) across center channel, blending into side walls!
    const spineU = 1.0 - Math.abs((z - 57.05) / 1.55);
    const spineProfile = clamp(spineU, 0, 1);
    const centerSpineY = lerp(flatBottomY, 2.28, spineProfile * (2.0 - spineProfile));

    let sideWallY = flatBottomY;
    if (distFromCenterX > 4.2) {
      const u = clamp((distFromCenterX - 4.2) / 9.4, 0, 1);
      const lipTarget = lerp(3.40, 2.85, smoothstep(55.5, 58.6, z));
      sideWallY = distFromCenterX <= 13.6
        ? lerp(flatBottomY, lipTarget, 0.68 * u * u + 0.32 * u * u * u)
        : lerp(lipTarget, 0.42, smoothstep(14.3, 16.8, distFromCenterX));
    }
    bowlY = Math.max(centerSpineY, sideWallY);
  } else {
    // === SOUTHERN SCULPTED QUARTER-PIPE BOWL (`Z in [58.6, 68.0]`) ===
    const dx = Math.max(0, Math.abs(x - (-159.0)) - 4.2) / 9.4;
    const dz = Math.max(0, (z - 61.2)) / 6.4;
    const rad = clamp(Math.hypot(dx, dz), 0, 1.35);
    if (rad <= 1.0) {
      bowlY = lerp(flatBottomY, 2.85, 0.66 * rad * rad + 0.34 * rad * rad * rad);
    } else {
      bowlY = lerp(2.85, 0.42, smoothstep(1.06, 1.32, rad));
    }
  }

  return lerp(sandY, bowlY, parkMask);
}

// ----------------------------------------------------------------------------
// 3. LIFEGUARD TOWERS (`(-178, y, -65)`, `(-178, y, +42)`, `(-178, y, +155)`)
//    & MUSCLE SANDS GYM (`(-148, y, -48)`) & BRICK PROMENADE (`X in [-134, -128]`)
// ----------------------------------------------------------------------------
const LIFEGUARD_TOWERS = [
  { num: 1, x: -178.0, z: -65.0 },
  { num: 2, x: -178.0, z: 42.0 },
  { num: 3, x: -178.0, z: 155.0 },
];

function sampleLifeguardTowerElevation(x, z) {
  for (let i = 0; i < LIFEGUARD_TOWERS.length; i++) {
    const t = LIFEGUARD_TOWERS[i];
    if (Math.abs(z - t.z) > 2.6 || x < t.x - 2.6 || x > t.x + 5.8) continue;
    const baseSand = getBaseBeachHeight(t.x, t.z);
    const deckY = baseSand + 2.15;
    // Walkable East Stair Flight: X from (t.x + 5.2) climbing West to (t.x + 2.0), Z in [t.z - 0.95, t.z + 0.95]
    if (x >= t.x + 2.0 && x <= t.x + 5.3 && Math.abs(z - t.z) <= 0.98) {
      const u = clamp(((t.x + 5.3) - x) / 3.3, 0, 1);
      return lerp(getBaseBeachHeight(x, z), deckY, u);
    }
    // Walkable Wrap-Around Lookout Deck: X in [t.x - 2.1, t.x + 2.1], Z in [t.z - 2.1, t.z + 2.1]
    if (x >= t.x - 2.15 && x <= t.x + 2.15 && Math.abs(z - t.z) <= 2.15) {
      return deckY;
    }
  }
  return null;
}

function sampleMuscleSandsGymElevation(x, z) {
  // Concrete workout pad centered at (-148, y, -48): X in [-159.5, -136.5], Z in [-61.0, -35.0]
  if (x < -160.5 || x > -135.5 || z < -62.0 || z > -34.0) return null;
  const sandY = getBaseBeachHeight(x, z);
  const padY = 0.28;
  const bx = Math.min(smoothstep(-160.5, -158.8, x), smoothstep(-135.5, -137.2, x));
  const bz = Math.min(smoothstep(-62.0, -60.2, z), smoothstep(-34.0, -35.8, z));
  return lerp(sandY, padY, bx * bz);
}

function sampleCoastalPromenadeElevation(x, z) {
  // Brick-paved coastal promenade X in [-134, -128], Z in [-126, +190] (yielding cleanly to Bồng Lai Tiên Đảo Pier ramp Z in [-23, +3])
  if (x < -134.8 || x > -128.0 || z < -126.0 || z > 190.0) return null;
  if (z >= -22.8 && z <= 2.8) return null; // Bồng Lai Tiên Đảo Pier entrance ramp
  const sandY = getBaseBeachHeight(x, z);
  const promY = 0.24;
  const w = smoothstep(-134.8, -133.6, x);
  return lerp(sandY, promY, w);
}

// ----------------------------------------------------------------------------
// 4. MOUNTAIN TOUGE DRIFT ROAD & 4 CANTILEVER STILT MANSIONS WITH INFINITY POOLS
//    Mansions: (-65, 24, -275), (-10, 30, -315), (175, 26, -265), (225, 32, -310)
//    Touge Road: Connects North Tunnel Exit (120, -385) across ridge -> West Blvd (-120, -210)!
// ----------------------------------------------------------------------------
const STILT_MANSIONS = [
  {
    id: 'mansion_west',
    name: 'Biệt Thự Chân Cầu Whispymound West',
    x: -65.0,
    y: 24.0,
    z: -275.0,
    carColor: 0xf8fafc,
    carType: 'obey9f',
  },
  {
    id: 'mansion_apex',
    name: 'Biệt Thự Hồ Bơi Vô Cực Mulholland Apex',
    x: -10.0,
    y: 30.0,
    z: -315.0,
    carColor: 0xd4af37,
    carType: 'zentorno',
  },
  {
    id: 'mansion_east',
    name: 'Biệt Thự Chân Cầu Galileo Overlook',
    x: 175.0,
    y: 26.0,
    z: -265.0,
    carColor: 0xc81d25,
    carType: 'banshee',
  },
  {
    id: 'mansion_peak',
    name: 'Biệt Thự Hồ Bơi Vô Cực Eclipse Ridge',
    x: 225.0,
    y: 32.0,
    z: -310.0,
    carColor: 0x0ea5e9,
    carType: 'obey9f',
  },
];

function buildTougeRoadSplineNodes() {
  // Smooth Catmull-Rom control waypoints from Northern Tunnel Exit (120, 0.04, -375 -> -385)
  // climbing East around Mansion 4 (225, 32, -310) & Mansion 3 (175, 26, -265),
  // crossing above Côn Lôn Tiên Sơn Tunnel at (120, 29, -274), grazing Galileo Observatory (86, 28, -242),
  // sweeping below the giant VINEWOOD sign (56, 31, -273), servicing Mansion 2 (-10, 30, -315)
  // & Mansion 1 (-65, 24, -275), and winding down to West Boulevard (-120, 0.04, -210)!
  const ctrl = [
    new THREE.Vector3(120.0, 0.04, -376.0),
    new THREE.Vector3(120.0, 0.45, -386.0),
    new THREE.Vector3(136.0, 5.20, -404.0),
    new THREE.Vector3(168.0, 14.50, -406.0),
    new THREE.Vector3(204.0, 24.80, -382.0),
    new THREE.Vector3(225.0, 32.00, -346.0),
    new THREE.Vector3(225.0, 32.00, -327.5), // Services Mansion 4 (225, 32, -310) carport!
    new THREE.Vector3(202.0, 29.50, -304.0),
    new THREE.Vector3(175.0, 26.00, -282.5), // Services Mansion 3 (175, 26, -265) carport!
    new THREE.Vector3(146.0, 27.60, -279.0),
    new THREE.Vector3(120.0, 29.20, -274.0), // Overpass ridge 21.4m ABOVE Côn Lôn Tiên Sơn Tunnel!
    new THREE.Vector3(94.0, 28.10, -248.0),  // Services East Galileo Observatory Terrace (84, 28, -242)!
    new THREE.Vector3(84.0, 29.80, -269.0),
    new THREE.Vector3(56.0, 31.40, -273.5),  // Scenic pass right below giant 3D VINEWOOD letters (Z=-295)!
    new THREE.Vector3(26.0, 29.40, -270.0),
    new THREE.Vector3(8.0, 30.10, -308.0),
    new THREE.Vector3(-10.0, 30.00, -332.5), // Services Mansion 2 (-10, 30, -315) carport!
    new THREE.Vector3(-38.0, 27.40, -322.0),
    new THREE.Vector3(-65.0, 24.00, -292.5), // Services Mansion 1 (-65, 24, -275) carport!
    new THREE.Vector3(-96.0, 18.20, -286.0),
    new THREE.Vector3(-115.0, 11.20, -260.0),
    new THREE.Vector3(-120.0, 4.40, -234.0),
    new THREE.Vector3(-120.0, 0.04, -210.0), // Connects straight into West Boulevard (X = -120)!
  ];

  const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal', 0.45);
  const samples = 136;
  const nodes = [];
  let arcLen = 0;

  for (let i = 0; i <= samples; i++) {
    const p = curve.getPoint(i / samples);
    let y = p.y;
    // Pin exact flat grades at tunnel mouth, mansion carports, and West Blvd touchdown!
    if (i === 0) y = 0.04;
    if (i === samples) y = 0.04;
    nodes.push({ x: p.x, y, z: p.z, s: 0, bank: 0 });
    if (i > 0) {
      arcLen += Math.hypot(p.x - nodes[i - 1].x, y - nodes[i - 1].y, p.z - nodes[i - 1].z);
      nodes[i].s = arcLen;
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[Math.max(0, i - 1)];
    const b = nodes[Math.min(nodes.length - 1, i + 1)];
    const txRaw = b.x - a.x;
    const tzRaw = b.z - a.z;
    const hLen = Math.hypot(txRaw, tzRaw) || 1;
    const tx = txRaw / hLen;
    const tz = tzRaw / hLen;
    nodes[i].tx = tx;
    nodes[i].tz = tz;
    nodes[i].rx = -tz;
    nodes[i].rz = tx;
    nodes[i].yaw = Math.atan2(tx, tz);

    // Subtle inward banking on tight mountain drift hairpins
    if (i > 1 && i < nodes.length - 2) {
      const prev = nodes[i - 1];
      const next = nodes[i + 1];
      const dYaw = Math.atan2(
        prev.tx * next.tz - prev.tz * next.tx,
        prev.tx * next.tx + prev.tz * next.tz
      );
      nodes[i].bank = clamp(dYaw * 0.18, -0.055, 0.055);
    }
  }

  return nodes;
}

const TOUGE_NODES = buildTougeRoadSplineNodes();
const TOUGE_BOUNDS = (() => {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < TOUGE_NODES.length; i++) {
    const n = TOUGE_NODES[i];
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.z < minZ) minZ = n.z;
    if (n.z > maxZ) maxZ = n.z;
  }
  return { minX: minX - 16, maxX: maxX + 16, minZ: minZ - 16, maxZ: maxZ + 16 };
})();

function queryTougeRoadProximity(x, z, maxHalfW = 24.0) {
  if (x < TOUGE_BOUNDS.minX - maxHalfW || x > TOUGE_BOUNDS.maxX + maxHalfW ||
      z < TOUGE_BOUNDS.minZ - maxHalfW || z > TOUGE_BOUNDS.maxZ + maxHalfW) {
    return null;
  }
  const maxD2 = maxHalfW * maxHalfW;
  let bestD2 = maxD2;
  let bestY = 0;
  let bestSignedLat = 0;

  for (let i = 0; i < TOUGE_NODES.length - 1; i++) {
    const a = TOUGE_NODES[i];
    const b = TOUGE_NODES[i + 1];
    const sMinX = (a.x < b.x ? a.x : b.x) - maxHalfW;
    const sMaxX = (a.x > b.x ? a.x : b.x) + maxHalfW;
    if (x < sMinX || x > sMaxX) continue;
    const sMinZ = (a.z < b.z ? a.z : b.z) - maxHalfW;
    const sMaxZ = (a.z > b.z ? a.z : b.z) + maxHalfW;
    if (z < sMinZ || z > sMaxZ) continue;

    const pr = projectPointOnSegment2D(x, z, a.x, a.z, b.x, b.z);
    if (pr.distSq < bestD2) {
      bestD2 = pr.distSq;
      const baseY = lerp(a.y, b.y, pr.t);
      const bank = lerp(a.bank || 0, b.bank || 0, pr.t);
      bestY = baseY + clamp(pr.signedLat, -TOUGE_HALF_W, TOUGE_HALF_W) * Math.sin(bank);
      bestSignedLat = pr.signedLat;
    }
  }
  if (bestD2 >= maxD2) return null;
  return { dist: Math.sqrt(bestD2), y: bestY, signedLat: bestSignedLat };
}

function sampleMansionDeckElevation(x, z) {
  for (let i = 0; i < STILT_MANSIONS.length; i++) {
    const m = STILT_MANSIONS[i];
    // Mansion + North Carport Apron spans X in [m.x - 13.0, m.x + 13.0], Z in [m.z - 19.0, m.z + 12.0]
    if (x < m.x - 13.2 || x > m.x + 13.2 || z < m.z - 19.5 || z > m.z + 12.2) continue;

    // Shallow glowing Infinity Pool basin on overhanging South terrace:
    // X in [m.x - 6.5, m.x + 6.5], Z in [m.z + 4.2, m.z + 11.2]
    if (x >= m.x - 6.5 && x <= m.x + 6.5 && z >= m.z + 4.2 && z <= m.z + 11.2) {
      return m.y - 0.58;
    }
    return m.y;
  }
  return null;
}

// Sculpted Côn Lôn Tiên Sơn Mountain surface height that:
//   1) Preserves the giant 3D VINEWOOD Sign peak `(X in [14, 106], Z in [-312, -286])` at ~62m!
//   2) Carves dramatic cliff drops underneath the South overhanging Infinity Pools of all 4 Stilt Mansions
//      while grading their North driveways cleanly to `m.y`!
//   3) Grades mountain shoulders smoothly into the 12m Touge Drift Road!
//   4) Lifts the South Tunnel brow (`Z in [-246, -225], X in [106, 134]`) cleanly above the 7.8m vault,
//      and carves the North Tunnel open canyon exit (`Z <= -373, X in [104, 136]`) down to `0.04m`!
function evalSculptedHillHeight(x, z) {
  let h = getBaseWorldHillHeight(x, z);

  // Extend northern mountain ridge beyond world.js's Z=-395 edge out to Z=-435
  if (z < -385) {
    const farNorthFade = smoothstep(-385, -432, z);
    h = lerp(h, Math.max(12.0, h * 0.52), farNorthFade);
  }

  // Protection mask for the Giant 3D "VINEWOOD" Sign at X in [16, 104], Z = -295 so its support legs never float!
  const signProtect =
    (1 - smoothstep(42, 56, Math.abs(x - 60.0))) *
    (1 - smoothstep(7.5, 16.5, Math.abs(z - (-295.0))));

  if (signProtect < 0.999) {
    let targetH = h;
    let blendW = 0;

    // A) 4 Cantilever Stilt Mansions: bench at North carport (`m.y - 0.18`), steep cliff drop (`m.y - 16m`) under South Infinity Pool!
    for (let i = 0; i < STILT_MANSIONS.length; i++) {
      const m = STILT_MANSIONS[i];
      const dx = Math.abs(x - m.x);
      const dz = z - m.z;
      if (dx < 34.0 && dz > -32.0 && dz < 34.0) {
        const wx = 1 - smoothstep(14.5, 34.0, dx);
        const wz = dz < 0
          ? 1 - smoothstep(-19.5, -32.0, dz)
          : 1 - smoothstep(13.5, 34.0, dz);
        const w = wx * wz;
        // North side (dz <= -3.5) sits right under driveway slab; South side (dz > -3.5) plunges 16m down the cliff so stilts & pool overhang dramatically!
        const cliffProfile = smoothstep(-3.5, 11.5, dz);
        const mGround = lerp(m.y - 0.22, Math.max(6.0, m.y - 16.5), cliffProfile);
        targetH = lerp(targetH, mGround, w);
        blendW = Math.max(blendW, w);
      }
    }

    // B) Mountain Touge Drift Road bench-cut grading
    const tHit = queryTougeRoadProximity(x, z, 20.0);
    if (tHit) {
      const roadW = 1 - smoothstep(TOUGE_HALF_W + 0.8, 20.0, tHit.dist);
      const cutY = tHit.y - 0.22;
      targetH = lerp(targetH, cutY, roadW);
      blendW = Math.max(blendW, roadW);
    }

    // C) North Tunnel Exit Rock-Cut Canyon (`X in [96, 144], Z in [-396, -368]`)
    if (z <= -366.0 && z >= -402.0 && Math.abs(x - 120.0) < 26.0) {
      const cwX = 1 - smoothstep(10.5, 25.0, Math.abs(x - 120.0));
      const cwZ = smoothstep(-366.0, -374.5, z) * (1 - smoothstep(-392.0, -402.0, z));
      const canyonFloor = z < -376 ? lerp(0.02, 0.45, smoothstep(-376, -386, z)) : 0.02;
      // Keep tunnel roof covered up to Z = -374.5, open canyon North of Z = -375.0!
      if (z <= -374.6) {
        targetH = lerp(targetH, canyonFloor, cwX * cwZ);
      } else {
        targetH = Math.max(targetH, 9.8);
      }
    }

    // D) South Tunnel Portal Earthen Brow (`X in [104, 136], Z in [-248, -225]`)
    //    Lift hill vertices cleanly above the 8.2m concrete arch so hill triangles NEVER poke inside the tunnel bore!
    if (z >= -248.0 && z <= -224.8 && Math.abs(x - 120.0) < 17.5) {
      const browW = (1 - smoothstep(11.0, 17.5, Math.abs(x - 120.0))) * (1 - smoothstep(-238.0, -248.0, z));
      const minPortalRoofY = 9.4 + smoothstep(-225.0, -238.0, z) * 4.2;
      targetH = lerp(targetH, Math.max(targetH, minPortalRoofY), browW);
    }

    h = lerp(targetH, h, signProtect);
  }

  return h;
}

// ============================================================================
// Procedural CanvasTexture Workshop (100% Zero External Assets)
// ============================================================================

function makeCanvasTexture(w, h, drawFn, repeatX = 1, repeatY = 1, isSRGB = true) {
  if (typeof document === 'undefined') {
    const data = new Uint8Array([180, 180, 180, 255]);
    const dt = new THREE.DataTexture(data, 1, 1);
    dt.needsUpdate = true;
    return dt;
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  drawFn(g, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (isSRGB) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createCoastHillsTextures() {
  const rng = createRNG(90210);

  // 1. Mountain Touge & Tunnel Asphalt Texture (2-lane / 4-lane markings)
  const asphaltTouge = makeCanvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#232730';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1200; i++) {
      const v = 28 + Math.floor(rng() * 22);
      g.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      g.fillRect(Math.floor(rng() * w), Math.floor(rng() * h), 2, 3);
    }
    // Subtle dark drift tire marks along racing groove
    g.fillStyle = 'rgba(12,14,18,0.28)';
    g.fillRect(w * 0.22, 0, w * 0.12, h);
    g.fillRect(w * 0.66, 0, w * 0.12, h);
    // Double yellow center line
    g.fillStyle = '#eab308';
    g.fillRect(w * 0.482, 0, 3, h);
    g.fillRect(w * 0.518 - 3, 0, 3, h);
    // Crisp white shoulder lines
    g.fillStyle = 'rgba(241,245,249,0.88)';
    g.fillRect(w * 0.055, 0, 4, h);
    g.fillRect(w * 0.945 - 4, 0, 4, h);
  });

  // 2. Herringbone Brick Coastal Promenade Texture
  const brickPromenade = makeCanvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#8b4c39';
    g.fillRect(0, 0, w, h);
    const bw = 32;
    const bh = 16;
    for (let y = 0; y < h; y += bh) {
      const row = Math.floor(y / bh);
      const off = (row % 2) * (bw * 0.5);
      for (let x = -bw; x < w + bw; x += bw) {
        const shade = Math.floor((rng() - 0.5) * 28);
        g.fillStyle = `rgb(${156 + shade},${84 + Math.floor(shade * 0.6)},${62 + Math.floor(shade * 0.5)})`;
        g.fillRect(x + off + 1.5, y + 1.5, bw - 3, bh - 3);
      }
    }
  }, 2, 24);

  // 3. Skatepark Troweled Concrete + Venice Graffiti Accents
  const skateConcrete = makeCanvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#c8ccd2';
    g.fillRect(0, 0, w, h);
    // Concrete expansion joint grid
    g.strokeStyle = 'rgba(95,102,112,0.38)';
    g.lineWidth = 2;
    for (let k = 0; k <= w; k += 64) {
      g.beginPath(); g.moveTo(k, 0); g.lineTo(k, h); g.stroke();
      g.beginPath(); g.moveTo(0, k); g.lineTo(w, k); g.stroke();
    }
    // Skate wheel urethane carve marks
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = `rgba(40,44,52,${0.06 + rng() * 0.09})`;
      g.lineWidth = 1.5;
      g.beginPath();
      const cx = rng() * w;
      const cy = rng() * h;
      g.arc(cx, cy, 18 + rng() * 44, rng() * Math.PI, rng() * Math.PI + 1.1);
      g.stroke();
    }
    // Vibrant West-Coast street art splashes in bowl corners
    const sprays = [
      { x: 120, y: 130, r: 42, c1: 'rgba(6,182,212,0.42)', c2: 'rgba(236,72,153,0.38)' },
      { x: 380, y: 370, r: 48, c1: 'rgba(250,204,21,0.42)', c2: 'rgba(34,197,94,0.36)' },
      { x: 370, y: 140, r: 36, c1: 'rgba(168,85,247,0.38)', c2: 'rgba(249,115,22,0.38)' },
    ];
    for (const sp of sprays) {
      const grd = g.createRadialGradient(sp.x, sp.y, 4, sp.x, sp.y, sp.r);
      grd.addColorStop(0, sp.c1);
      grd.addColorStop(0.6, sp.c2);
      grd.addColorStop(1, 'rgba(200,204,210,0)');
      g.fillStyle = grd;
      g.beginPath();
      g.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
      g.fill();
    }
  });

  // 4. Côn Lôn Tiên Sơn Tunnel Tiled Ceramic Safety Wall + High-Vis Orange Reflective Stripe
  const tunnelTile = makeCanvasTexture(256, 256, (g, w, h) => {
    // Upper precast vault concrete + white ceramic tile midsection + dark soot baseboard
    g.fillStyle = '#cfd6de';
    g.fillRect(0, 0, w, h);
    const tw = 32;
    const th = 16;
    for (let y = 0; y < h; y += th) {
      for (let x = 0; x < w; x += tw) {
        const grime = y > h * 0.72 ? -32 : Math.floor((rng() - 0.5) * 12);
        g.fillStyle = `rgb(${214 + grime},${219 + grime},${224 + grime})`;
        g.fillRect(x + 1, y + 1, tw - 2, th - 2);
      }
    }
    // Lower exhaust soot band
    const sootGrad = g.createLinearGradient(0, h * 0.72, 0, h);
    sootGrad.addColorStop(0, 'rgba(30,33,38,0)');
    sootGrad.addColorStop(1, 'rgba(24,26,30,0.68)');
    g.fillStyle = sootGrad;
    g.fillRect(0, h * 0.72, w, h * 0.28);
    // Iconic Orange & White Reflective Tunnel Safety Stripe!
    g.fillStyle = '#f97316';
    g.fillRect(0, h * 0.58, w, 18);
    g.fillStyle = '#fffbeb';
    for (let sx = 8; sx < w; sx += 32) {
      g.fillRect(sx, h * 0.58 + 5, 16, 8);
    }
  });

  // 5. Barnacle-Weathered Under-Pier Timber Texture
  const barnacleTimber = makeCanvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = '#4a3625';
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) {
      const s = Math.floor((rng() - 0.5) * 18);
      g.fillStyle = `rgb(${72 + s},${52 + s},${36 + s})`;
      g.fillRect(x, 0, 7, h);
    }
    // Lower intertidal sea-moss & crusty white/grey barnacles
    const mossGrad = g.createLinearGradient(0, h * 0.52, 0, h);
    mossGrad.addColorStop(0, 'rgba(42,68,46,0)');
    mossGrad.addColorStop(0.45, 'rgba(38,66,44,0.65)');
    mossGrad.addColorStop(1, 'rgba(92,98,94,0.85)');
    g.fillStyle = mossGrad;
    g.fillRect(0, h * 0.52, w, h * 0.48);
    for (let i = 0; i < 240; i++) {
      const bx = rng() * w;
      const by = h * (0.58 + rng() * 0.40);
      g.fillStyle = i % 2 === 0 ? '#cbd5e1' : '#94a3b8';
      g.fillRect(bx, by, 3, 3);
    }
  });

  // 6. 8-Row Illuminated Signage Atlas (1 Single Material for ALL Signs & Kiosks!)
  const signageAtlas = makeCanvasTexture(1024, 1024, (g, w, h) => {
    const rows = [
      { title: 'DEL PERRO PIER', sub: 'PACIFIC BOARDWALK • AMUSEMENT PARK • FERRIS WHEEL', bg: '#1e2430', fg: '#f8fafc', acc: '#e2b96f' },
      { title: 'VINEWOOD TUNNEL', sub: 'ROUTE 120 NORTH • CLEARANCE 7.5M • LIGHTS ON', bg: '#0f3825', fg: '#f8fafc', acc: '#e5c158' },
      { title: 'MUSCLE SANDS GYM', sub: 'VENICE BEACH OUTDOOR WEIGHT PEN • IRON PARADISE', bg: '#1c1917', fg: '#f5e19c', acc: '#c94a3f' },
      { title: 'VESPUCCI SKATEPARK', sub: 'PRO HALFPIPE 3.4M • SPINE TRANSFER • BMX BOWL', bg: '#1c2430', fg: '#e2e8f0', acc: '#6ba8c9' },
      { title: 'CHIHUAHUA HOT DOGS', sub: 'JUMBO GRILLED DOGS • CHILI FRIES • COLD SPRUNK', bg: '#6e2323', fg: '#fef3c7', acc: '#e29954' },
      { title: 'PACIFIC GELATO & TACOS', sub: 'ARTISAN GELATO • BAJA FISH TACOS • SMOOTHIES', bg: '#184b54', fg: '#f8fafc', acc: '#e5b8b7' },
      { title: 'DEL PERRO SURF & SOUVENIRS', sub: 'CUSTOM BOARDS • SUNGLASSES • BEACHWEAR', bg: '#1e355e', fg: '#f5e6b3', acc: '#7bb5d9' },
      { title: 'LOS SANTOS LIFEGUARD', sub: 'PACIFIC COAST RESCUE • BAYWATCH TOWER', bg: '#9e2424', fg: '#ffffff', acc: '#f2cc59' },
    ];
    const rowH = h / rows.length;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const y0 = i * rowH;
      g.fillStyle = r.bg;
      g.fillRect(0, y0, w, rowH);
      g.strokeStyle = r.acc;
      g.lineWidth = 7;
      g.strokeRect(8, y0 + 8, w - 16, rowH - 16);
      g.fillStyle = r.fg;
      g.font = '900 54px "Arial Black", Impact, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(r.title, w * 0.5, y0 + rowH * 0.40);
      g.fillStyle = r.acc;
      g.font = 'bold 26px Arial, sans-serif';
      g.fillText(r.sub, w * 0.5, y0 + rowH * 0.77);
    }
  });

  return {
    asphaltTouge,
    brickPromenade,
    skateConcrete,
    tunnelTile,
    barnacleTimber,
    signageAtlas,
  };
}

function makeAtlasSignGeo(width, height, rowIdx, totalRows = 8, doubleSided = false) {
  const front = new THREE.PlaneGeometry(width, height);
  const vTop = 1 - rowIdx / totalRows;
  const vBot = 1 - (rowIdx + 1) / totalRows;
  const applyUV = (geo) => {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      uv.setXY(i, u, v > 0.5 ? vTop - 0.004 : vBot + 0.004);
    }
    uv.needsUpdate = true;
  };
  applyUV(front);
  if (!doubleSided) return front;
  const back = new THREE.PlaneGeometry(width, height);
  applyUV(back);
  back.rotateY(Math.PI);
  return mergeGeos([
    { geo: front, matrix: makeMat4(0, 0, 0.02) },
    { geo: back, matrix: makeMat4(0, 0, -0.02) },
  ]);
}

function createRibbonGeo(nodes, fullWidth, uvRepeatLen = 16.0, yLift = 0.02) {
  const n = nodes.length;
  const halfW = fullWidth * 0.5;
  const positions = new Float32Array(n * 2 * 3);
  const normals = new Float32Array(n * 2 * 3);
  const uvs = new Float32Array(n * 2 * 2);
  const indices = new Uint16Array((n - 1) * 6);

  for (let i = 0; i < n; i++) {
    const pt = nodes[i];
    const bankSin = Math.sin(pt.bank || 0);
    const lx = pt.x - pt.rx * halfW;
    const lz = pt.z - pt.rz * halfW;
    const ly = pt.y + yLift - halfW * bankSin;

    const rx = pt.x + pt.rx * halfW;
    const rz = pt.z + pt.rz * halfW;
    const ry = pt.y + yLift + halfW * bankSin;

    const b = i * 6;
    positions[b] = lx; positions[b + 1] = ly; positions[b + 2] = lz;
    positions[b + 3] = rx; positions[b + 4] = ry; positions[b + 5] = rz;

    normals[b] = 0; normals[b + 1] = 1; normals[b + 2] = 0;
    normals[b + 3] = 0; normals[b + 4] = 1; normals[b + 5] = 0;

    const vCoord = (pt.s || i * 4) / uvRepeatLen;
    const ub = i * 4;
    uvs[ub] = 0; uvs[ub + 1] = vCoord;
    uvs[ub + 2] = 1; uvs[ub + 3] = vCoord;

    if (i < n - 1) {
      const k = i * 6;
      const v0 = i * 2;
      indices[k] = v0;
      indices[k + 1] = v0 + 2;
      indices[k + 2] = v0 + 1;
      indices[k + 3] = v0 + 1;
      indices[k + 4] = v0 + 2;
      indices[k + 5] = v0 + 3;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeVertexNormals();
  return geo;
}

// ============================================================================
// Main Export: createMapCoastHills(ctx)
// ============================================================================

export function createMapCoastHills(ctx) {
  let activeCtx = ctx || null;
  let initialized = false;
  let worldHooked = false;
  let spawnedCoastVehicles = false;
  let elapsed = 0;
  let gymCooldown = 0;
  let poolHealTick = 0;
  let skateAirToastCooldown = 0;
  let wasAirborneOverSkatepark = false;
  let skatePeakY = 0;

  const coastHillsRoot = new THREE.Group();
  coastHillsRoot.name = 'MapCoastHillsRoot';

  const aabbs = [];
  const roadNodes = [];
  const roadEdges = [];
  const minimapPolys = [];
  const minimapBlips = [];

  // Dynamic visual references updated per frame
  const canalWaterUniforms = {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(-0.62, 0.58, -0.35).normalize() },
    uDeepColor: { value: new THREE.Color(0x0b5563) },
    uShallowColor: { value: new THREE.Color(0x1eb8b0) },
    uSkyColor: { value: new THREE.Color(0x7cc0f0) },
    uNightMix: { value: 0.0 },
  };

  const infinityPoolUniforms = {
    uTime: { value: 0 },
    uNightMix: { value: 0.0 },
  };

  let dynamicPropsInst = null;
  const dynamicPropEntries = []; // { type: 'fan' | 'barbell', x, y, z, rx, ry, rz, sx, sy, sz, phase }
  let vinewoodSpotMat = null;
  let signageAtlasMat = null;
  let tunnelPointLightA = null;
  let tunnelPointLightB = null;
  let lastWeatherKey = '';

  function addAABB(minX, maxX, minZ, maxZ, maxY, minY = 0, tag = 'coast_hills_solid') {
    if (maxX <= minX || maxZ <= minZ) return null;
    const box = {
      minX,
      maxX,
      minZ,
      maxZ,
      maxY,
      minY,
      tag,
      enabled: true,
      _stamp: 0,
    };
    aabbs.push(box);
    return box;
  }

  // Infer currentY when callers pass 2 arguments (getGroundHeight(x, z))
  function inferRefY(x, z, explicitY) {
    if (typeof explicitY === 'number' && Number.isFinite(explicitY)) {
      return explicitY;
    }
    const p = activeCtx?.player;
    if (p && Number.isFinite(p.x) && Number.isFinite(p.z) && Number.isFinite(p.y)) {
      const pCar = p.inCar && typeof p.inCar === 'object' ? p.inCar : null;
      if (pCar && Number.isFinite(pCar.x) && Number.isFinite(pCar.y)) {
        if (Math.abs(x - pCar.x) <= 5.5 && Math.abs(z - pCar.z) <= 5.5) return pCar.y;
      } else if (Math.abs(x - p.x) <= 3.8 && Math.abs(z - p.z) <= 3.8) {
        return p.y;
      }
    }
    const vList = activeCtx?.vehicles?.list;
    if (Array.isArray(vList)) {
      let bestD2 = 25.0;
      let matchedY = undefined;
      for (let i = 0; i < vList.length; i++) {
        const v = vList[i];
        if (!v || !Number.isFinite(v.x) || !Number.isFinite(v.y)) continue;
        const dx = x - v.x;
        const dz = z - v.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < bestD2) {
          bestD2 = d2;
          matchedY = v.y;
        }
      }
      if (matchedY !== undefined) return matchedY;
    }
    return undefined;
  }

  // ==========================================================================
  // Public Multi-Elevation & Ceiling Queries (`getElevation` & `getCeilingHeight`)
  // ==========================================================================

  function isInsideTunnel(x, z, currentY) {
    if (x < TUNNEL_X_MIN || x > TUNNEL_X_MAX || z < TUNNEL_Z_MIN || z > TUNNEL_Z_MAX) {
      return false;
    }
    const cy = inferRefY(x, z, currentY);
    return cy === undefined || cy < 6.8;
  }

  function getCeilingHeight(x, z, currentY) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    if (x >= TUNNEL_X_MIN && x <= TUNNEL_X_MAX && z >= TUNNEL_Z_MIN && z <= TUNNEL_Z_MAX) {
      const cy = inferRefY(x, z, currentY);
      if (cy === undefined || cy < 7.6) {
        return TUNNEL_CEIL_CLEAR_Y; // Exact 7.5m inside Côn Lôn Tiên Sơn Concrete Tunnel!
      }
    }
    return null;
  }

  function getElevation(x, z, currentY) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;

    const cy = inferRefY(x, z, currentY);

    // 1. CRITICAL MULTI-ELEVATION VINEWOOD CONCRETE TUNNEL (`X in [110, 130], Z in [-375, -212]`)
    if (x >= TUNNEL_X_MIN && x <= TUNNEL_X_MAX && z >= TUNNEL_Z_MIN && z <= TUNNEL_Z_MAX) {
      if (cy === undefined || cy < 6.8) {
        // Inside the hollow highway tunnel bore -> return tunnel asphalt floor 0.04m!
        // (Raised safety curb at far outer 1.0m edges `|x - 120| > 8.8` is 0.22m; 17.6m wide 4-lane road is pure 0.04m!)
        if (Math.abs(x - 120.0) > 8.8) return 0.22;
        return TUNNEL_FLOOR_Y;
      }
      // Driving on top of Côn Lôn Tiên Sơn Mountain ABOVE the tunnel (`currentY >= 6.8m`):
      const tougeAbove = queryTougeRoadProximity(x, z, TOUGE_HALF_W + 0.6);
      if (tougeAbove && Math.abs(tougeAbove.signedLat) <= TOUGE_HALF_W + 0.4) {
        return tougeAbove.y;
      }
      return evalSculptedHillHeight(x, z);
    }

    // Smooth South Tunnel Portal Approach (`X in [111.5, 128.5], Z in [-225, -212)`)
    if (x >= 111.5 && x <= 128.5 && z >= -225.0 && z < TUNNEL_Z_MAX) {
      if (cy === undefined || cy < 3.2) {
        return lerp(0.02, TUNNEL_FLOOR_Y, smoothstep(-225.0, -212.0, z));
      }
    }

    // 2. VESPUCCI CANALS & 3 ARCHED DRIVABLE BRIDGES (`X in [-205, -132], Z in [-235, -130]`)
    if (x >= -208.0 && x <= -130.0 && z >= -235.0 && z <= -130.0) {
      const canalY = sampleVespucciCanalsElevation(x, z, cy);
      if (canalY !== null) return canalY;
    }

    // 3. VESPUCCI BEACH CONCRETE SKATEPARK & +3.4M HALFPIPE (`X in [-176, -142], Z in [+34, +70]`)
    if (x >= -176.5 && x <= -141.5 && z >= 33.5 && z <= 70.5) {
      return evalSkateparkHeight(x, z);
    }

    // 4. PACIFIC BEACH LIFEGUARD TOWERS, MUSCLE SANDS GYM & BRICK PROMENADE (`X in [-205, -128], Z in [-126, +210]`)
    if (x >= -205.0 && x <= -128.0 && z >= -126.0 && z <= 210.0) {
      const lgY = sampleLifeguardTowerElevation(x, z);
      if (lgY !== null) return lgY;
      const gymY = sampleMuscleSandsGymElevation(x, z);
      if (gymY !== null) return gymY;
      const promY = sampleCoastalPromenadeElevation(x, z);
      if (promY !== null) return promY;
    }

    // 5. VINEWOOD HILLS, MOUNTAIN TOUGE DRIFT ROAD & 4 CANTILEVER STILT MANSIONS (`X in [-132, +265], Z in [-435, -208]`)
    if (x >= -132.0 && x <= 265.0 && z >= -435.0 && z <= -208.0) {
      // A) 4 Cantilever Stilt Mansions & Infinity Pools
      const mansionY = sampleMansionDeckElevation(x, z);
      if (mansionY !== null) {
        if (cy === undefined || cy >= mansionY - 8.5) return mansionY;
      }

      // B) Winding 12m Mountain Touge Drift Road
      const tougeHit = queryTougeRoadProximity(x, z, TOUGE_HALF_W + 0.65);
      if (tougeHit && Math.abs(tougeHit.signedLat) <= TOUGE_HALF_W + 0.45) {
        if (tougeHit.y < 4.5 || cy === undefined || cy >= tougeHit.y - 8.0) {
          return tougeHit.y;
        }
      }

      // C) Respect Galileo Observatory (`world_infra.js`: X in [24, 114], Z in [-261, -208])
      if (x >= 24.0 && x <= 114.0 && z >= -261.0 && z <= -208.0) {
        return null;
      }

      // D) Sculpted Côn Lôn Tiên Sơn Mountain Terrain (`Z < -225`)
      if (z < -225.0) {
        return evalSculptedHillHeight(x, z);
      }
    }

    return null;
  }

  function getZoneInfo(x, z) {
    const pY = activeCtx?.player?.y ?? 0;
    if (x >= TUNNEL_X_MIN && x <= TUNNEL_X_MAX && z >= TUNNEL_Z_MIN && z <= TUNNEL_Z_MAX && pY < 6.8) {
      return { streetName: 'Hầm Xuyên Đồi Côn Lôn Tiên Sơn (Route 120)', zoneName: 'Hầm Đường Bộ Xuyên Núi' };
    }
    if (x >= -206 && x <= -132 && z >= -235 && z <= -130) {
      return { streetName: 'Kênh Đào & Cầu Đá Bích Thủy Kênh', zoneName: 'Khu Kênh Đào Bích Thủy Kênh Canals' };
    }
    if (x >= -177 && x <= -141 && z >= 33 && z <= 71) {
      return { streetName: 'Lòng Chảo Halfpipe 3.4m', zoneName: 'Công Viên Skatepark Bích Thủy Kênh Beach' };
    }
    if (x >= -161 && x <= -135 && z >= -62 && z <= -34) {
      return { streetName: 'Muscle Sands Weight Pen', zoneName: 'Phòng Tập Thể Hình Bãi Biển' };
    }
    for (let i = 0; i < STILT_MANSIONS.length; i++) {
      const m = STILT_MANSIONS[i];
      if (Math.abs(x - m.x) <= 18 && Math.abs(z - m.z) <= 20) {
        return { streetName: m.name, zoneName: 'Quần Thể Biệt Thự Đồi Côn Lôn Tiên Sơn' };
      }
    }
    if (z < -220 && x >= -130 && x <= 260) {
      const th = queryTougeRoadProximity(x, z, 9.0);
      if (th) {
        return { streetName: 'Đường Đèo Drift Mulholland Touge', zoneName: 'Đồi Côn Lôn Tiên Sơn & Hồ Bơi Vô Cực' };
      }
    }
    return null;
  }

  // ==========================================================================
  // Build Road Graph Nodes/Edges & Minimap Polygons/Blips
  // ==========================================================================

  function buildNavigationAndMinimapData() {
    roadNodes.length = 0;
    roadEdges.length = 0;
    minimapPolys.length = 0;
    minimapBlips.length = 0;

    function addRNode(x, y, z, width = 12, tag = 'coast_hills') {
      const id = roadNodes.length;
      const node = {
        id,
        index: id,
        x,
        y,
        z,
        roadWidth: width,
        isBoulevard: width >= 18,
        tag,
        neighbors: [],
        neighborIds: [],
        edges: [],
      };
      roadNodes.push(node);
      return node;
    }

    function connectRNodes(a, b, width = 12, extra = {}) {
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const lanes = width >= 16 ? 4 : 2;
      const eAB = {
        from: a.id, to: b.id, a, b,
        x1: a.x, z1: a.z, y1: a.y,
        x2: b.x, z2: b.z, y2: b.y,
        length: len, width, lanes, ...extra,
      };
      const eBA = {
        from: b.id, to: a.id, a: b, b: a,
        x1: b.x, z1: b.z, y1: b.y,
        x2: a.x, z2: a.z, y2: a.y,
        length: len, width, lanes, ...extra,
      };
      roadEdges.push(eAB, eBA);
      a.neighbors.push(b);
      a.neighborIds.push(b.id);
      a.edges.push(eAB);
      b.neighbors.push(a);
      b.neighborIds.push(a.id);
      b.edges.push(eBA);
    }

    // 1. Côn Lôn Tiên Sơn Concrete Tunnel Highway Route (`X = 120, Z: -200 -> -385`)
    const nCity120 = addRNode(120.0, 0.02, -200.0, 16, 'city_anchor');
    const nTunSouth = addRNode(120.0, 0.04, -212.0, 16, 'tunnel_portal_s');
    const nTunMidS = addRNode(120.0, 0.04, -266.0, 16, 'tunnel_bore');
    const nTunMidN = addRNode(120.0, 0.04, -322.0, 16, 'tunnel_bore');
    const nTunNorth = addRNode(120.0, 0.04, -375.0, 16, 'tunnel_portal_n');
    connectRNodes(nCity120, nTunSouth, 16, { isTunnelApproach: true });
    connectRNodes(nTunSouth, nTunMidS, 16, { isTunnel: true });
    connectRNodes(nTunMidS, nTunMidN, 16, { isTunnel: true });
    connectRNodes(nTunMidN, nTunNorth, 16, { isTunnel: true });

    // 2. Mountain Touge Drift Road Chain from `nTunNorth` -> West Boulevard `(-120, -200)`
    let prevTouge = nTunNorth;
    for (let i = 4; i < TOUGE_NODES.length; i += 6) {
      const pt = TOUGE_NODES[i];
      const cur = addRNode(pt.x, pt.y, pt.z, 12, 'touge_road');
      connectRNodes(prevTouge, cur, 12, { isTouge: true });
      prevTouge = cur;
    }
    const lastT = TOUGE_NODES[TOUGE_NODES.length - 1];
    const nWestExit = addRNode(lastT.x, lastT.y, lastT.z, 12, 'touge_west_exit');
    const nCityWest = addRNode(-120.0, 0.02, -200.0, 16, 'city_anchor');
    connectRNodes(prevTouge, nWestExit, 12, { isTouge: true });
    connectRNodes(nWestExit, nCityWest, 16, { isTougeApproach: true });

    // 3. Bích Thủy Kênh Canals Bridge Loop connecting to `(-120, -200)` & `(-120, -120)`
    const nCanalEntryE = addRNode(-120.0, 0.02, -182.0, 12, 'canal_ave_link');
    const nCanalIsland = addRNode(-160.0, 0.62, -182.0, 10, 'canal_island');
    const nCanalWest = addRNode(-190.0, 0.62, -182.0, 10, 'canal_west');
    const nCanalSouth = addRNode(-160.0, 0.24, -128.0, 10, 'canal_south');
    const nCityWest120 = addRNode(-120.0, 0.02, -120.0, 16, 'city_anchor');
    connectRNodes(nCityWest, nCanalEntryE, 16);
    connectRNodes(nCanalEntryE, nCityWest120, 16);
    connectRNodes(nCanalEntryE, nCanalIsland, 10, { isCanalBridge: true });
    connectRNodes(nCanalIsland, nCanalWest, 10, { isCanalBridge: true });
    connectRNodes(nCanalIsland, nCanalSouth, 10, { isCanalBridge: true });
    connectRNodes(nCanalSouth, nCityWest120, 10);

    // 4. Minimap Vector Polygons & Polylines
    const addRectPoly = (minX, maxX, minZ, maxZ, color, kind = 'area', stroke = null) => {
      const pts = [
        [minX, minZ],
        [maxX, minZ],
        [maxX, maxZ],
        [minX, maxZ],
      ];
      minimapPolys.push({
        type: 'poly',
        kind,
        color,
        fill: color,
        stroke,
        minX,
        maxX,
        minZ,
        maxZ,
        points: pts,
        pts: pts.map(([px, pz]) => ({ x: px, z: pz })),
      });
    };

    // Extended North Côn Lôn Tiên Sơn Hills landmass
    addRectPoly(-210, 265, -432, -225, '#253229', 'terrain');
    // Bích Thủy Kênh Canals Land Basin & Blue Waterways
    addRectPoly(-202, -132, -233, -132, '#4a453c', 'land');
    addRectPoly(-206, -176, -193, -171, '#15748f', 'water', '#38bdf8');
    addRectPoly(-184, -166, -226, -138, '#15748f', 'water', '#38bdf8');
    addRectPoly(-154, -140, -226, -138, '#15748f', 'water', '#38bdf8');
    addRectPoly(-184, -140, -226, -212, '#15748f', 'water', '#38bdf8');
    addRectPoly(-184, -140, -152, -138, '#15748f', 'water', '#38bdf8');
    // 3 Canal Arched Bridges
    addRectPoly(-158, -132, -187, -177, '#8d7b68', 'bridge', '#fde68a');
    addRectPoly(-188, -162, -187, -177, '#8d7b68', 'bridge', '#fde68a');
    addRectPoly(-165, -155, -156, -130, '#8d7b68', 'bridge', '#fde68a');
    // Brick Coastal Promenade, Muscle Sands Gym & Skatepark Halfpipe
    addRectPoly(-134, -128, -125, 190, '#7c4333', 'promenade');
    addRectPoly(-160, -136, -61, -35, '#475569', 'gym', '#f59e0b');
    addRectPoly(-176, -142, 34, 70, '#94a3b8', 'skatepark', '#38bdf8');
    // 4 Cantilever Stilt Mansions + Cyan Infinity Pools
    for (const m of STILT_MANSIONS) {
      addRectPoly(m.x - 12, m.x + 12, m.z - 12, m.z + 4, '#cbd5e1', 'mansion', '#475569');
      addRectPoly(m.x - 6.5, m.x + 6.5, m.z + 4, m.z + 11.2, '#06b6d4', 'pool', '#67e8f9');
    }

    // Dashed Côn Lôn Tiên Sơn Tunnel Bore Polyline
    const tunnelPts = [[120, -200], [120, -212], [120, -375], [120, -385]];
    minimapPolys.push({
      type: 'polyline',
      kind: 'tunnel',
      color: '#eab308',
      stroke: '#eab308',
      width: 14,
      lineWidth: 6,
      dashed: true,
      points: tunnelPts,
      pts: tunnelPts.map(([px, pz]) => ({ x: px, z: pz })),
    });

    // Winding Mountain Touge Drift Road Polyline
    const tougePts = [];
    for (let i = 0; i < TOUGE_NODES.length; i += 3) {
      tougePts.push([TOUGE_NODES[i].x, TOUGE_NODES[i].z]);
    }
    const lastNode = TOUGE_NODES[TOUGE_NODES.length - 1];
    tougePts.push([lastNode.x, lastNode.z]);
    minimapPolys.push({
      type: 'polyline',
      kind: 'road',
      color: '#64748b',
      stroke: '#64748b',
      width: 12,
      lineWidth: 8,
      dashed: false,
      points: tougePts,
      pts: tougePts.map(([px, pz]) => ({ x: px, z: pz })),
    });

    // 5. Minimap Radar Blips
    minimapBlips.push(
      { id: 'vespucci_canals', x: -168, y: 0.6, z: -182, label: 'Kênh Đào Bích Thủy Kênh Canals', name: 'Kênh Đào Bích Thủy Kênh', icon: '🛶', color: '#38bdf8', stroke: '#ffffff', shape: 'circle', radius: 4.6 },
      { id: 'del_perro_arch', x: -130, y: 3.8, z: -5, label: 'Cổng Neon Cầu Cảng Bồng Lai Tiên Đảo', name: 'Bồng Lai Tiên Đảo Pier', icon: '🎡', color: '#ff55d8', stroke: '#fde047', shape: 'circle', radius: 4.5 },
      { id: 'muscle_sands_gym', x: -148, y: 0.28, z: -48, label: 'Phòng Tập Bãi Biển Muscle Sands', name: 'Muscle Sands Gym', icon: '💪', color: '#f59e0b', stroke: '#ffffff', shape: 'circle', radius: 4.4 },
      { id: 'vespucci_skatepark', x: -159, y: 0.35, z: 52, label: 'Công Viên Skatepark & Halfpipe 3.4m', name: 'Skatepark Halfpipe', icon: '🛹', color: '#22c55e', stroke: '#ffffff', shape: 'circle', radius: 4.8 },
      { id: 'vinewood_tunnel', x: 120, y: 0.04, z: -294, label: 'Hầm Chui Xuyên Đồi Côn Lôn Tiên Sơn', name: 'Hầm Xuyên Núi Côn Lôn Tiên Sơn', icon: '🚇', color: '#eab308', stroke: '#0f172a', shape: 'rect', radius: 4.8 },
      { id: 'vinewood_mansion_apex', x: -10, y: 30.0, z: -315, label: 'Biệt Thự Chân Cầu Hồ Bơi Vô Cực (Tây)', name: 'Biệt Thự Hồ Bơi Vô Cực', icon: '🏡', color: '#a855f7', stroke: '#67e8f9', shape: 'diamond', radius: 4.6 },
      { id: 'vinewood_mansion_peak', x: 225, y: 32.0, z: -310, label: 'Biệt Thự Chân Cầu Hồ Bơi Vô Cực (Đông)', name: 'Biệt Thự Eclipse Ridge', icon: '🏡', color: '#a855f7', stroke: '#67e8f9', shape: 'diamond', radius: 4.6 }
    );
  }

  // ==========================================================================
  // Sculpt Existing In-Memory `world.js` Beach & Hill Meshes cleanly on `init`
  // so Canal Water (-0.15m) & Hollow Tunnel Portals (0.04m..7.8m) have 0 z-fighting!
  // ==========================================================================

  function sculptExistingWorldTerrainMeshes() {
    const worldRoot = activeCtx?.world?.root;
    if (!worldRoot || typeof worldRoot.traverse !== 'function') return;

    const cLow = new THREE.Color(0x526b38);
    const cMid = new THREE.Color(0x6e7845);
    const cRock = new THREE.Color(0x7c7468);
    const cPeak = new THREE.Color(0x8e836b);
    const tmpC = new THREE.Color();

    worldRoot.traverse((obj) => {
      if (!obj || !obj.isMesh || !obj.geometry?.attributes?.position) return;
      const geo = obj.geometry;
      const pos = geo.attributes.position;
      if (pos.count < 1200 || pos.count > 6000) return;

      // Check bounding range of first & middle vertices to identify `beachMesh` (3653 verts) & `hillMesh` (4033 verts)
      const x0 = pos.getX(0);
      const z0 = pos.getZ(0);

      // 1) `beachMesh` (`42x84` -> 3653 verts, X in [-255, -128], Z in [-255, +255], no vertexColors)
      if (!geo.attributes.color && x0 < -240 && Math.abs(z0) > 240) {
        let modified = false;
        for (let i = 0; i < pos.count; i++) {
          const wx = pos.getX(i);
          const wz = pos.getZ(i);
          // Carve Bích Thủy Kênh Canals Basin so yellow beach sand drops smoothly below -0.15m canal water!
          if (wx >= -210 && wx <= -132 && wz >= -236 && wz <= -131) {
            if (isInsideCanalWater(wx, wz) ||
                isInsideCanalWater(wx - 3.0, wz) ||
                isInsideCanalWater(wx + 3.0, wz) ||
                isInsideCanalWater(wx, wz - 3.0) ||
                isInsideCanalWater(wx, wz + 3.0)) {
              pos.setY(i, CANAL_BED_Y);
              modified = true;
            }
          }
          // Carve sunken Skatepark Bowl floor so beach sand never pokes through the -0.32m halfpipe flat!
          if (wx >= -176 && wx <= -142 && wz >= 34 && wz <= 70) {
            const skY = evalSkateparkHeight(wx, wz);
            if (skY !== null && pos.getY(i) > skY - 0.12) {
              pos.setY(i, skY - 0.18);
              modified = true;
            }
          }
        }
        if (modified) {
          pos.needsUpdate = true;
          geo.computeVertexNormals();
          geo.computeBoundingSphere();
        }
      }

      // 2) `hillMesh` (`92x42` -> 4033 verts, Z in [-395, -225], has vertexColors)
      if (geo.attributes.color && z0 < -220 && pos.count >= 3800 && pos.count <= 4200) {
        const colAttr = geo.attributes.color;
        for (let i = 0; i < pos.count; i++) {
          const wx = pos.getX(i);
          const wz = pos.getZ(i);
          const wy = evalSculptedHillHeight(wx, wz);
          pos.setY(i, wy);

          if (wy < 22) tmpC.copy(cLow).lerp(cMid, clamp(wy / 22, 0, 1));
          else if (wy < 58) tmpC.copy(cMid).lerp(cRock, clamp((wy - 22) / 36, 0, 1));
          else tmpC.copy(cRock).lerp(cPeak, clamp((wy - 58) / 34, 0, 1));
          colAttr.setXYZ(i, tmpC.r, tmpC.g, tmpC.b);
        }
        pos.needsUpdate = true;
        colAttr.needsUpdate = true;
        geo.computeVertexNormals();
        geo.computeBoundingSphere();
      }
    });
  }

  // ==========================================================================
  // Master 3D Geometry Construction (< 22 Draw Calls Strictly!)
  // ==========================================================================

  function buildAllDistrictGeometry(scene) {
    const tex = createCoastHillsTextures();
    const envMap = scene?.environment ? null : activeCtx?.engine?.envMap || null;

    // Shared PBR & GLSL Materials
    const mats = {
      concrete: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.72,
        metalness: 0.08,
        envMap,
      }),
      asphalt: new THREE.MeshStandardMaterial({
        map: tex.asphaltTouge,
        roughness: 0.68,
        metalness: 0.10,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
        envMap,
      }),
      skateConcrete: new THREE.MeshStandardMaterial({
        map: tex.skateConcrete,
        roughness: 0.48,
        metalness: 0.12,
        envMap,
      }),
      wood: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.66,
        metalness: 0.06,
        envMap,
      }),
      brickPromenade: new THREE.MeshStandardMaterial({
        map: tex.brickPromenade,
        roughness: 0.80,
        metalness: 0.04,
      }),
      tunnelTile: new THREE.MeshStandardMaterial({
        map: tex.tunnelTile,
        roughness: 0.42,
        metalness: 0.14,
        side: THREE.DoubleSide,
      }),
      metal: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.28,
        metalness: 0.84,
        envMap,
      }),
      signage: new THREE.MeshStandardMaterial({
        map: tex.signageAtlas,
        emissive: new THREE.Color(0xfff4df),
        emissiveMap: tex.signageAtlas,
        emissiveIntensity: 0.42,
        roughness: 0.34,
      }),
      emissive: new THREE.MeshStandardMaterial({
        vertexColors: true,
        emissive: new THREE.Color(0xfff1d6),
        emissiveIntensity: 0.38,
        roughness: 0.35,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0x8cd6f7,
        metalness: 0.14,
        roughness: 0.07,
        transparent: true,
        opacity: 0.44,
        side: THREE.DoubleSide,
        envMap,
      }),
      vinewoodBeam: new THREE.MeshBasicMaterial({
        color: 0xfff6d6,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      barnacleWood: new THREE.MeshStandardMaterial({
        map: tex.barnacleTimber,
        roughness: 0.88,
        metalness: 0.04,
      }),
    };

    vinewoodSpotMat = mats.vinewoodBeam;
    signageAtlasMat = mats.signage;

    // Custom GLSL Shader #1: Animated Venetian Canal Water (`y = -0.15m`)
    // Pure branchless GLSL — 0 HLSL/D3D11 or SwiftShader warnings!
    const canalWaterMat = new THREE.ShaderMaterial({
      uniforms: canalWaterUniforms,
      transparent: true,
      side: THREE.FrontSide,
      vertexShader: /* glsl */ `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec2 vUv;

        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          float ripple =
            sin(wp.x * 0.45 + wp.z * 0.25 + uTime * 1.85) * 0.022 +
            cos(wp.x * 0.28 - wp.z * 0.52 - uTime * 1.45) * 0.016;
          wp.y += ripple;
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uSunDir;
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uSkyColor;
        uniform float uNightMix;
        varying vec3 vWorldPos;
        varying vec2 vUv;

        void main() {
          float n1 = sin(vWorldPos.x * 2.4 + vWorldPos.z * 1.7 + uTime * 2.6) * 0.055;
          float n2 = cos(vWorldPos.x * 1.9 - vWorldPos.z * 2.8 - uTime * 2.1) * 0.055;
          vec3 N = normalize(vec3(n1, 1.0, n2));
          vec3 V = normalize(cameraPosition - vWorldPos);

          float causticA = sin(vWorldPos.x * 1.35 + uTime * 1.9) * cos(vWorldPos.z * 1.35 - uTime * 1.6);
          float causticB = sin((vWorldPos.x + vWorldPos.z) * 1.9 - uTime * 2.3);
          float caustic = clamp((causticA + causticB) * 0.28 + 0.5, 0.0, 1.0);

          vec3 baseCol = mix(uDeepColor, uShallowColor, caustic * 0.65);
          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.6);
          baseCol = mix(baseCol, uSkyColor, clamp(fresnel * 0.62, 0.05, 0.68));

          float edgeU = min(vUv.x, 1.0 - vUv.x);
          float edgeV = min(vUv.y, 1.0 - vUv.y);
          float wallEdge = 1.0 - smoothstep(0.0, 0.065, min(edgeU, edgeV));
          float lapWave = 0.5 + 0.5 * sin(vWorldPos.x * 1.8 + vWorldPos.z * 1.8 + uTime * 3.4);
          float foam = clamp(wallEdge * lapWave * 0.58, 0.0, 0.65);
          baseCol = mix(baseCol, vec3(0.90, 0.96, 0.98), foam);

          vec3 H = normalize(uSunDir + V);
          float spec = pow(max(dot(N, H), 0.0), 140.0) * 1.55;
          baseCol += vec3(1.0, 0.95, 0.84) * spec * (1.0 - uNightMix * 0.55);

          float lanternShimmer = sin(vWorldPos.z * 0.9 + n1 * 12.0) * 0.5 + 0.5;
          baseCol += vec3(1.0, 0.72, 0.32) * (uNightMix * 0.22 * lanternShimmer * (0.4 + fresnel));

          gl_FragColor = vec4(baseCol, 0.88);
        }
      `,
    });

    // Custom GLSL Shader #2: Glowing Turquoise Infinity Pool Shader (4 Cliffside Mansions!)
    const infinityPoolMat = new THREE.ShaderMaterial({
      uniforms: infinityPoolUniforms,
      transparent: true,
      side: THREE.FrontSide,
      vertexShader: /* glsl */ `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec2 vUv;

        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          wp.y += sin(wp.x * 1.6 + uTime * 2.4) * cos(wp.z * 1.6 - uTime * 2.0) * 0.012;
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uNightMix;
        varying vec3 vWorldPos;
        varying vec2 vUv;

        void main() {
          float c1 = sin(vWorldPos.x * 3.1 + uTime * 2.5) * sin(vWorldPos.z * 3.1 - uTime * 2.1);
          float c2 = cos((vWorldPos.x - vWorldPos.z) * 4.2 + uTime * 3.1);
          float caustic = smoothstep(0.15, 0.95, (c1 + c2) * 0.35 + 0.55);

          vec3 poolDeep = vec3(0.02, 0.52, 0.68);
          vec3 poolGlow = vec3(0.18, 0.92, 0.98);
          vec3 col = mix(poolDeep, poolGlow, 0.42 + caustic * 0.48);

          float rimDist = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
          float ledRim = 1.0 - smoothstep(0.0, 0.08, rimDist);
          col += vec3(0.18, 0.72, 0.80) * ledRim * (0.14 + uNightMix * 0.28);
          col += vec3(0.05, 0.34, 0.42) * uNightMix * 0.20;

          // Sparkling vanishing-edge crest on South cliff lip (vUv.y near 1.0)
          float infinityLip = smoothstep(0.88, 1.0, vUv.y);
          col = mix(col, vec3(0.88, 0.99, 1.0), infinityLip * 0.55);

          gl_FragColor = vec4(col, 0.86);
        }
      `,
    });

    // Static geometry bucket collector
    const buckets = new Map();
    function addGeo(key, mat, geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, color = null, castShadow = true, receiveShadow = true) {
      let b = buckets.get(key);
      if (!b) {
        b = { mat, items: [], castShadow: false, receiveShadow: false };
        buckets.set(key, b);
      }
      if (castShadow) b.castShadow = true;
      if (receiveShadow) b.receiveShadow = true;
      b.items.push({
        geo,
        matrix: makeMat4(x, y, z, rx, ry, rz, sx, sy, sz),
        color,
      });
    }

    function addStrut(key, mat, geo, x1, y1, z1, x2, y2, z2, tx = 0.2, tz = 0.2, color = null, castShadow = false) {
      let b = buckets.get(key);
      if (!b) {
        b = { mat, items: [], castShadow: false, receiveShadow: true };
        buckets.set(key, b);
      }
      if (castShadow) b.castShadow = true;
      b.items.push({
        geo,
        matrix: makeStrutMat4(x1, y1, z1, x2, y2, z2, tx, tz),
        color,
      });
    }

    // Shared unit primitives
    const uBox = new THREE.BoxGeometry(1, 1, 1);
    const uCyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
    const uCone = new THREE.ConeGeometry(0.5, 1, 10);
    const uSphere = new THREE.SphereGeometry(0.5, 10, 8);
    const uTorus = new THREE.TorusGeometry(0.5, 0.12, 8, 20);

    // Instance transform arrays for our batched InstancedMeshes (< 22 draw calls!)
    const pilingInstances = [];        // Under-pier vertical + diagonal cross-bracing + canal mooring piles
    const stiltGuardInstances = [];    // Mansion concrete stilts + Touge W-beam guardrails + canal bollards
    const lightFixtureInstances = [];  // Tunnel recessed amber strips + canal festoon bulbs + touge reflectors
    dynamicPropEntries.length = 0;

    // ========================================================================
    // ZONE 1: VESPUCCI CANALS (`X in [-205, -132], Z in [-235, -130]`)
    // ========================================================================
    const canalWaterItems = [];
    {
      // 1A. Canal Water Planes at exact `y = -0.15m`
      const pushCanalWaterPatch = (minX, maxX, minZ, maxZ, segX = 12, segZ = 16) => {
        const g = new THREE.PlaneGeometry(maxX - minX, maxZ - minZ, segX, segZ);
        g.rotateX(-Math.PI * 0.5);
        canalWaterItems.push({
          geo: g,
          matrix: makeMat4((minX + maxX) * 0.5, CANAL_WATER_Y, (minZ + maxZ) * 0.5),
        });
      };
      pushCanalWaterPatch(-208.0, -176.0, -193.0, -171.0, 10, 8); // Ocean Inlet
      pushCanalWaterPatch(-184.0, -166.0, -226.0, -138.0, 8, 24); // West Grand Canal
      pushCanalWaterPatch(-154.0, -140.0, -226.0, -138.0, 6, 24); // East Inner Canal
      pushCanalWaterPatch(-166.0, -154.0, -226.0, -212.0, 6, 6);  // North Cross-Canal
      pushCanalWaterPatch(-166.0, -154.0, -152.0, -138.0, 6, 6);  // South Cross-Canal

      // Dark stone submerged canal bed slab underneath the basin (`y = -1.55m`)
      addGeo('concrete', mats.concrete, uBox, -170.0, CANAL_BED_Y - 0.15, -182.0, 0, 0, 0, 74.0, 0.3, 98.0, 0x293238, false, true);

      // 1B. Stone Canal Seawalls, Quayside Promenades (`y = 0.62m`) & Villa Islands!
      const islandBlocks = [
        // East Quayside Bank (`X in [-140, -132], Z in [-232, -132]`)
        { minX: -140.0, maxX: -132.0, minZ: -232.0, maxZ: -132.0, col: 0xd6cfc2 },
        // North Quayside Bank (`X in [-200, -140], Z in [-233, -226]`)
        { minX: -200.0, maxX: -140.0, minZ: -233.0, maxZ: -226.0, col: 0xd6cfc2 },
        // South Quayside Bank (`X in [-200, -140], Z in [-138, -132]`)
        { minX: -200.0, maxX: -140.0, minZ: -138.0, maxZ: -132.0, col: 0xd6cfc2 },
        // Central Venetian Villa Island (`X in [-166, -154], Z in [-212, -152]`)
        { minX: -166.0, maxX: -154.0, minZ: -212.0, maxZ: -152.0, col: 0xdfd8cb },
        // North-West Oceanfront Villa Peninsula (`X in [-200, -184], Z in [-226, -193]`)
        { minX: -200.0, maxX: -184.0, minZ: -226.0, maxZ: -193.0, col: 0xdfd8cb },
        // South-West Oceanfront Villa Peninsula (`X in [-200, -184], Z in [-171, -138]`)
        { minX: -200.0, maxX: -184.0, minZ: -171.0, maxZ: -138.0, col: 0xdfd8cb },
      ];

      for (let i = 0; i < islandBlocks.length; i++) {
        const b = islandBlocks[i];
        const w = b.maxX - b.minX;
        const d = b.maxZ - b.minZ;
        const cx = (b.minX + b.maxX) * 0.5;
        const cz = (b.minZ + b.maxZ) * 0.5;
        const h = CANAL_QUAY_Y - CANAL_BED_Y;
        // Ashlar stone seawall foundation + travertine coping rim
        addGeo('concrete', mats.concrete, uBox, cx, CANAL_BED_Y + h * 0.5, cz, 0, 0, 0, w, h, d, 0x8d887f, true, true);
        addGeo('concrete', mats.concrete, uBox, cx, CANAL_QUAY_Y - 0.06, cz, 0, 0, 0, w + 0.28, 0.16, d + 0.28, b.col, false, true);
      }

      // Register underwater canal seawall AABBs (`maxY = 0.58m`) so boats/swimmers collide solidly with canal banks
      // while pedestrians/cars walk smoothly across the top at `y = 0.62m`!
      addAABB(-140.15, -139.5, -226.0, -187.5, 0.58, CANAL_BED_Y - 0.3, 'canal_seawall');
      addAABB(-140.15, -139.5, -176.5, -138.0, 0.58, CANAL_BED_Y - 0.3, 'canal_seawall');
      addAABB(-166.2, -165.5, -212.0, -187.5, 0.58, CANAL_BED_Y - 0.3, 'canal_seawall');
      addAABB(-166.2, -165.5, -176.5, -152.0, 0.58, CANAL_BED_Y - 0.3, 'canal_seawall');
      addAABB(-154.5, -153.8, -212.0, -187.5, 0.58, CANAL_BED_Y - 0.3, 'canal_seawall');
      addAABB(-154.5, -153.8, -176.5, -152.0, 0.58, CANAL_BED_Y - 0.3, 'canal_seawall');
      addAABB(-184.5, -183.8, -226.0, -193.0, 0.58, CANAL_BED_Y - 0.3, 'canal_seawall');
      addAABB(-184.5, -183.8, -171.0, -138.0, 0.58, CANAL_BED_Y - 0.3, 'canal_seawall');
      addAABB(-184.0, -140.0, -226.6, -225.8, 0.58, CANAL_BED_Y - 0.3, 'canal_seawall');
      addAABB(-184.0, -165.5, -138.5, -137.8, 0.58, CANAL_BED_Y - 0.3, 'canal_seawall');
      addAABB(-154.5, -140.0, -138.5, -137.8, 0.58, CANAL_BED_Y - 0.3, 'canal_seawall');

      // Boat slips collision boxes (`maxY = 0.28m`) so moored boats don't clip through timber docks
      addAABB(-200.0, -188.0, -195.2, -192.4, 0.28, -1.6, 'canal_boat_slip');
      addAABB(-184.0, -180.5, -204.0, -193.0, 0.28, -1.6, 'canal_boat_slip');
      addAABB(-169.5, -166.0, -170.0, -158.0, 0.28, -1.6, 'canal_boat_slip');
      addAABB(-143.5, -140.0, -204.0, -193.0, 0.28, -1.6, 'canal_boat_slip');

      // Twin Venetian Inlet Breakwater Mole Beacons at Pacific Mouth (`(-204, -194.5)` & `(-204, -169.5)`)
      for (const [mx, mz, lampHex] of [[-203.0, -194.2, 0x4ade80], [-203.0, -169.8, 0xff4545]]) {
        addGeo('concrete', mats.concrete, uCyl, mx, 1.8, mz, 0, 0, 0, 2.2, 4.4, 2.2, 0xf1ede4, true, true);
        addGeo('wood', mats.wood, uCone, mx, 4.45, mz, 0, 0, 0, 2.5, 1.1, 2.5, 0xb85239, true, false);
        addGeo('emissive', mats.emissive, uSphere, mx, 5.15, mz, 0, 0, 0, 0.55, 0.55, 0.55, lampHex, false, false);
        addAABB(mx - 1.15, mx + 1.15, mz - 1.15, mz + 1.15, 5.4, -1.5, 'canal_inlet_beacon');
      }

      // 1C. 5 Pastel Mediterranean Canal Villas (Terracotta Roofs, Arched Windows, Juliet Balconies!)
      const canalVillas = [
        // 2 Villas on Central Venetian Island (North & South of Z=-182 Bridge Plaza!)
        { x: -160.0, z: -199.0, w: 9.2, d: 18.5, h: 9.2, wall: 0xf2c6b6, roof: 0xb84a32 }, // Pastel Coral Pink
        { x: -160.0, z: -165.0, w: 9.2, d: 18.5, h: 8.6, wall: 0xf5dfa8, roof: 0xc25438 }, // Venetian Ochre Cream
        // 2 Villas on West Oceanfront Peninsulas
        { x: -192.0, z: -209.5, w: 10.6, d: 21.0, h: 9.6, wall: 0xd4ece2, roof: 0xb24830 }, // Amalfi Seafoam Mint
        { x: -192.0, z: -155.5, w: 10.6, d: 19.5, h: 8.8, wall: 0xf6d5c9, roof: 0xbf5136 }, // Sunset Peach
        // 1 Corner Canal Cafe Villa on North-East Quay
        { x: -136.0, z: -214.0, w: 6.2, d: 18.0, h: 8.2, wall: 0xf7ebd2, roof: 0xb84a32 }, // Warm Ivory
      ];

      for (let vi = 0; vi < canalVillas.length; vi++) {
        const v = canalVillas[vi];
        const base = CANAL_QUAY_Y;
        // Main pastel stucco body + limestone quoins/cornice
        addGeo('concrete', mats.concrete, uBox, v.x, base + v.h * 0.5, v.z, 0, 0, 0, v.w, v.h, v.d, v.wall, true, true);
        addGeo('concrete', mats.concrete, uBox, v.x, base + v.h + 0.18, v.z, 0, 0, 0, v.w + 0.55, 0.36, v.d + 0.55, 0xf4efe6, true, true);
        // Pitched terracotta Mediterranean hipped/gable roof
        addGeo('wood', mats.wood, uCone, v.x, base + v.h + 1.45, v.z, 0, Math.PI * 0.25, 0, v.w * 0.92, 2.35, v.d * 0.88, v.roof, true, true);

        // Second-story wrought-iron & timber Juliet balconies overlooking the canal + warm glowing windows!
        for (const sideSgn of [-1, 1]) {
          const bx = v.x + sideSgn * (v.w * 0.5 + 0.45);
          for (const zOff of [-v.d * 0.25, v.d * 0.25]) {
            addGeo('concrete', mats.concrete, uBox, bx, base + 4.45, v.z + zOff, 0, 0, 0, 0.95, 0.18, 3.4, 0xf4efe6, true, false);
            addGeo('metal', mats.metal, uBox, bx + sideSgn * 0.42, base + 4.98, v.z + zOff, 0, 0, 0, 0.08, 0.92, 3.4, 0x22262e, false, false);
            // Warm glowing arched window behind balcony
            addGeo('emissive', mats.emissive, uBox, v.x + sideSgn * (v.w * 0.5 + 0.03), base + 5.65, v.z + zOff, 0, 0, 0, 0.05, 2.05, 1.65, 0xffe4ad, false, false);
            addGeo('emissive', mats.emissive, uBox, v.x + sideSgn * (v.w * 0.5 + 0.03), base + 1.85, v.z + zOff, 0, 0, 0, 0.05, 1.95, 1.55, 0xffd996, false, false);
          }
        }
        addAABB(v.x - v.w * 0.5, v.x + v.w * 0.5, v.z - v.d * 0.5, v.z + v.d * 0.5, base + v.h + 2.2, 0, 'canal_villa');
      }

      // 1D. 3 Arched Drivable Venetian Stone Bridges (Peaking smoothly at exact `y = 2.60m`!)
      for (let bi = 0; bi < CANAL_BRIDGES.length; bi++) {
        const br = CANAL_BRIDGES[bi];
        const steps = 18;
        const brNodes = [];
        const width = br.axis === 'x' ? (br.maxZ - br.minZ) : (br.maxX - br.minX);

        for (let s = 0; s <= steps; s++) {
          const u = s / steps;
          const bx = br.axis === 'x' ? lerp(br.minX, br.maxX, u) : (br.minX + br.maxX) * 0.5;
          const bz = br.axis === 'z' ? lerp(br.minZ, br.maxZ, u) : (br.minZ + br.maxZ) * 0.5;
          const by = evalCanalBridgeDeck(br, bx, bz);
          brNodes.push({
            x: bx,
            y: by,
            z: bz,
            s: u * 26.0,
            bank: 0,
            rx: br.axis === 'x' ? 0 : 1,
            rz: br.axis === 'x' ? 1 : 0,
          });

          // Sculpted stone bridge arch soffit segments & classical balustrades along both sides!
          if (s < steps) {
            const uNext = (s + 1) / steps;
            const nx = br.axis === 'x' ? lerp(br.minX, br.maxX, uNext) : bx;
            const nz = br.axis === 'z' ? lerp(br.minZ, br.maxZ, uNext) : bz;
            const ny = evalCanalBridgeDeck(br, nx, nz);
            const mx = (bx + nx) * 0.5;
            const mz = (bz + nz) * 0.5;
            const my = (by + ny) * 0.5;
            const segLen = Math.hypot(nx - bx, nz - bz);
            const pitch = Math.atan2(ny - by, segLen);
            const yaw = br.axis === 'x' ? Math.PI * 0.5 : 0;

            // Stone arch deck thickness
            addGeo('concrete', mats.concrete, uBox, mx, my - 0.24, mz, -pitch, yaw, 0, width + 0.5, 0.44, segLen + 0.12, 0xe5dfd3, true, true);
            // Ornate Venetian stone parapets (left & right of bridge roadway)
            for (const railSide of [-1, 1]) {
              const rx = br.axis === 'x' ? mx : mx + railSide * (width * 0.5 + 0.12);
              const rz = br.axis === 'x' ? mz + railSide * (width * 0.5 + 0.12) : mz;
              addGeo('concrete', mats.concrete, uBox, rx, my + 0.48, rz, -pitch, yaw, 0, 0.34, 0.88, segLen + 0.08, 0xf2ede2, true, false);
            }
          }
        }
        // Paved road surface across the arched bridge
        addGeo('asphalt', mats.asphalt, createRibbonGeo(brNodes, width - 0.6, 12.0, 0.025), 0, 0, 0, 0, 0, 0, 1, 1, 1, null, false, true);

        // Bridge parapet side AABBs (`minY = 1.1m` so boats below never hit bridge rails!)
        if (br.axis === 'x') {
          addAABB(br.minX + 1.0, br.maxX - 1.0, br.minZ - 0.35, br.minZ + 0.25, 3.65, 1.05, 'canal_bridge_rail');
          addAABB(br.minX + 1.0, br.maxX - 1.0, br.maxZ - 0.25, br.maxZ + 0.35, 3.65, 1.05, 'canal_bridge_rail');
        } else {
          addAABB(br.minX - 0.35, br.minX + 0.25, br.minZ + 1.0, br.maxZ - 1.0, 3.65, 1.05, 'canal_bridge_rail');
          addAABB(br.maxX - 0.25, br.maxX + 0.35, br.minZ + 1.0, br.maxZ - 1.0, 3.65, 1.05, 'canal_bridge_rail');
        }
      }

      // 1E. Timber Boat Slips, Striped Venetian Mooring Poles, Canal Bollards & Warm String Lights!
      const boatSlips = [
        { x: -194.0, z: -193.8, w: 12.0, d: 2.8 },
        { x: -182.2, z: -198.5, w: 3.4, d: 11.0 },
        { x: -167.8, z: -164.0, w: 3.4, d: 12.0 },
        { x: -141.8, z: -198.5, w: 3.4, d: 11.0 },
      ];
      for (const sl of boatSlips) {
        addGeo('wood', mats.wood, uBox, sl.x, 0.06, sl.z, 0, 0, 0, sl.w, 0.22, sl.d, 0x7c5436, true, true);
        pilingInstances.push(
          { x: sl.x - sl.w * 0.42, y: -0.6, z: sl.z - sl.d * 0.4, rx: 0, ry: 0, rz: 0, sx: 0.28, sy: 2.2, sz: 0.28 },
          { x: sl.x + sl.w * 0.42, y: -0.6, z: sl.z + sl.d * 0.4, rx: 0, ry: 0, rz: 0, sx: 0.28, sy: 2.2, sz: 0.28 }
        );
      }

      // Cast-iron canal bollards (`stiltGuardInstances`) along quaysides
      for (let bz = -222; bz <= -142; bz += 14) {
        if (Math.abs(bz - (-182)) < 7) continue;
        for (const bx of [-184.4, -165.6, -154.4, -139.6]) {
          stiltGuardInstances.push({
            x: bx, y: CANAL_QUAY_Y + 0.28, z: bz,
            rx: 0, ry: 0, rz: 0, sx: 0.26, sy: 0.56, sz: 0.26,
            color: 0x222730,
          });
        }
      }

      // Overhead Venetian Catenary String Lights across West & East Canals (`lightFixtureInstances`!)
      const stringSpans = [
        [-184.5, -165.5, -206.0],
        [-184.5, -165.5, -194.0],
        [-184.5, -165.5, -168.0],
        [-184.5, -165.5, -156.0],
        [-154.5, -139.5, -204.0],
        [-154.5, -139.5, -162.0],
      ];
      // Support posts on each bank + solid collision AABBs
      for (const [x1, x2, sz] of stringSpans) {
        addGeo('metal', mats.metal, uCyl, x1, CANAL_QUAY_Y + 2.2, sz, 0, 0, 0, 0.10, 4.4, 0.10, 0x262b34, false, false);
        addGeo('metal', mats.metal, uCyl, x2, CANAL_QUAY_Y + 2.2, sz, 0, 0, 0, 0.10, 4.4, 0.10, 0x262b34, false, false);
        addAABB(x1 - 0.16, x1 + 0.16, sz - 0.16, sz + 0.16, CANAL_QUAY_Y + 4.4, CANAL_QUAY_Y, 'canal_light_post');
        addAABB(x2 - 0.16, x2 + 0.16, sz - 0.16, sz + 0.16, CANAL_QUAY_Y + 4.4, CANAL_QUAY_Y, 'canal_light_post');
        addStrut('metal', mats.metal, uCyl, x1, CANAL_QUAY_Y + 4.2, sz, x2, CANAL_QUAY_Y + 4.2, sz, 0.03, 0.03, 0x1e242b, false);
        const bulbs = 7;
        for (let b = 1; b < bulbs; b++) {
          const u = b / bulbs;
          const sag = Math.sin(u * Math.PI) * 0.55;
          lightFixtureInstances.push({
            x: lerp(x1, x2, u),
            y: CANAL_QUAY_Y + 4.2 - sag,
            z: sz,
            rx: 0, ry: 0, rz: 0,
            sx: 0.24, sy: 0.28, sz: 0.24,
            color: b % 2 === 0 ? 0xffd27d : 0xffefba,
          });
        }
      }
    }

    // ========================================================================
    // ZONE 2: DEL PERRO PIER UPGRADE, 3 LIFEGUARD TOWERS, MUSCLE SANDS GYM,
    //         VESPUCCI CONCRETE SKATEPARK (+3.4M HALFPIPE) & BRICK PROMENADE
    // ========================================================================
    {
      // 2A. Bồng Lai Tiên Đảo Pier Upgrade (`Z in [-32, +22]`):
      //     - Dense Barnacle-Weathered Under-Pier Timber Cross-Bracing Pilings (`InstancedMesh`)
      //     - Glowing "DEL PERRO PIER" Entrance Neon Arch at `(-130, 3.8, -5)`
      //     - Nighttime LED Rim Glow & 4 Colorful Boardwalk Food/Hot-Dog/Souvenir Kiosks!
      for (let px = -148; px >= -290; px -= 11) {
        const zList = px > -198 ? [-23, -14, -5, 2] : [-29, -19, -9, 1, 11, 20];
        const topY = px > -152 ? lerp(SIDEWALK_Y, PIER_DECK_Y, clamp((-128 - px) / 24, 0, 1)) - 0.25 : PIER_DECK_Y - 0.28;
        for (let zi = 0; zi < zList.length; zi++) {
          const pz = zList[zi];
          // Barnacle-crusted vertical piling
          pilingInstances.push({
            x: px, y: topY - 3.4, z: pz,
            rx: 0, ry: (px + pz) * 0.2, rz: 0,
            sx: 0.42, sy: 6.8, sz: 0.42,
          });
          // Diagonal X-bracing timber struts between adjacent pilings!
          if (zi < zList.length - 1) {
            const pzNext = zList[zi + 1];
            const midZ = (pz + pzNext) * 0.5;
            const span = pzNext - pz;
            const diagLen = Math.hypot(span, 3.4);
            const tilt = Math.atan2(span, 3.4);
            pilingInstances.push({
              x: px, y: topY - 1.9, z: midZ,
              rx: tilt, ry: 0, rz: 0,
              sx: 0.18, sy: diagLen, sz: 0.18,
            });
            pilingInstances.push({
              x: px, y: topY - 1.9, z: midZ,
              rx: -tilt, ry: 0, rz: 0,
              sx: 0.18, sy: diagLen, sz: 0.18,
            });
          }
        }
      }

      // Simple Clean "DEL PERRO PIER" Entrance Archway centered at `(-130, 3.8, -5)`
      // Columns positioned outside the ramp traffic lane (`z = -15.8` & `z = +5.8`) with warm architectural arch lighting!
      const archX = -130.0;
      const archZ = -5.0;
      for (const sideZ of [-15.8, 5.8]) {
        addGeo('concrete', mats.concrete, uCyl, archX, 4.9, sideZ, 0, 0, 0, 0.72, 9.6, 0.72, 0xf8fafc, true, true);
        addGeo('metal', mats.metal, uCyl, archX + 0.36, 4.9, sideZ, 0, 0, 0, 0.12, 9.2, 0.12, 0x94a3b8, false, false);
        addAABB(archX - 0.48, archX + 0.48, sideZ - 0.48, sideZ + 0.48, 9.8, 0, 'pier_arch_column');
      }
      // Overhead Clean Arch Crown & Double-Sided "DEL PERRO PIER" Sign (`Row 0`)
      addGeo('metal', mats.metal, uBox, archX, 9.85, archZ, 0, 0, 0, 0.85, 2.55, 22.6, 0x1e2430, true, false);
      const pierArchSign = makeAtlasSignGeo(21.4, 2.25, 0, 8, true);
      addGeo('signage', mats.signage, pierArchSign, archX, 9.85, archZ, 0, Math.PI * 0.5, 0, 1, 1, 1, null, false, false);
      addGeo('emissive', mats.emissive, uBox, archX, 11.20, archZ, 0, 0, 0, 0.88, 0.14, 22.8, 0xf3d999, false, false);

      // Subtle Warm Timber-Edge Deck Trim along Bồng Lai Tiên Đảo Pier perimeter (`y = 3.82m`, no garish neon!)
      const pierRimRuns = [
        [-175.0, -25.85, 46.0, 0.14, 0xd8c8a8],
        [-175.0, 3.85, 46.0, 0.14, 0xd8c8a8],
        [-246.5, -31.85, 97.0, 0.16, 0xd8c8a8],
        [-246.5, 21.85, 97.0, 0.16, 0xd8c8a8],
        [-295.05, -5.0, 0.16, 53.8, 0xd8c8a8],
      ];
      for (const [rx, rz, sx, sz, col] of pierRimRuns) {
        addGeo('wood', mats.wood, uBox, rx, PIER_DECK_Y + 0.05, rz, 0, 0, 0, sx, 0.12, sz, col, false, false);
      }

      // 4 Colorful Boardwalk Food / Hot-Dog / Souvenir Kiosks on Pier Deck (`y = 3.80m`)
      const pierKiosks = [
        { x: -165.0, z: -21.2, yaw: 0, signRow: 4, bodyCol: 0xdc2626, awnCol: 0xfacc15, kind: 'hotdog' },
        { x: -183.0, z: -21.2, yaw: 0, signRow: 5, bodyCol: 0x0d9488, awnCol: 0xfb7185, kind: 'gelato' },
        { x: -209.0, z: -26.8, yaw: 0, signRow: 6, bodyCol: 0x2563eb, awnCol: 0xf97316, kind: 'surf' },
        { x: -225.0, z: -26.8, yaw: 0, signRow: 4, bodyCol: 0x16a34a, awnCol: 0xfde047, kind: 'sprunk' },
      ];
      for (const k of pierKiosks) {
        const ky = PIER_DECK_Y;
        // Kiosk cabin + serving counter + striped awning + illuminated fascia sign
        addGeo('wood', mats.wood, uBox, k.x, ky + 1.45, k.z, 0, k.yaw, 0, 5.2, 2.9, 3.4, k.bodyCol, true, true);
        addGeo('concrete', mats.concrete, uBox, k.x, ky + 1.05, k.z + 1.85, 0, k.yaw, 0, 5.4, 0.16, 0.65, 0xf8fafc, true, true);
        addGeo('emissive', mats.emissive, uBox, k.x, ky + 1.72, k.z + 1.72, 0, k.yaw, 0, 4.4, 1.12, 0.06, 0xfff1cc, false, false);
        addGeo('wood', mats.wood, uBox, k.x, ky + 2.65, k.z + 2.15, 0.24, k.yaw, 0, 5.5, 0.14, 1.45, k.awnCol, true, false);
        const kSign = makeAtlasSignGeo(5.0, 0.92, k.signRow, 8, false);
        addGeo('signage', mats.signage, kSign, k.x, ky + 3.42, k.z + 1.76, 0, k.yaw, 0, 1, 1, 1, null, false, false);

        if (k.kind === 'hotdog') {
          // Giant 3D Rooftop Hot-Dog in Bun Sculpture!
          addGeo('wood', mats.wood, uCyl, k.x, ky + 4.25, k.z, 0, 0, Math.PI * 0.5, 0.95, 3.2, 0.85, 0xeab308, true, false);
          addGeo('wood', mats.wood, uCyl, k.x, ky + 4.45, k.z, 0, 0, Math.PI * 0.5, 0.58, 3.8, 0.58, 0xb91c1c, true, false);
        } else if (k.kind === 'gelato') {
          // Giant 3D Rooftop Gelato Swirl Cone!
          addGeo('wood', mats.wood, uCone, k.x, ky + 4.35, k.z, Math.PI, 0, 0.18, 0.95, 1.5, 0.95, 0xd97706, true, false);
          addGeo('concrete', mats.concrete, uSphere, k.x - 0.15, ky + 5.15, k.z, 0, 0, 0, 1.05, 0.95, 1.05, 0xfbcfe8, true, false);
        }
        addAABB(k.x - 2.7, k.x + 2.7, k.z - 1.8, k.z + 2.0, ky + 3.8, ky - 0.2, 'pier_kiosk');
      }

      // 2B. 3 Wooden Red-and-White `Lifeguard Towers` (`(-178, y, -65)`, `(-178, y, +42)`, `(-178, y, +155)`)
      //     Raised on cross-braced stilts, walkable stairs, & surfboards!
      for (let li = 0; li < LIFEGUARD_TOWERS.length; li++) {
        const lt = LIFEGUARD_TOWERS[li];
        const baseSand = getBaseBeachHeight(lt.x, lt.z);
        const deckY = baseSand + 2.15;

        // 4 Stilt Legs + Diagonal Cross-Bracing
        for (const sx of [-1.65, 1.65]) {
          for (const sz of [-1.65, 1.65]) {
            addGeo('wood', mats.wood, uBox, lt.x + sx, baseSand + 1.08, lt.z + sz, 0, 0, 0, 0.24, 2.35, 0.24, 0xf8fafc, true, false);
          }
        }
        addStrut('wood', mats.wood, uBox, lt.x - 1.65, baseSand + 0.2, lt.z - 1.65, lt.x + 1.65, deckY - 0.15, lt.z - 1.65, 0.12, 0.12, 0xdc2626);
        addStrut('wood', mats.wood, uBox, lt.x + 1.65, baseSand + 0.2, lt.z + 1.65, lt.x - 1.65, deckY - 0.15, lt.z + 1.65, 0.12, 0.12, 0xdc2626);

        // Raised Timber Deck (`4.3m x 4.3m`) + Walkable East Staircase (`X: lt.x + 5.2 -> lt.x + 2.0`)
        addGeo('wood', mats.wood, uBox, lt.x, deckY - 0.10, lt.z, 0, 0, 0, 4.3, 0.22, 4.3, 0x8b5a36, true, true);
        for (let st = 0; st < 8; st++) {
          const u = st / 7;
          const sx = lerp(lt.x + 5.1, lt.x + 2.15, u);
          const sy = lerp(baseSand + 0.16, deckY - 0.08, u);
          addGeo('wood', mats.wood, uBox, sx, sy, lt.z, 0, 0, 0, 0.44, 0.14, 1.85, 0x9c6840, true, true);
        }
        addStrut('wood', mats.wood, uBox, lt.x + 5.2, baseSand + 0.85, lt.z - 0.92, lt.x + 2.05, deckY + 0.85, lt.z - 0.92, 0.10, 0.10, 0xf8fafc);
        addStrut('wood', mats.wood, uBox, lt.x + 5.2, baseSand + 0.85, lt.z + 0.92, lt.x + 2.05, deckY + 0.85, lt.z + 0.92, 0.10, 0.10, 0xf8fafc);

        // Crisp White Lifeguard Cabin (offset slightly West so East landing is walkable!) + Signal-Red Pitched Roof & Cross Trim
        const cabX = lt.x - 0.35;
        addGeo('wood', mats.wood, uBox, cabX, deckY + 1.22, lt.z, 0, 0, 0, 2.85, 2.45, 2.85, 0xf8fafc, true, true);
        addGeo('wood', mats.wood, uBox, cabX, deckY + 0.65, lt.z, 0, 0, 0, 2.94, 0.32, 2.94, 0xdc2626, false, false);
        addGeo('glass', mats.glass, uBox, cabX - 1.44, deckY + 1.62, lt.z, 0, 0, 0.12, 0.08, 0.88, 2.35, null, false, false);
        addGeo('wood', mats.wood, uBox, cabX, deckY + 2.58, lt.z, 0, 0, 0.14, 3.85, 0.24, 3.85, 0xdc2626, true, true);
        const lgSign = makeAtlasSignGeo(2.4, 0.52, 7, 8, false);
        addGeo('signage', mats.signage, lgSign, cabX, deckY + 1.95, lt.z + 1.46, 0, 0, 0, 1, 1, 1, null, false, false);

        // 2 Glossy Fiberglass Rescue Surfboards leaning beside each Lifeguard Tower!
        const surfCols = [0xfacc15, 0x06b6d4, 0xef4444];
        addGeo('metal', mats.metal, uSphere, lt.x + 0.8, baseSand + 1.45, lt.z + 2.25, 0.22, 0, -0.15, 0.62, 2.95, 0.12, surfCols[li % 3], true, false);
        addGeo('metal', mats.metal, uSphere, lt.x + 1.45, baseSand + 1.40, lt.z + 2.25, 0.22, 0, -0.15, 0.58, 2.75, 0.12, 0xf97316, true, false);

        // Cabin solid AABB (`minY = deckY` on cabin footprint so East stair landing stays walkable!)
        addAABB(cabX - 1.45, cabX + 1.45, lt.z - 1.45, lt.z + 1.45, deckY + 2.8, deckY, 'lifeguard_cabin');
        addAABB(lt.x - 1.75, lt.x + 1.75, lt.z - 1.75, lt.z + 1.75, deckY - 0.1, -1.0, 'lifeguard_stilts');
      }

      // 2C. `Muscle Sands Outdoor Beach Gym` at `(-148, y, -48)` (`X in [-159.5, -136.5], Z in [-61.0, -35.0]`)
      {
        const gx = -148.0;
        const gz = -48.0;
        const gy = 0.28;

        // Concrete Workout Pad + Charcoal/Blue Rubberized Weightlifting Mats
        addGeo('concrete', mats.concrete, uBox, gx, 0.12, gz, 0, 0, 0, 22.8, 0.32, 25.8, 0xcbd5e1, false, true);
        addGeo('concrete', mats.concrete, uBox, gx, gy + 0.01, gz, 0, 0, 0, 19.6, 0.04, 22.4, 0x1e3a5f, false, true);

        // Open-Air White Steel & Teak Shade Pergola (`y = 4.1m`) + "MUSCLE SANDS GYM" Archway (`Row 2`)
        for (const px of [gx - 8.8, gx, gx + 8.8]) {
          for (const pz of [gz - 9.8, gz + 9.8]) {
            addGeo('metal', mats.metal, uCyl, px, gy + 2.05, pz, 0, 0, 0, 0.26, 4.1, 0.26, 0xf8fafc, true, false);
            addAABB(px - 0.22, px + 0.22, pz - 0.22, pz + 0.22, gy + 4.1, gy, 'gym_pergola_post');
          }
          addGeo('metal', mats.metal, uBox, px, gy + 4.15, gz, 0, 0, 0, 0.24, 0.28, 20.6, 0xf8fafc, true, false);
        }
        for (let slatZ = gz - 9.2; slatZ <= gz + 9.2; slatZ += 1.65) {
          addGeo('wood', mats.wood, uBox, gx, gy + 4.34, slatZ, 0, 0, 0, 18.8, 0.12, 0.34, 0x8b5a36, true, false);
        }
        const gymSign = makeAtlasSignGeo(11.4, 1.35, 2, 8, true);
        addGeo('signage', mats.signage, gymSign, gx + 8.8, gy + 4.85, gz, 0, Math.PI * 0.5, 0, 1, 1, 1, null, false, false);

        // 4 Bench-Press Stations with Loaded Olympic Barbells (`20kg` Blue/Red Plates)
        const benchCoords = [
          [gx - 4.8, gz - 5.2],
          [gx - 4.8, gz + 0.8],
          [gx + 3.6, gz - 5.2],
          [gx + 3.6, gz + 0.8],
        ];
        for (let bi = 0; bi < benchCoords.length; bi++) {
          const [bx, bz] = benchCoords[bi];
          // Padded bench + steel uprights
          addGeo('concrete', mats.concrete, uBox, bx, gy + 0.46, bz, 0, 0, 0, 1.65, 0.14, 0.46, 0x111827, true, true);
          addGeo('metal', mats.metal, uBox, bx - 0.65, gy + 0.23, bz, 0, 0, 0, 0.12, 0.46, 0.42, 0x334155, false, false);
          addGeo('metal', mats.metal, uBox, bx + 0.65, gy + 0.62, bz - 0.42, 0, 0, 0, 0.10, 1.24, 0.10, 0x94a3b8, true, false);
          addGeo('metal', mats.metal, uBox, bx + 0.65, gy + 0.62, bz + 0.42, 0, 0, 0, 0.10, 1.24, 0.10, 0x94a3b8, true, false);
          // Chrome Olympic barbell shaft + weight plates
          addGeo('metal', mats.metal, uCyl, bx + 0.65, gy + 1.15, bz, Math.PI * 0.5, 0, 0, 0.05, 2.25, 0.05, 0xe2e8f0, true, false);
          for (const pSide of [-0.88, -0.78, 0.78, 0.88]) {
            addGeo('metal', mats.metal, uCyl, bx + 0.65, gy + 1.15, bz + pSide, Math.PI * 0.5, 0, 0, 0.46, 0.06, 0.46, Math.abs(pSide) > 0.82 ? 0xef4444 : 0x2563eb, true, false);
          }
          addAABB(bx - 0.9, bx + 0.9, bz - 0.9, bz + 0.9, gy + 1.35, gy, 'gym_bench');
        }

        // Barbell / Dumbbell Rack & Yellow Calisthenics Pull-Up Cage (`(-148, gy, -55.8)`)
        addGeo('metal', mats.metal, uBox, gx - 4.8, gy + 0.65, gz + 6.5, 0, 0, 0, 1.1, 1.2, 4.8, 0x1e293b, true, true);
        addAABB(gx - 5.4, gx - 4.2, gz + 4.1, gz + 8.9, gy + 1.55, gy, 'gym_dumbbell_rack');
        for (let dzOff = -1.8; dzOff <= 1.8; dzOff += 0.72) {
          addGeo('metal', mats.metal, uCyl, gx - 4.8, gy + 1.32, gz + 6.5 + dzOff, 0, 0, Math.PI * 0.5, 0.22, 0.62, 0.22, 0x0f172a, false, false);
        }
        // Pull-Up & Dip Rig
        const rigZ = gz - 7.8;
        for (const rxOff of [-2.8, 0, 2.8]) {
          for (const rzOff of [-0.9, 0.9]) {
            addGeo('metal', mats.metal, uCyl, gx + rxOff, gy + 1.35, rigZ + rzOff, 0, 0, 0, 0.11, 2.7, 0.11, 0xfacc15, true, false);
          }
        }
        addGeo('metal', mats.metal, uCyl, gx, gy + 2.58, rigZ - 0.9, 0, 0, Math.PI * 0.5, 0.07, 5.7, 0.07, 0xe2e8f0, false, false);
        addGeo('metal', mats.metal, uCyl, gx, gy + 2.58, rigZ + 0.9, 0, 0, Math.PI * 0.5, 0.07, 5.7, 0.07, 0xe2e8f0, false, false);
        addAABB(gx - 3.0, gx + 3.0, rigZ - 1.1, rigZ + 1.1, gy + 2.7, gy, 'gym_pullup_rig');

        // 3 Sculpted Flexing Beach Bodybuilder Props + Animated Overhead Pumping Barbells!
        const bodybuilders = [
          { x: gx + 0.2, z: gz + 5.8, yaw: Math.PI * 0.5, tankCol: 0xef4444 },
          { x: gx + 5.8, z: gz + 5.8, yaw: -Math.PI * 0.35, tankCol: 0xfacc15 },
          { x: gx + 0.4, z: gz - 2.2, yaw: Math.PI * 0.5, tankCol: 0x06b6d4 },
        ];
        for (let bi = 0; bi < bodybuilders.length; bi++) {
          const bb = bodybuilders[bi];
          // Muscular tanned legs, gym shorts, V-taper torso, broad deltoids & flexing biceps!
          addGeo('wood', mats.wood, uCyl, bb.x, gy + 0.45, bb.z - 0.16, 0, bb.yaw, 0, 0.19, 0.9, 0.19, 0xb87a52, true, false);
          addGeo('wood', mats.wood, uCyl, bb.x, gy + 0.45, bb.z + 0.16, 0, bb.yaw, 0, 0.19, 0.9, 0.19, 0xb87a52, true, false);
          addGeo('concrete', mats.concrete, uBox, bb.x, gy + 0.92, bb.z, 0, bb.yaw, 0, 0.32, 0.34, 0.48, 0x1e293b, true, false);
          addGeo('concrete', mats.concrete, uBox, bb.x, gy + 1.32, bb.z, 0, bb.yaw, 0, 0.36, 0.56, 0.62, bb.tankCol, true, false);
          addGeo('wood', mats.wood, uSphere, bb.x, gy + 1.76, bb.z, 0, bb.yaw, 0, 0.28, 0.30, 0.28, 0xb87a52, true, false);
          // Raised flexing arms
          addGeo('wood', mats.wood, uCyl, bb.x, gy + 1.56, bb.z - 0.44, 0.55, bb.yaw, 0, 0.16, 0.46, 0.16, 0xb87a52, true, false);
          addGeo('wood', mats.wood, uCyl, bb.x, gy + 1.56, bb.z + 0.44, -0.55, bb.yaw, 0, 0.16, 0.46, 0.16, 0xb87a52, true, false);
          addAABB(bb.x - 0.45, bb.x + 0.45, bb.z - 0.45, bb.z + 0.45, gy + 2.0, gy, 'gym_bodybuilder');

          // Animated overhead barbell pressed up and down in `update(dt)`!
          dynamicPropEntries.push({
            type: 'barbell',
            x: bb.x,
            y: gy + 1.98,
            z: bb.z,
            rx: 0,
            ry: bb.yaw,
            rz: 0,
            sx: 0.42,
            sy: 0.42,
            sz: 1.45,
            phase: bi * 2.1,
          });
        }
      }

      // 2D. `Bích Thủy Kênh Beach Concrete Skatepark & Halfpipe Bowl` (`X in [-176, -142], Z in [+34, +70]`)
      //     Built directly from `evalSkateparkHeight(x, z)` so visual mesh & physics match 100%!
      {
        const skW = 35.0; // [-176.5, -141.5]
        const skD = 37.0; // [33.5, 70.5]
        const skGeo = new THREE.PlaneGeometry(skW, skD, 70, 74);
        skGeo.rotateX(-Math.PI * 0.5);
        const pos = skGeo.attributes.position;
        const uv = skGeo.attributes.uv;
        for (let i = 0; i < pos.count; i++) {
          const wx = pos.getX(i) - 159.0;
          const wz = pos.getZ(i) + 52.0;
          const wy = evalSkateparkHeight(wx, wz) ?? 0.2;
          pos.setXYZ(i, wx, wy, wz);
          uv.setXY(i, (wx + 176.5) / skW, (wz - 33.5) / skD);
        }
        skGeo.computeVertexNormals();
        addGeo('skateConcrete', mats.skateConcrete, skGeo, 0, 0, 0, 0, 0, 0, 1, 1, 1, null, true, true);

        // Brushed-Chrome Steel Coping Rails & Safety Platform Guardrails along the +3.40m Halfpipe Lips!
        for (const lipX of [-172.6, -145.4]) {
          addGeo('metal', mats.metal, uCyl, lipX, 3.42, 46.5, Math.PI * 0.5, 0, 0, 0.14, 17.6, 0.14, 0xe2e8f0, true, false);
        }
        // Central Spine Transfer Steel Coping Pipe (`Z = 57.05, y = 2.30m`)
        addGeo('metal', mats.metal, uCyl, -159.0, 2.30, 57.05, 0, 0, Math.PI * 0.5, 0.14, 8.8, 0.14, 0xe2e8f0, false, false);

        // Skatepark Entrance Arch Sign (`Row 3`: "VESPUCCI SKATEPARK • PRO HALFPIPE 3.4M")
        for (const sx of [-165.0, -153.0]) {
          addGeo('metal', mats.metal, uCyl, sx, 2.5, 35.0, 0, 0, 0, 0.24, 4.8, 0.24, 0x1e293b, true, false);
          addAABB(sx - 0.22, sx + 0.22, 34.78, 35.22, 5.0, 0, 'skatepark_arch_post');
        }
        const skSign = makeAtlasSignGeo(12.6, 1.35, 3, 8, true);
        addGeo('signage', mats.signage, skSign, -159.0, 4.85, 35.0, 0, 0, 0, 1, 1, 1, null, false, false);

        // Halfpipe West & East Outer Perimeter Retaining Safety Walls (`minY = 0, maxY = 3.65m`)
        // (Lets vehicles ride up the inner U-bowl curve smoothly up to +3.40m while blocking exterior clipping through outer flank!)
        addAABB(-176.6, -174.9, 34.5, 69.5, 3.65, -0.5, 'skatepark_outer_wall_w');
        addAABB(-143.1, -141.4, 34.5, 69.5, 3.65, -0.5, 'skatepark_outer_wall_e');
        addAABB(-175.0, -143.0, 68.8, 70.6, 3.10, -0.5, 'skatepark_outer_wall_s');
      }

      // 2E. Brick-Paved Coastal Promenade (`X in [-134, -128], Z in [-125, +190]`) with Palm Planters & Curved Benches!
      {
        // North Segment (`Z in [-125, -23.2]`) & South Segment (`Z in [3.2, 190]`)
        const northLen = 101.8;
        const southLen = 186.8;
        addGeo('brickPromenade', mats.brickPromenade, uBox, -131.0, 0.14, -74.1, 0, 0, 0, 6.2, 0.20, northLen, null, false, true);
        addGeo('brickPromenade', mats.brickPromenade, uBox, -131.0, 0.14, 96.6, 0, 0, 0, 6.2, 0.20, southLen, null, false, true);

        // White Limestone Sea-Wall Coping, Palm Planter Boxes & Curved Teak Promenade Benches every 28m!
        for (let pz = -116; pz <= 180; pz += 28) {
          if (pz > -28 && pz < 12) continue; // Clear of Pier entrance!
          // Octagonal white planter + lush fan palm shrub + solid planter/trunk AABB
          addGeo('concrete', mats.concrete, uCyl, -132.4, 0.52, pz, 0, 0, 0, 2.3, 0.58, 2.3, 0xf1f5f9, true, true);
          addGeo('wood', mats.wood, uCyl, -132.4, 1.95, pz, 0, 0, -0.06, 0.34, 2.6, 0.34, 0x73573d, true, false);
          addGeo('concrete', mats.concrete, uCone, -132.5, 3.35, pz, 0, pz * 0.3, 0, 3.1, 1.15, 3.1, 0x2f7d36, true, false);
          addAABB(-133.55, -131.25, pz - 1.15, pz + 1.15, 4.2, 0, 'promenade_palm_planter');

          // Curved Coastal Bench facing Pacific Sunset (`-X`)
          const bz = pz + 11.5;
          if (bz < 185 && !(bz > -27 && bz < 10)) {
            addGeo('concrete', mats.concrete, uBox, -129.6, 0.44, bz - 1.1, 0, 0.18, 0, 0.55, 0.42, 1.45, 0xe2e8f0, true, true);
            addGeo('concrete', mats.concrete, uBox, -129.6, 0.44, bz + 1.1, 0, -0.18, 0, 0.55, 0.42, 1.45, 0xe2e8f0, true, true);
            addGeo('wood', mats.wood, uBox, -129.6, 0.68, bz - 1.1, 0, 0.18, 0, 0.62, 0.08, 1.48, 0x8b5a36, false, true);
            addGeo('wood', mats.wood, uBox, -129.6, 0.68, bz + 1.1, 0, -0.18, 0, 0.62, 0.08, 1.48, 0x8b5a36, false, true);
            addAABB(-130.0, -129.2, bz - 1.85, bz + 1.85, 0.78, 0, 'promenade_bench');
          }
        }
      }
    }

    // ========================================================================
    // ZONE 3: HẦM CHUI XUYÊN ĐỒI `VINEWOOD CONCRETE TUNNEL`
    //         (`X = +120, Z in [-375, -212]`, Floor y = 0.04m, Vault y = 7.80m)
    // ========================================================================
    {
      const tunX = 120.0;
      const tunLen = TUNNEL_Z_MAX - TUNNEL_Z_MIN; // 163.0m
      const tunMidZ = (TUNNEL_Z_MIN + TUNNEL_Z_MAX) * 0.5; // -293.5m

      // 3A. 4-Lane Divided Tunnel Highway Floor (`y = 0.04m`) + North & South Approach Ribbons
      const tunRoadGeo = new THREE.PlaneGeometry(17.6, tunLen + 26.0, 1, 12);
      tunRoadGeo.rotateX(-Math.PI * 0.5);
      const tUv = tunRoadGeo.attributes.uv;
      for (let i = 0; i < tUv.count; i++) {
        tUv.setXY(i, tUv.getX(i) * 2.0, tUv.getY(i) * 11.0);
      }
      tUv.needsUpdate = true;
      addGeo('asphalt', mats.asphalt, tunRoadGeo, tunX, TUNNEL_FLOOR_Y, tunMidZ - 2.0, 0, 0, 0, 1, 1, 1, null, false, true);

      // Raised Concrete Safety Walkways along West (`X = 110.6`) & East (`X = 129.4`) Bore Walls
      addGeo('concrete', mats.concrete, uBox, 110.6, 0.14, tunMidZ, 0, 0, 0, 1.35, 0.28, tunLen + 2.0, 0x94a3b8, false, true);
      addGeo('concrete', mats.concrete, uBox, 129.4, 0.14, tunMidZ, 0, 0, 0, 1.35, 0.28, tunLen + 2.0, 0x94a3b8, false, true);

      // 3B. Tiled White/Dirty Safety Walls (`y = 0.25..4.25m`) with Orange Reflective Safety Stripe!
      for (const sideSgn of [-1, 1]) {
        const wallX = tunX + sideSgn * 9.85;
        const wallPlane = new THREE.PlaneGeometry(tunLen, 4.1, 16, 1);
        const wUv = wallPlane.attributes.uv;
        for (let i = 0; i < wUv.count; i++) {
          wUv.setXY(i, wUv.getX(i) * 22.0, wUv.getY(i));
        }
        wUv.needsUpdate = true;
        addGeo(
          'tunnelTile', mats.tunnelTile, wallPlane,
          wallX, 2.25, tunMidZ,
          0, sideSgn < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, 0,
          1, 1, 1, null, false, true
        );
        // Solid outer structural concrete wall backing (`minY = -0.5, maxY = 8.1m` so hilltop above is 100% unaffected!)
        addGeo('concrete', mats.concrete, uBox, tunX + sideSgn * 10.45, 4.1, tunMidZ, 0, 0, 0, 1.1, 8.2, tunLen, 0x475569, false, false);
      }

      // Register Left & Right Tunnel Bore Wall AABBs (`maxY = 8.1m`!)
      addAABB(108.6, 110.2, TUNNEL_Z_MIN - 0.5, TUNNEL_Z_MAX + 0.5, 8.1, -1.0, 'vinewood_tunnel_wall_w');
      addAABB(129.8, 131.4, TUNNEL_Z_MIN - 0.5, TUNNEL_Z_MAX + 0.5, 8.1, -1.0, 'vinewood_tunnel_wall_e');

      // 3C. Arched Concrete Vault Ceiling (`y = 4.2m` springing -> peaking at exact `y = 7.80m`!)
      //     Half-cylinder rotated along Z axis (`radius = 9.95m`, scaled Y by `3.60 / 9.95` -> apex `4.20 + 3.60 = 7.80m`!)
      const vaultGeo = new THREE.CylinderGeometry(9.95, 9.95, tunLen, 20, 1, true, 0, Math.PI);
      // CylinderGeometry theta [0..PI] with rotateZ(-PI/2) & rotateX(PI/2): let's build exact analytical arch vertices so normals & UVs are 100% guaranteed!
      const archSegs = 20;
      const archPos = new Float32Array((archSegs + 1) * 2 * 3);
      const archUv = new Float32Array((archSegs + 1) * 2 * 2);
      const archIdx = [];
      for (let a = 0; a <= archSegs; a++) {
        const u = a / archSegs;
        const ang = u * Math.PI; // 0 (East +9.95) -> PI (West -9.95)
        const ax = tunX + Math.cos(ang) * 9.95;
        const ay = 4.20 + Math.sin(ang) * 3.60; // Peaks at exact y = 7.80m!
        const b0 = a * 2 * 3;
        archPos[b0] = ax; archPos[b0 + 1] = ay; archPos[b0 + 2] = TUNNEL_Z_MIN;
        archPos[b0 + 3] = ax; archPos[b0 + 4] = ay; archPos[b0 + 5] = TUNNEL_Z_MAX;

        const u0 = a * 2 * 2;
        archUv[u0] = u * 4.0; archUv[u0 + 1] = 0;
        archUv[u0 + 2] = u * 4.0; archUv[u0 + 3] = 24.0;

        if (a < archSegs) {
          const i0 = a * 2;
          archIdx.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2);
        }
      }
      vaultGeo.dispose();
      const customVaultGeo = new THREE.BufferGeometry();
      customVaultGeo.setAttribute('position', new THREE.BufferAttribute(archPos, 3));
      customVaultGeo.setAttribute('uv', new THREE.BufferAttribute(archUv, 2));
      customVaultGeo.setIndex(archIdx);
      customVaultGeo.computeVertexNormals();
      addGeo('concrete', mats.concrete, customVaultGeo, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0x3f4752, false, true);

      // Structural Transverse Concrete Arch Ribs every 16m inside the tunnel bore
      for (let rz = TUNNEL_Z_MIN + 8; rz <= TUNNEL_Z_MAX - 8; rz += 16) {
        addGeo('concrete', mats.concrete, uBox, tunX, 7.68, rz, 0, 0, 0, 14.5, 0.28, 0.55, 0x64748b, false, false);
      }

      // 3D. Glowing Warm-Amber Recessed Ceiling Fluorescent Strips (`InstancedMesh`) + 6 Overhead Jet Ventilation Fans!
      for (let lz = TUNNEL_Z_MIN + 5; lz <= TUNNEL_Z_MAX - 5; lz += 8.5) {
        for (const lxOff of [-5.2, 5.2]) {
          lightFixtureInstances.push({
            x: tunX + lxOff,
            y: 6.95,
            z: lz,
            rx: 0, ry: 0, rz: lxOff < 0 ? 0.34 : -0.34,
            sx: 0.42, sy: 0.14, sz: 3.4,
            color: 0xffb347,
          });
        }
        // Cat's-eye road reflector studs along center double-yellow & side curbs
        lightFixtureInstances.push({
          x: tunX, y: TUNNEL_FLOOR_Y + 0.03, z: lz,
          rx: 0, ry: 0, rz: 0, sx: 0.18, sy: 0.05, sz: 0.28,
          color: 0xfacc15,
        });
      }

      // 6 Twin Overhead Cylindrical Steel Jet Booster Ventilation Fans (`y = 6.85m`)!
      for (const fz of [-232.0, -272.0, -314.0, -356.0]) {
        for (const fxOff of [-2.6, 2.6]) {
          // Outer steel fan shroud cylinder
          addGeo('metal', mats.metal, uCyl, tunX + fxOff, 6.88, fz, Math.PI * 0.5, 0, 0, 1.18, 2.4, 1.18, 0x334155, false, false);
          // Spinning rotor hub + blades (`dynamicPropsInst`)!
          dynamicPropEntries.push({
            type: 'fan',
            x: tunX + fxOff,
            y: 6.88,
            z: fz,
            rx: 0,
            ry: 0,
            rz: 0,
            sx: 0.96,
            sy: 0.96,
            sz: 0.22,
            phase: fz * 0.1 + fxOff,
          });
        }
      }

      // 3E. South (`Z = -212`) & North (`Z = -375`) Concrete Portal Retaining Headwalls + "VINEWOOD TUNNEL" Signs!
      for (const portal of [
        { z: TUNNEL_Z_MAX, faceSign: 1, signZ: TUNNEL_Z_MAX + 1.05, yaw: 0 },
        { z: TUNNEL_Z_MIN, faceSign: -1, signZ: TUNNEL_Z_MIN - 1.05, yaw: Math.PI },
      ]) {
        const pz = portal.z;
        // Left & Right Massive Brutalist Concrete Portal Piers (`X = 105.5` & `X = 134.5`)
        addGeo('concrete', mats.concrete, uBox, 105.2, 5.8, pz, 0, 0, 0, 9.6, 11.6, 2.6, 0x94a3b8, true, true);
        addGeo('concrete', mats.concrete, uBox, 134.8, 5.8, pz, 0, 0, 0, 9.6, 11.6, 2.6, 0x94a3b8, true, true);
        // Upper Portal Arch Headwall Beam (`y = 7.80..11.80m` -> full 7.80m open vehicle clearance below!)
        addGeo('concrete', mats.concrete, uBox, tunX, 9.80, pz, 0, 0, 0, 20.4, 4.0, 2.6, 0xcbd5e1, true, true);
        addGeo('concrete', mats.concrete, uBox, tunX, 11.95, pz + portal.faceSign * 0.25, 0, 0, 0, 39.8, 0.72, 3.2, 0xe2e8f0, true, true);

        // Flared Concrete Wing Retaining Walls anchoring into mountain slope
        addGeo('concrete', mats.concrete, uBox, 98.5, 4.4, pz + portal.faceSign * 4.2, 0, portal.faceSign * 0.42, 0, 8.5, 8.8, 1.4, 0x94a3b8, true, true);
        addGeo('concrete', mats.concrete, uBox, 141.5, 4.4, pz + portal.faceSign * 4.2, 0, -portal.faceSign * 0.42, 0, 8.5, 8.8, 1.4, 0x94a3b8, true, true);

        // Illuminated "VINEWOOD TUNNEL • CLEARANCE 7.5M" Portal Signboard (`Row 1`) + Amber Hazard Beacons!
        const tunSign = makeAtlasSignGeo(15.6, 2.05, 1, 8, false);
        addGeo('signage', mats.signage, tunSign, tunX, 9.75, portal.signZ + portal.faceSign * 0.32, 0, portal.yaw, 0, 1, 1, 1, null, false, false);
        for (const bx of [111.0, 129.0]) {
          addGeo('emissive', mats.emissive, uSphere, bx, 8.45, portal.signZ + portal.faceSign * 0.35, 0, 0, 0, 0.48, 0.48, 0.48, 0xfbbf24, false, false);
        }

        // Portal solid AABBs (Left pier, Right pier, & Upper Lintel `minY = 7.75m` so vehicles < 7.5m pass cleanly!)
        addAABB(100.4, 110.1, pz - 1.4, pz + 1.4, 12.4, 0, 'tunnel_portal_pier');
        addAABB(129.9, 139.6, pz - 1.4, pz + 1.4, 12.4, 0, 'tunnel_portal_pier');
        addAABB(110.1, 129.9, pz - 1.3, pz + 1.3, 12.4, 7.75, 'tunnel_portal_lintel');
      }

      // North Canyon Retaining Walls (`Z in [-390, -375]`) guiding traffic smoothly onto the Touge Road!
      addGeo('concrete', mats.concrete, uBox, 108.5, 4.8, -383.5, 0, 0, 0, 1.6, 9.6, 16.5, 0x64748b, true, true);
      addAABB(107.6, 109.4, -391.5, -375.0, 9.6, 0, 'tunnel_north_retaining_w');

      // 2 Warm Amber `THREE.PointLight`s active ONLY when player is inside/entering the Côn Lôn Tiên Sơn Tunnel!
      tunnelPointLightA = new THREE.PointLight(0xffb04a, 0.0, 52.0, 1.5);
      tunnelPointLightB = new THREE.PointLight(0xffb04a, 0.0, 52.0, 1.5);
      tunnelPointLightA.position.set(120.0, 6.8, -260.0);
      tunnelPointLightB.position.set(120.0, 6.8, -325.0);
      tunnelPointLightA.visible = false;
      tunnelPointLightB.visible = false;
      coastHillsRoot.add(tunnelPointLightA, tunnelPointLightB);
    }

    // ========================================================================
    // ZONE 4: WINDING MOUNTAIN TOUGE DRIFT ROAD, GIANT VINEWOOD SIGN UPLIGHTS,
    //         & 4 CANTILEVER STILT MANSIONS WITH TURQUOISE INFINITY POOLS!
    // ========================================================================
    const infinityPoolItems = [];
    {
      // 4A. Far-North Côn Lôn Tiên Sơn Mountain Extension Strip (`Z in [-436, -390]`) beyond `world.js`'s Z=-395 edge!
      {
        const extGeo = new THREE.PlaneGeometry(490, 50, 64, 12);
        extGeo.rotateX(-Math.PI * 0.5);
        const ePos = extGeo.attributes.position;
        const eCol = new Float32Array(ePos.count * 3);
        const cLow = new THREE.Color(0x526b38);
        const cMid = new THREE.Color(0x6e7845);
        const cRock = new THREE.Color(0x7c7468);
        const tmpC = new THREE.Color();
        for (let i = 0; i < ePos.count; i++) {
          const wx = ePos.getX(i) + 20.0;
          const wz = ePos.getZ(i) - 413.0;
          const wy = evalSculptedHillHeight(wx, wz);
          ePos.setXYZ(i, wx, wy, wz);
          tmpC.copy(wy < 22 ? cLow : cMid).lerp(wy < 22 ? cMid : cRock, clamp((wy - (wy < 22 ? 0 : 22)) / 28, 0, 1));
          eCol[i * 3] = tmpC.r;
          eCol[i * 3 + 1] = tmpC.g;
          eCol[i * 3 + 2] = tmpC.b;
        }
        extGeo.setAttribute('color', new THREE.BufferAttribute(eCol, 3));
        extGeo.computeVertexNormals();
        addGeo('concrete', mats.concrete, extGeo, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0xffffff, false, true);
      }

      // 4B. Winding 12m Paved 2-Lane Mountain Touge Drift Road + Metallic W-Beam Guardrails (`InstancedMesh`)!
      const tougeSurfGeo = createRibbonGeo(TOUGE_NODES, TOUGE_HALF_W * 2, 15.0, 0.05);
      addGeo('asphalt', mats.asphalt, tougeSurfGeo, 0, 0, 0, 0, 0, 0, 1, 1, 1, null, false, true);

      // Concrete roadbed shoulder curb & Instanced Metallic W-Beam Guardrails!
      for (let i = 1; i < TOUGE_NODES.length - 1; i++) {
        const a = TOUGE_NODES[i];
        const b = TOUGE_NODES[i + 1];
        const segLen = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
        const mx = (a.x + b.x) * 0.5;
        const my = (a.y + b.y) * 0.5;
        const mz = (a.z + b.z) * 0.5;
        const pitch = -Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z) || 1);

        // Roadbed sub-slab so sloped shoulders never expose air gaps
        addGeo('concrete', mats.concrete, uBox, mx, my - 0.35, mz, pitch, a.yaw, a.bank || 0, TOUGE_HALF_W * 2 + 1.2, 0.72, segLen + 0.35, 0x6b7280, false, true);

        // Place W-Beam Guardrail segments on both sides — skipping Mansion Carport mouths & Observatory Terrace junction!
        for (const side of [-1, 1]) {
          const gx = mx + a.rx * (side * (TOUGE_HALF_W + 0.35));
          const gz = mz + a.rz * (side * (TOUGE_HALF_W + 0.35));
          const gy = my + (side * TOUGE_HALF_W) * Math.sin(a.bank || 0);

          // Leave open gaps at the 4 Mansion Driveways & Galileo Observatory Terrace `(84, -242)`!
          let openGap = false;
          for (let mi = 0; mi < STILT_MANSIONS.length; mi++) {
            const mn = STILT_MANSIONS[mi];
            if (Math.abs(gx - mn.x) < 12.5 && gz >= mn.z - 22.0 && gz <= mn.z - 8.0) {
              openGap = true;
              break;
            }
          }
          if (gx >= 76 && gx <= 96 && gz >= -254 && gz <= -234) openGap = true;
          if (openGap) continue;

          // Galvanized W-beam horizontal rail + steel I-post (`stiltGuardInstances`)
          stiltGuardInstances.push({
            x: gx, y: gy + 0.62, z: gz,
            rx: pitch, ry: a.yaw, rz: 0,
            sx: 0.14, sy: 0.34, sz: segLen + 0.12,
            color: 0xcbd5e1,
          });
          stiltGuardInstances.push({
            x: a.x + a.rx * (side * (TOUGE_HALF_W + 0.42)),
            y: a.y + 0.38,
            z: a.z + a.rz * (side * (TOUGE_HALF_W + 0.42)),
            rx: 0, ry: a.yaw, rz: 0,
            sx: 0.16, sy: 0.82, sz: 0.16,
            color: 0x64748b,
          });

          // Red/White night drift chevron reflectors every 2nd post (`lightFixtureInstances`)
          if (i % 2 === 0) {
            lightFixtureInstances.push({
              x: gx, y: gy + 0.82, z: gz,
              rx: 0, ry: a.yaw, rz: 0,
              sx: 0.12, sy: 0.14, sz: 0.24,
              color: side > 0 ? 0xef4444 : 0xfef08a,
            });
          }
        }
      }

      // 4C. Spotlight Uplights on the Giant 3D "VINEWOOD" Landmark Letters (`X in [20, 100], Z = -295`)!
      {
        const spacing = 11.4;
        const startX = 60.0 - (7 * spacing) * 0.5;
        const coneGeo = new THREE.ConeGeometry(4.2, 16.5, 14, 1, true);
        // Flip cone so narrow apex starts at ground floodlight housing and flares upward onto each giant letter!
        coneGeo.rotateX(Math.PI);

        for (let li = 0; li < 8; li++) {
          const lx = startX + li * spacing;
          const letterBaseY = Math.max(58.0, getBaseWorldHillHeight(lx, -295.0)) + 1.2;
          const padZ = -290.8;
          const padY = evalSculptedHillHeight(lx, padZ);

          // Concrete floodlight pad + angled steel architectural spotlight housing + glowing lens!
          addGeo('concrete', mats.concrete, uBox, lx, padY + 0.15, padZ, 0, 0, 0, 1.35, 0.45, 1.35, 0x94a3b8, false, true);
          addGeo('metal', mats.metal, uCyl, lx, padY + 0.68, padZ, 0.48, 0, 0, 0.68, 0.72, 0.68, 0x1e293b, false, false);
          addGeo('emissive', mats.emissive, uSphere, lx, padY + 0.92, padZ - 0.18, 0, 0, 0, 0.52, 0.25, 0.52, 0xfff4cc, false, false);

          // Volumetric Additive Uplight Cone bathing each 3D VINEWOOD letter!
          addGeo(
            'vinewoodBeam', mats.vinewoodBeam, coneGeo,
            lx, letterBaseY + 4.8, -293.2,
            -0.24, 0, 0,
            1.15, 1.0, 0.75,
            null, false, false
          );
        }
      }

      // 4D. 4 Ultra-Modern Cantilever Stilt Mansions with Glowing Turquoise GLSL Infinity Pools!
      //     `(-65, 24, -275)`, `(-10, 30, -315)`, `(175, 26, -265)`, `(225, 32, -310)`
      for (let mi = 0; mi < STILT_MANSIONS.length; mi++) {
        const m = STILT_MANSIONS[mi];
        const mx = m.x;
        const my = m.y;
        const mz = m.z;

        // 1) North Forecourt Driveway Apron (`z in [mz - 19.5, mz - 3.0]`) + Cantilevered Walnut Carport!
        addGeo('concrete', mats.concrete, uBox, mx, my - 0.22, mz - 11.0, 0, 0, 0, 25.6, 0.44, 17.0, 0xdbe2ea, true, true);
        // Open Private 2-Car Carport on East side of Forecourt (`mx + 6.8, mz - 9.2`)
        addGeo('concrete', mats.concrete, uBox, mx + 6.6, my + 3.55, mz - 9.2, 0, 0, 0, 10.6, 0.28, 8.2, 0xf8fafc, true, true);
        addGeo('wood', mats.wood, uBox, mx + 6.6, my + 3.38, mz - 9.2, 0, 0, 0, 10.2, 0.10, 7.8, 0x6b442a, false, false);
        addGeo('metal', mats.metal, uBox, mx + 11.4, my + 1.75, mz - 12.6, 0, 0, 0, 0.30, 3.5, 0.30, 0x1e293b, true, false);
        addGeo('metal', mats.metal, uBox, mx + 11.4, my + 1.75, mz - 5.8, 0, 0, 0, 0.30, 3.5, 0.30, 0x1e293b, true, false);

        // 2) Main Cantilevered Concrete & Walnut Cliff Deck (`z in [mz - 3.0, mz + 12.0]`, overhanging steep slope!)
        addGeo('concrete', mats.concrete, uBox, mx, my - 0.38, mz + 4.5, 0, 0, 0, 26.0, 0.76, 15.2, 0xf1f5f9, true, true);
        addGeo('wood', mats.wood, uBox, mx, my - 0.82, mz + 4.5, 0, 0, 0, 25.2, 0.16, 14.6, 0x5c3a24, false, false);

        // 3) Tall Concrete Structural Stilts & Diagonal Bracing (`stiltGuardInstances` -> 0 extra draw calls!)
        for (const sxOff of [-10.8, -3.6, 3.6, 10.8]) {
          for (const szOff of [2.5, 10.6]) {
            const stX = mx + sxOff;
            const stZ = mz + szOff;
            const slopeY = evalSculptedHillHeight(stX, stZ) - 1.8;
            const stH = Math.max(6.0, (my - 0.75) - slopeY);
            stiltGuardInstances.push({
              x: stX,
              y: slopeY + stH * 0.5,
              z: stZ,
              rx: 0, ry: 0, rz: 0,
              sx: 0.78, sy: stH, sz: 0.78,
              color: 0x94a3b8,
            });
            // Diagonal steel earthquake V-brace between front & rear stilts!
            if (szOff > 8.0) {
              const backSlopeY = evalSculptedHillHeight(stX, mz + 2.5) - 0.5;
              const dy = (my - 0.8) - backSlopeY;
              const dz = 8.1;
              const dLen = Math.hypot(dy, dz);
              stiltGuardInstances.push({
                x: stX,
                y: backSlopeY + dy * 0.5,
                z: mz + 6.55,
                rx: -Math.atan2(dz, dy),
                ry: 0,
                rz: 0,
                sx: 0.28, sy: dLen, sz: 0.28,
                color: 0x334155,
              });
            }
          }
        }

        // 4) Multi-Level White Stucco & Rich Walnut Wood Modern Architectural Volumes!
        //    Ground Living Wing (`mx - 3.2, mz - 1.2`, width 17.5m, depth 7.6m, height 4.1m)
        const wingX = mx - 3.0;
        const wingZ = mz - 0.8;
        addGeo('concrete', mats.concrete, uBox, wingX, my + 2.05, wingZ, 0, 0, 0, 17.6, 4.1, 7.6, 0xf8fafc, true, true);
        // Horizontal Californian Walnut Cladding Band & Roof Overhang
        addGeo('wood', mats.wood, uBox, wingX, my + 4.25, wingZ + 0.4, 0, 0, 0, 19.2, 0.42, 9.2, 0x6b4228, true, true);
        addGeo('concrete', mats.concrete, uBox, wingX, my + 4.56, wingZ + 0.4, 0, 0, 0, 19.6, 0.24, 9.6, 0xffffff, true, true);
        // Panoramic Floor-to-Ceiling South Glass + Warm Glowing Luxury Living Room Interior!
        addGeo('emissive', mats.emissive, uBox, wingX, my + 1.95, wingZ + 3.76, 0, 0, 0, 15.6, 3.3, 0.08, 0xffe8b8, false, false);
        addGeo('glass', mats.glass, uBox, wingX, my + 1.95, wingZ + 3.86, 0, 0, 0, 16.2, 3.5, 0.08, null, false, false);

        //    Offset 2nd-Story Cantilever Master Suite (`mx - 5.2, my + 4.6..8.2m, mz - 0.2`)
        const upX = mx - 4.8 + (mi % 2) * 3.2;
        const upY = my + 4.65;
        addGeo('concrete', mats.concrete, uBox, upX, upY + 1.75, wingZ + 0.6, 0, 0, 0, 12.4, 3.5, 7.2, 0xffffff, true, true);
        addGeo('wood', mats.wood, uBox, upX + 4.2, upY + 1.75, wingZ + 0.6, 0, 0, 0, 4.2, 3.56, 7.35, 0x73482c, true, true);
        addGeo('concrete', mats.concrete, uBox, upX, upY + 3.65, wingZ + 0.8, 0, 0, 0, 13.8, 0.34, 8.4, 0xf8fafc, true, true);
        addGeo('emissive', mats.emissive, uBox, upX - 1.5, upY + 1.70, wingZ + 4.22, 0, 0, 0, 8.2, 2.7, 0.06, 0xfff0cc, false, false);
        addGeo('glass', mats.glass, uBox, upX - 1.5, upY + 1.70, wingZ + 4.30, 0, 0, 0, 8.6, 2.9, 0.08, null, false, false);

        addAABB(wingX - 8.9, wingX + 8.9, wingZ - 3.9, wingZ + 3.9, my + 8.6, my - 0.2, 'mansion_house');

        // 5) Glowing Turquoise GLSL `Infinity Pool` Overhanging the South Cliff (`z in [mz + 4.2, mz + 11.2]`)!
        const poolX = mx + 3.2;
        const poolZ = mz + 7.6;
        const poolW = 13.2;
        const poolD = 7.0;
        // Dark slate pool basin floor (`my - 0.58m`) + Acrylic Glass Vanishing-Edge South Weir Wall!
        addGeo('concrete', mats.concrete, uBox, poolX, my - 0.62, poolZ, 0, 0, 0, poolW + 0.8, 0.22, poolD + 0.8, 0x0f293a, false, true);
        addGeo('glass', mats.glass, uBox, poolX, my - 0.22, poolZ + poolD * 0.5, 0, 0, 0, poolW, 0.62, 0.14, null, false, false);

        const pPlane = new THREE.PlaneGeometry(poolW, poolD, 12, 8);
        pPlane.rotateX(-Math.PI * 0.5);
        infinityPoolItems.push({
          geo: pPlane,
          matrix: makeMat4(poolX, my - 0.06, poolZ),
        });

        // 6) Frameless Blue-Tinted Glass Balcony Railings + Cliffside Firepit Lounge & Resort Sunbeds!
        // West terrace glass railing (`z = mz + 11.85`, west of infinity pool)
        addGeo('glass', mats.glass, uBox, mx - 8.2, my + 0.55, mz + 11.85, 0, 0, 0, 9.2, 1.08, 0.08, null, false, false);
        addGeo('glass', mats.glass, uBox, mx - 12.85, my + 0.55, mz + 4.5, 0, 0, 0, 0.08, 1.08, 14.8, null, false, false);
        addGeo('glass', mats.glass, uBox, mx + 12.85, my + 0.55, mz + 4.5, 0, 0, 0, 0.08, 1.08, 14.8, null, false, false);

        // Safety balcony edge AABBs (`minY = my - 0.2, maxY = my + 1.15`)
        addAABB(mx - 13.1, mx + 13.1, mz + 11.6, mz + 12.2, my + 1.15, my - 0.2, 'mansion_cliff_rail');
        addAABB(mx - 13.1, mx - 12.6, mz - 3.0, mz + 12.0, my + 1.15, my - 0.2, 'mansion_side_rail');
        addAABB(mx + 12.6, mx + 13.1, mz - 3.0, mz + 12.0, my + 1.15, my - 0.2, 'mansion_side_rail');

        // Modern Firepit Lounge (`mx - 7.8, mz + 7.5`) with glowing orange fire embers + white sun loungers!
        addGeo('concrete', mats.concrete, uBox, mx - 7.8, my + 0.24, mz + 7.5, 0, 0, 0, 2.4, 0.48, 1.4, 0x334155, true, true);
        addGeo('emissive', mats.emissive, uBox, mx - 7.8, my + 0.50, mz + 7.5, 0, 0, 0, 1.8, 0.08, 0.75, 0xff6b1a, false, false);
        addGeo('concrete', mats.concrete, uBox, mx - 7.8, my + 0.32, mz + 5.4, 0, 0, 0, 3.6, 0.52, 0.95, 0xf8fafc, true, true);
        // White Resort Umbrella beside Infinity Pool
        addGeo('metal', mats.metal, uCyl, mx - 4.2, my + 1.35, mz + 9.2, 0, 0, 0, 0.09, 2.7, 0.09, 0xe2e8f0, true, false);
        addGeo('concrete', mats.concrete, uCone, mx - 4.2, my + 2.65, mz + 9.2, 0, 0.4, 0, 3.2, 0.58, 3.2, 0xffffff, true, false);
      }
    }

    // ========================================================================
    // Assemble All Static Batches + 2 Custom GLSL Water Meshes + 4 InstancedMeshes!
    // ========================================================================

    // 1. Flush all static material buckets (11 merged meshes total!)
    for (const [, bucket] of buckets.entries()) {
      const merged = mergeGeos(bucket.items);
      if (!merged) continue;
      const m = new THREE.Mesh(merged, bucket.mat);
      m.castShadow = bucket.castShadow;
      m.receiveShadow = bucket.receiveShadow;
      m.matrixAutoUpdate = false;
      m.updateMatrix();
      coastHillsRoot.add(m);
    }

    // 2. Merged GLSL Bích Thủy Kênh Canals Water Mesh (1 Draw Call!)
    const mergedCanalWater = mergeGeos(canalWaterItems);
    if (mergedCanalWater) {
      const cwMesh = new THREE.Mesh(mergedCanalWater, canalWaterMat);
      cwMesh.matrixAutoUpdate = false;
      cwMesh.updateMatrix();
      coastHillsRoot.add(cwMesh);
    }

    // 3. Merged GLSL Cantilever Mansion Infinity Pools Mesh (1 Draw Call for all 4 Pools!)
    const mergedInfinityPools = mergeGeos(infinityPoolItems);
    if (mergedInfinityPools) {
      const ipMesh = new THREE.Mesh(mergedInfinityPools, infinityPoolMat);
      ipMesh.matrixAutoUpdate = false;
      ipMesh.updateMatrix();
      coastHillsRoot.add(ipMesh);
    }

    // 4. InstancedMesh #1: Barnacle-Weathered Under-Pier Pilings, X-Bracing & Canal Mooring Piles (1 Draw Call!)
    if (pilingInstances.length > 0) {
      const pInst = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.5, 0.54, 1.0, 8),
        mats.barnacleWood,
        pilingInstances.length
      );
      pInst.castShadow = true;
      pInst.receiveShadow = true;
      for (let i = 0; i < pilingInstances.length; i++) {
        const it = pilingInstances[i];
        pInst.setMatrixAt(i, makeMat4(it.x, it.y, it.z, it.rx, it.ry, it.rz, it.sx, it.sy, it.sz));
      }
      pInst.instanceMatrix.needsUpdate = true;
      pInst.computeBoundingSphere?.();
      coastHillsRoot.add(pInst);
    }

    // 5. InstancedMesh #2: Mansion Concrete Stilts, Touge Metallic W-Beam Guardrails & Canal Bollards (1 Draw Call!)
    if (stiltGuardInstances.length > 0) {
      const sgMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.42,
        metalness: 0.58,
        envMap,
      });
      const sgInst = new THREE.InstancedMesh(uBox, sgMat, stiltGuardInstances.length);
      sgInst.castShadow = true;
      sgInst.receiveShadow = true;
      const tmpC = new THREE.Color();
      for (let i = 0; i < stiltGuardInstances.length; i++) {
        const it = stiltGuardInstances[i];
        sgInst.setMatrixAt(i, makeMat4(it.x, it.y, it.z, it.rx, it.ry, it.rz, it.sx, it.sy, it.sz));
        tmpC.setHex(it.color ?? 0xcbd5e1);
        sgInst.setColorAt(i, tmpC);
      }
      sgInst.instanceMatrix.needsUpdate = true;
      if (sgInst.instanceColor) sgInst.instanceColor.needsUpdate = true;
      sgInst.computeBoundingSphere?.();
      coastHillsRoot.add(sgInst);
    }

    // 6. InstancedMesh #3: Tunnel Recessed Fluorescent Strips, Canal String Lights & Touge Reflectors (1 Draw Call!)
    if (lightFixtureInstances.length > 0) {
      const lfMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const lfInst = new THREE.InstancedMesh(uBox, lfMat, lightFixtureInstances.length);
      const tmpC = new THREE.Color();
      for (let i = 0; i < lightFixtureInstances.length; i++) {
        const it = lightFixtureInstances[i];
        lfInst.setMatrixAt(i, makeMat4(it.x, it.y, it.z, it.rx, it.ry, it.rz, it.sx, it.sy, it.sz));
        tmpC.setHex(it.color ?? 0xffd27d);
        lfInst.setColorAt(i, tmpC);
      }
      lfInst.instanceMatrix.needsUpdate = true;
      if (lfInst.instanceColor) lfInst.instanceColor.needsUpdate = true;
      lfInst.computeBoundingSphere?.();
      coastHillsRoot.add(lfInst);
    }

    // 7. InstancedMesh #4: Animated Tunnel Jet Fan Blades & Pumping Muscle-Sands Bodybuilder Barbells (1 Draw Call!)
    if (dynamicPropEntries.length > 0) {
      const rotorCrossGeo = mergeGeos([
        { geo: new THREE.BoxGeometry(1.0, 0.14, 0.14), matrix: makeMat4(0, 0, 0) },
        { geo: new THREE.BoxGeometry(0.14, 1.0, 0.14), matrix: makeMat4(0, 0, 0) },
        { geo: new THREE.CylinderGeometry(0.18, 0.18, 1.0, 8), matrix: makeMat4(0, 0, 0, Math.PI * 0.5, 0, 0) },
      ]);
      dynamicPropsInst = new THREE.InstancedMesh(
        rotorCrossGeo,
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.30, metalness: 0.82 }),
        dynamicPropEntries.length
      );
      dynamicPropsInst.frustumCulled = false;
      dynamicPropsInst.userData = { dynamic: true, animated: true };
      for (let i = 0; i < dynamicPropEntries.length; i++) {
        const d = dynamicPropEntries[i];
        dynamicPropsInst.setMatrixAt(i, makeMat4(d.x, d.y, d.z, d.rx, d.ry, d.rz, d.sx, d.sy, d.sz));
      }
      dynamicPropsInst.instanceMatrix.needsUpdate = true;
      coastHillsRoot.add(dynamicPropsInst);
    }

    if (scene && coastHillsRoot.parent !== scene) {
      scene.add(coastHillsRoot);
    }
  }

  // ==========================================================================
  // Spawn Moored Canal Speedboat / Jet Skis, Skatepark Bati 801RR & Mansion Cars
  // ==========================================================================

  function ensureCoastVehiclesSpawned() {
    if (spawnedCoastVehicles) return;
    const vehSys = activeCtx?.vehicles;
    if (!vehSys || typeof vehSys.spawnVehicle !== 'function') return;

    spawnedCoastVehicles = true;
    const specs = [
      // Moored Watercraft inside Bích Thủy Kênh Canals (`speedboat` & `jetski`)!
      { type: 'speedboat', x: -195.0, y: CANAL_WATER_Y, z: -182.0, yaw: -Math.PI * 0.5, opts: { isParked: true, color: 0x7c3419 } },
      { type: 'jetski', x: -178.5, y: CANAL_WATER_Y, z: -198.5, yaw: 0, opts: { isParked: true, color: 0x06b6d4 } },
      { type: 'jetski', x: -171.5, y: CANAL_WATER_Y, z: -164.0, yaw: Math.PI, opts: { isParked: true, color: 0xfacc15 } },
      // Pegassi Bati 801RR parked right at Bích Thủy Kênh Skatepark Entrance for Halfpipe Vert Launches!
      { type: 'superbike', x: -139.5, y: 0.26, z: 50.0, yaw: -Math.PI * 0.5, opts: { isParked: true, color: 0xd91e2a } },
      // Luxury Supercars parked inside Mansion #2 & Mansion #4 Cliffside Carports!
      { type: 'zentorno', x: -3.4, y: 30.05, z: -324.2, yaw: Math.PI, opts: { isParked: true, color: 0xd4af37 } },
      { type: 'obey9f', x: 231.6, y: 32.05, z: -319.2, yaw: Math.PI, opts: { isParked: true, color: 0xf8fafc } },
    ];

    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      try {
        const v = vehSys.spawnVehicle(s.type, s.x, s.y, s.z, s.yaw, s.opts);
        if (v && s.y === CANAL_WATER_Y) {
          v._mooredInCanal = true;
        }
      } catch (_) {}
    }
  }

  // ==========================================================================
  // Safe Fallback World Boundary & Landmark Registration
  // ==========================================================================

  function syncIntoWorldBoundsAndLandmarks() {
    const world = activeCtx?.world;
    if (!world || worldHooked) return;
    worldHooked = true;

    if (world.bounds) {
      world.bounds.minX = Math.min(world.bounds.minX ?? -320, -500);
      world.bounds.maxX = Math.max(world.bounds.maxX ?? 280, 440);
      world.bounds.minZ = Math.min(world.bounds.minZ ?? -280, -445);
      world.bounds.maxZ = Math.max(world.bounds.maxZ ?? 260, 565);
    }

    if (world.landmarks && typeof world.landmarks === 'object') {
      world.landmarks.vespucciCanals = { x: -168.0, y: 0.62, z: -182.0 };
      world.landmarks.muscleSandsGym = { x: -148.0, y: 0.28, z: -48.0 };
      world.landmarks.vespucciSkatepark = { x: -159.0, y: 0.35, z: 52.0, lipY: 3.40 };
      world.landmarks.vinewoodTunnel = { x: 120.0, y: 0.04, z: -294.0, southPortalZ: -212.0, northPortalZ: -375.0 };
      world.landmarks.stiltMansions = STILT_MANSIONS.map((m) => ({ ...m }));
    }

    // Ensure `world.js`'s legacy `z < -370` / `z < -375` clamp never blocks driving out the -375 North Tunnel Exit!
    if (typeof world.resolveCarAABB === 'function' && !world._coastHillsUnclampedZ) {
      world._coastHillsUnclampedZ = true;
      const prevCarAABB = world.resolveCarAABB.bind(world);
      world.resolveCarAABB = function unclampedNorthCarAABB(car) {
        const wantZ = car && Number.isFinite(car.z) ? car.z : 0;
        const res = prevCarAABB(car);
        if (car && wantZ < -369.5 && wantZ >= -442.0 && Math.abs(car.z - (-370)) < 0.05) {
          car.z = wantZ;
        }
        return res;
      };
    }
    if (typeof world.resolveCircleAABB === 'function' && !world._coastHillsUnclampedPedZ) {
      world._coastHillsUnclampedPedZ = true;
      const prevCircleAABB = world.resolveCircleAABB.bind(world);
      world.resolveCircleAABB = function unclampedNorthCircleAABB(ent, radius) {
        const wantZ = ent && Number.isFinite(ent.z) ? ent.z : 0;
        const res = prevCircleAABB(ent, radius);
        if (ent && wantZ < -374.5 && wantZ >= -442.0 && Math.abs(ent.z - (-375)) < 0.05) {
          ent.z = wantZ;
        }
        return res;
      };
    }
  }

  // ==========================================================================
  // Lifecycle: `init(ctx)` and `update(dt, ctx)`
  // ==========================================================================

  function init(ctxArg) {
    if (ctxArg && typeof ctxArg === 'object') activeCtx = ctxArg;
    if (initialized) {
      sculptExistingWorldTerrainMeshes();
      syncIntoWorldBoundsAndLandmarks();
      ensureCoastVehiclesSpawned();
      return api;
    }

    const scene = activeCtx?.engine?.scene || activeCtx?.scene || null;
    initialized = true;

    buildNavigationAndMinimapData();
    buildAllDistrictGeometry(scene);
    sculptExistingWorldTerrainMeshes();
    syncIntoWorldBoundsAndLandmarks();
    ensureCoastVehiclesSpawned();

    if (activeCtx) {
      activeCtx.mapCoastHills = api;
    }
    return api;
  }

  function update(dtArg = 0.016, secondArg) {
    if (secondArg && typeof secondArg === 'object') activeCtx = secondArg;
    if (!initialized && (activeCtx?.engine?.scene || activeCtx?.scene || activeCtx?.world)) {
      init(activeCtx);
    }
    if (!spawnedCoastVehicles && activeCtx?.vehicles?.spawnVehicle) {
      ensureCoastVehiclesSpawned();
    }

    const dt = clamp(Number(dtArg) || 0.016, 0.0005, 0.1);
    elapsed += dt;
    if (gymCooldown > 0) gymCooldown = Math.max(0, gymCooldown - dt);
    if (poolHealTick > 0) poolHealTick = Math.max(0, poolHealTick - dt);
    if (skateAirToastCooldown > 0) skateAirToastCooldown = Math.max(0, skateAirToastCooldown - dt);

    // 1. Update GLSL Canal Water & Infinity Pool Uniforms + Time/Weather Night Glow!
    canalWaterUniforms.uTime.value = elapsed;
    infinityPoolUniforms.uTime.value = elapsed;

    const weather = activeCtx?.engine?.timeWeather || 'BRIGHT_DAY';
    if (weather !== lastWeatherKey) {
      lastWeatherKey = weather;
      const isNight = weather === 'NEON_NIGHT';
      const isSunset = weather === 'SUNSET_GOLD';
      const isRain = weather === 'OVERCAST_RAIN';
      const nightMix = isNight ? 1.0 : isSunset ? 0.55 : isRain ? 0.42 : 0.0;

      canalWaterUniforms.uNightMix.value = nightMix;
      infinityPoolUniforms.uNightMix.value = nightMix;
      if (isNight) {
        canalWaterUniforms.uSkyColor.value.setHex(0x102444);
        canalWaterUniforms.uDeepColor.value.setHex(0x052836);
      } else if (isSunset) {
        canalWaterUniforms.uSkyColor.value.setHex(0xe28c68);
        canalWaterUniforms.uDeepColor.value.setHex(0x0b4352);
      } else {
        canalWaterUniforms.uSkyColor.value.setHex(0x7cc0f0);
        canalWaterUniforms.uDeepColor.value.setHex(0x0b5563);
      }
      if (vinewoodSpotMat) {
        vinewoodSpotMat.opacity = isNight ? 0.34 : isSunset ? 0.24 : isRain ? 0.20 : 0.09;
      }
      if (signageAtlasMat) {
        signageAtlasMat.emissiveIntensity = isNight ? 1.55 : isSunset ? 1.15 : 0.85;
      }
    }

    // 2. Spin Overhead Tunnel Jet Ventilation Fans & Pump Muscle Sands Bodybuilder Barbells!
    if (dynamicPropsInst && dynamicPropEntries.length > 0) {
      for (let i = 0; i < dynamicPropEntries.length; i++) {
        const d = dynamicPropEntries[i];
        if (d.type === 'fan') {
          dynamicPropsInst.setMatrixAt(
            i,
            makeMat4(d.x, d.y, d.z, 0, 0, elapsed * 9.5 + d.phase, d.sx, d.sy, d.sz)
          );
        } else {
          const lift = Math.sin(elapsed * 2.8 + d.phase) * 0.22;
          dynamicPropsInst.setMatrixAt(
            i,
            makeMat4(d.x, d.y + lift, d.z, 0, d.ry, 0, d.sx, d.sy, d.sz)
          );
        }
      }
      dynamicPropsInst.instanceMatrix.needsUpdate = true;
    }

    const p = activeCtx?.player;
    const pCar = p?.inCar && typeof p.inCar === 'object' ? p.inCar : null;

    // 3. Dynamic Warm-Amber Tunnel PointLights when Player is Inside/Approaching Côn Lôn Tiên Sơn Tunnel!
    if (tunnelPointLightA && tunnelPointLightB && p) {
      const nearTunnel =
        p.x >= 102.0 && p.x <= 138.0 &&
        p.z >= TUNNEL_Z_MIN - 14.0 && p.z <= TUNNEL_Z_MAX + 14.0 &&
        (p.y || 0) < 8.5;
      tunnelPointLightA.visible = nearTunnel;
      tunnelPointLightB.visible = nearTunnel;
      if (nearTunnel) {
        const clampedZ = clamp(p.z, TUNNEL_Z_MIN + 14.0, TUNNEL_Z_MAX - 14.0);
        tunnelPointLightA.position.set(120.0, 6.6, clampedZ - 14.0);
        tunnelPointLightB.position.set(120.0, 6.6, clampedZ + 14.0);
        tunnelPointLightA.intensity = 2.25;
        tunnelPointLightB.intensity = 2.25;
      } else {
        tunnelPointLightA.intensity = 0.0;
        tunnelPointLightB.intensity = 0.0;
      }
    }

    // 4. Smooth Canal Watercraft Buoyancy & Thrust inside Bích Thủy Kênh Canals (`water surface y = -0.15m`)
    const allVehicles = activeCtx?.vehicles?.list;
    if (Array.isArray(allVehicles)) {
      for (let i = 0; i < allVehicles.length; i++) {
        const v = allVehicles[i];
        if (!v || !v.isBoat || v.destroyed) continue;
        if (v.x >= -206.0 && v.x <= -139.5 && v.z >= -227.0 && v.z <= -137.0 && isInsideCanalWater(v.x, v.z)) {
          const floatTargetY = CANAL_WATER_Y - (v.def?.draftDepth || 0.18) + Math.sin(elapsed * 2.2 + i) * 0.025;
          v.y = lerp(v.y ?? floatTargetY, floatTargetY, clamp(dt * 12.0, 0, 1));
          if (v === pCar && activeCtx?.input) {
            const gas = Number(activeCtx.input.throttle) || 0;
            const brk = Number(activeCtx.input.brake) || 0;
            if (gas > 0.05) {
              v.vx = (v.vx || 0) + Math.sin(v.yaw || 0) * gas * 15.0 * dt;
              v.vz = (v.vz || 0) + Math.cos(v.yaw || 0) * gas * 15.0 * dt;
            } else if (brk > 0.05) {
              v.vx = (v.vx || 0) - Math.sin(v.yaw || 0) * brk * 9.5 * dt;
              v.vz = (v.vz || 0) - Math.cos(v.yaw || 0) * brk * 9.5 * dt;
            }
          }
          if (v.mesh) v.mesh.position.y = v.y;
        }
      }
    }

    // 5. Bích Thủy Kênh Skatepark Halfpipe (+3.40m Curved Lip) Vertical Launch Assist for Motorcycles & Cars!
    if (pCar && !pCar.isHeli && !pCar.isBoat) {
      const cx = pCar.x;
      const cz = pCar.z;
      if (cx >= -176.0 && cx <= -142.0 && cz >= 35.0 && cz <= 69.0) {
        const spd = Math.hypot(pCar.vx || 0, pCar.vz || 0);
        const rampY = evalSkateparkHeight(cx, cz) ?? 0.2;
        const distCenter = Math.abs(cx - (-159.0));
        const movingOutward = (cx < -159.0 && (pCar.vx || 0) < -6.5) || (cx > -159.0 && (pCar.vx || 0) > 6.5);

        // Launch vertically when cresting the upper curved Halfpipe lip (`y >= 2.55m`) at speed!
        if (movingOutward && distCenter >= 11.4 && distCenter <= 13.9 && rampY >= 2.55 && spd > 9.5) {
          const vertBoost = clamp(spd * 0.68, 7.5, 19.5);
          if (pCar.isMotorcycle) {
            pCar.suspVelY = Math.max(pCar.suspVelY || 0, vertBoost);
          } else {
            pCar.vy = Math.max(pCar.vy || 0, vertBoost);
            pCar.isGrounded = false;
          }
          wasAirborneOverSkatepark = true;
          skatePeakY = Math.max(skatePeakY, pCar.y || rampY);
        }

        if (wasAirborneOverSkatepark) {
          skatePeakY = Math.max(skatePeakY, pCar.y || 0);
          if ((pCar.y || 0) <= rampY + 0.35 && skatePeakY >= 4.6) {
            wasAirborneOverSkatepark = false;
            if (skateAirToastCooldown <= 0) {
              skateAirToastCooldown = 6.0;
              const airM = (skatePeakY - (-0.32)).toFixed(1);
              activeCtx?.ui?.showNotification?.(`🛹 SKATEPARK VERT AIR: Bay cao ${airM}m trên lòng chảo Halfpipe!`, 'green');
            }
            skatePeakY = 0;
          }
        }
      } else {
        wasAirborneOverSkatepark = false;
        skatePeakY = 0;
      }
    }

    // 6. Interactive Muscle Sands Beach Gym Workout (`[G]`) & Mansion Infinity Pool Dip Regeneration!
    if (p && !p.inCar && !activeCtx?.activeModal && !activeCtx?.paused) {
      // Muscle Sands Gym at `(-148, 0.28, -48)`
      if (Math.abs(p.x - (-148.0)) <= 9.5 && Math.abs(p.z - (-48.0)) <= 10.5 && gymCooldown <= 0) {
        activeCtx?.ui?.showPrompt?.('💪 Nhấn [G] tập thể hình tại Muscle Sands (+100% Thể Lực & Hồi Máu)', 0.2);
        const inp = activeCtx?.input || {};
        const k = inp.keys || {};
        if (inp.interactGJustPressed || inp.secondaryInteractJustPressed || k.KeyG || k.g) {
          gymCooldown = 5.0;
          p.hp = p.maxHp || 100;
          if (typeof p.stamina === 'number') p.stamina = p.maxStamina || 100;
          if (typeof p.sprintStamina === 'number') p.sprintStamina = 100;
          activeCtx?.audio?.playPhoneConfirm?.();
          activeCtx?.ui?.showNotification?.('💪 Đã bơm cơ tại Muscle Sands Beach Gym! Thể lực & Máu đạt 100%!', 'gold');
        }
      }

      // Cliffside Mansion Infinity Pool dip healing
      for (let mi = 0; mi < STILT_MANSIONS.length; mi++) {
        const mn = STILT_MANSIONS[mi];
        if (p.x >= mn.x - 6.5 && p.x <= mn.x + 6.5 && p.z >= mn.z + 4.2 && p.z <= mn.z + 11.2 && Math.abs((p.y || 0) - (mn.y - 0.58)) < 1.5) {
          p.hp = Math.min(p.maxHp || 100, (p.hp || 100) + 12.0 * dt);
          if (typeof p.special === 'number') {
            p.special = Math.min(p.maxSpecial || 100, p.special + 10.0 * dt);
          }
          if (poolHealTick <= 0) {
            poolHealTick = 2.8;
            activeCtx?.characters?.spawnParticles?.(p.x, mn.y - 0.02, p.z, 'water', 5, 1.6);
            activeCtx?.ui?.showPrompt?.('🌊 Thư giãn tại Hồ Bơi Vô Cực Biệt Thự Đồi Côn Lôn Tiên Sơn (+Hồi Máu & Kỹ Năng)', 1.2);
          }
          break;
        }
      }
    }
  }

  const api = {
    init,
    update,
    getElevation,
    getCeilingHeight,
    getZoneInfo,
    isInsideTunnel,
    isInsideCanalWater,
    aabbs,
    roadNodes,
    roadEdges,
    minimapPolys,
    minimapBlips,
    landmarks: {
      vespucciCanals: { x: -168.0, y: 0.62, z: -182.0 },
      delPerroNeonArch: { x: -130.0, y: 3.80, z: -5.0 },
      muscleSandsGym: { x: -148.0, y: 0.28, z: -48.0 },
      vespucciSkatepark: { x: -159.0, y: 0.35, z: 52.0, halfpipeLipY: 3.40 },
      vinewoodTunnel: { x: 120.0, y: 0.04, z: -294.0, southZ: -212.0, northZ: -375.0, ceilingY: 7.50 },
      mansions: STILT_MANSIONS,
    },
    root: coastHillsRoot,
  };

  if (ctx && typeof ctx === 'object') {
    ctx.mapCoastHills = api;
  }
  return api;
}
