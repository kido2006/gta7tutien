import * as THREE from 'three';

// ============================================================================
// GTA: Đại Lộ & Bờ Biển 3D — PHÂN KHU 2 (ĐẠI LỘ THƯƠNG MẠI, ROCKFORD HILLS & GIẢI TRÍ)
// + PHÂN KHU 5 (TIỆN ÍCH ĐỜI SỐNG, TRẠM XĂNG NỔ DÂY CHUYỀN & CỬA HÀNG LIÊN THÔNG)
// Exclusively owns: src/map_commercial.js -> ctx.mapCommercial
// ============================================================================

export function createMapCommercial(ctx = {}) {
  let activeCtx = ctx;
  let initialized = false;
  let localElapsed = 0;

  const commRoot = new THREE.Group();
  commRoot.name = 'MapCommercialRoot';

  const aabbs = [];
  const roadNodes = [];
  const roadEdges = [];
  const minimapPolys = [];
  const minimapBlips = [];

  // Math & Deterministic PRNG Helpers
  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (e0, e1, x) => {
    const t = clamp((x - e0) / ((e1 - e0) || 1e-6), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const wrapAngle = (a) => {
    let r = a % TAU;
    if (r > Math.PI) r -= TAU;
    if (r < -Math.PI) r += TAU;
    return r;
  };
  const smoothRampToe = (u) => {
    const cu = clamp(u, 0, 1);
    if (cu < 0.14) return Math.pow(cu / 0.14, 1.35) * 0.14;
    if (cu > 0.86) return 1 - Math.pow((1 - cu) / 0.14, 1.35) * 0.14;
    return cu;
  };

  function createRNG(seed = 20261125) {
    let s = seed >>> 0;
    return function nextRand() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = createRNG(9021077);

  // Reusable scratch math objects (zero per-frame GC churn)
  const _pos = new THREE.Vector3();
  const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const _quat = new THREE.Quaternion();
  const _scale = new THREE.Vector3(1, 1, 1);
  const _mat4 = new THREE.Matrix4();
  const _dummy = new THREE.Object3D();
  const _col = new THREE.Color();

  function makeMat4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    _pos.set(x, y, z);
    _euler.set(rx, ry, rz, 'YXZ');
    _quat.setFromEuler(_euler);
    _scale.set(sx, sy, sz);
    const m = new THREE.Matrix4();
    m.compose(_pos, _quat, _scale);
    return m;
  }

  function setDummyMatrix(mesh, idx, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    _dummy.position.set(x, y, z);
    _dummy.rotation.set(rx, ry, rz, 'YXZ');
    _dummy.scale.set(sx, sy, sz);
    _dummy.updateMatrix();
    mesh.setMatrixAt(idx, _dummy.matrix);
  }

  // ==========================================================================
  // 1. High-Speed BufferGeometry Merger & Low-Draw-Call Static Batcher
  // ==========================================================================

  function mergeGeometries(items) {
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
    const indices = totalVerts > 65535 ? new Uint32Array(totalIndices) : new Uint16Array(totalIndices);

    let vOff = 0;
    let iOff = 0;

    for (let idx = 0; idx < items.length; idx++) {
      const { geo, matrix, color, uvRect } = items[idx];
      if (!geo || !geo.attributes?.position) continue;

      const posA = geo.attributes.position;
      const normA = geo.attributes.normal;
      const uvA = geo.attributes.uv;
      const colA = geo.attributes.color;
      const vc = posA.count;

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
          const nl = Math.hypot(tnx, tny, tnz) || 1;
          normals[pb] = tnx / nl;
          normals[pb + 1] = tny / nl;
          normals[pb + 2] = tnz / nl;
        } else {
          normals[pb + 1] = 1;
        }

        const ub = (vOff + v) * 2;
        if (uvA) {
          const rawU = uvA.getX(v);
          const rawV = uvA.getY(v);
          if (uvRect) {
            uvs[ub] = uvRect.u0 + rawU * (uvRect.u1 - uvRect.u0);
            uvs[ub + 1] = uvRect.v0 + rawV * (uvRect.v1 - uvRect.v0);
          } else {
            uvs[ub] = rawU;
            uvs[ub + 1] = rawV;
          }
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

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    if (colors) merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    merged.setIndex(new THREE.BufferAttribute(indices, 1));
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    return merged;
  }

  function createStaticBatcher(parentGroup) {
    const buckets = new Map();
    const colorCache = new Map();

    function resolveColor(hex) {
      if (hex === null || hex === undefined) return null;
      if (hex.isColor) return hex;
      let c = colorCache.get(hex);
      if (!c) {
        c = new THREE.Color(hex);
        colorCache.set(hex, c);
      }
      return c;
    }

    function add(bucketKey, mat, geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, hexColor = null, castShadow = true, receiveShadow = true, uvRect = null) {
      if (!geo) return;
      let b = buckets.get(bucketKey);
      if (!b) {
        b = { key: bucketKey, mat, castShadow: Boolean(castShadow), receiveShadow: Boolean(receiveShadow), items: [] };
        buckets.set(bucketKey, b);
      } else {
        if (castShadow) b.castShadow = true;
        if (receiveShadow) b.receiveShadow = true;
      }
      b.items.push({
        geo,
        matrix: makeMat4(x, y, z, rx, ry, rz, sx, sy, sz),
        color: resolveColor(hexColor),
        uvRect,
      });
    }

    function flush() {
      const out = [];
      for (const b of buckets.values()) {
        const merged = mergeGeometries(b.items);
        if (!merged) continue;
        const mesh = new THREE.Mesh(merged, b.mat);
        mesh.name = `MapComm_${b.key}`;
        mesh.castShadow = b.castShadow;
        mesh.receiveShadow = b.receiveShadow;
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
        parentGroup.add(mesh);
        out.push(mesh);
      }
      buckets.clear();
      return out;
    }

    return { add, flush };
  }

  // ==========================================================================
  // 2. Safe Procedural CanvasTexture Suite & 16-Slot Commercial Signage Atlas
  // ==========================================================================

  function makeSafeCanvas(w, h) {
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    }
    return { width: w, height: h, getContext: () => null };
  }

  function makeCanvasTexture(w, h, drawFn, repeatX = 1, repeatY = 1, isSRGB = true) {
    const c = makeSafeCanvas(w, h);
    const g = c.getContext ? c.getContext('2d') : null;
    if (g && typeof drawFn === 'function') drawFn(g, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    if (isSRGB) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }

  // 16-Row Crisp Commercial Signage & Storefront Atlas (2048 x 2048 -> 1 single draw call for all signs!)
  const ATLAS_ROWS = 16;
  function atlasRowRect(rowIdx) {
    // Canvas y=0 is top (v=1 in Three.js UV), rowIdx 0 is top row
    const v1 = 1 - rowIdx / ATLAS_ROWS;
    const v0 = 1 - (rowIdx + 1) / ATLAS_ROWS;
    return { u0: 0.004, u1: 0.996, v0: v0 + 0.003, v1: v1 - 0.003 };
  }
  function atlasCellRect(rowIdx, colIdx, numCols = 4) {
    const v1 = 1 - rowIdx / ATLAS_ROWS;
    const v0 = 1 - (rowIdx + 1) / ATLAS_ROWS;
    const u0 = colIdx / numCols;
    const u1 = (colIdx + 1) / numCols;
    return { u0: u0 + 0.003, u1: u1 - 0.003, v0: v0 + 0.003, v1: v1 - 0.003 };
  }

  function buildCommercialTextureSuite() {
    // 1) Luxury Veined Carrara & Nero Marble Tile Texture
    const marbleTex = makeCanvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#edf1f6';
      g.fillRect(0, 0, w, h);
      // Subtle gold & slate marble veins
      for (let v = 0; v < 26; v++) {
        g.strokeStyle = v % 4 === 0 ? 'rgba(212,175,55,0.22)' : 'rgba(135,148,166,0.20)';
        g.lineWidth = 1.2 + (v % 3) * 1.1;
        g.beginPath();
        let x = ((v * 79) % w);
        let y = 0;
        g.moveTo(x, y);
        for (let step = 0; step <= 8; step++) {
          x += Math.sin(v * 1.7 + step * 0.9) * 36;
          y = (step / 8) * h;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      // Crisp polished stone tile joints
      g.strokeStyle = 'rgba(150,160,175,0.34)';
      g.lineWidth = 2;
      for (let i = 0; i <= w; i += 128) {
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke();
        g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke();
      }
    }, 8, 8);

    // 2) Architectural Stucco / Travertine / Concrete Micro-Grain Texture
    const stuccoTex = makeCanvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#f2f4f7';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1800; i++) {
        const shade = 226 + ((i * 37) % 28);
        g.fillStyle = `rgb(${shade},${shade},${shade + 1})`;
        g.fillRect((i * 73) % w, (i * 139) % h, 2, 2);
      }
      g.strokeStyle = 'rgba(180,186,196,0.22)';
      g.lineWidth = 1;
      for (let y = 32; y < h; y += 32) {
        g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
      }
    }, 4, 4);

    // 3) 16-Row High-Contrast Commercial Brand & Street Signage Atlas (2048 x 2048)
    const signAtlas = makeCanvasTexture(2048, 2048, (g, w, h) => {
      const rh = h / ATLAS_ROWS; // 128px per row
      g.fillStyle = '#090d16';
      g.fillRect(0, 0, w, h);

      function drawBannerRow(row, bgA, bgB, borderCol, title, subtitle, titleCol = '#ffffff', subCol = '#ffd166', accentBadge = '') {
        const y0 = row * rh;
        const grad = g.createLinearGradient(0, y0, w, y0 + rh);
        grad.addColorStop(0, bgA);
        grad.addColorStop(0.5, bgB);
        grad.addColorStop(1, bgA);
        g.fillStyle = grad;
        g.fillRect(4, y0 + 4, w - 8, rh - 8);

        g.strokeStyle = borderCol;
        g.lineWidth = 6;
        g.strokeRect(10, y0 + 10, w - 20, rh - 20);

        if (accentBadge) {
          g.fillStyle = borderCol;
          g.fillRect(28, y0 + 22, 240, rh - 44);
          g.fillStyle = bgA;
          g.font = '900 44px Impact, "Arial Black", sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(accentBadge, 148, y0 + rh * 0.52);
        }

        const textCenterX = accentBadge ? w * 0.56 : w * 0.5;
        g.fillStyle = titleCol;
        g.font = '900 54px Impact, "Segoe UI Black", "Arial Black", sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(title, textCenterX, y0 + rh * 0.39);

        g.fillStyle = subCol;
        g.font = '800 27px "Segoe UI", Arial, sans-serif';
        g.fillText(subtitle, textCenterX, y0 + rh * 0.76);
      }

      // Row 0: PREMIUM DELUXE MOTORSPORT
      drawBannerRow(
        0, '#07111f', '#102a49', '#38bdf8',
        'PREMIUM DELUXE MOTORSPORT',
        'SIÊU XE THƯỢNG LƯU • SIMEON YETARIAN • LÁI THỬ TỨC THÌ',
        '#f8fafc', '#fde047', 'PDM VIP'
      );

      // Row 1: ORIENTAL / DOPPLER THEATER MARQUEE LETTERBOARD
      drawBannerRow(
        1, '#260b0e', '#4c1118', '#f5c542',
        'ORIENTAL & DOPPLER THEATER',
        'ĐANG CHIẾU: MELTDOWN • CAPOLAVORO • ĐÊM CÔNG CHIẾU VINEWOOD',
        '#fffbeb', '#fca5a5', 'CINEMA'
      );

      // Row 2: ROCKFORD PLAZA LUXURY GALLERIA
      drawBannerRow(
        2, '#13111c', '#262038', '#eAB308',
        'ROCKFORD PLAZA • GRAND GALLERIA',
        'TRUNG TÂM THƯƠNG MẠI CAO CẤP • PONSONBYS • VANGELICO JEWELRY',
        '#fefce8', '#e9d5ff', 'LUXURY'
      );

      // Row 3: BAHAMA MAMAS WEST & CLUB ECLIPSE
      drawBannerRow(
        3, '#1e052b', '#3b0764', '#ff1cf7',
        'BAHAMA MAMAS & CLUB ECLIPSE',
        'VIP RED-LIGHT LOUNGE • LIVE DJ • NEON COCKTAILS ALL NIGHT',
        '#00f5ff', '#fbcfe8', 'VIP 21+'
      );

      // Row 4: RON PETROLEUM CANOPY FASCIA
      drawBannerRow(
        4, '#b91c1c', '#ea580c', '#1d4ed8',
        'RON PETROLEUM • LTD GASOLINE',
        'PUT TIN IN YOUR TANK! • XĂNG CAO CẤP 98 OCTANE • PHỤC VỤ 24/7',
        '#ffffff', '#fef08a', 'RON 98'
      );

      // Row 5: RON FUEL PRICE MONOLITH TOTEM (4 columns for totem / pump screens)
      {
        const y0 = 5 * rh;
        const cw = w / 4;
        // Col 0: Price board
        g.fillStyle = '#0f172a';
        g.fillRect(4, y0 + 4, cw - 8, rh - 8);
        g.fillStyle = '#ea580c';
        g.fillRect(8, y0 + 8, cw - 16, 36);
        g.fillStyle = '#ffffff';
        g.font = '900 26px Impact, sans-serif';
        g.textAlign = 'center';
        g.fillText('RON • LTD 24/7', cw * 0.5, y0 + 27);
        g.font = '800 22px monospace';
        g.fillStyle = '#4ade80';
        g.fillText('REG   $3.89', cw * 0.5, y0 + 62);
        g.fillStyle = '#facc15';
        g.fillText('PLUS  $4.19', cw * 0.5, y0 + 88);
        g.fillStyle = '#ff4d4d';
        g.fillText('SUPR  $4.59', cw * 0.5, y0 + 114);

        // Col 1: Sprunk Cooler Front
        g.fillStyle = '#064e3b';
        g.fillRect(cw + 4, y0 + 4, cw - 8, rh - 8);
        g.fillStyle = '#22c55e';
        g.fillRect(cw + 12, y0 + 12, cw - 24, 34);
        g.fillStyle = '#052e16';
        g.font = '900 28px Impact, sans-serif';
        g.fillText('SPRUNK! LIME SODA', cw * 1.5, y0 + 30);
        for (let r = 0; r < 3; r++) {
          for (let k = 0; k < 8; k++) {
            g.fillStyle = k % 2 === 0 ? '#4ade80' : '#a3e635';
            g.fillRect(cw + 28 + k * 56, y0 + 54 + r * 22, 38, 16);
          }
        }

        // Col 2: eCola Cooler Front
        g.fillStyle = '#7f1d1d';
        g.fillRect(cw * 2 + 4, y0 + 4, cw - 8, rh - 8);
        g.fillStyle = '#ef4444';
        g.fillRect(cw * 2 + 12, y0 + 12, cw - 24, 34);
        g.fillStyle = '#ffffff';
        g.font = '900 28px Impact, sans-serif';
        g.fillText('eCOLA • DELICIOUSLY INFECTIOUS', cw * 2.5, y0 + 30);
        for (let r = 0; r < 3; r++) {
          for (let k = 0; k < 8; k++) {
            g.fillStyle = k % 2 === 0 ? '#f87171' : '#fca5a5';
            g.fillRect(cw * 2 + 28 + k * 56, y0 + 54 + r * 22, 38, 16);
          }
        }

        // Col 3: Bus Shelter Illuminated Ad & Shooting Target
        g.fillStyle = '#1e293b';
        g.fillRect(cw * 3 + 4, y0 + 4, cw * 0.5 - 6, rh - 8);
        g.fillStyle = '#38bdf8';
        g.font = '900 22px Impact, sans-serif';
        g.fillText('LOS SANTOS', cw * 3.25, y0 + 36);
        g.fillStyle = '#fde047';
        g.fillText('METRO BUS', cw * 3.25, y0 + 68);
        g.fillStyle = '#f8fafc';
        g.font = '700 16px sans-serif';
        g.fillText('TUYẾN 24/7 TOÀN THÀNH', cw * 3.25, y0 + 98);

        // Bullseye Target in right half of Col 3
        const tx = cw * 3.75;
        const ty = y0 + rh * 0.5;
        g.fillStyle = '#f8fafc';
        g.fillRect(cw * 3.5 + 4, y0 + 4, cw * 0.5 - 8, rh - 8);
        const rings = [
          [52, '#111827'], [40, '#f8fafc'], [29, '#2563eb'], [18, '#ef4444'], [8, '#facc15']
        ];
        for (const [rad, rCol] of rings) {
          g.fillStyle = rCol;
          g.beginPath();
          g.arc(tx, ty, rad, 0, TAU);
          g.fill();
        }
      }

      // Row 6: 24/7 SUPERMARKET FASCIA (Classic GTA Green/Orange/Red Stripe)
      {
        const y0 = 6 * rh;
        g.fillStyle = '#ffffff';
        g.fillRect(4, y0 + 4, w - 8, rh - 8);
        g.fillStyle = '#16a34a';
        g.fillRect(4, y0 + 4, w - 8, 30);
        g.fillStyle = '#ea580c';
        g.fillRect(4, y0 + rh - 34, w - 8, 15);
        g.fillStyle = '#dc2626';
        g.fillRect(4, y0 + rh - 19, w - 8, 15);
        g.fillStyle = '#15803d';
        g.font = '900 52px Impact, "Arial Black", sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('24/7 SUPERMARKET • CỬA HÀNG TIỆN LỢI MỞ CỬA CẢ ĐÊM', w * 0.5, y0 + rh * 0.52);
      }

      // Row 7: AMMU-NATION PATRIOTIC FASCIA
      {
        const y0 = 7 * rh;
        g.fillStyle = '#991b1b';
        g.fillRect(4, y0 + 4, w - 8, rh - 8);
        g.fillStyle = '#f8fafc';
        g.fillRect(4, y0 + 16, w - 8, rh - 32);
        g.fillStyle = '#1e3a8a';
        g.fillRect(16, y0 + 22, 340, rh - 44);
        g.fillStyle = '#facc15';
        g.font = '900 36px Impact, sans-serif';
        g.textAlign = 'center';
        g.fillText('★ PROTECT YOUR RIGHTS ★', 186, y0 + rh * 0.52);
        g.fillStyle = '#b91c1c';
        g.font = '900 58px Impact, "Arial Black", sans-serif';
        g.fillText('AMMU-NATION • VŨ KHÍ & GIÁP', w * 0.58, y0 + rh * 0.42);
        g.fillStyle = '#1e293b';
        g.font = '800 24px "Segoe UI", sans-serif';
        g.fillText('CỬA HÀNG LIÊN THÔNG • BIA TẬP BẮN THẬT • MỞ CỬA TỰ DO [F / G]', w * 0.58, y0 + rh * 0.78);
      }

      // Row 8: BURGER SHOT / UP-N-ATOM DRIVE-THRU FASCIA
      drawBannerRow(
        8, '#7c2d12', '#c2410c', '#facc15',
        'BURGER SHOT & UP-N-ATOM DRIVE-THRU',
        'LÁI XE QUA CỬA [$25] • HỒI 100% MÁU & SỬA +25% ĐỘ BỀN XE TỨC THÌ!',
        '#fef08a', '#ffffff', 'DRIVE-THRU'
      );

      // Row 9: DRIVE-THRU MENU BOARD (4 Combo Columns)
      {
        const y0 = 9 * rh;
        g.fillStyle = '#1c1917';
        g.fillRect(4, y0 + 4, w - 8, rh - 8);
        g.strokeStyle = '#facc15';
        g.lineWidth = 5;
        g.strokeRect(10, y0 + 10, w - 20, rh - 20);
        const items = [
          ['#1 BLEEDER BURGER', '$12 • Bò Nướng Phô Mai'],
          ['#2 HEART STOPPER XL', '$25 • Hồi 100% HP + Sửa Xe'],
          ['#3 ATOMIC ROCKET SHAKE', '$9 • Kem Sữa Dâu Vũ Trụ'],
          ['#4 UP-N-ATOM TRIPLE', '$19 • 3 Tầng Bò Mỹ Sốt Cay'],
        ];
        const cw = w / 4;
        for (let i = 0; i < 4; i++) {
          g.fillStyle = i === 1 ? '#dc2626' : '#292524';
          g.fillRect(i * cw + 18, y0 + 18, cw - 36, rh - 36);
          g.fillStyle = '#fde047';
          g.font = '900 28px Impact, sans-serif';
          g.textAlign = 'center';
          g.fillText(items[i][0], (i + 0.5) * cw, y0 + 48);
          g.fillStyle = '#ffffff';
          g.font = '700 21px "Segoe UI", sans-serif';
          g.fillText(items[i][1], (i + 0.5) * cw, y0 + 88);
        }
      }

      // Row 10: PINK CAGE MOTEL • VACANCY SIGN
      drawBannerRow(
        10, '#4a044e', '#831843', '#2dd4bf',
        'THE PINK CAGE MOTEL • VACANCY',
        'NHÀ NGHỈ 2 TẦNG HỒ BƠI NHIỆT ĐỚI • PHÒNG ĐƠN & ĐÔI THEO GIỜ • FREE TV',
        '#fbcfe8', '#5eead4', 'MOTEL'
      );

      // Row 11: LUXURY BOUTIQUE WINDOWS & MOVIE POSTERS (4 Columns)
      {
        const y0 = 11 * rh;
        const cw = w / 4;
        const cards = [
          { bg: '#0f172a', border: '#fbbf24', top: 'PONSONBYS', bot: 'HAUTE COUTURE • ROCKFORD' },
          { bg: '#1e1b4b', border: '#38bdf8', top: 'VANGELICO', bot: 'KIM CƯƠNG & ĐỒNG HỒ THỤY SĨ' },
          { bg: '#450a0a', border: '#f59e0b', top: 'MELTDOWN', bot: 'BOM TẤN CỦA MICHAEL DE SANTA' },
          { bg: '#022c22', border: '#34d399', top: 'LEOPOLDS', bot: 'THỜI TRANG ĐẠI LỘ VINEWOOD' },
        ];
        for (let i = 0; i < 4; i++) {
          const cd = cards[i];
          g.fillStyle = cd.bg;
          g.fillRect(i * cw + 6, y0 + 6, cw - 12, rh - 12);
          g.strokeStyle = cd.border;
          g.lineWidth = 5;
          g.strokeRect(i * cw + 12, y0 + 12, cw - 24, rh - 24);
          g.fillStyle = cd.border;
          g.font = '900 38px Impact, sans-serif';
          g.textAlign = 'center';
          g.fillText(cd.top, (i + 0.5) * cw, y0 + 48);
          g.fillStyle = '#f8fafc';
          g.font = '700 20px "Segoe UI", sans-serif';
          g.fillText(cd.bot, (i + 0.5) * cw, y0 + 88);
        }
      }

      // Rows 12 & 13: CRISP LOS SANTOS INTERSECTION STREET-NAME BLADES (4 columns x 2 rows = 8 street names!)
      const streetLabels = [
        ['PACIFIC COAST AVE', 'X = -120'],
        ['ROCKFORD AVE', 'X = -40'],
        ['BLVD DEL PERRO', 'HERO AVE'],
        ['PILLBOX HILL AVE', 'X = +120'],
        ['POWER STREET', 'X = +200'],
        ['VINEWOOD BLVD', 'Z = -200'],
        ['ECLIPSE BLVD', 'Z = -120'],
        ['VESPUCCI & OLYMPIC', 'SOUTH'],
      ];
      for (let idx = 0; idx < 8; idx++) {
        const row = 12 + Math.floor(idx / 4);
        const col = idx % 4;
        const cw = w / 4;
        const x0 = col * cw;
        const y0 = row * rh;
        g.fillStyle = '#065f46';
        g.fillRect(x0 + 8, y0 + 14, cw - 16, rh - 28);
        g.strokeStyle = '#f8fafc';
        g.lineWidth = 5;
        g.strokeRect(x0 + 14, y0 + 20, cw - 28, rh - 40);
        g.fillStyle = '#ffffff';
        g.font = '900 34px "Arial Black", Impact, sans-serif';
        g.textAlign = 'center';
        g.fillText(streetLabels[idx][0], x0 + cw * 0.5, y0 + rh * 0.46);
        g.fillStyle = '#a7f3d0';
        g.font = '800 19px "Segoe UI", sans-serif';
        g.fillText(streetLabels[idx][1], x0 + cw * 0.5, y0 + rh * 0.75);
      }

      // Row 14: VERTICAL NEON TOWER BLADE ("DOPPLER • ORIENTAL • BAHAMA MAMAS")
      drawBannerRow(
        14, '#180424', '#3b0764', '#00f5ff',
        '★ DOPPLER • ORIENTAL • ECLIPSE ★',
        'VINEWOOD HISTORIC THEATER & NIGHTLIFE DISTRICT',
        '#fde047', '#ff1cf7', 'STAR'
      );

      // Row 15: SNACK AISLE GONDOLA TEXTURE (Colorful Grocery Packages!)
      {
        const y0 = 15 * rh;
        g.fillStyle = '#27272a';
        g.fillRect(0, y0, w, rh);
        const packCols = ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#f97316', '#06b6d4', '#ec4899'];
        for (let shelf = 0; shelf < 3; shelf++) {
          const sy = y0 + 8 + shelf * 40;
          g.fillStyle = '#d4d4d8';
          g.fillRect(0, sy + 32, w, 5);
          for (let bx = 8; bx < w - 24; bx += 34) {
            g.fillStyle = packCols[((bx * 7 + shelf * 13) >>> 0) % packCols.length];
            g.fillRect(bx, sy + 4, 26, 27);
            g.fillStyle = 'rgba(255,255,255,0.75)';
            g.fillRect(bx + 4, sy + 9, 18, 7);
          }
        }
      }
    }, 1, 1);

    return { marbleTex, stuccoTex, signAtlas };
  }

  // ==========================================================================
  // 3. Custom GLSL Shaders (Color-Cycling Neon / Chasing Bulbs + 165m Sky Lasers)
  // ==========================================================================

  const neonShaderUniforms = {
    uTime: { value: 0 },
    uNightBoost: { value: 1.0 },
  };

  function createNeonMarqueeShaderMaterial() {
    // Vertex color.r selects shader mode:
    //   r < 0.35 -> Mode 0: Doppler Theater Chasing Incandescent Marquee Bulbs + Gold Inner Glow
    //   r < 0.70 -> Mode 1: Bahama Mamas / Túy Tiên Lâu Color-Cycling Plasma Neon Tubes
    //   r >= 0.70 -> Mode 2: Pink Cage Motel Flickering Pastel Pink/Teal Vacancy Neon
    return new THREE.ShaderMaterial({
      uniforms: neonShaderUniforms,
      vertexColors: true,
      transparent: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vColor;
        void main() {
          vUv = uv;
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uNightBoost;
        varying vec2 vUv;
        varying vec3 vColor;

        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        void main() {
          float mode = vColor.r;
          float phaseSeed = vColor.g * 6.28318;
          vec3 outCol = vec3(1.0);

          if (mode < 0.35) {
            // Mode 0: Classic Art-Deco Theater Chasing Marquee Bulbs!
            vec2 bUv = vUv;
            float borderX = min(bUv.x, 1.0 - bUv.x);
            float borderY = min(bUv.y, 1.0 - bUv.y);
            float isBorder = 1.0 - step(0.13, min(borderX * 3.5, borderY));
            float perim = (bUv.y > 0.85) ? bUv.x * 24.0
                        : (bUv.x > 0.94) ? (24.0 + (1.0 - bUv.y) * 6.0)
                        : (bUv.y < 0.15) ? (30.0 + (1.0 - bUv.x) * 24.0)
                        : (54.0 + bUv.y * 6.0);
            float cell = fract(perim);
            float idx = floor(perim);
            float bulbCircle = smoothstep(0.46, 0.18, length(vec2(cell - 0.5, 0.0)));
            float chase = 0.35 + 0.65 * step(0.32, fract(idx * 0.25 - uTime * 3.2 + phaseSeed));
            vec3 innerPanel = mix(vec3(0.22, 0.05, 0.07), vec3(1.18, 0.86, 0.36), smoothstep(0.12, 0.45, borderY));
            float scanBars = 0.88 + 0.12 * sin(bUv.y * 42.0 + uTime * 4.0);
            vec3 bulbCol = vec3(1.55, 1.15, 0.38) * bulbCircle * chase;
            outCol = mix(innerPanel * scanBars, vec3(0.14, 0.06, 0.03) + bulbCol, isBorder);
          } else if (mode < 0.70) {
            // Mode 1: Bahama Mamas / Túy Tiên Lâu Color-Cycling Neon Sign Shader!
            float hue = fract(uTime * 0.16 + vUv.x * 0.38 + vUv.y * 0.18 + vColor.g);
            vec3 neonA = hsv2rgb(vec3(hue, 0.88, 1.38));
            vec3 neonB = hsv2rgb(vec3(fract(hue + 0.42), 0.92, 1.32));
            float tubeWave = abs(sin(vUv.y * 18.0 + sin(vUv.x * 9.0 - uTime * 3.4) * 1.4));
            float tubeGlow = smoothstep(0.75, 0.08, tubeWave);
            float outerRim = smoothstep(0.14, 0.02, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
            float pulse = 0.88 + 0.12 * sin(uTime * 8.5 + phaseSeed);
            vec3 darkBacking = vec3(0.05, 0.01, 0.09);
            outCol = darkBacking + (mix(neonA, neonB, vUv.x) * (0.42 + tubeGlow * 0.95) + neonB * outerRim * 0.95) * pulse;
          } else {
            // Mode 2: Pink Cage Motel Pastel Pink & Tropical Teal Vacancy Flicker!
            float flicker = step(0.06, fract(sin(floor(uTime * 11.0 + phaseSeed) * 43.758) * 43758.5453));
            float buzz = 0.84 + 0.16 * flicker;
            vec3 pinkNeon = vec3(1.48, 0.26, 0.78);
            vec3 tealNeon = vec3(0.12, 1.35, 1.15);
            float stripe = smoothstep(0.45, 0.55, sin(vUv.y * 16.0 - uTime * 2.2) * 0.5 + 0.5);
            float border = smoothstep(0.12, 0.02, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
            outCol = vec3(0.08, 0.02, 0.09) + (mix(pinkNeon, tealNeon, stripe) * 0.72 + tealNeon * border * 0.85) * buzz;
          }

          gl_FragColor = vec4(outCol * uNightBoost, 1.0);
        }
      `,
    });
  }

  const laserUniforms = {
    uTime: { value: 0 },
    uOpacityScale: { value: 0.82 },
  };

  function createNightLaserShaderMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: laserUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vInstColor;
        varying vec3 vNormalView;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          #ifdef USE_INSTANCING_COLOR
            vInstColor = instanceColor;
          #else
            vInstColor = vec3(0.15, 0.92, 1.0);
          #endif
          #ifdef USE_INSTANCING
            vec4 mvPos = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
            vNormalView = normalize(normalMatrix * mat3(instanceMatrix) * normal);
          #else
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            vNormalView = normalize(normalMatrix * normal);
          #endif
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uOpacityScale;
        varying vec2 vUv;
        varying vec3 vInstColor;
        varying vec3 vNormalView;
        varying vec3 vViewDir;

        void main() {
          // vUv.y runs 0.0 at ground projector -> 1.0 at y = 165m sky apex!
          float heightFade = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.35) * smoothstep(0.0, 0.025, vUv.y);
          float fresnelCore = pow(abs(dot(normalize(vNormalView), normalize(vViewDir))), 1.55);
          float shimmer = 0.82 + 0.18 * sin(vUv.y * 38.0 - uTime * 5.2);
          float alpha = heightFade * (0.18 + 0.82 * fresnelCore) * shimmer * uOpacityScale;
          gl_FragColor = vec4(vInstColor * (1.25 + 0.65 * (1.0 - vUv.y)), clamp(alpha, 0.0, 0.92));
        }
      `,
    });
  }

  // ==========================================================================
  // 4. Procedural Web Audio Synth Effects (Glass Crash, Alarm, Chime, Jingle)
  // ==========================================================================

  function getAudioContextSafe() {
    const ac = activeCtx?.audio?.ctx || activeCtx?.ui?.audio?.ctx || null;
    if (ac && ac.state === 'running') return ac;
    return null;
  }

  function playGlassCrashSFX(intensity = 1.0) {
    try {
      activeCtx?.audio?.playGlassShatter?.();
      activeCtx?.audio?.playCrash?.(clamp(0.45 * intensity, 0.2, 0.9));
      const ac = getAudioContextSafe();
      if (!ac) return;
      const now = ac.currentTime;
      // Cascading crystalline glass shards tinkling
      const freqs = [2150, 2890, 3420, 4180, 4960, 2640, 3790];
      for (let i = 0; i < freqs.length; i++) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = i % 2 === 0 ? 'triangle' : 'sine';
        const t0 = now + i * 0.028;
        osc.frequency.setValueAtTime(freqs[i] * (0.94 + Math.random() * 0.14), t0);
        osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.62, t0 + 0.16);
        gain.gain.setValueAtTime(0.065 * intensity, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.17);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + 0.18);
      }
    } catch (_) {}
  }

  function playSlidingDoorChimeSFX() {
    try {
      const ac = getAudioContextSafe();
      if (!ac) return;
      const now = ac.currentTime;
      const notes = [[784, 0, 0.16], [659.25, 0.14, 0.24]];
      for (const [freq, delay, dur] of notes) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.045, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(now + delay);
        osc.stop(now + delay + dur + 0.02);
      }
    } catch (_) {}
  }

  function playStoreRobberyAlarmSFX() {
    try {
      const ac = getAudioContextSafe();
      if (!ac) return;
      const now = ac.currentTime;
      // Cash drawer "cha-ching" + urgent store security bell pulses
      for (let p = 0; p < 8; p++) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const t0 = now + p * 0.19;
        osc.type = p === 0 ? 'triangle' : 'square';
        osc.frequency.setValueAtTime(p === 0 ? 1568 : (p % 2 === 0 ? 1180 : 920), t0);
        gain.gain.setValueAtTime(p === 0 ? 0.08 : 0.042, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + 0.16);
      }
    } catch (_) {}
  }

  function playDriveThruJingleSFX() {
    try {
      const ac = getAudioContextSafe();
      if (!ac) return;
      const now = ac.currentTime;
      const chord = [523.25, 659.25, 783.99, 1046.5];
      for (let i = 0; i < chord.length; i++) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const t0 = now + i * 0.085;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(chord[i], t0);
        gain.gain.setValueAtTime(0.06, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + 0.25);
      }
    } catch (_) {}
  }

  function playSteelTargetClangSFX() {
    try {
      const ac = getAudioContextSafe();
      if (!ac) return;
      const now = ac.currentTime;
      for (const f of [1240, 2490]) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(f * 0.88, now + 0.22);
        gain.gain.setValueAtTime(0.055, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(now);
        osc.stop(now + 0.24);
      }
    } catch (_) {}
  }

  // ==========================================================================
  // 5. AABB Registration, Dynamic Blocker Toggle & Old World Parcel Carver
  // ==========================================================================

  function registerAABB(minX, maxX, minZ, maxZ, maxY, minY = 0, tag = 'commercial_solid') {
    if (maxX <= minX || maxZ <= minZ) return null;
    const box = {
      minX, maxX, minZ, maxZ, maxY, minY, tag,
      enabled: true,
      _orig: { minX, maxX, minZ, maxZ, maxY, minY },
      _stamp: 0,
    };
    aabbs.push(box);
    return box;
  }

  function setAABBEnabled(box, enabled) {
    if (!box || !box._orig) return;
    box.enabled = Boolean(enabled);
    if (enabled) {
      box.minX = box._orig.minX;
      box.maxX = box._orig.maxX;
      box.minZ = box._orig.minZ;
      box.maxZ = box._orig.maxZ;
      box.maxY = box._orig.maxY;
      box.minY = box._orig.minY;
    } else {
      // Collapse bounds so even raw spatial-cell caches skip disabled doors/broken glass!
      box.minX = 999999;
      box.maxX = -999999;
      box.minZ = 999999;
      box.maxZ = -999999;
      box.maxY = -999;
      box.minY = -999;
    }
  }

  // Exact designated city-block parcels replaced by Seamless Commercial Landmarks:
  //   1) PDM Supercar Showroom:   X in [-27.5, +25.5], Z in [133.0, 187.0]
  //   2) Oriental/Doppler Cinema: X in [-27.5, +25.5], Z in [-187.0, -133.0]
  //   3) Rockford Plaza Galleria: X in [-108.5, -52.0], Z in [-187.5, -132.5]
  const CARVED_PARCELS = [
    { minX: -27.5, maxX: 25.5, minZ: 133.0, maxZ: 187.0, minCarveY: 0.26 },
    { minX: -27.5, maxX: 25.5, minZ: -187.0, maxZ: -133.0, minCarveY: 0.26 },
    { minX: -108.5, maxX: -52.0, minZ: -187.5, maxZ: -132.5, minCarveY: 0.26 },
  ];

  function pointInCarvedParcel(x, y, z) {
    for (let i = 0; i < CARVED_PARCELS.length; i++) {
      const p = CARVED_PARCELS[i];
      if (y > p.minCarveY && x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ) {
        return true;
      }
    }
    return false;
  }

  function clearReplacedWorldParcels(world) {
    if (!world) return;

    // 1) Disable & remove overlapping generic building AABBs from world.aabbs (mutating in-place too so private spatialCells skip them!)
    if (Array.isArray(world.aabbs)) {
      for (let i = world.aabbs.length - 1; i >= 0; i--) {
        const b = world.aabbs[i];
        if (!b || b.maxY <= 0.3) continue;
        const cx = (b.minX + b.maxX) * 0.5;
        const cz = (b.minZ + b.maxZ) * 0.5;
        let overlaps = false;
        for (let pi = 0; pi < CARVED_PARCELS.length; pi++) {
          const cp = CARVED_PARCELS[pi];
          if (cx >= cp.minX && cx <= cp.maxX && cz >= cp.minZ && cz <= cp.maxZ) {
            overlaps = true;
            break;
          }
        }
        if (overlaps) {
          b.minX = 999999;
          b.maxX = -999999;
          b.minZ = 999999;
          b.maxZ = -999999;
          b.maxY = -999;
          b.minY = -999;
          world.aabbs.splice(i, 1);
        }
      }
    }

    // 2) Relocate any world.js destructible newspaper boxes sitting directly against PDM's drive-through glass!
    if (Array.isArray(world.destructibleProps)) {
      for (let i = 0; i < world.destructibleProps.length; i++) {
        const dp = world.destructibleProps[i];
        if (!dp || dp.kind !== 'news_box') continue;
        if (dp.baseX >= -26 && dp.baseX <= 26 && dp.baseZ >= 134 && dp.baseZ <= 182) {
          dp.broken = true;
          dp.settled = true;
          dp.baseX = 9999;
          dp.baseZ = 9999;
          if (dp.meshA) {
            setDummyMatrix(dp.meshA, dp.index, 0, -999, 0, 0, 0, 0, 0.001, 0.001, 0.001);
            dp.meshA.instanceMatrix.needsUpdate = true;
          }
        }
      }
    }

    // 3) Surgically carve static merged building triangles inside CARVED_PARCELS (keeps sidewalks y <= 0.22m 100% intact!)
    function carveStaticMeshTriangles(group) {
      if (!group || !Array.isArray(group.children)) return;
      for (let ci = 0; ci < group.children.length; ci++) {
        const child = group.children[ci];
        if (!child) continue;
        if (child.isInstancedMesh) continue;
        if (child.isGroup && child.name && child.name.startsWith('WorldDetailLOD_')) {
          carveStaticMeshTriangles(child);
          continue;
        }
        if (!child.isMesh || !child.geometry?.attributes?.position || !child.geometry?.index) continue;
        // Only carve world-space merged city meshes at origin
        if (Math.hypot(child.position.x, child.position.y, child.position.z) > 0.01) continue;

        const geo = child.geometry;
        const pos = geo.attributes.position;
        const idxAttr = geo.index;
        const idxArr = idxAttr.array;
        const triCount = (idxAttr.count / 3) | 0;
        if (triCount <= 0) continue;

        let removedAny = false;
        for (let t = 0; t < triCount; t++) {
          const i0 = idxArr[t * 3];
          const i1 = idxArr[t * 3 + 1];
          const i2 = idxArr[t * 3 + 2];
          const cy = (pos.getY(i0) + pos.getY(i1) + pos.getY(i2)) / 3;
          if (cy <= 0.26) continue;
          const cx = (pos.getX(i0) + pos.getX(i1) + pos.getX(i2)) / 3;
          const cz = (pos.getZ(i0) + pos.getZ(i1) + pos.getZ(i2)) / 3;
          if (pointInCarvedParcel(cx, cy, cz)) {
            removedAny = true;
            break;
          }
        }
        if (!removedAny) continue;

        const kept = [];
        for (let t = 0; t < triCount; t++) {
          const i0 = idxArr[t * 3];
          const i1 = idxArr[t * 3 + 1];
          const i2 = idxArr[t * 3 + 2];
          const cy = (pos.getY(i0) + pos.getY(i1) + pos.getY(i2)) / 3;
          const cx = (pos.getX(i0) + pos.getX(i1) + pos.getX(i2)) / 3;
          const cz = (pos.getZ(i0) + pos.getZ(i1) + pos.getZ(i2)) / 3;
          if (!pointInCarvedParcel(cx, cy, cz)) {
            kept.push(i0, i1, i2);
          }
        }
        const NewArrType = pos.count > 65535 ? Uint32Array : Uint16Array;
        geo.setIndex(new THREE.BufferAttribute(new NewArrType(kept), 1));
        geo.computeBoundingSphere();
      }
    }

    if (world.root) {
      carveStaticMeshTriangles(world.root);
    }
  }

  // ==========================================================================
  // 6. Player Cash & Strict Player-Attributed Wanted Escalation Helpers
  // ==========================================================================

  function getPlayerCashSafe(c = activeCtx) {
    const p = c?.player;
    if (!p) return 0;
    if (Number.isFinite(p.cash)) return p.cash;
    if (Number.isFinite(p.money)) return p.money;
    return 7860;
  }

  function addPlayerCashSafe(delta, c = activeCtx) {
    const p = c?.player;
    if (!p) return;
    const cur = getPlayerCashSafe(c);
    const next = Math.max(0, Math.round(cur + delta));
    const applied = next - cur;
    if (ctx?.antiCheat?.commitCash) ctx.antiCheat.commitCash(next);
    else { p.cash = next; p.money = next; }
    if (applied !== 0) {
      c?.ui?.addCashPopup?.(applied);
      c?.ui?.onCashChange?.(next, applied);
    }
  }

  function escalatePlayerWantedPlusTwo(reasonPrefix, crimeX, crimeZ, c = activeCtx) {
    const gp = c?.gameplay;
    if (!gp) return;
    const prevStars = Number(gp.wanted?.stars) || 0;
    const targetStars = Math.min(5, Math.max(2, prevStars + 2));

    // Include 'robbery' token so gameplay.js grace-period guard allows immediate deliberate crimes!
    gp.addCrimeHeat?.(32, crimeX, crimeZ, { reason: `${reasonPrefix}_robbery_a`, isPlayer: true });
    gp.addCrimeHeat?.(18, crimeX, crimeZ, { reason: `${reasonPrefix}_robbery_b`, isPlayer: true });

    if (gp.wanted) {
      const minHeatForStars = [0, 20, 44, 65, 85, 98][targetStars] || 44;
      gp.wanted.stars = Math.max(gp.wanted.stars || 0, targetStars);
      gp.wanted.heat = Math.max(gp.wanted.heat || 0, minHeatForStars);
      gp.wanted.spotted = true;
      gp.wanted.evadeTimer = 0;
      gp.wanted.flashing = false;
      gp.wanted.lethalForce = true;
    }
  }

  // ==========================================================================
  // 7. Dynamic Interactive State Containers (Glass, Turntables, Gas, 24/7, etc.)
  // ==========================================================================

  const pdmState = {
    glassPanels: [], // 8 breakable glass curtain-wall panels (indices 0..7 in dynamicGlassInst)
    turntables: [
      { id: 'pdm_tt_nw', x: -7.5, y: 0.24, z: 152.0, angle: 0, omega: 0.48, vehicleType: 'zentorno', color: 0x00d2ff, plate: 'PDM V12', car: null, initYaw: 0.65 },
      { id: 'pdm_tt_se', x: 7.5, y: 0.24, z: 161.0, angle: Math.PI * 0.5, omega: -0.48, vehicleType: 'banshee', color: 0xf5b700, plate: 'PDM GT1', car: null, initYaw: 1.15 },
    ],
    turntableInst: null,
  };

  let dynamicGlassInst = null; // 12 instances: 0..7 = PDM breakable panels, 8..11 = 24/7 sliding door leaves!
  let pumpIntactInst = null;   // 8 intact RON fuel pumps
  let pumpScorchedInst = null; // 8 scorched twisted RON fuel pump wrecks
  let clerkArmInst = null;     // 4 animated 24/7 Cashier arms (raises hands when robbed -> 1 single draw call!)
  let ammuTargetInst = null;   // 3 rear shooting targets inside Ground Thần Binh Các
  let laserBeamInst = null;    // 4 sky-piercing 165m Night Laser Beams around Túy Tiên Lâu
  let burgerSignGroup = null;  // Giant 3D Rotating Burger + Orbiting Retro Rocket on Burger Shot roof

  const gasStations = [];      // 2 stations: North (76, -222) & South (-72, +222)
  const ammuTargets = [];      // 3 reactive shooting targets at (182.3, 1.48, 8.5 | 12.0 | 15.5)
  const driveThruState = {
    dwellTimer: 0,
    cooldown: 0,
  };

  // Destructible Street Furniture State
  let busFrameInst = null;
  let busGlassInst = null;
  let mailboxInst = null;
  let signPostInst = null;
  const busShelters = [];
  const mailboxes = [];
  const signPosts = [];

  // Pooled Dynamic Particle Meshes (3 InstancedMeshes total: 320 Glass Shards + 96 Smoke/Fire + 48 Cash Wads)
  const MAX_SHARDS = 320;
  const MAX_PLUMES = 96;
  const MAX_CASH_WADS = 48;
  let shardInst = null;
  let plumeInst = null;
  let cashWadInst = null;
  const shards = [];
  const plumes = [];
  const cashWads = [];
  let shardCursor = 0;
  let plumeCursor = 0;
  let cashCursor = 0;
  let prevKeyG = false;

  function emitGlassShards(cx, cy, cz, spanW, spanH, isAlongZ, impVx, impVz, count = 35) {
    if (!shardInst) return;
    const baseSpeed = Math.max(4.5, Math.hypot(impVx, impVz));
    const dirLen = Math.hypot(impVx, impVz) || 1;
    const nx = impVx / dirLen;
    const nz = impVz / dirLen;

    for (let i = 0; i < count; i++) {
      const s = shards[shardCursor];
      shardCursor = (shardCursor + 1) % MAX_SHARDS;
      const lat = (Math.random() - 0.5) * spanW;
      const vert = (Math.random() - 0.5) * spanH;
      s.active = true;
      s.age = 0;
      s.life = 2.1 + Math.random() * 1.3;
      s.x = cx + (isAlongZ ? 0 : lat);
      s.y = Math.max(0.35, cy + vert);
      s.z = cz + (isAlongZ ? lat : 0);
      const spread = 3.6;
      s.vx = nx * (baseSpeed * (0.45 + Math.random() * 0.55)) + (Math.random() - 0.5) * spread;
      s.vz = nz * (baseSpeed * (0.45 + Math.random() * 0.55)) + (Math.random() - 0.5) * spread;
      s.vy = 1.8 + Math.random() * 5.2;
      s.rx = Math.random() * TAU;
      s.ry = Math.random() * TAU;
      s.rz = Math.random() * TAU;
      s.avx = (Math.random() - 0.5) * 18;
      s.avy = (Math.random() - 0.5) * 18;
      s.avz = (Math.random() - 0.5) * 18;
      s.scale = 0.24 + Math.random() * 0.42;
    }
  }

  function emitSmokePlumePuff(x, y, z, isFireCore = false) {
    if (!plumeInst) return;
    const p = plumes[plumeCursor];
    plumeCursor = (plumeCursor + 1) % MAX_PLUMES;
    p.active = true;
    p.age = 0;
    p.isFire = isFireCore;
    p.life = isFireCore ? (0.65 + Math.random() * 0.45) : (3.4 + Math.random() * 1.4);
    p.x = x + (Math.random() - 0.5) * 1.3;
    p.y = y + Math.random() * 0.6;
    p.z = z + (Math.random() - 0.5) * 1.3;
    p.vx = (Math.random() - 0.5) * 0.85;
    // Rises ~4.6 m/s * 4.0s = towering 18.4m black smoke column!
    p.vy = isFireCore ? (3.2 + Math.random() * 2.4) : (4.3 + Math.random() * 1.1);
    p.vz = (Math.random() - 0.5) * 0.85;
    p.startScale = isFireCore ? 1.15 : 0.95;
    p.endScale = isFireCore ? 2.4 : 4.2;
    _col.setHex(isFireCore ? (Math.random() < 0.5 ? 0xff6b1a : 0xfacc15) : 0x18191c);
    plumeInst.setColorAt(plumeCursor === 0 ? MAX_PLUMES - 1 : plumeCursor - 1, _col);
    if (plumeInst.instanceColor) plumeInst.instanceColor.needsUpdate = true;
  }

  function emitFlyingBills(x, y, z, count = 18, isEnvelope = false) {
    if (!cashWadInst) return;
    for (let i = 0; i < count; i++) {
      const w = cashWads[cashCursor];
      const idx = cashCursor;
      cashCursor = (cashCursor + 1) % MAX_CASH_WADS;
      w.active = true;
      w.age = 0;
      w.life = 2.4 + Math.random() * 1.1;
      w.x = x + (Math.random() - 0.5) * 0.3;
      w.y = y + 0.15;
      w.z = z + (Math.random() - 0.5) * 0.3;
      const ang = Math.random() * TAU;
      const spd = 2.2 + Math.random() * 4.4;
      w.vx = Math.cos(ang) * spd;
      w.vz = Math.sin(ang) * spd;
      w.vy = 3.2 + Math.random() * 4.2;
      w.rx = Math.random() * TAU;
      w.ry = Math.random() * TAU;
      w.rz = Math.random() * TAU;
      w.avx = (Math.random() - 0.5) * 14;
      w.avy = (Math.random() - 0.5) * 14;
      _col.setHex(isEnvelope ? 0xf8fafc : 0x4ade80);
      cashWadInst.setColorAt(idx, _col);
    }
    if (cashWadInst.instanceColor) cashWadInst.instanceColor.needsUpdate = true;
  }

  // ==========================================================================
  // 8. Architectural & Gameplay Construction of All 8 Commercial Features
  // ==========================================================================

  function buildAllCommercialDistricts(scene) {
    const tex = buildCommercialTextureSuite();
    const envMap = scene?.environment || activeCtx?.engine?.envMap || null;

    const mats = {
      archSolid: new THREE.MeshStandardMaterial({
        map: tex.stuccoTex,
        vertexColors: true,
        roughness: 0.68,
        metalness: 0.08,
      }),
      metal: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.24,
        metalness: 0.84,
        envMap,
        envMapIntensity: 1.35,
      }),
      marble: new THREE.MeshStandardMaterial({
        map: tex.marbleTex,
        vertexColors: true,
        roughness: 0.16,
        metalness: 0.14,
        envMap,
        envMapIntensity: 1.25,
      }),
      signAtlas: new THREE.MeshStandardMaterial({
        map: tex.signAtlas,
        emissive: new THREE.Color(0xffffff),
        emissiveMap: tex.signAtlas,
        emissiveIntensity: 0.58,
        roughness: 0.32,
        metalness: 0.12,
      }),
      emissive: new THREE.MeshBasicMaterial({
        vertexColors: true,
      }),
      staticGlass: new THREE.MeshPhysicalMaterial({
        color: 0x93d5f6,
        metalness: 0.14,
        roughness: 0.06,
        transparent: true,
        opacity: 0.42,
        clearcoat: 1.0,
        side: THREE.DoubleSide,
        depthWrite: false,
        envMap,
        envMapIntensity: 1.45,
      }),
      neonShader: createNeonMarqueeShaderMaterial(),
      laserShader: createNightLaserShaderMaterial(),
      breakableGlass: new THREE.MeshPhysicalMaterial({
        color: 0xa5e3ff,
        metalness: 0.18,
        roughness: 0.04,
        transparent: true,
        opacity: 0.36,
        clearcoat: 1.0,
        side: THREE.DoubleSide,
        depthWrite: false,
        envMap,
        envMapIntensity: 1.65,
      }),
    };

    const batch = createStaticBatcher(commRoot);

    // Shared unit primitives
    const uBox = new THREE.BoxGeometry(1, 1, 1);
    const uCyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
    const uOctCyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
    const uCone = new THREE.ConeGeometry(0.5, 1, 16);
    const uSphere = new THREE.SphereGeometry(0.5, 16, 12);
    const uTorus = new THREE.TorusGeometry(0.5, 0.08, 10, 24);
    const uPlane = new THREE.PlaneGeometry(1, 1);

    function addSignPlane(x, y, z, ry, w, h, uvRect, doubleSided = false) {
      batch.add('signAtlas', mats.signAtlas, uPlane, x, y, z, 0, ry, 0, w, h, 1, null, false, false, uvRect);
      if (doubleSided) {
        batch.add('signAtlas', mats.signAtlas, uPlane, x, y, z, 0, ry + Math.PI, 0, w, h, 1, null, false, false, uvRect);
      }
    }

    function addNeonShaderPanel(x, y, z, ry, w, h, modeVal, phaseVal) {
      const encColor = new THREE.Color(modeVal, phaseVal, 1.0);
      batch.add('neonShader', mats.neonShader, uPlane, x, y, z, 0, ry, 0, w, h, 1, encColor, false, false);
    }

    const C = {
      white: 0xf8fafc,
      cream: 0xf3ead8,
      limestone: 0xded6c6,
      terracotta: 0xc26a4a,
      anthracite: 0x1e242d,
      slate: 0x334155,
      asphalt: 0x262a33,
      chrome: 0xe2e8f0,
      silver: 0x94a3b8,
      gold: 0xf5c542,
      brass: 0xd4a438,
      velvetRed: 0x991b1b,
      crimson: 0xdc2626,
      ronOrange: 0xea580c,
      ronBlue: 0x1d4ed8,
      ammuBlue: 0x1e3a8a,
      burgerRed: 0xb91c1c,
      burgerYellow: 0xfacc15,
      motelPink: 0xf48fb1,
      motelCoral: 0xf06292,
      motelTeal: 0x26a69a,
      poolAqua: 0x22d3ee,
      hedge: 0x2d6a3e,
      woodDark: 0x4a2c18,
      woodWarm: 0x8b5a2b,
      ledCyan: 0x38f2ff,
      ledGold: 0xffe066,
      ledWarm: 0xfff3d6,
      ledPink: 0xff2ec4,
      ledGreen: 0x4ade80,
    };

    // ========================================================================
    // FEATURE 1: SEAMLESS SHOWROOM SIÊU XE "PREMIUM DELUXE MOTORSPORT"
    //            Parcel: X in [-24, +24], Z in [136, 178]
    //            Facing Boulevard Bồng Lai Tiên Đảo (X = +40) & Olympic St (Z = +120)
    // ========================================================================
    {
      const minX = -24.0, maxX = 24.0, minZ = 136.0, maxZ = 178.0;
      const cx = 0.0, cz = 157.0, w = 48.0, d = 42.0;

      // Exterior luxury granite forecourt apron extending cleanly to sidewalks (X=28.8, Z=128.2)
      batch.add('marble', mats.marble, uBox, 1.8, 0.115, 155.2, 0, 0, 0, 53.6, 0.23, 53.6, 0xd8dee9, false, true);
      // Interior mirror-polished white & gold-veined marble showroom floor (y = 0.24m)
      batch.add('marble', mats.marble, uBox, cx, 0.12, cz, 0, 0, 0, w + 0.6, 0.24, d + 0.6, C.white, false, true);

      // Decorative dark Nero Marquina marble border inlays inside showroom
      batch.add('marble', mats.marble, uBox, cx, 0.242, 138.2, 0, 0, 0, 43.0, 0.01, 0.65, C.anthracite, false, true);
      batch.add('marble', mats.marble, uBox, 21.8, 0.242, cz, 0, 0, 0, 0.65, 0.01, 37.5, C.anthracite, false, true);

      // Solid West Wall (X = -24.0) & South Wall (Z = 178.0) + VIP Simeon Executive Office Mezzanine
      batch.add('archSolid', mats.archSolid, uBox, -24.0, 5.6, cz, 0, 0, 0, 0.75, 11.2, d + 0.6, C.anthracite, true, true);
      batch.add('archSolid', mats.archSolid, uBox, cx, 5.6, 178.0, 0, 0, 0, w + 0.6, 11.2, 0.75, C.anthracite, true, true);
      registerAABB(-24.45, -23.55, minZ, maxZ, 11.4, 0, 'pdm_wall_west');
      registerAABB(minX, maxX, 177.55, 178.45, 11.4, 0, 'pdm_wall_south');

      // Sleek Cantilevered Architectural Corner Roof & Curved Fascia Crown (ceiling y = 6.8m..11.2m)
      batch.add('archSolid', mats.archSolid, uBox, cx, 7.15, cz, 0, 0, 0, w + 1.4, 0.75, d + 1.4, C.anthracite, true, true);
      batch.add('metal', mats.metal, uBox, cx, 8.65, cz, 0, 0, 0, w + 2.2, 2.35, d + 2.2, C.slate, true, true);
      batch.add('metal', mats.metal, uBox, cx, 10.05, cz, 0, 0, 0, w + 2.8, 0.52, d + 2.8, C.chrome, true, true);
      // Curved Architectural NE Corner Rotunda Fin at (+23.2, y, 136.8)
      batch.add('metal', mats.metal, uCyl, 22.8, 8.65, 137.2, 0, 0, 0, 5.6, 2.45, 5.6, C.chrome, true, true);
      batch.add('emissive', mats.emissive, uCyl, 22.8, 7.45, 137.2, 0, 0, 0, 5.8, 0.22, 5.8, C.ledCyan, false, false);
      // Roof ceiling AABB (minY = 6.75m so tall SUVs/cars drive underneath effortlessly!)
      registerAABB(minX - 0.5, maxX + 0.5, minZ - 0.5, maxZ + 0.5, 10.4, 6.75, 'pdm_roof');

      // Glowing "PREMIUM DELUXE MOTORSPORT" Fascia Signs on East (facing Blvd Bồng Lai Tiên Đảo X=40) & North (facing Z=120)
      addSignPlane(25.15, 8.65, 157.0, Math.PI * 0.5, 36.0, 2.15, atlasRowRect(0));
      addSignPlane(0.0, 8.65, 134.85, Math.PI, 38.0, 2.15, atlasRowRect(0));
      // Corner Vertical Illuminated PDM Dealership Totem at (26.2, 0.24, 133.6)
      batch.add('metal', mats.metal, uBox, 26.2, 5.2, 133.6, 0, -Math.PI * 0.25, 0, 1.85, 10.0, 0.55, C.anthracite, true, true);
      batch.add('emissive', mats.emissive, uBox, 26.2, 5.2, 133.6, 0, -Math.PI * 0.25, 0, 1.95, 9.6, 0.22, C.ledCyan, false, false);
      registerAABB(25.3, 27.1, 132.7, 134.5, 10.2, 0, 'pdm_totem');

      // Interior Recessed Halo Ceiling Spotlights, Alloy Rim Showcase Wall & Simeon's Sales Desk
      for (let lx = -16; lx <= 16; lx += 8) {
        for (let lz = 143; lz <= 171; lz += 9) {
          batch.add('emissive', mats.emissive, uCyl, lx, 6.74, lz, 0, 0, 0, 2.1, 0.06, 2.1, C.ledWarm, false, false);
        }
      }
      // Alloy Wheel Showcase & Supercar Lightboxes on West Wall (X = -23.4)
      for (let wz = 142; wz <= 172; wz += 6) {
        batch.add('metal', mats.metal, uTorus, -23.38, 2.6, wz, 0, Math.PI * 0.5, 0, 1.05, 1.05, 1.05, C.gold, false, false);
        batch.add('metal', mats.metal, uTorus, -23.38, 4.3, wz, 0, Math.PI * 0.5, 0, 1.05, 1.05, 1.05, C.chrome, false, false);
      }
      // Simeon's VIP Reception Desk & Leather Lounge at South-West Corner (-16, 0.24, 173.5)
      batch.add('archSolid', mats.archSolid, uBox, -16.0, 0.78, 173.5, 0, 0, 0, 5.4, 1.08, 1.45, C.woodDark, true, true);
      batch.add('metal', mats.metal, uBox, -16.0, 1.34, 173.5, 0, 0, 0, 5.5, 0.08, 1.55, C.gold, false, true);
      registerAABB(-18.8, -13.2, 172.7, 174.3, 1.4, 0, 'pdm_sales_desk');

      // 2 Illuminated Turntable Plinth Rings & Overhead Halo Truss Rings
      for (let ti = 0; ti < pdmState.turntables.length; ti++) {
        const tt = pdmState.turntables[ti];
        const glowCol = ti === 0 ? C.ledCyan : C.ledGold;
        // Fixed outer beveled marble collar + glowing LED ring + overhead chandelier ring
        batch.add('marble', mats.marble, uCyl, tt.x, 0.28, tt.z, 0, 0, 0, 8.9, 0.10, 8.9, C.anthracite, false, true);
        batch.add('emissive', mats.emissive, uTorus, tt.x, 0.34, tt.z, Math.PI * 0.5, 0, 0, 8.6, 8.6, 1.0, glowCol, false, false);
        batch.add('metal', mats.metal, uTorus, tt.x, 5.95, tt.z, Math.PI * 0.5, 0, 0, 8.2, 8.2, 1.2, C.chrome, false, false);
        batch.add('emissive', mats.emissive, uTorus, tt.x, 5.82, tt.z, Math.PI * 0.5, 0, 0, 8.0, 8.0, 1.0, glowCol, false, false);
      }

      // Slim Chrome Mullion Columns along East (X=+24) & North (Z=+136) Facades
      // Note: East bay Z in [171.8, 177.2] is an OPEN drive-in/walk-in portal archway!
      const eastMullionZs = [137.0, 145.6, 154.2, 162.8, 171.4];
      for (const mz of eastMullionZs) {
        batch.add('metal', mats.metal, uBox, 24.0, 3.5, mz, 0, 0, 0, 0.36, 6.6, 0.36, C.chrome, true, false);
        registerAABB(23.78, 24.22, mz - 0.22, mz + 0.22, 6.7, 0, 'pdm_mullion');
      }
      const northMullionXs = [-23.2, -12.6, -2.0, 8.6, 19.2];
      for (const mx of northMullionXs) {
        batch.add('metal', mats.metal, uBox, mx, 3.5, 136.0, 0, 0, 0, 0.36, 6.6, 0.36, C.chrome, true, false);
        registerAABB(mx - 0.22, mx + 0.22, 135.78, 136.22, 6.7, 0, 'pdm_mullion');
      }

      // Define the 8 Tall Transparent Breakable Drive-Through Glass Curtain-Wall Panels!
      //   0..3: East Facade (x = +24.0, facing Boulevard Bồng Lai Tiên Đảo)
      //   4..7: North Facade (z = +136.0, facing Olympic Street)
      for (let i = 0; i < 4; i++) {
        const zCenter = 141.3 + i * 8.6;
        const spanW = 8.15;
        const aabb = registerAABB(23.82, 24.18, zCenter - spanW * 0.5, zCenter + spanW * 0.5, 6.5, 0.24, 'pdm_breakable_glass');
        pdmState.glassPanels.push({
          idx: pdmState.glassPanels.length,
          x: 24.0,
          y: 3.45,
          z: zCenter,
          ry: Math.PI * 0.5,
          spanW,
          spanH: 6.3,
          isAlongZ: true,
          broken: false,
          aabb,
        });
      }
      for (let i = 0; i < 4; i++) {
        const xCenter = -17.9 + i * 10.6;
        const spanW = 10.15;
        const aabb = registerAABB(xCenter - spanW * 0.5, xCenter + spanW * 0.5, 135.82, 136.18, 6.5, 0.24, 'pdm_breakable_glass');
        pdmState.glassPanels.push({
          idx: pdmState.glassPanels.length,
          x: xCenter,
          y: 3.45,
          z: 136.0,
          ry: 0,
          spanW,
          spanH: 6.3,
          isAlongZ: false,
          broken: false,
          aabb,
        });
      }

      // Instanced Rotating Turntable Discs (2 instances -> 1 draw call!)
      const ttGeo = new THREE.CylinderGeometry(4.05, 4.25, 0.14, 32);
      pdmState.turntableInst = new THREE.InstancedMesh(ttGeo, mats.metal, 2);
      pdmState.turntableInst.receiveShadow = true;
      for (let ti = 0; ti < 2; ti++) {
        const tt = pdmState.turntableInst;
        const cfg = pdmState.turntables[ti];
        setDummyMatrix(tt, ti, cfg.x, 0.31, cfg.z, 0, cfg.angle, 0, 1, 1, 1);
        _col.setHex(ti === 0 ? 0x1e293b : 0x27272a);
        tt.setColorAt(ti, _col);
      }
      pdmState.turntableInst.instanceMatrix.needsUpdate = true;
      if (pdmState.turntableInst.instanceColor) pdmState.turntableInst.instanceColor.needsUpdate = true;
      commRoot.add(pdmState.turntableInst);
    }

    // ========================================================================
    // FEATURE 2: RẠP CHIẾU PHIM CỔ ĐIỂN "ORIENTAL / DOPPLER THEATER"
    //            Parcel: X in [-24, +24], Z in [-182, -142]
    // ========================================================================
    {
      const cx = -2.0, cz = -162.0;

      // Côn Lôn Tiên Sơn Walk-of-Fame Terrazzo Forecourt & Gold Stars along East (X in [16, 28.5]) & North (Z in [-191.5, -181.5])
      batch.add('marble', mats.marble, uBox, 2.0, 0.12, cz, 0, 0, 0, 52.5, 0.24, 46.0, 0x2c2228, false, true);
      for (let sz = -178; sz <= -146; sz += 4.0) {
        batch.add('emissive', mats.emissive, uCyl, 22.8, 0.246, sz, 0, 0.3, 0, 0.95, 0.015, 0.95, C.gold, false, false);
      }
      for (let sx = -18; sx <= 18; sx += 4.5) {
        batch.add('emissive', mats.emissive, uCyl, sx, 0.246, -184.2, 0, 0.3, 0, 0.95, 0.015, 0.95, C.gold, false, false);
      }

      // Main Art-Deco Auditorium Mass & Stepped Ziggurat Facade Tiers (X in [-24, +17.5], Z in [-182, -142])
      batch.add('archSolid', mats.archSolid, uBox, -3.25, 7.2, cz, 0, 0, 0, 41.5, 14.4, 40.0, C.cream, true, true);
      batch.add('archSolid', mats.archSolid, uBox, -4.0, 16.8, cz, 0, 0, 0, 32.0, 4.8, 31.0, C.limestone, true, true);
      batch.add('archSolid', mats.archSolid, uBox, -4.5, 21.4, cz, 0, 0, 0, 22.0, 4.4, 22.0, C.terracotta, true, true);
      // Oriental Pagoda-Inspired Gilded Emerald Crown Roof Eaves
      batch.add('metal', mats.metal, uBox, -4.5, 23.85, cz, 0, 0, 0, 24.4, 0.65, 24.4, 0x0f766e, true, true);
      batch.add('metal', mats.metal, uCone, -4.5, 26.2, cz, 0, Math.PI * 0.25, 0, 14.0, 4.2, 14.0, C.gold, true, false);
      registerAABB(-24.0, 17.5, -182.0, -142.0, 24.0, 0, 'doppler_oriental_theater');

      // Fluted Art-Deco Gilded Pilasters & Vintage Movie Poster Lightboxes on East & North Facades
      for (let pz = -178; pz <= -146; pz += 8.0) {
        batch.add('metal', mats.metal, uBox, 17.65, 7.2, pz, 0, 0, 0, 0.65, 14.2, 0.95, C.gold, true, false);
        if (pz < -146 && Math.abs(pz + 162) > 5.0) {
          addSignPlane(17.62, 3.1, pz + 4.0, Math.PI * 0.5, 3.2, 2.4, atlasCellRect(11, Math.abs(Math.round(pz)) % 4));
        }
      }
      for (let px = -20; px <= 12; px += 8.0) {
        batch.add('metal', mats.metal, uBox, px, 7.2, -182.15, 0, 0, 0, 0.95, 14.2, 0.65, C.gold, true, false);
      }

      // Towering 36m Glowing Vertical Neon Fin Tower at (+16.8, 0..36m, -162.0)!
      batch.add('metal', mats.metal, uBox, 16.8, 18.0, cz, 0, 0, 0, 2.4, 35.5, 3.2, C.anthracite, true, true);
      batch.add('metal', mats.metal, uBox, 18.8, 19.5, cz, 0, 0, 0, 2.8, 26.0, 0.55, C.gold, true, false);
      // Vertical Neon Blade Faces + Animated GLSL Chasing Neon Strips + Starburst Finial
      addSignPlane(18.8, 19.5, cz + 0.32, 0, 2.6, 24.5, atlasRowRect(14));
      addSignPlane(18.8, 19.5, cz - 0.32, Math.PI, 2.6, 24.5, atlasRowRect(14));
      addNeonShaderPanel(20.25, 19.5, cz, Math.PI * 0.5, 0.52, 25.0, 0.52, 0.25);
      batch.add('emissive', mats.emissive, uSphere, 16.8, 36.6, cz, 0, 0, 0, 2.2, 2.2, 2.2, C.ledGold, false, false);

      // Animated Chasing-Bulb V-Shaped Entrance Marquee Canopy (East at X=21.2, Z=-162 & North at X=-2, Z=-183.8)
      batch.add('metal', mats.metal, uBox, 21.0, 5.25, cz, 0, 0, 0, 7.2, 1.85, 13.6, C.velvetRed, true, true);
      // GLSL Chasing-Bulb Marquee Front & Side Panels (Mode 0: r = 0.15)
      addNeonShaderPanel(24.65, 5.25, cz, Math.PI * 0.5, 13.4, 1.82, 0.15, 0.1);
      addNeonShaderPanel(21.0, 5.25, cz - 6.84, Math.PI, 7.1, 1.82, 0.15, 0.4);
      addNeonShaderPanel(21.0, 5.25, cz + 6.84, 0, 7.1, 1.82, 0.15, 0.7);
      addSignPlane(24.72, 5.25, cz, Math.PI * 0.5, 11.4, 1.18, atlasRowRect(1));
      // Warm glowing marquee ceiling soffit bulbs
      batch.add('emissive', mats.emissive, uBox, 21.0, 4.30, cz, 0, 0, 0, 6.8, 0.06, 13.0, C.ledWarm, false, false);

      // North Secondary Chasing Marquee facing Côn Lôn Tiên Sơn Blvd (Z = -200)
      batch.add('metal', mats.metal, uBox, -2.0, 5.25, -184.0, 0, 0, 0, 13.6, 1.85, 4.2, C.velvetRed, true, true);
      addNeonShaderPanel(-2.0, 5.25, -186.14, Math.PI, 13.4, 1.82, 0.15, 0.55);
      addSignPlane(-2.0, 5.25, -186.20, Math.PI, 11.4, 1.18, atlasRowRect(1));

      // Plush Crimson Red-Carpet Entrance Runner & Ornate Octagonal Brass/Glass Ticket Kiosk at (23.2, 0.24, -162.0)!
      batch.add('archSolid', mats.archSolid, uBox, 21.2, 0.255, cz, 0, 0, 0, 7.6, 0.03, 5.4, C.velvetRed, false, true);
      batch.add('metal', mats.metal, uBox, 21.2, 0.262, cz - 2.65, 0, 0, 0, 7.6, 0.035, 0.18, C.gold, false, false);
      batch.add('metal', mats.metal, uBox, 21.2, 0.262, cz + 2.65, 0, 0, 0, 7.6, 0.035, 0.18, C.gold, false, false);

      // Ticket Kiosk Booth
      batch.add('metal', mats.metal, uOctCyl, 23.4, 0.72, cz, 0, 0, 0, 2.2, 0.96, 2.2, C.brass, true, true);
      batch.add('staticGlass', mats.staticGlass, uOctCyl, 23.4, 1.78, cz, 0, 0, 0, 2.05, 1.18, 2.05, null, false, false);
      batch.add('metal', mats.metal, uCone, 23.4, 2.68, cz, 0, 0, 0, 2.45, 0.65, 2.45, C.velvetRed, true, false);
      registerAABB(22.3, 24.5, cz - 1.1, cz + 1.1, 2.8, 0, 'doppler_ticket_kiosk');
    }

    // ========================================================================
    // FEATURE 3: TRUNG TÂM THƯƠNG MẠI MỞ "ROCKFORD PLAZA"
    //            Parcel: X in [-106, -54], Z in [-186, -134]
    //            - West & East Luxury Retail Wings
    //            - Open Drivable North-South Central Underpass Arcade (X in [-87.4, -72.6])
    //            - High Glass Skybridge at y = 8.5m (X in [-88, -72], Z in [-166.5, -153.5])
    //            - 4 Wide Grand Stone Staircases (getElevation sloped stunt ramps!)
    // ========================================================================
    {
      const arcadeX = -80.0;
      const cz = -160.0;

      // 1) Central Drivable Polished Cobble-Granite Underpass Arcade Roadway (Z in [-192, -128], X in [-87.6, -72.4], y = 0.04m)
      batch.add('marble', mats.marble, uBox, arcadeX, 0.02, cz, 0, 0, 0, 15.4, 0.04, 64.0, 0x475569, false, true);
      // Gold median ornament strip along the luxury galleria drive-through
      batch.add('metal', mats.metal, uBox, arcadeX, 0.044, cz, 0, 0, 0, 0.35, 0.01, 56.0, C.gold, false, true);

      // 2) Outer West Luxury Retail Tower (X in [-106.0, -95.5], Z in [-186.0, -134.0], height = 22.0m)
      //    & Outer East Luxury Retail Tower (X in [-64.5, -54.0], Z in [-186.0, -134.0], height = 24.0m)
      batch.add('archSolid', mats.archSolid, uBox, -100.75, 11.0, cz, 0, 0, 0, 10.5, 22.0, 52.0, C.cream, true, true);
      batch.add('metal', mats.metal, uBox, -100.75, 22.35, cz, 0, 0, 0, 11.1, 0.7, 52.6, C.gold, true, true);
      registerAABB(-106.0, -95.5, -186.0, -134.0, 22.5, 0, 'rockford_west_tower');

      batch.add('archSolid', mats.archSolid, uBox, -59.25, 12.0, cz, 0, 0, 0, 10.5, 24.0, 52.0, C.limestone, true, true);
      batch.add('metal', mats.metal, uBox, -59.25, 24.35, cz, 0, 0, 0, 11.1, 0.7, 52.6, C.gold, true, true);
      registerAABB(-64.5, -54.0, -186.0, -134.0, 24.5, 0, 'rockford_east_tower');

      // 3) Inner Retail Podiums & y = 8.50m Upper Promenade Terraces (Z in [-170.0, -150.0])
      //    leaving Z in [-188, -170] & Z in [-150, -132] open for the 4 Grand Stone Staircases!
      batch.add('marble', mats.marble, uBox, -91.6, 4.25, cz, 0, 0, 0, 7.8, 8.5, 20.0, C.white, true, true);
      batch.add('marble', mats.marble, uBox, -68.4, 4.25, cz, 0, 0, 0, 7.8, 8.5, 20.0, C.white, true, true);
      registerAABB(-95.5, -87.7, -170.0, -150.0, 8.46, 0, 'rockford_west_terrace_base');
      registerAABB(-72.3, -64.5, -170.0, -150.0, 8.46, 0, 'rockford_east_terrace_base');

      // Luxury Ground Boutique Storefronts facing the Central Underpass Arcade & Outer Streets
      for (let bi = 0; bi < 3; bi++) {
        const bz = -167.0 + bi * 7.0;
        addSignPlane(-87.62, 2.5, bz, Math.PI * 0.5, 5.4, 2.8, atlasCellRect(11, bi % 4));
        addSignPlane(-72.38, 2.5, bz, -Math.PI * 0.5, 5.4, 2.8, atlasCellRect(11, (bi + 1) % 4));
      }
      addSignPlane(-106.1, 4.2, cz, -Math.PI * 0.5, 28.0, 2.0, atlasRowRect(2));
      addSignPlane(-53.9, 4.2, cz, Math.PI * 0.5, 28.0, 2.0, atlasRowRect(2));

      // 4) 4 Wide Grand Stone Staircases (width = 7.4m, length = 18.0m, y = 0.22m -> 8.50m!)
      //    Sculpted stepped travertine flights + solid stone cheek walls so motorcycles & supercars stunt-drive right up & over!
      const stairConfigs = [
        { cx: -91.6, zStart: -188.0, zEnd: -170.0 }, // NW climb South
        { cx: -91.6, zStart: -132.0, zEnd: -150.0 }, // SW climb North
        { cx: -68.4, zStart: -188.0, zEnd: -170.0 }, // NE climb South
        { cx: -68.4, zStart: -132.0, zEnd: -150.0 }, // SE climb North
      ];
      const numSteps = 22;
      for (const sc of stairConfigs) {
        for (let s = 0; s < numSteps; s++) {
          const u0 = s / numSteps;
          const u1 = (s + 1) / numSteps;
          const um = (u0 + u1) * 0.5;
          const sz = lerp(sc.zStart, sc.zEnd, um);
          const topY = lerp(0.22, 8.50, smoothRampToe(u1));
          batch.add('marble', mats.marble, uBox, sc.cx, topY * 0.5, sz, 0, 0, 0, 7.4, topY, 18.0 / numSteps + 0.08, C.limestone, true, true);
        }
        // Ornate brass center handrail / LED strip along outer stone cheek balustrade
        const midZ = (sc.zStart + sc.zEnd) * 0.5;
        const slopeAng = Math.atan2(8.28, 18.0) * (sc.zEnd > sc.zStart ? -1 : 1);
        const railX = sc.cx + (sc.cx < -80 ? 3.65 : -3.65);
        batch.add('metal', mats.metal, uBox, railX, 5.05, midZ, slopeAng, 0, 0, 0.26, 0.85, 19.6, C.gold, true, false);
      }

      // 5) High Glass Skybridge at y = 8.50m (X in [-88.0, -72.0], Z in [-166.5, -153.5], 7.7m clear headroom underneath!)
      batch.add('marble', mats.marble, uBox, arcadeX, 8.15, cz, 0, 0, 0, 16.4, 0.70, 13.0, C.white, true, true);
      batch.add('metal', mats.metal, uBox, arcadeX, 7.76, cz, 0, 0, 0, 16.4, 0.18, 13.2, C.gold, false, true);
      // Glass Skybridge Side Parapets & Overhead Vaulted Crystal Atrium Canopy (y = 13.2m)
      batch.add('staticGlass', mats.staticGlass, uBox, arcadeX, 9.25, -166.35, 0, 0, 0, 16.0, 1.5, 0.16, null, false, false);
      batch.add('staticGlass', mats.staticGlass, uBox, arcadeX, 9.25, -153.65, 0, 0, 0, 16.0, 1.5, 0.16, null, false, false);
      batch.add('staticGlass', mats.staticGlass, uCyl, arcadeX, 12.8, cz, Math.PI * 0.5, 0, 0, 16.2, 13.0, 3.2, null, false, false);
      for (const archZ of [-166.2, -160.0, -153.8]) {
        batch.add('metal', mats.metal, uTorus, arcadeX, 12.6, archZ, 0, 0, 0, 16.0, 4.2, 1.2, C.chrome, false, false);
      }
      // Guardrail AABBs ONLY on North & South edges of the Skybridge at y = 8.5..9.8m (leaving East-West deck 100% open to drive across!)
      registerAABB(-87.8, -72.2, -166.6, -166.1, 9.75, 8.4, 'guardrail');
      registerAABB(-87.8, -72.2, -153.9, -153.4, 9.75, 8.4, 'guardrail');

      // Monumental "ROCKFORD PLAZA • GRAND GALLERIA" Portal Fascia Signs facing North (Z=-200) & South (Z=-120)
      addSignPlane(arcadeX, 8.18, -166.62, Math.PI, 15.8, 1.25, atlasRowRect(2));
      addSignPlane(arcadeX, 8.18, -153.38, 0, 15.8, 1.25, atlasRowRect(2));
    }

    // ========================================================================
    // FEATURE 4: BAHAMA MAMAS / CLUB ECLIPSE RED-LIGHT STRIP UPGRADE
    //            Around (-128, -95) — Enhances Túy Tiên Lâu without blocking (-129, 0.22, -95) Corona!
    // ========================================================================
    {
      // 1) Plush Crimson VIP Red Carpet Runner from Túy Tiên Lâu Door (-131.0, -95.0) out to (-125.8, -95.0)
      batch.add('archSolid', mats.archSolid, uBox, -128.4, 0.232, -95.0, 0, 0, 0, 5.4, 0.024, 4.2, C.velvetRed, false, true);
      batch.add('metal', mats.metal, uBox, -128.4, 0.238, -97.05, 0, 0, 0, 5.4, 0.028, 0.16, C.gold, false, false);
      batch.add('metal', mats.metal, uBox, -128.4, 0.238, -92.95, 0, 0, 0, 5.4, 0.028, 0.16, C.gold, false, false);

      // 2) Gleaming 24K Brass Stanchion Posts & Plush Red Velvet Ropes flanking VIP Entry & Queue!
      const stanchionRows = [
        [-130.5, -97.3], [-128.5, -97.3], [-126.5, -97.3],
        [-130.5, -92.7], [-128.5, -92.7], [-126.5, -92.7],
        [-130.2, -100.3], [-130.2, -103.3], [-130.2, -89.7], [-130.2, -86.7],
      ];
      for (const [sx, sz] of stanchionRows) {
        batch.add('metal', mats.metal, uCyl, sx, 0.26, sz, 0, 0, 0, 0.34, 0.06, 0.34, C.brass, false, true);
        batch.add('metal', mats.metal, uCyl, sx, 0.72, sz, 0, 0, 0, 0.065, 0.92, 0.065, C.gold, true, false);
        batch.add('metal', mats.metal, uSphere, sx, 1.21, sz, 0, 0, 0, 0.14, 0.14, 0.14, C.gold, false, false);
      }
      // Red Velvet Rope Spans between Stanchions
      const ropeSpans = [
        [-129.5, -97.3, 0, 2.0], [-127.5, -97.3, 0, 2.0],
        [-129.5, -92.7, 0, 2.0], [-127.5, -92.7, 0, 2.0],
        [-130.2, -98.8, Math.PI * 0.5, 3.0], [-130.2, -101.8, Math.PI * 0.5, 3.0],
        [-130.2, -91.2, Math.PI * 0.5, 3.0], [-130.2, -88.2, Math.PI * 0.5, 3.0],
      ];
      for (const [rx, rz, yaw, len] of ropeSpans) {
        batch.add('archSolid', mats.archSolid, uCyl, rx, 0.98, rz, 0, yaw, Math.PI * 0.5, 0.065, len, 0.065, C.crimson, false, false);
      }

      // 3) Custom GLSL Color-Cycling Neon Sign Shaders & "BAHAMA MAMAS & CLUB ECLIPSE" Facade Marquees!
      addSignPlane(-130.55, 8.8, -95.0, Math.PI * 0.5, 22.0, 2.4, atlasRowRect(3));
      // Flanking GLSL Plasma Neon Art Panels (Mode 1: r = 0.52) along the Red-Light Strip!
      addNeonShaderPanel(-130.52, 6.2, -107.5, Math.PI * 0.5, 9.2, 4.2, 0.52, 0.12);
      addNeonShaderPanel(-130.52, 6.2, -82.5, Math.PI * 0.5, 9.2, 4.2, 0.52, 0.58);
      // Rooftop Giant Double-Sided Neon Crown Sign at (-133.5, 16.5, -95.0)
      batch.add('metal', mats.metal, uBox, -133.5, 16.5, -95.0, 0, 0, 0, 0.45, 4.2, 24.0, C.anthracite, true, false);
      addNeonShaderPanel(-133.22, 16.5, -95.0, Math.PI * 0.5, 23.6, 3.9, 0.52, 0.35);
      addSignPlane(-133.16, 16.5, -95.0, Math.PI * 0.5, 21.0, 2.2, atlasRowRect(3));

      // 4) 4 Sky-Piercing Vertical Night Laser Beams (y = 0..165m Additive Cones Sweeping the Night Sky!)
      const laserAnchors = [
        { x: -130.4, z: -112.5, color: 0x00f5ff },
        { x: -130.4, z: -77.5, color: 0xff1cf7 },
        { x: -162.0, z: -112.5, color: 0xa855f7 },
        { x: -162.0, z: -77.5, color: 0x38bdf8 },
      ];
      for (const la of laserAnchors) {
        // Armored xenon searchlight gimbal housing on ground/terrace
        batch.add('metal', mats.metal, uCyl, la.x, 0.58, la.z, 0, 0, 0, 0.95, 0.72, 0.95, C.anthracite, true, true);
        batch.add('emissive', mats.emissive, uCyl, la.x, 0.96, la.z, 0, 0, 0, 0.72, 0.08, 0.72, la.color, false, false);
      }

      // ConeGeometry(topRadius=3.6, bottomRadius=0.28, height=165, radial=18, heightSeg=1, openEnded=true)
      // Note: CylinderGeometry(radiusTop, radiusBottom, height) with translate(0, 82.5, 0) puts narrow emitter at y=0 and wide cone at y=165m!
      const beamGeo = new THREE.CylinderGeometry(3.8, 0.28, 165.0, 18, 1, true);
      beamGeo.translate(0, 82.5, 0);
      laserBeamInst = new THREE.InstancedMesh(beamGeo, mats.laserShader, 4);
      laserBeamInst.visible = false;
      laserBeamInst.frustumCulled = false;
      laserBeamInst.renderOrder = 12;
      for (let li = 0; li < 4; li++) {
        const la = laserAnchors[li];
        setDummyMatrix(laserBeamInst, li, la.x, 0.35, la.z, 0, 0, 0, 1, 1, 1);
        _col.setHex(la.color);
        laserBeamInst.setColorAt(li, _col);
      }
      laserBeamInst.instanceMatrix.needsUpdate = true;
      if (laserBeamInst.instanceColor) laserBeamInst.instanceColor.needsUpdate = true;
      commRoot.add(laserBeamInst);
      pdmState.laserAnchors = laserAnchors;
    }

    // ========================================================================
    // FEATURE 5: 2 TRẠM XĂNG "RON / LTD GAS STATIONS" + SEAMLESS WALK-IN "24/7"
    //            - Station North at (76, -222) along Z = -200 North Avenue
    //            - Station South at (-76, +222) along Z = +200 South Avenue
    // ========================================================================
    {
      const stationSpecs = [
        {
          id: 'north',
          // Forecourt & 4 Fuel Pumps centered right at (76, -221.6) ~ (76, -222)!
          // Attached Seamless Walk-In 24/7 Store directly behind at Z in [-229.3, -223.8] (clear South of Observatory cliff Z=-229.5!)
          canopyX: 76.0,
          canopyZ: -221.4,
          pumpXs: [70.2, 74.1, 77.9, 81.8],
          pumpZ: -221.4,
          totemX: 66.8,
          totemZ: -210.5,
          storeMinX: 68.0,
          storeMaxX: 84.0,
          storeMinZ: -229.3,
          storeMaxZ: -224.0,
          doorX: 76.0,
          doorZ: -224.0,
          doorSignDir: 1, // Store faces South (+Z) toward pumps & Z=-200 street!
        },
        {
          id: 'south',
          // Pump #1 sits right at (-75.2, +222.0) ~ (-76, +222)!
          // Attached Seamless Walk-In 24/7 Store behind at X in [-67.5, -51.5], Z in [235.5, 246.5] (clear East of (-70,232) pier!)
          canopyX: -68.6,
          canopyZ: 222.0,
          pumpXs: [-75.2, -70.8, -66.4, -62.0],
          pumpZ: 222.0,
          totemX: -76.4,
          totemZ: 218.5,
          storeMinX: -67.5,
          storeMaxX: -51.5,
          storeMinZ: 235.5,
          storeMaxZ: 246.5,
          doorX: -59.5,
          doorZ: 235.5,
          doorSignDir: -1, // Store faces North (-Z) toward pumps & Z=+200 street!
        },
      ];

      // Build Detailed Fuel Pump Merged Unit Geometry (Intact vs Scorched Wreckage) -> 2 InstancedMeshes for all 8 pumps!
      const intactPumpParts = [
        { geo: new THREE.BoxGeometry(1.15, 0.18, 0.78), matrix: makeMat4(0, 0.09, 0), color: new THREE.Color(C.limestone) },
        { geo: new THREE.BoxGeometry(0.92, 1.95, 0.56), matrix: makeMat4(0, 1.14, 0), color: new THREE.Color(C.white) },
        { geo: new THREE.BoxGeometry(0.98, 0.42, 0.62), matrix: makeMat4(0, 2.18, 0), color: new THREE.Color(C.ronOrange) },
        { geo: new THREE.BoxGeometry(0.96, 0.14, 0.60), matrix: makeMat4(0, 1.88, 0), color: new THREE.Color(C.ronBlue) },
        { geo: new THREE.BoxGeometry(0.56, 0.34, 0.60), matrix: makeMat4(0, 1.48, 0), color: new THREE.Color(0x0f172a) },
        // Dual hanging rubber fuel hoses + yellow U-bollards
        { geo: new THREE.CylinderGeometry(0.025, 0.025, 1.15, 8), matrix: makeMat4(-0.52, 1.15, 0, 0, 0, 0.12), color: new THREE.Color(0x111827) },
        { geo: new THREE.CylinderGeometry(0.025, 0.025, 1.15, 8), matrix: makeMat4(0.52, 1.15, 0, 0, 0, -0.12), color: new THREE.Color(0x111827) },
        { geo: new THREE.CylinderGeometry(0.055, 0.055, 0.92, 8), matrix: makeMat4(-0.74, 0.46, 0.36), color: new THREE.Color(C.burgerYellow) },
        { geo: new THREE.CylinderGeometry(0.055, 0.055, 0.92, 8), matrix: makeMat4(0.74, 0.46, -0.36), color: new THREE.Color(C.burgerYellow) },
      ];
      const scorchedPumpParts = [
        { geo: new THREE.BoxGeometry(1.22, 0.14, 0.84), matrix: makeMat4(0, 0.07, 0), color: new THREE.Color(0x141416) },
        { geo: new THREE.BoxGeometry(0.78, 1.05, 0.48), matrix: makeMat4(0.06, 0.56, -0.04, 0.18, 0.22, -0.24), color: new THREE.Color(0x1c1917) },
        { geo: new THREE.BoxGeometry(0.65, 0.35, 0.44), matrix: makeMat4(-0.18, 0.85, 0.12, -0.35, 0.4, 0.38), color: new THREE.Color(0x292524) },
        { geo: new THREE.CylinderGeometry(1.45, 1.55, 0.02, 14), matrix: makeMat4(0, 0.015, 0), color: new THREE.Color(0x09090b) },
      ];

      pumpIntactInst = new THREE.InstancedMesh(mergeGeometries(intactPumpParts), mats.archSolid, 8);
      pumpScorchedInst = new THREE.InstancedMesh(mergeGeometries(scorchedPumpParts), mats.archSolid, 8);
      pumpIntactInst.castShadow = true;
      pumpScorchedInst.castShadow = true;
      commRoot.add(pumpIntactInst);
      commRoot.add(pumpScorchedInst);

      const clerkArmGeo = new THREE.BoxGeometry(0.12, 0.52, 0.12);
      clerkArmGeo.translate(0, -0.22, 0);
      clerkArmInst = new THREE.InstancedMesh(clerkArmGeo, mats.archSolid, 4);
      clerkArmInst.frustumCulled = false;
      for (let ai = 0; ai < 4; ai++) {
        _col.setHex(0xe0ac69);
        clerkArmInst.setColorAt(ai, _col);
      }
      if (clerkArmInst.instanceColor) clerkArmInst.instanceColor.needsUpdate = true;
      commRoot.add(clerkArmInst);

      let globalPumpIdx = 0;

      for (let si = 0; si < stationSpecs.length; si++) {
        const sp = stationSpecs[si];
        const sw = sp.storeMaxX - sp.storeMinX; // 16.0m
        const sd = sp.storeMaxZ - sp.storeMinZ;
        const scx = (sp.storeMinX + sp.storeMaxX) * 0.5;
        const scz = (sp.storeMinZ + sp.storeMaxZ) * 0.5;

        // 1) Paved Concrete Gas Forecourt Apron
        if (sp.id === 'north') {
          batch.add('archSolid', mats.archSolid, uBox, 76.0, 0.115, -218.8, 0, 0, 0, 19.6, 0.23, 21.4, 0x64748b, false, true);
        } else {
          batch.add('archSolid', mats.archSolid, uBox, -64.0, 0.115, 228.0, 0, 0, 0, 27.0, 0.23, 38.0, 0x64748b, false, true);
        }

        // 2) Large Illuminated RON Canopy (y = 5.8m, 18.2m wide x 7.4m deep)
        batch.add('archSolid', mats.archSolid, uBox, sp.canopyX, 5.80, sp.canopyZ, 0, 0, 0, 18.4, 0.92, 7.6, C.ronOrange, true, true);
        batch.add('archSolid', mats.archSolid, uBox, sp.canopyX, 6.22, sp.canopyZ, 0, 0, 0, 18.6, 0.18, 7.8, C.ronBlue, false, true);
        batch.add('emissive', mats.emissive, uBox, sp.canopyX, 5.32, sp.canopyZ, 0, 0, 0, 16.8, 0.06, 6.2, C.ledWarm, false, false);
        addSignPlane(sp.canopyX, 5.80, sp.canopyZ + 3.84, 0, 17.6, 0.84, atlasRowRect(4));
        addSignPlane(sp.canopyX, 5.80, sp.canopyZ - 3.84, Math.PI, 17.6, 0.84, atlasRowRect(4));

        // 2 Heavy Steel Canopy Columns (placed cleanly at outer canopy ends so lanes between pumps are wide open!)
        for (const colOffX of [-7.6, 7.6]) {
          const colX = sp.canopyX + colOffX;
          batch.add('metal', mats.metal, uCyl, colX, 2.85, sp.canopyZ, 0, 0, 0, 0.58, 5.3, 0.58, C.white, true, true);
          registerAABB(colX - 0.34, colX + 0.34, sp.canopyZ - 0.34, sp.canopyZ + 0.34, 5.6, 0, 'ron_canopy_pillar');
        }

        // 3) Illuminated RON / LTD Price Monolith Totem
        batch.add('archSolid', mats.archSolid, uBox, sp.totemX, 3.8, sp.totemZ, 0, 0, 0, 2.35, 7.2, 0.62, C.anthracite, true, true);
        addSignPlane(sp.totemX, 4.1, sp.totemZ + 0.34, 0, 2.15, 5.8, atlasCellRect(5, 0));
        addSignPlane(sp.totemX, 4.1, sp.totemZ - 0.34, Math.PI, 2.15, 5.8, atlasCellRect(5, 0));
        registerAABB(sp.totemX - 1.2, sp.totemX + 1.2, sp.totemZ - 0.4, sp.totemZ + 0.4, 7.4, 0, 'ron_price_totem');

        // 4) Register 4 Detailed Fuel Pumps per Station
        const stPumps = [];
        for (let pi = 0; pi < 4; pi++) {
          const px = sp.pumpXs[pi];
          const pz = sp.pumpZ;
          const idx = globalPumpIdx++;
          setDummyMatrix(pumpIntactInst, idx, px, 0.24, pz, 0, 0, 0, 1, 1, 1);
          setDummyMatrix(pumpScorchedInst, idx, px, -999, pz, 0, 0, 0, 0.001, 0.001, 0.001);
          const pumpAABB = registerAABB(px - 0.62, px + 0.62, pz - 0.44, pz + 0.44, 2.35, 0.2, 'ron_fuel_pump');
          stPumps.push({ idx, x: px, y: 0.24, z: pz, exploded: false, detonateTimer: -1, aabb: pumpAABB });
        }

        // 5) SEAMLESS WALK-IN "24/7 CONVENIENCE STORE" (Hollow Interior, Zero Loading Screen!)
        const storeH = 4.55;
        // Checkered Linoleum Interior Floor (y = 0.24m) & Bright Fluorescent Roof Slab
        batch.add('marble', mats.marble, uBox, scx, 0.125, scz, 0, 0, 0, sw + 0.3, 0.25, sd + 0.3, C.cream, false, true);
        batch.add('archSolid', mats.archSolid, uBox, scx, storeH + 0.32, scz, 0, 0, 0, sw + 0.7, 0.65, sd + 0.7, C.white, true, true);
        batch.add('archSolid', mats.archSolid, uBox, scx, storeH + 0.82, scz, 0, 0, 0, sw + 0.9, 0.38, sd + 0.9, 0x16a34a, false, true);
        registerAABB(sp.storeMinX - 0.2, sp.storeMaxX + 0.2, sp.storeMinZ - 0.2, sp.storeMaxZ + 0.2, storeH + 1.1, storeH - 0.1, 'store247_roof');

        // Hollow Perimeter Walls: West, East, Rear Solid Wall, plus Left/Right Glass Storefront flanking 3.6m Open Doorway!
        const backZ = sp.doorSignDir > 0 ? sp.storeMinZ : sp.storeMaxZ;
        const frontZ = sp.doorZ;
        batch.add('archSolid', mats.archSolid, uBox, sp.storeMinX, storeH * 0.5, scz, 0, 0, 0, 0.36, storeH, sd, C.cream, true, true);
        batch.add('archSolid', mats.archSolid, uBox, sp.storeMaxX, storeH * 0.5, scz, 0, 0, 0, 0.36, storeH, sd, C.cream, true, true);
        batch.add('archSolid', mats.archSolid, uBox, scx, storeH * 0.5, backZ, 0, 0, 0, sw, storeH, 0.36, C.cream, true, true);
        registerAABB(sp.storeMinX - 0.22, sp.storeMinX + 0.22, sp.storeMinZ, sp.storeMaxZ, storeH, 0, 'store247_wall_w');
        registerAABB(sp.storeMaxX - 0.22, sp.storeMaxX + 0.22, sp.storeMinZ, sp.storeMaxZ, storeH, 0, 'store247_wall_e');
        registerAABB(sp.storeMinX, sp.storeMaxX, backZ - 0.22, backZ + 0.22, storeH, 0, 'store247_wall_back');

        // Front Glass Storefront Left & Right of 3.6m Sliding Doorway [doorX - 1.8 .. doorX + 1.8]
        const leftSpan = (sp.doorX - 1.8) - sp.storeMinX;
        const rightSpan = sp.storeMaxX - (sp.doorX + 1.8);
        const leftCX = sp.storeMinX + leftSpan * 0.5;
        const rightCX = (sp.doorX + 1.8) + rightSpan * 0.5;
        batch.add('archSolid', mats.archSolid, uBox, leftCX, 0.58, frontZ, 0, 0, 0, leftSpan, 0.72, 0.28, 0x16a34a, true, true);
        batch.add('archSolid', mats.archSolid, uBox, rightCX, 0.58, frontZ, 0, 0, 0, rightSpan, 0.72, 0.28, 0x16a34a, true, true);
        batch.add('staticGlass', mats.staticGlass, uBox, leftCX, 2.15, frontZ, 0, 0, 0, leftSpan - 0.2, 2.35, 0.10, null, false, false);
        batch.add('staticGlass', mats.staticGlass, uBox, rightCX, 2.15, frontZ, 0, 0, 0, rightSpan - 0.2, 2.35, 0.10, null, false, false);
        // Header lintel above doorway + "24/7 SUPERMARKET" Illuminated Fascia
        batch.add('archSolid', mats.archSolid, uBox, scx, 3.95, frontZ, 0, 0, 0, sw, 1.22, 0.34, C.white, true, true);
        addSignPlane(
          scx, 4.15, frontZ + sp.doorSignDir * 0.22,
          sp.doorSignDir > 0 ? 0 : Math.PI,
          sw - 0.4, 1.05, atlasRowRect(6)
        );
        registerAABB(sp.storeMinX, sp.doorX - 1.8, frontZ - 0.2, frontZ + 0.2, storeH, 0, 'store247_front_l');
        registerAABB(sp.doorX + 1.8, sp.storeMaxX, frontZ - 0.2, frontZ + 0.2, storeH, 0, 'store247_front_r');
        registerAABB(sp.doorX - 1.8, sp.doorX + 1.8, frontZ - 0.2, frontZ + 0.2, storeH, 3.15, 'store247_door_lintel');

        // Interior Ceiling Fluorescent Strips
        for (const fx of [scx - 4.5, scx, scx + 4.5]) {
          batch.add('emissive', mats.emissive, uBox, fx, storeH - 0.08, scz, 0, 0, 0, 3.2, 0.06, 0.65, C.ledWarm, false, false);
        }

        // Glowing Sprunk & eCola Beverage Coolers along Rear Wall!
        const coolerZ = backZ - sp.doorSignDir * 0.42; // 0.42m inside rear wall
        const coolerYaw = sp.doorSignDir > 0 ? 0 : Math.PI;
        batch.add('metal', mats.metal, uBox, scx - 3.6, 1.45, coolerZ, 0, 0, 0, 3.4, 2.4, 0.55, 0x064e3b, false, true);
        batch.add('metal', mats.metal, uBox, scx - 0.1, 1.45, coolerZ, 0, 0, 0, 3.4, 2.4, 0.55, 0x7f1d1d, false, true);
        addSignPlane(scx - 3.6, 1.45, coolerZ + sp.doorSignDir * 0.30, coolerYaw, 3.25, 2.25, atlasCellRect(5, 1));
        addSignPlane(scx - 0.1, 1.45, coolerZ + sp.doorSignDir * 0.30, coolerYaw, 3.25, 2.25, atlasCellRect(5, 2));

        // 2 Stocked Colorful Snack/Drink Gondola Shelves on Left Half of Store
        for (const gx of [sp.storeMinX + 2.4, sp.storeMinX + 5.2]) {
          batch.add('metal', mats.metal, uBox, gx, 1.05, scz, 0, 0, 0, 0.85, 1.62, sd * 0.46, C.slate, true, true);
          addSignPlane(gx + 0.44, 1.05, scz, Math.PI * 0.5, sd * 0.44, 1.55, atlasRowRect(15));
          addSignPlane(gx - 0.44, 1.05, scz, -Math.PI * 0.5, sd * 0.44, 1.55, atlasRowRect(15));
          registerAABB(gx - 0.45, gx + 0.45, scz - sd * 0.23, scz + sd * 0.23, 1.9, 0, 'store247_shelf');
        }

        // Checkout Counter, Shootable/Robbable 3D Cash Register & Uniformed Cashier NPC on Right Half!
        const regX = sp.storeMaxX - 3.2;
        const regZ = scz;
        batch.add('archSolid', mats.archSolid, uBox, regX, 0.68, regZ, 0, 0, 0, 2.8, 0.92, 1.05, 0x15803d, true, true);
        batch.add('marble', mats.marble, uBox, regX, 1.16, regZ, 0, 0, 0, 2.95, 0.08, 1.15, C.white, false, true);
        // 3D Cash Register Body + Glowing Green Till Screen
        batch.add('metal', mats.metal, uBox, regX - 0.35, 1.38, regZ, 0, 0, 0, 0.56, 0.38, 0.48, C.anthracite, true, false);
        batch.add('emissive', mats.emissive, uBox, regX - 0.35, 1.64, regZ + sp.doorSignDir * 0.14, 0, 0, 0, 0.38, 0.20, 0.06, C.ledGreen, false, false);
        // Red Security Alarm Strobe Dome above Counter
        batch.add('emissive', mats.emissive, uSphere, regX, storeH - 0.22, regZ, 0, 0, 0, 0.32, 0.24, 0.32, C.crimson, false, false);
        registerAABB(regX - 1.45, regX + 1.45, regZ - 0.58, regZ + 0.58, 1.35, 0, 'store247_counter');

        // Batched Uniformed 24/7 Cashier Clerk behind Counter (0 extra draw calls for body + shared clerkArmInst for hands-up!)
        const clerkZ = regZ - sp.doorSignDir * 0.95;
        const clerkYaw = sp.doorSignDir > 0 ? 0 : Math.PI;
        batch.add('archSolid', mats.archSolid, uBox, regX, 0.24 + 1.12, clerkZ, 0, clerkYaw, 0, 0.42, 0.62, 0.24, 0x16a34a, true, true);
        batch.add('archSolid', mats.archSolid, uBox, regX, 0.24 + 0.42, clerkZ, 0, clerkYaw, 0, 0.38, 0.78, 0.22, 0x1e293b, false, true);
        batch.add('archSolid', mats.archSolid, uSphere, regX, 0.24 + 1.58, clerkZ, 0, clerkYaw, 0, 0.32, 0.32, 0.32, 0xe0ac69, false, false);
        batch.add('archSolid', mats.archSolid, uCyl, regX, 0.24 + 1.70, clerkZ + sp.doorSignDir * 0.02, 0, clerkYaw, 0, 0.35, 0.10, 0.35, C.ronOrange, false, false);

        const armIdxL = si * 2;
        const armIdxR = si * 2 + 1;
        setDummyMatrix(clerkArmInst, armIdxL, regX - 0.28, 0.24 + 1.38, clerkZ, -0.12, clerkYaw, 0, 1, 1, 1);
        setDummyMatrix(clerkArmInst, armIdxR, regX + 0.28, 0.24 + 1.38, clerkZ, -0.12, clerkYaw, 0, 1, 1, 1);

        gasStations.push({
          ...sp,
          cx: sp.canopyX,
          cz: sp.canopyZ,
          pumps: stPumps,
          chainActive: false,
          exploded: false,
          smokeTimer: 0,
          smokeEmitAcc: 0,
          doorOpenFrac: 0,
          doorChimeCooldown: 0,
          doorLeafIdxL: 8 + si * 2,
          doorLeafIdxR: 9 + si * 2,
          register: {
            x: regX - 0.35,
            y: 1.38,
            z: regZ,
            robbedCooldown: 0,
            alarmTimer: 0,
          },
          clerk: { x: regX, y: 0.24 + 1.38, z: clerkZ, yaw: clerkYaw, armPitch: -0.12, armIdxL, armIdxR },
        });
      }

      clerkArmInst.instanceMatrix.needsUpdate = true;

      pumpIntactInst.instanceMatrix.needsUpdate = true;
      pumpScorchedInst.instanceMatrix.needsUpdate = true;
    }

    // Build Single InstancedMesh for ALL 12 Dynamic Glass Panels (8 PDM Breakable + 4 Sliding 24/7 Doors -> 1 Draw Call!)
    dynamicGlassInst = new THREE.InstancedMesh(uBox, mats.breakableGlass, 12);
    dynamicGlassInst.frustumCulled = false;
    for (let i = 0; i < 8; i++) {
      const gp = pdmState.glassPanels[i];
      setDummyMatrix(dynamicGlassInst, i, gp.x, gp.y, gp.z, 0, gp.ry, 0, gp.spanW, gp.spanH, 0.08);
    }
    for (let si = 0; si < gasStations.length; si++) {
      const gs = gasStations[si];
      setDummyMatrix(dynamicGlassInst, gs.doorLeafIdxL, gs.doorX - 0.88, 1.68, gs.doorZ, 0, 0, 0, 1.76, 2.85, 0.07);
      setDummyMatrix(dynamicGlassInst, gs.doorLeafIdxR, gs.doorX + 0.88, 1.68, gs.doorZ, 0, 0, 0, 1.76, 2.85, 0.07);
    }
    dynamicGlassInst.instanceMatrix.needsUpdate = true;
    commRoot.add(dynamicGlassInst);

    // ========================================================================
    // FEATURE 6: SEAMLESS WALK-IN GROUND-LEVEL "AMMU-NATION" STORE
    //            At (186, +12), Footprint X in [181.6, 191.6], Z in [3.5, 20.5]
    //            Front Doorway at (191.6, 0.24, 12.0) facing X = +200 Power Street!
    // ========================================================================
    {
      const minX = 181.6, maxX = 191.6, minZ = 3.5, maxZ = 20.5;
      const cx = 186.6, cz = 12.0, w = 10.0, d = 17.0, h = 5.4;

      // Concrete Tactical Floor (y = 0.24m) & Roof Slab
      batch.add('marble', mats.marble, uBox, cx, 0.125, cz, 0, 0, 0, w + 0.6, 0.25, d + 0.6, 0x94a3b8, false, true);
      batch.add('archSolid', mats.archSolid, uBox, cx, h + 0.32, cz, 0, 0, 0, w + 0.8, 0.65, d + 0.8, C.anthracite, true, true);
      // Patriotic Red, White & Blue Striped Upper Parapet Crown!
      batch.add('archSolid', mats.archSolid, uBox, cx, h + 0.82, cz, 0, 0, 0, w + 1.0, 0.36, d + 1.0, C.crimson, false, true);
      batch.add('archSolid', mats.archSolid, uBox, cx, h + 1.15, cz, 0, 0, 0, w + 1.1, 0.30, d + 1.1, C.white, false, true);
      batch.add('archSolid', mats.archSolid, uBox, cx, h + 1.45, cz, 0, 0, 0, w + 1.2, 0.30, d + 1.2, C.ammuBlue, false, true);
      registerAABB(minX - 0.2, maxX + 0.2, minZ - 0.2, maxZ + 0.2, h + 1.7, h - 0.1, 'ammu_ground_roof');

      // Hollow Perimeter Walls: North (Z=3.5), South (Z=20.5), West Bullet-Trap Rear Wall (X=181.6),
      // and East Front Patriotic Facade (X=191.6) with 3.8m Open Walk-In Doorway Z in [10.1, 13.9]!
      batch.add('archSolid', mats.archSolid, uBox, cx, h * 0.5, minZ, 0, 0, 0, w, h, 0.38, C.limestone, true, true);
      batch.add('archSolid', mats.archSolid, uBox, cx, h * 0.5, maxZ, 0, 0, 0, w, h, 0.38, C.limestone, true, true);
      batch.add('archSolid', mats.archSolid, uBox, minX, h * 0.5, cz, 0, 0, 0, 0.42, h, d, C.slate, true, true);
      registerAABB(minX, maxX, minZ - 0.22, minZ + 0.22, h, 0, 'ammu_wall_n');
      registerAABB(minX, maxX, maxZ - 0.22, maxZ + 0.22, h, 0, 'ammu_wall_s');
      registerAABB(minX - 0.24, minX + 0.24, minZ, maxZ, h, 0, 'ammu_wall_w');

      // East Front Facade flanking Open Doorway Z in [10.1, 13.9]
      batch.add('archSolid', mats.archSolid, uBox, maxX, h * 0.5, 6.8, 0, 0, 0, 0.36, h, 6.6, C.white, true, true);
      batch.add('archSolid', mats.archSolid, uBox, maxX, h * 0.5, 17.2, 0, 0, 0, 0.36, h, 6.6, C.white, true, true);
      batch.add('archSolid', mats.archSolid, uBox, maxX + 0.04, 1.1, 6.8, 0, 0, 0, 0.38, 1.7, 6.5, C.crimson, false, true);
      batch.add('archSolid', mats.archSolid, uBox, maxX + 0.04, 1.1, 17.2, 0, 0, 0, 0.38, 1.7, 6.5, C.crimson, false, true);
      batch.add('archSolid', mats.archSolid, uBox, maxX, 4.35, cz, 0, 0, 0, 0.38, 2.1, 3.8, C.ammuBlue, true, true);
      registerAABB(maxX - 0.22, maxX + 0.22, minZ, 10.1, h, 0, 'ammu_front_n');
      registerAABB(maxX - 0.22, maxX + 0.22, 13.9, maxZ, h, 0, 'ammu_front_s');
      registerAABB(maxX - 0.22, maxX + 0.22, 10.1, 13.9, h, 3.3, 'ammu_door_lintel');

      // Glowing Patriotic "AMMU-NATION" Neon Sign facing X = +200 Avenue!
      addSignPlane(maxX + 0.26, 4.85, cz, Math.PI * 0.5, 16.4, 1.65, atlasRowRect(7));
      batch.add('emissive', mats.emissive, uBox, cx, h - 0.08, 8.0, 0, 0, 0, 6.4, 0.07, 0.65, C.ledWarm, false, false);
      batch.add('emissive', mats.emissive, uBox, cx, h - 0.08, 16.0, 0, 0, 0, 6.4, 0.07, 0.65, C.ledWarm, false, false);

      // Glass Gun Display Counters at (187.4, 0.24, 7.6) & (187.4, 0.24, 16.4) with 3D Rifles/Pistols inside!
      for (const gz of [7.6, 16.4]) {
        batch.add('archSolid', mats.archSolid, uBox, 187.4, 0.62, gz, 0, 0, 0, 3.8, 0.76, 1.05, C.woodDark, true, true);
        batch.add('staticGlass', mats.staticGlass, uBox, 187.4, 1.14, gz, 0, 0, 0, 3.75, 0.30, 1.02, null, false, false);
        // 3D Weapon Models displayed inside glass case
        for (let wi = -1.2; wi <= 1.2; wi += 0.8) {
          batch.add('metal', mats.metal, uBox, 187.4 + wi, 1.04, gz, 0, 0.25, 0, 0.62, 0.08, 0.14, C.anthracite, false, false);
          batch.add('metal', mats.metal, uCyl, 187.4 + wi + 0.28, 1.05, gz + 0.06, 0, 0, Math.PI * 0.5, 0.04, 0.42, 0.04, C.gold, false, false);
        }
        registerAABB(185.4, 189.4, gz - 0.55, gz + 0.55, 1.32, 0, 'ammu_gun_counter');
      }

      // Wall Tactical Body-Armor Vest Racks & Weapon Pegboards on North & South Walls
      for (const wz of [minZ + 0.32, maxZ - 0.32]) {
        for (let ax = 184.5; ax <= 189.5; ax += 1.65) {
          batch.add('archSolid', mats.archSolid, uBox, ax, 1.95, wz, 0, 0, 0, 0.68, 0.82, 0.22, C.ammuBlue, false, false);
          batch.add('metal', mats.metal, uBox, ax, 2.95, wz, 0, 0, 0, 1.15, 0.14, 0.12, C.anthracite, false, false);
        }
      }

      // 3 Reactive Rear Shooting Targets at West Wall (x = 182.35, y = 1.55, z = 8.5 | 12.0 | 15.5)
      // Separated by low safety shooting-lane divider rail at x = 184.6
      batch.add('metal', mats.metal, uBox, 184.6, 0.75, cz, 0, 0, 0, 0.18, 0.95, 9.6, C.gold, true, true);
      const targetParts = [
        { geo: new THREE.BoxGeometry(0.10, 1.18, 0.88), matrix: makeMat4(0, 0.59, 0), color: new THREE.Color(C.crimson) },
        { geo: new THREE.CylinderGeometry(0.32, 0.32, 0.12, 16), matrix: makeMat4(0.04, 0.72, 0, 0, 0, Math.PI * 0.5), color: new THREE.Color(C.white) },
        { geo: new THREE.CylinderGeometry(0.14, 0.14, 0.14, 14), matrix: makeMat4(0.05, 0.72, 0, 0, 0, Math.PI * 0.5), color: new THREE.Color(C.gold) },
      ];
      ammuTargetInst = new THREE.InstancedMesh(mergeGeometries(targetParts), mats.archSolid, 3);
      const targetZs = [8.5, 12.0, 15.5];
      for (let ti = 0; ti < 3; ti++) {
        const tz = targetZs[ti];
        setDummyMatrix(ammuTargetInst, ti, 182.35, 1.05, tz, 0, 0, 0, 1, 1, 1);
        ammuTargets.push({ idx: ti, x: 182.35, y: 1.65, z: tz, flipAngle: 0, downTimer: 0 });
      }
      ammuTargetInst.instanceMatrix.needsUpdate = true;
      commRoot.add(ammuTargetInst);
    }

    // ========================================================================
    // FEATURE 7A: FAST-FOOD "UP-N-ATOM / BURGER SHOT" DRIVE-THRU AT (-80, +224)
    //             - Retro Diner at X in [-92.0, -81.8], Z in [236.8, 248.0]
    //             - Giant 3D Rotating Burger & Retro Rocket on Roof (Open Sky!)
    //             - U-Shaped Drive-Thru Lane passing (-80, +224) w/ Menu Speaker & Pickup Window
    // ========================================================================
    {
      const dinerX = -86.9, dinerZ = 242.4;

      // U-Shaped Paved Asphalt Drive-Thru Loop & Red/Yellow Checkered Curbs around (-80, +224)
      batch.add('archSolid', mats.archSolid, uBox, -85.4, 0.03, 234.5, 0, 0, 0, 15.6, 0.06, 29.0, C.asphalt, false, true);
      // Yellow Drive-Thru Lane Guide Stripes leading into (-80.2, +224) -> South -> West -> North Exit (-90.8, +222)
      for (let dz = 221.5; dz <= 234.5; dz += 3.2) {
        batch.add('emissive', mats.emissive, uBox, -80.2, 0.068, dz, 0, 0, 0, 0.35, 0.015, 1.4, C.burgerYellow, false, false);
        batch.add('emissive', mats.emissive, uBox, -90.8, 0.068, dz, 0, 0, 0, 0.35, 0.015, 1.4, C.burgerYellow, false, false);
      }

      // Drive-Thru Entrance Overhead Height-Clearance Arch & Menu Speaker right at (-80.0, +224.2)!
      batch.add('metal', mats.metal, uBox, -80.2, 4.35, 221.8, 0, 0, 0, 4.8, 0.55, 0.45, C.burgerRed, true, false);
      batch.add('metal', mats.metal, uCyl, -82.5, 2.2, 221.8, 0, 0, 0, 0.24, 4.4, 0.24, C.burgerYellow, true, false);
      batch.add('metal', mats.metal, uCyl, -77.9, 2.2, 221.8, 0, 0, 0, 0.24, 4.4, 0.24, C.burgerYellow, true, false);
      // Illuminated Menu Board & Intercom Speaker Post at (-77.9, 0.24, 225.0) facing the (-80, +224) car lane!
      batch.add('archSolid', mats.archSolid, uBox, -77.8, 1.75, 225.2, 0, 0.18, 0, 0.35, 2.4, 3.2, C.anthracite, true, true);
      addSignPlane(-78.02, 1.85, 225.2, -Math.PI * 0.5 + 0.18, 3.0, 1.9, atlasRowRect(9));
      // Intercom Speaker Pedestal right beside driver's window at (-78.2, 1.1, 223.2)
      batch.add('metal', mats.metal, uCyl, -78.15, 0.65, 223.0, 0, 0, 0, 0.16, 1.3, 0.16, C.burgerRed, true, false);
      batch.add('emissive', mats.emissive, uBox, -78.25, 1.32, 223.0, 0, 0, 0, 0.18, 0.32, 0.32, C.burgerYellow, false, false);

      // Retro Googie Burger Shot Diner Building (X in [-92.0, -81.8], Z in [236.8, 248.0], height = 5.4m)
      batch.add('archSolid', mats.archSolid, uBox, dinerX, 2.7, dinerZ, 0, 0, 0, 10.2, 5.4, 11.2, C.cream, true, true);
      batch.add('archSolid', mats.archSolid, uBox, dinerX, 5.15, dinerZ, 0, 0, 0, 11.4, 0.85, 12.4, C.burgerRed, true, true);
      batch.add('metal', mats.metal, uBox, dinerX, 5.65, dinerZ, 0, 0, 0, 11.8, 0.28, 12.8, C.burgerYellow, false, true);
      registerAABB(-92.0, -81.8, 236.8, 248.0, 5.8, 0, 'burger_shot_diner');

      // Glowing Pickup Window & Canopy on East/North Corner (-81.7, 1.6, 239.0) + Fascia Signs
      batch.add('staticGlass', mats.staticGlass, uBox, -81.72, 1.75, 239.2, 0, 0, 0, 0.14, 1.55, 2.4, null, false, false);
      batch.add('archSolid', mats.archSolid, uBox, -81.1, 2.65, 239.2, 0, 0, 0, 1.35, 0.24, 2.8, C.burgerRed, true, false);
      addSignPlane(dinerX, 5.15, 236.15, Math.PI, 10.8, 0.82, atlasRowRect(8));
      addSignPlane(-81.15, 5.15, dinerZ, Math.PI * 0.5, 11.6, 0.82, atlasRowRect(8));

      // GIANT 3D ROTATING BURGER & RETRO ATOMIC ROCKET ON THE ROOF ((-86.9, y = 5.8..13.5m, 243.6) — Open Sky!)
      batch.add('metal', mats.metal, uCyl, dinerX, 6.7, 243.6, 0, 0, 0, 0.52, 2.2, 0.52, C.chrome, true, false);
      burgerSignGroup = new THREE.Group();
      burgerSignGroup.position.set(dinerX, 8.65, 243.6);

      const burgerParts = [
        // Bottom Toasted Bun
        { geo: new THREE.CylinderGeometry(1.85, 1.55, 0.55, 24), matrix: makeMat4(0, -0.78, 0), color: new THREE.Color(0xd97706) },
        // Thick Seared Beef Patty
        { geo: new THREE.CylinderGeometry(1.96, 1.96, 0.48, 24), matrix: makeMat4(0, -0.28, 0), color: new THREE.Color(0x451a03) },
        // Melted Cheddar Cheese Square Slice (rotated 45 deg so corners drape out!)
        { geo: new THREE.BoxGeometry(2.95, 0.10, 2.95), matrix: makeMat4(0, 0.02, 0, 0, Math.PI * 0.25, 0), color: new THREE.Color(0xfacc15) },
        // Crisp Wavy Green Lettuce & Juicy Red Tomato Ring
        { geo: new THREE.TorusGeometry(1.75, 0.20, 8, 20), matrix: makeMat4(0, 0.16, 0, Math.PI * 0.5, 0, 0), color: new THREE.Color(0x22c55e) },
        { geo: new THREE.CylinderGeometry(1.72, 1.72, 0.18, 20), matrix: makeMat4(0, 0.30, 0), color: new THREE.Color(0xef4444) },
        // Domed Golden Sesame-Seed Top Bun
        { geo: new THREE.SphereGeometry(1.88, 24, 14, 0, TAU, 0, Math.PI * 0.52), matrix: makeMat4(0, 0.36, 0), color: new THREE.Color(0xeab308) },
      ];
      // Sprinkle 18 3D White Sesame Seeds onto Top Bun
      const seedGeo = new THREE.SphereGeometry(0.08, 6, 6);
      for (let si = 0; si < 18; si++) {
        const phi = 0.22 + (si % 3) * 0.32;
        const theta = (si / 18) * TAU * 2.3;
        const r = 1.88;
        burgerParts.push({
          geo: seedGeo,
          matrix: makeMat4(Math.sin(phi) * Math.cos(theta) * r, 0.36 + Math.cos(phi) * r, Math.sin(phi) * Math.sin(theta) * r, 0, theta, 0, 1.6, 0.6, 0.9),
          color: new THREE.Color(C.cream),
        });
      }
      // Angled Retro Chrome & Crimson Atomic Rocket soaring beside the Giant Burger!
      const rTilt = -0.52;
      burgerParts.push(
        { geo: new THREE.CylinderGeometry(0.32, 0.46, 3.6, 16), matrix: makeMat4(2.35, 1.35, 0, 0, 0, rTilt), color: new THREE.Color(C.chrome) },
        { geo: new THREE.ConeGeometry(0.32, 1.35, 16), matrix: makeMat4(2.35 + Math.sin(-rTilt) * 2.45, 1.35 + Math.cos(-rTilt) * 2.45, 0, 0, 0, rTilt), color: new THREE.Color(C.crimson) },
        { geo: new THREE.BoxGeometry(1.55, 0.75, 0.10), matrix: makeMat4(2.35 - Math.sin(-rTilt) * 1.35, 1.35 - Math.cos(-rTilt) * 1.35, 0, 0, 0, rTilt), color: new THREE.Color(C.crimson) },
        { geo: new THREE.BoxGeometry(0.10, 0.75, 1.55), matrix: makeMat4(2.35 - Math.sin(-rTilt) * 1.35, 1.35 - Math.cos(-rTilt) * 1.35, 0, 0, 0, rTilt), color: new THREE.Color(C.crimson) },
        { geo: new THREE.ConeGeometry(0.38, 1.1, 12), matrix: makeMat4(2.35 - Math.sin(-rTilt) * 2.25, 1.35 - Math.cos(-rTilt) * 2.25, 0, Math.PI, 0, -rTilt), color: new THREE.Color(0x38bdf8) }
      );

      const burgerRocketMesh = new THREE.Mesh(mergeGeometries(burgerParts), mats.archSolid);
      burgerRocketMesh.castShadow = true;
      burgerSignGroup.add(burgerRocketMesh);
      commRoot.add(burgerSignGroup);
    }

    // ========================================================================
    // FEATURE 7B: "PINK CAGE 2-STORY MOTEL" AT (0, +228)
    //             - U-Shaped 2-Story Pastel-Pink & Teal Motel (X in [-19.5, +19.5], Z in [214, 243.2])
    //             - Walkable Exterior Stairs (y = 0.24m -> 3.80m 2nd-floor U-walkway!)
    //             - Central Courtyard Swimming Pool & Flickering "MOTEL VACANCY" Neon Sign
    // ========================================================================
    {
      // Sunny Pastel Courtyard Deck (y = 0.24m, cleanly framing the freeway pier at (2.0, 232.0))
      batch.add('marble', mats.marble, uBox, 0.0, 0.12, 227.5, 0, 0, 0, 42.0, 0.24, 36.0, 0xf5efe6, false, true);

      // U-Shaped 2-Story Pastel-Pink Motel Wings (roof y = 7.4m, fits cleanly beneath y=10.45m South Viaduct!)
      //   West Wing:  X in [-19.5, -12.6], Z in [214.0, 243.2]
      //   East Wing:  X in [+12.6, +19.5], Z in [214.0, 243.2]
      //   South Wing: X in [-19.5, +19.5], Z in [236.4, 243.2] (South of (2, 232) pier!)
      batch.add('archSolid', mats.archSolid, uBox, -16.05, 3.7, 228.6, 0, 0, 0, 6.9, 7.4, 29.2, C.motelPink, true, true);
      batch.add('archSolid', mats.archSolid, uBox, 16.05, 3.7, 228.6, 0, 0, 0, 6.9, 7.4, 29.2, C.motelPink, true, true);
      batch.add('archSolid', mats.archSolid, uBox, 0.0, 3.7, 239.8, 0, 0, 0, 39.0, 7.4, 6.8, C.motelPink, true, true);
      // Tropical Teal Roof Trim Cornices
      batch.add('archSolid', mats.archSolid, uBox, -16.05, 7.52, 228.6, 0, 0, 0, 7.3, 0.36, 29.6, C.motelTeal, false, true);
      batch.add('archSolid', mats.archSolid, uBox, 16.05, 7.52, 228.6, 0, 0, 0, 7.3, 0.36, 29.6, C.motelTeal, false, true);
      batch.add('archSolid', mats.archSolid, uBox, 0.0, 7.52, 239.8, 0, 0, 0, 39.4, 0.36, 7.2, C.motelTeal, false, true);

      registerAABB(-19.5, -12.6, 214.0, 243.2, 7.7, 0, 'motel_west_wing');
      registerAABB(12.6, 19.5, 214.0, 243.2, 7.7, 0, 'motel_east_wing');
      registerAABB(-19.5, 19.5, 236.4, 243.2, 7.7, 0, 'motel_south_wing');

      // 2nd-Floor U-Shaped Cantilevered Exterior Walkway Slab (y = 3.80m) + Teal Iron Railings!
      batch.add('archSolid', mats.archSolid, uBox, -11.3, 3.68, 229.5, 0, 0, 0, 2.6, 0.24, 14.0, C.white, true, true);
      batch.add('archSolid', mats.archSolid, uBox, 11.3, 3.68, 229.5, 0, 0, 0, 2.6, 0.24, 14.0, C.white, true, true);
      batch.add('archSolid', mats.archSolid, uBox, 0.0, 3.68, 235.1, 0, 0, 0, 25.2, 0.24, 2.6, C.white, true, true);
      // Teal Safety Handrails on 2nd Floor
      batch.add('metal', mats.metal, uBox, -10.08, 4.32, 228.1, 0, 0, 0, 0.12, 0.95, 11.2, C.motelTeal, false, false);
      batch.add('metal', mats.metal, uBox, 10.08, 4.32, 228.1, 0, 0, 0, 0.12, 0.95, 11.2, C.motelTeal, false, false);
      batch.add('metal', mats.metal, uBox, 0.0, 4.32, 233.88, 0, 0, 0, 20.0, 0.95, 0.12, C.motelTeal, false, false);

      // Symmetrical Walkable Exterior Concrete & Teal Stairs (Z in [214.5, 222.5], y = 0.24m -> 3.80m!)
      for (const stairX of [-11.2, 11.2]) {
        const steps = 14;
        for (let s = 0; s < steps; s++) {
          const u1 = (s + 1) / steps;
          const sz = lerp(214.5, 222.5, (s + 0.5) / steps);
          const sy = lerp(0.24, 3.80, u1);
          batch.add('archSolid', mats.archSolid, uBox, stairX, sy * 0.5, sz, 0, 0, 0, 2.6, sy, 8.0 / steps + 0.05, C.white, true, true);
        }
        const railX = stairX < 0 ? -9.92 : 9.92;
        batch.add('metal', mats.metal, uBox, railX, 2.55, 218.5, -Math.atan2(3.56, 8.0), 0, 0, 0.10, 0.85, 8.9, C.motelTeal, false, false);
      }

      // Motel Room Doors & Warm Lit Windows on Ground Floor (y=0.24m) & 2nd Floor (y=3.80m)
      for (const floorBaseY of [0.24, 3.80]) {
        for (let rz = 224.0; rz <= 234.0; rz += 4.5) {
          // West wing doors facing East (+X)
          batch.add('archSolid', mats.archSolid, uBox, -12.55, floorBaseY + 1.05, rz, 0, 0, 0, 0.14, 2.05, 0.95, C.motelTeal, false, false);
          batch.add('emissive', mats.emissive, uBox, -12.55, floorBaseY + 1.35, rz + 1.45, 0, 0, 0, 0.12, 1.05, 1.15, C.ledWarm, false, false);
          // East wing doors facing West (-X)
          batch.add('archSolid', mats.archSolid, uBox, 12.55, floorBaseY + 1.05, rz, 0, 0, 0, 0.14, 2.05, 0.95, C.motelTeal, false, false);
          batch.add('emissive', mats.emissive, uBox, 12.55, floorBaseY + 1.35, rz + 1.45, 0, 0, 0, 0.12, 1.05, 1.15, C.ledWarm, false, false);
        }
        for (let rx = -9.0; rx <= 9.0; rx += 4.5) {
          // South wing doors facing North (-Z)
          batch.add('archSolid', mats.archSolid, uBox, rx, floorBaseY + 1.05, 236.35, 0, 0, 0, 0.95, 2.05, 0.14, C.motelTeal, false, false);
          batch.add('emissive', mats.emissive, uBox, rx + 1.45, floorBaseY + 1.35, 236.35, 0, 0, 0, 1.15, 1.05, 0.12, C.ledWarm, false, false);
        }
      }

      // Central Courtyard Swimming Pool (X in [-9.6, -1.6], Z in [218.8, 228.8] — right beside (0, +228)!)
      batch.add('marble', mats.marble, uBox, -5.6, 0.28, 223.8, 0, 0, 0, 8.8, 0.12, 10.8, C.white, false, true);
      batch.add('emissive', mats.emissive, uBox, -5.6, 0.345, 223.8, 0, 0, 0, 7.8, 0.04, 9.8, C.poolAqua, false, false);
      // Poolside Striped Loungers & Pastel Pink Parasol Umbrella
      for (const lz of [220.8, 223.8, 226.8]) {
        batch.add('archSolid', mats.archSolid, uBox, 0.2, 0.42, lz, 0, 0, 0, 1.85, 0.22, 0.82, C.white, true, true);
        batch.add('archSolid', mats.archSolid, uBox, 0.85, 0.65, lz, 0, 0, -0.45, 0.65, 0.12, 0.80, C.motelCoral, false, false);
      }
      batch.add('metal', mats.metal, uCyl, 0.2, 1.45, 222.3, 0, 0, 0, 0.08, 2.4, 0.08, C.white, true, false);
      batch.add('archSolid', mats.archSolid, uCone, 0.2, 2.68, 222.3, 0, 0, 0, 2.6, 0.65, 2.6, C.motelCoral, true, false);

      // Tall Retro Neon "PINK CAGE MOTEL • VACANCY" Sign at (-14.5, 0.24, 211.5) facing Z = +200 South Ave!
      batch.add('metal', mats.metal, uCyl, -14.5, 4.4, 211.5, 0, 0, 0, 0.34, 8.4, 0.34, C.motelTeal, true, true);
      batch.add('archSolid', mats.archSolid, uBox, -14.5, 6.8, 211.5, 0, 0, 0, 5.6, 2.8, 0.52, C.anthracite, true, false);
      addNeonShaderPanel(-14.5, 6.8, 211.20, Math.PI, 5.4, 2.6, 0.85, 0.3);
      addNeonShaderPanel(-14.5, 6.8, 211.80, 0, 5.4, 2.6, 0.85, 0.7);
      addSignPlane(-14.5, 4.75, 211.5, Math.PI, 5.4, 1.05, atlasRowRect(10), true);
      registerAABB(-15.2, -13.8, 211.0, 212.0, 8.6, 0, 'motel_neon_sign');
    }

    // ========================================================================
    // FEATURE 8: DESTRUCTIBLE STREET FURNITURE (InstancedMesh)
    //            - 14 Shatterable Glass Bus-Stop Shelters
    //            - 24 Destructible Royal-Blue US Mailboxes
    //            - 30 Intersection Street-Name Cross-Blade Signs
    // ========================================================================
    {
      // 8A) 30 Destructible/Breakable Intersection Street-Name Sign Posts (1 InstancedMesh Draw Call!)
      const avenues = [-120, -40, 40, 120, 200];
      const streets = [-200, -120, -40, 40, 120, 200];
      const signParts = [
        { geo: new THREE.CylinderGeometry(0.08, 0.09, 3.3, 8), matrix: makeMat4(0, 1.65, 0), color: new THREE.Color(C.silver) },
        { geo: new THREE.BoxGeometry(1.52, 0.34, 0.06), matrix: makeMat4(0, 3.16, 0), color: new THREE.Color(0x065f46) },
        { geo: new THREE.BoxGeometry(1.52, 0.34, 0.06), matrix: makeMat4(0, 2.82, 0, 0, Math.PI * 0.5, 0), color: new THREE.Color(0x065f46) },
      ];
      signPostInst = new THREE.InstancedMesh(mergeGeometries(signParts), mats.archSolid, 30);
      signPostInst.castShadow = false;
      signPostInst.frustumCulled = false;
      commRoot.add(signPostInst);

      let spIdx = 0;
      for (let ai = 0; ai < avenues.length; ai++) {
        const ax = avenues[ai];
        const hwX = ax === 40 ? 11 : 8;
        for (let si = 0; si < streets.length; si++) {
          const sz = streets[si];
          const px = ax + hwX + 2.25;
          const pz = sz - 10.25;
          setDummyMatrix(signPostInst, spIdx, px, 0.22, pz, 0, 0, 0, 1, 1, 1);
          signPosts.push({
            idx: spIdx,
            baseX: px, baseY: 0.22, baseZ: pz,
            x: px, y: 0.22, z: pz,
            rx: 0, ry: 0, rz: 0,
            vx: 0, vy: 0, vz: 0,
            avx: 0, avz: 0,
            broken: false,
            settled: false,
          });
          spIdx++;
        }
      }
      signPostInst.instanceMatrix.needsUpdate = true;

      // 8B) 14 Shatterable Glass Bus-Stop Shelters along Major Commercial Avenues!
      const busFrameParts = [
        { geo: new THREE.CylinderGeometry(0.07, 0.07, 2.55, 8), matrix: makeMat4(-1.65, 1.28, -0.55), color: new THREE.Color(C.anthracite) },
        { geo: new THREE.CylinderGeometry(0.07, 0.07, 2.55, 8), matrix: makeMat4(1.65, 1.28, -0.55), color: new THREE.Color(C.anthracite) },
        { geo: new THREE.BoxGeometry(3.85, 0.14, 1.65), matrix: makeMat4(0, 2.58, 0.05, -0.06, 0, 0), color: new THREE.Color(C.slate) },
        { geo: new THREE.BoxGeometry(2.35, 0.10, 0.44), matrix: makeMat4(-0.25, 0.52, -0.25), color: new THREE.Color(C.chrome) },
        { geo: new THREE.BoxGeometry(0.18, 2.25, 1.25), matrix: makeMat4(1.65, 1.25, 0.05), color: new THREE.Color(0x0284c7) },
      ];
      const busGlassParts = [
        { geo: new THREE.BoxGeometry(3.15, 2.15, 0.06), matrix: makeMat4(0, 1.32, -0.55) },
        { geo: new THREE.BoxGeometry(0.06, 2.15, 1.18), matrix: makeMat4(-1.65, 1.32, 0.04) },
      ];
      busFrameInst = new THREE.InstancedMesh(mergeGeometries(busFrameParts), mats.metal, 14);
      busGlassInst = new THREE.InstancedMesh(mergeGeometries(busGlassParts), mats.breakableGlass, 14);
      busFrameInst.castShadow = true;
      busFrameInst.frustumCulled = false;
      busGlassInst.frustumCulled = false;
      commRoot.add(busFrameInst);
      commRoot.add(busGlassInst);

      const shelterCoords = [
        [26.8, -148.0, Math.PI * 0.5],
        [53.2, -155.0, -Math.PI * 0.5],
        [26.8, -58.0, Math.PI * 0.5],
        [53.2, -66.0, -Math.PI * 0.5],
        [26.8, 68.0, Math.PI * 0.5],
        [53.2, 74.0, -Math.PI * 0.5],
        [53.2, 152.0, -Math.PI * 0.5],
        [-50.2, -155.0, -Math.PI * 0.5],
        [-29.8, -68.0, Math.PI * 0.5],
        [-29.8, 72.0, Math.PI * 0.5],
        [110.2, -72.0, -Math.PI * 0.5],
        [129.8, 152.0, Math.PI * 0.5],
        [-68.0, -190.2, Math.PI],
        [78.0, 190.2, 0],
      ];
      for (let bi = 0; bi < shelterCoords.length; bi++) {
        const [bx, bz, byaw] = shelterCoords[bi];
        setDummyMatrix(busFrameInst, bi, bx, 0.22, bz, 0, byaw, 0, 1, 1, 1);
        setDummyMatrix(busGlassInst, bi, bx, 0.22, bz, 0, byaw, 0, 1, 1, 1);
        busShelters.push({ idx: bi, x: bx, y: 0.22, z: bz, yaw: byaw, glassBroken: false });
      }
      busFrameInst.instanceMatrix.needsUpdate = true;
      busGlassInst.instanceMatrix.needsUpdate = true;

      // 8C) 24 Destructible Royal-Blue US Curved-Top Mailboxes!
      const mailboxParts = [
        { geo: new THREE.BoxGeometry(0.58, 0.88, 0.58), matrix: makeMat4(0, 0.52, 0), color: new THREE.Color(0x1d4ed8) },
        { geo: new THREE.CylinderGeometry(0.29, 0.29, 0.58, 12, 1, false, 0, Math.PI), matrix: makeMat4(0, 0.96, 0, 0, 0, Math.PI * 0.5), color: new THREE.Color(0x1d4ed8) },
        { geo: new THREE.BoxGeometry(0.62, 0.12, 0.62), matrix: makeMat4(0, 0.06, 0), color: new THREE.Color(0x1e3a8a) },
        { geo: new THREE.BoxGeometry(0.42, 0.10, 0.61), matrix: makeMat4(0, 0.82, 0), color: new THREE.Color(C.white) },
      ];
      mailboxInst = new THREE.InstancedMesh(mergeGeometries(mailboxParts), mats.archSolid, 24);
      mailboxInst.castShadow = true;
      mailboxInst.frustumCulled = false;
      commRoot.add(mailboxInst);

      const mbLocations = [];
      for (let ai = 0; ai < avenues.length; ai++) {
        for (let si = 0; si < streets.length; si++) {
          if ((ai + si) % 2 !== 0 && mbLocations.length < 24) {
            const ax = avenues[ai];
            const sz = streets[si];
            if (ax <= -120) continue; // Keep beach edge clear
            const hwX = ax === 40 ? 11 : 8;
            const mx = ax - hwX - 2.4;
            const mz = sz + 11.4;
            // Ensure strictly off all road surfaces (avenues & streets)
            let onRoad = false;
            for (const a2 of avenues) {
              if (Math.abs(mx - a2) <= (a2 === 40 ? 12.2 : 9.2)) onRoad = true;
            }
            for (const s2 of streets) {
              if (Math.abs(mz - s2) <= 9.2) onRoad = true;
            }
            if (!onRoad) {
              mbLocations.push([mx, mz, (ai * 1.57) % TAU]);
            }
          }
        }
      }
      mailboxInst.count = mbLocations.length;
      for (let mi = 0; mi < mbLocations.length; mi++) {
        const [mx, mz, myaw] = mbLocations[mi];
        setDummyMatrix(mailboxInst, mi, mx, 0.22, mz, 0, myaw, 0, 1, 1, 1);
        mailboxes.push({
          idx: mi,
          baseX: mx, baseY: 0.22, baseZ: mz, baseYaw: myaw,
          x: mx, y: 0.22, z: mz,
          rx: 0, ry: myaw, rz: 0,
          vx: 0, vy: 0, vz: 0,
          avx: 0, avz: 0,
          broken: false,
          settled: false,
        });
      }
      mailboxInst.instanceMatrix.needsUpdate = true;
    }

    // ========================================================================
    // POOLED FX INSTANCED MESHES (Spinning 3D Glass Shards, 18m Smoke, Cash Wads)
    // ========================================================================
    {
      const shardGeo = new THREE.ConeGeometry(0.32, 0.58, 3);
      shardInst = new THREE.InstancedMesh(shardGeo, mats.breakableGlass, MAX_SHARDS);
      shardInst.frustumCulled = false;
      for (let i = 0; i < MAX_SHARDS; i++) {
        shards.push({ active: false, age: 0, life: 1, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, avx: 0, avy: 0, avz: 0, scale: 0.3 });
        setDummyMatrix(shardInst, i, 0, -999, 0, 0, 0, 0, 0.001, 0.001, 0.001);
      }
      shardInst.instanceMatrix.needsUpdate = true;
      commRoot.add(shardInst);

      const plumeGeo = new THREE.DodecahedronGeometry(0.75, 1);
      const plumeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72, depthWrite: false });
      plumeInst = new THREE.InstancedMesh(plumeGeo, plumeMat, MAX_PLUMES);
      plumeInst.frustumCulled = false;
      for (let i = 0; i < MAX_PLUMES; i++) {
        plumes.push({ active: false, isFire: false, age: 0, life: 1, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, startScale: 1, endScale: 3 });
        setDummyMatrix(plumeInst, i, 0, -999, 0, 0, 0, 0, 0.001, 0.001, 0.001);
        _col.setHex(0x18191c);
        plumeInst.setColorAt(i, _col);
      }
      plumeInst.instanceMatrix.needsUpdate = true;
      commRoot.add(plumeInst);

      const cashGeo = new THREE.BoxGeometry(0.28, 0.06, 0.14);
      const cashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      cashWadInst = new THREE.InstancedMesh(cashGeo, cashMat, MAX_CASH_WADS);
      cashWadInst.frustumCulled = false;
      for (let i = 0; i < MAX_CASH_WADS; i++) {
        cashWads.push({ active: false, age: 0, life: 1, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, avx: 0, avy: 0 });
        setDummyMatrix(cashWadInst, i, 0, -999, 0, 0, 0, 0, 0.001, 0.001, 0.001);
        _col.setHex(0x4ade80);
        cashWadInst.setColorAt(i, _col);
      }
      cashWadInst.instanceMatrix.needsUpdate = true;
      commRoot.add(cashWadInst);
    }

    // Flush all static geometry buckets into ~7 merged meshes!
    batch.flush();
  }

  // ==========================================================================
  // 9. Road Graph Nodes/Edges & Minimap Polygons/Blips Population
  // ==========================================================================

  function buildRoadAndMinimapMetadata() {
    roadNodes.length = 0;
    roadEdges.length = 0;
    minimapPolys.length = 0;
    minimapBlips.length = 0;

    function addNode(x, z, roadWidth = 14) {
      const id = roadNodes.length;
      const n = { id, index: id, x, z, isBoulevard: false, roadWidth, neighbors: [], neighborIds: [], edges: [] };
      roadNodes.push(n);
      return n;
    }

    function addBidirectionalEdge(nA, nB, width = 14) {
      const len = Math.hypot(nB.x - nA.x, nB.z - nA.z);
      const e1 = { from: nA.id, to: nB.id, a: nA, b: nB, x1: nA.x, z1: nA.z, x2: nB.x, z2: nB.z, length: len, width, lanes: 2 };
      const e2 = { from: nB.id, to: nA.id, a: nB, b: nA, x1: nB.x, z1: nB.z, x2: nA.x, z2: nA.z, length: len, width, lanes: 2 };
      roadEdges.push(e1, e2);
      nA.neighbors.push(nB); nA.neighborIds.push(nB.id); nA.edges.push(e1);
      nB.neighbors.push(nA); nB.neighborIds.push(nA.id); nB.edges.push(e2);
    }

    // Drivable Rockford Plaza Central Underpass Arcade (connects Z=-200 Côn Lôn Tiên Sơn Blvd <-> Z=-120 Eclipse Blvd)
    const rpN = addNode(-80, -200, 14);
    const rpM = addNode(-80, -160, 14);
    const rpS = addNode(-80, -120, 14);
    addBidirectionalEdge(rpN, rpM, 14);
    addBidirectionalEdge(rpM, rpS, 14);

    // Commercial South Strip Service Loop (Burger Shot Drive-Thru & RON South Station & Pink Cage Motel)
    const bsAve = addNode(-80, 200, 12);
    const bsLane = addNode(-80, 224, 12);
    const ronS = addNode(-68, 222, 12);
    const ronSAve = addNode(-68, 200, 12);
    addBidirectionalEdge(bsAve, bsLane, 12);
    addBidirectionalEdge(bsLane, ronS, 12);
    addBidirectionalEdge(ronS, ronSAve, 12);

    const motelAve = addNode(0, 200, 12);
    const motelCourt = addNode(0, 224, 12);
    addBidirectionalEdge(motelAve, motelCourt, 12);

    const ronNAve = addNode(76, -200, 12);
    const ronNFore = addNode(76, -222, 12);
    addBidirectionalEdge(ronNAve, ronNFore, 12);

    function pushPoly(id, label, minX, maxX, minZ, maxZ, fill, stroke) {
      minimapPolys.push({
        id,
        label,
        type: 'commercial',
        fill,
        color: fill,
        stroke,
        lineWidth: 1.3,
        minX, maxX, minZ, maxZ,
        x: minX, z: minZ, w: maxX - minX, h: maxZ - minZ,
        points: [[minX, minZ], [maxX, minZ], [maxX, maxZ], [minX, maxZ]],
      });
    }

    pushPoly('pdm_showroom', 'Premium Deluxe Motorsport', -24, 24, 136, 178, '#17324d', '#38bdf8');
    pushPoly('doppler_theater', 'Oriental / Doppler Theater', -24, 24, -182, -142, '#3b1c24', '#f5c542');
    pushPoly('rockford_plaza_w', 'Rockford Plaza West', -106, -88, -186, -134, '#272238', '#c084fc');
    pushPoly('rockford_plaza_e', 'Rockford Plaza East', -72, -54, -186, -134, '#272238', '#c084fc');
    pushPoly('rockford_skybridge', 'Rockford Skybridge', -88, -72, -166.5, -153.5, '#3b3355', '#fde047');
    pushPoly('ron_gas_north', 'RON Gas & 24/7 North', 68, 84, -229.3, -218, '#431407', '#f97316');
    pushPoly('ron_gas_south', 'RON Gas & 24/7 South', -76.5, -51.5, 219, 246.5, '#431407', '#f97316');
    pushPoly('ammu_ground', 'Thần Binh Các Walk-In', 181.6, 191.6, 3.5, 20.5, '#3f1518', '#ef4444');
    pushPoly('burger_shot', 'Burger Shot Drive-Thru', -92, -78, 221, 248, '#451a03', '#facc15');
    pushPoly('pink_cage_motel', 'Pink Cage Motel', -19.5, 19.5, 214, 243.2, '#4a153b', '#f472b6');

    minimapBlips.push(
      { id: 'pdm_showroom', x: 0, z: 158, label: 'Showroom Siêu Xe PDM', short: 'PDM', icon: 'car', color: '#38bdf8', stroke: '#ffffff', radius: 4.8 },
      { id: 'doppler_theater', x: 18, z: -162, label: 'Rạp Chiếu Phim Oriental / Doppler', short: 'CINEMA', icon: 'star', color: '#f5c542', stroke: '#ffffff', radius: 4.4 },
      { id: 'rockford_plaza', x: -80, z: -160, label: 'Trung Tâm Thương Mại Rockford Plaza', short: 'PLAZA', icon: 'mall', color: '#c084fc', stroke: '#ffffff', radius: 4.6 },
      { id: 'ron_gas_north', x: 76, z: -222, label: 'Trạm Xăng RON & 24/7 (Bắc)', short: 'RON', icon: 'gas', color: '#f97316', stroke: '#ffffff', radius: 4.5 },
      { id: 'ron_gas_south', x: -76, z: 222, label: 'Trạm Xăng RON & 24/7 (Nam)', short: 'RON', icon: 'gas', color: '#f97316', stroke: '#ffffff', radius: 4.5 },
      { id: 'ammu_ground', x: 186, z: 12, label: 'Thần Binh Các Liên Thông', short: 'AMMU', icon: 'gun', color: '#ef4444', stroke: '#ffffff', radius: 4.4 },
      { id: 'burger_shot', x: -80, z: 224, label: 'Burger Shot Drive-Thru', short: 'BURGER', icon: 'food', color: '#facc15', stroke: '#ef4444', radius: 4.5 },
      { id: 'pink_cage_motel', x: 0, z: 228, label: 'Pink Cage Motel', short: 'MOTEL', icon: 'motel', color: '#f472b6', stroke: '#2dd4bf', radius: 4.5 }
    );
  }

  // ==========================================================================
  // 10. Interactive Triggers: PDM Glass Shatter, RON Chain Blast, 24/7 Robbery
  // ==========================================================================

  function ensurePDMTurntableSupercars() {
    if (!activeCtx?.vehicles || typeof activeCtx.vehicles.spawnVehicle !== 'function') return;
    for (let i = 0; i < pdmState.turntables.length; i++) {
      const tt = pdmState.turntables[i];
      if (tt.car && !tt.car.destroyed && (activeCtx.vehicles.list || []).includes(tt.car)) continue;

      // Avoid duplicate spawn if a car is already sitting right on the turntable
      const nearExisting = (activeCtx.vehicles.list || []).find(
        (v) => v && !v.destroyed && Math.hypot((v.x || 0) - tt.x, (v.z || 0) - tt.z) < 3.4
      );
      if (nearExisting) {
        tt.car = nearExisting;
        continue;
      }

      const spawned = activeCtx.vehicles.spawnVehicle(tt.vehicleType, tt.x, 0.39, tt.z, tt.initYaw, {
        isParked: true,
        isHero: true,
        color: tt.color,
        plate: tt.plate,
      });
      if (spawned) {
        tt.car = spawned;
      }
    }
  }

  function shatterPDMGlassPanel(panel, impVx = 8, impVz = 0, byPlayer = false) {
    if (!panel || panel.broken) return false;
    panel.broken = true;
    setAABBEnabled(panel.aabb, false);
    if (dynamicGlassInst) {
      setDummyMatrix(dynamicGlassInst, panel.idx, panel.x, -999, panel.z, 0, 0, 0, 0.001, 0.001, 0.001);
      dynamicGlassInst.instanceMatrix.needsUpdate = true;
    }
    // Exactly 35 spinning 3D glass shards + glass-crash SFX!
    emitGlassShards(panel.x, panel.y, panel.z, panel.spanW, panel.spanH, panel.isAlongZ, impVx, impVz, 35);
    playGlassCrashSFX(1.0);
    if (byPlayer) {
      activeCtx?.engine?.addShake?.(0.32);
    }
    return true;
  }

  function shatterBusShelter(bs, impVx = 6, impVz = 6) {
    if (!bs || bs.glassBroken) return false;
    bs.glassBroken = true;
    if (busGlassInst) {
      setDummyMatrix(busGlassInst, bs.idx, bs.x, -999, bs.z, 0, 0, 0, 0.001, 0.001, 0.001);
      busGlassInst.instanceMatrix.needsUpdate = true;
    }
    emitGlassShards(bs.x, 1.4, bs.z, 3.0, 2.0, false, impVx, impVz, 22);
    playGlassCrashSFX(0.75);
    return true;
  }

  function triggerMailboxImpact(mb, impVx, impVz, spd) {
    if (!mb || mb.broken) return false;
    mb.broken = true;
    mb.settled = false;
    const len = Math.hypot(impVx, impVz) || 1;
    const nx = impVx / len;
    const nz = impVz / len;
    const launch = clamp(spd * 0.85, 6.5, 22.0);
    mb.vx = nx * launch + (Math.random() - 0.5) * 2.0;
    mb.vz = nz * launch + (Math.random() - 0.5) * 2.0;
    mb.vy = 3.2 + Math.min(4.5, spd * 0.16);
    mb.avx = nz * 5.2;
    mb.avz = -nx * 5.2;
    emitFlyingBills(mb.baseX, 0.8, mb.baseZ, 8, true);
    activeCtx?.audio?.playCrash?.(0.3);
    return true;
  }

  // STRICT PLAYER-ONLY Chain-Reaction Mega Explosion across all 4 pumps of a RON Station!
  function triggerGasStationChainExplosion(station, hitPumpIndex, c = activeCtx) {
    if (!station || station.chainActive || station.exploded) return false;
    station.chainActive = true;
    station.exploded = true;
    station.smokeTimer = 22.0;
    station.smokeEmitAcc = 0;

    // Order pumps by distance from the struck pump so they detonate in a dramatic 4-pump chain reaction!
    const originPump = station.pumps[clamp(hitPumpIndex, 0, station.pumps.length - 1)];
    const ordered = station.pumps
      .slice()
      .sort((a, b) => Math.hypot(a.x - originPump.x, a.z - originPump.z) - Math.hypot(b.x - originPump.x, b.z - originPump.z));

    const delays = [0.001, 0.22, 0.46, 0.72];
    for (let i = 0; i < ordered.length; i++) {
      ordered[i].detonateTimer = delays[i] ?? (i * 0.24);
    }

    // Grant +2★ Wanted strictly once for the player's RON sabotage!
    escalatePlayerWantedPlusTwo('ron_gas_station', originPump.x, originPump.z, c);
    c?.ui?.showNotification?.('💥 NỔ DÂY CHUYỀN TRẠM XĂNG RON! Cảnh sát Thiên Đình Chấp Pháp phát lệnh truy nã +2★!', 4.2);
    return true;
  }

  function detonateSinglePumpVisual(pump, c = activeCtx) {
    if (!pump || pump.exploded) return;
    pump.exploded = true;
    pump.detonateTimer = -1;
    setAABBEnabled(pump.aabb, false);

    if (pumpIntactInst && pumpScorchedInst) {
      setDummyMatrix(pumpIntactInst, pump.idx, pump.x, -999, pump.z, 0, 0, 0, 0.001, 0.001, 0.001);
      setDummyMatrix(pumpScorchedInst, pump.idx, pump.x, pump.y, pump.z, 0, 0, 0, 1, 1, 1);
      pumpIntactInst.instanceMatrix.needsUpdate = true;
      pumpScorchedInst.instanceMatrix.needsUpdate = true;
    }

    // Spawn colossal player-attributed fireball explosion!
    c?.characters?.spawnExplosion?.(pump.x, pump.y + 0.85, pump.z, 1.95, c, true);
    for (let k = 0; k < 5; k++) {
      emitSmokePlumePuff(pump.x, pump.y + 0.9, pump.z, k < 2);
    }
  }

  function robConvenienceStoreRegister(station, c = activeCtx) {
    if (!station || station.register.robbedCooldown > 0) return false;
    const reg = station.register;
    reg.robbedCooldown = 75.0;
    reg.alarmTimer = 18.0;

    // Burst $650 - $1,400 cash wads + alarm bell + +2★ Wanted!
    const lootAmount = 650 + Math.floor(Math.random() * 751);
    addPlayerCashSafe(lootAmount, c);
    emitFlyingBills(reg.x, reg.y + 0.12, reg.z, 20, false);
    playStoreRobberyAlarmSFX();
    escalatePlayerWantedPlusTwo('store_247', reg.x, reg.z, c);

    c?.ui?.showSubtitle?.(
      `Thu ngân 24/7: "Đừng bắn!! Tiền mặt trong két đó ($${lootAmount.toLocaleString('en-US')}), lấy hết đi!!"`,
      4.2
    );
    c?.ui?.showNotification?.(
      `💰 Cướp Quầy Thu Ngân 24/7 thành công: +$${lootAmount.toLocaleString('en-US')}! Chuông báo động hú vang (+2★)!`,
      4.0
    );
    return true;
  }

  // ==========================================================================
  // 11. Required Public API: getElevation(x, z, currentY)
  // ==========================================================================

  function getElevation(x, z, currentY) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    const hasRefY = typeof currentY === 'number' && Number.isFinite(currentY);

    // 1) ROCKFORD PLAZA GALLERIA (X in [-107, -53], Z in [-191.5, -128.5])
    if (x >= -107.0 && x <= -53.0 && z >= -191.5 && z <= -128.5) {
      // 1A. 4 Wide Grand Stone Staircase Stunt Ramps (width 7.4m, y = 0.22m -> 8.50m)
      const onStairBand = (x >= -95.4 && x <= -87.8) || (x >= -72.2 && x <= -64.6);
      if (onStairBand) {
        if (z >= -188.0 && z <= -170.0) {
          const u = (z - (-188.0)) / 18.0;
          const rampY = lerp(0.22, 8.50, smoothRampToe(u));
          if (!hasRefY || currentY >= rampY - 2.8) return rampY;
        } else if (z >= -150.0 && z <= -132.0) {
          const u = (-132.0 - z) / 18.0;
          const rampY = lerp(0.22, 8.50, smoothRampToe(u));
          if (!hasRefY || currentY >= rampY - 2.8) return rampY;
        } else if (z > -170.0 && z < -150.0) {
          // Upper West & East Promenade Terraces at y = 8.50m
          if (hasRefY && currentY >= 5.2) return 8.50;
        }
      }

      // 1B. High Glass Skybridge (X in [-88.0, -72.0], Z in [-166.5, -153.5], y = 8.50m)
      if (x >= -88.0 && x <= -72.0 && z >= -166.5 && z <= -153.5) {
        if (hasRefY && currentY >= 5.4) return 8.50;
        return 0.04; // Open drivable Underpass Arcade directly underneath!
      }

      // 1C. Open Drivable North-South Central Underpass Arcade (X in [-87.6, -72.4])
      if (x >= -87.6 && x <= -72.4) {
        return 0.04;
      }
      return 0.22;
    }

    // 2) PREMIUM DELUXE MOTORSPORT SHOWROOM (X in [-25.0, +25.5], Z in [134.5, 179.0])
    if (x >= -25.0 && x <= 25.5 && z >= 134.5 && z <= 179.0) {
      for (let i = 0; i < pdmState.turntables.length; i++) {
        const tt = pdmState.turntables[i];
        const d = Math.hypot(x - tt.x, z - tt.z);
        if (d <= 4.35) {
          if (d <= 3.95) return 0.38;
          return lerp(0.38, 0.24, (d - 3.95) / 0.40);
        }
      }
      if (x >= -24.2 && x <= 24.2 && z >= 135.8 && z <= 178.2) {
        return 0.24;
      }
      return 0.23;
    }

    // 3) ORIENTAL / DOPPLER THEATER FORECOURT (X in [-24.5, +25.5], Z in [-186.5, -141.5])
    if (x >= -24.5 && x <= 25.5 && z >= -186.5 && z <= -141.5) {
      return 0.24;
    }

    // 4) STATION NORTH (RON + 24/7 at (76, -222): X in [66.2, 85.8], Z in [-229.4, -208.2])
    if (x >= 66.2 && x <= 85.8 && z >= -229.4 && z <= -208.2) {
      // Let cars high up on the 10.1m Observatory Viaduct (y >= 4.5m) keep their bridge altitude!
      if (hasRefY && currentY >= 4.5) return null;
      if (z >= -210.4) {
        return lerp(0.04, 0.24, clamp((-208.2 - z) / 2.2, 0, 1));
      }
      return 0.24;
    }

    // 5) BURGER SHOT DRIVE-THRU (-80, +224) & STATION SOUTH (-76, +222)
    //    Spanning X in [-93.5, -50.5], Z in [208.2, 249.5]
    if (x >= -93.5 && x <= -50.5 && z >= 208.2 && z <= 249.5) {
      // Yield to 12.5m South Perimeter Viaduct & upper South Ramp when entity is elevated!
      if (hasRefY && currentY >= 5.5) return null;
      // Yield to low western half of South On/Off-Ramp #1 (X < -68, Z in [209.2, 220.2])
      if (x < -68.0 && z >= 209.2 && z <= 220.2) return null;

      // Burger Shot U-Shaped Drive-Thru Asphalt Lane (X in [-92.5, -77.6], Z in [220.3, 236.6])
      if (x >= -92.5 && x <= -77.6 && z >= 220.3 && z <= 236.6) {
        return 0.06;
      }
      // Station South 24/7 Convenience Store Floor
      if (x >= -67.7 && x <= -51.3 && z >= 235.3 && z <= 246.7) {
        return 0.24;
      }
      return 0.22;
    }

    // 6) PINK CAGE 2-STORY MOTEL AT (0, +228) (X in [-20.5, +20.5], Z in [209.0, 244.0])
    if (x >= -20.5 && x <= 20.5 && z >= 209.0 && z <= 244.0) {
      // Yield to 12.5m South Viaduct overhead at Z = 232 when entity is high up!
      if (hasRefY && currentY >= 7.8) return null;

      // Walkable Exterior Stairs (West X in [-12.6, -9.8], East X in [9.8, 12.6], Z in [214.5, 222.5])
      if (((x >= -12.6 && x <= -9.8) || (x >= 9.8 && x <= 12.6)) && z >= 214.5 && z <= 222.5) {
        const stairY = lerp(0.24, 3.80, clamp((z - 214.5) / 8.0, 0, 1));
        if (!hasRefY || currentY >= stairY - 2.2) return stairY;
      }

      // 2nd-Floor U-Shaped Exterior Walkway at y = 3.80m!
      const onUpperWalkway =
        (x >= -12.7 && x <= -9.9 && z >= 222.5 && z <= 236.5) ||
        (x >= 9.9 && x <= 12.7 && z >= 222.5 && z <= 236.5) ||
        (x >= -12.7 && x <= 12.7 && z >= 233.7 && z <= 236.5);
      if (onUpperWalkway && hasRefY && currentY >= 2.15) {
        return 3.80;
      }

      return 0.24;
    }

    // 7) SEAMLESS WALK-IN GROUND AMMU-NATION AT (186, +12) (X in [181.4, 192.0], Z in [3.3, 20.7])
    if (x >= 181.4 && x <= 192.0 && z >= 3.3 && z <= 20.7) {
      return 0.24;
    }

    return null;
  }

  // ==========================================================================
  // 12. Required Public API: onProjectileHit(x, y, z, isPlayer, ctx)
  // ==========================================================================

  function onProjectileHit(x, y, z, isPlayer = false, ctxArg = null) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return false;
    const c = ctxArg && typeof ctxArg === 'object' ? ctxArg : activeCtx;
    const byPlayer = Boolean(isPlayer === true || (isPlayer && typeof isPlayer === 'object' && isPlayer === c?.player));

    // 1) Check PDM Showroom 8 Breakable Glass Curtain-Wall Panels
    if (x >= -25.5 && x <= 26.0 && z >= 134.5 && z <= 179.0 && y >= 0.1 && y <= 6.8) {
      for (let i = 0; i < pdmState.glassPanels.length; i++) {
        const gp = pdmState.glassPanels[i];
        if (gp.broken) continue;
        const dx = Math.abs(x - gp.x);
        const dz = Math.abs(z - gp.z);
        const hitPanel = gp.isAlongZ
          ? (dx <= 1.35 && dz <= gp.spanW * 0.5 + 0.45)
          : (dz <= 1.35 && dx <= gp.spanW * 0.5 + 0.45);
        if (hitPanel) {
          const outVx = gp.isAlongZ ? (x <= gp.x ? 9.5 : -9.5) : 0;
          const outVz = gp.isAlongZ ? 0 : (z >= gp.z ? -9.5 : 9.5);
          return shatterPDMGlassPanel(gp, outVx, outVz, byPlayer);
        }
      }
    }

    // 2) Check RON Fuel Pumps (STRICT PLAYER ATTRIBUTION: ONLY when byPlayer === true!) & 24/7 Cash Registers!
    for (let si = 0; si < gasStations.length; si++) {
      const st = gasStations[si];

      if (byPlayer && !st.exploded && y >= -0.2 && y <= 3.6) {
        for (let pi = 0; pi < st.pumps.length; pi++) {
          const pump = st.pumps[pi];
          if (!pump.exploded && Math.hypot(x - pump.x, z - pump.z) <= 2.35) {
            return triggerGasStationChainExplosion(st, pi, c);
          }
        }
      }

      // Shootable 24/7 Cash Register (strictly by player!)
      if (byPlayer && st.register.robbedCooldown <= 0 && y >= 0.5 && y <= 2.4) {
        if (Math.hypot(x - st.register.x, z - st.register.z) <= 1.65) {
          return robConvenienceStoreRegister(st, c);
        }
      }
    }

    // 3) Check 3 Rear Shooting Targets inside Ground-Level Thần Binh Các (182.35, 1.65, 8.5 | 12.0 | 15.5)
    if (x >= 181.2 && x <= 184.2 && z >= 7.0 && z <= 17.0 && y >= 0.6 && y <= 2.6) {
      for (let ti = 0; ti < ammuTargets.length; ti++) {
        const tgt = ammuTargets[ti];
        if (tgt.downTimer <= 0 && Math.hypot(x - tgt.x, z - tgt.z) <= 1.05) {
          tgt.downTimer = 1.85;
          playSteelTargetClangSFX();
          if (byPlayer) {
            c?.ui?.triggerHitmarker?.(true);
            c?.ui?.showNotification?.('🎯 Hồng Tâm Thần Binh Các! (+100 Điểm Xạ Thủ)', 1.8);
          }
          return true;
        }
      }
    }

    // 4) Check Shatterable Glass Bus-Stop Shelters
    if (y >= 0.1 && y <= 2.9) {
      for (let bi = 0; bi < busShelters.length; bi++) {
        const bs = busShelters[bi];
        if (!bs.glassBroken && Math.hypot(x - bs.x, z - bs.z) <= 2.25) {
          return shatterBusShelter(bs, (x - bs.x) * 4, (z - bs.z) * 4);
        }
      }
    }

    return false;
  }

  // ==========================================================================
  // 13. Per-Frame Real-Time Update Loop: Animations, Physics & Shop Prompts
  // ==========================================================================

  function init(ctxArg) {
    if (ctxArg && typeof ctxArg === 'object') activeCtx = ctxArg;
    if (initialized) return api;

    const scene = activeCtx?.engine?.scene || activeCtx?.scene || null;
    if (!scene) return api;

    initialized = true;
    scene.add(commRoot);

    if (activeCtx?.world) {
      clearReplacedWorldParcels(activeCtx.world);
    }

    buildAllCommercialDistricts(scene);
    buildRoadAndMinimapMetadata();
    ensurePDMTurntableSupercars();

    if (activeCtx) activeCtx.mapCommercial = api;
    return api;
  }

  function update(dtArg = 0.016, ctxArg = null) {
    if (ctxArg && typeof ctxArg === 'object') activeCtx = ctxArg;
    if (!initialized && (activeCtx?.engine?.scene || activeCtx?.scene)) {
      init(activeCtx);
    }
    if (!initialized) return;

    const dt = clamp(Number(dtArg) || 0.016, 0.0005, 0.1);
    localElapsed += dt;

    const p = activeCtx?.player;
    const px = Number.isFinite(p?.x) ? p.x : 26;
    const pz = Number.isFinite(p?.z) ? p.z : 28;
    const pCar = p?.inCar && typeof p.inCar === 'object' ? p.inCar : null;

    // 1) Update GLSL Neon / Marquee Uniforms & Sweep 4 Sky-Piercing 165m Night Laser Beams!
    const weather = activeCtx?.engine?.timeWeather || 'BRIGHT_DAY';
    const isNightish = weather === 'NEON_NIGHT' || weather === 'SUNSET_GOLD' || weather === 'OVERCAST_RAIN';
    neonShaderUniforms.uTime.value = localElapsed;
    neonShaderUniforms.uNightBoost.value = weather === 'NEON_NIGHT' ? 1.38 : isNightish ? 1.16 : 0.92;
    laserUniforms.uTime.value = localElapsed;
    laserUniforms.uOpacityScale.value = weather === 'NEON_NIGHT' ? 0.92 : isNightish ? 0.76 : 0.42;

    if (laserBeamInst && pdmState.laserAnchors) {
      for (let li = 0; li < 4; li++) {
        const la = pdmState.laserAnchors[li];
        const tiltX = Math.sin(localElapsed * (0.68 + li * 0.14) + li * 1.57) * 0.28;
        const tiltZ = Math.cos(localElapsed * (0.54 + li * 0.11) + li * 2.1) * 0.28;
        setDummyMatrix(laserBeamInst, li, la.x, 0.35, la.z, tiltX, 0, tiltZ, 1, 1, 1);
      }
      laserBeamInst.instanceMatrix.needsUpdate = true;
    }

    // 2) Rotate Burger Shot Rooftop Giant 3D Burger & Retro Rocket!
    if (burgerSignGroup) {
      burgerSignGroup.rotation.y = (localElapsed * 0.85) % TAU;
    }

    // 3) Rotate PDM Illuminated Turntables + Sync Parked Showroom Supercars + Auto-Repair Glass > 150m!
    ensurePDMTurntableSupercars();
    if (pdmState.turntableInst) {
      for (let ti = 0; ti < pdmState.turntables.length; ti++) {
        const tt = pdmState.turntables[ti];
        tt.angle = (tt.angle + tt.omega * dt) % TAU;
        setDummyMatrix(pdmState.turntableInst, ti, tt.x, 0.31, tt.z, 0, tt.angle, 0, 1, 1, 1);

        const c = tt.car;
        if (
          c &&
          !c.destroyed &&
          c !== pCar &&
          !c.isPlayerDriving &&
          !c.driver &&
          Math.hypot((c.x || 0) - tt.x, (c.z || 0) - tt.z) < 2.9 &&
          Math.hypot(c.vx || 0, c.vz || 0) < 0.75
        ) {
          c.yaw = wrapAngle((c.yaw || 0) + tt.omega * dt);
          if (c.mesh) c.mesh.rotation.y = c.yaw;
        }
      }
      pdmState.turntableInst.instanceMatrix.needsUpdate = true;
    }

    const distToPDM = Math.hypot(px - 0, pz - 157);
    if (distToPDM > 150) {
      let restoredAny = false;
      for (let i = 0; i < pdmState.glassPanels.length; i++) {
        const gp = pdmState.glassPanels[i];
        if (gp.broken) {
          gp.broken = false;
          setAABBEnabled(gp.aabb, true);
          setDummyMatrix(dynamicGlassInst, gp.idx, gp.x, gp.y, gp.z, 0, gp.ry, 0, gp.spanW, gp.spanH, 0.08);
          restoredAny = true;
        }
      }
      if (restoredAny && dynamicGlassInst) {
        dynamicGlassInst.instanceMatrix.needsUpdate = true;
      }
    }

    // 4) Vehicle Collision Checks:
    //    - PDM Breakable Glass Curtain Wall (ANY car speed > 5 m/s smashes straight through!)
    //    - RON Fuel Pumps (STRICTLY player's car: car === ctx.player.inCar && Math.abs(car.speed) > 8.5!)
    //    - Bus-Stop Glass Shelters & Destructible Mailboxes
    const cars = activeCtx?.vehicles?.list;
    if (Array.isArray(cars) && cars.length > 0) {
      for (let ci = 0; ci < cars.length; ci++) {
        const car = cars[ci];
        if (!car || car.isHeli || car.destroyed || !Number.isFinite(car.x) || !Number.isFinite(car.z)) continue;
        if ((car.y || 0) > 5.0) continue;

        const vMag = Math.hypot(car.vx || 0, car.vz || 0);
        const absSpd = Math.max(Math.abs(car.speed || 0), vMag);
        if (absSpd <= 5.0) continue;

        const yaw = car.yaw || 0;
        const fx = Math.sin(yaw);
        const fz = Math.cos(yaw);
        const moveVx = vMag > 0.5 ? car.vx : fx * (car.speed || absSpd);
        const moveVz = vMag > 0.5 ? car.vz : fz * (car.speed || absSpd);
        // Lookahead bumper point so PDM glass shatters & disables its AABB BEFORE resolveCarAABB stops momentum!
        const lookX = car.x + moveVx * 0.09;
        const lookZ = car.z + moveVz * 0.09;

        const isNearPlayer = car === pCar || (car.x - px) ** 2 + (car.z - pz) ** 2 < 110 * 110;

        // 4A. PDM Showroom Breakable Glass Curtain Wall (speed > 5 m/s)
        if (isNearPlayer && distToPDM <= 145 && car.x >= -28 && car.x <= 29 && car.z >= 131 && car.z <= 181) {
          for (let gi = 0; gi < pdmState.glassPanels.length; gi++) {
            const gp = pdmState.glassPanels[gi];
            if (gp.broken) continue;
            const hitNow = gp.isAlongZ
              ? ((Math.abs(car.x - gp.x) <= 2.85 || Math.abs(lookX - gp.x) <= 2.65) && Math.abs(car.z - gp.z) <= gp.spanW * 0.5 + 1.15)
              : ((Math.abs(car.z - gp.z) <= 2.85 || Math.abs(lookZ - gp.z) <= 2.65) && Math.abs(car.x - gp.x) <= gp.spanW * 0.5 + 1.15);
            if (hitNow) {
              shatterPDMGlassPanel(gp, moveVx, moveVz, car === pCar);
            }
          }
        }

        // 4B. RON Fuel Pumps — STRICT PLAYER ATTRIBUTION ONLY!
        //     NEVER trigger from AI traffic! ONLY when car === ctx.player.inCar && speed > 8.5!
        if (pCar && car === pCar && (Math.abs(car.speed || 0) > 8.5 || absSpd > 8.5)) {
          for (let si = 0; si < gasStations.length; si++) {
            const st = gasStations[si];
            if (st.exploded) continue;
            for (let pi = 0; pi < st.pumps.length; pi++) {
              const pump = st.pumps[pi];
              if (!pump.exploded && Math.hypot(car.x - pump.x, car.z - pump.z) <= 2.55) {
                triggerGasStationChainExplosion(st, pi, activeCtx);
                break;
              }
            }
          }
        }

        // 4C. Bus-Stop Glass Shelters & Royal-Blue Mailboxes
        if (isNearPlayer && absSpd > 5.8) {
          for (let bi = 0; bi < busShelters.length; bi++) {
            const bs = busShelters[bi];
            if (!bs.glassBroken && Math.hypot(car.x - bs.x, car.z - bs.z) <= 2.65) {
              shatterBusShelter(bs, moveVx, moveVz);
              if (car === pCar) activeCtx?.engine?.addShake?.(0.16);
            }
          }
        }
        if (isNearPlayer && absSpd > 4.5) {
          for (let si = 0; si < signPosts.length; si++) {
            const sp = signPosts[si];
            if (!sp.broken && Math.hypot(car.x - sp.baseX, car.z - sp.baseZ) <= 1.75) {
              sp.broken = true;
              sp.settled = false;
              const l = Math.hypot(moveVx, moveVz) || 1;
              const launch = Math.min(22, Math.max(7, absSpd * 0.95));
              sp.vx = (moveVx / l) * launch + (Math.random() - 0.5) * 3;
              sp.vy = 4.2 + Math.min(6, absSpd * 0.25);
              sp.vz = (moveVz / l) * launch + (Math.random() - 0.5) * 3;
              sp.avx = (Math.random() - 0.5) * 9;
              sp.avz = (Math.random() - 0.5) * 9;
              car.vx *= 0.88;
              car.vz *= 0.88;
              if (typeof car.speed === 'number') car.speed *= 0.88;
              if (car === pCar) {
                activeCtx?.vehicles?.damageVehicle?.(car, 5);
                activeCtx?.engine?.addShake?.(0.10);
                activeCtx?.audio?.playCrash?.(0.28);
              }
            }
          }
        }

        if (isNearPlayer && absSpd > 6.8) {
          for (let mi = 0; mi < mailboxes.length; mi++) {
            const mb = mailboxes[mi];
            if (!mb.broken && Math.hypot(car.x - mb.baseX, car.z - mb.baseZ) <= 1.85) {
              triggerMailboxImpact(mb, moveVx, moveVz, absSpd);
              if (car === pCar) activeCtx?.engine?.addShake?.(0.12);
            }
          }
        }
      }
    }

    // 5) Step RON Gas Station Chain Explosions, 18m Black Smoke Plume, >180m Regen & 24/7 Sliding Doors!
    let glassMatrixDirty = false;
    for (let si = 0; si < gasStations.length; si++) {
      const st = gasStations[si];
      const distPlayer = Math.hypot(px - st.cx, pz - st.cz);

      // Regenerate RON Station cleanly once player moves > 180m away!
      if (st.exploded && distPlayer > 180) {
        st.exploded = false;
        st.chainActive = false;
        st.smokeTimer = 0;
        for (let pi = 0; pi < st.pumps.length; pi++) {
          const pump = st.pumps[pi];
          pump.exploded = false;
          pump.detonateTimer = -1;
          setAABBEnabled(pump.aabb, true);
          setDummyMatrix(pumpIntactInst, pump.idx, pump.x, pump.y, pump.z, 0, 0, 0, 1, 1, 1);
          setDummyMatrix(pumpScorchedInst, pump.idx, pump.x, -999, pump.z, 0, 0, 0, 0.001, 0.001, 0.001);
        }
        pumpIntactInst.instanceMatrix.needsUpdate = true;
        pumpScorchedInst.instanceMatrix.needsUpdate = true;
      }

      // Tick staggered 4-pump chain detonations!
      if (st.chainActive) {
        let anyPending = false;
        for (let pi = 0; pi < st.pumps.length; pi++) {
          const pump = st.pumps[pi];
          if (!pump.exploded && pump.detonateTimer >= 0) {
            pump.detonateTimer -= dt;
            if (pump.detonateTimer <= 0) {
              detonateSinglePumpVisual(pump, activeCtx);
            } else {
              anyPending = true;
            }
          }
        }
        if (!anyPending) st.chainActive = false;
      }

      // Towering 18m Black Smoke & Fire Plume above Scorched Pumps
      if (st.smokeTimer > 0) {
        st.smokeTimer = Math.max(0, st.smokeTimer - dt);
        st.smokeEmitAcc += dt * 11.5;
        while (st.smokeEmitAcc >= 1.0) {
          st.smokeEmitAcc -= 1.0;
          const rp = st.pumps[Math.floor(Math.random() * st.pumps.length)];
          emitSmokePlumePuff(rp.x, rp.y + 0.5, rp.z, st.smokeTimer > 16.0 && Math.random() < 0.35);
        }
      }

      // Automatic Sliding Glass Doors when Player is within 4.5m!
      if (st.doorChimeCooldown > 0) st.doorChimeCooldown -= dt;
      const nearDoor = Math.hypot(px - st.doorX, pz - st.doorZ) <= 4.5;
      if (nearDoor && st.doorOpenFrac < 0.12 && st.doorChimeCooldown <= 0) {
        st.doorChimeCooldown = 5.0;
        playSlidingDoorChimeSFX();
      }
      const targetOpen = nearDoor ? 1.0 : 0.0;
      if (Math.abs(st.doorOpenFrac - targetOpen) > 0.002) {
        st.doorOpenFrac = lerp(st.doorOpenFrac, targetOpen, clamp(dt * 7.5, 0, 1));
        const slide = st.doorOpenFrac * 1.62;
        setDummyMatrix(dynamicGlassInst, st.doorLeafIdxL, st.doorX - 0.88 - slide, 1.68, st.doorZ, 0, 0, 0, 1.76, 2.85, 0.07);
        setDummyMatrix(dynamicGlassInst, st.doorLeafIdxR, st.doorX + 0.88 + slide, 1.68, st.doorZ, 0, 0, 0, 1.76, 2.85, 0.07);
        glassMatrixDirty = true;
      }

      // Cash Register Robbery Cooldown & Panicked Clerk Hands-Up Animation
      if (st.register.robbedCooldown > 0) {
        st.register.robbedCooldown = Math.max(0, st.register.robbedCooldown - dt);
        if (distPlayer > 150) st.register.robbedCooldown = 0;
      }
      if (st.register.alarmTimer > 0) {
        st.register.alarmTimer = Math.max(0, st.register.alarmTimer - dt);
      }
      if (st.clerk && clerkArmInst) {
        const handsUp = st.register.alarmTimer > 0 ? -2.75 : -0.12;
        if (Math.abs(st.clerk.armPitch - handsUp) > 0.004) {
          st.clerk.armPitch = lerp(st.clerk.armPitch, handsUp, clamp(dt * 10, 0, 1));
          setDummyMatrix(clerkArmInst, st.clerk.armIdxL, st.clerk.x - 0.28, st.clerk.y, st.clerk.z, st.clerk.armPitch, st.clerk.yaw, 0, 1, 1, 1);
          setDummyMatrix(clerkArmInst, st.clerk.armIdxR, st.clerk.x + 0.28, st.clerk.y, st.clerk.z, st.clerk.armPitch, st.clerk.yaw, 0, 1, 1, 1);
          clerkArmInst.instanceMatrix.needsUpdate = true;
        }
      }
    }
    if (glassMatrixDirty && dynamicGlassInst) {
      dynamicGlassInst.instanceMatrix.needsUpdate = true;
    }

    // 6) Step Thần Binh Các Reactive Rear Shooting Targets
    let targetsDirty = false;
    for (let ti = 0; ti < ammuTargets.length; ti++) {
      const tgt = ammuTargets[ti];
      if (tgt.downTimer > 0) {
        tgt.downTimer = Math.max(0, tgt.downTimer - dt);
      }
      const desiredFlip = tgt.downTimer > 0 ? -Math.PI * 0.48 : 0;
      if (Math.abs(tgt.flipAngle - desiredFlip) > 0.005) {
        tgt.flipAngle = lerp(tgt.flipAngle, desiredFlip, clamp(dt * 14, 0, 1));
        setDummyMatrix(ammuTargetInst, tgt.idx, tgt.x, 1.05, tgt.z, 0, 0, tgt.flipAngle, 1, 1, 1);
        targetsDirty = true;
      }
    }
    if (targetsDirty && ammuTargetInst) {
      ammuTargetInst.instanceMatrix.needsUpdate = true;
    }

    // 7) Burger Shot / Up-n-Atom Drive-Thru Lane Heal & Car Repair ((-80, +224))!
    if (driveThruState.cooldown > 0) driveThruState.cooldown = Math.max(0, driveThruState.cooldown - dt);
    const inDriveThruLane = px >= -92.0 && px <= -77.6 && pz >= 220.2 && pz <= 240.5 && Math.abs((p?.y || 0) - 0.15) < 2.5;
    if (inDriveThruLane && driveThruState.cooldown <= 0 && !activeCtx?.activeModal) {
      const spd = pCar ? Math.hypot(pCar.vx || 0, pCar.vz || 0) : Math.hypot(p?.vx || 0, p?.vz || 0);
      if (spd < 4.8) {
        driveThruState.dwellTimer += dt;
        activeCtx?.ui?.showPrompt?.('🍔 Đang nhận đơn Burger Shot Drive-Thru ($25 • Hồi 100% Máu & +25% Độ Bền Xe)...', 0.25);
        if (driveThruState.dwellTimer >= 0.55) {
          driveThruState.dwellTimer = 0;
          driveThruState.cooldown = 12.0;
          if (getPlayerCashSafe(activeCtx) >= 25) {
            addPlayerCashSafe(-25, activeCtx);
          }
          if (p) {
            p.hp = Number.isFinite(p.maxHp) && p.maxHp > 0 ? p.maxHp : 100;
          }
          if (pCar) {
            const maxCarHp = Number.isFinite(pCar.maxHp) && pCar.maxHp > 0 ? pCar.maxHp : 140;
            pCar.hp = Math.min(maxCarHp, (pCar.hp || maxCarHp) + maxCarHp * 0.25);
            pCar.onFire = false;
            if (typeof pCar.smokeTimer === 'number') pCar.smokeTimer = 0;
          }
          playDriveThruJingleSFX();
          activeCtx?.ui?.showSubtitle?.(
            'Nhân viên Burger Shot: "Combo Bò Nướng Phô Mai Nóng Hổi của quý khách đây! Chúc thượng lộ bình an! (-$25 • Đầy 100% Máu & +25% Độ Bền Xe)"',
            4.5
          );
          activeCtx?.ui?.showNotification?.('🍔 Burger Shot Drive-Thru: Đã hồi 100% Máu & bảo dưỡng +25% Xe (-$25)!', 3.6);
        }
      } else {
        driveThruState.dwellTimer = Math.max(0, driveThruState.dwellTimer - dt);
        activeCtx?.ui?.showPrompt?.('🍔 Giảm tốc độ trong làn Burger Shot Drive-Thru để hồi 100% Máu & +25% Xe ($25)', 0.2);
      }
    } else {
      driveThruState.dwellTimer = 0;
    }

    // 8) On-Foot Contextual Prompts & [F] / [G] Interactions (24/7 Robbery, Walk-In Thần Binh Các, PDM Desk)
    const inp = activeCtx?.input || {};
    const keys = inp.keys || {};
    const gNow = Boolean(keys.KeyG || keys.g);
    const gJust = Boolean((gNow && !prevKeyG) || inp.secondaryInteractJustPressed || inp.shopInteractJustPressed || inp.interactGJustPressed);
    prevKeyG = gNow;
    const fJust = Boolean(inp.interactJustPressed || inp.useJustPressed);

    if (p && !pCar && !activeCtx?.activeModal && !activeCtx?.paused && activeCtx?.started !== false) {
      // 8A. Inside Either Seamless 24/7 Convenience Store near Cash Register
      for (let si = 0; si < gasStations.length; si++) {
        const st = gasStations[si];
        if (Math.hypot(px - st.register.x, pz - st.register.z) <= 3.1) {
          if (st.register.robbedCooldown <= 0) {
            activeCtx?.ui?.showPrompt?.('Nhấn [G] Cướp Quầy Thu Ngân 24/7 ($650–$1,400) • [F] Mua Nước Tăng Lực Sprunk ($10)', 0.22);
            if (gJust) {
              robConvenienceStoreRegister(st, activeCtx);
            } else if (fJust) {
              if (getPlayerCashSafe(activeCtx) >= 10) addPlayerCashSafe(-10, activeCtx);
              p.hp = Number.isFinite(p.maxHp) && p.maxHp > 0 ? p.maxHp : 100;
              playSlidingDoorChimeSFX();
              activeCtx?.ui?.showNotification?.('🥤 Đã uống Sprunk ướp lạnh tại 24/7: Hồi phục 100% Máu!', 2.8);
              if (inp) inp.interactJustPressed = false;
            }
          } else {
            activeCtx?.ui?.showPrompt?.('🚨 Két thu ngân 24/7 vừa bị cướp trống rỗng!', 0.22);
          }
        }
      }

      // 8B. Inside Seamless Ground-Level Thần Binh Các at (186, +12)
      if (px >= 182.0 && px <= 191.2 && pz >= 4.0 && pz <= 20.0 && Math.hypot(px - 187.4, pz - 12.0) <= 5.2) {
        activeCtx?.ui?.showPrompt?.('Nhấn [F] hoặc [G] để mở Tủ Vũ Khí & Áo Giáp Thần Binh Các (Hoặc bắn thử 3 Bia Tập Bắn phía sau!)', 0.22);
        if (fJust || gJust) {
          activeCtx?.shops?.openAmmuNation?.('weapons');
          if (inp) inp.interactJustPressed = false;
        }
      }

      // 8C. Inside PDM Showroom near Simeon's VIP Desk (-16, 173.5)
      if (Math.hypot(px - (-16.0), pz - 173.5) <= 3.4) {
        activeCtx?.ui?.showPrompt?.('Nhấn [G] mở Danh Mục Siêu Xe Premium Deluxe Motorsport (Hoặc nhấn [F] lên thẳng Siêu xe trên bàn xoay!)', 0.22);
        if (gJust) {
          activeCtx?.shops?.openDealership?.('showroom');
        }
      }
    }

    // 9) Step Destructible Street Furniture Reset & Physics + Pooled 3D Glass Shards / Smoke / Cash Wads!
    for (let bi = 0; bi < busShelters.length; bi++) {
      const bs = busShelters[bi];
      if (bs.glassBroken && (px - bs.x) ** 2 + (pz - bs.z) ** 2 > 145 * 145) {
        bs.glassBroken = false;
        setDummyMatrix(busGlassInst, bs.idx, bs.x, bs.y, bs.z, 0, bs.yaw, 0, 1, 1, 1);
        busGlassInst.instanceMatrix.needsUpdate = true;
      }
    }

    let mbDirty = false;
    for (let mi = 0; mi < mailboxes.length; mi++) {
      const mb = mailboxes[mi];
      if (!mb.broken) continue;
      if ((px - mb.baseX) ** 2 + (pz - mb.baseZ) ** 2 > 145 * 145) {
        mb.broken = false;
        mb.settled = false;
        mb.x = mb.baseX; mb.y = mb.baseY; mb.z = mb.baseZ;
        mb.rx = 0; mb.ry = mb.baseYaw; mb.rz = 0;
        setDummyMatrix(mailboxInst, mb.idx, mb.x, mb.y, mb.z, 0, mb.ry, 0, 1, 1, 1);
        mbDirty = true;
        continue;
      }
      if (!mb.settled) {
        mb.vy -= 20.0 * dt;
        mb.x += mb.vx * dt;
        mb.y += mb.vy * dt;
        mb.z += mb.vz * dt;
        mb.rx += mb.avx * dt;
        mb.rz += mb.avz * dt;
        if (mb.y <= 0.26) {
          mb.y = 0.26;
          if (Math.abs(mb.vy) > 1.6) {
            mb.vy = -mb.vy * 0.32;
            mb.vx *= 0.6;
            mb.vz *= 0.6;
          } else {
            mb.vy = 0;
            mb.vx *= Math.max(0, 1 - 7 * dt);
            mb.vz *= Math.max(0, 1 - 7 * dt);
            mb.rx = lerp(mb.rx, Math.PI * 0.5, clamp(dt * 9, 0, 1));
            if (Math.hypot(mb.vx, mb.vz) < 0.15) mb.settled = true;
          }
        }
        setDummyMatrix(mailboxInst, mb.idx, mb.x, mb.y, mb.z, mb.rx, mb.ry, mb.rz, 1, 1, 1);
        mbDirty = true;
      }
    }
    if (mbDirty && mailboxInst) mailboxInst.instanceMatrix.needsUpdate = true;

    // Step Flying/Tumbling Street-Name Sign Posts
    let spDirty = false;
    for (let si = 0; si < signPosts.length; si++) {
      const sp = signPosts[si];
      if (!sp.broken) continue;
      if ((px - sp.baseX) ** 2 + (pz - sp.baseZ) ** 2 > 145 * 145) {
        sp.broken = false;
        sp.settled = false;
        sp.x = sp.baseX; sp.y = sp.baseY; sp.z = sp.baseZ;
        sp.rx = 0; sp.ry = 0; sp.rz = 0;
        setDummyMatrix(signPostInst, sp.idx, sp.x, sp.y, sp.z, 0, 0, 0, 1, 1, 1);
        spDirty = true;
        continue;
      }
      if (!sp.settled) {
        sp.vy -= 18.0 * dt;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.z += sp.vz * dt;
        sp.rx += sp.avx * dt;
        sp.rz += sp.avz * dt;
        if (sp.y <= 0.28) {
          sp.y = 0.28;
          sp.vy = Math.abs(sp.vy) * 0.28;
          sp.vx *= 0.62;
          sp.vz *= 0.62;
          sp.avx *= 0.6;
          sp.avz *= 0.6;
          if (Math.hypot(sp.vx, sp.vz) < 0.35 && sp.vy < 0.4) sp.settled = true;
        }
        setDummyMatrix(signPostInst, sp.idx, sp.x, sp.y, sp.z, sp.rx, sp.ry, sp.rz, 1, 1, 1);
        spDirty = true;
      }
    }
    if (spDirty && signPostInst) signPostInst.instanceMatrix.needsUpdate = true;

    // Step Spinning 3D Glass Shards
    let shardsDirty = false;
    for (let i = 0; i < MAX_SHARDS; i++) {
      const s = shards[i];
      if (!s.active) continue;
      shardsDirty = true;
      s.age += dt;
      if (s.age >= s.life) {
        s.active = false;
        setDummyMatrix(shardInst, i, 0, -999, 0, 0, 0, 0, 0.001, 0.001, 0.001);
        continue;
      }
      s.vy -= 16.5 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      s.rx += s.avx * dt;
      s.ry += s.avy * dt;
      s.rz += s.avz * dt;
      if (s.y <= 0.24) {
        s.y = 0.24;
        s.vy = Math.abs(s.vy) * 0.36;
        s.vx *= 0.72;
        s.vz *= 0.72;
      }
      const fade = 1 - smoothstep(0.65, 1.0, s.age / s.life);
      const sc = Math.max(0.01, s.scale * fade);
      setDummyMatrix(shardInst, i, s.x, s.y, s.z, s.rx, s.ry, s.rz, sc, sc, sc * 0.25);
    }
    if (shardsDirty && shardInst) shardInst.instanceMatrix.needsUpdate = true;

    // Step 18m Black Smoke & Fireball Plume
    let plumesDirty = false;
    for (let i = 0; i < MAX_PLUMES; i++) {
      const pl = plumes[i];
      if (!pl.active) continue;
      plumesDirty = true;
      pl.age += dt;
      if (pl.age >= pl.life) {
        pl.active = false;
        setDummyMatrix(plumeInst, i, 0, -999, 0, 0, 0, 0, 0.001, 0.001, 0.001);
        continue;
      }
      pl.x += (pl.vx + Math.sin(localElapsed * 1.5 + i) * 0.45) * dt;
      pl.y += pl.vy * dt;
      pl.z += pl.vz * dt;
      const u = pl.age / pl.life;
      const sc = lerp(pl.startScale, pl.endScale, u) * (1 - smoothstep(0.8, 1.0, u));
      setDummyMatrix(plumeInst, i, pl.x, pl.y, pl.z, u * 1.5, i * 0.7, 0, sc, sc, sc);
    }
    if (plumesDirty && plumeInst) plumeInst.instanceMatrix.needsUpdate = true;

    // Step Flying $100 Cash Wads & Envelopes
    let cashDirty = false;
    for (let i = 0; i < MAX_CASH_WADS; i++) {
      const w = cashWads[i];
      if (!w.active) continue;
      cashDirty = true;
      w.age += dt;
      if (w.age >= w.life) {
        w.active = false;
        setDummyMatrix(cashWadInst, i, 0, -999, 0, 0, 0, 0, 0.001, 0.001, 0.001);
        continue;
      }
      w.vy -= 8.5 * dt;
      w.x += w.vx * dt;
      w.y += w.vy * dt;
      w.z += w.vz * dt;
      w.rx += w.avx * dt;
      w.ry += w.avy * dt;
      if (w.y <= 0.25) {
        w.y = 0.25;
        w.vy = 0;
        w.vx *= 0.8;
        w.vz *= 0.8;
      }
      setDummyMatrix(cashWadInst, i, w.x, w.y, w.z, w.rx, w.ry, w.rz, 1, 1, 1);
    }
    if (cashDirty && cashWadInst) cashWadInst.instanceMatrix.needsUpdate = true;
  }

  // ==========================================================================
  // 14. Assemble & Export Public API (`ctx.mapCommercial`)
  // ==========================================================================

  const api = {
    init,
    update,
    getElevation,
    onProjectileHit,
    aabbs,
    roadNodes,
    roadEdges,
    minimapPolys,
    minimapBlips,
    root: commRoot,
    pdmState,
    gasStations,
    ammuTargets,
    busShelters,
    mailboxes,
  };

  if (ctx && typeof ctx === 'object') {
    ctx.mapCommercial = api;
  }
  return api;
}
