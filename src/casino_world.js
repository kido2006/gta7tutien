import * as THREE from 'three';

// ============================================================================
// GTA: Đại Lộ & Bờ Biển 3D — Vạn Bảo Đổ Phường & Resort + Túy Tiên Lâu Bar
// Module: src/casino_world.js
// Owns:
//   1) Exterior Landmark 1: Vạn Bảo Đổ Phường & Resort (X in [214, 274], Z in [-152, -68])
//      - Entry Corona at (209.5, 0.22, -110), VIP Heist Side Entry at (209.5, 0.22, -92)
//   2) Exterior Landmark 2: Túy Tiên Lâu & Neon Cocktail Bar (X in [-166, -131], Z in [-116, -74])
//      - Entry Corona at (-129.0, 0.22, -95)
//   3) Walk-In 3D Casino Grand Interior at (1200, 0, 1200) (52m x 46m x 9.5m)
//      - Spawn (1200, 0.05, 1219), Exit Ring (1200, 0.05, 1221.5), Podium (1200, 0.4, 1200)
//      - 10 Gambling Station Types (cashier, lucky_wheel, taixiu x2, xocdia x2, roulette x2,
//        blackjack x2, poker, baccarat, slots x12, derby)
//   4) Walk-In 3D Nightclub & Cocktail Bar Interior at (1500, 0, 1500) (38m x 34m x 8.5m)
//      - Spawn (1500, 0.05, 1513), Exit Ring (1500, 0.05, 1515.5)
//      - Beat-Synced LED Dancefloor (1500, 0.03, 1498), Elevated DJ Booth (1500, 0.8, 1487),
//        Cocktail Bar Counter (1485, 0, 1498), 8-Ball Pool (1513, 0, 1504), Darts (1515, 0, 1495),
//        VIP Champagne Booths, Moving-Head Lasers & 18 Dancing Club NPCs
// ============================================================================
export function createCasinoWorld(ctx = {}) {
  // --------------------------------------------------------------------------
  // 1. EXACT ARCHITECTURAL & GAMEPLAY COORDINATE CONSTANTS
  // --------------------------------------------------------------------------
  const CASINO_EXT = Object.freeze({
    minX: 214.0,
    maxX: 274.0,
    minZ: -152.0,
    maxZ: -68.0,
    centerX: 244.0,
    centerZ: -110.0,
    towerHeight: 58.0,
    sidewalkY: 0.22,
    entryCorona: { x: 209.5, y: 0.22, z: -110.0 },
    vipSideCorona: { x: 209.5, y: 0.22, z: -92.0 },
    exitReturnPos: { x: 207.6, y: 0.22, z: -110.0, yaw: -Math.PI * 0.5 },
  });
  const CLUB_EXT = Object.freeze({
    minX: -166.0,
    maxX: -131.0,
    minZ: -116.0,
    maxZ: -74.0,
    centerX: -148.5,
    centerZ: -95.0,
    roofHeight: 14.2,
    terraceY: 0.22,
    entryCorona: { x: -129.0, y: 0.22, z: -95.0 },
    exitReturnPos: { x: -127.2, y: 0.22, z: -95.0, yaw: Math.PI * 0.5 },
  });
  const CASINO_INT = Object.freeze({
    cx: 1200.0,
    cy: 0.0,
    cz: 1200.0,
    width: 52.0,
    depth: 46.0,
    height: 9.5,
    minX: 1174.0,
    maxX: 1226.0,
    minZ: 1177.0,
    maxZ: 1223.0,
    floorY: 0.02,
    mezzY: 3.6,
    spawn: { x: 1200.0, y: 0.05, z: 1219.0, yaw: Math.PI },
    exitRing: { x: 1200.0, y: 0.05, z: 1221.5 },
    podium: { x: 1200.0, y: 0.4, z: 1200.0 },
    vaultDoor: { x: 1200.0, y: 0.02, z: 1177.5 },
  });
  const CLUB_INT = Object.freeze({
    cx: 1500.0,
    cy: 0.0,
    cz: 1500.0,
    width: 38.0,
    depth: 34.0,
    height: 8.5,
    minX: 1481.0,
    maxX: 1519.0,
    minZ: 1483.0,
    maxZ: 1517.0,
    floorY: 0.02,
    djStageY: 0.8,
    vipBoothY: 0.38,
    spawn: { x: 1500.0, y: 0.05, z: 1513.0, yaw: Math.PI },
    exitRing: { x: 1500.0, y: 0.05, z: 1515.5 },
    dancefloor: { x: 1500.0, y: 0.03, z: 1498.0 },
    djBooth: { x: 1500.0, y: 0.8, z: 1487.0 },
    barCounter: { x: 1485.0, y: 0.0, z: 1498.0 },
    poolTable: { x: 1513.0, y: 0.0, z: 1504.0 },
    dartsBoard: { x: 1515.0, y: 0.0, z: 1495.0 },
  });
  const STATION_INTERACT_RADIUS = 2.8;
  const EXTERIOR_LOD_DIST_SQ = 185 * 185;
  // --------------------------------------------------------------------------
  // 2. MATH, PRNG & SAFE CANVAS / NORMAL-MAP GENERATORS
  // --------------------------------------------------------------------------
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;
  function smoothstep(e0, e1, x) {
    const t = clamp((x - e0) / (e1 - e0 || 1), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function wrapAngle(a) {
    let r = a % TAU;
    if (r > Math.PI) r -= TAU;
    if (r < -Math.PI) r += TAU;
    return r;
  }
  function dist2D(x1, z1, x2, z2) {
    return Math.hypot(x1 - x2, z1 - z2);
  }
  function distPointToSegment2D(px, pz, ax, az, bx, bz) {
    const vx = bx - ax;
    const vz = bz - az;
    const lenSq = vx * vx + vz * vz;
    if (lenSq < 1e-8) return Math.hypot(px - ax, pz - az);
    const t = clamp(((px - ax) * vx + (pz - az) * vz) / lenSq, 0, 1);
    return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
  }
  function createCasinoRNG(seed = 88877721) {
    let s = seed >>> 0;
    return function nextRand() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeSafeCanvas(w, h) {
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    }
    return {
      width: w,
      height: h,
      getContext: () => null,
    };
  }
  function createProceduralCanvasTexture(w, h, drawFn, options = {}) {
    const canvas = makeSafeCanvas(w, h);
    const g = canvas.getContext ? canvas.getContext('2d') : null;
    if (g && typeof drawFn === 'function') {
      drawFn(g, w, h);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = options.wrapS || THREE.RepeatWrapping;
    tex.wrapT = options.wrapT || THREE.RepeatWrapping;
    if (options.repeatX || options.repeatY) {
      tex.repeat.set(options.repeatX || 1, options.repeatY || 1);
    }
    if (options.srgb !== false) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    tex.anisotropy = options.anisotropy || 4;
    tex.needsUpdate = true;
    tex.userData.canvas = canvas;
    tex.userData.ctx2d = g;
    return tex;
  }
  function createSobelNormalTexture(w, h, heightFn, strength = 2.2, repeatX = 1, repeatY = 1) {
    const data = new Uint8Array(w * h * 4);
    const heights = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        heights[y * w + x] = heightFn(x / w, y / h, x, y);
      }
    }
    for (let y = 0; y < h; y++) {
      const ym = (y - 1 + h) % h;
      const yp = (y + 1) % h;
      for (let x = 0; x < w; x++) {
        const xm = (x - 1 + w) % w;
        const xp = (x + 1) % w;
        const tl = heights[ym * w + xm];
        const tc = heights[ym * w + x];
        const tr = heights[ym * w + xp];
        const ml = heights[y * w + xm];
        const mr = heights[y * w + xp];
        const bl = heights[yp * w + xm];
        const bc = heights[yp * w + x];
        const br = heights[yp * w + xp];
        const dX = (tr + 2 * mr + br) - (tl + 2 * ml + bl);
        const dY = (bl + 2 * bc + br) - (tl + 2 * tc + tr);
        let nx = -dX * strength;
        let ny = -dY * strength;
        let nz = 1.0;
        const invLen = 1.0 / (Math.hypot(nx, ny, nz) || 1.0);
        nx *= invLen;
        ny *= invLen;
        nz *= invLen;
        const idx = (y * w + x) * 4;
        data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        data[idx + 3] = 255;
      }
    }
    const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.needsUpdate = true;
    return tex;
  }
  // --------------------------------------------------------------------------
  // 3. HIGH-SPEED STATIC GEOMETRY BATCHER (LOW DRAW CALLS, VERTEX COLORS)
  // --------------------------------------------------------------------------
  const _mat4 = new THREE.Matrix4();
  const _quat = new THREE.Quaternion();
  const _euler = new THREE.Euler();
  const _pos = new THREE.Vector3();
  const _scl = new THREE.Vector3();
  function composeMatrix(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    _pos.set(x, y, z);
    _euler.set(rx, ry, rz, 'YXZ');
    _quat.setFromEuler(_euler);
    _scl.set(sx, sy, sz);
    return _mat4.compose(_pos, _quat, _scl).clone();
  }
  function mergeGeometryItems(items) {
    if (!items || items.length === 0) return null;
    let totalVerts = 0;
    let totalIndices = 0;
    let useColors = false;
    for (let i = 0; i < items.length; i++) {
      const g = items[i].geo;
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
    for (let i = 0; i < items.length; i++) {
      const { geo, matrix, color } = items[i];
      if (!geo || !geo.attributes?.position) continue;
      const posAttr = geo.attributes.position;
      const normAttr = geo.attributes.normal;
      const uvAttr = geo.attributes.uv;
      const colAttr = geo.attributes.color;
      const vc = posAttr.count;
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
        const px = posAttr.getX(v);
        const py = posAttr.getY(v);
        const pz = posAttr.getZ(v);
        const b3 = (vOff + v) * 3;
        positions[b3] = m00 * px + m01 * py + m02 * pz + m03;
        positions[b3 + 1] = m10 * px + m11 * py + m12 * pz + m13;
        positions[b3 + 2] = m20 * px + m21 * py + m22 * pz + m23;
        if (normAttr) {
          const nx = normAttr.getX(v);
          const ny = normAttr.getY(v);
          const nz = normAttr.getZ(v);
          const tx = n00 * nx + n01 * ny + n02 * nz;
          const ty = n10 * nx + n11 * ny + n12 * nz;
          const tz = n20 * nx + n21 * ny + n22 * nz;
          const il = 1.0 / (Math.hypot(tx, ty, tz) || 1.0);
          normals[b3] = tx * il;
          normals[b3 + 1] = ty * il;
          normals[b3 + 2] = tz * il;
        } else {
          normals[b3 + 1] = 1;
        }
        if (uvAttr) {
          const b2 = (vOff + v) * 2;
          uvs[b2] = uvAttr.getX(v);
          uvs[b2 + 1] = uvAttr.getY(v);
        }
        if (colors) {
          if (colAttr) {
            colors[b3] = colAttr.getX(v);
            colors[b3 + 1] = colAttr.getY(v);
            colors[b3 + 2] = colAttr.getZ(v);
          } else if (color) {
            colors[b3] = color.r;
            colors[b3 + 1] = color.g;
            colors[b3 + 2] = color.b;
          } else {
            colors[b3] = 1;
            colors[b3 + 1] = 1;
            colors[b3 + 2] = 1;
          }
        }
      }
      if (geo.index) {
        const arr = geo.index.array;
        const ic = geo.index.count;
        for (let k = 0; k < ic; k++) indices[iOff + k] = arr[k] + vOff;
        iOff += ic;
      } else {
        for (let k = 0; k < vc; k++) indices[iOff + k] = vOff + k;
        iOff += vc;
      }
      vOff += vc;
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    if (colors) merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    merged.setIndex(new THREE.BufferAttribute(indices, 1));
    merged.computeBoundingSphere();
    return merged;
  }
  function createBatchBuilder(targetParent) {
    const buckets = new Map();
    let uidCounter = 1;
    const matIds = new WeakMap();
    function getMatId(mat) {
      let id = matIds.get(mat);
      if (!id) {
        id = uidCounter++;
        matIds.set(mat, id);
      }
      return id;
    }
    return {
      add(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, opts = {}) {
        if (!geo || !mat) return;
        const castShadow = Boolean(opts.castShadow);
        const receiveShadow = opts.receiveShadow !== false;
        const color = opts.color instanceof THREE.Color
          ? opts.color
          : typeof opts.color === 'number'
            ? new THREE.Color(opts.color)
            : null;
        const key = `${getMatId(mat)}_${castShadow ? 1 : 0}_${receiveShadow ? 1 : 0}`;
        let bucket = buckets.get(key);
        if (!bucket) {
          bucket = { mat, castShadow, receiveShadow, items: [] };
          buckets.set(key, bucket);
        }
        bucket.items.push({
          geo,
          matrix: composeMatrix(x, y, z, rx, ry, rz, sx, sy, sz),
          color,
        });
      },
      flush(overrideParent) {
        const dst = overrideParent || targetParent;
        const createdMeshes = [];
        for (const bucket of buckets.values()) {
          const merged = mergeGeometryItems(bucket.items);
          if (!merged) continue;
          const mesh = new THREE.Mesh(merged, bucket.mat);
          mesh.castShadow = bucket.castShadow;
          mesh.receiveShadow = bucket.receiveShadow;
          mesh.matrixAutoUpdate = false;
          mesh.updateMatrix();
          if (dst) dst.add(mesh);
          createdMeshes.push(mesh);
        }
        buckets.clear();
        return createdMeshes;
      },
    };
  }
  // Shared Reusable Unit Geometries for Architectural & Prop Sculpting
  const prims = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl8: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
    cyl16: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
    cyl24: new THREE.CylinderGeometry(0.5, 0.5, 1, 24),
    cone8: new THREE.ConeGeometry(0.5, 1, 8),
    cone16: new THREE.ConeGeometry(0.5, 1, 16),
    sphere10: new THREE.SphereGeometry(0.5, 10, 8),
    sphere16: new THREE.SphereGeometry(0.5, 16, 12),
    octa: new THREE.OctahedronGeometry(0.5, 0),
    dodeca: new THREE.DodecahedronGeometry(0.5, 0),
    torus16: new THREE.TorusGeometry(0.5, 0.08, 8, 20),
    torus32: new THREE.TorusGeometry(0.5, 0.05, 10, 32),
    plane: new THREE.PlaneGeometry(1, 1),
    ring24: new THREE.RingGeometry(0.36, 0.5, 24),
    circle24: new THREE.CircleGeometry(0.5, 24),
  };
  // --------------------------------------------------------------------------
  // 4. SPATIAL AABB COLLISION REGISTRIES (EXTERIOR + INTERIOR)
  // --------------------------------------------------------------------------
  const aabbs = [];
  const interiorAABBs = [];
  const stations = [];
  function addExteriorAABB(minX, maxX, minZ, maxZ, maxY, minY = 0, tag = 'casino_ext') {
    if (maxX <= minX || maxZ <= minZ) return null;
    const box = { minX, maxX, minZ, maxZ, maxY, minY, tag, _stamp: 0 };
    aabbs.push(box);
    return box;
  }
  function addInteriorAABB(minX, maxX, minZ, maxZ, maxY, minY = -0.5, tag = 'casino_int') {
    if (maxX <= minX || maxZ <= minZ) return null;
    const box = { minX, maxX, minZ, maxZ, maxY, minY, tag, _stamp: 0 };
    interiorAABBs.push(box);
    return box;
  }
  function registerStation(spec) {
    const entry = {
      type: spec.type,
      station: spec.station || spec.type,
      id: spec.id,
      label: spec.label,
      prompt: spec.prompt || `[F] ${spec.label}`,
      venue: spec.venue || 'casino',
      minBet: Number.isFinite(spec.minBet) ? spec.minBet : 0,
      maxBet: Number.isFinite(spec.maxBet) ? spec.maxBet : 0,
      x: spec.x,
      y: spec.y || 0,
      z: spec.z,
      segAx: spec.segAx,
      segAz: spec.segAz,
      segBx: spec.segBx,
      segBz: spec.segBz,
      areaHalfW: spec.areaHalfW || 0,
      areaHalfD: spec.areaHalfD || 0,
      priority: spec.priority || 1,
      ringMesh: spec.ringMesh || null,
      labelSprite: spec.labelSprite || null,
    };
    stations.push(entry);
    return entry;
  }
  function resolveCircleAgainstList(ent, radius, boxList) {
    if (!ent || !Number.isFinite(ent.x) || !Number.isFinite(ent.z)) {
      return { hit: false, normalX: 0, normalZ: 0 };
    }
    const r = Math.max(0.15, radius || 0.42);
    const entY = Number.isFinite(ent.y) ? ent.y : 0;
    let hit = false;
    let lastNX = 0;
    let lastNZ = 0;
    for (let i = 0; i < boxList.length; i++) {
      const b = boxList[i];
      if (ent.x + r < b.minX || ent.x - r > b.maxX || ent.z + r < b.minZ || ent.z - r > b.maxZ) {
        continue;
      }
      if (entY >= b.maxY - 0.08) continue;
      if ((b.minY || 0) > 0 && entY + 1.82 < b.minY) continue;
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
  }
  function resolveCarAgainstList(car, boxList) {
    if (!car || !Number.isFinite(car.x) || !Number.isFinite(car.z)) {
      return { hit: false, normalX: 0, normalZ: 0, impactSpeed: 0 };
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
    const axesX = [1, 0, ux, fx];
    const axesZ = [0, 1, uz, fz];
    let hit = false;
    let outNX = 0;
    let outNZ = 0;
    for (let i = 0; i < boxList.length; i++) {
      const b = boxList[i];
      if (car.x + boundR < b.minX || car.x - boundR > b.maxX || car.z + boundR < b.minZ || car.z - boundR > b.maxZ) {
        continue;
      }
      if (carY >= b.maxY - 0.15) continue;
      if ((b.minY || 0) > 0 && carY + 2.2 < b.minY) continue;
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
    let impactSpeed = 0;
    if (hit) {
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
  }
  function raycastAgainstList(x1, y1, z1, x2, y2, z2, boxList, maxT = 1.0) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const qMinX = Math.min(x1, x2);
    const qMaxX = Math.max(x1, x2);
    const qMinZ = Math.min(z1, z2);
    const qMaxZ = Math.max(z1, z2);
    let closestT = maxT;
    let hitBox = null;
    let hitNX = 0, hitNY = 0, hitNZ = 0;
    for (let i = 0; i < boxList.length; i++) {
      const b = boxList[i];
      if (b.maxX < qMinX || b.minX > qMaxX || b.maxZ < qMinZ || b.minZ > qMaxZ) continue;
      const bMinY = b.minY || 0;
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
        hitNX = nx;
        hitNY = ny;
        hitNZ = nz;
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
    return { hit: false, t: maxT, x: x2, y: y2, z: z2, normalX: 0, normalY: 1, normalZ: 0, aabb: null };
  }
  // --------------------------------------------------------------------------
  // 5. PROCEDURAL HIGH-DPI PBR CANVASTEXTURE & NORMAL-MAP SUITE
  // --------------------------------------------------------------------------
  function buildCasinoTextureSuite() {
    const rng = createCasinoRNG(20261118);
    // 5.1 Ornate Royal Damask & Gold Filigree Casino Carpet + Woven Normal Map
    const royalCarpet = createProceduralCanvasTexture(512, 512, (g, w, h) => {
      const baseGrad = g.createRadialGradient(w * 0.5, h * 0.5, 24, w * 0.5, h * 0.5, w * 0.72);
      baseGrad.addColorStop(0, '#3e0b2c');
      baseGrad.addColorStop(0.55, '#290721');
      baseGrad.addColorStop(1, '#1a0416');
      g.fillStyle = baseGrad;
      g.fillRect(0, 0, w, h);
      // Subtle velvet fiber grain
      for (let i = 0; i < 4200; i++) {
        const gx = (i * 97) % w;
        const gy = (i * 179) % h;
        g.fillStyle = i % 2 === 0 ? 'rgba(120, 22, 74, 0.16)' : 'rgba(20, 3, 18, 0.22)';
        g.fillRect(gx, gy, 2, 2);
      }
      // Gold Art-Deco geometric diamond lattice
      g.strokeStyle = 'rgba(218, 175, 68, 0.42)';
      g.lineWidth = 3;
      const cell = 128;
      for (let y = 0; y <= h; y += cell) {
        for (let x = 0; x <= w; x += cell) {
          const cx = x + cell * 0.5;
          const cy = y + cell * 0.5;
          g.beginPath();
          g.moveTo(cx, y + 8);
          g.lineTo(x + cell - 8, cy);
          g.lineTo(cx, y + cell - 8);
          g.lineTo(x + 8, cy);
          g.closePath();
          g.stroke();
          // Inner crown rosette medallion
          g.save();
          g.translate(cx, cy);
          g.strokeStyle = 'rgba(245, 206, 102, 0.68)';
          g.lineWidth = 2;
          g.beginPath();
          g.arc(0, 0, 24, 0, TAU);
          g.stroke();
          for (let p = 0; p < 8; p++) {
            const a = (p / 8) * TAU;
            g.beginPath();
            g.moveTo(Math.cos(a) * 9, Math.sin(a) * 9);
            g.quadraticCurveTo(
              Math.cos(a + 0.22) * 22,
              Math.sin(a + 0.22) * 22,
              Math.cos(a) * 32,
              Math.sin(a) * 32
            );
            g.quadraticCurveTo(
              Math.cos(a - 0.22) * 22,
              Math.sin(a - 0.22) * 22,
              Math.cos(a) * 9,
              Math.sin(a) * 9
            );
            g.fillStyle = p % 2 === 0 ? 'rgba(232, 184, 72, 0.52)' : 'rgba(176, 42, 118, 0.48)';
            g.fill();
          }
          g.fillStyle = '#f6d36b';
          g.beginPath();
          g.moveTo(0, -10);
          g.lineTo(7, 0);
          g.lineTo(0, 10);
          g.lineTo(-7, 0);
          g.closePath();
          g.fill();
          g.restore();
        }
      }
      // Corner filigree scrolls
      g.strokeStyle = 'rgba(238, 194, 88, 0.34)';
      g.lineWidth = 1.8;
      for (let y = 0; y <= h; y += cell) {
        for (let x = 0; x <= w; x += cell) {
          g.beginPath();
          g.arc(x, y, 22, 0, TAU);
          g.stroke();
        }
      }
    }, { repeatX: 10, repeatY: 9 });
    const royalCarpetNormal = createSobelNormalTexture(128, 128, (u, v) => {
      const weave = Math.sin(u * TAU * 32) * Math.cos(v * TAU * 32) * 0.35;
      const emboss = Math.abs(Math.sin((u + v) * TAU * 2)) * 0.65;
      return weave + emboss;
    }, 1.5, 10, 9);
    // 5.2 Reflective Calacatta White & Gold Marble Floor Slab Texture + Bevel Normal
    const calacattaMarble = createProceduralCanvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#f2efe9';
      g.fillRect(0, 0, w, h);
      // Soft warm mineral clouds
      for (let i = 0; i < 28; i++) {
        const cx = rng() * w;
        const cy = rng() * h;
        const rad = 50 + rng() * 110;
        const mg = g.createRadialGradient(cx, cy, 4, cx, cy, rad);
        mg.addColorStop(0, i % 3 === 0 ? 'rgba(218, 198, 158, 0.20)' : 'rgba(195, 202, 212, 0.22)');
        mg.addColorStop(1, 'rgba(242, 239, 233, 0)');
        g.fillStyle = mg;
        g.fillRect(0, 0, w, h);
      }
      // Organic diagonal marble veins (grey + 24K gold veins)
      for (let v = 0; v < 22; v++) {
        g.beginPath();
        let vx = rng() * w;
        let vy = 0;
        g.moveTo(vx, vy);
        for (let step = 1; step <= 16; step++) {
          vy = (step / 16) * h;
          vx += Math.sin(step * 0.9 + v) * 18 + (rng() - 0.42) * 16;
          g.lineTo(vx, vy);
        }
        g.strokeStyle = v % 4 === 0 ? 'rgba(202, 158, 58, 0.42)' : 'rgba(138, 144, 154, 0.28)';
        g.lineWidth = v % 4 === 0 ? 2.4 : 1.5;
        g.stroke();
      }
      // Inlaid Art-Deco brass grout borders (2x2 large luxury slabs)
      const tile = 256;
      g.strokeStyle = '#c8a246';
      g.lineWidth = 3;
      for (let y = 0; y <= h; y += tile) {
        g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
      }
      for (let x = 0; x <= w; x += tile) {
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
      }
      for (let y = 0; y < h; y += tile) {
        for (let x = 0; x < w; x += tile) {
          g.strokeStyle = 'rgba(198, 158, 62, 0.45)';
          g.lineWidth = 1.5;
          g.strokeRect(x + 14, y + 14, tile - 28, tile - 28);
        }
      }
    }, { repeatX: 6, repeatY: 6 });
    const marbleNormal = createSobelNormalTexture(128, 128, (u, v) => {
      const gx = Math.min(u * 2 - Math.floor(u * 2), 1 - (u * 2 - Math.floor(u * 2)));
      const gy = Math.min(v * 2 - Math.floor(v * 2), 1 - (v * 2 - Math.floor(v * 2)));
      const edge = Math.min(gx, gy) < 0.025 ? 0.2 : 1.0;
      return edge;
    }, 1.8, 6, 6);
    // 5.3 Nero Marquina Black Gold-Veined Marble (Podium, Bar & VIP Stage)
    const blackGoldMarble = createProceduralCanvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#0c0e14';
      g.fillRect(0, 0, w, h);
      for (let v = 0; v < 26; v++) {
        g.beginPath();
        let x = rng() * w;
        let y = rng() * h * 0.2;
        g.moveTo(x, y);
        for (let s = 1; s <= 14; s++) {
          y += h / 14;
          x += (rng() - 0.46) * 32;
          g.lineTo(x, y);
        }
        g.strokeStyle = v % 3 === 0 ? 'rgba(235, 188, 72, 0.55)' : 'rgba(220, 228, 240, 0.16)';
        g.lineWidth = v % 3 === 0 ? 2.2 : 1.1;
        g.stroke();
      }
      g.strokeStyle = 'rgba(212, 168, 56, 0.36)';
      g.lineWidth = 2;
      g.strokeRect(4, 4, w - 8, h - 8);
    }, { repeatX: 4, repeatY: 4 });
    // 5.4 Art-Deco Curved Gold & Royal Glass Skyscraper Facade + Night Emissive
    const litSuites = [];
    for (let i = 0; i < 16 * 10; i++) litSuites.push(rng() < 0.64);
    const casinoFacade = createProceduralCanvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#121624';
      g.fillRect(0, 0, w, h);
      const cols = 8;
      const rows = 12;
      const cw = w / cols;
      const ch = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const lit = litSuites[(r * cols + c) % litSuites.length];
          const x = c * cw;
          const y = r * ch;
          // Gold Art-Deco spandrel & vertical mullion frame
          g.fillStyle = '#b99136';
          g.fillRect(x, y, cw, ch);
          g.fillStyle = '#192238';
          g.fillRect(x + 3, y + 4, cw - 6, ch - 8);
          const winGrad = g.createLinearGradient(x, y + 5, x, y + ch - 5);
          if (lit) {
            winGrad.addColorStop(0, r % 3 === 0 ? '#ffd88a' : '#f5c4ff');
            winGrad.addColorStop(0.55, r % 3 === 0 ? '#d89b44' : '#7b39a8');
            winGrad.addColorStop(1, '#261a38');
          } else {
            winGrad.addColorStop(0, '#223654');
            winGrad.addColorStop(1, '#0d1526');
          }
          g.fillStyle = winGrad;
          g.fillRect(x + 6, y + 6, cw - 12, ch - 12);
          // Art-Deco chevron spandrel crown at top of window
          g.strokeStyle = '#f2cc6b';
          g.lineWidth = 1.4;
          g.beginPath();
          g.moveTo(x + 6, y + 12);
          g.lineTo(x + cw * 0.5, y + 6);
          g.lineTo(x + cw - 6, y + 12);
          g.stroke();
        }
      }
    }, { repeatX: 3, repeatY: 6 });
    const casinoFacadeEmissive = createProceduralCanvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#000000';
      g.fillRect(0, 0, w, h);
      const cols = 8;
      const rows = 12;
      const cw = w / cols;
      const ch = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const lit = litSuites[(r * cols + c) % litSuites.length];
          if (!lit) continue;
          g.fillStyle = r % 3 === 0 ? '#ffcf78' : '#d56bff';
          g.fillRect(c * cw + 7, r * ch + 7, cw - 14, ch - 14);
        }
      }
    }, { repeatX: 3, repeatY: 6 });
    // 5.5 Túy Tiên Lâu Fluted Dark-Slate Facade + Acoustic Rib Normal Map
    const clubSlate = createProceduralCanvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#12151d';
      g.fillRect(0, 0, w, h);
      const slats = 16;
      const sw = w / slats;
      for (let i = 0; i < slats; i++) {
        const shade = 20 + ((i * 7) % 10);
        g.fillStyle = `rgb(${shade}, ${shade + 3}, ${shade + 10})`;
        g.fillRect(i * sw + 2, 0, sw - 3, h);
        g.fillStyle = '#07090e';
        g.fillRect(i * sw, 0, 2, h);
      }
      for (let y = 0; y < h; y += 64) {
        g.fillStyle = '#1e2433';
        g.fillRect(0, y, w, 3);
      }
    }, { repeatX: 4, repeatY: 3 });
    const clubSlateNormal = createSobelNormalTexture(128, 128, (u) => {
      return Math.sin(u * TAU * 16) * 0.5 + 0.5;
    }, 2.4, 4, 3);
    // 5.6 Authentic Casino Table Betting Layouts (Tai Xiu, Xoc Dia, Roulette, Blackjack, Poker, Baccarat)
    const taixiuBoard = createProceduralCanvasTexture(512, 256, (g, w, h) => {
      g.fillStyle = '#6e0916';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#f5cb5c';
      g.lineWidth = 6;
      g.strokeRect(8, 8, w - 16, h - 16);
      g.lineWidth = 2;
      g.strokeRect(16, 16, w - 32, h - 32);
      // Left Box: TÀI (11-17)
      g.fillStyle = '#99111f';
      g.fillRect(26, 28, 152, 118);
      g.strokeStyle = '#ffd666';
      g.strokeRect(26, 28, 152, 118);
      g.fillStyle = '#ffe380';
      g.font = 'bold 42px sans-serif';
      g.textAlign = 'center';
      g.fillText('TÀI', 102, 82);
      g.font = 'bold 18px sans-serif';
      g.fillStyle = '#ffffff';
      g.fillText('11 – 17 (1:1)', 102, 116);
      // Center Box: BỘ BA BẤT KỲ / BÃO
      g.fillStyle = '#3b0a18';
      g.fillRect(186, 28, 140, 118);
      g.strokeRect(186, 28, 140, 118);
      g.fillStyle = '#ffcf54';
      g.font = 'bold 20px sans-serif';
      g.fillText('BÃO BỘ BA', 256, 66);
      g.font = 'bold 16px sans-serif';
      g.fillStyle = '#ff85a2';
      g.fillText('1 ĂN 30 / 150', 256, 98);
      g.fillStyle = '#ffe9a6';
      g.fillText('CHẴN • LẺ', 256, 128);
      // Right Box: XỈU (4-10)
      g.fillStyle = '#12264a';
      g.fillRect(334, 28, 152, 118);
      g.strokeRect(334, 28, 152, 118);
      g.fillStyle = '#7ce8ff';
      g.font = 'bold 42px sans-serif';
      g.fillText('XỈU', 410, 82);
      g.font = 'bold 18px sans-serif';
      g.fillStyle = '#ffffff';
      g.fillText('4 – 10 (1:1)', 410, 116);
      // Bottom Totals 4..17 Row
      const nums = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
      const cellW = (w - 52) / nums.length;
      for (let i = 0; i < nums.length; i++) {
        const nx = 26 + i * cellW;
        g.fillStyle = i % 2 === 0 ? '#520b16' : '#3d0811';
        g.fillRect(nx, 156, cellW - 2, 74);
        g.strokeStyle = '#e8be52';
        g.lineWidth = 1.5;
        g.strokeRect(nx, 156, cellW - 2, 74);
        g.fillStyle = '#ffe58f';
        g.font = 'bold 17px sans-serif';
        g.fillText(String(nums[i]), nx + cellW * 0.5 - 1, 192);
      }
    }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
    const xocdiaMat = createProceduralCanvasTexture(512, 256, (g, w, h) => {
      g.fillStyle = '#780b18';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#f4ca59';
      g.lineWidth = 6;
      g.strokeRect(10, 10, w - 20, h - 20);
      // CHẴN / LẺ main circles
      const spots = [
        { x: 118, y: 98, r: 62, title: 'CHẴN', sub: '1 ĂN 1', bg: '#9e1422' },
        { x: 394, y: 98, r: 62, title: 'LẺ', sub: '1 ĂN 1', bg: '#16305c' },
      ];
      for (const s of spots) {
        g.beginPath();
        g.arc(s.x, s.y, s.r, 0, TAU);
        g.fillStyle = s.bg;
        g.fill();
        g.lineWidth = 3.5;
        g.strokeStyle = '#ffd86b';
        g.stroke();
        g.fillStyle = '#fff0a8';
        g.font = 'bold 30px sans-serif';
        g.textAlign = 'center';
        g.fillText(s.title, s.x, s.y + 4);
        g.font = 'bold 15px sans-serif';
        g.fillStyle = '#ffffff';
        g.fillText(s.sub, s.x, s.y + 30);
      }
      // Center dragon crest ring for porcelain plate
      g.beginPath();
      g.arc(256, 98, 52, 0, TAU);
      g.strokeStyle = '#f8d264';
      g.lineWidth = 3;
      g.stroke();
      g.font = 'bold 16px sans-serif';
      g.fillStyle = '#ffd86b';
      g.textAlign = 'center';
      g.fillText('XÓC ĐĨA VIP', 256, 103);
      // Bottom 4 exact-color combinations: 4 Đỏ, 3 Đỏ 1 Trắng, 3 Trắng 1 Đỏ, 4 Trắng
      const combos = [
        { label: '4 ĐỎ (1:12)', dots: [1, 1, 1, 1] },
        { label: '3 ĐỎ 1 TRẮNG', dots: [1, 1, 1, 0] },
        { label: '3 TRẮNG 1 ĐỎ', dots: [0, 0, 0, 1] },
        { label: '4 TRẮNG (1:12)', dots: [0, 0, 0, 0] },
      ];
      const bw = (w - 48) / 4;
      for (let i = 0; i < 4; i++) {
        const bx = 24 + i * bw;
        g.fillStyle = '#4e0711';
        g.fillRect(bx + 3, 174, bw - 6, 60);
        g.strokeStyle = '#e5bd54';
        g.lineWidth = 1.8;
        g.strokeRect(bx + 3, 174, bw - 6, 60);
        for (let d = 0; d < 4; d++) {
          g.beginPath();
          g.arc(bx + 26 + d * 19, 194, 7, 0, TAU);
          g.fillStyle = combos[i].dots[d] ? '#e62229' : '#f5f7fa';
          g.fill();
          g.strokeStyle = '#d4af37';
          g.lineWidth = 1;
          g.stroke();
        }
        g.fillStyle = '#ffe596';
        g.font = 'bold 12px sans-serif';
        g.fillText(combos[i].label, bx + bw * 0.5, 224);
      }
    }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
    const rouletteGrid = createProceduralCanvasTexture(512, 256, (g, w, h) => {
      g.fillStyle = '#0b5d34';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#e8c45a';
      g.lineWidth = 4;
      g.strokeRect(6, 6, w - 12, h - 12);
      // Green Zero wedge on left
      g.fillStyle = '#128246';
      g.fillRect(18, 22, 46, 150);
      g.strokeStyle = '#ffffff';
      g.lineWidth = 2;
      g.strokeRect(18, 22, 46, 150);
      g.fillStyle = '#ffffff';
      g.font = 'bold 28px sans-serif';
      g.textAlign = 'center';
      g.fillText('0', 41, 108);
      const redSet = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
      const cw = (w - 90) / 12;
      const ch = 50;
      for (let col = 0; col < 12; col++) {
        for (let row = 0; row < 3; row++) {
          const num = col * 3 + (3 - row);
          const x = 66 + col * cw;
          const y = 22 + row * ch;
          g.fillStyle = redSet.has(num) ? '#c41e24' : '#14171f';
          g.fillRect(x, y, cw, ch);
          g.strokeStyle = '#f0f4f8';
          g.lineWidth = 1.6;
          g.strokeRect(x, y, cw, ch);
          g.fillStyle = '#ffffff';
          g.font = 'bold 17px sans-serif';
          g.fillText(String(num), x + cw * 0.5, y + 31);
        }
      }
      // Outside Bets Row (1-18, EVEN, RED, BLACK, ODD, 19-36)
      const outs = [
        { t: '1–18', bg: '#0e6b3c' },
        { t: 'CHẴN', bg: '#0e6b3c' },
        { t: 'ĐỎ', bg: '#c41e24' },
        { t: 'ĐEN', bg: '#14171f' },
        { t: 'LẺ', bg: '#0e6b3c' },
        { t: '19–36', bg: '#0e6b3c' },
      ];
      const ow = (w - 90) / 6;
      for (let i = 0; i < 6; i++) {
        const ox = 66 + i * ow;
        g.fillStyle = outs[i].bg;
        g.fillRect(ox, 178, ow, 52);
        g.strokeStyle = '#f5d778';
        g.lineWidth = 2;
        g.strokeRect(ox, 178, ow, 52);
        g.fillStyle = '#ffffff';
        g.font = 'bold 16px sans-serif';
        g.fillText(outs[i].t, ox + ow * 0.5, 210);
      }
    }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
    const blackjackFelt = createProceduralCanvasTexture(512, 256, (g, w, h) => {
      const grad = g.createRadialGradient(w * 0.5, 20, 20, w * 0.5, h * 0.6, w * 0.65);
      grad.addColorStop(0, '#147a46');
      grad.addColorStop(1, '#084726');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#f2cc60';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(w * 0.5, -20, 225, 0.22 * Math.PI, 0.78 * Math.PI);
      g.stroke();
      g.beginPath();
      g.arc(w * 0.5, -20, 175, 0.22 * Math.PI, 0.78 * Math.PI);
      g.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = '#ffe484';
      g.font = 'bold 24px sans-serif';
      g.textAlign = 'center';
      g.fillText('XÌ DÁCH HOÀNG GIA • BLACKJACK 3:2', w * 0.5, 92);
      g.fillStyle = '#d9fbee';
      g.font = 'bold 15px sans-serif';
      g.fillText('NHÀ CÁI DỪNG Ở 17 • BẢO HIỂM 2 ĂN 1', w * 0.5, 126);
      // 5 golden player betting circles along arc
      for (let i = 0; i < 5; i++) {
        const a = lerp(0.28 * Math.PI, 0.72 * Math.PI, i / 4);
        const bx = w * 0.5 + Math.cos(a) * 205;
        const by = -20 + Math.sin(a) * 205;
        g.beginPath();
        g.arc(bx, by, 18, 0, TAU);
        g.strokeStyle = '#ffd666';
        g.lineWidth = 3;
        g.stroke();
      }
    }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
    const pokerFelt = createProceduralCanvasTexture(512, 256, (g, w, h) => {
      const grad = g.createRadialGradient(w * 0.5, h * 0.5, 16, w * 0.5, h * 0.5, w * 0.55);
      grad.addColorStop(0, '#135f4c');
      grad.addColorStop(1, '#082c24');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#eab949';
      g.lineWidth = 4;
      g.strokeRect(24, 24, w - 48, h - 48);
      g.fillStyle = '#ffe17d';
      g.font = 'bold 22px sans-serif';
      g.textAlign = 'center';
      g.fillText('DIAMOND VIP • TEXAS HOLD\'EM POKER', w * 0.5, 68);
      // 5 Community Card Slots in center
      for (let c = 0; c < 5; c++) {
        const cx = 132 + c * 52;
        g.strokeStyle = 'rgba(255, 224, 128, 0.75)';
        g.lineWidth = 2;
        g.strokeRect(cx, 96, 40, 58);
      }
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.font = 'bold 14px sans-serif';
      g.fillText('NO-LIMIT HIGH ROLLER TABLE', w * 0.5, 190);
    }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
    const baccaratFelt = createProceduralCanvasTexture(512, 256, (g, w, h) => {
      g.fillStyle = '#4e0d2e';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#f6ce62';
      g.lineWidth = 5;
      g.strokeRect(12, 12, w - 24, h - 24);
      const zones = [
        { x: 28, y: 34, zw: 146, zh: 188, t: 'NHÀ CON', sub: 'PLAYER 1:1', col: '#1b4a8c' },
        { x: 184, y: 34, zw: 144, zh: 188, t: 'HÒA (TIE)', sub: '1 ĂN 8', col: '#136b3e' },
        { x: 338, y: 34, zw: 146, zh: 188, t: 'NHÀ CÁI', sub: 'BANKER 0.95', col: '#991826' },
      ];
      for (const zn of zones) {
        g.fillStyle = zn.col;
        g.fillRect(zn.x, zn.y, zn.zw, zn.zh);
        g.strokeStyle = '#ffd86b';
        g.lineWidth = 2.5;
        g.strokeRect(zn.x, zn.y, zn.zw, zn.zh);
        g.fillStyle = '#fff0a6';
        g.font = 'bold 22px sans-serif';
        g.textAlign = 'center';
        g.fillText(zn.t, zn.x + zn.zw * 0.5, 118);
        g.fillStyle = '#ffffff';
        g.font = 'bold 15px sans-serif';
        g.fillText(zn.sub, zn.x + zn.zw * 0.5, 150);
      }
    }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
    // 5.7 Slot Machine Cylindrical Reel Strip ("777", Diamond, Crown, BAR, Cherry, Bell)
    const slotReelStrip = createProceduralCanvasTexture(128, 512, (g, w, h) => {
      g.fillStyle = '#fffdf7';
      g.fillRect(0, 0, w, h);
      const symbols = [
        { txt: '777', col: '#d91628', sub: 'JACKPOT', bg: '#fff3c4' },
        { txt: '💎', col: '#00a8e8', sub: 'DIAMOND', bg: '#eefaff' },
        { txt: '👑', col: '#d49a1a', sub: 'CROWN', bg: '#fff8e1' },
        { txt: 'BAR', col: '#181c26', sub: 'TRIPLE', bg: '#f0f2f7' },
        { txt: '🍒', col: '#c9184a', sub: 'CHERRY', bg: '#fff0f3' },
        { txt: '🔔', col: '#e09f1f', sub: 'GOLD BELL', bg: '#fff9e6' },
      ];
      const sh = h / symbols.length;
      for (let i = 0; i < symbols.length; i++) {
        const sy = i * sh;
        g.fillStyle = symbols[i].bg;
        g.fillRect(4, sy + 2, w - 8, sh - 4);
        g.strokeStyle = '#d4af37';
        g.lineWidth = 3;
        g.strokeRect(4, sy + 2, w - 8, sh - 4);
        g.fillStyle = symbols[i].col;
        g.font = 'bold 34px sans-serif';
        g.textAlign = 'center';
        g.fillText(symbols[i].txt, w * 0.5, sy + 48);
        g.font = 'bold 12px sans-serif';
        g.fillStyle = '#333a48';
        g.fillText(symbols[i].sub, w * 0.5, sy + 70);
      }
    });
    // 5.8 20-Slice Diamond Vòng Quay Thiên Mệnh Graphic Disc
    const luckyWheelFace = createProceduralCanvasTexture(1024, 1024, (g, w, h) => {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const rad = w * 0.48;
      const palette = [
        '#e63946', '#7209b7', '#f4a261', '#0096c7', '#2a9d8f',
        '#d90429', '#3a0ca3', '#e9c46a', '#00b4d8', '#8338ec',
      ];
      const labels = [
        'SIÊU XE PODIUM', '5,000 PHỈNH', '$10,000', 'RP VIP +500', 'BÍ ẨN ★',
        '15,000 PHỈNH', '$5,000', '2,500 PHỈNH', 'ÁO VEST VIP', '25,000 PHỈNH',
        'JACKPOT 50K', '1,500 PHỈNH', '$15,000', 'RP VIP +1000', 'VŨ KHÍ VÀNG',
        '10,000 PHỈNH', '$7,500', '3,000 PHỈNH', 'THẺ KIM CƯƠNG', '30,000 PHỈNH',
      ];
      g.fillStyle = '#12091c';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 20; i++) {
        const a0 = (i / 20) * TAU - Math.PI * 0.5;
        const a1 = ((i + 1) / 20) * TAU - Math.PI * 0.5;
        const amid = (a0 + a1) * 0.5;
        g.beginPath();
        g.moveTo(cx, cy);
        g.arc(cx, cy, rad, a0, a1);
        g.closePath();
        g.fillStyle = i === 0 ? '#f5b700' : palette[i % palette.length];
        g.fill();
        g.lineWidth = 4;
        g.strokeStyle = '#ffe999';
        g.stroke();
        g.save();
        g.translate(cx, cy);
        g.rotate(amid);
        g.fillStyle = i === 0 ? '#1c0f00' : '#ffffff';
        g.font = i === 0 ? 'bold 25px sans-serif' : 'bold 22px sans-serif';
        g.textAlign = 'right';
        g.fillText(labels[i], rad - 28, 8);
        g.restore();
      }
      // Center Gold Diamond Medallion
      g.beginPath();
      g.arc(cx, cy, 108, 0, TAU);
      g.fillStyle = '#1d0c30';
      g.fill();
      g.lineWidth = 10;
      g.strokeStyle = '#ffd55a';
      g.stroke();
      g.fillStyle = '#ffe484';
      g.font = 'bold 34px sans-serif';
      g.textAlign = 'center';
      g.fillText('DIAMOND', cx, cy - 6);
      g.font = 'bold 24px sans-serif';
      g.fillText('20 Ô VIP', cx, cy + 28);
    }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
    // 5.9 20-Sector Electronic Pub Dartboard Texture
    const dartboardFace = createProceduralCanvasTexture(512, 512, (g, w, h) => {
      const cx = w * 0.5;
      const cy = h * 0.5;
      g.fillStyle = '#0d0f14';
      g.fillRect(0, 0, w, h);
      const nums = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
      for (let i = 0; i < 20; i++) {
        const a0 = ((i - 0.5) / 20) * TAU - Math.PI * 0.5;
        const a1 = ((i + 0.5) / 20) * TAU - Math.PI * 0.5;
        const isEven = i % 2 === 0;
        // Main single sector
        g.beginPath();
        g.moveTo(cx, cy);
        g.arc(cx, cy, 196, a0, a1);
        g.closePath();
        g.fillStyle = isEven ? '#161922' : '#f2ead8';
        g.fill();
        // Outer Double Ring
        g.beginPath();
        g.arc(cx, cy, 196, a0, a1);
        g.arc(cx, cy, 178, a1, a0, true);
        g.closePath();
        g.fillStyle = isEven ? '#d62828' : '#1b9e4b';
        g.fill();
        // Inner Triple Ring
        g.beginPath();
        g.arc(cx, cy, 122, a0, a1);
        g.arc(cx, cy, 106, a1, a0, true);
        g.closePath();
        g.fillStyle = isEven ? '#d62828' : '#1b9e4b';
        g.fill();
        // Sector wire & number
        g.strokeStyle = '#c8d0dc';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(a0) * 198, cy + Math.sin(a0) * 198);
        g.stroke();
        const amid = (a0 + a1) * 0.5;
        g.fillStyle = '#00f0ff';
        g.font = 'bold 22px sans-serif';
        g.textAlign = 'center';
        g.fillText(String(nums[i]), cx + Math.cos(amid) * 224, cy + Math.sin(amid) * 224 + 8);
      }
      // Outer & Inner Bullseye
      g.beginPath(); g.arc(cx, cy, 26, 0, TAU); g.fillStyle = '#1b9e4b'; g.fill();
      g.beginPath(); g.arc(cx, cy, 12, 0, TAU); g.fillStyle = '#e61e2a'; g.fill();
    }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
    // 5.10 Tournament 8-Ball Pool Table Emerald-Cyan Baize Texture
    const poolBaize = createProceduralCanvasTexture(512, 256, (g, w, h) => {
      const grad = g.createRadialGradient(w * 0.5, h * 0.5, 20, w * 0.5, h * 0.5, w * 0.6);
      grad.addColorStop(0, '#0f7c59');
      grad.addColorStop(1, '#084b36');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      // Head-string line & foot-spot
      g.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(w * 0.25, 12);
      g.lineTo(w * 0.25, h - 12);
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.65)';
      g.beginPath(); g.arc(w * 0.25, h * 0.5, 4, 0, TAU); g.fill();
      g.beginPath(); g.arc(w * 0.75, h * 0.5, 4, 0, TAU); g.fill();
      g.fillStyle = 'rgba(0, 240, 255, 0.22)';
      g.font = 'bold 20px sans-serif';
      g.textAlign = 'center';
      g.fillText('CLUB ECLIPSE • 8-BALL CHAMPIONSHIP', w * 0.5, h * 0.5 + 7);
    }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
    // 5.11 Live Animated Inside-Track Derby LED Screen Texture (updated dynamically!)
    const derbyLiveScreen = createProceduralCanvasTexture(512, 256, (g, w, h) => {
      g.fillStyle = '#071426';
      g.fillRect(0, 0, w, h);
    }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
    return {
      royalCarpet,
      royalCarpetNormal,
      calacattaMarble,
      marbleNormal,
      blackGoldMarble,
      casinoFacade,
      casinoFacadeEmissive,
      clubSlate,
      clubSlateNormal,
      taixiuBoard,
      xocdiaMat,
      rouletteGrid,
      blackjackFelt,
      pokerFelt,
      baccaratFelt,
      slotReelStrip,
      luckyWheelFace,
      dartboardFace,
      poolBaize,
      derbyLiveScreen,
    };
  }
  // Helper to redraw the Live Inside-Track Derby Wall Screen periodically in-world
  const DERBY_RACERS = [
    { num: 1, name: 'TIA CHỚP VÀNG', color: '#ffd147', odds: '2:1', speedBias: 1.06 },
    { num: 2, name: 'BÓNG ĐÊM VINEWOOD', color: '#ff3864', odds: '3:1', speedBias: 1.01 },
    { num: 3, name: 'SIÊU BÃO PACIFIC', color: '#00e5ff', odds: '5:1', speedBias: 0.98 },
    { num: 4, name: 'KIM CƯƠNG ĐỎ', color: '#b5179e', odds: '8:1', speedBias: 0.95 },
    { num: 5, name: 'CHIẾN MÃ DEL PERRO', color: '#2ec4b6', odds: '14:1', speedBias: 0.92 },
    { num: 6, name: 'Hỏa LONG 777', color: '#ff9f1c', odds: '24:1', speedBias: 0.89 },
  ];
  function redrawDerbyLiveScreen(tex, elapsed) {
    const g = tex?.userData?.ctx2d;
    const canvas = tex?.userData?.canvas;
    if (!g || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    // Sky & grandstand header
    g.fillStyle = '#091529';
    g.fillRect(0, 0, w, 52);
    g.fillStyle = '#ffd55a';
    g.font = 'bold 20px sans-serif';
    g.textAlign = 'left';
    g.fillText('🏇 INSIDE TRACK • ĐUA SIÊU TỐC TRỰC TIẾP', 16, 33);
    g.fillStyle = '#38f2af';
    g.font = 'bold 16px sans-serif';
    g.textAlign = 'right';
    const raceNum = (Math.floor(elapsed / 18) % 99) + 1;
    g.fillText(`CHẶNG #${raceNum}`, w - 16, 33);
    // Green turf & asphalt track lanes
    g.fillStyle = '#134e2a';
    g.fillRect(0, 52, w, h - 52);
    const scroll = (elapsed * 180) % 64;
    g.strokeStyle = 'rgba(255,255,255,0.22)';
    g.lineWidth = 2;
    for (let x = -scroll; x < w; x += 64) {
      g.beginPath();
      g.moveTo(x, 52);
      g.lineTo(x, h);
      g.stroke();
    }
    // Checkered finish stripe on right
    const finX = w - 42;
    for (let r = 0; r < 12; r++) {
      const rh = (h - 52) / 12;
      g.fillStyle = r % 2 === 0 ? '#ffffff' : '#111111';
      g.fillRect(finX, 52 + r * rh, 8, rh);
      g.fillStyle = r % 2 === 1 ? '#ffffff' : '#111111';
      g.fillRect(finX + 8, 52 + r * rh, 8, rh);
    }
    const cycle = (elapsed % 18) / 18;
    const laneH = (h - 58) / 6;
    for (let i = 0; i < 6; i++) {
      const rc = DERBY_RACERS[i];
      const ly = 56 + i * laneH;
      g.strokeStyle = 'rgba(255,255,255,0.18)';
      g.beginPath();
      g.moveTo(0, ly + laneH);
      g.lineTo(w, ly + laneH);
      g.stroke();
      const surge = Math.sin(elapsed * 2.7 + i * 1.9) * 26 + Math.cos(elapsed * 1.4 + i * 2.3) * 18;
      const rx = clamp(44 + cycle * (w - 108) * rc.speedBias + surge, 36, w - 34);
      // Racer bolide silhouette + number badge
      g.fillStyle = rc.color;
      g.fillRect(rx - 22, ly + 7, 34, laneH - 14);
      g.fillStyle = '#ffffff';
      g.fillRect(rx + 2, ly + 10, 8, laneH - 20);
      g.fillStyle = 'rgba(7, 15, 28, 0.78)';
      g.fillRect(8, ly + 5, 145, laneH - 10);
      g.fillStyle = rc.color;
      g.font = 'bold 12px sans-serif';
      g.textAlign = 'left';
      g.fillText(`#${rc.num} ${rc.name} (${rc.odds})`, 13, ly + laneH * 0.5 + 4);
    }
    tex.needsUpdate = true;
  }
  // 3D Floating Vietnamese Neon Label Banner & Sign Helper
  function createSignBannerTexture(title, subtitle, opts = {}) {
    const bg = opts.bg || '#10081e';
    const border = opts.border || '#ffd55a';
    const titleColor = opts.titleColor || '#fff2b2';
    const subColor = opts.subColor || '#68f2ff';
    return createProceduralCanvasTexture(512, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const r = 22;
      g.beginPath();
      g.moveTo(r, 8);
      g.lineTo(w - r, 8);
      g.quadraticCurveTo(w - 8, 8, w - 8, r);
      g.lineTo(w - 8, h - r);
      g.quadraticCurveTo(w - 8, h - 8, w - r, h - 8);
      g.lineTo(r, h - 8);
      g.quadraticCurveTo(8, h - 8, 8, h - r);
      g.lineTo(8, r);
      g.quadraticCurveTo(8, 8, r, 8);
      g.closePath();
      g.fillStyle = bg;
      g.fill();
      g.lineWidth = 5;
      g.strokeStyle = border;
      g.stroke();
      g.fillStyle = titleColor;
      g.font = 'bold 31px sans-serif';
      g.textAlign = 'center';
      g.fillText(title, w * 0.5, subtitle ? 56 : 74);
      if (subtitle) {
        g.fillStyle = subColor;
        g.font = 'bold 20px sans-serif';
        g.fillText(subtitle, w * 0.5, 94);
      }
    }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
  }

  function createFloatingStationSprite(title, subtitle, accentHex = '#ffd55a', width = 2.65, height = 0.68) {
    const tex = createSignBannerTexture(title, subtitle, {
      bg: 'rgba(12, 8, 26, 0.90)',
      border: accentHex,
      titleColor: '#ffffff',
      subColor: accentHex,
    });
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(width, height, 1);
    return sprite;
  }

  function createInteractionFloorRing(x, y, z, colorHex = 0xffd55a, innerR = 0.78, outerR = 1.06) {
    const grp = new THREE.Group();
    grp.position.set(x, y + 0.025, z);

    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(innerR, outerR, 28), ringMat);
    ring.rotation.x = -Math.PI * 0.5;
    grp.add(ring);

    const auraMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const aura = new THREE.Mesh(
      new THREE.CylinderGeometry(outerR * 0.95, outerR * 0.95, 1.15, 20, 1, true),
      auraMat
    );
    aura.position.y = 0.58;
    grp.add(aura);

    grp.userData.baseY = y + 0.025;
    grp.userData.ringMesh = ring;
    grp.userData.auraMesh = aura;
    return grp;
  }

  // --------------------------------------------------------------------------
  // 6. CUSTOM GLSL SHADERS (MARQUEE, FOUNTAIN, CORONA, LED FLOOR, LASERS, EQ)
  // --------------------------------------------------------------------------
  const shaderUniformUpdaters = [];

  function createMarqueeChaseMaterial(colorHexA = 0xffd54f, colorHexB = 0xc74bff, bulbDensity = 36.0, chaseSpeed = 5.5) {
    const uniforms = {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(colorHexA) },
      uColorB: { value: new THREE.Color(colorHexB) },
      uBulbDensity: { value: bulbDensity },
      uChaseSpeed: { value: chaseSpeed },
      uIntensity: { value: 1.55 },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms,
      transparent: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormalW;
        void main() {
          vUv = uv;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform float uBulbDensity;
        uniform float uChaseSpeed;
        uniform float uIntensity;
        varying vec2 vUv;
        varying vec3 vNormalW;

        void main() {
          float cellX = vUv.x * uBulbDensity;
          float idx = floor(cellX);
          vec2 localUv = vec2(fract(cellX) - 0.5, vUv.y - 0.5);
          float dist = length(localUv * vec2(1.0, 1.35));

          float waveA = 0.5 + 0.5 * sin(idx * 0.85 - uTime * uChaseSpeed);
          float waveB = 0.5 + 0.5 * cos(idx * 0.42 + uTime * uChaseSpeed * 0.65);
          float spark = pow(max(waveA, 0.0001), 2.4);

          float bulbCore = smoothstep(0.42, 0.08, dist);
          float bulbHalo = smoothstep(0.56, 0.14, dist) * 0.55;
          vec3 brassBack = vec3(0.16, 0.11, 0.04) * (0.65 + 0.35 * abs(vNormalW.y));
          vec3 bulbCol = mix(uColorB, uColorA, waveB);
          vec3 glow = bulbCol * (bulbCore * (0.45 + 1.35 * spark) + bulbHalo * spark) * uIntensity;

          float rimLine = smoothstep(0.44, 0.49, abs(vUv.y - 0.5));
          vec3 trimGold = vec3(0.82, 0.64, 0.24) * rimLine * 0.85;

          gl_FragColor = vec4(brassBack + glow + trimGold, 1.0);
        }
      `,
    });

    shaderUniformUpdaters.push((elapsed) => {
      uniforms.uTime.value = elapsed;
    });
    return mat;
  }

  function createFountainWaterMaterial() {
    const uniforms = {
      uTime: { value: 0 },
      uShallow: { value: new THREE.Color(0x16d9e8) },
      uGoldTint: { value: new THREE.Color(0xffd269) },
      uFoam: { value: new THREE.Color(0xf4fcff) },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          vUv = uv;
          vec2 centered = uv - 0.5;
          float rad = length(centered) * 2.0;
          float ripple = sin(rad * 22.0 - uTime * 5.2) * 0.035 * (1.0 - smoothstep(0.2, 1.0, rad));
          vWave = ripple;
          vec3 pos = position + normal * ripple;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uShallow;
        uniform vec3 uGoldTint;
        uniform vec3 uFoam;
        varying vec2 vUv;
        varying float vWave;

        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float r = length(p);
          float ang = atan(p.y, p.x);

          float ring1 = 0.5 + 0.5 * sin(r * 26.0 - uTime * 5.6 + sin(ang * 6.0) * 0.35);
          float ring2 = 0.5 + 0.5 * cos(r * 14.0 - uTime * 3.4 - ang * 4.0);
          float caustic = pow(max(ring1 * ring2, 0.0001), 1.8);

          float centerSpray = smoothstep(0.32, 0.02, r);
          float edgeFoam = smoothstep(0.82, 0.98, r) * (1.0 - smoothstep(0.98, 1.02, r));

          vec3 col = mix(uShallow * 0.55, uShallow * 1.15, caustic);
          col += uGoldTint * (caustic * 0.42 + centerSpray * 0.35);
          col = mix(col, uFoam, clamp(centerSpray * 0.72 + edgeFoam * 0.65 + vWave * 6.0, 0.0, 1.0));

          float alpha = clamp(0.76 + centerSpray * 0.18, 0.0, 0.95) * (1.0 - smoothstep(0.97, 1.01, r));
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    shaderUniformUpdaters.push((elapsed) => {
      uniforms.uTime.value = elapsed;
    });
    return mat;
  }

  function createPortalCoronaMaterial(primaryHex = 0xb544ff, secondaryHex = 0xffd54f) {
    const uniforms = {
      uTime: { value: 0 },
      uPrimary: { value: new THREE.Color(primaryHex) },
      uSecondary: { value: new THREE.Color(secondaryHex) },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormalW;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uPrimary;
        uniform vec3 uSecondary;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormalW;

        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(max(1.0 - abs(dot(viewDir, vNormalW)), 0.0001), 1.6);

          float rise = fract(vUv.y * 2.5 - uTime * 0.85);
          float chevron = smoothstep(0.35, 0.0, abs(rise - 0.5));
          float spiral = 0.5 + 0.5 * sin(vUv.x * 18.84955 + vUv.y * 9.0 - uTime * 4.2);

          float verticalFade = pow(max(1.0 - clamp(vUv.y, 0.0, 1.0), 0.0001), 1.45);
          float baseGlow = smoothstep(0.24, 0.0, vUv.y) * 0.85;

          vec3 col = mix(uPrimary, uSecondary, chevron * 0.65 + spiral * 0.25);
          float alpha = (0.28 + chevron * 0.42 + fresnel * 0.45 + baseGlow) * verticalFade;
          gl_FragColor = vec4(col * 1.35, clamp(alpha, 0.0, 0.92));
        }
      `,
    });

    shaderUniformUpdaters.push((elapsed) => {
      uniforms.uTime.value = elapsed;
    });
    return mat;
  }

  function createBeatDancefloorMaterial() {
    const uniforms = {
      uTime: { value: 0 },
      uBeatPhase: { value: 0 },
      uBassPulse: { value: 0 },
      uMode: { value: 0 },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms,
      transparent: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uBeatPhase;
        uniform float uBassPulse;
        uniform float uMode;
        varying vec2 vUv;

        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        void main() {
          float gridN = 12.0;
          vec2 scaled = vUv * gridN;
          vec2 cellId = floor(scaled);
          vec2 cellUv = fract(scaled);

          // Dark metallic tile grout frame + inner frosted bevel
          vec2 edgeDist = min(cellUv, 1.0 - cellUv);
          float grout = smoothstep(0.035, 0.075, min(edgeDist.x, edgeDist.y));
          float innerHotspot = 1.0 - length((cellUv - 0.5) * 1.45);
          innerHotspot = clamp(innerHotspot, 0.25, 1.0);

          vec2 normCell = (cellId + 0.5) / gridN - 0.5;
          float distCenter = length(normCell) * 2.0;

          int patternIdx = int(mod(floor(uTime * 0.125), 4.0));
          float lit = 0.0;
          float hue = 0.0;

          if (patternIdx == 0) {
            // Concentric Beat Rings radiating from dancefloor center
            float ringWave = 0.5 + 0.5 * sin(distCenter * 9.5 - uTime * 5.8);
            lit = pow(max(ringWave, 0.0001), 1.7) * (0.45 + 0.75 * uBassPulse);
            hue = fract(distCenter * 0.45 - uTime * 0.18);
          } else if (patternIdx == 1) {
            // 12-Band Dual Mirror Spectrum Equalizer Bars
            float colFreq = abs(cellId.x - 5.5) / 6.0;
            float barHeight = 0.25 + 0.68 * (0.5 + 0.5 * sin(cellId.x * 1.35 + uTime * 6.4)) * (0.55 + 0.55 * uBassPulse);
            float rowPos = abs(vUv.y - 0.5) * 2.0;
            lit = smoothstep(barHeight + 0.12, barHeight - 0.05, rowPos);
            hue = fract(0.82 - colFreq * 0.48 + rowPos * 0.22);
          } else if (patternIdx == 2) {
            // Cyber Diagonal Plasma & Diamond Checker Pulse
            float checker = mod(cellId.x + cellId.y + floor(uBeatPhase), 2.0);
            float diag = 0.5 + 0.5 * sin((normCell.x + normCell.y) * 8.0 - uTime * 4.5);
            lit = mix(diag * 0.6, 1.0, checker * uBassPulse);
            hue = fract((cellId.x * 0.07 + cellId.y * 0.05) + uTime * 0.15);
          } else {
            // Rotating 4-Quadrant Club Vortex
            float ang = atan(normCell.y, normCell.x);
            float blades = 0.5 + 0.5 * sin(ang * 4.0 + distCenter * 5.0 - uTime * 5.2);
            lit = pow(max(blades, 0.0001), 1.6) * (0.5 + 0.65 * uBassPulse);
            hue = fract(ang / 6.283185 + uTime * 0.22);
          }

          vec3 neonCol = hsv2rgb(vec3(hue, 0.86, 1.0));
          vec3 baseGlass = vec3(0.04, 0.05, 0.09);
          vec3 tileCol = mix(baseGlass, neonCol * (0.75 + 0.85 * uBassPulse), clamp(lit, 0.08, 1.0)) * innerHotspot;

          // Specular center gleam
          tileCol += neonCol * pow(max(innerHotspot, 0.0001), 4.0) * lit * 0.45;
          vec3 finalCol = mix(vec3(0.02, 0.025, 0.04), tileCol, grout);

          gl_FragColor = vec4(finalCol, 1.0);
        }
      `,
    });

    shaderUniformUpdaters.push((elapsed) => {
      const bpm = 128.0;
      const beats = elapsed * (bpm / 60.0);
      const beatFrac = beats - Math.floor(beats);
      const kick = Math.pow(1.0 - beatFrac, 3.2);
      uniforms.uTime.value = elapsed;
      uniforms.uBeatPhase.value = beats;
      uniforms.uBassPulse.value = kick;
    });
    return mat;
  }

  function createLaserConeMaterial(colorHex = 0x00f5ff) {
    const uniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(colorHex) },
      uOpacity: { value: 0.32 },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormalW;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec3 vNormalW;
        varying vec3 vWorldPos;

        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float edgeSoft = pow(max(abs(dot(viewDir, vNormalW)), 0.0001), 1.35);

          // Cone apex is at vUv.y = 1.0, wide floor base at vUv.y = 0.0
          float distFade = pow(max(clamp(vUv.y, 0.0, 1.0), 0.0001), 0.78) * smoothstep(0.0, 0.16, vUv.y);
          float laserStrands = 0.62 + 0.38 * sin(vUv.x * 37.699 + uTime * 7.5);
          float hazeShimmer = 0.78 + 0.22 * sin(vUv.y * 18.0 - uTime * 3.8);

          float alpha = uOpacity * edgeSoft * distFade * laserStrands * hazeShimmer;
          gl_FragColor = vec4(uColor * 1.45, clamp(alpha, 0.0, 0.75));
        }
      `,
    });

    shaderUniformUpdaters.push((elapsed) => {
      uniforms.uTime.value = elapsed;
    });
    return mat;
  }

  function createEqualizerWallMaterial() {
    const uniforms = {
      uTime: { value: 0 },
      uBass: { value: 0 },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms,
      transparent: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uBass;
        varying vec2 vUv;

        void main() {
          float cols = 28.0;
          float rows = 16.0;
          float cx = floor(vUv.x * cols);
          float cy = floor(vUv.y * rows);
          vec2 cell = fract(vec2(vUv.x * cols, vUv.y * rows));

          float mask = step(0.14, cell.x) * step(cell.x, 0.86) * step(0.16, cell.y) * step(cell.y, 0.84);
          float centerMirror = abs(cx - cols * 0.5 + 0.5) / (cols * 0.5);
          float wave1 = 0.5 + 0.5 * sin(cx * 0.9 + uTime * 7.2);
          float wave2 = 0.5 + 0.5 * cos(cx * 1.7 - uTime * 5.1);
          float peak = clamp((1.0 - centerMirror * 0.55) * (0.28 + 0.45 * wave1 * wave2 + 0.42 * uBass), 0.08, 0.98);

          float rowNorm = (cy + 0.5) / rows;
          float on = step(rowNorm, peak) * mask;

          vec3 lowCol = vec3(0.0, 0.95, 1.0);
          vec3 midCol = vec3(0.88, 0.15, 1.0);
          vec3 hiCol = vec3(1.0, 0.82, 0.22);
          vec3 barCol = rowNorm < 0.55 ? mix(lowCol, midCol, rowNorm / 0.55) : mix(midCol, hiCol, (rowNorm - 0.55) / 0.45);

          vec3 bg = vec3(0.025, 0.03, 0.055);
          gl_FragColor = vec4(mix(bg, barCol * 1.35, on), 1.0);
        }
      `,
    });

    shaderUniformUpdaters.push((elapsed) => {
      const beats = elapsed * (128.0 / 60.0);
      const frac = beats - Math.floor(beats);
      uniforms.uTime.value = elapsed;
      uniforms.uBass.value = Math.pow(1.0 - frac, 2.8);
    });
    return mat;
  }

  function createSubBassWaveMaterial() {
    const uniforms = {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(0xff1ea8) },
      uColorB: { value: new THREE.Color(0x00f0ff) },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        varying vec2 vUv;

        void main() {
          float r = length((vUv - 0.5) * 2.0);
          if (r > 1.0) discard;

          float beat = fract(uTime * (128.0 / 60.0) * 0.5);
          float ringA = smoothstep(0.09, 0.0, abs(r - beat)) * (1.0 - beat);
          float beatB = fract(beat + 0.5);
          float ringB = smoothstep(0.09, 0.0, abs(r - beatB)) * (1.0 - beatB);

          vec3 col = uColorA * ringA * 1.3 + uColorB * ringB * 1.15;
          float alpha = clamp((ringA + ringB) * 0.55, 0.0, 0.65) * (1.0 - smoothstep(0.85, 1.0, r));
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    shaderUniformUpdaters.push((elapsed) => {
      uniforms.uTime.value = elapsed;
    });
    return mat;
  }

  // --------------------------------------------------------------------------
  // 7. SHARED LUXURY PBR MATERIAL PALETTE (ZERO SHADER DUPLICATION!)
  // --------------------------------------------------------------------------
  function buildLuxuryMaterialPalette(texSuite) {
    return {
      // Metals & Precious Finishes
      gold24k: new THREE.MeshPhysicalMaterial({
        color: 0xf5c542,
        metalness: 0.96,
        roughness: 0.12,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
      }),
      brushedBrass: new THREE.MeshStandardMaterial({
        color: 0xd4a83f,
        metalness: 0.88,
        roughness: 0.24,
      }),
      liquidChrome: new THREE.MeshPhysicalMaterial({
        color: 0xeef4fa,
        metalness: 0.98,
        roughness: 0.06,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04,
      }),
      darkGunmetal: new THREE.MeshStandardMaterial({
        color: 0x1b202b,
        metalness: 0.78,
        roughness: 0.32,
      }),
      blackSteel: new THREE.MeshStandardMaterial({
        color: 0x10131a,
        metalness: 0.65,
        roughness: 0.42,
      }),
      carbonFiber: new THREE.MeshPhysicalMaterial({
        color: 0x151820,
        metalness: 0.42,
        roughness: 0.24,
        clearcoat: 0.85,
        clearcoatRoughness: 0.14,
      }),

      // Architectural Stone, Marble & Carpets
      royalCarpet: new THREE.MeshStandardMaterial({
        map: texSuite.royalCarpet,
        normalMap: texSuite.royalCarpetNormal,
        normalScale: new THREE.Vector2(0.45, 0.45),
        roughness: 0.84,
        metalness: 0.06,
      }),
      calacattaMarble: new THREE.MeshPhysicalMaterial({
        map: texSuite.calacattaMarble,
        normalMap: texSuite.marbleNormal,
        normalScale: new THREE.Vector2(0.28, 0.28),
        roughness: 0.16,
        metalness: 0.08,
        clearcoat: 0.75,
        clearcoatRoughness: 0.12,
      }),
      blackGoldMarble: new THREE.MeshPhysicalMaterial({
        map: texSuite.blackGoldMarble,
        roughness: 0.14,
        metalness: 0.14,
        clearcoat: 0.88,
        clearcoatRoughness: 0.08,
      }),
      creamLimestone: new THREE.MeshStandardMaterial({
        color: 0xebe5d8,
        roughness: 0.52,
        metalness: 0.08,
      }),
      obsidianFloor: new THREE.MeshPhysicalMaterial({
        color: 0x0b0e16,
        roughness: 0.15,
        metalness: 0.22,
        clearcoat: 0.9,
        clearcoatRoughness: 0.12,
      }),
      granitePlinth: new THREE.MeshStandardMaterial({
        color: 0x262a34,
        roughness: 0.68,
        metalness: 0.12,
      }),

      // Exterior Skyscraper & Club Facades
      casinoTowerGlass: new THREE.MeshPhysicalMaterial({
        map: texSuite.casinoFacade,
        emissive: new THREE.Color(0xffffff),
        emissiveMap: texSuite.casinoFacadeEmissive,
        emissiveIntensity: 0.75,
        roughness: 0.14,
        metalness: 0.38,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
      }),
      clubSlateWall: new THREE.MeshStandardMaterial({
        map: texSuite.clubSlate,
        normalMap: texSuite.clubSlateNormal,
        normalScale: new THREE.Vector2(0.7, 0.7),
        roughness: 0.62,
        metalness: 0.24,
      }),

      // Woods, Leather & Plush Velvets
      mahoganyWood: new THREE.MeshPhysicalMaterial({
        color: 0x4a1912,
        roughness: 0.22,
        metalness: 0.08,
        clearcoat: 0.85,
        clearcoatRoughness: 0.12,
      }),
      walnutWood: new THREE.MeshStandardMaterial({
        color: 0x5c3620,
        roughness: 0.38,
        metalness: 0.06,
      }),
      crimsonVelvet: new THREE.MeshStandardMaterial({
        color: 0x8f0d22,
        roughness: 0.76,
        metalness: 0.05,
      }),
      purpleVelvet: new THREE.MeshStandardMaterial({
        color: 0x45126b,
        roughness: 0.74,
        metalness: 0.08,
      }),
      emeraldFelt: new THREE.MeshStandardMaterial({
        color: 0x0d6b3e,
        roughness: 0.82,
        metalness: 0.02,
      }),
      blackLeather: new THREE.MeshStandardMaterial({
        color: 0x15171e,
        roughness: 0.36,
        metalness: 0.12,
      }),
      ivoryCeramic: new THREE.MeshPhysicalMaterial({
        color: 0xf7f4ec,
        roughness: 0.12,
        metalness: 0.04,
        clearcoat: 0.95,
      }),

      // Translucent Crystal, Acrylic & Glass
      crystalDiamond: new THREE.MeshPhysicalMaterial({
        color: 0xdff6ff,
        emissive: 0x4895ef,
        emissiveIntensity: 0.45,
        roughness: 0.04,
        metalness: 0.15,
        transparent: true,
        opacity: 0.82,
        clearcoat: 1.0,
      }),
      clearDomeGlass: new THREE.MeshPhysicalMaterial({
        color: 0xdcf3ff,
        roughness: 0.05,
        metalness: 0.08,
        transparent: true,
        opacity: 0.36,
        clearcoat: 1.0,
        depthWrite: false,
      }),
      tintedCanopyGlass: new THREE.MeshPhysicalMaterial({
        color: 0x0b1320,
        roughness: 0.05,
        metalness: 0.35,
        transparent: true,
        opacity: 0.84,
        clearcoat: 1.0,
      }),
      chandelierCrystal: new THREE.MeshStandardMaterial({
        color: 0xfff8e7,
        emissive: 0xffd27d,
        emissiveIntensity: 0.88,
        roughness: 0.1,
        metalness: 0.25,
      }),

      // Table Betting Surfaces & Slot Reels
      taixiuSurface: new THREE.MeshStandardMaterial({
        map: texSuite.taixiuBoard,
        emissive: 0xffffff,
        emissiveMap: texSuite.taixiuBoard,
        emissiveIntensity: 0.28,
        roughness: 0.35,
      }),
      xocdiaSurface: new THREE.MeshStandardMaterial({
        map: texSuite.xocdiaMat,
        roughness: 0.72,
      }),
      rouletteSurface: new THREE.MeshStandardMaterial({
        map: texSuite.rouletteGrid,
        roughness: 0.68,
      }),
      blackjackSurface: new THREE.MeshStandardMaterial({
        map: texSuite.blackjackFelt,
        roughness: 0.75,
      }),
      pokerSurface: new THREE.MeshStandardMaterial({
        map: texSuite.pokerFelt,
        roughness: 0.74,
      }),
      baccaratSurface: new THREE.MeshStandardMaterial({
        map: texSuite.baccaratFelt,
        roughness: 0.72,
      }),
      slotReelDrum: new THREE.MeshStandardMaterial({
        map: texSuite.slotReelStrip,
        emissive: 0xffffff,
        emissiveMap: texSuite.slotReelStrip,
        emissiveIntensity: 0.72,
        roughness: 0.24,
      }),
      luckyWheelDisc: new THREE.MeshStandardMaterial({
        map: texSuite.luckyWheelFace,
        emissive: 0xffffff,
        emissiveMap: texSuite.luckyWheelFace,
        emissiveIntensity: 0.34,
        roughness: 0.3,
      }),
      dartboardMat: new THREE.MeshStandardMaterial({
        map: texSuite.dartboardFace,
        emissive: 0xffffff,
        emissiveMap: texSuite.dartboardFace,
        emissiveIntensity: 0.35,
        roughness: 0.4,
      }),
      poolBaizeMat: new THREE.MeshStandardMaterial({
        map: texSuite.poolBaize,
        roughness: 0.8,
      }),
      derbyScreenMat: new THREE.MeshBasicMaterial({
        map: texSuite.derbyLiveScreen,
      }),

      // Muted Warm Architectural Lit Trim (Clean, non-glaring)
      neonGold: new THREE.MeshStandardMaterial({
        color: 0xe6cfa0,
        emissive: 0xd4a84f,
        emissiveIntensity: 0.35,
        roughness: 0.28,
      }),
      neonPurple: new THREE.MeshStandardMaterial({
        color: 0xb098c8,
        emissive: 0x7c5ca0,
        emissiveIntensity: 0.32,
        roughness: 0.28,
      }),
      neonMagenta: new THREE.MeshStandardMaterial({
        color: 0xc890a8,
        emissive: 0x994c6e,
        emissiveIntensity: 0.32,
        roughness: 0.28,
      }),
      neonCyan: new THREE.MeshStandardMaterial({
        color: 0x9ec6d4,
        emissive: 0x4f8ca0,
        emissiveIntensity: 0.32,
        roughness: 0.28,
      }),
      neonCrimson: new THREE.MeshStandardMaterial({
        color: 0xc87a82,
        emissive: 0x99353f,
        emissiveIntensity: 0.32,
        roughness: 0.3,
      }),
      neonEmerald: new THREE.MeshStandardMaterial({
        color: 0x8cc8a6,
        emissive: 0x3b8c60,
        emissiveIntensity: 0.32,
        roughness: 0.3,
      }),
      warmUplight: new THREE.MeshBasicMaterial({
        color: 0xffe29a,
      }),

      // Shared Vertex-Color Materials for Batched Multi-Color Details (Chips, Bottles, Foliage, Books, Trim)
      vertexStd: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.44,
        metalness: 0.18,
      }),
      vertexGlossy: new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.14,
        metalness: 0.25,
        clearcoat: 0.9,
      }),
      vertexGlow: new THREE.MeshStandardMaterial({
        vertexColors: true,
        emissive: 0xffffff,
        emissiveIntensity: 0.35,
        roughness: 0.2,
        metalness: 0.15,
      }),

      // Custom GLSL Shader Materials
      marqueeGoldPurple: createMarqueeChaseMaterial(0xffd54f, 0xb53cff, 42.0, 5.8),
      marqueeClubNeon: createMarqueeChaseMaterial(0x00f0ff, 0xff1ea8, 32.0, 7.2),
      fountainWater: createFountainWaterMaterial(),
      casinoCorona: createPortalCoronaMaterial(0xa832ff, 0xffd54f),
      vipHeistCorona: createPortalCoronaMaterial(0xff2a55, 0xffc83d),
      clubCorona: createPortalCoronaMaterial(0xff1ea8, 0x00f0ff),
      beatDancefloor: createBeatDancefloorMaterial(),
      eqWall: createEqualizerWallMaterial(),
      subBassWave: createSubBassWaveMaterial(),
      laserCyan: createLaserConeMaterial(0x00f5ff),
      laserMagenta: createLaserConeMaterial(0xff1ea8),
      laserViolet: createLaserConeMaterial(0x9d4edd),
      laserLime: createLaserConeMaterial(0x38ff9c),
      spotlightGold: createLaserConeMaterial(0xffe082),
    };
  }

  // --------------------------------------------------------------------------
  // 8. ARTICULATED CASINO/CLUB NPC RIGS, HYPERCAR & LUXURY PROP BUILDERS
  // --------------------------------------------------------------------------
  const SKIN_TONES = [0xf3cfb6, 0xe5b898, 0xd49c76, 0xb87d56, 0x8d583a, 0xf7dcc8];
  const HAIR_TONES = [0x141218, 0x2c1d14, 0x4f321c, 0x8c5a2b, 0xd4a857, 0x241a2e, 0x9e2a48];
  const CLUB_OUTFIT_PALETTE = [
    0xff1ea8, 0x00d4ff, 0x8338ec, 0xffbe0b, 0x06d6a0, 0xef233c,
    0x3a86ff, 0xfb5607, 0x9b5de5, 0x00f5d4, 0xe0aaff, 0xff4d6d,
  ];

  const _npcSkinMatCache = new Map();
  const _npcClothMatCache = new Map();

  function getNPCSkinMat(hex) {
    let m = _npcSkinMatCache.get(hex);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.56, metalness: 0.02 });
      _npcSkinMatCache.set(hex, m);
    }
    return m;
  }

  function getNPCClothMat(hex, roughness = 0.62, metalness = 0.08, emissiveHex = 0x000000, emissiveInt = 0) {
    const key = `${hex}_${Math.round(roughness * 100)}_${Math.round(metalness * 100)}_${emissiveHex}`;
    let m = _npcClothMatCache.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color: hex,
        roughness,
        metalness,
        emissive: new THREE.Color(emissiveHex),
        emissiveIntensity: emissiveInt,
      });
      _npcClothMatCache.set(key, m);
    }
    return m;
  }

  function buildArticulatedVenueNPC(mats, role = 'dealer_western', seed = 1, opts = {}) {
    const rng = createCasinoRNG(seed * 7919 + 104729);
    const isFemale = opts.female !== undefined ? Boolean(opts.female) : (rng() < 0.48);
    const skinHex = SKIN_TONES[Math.floor(rng() * SKIN_TONES.length)];
    const hairHex = HAIR_TONES[Math.floor(rng() * HAIR_TONES.length)];
    const skinMat = getNPCSkinMat(skinHex);
    const hairMat = getNPCClothMat(hairHex, 0.72, 0.04);

    let topMat = getNPCClothMat(0x181b24, 0.5, 0.1);
    let accentMat = mats.gold24k;
    let shirtMat = getNPCClothMat(0xf4f6fa, 0.65, 0.02);
    let pantsMat = getNPCClothMat(0x12151d, 0.6, 0.06);
    let shoeMat = mats.blackLeather;

    if (role === 'dealer_asian') {
      topMat = getNPCClothMat(0x9e0e22, 0.42, 0.16);
      accentMat = mats.gold24k;
      pantsMat = getNPCClothMat(0x161219, 0.55, 0.08);
    } else if (role === 'dealer_western') {
      topMat = getNPCClothMat(0x0f5236, 0.48, 0.12);
      accentMat = mats.brushedBrass;
    } else if (role === 'cashier_teller') {
      topMat = getNPCClothMat(0x3c1361, 0.46, 0.15);
      accentMat = mats.gold24k;
    } else if (role === 'security_guard' || role === 'bouncer') {
      topMat = getNPCClothMat(0x10131b, 0.44, 0.12);
      shirtMat = role === 'bouncer' ? getNPCClothMat(0x181c26, 0.6, 0.05) : shirtMat;
      accentMat = mats.liquidChrome;
    } else if (role === 'valet') {
      topMat = getNPCClothMat(0x8c1228, 0.48, 0.1);
      accentMat = mats.gold24k;
      pantsMat = getNPCClothMat(0x151821, 0.58, 0.06);
    } else if (role === 'high_roller') {
      const suitPalette = [0x1c2541, 0x5e1224, 0xeae4d7, 0x2b193d, 0x0f3d3e, 0xc9a227];
      const pick = suitPalette[seed % suitPalette.length];
      topMat = getNPCClothMat(pick, 0.36, 0.2);
      pantsMat = isFemale ? topMat : getNPCClothMat(0x171a24, 0.48, 0.1);
    } else if (role === 'bartender') {
      topMat = getNPCClothMat(0x1d112b, 0.45, 0.14);
      shirtMat = getNPCClothMat(0x121620, 0.55, 0.08);
      accentMat = mats.neonCyan;
    } else if (role === 'dj_artist') {
      topMat = getNPCClothMat(0x151828, 0.4, 0.22, 0x7209b7, 0.25);
      accentMat = mats.neonCyan;
      pantsMat = getNPCClothMat(0x0f121c, 0.5, 0.15);
    } else if (role === 'club_dancer' || role === 'club_queue') {
      const neonHex = CLUB_OUTFIT_PALETTE[seed % CLUB_OUTFIT_PALETTE.length];
      topMat = getNPCClothMat(neonHex, 0.34, 0.24, neonHex, 0.16);
      pantsMat = getNPCClothMat(isFemale && seed % 2 === 0 ? neonHex : 0x161925, 0.45, 0.12);
    }

    const root = new THREE.Group();
    const scaleY = opts.scale || (isFemale ? 0.96 : 1.02);
    const shoulderHalfW = role === 'bouncer' ? 0.235 : (isFemale ? 0.175 : 0.205);
    root.scale.set(role === 'bouncer' ? 1.08 : 1.0, scaleY, role === 'bouncer' ? 1.06 : 1.0);

    // Pelvis Anchor (y = 0.92 standing, lowered automatically if seated)
    const pelvis = new THREE.Group();
    pelvis.position.set(0, opts.seated ? 0.54 : 0.92, 0);
    root.add(pelvis);

    const pelvisMesh = new THREE.Mesh(prims.box, pantsMat);
    pelvisMesh.scale.set(isFemale ? 0.31 : 0.32, 0.16, 0.20);
    pelvis.add(pelvisMesh);

    const beltMesh = new THREE.Mesh(prims.box, mats.blackLeather);
    beltMesh.position.set(0, 0.075, 0);
    beltMesh.scale.set(0.325, 0.038, 0.21);
    pelvis.add(beltMesh);

    const buckleMesh = new THREE.Mesh(prims.box, accentMat);
    buckleMesh.position.set(0, 0.075, 0.108);
    buckleMesh.scale.set(0.055, 0.042, 0.018);
    pelvis.add(buckleMesh);

    // Spine & Sculpted Upper Torso
    const torso = new THREE.Group();
    torso.position.set(0, 0.09, 0);
    pelvis.add(torso);

    const lowerTorso = new THREE.Mesh(prims.box, topMat);
    lowerTorso.position.set(0, 0.14, 0);
    lowerTorso.scale.set(isFemale ? 0.27 : 0.31, 0.24, 0.19);
    torso.add(lowerTorso);

    const chestMesh = new THREE.Mesh(prims.box, topMat);
    chestMesh.position.set(0, 0.34, 0.008);
    chestMesh.scale.set(shoulderHalfW * 1.85, 0.26, 0.215);
    chestMesh.castShadow = Boolean(opts.castShadow);
    torso.add(chestMesh);

    // Cocktail Dress Skirt for Female High-Rollers / Clubbers
    if (isFemale && (role === 'high_roller' || (role === 'club_dancer' && seed % 2 === 0))) {
      const skirt = new THREE.Mesh(prims.cone16, topMat);
      skirt.position.set(0, -0.14, 0);
      skirt.scale.set(0.36, 0.34, 0.25);
      pelvis.add(skirt);
    }

    // Shirt Front V-Placket + Lapels + Bow-Tie / Mandarin Gold Frog-Buttons
    const shirtV = new THREE.Mesh(prims.box, shirtMat);
    shirtV.position.set(0, 0.35, 0.106);
    shirtV.scale.set(0.12, 0.22, 0.018);
    torso.add(shirtV);

    if (role === 'dealer_asian') {
      // Gold mandarin collar + 3 gold frog clasps
      const collar = new THREE.Mesh(prims.cyl16, accentMat);
      collar.position.set(0, 0.48, 0.01);
      collar.scale.set(0.135, 0.04, 0.135);
      torso.add(collar);
      for (let b = 0; b < 3; b++) {
        const clasp = new THREE.Mesh(prims.box, accentMat);
        clasp.position.set(0, 0.40 - b * 0.065, 0.116);
        clasp.scale.set(0.075, 0.016, 0.016);
        torso.add(clasp);
      }
    } else if (role === 'dealer_western' || role === 'cashier_teller' || role === 'valet' || role === 'high_roller') {
      for (const s of [-1, 1]) {
        const lapel = new THREE.Mesh(prims.box, topMat);
        lapel.position.set(s * 0.058, 0.35, 0.112);
        lapel.rotation.z = s * 0.22;
        lapel.scale.set(0.042, 0.22, 0.016);
        torso.add(lapel);
      }
      if (!isFemale || role === 'dealer_western') {
        const bowL = new THREE.Mesh(prims.box, role === 'high_roller' ? accentMat : mats.blackLeather);
        bowL.position.set(0, 0.445, 0.118);
        bowL.scale.set(0.072, 0.028, 0.018);
        torso.add(bowL);
      }
    }

    // Neck & Detailed Head
    const neck = new THREE.Group();
    neck.position.set(0, 0.48, 0);
    torso.add(neck);

    const neckCyl = new THREE.Mesh(prims.cyl16, skinMat);
    neckCyl.position.set(0, 0.04, 0);
    neckCyl.scale.set(0.105, 0.10, 0.105);
    neck.add(neckCyl);

    const head = new THREE.Group();
    head.position.set(0, 0.155, 0);
    neck.add(head);

    const cranium = new THREE.Mesh(prims.sphere16, skinMat);
    cranium.scale.set(0.195, 0.225, 0.205);
    head.add(cranium);

    const nose = new THREE.Mesh(prims.cone8, skinMat);
    nose.position.set(0, -0.005, 0.108);
    nose.rotation.x = Math.PI * 0.5;
    nose.scale.set(0.028, 0.042, 0.028);
    head.add(nose);

    // Eyes & Brows
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x11131a });
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(prims.sphere10, eyeMat);
      eye.position.set(s * 0.038, 0.022, 0.094);
      eye.scale.set(0.018, 0.018, 0.012);
      head.add(eye);

      const brow = new THREE.Mesh(prims.box, hairMat);
      brow.position.set(s * 0.038, 0.042, 0.096);
      brow.scale.set(0.032, 0.008, 0.012);
      head.add(brow);
    }

    // Sculpted Role-Specific Hairstyles & Headgear
    const hairCap = new THREE.Mesh(prims.sphere16, hairMat);
    hairCap.position.set(0, 0.032, -0.012);
    hairCap.scale.set(0.206, 0.195, 0.214);
    head.add(hairCap);

    if (isFemale) {
      if (role === 'dealer_asian' || role === 'dealer_western' || role === 'cashier_teller') {
        const bun = new THREE.Mesh(prims.sphere10, hairMat);
        bun.position.set(0, 0.045, -0.118);
        bun.scale.set(0.085, 0.085, 0.085);
        head.add(bun);
      } else {
        const longBack = new THREE.Mesh(prims.box, hairMat);
        longBack.position.set(0, -0.065, -0.078);
        longBack.scale.set(0.19, 0.24, 0.08);
        head.add(longBack);
      }
    }

    if (role === 'security_guard' || role === 'bouncer') {
      const shades = new THREE.Mesh(prims.box, mats.tintedCanopyGlass);
      shades.position.set(0, 0.025, 0.102);
      shades.scale.set(0.135, 0.034, 0.022);
      head.add(shades);

      const earpiece = new THREE.Mesh(prims.box, mats.neonCyan);
      earpiece.position.set(0.098, 0.005, 0.0);
      earpiece.scale.set(0.016, 0.028, 0.022);
      head.add(earpiece);
    } else if (role === 'dj_artist') {
      // DJ Over-Ear Headphones + Glowing Cyber Visor
      const band = new THREE.Mesh(prims.torus16, mats.liquidChrome);
      band.position.set(0, 0.04, 0);
      band.scale.set(0.22, 0.22, 0.16);
      head.add(band);
      for (const s of [-1, 1]) {
        const cup = new THREE.Mesh(prims.cyl16, mats.neonMagenta);
        cup.position.set(s * 0.108, 0.01, 0);
        cup.rotation.z = Math.PI * 0.5;
        cup.scale.set(0.072, 0.032, 0.072);
        head.add(cup);
      }
      const visor = new THREE.Mesh(prims.box, mats.neonCyan);
      visor.position.set(0, 0.025, 0.104);
      visor.scale.set(0.145, 0.036, 0.02);
      head.add(visor);
    }

    // Articulated Left & Right Arms
    function buildVenueArm(isRight) {
      const s = isRight ? -1 : 1;
      const shoulder = new THREE.Group();
      shoulder.position.set(s * shoulderHalfW, 0.43, 0);
      torso.add(shoulder);

      const sleeve = new THREE.Mesh(prims.cyl8, role === 'club_dancer' && isFemale ? skinMat : topMat);
      sleeve.position.set(0, -0.12, 0);
      sleeve.scale.set(0.082, 0.25, 0.082);
      shoulder.add(sleeve);

      const elbow = new THREE.Group();
      elbow.position.set(0, -0.25, 0);
      shoulder.add(elbow);

      const foreArm = new THREE.Mesh(prims.cyl8, role === 'bartender' || role === 'club_dancer' ? skinMat : shirtMat);
      foreArm.position.set(0, -0.11, 0);
      foreArm.scale.set(0.068, 0.22, 0.068);
      elbow.add(foreArm);

      const hand = new THREE.Mesh(prims.box, skinMat);
      hand.position.set(0, -0.23, 0.01);
      hand.scale.set(0.052, 0.068, 0.035);
      elbow.add(hand);

      return { shoulder, elbow, hand };
    }

    const armL = buildVenueArm(false);
    const armR = buildVenueArm(true);

    // Optional Hand Props (Bartender Shaker, Waitress Tray, Bouncer Clipboard)
    if (role === 'bartender') {
      const shaker = new THREE.Mesh(prims.cyl16, mats.liquidChrome);
      shaker.position.set(0, -0.24, 0.05);
      shaker.rotation.x = Math.PI * 0.35;
      shaker.scale.set(0.068, 0.17, 0.068);
      armR.elbow.add(shaker);
    } else if (role === 'waitress') {
      const tray = new THREE.Mesh(prims.cyl16, mats.gold24k);
      tray.position.set(0, -0.24, 0.12);
      tray.scale.set(0.32, 0.018, 0.32);
      armR.elbow.add(tray);
      for (const gx of [-0.06, 0.06]) {
        const flute = new THREE.Mesh(prims.cyl8, mats.crystalDiamond);
        flute.position.set(gx, -0.17, 0.12);
        flute.scale.set(0.036, 0.12, 0.036);
        armR.elbow.add(flute);
      }
    }

    // Articulated Left & Right Legs
    function buildVenueLeg(isRight) {
      const s = isRight ? -1 : 1;
      const hip = new THREE.Group();
      hip.position.set(s * 0.095, -0.04, 0);
      pelvis.add(hip);

      const thigh = new THREE.Mesh(prims.cyl8, isFemale && role === 'club_dancer' ? skinMat : pantsMat);
      thigh.position.set(0, -0.20, 0);
      thigh.scale.set(0.105, 0.40, 0.105);
      hip.add(thigh);

      const knee = new THREE.Group();
      knee.position.set(0, -0.40, 0);
      hip.add(knee);

      const calf = new THREE.Mesh(prims.cyl8, isFemale && (role === 'club_dancer' || role === 'high_roller') ? skinMat : pantsMat);
      calf.position.set(0, -0.19, 0);
      calf.scale.set(0.086, 0.38, 0.086);
      knee.add(calf);

      const shoe = new THREE.Mesh(prims.box, shoeMat);
      shoe.position.set(0, -0.40, 0.035);
      shoe.scale.set(0.088, 0.068, 0.185);
      knee.add(shoe);

      return { hip, knee, shoe };
    }

    const legL = buildVenueLeg(false);
    const legR = buildVenueLeg(true);

    // Apply Seated Pose or Role Rest Pose immediately
    if (opts.seated) {
      legL.hip.rotation.x = -Math.PI * 0.47;
      legR.hip.rotation.x = -Math.PI * 0.47;
      legL.knee.rotation.x = Math.PI * 0.47;
      legR.knee.rotation.x = Math.PI * 0.47;
      armL.shoulder.rotation.x = -0.52;
      armR.shoulder.rotation.x = -0.52;
      armL.elbow.rotation.x = -0.65;
      armR.elbow.rotation.x = -0.65;
    } else if (role === 'bouncer' || role === 'security_guard') {
      armL.shoulder.rotation.set(-0.38, 0, -0.24);
      armR.shoulder.rotation.set(-0.38, 0, 0.24);
      armL.elbow.rotation.set(-0.85, 0, -0.45);
      armR.elbow.rotation.set(-0.85, 0, 0.45);
    } else if (role === 'waitress') {
      armR.shoulder.rotation.x = -0.68;
      armR.elbow.rotation.x = -0.92;
    }

    const npc = {
      root,
      role,
      seed,
      seated: Boolean(opts.seated),
      danceStyle: seed % 6,
      phase: (seed * 1.37) % TAU,
      baseY: opts.seated ? 0.54 : 0.92,
      pelvis,
      torso,
      head,
      armL,
      armR,
      legL,
      legR,
      patrolPath: opts.patrolPath || null,
      patrolT: rng(),
    };
    return npc;
  }

  function animateVenueNPC(npc, elapsed, beatPulse) {
    const t = elapsed + npc.phase;
    const role = npc.role;

    if (role === 'dealer_asian') {
      npc.torso.rotation.y = Math.sin(t * 1.4) * 0.14;
      npc.head.rotation.y = Math.sin(t * 0.9) * 0.22;
      const shakeCycle = Math.sin(t * 1.8) > 0.55;
      if (shakeCycle) {
        npc.armR.shoulder.rotation.x = -0.78 + Math.sin(t * 18.0) * 0.16;
        npc.armR.elbow.rotation.x = -0.72 + Math.cos(t * 18.0) * 0.18;
      } else {
        npc.armR.shoulder.rotation.x = -0.45 + Math.sin(t * 2.4) * 0.22;
        npc.armR.shoulder.rotation.z = 0.12 + Math.cos(t * 2.4) * 0.15;
        npc.armR.elbow.rotation.x = -0.58;
      }
      npc.armL.shoulder.rotation.x = -0.35 + Math.cos(t * 1.7) * 0.12;
      npc.armL.elbow.rotation.x = -0.55;
    } else if (role === 'dealer_western' || role === 'cashier_teller') {
      npc.torso.rotation.y = Math.sin(t * 1.2) * 0.16;
      npc.head.rotation.y = Math.sin(t * 0.85) * 0.25;
      // Smooth card-dealing / chip-sliding sweep
      const dealSweep = Math.sin(t * 2.8);
      npc.armR.shoulder.rotation.x = -0.58 + Math.abs(dealSweep) * 0.18;
      npc.armR.shoulder.rotation.y = dealSweep * 0.34;
      npc.armR.elbow.rotation.x = -0.68 + dealSweep * 0.16;
      npc.armL.shoulder.rotation.x = -0.44;
      npc.armL.elbow.rotation.x = -0.64;
    } else if (role === 'high_roller' && npc.seated) {
      npc.torso.rotation.x = 0.08 + Math.sin(t * 1.1) * 0.06;
      npc.head.rotation.y = Math.sin(t * 0.95) * 0.28;
      npc.head.rotation.x = 0.12 + Math.cos(t * 1.4) * 0.08;
      npc.armR.shoulder.rotation.x = -0.56 + Math.sin(t * 2.1) * 0.16;
      npc.armR.elbow.rotation.x = -0.68 + Math.cos(t * 2.1) * 0.14;
    } else if (role === 'security_guard' || role === 'bouncer') {
      npc.head.rotation.y = Math.sin(t * 0.72) * 0.38;
      npc.torso.position.y = 0.09 + Math.sin(t * 1.9) * 0.006;
    } else if (role === 'valet') {
      npc.head.rotation.y = Math.sin(t * 1.1) * 0.28;
      npc.armR.shoulder.rotation.x = -0.85 + Math.sin(t * 3.2) * 0.28;
      npc.armR.shoulder.rotation.z = 0.35 + Math.cos(t * 3.2) * 0.18;
      npc.armR.elbow.rotation.x = -0.75;
    } else if (role === 'bartender') {
      npc.torso.rotation.y = Math.sin(t * 1.8) * 0.22;
      npc.armR.shoulder.rotation.x = -0.95 + Math.sin(t * 11.5) * 0.24;
      npc.armR.elbow.rotation.x = -0.88 + Math.cos(t * 11.5) * 0.22;
      npc.armL.shoulder.rotation.x = -0.52 + Math.sin(t * 2.6) * 0.16;
      npc.armL.elbow.rotation.x = -0.62;
    } else if (role === 'dj_artist') {
      const bounce = beatPulse * 0.065;
      npc.pelvis.position.y = npc.baseY - bounce;
      npc.head.rotation.x = 0.16 + beatPulse * 0.24;
      npc.head.rotation.y = Math.sin(t * 2.1) * 0.26;
      // Right arm fist-pumping the club crowd!
      npc.armR.shoulder.rotation.x = -2.35 - beatPulse * 0.42;
      npc.armR.shoulder.rotation.z = 0.22 + Math.sin(t * 3.3) * 0.14;
      npc.armR.elbow.rotation.x = -0.35 - beatPulse * 0.25;
      // Left hand working mixer crossfader
      npc.armL.shoulder.rotation.x = -0.72;
      npc.armL.shoulder.rotation.y = Math.sin(t * 5.2) * 0.22;
      npc.armL.elbow.rotation.x = -0.68;
    } else if (role === 'club_dancer') {
      const groove = Math.sin(elapsed * (128 / 60) * Math.PI + npc.phase);
      const halfGroove = Math.sin(elapsed * (64 / 60) * Math.PI + npc.phase);
      npc.pelvis.position.y = npc.baseY - beatPulse * 0.06;
      npc.pelvis.rotation.y = halfGroove * 0.24;
      npc.torso.rotation.z = halfGroove * 0.11;
      npc.head.rotation.x = beatPulse * 0.18;
      npc.head.rotation.y = -halfGroove * 0.2;

      const style = npc.danceStyle;
      if (style === 0) {
        // Rave Fist-Pump
        npc.armR.shoulder.rotation.set(-2.2 - beatPulse * 0.45, 0, 0.22);
        npc.armR.elbow.rotation.set(-0.4, 0, 0);
        npc.armL.shoulder.rotation.set(-0.7 + groove * 0.35, 0, -0.25);
        npc.armL.elbow.rotation.set(-0.85, 0, 0);
      } else if (style === 1) {
        // House Dual-Arm Wave
        npc.armL.shoulder.rotation.set(-1.6 + groove * 0.5, 0, -0.35);
        npc.armR.shoulder.rotation.set(-1.6 - groove * 0.5, 0, 0.35);
        npc.armL.elbow.rotation.set(-0.55, 0, 0);
        npc.armR.elbow.rotation.set(-0.55, 0, 0);
      } else if (style === 2) {
        // Hip-Hop Bounce & Cross
        npc.armL.shoulder.rotation.set(-0.85, halfGroove * 0.4, -0.2);
        npc.armR.shoulder.rotation.set(-0.85, -halfGroove * 0.4, 0.2);
        npc.armL.elbow.rotation.set(-1.05, 0, 0);
        npc.armR.elbow.rotation.set(-1.05, 0, 0);
      } else if (style === 3) {
        // Disco Sky Point
        npc.armR.shoulder.rotation.set(-2.45 * clamp(0.5 + 0.5 * halfGroove, 0.2, 1), 0, 0.42);
        npc.armL.shoulder.rotation.set(-0.4, 0, -0.35);
        npc.armR.elbow.rotation.set(-0.18, 0, 0);
        npc.armL.elbow.rotation.set(-0.9, 0, 0);
      } else if (style === 4) {
        // Cyber Shuffle
        npc.legL.hip.rotation.x = groove * 0.34;
        npc.legR.hip.rotation.x = -groove * 0.34;
        npc.legL.knee.rotation.x = Math.max(0, -groove * 0.45);
        npc.legR.knee.rotation.x = Math.max(0, groove * 0.45);
        npc.armL.shoulder.rotation.set(-0.65 - groove * 0.4, 0, -0.22);
        npc.armR.shoulder.rotation.set(-0.65 + groove * 0.4, 0, 0.22);
      } else {
        // Hands-Up Club Euphoria
        npc.armL.shoulder.rotation.set(-2.35, 0, -0.32 + halfGroove * 0.16);
        npc.armR.shoulder.rotation.set(-2.35, 0, 0.32 + halfGroove * 0.16);
        npc.armL.elbow.rotation.set(-0.32, 0, 0);
        npc.armR.elbow.rotation.set(-0.32, 0, 0);
      }

      if (style !== 4) {
        npc.legL.knee.rotation.x = beatPulse * 0.22;
        npc.legR.knee.rotation.x = beatPulse * 0.22;
        npc.legL.hip.rotation.x = -beatPulse * 0.11 + halfGroove * 0.12;
        npc.legR.hip.rotation.x = -beatPulse * 0.11 - halfGroove * 0.12;
      }
    } else if (npc.patrolPath && npc.patrolPath.length >= 2) {
      // Strolling High-Roller / Waitress along Casino Promenade
      const speed = 0.055;
      const u = (elapsed * speed + npc.patrolT) % 2.0;
      const pingPong = u <= 1.0 ? u : 2.0 - u;
      const p0 = npc.patrolPath[0];
      const p1 = npc.patrolPath[1];
      const nx = lerp(p0.x, p1.x, pingPong);
      const nz = lerp(p0.z, p1.z, pingPong);
      const dirSign = u <= 1.0 ? 1 : -1;
      npc.root.position.x = nx;
      npc.root.position.z = nz;
      npc.root.rotation.y = Math.atan2((p1.x - p0.x) * dirSign, (p1.z - p0.z) * dirSign);

      const stride = Math.sin(elapsed * 4.8 + npc.phase);
      npc.legL.hip.rotation.x = stride * 0.36;
      npc.legR.hip.rotation.x = -stride * 0.36;
      npc.legL.knee.rotation.x = Math.max(0, -stride * 0.42);
      npc.legR.knee.rotation.x = Math.max(0, stride * 0.42);
      if (role !== 'waitress') {
        npc.armR.shoulder.rotation.x = stride * 0.26;
      }
      npc.armL.shoulder.rotation.x = -stride * 0.26;
    }
  }

  // --------------------------------------------------------------------------
  // SCULPTED GOLD/CHROME HYPERCAR BUILDER (PODIUM TURNTABLE & VALET SHOWCASE)
  // --------------------------------------------------------------------------
  function buildSculptedHypercar(mats, options = {}) {
    const primaryMat = options.primaryMat || mats.gold24k;
    const secondaryMat = options.secondaryMat || mats.liquidChrome;
    const trimMat = options.trimMat || mats.carbonFiber;
    const accentGlowMat = options.accentGlowMat || mats.neonCyan;

    const carGroup = new THREE.Group();
    carGroup.name = options.name || 'PodiumHypercar';

    // 1. Low-Slung Aerodynamic Carbon Floorpan & Venturi Diffuser
    const floorpan = new THREE.Mesh(prims.box, trimMat);
    floorpan.position.set(0, 0.24, 0);
    floorpan.scale.set(1.98, 0.12, 4.52);
    carGroup.add(floorpan);

    // Front razor splitter + twin side aero winglets
    const frontSplitter = new THREE.Mesh(prims.box, trimMat);
    frontSplitter.position.set(0, 0.17, 2.28);
    frontSplitter.scale.set(2.04, 0.045, 0.38);
    carGroup.add(frontSplitter);

    for (const s of [-1, 1]) {
      const winglet = new THREE.Mesh(prims.box, secondaryMat);
      winglet.position.set(s * 1.01, 0.24, 2.22);
      winglet.rotation.z = s * -0.18;
      winglet.scale.set(0.04, 0.16, 0.34);
      carGroup.add(winglet);

      const sideSkirt = new THREE.Mesh(prims.box, trimMat);
      sideSkirt.position.set(s * 1.01, 0.18, -0.05);
      sideSkirt.scale.set(0.08, 0.055, 2.68);
      carGroup.add(sideSkirt);

      // Glowing underbody / rocker neon blade
      const neonBlade = new THREE.Mesh(prims.box, accentGlowMat);
      neonBlade.position.set(s * 0.96, 0.145, -0.05);
      neonBlade.scale.set(0.035, 0.022, 2.5);
      carGroup.add(neonBlade);
    }

    // 2. Sculpted Wedge Nose, Front Hood & Flared Fender Arches
    const mainBody = new THREE.Mesh(prims.box, primaryMat);
    mainBody.position.set(0, 0.46, -0.05);
    mainBody.scale.set(1.94, 0.38, 4.18);
    mainBody.castShadow = true;
    carGroup.add(mainBody);

    const noseSlope = new THREE.Mesh(prims.box, primaryMat);
    noseSlope.position.set(0, 0.39, 1.72);
    noseSlope.rotation.x = 0.24;
    noseSlope.scale.set(1.86, 0.24, 1.18);
    noseSlope.castShadow = true;
    carGroup.add(noseSlope);

    // Center Chrome Spine Crest along hood & roof
    const centerCrest = new THREE.Mesh(prims.box, secondaryMat);
    centerCrest.position.set(0, 0.56, 1.48);
    centerCrest.rotation.x = 0.21;
    centerCrest.scale.set(0.14, 0.04, 1.35);
    carGroup.add(centerCrest);

    for (const s of [-1, 1]) {
      const frontFender = new THREE.Mesh(prims.box, primaryMat);
      frontFender.position.set(s * 0.88, 0.55, 1.32);
      frontFender.rotation.x = 0.08;
      frontFender.scale.set(0.34, 0.26, 1.24);
      carGroup.add(frontFender);

      const rearHaunch = new THREE.Mesh(prims.box, primaryMat);
      rearHaunch.position.set(s * 0.90, 0.62, -1.22);
      rearHaunch.rotation.x = -0.06;
      rearHaunch.scale.set(0.38, 0.34, 1.56);
      carGroup.add(rearHaunch);

      // Deep Side Mid-Engine Air Scoop Intake
      const sideScoop = new THREE.Mesh(prims.box, trimMat);
      sideScoop.position.set(s * 0.975, 0.52, -0.45);
      sideScoop.rotation.y = s * 0.14;
      sideScoop.scale.set(0.08, 0.26, 0.72);
      carGroup.add(sideScoop);
    }

    // 3. Teardrop Fighter-Jet Glass Canopy + Interior Cockpit
    const canopyGlass = new THREE.Mesh(prims.box, mats.tintedCanopyGlass);
    canopyGlass.position.set(0, 0.82, 0.12);
    canopyGlass.scale.set(1.42, 0.40, 1.78);
    carGroup.add(canopyGlass);

    const windshieldSlope = new THREE.Mesh(prims.box, mats.tintedCanopyGlass);
    windshieldSlope.position.set(0, 0.76, 0.92);
    windshieldSlope.rotation.x = 0.56;
    windshieldSlope.scale.set(1.38, 0.08, 0.98);
    carGroup.add(windshieldSlope);

    const roofCap = new THREE.Mesh(prims.box, secondaryMat);
    roofCap.position.set(0, 1.03, -0.02);
    roofCap.scale.set(1.18, 0.045, 1.12);
    carGroup.add(roofCap);

    const roofScoop = new THREE.Mesh(prims.box, trimMat);
    roofScoop.position.set(0, 1.08, -0.18);
    roofScoop.scale.set(0.32, 0.09, 0.68);
    carGroup.add(roofScoop);

    // Animated Scissor Doors (Left & Right Pivots at Front A-Pillar Hinge!)
    const leftDoorPivot = new THREE.Group();
    leftDoorPivot.position.set(0.95, 0.64, 0.68);
    const leftDoorPanel = new THREE.Mesh(prims.box, primaryMat);
    leftDoorPanel.position.set(0.02, -0.12, -0.58);
    leftDoorPanel.scale.set(0.07, 0.34, 1.16);
    leftDoorPivot.add(leftDoorPanel);
    carGroup.add(leftDoorPivot);

    const rightDoorPivot = new THREE.Group();
    rightDoorPivot.position.set(-0.95, 0.64, 0.68);
    const rightDoorPanel = new THREE.Mesh(prims.box, primaryMat);
    rightDoorPanel.position.set(-0.02, -0.12, -0.58);
    rightDoorPanel.scale.set(0.07, 0.34, 1.16);
    rightDoorPivot.add(rightDoorPanel);
    carGroup.add(rightDoorPivot);

    // 4. Rear Mid-Engine V12 Showcase Deck + Louvers + Active Swan-Neck GT Wing
    for (let lv = 0; lv < 5; lv++) {
      const louver = new THREE.Mesh(prims.box, secondaryMat);
      louver.position.set(0, 0.89 - lv * 0.045, -0.78 - lv * 0.22);
      louver.rotation.x = -0.22;
      louver.scale.set(1.14 - lv * 0.05, 0.028, 0.16);
      carGroup.add(louver);
    }

    for (const s of [-1, 1]) {
      const pylon = new THREE.Mesh(prims.box, trimMat);
      pylon.position.set(s * 0.52, 0.94, -1.96);
      pylon.rotation.x = -0.28;
      pylon.scale.set(0.05, 0.36, 0.22);
      carGroup.add(pylon);

      const endplate = new THREE.Mesh(prims.box, primaryMat);
      endplate.position.set(s * 0.98, 1.10, -2.06);
      endplate.scale.set(0.035, 0.22, 0.42);
      carGroup.add(endplate);
    }

    const gtWingBlade = new THREE.Mesh(prims.box, secondaryMat);
    gtWingBlade.position.set(0, 1.11, -2.06);
    gtWingBlade.rotation.x = 0.12;
    gtWingBlade.scale.set(1.96, 0.042, 0.36);
    carGroup.add(gtWingBlade);

    // 5. Boomerang LED DRL Headlights, Full-Width Cyber Taillight & Quad Exhausts
    for (const s of [-1, 1]) {
      const headLight = new THREE.Mesh(prims.box, mats.neonCyan);
      headLight.position.set(s * 0.72, 0.44, 2.18);
      headLight.rotation.y = s * -0.28;
      headLight.rotation.z = s * 0.14;
      headLight.scale.set(0.38, 0.045, 0.08);
      carGroup.add(headLight);
    }

    const tailBar = new THREE.Mesh(prims.box, mats.neonCrimson);
    tailBar.position.set(0, 0.58, -2.16);
    tailBar.scale.set(1.82, 0.055, 0.06);
    carGroup.add(tailBar);

    for (const exX of [-0.34, -0.14, 0.14, 0.34]) {
      const pipe = new THREE.Mesh(prims.cyl16, secondaryMat);
      pipe.position.set(exX, 0.31, -2.23);
      pipe.rotation.x = Math.PI * 0.5;
      pipe.scale.set(0.11, 0.16, 0.11);
      carGroup.add(pipe);
    }

    // Rear Diffuser Fins
    for (let df = -3; df <= 3; df++) {
      const fin = new THREE.Mesh(prims.box, trimMat);
      fin.position.set(df * 0.24, 0.21, -2.18);
      fin.scale.set(0.028, 0.15, 0.28);
      carGroup.add(fin);
    }

    // 6. 4 Multi-Spoke Forged Alloy Wheels + Ventilated Discs + Red Calipers
    const tireMat = mats.blackLeather;
    const wheelPositions = [
      { x: 0.94, y: 0.35, z: 1.38, right: true },
      { x: -0.94, y: 0.35, z: 1.38, right: false },
      { x: 0.96, y: 0.37, z: -1.34, right: true },
      { x: -0.96, y: 0.37, z: -1.34, right: false },
    ];
    const wheelGroups = [];

    for (let wi = 0; wi < wheelPositions.length; wi++) {
      const wp = wheelPositions[wi];
      const wGrp = new THREE.Group();
      wGrp.position.set(wp.x, wp.y, wp.z);

      const tire = new THREE.Mesh(prims.cyl24, tireMat);
      tire.rotation.z = Math.PI * 0.5;
      tire.scale.set(wp.y * 2.0, 0.29, wp.y * 2.0);
      wGrp.add(tire);

      const rimOuter = new THREE.Mesh(prims.cyl24, secondaryMat);
      rimOuter.rotation.z = Math.PI * 0.5;
      rimOuter.scale.set(wp.y * 1.48, 0.305, wp.y * 1.48);
      wGrp.add(rimOuter);

      const brakeDisc = new THREE.Mesh(prims.cyl16, mats.darkGunmetal);
      brakeDisc.rotation.z = Math.PI * 0.5;
      brakeDisc.scale.set(wp.y * 1.15, 0.312, wp.y * 1.15);
      wGrp.add(brakeDisc);

      const caliper = new THREE.Mesh(prims.box, mats.crimsonVelvet);
      caliper.position.set(wp.right ? 0.13 : -0.13, 0.08, -0.09);
      caliper.scale.set(0.06, 0.14, 0.11);
      wGrp.add(caliper);

      for (let sp = 0; sp < 5; sp++) {
        const ang = (sp / 5) * Math.PI;
        const spoke = new THREE.Mesh(prims.box, primaryMat);
        spoke.position.set(wp.right ? 0.148 : -0.148, 0, 0);
        spoke.rotation.x = ang;
        spoke.scale.set(0.025, wp.y * 1.42, 0.042);
        wGrp.add(spoke);
      }

      carGroup.add(wGrp);
      wheelGroups.push(wGrp);
    }

    carGroup.userData = {
      leftDoorPivot,
      rightDoorPivot,
      wheelGroups,
      scissorOpen: 0,
    };
    return carGroup;
  }

  // --------------------------------------------------------------------------
  // SCULPTED ILLUMINATED ROYAL RESORT PALM TREE & VELVET ROPE STANCHIONS
  // --------------------------------------------------------------------------
  const colPalmBark = new THREE.Color(0x6b4f38);
  const colPalmLeaf = new THREE.Color(0x1f8a4c);
  const colPalmLeafTip = new THREE.Color(0x34b362);
  const colCoconut = new THREE.Color(0x4a3219);

  function addIlluminatedResortPalm(batch, mats, x, y, z, scale = 1.0, leanX = 0.05, leanZ = 0.02, uplightMat = mats.neonGold) {
    // Circular Marble Planter Ring + Warm Resort Uplights
    batch.add(prims.cyl16, mats.calacattaMarble, x, y + 0.18, z, 0, 0, 0, 2.2 * scale, 0.36, 2.2 * scale, { receiveShadow: true });
    batch.add(prims.cyl16, mats.obsidianFloor, x, y + 0.37, z, 0, 0, 0, 1.85 * scale, 0.04, 1.85 * scale);
    batch.add(prims.torus16, uplightMat, x, y + 0.40, z, Math.PI * 0.5, 0, 0, 1.35 * scale, 1.35 * scale, 0.65);

    const segs = 12;
    const totalH = 9.2 * scale;
    let topX = x;
    let topY = y + 0.35;
    let topZ = z;

    for (let i = 0; i < segs; i++) {
      const t0 = i / segs;
      const t1 = (i + 1) / segs;
      const tm = (t0 + t1) * 0.5;
      const sx = x + leanX * tm * tm * totalH;
      const sz = z + leanZ * tm * tm * totalH;
      const sy = y + 0.35 + tm * totalH;
      const rad = lerp(0.42, 0.22, tm) * scale;
      const segH = (totalH / segs) * 1.08;

      batch.add(
        prims.cyl8,
        mats.vertexStd,
        sx,
        sy,
        sz,
        leanZ * tm * 0.85,
        i * 0.4,
        -leanX * tm * 0.85,
        rad,
        segH,
        rad,
        { color: colPalmBark, castShadow: true }
      );
      topX = x + leanX * t1 * t1 * totalH;
      topY = y + 0.35 + t1 * totalH;
      topZ = z + leanZ * t1 * t1 * totalH;
    }

    // Coconut Cluster under Crown
    for (let c = 0; c < 4; c++) {
      const ca = (c / 4) * TAU;
      batch.add(
        prims.sphere10,
        mats.vertexStd,
        topX + Math.cos(ca) * 0.22 * scale,
        topY - 0.12,
        topZ + Math.sin(ca) * 0.22 * scale,
        0, 0, 0,
        0.22 * scale, 0.24 * scale, 0.22 * scale,
        { color: colCoconut }
      );
    }

    // 11 Gracefully Arched Multi-Segment Fronds
    const frondCount = 11;
    for (let f = 0; f < frondCount; f++) {
      const yaw = (f / frondCount) * TAU + (f % 2) * 0.16;
      const elevate = (f % 3 === 0) ? 0.38 : 0.12;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);

      for (let s = 0; s < 4; s++) {
        const dist = (0.55 + s * 0.68) * scale;
        const droop = elevate * dist - 0.14 * s * s * scale;
        const pitch = -elevate + s * 0.28;
        const leafW = (0.52 - s * 0.08) * scale;
        const leafL = 0.78 * scale;
        batch.add(
          prims.box,
          mats.vertexStd,
          topX + fx * dist,
          topY + 0.18 + droop,
          topZ + fz * dist,
          pitch,
          yaw,
          0,
          leafW,
          0.045,
          leafL,
          { color: s >= 2 ? colPalmLeafTip : colPalmLeaf, castShadow: true }
        );
      }
    }
  }

  function addVelvetRopeRun(batch, mats, posts, postMat = mats.gold24k, ropeMat = mats.crimsonVelvet) {
    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      batch.add(prims.cyl16, postMat, p.x, p.y + 0.03, p.z, 0, 0, 0, 0.30, 0.06, 0.30);
      batch.add(prims.cyl8, postMat, p.x, p.y + 0.52, p.z, 0, 0, 0, 0.055, 0.96, 0.055);
      batch.add(prims.sphere10, postMat, p.x, p.y + 1.03, p.z, 0, 0, 0, 0.11, 0.11, 0.11);

      if (i < posts.length - 1) {
        const q = posts[i + 1];
        const segs = 5;
        for (let s = 0; s < segs; s++) {
          const u0 = s / segs;
          const u1 = (s + 1) / segs;
          const um = (u0 + u1) * 0.5;
          const sag0 = Math.sin(u0 * Math.PI) * 0.18;
          const sag1 = Math.sin(u1 * Math.PI) * 0.18;
          const x0 = lerp(p.x, q.x, u0), y0 = lerp(p.y, q.y, u0) + 0.92 - sag0, z0 = lerp(p.z, q.z, u0);
          const x1 = lerp(p.x, q.x, u1), y1 = lerp(p.y, q.y, u1) + 0.92 - sag1, z1 = lerp(p.z, q.z, u1);
          const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
          const len = Math.hypot(dx, dy, dz) || 0.01;
          const yaw = Math.atan2(dx, dz);
          const pitch = Math.atan2(Math.hypot(dx, dz), dy);
          batch.add(
            prims.cyl8,
            ropeMat,
            lerp(p.x, q.x, um),
            (y0 + y1) * 0.5,
            lerp(p.z, q.z, um),
            pitch,
            yaw,
            0,
            0.052,
            len * 1.05,
            0.052
          );
        }
      }
    }
  }

  function addGrandCrystalChandelier(batch, parentGroup, mats, cx, cy, cz, outerRadius = 2.4, tiers = 4) {
    // Ceiling medallion & central brass suspension chain
    batch.add(prims.cyl24, mats.gold24k, cx, cy - 0.06, cz, 0, 0, 0, 1.15, 0.12, 1.15);
    batch.add(prims.cyl8, mats.gold24k, cx, cy - 0.62, cz, 0, 0, 0, 0.09, 1.15, 0.09);

    for (let t = 0; t < tiers; t++) {
      const frac = t / Math.max(1, tiers - 1);
      const rad = lerp(outerRadius, outerRadius * 0.34, frac);
      const ty = cy - 0.95 - t * 0.44;

      // Gilded brass tier hoop
      batch.add(prims.torus32, mats.gold24k, cx, ty, cz, Math.PI * 0.5, 0, 0, rad * 2.0, rad * 2.0, 0.8);

      // Radial spokes
      for (let sp = 0; sp < 6; sp++) {
        const sa = (sp / 6) * TAU;
        batch.add(
          prims.box,
          mats.gold24k,
          cx + Math.cos(sa) * rad * 0.5,
          ty + 0.12,
          cz + Math.sin(sa) * rad * 0.5,
          0,
          -sa,
          0.22,
          rad,
          0.03,
          0.03
        );
      }

      // Hanging crystal prisms around circumference
      const count = Math.max(10, Math.round(rad * 12));
      for (let k = 0; k < count; k++) {
        const a = (k / count) * TAU + t * 0.19;
        const px = cx + Math.cos(a) * rad;
        const pz = cz + Math.sin(a) * rad;
        const dropLen = 0.32 + (k % 2) * 0.12;
        batch.add(prims.octa, mats.chandelierCrystal, px, ty - dropLen * 0.5, pz, 0, a, 0, 0.11, dropLen, 0.11);
      }
    }

    // Bottom imperial diamond finial
    const finY = cy - 1.05 - tiers * 0.44;
    batch.add(prims.octa, mats.crystalDiamond, cx, finY, cz, 0, 0, 0, 0.36, 0.52, 0.36);

    const ptLight = new THREE.PointLight(0xffdf9a, 1.65, 28, 1.5);
    ptLight.position.set(cx, cy - 1.65, cz);
    parentGroup.add(ptLight);
    return ptLight;
  }

  // --------------------------------------------------------------------------
  // 9. EXTERIOR LANDMARK 1: "DIAMOND CROWN CASINO & RESORT"
  //    Bounds: X in [214, 274], Z in [-152, -68], Facing West onto X = +200
  //    Entry Corona: (209.5, 0.22, -110) | Heist VIP Side Entry: (209.5, 0.22, -92)
  // --------------------------------------------------------------------------
  function buildCasinoExteriorLandmark(mats, exteriorState) {
    const group = new THREE.Group();
    group.name = 'DiamondCrownCasinoExterior';
    const batch = createBatchBuilder(group);

    const baseY = CASINO_EXT.sidewalkY; // 0.22

    // 9.1 Grand Marble Forecourt & Resort Plaza Apron
    // West Plaza Forecourt (X in [208.5, 230.0], Z in [-152, -68])
    batch.add(prims.box, mats.calacattaMarble, 219.2, baseY - 0.08, -110.0, 0, 0, 0, 21.6, 0.20, 84.0, { receiveShadow: true });
    // East Tower Resort Plinth (X in [244.0, 274.0], Z in [-152, -68]) — leaves X in [230, 244] open at ground for highway piers!
    batch.add(prims.box, mats.calacattaMarble, 259.0, baseY + 0.15, -110.0, 0, 0, 0, 30.0, 0.65, 84.0, { receiveShadow: true });
    batch.add(prims.box, mats.gold24k, 259.0, baseY + 0.50, -110.0, 0, 0, 0, 30.2, 0.08, 84.2);

    // Royal Red & Gold Carpet Runner leading from (209.5, -110) into Grand Lobby Doors (216.5, -110)
    batch.add(prims.box, mats.crimsonVelvet, 213.2, baseY + 0.03, -110.0, 0, 0, 0, 8.2, 0.03, 5.4, { receiveShadow: true });
    batch.add(prims.box, mats.gold24k, 213.2, baseY + 0.035, -112.75, 0, 0, 0, 8.2, 0.035, 0.18);
    batch.add(prims.box, mats.gold24k, 213.2, baseY + 0.035, -107.25, 0, 0, 0, 8.2, 0.035, 0.18);

    // 9.2 West Grand Casino Atrium Podium Wing (X in [216.5, 229.0], Z in [-144, -72], Height 16.8m)
    const atriumX = 222.8;
    const atriumZ = -108.0;
    const atriumW = 12.6;
    const atriumD = 70.0;
    const atriumH = 16.8;

    batch.add(
      prims.box,
      mats.casinoTowerGlass,
      atriumX,
      baseY + atriumH * 0.5,
      atriumZ,
      0, 0, 0,
      atriumW,
      atriumH,
      atriumD,
      { castShadow: true, receiveShadow: true }
    );

    // Art-Deco Fluted Gold Pilaster Ribs along West Facade (X = 216.5)
    for (let pz = -141; pz <= -75; pz += 6.6) {
      batch.add(prims.box, mats.gold24k, 216.42, baseY + atriumH * 0.5, pz, 0, 0, 0, 0.52, atriumH + 0.4, 0.68, { castShadow: true });
      batch.add(prims.octa, mats.gold24k, 216.42, baseY + atriumH + 0.65, pz, 0, 0, 0, 0.65, 1.1, 0.65);
    }

    // Stepped Art-Deco Cornice & Neon Purple Roofline Trim on West Wing
    batch.add(prims.box, mats.creamLimestone, atriumX, baseY + atriumH + 0.35, atriumZ, 0, 0, 0, atriumW + 0.8, 0.7, atriumD + 0.8);
    batch.add(prims.box, mats.neonPurple, 216.05, baseY + atriumH + 0.35, atriumZ, 0, 0, 0, 0.18, 0.24, atriumD + 0.6);
    batch.add(prims.box, mats.neonGold, 216.05, baseY + 6.4, atriumZ, 0, 0, 0, 0.16, 0.20, atriumD + 0.4);

    addExteriorAABB(216.5, 229.2, -143.0, -73.0, baseY + atriumH + 0.8, 0, 'casino_west_atrium');

    // 9.3 Sweeping Valet Porte-Cochere Drive-Through Arch (X in [209.2, 216.8], Z in [-126, -94])
    // Clear underside height = 5.4m so all supercars & SUVs drive underneath smoothly!
    const archCanopyY = baseY + 5.75;
    batch.add(prims.box, mats.creamLimestone, 213.2, archCanopyY, -110.0, 0, 0, 0, 8.6, 0.72, 26.0, { castShadow: true, receiveShadow: true });
    batch.add(prims.box, mats.gold24k, 213.2, archCanopyY + 0.48, -110.0, 0, 0, 0, 9.0, 0.26, 26.5);

    // Sweeping Curved Arch Crown Over Center Entry
    batch.add(prims.cyl24, mats.casinoTowerGlass, 213.0, archCanopyY + 1.45, -110.0, 0, 0, Math.PI * 0.5, 2.6, 8.4, 11.5);
    batch.add(prims.torus32, mats.gold24k, 208.95, archCanopyY + 0.85, -110.0, 0, Math.PI * 0.5, 0, 11.2, 4.2, 1.2);

    // Animated Chasing Marquee Bulb Strips along Porte-Cochere West, North & South Friezes!
    const mqWest = new THREE.Mesh(new THREE.PlaneGeometry(26.4, 0.62), mats.marqueeGoldPurple);
    mqWest.position.set(208.88, archCanopyY, -110.0);
    mqWest.rotation.y = -Math.PI * 0.5;
    group.add(mqWest);

    const mqNorth = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 0.62), mats.marqueeGoldPurple);
    mqNorth.position.set(213.2, archCanopyY, -123.05);
    mqNorth.rotation.y = Math.PI;
    group.add(mqNorth);

    const mqSouth = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 0.62), mats.marqueeGoldPurple);
    mqSouth.position.set(213.2, archCanopyY, -96.95);
    group.add(mqSouth);

    // Porte-Cochere Fluted Marble & Gold Columns (placed outside drive/entry center!)
    const porteCols = [
      { x: 209.6, z: -122.0 },
      { x: 209.6, z: -115.2 },
      { x: 209.6, z: -104.8 },
      { x: 209.6, z: -98.0 },
    ];
    for (const pc of porteCols) {
      batch.add(prims.box, mats.gold24k, pc.x, baseY + 0.25, pc.z, 0, 0, 0, 0.92, 0.5, 0.92);
      batch.add(prims.cyl16, mats.calacattaMarble, pc.x, baseY + 2.85, pc.z, 0, 0, 0, 0.68, 4.9, 0.68, { castShadow: true });
      batch.add(prims.box, mats.gold24k, pc.x, baseY + 5.32, pc.z, 0, 0, 0, 0.96, 0.28, 0.96);
      addExteriorAABB(pc.x - 0.45, pc.x + 0.45, pc.z - 0.45, pc.z + 0.45, baseY + 5.4, 0, 'casino_porte_col');
    }
    // Porte-Cochere Roof Slab AABB (minY = 5.45m so cars & player pass freely underneath!)
    addExteriorAABB(208.9, 216.6, -123.2, -96.8, baseY + 7.2, baseY + 5.45, 'casino_porte_roof');

    // Grand Brass & Crystal Double Revolving Doors at (216.3, baseY, -110) + VIP Side Door at (216.3, baseY, -92)
    for (const doorZ of [-110.0, -92.0]) {
      const isMain = doorZ === -110.0;
      const dw = isMain ? 5.2 : 3.0;
      batch.add(prims.box, mats.gold24k, 216.35, baseY + 2.1, doorZ, 0, 0, 0, 0.45, 4.2, dw + 0.6);
      batch.add(prims.box, mats.clearDomeGlass, 216.22, baseY + 1.95, doorZ, 0, 0, 0, 0.16, 3.7, dw);
      if (isMain) {
        batch.add(prims.cyl24, mats.clearDomeGlass, 215.65, baseY + 1.85, doorZ, 0, 0, 0, 2.6, 3.6, 2.6);
        batch.add(prims.cyl24, mats.gold24k, 215.65, baseY + 3.72, doorZ, 0, 0, 0, 2.75, 0.22, 2.75);
      }
    }

    // 9.4 58m Curved Art-Deco Glass & Gold Resort Skyscraper Complex (X in [245.5, 273.5], Z in [-148, -72])
    const twX = 259.5;
    const twZ = -110.0;

    // Tier 1: Lower Curved Resort Hotel Wing (0..24m)
    batch.add(prims.cyl24, mats.casinoTowerGlass, twX, baseY + 12.0, twZ, 0, 0, 0, 25.0, 24.0, 68.0, { castShadow: true, receiveShadow: true });
    batch.add(prims.cyl24, mats.gold24k, twX, baseY + 24.15, twZ, 0, 0, 0, 25.8, 0.55, 68.8);

    // Tier 2: Mid Curved High-Roller Suites (24..42m)
    batch.add(prims.cyl24, mats.casinoTowerGlass, twX + 0.8, baseY + 33.0, twZ, 0, 0, 0, 21.5, 18.0, 54.0, { castShadow: true, receiveShadow: true });
    batch.add(prims.cyl24, mats.gold24k, twX + 0.8, baseY + 42.15, twZ, 0, 0, 0, 22.3, 0.55, 54.8);

    // Tier 3: Upper Penthouse Sky-Villa Tower (42..54m)
    batch.add(prims.cyl24, mats.casinoTowerGlass, twX + 1.4, baseY + 48.0, twZ, 0, 0, 0, 17.5, 12.0, 40.0, { castShadow: true, receiveShadow: true });
    batch.add(prims.cyl24, mats.gold24k, twX + 1.4, baseY + 54.15, twZ, 0, 0, 0, 18.4, 0.55, 40.8);

    // Tier 4: Imperial Art-Deco Lantern Crown (54..58m)
    batch.add(prims.cyl16, mats.casinoTowerGlass, twX + 1.4, baseY + 56.0, twZ, 0, 0, 0, 12.6, 4.0, 26.0, { castShadow: true });
    batch.add(prims.cyl16, mats.gold24k, twX + 1.4, baseY + 58.0, twZ, 0, 0, 0, 13.4, 0.65, 26.8);

    // Vertical 24K Gold Art-Deco Skyscraper Spine Fins & Glowing Neon Ribs (visible across the entire city!)
    for (let i = -4; i <= 4; i++) {
      const fz = twZ + i * 6.8;
      const finH = Math.abs(i) <= 2 ? 57.5 : (Math.abs(i) === 3 ? 42.0 : 24.0);
      batch.add(prims.box, mats.gold24k, twX - 11.2, baseY + finH * 0.5, fz, 0, 0, 0, 0.65, finH, 0.55);
      if (Math.abs(i) <= 2) {
        batch.add(prims.box, i % 2 === 0 ? mats.neonGold : mats.neonPurple, twX - 11.6, baseY + finH * 0.5, fz, 0, 0, 0, 0.16, finH - 1.5, 0.18);
      }
    }

    // Elevated Golden Skybridge at y = 20.5m..25.0m spanning X in [228.5, 247.5] cleanly ABOVE the y = 12.5m Freeway!
    batch.add(prims.box, mats.gold24k, 238.0, 20.4, -110.0, 0, 0, 0, 20.0, 0.55, 11.6, { castShadow: true });
    batch.add(prims.box, mats.casinoTowerGlass, 238.0, 22.6, -110.0, 0, 0, 0, 19.6, 3.8, 10.8);
    batch.add(prims.box, mats.gold24k, 238.0, 24.75, -110.0, 0, 0, 0, 20.2, 0.5, 11.8);
    batch.add(prims.box, mats.neonPurple, 238.0, 20.1, -115.85, 0, 0, 0, 19.8, 0.18, 0.18);
    batch.add(prims.box, mats.neonPurple, 238.0, 20.1, -104.15, 0, 0, 0, 19.8, 0.18, 0.18);

    addExteriorAABB(245.5, 273.5, -144.0, -76.0, 58.5, 0, 'casino_main_skyscraper');
    addExteriorAABB(228.5, 246.0, -115.8, -104.2, 25.2, 20.0, 'casino_skybridge');

    // 9.5 Rotating Rooftop Giant 3D Neon Crown & Crystal Diamond Beacon (y = 62m)
    const crownBeacon = new THREE.Group();
    crownBeacon.position.set(twX + 1.4, baseY + 61.8, twZ);
    const giantDiamond = new THREE.Mesh(prims.octa, mats.crystalDiamond);
    giantDiamond.scale.set(4.2, 6.2, 4.2);
    crownBeacon.add(giantDiamond);

    const crownRing = new THREE.Mesh(prims.torus16, mats.neonGold);
    crownRing.rotation.x = Math.PI * 0.5;
    crownRing.scale.set(6.4, 6.4, 1.4);
    crownBeacon.add(crownRing);

    for (let pt = 0; pt < 8; pt++) {
      const a = (pt / 8) * TAU;
      const spike = new THREE.Mesh(prims.cone8, mats.gold24k);
      spike.position.set(Math.cos(a) * 3.1, 1.35, Math.sin(a) * 3.1);
      spike.scale.set(0.75, 2.6, 0.75);
      crownBeacon.add(spike);

      const tipJewel = new THREE.Mesh(prims.sphere10, pt % 2 === 0 ? mats.neonPurple : mats.neonGold);
      tipJewel.position.set(Math.cos(a) * 3.1, 2.75, Math.sin(a) * 3.1);
      tipJewel.scale.setScalar(0.42);
      crownBeacon.add(tipJewel);
    }
    group.add(crownBeacon);
    exteriorState.rotatingCrownBeacon = crownBeacon;

    // 9.6 Giant 3D Neon "DIAMOND CASINO" Facade Sign & Roadside Crown Pylon
    const mainSignTex = createSignBannerTexture(
      '👑 DIAMOND CASINO 💎',
      'LUXURY RESORT • VIP HIGH ROLLER • 24/7',
      { bg: '#140626', border: '#ffd54f', titleColor: '#ffe885', subColor: '#e08aff' }
    );
    const mainSignMat = new THREE.MeshStandardMaterial({
      map: mainSignTex,
      emissive: 0xffffff,
      emissiveMap: mainSignTex,
      emissiveIntensity: 1.35,
      roughness: 0.2,
    });
    const facadeSign = new THREE.Mesh(new THREE.PlaneGeometry(24.0, 5.6), mainSignMat);
    facadeSign.position.set(215.92, baseY + 12.2, -110.0);
    facadeSign.rotation.y = -Math.PI * 0.5;
    group.add(facadeSign);

    const towerHighSign = new THREE.Mesh(new THREE.PlaneGeometry(26.0, 6.2), mainSignMat);
    towerHighSign.position.set(twX - 10.6, baseY + 47.8, twZ);
    towerHighSign.rotation.y = -Math.PI * 0.5;
    group.add(towerHighSign);

    // Roadside Monument Pylon at (212.2, baseY, -146.5) with 3D Neon Crown
    batch.add(prims.box, mats.blackGoldMarble, 212.2, baseY + 4.2, -146.5, 0, 0, 0, 1.5, 8.4, 4.6, { castShadow: true });
    batch.add(prims.box, mats.gold24k, 212.2, baseY + 8.55, -146.5, 0, 0, 0, 1.8, 0.35, 5.0);
    batch.add(prims.octa, mats.crystalDiamond, 212.2, baseY + 10.1, -146.5, 0, 0, 0, 1.6, 2.4, 1.6);
    batch.add(prims.torus16, mats.neonGold, 212.2, baseY + 9.3, -146.5, Math.PI * 0.5, 0, 0, 2.4, 2.4, 1.0);
    const pylonSignW = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.2), mainSignMat);
    pylonSignW.position.set(211.42, baseY + 5.6, -146.5);
    pylonSignW.rotation.y = -Math.PI * 0.5;
    group.add(pylonSignW);
    addExteriorAABB(211.3, 213.1, -148.9, -144.1, baseY + 9.0, 0, 'casino_pylon');

    // 9.7 Twin Illuminated Fountain Plazas at (212.8, baseY, -135.5) & (212.8, baseY, -81.5)
    exteriorState.fountainJets = [];
    for (const fz of [-135.5, -81.5]) {
      const fx = 212.8;
      // Outer Marble Basin
      batch.add(prims.cyl16, mats.calacattaMarble, fx, baseY + 0.32, fz, 0, 0, 0, 6.8, 0.64, 6.8, { receiveShadow: true });
      batch.add(prims.cyl16, mats.gold24k, fx, baseY + 0.66, fz, 0, 0, 0, 6.95, 0.08, 6.95);
      // Tier 2 Pedestal & Tier 3 Gold Bowl
      batch.add(prims.cyl16, mats.calacattaMarble, fx, baseY + 1.15, fz, 0, 0, 0, 2.6, 1.1, 2.6);
      batch.add(prims.cyl16, mats.gold24k, fx, baseY + 1.85, fz, 0, 0, 0, 1.25, 0.9, 1.25);
      batch.add(prims.octa, mats.crystalDiamond, fx, baseY + 2.75, fz, 0, 0, 0, 0.85, 1.25, 0.85);

      // Animated Water Surface Shader Disc
      const waterDisc = new THREE.Mesh(new THREE.CircleGeometry(3.15, 28), mats.fountainWater);
      waterDisc.rotation.x = -Math.PI * 0.5;
      waterDisc.position.set(fx, baseY + 0.58, fz);
      group.add(waterDisc);

      // 8 Animated Translucent Water Jet Plumes per Fountain
      const jetRing = new THREE.Group();
      jetRing.position.set(fx, baseY + 0.65, fz);
      for (let j = 0; j < 8; j++) {
        const ja = (j / 8) * TAU;
        const jet = new THREE.Mesh(prims.cone8, mats.fountainWater);
        jet.position.set(Math.cos(ja) * 2.1, 0.95, Math.sin(ja) * 2.1);
        jet.rotation.z = Math.cos(ja) * 0.28;
        jet.rotation.x = -Math.sin(ja) * 0.28;
        jet.scale.set(0.26, 1.95, 0.26);
        jetRing.add(jet);
      }
      const centerPlume = new THREE.Mesh(prims.cone16, mats.fountainWater);
      centerPlume.position.set(0, 2.8, 0);
      centerPlume.scale.set(0.55, 2.4, 0.55);
      jetRing.add(centerPlume);
      group.add(jetRing);
      exteriorState.fountainJets.push({ group: jetRing, centerPlume });

      addExteriorAABB(fx - 3.3, fx + 3.3, fz - 3.3, fz + 3.3, baseY + 2.5, 0, 'casino_fountain');
    }

    // 9.8 Illuminated Royal Resort Palm Trees Flanking the Casino Boulevard
    const resortPalmCoords = [
      [209.4, -149.5, 1.08, -0.06, 0.03],
      [209.4, -139.5, 1.02, -0.05, -0.02],
      [209.4, -128.5, 1.10, -0.07, 0.02],
      [209.4, -90.5, 1.05, -0.05, -0.03],
      [209.4, -79.5, 1.08, -0.06, 0.02],
      [209.4, -70.0, 1.00, -0.04, -0.02],
      [246.5, -148.0, 1.14, 0.05, 0.04],
      [246.5, -72.0, 1.12, 0.05, -0.04],
    ];
    for (let i = 0; i < resortPalmCoords.length; i++) {
      const [px, pz, sc, lx, lz] = resortPalmCoords[i];
      addIlluminatedResortPalm(
        batch,
        mats,
        px,
        baseY,
        pz,
        sc,
        lx,
        lz,
        i % 2 === 0 ? mats.neonGold : mats.neonPurple
      );
      addExteriorAABB(px - 0.55, px + 0.55, pz - 0.55, pz + 0.55, baseY + 6.0, 0, 'casino_palm');
    }

    // 9.9 VIP Valet Podium, Velvet Rope Line, Valet Attendant NPC & 2 Parked Exotic Supercars!
    // Valet Stand at (211.6, baseY, -104.2)
    batch.add(prims.box, mats.mahoganyWood, 211.6, baseY + 0.58, -104.2, 0, -Math.PI * 0.5, 0, 0.85, 1.15, 0.65);
    batch.add(prims.box, mats.gold24k, 211.6, baseY + 1.18, -104.2, 0, 0, 0, 0.92, 0.06, 0.72);
    batch.add(prims.cyl8, mats.gold24k, 212.0, baseY + 1.45, -104.2, 0, 0, 0, 0.06, 2.8, 0.06);
    batch.add(prims.cone16, mats.crimsonVelvet, 212.0, baseY + 2.85, -104.2, 0, 0, 0, 2.8, 0.62, 2.8);

    addVelvetRopeRun(batch, mats, [
      { x: 210.8, y: baseY, z: -114.2 },
      { x: 213.2, y: baseY, z: -114.2 },
      { x: 215.4, y: baseY, z: -114.2 },
    ], mats.gold24k, mats.purpleVelvet);
    addVelvetRopeRun(batch, mats, [
      { x: 210.8, y: baseY, z: -105.8 },
      { x: 213.2, y: baseY, z: -105.8 },
      { x: 215.4, y: baseY, z: -105.8 },
    ], mats.gold24k, mats.purpleVelvet);

    const valetNPC = buildArticulatedVenueNPC(mats, 'valet', 101, { female: false });
    valetNPC.root.position.set(211.0, baseY, -103.2);
    valetNPC.root.rotation.y = -Math.PI * 0.5;
    group.add(valetNPC.root);
    exteriorState.npcs.push(valetNPC);

    // 2 Parked VIP Showcase Supercars on Forecourt Valet Bays
    const valetCar1 = buildSculptedHypercar(mats, {
      name: 'ValetSupercarNorth',
      primaryMat: mats.gold24k,
      secondaryMat: mats.carbonFiber,
      accentGlowMat: mats.neonPurple,
    });
    valetCar1.position.set(213.4, baseY + 0.02, -127.8);
    valetCar1.rotation.y = -0.35;
    group.add(valetCar1);
    addExteriorAABB(211.9, 214.9, -130.0, -125.6, baseY + 1.4, 0, 'casino_valet_car1');

    const valetCar2 = buildSculptedHypercar(mats, {
      name: 'ValetSupercarSouth',
      primaryMat: mats.liquidChrome,
      secondaryMat: mats.gold24k,
      accentGlowMat: mats.neonGold,
    });
    valetCar2.position.set(213.4, baseY + 0.02, -88.2);
    valetCar2.rotation.y = -2.75;
    group.add(valetCar2);
    addExteriorAABB(211.9, 214.9, -90.4, -86.0, baseY + 1.4, 0, 'casino_valet_car2');

    // 9.10 Glowing Purple/Gold Entry Corona at Exact (209.5, 0.22, -110)!
    const entryCoronaGroup = new THREE.Group();
    entryCoronaGroup.position.set(CASINO_EXT.entryCorona.x, CASINO_EXT.entryCorona.y + 0.02, CASINO_EXT.entryCorona.z);

    const coronaRing = new THREE.Mesh(
      new THREE.RingGeometry(1.18, 1.62, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
    );
    coronaRing.rotation.x = -Math.PI * 0.5;
    entryCoronaGroup.add(coronaRing);

    const coronaBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.42, 1.42, 3.1, 28, 1, true),
      mats.casinoCorona
    );
    coronaBeam.position.y = 1.55;
    entryCoronaGroup.add(coronaBeam);

    const casinoDoorLabel = createFloatingStationSprite(
      '💎 DIAMOND CROWN CASINO',
      'NHẤN [F] VÀO SẢNH SÒNG BẠC HOÀNG GIA',
      '#ffd54f',
      3.4,
      0.86
    );
    casinoDoorLabel.position.set(0, 3.45, 0);
    entryCoronaGroup.add(casinoDoorLabel);
    group.add(entryCoronaGroup);
    exteriorState.casinoEntryCorona = entryCoronaGroup;

    // Secondary Casino Heist #5 VIP Side-Entrance Marker at Exact (209.5, 0.22, -92)
    const vipSideGroup = new THREE.Group();
    vipSideGroup.position.set(CASINO_EXT.vipSideCorona.x, CASINO_EXT.vipSideCorona.y + 0.02, CASINO_EXT.vipSideCorona.z);
    const vipRing = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.18, 24),
      new THREE.MeshBasicMaterial({ color: 0xff3b6b, transparent: true, opacity: 0.82, side: THREE.DoubleSide, depthWrite: false })
    );
    vipRing.rotation.x = -Math.PI * 0.5;
    vipSideGroup.add(vipRing);
    const vipCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(1.02, 1.02, 2.2, 20, 1, true),
      mats.vipHeistCorona
    );
    vipCyl.position.y = 1.1;
    vipSideGroup.add(vipCyl);
    const vipSideLabel = createFloatingStationSprite(
      '🔐 CỔNG HẦM NGẦM VIP',
      'LỐI VÀO AN NINH DIAMOND CASINO',
      '#ff4d79',
      2.6,
      0.66
    );
    vipSideLabel.position.set(0, 2.65, 0);
    vipSideGroup.add(vipSideLabel);
    group.add(vipSideGroup);
    exteriorState.vipSideCorona = vipSideGroup;

    batch.flush(group);
    return group;
  }

  // --------------------------------------------------------------------------
  // 10. EXTERIOR LANDMARK 2: "CLUB ECLIPSE & NEON COCKTAIL BAR"
  //     Bounds: X in [-166, -131], Z in [-116, -74], Facing East onto X = -120
  //     Entry Corona: (-129.0, 0.22, -95)
  // --------------------------------------------------------------------------
  function buildClubExteriorLandmark(mats, exteriorState) {
    const group = new THREE.Group();
    group.name = 'ClubEclipseExterior';
    const batch = createBatchBuilder(group);

    const baseY = CLUB_EXT.terraceY; // 0.22

    // 10.1 Raised Coastal Granite Terrace & Retaining Plinth (prevents floating on sloped beach!)
    batch.add(prims.box, mats.granitePlinth, -147.8, baseY - 1.55, -95.0, 0, 0, 0, 36.8, 3.10, 42.0, { receiveShadow: true });
    batch.add(prims.box, mats.obsidianFloor, -147.8, baseY - 0.02, -95.0, 0, 0, 0, 37.0, 0.08, 42.2, { receiveShadow: true });
    batch.add(prims.box, mats.neonCyan, -129.35, baseY + 0.02, -95.0, 0, 0, 0, 0.14, 0.06, 42.0);

    // 10.2 Sleek Dark-Slate Brutalist-Cyber Nightclub Building (X in [-164.5, -134.8], Z in [-113.0, -77.0])
    const clubX = -149.6;
    const clubZ = -95.0;
    const clubW = 29.6;
    const clubD = 36.0;
    const clubH = CLUB_EXT.roofHeight; // 14.2m

    batch.add(
      prims.box,
      mats.clubSlateWall,
      clubX,
      baseY + clubH * 0.5,
      clubZ,
      0, 0, 0,
      clubW,
      clubH,
      clubD,
      { castShadow: true, receiveShadow: true }
    );

    // Upper Stepped Penthouse VIP Lounge Crown
    batch.add(prims.box, mats.blackSteel, clubX - 1.5, baseY + clubH + 1.4, clubZ, 0, 0, 0, clubW - 5.0, 2.8, clubD - 6.0, { castShadow: true });

    // Architectural Angled Gunmetal Fins + Pulsing Neon Magenta/Cyan Tubes along East Facade (X = -134.8)
    exteriorState.clubNeonTubes = [];
    for (let i = -5; i <= 5; i++) {
      const fz = clubZ + i * 3.1;
      if (Math.abs(fz - (-95.0)) < 3.4) continue; // Clear around entrance canopy!
      batch.add(prims.box, mats.darkGunmetal, -134.55, baseY + clubH * 0.5, fz, 0, 0, 0, 0.55, clubH - 0.4, 0.36, { castShadow: true });

      const neonMat = Math.abs(i) % 2 === 0 ? mats.neonMagenta : mats.neonCyan;
      const tube = new THREE.Mesh(prims.box, neonMat);
      tube.position.set(-134.22, baseY + clubH * 0.5, fz);
      tube.scale.set(0.10, clubH - 1.4, 0.12);
      group.add(tube);
      exteriorState.clubNeonTubes.push(tube);
    }

    // Horizontal Roofline & Mid-Band Neon Strips
    batch.add(prims.box, mats.neonMagenta, -134.6, baseY + clubH + 0.08, clubZ, 0, 0, 0, 0.25, 0.22, clubD + 0.3);
    batch.add(prims.box, mats.neonCyan, -134.6, baseY + 5.2, clubZ, 0, 0, 0, 0.22, 0.16, clubD + 0.2);

    // Cantilevered East Entrance Canopy & Padded Acoustic Double Doors at (-134.7, baseY, -95)
    batch.add(prims.box, mats.blackSteel, -132.4, baseY + 4.35, -95.0, 0, 0, 0, 4.8, 0.52, 9.6, { castShadow: true });
    const clubMarquee = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 0.48), mats.marqueeClubNeon);
    clubMarquee.position.set(-129.98, baseY + 4.35, -95.0);
    clubMarquee.rotation.y = Math.PI * 0.5;
    group.add(clubMarquee);

    // Padded Black Leather & Chrome Double Club Doors
    batch.add(prims.box, mats.liquidChrome, -134.72, baseY + 1.85, -95.0, 0, 0, 0, 0.32, 3.7, 3.6);
    batch.add(prims.box, mats.blackLeather, -134.58, baseY + 1.75, -95.85, 0, 0, 0, 0.18, 3.4, 1.55);
    batch.add(prims.box, mats.blackLeather, -134.58, baseY + 1.75, -94.15, 0, 0, 0, 0.18, 3.4, 1.55);
    batch.add(prims.box, mats.neonMagenta, -134.45, baseY + 1.75, -95.18, 0, 0, 0, 0.08, 1.4, 0.08);
    batch.add(prims.box, mats.neonCyan, -134.45, baseY + 1.75, -94.82, 0, 0, 0, 0.08, 1.4, 0.08);

    // 10.3 Giant Sculpted Solar-Eclipse Halo Sign + "CLUB ECLIPSE • BAR & LOUNGE" Banner
    const eclipseHaloGroup = new THREE.Group();
    eclipseHaloGroup.position.set(-134.2, baseY + 10.2, -95.0);
    eclipseHaloGroup.rotation.y = Math.PI * 0.5;

    const eclipseOuterRing = new THREE.Mesh(prims.torus32, mats.neonMagenta);
    eclipseOuterRing.scale.set(5.6, 5.6, 1.3);
    eclipseHaloGroup.add(eclipseOuterRing);

    const eclipseInnerRing = new THREE.Mesh(prims.torus32, mats.neonCyan);
    eclipseInnerRing.position.z = 0.06;
    eclipseInnerRing.scale.set(4.8, 4.8, 1.1);
    eclipseHaloGroup.add(eclipseInnerRing);

    const eclipseBlackSun = new THREE.Mesh(prims.cyl24, mats.obsidianFloor);
    eclipseBlackSun.rotation.x = Math.PI * 0.5;
    eclipseBlackSun.position.z = 0.08;
    eclipseBlackSun.scale.set(4.5, 0.18, 4.5);
    eclipseHaloGroup.add(eclipseBlackSun);
    group.add(eclipseHaloGroup);
    exteriorState.eclipseHaloGroup = eclipseHaloGroup;

    const clubSignTex = createSignBannerTexture(
      '🍸 CLUB ECLIPSE • BAR & LOUNGE',
      'NEON NIGHTCLUB • COCKTAILS • 8-BALL • DARTS',
      { bg: '#090614', border: '#ff1ea8', titleColor: '#ffffff', subColor: '#00f0ff' }
    );
    const clubSignMat = new THREE.MeshStandardMaterial({
      map: clubSignTex,
      emissive: 0xffffff,
      emissiveMap: clubSignTex,
      emissiveIntensity: 1.45,
      roughness: 0.2,
    });
    const clubBanner = new THREE.Mesh(new THREE.PlaneGeometry(16.5, 3.6), clubSignMat);
    clubBanner.position.set(-134.15, baseY + 6.45, -95.0);
    clubBanner.rotation.y = Math.PI * 0.5;
    group.add(clubBanner);

    addExteriorAABB(-164.6, -134.7, -113.2, -76.8, baseY + clubH + 2.8, -2.5, 'club_eclipse_building');

    // 10.4 VIP Velvet Rope Queue, 2 Bouncer NPCs & Waiting Clubgoers
    addVelvetRopeRun(batch, mats, [
      { x: -131.2, y: baseY, z: -98.8 },
      { x: -131.2, y: baseY, z: -103.5 },
      { x: -131.2, y: baseY, z: -108.2 },
      { x: -131.2, y: baseY, z: -112.5 },
    ], mats.liquidChrome, mats.neonMagenta);
    addVelvetRopeRun(batch, mats, [
      { x: -133.2, y: baseY, z: -98.8 },
      { x: -133.2, y: baseY, z: -103.5 },
      { x: -133.2, y: baseY, z: -108.2 },
      { x: -133.2, y: baseY, z: -112.5 },
    ], mats.liquidChrome, mats.purpleVelvet);

    // 2 Muscular Bouncer NPCs flanking Club Doors
    for (let bi = 0; bi < 2; bi++) {
      const bouncer = buildArticulatedVenueNPC(mats, 'bouncer', 201 + bi, { female: false });
      bouncer.root.position.set(-133.4, baseY, bi === 0 ? -92.6 : -97.4);
      bouncer.root.rotation.y = Math.PI * 0.5;
      group.add(bouncer.root);
      exteriorState.npcs.push(bouncer);
    }

    // 3 Stylish VIP Clubgoers waiting in the velvet rope line
    for (let qi = 0; qi < 3; qi++) {
      const guest = buildArticulatedVenueNPC(mats, 'club_queue', 210 + qi, { female: qi % 2 === 0 });
      guest.root.position.set(-132.2, baseY, -101.2 - qi * 3.2);
      guest.root.rotation.y = 0.15 * (qi - 1);
      group.add(guest.root);
      exteriorState.npcs.push(guest);
    }

    // 4 Neon Cyan/Magenta Coastal Palms framing Túy Tiên Lâu Terrace
    const clubPalms = [
      [-131.0, -76.5, 0.98, 0.04, 0.03],
      [-131.0, -114.2, 1.02, 0.05, -0.03],
      [-163.5, -75.2, 1.05, -0.07, 0.03],
      [-163.5, -114.5, 1.04, -0.06, -0.03],
    ];
    for (let i = 0; i < clubPalms.length; i++) {
      const [px, pz, sc, lx, lz] = clubPalms[i];
      addIlluminatedResortPalm(batch, mats, px, baseY, pz, sc, lx, lz, i % 2 === 0 ? mats.neonMagenta : mats.neonCyan);
    }

    // 10.5 Muffled Sub-Bass Aura Ground Shockwave Disc + Entry Corona at Exact (-129.0, 0.22, -95)!
    const bassAuraDisc = new THREE.Mesh(new THREE.PlaneGeometry(14.5, 14.5), mats.subBassWave);
    bassAuraDisc.rotation.x = -Math.PI * 0.5;
    bassAuraDisc.position.set(-132.0, baseY + 0.03, -95.0);
    group.add(bassAuraDisc);

    const clubEntryCorona = new THREE.Group();
    clubEntryCorona.position.set(CLUB_EXT.entryCorona.x, CLUB_EXT.entryCorona.y + 0.02, CLUB_EXT.entryCorona.z);

    const clubRing = new THREE.Mesh(
      new THREE.RingGeometry(1.12, 1.54, 32),
      new THREE.MeshBasicMaterial({ color: 0xff1ea8, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
    );
    clubRing.rotation.x = -Math.PI * 0.5;
    clubEntryCorona.add(clubRing);

    const clubBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.36, 1.36, 2.9, 28, 1, true),
      mats.clubCorona
    );
    clubBeam.position.y = 1.45;
    clubEntryCorona.add(clubBeam);

    const clubDoorLabel = createFloatingStationSprite(
      '🎵 CLUB ECLIPSE • BAR & SÀN NHẢY',
      'NHẤN [F] VÀO QUẦY BAR & HỘP ĐÊM NEON',
      '#00f0ff',
      3.45,
      0.86
    );
    clubDoorLabel.position.set(0, 3.3, 0);
    clubEntryCorona.add(clubDoorLabel);
    group.add(clubEntryCorona);
    exteriorState.clubEntryCorona = clubEntryCorona;

    batch.flush(group);
    return group;
  }

  // --------------------------------------------------------------------------
  // 11. CASINO GRAND INTERIOR SHELL, COLUMNS, MEZZANINE, VAULT & PODIUM
  //     Center: (1200, 0, 1200) | Size: 52m x 46m x 9.5m
  //     X in [1174, 1226], Z in [1177, 1223]
  //     Spawn: (1200, 0.05, 1219) | Exit Ring: (1200, 0.05, 1221.5)
  // --------------------------------------------------------------------------
  function buildCasinoInteriorShellAndPodium(mats, texSuite, casinoIntState) {
    const root = new THREE.Group();
    root.name = 'DiamondCrownCasinoInterior';
    root.visible = false; // Visible only when player is inside Casino (zero outdoor GPU cost!)

    const batch = createBatchBuilder(root);
    const cx = CASINO_INT.cx; // 1200
    const cz = CASINO_INT.cz; // 1200
    const W = CASINO_INT.width; // 52
    const D = CASINO_INT.depth; // 46
    const H = CASINO_INT.height; // 9.5
    const minX = CASINO_INT.minX; // 1174
    const maxX = CASINO_INT.maxX; // 1226
    const minZ = CASINO_INT.minZ; // 1177
    const maxZ = CASINO_INT.maxZ; // 1223
    const floorY = CASINO_INT.floorY; // 0.02

    // 11.1 Base Structural Floor, Royal Damask Carpet Wings & Reflective Calacatta Marble Promenade
    batch.add(prims.box, mats.royalCarpet, cx, floorY - 0.15, cz, 0, 0, 0, W + 0.8, 0.30, D + 0.8, { receiveShadow: true });

    // Central North-South Marble Promenade (X in [1194.5, 1205.5], Z in [1177.5, 1222.5])
    batch.add(prims.box, mats.calacattaMarble, cx, floorY - 0.008, cz, 0, 0, 0, 10.6, 0.03, D - 0.8, { receiveShadow: true });
    batch.add(prims.box, mats.gold24k, cx - 5.38, floorY + 0.002, cz, 0, 0, 0, 0.14, 0.018, D - 0.8);
    batch.add(prims.box, mats.gold24k, cx + 5.38, floorY + 0.002, cz, 0, 0, 0, 0.14, 0.018, D - 0.8);

    // Grand Octagonal Marble Rotunda Inlay around Podium (1200, 0, 1200)
    batch.add(prims.cyl16, mats.calacattaMarble, cx, floorY - 0.004, cz, 0, 0, 0, 14.8, 0.032, 14.8, { receiveShadow: true });
    batch.add(prims.torus32, mats.gold24k, cx, floorY + 0.012, cz, Math.PI * 0.5, 0, 0, 14.85, 14.85, 0.35);
    batch.add(prims.torus32, mats.gold24k, cx, floorY + 0.014, cz, Math.PI * 0.5, 0, 0, 11.4, 11.4, 0.28);

    // 11.2 Perimeter Architectural Walls, Wood Wainscoting, Velvet Panels & Neon Light Coves
    // North, South, West, East Enclosure Walls + Ceiling Slab
    batch.add(prims.box, mats.creamLimestone, cx, H * 0.5, minZ - 0.3, 0, 0, 0, W + 1.2, H + 0.4, 0.6);
    batch.add(prims.box, mats.creamLimestone, cx, H * 0.5, maxZ + 0.3, 0, 0, 0, W + 1.2, H + 0.4, 0.6);
    batch.add(prims.box, mats.creamLimestone, minX - 0.3, H * 0.5, cz, 0, 0, 0, 0.6, H + 0.4, D + 1.2);
    batch.add(prims.box, mats.creamLimestone, maxX + 0.3, H * 0.5, cz, 0, 0, 0, 0.6, H + 0.4, D + 1.2);

    // Interior Boundary & Ceiling Collision AABBs (keeps player AND 3rd-person camera cleanly inside!)
    addInteriorAABB(minX - 1.2, minX + 0.15, minZ - 1.0, maxZ + 1.0, H + 2.0, -1.0, 'casino_wall_w');
    addInteriorAABB(maxX - 0.15, maxX + 1.2, minZ - 1.0, maxZ + 1.0, H + 2.0, -1.0, 'casino_wall_e');
    addInteriorAABB(minX - 1.0, maxX + 1.0, minZ - 1.2, minZ + 0.15, H + 2.0, -1.0, 'casino_wall_n');
    addInteriorAABB(minX - 1.0, maxX + 1.0, maxZ - 0.15, maxZ + 1.2, H + 2.0, -1.0, 'casino_wall_s');
    addInteriorAABB(minX - 1.0, maxX + 1.0, minZ - 1.0, maxZ + 1.0, H + 2.2, H - 0.15, 'casino_ceiling');

    // Lower Mahogany Wainscoting + Gold Chair-Rail Moulding along all 4 perimeter walls
    batch.add(prims.box, mats.mahoganyWood, cx, 0.75, minZ + 0.08, 0, 0, 0, W, 1.5, 0.12);
    batch.add(prims.box, mats.mahoganyWood, cx, 0.75, maxZ - 0.08, 0, 0, 0, W, 1.5, 0.12);
    batch.add(prims.box, mats.mahoganyWood, minX + 0.08, 0.75, cz, 0, 0, 0, 0.12, 1.5, D);
    batch.add(prims.box, mats.mahoganyWood, maxX - 0.08, 0.75, cz, 0, 0, 0, 0.12, 1.5, D);

    batch.add(prims.box, mats.gold24k, cx, 1.54, minZ + 0.11, 0, 0, 0, W, 0.09, 0.16);
    batch.add(prims.box, mats.gold24k, cx, 1.54, maxZ - 0.11, 0, 0, 0, W, 0.09, 0.16);
    batch.add(prims.box, mats.gold24k, minX + 0.11, 1.54, cz, 0, 0, 0, 0.16, 0.09, D);
    batch.add(prims.box, mats.gold24k, maxX - 0.11, 1.54, cz, 0, 0, 0, 0.16, 0.09, D);

    // Decorative Royal Purple Velvet Wall Panels framed in 24K Gold along East & West Gaming Walls
    for (let wz = 1182; wz <= 1218; wz += 6.0) {
      for (const side of [-1, 1]) {
        const wx = side < 0 ? minX + 0.10 : maxX - 0.10;
        batch.add(prims.box, mats.purpleVelvet, wx, 4.8, wz, 0, 0, 0, 0.08, 5.2, 4.4);
        batch.add(prims.box, mats.gold24k, wx + (side < 0 ? 0.03 : -0.03), 7.45, wz, 0, 0, 0, 0.10, 0.12, 4.55);
        batch.add(prims.box, mats.gold24k, wx + (side < 0 ? 0.03 : -0.03), 2.15, wz, 0, 0, 0, 0.10, 0.12, 4.55);
        batch.add(prims.box, mats.neonGold, wx + (side < 0 ? 0.05 : -0.05), 4.8, wz - 2.28, 0, 0, 0, 0.06, 5.1, 0.07);
        batch.add(prims.box, mats.neonGold, wx + (side < 0 ? 0.05 : -0.05), 4.8, wz + 2.28, 0, 0, 0, 0.06, 5.1, 0.07);
      }
    }

    // 11.3 Coffered Gold-Leaf Ceiling (y = 9.5m) + 3 Illuminated Octagonal Skylight Domes
    batch.add(prims.box, mats.obsidianFloor, cx, H + 0.18, cz, 0, 0, 0, W + 1.0, 0.36, D + 1.0);
    // Gold Coffer Grid Beams across Ceiling
    for (let gx = minX + 6.5; gx <= maxX - 6.5; gx += 13.0) {
      batch.add(prims.box, mats.gold24k, gx, H - 0.16, cz, 0, 0, 0, 0.55, 0.32, D);
    }
    for (let gz = minZ + 7.5; gz <= maxZ - 7.5; gz += 11.0) {
      batch.add(prims.box, mats.gold24k, cx, H - 0.16, gz, 0, 0, 0, W, 0.32, 0.55);
    }
    // Perimeter Crown Neon Purple & Gold Ceiling Coves
    batch.add(prims.box, mats.neonPurple, cx, H - 0.28, minZ + 0.25, 0, 0, 0, W - 0.6, 0.12, 0.14);
    batch.add(prims.box, mats.neonPurple, cx, H - 0.28, maxZ - 0.25, 0, 0, 0, W - 0.6, 0.12, 0.14);
    batch.add(prims.box, mats.neonGold, minX + 0.25, H - 0.28, cz, 0, 0, 0, 0.14, 0.12, D - 0.6);
    batch.add(prims.box, mats.neonGold, maxX - 0.25, H - 0.28, cz, 0, 0, 0, 0.14, 0.12, D - 0.6);

    // 4 Grand Tiered Empire Crystal Chandeliers + Warm Gold PointLights!
    casinoIntState.chandelierLights = [
      addGrandCrystalChandelier(batch, root, mats, 1200.0, H, 1200.0, 2.85, 4),
      addGrandCrystalChandelier(batch, root, mats, 1187.5, H, 1196.0, 2.05, 3),
      addGrandCrystalChandelier(batch, root, mats, 1212.5, H, 1196.0, 2.05, 3),
      addGrandCrystalChandelier(batch, root, mats, 1200.0, H, 1214.0, 2.15, 3),
    ];
    const ambFill = new THREE.AmbientLight(0xfff0dc, 0.52);
    root.add(ambFill);

    // 11.4 10 Grand Fluted Corinthian Marble Atrium Columns (carefully placed clear of all tables!)
    const columnCoords = [
      [1189.2, 1209.5], [1210.8, 1209.5],
      [1189.2, 1198.0], [1210.8, 1198.0],
      [1189.2, 1185.5], [1210.8, 1185.5],
      [1175.6, 1211.0], [1224.4, 1211.0],
      [1175.6, 1183.5], [1224.4, 1183.5],
    ];
    for (const [colX, colZ] of columnCoords) {
      // Stepped Square Marble & Gold Plinth
      batch.add(prims.box, mats.blackGoldMarble, colX, floorY + 0.26, colZ, 0, 0, 0, 1.32, 0.52, 1.32);
      batch.add(prims.box, mats.gold24k, colX, floorY + 0.56, colZ, 0, 0, 0, 1.18, 0.10, 1.18);
      batch.add(prims.torus16, mats.gold24k, colX, floorY + 0.68, colZ, Math.PI * 0.5, 0, 0, 1.05, 1.05, 1.1);

      // Main Calacatta Marble Shaft + 4 Vertical Gold Flute Strips
      batch.add(prims.cyl24, mats.calacattaMarble, colX, 4.95, colZ, 0, 0, 0, 0.88, 8.45, 0.88, { castShadow: true });
      for (let f = 0; f < 4; f++) {
        const fa = (f / 4) * TAU + Math.PI * 0.25;
        batch.add(
          prims.box,
          mats.neonGold,
          colX + Math.cos(fa) * 0.44,
          4.95,
          colZ + Math.sin(fa) * 0.44,
          0, -fa, 0,
          0.055, 7.6, 0.055
        );
      }

      // Corinthian Gold Capital
      batch.add(prims.torus16, mats.gold24k, colX, H - 0.58, colZ, Math.PI * 0.5, 0, 0, 1.12, 1.12, 1.2);
      batch.add(prims.box, mats.gold24k, colX, H - 0.28, colZ, 0, 0, 0, 1.38, 0.36, 1.38);

      addInteriorAABB(colX - 0.64, colX + 0.64, colZ - 0.64, colZ + 0.64, H, 0, 'casino_column');
    }

    // 11.5 North VIP Lounge Mezzanine Gallery (y = 3.60m, X in [1174.5, 1225.5], Z in [1177.2, 1181.2]
    //      on East/West wings with central Vault Atrium cutout X in [1196.5, 1203.5])
    const mezzY = CASINO_INT.mezzY; // 3.60
    // West Mezzanine Deck (X in [1174.4, 1196.5], Z in [1177.2, 1180.6])
    batch.add(prims.box, mats.blackGoldMarble, 1185.45, mezzY - 0.16, 1178.9, 0, 0, 0, 22.1, 0.32, 3.4);
    batch.add(prims.box, mats.gold24k, 1185.45, mezzY, 1180.62, 0, 0, 0, 22.1, 0.12, 0.14);
    batch.add(prims.box, mats.clearDomeGlass, 1185.45, mezzY + 0.55, 1180.58, 0, 0, 0, 21.8, 0.98, 0.06);
    batch.add(prims.box, mats.gold24k, 1185.45, mezzY + 1.06, 1180.58, 0, 0, 0, 22.1, 0.08, 0.12);

    // East Mezzanine Deck (X in [1203.5, 1225.6], Z in [1177.2, 1180.6])
    batch.add(prims.box, mats.blackGoldMarble, 1214.55, mezzY - 0.16, 1178.9, 0, 0, 0, 22.1, 0.32, 3.4);
    batch.add(prims.box, mats.gold24k, 1214.55, mezzY, 1180.62, 0, 0, 0, 22.1, 0.12, 0.14);
    batch.add(prims.box, mats.clearDomeGlass, 1214.55, mezzY + 0.55, 1180.58, 0, 0, 0, 21.8, 0.98, 0.06);
    batch.add(prims.box, mats.gold24k, 1214.55, mezzY + 1.06, 1180.58, 0, 0, 0, 22.1, 0.08, 0.12);

    // Connecting Sky-Walk Bridge over Vault Door (X in [1196.5, 1203.5], Z in [1177.4, 1179.6])
    batch.add(prims.box, mats.blackGoldMarble, 1200.0, mezzY - 0.14, 1178.5, 0, 0, 0, 7.2, 0.28, 2.2);
    batch.add(prims.box, mats.clearDomeGlass, 1200.0, mezzY + 0.55, 1179.58, 0, 0, 0, 7.0, 0.98, 0.06);
    batch.add(prims.box, mats.gold24k, 1200.0, mezzY + 1.06, 1179.58, 0, 0, 0, 7.2, 0.08, 0.12);

    // Twin Walkable Marble Staircases to Mezzanine along Far West (X in [1174.4, 1176.2], Z in [1208.5..1216.5]? No: Z in [1180.6..1185.6]!)
    // Placed cleanly at Far North-West (X in [1174.4, 1176.2], Z in [1180.6, 1185.4]) & North-East (X in [1223.8, 1225.6], Z in [1180.6, 1185.4])
    const stairSteps = 14;
    for (const stairX of [1175.3, 1224.7]) {
      for (let st = 0; st < stairSteps; st++) {
        const u = (st + 0.5) / stairSteps;
        const sy = lerp(floorY + 0.12, mezzY - 0.08, u);
        const sz = lerp(1185.3, 1180.7, u);
        batch.add(prims.box, mats.calacattaMarble, stairX, sy * 0.5, sz, 0, 0, 0, 1.65, sy, 0.36);
        batch.add(prims.box, mats.gold24k, stairX, sy + 0.01, sz + 0.16, 0, 0, 0, 1.66, 0.025, 0.05);
      }
    }

    // Mezzanine VIP Velvet Sofas, Champagne Tables & Overlooking VIP Patrons
    for (const vx of [1182.5, 1190.5, 1209.5, 1217.5]) {
      batch.add(prims.box, mats.purpleVelvet, vx, mezzY + 0.28, 1178.1, 0, 0, 0, 2.8, 0.48, 0.95);
      batch.add(prims.box, mats.purpleVelvet, vx, mezzY + 0.66, 1177.68, 0, 0, 0, 2.8, 0.55, 0.22);
      batch.add(prims.cyl16, mats.gold24k, vx, mezzY + 0.36, 1179.25, 0, 0, 0, 0.85, 0.06, 0.85);
      batch.add(prims.cyl8, mats.gold24k, vx, mezzY + 0.18, 1179.25, 0, 0, 0, 0.12, 0.36, 0.12);
    }

    // 11.6 High-Security Vạn Bảo Đổ Phường Vault Entrance at (1200, 0, 1177.5) (For Grand Heist #5!)
    const vz = 1177.45;
    batch.add(prims.box, mats.darkGunmetal, cx, 1.72, vz, 0, 0, 0, 4.4, 3.35, 0.42);
    batch.add(prims.cyl24, mats.liquidChrome, cx, 1.68, vz + 0.24, Math.PI * 0.5, 0, 0, 2.65, 0.26, 2.65);
    batch.add(prims.torus32, mats.gold24k, cx, 1.68, vz + 0.38, 0, 0, 0, 2.45, 2.45, 0.95);
    // 6 Radial Vault Locking Bolts + Central 4-Spoke Brass Wheel
    for (let b = 0; b < 6; b++) {
      const ba = (b / 6) * TAU;
      batch.add(
        prims.box,
        mats.gold24k,
        cx + Math.cos(ba) * 0.95,
        1.68 + Math.sin(ba) * 0.95,
        vz + 0.40,
        0, 0, ba,
        0.55, 0.11, 0.08
      );
    }
    batch.add(prims.torus16, mats.gold24k, cx, 1.68, vz + 0.48, 0, 0, 0, 0.72, 0.72, 0.9);
    // Biometric Fingerprint Scanner Pad + Red Security Laser Header
    batch.add(prims.box, mats.blackSteel, cx + 2.55, 1.45, vz + 0.18, 0, 0, 0, 0.42, 0.62, 0.12);
    batch.add(prims.box, mats.neonCyan, cx + 2.55, 1.52, vz + 0.25, 0, 0, 0, 0.26, 0.30, 0.03);
    batch.add(prims.box, mats.neonCrimson, cx, 3.18, vz + 0.28, 0, 0, 0, 3.8, 0.09, 0.09);

    const vaultSignTex = createSignBannerTexture(
      '🔒 HẦM NGẦM KIM CƯƠNG • VAULT',
      'KHU VỰC AN NINH TỐI MẬT • BIOMETRIC LOCK',
      { bg: '#1a0610', border: '#ff3355', titleColor: '#ffd55a', subColor: '#ff6b88' }
    );
    const vaultSign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 0.85),
      new THREE.MeshBasicMaterial({ map: vaultSignTex })
    );
    vaultSign.position.set(cx, 3.95, vz + 0.32);
    root.add(vaultSign);

    // 11.7 Centerpiece Rotating Podium Turntable at Exact (1200, 0.4, 1200)!
    const px = CASINO_INT.podium.x; // 1200
    const pz = CASINO_INT.podium.z; // 1200

    // Stationary 2-Step Black-Gold Marble Base + Velvet Rope Stanchion Perimeter
    batch.add(prims.cyl24, mats.blackGoldMarble, px, 0.11, pz, 0, 0, 0, 8.2, 0.22, 8.2, { receiveShadow: true });
    batch.add(prims.torus32, mats.neonGold, px, 0.22, pz, Math.PI * 0.5, 0, 0, 8.25, 8.25, 0.55);
    batch.add(prims.cyl24, mats.blackGoldMarble, px, 0.29, pz, 0, 0, 0, 7.1, 0.16, 7.1, { receiveShadow: true });

    // Circular 10-Post Golden Velvet Rope Ring around Podium (Radius 4.65m)
    const podiumRopePosts = [];
    for (let rp = 0; rp <= 10; rp++) {
      const ra = (rp / 10) * TAU;
      podiumRopePosts.push({
        x: px + Math.cos(ra) * 4.65,
        y: floorY,
        z: pz + Math.sin(ra) * 4.65,
      });
    }
    addVelvetRopeRun(batch, mats, podiumRopePosts, mats.gold24k, mats.crimsonVelvet);

    // Rotating Turntable Group + Sculpted 24K Gold / Liquid Chrome Hypercar!
    const turntableGroup = new THREE.Group();
    turntableGroup.position.set(px, CASINO_INT.podium.y, pz); // (1200, 0.4, 1200)

    const platter = new THREE.Mesh(prims.cyl24, mats.obsidianFloor);
    platter.position.set(0, -0.02, 0);
    platter.scale.set(6.4, 0.08, 6.4);
    platter.receiveShadow = true;
    turntableGroup.add(platter);

    const platterRim = new THREE.Mesh(prims.torus32, mats.neonPurple);
    platterRim.rotation.x = Math.PI * 0.5;
    platterRim.scale.set(6.44, 6.44, 0.55);
    turntableGroup.add(platterRim);

    const hypercar = buildSculptedHypercar(mats, {
      name: 'DiamondPodiumHypercar',
      primaryMat: mats.gold24k,
      secondaryMat: mats.liquidChrome,
      trimMat: mats.carbonFiber,
      accentGlowMat: mats.neonCyan,
    });
    hypercar.position.set(0, 0.02, 0);
    turntableGroup.add(hypercar);
    root.add(turntableGroup);

    casinoIntState.turntableGroup = turntableGroup;
    casinoIntState.podiumCarMesh = hypercar;

    // Overhead Circular Gold Truss Halo + 3 Volumetric Spotlight Beams Aimed at Podium Hypercar!
    batch.add(prims.torus32, mats.gold24k, px, 7.45, pz, Math.PI * 0.5, 0, 0, 7.6, 7.6, 1.1);
    casinoIntState.podiumSpotBeams = [];
    for (let sb = 0; sb < 3; sb++) {
      const sa = (sb / 3) * TAU;
      const sx = px + Math.cos(sa) * 3.6;
      const sz = pz + Math.sin(sa) * 3.6;
      batch.add(prims.cyl8, mats.gold24k, sx, 7.25, sz, 0, 0, 0, 0.28, 0.45, 0.28);

      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.15, 6.9, 20, 1, true), mats.spotlightGold);
      cone.position.set(px + Math.cos(sa) * 1.65, 3.85, pz + Math.sin(sa) * 1.65);
      cone.rotation.z = Math.cos(sa) * 0.30;
      cone.rotation.x = -Math.sin(sa) * 0.30;
      root.add(cone);
      casinoIntState.podiumSpotBeams.push(cone);
    }

    const podiumBanner = createFloatingStationSprite(
      '🏆 SIÊU XE PODIUM: ZENTORNO 24K GOLD',
      'QUAY VÒNG QUAY KIM CƯƠNG ĐỂ TRÚNG THƯỞNG!',
      '#ffd54f',
      3.5,
      0.84
    );
    podiumBanner.position.set(px, 2.85, pz);
    root.add(podiumBanner);

    addInteriorAABB(px - 3.9, px + 3.9, pz - 3.9, pz + 3.9, 2.5, 0, 'casino_podium_turntable');

    // 11.8 Grand South Foyer Exit Doors & Exit Ring at Exact (1200, 0.05, 1221.5)!
    const ez = maxZ - 0.18; // 1222.82
    batch.add(prims.box, mats.gold24k, cx, 2.15, ez, 0, 0, 0, 5.4, 4.3, 0.32);
    batch.add(prims.box, mats.tintedCanopyGlass, cx - 1.25, 1.95, ez - 0.06, 0, 0, 0, 2.1, 3.7, 0.12);
    batch.add(prims.box, mats.tintedCanopyGlass, cx + 1.25, 1.95, ez - 0.06, 0, 0, 0, 2.1, 3.7, 0.12);
    batch.add(prims.cyl8, mats.gold24k, cx - 0.22, 1.8, ez - 0.16, 0, 0, 0, 0.06, 1.2, 0.06);
    batch.add(prims.cyl8, mats.gold24k, cx + 0.22, 1.8, ez - 0.16, 0, 0, 0, 0.06, 1.2, 0.06);

    const exitPortal = createInteractionFloorRing(
      CASINO_INT.exitRing.x,
      floorY,
      CASINO_INT.exitRing.z,
      0xffb830,
      0.92,
      1.28
    );
    const exitLabel = createFloatingStationSprite(
      '🚪 LỐI RA ĐẠI LỘ DIAMOND',
      'NHẤN [F] RỜI SÒNG BẠC RA THÀNH PHỐ',
      '#ffb830',
      2.9,
      0.72
    );
    exitLabel.position.set(0, 2.45, 0);
    exitPortal.add(exitLabel);
    root.add(exitPortal);
    casinoIntState.exitPortal = exitPortal;

    batch.flush(root);
    return root;
  }

  // --------------------------------------------------------------------------
  // 12. CASINO GAMBLING STATIONS SUITE A:
  //     CASHIER, LUCKY WHEEL 20-SLICE, TAI XIU (x2), XOC DIA (x2), ROULETTE (x2)
  // --------------------------------------------------------------------------
  const CHIP_COLORS = [
    new THREE.Color(0xe63946), // Crimson $5
    new THREE.Color(0x1d9a6c), // Emerald $25
    new THREE.Color(0x1b1f2a), // Obsidian $100
    new THREE.Color(0x8338ec), // Royal Purple $500
    new THREE.Color(0xffbe0b), // Gold $1,000
    new THREE.Color(0x00bbf9), // Diamond Cyan $5,000
  ];
  const colCashGreen = new THREE.Color(0x2d8a4e);
  const colCardWhite = new THREE.Color(0xf7f9fc);
  const colCardBackRed = new THREE.Color(0xb5192b);

  function addCasinoVelvetStool(batch, mats, x, y, z, seatMat = mats.crimsonVelvet) {
    batch.add(prims.cyl16, mats.gold24k, x, y + 0.025, z, 0, 0, 0, 0.38, 0.05, 0.38);
    batch.add(prims.cyl8, mats.liquidChrome, x, y + 0.34, z, 0, 0, 0, 0.058, 0.62, 0.058);
    batch.add(prims.torus16, mats.gold24k, x, y + 0.24, z, Math.PI * 0.5, 0, 0, 0.32, 0.32, 0.65);
    batch.add(prims.cyl16, seatMat, x, y + 0.67, z, 0, 0, 0, 0.38, 0.09, 0.38);
    batch.add(prims.box, seatMat, x, y + 0.82, z, 0, 0, 0, 0.34, 0.22, 0.07);
  }

  function addChipStacksCluster(batch, mats, cx, cy, cz, stackCount = 5, seed = 1) {
    for (let s = 0; s < stackCount; s++) {
      const a = (s / stackCount) * TAU + seed * 0.7;
      const r = s === 0 ? 0 : 0.09 + (s % 2) * 0.04;
      const sx = cx + Math.cos(a) * r;
      const sz = cz + Math.sin(a) * r;
      const heightChips = 4 + ((seed + s * 3) % 7);
      const chipCol = CHIP_COLORS[(seed + s) % CHIP_COLORS.length];
      const h = heightChips * 0.008;
      batch.add(prims.cyl16, mats.vertexStd, sx, cy + h * 0.5, sz, 0, 0, 0, 0.044, h, 0.044, { color: chipCol });
    }
  }

  function addGoldSyceeIngot(batch, mats, x, y, z, yaw = 0, scale = 1.0) {
    // Boat-shaped Chinese/Vietnamese lucky gold ingot ("Kim Nguyên Bảo")
    batch.add(prims.box, mats.gold24k, x, y + 0.024 * scale, z, 0, yaw, 0, 0.12 * scale, 0.042 * scale, 0.068 * scale);
    batch.add(prims.cyl16, mats.gold24k, x, y + 0.052 * scale, z, 0, yaw, Math.PI * 0.5, 0.075 * scale, 0.15 * scale, 0.075 * scale);
    batch.add(prims.sphere10, mats.gold24k, x, y + 0.066 * scale, z, 0, yaw, 0, 0.062 * scale, 0.048 * scale, 0.052 * scale);
  }

  function createSculpted3DDie(mats, size = 0.095) {
    const dieGrp = new THREE.Group();
    const cube = new THREE.Mesh(prims.box, mats.ivoryCeramic);
    cube.scale.setScalar(size);
    dieGrp.add(cube);

    const pipRed = new THREE.MeshBasicMaterial({ color: 0xd91424 });
    const pipBlack = new THREE.MeshBasicMaterial({ color: 0x14161d });
    const half = size * 0.505;
    const pR = size * 0.095;
    const off = size * 0.25;

    function addPip(px, py, pz, isRed = false) {
      const dot = new THREE.Mesh(prims.sphere10, isRed ? pipRed : pipBlack);
      dot.position.set(px, py, pz);
      dot.scale.setScalar(pR * 2);
      dieGrp.add(dot);
    }

    // Top (+Y): 1 Red Ace Pip; Bottom (-Y): 6 Pips
    addPip(0, half, 0, true);
    for (const sx of [-off, off]) {
      for (const sz of [-off, 0, off]) addPip(sx, -half, sz, false);
    }
    // Front (+Z): 4 Red Pips; Back (-Z): 3 Pips
    for (const sx of [-off, off]) {
      for (const sy of [-off, off]) addPip(sx, sy, half, true);
    }
    addPip(-off, -off, -half); addPip(0, 0, -half); addPip(off, off, -half);
    // Right (+X): 2 Pips; Left (-X): 5 Pips
    addPip(half, -off, -off); addPip(half, off, off);
    for (const sy of [-off, off]) {
      for (const sz of [-off, off]) addPip(-half, sy, sz);
    }
    addPip(-half, 0, 0);

    return dieGrp;
  }

  function buildCasinoStationsSuiteA(root, mats, casinoIntState) {
    const batch = createBatchBuilder(root);
    const floorY = CASINO_INT.floorY; // 0.02

    // ========================================================================
    // STATION 1: `cashier` — Quầy Đổi Phỉnh & Vay Nóng VIP at (1180, 0, 1215)
    // ========================================================================
    {
      const sx = 1180.0;
      const sz = 1215.0;

      // Marble & Mahogany L-Shaped VIP Cashier Counter (facing East/North-East toward lobby)
      batch.add(prims.box, mats.mahoganyWood, sx - 1.15, floorY + 0.56, sz, 0, 0, 0, 1.35, 1.12, 5.2, { castShadow: true });
      batch.add(prims.box, mats.calacattaMarble, sx - 1.10, floorY + 1.15, sz, 0, 0, 0, 1.52, 0.09, 5.4);
      batch.add(prims.box, mats.gold24k, sx - 0.42, floorY + 0.56, sz, 0, 0, 0, 0.08, 1.05, 5.25);

      // Upper Brass Security Arch & 14 Vertical Polished Brass Teller Bars!
      batch.add(prims.box, mats.mahoganyWood, sx - 1.15, floorY + 2.58, sz, 0, 0, 0, 1.45, 0.44, 5.4);
      batch.add(prims.box, mats.gold24k, sx - 0.44, floorY + 2.38, sz, 0, 0, 0, 0.12, 0.09, 5.3);
      batch.add(prims.box, mats.clearDomeGlass, sx - 0.52, floorY + 1.76, sz, 0, 0, 0, 0.04, 1.15, 5.0);

      for (let b = 0; b < 14; b++) {
        const bz = sz - 2.35 + (b / 13) * 4.7;
        // Leave central pass-through slot slightly raised at center
        const barH = Math.abs(bz - sz) < 0.45 ? 0.86 : 1.16;
        const barY = Math.abs(bz - sz) < 0.45 ? floorY + 1.92 : floorY + 1.77;
        batch.add(prims.cyl8, mats.gold24k, sx - 0.46, barY, bz, 0, 0, 0, 0.036, barH, 0.036);
      }

      // Rear Open Safe Credenza Stacked with 24K Gold Bullion & $100 Cash Bricks!
      batch.add(prims.box, mats.darkGunmetal, sx - 3.35, floorY + 1.1, sz, 0, 0, 0, 1.1, 2.2, 4.2);
      for (let row = 0; row < 3; row++) {
        const ry = floorY + 0.45 + row * 0.58;
        batch.add(prims.box, mats.blackSteel, sx - 3.25, ry - 0.08, sz, 0, 0, 0, 0.95, 0.05, 3.8);
        for (let g = -3; g <= 3; g++) {
          if (row === 2) {
            batch.add(prims.box, mats.gold24k, sx - 3.05, ry + 0.05, sz + g * 0.46, 0, 0.08, 0, 0.28, 0.12, 0.16);
          } else {
            batch.add(prims.box, mats.vertexStd, sx - 3.05, ry + 0.05, sz + g * 0.46, 0, -0.05, 0, 0.26, 0.11, 0.18, { color: colCashGreen });
          }
        }
      }

      // Countertop Chip Racks & Cash Counting Machine
      addChipStacksCluster(batch, mats, sx - 0.95, floorY + 1.20, sz - 0.9, 6, 11);
      addChipStacksCluster(batch, mats, sx - 0.95, floorY + 1.20, sz + 0.9, 6, 22);
      batch.add(prims.box, mats.darkGunmetal, sx - 0.95, floorY + 1.30, sz, 0, 0, 0, 0.34, 0.22, 0.38);

      const cashierSignTex = createSignBannerTexture(
        '🪙 QUẦY ĐỔI PHỈNH & VAY NÓNG VIP',
        'CASHIER • TÍN DỤNG MAFIA • NHẬN PHỈNH MIỄN PHÍ',
        { bg: '#18082b', border: '#ffd54f', titleColor: '#ffe885', subColor: '#5cf2b8' }
      );
      const cashierSign = new THREE.Mesh(
        new THREE.PlaneGeometry(4.8, 0.95),
        new THREE.MeshBasicMaterial({ map: cashierSignTex })
      );
      cashierSign.position.set(sx - 0.38, floorY + 3.18, sz);
      cashierSign.rotation.y = Math.PI * 0.5;
      root.add(cashierSign);

      // Cashier Teller NPC behind Brass Cage
      const teller = buildArticulatedVenueNPC(mats, 'cashier_teller', 301, { female: true });
      teller.root.position.set(sx - 1.95, floorY, sz);
      teller.root.rotation.y = Math.PI * 0.5;
      root.add(teller.root);
      casinoIntState.npcs.push(teller);

      // Glowing Floor Interaction Ring & Floating Vietnamese Label
      const ring = createInteractionFloorRing(sx + 0.55, floorY, sz, 0xffd54f, 0.72, 0.98);
      const sprite = createFloatingStationSprite(
        '🪙 QUẦY ĐỔI PHỈNH & VAY NÓNG VIP',
        '[F] Đổi Tiền <-> Phỉnh • Vay Nóng Mafia',
        '#ffd54f',
        2.85,
        0.70
      );
      sprite.position.set(sx, floorY + 2.35, sz);
      root.add(ring, sprite);
      casinoIntState.rings.push(ring);

      addInteriorAABB(sx - 3.9, sx - 0.38, sz - 2.75, sz + 2.75, 3.2, 0, 'casino_cashier_cage');
      registerStation({
        type: 'cashier',
        id: 'cashier_main',
        label: 'Quầy Đổi Phỉnh & Vay Nóng VIP',
        venue: 'casino',
        minBet: 0,
        maxBet: 50000,
        x: sx,
        y: floorY,
        z: sz,
        ringMesh: ring,
        labelSprite: sprite,
      });
    }

    // ========================================================================
    // STATION 2: `lucky_wheel` — Vòng Quay Kim Cương 20 Ô at (1216, 0, 1212)
    // ========================================================================
    {
      const wx = 1216.0;
      const wz = 1212.0;

      // Fanfare Stage Pedestal + Gold Rim
      batch.add(prims.cyl24, mats.crimsonVelvet, wx, floorY + 0.10, wz, 0, 0, 0, 4.2, 0.20, 4.2, { receiveShadow: true });
      batch.add(prims.torus32, mats.gold24k, wx, floorY + 0.20, wz, Math.PI * 0.5, 0, 0, 4.24, 4.24, 0.5);

      // Art-Deco Twin Brass A-Frame Support Uprights
      for (const side of [-0.34, 0.34]) {
        batch.add(prims.box, mats.gold24k, wx + side, floorY + 1.45, wz - 0.38, -0.14, 0, 0, 0.16, 2.75, 0.18, { castShadow: true });
      }
      batch.add(prims.box, mats.blackGoldMarble, wx, floorY + 0.42, wz - 0.38, 0, 0, 0, 1.65, 0.55, 0.92);

      // Illuminated Arch Header with Chasing Marquee
      batch.add(prims.torus32, mats.neonGold, wx, floorY + 2.45, wz - 0.28, 0, 0, 0, 3.75, 3.75, 0.68);

      // Physically Rotating 20-Slice 3D Wheel Rotor Group!
      const wheelRotor = new THREE.Group();
      wheelRotor.position.set(wx, floorY + 2.38, wz - 0.12);

      const wheelBacking = new THREE.Mesh(prims.cyl24, mats.gold24k);
      wheelBacking.rotation.x = Math.PI * 0.5;
      wheelBacking.scale.set(3.26, 0.14, 3.26);
      wheelBacking.castShadow = true;
      wheelRotor.add(wheelBacking);

      const wheelFaceDisc = new THREE.Mesh(new THREE.CircleGeometry(1.56, 40), mats.luckyWheelDisc);
      wheelFaceDisc.position.z = 0.082;
      wheelRotor.add(wheelFaceDisc);

      // 20 Physical Brass Perimeter Pegs around the Wheel!
      for (let p = 0; p < 20; p++) {
        const pa = (p / 20) * TAU;
        const peg = new THREE.Mesh(prims.cyl8, mats.liquidChrome);
        peg.rotation.x = Math.PI * 0.5;
        peg.position.set(Math.cos(pa) * 1.50, Math.sin(pa) * 1.50, 0.13);
        peg.scale.set(0.036, 0.12, 0.036);
        wheelRotor.add(peg);
      }

      // Center Crystal Diamond Spindle Cap
      const centerGem = new THREE.Mesh(prims.octa, mats.crystalDiamond);
      centerGem.rotation.x = Math.PI * 0.5;
      centerGem.position.z = 0.16;
      centerGem.scale.set(0.32, 0.24, 0.32);
      wheelRotor.add(centerGem);
      root.add(wheelRotor);

      // Top Hinged Clapper Pointer (deflects physically as pegs pass!)
      const clapperPivot = new THREE.Group();
      clapperPivot.position.set(wx, floorY + 4.02, wz + 0.02);
      const clapperBlade = new THREE.Mesh(prims.cone8, mats.neonCrimson);
      clapperBlade.rotation.z = Math.PI;
      clapperBlade.position.y = -0.14;
      clapperBlade.scale.set(0.14, 0.30, 0.06);
      clapperPivot.add(clapperBlade);
      root.add(clapperPivot);

      casinoIntState.luckyWheel = {
        rotor: wheelRotor,
        clapper: clapperPivot,
        angle: 0,
        angularVel: 0.42, // Gentle showcase rotation when idle; bursts to 14 rad/s when spun!
        spinning: false,
      };

      // Vòng Quay Thiên Mệnh Hostess NPC standing beside stage
      const hostess = buildArticulatedVenueNPC(mats, 'high_roller', 302, { female: true });
      hostess.root.position.set(wx + 2.15, floorY, wz + 0.35);
      hostess.root.rotation.y = -0.45;
      root.add(hostess.root);
      casinoIntState.npcs.push(hostess);

      const ring = createInteractionFloorRing(wx, floorY, wz + 1.55, 0x00f0ff, 0.72, 0.98);
      const sprite = createFloatingStationSprite(
        '🎡 VÒNG QUAY KIM CƯƠNG 20 Ô',
        '[F] Quay Trúng Siêu Xe Podium & 50,000 Phỉnh!',
        '#00f0ff',
        3.05,
        0.72
      );
      sprite.position.set(wx, floorY + 4.55, wz);
      root.add(ring, sprite);
      casinoIntState.rings.push(ring);

      addInteriorAABB(wx - 1.65, wx + 1.65, wz - 0.85, wz + 0.35, 4.2, 0, 'casino_lucky_wheel');
      registerStation({
        type: 'lucky_wheel',
        id: 'lucky_wheel_1',
        label: 'Vòng Quay Kim Cương 20 Ô',
        venue: 'casino',
        minBet: 0,
        maxBet: 5000,
        x: wx,
        y: floorY,
        z: wz,
        ringMesh: ring,
        labelSprite: sprite,
      });
    }

    // ========================================================================
    // STATION 3: `taixiu` — 2 Bàn Tài Xỉu Lắc Xí Ngầu Đỏ Đen
    //            at (1184, 0, 1198) & (1184, 0, 1190)
    // ========================================================================
    casinoIntState.taixiuShakers = [];
    const taixiuCoords = [
      { id: 'taixiu_1', x: 1184.0, z: 1198.0, label: 'Bàn Tài Xỉu Lắc Xí Ngầu VIP #1' },
      { id: 'taixiu_2', x: 1184.0, z: 1190.0, label: 'Bàn Tài Xỉu Lắc Xí Ngầu VIP #2' },
    ];

    for (let ti = 0; ti < taixiuCoords.length; ti++) {
      const tc = taixiuCoords[ti];
      const tx = tc.x;
      const tz = tc.z;

      // Ornate Carved Crimson-Lacquer & 24K Gold Asian VIP Table (2.25m x 1.45m, h = 0.88m)
      batch.add(prims.box, mats.crimsonVelvet, tx, floorY + 0.78, tz, 0, 0, 0, 2.28, 0.18, 1.48, { castShadow: true });
      batch.add(prims.box, mats.gold24k, tx, floorY + 0.72, tz, 0, 0, 0, 2.34, 0.06, 1.54);
      // Padded Black Leather Armrest Perimeter
      batch.add(prims.box, mats.blackLeather, tx, floorY + 0.90, tz - 0.71, 0, 0, 0, 2.32, 0.08, 0.12);
      batch.add(prims.box, mats.blackLeather, tx, floorY + 0.90, tz + 0.71, 0, 0, 0, 2.32, 0.08, 0.12);
      batch.add(prims.box, mats.blackLeather, tx - 1.11, floorY + 0.90, tz, 0, 0, 0, 0.12, 0.08, 1.48);
      batch.add(prims.box, mats.blackLeather, tx + 1.11, floorY + 0.90, tz, 0, 0, 0, 0.12, 0.08, 1.48);

      // 4 Sculpted Dragon-Gold Corner Legs + Stretcher
      for (const lx of [-0.92, 0.92]) {
        for (const lz of [-0.54, 0.54]) {
          batch.add(prims.cyl8, mats.mahoganyWood, tx + lx, floorY + 0.38, tz + lz, 0, 0, 0, 0.15, 0.74, 0.15);
          batch.add(prims.torus16, mats.gold24k, tx + lx, floorY + 0.58, tz + lz, Math.PI * 0.5, 0, 0, 0.22, 0.22, 0.9);
        }
      }

      // Backlit Tài Xỉu Betting Surface
      const feltPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.04, 1.24), mats.taixiuSurface);
      feltPlane.rotation.x = -Math.PI * 0.5;
      feltPlane.position.set(tx, floorY + 0.876, tz);
      root.add(feltPlane);

      // Central Brass Mechanical Shaker Pedestal + Clear 3D Glass Dome + 3 Tumbling 3D Pips Dice!
      const domeX = tx - 0.15;
      const domeZ = tz - 0.34;
      batch.add(prims.cyl16, mats.gold24k, domeX, floorY + 0.92, domeZ, 0, 0, 0, 0.38, 0.09, 0.38);
      batch.add(prims.cyl16, mats.ivoryCeramic, domeX, floorY + 0.97, domeZ, 0, 0, 0, 0.32, 0.02, 0.32);

      const glassDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 18, 12, 0, TAU, 0, Math.PI * 0.55),
        mats.clearDomeGlass
      );
      glassDome.position.set(domeX, floorY + 0.98, domeZ);
      root.add(glassDome);

      const domeFinial = new THREE.Mesh(prims.sphere10, mats.gold24k);
      domeFinial.position.set(domeX, floorY + 1.17, domeZ);
      domeFinial.scale.setScalar(0.055);
      root.add(domeFinial);

      const diceList = [];
      for (let d = 0; d < 3; d++) {
        const die = createSculpted3DDie(mats, 0.064);
        const da = (d / 3) * TAU;
        die.position.set(domeX + Math.cos(da) * 0.065, floorY + 1.015, domeZ + Math.sin(da) * 0.065);
        die.rotation.set(d * 0.7, d * 1.2, 0);
        root.add(die);
        diceList.push({
          mesh: die,
          baseX: domeX + Math.cos(da) * 0.065,
          baseY: floorY + 1.015,
          baseZ: domeZ + Math.sin(da) * 0.065,
          phase: d * 2.1 + ti,
        });
      }
      casinoIntState.taixiuShakers.push({ glassDome, diceList, phase: ti * 3.1 });

      // Electronic "SOI CẦU TÀI XỈU" History Pole + Chip Stacks + Stools + Asian Dealer NPC
      batch.add(prims.cyl8, mats.gold24k, tx - 0.98, floorY + 1.32, tz - 0.56, 0, 0, 0, 0.04, 0.88, 0.04);
      batch.add(prims.box, mats.blackSteel, tx - 0.98, floorY + 1.68, tz - 0.56, 0, 0.4, 0, 0.42, 0.56, 0.05);
      batch.add(prims.box, mats.neonCrimson, tx - 0.96, floorY + 1.76, tz - 0.54, 0, 0.4, 0, 0.34, 0.14, 0.06);
      batch.add(prims.box, mats.neonCyan, tx - 0.96, floorY + 1.58, tz - 0.54, 0, 0.4, 0, 0.34, 0.14, 0.06);

      addChipStacksCluster(batch, mats, tx + 0.52, floorY + 0.88, tz + 0.18, 6, 30 + ti * 7);
      addChipStacksCluster(batch, mats, tx - 0.48, floorY + 0.88, tz + 0.24, 5, 41 + ti * 5);

      for (const stX of [tx - 0.65, tx, tx + 0.65]) {
        addCasinoVelvetStool(batch, mats, stX, floorY, tz + 1.06, mats.crimsonVelvet);
      }

      const dealer = buildArticulatedVenueNPC(mats, 'dealer_asian', 310 + ti, { female: ti === 0 });
      dealer.root.position.set(tx, floorY, tz - 1.08);
      dealer.root.rotation.y = 0; // Facing +Z toward players
      root.add(dealer.root);
      casinoIntState.npcs.push(dealer);

      const ring = createInteractionFloorRing(tx + 1.48, floorY, tz, 0xff3b5c, 0.68, 0.92);
      const sprite = createFloatingStationSprite(
        `🎲 ${tc.label.toUpperCase()}`,
        '[F] Cược Tài / Xỉu / Bão • Nặn Bát Kịch Tính!',
        '#ff5c77',
        2.95,
        0.70
      );
      sprite.position.set(tx, floorY + 2.28, tz);
      root.add(ring, sprite);
      casinoIntState.rings.push(ring);

      addInteriorAABB(tx - 1.16, tx + 1.16, tz - 0.76, tz + 0.76, 1.15, 0, `casino_${tc.id}`);
      registerStation({
        type: 'taixiu',
        id: tc.id,
        label: tc.label,
        venue: 'casino',
        minBet: 50,
        maxBet: 25000,
        x: tx,
        y: floorY,
        z: tz,
        ringMesh: ring,
        labelSprite: sprite,
      });
    }

    // ========================================================================
    // STATION 4: `xocdia` — 2 Bàn Xóc Đĩa Đỏ Đen VIP
    //            at Exact (1184, 0, 1182) & Companion (1191.5, 0, 1182)
    // ========================================================================
    casinoIntState.xocdiaBowls = [];
    const xocdiaCoords = [
      { id: 'xocdia_1', x: 1184.0, z: 1182.0, label: 'Bàn Xóc Đĩa Đỏ Đen VIP #1' },
      { id: 'xocdia_2', x: 1191.5, z: 1182.0, label: 'Bàn Xóc Đĩa Đỏ Đen VIP #2' },
    ];

    for (let xi = 0; xi < xocdiaCoords.length; xi++) {
      const xc = xocdiaCoords[xi];
      const bx = xc.x;
      const bz = xc.z;

      // Crimson-Velvet & Mahogany Table with Gold Corner Brackets
      batch.add(prims.box, mats.mahoganyWood, bx, floorY + 0.77, bz, 0, 0, 0, 2.18, 0.18, 1.42, { castShadow: true });
      batch.add(prims.box, mats.gold24k, bx, floorY + 0.87, bz, 0, 0, 0, 2.24, 0.05, 1.48);
      for (const lx of [-0.88, 0.88]) {
        for (const lz of [-0.50, 0.50]) {
          batch.add(prims.box, mats.mahoganyWood, bx + lx, floorY + 0.38, bz + lz, 0, 0, 0, 0.14, 0.74, 0.14);
        }
      }

      const matPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.24), mats.xocdiaSurface);
      matPlane.rotation.x = -Math.PI * 0.5;
      matPlane.position.set(bx, floorY + 0.898, bz);
      root.add(matPlane);

      // Ceramic Porcelain Plate + Animated Shaking/Peeking Porcelain Bowl + 4 Red/White Coins!
      batch.add(prims.cyl24, mats.ivoryCeramic, bx, floorY + 0.912, bz - 0.08, 0, 0, 0, 0.42, 0.024, 0.42);
      batch.add(prims.torus16, mats.neonCyan, bx, floorY + 0.922, bz - 0.08, Math.PI * 0.5, 0, 0, 0.38, 0.38, 0.4);

      for (let c = 0; c < 4; c++) {
        const ca = (c / 4) * TAU + 0.4;
        batch.add(
          prims.cyl16,
          c % 2 === 0 ? mats.neonCrimson : mats.ivoryCeramic,
          bx + Math.cos(ca) * 0.075,
          floorY + 0.930,
          bz - 0.08 + Math.sin(ca) * 0.075,
          0, 0, 0,
          0.048, 0.010, 0.048
        );
      }

      const bowlGrp = new THREE.Group();
      bowlGrp.position.set(bx, floorY + 0.93, bz - 0.08);
      const bowlDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.165, 20, 12, 0, TAU, 0, Math.PI * 0.52),
        mats.ivoryCeramic
      );
      bowlGrp.add(bowlDome);
      const bowlRim = new THREE.Mesh(prims.torus16, mats.gold24k);
      bowlRim.rotation.x = Math.PI * 0.5;
      bowlRim.position.y = 0.01;
      bowlRim.scale.set(0.33, 0.33, 0.45);
      bowlGrp.add(bowlRim);
      const bowlFoot = new THREE.Mesh(prims.cyl16, mats.gold24k);
      bowlFoot.position.y = 0.168;
      bowlFoot.scale.set(0.09, 0.03, 0.09);
      bowlGrp.add(bowlFoot);
      root.add(bowlGrp);
      casinoIntState.xocdiaBowls.push({ group: bowlGrp, baseX: bx, baseY: floorY + 0.93, baseZ: bz - 0.08, phase: xi * 2.4 });

      // 4 Sculpted Gold Sycee Ingots ("Kim Nguyên Bảo") on Table Corners!
      addGoldSyceeIngot(batch, mats, bx - 0.78, floorY + 0.90, bz - 0.42, 0.35, 1.1);
      addGoldSyceeIngot(batch, mats, bx - 0.64, floorY + 0.90, bz - 0.46, -0.2, 0.95);
      addGoldSyceeIngot(batch, mats, bx + 0.78, floorY + 0.90, bz - 0.42, -0.35, 1.1);
      addGoldSyceeIngot(batch, mats, bx + 0.64, floorY + 0.90, bz - 0.46, 0.25, 0.95);
      addChipStacksCluster(batch, mats, bx - 0.52, floorY + 0.90, bz + 0.25, 5, 55 + xi);
      addChipStacksCluster(batch, mats, bx + 0.52, floorY + 0.90, bz + 0.25, 5, 62 + xi);

      addCasinoVelvetStool(batch, mats, bx - 0.55, floorY, bz + 1.04, mats.crimsonVelvet);
      addCasinoVelvetStool(batch, mats, bx + 0.55, floorY, bz + 1.04, mats.crimsonVelvet);

      const dealer = buildArticulatedVenueNPC(mats, 'dealer_asian', 320 + xi, { female: xi === 1 });
      dealer.root.position.set(bx, floorY, bz - 1.02);
      dealer.root.rotation.y = 0;
      root.add(dealer.root);
      casinoIntState.npcs.push(dealer);

      const ring = createInteractionFloorRing(bx, floorY, bz + 1.48, 0xffb703, 0.68, 0.92);
      const sprite = createFloatingStationSprite(
        `🔴⚪ ${xc.label.toUpperCase()}`,
        '[F] Chẵn / Lẻ / Tứ Tử 1 Ăn 12 • Nặn Đĩa!',
        '#ffd166',
        2.85,
        0.68
      );
      sprite.position.set(bx, floorY + 2.24, bz);
      root.add(ring, sprite);
      casinoIntState.rings.push(ring);

      addInteriorAABB(bx - 1.12, bx + 1.12, bz - 0.74, bz + 0.74, 1.15, 0, `casino_${xc.id}`);
      registerStation({
        type: 'xocdia',
        id: xc.id,
        label: xc.label,
        venue: 'casino',
        minBet: 50,
        maxBet: 25000,
        x: bx,
        y: floorY,
        z: bz,
        ringMesh: ring,
        labelSprite: sprite,
      });
    }

    // ========================================================================
    // STATION 5: `roulette` — 2 Bàn Quay Roulette Đỏ Đen 0–36
    //            at Exact (1200, 0, 1186) & Companion (1193.5, 0, 1188.5)
    // ========================================================================
    casinoIntState.rouletteWheels = [];
    const rouletteCoords = [
      { id: 'roulette_1', x: 1200.0, z: 1186.0, label: 'Bàn Quay Roulette Châu Âu 0–36 #1' },
      { id: 'roulette_2', x: 1193.5, z: 1188.5, label: 'Bàn Quay Roulette Châu Âu 0–36 #2' },
    ];

    for (let ri = 0; ri < rouletteCoords.length; ri++) {
      const rc = rouletteCoords[ri];
      const rx = rc.x;
      const rz = rc.z;

      // Polished Mahogany Double-Pedestal Roulette Table (2.65m x 1.42m)
      batch.add(prims.box, mats.mahoganyWood, rx, floorY + 0.78, rz, 0, 0, 0, 2.66, 0.20, 1.44, { castShadow: true });
      batch.add(prims.box, mats.gold24k, rx, floorY + 0.70, rz, 0, 0, 0, 2.70, 0.05, 1.48);
      batch.add(prims.cyl16, mats.mahoganyWood, rx - 0.78, floorY + 0.36, rz, 0, 0, 0, 0.56, 0.70, 0.56);
      batch.add(prims.cyl16, mats.mahoganyWood, rx + 0.78, floorY + 0.36, rz, 0, 0, 0, 0.56, 0.70, 0.56);
      batch.add(prims.box, mats.gold24k, rx, floorY + 0.10, rz, 0, 0, 0, 1.85, 0.08, 0.28);

      // Green 0-36 Betting Grid on Right Side of Table
      const gridMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.58, 1.16), mats.rouletteSurface);
      gridMesh.rotation.x = -Math.PI * 0.5;
      gridMesh.position.set(rx + 0.44, floorY + 0.885, rz);
      root.add(gridMesh);

      // Sunken Mahogany & Brass Roulette Bowl on Left Side (rx - 0.78, rz)
      const bowlX = rx - 0.78;
      batch.add(prims.cyl24, mats.mahoganyWood, bowlX, floorY + 0.91, rz, 0, 0, 0, 0.92, 0.10, 0.92);
      batch.add(prims.torus32, mats.gold24k, bowlX, floorY + 0.96, rz, Math.PI * 0.5, 0, 0, 0.90, 0.90, 0.65);

      // Live Rotating 3D Roulette Rotor + 18 Red/Black/Green Pocket Wedges + Turret Spindle + Ivory Ball!
      const rotorGrp = new THREE.Group();
      rotorGrp.position.set(bowlX, floorY + 0.94, rz);

      const rotorBase = new THREE.Mesh(prims.cyl24, mats.blackLeather);
      rotorBase.scale.set(0.74, 0.03, 0.74);
      rotorGrp.add(rotorBase);

      for (let pk = 0; pk < 18; pk++) {
        const pa = (pk / 18) * TAU;
        const pMat = pk === 0 ? mats.neonEmerald : (pk % 2 === 0 ? mats.crimsonVelvet : mats.blackSteel);
        const pocket = new THREE.Mesh(prims.box, pMat);
        pocket.position.set(Math.cos(pa) * 0.26, 0.02, Math.sin(pa) * 0.26);
        pocket.rotation.y = -pa;
        pocket.scale.set(0.14, 0.015, 0.075);
        rotorGrp.add(pocket);
      }

      const spindleCone = new THREE.Mesh(prims.cone16, mats.gold24k);
      spindleCone.position.y = 0.065;
      spindleCone.scale.set(0.24, 0.11, 0.24);
      rotorGrp.add(spindleCone);

      const turretCross = new THREE.Mesh(prims.box, mats.liquidChrome);
      turretCross.position.y = 0.125;
      turretCross.scale.set(0.26, 0.022, 0.03);
      rotorGrp.add(turretCross);
      root.add(rotorGrp);

      // Counter-Orbiting Ivory Ball
      const ballOrbit = new THREE.Group();
      ballOrbit.position.set(bowlX, floorY + 0.965, rz);
      const ivoryBall = new THREE.Mesh(prims.sphere10, mats.ivoryCeramic);
      ivoryBall.position.set(0.33, 0, 0);
      ivoryBall.scale.setScalar(0.028);
      ballOrbit.add(ivoryBall);
      root.add(ballOrbit);

      casinoIntState.rouletteWheels.push({ rotorGrp, ballOrbit, ivoryBall, phase: ri * 1.9 });

      // Hot/Cold Numbers Electronic Totem + Chips + Stools + Croupier NPC
      batch.add(prims.cyl8, mats.gold24k, rx - 1.18, floorY + 1.38, rz - 0.56, 0, 0, 0, 0.045, 0.98, 0.045);
      batch.add(prims.box, mats.blackSteel, rx - 1.18, floorY + 1.78, rz - 0.56, 0, 0.25, 0, 0.36, 0.68, 0.06);
      batch.add(prims.box, mats.neonGold, rx - 1.16, floorY + 1.78, rz - 0.54, 0, 0.25, 0, 0.28, 0.58, 0.065);

      addChipStacksCluster(batch, mats, rx + 0.35, floorY + 0.89, rz + 0.12, 6, 71 + ri);
      addChipStacksCluster(batch, mats, rx + 0.85, floorY + 0.89, rz - 0.16, 5, 84 + ri);

      for (const stX of [rx - 0.35, rx + 0.35, rx + 0.95]) {
        addCasinoVelvetStool(batch, mats, stX, floorY, rz + 1.04, mats.purpleVelvet);
      }

      const croupier = buildArticulatedVenueNPC(mats, 'dealer_western', 330 + ri, { female: ri === 1 });
      croupier.root.position.set(rx - 0.15, floorY, rz - 1.04);
      croupier.root.rotation.y = 0;
      root.add(croupier.root);
      casinoIntState.npcs.push(croupier);

      const ring = createInteractionFloorRing(rx + 0.25, floorY, rz + 1.52, 0x2ec4b6, 0.68, 0.94);
      const sprite = createFloatingStationSprite(
        `🎯 ${rc.label.toUpperCase()}`,
        '[F] Đặt Đỏ / Đen / Chẵn / Lẻ / Số 0–36 (1 Ăn 35)!',
        '#38f2af',
        3.05,
        0.70
      );
      sprite.position.set(rx, floorY + 2.32, rz);
      root.add(ring, sprite);
      casinoIntState.rings.push(ring);

      addInteriorAABB(rx - 1.34, rx + 1.34, rz - 0.74, rz + 0.74, 1.15, 0, `casino_${rc.id}`);
      registerStation({
        type: 'roulette',
        id: rc.id,
        label: rc.label,
        venue: 'casino',
        minBet: 25,
        maxBet: 20000,
        x: rx,
        y: floorY,
        z: rz,
        ringMesh: ring,
        labelSprite: sprite,
      });
    }

    batch.flush(root);
  }

  // --------------------------------------------------------------------------
  // 13. CASINO GAMBLING STATIONS SUITE B:
  //     BLACKJACK (x2), TEXAS HOLD'EM POKER VIP (+4 AI HIGH-ROLLERS),
  //     BACCARAT ROYAL SANCTUARY, 12 SLOT MACHINES ("DIAMOND 777"),
  //     INSIDE-TRACK DERBY LOUNGE & AMBIENT PATRONS / SECURITY
  // --------------------------------------------------------------------------
  function addDealtCardPair(batch, mats, x, y, z, yaw = 0) {
    batch.add(prims.box, mats.vertexStd, x - 0.032, y + 0.003, z, 0, yaw + 0.08, 0, 0.064, 0.004, 0.092, { color: colCardWhite });
    batch.add(prims.box, mats.vertexStd, x + 0.032, y + 0.005, z + 0.012, 0, yaw - 0.12, 0, 0.064, 0.004, 0.092, { color: colCardBackRed });
  }

  function addVIPTuftedArmchair(batch, mats, x, y, z, yaw = 0, velvetMat = mats.purpleVelvet) {
    const fwdX = Math.sin(yaw);
    const fwdZ = Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    // Chrome 4-star swivel base + central post
    batch.add(prims.cyl16, mats.gold24k, x, y + 0.03, z, 0, 0, 0, 0.52, 0.05, 0.52);
    batch.add(prims.cyl8, mats.gold24k, x, y + 0.24, z, 0, 0, 0, 0.08, 0.42, 0.08);
    // Plush seat cushion
    batch.add(prims.box, velvetMat, x, y + 0.46, z, 0, yaw, 0, 0.62, 0.12, 0.58);
    // High tufted backrest + gold top crest
    batch.add(prims.box, velvetMat, x - fwdX * 0.25, y + 0.84, z - fwdZ * 0.25, -0.10, yaw, 0, 0.60, 0.68, 0.11);
    batch.add(prims.box, mats.gold24k, x - fwdX * 0.28, y + 1.19, z - fwdZ * 0.28, 0, yaw, 0, 0.56, 0.05, 0.08);
    // Left & Right Padded Armrests
    for (const s of [-1, 1]) {
      batch.add(
        prims.box,
        velvetMat,
        x + rightX * s * 0.30,
        y + 0.63,
        z + rightZ * s * 0.30,
        0, yaw, 0,
        0.08, 0.22, 0.50
      );
    }
  }

  function buildCasinoStationsSuiteB(root, mats, casinoIntState) {
    const batch = createBatchBuilder(root);
    const floorY = CASINO_INT.floorY; // 0.02

    // ========================================================================
    // STATION 6: `blackjack` — 2 Bàn Xì Dách Blackjack 21
    //            at Exact (1215, 0, 1198) & Companion (1215, 0, 1205.2)
    // ========================================================================
    const bjCoords = [
      { id: 'blackjack_1', x: 1215.0, z: 1198.0, label: 'Bàn Xì Dách Blackjack 21 #1' },
      { id: 'blackjack_2', x: 1215.0, z: 1205.2, label: 'Bàn Xì Dách Blackjack 21 #2' },
    ];

    for (let bi = 0; bi < bjCoords.length; bi++) {
      const bc = bjCoords[bi];
      const bx = bc.x;
      const bz = bc.z;

      // Semi-Circular Curved Blackjack Table Facing West (-X toward player promenade, dealer on +X)
      const semiGeo = new THREE.CylinderGeometry(1.22, 1.18, 0.18, 24, 1, false, Math.PI, Math.PI);
      batch.add(semiGeo, mats.mahoganyWood, bx + 0.38, floorY + 0.79, bz, 0, 0, 0, 1, 1, 1, { castShadow: true });

      const semiFeltGeo = new THREE.CircleGeometry(1.14, 24, Math.PI * 0.5, Math.PI);
      const feltMesh = new THREE.Mesh(semiFeltGeo, mats.blackjackSurface);
      feltMesh.rotation.x = -Math.PI * 0.5;
      feltMesh.position.set(bx + 0.38, floorY + 0.885, bz);
      root.add(feltMesh);

      // Mahogany Pedestal Legs
      batch.add(prims.cyl16, mats.mahoganyWood, bx + 0.05, floorY + 0.36, bz - 0.58, 0, 0, 0, 0.36, 0.70, 0.36);
      batch.add(prims.cyl16, mats.mahoganyWood, bx + 0.05, floorY + 0.36, bz + 0.58, 0, 0, 0, 0.36, 0.70, 0.36);
      batch.add(prims.box, mats.gold24k, bx + 0.05, floorY + 0.08, bz, 0, 0, 0, 0.42, 0.08, 1.56);

      // 7-Segment Curved Black-Leather Armrest Rail along Player Arc
      for (let seg = 0; seg < 7; seg++) {
        const a = Math.PI * 0.58 + (seg / 6) * Math.PI * 0.84; // West-facing arc (-X)
        const rx = bx + 0.38 + Math.cos(a) * 1.18;
        const rz = bz + Math.sin(a) * 1.18;
        batch.add(prims.box, mats.blackLeather, rx, floorY + 0.91, rz, 0, -a, 0, 0.14, 0.07, 0.48);

        if (seg >= 1 && seg <= 5) {
          const cardX = bx + 0.38 + Math.cos(a) * 0.82;
          const cardZ = bz + Math.sin(a) * 0.82;
          addDealtCardPair(batch, mats, cardX, floorY + 0.886, cardZ, -a + Math.PI * 0.5);
          if (seg % 2 === 1) {
            addChipStacksCluster(batch, mats, bx + 0.38 + Math.cos(a) * 0.96, floorY + 0.886, bz + Math.sin(a) * 0.96, 3, 90 + seg + bi);
          }
        }
      }

      // Dealer 8-Tube Chip Rack, Translucent 6-Deck Card Shoe & Red Discard Tray
      batch.add(prims.box, mats.gold24k, bx + 0.22, floorY + 0.90, bz, 0, 0, 0, 0.22, 0.04, 0.58);
      addChipStacksCluster(batch, mats, bx + 0.22, floorY + 0.91, bz - 0.14, 4, 102 + bi);
      addChipStacksCluster(batch, mats, bx + 0.22, floorY + 0.91, bz + 0.14, 4, 108 + bi);

      // Angled Card Shoe (bx + 0.12, bz - 0.58)
      batch.add(prims.box, mats.clearDomeGlass, bx + 0.12, floorY + 0.95, bz - 0.58, 0, 0.35, -0.25, 0.32, 0.13, 0.14);
      batch.add(prims.box, mats.vertexStd, bx + 0.12, floorY + 0.94, bz - 0.58, 0, 0.35, -0.25, 0.24, 0.09, 0.11, { color: colCardBackRed });
      // Discard Holder (bx + 0.12, bz + 0.58)
      batch.add(prims.box, mats.crimsonVelvet, bx + 0.12, floorY + 0.95, bz + 0.58, 0, -0.25, 0, 0.13, 0.14, 0.16);

      // 4 Curved-Arc Player Stools + Western Dealer NPC
      for (let st = 0; st < 4; st++) {
        const sa = Math.PI * 0.68 + (st / 3) * Math.PI * 0.64;
        addCasinoVelvetStool(
          batch,
          mats,
          bx + 0.38 + Math.cos(sa) * 1.56,
          floorY,
          bz + Math.sin(sa) * 1.56,
          mats.emeraldFelt
        );
      }

      const dealer = buildArticulatedVenueNPC(mats, 'dealer_western', 340 + bi, { female: bi === 0 });
      dealer.root.position.set(bx + 0.82, floorY, bz);
      dealer.root.rotation.y = -Math.PI * 0.5; // Facing West (-X) toward players
      root.add(dealer.root);
      casinoIntState.npcs.push(dealer);

      const ring = createInteractionFloorRing(bx - 1.18, floorY, bz, 0x06d6a0, 0.68, 0.94);
      const sprite = createFloatingStationSprite(
        `🃏 ${bc.label.toUpperCase()}`,
        '[F] Rút / Dừng / Gấp Đôi / Ngũ Linh • Blackjack 3:2!',
        '#06d6a0',
        3.05,
        0.70
      );
      sprite.position.set(bx, floorY + 2.28, bz);
      root.add(ring, sprite);
      casinoIntState.rings.push(ring);

      addInteriorAABB(bx - 0.86, bx + 0.52, bz - 1.22, bz + 1.22, 1.15, 0, `casino_${bc.id}`);
      registerStation({
        type: 'blackjack',
        id: bc.id,
        label: bc.label,
        venue: 'casino',
        minBet: 50,
        maxBet: 20000,
        x: bx,
        y: floorY,
        z: bz,
        ringMesh: ring,
        labelSprite: sprite,
      });
    }

    // ========================================================================
    // STATION 7: `poker` — Bàn Texas Hold'em Poker Thượng Lưu at (1215, 0, 1188)
    //            Surrounded by 4 Seated AI High-Roller NPCs!
    // ========================================================================
    {
      const px = 1215.0;
      const pz = 1188.0;

      // Grand Oval Racetrack VIP Poker Table (2.95m x 1.78m)
      batch.add(prims.cyl24, mats.mahoganyWood, px, floorY + 0.78, pz, 0, 0, 0, 2.96, 0.18, 1.78, { castShadow: true });
      batch.add(prims.torus32, mats.blackLeather, px, floorY + 0.89, pz, Math.PI * 0.5, 0, 0, 2.94, 1.76, 1.25);
      batch.add(prims.torus32, mats.neonGold, px, floorY + 0.85, pz, Math.PI * 0.5, 0, 0, 2.72, 1.56, 0.45);
      batch.add(prims.cyl16, mats.mahoganyWood, px - 0.72, floorY + 0.38, pz, 0, 0, 0, 0.52, 0.74, 0.52);
      batch.add(prims.cyl16, mats.mahoganyWood, px + 0.72, floorY + 0.38, pz, 0, 0, 0, 0.52, 0.74, 0.52);

      const pokerPlane = new THREE.Mesh(new THREE.CircleGeometry(1.0, 28), mats.pokerSurface);
      pokerPlane.rotation.x = -Math.PI * 0.5;
      pokerPlane.position.set(px, floorY + 0.884, pz);
      pokerPlane.scale.set(1.32, 0.78, 1);
      root.add(pokerPlane);

      // 5 Dealt Community Cards (Flop, Turn, River) + Central High-Roller Pot!
      for (let cc = 0; cc < 5; cc++) {
        batch.add(
          prims.box,
          mats.vertexStd,
          px - 0.32 + cc * 0.16,
          floorY + 0.89,
          pz,
          0, 0, 0,
          0.075, 0.004, 0.108,
          { color: colCardWhite }
        );
      }
      addChipStacksCluster(batch, mats, px, floorY + 0.89, pz + 0.24, 8, 131);

      // Poker Dealer NPC on North Side (pz - 1.18)
      const pokerDealer = buildArticulatedVenueNPC(mats, 'dealer_western', 350, { female: false });
      pokerDealer.root.position.set(px, floorY, pz - 1.22);
      pokerDealer.root.rotation.y = 0;
      root.add(pokerDealer.root);
      casinoIntState.npcs.push(pokerDealer);

      // 4 Seated AI High-Roller NPCs in Bespoke Suits & Gowns around the Oval Table!
      const aiSeats = [
        { x: px - 1.58, z: pz - 0.42, yaw: 1.28, female: false },
        { x: px + 1.58, z: pz - 0.42, yaw: -1.28, female: true },
        { x: px + 1.48, z: pz + 0.55, yaw: -2.05, female: false },
        { x: px + 0.45, z: pz + 1.18, yaw: -2.92, female: true },
      ];
      for (let si = 0; si < aiSeats.length; si++) {
        const st = aiSeats[si];
        addVIPTuftedArmchair(batch, mats, st.x, floorY, st.z, st.yaw, mats.purpleVelvet);

        const aiRoller = buildArticulatedVenueNPC(mats, 'high_roller', 355 + si, {
          female: st.female,
          seated: true,
        });
        aiRoller.root.position.set(st.x, floorY, st.z);
        aiRoller.root.rotation.y = st.yaw;
        root.add(aiRoller.root);
        casinoIntState.npcs.push(aiRoller);

        // Hole cards & personal chip stack in front of each AI high-roller!
        const hx = lerp(st.x, px, 0.42);
        const hz = lerp(st.z, pz, 0.42);
        addDealtCardPair(batch, mats, hx, floorY + 0.89, hz, st.yaw);
        addChipStacksCluster(batch, mats, hx + 0.12, floorY + 0.89, hz, 4, 140 + si);
      }

      // Open Player VIP Throne Seat & Glowing Ring at South-West of Table (px - 0.95, pz + 1.12)
      addVIPTuftedArmchair(batch, mats, px - 0.65, floorY, pz + 1.16, 2.75, mats.crimsonVelvet);

      const ring = createInteractionFloorRing(px - 1.55, floorY, pz + 0.85, 0xf7b801, 0.70, 0.96);
      const sprite = createFloatingStationSprite(
        '♠️ TEXAS HOLD\'EM POKER THƯỢNG LƯU',
        '[F] Đấu Trí 4 Đại Gia AI • Tố All-In Kịch Tính!',
        '#ffd54f',
        3.15,
        0.72
      );
      sprite.position.set(px, floorY + 2.38, pz);
      root.add(ring, sprite);
      casinoIntState.rings.push(ring);

      addInteriorAABB(px - 1.48, px + 1.48, pz - 0.92, pz + 0.92, 1.15, 0, 'casino_poker_vip');
      registerStation({
        type: 'poker',
        id: 'poker_1',
        label: "Bàn Texas Hold'em Poker Thượng Lưu",
        venue: 'casino',
        minBet: 200,
        maxBet: 50000,
        x: px,
        y: floorY,
        z: pz,
        ringMesh: ring,
        labelSprite: sprite,
      });
    }

    // ========================================================================
    // STATION 8: `baccarat` — Bàn Baccarat Hoàng Gia at Exact (1208, 0, 1180)
    //            Inside Golden Stanchion & Velvet Rope VIP Sanctuary!
    // ========================================================================
    {
      const bx = 1208.0;
      const bz = 1180.0;

      // Royal Baccarat Table (2.45m x 1.38m)
      batch.add(prims.cyl24, mats.mahoganyWood, bx, floorY + 0.78, bz, 0, 0, 0, 2.48, 0.19, 1.40, { castShadow: true });
      batch.add(prims.torus32, mats.gold24k, bx, floorY + 0.89, bz, Math.PI * 0.5, 0, 0, 2.48, 1.40, 0.85);
      batch.add(prims.cyl16, mats.gold24k, bx - 0.62, floorY + 0.38, bz, 0, 0, 0, 0.44, 0.74, 0.44);
      batch.add(prims.cyl16, mats.gold24k, bx + 0.62, floorY + 0.38, bz, 0, 0, 0, 0.44, 0.74, 0.44);

      const baccPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.92, 1.04), mats.baccaratSurface);
      baccPlane.rotation.x = -Math.PI * 0.5;
      baccPlane.position.set(bx, floorY + 0.885, bz);
      root.add(baccPlane);

      // Twin Brass Banker Table Lamps + Golden 8-Deck Card Shoe + Chip Stacks
      for (const lx of [bx - 0.88, bx + 0.88]) {
        batch.add(prims.cyl16, mats.gold24k, lx, floorY + 0.90, bz - 0.32, 0, 0, 0, 0.14, 0.03, 0.14);
        batch.add(prims.cyl8, mats.gold24k, lx, floorY + 1.04, bz - 0.32, 0, 0, 0, 0.03, 0.26, 0.03);
        batch.add(prims.cone16, mats.neonEmerald, lx, floorY + 1.18, bz - 0.32, 0, 0, 0, 0.24, 0.12, 0.18);
      }
      batch.add(prims.box, mats.gold24k, bx + 0.52, floorY + 0.94, bz - 0.34, 0, -0.3, 0, 0.28, 0.11, 0.13);
      addChipStacksCluster(batch, mats, bx - 0.35, floorY + 0.89, bz + 0.14, 6, 160);
      addChipStacksCluster(batch, mats, bx + 0.35, floorY + 0.89, bz + 0.14, 6, 166);

      // Golden VIP Velvet Rope Enclosure leaving South Gate wide open for Player!
      addVelvetRopeRun(batch, mats, [
        { x: bx - 2.15, y: floorY, z: bz - 1.55 },
        { x: bx - 2.15, y: floorY, z: bz + 0.25 },
        { x: bx - 2.15, y: floorY, z: bz + 1.85 },
        { x: bx - 0.95, y: floorY, z: bz + 1.85 },
      ], mats.gold24k, mats.crimsonVelvet);
      addVelvetRopeRun(batch, mats, [
        { x: bx + 0.95, y: floorY, z: bz + 1.85 },
        { x: bx + 2.15, y: floorY, z: bz + 1.85 },
        { x: bx + 2.15, y: floorY, z: bz + 0.25 },
        { x: bx + 2.15, y: floorY, z: bz - 1.55 },
      ], mats.gold24k, mats.crimsonVelvet);

      addVIPTuftedArmchair(batch, mats, bx - 0.65, floorY, bz + 1.06, Math.PI, mats.crimsonVelvet);
      addVIPTuftedArmchair(batch, mats, bx + 0.65, floorY, bz + 1.06, Math.PI, mats.crimsonVelvet);

      const baccDealer = buildArticulatedVenueNPC(mats, 'dealer_asian', 362, { female: true });
      baccDealer.root.position.set(bx, floorY, bz - 1.04);
      baccDealer.root.rotation.y = 0;
      root.add(baccDealer.root);
      casinoIntState.npcs.push(baccDealer);

      const ring = createInteractionFloorRing(bx, floorY, bz + 1.65, 0xe0aaff, 0.68, 0.94);
      const sprite = createFloatingStationSprite(
        '👑 BACCARAT HOÀNG GIA VIP',
        '[F] Nhà Con / Nhà Cái / Hòa 1:8 • Nặn Bài Đỉnh Cao!',
        '#e0aaff',
        3.05,
        0.70
      );
      sprite.position.set(bx, floorY + 2.34, bz);
      root.add(ring, sprite);
      casinoIntState.rings.push(ring);

      addInteriorAABB(bx - 1.24, bx + 1.24, bz - 0.72, bz + 0.72, 1.15, 0, 'casino_baccarat_vip');
      registerStation({
        type: 'baccarat',
        id: 'baccarat_1',
        label: 'Bàn Baccarat Hoàng Gia',
        venue: 'casino',
        minBet: 100,
        maxBet: 50000,
        x: bx,
        y: floorY,
        z: bz,
        ringMesh: ring,
        labelSprite: sprite,
      });
    }

    // ========================================================================
    // STATION 9: `slots` — 12 Máy Xèng Jackpot "DIAMOND 777"
    //            6 Machines along West Row X = 1177 & 6 Machines along East Row X = 1223
    //            (Z = 1186, 1190, 1194, 1198, 1202, 1206)
    // ========================================================================
    casinoIntState.slotMachines = [];
    const slotZList = [1186.0, 1190.0, 1194.0, 1198.0, 1202.0, 1206.0];
    let slotIdx = 1;

    for (const rowSpec of [
      { x: 1177.0, facingYaw: Math.PI * 0.5, stoolOffsetX: 0.92, sideSign: 1 },
      { x: 1223.0, facingYaw: -Math.PI * 0.5, stoolOffsetX: -0.92, sideSign: -1 },
    ]) {
      for (let zi = 0; zi < slotZList.length; zi++) {
        const sx = rowSpec.x;
        const sz = slotZList[zi];
        const yaw = rowSpec.facingYaw;
        const dir = rowSpec.sideSign; // +1 faces East (+X), -1 faces West (-X)
        const curId = `slots_${slotIdx}`;

        // Cabinet Pedestal Base & Main Curved Arcade Body
        batch.add(prims.box, mats.blackSteel, sx, floorY + 0.42, sz, 0, yaw, 0, 0.86, 0.84, 0.76, { castShadow: true });
        batch.add(prims.box, mats.darkGunmetal, sx - dir * 0.04, floorY + 1.24, sz, 0, yaw, 0, 0.84, 0.92, 0.68, { castShadow: true });
        // Chrome Side Trim Rails + Neon Edge Strips
        const neonTrimMat = slotIdx % 2 === 0 ? mats.neonMagenta : mats.neonGold;
        for (const sideZ of [-0.42, 0.42]) {
          batch.add(prims.box, mats.liquidChrome, sx + dir * 0.24, floorY + 1.05, sz + sideZ, 0, yaw, 0, 0.06, 1.56, 0.08);
          batch.add(prims.box, neonTrimMat, sx + dir * 0.28, floorY + 1.08, sz + sideZ, 0, yaw, 0, 0.04, 1.48, 0.04);
        }

        // Illuminated "DIAMOND 777 JACKPOT" Topper Box + Faceted Crystal Diamond Finial!
        batch.add(prims.box, mats.gold24k, sx - dir * 0.05, floorY + 1.88, sz, 0, yaw, 0, 0.78, 0.36, 0.46);
        batch.add(prims.box, neonTrimMat, sx + dir * 0.19, floorY + 1.88, sz, 0, yaw, 0, 0.68, 0.26, 0.04);
        batch.add(prims.octa, mats.crystalDiamond, sx - dir * 0.05, floorY + 2.22, sz, 0, slotIdx * 0.4, 0, 0.26, 0.34, 0.26);

        // Angled Player Spin Button Console + Chrome Coin Hopper Tray
        batch.add(prims.box, mats.liquidChrome, sx + dir * 0.34, floorY + 0.84, sz, 0.25, yaw, 0, 0.82, 0.08, 0.28);
        batch.add(prims.box, mats.neonCrimson, sx + dir * 0.36, floorY + 0.88, sz + 0.16, 0.25, yaw, 0, 0.12, 0.04, 0.09);
        batch.add(prims.box, mats.neonEmerald, sx + dir * 0.36, floorY + 0.88, sz - 0.04, 0.25, yaw, 0, 0.16, 0.04, 0.09);
        batch.add(prims.box, mats.liquidChrome, sx + dir * 0.35, floorY + 0.28, sz, 0, yaw, 0, 0.62, 0.12, 0.22);
        batch.add(prims.cyl16, mats.gold24k, sx + dir * 0.36, floorY + 0.34, sz, 0, 0, 0, 0.24, 0.03, 0.14);

        // 3 Independently Spinning 3D Emissive Reel Drums inside Cabinet Window!
        const reels = [];
        for (let r = -1; r <= 1; r++) {
          const drum = new THREE.Mesh(
            new THREE.CylinderGeometry(0.165, 0.165, 0.18, 20),
            mats.slotReelDrum
          );
          drum.position.set(sx + dir * 0.19, floorY + 1.26, sz + r * 0.21);
          drum.rotation.x = Math.PI * 0.5; // Cylinder axis along Z so rotation.z spins symbols vertically!
          drum.rotation.z = (slotIdx * 0.9 + r * 1.3) % TAU;
          root.add(drum);
          reels.push(drum);
        }

        // Hinged Mechanical Pull-Arm Lever with Crimson Ball Knob!
        const leverPivot = new THREE.Group();
        leverPivot.position.set(sx + dir * 0.08, floorY + 1.06, sz + dir * 0.46);
        const leverArm = new THREE.Mesh(prims.cyl8, mats.liquidChrome);
        leverArm.position.set(dir * 0.08, 0.22, 0);
        leverArm.rotation.z = -dir * 0.18;
        leverArm.scale.set(0.032, 0.44, 0.032);
        leverPivot.add(leverArm);
        const leverBall = new THREE.Mesh(prims.sphere10, mats.neonCrimson);
        leverBall.position.set(dir * 0.12, 0.44, 0);
        leverBall.scale.setScalar(0.095);
        leverPivot.add(leverBall);
        root.add(leverPivot);

        casinoIntState.slotMachines.push({
          reels,
          leverPivot,
          dir,
          phase: slotIdx * 1.73,
        });

        // Slot Stool in Front of Cabinet
        addCasinoVelvetStool(batch, mats, sx + rowSpec.stoolOffsetX, floorY, sz, mats.purpleVelvet);

        // Shared Floating Neon Header above every alternate machine + Floor Ring per machine
        const ring = createInteractionFloorRing(sx + dir * 1.18, floorY, sz, 0xff4dff, 0.48, 0.68);
        root.add(ring);
        casinoIntState.rings.push(ring);

        let sprite = null;
        if (zi % 2 === 0) {
          sprite = createFloatingStationSprite(
            '🎰 MÁY XÈNG JACKPOT DIAMOND 777',
            '[F] Quay 5 Cuộn • Nổ Hũ Kim Cương!',
            '#ff66ff',
            2.55,
            0.62
          );
          sprite.position.set(sx + dir * 0.2, floorY + 2.75, sz + 2.0);
          root.add(sprite);
        }

        addInteriorAABB(sx - 0.46, sx + 0.46, sz - 0.46, sz + 0.46, 2.3, 0, `casino_${curId}`);
        registerStation({
          type: 'slots',
          id: curId,
          label: `Máy Xèng Jackpot Diamond 777 #${slotIdx}`,
          venue: 'casino',
          minBet: 10,
          maxBet: 5000,
          x: sx,
          y: floorY,
          z: sz,
          ringMesh: ring,
          labelSprite: sprite,
        });

        slotIdx++;
      }
    }

    // ========================================================================
    // STATION 10: `derby` — Khu Cá Cược Đua Siêu Xe / Đua Ngựa Inside Track
    //             at Exact (1192, 0, 1212) with Giant Live Animated LED Screen!
    // ========================================================================
    {
      const dx = 1192.0;
      const dz = 1212.0;

      // Giant Freestanding Brass-Framed LED Derby Race Gantry Screen at (dx, floorY, dz - 2.35)
      const scrZ = dz - 2.35;
      for (const pxOff of [-2.85, 2.85]) {
        batch.add(prims.cyl16, mats.gold24k, dx + pxOff, floorY + 2.1, scrZ, 0, 0, 0, 0.22, 4.2, 0.22, { castShadow: true });
        batch.add(prims.box, mats.blackGoldMarble, dx + pxOff, floorY + 0.18, scrZ, 0, 0, 0, 0.55, 0.36, 0.55);
      }
      batch.add(prims.box, mats.blackSteel, dx, floorY + 2.55, scrZ, 0, 0, 0, 5.95, 2.95, 0.22, { castShadow: true });
      batch.add(prims.box, mats.gold24k, dx, floorY + 4.08, scrZ, 0, 0, 0, 6.15, 0.16, 0.28);
      batch.add(prims.box, mats.gold24k, dx, floorY + 1.04, scrZ, 0, 0, 0, 6.15, 0.14, 0.28);

      const liveScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.65, 2.68), mats.derbyScreenMat);
      liveScreenMesh.position.set(dx, floorY + 2.55, scrZ + 0.125);
      root.add(liveScreenMesh);

      // Tiered Lounge Carpet Step + 6 Personal Betting Console Booths Facing the Giant Screen!
      batch.add(prims.box, mats.blackGoldMarble, dx, floorY + 0.12, dz + 1.35, 0, 0, 0, 5.4, 0.24, 1.85);
      batch.add(prims.box, mats.neonCyan, dx, floorY + 0.24, dz + 0.42, 0, 0, 0, 5.42, 0.04, 0.06);

      const boothRows = [
        { rowZ: dz - 0.15, baseY: floorY },
        { rowZ: dz + 1.45, baseY: floorY + 0.24 },
      ];
      for (let r = 0; r < boothRows.length; r++) {
        const br = boothRows[r];
        for (const colOff of [-1.65, 0, 1.65]) {
          const cx = dx + colOff;
          // Angled Betting Desk + Touch-Screen Odds Terminal
          batch.add(prims.box, mats.mahoganyWood, cx, br.baseY + 0.42, br.rowZ - 0.38, 0, 0, 0, 1.15, 0.78, 0.48);
          batch.add(prims.box, mats.neonCyan, cx, br.baseY + 0.88, br.rowZ - 0.36, -0.45, 0, 0, 0.46, 0.32, 0.04);
          addVIPTuftedArmchair(batch, mats, cx, br.baseY, br.rowZ + 0.28, Math.PI, mats.crimsonVelvet);
        }
      }

      // 2 Seated Cheering Derby Punters watching the Live Race
      for (let pi = 0; pi < 2; pi++) {
        const punter = buildArticulatedVenueNPC(mats, 'high_roller', 380 + pi, {
          female: pi === 1,
          seated: true,
        });
        punter.root.position.set(dx + (pi === 0 ? -1.65 : 1.65), floorY + 0.24, dz + 1.73);
        punter.root.rotation.y = Math.PI;
        root.add(punter.root);
        casinoIntState.npcs.push(punter);
      }

      const ring = createInteractionFloorRing(dx, floorY, dz - 1.15, 0x00bbf9, 0.72, 0.98);
      const sprite = createFloatingStationSprite(
        '🏇 INSIDE TRACK • ĐUA SIÊU TỐC',
        '[F] Chọn Chiến Mã / Siêu Xe Cược Tỷ Lệ 24:1!',
        '#00e5ff',
        3.1,
        0.72
      );
      sprite.position.set(dx, floorY + 4.58, scrZ);
      root.add(ring, sprite);
      casinoIntState.rings.push(ring);

      addInteriorAABB(dx - 3.0, dx + 3.0, scrZ - 0.25, scrZ + 0.25, 4.2, 0, 'casino_derby_screen');
      registerStation({
        type: 'derby',
        id: 'derby_1',
        label: 'Khu Cá Cược Đua Siêu Xe / Đua Ngựa Inside Track',
        venue: 'casino',
        minBet: 50,
        maxBet: 15000,
        x: dx,
        y: floorY,
        z: dz,
        ringMesh: ring,
        labelSprite: sprite,
      });
    }

    // ========================================================================
    // CASINO AMBIENT PATRONS, COCKTAIL WAITRESSES & VAULT SECURITY GUARDS
    // ========================================================================
    const guardsSpecs = [
      { x: 1197.6, z: 1178.4, yaw: 0.15 },
      { x: 1202.4, z: 1178.4, yaw: -0.15 },
      { x: 1204.2, z: 1220.6, yaw: -0.65 },
    ];
    for (let gi = 0; gi < guardsSpecs.length; gi++) {
      const gs = guardsSpecs[gi];
      const guard = buildArticulatedVenueNPC(mats, 'security_guard', 390 + gi, { female: false });
      guard.root.position.set(gs.x, floorY, gs.z);
      guard.root.rotation.y = gs.yaw;
      root.add(guard.root);
      casinoIntState.npcs.push(guard);
    }

    // 2 Strolling Cocktail Waitresses & 2 Strolling High-Roller VIPs along Promenades
    const strollSpecs = [
      { role: 'waitress', female: true, p0: { x: 1195.8, z: 1216.0 }, p1: { x: 1195.8, z: 1192.0 } },
      { role: 'waitress', female: true, p0: { x: 1204.6, z: 1191.0 }, p1: { x: 1204.6, z: 1215.0 } },
      { role: 'high_roller', female: false, p0: { x: 1188.0, z: 1216.5 }, p1: { x: 1211.0, z: 1216.5 } },
      { role: 'high_roller', female: true, p0: { x: 1209.5, z: 1204.0 }, p1: { x: 1209.5, z: 1188.0 } },
    ];
    for (let si = 0; si < strollSpecs.length; si++) {
      const sp = strollSpecs[si];
      const npc = buildArticulatedVenueNPC(mats, sp.role, 395 + si, {
        female: sp.female,
        patrolPath: [sp.p0, sp.p1],
      });
      npc.root.position.set(sp.p0.x, floorY, sp.p0.z);
      root.add(npc.root);
      casinoIntState.npcs.push(npc);
    }

    batch.flush(root);
  }

  // --------------------------------------------------------------------------
  // 14. NIGHTCLUB & COCKTAIL BAR INTERIOR PART A:
  //     SHELL, CONCERT TRUSS GRID, BEAT-SYNCED LED DANCEFLOOR (1500, 0.03, 1498),
  //     ELEVATED 3D DJ BOOTH (1500, 0.8, 1487), SUBWOOFERS & SWEEPING 3D LASERS
  // --------------------------------------------------------------------------
  function buildNightclubInteriorShellAndDJ(mats, clubIntState) {
    const root = new THREE.Group();
    root.name = 'ClubEclipseInterior';
    root.visible = false; // Visible only when player is inside Túy Tiên Lâu (zero outdoor GPU cost!)

    const batch = createBatchBuilder(root);
    const cx = CLUB_INT.cx; // 1500
    const cz = CLUB_INT.cz; // 1500
    const W = CLUB_INT.width; // 38
    const D = CLUB_INT.depth; // 34
    const H = CLUB_INT.height; // 8.5
    const minX = CLUB_INT.minX; // 1481
    const maxX = CLUB_INT.maxX; // 1519
    const minZ = CLUB_INT.minZ; // 1483
    const maxZ = CLUB_INT.maxZ; // 1517
    const floorY = CLUB_INT.floorY; // 0.02

    // 14.1 Reflective Obsidian Club Floor, Dark Acoustic Slate Walls & Ceiling Slab
    batch.add(prims.box, mats.obsidianFloor, cx, floorY - 0.15, cz, 0, 0, 0, W + 0.8, 0.30, D + 0.8, { receiveShadow: true });
    batch.add(prims.box, mats.blackSteel, cx, H + 0.18, cz, 0, 0, 0, W + 1.0, 0.36, D + 1.0);

    batch.add(prims.box, mats.clubSlateWall, cx, H * 0.5, minZ - 0.28, 0, 0, 0, W + 1.0, H + 0.4, 0.56);
    batch.add(prims.box, mats.clubSlateWall, cx, H * 0.5, maxZ + 0.28, 0, 0, 0, W + 1.0, H + 0.4, 0.56);
    batch.add(prims.box, mats.clubSlateWall, minX - 0.28, H * 0.5, cz, 0, 0, 0, 0.56, H + 0.4, D + 1.0);
    batch.add(prims.box, mats.clubSlateWall, maxX + 0.28, H * 0.5, cz, 0, 0, 0, 0.56, H + 0.4, D + 1.0);

    // Interior Wall & Ceiling Collision AABBs (keeps player AND camera cleanly inside Club!)
    addInteriorAABB(minX - 1.2, minX + 0.15, minZ - 1.0, maxZ + 1.0, H + 2.0, -1.0, 'club_wall_w');
    addInteriorAABB(maxX - 0.15, maxX + 1.2, minZ - 1.0, maxZ + 1.0, H + 2.0, -1.0, 'club_wall_e');
    addInteriorAABB(minX - 1.0, maxX + 1.0, minZ - 1.2, minZ + 0.15, H + 2.0, -1.0, 'club_wall_n');
    addInteriorAABB(minX - 1.0, maxX + 1.0, maxZ - 0.15, maxZ + 1.2, H + 2.0, -1.0, 'club_wall_s');
    addInteriorAABB(minX - 1.0, maxX + 1.0, minZ - 1.0, maxZ + 1.0, H + 2.2, H - 0.15, 'club_ceiling');

    // Acoustic Pyramid Charcoal Panels + Vertical Pulsing Neon Light Tubes Around Club Perimeter
    for (let wz = minZ + 3.0; wz <= maxZ - 3.0; wz += 4.2) {
      for (const side of [-1, 1]) {
        const wx = side < 0 ? minX + 0.12 : maxX - 0.12;
        batch.add(prims.box, mats.darkGunmetal, wx, 4.1, wz, 0, 0, 0, 0.12, 5.6, 2.8);
        const tubeMat = Math.round(wz) % 2 === 0 ? mats.neonMagenta : mats.neonCyan;
        batch.add(prims.box, tubeMat, wx + (side < 0 ? 0.08 : -0.08), 4.1, wz + 1.55, 0, 0, 0, 0.06, 5.4, 0.08);
      }
    }

    // Perimeter Baseboard LED Floor Strips
    batch.add(prims.box, mats.neonMagenta, cx, floorY + 0.04, minZ + 0.08, 0, 0, 0, W - 0.4, 0.06, 0.08);
    batch.add(prims.box, mats.neonCyan, cx, floorY + 0.04, maxZ - 0.08, 0, 0, 0, W - 0.4, 0.06, 0.08);
    batch.add(prims.box, mats.neonPurple, minX + 0.08, floorY + 0.04, cz, 0, 0, 0, 0.08, 0.06, D - 0.4);
    batch.add(prims.box, mats.neonPurple, maxX - 0.08, floorY + 0.04, cz, 0, 0, 0, 0.08, 0.06, D - 0.4);

    // 14.2 Overhead Black-Steel Concert Box-Truss Grid (y = 7.15m) + Industrial HVAC Ducts
    const trussY = 7.15;
    const trussXLines = [1493.2, 1500.0, 1506.8];
    const trussZLines = [1488.5, 1494.5, 1501.5, 1507.5];

    for (const tx of trussXLines) {
      batch.add(prims.box, mats.darkGunmetal, tx - 0.18, trussY + 0.18, 1498.0, 0, 0, 0, 0.06, 0.06, 24.0);
      batch.add(prims.box, mats.darkGunmetal, tx + 0.18, trussY + 0.18, 1498.0, 0, 0, 0, 0.06, 0.06, 24.0);
      batch.add(prims.box, mats.darkGunmetal, tx - 0.18, trussY - 0.18, 1498.0, 0, 0, 0, 0.06, 0.06, 24.0);
      batch.add(prims.box, mats.darkGunmetal, tx + 0.18, trussY - 0.18, 1498.0, 0, 0, 0, 0.06, 0.06, 24.0);
      for (let bz = 1487; bz <= 1509; bz += 1.6) {
        batch.add(prims.box, mats.darkGunmetal, tx, trussY, bz, 0.65, 0, 0, 0.36, 0.04, 0.48);
      }
    }
    for (const tz of trussZLines) {
      batch.add(prims.box, mats.darkGunmetal, 1500.0, trussY + 0.18, tz, 0, 0, 0, 18.5, 0.06, 0.36);
      batch.add(prims.box, mats.darkGunmetal, 1500.0, trussY - 0.18, tz, 0, 0, 0, 18.5, 0.06, 0.36);
    }
    // 4 Corner Truss Vertical Support Towers outside Dancefloor Corners
    const trussPillarCoords = [
      [1493.2, 1491.6], [1506.8, 1491.6],
      [1493.2, 1504.4], [1506.8, 1504.4],
    ];
    for (const [px, pz] of trussPillarCoords) {
      batch.add(prims.box, mats.darkGunmetal, px, 3.65, pz, 0, 0, 0, 0.42, 7.25, 0.42, { castShadow: true });
      batch.add(prims.box, mats.neonCyan, px, 3.65, pz + (pz < 1498 ? 0.23 : -0.23), 0, 0, 0, 0.08, 6.6, 0.05);
      addInteriorAABB(px - 0.28, px + 0.28, pz - 0.28, pz + 0.28, 7.4, 0, 'club_truss_pillar');
    }

    // Club Dynamic PointLights + Ambient Purple Haze Light
    const clubAmb = new THREE.AmbientLight(0x3a245e, 0.62);
    root.add(clubAmb);
    const mainClubLight = new THREE.PointLight(0xff1ea8, 2.2, 30, 1.4);
    mainClubLight.position.set(1500.0, 6.6, 1498.0);
    const barClubLight = new THREE.PointLight(0x00f0ff, 1.5, 20, 1.5);
    barClubLight.position.set(1486.8, 4.5, 1498.0);
    const poolClubLight = new THREE.PointLight(0xffe099, 1.35, 16, 1.5);
    poolClubLight.position.set(1513.0, 3.4, 1504.0);
    root.add(mainClubLight, barClubLight, poolClubLight);
    clubIntState.mainClubLight = mainClubLight;
    clubIntState.barClubLight = barClubLight;

    // 14.3 Beat-Synced Multi-Color LED Dancefloor Grid at Exact (1500, 0.03, 1498)!
    const dfX = CLUB_INT.dancefloor.x; // 1500
    const dfZ = CLUB_INT.dancefloor.z; // 1498
    const dfSize = 10.8;

    const ledFloorMesh = new THREE.Mesh(new THREE.PlaneGeometry(dfSize, dfSize), mats.beatDancefloor);
    ledFloorMesh.rotation.x = -Math.PI * 0.5;
    ledFloorMesh.position.set(dfX, CLUB_INT.dancefloor.y + 0.012, dfZ);
    root.add(ledFloorMesh);

    // Brushed Chrome Bevel Frame around the 10.8m x 10.8m Dancefloor
    batch.add(prims.box, mats.liquidChrome, dfX, floorY + 0.018, dfZ - dfSize * 0.5 - 0.12, 0, 0, 0, dfSize + 0.48, 0.036, 0.24);
    batch.add(prims.box, mats.liquidChrome, dfX, floorY + 0.018, dfZ + dfSize * 0.5 + 0.12, 0, 0, 0, dfSize + 0.48, 0.036, 0.24);
    batch.add(prims.box, mats.liquidChrome, dfX - dfSize * 0.5 - 0.12, floorY + 0.018, dfZ, 0, 0, 0, 0.24, 0.036, dfSize);
    batch.add(prims.box, mats.liquidChrome, dfX + dfSize * 0.5 + 0.12, floorY + 0.018, dfZ, 0, 0, 0, 0.24, 0.036, dfSize);

    // Dancefloor Rhythm Minigame Trigger Ring + Floating Label (`station: 'dancefloor'`)
    const dfRing = createInteractionFloorRing(dfX, floorY + 0.02, dfZ + 3.4, 0xff1ea8, 0.85, 1.16);
    const dfSprite = createFloatingStationSprite(
      '💃 SÀN NHẢY EDM BEAT-SYNC',
      '[F] Nhảy Theo Nhịp Điệu Neon • Nhận Thưởng & Độ Sung!',
      '#ff4dd2',
      3.15,
      0.72
    );
    dfSprite.position.set(dfX, 3.65, dfZ);
    root.add(dfRing, dfSprite);
    clubIntState.rings.push(dfRing);

    registerStation({
      type: 'dancefloor',
      station: 'dancefloor',
      id: 'dancefloor_main',
      label: 'Sàn Nhảy EDM Neon Beat-Sync',
      venue: 'nightclub',
      minBet: 0,
      maxBet: 0,
      x: dfX,
      y: CLUB_INT.dancefloor.y,
      z: dfZ,
      areaHalfW: 4.8,
      areaHalfD: 4.8,
      priority: 0, // Specific peripheral stations win if equidistant
      ringMesh: dfRing,
      labelSprite: dfSprite,
    });

    // 14.4 Elevated 3D DJ Booth at Exact (1500, 0.8, 1487), Turntables, Giant Subwoofers & DJ!
    const djX = CLUB_INT.djBooth.x; // 1500
    const djY = CLUB_INT.djBooth.y; // 0.80
    const djZ = CLUB_INT.djBooth.z; // 1487

    // Raised 0.80m Obsidian & Neon Stage Platform (X in [1493.6, 1506.4], Z in [1483.6, 1490.2])
    batch.add(prims.box, mats.blackGoldMarble, djX, djY * 0.5, 1486.9, 0, 0, 0, 12.8, djY, 6.6, { receiveShadow: true });
    batch.add(prims.box, mats.neonCyan, djX, djY - 0.05, 1490.22, 0, 0, 0, 12.84, 0.08, 0.08);
    batch.add(prims.box, mats.neonMagenta, djX, 0.14, 1490.22, 0, 0, 0, 12.84, 0.08, 0.08);

    // Twin Walkable Neon Stage Steps on Left (1494.6) & Right (1505.4) Front of DJ Stage!
    for (const stepX of [1494.8, 1505.2]) {
      for (let st = 0; st < 4; st++) {
        const sh = ((st + 1) / 4) * djY;
        const sz = 1491.35 - st * 0.34;
        batch.add(prims.box, mats.darkGunmetal, stepX, sh * 0.5, sz, 0, 0, 0, 1.85, sh, 0.34);
        batch.add(prims.box, mats.neonCyan, stepX, sh + 0.005, sz + 0.15, 0, 0, 0, 1.86, 0.025, 0.04);
      }
    }

    // Angular Cyber-Prism DJ Console Front Desk at (1500, djY, 1488.2)
    batch.add(prims.box, mats.blackSteel, djX, djY + 0.54, 1488.2, 0, 0, 0, 3.85, 1.08, 0.95, { castShadow: true });
    batch.add(prims.box, mats.liquidChrome, djX, djY + 1.10, 1488.2, 0, 0, 0, 3.98, 0.06, 1.06);
    // Front Equalizer Faceplate on DJ Desk
    const deskFrontEQ = new THREE.Mesh(new THREE.PlaneGeometry(3.55, 0.86), mats.eqWall);
    deskFrontEQ.position.set(djX, djY + 0.54, 1488.70);
    root.add(deskFrontEQ);

    // Sculpted Twin Pioneer CDJ-3000 Turntables + 4-Channel DJM Mixer + Laptop + Studio Monitors!
    clubIntState.djPlatters = [];
    for (const deckOffX of [-0.68, 0.68]) {
      const kx = djX + deckOffX;
      const kz = 1488.18;
      // CDJ Deck Housing + Tilted Waveform Screen
      batch.add(prims.box, mats.darkGunmetal, kx, djY + 1.16, kz, 0, 0, 0, 0.48, 0.06, 0.56);
      batch.add(prims.box, mats.neonCyan, kx, djY + 1.24, kz + 0.18, 0.45, 0, 0, 0.34, 0.14, 0.03);

      // Spinning Illuminated Jog Wheel Platter
      const platter = new THREE.Mesh(prims.cyl24, mats.obsidianFloor);
      platter.position.set(kx, djY + 1.20, kz - 0.04);
      platter.scale.set(0.28, 0.025, 0.28);
      const platterRing = new THREE.Mesh(prims.torus16, deckOffX < 0 ? mats.neonMagenta : mats.neonCyan);
      platterRing.rotation.x = Math.PI * 0.5;
      platterRing.scale.set(1.05, 1.05, 0.8);
      platter.add(platterRing);
      root.add(platter);
      clubIntState.djPlatters.push(platter);
    }

    // Center 4-Channel DJ Mixer + Crossfader + EQ Knobs
    batch.add(prims.box, mats.blackSteel, djX, djY + 1.16, 1488.18, 0, 0, 0, 0.54, 0.065, 0.56);
    for (let ch = -1.5; ch <= 1.5; ch += 1.0) {
      batch.add(prims.box, mats.neonEmerald, djX + ch * 0.10, djY + 1.20, 1488.24, 0, 0, 0, 0.03, 0.015, 0.16);
      for (let kn = 0; kn < 3; kn++) {
        batch.add(prims.cyl8, mats.liquidChrome, djX + ch * 0.10, djY + 1.21, 1488.02 + kn * 0.06, 0, 0, 0, 0.028, 0.03, 0.028);
      }
    }

    // Elevated Glowing DJ Laptop on Angled Stand
    batch.add(prims.cyl8, mats.liquidChrome, djX - 1.28, djY + 1.26, 1488.32, 0, 0, 0, 0.04, 0.28, 0.04);
    batch.add(prims.box, mats.darkGunmetal, djX - 1.28, djY + 1.40, 1488.28, 0.22, -0.35, 0, 0.42, 0.02, 0.30);
    batch.add(prims.box, mats.neonMagenta, djX - 1.26, djY + 1.54, 1488.38, -0.95, -0.35, 0, 0.40, 0.02, 0.28);

    // Animated DJ Artist NPC behind Console!
    const djNPC = buildArticulatedVenueNPC(mats, 'dj_artist', 501, { female: false });
    djNPC.root.position.set(djX, djY, 1487.35);
    djNPC.root.rotation.y = 0; // Facing +Z out over the LED Dancefloor!
    root.add(djNPC.root);
    clubIntState.npcs.push(djNPC);
    addInteriorAABB(djX - 2.0, djX + 2.0, 1487.65, 1488.75, djY + 1.35, djY, 'club_dj_desk');

    // Giant 11.2m x 4.2m Animated 28-Band Equalizer LED Wall Behind DJ Booth!
    const backdropWall = new THREE.Mesh(new THREE.PlaneGeometry(11.2, 4.2), mats.eqWall);
    backdropWall.position.set(djX, djY + 2.65, 1483.42);
    root.add(backdropWall);

    const djSignTex = createSignBannerTexture(
      '⚡ ECLIPSE SOUND SYSTEM • 128 BPM ⚡',
      'LIVE DJ SET • DEEP HOUSE • TECHNO • CYBER RAVE',
      { bg: 'rgba(10, 6, 24, 0.88)', border: '#00f0ff', titleColor: '#ffffff', subColor: '#ff1ea8' }
    );
    const djHeaderBanner = new THREE.Mesh(
      new THREE.PlaneGeometry(6.8, 1.25),
      new THREE.MeshBasicMaterial({ map: djSignTex, transparent: true })
    );
    djHeaderBanner.position.set(djX, djY + 5.35, 1483.55);
    root.add(djHeaderBanner);

    // 14.5 Giant Twin Subwoofer & Line-Array Speaker Towers with 12 Throbbing Woofer Cones!
    clubIntState.wooferCones = [];
    for (const side of [-1, 1]) {
      const spkX = djX + side * 4.85;
      const spkZ = 1486.8;
      // Lower Triple-Subwoofer Bass Bin Stack
      batch.add(prims.box, mats.blackSteel, spkX, djY + 1.35, spkZ, 0, -side * 0.22, 0, 1.95, 2.70, 1.35, { castShadow: true });
      batch.add(prims.box, side < 0 ? mats.neonCyan : mats.neonMagenta, spkX, djY + 2.74, spkZ, 0, -side * 0.22, 0, 2.02, 0.06, 1.40);
      // Upper Curved Line-Array Horn Stack
      for (let la = 0; la < 4; la++) {
        batch.add(
          prims.box,
          mats.darkGunmetal,
          spkX,
          djY + 3.05 + la * 0.36,
          spkZ + la * 0.05,
          0.08 * la,
          -side * 0.22,
          0,
          1.45,
          0.31,
          0.85
        );
      }

      // 6 Physically Throbbing Woofer Cones per Speaker Tower (2x3 Grid)!
      const yaw = -side * 0.22;
      const fwdX = Math.sin(yaw);
      const fwdZ = Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);

      for (let row = 0; row < 3; row++) {
        for (let col of [-0.46, 0.46]) {
          const wy = djY + 0.52 + row * 0.84;
          const wx = spkX + rightX * col + fwdX * 0.68;
          const wz = spkZ + rightZ * col + fwdZ * 0.68;

          batch.add(prims.torus16, mats.liquidChrome, wx, wy, wz, 0, yaw, 0, 0.72, 0.72, 0.75);

          const cone = new THREE.Mesh(prims.cone16, mats.darkGunmetal);
          cone.position.set(wx, wy, wz);
          cone.rotation.set(-Math.PI * 0.5, yaw, 0, 'YXZ');
          cone.scale.set(0.64, 0.16, 0.64);

          const dustCap = new THREE.Mesh(prims.sphere10, side < 0 ? mats.neonCyan : mats.neonMagenta);
          dustCap.position.set(0, 0.06, 0);
          dustCap.scale.setScalar(0.28);
          cone.add(dustCap);

          root.add(cone);
          clubIntState.wooferCones.push({
            mesh: cone,
            baseX: wx,
            baseZ: wz,
            fwdX,
            fwdZ,
          });
        }
      }

      addInteriorAABB(spkX - 1.1, spkX + 1.1, spkZ - 0.85, spkZ + 0.85, djY + 4.4, djY, 'club_subwoofer_stack');
    }

    // 14.6 8 Sweeping Translucent 3D Laser Cones & 6 Articulated Moving-Head Beam Spotlights!
    clubIntState.laserRigs = [];
    const laserMaterials = [mats.laserCyan, mats.laserMagenta, mats.laserViolet, mats.laserLime];
    const laserAnchors = [
      { x: 1495.0, y: 7.02, z: 1488.5, matIdx: 0, basePitch: 0.58, speed: 1.45, phase: 0.0 },
      { x: 1498.2, y: 7.02, z: 1488.5, matIdx: 1, basePitch: 0.62, speed: -1.65, phase: 1.1 },
      { x: 1501.8, y: 7.02, z: 1488.5, matIdx: 0, basePitch: 0.62, speed: 1.65, phase: 2.2 },
      { x: 1505.0, y: 7.02, z: 1488.5, matIdx: 3, basePitch: 0.58, speed: -1.45, phase: 3.3 },
      { x: 1493.4, y: 7.02, z: 1494.5, matIdx: 2, basePitch: 0.42, speed: 1.20, phase: 0.8 },
      { x: 1506.6, y: 7.02, z: 1494.5, matIdx: 1, basePitch: 0.42, speed: -1.20, phase: 2.5 },
      { x: 1493.4, y: 7.02, z: 1501.5, matIdx: 3, basePitch: -0.38, speed: -1.35, phase: 1.7 },
      { x: 1506.6, y: 7.02, z: 1501.5, matIdx: 0, basePitch: -0.38, speed: 1.35, phase: 4.1 },
    ];

    for (let li = 0; li < laserAnchors.length; li++) {
      const la = laserAnchors[li];
      // Moving-Head Yoke Housing attached to Truss
      batch.add(prims.box, mats.blackSteel, la.x, la.y + 0.10, la.z, 0, 0, 0, 0.34, 0.16, 0.34);

      const pivot = new THREE.Group();
      pivot.position.set(la.x, la.y, la.z);

      const headCan = new THREE.Mesh(prims.cyl16, mats.darkGunmetal);
      headCan.position.y = -0.16;
      headCan.scale.set(0.22, 0.32, 0.22);
      pivot.add(headCan);

      const lensGlow = new THREE.Mesh(prims.circle24, laserMaterials[la.matIdx]);
      lensGlow.rotation.x = Math.PI * 0.5;
      lensGlow.position.y = -0.33;
      lensGlow.scale.setScalar(0.20);
      pivot.add(lensGlow);

      // Keep Túy Tiên Lâu lighting simple and clean (hide harsh sweeping laser cones)
      const coneGeo = new THREE.ConeGeometry(2.35, 8.2, 20, 1, true);
      coneGeo.translate(0, -4.1, 0);
      const laserCone = new THREE.Mesh(coneGeo, laserMaterials[la.matIdx]);
      laserCone.visible = false;
      pivot.add(laserCone);

      root.add(pivot);
      clubIntState.laserRigs.push({
        pivot,
        basePitch: la.basePitch,
        speed: la.speed,
        phase: la.phase,
      });
    }

    // 14.7 South Club Exit Portal & Acoustic Vestibule Doors at Exact (1500, 0.05, 1515.5)!
    const exitDoorZ = maxZ - 0.18;
    batch.add(prims.box, mats.liquidChrome, cx, 2.05, exitDoorZ, 0, 0, 0, 4.4, 4.1, 0.28);
    batch.add(prims.box, mats.blackLeather, cx - 0.98, 1.92, exitDoorZ - 0.06, 0, 0, 0, 1.75, 3.65, 0.14);
    batch.add(prims.box, mats.blackLeather, cx + 0.98, 1.92, exitDoorZ - 0.06, 0, 0, 0, 1.75, 3.65, 0.14);
    batch.add(prims.box, mats.neonCyan, cx - 0.15, 1.85, exitDoorZ - 0.15, 0, 0, 0, 0.06, 1.35, 0.06);
    batch.add(prims.box, mats.neonMagenta, cx + 0.15, 1.85, exitDoorZ - 0.15, 0, 0, 0, 0.06, 1.35, 0.06);

    const clubExitPortal = createInteractionFloorRing(
      CLUB_INT.exitRing.x,
      floorY,
      CLUB_INT.exitRing.z,
      0x00f0ff,
      0.88,
      1.22
    );
    const clubExitLabel = createFloatingStationSprite(
      '🚪 LỐI RA ĐẠI LỘ BIỂN COASTAL',
      'NHẤN [F] RỜI CLUB ECLIPSE RA NGOÀI',
      '#00f0ff',
      2.85,
      0.70
    );
    clubExitLabel.position.set(0, 2.4, 0);
    clubExitPortal.add(clubExitLabel);
    root.add(clubExitPortal);
    clubIntState.exitPortal = clubExitPortal;

    batch.flush(root);
    return root;
  }

  // --------------------------------------------------------------------------
  // 15. NIGHTCLUB & COCKTAIL BAR INTERIOR PART B:
  //     72-BOTTLE ILLUMINATED COCKTAIL BAR (1485, 0, 1498),
  //     8-BALL POOL TABLE (1513, 0, 1504), ELECTRONIC DARTS (1515, 0, 1495),
  //     VIP CHAMPAGNE BOOTHS, SAFE DESK & 18 DANCING CLUB NPCS
  // --------------------------------------------------------------------------
  const LIQUOR_GLASS_COLORS = [
    new THREE.Color(0x00e5ff), // Electric Blue Curacao / Gin
    new THREE.Color(0xff9f1c), // Aged Bourbon / Añejo Tequila
    new THREE.Color(0x2ec4b6), // Emerald Absinthe / Midori
    new THREE.Color(0xff1ea8), // Ruby Neon Cyber Liqueur
    new THREE.Color(0x9b5de5), // Ultraviolet Macbeth Elixir
    new THREE.Color(0xffd54f), // Blêuter'd 24K Gold Champagne
    new THREE.Color(0xe8f7ff), // Crystal Russian Vodka
  ];

  const POOL_BALL_COLORS = [
    0xf7b801, 0x1d4ed8, 0xd90429, 0x7209b7, 0xfb5607,
    0x15803d, 0x7f1d1d, 0x111318, 0xfacc15, 0x3b82f6,
    0xef4444, 0x9333ea, 0xf97316, 0x22c55e, 0x991b1b,
  ];
  const colCueWood = new THREE.Color(0xc9965b);
  const colCueButt = new THREE.Color(0x2b1912);

  function addSculptedLiquorBottle(batch, mats, x, y, z, colorIdx = 0, scale = 1.0) {
    const col = LIQUOR_GLASS_COLORS[colorIdx % LIQUOR_GLASS_COLORS.length];
    const isChampagne = colorIdx % 7 === 5;
    const bw = (isChampagne ? 0.095 : 0.078) * scale;
    const bh = (isChampagne ? 0.22 : 0.19) * scale;

    // Glowing Translucent Bottle Body + Tapered Shoulder + Neck + Foil Cap
    batch.add(prims.cyl8, mats.vertexGlow, x, y + bh * 0.5, z, 0, 0, 0, bw, bh, bw, { color: col });
    batch.add(prims.cone8, mats.vertexGlow, x, y + bh + 0.035 * scale, z, 0, 0, 0, bw * 0.96, 0.07 * scale, bw * 0.96, { color: col });
    batch.add(prims.cyl8, mats.vertexGlow, x, y + bh + 0.09 * scale, z, 0, 0, 0, 0.028 * scale, 0.08 * scale, 0.028 * scale, { color: col });
    batch.add(prims.cyl8, mats.gold24k, x, y + bh + 0.135 * scale, z, 0, 0, 0, 0.031 * scale, 0.028 * scale, 0.031 * scale);
  }

  function addCocktailGlassOnBar(batch, mats, x, y, z, styleIdx = 0) {
    const drinkCol = LIQUOR_GLASS_COLORS[styleIdx % LIQUOR_GLASS_COLORS.length];
    if (styleIdx % 2 === 0) {
      // V-Shaped Neon Martini Glass
      batch.add(prims.cyl8, mats.crystalDiamond, x, y + 0.008, z, 0, 0, 0, 0.065, 0.012, 0.065);
      batch.add(prims.cyl8, mats.crystalDiamond, x, y + 0.055, z, 0, 0, 0, 0.012, 0.085, 0.012);
      batch.add(prims.cone8, mats.vertexGlow, x, y + 0.125, z, Math.PI, 0, 0, 0.105, 0.075, 0.105, { color: drinkCol });
    } else {
      // Heavy Highball / Rocks Tumbler
      batch.add(prims.cyl8, mats.crystalDiamond, x, y + 0.055, z, 0, 0, 0, 0.068, 0.11, 0.068);
      batch.add(prims.cyl8, mats.vertexGlow, x, y + 0.048, z, 0, 0, 0, 0.058, 0.08, 0.058, { color: drinkCol });
    }
  }

  function buildNightclubStationsAndDancers(root, mats, clubIntState) {
    const batch = createBatchBuilder(root);
    const floorY = CLUB_INT.floorY; // 0.02

    // ========================================================================
    // CLUB STATION 1: `bar_counter` — Illuminated Cocktail Bar at (1485, 0, 1498)
    //                 With 72+ Glowing 3D Liquor Bottles & Animated Bartender!
    // ========================================================================
    {
      const bx = CLUB_INT.barCounter.x; // 1485.0
      const bz = CLUB_INT.barCounter.z; // 1498.0
      const barLen = 12.2; // Z in [1491.9, 1504.1]

      // Front Backlit Onyx & Neon Bar Counter (X = 1485.3, facing East +X toward Dancefloor)
      batch.add(prims.box, mats.blackGoldMarble, bx + 0.32, floorY + 0.56, bz, 0, 0, 0, 1.05, 1.12, barLen, { castShadow: true });
      batch.add(prims.box, mats.obsidianFloor, bx + 0.36, floorY + 1.15, bz, 0, 0, 0, 1.24, 0.08, barLen + 0.24);
      // North & South Return Ends
      batch.add(prims.box, mats.blackGoldMarble, bx - 0.72, floorY + 0.56, bz - barLen * 0.5, 0, 0, 0, 2.2, 1.12, 0.65);
      batch.add(prims.box, mats.blackGoldMarble, bx - 0.72, floorY + 0.56, bz + barLen * 0.5, 0, 0, 0, 2.2, 1.12, 0.65);

      // Glowing Front Under-Counter Neon Panels + Polished Brass Foot-Rail
      batch.add(prims.box, mats.neonCyan, bx + 0.86, floorY + 1.06, bz, 0, 0, 0, 0.05, 0.06, barLen);
      batch.add(prims.box, mats.neonMagenta, bx + 0.86, floorY + 0.12, bz, 0, 0, 0, 0.05, 0.06, barLen);
      batch.add(prims.cyl8, mats.gold24k, bx + 1.02, floorY + 0.22, bz, Math.PI * 0.5, 0, 0, 0.055, barLen - 0.4, 0.055);

      // 8 Chrome & Neon Swivel Barstools along Front of Cocktail Counter
      for (let st = 0; st < 8; st++) {
        const sz = bz - 4.9 + st * 1.4;
        addCasinoVelvetStool(batch, mats, bx + 1.42, floorY, sz, st % 2 === 0 ? mats.purpleVelvet : mats.crimsonVelvet);
      }

      // Twin Chrome Draft-Beer Tap Towers ("Pißwasser") + Ice Well + 12 Served Cocktails on Bar Top
      for (const tapZ of [bz - 2.4, bz + 2.4]) {
        batch.add(prims.cyl16, mats.liquidChrome, bx + 0.28, floorY + 1.38, tapZ, 0, 0, 0, 0.14, 0.38, 0.14);
        batch.add(prims.box, mats.liquidChrome, bx + 0.36, floorY + 1.54, tapZ, 0, 0, 0, 0.16, 0.06, 0.36);
        for (const hOff of [-0.12, 0, 0.12]) {
          batch.add(prims.cyl8, mats.gold24k, bx + 0.44, floorY + 1.62, tapZ + hOff, 0, 0, -0.35, 0.025, 0.14, 0.025);
        }
      }
      for (let cg = 0; cg < 12; cg++) {
        addCocktailGlassOnBar(batch, mats, bx + 0.52, floorY + 1.19, bz - 4.8 + cg * 0.88, cg);
      }

      // Overhead Suspended Chrome Glass-Rack Canopy above Bar
      batch.add(prims.box, mats.darkGunmetal, bx + 0.28, floorY + 3.05, bz, 0, 0, 0, 1.05, 0.12, barLen - 0.8);
      batch.add(prims.box, mats.neonMagenta, bx + 0.82, floorY + 3.05, bz, 0, 0, 0, 0.05, 0.06, barLen - 0.8);
      for (const hangZ of [bz - 4.5, bz - 1.5, bz + 1.5, bz + 4.5]) {
        batch.add(prims.cyl8, mats.liquidChrome, bx + 0.28, floorY + 5.1, hangZ, 0, 0, 0, 0.045, 4.1, 0.045);
      }

      // 4-Tier Illuminated Backbar Glass Display Wall Holding 72 Glowing 3D Liquor Bottles!
      const rackX = 1481.55; // Flush against West Club Wall behind Bartender!
      batch.add(prims.box, mats.blackSteel, rackX - 0.18, floorY + 2.15, bz, 0, 0, 0, 0.55, 4.1, 11.4);
      let bottleCounter = 0;
      for (let tier = 0; tier < 4; tier++) {
        const shelfY = floorY + 0.98 + tier * 0.68;
        // Frosted Backlit Neon Shelf Strip
        batch.add(prims.box, tier % 2 === 0 ? mats.neonCyan : mats.neonMagenta, rackX + 0.06, shelfY, bz, 0, 0, 0, 0.44, 0.045, 10.8);

        // 18 Sculpted 3D Bottles per Tier x 4 Tiers = 72 Glowing 3D Liquor Bottles!
        for (let bi = 0; bi < 18; bi++) {
          const bottleZ = bz - 4.95 + bi * 0.58;
          addSculptedLiquorBottle(
            batch,
            mats,
            rackX + 0.10,
            shelfY + 0.025,
            bottleZ,
            bottleCounter,
            0.95 + (bottleCounter % 3) * 0.10
          );
          bottleCounter++;
        }
      }

      // Neon Cocktail Menu Sign above Backbar
      const barMenuTex = createSignBannerTexture(
        '🍹 QUẦY COCKTAIL NEON • RƯỢU THƯỢNG HẠNG',
        'PIßWASSER $15 • NEON CYBER $120 • MACBETH $350 • SÂM PANH VIP $5K',
        { bg: '#0c051c', border: '#00f0ff', titleColor: '#ffffff', subColor: '#ff4dd2' }
      );
      const barMenuMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(8.2, 1.35),
        new THREE.MeshBasicMaterial({ map: barMenuTex })
      );
      barMenuMesh.position.set(rackX + 0.16, floorY + 4.35, bz);
      barMenuMesh.rotation.y = Math.PI * 0.5;
      root.add(barMenuMesh);

      // Animated Bartender NPC Mixing Cocktails Behind Counter!
      const bartender = buildArticulatedVenueNPC(mats, 'bartender', 510, { female: false });
      bartender.root.position.set(bx - 0.85, floorY, bz);
      bartender.root.rotation.y = Math.PI * 0.5;
      root.add(bartender.root);
      clubIntState.npcs.push(bartender);

      const barRing = createInteractionFloorRing(bx + 1.95, floorY, bz, 0x00f0ff, 0.72, 0.98);
      const barSprite = createFloatingStationSprite(
        '🍸 QUẦY BAR COCKTAIL & SHOT MACBETH',
        '[F] Gọi Đồ Uống • Hồi Máu • Hiệu Ứng Say Xỉn & Sâm Panh VIP!',
        '#00f0ff',
        3.25,
        0.74
      );
      barSprite.position.set(bx + 0.45, floorY + 2.48, bz);
      root.add(barRing, barSprite);
      clubIntState.rings.push(barRing);

      addInteriorAABB(1481.2, bx + 0.90, bz - barLen * 0.5 - 0.2, bz + barLen * 0.5 + 0.2, 2.2, 0, 'club_bar_counter');
      registerStation({
        type: 'bar_counter',
        station: 'bar_counter',
        id: 'bar_counter_main',
        label: 'Quầy Cocktail Neon & Rượu Thượng Hạng',
        venue: 'nightclub',
        minBet: 15,
        maxBet: 5000,
        x: bx,
        y: floorY,
        z: bz,
        segAx: bx + 1.35,
        segAz: bz - 5.2,
        segBx: bx + 1.35,
        segBz: bz + 5.2,
        priority: 2,
        ringMesh: barRing,
        labelSprite: barSprite,
      });
    }

    // ========================================================================
    // CLUB STATION 2: `pool_table` — 8-Ball Pool Table at Exact (1513, 0, 1504)
    // ========================================================================
    {
      const px = CLUB_INT.poolTable.x; // 1513.0
      const pz = CLUB_INT.poolTable.z; // 1504.0
      const pW = 1.52;
      const pL = 2.72;

      // Polished Mahogany & Chrome Tournament 8-Ball Table
      batch.add(prims.box, mats.mahoganyWood, px, floorY + 0.74, pz, 0, 0, 0, pW, 0.22, pL, { castShadow: true });
      for (const lx of [-0.52, 0.52]) {
        for (const lz of [-0.98, 0.98]) {
          batch.add(prims.cyl16, mats.mahoganyWood, px + lx, floorY + 0.36, pz + lz, 0, 0, 0, 0.22, 0.70, 0.22);
          batch.add(prims.cyl16, mats.liquidChrome, px + lx, floorY + 0.05, pz + lz, 0, 0, 0, 0.25, 0.08, 0.25);
        }
      }

      // Cushion Rails + Chrome Corner & Side Pocket Irons
      batch.add(prims.box, mats.mahoganyWood, px, floorY + 0.87, pz - pL * 0.5 + 0.06, 0, 0, 0, pW, 0.06, 0.12);
      batch.add(prims.box, mats.mahoganyWood, px, floorY + 0.87, pz + pL * 0.5 - 0.06, 0, 0, 0, pW, 0.06, 0.12);
      batch.add(prims.box, mats.mahoganyWood, px - pW * 0.5 + 0.06, floorY + 0.87, pz, 0, 0, 0, 0.12, 0.06, pL);
      batch.add(prims.box, mats.mahoganyWood, px + pW * 0.5 - 0.06, floorY + 0.87, pz, 0, 0, 0, 0.12, 0.06, pL);

      for (const pkX of [-pW * 0.5 + 0.07, pW * 0.5 - 0.07]) {
        for (const pkZ of [-pL * 0.5 + 0.07, 0, pL * 0.5 - 0.07]) {
          batch.add(prims.cyl16, mats.liquidChrome, px + pkX, floorY + 0.88, pz + pkZ, 0, 0, 0, 0.16, 0.065, 0.16);
          batch.add(prims.cyl16, mats.obsidianFloor, px + pkX * 0.88, floorY + 0.86, pz + pkZ * 0.94, 0, 0, 0, 0.12, 0.05, 0.12);
        }
      }

      // Emerald Baize Playing Bed
      const baizePlane = new THREE.Mesh(new THREE.PlaneGeometry(pW - 0.22, pL - 0.22), mats.poolBaizeMat);
      baizePlane.rotation.x = Math.PI * 0.5;
      baizePlane.rotation.z = Math.PI * 0.5;
      baizePlane.position.set(px, floorY + 0.855, pz);
      root.add(baizePlane);

      // White Cue Ball + 15 Colored Billiard Balls in 5-Row Triangle Formation!
      const ballR = 0.032;
      batch.add(prims.sphere10, mats.ivoryCeramic, px, floorY + 0.855 + ballR, pz + 0.68, 0, 0, 0, ballR * 2, ballR * 2, ballR * 2);

      let bIdx = 0;
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col <= row; col++) {
          const bxOff = (col - row * 0.5) * (ballR * 2.05);
          const bzOff = -0.45 - row * (ballR * 1.78);
          batch.add(
            prims.sphere10,
            mats.vertexGlossy,
            px + bxOff,
            floorY + 0.855 + ballR,
            pz + bzOff,
            0, 0, 0,
            ballR * 2, ballR * 2, ballR * 2,
            { color: new THREE.Color(POOL_BALL_COLORS[bIdx % POOL_BALL_COLORS.length]) }
          );
          bIdx++;
        }
      }

      // 2 Wooden Pool Cue Sticks Resting on Table + Wall-Mounted 6-Cue Rack on East Wall!
      batch.add(prims.cyl8, mats.vertexStd, px + 0.42, floorY + 0.91, pz + 0.25, Math.PI * 0.5, 0.18, 0, 0.022, 1.48, 0.022, { color: colCueWood });
      batch.add(prims.cyl8, mats.vertexStd, px - 0.44, floorY + 0.91, pz - 0.15, Math.PI * 0.5, -0.24, 0, 0.022, 1.48, 0.022, { color: colCueButt });

      batch.add(prims.box, mats.mahoganyWood, 1518.78, floorY + 1.55, pz, 0, 0, 0, 0.08, 1.65, 1.15);
      for (let c = 0; c < 6; c++) {
        batch.add(prims.cyl8, mats.vertexStd, 1518.70, floorY + 1.55, pz - 0.42 + c * 0.17, 0, 0, 0, 0.022, 1.45, 0.022, { color: colCueWood });
      }

      // Overhead Suspended 3-Shade Neon Billiards Pendant Lamp!
      batch.add(prims.cyl8, mats.liquidChrome, px, floorY + 4.95, pz - 0.7, 0, 0, 0, 0.03, 4.3, 0.03);
      batch.add(prims.cyl8, mats.liquidChrome, px, floorY + 4.95, pz + 0.7, 0, 0, 0, 0.03, 4.3, 0.03);
      batch.add(prims.box, mats.gold24k, px, floorY + 2.82, pz, 0, 0, 0, 0.06, 0.06, 1.95);
      for (const shZ of [pz - 0.75, pz, pz + 0.75]) {
        batch.add(prims.cone16, mats.neonEmerald, px, floorY + 2.68, shZ, 0, 0, 0, 0.48, 0.24, 0.48);
      }

      const poolRing = createInteractionFloorRing(px - 1.32, floorY, pz, 0x2ec4b6, 0.68, 0.92);
      const poolSprite = createFloatingStationSprite(
        '🎱 BI-A 8 BÓNG CÁ CƯỢC ($100–$10,000)',
        '[F] Đấu Cơ Thủ AI • Vật Lý Bi-A Chân Thực!',
        '#38f2af',
        3.05,
        0.70
      );
      poolSprite.position.set(px, floorY + 2.24, pz);
      root.add(poolRing, poolSprite);
      clubIntState.rings.push(poolRing);

      addInteriorAABB(px - pW * 0.5 - 0.05, px + pW * 0.5 + 0.05, pz - pL * 0.5 - 0.05, pz + pL * 0.5 + 0.05, 1.05, 0, 'club_pool_table');
      registerStation({
        type: 'pool_table',
        station: 'pool_table',
        id: 'pool_table_1',
        label: 'Bàn Bi-A 8 Bóng Cá Cược',
        venue: 'nightclub',
        minBet: 100,
        maxBet: 10000,
        x: px,
        y: floorY,
        z: pz,
        priority: 3,
        ringMesh: poolRing,
        labelSprite: poolSprite,
      });
    }

    // ========================================================================
    // CLUB STATION 3: `darts_board` — Electronic Darts at Exact (1515, 0, 1495)
    // ========================================================================
    {
      const dx = CLUB_INT.dartsBoard.x; // 1515.0
      const dz = CLUB_INT.dartsBoard.z; // 1495.0
      const cabX = 1516.65;

      // Freestanding Arcade Electronic 301/Cricket Dartboard Cabinet Pillar
      batch.add(prims.box, mats.blackSteel, cabX, floorY + 1.35, dz, 0, 0, 0, 0.52, 2.70, 1.18, { castShadow: true });
      batch.add(prims.box, mats.mahoganyWood, cabX - 0.24, floorY + 1.72, dz, 0, 0, 0, 0.12, 1.08, 1.02);
      // Open Cabinet Wing Doors
      batch.add(prims.box, mats.mahoganyWood, cabX - 0.34, floorY + 1.72, dz - 0.72, 0, 0.35, 0, 0.06, 1.04, 0.48);
      batch.add(prims.box, mats.mahoganyWood, cabX - 0.34, floorY + 1.72, dz + 0.72, 0, -0.35, 0, 0.06, 1.04, 0.48);
      // Top Electronic LED 301 Scoreboard
      batch.add(prims.box, mats.neonCrimson, cabX - 0.27, floorY + 2.42, dz, 0, 0, 0, 0.05, 0.24, 0.86);

      // Illuminated 20-Sector Circular Dartboard Target
      const boardDisc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), mats.dartboardMat);
      boardDisc.rotation.y = -Math.PI * 0.5;
      boardDisc.position.set(cabX - 0.305, floorY + 1.72, dz);
      root.add(boardDisc);

      // 3 Miniature 3D Brass & Neon-Flight Darts Stuck in Triple-20 & Bullseye!
      const pinnedDarts = [
        { y: floorY + 1.72, z: dz },
        { y: floorY + 1.91, z: dz + 0.02 },
        { y: floorY + 1.89, z: dz - 0.03 },
      ];
      for (let di = 0; di < pinnedDarts.length; di++) {
        const pd = pinnedDarts[di];
        batch.add(prims.cyl8, mats.gold24k, cabX - 0.39, pd.y, pd.z, 0, 0, Math.PI * 0.5, 0.016, 0.14, 0.016);
        batch.add(prims.box, di === 0 ? mats.neonCyan : mats.neonMagenta, cabX - 0.47, pd.y, pd.z, 0, 0, 0, 0.045, 0.045, 0.008);
      }

      // Glowing Neon Oche Throw-Line Mat on Floor at (1514.2, floorY, 1495)
      batch.add(prims.box, mats.neonMagenta, 1514.2, floorY + 0.012, dz, 0, 0, 0, 0.10, 0.02, 1.35);

      const dartRing = createInteractionFloorRing(dx - 0.65, floorY, dz, 0xffbe0b, 0.65, 0.90);
      const dartSprite = createFloatingStationSprite(
        '🎯 PHI TIÊU ĐIỆN TỬ 301 ($100–$5,000)',
        '[F] Ném Hồng Tâm Bullseye • Cẩn Thận Tay Run Khi Say!',
        '#ffd166',
        3.05,
        0.70
      );
      dartSprite.position.set(dx + 0.85, floorY + 2.85, dz);
      root.add(dartRing, dartSprite);
      clubIntState.rings.push(dartRing);

      addInteriorAABB(cabX - 0.35, cabX + 0.35, dz - 0.65, dz + 0.65, 2.75, 0, 'club_darts_cabinet');
      registerStation({
        type: 'darts_board',
        station: 'darts_board',
        id: 'darts_board_1',
        label: 'Bảng Phi Tiêu Điện Tử 301',
        venue: 'nightclub',
        minBet: 100,
        maxBet: 5000,
        x: dx,
        y: floorY,
        z: dz,
        priority: 3,
        ringMesh: dartRing,
        labelSprite: dartSprite,
      });
    }

    // ========================================================================
    // VIP CHAMPAGNE BOOTHS, CLUB OWNERSHIP SAFE DESK & 18 DANCING CLUB NPCS!
    // ========================================================================
    const vipBoothY = CLUB_INT.vipBoothY; // 0.38
    const vipBoothSpecs = [
      { cx: 1486.6, cz: 1511.2, w: 5.4, d: 4.8, yaw: 0 },
      { cx: 1513.4, cz: 1512.2, w: 5.6, d: 4.4, yaw: Math.PI },
      { cx: 1513.6, cz: 1488.2, w: 5.4, d: 4.4, yaw: 0 },
    ];

    for (let vi = 0; vi < vipBoothSpecs.length; vi++) {
      const vb = vipBoothSpecs[vi];
      // Raised 0.38m VIP Lounge Platform + Neon Edge Trim
      batch.add(prims.box, mats.blackGoldMarble, vb.cx, vipBoothY * 0.5, vb.cz, 0, 0, 0, vb.w, vipBoothY, vb.d);
      batch.add(prims.box, mats.neonPurple, vb.cx, vipBoothY - 0.03, vb.cz - vb.d * 0.5, 0, 0, 0, vb.w, 0.05, 0.06);
      batch.add(prims.box, mats.neonPurple, vb.cx, vipBoothY - 0.03, vb.cz + vb.d * 0.5, 0, 0, 0, vb.w, 0.05, 0.06);

      // U-Shaped Tufted Purple Velvet Sofa
      batch.add(prims.box, mats.purpleVelvet, vb.cx, vipBoothY + 0.25, vb.cz + (vi === 1 ? 1.35 : -1.35), 0, 0, 0, 3.8, 0.48, 0.92);
      batch.add(prims.box, mats.purpleVelvet, vb.cx, vipBoothY + 0.65, vb.cz + (vi === 1 ? 1.72 : -1.72), 0, 0, 0, 3.8, 0.52, 0.22);
      batch.add(prims.box, mats.purpleVelvet, vb.cx - 1.55, vipBoothY + 0.25, vb.cz, 0, 0, 0, 0.85, 0.48, 2.8);
      batch.add(prims.box, mats.purpleVelvet, vb.cx + 1.55, vipBoothY + 0.25, vb.cz, 0, 0, 0, 0.85, 0.48, 2.8);

      // Backlit Acrylic VIP Champagne Table + Glowing Ice Bucket + Blêuter'd 24K Gold Magnum!
      batch.add(prims.cyl16, mats.obsidianFloor, vb.cx, vipBoothY + 0.48, vb.cz, 0, 0, 0, 1.25, 0.07, 1.25);
      batch.add(prims.torus16, mats.neonCyan, vb.cx, vipBoothY + 0.50, vb.cz, Math.PI * 0.5, 0, 0, 1.26, 1.26, 0.5);
      batch.add(prims.cyl8, mats.liquidChrome, vb.cx, vipBoothY + 0.24, vb.cz, 0, 0, 0, 0.16, 0.46, 0.16);
      // Glowing Cyan Ice Bucket + Gold Champagne Bottle + 4 Crystal Flutes
      batch.add(prims.cyl16, mats.neonCyan, vb.cx, vipBoothY + 0.62, vb.cz, 0, 0, 0, 0.26, 0.22, 0.26);
      addSculptedLiquorBottle(batch, mats, vb.cx, vipBoothY + 0.66, vb.cz, 5, 1.25);
      for (let fl = 0; fl < 4; fl++) {
        const fa = (fl / 4) * TAU + 0.4;
        addCocktailGlassOnBar(batch, mats, vb.cx + Math.cos(fa) * 0.36, vipBoothY + 0.52, vb.cz + Math.sin(fa) * 0.36, 5);
      }
    }

    // VIP Club Ownership & Safe Income Desk at North-West Corner (1485.8, 0.38, 1486.6)
    {
      const ox = 1485.8;
      const oz = 1486.6;
      batch.add(prims.box, mats.blackGoldMarble, ox, vipBoothY * 0.5, oz, 0, 0, 0, 4.8, vipBoothY, 4.2);
      batch.add(prims.box, mats.mahoganyWood, ox, vipBoothY + 0.42, oz, 0, 0, 0, 2.2, 0.82, 0.95);
      batch.add(prims.box, mats.gold24k, ox, vipBoothY + 0.85, oz, 0, 0, 0, 2.3, 0.05, 1.02);
      // Wall-Mounted Digital Club Safe with Cash Bricks
      batch.add(prims.box, mats.darkGunmetal, 1483.8, vipBoothY + 1.25, oz, 0, 0, 0, 0.65, 0.95, 0.95);
      batch.add(prims.torus16, mats.gold24k, 1484.14, vipBoothY + 1.25, oz, 0, Math.PI * 0.5, 0, 0.36, 0.36, 0.8);
      batch.add(prims.box, mats.vertexStd, ox + 0.45, vipBoothY + 0.91, oz, 0, 0.2, 0, 0.32, 0.10, 0.22, { color: colCashGreen });

      const vipRing = createInteractionFloorRing(ox, vipBoothY, oz + 1.35, 0xffd54f, 0.58, 0.82);
      const vipSprite = createFloatingStationSprite(
        '💼 BÀN QUẢN LÝ VIP & KÉT SẮT CLUB',
        '[F] Mua Túy Tiên Lâu ($35K) • Thu Lợi Nhuận Két Sắt!',
        '#ffd54f',
        2.95,
        0.68
      );
      vipSprite.position.set(ox, vipBoothY + 2.25, oz);
      root.add(vipRing, vipSprite);
      clubIntState.rings.push(vipRing);

      registerStation({
        type: 'vip_desk',
        station: 'vip_desk',
        id: 'club_vip_desk',
        label: 'Bàn Quản Lý VIP & Két Sắt Túy Tiên Lâu',
        venue: 'nightclub',
        minBet: 0,
        maxBet: 35000,
        x: ox,
        y: vipBoothY,
        z: oz + 0.85,
        priority: 3,
        ringMesh: vipRing,
        labelSprite: vipSprite,
      });
    }

    // DJ Booth Interactive Turntable Station on Elevated Stage
    {
      const djRing = createInteractionFloorRing(1500.0, CLUB_INT.djBooth.y, 1489.5, 0x00f0ff, 0.56, 0.78);
      root.add(djRing);
      clubIntState.rings.push(djRing);
      registerStation({
        type: 'dj_booth',
        station: 'dj_booth',
        id: 'club_dj_booth',
        label: 'Bàn DJ Pioneer & Chọn Bản Mix EDM',
        venue: 'nightclub',
        minBet: 0,
        maxBet: 0,
        x: 1500.0,
        y: CLUB_INT.djBooth.y,
        z: 1488.8,
        priority: 3,
        ringMesh: djRing,
      });
    }

    // Interior Security Bouncer Station near South-East Entrance
    const innerBouncer = buildArticulatedVenueNPC(mats, 'bouncer', 515, { female: false });
    innerBouncer.root.position.set(1505.2, floorY, 1514.2);
    innerBouncer.root.rotation.y = -2.6;
    root.add(innerBouncer.root);
    clubIntState.npcs.push(innerBouncer);

    {
      const bncRing = createInteractionFloorRing(1504.4, floorY, 1513.2, 0xff4d6d, 0.55, 0.78);
      const bncSprite = createFloatingStationSprite(
        '🕶️ VỆ SĨ AN NINH CLUB ECLIPSE',
        '[F] Nhận Nhiệm Vụ Bảo Kê VIP & Dẹp Loạn!',
        '#ff6b88',
        2.75,
        0.66
      );
      bncSprite.position.set(1505.2, floorY + 2.32, 1514.2);
      root.add(bncRing, bncSprite);
      clubIntState.rings.push(bncRing);

      registerStation({
        type: 'bouncer',
        station: 'bouncer',
        id: 'club_bouncer_1',
        label: 'Vệ Sĩ An Ninh Túy Tiên Lâu',
        venue: 'nightclub',
        minBet: 0,
        maxBet: 0,
        x: 1504.8,
        y: floorY,
        z: 1513.6,
        priority: 2,
        ringMesh: bncRing,
        labelSprite: bncSprite,
      });
    }

    // ========================================================================
    // 18 ARTICULATED DANCING CLUB NPCS ACROSS DANCEFLOOR, DJ STAGE & LOUNGES!
    // ========================================================================
    const clubDancerCoords = [
      // 12 Main LED Dancefloor Ravers (centered around (1500, 1498), leaving spawn/center clear!)
      { x: 1497.4, z: 1495.2, yaw: 0.25, f: true },
      { x: 1502.6, z: 1495.0, yaw: -0.30, f: false },
      { x: 1496.2, z: 1497.6, yaw: 0.48, f: false },
      { x: 1503.8, z: 1497.4, yaw: -0.45, f: true },
      { x: 1498.5, z: 1493.8, yaw: 0.12, f: true },
      { x: 1501.5, z: 1493.7, yaw: -0.15, f: false },
      { x: 1496.8, z: 1500.4, yaw: 0.72, f: true },
      { x: 1503.2, z: 1500.6, yaw: -0.68, f: false },
      { x: 1499.0, z: 1496.4, yaw: 0.08, f: false },
      { x: 1501.4, z: 1496.6, yaw: -0.18, f: true },
      { x: 1498.2, z: 1501.8, yaw: 2.85, f: true },
      { x: 1501.9, z: 1501.9, yaw: -2.75, f: false },
      // 2 Front-of-DJ-Stage Hype Dancers
      { x: 1496.2, z: 1491.8, yaw: 0.15, f: true },
      { x: 1503.8, z: 1491.8, yaw: -0.15, f: true },
      // 2 Cocktail Bar Groove Patrons
      { x: 1487.8, z: 1495.4, yaw: -1.35, f: false },
      { x: 1487.8, z: 1501.2, yaw: -1.65, f: true },
      // 2 VIP Booth Partygoers (standing on 0.38m VIP platforms!)
      { x: 1486.6, y: vipBoothY, z: 1510.2, yaw: 0.4, f: true },
      { x: 1513.4, y: vipBoothY, z: 1510.8, yaw: -0.5, f: false },
    ];

    for (let di = 0; di < clubDancerCoords.length; di++) {
      const dc = clubDancerCoords[di];
      const dancer = buildArticulatedVenueNPC(mats, 'club_dancer', 520 + di, {
        female: dc.f,
      });
      dancer.root.position.set(dc.x, dc.y || floorY, dc.z);
      dancer.root.rotation.y = dc.yaw;
      root.add(dancer.root);
      clubIntState.npcs.push(dancer);
    }

    batch.flush(root);
  }

  // --------------------------------------------------------------------------
  // 16. HIGH-ART PROCEDURAL WALL MURALS, CASINO CONCIERGE & SCULPTURE GALLERY,
  //     ROOFTOP INFINITY POOL TERRACE, DISCO MIRROR BALL & CRYO-JET CANNONS
  // --------------------------------------------------------------------------
  function createCasinoArtDecoMuralTexture(variant = 0) {
    return createProceduralCanvasTexture(512, 256, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, w, h);
      if (variant === 0) {
        grad.addColorStop(0, '#160629');
        grad.addColorStop(0.5, '#340d4f');
        grad.addColorStop(1, '#120521');
      } else {
        grad.addColorStop(0, '#0a162e');
        grad.addColorStop(0.5, '#1d3557');
        grad.addColorStop(1, '#0b132b');
      }
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);

      // Art-Deco Sunburst Rays radiating from bottom center
      const ox = w * 0.5;
      const oy = h * 0.92;
      for (let i = 0; i < 24; i++) {
        const a0 = -Math.PI + (i / 24) * Math.PI;
        const a1 = a0 + (Math.PI / 48);
        g.beginPath();
        g.moveTo(ox, oy);
        g.lineTo(ox + Math.cos(a0) * 520, oy + Math.sin(a0) * 520);
        g.lineTo(ox + Math.cos(a1) * 520, oy + Math.sin(a1) * 520);
        g.closePath();
        g.fillStyle = i % 2 === 0 ? 'rgba(245, 197, 66, 0.22)' : 'rgba(224, 138, 255, 0.08)';
        g.fill();
      }

      // Stylized Golden Tiên Thành Skyline & Diamond Crest
      const skyline = [58, 92, 74, 128, 152, 110, 168, 134, 96, 142, 84, 64];
      const bw = w / skyline.length;
      for (let i = 0; i < skyline.length; i++) {
        const bh = skyline[i];
        g.fillStyle = '#0e081a';
        g.fillRect(i * bw + 3, h - bh, bw - 6, bh);
        g.strokeStyle = '#ffd54f';
        g.lineWidth = 1.6;
        g.strokeRect(i * bw + 3, h - bh, bw - 6, bh);
      }

      // Central Faceted Gold Diamond Emblem
      g.beginPath();
      g.moveTo(ox, 26);
      g.lineTo(ox + 44, 72);
      g.lineTo(ox, 128);
      g.lineTo(ox - 44, 72);
      g.closePath();
      g.fillStyle = 'rgba(255, 213, 79, 0.85)';
      g.fill();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 2.5;
      g.stroke();

      g.strokeStyle = '#f5c542';
      g.lineWidth = 6;
      g.strokeRect(6, 6, w - 12, h - 12);
    }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
  }

  function createClubCyberGraffitiTexture(variant = 0) {
    return createProceduralCanvasTexture(512, 256, (g, w, h) => {
      g.fillStyle = '#090714';
      g.fillRect(0, 0, w, h);

      // Neon synthwave grid horizon
      g.strokeStyle = 'rgba(0, 240, 255, 0.24)';
      g.lineWidth = 1.5;
      for (let y = 140; y < h; y += 18) {
        g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
      }
      for (let x = -120; x <= w + 120; x += 42) {
        g.beginPath(); g.moveTo(w * 0.5 + (x - w * 0.5) * 0.25, 140); g.lineTo(x, h); g.stroke();
      }

      // Glowing Solar-Eclipse Circle + Cyber Splashes
      const cx = w * 0.5;
      const cy = 104;
      const sunGrad = g.createRadialGradient(cx, cy, 38, cx, cy, 88);
      sunGrad.addColorStop(0, '#ff1ea8');
      sunGrad.addColorStop(0.55, '#7209b7');
      sunGrad.addColorStop(1, 'rgba(9, 7, 20, 0)');
      g.fillStyle = sunGrad;
      g.beginPath(); g.arc(cx, cy, 88, 0, TAU); g.fill();

      g.fillStyle = '#070610';
      g.beginPath(); g.arc(cx, cy, 42, 0, TAU); g.fill();
      g.strokeStyle = '#00f0ff';
      g.lineWidth = 3;
      g.stroke();

      g.fillStyle = '#ffffff';
      g.font = 'bold 28px sans-serif';
      g.textAlign = 'center';
      g.fillText(
        variant === 0 ? 'ECLIPSE • AFTER HOURS' : 'LOS SANTOS NEON UNDERGROUND',
        cx,
        214
      );
      g.strokeStyle = variant === 0 ? '#ff1ea8' : '#00f0ff';
      g.lineWidth = 4;
      g.strokeRect(6, 6, w - 12, h - 12);
    }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
  }

  function buildCasinoGalleryAndRoofExtras(extGroup, intRoot, mats, casinoIntState) {
    // ------------------------------------------------------------------------
    // A. Exterior Resort Rooftop Infinity Pool & Sky-Cabana Deck (y = 17.1m on West Atrium!)
    //    Visible from helicopters, FIB Tower & Freeway Overpass!
    // ------------------------------------------------------------------------
    {
      const extBatch = createBatchBuilder(extGroup);
      const roofY = CASINO_EXT.sidewalkY + 17.15; // 17.37m
      const rx = 222.8;
      const rz = -108.0;

      // Turquoise Illuminated Infinity Pool Basin (6.5m x 32m)
      extBatch.add(prims.box, mats.calacattaMarble, rx, roofY + 0.16, rz, 0, 0, 0, 8.2, 0.32, 36.0);
      const roofPoolWater = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 33.6), mats.fountainWater);
      roofPoolWater.rotation.x = -Math.PI * 0.5;
      roofPoolWater.position.set(rx - 0.3, roofY + 0.34, rz);
      extGroup.add(roofPoolWater);

      // Glass Infinity Edge Rail along West Overlook
      extBatch.add(prims.box, mats.clearDomeGlass, 216.6, roofY + 0.55, rz, 0, 0, 0, 0.08, 1.1, 66.0);

      // 6 White Luxury Pool Loungers + Gold Resort Umbrellas + 2 Sky Cabanas!
      for (let li = 0; li < 6; li++) {
        const lz = -123.0 + li * 6.0;
        extBatch.add(prims.box, mats.ivoryCeramic, rx + 2.8, roofY + 0.22, lz, 0, 0, 0, 1.85, 0.16, 0.82);
        extBatch.add(prims.box, mats.ivoryCeramic, rx + 3.55, roofY + 0.48, lz, 0, 0, 0.52, 0.62, 0.12, 0.80);
        if (li % 2 === 0) {
          extBatch.add(prims.cyl8, mats.gold24k, rx + 3.1, roofY + 1.25, lz + 1.2, 0, 0, 0, 0.06, 2.3, 0.06);
          extBatch.add(prims.cone16, mats.purpleVelvet, rx + 3.1, roofY + 2.38, lz + 1.2, 0, 0, 0, 2.4, 0.52, 2.4);
        }
      }
      for (const cabZ of [-135.5, -80.5]) {
        extBatch.add(prims.box, mats.creamLimestone, rx, roofY + 1.45, cabZ, 0, 0, 0, 5.2, 0.18, 4.8);
        for (const cxOff of [-2.3, 2.3]) {
          for (const czOff of [-2.1, 2.1]) {
            extBatch.add(prims.box, mats.gold24k, rx + cxOff, roofY + 0.72, cabZ + czOff, 0, 0, 0, 0.16, 1.45, 0.16);
          }
        }
        extBatch.add(prims.box, mats.purpleVelvet, rx, roofY + 0.28, cabZ, 0, 0, 0, 3.2, 0.36, 2.8);
      }

      extBatch.flush(extGroup);
    }

    // ------------------------------------------------------------------------
    // B. Casino Grand Interior — Art-Deco Murals, Golden Sculptures,
    //    Foyer Concierge Desks, Indoor Palms & Directional Zone Banners!
    // ------------------------------------------------------------------------
    {
      const intBatch = createBatchBuilder(intRoot);
      const floorY = CASINO_INT.floorY;

      const muralTexA = createCasinoArtDecoMuralTexture(0);
      const muralTexB = createCasinoArtDecoMuralTexture(1);
      const muralMatA = new THREE.MeshStandardMaterial({
        map: muralTexA,
        emissive: 0xffffff,
        emissiveMap: muralTexA,
        emissiveIntensity: 0.42,
        roughness: 0.3,
      });
      const muralMatB = new THREE.MeshStandardMaterial({
        map: muralTexB,
        emissive: 0xffffff,
        emissiveMap: muralTexB,
        emissiveIntensity: 0.42,
        roughness: 0.3,
      });

      const muralPlacements = [
        { x: 1174.22, y: 5.2, z: 1196.0, ry: Math.PI * 0.5, mat: muralMatA },
        { x: 1225.78, y: 5.2, z: 1196.0, ry: -Math.PI * 0.5, mat: muralMatB },
        { x: 1188.0, y: 6.2, z: 1177.22, ry: 0, mat: muralMatA },
        { x: 1212.0, y: 6.2, z: 1177.22, ry: 0, mat: muralMatB },
      ];
      for (const mp of muralPlacements) {
        intBatch.add(prims.box, mats.gold24k, mp.x, mp.y, mp.z, 0, mp.ry, 0, 5.8, 3.0, 0.08);
        const canvasPlane = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 2.7), mp.mat);
        canvasPlane.position.set(
          mp.x + Math.sin(mp.ry) * 0.055,
          mp.y,
          mp.z + Math.cos(mp.ry) * 0.055
        );
        canvasPlane.rotation.y = mp.ry;
        intRoot.add(canvasPlane);
      }

      // Twin Sculpted 24K Gold Faceted Crown-Obelisk Statues flanking the South Foyer
      casinoIntState.foyerStatues = [];
      for (const side of [-1, 1]) {
        const sx = 1200.0 + side * 4.85;
        const sz = 1218.2;
        intBatch.add(prims.cyl16, mats.blackGoldMarble, sx, floorY + 0.48, sz, 0, 0, 0, 1.18, 0.96, 1.18);
        intBatch.add(prims.torus16, mats.gold24k, sx, floorY + 0.98, sz, Math.PI * 0.5, 0, 0, 1.22, 1.22, 0.8);

        const sculptureGrp = new THREE.Group();
        sculptureGrp.position.set(sx, floorY + 1.85, sz);
        const outerRing = new THREE.Mesh(prims.torus32, mats.gold24k);
        outerRing.scale.set(1.15, 1.15, 1.2);
        sculptureGrp.add(outerRing);
        const coreGem = new THREE.Mesh(prims.octa, mats.crystalDiamond);
        coreGem.scale.set(0.55, 0.85, 0.55);
        sculptureGrp.add(coreGem);
        intRoot.add(sculptureGrp);
        casinoIntState.foyerStatues.push(sculptureGrp);

        addInteriorAABB(sx - 0.65, sx + 0.65, sz - 0.65, sz + 0.65, 2.6, 0, 'casino_foyer_statue');
      }

      // 6 Indoor Ornamental Brass-Urn Parlour Palms
      const indoorPlantSpots = [
        [1175.8, 1221.0], [1224.2, 1221.0],
        [1194.2, 1221.2], [1205.8, 1221.2],
        [1175.8, 1198.0], [1224.2, 1198.0],
      ];
      for (const [px, pz] of indoorPlantSpots) {
        intBatch.add(prims.cyl16, mats.gold24k, px, floorY + 0.34, pz, 0, 0, 0, 0.68, 0.68, 0.68);
        intBatch.add(prims.cyl8, mats.vertexStd, px, floorY + 1.15, pz, 0, 0, 0, 0.12, 1.1, 0.12, { color: colPalmBark });
        for (let lf = 0; lf < 7; lf++) {
          const la = (lf / 7) * TAU;
          intBatch.add(
            prims.box,
            mats.vertexStd,
            px + Math.cos(la) * 0.42,
            floorY + 1.68,
            pz + Math.sin(la) * 0.42,
            0.35, -la, 0,
            0.24, 0.03, 0.78,
            { color: colPalmLeafTip }
          );
        }
      }

      // Hanging Illuminated Casino Zone Directional Signboards from Ceiling!
      const zoneSigns = [
        {
          x: 1185.5, z: 1203.0,
          t1: '◀ KHU ĐỎ ĐEN CHÂU Á VIP',
          t2: 'TÀI XỈU • XÓC ĐĨA • QUẦY THU NGÂN',
          col: '#ff5c77',
        },
        {
          x: 1214.5, z: 1203.0,
          t1: 'KHU BÀI TÂY & VÒNG QUAY ▶',
          t2: 'BLACKJACK 21 • POKER VIP • LUCKY WHEEL',
          col: '#06d6a0',
        },
        {
          x: 1200.0, z: 1191.8,
          t1: '▲ SẢNH ROULETTE & BACCARAT HOÀNG GIA',
          t2: 'CƯỢC TỐI ĐA 50,000 PHỈNH',
          col: '#ffd54f',
        },
      ];
      for (const zs of zoneSigns) {
        intBatch.add(prims.cyl8, mats.gold24k, zs.x - 1.6, 8.15, zs.z, 0, 0, 0, 0.035, 2.7, 0.035);
        intBatch.add(prims.cyl8, mats.gold24k, zs.x + 1.6, 8.15, zs.z, 0, 0, 0, 0.035, 2.7, 0.035);
        intBatch.add(prims.box, mats.gold24k, zs.x, 6.75, zs.z, 0, 0, 0, 4.15, 0.88, 0.12);

        const sTex = createSignBannerTexture(zs.t1, zs.t2, {
          bg: '#130724',
          border: zs.col,
          titleColor: '#ffffff',
          subColor: zs.col,
        });
        const sMat = new THREE.MeshBasicMaterial({ map: sTex });
        const frontFace = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 0.78), sMat);
        frontFace.position.set(zs.x, 6.75, zs.z + 0.07);
        const backFace = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 0.78), sMat);
        backFace.position.set(zs.x, 6.75, zs.z - 0.07);
        backFace.rotation.y = Math.PI;
        intRoot.add(frontFace, backFace);
      }

      intBatch.flush(intRoot);
    }
  }

  function buildNightclubAtmosphereExtras(clubRoot, mats, clubIntState) {
    const batch = createBatchBuilder(clubRoot);
    const floorY = CLUB_INT.floorY;

    // 1. UV-Reactive Cyberpunk Neon Graffiti Murals on Club Lounge Walls
    const grafTex0 = createClubCyberGraffitiTexture(0);
    const grafTex1 = createClubCyberGraffitiTexture(1);
    const grafMat0 = new THREE.MeshStandardMaterial({
      map: grafTex0,
      emissive: 0xffffff,
      emissiveMap: grafTex0,
      emissiveIntensity: 0.92,
      roughness: 0.28,
    });
    const grafMat1 = new THREE.MeshStandardMaterial({
      map: grafTex1,
      emissive: 0xffffff,
      emissiveMap: grafTex1,
      emissiveIntensity: 0.92,
      roughness: 0.28,
    });

    const muralSpots = [
      { x: 1518.78, y: 4.35, z: 1504.0, ry: -Math.PI * 0.5, mat: grafMat0 },
      { x: 1518.78, y: 4.35, z: 1491.5, ry: -Math.PI * 0.5, mat: grafMat1 },
      { x: 1491.5, y: 4.35, z: 1516.78, ry: Math.PI, mat: grafMat0 },
      { x: 1508.5, y: 4.35, z: 1516.78, ry: Math.PI, mat: grafMat1 },
    ];
    for (const ms of muralSpots) {
      batch.add(prims.box, mats.neonCyan, ms.x, ms.y, ms.z, 0, ms.ry, 0, 5.2, 2.6, 0.06);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(4.95, 2.38), ms.mat);
      plane.position.set(ms.x + Math.sin(ms.ry) * 0.05, ms.y, ms.z + Math.cos(ms.ry) * 0.05);
      plane.rotation.y = ms.ry;
      clubRoot.add(plane);
    }

    // 2. Center Rotating Faceted 3D Chrome Disco Mirror Ball at (1500, 6.22, 1498)!
    batch.add(prims.cyl8, mats.liquidChrome, 1500.0, 6.72, 1498.0, 0, 0, 0, 0.05, 0.85, 0.05);
    const discoBall = new THREE.Group();
    discoBall.position.set(1500.0, 6.12, 1498.0);
    const coreSphere = new THREE.Mesh(new THREE.IcosahedronGeometry(0.56, 2), mats.liquidChrome);
    discoBall.add(coreSphere);
    const eqRing = new THREE.Mesh(prims.torus32, mats.neonCyan);
    eqRing.rotation.x = Math.PI * 0.5;
    eqRing.scale.set(1.25, 1.25, 0.7);
    discoBall.add(eqRing);
    clubRoot.add(discoBall);
    clubIntState.discoBall = discoBall;

    // 3. 4 Stage-Corner CO2 Cryo-Jet Cannons (Blast Towering Fog Plumes on Beat Drops!)
    clubIntState.cryoPlumes = [];
    const cryoMat = new THREE.MeshBasicMaterial({
      color: 0xdffbff,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const cryoCoords = [
      [1494.1, 1492.2],
      [1505.9, 1492.2],
      [1494.1, 1503.8],
      [1505.9, 1503.8],
    ];
    for (const [cx, cz] of cryoCoords) {
      batch.add(prims.cyl16, mats.darkGunmetal, cx, floorY + 0.22, cz, 0, 0, 0, 0.28, 0.44, 0.28);
      batch.add(prims.torus16, mats.neonCyan, cx, floorY + 0.44, cz, Math.PI * 0.5, 0, 0, 0.30, 0.30, 0.8);

      const plumeGeo = new THREE.ConeGeometry(0.75, 4.6, 14, 1, true);
      plumeGeo.translate(0, 2.3, 0);
      const plumeMesh = new THREE.Mesh(plumeGeo, cryoMat);
      plumeMesh.rotation.x = Math.PI; // Wide top, narrow nozzle bottom!
      plumeMesh.position.set(cx, floorY + 4.95, cz);
      plumeMesh.visible = false;
      clubRoot.add(plumeMesh);
      clubIntState.cryoPlumes.push(plumeMesh);
    }
    clubIntState.cryoMat = cryoMat;

    // 4. VIP Sparkler Bottle-Girl Parade Performers (Hidden until VIP Champagne Parade triggers, or celebrating!)
    const paradeGroup = new THREE.Group();
    paradeGroup.name = 'BottleGirlSparklerParade';
    paradeGroup.visible = false;
    const bottleGirls = [];
    for (let bg = 0; bg < 2; bg++) {
      const girl = buildArticulatedVenueNPC(mats, 'waitress', 560 + bg, { female: true });
      girl.root.position.set(1491.5 + bg * 1.6, floorY, 1505.5);
      // Attach glowing handheld golden sparkler wand on left hand
      const wand = new THREE.Mesh(prims.octa, mats.neonGold);
      wand.position.set(0, -0.26, 0.08);
      wand.scale.set(0.16, 0.36, 0.16);
      girl.armL.elbow.add(wand);
      paradeGroup.add(girl.root);
      bottleGirls.push(girl);
    }
    const paradeLight = new THREE.PointLight(0xffdf6b, 2.4, 14);
    paradeLight.position.set(1492.3, 2.2, 1505.5);
    paradeGroup.add(paradeLight);
    clubRoot.add(paradeGroup);

    clubIntState.paradeGroup = paradeGroup;
    clubIntState.bottleGirls = bottleGirls;
    clubIntState.paradeTimer = 0;

    batch.flush(clubRoot);
  }

  // --------------------------------------------------------------------------
  // 17. CASINO VIP MEZZANINE CHAMPAGNE BAR, TROPHY MUSEUM VITRINES &
  //     ANIMATED HEIST SUB-VAULT BULLION CHAMBER (AT (1200, 0, 1175))
  // --------------------------------------------------------------------------
  function buildCasinoVIPMezzanineAndVaultChamber(intRoot, mats, casinoIntState) {
    const batch = createBatchBuilder(intRoot);
    const floorY = CASINO_INT.floorY; // 0.02
    const mezzY = CASINO_INT.mezzY;   // 3.60

    // 17.1 West Mezzanine VIP Espresso & Champagne Sommelier Bar (X in [1178, 1185], y = 3.60m)
    {
      const bx = 1181.5;
      const bz = 1178.55;
      batch.add(prims.box, mats.blackGoldMarble, bx, mezzY + 0.54, bz + 0.55, 0, 0, 0, 4.6, 1.08, 0.78);
      batch.add(prims.box, mats.gold24k, bx, mezzY + 1.10, bz + 0.55, 0, 0, 0, 4.72, 0.06, 0.88);
      batch.add(prims.box, mats.neonGold, bx, mezzY + 0.98, bz + 0.96, 0, 0, 0, 4.62, 0.05, 0.04);

      // Golden Italian Espresso Machine + Crystal Champagne Decanters
      batch.add(prims.box, mats.gold24k, bx - 1.35, mezzY + 1.34, bz + 0.52, 0, 0, 0, 0.68, 0.44, 0.42);
      batch.add(prims.cyl16, mats.liquidChrome, bx - 1.35, mezzY + 1.60, bz + 0.52, 0, 0, 0, 0.52, 0.08, 0.32);
      for (let b = 0; b < 8; b++) {
        addSculptedLiquorBottle(batch, mats, bx - 0.45 + b * 0.34, mezzY + 1.13, bz + 0.48, b + 2, 1.05);
      }
      for (const stX of [bx - 1.4, bx - 0.45, bx + 0.45, bx + 1.4]) {
        addCasinoVelvetStool(batch, mats, stX, mezzY, bz + 1.38, mats.purpleVelvet);
      }

      const sommelier = buildArticulatedVenueNPC(mats, 'bartender', 410, { female: true });
      sommelier.root.position.set(bx + 0.2, mezzY, bz - 0.18);
      sommelier.root.rotation.y = 0;
      intRoot.add(sommelier.root);
      casinoIntState.npcs.push(sommelier);
    }

    // 17.2 East Mezzanine High-Roller Museum Trophy Vitrines (X in [1214, 1222], y = 3.60m)
    {
      const vitrineSpecs = [
        { x: 1214.5, z: 1178.4, kind: 'crown' },
        { x: 1217.5, z: 1178.4, kind: 'diamond' },
        { x: 1220.5, z: 1178.4, kind: 'bullion' },
      ];
      for (let vi = 0; vi < vitrineSpecs.length; vi++) {
        const vs = vitrineSpecs[vi];
        // Black-Gold Marble Pedestal + Illuminated Bulletproof Glass Display Case
        batch.add(prims.box, mats.blackGoldMarble, vs.x, mezzY + 0.52, vs.z, 0, 0, 0, 0.92, 1.04, 0.92);
        batch.add(prims.box, mats.gold24k, vs.x, mezzY + 1.06, vs.z, 0, 0, 0, 0.96, 0.06, 0.96);
        batch.add(prims.box, mats.clearDomeGlass, vs.x, mezzY + 1.52, vs.z, 0, 0, 0, 0.84, 0.86, 0.84);
        batch.add(prims.box, mats.gold24k, vs.x, mezzY + 1.97, vs.z, 0, 0, 0, 0.90, 0.06, 0.90);

        if (vs.kind === 'crown') {
          batch.add(prims.torus16, mats.gold24k, vs.x, mezzY + 1.32, vs.z, Math.PI * 0.5, 0, 0, 0.44, 0.44, 0.9);
          for (let sp = 0; sp < 6; sp++) {
            const sa = (sp / 6) * TAU;
            batch.add(prims.cone8, mats.gold24k, vs.x + Math.cos(sa) * 0.21, mezzY + 1.46, vs.z + Math.sin(sa) * 0.21, 0, 0, 0, 0.08, 0.24, 0.08);
          }
        } else if (vs.kind === 'diamond') {
          batch.add(prims.octa, mats.crystalDiamond, vs.x, mezzY + 1.48, vs.z, 0, 0.5, 0, 0.38, 0.52, 0.38);
        } else {
          for (let row = 0; row < 3; row++) {
            const cnt = 3 - row;
            for (let k = 0; k < cnt; k++) {
              batch.add(
                prims.box,
                mats.gold24k,
                vs.x + (k - (cnt - 1) * 0.5) * 0.18,
                mezzY + 1.16 + row * 0.11,
                vs.z,
                0, 0, 0,
                0.15, 0.09, 0.30
              );
            }
          }
        }
      }
    }

    // 17.3 High-Security Sub-Vault Bullion & Diamond Chamber Behind Bulletproof Viewing Windows
    //      at (1200, 0, 1173.0..1177.2) + Hinged Vault Door Pivot for Heist #5!
    {
      const vx = 1200.0;
      const chamberZ = 1174.8;
      // Reinforced Steel Vault Room Shell behind North Wall
      batch.add(prims.box, mats.darkGunmetal, vx, floorY - 0.1, chamberZ, 0, 0, 0, 9.6, 0.22, 5.2);
      batch.add(prims.box, mats.darkGunmetal, vx, 3.6, chamberZ, 0, 0, 0, 9.6, 0.24, 5.2);
      batch.add(prims.box, mats.blackSteel, vx, 1.8, 1172.3, 0, 0, 0, 9.6, 3.6, 0.3);
      batch.add(prims.box, mats.blackSteel, vx - 4.7, 1.8, chamberZ, 0, 0, 0, 0.3, 3.6, 5.2);
      batch.add(prims.box, mats.blackSteel, vx + 4.7, 1.8, chamberZ, 0, 0, 0, 0.3, 3.6, 5.2);

      // Left & Right Armored Viewing Windows at (1196.4, 1.75, 1177.35) & (1203.6, 1.75, 1177.35)
      for (const winX of [1196.4, 1203.6]) {
        batch.add(prims.box, mats.gold24k, winX, 1.75, 1177.38, 0, 0, 0, 2.2, 1.85, 0.35);
        batch.add(prims.box, mats.clearDomeGlass, winX, 1.75, 1177.38, 0, 0, 0, 1.92, 1.56, 0.12);
      }

      // Wheeled Gold Bullion Carts, Cash Pallets & Center Pink-Diamond Heist Pedestal inside Vault!
      for (const cartX of [1197.2, 1202.8]) {
        batch.add(prims.box, mats.liquidChrome, cartX, floorY + 0.45, chamberZ, 0, 0.18, 0, 1.45, 0.08, 0.92);
        for (let r = 0; r < 3; r++) {
          for (let c = -2; c <= 2; c++) {
            batch.add(
              prims.box,
              mats.gold24k,
              cartX + c * 0.24,
              floorY + 0.56 + r * 0.11,
              chamberZ,
              0, 0.18, 0,
              0.20, 0.095, 0.42
            );
          }
        }
      }
      // Center Heist Pink-Diamond Pedestal inside Vault
      batch.add(prims.cyl16, mats.blackGoldMarble, vx, floorY + 0.55, chamberZ - 0.4, 0, 0, 0, 0.86, 1.1, 0.86);
      batch.add(prims.octa, mats.neonMagenta, vx, floorY + 1.38, chamberZ - 0.4, 0, 0, 0, 0.44, 0.62, 0.44);
      batch.add(prims.box, mats.clearDomeGlass, vx, floorY + 1.40, chamberZ - 0.4, 0, 0, 0, 0.72, 0.78, 0.72);

      // Oscillating Red Security Laser Grid Beams inside Vault!
      const laserGridGroup = new THREE.Group();
      laserGridGroup.position.set(vx, 1.6, chamberZ + 0.8);
      for (let lb = -1; lb <= 1; lb++) {
        const beam = new THREE.Mesh(prims.cyl8, mats.neonCrimson);
        beam.rotation.z = Math.PI * 0.5;
        beam.position.set(0, lb * 0.58, 0);
        beam.scale.set(0.022, 8.8, 0.022);
        laserGridGroup.add(beam);
      }
      intRoot.add(laserGridGroup);

      const vaultPtLight = new THREE.PointLight(0xff2e55, 1.15, 12);
      vaultPtLight.position.set(vx, 2.8, chamberZ);
      intRoot.add(vaultPtLight);

      // Hinged Animated Circular Steel Vault Blast Door Pivot (can swing open during Heist #5!)
      const vaultHinge = new THREE.Group();
      vaultHinge.position.set(vx - 1.35, 1.68, 1177.52);
      const hingedDisc = new THREE.Mesh(prims.cyl24, mats.liquidChrome);
      hingedDisc.rotation.x = Math.PI * 0.5;
      hingedDisc.position.set(1.35, 0, 0.14);
      hingedDisc.scale.set(2.55, 0.24, 2.55);
      vaultHinge.add(hingedDisc);
      const hingedWheel = new THREE.Mesh(prims.torus16, mats.gold24k);
      hingedWheel.position.set(1.35, 0, 0.30);
      hingedWheel.scale.set(0.76, 0.76, 0.9);
      vaultHinge.add(hingedWheel);
      intRoot.add(vaultHinge);

      casinoIntState.vaultLaserGrid = laserGridGroup;
      casinoIntState.vaultHinge = vaultHinge;
      casinoIntState.vaultOpenTarget = 0;
      casinoIntState.vaultOpenCurrent = 0;
    }

    batch.flush(intRoot);
  }

  // --------------------------------------------------------------------------
  // 18. EXTERIOR RESORT & NIGHTCLUB SUPER-DETAILS:
  //     58M ROOFTOP HELIPAD, VIP STRETCH LIMOUSINE, LIVE JACKPOT BILLBOARD,
  //     OCEANFRONT CLUB FIRE-PIT PATIO & NEON UNDERGLOW TUNER COUPE
  // --------------------------------------------------------------------------
  function buildExteriorResortAndClubSuperDetails(casinoExtGrp, clubExtGrp, mats, exteriorState) {
    // 18.1 Vạn Bảo Đổ Phường 58m Skyscraper Rooftop Helipad + VIP Stretch Limousine + Live Jackpot Ticker!
    {
      const cBatch = createBatchBuilder(casinoExtGrp);
      const baseY = CASINO_EXT.sidewalkY; // 0.22
      const roofPadY = baseY + 58.35;     // 58.57m
      const hx = 260.9;
      const hz = -110.0;

      // Octagonal Helipad Deck atop the 58m Resort Tower
      cBatch.add(prims.cyl16, mats.granitePlinth, hx, roofPadY, hz, 0, 0, 0, 11.4, 0.24, 11.4);
      cBatch.add(prims.torus32, mats.neonGold, hx, roofPadY + 0.14, hz, Math.PI * 0.5, 0, 0, 9.8, 9.8, 0.45);
      // Giant White/Gold "H" Helipad Marking
      cBatch.add(prims.box, mats.ivoryCeramic, hx - 1.55, roofPadY + 0.14, hz, 0, 0, 0, 0.72, 0.03, 4.6);
      cBatch.add(prims.box, mats.ivoryCeramic, hx + 1.55, roofPadY + 0.14, hz, 0, 0, 0, 0.72, 0.03, 4.6);
      cBatch.add(prims.box, mats.ivoryCeramic, hx, roofPadY + 0.14, hz, 0, 0, 0, 3.1, 0.03, 0.72);
      // Perimeter Green Helipad Landing Lights
      for (let p = 0; p < 8; p++) {
        const pa = (p / 8) * TAU;
        cBatch.add(
          prims.sphere10,
          mats.neonEmerald,
          hx + Math.cos(pa) * 5.2,
          roofPadY + 0.18,
          hz + Math.sin(pa) * 5.2,
          0, 0, 0,
          0.24, 0.16, 0.24
        );
      }

      // Sculpted 8.2m Obsidian & Chrome VIP Stretch Limousine Parked on Casino Forecourt (210.8, 0.24, -74.5)
      const limoX = 210.9;
      const limoZ = -75.0;
      const limoY = baseY + 0.02;
      cBatch.add(prims.box, mats.obsidianFloor, limoX, limoY + 0.52, limoZ, 0, 0, 0, 2.02, 0.52, 8.15, { castShadow: true });
      cBatch.add(prims.box, mats.obsidianFloor, limoX, limoY + 1.02, limoZ - 0.18, 0, 0, 0, 1.76, 0.50, 5.45, { castShadow: true });
      cBatch.add(prims.box, mats.tintedCanopyGlass, limoX, limoY + 1.02, limoZ - 0.18, 0, 0, 0, 1.80, 0.36, 5.15);
      cBatch.add(prims.box, mats.liquidChrome, limoX, limoY + 0.54, limoZ + 4.09, 0, 0, 0, 1.35, 0.36, 0.06);
      cBatch.add(prims.box, mats.neonGold, limoX - 0.74, limoY + 0.58, limoZ + 4.08, 0, 0, 0, 0.32, 0.12, 0.06);
      cBatch.add(prims.box, mats.neonGold, limoX + 0.74, limoY + 0.58, limoZ + 4.08, 0, 0, 0, 0.32, 0.12, 0.06);
      cBatch.add(prims.box, mats.neonCrimson, limoX, limoY + 0.62, limoZ - 4.08, 0, 0, 0, 1.82, 0.10, 0.06);
      for (const wz of [limoZ + 2.85, limoZ - 2.85]) {
        for (const wx of [limoX - 0.98, limoX + 0.98]) {
          cBatch.add(prims.cyl16, mats.blackLeather, wx, limoY + 0.36, wz, 0, 0, Math.PI * 0.5, 0.72, 0.28, 0.72);
          cBatch.add(prims.cyl16, mats.liquidChrome, wx + (wx < limoX ? -0.02 : 0.02), limoY + 0.36, wz, 0, 0, Math.PI * 0.5, 0.48, 0.29, 0.48);
        }
      }
      addExteriorAABB(limoX - 1.1, limoX + 1.1, limoZ - 4.15, limoZ + 4.15, limoY + 1.45, 0, 'casino_vip_limo');

      // Exterior Progressive Jackpot Digital Ticker on Roadside Pylon
      const jackpotTickerTex = createProceduralCanvasTexture(512, 96, (g, w, h) => {
        g.fillStyle = '#120520';
        g.fillRect(0, 0, w, h);
        g.strokeStyle = '#ffd54f';
        g.lineWidth = 4;
        g.strokeRect(4, 4, w - 8, h - 8);
        g.fillStyle = '#ffe885';
        g.font = 'bold 34px monospace';
        g.textAlign = 'center';
        g.fillText('MEGA JACKPOT: $2,888,777', w * 0.5, 60);
      }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
      const tickerPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(4.2, 0.82),
        new THREE.MeshBasicMaterial({ map: jackpotTickerTex })
      );
      tickerPlane.position.set(211.41, baseY + 3.8, -146.5);
      tickerPlane.rotation.y = -Math.PI * 0.5;
      casinoExtGrp.add(tickerPlane);
      exteriorState.jackpotTickerTex = jackpotTickerTex;

      cBatch.flush(casinoExtGrp);
    }

    // 18.2 Túy Tiên Lâu Oceanfront Neon Fire-Pit Lounge Patio & Parked Underglow Tuner Car!
    {
      const nBatch = createBatchBuilder(clubExtGrp);
      const baseY = CLUB_EXT.terraceY; // 0.22

      // West Ocean-View Sunset Patio along X = -165.4.. -164.6 / North-West Corner (-158, -114.5)
      // Plus South-East Curbside Neon-Underglow Tuner Coupe at (-131.6, baseY, -82.5)!
      const tunerCar = buildSculptedHypercar(mats, {
        name: 'ClubEclipseUnderglowCoupe',
        primaryMat: mats.obsidianFloor,
        secondaryMat: mats.neonMagenta,
        trimMat: mats.carbonFiber,
        accentGlowMat: mats.neonCyan,
      });
      tunerCar.position.set(-131.8, baseY + 0.02, -82.5);
      tunerCar.rotation.y = 0.28;

      // Glowing Magenta Ground-Projection Underglow Plane beneath Tuner Car!
      const underglowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(2.65, 4.85),
        new THREE.MeshBasicMaterial({
          color: 0xff1ea8,
          transparent: true,
          opacity: 0.52,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      underglowPlane.rotation.x = -Math.PI * 0.5;
      underglowPlane.position.set(0, 0.02, 0);
      tunerCar.add(underglowPlane);
      clubExtGrp.add(tunerCar);
      addExteriorAABB(-133.2, -130.4, -84.8, -80.2, baseY + 1.4, 0, 'club_tuner_car');

      // 4 Flickering Neon Fire-Pit Pedestal Torches Flanking Túy Tiên Lâu Entrance Terrace!
      exteriorState.fireTorches = [];
      const torchCoords = [
        [-130.4, -90.5],
        [-130.4, -99.5],
        [-133.8, -88.0],
        [-133.8, -102.0],
      ];
      for (const [tx, tz] of torchCoords) {
        nBatch.add(prims.box, mats.blackSteel, tx, baseY + 0.62, tz, 0, 0, 0, 0.44, 1.24, 0.44);
        nBatch.add(prims.box, mats.neonCyan, tx, baseY + 1.25, tz, 0, 0, 0, 0.52, 0.06, 0.52);

        const flame = new THREE.Mesh(prims.cone8, mats.neonMagenta);
        flame.position.set(tx, baseY + 1.54, tz);
        flame.scale.set(0.28, 0.52, 0.28);
        clubExtGrp.add(flame);
        exteriorState.fireTorches.push(flame);
      }

      nBatch.flush(clubExtGrp);
    }
  }

  // --------------------------------------------------------------------------
  // 19. CASINO FOYER WHISKEY LOUNGE, SELF-SERVICE CHIP KIOSKS, NEON SELFIE
  //     WINGS, ROTATING CEILING FANS & EXTERIOR VEGAS SKY-SEARCHLIGHTS
  // --------------------------------------------------------------------------
  function buildFineInteriorSuitesAndSkySearchlights(
    casinoExtGrp,
    clubExtGrp,
    casinoIntRoot,
    clubIntRoot,
    mats,
    exteriorState,
    casinoIntState,
    clubIntState
  ) {
    // ------------------------------------------------------------------------
    // 19.1 Exterior Vegas/Hollywood Sky-Searchlight Beams atop Casino & Club!
    // ------------------------------------------------------------------------
    exteriorState.skySearchlights = [];
    {
      const cBatch = createBatchBuilder(casinoExtGrp);
      const casinoRoofY = CASINO_EXT.sidewalkY + 17.25;
      const casinoSpots = [
        { x: 217.4, y: casinoRoofY, z: -141.5, mat: mats.spotlightGold, phase: 0.0, sx: 1.1, sz: 0.8 },
        { x: 217.4, y: casinoRoofY, z: -75.5, mat: mats.laserViolet, phase: 1.8, sx: -0.9, sz: 1.1 },
        { x: 252.0, y: CASINO_EXT.sidewalkY + 58.4, z: -124.0, mat: mats.spotlightGold, phase: 0.9, sx: 0.7, sz: -1.2 },
        { x: 252.0, y: CASINO_EXT.sidewalkY + 58.4, z: -96.0, mat: mats.laserCyan, phase: 2.7, sx: -1.1, sz: 0.9 },
      ];

      for (const sp of casinoSpots) {
        cBatch.add(prims.cyl16, mats.darkGunmetal, sp.x, sp.y + 0.28, sp.z, 0, 0, 0, 0.78, 0.56, 0.78);
        cBatch.add(prims.torus16, mats.gold24k, sp.x, sp.y + 0.56, sp.z, Math.PI * 0.5, 0, 0, 0.82, 0.82, 0.8);

        const pivot = new THREE.Group();
        pivot.position.set(sp.x, sp.y + 0.58, sp.z);
        const cleanBeamGeo = new THREE.ConeGeometry(3.8, 38.0, 18, 1, true);
        cleanBeamGeo.rotateX(Math.PI);
        cleanBeamGeo.translate(0, 19.0, 0);
        const beamMesh = new THREE.Mesh(cleanBeamGeo, sp.mat);
        pivot.add(beamMesh);

        casinoExtGrp.add(pivot);
        exteriorState.skySearchlights.push({
          pivot,
          phase: sp.phase,
          speedX: sp.sx,
          speedZ: sp.sz,
        });
      }
      cBatch.flush(casinoExtGrp);

      const nBatch = createBatchBuilder(clubExtGrp);
      const clubRoofY = CLUB_EXT.terraceY + CLUB_EXT.roofHeight + 0.1;
      const clubSpots = [
        { x: -136.2, y: clubRoofY, z: -109.5, mat: mats.laserMagenta, phase: 0.5, sx: 1.35, sz: 0.95 },
        { x: -136.2, y: clubRoofY, z: -80.5, mat: mats.laserCyan, phase: 2.3, sx: -1.25, sz: 1.15 },
      ];
      for (const sp of clubSpots) {
        nBatch.add(prims.cyl16, mats.blackSteel, sp.x, sp.y + 0.25, sp.z, 0, 0, 0, 0.68, 0.50, 0.68);
        const pivot = new THREE.Group();
        pivot.position.set(sp.x, sp.y + 0.52, sp.z);
        const beamGeo = new THREE.ConeGeometry(3.2, 32.0, 16, 1, true);
        beamGeo.rotateX(Math.PI);
        beamGeo.translate(0, 16.0, 0);
        const beamMesh = new THREE.Mesh(beamGeo, sp.mat);
        pivot.add(beamMesh);
        clubExtGrp.add(pivot);
        exteriorState.skySearchlights.push({
          pivot,
          phase: sp.phase,
          speedX: sp.sx,
          speedZ: sp.sz,
        });
      }
      nBatch.flush(clubExtGrp);
    }

    // ------------------------------------------------------------------------
    // 19.2 Casino Interior — South-East High-Roller Whiskey Salon, Quick-Chip
    //      ATM Kiosks, Art-Deco Floor Lamps & Wall Jackpot Tickers!
    // ------------------------------------------------------------------------
    {
      const batch = createBatchBuilder(casinoIntRoot);
      const floorY = CASINO_INT.floorY;

      // South-East Velvet Whiskey & Cigar Lounge Alcove (X in [1208.5, 1215.5], Z in [1217.8, 1221.6])
      const lx = 1212.0;
      const lz = 1219.8;
      batch.add(prims.box, mats.crimsonVelvet, lx, floorY + 0.26, lz + 1.1, 0, 0, 0, 4.4, 0.48, 0.95);
      batch.add(prims.box, mats.crimsonVelvet, lx, floorY + 0.66, lz + 1.52, 0, 0, 0, 4.4, 0.54, 0.22);
      batch.add(prims.box, mats.crimsonVelvet, lx - 2.05, floorY + 0.26, lz + 0.1, 0, 0, 0, 0.88, 0.48, 2.2);
      batch.add(prims.box, mats.crimsonVelvet, lx + 2.05, floorY + 0.26, lz + 0.1, 0, 0, 0, 0.88, 0.48, 2.2);
      // Marble Coffee Table + Crystal Decanter + 3 Whiskey Tumblers + Gold Humidor Box
      batch.add(prims.box, mats.blackGoldMarble, lx, floorY + 0.42, lz, 0, 0, 0, 2.2, 0.08, 1.05);
      batch.add(prims.box, mats.gold24k, lx - 0.85, floorY + 0.20, lz, 0, 0, 0, 0.12, 0.38, 0.85);
      batch.add(prims.box, mats.gold24k, lx + 0.85, floorY + 0.20, lz, 0, 0, 0, 0.12, 0.38, 0.85);
      addSculptedLiquorBottle(batch, mats, lx - 0.35, floorY + 0.46, lz, 1, 1.1);
      addCocktailGlassOnBar(batch, mats, lx - 0.05, floorY + 0.46, lz + 0.14, 1);
      addCocktailGlassOnBar(batch, mats, lx + 0.18, floorY + 0.46, lz - 0.12, 1);
      batch.add(prims.box, mats.mahoganyWood, lx + 0.55, floorY + 0.52, lz, 0, 0.18, 0, 0.38, 0.12, 0.26);
      addInteriorAABB(lx - 2.45, lx + 2.45, lz - 0.95, lz + 1.65, 1.1, 0, 'casino_whiskey_salon');

      // 2 Self-Service VIP Chip & ATM Kiosks along South Foyer Wall (1193.5, 1221.8) & (1206.5, 1221.8)
      for (const kx of [1193.5, 1206.5]) {
        const kz = 1222.1;
        batch.add(prims.box, mats.darkGunmetal, kx, floorY + 0.98, kz, 0, 0, 0, 0.88, 1.96, 0.68, { castShadow: true });
        batch.add(prims.box, mats.gold24k, kx, floorY + 2.02, kz, 0, 0, 0, 0.94, 0.12, 0.74);
        batch.add(prims.box, mats.neonCyan, kx, floorY + 1.32, kz - 0.35, 0.16, 0, 0, 0.58, 0.46, 0.04);
        batch.add(prims.box, mats.neonEmerald, kx + 0.20, floorY + 0.96, kz - 0.35, 0, 0, 0, 0.16, 0.03, 0.04);
        addInteriorAABB(kx - 0.48, kx + 0.48, kz - 0.42, kz + 0.42, 2.1, 0, 'casino_atm_kiosk');
      }

      // 6 Tall Art-Deco Brass & Warm-Silk Floor Lamps Illuminating Gaming Aisles
      const lampSpots = [
        [1189.2, 1212.2], [1210.8, 1212.2],
        [1189.2, 1195.2], [1210.8, 1195.2],
        [1189.2, 1182.8], [1210.8, 1182.8],
      ];
      for (const [fx, fz] of lampSpots) {
        batch.add(prims.cyl16, mats.gold24k, fx, floorY + 0.04, fz, 0, 0, 0, 0.44, 0.08, 0.44);
        batch.add(prims.cyl8, mats.gold24k, fx, floorY + 1.05, fz, 0, 0, 0, 0.05, 1.98, 0.05);
        batch.add(prims.cone16, mats.neonGold, fx, floorY + 2.12, fz, 0, 0, 0, 0.62, 0.42, 0.62);
      }

      // 8 Ceiling-Mounted Tinted Security CCTV Domes watching Every High-Limit Pit!
      const cctvSpots = [
        [1180, 1212], [1184, 1194], [1188, 1182], [1200, 1182],
        [1208, 1182], [1215, 1193], [1216, 1208], [1200, 1218],
      ];
      for (const [cx, cz] of cctvSpots) {
        batch.add(prims.cyl16, mats.gold24k, cx, 9.38, cz, 0, 0, 0, 0.34, 0.10, 0.34);
        batch.add(prims.sphere10, mats.tintedCanopyGlass, cx, 9.28, cz, 0, 0, 0, 0.26, 0.22, 0.26);
      }

      batch.flush(casinoIntRoot);
    }

    // ------------------------------------------------------------------------
    // 19.3 Túy Tiên Lâu Interior — Glowing "Angel of Eclipse" Neon Selfie Wings,
    //      LED High-Top Cocktail Tables & Rotating Industrial Ceiling Fans!
    // ------------------------------------------------------------------------
    {
      const batch = createBatchBuilder(clubIntRoot);
      const floorY = CLUB_INT.floorY;

      // Sculpted Neon Cyan/Magenta "Angel of Eclipse" Wings on South-West Lounge Wall (1494.2, 1.65, 1516.72)
      const wx = 1494.2;
      const wz = 1516.72;
      for (const side of [-1, 1]) {
        for (let f = 0; f < 7; f++) {
          const ang = side * (0.24 + f * 0.16);
          const len = 1.25 - f * 0.11;
          batch.add(
            prims.box,
            f % 2 === 0 ? mats.neonCyan : mats.neonMagenta,
            wx + side * (0.38 + f * 0.12),
            1.95 - f * 0.13,
            wz,
            0, 0, ang,
            len, 0.055, 0.04
          );
        }
      }
      batch.add(prims.torus16, mats.neonGold, wx, 2.58, wz, 0, 0, 0, 0.48, 0.18, 0.5);

      // 4 Standing LED High-Top Cocktail Pod Tables between Bar & Dancefloor / Pool Lounge!
      const podSpots = [
        [1490.2, 1493.8],
        [1490.2, 1502.2],
        [1509.4, 1500.2],
        [1509.4, 1507.2],
      ];
      for (let pi = 0; pi < podSpots.length; pi++) {
        const [px, pz] = podSpots[pi];
        batch.add(prims.cyl16, mats.liquidChrome, px, floorY + 0.03, pz, 0, 0, 0, 0.48, 0.05, 0.48);
        batch.add(prims.cyl8, mats.liquidChrome, px, floorY + 0.56, pz, 0, 0, 0, 0.07, 1.04, 0.07);
        batch.add(prims.cyl16, mats.obsidianFloor, px, floorY + 1.10, pz, 0, 0, 0, 0.76, 0.06, 0.76);
        batch.add(
          prims.torus16,
          pi % 2 === 0 ? mats.neonMagenta : mats.neonCyan,
          px,
          floorY + 1.10,
          pz,
          Math.PI * 0.5, 0, 0,
          0.78, 0.78, 0.55
        );
        addCocktailGlassOnBar(batch, mats, px - 0.14, floorY + 1.13, pz + 0.08, pi);
        addCocktailGlassOnBar(batch, mats, px + 0.15, floorY + 1.13, pz - 0.10, pi + 3);
        addInteriorAABB(px - 0.42, px + 0.42, pz - 0.42, pz + 0.42, 1.2, 0, 'club_pod_table');
      }

      // 3 Rotating Giant Industrial Club Ceiling Exhaust Fans at y = 8.15m!
      clubIntState.ceilingFans = [];
      for (const fanX of [1488.0, 1500.0, 1512.0]) {
        const fanZ = 1509.0;
        batch.add(prims.torus16, mats.darkGunmetal, fanX, 8.18, fanZ, Math.PI * 0.5, 0, 0, 2.35, 2.35, 0.85);
        const fanGrp = new THREE.Group();
        fanGrp.position.set(fanX, 8.16, fanZ);
        const hub = new THREE.Mesh(prims.cyl16, mats.liquidChrome);
        hub.scale.set(0.34, 0.14, 0.34);
        fanGrp.add(hub);
        for (let bl = 0; bl < 5; bl++) {
          const ba = (bl / 5) * TAU;
          const blade = new THREE.Mesh(prims.box, mats.blackSteel);
          blade.position.set(Math.cos(ba) * 0.56, 0, Math.sin(ba) * 0.56);
          blade.rotation.set(0.22, -ba, 0, 'YXZ');
          blade.scale.set(0.92, 0.025, 0.22);
          fanGrp.add(blade);
        }
        clubIntRoot.add(fanGrp);
        clubIntState.ceilingFans.push(fanGrp);
      }

      batch.flush(clubIntRoot);
    }
  }

  // --------------------------------------------------------------------------
  // 20. ART-DECO GUARDIAN STATUES, HOLOGRAPHIC PODIUM TELEMETRY RING,
  //     DYNAMIC PROGRESSIVE JACKPOT / DJ HYPE DISPLAYS, POOLED 3D CONFETTI &
  //     SPARKLER ENGINE, AND MUFFLED EXTERIOR SUB-BASS WEB AUDIO AURA
  // --------------------------------------------------------------------------
  function buildDynamicDisplaysGuardiansAndHolo(
    casinoExtGrp,
    casinoIntRoot,
    clubIntRoot,
    mats,
    exteriorState,
    casinoIntState,
    clubIntState
  ) {
    // 20.1 Sculpted Geometric Art-Deco Golden Lion Guardians Flanking Casino Red Carpet!
    {
      const cBatch = createBatchBuilder(casinoExtGrp);
      const baseY = CASINO_EXT.sidewalkY;

      for (const gz of [-113.4, -106.6]) {
        const gx = 211.8;
        // Stepped Obsidian & Gold Plinth
        cBatch.add(prims.box, mats.blackGoldMarble, gx, baseY + 0.34, gz, 0, 0, 0, 1.65, 0.68, 0.96);
        cBatch.add(prims.box, mats.gold24k, gx, baseY + 0.71, gz, 0, 0, 0, 1.72, 0.07, 1.02);
        // Sculpted Seated Art-Deco Lion Body, Chest Mane, Head & Forepaws Facing West (-X)
        cBatch.add(prims.box, mats.gold24k, gx + 0.16, baseY + 1.08, gz, 0, 0, 0.28, 0.86, 0.56, 0.48, { castShadow: true });
        cBatch.add(prims.octa, mats.gold24k, gx - 0.22, baseY + 1.38, gz, 0, 0, 0, 0.62, 0.68, 0.58, { castShadow: true });
        cBatch.add(prims.box, mats.gold24k, gx - 0.46, baseY + 1.52, gz, 0, 0, 0, 0.38, 0.34, 0.36);
        cBatch.add(prims.box, mats.gold24k, gx - 0.42, baseY + 0.84, gz - 0.16, 0, 0, 0, 0.52, 0.18, 0.14);
        cBatch.add(prims.box, mats.gold24k, gx - 0.42, baseY + 0.84, gz + 0.16, 0, 0, 0, 0.52, 0.18, 0.14);
        // Glowing Purple Diamond Eyes on Guardian Lions
        cBatch.add(prims.sphere10, mats.neonPurple, gx - 0.65, baseY + 1.56, gz - 0.09, 0, 0, 0, 0.06, 0.06, 0.06);
        cBatch.add(prims.sphere10, mats.neonPurple, gx - 0.65, baseY + 1.56, gz + 0.09, 0, 0, 0, 0.06, 0.06, 0.06);
        addExteriorAABB(gx - 0.88, gx + 0.88, gz - 0.52, gz + 0.52, baseY + 1.9, 0, 'casino_lion_guardian');
      }

      // Roadside Gold Bollards with Glowing Tops along Curb (leaving Porte-Cochère mouths open!)
      for (const bz of [-148, -142, -132, -85, -70]) {
        cBatch.add(prims.cyl16, mats.gold24k, 208.55, baseY + 0.45, bz, 0, 0, 0, 0.22, 0.90, 0.22);
        cBatch.add(prims.sphere10, mats.neonGold, 208.55, baseY + 0.95, bz, 0, 0, 0, 0.24, 0.24, 0.24);
      }

      cBatch.flush(casinoExtGrp);
    }

    // 20.2 Casino Interior — Rotating 3D Holographic Podium Spec Ring & Live Progressive Jackpot Wall Board!
    {
      const holoTex = createProceduralCanvasTexture(1024, 128, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.fillStyle = 'rgba(18, 8, 38, 0.58)';
        g.fillRect(0, 18, w, h - 36);
        g.strokeStyle = '#00f0ff';
        g.lineWidth = 3;
        g.strokeRect(0, 18, w, h - 36);
        g.fillStyle = '#ffe885';
        g.font = 'bold 34px sans-serif';
        g.textAlign = 'center';
        g.fillText(
          '★ GIẢI ĐẶC BIỆT: ZENTORNO 24K GOLD • V12 TWIN-TURBO • QUAY LUCKY WHEEL TRÚNG NGAY ★',
          w * 0.5,
          76
        );
      });
      const holoMat = new THREE.MeshBasicMaterial({
        map: holoTex,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const holoBand = new THREE.Mesh(
        new THREE.CylinderGeometry(3.55, 3.55, 0.44, 40, 1, true),
        holoMat
      );
      holoBand.position.set(CASINO_INT.podium.x, 1.92, CASINO_INT.podium.z);
      casinoIntRoot.add(holoBand);
      casinoIntState.podiumHoloBand = holoBand;

      // Live Updating Interior Jackpot & VIP Status Board above South Exit Arch!
      const liveCasinoBoardTex = createProceduralCanvasTexture(512, 128, (g, w, h) => {
        g.fillStyle = '#110622';
        g.fillRect(0, 0, w, h);
      }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
      const liveBoardMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(5.6, 1.35),
        new THREE.MeshBasicMaterial({ map: liveCasinoBoardTex })
      );
      liveBoardMesh.position.set(1200.0, 5.25, 1222.65);
      liveBoardMesh.rotation.y = Math.PI;
      casinoIntRoot.add(liveBoardMesh);
      casinoIntState.liveCasinoBoardTex = liveCasinoBoardTex;
    }

    // 20.3 Túy Tiên Lâu Interior — 6 Pulsing Neon Hex-Pillars & Live DJ BPM / Club Hype Monitor!
    {
      const batch = createBatchBuilder(clubIntRoot);
      const floorY = CLUB_INT.floorY;

      clubIntState.beatPillars = [];
      const hexCoords = [
        [1493.8, 1495.0], [1506.2, 1495.0],
        [1493.8, 1501.0], [1506.2, 1501.0],
        [1497.0, 1491.4], [1503.0, 1491.4],
      ];
      for (let hi = 0; hi < hexCoords.length; hi++) {
        const [hx, hz] = hexCoords[hi];
        batch.add(prims.cyl8, mats.blackSteel, hx, floorY + 0.18, hz, 0, 0, 0, 0.42, 0.36, 0.42);
        const core = new THREE.Mesh(
          prims.cyl8,
          hi % 2 === 0 ? mats.neonCyan : mats.neonMagenta
        );
        core.position.set(hx, floorY + 1.35, hz);
        core.scale.set(0.18, 2.0, 0.18);
        clubIntRoot.add(core);
        clubIntState.beatPillars.push(core);
      }

      const liveClubBoardTex = createProceduralCanvasTexture(512, 128, (g, w, h) => {
        g.fillStyle = '#070614';
        g.fillRect(0, 0, w, h);
      }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
      const clubBoardMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(4.8, 1.18),
        new THREE.MeshBasicMaterial({ map: liveClubBoardTex })
      );
      clubBoardMesh.position.set(1500.0, 5.15, 1516.65);
      clubBoardMesh.rotation.y = Math.PI;
      clubIntRoot.add(clubBoardMesh);
      clubIntState.liveClubBoardTex = liveClubBoardTex;

      batch.flush(clubIntRoot);
    }
  }

  function redrawLiveVenueStatusBoards(casinoIntState, clubIntState, exteriorState, elapsed, activeCtx) {
    const jackpotVal = 2888777 + Math.floor(elapsed * 47);
    const formattedJackpot = '$' + jackpotVal.toLocaleString('en-US');

    // Update Exterior Roadside Progressive Jackpot Ticker
    if (exteriorState.jackpotTickerTex?.userData?.ctx2d) {
      const g = exteriorState.jackpotTickerTex.userData.ctx2d;
      const w = 512, h = 96;
      g.fillStyle = '#120520';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#ffd54f';
      g.lineWidth = 4;
      g.strokeRect(4, 4, w - 8, h - 8);
      g.fillStyle = '#ffe885';
      g.font = 'bold 31px monospace';
      g.textAlign = 'center';
      g.fillText(`JACKPOT: ${formattedJackpot}`, w * 0.5, 58);
      exteriorState.jackpotTickerTex.needsUpdate = true;
    }

    // Update Casino Interior Live Jackpot & Player Chips Board
    if (casinoIntState.liveCasinoBoardTex?.userData?.ctx2d) {
      const g = casinoIntState.liveCasinoBoardTex.userData.ctx2d;
      const w = 512, h = 128;
      g.fillStyle = '#120624';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#ffd54f';
      g.lineWidth = 4;
      g.strokeRect(5, 5, w - 10, h - 10);

      const chips = Math.floor(Number(activeCtx?.casinoGames?.chips) || 0);
      const debt = Math.floor(Number(activeCtx?.casinoGames?.loanDebt) || 0);
      g.fillStyle = '#ffe885';
      g.font = 'bold 26px sans-serif';
      g.textAlign = 'center';
      g.fillText(`💎 NỔ HŨ DIAMOND 777: ${formattedJackpot}`, w * 0.5, 48);
      g.fillStyle = debt > 0 ? '#ff6b88' : '#5cf2b8';
      g.font = 'bold 19px sans-serif';
      g.fillText(
        debt > 0
          ? `PHỈNH CỦA BẠN: ${chips.toLocaleString('en-US')} • NỢ VAY NÓNG: ${debt.toLocaleString('en-US')}`
          : `PHỈNH HIỆN CÓ: ${chips.toLocaleString('en-US')} • CHÚC QUÝ KHÁCH ĐẠI THẮNG!`,
        w * 0.5,
        92
      );
      casinoIntState.liveCasinoBoardTex.needsUpdate = true;
    }

    // Update Túy Tiên Lâu Live DJ BPM & Popularity / Intoxication Board
    if (clubIntState.liveClubBoardTex?.userData?.ctx2d) {
      const g = clubIntState.liveClubBoardTex.userData.ctx2d;
      const w = 512, h = 128;
      g.fillStyle = '#070614';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#00f0ff';
      g.lineWidth = 4;
      g.strokeRect(5, 5, w - 10, h - 10);

      const tracks = [
        'DEL PERRO DEEP HOUSE • 128 BPM',
        'VINEWOOD CYBER TECHNO • 128 BPM',
        'PACIFIC SUNSET RAVE • 128 BPM',
      ];
      const trk = tracks[Math.floor(elapsed / 24) % tracks.length];
      const hype = Math.round(Number(activeCtx?.nightlife?.clubPopularity) || 85);
      const drunk = Math.round(Number(activeCtx?.nightlife?.drunkLevel) || 0);

      g.fillStyle = '#ff4dd2';
      g.font = 'bold 23px sans-serif';
      g.textAlign = 'center';
      g.fillText(`🎧 ${trk}`, w * 0.5, 48);
      g.fillStyle = '#00f0ff';
      g.font = 'bold 18px sans-serif';
      g.fillText(`ĐỘ SUNG CLUB: ${hype}% • ĐỘ CỒN MÁU: ${drunk}%`, w * 0.5, 92);
      clubIntState.liveClubBoardTex.needsUpdate = true;
    }
  }

  // --------------------------------------------------------------------------
  // POOLED 3D CELEBRATION PARTICLE ENGINE (CONFETTI + COINS + SPARKLERS)
  // --------------------------------------------------------------------------
  function createVenueCelebrationFX(casinoIntRoot, clubIntRoot) {
    const MAX_CONFETTI = 144;
    const MAX_SPARKS = 120;
    const dummy = new THREE.Object3D();
    const hideMat = composeMatrix(0, -999, 0, 0, 0, 0, 0.001, 0.001, 0.001);

    // 1. Casino 24K Gold / Magenta / Cyan Confetti InstancedMesh
    const confettiGeo = new THREE.PlaneGeometry(0.11, 0.20);
    const confettiMat = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
    });
    const confettiInst = new THREE.InstancedMesh(confettiGeo, confettiMat, MAX_CONFETTI);
    confettiInst.frustumCulled = false;
    const confPalette = [
      new THREE.Color(0xffd54f),
      new THREE.Color(0xff1ea8),
      new THREE.Color(0x00f0ff),
      new THREE.Color(0xffffff),
      new THREE.Color(0xb53cff),
    ];
    const confettiPool = [];
    for (let i = 0; i < MAX_CONFETTI; i++) {
      confettiInst.setMatrixAt(i, hideMat);
      confettiInst.setColorAt(i, confPalette[i % confPalette.length]);
      confettiPool.push({
        active: false,
        x: 1200, y: -999, z: 1200,
        vx: 0, vy: 0, vz: 0,
        rx: 0, ry: 0, rz: 0,
        avx: 0, avy: 0,
        age: 0, life: 1,
      });
    }
    confettiInst.instanceMatrix.needsUpdate = true;
    if (confettiInst.instanceColor) confettiInst.instanceColor.needsUpdate = true;
    casinoIntRoot.add(confettiInst);

    // 2. Túy Tiên Lâu Golden/Cyan Sparkler Star InstancedMesh
    const sparkGeo = new THREE.OctahedronGeometry(0.065, 0);
    const sparkMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparkInst = new THREE.InstancedMesh(sparkGeo, sparkMat, MAX_SPARKS);
    sparkInst.frustumCulled = false;
    const sparkPalette = [
      new THREE.Color(0xffe066),
      new THREE.Color(0xffffff),
      new THREE.Color(0x00f5ff),
      new THREE.Color(0xff4dd2),
    ];
    const sparkPool = [];
    for (let i = 0; i < MAX_SPARKS; i++) {
      sparkInst.setMatrixAt(i, hideMat);
      sparkInst.setColorAt(i, sparkPalette[i % sparkPalette.length]);
      sparkPool.push({
        active: false,
        x: 1500, y: -999, z: 1498,
        vx: 0, vy: 0, vz: 0,
        age: 0, life: 1,
      });
    }
    sparkInst.instanceMatrix.needsUpdate = true;
    if (sparkInst.instanceColor) sparkInst.instanceColor.needsUpdate = true;
    clubIntRoot.add(sparkInst);

    let confCursor = 0;
    let sparkCursor = 0;
    let jackpotTimer = 0;
    let sparklerTimer = 0;

    function emitConfettiBurst(cx = 1200, cy = 6.8, cz = 1200, count = 72) {
      for (let i = 0; i < count; i++) {
        const p = confettiPool[confCursor];
        confCursor = (confCursor + 1) % MAX_CONFETTI;
        p.active = true;
        const a = Math.random() * TAU;
        const r = Math.random() * 4.2;
        p.x = cx + Math.cos(a) * r;
        p.y = cy + (Math.random() - 0.5) * 1.4;
        p.z = cz + Math.sin(a) * r;
        p.vx = Math.cos(a) * (0.8 + Math.random() * 2.4);
        p.vy = 1.2 + Math.random() * 2.6;
        p.vz = Math.sin(a) * (0.8 + Math.random() * 2.4);
        p.rx = Math.random() * TAU;
        p.ry = Math.random() * TAU;
        p.rz = Math.random() * TAU;
        p.avx = (Math.random() - 0.5) * 9.0;
        p.avy = (Math.random() - 0.5) * 9.0;
        p.age = 0;
        p.life = 2.8 + Math.random() * 1.8;
      }
    }

    function emitSparklerFountain(cx = 1492.3, cy = 1.95, cz = 1505.5, count = 24) {
      for (let i = 0; i < count; i++) {
        const s = sparkPool[sparkCursor];
        sparkCursor = (sparkCursor + 1) % MAX_SPARKS;
        s.active = true;
        const a = Math.random() * TAU;
        const spread = 0.4 + Math.random() * 1.8;
        s.x = cx + (Math.random() - 0.5) * 1.4;
        s.y = cy;
        s.z = cz + (Math.random() - 0.5) * 0.4;
        s.vx = Math.cos(a) * spread;
        s.vy = 2.8 + Math.random() * 4.2;
        s.vz = Math.sin(a) * spread;
        s.age = 0;
        s.life = 0.55 + Math.random() * 0.45;
      }
    }

    return {
      triggerJackpot(duration = 6.5) {
        jackpotTimer = Math.max(jackpotTimer, duration);
        emitConfettiBurst(1200, 7.2, 1200, 96);
      },
      triggerSparklers(duration = 7.0) {
        sparklerTimer = Math.max(sparklerTimer, duration);
        emitSparklerFountain(1492.3, 1.95, 1505.5, 36);
      },
      isJackpotCelebrating() {
        return jackpotTimer > 0;
      },
      isSparklerCelebrating() {
        return sparklerTimer > 0;
      },
      update(dt, inCasino, inNightclub) {
        if (jackpotTimer > 0) {
          jackpotTimer = Math.max(0, jackpotTimer - dt);
          if (inCasino && Math.random() < dt * 6.0) {
            emitConfettiBurst(1200, 7.4, 1200, 14);
          }
        }
        if (sparklerTimer > 0) {
          sparklerTimer = Math.max(0, sparklerTimer - dt);
          if (inNightclub && Math.random() < dt * 12.0) {
            emitSparklerFountain(1492.3, 2.05, 1505.5, 12);
            emitSparklerFountain(1500.0, 1.85, 1491.2, 10);
          }
        }

        if (inCasino) {
          let dirtyC = false;
          for (let i = 0; i < MAX_CONFETTI; i++) {
            const p = confettiPool[i];
            if (!p.active) continue;
            dirtyC = true;
            p.age += dt;
            if (p.age >= p.life || p.y < 0.04) {
              p.active = false;
              confettiInst.setMatrixAt(i, hideMat);
              continue;
            }
            p.vy -= 2.4 * dt; // Gentle fluttering air-drag descent!
            p.vx *= Math.max(0, 1 - 1.4 * dt);
            p.vz *= Math.max(0, 1 - 1.4 * dt);
            p.x += (p.vx + Math.sin(p.age * 6.0 + i) * 0.45) * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.rx += p.avx * dt;
            p.ry += p.avy * dt;

            dummy.position.set(p.x, p.y, p.z);
            dummy.rotation.set(p.rx, p.ry, p.rz);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            confettiInst.setMatrixAt(i, dummy.matrix);
          }
          if (dirtyC) confettiInst.instanceMatrix.needsUpdate = true;
        }

        if (inNightclub) {
          let dirtyS = false;
          for (let i = 0; i < MAX_SPARKS; i++) {
            const s = sparkPool[i];
            if (!s.active) continue;
            dirtyS = true;
            s.age += dt;
            if (s.age >= s.life) {
              s.active = false;
              sparkInst.setMatrixAt(i, hideMat);
              continue;
            }
            s.vy -= 9.5 * dt;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.z += s.vz * dt;
            const sc = Math.max(0.05, 1.0 - s.age / s.life);
            dummy.position.set(s.x, s.y, s.z);
            dummy.rotation.set(s.age * 8.0, i, 0);
            dummy.scale.setScalar(sc);
            dummy.updateMatrix();
            sparkInst.setMatrixAt(i, dummy.matrix);
          }
          if (dirtyS) sparkInst.instanceMatrix.needsUpdate = true;
        }
      },
    };
  }

  // --------------------------------------------------------------------------
  // MUFFLED EXTERIOR SUB-BASS HEARTBEAT SYNTH OUTSIDE CLUB ECLIPSE (-129, -95)
  // --------------------------------------------------------------------------
  let _lastSubBassBeatIndex = -1;

  function updateExteriorSubBassAura(elapsed, px, pz, activeCtx) {
    // Only audible when outdoors within 26m of Túy Tiên Lâu (-129, -95)
    const dist = Math.hypot(px - CLUB_EXT.entryCorona.x, pz - CLUB_EXT.entryCorona.z);
    if (dist > 26.0 || activeCtx?.paused || !activeCtx?.started) return;

    const audioCtx = activeCtx?.audio?.ctx || activeCtx?.audio?.audioCtx;
    if (!audioCtx || audioCtx.state !== 'running') return;

    const beatIndex = Math.floor(elapsed * (128.0 / 60.0));
    if (beatIndex === _lastSubBassBeatIndex) return;
    _lastSubBassBeatIndex = beatIndex;

    try {
      const atten = Math.pow(clamp(1.0 - dist / 26.0, 0, 1), 1.8) * 0.14;
      if (atten < 0.008) return;

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(92, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.19);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(115, now);

      gain.gain.setValueAtTime(atten, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.24);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (_) {
      // Non-fatal if browser audio graph is busy or unavailable
    }
  }

  // --------------------------------------------------------------------------
  // 21. ARCHITECTURAL FINISHING SUITE:
  //     CASINO PIT-BOSS STAND, CRYSTAL CHAMPAGNE PYRAMID, ROTATING 777 CROWNS,
  //     PORTE-COCHERE CHANDELIER, TOPIARY GARDENS & CLUB GO-GO RISER CUBES
  // --------------------------------------------------------------------------
  const colHedge = new THREE.Color(0x1b5e36);

  function buildArchitecturalFinishingSuite(
    casinoExtGrp,
    clubExtGrp,
    casinoIntRoot,
    clubIntRoot,
    mats,
    exteriorState,
    casinoIntState,
    clubIntState
  ) {
    // ------------------------------------------------------------------------
    // 21.1 Vạn Bảo Đổ Phường Exterior — Porte-Cochere Chandelier, Topiary Diamond
    //      Hedge Gardens & Resort Tower Penthouse Cupola!
    // ------------------------------------------------------------------------
    {
      const batch = createBatchBuilder(casinoExtGrp);
      const baseY = CASINO_EXT.sidewalkY;

      // Underside Porte-Cochere Crystal Chandelier welcoming VIPs at (212.8, baseY + 5.25, -110.0)
      batch.add(prims.torus32, mats.gold24k, 212.8, baseY + 5.28, -110.0, Math.PI * 0.5, 0, 0, 2.6, 2.6, 0.9);
      for (let c = 0; c < 12; c++) {
        const ca = (c / 12) * TAU;
        batch.add(
          prims.octa,
          mats.chandelierCrystal,
          212.8 + Math.cos(ca) * 1.25,
          baseY + 5.05,
          -110.0 + Math.sin(ca) * 1.25,
          0, ca, 0,
          0.14, 0.36, 0.14
        );
      }
      batch.add(prims.octa, mats.crystalDiamond, 212.8, baseY + 4.88, -110.0, 0, 0, 0, 0.38, 0.45, 0.38);

      // Manicured Resort Boxwood Hedge Beds & Glowing Gold Topiary Diamonds along North & South Forecourt
      const gardenBeds = [
        { x: 214.2, z: -146.5, lenZ: 6.4 },
        { x: 214.2, z: -70.2, lenZ: 4.2 },
        { x: 247.5, z: -149.2, lenZ: 5.0 },
        { x: 247.5, z: -70.8, lenZ: 5.0 },
      ];
      for (const gb of gardenBeds) {
        batch.add(prims.box, mats.calacattaMarble, gb.x, baseY + 0.22, gb.z, 0, 0, 0, 1.9, 0.44, gb.lenZ);
        batch.add(prims.box, mats.vertexStd, gb.x, baseY + 0.65, gb.z, 0, 0, 0, 1.5, 0.56, gb.lenZ - 0.4, { color: colHedge });
        batch.add(prims.octa, mats.gold24k, gb.x, baseY + 1.28, gb.z - gb.lenZ * 0.28, 0, 0, 0, 0.52, 0.72, 0.52);
        batch.add(prims.octa, mats.gold24k, gb.x, baseY + 1.28, gb.z + gb.lenZ * 0.28, 0, 0, 0, 0.52, 0.72, 0.52);
      }

      // 58m Rooftop Helipad Access Penthouse Elevator Cupola at (260.9, 58.6m, -120.2)
      const roofY = baseY + 58.35;
      batch.add(prims.box, mats.blackGoldMarble, 260.9, roofY + 1.45, -120.2, 0, 0, 0, 4.4, 2.9, 3.6);
      batch.add(prims.box, mats.gold24k, 260.9, roofY + 2.98, -120.2, 0, 0, 0, 4.7, 0.18, 3.9);
      batch.add(prims.box, mats.neonGold, 260.9, roofY + 1.35, -118.36, 0, 0, 0, 1.45, 2.2, 0.08);

      batch.flush(casinoExtGrp);
    }

    // ------------------------------------------------------------------------
    // 21.2 Casino Interior — Pit-Boss Monitoring Desk, 4-Tier Mezzanine Crystal
    //      Champagne Pyramid & Rotating "777 JACKPOT" Slot Aisle Crowns!
    // ------------------------------------------------------------------------
    {
      const batch = createBatchBuilder(casinoIntRoot);
      const floorY = CASINO_INT.floorY;
      const mezzY = CASINO_INT.mezzY;

      // Pit-Boss Raised Mahogany Supervision Stand at (1205.2, floorY, 1191.2)
      const pbx = 1205.2;
      const pbz = 1191.2;
      batch.add(prims.cyl16, mats.blackGoldMarble, pbx, floorY + 0.08, pbz, 0, 0, 0, 1.95, 0.16, 1.95);
      batch.add(prims.box, mats.mahoganyWood, pbx, floorY + 0.64, pbz + 0.35, 0, 0, 0, 1.28, 0.96, 0.58, { castShadow: true });
      batch.add(prims.box, mats.gold24k, pbx, floorY + 1.14, pbz + 0.35, 0, 0, 0, 1.36, 0.05, 0.66);
      for (const mOff of [-0.36, 0, 0.36]) {
        batch.add(prims.box, mats.blackSteel, pbx + mOff, floorY + 1.32, pbz + 0.38, -0.25, 0, 0, 0.30, 0.22, 0.03);
        batch.add(prims.box, mats.neonCyan, pbx + mOff, floorY + 1.32, pbz + 0.36, -0.25, 0, 0, 0.26, 0.18, 0.035);
      }

      const pitBoss = buildArticulatedVenueNPC(mats, 'high_roller', 425, { female: false });
      pitBoss.root.position.set(pbx, floorY + 0.16, pbz - 0.18);
      pitBoss.root.rotation.y = 0.25;
      casinoIntRoot.add(pitBoss.root);
      casinoIntState.npcs.push(pitBoss);
      addInteriorAABB(pbx - 0.95, pbx + 0.95, pbz - 0.95, pbz + 0.95, 1.4, 0, 'casino_pitboss_stand');

      // 4-Tier Crystal Champagne Pyramid Tower on Center Mezzanine Bridge (1200.0, 3.60, 1178.5)
      const cpx = 1200.0;
      const cpz = 1178.5;
      batch.add(prims.cyl24, mats.gold24k, cpx, mezzY + 0.44, cpz, 0, 0, 0, 1.18, 0.88, 1.18);
      batch.add(prims.cyl24, mats.obsidianFloor, cpx, mezzY + 0.90, cpz, 0, 0, 0, 1.26, 0.05, 1.26);
      batch.add(prims.torus16, mats.neonGold, cpx, mezzY + 0.92, cpz, Math.PI * 0.5, 0, 0, 1.28, 1.28, 0.6);

      for (let lv = 0; lv < 4; lv++) {
        const n = 4 - lv;
        const gy = mezzY + 0.98 + lv * 0.14;
        for (let ix = 0; ix < n; ix++) {
          for (let iz = 0; iz < n; iz++) {
            const gx = cpx + (ix - (n - 1) * 0.5) * 0.14;
            const gz = cpz + (iz - (n - 1) * 0.5) * 0.14;
            batch.add(prims.cone8, mats.crystalDiamond, gx, gy + 0.06, gz, Math.PI, 0, 0, 0.11, 0.08, 0.11);
            batch.add(prims.cyl8, mats.gold24k, gx, gy + 0.01, gz, 0, 0, 0, 0.02, 0.05, 0.02);
          }
        }
      }

      // Twin Rotating 3D Neon "777 JACKPOT" Crowns Suspended Above West (X=1177) & East (X=1223) Slot Rows!
      casinoIntState.slotAisleCrowns = [];
      for (const sx of [1177.2, 1222.8]) {
        const crownGrp = new THREE.Group();
        crownGrp.position.set(sx, 5.15, 1196.0);

        const outerHoop = new THREE.Mesh(prims.torus32, mats.neonMagenta);
        outerHoop.rotation.x = Math.PI * 0.5;
        outerHoop.scale.set(2.3, 2.3, 0.85);
        crownGrp.add(outerHoop);

        const innerHoop = new THREE.Mesh(prims.torus16, mats.neonGold);
        innerHoop.rotation.x = Math.PI * 0.5;
        innerHoop.position.y = 0.28;
        innerHoop.scale.set(1.75, 1.75, 0.85);
        crownGrp.add(innerHoop);

        const centerGem = new THREE.Mesh(prims.octa, mats.crystalDiamond);
        centerGem.position.y = 0.22;
        centerGem.scale.set(0.62, 0.92, 0.62);
        crownGrp.add(centerGem);

        casinoIntRoot.add(crownGrp);
        casinoIntState.slotAisleCrowns.push(crownGrp);
      }

      batch.flush(casinoIntRoot);
    }

    // ------------------------------------------------------------------------
    // 21.3 Túy Tiên Lâu Interior — Illuminated Acrylic Go-Go Dance Riser Cubes,
    //      Wall-Mounted Concert Surround Speakers & Backstage Green-Room Window!
    // ------------------------------------------------------------------------
    {
      const batch = createBatchBuilder(clubIntRoot);
      const floorY = CLUB_INT.floorY;

      // 2 Walkable Illuminated Go-Go Dance Riser Cubes flanking the LED Dancefloor!
      const gogoCubes = [
        { x: 1494.2, z: 1498.0, mat: mats.neonMagenta },
        { x: 1505.8, z: 1498.0, mat: mats.neonCyan },
      ];
      for (const gc of gogoCubes) {
        batch.add(prims.box, mats.obsidianFloor, gc.x, floorY + 0.26, gc.z, 0, 0, 0, 1.45, 0.52, 1.45, { receiveShadow: true });
        batch.add(prims.box, gc.mat, gc.x, floorY + 0.51, gc.z, 0, 0, 0, 1.48, 0.04, 1.48);
        batch.add(prims.box, gc.mat, gc.x, floorY + 0.04, gc.z, 0, 0, 0, 1.48, 0.04, 1.48);
      }

      // 8 Angled Wall-Mounted Club Surround Speaker Cabinets Aimed Down at Dancefloor
      const surroundSpots = [
        { x: 1481.45, z: 1493.0, ry: Math.PI * 0.5 },
        { x: 1481.45, z: 1503.0, ry: Math.PI * 0.5 },
        { x: 1518.55, z: 1491.0, ry: -Math.PI * 0.5 },
        { x: 1518.55, z: 1500.0, ry: -Math.PI * 0.5 },
        { x: 1518.55, z: 1508.5, ry: -Math.PI * 0.5 },
        { x: 1492.0, z: 1516.55, ry: Math.PI },
        { x: 1508.0, z: 1516.55, ry: Math.PI },
      ];
      for (const ss of surroundSpots) {
        batch.add(prims.box, mats.blackSteel, ss.x, 5.85, ss.z, 0.32, ss.ry, 0, 0.68, 0.98, 0.55);
        batch.add(prims.torus16, mats.neonCyan, ss.x + Math.sin(ss.ry) * 0.28, 5.78, ss.z + Math.cos(ss.ry) * 0.28, 0.32, ss.ry, 0, 0.44, 0.44, 0.7);
      }

      batch.flush(clubIntRoot);
    }
  }

  // --------------------------------------------------------------------------
  // 22. INSTANCED CHASING 3D MARQUEE BULBS, CORNER DISPLAY PAVILIONS,
  //     CLUB ROOFTOP SKY-TERRACE & 3D CONTEXTUAL STATION HOVER HALO
  // --------------------------------------------------------------------------
  function buildChasingBulbsPavilionsAndRooftopClub(
    casinoExtGrp,
    clubExtGrp,
    mats,
    exteriorState
  ) {
    const dummy = new THREE.Object3D();

    // ------------------------------------------------------------------------
    // 22.1 96 Instanced 3D Chasing Golden Marquee Bulbs on Vạn Bảo Đổ Phường Porte-Cochere!
    // ------------------------------------------------------------------------
    {
      const bulbCoords = [];
      const baseY = CASINO_EXT.sidewalkY;
      const archY = baseY + 6.12;

      // 48 Bulbs along West Front Edge of Porte-Cochere (Z in [-123.0 .. -97.0])
      for (let i = 0; i < 48; i++) {
        const bz = lerp(-122.8, -97.2, i / 47);
        bulbCoords.push({ x: 208.84, y: archY, z: bz });
      }
      // 24 Bulbs along North Edge & 24 Bulbs along South Edge
      for (let i = 0; i < 24; i++) {
        const bx = lerp(209.0, 216.2, i / 23);
        bulbCoords.push({ x: bx, y: archY, z: -123.12 });
      }
      for (let i = 0; i < 24; i++) {
        const bx = lerp(216.2, 209.0, i / 23);
        bulbCoords.push({ x: bx, y: archY, z: -96.88 });
      }

      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const bulbInst = new THREE.InstancedMesh(
        new THREE.SphereGeometry(0.095, 8, 8),
        bulbMat,
        bulbCoords.length
      );
      const colInit = new THREE.Color(0xffd54f);
      for (let i = 0; i < bulbCoords.length; i++) {
        const bc = bulbCoords[i];
        dummy.position.set(bc.x, bc.y, bc.z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        bulbInst.setMatrixAt(i, dummy.matrix);
        bulbInst.setColorAt(i, colInit);
      }
      bulbInst.instanceMatrix.needsUpdate = true;
      if (bulbInst.instanceColor) bulbInst.instanceColor.needsUpdate = true;
      casinoExtGrp.add(bulbInst);
      exteriorState.casinoMarqueeBulbInst = bulbInst;
      exteriorState.casinoMarqueeCount = bulbCoords.length;

      // Twin Curved Corner Showcase Pavilions at (218.2, baseY, -146.5) & (218.2, baseY, -71.5)
      const pBatch = createBatchBuilder(casinoExtGrp);
      exteriorState.windowHolograms = [];

      for (const pz of [-146.5, -71.5]) {
        const px = 218.4;
        pBatch.add(prims.cyl24, mats.blackGoldMarble, px, baseY + 0.35, pz, 0, 0, 0, 4.6, 0.70, 4.6);
        pBatch.add(prims.cyl24, mats.clearDomeGlass, px, baseY + 2.35, pz, 0, 0, 0, 4.2, 3.30, 4.2);
        pBatch.add(prims.cyl24, mats.gold24k, px, baseY + 4.18, pz, 0, 0, 0, 4.7, 0.36, 4.7);
        pBatch.add(prims.cone16, mats.gold24k, px, baseY + 4.95, pz, 0, 0, 0, 4.5, 1.25, 4.5);
        pBatch.add(prims.torus32, mats.neonPurple, px, baseY + 4.02, pz, Math.PI * 0.5, 0, 0, 4.75, 4.75, 0.7);

        // Rotating Giant Showcase Diamond Crown Hologram inside Pavilion Window!
        const holoGrp = new THREE.Group();
        holoGrp.position.set(px, baseY + 2.25, pz);
        const gem = new THREE.Mesh(prims.octa, mats.crystalDiamond);
        gem.scale.set(1.25, 1.85, 1.25);
        holoGrp.add(gem);
        const orbit = new THREE.Mesh(prims.torus16, mats.neonGold);
        orbit.rotation.x = 0.65;
        orbit.scale.set(2.1, 2.1, 0.8);
        holoGrp.add(orbit);
        casinoExtGrp.add(holoGrp);
        exteriorState.windowHolograms.push(holoGrp);

        addExteriorAABB(px - 2.3, px + 2.3, pz - 2.3, pz + 2.3, baseY + 5.5, 0, 'casino_corner_pavilion');
      }
      pBatch.flush(casinoExtGrp);
    }

    // ------------------------------------------------------------------------
    // 22.2 Túy Tiên Lâu Rooftop Sky-Lounge Terrace (y = 14.42m) & 40 Chasing
    //      Cyan/Magenta Canopy Bulbs!
    // ------------------------------------------------------------------------
    {
      const clubBulbCoords = [];
      const baseY = CLUB_EXT.terraceY;
      const canopyY = baseY + 4.62;
      for (let i = 0; i < 40; i++) {
        const bz = lerp(-99.7, -90.3, i / 39);
        clubBulbCoords.push({ x: -129.95, y: canopyY, z: bz });
      }
      const clubBulbInst = new THREE.InstancedMesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
        clubBulbCoords.length
      );
      const initCyan = new THREE.Color(0x00f0ff);
      for (let i = 0; i < clubBulbCoords.length; i++) {
        const bc = clubBulbCoords[i];
        dummy.position.set(bc.x, bc.y, bc.z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        clubBulbInst.setMatrixAt(i, dummy.matrix);
        clubBulbInst.setColorAt(i, initCyan);
      }
      clubBulbInst.instanceMatrix.needsUpdate = true;
      if (clubBulbInst.instanceColor) clubBulbInst.instanceColor.needsUpdate = true;
      clubExtGrp.add(clubBulbInst);
      exteriorState.clubMarqueeBulbInst = clubBulbInst;
      exteriorState.clubMarqueeCount = clubBulbCoords.length;

      // Club Rooftop Open-Air Sky-Bar & Glass Balustrade (visible from Coastal Avenue & Helicopters!)
      const rBatch = createBatchBuilder(clubExtGrp);
      const roofY = baseY + CLUB_EXT.roofHeight; // 14.42m
      // Perimeter Tempered Glass & Neon Balustrade along East & West Rooftop Edges
      rBatch.add(prims.box, mats.clearDomeGlass, -135.0, roofY + 0.58, -95.0, 0, 0, 0, 0.08, 1.12, 34.8);
      rBatch.add(prims.box, mats.neonCyan, -135.0, roofY + 1.16, -95.0, 0, 0, 0, 0.12, 0.06, 35.0);
      rBatch.add(prims.box, mats.clearDomeGlass, -164.2, roofY + 0.58, -95.0, 0, 0, 0, 0.08, 1.12, 34.8);
      rBatch.add(prims.box, mats.neonMagenta, -164.2, roofY + 1.16, -95.0, 0, 0, 0, 0.12, 0.06, 35.0);

      // 4 Glowing Rooftop VIP Cocktail Pods along East Skyline Overlook
      for (const rz of [-108.0, -101.5, -88.5, -82.0]) {
        rBatch.add(prims.cyl16, mats.obsidianFloor, -137.2, roofY + 0.55, rz, 0, 0, 0, 0.92, 1.08, 0.92);
        rBatch.add(prims.torus16, mats.neonMagenta, -137.2, roofY + 1.10, rz, Math.PI * 0.5, 0, 0, 0.96, 0.96, 0.6);
      }
      rBatch.flush(clubExtGrp);
    }
  }

  function createActiveStationHoverHalo() {
    const grp = new THREE.Group();
    grp.name = 'ActiveStationHoverHalo';
    grp.visible = false;

    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(1.05, 1.24, 36),
      new THREE.MeshBasicMaterial({
        color: 0xffe46b,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    outerRing.rotation.x = -Math.PI * 0.5;
    grp.add(outerRing);

    const chevron = new THREE.Mesh(
      prims.octa,
      new THREE.MeshBasicMaterial({
        color: 0x00f5ff,
        transparent: true,
        opacity: 0.88,
      })
    );
    chevron.position.y = 2.05;
    chevron.scale.set(0.24, 0.36, 0.24);
    grp.add(chevron);

    grp.userData.outerRing = outerRing;
    grp.userData.chevron = chevron;
    return grp;
  }

  // --------------------------------------------------------------------------
  // 23. MULTI-LEVEL GROUND HEIGHTFIELD, WORLD/CHARACTER PHYSICS HOOKS,
  //     DOOR TRANSITIONS, STATION QUERY & MASTER REAL-TIME UPDATE ENGINE
  // --------------------------------------------------------------------------
  let _initialized = false;
  let _elapsed = 0;
  let _statusBoardTimer = 0;
  let _derbyScreenTimer = 0;
  let _autoDoorCooldown = 0;
  let _lastKnownPodiumWon = false;

  const masterGroup = new THREE.Group();
  masterGroup.name = 'CasinoAndNightlifeWorldRoot';

  let texSuite = null;
  let mats = null;
  let casinoExteriorGroup = null;
  let clubExteriorGroup = null;
  let casinoInteriorRoot = null;
  let nightclubInteriorRoot = null;
  let celebrationFX = null;
  let hoverHalo = null;

  // Placeholder Group so api.podiumCarMesh is never null even prior to init()
  let podiumCarRef = new THREE.Group();

  const exteriorState = {
    npcs: [],
    fountainJets: [],
    clubNeonTubes: [],
    fireTorches: [],
    skySearchlights: [],
    windowHolograms: [],
    rotatingCrownBeacon: null,
    eclipseHaloGroup: null,
    casinoEntryCorona: null,
    vipSideCorona: null,
    clubEntryCorona: null,
    jackpotTickerTex: null,
    casinoMarqueeBulbInst: null,
    casinoMarqueeCount: 0,
    clubMarqueeBulbInst: null,
    clubMarqueeCount: 0,
  };

  const casinoIntState = {
    npcs: [],
    rings: [],
    chandelierLights: [],
    podiumSpotBeams: [],
    taixiuShakers: [],
    xocdiaBowls: [],
    rouletteWheels: [],
    slotMachines: [],
    foyerStatues: [],
    slotAisleCrowns: [],
    turntableGroup: null,
    podiumCarMesh: null,
    podiumHoloBand: null,
    liveCasinoBoardTex: null,
    luckyWheel: null,
    exitPortal: null,
    vaultLaserGrid: null,
    vaultHinge: null,
    vaultOpenTarget: 0,
    vaultOpenCurrent: 0,
  };

  const clubIntState = {
    npcs: [],
    rings: [],
    djPlatters: [],
    wooferCones: [],
    laserRigs: [],
    cryoPlumes: [],
    ceilingFans: [],
    beatPillars: [],
    bottleGirls: [],
    cryoMat: null,
    discoBall: null,
    paradeGroup: null,
    mainClubLight: null,
    barClubLight: null,
    liveClubBoardTex: null,
    exitPortal: null,
  };

  const _bulbColGold = new THREE.Color(0xffdf6b);
  const _bulbColPurple = new THREE.Color(0xc850ff);
  const _bulbColDim = new THREE.Color(0x3a2410);
  const _bulbColCyan = new THREE.Color(0x00f5ff);
  const _bulbColMagenta = new THREE.Color(0xff1ea8);
  const _bulbColScratch = new THREE.Color();

  function isPointInCasinoInterior(x, z) {
    return x >= 1166.0 && x <= 1234.0 && z >= 1170.0 && z <= 1230.0;
  }

  function isPointInNightclubInterior(x, z) {
    return x >= 1474.0 && x <= 1526.0 && z >= 1476.0 && z <= 1524.0;
  }

  function isInsideCasino(overrideCtx) {
    const p = (overrideCtx || ctx)?.player;
    if (!p) return false;
    return Boolean(p.inCasino) || isPointInCasinoInterior(p.x, p.z);
  }

  function isInsideNightclub(overrideCtx) {
    const p = (overrideCtx || ctx)?.player;
    if (!p) return false;
    return Boolean(p.inNightclub) || isPointInNightclubInterior(p.x, p.z);
  }

  // Exact Multi-Level Ground Heightfield for Casino Interior, Nightclub Interior & Exterior Plazas!
  function getCasinoVenueGroundHeight(x, z, refY) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;

    // 1. Inside Vạn Bảo Đổ Phường Grand Interior (1200, 0, 1200)
    if (isPointInCasinoInterior(x, z)) {
      const floorY = CASINO_INT.floorY; // 0.02
      const mezzY = CASINO_INT.mezzY;   // 3.60

      // Twin North-West (X in [1174.2, 1176.4]) & North-East (X in [1223.6, 1225.8]) Mezzanine Staircases!
      if ((x >= 1174.2 && x <= 1176.4) || (x >= 1223.6 && x <= 1225.8)) {
        if (z >= 1180.6 && z <= 1185.5) {
          const u = clamp((1185.5 - z) / (1185.5 - 1180.6), 0, 1);
          return lerp(floorY, mezzY, u);
        }
      }

      // North VIP Mezzanine Balcony Deck (when player is upstairs y >= 2.2m)
      const curY = Number.isFinite(refY) ? refY : (ctx?.player && Math.hypot(x - ctx.player.x, z - ctx.player.z) < 3.0 ? ctx.player.y : 0);
      if (curY >= 2.15 && z >= 1177.0 && z <= 1180.75) {
        return mezzY;
      }

      // Inside-Track Derby Upper Seating Step
      if (x >= 1189.2 && x <= 1194.8 && z >= 1212.4 && z <= 1214.3) {
        return floorY + 0.24;
      }

      // Vòng Quay Thiên Mệnh Fanfare Pedestal
      if (Math.hypot(x - 1216.0, z - 1212.0) <= 2.08) {
        return floorY + 0.20;
      }

      // Centerpiece Podium Outer Step
      const dPod = Math.hypot(x - 1200.0, z - 1200.0);
      if (dPod <= 4.12) {
        return dPod <= 3.55 ? 0.40 : 0.22;
      }

      return floorY;
    }

    // 2. Inside Túy Tiên Lâu & Cocktail Bar Interior (1500, 0, 1500)
    if (isPointInNightclubInterior(x, z)) {
      const floorY = CLUB_INT.floorY; // 0.02
      const djY = CLUB_INT.djBooth.y; // 0.80
      const vipY = CLUB_INT.vipBoothY; // 0.38

      // DJ Stage Front Steps (Left 1494.8 & Right 1505.2, Z in [1490.2, 1491.55])
      if ((Math.abs(x - 1494.8) <= 1.0 || Math.abs(x - 1505.2) <= 1.0) && z >= 1490.2 && z <= 1491.55) {
        const u = clamp((1491.55 - z) / (1491.55 - 1490.2), 0, 1);
        return lerp(floorY, djY, u);
      }

      // Elevated 0.80m DJ Booth Stage
      if (x >= 1493.5 && x <= 1506.5 && z >= 1483.2 && z <= 1490.25) {
        return djY;
      }

      // 2 Walkable Go-Go Dance Riser Cubes Flanking Dancefloor
      if ((Math.abs(x - 1494.2) <= 0.74 || Math.abs(x - 1505.8) <= 0.74) && Math.abs(z - 1498.0) <= 0.74) {
        return floorY + 0.52;
      }

      // 3 Elevated VIP Champagne Booths + North-West Safe Management Office
      if (
        (x >= 1483.8 && x <= 1489.4 && z >= 1508.7 && z <= 1513.7) ||
        (x >= 1510.5 && x <= 1516.3 && z >= 1509.9 && z <= 1514.5) ||
        (x >= 1510.8 && x <= 1516.4 && z >= 1485.9 && z <= 1490.5) ||
        (x >= 1483.3 && x <= 1488.3 && z >= 1484.4 && z <= 1488.8)
      ) {
        return vipY;
      }

      // Beat-Synced LED Dancefloor Glass Surface
      if (Math.abs(x - 1500.0) <= 5.45 && Math.abs(z - 1498.0) <= 5.45) {
        return CLUB_INT.dancefloor.y + 0.015;
      }

      return floorY;
    }

    // 3. Exterior Vạn Bảo Đổ Phường Forecourt, Infinity Pool Roof & 58m Helipad!
    if (x >= 208.4 && x <= 274.2 && z >= -152.2 && z <= -67.8) {
      const checkY = Number.isFinite(refY) ? refY : (ctx?.player && Math.hypot(x - ctx.player.x, z - ctx.player.z) < 4.5 ? ctx.player.y : 0);
      if (checkY >= 52.0 && x >= 253.5 && x <= 268.2 && z >= -117.5 && z <= -102.5) {
        return CASINO_EXT.sidewalkY + 58.48; // 58m Skyscraper Rooftop Helipad!
      }
      if (checkY >= 14.5 && x >= 216.5 && x <= 229.2 && z >= -143.0 && z <= -73.0) {
        return CASINO_EXT.sidewalkY + 17.20; // West Atrium Rooftop Infinity Pool Deck!
      }
      if (x <= 230.2 || x >= 244.0) {
        return CASINO_EXT.sidewalkY;
      }
    }

    // 4. Exterior Túy Tiên Lâu Raised Coastal Granite Terrace (prevents sinking into sloped beach sand!)
    if (x >= -166.2 && x <= -129.3 && z >= -116.1 && z <= -73.9) {
      const checkY = Number.isFinite(refY) ? refY : (ctx?.player && Math.hypot(x - ctx.player.x, z - ctx.player.z) < 4.5 ? ctx.player.y : 0);
      if (checkY >= 11.5 && x >= -164.6 && x <= -134.7 && z >= -113.2 && z <= -76.8) {
        return CLUB_EXT.terraceY + CLUB_EXT.roofHeight;
      }
      return CLUB_EXT.terraceY;
    }

    return null;
  }

  function getGroundHeight(x, z, refY) {
    const venueH = getCasinoVenueGroundHeight(x, z, refY);
    if (venueH !== null) return venueH;
    if (ctx?.world?._origCasinoGetGroundHeight) {
      return ctx.world._origCasinoGetGroundHeight(x, z, refY);
    }
    return 0.22;
  }

  // Non-Destructive World & Character Physics Chaining (Zero edits to world.js or characters.js!)
  function installWorldAndCharacterHooks(activeCtx) {
    if (!activeCtx) return;

    // A. Register Exterior AABBs into ctx.world.aabbs + Chain World Queries
    const world = activeCtx.world;
    if (world) {
      if (Array.isArray(world.aabbs) && !world._casinoAABBsPushed) {
        world._casinoAABBsPushed = true;
        for (let i = 0; i < aabbs.length; i++) {
          world.aabbs.push(aabbs[i]);
        }
      }

      if (!world._casinoMethodsHooked) {
        world._casinoMethodsHooked = true;

        if (typeof world.getGroundHeight === 'function') {
          const origGround = world.getGroundHeight.bind(world);
          world._origCasinoGetGroundHeight = origGround;
          world.getGroundHeight = function wrappedCasinoGroundHeight(x, z, refY) {
            const vH = getCasinoVenueGroundHeight(x, z, refY);
            if (vH !== null) return vH;
            return origGround(x, z, refY);
          };
        }

        if (typeof world.getZoneInfo === 'function') {
          const origZone = world.getZoneInfo.bind(world);
          world.getZoneInfo = function wrappedCasinoZoneInfo(x, z) {
            if (isPointInCasinoInterior(x, z)) {
              return {
                streetName: 'Sảnh Hoàng Gia • Podium Hypercar',
                zoneName: 'Vạn Bảo Đổ Phường & Resort',
              };
            }
            if (isPointInNightclubInterior(x, z)) {
              return {
                streetName: 'Sàn Nhảy EDM & Quầy Cocktail Neon',
                zoneName: 'Túy Tiên Lâu • Nightclub & Bar',
              };
            }
            if (x >= 204 && x <= 276 && z >= -155 && z <= -66) {
              return {
                streetName: 'Đại lộ Power Street • Cổng Valet VIP',
                zoneName: 'Vạn Bảo Đổ Phường & Resort',
              };
            }
            if (x >= -168 && x <= -124 && z >= -118 && z <= -72) {
              return {
                streetName: 'Đại lộ Duyên Hải • Phố Đêm Biển',
                zoneName: 'Túy Tiên Lâu • Cocktail Bar',
              };
            }
            return origZone(x, z);
          };
        }

        if (typeof world.resolveCircleAABB === 'function') {
          const origResolveCircle = world.resolveCircleAABB.bind(world);
          world.resolveCircleAABB = function wrappedCasinoResolveCircle(ent, radius = 0.42) {
            if (!ent || !Number.isFinite(ent.x) || !Number.isFinite(ent.z)) {
              return { hit: false, normalX: 0, normalZ: 0 };
            }
            if (isPointInCasinoInterior(ent.x, ent.z) || isPointInNightclubInterior(ent.x, ent.z)) {
              return resolveCircleAgainstList(ent, radius, interiorAABBs);
            }
            const resOrig = origResolveCircle(ent, radius);
            const resExt = resolveCircleAgainstList(ent, radius, aabbs);
            if (resExt.hit) return resExt;
            return resOrig;
          };
        }

        if (typeof world.resolveCarAABB === 'function') {
          const origResolveCar = world.resolveCarAABB.bind(world);
          world.resolveCarAABB = function wrappedCasinoResolveCar(car) {
            const resOrig = origResolveCar(car);
            const resExt = resolveCarAgainstList(car, aabbs);
            if (resExt.hit) {
              return {
                hit: true,
                normalX: resExt.normalX,
                normalZ: resExt.normalZ,
                impactSpeed: Math.max(resOrig?.impactSpeed || 0, resExt.impactSpeed || 0),
              };
            }
            return resOrig;
          };
        }

        if (typeof world.raycastWorld === 'function') {
          const origRaycast = world.raycastWorld.bind(world);
          world.raycastWorld = function wrappedCasinoRaycast(x1, y1, z1, x2, y2, z2) {
            if (isPointInCasinoInterior(x1, z1) || isPointInNightclubInterior(x1, z1)) {
              return raycastAgainstList(x1, y1, z1, x2, y2, z2, interiorAABBs, 1.0);
            }
            const hitOrig = origRaycast(x1, y1, z1, x2, y2, z2);
            const maxT = hitOrig?.hit ? hitOrig.t : 1.0;
            const hitExt = raycastAgainstList(x1, y1, z1, x2, y2, z2, aabbs, maxT);
            return hitExt.hit ? hitExt : hitOrig;
          };
          world.checkLOS = function wrappedCasinoCheckLOS(x1, y1, z1, x2, y2, z2) {
            return !world.raycastWorld(x1, y1, z1, x2, y2, z2).hit;
          };
        }
      }
    }

    // B. Protect Casino (1200, 1200) & Nightclub (1500, 1500) from characters.js's
    //    `p.x >= 500 -> clamp([791, 809])` Động Phủ Tu Luyện clamp while keeping 100% of
    //    on-foot movement, sprinting, combat-roll, jumping, weapon aim & animations!
    const chars = activeCtx.characters;
    if (chars && typeof chars.updatePlayerOnFoot === 'function' && !chars._casinoInteriorHooked) {
      chars._casinoInteriorHooked = true;
      const origUpdateOnFoot = chars.updatePlayerOnFoot.bind(chars);

      chars.updatePlayerOnFoot = function wrappedCasinoUpdatePlayerOnFoot(dt, overrideCtx) {
        const c = overrideCtx || activeCtx;
        const p = c?.player;
        if (!p) return origUpdateOnFoot(dt, c);

        const inCas = Boolean(p.inCasino) || isPointInCasinoInterior(p.x, p.z);
        const inClb = !inCas && (Boolean(p.inNightclub) || isPointInNightclubInterior(p.x, p.z));

        if (!inCas && !inClb) {
          return origUpdateOnFoot(dt, c);
        }

        // Suppress player walking/shooting if an interactive Casino/Bar modal overlay is open
        if (c.activeModal) {
          p.vx = 0;
          p.vz = 0;
          p.isFiring = false;
          if (p.mesh) {
            p.mesh.position.set(p.x, p.y, p.z);
            p.mesh.rotation.set(0, p.yaw || 0, 0);
          }
          chars.animateHumanoid?.(p.rig, 'idle', Math.min(0.1, Math.max(0.001, dt || 0.016)), { moveSpeed: 0 });
          return;
        }

        const safeDt = clamp(Number.isFinite(dt) ? dt : 0.016, 0.0005, 0.1);
        const startX = p.x;
        const startY = p.y;
        const startZ = p.z;

        origUpdateOnFoot(safeDt, c);

        // Fallback guard if an unpatched characters module clamped x >= 500 to [791, 809]
        if (p.x < 950) {
          p.x = startX + (Number(p.vx) || 0) * safeDt;
          p.z = startZ + (Number(p.vz) || 0) * safeDt;
          const fallbackGroundY = getCasinoVenueGroundHeight(p.x, p.z, startY) ?? 0.02;
          p.y = lerp(startY, fallbackGroundY, 1 - Math.exp(-26 * safeDt));
        }

        if (inCas) {
          p.x = clamp(p.x, CASINO_INT.minX + 0.52, CASINO_INT.maxX - 0.52);
          p.z = clamp(p.z, CASINO_INT.minZ + 0.52, CASINO_INT.maxZ - 0.52);
        } else {
          p.x = clamp(p.x, CLUB_INT.minX + 0.52, CLUB_INT.maxX - 0.52);
          p.z = clamp(p.z, CLUB_INT.minZ + 0.52, CLUB_INT.maxZ - 0.52);
        }
        resolveCircleAgainstList(p, 0.42, interiorAABBs);

        if (p.mesh) {
          p.mesh.position.set(p.x, p.y, p.z);
          p.mesh.rotation.set(0, p.yaw || 0, 0);
        }
      };
    }
  }

  // Helper to show a clean Vietnamese toast message using whichever UI notifier is mounted
  function notifyVenueToast(msg, duration = 3.5) {
    if (typeof ctx?.ui?.showNotification === 'function') {
      ctx.ui.showNotification(msg, duration);
    } else if (typeof ctx?.ui?.notify === 'function') {
      ctx.ui.notify(msg, duration);
    } else if (typeof ctx?.gameplay?.notifyUI === 'function') {
      ctx.gameplay.notifyUI(msg, duration);
    }
  }

  function syncVenueVisibility(activeCtx) {
    const inCas = isInsideCasino(activeCtx);
    const inClb = !inCas && isInsideNightclub(activeCtx);

    if (casinoInteriorRoot) casinoInteriorRoot.visible = inCas;
    if (nightclubInteriorRoot) nightclubInteriorRoot.visible = inClb;
    if (casinoExteriorGroup) casinoExteriorGroup.visible = !inCas && !inClb;
    if (clubExteriorGroup) clubExteriorGroup.visible = !inCas && !inClb;
  }

  function placePlayerAt(x, y, z, yaw, flags = {}) {
    const p = ctx?.player;
    if (!p) return false;

    // Safely disembark vehicle if player was seated in a car when teleporting
    if (p.inCar && typeof ctx?.vehicles?.exitVehicle === 'function') {
      try {
        ctx.vehicles.exitVehicle(p, ctx);
      } catch (_) {
        p.inCar = null;
      }
    } else if (p.inCar) {
      p.inCar = null;
    }

    p.inSafehouse = false;
    p.inCasino = Boolean(flags.inCasino);
    p.inNightclub = Boolean(flags.inNightclub);
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = 0;
    p.vy = 0;
    p.vz = 0;
    p.yaw = yaw;
    p.isGrounded = true;
    p.onGround = true;

    if (p.mesh) {
      p.mesh.visible = true;
      p.mesh.position.set(x, y, z);
      p.mesh.rotation.set(0, yaw, 0);
    }

    if (ctx?.engine) {
      // Align camera behind player facing direction (`lookDir` in engine.js is `(-sin(camYaw), -cos(camYaw))`)
      ctx.engine.camYaw = wrapAngle(yaw + Math.PI);
      ctx.engine.camPitch = -0.12;
    }

    _autoDoorCooldown = 2.2;
    syncVenueVisibility(ctx);
    return true;
  }

  // --------------------------------------------------------------------------
  // PUBLIC DOOR TRANSITION METHODS
  // --------------------------------------------------------------------------
  function enterCasino() {
    if (!_initialized) init(ctx);
    installWorldAndCharacterHooks(ctx);
    const ok = placePlayerAt(
      CASINO_INT.spawn.x,
      CASINO_INT.spawn.y,
      CASINO_INT.spawn.z,
      CASINO_INT.spawn.yaw,
      { inCasino: true, inNightclub: false }
    );
    if (ok) {
      ctx?.audio?.playChime?.();
      notifyVenueToast(
        '💎 Chào mừng đến Vạn Bảo Đổ Phường & Resort! Lại gần các bàn Đỏ Đen & nhấn [F] để đặt cược.',
        4.2
      );
    }
    return ok;
  }

  function exitCasino() {
    if (!_initialized) init(ctx);
    if (ctx?.activeModal === 'casino') {
      ctx?.casinoGames?.closeStation?.();
      ctx.activeModal = null;
    }
    const ok = placePlayerAt(
      CASINO_EXT.exitReturnPos.x,
      CASINO_EXT.exitReturnPos.y,
      CASINO_EXT.exitReturnPos.z,
      CASINO_EXT.exitReturnPos.yaw,
      { inCasino: false, inNightclub: false }
    );
    if (ok) {
      ctx?.audio?.playChime?.();
      notifyVenueToast('Đã rời Vạn Bảo Đổ Phường ra Đại lộ Power Street.', 2.6);
    }
    return ok;
  }

  function enterNightclub() {
    if (!_initialized) init(ctx);
    installWorldAndCharacterHooks(ctx);
    const ok = placePlayerAt(
      CLUB_INT.spawn.x,
      CLUB_INT.spawn.y,
      CLUB_INT.spawn.z,
      CLUB_INT.spawn.yaw,
      { inCasino: false, inNightclub: true }
    );
    if (ok) {
      ctx?.audio?.playChime?.();
      notifyVenueToast(
        '🍸 Chào mừng đến Túy Tiên Lâu & Neon Bar! Gọi Cocktail, Nhảy EDM, bắn Bi-A hoặc ném Phi Tiêu [F]!',
        4.2
      );
    }
    return ok;
  }

  function exitNightclub() {
    if (!_initialized) init(ctx);
    if (ctx?.activeModal === 'bar') {
      ctx?.nightlife?.closeBarStation?.();
      ctx.activeModal = null;
    }
    const ok = placePlayerAt(
      CLUB_EXT.exitReturnPos.x,
      CLUB_EXT.exitReturnPos.y,
      CLUB_EXT.exitReturnPos.z,
      CLUB_EXT.exitReturnPos.yaw,
      { inCasino: false, inNightclub: false }
    );
    if (ok) {
      ctx?.audio?.playChime?.();
      notifyVenueToast('Đã rời Túy Tiên Lâu ra Đại lộ Duyên Hải Pacific.', 2.6);
    }
    return ok;
  }

  // --------------------------------------------------------------------------
  // STATION & DOOR PROXIMITY QUERIES
  // --------------------------------------------------------------------------
  function getInteractiveStationNear(x, z, maxDist = STATION_INTERACT_RADIUS) {
    const qx = Number.isFinite(x) ? x : Number(ctx?.player?.x);
    const qz = Number.isFinite(z) ? z : Number(ctx?.player?.z);
    if (!Number.isFinite(qx) || !Number.isFinite(qz)) return null;

    const inCas = isPointInCasinoInterior(qx, qz);
    const inClb = !inCas && isPointInNightclubInterior(qx, qz);
    if (!inCas && !inClb) return null;

    const targetVenue = inCas ? 'casino' : 'nightclub';
    let best = null;
    let bestScore = Infinity;
    let bestTrueDist = Infinity;

    for (let i = 0; i < stations.length; i++) {
      const st = stations[i];
      if (st.venue !== targetVenue) continue;

      let d = dist2D(qx, qz, st.x, st.z);
      if (Number.isFinite(st.segAx) && Number.isFinite(st.segBx)) {
        d = Math.min(d, distPointToSegment2D(qx, qz, st.segAx, st.segAz, st.segBx, st.segBz));
      }

      let matched = d <= maxDist;
      if (!matched && st.areaHalfW > 0 && st.areaHalfD > 0) {
        if (Math.abs(qx - st.x) <= st.areaHalfW && Math.abs(qz - st.z) <= st.areaHalfD) {
          matched = true;
          d = Math.min(d, maxDist - 0.05);
        }
      }
      if (!matched) continue;

      // Slight priority bias so peripheral bar/pool/darts win over wide dancefloor pad when overlapping
      const score = d - (st.priority || 0) * 0.25;
      if (score < bestScore) {
        bestScore = score;
        bestTrueDist = d;
        best = st;
      }
    }

    if (!best) return null;
    return {
      type: best.type,
      station: best.station,
      id: best.id,
      label: best.label,
      prompt: best.prompt,
      venue: best.venue,
      minBet: best.minBet,
      maxBet: best.maxBet,
      x: best.x,
      y: best.y,
      z: best.z,
      dist: bestTrueDist,
    };
  }

  function getEntranceNear(x, z, maxDist = 3.4) {
    const qx = Number.isFinite(x) ? x : Number(ctx?.player?.x);
    const qz = Number.isFinite(z) ? z : Number(ctx?.player?.z);
    if (!Number.isFinite(qx) || !Number.isFinite(qz)) return null;

    const dCasIn = dist2D(qx, qz, CASINO_EXT.entryCorona.x, CASINO_EXT.entryCorona.z);
    if (dCasIn <= maxDist) return { action: 'enter_casino', dist: dCasIn, label: 'Vào Vạn Bảo Đổ Phường' };

    const dCasOut = dist2D(qx, qz, CASINO_INT.exitRing.x, CASINO_INT.exitRing.z);
    if (dCasOut <= maxDist) return { action: 'exit_casino', dist: dCasOut, label: 'Rời Vạn Bảo Đổ Phường' };

    const dClbIn = dist2D(qx, qz, CLUB_EXT.entryCorona.x, CLUB_EXT.entryCorona.z);
    if (dClbIn <= maxDist) return { action: 'enter_nightclub', dist: dClbIn, label: 'Vào Túy Tiên Lâu & Bar' };

    const dClbOut = dist2D(qx, qz, CLUB_INT.exitRing.x, CLUB_INT.exitRing.z);
    if (dClbOut <= maxDist) return { action: 'exit_nightclub', dist: dClbOut, label: 'Rời Túy Tiên Lâu' };

    return null;
  }

  // --------------------------------------------------------------------------
  // INTERACTIVE 3D ANIMATION & CELEBRATION TRIGGERS (CALLED BY GAMES/HEISTS)
  // --------------------------------------------------------------------------
  function spinLuckyWheelVisual(targetSliceIndex = -1) {
    if (!casinoIntState.luckyWheel) return;
    casinoIntState.luckyWheel.spinning = true;
    const baseSpin = 14.5 + Math.random() * 4.5;
    casinoIntState.luckyWheel.angularVel = baseSpin;
    if (targetSliceIndex >= 0 && targetSliceIndex < 20) {
      casinoIntState.luckyWheel.targetSlice = targetSliceIndex;
    }
  }

  function triggerJackpotCelebration(duration = 6.5) {
    celebrationFX?.triggerJackpot(duration);
  }

  function triggerBottleGirlParade(duration = 7.5) {
    celebrationFX?.triggerSparklers(duration);
    if (clubIntState.paradeGroup) {
      clubIntState.paradeGroup.visible = true;
      clubIntState.paradeTimer = duration;
    }
  }

  function openCasinoVaultDoor(open = true) {
    casinoIntState.vaultOpenTarget = open ? 1.0 : 0.0;
  }

  function deliverPodiumHypercarOutside() {
    const spawnFn = ctx?.vehiclesExtra?.spawnExtraVehicle || ctx?.vehicles?.spawnVehicle;
    if (typeof spawnFn !== 'function') return null;
    const car = spawnFn('zentorno', 206.2, 0.28, -116.5, -Math.PI * 0.5, { isPodiumPrize: true })
      || spawnFn('obey9f', 206.2, 0.28, -116.5, -Math.PI * 0.5, { isPodiumPrize: true });
    if (car && typeof ctx?.shops?.applyCarMods === 'function') {
      try {
        ctx.shops.applyCarMods(car, { paintFinish: 'gold', color: '#f5c542', underglow: '#00f0ff', spoiler: 'gt_wing', turbo: true });
      } catch (_) {}
    }
    triggerJackpotCelebration(8.0);
    return car;
  }

  // --------------------------------------------------------------------------
  // INITIALIZATION (`init(ctx)`) — IDEMPOTENT & FAULT-TOLERANT
  // --------------------------------------------------------------------------
  function init(overrideCtx) {
    if (overrideCtx && typeof overrideCtx === 'object') {
      ctx = overrideCtx;
    }

    const scene = ctx?.engine?.scene || ctx?.scene || ctx?.world?.root?.parent || null;

    if (!_initialized) {
      _initialized = true;
      texSuite = buildCasinoTextureSuite();
      mats = buildLuxuryMaterialPalette(texSuite);

      // 1. Build Both Exterior Landmarks
      casinoExteriorGroup = buildCasinoExteriorLandmark(mats, exteriorState);
      clubExteriorGroup = buildClubExteriorLandmark(mats, exteriorState);

      // 2. Build Full Walk-In Casino Grand Interior (1200, 0, 1200)
      casinoInteriorRoot = buildCasinoInteriorShellAndPodium(mats, texSuite, casinoIntState);
      buildCasinoStationsSuiteA(casinoInteriorRoot, mats, casinoIntState);
      buildCasinoStationsSuiteB(casinoInteriorRoot, mats, casinoIntState);
      buildCasinoVIPMezzanineAndVaultChamber(casinoInteriorRoot, mats, casinoIntState);

      // 3. Build Full Walk-In Nightclub & Cocktail Bar Interior (1500, 0, 1500)
      nightclubInteriorRoot = buildNightclubInteriorShellAndDJ(mats, clubIntState);
      buildNightclubStationsAndDancers(nightclubInteriorRoot, mats, clubIntState);

      // 4. Build Murals, Rooftop Pool/Helipad, Searchlights, Chasing Bulbs & Finishing Details
      buildCasinoGalleryAndRoofExtras(casinoExteriorGroup, casinoInteriorRoot, mats, casinoIntState);
      buildNightclubAtmosphereExtras(nightclubInteriorRoot, mats, clubIntState);
      buildExteriorResortAndClubSuperDetails(casinoExteriorGroup, clubExteriorGroup, mats, exteriorState);
      buildFineInteriorSuitesAndSkySearchlights(
        casinoExteriorGroup,
        clubExteriorGroup,
        casinoInteriorRoot,
        nightclubInteriorRoot,
        mats,
        exteriorState,
        casinoIntState,
        clubIntState
      );
      buildDynamicDisplaysGuardiansAndHolo(
        casinoExteriorGroup,
        casinoInteriorRoot,
        nightclubInteriorRoot,
        mats,
        exteriorState,
        casinoIntState,
        clubIntState
      );
      buildArchitecturalFinishingSuite(
        casinoExteriorGroup,
        clubExteriorGroup,
        casinoInteriorRoot,
        nightclubInteriorRoot,
        mats,
        exteriorState,
        casinoIntState,
        clubIntState
      );
      buildChasingBulbsPavilionsAndRooftopClub(
        casinoExteriorGroup,
        clubExteriorGroup,
        mats,
        exteriorState
      );

      // 5. Celebration Particle Engine & Hover Station Halo
      celebrationFX = createVenueCelebrationFX(casinoInteriorRoot, nightclubInteriorRoot);
      hoverHalo = createActiveStationHoverHalo();
      masterGroup.add(
        casinoExteriorGroup,
        clubExteriorGroup,
        casinoInteriorRoot,
        nightclubInteriorRoot,
        hoverHalo
      );

      if (casinoIntState.podiumCarMesh) {
        podiumCarRef = casinoIntState.podiumCarMesh;
        api.podiumCarMesh = podiumCarRef;
      }

      redrawDerbyLiveScreen(texSuite.derbyLiveScreen, 0);
      redrawLiveVenueStatusBoards(casinoIntState, clubIntState, exteriorState, 0, ctx);
    }

    if (scene && masterGroup.parent !== scene) {
      scene.add(masterGroup);
    }

    installWorldAndCharacterHooks(ctx);
    syncVenueVisibility(ctx);
    if (ctx) ctx.casinoWorld = api;
    return api;
  }

  // --------------------------------------------------------------------------
  // MASTER REAL-TIME ANIMATION & COLLISION LOOP (`update(dt, ctx)`)
  // --------------------------------------------------------------------------
  function update(dt = 0.016, arg2, arg3) {
    const activeCtx =
      arg2 && typeof arg2 === 'object'
        ? arg2
        : arg3 && typeof arg3 === 'object'
          ? arg3
          : ctx;

    if (!_initialized) init(activeCtx);
    installWorldAndCharacterHooks(activeCtx);

    const safeDt = clamp(Number.isFinite(dt) ? dt : 0.016, 0.0005, 0.1);
    _elapsed += safeDt;
    if (_autoDoorCooldown > 0) _autoDoorCooldown = Math.max(0, _autoDoorCooldown - safeDt);

    // 1. Update All Custom GLSL Shader Uniforms (Marquee, Fountain, Coronas, LED Floor, Lasers, EQ)
    for (let i = 0; i < shaderUniformUpdaters.length; i++) {
      shaderUniformUpdaters[i](_elapsed);
    }

    const p = activeCtx?.player;
    const px = Number.isFinite(p?.x) ? p.x : 26;
    const pz = Number.isFinite(p?.z) ? p.z : 28;
    const inCas = isInsideCasino(activeCtx);
    const inClb = !inCas && isInsideNightclub(activeCtx);

    // Sync Interior / Exterior Group Visibility for Maximum FPS!
    if (casinoInteriorRoot && casinoInteriorRoot.visible !== inCas) casinoInteriorRoot.visible = inCas;
    if (nightclubInteriorRoot && nightclubInteriorRoot.visible !== inClb) nightclubInteriorRoot.visible = inClb;
    const showExt = !inCas && !inClb;
    if (casinoExteriorGroup) {
      const distCasSq = (px - CASINO_EXT.centerX) ** 2 + (pz - CASINO_EXT.centerZ) ** 2;
      casinoExteriorGroup.visible = showExt && distCasSq < EXTERIOR_LOD_DIST_SQ * 2.8;
    }
    if (clubExteriorGroup) {
      const distClbSq = (px - CLUB_EXT.centerX) ** 2 + (pz - CLUB_EXT.centerZ) ** 2;
      clubExteriorGroup.visible = showExt && distClbSq < EXTERIOR_LOD_DIST_SQ * 2.4;
    }

    // 2. Authoritative Interior Wall & Table Collision Enforcement + Passive Door Corona Support!
    if (p && !p.inCar && !activeCtx?.activeModal) {
      if (inCas) {
        p.x = clamp(p.x, CASINO_INT.minX + 0.50, CASINO_INT.maxX - 0.50);
        p.z = clamp(p.z, CASINO_INT.minZ + 0.50, CASINO_INT.maxZ - 0.50);
        resolveCircleAgainstList(p, 0.42, interiorAABBs);
        if (p.mesh) p.mesh.position.set(p.x, p.y, p.z);
      } else if (inClb) {
        p.x = clamp(p.x, CLUB_INT.minX + 0.50, CLUB_INT.maxX - 0.50);
        p.z = clamp(p.z, CLUB_INT.minZ + 0.50, CLUB_INT.maxZ - 0.50);
        resolveCircleAgainstList(p, 0.42, interiorAABBs);
        if (p.mesh) p.mesh.position.set(p.x, p.y, p.z);
      }

      // Support walking directly onto Entry/Exit Coronas (< 1.35m) or pressing [F]/[E] (< 3.4m)
      if (_autoDoorCooldown <= 0 && !(p.rappelState && p.rappelState.active)) {
        const interactPressed = Boolean(activeCtx?.input?.interactJustPressed);
        if (showExt) {
          const dCas = dist2D(px, pz, CASINO_EXT.entryCorona.x, CASINO_EXT.entryCorona.z);
          const dClb = dist2D(px, pz, CLUB_EXT.entryCorona.x, CLUB_EXT.entryCorona.z);
          if (dCas < 1.35 || (interactPressed && dCas < 3.4)) {
            enterCasino();
          } else if (dClb < 1.35 || (interactPressed && dClb < 3.4)) {
            enterNightclub();
          }
        } else if (inCas) {
          const dExit = dist2D(px, pz, CASINO_INT.exitRing.x, CASINO_INT.exitRing.z);
          if (dExit < 1.32 || (interactPressed && dExit < 3.2)) {
            exitCasino();
          }
        } else if (inClb) {
          const dExit = dist2D(px, pz, CLUB_INT.exitRing.x, CLUB_INT.exitRing.z);
          if (dExit < 1.32 || (interactPressed && dExit < 3.2)) {
            exitNightclub();
          }
        }
      }
    }

    // 128 BPM Master Club Beat Envelope
    const beats = _elapsed * (128.0 / 60.0);
    const beatFrac = beats - Math.floor(beats);
    const beatPulse = Math.pow(1.0 - beatFrac, 3.0);

    // 3. Exterior Animations (when Player is Outdoors)
    if (showExt) {
      if (exteriorState.rotatingCrownBeacon) {
        exteriorState.rotatingCrownBeacon.rotation.y = _elapsed * 0.55;
      }
      if (exteriorState.eclipseHaloGroup) {
        const s = 1.0 + beatPulse * 0.045;
        exteriorState.eclipseHaloGroup.scale.set(s, s, 1);
      }

      // Sweeping Vegas/Club Rooftop Sky-Searchlights
      for (let i = 0; i < exteriorState.skySearchlights.length; i++) {
        const sl = exteriorState.skySearchlights[i];
        sl.pivot.rotation.x = Math.sin(_elapsed * sl.speedX + sl.phase) * 0.42;
        sl.pivot.rotation.z = Math.cos(_elapsed * sl.speedZ + sl.phase) * 0.42;
      }

      // Casino Plaza Fountain Jets & Chasing 96-Bulb Porte-Cochere Marquee
      if (casinoExteriorGroup?.visible) {
        for (let i = 0; i < exteriorState.fountainJets.length; i++) {
          const fj = exteriorState.fountainJets[i];
          fj.group.rotation.y = _elapsed * 0.35 * (i % 2 === 0 ? 1 : -1);
          fj.centerPlume.scale.y = 2.2 + Math.sin(_elapsed * 4.5 + i) * 0.38;
        }
        for (let i = 0; i < exteriorState.windowHolograms.length; i++) {
          exteriorState.windowHolograms[i].rotation.y = _elapsed * 0.9 + i;
        }
        if (exteriorState.casinoMarqueeBulbInst) {
          const n = exteriorState.casinoMarqueeCount;
          const chaseIdx = Math.floor(_elapsed * 16.0);
          for (let i = 0; i < n; i++) {
            const m = (i - chaseIdx % n + n) % 6;
            const c = m === 0 ? _bulbColGold : m === 3 ? _bulbColPurple : _bulbColDim;
            exteriorState.casinoMarqueeBulbInst.setColorAt(i, c);
          }
          if (exteriorState.casinoMarqueeBulbInst.instanceColor) {
            exteriorState.casinoMarqueeBulbInst.instanceColor.needsUpdate = true;
          }
        }
      }

      // Túy Tiên Lâu Pulsing Neon Facade, Fire Torches, 40-Bulb Canopy & Muffled Sub-Bass Aura!
      if (clubExteriorGroup?.visible) {
        for (let i = 0; i < exteriorState.fireTorches.length; i++) {
          const fl = exteriorState.fireTorches[i];
          fl.scale.y = 0.46 + Math.sin(_elapsed * 14.0 + i * 1.7) * 0.14;
          fl.rotation.y = _elapsed * 3.0 + i;
        }
        if (exteriorState.clubMarqueeBulbInst) {
          const n = exteriorState.clubMarqueeCount;
          const chase = Math.floor(_elapsed * 18.0);
          for (let i = 0; i < n; i++) {
            const on = (i + chase) % 4 < 2;
            _bulbColScratch.copy(on ? _bulbColCyan : _bulbColMagenta).multiplyScalar(0.55 + beatPulse * 0.65);
            exteriorState.clubMarqueeBulbInst.setColorAt(i, _bulbColScratch);
          }
          if (exteriorState.clubMarqueeBulbInst.instanceColor) {
            exteriorState.clubMarqueeBulbInst.instanceColor.needsUpdate = true;
          }
        }
        updateExteriorSubBassAura(_elapsed, px, pz, activeCtx);
      }

      for (let i = 0; i < exteriorState.npcs.length; i++) {
        animateVenueNPC(exteriorState.npcs[i], _elapsed, beatPulse);
      }
    }

    // 4. Vạn Bảo Đổ Phường Interior Animations (when Player is Inside Casino!)
    if (inCas) {
      // Auto-trigger Podium Hypercar Jackpot Celebration if player wins Podium Car in casinoGames!
      const podiumWonNow = Boolean(activeCtx?.casinoGames?.podiumWon || activeCtx?.casinoGames?.state?.podiumWon);
      if (podiumWonNow && !_lastKnownPodiumWon) {
        triggerJackpotCelebration(8.5);
      }
      _lastKnownPodiumWon = podiumWonNow;

      const celebrating = celebrationFX?.isJackpotCelebrating();

      // Rotate Centerpiece Podium Hypercar Turntable + Animate Scissor Doors on Celebration!
      if (casinoIntState.turntableGroup) {
        casinoIntState.turntableGroup.rotation.y += safeDt * (celebrating ? 1.15 : 0.36);
      }
      if (casinoIntState.podiumHoloBand) {
        casinoIntState.podiumHoloBand.rotation.y = -_elapsed * 0.45;
      }
      if (casinoIntState.podiumCarMesh?.userData) {
        const ud = casinoIntState.podiumCarMesh.userData;
        const targetDoor = celebrating ? 0.85 : 0.0;
        ud.scissorOpen = lerp(ud.scissorOpen || 0, targetDoor, 1 - Math.exp(-4.5 * safeDt));
        if (ud.leftDoorPivot) ud.leftDoorPivot.rotation.x = ud.scissorOpen;
        if (ud.rightDoorPivot) ud.rightDoorPivot.rotation.x = ud.scissorOpen;
      }

      // Physical 20-Slice Vòng Quay Thiên Mệnh Rotation + Peg Clapper Click Deflection!
      if (casinoIntState.luckyWheel) {
        const lw = casinoIntState.luckyWheel;
        lw.angle = (lw.angle + lw.angularVel * safeDt) % TAU;
        lw.rotor.rotation.z = lw.angle;
        if (lw.spinning) {
          lw.angularVel *= Math.max(0, 1 - 0.58 * safeDt);
          if (lw.angularVel < 0.08) {
            lw.angularVel = 0.35; // Return to gentle showcase rotation after stop pause
            lw.spinning = false;
          }
        }
        // Pegs are every TAU/20 radians -> deflect clapper sharply as each peg passes top!
        const sliceFrac = ((lw.angle / (TAU / 20)) % 1 + 1) % 1;
        const pegKick = sliceFrac < 0.22 ? Math.sin((sliceFrac / 0.22) * Math.PI) : 0;
        lw.clapper.rotation.z = -pegKick * clamp(lw.angularVel * 0.12, 0.08, 0.58);
      }

      // Spin Both 3D Roulette Wheels + Counter-Orbiting Bouncing Ivory Balls!
      for (let i = 0; i < casinoIntState.rouletteWheels.length; i++) {
        const rw = casinoIntState.rouletteWheels[i];
        rw.rotorGrp.rotation.y = _elapsed * 1.65 + rw.phase;
        rw.ballOrbit.rotation.y = -_elapsed * 3.4 - rw.phase;
        const ballCycle = (_elapsed * 0.35 + i * 0.5) % 1.0;
        const ballR = ballCycle < 0.65 ? 0.36 : lerp(0.36, 0.24, (ballCycle - 0.65) / 0.35);
        const hop = ballCycle > 0.55 && ballCycle < 0.85 ? Math.abs(Math.sin(_elapsed * 22.0)) * 0.025 : 0;
        rw.ivoryBall.position.set(ballR, hop, 0);
      }

      // Periodic Mechanical Dice Tumbling inside Both Tài Xỉu 3D Glass Shaker Domes!
      for (let i = 0; i < casinoIntState.taixiuShakers.length; i++) {
        const sh = casinoIntState.taixiuShakers[i];
        const cyc = (_elapsed + sh.phase) % 9.0;
        const shaking = cyc < 1.65;
        for (let d = 0; d < sh.diceList.length; d++) {
          const die = sh.diceList[d];
          if (shaking) {
            const hop = Math.abs(Math.sin(_elapsed * 24.0 + die.phase)) * 0.085;
            die.mesh.position.y = die.baseY + hop;
            die.mesh.rotation.x += safeDt * 14.0;
            die.mesh.rotation.z += safeDt * 11.0;
          } else {
            die.mesh.position.y = lerp(die.mesh.position.y, die.baseY, 1 - Math.exp(-14 * safeDt));
          }
        }
      }

      // Periodic Xóc Đĩa Porcelain Bowl Shake & Subtle Peek Lift!
      for (let i = 0; i < casinoIntState.xocdiaBowls.length; i++) {
        const xb = casinoIntState.xocdiaBowls[i];
        const cyc = (_elapsed + xb.phase) % 10.0;
        if (cyc < 1.4) {
          xb.group.position.x = xb.baseX + Math.sin(_elapsed * 36.0) * 0.028;
          xb.group.position.y = xb.baseY + Math.abs(Math.cos(_elapsed * 28.0)) * 0.022;
        } else if (cyc > 4.0 && cyc < 6.2) {
          // Dramatic slow "Nặn Bát" peek!
          xb.group.position.x = lerp(xb.group.position.x, xb.baseX + 0.09, 1 - Math.exp(-4 * safeDt));
          xb.group.rotation.z = lerp(xb.group.rotation.z, -0.22, 1 - Math.exp(-4 * safeDt));
        } else {
          xb.group.position.x = lerp(xb.group.position.x, xb.baseX, 1 - Math.exp(-8 * safeDt));
          xb.group.position.y = lerp(xb.group.position.y, xb.baseY, 1 - Math.exp(-8 * safeDt));
          xb.group.rotation.z = lerp(xb.group.rotation.z, 0, 1 - Math.exp(-8 * safeDt));
        }
      }

      // Spin 36 Emissive Slot Machine Reels + Periodic Pull-Arm Lever Action across 12 Cabinets!
      for (let i = 0; i < casinoIntState.slotMachines.length; i++) {
        const sm = casinoIntState.slotMachines[i];
        const cyc = (_elapsed + sm.phase) % 8.5;
        if (cyc < 0.55) {
          const pull = Math.sin((cyc / 0.55) * Math.PI);
          sm.leverPivot.rotation.x = pull * 0.92;
        } else {
          sm.leverPivot.rotation.x = 0;
        }
        for (let r = 0; r < 3; r++) {
          const stopTime = 0.65 + (r + 1) * 0.85;
          if (cyc > 0.35 && cyc < stopTime) {
            sm.reels[r].rotation.z += safeDt * (13.5 - r * 1.2);
          }
        }
      }

      // Foyer Sculptures, Slot Aisle Crowns, Vault Laser Oscillation & Hinged Vault Door!
      for (let i = 0; i < casinoIntState.foyerStatues.length; i++) {
        casinoIntState.foyerStatues[i].rotation.y = _elapsed * 0.7 * (i === 0 ? 1 : -1);
      }
      for (let i = 0; i < casinoIntState.slotAisleCrowns.length; i++) {
        casinoIntState.slotAisleCrowns[i].rotation.y = _elapsed * 0.85;
      }
      if (casinoIntState.vaultLaserGrid) {
        casinoIntState.vaultLaserGrid.position.y = 1.55 + Math.sin(_elapsed * 2.2) * 0.42;
      }
      if (casinoIntState.vaultHinge) {
        const heistVaultOpen = Boolean(
          casinoIntState.vaultOpenTarget > 0.5 ||
            (activeCtx?.heists?.activeActivity?.type === 'casino_heist' &&
              activeCtx?.heists?.activeActivity?.vaultOpen)
        );
        const targetAng = heistVaultOpen ? -1.45 : 0.0;
        casinoIntState.vaultOpenCurrent = lerp(
          casinoIntState.vaultOpenCurrent,
          targetAng,
          1 - Math.exp(-2.8 * safeDt)
        );
        casinoIntState.vaultHinge.rotation.y = casinoIntState.vaultOpenCurrent;
      }

      // Pulse Casino Station Floor Rings & Update Live Inside-Track Derby Screen (20 FPS redraw)
      for (let i = 0; i < casinoIntState.rings.length; i++) {
        const rg = casinoIntState.rings[i];
        rg.rotation.y = _elapsed * 1.1 + i * 0.4;
      }
      _derbyScreenTimer -= safeDt;
      if (_derbyScreenTimer <= 0 && texSuite?.derbyLiveScreen) {
        _derbyScreenTimer = 0.05;
        redrawDerbyLiveScreen(texSuite.derbyLiveScreen, _elapsed);
      }

      for (let i = 0; i < casinoIntState.npcs.length; i++) {
        animateVenueNPC(casinoIntState.npcs[i], _elapsed, beatPulse);
      }
    }

    // 5. Túy Tiên Lâu & Cocktail Bar Interior Animations (when Player is Inside Nightclub!)
    if (inClb) {
      // Spin CDJ Platters, Disco Mirror Ball & Industrial Ceiling Exhaust Fans
      for (let i = 0; i < clubIntState.djPlatters.length; i++) {
        clubIntState.djPlatters[i].rotation.y = _elapsed * 3.8 * (i === 0 ? 1 : -1);
      }
      if (clubIntState.discoBall) {
        clubIntState.discoBall.rotation.y = _elapsed * 0.65;
      }
      for (let i = 0; i < clubIntState.ceilingFans.length; i++) {
        clubIntState.ceilingFans[i].rotation.y = _elapsed * 3.2;
      }

      // Throb All 12 Subwoofer Speaker Cones & 6 Hex Neon Beat Pillars on Every 128-BPM Kick!
      const coneThrow = beatPulse * 0.075;
      for (let i = 0; i < clubIntState.wooferCones.length; i++) {
        const wc = clubIntState.wooferCones[i];
        wc.mesh.position.x = wc.baseX + wc.fwdX * coneThrow;
        wc.mesh.position.z = wc.baseZ + wc.fwdZ * coneThrow;
      }
      for (let i = 0; i < clubIntState.beatPillars.length; i++) {
        clubIntState.beatPillars[i].scale.y = 1.35 + beatPulse * 1.15;
      }

      // Sweep All 8 Volumetric 3D Laser Cones & Moving-Head Spotlights Across the Dancefloor!
      for (let i = 0; i < clubIntState.laserRigs.length; i++) {
        const lr = clubIntState.laserRigs[i];
        lr.pivot.rotation.x = lr.basePitch + Math.sin(_elapsed * lr.speed + lr.phase) * 0.44;
        lr.pivot.rotation.z = Math.cos(_elapsed * lr.speed * 0.85 + lr.phase) * 0.48;
      }

      // Cycle Main Club PointLight Hue & Blast 4 Stage CO2 Cryo-Jet Plumes on 16-Beat Drops!
      if (clubIntState.mainClubLight) {
        const clubHue = (_elapsed * 0.12) % 1.0;
        clubIntState.mainClubLight.color.setHSL(clubHue, 0.92, 0.56);
        clubIntState.mainClubLight.intensity = 1.65 + beatPulse * 1.15;
      }

      const barMod = beats % 16.0;
      const cryoActive = barMod < 2.2 || celebrationFX?.isSparklerCelebrating();
      if (clubIntState.cryoMat) {
        const targetOp = cryoActive ? (0.28 + beatPulse * 0.24) : 0.0;
        clubIntState.cryoMat.opacity = lerp(clubIntState.cryoMat.opacity, targetOp, 1 - Math.exp(-10 * safeDt));
        const vis = clubIntState.cryoMat.opacity > 0.02;
        for (let i = 0; i < clubIntState.cryoPlumes.length; i++) {
          clubIntState.cryoPlumes[i].visible = vis;
        }
      }

      // Bottle-Girl VIP Champagne Sparkler Parade Countdown
      if (clubIntState.paradeGroup && clubIntState.paradeTimer > 0) {
        clubIntState.paradeTimer = Math.max(0, clubIntState.paradeTimer - safeDt);
        clubIntState.paradeGroup.visible = clubIntState.paradeTimer > 0;
        for (let i = 0; i < clubIntState.bottleGirls.length; i++) {
          animateVenueNPC(clubIntState.bottleGirls[i], _elapsed, beatPulse);
        }
      }

      for (let i = 0; i < clubIntState.rings.length; i++) {
        clubIntState.rings[i].rotation.y = _elapsed * 1.25 + i * 0.5;
      }

      // Animate Bartender, Bouncer, DJ & All 18 Dancing Club NPCs!
      for (let i = 0; i < clubIntState.npcs.length; i++) {
        animateVenueNPC(clubIntState.npcs[i], _elapsed, beatPulse);
      }
    }

    // 6. Update Pooled Confetti / Sparkler Celebration FX & Hover Halo Indicator
    celebrationFX?.update(safeDt, inCas, inClb);

    if (hoverHalo) {
      const nearSt = (inCas || inClb) && !activeCtx?.activeModal
        ? getInteractiveStationNear(px, pz, STATION_INTERACT_RADIUS)
        : null;
      if (nearSt) {
        hoverHalo.visible = true;
        hoverHalo.position.set(nearSt.x, (nearSt.y || 0.02) + 0.035, nearSt.z);
        hoverHalo.userData.outerRing.rotation.z = _elapsed * 2.2;
        hoverHalo.userData.chevron.position.y = 2.15 + Math.sin(_elapsed * 5.0) * 0.14;
        hoverHalo.userData.chevron.rotation.y = _elapsed * 2.8;
      } else {
        hoverHalo.visible = false;
      }
    }

    // 7. Throttled Live Status & Progressive Jackpot Wall Board Refresh (every 0.5s)
    _statusBoardTimer -= safeDt;
    if (_statusBoardTimer <= 0) {
      _statusBoardTimer = 0.5;
      redrawLiveVenueStatusBoards(casinoIntState, clubIntState, exteriorState, _elapsed, activeCtx);
    }
  }

  // --------------------------------------------------------------------------
  // ASSEMBLE & ATTACH PUBLIC API (`ctx.casinoWorld`)
  // --------------------------------------------------------------------------
  const api = {
    init,
    update,
    enterCasino,
    exitCasino,
    enterNightclub,
    exitNightclub,
    getInteractiveStationNear,
    getEntranceNear,
    getGroundHeight,
    aabbs,
    interiorAABBs,
    podiumCarMesh: podiumCarRef,
    stations,
    isInsideCasino,
    isInsideNightclub,
    spinLuckyWheelVisual,
    triggerJackpotCelebration,
    triggerBottleGirlParade,
    openCasinoVaultDoor,
    deliverPodiumHypercarOutside,
    landmarks: {
      casinoExterior: CASINO_EXT,
      clubExterior: CLUB_EXT,
      casinoInterior: CASINO_INT,
      clubInterior: CLUB_INT,
    },
  };

  if (ctx && typeof ctx === 'object') {
    ctx.casinoWorld = api;
    if (ctx.engine || ctx.scene || ctx.world) {
      init(ctx);
    }
  }

  return api;
}
