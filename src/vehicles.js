// ============================================================================
// GIANG HỒ ĐẠI LỘ & BỜ BIỂN 3D — SCULPTED PBR VEHICLES, SUSPENSION & PHI CHU
// ============================================================================

export function createVehicleSystem(ctx = {}, THREE) {
  const isMobile = Boolean(ctx?.isMobile || ctx?.engine?.isMobile);
  const UP_AXIS = new THREE.Vector3(0, 1, 0);
  const _tmpVecA = new THREE.Vector3();
  const _tmpVecB = new THREE.Vector3();
  const _tmpQuatA = new THREE.Quaternion();
  const _tmpMat4 = new THREE.Matrix4();
  const _tmpScale = new THREE.Vector3();
  const _tmpColor = new THREE.Color();

  function vClamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function vLerp(a, b, t) {
    return a + (b - a) * t;
  }

  function vSmoothDamp(current, target, lambda, dt) {
    return vLerp(current, target, 1 - Math.exp(-lambda * dt));
  }

  function vWrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  const ARCHETYPE_ALIASES = {
    obey9f: 'obey9f',
    super: 'obey9f',
    sports: 'obey9f',
    cabrio: 'obey9f',
    r8: 'obey9f',
    sedan_lux: 'sedan_lux',
    sedan: 'sedan_lux',
    tailgater: 'sedan_lux',
    luxury: 'sedan_lux',
    banshee: 'banshee',
    coupe: 'banshee',
    muscle: 'banshee',
    suv: 'suv',
    baller: 'suv',
    truck: 'suv',
    taxi: 'taxi',
    cab: 'taxi',
    police: 'police',
    cop: 'police',
    cruiser: 'police',
    lspd: 'police',
    interceptor: 'police',
    swat_van: 'swat_van',
    swat: 'swat_van',
    noose: 'swat_van',
    van: 'swat_van',
    granger: 'swat_van',
    heli: 'heli',
    helicopter: 'heli',
    maverick: 'heli',
    chopper: 'heli'
  };

  const VEHICLE_ARCHETYPES = {
    obey9f: {
      type: 'obey9f',
      name: 'Bạch Long Chiến Xa (9F)',
      category: 'Siêu xe mui trần Giang Hồ',
      label: 'Bạch Long Chiến Xa — Siêu xe mui trần',
      width: 2.06,
      length: 4.58,
      height: 1.22,
      wheelRadius: 0.35,
      wheelWidth: 0.28,
      wheelTrack: 0.90,
      wheelBaseF: 1.38,
      wheelBaseR: -1.34,
      maxSpeed: 42,
      accel: 31,
      maxHp: 140,
      mass: 1.05,
      grip: 1.14,
      driftFactor: 0.90,
      stiffness: 1.30,
      isOpenTop: true,
      midEngine: true,
      quadExhaust: true,
      rimStyle: '5spoke',
      seatX: 0.40,
      seatY: 0.33,
      seatZ: -0.10,
      palette: [0xf2f4f7, 0xd9dee6, 0xc81d25, 0x1e56a0, 0xf5b700]
    },
    sedan_lux: {
      type: 'sedan_lux',
      name: 'Hắc Lân Kiệu (Tailgater)',
      category: 'Hào xa Vương Gia',
      label: 'Hắc Lân Kiệu — Hào xa hạng sang',
      width: 1.98,
      length: 4.86,
      height: 1.42,
      wheelRadius: 0.36,
      wheelWidth: 0.24,
      wheelTrack: 0.87,
      wheelBaseF: 1.48,
      wheelBaseR: -1.44,
      maxSpeed: 31,
      accel: 23,
      maxHp: 150,
      mass: 1.28,
      grip: 1.02,
      driftFactor: 0.82,
      stiffness: 0.95,
      isOpenTop: false,
      midEngine: false,
      quadExhaust: false,
      rimStyle: '10spoke',
      seatX: 0.39,
      seatY: 0.38,
      seatZ: -0.05,
      palette: [0x14171c, 0x222831, 0xadb5bd, 0x1b2a41, 0xe9ecef]
    },
    banshee: {
      type: 'banshee',
      name: 'Xích Hỏa Thần Mã (Banshee)',
      category: 'Chiến mã tốc độ cao',
      label: 'Xích Hỏa Thần Mã — Coupe tốc độ',
      width: 2.04,
      length: 4.68,
      height: 1.26,
      wheelRadius: 0.35,
      wheelWidth: 0.28,
      wheelTrack: 0.89,
      wheelBaseF: 1.42,
      wheelBaseR: -1.36,
      maxSpeed: 39,
      accel: 29,
      maxHp: 140,
      mass: 1.12,
      grip: 1.05,
      driftFactor: 0.96,
      stiffness: 1.18,
      isOpenTop: false,
      midEngine: false,
      quadExhaust: true,
      hasStripe: true,
      hasSpoiler: true,
      rimStyle: '5spoke',
      seatX: 0.39,
      seatY: 0.34,
      seatZ: -0.22,
      palette: [0x9e1b22, 0x1b427a, 0x191c21, 0xd95d1e]
    },
    suv: {
      type: 'suv',
      name: 'Thiết Giáp Hộ Pháp (SUV)',
      category: 'Trọng xa Hộ Pháp',
      label: 'Thiết Giáp Hộ Pháp — SUV hạng sang',
      width: 2.12,
      length: 4.92,
      height: 1.76,
      wheelRadius: 0.43,
      wheelWidth: 0.29,
      wheelTrack: 0.93,
      wheelBaseF: 1.50,
      wheelBaseR: -1.46,
      maxSpeed: 28,
      accel: 21,
      maxHp: 180,
      mass: 1.70,
      grip: 0.97,
      driftFactor: 0.72,
      stiffness: 0.78,
      isOpenTop: false,
      midEngine: false,
      quadExhaust: false,
      rimStyle: '5spoke',
      seatX: 0.42,
      seatY: 0.56,
      seatZ: 0.02,
      palette: [0x1d4d4f, 0x2a2e35, 0xedf0f5, 0x4a191c]
    },
    taxi: {
      type: 'taxi',
      name: 'Dịch Trạm Phi Xa (Taxi)',
      category: 'Xa mã Dịch Trạm',
      label: 'Dịch Trạm Phi Xa — Xe Đô Thị',
      width: 1.96,
      length: 4.78,
      height: 1.44,
      wheelRadius: 0.36,
      wheelWidth: 0.24,
      wheelTrack: 0.86,
      wheelBaseF: 1.44,
      wheelBaseR: -1.42,
      maxSpeed: 29,
      accel: 22,
      maxHp: 135,
      mass: 1.22,
      grip: 0.99,
      driftFactor: 0.84,
      stiffness: 0.92,
      isOpenTop: false,
      midEngine: false,
      quadExhaust: false,
      rimStyle: '10spoke',
      seatX: 0.38,
      seatY: 0.38,
      seatZ: -0.04,
      palette: [0xf2b718]
    },
    police: {
      type: 'police',
      name: 'Tuần Phòng Lục Phiến Môn',
      category: 'Chiến xa Bộ Đầu',
      label: 'Tuần Phòng Lục Phiến Môn — Quan Sai',
      width: 2.02,
      length: 4.92,
      height: 1.45,
      wheelRadius: 0.37,
      wheelWidth: 0.26,
      wheelTrack: 0.89,
      wheelBaseF: 1.48,
      wheelBaseR: -1.44,
      maxSpeed: 36,
      accel: 27,
      maxHp: 150,
      mass: 1.42,
      grip: 1.07,
      driftFactor: 0.85,
      stiffness: 1.08,
      isOpenTop: false,
      midEngine: false,
      quadExhaust: false,
      isPolice: true,
      rimStyle: '5spoke',
      seatX: 0.39,
      seatY: 0.39,
      seatZ: -0.04,
      palette: [0x111318]
    },
    swat_van: {
      type: 'swat_van',
      name: 'Thiết Xa Cẩm Y Vệ',
      category: 'Trọng giáp Cẩm Y Vệ',
      label: 'Thiết Xa Cẩm Y Vệ — Thiết Giáp Triều Đình',
      width: 2.26,
      length: 5.45,
      height: 2.04,
      wheelRadius: 0.46,
      wheelWidth: 0.32,
      wheelTrack: 0.99,
      wheelBaseF: 1.68,
      wheelBaseR: -1.62,
      maxSpeed: 28,
      accel: 21,
      maxHp: 260,
      mass: 2.40,
      grip: 0.96,
      driftFactor: 0.65,
      stiffness: 0.86,
      isOpenTop: false,
      midEngine: false,
      quadExhaust: false,
      isPolice: true,
      isMatte: true,
      rimStyle: '5spoke',
      seatX: 0.46,
      seatY: 0.68,
      seatZ: 0.18,
      palette: [0x24141c]
    },
    heli: {
      type: 'heli',
      name: 'Thiên Ưng Phi Chu',
      category: 'Phi chu Cửu Thiên',
      label: 'Thiên Ưng Phi Chu — Trực Thăng Bay',
      width: 2.35,
      length: 9.20,
      height: 3.15,
      wheelRadius: 0.0,
      maxSpeed: 46,
      accel: 26,
      maxHp: 210,
      mass: 1.85,
      grip: 1.0,
      driftFactor: 1.0,
      stiffness: 1.0,
      isHeli: true,
      isOpenTop: false,
      seatX: 0.38,
      seatY: 0.85,
      seatZ: 0.75,
      palette: [0x1c232d, 0xf0f4f8, 0x16325c]
    }
  };

  const RESPRY_SHOWROOM_COLORS = [
    0xf2f4f7,
    0xc81d25,
    0x1b7a5e,
    0x14171c,
    0xf0c35a,
    0x1b427a,
    0x8c2d19,
    0x5e2899
  ];

  // ==========================================================================
  // PROCEDURAL CANVAS TEXTURES
  // ==========================================================================
  function makeTextureCache() {
    const cache = new Map();

    function getPlateTexture(plateText = 'VL 8888') {
      const key = `plate_${plateText}`;
      if (cache.has(key)) return cache.get(key);
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 128;
      const g = c.getContext('2d');

      const grad = g.createLinearGradient(0, 0, 0, 128);
      grad.addColorStop(0, '#fffaf0');
      grad.addColorStop(0.5, '#f5ecd8');
      grad.addColorStop(1, '#e6d8bc');
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 128);

      g.strokeStyle = '#8c1d28';
      g.lineWidth = 6;
      g.strokeRect(5, 5, 246, 118);

      g.fillStyle = '#b8861b';
      g.fillRect(18, 13, 220, 4);
      g.font = 'italic bold 21px Georgia, serif';
      g.fillStyle = '#9e1b24';
      g.textAlign = 'center';
      g.fillText('Võ Lâm Đô Thị', 128, 37);

      g.font = 'bold 50px "Arial Black", Impact, sans-serif';
      g.fillStyle = 'rgba(0,0,0,0.16)';
      g.fillText(plateText, 130, 98);
      g.fillStyle = '#182438';
      g.fillText(plateText, 128, 96);

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      cache.set(key, tex);
      return tex;
    }

    function getHeadlightConeTexture() {
      const key = 'headlight_cone';
      if (cache.has(key)) return cache.get(key);
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 256;
      const g = c.getContext('2d');
      g.clearRect(0, 0, 128, 256);

      for (let y = 0; y < 256; y++) {
        const v = y / 255;
        const halfW = 14 + v * 48;
        const alpha = Math.pow(1 - v, 1.65) * 0.48;
        const rg = g.createLinearGradient(64 - halfW, y, 64 + halfW, y);
        rg.addColorStop(0, 'rgba(220,238,255,0)');
        rg.addColorStop(0.28, `rgba(220,238,255,${(alpha * 0.65).toFixed(4)})`);
        rg.addColorStop(0.5, `rgba(255,248,225,${alpha.toFixed(4)})`);
        rg.addColorStop(0.72, `rgba(220,238,255,${(alpha * 0.65).toFixed(4)})`);
        rg.addColorStop(1, 'rgba(220,238,255,0)');
        g.fillStyle = rg;
        g.fillRect(0, y, 128, 1);
      }

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      cache.set(key, tex);
      return tex;
    }

    function getDecalTexture(kind) {
      const key = `decal_${kind}`;
      if (cache.has(key)) return cache.get(key);
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 128;
      const g = c.getContext('2d');

      if (kind === 'lspd_door') {
        g.fillStyle = '#f6f1e6';
        g.fillRect(0, 0, 256, 128);
        g.fillStyle = '#d4af37';
        g.beginPath();
        g.arc(46, 64, 24, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#8c1922';
        g.lineWidth = 3;
        g.stroke();
        g.fillStyle = '#18141c';
        g.font = 'bold 26px "Segoe UI", Arial, sans-serif';
        g.textAlign = 'left';
        g.fillText('LỤC PHIẾN MÔN', 78, 62);
        g.font = 'bold 14px Arial, sans-serif';
        g.fillStyle = '#8c1922';
        g.fillText('PHỤNG MỆNH TUẦN TRA', 78, 88);
      } else if (kind === 'taxi_sign') {
        g.fillStyle = '#ffcf33';
        g.fillRect(0, 0, 256, 128);
        g.strokeStyle = '#8c1922';
        g.lineWidth = 8;
        g.strokeRect(4, 4, 248, 120);
        g.fillStyle = '#111111';
        g.font = 'bold 42px "Segoe UI", Impact, sans-serif';
        g.textAlign = 'center';
        g.fillText('DỊCH TRẠM', 128, 80);
      } else if (kind === 'taxi_side') {
        g.fillStyle = '#f2b718';
        g.fillRect(0, 0, 256, 128);
        g.fillStyle = '#8c1922';
        g.fillRect(0, 82, 256, 46);
        for (let i = 0; i < 16; i++) {
          g.fillStyle = i % 2 === 0 ? '#111318' : '#fff8e6';
          g.fillRect(i * 16, 62, 16, 10);
          g.fillStyle = i % 2 === 1 ? '#111318' : '#fff8e6';
          g.fillRect(i * 16, 72, 16, 10);
        }
        g.fillStyle = '#111318';
        g.font = 'bold 24px "Segoe UI", Arial, sans-serif';
        g.textAlign = 'center';
        g.fillText('DỊCH TRẠM PHI XA', 128, 44);
      } else if (kind === 'noose_side') {
        g.fillStyle = '#24141c';
        g.fillRect(0, 0, 256, 128);
        g.strokeStyle = '#f0c35a';
        g.lineWidth = 4;
        g.strokeRect(10, 18, 236, 92);
        g.fillStyle = '#f0c35a';
        g.font = 'bold 38px "Segoe UI", Impact, sans-serif';
        g.textAlign = 'center';
        g.fillText('CẨM Y VỆ', 128, 66);
        g.font = 'bold 15px Arial, sans-serif';
        g.fillStyle = '#f5eee0';
        g.fillText('THIẾT GIÁP TRỌNG BINH', 128, 94);
      } else if (kind === 'gauges') {
        g.fillStyle = '#090d14';
        g.fillRect(0, 0, 256, 128);
        for (const cx of [72, 168]) {
          g.strokeStyle = '#2ec486';
          g.lineWidth = 5;
          g.beginPath();
          g.arc(cx, 68, 36, Math.PI * 0.75, Math.PI * 2.25);
          g.stroke();
          g.strokeStyle = '#f0c35a';
          g.lineWidth = 3;
          g.beginPath();
          g.arc(cx, 68, 12, 0, Math.PI * 2);
          g.stroke();
          g.beginPath();
          g.moveTo(cx, 68);
          g.lineTo(cx + 24, 48);
          g.stroke();
        }
      }

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      cache.set(key, tex);
      return tex;
    }

    function getRotorBlurTexture() {
      const key = 'rotor_blur';
      if (cache.has(key)) return cache.get(key);
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const g = c.getContext('2d');
      g.clearRect(0, 0, 256, 256);

      const rg = g.createRadialGradient(128, 128, 12, 128, 128, 124);
      rg.addColorStop(0, 'rgba(30,35,42,0.55)');
      rg.addColorStop(0.55, 'rgba(60,68,78,0.22)');
      rg.addColorStop(0.90, 'rgba(140,155,170,0.16)');
      rg.addColorStop(0.96, 'rgba(240,195,90,0.34)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg;
      g.beginPath();
      g.arc(128, 128, 124, 0, Math.PI * 2);
      g.fill();

      g.save();
      g.translate(128, 128);
      for (let i = 0; i < 4; i++) {
        g.rotate(Math.PI / 2);
        g.fillStyle = 'rgba(25,30,36,0.26)';
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, 122, -0.18, 0.18);
        g.closePath();
        g.fill();
      }
      g.restore();

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      cache.set(key, tex);
      return tex;
    }

    function getCarBlobShadowTexture() {
      const key = 'car_blob_shadow';
      if (cache.has(key)) return cache.get(key);
      if (typeof document === 'undefined') return null;
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 128;
      const g = c.getContext('2d');
      if (g) {
        g.clearRect(0, 0, 64, 128);
        g.save();
        g.translate(32, 64);
        g.scale(1, 2);
        const rg = g.createRadialGradient(0, 0, 5, 0, 0, 30);
        rg.addColorStop(0, 'rgba(0,0,0,0.58)');
        rg.addColorStop(0.55, 'rgba(0,0,0,0.32)');
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg;
        g.fillRect(-32, -32, 64, 64);
        g.restore();
      }
      const tex = new THREE.CanvasTexture(c);
      cache.set(key, tex);
      return tex;
    }

    return {
      getPlateTexture,
      getHeadlightConeTexture,
      getDecalTexture,
      getRotorBlurTexture,
      getCarBlobShadowTexture
    };
  }

  // ==========================================================================
  // 3D AUTOMOTIVE SCULPTING & SHARED GEOMETRIES
  // ==========================================================================
  function buildSculptedBodyGeometry(shape, bodyWidth, sculptOpts = {}) {
    const bevelSize = sculptOpts.bevelSize ?? 0.10;
    const bevelThickness = sculptOpts.bevelThickness ?? 0.14;
    const bevelSegments = isMobile ? 1 : (sculptOpts.bevelSegments ?? 3);
    const depth = Math.max(0.12, bodyWidth - bevelThickness * 2);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness,
      bevelSize,
      bevelSegments,
      curveSegments: isMobile ? 8 : 18,
      steps: isMobile ? 1 : 2
    });

    geo.translate(0, 0, -depth * 0.5);
    geo.rotateY(-Math.PI * 0.5);

    const pos = geo.attributes.position;
    const halfL = sculptOpts.halfLength || 2.3;
    const halfW = bodyWidth * 0.5;
    const beltY = sculptOpts.beltY ?? 0.80;
    const tumblehome = sculptOpts.tumblehome ?? 0.14;
    const noseRound = sculptOpts.noseRound ?? 0.16;
    const tailRound = sculptOpts.tailRound ?? 0.11;
    const waistPinch = sculptOpts.waistPinch ?? 0.035;
    const archFlare = sculptOpts.archFlare ?? 0.045;
    const zFront = sculptOpts.zFront ?? 1.40;
    const zRear = sculptOpts.zRear ?? -1.36;
    const crown = sculptOpts.crown ?? 0.025;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      const nx = halfW > 0.01 ? vClamp(x / halfW, -1, 1) : 0;
      const absNx = Math.abs(nx);

      if (z > halfL * 0.52) {
        const t = vClamp((z - halfL * 0.52) / (halfL * 0.48), 0, 1);
        x *= 1 - noseRound * t * t;
        z -= 0.12 * absNx * absNx * t;
        if (y > 0.42) y -= 0.045 * absNx * absNx * t;
      } else if (z < -halfL * 0.58) {
        const t = vClamp((-z - halfL * 0.58) / (halfL * 0.42), 0, 1);
        x *= 1 - tailRound * t * t;
        z += 0.08 * absNx * absNx * t;
      }

      const dFront = (z - zFront) / 0.58;
      const dRear = (z - zRear) / 0.62;
      const flareF = Math.exp(-dFront * dFront) * archFlare;
      const flareR = Math.exp(-dRear * dRear) * archFlare * 1.15;
      const midDoor = Math.exp(-(z * z) / 0.85) * waistPinch;
      if (y < beltY + 0.12) {
        x *= 1 + flareF + flareR - midDoor;
      }

      if (y > beltY) {
        const hAbove = y - beltY;
        x *= Math.max(0.70, 1 - tumblehome * hAbove);
      }

      if (y > 0.55 && absNx < 0.96) {
        y += crown * (1 - nx * nx);
      }

      pos.setXYZ(i, x, y, z);
    }

    geo.computeVertexNormals();
    return geo;
  }

  function createCarBodyProfile(pts, wheelY, archR, zRear, zFront, bottomY = 0.19) {
    const s = new THREE.Shape();
    const rearEnd = pts[0][0];
    const frontEnd = pts[pts.length - 1][0];

    s.moveTo(rearEnd, pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (p.length === 4) s.quadraticCurveTo(p[0], p[1], p[2], p[3]);
      else if (p.length === 6) s.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
      else s.lineTo(p[0], p[1]);
    }

    s.lineTo(frontEnd - 0.06, bottomY + 0.02);
    s.lineTo(zFront + archR, bottomY);
    s.absarc(zFront, wheelY, archR, 0, Math.PI, false);
    s.lineTo(zRear + archR, bottomY);
    s.absarc(zRear, wheelY, archR, 0, Math.PI, false);
    s.lineTo(rearEnd + 0.06, bottomY + 0.04);
    s.closePath();
    return s;
  }

  function makeSharedGeometries() {
    const cache = {};

    cache.getWheelParts = (radius, width, rimStyle = '5spoke') => {
      const key = `w_${radius.toFixed(2)}_${width.toFixed(2)}_${rimStyle}`;
      if (cache[key]) return cache[key];

      const treadGeo = new THREE.CylinderGeometry(radius, radius, width * 0.78, 28, 1);
      treadGeo.rotateZ(Math.PI * 0.5);

      const shoulderGeo = new THREE.TorusGeometry(radius * 0.85, radius * 0.155, 12, 28);
      shoulderGeo.rotateY(Math.PI * 0.5);

      const rimRadius = radius * 0.68;
      const barrelGeo = new THREE.CylinderGeometry(rimRadius, rimRadius * 0.94, width * 0.82, 24, 1, true);
      barrelGeo.rotateZ(Math.PI * 0.5);

      const lipGeo = new THREE.TorusGeometry(rimRadius, radius * 0.042, 10, 26);
      lipGeo.rotateY(Math.PI * 0.5);

      const hubGeo = new THREE.CylinderGeometry(radius * 0.17, radius * 0.19, width * 0.86, 16);
      hubGeo.rotateZ(Math.PI * 0.5);

      const spokeCount = rimStyle === '10spoke' ? 10 : 5;
      const spokeThick = rimStyle === '10spoke' ? radius * 0.048 : radius * 0.082;
      const spokeGeo = new THREE.BoxGeometry(width * 0.14, rimRadius * 0.92, spokeThick);

      const discGeo = new THREE.CylinderGeometry(rimRadius * 0.78, rimRadius * 0.78, width * 0.12, 20);
      discGeo.rotateZ(Math.PI * 0.5);

      const caliperGeo = new THREE.BoxGeometry(width * 0.34, radius * 0.34, radius * 0.22);

      cache[key] = {
        treadGeo,
        shoulderGeo,
        barrelGeo,
        lipGeo,
        hubGeo,
        spokeGeo,
        spokeCount,
        discGeo,
        caliperGeo,
        rimRadius
      };
      return cache[key];
    };

    const seatShape = new THREE.Shape();
    seatShape.moveTo(-0.22, 0.0);
    seatShape.lineTo(0.24, 0.02);
    seatShape.quadraticCurveTo(0.28, 0.11, 0.20, 0.13);
    seatShape.lineTo(-0.08, 0.11);
    seatShape.quadraticCurveTo(-0.22, 0.42, -0.28, 0.68);
    seatShape.quadraticCurveTo(-0.30, 0.84, -0.21, 0.85);
    seatShape.quadraticCurveTo(-0.14, 0.84, -0.14, 0.68);
    seatShape.lineTo(-0.02, 0.12);
    seatShape.closePath();
    const seatGeo = new THREE.ExtrudeGeometry(seatShape, {
      depth: 0.38,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.035,
      bevelSegments: 2,
      curveSegments: 10
    });
    seatGeo.translate(0, 0, -0.19);
    seatGeo.rotateY(-Math.PI * 0.5);
    cache.bucketSeatGeo = seatGeo;

    cache.steerRimGeo = new THREE.TorusGeometry(0.175, 0.024, 10, 24);
    cache.steerHubGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.04, 14);
    cache.steerHubGeo.rotateX(Math.PI * 0.5);
    cache.steerSpokeGeo = new THREE.BoxGeometry(0.32, 0.026, 0.022);

    cache.exhaustOuterGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.22, 14);
    cache.exhaustOuterGeo.rotateX(Math.PI * 0.5);
    cache.exhaustInnerGeo = new THREE.CylinderGeometry(0.044, 0.044, 0.23, 12);
    cache.exhaustInnerGeo.rotateX(Math.PI * 0.5);

    const conePlane = new THREE.PlaneGeometry(3.4, 16.5);
    conePlane.rotateX(-Math.PI * 0.5);
    conePlane.translate(0, 0.04, 8.6);
    cache.headlightGroundGeo = conePlane;
    cache.archetypeMeshes = {};

    return cache;
  }

  function makeSharedStaticMaterials(texCache) {
    const CarMat = isMobile ? THREE.MeshStandardMaterial : THREE.MeshPhysicalMaterial;
    const physExtra = (cc, ccr, envI) => (isMobile ? {} : { clearcoat: cc, clearcoatRoughness: ccr, envMapIntensity: envI });
    return {
      tireRubber: new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.80, metalness: 0.08 }),
      alloyChrome: new CarMat({
        color: 0xe6e0d4,
        metalness: 0.90,
        roughness: 0.16,
        ...physExtra(0.85, 0.08, 1.5)
      }),
      imperialGoldTrim: new THREE.MeshStandardMaterial({
        color: 0xf0c35a,
        metalness: 0.88,
        roughness: 0.20
      }),
      darkAlloy: new THREE.MeshStandardMaterial({ color: 0x262b33, metalness: 0.72, roughness: 0.28 }),
      brakeDisc: new THREE.MeshStandardMaterial({ color: 0x8d96a3, metalness: 0.82, roughness: 0.32 }),
      brakeCaliperRed: new THREE.MeshStandardMaterial({ color: 0xd91e2a, metalness: 0.35, roughness: 0.28 }),
      tintedGlass: new CarMat({
        color: 0x0b131e,
        metalness: 0.15,
        roughness: 0.08,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
        ...physExtra(1.0, 0.04, 1.65)
      }),
      carbonTrim: new THREE.MeshStandardMaterial({ color: 0x16191f, metalness: 0.35, roughness: 0.42 }),
      matteBlack: new THREE.MeshStandardMaterial({ color: 0x0d0f13, metalness: 0.15, roughness: 0.85 }),
      leatherDark: new THREE.MeshStandardMaterial({ color: 0x1b1e24, metalness: 0.08, roughness: 0.65 }),
      leatherSportRed: new THREE.MeshStandardMaterial({ color: 0x851d24, metalness: 0.10, roughness: 0.55 }),
      whiteStripe: new CarMat({
        color: 0xf0c35a,
        metalness: 0.65,
        roughness: 0.16,
        ...physExtra(1.0, 0.06, 1.2)
      }),
      lspdWhite: new CarMat({
        color: 0xf6f1e6,
        metalness: 0.35,
        roughness: 0.16,
        ...physExtra(1.0, 0.07, 1.2)
      }),
      taxiBlue: new CarMat({
        color: 0x8c1922,
        metalness: 0.40,
        roughness: 0.18,
        ...physExtra(1.0, 0.08, 1.2)
      }),
      mirrorSilver: new CarMat({ color: 0xffffff, metalness: 0.98, roughness: 0.05 }),
      gaugesGlow: new THREE.MeshBasicMaterial({ map: texCache.getDecalTexture('gauges') }),
      lspdDoorMat: new CarMat({
        map: texCache.getDecalTexture('lspd_door'),
        metalness: 0.25,
        roughness: 0.18,
        ...physExtra(0.9, 0.1, 1.1)
      }),
      taxiSignMat: new THREE.MeshStandardMaterial({
        map: texCache.getDecalTexture('taxi_sign'),
        emissive: 0xffc833,
        emissiveMap: texCache.getDecalTexture('taxi_sign'),
        emissiveIntensity: 1.15,
        roughness: 0.3
      }),
      taxiSideMat: new CarMat({
        map: texCache.getDecalTexture('taxi_side'),
        metalness: 0.3,
        roughness: 0.18,
        ...physExtra(0.9, 0.1, 1.1)
      }),
      nooseSideMat: new THREE.MeshStandardMaterial({
        map: texCache.getDecalTexture('noose_side'),
        metalness: 0.3,
        roughness: 0.45
      }),
      headlightConeMat: new THREE.MeshBasicMaterial({
        map: texCache.getHeadlightConeTexture(),
        transparent: true,
        opacity: 0.58,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      }),
      rotorBlurMat: new THREE.MeshBasicMaterial({
        map: texCache.getRotorBlurTexture(),
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        side: THREE.DoubleSide
      }),
      searchlightConeMat: new THREE.MeshBasicMaterial({
        color: 0xffecc2,
        transparent: true,
        opacity: 0.19,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      }),
      carBlobShadow: new THREE.MeshBasicMaterial({
        color: 0x000000,
        map: texCache.getCarBlobShadowTexture(),
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      })
    };
  }

  function getArchetypeSculptedGeos(def, sharedGeos) {
    if (sharedGeos.archetypeMeshes[def.type]) {
      return sharedGeos.archetypeMeshes[def.type];
    }

    const out = {};
    const halfL = def.length * 0.5;
    const wY = def.wheelRadius;
    const archR = def.wheelRadius + 0.065;
    const zR = def.wheelBaseR;
    const zF = def.wheelBaseF;

    if (def.type === 'obey9f') {
      const sidePts = [
        [-halfL + 0.06, 0.42],
        [-halfL + 0.02, 0.74, -halfL + 0.22, 0.84],
        [-1.55, 0.92, -0.88, 0.94],
        [-0.58, 0.82],
        [0.48, 0.79],
        [0.86, 0.82, 1.46, 0.76],
        [2.02, 0.66, halfL - 0.04, 0.44],
        [halfL, 0.26]
      ];
      const sideShape = createCarBodyProfile(sidePts, wY, archR, zR, zF, 0.18);
      const flankGeoL = buildSculptedBodyGeometry(sideShape, 0.44, {
        halfLength: halfL,
        beltY: 0.82,
        noseRound: 0.12,
        tailRound: 0.09,
        archFlare: 0.06,
        zFront: zF,
        zRear: zR,
        bevelThickness: 0.11,
        bevelSize: 0.08
      });
      flankGeoL.translate(def.width * 0.5 - 0.22, 0, 0);

      const flankGeoR = flankGeoL.clone();
      flankGeoR.translate(-(def.width - 0.44), 0, 0);

      const noseShape = new THREE.Shape();
      noseShape.moveTo(0.42, 0.24);
      noseShape.lineTo(0.42, 0.80);
      noseShape.bezierCurveTo(0.95, 0.81, 1.65, 0.72, halfL - 0.05, 0.45);
      noseShape.quadraticCurveTo(halfL + 0.02, 0.32, halfL - 0.06, 0.21);
      noseShape.lineTo(0.42, 0.22);
      noseShape.closePath();
      const noseGeo = buildSculptedBodyGeometry(noseShape, def.width - 0.18, {
        halfLength: halfL,
        beltY: 0.80,
        noseRound: 0.22,
        crown: 0.035,
        bevelThickness: 0.13,
        bevelSize: 0.09
      });

      const rearShape = new THREE.Shape();
      rearShape.moveTo(-halfL + 0.06, 0.24);
      rearShape.lineTo(-halfL + 0.03, 0.68);
      rearShape.quadraticCurveTo(-halfL + 0.14, 0.85, -1.78, 0.88);
      rearShape.bezierCurveTo(-1.32, 0.95, -0.92, 0.99, -0.62, 0.94);
      rearShape.lineTo(-0.54, 0.78);
      rearShape.lineTo(-0.54, 0.24);
      rearShape.closePath();
      const rearDeckGeo = buildSculptedBodyGeometry(rearShape, def.width - 0.16, {
        halfLength: halfL,
        beltY: 0.86,
        tailRound: 0.16,
        crown: 0.022,
        bevelThickness: 0.13,
        bevelSize: 0.09
      });

      const wsShape = new THREE.Shape();
      wsShape.moveTo(0.08, 1.19);
      wsShape.quadraticCurveTo(0.40, 1.02, 0.68, 0.80);
      wsShape.lineTo(0.60, 0.78);
      wsShape.quadraticCurveTo(0.33, 0.98, 0.02, 1.15);
      wsShape.closePath();
      const wsGeo = new THREE.ExtrudeGeometry(wsShape, {
        depth: def.width * 0.74,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 2,
        curveSegments: 12
      });
      wsGeo.translate(0, 0, -def.width * 0.37);
      wsGeo.rotateY(-Math.PI * 0.5);

      out.flankGeoL = flankGeoL;
      out.flankGeoR = flankGeoR;
      out.noseGeo = noseGeo;
      out.rearDeckGeo = rearDeckGeo;
      out.windshieldGeo = wsGeo;
    } else if (def.type === 'banshee') {
      const bodyPts = [
        [-halfL + 0.06, 0.44],
        [-halfL + 0.02, 0.78, -halfL + 0.26, 0.88],
        [-1.50, 0.92, -0.95, 0.90],
        [0.25, 0.84],
        [1.10, 0.84, 1.88, 0.74],
        [halfL - 0.02, 0.52, halfL, 0.28]
      ];
      const bodyShape = createCarBodyProfile(bodyPts, wY, archR, zR, zF, 0.19);
      out.bodyGeo = buildSculptedBodyGeometry(bodyShape, def.width, {
        halfLength: halfL,
        beltY: 0.84,
        noseRound: 0.20,
        tailRound: 0.14,
        archFlare: 0.055,
        waistPinch: 0.04,
        zFront: zF,
        zRear: zR,
        crown: 0.032
      });

      const cabinShape = new THREE.Shape();
      cabinShape.moveTo(-1.46, 0.86);
      cabinShape.bezierCurveTo(-1.10, 1.16, -0.58, 1.25, -0.05, 1.24);
      cabinShape.bezierCurveTo(0.28, 1.22, 0.52, 1.02, 0.68, 0.83);
      cabinShape.closePath();
      out.cabinGlassGeo = buildSculptedBodyGeometry(cabinShape, def.width * 0.80, {
        halfLength: 1.5,
        beltY: 0.86,
        tumblehome: 0.22,
        noseRound: 0.06,
        tailRound: 0.08,
        archFlare: 0,
        waistPinch: 0,
        bevelThickness: 0.08,
        bevelSize: 0.06
      });

      const roofCap = new THREE.Shape();
      roofCap.moveTo(-0.88, 1.19);
      roofCap.quadraticCurveTo(-0.38, 1.27, 0.08, 1.22);
      roofCap.lineTo(0.02, 1.17);
      roofCap.quadraticCurveTo(-0.38, 1.22, -0.82, 1.15);
      roofCap.closePath();
      out.roofCapGeo = buildSculptedBodyGeometry(roofCap, def.width * 0.64, {
        halfLength: 1.0,
        beltY: 1.1,
        tumblehome: 0.05,
        archFlare: 0,
        waistPinch: 0,
        bevelThickness: 0.04,
        bevelSize: 0.03
      });
    } else if (def.type === 'suv' || def.type === 'swat_van') {
      const belt = def.type === 'swat_van' ? 1.18 : 1.05;
      const topY = def.height;
      const bodyPts = [
        [-halfL + 0.05, 0.52],
        [-halfL + 0.02, belt - 0.05, -halfL + 0.20, belt],
        [0.72, belt],
        [1.45, belt - 0.03, halfL - 0.14, belt - 0.12],
        [halfL, belt - 0.32, halfL - 0.04, 0.34]
      ];
      const bodyShape = createCarBodyProfile(bodyPts, wY, archR, zR, zF, 0.28);
      out.bodyGeo = buildSculptedBodyGeometry(bodyShape, def.width, {
        halfLength: halfL,
        beltY: belt,
        noseRound: 0.12,
        tailRound: 0.07,
        archFlare: 0.045,
        waistPinch: 0.015,
        zFront: zF,
        zRear: zR,
        crown: 0.022
      });

      const cabinShape = new THREE.Shape();
      cabinShape.moveTo(-halfL + 0.18, belt - 0.03);
      cabinShape.quadraticCurveTo(-halfL + 0.36, topY - 0.04, -halfL + 0.62, topY - 0.02);
      cabinShape.lineTo(0.32, topY);
      cabinShape.quadraticCurveTo(0.62, topY - 0.02, 0.98, belt - 0.03);
      cabinShape.closePath();
      out.cabinGlassGeo = buildSculptedBodyGeometry(cabinShape, def.width * 0.86, {
        halfLength: halfL,
        beltY: belt,
        tumblehome: 0.13,
        archFlare: 0,
        waistPinch: 0,
        bevelThickness: 0.08,
        bevelSize: 0.06
      });

      const roofCap = new THREE.Shape();
      roofCap.moveTo(-halfL + 0.52, topY - 0.05);
      roofCap.lineTo(0.42, topY - 0.03);
      roofCap.lineTo(0.36, topY + 0.03);
      roofCap.lineTo(-halfL + 0.58, topY + 0.01);
      roofCap.closePath();
      out.roofCapGeo = buildSculptedBodyGeometry(roofCap, def.width * 0.74, {
        halfLength: halfL,
        beltY: topY - 0.1,
        tumblehome: 0.03,
        archFlare: 0,
        waistPinch: 0,
        bevelThickness: 0.05,
        bevelSize: 0.04
      });
    } else if (def.type === 'heli') {
      const fuseShape = new THREE.Shape();
      fuseShape.moveTo(-1.85, 0.95);
      fuseShape.bezierCurveTo(-1.60, 1.85, -0.75, 2.28, 0.35, 2.24);
      fuseShape.bezierCurveTo(1.25, 2.18, 2.05, 1.62, 2.38, 1.04);
      fuseShape.bezierCurveTo(2.42, 0.72, 1.85, 0.54, 0.95, 0.54);
      fuseShape.lineTo(-0.95, 0.56);
      fuseShape.quadraticCurveTo(-1.65, 0.65, -1.85, 0.95);
      fuseShape.closePath();

      out.heliBodyGeo = buildSculptedBodyGeometry(fuseShape, 1.72, {
        halfLength: 2.4,
        beltY: 1.35,
        tumblehome: 0.22,
        noseRound: 0.34,
        tailRound: 0.28,
        archFlare: 0,
        waistPinch: 0,
        crown: 0.04,
        bevelThickness: 0.16,
        bevelSize: 0.12
      });

      const glassShape = new THREE.Shape();
      glassShape.moveTo(0.15, 1.05);
      glassShape.bezierCurveTo(0.25, 2.04, 0.95, 2.12, 1.75, 1.68);
      glassShape.bezierCurveTo(2.18, 1.38, 2.36, 1.08, 2.24, 0.82);
      glassShape.quadraticCurveTo(1.35, 0.76, 0.15, 1.05);
      glassShape.closePath();

      out.heliGlassGeo = buildSculptedBodyGeometry(glassShape, 1.56, {
        halfLength: 2.35,
        beltY: 1.25,
        tumblehome: 0.24,
        noseRound: 0.36,
        archFlare: 0,
        waistPinch: 0,
        bevelThickness: 0.12,
        bevelSize: 0.09
      });
    } else {
      const bodyPts = [
        [-halfL + 0.06, 0.46],
        [-halfL + 0.02, 0.86, -halfL + 0.26, 0.94],
        [-1.35, 0.96, -0.85, 0.93],
        [0.75, 0.91],
        [1.45, 0.89, 2.08, 0.78],
        [halfL - 0.02, 0.56, halfL, 0.30]
      ];
      const bodyShape = createCarBodyProfile(bodyPts, wY, archR, zR, zF, 0.21);
      out.bodyGeo = buildSculptedBodyGeometry(bodyShape, def.width, {
        halfLength: halfL,
        beltY: 0.91,
        noseRound: 0.16,
        tailRound: 0.12,
        archFlare: 0.045,
        waistPinch: 0.025,
        zFront: zF,
        zRear: zR,
        crown: 0.026
      });

      const cabinShape = new THREE.Shape();
      cabinShape.moveTo(-1.52, 0.90);
      cabinShape.bezierCurveTo(-1.18, 1.24, -0.78, 1.40, -0.35, 1.41);
      cabinShape.lineTo(0.22, 1.40);
      cabinShape.bezierCurveTo(0.55, 1.38, 0.84, 1.14, 1.05, 0.89);
      cabinShape.closePath();
      out.cabinGlassGeo = buildSculptedBodyGeometry(cabinShape, def.width * 0.83, {
        halfLength: 1.6,
        beltY: 0.91,
        tumblehome: 0.20,
        archFlare: 0,
        waistPinch: 0,
        bevelThickness: 0.08,
        bevelSize: 0.06
      });

      const roofCap = new THREE.Shape();
      roofCap.moveTo(-0.88, 1.35);
      roofCap.quadraticCurveTo(-0.32, 1.43, 0.32, 1.37);
      roofCap.lineTo(0.25, 1.33);
      roofCap.quadraticCurveTo(-0.32, 1.39, -0.82, 1.32);
      roofCap.closePath();
      out.roofCapGeo = buildSculptedBodyGeometry(roofCap, def.width * 0.67, {
        halfLength: 1.1,
        beltY: 1.3,
        tumblehome: 0.05,
        archFlare: 0,
        waistPinch: 0,
        bevelThickness: 0.045,
        bevelSize: 0.035
      });
    }

    sharedGeos.archetypeMeshes[def.type] = out;
    return out;
  }

  function buildWheelAssembly(def, isLeft, isFront, sharedGeos, mats) {
    const parts = sharedGeos.getWheelParts(def.wheelRadius, def.wheelWidth, def.rimStyle);
    const suspNode = new THREE.Group();
    const steerPivot = new THREE.Group();
    const spinGroup = new THREE.Group();
    suspNode.add(steerPivot);
    steerPivot.add(spinGroup);

    const outwardSign = isLeft ? 1 : -1;
    const tread = new THREE.Mesh(parts.treadGeo, mats.tireRubber);
    tread.castShadow = true;
    tread.receiveShadow = true;
    spinGroup.add(tread);

    for (const side of [-1, 1]) {
      const sh = new THREE.Mesh(parts.shoulderGeo, mats.tireRubber);
      sh.position.x = side * (def.wheelWidth * 0.34);
      spinGroup.add(sh);
    }

    const rimMat = def.type === 'swat_van' ? mats.imperialGoldTrim : mats.alloyChrome;
    spinGroup.add(new THREE.Mesh(parts.barrelGeo, rimMat));

    const lip = new THREE.Mesh(parts.lipGeo, rimMat);
    lip.position.x = outwardSign * (def.wheelWidth * 0.38);
    spinGroup.add(lip);
    spinGroup.add(new THREE.Mesh(parts.hubGeo, rimMat));

    for (let i = 0; i < parts.spokeCount; i++) {
      const angle = (i / parts.spokeCount) * Math.PI * 2;
      const spoke = new THREE.Mesh(parts.spokeGeo, rimMat);
      const rMid = parts.rimRadius * 0.48;
      spoke.position.set(
        outwardSign * (def.wheelWidth * 0.33),
        Math.cos(angle) * rMid,
        Math.sin(angle) * rMid
      );
      spoke.rotation.x = angle;
      spinGroup.add(spoke);
    }

    const disc = new THREE.Mesh(parts.discGeo, mats.brakeDisc);
    disc.position.x = outwardSign * (def.wheelWidth * 0.14);
    steerPivot.add(disc);

    const caliper = new THREE.Mesh(parts.caliperGeo, mats.brakeCaliperRed);
    caliper.position.set(
      outwardSign * (def.wheelWidth * 0.22),
      def.wheelRadius * 0.16,
      isFront ? -parts.rimRadius * 0.56 : parts.rimRadius * 0.56
    );
    steerPivot.add(caliper);

    mergeRigidSubgroupMeshes(spinGroup);

    return { suspNode, steerPivot, spinGroup };
  }

  // Batch co-moving rigid sub-meshes by material (cuts per-vehicle draw calls by ~75% with zero feature loss)
  const _batchInvParent = new THREE.Matrix4();
  const _batchRelMat = new THREE.Matrix4();
  const _batchNMat = new THREE.Matrix3();
  const _batchP = new THREE.Vector3();
  const _batchN = new THREE.Vector3();

  function mergeRigidSubgroupMeshes(containerGroup, skipRoots = []) {
    if (!containerGroup) return;
    const skipSet = new Set();
    for (let i = 0; i < skipRoots.length; i++) {
      const sr = skipRoots[i];
      if (!sr) continue;
      skipSet.add(sr);
      sr.traverse((c) => skipSet.add(c));
    }

    containerGroup.updateMatrixWorld(true);
    _batchInvParent.copy(containerGroup.matrixWorld).invert();

    const buckets = new Map();
    containerGroup.traverse((obj) => {
      if (!obj || obj === containerGroup || !obj.isMesh || obj.isInstancedMesh) return;
      if (skipSet.has(obj) || !obj.visible) return;
      const mat = obj.material;
      const geo = obj.geometry;
      if (!mat || Array.isArray(mat) || !geo || !geo.attributes?.position || geo.attributes.color) return;

      let bucket = buckets.get(mat.uuid);
      if (!bucket) {
        bucket = { mat, castShadow: false, receiveShadow: false, meshes: [] };
        buckets.set(mat.uuid, bucket);
      }
      if (obj.castShadow) bucket.castShadow = true;
      if (obj.receiveShadow) bucket.receiveShadow = true;
      bucket.meshes.push(obj);
    });

    for (const bucket of buckets.values()) {
      const meshes = bucket.meshes;
      if (meshes.length < 2) continue;

      let totalVerts = 0;
      let totalIndices = 0;
      for (let i = 0; i < meshes.length; i++) {
        const g = meshes[i].geometry;
        if (!g.attributes.normal) g.computeVertexNormals();
        const vc = g.attributes.position.count;
        totalVerts += vc;
        totalIndices += g.index ? g.index.count : vc;
      }
      if (totalVerts === 0 || totalIndices === 0) continue;

      const posArr = new Float32Array(totalVerts * 3);
      const normArr = new Float32Array(totalVerts * 3);
      const uvArr = new Float32Array(totalVerts * 2);
      const idxArr = totalVerts > 65535 ? new Uint32Array(totalIndices) : new Uint16Array(totalIndices);

      let vOff = 0;
      let iOff = 0;
      for (let i = 0; i < meshes.length; i++) {
        const m = meshes[i];
        const g = m.geometry;
        const posAttr = g.attributes.position;
        const normAttr = g.attributes.normal;
        const uvAttr = g.attributes.uv;
        const vc = posAttr.count;

        _batchRelMat.multiplyMatrices(_batchInvParent, m.matrixWorld);
        _batchNMat.getNormalMatrix(_batchRelMat);
        const flip = _batchRelMat.determinant() < 0;

        for (let v = 0; v < vc; v++) {
          _batchP.fromBufferAttribute(posAttr, v).applyMatrix4(_batchRelMat);
          const pb = (vOff + v) * 3;
          posArr[pb] = _batchP.x;
          posArr[pb + 1] = _batchP.y;
          posArr[pb + 2] = _batchP.z;

          if (normAttr) {
            _batchN.fromBufferAttribute(normAttr, v).applyMatrix3(_batchNMat).normalize();
            normArr[pb] = _batchN.x;
            normArr[pb + 1] = _batchN.y;
            normArr[pb + 2] = _batchN.z;
          } else {
            normArr[pb + 1] = 1;
          }

          const ub = (vOff + v) * 2;
          if (uvAttr) {
            uvArr[ub] = uvAttr.getX(v);
            uvArr[ub + 1] = uvAttr.getY(v);
          }
        }

        if (g.index) {
          const srcIdx = g.index;
          const ic = srcIdx.count;
          for (let k = 0; k < ic; k += 3) {
            const a = srcIdx.getX(k) + vOff;
            const b = srcIdx.getX(k + 1) + vOff;
            const c = srcIdx.getX(k + 2) + vOff;
            idxArr[iOff++] = a;
            idxArr[iOff++] = flip ? c : b;
            idxArr[iOff++] = flip ? b : c;
          }
        } else {
          for (let k = 0; k < vc; k += 3) {
            const a = vOff + k;
            const b = vOff + k + 1;
            const c = vOff + k + 2;
            idxArr[iOff++] = a;
            idxArr[iOff++] = flip ? c : b;
            idxArr[iOff++] = flip ? b : c;
          }
        }

        vOff += vc;
        if (m.parent) m.parent.remove(m);
      }

      const mergedGeo = new THREE.BufferGeometry();
      mergedGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      mergedGeo.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
      mergedGeo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
      mergedGeo.setIndex(new THREE.BufferAttribute(idxArr, 1));
      mergedGeo.computeBoundingSphere();

      const mergedMesh = new THREE.Mesh(mergedGeo, bucket.mat);
      mergedMesh.castShadow = bucket.castShadow;
      mergedMesh.receiveShadow = bucket.receiveShadow;
      containerGroup.add(mergedMesh);
    }
  }

  function buildInteriorCockpit(def, sharedGeos, mats) {
    const interior = new THREE.Group();
    const seatMat = def.type === 'obey9f' || def.type === 'banshee' ? mats.leatherSportRed : mats.leatherDark;

    const tubFloor = new THREE.Mesh(new THREE.BoxGeometry(def.width * 0.72, 0.06, 1.38), mats.matteBlack);
    tubFloor.position.set(0, def.seatY - 0.06, def.seatZ + 0.18);
    interior.add(tubFloor);

    const centerTunnel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 1.25), mats.carbonTrim);
    centerTunnel.position.set(0, def.seatY + 0.06, def.seatZ + 0.22);
    interior.add(centerTunnel);

    const shifter = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.16, 8), mats.imperialGoldTrim);
    shifter.position.set(0, def.seatY + 0.24, def.seatZ + 0.34);
    shifter.rotation.x = -0.2;
    interior.add(shifter);

    for (const side of [1, -1]) {
      const seat = new THREE.Mesh(sharedGeos.bucketSeatGeo, side === 1 ? seatMat : mats.leatherDark);
      seat.position.set(side * def.seatX, def.seatY - 0.02, def.seatZ);
      seat.castShadow = true;
      interior.add(seat);
    }

    const dashZ = def.seatZ + 0.68;
    const dashY = def.seatY + 0.38;
    const dashBar = new THREE.Mesh(new THREE.BoxGeometry(def.width * 0.74, 0.24, 0.36), mats.leatherDark);
    dashBar.position.set(0, dashY, dashZ);
    interior.add(dashBar);

    const gaugeScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.14), mats.gaugesGlow);
    gaugeScreen.position.set(def.seatX * 0.92, dashY + 0.06, dashZ - 0.185);
    gaugeScreen.rotation.y = Math.PI;
    interior.add(gaugeScreen);

    const steerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.045, 0.28, 10), mats.carbonTrim);
    steerCol.rotation.x = Math.PI * 0.38;
    steerCol.position.set(def.seatX, dashY + 0.03, dashZ - 0.16);
    interior.add(steerCol);

    const steeringWheelPivot = new THREE.Group();
    steeringWheelPivot.position.set(def.seatX, dashY + 0.08, dashZ - 0.28);
    steeringWheelPivot.rotation.x = -0.34;

    const swRim = new THREE.Mesh(sharedGeos.steerRimGeo, mats.leatherDark);
    const swHub = new THREE.Mesh(sharedGeos.steerHubGeo, mats.imperialGoldTrim);
    const swSpokeH = new THREE.Mesh(sharedGeos.steerSpokeGeo, mats.alloyChrome);
    const swSpokeV = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.16, 0.022), mats.alloyChrome);
    swSpokeV.position.y = -0.08;
    steeringWheelPivot.add(swRim, swHub, swSpokeH, swSpokeV);
    interior.add(steeringWheelPivot);

    const driverSeatAnchor = new THREE.Object3D();
    driverSeatAnchor.position.set(def.seatX, def.seatY, def.seatZ + 0.04);
    interior.add(driverSeatAnchor);

    return { interior, steeringWheelPivot, driverSeatAnchor };
  }

  function buildHelicopterMesh(def, baseColor, opts, sharedGeos, mats) {
    const root = new THREE.Group();
    const chassis = new THREE.Group();
    root.add(chassis);

    const isPoliceHeli = Boolean(opts.isPolice || opts.isPoliceHeli || opts.isPoliceUnit);
    const bodyColor = isPoliceHeli ? 0xf6f1e6 : baseColor;
    const paintMat = isMobile
      ? new THREE.MeshStandardMaterial({
          color: bodyColor,
          metalness: 0.50,
          roughness: 0.18
        })
      : new THREE.MeshPhysicalMaterial({
          color: bodyColor,
          metalness: 0.45,
          roughness: 0.16,
          clearcoat: 1.0,
          clearcoatRoughness: 0.07,
          envMapIntensity: 1.4
        });

    const geos = getArchetypeSculptedGeos(def, sharedGeos);
    const fuselage = new THREE.Mesh(geos.heliBodyGeo, paintMat);
    fuselage.castShadow = true;
    fuselage.receiveShadow = true;
    chassis.add(fuselage);

    const bellyAccentMat = isPoliceHeli ? mats.taxiBlue : mats.imperialGoldTrim;
    const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.16, 3.1), bellyAccentMat);
    sideStripe.position.set(0, 1.12, 0.1);
    chassis.add(sideStripe);

    const canopy = new THREE.Mesh(geos.heliGlassGeo, mats.tintedGlass);
    chassis.add(canopy);

    for (const side of [1, -1]) {
      const seat = new THREE.Mesh(sharedGeos.bucketSeatGeo, mats.leatherDark);
      seat.position.set(side * 0.36, 0.76, 0.65);
      chassis.add(seat);
    }
    const avionics = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.28, 0.35), mats.carbonTrim);
    avionics.position.set(0, 1.02, 1.45);
    chassis.add(avionics);

    const driverSeatAnchor = new THREE.Object3D();
    driverSeatAnchor.position.set(0.36, 0.78, 0.68);
    chassis.add(driverSeatAnchor);

    const boomGeo = new THREE.CylinderGeometry(0.14, 0.34, 4.45, 14);
    boomGeo.rotateX(Math.PI * 0.5);
    const tailBoom = new THREE.Mesh(boomGeo, paintMat);
    tailBoom.position.set(0, 1.56, -3.55);
    tailBoom.castShadow = true;
    chassis.add(tailBoom);

    const finShape = new THREE.Shape();
    finShape.moveTo(-5.85, 1.48);
    finShape.lineTo(-5.25, 1.52);
    finShape.lineTo(-5.65, 2.75);
    finShape.lineTo(-6.02, 2.68);
    finShape.closePath();
    const finGeo = new THREE.ExtrudeGeometry(finShape, {
      depth: 0.10,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2
    });
    finGeo.translate(0, 0, -0.05);
    finGeo.rotateY(-Math.PI * 0.5);
    const tailFin = new THREE.Mesh(finGeo, isPoliceHeli ? mats.taxiBlue : paintMat);
    tailFin.castShadow = true;
    chassis.add(tailFin);

    const hStab = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.06, 0.34), bellyAccentMat);
    hStab.position.set(0, 1.58, -4.65);
    chassis.add(hStab);

    for (const side of [-1, 1]) {
      const sx = side * 0.88;
      const runnerGeo = new THREE.CylinderGeometry(0.05, 0.05, 3.45, 10);
      runnerGeo.rotateX(Math.PI * 0.5);
      const runner = new THREE.Mesh(runnerGeo, mats.imperialGoldTrim);
      runner.position.set(sx, 0.05, 0.35);
      runner.castShadow = true;
      chassis.add(runner);

      const tipGeo = new THREE.TorusGeometry(0.24, 0.048, 8, 12, Math.PI * 0.55);
      tipGeo.rotateY(Math.PI * 0.5);
      const tip = new THREE.Mesh(tipGeo, mats.imperialGoldTrim);
      tip.position.set(sx, 0.29, 2.05);
      tip.rotation.x = Math.PI;
      chassis.add(tip);

      for (const sz of [-0.55, 1.15]) {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.68, 8), mats.darkAlloy);
        strut.position.set(sx * 0.82, 0.36, sz);
        strut.rotation.z = side * 0.32;
        chassis.add(strut);
      }
    }

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 0.52, 12), mats.darkAlloy);
    mast.position.set(0, 2.48, 0.15);
    chassis.add(mast);

    const mainRotor = new THREE.Group();
    mainRotor.position.set(0, 2.74, 0.15);
    mainRotor.add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), mats.imperialGoldTrim));

    const bladeGeo = new THREE.BoxGeometry(9.2, 0.032, 0.28);
    const bladeA = new THREE.Mesh(bladeGeo, mats.carbonTrim);
    const bladeB = new THREE.Mesh(bladeGeo, mats.carbonTrim);
    bladeB.rotation.y = Math.PI * 0.5;
    mainRotor.add(bladeA, bladeB);

    const mainBlurDisc = new THREE.Mesh(new THREE.PlaneGeometry(9.3, 9.3), mats.rotorBlurMat);
    mainBlurDisc.rotation.x = -Math.PI * 0.5;
    mainBlurDisc.position.y = 0.02;
    mainBlurDisc.visible = false;
    mainRotor.add(mainBlurDisc);
    chassis.add(mainRotor);

    const tailRotor = new THREE.Group();
    tailRotor.position.set(0.14, 2.38, -5.68);
    tailRotor.add(
      new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.75, 0.14), mats.carbonTrim),
      new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 1.75), mats.carbonTrim)
    );
    chassis.add(tailRotor);

    const strobeRedMat = new THREE.MeshStandardMaterial({
      color: 0xff2222,
      emissive: 0xff1a1a,
      emissiveIntensity: 2.2
    });
    const tailBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), strobeRedMat);
    tailBeacon.position.set(0, 2.82, -5.82);
    chassis.add(tailBeacon);

    const searchlightPivot = new THREE.Group();
    searchlightPivot.position.set(0, 0.52, 1.95);
    const lampPod = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.28, 12), mats.darkAlloy);
    lampPod.rotation.x = Math.PI * 0.5;
    searchlightPivot.add(lampPod);

    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffecc2,
      emissiveIntensity: 2.6
    });
    const lampLens = new THREE.Mesh(new THREE.CircleGeometry(0.13, 12), headlightMat);
    lampLens.position.z = 0.145;
    searchlightPivot.add(lampLens);

    const coneLen = 54;
    const searchConeGeo = new THREE.ConeGeometry(6.8, coneLen, 20, 1, true);
    searchConeGeo.translate(0, -coneLen * 0.5, 0);
    searchConeGeo.rotateX(-Math.PI * 0.5);
    const searchConeMesh = new THREE.Mesh(searchConeGeo, mats.searchlightConeMat);
    searchConeMesh.visible = isPoliceHeli;
    searchlightPivot.rotation.x = 0.95;
    searchlightPivot.add(searchConeMesh);
    chassis.add(searchlightPivot);

    mergeRigidSubgroupMeshes(chassis, [driverSeatAnchor, mainRotor, tailRotor, searchlightPivot]);

    return {
      root,
      chassis,
      plateStr: opts.plate || (isPoliceHeli ? 'LPM AIR' : 'UNG 01'),
      paintMat,
      taillightMat: strobeRedMat,
      reverseLightMat: null,
      headlightMat,
      headlightCones: null,
      sirenRedMat: null,
      sirenBlueMat: null,
      wheels: [],
      steeringWheelPivot: null,
      driverSeatAnchor,
      frontBumperGroup: null,
      rearBumperGroup: null,
      hoodPanel: null,
      mainRotor,
      mainBlurDisc,
      tailRotor,
      searchlightPivot,
      searchConeMesh,
      smokeOriginLocal: new THREE.Vector3(0, 2.35, -0.45)
    };
  }

  function buildGroundCarMesh(def, baseColor, opts, sharedGeos, mats, texCache) {
    if (def.isHeli) {
      return buildHelicopterMesh(def, baseColor, opts, sharedGeos, mats, texCache);
    }

    const root = new THREE.Group();
    const chassis = new THREE.Group();
    root.add(chassis);

    const paintMat = isMobile
      ? new THREE.MeshStandardMaterial({
          color: baseColor,
          metalness: def.isMatte ? 0.34 : 0.52,
          roughness: def.isMatte ? 0.42 : 0.16
        })
      : new THREE.MeshPhysicalMaterial({
          color: baseColor,
          metalness: def.isMatte ? 0.34 : 0.45,
          roughness: def.isMatte ? 0.42 : 0.15,
          clearcoat: def.isMatte ? 0.25 : 1.0,
          clearcoatRoughness: def.isMatte ? 0.22 : 0.07,
          envMapIntensity: def.isMatte ? 0.95 : 1.42
        });

    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0x990a12,
      emissive: 0xff1118,
      emissiveIntensity: 0.85,
      roughness: 0.18
    });
    const reverseLightMat = new THREE.MeshStandardMaterial({
      color: 0xdbe4ee,
      emissive: 0xffffff,
      emissiveIntensity: 0.0,
      roughness: 0.20
    });
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xfff8e6,
      emissive: 0xfff0cc,
      emissiveIntensity: 1.35,
      roughness: 0.10
    });

    const halfL = def.length * 0.5;
    const halfW = def.width * 0.5;
    const geos = getArchetypeSculptedGeos(def, sharedGeos);

    if (def.type === 'obey9f') {
      for (const g of [geos.flankGeoL, geos.flankGeoR, geos.noseGeo, geos.rearDeckGeo]) {
        const m = new THREE.Mesh(g, paintMat);
        m.castShadow = true;
        m.receiveShadow = true;
        chassis.add(m);
      }

      chassis.add(new THREE.Mesh(geos.windshieldGeo, mats.tintedGlass));

      for (const side of [-1, 1]) {
        const aPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, 0.62, 8), mats.imperialGoldTrim);
        aPillar.position.set(side * (halfW * 0.74), 0.99, 0.36);
        aPillar.rotation.x = 0.88;
        aPillar.rotation.z = -side * 0.14;
        chassis.add(aPillar);

        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.028, 8, 14, Math.PI), mats.imperialGoldTrim);
        hoop.position.set(side * 0.40, 0.96, -0.44);
        chassis.add(hoop);

        const sideblade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 0.58), mats.carbonTrim);
        sideblade.position.set(side * (halfW - 0.01), 0.58, -0.62);
        sideblade.rotation.z = side * 0.08;
        chassis.add(sideblade);
      }

      const engineBayPanel = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.04, 0.88), mats.matteBlack);
      engineBayPanel.position.set(0, 0.93, -1.24);
      engineBayPanel.rotation.x = -0.10;
      chassis.add(engineBayPanel);

      for (let s = 0; s < 6; s++) {
        const strake = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.022, 0.045), mats.imperialGoldTrim);
        strake.position.set(0, 0.955 - s * 0.012, -0.88 - s * 0.13);
        chassis.add(strake);
      }
    } else {
      const bodyMesh = new THREE.Mesh(geos.bodyGeo, paintMat);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      chassis.add(bodyMesh);

      chassis.add(new THREE.Mesh(geos.cabinGlassGeo, mats.tintedGlass));

      const roofMat = def.type === 'police' ? mats.lspdWhite : paintMat;
      const roofCap = new THREE.Mesh(geos.roofCapGeo, roofMat);
      roofCap.castShadow = true;
      chassis.add(roofCap);

      if (def.type === 'sedan_lux') {
        for (const side of [-1, 1]) {
          const trim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.032, 2.38), mats.imperialGoldTrim);
          trim.position.set(side * (halfW * 0.85), 0.92, -0.22);
          chassis.add(trim);

          for (const dz of [-0.55, 0.25]) {
            const handle = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.028, 0.16), mats.imperialGoldTrim);
            handle.position.set(side * (halfW + 0.005), 0.83, dz);
            chassis.add(handle);
          }
        }
      }

      if (def.hasStripe) {
        const hoodStripe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.018, 1.65), mats.whiteStripe);
        hoodStripe.position.set(0, 0.84, 1.42);
        hoodStripe.rotation.x = 0.085;
        chassis.add(hoodStripe);

        const roofStripe = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.02, 0.95), mats.whiteStripe);
        roofStripe.position.set(0, 1.255, -0.38);
        chassis.add(roofStripe);

        const deckStripe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.018, 0.78), mats.whiteStripe);
        deckStripe.position.set(0, 0.91, -1.85);
        deckStripe.rotation.x = -0.05;
        chassis.add(deckStripe);
      }

      if (def.hasSpoiler) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(def.width * 0.86, 0.045, 0.26), mats.imperialGoldTrim);
        wing.position.set(0, 1.08, -halfL + 0.24);
        wing.rotation.x = 0.09;
        wing.castShadow = true;
        chassis.add(wing);
        for (const side of [-1, 1]) {
          const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.18), mats.carbonTrim);
          pylon.position.set(side * 0.56, 0.98, -halfL + 0.26);
          chassis.add(pylon);
        }
      }

      if (def.type === 'suv') {
        for (const side of [-1, 1]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 2.35), mats.imperialGoldTrim);
          rail.position.set(side * (halfW * 0.68), def.height + 0.04, -0.55);
          chassis.add(rail);
        }
      }

      if (def.type === 'taxi') {
        const signBox = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.22, 0.28), mats.taxiSignMat);
        signBox.position.set(0, def.height + 0.11, -0.15);
        chassis.add(signBox);

        for (const side of [-1, 1]) {
          const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.48), mats.taxiSideMat);
          decal.position.set(side * (halfW + 0.012), 0.58, -0.05);
          decal.rotation.y = side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
          chassis.add(decal);
        }
      }

      if (def.type === 'swat_van') {
        for (const side of [-1, 1]) {
          const step = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 2.45), mats.darkAlloy);
          step.position.set(side * (halfW + 0.06), 0.34, -0.05);
          chassis.add(step);

          const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.56), mats.nooseSideMat);
          decal.position.set(side * (halfW + 0.014), 0.82, -0.15);
          decal.rotation.y = side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
          chassis.add(decal);
        }
      }
    }

    const archFlareGeo = new THREE.TorusGeometry(def.wheelRadius + 0.06, 0.042, 8, 18, Math.PI);
    archFlareGeo.rotateY(Math.PI * 0.5);
    const linerGeo = new THREE.CylinderGeometry(def.wheelRadius + 0.05, def.wheelRadius + 0.05, def.wheelWidth + 0.18, 16, 1, false, 0, Math.PI);
    linerGeo.rotateZ(Math.PI * 0.5);

    for (const wz of [def.wheelBaseF, def.wheelBaseR]) {
      for (const side of [1, -1]) {
        const liner = new THREE.Mesh(linerGeo, mats.matteBlack);
        liner.position.set(side * (def.wheelTrack - 0.05), def.wheelRadius, wz);
        chassis.add(liner);

        const lip = new THREE.Mesh(archFlareGeo, def.type === 'suv' || def.type === 'swat_van' ? mats.carbonTrim : paintMat);
        lip.position.set(side * (halfW - 0.02), def.wheelRadius, wz);
        chassis.add(lip);
      }
    }

    const mirrorZ = def.type === 'obey9f' ? 0.38 : 0.62;
    const mirrorY = def.type === 'suv' || def.type === 'swat_van' ? 1.12 : 0.88;
    for (const side of [1, -1]) {
      const mirGroup = new THREE.Group();
      mirGroup.position.set(side * (halfW - 0.02), mirrorY, mirrorZ);
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.13), paintMat);
      housing.position.x = side * 0.09;
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.08), mats.mirrorSilver);
      glass.position.set(side * 0.09, 0, -0.068);
      glass.rotation.y = Math.PI;
      mirGroup.add(housing, glass);
      chassis.add(mirGroup);
    }

    const hoodPanel = new THREE.Group();
    hoodPanel.position.set(0, 0.78, 0.65);
    const hoodSkin = new THREE.Mesh(new THREE.BoxGeometry(def.width * 0.72, 0.035, 1.12), paintMat);
    hoodSkin.position.set(0, 0.03, 0.62);
    hoodSkin.rotation.x = 0.08;
    hoodPanel.add(hoodSkin);
    chassis.add(hoodPanel);

    const frontBumperGroup = new THREE.Group();
    frontBumperGroup.position.set(0, 0.36, halfL + 0.01);

    const grilleW = def.type === 'obey9f' ? 0.88 : def.width * 0.52;
    const grilleH = def.type === 'suv' || def.type === 'swat_van' ? 0.34 : 0.24;
    const frontGrille = new THREE.Mesh(
      new THREE.BoxGeometry(grilleW, grilleH, 0.12),
      def.type === 'sedan_lux' ? mats.imperialGoldTrim : mats.matteBlack
    );
    frontGrille.position.set(0, 0.06, 0.055);
    frontBumperGroup.add(frontGrille);

    const splitter = new THREE.Mesh(new THREE.BoxGeometry(def.width * 0.94, 0.055, 0.24), mats.carbonTrim);
    splitter.position.set(0, -0.14, 0.06);
    frontBumperGroup.add(splitter);

    const hlY = def.type === 'suv' || def.type === 'swat_van' ? 0.34 : 0.16;
    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.11, 0.13), headlightMat);
      hl.position.set(side * (halfW * 0.68), hlY, 0.035);
      hl.rotation.y = -side * 0.18;
      frontBumperGroup.add(hl);
    }

    if (def.isPolice) {
      const ramBar = new THREE.Group();
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.54, 0.12), mats.imperialGoldTrim);
        post.position.set(side * 0.44, 0.12, 0.16);
        ramBar.add(post);
      }
      for (const by of [-0.04, 0.22]) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 1.18, 10), mats.darkAlloy);
        bar.rotation.z = Math.PI * 0.5;
        bar.position.set(0, by, 0.20);
        ramBar.add(bar);
      }
      frontBumperGroup.add(ramBar);
    }
    chassis.add(frontBumperGroup);

    const headlightCones = new THREE.Mesh(sharedGeos.headlightGroundGeo, mats.headlightConeMat);
    headlightCones.position.set(0, 0.01, halfL - 0.3);
    headlightCones.visible = false;
    root.add(headlightCones);

    const rearBumperGroup = new THREE.Group();
    rearBumperGroup.position.set(0, 0.42, -halfL - 0.02);

    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(def.width * 0.90, 0.18, 0.14), mats.carbonTrim);
    diffuser.position.set(0, -0.14, -0.025);
    rearBumperGroup.add(diffuser);

    const plateStr = opts.plate || (def.type === 'obey9f' ? 'LONG 999' : def.isPolice ? 'LPM 911' : 'VL 8868');
    const plateFrame = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.25, 0.03), mats.imperialGoldTrim);
    plateFrame.position.set(0, 0.02, -0.072);
    rearBumperGroup.add(plateFrame);

    const plateMat = new THREE.MeshStandardMaterial({
      map: texCache.getPlateTexture(plateStr),
      roughness: 0.26,
      metalness: 0.14,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    const plateMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.22), plateMat);
    plateMesh.position.set(0, 0.02, -0.090);
    plateMesh.rotation.y = Math.PI;
    rearBumperGroup.add(plateMesh);

    if (def.type === 'obey9f') {
      const rearGrille = new THREE.Mesh(new THREE.BoxGeometry(def.width * 0.88, 0.20, 0.08), mats.matteBlack);
      rearGrille.position.set(0, 0.24, -0.045);
      rearBumperGroup.add(rearGrille);

      const roundTailGeo = new THREE.CylinderGeometry(0.072, 0.072, 0.06, 16);
      roundTailGeo.rotateX(Math.PI * 0.5);
      for (const side of [-1, 1]) {
        for (const offset of [0.56, 0.74]) {
          const tl = new THREE.Mesh(roundTailGeo, taillightMat);
          tl.position.set(side * offset, 0.24, -0.075);
          rearBumperGroup.add(tl);
        }
      }
      const chmsl = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.028, 0.05), taillightMat);
      chmsl.position.set(0, 0.40, -0.055);
      rearBumperGroup.add(chmsl);
    } else {
      const tlY = def.type === 'suv' || def.type === 'swat_van' ? 0.44 : 0.28;
      for (const side of [-1, 1]) {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.13, 0.09), taillightMat);
        tl.position.set(side * (halfW * 0.68), tlY, -0.055);
        rearBumperGroup.add(tl);
      }
    }

    for (const side of [-1, 1]) {
      const rev = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.055, 0.06), reverseLightMat);
      rev.position.set(side * 0.36, 0.14, -0.075);
      rearBumperGroup.add(rev);
    }

    const exhaustOffsets = def.quadExhaust ? [-0.66, -0.52, 0.52, 0.66] : [-0.58, 0.58];
    for (const ex of exhaustOffsets) {
      const outer = new THREE.Mesh(sharedGeos.exhaustOuterGeo, mats.imperialGoldTrim);
      outer.position.set(ex, -0.17, -0.085);
      const inner = new THREE.Mesh(sharedGeos.exhaustInnerGeo, mats.matteBlack);
      inner.position.set(ex, -0.17, -0.095);
      rearBumperGroup.add(outer, inner);
    }
    chassis.add(rearBumperGroup);

    let sirenRedMat = null;
    let sirenBlueMat = null;
    if (def.isPolice) {
      if (def.type === 'police') {
        for (const side of [-1, 1]) {
          const whiteDoor = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 0.62), mats.lspdDoorMat);
          whiteDoor.position.set(side * (halfW + 0.012), 0.58, -0.04);
          whiteDoor.rotation.y = side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
          chassis.add(whiteDoor);
        }
      }

      sirenRedMat = new THREE.MeshStandardMaterial({
        color: 0x880808,
        emissive: 0xff1a1a,
        emissiveIntensity: 0.25,
        roughness: 0.15
      });
      sirenBlueMat = new THREE.MeshStandardMaterial({
        color: 0x886208,
        emissive: 0xffb81a,
        emissiveIntensity: 0.25,
        roughness: 0.15
      });

      const barY = def.height + 0.07;
      const barZ = def.type === 'swat_van' ? 0.35 : -0.12;
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.055, 0.22), mats.imperialGoldTrim);
      bridge.position.set(0, barY, barZ);
      const podRed = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 0.20), sirenRedMat);
      podRed.position.set(0.32, barY + 0.02, barZ);
      const podBlue = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 0.20), sirenBlueMat);
      podBlue.position.set(-0.32, barY + 0.02, barZ);
      chassis.add(bridge, podRed, podBlue);
    }

    const { interior, steeringWheelPivot, driverSeatAnchor } = buildInteriorCockpit(def, sharedGeos, mats);
    chassis.add(interior);

    const wheelCoords = [
      { x: def.wheelTrack, z: def.wheelBaseF, isLeft: true, isFront: true },
      { x: -def.wheelTrack, z: def.wheelBaseF, isLeft: false, isFront: true },
      { x: def.wheelTrack, z: def.wheelBaseR, isLeft: true, isFront: false },
      { x: -def.wheelTrack, z: def.wheelBaseR, isLeft: false, isFront: false }
    ];
    const wheels = [];
    for (const wc of wheelCoords) {
      const w = buildWheelAssembly(def, wc.isLeft, wc.isFront, sharedGeos, mats);
      w.suspNode.position.set(wc.x, def.wheelRadius, wc.z);
      w.baseX = wc.x;
      w.baseY = def.wheelRadius;
      w.baseZ = wc.z;
      w.isFront = wc.isFront;
      w.isLeft = wc.isLeft;
      root.add(w.suspNode);
      wheels.push(w);
    }

    const smokeOriginLocal = def.midEngine
      ? new THREE.Vector3(0, 0.96, -1.25)
      : new THREE.Vector3(0, 0.86, halfL * 0.62);

    mergeRigidSubgroupMeshes(frontBumperGroup);
    mergeRigidSubgroupMeshes(rearBumperGroup);
    mergeRigidSubgroupMeshes(steeringWheelPivot);
    mergeRigidSubgroupMeshes(headlightCones);
    mergeRigidSubgroupMeshes(chassis, [
      frontBumperGroup,
      rearBumperGroup,
      hoodPanel,
      steeringWheelPivot,
      driverSeatAnchor
    ]);

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(def.width * 1.25, def.length * 1.15),
      mats.carBlobShadow
    );
    shadowPlane.rotation.x = -Math.PI * 0.5;
    shadowPlane.position.y = 0.032;
    shadowPlane.renderOrder = 1;
    root.add(shadowPlane);

    const shadowCasters = [];
    const defaultCastShadow = Boolean(opts.isHero || opts.isMission);
    root.traverse((obj) => {
      if (obj && obj.isMesh && obj.castShadow) {
        shadowCasters.push(obj);
        obj.castShadow = defaultCastShadow;
      }
    });

    return {
      root,
      chassis,
      shadowCasters,
      plateStr,
      paintMat,
      plateMat,
      taillightMat,
      reverseLightMat,
      headlightMat,
      headlightCones,
      sirenRedMat,
      sirenBlueMat,
      wheels,
      steeringWheelPivot,
      driverSeatAnchor,
      frontBumperGroup,
      rearBumperGroup,
      hoodPanel,
      mainRotor: null,
      mainBlurDisc: null,
      tailRotor: null,
      searchlightPivot: null,
      searchConeMesh: null,
      smokeOriginLocal
    };
  }

  // ==========================================================================
  // VEHICLE FX POOL (Skidmarks + Smoke / Sparks / Fire)
  // ==========================================================================
  function createVehicleFXPool(scene) {
    const MAX_SKIDS = 220;
    const skidGeo = new THREE.PlaneGeometry(0.30, 1.05);
    skidGeo.rotateX(-Math.PI * 0.5);
    const skidMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    const skidMesh = new THREE.InstancedMesh(skidGeo, skidMat, MAX_SKIDS);
    skidMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    skidMesh.frustumCulled = false;

    _tmpMat4.makeScale(0.0001, 0.0001, 0.0001);
    _tmpColor.setHex(0x121316);
    for (let i = 0; i < MAX_SKIDS; i++) {
      skidMesh.setMatrixAt(i, _tmpMat4);
      skidMesh.setColorAt(i, _tmpColor);
    }
    skidMesh.instanceMatrix.needsUpdate = true;
    if (skidMesh.instanceColor) skidMesh.instanceColor.needsUpdate = true;
    if (scene) scene.add(skidMesh);

    let skidCursor = 0;
    function addSkidmark(x, y, z, yaw, isSand = false, widthScale = 1.0) {
      _tmpVecA.set(x, y + 0.025, z);
      _tmpQuatA.setFromAxisAngle(UP_AXIS, yaw);
      _tmpScale.set(widthScale, 1, 1);
      _tmpMat4.compose(_tmpVecA, _tmpQuatA, _tmpScale);
      skidMesh.setMatrixAt(skidCursor, _tmpMat4);
      _tmpColor.setHex(isSand ? 0x93774c : 0x111317);
      skidMesh.setColorAt(skidCursor, _tmpColor);

      skidCursor = (skidCursor + 1) % MAX_SKIDS;
      skidMesh.instanceMatrix.needsUpdate = true;
      if (skidMesh.instanceColor) skidMesh.instanceColor.needsUpdate = true;
    }

    const MAX_PARTICLES = 150;
    const puffGeo = new THREE.DodecahedronGeometry(0.28, 1);
    const sparkGeo = new THREE.BoxGeometry(0.055, 0.055, 0.34);
    const particles = [];
    const fxGroup = new THREE.Group();
    if (scene) scene.add(fxGroup);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const isSparkSlot = i >= 110;
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: isSparkSlot ? THREE.AdditiveBlending : THREE.NormalBlending
      });
      const m = new THREE.Mesh(isSparkSlot ? sparkGeo : puffGeo, mat);
      m.visible = false;
      m.matrixAutoUpdate = false;
      fxGroup.add(m);
      particles.push({
        mesh: m,
        mat,
        isSparkSlot,
        active: false,
        age: 0,
        life: 1,
        vx: 0,
        vy: 0,
        vz: 0,
        startScale: 1,
        endScale: 2,
        gravity: 0
      });
    }

    let puffIdx = 0;
    let sparkIdx = 110;

    function spawnPuff(x, y, z, vx, vy, vz, colorHex, startScale, endScale, life, additive = false) {
      const p = particles[puffIdx];
      puffIdx = (puffIdx + 1) % 110;
      p.active = true;
      p.age = 0;
      p.life = life;
      p.vx = vx;
      p.vy = vy;
      p.vz = vz;
      p.startScale = startScale;
      p.endScale = endScale;
      p.gravity = 0;
      p.mat.color.setHex(colorHex);
      p.mat.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
      p.mat.opacity = additive ? 0.88 : 0.48;
      p.mesh.position.set(x, y, z);
      p.mesh.scale.setScalar(startScale);
      p.mesh.matrixAutoUpdate = true;
      p.mesh.visible = true;
    }

    function spawnSparkBurst(x, y, z, count = 10, baseSpeed = 8) {
      const n = Math.min(count, 24);
      for (let i = 0; i < n; i++) {
        const p = particles[sparkIdx];
        sparkIdx = 110 + ((sparkIdx - 110 + 1) % (MAX_PARTICLES - 110));
        const ang = Math.random() * Math.PI * 2;
        const spd = baseSpeed * (0.45 + Math.random() * 0.85);
        p.active = true;
        p.age = 0;
        p.life = 0.22 + Math.random() * 0.26;
        p.vx = Math.cos(ang) * spd;
        p.vy = 2.2 + Math.random() * 5.2;
        p.vz = Math.sin(ang) * spd;
        p.startScale = 0.9;
        p.endScale = 0.2;
        p.gravity = 18.0;
        p.mat.color.setHex(Math.random() > 0.35 ? 0xffb733 : 0xfff0b3);
        p.mat.opacity = 0.95;
        p.mesh.position.set(x, y, z);
        p.mesh.rotation.y = Math.atan2(p.vx, p.vz);
        p.mesh.scale.setScalar(1);
        p.mesh.matrixAutoUpdate = true;
        p.mesh.visible = true;
      }
    }

    function spawnFallbackExplosionFX(x, y, z) {
      for (let i = 0; i < 18; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 4.5;
        spawnPuff(
          x + Math.cos(a) * 0.5,
          y + 0.4 + Math.random() * 0.8,
          z + Math.sin(a) * 0.5,
          Math.cos(a) * r,
          3.5 + Math.random() * 6.5,
          Math.sin(a) * r,
          i % 3 === 0 ? 0xffe066 : 0xff5500,
          1.4,
          5.2,
          0.65 + Math.random() * 0.45,
          true
        );
      }
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 1.5 + Math.random() * 4.0;
        spawnPuff(
          x,
          y + 0.8,
          z,
          Math.cos(a) * r,
          2.5 + Math.random() * 4.5,
          Math.sin(a) * r,
          0x1d1f22,
          1.6,
          6.5,
          1.3 + Math.random() * 0.8,
          false
        );
      }
      spawnSparkBurst(x, y + 0.6, z, 22, 15);
    }

    function updateFX(dt) {
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i];
        if (!p.active) continue;
        p.age += dt;
        if (p.age >= p.life) {
          p.active = false;
          p.mesh.visible = false;
          p.mesh.matrixAutoUpdate = false;
          continue;
        }
        const t = p.age / p.life;
        p.vy -= p.gravity * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        if (p.isSparkSlot && p.mesh.position.y < 0.05) {
          p.mesh.position.y = 0.05;
          p.vy = Math.abs(p.vy) * 0.42;
        }
        p.mesh.scale.setScalar(vLerp(p.startScale, p.endScale, t));
        p.mat.opacity = (1 - t) * (p.isSparkSlot ? 0.95 : 0.48);
      }
    }

    function ensureAttached(targetScene) {
      if (targetScene && skidMesh.parent !== targetScene) targetScene.add(skidMesh);
      if (targetScene && fxGroup.parent !== targetScene) targetScene.add(fxGroup);
    }

    return {
      addSkidmark,
      spawnPuff,
      spawnSparkBurst,
      spawnFallbackExplosionFX,
      updateFX,
      ensureAttached
    };
  }

  // ==========================================================================
  // VEHICLE SYSTEM STATE & LIFECYCLE
  // ==========================================================================
  const list = [];
  let nextVehicleId = 1;
  let enterExitCooldown = 0;
  let hornCooldown = 0;
  let screechCooldown = 0;
  let prevInteractHeld = false;
  let prevHornHeld = false;

  const localKeys = {};
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => { localKeys[e.code] = true; }, { passive: true });
    window.addEventListener('keyup', (e) => { localKeys[e.code] = false; }, { passive: true });
    window.addEventListener('blur', () => {
      for (const k of Object.keys(localKeys)) localKeys[k] = false;
    }, { passive: true });
  }

  const texCache = makeTextureCache();
  const sharedGeos = makeSharedGeometries();
  const staticMats = makeSharedStaticMaterials(texCache);
  const fx = createVehicleFXPool(ctx.engine?.scene);

  function getScene() {
    return ctx.engine?.scene || ctx.scene || null;
  }

  function sampleGroundY(x, z, fallback = 0.02) {
    const gh = ctx.world?.getGroundHeight?.(x, z);
    return Number.isFinite(gh) ? gh : fallback;
  }

  function sampleHeliLandingSurfaceY(x, z, currentY) {
    let base = sampleGroundY(x, z, 0.02);
    if (x >= 136 && x <= 184 && z >= -64 && z <= -16 && currentY >= 74.5) {
      base = Math.max(base, 78.0);
    }
    const aabbs = ctx.world?.aabbs;
    if (Array.isArray(aabbs)) {
      for (let i = 0; i < aabbs.length; i++) {
        const b = aabbs[i];
        if (x >= b.minX + 1.0 && x <= b.maxX - 1.0 && z >= b.minZ + 1.0 && z <= b.maxZ - 1.0) {
          if (b.maxY <= currentY + 1.8 && b.maxY > base) {
            base = b.maxY;
          }
        }
      }
    }
    return base;
  }

  function applyBodyDents(car) {
    if (car.frontBumperGroup) {
      const df = vClamp(car.dentFront, 0, 1);
      car.frontBumperGroup.position.z = car.def.length * 0.5 + 0.01 - df * 0.14;
      car.frontBumperGroup.rotation.z = df * 0.09 * car.dentSideSign;
      car.frontBumperGroup.rotation.x = df * 0.11;
    }
    if (car.hoodPanel) {
      const hb = vClamp(car.hoodBuckle, 0, 1);
      car.hoodPanel.rotation.x = -hb * 0.26;
      car.hoodPanel.rotation.z = hb * 0.06 * car.dentSideSign;
    }
    if (car.rearBumperGroup) {
      const dr = vClamp(car.dentRear, 0, 1);
      car.rearBumperGroup.position.z = -car.def.length * 0.5 - 0.02 + dr * 0.12;
      car.rearBumperGroup.rotation.z = -dr * 0.08 * car.dentSideSign;
    }
  }

  function spawnVehicle(arg0, arg1, arg2, arg3, arg4, arg5) {
    let rawType = 'sedan_lux';
    let x = 0;
    let y = null;
    let z = 0;
    let yaw = 0;
    let opts = {};

    if (typeof arg0 === 'object' && arg0 !== null) {
      opts = arg0;
      rawType = opts.type || 'sedan_lux';
      x = Number(opts.x) || 0;
      y = Number.isFinite(opts.y) ? opts.y : null;
      z = Number(opts.z) || 0;
      yaw = Number(opts.yaw ?? opts.rotation ?? 0) || 0;
    } else {
      rawType = String(arg0 || 'sedan_lux').toLowerCase();
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
        const mappedCheck = ARCHETYPE_ALIASES[rawType] || 'sedan_lux';
        if (mappedCheck === 'heli' && arg2 > 10 && Math.abs(arg2) > Math.PI * 2) {
          x = arg1;
          y = arg2;
          z = arg3;
          opts = (typeof arg4 === 'object' && arg4) || {};
          yaw = Number(opts.yaw ?? 0) || 0;
        } else {
          x = arg1;
          z = arg2;
          yaw = arg3;
          opts = (typeof arg4 === 'object' && arg4) || {};
          y = Number.isFinite(opts.y) ? opts.y : null;
        }
      } else if (typeof arg1 === 'number' && typeof arg2 === 'number') {
        x = arg1;
        z = arg2;
        opts = (typeof arg3 === 'object' && arg3) || {};
        y = Number.isFinite(opts.y) ? opts.y : null;
        yaw = Number(opts.yaw ?? 0) || 0;
      }
    }

    const type = ARCHETYPE_ALIASES[rawType] || 'sedan_lux';
    const def = VEHICLE_ARCHETYPES[type];
    const palette = def.palette;
    const baseColor = opts.color !== undefined
      ? opts.color
      : palette[(nextVehicleId - 1) % palette.length];
    const initialY = y !== null ? y : sampleGroundY(x, z, 0.05);

    const built = buildGroundCarMesh(
      def,
      baseColor,
      { ...opts, isPolice: opts.isPolice ?? def.isPolice },
      sharedGeos,
      staticMats,
      texCache
    );

    const scene = getScene();
    if (scene) {
      fx.ensureAttached(scene);
      scene.add(built.root);
    }

    built.root.position.set(x, initialY, z);
    built.root.rotation.y = yaw;

    const id = opts.mpId || opts.id || `veh_${nextVehicleId++}`;
    const isPolice = Boolean(opts.isPolice ?? opts.isPoliceUnit ?? opts.isPoliceHeli ?? def.isPolice);

    const car = {
      id,
      mpId: opts.mpId || null,
      remoteDriverId: opts.remoteDriverId || null,
      mpTarget: null,
      type,
      archetype: type,
      def,
      name: def.name,
      modelName: def.name,
      displayName: def.label,
      category: def.category,
      label: def.label,
      plate: built.plateStr,
      isHeli: Boolean(def.isHeli),
      isHelicopter: Boolean(def.isHeli),
      isOpenTop: Boolean(def.isOpenTop),
      isPolice,
      isPoliceHeli: Boolean(opts.isPoliceHeli),
      isPoliceUnit: Boolean(opts.isPoliceUnit),
      isParked: Boolean(opts.isParked ?? false),
      isHero: Boolean(opts.isHero ?? false),
      isTraffic: Boolean(opts.isTraffic ?? false),
      isMission: Boolean(opts.isMission ?? opts.isMissionCar ?? false),
      aiControlled: Boolean(opts.aiControlled ?? false),
      hasAIDriver: Boolean(opts.hasAIDriver ?? opts.aiControlled ?? opts.isTraffic ?? (isPolice && !opts.isParked && !opts.mpId)),
      driver: opts.driver || null,
      isPlayerDriving: false,

      mesh: built.root,
      group: built.root,
      root: built.root,
      chassis: built.chassis,
      x,
      y: initialY,
      z,
      yaw,
      vx: Number(opts.vx) || 0,
      vy: Number(opts.vy) || 0,
      vz: Number(opts.vz) || 0,
      speed: Number(opts.speed) || 0,
      absSpeed: Math.abs(Number(opts.speed) || 0),
      steerAngle: 0,
      rotorPhase: Math.random() * Math.PI * 2,
      rotorRpm: def.isHeli && (opts.rotorRunning || (isPolice && !opts.mpId) || initialY > 10) ? 1.0 : 0.0,

      width: def.width,
      length: def.length,
      height: def.height,
      w: def.width,
      l: def.length,
      halfW: def.width * 0.5,
      halfL: def.length * 0.5,
      halfWidth: def.width * 0.5,
      halfLength: def.length * 0.5,
      radius: Math.hypot(def.width, def.length) * 0.45,

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
      suspY: 0,
      suspVelY: 0,
      isBraking: false,
      isReversing: false,
      isDrifting: false,
      sirenActive: Boolean(opts.sirenActive ?? (isPolice && !opts.isParked && !opts.mpId)),
      sirenPhase: Math.random() * 10,
      searchlightActive: Boolean(opts.searchlightActive ?? (def.isHeli && isPolice)),
      baseColor,

      dentFront: 0,
      dentRear: 0,
      hoodBuckle: 0,
      dentSideSign: Math.random() < 0.5 ? 1 : -1,
      smokeTimer: 0,
      skidTimer: 0,

      paintMat: built.paintMat,
      plateMat: built.plateMat || null,
      shadowCasters: built.shadowCasters || null,
      _castingShadows: Boolean(opts.isHero || opts.isMission),
      taillightMat: built.taillightMat,
      reverseLightMat: built.reverseLightMat,
      headlightMat: built.headlightMat,
      headlightCones: built.headlightCones,
      sirenRedMat: built.sirenRedMat,
      sirenBlueMat: built.sirenBlueMat,
      wheels: built.wheels,
      steeringWheelPivot: built.steeringWheelPivot,
      driverSeatAnchor: built.driverSeatAnchor,
      frontBumperGroup: built.frontBumperGroup,
      rearBumperGroup: built.rearBumperGroup,
      hoodPanel: built.hoodPanel,
      mainRotor: built.mainRotor,
      mainBlurDisc: built.mainBlurDisc,
      tailRotor: built.tailRotor,
      searchlightPivot: built.searchlightPivot,
      searchConeMesh: built.searchConeMesh,
      smokeOriginLocal: built.smokeOriginLocal,

      _lastX: x,
      _lastY: initialY,
      _lastZ: z,
      _lastYaw: yaw,
      _prevVFwd: 0
    };

    list.push(car);
    return car;
  }

  function removeVehicle(carOrId) {
    if (!carOrId) return false;
    const idx = list.findIndex((v) => v === carOrId || v.id === carOrId || v.mpId === carOrId);
    if (idx === -1) return false;
    const car = list[idx];

    if (ctx.player?.inCar === car) {
      exitVehicle(true);
    }

    if (car.mesh && car.mesh.parent) {
      car.mesh.parent.remove(car.mesh);
    }
    car.paintMat?.dispose?.();
    car.plateMat?.dispose?.();
    car.taillightMat?.dispose?.();
    car.reverseLightMat?.dispose?.();
    car.headlightMat?.dispose?.();
    car.sirenRedMat?.dispose?.();
    car.sirenBlueMat?.dispose?.();

    list.splice(idx, 1);
    return true;
  }

  function clearNonMissionVehicles() {
    for (let i = list.length - 1; i >= 0; i--) {
      const c = list[i];
      if (!c.isMission) {
        removeVehicle(c);
      }
    }
  }

  function findNearestEnterable(arg0, arg1, arg2, arg3) {
    let qx = ctx.player?.x ?? 0;
    let qy = ctx.player?.y ?? 0;
    let qz = ctx.player?.z ?? 0;
    let maxDist = 4.8;

    if (typeof arg0 === 'number' && typeof arg1 === 'number' && typeof arg2 === 'number' && typeof arg3 === 'number') {
      qx = arg0; qy = arg1; qz = arg2; maxDist = arg3;
    } else if (typeof arg0 === 'number' && typeof arg1 === 'number') {
      qx = arg0; qz = arg1;
      if (typeof arg2 === 'number') maxDist = arg2;
    } else if (arg0 && typeof arg0 === 'object' && arg0 !== ctx && Number.isFinite(arg0.x)) {
      qx = arg0.x;
      qy = Number.isFinite(arg0.y) ? arg0.y : qy;
      qz = arg0.z;
      if (typeof arg1 === 'number') maxDist = arg1;
    }

    let best = null;
    let bestD2 = maxDist * maxDist;

    for (let i = 0; i < list.length; i++) {
      const v = list[i];
      if (!v || v.destroyed || !v.alive) continue;
      if (v.remoteDriverId && v.remoteDriverId !== ctx.mp?.playerId) continue;
      const dy = Math.abs((v.y || 0) - qy);
      if (dy > 4.2) continue;
      const dx = v.x - qx;
      const dz = v.z - qz;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = v;
      }
    }
    return best;
  }

  function enterVehicle(arg0, arg1) {
    const player = ctx.player;
    if (!player || player.isDead || player.rappelState?.active) return false;
    if (player.inCar) return player.inCar;

    let car = null;
    if (arg0 && arg0.mesh && arg0.type) car = arg0;
    else if (arg1 && arg1.mesh && arg1.type) car = arg1;
    else car = findNearestEnterable(player.x, player.z, 5.0);

    if (!car || car.destroyed || !car.alive) return false;
    if (car.remoteDriverId && car.remoteDriverId !== ctx.mp?.playerId) return false;

    if (car.hasAIDriver || car.aiControlled || car.isTraffic || (car.isPolice && !car.isParked && !car.mpId)) {
      ctx.gameplay?.addCrimeHeat?.(car.isPolice ? 36 : 12, 'carjack');
      car.hasAIDriver = false;
      car.aiControlled = false;
      car.isTraffic = false;
      car.isPoliceUnit = false;
      car.isRivalCartel = false;
    }

    car.isParked = false;
    car.driver = 'player';
    car.isPlayerDriving = true;
    setVehicleCastShadow(car, true);
    if (car.isHeli) {
      car.rotorRpm = Math.max(car.rotorRpm, 0.45);
      car.searchlightActive = false;
    }

    player.inCar = car;
    player.vehicle = car;
    player.car = car;
    player.inCarId = car.mpId || car.id;
    player.isAiming = false;
    player.x = car.x;
    player.y = car.y;
    player.z = car.z;
    player.yaw = car.yaw;

    const rig = player.rig || player.mesh;
    if (rig?.joints?.pelvis) rig.joints.pelvis.position.y = 0.48;
    ctx.characters?.animateHumanoid?.(player.rig || player, 'driving', 0.05);
    syncPlayerMeshInCar(car, 0.016);

    ctx.ui?.showVehicleCallout?.(car.label);
    ctx.ui?.showVehicleBanner?.(car.name, car.category);
    ctx.ui?.onEnterVehicle?.(car);
    ctx.audio?.playDoor?.();
    if (car.mpId && ctx.mp?.connected) {
      ctx.mp.onEnterCar?.(car);
    }

    enterExitCooldown = 0.38;
    return car;
  }

  function exitVehicle(forceArg) {
    const player = ctx.player;
    const car = player?.inCar;
    if (!player || !car) return false;

    const forced = forceArg === true;
    const absSpeed = Math.hypot(car.vx, car.vz);
    const highSpeedBail = !forced && absSpeed > 15.0;

    const leftX = Math.cos(car.yaw);
    const leftZ = -Math.sin(car.yaw);
    const sideDist = car.width * 0.5 + 0.88;

    const testEnt = { x: car.x + leftX * sideDist, y: car.y + 0.3, z: car.z + leftZ * sideDist };
    const origLX = testEnt.x;
    const origLZ = testEnt.z;
    ctx.world?.resolveCircleAABB?.(testEnt, 0.44);
    if (Math.hypot(testEnt.x - origLX, testEnt.z - origLZ) > 0.32) {
      testEnt.x = car.x - leftX * sideDist;
      testEnt.z = car.z - leftZ * sideDist;
      ctx.world?.resolveCircleAABB?.(testEnt, 0.44);
    }

    const groundAtExit = sampleGroundY(testEnt.x, testEnt.z, 0.22);
    const exitingAirborneHeli = car.isHeli && car.y > groundAtExit + 1.5;
    player.x = testEnt.x;
    player.z = testEnt.z;
    player.y = exitingAirborneHeli ? car.y : Math.max(groundAtExit, car.y);
    player.yaw = car.yaw;

    if (highSpeedBail) {
      const invulnerable = ctx.gameplay?.isPlayerInvulnerable?.();
      player.vx = car.vx * 0.52 + leftX * 3.8;
      player.vz = car.vz * 0.52 + leftZ * 3.8;
      player.vy = 2.4;
      player.isGrounded = false;
      if (!invulnerable && typeof player.hp === 'number' && player.hp > 10) {
        player.hp = Math.max(5, player.hp - 8);
      }
      fx.spawnSparkBurst(player.x, player.y + 0.2, player.z, 12, 9);
      fx.spawnPuff(player.x, player.y + 0.3, player.z, player.vx * 0.2, 1.2, player.vz * 0.2, 0xcbd5e1, 0.6, 2.0, 0.55);
      ctx.engine?.addShake?.(0.35);
      if (!invulnerable) ctx.engine?.triggerDamageFlash?.(0.25);
      ctx.audio?.playCrash?.(0.35);
      ctx.characters?.animateHumanoid?.(player.rig || player, 'ragdoll', 0.016);
    } else {
      player.vx = 0;
      player.vy = 0;
      player.vz = 0;
      player.isGrounded = !exitingAirborneHeli;
      ctx.characters?.animateHumanoid?.(player.rig || player, 'idle', 0.016);
      ctx.audio?.playDoor?.();
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

    player.inCar = null;
    player.vehicle = null;
    player.car = null;
    player.inCarId = null;

    if (car.mpId && ctx.mp?.connected) {
      ctx.mp.onExitCar?.(car);
    }

    ctx.audio?.updateEngine?.(0, 40, 0, false, 0);
    enterExitCooldown = 0.38;
    return true;
  }

  function syncPlayerMeshInCar(car, dt) {
    const player = ctx.player;
    if (!player) return;
    const pMesh = player.mesh || player.rig?.root;
    if (!pMesh) return;

    if ((player.fireCooldown || 0) > 0) {
      player.fireCooldown = Math.max(0, player.fireCooldown - dt);
    }

    const inp = ctx.input || {};
    const firingDriveBy = Boolean(inp.fire && !inp.phoneOpen && !inp.wheelOpen && !ctx.paused);
    const aimingDriveBy = Boolean((inp.aim || firingDriveBy) && !inp.phoneOpen && !inp.wheelOpen);
    let aimYawOff = 0;
    let aimPitch = 0;

    if (aimingDriveBy && ctx.engine?.getAimRay) {
      const ray = ctx.engine.getAimRay();
      if (ray?.dir) {
        const worldAimYaw = Math.atan2(ray.dir.x, ray.dir.z);
        aimYawOff = vWrapAngle(worldAimYaw - car.yaw);
        aimPitch = vClamp(Math.asin(vClamp(ray.dir.y, -0.7, 0.7)), -0.55, 0.55);
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
    ctx.characters?.animateHumanoid?.(rig, 'driving', dt, {
      steer: car.steerAngle / 0.42,
      aimDriveBy: aimingDriveBy,
      aimYawOffset: aimYawOff,
      aimPitch
    });

    if (car.isOpenTop && car.driverSeatAnchor) {
      pMesh.visible = true;
      car.chassis.updateMatrixWorld(true);
      car.driverSeatAnchor.getWorldPosition(_tmpVecA);
      car.chassis.getWorldQuaternion(_tmpQuatA);
      _tmpVecB.set(0, -0.35, 0.03).applyQuaternion(_tmpQuatA);
      pMesh.position.copy(_tmpVecA).add(_tmpVecB);
      pMesh.quaternion.copy(_tmpQuatA);
    } else {
      pMesh.visible = false;
      pMesh.position.set(car.x, car.y, car.z);
    }
  }

  function detonateVehicle(car, fromNetwork = false) {
    if (!car || car.destroyed) return;
    car.destroyed = true;
    car.alive = false;
    car.onFire = false;
    car.fireTimer = 0;
    car.hp = 0;
    car.sirenActive = false;
    if (car.headlightCones) car.headlightCones.visible = false;
    if (car.searchConeMesh) car.searchConeMesh.visible = false;

    if (ctx.player?.inCar === car) {
      enterExitCooldown = 0;
      exitVehicle(true);
      if (!fromNetwork && !ctx.gameplay?.isPlayerInvulnerable?.()) {
        ctx.player.hp = 0;
      }
    }

    car.vy = 7.2;
    car.vx *= 0.35;
    car.vz *= 0.35;
    car.dentFront = 1.0;
    car.dentRear = 1.0;
    car.hoodBuckle = 1.0;
    applyBodyDents(car);

    if (car.paintMat) {
      car.paintMat.color.setHex(0x171719);
      car.paintMat.metalness = 0.15;
      car.paintMat.roughness = 0.92;
      car.paintMat.clearcoat = 0.0;
    }
    if (car.taillightMat) car.taillightMat.emissiveIntensity = 0;
    if (car.headlightMat) car.headlightMat.emissiveIntensity = 0;
    if (car.reverseLightMat) car.reverseLightMat.emissiveIntensity = 0;
    if (car.sirenRedMat) car.sirenRedMat.emissiveIntensity = 0;
    if (car.sirenBlueMat) car.sirenBlueMat.emissiveIntensity = 0;

    for (let i = 0; i < car.wheels.length; i++) {
      car.wheels[i].suspNode.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.18;
    }

    fx.spawnFallbackExplosionFX(car.x, car.y + 0.6, car.z);
    ctx.characters?.spawnExplosion?.(car.x, car.y + 0.8, car.z, 1.45, ctx, fromNetwork);
    ctx.engine?.addShake?.(0.85);
  }

  function damageVehicle(carOrId, amount = 15, attacker = null, hitPoint = null) {
    const car = typeof carOrId === 'object' ? carOrId : list.find((v) => v.id === carOrId || v.mpId === carOrId);
    if (!car || car.destroyed) return false;
    const dmg = Math.max(0, Number(amount) || 0);
    if (dmg <= 0) return false;

    car.hp -= dmg;

    if (car.mpId && ctx.mp?.connected && attacker !== 'network') {
      ctx.mp.onDamageCar?.(car, dmg);
    }

    const sx = hitPoint?.x ?? car.x + (Math.random() - 0.5) * 1.2;
    const sy = hitPoint?.y ?? car.y + 0.65;
    const sz = hitPoint?.z ?? car.z + (Math.random() - 0.5) * 1.8;
    fx.spawnSparkBurst(sx, sy, sz, Math.min(14, Math.ceil(dmg * 0.35)), 8.5);

    if (dmg >= 8) {
      car.hoodBuckle = vClamp(car.hoodBuckle + dmg * 0.008, 0, 1);
      car.dentFront = vClamp(car.dentFront + dmg * 0.006, 0, 1);
      applyBodyDents(car);
    }

    if (ctx.player?.inCar === car && dmg >= 6) {
      ctx.engine?.addShake?.(vClamp(dmg * 0.012, 0.08, 0.45));
    }

    const hpRatio = car.hp / car.maxHp;
    if (hpRatio < 0.15 && !car.onFire) {
      car.onFire = true;
      car.fireTimer = 4.5;
    }

    if (car.hp <= 0 && !car.mpId) {
      if (dmg >= 75 || (car.onFire && car.fireTimer < 2.5 && dmg >= 20)) {
        detonateVehicle(car);
      } else {
        car.hp = 1;
        car.onFire = true;
        car.fireTimer = Math.min(car.fireTimer || 4.5, 2.2);
      }
    }
    return true;
  }

  function repairAndRespray(targetCar, customColor, fromNetwork = false) {
    const car = targetCar || ctx.player?.inCar;
    if (!car || car.destroyed) return false;

    car.hp = car.maxHp;
    car.onFire = false;
    car.fireTimer = 0;
    car.dentFront = 0;
    car.dentRear = 0;
    car.hoodBuckle = 0;
    applyBodyDents(car);

    if (car.paintMat && !car.isPolice && car.type !== 'taxi') {
      let nextCol = customColor;
      if (nextCol === undefined) {
        const curHex = car.paintMat.color.getHex();
        const choices = RESPRY_SHOWROOM_COLORS.filter((c) => c !== curHex);
        nextCol = choices[Math.floor(Math.random() * choices.length)] ?? 0xf2f4f7;
      }
      car.baseColor = nextCol;
      car.paintMat.color.setHex(nextCol);
      car.paintMat.roughness = car.def.isMatte ? 0.42 : 0.14;
      car.paintMat.clearcoat = car.def.isMatte ? 0.25 : 1.0;
    }

    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      fx.spawnPuff(
        car.x + Math.cos(a) * 1.4,
        car.y + 0.7,
        car.z + Math.sin(a) * 1.8,
        Math.cos(a) * 1.5,
        1.2,
        Math.sin(a) * 1.5,
        0xf5ecd8,
        0.55,
        2.1,
        0.75
      );
    }
    if (!fromNetwork) {
      ctx.audio?.playSpray?.();
      if (car.mpId && ctx.mp?.connected) {
        ctx.mp.onResprayCar?.(car);
      }
    }
    return true;
  }

  function readVehicleInputs() {
    const inp = ctx.input || {};
    if (inp.phoneOpen || inp.wheelOpen || inp.chatOpen || ctx.paused || ctx.started === false) {
      prevInteractHeld = false;
      prevHornHeld = false;
      return {
        throttle: 0, brake: 0, steer: 0, handbrake: false, boost: false,
        heliClimb: 0, heliPitchFwd: 0, interactJust: false, hornJust: false, hornHeld: false
      };
    }

    const k = inp.keys || {};
    const hasManagedKeys = Boolean(inp.keys);

    const keyW = Boolean(k.KeyW || k.w || (!hasManagedKeys && localKeys.KeyW));
    const keyS = Boolean(k.KeyS || k.s || (!hasManagedKeys && localKeys.KeyS));
    const keyA = Boolean(k.KeyA || k.a || (!hasManagedKeys && localKeys.KeyA));
    const keyD = Boolean(k.KeyD || k.d || (!hasManagedKeys && localKeys.KeyD));
    const arrowUp = Boolean(k.ArrowUp || (!hasManagedKeys && localKeys.ArrowUp));
    const arrowDown = Boolean(k.ArrowDown || (!hasManagedKeys && localKeys.ArrowDown));
    const arrowLeft = Boolean(k.ArrowLeft || (!hasManagedKeys && localKeys.ArrowLeft));
    const arrowRight = Boolean(k.ArrowRight || (!hasManagedKeys && localKeys.ArrowRight));
    const space = Boolean(inp.handbrake || inp.drift || k.Space || k[' '] || (!hasManagedKeys && localKeys.Space));
    const shift = Boolean(inp.boost || inp.sprint || k.ShiftLeft || k.ShiftRight || (!hasManagedKeys && (localKeys.ShiftLeft || localKeys.ShiftRight)));

    let throttle = Number(inp.throttle ?? inp.gas ?? inp.accelerate ?? 0) || 0;
    let brake = Number(inp.brake ?? inp.reverse ?? 0) || 0;
    if (inp.forward || keyW || arrowUp) throttle = Math.max(throttle, 1);
    if (inp.backward || inp.back || keyS || arrowDown) brake = Math.max(brake, 1);

    let steer = 0;
    if (typeof inp.steer === 'number' && Math.abs(inp.steer) > 0.04) steer = vClamp(inp.steer, -1, 1);
    else if (typeof inp.moveX === 'number' && Math.abs(inp.moveX) > 0.05) steer = vClamp(inp.moveX, -1, 1);
    else if (typeof inp.joyX === 'number' && Math.abs(inp.joyX) > 0.05) steer = vClamp(inp.joyX, -1, 1);
    else {
      const goLeft = Boolean(inp.left || inp.steerLeft || keyA || arrowLeft);
      const goRight = Boolean(inp.right || inp.steerRight || keyD || arrowRight);
      steer = (goRight ? 1 : 0) - (goLeft ? 1 : 0);
    }

    let heliClimb = 0;
    if (inp.heliUp || keyW || space) heliClimb += 1;
    if (inp.heliDown || keyS) heliClimb -= 1;

    let heliPitchFwd = 0;
    if (inp.pitchForward || arrowUp) heliPitchFwd += 1;
    if (inp.pitchBack || arrowDown) heliPitchFwd -= 1;
    if (heliPitchFwd === 0 && typeof inp.joyY === 'number' && Math.abs(inp.joyY) > 0.15) {
      heliPitchFwd = vClamp(inp.joyY, -1, 1);
    }

    const interactRaw = Boolean(
      inp.interactJustPressed || inp.enterExitJustPressed || inp.vehicleJustPressed ||
      inp.useJustPressed || inp.exitCarJustPressed || inp.interact || inp.enterExit ||
      k.KeyF || k.f || k.KeyE || k.e || (!hasManagedKeys && (localKeys.KeyF || localKeys.KeyE))
    );
    const interactJust = Boolean(
      inp.interactJustPressed || inp.enterExitJustPressed || inp.vehicleJustPressed ||
      (interactRaw && !prevInteractHeld)
    );
    prevInteractHeld = interactRaw;

    const hornRaw = Boolean(inp.hornJustPressed || inp.horn || inp.sirenJustPressed || k.KeyH || k.h || (!hasManagedKeys && localKeys.KeyH));
    const hornJust = Boolean(inp.hornJustPressed || inp.sirenJustPressed || (hornRaw && !prevHornHeld));
    prevHornHeld = hornRaw;

    return {
      throttle: vClamp(throttle, 0, 1),
      brake: vClamp(brake, 0, 1),
      steer: vClamp(steer, -1, 1),
      handbrake: space,
      boost: shift,
      heliClimb: vClamp(heliClimb, -1, 1),
      heliPitchFwd: vClamp(heliPitchFwd, -1, 1),
      interactJust,
      hornJust,
      hornHeld: hornRaw
    };
  }

  function stepHelicopter(car, dt, playerInput) {
    const isPlayer = car === ctx.player?.inCar;
    const isRemoteDriven = !isPlayer && Boolean(car.remoteDriverId && car.mpTarget);
    const extMoved = !isPlayer && !isRemoteDriven && (
      Math.hypot(car.x - car._lastX, car.z - car._lastZ) > 0.0005 ||
      Math.abs(car.y - car._lastY) > 0.0005
    );

    const surfaceY = sampleHeliLandingSurfaceY(car.x, car.z, car.y);

    if (isRemoteDriven) {
      const t = car.mpTarget;
      car.x = vSmoothDamp(car.x, t.x, 12, dt);
      car.y = vSmoothDamp(car.y, t.y, 12, dt);
      car.z = vSmoothDamp(car.z, t.z, 12, dt);
      const diffYaw = vWrapAngle(t.yaw - car.yaw);
      car.yaw = vWrapAngle(car.yaw + diffYaw * (1 - Math.exp(-12 * dt)));
      car.vx = t.vx || 0;
      car.vy = t.vy || 0;
      car.vz = t.vz || 0;
      car.rotorRpm = vSmoothDamp(car.rotorRpm, Math.max(0.85, t.rotorRpm || 1.0), 4, dt);
      const hSpd = Math.hypot(car.vx, car.vz);
      car.pitch = vSmoothDamp(car.pitch, vClamp(hSpd * 0.008, 0, 0.22), 6, dt);
      car.roll = vSmoothDamp(car.roll, vClamp(-diffYaw * 1.5, -0.25, 0.25), 6, dt);
    } else if (isPlayer) {
      car.rotorRpm = vSmoothDamp(car.rotorRpm, 1.0, 2.8, dt);
      const liftPower = car.rotorRpm > 0.45 ? 1.0 : car.rotorRpm * 2.0;

      const targetVy = playerInput.heliClimb * 13.5 * liftPower;
      car.vy = vSmoothDamp(car.vy, targetVy, 4.2, dt);
      car.y = vClamp(car.y + car.vy * dt, surfaceY, 128);

      const airborne = car.y > surfaceY + 0.25;
      if (!airborne && car.vy < 0) {
        car.vy = 0;
        car.y = surfaceY;
      }

      if (airborne) {
        car.yaw = vWrapAngle(car.yaw - playerInput.steer * 1.65 * dt);
        const fwdX = Math.sin(car.yaw);
        const fwdZ = Math.cos(car.yaw);
        const rightX = -Math.cos(car.yaw);
        const rightZ = Math.sin(car.yaw);

        const thrust = playerInput.heliPitchFwd * car.accel * 1.15;
        const strafe = playerInput.steer * 5.5;
        car.vx += (fwdX * thrust + rightX * strafe) * dt;
        car.vz += (fwdZ * thrust + rightZ * strafe) * dt;
      }

      const drag = airborne ? 0.85 : 4.5;
      car.vx *= Math.exp(-drag * dt);
      car.vz *= Math.exp(-drag * dt);

      const hSpd = Math.hypot(car.vx, car.vz);
      if (hSpd > car.maxSpeed) {
        const s = car.maxSpeed / hSpd;
        car.vx *= s;
        car.vz *= s;
      }

      car.x = vClamp(car.x + car.vx * dt, -315, 275);
      car.z = vClamp(car.z + car.vz * dt, -345, 255);

      if (car.y < 76) {
        const col = ctx.world?.resolveCarAABB?.(car);
        if (col && (col === true || col.hit)) {
          const imp = col.impactSpeed ?? Math.hypot(car.vx, car.vz);
          car.vx *= -0.35;
          car.vz *= -0.35;
          if (imp > 9) damageVehicle(car, (imp - 7) * 1.8);
        }
      }

      car.pitch = vSmoothDamp(car.pitch, airborne ? playerInput.heliPitchFwd * 0.24 : 0, 6.0, dt);
      car.roll = vSmoothDamp(car.roll, airborne ? -playerInput.steer * 0.28 : 0, 6.0, dt);

      if (playerInput.hornJust) car.searchlightActive = !car.searchlightActive;
      ctx.audio?.updateEngine?.(Math.hypot(car.vx, car.vz), car.maxSpeed, Math.abs(playerInput.heliClimb) + Math.abs(playerInput.heliPitchFwd), true, car.rotorRpm);
    } else if (extMoved) {
      car.vx = (car.x - car._lastX) / dt;
      car.vy = (car.y - car._lastY) / dt;
      car.vz = (car.z - car._lastZ) / dt;
      car.rotorRpm = 1.0;
      const hSpd = Math.hypot(car.vx, car.vz);
      car.pitch = vSmoothDamp(car.pitch, vClamp(hSpd * 0.008, 0, 0.20), 5.0, dt);
      car.roll = vSmoothDamp(car.roll, vClamp(-vWrapAngle(car.yaw - car._lastYaw) * 4.0, -0.26, 0.26), 5.0, dt);
    } else {
      if (car.mpTarget && !car.remoteDriverId) {
        car.x = vSmoothDamp(car.x, car.mpTarget.x, 6, dt);
        car.z = vSmoothDamp(car.z, car.mpTarget.z, 6, dt);
      }
      if (car.y > surfaceY + 0.05) {
        car.vy -= 9.8 * dt;
        car.y = Math.max(surfaceY, car.y + car.vy * dt);
        if (car.y <= surfaceY + 0.01) car.vy = 0;
      } else {
        car.y = surfaceY;
        car.vy = 0;
      }
      car.vx *= Math.exp(-3.0 * dt);
      car.vz *= Math.exp(-3.0 * dt);
      car.x += car.vx * dt;
      car.z += car.vz * dt;
      car.rotorRpm = vSmoothDamp(car.rotorRpm, car.isPolice && car.y > 5 ? 1.0 : 0.0, 1.4, dt);
      car.pitch = vSmoothDamp(car.pitch, 0, 5.0, dt);
      car.roll = vSmoothDamp(car.roll, 0, 5.0, dt);
    }

    car.speed = Math.hypot(car.vx, car.vz);
    car.absSpeed = car.speed;

    if (car.mainRotor) {
      car.rotorPhase += car.rotorRpm * 34.0 * dt;
      car.mainRotor.rotation.y = car.rotorPhase;
      if (car.mainBlurDisc) car.mainBlurDisc.visible = car.rotorRpm > 0.45 && !car.destroyed;
    }
    if (car.tailRotor) car.tailRotor.rotation.x = car.rotorPhase * 1.8;

    if (car.searchConeMesh && car.searchlightPivot) {
      const showBeam = !car.destroyed && !car.isPoliceHeli && (car.searchlightActive || (car.isPolice && car.y > 10));
      car.searchConeMesh.visible = showBeam;
      if (showBeam && car.isPolice && !isPlayer && ctx.player) {
        car.mesh.updateMatrixWorld(true);
        _tmpVecA.set(ctx.player.x, ctx.player.y + 0.5, ctx.player.z);
        car.searchlightPivot.lookAt(_tmpVecA);
      } else if (showBeam && isPlayer) {
        car.searchlightPivot.rotation.set(0.85, 0, 0);
      }
    }

    car.chassis.rotation.x = car.pitch;
    car.chassis.rotation.z = car.roll;
    car.mesh.position.set(car.x, car.y, car.z);
    car.mesh.rotation.y = car.yaw;

    if (isPlayer) {
      ctx.player.x = car.x;
      ctx.player.y = car.y;
      ctx.player.z = car.z;
      ctx.player.yaw = car.yaw;
      ctx.player.vx = car.vx;
      ctx.player.vz = car.vz;
      ctx.player.speed = car.speed;
      syncPlayerMeshInCar(car, dt);
    }
  }

  function setVehicleCastShadow(car, enabled) {
    const casters = car?.shadowCasters;
    const flag = Boolean(enabled);
    if (!casters || car._castingShadows === flag) return;
    car._castingShadows = flag;
    for (let i = 0; i < casters.length; i++) {
      casters[i].castShadow = flag;
    }
  }

  function stepGroundCar(car, dt, playerInput, isNightMode, isWetRoad) {
    const isPlayer = car === ctx.player?.inCar;
    const pl = ctx.player;
    const pDistSq = pl ? (car.x - pl.x) * (car.x - pl.x) + (car.z - pl.z) * (car.z - pl.z) : 0;
    const isRemoteDriven = !isPlayer && Boolean(car.remoteDriverId && car.mpTarget);
    const protectCar = isPlayer || car.isMission || car.isHero || car.isPolice || isRemoteDriven;

    if (!protectCar && !car.destroyed && pDistSq > 145 * 145) {
      if (car.mesh.visible) car.mesh.visible = false;
      setVehicleCastShadow(car, false);
      if (!car.aiControlled && (Math.abs(car.vx) > 0.05 || Math.abs(car.vz) > 0.05)) {
        car.x = vClamp(car.x + car.vx * dt, -315, 275);
        car.z = vClamp(car.z + car.vz * dt, -345, 255);
      }
      return;
    }
    if (!car.mesh.visible) car.mesh.visible = true;

    if (car.destroyed) {
      const gy = sampleGroundY(car.x, car.z, 0.02);
      if (car.y > gy || car.vy !== 0) {
        car.vy -= 22.0 * dt;
        car.y += car.vy * dt;
        if (car.y <= gy) {
          car.y = gy;
          car.vy = Math.abs(car.vy) > 2.5 ? -car.vy * 0.25 : 0;
        }
      }
      car.vx *= Math.exp(-4.5 * dt);
      car.vz *= Math.exp(-4.5 * dt);
      car.x += car.vx * dt;
      car.z += car.vz * dt;
      car.mesh.position.set(car.x, car.y, car.z);
      car.mesh.rotation.y = car.yaw;
      return;
    }

    const extMoved = !isPlayer && !isRemoteDriven && (
      Math.hypot(car.x - car._lastX, car.z - car._lastZ) > 0.0004
    );
    const isKinematicAI = !isPlayer && !isRemoteDriven && (extMoved || car.aiControlled);

    if (isRemoteDriven) {
      const t = car.mpTarget;
      car.x = vSmoothDamp(car.x, t.x, 14, dt);
      car.z = vSmoothDamp(car.z, t.z, 14, dt);
      const diffYaw = vWrapAngle(t.yaw - car.yaw);
      car.yaw = vWrapAngle(car.yaw + diffYaw * (1 - Math.exp(-14 * dt)));
      car.vx = t.vx || 0;
      car.vz = t.vz || 0;
      car.steerAngle = vSmoothDamp(car.steerAngle, t.steerAngle || 0, 12, dt);
      car.sirenActive = Boolean(t.sirenActive);
    } else if (!isPlayer && car.mpTarget && !car.remoteDriverId && Math.hypot(car.x - car.mpTarget.x, car.z - car.mpTarget.z) > 1.5) {
      car.x = vSmoothDamp(car.x, car.mpTarget.x, 5, dt);
      car.z = vSmoothDamp(car.z, car.mpTarget.z, 5, dt);
      const diffYaw = vWrapAngle(car.mpTarget.yaw - car.yaw);
      car.yaw = vWrapAngle(car.yaw + diffYaw * (1 - Math.exp(-5 * dt)));
    }

    const fwdX = Math.sin(car.yaw);
    const fwdZ = Math.cos(car.yaw);
    const rightX = -Math.cos(car.yaw);
    const rightZ = Math.sin(car.yaw);

    let vFwd = car.vx * fwdX + car.vz * fwdZ;
    let vLat = car.vx * rightX + car.vz * rightZ;
    let yawRate = 0;

    const onBeachSand = car.x < -128 && !(car.z >= -32 && car.z <= 22 && car.y > 1.8);

    if (isRemoteDriven) {
      yawRate = vWrapAngle(car.yaw - car._lastYaw) / dt;
      car.isBraking = vFwd < car._prevVFwd - 4.0 * dt;
      car.isReversing = vFwd < -0.5;
      car.isDrifting = Math.abs(vLat) > 4.2;
    } else if (isKinematicAI) {
      if (extMoved) {
        car.vx = (car.x - car._lastX) / dt;
        car.vz = (car.z - car._lastZ) / dt;
      } else if (!car.braking) {
        car.vx *= Math.exp(-8 * dt);
        car.vz *= Math.exp(-8 * dt);
      } else {
        car.vx = 0;
        car.vz = 0;
      }
      vFwd = car.vx * fwdX + car.vz * fwdZ;
      vLat = car.vx * rightX + car.vz * rightZ;
      yawRate = vWrapAngle(car.yaw - car._lastYaw) / dt;
      const targetAISteer = typeof car.steer === 'number'
        ? vClamp(car.steer * 0.40, -0.42, 0.42)
        : vClamp(-yawRate * 0.22, -0.42, 0.42);
      car.steerAngle = vSmoothDamp(car.steerAngle, targetAISteer, 10, dt);
      car.isBraking = Boolean(car.braking) || vFwd < car._prevVFwd - 4.0 * dt;
      car.isReversing = vFwd < -0.5;
      car.isDrifting = Math.abs(vLat) > 4.2;
    } else {
      const aiCtrl = !isPlayer ? (car.aiInput || car.controls || null) : null;
      const gas = isPlayer ? playerInput.throttle : vClamp(Number(aiCtrl?.throttle ?? car.aiThrottle ?? 0), 0, 1);
      const brk = isPlayer ? playerInput.brake : vClamp(Number(aiCtrl?.brake ?? car.aiBrake ?? 0), 0, 1);
      const str = isPlayer ? playerInput.steer : vClamp(Number(aiCtrl?.steer ?? car.aiSteer ?? 0), -1, 1);
      const hbrk = isPlayer ? playerInput.handbrake : Boolean(aiCtrl?.handbrake ?? car.aiHandbrake);
      const bst = isPlayer && playerInput.boost;

      const focusMult = isPlayer && ctx.player?.specialActive ? 1.6 : 1.0;

      car.isBraking = false;
      car.isReversing = false;

      const topSpeed = car.maxSpeed * (bst ? 1.10 : 1.0) * (onBeachSand ? 0.82 : 1.0);
      const powerMult = onBeachSand ? 0.84 : 1.0;

      if (gas > 0.02) {
        if (vFwd < -1.1) {
          vFwd = Math.min(0, vFwd + 36.0 * gas * dt);
          car.isBraking = true;
        } else {
          const speedRatio = vClamp(Math.abs(vFwd) / topSpeed, 0, 1.2);
          const torqueCurve = Math.max(0.12, 1.0 - Math.pow(speedRatio, 1.75) * 0.88);
          vFwd += car.accel * gas * powerMult * torqueCurve * dt;
        }
      }

      if (brk > 0.02) {
        if (vFwd > 1.2) {
          vFwd = Math.max(0, vFwd - 35.0 * brk * dt);
          car.isBraking = true;
        } else {
          car.isReversing = true;
          const revMax = car.maxSpeed * 0.34;
          if (vFwd > -revMax) vFwd -= car.accel * 0.68 * brk * dt;
        }
      }

      const rollingDrag = (!isPlayer && !aiCtrl ? 2.4 : 0.42) + (onBeachSand ? 0.95 : 0);
      vFwd *= Math.exp(-rollingDrag * dt);
      if (Math.abs(vFwd) < 0.08 && gas < 0.02 && brk < 0.02) vFwd = 0;

      if (hbrk) {
        vFwd *= Math.exp(-1.85 * dt);
        car.isBraking = true;
      }

      car.steerAngle = vSmoothDamp(car.steerAngle, str * 0.42, 11.5 * focusMult, dt);

      const absFwd = Math.abs(vFwd);
      const lowSpdRamp = vClamp((absFwd - 0.25) / 3.8, 0, 1);
      const highSpdTaper = 1.0 / (1.0 + absFwd * 0.024);
      const dirSign = vFwd >= -0.15 ? 1 : -1;
      const driftTurnBoost = hbrk && absFwd > 4.5 ? 1.34 : 1.0;

      yawRate = -(car.steerAngle / 0.42) * 2.55 * lowSpdRamp * highSpdTaper * dirSign * driftTurnBoost * focusMult;
      car.yaw = vWrapAngle(car.yaw + yawRate * dt);

      if (hbrk && absFwd > 6.0 && Math.abs(str) > 0.15) {
        vLat += str * 5.2 * car.def.driftFactor * dt;
      }

      const wetMult = isWetRoad ? 0.78 : 1.0;
      const sandMult = onBeachSand ? 0.72 : 1.0;
      const baseLatGrip = hbrk
        ? 2.15 * car.def.driftFactor
        : 8.8 * car.def.grip * wetMult * sandMult * focusMult;
      vLat *= Math.exp(-baseLatGrip * dt);

      const nFwdX = Math.sin(car.yaw);
      const nFwdZ = Math.cos(car.yaw);
      const nRightX = -Math.cos(car.yaw);
      const nRightZ = Math.sin(car.yaw);
      car.vx = nFwdX * vFwd + nRightX * vLat;
      car.vz = nFwdZ * vFwd + nRightZ * vLat;

      car.x = vClamp(car.x + car.vx * dt, -315, 275);
      car.z = vClamp(car.z + car.vz * dt, -345, 255);

      car.isDrifting = (Math.abs(vLat) > 3.6 && absFwd > 5.0) || (hbrk && absFwd > 5.5);

      if (isPlayer && ctx.player && !ctx.player.specialActive && typeof ctx.player.special === 'number' && car.isDrifting) {
        ctx.player.special = Math.min(100, ctx.player.special + 3.5 * dt);
      }

      if (isPlayer && playerInput.hornJust && hornCooldown <= 0) {
        hornCooldown = 0.25;
        if (car.isPolice) {
          car.sirenActive = !car.sirenActive;
          ctx.audio?.setSiren?.(car.sirenActive);
        } else {
          ctx.audio?.playHorn?.(false);
        }
      }

      if (isPlayer) {
        const gearProgress = (absFwd / Math.max(1, car.maxSpeed)) * 6;
        const rpmNorm = 0.22 + (gearProgress % 1) * 0.68 + gas * 0.1;
        ctx.audio?.updateEngine?.(absFwd, car.maxSpeed, gas, false, rpmNorm);
      }

      const col = ctx.world?.resolveCarAABB?.(car);
      if (col && (col === true || col.hit)) {
        const nx = Number.isFinite(col.normalX) ? col.normalX : 0;
        const nz = Number.isFinite(col.normalZ) ? col.normalZ : 0;
        const imp = Number.isFinite(col.impactSpeed) ? col.impactSpeed : Math.hypot(car.vx, car.vz);

        if (nx !== 0 || nz !== 0) {
          const vn = car.vx * nx + car.vz * nz;
          if (vn < 0) {
            car.vx -= (1.32 * vn) * nx;
            car.vz -= (1.32 * vn) * nz;
            car.vx *= 0.78;
            car.vz *= 0.78;
          }
        } else {
          car.vx *= -0.35;
          car.vz *= -0.35;
        }

        if (imp > 5.5) {
          fx.spawnSparkBurst(
            car.x - nx * car.width * 0.45,
            car.y + 0.45,
            car.z - nz * car.length * 0.45,
            Math.min(16, Math.ceil(imp * 0.6)),
            9.5
          );
          if (vFwd >= 0) {
            car.dentFront = vClamp(car.dentFront + imp * 0.015, 0, 1);
            car.hoodBuckle = vClamp(car.hoodBuckle + imp * 0.018, 0, 1);
          } else {
            car.dentRear = vClamp(car.dentRear + imp * 0.016, 0, 1);
          }
          applyBodyDents(car);

          if (imp > 10.5 && isPlayer) {
            damageVehicle(car, (imp - 9.0) * 1.15);
          }
          if (isPlayer) {
            ctx.engine?.addShake?.(vClamp(imp * 0.022, 0.1, 0.55));
            ctx.audio?.playCrash?.(vClamp(imp / 30, 0.15, 1.0));
          }
        }
      }
    }

    car.speed = vFwd;
    car.absSpeed = Math.hypot(car.vx, car.vz);

    if (!isPlayer && !car.isMission && pDistSq > 55 * 55) {
      car.y = sampleGroundY(car.x, car.z, 0.02);
      car._prevVFwd = vFwd;
      car.mesh.position.set(car.x, car.y, car.z);
      car.mesh.rotation.y = car.yaw;
      if (car.headlightCones && car.headlightCones.visible) car.headlightCones.visible = false;
      setVehicleCastShadow(car, false);
      return;
    }

    setVehicleCastShadow(
      car,
      isPlayer || car.isHero || car.isMission || (ctx.engine?.quality === 'ULTRA' && pDistSq < 34 * 34)
    );

    const cosY = Math.cos(car.yaw);
    const sinY = Math.sin(car.yaw);
    let sumWheelGround = 0;
    const wheelGrounds = [0, 0, 0, 0];

    for (let wIdx = 0; wIdx < car.wheels.length; wIdx++) {
      const w = car.wheels[wIdx];
      const wx = car.x + w.baseX * cosY + w.baseZ * sinY;
      const wz = car.z - w.baseX * sinY + w.baseZ * cosY;
      let wg = sampleGroundY(wx, wz, 0.02);
      if (onBeachSand && car.absSpeed > 1.0) {
        wg += Math.sin(wx * 0.75 + wz * 0.55) * 0.028;
      }
      wheelGrounds[wIdx] = wg;
      sumWheelGround += wg;
    }

    const avgGroundY = sumWheelGround * 0.25;

    if (car.x < -206 || avgGroundY < -0.55) {
      car.vx *= Math.exp(-3.5 * dt);
      car.vz *= Math.exp(-3.5 * dt);
      if (avgGroundY < -0.78 && isPlayer) {
        damageVehicle(car, 22 * dt);
      }
    }

    const groundDelta = avgGroundY - car.y;
    car.suspVelY += (groundDelta * 68.0 - car.suspVelY * 11.5) * dt;
    car.y += car.suspVelY * dt;
    if (Math.abs(avgGroundY - car.y) > 1.2) {
      car.y = avgGroundY;
      car.suspVelY = 0;
    }

    const longAccel = vClamp((vFwd - car._prevVFwd) / Math.max(dt, 0.008), -45, 45);
    car._prevVFwd = vFwd;
    const centripetal = vFwd * yawRate;

    const stiff = car.def.stiffness || 1.0;
    const targetRoll = vClamp((centripetal * 0.0062) / stiff, -0.135, 0.135);
    const targetPitch = vClamp((-longAccel * 0.0029) / stiff, -0.085, 0.095);

    car.roll = vSmoothDamp(car.roll, targetRoll, 9.5, dt);
    car.pitch = vSmoothDamp(car.pitch, targetPitch, 9.5, dt);

    car.chassis.rotation.z = car.roll;
    car.chassis.rotation.x = car.pitch;
    car.chassis.position.y = vClamp((car.y - avgGroundY) * 0.35, -0.08, 0.10);

    const spinDelta = (vFwd / Math.max(0.2, car.def.wheelRadius)) * dt;
    for (let wIdx = 0; wIdx < car.wheels.length; wIdx++) {
      const w = car.wheels[wIdx];
      if (w.isFront) w.steerPivot.rotation.y = -car.steerAngle;
      w.spinGroup.rotation.x += spinDelta;
      const localGroundOffset = vClamp(wheelGrounds[wIdx] - car.y, -0.12, 0.14);
      w.suspNode.position.y = vSmoothDamp(w.suspNode.position.y, w.baseY + localGroundOffset, 18.0, dt);
    }

    if (car.steeringWheelPivot) {
      car.steeringWheelPivot.rotation.z = car.steerAngle * 3.2;
    }

    const burnout = isPlayer && playerInput.throttle > 0.85 && Math.abs(vFwd) < 6.0 && !extMoved;
    if (car.isDrifting || burnout) {
      car.skidTimer -= dt;
      if (car.skidTimer <= 0) {
        car.skidTimer = 0.042;
        for (const side of [1, -1]) {
          const rx = car.x + (side * car.def.wheelTrack) * cosY + car.def.wheelBaseR * sinY;
          const rz = car.z - (side * car.def.wheelTrack) * sinY + car.def.wheelBaseR * cosY;
          const rg = sampleGroundY(rx, rz, car.y);
          fx.addSkidmark(rx, rg, rz, car.yaw, onBeachSand, car.def.wheelWidth / 0.26);

          const smokeCol = onBeachSand ? 0xd6bc94 : 0xe5e9f0;
          fx.spawnPuff(
            rx, rg + 0.16, rz,
            -car.vx * 0.12 + (Math.random() - 0.5) * 0.9,
            0.55 + Math.random() * 0.65,
            -car.vz * 0.12 + (Math.random() - 0.5) * 0.9,
            smokeCol, 0.28, 1.15, 0.46
          );
        }
      }
      if (isPlayer && screechCooldown <= 0 && !onBeachSand) {
        screechCooldown = 0.24;
        ctx.audio?.playTireScreech?.(vClamp(Math.abs(vLat) / 10, 0.25, 0.9));
      }
    }

    if (car.taillightMat) {
      car.taillightMat.emissiveIntensity = car.isBraking ? 3.25 : (isNightMode ? 1.35 : 0.72);
    }
    if (car.reverseLightMat) {
      car.reverseLightMat.emissiveIntensity = car.isReversing ? 2.35 : 0.0;
    }
    if (car.headlightMat) {
      car.headlightMat.emissiveIntensity = isNightMode ? 2.6 : 1.15;
    }
    if (car.headlightCones) {
      car.headlightCones.visible = isNightMode && (isPlayer || isRemoteDriven || car.hasAIDriver || car.sirenActive);
    }

    if (car.sirenRedMat && car.sirenBlueMat) {
      if (car.sirenActive) {
        car.sirenPhase += dt * 11.5;
        const redOn = Math.sin(car.sirenPhase) > 0;
        car.sirenRedMat.emissiveIntensity = redOn ? 3.8 : 0.25;
        car.sirenBlueMat.emissiveIntensity = !redOn ? 3.8 : 0.25;
      } else {
        car.sirenRedMat.emissiveIntensity = 0.15;
        car.sirenBlueMat.emissiveIntensity = 0.15;
      }
    }

    const hpPct = car.hp / car.maxHp;
    if (hpPct < 0.65 || car.onFire) {
      car.smokeTimer -= dt;
      if (car.smokeTimer <= 0) {
        car.smokeTimer = car.onFire ? 0.055 : hpPct < 0.35 ? 0.085 : 0.14;
        _tmpVecA.copy(car.smokeOriginLocal);
        car.chassis.localToWorld(_tmpVecA);

        if (car.onFire || hpPct < 0.15) {
          if (!car.onFire) {
            car.onFire = true;
            car.fireTimer = 4.5;
          }
          fx.spawnPuff(
            _tmpVecA.x + (Math.random() - 0.5) * 0.35, _tmpVecA.y, _tmpVecA.z + (Math.random() - 0.5) * 0.35,
            (Math.random() - 0.5) * 1.1, 2.1 + Math.random() * 1.6, (Math.random() - 0.5) * 1.1,
            Math.random() > 0.4 ? 0xff5a00 : 0xffcc22, 0.34, 0.85, 0.28, true
          );
          fx.spawnPuff(
            _tmpVecA.x, _tmpVecA.y + 0.25, _tmpVecA.z,
            (Math.random() - 0.5) * 0.8, 2.4, (Math.random() - 0.5) * 0.8,
            0x16181c, 0.42, 1.75, 0.85, false
          );
        } else if (hpPct < 0.35) {
          fx.spawnPuff(
            _tmpVecA.x + (Math.random() - 0.5) * 0.28, _tmpVecA.y, _tmpVecA.z + (Math.random() - 0.5) * 0.28,
            (Math.random() - 0.5) * 0.7, 1.8 + Math.random() * 0.8, (Math.random() - 0.5) * 0.7,
            0x22252a, 0.35, 1.45, 0.78, false
          );
        } else {
          fx.spawnPuff(
            _tmpVecA.x + (Math.random() - 0.5) * 0.25, _tmpVecA.y, _tmpVecA.z + (Math.random() - 0.5) * 0.25,
            (Math.random() - 0.5) * 0.5, 1.35 + Math.random() * 0.6, (Math.random() - 0.5) * 0.5,
            0xdbe2ea, 0.28, 1.15, 0.65, false
          );
        }
      }
    }

    if (car.onFire && !car.mpId) {
      car.fireTimer -= dt;
      if (car.fireTimer <= 0) {
        detonateVehicle(car);
        return;
      }
    }

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
      syncPlayerMeshInCar(car, dt);
    }
  }

  function resolveVehiclePairCollisions() {
    const n = list.length;
    const pl = ctx.player;
    const plCar = pl?.inCar;
    const px = pl?.x ?? 0;
    const pz = pl?.z ?? 0;
    for (let i = 0; i < n; i++) {
      const a = list[i];
      if (!a || a.isHeli || a.isExtraVehicle) continue;
      if (pl && a !== plCar && !a.isMission) {
        const dxp = a.x - px;
        const dzp = a.z - pz;
        if (dxp * dxp + dzp * dzp > 95 * 95) continue;
      }
      for (let j = i + 1; j < n; j++) {
        const b = list[j];
        if (!b || b.isHeli || b.isExtraVehicle) continue;
        if (Math.abs(a.y - b.y) > 1.8) continue;

        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const maxReach = ((a.length || 4.4) + (b.length || 4.4)) * 0.55 + 0.6;
        const d2 = dx * dx + dz * dz;
        if (d2 >= maxReach * maxReach || d2 < 0.0001) continue;

        const dist = Math.sqrt(d2);
        const nx = dx / dist;
        const nz = dz / dist;

        // Oriented bounding projection using both width & length along each vehicle's yaw
        const aSin = Math.sin(a.yaw || 0), aCos = Math.cos(a.yaw || 0);
        const bSin = Math.sin(b.yaw || 0), bCos = Math.cos(b.yaw || 0);
        const aProj = Math.abs(nx * aCos - nz * aSin) * ((a.width || 1.95) * 0.5) + Math.abs(nx * aSin + nz * aCos) * ((a.length || 4.4) * 0.5);
        const bProj = Math.abs(nx * bCos - nz * bSin) * ((b.width || 1.95) * 0.5) + Math.abs(nx * bSin + nz * bCos) * ((b.length || 4.4) * 0.5);
        const minDist = aProj + bProj + 0.14;
        if (dist >= minDist) continue;
        const overlap = minDist - dist;

        const totalMass = a.mass + b.mass;
        const shareA = b.mass / totalMass;
        const shareB = a.mass / totalMass;

        a.x -= nx * overlap * shareA;
        a.z -= nz * overlap * shareA;
        b.x += nx * overlap * shareB;
        b.z += nz * overlap * shareB;

        const rvx = b.vx - a.vx;
        const rvz = b.vz - a.vz;
        const relAlongNormal = rvx * nx + rvz * nz;

        if (relAlongNormal < 0) {
          const restitution = 0.36;
          const jImp = -(1 + restitution) * relAlongNormal / (1 / a.mass + 1 / b.mass);
          a.vx -= (jImp / a.mass) * nx;
          a.vz -= (jImp / a.mass) * nz;
          b.vx += (jImp / b.mass) * nx;
          b.vz += (jImp / b.mass) * nz;

          const impactSpd = Math.abs(relAlongNormal);
          if (impactSpd > 5.0) {
            fx.spawnSparkBurst((a.x + b.x) * 0.5, Math.max(a.y, b.y) + 0.55, (a.z + b.z) * 0.5, 10, 8.5);
            a.dentFront = vClamp(a.dentFront + impactSpd * 0.012, 0, 1);
            b.dentFront = vClamp(b.dentFront + impactSpd * 0.012, 0, 1);
            applyBodyDents(a);
            applyBodyDents(b);

            if (impactSpd > 14.0 && !ctx.mp?.connected && (a === plCar || b === plCar)) {
              if (!a.destroyed) damageVehicle(a, (impactSpd - 12) * 0.65 * shareA * 2);
              if (!b.destroyed) damageVehicle(b, (impactSpd - 12) * 0.65 * shareB * 2);
            }
            if (ctx.player?.inCar === a || ctx.player?.inCar === b) {
              ctx.engine?.addShake?.(vClamp(impactSpd * 0.02, 0.08, 0.48));
              ctx.audio?.playCrash?.(vClamp(impactSpd / 28, 0.15, 0.95));
            }
          }
        }

        a.mesh.position.set(a.x, a.y, a.z);
        b.mesh.position.set(b.x, b.y, b.z);
      }
    }
  }

  let localElapsed = 0;

  function updateVehicles(arg0, arg1) {
    const rawDt = typeof arg0 === 'number' ? arg0 : (typeof arg1 === 'number' ? arg1 : 0.016);
    if (!Number.isFinite(rawDt) || rawDt <= 0) return;
    const dt = Math.min(rawDt, 0.05);
    localElapsed += dt;

    if (enterExitCooldown > 0) enterExitCooldown = Math.max(0, enterExitCooldown - dt);
    if (hornCooldown > 0) hornCooldown = Math.max(0, hornCooldown - dt);
    if (screechCooldown > 0) screechCooldown = Math.max(0, screechCooldown - dt);

    const scene = getScene();
    if (scene) fx.ensureAttached(scene);

    const playerInput = readVehicleInputs();

    if (playerInput.interactJust && enterExitCooldown <= 0 && ctx.player && !ctx.player.isDead) {
      if (ctx.player.inCar) {
        if (!ctx.player.inCar.isExtraVehicle) {
          exitVehicle();
        }
      } else if (!ctx.player.rappelState?.active && ctx.player.x < 500) {
        const nearSafehouse = Math.hypot(ctx.player.x - 24, ctx.player.z - (-80)) < 2.8;
        const candidate = findNearestEnterable(ctx.player.x, ctx.player.z, 4.6);
        if (candidate && !candidate.isExtraVehicle && !nearSafehouse) {
          enterVehicle(candidate);
        }
      }
    }

    const mode = ctx.engine?.timeWeather || 'BRIGHT_DAY';
    const isNightMode = mode === 'NEON_NIGHT' || mode === 'OVERCAST_RAIN' || mode === 'SUNSET_GOLD';
    const isWetRoad = mode === 'OVERCAST_RAIN';

    for (let i = 0; i < list.length; i++) {
      const car = list[i];
      if (!car || car.isExtraVehicle) continue;
      if (scene && car.mesh.parent !== scene) scene.add(car.mesh);

      if (car.isHeli) stepHelicopter(car, dt, playerInput, isNightMode);
      else stepGroundCar(car, dt, playerInput, isNightMode, isWetRoad, localElapsed);
    }

    resolveVehiclePairCollisions();

    for (let i = 0; i < list.length; i++) {
      const car = list[i];
      if (!car) continue;
      car._lastX = car.x;
      car._lastY = car.y;
      car._lastZ = car.z;
      car._lastYaw = car.yaw;
    }

    fx.updateFX(dt);
  }

  // Spawn Initial Hero Vehicles on Sidewalks / Parking Plazas (never blocking road lanes!)
  function spawnInitialSinglePlayerCars() {
    spawnVehicle('obey9f', 27.2, 0.22, 18.0, Math.PI, {
      color: 0xf2f4f7,
      plate: 'LONG 999',
      isParked: true,
      isHero: true
    });
    spawnVehicle('sedan_lux', -168.0, 0.40, 12.0, -0.35, {
      color: 0x14171c,
      plate: 'LAN 888',
      isParked: true,
      isHero: true
    });
    spawnVehicle('banshee', -49.2, 0.22, 62.0, 0, {
      color: 0x9e1b22,
      plate: 'HOA 686',
      isParked: true,
      isHero: true
    });
    spawnVehicle('taxi', 52.8, 0.22, -24.0, 0, {
      plate: 'DT 2026',
      isParked: true,
      isHero: true
    });
    spawnVehicle('police', 142.0, 0.22, 68.0, -Math.PI * 0.5, {
      plate: 'LPM 911',
      isParked: true,
      isHero: true,
      sirenActive: false
    });
    spawnVehicle('heli', -222.0, 3.85, -12.0, 0.4, {
      color: 0x16325c,
      plate: 'UNG 01',
      isParked: true,
      isHero: true
    });
  }

  spawnInitialSinglePlayerCars();

  const api = {
    list,
    archetypes: VEHICLE_ARCHETYPES,
    spawnVehicle,
    removeVehicle,
    clearNonMissionVehicles,
    spawnInitialSinglePlayerCars,
    findNearestEnterable,
    enterVehicle,
    exitVehicle,
    damageVehicle,
    detonateVehicle,
    repairAndRespray,
    updateVehicles
  };

  ctx.vehicles = api;
  return api;
}
