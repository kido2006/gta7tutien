import * as THREE from 'three';

const VE_UP = new THREE.Vector3(0, 1, 0);
const VE_FWD = new THREE.Vector3(0, 0, 1);
const VE_RIGHT = new THREE.Vector3(1, 0, 0);

const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vC = new THREE.Vector3();
const _vD = new THREE.Vector3();
const _qA = new THREE.Quaternion();
const _qB = new THREE.Quaternion();
const _qC = new THREE.Quaternion();
const _eulA = new THREE.Euler(0, 0, 0, 'YXZ');
const _mat4A = new THREE.Matrix4();
const _colA = new THREE.Color();

function veClamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function veLerp(a, b, t) {
  return a + (b - a) * t;
}

function veSmoothstep(e0, e1, x) {
  const t = veClamp((x - e0) / (e1 - e0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
}

function veDamp(cur, target, lambda, dt) {
  return veLerp(cur, target, 1 - Math.exp(-lambda * dt));
}

function veWrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function veDampAngle(cur, target, lambda, dt) {
  const diff = veWrapAngle(target - cur);
  return veWrapAngle(cur + diff * (1 - Math.exp(-lambda * dt)));
}

export const EXTRA_TYPES = Object.freeze([
  'superbike',
  'chopper',
  'jetski',
  'speedboat',
  'zentorno',
  'rhino_tank',
  'luxor_jet'
]);

const EXTRA_ALIASES = {
  superbike: 'superbike',
  bati: 'superbike',
  bati801: 'superbike',
  bati_801: 'superbike',
  bati801rr: 'superbike',
  sportbike: 'superbike',
  bike: 'superbike',
  motorcycle: 'superbike',
  moto: 'superbike',

  chopper: 'chopper',
  daemon: 'chopper',
  western_daemon: 'chopper',
  cruiser: 'chopper',
  cruiser_bike: 'chopper',
  harley: 'chopper',
  biker: 'chopper',

  jetski: 'jetski',
  jet_ski: 'jetski',
  seashark: 'jetski',
  pwc: 'jetski',
  watercraft: 'jetski',

  speedboat: 'speedboat',
  speed_boat: 'speedboat',
  toro: 'speedboat',
  lampadati_toro: 'speedboat',
  boat: 'speedboat',
  yacht_tender: 'speedboat',

  zentorno: 'zentorno',
  pegassi_zentorno: 'zentorno',
  hypercar: 'zentorno',
  hyper: 'zentorno',
  podium: 'zentorno',
  podium_car: 'zentorno',

  rhino_tank: 'rhino_tank',
  rhino: 'rhino_tank',
  tank: 'rhino_tank',
  mbt: 'rhino_tank',
  battle_tank: 'rhino_tank',

  luxor_jet: 'luxor_jet',
  luxor: 'luxor_jet',
  buckingham_luxor: 'luxor_jet',
  jet: 'luxor_jet',
  plane: 'luxor_jet',
  aircraft: 'luxor_jet',
  private_jet: 'luxor_jet',
  airliner: 'luxor_jet',
  learjet: 'luxor_jet'
};

const EXTRA_ARCHETYPES = {
  superbike: {
    type: 'superbike',
    name: 'Xích Thố Thần Câu',
    category: 'Mô Tô Phân Khối Lớn Siêu Tốc',
    label: 'Xích Thố Thần Câu — Siêu Mô Tô Đua',
    width: 0.86,
    length: 2.16,
    height: 1.18,
    wheelRadius: 0.315,
    wheelWidthF: 0.125,
    wheelWidthR: 0.19,
    wheelTrack: 0.0,
    wheelBaseF: 0.74,
    wheelBaseR: -0.71,
    maxSpeed: 46,
    accel: 36,
    maxHp: 130,
    mass: 0.44,
    grip: 1.28,
    driftFactor: 0.86,
    stiffness: 1.35,
    maxLean: 0.58,
    maxWheeliePitch: -0.52,
    maxStoppiePitch: 0.36,
    isOpenTop: true,
    isMotorcycle: true,
    isChopper: false,
    isBoat: false,
    isHypercar: false,
    hasScissorDoors: false,
    isTank: false,
    gears: 6,
    redlineRpm: 14500,
    idleRpm: 1600,
    hasTurboGauge: false,
    seatX: 0.0,
    seatY: 0.73,
    seatZ: -0.16,
    palette: [0xd91e2a, 0xf4f6f9, 0x12151c, 0x16a34a, 0xf59e0b, 0x2563eb],
    accentPalette: [0xf8fafc, 0xd91e2a, 0xef4444, 0xfacc15, 0x111318, 0x38bdf8]
  },
  chopper: {
    type: 'chopper',
    name: 'Hắc Phong Thiết Kỵ Cruiser',
    category: 'Mô Tô Chopper Cơ Bắp Đường Trường',
    label: 'Hắc Phong Thiết Kỵ — Mô Tô Chopper V-Twin',
    width: 0.96,
    length: 2.62,
    height: 1.38,
    wheelRadius: 0.33,
    wheelWidthF: 0.11,
    wheelWidthR: 0.21,
    wheelTrack: 0.0,
    wheelBaseF: 1.06,
    wheelBaseR: -0.82,
    maxSpeed: 38,
    accel: 29,
    maxHp: 155,
    mass: 0.64,
    grip: 1.14,
    driftFactor: 0.90,
    stiffness: 1.08,
    maxLean: 0.48,
    maxWheeliePitch: -0.48,
    maxStoppiePitch: 0.24,
    isOpenTop: true,
    isMotorcycle: true,
    isChopper: true,
    isBoat: false,
    isHypercar: false,
    hasScissorDoors: false,
    isTank: false,
    gears: 5,
    redlineRpm: 6500,
    idleRpm: 850,
    hasTurboGauge: false,
    seatX: 0.0,
    seatY: 0.54,
    seatZ: -0.26,
    palette: [0x111318, 0x6b1218, 0x1e293b, 0x7c2d12, 0x3b0764],
    accentPalette: [0xf59e0b, 0xe2e8f0, 0xd97706, 0xfef08a, 0xc084fc]
  },
  jetski: {
    type: 'jetski',
    name: 'Lãng Lý Phi Chu',
    category: 'Mô Tô Nước Phản Lực Cao Tốc',
    label: 'Lãng Lý Phi Chu — Mô Tô Nước Biển',
    width: 1.18,
    length: 3.18,
    height: 1.14,
    wheelRadius: 0.0,
    wheelWidth: 0.2,
    wheelTrack: 0.45,
    wheelBaseF: 1.05,
    wheelBaseR: -1.05,
    maxSpeed: 38,
    accel: 33,
    maxHp: 140,
    mass: 0.52,
    grip: 1.20,
    driftFactor: 0.92,
    stiffness: 1.0,
    draftDepth: 0.16,
    buoyancyStiff: 34.0,
    buoyancyDamp: 6.4,
    planingLift: 0.24,
    isOpenTop: true,
    isMotorcycle: false,
    isChopper: false,
    isBoat: true,
    isWatercraft: true,
    isHypercar: false,
    hasScissorDoors: false,
    isTank: false,
    gears: 1,
    redlineRpm: 8200,
    idleRpm: 1250,
    hasTurboGauge: true,
    seatX: 0.0,
    seatY: 0.66,
    seatZ: -0.22,
    palette: [0x06b6d4, 0xfacc15, 0xef4444, 0xf8fafc, 0x22c55e],
    accentPalette: [0x0f172a, 0x111827, 0xf8fafc, 0x0284c7, 0x111827]
  },
  speedboat: {
    type: 'speedboat',
    name: 'Bích Ba Du Thuyền',
    category: 'Du Thuyền Cao Tốc V-Hull Hạng Sang',
    label: 'Bích Ba Du Thuyền — Siêu Tàu Cao Tốc V12',
    width: 2.58,
    length: 7.52,
    height: 1.74,
    wheelRadius: 0.0,
    wheelWidth: 0.26,
    wheelTrack: 0.98,
    wheelBaseF: 2.45,
    wheelBaseR: -2.45,
    maxSpeed: 44,
    accel: 29,
    maxHp: 230,
    mass: 1.78,
    grip: 1.15,
    driftFactor: 0.88,
    stiffness: 1.1,
    draftDepth: 0.24,
    buoyancyStiff: 30.0,
    buoyancyDamp: 6.8,
    planingLift: 0.30,
    isOpenTop: true,
    isMotorcycle: false,
    isChopper: false,
    isBoat: true,
    isWatercraft: true,
    isHypercar: false,
    hasScissorDoors: false,
    isTank: false,
    gears: 2,
    redlineRpm: 6800,
    idleRpm: 900,
    hasTurboGauge: true,
    seatX: 0.52,
    seatY: 0.64,
    seatZ: 0.38,
    palette: [0x6e2c14, 0x7c3419, 0xf8fafc, 0x162a45],
    accentPalette: [0xf8fafc, 0xfef3c7, 0xd4af37, 0xf8fafc]
  },
  zentorno: {
    type: 'zentorno',
    name: 'Thanh Long Siêu Chiến Xa',
    category: 'Siêu Xe Hypercar Cửa Cắt Kéo V12',
    label: 'Thanh Long Siêu Chiến Xa — Hypercar Cửa Cắt Kéo',
    width: 2.14,
    length: 4.74,
    height: 1.14,
    wheelRadius: 0.355,
    wheelWidth: 0.31,
    wheelTrack: 0.94,
    wheelBaseF: 1.42,
    wheelBaseR: -1.38,
    maxSpeed: 49,
    accel: 39,
    maxHp: 185,
    mass: 1.18,
    grip: 1.28,
    driftFactor: 0.92,
    stiffness: 1.48,
    isOpenTop: false,
    isMatte: false,
    midEngine: true,
    quadExhaust: true,
    isMotorcycle: false,
    isChopper: false,
    isBoat: false,
    isHypercar: true,
    hasScissorDoors: true,
    isTank: false,
    gears: 7,
    redlineRpm: 9200,
    idleRpm: 1100,
    hasTurboGauge: true,
    seatX: 0.42,
    seatY: 0.29,
    seatZ: -0.06,
    palette: [0x12141a, 0xd4af37, 0xc81d25, 0xf97316, 0x0f172a, 0xf4f6f9],
    accentPalette: [0x00f0ff, 0xfffbeb, 0xff2a55, 0x111318, 0x39ff14, 0xef4444]
  },
  rhino_tank: {
    type: 'rhino_tank',
    name: 'Huyền Vũ Thiết Giáp Xa',
    category: 'Xe Tăng Chiến Đấu Chủ Lực Hạng Nặng',
    label: 'Rhino MBT — Xe Tăng Pháo 120mm Thiết Giáp',
    width: 3.48,
    length: 7.86,
    height: 2.78,
    wheelRadius: 0.42,
    wheelWidth: 0.58,
    wheelTrack: 1.42,
    wheelBaseF: 2.65,
    wheelBaseR: -2.65,
    maxSpeed: 21,
    accel: 24,
    maxHp: 800,
    mass: 18.5,
    grip: 1.42,
    driftFactor: 0.55,
    stiffness: 1.65,
    isOpenTop: false,
    isMatte: true,
    isMotorcycle: false,
    isChopper: false,
    isBoat: false,
    isHypercar: false,
    hasScissorDoors: false,
    isTank: true,
    gears: 4,
    redlineRpm: 2800,
    idleRpm: 680,
    hasTurboGauge: true,
    seatX: 0.0,
    seatY: 1.35,
    seatZ: 0.35,
    palette: [0x4a553b, 0x8b7d5b, 0x3d4635, 0x5c5340],
    accentPalette: [0x292f22, 0x5c5139, 0x22271e, 0x383328]
  },
  luxor_jet: {
    type: 'luxor_jet',
    name: 'Cửu Thiên Thần Ưng',
    category: 'Chuyên Cơ Phản Lực Hạng Sang Twin-Jet',
    label: 'Cửu Thiên Thần Ưng — Chuyên Cơ Phản Lực VIP',
    width: 5.40,
    wingspan: 15.60,
    length: 15.80,
    height: 4.48,
    wheelRadius: 0.36,
    wheelWidth: 0.24,
    wheelTrack: 1.56,
    wheelBaseF: 4.95,
    wheelBaseR: -1.42,
    maxSpeed: 72,
    liftoffSpeed: 23,
    accel: 28,
    maxHp: 320,
    mass: 4.80,
    grip: 1.18,
    driftFactor: 0.75,
    stiffness: 1.25,
    isOpenTop: false,
    isMatte: false,
    isMotorcycle: false,
    isChopper: false,
    isBoat: false,
    isHypercar: false,
    hasScissorDoors: false,
    isTank: false,
    isJet: true,
    isAircraft: true,
    gears: 1,
    redlineRpm: 10500,
    idleRpm: 2200,
    hasTurboGauge: true,
    seatX: 0.36,
    seatY: 1.28,
    seatZ: 4.32,
    palette: [0x12151e, 0xf6f8fb, 0xd4af37, 0x13294b],
    accentPalette: [0xd4af37, 0x1d4ed8, 0xfef3c7, 0xd4af37]
  }
};

// Eye-level cockpit camera anchors in vehicle chassis local coordinates (+X left on car, +Y up, +Z forward)
const COCKPIT_EYE_CONFIGS = {
  superbike: { x: 0.0, y: 1.04, z: 0.12, lookDown: -0.06, fov: 72, leanFollow: 0.84, pitchFollow: 0.92 },
  chopper: { x: 0.0, y: 1.24, z: -0.08, lookDown: -0.05, fov: 70, leanFollow: 0.78, pitchFollow: 0.88 },
  jetski: { x: 0.0, y: 1.14, z: -0.08, lookDown: -0.06, fov: 71, leanFollow: 0.72, pitchFollow: 0.82 },
  speedboat: { x: 0.52, y: 1.28, z: 0.36, lookDown: -0.05, fov: 69, leanFollow: 0.65, pitchFollow: 0.78 },
  zentorno: { x: 0.41, y: 0.84, z: 0.05, lookDown: -0.04, fov: 68, leanFollow: 0.90, pitchFollow: 0.90 },
  rhino_tank: { x: 0.0, y: 2.34, z: 0.52, lookDown: -0.04, fov: 64, leanFollow: 0.50, pitchFollow: 0.65, useTurret: true },
  luxor_jet: { x: 0.36, y: 1.88, z: 4.45, lookDown: -0.04, fov: 70, leanFollow: 0.90, pitchFollow: 0.92 },
  obey9f: { x: 0.40, y: 0.90, z: -0.04, lookDown: -0.04, fov: 67, leanFollow: 0.85, pitchFollow: 0.85 },
  sedan_lux: { x: 0.39, y: 1.02, z: 0.02, lookDown: -0.04, fov: 65, leanFollow: 0.80, pitchFollow: 0.85 },
  banshee: { x: 0.39, y: 0.92, z: -0.14, lookDown: -0.04, fov: 67, leanFollow: 0.85, pitchFollow: 0.85 },
  suv: { x: 0.42, y: 1.28, z: 0.08, lookDown: -0.05, fov: 65, leanFollow: 0.78, pitchFollow: 0.82 },
  taxi: { x: 0.38, y: 1.02, z: 0.02, lookDown: -0.04, fov: 65, leanFollow: 0.80, pitchFollow: 0.85 },
  police: { x: 0.39, y: 1.04, z: 0.02, lookDown: -0.04, fov: 66, leanFollow: 0.82, pitchFollow: 0.85 },
  swat_van: { x: 0.46, y: 1.44, z: 0.26, lookDown: -0.05, fov: 65, leanFollow: 0.75, pitchFollow: 0.80 },
  heli: { x: 0.38, y: 1.46, z: 0.86, lookDown: -0.10, fov: 68, leanFollow: 0.82, pitchFollow: 0.85 }
};

// ============================================================================
// LOFTED CROSS-SECTION & SCULPTED 3D BUFFERGEOMETRY BUILDERS
// ============================================================================

/**
 * Builds a watertight sculpted BufferGeometry by lofting ordered Z cross-section rings.
 * Each section: { z, yCenter, halfW, halfH, topWidthRatio, bottomWidthRatio, chinePower, deckCrown }
 */
function buildLoftedBodyGeometry(sections, radialSteps = 16) {
  const ringCount = sections.length;
  const cols = radialSteps + 1;
  const vertCount = ringCount * cols + 2;
  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const indices = [];

  for (let r = 0; r < ringCount; r++) {
    const s = sections[r];
    const vFrac = ringCount > 1 ? r / (ringCount - 1) : 0;
    const topWR = s.topWidthRatio ?? 0.85;
    const botWR = s.bottomWidthRatio ?? 0.72;
    const pwr = s.chinePower ?? 1.0;
    const crown = s.deckCrown ?? 0.0;

    for (let c = 0; c <= radialSteps; c++) {
      const uFrac = c / radialSteps;
      const theta = uFrac * Math.PI * 2;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      const signX = sinT >= 0 ? 1 : -1;
      const signY = cosT >= 0 ? 1 : -1;
      const shapedSin = signX * Math.pow(Math.abs(sinT), pwr);
      const shapedCos = signY * Math.pow(Math.abs(cosT), pwr);

      const verticalT = cosT * 0.5 + 0.5;
      const widthScale = veLerp(botWR, topWR, verticalT);

      const x = shapedSin * s.halfW * widthScale;
      let y = s.yCenter + shapedCos * s.halfH;
      if (cosT > 0.25 && crown !== 0) {
        y += crown * (1 - sinT * sinT) * veSmoothstep(0.25, 1.0, cosT);
      }
      const z = s.z;

      const idx = r * cols + c;
      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;
      uvs[idx * 2] = uFrac * 2.0;
      uvs[idx * 2 + 1] = vFrac;
    }
  }

  for (let r = 0; r < ringCount - 1; r++) {
    for (let c = 0; c < radialSteps; c++) {
      const a = r * cols + c;
      const b = a + 1;
      const d = (r + 1) * cols + c;
      const e = d + 1;
      indices.push(a, d, b);
      indices.push(b, d, e);
    }
  }

  // Cap aft & fore ends cleanly
  const aftCenterIdx = ringCount * cols;
  const foreCenterIdx = aftCenterIdx + 1;
  positions[aftCenterIdx * 3] = 0;
  positions[aftCenterIdx * 3 + 1] = sections[0].yCenter;
  positions[aftCenterIdx * 3 + 2] = sections[0].z;
  uvs[aftCenterIdx * 2] = 0.5;
  uvs[aftCenterIdx * 2 + 1] = 0.0;

  const lastS = sections[ringCount - 1];
  positions[foreCenterIdx * 3] = 0;
  positions[foreCenterIdx * 3 + 1] = lastS.yCenter;
  positions[foreCenterIdx * 3 + 2] = lastS.z;
  uvs[foreCenterIdx * 2] = 0.5;
  uvs[foreCenterIdx * 2 + 1] = 1.0;

  for (let c = 0; c < radialSteps; c++) {
    indices.push(aftCenterIdx, c, c + 1);
    const baseFore = (ringCount - 1) * cols + c;
    indices.push(foreCenterIdx, baseFore + 1, baseFore);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds an open-top V-hull watercraft shell with gunwales, deep V-keel, and spray chines.
 * Each station: { z, keelY, chineY, sheerY, chineX, sheerX }
 */
function buildOpenVHullGeometry(stations) {
  // Cross-section profile points from Port Gunwale Inner -> Outer -> Chine -> Keel -> Stbd Chine -> Outer -> Inner
  const ptsPerRing = 9;
  const ringCount = stations.length;
  const positions = new Float32Array(ringCount * ptsPerRing * 3);
  const uvs = new Float32Array(ringCount * ptsPerRing * 2);
  const indices = [];

  for (let r = 0; r < ringCount; r++) {
    const st = stations[r];
    const v = ringCount > 1 ? r / (ringCount - 1) : 0;
    const gunwaleThick = st.gunwaleThick ?? 0.11;
    const innerFloorY = st.floorY ?? (st.keelY + (st.sheerY - st.keelY) * 0.42);
    const innerX = Math.max(0.02, st.sheerX - gunwaleThick);

    const profile = [
      [-innerX * 0.78, innerFloorY],
      [-innerX, st.sheerY - 0.03],
      [-st.sheerX, st.sheerY],
      [-st.chineX, st.chineY],
      [0, st.keelY],
      [st.chineX, st.chineY],
      [st.sheerX, st.sheerY],
      [innerX, st.sheerY - 0.03],
      [innerX * 0.78, innerFloorY]
    ];

    for (let p = 0; p < ptsPerRing; p++) {
      const idx = r * ptsPerRing + p;
      positions[idx * 3] = profile[p][0];
      positions[idx * 3 + 1] = profile[p][1];
      positions[idx * 3 + 2] = st.z;
      uvs[idx * 2] = p / (ptsPerRing - 1);
      uvs[idx * 2 + 1] = v * 2.5;
    }
  }

  for (let r = 0; r < ringCount - 1; r++) {
    for (let p = 0; p < ptsPerRing - 1; p++) {
      const a = r * ptsPerRing + p;
      const b = a + 1;
      const c = (r + 1) * ptsPerRing + p;
      const d = c + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
    // Connect cockpit sole across [-innerX*0.78 .. +innerX*0.78]
    const soleL0 = r * ptsPerRing;
    const soleR0 = r * ptsPerRing + (ptsPerRing - 1);
    const soleL1 = (r + 1) * ptsPerRing;
    const soleR1 = (r + 1) * ptsPerRing + (ptsPerRing - 1);
    indices.push(soleR0, soleL0, soleR1);
    indices.push(soleL0, soleL1, soleR1);
  }

  // Close stern transom (r = 0)
  for (let p = 1; p < ptsPerRing - 2; p++) {
    indices.push(0, p + 1, p);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Extrudes a 2D side-elevation polygon `[z, y]` along the X axis with optional front/top taper.
 */
function buildExtrudedSideProfile(zyPoints, fullWidth, bevelSize = 0.025) {
  const shape = new THREE.Shape();
  for (let i = 0; i < zyPoints.length; i++) {
    const [z, y] = zyPoints[i];
    if (i === 0) shape.moveTo(z, y);
    else shape.lineTo(z, y);
  }
  shape.closePath();

  const depth = Math.max(0.02, fullWidth - bevelSize * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevelSize > 0.001,
    bevelThickness: bevelSize,
    bevelSize,
    bevelSegments: 2,
    curveSegments: 8
  });

  // Shape X=z, Y=y, Extrude Z=x -> rotate so Extrude Z becomes X centered at 0, Shape X becomes Z!
  geo.translate(0, 0, -depth * 0.5);
  geo.rotateY(Math.PI * 0.5);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a smooth curved tubular exhaust / frame / handlebar pipe from 3D control points.
 */
function buildPipeGeometry(pointsArray, radius = 0.028, tubularSegs = 20, radialSegs = 10, closed = false) {
  const vecs = pointsArray.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(vecs, closed, 'catmullrom', 0.35);
  return new THREE.TubeGeometry(curve, tubularSegs, radius, radialSegs, closed);
}

// ============================================================================
// PROCEDURAL PBR CANVAS TEXTURES & SHARED MATERIAL WORKSHOP
// ============================================================================

function createExtraTextureWorkshop() {
  const cache = new Map();

  function makeTex(key, w, h, drawFn, repeatX = 1, repeatY = 1, isLinear = false) {
    if (cache.has(key)) return cache.get(key);
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    drawFn(g, w, h);
    const tex = new THREE.CanvasTexture(c);
    if (!isLinear) tex.colorSpace = THREE.SRGBColorSpace;
    if (repeatX > 1 || repeatY > 1) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeatX, repeatY);
    }
    tex.needsUpdate = true;
    cache.set(key, tex);
    return tex;
  }

  function getCarbonFiberTexture() {
    return makeTex('carbon_weave', 128, 128, (g, w, h) => {
      g.fillStyle = '#14171d';
      g.fillRect(0, 0, w, h);
      const cell = 8;
      for (let y = 0; y < h; y += cell) {
        for (let x = 0; x < w; x += cell) {
          const shift = ((y / cell) % 2) * (cell * 0.5);
          const gx = (x + shift) % w;
          const grad = g.createLinearGradient(gx, y, gx + cell, y + cell);
          grad.addColorStop(0, '#2b313d');
          grad.addColorStop(0.5, '#1b2029');
          grad.addColorStop(1, '#0d1015');
          g.fillStyle = grad;
          g.fillRect(gx, y, cell - 1, cell - 1);
        }
      }
    }, 6, 6);
  }

  function getMahoganyPlankTexture() {
    return makeTex('mahogany_deck', 256, 256, (g, w, h) => {
      g.fillStyle = '#5c2310';
      g.fillRect(0, 0, w, h);
      const planks = 10;
      const pw = w / planks;
      for (let i = 0; i < planks; i++) {
        const px = i * pw;
        const shade = (i * 17) % 22;
        const grad = g.createLinearGradient(px, 0, px + pw, 0);
        grad.addColorStop(0, `rgb(${92 + shade}, ${36 + (shade >> 1)}, 16)`);
        grad.addColorStop(0.5, `rgb(${114 + shade}, ${46 + (shade >> 1)}, 20)`);
        grad.addColorStop(1, `rgb(${84 + shade}, ${31 + (shade >> 1)}, 13)`);
        g.fillStyle = grad;
        g.fillRect(px + 2, 0, pw - 3, h);

        // Fine wood grain streaks
        g.strokeStyle = 'rgba(35, 10, 4, 0.25)';
        g.lineWidth = 1;
        for (let s = 0; s < 6; s++) {
          g.beginPath();
          const sx = px + 4 + ((s * 7 + i * 3) % (pw - 6));
          g.moveTo(sx, 0);
          g.bezierCurveTo(sx + 2, h * 0.33, sx - 2, h * 0.66, sx + 1, h);
          g.stroke();
        }
        // Blonde holly/maple marine caulking pinstripe!
        g.fillStyle = '#efe2c4';
        g.fillRect(px, 0, 2.2, h);
      }
    }, 2, 3);
  }

  function getQuiltedLeatherTexture(hexMain = '#f3ead8', hexStitch = '#b89f78') {
    return makeTex(`quilted_${hexMain}`, 128, 128, (g, w, h) => {
      g.fillStyle = hexMain;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = hexStitch;
      g.lineWidth = 1.6;
      const step = 16;
      for (let i = -h; i < w + h; i += step) {
        g.beginPath();
        g.moveTo(i, 0);
        g.lineTo(i + h, h);
        g.stroke();
        g.beginPath();
        g.moveTo(i, h);
        g.lineTo(i + h, 0);
        g.stroke();
      }
    }, 3, 3);
  }

  function createScrollingTankTreadTexture() {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#1b1e1c';
    g.fillRect(0, 0, 128, 256);

    // Steel grousers + twin rubber road pads per track link
    const links = 8;
    const lh = 256 / links;
    for (let i = 0; i < links; i++) {
      const y = i * lh;
      g.fillStyle = '#2d322e';
      g.fillRect(4, y + 2, 120, lh - 5);
      // Center guide tooth channel
      g.fillStyle = '#121413';
      g.fillRect(56, y, 16, lh);
      // Octagonal rubber road pads
      g.fillStyle = '#202322';
      g.fillRect(12, y + 6, 38, lh - 12);
      g.fillRect(78, y + 6, 38, lh - 12);
      // Metallic grouser edge highlight
      g.fillStyle = '#535b54';
      g.fillRect(6, y + 2, 116, 3);
      // End connector pins
      g.fillStyle = '#687169';
      g.fillRect(0, y + 8, 6, lh - 16);
      g.fillRect(122, y + 8, 6, lh - 16);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 5);
    tex.needsUpdate = true;
    return tex;
  }

  function createChainDriveTexture() {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#181a1f';
    g.fillRect(0, 0, 128, 64);
    for (let x = 0; x < 128; x += 16) {
      g.fillStyle = '#b4923e';
      g.fillRect(x + 2, 6, 12, 12);
      g.fillRect(x + 2, 46, 12, 12);
      g.fillStyle = '#cbd5e1';
      g.beginPath();
      g.arc(x + 8, 32, 5, 0, Math.PI * 2);
      g.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 1);
    return tex;
  }

  function getPlateTexture(plateText = '88ZNT999') {
    return makeTex(`plate_${plateText}`, 256, 128, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e293b');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#eab308';
      g.lineWidth = 5;
      g.strokeRect(5, 5, w - 10, h - 10);
      g.fillStyle = '#eab308';
      g.font = 'italic bold 20px Georgia, serif';
      g.textAlign = 'center';
      g.fillText('SAN ANDREAS', 128, 34);
      g.font = 'bold 52px Impact, "Arial Black", sans-serif';
      g.fillStyle = '#f8fafc';
      g.fillText(plateText, 128, 96);
    });
  }

  function getScreenDecalTexture(kind) {
    return makeTex(`screen_${kind}`, 256, 128, (g, w, h) => {
      g.fillStyle = '#070b14';
      g.fillRect(0, 0, w, h);
      if (kind === 'moto_tft') {
        g.strokeStyle = '#00f0ff';
        g.lineWidth = 3;
        g.strokeRect(6, 6, w - 12, h - 12);
        // RPM bar
        const rg = g.createLinearGradient(16, 0, 236, 0);
        rg.addColorStop(0, '#22c55e');
        rg.addColorStop(0.7, '#f59e0b');
        rg.addColorStop(1, '#ef4444');
        g.fillStyle = rg;
        g.fillRect(18, 18, 200, 18);
        g.fillStyle = '#f8fafc';
        g.font = 'bold 48px monospace';
        g.fillText('801RR', 22, 86);
        g.fillStyle = '#38bdf8';
        g.font = 'bold 26px monospace';
        g.fillText('RACE', 168, 84);
      } else if (kind === 'marine_nav') {
        g.fillStyle = '#052c47';
        g.fillRect(8, 8, w - 16, h - 16);
        g.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        g.lineWidth = 1.5;
        for (let r = 18; r < 70; r += 18) {
          g.beginPath();
          g.arc(76, 64, r, 0, Math.PI * 2);
          g.stroke();
        }
        g.fillStyle = '#22d3ee';
        g.font = 'bold 20px monospace';
        g.fillText('SONAR • PACIFIC', 110, 44);
        g.fillStyle = '#4ade80';
        g.fillText('DEPTH 18.4m', 110, 76);
        g.fillStyle = '#facc15';
        g.fillText('LAMPADATI', 110, 104);
      } else if (kind === 'tank_mfd') {
        g.fillStyle = '#061f12';
        g.fillRect(6, 6, w - 12, h - 12);
        g.strokeStyle = '#22c55e';
        g.lineWidth = 2;
        g.strokeRect(10, 10, w - 20, h - 20);
        g.beginPath();
        g.moveTo(128, 20);
        g.lineTo(128, 108);
        g.moveTo(40, 64);
        g.lineTo(216, 64);
        g.stroke();
        g.fillStyle = '#4ade80';
        g.font = 'bold 16px monospace';
        g.fillText('120MM APFSDS/HE', 16, 30);
        g.fillText('FLIR ACTIVE', 16, 110);
      }
    });
  }

  function getHeadlightConeTexture() {
    return makeTex('ve_headlight_cone', 128, 256, (g) => {
      g.clearRect(0, 0, 128, 256);
      for (let y = 0; y < 256; y++) {
        const v = y / 255;
        const hw = 12 + v * 50;
        const alpha = Math.pow(1 - v, 1.7) * 0.46;
        const rg = g.createLinearGradient(64 - hw, y, 64 + hw, y);
        rg.addColorStop(0, 'rgba(220,240,255,0)');
        rg.addColorStop(0.5, `rgba(238,248,255,${alpha.toFixed(4)})`);
        rg.addColorStop(1, 'rgba(220,240,255,0)');
        g.fillStyle = rg;
        g.fillRect(0, y, 128, 1);
      }
    });
  }

  function getWakeFoamTexture() {
    return makeTex('ve_wake_foam', 128, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const rg = g.createRadialGradient(64, 64, 4, 64, 64, 62);
      rg.addColorStop(0, 'rgba(248, 253, 255, 0.92)');
      rg.addColorStop(0.45, 'rgba(215, 244, 255, 0.58)');
      rg.addColorStop(0.8, 'rgba(165, 228, 248, 0.22)');
      rg.addColorStop(1, 'rgba(165, 228, 248, 0.0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, w, h);
    });
  }

  return {
    getCarbonFiberTexture,
    getMahoganyPlankTexture,
    getQuiltedLeatherTexture,
    createScrollingTankTreadTexture,
    createChainDriveTexture,
    getPlateTexture,
    getScreenDecalTexture,
    getHeadlightConeTexture,
    getWakeFoamTexture
  };
}

function createStaticExtraMaterials(texWorkshop) {
  const carbonTex = texWorkshop.getCarbonFiberTexture();
  const mahoganyTex = texWorkshop.getMahoganyPlankTexture();
  const creamLeatherTex = texWorkshop.getQuiltedLeatherTexture('#f3ead6', '#b3956b');
  const darkLeatherTex = texWorkshop.getQuiltedLeatherTexture('#1b1e26', '#334155');
  const coneTex = texWorkshop.getHeadlightConeTexture();

  return {
    carbonSatin: new THREE.MeshPhysicalMaterial({
      color: 0x22262f,
      map: carbonTex,
      metalness: 0.35,
      roughness: 0.28,
      clearcoat: 0.72,
      clearcoatRoughness: 0.18
    }),
    darkChassis: new THREE.MeshStandardMaterial({
      color: 0x161920,
      metalness: 0.55,
      roughness: 0.58
    }),
    mirrorChrome: new THREE.MeshPhysicalMaterial({
      color: 0xf4f7fb,
      metalness: 0.96,
      roughness: 0.07,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04
    }),
    goldAnodized: new THREE.MeshPhysicalMaterial({
      color: 0xd9a528,
      metalness: 0.88,
      roughness: 0.18,
      clearcoat: 0.65
    }),
    titaniumBlued: new THREE.MeshPhysicalMaterial({
      color: 0x8b7e9b,
      metalness: 0.86,
      roughness: 0.22,
      iridescence: 0.65,
      iridescenceIOR: 1.5
    }),
    tireRubber: new THREE.MeshStandardMaterial({
      color: 0x15171c,
      metalness: 0.06,
      roughness: 0.84
    }),
    brakeSteel: new THREE.MeshStandardMaterial({
      color: 0xbac4d0,
      metalness: 0.85,
      roughness: 0.28
    }),
    caliperRed: new THREE.MeshStandardMaterial({
      color: 0xd91e2a,
      metalness: 0.45,
      roughness: 0.28
    }),
    tintedGlass: new THREE.MeshPhysicalMaterial({
      color: 0x0d1726,
      metalness: 0.12,
      roughness: 0.06,
      transparent: true,
      opacity: 0.76,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04
    }),
    marineGlass: new THREE.MeshPhysicalMaterial({
      color: 0x13334c,
      metalness: 0.10,
      roughness: 0.05,
      transparent: true,
      opacity: 0.62,
      clearcoat: 1.0,
      side: THREE.DoubleSide
    }),
    mahoganyGloss: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: mahoganyTex,
      metalness: 0.08,
      roughness: 0.14,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06
    }),
    pearlHullWhite: new THREE.MeshPhysicalMaterial({
      color: 0xf6f8fb,
      metalness: 0.15,
      roughness: 0.14,
      clearcoat: 0.95,
      clearcoatRoughness: 0.08
    }),
    creamQuilted: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: creamLeatherTex,
      roughness: 0.48,
      metalness: 0.04
    }),
    darkAlcantara: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: darkLeatherTex,
      roughness: 0.72,
      metalness: 0.06
    }),
    bronzeProp: new THREE.MeshStandardMaterial({
      color: 0xc28e3a,
      metalness: 0.86,
      roughness: 0.24
    }),
    militaryDarkSteel: new THREE.MeshStandardMaterial({
      color: 0x252a22,
      metalness: 0.62,
      roughness: 0.64
    }),
    militaryRubber: new THREE.MeshStandardMaterial({
      color: 0x1a1c19,
      metalness: 0.12,
      roughness: 0.88
    }),
    v12RedPlenum: new THREE.MeshStandardMaterial({
      color: 0xc81e2b,
      metalness: 0.55,
      roughness: 0.30
    }),
    navPortRed: new THREE.MeshStandardMaterial({
      color: 0xff2222,
      emissive: 0xff1111,
      emissiveIntensity: 1.8,
      roughness: 0.2
    }),
    navStbdGreen: new THREE.MeshStandardMaterial({
      color: 0x22ff55,
      emissive: 0x11ee44,
      emissiveIntensity: 1.8,
      roughness: 0.2
    }),
    amberTurn: new THREE.MeshStandardMaterial({
      color: 0xff9f1c,
      emissive: 0xff8800,
      emissiveIntensity: 0.95,
      roughness: 0.25
    }),
    headlightBeam: new THREE.MeshBasicMaterial({
      map: coneTex,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    afterburnerCore: new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }),
    afterburnerOuter: new THREE.MeshBasicMaterial({
      color: 0xff6b1a,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }),
    tftMotoMat: new THREE.MeshStandardMaterial({
      map: texWorkshop.getScreenDecalTexture('moto_tft'),
      emissive: 0xffffff,
      emissiveMap: texWorkshop.getScreenDecalTexture('moto_tft'),
      emissiveIntensity: 0.95,
      roughness: 0.18
    }),
    marineNavMat: new THREE.MeshStandardMaterial({
      map: texWorkshop.getScreenDecalTexture('marine_nav'),
      emissive: 0xffffff,
      emissiveMap: texWorkshop.getScreenDecalTexture('marine_nav'),
      emissiveIntensity: 0.85,
      roughness: 0.2
    }),
    tankMfdMat: new THREE.MeshStandardMaterial({
      map: texWorkshop.getScreenDecalTexture('tank_mfd'),
      emissive: 0xffffff,
      emissiveMap: texWorkshop.getScreenDecalTexture('tank_mfd'),
      emissiveIntensity: 0.9,
      roughness: 0.2
    })
  };
}

// ============================================================================
// PROCEDURAL WEB AUDIO SYNTHESIZER FOR EXTRA VEHICLES (Cannon, Servo, Splash)
// ============================================================================

function createExtraAudioSynth(ctx) {
  let localAudioCtx = null;
  let noiseBuffer = null;

  function ensureCtx() {
    if (ctx?.audio?.muted) return null;
    if (!ctx?.started) return null;
    if (!localAudioCtx && typeof window !== 'undefined') {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        try {
          localAudioCtx = new AC();
        } catch (_) {
          return null;
        }
      }
    }
    if (localAudioCtx && localAudioCtx.state === 'suspended') {
      localAudioCtx.resume().catch(() => {});
    }
    if (localAudioCtx && !noiseBuffer) {
      const len = localAudioCtx.sampleRate * 1.2;
      noiseBuffer = localAudioCtx.createBuffer(1, len, localAudioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return localAudioCtx;
  }

  function playTankCannonBoom() {
    const ac = ensureCtx();
    if (!ac) return;
    try {
      const now = ac.currentTime;
      // Sub-bass cannon punch
      const osc = ac.createOscillator();
      const oscGain = ac.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.exponentialRampToValueAtTime(26, now + 0.55);
      oscGain.gain.setValueAtTime(0.52, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc.connect(oscGain);
      oscGain.connect(ac.destination);
      osc.start(now);
      osc.stop(now + 0.68);

      // Explosive broadband blast wave
      if (noiseBuffer) {
        const src = ac.createBufferSource();
        src.buffer = noiseBuffer;
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(1400, now);
        lp.frequency.exponentialRampToValueAtTime(180, now + 0.85);
        const ng = ac.createGain();
        ng.gain.setValueAtTime(0.48, now);
        ng.gain.exponentialRampToValueAtTime(0.001, now + 0.92);
        src.connect(lp);
        lp.connect(ng);
        ng.connect(ac.destination);
        src.start(now);
        src.stop(now + 0.95);
      }

      // Metallic breech shell-casing drop clank at +0.52s
      const clank = ac.createOscillator();
      const cg = ac.createGain();
      clank.type = 'triangle';
      clank.frequency.setValueAtTime(980, now + 0.52);
      clank.frequency.exponentialRampToValueAtTime(520, now + 0.72);
      cg.gain.setValueAtTime(0.0001, now);
      cg.gain.setValueAtTime(0.16, now + 0.52);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.76);
      clank.connect(cg);
      cg.connect(ac.destination);
      clank.start(now + 0.5);
      clank.stop(now + 0.78);
    } catch (_) {}
  }

  function playScissorDoorServo(opening = true) {
    const ac = ensureCtx();
    if (!ac) return;
    try {
      const now = ac.currentTime;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(opening ? 240 : 410, now);
      osc.frequency.linearRampToValueAtTime(opening ? 430 : 210, now + 0.34);
      g.gain.setValueAtTime(0.07, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(g);
      g.connect(ac.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (_) {}
  }

  function playWaveSplash(intensity = 0.6) {
    const ac = ensureCtx();
    if (!ac || !noiseBuffer) return;
    try {
      const now = ac.currentTime;
      const src = ac.createBufferSource();
      src.buffer = noiseBuffer;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(680, now);
      bp.frequency.exponentialRampToValueAtTime(260, now + 0.38);
      bp.Q.value = 0.9;
      const g = ac.createGain();
      const vol = veClamp(intensity * 0.24, 0.04, 0.28);
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      src.connect(bp);
      bp.connect(g);
      g.connect(ac.destination);
      src.start(now);
      src.stop(now + 0.45);
    } catch (_) {}
  }

  function playExhaustPop() {
    const ac = ensureCtx();
    if (!ac || !noiseBuffer) return;
    try {
      const now = ac.currentTime;
      const src = ac.createBufferSource();
      src.buffer = noiseBuffer;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(920, now);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.16, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      src.connect(lp);
      lp.connect(g);
      g.connect(ac.destination);
      src.start(now);
      src.stop(now + 0.1);
    } catch (_) {}
  }

  return {
    playTankCannonBoom,
    playScissorDoorServo,
    playWaveSplash,
    playExhaustPop
  };
}

// ============================================================================
// REUSABLE WHEEL, BRAKE DISC, ENGINE FIN & AUTOMOTIVE MATERIAL HELPERS
// ============================================================================

function makeVehiclePaintMaterials(def, baseColor, accentColor, plateStr, staticMats, texWorkshop) {
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: baseColor,
    metalness: def.isMatte ? 0.25 : 0.62,
    roughness: def.isMatte ? 0.52 : 0.14,
    clearcoat: def.isMatte ? 0.15 : 1.0,
    clearcoatRoughness: def.isMatte ? 0.45 : 0.06
  });

  const accentMat = new THREE.MeshPhysicalMaterial({
    color: accentColor,
    metalness: 0.55,
    roughness: 0.18,
    clearcoat: 0.92,
    clearcoatRoughness: 0.08
  });

  const accentGlowMat = new THREE.MeshStandardMaterial({
    color: def.isHypercar ? 0x2a2f3a : accentColor,
    emissive: def.isHypercar ? 0x000000 : accentColor,
    emissiveIntensity: def.isHypercar ? 0.0 : 0.32,
    roughness: 0.34,
    metalness: 0.68
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xf4fbff,
    emissive: 0xd8f0ff,
    emissiveIntensity: 0.85,
    roughness: 0.14
  });

  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xcc1824,
    emissive: 0xb8101c,
    emissiveIntensity: 0.55,
    roughness: 0.20
  });

  const reverseLightMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xf8fafc,
    emissiveIntensity: 0.0,
    roughness: 0.2
  });

  const rimMat = new THREE.MeshPhysicalMaterial({
    color: def.isChopper ? 0xf5f8fc : def.isHypercar ? 0x1e222b : 0xdbe2ec,
    metalness: 0.92,
    roughness: def.isHypercar ? 0.22 : 0.10,
    clearcoat: 0.85
  });

  const plateTex = texWorkshop.getPlateTexture(plateStr);
  const plateMat = new THREE.MeshStandardMaterial({
    map: plateTex,
    roughness: 0.32,
    metalness: 0.2
  });

  return {
    paintMat,
    accentMat,
    accentGlowMat,
    headlightMat,
    taillightMat,
    reverseLightMat,
    rimMat,
    plateMat
  };
}

function buildHeadlightBeamCones(positions, length = 11.5, width = 2.6, beamMat) {
  const group = new THREE.Group();
  group.name = 'HeadlightCones';
  const planeGeo = new THREE.PlaneGeometry(width, length);
  planeGeo.rotateX(-Math.PI * 0.5);
  planeGeo.translate(0, -0.18, length * 0.5);

  for (let i = 0; i < positions.length; i++) {
    const [x, y, z] = positions[i];
    const m1 = new THREE.Mesh(planeGeo, beamMat);
    m1.position.set(x, y, z);
    const m2 = new THREE.Mesh(planeGeo, beamMat);
    m2.position.set(x, y, z);
    m2.rotation.z = Math.PI * 0.32;
    group.add(m1, m2);
  }
  group.visible = false;
  return group;
}

/**
 * Builds a forged Y-spoke sport motorcycle wheel + radial tire + drilled wave rotor(s).
 */
function buildSportMotoWheel(radius, width, dualDisc, rimMat, staticMats) {
  const spinGroup = new THREE.Group();

  // Rounded sport radial tire profile (Torus + inner bead cylinder)
  const tubeR = width * 0.48;
  const torusR = Math.max(0.08, radius - tubeR * 0.82);
  const tireTorus = new THREE.Mesh(
    new THREE.TorusGeometry(torusR, tubeR, 14, 32),
    staticMats.tireRubber
  );
  tireTorus.rotation.y = Math.PI * 0.5;
  tireTorus.castShadow = true;
  spinGroup.add(tireTorus);

  // Outer alloy rim barrel
  const rimRadius = torusR - tubeR * 0.52;
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(rimRadius, rimRadius, width * 0.72, 24, 1, true),
    rimMat
  );
  barrel.rotation.z = Math.PI * 0.5;
  spinGroup.add(barrel);

  // Center axle hub
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.17, radius * 0.17, width * 0.84, 14),
    rimMat
  );
  hub.rotation.z = Math.PI * 0.5;
  spinGroup.add(hub);

  // 6 Y-split racing spokes
  const spokeLen = rimRadius - radius * 0.14;
  const spokeGeo = new THREE.BoxGeometry(width * 0.24, spokeLen, 0.022);
  for (let i = 0; i < 6; i++) {
    const baseAngle = (i / 6) * Math.PI * 2;
    for (const splay of [-0.14, 0.14]) {
      const sp = new THREE.Mesh(spokeGeo, rimMat);
      const ang = baseAngle + splay;
      const midR = radius * 0.14 + spokeLen * 0.48;
      sp.position.set(0, Math.cos(ang) * midR, Math.sin(ang) * midR);
      sp.rotation.x = -ang;
      spinGroup.add(sp);
    }
  }

  // Drilled floating wave brake rotor(s) + anodized gold carrier spider
  const discSides = dualDisc ? [-1, 1] : [1];
  const rotorR = radius * 0.64;
  const rotorRingGeo = new THREE.RingGeometry(rotorR * 0.62, rotorR, 24);
  rotorRingGeo.rotateY(Math.PI * 0.5);
  const carrierGeo = new THREE.RingGeometry(radius * 0.19, rotorR * 0.64, 16);
  carrierGeo.rotateY(Math.PI * 0.5);

  for (const side of discSides) {
    const xOff = side * (width * 0.44);
    const rotorL = new THREE.Mesh(rotorRingGeo, staticMats.brakeSteel);
    rotorL.position.x = xOff;
    const rotorR2 = new THREE.Mesh(rotorRingGeo, staticMats.brakeSteel);
    rotorR2.position.x = xOff;
    rotorR2.rotation.y = Math.PI;
    const carrier = new THREE.Mesh(carrierGeo, staticMats.goldAnodized);
    carrier.position.x = xOff + side * 0.003;
    const carrierBack = new THREE.Mesh(carrierGeo, staticMats.goldAnodized);
    carrierBack.position.x = xOff - side * 0.003;
    carrierBack.rotation.y = Math.PI;
    spinGroup.add(rotorL, rotorR2, carrier, carrierBack);
  }

  return spinGroup;
}

/**
 * Builds a classic 20-spoke wire-laced chrome chopper wheel with whitewall/cruiser sidewall option.
 */
function buildWireChopperWheel(radius, width, spokeCount, staticMats) {
  const spinGroup = new THREE.Group();

  const tubeR = width * 0.48;
  const torusR = Math.max(0.09, radius - tubeR * 0.80);
  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(torusR, tubeR, 14, 30),
    staticMats.tireRubber
  );
  tire.rotation.y = Math.PI * 0.5;
  tire.castShadow = true;
  spinGroup.add(tire);

  const rimR = torusR - tubeR * 0.46;
  const chromeRim = new THREE.Mesh(
    new THREE.TorusGeometry(rimR, 0.022, 10, 28),
    staticMats.mirrorChrome
  );
  chromeRim.rotation.y = Math.PI * 0.5;
  spinGroup.add(chromeRim);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, width * 0.86, 14),
    staticMats.mirrorChrome
  );
  hub.rotation.z = Math.PI * 0.5;
  spinGroup.add(hub);

  const wireLen = rimR - 0.045;
  const wireGeo = new THREE.CylinderGeometry(0.0045, 0.0045, wireLen, 5);
  for (let i = 0; i < spokeCount; i++) {
    const a = (i / spokeCount) * Math.PI * 2;
    const side = i % 2 === 0 ? 1 : -1;
    const spoke = new THREE.Mesh(wireGeo, staticMats.mirrorChrome);
    const mid = 0.045 + wireLen * 0.5;
    spoke.position.set(side * width * 0.16, Math.cos(a) * mid, Math.sin(a) * mid);
    spoke.rotation.x = -a;
    spoke.rotation.z = side * 0.11;
    spinGroup.add(spoke);
  }

  // Chrome brake rotor on left side
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.56, radius * 0.56, 0.008, 20),
    staticMats.brakeSteel
  );
  disc.rotation.z = Math.PI * 0.5;
  disc.position.x = width * 0.44;
  spinGroup.add(disc);

  return spinGroup;
}

/**
 * Builds an air-cooled finned cylinder barrel + chrome rocker cover for V-twin chopper engines.
 */
function buildVeeTwinCylinderJug(height, radius, finCount, staticMats) {
  const jug = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.76, radius * 0.72, height, 12),
    staticMats.darkChassis
  );
  core.position.y = height * 0.5;
  jug.add(core);

  const finStep = (height * 0.76) / Math.max(1, finCount);
  for (let i = 0; i < finCount; i++) {
    const taper = 0.88 + (i / finCount) * 0.22;
    const fin = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * taper, radius * taper, 0.008, 12),
      i % 2 === 0 ? staticMats.mirrorChrome : staticMats.brakeSteel
    );
    fin.position.y = height * 0.10 + i * finStep;
    jug.add(fin);
  }

  // Polished two-tier chrome D-shaped rocker box head
  const headLower = new THREE.Mesh(
    new THREE.BoxGeometry(radius * 2.05, 0.042, radius * 1.95),
    staticMats.mirrorChrome
  );
  headLower.position.y = height + 0.022;
  const headUpper = new THREE.Mesh(
    new THREE.BoxGeometry(radius * 1.88, 0.038, radius * 1.78),
    staticMats.mirrorChrome
  );
  headUpper.position.y = height + 0.064;
  jug.add(headLower, headUpper);

  // Twin external chrome pushrod tubes on right side
  for (const zOff of [-0.026, 0.026]) {
    const pushrod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, height + 0.04, 8),
      staticMats.mirrorChrome
    );
    pushrod.position.set(-radius * 0.88, height * 0.5, zOff);
    jug.add(pushrod);
  }

  return jug;
}

// ============================================================================
// 1A. SCULPTED MOTORCYCLE #1: PEGASSI BATI 801RR ('superbike')
// ============================================================================

function buildSuperbikeMesh(def, baseColor, accentColor, opts, staticMats, texWorkshop) {
  const plateStr = opts.plate || 'BATI 801';
  const mats = makeVehiclePaintMaterials(def, baseColor, accentColor, plateStr, staticMats, texWorkshop);
  const chainTex = texWorkshop.createChainDriveTexture();
  const chainMat = new THREE.MeshStandardMaterial({
    map: chainTex,
    metalness: 0.78,
    roughness: 0.30
  });

  const root = new THREE.Group();
  root.name = 'ExtraVeh_Superbike';

  // Banking lean pivot at tire ground contact patch (y = 0)
  const leanPivot = new THREE.Group();
  leanPivot.name = 'BikeLeanPivot';
  root.add(leanPivot);

  // Rear-axle wheelie pivot at (0, wheelRadius, wheelBaseR) so wheelies lift cleanly around the rear tire!
  const rearAxleY = def.wheelRadius;
  const rearAxleZ = def.wheelBaseR;
  const wheeliePivot = new THREE.Group();
  wheeliePivot.name = 'BikeWheeliePivot';
  wheeliePivot.position.set(0, rearAxleY, rearAxleZ);
  leanPivot.add(wheeliePivot);

  // Main chassis offset inversely from rearAxle so local (0,0,0) in chassis is ground-center of bike!
  const chassis = new THREE.Group();
  chassis.name = 'BikeChassis';
  chassis.position.set(0, -rearAxleY, -rearAxleZ);
  wheeliePivot.add(chassis);

  // --- 1. Exposed Tubular Trellis Frame (Signature Pegassi / Ducati Lattice!) ---
  const trellisMat = new THREE.MeshStandardMaterial({
    color: 0xc81e2b,
    metalness: 0.72,
    roughness: 0.24
  });
  for (const side of [-1, 1]) {
    const sx = side * 0.155;
    const upperSpar = buildPipeGeometry(
      [
        [side * 0.065, 0.84, 0.48],
        [sx, 0.74, 0.20],
        [sx * 0.96, 0.56, -0.14],
        [sx * 0.88, 0.42, -0.26]
      ],
      0.017,
      14,
      8
    );
    const lowerSpar = buildPipeGeometry(
      [
        [side * 0.065, 0.72, 0.46],
        [sx * 0.95, 0.54, 0.16],
        [sx * 0.88, 0.42, -0.26]
      ],
      0.015,
      12,
      8
    );
    const diagBrace1 = buildPipeGeometry(
      [
        [sx, 0.74, 0.20],
        [sx * 0.95, 0.54, 0.16]
      ],
      0.012,
      6,
      6
    );
    const diagBrace2 = buildPipeGeometry(
      [
        [sx, 0.74, 0.20],
        [sx * 0.88, 0.42, -0.26]
      ],
      0.012,
      6,
      6
    );
    const subFrame = buildPipeGeometry(
      [
        [sx * 0.92, 0.58, -0.16],
        [side * 0.125, 0.76, -0.48],
        [side * 0.085, 0.89, -0.86]
      ],
      0.013,
      10,
      7
    );
    for (const g of [upperSpar, lowerSpar, diagBrace1, diagBrace2, subFrame]) {
      const m = new THREE.Mesh(g, trellisMat);
      m.castShadow = true;
      chassis.add(m);
    }
  }

  // Steering headstock cylinder
  const headstock = new THREE.Mesh(
    new THREE.CylinderGeometry(0.044, 0.044, 0.21, 12),
    staticMats.darkChassis
  );
  headstock.position.set(0, 0.78, 0.48);
  headstock.rotation.x = 0.42;
  chassis.add(headstock);

  // --- 2. Compact Liquid-Cooled 999cc L4 / V4 Crankcase, Clutch Cover & Radiator ---
  const engineBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.27, 0.30, 0.36),
    staticMats.darkChassis
  );
  engineBlock.position.set(0, 0.39, 0.02);
  engineBlock.castShadow = true;
  chassis.add(engineBlock);

  for (const side of [-1, 1]) {
    const clutchCase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.095, 0.045, 16),
      staticMats.goldAnodized
    );
    clutchCase.rotation.z = Math.PI * 0.5;
    clutchCase.position.set(side * 0.15, 0.36, -0.04);
    chassis.add(clutchCase);
  }

  // Curved front aluminum oil/water radiator behind front wheel
  const radiator = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.27, 0.045),
    staticMats.brakeSteel
  );
  radiator.position.set(0, 0.48, 0.34);
  radiator.rotation.x = 0.36;
  chassis.add(radiator);

  // --- 3. Sculpted Aerodynamic Nose Cowling, Side Fairings, MotoGP Winglets & Fuel Tank ---
  const noseFairingGeo = buildLoftedBodyGeometry([
    { z: 0.26, yCenter: 0.78, halfW: 0.23, halfH: 0.16, topWidthRatio: 0.86, bottomWidthRatio: 0.92, chinePower: 0.85, deckCrown: 0.05 },
    { z: 0.52, yCenter: 0.80, halfW: 0.22, halfH: 0.15, topWidthRatio: 0.82, bottomWidthRatio: 0.88, chinePower: 0.82, deckCrown: 0.06 },
    { z: 0.76, yCenter: 0.75, halfW: 0.16, halfH: 0.11, topWidthRatio: 0.74, bottomWidthRatio: 0.78, chinePower: 0.78, deckCrown: 0.04 },
    { z: 0.94, yCenter: 0.69, halfW: 0.065, halfH: 0.055, topWidthRatio: 0.65, bottomWidthRatio: 0.55, chinePower: 0.75, deckCrown: 0.02 }
  ], 16);
  const noseFairing = new THREE.Mesh(noseFairingGeo, mats.paintMat);
  noseFairing.castShadow = true;
  noseFairing.receiveShadow = true;
  chassis.add(noseFairing);

  // Central ram-air intake mouth under nose tip
  const ramIntake = new THREE.Mesh(
    new THREE.BoxGeometry(0.095, 0.048, 0.12),
    staticMats.carbonSatin
  );
  ramIntake.position.set(0, 0.68, 0.88);
  chassis.add(ramIntake);

  // Tinted double-bubble racing windscreen
  const screenGeo = buildLoftedBodyGeometry([
    { z: 0.38, yCenter: 0.99, halfW: 0.155, halfH: 0.055, topWidthRatio: 0.70, bottomWidthRatio: 1.0, chinePower: 0.9, deckCrown: 0.05 },
    { z: 0.58, yCenter: 0.93, halfW: 0.145, halfH: 0.048, topWidthRatio: 0.72, bottomWidthRatio: 1.0, chinePower: 0.9, deckCrown: 0.04 },
    { z: 0.78, yCenter: 0.83, halfW: 0.095, halfH: 0.026, topWidthRatio: 0.75, bottomWidthRatio: 0.95, chinePower: 0.9, deckCrown: 0.02 }
  ], 14);
  const windscreen = new THREE.Mesh(screenGeo, staticMats.tintedGlass);
  chassis.add(windscreen);

  // Twin aggressive slanted LED headlights + DRL brow strips
  for (const side of [-1, 1]) {
    const hl = new THREE.Mesh(
      new THREE.BoxGeometry(0.088, 0.036, 0.11),
      mats.headlightMat
    );
    hl.position.set(side * 0.105, 0.73, 0.82);
    hl.rotation.set(0.28, side * 0.32, -side * 0.24);
    chassis.add(hl);

    // Aerodynamic MotoGP carbon biplane downforce winglet!
    const wingletUpper = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.012, 0.16),
      staticMats.carbonSatin
    );
    wingletUpper.position.set(side * 0.255, 0.69, 0.58);
    wingletUpper.rotation.set(0.18, 0, -side * 0.16);
    const wingletEndplate = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.065, 0.15),
      mats.accentMat
    );
    wingletEndplate.position.set(side * 0.315, 0.665, 0.58);
    const wingletLower = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.012, 0.14),
      staticMats.carbonSatin
    );
    wingletLower.position.set(side * 0.25, 0.635, 0.57);
    wingletLower.rotation.set(0.18, 0, side * 0.12);
    chassis.add(wingletUpper, wingletEndplate, wingletLower);

    // Lower sculpted shark-gill side fairing & belly pan
    const sideFairing = new THREE.Mesh(
      buildExtrudedSideProfile(
        [
          [-0.22, 0.20],
          [0.36, 0.19],
          [0.54, 0.36],
          [0.64, 0.68],
          [0.32, 0.72],
          [0.08, 0.52]
        ],
        0.042,
        0.008
      ),
      side > 0 ? mats.paintMat : mats.paintMat
    );
    sideFairing.position.x = side * 0.182;
    sideFairing.rotation.y = side * 0.04;
    sideFairing.castShadow = true;
    chassis.add(sideFairing);

    // Accent racing livery slash on fairing
    const liveryStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.085, 0.44),
      mats.accentMat
    );
    liveryStripe.position.set(side * 0.206, 0.51, 0.26);
    liveryStripe.rotation.x = -0.34;
    chassis.add(liveryStripe);
  }

  // Carbon-fiber lower belly pan tub
  const bellyPan = new THREE.Mesh(
    new THREE.BoxGeometry(0.33, 0.075, 0.68),
    staticMats.carbonSatin
  );
  bellyPan.position.set(0, 0.215, 0.08);
  chassis.add(bellyPan);

  // Sculpted Fuel Tank with knee cutouts & CNC quick-release gas cap
  const tankGeo = buildLoftedBodyGeometry([
    { z: -0.14, yCenter: 0.78, halfW: 0.145, halfH: 0.085, topWidthRatio: 0.85, bottomWidthRatio: 0.80, chinePower: 0.88, deckCrown: 0.03 },
    { z: 0.06, yCenter: 0.85, halfW: 0.215, halfH: 0.125, topWidthRatio: 0.90, bottomWidthRatio: 0.72, chinePower: 0.82, deckCrown: 0.05 },
    { z: 0.24, yCenter: 0.86, halfW: 0.205, halfH: 0.118, topWidthRatio: 0.88, bottomWidthRatio: 0.78, chinePower: 0.82, deckCrown: 0.04 },
    { z: 0.38, yCenter: 0.82, halfW: 0.145, halfH: 0.082, topWidthRatio: 0.82, bottomWidthRatio: 0.85, chinePower: 0.88, deckCrown: 0.02 }
  ], 16);
  const fuelTank = new THREE.Mesh(tankGeo, mats.paintMat);
  fuelTank.castShadow = true;
  chassis.add(fuelTank);

  const gasCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.045, 0.016, 14),
    staticMats.mirrorChrome
  );
  gasCap.position.set(0, 0.995, 0.16);
  gasCap.rotation.x = 0.12;
  chassis.add(gasCap);

  // Rider bucket sport saddle & sculpted raised aero tail section
  const riderSeat = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.058, 0.34),
    staticMats.darkAlcantara
  );
  riderSeat.position.set(0, 0.73, -0.22);
  riderSeat.rotation.x = -0.06;
  chassis.add(riderSeat);

  const tailCowlGeo = buildLoftedBodyGeometry([
    { z: -0.98, yCenter: 0.93, halfW: 0.065, halfH: 0.042, topWidthRatio: 0.85, bottomWidthRatio: 0.65, chinePower: 0.80, deckCrown: 0.02 },
    { z: -0.74, yCenter: 0.89, halfW: 0.155, halfH: 0.072, topWidthRatio: 0.92, bottomWidthRatio: 0.68, chinePower: 0.82, deckCrown: 0.03 },
    { z: -0.42, yCenter: 0.81, halfW: 0.165, halfH: 0.068, topWidthRatio: 0.90, bottomWidthRatio: 0.78, chinePower: 0.86, deckCrown: 0.02 }
  ], 14);
  const tailCowl = new THREE.Mesh(tailCowlGeo, mats.paintMat);
  tailCowl.castShadow = true;
  chassis.add(tailCowl);

  // Integrated sequential LED taillight blade
  const tailLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.028, 0.035),
    mats.taillightMat
  );
  tailLight.position.set(0, 0.925, -0.975);
  chassis.add(tailLight);

  // Twin Undertail Titanium & Carbon Exhaust Mufflers + Afterburner Flame Cones!
  const exhaustHeaderGeo = buildPipeGeometry(
    [
      [0.05, 0.25, 0.24],
      [0.07, 0.18, -0.06],
      [0.06, 0.34, -0.34],
      [0.0, 0.68, -0.56],
      [0.0, 0.84, -0.76]
    ],
    0.024,
    18,
    8
  );
  chassis.add(new THREE.Mesh(exhaustHeaderGeo, staticMats.titaniumBlued));

  const backfireFlames = [];
  for (const side of [-1, 1]) {
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.042, 0.26, 12),
      staticMats.titaniumBlued
    );
    can.rotation.x = Math.PI * 0.5 - 0.18;
    can.position.set(side * 0.062, 0.865, -0.84);
    const carbonTip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.038, 0.055, 12),
      staticMats.carbonSatin
    );
    carbonTip.rotation.x = Math.PI * 0.5 - 0.18;
    carbonTip.position.set(side * 0.062, 0.888, -0.97);
    chassis.add(can, carbonTip);

    const flameGroup = new THREE.Group();
    flameGroup.position.set(side * 0.062, 0.895, -1.02);
    const outerCone = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.32, 8), staticMats.afterburnerOuter);
    outerCone.rotation.x = -Math.PI * 0.5;
    outerCone.position.z = -0.15;
    const innerCone = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.20, 8), staticMats.afterburnerCore);
    innerCone.rotation.x = -Math.PI * 0.5;
    innerCone.position.z = -0.09;
    flameGroup.add(outerCone, innerCone);
    flameGroup.visible = false;
    chassis.add(flameGroup);
    backfireFlames.push(flameGroup);
  }

  // Tail tidy license plate bracket + amber LED micro turn signals
  const plateHolder = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.085, 0.012),
    mats.plateMat
  );
  plateHolder.position.set(0, 0.77, -0.92);
  plateHolder.rotation.x = 0.42;
  chassis.add(plateHolder);

  for (const side of [-1, 1]) {
    const blinker = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.014, 0.016), staticMats.amberTurn);
    blinker.position.set(side * 0.11, 0.80, -0.90);
    chassis.add(blinker);

    // CNC Rearset footpegs
    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.085, 8), staticMats.mirrorChrome);
    peg.rotation.z = Math.PI * 0.5;
    peg.position.set(side * 0.22, 0.36, -0.22);
    chassis.add(peg);
  }

  // --- 4. Rear Box Swingarm, Coil-Over Mono-Shock, Chain Drive & Rear Wheel ---
  const rearSuspNode = new THREE.Group();
  rearSuspNode.position.set(0, def.wheelRadius, def.wheelBaseR);
  chassis.add(rearSuspNode);

  // Sculpted aluminum gullwing swingarm arms from pivot (-0.24) to rear axle (-0.71)
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.036, 0.078, 0.52),
      staticMats.darkChassis
    );
    arm.position.set(side * 0.132, 0.02, 0.23);
    arm.rotation.x = -0.07;
    rearSuspNode.add(arm);
  }
  // Carbon rear hugger fender
  const rearHugger = new THREE.Mesh(
    new THREE.CylinderGeometry(def.wheelRadius + 0.032, def.wheelRadius + 0.032, 0.20, 14, 1, true, -0.4, 1.25),
    staticMats.carbonSatin
  );
  rearHugger.rotation.z = Math.PI * 0.5;
  rearSuspNode.add(rearHugger);

  // Yellow Ohlins-style mono-shock spring + gold reservoir
  const monoShock = new THREE.Mesh(
    new THREE.CylinderGeometry(0.034, 0.034, 0.24, 10),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.4, roughness: 0.3 })
  );
  monoShock.position.set(0, 0.49, -0.34);
  monoShock.rotation.x = -0.58;
  chassis.add(monoShock);

  // Rear 44-tooth gold sprocket + animated drive chain on left (+X) side
  const sprocket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.115, 0.115, 0.010, 20),
    staticMats.goldAnodized
  );
  sprocket.rotation.z = Math.PI * 0.5;
  sprocket.position.set(0.115, 0, 0);

  const rearWheelSpin = buildSportMotoWheel(def.wheelRadius, def.wheelWidthR, false, mats.rimMat, staticMats);
  rearWheelSpin.add(sprocket);
  rearSuspNode.add(rearWheelSpin);

  const chainRun = new THREE.Mesh(
    new THREE.BoxGeometry(0.016, 0.095, 0.52),
    chainMat
  );
  chainRun.position.set(0.115, 0.025, 0.24);
  chainRun.rotation.x = -0.06;
  rearSuspNode.add(chainRun);

  // --- 5. Steerable USD Gold Inverted Forks, Clip-On Handlebars, TFT Dash & Front Wheel ---
  const frontSuspNode = new THREE.Group();
  frontSuspNode.position.set(0, def.wheelRadius, def.wheelBaseF);
  chassis.add(frontSuspNode);

  const steerPivot = new THREE.Group();
  steerPivot.name = 'MotoSteerPivot';
  frontSuspNode.add(steerPivot);

  const forkRake = -0.41; // ~23.5 deg sportbike rake leaning up & back toward headstock
  const forkAssembly = new THREE.Group();
  forkAssembly.rotation.x = forkRake;
  steerPivot.add(forkAssembly);

  for (const side of [-1, 1]) {
    const fx = side * 0.108;
    // Lower chrome slider + radial Brembo brake caliper mount
    const slider = new THREE.Mesh(
      new THREE.CylinderGeometry(0.021, 0.021, 0.34, 12),
      staticMats.mirrorChrome
    );
    slider.position.set(fx, 0.16, 0);

    // Upper anodized gold inverted USD stanchion tube
    const stanchion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.027, 0.027, 0.44, 12),
      staticMats.goldAnodized
    );
    stanchion.position.set(fx, 0.48, 0);

    const caliper = new THREE.Mesh(
      new THREE.BoxGeometry(0.036, 0.075, 0.058),
      staticMats.caliperRed
    );
    caliper.position.set(side * 0.088, 0.08, -0.095);

    forkAssembly.add(slider, stanchion, caliper);
  }

  // Upper & lower CNC billet triple clamps
  for (const ty of [0.42, 0.66]) {
    const clampBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.255, 0.024, 0.075),
      staticMats.darkChassis
    );
    clampBar.position.set(0, ty, -0.01);
    forkAssembly.add(clampBar);
  }

  // Live glowing TFT race instrument dash mounted on upper triple tree (clearly visible in Góc Nhìn Buồng Lái!)
  const tftScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.145, 0.078, 0.018),
    staticMats.tftMotoMat
  );
  tftScreen.position.set(0, 0.71, 0.055);
  tftScreen.rotation.x = -0.52;
  forkAssembly.add(tftScreen);

  // Clip-on handlebars, grips, brake/clutch levers, fluid reservoir & bar-end mirrors
  for (const side of [-1, 1]) {
    const barGroup = new THREE.Group();
    barGroup.position.set(side * 0.115, 0.655, 0.01);
    barGroup.rotation.set(0.12, side * 0.26, -side * 0.16);

    const barTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.21, 8),
      staticMats.darkChassis
    );
    barTube.rotation.z = Math.PI * 0.5;
    barTube.position.x = side * 0.10;

    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.017, 0.017, 0.12, 10),
      staticMats.tireRubber
    );
    grip.rotation.z = Math.PI * 0.5;
    grip.position.x = side * 0.14;

    const lever = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.008, 0.014),
      staticMats.mirrorChrome
    );
    lever.position.set(side * 0.13, -0.005, 0.036);
    lever.rotation.y = -side * 0.18;

    const mirrorStalk = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.055, 0.016),
      staticMats.carbonSatin
    );
    mirrorStalk.position.set(side * 0.225, 0.032, -0.01);

    barGroup.add(barTube, grip, lever, mirrorStalk);
    if (side === -1) {
      // Front brake master cylinder reservoir cup on right clip-on (-X is right side of bike!)
      const resCup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.032, 10),
        new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.25 })
      );
      resCup.position.set(-0.08, 0.036, 0.02);
      barGroup.add(resCup);
    }
    forkAssembly.add(barGroup);
  }

  // Sculpted carbon-fiber front aero fender
  const frontFender = new THREE.Mesh(
    new THREE.CylinderGeometry(def.wheelRadius + 0.026, def.wheelRadius + 0.026, 0.15, 16, 1, true, -0.7, 1.35),
    staticMats.carbonSatin
  );
  frontFender.rotation.z = Math.PI * 0.5;
  steerPivot.add(frontFender);

  const frontWheelSpin = buildSportMotoWheel(def.wheelRadius, def.wheelWidthF, true, mats.rimMat, staticMats);
  steerPivot.add(frontWheelSpin);

  // --- 6. Retractable Left Side Kickstand ---
  const kickstandPivot = new THREE.Group();
  kickstandPivot.position.set(0.14, 0.22, -0.10);
  const standLeg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.009, 0.008, 0.28, 8),
    staticMats.darkChassis
  );
  standLeg.position.set(0.04, -0.12, -0.06);
  standLeg.rotation.set(0.38, 0, -0.34);
  kickstandPivot.add(standLeg);
  chassis.add(kickstandPivot);

  // Seat anchor & Night Headlight Cones
  const driverSeatAnchor = new THREE.Object3D();
  driverSeatAnchor.position.set(def.seatX, def.seatY, def.seatZ);
  chassis.add(driverSeatAnchor);

  const headlightCones = buildHeadlightBeamCones([[0, 0.72, 0.90]], 12.5, 2.5, staticMats.headlightBeam);
  chassis.add(headlightCones);

  const wheels = [
    {
      suspNode: frontSuspNode,
      steerPivot,
      spinGroup: frontWheelSpin,
      baseX: 0,
      baseY: def.wheelRadius,
      baseZ: def.wheelBaseF,
      isFront: true,
      radius: def.wheelRadius
    },
    {
      suspNode: rearSuspNode,
      steerPivot: rearSuspNode,
      spinGroup: rearWheelSpin,
      baseX: 0,
      baseY: def.wheelRadius,
      baseZ: def.wheelBaseR,
      isFront: false,
      radius: def.wheelRadius
    }
  ];

  return {
    root,
    leanPivot,
    wheeliePivot,
    chassis,
    plateStr,
    ...mats,
    chainMat,
    kickstandPivot,
    backfireFlames,
    wheels,
    steeringWheelPivot: steerPivot,
    driverSeatAnchor,
    headlightCones,
    smokeOriginLocal: new THREE.Vector3(0, 0.45, 0.10)
  };
}

// ============================================================================
// 1B. SCULPTED MOTORCYCLE #2: WESTERN DAEMON CRUISER ('chopper')
// ============================================================================

function buildChopperMesh(def, baseColor, accentColor, opts, staticMats, texWorkshop) {
  const plateStr = opts.plate || 'DMN 1969';
  const mats = makeVehiclePaintMaterials(def, baseColor, accentColor, plateStr, staticMats, texWorkshop);

  const root = new THREE.Group();
  root.name = 'ExtraVeh_Chopper';

  const leanPivot = new THREE.Group();
  leanPivot.name = 'ChopperLeanPivot';
  root.add(leanPivot);

  const rearAxleY = def.wheelRadius;
  const rearAxleZ = def.wheelBaseR;
  const wheeliePivot = new THREE.Group();
  wheeliePivot.name = 'ChopperWheeliePivot';
  wheeliePivot.position.set(0, rearAxleY, rearAxleZ);
  leanPivot.add(wheeliePivot);

  const chassis = new THREE.Group();
  chassis.name = 'ChopperChassis';
  chassis.position.set(0, -rearAxleY, -rearAxleZ);
  wheeliePivot.add(chassis);

  // --- 1. Classic Stretched Softail / Hardtail Tubular Cradle Frame ---
  const backboneGeo = buildPipeGeometry(
    [
      [0, 0.88, 0.48],
      [0, 0.72, 0.08],
      [0, 0.50, -0.30],
      [0, 0.34, -0.80]
    ],
    0.024,
    18,
    10
  );
  chassis.add(new THREE.Mesh(backboneGeo, mats.paintMat));

  for (const side of [-1, 1]) {
    const cradleGeo = buildPipeGeometry(
      [
        [side * 0.045, 0.84, 0.46],
        [side * 0.135, 0.25, 0.30],
        [side * 0.145, 0.20, -0.22],
        [side * 0.145, 0.33, -0.82]
      ],
      0.019,
      18,
      8
    );
    const m = new THREE.Mesh(cradleGeo, staticMats.darkChassis);
    m.castShadow = true;
    chassis.add(m);
  }

  // --- 2. Iconic 45-Degree Air-Cooled Chrome V-Twin Engine + Primary Drive + Slash-Cut Drag Pipes ---
  const crankcase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.135, 0.135, 0.24, 16),
    staticMats.mirrorChrome
  );
  crankcase.rotation.z = Math.PI * 0.5;
  crankcase.position.set(0, 0.31, 0.02);
  crankcase.castShadow = true;
  chassis.add(crankcase);

  // Left-side heavy chrome primary belt-drive housing (+X)
  const primaryCover = new THREE.Mesh(
    new THREE.BoxGeometry(0.065, 0.16, 0.42),
    staticMats.mirrorChrome
  );
  primaryCover.position.set(0.155, 0.29, -0.10);
  chassis.add(primaryCover);

  // Front & Rear 45-deg finned cylinder jugs!
  const frontJug = buildVeeTwinCylinderJug(0.24, 0.082, 10, staticMats);
  frontJug.position.set(0, 0.36, 0.05);
  frontJug.rotation.x = 0.39; // Angled forward +22.5 deg
  const rearJug = buildVeeTwinCylinderJug(0.24, 0.082, 10, staticMats);
  rearJug.position.set(0, 0.36, -0.01);
  rearJug.rotation.x = -0.39; // Angled back -22.5 deg
  chassis.add(frontJug, rearJug);

  // Round teardrop chrome air-cleaner on right side (-X) between V cylinders
  const airCleaner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.095, 0.055, 20),
    staticMats.mirrorChrome
  );
  airCleaner.rotation.z = Math.PI * 0.5;
  airCleaner.position.set(-0.155, 0.52, 0.02);
  chassis.add(airCleaner);

  // Twin sweeping chrome slash-cut drag pipes along right (-X) side!
  const frontPipeGeo = buildPipeGeometry(
    [
      [-0.08, 0.54, 0.16],
      [-0.185, 0.42, 0.26],
      [-0.195, 0.23, 0.06],
      [-0.195, 0.22, -0.58],
      [-0.195, 0.24, -1.02]
    ],
    0.028,
    24,
    10
  );
  const rearPipeGeo = buildPipeGeometry(
    [
      [-0.08, 0.52, -0.10],
      [-0.175, 0.38, -0.22],
      [-0.195, 0.30, -0.56],
      [-0.195, 0.32, -0.94]
    ],
    0.028,
    20,
    10
  );
  const pipe1 = new THREE.Mesh(frontPipeGeo, staticMats.mirrorChrome);
  const pipe2 = new THREE.Mesh(rearPipeGeo, staticMats.mirrorChrome);
  pipe1.castShadow = true;
  pipe2.castShadow = true;
  chassis.add(pipe1, pipe2);

  const backfireFlames = [];
  for (const [py, pz] of [[0.24, -1.04], [0.32, -0.96]]) {
    const fg = new THREE.Group();
    fg.position.set(-0.195, py, pz);
    const oc = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.26, 8), staticMats.afterburnerOuter);
    oc.rotation.x = -Math.PI * 0.5;
    oc.position.z = -0.12;
    fg.add(oc);
    fg.visible = false;
    chassis.add(fg);
    backfireFlames.push(fg);
  }

  // --- 3. Stretched Teardrop Peanut Tank, Stepped Saddle, Sissy Bar & Studded Saddlebags ---
  const teardropTankGeo = buildLoftedBodyGeometry([
    { z: -0.08, yCenter: 0.68, halfW: 0.115, halfH: 0.068, topWidthRatio: 0.90, bottomWidthRatio: 0.85, chinePower: 0.95, deckCrown: 0.02 },
    { z: 0.14, yCenter: 0.77, halfW: 0.195, halfH: 0.105, topWidthRatio: 0.94, bottomWidthRatio: 0.82, chinePower: 0.90, deckCrown: 0.04 },
    { z: 0.34, yCenter: 0.84, halfW: 0.205, halfH: 0.112, topWidthRatio: 0.92, bottomWidthRatio: 0.84, chinePower: 0.90, deckCrown: 0.04 },
    { z: 0.48, yCenter: 0.87, halfW: 0.115, halfH: 0.072, topWidthRatio: 0.85, bottomWidthRatio: 0.80, chinePower: 0.95, deckCrown: 0.02 }
  ], 16);
  const tank = new THREE.Mesh(teardropTankGeo, mats.paintMat);
  tank.castShadow = true;
  chassis.add(tank);

  // Flame/pinstripe accent spear + chrome tank console speedometer
  for (const side of [-1, 1]) {
    const flameSpear = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.048, 0.34),
      mats.accentMat
    );
    flameSpear.position.set(side * 0.192, 0.80, 0.23);
    flameSpear.rotation.x = -0.24;
    chassis.add(flameSpear);
  }
  const tankDash = new THREE.Mesh(
    new THREE.BoxGeometry(0.082, 0.032, 0.32),
    staticMats.mirrorChrome
  );
  tankDash.position.set(0, 0.92, 0.24);
  tankDash.rotation.x = -0.26;
  chassis.add(tankDash);

  // Low-slung stepped king-and-queen leather cruiser saddle
  const driverSeat = new THREE.Mesh(
    new THREE.BoxGeometry(0.29, 0.075, 0.36),
    staticMats.darkAlcantara
  );
  driverSeat.position.set(0, 0.54, -0.28);
  const pillionPad = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.085, 0.28),
    staticMats.darkAlcantara
  );
  pillionPad.position.set(0, 0.64, -0.58);
  pillionPad.rotation.x = -0.16;
  chassis.add(driverSeat, pillionPad);

  // Sweeping rear bobber fender + tall chrome sissy bar backrest!
  const rearFender = new THREE.Mesh(
    new THREE.CylinderGeometry(def.wheelRadius + 0.035, def.wheelRadius + 0.035, 0.24, 18, 1, true, -0.65, 2.05),
    mats.paintMat
  );
  rearFender.rotation.z = Math.PI * 0.5;
  rearFender.position.set(0, def.wheelRadius, def.wheelBaseR);
  chassis.add(rearFender);

  const sissyBarGeo = buildPipeGeometry(
    [
      [0.125, 0.56, -0.68],
      [0.095, 0.92, -0.84],
      [0.0, 1.18, -0.92],
      [-0.095, 0.92, -0.84],
      [-0.125, 0.56, -0.68]
    ],
    0.013,
    18,
    8
  );
  chassis.add(new THREE.Mesh(sissyBarGeo, staticMats.mirrorChrome));

  const backrestPad = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.14, 0.045),
    staticMats.darkAlcantara
  );
  backrestPad.position.set(0, 0.90, -0.82);
  backrestPad.rotation.x = -0.22;
  chassis.add(backrestPad);

  // Studded leather highway saddlebags + twin chrome coil shocks + forward highway pegs
  for (const side of [-1, 1]) {
    const bag = new THREE.Mesh(
      new THREE.BoxGeometry(0.135, 0.22, 0.36),
      staticMats.darkAlcantara
    );
    bag.position.set(side * 0.215, 0.48, -0.74);
    bag.castShadow = true;
    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.08, 0.035),
      staticMats.mirrorChrome
    );
    buckle.position.set(side * 0.285, 0.49, -0.74);
    chassis.add(bag, buckle);

    const rearShock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.026, 0.26, 10),
      staticMats.mirrorChrome
    );
    rearShock.position.set(side * 0.155, 0.44, -0.66);
    rearShock.rotation.x = -0.45;
    chassis.add(rearShock);

    const fwdPeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.12, 8),
      staticMats.mirrorChrome
    );
    fwdPeg.rotation.z = Math.PI * 0.5;
    fwdPeg.position.set(side * 0.24, 0.28, 0.34);
    chassis.add(fwdPeg);
  }

  // Tombstone chrome taillight & side-mounted license plate
  const tailLamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.085, 0.055, 0.04),
    mats.taillightMat
  );
  tailLamp.position.set(0, 0.56, -1.16);
  const plateMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.08, 0.012),
    mats.plateMat
  );
  plateMesh.position.set(0, 0.46, -1.18);
  plateMesh.rotation.x = 0.25;
  chassis.add(tailLamp, plateMesh);

  // --- 4. Fat Rear Cruiser Wheel ---
  const rearSuspNode = new THREE.Group();
  rearSuspNode.position.set(0, def.wheelRadius, def.wheelBaseR);
  chassis.add(rearSuspNode);
  const rearWheelSpin = buildWireChopperWheel(def.wheelRadius, def.wheelWidthR, 20, staticMats);
  rearSuspNode.add(rearWheelSpin);

  // --- 5. Long 38-Degree Raked Chrome Chopper Forks + Ape-Hanger Handlebars + 24-Spoke Front Wheel ---
  const frontSuspNode = new THREE.Group();
  frontSuspNode.position.set(0, def.wheelRadius, def.wheelBaseF);
  chassis.add(frontSuspNode);

  const steerPivot = new THREE.Group();
  steerPivot.name = 'ChopperSteerPivot';
  frontSuspNode.add(steerPivot);

  const chopperRake = -0.66; // Dramatic 38-degree chopper rake!
  const forkGroup = new THREE.Group();
  forkGroup.rotation.x = chopperRake;
  steerPivot.add(forkGroup);

  for (const side of [-1, 1]) {
    const longTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.024, 0.96, 12),
      staticMats.mirrorChrome
    );
    longTube.position.set(side * 0.112, 0.46, 0);
    longTube.castShadow = true;
    forkGroup.add(longTube);
  }

  for (const ty of [0.64, 0.88]) {
    const tree = new THREE.Mesh(
      new THREE.BoxGeometry(0.27, 0.028, 0.075),
      staticMats.mirrorChrome
    );
    tree.position.set(0, ty, 0);
    forkGroup.add(tree);
  }

  // Classic round chrome cyclops headlight + twin auxiliary passing lamps!
  const mainHeadBucket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.078, 0.062, 0.13, 16),
    staticMats.mirrorChrome
  );
  mainHeadBucket.rotation.x = Math.PI * 0.5 + 0.58;
  mainHeadBucket.position.set(0, 0.78, 0.09);
  const mainHeadLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.072, 0.072, 0.015, 16),
    mats.headlightMat
  );
  mainHeadLens.rotation.x = Math.PI * 0.5 + 0.58;
  mainHeadLens.position.set(0, 0.815, 0.145);
  forkGroup.add(mainHeadBucket, mainHeadLens);

  for (const side of [-1, 1]) {
    const auxLamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.036, 0.08, 12),
      staticMats.mirrorChrome
    );
    auxLamp.rotation.x = Math.PI * 0.5 + 0.58;
    auxLamp.position.set(side * 0.145, 0.73, 0.075);
    const auxLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.012, 12),
      mats.headlightMat
    );
    auxLens.rotation.x = Math.PI * 0.5 + 0.58;
    auxLens.position.set(side * 0.145, 0.752, 0.108);
    forkGroup.add(auxLamp, auxLens);
  }

  // Tall Sweeping Chrome Ape-Hanger Handlebars!
  const apeGeo = buildPipeGeometry(
    [
      [0.38, 1.24, -0.14],
      [0.28, 1.32, -0.02],
      [0.14, 0.92, 0.0],
      [-0.14, 0.92, 0.0],
      [-0.28, 1.32, -0.02],
      [-0.38, 1.24, -0.14]
    ],
    0.015,
    24,
    8
  );
  forkGroup.add(new THREE.Mesh(apeGeo, staticMats.mirrorChrome));

  for (const side of [-1, 1]) {
    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.020, 0.020, 0.13, 10),
      staticMats.darkAlcantara
    );
    grip.rotation.z = Math.PI * 0.5 - side * 0.25;
    grip.rotation.y = side * 0.35;
    grip.position.set(side * 0.35, 1.26, -0.10);

    const mirror = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.012, 12),
      staticMats.mirrorChrome
    );
    mirror.rotation.x = Math.PI * 0.5;
    mirror.position.set(side * 0.39, 1.35, -0.11);
    forkGroup.add(grip, mirror);
  }

  // Minimalist chrome bobber front fender & 24-spoke front wire wheel
  const frontBobFender = new THREE.Mesh(
    new THREE.CylinderGeometry(def.wheelRadius + 0.024, def.wheelRadius + 0.024, 0.13, 16, 1, true, -0.55, 1.15),
    mats.paintMat
  );
  frontBobFender.rotation.z = Math.PI * 0.5;
  steerPivot.add(frontBobFender);

  const frontWheelSpin = buildWireChopperWheel(def.wheelRadius, def.wheelWidthF, 24, staticMats);
  steerPivot.add(frontWheelSpin);

  // Kickstand
  const kickstandPivot = new THREE.Group();
  kickstandPivot.position.set(0.15, 0.20, -0.08);
  const standBar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.010, 0.009, 0.28, 8),
    staticMats.mirrorChrome
  );
  standBar.position.set(0.05, -0.11, -0.05);
  standBar.rotation.set(0.35, 0, -0.38);
  kickstandPivot.add(standBar);
  chassis.add(kickstandPivot);

  const driverSeatAnchor = new THREE.Object3D();
  driverSeatAnchor.position.set(def.seatX, def.seatY, def.seatZ);
  chassis.add(driverSeatAnchor);

  const headlightCones = buildHeadlightBeamCones([[0, 0.82, 0.92]], 13.0, 2.8, staticMats.headlightBeam);
  chassis.add(headlightCones);

  const wheels = [
    {
      suspNode: frontSuspNode,
      steerPivot,
      spinGroup: frontWheelSpin,
      baseX: 0,
      baseY: def.wheelRadius,
      baseZ: def.wheelBaseF,
      isFront: true,
      radius: def.wheelRadius
    },
    {
      suspNode: rearSuspNode,
      steerPivot: rearSuspNode,
      spinGroup: rearWheelSpin,
      baseX: 0,
      baseY: def.wheelRadius,
      baseZ: def.wheelBaseR,
      isFront: false,
      radius: def.wheelRadius
    }
  ];

  return {
    root,
    leanPivot,
    wheeliePivot,
    chassis,
    plateStr,
    ...mats,
    kickstandPivot,
    backfireFlames,
    wheels,
    steeringWheelPivot: steerPivot,
    driverSeatAnchor,
    headlightCones,
    smokeOriginLocal: new THREE.Vector3(0, 0.48, 0.02)
  };
}

// ============================================================================
// 2A. SCULPTED MARINE WATERCRAFT #1: SPEEDOPHILE SEASHARK ('jetski')
// ============================================================================

function buildMarinePropeller(radius, bladeCount, handedness, propMat) {
  const prop = new THREE.Group();
  const boss = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 0.28, radius * 0.72, 12),
    propMat
  );
  boss.rotation.x = -Math.PI * 0.5;
  prop.add(boss);

  const bladeGeo = new THREE.BoxGeometry(radius * 0.44, radius * 0.82, 0.014);
  for (let i = 0; i < bladeCount; i++) {
    const holder = new THREE.Group();
    holder.rotation.z = (i / bladeCount) * Math.PI * 2;
    const blade = new THREE.Mesh(bladeGeo, propMat);
    blade.position.y = radius * 0.52;
    blade.rotation.y = handedness * 0.52;
    holder.add(blade);
    prop.add(holder);
  }
  return prop;
}

function buildJetskiMesh(def, baseColor, accentColor, opts, staticMats, texWorkshop) {
  const plateStr = opts.plate || 'CF 808SA';
  const mats = makeVehiclePaintMaterials(def, baseColor, accentColor, plateStr, staticMats, texWorkshop);

  const root = new THREE.Group();
  root.name = 'ExtraVeh_Jetski';

  const chassis = new THREE.Group();
  chassis.name = 'JetskiChassis';
  root.add(chassis);

  // --- 1. Hydrodynamic Stepped Deep-V Lower Fiberglass Hull ---
  const lowerHullGeo = buildOpenVHullGeometry([
    { z: -1.56, keelY: -0.14, chineY: 0.04, sheerY: 0.28, chineX: 0.46, sheerX: 0.54, floorY: 0.16, gunwaleThick: 0.09 },
    { z: -1.05, keelY: -0.19, chineY: 0.02, sheerY: 0.32, chineX: 0.50, sheerX: 0.58, floorY: 0.16, gunwaleThick: 0.10 },
    { z: -0.35, keelY: -0.21, chineY: 0.01, sheerY: 0.35, chineX: 0.52, sheerX: 0.59, floorY: 0.16, gunwaleThick: 0.10 },
    { z: 0.35, keelY: -0.19, chineY: 0.03, sheerY: 0.38, chineX: 0.48, sheerX: 0.56, floorY: 0.18, gunwaleThick: 0.10 },
    { z: 0.95, keelY: -0.10, chineY: 0.11, sheerY: 0.43, chineX: 0.34, sheerX: 0.44, floorY: 0.25, gunwaleThick: 0.09 },
    { z: 1.42, keelY: 0.08, chineY: 0.24, sheerY: 0.48, chineX: 0.16, sheerX: 0.24, floorY: 0.34, gunwaleThick: 0.07 },
    { z: 1.62, keelY: 0.30, chineY: 0.38, sheerY: 0.50, chineX: 0.04, sheerX: 0.08, floorY: 0.42, gunwaleThick: 0.04 }
  ]);
  const lowerHull = new THREE.Mesh(lowerHullGeo, staticMats.pearlHullWhite);
  lowerHull.castShadow = true;
  lowerHull.receiveShadow = true;
  chassis.add(lowerHull);

  // Heavy-duty black marine rubber bumper rub-rail encircling sheerline
  const rubRailPts = [
    [0.0, 0.29, -1.57],
    [0.55, 0.32, -1.05],
    [0.59, 0.35, -0.30],
    [0.56, 0.38, 0.38],
    [0.43, 0.43, 0.98],
    [0.0, 0.50, 1.63],
    [-0.43, 0.43, 0.98],
    [-0.56, 0.38, 0.38],
    [-0.59, 0.35, -0.30],
    [-0.55, 0.32, -1.05]
  ];
  const rubRail = new THREE.Mesh(
    buildPipeGeometry(rubRailPts, 0.028, 36, 8, true),
    staticMats.tireRubber
  );
  chassis.add(rubRail);

  // Non-slip grooved EVA traction mats inside port & starboard footwells
  for (const side of [-1, 1]) {
    const footMat = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.018, 1.24),
      staticMats.darkAlcantara
    );
    footMat.position.set(side * 0.34, 0.18, -0.32);
    chassis.add(footMat);

    // Side hull racing stripe & Coast Guard registration number plate
    const sideSlash = new THREE.Mesh(
      new THREE.BoxGeometry(0.014, 0.09, 0.88),
      mats.accentMat
    );
    sideSlash.position.set(side * 0.54, 0.28, 0.18);
    sideSlash.rotation.y = -side * 0.11;
    chassis.add(sideSlash);
  }

  // --- 2. Sculpted Colored Upper Deck, Nose Hood Cowling & Bolstered Saddle ---
  const upperDeckGeo = buildLoftedBodyGeometry([
    { z: -1.32, yCenter: 0.44, halfW: 0.24, halfH: 0.14, topWidthRatio: 0.82, bottomWidthRatio: 1.0, chinePower: 0.88, deckCrown: 0.03 },
    { z: -0.68, yCenter: 0.52, halfW: 0.26, halfH: 0.19, topWidthRatio: 0.84, bottomWidthRatio: 1.0, chinePower: 0.86, deckCrown: 0.04 },
    { z: 0.02, yCenter: 0.58, halfW: 0.27, halfH: 0.22, topWidthRatio: 0.85, bottomWidthRatio: 1.0, chinePower: 0.85, deckCrown: 0.05 },
    { z: 0.62, yCenter: 0.62, halfW: 0.34, halfH: 0.20, topWidthRatio: 0.80, bottomWidthRatio: 1.0, chinePower: 0.84, deckCrown: 0.06 },
    { z: 1.18, yCenter: 0.54, halfW: 0.25, halfH: 0.11, topWidthRatio: 0.75, bottomWidthRatio: 1.0, chinePower: 0.84, deckCrown: 0.04 },
    { z: 1.54, yCenter: 0.49, halfW: 0.09, halfH: 0.04, topWidthRatio: 0.70, bottomWidthRatio: 0.9, chinePower: 0.88, deckCrown: 0.01 }
  ], 16);
  const upperDeck = new THREE.Mesh(upperDeckGeo, mats.paintMat);
  upperDeck.castShadow = true;
  chassis.add(upperDeck);

  // Forward tinted splash deflector cowling + dual marine LED projector lights + red/green sidelights
  const noseVisor = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.09, 0.42),
    staticMats.carbonSatin
  );
  noseVisor.position.set(0, 0.79, 0.58);
  noseVisor.rotation.x = 0.34;
  chassis.add(noseVisor);

  for (const side of [-1, 1]) {
    const beamEye = new THREE.Mesh(
      new THREE.BoxGeometry(0.095, 0.038, 0.08),
      mats.headlightMat
    );
    beamEye.position.set(side * 0.18, 0.61, 1.08);
    beamEye.rotation.y = side * 0.28;
    chassis.add(beamEye);

    const navLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 8, 8),
      side > 0 ? staticMats.navPortRed : staticMats.navStbdGreen
    );
    navLight.position.set(side * 0.34, 0.56, 0.82);
    chassis.add(navLight);

    // Sculpted side wing mirrors
    const mirrorPod = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.055, 0.15),
      mats.accentMat
    );
    mirrorPod.position.set(side * 0.36, 0.72, 0.54);
    mirrorPod.rotation.y = side * 0.24;
    chassis.add(mirrorPod);
  }

  // Digital LCD Speedo/Fuel Pod in front of rider
  const gaugePod = new THREE.Mesh(
    new THREE.BoxGeometry(0.19, 0.09, 0.035),
    staticMats.marineNavMat
  );
  gaugePod.position.set(0, 0.82, 0.44);
  gaugePod.rotation.x = -0.48;
  chassis.add(gaugePod);

  // Two-tone contoured straddle saddle + rear passenger lumbar bolster + stainless boarding grab bar
  const riderSaddle = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.11, 0.78),
    staticMats.darkAlcantara
  );
  riderSaddle.position.set(0, 0.66, -0.34);
  const bolster = new THREE.Mesh(
    new THREE.BoxGeometry(0.30, 0.15, 0.24),
    mats.accentMat
  );
  bolster.position.set(0, 0.72, -0.78);
  bolster.rotation.x = -0.18;
  chassis.add(riderSaddle, bolster);

  const rearGrabBar = new THREE.Mesh(
    buildPipeGeometry(
      [
        [0.16, 0.52, -0.94],
        [0.14, 0.58, -1.16],
        [-0.14, 0.58, -1.16],
        [-0.16, 0.52, -0.94]
      ],
      0.014,
      14,
      8
    ),
    staticMats.mirrorChrome
  );
  chassis.add(rearGrabBar);

  // Rear swim platform step bar + bow tow eye
  const swimPlatform = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.045, 0.28),
    staticMats.darkChassis
  );
  swimPlatform.position.set(0, 0.22, -1.44);
  const bowEye = new THREE.Mesh(
    new THREE.TorusGeometry(0.032, 0.008, 8, 14),
    staticMats.mirrorChrome
  );
  bowEye.position.set(0, 0.41, 1.59);
  bowEye.rotation.y = Math.PI * 0.5;
  chassis.add(swimPlatform, bowEye);

  // --- 3. Articulated Steering Column & Padded Jet-Ski Handlebars ---
  const steerPivot = new THREE.Group();
  steerPivot.name = 'JetskiSteerPivot';
  steerPivot.position.set(0, 0.78, 0.28);
  chassis.add(steerPivot);

  const steerNeck = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.24, 0.12),
    staticMats.darkChassis
  );
  steerNeck.position.set(0, 0.09, -0.02);
  steerNeck.rotation.x = -0.32;
  steerPivot.add(steerNeck);

  const barPipe = new THREE.Mesh(
    buildPipeGeometry(
      [
        [0.34, 0.20, -0.10],
        [0.18, 0.21, -0.04],
        [-0.18, 0.21, -0.04],
        [-0.34, 0.20, -0.10]
      ],
      0.014,
      16,
      8
    ),
    staticMats.darkChassis
  );
  const centerPad = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.055, 0.075),
    mats.accentMat
  );
  centerPad.position.set(0, 0.215, -0.04);
  steerPivot.add(barPipe, centerPad);

  for (const side of [-1, 1]) {
    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.020, 0.020, 0.12, 10),
      staticMats.tireRubber
    );
    grip.rotation.z = Math.PI * 0.5;
    grip.rotation.y = side * 0.30;
    grip.position.set(side * 0.28, 0.205, -0.08);
    steerPivot.add(grip);
  }

  // --- 4. Stern Water-Jet Pump Housing & Steerable Vectored Thrust Nozzle ---
  const pumpTunnel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.095, 0.24, 14),
    staticMats.darkChassis
  );
  pumpTunnel.rotation.x = Math.PI * 0.5;
  pumpTunnel.position.set(0, 0.03, -1.48);
  chassis.add(pumpTunnel);

  const jetNozzlePivot = new THREE.Group();
  jetNozzlePivot.name = 'JetskiJetNozzle';
  jetNozzlePivot.position.set(0, 0.03, -1.58);
  const nozzleCone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.058, 0.078, 0.14, 14, 1, true),
    staticMats.mirrorChrome
  );
  nozzleCone.rotation.x = Math.PI * 0.5;
  nozzleCone.position.z = -0.06;
  jetNozzlePivot.add(nozzleCone);
  chassis.add(jetNozzlePivot);

  const driverSeatAnchor = new THREE.Object3D();
  driverSeatAnchor.position.set(def.seatX, def.seatY, def.seatZ);
  chassis.add(driverSeatAnchor);

  const headlightCones = buildHeadlightBeamCones([[0, 0.58, 1.15]], 11.0, 2.6, staticMats.headlightBeam);
  chassis.add(headlightCones);

  return {
    root,
    chassis,
    plateStr,
    ...mats,
    jetNozzlePivot,
    wheels: [],
    steeringWheelPivot: steerPivot,
    driverSeatAnchor,
    headlightCones,
    smokeOriginLocal: new THREE.Vector3(0, 0.38, -0.95)
  };
}

// ============================================================================
// 2B. SCULPTED MARINE WATERCRAFT #2: LAMPADATI TORO LUXURY V-HULL ('speedboat')
// ============================================================================

function buildSpeedboatMesh(def, baseColor, accentColor, opts, staticMats, texWorkshop) {
  const plateStr = opts.plate || 'TORO V12';
  const mats = makeVehiclePaintMaterials(def, baseColor, accentColor, plateStr, staticMats, texWorkshop);

  const root = new THREE.Group();
  root.name = 'ExtraVeh_Speedboat';

  const chassis = new THREE.Group();
  chassis.name = 'SpeedboatChassis';
  root.add(chassis);

  // --- 1. Sleek 7.5m Twin-Step Deep-V Pearl-White Gelcoat Hull ---
  const hullGeo = buildOpenVHullGeometry([
    { z: -3.52, keelY: -0.26, chineY: 0.02, sheerY: 0.68, chineX: 1.04, sheerX: 1.14, floorY: 0.18, gunwaleThick: 0.15 },
    { z: -2.20, keelY: -0.34, chineY: -0.02, sheerY: 0.74, chineX: 1.14, sheerX: 1.26, floorY: 0.16, gunwaleThick: 0.16 },
    { z: -0.75, keelY: -0.36, chineY: -0.02, sheerY: 0.79, chineX: 1.18, sheerX: 1.29, floorY: 0.16, gunwaleThick: 0.16 },
    { z: 0.75, keelY: -0.32, chineY: 0.02, sheerY: 0.84, chineX: 1.10, sheerX: 1.24, floorY: 0.18, gunwaleThick: 0.16 },
    { z: 2.05, keelY: -0.18, chineY: 0.16, sheerY: 0.90, chineX: 0.80, sheerX: 0.98, floorY: 0.34, gunwaleThick: 0.14 },
    { z: 3.05, keelY: 0.08, chineY: 0.38, sheerY: 0.95, chineX: 0.38, sheerX: 0.54, floorY: 0.56, gunwaleThick: 0.10 },
    { z: 3.74, keelY: 0.48, chineY: 0.72, sheerY: 0.98, chineX: 0.05, sheerX: 0.09, floorY: 0.80, gunwaleThick: 0.05 }
  ]);
  const lowerHull = new THREE.Mesh(hullGeo, staticMats.pearlHullWhite);
  lowerHull.castShadow = true;
  lowerHull.receiveShadow = true;
  chassis.add(lowerHull);

  // Glossy Riva/Lampadati Honduras Mahogany Foredeck, Side Coamings & Transom Cap!
  const foredeckGeo = buildLoftedBodyGeometry([
    { z: 1.12, yCenter: 0.86, halfW: 1.22, halfH: 0.06, topWidthRatio: 0.98, bottomWidthRatio: 1.0, chinePower: 0.92, deckCrown: 0.08 },
    { z: 2.05, yCenter: 0.91, halfW: 0.97, halfH: 0.055, topWidthRatio: 0.98, bottomWidthRatio: 1.0, chinePower: 0.92, deckCrown: 0.07 },
    { z: 3.05, yCenter: 0.96, halfW: 0.53, halfH: 0.045, topWidthRatio: 0.96, bottomWidthRatio: 1.0, chinePower: 0.92, deckCrown: 0.04 },
    { z: 3.74, yCenter: 0.99, halfW: 0.08, halfH: 0.03, topWidthRatio: 0.90, bottomWidthRatio: 1.0, chinePower: 0.95, deckCrown: 0.01 }
  ], 16);
  const foredeck = new THREE.Mesh(foredeckGeo, staticMats.mahoganyGloss);
  foredeck.castShadow = true;
  foredeck.receiveShadow = true;
  chassis.add(foredeck);

  // Cockpit teak sole planked floor
  const cockpitFloor = new THREE.Mesh(
    new THREE.BoxGeometry(1.96, 0.03, 3.05),
    staticMats.mahoganyGloss
  );
  cockpitFloor.position.set(0, 0.18, -0.35);
  cockpitFloor.receiveShadow = true;
  chassis.add(cockpitFloor);

  // Side mahogany gunwale caps & chrome rub-rail + waterline accent pinstripe
  for (const side of [-1, 1]) {
    const coaming = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.055, 4.65),
      staticMats.mahoganyGloss
    );
    coaming.position.set(side * 1.18, 0.78, -1.18);
    chassis.add(coaming);

    const bootStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.075, 5.4),
      mats.accentMat
    );
    bootStripe.position.set(side * 1.19, 0.34, -0.65);
    bootStripe.rotation.y = -side * 0.04;
    chassis.add(bootStripe);

    // 3 Pop-up Stainless Mooring Cleats per side
    for (const cz of [-3.15, -0.45, 2.25]) {
      const cleatX = Math.abs(cz) > 2.0 && cz > 0 ? side * 0.82 : side * 1.18;
      const cleatY = cz > 1.2 ? 0.96 : 0.82;
      const cleat = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.032, 0.16),
        staticMats.mirrorChrome
      );
      cleat.position.set(cleatX, cleatY, cz);
      chassis.add(cleat);
    }
  }

  // Stainless Bow Stemhead, Pulpit Rails, Navigation Lights, Horn Trumpets & Skylight Hatch
  const bowStem = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.42, 0.24),
    staticMats.mirrorChrome
  );
  bowStem.position.set(0, 0.82, 3.68);
  bowStem.rotation.x = -0.46;
  chassis.add(bowStem);

  const skylightHatch = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.035, 0.62),
    staticMats.marineGlass
  );
  skylightHatch.position.set(0, 0.99, 2.18);
  skylightHatch.rotation.x = -0.04;
  chassis.add(skylightHatch);

  for (const side of [-1, 1]) {
    const pulpitGeo = buildPipeGeometry(
      [
        [side * 0.12, 1.04, 3.58],
        [side * 0.48, 1.08, 2.95],
        [side * 0.86, 1.04, 1.95],
        [side * 0.92, 0.93, 1.65]
      ],
      0.015,
      16,
      8
    );
    chassis.add(new THREE.Mesh(pulpitGeo, staticMats.mirrorChrome));

    const navPod = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 10, 10),
      side > 0 ? staticMats.navPortRed : staticMats.navStbdGreen
    );
    navPod.position.set(side * 0.42, 1.00, 3.12);
    chassis.add(navPod);

    // Chrome dual-trumpet air horn on foredeck
    const horn = new THREE.Mesh(
      new THREE.ConeGeometry(0.035, 0.24, 10),
      staticMats.mirrorChrome
    );
    horn.rotation.x = Math.PI * 0.5;
    horn.position.set(side * 0.72, 0.97, 1.52);
    chassis.add(horn);

    // Recessed halogen docking lights in bow hull cheeks
    const dockLamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 10, 10),
      mats.headlightMat
    );
    dockLamp.position.set(side * 0.44, 0.68, 3.02);
    chassis.add(dockLamp);
  }

  // --- 2. Wrap-Around Raked Tinted Frameless Marine Windshield + Chrome Header Rail ---
  const windshieldPts = [
    [1.14, 0.82, 0.32],
    [1.08, 1.06, 0.88],
    [0.58, 1.24, 1.18],
    [0.0, 1.28, 1.26],
    [-0.58, 1.24, 1.18],
    [-1.08, 1.06, 0.88],
    [-1.14, 0.82, 0.32]
  ];
  const topRail = new THREE.Mesh(
    buildPipeGeometry(windshieldPts, 0.018, 28, 8),
    staticMats.mirrorChrome
  );
  chassis.add(topRail);

  // Curved multi-pane wrap-around windshield panels
  const paneSpecs = [
    { x: 0, y: 1.06, z: 1.19, w: 1.22, h: 0.46, rx: -0.56, ry: 0 },
    { x: 0.84, y: 1.01, z: 1.01, w: 0.68, h: 0.44, rx: -0.48, ry: 0.52 },
    { x: -0.84, y: 1.01, z: 1.01, w: 0.68, h: 0.44, rx: -0.48, ry: -0.52 },
    { x: 1.11, y: 0.91, z: 0.58, w: 0.58, h: 0.32, rx: -0.22, ry: 1.42 },
    { x: -1.11, y: 0.91, z: 0.58, w: 0.58, h: 0.32, rx: -0.22, ry: -1.42 }
  ];
  for (let i = 0; i < paneSpecs.length; i++) {
    const ps = paneSpecs[i];
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(ps.w, ps.h),
      staticMats.marineGlass
    );
    pane.position.set(ps.x, ps.y, ps.z);
    pane.rotation.set(ps.rx, ps.ry, 0);
    chassis.add(pane);
  }

  // --- 3. Luxury Mahogany Helm Dashboard, Captain's Wheel, Twin Throttle & Quilted Seats ---
  const dashBulkhead = new THREE.Mesh(
    new THREE.BoxGeometry(2.14, 0.62, 0.36),
    staticMats.mahoganyGloss
  );
  dashBulkhead.position.set(0, 0.56, 0.96);
  chassis.add(dashBulkhead);

  const sonarPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.21),
    staticMats.marineNavMat
  );
  sonarPanel.position.set(0.52, 0.78, 0.77);
  sonarPanel.rotation.y = Math.PI;
  sonarPanel.rotation.x = 0.24;
  chassis.add(sonarPanel);

  // 5 Chrome-bezel analog marine dials across helm
  for (let d = 0; d < 5; d++) {
    const dial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 0.018, 14),
      staticMats.mirrorChrome
    );
    dial.rotation.x = Math.PI * 0.5 - 0.22;
    dial.position.set(-0.08 + d * 0.095, 0.81, 0.775);
    chassis.add(dial);
  }

  // Spoked Stainless & Mahogany Captain's Steering Wheel (Left/Port helm x = +0.52)
  const steeringWheelPivot = new THREE.Group();
  steeringWheelPivot.position.set(0.52, 0.74, 0.72);
  steeringWheelPivot.rotation.x = 0.36;
  const wheelRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.165, 0.018, 10, 24),
    staticMats.mahoganyGloss
  );
  const wheelHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.036, 0.04, 12),
    staticMats.mirrorChrome
  );
  wheelHub.rotation.x = Math.PI * 0.5;
  steeringWheelPivot.add(wheelRim, wheelHub);
  for (let s = 0; s < 5; s++) {
    const a = (s / 5) * Math.PI * 2;
    const sp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.007, 0.15, 6),
      staticMats.mirrorChrome
    );
    sp.position.set(Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0);
    sp.rotation.z = a - Math.PI * 0.5;
    steeringWheelPivot.add(sp);
  }
  chassis.add(steeringWheelPivot);

  // Twin Chrome Marine Throttle Binnacle Levers
  const throttleLeverPivot = new THREE.Group();
  throttleLeverPivot.position.set(0.16, 0.78, 0.68);
  for (const lx of [-0.028, 0.028]) {
    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.16, 8),
      staticMats.mirrorChrome
    );
    stalk.position.set(lx, 0.08, 0);
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.020, 10, 10),
      lx > 0 ? staticMats.caliperRed : staticMats.mirrorChrome
    );
    knob.position.set(lx, 0.16, 0);
    throttleLeverPivot.add(stalk, knob);
  }
  chassis.add(throttleLeverPivot);

  // Captain & Co-Captain Diamond-Quilted Cream Leather Pedestal Bucket Seats
  for (const sx of [0.52, -0.52]) {
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.085, 0.32, 12),
      staticMats.mirrorChrome
    );
    ped.position.set(sx, 0.34, 0.32);
    const cushion = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.12, 0.50),
      staticMats.creamQuilted
    );
    cushion.position.set(sx, 0.52, 0.32);
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.50, 0.52, 0.12),
      staticMats.creamQuilted
    );
    back.position.set(sx, 0.79, 0.10);
    back.rotation.x = -0.15;
    back.castShadow = true;
    chassis.add(ped, cushion, back);
  }

  // Rear U-Shaped VIP Cockpit Lounge Sofa + Mahogany Tiên Tửu Table
  const rearBench = new THREE.Mesh(
    new THREE.BoxGeometry(1.94, 0.28, 0.54),
    staticMats.creamQuilted
  );
  rearBench.position.set(0, 0.36, -1.48);
  const rearBackrest = new THREE.Mesh(
    new THREE.BoxGeometry(1.94, 0.38, 0.16),
    staticMats.creamQuilted
  );
  rearBackrest.position.set(0, 0.64, -1.72);
  chassis.add(rearBench, rearBackrest);

  for (const side of [-1, 1]) {
    const sideSettee = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.28, 0.96),
      staticMats.creamQuilted
    );
    sideSettee.position.set(side * 0.76, 0.36, -0.82);
    chassis.add(sideSettee);
  }

  const cocktailTable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.035, 18),
    staticMats.mahoganyGloss
  );
  cocktailTable.position.set(0, 0.54, -0.96);
  const tablePedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.06, 0.36, 10),
    staticMats.mirrorChrome
  );
  tablePedestal.position.set(0, 0.36, -0.96);
  chassis.add(cocktailTable, tablePedestal);

  // --- 4. Twin-Engine Aft Quilted Sunpad, Teak Swim Platform, Ladder, Flag & Twin Bronze Props ---
  const engineDeck = new THREE.Mesh(
    new THREE.BoxGeometry(2.18, 0.52, 1.56),
    staticMats.mahoganyGloss
  );
  engineDeck.position.set(0, 0.52, -2.58);
  engineDeck.castShadow = true;
  chassis.add(engineDeck);

  // Plush twin diamond-quilted cream leather sunpad cushions!
  for (const side of [-1, 1]) {
    const sunCushion = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.095, 1.38),
      staticMats.creamQuilted
    );
    sunCushion.position.set(side * 0.50, 0.82, -2.56);
    sunCushion.receiveShadow = true;
    chassis.add(sunCushion);

    // Chrome engine-room side air intake vents
    const sideVent = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.14, 0.68),
      staticMats.mirrorChrome
    );
    sideVent.position.set(side * 1.18, 0.62, -2.52);
    chassis.add(sideVent);
  }

  // Integrated Teak Swim Platform + Folding Stainless Boarding Ladder + Quad V12 Exhausts!
  const swimDeck = new THREE.Mesh(
    new THREE.BoxGeometry(2.08, 0.075, 0.56),
    staticMats.mahoganyGloss
  );
  swimDeck.position.set(0, 0.14, -3.68);
  chassis.add(swimDeck);

  for (const lx of [0.58, 0.84]) {
    const ladderRail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.44, 8),
      staticMats.mirrorChrome
    );
    ladderRail.position.set(lx, 0.02, -3.94);
    ladderRail.rotation.x = 0.25;
    chassis.add(ladderRail);
  }

  for (const ex of [-0.72, -0.48, 0.48, 0.72]) {
    const exhaustTip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.048, 0.14, 12),
      staticMats.mirrorChrome
    );
    exhaustTip.rotation.x = Math.PI * 0.5;
    exhaustTip.position.set(ex, 0.04, -3.52);
    chassis.add(exhaustTip);
  }

  // Stern Jackstaff & Animated Fluttering Yacht Ensign Flag
  const flagStaff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.010, 0.012, 0.62, 8),
    staticMats.mirrorChrome
  );
  flagStaff.position.set(0, 1.04, -3.38);
  flagStaff.rotation.x = -0.35;
  chassis.add(flagStaff);

  const flagGeo = new THREE.PlaneGeometry(0.36, 0.22, 6, 2);
  flagGeo.translate(-0.18, 0, 0);
  flagGeo.rotateY(Math.PI * 0.5);
  const flagMesh = new THREE.Mesh(
    flagGeo,
    new THREE.MeshStandardMaterial({
      color: 0xc81e2b,
      roughness: 0.55,
      side: THREE.DoubleSide
    })
  );
  flagMesh.position.set(0, 1.24, -3.46);
  chassis.add(flagMesh);

  // Twin Submerged Shafts, Bronze Rudders & Counter-Rotating 4-Blade Bronze Propellers!
  const propellerL = buildMarinePropeller(0.19, 4, 1, staticMats.bronzeProp);
  propellerL.position.set(0.48, -0.32, -3.36);
  const propellerR = buildMarinePropeller(0.19, 4, -1, staticMats.bronzeProp);
  propellerR.position.set(-0.48, -0.32, -3.36);
  chassis.add(propellerL, propellerR);

  for (const sx of [-0.48, 0.48]) {
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.85, 8),
      staticMats.mirrorChrome
    );
    shaft.rotation.x = Math.PI * 0.5 - 0.18;
    shaft.position.set(sx, -0.24, -2.96);
    const rudder = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.24, 0.16),
      staticMats.bronzeProp
    );
    rudder.position.set(sx, -0.30, -3.54);
    chassis.add(shaft, rudder);
  }

  const driverSeatAnchor = new THREE.Object3D();
  driverSeatAnchor.position.set(def.seatX, def.seatY, def.seatZ);
  chassis.add(driverSeatAnchor);

  const headlightCones = buildHeadlightBeamCones(
    [[-0.44, 0.66, 3.1], [0.44, 0.66, 3.1]],
    14.0,
    3.2,
    staticMats.headlightBeam
  );
  chassis.add(headlightCones);

  return {
    root,
    chassis,
    plateStr,
    ...mats,
    throttleLeverPivot,
    propellerL,
    propellerR,
    flagMesh,
    wheels: [],
    steeringWheelPivot,
    driverSeatAnchor,
    headlightCones,
    smokeOriginLocal: new THREE.Vector3(0, 0.68, -2.6)
  };
}

// ============================================================================
// 3A. SCULPTED ULTIMATE HYPERCAR: PEGASSI ZENTORNO ('zentorno')
//     Stealth-Fighter Wedge, 6 Hexagonal V12 Louvers, Neon Accent Blades,
//     Active Hydraulic Rear Wing & Upward-Opening Scissor Doors!
// ============================================================================

function buildForgedHyperWheel(radius, width, isRightSide, rimMat, accentColor, staticMats) {
  const spinGroup = new THREE.Group();
  const sideSign = isRightSide ? -1 : 1;

  // Wide low-profile hypercar slick tire
  const tireOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width, 28),
    staticMats.tireRubber
  );
  tireOuter.rotation.z = Math.PI * 0.5;
  tireOuter.castShadow = true;
  spinGroup.add(tireOuter);

  // Colored Pirelli-style racing sidewall stripe ring on outer face!
  const stripeMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0.35,
    roughness: 0.4
  });
  const sidewallRing = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.78, radius * 0.83, 28),
    stripeMat
  );
  sidewallRing.rotation.y = sideSign * Math.PI * 0.5;
  sidewallRing.position.x = sideSign * (width * 0.502);
  spinGroup.add(sidewallRing);

  // Deep concave forged alloy rim lip
  const rimR = radius * 0.75;
  const lipRing = new THREE.Mesh(
    new THREE.RingGeometry(rimR * 0.88, rimR, 28),
    rimMat
  );
  lipRing.rotation.y = sideSign * Math.PI * 0.5;
  lipRing.position.x = sideSign * (width * 0.495);
  spinGroup.add(lipRing);

  // 10 Directional Turbine Blades + Red Anodized Center-Lock Nut!
  const bladeLen = rimR * 0.84;
  const bladeGeo = new THREE.BoxGeometry(0.022, bladeLen, 0.030);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const blade = new THREE.Mesh(bladeGeo, rimMat);
    const mid = bladeLen * 0.48;
    blade.position.set(
      sideSign * (width * 0.44),
      Math.cos(a) * mid,
      Math.sin(a) * mid
    );
    blade.rotation.x = -a + 0.22;
    blade.rotation.z = -sideSign * 0.08;
    spinGroup.add(blade);
  }

  const centerLock = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.056, 0.045, 6),
    staticMats.caliperRed
  );
  centerLock.rotation.z = Math.PI * 0.5;
  centerLock.position.x = sideSign * (width * 0.49);
  spinGroup.add(centerLock);

  // Carbon-ceramic cross-drilled brake disc inside wheel barrel
  const ceramicDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, 0.028, 24),
    staticMats.brakeSteel
  );
  ceramicDisc.rotation.z = Math.PI * 0.5;
  ceramicDisc.position.x = sideSign * (width * 0.12);
  spinGroup.add(ceramicDisc);

  return spinGroup;
}

function buildHexagonalLouverFrame(spanW, depthZ, thickY, barThick, mat, glowMat) {
  const grp = new THREE.Group();
  const halfW = spanW * 0.5;
  // Angled chevron-hexagon left & right wings meeting at dorsal spine
  for (const side of [-1, 1]) {
    const mainBar = new THREE.Mesh(
      new THREE.BoxGeometry(halfW * 0.72, thickY, depthZ),
      mat
    );
    mainBar.position.set(side * halfW * 0.34, 0, 0);
    mainBar.rotation.y = side * 0.28;
    mainBar.rotation.z = -side * 0.06;
    mainBar.castShadow = true;
    grp.add(mainBar);

    const outerCorner = new THREE.Mesh(
      new THREE.BoxGeometry(halfW * 0.34, thickY, barThick * 1.4),
      mat
    );
    outerCorner.position.set(side * halfW * 0.80, -0.01, -depthZ * 0.32);
    outerCorner.rotation.y = -side * 0.52;
    grp.add(outerCorner);

    if (glowMat) {
      const trimEdge = new THREE.Mesh(
        new THREE.BoxGeometry(halfW * 0.68, thickY * 0.45, 0.014),
        glowMat
      );
      trimEdge.position.set(side * halfW * 0.34, 0.004, -depthZ * 0.51);
      trimEdge.rotation.y = side * 0.28;
      grp.add(trimEdge);
    }
  }
  return grp;
}

function buildZentornoScissorDoor(side, paintMat, accentTrimMat, staticMats) {
  // side: +1 = Left Driver Door, -1 = Right Passenger Door
  // Pivot is anchored at front A-pillar hinge: (side * 0.96, 0.58, 0.68)
  const pivot = new THREE.Group();
  pivot.name = side > 0 ? 'LeftScissorDoorPivot' : 'RightScissorDoorPivot';
  pivot.position.set(side * 0.96, 0.58, 0.68);

  // Outer faceted stealth-wedge door skin extending aft from z=0 to z=-1.34 in pivot space
  const outerSkinGeo = buildExtrudedSideProfile(
    [
      [-1.34, -0.34],
      [-0.02, -0.36],
      [0.04, 0.06],
      [-0.46, 0.14],
      [-1.22, 0.18],
      [-1.38, -0.06]
    ],
    0.068,
    0.012
  );
  const outerSkin = new THREE.Mesh(outerSkinGeo, paintMat);
  outerSkin.position.x = side * 0.025;
  outerSkin.castShadow = true;
  outerSkin.receiveShadow = true;
  pivot.add(outerSkin);

  // Aggressive diagonal carbon side-intake blade + sleek satin metallic trim spear (no flashy neon!)
  const intakeBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.065, 1.08),
    staticMats.carbonSatin
  );
  intakeBlade.position.set(side * 0.062, -0.10, -0.68);
  intakeBlade.rotation.x = -0.21;
  pivot.add(intakeBlade);

  const neonDoorSpear = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.022, 1.04),
    accentTrimMat
  );
  neonDoorSpear.position.set(side * 0.088, -0.085, -0.68);
  neonDoorSpear.rotation.x = -0.21;
  pivot.add(neonDoorSpear);

  // Frameless raked tinted side window glass
  const windowShape = new THREE.Shape();
  windowShape.moveTo(-0.04, 0.06);
  windowShape.lineTo(-0.52, 0.42);
  windowShape.lineTo(-1.14, 0.40);
  windowShape.lineTo(-1.26, 0.17);
  windowShape.lineTo(-0.46, 0.13);
  windowShape.closePath();
  const winGeo = new THREE.ShapeGeometry(windowShape);
  winGeo.rotateY(Math.PI * 0.5);
  const winMesh = new THREE.Mesh(winGeo, staticMats.tintedGlass);
  winMesh.position.x = -side * 0.02;
  winMesh.rotation.z = side * 0.34; // Tumblehome inward glass lean!
  const winMeshBack = winMesh.clone();
  winMeshBack.rotation.y = Math.PI;
  pivot.add(winMesh, winMeshBack);

  // Carbon-fiber aero stalk wing mirror
  const mirrorStalk = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.024, 0.065),
    staticMats.carbonSatin
  );
  mirrorStalk.position.set(side * 0.11, 0.11, -0.18);
  mirrorStalk.rotation.z = side * 0.22;
  const mirrorHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.062, 0.16),
    paintMat
  );
  mirrorHousing.position.set(side * 0.19, 0.14, -0.22);
  mirrorHousing.rotation.y = side * 0.20;
  pivot.add(mirrorStalk, mirrorHousing);

  // Quilted Alcantara interior door card + racing pull-strap (visible when door swings open!)
  const innerCard = new THREE.Mesh(
    new THREE.BoxGeometry(0.036, 0.42, 1.18),
    staticMats.darkAlcantara
  );
  innerCard.position.set(-side * 0.022, -0.12, -0.66);
  const pullStrap = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.028, 0.14),
    accentTrimMat
  );
  pullStrap.position.set(-side * 0.046, -0.05, -0.48);
  pivot.add(innerCard, pullStrap);

  return pivot;
}

function buildZentornoMesh(def, baseColor, accentColor, opts, staticMats, texWorkshop) {
  const plateStr = opts.plate || 'ZNT V12X';
  const mats = makeVehiclePaintMaterials(def, baseColor, accentColor, plateStr, staticMats, texWorkshop);
  // Sleek dark satin metallic trim for Zentorno (zero garish neon!)
  const mutedTrimMat = new THREE.MeshStandardMaterial({
    color: 0x3b414d,
    metalness: 0.72,
    roughness: 0.34
  });

  const root = new THREE.Group();
  root.name = 'ExtraVeh_Zentorno';

  const chassis = new THREE.Group();
  chassis.name = 'ZentornoChassis';
  root.add(chassis);

  // --- 1. Carbon-Fiber Flat Undertray, Front Venturi Splitter & Aero Dive Canards ---
  const frontBumperGroup = new THREE.Group();
  frontBumperGroup.name = 'FrontBumperGroup';
  chassis.add(frontBumperGroup);

  const rearBumperGroup = new THREE.Group();
  rearBumperGroup.name = 'RearBumperGroup';
  chassis.add(rearBumperGroup);

  const undertray = new THREE.Mesh(
    new THREE.BoxGeometry(1.94, 0.055, 4.38),
    staticMats.carbonSatin
  );
  undertray.position.set(0, 0.14, 0.02);
  chassis.add(undertray);

  // Razor-edged carbon front splitter + satin metallic leading-edge trim
  const frontSplitter = new THREE.Mesh(
    new THREE.BoxGeometry(2.06, 0.038, 0.62),
    staticMats.carbonSatin
  );
  frontSplitter.position.set(0, 0.135, 2.08);
  const frontNeonLip = new THREE.Mesh(
    new THREE.BoxGeometry(1.96, 0.018, 0.035),
    mutedTrimMat
  );
  frontNeonLip.position.set(0, 0.142, 2.385);
  frontBumperGroup.add(frontSplitter, frontNeonLip);

  // Twin hexagonal front radiator air mouths + vertical carbon dive-plane canards
  for (const side of [-1, 1]) {
    const airMouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.21, 0.16),
      staticMats.darkChassis
    );
    airMouth.position.set(side * 0.58, 0.27, 2.22);
    airMouth.rotation.y = side * 0.16;

    const mouthFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.022, 0.18),
      mutedTrimMat
    );
    mouthFrame.position.set(side * 0.58, 0.375, 2.22);
    mouthFrame.rotation.y = side * 0.16;

    const canard = new THREE.Mesh(
      new THREE.BoxGeometry(0.020, 0.19, 0.28),
      staticMats.carbonSatin
    );
    canard.position.set(side * 1.02, 0.23, 2.18);
    canard.rotation.z = -side * 0.14;

    frontBumperGroup.add(airMouth, mouthFrame, canard);
  }

  // --- 2. Faceted Stealth-Fighter Wedge Nose, Fenders, Side Skirts & Rear Haunches ---
  // Sculpted low-slung central nose & frunk hood panel (buckles on heavy frontal crash!)
  const hoodPanel = new THREE.Group();
  hoodPanel.name = 'ZentornoHoodPanel';
  const noseWedgeGeo = buildLoftedBodyGeometry([
    { z: 0.72, yCenter: 0.56, halfW: 0.88, halfH: 0.16, topWidthRatio: 0.94, bottomWidthRatio: 1.0, chinePower: 0.80, deckCrown: 0.02 },
    { z: 1.38, yCenter: 0.46, halfW: 0.86, halfH: 0.15, topWidthRatio: 0.90, bottomWidthRatio: 1.0, chinePower: 0.78, deckCrown: -0.02 },
    { z: 1.98, yCenter: 0.34, halfW: 0.78, halfH: 0.12, topWidthRatio: 0.84, bottomWidthRatio: 0.96, chinePower: 0.76, deckCrown: -0.02 },
    { z: 2.38, yCenter: 0.24, halfW: 0.42, halfH: 0.065, topWidthRatio: 0.75, bottomWidthRatio: 0.88, chinePower: 0.75, deckCrown: 0.0 }
  ], 16);
  const noseWedge = new THREE.Mesh(noseWedgeGeo, mats.paintMat);
  noseWedge.castShadow = true;
  noseWedge.receiveShadow = true;
  hoodPanel.add(noseWedge);

  // Twin NACA hood aero extractor ducts + central glowing accent crease
  for (const side of [-1, 1]) {
    const duct = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.024, 0.42),
      staticMats.carbonSatin
    );
    duct.position.set(side * 0.28, 0.52, 1.54);
    duct.rotation.x = 0.18;
    hoodPanel.add(duct);
  }
  const noseCrease = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.018, 1.15),
    mutedTrimMat
  );
  noseCrease.position.set(0, 0.49, 1.62);
  noseCrease.rotation.x = 0.19;
  hoodPanel.add(noseCrease);
  chassis.add(hoodPanel);

  // Sculpted muscular front & rear wheel-arch haunches + razor carbon side skirts!
  for (const side of [-1, 1]) {
    const frontFenderGeo = buildExtrudedSideProfile(
      [
        [0.65, 0.20],
        [0.98, 0.20],
        [1.06, 0.56],
        [1.42, 0.64],
        [1.78, 0.52],
        [1.86, 0.20],
        [2.24, 0.18],
        [2.12, 0.44],
        [1.48, 0.72],
        [0.68, 0.66]
      ],
      0.24,
      0.018
    );
    const frontFender = new THREE.Mesh(frontFenderGeo, mats.paintMat);
    frontFender.position.x = side * 0.94;
    frontFender.castShadow = true;
    chassis.add(frontFender);

    // Signature Y-blade Matrix Headlight on each front fender!
    const hlMain = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.036, 0.38),
      mats.headlightMat
    );
    hlMain.position.set(side * 0.84, 0.51, 1.92);
    hlMain.rotation.set(0.26, side * 0.18, -side * 0.15);
    const hlBranch = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.026, 0.18),
      mats.headlightMat
    );
    hlBranch.position.set(side * 0.75, 0.49, 1.84);
    hlBranch.rotation.set(0.24, -side * 0.36, 0);
    chassis.add(hlMain, hlBranch);

    // Wide sculpted rear V12 air-scoop haunches
    const rearHaunchGeo = buildExtrudedSideProfile(
      [
        [-2.26, 0.28],
        [-1.82, 0.22],
        [-1.72, 0.58],
        [-1.38, 0.68],
        [-1.02, 0.56],
        [-0.94, 0.20],
        [-0.62, 0.20],
        [-0.58, 0.76],
        [-1.25, 0.88],
        [-2.18, 0.78]
      ],
      0.30,
      0.020
    );
    const rearHaunch = new THREE.Mesh(rearHaunchGeo, mats.paintMat);
    rearHaunch.position.x = side * 0.92;
    rearHaunch.castShadow = true;
    chassis.add(rearHaunch);

    // Deep side V12 radiator scoop mouth right behind scissor door
    const sideScoop = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.44, 0.28),
      staticMats.carbonSatin
    );
    sideScoop.position.set(side * 0.95, 0.54, -0.68);
    sideScoop.rotation.y = side * 0.22;
    chassis.add(sideScoop);

    // Carbon-fiber aerodynamic side skirt + dark carbon/metallic trim blade
    const sideSkirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.052, 1.72),
      staticMats.carbonSatin
    );
    sideSkirt.position.set(side * 1.00, 0.165, 0.04);
    const skirtNeon = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.018, 1.68),
      mutedTrimMat
    );
    skirtNeon.position.set(side * 1.08, 0.165, 0.04);
    chassis.add(sideSkirt, skirtNeon);
  }

  // --- 3. Raked Panoramic Windshield, Stealth Canopy Roof & Full Fighter Cockpit ---
  // Steeply raked hypercar windshield (`64°` rake!) + A-pillars
  const frontWindshield = new THREE.Mesh(
    new THREE.PlaneGeometry(1.52, 0.96),
    staticMats.tintedGlass
  );
  frontWindshield.position.set(0, 0.86, 0.56);
  frontWindshield.rotation.x = -1.10;
  chassis.add(frontWindshield);

  for (const side of [-1, 1]) {
    const aPillar = new THREE.Mesh(
      buildPipeGeometry(
        [
          [side * 0.88, 0.62, 0.94],
          [side * 0.68, 0.92, 0.46],
          [side * 0.56, 1.11, 0.08]
        ],
        0.028,
        12,
        8
      ),
      mats.paintMat
    );
    chassis.add(aPillar);
  }

  // Faceted roof canopy + roof air snorkel scoop + twin carbon roof accent rails
  const roofCanopy = new THREE.Mesh(
    new THREE.BoxGeometry(1.16, 0.055, 0.78),
    mats.paintMat
  );
  roofCanopy.position.set(0, 1.11, -0.26);
  roofCanopy.castShadow = true;
  const roofScoop = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.075, 0.46),
    staticMats.carbonSatin
  );
  roofScoop.position.set(0, 1.15, -0.34);
  chassis.add(roofCanopy, roofScoop);

  for (const side of [-1, 1]) {
    const roofNeon = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.016, 0.76),
      mutedTrimMat
    );
    roofNeon.position.set(side * 0.54, 1.14, -0.26);
    chassis.add(roofNeon);
  }

  // Sculpted Interior Cabin (Visible in Góc Nhìn Buồng Lái AND when Scissor Doors open!)
  const cabinTub = new THREE.Mesh(
    new THREE.BoxGeometry(1.68, 0.08, 1.56),
    staticMats.darkChassis
  );
  cabinTub.position.set(0, 0.22, 0.04);
  const centerTunnel = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.26, 1.38),
    staticMats.carbonSatin
  );
  centerTunnel.position.set(0, 0.36, 0.12);
  // Red fighter-jet flip-cover starter button on center console!
  const starterFlip = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.028, 0.065),
    staticMats.caliperRed
  );
  starterFlip.position.set(0, 0.50, 0.22);
  const dashHood = new THREE.Mesh(
    new THREE.BoxGeometry(1.64, 0.22, 0.46),
    staticMats.darkAlcantara
  );
  dashHood.position.set(0, 0.62, 0.68);
  const clusterBinnacle = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.14, 0.26),
    staticMats.carbonSatin
  );
  clusterBinnacle.position.set(0.41, 0.74, 0.58);
  chassis.add(cabinTub, centerTunnel, starterFlip, dashHood, clusterBinnacle);

  // Flat-bottom carbon-fiber race steering wheel + paddle shifters
  const steeringWheelPivot = new THREE.Group();
  steeringWheelPivot.position.set(0.41, 0.68, 0.40);
  steeringWheelPivot.rotation.x = -0.26;
  const swRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.145, 0.018, 10, 20),
    staticMats.carbonSatin
  );
  const swHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.032, 6),
    mats.accentMat
  );
  swHub.rotation.x = Math.PI * 0.5;
  const shiftLedStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.012, 0.018),
    mats.accentGlowMat
  );
  shiftLedStrip.position.set(0, 0.142, 0.01);
  steeringWheelPivot.add(swRing, swHub, shiftLedStrip);
  for (const side of [-1, 1]) {
    const paddle = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.095, 0.008),
      staticMats.mirrorChrome
    );
    paddle.position.set(side * 0.11, 0.02, 0.03);
    steeringWheelPivot.add(paddle);
  }
  chassis.add(steeringWheelPivot);

  // Left & Right Quilted Carbon-Backed Racing Bucket Seats
  for (const sx of [0.42, -0.42]) {
    const seatBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.09, 0.48),
      staticMats.darkAlcantara
    );
    seatBase.position.set(sx, 0.28, -0.02);
    const seatBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.62, 0.09),
      staticMats.darkAlcantara
    );
    seatBack.position.set(sx, 0.58, -0.26);
    seatBack.rotation.x = -0.24;
    const headrestAccent = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.095),
      mats.accentMat
    );
    headrestAccent.position.set(sx, 0.80, -0.31);
    headrestAccent.rotation.x = -0.24;
    chassis.add(seatBase, seatBack, headrestAccent);
  }

  // --- 4. Animated Upward-Opening Scissor Doors! ---
  const leftDoorPivot = buildZentornoScissorDoor(1, mats.paintMat, mutedTrimMat, staticMats);
  const rightDoorPivot = buildZentornoScissorDoor(-1, mats.paintMat, mutedTrimMat, staticMats);
  chassis.add(leftDoorPivot, rightDoorPivot);

  // --- 5. Exposed Mid-Mounted 6.5L V12 Engine + 6 Tiered Hexagonal Carbon Louvers + Shark Fin! ---
  const engineBayFloor = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.18, 1.28),
    staticMats.darkChassis
  );
  engineBayFloor.position.set(0, 0.56, -1.32);
  chassis.add(engineBayFloor);

  // Twin red V12 cylinder head covers + 12 anodized gold velocity intake trumpets + X-strut brace!
  for (const side of [-1, 1]) {
    const v12Bank = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.11, 0.78),
      staticMats.v12RedPlenum
    );
    v12Bank.position.set(side * 0.21, 0.69, -1.26);
    v12Bank.rotation.z = -side * 0.26;
    chassis.add(v12Bank);

    for (let cyl = 0; cyl < 6; cyl++) {
      const trumpet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.016, 0.07, 8),
        staticMats.goldAnodized
      );
      trumpet.position.set(side * 0.11, 0.76, -0.96 - cyl * 0.12);
      chassis.add(trumpet);
    }
  }
  for (const diag of [-1, 1]) {
    const xStrut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 1.05, 8),
      staticMats.titaniumBlued
    );
    xStrut.rotation.x = Math.PI * 0.5;
    xStrut.rotation.z = diag * 0.68;
    xStrut.position.set(0, 0.80, -1.28);
    chassis.add(xStrut);
  }

  // 6 Tiered Hexagonal Stealth Engine Louvers cascading down the rear spine!
  for (let lv = 0; lv < 6; lv++) {
    const t = lv / 5;
    const lz = veLerp(-0.78, -1.88, t);
    const ly = veLerp(1.06, 0.80, t);
    const lSpan = veLerp(1.14, 1.38, t);
    const hexLouver = buildHexagonalLouverFrame(
      lSpan,
      0.13,
      0.032,
      0.028,
      staticMats.carbonSatin,
      lv % 2 === 0 ? mutedTrimMat : null
    );
    hexLouver.position.set(0, ly, lz);
    hexLouver.rotation.x = -0.22;
    chassis.add(hexLouver);
  }

  // Central LMP1 dorsal aero shark fin spine
  const sharkFin = new THREE.Mesh(
    buildExtrudedSideProfile(
      [
        [-1.92, 0.80],
        [-0.68, 1.10],
        [-0.72, 1.17],
        [-1.88, 0.92]
      ],
      0.028,
      0.004
    ),
    staticMats.carbonSatin
  );
  chassis.add(sharkFin);

  // --- 6. Rear Laser Chevron Taillights, Venturi Diffuser, Central Hex Exhaust & Active GT Wing ---
  const rearFascia = new THREE.Mesh(
    new THREE.BoxGeometry(2.02, 0.36, 0.18),
    staticMats.carbonSatin
  );
  rearFascia.position.set(0, 0.56, -2.24);
  rearBumperGroup.add(rearFascia);

  // Full-width Y-chevron laser LED taillight blades + white reverse bar
  for (const side of [-1, 1]) {
    const tailBlade = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.036, 0.05),
      mats.taillightMat
    );
    tailBlade.position.set(side * 0.56, 0.69, -2.32);
    tailBlade.rotation.z = side * 0.08;
    const tailWing = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.028, 0.05),
      mats.taillightMat
    );
    tailWing.position.set(side * 0.84, 0.63, -2.31);
    tailWing.rotation.z = -side * 0.36;
    rearBumperGroup.add(tailBlade, tailWing);
  }

  const revStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.022, 0.04),
    mats.reverseLightMat
  );
  revStrip.position.set(0, 0.62, -2.33);
  const rearPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.15, 0.018),
    mats.plateMat
  );
  rearPlate.position.set(0, 0.49, -2.34);
  rearBumperGroup.add(revStrip, rearPlate);

  // Central Hexagonal Titanium Triple-Pipe Exhaust Cluster + Dual V12 Afterburner Cones!
  const hexBezel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.155, 0.155, 0.09, 6),
    staticMats.mirrorChrome
  );
  hexBezel.rotation.x = Math.PI * 0.5;
  hexBezel.position.set(0, 0.33, -2.32);
  rearBumperGroup.add(hexBezel);

  const backfireFlames = [];
  for (const [ex, ey] of [[-0.055, 0.31], [0.055, 0.31], [0.0, 0.365]]) {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.038, 0.14, 12),
      staticMats.titaniumBlued
    );
    pipe.rotation.x = Math.PI * 0.5;
    pipe.position.set(ex, ey, -2.34);
    rearBumperGroup.add(pipe);

    const fg = new THREE.Group();
    fg.position.set(ex, ey, -2.41);
    const outerF = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.44, 8), staticMats.afterburnerOuter);
    outerF.rotation.x = -Math.PI * 0.5;
    outerF.position.z = -0.21;
    const innerF = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.26, 8), staticMats.afterburnerCore);
    innerF.rotation.x = -Math.PI * 0.5;
    innerF.position.z = -0.12;
    fg.add(outerF, innerF);
    fg.visible = false;
    rearBumperGroup.add(fg);
    backfireFlames.push(fg);
  }

  // 6 Vertical Carbon Venturi Diffuser Strakes + Muted Metallic Edge Highlights
  for (const dx of [-0.88, -0.58, -0.28, 0.28, 0.58, 0.88]) {
    const strake = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.19, 0.44),
      staticMats.carbonSatin
    );
    strake.position.set(dx, 0.22, -2.18);
    strake.rotation.x = 0.14;
    const strakeGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.17, 0.016),
      mutedTrimMat
    );
    strakeGlow.position.set(dx, 0.22, -2.39);
    rearBumperGroup.add(strake, strakeGlow);
  }

  // Speed-Activated Hydraulic Rear Carbon GT Wing (`activeWingPivot`)!
  const activeWingPivot = new THREE.Group();
  activeWingPivot.name = 'ZentornoActiveWing';
  activeWingPivot.position.set(0, 0.78, -2.16);

  for (const sx of [-0.52, 0.52]) {
    const swanPylon = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.22, 0.18),
      staticMats.carbonSatin
    );
    swanPylon.position.set(sx, 0.08, 0.04);
    swanPylon.rotation.x = -0.28;
    activeWingPivot.add(swanPylon);
  }

  const mainAirfoil = new THREE.Mesh(
    new THREE.BoxGeometry(1.98, 0.028, 0.28),
    staticMats.carbonSatin
  );
  mainAirfoil.position.set(0, 0.19, -0.02);
  mainAirfoil.castShadow = true;
  const wingTrailingNeon = new THREE.Mesh(
    new THREE.BoxGeometry(1.94, 0.014, 0.018),
    mutedTrimMat
  );
  wingTrailingNeon.position.set(0, 0.195, -0.16);
  activeWingPivot.add(mainAirfoil, wingTrailingNeon);

  for (const side of [-1, 1]) {
    const endplate = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.18, 0.36),
      mats.paintMat
    );
    endplate.position.set(side * 0.99, 0.17, -0.02);
    endplate.rotation.x = 0.15;
    activeWingPivot.add(endplate);
  }
  chassis.add(activeWingPivot);

  // --- 7. 4 Forged Center-Lock Wheels + Stationary Red 6-Piston Brembo Calipers ---
  const wheels = [];
  const wheelCoords = [
    { x: def.wheelTrack, z: def.wheelBaseF, isFront: true, isRight: false },
    { x: -def.wheelTrack, z: def.wheelBaseF, isFront: true, isRight: true },
    { x: def.wheelTrack, z: def.wheelBaseR, isFront: false, isRight: false },
    { x: -def.wheelTrack, z: def.wheelBaseR, isFront: false, isRight: true }
  ];

  for (let i = 0; i < wheelCoords.length; i++) {
    const wc = wheelCoords[i];
    const suspNode = new THREE.Group();
    suspNode.position.set(wc.x, def.wheelRadius, wc.z);
    root.add(suspNode);

    const steerPivot = new THREE.Group();
    suspNode.add(steerPivot);

    // Stationary Brembo brake caliper mounted on steering knuckle (does not spin with wheel!)
    const caliper = new THREE.Mesh(
      new THREE.BoxGeometry(0.068, 0.14, 0.085),
      staticMats.caliperRed
    );
    caliper.position.set(wc.isRight ? -0.04 : 0.04, 0.05, wc.isFront ? -0.15 : 0.15);
    steerPivot.add(caliper);

    const spinGroup = buildForgedHyperWheel(
      def.wheelRadius,
      def.wheelWidth,
      wc.isRight,
      mats.rimMat,
      accentColor,
      staticMats
    );
    steerPivot.add(spinGroup);

    wheels.push({
      suspNode,
      steerPivot,
      spinGroup,
      baseX: wc.x,
      baseY: def.wheelRadius,
      baseZ: wc.z,
      isFront: wc.isFront,
      radius: def.wheelRadius
    });
  }

  const driverSeatAnchor = new THREE.Object3D();
  driverSeatAnchor.position.set(def.seatX, def.seatY, def.seatZ);
  chassis.add(driverSeatAnchor);

  const headlightCones = buildHeadlightBeamCones(
    [[-0.82, 0.48, 2.1], [0.82, 0.48, 2.1]],
    14.5,
    2.8,
    staticMats.headlightBeam
  );
  chassis.add(headlightCones);

  return {
    root,
    chassis,
    plateStr,
    ...mats,
    leftDoorPivot,
    rightDoorPivot,
    activeWingPivot,
    backfireFlames,
    frontBumperGroup,
    rearBumperGroup,
    hoodPanel,
    wheels,
    steeringWheelPivot,
    driverSeatAnchor,
    headlightCones,
    smokeOriginLocal: new THREE.Vector3(0, 0.78, -1.35)
  };
}

// ============================================================================
// 3B. SCULPTED HEAVY MILITARY ARMOR: RHINO MAIN BATTLE TANK ('rhino_tank')
//     800 HP Chobham Hull, Independent Scrolling Tank Treads, 22 Road/Drive
//     Wheels, 360° Mouse-Aimed Turret & Recoiling 120mm Smoothbore Cannon!
// ============================================================================

function buildTankRoadWheel(radius, width, isSprocket, armorMat, staticMats) {
  const grp = new THREE.Group();

  if (isSprocket) {
    // Toothed rear drive sprocket wheel
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.78, radius * 0.78, width * 0.86, 16),
      armorMat
    );
    hub.rotation.z = Math.PI * 0.5;
    grp.add(hub);

    const toothGeo = new THREE.BoxGeometry(width * 0.88, 0.085, 0.065);
    for (let t = 0; t < 12; t++) {
      const a = (t / 12) * Math.PI * 2;
      const tooth = new THREE.Mesh(toothGeo, staticMats.militaryDarkSteel);
      tooth.position.set(0, Math.cos(a) * radius * 0.88, Math.sin(a) * radius * 0.88);
      tooth.rotation.x = -a;
      grp.add(tooth);
    }
  } else {
    // Dual-rimmed rubber-tired tank bogie road wheel + armored grease cap
    for (const rimOff of [-width * 0.24, width * 0.24]) {
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, width * 0.36, 18),
        staticMats.militaryRubber
      );
      tire.rotation.z = Math.PI * 0.5;
      tire.position.x = rimOff;

      const dish = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, width * 0.38, 16),
        armorMat
      );
      dish.rotation.z = Math.PI * 0.5;
      dish.position.x = rimOff;
      grp.add(tire, dish);
    }

    const centerCap = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.26, radius * 0.30, width * 0.94, 10),
      staticMats.militaryDarkSteel
    );
    centerCap.rotation.z = Math.PI * 0.5;
    grp.add(centerCap);
  }

  return grp;
}

function buildTankContinuousTrackLoop(sideX, trackWidth, trackMat) {
  const grp = new THREE.Group();
  grp.position.x = sideX;

  // Bottom ground run (z in [-2.68, +2.68], y = 0.035)
  const bottomRun = new THREE.Mesh(
    new THREE.BoxGeometry(trackWidth, 0.07, 5.36),
    trackMat
  );
  bottomRun.position.set(0, 0.035, 0);
  bottomRun.castShadow = true;
  bottomRun.receiveShadow = true;

  // Top return run under side skirts (z in [-2.95, +2.95], y = 0.96)
  const topRun = new THREE.Mesh(
    new THREE.BoxGeometry(trackWidth, 0.065, 5.90),
    trackMat
  );
  topRun.position.set(0, 0.96, 0);

  // Angled front climbing glacis track segment (from bottom +2.68 up to front idler +3.36, y=0.66)
  const frontRamp = new THREE.Mesh(
    new THREE.BoxGeometry(trackWidth, 0.07, 0.94),
    trackMat
  );
  frontRamp.position.set(0, 0.35, 3.02);
  frontRamp.rotation.x = -0.74;

  // Angled rear sprocket climbing track segment (from bottom -2.68 up to rear sprocket -3.32, y=0.68)
  const rearRamp = new THREE.Mesh(
    new THREE.BoxGeometry(trackWidth, 0.07, 0.92),
    trackMat
  );
  rearRamp.position.set(0, 0.36, -3.00);
  rearRamp.rotation.x = 0.76;

  // Curved wrap caps around front idler & rear drive sprocket
  const frontWrap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, trackWidth, 14, 1, true, -0.4, Math.PI * 1.15),
    trackMat
  );
  frontWrap.rotation.z = Math.PI * 0.5;
  frontWrap.position.set(0, 0.64, 3.12);

  const rearWrap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.37, 0.37, trackWidth, 14, 1, true, Math.PI * 0.85, Math.PI * 1.15),
    trackMat
  );
  rearWrap.rotation.z = Math.PI * 0.5;
  rearWrap.position.set(0, 0.65, -3.08);

  grp.add(bottomRun, topRun, frontRamp, rearRamp, frontWrap, rearWrap);
  return grp;
}

function buildRhinoTankMesh(def, baseColor, accentColor, opts, staticMats, texWorkshop) {
  const plateStr = opts.plate || 'USMC 04A';
  const mats = makeVehiclePaintMaterials(def, baseColor, accentColor, plateStr, staticMats, texWorkshop);
  // Matte military CARC armor finish
  mats.paintMat.metalness = 0.24;
  mats.paintMat.roughness = 0.68;
  mats.paintMat.clearcoat = 0.06;

  const trimArmorMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    metalness: 0.32,
    roughness: 0.66
  });

  // Independent Left & Right scrolling track textures so tracks counter-rotate on neutral turns!
  const leftTrackTex = texWorkshop.createScrollingTankTreadTexture();
  const rightTrackTex = texWorkshop.createScrollingTankTreadTexture();
  const leftTrackMat = new THREE.MeshStandardMaterial({
    map: leftTrackTex,
    roughness: 0.82,
    metalness: 0.28
  });
  const rightTrackMat = new THREE.MeshStandardMaterial({
    map: rightTrackTex,
    roughness: 0.82,
    metalness: 0.28
  });

  const root = new THREE.Group();
  root.name = 'ExtraVeh_RhinoTank';

  const chassis = new THREE.Group();
  chassis.name = 'RhinoHullChassis';
  root.add(chassis);

  // --- 1. Armored Composite Lower Tub & Sloped Chobham Front Glacis Hull ---
  const hullGeo = buildExtrudedSideProfile(
    [
      [-3.86, 0.54],
      [-3.45, 0.34],
      [2.62, 0.34],
      [3.78, 0.86],
      [3.92, 1.06],
      [2.35, 1.44],
      [-3.68, 1.46],
      [-3.92, 1.18]
    ],
    2.18,
    0.04
  );
  const mainHull = new THREE.Mesh(hullGeo, mats.paintMat);
  mainHull.castShadow = true;
  mainHull.receiveShadow = true;
  chassis.add(mainHull);

  // Upper track sponsons + 7 Modular ERA (Explosive Reactive Armor) Heavy Side-Skirt Blocks per side!
  for (const side of [-1, 1]) {
    const sponson = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.34, 7.46),
      mats.paintMat
    );
    sponson.position.set(side * 1.40, 1.24, -0.04);
    sponson.castShadow = true;
    chassis.add(sponson);

    // 7 Angled ERA armor tiles shielding upper suspension & return rollers
    for (let b = 0; b < 7; b++) {
      const bz = -2.72 + b * 0.92;
      const eraBlock = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.54, 0.86),
        b % 2 === 0 ? mats.paintMat : trimArmorMat
      );
      eraBlock.position.set(side * 1.72, 0.94, bz);
      eraBlock.rotation.z = -side * 0.07;
      eraBlock.castShadow = true;
      chassis.add(eraBlock);
    }

    // Front mudguard sloped armored fenders + brush-guarded tactical LED headlights + steel tow shackles
    const frontMudguard = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.12, 0.64),
      trimArmorMat
    );
    frontMudguard.position.set(side * 1.40, 1.16, 3.68);
    frontMudguard.rotation.x = 0.36;
    chassis.add(frontMudguard);

    const lampGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.16, 0.18),
      staticMats.militaryDarkSteel
    );
    lampGuard.position.set(side * 1.18, 1.26, 3.58);
    const lampLens = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.09, 0.04),
      mats.headlightMat
    );
    lampLens.position.set(side * 1.18, 1.26, 3.67);
    const towShackle = new THREE.Mesh(
      new THREE.TorusGeometry(0.085, 0.024, 8, 14),
      staticMats.militaryDarkSteel
    );
    towShackle.position.set(side * 0.78, 0.86, 3.84);
    chassis.add(lampGuard, lampLens, towShackle);
  }

  // Driver's center armored periscope hatch on upper glacis
  const driverHatch = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.09, 0.48),
    trimArmorMat
  );
  driverHatch.position.set(0, 1.45, 2.58);
  const driverVisionBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.055, 0.08),
    staticMats.marineGlass
  );
  driverVisionBlock.position.set(0, 1.49, 2.79);
  chassis.add(driverHatch, driverVisionBlock);

  // Rear 1,500 HP Gas-Turbine Engine Louvers, Exhaust Deflector Grille & Twin External Fuel Drums!
  for (let gIdx = 0; gIdx < 5; gIdx++) {
    const deckGrille = new THREE.Mesh(
      new THREE.BoxGeometry(1.78, 0.04, 0.22),
      staticMats.militaryDarkSteel
    );
    deckGrille.position.set(0, 1.47, -2.15 - gIdx * 0.30);
    chassis.add(deckGrille);
  }

  const exhaustGrille = new THREE.Mesh(
    new THREE.BoxGeometry(1.42, 0.36, 0.12),
    staticMats.militaryDarkSteel
  );
  exhaustGrille.position.set(0, 1.08, -3.90);
  chassis.add(exhaustGrille);

  for (const side of [-1, 1]) {
    const fuelDrum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.88, 16),
      trimArmorMat
    );
    fuelDrum.rotation.z = Math.PI * 0.5;
    fuelDrum.position.set(side * 0.82, 1.32, -3.98);
    fuelDrum.castShadow = true;

    const tailLamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.075, 0.05),
      mats.taillightMat
    );
    tailLamp.position.set(side * 1.38, 1.18, -3.89);
    chassis.add(fuelDrum, tailLamp);
  }

  // --- 2. Dual Continuous Track Loops + 14 Road Wheels + 4 Sprockets/Idlers ---
  const trackWidth = 0.58;
  const trackX = 1.38;
  chassis.add(
    buildTankContinuousTrackLoop(trackX, trackWidth, leftTrackMat),
    buildTankContinuousTrackLoop(-trackX, trackWidth, rightTrackMat)
  );

  const leftWheels = [];
  const rightWheels = [];
  const wheels = [];

  // 7 Bogie Road Wheels per side (z from -2.52 to +2.52)
  for (let wIdx = 0; wIdx < 7; wIdx++) {
    const wz = -2.52 + wIdx * 0.84;
    for (const side of [1, -1]) {
      const suspNode = new THREE.Group();
      suspNode.position.set(side * trackX, 0.41, wz);
      chassis.add(suspNode);

      const spinGroup = buildTankRoadWheel(0.36, trackWidth * 0.92, false, mats.paintMat, staticMats);
      suspNode.add(spinGroup);

      if (side > 0) leftWheels.push(spinGroup);
      else rightWheels.push(spinGroup);

      wheels.push({
        suspNode,
        steerPivot: suspNode,
        spinGroup,
        baseX: side * trackX,
        baseY: 0.41,
        baseZ: wz,
        isFront: wIdx >= 5,
        isLeft: side > 0,
        radius: 0.36
      });
    }
  }

  // Raised Front Tension Idlers (+3.12) & Raised Rear Toothed Drive Sprockets (-3.08)
  for (const side of [1, -1]) {
    const idler = buildTankRoadWheel(0.32, trackWidth * 0.88, false, trimArmorMat, staticMats);
    idler.position.set(side * trackX, 0.64, 3.12);
    const sprocket = buildTankRoadWheel(0.34, trackWidth * 0.92, true, trimArmorMat, staticMats);
    sprocket.position.set(side * trackX, 0.65, -3.08);
    chassis.add(idler, sprocket);
    if (side > 0) {
      leftWheels.push(idler, sprocket);
    } else {
      rightWheels.push(idler, sprocket);
    }
  }

  // --- 3. 360-Degree Mouse-Aimed Rotating Wedge Turret (`turretPivot`) ---
  const turretPivot = new THREE.Group();
  turretPivot.name = 'RhinoTurretPivot';
  turretPivot.position.set(0, 1.48, 0.18);
  chassis.add(turretPivot);

  // Turret ring collar
  const turretRing = new THREE.Mesh(
    new THREE.CylinderGeometry(1.18, 1.22, 0.14, 24),
    staticMats.militaryDarkSteel
  );
  turretRing.position.y = 0.06;
  turretPivot.add(turretRing);

  // Main armored turret bustle & faceted Chobham sloped cheeks!
  const turretCoreGeo = buildLoftedBodyGeometry([
    { z: -2.35, yCenter: 0.48, halfW: 1.18, halfH: 0.34, topWidthRatio: 0.92, bottomWidthRatio: 0.96, chinePower: 0.72, deckCrown: 0.03 },
    { z: -0.95, yCenter: 0.46, halfW: 1.38, halfH: 0.38, topWidthRatio: 0.88, bottomWidthRatio: 0.98, chinePower: 0.70, deckCrown: 0.04 },
    { z: 0.55, yCenter: 0.44, halfW: 1.42, halfH: 0.38, topWidthRatio: 0.84, bottomWidthRatio: 0.96, chinePower: 0.68, deckCrown: 0.04 },
    { z: 1.55, yCenter: 0.38, halfW: 0.92, halfH: 0.28, topWidthRatio: 0.76, bottomWidthRatio: 0.85, chinePower: 0.72, deckCrown: 0.02 }
  ], 16);
  const turretBody = new THREE.Mesh(turretCoreGeo, mats.paintMat);
  turretBody.castShadow = true;
  turretBody.receiveShadow = true;
  turretPivot.add(turretBody);

  // Angled composite Chobham cheek armor wedges + 2x4 76mm Smoke Grenade Dischargers
  for (const side of [-1, 1]) {
    const cheekArmor = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.56, 1.18),
      trimArmorMat
    );
    cheekArmor.position.set(side * 0.96, 0.42, 1.05);
    cheekArmor.rotation.y = side * 0.38;
    cheekArmor.rotation.z = -side * 0.16;
    cheekArmor.castShadow = true;
    turretPivot.add(cheekArmor);

    for (let sg = 0; sg < 4; sg++) {
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.038, 0.038, 0.26, 8),
        staticMats.militaryDarkSteel
      );
      tube.position.set(side * 1.36, 0.44 + (sg % 2) * 0.09, 0.42 - sg * 0.08);
      tube.rotation.set(0.95, side * 0.42, 0);
      turretPivot.add(tube);
    }
  }

  // Rear bustle stowage basket rails
  const bustleRailGeo = buildPipeGeometry(
    [
      [1.14, 0.68, -2.28],
      [1.14, 0.68, -2.86],
      [-1.14, 0.68, -2.86],
      [-1.14, 0.68, -2.28]
    ],
    0.022,
    18,
    8
  );
  const bustleFloor = new THREE.Mesh(
    new THREE.BoxGeometry(2.22, 0.04, 0.56),
    staticMats.militaryDarkSteel
  );
  bustleFloor.position.set(0, 0.32, -2.56);
  turretPivot.add(new THREE.Mesh(bustleRailGeo, staticMats.militaryDarkSteel), bustleFloor);

  // Commander's Cupola, CITV Panoramic Thermal Sight Dome, Gunner Optics & Roof .50 Cal M2HB!
  const commanderCupola = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.42, 0.22, 14),
    trimArmorMat
  );
  commanderCupola.position.set(-0.54, 0.90, -0.36);

  const citvDome = new THREE.Mesh(
    new THREE.CylinderGeometry(0.20, 0.22, 0.34, 14),
    mats.paintMat
  );
  citvDome.position.set(0.56, 0.96, 0.24);
  const citvLens = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.14, 0.04),
    staticMats.tankMfdMat
  );
  citvLens.position.set(0.56, 0.98, 0.44);
  turretPivot.add(commanderCupola, citvDome, citvLens);

  // Roof Pintle-Mounted .50 Cal Heavy Machine Gun + Ammo Box
  const pintleGroup = new THREE.Group();
  pintleGroup.position.set(-0.54, 1.06, -0.06);
  const hmgReceiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.14, 0.54),
    staticMats.militaryDarkSteel
  );
  const hmgBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, 0.78, 8),
    staticMats.militaryDarkSteel
  );
  hmgBarrel.rotation.x = Math.PI * 0.5;
  hmgBarrel.position.z = 0.62;
  const ammoBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.18, 0.24),
    trimArmorMat
  );
  ammoBox.position.set(0.15, -0.02, 0.02);
  pintleGroup.add(hmgReceiver, hmgBarrel, ammoBox);
  turretPivot.add(pintleGroup);

  // Twin flexible steel whip radio antennas at rear corners of turret bustle
  const antennaPivots = [];
  for (const side of [-1, 1]) {
    const antPivot = new THREE.Group();
    antPivot.position.set(side * 1.06, 0.80, -2.22);
    const whip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.014, 1.95, 6),
      staticMats.militaryDarkSteel
    );
    whip.position.y = 0.975;
    antPivot.add(whip);
    turretPivot.add(antPivot);
    antennaPivots.push(antPivot);
  }

  // --- 4. Elevating & Recoiling 120mm L/44 Smoothbore Main Cannon! ---
  const cannonElevationPivot = new THREE.Group();
  cannonElevationPivot.name = 'RhinoCannonElevation';
  cannonElevationPivot.position.set(0, 0.44, 1.38);
  turretPivot.add(cannonElevationPivot);

  // Heavy armored gun mantlet rotor shield
  const mantlet = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.52, 0.58),
    trimArmorMat
  );
  mantlet.castShadow = true;
  cannonElevationPivot.add(mantlet);

  // Hydraulic Recoil Slide Group (kicks backward -0.48m on firing!)
  const cannonRecoilSlide = new THREE.Group();
  cannonRecoilSlide.name = 'RhinoCannonRecoil';
  cannonElevationPivot.add(cannonRecoilSlide);

  // Thermal-shrouded 120mm barrel base -> bore evacuator -> forward barrel -> muzzle reference sensor!
  const barrelRear = new THREE.Mesh(
    new THREE.CylinderGeometry(0.115, 0.132, 1.65, 16),
    mats.paintMat
  );
  barrelRear.rotation.x = Math.PI * 0.5;
  barrelRear.position.z = 1.05;
  barrelRear.castShadow = true;

  // Characteristic eccentric Bore Evacuator (fume extractor) mid-way along barrel!
  const boreEvacuator = new THREE.Mesh(
    new THREE.CylinderGeometry(0.165, 0.165, 0.72, 16),
    trimArmorMat
  );
  boreEvacuator.rotation.x = Math.PI * 0.5;
  boreEvacuator.position.set(0, 0.022, 2.18);
  boreEvacuator.castShadow = true;

  const barrelFront = new THREE.Mesh(
    new THREE.CylinderGeometry(0.096, 0.108, 2.25, 16),
    mats.paintMat
  );
  barrelFront.rotation.x = Math.PI * 0.5;
  barrelFront.position.z = 3.58;
  barrelFront.castShadow = true;

  // Muzzle collar + Muzzle Reference Sensor (MRS) mast + hollow dark bore!
  const muzzleCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.116, 0.112, 0.18, 16),
    staticMats.militaryDarkSteel
  );
  muzzleCollar.rotation.x = Math.PI * 0.5;
  muzzleCollar.position.z = 4.68;

  const mrsSensor = new THREE.Mesh(
    new THREE.BoxGeometry(0.038, 0.11, 0.055),
    staticMats.militaryDarkSteel
  );
  mrsSensor.position.set(0, 0.14, 4.68);

  const boreDark = new THREE.Mesh(
    new THREE.CircleGeometry(0.082, 14),
    new THREE.MeshBasicMaterial({ color: 0x050505 })
  );
  boreDark.position.z = 4.775;

  cannonRecoilSlide.add(barrelRear, boreEvacuator, barrelFront, muzzleCollar, mrsSensor, boreDark);

  // Muzzle World Anchor & Volumetric 3D Cannon Fireball Flash!
  const muzzleAnchor = new THREE.Object3D();
  muzzleAnchor.position.set(0, 0, 4.82);
  cannonRecoilSlide.add(muzzleAnchor);

  const muzzleFlashGroup = new THREE.Group();
  muzzleFlashGroup.position.set(0, 0, 4.84);
  const flashForward = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 2.45, 10),
    staticMats.afterburnerOuter
  );
  flashForward.rotation.x = Math.PI * 0.5;
  flashForward.position.z = 1.2;
  const flashCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 10, 10),
    new THREE.MeshBasicMaterial({
      color: 0xfff7cc,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  flashCore.position.z = 0.35;
  muzzleFlashGroup.add(flashForward, flashCore);
  muzzleFlashGroup.visible = false;
  cannonRecoilSlide.add(muzzleFlashGroup);

  const driverSeatAnchor = new THREE.Object3D();
  driverSeatAnchor.position.set(def.seatX, def.seatY, def.seatZ);
  chassis.add(driverSeatAnchor);

  const headlightCones = buildHeadlightBeamCones(
    [[-1.18, 1.24, 3.72], [1.18, 1.24, 3.72]],
    15.0,
    3.4,
    staticMats.headlightBeam
  );
  chassis.add(headlightCones);

  return {
    root,
    chassis,
    plateStr,
    ...mats,
    leftTrackTex,
    rightTrackTex,
    leftWheels,
    rightWheels,
    turretPivot,
    cannonElevationPivot,
    cannonRecoilSlide,
    muzzleAnchor,
    muzzleFlashGroup,
    antennaPivots,
    wheels,
    steeringWheelPivot: null,
    driverSeatAnchor,
    headlightCones,
    smokeOriginLocal: new THREE.Vector3(0, 1.52, -2.85)
  };
}

// ============================================================================
// 3C. SCULPTED EXECUTIVE TWIN-TURBOFAN JET: BUCKINGHAM LUXOR ('luxor_jet')
//     Swept Supercritical Wings, Blended Winglets, Panoramic Flight-Deck,
//     Twin Rear Turbofans w/ Orange/Cyan Afterburners, T-Tail & Retractable Gear!
// ============================================================================

function buildJetLandingBogie(wheelRadius, dualWheel, staticMats) {
  const bogie = new THREE.Group();
  const strut = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.048, 0.92, 10),
    staticMats.mirrorChrome
  );
  strut.position.y = 0.46;
  const torqueLink = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.28, 0.14),
    staticMats.darkChassis
  );
  torqueLink.position.set(0, 0.34, -0.07);
  torqueLink.rotation.x = 0.35;
  bogie.add(strut, torqueLink);

  const spinGroup = new THREE.Group();
  const offsets = dualWheel ? [-0.15, 0.15] : [0];
  for (let i = 0; i < offsets.length; i++) {
    const wx = offsets[i];
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.18, 18),
      staticMats.tireRubber
    );
    tire.rotation.z = Math.PI * 0.5;
    tire.position.x = wx;
    tire.castShadow = true;

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius * 0.52, wheelRadius * 0.52, 0.19, 14),
      staticMats.mirrorChrome
    );
    hub.rotation.z = Math.PI * 0.5;
    hub.position.x = wx;
    spinGroup.add(tire, hub);
  }
  bogie.add(spinGroup);

  return { bogie, spinGroup };
}

function buildTurbofanRotor(radius, bladeCount, staticMats) {
  const rotor = new THREE.Group();
  const spinner = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 0.28, radius * 0.65, 12),
    staticMats.mirrorChrome
  );
  spinner.rotation.x = Math.PI * 0.5;
  spinner.position.z = 0.18;
  rotor.add(spinner);

  const bladeGeo = new THREE.BoxGeometry(radius * 0.18, radius * 0.88, 0.015);
  for (let i = 0; i < bladeCount; i++) {
    const holder = new THREE.Group();
    holder.rotation.z = (i / bladeCount) * Math.PI * 2;
    const blade = new THREE.Mesh(bladeGeo, staticMats.titaniumBlued);
    blade.position.y = radius * 0.50;
    blade.rotation.y = 0.44;
    holder.add(blade);
    rotor.add(holder);
  }
  return rotor;
}

function buildLuxorJetMesh(def, baseColor, accentColor, opts, staticMats, texWorkshop) {
  const plateStr = opts.plate || 'LSIA VIP';
  const mats = makeVehiclePaintMaterials(def, baseColor, accentColor, plateStr, staticMats, texWorkshop);

  const cabinWindowGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde68a,
    emissiveIntensity: 1.15,
    roughness: 0.15
  });

  const root = new THREE.Group();
  root.name = 'ExtraVeh_LuxorJet';

  const chassis = new THREE.Group();
  chassis.name = 'LuxorJetChassis';
  root.add(chassis);

  // --- 1. Sleek Pressurized Executive Fuselage & Radome Nose ---
  const fuselageGeo = buildLoftedBodyGeometry([
    { z: -7.85, yCenter: 2.18, halfW: 0.16, halfH: 0.16, topWidthRatio: 0.95, bottomWidthRatio: 0.95, chinePower: 1.0, deckCrown: 0.0 },
    { z: -6.10, yCenter: 2.02, halfW: 0.58, halfH: 0.62, topWidthRatio: 0.96, bottomWidthRatio: 0.94, chinePower: 0.96, deckCrown: 0.02 },
    { z: -3.60, yCenter: 1.82, halfW: 1.02, halfH: 1.04, topWidthRatio: 0.96, bottomWidthRatio: 0.96, chinePower: 0.95, deckCrown: 0.03 },
    { z: 0.00, yCenter: 1.78, halfW: 1.06, halfH: 1.08, topWidthRatio: 0.96, bottomWidthRatio: 0.96, chinePower: 0.95, deckCrown: 0.03 },
    { z: 3.65, yCenter: 1.78, halfW: 1.04, halfH: 1.06, topWidthRatio: 0.96, bottomWidthRatio: 0.96, chinePower: 0.95, deckCrown: 0.03 },
    { z: 5.35, yCenter: 1.62, halfW: 0.84, halfH: 0.78, topWidthRatio: 0.88, bottomWidthRatio: 0.94, chinePower: 0.94, deckCrown: -0.02 },
    { z: 6.85, yCenter: 1.40, halfW: 0.44, halfH: 0.42, topWidthRatio: 0.92, bottomWidthRatio: 0.92, chinePower: 0.96, deckCrown: 0.0 },
    { z: 7.88, yCenter: 1.28, halfW: 0.07, halfH: 0.07, topWidthRatio: 1.0, bottomWidthRatio: 1.0, chinePower: 1.0, deckCrown: 0.0 }
  ], 20);
  const fuselage = new THREE.Mesh(fuselageGeo, mats.paintMat);
  fuselage.castShadow = true;
  fuselage.receiveShadow = true;
  chassis.add(fuselage);

  // Satin black weather-radar radome nose tip + stainless APU tail exhaust
  const radome = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 0.78, 16),
    staticMats.carbonSatin
  );
  radome.rotation.x = Math.PI * 0.5;
  radome.position.set(0, 1.32, 7.52);
  const apuExhaust = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.14, 0.24, 12),
    staticMats.titaniumBlued
  );
  apuExhaust.rotation.x = Math.PI * 0.5;
  apuExhaust.position.set(0, 2.18, -7.88);
  chassis.add(radome, apuExhaust);

  // Executive Gold & Accent Cheatline Pinstripes + 6 Illuminated Oval Cabin Windows per side!
  for (const side of [-1, 1]) {
    const upperStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.085, 9.8),
      mats.accentMat
    );
    upperStripe.position.set(side * 1.045, 1.68, -0.2);

    const lowerStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.045, 9.4),
      staticMats.goldAnodized
    );
    lowerStripe.position.set(side * 1.035, 1.54, -0.2);
    chassis.add(upperStripe, lowerStripe);

    for (let w = 0; w < 6; w++) {
      const wz = 2.65 - w * 1.02;
      const winFrame = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.04, 14),
        staticMats.mirrorChrome
      );
      winFrame.rotation.z = Math.PI * 0.5;
      winFrame.scale.set(1, 1, 0.78);
      winFrame.position.set(side * 1.03, 1.98, wz);

      const winPane = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 0.05, 14),
        cabinWindowGlowMat
      );
      winPane.rotation.z = Math.PI * 0.5;
      winPane.scale.set(1, 1, 0.78);
      winPane.position.set(side * 1.035, 1.98, wz);
      chassis.add(winFrame, winPane);
    }
  }

  // Port-side (+X) forward executive cabin boarding door outline
  const doorTrim = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 1.18, 0.68),
    staticMats.mirrorChrome
  );
  doorTrim.position.set(1.03, 1.78, 3.55);
  chassis.add(doorTrim);

  // --- 2. Panoramic Flight-Deck Windshield & Pilot Glass Cockpit (Visible in `K` Góc Nhìn Buồng Lái!) ---
  const cockpitCanopySpecs = [
    { x: 0.24, y: 2.18, z: 5.08, w: 0.48, h: 0.54, rx: -0.92, ry: -0.14 },
    { x: -0.24, y: 2.18, z: 5.08, w: 0.48, h: 0.54, rx: -0.92, ry: 0.14 },
    { x: 0.64, y: 2.12, z: 4.72, w: 0.46, h: 0.48, rx: -0.62, ry: -0.78 },
    { x: -0.64, y: 2.12, z: 4.72, w: 0.46, h: 0.48, rx: -0.62, ry: 0.78 }
  ];
  for (let i = 0; i < cockpitCanopySpecs.length; i++) {
    const cs = cockpitCanopySpecs[i];
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(cs.w, cs.h),
      staticMats.marineGlass
    );
    pane.position.set(cs.x, cs.y, cs.z);
    pane.rotation.set(cs.rx, cs.ry, 0);
    chassis.add(pane);
  }

  // Flight-deck glareshield, PFD/MFD screens, pilot seats & articulated Control Yoke!
  const glareshield = new THREE.Mesh(
    new THREE.BoxGeometry(1.36, 0.24, 0.68),
    staticMats.darkAlcantara
  );
  glareshield.position.set(0, 1.62, 4.98);
  const pfdDisplay = new THREE.Mesh(
    new THREE.PlaneGeometry(0.96, 0.22),
    staticMats.marineNavMat
  );
  pfdDisplay.position.set(0, 1.64, 4.63);
  pfdDisplay.rotation.y = Math.PI;
  pfdDisplay.rotation.x = 0.18;
  chassis.add(glareshield, pfdDisplay);

  for (const sx of [0.36, -0.36]) {
    const pilotSeat = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.68, 0.46),
      staticMats.creamQuilted
    );
    pilotSeat.position.set(sx, 1.48, 4.22);
    chassis.add(pilotSeat);
  }

  const steeringWheelPivot = new THREE.Group();
  steeringWheelPivot.name = 'LuxorFlightYoke';
  steeringWheelPivot.position.set(0.36, 1.56, 4.64);
  const yokeBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.036, 0.04),
    staticMats.carbonSatin
  );
  for (const hx of [-0.15, 0.15]) {
    const hornGrip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.16, 10),
      staticMats.darkAlcantara
    );
    hornGrip.position.set(hx, 0.055, 0);
    steeringWheelPivot.add(hornGrip);
  }
  steeringWheelPivot.add(yokeBar);
  chassis.add(steeringWheelPivot);

  // --- 3. Swept Supercritical Main Wings (15.6m Span) + Ailerons + Blended Winglets! ---
  const wingBoxFairing = new THREE.Mesh(
    new THREE.BoxGeometry(2.35, 0.42, 3.65),
    mats.paintMat
  );
  wingBoxFairing.position.set(0, 0.92, -0.55);
  chassis.add(wingBoxFairing);

  let aileronL = null;
  let aileronR = null;
  const wingtipLeftAnchor = new THREE.Object3D();
  const wingtipRightAnchor = new THREE.Object3D();

  for (const side of [1, -1]) {
    // Custom swept tapered wing geometry with proper CCW winding on both Port (+X) & Starboard (-X)!
    const wingShape = new THREE.Shape();
    if (side > 0) {
      wingShape.moveTo(0, 1.45);
      wingShape.lineTo(0, -1.65);
      wingShape.lineTo(6.60, -2.55);
      wingShape.lineTo(6.60, -1.55);
    } else {
      wingShape.moveTo(0, 1.45);
      wingShape.lineTo(-6.60, -1.55);
      wingShape.lineTo(-6.60, -2.55);
      wingShape.lineTo(0, -1.65);
    }
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.035,
      bevelSegments: 2
    });
    wingGeo.rotateX(-Math.PI * 0.5);

    const wingMesh = new THREE.Mesh(wingGeo, mats.paintMat);
    wingMesh.position.set(side * 0.95, 0.96, -0.35);
    wingMesh.rotation.z = side * 0.055; // Graceful 3.2° upward wing dihedral!
    wingMesh.castShadow = true;
    wingMesh.receiveShadow = true;
    chassis.add(wingMesh);

    // Articulated outboard aileron surface
    const aileron = new THREE.Group();
    aileron.position.set(side * 5.65, 1.22, -2.28);
    aileron.rotation.y = -side * 0.42;
    const ailFlap = new THREE.Mesh(
      new THREE.BoxGeometry(2.15, 0.045, 0.34),
      mats.accentMat
    );
    ailFlap.position.z = -0.17;
    aileron.add(ailFlap);
    chassis.add(aileron);
    if (side > 0) aileronL = aileron;
    else aileronR = aileron;

    // Tall Upturned Blended Aerodynamic Winglet + Port Red / Starboard Green Nav Strobe!
    const winglet = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 1.24, 0.78),
      mats.accentMat
    );
    winglet.position.set(side * 7.62, 1.92, -2.42);
    winglet.rotation.z = -side * 0.22;
    winglet.rotation.y = -side * 0.14;
    winglet.castShadow = true;
    chassis.add(winglet);

    const navStrobe = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 10, 10),
      side > 0 ? staticMats.navPortRed : staticMats.navStbdGreen
    );
    navStrobe.position.set(side * 7.72, 2.52, -2.52);
    chassis.add(navStrobe);

    if (side > 0) {
      wingtipLeftAnchor.position.set(7.72, 2.52, -2.62);
      chassis.add(wingtipLeftAnchor);
    } else {
      wingtipRightAnchor.position.set(-7.72, 2.52, -2.62);
      chassis.add(wingtipRightAnchor);
    }
  }

  // --- 4. Twin Rear Fuselage-Mounted Turbofan Nacelles + Spinning Fans + Afterburners! ---
  let fanRotorL = null;
  let fanRotorR = null;
  const backfireFlames = [];

  for (const side of [1, -1]) {
    const pylon = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.14, 1.65),
      mats.paintMat
    );
    pylon.position.set(side * 1.28, 2.14, -4.15);
    pylon.rotation.z = side * 0.16;
    chassis.add(pylon);

    const nacelleGroup = new THREE.Group();
    nacelleGroup.position.set(side * 1.82, 2.24, -4.18);

    const cowling = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.48, 2.86, 20),
      mats.paintMat
    );
    cowling.rotation.x = Math.PI * 0.5;
    cowling.castShadow = true;

    const intakeLip = new THREE.Mesh(
      new THREE.TorusGeometry(0.51, 0.048, 12, 24),
      staticMats.mirrorChrome
    );
    intakeLip.position.z = 1.43;

    const exhaustNozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.46, 0.52, 16),
      staticMats.titaniumBlued
    );
    exhaustNozzle.rotation.x = Math.PI * 0.5;
    exhaustNozzle.position.z = -1.62;

    const fanRotor = buildTurbofanRotor(0.47, 14, staticMats);
    fanRotor.position.z = 1.22;

    nacelleGroup.add(cowling, intakeLip, exhaustNozzle, fanRotor);
    chassis.add(nacelleGroup);

    if (side > 0) fanRotorL = fanRotor;
    else fanRotorR = fanRotor;

    // Variable-thrust glowing Orange & Cyan Afterburner Plume!
    const abGroup = new THREE.Group();
    abGroup.position.set(side * 1.82, 2.24, -6.04);
    const abOuter = new THREE.Mesh(
      new THREE.ConeGeometry(0.36, 2.35, 12),
      staticMats.afterburnerOuter
    );
    abOuter.rotation.x = -Math.PI * 0.5;
    abOuter.position.z = -1.12;
    const abCore = new THREE.Mesh(
      new THREE.ConeGeometry(0.20, 1.35, 10),
      staticMats.afterburnerCore
    );
    abCore.rotation.x = -Math.PI * 0.5;
    abCore.position.z = -0.62;
    abGroup.add(abOuter, abCore);
    abGroup.visible = false;
    chassis.add(abGroup);
    backfireFlames.push(abGroup);
  }

  // --- 5. Swept T-Tail Vertical Fin, Rudder & High Horizontal Stabilizer! ---
  const finShape = new THREE.Shape();
  finShape.moveTo(-4.85, 2.15);
  finShape.lineTo(-7.15, 4.52);
  finShape.lineTo(-8.25, 4.52);
  finShape.lineTo(-7.65, 2.15);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 2
  });
  finGeo.translate(0, 0, -0.06);
  finGeo.rotateY(Math.PI * 0.5);
  const verticalFin = new THREE.Mesh(finGeo, mats.paintMat);
  verticalFin.castShadow = true;
  chassis.add(verticalFin);

  const rudderPivot = new THREE.Group();
  rudderPivot.position.set(0, 3.35, -7.75);
  const rudderBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 2.15, 0.48),
    mats.accentMat
  );
  rudderBlade.position.z = -0.24;
  rudderPivot.add(rudderBlade);
  chassis.add(rudderPivot);

  // High T-Tail Swept Horizontal Stabilizer + Articulated Elevator + Red Anti-Collision Beacon
  const hStab = new THREE.Mesh(
    new THREE.BoxGeometry(5.20, 0.09, 1.08),
    mats.paintMat
  );
  hStab.position.set(0, 4.48, -7.68);
  hStab.castShadow = true;

  const elevatorPivot = new THREE.Group();
  elevatorPivot.position.set(0, 4.48, -8.18);
  const elevSurface = new THREE.Mesh(
    new THREE.BoxGeometry(4.95, 0.055, 0.34),
    mats.accentMat
  );
  elevSurface.position.z = -0.17;
  elevatorPivot.add(elevSurface);

  const tailBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 10, 10),
    mats.taillightMat
  );
  tailBeacon.position.set(0, 4.62, -7.55);
  chassis.add(hStab, elevatorPivot, tailBeacon);

  // --- 6. Animated Retractable Tricycle Landing Gear + Taxi Spotlights ---
  const landingGearGroup = new THREE.Group();
  landingGearGroup.name = 'LuxorLandingGear';
  chassis.add(landingGearGroup);

  const noseSuspNode = new THREE.Group();
  noseSuspNode.position.set(0, def.wheelRadius, def.wheelBaseF);
  const noseSteerPivot = new THREE.Group();
  noseSuspNode.add(noseSteerPivot);
  const noseGearBuilt = buildJetLandingBogie(def.wheelRadius * 0.88, true, staticMats);
  noseSteerPivot.add(noseGearBuilt.bogie);

  // High-intensity nose-gear LED landing lamp
  const taxiLamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.11, 0.08),
    mats.headlightMat
  );
  taxiLamp.position.set(0, 0.62, 0.08);
  noseSteerPivot.add(taxiLamp);
  landingGearGroup.add(noseSuspNode);

  const wheels = [
    {
      suspNode: noseSuspNode,
      steerPivot: noseSteerPivot,
      spinGroup: noseGearBuilt.spinGroup,
      baseX: 0,
      baseY: def.wheelRadius,
      baseZ: def.wheelBaseF,
      isFront: true,
      radius: def.wheelRadius * 0.88
    }
  ];

  const mainGearPivots = [];
  for (const side of [1, -1]) {
    const mainSusp = new THREE.Group();
    mainSusp.position.set(side * def.wheelTrack, def.wheelRadius, def.wheelBaseR);
    const mgBuilt = buildJetLandingBogie(def.wheelRadius, true, staticMats);
    mainSusp.add(mgBuilt.bogie);
    landingGearGroup.add(mainSusp);
    mainGearPivots.push({ node: mainSusp, side });

    wheels.push({
      suspNode: mainSusp,
      steerPivot: mainSusp,
      spinGroup: mgBuilt.spinGroup,
      baseX: side * def.wheelTrack,
      baseY: def.wheelRadius,
      baseZ: def.wheelBaseR,
      isFront: false,
      radius: def.wheelRadius
    });
  }

  const driverSeatAnchor = new THREE.Object3D();
  driverSeatAnchor.position.set(def.seatX, def.seatY, def.seatZ);
  chassis.add(driverSeatAnchor);

  const headlightCones = buildHeadlightBeamCones(
    [[0, 0.92, 5.15], [-2.2, 1.05, 0.25], [2.2, 1.05, 0.25]],
    20.0,
    4.2,
    staticMats.headlightBeam
  );
  chassis.add(headlightCones);

  return {
    root,
    chassis,
    plateStr,
    ...mats,
    fanRotorL,
    fanRotorR,
    aileronL,
    aileronR,
    rudderPivot,
    elevatorPivot,
    noseSuspNode,
    mainGearPivots,
    wingtipLeftAnchor,
    wingtipRightAnchor,
    backfireFlames,
    wheels,
    steeringWheelPivot,
    driverSeatAnchor,
    headlightCones,
    smokeOriginLocal: new THREE.Vector3(0, 2.24, -5.8)
  };
}

// ============================================================================
// 4. POOLED MARINE V-WAKE, SEA-SPRAY, SPARK, SMOKE & 120MM BALLISTICS FX ENGINE
// ============================================================================

function createExtraFXSystem(texWorkshop, audioSynth) {
  const MAX_WAKES = 260;
  const MAX_SPRAY = 280;
  const MAX_PUFFS = 240;
  const MAX_SPARKS = 180;
  const MAX_SKIDS = 180;
  const MAX_SHELLS = 18;
  const MAX_SHOCKWAVES = 16;

  const fxRoot = new THREE.Group();
  fxRoot.name = 'VehiclesExtraFXRoot';

  const dummy = new THREE.Object3D();
  const wakeFoamTex = texWorkshop.getWakeFoamTexture();

  // 1) Foaming White Ocean V-Wake & Churning Stern Pad InstancedMesh
  const wakeGeo = new THREE.PlaneGeometry(1.0, 1.0);
  wakeGeo.rotateX(-Math.PI * 0.5);
  const wakeMat = new THREE.MeshBasicMaterial({
    map: wakeFoamTex,
    color: 0xf4fbff,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2
  });
  const wakeInst = new THREE.InstancedMesh(wakeGeo, wakeMat, MAX_WAKES);
  wakeInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  wakeInst.frustumCulled = false;
  fxRoot.add(wakeInst);

  const wakes = Array.from({ length: MAX_WAKES }, () => ({
    active: false,
    x: 0,
    y: -999,
    z: 0,
    vx: 0,
    vz: 0,
    yaw: 0,
    age: 0,
    life: 1.0,
    startScale: 0.5,
    endScale: 2.2
  }));
  let wakeCursor = 0;

  // 2) 3D Rooster-Tail & Wave Splash Water Droplets InstancedMesh
  const sprayGeo = new THREE.DodecahedronGeometry(0.16, 0);
  const sprayMat = new THREE.MeshBasicMaterial({
    color: 0xe8f7ff,
    transparent: true,
    opacity: 0.82,
    depthWrite: false
  });
  const sprayInst = new THREE.InstancedMesh(sprayGeo, sprayMat, MAX_SPRAY);
  sprayInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  sprayInst.frustumCulled = false;
  fxRoot.add(sprayInst);

  const sprays = Array.from({ length: MAX_SPRAY }, () => ({
    active: false,
    x: 0,
    y: -999,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    age: 0,
    life: 0.6,
    scale: 1.0
  }));
  let sprayCursor = 0;

  // 3) 3D Tire Smoke, Exhaust Backfire, Cannon Blast Dust & Fire Puffs
  const puffGeo = new THREE.IcosahedronGeometry(0.32, 1);
  const puffMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.62,
    depthWrite: false
  });
  const puffInst = new THREE.InstancedMesh(puffGeo, puffMat, MAX_PUFFS);
  puffInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  puffInst.frustumCulled = false;
  fxRoot.add(puffInst);

  const puffs = Array.from({ length: MAX_PUFFS }, () => ({
    active: false,
    x: 0,
    y: -999,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    age: 0,
    life: 0.8,
    s0: 0.3,
    s1: 1.4,
    col: new THREE.Color(0xffffff)
  }));
  let puffCursor = 0;

  // 4) Titanium Footpeg / Rim / Tank-Crush Sparks InstancedMesh
  const sparkGeo = new THREE.BoxGeometry(0.035, 0.035, 0.30);
  const sparkMat = new THREE.MeshBasicMaterial({
    color: 0xffb733,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.95,
    depthWrite: false
  });
  const sparkInst = new THREE.InstancedMesh(sparkGeo, sparkMat, MAX_SPARKS);
  sparkInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  sparkInst.frustumCulled = false;
  fxRoot.add(sparkInst);

  const sparks = Array.from({ length: MAX_SPARKS }, () => ({
    active: false,
    x: 0,
    y: -999,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    age: 0,
    life: 0.35
  }));
  let sparkCursor = 0;

  // 5) Tire Skidmarks for Motorcycles & Zentorno Powerslides
  const skidGeo = new THREE.PlaneGeometry(0.24, 0.92);
  skidGeo.rotateX(-Math.PI * 0.5);
  const skidMat = new THREE.MeshBasicMaterial({
    color: 0x111317,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1
  });
  const skidInst = new THREE.InstancedMesh(skidGeo, skidMat, MAX_SKIDS);
  skidInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  skidInst.frustumCulled = false;
  fxRoot.add(skidInst);
  let skidCursor = 0;

  // 6) 120mm High-Explosive Tank Shells + Expanding Blast Shockwave Rings!
  const shellGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.72, 10);
  shellGeo.rotateX(Math.PI * 0.5);
  const shellMat = new THREE.MeshBasicMaterial({
    color: 0xffe066,
    blending: THREE.AdditiveBlending
  });
  const shells = Array.from({ length: MAX_SHELLS }, () => {
    const mesh = new THREE.Group();
    const core = new THREE.Mesh(shellGeo, shellMat);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0xff6b1a,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    mesh.add(core, glow);
    mesh.visible = false;
    fxRoot.add(mesh);
    return {
      active: false,
      mesh,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      age: 0,
      maxAge: 3.4,
      trailTimer: 0,
      shooterCar: null
    };
  });

  const shockGeo = new THREE.RingGeometry(0.65, 1.0, 28);
  shockGeo.rotateX(-Math.PI * 0.5);
  const shockwaves = Array.from({ length: MAX_SHOCKWAVES }, () => {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(shockGeo, mat);
    mesh.visible = false;
    fxRoot.add(mesh);
    return {
      active: false,
      mesh,
      mat,
      x: 0,
      y: 0,
      z: 0,
      age: 0,
      life: 0.48,
      maxRadius: 11.5
    };
  });

  // Hide all pooled instances initially
  dummy.position.set(0, -999, 0);
  dummy.scale.set(0.001, 0.001, 0.001);
  dummy.updateMatrix();
  for (let i = 0; i < MAX_WAKES; i++) wakeInst.setMatrixAt(i, dummy.matrix);
  for (let i = 0; i < MAX_SPRAY; i++) sprayInst.setMatrixAt(i, dummy.matrix);
  for (let i = 0; i < MAX_PUFFS; i++) {
    puffInst.setMatrixAt(i, dummy.matrix);
    puffInst.setColorAt(i, _colA.setHex(0xffffff));
  }
  for (let i = 0; i < MAX_SPARKS; i++) sparkInst.setMatrixAt(i, dummy.matrix);
  for (let i = 0; i < MAX_SKIDS; i++) skidInst.setMatrixAt(i, dummy.matrix);
  wakeInst.instanceMatrix.needsUpdate = true;
  sprayInst.instanceMatrix.needsUpdate = true;
  puffInst.instanceMatrix.needsUpdate = true;
  sparkInst.instanceMatrix.needsUpdate = true;
  skidInst.instanceMatrix.needsUpdate = true;

  function ensureAttached(scene) {
    if (scene && fxRoot.parent !== scene) {
      scene.add(fxRoot);
    }
  }

  function spawnWakePad(x, y, z, vx, vz, yaw, startScale = 0.65, endScale = 2.6, life = 1.35) {
    const w = wakes[wakeCursor];
    wakeCursor = (wakeCursor + 1) % MAX_WAKES;
    w.active = true;
    w.x = x;
    w.y = y;
    w.z = z;
    w.vx = vx;
    w.vz = vz;
    w.yaw = yaw;
    w.age = 0;
    w.life = life;
    w.startScale = startScale;
    w.endScale = endScale;
  }

  function spawnSprayDroplet(x, y, z, vx, vy, vz, scale = 1.0, life = 0.62) {
    const s = sprays[sprayCursor];
    sprayCursor = (sprayCursor + 1) % MAX_SPRAY;
    s.active = true;
    s.x = x;
    s.y = y;
    s.z = z;
    s.vx = vx;
    s.vy = vy;
    s.vz = vz;
    s.age = 0;
    s.life = life;
    s.scale = scale;
  }

  function spawnWaterSplashBurst(x, y, z, intensity = 1.0, count = 18) {
    const n = Math.min(32, Math.max(6, Math.round(count * intensity)));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const hSpd = (2.2 + Math.random() * 5.2) * intensity;
      const vSpd = (3.4 + Math.random() * 5.8) * intensity;
      spawnSprayDroplet(
        x + Math.cos(a) * 0.6,
        y + 0.12,
        z + Math.sin(a) * 0.6,
        Math.cos(a) * hSpd,
        vSpd,
        Math.sin(a) * hSpd,
        0.9 + Math.random() * 0.9,
        0.55 + Math.random() * 0.35
      );
    }
    spawnWakePad(x, y + 0.04, z, 0, 0, Math.random() * 6.28, 1.4 * intensity, 5.2 * intensity, 1.45);
  }

  function spawnPuff(x, y, z, vx, vy, vz, hexCol = 0xe2e8f0, s0 = 0.32, s1 = 1.45, life = 0.65) {
    const p = puffs[puffCursor];
    const idx = puffCursor;
    puffCursor = (puffCursor + 1) % MAX_PUFFS;
    p.active = true;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.age = 0;
    p.life = life;
    p.s0 = s0;
    p.s1 = s1;
    p.col.setHex(hexCol);
    puffInst.setColorAt(idx, p.col);
    if (puffInst.instanceColor) puffInst.instanceColor.needsUpdate = true;
  }

  function spawnSparks(x, y, z, count = 8, speed = 8.0) {
    for (let i = 0; i < count; i++) {
      const sp = sparks[sparkCursor];
      sparkCursor = (sparkCursor + 1) % MAX_SPARKS;
      const a = Math.random() * Math.PI * 2;
      const spd = (0.35 + Math.random() * 0.85) * speed;
      sp.active = true;
      sp.x = x;
      sp.y = y;
      sp.z = z;
      sp.vx = Math.cos(a) * spd;
      sp.vy = 1.8 + Math.random() * 4.5;
      sp.vz = Math.sin(a) * spd;
      sp.age = 0;
      sp.life = 0.22 + Math.random() * 0.22;
    }
  }

  function addSkidmark(x, y, z, yaw, widthScale = 1.0) {
    const idx = skidCursor;
    skidCursor = (skidCursor + 1) % MAX_SKIDS;
    dummy.position.set(x, y + 0.022, z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(widthScale, 1, 1);
    dummy.updateMatrix();
    skidInst.setMatrixAt(idx, dummy.matrix);
    skidInst.instanceMatrix.needsUpdate = true;
  }

  function spawnShockwaveRing(x, y, z, maxRadius = 11.5) {
    const sw = shockwaves.find((item) => !item.active) || shockwaves[0];
    sw.active = true;
    sw.x = x;
    sw.y = y + 0.16;
    sw.z = z;
    sw.age = 0;
    sw.life = 0.46;
    sw.maxRadius = maxRadius;
    sw.mesh.position.set(sw.x, sw.y, sw.z);
    sw.mesh.scale.setScalar(0.5);
    sw.mat.opacity = 0.92;
    sw.mesh.visible = true;
  }

  function fireTankShell(originX, originY, originZ, dirX, dirY, dirZ, shooterCar) {
    const sh = shells.find((s) => !s.active) || shells[0];
    const muzzleVel = 138.0;
    sh.active = true;
    sh.x = originX;
    sh.y = originY;
    sh.z = originZ;
    sh.vx = dirX * muzzleVel + (shooterCar?.vx || 0) * 0.35;
    sh.vy = dirY * muzzleVel;
    sh.vz = dirZ * muzzleVel + (shooterCar?.vz || 0) * 0.35;
    sh.age = 0;
    sh.trailTimer = 0;
    sh.shooterCar = shooterCar;
    sh.mesh.position.set(originX, originY, originZ);
    _vA.set(originX + sh.vx, originY + sh.vy, originZ + sh.vz);
    sh.mesh.lookAt(_vA);
    sh.mesh.visible = true;

    // Muzzle blast smoke ring & ground dust wave around the tank!
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      spawnPuff(
        originX + dirX * 0.8,
        originY,
        originZ + dirZ * 0.8,
        dirX * 9.0 + Math.cos(a) * 3.8,
        Math.sin(a) * 2.2 + 0.8,
        dirZ * 9.0 + Math.sin(a) * 3.8,
        i % 3 === 0 ? 0xff9922 : 0xdbe2ea,
        0.45,
        2.35,
        0.58
      );
    }
    spawnSparks(originX, originY, originZ, 16, 14.0);
    audioSynth.playTankCannonBoom();
  }

  function detonateTankShell(hx, hy, hz, shooterCar, ctx, damageVehicleFn, oceanSampler) {
    const inWater = oceanSampler.isOceanWater(hx, hz);
    if (inWater) {
      const waveY = oceanSampler.sampleWave(hx, hz).y;
      spawnWaterSplashBurst(hx, waveY, hz, 2.4, 30);
      audioSynth.playWaveSplash(1.0);
    } else {
      spawnShockwaveRing(hx, hy, hz, 12.0);
      spawnSparks(hx, hy + 0.35, hz, 28, 16.5);
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const hot = i < 9;
        spawnPuff(
          hx + Math.cos(a) * 0.8,
          hy + 0.35,
          hz + Math.sin(a) * 0.8,
          Math.cos(a) * (hot ? 7.5 : 4.5),
          (hot ? 5.5 : 3.8) + Math.random() * 3.5,
          Math.sin(a) * (hot ? 7.5 : 4.5),
          hot ? (i % 2 === 0 ? 0xff6200 : 0xffd133) : 0x1e2128,
          0.65,
          3.4,
          hot ? 0.48 : 1.15
        );
      }
    }

    const isPlayerShot = Boolean(
      ctx?.player && (
        shooterCar === ctx.player.inCar ||
        shooterCar?.driver === 'player' ||
        shooterCar?.isPlayerDriving
      )
    );

    // Trigger core game explosion system + Phase 4 breakable/explosive district props!
    ctx.characters?.spawnExplosion?.(hx, hy + 0.25, hz, 2.25, ctx, isPlayerShot);
    ctx.mapDowntown?.onProjectileHit?.(hx, hy + 0.25, hz, isPlayerShot, ctx);
    ctx.mapCommercial?.onProjectileHit?.(hx, hy + 0.25, hz, isPlayerShot, ctx);
    ctx.mapPortAirport?.onProjectileHit?.(hx, hy + 0.25, hz, isPlayerShot, ctx);
    ctx.audio?.playExplosion?.(hx, hz);

    // Heavy 120mm High-Explosive blast damage & upward impulse to all nearby vehicles!
    const allCars = ctx.vehicles?.list || [];
    const blastRadius = 9.2;
    for (let i = 0; i < allCars.length; i++) {
      const v = allCars[i];
      if (!v || v === shooterCar) continue;
      const dx = v.x - hx;
      const dy = (v.y || 0) - hy;
      const dz = v.z - hz;
      const dist = Math.hypot(dx, dy, dz);
      if (dist < blastRadius) {
        const falloff = 1.0 - dist / blastRadius;
        const dmg = 280 * falloff + 65;
        const invD = 1.0 / Math.max(0.5, Math.hypot(dx, dz));
        const pushScale = (14.5 * falloff) / Math.max(0.6, v.mass || 1.0);
        v.vx = (v.vx || 0) + dx * invD * pushScale;
        v.vz = (v.vz || 0) + dz * invD * pushScale;
        v.vy = (v.vy || 0) + (8.5 * falloff) / Math.max(0.8, v.mass || 1.0);
        if (!v.destroyed) {
          damageVehicleFn(v, dmg, isPlayerShot ? ctx.player : null);
        }
      }
    }

    // Camera distance-attenuated shockwave shake & player-only Thiên Đình Chấp Pháp military chaos heat!
    if (ctx.player) {
      const pDist = Math.hypot(ctx.player.x - hx, ctx.player.z - hz);
      if (pDist < 55) {
        ctx.engine?.addShake?.(veClamp((1 - pDist / 55) * 0.92, 0.14, 0.92));
      }
      if (isPlayerShot) {
        ctx.gameplay?.addCrimeHeat?.(38, 'tank_cannon', ctx.player);
      }
    }
  }

  function updateFX(dt, ctx, oceanSampler, damageVehicleFn) {
    // 1) Update ocean wake rings glued dynamically to live undulating wave height!
    let wakeDirty = false;
    for (let i = 0; i < MAX_WAKES; i++) {
      const w = wakes[i];
      if (!w.active) continue;
      wakeDirty = true;
      w.age += dt;
      if (w.age >= w.life) {
        w.active = false;
        dummy.position.set(0, -999, 0);
        dummy.scale.set(0.001, 0.001, 0.001);
        dummy.updateMatrix();
        wakeInst.setMatrixAt(i, dummy.matrix);
        continue;
      }
      w.x += w.vx * dt;
      w.z += w.vz * dt;
      const wave = oceanSampler.sampleWave(w.x, w.z);
      const t = w.age / w.life;
      const curScale = veLerp(w.startScale, w.endScale, Math.sqrt(t)) * (1 - t * 0.35);
      dummy.position.set(w.x, wave.y + 0.035, w.z);
      dummy.rotation.set(0, w.yaw, 0);
      dummy.scale.set(curScale, 1, curScale * (1.0 - t * 0.25));
      dummy.updateMatrix();
      wakeInst.setMatrixAt(i, dummy.matrix);
    }
    if (wakeDirty) wakeInst.instanceMatrix.needsUpdate = true;

    // 2) Update 3D sea-spray droplets
    let sprayDirty = false;
    for (let i = 0; i < MAX_SPRAY; i++) {
      const s = sprays[i];
      if (!s.active) continue;
      sprayDirty = true;
      s.age += dt;
      if (s.age >= s.life) {
        s.active = false;
        dummy.position.set(0, -999, 0);
        dummy.scale.set(0.001, 0.001, 0.001);
        dummy.updateMatrix();
        sprayInst.setMatrixAt(i, dummy.matrix);
        continue;
      }
      s.vy -= 14.5 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      const frac = s.age / s.life;
      const sc = s.scale * Math.sin(frac * Math.PI);
      dummy.position.set(s.x, s.y, s.z);
      dummy.rotation.set(s.age * 4.0, i, 0);
      dummy.scale.setScalar(Math.max(0.02, sc));
      dummy.updateMatrix();
      sprayInst.setMatrixAt(i, dummy.matrix);
    }
    if (sprayDirty) sprayInst.instanceMatrix.needsUpdate = true;

    // 3) Update smoke/dust/fire puffs
    let puffDirty = false;
    for (let i = 0; i < MAX_PUFFS; i++) {
      const p = puffs[i];
      if (!p.active) continue;
      puffDirty = true;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        dummy.position.set(0, -999, 0);
        dummy.scale.set(0.001, 0.001, 0.001);
        dummy.updateMatrix();
        puffInst.setMatrixAt(i, dummy.matrix);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vx *= Math.exp(-2.2 * dt);
      p.vz *= Math.exp(-2.2 * dt);
      const frac = p.age / p.life;
      const sc = veLerp(p.s0, p.s1, frac) * (1 - frac * 0.45);
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.age * 1.8, i * 0.5, 0);
      dummy.scale.setScalar(Math.max(0.02, sc));
      dummy.updateMatrix();
      puffInst.setMatrixAt(i, dummy.matrix);
    }
    if (puffDirty) puffInst.instanceMatrix.needsUpdate = true;

    // 4) Update sparks
    let sparkDirty = false;
    for (let i = 0; i < MAX_SPARKS; i++) {
      const sp = sparks[i];
      if (!sp.active) continue;
      sparkDirty = true;
      sp.age += dt;
      if (sp.age >= sp.life) {
        sp.active = false;
        dummy.position.set(0, -999, 0);
        dummy.scale.set(0.001, 0.001, 0.001);
        dummy.updateMatrix();
        sparkInst.setMatrixAt(i, dummy.matrix);
        continue;
      }
      sp.vy -= 19.0 * dt;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.z += sp.vz * dt;
      dummy.position.set(sp.x, sp.y, sp.z);
      dummy.rotation.set(0, Math.atan2(sp.vx, sp.vz), 0);
      dummy.scale.setScalar(1 - sp.age / sp.life);
      dummy.updateMatrix();
      sparkInst.setMatrixAt(i, dummy.matrix);
    }
    if (sparkDirty) sparkInst.instanceMatrix.needsUpdate = true;

    // 5) Update expanding shockwave rings
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      const sw = shockwaves[i];
      if (!sw.active) continue;
      sw.age += dt;
      if (sw.age >= sw.life) {
        sw.active = false;
        sw.mesh.visible = false;
        continue;
      }
      const frac = sw.age / sw.life;
      sw.mesh.scale.setScalar(0.8 + frac * sw.maxRadius);
      sw.mat.opacity = (1 - frac) * 0.85;
    }

    // 6) Step supersonic 120mm tank shells with sub-stepping!
    const allCars = ctx.vehicles?.list || [];
    for (let i = 0; i < MAX_SHELLS; i++) {
      const sh = shells[i];
      if (!sh.active) continue;
      sh.age += dt;
      if (sh.age >= sh.maxAge) {
        sh.active = false;
        sh.mesh.visible = false;
        detonateTankShell(sh.x, sh.y, sh.z, sh.shooterCar, ctx, damageVehicleFn, oceanSampler);
        continue;
      }

      const steps = 3;
      const subDt = dt / steps;
      let impacted = false;

      for (let s = 0; s < steps; s++) {
        const prevX = sh.x;
        const prevY = sh.y;
        const prevZ = sh.z;

        sh.vy -= 7.2 * subDt;
        sh.x += sh.vx * subDt;
        sh.y += sh.vy * subDt;
        sh.z += sh.vz * subDt;

        // Smoke ribbon trail along trajectory
        sh.trailTimer -= subDt;
        if (sh.trailTimer <= 0) {
          sh.trailTimer = 0.016;
          spawnPuff(sh.x, sh.y, sh.z, 0, 0.3, 0, 0xf1f5f9, 0.22, 0.95, 0.38);
        }

        // Check direct hit on any vehicle or helicopter!
        for (let vi = 0; vi < allCars.length; vi++) {
          const v = allCars[vi];
          if (!v || v === sh.shooterCar) continue;
          const hitR = (v.width || 2.0) * 0.68 + 0.45;
          const hitH = (v.height || 1.6) + 0.5;
          if (
            Math.hypot(sh.x - v.x, sh.z - v.z) <= hitR &&
            sh.y >= (v.y || 0) - 0.3 &&
            sh.y <= (v.y || 0) + hitH
          ) {
            detonateTankShell(sh.x, sh.y, sh.z, sh.shooterCar, ctx, damageVehicleFn, oceanSampler);
            impacted = true;
            break;
          }
        }
        if (impacted) break;

        // Check ground / ocean surface impact
        const surfaceY = oceanSampler.isOceanWater(sh.x, sh.z)
          ? oceanSampler.sampleWave(sh.x, sh.z).y
          : oceanSampler.sampleGround(sh.x, sh.z, sh.y);
        if (sh.y <= surfaceY) {
          detonateTankShell(sh.x, surfaceY, sh.z, sh.shooterCar, ctx, damageVehicleFn, oceanSampler);
          impacted = true;
          break;
        }

        // Check world building AABB LOS
        if (ctx.world?.checkLOS && !ctx.world.checkLOS(prevX, prevY, prevZ, sh.x, sh.y, sh.z)) {
          detonateTankShell(prevX, prevY, prevZ, sh.shooterCar, ctx, damageVehicleFn, oceanSampler);
          impacted = true;
          break;
        }
      }

      if (impacted) {
        sh.active = false;
        sh.mesh.visible = false;
      } else {
        sh.mesh.position.set(sh.x, sh.y, sh.z);
        _vA.set(sh.x + sh.vx, sh.y + sh.vy, sh.z + sh.vz);
        sh.mesh.lookAt(_vA);
      }
    }
  }

  return {
    fxRoot,
    ensureAttached,
    spawnWakePad,
    spawnSprayDroplet,
    spawnWaterSplashBurst,
    spawnPuff,
    spawnSparks,
    addSkidmark,
    spawnShockwaveRing,
    fireTankShell,
    updateFX
  };
}

// ============================================================================
// 5. EXACT GLSL OCEAN WAVE & MULTI-LEVEL WORLD TERRAIN SAMPLER
// ============================================================================

function createOceanAndTerrainSampler(ctx) {
  let cachedOceanUniforms = null;
  let searchedOceanScene = false;

  function resolveOceanUniforms() {
    if (cachedOceanUniforms) return cachedOceanUniforms;
    if (!searchedOceanScene && ctx?.world?.root) {
      searchedOceanScene = true;
      ctx.world.root.traverse((obj) => {
        if (
          !cachedOceanUniforms &&
          obj.isMesh &&
          obj.material?.isShaderMaterial &&
          obj.material.uniforms?.uTime &&
          obj.material.uniforms?.uShoreX
        ) {
          cachedOceanUniforms = obj.material.uniforms;
        }
      });
    }
    return cachedOceanUniforms;
  }

  function glslWaveHeight(px, pz, t, ampScale) {
    const w1 = Math.sin(px * 0.11 + pz * 0.04 + t * 1.45) * 0.34;
    const w2 = Math.sin(px * 0.23 - pz * 0.13 + t * 2.05) * 0.16;
    const w3 = Math.cos(px * 0.06 + pz * 0.19 - t * 1.15) * 0.12;
    const w4 = Math.sin((px - pz) * 0.42 + t * 2.85) * 0.05;
    return (w1 + w2 + w3 + w4) * ampScale;
  }

  function getOceanTimeAndShore() {
    const uni = resolveOceanUniforms();
    const uTime = uni?.uTime ? Number(uni.uTime.value) || 0 : Number(ctx?.elapsed) || 0;
    const uShoreX = uni?.uShoreX ? Number(uni.uShoreX.value) || -201.5 : -201.5;
    return { uTime, uShoreX };
  }

  function isOceanWater(x, z) {
    // Reclaimed Port of Tiên Thành docks (X in [62, 388], Z >= 352) & LSIA Airport tarmac (X in [-465, 58], Z >= 352) are solid dry land!
    if (z >= 352 && x >= -465 && x <= 388) return false;
    const { uShoreX } = getOceanTimeAndShore();
    return x < uShoreX + 1.5 || z > 235.0 || x > 388.0 || (x > 252.0 && z < -205.0);
  }

  function isLandVehicleSubmerged(x, z, groundY) {
    // Never flag bridges (groundY > 0.6), Bích Thủy Kênh Canal bridges, Port of LS docks, or LSIA Airport tarmac as submerged!
    if (groundY > -0.42) return false;
    if (z >= 350 && x >= -465 && x <= 390) return false;
    return true;
  }

  function sampleWave(x, z) {
    const { uTime, uShoreX } = getOceanTimeAndShore();
    const shoreDist = Math.max(0.0, uShoreX - x);
    const southDist = Math.max(0.0, z - 235.0);
    const eastDist = Math.max(0.0, x - 252.0);
    const effDist = Math.max(shoreDist, southDist, eastDist);
    const amp = veClamp(effDist / 26.0, 0.06, 1.0);
    const baseY = x < -195.0 ? -0.14 : -0.16;

    const eps = 0.65;
    const hC = glslWaveHeight(x, z, uTime, amp);
    const hX = glslWaveHeight(x + eps, z, uTime, amp);
    const hZ = glslWaveHeight(x, z + eps, uTime, amp);

    const nx = hC - hX;
    const ny = eps;
    const nz = hC - hZ;
    const invLen = 1.0 / (Math.hypot(nx, ny, nz) || 1.0);

    return {
      y: baseY + hC,
      nx: nx * invLen,
      ny: ny * invLen,
      nz: nz * invLen,
      amp,
      effDist,
      uTime
    };
  }

  function sampleGround(x, z, refY = 0.05) {
    let baseH = 0.02;
    if (ctx?.world && typeof ctx.world.getGroundHeight === 'function') {
      const gh = ctx.world.getGroundHeight(x, z, refY);
      if (Number.isFinite(gh)) baseH = gh;
    }
    if (ctx?.worldInfra && typeof ctx.worldInfra.getExtraGroundHeight === 'function') {
      const eh = ctx.worldInfra.getExtraGroundHeight(x, z, refY);
      if (Number.isFinite(eh) && eh > baseH && eh <= (refY ?? 0) + 3.2) {
        baseH = eh;
      }
    }
    // Fallback direct district elevation checks if called prior to unified world.getGroundHeight wrapper
    const districtMods = [ctx?.mapDowntown, ctx?.mapCommercial, ctx?.mapCoastHills, ctx?.mapPortAirport];
    for (let i = 0; i < districtMods.length; i++) {
      const dm = districtMods[i];
      if (dm && typeof dm.getElevation === 'function') {
        const dh = dm.getElevation(x, z, refY);
        if (Number.isFinite(dh) && dh <= (refY ?? 0) + 2.8 && Math.abs(dh - (refY ?? baseH)) < Math.abs(baseH - (refY ?? baseH)) + 2.5) {
          if (dh > baseH || (z < -210 && x >= 108 && x <= 132 && (refY ?? 0) < 6.8)) {
            baseH = dh;
          }
        }
      }
    }
    return baseH;
  }

  function sampleCeiling(x, z, refY = 0.05) {
    if (ctx?.world && typeof ctx.world.getCeilingHeight === 'function') {
      const ch = ctx.world.getCeilingHeight(x, z, refY);
      if (Number.isFinite(ch)) return ch;
    }
    return null;
  }

  // Seabed / beach sand floor under the surfline (ignoring elevated wooden Pier deck y=3.8m & Miriam Turner Bridge y=24m!)
  function sampleSeabed(x, z) {
    if (z >= 352 && x >= -465 && x <= 388) return 1.20;
    if (z > 235 && z < 352) return -3.20; // Deep Southern Shipping Channel under 24m Miriam Turner Bridge!
    if (x >= -128) return 0.22;
    if (x >= -212) {
      const t = (-128 - x) / 84;
      const ripple = Math.sin(z * 0.045) * 0.035 * Math.sin(t * Math.PI);
      return veLerp(0.22, -0.30, t) + ripple;
    }
    const deepT = veClamp((-212 - x) / 60, 0, 1);
    return veLerp(-0.30, -2.60, deepT);
  }

  return {
    isOceanWater,
    isLandVehicleSubmerged,
    sampleWave,
    sampleGround,
    sampleCeiling,
    sampleSeabed,
    getOceanTimeAndShore
  };
}

// ============================================================================
// 6. RIDER POSE ARTICULATION (Superbike Racing Tuck, Chopper Ape-Hanger,
//    Jet-Ski Straddle & Speedboat Helm) + HIGH-IMPACT CRASH EJECTION
// ============================================================================

function syncOpenRiderPose(car, dt, ctx, cockpitHiddenHead) {
  const player = ctx.player;
  if (!player) return;
  const pMesh = player.mesh || player.rig?.root;
  if (!pMesh) return;

  if ((player.fireCooldown || 0) > 0) {
    player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  }

  const inp = ctx.input || {};
  const modalBlocked = Boolean(ctx.activeModal || inp.phoneOpen || inp.wheelOpen || ctx.paused);
  const firingDriveBy = Boolean(!car.isTank && inp.fire && !modalBlocked);
  const aimingDriveBy = Boolean(!car.isTank && (inp.aim || firingDriveBy) && !modalBlocked);

  let aimYawOff = 0;
  let aimPitch = 0;
  if (aimingDriveBy && ctx.engine?.getAimRay) {
    const ray = ctx.engine.getAimRay();
    if (ray?.dir) {
      const worldAimYaw = Math.atan2(ray.dir.x, ray.dir.z);
      aimYawOff = veWrapAngle(worldAimYaw - car.yaw);
      aimPitch = veClamp(Math.asin(veClamp(ray.dir.y, -0.7, 0.7)), -0.58, 0.58);
    }
  }

  if (firingDriveBy && ctx.characters?.fireWeapon) {
    const curW = player.weaponId || player.currentWeapon || 'pistol';
    if (curW === 'unarmed' || curW === 'bat') {
      player.weaponId = 'smg';
      player.currentWeapon = 'smg';
    }
    ctx.characters.fireWeapon(player, ctx);
  }

  const rig = player.rig || pMesh;

  // Closed-cabin Zentorno & Huyền Vũ Thiết Giáp: hide external full-body mesh unless scissor doors are wide open
  if (!car.isOpenTop) {
    const showInOpenScissor = car.hasScissorDoors && (car.doorOpenFrac || 0) > 0.35 && !cockpitHiddenHead;
    if (!showInOpenScissor) {
      pMesh.visible = false;
      pMesh.position.set(car.x, car.y, car.z);
      return;
    }
  }

  pMesh.visible = true;
  car.chassis.updateMatrixWorld(true);
  car.driverSeatAnchor.getWorldPosition(_vA);
  car.chassis.getWorldQuaternion(_qA);

  const steerNorm = veClamp((car.steerAngle || 0) / 0.42, -1, 1);
  const j = rig?.joints;

  if (car.isMotorcycle && j) {
    const isChopper = car.isChopper;
    const wheelieNorm = veClamp(-(car.wheelieAngle || 0) / 0.52, 0, 1);
    const speedNorm = veClamp((car.absSpeed || 0) / 38.0, 0, 1);

    // Position rig root relative to saddle anchor (since pelvis.position.y ~ 0.48)
    _vB.set(0, -0.44, isChopper ? 0.04 : -0.02).applyQuaternion(_qA);
    pMesh.position.copy(_vA).add(_vB);
    pMesh.quaternion.copy(_qA);

    j.pelvis.position.set(0, veDamp(j.pelvis.position.y, 0.46, 18, dt), 0);
    j.pelvis.rotation.set(
      veDampAngle(j.pelvis.rotation.x, isChopper ? -0.06 : 0.34, 14, dt),
      0,
      veDampAngle(j.pelvis.rotation.z, -steerNorm * 0.14, 14, dt)
    );

    // Superbike aerodynamic racing tuck (+0.52 rad forward chest lean!) vs Chopper laid-back slouch (-0.14 rad)
    const targetSpineX = isChopper
      ? -0.14 + wheelieNorm * 0.18
      : 0.44 + speedNorm * 0.22 + wheelieNorm * 0.20;
    j.spine.rotation.set(
      veDampAngle(j.spine.rotation.x, targetSpineX, 14, dt),
      veDampAngle(j.spine.rotation.y, -steerNorm * 0.12, 14, dt),
      veDampAngle(j.spine.rotation.z, -(car.leanAngle || 0) * 0.18, 12, dt)
    );

    // Rider keeps gaze level with horizon during racing tuck & banking!
    j.head.rotation.set(
      veDampAngle(j.head.rotation.x, -targetSpineX * 0.85, 14, dt),
      veDampAngle(j.head.rotation.y, -steerNorm * 0.28, 14, dt),
      veDampAngle(j.head.rotation.z, -(car.leanAngle || 0) * 0.32, 12, dt)
    );

    if (isChopper) {
      // Boots stretched forward onto highway pegs & hands high up on Ape-Hanger handlebars!
      j.hipL.rotation.set(veDampAngle(j.hipL.rotation.x, -1.24, 16, dt), 0, 0.24);
      j.hipR.rotation.set(veDampAngle(j.hipR.rotation.x, -1.24, 16, dt), 0, -0.24);
      j.kneeL.rotation.x = veDampAngle(j.kneeL.rotation.x, 0.62, 16, dt);
      j.kneeR.rotation.x = veDampAngle(j.kneeR.rotation.x, 0.62, 16, dt);

      j.shoulderL.rotation.set(
        veDampAngle(j.shoulderL.rotation.x, -1.52 + steerNorm * 0.18, 16, dt),
        veDampAngle(j.shoulderL.rotation.y, -0.18, 16, dt),
        0.16
      );
      j.elbowL.rotation.x = veDampAngle(j.elbowL.rotation.x, -0.22, 16, dt);
    } else {
      // Superbike rearsets: thighs hugging tank, knees sharply tucked back!
      j.hipL.rotation.set(veDampAngle(j.hipL.rotation.x, -0.88, 16, dt), 0, 0.26);
      j.hipR.rotation.set(veDampAngle(j.hipR.rotation.x, -0.88, 16, dt), 0, -0.26);
      j.kneeL.rotation.x = veDampAngle(j.kneeL.rotation.x, 1.92, 16, dt);
      j.kneeR.rotation.x = veDampAngle(j.kneeR.rotation.x, 1.92, 16, dt);

      j.shoulderL.rotation.set(
        veDampAngle(j.shoulderL.rotation.x, -1.22 + steerNorm * 0.16, 16, dt),
        veDampAngle(j.shoulderL.rotation.y, -0.14, 16, dt),
        0.14
      );
      j.elbowL.rotation.x = veDampAngle(j.elbowL.rotation.x, -0.58, 16, dt);
    }

    if (aimingDriveBy) {
      j.shoulderR.rotation.set(
        veDampAngle(j.shoulderR.rotation.x, -Math.PI * 0.5 + aimPitch - targetSpineX * 0.6, 20, dt),
        veDampAngle(j.shoulderR.rotation.y, aimYawOff, 20, dt),
        0
      );
      j.elbowR.rotation.x = veDampAngle(j.elbowR.rotation.x, -0.08, 20, dt);
    } else if (isChopper) {
      j.shoulderR.rotation.set(
        veDampAngle(j.shoulderR.rotation.x, -1.52 - steerNorm * 0.18, 16, dt),
        veDampAngle(j.shoulderR.rotation.y, 0.18, 16, dt),
        -0.16
      );
      j.elbowR.rotation.x = veDampAngle(j.elbowR.rotation.x, -0.22, 16, dt);
    } else {
      j.shoulderR.rotation.set(
        veDampAngle(j.shoulderR.rotation.x, -1.22 - steerNorm * 0.16, 16, dt),
        veDampAngle(j.shoulderR.rotation.y, 0.14, 16, dt),
        -0.14
      );
      j.elbowR.rotation.x = veDampAngle(j.elbowR.rotation.x, -0.58, 16, dt);
    }
  } else if (car.type === 'jetski' && j) {
    // Athletic Jet-Ski straddle rider pose gripping handlebars
    _vB.set(0, -0.44, 0.0).applyQuaternion(_qA);
    pMesh.position.copy(_vA).add(_vB);
    pMesh.quaternion.copy(_qA);

    j.pelvis.position.set(0, veDamp(j.pelvis.position.y, 0.48, 16, dt), 0);
    j.pelvis.rotation.set(0.18, 0, -steerNorm * 0.10);
    j.spine.rotation.set(0.24, -steerNorm * 0.10, 0);
    j.head.rotation.set(-0.18, -steerNorm * 0.22, 0);
    j.hipL.rotation.set(-1.05, 0, 0.30);
    j.hipR.rotation.set(-1.05, 0, -0.30);
    j.kneeL.rotation.x = 1.48;
    j.kneeR.rotation.x = 1.48;
    j.shoulderL.rotation.set(-1.12 + steerNorm * 0.20, -0.18, 0.12);
    j.elbowL.rotation.x = -0.45;
    if (aimingDriveBy) {
      j.shoulderR.rotation.set(-Math.PI * 0.5 + aimPitch, aimYawOff, 0);
      j.elbowR.rotation.x = -0.08;
    } else {
      j.shoulderR.rotation.set(-1.12 - steerNorm * 0.20, 0.18, -0.12);
      j.elbowR.rotation.x = -0.45;
    }
  } else {
    // Speedboat helm bucket seat or open scissor-door Zentorno seat
    ctx.characters?.animateHumanoid?.(rig, 'driving', dt, {
      steer: steerNorm,
      aimDriveBy: aimingDriveBy,
      aimYawOffset: aimYawOff,
      aimPitch
    });
    _vB.set(0, -0.36, 0.03).applyQuaternion(_qA);
    pMesh.position.copy(_vA).add(_vB);
    pMesh.quaternion.copy(_qA);
  }
}

// ============================================================================
// 7A. MOTORCYCLE BALANCE, CORNER LEAN (±0.58 rad), WHEELIE (-0.52 rad),
//     STOPPIE & >24 m/s HEAD-ON CRASH RAGDOLL EJECTION PHYSICS
// ============================================================================

function awardPlayerCashAndToast(ctx, amount, messageText) {
  if (!ctx?.player || amount <= 0) return;
  const curCash = Number.isFinite(ctx.player.cash)
    ? ctx.player.cash
    : Number.isFinite(ctx.player.money)
      ? ctx.player.money
      : 7860;
  const nextCash = Math.round(curCash + amount);
  if (ctx?.antiCheat?.commitCash) {
    ctx.antiCheat.commitCash(nextCash);
  } else {
    ctx.player.cash = nextCash;
    ctx.player.money = nextCash;
  }
  ctx.ui?.addCashPopup?.(amount);
  ctx.ui?.onCashChange?.(nextCash, amount);
  if (messageText) {
    if (typeof ctx.ui?.showToast === 'function') ctx.ui.showToast(messageText);
    else if (typeof ctx.ui?.showNotification === 'function') ctx.ui.showNotification(messageText, 3.2);
    else if (typeof ctx.ui?.showVehicleCallout === 'function') ctx.ui.showVehicleCallout(messageText);
  }
}

function triggerRiderCrashEjection(car, impactSpeed, preVx, preVz, ctx, extraFX, forceExitFn) {
  const player = ctx.player;
  if (!player || player.inCar !== car || player.isDead) return;

  forceExitFn(true);

  const spd = Math.max(24.0, impactSpeed);
  const invSpd = 1.0 / Math.max(1.0, Math.hypot(preVx, preVz));
  const dirX = Math.hypot(preVx, preVz) > 1.0 ? preVx * invSpd : Math.sin(car.yaw);
  const dirZ = Math.hypot(preVx, preVz) > 1.0 ? preVz * invSpd : Math.cos(car.yaw);

  const launchHoriz = veClamp(spd * 0.56, 13.5, 24.0);
  player.x = car.x + dirX * 1.15;
  player.y = car.y + 1.05;
  player.z = car.z + dirZ * 1.15;
  player.vx = dirX * launchHoriz;
  player.vy = veClamp(4.8 + (spd - 24.0) * 0.16, 4.8, 8.6);
  player.vz = dirZ * launchHoriz;
  player.isGrounded = false;

  // Inflict dramatic crash road-rash damage without unfair instant one-shot if healthy
  if (typeof player.hp === 'number' && player.hp > 0) {
    const rawDmg = Math.round(16 + (spd - 24.0) * 0.85);
    player.hp = player.hp > 28 ? Math.max(12, player.hp - rawDmg) : Math.max(0, player.hp - rawDmg);
  }

  player._bikeEjectRagdollTimer = 1.35;
  const pMesh = player.mesh || player.rig?.root;
  if (pMesh) {
    pMesh.visible = true;
    pMesh.position.set(player.x, player.y, player.z);
  }
  ctx.characters?.animateHumanoid?.(player.rig || player, 'ragdoll', 0.016);

  extraFX.spawnSparks(car.x, car.y + 0.35, car.z, 20, 12.0);
  extraFX.spawnPuff(player.x, player.y, player.z, dirX * 3.0, 1.8, dirZ * 3.0, 0xe2e8f0, 0.5, 2.2, 0.65);
  ctx.engine?.addShake?.(0.72);
  ctx.engine?.triggerDamageFlash?.(0.55);
  ctx.audio?.playCrash?.(0.95);
  if (typeof ctx.ui?.showVehicleCallout === 'function') {
    ctx.ui.showVehicleCallout('VĂNG KHỎI MÔ TÔ DO VA CHẠM MẠNH!');
  }
}

function stepMotorcyclePhysics(car, dt, input, ctx, oceanSampler, extraFX, audioSynth, helpers) {
  const isPlayer = car === ctx.player?.inCar;

  if (car.destroyed) {
    const gy = oceanSampler.sampleGround(car.x, car.z, car.y);
    if (car.y > gy || car.vy !== 0) {
      car.vy -= 22.0 * dt;
      car.y = Math.max(gy, car.y + car.vy * dt);
      if (car.y <= gy) car.vy = 0;
    }
    car.vx *= Math.exp(-4.5 * dt);
    car.vz *= Math.exp(-4.5 * dt);
    car.x += car.vx * dt;
    car.z += car.vz * dt;
    car.leanAngle = veDamp(car.leanAngle || 0, 1.32, 6.0, dt);
    if (car.leanPivot) car.leanPivot.rotation.z = car.leanAngle;
    car.mesh.position.set(car.x, car.y, car.z);
    car.mesh.rotation.y = car.yaw;
    return;
  }

  const extMoved = !isPlayer && Math.hypot(car.x - car._lastX, car.z - car._lastZ) > 0.0004;
  const isKinematicAI = !isPlayer && (extMoved || car.aiControlled);

  const preVx = car.vx || 0;
  const preVz = car.vz || 0;
  const preSpeed = Math.hypot(preVx, preVz);

  const fwdX = Math.sin(car.yaw);
  const fwdZ = Math.cos(car.yaw);
  const rightX = -Math.cos(car.yaw);
  const rightZ = Math.sin(car.yaw);

  let vFwd = preVx * fwdX + preVz * fwdZ;
  let vLat = preVx * rightX + preVz * rightZ;
  let yawRate = 0;

  const onBeachSand = car.x < -128 && !(car.z >= -32 && car.z <= 22 && car.y > 1.8);
  const stageSpeedMult = 1.0 + (Number(car.mods?.engineStage) || 0) * 0.06;
  const hasRider = Boolean(isPlayer || car.hasAIDriver || isKinematicAI);

  if (isKinematicAI) {
    if (extMoved) {
      car.vx = (car.x - car._lastX) / dt;
      car.vz = (car.z - car._lastZ) / dt;
    } else {
      car.vx *= Math.exp(-8 * dt);
      car.vz *= Math.exp(-8 * dt);
    }
    vFwd = car.vx * fwdX + car.vz * fwdZ;
    vLat = car.vx * rightX + car.vz * rightZ;
    yawRate = veWrapAngle(car.yaw - car._lastYaw) / dt;
    car.steerAngle = veDamp(car.steerAngle || 0, veClamp(-yawRate * 0.18, -0.42, 0.42), 10, dt);
    car.isBraking = vFwd < (car._prevVFwd || 0) - 4.0 * dt;
    car.isReversing = vFwd < -0.5;
    car.leanAngle = veDamp(car.leanAngle || 0, veClamp(-yawRate * vFwd * 0.018, -0.52, 0.52), 9, dt);
    car.wheelieAngle = veDamp(car.wheelieAngle || 0, 0, 10, dt);
  } else {
    const gas = isPlayer ? input.throttle : 0;
    const brk = isPlayer ? input.brake : 0;
    const str = isPlayer ? input.steer : 0;
    const hbrk = isPlayer && input.handbrake;
    const bst = isPlayer && input.boost;
    const wheeliePull = isPlayer && input.wheeliePull;
    const stoppiePush = isPlayer && input.stoppiePush;

    const focusMult = isPlayer && ctx.player?.specialActive ? 1.55 : 1.0;
    const puncturedMult = car.tiresPopped && !car.mods?.bulletproofTires ? 0.52 : 1.0;

    car.isBraking = false;
    car.isReversing = false;

    const wheelieActiveBoost = (car.wheelieAngle || 0) < -0.18 ? 1.08 : 1.0;
    const topSpeed = car.maxSpeed * stageSpeedMult * (bst ? 1.10 : 1.0) * wheelieActiveBoost * (onBeachSand ? 0.84 : 1.0);
    const accelPower = car.accel * stageSpeedMult * (onBeachSand ? 0.85 : 1.0);

    if (gas > 0.02) {
      if (vFwd < -1.0) {
        vFwd = Math.min(0, vFwd + 38.0 * gas * dt);
        car.isBraking = true;
      } else {
        const sr = veClamp(Math.abs(vFwd) / topSpeed, 0, 1.18);
        const curve = Math.max(0.14, 1.0 - Math.pow(sr, 1.85) * 0.86);
        vFwd += accelPower * gas * curve * dt;
      }
    }

    if (brk > 0.02) {
      if (vFwd > 1.0) {
        vFwd = Math.max(0, vFwd - 39.0 * brk * dt);
        car.isBraking = true;
      } else {
        car.isReversing = true;
        const revMax = 7.5;
        if (vFwd > -revMax) vFwd -= 14.0 * brk * dt;
      }
    }

    const drag = (!hasRider ? 3.2 : 0.36) + (onBeachSand ? 0.85 : 0);
    vFwd *= Math.exp(-drag * dt);
    if (Math.abs(vFwd) < 0.08 && gas < 0.02 && brk < 0.02) vFwd = 0;

    if (hbrk) {
      vFwd *= Math.exp(-1.95 * dt);
      car.isBraking = true;
    }

    // Agile motorcycle steering & turn rate (tighter when leaning, slightly reduced while front wheel is airborne in wheelie!)
    const inDeepWheelie = (car.wheelieAngle || 0) < -0.22;
    const wheelieSteerDampen = inDeepWheelie ? 0.58 : 1.0;
    car.steerAngle = veDamp(car.steerAngle || 0, str * 0.42 * wheelieSteerDampen, 13.5 * focusMult, dt);

    const absFwd = Math.abs(vFwd);
    const lowSpdRamp = veClamp((absFwd - 0.15) / 2.6, 0, 1);
    const highSpdTaper = 1.0 / (1.0 + absFwd * 0.019);
    const dirSign = vFwd >= -0.15 ? 1 : -1;
    yawRate = -(car.steerAngle / 0.42) * 3.15 * lowSpdRamp * highSpdTaper * dirSign * focusMult;
    car.yaw = veWrapAngle(car.yaw + yawRate * dt);

    if (hbrk && absFwd > 5.5 && Math.abs(str) > 0.15) {
      vLat += str * 5.6 * dt;
    }

    const wetMult = helpers.isWetRoad ? 0.78 : 1.0;
    const latGrip = (hbrk ? 2.4 : 10.2 * car.def.grip) * wetMult * puncturedMult * (onBeachSand ? 0.74 : 1.0);
    vLat *= Math.exp(-latGrip * dt);

    const nFwdX = Math.sin(car.yaw);
    const nFwdZ = Math.cos(car.yaw);
    const nRightX = -Math.cos(car.yaw);
    const nRightZ = Math.sin(car.yaw);
    car.vx = nFwdX * vFwd + nRightX * vLat;
    car.vz = nFwdZ * vFwd + nRightZ * vLat;

    car.x = veClamp(car.x + car.vx * dt, -500, 440);
    car.z = veClamp(car.z + car.vz * dt, -445, 565);
    car.isDrifting = (Math.abs(vLat) > 3.2 && absFwd > 5.0) || (hbrk && absFwd > 5.5);

    // --- Smooth Corner Banking Lean (±0.58 rad INWARD into turn!) ---
    // Parked driverless bikes rest on left kickstand (-0.11 rad toward +X left!)
    let targetLean = 0;
    if (!hasRider && absFwd < 0.4) {
      targetLean = -0.11;
    } else {
      const speedLeanFactor = veClamp(absFwd / 15.5, 0.08, 1.0);
      const maxLean = car.def.maxLean || 0.58;
      targetLean = veClamp(str * speedLeanFactor * maxLean, -maxLean, maxLean);
    }
    car.leanAngle = veDamp(car.leanAngle || 0, targetLean, 9.8 * focusMult, dt);

    // Titanium Knee/Footpeg Sparks at extreme MotoGP lean (> 0.50 rad at high speed)!
    if (Math.abs(car.leanAngle) > 0.50 && absFwd > 18.0 && Math.random() < 0.45) {
      const leanSide = car.leanAngle > 0 ? 1 : -1; // >0 leans Right (+nRight)
      extraFX.spawnSparks(
        car.x + nRightX * leanSide * 0.36,
        car.y + 0.06,
        car.z + nRightZ * leanSide * 0.36,
        2,
        6.5
      );
    }

    // --- Rear-Wheel Wheelie (-0.52 rad) & Front-Brake Stoppie (+0.36 rad)! ---
    let targetWheelie = 0;
    const canWheelie = wheeliePull && gas > 0.25 && vFwd > 4.5 && !car.isBraking;
    const canPowerLift = !car.isChopper && bst && gas > 0.9 && vFwd > 6.0 && vFwd < 20.0 && Math.abs(str) < 0.35;
    const canStoppie = (stoppiePush || (brk > 0.85 && hbrk)) && vFwd > 9.5 && gas < 0.1;

    if (canWheelie) {
      const pullStrength = veClamp((vFwd - 3.5) / 8.0, 0.35, 1.0);
      const balanceWobble = Math.sin((ctx.elapsed || 0) * 11.5) * 0.022;
      targetWheelie = (car.def.maxWheeliePitch || -0.52) * pullStrength + balanceWobble;
    } else if (canPowerLift) {
      targetWheelie = -0.26;
    } else if (canStoppie) {
      targetWheelie = car.def.maxStoppiePitch || 0.36;
    }

    car.wheelieAngle = veDamp(
      car.wheelieAngle || 0,
      targetWheelie,
      targetWheelie !== 0 ? 7.8 : 9.5,
      dt
    );

    // Track Wheelie Distance, Recharge Special Bar & Award Clean Landing Cash Bonus!
    if (isPlayer) {
      if (car.wheelieAngle < -0.20 && vFwd > 6.0) {
        car.wheelieDist = (car.wheelieDist || 0) + vFwd * dt;
        car.wheelieTime = (car.wheelieTime || 0) + dt;
        if (ctx.player && !ctx.player.specialActive && typeof ctx.player.special === 'number') {
          ctx.player.special = Math.min(100, ctx.player.special + 8.5 * dt);
        }
        if (Math.random() < 0.28) {
          const rx = car.x + car.def.wheelBaseR * nFwdX;
          const rz = car.z + car.def.wheelBaseR * nFwdZ;
          extraFX.spawnPuff(rx, car.y + 0.12, rz, -car.vx * 0.1, 0.5, -car.vz * 0.1, 0xe2e8f0, 0.22, 0.85, 0.35);
        }
      } else if ((car.wheelieDist || 0) >= 18.0) {
        const distMeters = Math.round(car.wheelieDist);
        const bonus = Math.min(1250, Math.max(50, Math.round(distMeters * 3.2)));
        awardPlayerCashAndToast(ctx, bonus, `BỐC ĐẦU MÔ TÔ ĐỈNH CAO: ${distMeters}m • +$${bonus}`);
        audioSynth.playExhaustPop();
        car.wheelieDist = 0;
        car.wheelieTime = 0;
      } else {
        car.wheelieDist = 0;
        car.wheelieTime = 0;
      }

      if (input.hornJust) {
        ctx.audio?.playHorn?.(false);
      }

      const gearCount = car.def.gears || 6;
      const gearProg = (absFwd / Math.max(1, car.maxSpeed)) * gearCount;
      const rpmNorm = veClamp(0.24 + (gearProg % 1) * 0.66 + (inDeepWheelie ? 0.14 : gas * 0.08), 0.15, 1.0);
      ctx.audio?.updateEngine?.(absFwd, car.maxSpeed, gas, false, rpmNorm);
    }

    // --- Building AABB Collision + >24 m/s Head-On Rider Ragdoll Ejection! ---
    const col = ctx.world?.resolveCarAABB?.(car);
    if (col && (col === true || col.hit)) {
      const nx = Number.isFinite(col.normalX) ? col.normalX : -nFwdX;
      const nz = Number.isFinite(col.normalZ) ? col.normalZ : -nFwdZ;
      const imp = Number.isFinite(col.impactSpeed) ? col.impactSpeed : preSpeed;
      const headOnCos = -(nFwdX * nx + nFwdZ * nz);

      car.vx = (car.vx - 1.35 * (car.vx * nx + car.vz * nz) * nx) * 0.65;
      car.vz = (car.vz - 1.35 * (car.vx * nx + car.vz * nz) * nz) * 0.65;
      car.wheelieAngle = 0;
      car.wheelieDist = 0;

      if (imp > 6.0) {
        extraFX.spawnSparks(car.x, car.y + 0.45, car.z, 12, 9.5);
        if (imp > 11.0) helpers.damageVehicle(car, (imp - 9.0) * 1.1);
        if (isPlayer) {
          ctx.engine?.addShake?.(veClamp(imp * 0.025, 0.12, 0.6));
          ctx.audio?.playCrash?.(veClamp(imp / 28, 0.2, 1.0));
        }
      }

      // High-impact head-on crash (> 24 m/s) -> Eject rider in full Ragdoll!
      if (isPlayer && preSpeed > 24.0 && (headOnCos > 0.38 || imp > 24.0)) {
        triggerRiderCrashEjection(car, Math.max(preSpeed, imp), preVx, preVz, ctx, extraFX, helpers.exitExtraVehicle);
        return;
      }
    }
  }

  car.speed = vFwd;
  car.absSpeed = Math.hypot(car.vx, car.vz);

  // Ground sampling under Front & Rear axles
  const sinY = Math.sin(car.yaw);
  const cosY = Math.cos(car.yaw);
  const fGround = oceanSampler.sampleGround(
    car.x + car.def.wheelBaseF * sinY,
    car.z + car.def.wheelBaseF * cosY,
    car.y
  );
  const rGround = oceanSampler.sampleGround(
    car.x + car.def.wheelBaseR * sinY,
    car.z + car.def.wheelBaseR * cosY,
    car.y
  );
  const avgGround = (fGround + rGround) * 0.5;

  // Deep water stall hazard ONLY when actually submerged in ocean (never on LSIA, Port docks, or bridges!)
  if (oceanSampler.isLandVehicleSubmerged(car.x, car.z, avgGround)) {
    car.vx *= Math.exp(-4.0 * dt);
    car.vz *= Math.exp(-4.0 * dt);
    if (avgGround < -0.78) helpers.damageVehicle(car, 24 * dt);
  }

  // Vertical spring-damper + parabolic Stunt-Jump flight off ramps/roofs + ceiling guard!
  const prevG = Number.isFinite(car._prevGroundY) ? car._prevGroundY : avgGround;
  const rampRiseVy = prevG > avgGround + 1.5 ? 0 : veClamp((avgGround - prevG) / Math.max(dt, 0.008), -8, 24);
  car._prevGroundY = avgGround;

  if (car.y > avgGround + 0.48 || (car.vy || 0) > 2.2) {
    // Airborne parabolic trajectory off rooftop / container / boarding-stairs stunt ramps!
    car.vy = (car.vy || 0) - 18.5 * dt;
    car.y += car.vy * dt;
    if (car.y <= avgGround) {
      car.y = avgGround;
      car.vy = 0;
      car.suspVelY = -1.8;
    }
  } else {
    const groundDelta = avgGround - car.y;
    car.suspVelY = (car.suspVelY || 0) + (groundDelta * 72.0 - (car.suspVelY || 0) * 12.5) * dt;
    car.y += car.suspVelY * dt;
    if (avgGround > car.y && avgGround - car.y < 2.2) {
      car.y = Math.max(car.y, avgGround - 0.12);
    }
    car.vy = rampRiseVy > 1.5 ? rampRiseVy * 0.92 : 0;
  }
  const ceilY = oceanSampler.sampleCeiling(car.x, car.z, car.y);
  if (ceilY !== null && car.y + car.height > ceilY) {
    car.y = Math.max(avgGround, ceilY - car.height);
    if (car.suspVelY > 0) car.suspVelY = 0;
    if ((car.vy || 0) > 0) car.vy = 0;
  }

  const slopePitch = veClamp(
    Math.atan2(rGround - fGround, car.def.wheelBaseF - car.def.wheelBaseR),
    -0.42,
    0.42
  );
  const accelDive = veClamp(((vFwd - (car._prevVFwd || 0)) / Math.max(dt, 0.008)) * -0.0022, -0.07, 0.09);
  car._prevVFwd = vFwd;

  car.roll = car.leanAngle || 0;
  car.pitch = (car.wheelieAngle || 0) + slopePitch + accelDive;

  if (car.leanPivot) car.leanPivot.rotation.z = car.leanAngle || 0;
  if (car.wheeliePivot) car.wheeliePivot.rotation.x = (car.wheelieAngle || 0) + slopePitch + accelDive;

  // Kickstand deploy when parked vs retract cleanly when ridden!
  if (car.kickstandPivot) {
    const standTarget = !hasRider && car.absSpeed < 0.5 ? 0.0 : -1.35;
    car.kickstandPivot.rotation.x = veDamp(car.kickstandPivot.rotation.x, standTarget, 12, dt);
  }

  // Spin wheels, steer front fork & scroll Bati 801RR drive chain UV!
  const spinDelta = (vFwd / Math.max(0.2, car.def.wheelRadius)) * dt;
  for (let i = 0; i < car.wheels.length; i++) {
    const w = car.wheels[i];
    if (w.isFront) {
      w.steerPivot.rotation.y = -(car.steerAngle || 0);
      // Front wheel spins down slightly during sustained wheelie in mid-air!
      const frontWheelSpinMult = (car.wheelieAngle || 0) < -0.22 ? 0.45 : 1.0;
      w.spinGroup.rotation.x += spinDelta * frontWheelSpinMult;
    } else {
      w.spinGroup.rotation.x += spinDelta;
    }
  }
  if (car.chainMat?.map) {
    car.chainMat.map.offset.x = (car.chainMat.map.offset.x + vFwd * 0.45 * dt) % 1.0;
  }

  // Undertail / Drag-pipe exhaust backfire flames on gearshifts, boost & wheelies!
  if (car.backfireFlames && car.backfireFlames.length > 0) {
    const curGear = Math.min(car.def.gears || 6, Math.max(1, Math.ceil((Math.abs(vFwd) / car.maxSpeed) * (car.def.gears || 6))));
    if (curGear !== car._lastGear && Math.abs(vFwd) > 10.0) {
      car._flameFlashTimer = 0.13;
      if (isPlayer) audioSynth.playExhaustPop();
    }
    car._lastGear = curGear;
    if ((car._flameFlashTimer || 0) > 0) car._flameFlashTimer = Math.max(0, car._flameFlashTimer - dt);

    const showFlames =
      (car._flameFlashTimer || 0) > 0 ||
      (isPlayer && input.boost && input.throttle > 0.6 && Math.abs(vFwd) > 12) ||
      ((car.wheelieAngle || 0) < -0.26 && Math.random() < 0.35);

    for (let f = 0; f < car.backfireFlames.length; f++) {
      const fg = car.backfireFlames[f];
      fg.visible = showFlames;
      if (showFlames) fg.scale.set(1, 1, 0.75 + Math.random() * 0.65);
    }
  }

  // Rear tire skidmark & burnout smoke
  if (car.isDrifting || (isPlayer && input.throttle > 0.85 && Math.abs(vFwd) < 5.5)) {
    car.skidTimer = (car.skidTimer || 0) - dt;
    if (car.skidTimer <= 0) {
      car.skidTimer = 0.045;
      const rx = car.x + car.def.wheelBaseR * sinY;
      const rz = car.z + car.def.wheelBaseR * cosY;
      extraFX.addSkidmark(rx, rGround, rz, car.yaw, 0.72);
      extraFX.spawnPuff(rx, rGround + 0.14, rz, -car.vx * 0.1, 0.55, -car.vz * 0.1, 0xe2e8f0, 0.24, 1.0, 0.42);
    }
  }

  helpers.updateLightsAndDamageSmoke(car, dt, isPlayer);

  car.mesh.position.set(car.x, car.y, car.z);
  car.mesh.rotation.y = car.yaw;

  if (isPlayer && ctx.player) {
    ctx.player.x = car.x;
    ctx.player.y = car.y;
    ctx.player.z = car.z;
    ctx.player.yaw = car.yaw;
    ctx.player.vx = car.vx;
    ctx.player.vz = car.vz;
    ctx.player.speed = car.speed;
    syncOpenRiderPose(car, dt, ctx, helpers.isHeadHidden);
  }
}

// ============================================================================
// 7B. GLSL WAVE-SYNCED MARINE WATERCRAFT BUOYANCY, PLANING, SWELL JUMPS,
//     FOAMING V-WAKES & PACIFIC BEACH BEACHING PHYSICS ('jetski', 'speedboat')
// ============================================================================

function stepWatercraftPhysics(car, dt, input, ctx, oceanSampler, extraFX, audioSynth, helpers) {
  const isPlayer = car === ctx.player?.inCar;

  const sinY = Math.sin(car.yaw);
  const cosY = Math.cos(car.yaw);
  const halfL = car.length * 0.40;
  const halfW = car.width * 0.42;

  // Sample exact GPU-matched Pacific Ocean wave height at 5 hull stations!
  const wCenter = oceanSampler.sampleWave(car.x, car.z);
  const wBow = oceanSampler.sampleWave(car.x + halfL * sinY, car.z + halfL * cosY);
  const wStern = oceanSampler.sampleWave(car.x - halfL * sinY, car.z - halfL * cosY);
  const wPort = oceanSampler.sampleWave(car.x + halfW * cosY, car.z - halfW * sinY);
  const wStbd = oceanSampler.sampleWave(car.x - halfW * cosY, car.z + halfW * cosY);

  const avgWaveY = (wCenter.y * 2 + wBow.y + wStern.y + wPort.y + wStbd.y) / 6.0;
  const seabedY = oceanSampler.sampleSeabed(car.x, car.z);
  const waterDepth = avgWaveY - seabedY;
  const onBeachSand = waterDepth < 0.14;

  if (car.destroyed) {
    const sinkTarget = Math.max(seabedY, avgWaveY - 0.55);
    car.y = veDamp(car.y, sinkTarget, 2.2, dt);
    car.vx *= Math.exp(-3.0 * dt);
    car.vz *= Math.exp(-3.0 * dt);
    car.x += car.vx * dt;
    car.z += car.vz * dt;
    car.mesh.position.set(car.x, car.y, car.z);
    car.mesh.rotation.y = car.yaw;
    return;
  }

  const fwdX = sinY;
  const fwdZ = cosY;
  const rightX = -cosY;
  const rightZ = sinY;

  let vFwd = (car.vx || 0) * fwdX + (car.vz || 0) * fwdZ;
  let vLat = (car.vx || 0) * rightX + (car.vz || 0) * rightZ;

  const gas = isPlayer ? input.throttle : 0;
  const brk = isPlayer ? input.brake : 0;
  const str = isPlayer ? input.steer : 0;
  const bst = isPlayer && input.boost;

  car.isBraking = false;
  car.isReversing = false;

  const stageMult = 1.0 + (Number(car.mods?.engineStage) || 0) * 0.06;
  const topSpeed = car.maxSpeed * stageMult * (bst ? 1.12 : 1.0);
  const airborne = (car.y || 0) > avgWaveY + 0.34 && !onBeachSand;

  if (isPlayer) {
    // Water-jet / Twin-prop propulsion requires propellers/nozzle in water (or shallow beach push-off!)
    const propGrip = airborne ? 0.12 : onBeachSand ? 0.32 : 1.0;

    if (gas > 0.02) {
      const sr = veClamp(Math.abs(vFwd) / topSpeed, 0, 1.15);
      const curve = Math.max(0.16, 1.0 - Math.pow(sr, 1.7) * 0.84);
      vFwd += car.accel * stageMult * gas * propGrip * curve * dt;
    }

    if (brk > 0.02) {
      if (vFwd > 1.2) {
        vFwd = Math.max(0, vFwd - 22.0 * brk * propGrip * dt);
        car.isBraking = true;
      } else {
        // Reverse bucket thrust allows backing smoothly off the Marina dock or Pacific Beach sand!
        car.isReversing = true;
        const revMax = car.maxSpeed * 0.30;
        if (vFwd > -revMax) {
          vFwd -= car.accel * 0.55 * brk * Math.max(0.48, propGrip) * dt;
        }
      }
    }

    // Steerable water-jet / rudder torque (Jet Ski turns even tighter when throttling!)
    const jetAssist = 0.45 + gas * 0.55;
    const targetSteer = str * 0.42;
    car.steerAngle = veDamp(car.steerAngle || 0, targetSteer, 9.5, dt);

    const absFwd = Math.abs(vFwd);
    const turnAuthority = airborne
      ? 0.25
      : onBeachSand
        ? 0.35
        : veClamp((absFwd + gas * 4.5) / 8.5, 0.18, 1.0) * jetAssist;
    const turnRate = (car.type === 'jetski' ? 2.65 : 1.78) * turnAuthority;
    const dirSign = vFwd >= -0.3 ? 1 : -1;
    car.yaw = veWrapAngle(car.yaw - (car.steerAngle / 0.42) * turnRate * dirSign * dt);

    if (input.hornJust) {
      ctx.audio?.playHorn?.(false);
    }

    const rpmNorm = veClamp(0.20 + (absFwd / topSpeed) * 0.62 + gas * 0.18 + (airborne ? 0.12 : 0), 0.16, 1.0);
    ctx.audio?.updateEngine?.(absFwd, topSpeed, gas, false, rpmNorm);
  }

  // Hydrodynamic water drag vs dry beach sand friction!
  const waterDrag = airborne ? 0.18 : onBeachSand ? 3.8 : (!isPlayer ? 2.1 : 0.48);
  const chineLatDrag = airborne ? 0.4 : onBeachSand ? 6.5 : 4.2 * car.def.grip;
  vFwd *= Math.exp(-waterDrag * dt);
  vLat *= Math.exp(-chineLatDrag * dt);
  if (!isPlayer && Math.abs(vFwd) < 0.06) {
    // Gentle mooring line station-keeping so docked Marina/Pier boats never drift away on swells!
    vFwd = 0;
    vLat = 0;
  }

  const nSin = Math.sin(car.yaw);
  const nCos = Math.cos(car.yaw);
  car.vx = nSin * vFwd - nCos * vLat;
  car.vz = nCos * vFwd + nSin * vLat;

  // Extended open-ocean & Southern Shipping Channel bounds
  car.x = veClamp(car.x + car.vx * dt, -680, 460);
  car.z = veClamp(car.z + car.vz * dt, -450, 620);

  // Prevent driving through Marina/Pier solid building AABBs
  if (car.x > -205) {
    const col = ctx.world?.resolveCarAABB?.(car);
    if (col && (col === true || col.hit)) {
      car.vx *= -0.35;
      car.vz *= -0.35;
    }
  }

  car.speed = vFwd;
  car.absSpeed = Math.hypot(car.vx, car.vz);

  // --- Hydrostatic Archimedes Buoyancy + Hydrodynamic Planing Lift + Swell Crest Jumps! ---
  const planingFrac = veClamp((vFwd - 5.5) / 22.0, 0, 1);
  const targetFloatY = avgWaveY - (car.def.draftDepth || 0.20) + planingFrac * (car.def.planingLift || 0.25);
  const minHullFloorY = seabedY + 0.05;

  const wasAirborne = Boolean(car._wasBoatAirborne);

  if (onBeachSand) {
    // Smooth beaching onto Pacific Beach shoreline sand!
    car.y = veDamp(car.y, minHullFloorY, 12.0, dt);
    car.vy = 0;
    car._wasBoatAirborne = false;
  } else if (car.y > targetFloatY + 0.16) {
    // Cresting & launching airborne off a Pacific Ocean swell!
    car.vy = (car.vy || 0) - 14.8 * dt;
    car.y += car.vy * dt;
    car._wasBoatAirborne = true;
    if (car.y <= targetFloatY) {
      const impactVy = Math.abs(car.vy);
      car.y = targetFloatY;
      car.vy *= -0.18;
      if (impactVy > 2.4) {
        const splashScale = veClamp(impactVy / 6.5, 0.5, 1.8);
        extraFX.spawnWaterSplashBurst(car.x, avgWaveY, car.z, splashScale, 20);
        if (isPlayer) {
          audioSynth.playWaveSplash(splashScale);
          ctx.engine?.addShake?.(veClamp(impactVy * 0.035, 0.08, 0.42));
        }
      }
      car._wasBoatAirborne = false;
    }
  } else {
    // Submerged spring-damper buoyancy + upward launch velocity when cresting fast swells!
    if (wasAirborne && Math.abs(car.vy || 0) > 2.2) {
      extraFX.spawnWaterSplashBurst(car.x, avgWaveY, car.z, 0.85, 14);
      if (isPlayer) audioSynth.playWaveSplash(0.6);
    }
    car._wasBoatAirborne = false;

    const submergence = targetFloatY - car.y;
    const waveRiseVel = (targetFloatY - (car._prevTargetFloatY ?? targetFloatY)) / Math.max(dt, 0.008);
    const buoyAccel = submergence * (car.def.buoyancyStiff || 32.0) - ((car.vy || 0) - waveRiseVel * 0.55) * (car.def.buoyancyDamp || 6.5);
    car.vy = (car.vy || 0) + buoyAccel * dt;

    // Launch off steep wave faces at high speed!
    const waveSlopeUp = (wBow.y - wStern.y) / Math.max(1.0, halfL * 2);
    if (vFwd > 18.0 && waveSlopeUp > 0.085) {
      car.vy += waveSlopeUp * vFwd * 1.45 * dt;
    }

    car.y = Math.max(minHullFloorY, car.y + car.vy * dt);
  }
  car._prevTargetFloatY = targetFloatY;

  // --- Wave-Synced Hull Pitch & Roll + Inward Turn Carve Banking! ---
  const wavePitch = Math.atan2(wStern.y - wBow.y, halfL * 2);
  const waveRoll = Math.atan2(wPort.y - wStbd.y, halfW * 2);
  // Note: bow-up in Three.js chassis (+Z forward) is negative rotation.x!
  const planingBowRise = -planingFrac * (car.type === 'jetski' ? 0.13 : 0.15) - (isPlayer ? gas * 0.045 : 0);
  const airbornePitch = car._wasBoatAirborne ? veClamp(-(car.vy || 0) * 0.035, -0.28, 0.22) : 0;

  // Banking inward into water-jet turns (+rotation.z banks right toward -X when str > 0!)
  const maxBank = car.type === 'jetski' ? 0.46 : 0.28;
  const turnBank = isPlayer ? veClamp(str * veClamp(Math.abs(vFwd) / 14.0, 0, 1) * maxBank, -maxBank, maxBank) : 0;

  car.pitch = veDamp(car.pitch || 0, wavePitch + planingBowRise + airbornePitch, 7.5, dt);
  car.roll = veDamp(car.roll || 0, waveRoll * 0.85 + turnBank, 8.2, dt);

  car.chassis.rotation.x = car.pitch;
  car.chassis.rotation.z = car.roll;

  // Animate Watercraft Hardware (Jet Nozzle, Captain's Wheel, Twin Props, Throttle Levers, Stern Flag!)
  if (car.steeringWheelPivot) {
    if (car.type === 'jetski') {
      car.steeringWheelPivot.rotation.y = -(car.steerAngle || 0) * 1.15;
    } else {
      car.steeringWheelPivot.rotation.z = (car.steerAngle || 0) * 3.2;
    }
  }
  if (car.jetNozzlePivot) {
    car.jetNozzlePivot.rotation.y = (car.steerAngle || 0) * 0.95;
  }
  if (car.throttleLeverPivot) {
    const thrTilt = isPlayer ? (gas > 0.05 ? gas * 0.52 : brk > 0.05 ? -0.35 : 0) : 0;
    car.throttleLeverPivot.rotation.x = veDamp(car.throttleLeverPivot.rotation.x, thrTilt, 10, dt);
  }
  if (car.propellerL && car.propellerR) {
    const propSpin = (vFwd * 1.8 + (isPlayer ? gas * 24.0 : 0)) * dt;
    car.propellerL.rotation.z += propSpin;
    car.propellerR.rotation.z -= propSpin;
  }
  if (car.flagMesh) {
    const windSpd = 3.5 + car.absSpeed * 0.45;
    car.flagMesh.rotation.y = Math.sin((ctx.elapsed || 0) * windSpd) * 0.28;
  }

  // --- Foaming White V-Wake Ribbons & Stern Water-Jet Rooster-Tail Spray! ---
  if (!onBeachSand && !car._wasBoatAirborne && car.absSpeed > 1.6) {
    car._wakeTimer = (car._wakeTimer || 0) - dt;
    if (car._wakeTimer <= 0) {
      car._wakeTimer = car.type === 'jetski' ? 0.042 : 0.048;
      const sternDist = car.length * 0.47;
      const sx = car.x - nSin * sternDist;
      const sz = car.z - nCos * sternDist;
      const spdFrac = veClamp(car.absSpeed / topSpeed, 0.15, 1.0);

      // Port & Starboard diverging V-wake foam chevrons!
      for (const side of [-1, 1]) {
        const latVel = side * (1.8 + spdFrac * 3.8);
        const wakeVx = -nCos * latVel - nSin * car.absSpeed * 0.12;
        const wakeVz = nSin * latVel - nCos * car.absSpeed * 0.12;
        extraFX.spawnWakePad(
          sx - nCos * side * (car.width * 0.28),
          wStern.y,
          sz + nSin * side * (car.width * 0.28),
          wakeVx,
          wakeVz,
          car.yaw + side * 0.38,
          (car.type === 'jetski' ? 0.55 : 0.95) * (0.7 + spdFrac * 0.5),
          (car.type === 'jetski' ? 2.4 : 4.2) * (0.7 + spdFrac * 0.6),
          1.25 + spdFrac * 0.55
        );
      }

      // Pressurized stern water-jet rooster-tail plume!
      if (isPlayer && gas > 0.25) {
        const jetSpeed = 5.5 + gas * 8.5;
        extraFX.spawnSprayDroplet(
          sx,
          wStern.y + 0.15,
          sz,
          -nSin * jetSpeed + (Math.random() - 0.5) * 1.4,
          1.8 + gas * (car.type === 'jetski' ? 3.8 : 2.6) + Math.random() * 1.2,
          -nCos * jetSpeed + (Math.random() - 0.5) * 1.4,
          car.type === 'jetski' ? 0.85 : 1.15,
          0.48
        );
      }
    }
  }

  helpers.updateLightsAndDamageSmoke(car, dt, isPlayer);

  car.mesh.position.set(car.x, car.y, car.z);
  car.mesh.rotation.y = car.yaw;

  if (isPlayer && ctx.player) {
    ctx.player.x = car.x;
    ctx.player.y = car.y;
    ctx.player.z = car.z;
    ctx.player.yaw = car.yaw;
    ctx.player.vx = car.vx;
    ctx.player.vz = car.vz;
    ctx.player.speed = car.speed;
    syncOpenRiderPose(car, dt, ctx, helpers.isHeadHidden);
  }
}

// ============================================================================
// 7C. PEGASSI ZENTORNO HYPERCAR PHYSICS: 49 m/s V12, ANIMATED SCISSOR DOORS,
//     ACTIVE HYDRAULIC GT WING / AIRBRAKE & V12 TRIPLE AFTERBURNERS
// ============================================================================

function stepZentornoPhysics(car, dt, input, ctx, oceanSampler, extraFX, audioSynth, helpers) {
  const isPlayer = car === ctx.player?.inCar;

  // Animate Upward-Opening Scissor Doors (`doorOpenFrac`: 0 = closed, 1 = 68° upward dihedral!)
  if ((car.doorAutoCloseTimer || 0) > 0) {
    car.doorAutoCloseTimer = Math.max(0, car.doorAutoCloseTimer - dt);
    if (car.doorAutoCloseTimer <= 0 && !car.manualDoorsOpen) {
      car.doorTargetOpen = 0;
      audioSynth.playScissorDoorServo(false);
    }
  }
  // Automatically close scissor doors smoothly once driving above 5 m/s
  if (isPlayer && (car.absSpeed || 0) > 5.5 && (car.doorTargetOpen || 0) > 0) {
    car.doorTargetOpen = 0;
    car.manualDoorsOpen = false;
  }

  car.doorOpenFrac = veDamp(car.doorOpenFrac || 0, car.doorTargetOpen || 0, 7.5, dt);
  if (car.leftDoorPivot && car.rightDoorPivot) {
    // Rotate upward around A-pillar hinge (+X swings rear of door UP!) + slight dihedral outward flare!
    const upAngle = car.doorOpenFrac * 1.18;
    const outAngle = car.doorOpenFrac * 0.16;
    car.leftDoorPivot.rotation.set(upAngle, 0, -outAngle);
    car.rightDoorPivot.rotation.set(upAngle, 0, outAngle);
  }

  if (car.destroyed) {
    const gy = oceanSampler.sampleGround(car.x, car.z, car.y);
    if (car.y > gy || car.vy !== 0) {
      car.vy -= 22.0 * dt;
      car.y = Math.max(gy, car.y + car.vy * dt);
      if (car.y <= gy) car.vy = 0;
    }
    car.vx *= Math.exp(-4.5 * dt);
    car.vz *= Math.exp(-4.5 * dt);
    car.x += car.vx * dt;
    car.z += car.vz * dt;
    car.mesh.position.set(car.x, car.y, car.z);
    car.mesh.rotation.y = car.yaw;
    return;
  }

  const extMoved = !isPlayer && Math.hypot(car.x - car._lastX, car.z - car._lastZ) > 0.0004;
  const isKinematicAI = !isPlayer && (extMoved || car.aiControlled);

  const fwdX = Math.sin(car.yaw);
  const fwdZ = Math.cos(car.yaw);
  const rightX = -Math.cos(car.yaw);
  const rightZ = Math.sin(car.yaw);

  let vFwd = (car.vx || 0) * fwdX + (car.vz || 0) * fwdZ;
  let vLat = (car.vx || 0) * rightX + (car.vz || 0) * rightZ;
  let yawRate = 0;

  const onBeachSand = car.x < -128 && !(car.z >= -32 && car.z <= 22 && car.y > 1.8);
  const stageMult = 1.0 + (Number(car.mods?.engineStage) || 0) * 0.06;

  if (isKinematicAI) {
    if (extMoved) {
      car.vx = (car.x - car._lastX) / dt;
      car.vz = (car.z - car._lastZ) / dt;
    } else {
      car.vx *= Math.exp(-8 * dt);
      car.vz *= Math.exp(-8 * dt);
    }
    vFwd = car.vx * fwdX + car.vz * fwdZ;
    vLat = car.vx * rightX + car.vz * rightZ;
    yawRate = veWrapAngle(car.yaw - car._lastYaw) / dt;
    car.steerAngle = veDamp(car.steerAngle || 0, veClamp(-yawRate * 0.20, -0.42, 0.42), 10, dt);
    car.isBraking = vFwd < (car._prevVFwd || 0) - 4.0 * dt;
    car.isReversing = vFwd < -0.5;
  } else {
    const gas = isPlayer ? input.throttle : 0;
    const brk = isPlayer ? input.brake : 0;
    const str = isPlayer ? input.steer : 0;
    const hbrk = isPlayer && input.handbrake;
    const bst = isPlayer && input.boost;

    // Manual scissor-door show-off toggle with [X] while parked/slow!
    if (isPlayer && input.doorToggleJust && Math.abs(vFwd) < 4.5) {
      car.manualDoorsOpen = !car.manualDoorsOpen;
      car.doorTargetOpen = car.manualDoorsOpen ? 1.0 : 0.0;
      audioSynth.playScissorDoorServo(car.manualDoorsOpen);
    }

    const focusMult = isPlayer && ctx.player?.specialActive ? 1.55 : 1.0;
    const puncturedMult = car.tiresPopped && !car.mods?.bulletproofTires ? 0.50 : 1.0;

    car.isBraking = false;
    car.isReversing = false;

    const topSpeed = car.maxSpeed * stageMult * (bst ? 1.12 : 1.0) * (onBeachSand ? 0.82 : 1.0);
    if (gas > 0.02) {
      if (vFwd < -1.1) {
        vFwd = Math.min(0, vFwd + 42.0 * gas * dt);
        car.isBraking = true;
      } else {
        const sr = veClamp(Math.abs(vFwd) / topSpeed, 0, 1.18);
        const curve = Math.max(0.15, 1.0 - Math.pow(sr, 1.8) * 0.85);
        vFwd += car.accel * stageMult * gas * (onBeachSand ? 0.84 : 1.0) * curve * dt;
      }
    }

    if (brk > 0.02) {
      if (vFwd > 1.2) {
        // Carbon-ceramic 6-piston hypercar stopping power!
        vFwd = Math.max(0, vFwd - 43.0 * brk * dt);
        car.isBraking = true;
      } else {
        car.isReversing = true;
        const revMax = 15.5;
        if (vFwd > -revMax) vFwd -= 24.0 * brk * dt;
      }
    }

    const drag = (!isPlayer ? 2.4 : 0.36) + (onBeachSand ? 0.9 : 0);
    vFwd *= Math.exp(-drag * dt);
    if (Math.abs(vFwd) < 0.08 && gas < 0.02 && brk < 0.02) vFwd = 0;

    if (hbrk) {
      vFwd *= Math.exp(-1.8 * dt);
      car.isBraking = true;
    }

    car.steerAngle = veDamp(car.steerAngle || 0, str * 0.42, 12.5 * focusMult, dt);

    const absFwd = Math.abs(vFwd);
    const lowSpd = veClamp((absFwd - 0.25) / 3.5, 0, 1);
    const highSpd = 1.0 / (1.0 + absFwd * 0.021);
    const dirSign = vFwd >= -0.15 ? 1 : -1;
    yawRate = -(car.steerAngle / 0.42) * 2.72 * lowSpd * highSpd * dirSign * (hbrk ? 1.32 : 1.0) * focusMult;
    car.yaw = veWrapAngle(car.yaw + yawRate * dt);

    if (hbrk && absFwd > 6.0 && Math.abs(str) > 0.15) {
      vLat += str * 5.4 * dt;
    }

    // Active aerodynamic downforce increases lateral tire grip above 22 m/s!
    const aeroDownforceGrip = 1.0 + veClamp((absFwd - 20.0) / 30.0, 0, 0.22);
    const wetMult = helpers.isWetRoad ? 0.80 : 1.0;
    const latGrip = hbrk
      ? 2.25 * car.def.driftFactor
      : 9.6 * car.def.grip * aeroDownforceGrip * wetMult * puncturedMult * (onBeachSand ? 0.72 : 1.0) * focusMult;
    vLat *= Math.exp(-latGrip * dt);

    const nSin = Math.sin(car.yaw);
    const nCos = Math.cos(car.yaw);
    car.vx = nSin * vFwd - nCos * vLat;
    car.vz = nCos * vFwd + nSin * vLat;

    car.x = veClamp(car.x + car.vx * dt, -500, 440);
    car.z = veClamp(car.z + car.vz * dt, -445, 565);
    car.isDrifting = (Math.abs(vLat) > 3.6 && absFwd > 5.5) || (hbrk && absFwd > 5.8);

    if (isPlayer) {
      if (car.isDrifting && ctx.player && !ctx.player.specialActive && typeof ctx.player.special === 'number') {
        ctx.player.special = Math.min(100, ctx.player.special + 4.2 * dt);
      }
      if (input.hornJust) ctx.audio?.playHorn?.(false);

      const gearProg = (absFwd / Math.max(1, car.maxSpeed)) * 7;
      const rpmNorm = veClamp(0.22 + (gearProg % 1) * 0.68 + gas * 0.10, 0.16, 1.0);
      ctx.audio?.updateEngine?.(absFwd, car.maxSpeed, gas, false, rpmNorm);
    }

    // World AABB Collision
    const col = ctx.world?.resolveCarAABB?.(car);
    if (col && (col === true || col.hit)) {
      const nx = Number.isFinite(col.normalX) ? col.normalX : 0;
      const nz = Number.isFinite(col.normalZ) ? col.normalZ : 0;
      const imp = Number.isFinite(col.impactSpeed) ? col.impactSpeed : Math.hypot(car.vx, car.vz);
      if (nx !== 0 || nz !== 0) {
        const vn = car.vx * nx + car.vz * nz;
        if (vn < 0) {
          car.vx = (car.vx - 1.32 * vn * nx) * 0.78;
          car.vz = (car.vz - 1.32 * vn * nz) * 0.78;
        }
      } else {
        car.vx *= -0.35;
        car.vz *= -0.35;
      }
      if (imp > 6.0) {
        extraFX.spawnSparks(car.x, car.y + 0.42, car.z, 14, 10.0);
        car.hoodBuckle = veClamp((car.hoodBuckle || 0) + imp * 0.015, 0, 1);
        if (car.hoodPanel) car.hoodPanel.rotation.x = -car.hoodBuckle * 0.22;
        if (imp > 11.0) helpers.damageVehicle(car, (imp - 9.0) * 1.05);
        if (isPlayer) {
          ctx.engine?.addShake?.(veClamp(imp * 0.022, 0.1, 0.55));
          ctx.audio?.playCrash?.(veClamp(imp / 30, 0.18, 1.0));
        }
      }
    }
  }

  car.speed = vFwd;
  car.absSpeed = Math.hypot(car.vx, car.vz);

  // Active Hydraulic Rear GT Wing: Deploys above 20 m/s & pitches up as Airbrake on hard braking!
  if (car.activeWingPivot) {
    const deploy = veSmoothstep(16.0, 26.0, car.absSpeed);
    const airbrake = car.isBraking && car.absSpeed > 14.0 ? 1.0 : 0.0;
    const targetWingY = 0.78 + deploy * 0.11;
    const targetWingPitch = airbrake * 0.42 + deploy * 0.08;
    car.activeWingPivot.position.y = veDamp(car.activeWingPivot.position.y, targetWingY, 8.5, dt);
    car.activeWingPivot.rotation.x = veDamp(car.activeWingPivot.rotation.x, targetWingPitch, 10.5, dt);
  }

  // V12 Triple Central Exhaust Blue/Orange Afterburner Flames on Upshifts & Boost!
  if (car.backfireFlames) {
    const curGear = Math.min(7, Math.max(1, Math.ceil((Math.abs(vFwd) / car.maxSpeed) * 7)));
    if (curGear !== car._lastGear && Math.abs(vFwd) > 12.0) {
      car._flameFlashTimer = 0.15;
      if (isPlayer) audioSynth.playExhaustPop();
    }
    car._lastGear = curGear;
    if ((car._flameFlashTimer || 0) > 0) car._flameFlashTimer = Math.max(0, car._flameFlashTimer - dt);

    const flameOn =
      (car._flameFlashTimer || 0) > 0 ||
      (isPlayer && (input.boost || car.mods?.turbo) && input.throttle > 0.75 && Math.abs(vFwd) > 18.0);
    for (let f = 0; f < car.backfireFlames.length; f++) {
      const fg = car.backfireFlames[f];
      fg.visible = flameOn;
      if (flameOn) fg.scale.set(1, 1, 0.8 + Math.random() * 0.65);
    }
  }

  // 4-Wheel Independent Ground Suspension + Low-Slung Stiff Hypercar Roll/Pitch
  const cosY = Math.cos(car.yaw);
  const sinY = Math.sin(car.yaw);
  let sumGround = 0;
  const wheelGrounds = [0, 0, 0, 0];
  for (let wIdx = 0; wIdx < car.wheels.length; wIdx++) {
    const w = car.wheels[wIdx];
    const wx = car.x + w.baseX * cosY + w.baseZ * sinY;
    const wz = car.z - w.baseX * sinY + w.baseZ * cosY;
    const wg = oceanSampler.sampleGround(wx, wz, car.y);
    wheelGrounds[wIdx] = wg;
    sumGround += wg;
  }
  const avgGroundY = sumGround * 0.25;

  if (oceanSampler.isLandVehicleSubmerged(car.x, car.z, avgGroundY)) {
    car.vx *= Math.exp(-3.5 * dt);
    car.vz *= Math.exp(-3.5 * dt);
    if (avgGroundY < -0.78) helpers.damageVehicle(car, 22 * dt);
  }

  const prevG = Number.isFinite(car._prevGroundY) ? car._prevGroundY : avgGroundY;
  const rampRiseVy = prevG > avgGroundY + 1.5 ? 0 : veClamp((avgGroundY - prevG) / Math.max(dt, 0.008), -8, 24);
  car._prevGroundY = avgGroundY;

  if (car.y > avgGroundY + 0.48 || (car.vy || 0) > 2.2) {
    car.vy = (car.vy || 0) - 18.5 * dt;
    car.y += car.vy * dt;
    if (car.y <= avgGroundY) {
      car.y = avgGroundY;
      car.vy = 0;
      car.suspVelY = -1.8;
    }
  } else {
    const gDelta = avgGroundY - car.y;
    car.suspVelY = (car.suspVelY || 0) + (gDelta * 76.0 - (car.suspVelY || 0) * 13.5) * dt;
    car.y += car.suspVelY * dt;
    if (avgGroundY > car.y && avgGroundY - car.y < 2.2) {
      car.y = Math.max(car.y, avgGroundY - 0.10);
    }
    car.vy = rampRiseVy > 1.5 ? rampRiseVy * 0.92 : 0;
  }
  const ceilY = oceanSampler.sampleCeiling(car.x, car.z, car.y);
  if (ceilY !== null && car.y + car.height > ceilY) {
    car.y = Math.max(avgGroundY, ceilY - car.height);
    if (car.suspVelY > 0) car.suspVelY = 0;
    if ((car.vy || 0) > 0) car.vy = 0;
  }

  const longAccel = veClamp(((vFwd - (car._prevVFwd || 0)) / Math.max(dt, 0.008)), -45, 45);
  car._prevVFwd = vFwd;
  const stanceDrop = Number(car.mods?.stanceDrop) || 0;

  car.roll = veDamp(car.roll || 0, veClamp((vFwd * yawRate * 0.0042), -0.085, 0.085), 11, dt);
  car.pitch = veDamp(car.pitch || 0, veClamp(-longAccel * 0.0020, -0.055, 0.065), 11, dt);
  car.chassis.rotation.z = car.roll;
  car.chassis.rotation.x = car.pitch;
  car.chassis.position.y = veClamp((car.y - avgGroundY) * 0.30, -0.06, 0.08) - stanceDrop;

  const spinDelta = (vFwd / car.def.wheelRadius) * dt;
  for (let wIdx = 0; wIdx < car.wheels.length; wIdx++) {
    const w = car.wheels[wIdx];
    if (w.isFront) w.steerPivot.rotation.y = -(car.steerAngle || 0);
    w.spinGroup.rotation.x += spinDelta;
    const localOff = veClamp(wheelGrounds[wIdx] - car.y, -0.10, 0.12);
    w.suspNode.position.y = veDamp(w.suspNode.position.y, w.baseY + localOff, 20, dt);
  }

  if (car.steeringWheelPivot) {
    car.steeringWheelPivot.rotation.z = (car.steerAngle || 0) * 3.0;
  }

  if (car.isDrifting || (isPlayer && input.throttle > 0.85 && Math.abs(vFwd) < 6.5)) {
    car.skidTimer = (car.skidTimer || 0) - dt;
    if (car.skidTimer <= 0) {
      car.skidTimer = 0.04;
      for (const side of [-1, 1]) {
        const rx = car.x + side * car.def.wheelTrack * cosY + car.def.wheelBaseR * sinY;
        const rz = car.z - side * car.def.wheelTrack * sinY + car.def.wheelBaseR * cosY;
        const rg = oceanSampler.sampleGround(rx, rz, car.y);
        extraFX.addSkidmark(rx, rg, rz, car.yaw, 1.2);
        extraFX.spawnPuff(rx, rg + 0.15, rz, -car.vx * 0.12, 0.65, -car.vz * 0.12, 0xe5e9f0, 0.3, 1.25, 0.45);
      }
    }
  }

  helpers.updateLightsAndDamageSmoke(car, dt, isPlayer);

  car.mesh.position.set(car.x, car.y, car.z);
  car.mesh.rotation.y = car.yaw;

  if (isPlayer && ctx.player) {
    ctx.player.x = car.x;
    ctx.player.y = car.y;
    ctx.player.z = car.z;
    ctx.player.yaw = car.yaw;
    ctx.player.vx = car.vx;
    ctx.player.vz = car.vz;
    ctx.player.speed = car.speed;
    syncOpenRiderPose(car, dt, ctx, helpers.isHeadHidden);
  }
}

// ============================================================================
// 7D. RHINO MAIN BATTLE TANK PHYSICS: DUAL DIFFERENTIAL TRACKS, 360° TURRET,
//     120MM CANNON FIRING & RECOIL, AND 800 HP TRAFFIC-CAR CRUSHING!
// ============================================================================

function stepRhinoTankPhysics(car, dt, input, ctx, oceanSampler, extraFX, audioSynth, helpers) {
  const isPlayer = car === ctx.player?.inCar;

  // Tank tracks are immune to police spike strips!
  car.tiresPopped = false;
  car.puncturedTires = false;

  if (car.destroyed) {
    const gy = oceanSampler.sampleGround(car.x, car.z, car.y);
    car.y = veDamp(car.y, gy, 8.0, dt);
    car.vx *= Math.exp(-6.0 * dt);
    car.vz *= Math.exp(-6.0 * dt);
    car.mesh.position.set(car.x, car.y, car.z);
    car.mesh.rotation.y = car.yaw;
    return;
  }

  const fwdX = Math.sin(car.yaw);
  const fwdZ = Math.cos(car.yaw);
  let vFwd = (car.vx || 0) * fwdX + (car.vz || 0) * fwdZ;

  const gas = isPlayer ? input.throttle : 0;
  const brk = isPlayer ? input.brake : 0;
  const str = isPlayer ? input.steer : 0;

  car.isBraking = false;
  car.isReversing = false;

  const topSpeed = car.maxSpeed;
  if (isPlayer) {
    if (gas > 0.02) {
      if (vFwd < -0.5) {
        vFwd = Math.min(0, vFwd + 32.0 * gas * dt);
        car.isBraking = true;
      } else if (vFwd < topSpeed) {
        vFwd = Math.min(topSpeed, vFwd + car.accel * gas * dt);
      }
    }
    if (brk > 0.02) {
      if (vFwd > 0.6) {
        vFwd = Math.max(0, vFwd - 34.0 * brk * dt);
        car.isBraking = true;
      } else {
        car.isReversing = true;
        const revMax = 10.5;
        if (vFwd > -revMax) vFwd -= 18.0 * brk * dt;
      }
    }

    // True Tank Neutral Pivot Steering: rotates hull in place even at 0 m/s!
    const pivotRate = 1.18;
    const dirSign = vFwd < -0.5 ? -1 : 1;
    car.yaw = veWrapAngle(car.yaw - str * pivotRate * dirSign * dt);
    car.steerAngle = str * 0.35;

    const rpmNorm = veClamp(0.28 + (Math.abs(vFwd) / topSpeed) * 0.55 + Math.abs(str) * 0.12 + gas * 0.12, 0.22, 1.0);
    ctx.audio?.updateEngine?.(Math.abs(vFwd), topSpeed, Math.max(gas, Math.abs(str) * 0.6), false, rpmNorm);
  }

  vFwd *= Math.exp((isPlayer ? -0.95 : -4.5) * dt);
  if (Math.abs(vFwd) < 0.06 && gas < 0.02 && brk < 0.02) vFwd = 0;

  const nSin = Math.sin(car.yaw);
  const nCos = Math.cos(car.yaw);
  car.vx = nSin * vFwd;
  car.vz = nCos * vFwd;

  car.x = veClamp(car.x + car.vx * dt, -500, 440);
  car.z = veClamp(car.z + car.vz * dt, -445, 565);

  const col = ctx.world?.resolveCarAABB?.(car);
  if (col && (col === true || col.hit)) {
    car.vx *= -0.2;
    car.vz *= -0.2;
    vFwd *= -0.2;
  }

  car.speed = vFwd;
  car.absSpeed = Math.abs(vFwd);

  // --- Differential Left & Right Tank Track UV Scrolling + 22 Wheel Spin! ---
  const turnTrackDelta = isPlayer ? str * 6.5 : 0;
  const leftTrackLinear = vFwd + turnTrackDelta;
  const rightTrackLinear = vFwd - turnTrackDelta;

  if (car.leftTrackTex) {
    car.leftTrackTex.offset.y = (car.leftTrackTex.offset.y - leftTrackLinear * 0.42 * dt) % 1.0;
  }
  if (car.rightTrackTex) {
    car.rightTrackTex.offset.y = (car.rightTrackTex.offset.y - rightTrackLinear * 0.42 * dt) % 1.0;
  }
  if (car.leftWheels) {
    const lSpin = (leftTrackLinear / 0.36) * dt;
    for (let i = 0; i < car.leftWheels.length; i++) car.leftWheels[i].rotation.x += lSpin;
  }
  if (car.rightWheels) {
    const rSpin = (rightTrackLinear / 0.36) * dt;
    for (let i = 0; i < car.rightWheels.length; i++) car.rightWheels[i].rotation.x += rSpin;
  }

  // --- 360-Degree Mouse-Aimed Rotating Turret + Elevating 120mm Main Cannon! ---
  if ((car.cannonCooldown || 0) > 0) {
    car.cannonCooldown = Math.max(0, car.cannonCooldown - dt);
  }
  if ((car.muzzleFlashTimer || 0) > 0) {
    car.muzzleFlashTimer = Math.max(0, car.muzzleFlashTimer - dt);
  }
  if (car.muzzleFlashGroup) {
    car.muzzleFlashGroup.visible = (car.muzzleFlashTimer || 0) > 0;
  }

  // Hydraulic barrel recoil recuperation slide (-0.48m -> 0.0m)
  car.recoilOffset = veDamp(car.recoilOffset || 0, 0, 6.2, dt);
  if (car.cannonRecoilSlide) {
    car.cannonRecoilSlide.position.z = car.recoilOffset;
  }

  if (isPlayer && ctx.engine?.getAimRay) {
    const ray = ctx.engine.getAimRay();
    if (ray?.dir) {
      const desiredWorldYaw = Math.atan2(ray.dir.x, ray.dir.z);
      const desiredLocalYaw = veWrapAngle(desiredWorldYaw - car.yaw);
      car.turretYaw = veDampAngle(car.turretYaw || 0, desiredLocalYaw, 6.8, dt);

      // Elevation: in Three.js (+Z forward), tilting muzzle UP (+Y) is NEGATIVE rotation.x!
      const rayElevAngle = Math.asin(veClamp(ray.dir.y, -0.35, 0.65));
      const targetCannonRx = veClamp(-rayElevAngle - 0.025, -0.45, 0.16);
      car.cannonPitch = veDamp(car.cannonPitch || 0, targetCannonRx, 8.5, dt);
    }

    // Left-Click / Fire Button -> Fire 120mm High-Explosive Main Cannon Shell!
    const modalBlocked = Boolean(ctx.activeModal || ctx.input?.phoneOpen || ctx.input?.wheelOpen || ctx.paused);
    const wantsFire = Boolean((ctx.input?.fire || input.tankFire) && !modalBlocked);
    if (wantsFire && (car.cannonCooldown || 0) <= 0) {
      car.cannonCooldown = 1.32;
      car.cannonMaxCooldown = 1.32;
      car.recoilOffset = -0.48;
      car.muzzleFlashTimer = 0.085;
      car.recoilHullKick = -0.068;

      car.mesh.updateMatrixWorld(true);
      car.muzzleAnchor.getWorldPosition(_vA);
      car.cannonElevationPivot.getWorldQuaternion(_qA);
      _vB.set(0, 0, 1).applyQuaternion(_qA).normalize();

      extraFX.fireTankShell(_vA.x, _vA.y, _vA.z, _vB.x, _vB.y, _vB.z, car);
      ctx.engine?.addShake?.(0.68);

      // Slight hull recoil shove backward
      const worldTurretYaw = car.yaw + (car.turretYaw || 0);
      car.vx -= Math.sin(worldTurretYaw) * 1.45;
      car.vz -= Math.cos(worldTurretYaw) * 1.45;
    }
  }

  if (car.turretPivot) car.turretPivot.rotation.y = car.turretYaw || 0;
  if (car.cannonElevationPivot) car.cannonElevationPivot.rotation.x = car.cannonPitch || 0;

  // Ground height & heavy torsion-bar hull pitch (including cannon firing recoil rock!)
  const fG = oceanSampler.sampleGround(car.x + 2.6 * nSin, car.z + 2.6 * nCos, car.y);
  const rG = oceanSampler.sampleGround(car.x - 2.6 * nSin, car.z - 2.6 * nCos, car.y);
  const avgG = (fG + rG) * 0.5;
  car.y = veDamp(car.y, avgG, 16.0, dt);

  const longAccel = veClamp(((vFwd - (car._prevVFwd || 0)) / Math.max(dt, 0.008)), -35, 35);
  car._prevVFwd = vFwd;
  car.recoilHullKick = veDamp(car.recoilHullKick || 0, 0, 5.5, dt);

  const terrainPitch = veClamp(Math.atan2(rG - fG, 5.2), -0.35, 0.35);
  car.pitch = veDamp(car.pitch || 0, terrainPitch - longAccel * 0.0022 + (car.recoilHullKick || 0), 8.5, dt);
  car.roll = veDamp(car.roll || 0, 0, 10, dt);
  car.chassis.rotation.x = car.pitch;
  car.chassis.rotation.z = car.roll;

  // Flexible steel radio whip antennas sway with hull acceleration!
  if (car.antennaPivots) {
    const sway = veClamp(longAccel * 0.014, -0.35, 0.35) + Math.sin((ctx.elapsed || 0) * 9.0) * 0.03;
    for (let a = 0; a < car.antennaPivots.length; a++) {
      car.antennaPivots[a].rotation.x = veDamp(car.antennaPivots[a].rotation.x, sway, 7.0, dt);
    }
  }

  // --- 800 HP / 18.5-Mass Traffic-Car Crushing Under Treads! ---
  const allCars = ctx.vehicles?.list || [];
  for (let i = 0; i < allCars.length; i++) {
    const victim = allCars[i];
    if (!victim || victim === car || victim.isHeli || victim.isBoat || victim.isTank) continue;
    if (Math.abs((victim.y || 0) - car.y) > 2.2) continue;

    const dx = victim.x - car.x;
    const dz = victim.z - car.z;
    const crushDist = (car.width + (victim.width || 2.0)) * 0.50 + 0.55;
    const d2 = dx * dx + dz * dz;
    if (d2 >= crushDist * crushDist || d2 < 0.0001) continue;

    const dist = Math.sqrt(d2);
    const nx = dx / dist;
    const nz = dz / dist;
    const overlap = crushDist - dist;

    // Passive separation when parked/idle; active car-crushing ONLY when player is driving >= 1.2 m/s!
    victim.x += nx * overlap * 0.96;
    victim.z += nz * overlap * 0.96;

    if (isPlayer && car.absSpeed >= 1.2) {
      victim.vx = (victim.vx || 0) * 0.3 + car.vx * 1.15 + nx * 5.2;
      victim.vz = (victim.vz || 0) * 0.3 + car.vz * 1.15 + nz * 5.2;

      if (victim.chassis) {
        const curCrush = victim._tankCrushScale ?? 1.0;
        victim._tankCrushScale = Math.max(0.54, curCrush - (0.65 + car.absSpeed * 0.08) * dt);
        victim.chassis.scale.y = victim._tankCrushScale;
      }
      victim.dentFront = 1.0;
      victim.dentRear = 1.0;
      victim.hoodBuckle = 1.0;

      extraFX.spawnSparks((car.x + victim.x) * 0.5, victim.y + 0.55, (car.z + victim.z) * 0.5, 8, 9.5);

      if (!victim.destroyed) {
        const crushDmg = (55 + car.absSpeed * 9.5) * dt * 5.5;
        helpers.damageVehicle(victim, crushDmg, ctx.player);
        if ((car._crushSoundCd || 0) <= 0) {
          car._crushSoundCd = 0.28;
          ctx.audio?.playCrash?.(0.75);
          ctx.engine?.addShake?.(0.22);
        }
      }
    } else {
      victim.vx = (victim.vx || 0) * 0.4 + nx * 1.5;
      victim.vz = (victim.vz || 0) * 0.4 + nz * 1.5;
    }
    if (victim.mesh) victim.mesh.position.set(victim.x, victim.y, victim.z);
  }
  if ((car._crushSoundCd || 0) > 0) car._crushSoundCd = Math.max(0, car._crushSoundCd - dt);

  helpers.updateLightsAndDamageSmoke(car, dt, isPlayer);

  car.mesh.position.set(car.x, car.y, car.z);
  car.mesh.rotation.y = car.yaw;

  if (isPlayer && ctx.player) {
    ctx.player.x = car.x;
    ctx.player.y = car.y;
    ctx.player.z = car.z;
    ctx.player.yaw = car.yaw;
    ctx.player.vx = car.vx;
    ctx.player.vz = car.vz;
    ctx.player.speed = car.speed;
    syncOpenRiderPose(car, dt, ctx, helpers.isHeadHidden);
  }
}

// ============================================================================
// 7E. FIXED-WING EXECUTIVE JET PHYSICS: BUCKINGHAM LUXOR ('luxor_jet')
//     W/S/A/D Ground Taxi, Liftoff >= 23 m/s, Space Climb / S-Ctrl Dive &
//     Airbrake Landing, Banking Roll + Yaw, 72 m/s Afterburners & Contrails!
// ============================================================================

function stepLuxorJetPhysics(car, dt, input, ctx, oceanSampler, extraFX, audioSynth, helpers) {
  const isPlayer = car === ctx.player?.inCar;

  const groundY = oceanSampler.sampleGround(car.x, car.z, car.y);
  const ceilY = oceanSampler.sampleCeiling(car.x, car.z, car.y);

  if (car.destroyed) {
    if (car.y > groundY || (car.vy || 0) !== 0) {
      car.vy = (car.vy || 0) - 20.0 * dt;
      car.y = Math.max(groundY, car.y + car.vy * dt);
      if (car.y <= groundY) car.vy = 0;
    }
    car.vx *= Math.exp(-3.2 * dt);
    car.vz *= Math.exp(-3.2 * dt);
    car.x += car.vx * dt;
    car.z += car.vz * dt;
    car.mesh.position.set(car.x, car.y, car.z);
    car.mesh.rotation.y = car.yaw;
    return;
  }

  const agl = (car.y || 0) - groundY;
  const airborne = agl > 0.36;

  const gas = isPlayer ? input.throttle : 0;
  const brk = isPlayer ? input.brake : 0;
  const str = isPlayer ? input.steer : 0;
  const bst = isPlayer && input.boost;
  const pitchUpInput = isPlayer ? (input.jetPitchUp ? 1 : 0) : 0;
  const pitchDownInput = isPlayer ? (input.jetPitchDown ? 1 : 0) : 0;

  car.isBraking = brk > 0.1 && !airborne;
  car.isReversing = false;

  const fwdX = Math.sin(car.yaw);
  const fwdZ = Math.cos(car.yaw);
  let vFwd = (car.vx || 0) * fwdX + (car.vz || 0) * fwdZ;

  const maxAirspeed = car.maxSpeed || 72.0;
  const maxCruiseNoBoost = maxAirspeed * 0.84;
  const liftoffSpd = car.def.liftoffSpeed || 23.0;

  if (!airborne) {
    // --- Ground Taxiing & Runway Acceleration Roll ---
    const targetTop = bst ? maxAirspeed : maxCruiseNoBoost;
    if (gas > 0.02) {
      if (vFwd < -0.8) {
        vFwd = Math.min(0, vFwd + 28.0 * gas * dt);
        car.isBraking = true;
      } else {
        const boostThrust = bst ? 1.32 : 1.0;
        const sr = veClamp(vFwd / targetTop, 0, 1.15);
        const curve = Math.max(0.22, 1.0 - Math.pow(sr, 2.0) * 0.78);
        vFwd += car.accel * boostThrust * gas * curve * dt;
      }
    }

    if (brk > 0.02) {
      if (vFwd > 1.0) {
        vFwd = Math.max(0, vFwd - 29.0 * brk * dt);
        car.isBraking = true;
      } else {
        car.isReversing = true;
        if (vFwd > -9.5) vFwd -= 12.5 * brk * dt;
      }
    }

    const taxiDrag = !isPlayer ? 2.6 : (gas < 0.02 ? 0.55 : 0.16);
    vFwd *= Math.exp(-taxiDrag * dt);
    if (Math.abs(vFwd) < 0.06 && gas < 0.02 && brk < 0.02) vFwd = 0;

    const steerTaper = 1.0 / (1.0 + Math.abs(vFwd) * 0.045);
    car.steerAngle = veDamp(car.steerAngle || 0, str * 0.44 * steerTaper, 9.5, dt);
    const lowRamp = veClamp(Math.abs(vFwd) / 2.2, 0, 1);
    const dirSign = vFwd >= -0.2 ? 1 : -1;
    car.yaw = veWrapAngle(car.yaw - (car.steerAngle / 0.44) * 1.65 * lowRamp * dirSign * dt);

    const nSin = Math.sin(car.yaw);
    const nCos = Math.cos(car.yaw);
    car.vx = nSin * vFwd;
    car.vz = nCos * vFwd;

    const underHangarRoof = ceilY !== null && ceilY < groundY + 18.0;
    const wantsLiftoff = !underHangarRoof && (
      (vFwd >= liftoffSpd && pitchUpInput > 0) ||
      (vFwd >= liftoffSpd + 3.8 && gas > 0.5 && pitchDownInput === 0 && brk < 0.1)
    );

    const rotReadyFrac = veClamp((vFwd - (liftoffSpd - 5.0)) / 8.0, 0, 1);
    const groundTargetPitch = !underHangarRoof && pitchUpInput > 0 ? -0.22 * rotReadyFrac : 0;
    car.pitch = veDamp(car.pitch || 0, groundTargetPitch, 6.5, dt);
    car.roll = veDamp(car.roll || 0, 0, 9.0, dt);

    if (wantsLiftoff) {
      const climbBoost = pitchUpInput > 0 ? 7.8 : 4.2;
      car.vy = Math.max(car.vy || 0, climbBoost);
      car.y = groundY + 0.42;
      car.pitch = Math.min(car.pitch, -0.16);
    } else {
      car.y = veDamp(car.y, groundY, 18.0, dt);
      car.vy = 0;
    }
  } else {
    // --- Buttery-Smooth 3D Fixed-Wing Flight Envelope (Airborne!) ---
    if (isPlayer) {
      const targetMaxSpd = bst ? maxAirspeed : maxCruiseNoBoost;
      if (gas > 0.02) {
        const boostMult = bst ? 1.36 : 1.0;
        vFwd = Math.min(targetMaxSpd, vFwd + car.accel * 0.92 * boostMult * gas * dt);
      } else {
        vFwd *= Math.exp(-0.14 * dt);
      }

      if (brk > 0.02) {
        vFwd = Math.max(15.5, vFwd - 21.0 * brk * dt);
      }

      let targetFlightPitch = -0.025;
      if (pitchUpInput > 0) {
        targetFlightPitch = -0.48;
      } else if (pitchDownInput > 0) {
        targetFlightPitch = 0.42;
      } else if (brk > 0.25 && gas < 0.2) {
        targetFlightPitch = 0.18;
      }
      car.pitch = veDamp(car.pitch || 0, targetFlightPitch, 4.6, dt);

      const maxBank = 0.72;
      const targetBank = str * maxBank;
      car.roll = veDamp(car.roll || 0, targetBank, 5.2, dt);
      car.steerAngle = veDamp(car.steerAngle || 0, str * 0.38, 8.0, dt);

      const bankTurnRate = (car.roll / maxBank) * 1.18 + str * 0.34;
      car.yaw = veWrapAngle(car.yaw - bankTurnRate * dt);
    } else {
      vFwd *= Math.exp(-0.35 * dt);
      car.pitch = veDamp(car.pitch || 0, 0.24, 2.5, dt);
      car.roll = veDamp(car.roll || 0, 0, 2.5, dt);
    }

    const noseUpAngle = -(car.pitch || 0);
    const liftFactor = veClamp((vFwd - 14.0) / (liftoffSpd - 14.0), 0, 1.15);
    const stallSink = liftFactor < 0.92 ? -(1.0 - liftFactor) * 15.5 : 0;
    const desiredVy = Math.sin(noseUpAngle) * vFwd * 0.88 * Math.min(1.0, liftFactor) + stallSink;
    car.vy = veDamp(car.vy || 0, desiredVy, 5.4, dt);

    const horizCos = Math.cos(noseUpAngle * 0.65);
    const nSin = Math.sin(car.yaw);
    const nCos = Math.cos(car.yaw);
    car.vx = nSin * vFwd * horizCos;
    car.vz = nCos * vFwd * horizCos;

    car.y = veClamp(car.y + car.vy * dt, groundY, 340.0);

    if (car.y <= groundY + 0.04) {
      const sinkRate = Math.abs(car.vy || 0);
      car.y = groundY;
      car.vy = 0;
      car.roll *= 0.35;
      car.pitch *= 0.35;
      if (sinkRate > 16.5) {
        helpers.damageVehicle(car, (sinkRate - 14.0) * 6.5, isPlayer ? ctx.player : null);
      } else if (isPlayer && sinkRate > 2.5) {
        ctx.engine?.addShake?.(veClamp(sinkRate * 0.025, 0.06, 0.28));
      }
    }
  }

  const xMin = airborne ? -780 : -500;
  const xMax = airborne ? 620 : 440;
  const zMin = airborne ? -620 : -445;
  const zMax = airborne ? 760 : 565;
  car.x = veClamp(car.x + car.vx * dt, xMin, xMax);
  car.z = veClamp(car.z + car.vz * dt, zMin, zMax);

  if (ceilY !== null && car.y + car.height > ceilY) {
    car.y = Math.max(groundY, ceilY - car.height);
    if ((car.vy || 0) > 0) car.vy = 0;
  }

  if (car.y < 125.0) {
    const col = ctx.world?.resolveCarAABB?.(car);
    if (col && (col === true || col.hit)) {
      const imp = col.impactSpeed ?? Math.hypot(car.vx, car.vz);
      car.vx *= -0.3;
      car.vz *= -0.3;
      vFwd *= 0.25;
      if (imp > 12.0) {
        extraFX.spawnSparks(car.x, car.y + 1.5, car.z, 18, 12.0);
        helpers.damageVehicle(car, (imp - 10.0) * 2.2, isPlayer ? ctx.player : null);
      }
    }
  }

  car.speed = vFwd;
  car.absSpeed = Math.hypot(car.vx, car.vz);

  const n1Rpm = isPlayer ? veClamp(0.32 + gas * 0.52 + (bst ? 0.16 : 0), 0.3, 1.0) : 0.08;
  const fanDelta = n1Rpm * 46.0 * dt;
  if (car.fanRotorL) car.fanRotorL.rotation.z += fanDelta;
  if (car.fanRotorR) car.fanRotorR.rotation.z -= fanDelta;

  if (isPlayer) {
    ctx.audio?.updateEngine?.(car.absSpeed, maxAirspeed, gas + (bst ? 0.25 : 0), true, n1Rpm);
    if (input.hornJust) ctx.audio?.playHorn?.(false);
  }

  if (car.backfireFlames) {
    const showBurners = isPlayer && (gas > 0.35 || bst);
    const burnerLen = bst ? 1.45 + Math.random() * 0.35 : 0.65 + gas * 0.55 + Math.random() * 0.18;
    for (let i = 0; i < car.backfireFlames.length; i++) {
      const fg = car.backfireFlames[i];
      fg.visible = showBurners && !car.destroyed;
      if (fg.visible) fg.scale.set(1, 1, burnerLen);
    }
  }

  if (car.aileronL && car.aileronR) {
    car.aileronL.rotation.x = str * 0.36;
    car.aileronR.rotation.x = -str * 0.36;
  }
  if (car.elevatorPivot) {
    car.elevatorPivot.rotation.x = -(car.pitch || 0) * 0.85;
  }
  if (car.rudderPivot) {
    car.rudderPivot.rotation.y = str * 0.38;
  }
  if (car.steeringWheelPivot) {
    car.steeringWheelPivot.rotation.z = str * 0.75;
    car.steeringWheelPivot.position.z = 4.64 + veClamp(-(car.pitch || 0) * 0.16, -0.08, 0.08);
  }

  const wantGearDown = agl < 11.5 || car.absSpeed < 26.0;
  car.gearDeployFrac = veDamp(car.gearDeployFrac ?? 1.0, wantGearDown ? 1.0 : 0.0, 3.8, dt);
  if (car.noseSuspNode) {
    car.noseSuspNode.rotation.x = -(1.0 - car.gearDeployFrac) * 1.48;
    car.noseSuspNode.visible = car.gearDeployFrac > 0.04;
  }
  if (car.mainGearPivots) {
    for (let i = 0; i < car.mainGearPivots.length; i++) {
      const mg = car.mainGearPivots[i];
      mg.node.rotation.z = mg.side * (1.0 - car.gearDeployFrac) * 1.45;
      mg.node.visible = car.gearDeployFrac > 0.04;
    }
  }

  if (!airborne && car.wheels) {
    const wSpin = (vFwd / 0.36) * dt;
    for (let i = 0; i < car.wheels.length; i++) {
      const w = car.wheels[i];
      if (w.isFront) w.steerPivot.rotation.y = -(car.steerAngle || 0);
      w.spinGroup.rotation.x += wSpin;
    }
  }

  if (airborne && car.absSpeed > 31.0 && car.wingtipLeftAnchor && car.wingtipRightAnchor) {
    car._contrailTimer = (car._contrailTimer || 0) - dt;
    if (car._contrailTimer <= 0) {
      car._contrailTimer = 0.026;
      car.chassis.updateMatrixWorld(true);
      const contrailAlphaScale = veClamp((car.absSpeed - 30.0) / 35.0, 0.25, 1.0);
      for (const tip of [car.wingtipLeftAnchor, car.wingtipRightAnchor]) {
        tip.getWorldPosition(_vA);
        extraFX.spawnPuff(
          _vA.x,
          _vA.y,
          _vA.z,
          -car.vx * 0.06,
          0.08,
          -car.vz * 0.06,
          0xf8fafc,
          0.20 * contrailAlphaScale,
          0.92 * contrailAlphaScale,
          0.68
        );
      }
    }
  }

  car.chassis.rotation.x = car.pitch || 0;
  car.chassis.rotation.z = car.roll || 0;

  helpers.updateLightsAndDamageSmoke(car, dt, isPlayer);

  car.mesh.position.set(car.x, car.y, car.z);
  car.mesh.rotation.y = car.yaw;

  if (isPlayer && ctx.player) {
    ctx.player.x = car.x;
    ctx.player.y = car.y;
    ctx.player.z = car.z;
    ctx.player.yaw = car.yaw;
    ctx.player.vx = car.vx;
    ctx.player.vy = car.vy;
    ctx.player.vz = car.vz;
    ctx.player.speed = car.speed;
    syncOpenRiderPose(car, dt, ctx, helpers.isHeadHidden);
  }
}

// ============================================================================
// 8. FIRST-PERSON COCKPIT / HOOD CAMERA & LIVE Giang Hồ ANALOG + DIGITAL
//    INSTRUMENT CLUSTER HUD (`toggleCockpitView` — Bound to `K` & Cam Cycle)
// ============================================================================

function createCockpitCameraAndHUD(ctx) {
  let cockpitActive = false;
  let lastToggleMs = -1000;
  let headCurrentlyHidden = false;
  let hiddenRigRef = null;

  // Freelook offsets inside cabin
  let lookYawOffset = 0;
  let lookPitchOffset = 0;
  let freelookIdleTimer = 0;

  // Smoothed instrument needle & telemetry state
  const gaugeState = {
    rpmNorm: 0.18,
    displayKmh: 0,
    gearLabel: 'N',
    prevGearLabel: 'N',
    gearShiftPulse: 0,
    boostPsi: -6.0,
    tripKm: 0.0,
    gForceLon: 0,
    prevSpeed: 0,
    redlineBlink: 0
  };

  // Dynamic DOM HUD Elements (using direct references + explicit `.id = ...` for bundler audit!)
  let hudContainer = null;
  let clusterCanvas = null;
  let clusterCtx = null;
  let tankReticleEl = null;

  function ensureCockpitDOM() {
    if (hudContainer || typeof document === 'undefined') return;

    hudContainer = document.createElement('div');
    hudContainer.id = 've-cockpit-hud-root';
    hudContainer.style.cssText = [
      'position:fixed',
      'inset:0',
      'pointer-events:none',
      'z-index:26',
      'display:none',
      'user-select:none'
    ].join(';');

    clusterCanvas = document.createElement('canvas');
    clusterCanvas.id = 've-cockpit-cluster-canvas';
    clusterCanvas.width = 1040;
    clusterCanvas.height = 356;
    clusterCanvas.style.cssText = [
      'position:absolute',
      'bottom:12px',
      'left:50%',
      'transform:translateX(-50%)',
      'width:min(520px, 76vw)',
      'height:auto',
      'aspect-ratio:1040 / 356',
      'filter:drop-shadow(0 10px 24px rgba(0,0,0,0.72))'
    ].join(';');
    clusterCtx = clusterCanvas.getContext('2d');
    hudContainer.appendChild(clusterCanvas);

    // Dedicated Military FLIR / Gunner Crosshair Reticle when driving Huyền Vũ Thiết Giáp!
    tankReticleEl = document.createElement('canvas');
    tankReticleEl.id = 've-rhino-tank-reticle';
    tankReticleEl.width = 320;
    tankReticleEl.height = 320;
    tankReticleEl.style.cssText = [
      'position:absolute',
      'top:50%',
      'left:50%',
      'transform:translate(-50%, -50%)',
      'width:160px',
      'height:160px',
      'display:none'
    ].join(';');
    hudContainer.appendChild(tankReticleEl);

    document.body.appendChild(hudContainer);
  }

  function setPlayerHeadVisible(activeCtx, vis) {
    const player = activeCtx?.player;
    const rig = player?.rig || player?.mesh;

    if (vis) {
      if (hiddenRigRef) {
        if (hiddenRigRef.joints?.head) hiddenRigRef.joints.head.visible = true;
        if (hiddenRigRef.detailGroup) hiddenRigRef.detailGroup.visible = hiddenRigRef._detailVis !== false;
        hiddenRigRef = null;
      }
      if (rig?.joints?.head) rig.joints.head.visible = true;
      if (rig?.detailGroup) rig.detailGroup.visible = rig._detailVis !== false;
      headCurrentlyHidden = false;
      return;
    }

    if (hiddenRigRef && hiddenRigRef !== rig) {
      if (hiddenRigRef.joints?.head) hiddenRigRef.joints.head.visible = true;
      if (hiddenRigRef.detailGroup) hiddenRigRef.detailGroup.visible = hiddenRigRef._detailVis !== false;
    }
    if (rig?.joints?.head) {
      rig.joints.head.visible = false;
      if (rig.detailGroup) rig.detailGroup.visible = false;
      hiddenRigRef = rig;
      headCurrentlyHidden = true;
    }
  }

  function toggleCockpitView(forceBool) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (typeof forceBool === 'boolean') {
      cockpitActive = forceBool;
      lastToggleMs = now;
    } else {
      if (now - lastToggleMs < 95) return cockpitActive;
      lastToggleMs = now;
      cockpitActive = !cockpitActive;
    }

    lookYawOffset = 0;
    lookPitchOffset = 0;

    if (!cockpitActive) {
      setPlayerHeadVisible(ctx, true);
      if (hudContainer) hudContainer.style.display = 'none';
    } else {
      ensureCockpitDOM();
    }

    const msg = cockpitActive
      ? 'GÓC NHÌN BUỒNG LÁI (COCKPIT VIEW — ĐỒNG HỒ TUA MÁY LIVE)'
      : 'GÓC NHÌN ĐUỔI THEO XE (THIRD-PERSON CHASE CAM)';
    if (ctx?.player?.inCar) {
      if (typeof ctx.ui?.showVehicleCallout === 'function') ctx.ui.showVehicleCallout(msg);
      else if (typeof ctx.ui?.showToast === 'function') ctx.ui.showToast(msg);
    }
    return cockpitActive;
  }

  function isCockpitView() {
    return Boolean(cockpitActive);
  }

  // Computes eye-level world position & orientation inside any of the 14 vehicles!
  function updateCockpitCamera(rawDt, activeCtx) {
    const c = activeCtx || ctx;
    const camera = c?.engine?.camera;
    const player = c?.player;
    const car = player?.inCar;
    if (!camera || !player || !car) {
      setPlayerHeadVisible(c, true);
      return false;
    }

    const dt = veClamp(Number(rawDt) || 0.016, 0.0005, 0.1);
    const inp = c.input || {};

    // Hide player head mesh cleanly so nothing ever clips into the near plane!
    setPlayerHeadVisible(c, false);

    // Consume mouse / touch camera deltas for inside-cabin freelook (or 360° turret aim in Huyền Vũ Thiết Giáp!)
    const dx = Number(inp.camDeltaX) || 0;
    const dy = Number(inp.camDeltaY) || 0;
    if ('camDeltaX' in inp || 'camDeltaY' in inp) {
      inp.camDeltaX = 0;
      inp.camDeltaY = 0;
    }

    const cfg = COCKPIT_EYE_CONFIGS[car.type] || COCKPIT_EYE_CONFIGS[car.archetype] || COCKPIT_EYE_CONFIGS.sedan_lux;

    if (cfg.useTurret && car.turretPivot) {
      // Huyền Vũ Thiết Giáp Gunner/Commander Optics: mouse directly rotates turret azimuth & barrel elevation!
      lookYawOffset = veWrapAngle(lookYawOffset - dx * 0.0026);
      lookPitchOffset = veClamp(lookPitchOffset - dy * 0.0022, -0.28, 0.42);
    } else {
      if (Math.abs(dx) > 1e-5 || Math.abs(dy) > 1e-5) {
        lookYawOffset = veClamp(lookYawOffset - dx * 0.0025, -1.45, 1.45);
        lookPitchOffset = veClamp(lookPitchOffset - dy * 0.0020, -0.52, 0.52);
        freelookIdleTimer = 1.45;
      } else if (freelookIdleTimer > 0) {
        freelookIdleTimer = Math.max(0, freelookIdleTimer - dt);
      } else {
        // Gently recenter driver gaze forward along the road/waves!
        const steerPeek = -(car.steerAngle || 0) * (car.isMotorcycle ? 0.55 : 0.32);
        lookYawOffset = veDamp(lookYawOffset, steerPeek, 4.2, dt);
        lookPitchOffset = veDamp(lookPitchOffset, 0, 4.2, dt);
      }
    }

    const lookBehind = Boolean(inp.lookBehind);

    // Ensure world matrices of root -> leanPivot -> wheeliePivot -> chassis -> turretPivot are fresh
    if (car.mesh) car.mesh.updateMatrixWorld(true);

    // Compute world eye position
    const spd = Number(car.absSpeed) || Math.hypot(car.vx || 0, car.vz || 0);
    const gBobZ = veClamp(-gaugeState.gForceLon * 0.0035, -0.055, 0.045);
    const roadVibY = spd > 4.0 ? Math.sin((c.elapsed || 0) * 34.0) * veClamp(spd / 2200, 0, 0.008) : 0;

    if (cfg.useTurret && car.turretPivot) {
      // Anchored on rotating turret roof optics overlooking the 120mm barrel!
      _vA.set(0.0, 0.96 + roadVibY, 0.65);
      car.turretPivot.localToWorld(_vA);
      camera.position.copy(_vA);

      const worldAimYaw = car.yaw + (car.turretYaw || 0) + (lookBehind ? Math.PI : lookYawOffset * 0.15);
      const worldAimPitch = -(car.cannonPitch || 0) + cfg.lookDown + lookPitchOffset * 0.25;
      // Note: car.yaw uses sin(yaw) along +X and cos(yaw) along +Z, whereas Three.js camera -Z forward has yaw = Math.PI - carYaw!
      const threeCamYaw = veWrapAngle(Math.PI - worldAimYaw);
      _eulA.set(worldAimPitch, threeCamYaw, -(car.roll || 0) * 0.4, 'YXZ');
      camera.quaternion.setFromEuler(_eulA);
      // Let mouse delta steer tank aim ray smoothly
      if (Math.abs(dx) > 1e-5 || Math.abs(dy) > 1e-5) {
        car.turretYaw = veWrapAngle((car.turretYaw || 0) - dx * 0.0026);
        car.cannonPitch = veClamp((car.cannonPitch || 0) + dy * 0.0022, -0.45, 0.16);
        lookYawOffset = 0;
        lookPitchOffset = 0;
      }
    } else {
      const anchorNode = car.chassis || car.mesh;
      _vA.set(cfg.x, cfg.y + roadVibY, cfg.z + gBobZ);
      anchorNode.localToWorld(_vA);
      camera.position.copy(_vA);

      // Base vehicle forward yaw (`fwd = (sin(yaw), 0, cos(yaw))` -> Three.js camera yaw = `PI - car.yaw`)
      const baseThreeYaw = veWrapAngle(Math.PI - (car.yaw || 0));
      const finalYaw = lookBehind
        ? veWrapAngle(baseThreeYaw + Math.PI)
        : veWrapAngle(baseThreeYaw + lookYawOffset);

      // Pitch: in vehicle chassis, nose-up wheelie is negative `car.pitch` (-0.52 rad);
      // in Three.js camera Euler ('YXZ'), looking UP is POSITIVE `rotation.x`, so `-car.pitch` pitches gaze UP with wheelies!
      const vehPitch = -(car.pitch || 0) * (cfg.pitchFollow ?? 0.85);
      const finalPitch = lookBehind ? -0.05 : veClamp(vehPitch + cfg.lookDown + lookPitchOffset, -0.85, 0.88);

      // Roll: in vehicle chassis, motorcycle right lean is `+car.roll` (+0.58 rad);
      // in Three.js camera looking along `-Z` (rotated 180° around Y from `+Z`), banking right is `-rotation.z`!
      const vehBankRoll = lookBehind ? 0 : -(car.roll || 0) * (cfg.leanFollow ?? 0.82);

      _eulA.set(finalPitch, finalYaw, vehBankRoll, 'YXZ');
      camera.quaternion.setFromEuler(_eulA);
    }

    // Subtle speed-reactive FOV boost in Góc Nhìn Buồng Lái
    const targetFov = cfg.fov + veClamp((spd - 10) / 38, 0, 1) * 7.5;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov = veDamp(camera.fov, targetFov, 8.0, dt);
      camera.updateProjectionMatrix();
    }
    camera.near = 0.08; // Tight near-plane so handlebars, steering wheel & windshield pillars never clip!
    camera.updateMatrixWorld(true);
    return true;
  }

  // --------------------------------------------------------------------------
  // HIGH-DPI CANVAS Giang Hồ ANALOG + DIGITAL DASHBOARD INSTRUMENT CLUSTER
  // --------------------------------------------------------------------------
  function drawArcGauge(g, cx, cy, radius, startAng, endAng, frac, colorHex, glowHex, lineW) {
    g.save();
    g.beginPath();
    g.arc(cx, cy, radius, startAng, endAng, false);
    g.strokeStyle = 'rgba(148, 163, 184, 0.18)';
    g.lineWidth = lineW;
    g.lineCap = 'round';
    g.stroke();

    const curEnd = veLerp(startAng, endAng, veClamp(frac, 0, 1));
    if (frac > 0.005) {
      g.beginPath();
      g.arc(cx, cy, radius, startAng, curEnd, false);
      g.strokeStyle = colorHex;
      g.shadowColor = glowHex || colorHex;
      g.shadowBlur = 14;
      g.lineWidth = lineW;
      g.lineCap = 'round';
      g.stroke();
    }
    g.restore();
  }

  function drawIlluminatedNeedle(g, cx, cy, length, innerOffset, angleRad, colorHex) {
    g.save();
    g.translate(cx, cy);
    g.rotate(angleRad);
    g.shadowColor = colorHex;
    g.shadowBlur = 16;
    g.fillStyle = colorHex;
    g.beginPath();
    g.moveTo(innerOffset, -3.5);
    g.lineTo(length, -1.2);
    g.lineTo(length, 1.2);
    g.lineTo(innerOffset, 3.5);
    g.closePath();
    g.fill();

    // Brushed aluminum center cap
    g.shadowBlur = 0;
    g.beginPath();
    g.arc(0, 0, 13, 0, Math.PI * 2);
    g.fillStyle = '#1e293b';
    g.fill();
    g.lineWidth = 2.5;
    g.strokeStyle = '#94a3b8';
    g.stroke();
    g.restore();
  }

  function renderTankGunnerReticle(car, dt) {
    if (!tankReticleEl) return;
    const show = Boolean(ctx?.player?.inCar === car && car?.isTank && !ctx?.activeModal && !ctx?.paused);
    if (!show) {
      if (tankReticleEl.style.display !== 'none') tankReticleEl.style.display = 'none';
      return;
    }
    if (tankReticleEl.style.display !== 'block') tankReticleEl.style.display = 'block';

    const g = tankReticleEl.getContext('2d');
    const w = 320;
    const h = 320;
    g.clearRect(0, 0, w, h);

    const ready = (car.cannonCooldown || 0) <= 0.01;
    const reloadFrac = ready ? 1.0 : 1.0 - veClamp((car.cannonCooldown || 0) / (car.cannonMaxCooldown || 1.32), 0, 1);
    const col = ready ? '#4ade80' : '#f59e0b';

    g.strokeStyle = col;
    g.lineWidth = 2;
    g.shadowColor = col;
    g.shadowBlur = 8;

    // Outer ballistic stadia brackets
    const b = 52;
    const len = 24;
    g.beginPath();
    g.moveTo(b, b + len); g.lineTo(b, b); g.lineTo(b + len, b);
    g.moveTo(w - b - len, b); g.lineTo(w - b, b); g.lineTo(w - b, b + len);
    g.moveTo(b, h - b - len); g.lineTo(b, h - b); g.lineTo(b + len, h - b);
    g.moveTo(w - b - len, h - b); g.lineTo(w - b, h - b); g.lineTo(w - b, h - b - len);
    g.stroke();

    // Central chevron & ballistic drop ticks
    g.beginPath();
    g.moveTo(152, 166); g.lineTo(160, 158); g.lineTo(168, 166);
    g.moveTo(118, 160); g.lineTo(144, 160);
    g.moveTo(176, 160); g.lineTo(202, 160);
    for (let drop = 1; drop <= 3; drop++) {
      const dy = 160 + drop * 16;
      const hw = 10 - drop * 2;
      g.moveTo(160 - hw, dy);
      g.lineTo(160 + hw, dy);
    }
    g.stroke();

    // Circular reload arc
    g.beginPath();
    g.arc(160, 160, 74, -Math.PI * 0.5, -Math.PI * 0.5 + reloadFrac * Math.PI * 2, false);
    g.lineWidth = 3;
    g.stroke();

    g.shadowBlur = 0;
    g.fillStyle = col;
    g.font = 'bold 14px monospace';
    g.textAlign = 'center';
    g.fillText(ready ? '120MM HE • SẴN SÀNG' : `NẠP ĐẠN ${(car.cannonCooldown || 0).toFixed(1)}s`, 160, 258);
  }

  function updateDashboardHUD(rawDt, activeCtx) {
    const c = activeCtx || ctx;
    const dt = veClamp(Number(rawDt) || 0.016, 0.001, 0.1);
    const player = c?.player;
    const car = player?.inCar;

    if (!car) {
      if (headCurrentlyHidden) setPlayerHeadVisible(c, true);
      if (hudContainer && hudContainer.style.display !== 'none') hudContainer.style.display = 'none';
      return;
    }

    ensureCockpitDOM();

    // Render Tank reticle whenever player is driving Huyền Vũ Thiết Giáp (both 1st and 3rd person!)
    if (car.isTank) {
      renderTankGunnerReticle(car, dt);
    } else if (tankReticleEl && tankReticleEl.style.display !== 'none') {
      tankReticleEl.style.display = 'none';
    }

    const hideOverlay = Boolean(!cockpitActive || c.activeModal || c.paused || player.isDead);
    if (hideOverlay) {
      if (!cockpitActive && headCurrentlyHidden) setPlayerHeadVisible(c, true);
      if (hudContainer && !car.isTank && hudContainer.style.display !== 'none') {
        hudContainer.style.display = 'none';
      } else if (hudContainer && car.isTank) {
        hudContainer.style.display = !c.activeModal && !c.paused ? 'block' : 'none';
        if (clusterCanvas) clusterCanvas.style.display = 'none';
      }
      return;
    }

    if (hudContainer.style.display !== 'block') hudContainer.style.display = 'block';
    if (clusterCanvas.style.display !== 'block') clusterCanvas.style.display = 'block';

    // --- Compute Live Vehicle Telemetry ---
    const fwdSpd = Number(car.speed) || 0;
    const absSpd = Number.isFinite(car.absSpeed) ? car.absSpeed : Math.hypot(car.vx || 0, car.vz || 0);
    const kmh = absSpd * 3.6;
    gaugeState.displayKmh = veDamp(gaugeState.displayKmh, kmh, 14.0, dt);
    gaugeState.tripKm += (absSpd * dt) / 1000.0;
    gaugeState.gForceLon = veDamp(gaugeState.gForceLon, (absSpd - gaugeState.prevSpeed) / dt, 8.0, dt);
    gaugeState.prevSpeed = absSpd;

    const inp = c.input || {};
    const throttle = veClamp(Number(inp.throttle ?? (inp.forward || inp.keys?.KeyW ? 1 : 0)) || 0, 0, 1);
    const maxSpd = Math.max(12, Number(car.maxSpeed) || 38);
    const gearsCount = Number(car.def?.gears) || (car.isHeli ? 1 : car.isBoat ? 2 : 6);

    let nextGear = 'N';
    let targetRpm = 0.16;

    if (car.isHeli) {
      nextGear = 'FLT';
      targetRpm = veClamp((car.rotorRpm || 0) * 0.78 + throttle * 0.18, 0.12, 0.98);
    } else if (car.isReversing || fwdSpd < -0.6) {
      nextGear = 'R';
      targetRpm = veClamp(0.24 + (Math.abs(fwdSpd) / (maxSpd * 0.35)) * 0.68, 0.2, 0.94);
    } else if (absSpd < 0.45 && throttle < 0.05) {
      nextGear = 'N';
      targetRpm = 0.16 + Math.sin((c.elapsed || 0) * 14.0) * 0.008;
    } else {
      const scaledProgress = (absSpd / maxSpd) * gearsCount;
      const gNum = veClamp(Math.floor(scaledProgress) + 1, 1, gearsCount);
      nextGear = String(gNum);
      const inGearFrac = gNum === gearsCount
        ? veClamp((scaledProgress - (gearsCount - 1)), 0, 1.05)
        : (scaledProgress % 1);
      targetRpm = veClamp(0.26 + inGearFrac * 0.66 + throttle * 0.09, 0.20, 0.99);
    }

    if (nextGear !== gaugeState.gearLabel) {
      gaugeState.prevGearLabel = gaugeState.gearLabel;
      gaugeState.gearLabel = nextGear;
      gaugeState.gearShiftPulse = 1.0;
    }
    gaugeState.gearShiftPulse = Math.max(0, gaugeState.gearShiftPulse - dt * 4.5);
    gaugeState.rpmNorm = veDamp(gaugeState.rpmNorm, targetRpm, 15.0, dt);

    // Turbo Boost PSI (-9 VAC at idle/coast -> up to +22 PSI under boost/Twin-Turbo!)
    const hasTurboMod = Boolean(car.mods?.turbo || car.isHypercar || car.type === 'superbike');
    const maxPsi = hasTurboMod ? 22.0 : 14.5;
    const targetPsi = throttle > 0.15
      ? veLerp(-2.0, maxPsi, throttle * veClamp(gaugeState.rpmNorm * 1.15, 0.2, 1.0)) + (inp.boost ? 3.5 : 0)
      : -8.5;
    gaugeState.boostPsi = veDamp(gaugeState.boostPsi, targetPsi, 10.5, dt);

    const isRedline = gaugeState.rpmNorm > 0.88;
    if (isRedline) gaugeState.redlineBlink += dt * 18.0;

    // --- Paint High-DPI Giang Hồ Instrument Cluster ---
    const g = clusterCtx;
    const W = 1040;
    const H = 356;
    g.clearRect(0, 0, W, H);

    // Sculpted Carbon-Metallic Dashboard Pod Bezel
    g.save();
    const bgGrad = g.createLinearGradient(0, 24, 0, H);
    bgGrad.addColorStop(0, 'rgba(13, 18, 28, 0.90)');
    bgGrad.addColorStop(1, 'rgba(6, 9, 15, 0.96)');
    g.fillStyle = bgGrad;
    g.strokeStyle = isRedline && Math.sin(gaugeState.redlineBlink) > 0
      ? 'rgba(239, 68, 68, 0.92)'
      : 'rgba(56, 189, 248, 0.48)';
    g.lineWidth = 3.5;

    g.beginPath();
    g.moveTo(92, 34);
    g.lineTo(W - 92, 34);
    g.quadraticCurveTo(W - 26, 38, W - 14, 138);
    g.lineTo(W - 6, H - 22);
    g.quadraticCurveTo(W - 8, H - 6, W - 32, H - 6);
    g.lineTo(32, H - 6);
    g.quadraticCurveTo(8, H - 6, 6, H - 22);
    g.lineTo(14, 138);
    g.quadraticCurveTo(26, 38, 92, 34);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();

    // ==================== 1. LEFT DIAL: ANALOG RPM TACHOMETER ====================
    const tachX = 212;
    const tachY = 204;
    const tachR = 122;
    const startA = Math.PI * 0.76;
    const endA = Math.PI * 2.24;

    const maxK = car.type === 'superbike' ? 15 : car.isTank ? 4 : 9;
    const redZoneStart = veLerp(startA, endA, 0.82);

    // Redline danger band
    g.save();
    g.beginPath();
    g.arc(tachX, tachY, tachR, redZoneStart, endA, false);
    g.strokeStyle = 'rgba(239, 68, 68, 0.42)';
    g.lineWidth = 14;
    g.stroke();
    g.restore();

    drawArcGauge(
      g,
      tachX,
      tachY,
      tachR,
      startA,
      endA,
      gaugeState.rpmNorm,
      isRedline ? '#ef4444' : '#00f0ff',
      isRedline ? '#ff2a55' : '#00f0ff',
      10
    );

    // Tick marks & RPM numbers
    g.save();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let t = 0; t <= maxK; t++) {
      const tf = t / maxK;
      const ang = veLerp(startA, endA, tf);
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const isRed = tf >= 0.82;
      g.strokeStyle = isRed ? '#f87171' : '#cbd5e1';
      g.lineWidth = 2.6;
      g.beginPath();
      g.moveTo(tachX + cosA * (tachR - 18), tachY + sinA * (tachR - 18));
      g.lineTo(tachX + cosA * (tachR - 6), tachY + sinA * (tachR - 6));
      g.stroke();

      if (maxK <= 10 || t % 2 === 0 || t === maxK) {
        g.fillStyle = isRed ? '#fca5a5' : '#e2e8f0';
        g.font = 'bold 17px "Segoe UI", Arial, sans-serif';
        g.fillText(String(t), tachX + cosA * (tachR - 34), tachY + sinA * (tachR - 34));
      }
    }
    g.fillStyle = '#94a3b8';
    g.font = 'bold 13px monospace';
    g.fillText('RPM x1000', tachX, tachY + 42);

    // Redline Upshift Flash Lamp!
    if (isRedline && Math.sin(gaugeState.redlineBlink) > -0.2) {
      g.fillStyle = '#ef4444';
      g.shadowColor = '#ef4444';
      g.shadowBlur = 16;
      g.font = 'bold 18px monospace';
      g.fillText('▲ SHIFT!', tachX, tachY - 38);
    }
    g.restore();

    const needleAng = veLerp(startA, endA, gaugeState.rpmNorm);
    drawIlluminatedNeedle(g, tachX, tachY, tachR - 14, -18, needleAng, isRedline ? '#ff3344' : '#f97316');

    // ==================== 2. CENTER DIGITAL READOUT (KM/H, GEAR, WARNINGS) ====================
    const midX = W * 0.5;
    g.save();
    g.textAlign = 'center';

    // Vehicle Model Header Badge
    g.fillStyle = '#38bdf8';
    g.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    g.fillText((car.name || 'VEHICLE').toUpperCase(), midX, 68);

    // Illuminated Gear Box
    const gearScale = 1.0 + gaugeState.gearShiftPulse * 0.16;
    g.save();
    g.translate(midX, 118);
    g.scale(gearScale, gearScale);
    g.fillStyle = isRedline ? 'rgba(239,68,68,0.24)' : 'rgba(14, 165, 233, 0.18)';
    g.strokeStyle = isRedline ? '#ef4444' : '#38bdf8';
    g.lineWidth = 2.4;
    g.strokeRect(-28, -24, 56, 48);
    g.fillRect(-28, -24, 56, 48);
    g.fillStyle = gaugeState.gearLabel === 'R' ? '#facc15' : '#f8fafc';
    g.font = 'bold 32px monospace';
    g.textBaseline = 'middle';
    g.fillText(gaugeState.gearLabel, 0, 2);
    g.restore();

    // Giant Digital KM/H Speed Readout!
    const kmhInt = Math.round(gaugeState.displayKmh);
    g.fillStyle = '#f8fafc';
    g.shadowColor = 'rgba(56, 189, 248, 0.55)';
    g.shadowBlur = 14;
    g.font = 'bold 88px "Arial Black", Impact, monospace';
    g.fillText(String(kmhInt).padStart(3, '0'), midX, 224);
    g.shadowBlur = 0;

    g.fillStyle = '#94a3b8';
    g.font = 'bold 18px monospace';
    g.fillText('KM/H', midX, 254);

    // Status & Warning Indicator Row
    const hpPct = veClamp((car.hp || 100) / Math.max(1, car.maxHp || 100), 0, 1);
    const pills = [
      { txt: 'COCKPIT [K]', on: true, col: '#22d3ee' },
      { txt: 'PHANH TAY', on: Boolean(car.isBraking && inp.handbrake), col: '#ef4444' },
      { txt: 'ĐỘNG CƠ', on: hpPct < 0.48, col: hpPct < 0.22 ? '#ef4444' : '#f59e0b' },
      {
        txt: car.hasScissorDoors ? 'AERO V12' : car.isMotorcycle ? 'LEAN ABS' : car.isBoat ? 'TRIM' : 'TCS',
        on: absSpd > 18 || Boolean(car.sirenActive),
        col: '#4ade80'
      }
    ];
    let pillX = midX - 156;
    for (let i = 0; i < pills.length; i++) {
      const pl = pills[i];
      g.fillStyle = pl.on ? pl.col : 'rgba(100, 116, 139, 0.35)';
      g.font = 'bold 13px monospace';
      g.fillText(pl.txt, pillX + i * 104, 294);
    }

    // Chassis HP Integrity Bar + Trip Odometer
    g.fillStyle = 'rgba(30, 41, 59, 0.85)';
    g.fillRect(midX - 130, 312, 260, 10);
    g.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
    g.fillRect(midX - 130, 312, 260 * hpPct, 10);
    g.fillStyle = '#64748b';
    g.font = 'bold 13px monospace';
    g.fillText(`ODO ${gaugeState.tripKm.toFixed(1)} KM  •  HP ${Math.ceil(car.hp || 0)}/${car.maxHp || 100}`, midX, 338);
    g.restore();

    // ==================== 3. RIGHT DIAL: TURBO PSI + SPECIALTY TELEMETRY ====================
    const rightX = W - 212;
    const rightY = 204;
    const rightR = 122;

    if (car.isBoat) {
      // MARINE KNOTS + WAVE PITCH/ROLL ARTIFICIAL HORIZON!
      const knots = absSpd * 1.94384;
      const kFrac = veClamp(knots / 88.0, 0, 1);
      drawArcGauge(g, rightX, rightY, rightR, startA, endA, kFrac, '#38bdf8', '#0ea5e9', 10);

      // Wave attitude horizon circle
      g.save();
      g.beginPath();
      g.arc(rightX, rightY - 8, 56, 0, Math.PI * 2);
      g.clip();
      g.translate(rightX, rightY - 8);
      g.rotate(-(car.roll || 0));
      const pitchPx = veClamp((car.pitch || 0) * 95, -40, 40);
      g.fillStyle = '#0c4a6e';
      g.fillRect(-70, -70, 140, 70 + pitchPx);
      g.fillStyle = '#0284c7';
      g.fillRect(-70, pitchPx, 140, 70 - pitchPx);
      g.strokeStyle = '#f8fafc';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(-42, pitchPx);
      g.lineTo(42, pitchPx);
      g.stroke();
      g.restore();

      g.save();
      g.textAlign = 'center';
      g.fillStyle = '#f8fafc';
      g.font = 'bold 30px monospace';
      g.fillText(`${Math.round(knots)} KTS`, rightX, rightY + 76);
      g.fillStyle = '#38bdf8';
      g.font = 'bold 14px monospace';
      g.fillText('HẢI LÝ / SÓNG BIỂN', rightX, rightY + 102);
      g.restore();
    } else if (car.isJet) {
      // LUXOR EXECUTIVE JET AVIONICS: ARTIFICIAL HORIZON + AIRSPEED KTS + RADAR ALT + GEAR!
      const knots = absSpd * 1.94384;
      const kFrac = veClamp(knots / 145.0, 0, 1);
      drawArcGauge(g, rightX, rightY, rightR, startA, endA, kFrac, '#38bdf8', '#0ea5e9', 10);

      g.save();
      g.beginPath();
      g.arc(rightX, rightY - 12, 54, 0, Math.PI * 2);
      g.clip();
      g.translate(rightX, rightY - 12);
      g.rotate(-(car.roll || 0));
      const pitchPx = veClamp((car.pitch || 0) * 85, -42, 42);
      g.fillStyle = '#075985';
      g.fillRect(-70, -70, 140, 70 + pitchPx);
      g.fillStyle = '#78350f';
      g.fillRect(-70, pitchPx, 140, 70 - pitchPx);
      g.strokeStyle = '#f8fafc';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(-40, pitchPx);
      g.lineTo(40, pitchPx);
      g.stroke();
      g.restore();

      const altM = Math.max(0, Math.round(car.y || 0));
      const gearDn = (car.gearDeployFrac ?? 1) > 0.5;
      g.save();
      g.textAlign = 'center';
      g.fillStyle = '#f8fafc';
      g.font = 'bold 24px monospace';
      g.fillText(`${Math.round(knots)} KTS • ${altM}m`, rightX, rightY + 68);
      g.fillStyle = gearDn ? '#4ade80' : '#38bdf8';
      g.font = 'bold 14px monospace';
      g.fillText(gearDn ? 'GEAR DOWN • TAXI/LAND' : 'GEAR UP • MACH CRUISE', rightX, rightY + 94);
      g.restore();
    } else if (car.isHeli) {
      // HELICOPTER RADAR ALTIMETER + VERTICAL CLIMB VSI!
      const altMeters = Math.max(0, Math.round(car.y || 0));
      const altFrac = veClamp(altMeters / 130, 0, 1);
      drawArcGauge(g, rightX, rightY, rightR, startA, endA, altFrac, '#4ade80', '#22c55e', 10);

      g.save();
      g.textAlign = 'center';
      g.fillStyle = '#4ade80';
      g.font = 'bold 16px monospace';
      g.fillText('RADAR ALTITUDE', rightX, rightY - 46);
      g.fillStyle = '#f8fafc';
      g.font = 'bold 46px monospace';
      g.fillText(`${altMeters}m`, rightX, rightY + 4);
      const vsi = Number(car.vy) || 0;
      g.fillStyle = vsi >= 0 ? '#38bdf8' : '#facc15';
      g.font = 'bold 18px monospace';
      g.fillText(`VSI ${vsi >= 0 ? '+' : ''}${vsi.toFixed(1)} m/s`, rightX, rightY + 42);
      g.restore();
    } else if (car.isMotorcycle) {
      // MOTORCYCLE LEAN ANGLE BANK METER (±33°) + LIVE WHEELIE COUNTER!
      const leanDeg = Math.round(((car.leanAngle || 0) * 180) / Math.PI);
      const leanFrac = veClamp((Math.abs(leanDeg) / 34.0), 0, 1);
      drawArcGauge(g, rightX, rightY, rightR, startA, endA, leanFrac, '#facc15', '#eab308', 10);

      g.save();
      g.translate(rightX, rightY - 10);
      g.rotate(car.leanAngle || 0);
      g.strokeStyle = '#facc15';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(-48, 0);
      g.lineTo(48, 0);
      g.moveTo(0, -34);
      g.lineTo(0, 20);
      g.stroke();
      g.restore();

      g.save();
      g.textAlign = 'center';
      g.fillStyle = '#f8fafc';
      g.font = 'bold 26px monospace';
      g.fillText(`LEAN ${Math.abs(leanDeg)}°`, rightX, rightY + 54);
      const wDist = Math.round(car.wheelieDist || 0);
      g.fillStyle = wDist > 0 ? '#4ade80' : '#94a3b8';
      g.font = 'bold 16px monospace';
      g.fillText(wDist > 0 ? `BỐC ĐẦU: ${wDist}m!` : '[CTRL] BỐC ĐẦU', rightX, rightY + 84);
      g.restore();
    } else if (car.isTank) {
      // RHINO TANK TURRET AZIMUTH DIAGRAM + 120MM RELOAD READOUT!
      const ready = (car.cannonCooldown || 0) <= 0.01;
      const reloadFrac = ready ? 1.0 : 1.0 - veClamp((car.cannonCooldown || 0) / 1.32, 0, 1);
      drawArcGauge(g, rightX, rightY, rightR, startA, endA, reloadFrac, ready ? '#4ade80' : '#f59e0b', '#22c55e', 10);

      g.save();
      g.translate(rightX, rightY - 6);
      // Hull silhouette
      g.strokeStyle = '#94a3b8';
      g.lineWidth = 3;
      g.strokeRect(-22, -34, 44, 68);
      // Rotating Turret + 120mm Gun Direction!
      g.rotate(-(car.turretYaw || 0));
      g.fillStyle = ready ? '#4ade80' : '#f59e0b';
      g.beginPath();
      g.arc(0, 0, 15, 0, Math.PI * 2);
      g.fill();
      g.fillRect(-3.5, -56, 7, 46);
      g.restore();

      g.save();
      g.textAlign = 'center';
      g.fillStyle = ready ? '#4ade80' : '#facc15';
      g.font = 'bold 18px monospace';
      g.fillText(ready ? 'PHÁO 120MM: SẴN SÀNG' : `NẠP ĐẠN: ${(car.cannonCooldown || 0).toFixed(1)}s`, rightX, rightY + 78);
      g.restore();
    } else {
      // ANALOG TURBO BOOST PSI GAUGE (-10 VAC .. +24 PSI)!
      const psiNorm = veClamp((gaugeState.boostPsi + 10.0) / 34.0, 0, 1);
      const boostCol = gaugeState.boostPsi > 12 ? '#f97316' : '#a855f7';
      drawArcGauge(g, rightX, rightY, rightR, startA, endA, psiNorm, boostCol, boostCol, 10);

      g.save();
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const psiLabels = [-10, 0, 8, 16, 24];
      for (let i = 0; i < psiLabels.length; i++) {
        const pf = (psiLabels[i] + 10) / 34;
        const ang = veLerp(startA, endA, pf);
        g.fillStyle = psiLabels[i] >= 16 ? '#fdba74' : '#cbd5e1';
        g.font = 'bold 15px "Segoe UI", Arial, sans-serif';
        g.fillText(
          String(psiLabels[i]),
          rightX + Math.cos(ang) * (rightR - 32),
          rightY + Math.sin(ang) * (rightR - 32)
        );
      }
      g.fillStyle = '#c084fc';
      g.font = 'bold 14px monospace';
      g.fillText('TURBO PSI', rightX, rightY + 42);
      g.fillStyle = '#f8fafc';
      g.font = 'bold 24px monospace';
      const psiSign = gaugeState.boostPsi >= 0 ? '+' : '';
      g.fillText(`${psiSign}${gaugeState.boostPsi.toFixed(1)}`, rightX, rightY + 72);
      g.restore();

      const psiAng = veLerp(startA, endA, psiNorm);
      drawIlluminatedNeedle(g, rightX, rightY, rightR - 14, -18, psiAng, '#38bdf8');
    }
  }

  return {
    toggleCockpitView,
    isCockpitView,
    updateCockpitCamera,
    updateDashboardHUD,
    setPlayerHeadVisible,
    get isHeadHidden() {
      return headCurrentlyHidden;
    }
  };
}

// ============================================================================
// 9. MAIN SYSTEM FACTORY, SEAMLESS `ctx.vehicles` INTEGRATION WRAPPER,
//    COLLISION / DAMAGE / LSC CUSTOMIZATION & HERO FLEET BOOTSTRAP
// ============================================================================

export function createVehiclesExtra(ctx) {
  const texWorkshop = createExtraTextureWorkshop();
  const staticMats = createStaticExtraMaterials(texWorkshop);
  const audioSynth = createExtraAudioSynth(ctx);
  const extraFX = createExtraFXSystem(texWorkshop, audioSynth);
  const oceanSampler = createOceanAndTerrainSampler(ctx);
  const cockpitSys = createCockpitCameraAndHUD(ctx);

  let nextExtraSeq = 1;
  let initialized = false;
  let vehiclesWrapped = false;
  let cameraWrapped = false;
  let initialFleetSpawned = false;
  let enterExitDebounce = 0;
  let lastSteppedFrameTime = -1;
  let vehicleCamCycleStep = 0;

  // Local fallback keyboard & mouse state
  const localKeys = {};
  let localMouseDown = false;
  let prevInteractHeld = false;
  let prevHornHeld = false;
  let prevDoorToggleHeld = false;
  let listenersBound = false;
  let touchBarEl = null;
  const touchFlags = {
    wheelie: false,
    tankFire: false
  };

  function isEditableElementFocused() {
    if (typeof document === 'undefined') return false;
    const el = document.activeElement;
    if (!el) return false;
    const tag = (el.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(el.isContentEditable);
  }

  function bindGlobalListeners() {
    if (listenersBound || typeof window === 'undefined') return;
    listenersBound = true;

    window.addEventListener('keydown', (e) => {
      if (isEditableElementFocused()) return;
      localKeys[e.code] = true;

      if (ctx?.activeModal || ctx?.paused || ctx?.input?.phoneOpen || ctx?.input?.wheelOpen) return;

      if (e.code === 'KeyK' && !e.repeat) {
        cockpitSys.toggleCockpitView();
      } else if (e.code === 'KeyC' && !e.repeat && ctx?.player?.inCar) {
        // 4-step vehicle camera preset cycle: Chase Standard -> Chase Far -> Chase Close -> First-Person Cockpit!
        vehicleCamCycleStep = (vehicleCamCycleStep + 1) % 4;
        if (vehicleCamCycleStep === 3) {
          cockpitSys.toggleCockpitView(true);
        } else if (cockpitSys.isCockpitView()) {
          cockpitSys.toggleCockpitView(false);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      localKeys[e.code] = false;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && !ctx?.activeModal && !ctx?.paused) {
        localMouseDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) localMouseDown = false;
    });

    window.addEventListener('blur', () => {
      for (const k of Object.keys(localKeys)) localKeys[k] = false;
      localMouseDown = false;
      touchFlags.wheelie = false;
      touchFlags.tankFire = false;
    });
  }

  function ensureMobileTouchControls() {
    if (touchBarEl || typeof document === 'undefined' || !ctx?.input?.isTouchDevice) return;
    touchBarEl = document.createElement('div');
    touchBarEl.id = 've-mobile-touch-controls';
    touchBarEl.style.cssText = [
      'position:fixed',
      'bottom:152px',
      'right:16px',
      'display:none',
      'flex-direction:column',
      'gap:8px',
      'z-index:32'
    ].join(';');

    const makeBtn = (id, label, onTap, onHoldChange) => {
      const b = document.createElement('button');
      b.id = id;
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = [
        'padding:8px 12px',
        'border-radius:8px',
        'border:1px solid rgba(56,189,248,0.55)',
        'background:rgba(15,23,42,0.84)',
        'color:#f8fafc',
        'font:bold 12px sans-serif',
        'touch-action:manipulation'
      ].join(';');
      if (onTap) b.addEventListener('click', (ev) => { ev.preventDefault(); onTap(); });
      if (onHoldChange) {
        b.addEventListener('touchstart', (ev) => { ev.preventDefault(); onHoldChange(true); }, { passive: false });
        b.addEventListener('touchend', (ev) => { ev.preventDefault(); onHoldChange(false); }, { passive: false });
      }
      touchBarEl.appendChild(b);
      return b;
    };

    makeBtn('ve-btn-cockpit', 'BUỒNG LÁI [K]', () => cockpitSys.toggleCockpitView(), null);
    makeBtn('ve-btn-wheelie', 'BỐC ĐẦU', null, (v) => { touchFlags.wheelie = v; });
    makeBtn('ve-btn-cannon', 'PHÁO 120MM', null, (v) => { touchFlags.tankFire = v; });
    document.body.appendChild(touchBarEl);
  }

  function readExtraDrivingInput() {
    const inp = ctx?.input || {};
    if (ctx?.activeModal || inp.phoneOpen || inp.wheelOpen || ctx?.paused || ctx?.started === false) {
      prevInteractHeld = false;
      prevHornHeld = false;
      prevDoorToggleHeld = false;
      return {
        throttle: 0,
        brake: 0,
        steer: 0,
        handbrake: false,
        boost: false,
        wheeliePull: false,
        stoppiePush: false,
        tankFire: false,
        interactJust: false,
        hornJust: false,
        doorToggleJust: false
      };
    }

    const k = inp.keys || {};
    const key = (code, lower) => Boolean(k[code] || (lower && k[lower]) || localKeys[code]);

    const keyW = key('KeyW', 'w');
    const keyS = key('KeyS', 's');
    const keyA = key('KeyA', 'a');
    const keyD = key('KeyD', 'd');
    const arrUp = key('ArrowUp');
    const arrDown = key('ArrowDown');
    const arrLeft = key('ArrowLeft');
    const arrRight = key('ArrowRight');
    const space = Boolean(inp.handbrake || inp.drift || key('Space', ' '));
    const shift = Boolean(inp.boost || inp.sprint || key('ShiftLeft') || key('ShiftRight'));
    const ctrl = Boolean(key('ControlLeft') || key('ControlRight') || key('KeyZ', 'z') || touchFlags.wheelie);

    let throttle = Number(inp.throttle ?? inp.gas ?? inp.accelerate ?? 0) || 0;
    let brake = Number(inp.brake ?? inp.reverse ?? 0) || 0;
    if (inp.forward || keyW || (arrUp && !keyW)) throttle = Math.max(throttle, 1);
    // Note: if holding W + ArrowDown on a motorcycle, ArrowDown pulls back into a wheelie instead of braking!
    const pullBackWithArrow = Boolean(keyW && arrDown && ctx?.player?.inCar?.isMotorcycle);
    if (!pullBackWithArrow && (inp.backward || inp.back || keyS || arrDown)) {
      brake = Math.max(brake, 1);
    }

    let steer = 0;
    if (typeof inp.steer === 'number' && Math.abs(inp.steer) > 0.04) {
      steer = veClamp(inp.steer, -1, 1);
    } else if (typeof inp.moveX === 'number' && Math.abs(inp.moveX) > 0.05) {
      steer = veClamp(inp.moveX, -1, 1);
    } else if (typeof inp.joyX === 'number' && Math.abs(inp.joyX) > 0.05) {
      steer = veClamp(inp.joyX, -1, 1);
    } else {
      const left = Boolean(inp.left || inp.steerLeft || keyA || arrLeft);
      const right = Boolean(inp.right || inp.steerRight || keyD || arrRight);
      steer = (right ? 1 : 0) - (left ? 1 : 0);
    }

    const interactRaw = Boolean(
      inp.interactJustPressed ||
      inp.enterExitJustPressed ||
      inp.vehicleJustPressed ||
      inp.interact ||
      inp.enterExit ||
      key('KeyF', 'f') ||
      key('KeyE', 'e')
    );
    const interactJust = Boolean(
      inp.interactJustPressed ||
      inp.enterExitJustPressed ||
      inp.vehicleJustPressed ||
      (interactRaw && !prevInteractHeld)
    );
    prevInteractHeld = interactRaw;

    const hornRaw = Boolean(inp.hornJustPressed || inp.horn || key('KeyH', 'h'));
    const hornJust = Boolean(inp.hornJustPressed || (hornRaw && !prevHornHeld));
    prevHornHeld = hornRaw;

    const doorRaw = key('KeyX', 'x');
    const doorToggleJust = Boolean(doorRaw && !prevDoorToggleHeld);
    prevDoorToggleHeld = doorRaw;

    const wheeliePull = Boolean(ctrl || pullBackWithArrow);
    const stoppiePush = Boolean((keyS || brake > 0.8) && (ctrl || space));
    const tankFire = Boolean(inp.fire || localMouseDown || touchFlags.tankFire);
    const jetPitchUp = Boolean(space || arrDown || inp.heliUp || inp.pitchBack);
    const jetPitchDown = Boolean(ctrl || (arrUp && keyW) || inp.heliDown || inp.pitchForward);

    return {
      throttle: veClamp(throttle, 0, 1),
      brake: veClamp(brake, 0, 1),
      steer: veClamp(steer, -1, 1),
      handbrake: space,
      boost: shift,
      wheeliePull,
      stoppiePush,
      tankFire,
      jetPitchUp,
      jetPitchDown,
      interactJust,
      hornJust,
      doorToggleJust
    };
  }

  // --------------------------------------------------------------------------
  // RESOLVE EXTRA ARCHETYPE KEY SAFELY (Preserving 'heli' when police/airborne!)
  // --------------------------------------------------------------------------
  function resolveExtraType(rawType, maybeY, maybeOpts) {
    if (!rawType || typeof rawType !== 'string') return null;
    const key = rawType.trim().toLowerCase();
    // Guard: if a caller passes 'chopper' with `isPoliceHeli` or high altitude `y > 14`, let base `vehicles.js` build 'heli'!
    if (key === 'chopper') {
      if (maybeOpts?.isPoliceHeli || maybeOpts?.isHeli || (Number.isFinite(maybeY) && maybeY > 14)) {
        return null;
      }
    }
    return EXTRA_ALIASES[key] || null;
  }

  function parseSpawnArgs(arg0, arg1, arg2, arg3, arg4, arg5) {
    let rawType = 'superbike';
    let x = 0;
    let y = null;
    let z = 0;
    let yaw = 0;
    let opts = {};

    if (typeof arg0 === 'object' && arg0 !== null) {
      opts = arg0;
      rawType = String(opts.type || 'superbike');
      x = Number(opts.x) || 0;
      y = Number.isFinite(opts.y) ? opts.y : null;
      z = Number(opts.z) || 0;
      yaw = Number(opts.yaw ?? opts.rotation ?? 0) || 0;
    } else {
      rawType = String(arg0 || 'superbike');
      if (typeof arg1 === 'object' && arg1 !== null) {
        opts = arg1;
        x = Number(opts.x) || 0;
        y = Number.isFinite(opts.y) ? opts.y : null;
        z = Number(opts.z) || 0;
        yaw = Number(opts.yaw ?? 0) || 0;
      } else if (
        typeof arg1 === 'number' &&
        typeof arg2 === 'number' &&
        typeof arg3 === 'number' &&
        typeof arg4 === 'number'
      ) {
        x = arg1;
        y = arg2;
        z = arg3;
        yaw = arg4;
        opts = (typeof arg5 === 'object' && arg5) || {};
      } else if (typeof arg1 === 'number' && typeof arg2 === 'number' && typeof arg3 === 'number') {
        x = arg1;
        z = arg2;
        yaw = arg3;
        opts = (typeof arg4 === 'object' && arg4) || {};
        y = Number.isFinite(opts.y) ? opts.y : null;
      } else if (typeof arg1 === 'number' && typeof arg2 === 'number') {
        x = arg1;
        z = arg2;
        opts = (typeof arg3 === 'object' && arg3) || {};
        y = Number.isFinite(opts.y) ? opts.y : null;
        yaw = Number(opts.yaw ?? 0) || 0;
      }
    }
    return { rawType, x, y, z, yaw, opts };
  }

  // --------------------------------------------------------------------------
  // SPAWN EXTRA VEHICLE (`spawnExtraVehicle`)
  // --------------------------------------------------------------------------
  function spawnExtraVehicle(arg0, arg1, arg2, arg3, arg4, arg5) {
    const parsed = parseSpawnArgs(arg0, arg1, arg2, arg3, arg4, arg5);
    const type = resolveExtraType(parsed.rawType, parsed.y, parsed.opts) || 'superbike';
    const def = EXTRA_ARCHETYPES[type];
    const opts = parsed.opts || {};

    const idxSeed = nextExtraSeq++;
    const baseColor = opts.color !== undefined
      ? opts.color
      : def.palette[(idxSeed - 1) % def.palette.length];
    const accentColor = opts.accentColor !== undefined
      ? opts.accentColor
      : def.accentPalette[(idxSeed - 1) % def.accentPalette.length];

    let initialY = parsed.y;
    if (!Number.isFinite(initialY)) {
      if (def.isBoat && oceanSampler.isOceanWater(parsed.x, parsed.z)) {
        initialY = oceanSampler.sampleWave(parsed.x, parsed.z).y - (def.draftDepth || 0.2);
      } else {
        initialY = oceanSampler.sampleGround(parsed.x, parsed.z, 0.05);
      }
    }

    let built = null;
    if (type === 'superbike') {
      built = buildSuperbikeMesh(def, baseColor, accentColor, opts, staticMats, texWorkshop);
    } else if (type === 'chopper') {
      built = buildChopperMesh(def, baseColor, accentColor, opts, staticMats, texWorkshop);
    } else if (type === 'jetski') {
      built = buildJetskiMesh(def, baseColor, accentColor, opts, staticMats, texWorkshop);
    } else if (type === 'speedboat') {
      built = buildSpeedboatMesh(def, baseColor, accentColor, opts, staticMats, texWorkshop);
    } else if (type === 'zentorno') {
      built = buildZentornoMesh(def, baseColor, accentColor, opts, staticMats, texWorkshop);
    } else if (type === 'luxor_jet') {
      built = buildLuxorJetMesh(def, baseColor, accentColor, opts, staticMats, texWorkshop);
    } else {
      built = buildRhinoTankMesh(def, baseColor, accentColor, opts, staticMats, texWorkshop);
    }

    const scene = ctx?.engine?.scene || ctx?.scene || null;
    if (scene) {
      extraFX.ensureAttached(scene);
      scene.add(built.root);
    }

    built.root.position.set(parsed.x, initialY, parsed.z);
    built.root.rotation.y = parsed.yaw;

    const id = opts.id || `veh_extra_${idxSeed}`;
    const car = {
      id,
      type,
      archetype: type,
      def,
      name: def.name,
      modelName: def.name,
      displayName: def.label,
      category: def.category,
      label: def.label,
      plate: built.plateStr,

      isExtraVehicle: true,
      isHeli: false,
      isHelicopter: false,
      isOpenTop: Boolean(def.isOpenTop),
      isMotorcycle: Boolean(def.isMotorcycle),
      isChopper: Boolean(def.isChopper),
      isBoat: Boolean(def.isBoat),
      isWatercraft: Boolean(def.isBoat),
      isHypercar: Boolean(def.isHypercar),
      hasScissorDoors: Boolean(def.hasScissorDoors),
      isTank: Boolean(def.isTank),
      isJet: Boolean(def.isJet),
      isAircraft: Boolean(def.isAircraft),
      isPolice: false,
      isPoliceHeli: false,
      isPoliceUnit: false,
      isParked: Boolean(opts.isParked ?? true),
      isHero: Boolean(opts.isHero ?? false),
      isTraffic: Boolean(opts.isTraffic ?? false),
      isMission: Boolean(opts.isMission ?? opts.isMissionCar ?? false),
      aiControlled: Boolean(opts.aiControlled ?? false),
      hasAIDriver: Boolean(opts.hasAIDriver ?? opts.aiControlled ?? false),
      driver: opts.driver || null,
      isPlayerDriving: false,

      mesh: built.root,
      group: built.root,
      root: built.root,
      chassis: built.chassis,
      x: parsed.x,
      y: initialY,
      z: parsed.z,
      yaw: parsed.yaw,
      vx: Number(opts.vx) || 0,
      vy: Number(opts.vy) || 0,
      vz: Number(opts.vz) || 0,
      speed: Number(opts.speed) || 0,
      absSpeed: Math.abs(Number(opts.speed) || 0),
      steerAngle: 0,

      width: def.width,
      length: def.length,
      height: def.height,
      w: def.width,
      l: def.length,
      halfW: def.width * 0.5,
      halfL: def.length * 0.5,
      halfWidth: def.width * 0.5,
      halfLength: def.length * 0.5,
      radius: Math.hypot(def.width, def.length) * 0.46,

      maxSpeed: opts.maxSpeed || def.maxSpeed,
      accel: opts.accel || def.accel,
      hp: opts.hp ?? opts.maxHp ?? def.maxHp,
      maxHp: opts.maxHp ?? def.maxHp,
      mass: def.mass,
      alive: true,
      destroyed: false,
      onFire: false,
      fireTimer: 0,

      roll: 0,
      pitch: 0,
      leanAngle: def.isMotorcycle && (opts.isParked ?? true) ? -0.11 : 0,
      wheelieAngle: 0,
      wheelieDist: 0,
      wheelieTime: 0,
      suspY: 0,
      suspVelY: 0,
      isBraking: false,
      isReversing: false,
      isDrifting: false,
      sirenActive: false,
      baseColor,
      accentColor,

      // Zentorno Scissor Door & Tank Turret State
      doorOpenFrac: 0,
      doorTargetOpen: 0,
      doorAutoCloseTimer: 0,
      manualDoorsOpen: false,
      turretYaw: 0,
      cannonPitch: -0.04,
      cannonCooldown: 0,
      cannonMaxCooldown: 1.32,
      recoilOffset: 0,

      dentFront: 0,
      dentRear: 0,
      hoodBuckle: 0,
      smokeTimer: 0,
      skidTimer: 0,

      paintMat: built.paintMat,
      accentMat: built.accentMat,
      accentGlowMat: built.accentGlowMat,
      rimMat: built.rimMat,
      plateMat: built.plateMat,
      taillightMat: built.taillightMat,
      reverseLightMat: built.reverseLightMat,
      headlightMat: built.headlightMat,
      headlightCones: built.headlightCones,
      chainMat: built.chainMat || null,

      leanPivot: built.leanPivot || null,
      wheeliePivot: built.wheeliePivot || null,
      kickstandPivot: built.kickstandPivot || null,
      leftDoorPivot: built.leftDoorPivot || null,
      rightDoorPivot: built.rightDoorPivot || null,
      activeWingPivot: built.activeWingPivot || null,
      backfireFlames: built.backfireFlames || null,
      jetNozzlePivot: built.jetNozzlePivot || null,
      throttleLeverPivot: built.throttleLeverPivot || null,
      propellerL: built.propellerL || null,
      propellerR: built.propellerR || null,
      flagMesh: built.flagMesh || null,
      leftTrackTex: built.leftTrackTex || null,
      rightTrackTex: built.rightTrackTex || null,
      leftWheels: built.leftWheels || null,
      rightWheels: built.rightWheels || null,
      turretPivot: built.turretPivot || null,
      cannonElevationPivot: built.cannonElevationPivot || null,
      cannonRecoilSlide: built.cannonRecoilSlide || null,
      muzzleAnchor: built.muzzleAnchor || null,
      muzzleFlashGroup: built.muzzleFlashGroup || null,
      antennaPivots: built.antennaPivots || null,
      fanRotorL: built.fanRotorL || null,
      fanRotorR: built.fanRotorR || null,
      aileronL: built.aileronL || null,
      aileronR: built.aileronR || null,
      rudderPivot: built.rudderPivot || null,
      elevatorPivot: built.elevatorPivot || null,
      noseSuspNode: built.noseSuspNode || null,
      mainGearPivots: built.mainGearPivots || null,
      wingtipLeftAnchor: built.wingtipLeftAnchor || null,
      wingtipRightAnchor: built.wingtipRightAnchor || null,
      gearDeployFrac: 1.0,

      wheels: built.wheels || [],
      steeringWheelPivot: built.steeringWheelPivot || null,
      driverSeatAnchor: built.driverSeatAnchor,
      frontBumperGroup: built.frontBumperGroup || null,
      rearBumperGroup: built.rearBumperGroup || null,
      hoodPanel: built.hoodPanel || null,
      smokeOriginLocal: built.smokeOriginLocal,

      _lastX: parsed.x,
      _lastY: initialY,
      _lastZ: parsed.z,
      _lastYaw: parsed.yaw,
      _prevVFwd: 0
    };

    if (car.leanPivot && car.leanAngle !== 0) {
      car.leanPivot.rotation.z = car.leanAngle;
    }

    if (ctx?.vehicles?.list && !ctx.vehicles.list.includes(car)) {
      ctx.vehicles.list.push(car);
    }
    return car;
  }

  // --------------------------------------------------------------------------
  // LIGHTS, PROGRESSIVE ENGINE DAMAGE SMOKE, DETONATION & LSC RESPRAY
  // --------------------------------------------------------------------------
  function updateLightsAndDamageSmoke(car, dt, isPlayer) {
    const mode = ctx?.engine?.timeWeather || 'BRIGHT_DAY';
    const isNight = mode === 'NEON_NIGHT' || mode === 'OVERCAST_RAIN' || mode === 'SUNSET_GOLD';

    if (car.taillightMat) {
      car.taillightMat.emissiveIntensity = car.isBraking ? 3.3 : (isNight ? 1.4 : 0.78);
    }
    if (car.reverseLightMat) {
      car.reverseLightMat.emissiveIntensity = car.isReversing ? 2.4 : 0.0;
    }
    if (car.headlightMat) {
      car.headlightMat.emissiveIntensity = isNight ? 2.65 : 1.2;
    }
    if (car.headlightCones) {
      car.headlightCones.visible = isNight && !car.destroyed && (isPlayer || car.hasAIDriver);
    }

    // Rim-grinding sparks if tires popped by police spike strips!
    if (car.tiresPopped && !car.mods?.bulletproofTires && car.absSpeed > 4.0 && Math.random() < 0.4) {
      extraFX.spawnSparks(car.x, car.y + 0.08, car.z, 2, 6.0);
    }

    const hpPct = car.hp / Math.max(1, car.maxHp);
    if (hpPct < 0.65 || car.onFire) {
      car.smokeTimer = (car.smokeTimer || 0) - dt;
      if (car.smokeTimer <= 0) {
        car.smokeTimer = car.onFire ? 0.055 : hpPct < 0.35 ? 0.085 : 0.15;
        _vA.copy(car.smokeOriginLocal);
        car.chassis.localToWorld(_vA);

        if (car.onFire || hpPct < 0.15) {
          if (!car.onFire) {
            car.onFire = true;
            car.fireTimer = 4.5;
          }
          extraFX.spawnPuff(
            _vA.x + (Math.random() - 0.5) * 0.3,
            _vA.y,
            _vA.z + (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 1.2,
            2.2 + Math.random() * 1.4,
            (Math.random() - 0.5) * 1.2,
            Math.random() > 0.4 ? 0xff5a00 : 0xffd133,
            0.35,
            0.95,
            0.30
          );
          extraFX.spawnPuff(_vA.x, _vA.y + 0.25, _vA.z, 0, 2.5, 0, 0x16181c, 0.45, 1.85, 0.85);
        } else if (hpPct < 0.35) {
          extraFX.spawnPuff(_vA.x, _vA.y, _vA.z, 0, 1.8, 0, 0x22252a, 0.34, 1.45, 0.75);
        } else {
          extraFX.spawnPuff(_vA.x, _vA.y, _vA.z, 0, 1.35, 0, 0xdbe2ea, 0.26, 1.15, 0.62);
        }
      }
    }

    if (car.onFire) {
      car.fireTimer -= dt;
      if (car.fireTimer <= 0) {
        detonateExtraVehicle(car);
      }
    }
  }

  function detonateExtraVehicle(car) {
    if (!car || car.destroyed) return;
    car.destroyed = true;
    car.alive = false;
    car.onFire = false;
    car.fireTimer = 0;
    car.hp = 0;
    if (car.headlightCones) car.headlightCones.visible = false;
    if (car.backfireFlames) {
      for (const fg of car.backfireFlames) fg.visible = false;
    }

    const wasPlayerInvolved = Boolean(
      ctx?.player && (
        ctx.player.inCar === car ||
        car._damagedByPlayer ||
        car._lastAttacker === ctx.player ||
        car._lastAttacker === 'player'
      )
    );

    if (ctx?.player?.inCar === car) {
      exitExtraVehicle(true);
      if (ctx.player) ctx.player.hp = 0;
    }

    car.vy = car.isTank ? 3.5 : 7.0;
    car.vx *= 0.35;
    car.vz *= 0.35;

    if (car.paintMat) {
      car.paintMat.color.setHex(0x18191c);
      car.paintMat.metalness = 0.15;
      car.paintMat.roughness = 0.92;
      car.paintMat.clearcoat = 0.0;
    }
    if (car.accentGlowMat) car.accentGlowMat.emissiveIntensity = 0;
    if (car.taillightMat) car.taillightMat.emissiveIntensity = 0;
    if (car.headlightMat) car.headlightMat.emissiveIntensity = 0;

    extraFX.spawnShockwaveRing(car.x, car.y + 0.4, car.z, 9.5);
    extraFX.spawnSparks(car.x, car.y + 0.7, car.z, 24, 14.0);
    if (wasPlayerInvolved) {
      ctx?.characters?.spawnExplosion?.(car.x, car.y + 0.8, car.z, car.isTank ? 2.2 : 1.55, ctx, true);
    }
    if (ctx?.player) {
      const distToPlayer = Math.hypot(ctx.player.x - car.x, ctx.player.z - car.z);
      if (distToPlayer < 50) {
        ctx?.engine?.addShake?.(veClamp((1 - distToPlayer / 50) * 0.88, 0.12, 0.88));
      }
    }
    ctx?.audio?.playExplosion?.(car.x, car.z);
  }

  function damageExtraVehicle(car, amount = 15, attacker = null) {
    if (!car || car.destroyed) return false;
    const dmg = Math.max(0, Number(amount) || 0);
    if (dmg <= 0) return false;
    if (attacker) {
      car._lastAttacker = attacker;
      if (attacker === ctx?.player || attacker === 'player') {
        car._damagedByPlayer = true;
      }
    }

    car.hp -= dmg;
    extraFX.spawnSparks(
      car.x + (Math.random() - 0.5) * 1.1,
      car.y + 0.65,
      car.z + (Math.random() - 0.5) * 1.5,
      Math.min(12, Math.ceil(dmg * 0.3)),
      8.5
    );

    if (ctx?.player?.inCar === car && dmg >= 6) {
      ctx?.engine?.addShake?.(veClamp(dmg * 0.012, 0.08, 0.42));
    }

    const hpRatio = car.hp / Math.max(1, car.maxHp);
    if (hpRatio < 0.15 && !car.onFire) {
      car.onFire = true;
      car.fireTimer = 4.5;
    }

    if (car.hp <= 0) {
      if (dmg >= 75 || (car.onFire && car.fireTimer < 2.5 && dmg >= 20)) {
        detonateExtraVehicle(car);
      } else {
        car.hp = 1;
        car.onFire = true;
        car.fireTimer = Math.min(car.fireTimer || 4.5, 2.2);
      }
    }
    return true;
  }

  function repairAndResprayExtra(car, customColor, finishType) {
    if (!car || car.destroyed) return false;
    car.hp = car.maxHp;
    car.onFire = false;
    car.fireTimer = 0;
    car.tiresPopped = false;
    car.puncturedTires = false;
    car.dentFront = 0;
    car.dentRear = 0;
    car.hoodBuckle = 0;
    if (car.hoodPanel) car.hoodPanel.rotation.x = 0;
    if (car.chassis) car.chassis.scale.y = 1.0;

    if (car.paintMat) {
      const palette = car.def?.palette || [0xf2f4f7, 0xc81d25, 0x14171c, 0xd4af37];
      const nextCol = customColor !== undefined
        ? customColor
        : palette[Math.floor(Math.random() * palette.length)];
      car.baseColor = nextCol;
      car.paintMat.color.setHex(nextCol);

      if (finishType === 'chrome') {
        car.paintMat.metalness = 0.98;
        car.paintMat.roughness = 0.05;
        car.paintMat.clearcoat = 1.0;
      } else if (finishType === 'gold') {
        car.paintMat.color.setHex(0xd4af37);
        car.paintMat.metalness = 0.94;
        car.paintMat.roughness = 0.12;
        car.paintMat.clearcoat = 0.9;
      } else if (finishType === 'matte' || car.def?.isMatte) {
        car.paintMat.metalness = 0.25;
        car.paintMat.roughness = 0.52;
        car.paintMat.clearcoat = 0.12;
      } else {
        car.paintMat.metalness = 0.62;
        car.paintMat.roughness = 0.13;
        car.paintMat.clearcoat = 1.0;
      }
    }

    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      extraFX.spawnPuff(car.x + Math.cos(a) * 1.4, car.y + 0.7, car.z + Math.sin(a) * 1.8, Math.cos(a) * 1.5, 1.2, Math.sin(a) * 1.5, 0xe2e8f0, 0.5, 2.0, 0.7);
    }
    ctx?.audio?.playSpray?.();
    return true;
  }

  // --------------------------------------------------------------------------
  // ENTER & EXIT EXTRA VEHICLE (Scissor-Door Sweep + Smart Dock Disembark!)
  // --------------------------------------------------------------------------
  function enterExtraVehicle(car) {
    const player = ctx?.player;
    if (!player || player.isDead || player.rappelState?.active) return false;
    if (!car || car.destroyed || !car.alive) return false;
    if (player.inCar) return player.inCar;

    if (car.hasAIDriver || car.aiControlled || car.isTraffic) {
      ctx?.gameplay?.addCrimeHeat?.(18, 'carjack', player);
      car.hasAIDriver = false;
      car.aiControlled = false;
      car.isTraffic = false;
    }

    car.isParked = false;
    car.driver = 'player';
    car.isPlayerDriving = true;

    //Thanh Long Siêu Chiến Xa: Swing upward-opening Scissor Doors open dramatically on entry!
    if (car.hasScissorDoors) {
      car.doorOpenFrac = Math.max(car.doorOpenFrac || 0, 0.45);
      car.doorTargetOpen = 1.0;
      car.doorAutoCloseTimer = 1.15;
      audioSynth.playScissorDoorServo(true);
    }

    player.inCar = car;
    player.vehicle = car;
    player.car = car;
    player.inCarId = car.id;
    player.isAiming = false;
    player._bikeEjectRagdollTimer = 0;
    player.x = car.x;
    player.y = car.y;
    player.z = car.z;
    player.yaw = car.yaw;

    syncOpenRiderPose(car, 0.016, ctx, cockpitSys.isHeadHidden);

    ctx?.ui?.showVehicleCallout?.(car.label);
    ctx?.ui?.showVehicleBanner?.(car.name, car.category);
    ctx?.ui?.onEnterVehicle?.(car);
    ctx?.audio?.playDoor?.();

    enterExitDebounce = 0.38;
    return car;
  }

  function exitExtraVehicle(forceImmediate = false) {
    const player = ctx?.player;
    const car = player?.inCar;
    if (!player || !car || !car.isExtraVehicle) return false;

    // Always restore head visibility immediately on vehicle exit!
    cockpitSys.setPlayerHeadVisible(ctx, true);

    const forced = forceImmediate === true;
    const absSpeed = Math.hypot(car.vx || 0, car.vz || 0);
    const groundUnderCar = oceanSampler.sampleGround(car.x, car.z, car.y);
    const exitingAirborneJet = Boolean(car.isJet && car.y > groundUnderCar + 6.0);
    const highSpeedBail = !forced && !car.isBoat && !car.isTank && !exitingAirborneJet && absSpeed > 15.0;

    if (car.hasScissorDoors) {
      car.doorTargetOpen = 1.0;
      car.doorAutoCloseTimer = 1.65;
      audioSynth.playScissorDoorServo(true);
    }

    const leftX = Math.cos(car.yaw);
    const leftZ = -Math.sin(car.yaw);
    const sideDist = car.width * 0.5 + 0.92;

    let exitX = car.x + leftX * sideDist;
    let exitZ = car.z + leftZ * sideDist;
    let exitY = car.y + 0.25;

    if (car.isBoat) {
      // Smart Marine Disembarkation: if moored near Pacific Beach / Marina / Pier, place player onto dry dock/sand!
      let foundDrySpot = false;
      const shoreProbeOffsets = [
        [3.5, 0], [5.5, 0], [7.5, 0], [9.5, 0],
        [4.0, 3.5], [4.0, -3.5], [0, 4.5], [0, -4.5]
      ];
      for (let i = 0; i < shoreProbeOffsets.length; i++) {
        const px = car.x + shoreProbeOffsets[i][0];
        const pz = car.z + shoreProbeOffsets[i][1];
        const gh = oceanSampler.sampleGround(px, pz, 0.5);
        if (px >= -201.0 || gh >= 0.15) {
          exitX = px;
          exitZ = pz;
          exitY = Math.max(0.22, gh);
          foundDrySpot = true;
          break;
        }
      }
      if (!foundDrySpot) {
        // Open ocean exit: step onto rear swim platform / alongside hull
        exitY = Math.max(car.y + 0.35, oceanSampler.sampleWave(exitX, exitZ).y);
      }
    } else {
      const testEnt = { x: exitX, y: car.y + 0.3, z: exitZ };
      const origX = testEnt.x;
      const origZ = testEnt.z;
      ctx?.world?.resolveCircleAABB?.(testEnt, 0.45);
      if (Math.hypot(testEnt.x - origX, testEnt.z - origZ) > 0.32) {
        testEnt.x = car.x - leftX * sideDist;
        testEnt.z = car.z - leftZ * sideDist;
        ctx?.world?.resolveCircleAABB?.(testEnt, 0.45);
      }
      exitX = testEnt.x;
      exitZ = testEnt.z;
      exitY = Math.max(oceanSampler.sampleGround(exitX, exitZ, car.y), car.y);
    }

    player.x = exitX;
    player.y = exitY;
    player.z = exitZ;
    player.yaw = car.yaw;

    if (exitingAirborneJet) {
      // High-altitude jet bail-out equips 3D Parachute for skydiving over Tiên Thành!
      player.hasParachute = true;
      player.y = car.y - 0.6;
      player.vx = car.vx * 0.45 + leftX * 3.2;
      player.vy = -2.0;
      player.vz = car.vz * 0.45 + leftZ * 3.2;
      player.isGrounded = false;
      ctx?.characters?.animateHumanoid?.(player.rig || player, 'fall', 0.016);
      ctx?.audio?.playDoor?.();
    } else if (highSpeedBail) {
      player.vx = car.vx * 0.52 + leftX * 3.8;
      player.vz = car.vz * 0.52 + leftZ * 3.8;
      player.vy = 2.5;
      player.isGrounded = false;
      if (typeof player.hp === 'number' && player.hp > 12) {
        player.hp = Math.max(8, player.hp - 8);
      }
      extraFX.spawnSparks(player.x, player.y + 0.2, player.z, 12, 9.0);
      ctx?.engine?.addShake?.(0.35);
      ctx?.audio?.playCrash?.(0.35);
      ctx?.characters?.animateHumanoid?.(player.rig || player, 'ragdoll', 0.016);
    } else {
      player.vx = 0;
      player.vy = 0;
      player.vz = 0;
      player.isGrounded = true;
      ctx?.characters?.animateHumanoid?.(player.rig || player, 'idle', 0.016);
      ctx?.audio?.playDoor?.();
    }

    const pMesh = player.mesh || player.rig?.root;
    if (pMesh) {
      pMesh.visible = true;
      pMesh.position.set(player.x, player.y, player.z);
      pMesh.rotation.set(0, player.yaw, 0);
    }

    car.driver = null;
    car.isPlayerDriving = false;
    car.isBraking = false;
    car.isReversing = false;
    car.isDrifting = false;
    car.wheelieAngle = 0;
    car.wheelieDist = 0;

    player.inCar = null;
    player.vehicle = null;
    player.car = null;
    player.inCarId = null;

    ctx?.audio?.updateEngine?.(0, 40, 0, false, 0);
    enterExitDebounce = 0.38;
    return true;
  }

  // --------------------------------------------------------------------------
  // PAIRWISE COLLISIONS FOR EXTRA VEHICLES (Including >24 m/s Bike Ejection!)
  // --------------------------------------------------------------------------
  function resolveExtraVehicleCollisions(allCars) {
    const n = allCars.length;
    for (let i = 0; i < n; i++) {
      const a = allCars[i];
      if (!a || a.isHeli) continue;
      for (let j = i + 1; j < n; j++) {
        const b = allCars[j];
        if (!b || b.isHeli) continue;
        // Skip pairs of two base cars (already resolved inside `origUpdateVehicles`!)
        if (!a.isExtraVehicle && !b.isExtraVehicle) continue;
        // Tank crushing is handled directly in `stepRhinoTankPhysics`
        if (a.isTank || b.isTank) continue;
        if (Math.abs((a.y || 0) - (b.y || 0)) > 1.9) continue;

        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d2 = dx * dx + dz * dz;
        const maxReach = ((a.length || 4.0) + (b.length || 4.0)) * 0.55 + 0.6;
        if (d2 >= maxReach * maxReach || d2 < 0.0001) continue;

        const dist = Math.sqrt(d2);
        const nx = dx / dist;
        const nz = dz / dist;

        // Oriented bounding projection along collision normal so motorcycles NEVER clip through car bumpers or sides!
        const aSin = Math.sin(a.yaw || 0), aCos = Math.cos(a.yaw || 0);
        const bSin = Math.sin(b.yaw || 0), bCos = Math.cos(b.yaw || 0);
        const aProj = Math.abs(nx * aCos - nz * aSin) * ((a.width || 1.9) * 0.5) + Math.abs(nx * aSin + nz * aCos) * ((a.length || 4.0) * 0.5);
        const bProj = Math.abs(nx * bCos - nz * bSin) * ((b.width || 1.9) * 0.5) + Math.abs(nx * bSin + nz * bCos) * ((b.length || 4.0) * 0.5);
        const minDist = aProj + bProj + 0.16;
        if (dist >= minDist) continue;
        const overlap = minDist - dist;

        const mA = a.mass || 1.0;
        const mB = b.mass || 1.0;
        const invSum = 1.0 / (mA + mB);
        const shareA = mB * invSum;
        const shareB = mA * invSum;

        const preAvx = a.vx || 0;
        const preAvz = a.vz || 0;
        const preBvx = b.vx || 0;
        const preBvz = b.vz || 0;

        a.x -= nx * overlap * shareA;
        a.z -= nz * overlap * shareA;
        b.x += nx * overlap * shareB;
        b.z += nz * overlap * shareB;

        const relAlongN = (preBvx - preAvx) * nx + (preBvz - preAvz) * nz;
        if (relAlongN < 0) {
          const rest = 0.35;
          const jImp = (-(1 + rest) * relAlongN) / (1 / mA + 1 / mB);
          a.vx = preAvx - (jImp / mA) * nx;
          a.vz = preAvz - (jImp / mA) * nz;
          b.vx = preBvx + (jImp / mB) * nx;
          b.vz = preBvz + (jImp / mB) * nz;

          const impSpd = Math.abs(relAlongN);
          if (impSpd > 5.5) {
            extraFX.spawnSparks((a.x + b.x) * 0.5, Math.max(a.y, b.y) + 0.5, (a.z + b.z) * 0.5, 10, 9.0);
            if (impSpd > 11.0) {
              const dmgFn = ctx?.vehicles?.damageVehicle || damageExtraVehicle;
              if (!a.destroyed) dmgFn(a, (impSpd - 9) * 0.85 * shareA * 2);
              if (!b.destroyed) dmgFn(b, (impSpd - 9) * 0.85 * shareB * 2);
            }
            if (ctx?.player?.inCar === a || ctx?.player?.inCar === b) {
              ctx?.engine?.addShake?.(veClamp(impSpd * 0.022, 0.08, 0.5));
              ctx?.audio?.playCrash?.(veClamp(impSpd / 28, 0.18, 0.95));
            }
          }

          // Motorcycle > 24 m/s head-on collision with another car -> Ragdoll Ejection!
          if (a.isMotorcycle && ctx?.player?.inCar === a && Math.hypot(preAvx, preAvz) > 24.0 && impSpd > 18.0) {
            triggerRiderCrashEjection(a, impSpd, preAvx, preAvz, ctx, extraFX, exitExtraVehicle);
          } else if (b.isMotorcycle && ctx?.player?.inCar === b && Math.hypot(preBvx, preBvz) > 24.0 && impSpd > 18.0) {
            triggerRiderCrashEjection(b, impSpd, preBvx, preBvz, ctx, extraFX, exitExtraVehicle);
          }
        }

        if (a.mesh) a.mesh.position.set(a.x, a.y, a.z);
        if (b.mesh) b.mesh.position.set(b.x, b.y, b.z);
      }
    }
  }

  // --------------------------------------------------------------------------
  // STEP ALL EXTRA VEHICLES & RIDER RAGDOLL RECOVERY (Frame-Idempotent!)
  // --------------------------------------------------------------------------
  function stepExtraSystemOnce(dt, rawDt) {
    const frameMarker = Number(ctx?.elapsed);
    if (Number.isFinite(frameMarker) && frameMarker > 0 && Math.abs(frameMarker - lastSteppedFrameTime) < 1e-7) {
      cockpitSys.updateDashboardHUD(rawDt, ctx);
      return;
    }
    if (Number.isFinite(frameMarker)) lastSteppedFrameTime = frameMarker;

    if (enterExitDebounce > 0) enterExitDebounce = Math.max(0, enterExitDebounce - dt);

    const scene = ctx?.engine?.scene || ctx?.scene;
    if (scene) extraFX.ensureAttached(scene);

    ensureMobileTouchControls();
    if (touchBarEl) {
      const showTouch = Boolean(ctx?.player?.inCar && !ctx?.activeModal && !ctx?.paused);
      touchBarEl.style.display = showTouch ? 'flex' : 'none';
    }

    // Sustain post-crash motorcycle ragdoll tumble & recovery when player is on foot!
    if (ctx?.player && !ctx.player.inCar && (ctx.player._bikeEjectRagdollTimer || 0) > 0) {
      ctx.player._bikeEjectRagdollTimer = Math.max(0, ctx.player._bikeEjectRagdollTimer - dt);
      if (ctx.player._bikeEjectRagdollTimer > 0.12) {
        ctx.characters?.animateHumanoid?.(ctx.player.rig || ctx.player, 'ragdoll', dt);
      } else if (!ctx.player.isDead) {
        ctx.characters?.animateHumanoid?.(ctx.player.rig || ctx.player, 'idle', dt);
      }
    }

    const input = readExtraDrivingInput();
    const isWetRoad = (ctx?.engine?.timeWeather || 'BRIGHT_DAY') === 'OVERCAST_RAIN';
    const allCars = ctx?.vehicles?.list || [];

    const helpers = {
      isWetRoad,
      get isHeadHidden() {
        return cockpitSys.isHeadHidden;
      },
      damageVehicle: (v, amt, att) => (ctx?.vehicles?.damageVehicle ? ctx.vehicles.damageVehicle(v, amt, att) : damageExtraVehicle(v, amt)),
      exitExtraVehicle,
      updateLightsAndDamageSmoke
    };

    for (let i = 0; i < allCars.length; i++) {
      const car = allCars[i];
      if (!car || !car.isExtraVehicle) continue;
      if (scene && car.mesh && car.mesh.parent !== scene) {
        scene.add(car.mesh);
      }

      if (car.isMotorcycle) {
        stepMotorcyclePhysics(car, dt, input, ctx, oceanSampler, extraFX, audioSynth, helpers);
      } else if (car.isBoat) {
        stepWatercraftPhysics(car, dt, input, ctx, oceanSampler, extraFX, audioSynth, helpers);
      } else if (car.isHypercar) {
        stepZentornoPhysics(car, dt, input, ctx, oceanSampler, extraFX, audioSynth, helpers);
      } else if (car.isTank) {
        stepRhinoTankPhysics(car, dt, input, ctx, oceanSampler, extraFX, audioSynth, helpers);
      } else if (car.isJet) {
        stepLuxorJetPhysics(car, dt, input, ctx, oceanSampler, extraFX, audioSynth, helpers);
      }
    }

    resolveExtraVehicleCollisions(allCars);

    for (let i = 0; i < allCars.length; i++) {
      const car = allCars[i];
      if (!car || !car.isExtraVehicle) continue;
      car._lastX = car.x;
      car._lastY = car.y;
      car._lastZ = car.z;
      car._lastYaw = car.yaw;
    }

    extraFX.updateFX(dt, ctx, oceanSampler, helpers.damageVehicle);
    cockpitSys.updateDashboardHUD(rawDt, ctx);
  }

  // --------------------------------------------------------------------------
  // WRAP `ctx.vehicles` & `ctx.engine.updateCamera` SEAMLESSLY
  // --------------------------------------------------------------------------
  function wrapCoreSystems() {
    if (ctx?.vehicles && !vehiclesWrapped) {
      vehiclesWrapped = true;
      const vehApi = ctx.vehicles;

      // Register our 6 new archetypes into `ctx.vehicles.archetypes`
      if (vehApi.archetypes && typeof vehApi.archetypes === 'object') {
        Object.assign(vehApi.archetypes, EXTRA_ARCHETYPES);
      }

      const origSpawn = vehApi.spawnVehicle.bind(vehApi);
      const origRemove = vehApi.removeVehicle.bind(vehApi);
      const origFindNearest = vehApi.findNearestEnterable.bind(vehApi);
      const origEnter = vehApi.enterVehicle.bind(vehApi);
      const origExit = vehApi.exitVehicle.bind(vehApi);
      const origDamage = vehApi.damageVehicle.bind(vehApi);
      const origRepair = vehApi.repairAndRespray.bind(vehApi);
      const origUpdate = vehApi.updateVehicles.bind(vehApi);

      vehApi.spawnVehicle = function spawnVehicle(arg0, arg1, arg2, arg3, arg4, arg5) {
        const parsed = parseSpawnArgs(arg0, arg1, arg2, arg3, arg4, arg5);
        const extraType = resolveExtraType(parsed.rawType, parsed.y, parsed.opts);
        if (extraType) {
          return spawnExtraVehicle(arg0, arg1, arg2, arg3, arg4, arg5);
        }
        return origSpawn(arg0, arg1, arg2, arg3, arg4, arg5);
      };

      vehApi.removeVehicle = function removeVehicle(carOrId) {
        const target = typeof carOrId === 'object'
          ? carOrId
          : vehApi.list.find((v) => v && v.id === carOrId);
        if (target?.isExtraVehicle) {
          if (ctx?.player?.inCar === target) exitExtraVehicle(true);
          if (target.mesh?.parent) target.mesh.parent.remove(target.mesh);
          target.paintMat?.dispose?.();
          target.accentMat?.dispose?.();
          target.accentGlowMat?.dispose?.();
          target.plateMat?.dispose?.();
          target.taillightMat?.dispose?.();
          target.reverseLightMat?.dispose?.();
          target.headlightMat?.dispose?.();
          target.leftTrackTex?.dispose?.();
          target.rightTrackTex?.dispose?.();
          const idx = vehApi.list.indexOf(target);
          if (idx !== -1) vehApi.list.splice(idx, 1);
          return true;
        }
        return origRemove(carOrId);
      };

      vehApi.findNearestEnterable = function findNearestEnterable(arg0, arg1, arg2, arg3) {
        let qx = ctx?.player?.x ?? 0;
        let qy = ctx?.player?.y ?? 0;
        let qz = ctx?.player?.z ?? 0;
        let baseMaxDist = 5.0;
        if (typeof arg0 === 'number' && typeof arg1 === 'number' && typeof arg2 === 'number' && typeof arg3 === 'number') {
          qx = arg0; qy = arg1; qz = arg2; baseMaxDist = arg3;
        } else if (typeof arg0 === 'number' && typeof arg1 === 'number') {
          qx = arg0; qz = arg1;
          if (typeof arg2 === 'number') baseMaxDist = arg2;
        } else if (arg0 && typeof arg0 === 'object' && Number.isFinite(arg0.x)) {
          qx = arg0.x; qz = arg0.z;
          if (Number.isFinite(arg0.y)) qy = arg0.y;
          if (typeof arg1 === 'number') baseMaxDist = arg1;
        }

        let best = origFindNearest(qx, qy, qz, baseMaxDist);
        let bestScore = best ? Math.hypot(best.x - qx, best.z - qz) : Infinity;

        // Also scan extra vehicles with generous boarding radii for moored boats (7.8m), Luxor Jet (8.8m) & Huyền Vũ Thiết Giáp (6.2m)!
        for (let i = 0; i < vehApi.list.length; i++) {
          const v = vehApi.list[i];
          if (!v || !v.isExtraVehicle || v.destroyed || !v.alive) continue;
          const allowDist = v.isJet
            ? Math.max(baseMaxDist, 8.8)
            : v.isBoat
              ? Math.max(baseMaxDist, 7.8)
              : v.isTank
                ? Math.max(baseMaxDist, 6.2)
                : baseMaxDist;
          const allowDy = v.isBoat || v.isJet ? 5.5 : 4.2;
          if (Math.abs((v.y || 0) - qy) > allowDy) continue;
          const d = Math.hypot(v.x - qx, v.z - qz);
          if (d <= allowDist && d < bestScore) {
            bestScore = d;
            best = v;
          }
        }
        return best;
      };

      vehApi.enterVehicle = function enterVehicle(arg0, arg1) {
        const candidate = (arg0 && arg0.mesh && arg0.type)
          ? arg0
          : (arg1 && arg1.mesh && arg1.type)
            ? arg1
            : vehApi.findNearestEnterable(ctx?.player?.x ?? 0, ctx?.player?.z ?? 0, 5.2);
        if (candidate?.isExtraVehicle) {
          return enterExtraVehicle(candidate);
        }
        return origEnter(arg0, arg1);
      };

      vehApi.exitVehicle = function exitVehicle(forceArg) {
        if (ctx?.player?.inCar?.isExtraVehicle) {
          return exitExtraVehicle(forceArg);
        }
        cockpitSys.setPlayerHeadVisible(ctx, true);
        return origExit(forceArg);
      };

      vehApi.damageVehicle = function damageVehicle(carOrId, amount, attacker, hitPoint) {
        const car = typeof carOrId === 'object'
          ? carOrId
          : vehApi.list.find((v) => v && v.id === carOrId);
        if (car?.isExtraVehicle) {
          return damageExtraVehicle(car, amount, attacker);
        }
        return origDamage(carOrId, amount, attacker, hitPoint);
      };

      vehApi.repairAndRespray = function repairAndRespray(targetCar, customColor, finishType) {
        const car = targetCar || ctx?.player?.inCar;
        if (car?.isExtraVehicle) {
          return repairAndResprayExtra(car, customColor, finishType);
        }
        return origRepair(targetCar, customColor);
      };

      vehApi.updateVehicles = function updateVehicles(arg0, arg1) {
        const rawDt = typeof arg0 === 'number' ? arg0 : (typeof arg1 === 'number' ? arg1 : 0.016);
        const safeDt = Math.min(Math.max(0.0005, Number(rawDt) || 0.016), 0.05);

        // 1) Handle [F]/[E] enter/exit when targeting or riding an Extra Vehicle BEFORE `origUpdate`
        const drvInput = readExtraDrivingInput();
        let consumedInteract = false;

        if (drvInput.interactJust && enterExitDebounce <= 0 && ctx?.player && !ctx.player.isDead) {
          if (ctx.player.inCar?.isExtraVehicle) {
            exitExtraVehicle(false);
            consumedInteract = true;
          } else if (!ctx.player.inCar && !ctx.player.rappelState?.active && ctx.player.x < 500) {
            const nearDoorway =
              Math.hypot(ctx.player.x - 24, ctx.player.z - (-80)) < 2.8 ||
              Math.hypot(ctx.player.x - 209.5, ctx.player.z - (-110)) < 2.8 ||
              Math.hypot(ctx.player.x - (-129), ctx.player.z - (-95)) < 2.8 ||
              Math.hypot(ctx.player.x - 111, ctx.player.z - (-120)) < 2.8;
            if (!nearDoorway) {
              const cand = vehApi.findNearestEnterable(ctx.player.x, ctx.player.y, ctx.player.z, 5.0);
              if (cand?.isExtraVehicle) {
                enterExtraVehicle(cand);
                consumedInteract = true;
              }
            }
          }
        }

        // 2) Temporarily shield `isExtraVehicle` entries from `origUpdate` so base `stepGroundCar`
        //    never drowns boats at X < -206 or overrides motorcycle wheelies/banking!
        const stashedExtras = [];
        for (let i = vehApi.list.length - 1; i >= 0; i--) {
          if (vehApi.list[i]?.isExtraVehicle) {
            stashedExtras.push(vehApi.list[i]);
            vehApi.list.splice(i, 1);
          }
        }

        const inp = ctx?.input;
        let savedIntJust = false;
        let savedEEJust = false;
        let savedVehJust = false;
        let savedKeyF = false;
        let savedKeyE = false;
        if (consumedInteract && inp) {
          savedIntJust = inp.interactJustPressed;
          savedEEJust = inp.enterExitJustPressed;
          savedVehJust = inp.vehicleJustPressed;
          inp.interactJustPressed = false;
          inp.enterExitJustPressed = false;
          inp.vehicleJustPressed = false;
          if (inp.keys) {
            savedKeyF = inp.keys.KeyF;
            savedKeyE = inp.keys.KeyE;
            inp.keys.KeyF = false;
            inp.keys.KeyE = false;
          }
        }

        try {
          origUpdate(arg0, arg1);
        } finally {
          for (let i = stashedExtras.length - 1; i >= 0; i--) {
            vehApi.list.push(stashedExtras[i]);
          }
          if (consumedInteract && inp) {
            inp.interactJustPressed = savedIntJust;
            inp.enterExitJustPressed = savedEEJust;
            inp.vehicleJustPressed = savedVehJust;
            if (inp.keys) {
              inp.keys.KeyF = savedKeyF;
              inp.keys.KeyE = savedKeyE;
            }
          }
        }

        // 3) Step all Extra Vehicles, Buoyancy, Wheelies, Tank Shells & Collisions!
        stepExtraSystemOnce(safeDt, Number(ctx?.rawDt) || safeDt);
      };
    }

    if (ctx?.engine && typeof ctx.engine.updateCamera === 'function' && !cameraWrapped) {
      cameraWrapped = true;
      const origUpdateCam = ctx.engine.updateCamera.bind(ctx.engine);
      ctx.engine.updateCamera = function updateCamera(dt, overrideCtx) {
        const activeCtx = overrideCtx || ctx;
        const p = activeCtx?.player;
        if (
          cockpitSys.isCockpitView() &&
          p?.inCar &&
          !p.isDead &&
          !p.rappelState?.active &&
          !activeCtx?.activeModal
        ) {
          cockpitSys.updateCockpitCamera(dt, activeCtx);
          return;
        }
        cockpitSys.setPlayerHeadVisible(activeCtx, true);
        origUpdateCam(dt, overrideCtx);

        // Sweeping Third-Person Jet Chase Camera pullback for 15.8m Cửu Thiên Thần Ưng!
        if (p?.inCar?.isJet && activeCtx?.engine?.camera && !activeCtx?.activeModal) {
          const cam = activeCtx.engine.camera;
          const jet = p.inCar;
          cam.getWorldDirection(_vA);
          cam.position.addScaledVector ? cam.position.addScaledVector(_vA, -10.5) : (
            cam.position.x -= _vA.x * 10.5,
            cam.position.y -= _vA.y * 10.5,
            cam.position.z -= _vA.z * 10.5
          );
          cam.position.y += 2.25;
          const minCamY = oceanSampler.sampleGround(cam.position.x, cam.position.z, jet.y) + 0.85;
          if (cam.position.y < minCamY) cam.position.y = minCamY;
          cam.updateMatrixWorld(true);
        }
      };
    }
  }

  // --------------------------------------------------------------------------
  // SPAWN INITIAL WORLD HERO EXTRA FLEET
  // --------------------------------------------------------------------------
  function spawnInitialWorldExtraFleet() {
    if (initialFleetSpawned || !ctx?.vehicles?.list) return;
    initialFleetSpawned = true;

    // 1. Xích Thố Thần Câu Superbike parked on West Sidewalk of Đại Lộ Chu Tước (27.4, 0.22, 8.0)!
    spawnExtraVehicle('superbike', 27.4, 0.22, 8.0, Math.PI, {
      color: 0xd91e2a,
      accentColor: 0xf8fafc,
      plate: 'BATI 801',
      isParked: true,
      isHero: true
    });

    // 2. Thanh Long Siêu Chiến Xa parked on East Sidewalk Bay of Đại Lộ Chu Tước (52.8, 0.22, 10.0)!
    spawnExtraVehicle('zentorno', 52.8, 0.22, 10.0, Math.PI, {
      color: 0x12141a,
      accentColor: 0x00f0ff,
      plate: 'ZNT V12X',
      isParked: true,
      isHero: true
    });

    // 3. Gold/Crimson VIP Thanh Long Siêu Chiến Xa on East Sidewalk Bay (209.2, 0.22, -101.0)!
    spawnExtraVehicle('zentorno', 209.2, 0.22, -101.0, 0, {
      color: 0xd4af37,
      accentColor: 0xff2a55,
      plate: 'VIP GOLD',
      isParked: true,
      isHero: true
    });

    // 4. Hắc Phong Thiết Kỵ V-Twin Chopper Cruiser on West Sidewalk Bay (-129.2, 0.22, -88.0)!
    spawnExtraVehicle('chopper', -129.2, 0.22, -88.0, 0, {
      color: 0x111318,
      accentColor: 0xf59e0b,
      plate: 'DMN 1969',
      isParked: true,
      isHero: true
    });

    // 5. Bích Ba Du Thuyền Mahogany & Pearl-White Luxury Speedboat moored at Bồng Lai Marina (-218, 0, 95)!
    spawnExtraVehicle('speedboat', -218.0, null, 95.0, -Math.PI * 0.5, {
      color: 0x6e2c14,
      accentColor: 0xd4af37,
      plate: 'TORO V12',
      isParked: true,
      isHero: true
    });

    // 6. Lãng Lý Phi Chu Jet Ski moored at Bồng Lai Pier (-218, 0, -28)!
    spawnExtraVehicle('jetski', -218.0, null, -28.0, -Math.PI * 0.5, {
      color: 0x06b6d4,
      accentColor: 0x0f172a,
      plate: 'SEA 808',
      isParked: true,
      isHero: true
    });

    // 7. Companion Lãng Lý Phi Chu Jet Ski at Bồng Lai Marina Slip (-218, 0, 86)!
    spawnExtraVehicle('jetski', -218.0, null, 86.0, -Math.PI * 0.5, {
      color: 0xfacc15,
      accentColor: 0x111827,
      plate: 'JET 777',
      isParked: true,
      isHero: true
    });

    // 8. Huyền Vũ Thiết Giáp Xa (800 HP, 120mm Cannon) at Tactical Precinct Staging Yard!
    spawnExtraVehicle('rhino_tank', 141.5, 0.05, 92.0, -Math.PI * 0.5, {
      color: 0x4a553b,
      accentColor: 0x292f22,
      plate: 'USMC 04A',
      isParked: true,
      isHero: true
    });

    // 9. Cửu Thiên Thần Ưng (Luxor Executive Twin-Jet) parked at Coastal Plaza (-158, 0.40, 185), completely off all roads!
    spawnExtraVehicle('luxor_jet', -158.0, 0.40, 185.0, Math.PI, {
      color: 0x12151e,
      accentColor: 0xd4af37,
      plate: 'THIEN 09',
      isParked: true,
      isHero: true
    });
  }

  function init(overrideCtx) {
    if (overrideCtx && overrideCtx !== ctx) {
      Object.assign(ctx, overrideCtx);
    }
    bindGlobalListeners();
    wrapCoreSystems();
    spawnInitialWorldExtraFleet();
    initialized = true;
    return api;
  }

  function update(arg0, arg1) {
    if (!initialized || !vehiclesWrapped || !cameraWrapped) {
      init();
    }
    const rawDt = typeof arg0 === 'number' ? arg0 : (typeof arg1 === 'number' ? arg1 : 0.016);
    if (!Number.isFinite(rawDt) || rawDt <= 0) return;
    const dt = Math.min(rawDt, 0.05);
    stepExtraSystemOnce(dt, Number(ctx?.rawDt) || dt);
  }

  const api = {
    init,
    update,
    spawnExtraVehicle,
    toggleCockpitView: cockpitSys.toggleCockpitView,
    isCockpitView: cockpitSys.isCockpitView,
    extraTypes: EXTRA_TYPES,
    archetypes: EXTRA_ARCHETYPES
  };

  if (ctx && typeof ctx === 'object') {
    ctx.vehiclesExtra = api;
    if (ctx.vehicles) {
      init(ctx);
    }
  }

  return api;
}
