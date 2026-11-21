import * as THREE from 'three';

/**
 * Giang Hồ 3D: Đại Lộ & Bờ Biển 3D — Deep Living World, 3-Protagonist Sky-Zoom Switch,
 * Emergency Dispatch AI (EMS Y Sư Cấp Cứu & LFD Xe Cứu Hỏa Water-Cannon),
 * Thiên Đình Chấp Pháp Bàn Chông Thiên Đình Chấp Pháp / Thiên Binh Cấm Vệ Fast-Rope / Cruiser Door Cover & Dynamic Citizen Events
 * Exclusively owns: src/npc_life.js -> export function createNpcLife(ctx)
 */

export function createNpcLife(ctx = {}) {
  // ============================================================================
  // 1. CORE MATH, DETERMINISTIC RNG, GEOMETRY SOLVERS & CITY ROAD A* ROUTER
  // ============================================================================
  const SAVE_STORAGE_KEY = 'gtav_npc_life_state_v1';

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0 || 1e-6), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const smootherstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0 || 1e-6), 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  };

  function damp(cur, target, lambda, dt) {
    return lerp(cur, target, 1 - Math.exp(-lambda * dt));
  }

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function dampAngle(cur, target, lambda, dt) {
    const diff = wrapAngle(target - cur);
    return wrapAngle(cur + diff * (1 - Math.exp(-lambda * dt)));
  }

  function lerpAngle(a, b, t) {
    return wrapAngle(a + wrapAngle(b - a) * clamp(t, 0, 1));
  }

  function dist2D(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    return Math.sqrt(dx * dx + dz * dz);
  }

  function distSq2D(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    return dx * dx + dz * dz;
  }

  let _seed = 0x5f3759df;
  function nextRand() {
    _seed = (_seed * 1664525 + 1013904223) >>> 0;
    return _seed / 4294967296;
  }

  function randRange(lo, hi) {
    return lo + Math.random() * (hi - lo);
  }

  function randInt(lo, hi) {
    return Math.floor(randRange(lo, hi + 1));
  }

  function pickRandom(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Reusable scratch math primitives to prevent per-frame GC allocations
  const _vecA = new THREE.Vector3();
  const _vecB = new THREE.Vector3();
  const _vecC = new THREE.Vector3();
  const _vecD = new THREE.Vector3();
  const _projVec = new THREE.Vector3();
  const _quatA = new THREE.Quaternion();
  const _quatB = new THREE.Quaternion();
  const _mat4A = new THREE.Matrix4();
  const _colorA = new THREE.Color();
  const _upAxis = new THREE.Vector3(0, 1, 0);
  const _fwdAxis = new THREE.Vector3(0, 0, 1);

  // City Grid Coordinates matching world.js & world_infra.js
  const CITY_AVENUES_X = [-120, -40, 40, 120, 200];
  const CITY_STREETS_Z = [-200, -120, -40, 40, 120, 200];

  const KEY_LANDMARKS = {
    boulevardStart: { x: 26.0, y: 0.22, z: 28.0, label: 'Đại lộ Bồng Lai' },
    diamondCasino: { x: 198.0, y: 0.22, z: -110.0, label: 'Sòng Bạc Diamond Crown' },
    clubEclipse: { x: -129.0, y: 0.22, z: -95.0, label: 'Túy Tiên Lâu & Bar' },
    delPerroMarina: { x: -135.0, y: 0.22, z: 90.0, label: 'Bến Du Thuyền & Bãi Trực Thăng' },
    observatory: { x: 68.0, y: 28.0, z: -242.0, label: 'Đài Thiên Văn Võ Lâm' },
    hospital: { x: 80.0, y: 0.22, z: 130.0, label: 'Bệnh Viện Trung Tâm Pillbox' },
    precinct: { x: 130.0, y: 0.22, z: 80.0, label: 'Sở Cảnh Sát Thiên Đình Chấp Pháp Mission Row' },
    fireStation: { x: -34.0, y: 0.22, z: -118.0, label: 'Trạm Cứu Hỏa LFD Số 7' },
    customsBay: { x: -58.0, y: 0.05, z: 80.0, label: 'Xưởng Độ Xe Luyện Khí Các' },
    safehouse: { x: 24.0, y: 0.22, z: -80.0, label: 'Căn Hộ Penthouse Động Phủ Tu Luyện' },
    pierEntrance: { x: -152.0, y: 3.8, z: -5.0, label: 'Cầu Cảng Bồng Lai' },
    pacificBank: { x: 111.0, y: 0.22, z: -120.0, label: 'Ngân Hàng Linh Thạch Bảo Khố' },
    ammuNation: { x: 204.0, y: 0.22, z: 10.0, label: 'Cửa Hàng Vũ Khí Thần Binh Các' }
  };

  function getScene(activeCtx = ctx) {
    return activeCtx?.engine?.scene || activeCtx?.scene || ctx?.engine?.scene || null;
  }

  function getCamera(activeCtx = ctx) {
    return activeCtx?.engine?.camera || activeCtx?.camera || ctx?.engine?.camera || null;
  }

  function sampleGroundY(x, z, fallback = 0.05, activeCtx = ctx) {
    const w = activeCtx?.world || ctx?.world;
    if (w && typeof w.getGroundHeight === 'function') {
      const h = w.getGroundHeight(x, z);
      if (Number.isFinite(h)) return h;
    }
    const wi = activeCtx?.worldInfra || ctx?.worldInfra;
    if (wi && typeof wi.getExtraGroundHeight === 'function') {
      const eh = wi.getExtraGroundHeight(x, z);
      if (Number.isFinite(eh)) return eh;
    }
    if (x >= -295 && x <= -150 && z >= -32 && z <= 22) return 3.8;
    if (x < -128 && x >= -212) {
      const t = clamp((-128 - x) / 84, 0, 1);
      return lerp(0.22, -0.3, t);
    }
    return fallback;
  }

  function getPlayerVehicle(activeCtx = ctx) {
    const p = activeCtx?.player || ctx?.player;
    if (!p) return null;
    if (p.inCar && typeof p.inCar === 'object') return p.inCar;
    if (p.vehicle && typeof p.vehicle === 'object') return p.vehicle;
    if (p.car && typeof p.car === 'object') return p.car;
    const vList = activeCtx?.vehicles?.list || ctx?.vehicles?.list;
    if (p.inCar && Array.isArray(vList)) {
      return vList.find((v) => v && (v.driver === 'player' || v.driver === p || v.isPlayerDriving)) || null;
    }
    return null;
  }

  function getPlayerCash(activeCtx = ctx) {
    const p = activeCtx?.player || ctx?.player;
    if (!p) return 0;
    if (Number.isFinite(p.cash)) return p.cash;
    if (Number.isFinite(p.money)) return p.money;
    return 7860;
  }

  function addPlayerCash(delta, showPopup = true, activeCtx = ctx) {
    const p = activeCtx?.player || ctx?.player;
    if (!p) return 0;
    const cur = getPlayerCash(activeCtx);
    const next = Math.max(0, Math.round(cur + delta));
    const applied = next - cur;
    if (ctx?.antiCheat?.commitCash) {
      ctx.antiCheat.commitCash(next);
    } else {
      p.cash = next;
      p.money = next;
    }
    if (showPopup && applied !== 0) {
      const ui = activeCtx?.ui || ctx?.ui;
      ui?.addCashPopup?.(applied);
      if (applied > 0) (activeCtx?.audio || ctx?.audio)?.playCash?.();
    }
    return next;
  }

  function isPlayerInsideInterior(p) {
    if (!p) return false;
    return Boolean(
      p.inSafehouse ||
      p.inHouse ||
      Math.abs(p.x) > 550 ||
      Math.abs(p.z) > 550
    );
  }

  function resolveExteriorAnchorForPlayer(p) {
    if (!p) return { x: 26, y: 0.22, z: 28 };
    if (p.x > 1950 && p.x < 2250) return { x: 111.0, y: 0.22, z: -116.0 }; // Bank (2100,2100)
    if (p.x > 1650 && p.x < 1950) return { x: 204.0, y: 0.22, z: 10.0 };   // Thần Binh Các (1800,1800)
    if (p.x > 1350 && p.x < 1650) return { x: -124.0, y: 0.22, z: -95.0 }; // Túy Tiên Lâu (1500,1500)
    if (p.x > 1050 && p.x < 1350) return { x: 203.0, y: 0.22, z: -110.0 }; // Casino (1200,1200)
    if (p.inSafehouse || (p.x > 650 && p.x < 950)) return { x: 24.0, y: 0.22, z: -76.5 }; // Động Phủ Tu Luyện (800,800)
    return { x: p.x, y: p.y, z: p.z };
  }

  // Oriented 2D Bounding Box Point Containment Test (for Bàn Chông Thiên Đình Chấp Pháp & Cruiser Doors)
  function pointInOBB2D(px, pz, cx, cz, yaw, halfWidth, halfLength) {
    const dx = px - cx;
    const dz = pz - cz;
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);
    // Local forward = (sinY, cosY), Local right = (cosY, -sinY)
    const localRight = dx * cosY - dz * sinY;
    const localFwd = dx * sinY + dz * cosY;
    return Math.abs(localRight) <= halfWidth && Math.abs(localFwd) <= halfLength;
  }

  // Segment vs OBB2D intersection (for swept high-speed tire vs spike-strip & bullet vs door shield)
  function segmentIntersectsOBB2D(x0, z0, x1, z1, cx, cz, yaw, halfWidth, halfLength) {
    if (pointInOBB2D(x0, z0, cx, cz, yaw, halfWidth, halfLength)) return true;
    if (pointInOBB2D(x1, z1, cx, cz, yaw, halfWidth, halfLength)) return true;
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);
    const rx0 = (x0 - cx) * cosY - (z0 - cz) * sinY;
    const fz0 = (x0 - cx) * sinY + (z0 - cz) * cosY;
    const rx1 = (x1 - cx) * cosY - (z1 - cz) * sinY;
    const fz1 = (x1 - cx) * sinY + (z1 - cz) * cosY;

    let tMin = 0.0;
    let tMax = 1.0;
    const dr = rx1 - rx0;
    const df = fz1 - fz0;

    if (Math.abs(dr) < 1e-6) {
      if (Math.abs(rx0) > halfWidth) return false;
    } else {
      let t1 = (-halfWidth - rx0) / dr;
      let t2 = (halfWidth - rx0) / dr;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return false;
    }

    if (Math.abs(df) < 1e-6) {
      if (Math.abs(fz0) > halfLength) return false;
    } else {
      let t1 = (-halfLength - fz0) / df;
      let t2 = (halfLength - fz0) / df;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return false;
    }
    return tMax >= tMin;
  }

  // ============================================================================
  // A* CITY INTERSECTION GRAPH FOR EMERGENCY & EVENT VEHICLE NAVIGATION
  // ============================================================================
  const roadGraphNodes = [];
  const roadNodeGrid = new Map();

  (function buildCityRoadGraph() {
    let idx = 0;
    for (let ai = 0; ai < CITY_AVENUES_X.length; ai++) {
      for (let si = 0; si < CITY_STREETS_Z.length; si++) {
        const ax = CITY_AVENUES_X[ai];
        const sz = CITY_STREETS_Z[si];
        const node = {
          id: idx++,
          ai,
          si,
          x: ax,
          z: sz,
          neighbors: []
        };
        roadGraphNodes.push(node);
        roadNodeGrid.set(`${ai}_${si}`, node);
      }
    }
    for (let i = 0; i < roadGraphNodes.length; i++) {
      const n = roadGraphNodes[i];
      const dirs = [
        [n.ai - 1, n.si],
        [n.ai + 1, n.si],
        [n.ai, n.si - 1],
        [n.ai, n.si + 1]
      ];
      for (let d = 0; d < dirs.length; d++) {
        const nb = roadNodeGrid.get(`${dirs[d][0]}_${dirs[d][1]}`);
        if (nb) {
          n.neighbors.push({
            node: nb,
            cost: dist2D(n.x, n.z, nb.x, nb.z)
          });
        }
      }
    }
  })();

  function findNearestRoadNode(x, z) {
    let best = roadGraphNodes[0];
    let bestD2 = Infinity;
    for (let i = 0; i < roadGraphNodes.length; i++) {
      const n = roadGraphNodes[i];
      const d2 = distSq2D(x, z, n.x, n.z);
      if (d2 < bestD2) {
        bestD2 = d2;
        best = n;
      }
    }
    return best;
  }

  function snapPointToNearestRoadCorridor(x, z) {
    let bestAx = CITY_AVENUES_X[0];
    let minAd = Math.abs(x - bestAx);
    for (let i = 1; i < CITY_AVENUES_X.length; i++) {
      const d = Math.abs(x - CITY_AVENUES_X[i]);
      if (d < minAd) {
        minAd = d;
        bestAx = CITY_AVENUES_X[i];
      }
    }

    let bestSz = CITY_STREETS_Z[0];
    let minSd = Math.abs(z - bestSz);
    for (let i = 1; i < CITY_STREETS_Z.length; i++) {
      const d = Math.abs(z - CITY_STREETS_Z[i]);
      if (d < minSd) {
        minSd = d;
        bestSz = CITY_STREETS_Z[i];
      }
    }

    if (minAd <= minSd) {
      return {
        x: bestAx,
        z: clamp(z, -210, 210),
        axis: 'Z',
        roadCenter: bestAx,
        halfWidth: bestAx === 40 ? 11 : 8
      };
    }
    return {
      x: clamp(x, -130, 212),
      z: bestSz,
      axis: 'X',
      roadCenter: bestSz,
      halfWidth: 8
    };
  }

  function computeRoadRouteWaypoints(startX, startZ, goalX, goalZ, rightHandOffset = 3.2) {
    const startNode = findNearestRoadNode(startX, startZ);
    const goalNode = findNearestRoadNode(goalX, goalZ);
    if (!startNode || !goalNode) {
      return [{ x: goalX, z: goalZ }];
    }

    if (startNode === goalNode) {
      return [
        { x: startNode.x, z: startNode.z },
        { x: goalX, z: goalZ }
      ];
    }

    const count = roadGraphNodes.length;
    const gScore = new Float64Array(count).fill(Infinity);
    const fScore = new Float64Array(count).fill(Infinity);
    const cameFrom = new Int32Array(count).fill(-1);
    const closed = new Uint8Array(count);
    const open = [startNode.id];

    gScore[startNode.id] = 0;
    fScore[startNode.id] = dist2D(startNode.x, startNode.z, goalNode.x, goalNode.z);

    while (open.length > 0) {
      let bestIdx = 0;
      for (let i = 1; i < open.length; i++) {
        if (fScore[open[i]] < fScore[open[bestIdx]]) bestIdx = i;
      }
      const curId = open[bestIdx];
      open.splice(bestIdx, 1);

      if (curId === goalNode.id) break;
      if (closed[curId]) continue;
      closed[curId] = 1;

      const curNode = roadGraphNodes[curId];
      for (let k = 0; k < curNode.neighbors.length; k++) {
        const edge = curNode.neighbors[k];
        const nbId = edge.node.id;
        if (closed[nbId]) continue;
        const tentative = gScore[curId] + edge.cost;
        if (tentative < gScore[nbId]) {
          cameFrom[nbId] = curId;
          gScore[nbId] = tentative;
          fScore[nbId] = tentative + dist2D(edge.node.x, edge.node.z, goalNode.x, goalNode.z);
          if (!open.includes(nbId)) open.push(nbId);
        }
      }
    }

    const rawChain = [];
    let walk = goalNode.id;
    let safety = 0;
    while (walk !== -1 && safety++ < 64) {
      rawChain.push(roadGraphNodes[walk]);
      if (walk === startNode.id) break;
      walk = cameFrom[walk];
    }
    rawChain.reverse();

    const waypoints = [];
    for (let i = 0; i < rawChain.length; i++) {
      const curr = rawChain[i];
      const next = rawChain[i + 1] || { x: goalX, z: goalZ };
      const dx = next.x - curr.x;
      const dz = next.z - curr.z;
      const len = Math.hypot(dx, dz) || 1;
      const yaw = Math.atan2(dx, dz);
      // Right-hand lane offset in world coords: right = (-cos(yaw), sin(yaw))
      const rx = -Math.cos(yaw) * rightHandOffset;
      const rz = Math.sin(yaw) * rightHandOffset;
      waypoints.push({
        x: curr.x + (len > 8 ? rx : 0),
        z: curr.z + (len > 8 ? rz : 0)
      });
    }
    waypoints.push({ x: goalX, z: goalZ });
    return waypoints;
  }

  function pickDispatchSpawnOnAvenue(targetX, targetZ, minDist = 62, maxDist = 98, activeCtx = ctx) {
    const cam = getCamera(activeCtx);
    const camX = cam?.position?.x ?? targetX;
    const camZ = cam?.position?.z ?? targetZ;
    let camFwdX = 0;
    let camFwdZ = -1;
    if (cam?.matrixWorld?.elements) {
      const e = cam.matrixWorld.elements;
      camFwdX = -e[8];
      camFwdZ = -e[10];
      const l = Math.hypot(camFwdX, camFwdZ) || 1;
      camFwdX /= l;
      camFwdZ /= l;
    }

    let bestCandidate = null;
    let bestScore = -Infinity;

    for (let i = 0; i < roadGraphNodes.length; i++) {
      const n = roadGraphNodes[i];
      const d = dist2D(n.x, n.z, targetX, targetZ);
      if (d < 36 || d > 155) continue;

      let score = 100 - Math.abs(d - (minDist + maxDist) * 0.5);
      const toNodeX = (n.x - camX) / (dist2D(camX, camZ, n.x, n.z) || 1);
      const toNodeZ = (n.z - camZ) / (dist2D(camX, camZ, n.x, n.z) || 1);
      const dotCam = toNodeX * camFwdX + toNodeZ * camFwdZ;
      // Prefer spawning slightly outside direct camera center cone so arrival feels natural
      if (dotCam < 0.35) score += 28;
      if (d >= minDist && d <= maxDist) score += 35;

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = n;
      }
    }

    if (bestCandidate) {
      const yaw = Math.atan2(targetX - bestCandidate.x, targetZ - bestCandidate.z);
      return {
        x: bestCandidate.x + (-Math.cos(yaw) * 3.0),
        z: bestCandidate.z + (Math.sin(yaw) * 3.0),
        yaw
      };
    }

    const fallbackAngle = randRange(0, Math.PI * 2);
    const rawX = clamp(targetX + Math.cos(fallbackAngle) * 72, -120, 200);
    const rawZ = clamp(targetZ + Math.sin(fallbackAngle) * 72, -200, 200);
    const snapped = snapPointToNearestRoadCorridor(rawX, rawZ);
    return {
      x: snapped.x,
      z: snapped.z,
      yaw: Math.atan2(targetX - snapped.x, targetZ - snapped.z)
    };
  }

  // ============================================================================
  // SHARED PBR MATERIALS, GEOMETRIES & PROCEDURAL LIVERY TEXTURES
  // ============================================================================
  function createCanvas2D(w, h) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function makeCanvasTex(canvas, repeatX = 1, repeatY = 1) {
    if (!canvas) return null;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    if (repeatX !== 1 || repeatY !== 1) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeatX, repeatY);
    }
    tex.needsUpdate = true;
    return tex;
  }

  function generateEmsSideTexture() {
    const c = createCanvas2D(512, 256);
    if (!c) return null;
    const g = c.getContext('2d');
    g.fillStyle = '#f8fafc';
    g.fillRect(0, 0, 512, 256);

    // Crimson & Cobalt reflective emergency stripes
    g.fillStyle = '#dc2626';
    g.fillRect(0, 136, 512, 34);
    g.fillStyle = '#1d4ed8';
    g.fillRect(0, 174, 512, 16);

    // ECG Heartbeat line across white upper hull
    g.strokeStyle = '#ef4444';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(18, 96);
    g.lineTo(118, 96);
    g.lineTo(136, 62);
    g.lineTo(154, 126);
    g.lineTo(172, 42);
    g.lineTo(190, 114);
    g.lineTo(206, 96);
    g.lineTo(310, 96);
    g.stroke();

    // Blue Star of Life 6-bar emblem
    g.save();
    g.translate(418, 86);
    g.strokeStyle = '#1d4ed8';
    g.lineWidth = 14;
    g.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      g.save();
      g.rotate((k * Math.PI) / 3);
      g.beginPath();
      g.moveTo(0, -36);
      g.lineTo(0, 36);
      g.stroke();
      g.restore();
    }
    g.strokeStyle = '#ffffff';
    g.lineWidth = 3.5;
    g.beginPath();
    g.moveTo(0, -22);
    g.lineTo(0, 22);
    g.stroke();
    g.restore();

    // Bold Typography
    g.fillStyle = '#0f172a';
    g.font = '900 28px Impact, Arial Black, sans-serif';
    g.fillText('LOS SANTOS EMS', 24, 54);
    g.fillStyle = '#ffffff';
    g.font = '800 20px Arial, sans-serif';
    g.fillText('CẤP CỨU ĐÔ THỊ 911 • PARAMEDIC RESCUE', 24, 160);
    g.fillStyle = '#475569';
    g.font = '700 16px monospace';
    g.fillText('UNIT MEDIC-04 • DEL PERRO', 24, 222);

    return makeCanvasTex(c);
  }

  function generateFireTruckLiveryTexture() {
    const c = createCanvas2D(512, 256);
    if (!c) return null;
    const g = c.getContext('2d');
    g.fillStyle = '#b91c1c';
    g.fillRect(0, 0, 512, 256);

    // Classic LFD Gold-Trimmed White Reflective Mid-Band
    g.fillStyle = '#facc15';
    g.fillRect(0, 112, 512, 6);
    g.fillStyle = '#f8fafc';
    g.fillRect(0, 118, 512, 32);
    g.fillStyle = '#facc15';
    g.fillRect(0, 150, 512, 6);

    // Brushed Aluminum Equipment Roll-Up Shutters (Lower Compartments)
    for (let k = 0; k < 3; k++) {
      const sx = 28 + k * 156;
      g.fillStyle = '#94a3b8';
      g.fillRect(sx, 168, 134, 74);
      g.strokeStyle = '#475569';
      g.lineWidth = 2;
      for (let r = 176; r < 238; r += 8) {
        g.beginPath();
        g.moveTo(sx + 3, r);
        g.lineTo(sx + 131, r);
        g.stroke();
      }
      g.fillStyle = '#facc15';
      g.fillRect(sx + 50, 232, 34, 5);
    }

    // LFD Shield & Engine 07 Numbering
    g.fillStyle = '#fef08a';
    g.font = '900 30px Impact, Arial Black, sans-serif';
    g.fillText('LOS SANTOS FIRE DEPT.', 24, 56);
    g.fillStyle = '#b91c1c';
    g.font = '900 21px Arial Black, sans-serif';
    g.fillText('CỨU HỎA LFD • ENGINE 07 • 911', 26, 142);

    g.fillStyle = '#facc15';
    g.beginPath();
    g.arc(448, 58, 34, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#7f1d1d';
    g.font = '900 28px Impact, sans-serif';
    g.textAlign = 'center';
    g.fillText('E-07', 448, 68);

    return makeCanvasTex(c);
  }

  function generateGruppeSechsTexture() {
    const c = createCanvas2D(512, 256);
    if (!c) return null;
    const g = c.getContext('2d');
    g.fillStyle = '#16241c';
    g.fillRect(0, 0, 512, 256);

    // Armored dark-emerald & gold bullion stripe
    g.fillStyle = '#1f4732';
    g.fillRect(0, 88, 512, 72);
    g.fillStyle = '#eab308';
    g.fillRect(0, 84, 512, 6);
    g.fillRect(0, 158, 512, 6);

    // Rivet lines
    g.fillStyle = '#64748b';
    for (let rx = 16; rx < 500; rx += 28) {
      g.beginPath();
      g.arc(rx, 18, 2.5, 0, Math.PI * 2);
      g.arc(rx, 238, 2.5, 0, Math.PI * 2);
      g.fill();
    }

    g.fillStyle = '#f8fafc';
    g.font = '900 32px Impact, Arial Black, sans-serif';
    g.fillText('GRUPPE SECHS', 28, 134);

    g.fillStyle = '#fde047';
    g.font = '800 18px Arial, sans-serif';
    g.fillText('VẬN CHUYỂN TIỀN & VÀNG BỌC THÉP', 28, 62);
    g.fillStyle = '#94a3b8';
    g.font = '700 16px monospace';
    g.fillText('HEAVY ARMORED VAULT UNIT • #GS-908', 28, 206);

    return makeCanvasTex(c);
  }

  function generateHazardChevronTexture() {
    const c = createCanvas2D(256, 64);
    if (!c) return null;
    const g = c.getContext('2d');
    g.fillStyle = '#eab308';
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#111827';
    for (let x = -64; x < 320; x += 36) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + 18, 0);
      g.lineTo(x + 42, 64);
      g.lineTo(x + 24, 64);
      g.closePath();
      g.fill();
    }
    return makeCanvasTex(c, 3, 1);
  }

  const sharedTextures = {
    emsSide: null,
    fireSide: null,
    gruppeSide: null,
    hazardStrip: null
  };

  function ensureSharedTextures() {
    if (!sharedTextures.emsSide && typeof document !== 'undefined') {
      sharedTextures.emsSide = generateEmsSideTexture();
      sharedTextures.fireSide = generateFireTruckLiveryTexture();
      sharedTextures.gruppeSide = generateGruppeSechsTexture();
      sharedTextures.hazardStrip = generateHazardChevronTexture();
    }
  }

  const sharedMaterials = {
    emsWhite: new THREE.MeshPhysicalMaterial({ color: 0xf4f7fb, roughness: 0.2, metalness: 0.12, clearcoat: 0.85 }),
    emsRed: new THREE.MeshPhysicalMaterial({ color: 0xd91e26, roughness: 0.24, metalness: 0.18, clearcoat: 0.8 }),
    emsBlue: new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.3, metalness: 0.25 }),
    fireRed: new THREE.MeshPhysicalMaterial({ color: 0xc4161c, roughness: 0.18, metalness: 0.22, clearcoat: 0.92 }),
    fireGold: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.28, metalness: 0.72 }),
    gruppeGreen: new THREE.MeshPhysicalMaterial({ color: 0x183024, roughness: 0.36, metalness: 0.42, clearcoat: 0.45 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.14, metalness: 0.92 }),
    brushedSteel: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.32, metalness: 0.82 }),
    darkChassis: new THREE.MeshStandardMaterial({ color: 0x14171d, roughness: 0.72, metalness: 0.35 }),
    tireRubber: new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.86, metalness: 0.06 }),
    tintedGlass: new THREE.MeshPhysicalMaterial({
      color: 0x132030,
      roughness: 0.08,
      metalness: 0.2,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.84
    }),
    lspdBlack: new THREE.MeshPhysicalMaterial({ color: 0x11151c, roughness: 0.22, metalness: 0.3, clearcoat: 0.85 }),
    lspdWhite: new THREE.MeshPhysicalMaterial({ color: 0xf1f5f9, roughness: 0.22, metalness: 0.15, clearcoat: 0.85 }),
    braidedRope: new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.85, metalness: 0.12 }),
    phoneBody: new THREE.MeshStandardMaterial({ color: 0x181b22, roughness: 0.25, metalness: 0.7 }),
    phoneScreenCyan: new THREE.MeshBasicMaterial({ color: 0x67e8f9 }),
    phoneScreen911: new THREE.MeshBasicMaterial({ color: 0xff3b30 }),
    cameraFlashMat: new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    coffeeCupWhite: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 }),
    coffeeSleeveBrown: new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.78 }),
    guitarSpruce: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.36, metalness: 0.08 }),
    guitarMahogany: new THREE.MeshStandardMaterial({ color: 0x5b2412, roughness: 0.42, metalness: 0.08 }),
    velvetRed: new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.88 }),
    cashGreen: new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.42,
      emissive: 0x0d5428,
      emissiveIntensity: 0.4
    }),
    waterStreamMat: new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.35,
      roughness: 0.06,
      metalness: 0.05,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    waterDropletMat: new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }),
    steamCloudMat: new THREE.MeshBasicMaterial({
      color: 0xf1f5f9,
      transparent: true,
      opacity: 0.46,
      depthWrite: false
    }),
    rimSparkMat: new THREE.MeshBasicMaterial({
      color: 0xff9e2c,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }),
    defibSparkMat: new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }),
    flareGlowMat: new THREE.MeshBasicMaterial({
      color: 0xff2a2a,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }),
    blueEventRingMat: new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.68,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    wreckFlameOuter: new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.86,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    wreckFlameCore: new THREE.MeshBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    wetPuddleMat: new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.04,
      metalness: 0.85,
      transparent: true,
      opacity: 0.58,
      depthWrite: false
    })
  };

  const sharedGeometries = {
    unitBox: new THREE.BoxGeometry(1, 1, 1),
    unitCyl: new THREE.CylinderGeometry(1, 1, 1, 14),
    spikeQuill: new THREE.ConeGeometry(0.022, 0.145, 6),
    flareTube: new THREE.CylinderGeometry(0.032, 0.032, 0.28, 8),
    flareDisc: new THREE.CircleGeometry(0.38, 16),
    sparkStreak: new THREE.BoxGeometry(0.028, 0.028, 0.34),
    waterDropSphere: new THREE.SphereGeometry(0.11, 7, 6),
    steamPuffSphere: new THREE.SphereGeometry(0.36, 8, 7),
    puddleDisc: new THREE.CircleGeometry(1.0, 22),
    eventBeaconRing: new THREE.RingGeometry(1.35, 1.85, 32),
    eventBeaconBeam: new THREE.CylinderGeometry(1.45, 1.45, 4.4, 24, 1, true),
    ropeUnitCyl: new THREE.CylinderGeometry(0.018, 0.018, 1.0, 8),
    flameCone: new THREE.ConeGeometry(0.52, 1.45, 7)
  };
  sharedGeometries.flareDisc.rotateX(-Math.PI / 2);
  sharedGeometries.puddleDisc.rotateX(-Math.PI / 2);
  sharedGeometries.eventBeaconRing.rotateX(-Math.PI / 2);
  sharedGeometries.ropeUnitCyl.translate(0, -0.5, 0);
  sharedGeometries.flameCone.translate(0, 0.72, 0);

  // ============================================================================
  // 2. PROCEDURAL WEB AUDIO SYNTHESIZER FOR SKY-ZOOM, EMS/LFD, TIRES & CITIZENS
  // ============================================================================
  function createNpcLifeAudioSynth() {
    let ac = null;
    let master = null;
    let limiter = null;
    let noiseBuffer = null;

    // Continuous modulated loops (Water-Cannon Jet & Rim-on-Asphalt Scrape)
    let loopsInitialized = false;
    let waterNoiseSrc = null;
    let waterFilter = null;
    let waterGain = null;

    let rimNoiseSrc = null;
    let rimOsc = null;
    let rimFilter = null;
    let rimGain = null;

    function isAudioAllowed() {
      if (typeof window === 'undefined') return false;
      if (!ctx.started || ctx.paused) return false;
      if (ctx.audio && ctx.audio.muted) return false;
      return true;
    }

    function ensureAudio() {
      if (!isAudioAllowed()) return null;
      if (ac) {
        if (ac.state === 'suspended') {
          ac.resume().catch(() => {});
        }
        return ac.state === 'running' ? ac : null;
      }

      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      try {
        ac = new AudioCtor();
        limiter = ac.createDynamicsCompressor();
        limiter.threshold.setValueAtTime(-15, ac.currentTime);
        limiter.knee.setValueAtTime(16, ac.currentTime);
        limiter.ratio.setValueAtTime(7, ac.currentTime);
        limiter.attack.setValueAtTime(0.003, ac.currentTime);
        limiter.release.setValueAtTime(0.16, ac.currentTime);

        master = ac.createGain();
        master.gain.setValueAtTime(0.72, ac.currentTime);
        limiter.connect(master);
        master.connect(ac.destination);

        const sr = ac.sampleRate;
        noiseBuffer = ac.createBuffer(1, sr * 2, sr);
        const ch = noiseBuffer.getChannelData(0);
        for (let i = 0; i < ch.length; i++) {
          ch[i] = Math.random() * 2 - 1;
        }

        if (ac.state === 'suspended') {
          ac.resume().catch(() => {});
        }
        setupContinuousLoops();
        return ac;
      } catch (_) {
        ac = null;
        return null;
      }
    }

    function setupContinuousLoops() {
      if (!ac || loopsInitialized || !noiseBuffer) return;
      loopsInitialized = true;
      const now = ac.currentTime;

      // 1. High-Pressure Xe Cứu Hỏa Water-Cannon Jet Loop
      waterNoiseSrc = ac.createBufferSource();
      waterNoiseSrc.buffer = noiseBuffer;
      waterNoiseSrc.loop = true;

      waterFilter = ac.createBiquadFilter();
      waterFilter.type = 'bandpass';
      waterFilter.frequency.setValueAtTime(920, now);
      waterFilter.Q.setValueAtTime(1.15, now);

      waterGain = ac.createGain();
      waterGain.gain.setValueAtTime(0.0001, now);

      waterNoiseSrc.connect(waterFilter);
      waterFilter.connect(waterGain);
      waterGain.connect(limiter);
      waterNoiseSrc.start(now);

      // 2. Punctured Tire Bare-Rim Grinding on Asphalt Loop
      rimNoiseSrc = ac.createBufferSource();
      rimNoiseSrc.buffer = noiseBuffer;
      rimNoiseSrc.loop = true;

      rimOsc = ac.createOscillator();
      rimOsc.type = 'sawtooth';
      rimOsc.frequency.setValueAtTime(185, now);

      rimFilter = ac.createBiquadFilter();
      rimFilter.type = 'bandpass';
      rimFilter.frequency.setValueAtTime(2150, now);
      rimFilter.Q.setValueAtTime(4.2, now);

      rimGain = ac.createGain();
      rimGain.gain.setValueAtTime(0.0001, now);

      const rimOscMix = ac.createGain();
      rimOscMix.gain.setValueAtTime(0.32, now);

      rimNoiseSrc.connect(rimFilter);
      rimOsc.connect(rimOscMix);
      rimOscMix.connect(rimFilter);
      rimFilter.connect(rimGain);
      rimGain.connect(limiter);

      rimNoiseSrc.start(now);
      rimOsc.start(now);
    }

    function fireNoiseShot(duration, filterType, freqStart, freqEnd, q, peakGain, delaySec = 0) {
      const ctxA = ensureAudio();
      if (!ctxA || !noiseBuffer) return;
      const t0 = ctxA.currentTime + delaySec;
      const dur = Math.max(0.025, duration);

      const src = ctxA.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;

      const flt = ctxA.createBiquadFilter();
      flt.type = filterType;
      flt.frequency.setValueAtTime(Math.max(40, freqStart), t0);
      if (freqEnd && freqEnd !== freqStart) {
        flt.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t0 + dur);
      }
      flt.Q.setValueAtTime(Math.max(0.15, q), t0);

      const g = ctxA.createGain();
      g.gain.setValueAtTime(Math.max(0.0002, peakGain), t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      src.connect(flt);
      flt.connect(g);
      g.connect(limiter);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
    }

    function fireToneSweep(oscType, fStart, fEnd, duration, peakGain, delaySec = 0) {
      const ctxA = ensureAudio();
      if (!ctxA) return;
      const t0 = ctxA.currentTime + delaySec;
      const dur = Math.max(0.025, duration);

      const osc = ctxA.createOscillator();
      osc.type = oscType;
      osc.frequency.setValueAtTime(Math.max(22, fStart), t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(22, fEnd), t0 + dur);

      const g = ctxA.createGain();
      g.gain.setValueAtTime(Math.max(0.0002, peakGain), t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      osc.connect(g);
      g.connect(limiter);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }

    // Iconic Giang Hồ Sky-Switch Step Boom + Filtered Synth Whoosh + Satellite Click!
    function playSkySwitchStep(stepIdx = 0, isDescent = false) {
      const ctxA = ensureAudio();
      if (!ctxA) return;
      const pitchStep = clamp(stepIdx, 0, 2);

      if (!isDescent) {
        // Ascending steps (45m -> 110m -> 210m): rising harmonic punch + sub thump + airy whoosh
        const baseSub = [92, 78, 64][pitchStep];
        const synthRoot = [220, 293.66, 392.0][pitchStep];
        fireToneSweep('sine', baseSub * 1.45, 34, 0.24, 0.42, 0);
        fireToneSweep('triangle', synthRoot, synthRoot * 1.18, 0.19, 0.18, 0.01);
        fireNoiseShot(0.18, 'bandpass', 420 + pitchStep * 280, 2400 + pitchStep * 500, 1.8, 0.24, 0);
        // Crisp satellite shutter relay click
        fireNoiseShot(0.032, 'highpass', 3600, 5200, 2.5, 0.16, 0.015);
      } else {
        // Descending slam steps (110m -> 45m -> Street): heavy downward impact drop!
        const hiFreq = [440, 330, 246.94][pitchStep];
        fireToneSweep('sine', 128 - pitchStep * 14, 30, 0.26, 0.46, 0);
        fireToneSweep('sawtooth', hiFreq, hiFreq * 0.55, 0.17, 0.14, 0);
        fireNoiseShot(0.19, 'bandpass', 2200 - pitchStep * 450, 320, 1.6, 0.26, 0);
        if (pitchStep === 2) {
          // Final street lock-in bass drop & crisp confirmación chime
          fireToneSweep('sine', 98, 28, 0.36, 0.52, 0.02);
          fireToneSweep('triangle', 587.33, 880, 0.18, 0.15, 0.04);
        }
      }
    }

    function playProtagonistSpecial(protagonistId, activating = true) {
      if (!activating) {
        fireToneSweep('sine', 420, 180, 0.2, 0.18, 0);
        return;
      }
      if (protagonistId === 'franklin') {
        // Driving Slow-Mo Reflexes: sleek turbo time-dilation sweep
        fireToneSweep('sine', 520, 145, 0.32, 0.34, 0);
        fireToneSweep('triangle', 660, 990, 0.22, 0.16, 0.03);
        fireNoiseShot(0.24, 'bandpass', 1800, 420, 2.2, 0.2, 0);
      } else if (protagonistId === 'michael') {
        // Precision Headshot Bullet-Time: deep double heartbeat + crystalline focus harmonic
        fireToneSweep('sine', 84, 36, 0.14, 0.44, 0);
        fireToneSweep('sine', 76, 32, 0.16, 0.38, 0.15);
        fireToneSweep('triangle', 880, 1318.5, 0.35, 0.14, 0.04);
      } else {
        // Viper Berserk Rampage Mode: aggressive low-end sawtooth roar + concussion punch!
        fireToneSweep('sawtooth', 142, 52, 0.38, 0.32, 0);
        fireToneSweep('square', 96, 46, 0.28, 0.2, 0.02);
        fireNoiseShot(0.32, 'lowpass', 950, 220, 1.4, 0.34, 0);
      }
    }

    function playEmsSirenTwoTone(atten = 1.0) {
      const vol = clamp(atten, 0.04, 1.0) * 0.14;
      if (vol < 0.01) return;
      fireToneSweep('triangle', 660, 660, 0.22, vol, 0);
      fireToneSweep('triangle', 880, 880, 0.22, vol, 0.23);
    }

    function playDefibChargeAndShock() {
      // High-voltage capacitor charge whine (420 Hz -> 2950 Hz) followed by paddle thump!
      fireToneSweep('sine', 420, 2950, 0.65, 0.16, 0);
      fireToneSweep('sine', 165, 38, 0.18, 0.42, 0.68);
      fireNoiseShot(0.11, 'bandpass', 2400, 900, 2.6, 0.28, 0.68);
    }

    function playFireAirHorn(atten = 1.0) {
      const vol = clamp(atten, 0.05, 1.0) * 0.22;
      if (vol < 0.01) return;
      // Authentic LFD Dual-Chime Low Brass Air-Horn (F3 + C4 dissonant power fifth)
      fireToneSweep('sawtooth', 174.61, 171.0, 0.44, vol, 0);
      fireToneSweep('sawtooth', 261.63, 258.0, 0.44, vol * 0.85, 0.01);
    }

    function playSteamSizzle(atten = 1.0) {
      const vol = clamp(atten, 0.05, 1.0) * 0.16;
      if (vol < 0.01) return;
      fireNoiseShot(0.36, 'highpass', 1800, 4200, 0.9, vol, 0);
    }

    function playSpikeDeploy(atten = 1.0) {
      const vol = clamp(atten, 0.05, 1.0) * 0.24;
      fireNoiseShot(0.14, 'bandpass', 2600, 1400, 3.5, vol, 0);
      fireToneSweep('triangle', 620, 280, 0.09, vol * 0.8, 0.05);
      fireToneSweep('triangle', 780, 340, 0.08, vol * 0.7, 0.11);
    }

    function playTireBlowout(atten = 1.0) {
      const vol = clamp(atten, 0.1, 1.0);
      // Loud rubber gunshot-like pop + sustained 0.85s pressurized air hiss!
      fireToneSweep('sine', 165, 34, 0.19, 0.48 * vol, 0);
      fireNoiseShot(0.12, 'lowpass', 1100, 240, 1.2, 0.44 * vol, 0);
      fireNoiseShot(0.88, 'bandpass', 3800, 1650, 1.8, 0.30 * vol, 0.05);
    }

    function playMetallicRicochet(atten = 0.8) {
      const vol = clamp(atten, 0.08, 1.0) * 0.2;
      fireToneSweep('triangle', 1950, 740, 0.14, vol, 0);
    }

    function playFastRopeSlide(atten = 0.7) {
      const vol = clamp(atten, 0.05, 1.0) * 0.16;
      fireNoiseShot(0.45, 'bandpass', 1100, 2100, 2.8, vol, 0);
    }

    function playCameraShutter(atten = 0.8) {
      const vol = clamp(atten, 0.05, 1.0) * 0.18;
      fireNoiseShot(0.035, 'highpass', 3200, 6200, 2.2, vol, 0);
      fireToneSweep('sine', 1480, 920, 0.04, vol * 0.65, 0.045);
    }

    function play911DialBeep(atten = 0.75) {
      const vol = clamp(atten, 0.05, 1.0) * 0.13;
      // DTMF 9-1-1 Touch-Tone triad
      fireToneSweep('sine', 852, 852, 0.08, vol, 0.0);
      fireToneSweep('sine', 697, 697, 0.08, vol, 0.11);
      fireToneSweep('sine', 697, 697, 0.08, vol, 0.22);
    }

    function play911DispatchChirp() {
      fireToneSweep('square', 1180, 1180, 0.06, 0.11, 0);
      fireToneSweep('square', 1560, 1560, 0.09, 0.11, 0.075);
      fireNoiseShot(0.18, 'bandpass', 1650, 1400, 3.0, 0.09, 0.18);
    }

    function playPhoneDropClatter(atten = 0.85) {
      const vol = clamp(atten, 0.05, 1.0) * 0.18;
      fireToneSweep('triangle', 920, 380, 0.06, vol, 0);
      fireToneSweep('triangle', 760, 320, 0.05, vol * 0.65, 0.08);
    }

    // Warm Acoustic Busker Guitar Strum on Bồng Lai Pier (Am - F - C - G progressions)
    const GUITAR_CHORDS = [
      [220.0, 261.63, 329.63, 440.0],   // Am
      [174.61, 220.0, 261.63, 349.23],  // F
      [261.63, 329.63, 392.0, 523.25],  // C
      [196.0, 246.94, 293.66, 392.0]    // G
    ];

    function playGuitarChord(chordIdx = 0, atten = 0.7) {
      const ctxA = ensureAudio();
      if (!ctxA) return;
      const vol = clamp(atten, 0.03, 1.0) * 0.09;
      if (vol < 0.005) return;

      const notes = GUITAR_CHORDS[Math.abs(chordIdx) % GUITAR_CHORDS.length];
      for (let i = 0; i < notes.length; i++) {
        const delay = i * 0.036;
        const t0 = ctxA.currentTime + delay;
        const osc = ctxA.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(notes[i], t0);

        const flt = ctxA.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(1850, t0);
        flt.frequency.exponentialRampToValueAtTime(520, t0 + 0.65);

        const g = ctxA.createGain();
        g.gain.setValueAtTime(vol, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.72);

        osc.connect(flt);
        flt.connect(g);
        g.connect(limiter);
        osc.start(t0);
        osc.stop(t0 + 0.75);
      }
    }

    function updateContinuousLoops(waterIntensity = 0, rimGrindIntensity = 0, rimSpeedNorm = 0) {
      if (!ac || !loopsInitialized) {
        if (waterIntensity > 0.02 || rimGrindIntensity > 0.02) {
          ensureAudio();
        }
        if (!ac || !loopsInitialized) return;
      }

      const allow = isAudioAllowed() && ac.state === 'running';
      const now = ac.currentTime;

      const wTarget = allow ? clamp(waterIntensity, 0, 1) * 0.24 : 0.0001;
      waterGain.gain.setTargetAtTime(Math.max(0.0001, wTarget), now, 0.06);
      if (allow && waterIntensity > 0.01) {
        waterFilter.frequency.setTargetAtTime(780 + Math.sin(now * 9.0) * 160, now, 0.08);
      }

      const rTarget = allow ? clamp(rimGrindIntensity, 0, 1) * 0.22 : 0.0001;
      rimGain.gain.setTargetAtTime(Math.max(0.0001, rTarget), now, 0.05);
      if (allow && rimGrindIntensity > 0.01) {
        const sn = clamp(rimSpeedNorm, 0, 1.5);
        rimOsc.frequency.setTargetAtTime(135 + sn * 190, now, 0.06);
        rimFilter.frequency.setTargetAtTime(1650 + sn * 1400, now, 0.06);
      }
    }

    return {
      playSkySwitchStep,
      playProtagonistSpecial,
      playEmsSirenTwoTone,
      playDefibChargeAndShock,
      playFireAirHorn,
      playSteamSizzle,
      playSpikeDeploy,
      playTireBlowout,
      playMetallicRicochet,
      playFastRopeSlide,
      playCameraShutter,
      play911DialBeep,
      play911DispatchChirp,
      playPhoneDropClatter,
      playGuitarChord,
      updateContinuousLoops
    };
  }

  const synthAudio = createNpcLifeAudioSynth();

  // ============================================================================
  // 3. SCULPTED 3D EMERGENCY & EVENT VEHICLES + INTERACTIVE WORLD PROPS
  // ============================================================================
  function buildDetailedWheelAssembly(radius = 0.38, width = 0.26, isHeavyDual = false) {
    const pivot = new THREE.Group();
    const spin = new THREE.Group();
    pivot.add(spin);

    const tireGeo = new THREE.CylinderGeometry(radius, radius, isHeavyDual ? width * 1.45 : width, 18);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeo, sharedMaterials.tireRubber);
    tireMesh.castShadow = true;
    spin.add(tireMesh);

    const rimGeo = new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, (isHeavyDual ? width * 1.45 : width) + 0.016, 12);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, sharedMaterials.brushedSteel);
    spin.add(rimMesh);

    const hubGeo = new THREE.CylinderGeometry(radius * 0.24, radius * 0.24, (isHeavyDual ? width * 1.45 : width) + 0.032, 10);
    hubGeo.rotateZ(Math.PI / 2);
    const hubMesh = new THREE.Mesh(hubGeo, sharedMaterials.chrome);
    spin.add(hubMesh);

    return { pivot, spin, tireMesh, rimMesh };
  }

  /**
   * Sculpted Tiên Thành EMS Type-III Box Xe Cứu Thương:
   * - White/Crimson cab + panoramic windshield + side mirrors
   * - High-cube medical patient compartment with procedural EMS ECG/Star-of-Life livery
   * - Physically hinged Left & Right Rear Double Doors + interior stretcher gurney
   * - 6-pod Red/White roof LED lightbar + dynamic strobe materials
   */
  function buildSculptedAmbulanceMesh() {
    ensureSharedTextures();
    const root = new THREE.Group();
    root.name = 'EMS_Ambulance_Unit';

    const chassis = new THREE.Group();
    root.add(chassis);

    // Lower steel frame rails
    const frameBed = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.28, 5.76), sharedMaterials.darkChassis);
    frameBed.position.set(0, 0.42, 0);
    frameBed.castShadow = true;
    chassis.add(frameBed);

    // Front Cab Body & Sloped Hood
    const cabBody = new THREE.Mesh(new THREE.BoxGeometry(2.08, 1.38, 1.72), sharedMaterials.emsWhite);
    cabBody.position.set(0, 1.18, 1.42);
    cabBody.castShadow = true;
    cabBody.receiveShadow = true;
    chassis.add(cabBody);

    const hoodMesh = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.72, 0.96), sharedMaterials.emsRed);
    hoodMesh.position.set(0, 0.86, 2.48);
    hoodMesh.rotation.x = 0.08;
    hoodMesh.castShadow = true;
    chassis.add(hoodMesh);

    // Chrome Front Grille & Bull Bumper
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.42, 0.08), sharedMaterials.chrome);
    grille.position.set(0, 0.82, 2.96);
    chassis.add(grille);

    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.24, 0.22), sharedMaterials.chrome);
    frontBumper.position.set(0, 0.46, 2.98);
    chassis.add(frontBumper);

    // Cab Windshield & Side Windows
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.64, 0.08), sharedMaterials.tintedGlass);
    windshield.position.set(0, 1.48, 2.18);
    windshield.rotation.x = -0.34;
    chassis.add(windshield);

    const cabSideGlass = new THREE.Mesh(new THREE.BoxGeometry(2.10, 0.52, 1.12), sharedMaterials.tintedGlass);
    cabSideGlass.position.set(0, 1.48, 1.42);
    chassis.add(cabSideGlass);

    // High-Cube Rear Medical Box Module
    const sideLiveryMat = sharedTextures.emsSide
      ? new THREE.MeshPhysicalMaterial({
          map: sharedTextures.emsSide,
          roughness: 0.22,
          metalness: 0.1,
          clearcoat: 0.82
        })
      : sharedMaterials.emsWhite;

    const medBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.26, 1.96, 3.48),
      [
        sideLiveryMat,            // +X Right side
        sideLiveryMat,            // -X Left side
        sharedMaterials.emsWhite, // +Y Roof
        sharedMaterials.darkChassis, // -Y Floor
        sharedMaterials.emsWhite, // +Z Front bulkhead
        sharedMaterials.darkChassis  // -Z Recessed rear doorway cavity
      ]
    );
    medBox.position.set(0, 1.50, -1.04);
    medBox.castShadow = true;
    medBox.receiveShadow = true;
    chassis.add(medBox);

    // Interior Medical Gurney (visible when rear doors swing open!)
    const gurneyMattress = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.16, 1.85), sharedMaterials.emsRed);
    gurneyMattress.position.set(0, 0.96, -1.25);
    chassis.add(gurneyMattress);

    const gurneyFrame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.34, 1.90), sharedMaterials.chrome);
    gurneyFrame.position.set(0, 0.72, -1.25);
    chassis.add(gurneyFrame);

    // Articulated Rear Double Doors (Left & Right Hinges at z = -2.78)
    const rearDoorLeftPivot = new THREE.Group();
    rearDoorLeftPivot.position.set(1.08, 1.48, -2.78);
    chassis.add(rearDoorLeftPivot);

    const doorPanelL = new THREE.Mesh(new THREE.BoxGeometry(1.04, 1.78, 0.08), sharedMaterials.emsWhite);
    doorPanelL.position.set(-0.52, 0, 0);
    const doorStripeL = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.28, 0.09), sharedMaterials.emsRed);
    doorStripeL.position.set(-0.52, -0.22, 0);
    const doorWinL = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.48, 0.10), sharedMaterials.tintedGlass);
    doorWinL.position.set(-0.52, 0.42, 0);
    rearDoorLeftPivot.add(doorPanelL, doorStripeL, doorWinL);

    const rearDoorRightPivot = new THREE.Group();
    rearDoorRightPivot.position.set(-1.08, 1.48, -2.78);
    chassis.add(rearDoorRightPivot);

    const doorPanelR = new THREE.Mesh(new THREE.BoxGeometry(1.04, 1.78, 0.08), sharedMaterials.emsWhite);
    doorPanelR.position.set(0.52, 0, 0);
    const doorStripeR = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.28, 0.09), sharedMaterials.emsRed);
    doorStripeR.position.set(0.52, -0.22, 0);
    const doorWinR = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.48, 0.10), sharedMaterials.tintedGlass);
    doorWinR.position.set(0.52, 0.42, 0);
    rearDoorRightPivot.add(doorPanelR, doorStripeR, doorWinR);

    // Rear Step Bumper
    const rearStep = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.20, 0.28), sharedMaterials.chrome);
    rearStep.position.set(0, 0.44, -2.86);
    chassis.add(rearStep);

    // Headlights & Taillights
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xdbeafe,
      emissiveIntensity: 2.2
    });
    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0xff1e1e,
      emissive: 0xff1a1a,
      emissiveIntensity: 1.6
    });
    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.08), headlightMat);
      hl.position.set(side * 0.78, 0.82, 2.97);
      chassis.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.36, 0.08), taillightMat);
      tl.position.set(side * 0.96, 0.88, -2.81);
      chassis.add(tl);
    }

    // 6-Pod Emergency Roof Strobe Lightbar (Alternating Red & White/Amber)
    const strobeRedMat = new THREE.MeshStandardMaterial({
      color: 0xff1a1a,
      emissive: 0xff1111,
      emissiveIntensity: 3.4
    });
    const strobeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0x93c5fd,
      emissiveIntensity: 3.0
    });

    const lightbarBase = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.10, 0.34), sharedMaterials.chrome);
    lightbarBase.position.set(0, 2.53, 0.52);
    chassis.add(lightbarBase);

    for (let pIdx = 0; pIdx < 4; pIdx++) {
      const lx = -0.72 + pIdx * 0.48;
      const pod = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.14, 0.28),
        pIdx % 2 === 0 ? strobeRedMat : strobeWhiteMat
      );
      pod.position.set(lx, 2.62, 0.52);
      chassis.add(pod);
    }

    // Rear Box Upper Perimeter Strobes
    for (const side of [-1, 1]) {
      const rPod = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.14, 0.10),
        side > 0 ? strobeRedMat : strobeWhiteMat
      );
      rPod.position.set(side * 0.78, 2.34, -2.79);
      chassis.add(rPod);
    }

    // 4 Independent Wheels
    const wheelCoords = [
      { x: 0.96, y: 0.38, z: 1.88, front: true },
      { x: -0.96, y: 0.38, z: 1.88, front: true },
      { x: 0.98, y: 0.38, z: -1.62, front: false },
      { x: -0.98, y: 0.38, z: -1.62, front: false }
    ];
    const wheels = [];
    for (let i = 0; i < wheelCoords.length; i++) {
      const wc = wheelCoords[i];
      const w = buildDetailedWheelAssembly(0.38, 0.26, !wc.front);
      w.pivot.position.set(wc.x, wc.y, wc.z);
      w.isFront = wc.front;
      root.add(w.pivot);
      wheels.push(w);
    }

    return {
      root,
      chassis,
      wheels,
      rearDoorLeftPivot,
      rearDoorRightPivot,
      strobeRedMat,
      strobeWhiteMat,
      taillightMat
    };
  }

  /**
   * Sculpted Red Tiên Thành Fire Dept. Engine #07 (`Xe Cứu Hỏa LFD`):
   * - Heavy 6-wheel (3-axle) cab-over-engine crimson chassis
   * - Chrome bullbar, dual roof air horns, equipment compartments, aluminum ladder rack
   * - Articulated 360° Yaw + Elevation Pitch Roof Deck Water-Cannon Monitor Nozzle!
   */
  function buildSculptedFireTruckMesh() {
    ensureSharedTextures();
    const root = new THREE.Group();
    root.name = 'LFD_Fire_Engine_07';

    const chassis = new THREE.Group();
    root.add(chassis);

    // Heavy 3-axle steel underframe
    const underframe = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.34, 7.42), sharedMaterials.darkChassis);
    underframe.position.set(0, 0.48, 0);
    underframe.castShadow = true;
    chassis.add(underframe);

    // Forward Crew Cab (Red lower + White roof crown, classic LFD two-tone!)
    const cabLower = new THREE.Mesh(new THREE.BoxGeometry(2.32, 1.24, 2.28), sharedMaterials.fireRed);
    cabLower.position.set(0, 1.24, 2.42);
    cabLower.castShadow = true;
    cabLower.receiveShadow = true;
    chassis.add(cabLower);

    const cabRoofWhite = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.68, 2.26), sharedMaterials.emsWhite);
    cabRoofWhite.position.set(0, 2.18, 2.40);
    cabRoofWhite.castShadow = true;
    chassis.add(cabRoofWhite);

    // Split Panoramic Fire-Engine Windshield
    for (const side of [-1, 1]) {
      const ws = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.62, 0.08), sharedMaterials.tintedGlass);
      ws.position.set(side * 0.54, 1.98, 3.55);
      chassis.add(ws);
    }
    const cabSideWin = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.56, 1.64), sharedMaterials.tintedGlass);
    cabSideWin.position.set(0, 1.98, 2.38);
    chassis.add(cabSideWin);

    // Chrome Slotted Radiator Grille & Heavy Rescue Front Bumper
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.66, 0.09), sharedMaterials.chrome);
    grille.position.set(0, 1.12, 3.57);
    chassis.add(grille);

    const heavyBumper = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.30, 0.42), sharedMaterials.chrome);
    heavyBumper.position.set(0, 0.52, 3.74);
    chassis.add(heavyBumper);

    // Dual Chrome Roof Air-Horns
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.035, 0.58, 10), sharedMaterials.chrome);
      horn.rotation.x = Math.PI / 2;
      horn.position.set(side * 0.72, 2.58, 3.12);
      chassis.add(horn);
    }

    // Center Pump Control Module (Brushed Steel Pressure Gauges & Hose Intakes)
    const pumpPanel = new THREE.Mesh(new THREE.BoxGeometry(2.26, 1.62, 0.92), sharedMaterials.brushedSteel);
    pumpPanel.position.set(0, 1.42, 0.78);
    pumpPanel.castShadow = true;
    chassis.add(pumpPanel);

    for (const side of [-1, 1]) {
      const intakeValve = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.18, 12), sharedMaterials.chrome);
      intakeValve.rotation.z = Math.PI / 2;
      intakeValve.position.set(side * 1.16, 1.12, 0.78);
      chassis.add(intakeValve);
    }

    // Main Rear Tanker & Equipment Body with Procedural LFD Livery
    const fireSideMat = sharedTextures.fireSide
      ? new THREE.MeshPhysicalMaterial({
          map: sharedTextures.fireSide,
          roughness: 0.20,
          metalness: 0.18,
          clearcoat: 0.88
        })
      : sharedMaterials.fireRed;

    const rearBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.34, 1.78, 3.98),
      [
        fireSideMat,
        fireSideMat,
        sharedMaterials.brushedSteel,
        sharedMaterials.darkChassis,
        sharedMaterials.fireRed,
        sharedMaterials.fireRed
      ]
    );
    rearBody.position.set(0, 1.52, -1.68);
    rearBody.castShadow = true;
    rearBody.receiveShadow = true;
    chassis.add(rearBody);

    // Right-Side Aluminum Extension Ladder Rack (2 rails + 12 rungs)
    const ladderGroup = new THREE.Group();
    ladderGroup.position.set(1.22, 2.08, -1.65);
    const railGeo = new THREE.BoxGeometry(0.05, 0.07, 3.65);
    const railTop = new THREE.Mesh(railGeo, sharedMaterials.chrome);
    railTop.position.y = 0.22;
    const railBot = new THREE.Mesh(railGeo, sharedMaterials.chrome);
    railBot.position.y = -0.22;
    ladderGroup.add(railTop, railBot);

    const rungGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.44, 8);
    for (let r = 0; r < 11; r++) {
      const rung = new THREE.Mesh(rungGeo, sharedMaterials.chrome);
      rung.position.set(0, 0, -1.6 + r * 0.32);
      ladderGroup.add(rung);
    }
    chassis.add(ladderGroup);

    // Articulated 360° Roof Deck Water-Cannon Turret (Monitor Nozzle!)
    const turretYawPivot = new THREE.Group();
    turretYawPivot.position.set(0, 2.38, 0.78);
    chassis.add(turretYawPivot);

    const riserPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.38, 12), sharedMaterials.chrome);
    riserPipe.position.y = 0.16;
    turretYawPivot.add(riserPipe);

    const turretPitchPivot = new THREE.Group();
    turretPitchPivot.position.set(0, 0.36, 0);
    turretYawPivot.add(turretPitchPivot);

    const cannonBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.105, 0.86, 12), sharedMaterials.chrome);
    cannonBarrel.rotation.x = Math.PI / 2;
    cannonBarrel.position.set(0, 0, 0.38);
    turretPitchPivot.add(cannonBarrel);

    const nozzleTip = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.18, 12), sharedMaterials.fireRed);
    nozzleTip.rotation.x = Math.PI / 2;
    nozzleTip.position.set(0, 0, 0.84);
    turretPitchPivot.add(nozzleTip);

    const nozzleMuzzleAnchor = new THREE.Object3D();
    nozzleMuzzleAnchor.position.set(0, 0, 0.94);
    turretPitchPivot.add(nozzleMuzzleAnchor);

    // Emergency Strobe Lightbar & Headlights
    const strobeRedMat = new THREE.MeshStandardMaterial({
      color: 0xff1a1a,
      emissive: 0xff1111,
      emissiveIntensity: 3.8
    });
    const strobeAmberMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 3.5
    });
    const hlMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xe0f2fe,
      emissiveIntensity: 2.4
    });

    const lightbarBar = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.11, 0.36), sharedMaterials.chrome);
    lightbarBar.position.set(0, 2.57, 2.65);
    chassis.add(lightbarBar);

    for (let k = 0; k < 4; k++) {
      const pod = new THREE.Mesh(
        new THREE.BoxGeometry(0.40, 0.15, 0.30),
        k % 2 === 0 ? strobeRedMat : strobeAmberMat
      );
      pod.position.set(-0.75 + k * 0.50, 2.66, 2.65);
      chassis.add(pod);
    }

    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.08), hlMat);
      hl.position.set(side * 0.92, 0.98, 3.58);
      chassis.add(hl);

      const rearBeacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.12, 0.18, 10),
        side > 0 ? strobeRedMat : strobeAmberMat
      );
      rearBeacon.position.set(side * 0.94, 2.48, -3.52);
      chassis.add(rearBeacon);
    }

    // 6 Heavy-Duty Wheels (Front Steer Axle + Tandem Dual Rear Axles)
    const wheelSpecs = [
      { x: 1.08, y: 0.44, z: 2.28, front: true },
      { x: -1.08, y: 0.44, z: 2.28, front: true },
      { x: 1.08, y: 0.44, z: -1.55, front: false },
      { x: -1.08, y: 0.44, z: -1.55, front: false },
      { x: 1.08, y: 0.44, z: -2.68, front: false },
      { x: -1.08, y: 0.44, z: -2.68, front: false }
    ];
    const wheels = [];
    for (let i = 0; i < wheelSpecs.length; i++) {
      const ws = wheelSpecs[i];
      const w = buildDetailedWheelAssembly(0.44, 0.29, !ws.front);
      w.pivot.position.set(ws.x, ws.y, ws.z);
      w.isFront = ws.front;
      root.add(w.pivot);
      wheels.push(w);
    }

    return {
      root,
      chassis,
      wheels,
      turretYawPivot,
      turretPitchPivot,
      nozzleMuzzleAnchor,
      strobeRedMat,
      strobeAmberMat
    };
  }

  /**
   * Sculpted Gruppe Sechs Armored Bank Cash Van (`Xe Bọc Thép Chở Tiền`):
   * - Armored dark-emerald & gold bullion hull + sloped ballistic hood
   * - Reinforced Twin Vault Rear Doors that physically blow open when breached!
   */
  function buildArmoredCashVanMesh() {
    ensureSharedTextures();
    const root = new THREE.Group();
    root.name = 'GruppeSechs_Armored_Van';

    const chassis = new THREE.Group();
    root.add(chassis);

    const baseFrame = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.34, 5.88), sharedMaterials.darkChassis);
    baseFrame.position.set(0, 0.44, 0);
    baseFrame.castShadow = true;
    chassis.add(baseFrame);

    const sideMat = sharedTextures.gruppeSide
      ? new THREE.MeshPhysicalMaterial({
          map: sharedTextures.gruppeSide,
          roughness: 0.34,
          metalness: 0.45,
          clearcoat: 0.48
        })
      : sharedMaterials.gruppeGreen;

    const vaultHull = new THREE.Mesh(
      new THREE.BoxGeometry(2.24, 1.92, 3.86),
      [
        sideMat,
        sideMat,
        sharedMaterials.gruppeGreen,
        sharedMaterials.darkChassis,
        sharedMaterials.gruppeGreen,
        sharedMaterials.darkChassis
      ]
    );
    vaultHull.position.set(0, 1.52, -0.88);
    vaultHull.castShadow = true;
    vaultHull.receiveShadow = true;
    chassis.add(vaultHull);

    // Armored Cab & Ballistic Visor Windshield
    const cabHull = new THREE.Mesh(new THREE.BoxGeometry(2.16, 1.48, 1.78), sharedMaterials.gruppeGreen);
    cabHull.position.set(0, 1.30, 1.76);
    cabHull.castShadow = true;
    chassis.add(cabHull);

    const slopedNose = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.82, 0.88), sharedMaterials.gruppeGreen);
    slopedNose.position.set(0, 0.94, 2.74);
    slopedNose.rotation.x = 0.14;
    slopedNose.castShadow = true;
    chassis.add(slopedNose);

    const ramBar = new THREE.Mesh(new THREE.BoxGeometry(2.30, 0.36, 0.28), sharedMaterials.brushedSteel);
    ramBar.position.set(0, 0.54, 3.16);
    chassis.add(ramBar);

    const visorGlass = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.42, 0.10), sharedMaterials.tintedGlass);
    visorGlass.position.set(0, 1.62, 2.62);
    visorGlass.rotation.x = -0.24;
    chassis.add(visorGlass);

    // Gold Bullion Stacks visible inside rear vault once doors are breached!
    const interiorLoot = new THREE.Group();
    interiorLoot.position.set(0, 0.82, -1.95);
    for (let k = 0; k < 3; k++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.34, 0.42), sharedMaterials.cashGreen);
      crate.position.set(-0.55 + k * 0.55, 0.18, 0);
      interiorLoot.add(crate);
    }
    chassis.add(interiorLoot);

    // Breachable Twin Rear Vault Doors
    const doorLeftPivot = new THREE.Group();
    doorLeftPivot.position.set(1.06, 1.50, -2.81);
    chassis.add(doorLeftPivot);
    const dLeft = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.76, 0.10), sharedMaterials.gruppeGreen);
    dLeft.position.set(-0.51, 0, 0);
    const lockBarL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.48, 0.14), sharedMaterials.brushedSteel);
    lockBarL.position.set(-0.88, 0, -0.02);
    doorLeftPivot.add(dLeft, lockBarL);

    const doorRightPivot = new THREE.Group();
    doorRightPivot.position.set(-1.06, 1.50, -2.81);
    chassis.add(doorRightPivot);
    const dRight = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.76, 0.10), sharedMaterials.gruppeGreen);
    dRight.position.set(0.51, 0, 0);
    const lockBarR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.48, 0.14), sharedMaterials.brushedSteel);
    lockBarR.position.set(0.88, 0, -0.02);
    doorRightPivot.add(dRight, lockBarR);

    // Amber Roof Security Beacon
    const amberMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.8
    });
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 12), amberMat);
    beacon.position.set(0, 2.56, 1.65);
    chassis.add(beacon);

    const wheels = [];
    const wPos = [
      { x: 1.02, y: 0.42, z: 2.02, front: true },
      { x: -1.02, y: 0.42, z: 2.02, front: true },
      { x: 1.04, y: 0.42, z: -1.72, front: false },
      { x: -1.04, y: 0.42, z: -1.72, front: false }
    ];
    for (let i = 0; i < wPos.length; i++) {
      const wp = wPos[i];
      const w = buildDetailedWheelAssembly(0.42, 0.28, !wp.front);
      w.pivot.position.set(wp.x, wp.y, wp.z);
      w.isFront = wp.front;
      root.add(w.pivot);
      wheels.push(w);
    }

    return {
      root,
      chassis,
      wheels,
      doorLeftPivot,
      doorRightPivot,
      interiorLoot,
      amberMat
    };
  }

  // ============================================================================
  // 3B. SCULPTED TACTICAL & LIVING-WORLD 3D PROPS SUITE
  // ============================================================================
  function buildSpikeStripMesh(stripWidth = 7.6) {
    ensureSharedTextures();
    const group = new THREE.Group();
    group.name = 'LSPD_Spike_Strip';

    const hazardMat = sharedTextures.hazardStrip
      ? new THREE.MeshStandardMaterial({ map: sharedTextures.hazardStrip, roughness: 0.45, metalness: 0.25 })
      : sharedMaterials.fireGold;

    // Accordion scissor steel base bar across the lane (X-axis = width across road)
    const railFront = new THREE.Mesh(new THREE.BoxGeometry(stripWidth, 0.045, 0.09), sharedMaterials.brushedSteel);
    railFront.position.set(0, 0.025, 0.14);
    const railRear = new THREE.Mesh(new THREE.BoxGeometry(stripWidth, 0.045, 0.09), sharedMaterials.brushedSteel);
    railRear.position.set(0, 0.025, -0.14);
    const centerBar = new THREE.Mesh(new THREE.BoxGeometry(stripWidth + 0.16, 0.032, 0.36), hazardMat);
    centerBar.position.set(0, 0.016, 0);
    group.add(railFront, railRear, centerBar);

    // 28 Hollow Steel Tire-Puncture Spikes angled upward
    const spikeCount = 28;
    const stepX = (stripWidth - 0.5) / (spikeCount - 1);
    for (let i = 0; i < spikeCount; i++) {
      const sx = -(stripWidth - 0.5) * 0.5 + i * stepX;
      const sz = (i % 2 === 0 ? 1 : -1) * 0.075;
      const quill = new THREE.Mesh(sharedGeometries.spikeQuill, sharedMaterials.chrome);
      quill.position.set(sx, 0.095, sz);
      quill.rotation.x = (i % 2 === 0 ? 1 : -1) * 0.12;
      group.add(quill);
    }

    // Deploying Officer Storage Case & 2 Flickering Red Road Flares at Both Ends
    const flareDiscs = [];
    for (const side of [-1, 1]) {
      const endX = side * (stripWidth * 0.5 + 0.32);
      const flareStick = new THREE.Mesh(sharedGeometries.flareTube, sharedMaterials.emsRed);
      flareStick.rotation.z = Math.PI * 0.46;
      flareStick.position.set(endX, 0.04, 0.24);
      group.add(flareStick);

      const glowDisc = new THREE.Mesh(sharedGeometries.flareDisc, sharedMaterials.flareGlowMat);
      glowDisc.position.set(endX + side * 0.08, 0.03, 0.24);
      group.add(glowDisc);
      flareDiscs.push(glowDisc);
    }

    group.userData.flareDiscs = flareDiscs;
    return group;
  }

  function buildCruiserOpenDoorRig() {
    const group = new THREE.Group();
    group.name = 'LSPD_Cruiser_OpenDoors';

    // Left (+X) & Right (-X) articulated ballistic cruiser front doors hinged near front A-pillar
    const createDoor = (isLeft) => {
      const sign = isLeft ? 1 : -1;
      const hinge = new THREE.Group();
      hinge.position.set(sign * 0.98, 0.68, 0.72);

      const lowerPanel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 1.06), sharedMaterials.lspdWhite);
      lowerPanel.position.set(0, 0, -0.53);
      lowerPanel.castShadow = true;

      const trimBand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 1.07), sharedMaterials.lspdBlack);
      trimBand.position.set(0, -0.22, -0.53);

      const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.96), sharedMaterials.lspdBlack);
      windowFrame.position.set(0, 0.48, -0.50);

      const glassPane = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.84), sharedMaterials.tintedGlass);
      glassPane.position.set(0, 0.46, -0.50);

      hinge.add(lowerPanel, trimBand, windowFrame, glassPane);
      return hinge;
    };

    const leftDoor = createDoor(true);
    const rightDoor = createDoor(false);
    group.add(leftDoor, rightDoor);
    group.userData.leftDoor = leftDoor;
    group.userData.rightDoor = rightDoor;
    return group;
  }

  function buildSmartphoneProp(is911Alert = false) {
    const phone = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.148, 0.012), sharedMaterials.phoneBody);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.066, 0.132),
      is911Alert ? sharedMaterials.phoneScreen911 : sharedMaterials.phoneScreenCyan
    );
    screen.position.z = 0.007;

    const flashQuad = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), sharedMaterials.cameraFlashMat);
    flashQuad.position.set(0, 0.05, -0.015);
    flashQuad.visible = false;

    phone.add(body, screen, flashQuad);
    phone.userData.flashQuad = flashQuad;
    phone.userData.screen = screen;
    return phone;
  }

  function buildCoffeeCupProp() {
    const cup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.034, 0.125, 12), sharedMaterials.coffeeCupWhite);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.039, 0.052, 12), sharedMaterials.coffeeSleeveBrown);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.046, 0.018, 12), sharedMaterials.darkChassis);
    lid.position.y = 0.068;
    cup.add(body, sleeve, lid);
    return cup;
  }

  function buildMedkitAndDefibProp() {
    const group = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.26), sharedMaterials.emsRed);
    box.position.y = 0.11;
    box.castShadow = true;

    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.055), sharedMaterials.emsWhite);
    crossH.position.y = 0.225;
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.02, 0.18), sharedMaterials.emsWhite);
    crossV.position.y = 0.225;

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.03), sharedMaterials.darkChassis);
    handle.position.set(0, 0.24, 0.11);

    const defibSpark = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), sharedMaterials.defibSparkMat);
    defibSpark.position.set(0.32, 0.22, 0);
    defibSpark.visible = false;

    group.add(box, crossH, crossV, handle, defibSpark);
    group.userData.defibSpark = defibSpark;
    return group;
  }

  function buildAcousticGuitarProp() {
    const guitar = new THREE.Group();
    const lowerBout = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.09, 16), sharedMaterials.guitarSpruce);
    lowerBout.rotation.x = Math.PI / 2;
    lowerBout.position.set(-0.10, -0.04, 0.12);

    const upperBout = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.085, 14), sharedMaterials.guitarSpruce);
    upperBout.rotation.x = Math.PI / 2;
    upperBout.position.set(0.08, 0.03, 0.12);

    const soundHole = new THREE.Mesh(new THREE.CircleGeometry(0.052, 14), sharedMaterials.darkChassis);
    soundHole.position.set(0.02, 0.0, 0.168);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.042, 0.028), sharedMaterials.guitarMahogany);
    neck.position.set(0.34, 0.13, 0.13);
    neck.rotation.z = 0.38;

    guitar.add(lowerBout, upperBout, soundHole, neck);
    return guitar;
  }

  function buildOpenGuitarCaseWithTips() {
    const gCase = new THREE.Group();
    const baseTray = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.06, 0.42), sharedMaterials.darkChassis);
    baseTray.position.y = 0.03;
    const velvetPad = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.02, 0.36), sharedMaterials.velvetRed);
    velvetPad.position.y = 0.065;

    const lidTray = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.04, 0.40), sharedMaterials.darkChassis);
    lidTray.position.set(0, 0.21, -0.24);
    lidTray.rotation.x = -1.15;

    for (let i = 0; i < 4; i++) {
      const bill = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.012, 0.065), sharedMaterials.cashGreen);
      bill.position.set(-0.22 + i * 0.14, 0.08, (i % 2 === 0 ? 1 : -1) * 0.06);
      bill.rotation.y = i * 0.45;
      gCase.add(bill);
    }

    gCase.add(baseTray, velvetPad, lidTray);
    return gCase;
  }

  function buildRetroBoomboxProp() {
    const boom = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.32, 0.20), sharedMaterials.brushedSteel);
    body.position.y = 0.16;
    body.castShadow = true;

    for (const side of [-1, 1]) {
      const woofer = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 16), sharedMaterials.darkChassis);
      woofer.rotation.x = Math.PI / 2;
      woofer.position.set(side * 0.19, 0.15, 0.095);
      boom.add(woofer);
    }

    const eqScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.08), sharedMaterials.phoneScreenCyan);
    eqScreen.position.set(0, 0.22, 0.102);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.035, 0.04), sharedMaterials.chrome);
    handle.position.set(0, 0.35, 0);

    boom.add(body, eqScreen, handle);
    return boom;
  }

  function buildHeavyCashBagProp() {
    const bag = new THREE.Group();
    const duffle = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.56, 12), sharedMaterials.gruppeGreen);
    duffle.rotation.z = Math.PI / 2;
    duffle.position.y = 0.20;
    duffle.castShadow = true;

    const cashStack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.18), sharedMaterials.cashGreen);
    cashStack.position.set(0, 0.34, 0);

    const glowRing = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.54, 22),
      new THREE.MeshBasicMaterial({
        color: 0x4ade80,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.03;

    bag.add(duffle, cashStack, glowRing);
    bag.userData.glowRing = glowRing;
    return bag;
  }

  function buildPersistentWreckFireGroup() {
    const fireGrp = new THREE.Group();
    const cones = [];
    for (let i = 0; i < 4; i++) {
      const isCore = i >= 2;
      const cone = new THREE.Mesh(
        sharedGeometries.flameCone,
        isCore ? sharedMaterials.wreckFlameCore : sharedMaterials.wreckFlameOuter
      );
      const angle = (i / 4) * Math.PI * 2;
      cone.position.set(Math.cos(angle) * 0.25, 0.15, Math.sin(angle) * 0.32);
      cone.scale.set(isCore ? 0.68 : 1.15, isCore ? 0.85 : 1.25, isCore ? 0.68 : 1.15);
      fireGrp.add(cone);
      cones.push(cone);
    }
    fireGrp.userData.cones = cones;
    return fireGrp;
  }

  // ============================================================================
  // 4. SCENE ROOT, POOLED 3D PARTICLE/WATER-ARC FX & FLOATING SPEECH BUBBLES
  // ============================================================================
  const npcLifeRoot = new THREE.Group();
  npcLifeRoot.name = 'NpcLifeSystemRoot';
  let rootAttachedScene = null;

  function ensureSceneRootAttached(activeCtx = ctx) {
    const scene = getScene(activeCtx);
    if (scene && rootAttachedScene !== scene) {
      if (npcLifeRoot.parent) npcLifeRoot.parent.remove(npcLifeRoot);
      scene.add(npcLifeRoot);
      rootAttachedScene = scene;
    }
    return scene;
  }

  // ---------------------------------------------------------------------------
  // 4A. Rim-Grinding Sparks, Parabolic Water-Cannon Arc, Droplets, Steam & Puddles
  // ---------------------------------------------------------------------------
  const RIM_SPARK_POOL_SIZE = 150;
  const WATER_DROP_POOL_SIZE = 96;
  const STEAM_PUFF_POOL_SIZE = 44;
  const WET_PUDDLE_POOL_SIZE = 16;
  const DROPPED_PHONE_POOL_SIZE = 10;

  const rimSparkPool = [];
  const waterDropPool = [];
  const steamPuffPool = [];
  const wetPuddlePool = [];
  const droppedPhonePool = [];

  let rimSparkCursor = 0;
  let waterDropCursor = 0;
  let steamPuffCursor = 0;
  let wetPuddleCursor = 0;
  let droppedPhoneCursor = 0;
  let fxPoolsBuilt = false;

  // Dynamic 26-segment 3D Parabolic Water-Cannon Ribbon/Tube Mesh (supports up to 2 Fire Trucks simultaneously)
  const WATER_ARC_SEGMENTS = 26;
  const WATER_ARC_RADIAL = 8;

  function createDynamicWaterArcStreamMesh() {
    const vertCount = (WATER_ARC_SEGMENTS + 1) * (WATER_ARC_RADIAL + 1);
    const positions = new Float32Array(vertCount * 3);
    const normals = new Float32Array(vertCount * 3);
    const uvs = new Float32Array(vertCount * 2);
    const indices = [];

    for (let s = 0; s <= WATER_ARC_SEGMENTS; s++) {
      for (let r = 0; r <= WATER_ARC_RADIAL; r++) {
        const idx = s * (WATER_ARC_RADIAL + 1) + r;
        uvs[idx * 2] = s / WATER_ARC_SEGMENTS;
        uvs[idx * 2 + 1] = r / WATER_ARC_RADIAL;
      }
    }

    for (let s = 0; s < WATER_ARC_SEGMENTS; s++) {
      for (let r = 0; r < WATER_ARC_RADIAL; r++) {
        const a = s * (WATER_ARC_RADIAL + 1) + r;
        const b = (s + 1) * (WATER_ARC_RADIAL + 1) + r;
        const c = (s + 1) * (WATER_ARC_RADIAL + 1) + (r + 1);
        const d = s * (WATER_ARC_RADIAL + 1) + (r + 1);
        indices.push(a, b, d, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);

    const mesh = new THREE.Mesh(geo, sharedMaterials.waterStreamMat);
    mesh.frustumCulled = false;
    mesh.visible = false;
    npcLifeRoot.add(mesh);
    return { mesh, geo, positions, normals };
  }

  function updateParabolicWaterArcGeometry(arcObj, startVec, targetVec, arcHeight = 2.6, pulsePhase = 0) {
    if (!arcObj) return;
    const pos = arcObj.positions;
    const nrm = arcObj.normals;

    for (let s = 0; s <= WATER_ARC_SEGMENTS; s++) {
      const t = s / WATER_ARC_SEGMENTS;
      const cx = lerp(startVec.x, targetVec.x, t);
      const cz = lerp(startVec.z, targetVec.z, t);
      // Ballistic parabolic trajectory peaking smoothly along flight path
      const parabolaLift = 4.0 * t * (1.0 - t) * arcHeight;
      const cy = lerp(startVec.y, targetVec.y, t) + parabolaLift;

      // Tangent direction along parabola for perpendicular cross-section ring
      const dtStep = 0.02;
      const tNext = Math.min(1.0, t + dtStep);
      const nx = lerp(startVec.x, targetVec.x, tNext) - cx;
      const nz = lerp(startVec.z, targetVec.z, tNext) - cz;
      const ny = (lerp(startVec.y, targetVec.y, tNext) + 4.0 * tNext * (1.0 - tNext) * arcHeight) - cy;
      _vecA.set(nx, ny, nz);
      if (_vecA.lengthSq() < 1e-6) _vecA.set(0, -1, 0);
      else _vecA.normalize();

      // Orthonormal basis (sideVec, binormalVec) perpendicular to tangent _vecA
      _vecB.crossVectors(_vecA, _upAxis);
      if (_vecB.lengthSq() < 1e-5) _vecB.set(1, 0, 0);
      else _vecB.normalize();
      _vecC.crossVectors(_vecB, _vecA).normalize();

      // Water stream expands naturally from tight 0.065m nozzle jet into 0.42m pressurized spray cone!
      const waveFlutter = 1.0 + Math.sin(t * 18.0 - pulsePhase * 22.0) * 0.14;
      const radius = lerp(0.065, 0.44, Math.pow(t, 0.82)) * waveFlutter;

      for (let r = 0; r <= WATER_ARC_RADIAL; r++) {
        const theta = (r / WATER_ARC_RADIAL) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        const rx = _vecB.x * cosT + _vecC.x * sinT;
        const ry = _vecB.y * cosT + _vecC.y * sinT;
        const rz = _vecB.z * cosT + _vecC.z * sinT;

        const vIdx = (s * (WATER_ARC_RADIAL + 1) + r) * 3;
        pos[vIdx] = cx + rx * radius;
        pos[vIdx + 1] = cy + ry * radius;
        pos[vIdx + 2] = cz + rz * radius;

        nrm[vIdx] = rx;
        nrm[vIdx + 1] = ry;
        nrm[vIdx + 2] = rz;
      }
    }

    arcObj.geo.attributes.position.needsUpdate = true;
    arcObj.geo.attributes.normal.needsUpdate = true;
    arcObj.mesh.visible = true;
  }

  function ensureFXPoolsInitialized() {
    if (fxPoolsBuilt) return;
    fxPoolsBuilt = true;

    for (let i = 0; i < RIM_SPARK_POOL_SIZE; i++) {
      const mat = sharedMaterials.rimSparkMat.clone();
      const mesh = new THREE.Mesh(sharedGeometries.sparkStreak, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      npcLifeRoot.add(mesh);
      rimSparkPool.push({
        active: false,
        mesh,
        mat,
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        age: 0,
        maxLife: 0.35
      });
    }

    for (let i = 0; i < WATER_DROP_POOL_SIZE; i++) {
      const mat = sharedMaterials.waterDropletMat.clone();
      const mesh = new THREE.Mesh(sharedGeometries.waterDropSphere, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      npcLifeRoot.add(mesh);
      waterDropPool.push({
        active: false,
        mesh,
        mat,
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        age: 0,
        maxLife: 0.65,
        startScale: 0.8,
        endScale: 2.2
      });
    }

    for (let i = 0; i < STEAM_PUFF_POOL_SIZE; i++) {
      const mat = sharedMaterials.steamCloudMat.clone();
      const mesh = new THREE.Mesh(sharedGeometries.steamPuffSphere, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      npcLifeRoot.add(mesh);
      steamPuffPool.push({
        active: false,
        mesh,
        mat,
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        age: 0,
        maxLife: 1.5,
        startScale: 0.6,
        endScale: 3.1
      });
    }

    for (let i = 0; i < WET_PUDDLE_POOL_SIZE; i++) {
      const mat = sharedMaterials.wetPuddleMat.clone();
      const mesh = new THREE.Mesh(sharedGeometries.puddleDisc, mat);
      mesh.visible = false;
      npcLifeRoot.add(mesh);
      wetPuddlePool.push({
        active: false,
        mesh,
        mat,
        age: 0,
        maxLife: 14.0,
        maxRadius: 2.8
      });
    }

    for (let i = 0; i < DROPPED_PHONE_POOL_SIZE; i++) {
      const prop = buildSmartphoneProp(true);
      prop.visible = false;
      npcLifeRoot.add(prop);
      droppedPhonePool.push({
        active: false,
        mesh: prop,
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        rx: 0, ry: 0, rz: 0,
        groundY: 0.22,
        life: 0
      });
    }
  }

  function spawnRimGrindingSparks(wx, wy, wz, carVx, carVz, count = 3) {
    ensureFXPoolsInitialized();
    for (let k = 0; k < count; k++) {
      const sp = rimSparkPool[rimSparkCursor];
      rimSparkCursor = (rimSparkCursor + 1) % RIM_SPARK_POOL_SIZE;

      sp.active = true;
      sp.age = 0;
      sp.maxLife = randRange(0.18, 0.42);
      sp.x = wx + randRange(-0.08, 0.08);
      sp.y = wy + 0.04;
      sp.z = wz + randRange(-0.08, 0.08);

      // Eject sparks backward relative to wheel travel with bright orange-gold fountain scatter
      sp.vx = -carVx * randRange(0.32, 0.64) + randRange(-2.6, 2.6);
      sp.vy = randRange(1.4, 4.6);
      sp.vz = -carVz * randRange(0.32, 0.64) + randRange(-2.6, 2.6);

      sp.mat.color.setHex(Math.random() > 0.35 ? 0xff8c1a : 0xffe066);
      sp.mat.opacity = 0.96;
      sp.mesh.position.set(sp.x, sp.y, sp.z);
      sp.mesh.scale.set(1.0, 1.0, randRange(0.75, 1.65));
      _vecD.set(sp.x + sp.vx, sp.y + sp.vy, sp.z + sp.vz);
      sp.mesh.lookAt(_vecD);
      sp.mesh.visible = true;
    }
  }

  function spawnWaterCannonDroplet(x, y, z, vx, vy, vz) {
    ensureFXPoolsInitialized();
    const d = waterDropPool[waterDropCursor];
    waterDropCursor = (waterDropCursor + 1) % WATER_DROP_POOL_SIZE;

    d.active = true;
    d.age = 0;
    d.maxLife = randRange(0.42, 0.78);
    d.x = x;
    d.y = y;
    d.z = z;
    d.vx = vx + randRange(-1.4, 1.4);
    d.vy = vy + randRange(-0.9, 1.2);
    d.vz = vz + randRange(-1.4, 1.4);
    d.startScale = randRange(0.65, 1.15);
    d.endScale = randRange(2.1, 3.4);
    d.mat.opacity = 0.85;
    d.mesh.position.set(x, y, z);
    d.mesh.scale.setScalar(d.startScale);
    d.mesh.visible = true;
  }

  function spawnExtinguishSteamPuff(x, y, z) {
    ensureFXPoolsInitialized();
    const st = steamPuffPool[steamPuffCursor];
    steamPuffCursor = (steamPuffCursor + 1) % STEAM_PUFF_POOL_SIZE;

    st.active = true;
    st.age = 0;
    st.maxLife = randRange(1.1, 1.95);
    st.x = x + randRange(-0.85, 0.85);
    st.y = y + randRange(0.1, 0.5);
    st.z = z + randRange(-0.85, 0.85);
    st.vx = randRange(-0.9, 0.9);
    st.vy = randRange(1.8, 3.6);
    st.vz = randRange(-0.9, 0.9);
    st.startScale = randRange(0.55, 0.95);
    st.endScale = randRange(2.4, 4.2);
    st.mat.opacity = 0.52;
    st.mesh.position.set(st.x, st.y, st.z);
    st.mesh.scale.setScalar(st.startScale);
    st.mesh.visible = true;
  }

  function spawnWetAsphaltPuddle(x, y, z, maxRadius = 2.8) {
    ensureFXPoolsInitialized();
    const pd = wetPuddlePool[wetPuddleCursor];
    wetPuddleCursor = (wetPuddleCursor + 1) % WET_PUDDLE_POOL_SIZE;

    pd.active = true;
    pd.age = 0;
    pd.maxLife = 15.0;
    pd.maxRadius = maxRadius;
    pd.mat.opacity = 0.62;
    pd.mesh.position.set(x, y + 0.025, z);
    pd.mesh.scale.setScalar(0.35);
    pd.mesh.visible = true;
  }

  function spawnDroppedWitnessPhone(x, y, z, groundY = 0.22) {
    ensureFXPoolsInitialized();
    const dp = droppedPhonePool[droppedPhoneCursor];
    droppedPhoneCursor = (droppedPhoneCursor + 1) % DROPPED_PHONE_POOL_SIZE;

    dp.active = true;
    dp.life = 9.0;
    dp.x = x;
    dp.y = y;
    dp.z = z;
    dp.groundY = groundY;
    dp.vx = randRange(-1.6, 1.6);
    dp.vy = randRange(2.2, 3.6);
    dp.vz = randRange(-1.6, 1.6);
    dp.rx = randRange(-12, 12);
    dp.ry = randRange(-10, 10);
    dp.rz = randRange(-12, 12);
    dp.mesh.position.set(x, y, z);
    dp.mesh.visible = true;
  }

  function updateNpcLifeWorldFX(dt, activeCtx = ctx) {
    if (!fxPoolsBuilt) return;

    // 1. Rim-Grinding Sparks with Asphalt Bounce
    for (let i = 0; i < RIM_SPARK_POOL_SIZE; i++) {
      const sp = rimSparkPool[i];
      if (!sp.active) continue;
      sp.age += dt;
      const t = sp.age / sp.maxLife;
      if (t >= 1.0) {
        sp.active = false;
        sp.mesh.visible = false;
        continue;
      }
      sp.vy -= 16.5 * dt;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.z += sp.vz * dt;

      const gY = sampleGroundY(sp.x, sp.z, 0.02, activeCtx);
      if (sp.y <= gY + 0.02 && sp.vy < 0) {
        sp.y = gY + 0.02;
        sp.vy = -sp.vy * 0.45;
        sp.vx *= 0.78;
        sp.vz *= 0.78;
      }

      sp.mesh.position.set(sp.x, sp.y, sp.z);
      _vecD.set(sp.x + sp.vx, sp.y + sp.vy, sp.z + sp.vz);
      sp.mesh.lookAt(_vecD);
      sp.mat.opacity = (1.0 - t) * 0.96;
    }

    // 2. Water-Cannon Droplets
    for (let i = 0; i < WATER_DROP_POOL_SIZE; i++) {
      const d = waterDropPool[i];
      if (!d.active) continue;
      d.age += dt;
      const t = d.age / d.maxLife;
      if (t >= 1.0) {
        d.active = false;
        d.mesh.visible = false;
        continue;
      }
      d.vy -= 12.8 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.z += d.vz * dt;
      d.mesh.position.set(d.x, d.y, d.z);
      d.mesh.scale.setScalar(lerp(d.startScale, d.endScale, t));
      d.mat.opacity = (1.0 - t) * 0.82;
    }

    // 3. Rising White Steam Puffs
    for (let i = 0; i < STEAM_PUFF_POOL_SIZE; i++) {
      const st = steamPuffPool[i];
      if (!st.active) continue;
      st.age += dt;
      const t = st.age / st.maxLife;
      if (t >= 1.0) {
        st.active = false;
        st.mesh.visible = false;
        continue;
      }
      st.x += st.vx * dt;
      st.y += st.vy * dt;
      st.z += st.vz * dt;
      st.vy *= Math.exp(-0.85 * dt);
      st.mesh.position.set(st.x, st.y, st.z);
      st.mesh.scale.setScalar(lerp(st.startScale, st.endScale, t));
      st.mat.opacity = (1.0 - t) * 0.50;
    }

    // 4. Wet Asphalt Puddles
    for (let i = 0; i < WET_PUDDLE_POOL_SIZE; i++) {
      const pd = wetPuddlePool[i];
      if (!pd.active) continue;
      pd.age += dt;
      const t = pd.age / pd.maxLife;
      if (t >= 1.0) {
        pd.active = false;
        pd.mesh.visible = false;
        continue;
      }
      const grow = smoothstep(0, 0.22, t);
      pd.mesh.scale.setScalar(lerp(0.4, pd.maxRadius, grow));
      pd.mat.opacity = t > 0.7 ? lerp(0.58, 0.0, (t - 0.7) / 0.3) : 0.58;
    }

    // 5. Spinning Dropped Witness Smartphones
    for (let i = 0; i < DROPPED_PHONE_POOL_SIZE; i++) {
      const dp = droppedPhonePool[i];
      if (!dp.active) continue;
      dp.life -= dt;
      if (dp.life <= 0) {
        dp.active = false;
        dp.mesh.visible = false;
        continue;
      }
      dp.vy -= 18.0 * dt;
      dp.x += dp.vx * dt;
      dp.y += dp.vy * dt;
      dp.z += dp.vz * dt;

      if (dp.y <= dp.groundY + 0.02) {
        dp.y = dp.groundY + 0.02;
        if (Math.abs(dp.vy) > 0.8) {
          dp.vy = -dp.vy * 0.38;
          dp.vx *= 0.55;
          dp.vz *= 0.55;
        } else {
          dp.vy = 0;
          dp.vx = 0;
          dp.vz = 0;
          dp.rx = 0;
          dp.rz = 0;
          dp.mesh.rotation.x = -Math.PI / 2;
        }
      } else {
        dp.mesh.rotation.x += dp.rx * dt;
        dp.mesh.rotation.y += dp.ry * dt;
        dp.mesh.rotation.z += dp.rz * dt;
      }
      dp.mesh.position.set(dp.x, dp.y, dp.z);
    }
  }

  // ============================================================================
  // 4B. CUSTOM HUMANOID STYLING & CONTEXTUAL POSE CHOREOGRAPHY
  // ============================================================================
  function styleParamedicHumanoid(rig) {
    if (!rig || !rig.parts) return;
    ctx.characters?.setOutfit?.(rig, 'cop');
    const p = rig.parts;
    p.copCapGroup.visible = false;
    p.baseballCapGroup.visible = true;
    p.hiVisGroup.visible = true;
    p.copBadgeGroup.visible = true;
    p.poloGroup.visible = true;
    ctx.characters?.equipWeapon?.(rig, 'unarmed');

    const emsShirtMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.62 });
    const emsPantsMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.72 });
    const emsCapMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.65 });

    if (p.chestMesh) p.chestMesh.material = emsShirtMat;
    if (p.abdomenMesh) p.abdomenMesh.material = emsShirtMat;
    if (p.bridgeMesh) p.bridgeMesh.material = emsShirtMat;
    if (p.collarMesh) p.collarMesh.material = emsCapMat;
    if (p.bbCrown) p.bbCrown.material = emsCapMat;
    if (p.bbBrim) p.bbBrim.material = emsCapMat;
    if (p.pelvisMesh) p.pelvisMesh.material = emsPantsMat;
    for (const leg of [p.legL, p.legR]) {
      if (leg?.thigh) leg.thigh.material = emsPantsMat;
      if (leg?.calf) leg.calf.material = emsPantsMat;
    }
  }

  function styleFirefighterHumanoid(rig) {
    if (!rig || !rig.parts) return;
    ctx.characters?.setOutfit?.(rig, 'road_worker');
    const p = rig.parts;
    p.hardhatGroup.visible = true;
    p.hiVisGroup.visible = true;
    p.tacticalGroup.visible = true;
    ctx.characters?.equipWeapon?.(rig, 'unarmed');

    const turnoutMat = new THREE.MeshStandardMaterial({ color: 0x3b2f26, roughness: 0.72 });
    if (p.chestMesh) p.chestMesh.material = turnoutMat;
    if (p.abdomenMesh) p.abdomenMesh.material = turnoutMat;
    if (p.pelvisMesh) p.pelvisMesh.material = turnoutMat;
    for (const leg of [p.legL, p.legR]) {
      if (leg?.thigh) leg.thigh.material = turnoutMat;
      if (leg?.calf) leg.calf.material = turnoutMat;
    }
  }

  function styleGruppeSecurityGuard(rig) {
    if (!rig || !rig.parts) return;
    ctx.characters?.setOutfit?.(rig, 'cop');
    const p = rig.parts;
    p.copCapGroup.visible = true;
    p.tacticalGroup.visible = true;
    p.shadesGroup.visible = true;
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x1b3a2b, roughness: 0.68 });
    if (p.chestMesh) p.chestMesh.material = guardMat;
    if (p.abdomenMesh) p.abdomenMesh.material = guardMat;
  }

  function styleProtagonistAppearance(rig, protagonistId) {
    if (!rig || !rig.parts) return;
    const p = rig.parts;
    if (protagonistId === 'franklin') {
      ctx.characters?.setOutfit?.(rig, 'casual_polo');
      // Emerald/Teal signature Bồng Lai streetwear polo!
      const franklinPolo = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.65 });
      if (p.chestMesh) p.chestMesh.material = franklinPolo;
      if (p.abdomenMesh) p.abdomenMesh.material = franklinPolo;
      if (p.bridgeMesh) p.bridgeMesh.material = franklinPolo;
      if (p.collarMesh) p.collarMesh.material = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
      if (p.armL?.shortSleeve) p.armL.shortSleeve.material = franklinPolo;
      if (p.armR?.shortSleeve) p.armR.shortSleeve.material = franklinPolo;
    } else if (protagonistId === 'michael') {
      ctx.characters?.setOutfit?.(rig, 'luxury_suit');
      p.hairFadeMesh.visible = false;
      p.hairSweptMesh.visible = true;
      p.shadesGroup.visible = true;
    } else if (protagonistId === 'viper') {
      ctx.characters?.setOutfit?.(rig, 'biker_jacket');
      p.tacticalGroup.visible = true;
      p.shadesGroup.visible = true;
      p.gasMaskGroup.visible = false;
      p.faceBaseGroup.visible = true;
      if (p.armL?.shoulderArmor) p.armL.shoulderArmor.visible = true;
      if (p.armR?.shoulderArmor) p.armR.shoulderArmor.visible = true;
      if (p.legL?.kneePad) p.legL.kneePad.visible = true;
      if (p.legR?.kneePad) p.legR.kneePad.visible = true;
    }
  }

  /**
   * Layers expressive contextual poses onto a character rig's hierarchical joints
   * after standard `animateHumanoid` runs!
   */
  function applyContextualHumanoidPose(rig, poseType, clock = 0) {
    const j = rig?.joints;
    if (!j) return;

    if (poseType === 'leaning_car') {
      j.pelvis.position.y = 0.88;
      j.pelvis.rotation.x = -0.14;
      j.spine.rotation.x = -0.08;
      j.shoulderL.rotation.set(0.32, 0.15, 0.28);
      j.elbowL.rotation.x = -1.15;
      j.shoulderR.rotation.set(0.28, -0.15, -0.26);
      j.elbowR.rotation.x = -1.10;
      j.hipL.rotation.x = -0.16;
      j.hipR.rotation.set(0.18, 0, -0.10);
      j.kneeR.rotation.x = 0.34;
      j.head.rotation.y = Math.sin(clock * 0.9) * 0.28;
    } else if (poseType === 'checking_phone') {
      j.shoulderR.rotation.set(-0.78, -0.28, -0.12);
      j.elbowR.rotation.x = -1.12 + Math.sin(clock * 3.8) * 0.05;
      j.head.rotation.x = 0.32;
      j.head.rotation.y = -0.12 + Math.sin(clock * 1.4) * 0.06;
    } else if (poseType === 'drinking_coffee') {
      const sipWave = smoothstep(0.35, 0.85, Math.sin(clock * 1.35));
      j.shoulderR.rotation.set(lerp(-0.42, -1.25, sipWave), -0.22, -0.10);
      j.elbowR.rotation.x = lerp(-0.95, -1.52, sipWave);
      j.head.rotation.x = lerp(0.05, -0.22, sipWave);
    } else if (poseType === 'paramedic_kneel_cpr') {
      const pump = Math.abs(Math.sin(clock * 9.2));
      j.pelvis.position.y = 0.50 - pump * 0.04;
      j.spine.rotation.x = 0.62 + pump * 0.14;
      j.hipL.rotation.x = -1.28;
      j.kneeL.rotation.x = 1.62;
      j.hipR.rotation.x = -0.55;
      j.kneeR.rotation.x = 1.85;
      j.shoulderL.rotation.set(-1.18, 0.22, 0.05);
      j.shoulderR.rotation.set(-1.18, -0.22, -0.05);
      j.elbowL.rotation.x = -0.18 + pump * 0.12;
      j.elbowR.rotation.x = -0.18 + pump * 0.12;
      j.head.rotation.x = 0.28;
    } else if (poseType === 'cruiser_door_crouch') {
      j.pelvis.position.y = 0.54;
      j.spine.rotation.x = 0.36;
      j.hipL.rotation.x = -1.05;
      j.kneeL.rotation.x = 1.48;
      j.hipR.rotation.x = -0.92;
      j.kneeR.rotation.x = 1.42;
      j.shoulderR.rotation.set(-0.68, -0.18, 0);
      j.elbowR.rotation.x = -0.92;
    } else if (poseType === 'cruiser_door_peek_fire') {
      j.pelvis.position.y = 0.78;
      j.spine.rotation.x = 0.12;
      j.hipL.rotation.x = -0.42;
      j.kneeL.rotation.x = 0.62;
      j.hipR.rotation.x = -0.38;
      j.kneeR.rotation.x = 0.58;
    } else if (poseType === 'fast_rope_slide') {
      j.pelvis.position.y = 0.86;
      j.shoulderL.rotation.set(-2.35, 0.18, 0.14);
      j.elbowL.rotation.x = -0.45;
      j.shoulderR.rotation.set(-2.15, -0.18, -0.14);
      j.elbowR.rotation.x = -0.55;
      j.hipL.rotation.x = -0.55;
      j.kneeL.rotation.x = 0.95;
      j.hipR.rotation.x = -0.42;
      j.kneeR.rotation.x = 0.88;
    } else if (poseType === 'paparazzi_photo') {
      j.shoulderR.rotation.set(-1.32, -0.24, -0.08);
      j.elbowR.rotation.x = -0.52;
      j.shoulderL.rotation.set(-1.26, 0.26, 0.08);
      j.elbowL.rotation.x = -0.58;
      j.head.rotation.x = -0.06;
    } else if (poseType === 'witness_911_call') {
      j.shoulderR.rotation.set(-1.45, -0.35, -0.32);
      j.elbowR.rotation.x = -1.68;
      j.shoulderL.rotation.set(-0.35 + Math.sin(clock * 6.5) * 0.22, 0.15, 0.18);
      j.elbowL.rotation.x = -0.75;
      j.head.rotation.y = Math.sin(clock * 4.2) * 0.28;
    } else if (poseType === 'witness_surrender') {
      const tremble = Math.sin(clock * 22.0) * 0.05;
      j.pelvis.position.y = 0.78;
      j.spine.rotation.x = 0.16;
      j.shoulderL.rotation.set(-2.55 + tremble, 0.12, 0.28);
      j.elbowL.rotation.x = -0.35;
      j.shoulderR.rotation.set(-2.55 - tremble, -0.12, -0.28);
      j.elbowR.rotation.x = -0.35;
    } else if (poseType === 'busker_guitar') {
      const strum = Math.sin(clock * 9.5) * 0.26;
      j.spine.rotation.z = Math.sin(clock * 2.4) * 0.06;
      j.shoulderL.rotation.set(-0.78, 0.42, 0.25);
      j.elbowL.rotation.x = -0.92;
      j.shoulderR.rotation.set(-0.55 + strum * 0.5, -0.36, -0.18);
      j.elbowR.rotation.x = -1.12 + strum;
      j.head.rotation.x = 0.14 + Math.sin(clock * 4.8) * 0.08;
    } else if (poseType === 'busker_breakdance') {
      const beat = clock * 5.2;
      const bounce = Math.abs(Math.sin(beat));
      j.pelvis.position.y = 0.74 + bounce * 0.18;
      j.pelvis.rotation.y = Math.sin(beat * 0.5) * 0.65;
      j.spine.rotation.z = Math.cos(beat) * 0.22;
      j.shoulderL.rotation.set(-0.9 + Math.sin(beat) * 0.7, 0.2, 0.45);
      j.elbowL.rotation.x = -0.85;
      j.shoulderR.rotation.set(-0.9 - Math.sin(beat) * 0.7, -0.2, -0.45);
      j.elbowR.rotation.x = -0.85;
      j.hipL.rotation.x = Math.sin(beat) * 0.55;
      j.kneeL.rotation.x = Math.max(0, -Math.sin(beat) * 0.85);
      j.hipR.rotation.x = -Math.sin(beat) * 0.55;
      j.kneeR.rotation.x = Math.max(0, Math.sin(beat) * 0.85);
    }
  }

  // ============================================================================
  // 5. PILLAR 1: Giang Hồ 3-PROTAGONIST REAL-TIME SKY-ZOOM SWITCH & PERK ENGINE
  // ============================================================================
  const PROTAGONIST_ORDER = ['franklin', 'michael', 'viper'];

  const PROTAGONIST_BLUEPRINTS = {
    franklin: {
      id: 'franklin',
      index: 0,
      keyBind: 'F5',
      name: 'Franklin Clinton',
      shortName: 'Franklin',
      roleTitle: 'Chuyên Gia Tốc Độ',
      perkTitle: 'Phản Xạ Lái Xe Siêu Tốc (Slow-Mo Grip 2.1x)',
      colorHex: '#2ee59d',
      colorInt: 0x2ee59d,
      gridTintRGB: [46, 229, 157],
      shaderTintVec: [0.35, 1.16, 0.86],
      defaultOutfit: 'casual_polo',
      defaultWeapon: 'smg',
      homePos: { x: 26.0, y: 0.22, z: 28.0, yaw: Math.PI },
      carSpawn: { type: 'obey9f', x: 34.5, y: 0.05, z: 18.0, yaw: Math.PI, color: 0xf8fafc, plate: 'FC 888' },
      secondaryHangouts: [
        { x: 26.0, y: 0.22, z: 28.0, yaw: Math.PI, label: 'Đại lộ Bồng Lai', activity: 'leaning_car' },
        { x: -48.0, y: 0.22, z: 68.0, yaw: -0.4, label: 'Showroom Luyện Khí Các', activity: 'checking_phone' },
        { x: -148.0, y: 0.22, z: -8.0, yaw: -Math.PI / 2, label: 'Bãi biển Thái Bình Dương', activity: 'drinking_coffee' }
      ],
      arrivalQuotes: [
        'Franklin: "Xe cộ nóng máy sẵn rồi, ra đại lộ đạp lút cán thôi!"',
        'Franklin: "Cà phê Bồng Lai tỉnh người phết — giờ tính phi vụ nào đây?"',
        'Franklin: "Đường phố Tiên Thành hôm nay đông vui đấy, lên xe lượn một vòng!"'
      ],
      greetQuotes: [
        'Franklin: "Ê anh bạn! Nhớ ghé Luyện Khí Các độ thêm bộ Turbo nhé!"',
        'Franklin: "Khi nào cần tay lái lụa cắt đuôi Thiên Đình Chấp Pháp thì cứ hú tôi!"'
      ],
      skills: { driving: 99, shooting: 76, stamina: 92, stealth: 80, specialMax: 120 },
      baseMaxHp: 105
    },
    michael: {
      id: 'michael',
      index: 1,
      keyBind: 'F6',
      name: 'Michael De Santa',
      shortName: 'Michael',
      roleTitle: 'Xạ Thủ Lão Luyện',
      perkTitle: 'Tập Trung Xạ Thủ Bullet-Time (1.5x Sát Thương Súng)',
      colorHex: '#38bdf8',
      colorInt: 0x38bdf8,
      gridTintRGB: [56, 189, 248],
      shaderTintVec: [0.68, 0.96, 1.24],
      defaultOutfit: 'luxury_suit',
      defaultWeapon: 'carbine',
      homePos: { x: 198.0, y: 0.22, z: -110.0, yaw: -Math.PI / 2 },
      carSpawn: { type: 'sedan_lux', x: 194.2, y: 0.05, z: -103.5, yaw: 0.0, color: 0x11141a, plate: 'MDS 001' },
      secondaryHangouts: [
        { x: 198.0, y: 0.22, z: -110.0, yaw: -Math.PI / 2, label: 'Sòng Bạc Diamond Crown', activity: 'drinking_coffee' },
        { x: 68.0, y: 28.0, z: -242.0, yaw: 0.0, label: 'Đài Thiên Văn Võ Lâm', activity: 'leaning_car' },
        { x: 26.5, y: 0.22, z: -76.5, yaw: 0.2, label: 'Sảnh Penthouse Thượng Lưu', activity: 'checking_phone' }
      ],
      arrivalQuotes: [
        'Michael: "Như trong phim hành động kinh điển... Lên đạn xong cả rồi!"',
        'Michael: "Vừa nhâm nhi ly Espresso trước Sòng Bạc Diamond — tới giờ làm việc lớn!"',
        'Michael: "Một viên chuẩn xác còn hơn cả băng đạn bắn bừa. Đi thôi!"'
      ],
      greetQuotes: [
        'Michael: "Vào Sòng Bạc Diamond làm vài ván Xì Dách không người anh em?"',
        'Michael: "Giữ cái đầu lạnh nhé, cảnh sát khu Downtown dạo này căng lắm."'
      ],
      skills: { driving: 82, shooting: 99, stamina: 76, stealth: 88, specialMax: 115 },
      baseMaxHp: 115
    },
    viper: {
      id: 'viper',
      index: 2,
      keyBind: 'F7',
      name: 'Viper "Cơn Lốc"',
      shortName: 'Viper',
      roleTitle: 'Đột Kích Hạng Nặng',
      perkTitle: 'Cuồng Nộ Bất Tử (-80% Sát Thương Nhận • 2x Hỏa Lực/Nổ)',
      colorHex: '#ff6b2b',
      colorInt: 0xff6b2b,
      gridTintRGB: [255, 107, 43],
      shaderTintVec: [1.28, 0.72, 0.48],
      defaultOutfit: 'biker_jacket',
      defaultWeapon: 'shotgun',
      homePos: { x: -135.0, y: 0.22, z: 90.0, yaw: Math.PI / 2 },
      carSpawn: { type: 'chopper', fallbackType: 'banshee', x: -130.8, y: 0.05, z: 85.5, yaw: 0.35, color: 0x181a1f, plate: 'VPR 666' },
      heliSpawn: { type: 'heli', x: -146.5, y: 0.22, z: 96.5, yaw: 1.15, color: 0x1e293b, plate: 'VIPER 1' },
      secondaryHangouts: [
        { x: -135.0, y: 0.22, z: 90.0, yaw: Math.PI / 2, label: 'Bến Du Thuyền & Bãi Trực Thăng', activity: 'leaning_car' },
        { x: -125.5, y: 0.22, z: -92.0, yaw: Math.PI / 2, label: 'Cổng Túy Tiên Lâu & Bar', activity: 'checking_phone' },
        { x: 199.0, y: 0.22, z: 12.0, yaw: -Math.PI / 2, label: 'Trường Bắn Thần Binh Các', activity: 'drinking_coffee' }
      ],
      arrivalQuotes: [
        'Viper: "BÙM! Ai gọi chuyên gia chất nổ hạng nặng đấy?! Quẩy banh nóc nào!"',
        'Viper: "Trực thăng với chiến mã chuẩn bị đầy bình xăng ở Bến Du Thuyền rồi!"',
        'Viper: "Mấy tay Thiên Đình Chấp Pháp tốt nhất nên dẹp đường trước khi tao nổi cơn thịnh nộ!"'
      ],
      greetQuotes: [
        'Viper: "Cần súng phóng lựu hay trực thăng càn quét thì cứ lấy tự nhiên nhé!"',
        'Viper: "Tối nay ghé Túy Tiên Lâu làm ly Macbeth không chiến hữu?!"'
      ],
      skills: { driving: 86, shooting: 94, stamina: 96, stealth: 65, specialMax: 125 },
      baseMaxHp: 125
    }
  };

  function createInitialProtagonistState(bp) {
    return {
      id: bp.id,
      index: bp.index,
      keyBind: bp.keyBind,
      name: bp.name,
      shortName: bp.shortName,
      roleTitle: bp.roleTitle,
      perkTitle: bp.perkTitle,
      colorHex: bp.colorHex,
      colorInt: bp.colorInt,
      outfit: bp.defaultOutfit,
      weaponId: bp.defaultWeapon,
      x: bp.homePos.x,
      y: bp.homePos.y,
      z: bp.homePos.z,
      yaw: bp.homePos.yaw,
      hp: bp.baseMaxHp,
      maxHp: bp.baseMaxHp,
      armor: bp.id === 'viper' ? 100 : bp.id === 'michael' ? 75 : 50,
      special: bp.skills.specialMax,
      maxSpecial: bp.skills.specialMax,
      stamina: 100,
      ammo: {
        pistol: 180,
        smg: 320,
        carbine: 420,
        shotgun: 120,
        grenade: bp.id === 'viper' ? 28 : 12
      },
      clip: {},
      skills: { ...bp.skills },
      personalCar: null,
      personalHeli: null,
      npcRig: null,
      npcMesh: null,
      phoneProp: null,
      coffeeProp: null,
      idleActivity: bp.secondaryHangouts[0].activity,
      hangoutIdx: 0,
      routineTimer: randRange(32, 58),
      greetCooldown: 0,
      walkTarget: null
    };
  }

  // Hybrid Array + Keyed Map so BOTH `protagonists[0]` / `.forEach` AND `protagonists.franklin` work seamlessly!
  const protagonists = [
    createInitialProtagonistState(PROTAGONIST_BLUEPRINTS.franklin),
    createInitialProtagonistState(PROTAGONIST_BLUEPRINTS.michael),
    createInitialProtagonistState(PROTAGONIST_BLUEPRINTS.viper)
  ];
  protagonists.franklin = protagonists[0];
  protagonists.michael = protagonists[1];
  protagonists.viper = protagonists[2];
  protagonists.trevor = protagonists[2];

  let activeProtagonistKey = 'franklin';
  let protagonistArrivalPoseTimer = 0;
  let protagonistArrivalActivity = 'idle';
  let playerHealthSnapshot = 100;
  let playerArmorSnapshot = 50;
  let nearMissRechargeCooldown = 0;
  let cachedBaseWeaponStats = null;

  // Sky-Switch 1.8s Camera Sequence State
  const skySwitch = {
    active: false,
    elapsed: 0,
    duration: 1.80,
    fromId: 'franklin',
    toId: 'michael',
    srcX: 26,
    srcY: 0.22,
    srcZ: 28,
    srcYaw: Math.PI,
    dstX: 198,
    dstY: 0.22,
    dstZ: -110,
    dstYaw: -Math.PI / 2,
    stepTriggered: [false, false, false, false, false, false],
    gridFlashAlpha: 0,
    tintRGB: [56, 189, 248],
    targetRoleLabel: '',
    targetNameLabel: '',
    currentAltitude: 2.2,
    panProgress: 0
  };

  function resolveProtagonistId(input) {
    if (input === undefined || input === null || input === '' || input === 'next' || input === 'cycle') {
      const curIdx = PROTAGONIST_ORDER.indexOf(activeProtagonistKey);
      return PROTAGONIST_ORDER[(curIdx + 1) % PROTAGONIST_ORDER.length];
    }
    if (typeof input === 'number') {
      if (input >= 0 && input < PROTAGONIST_ORDER.length) return PROTAGONIST_ORDER[input];
      if (input >= 1 && input <= PROTAGONIST_ORDER.length) return PROTAGONIST_ORDER[input - 1];
    }
    if (typeof input === 'object' && input.id) {
      return resolveProtagonistId(input.id);
    }
    const raw = String(input).trim().toLowerCase();
    if (raw === 'franklin' || raw === 'f5' || raw === '0') return 'franklin';
    if (raw === 'michael' || raw === 'f6' || raw === '1') return 'michael';
    if (raw === 'viper' || raw === 'trevor' || raw === 'f7' || raw === '2') return 'viper';
    return PROTAGONIST_ORDER[(PROTAGONIST_ORDER.indexOf(activeProtagonistKey) + 1) % PROTAGONIST_ORDER.length];
  }

  function loadProtagonistPersistence() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      if (parsed.active && PROTAGONIST_BLUEPRINTS[parsed.active]) {
        activeProtagonistKey = parsed.active;
      }
      if (parsed.chars && typeof parsed.chars === 'object') {
        for (const id of PROTAGONIST_ORDER) {
          const saved = parsed.chars[id];
          const st = protagonists[id];
          if (!saved || !st) continue;
          if (typeof saved.outfit === 'string') st.outfit = saved.outfit;
          if (typeof saved.weaponId === 'string') st.weaponId = saved.weaponId;
          if (Number.isFinite(saved.hp)) st.hp = clamp(saved.hp, 35, st.maxHp);
          if (Number.isFinite(saved.armor)) st.armor = clamp(saved.armor, 0, 100);
          if (Number.isFinite(saved.special)) st.special = clamp(saved.special, 0, st.maxSpecial);
          if (Number.isFinite(saved.x) && Number.isFinite(saved.z) && Math.abs(saved.x) < 400) {
            st.x = saved.x;
            st.z = saved.z;
            st.y = Number.isFinite(saved.y) ? saved.y : sampleGroundY(saved.x, saved.z, 0.22);
          }
          if (saved.ammo && typeof saved.ammo === 'object') {
            Object.assign(st.ammo, saved.ammo);
          }
        }
      }
    } catch (_) {}
  }

  function saveProtagonistPersistence() {
    if (typeof localStorage === 'undefined') return;
    try {
      snapshotPlayerIntoProtagonist(protagonists[activeProtagonistKey]);
      const payload = {
        active: activeProtagonistKey,
        chars: {}
      };
      for (const id of PROTAGONIST_ORDER) {
        const st = protagonists[id];
        payload.chars[id] = {
          outfit: st.outfit,
          weaponId: st.weaponId,
          hp: st.hp,
          armor: st.armor,
          special: st.special,
          x: st.x,
          y: st.y,
          z: st.z,
          ammo: st.ammo
        };
      }
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {}
  }

  function ensureProtagonistPersonalVehicles(activeCtx = ctx) {
    const vSys = activeCtx?.vehicles || ctx?.vehicles;
    if (!vSys || typeof vSys.spawnVehicle !== 'function') return;

    for (let i = 0; i < PROTAGONIST_ORDER.length; i++) {
      const id = PROTAGONIST_ORDER[i];
      const st = protagonists[id];
      const bp = PROTAGONIST_BLUEPRINTS[id];

      // 1. Personal Ground Car / Chopper
      const existingValid =
        st.personalCar &&
        !st.personalCar.destroyed &&
        Array.isArray(vSys.list) &&
        vSys.list.includes(st.personalCar);

      if (!existingValid) {
        const sp = bp.carSpawn;
        // Prefer 'chopper' for Viper if vehiclesExtra registered it, otherwise sleek 'banshee'
        let chosenType = sp.type;
        if (chosenType === 'chopper') {
          const hasChopperSupport = Boolean(
            vSys.archetypes?.chopper ||
            activeCtx?.vehiclesExtra?.extraTypes?.includes?.('chopper') ||
            ctx?.vehiclesExtra?.spawnExtraVehicle
          );
          if (!hasChopperSupport && sp.fallbackType) {
            chosenType = sp.fallbackType;
          }
        }

        // Reuse existing hero Obey 9F at startup for Franklin so Boulevard doesn't double-park
        let reused = null;
        if (id === 'franklin' && Array.isArray(vSys.list)) {
          reused = vSys.list.find(
            (v) => v && v.type === 'obey9f' && v.isHero && !v.destroyed && dist2D(v.x, v.z, sp.x, sp.z) < 8
          ) || null;
        }

        if (reused) {
          st.personalCar = reused;
          reused.protagonistOwner = id;
        } else {
          const gy = sampleGroundY(sp.x, sp.z, sp.y, activeCtx);
          let spawned = null;
          if (chosenType === 'chopper' && activeCtx?.vehiclesExtra?.spawnExtraVehicle) {
            spawned = activeCtx.vehiclesExtra.spawnExtraVehicle('chopper', sp.x, gy, sp.z, sp.yaw, {
              color: sp.color,
              plate: sp.plate,
              isParked: true,
              isHero: true
            });
          }
          if (!spawned) {
            spawned = vSys.spawnVehicle(chosenType, sp.x, gy, sp.z, sp.yaw, {
              color: sp.color,
              plate: sp.plate,
              isParked: true,
              isHero: true
            });
          }
          if (spawned) {
            spawned.protagonistOwner = id;
            st.personalCar = spawned;
          }
        }
      } else if (
        id === 'viper' &&
        st.personalCar.type === 'banshee' &&
        st.personalCar !== getPlayerVehicle(activeCtx) &&
        (vSys.archetypes?.chopper || activeCtx?.vehiclesExtra?.spawnExtraVehicle)
      ) {
        // Upgrade Viper's placeholder Banshee to real Hắc Phong Thiết Kỵ Chopper once vehicles_extra is initialized!
        const cx = st.personalCar.x;
        const cz = st.personalCar.z;
        const cy = st.personalCar.y;
        const cyaw = st.personalCar.yaw;
        vSys.removeVehicle?.(st.personalCar);
        const chopper =
          activeCtx?.vehiclesExtra?.spawnExtraVehicle?.('chopper', cx, cy, cz, cyaw, {
            color: 0x181a1f,
            plate: 'VPR 666',
            isParked: true,
            isHero: true
          }) ||
          vSys.spawnVehicle('chopper', cx, cy, cz, cyaw, {
            color: 0x181a1f,
            plate: 'VPR 666',
            isParked: true,
            isHero: true
          });
        if (chopper) {
          chopper.protagonistOwner = 'viper';
          st.personalCar = chopper;
        }
      }

      // 2. Viper's Personal Maverick Helicopter at Bồng Lai Marina Helipad (-146.5, 0.22, 96.5)
      if (bp.heliSpawn) {
        const heliValid =
          st.personalHeli &&
          !st.personalHeli.destroyed &&
          Array.isArray(vSys.list) &&
          vSys.list.includes(st.personalHeli);
        if (!heliValid) {
          const hs = bp.heliSpawn;
          const hy = sampleGroundY(hs.x, hs.z, hs.y, activeCtx);
          const heli = vSys.spawnVehicle('heli', hs.x, hy, hs.z, hs.yaw, {
            color: hs.color,
            plate: hs.plate,
            isParked: true,
            isHero: true
          });
          if (heli) {
            heli.protagonistOwner = id;
            st.personalHeli = heli;
          }
        }
      }
    }
  }

  function ensureInactiveProtagonistAvatar(st, activeCtx = ctx) {
    const charSys = activeCtx?.characters || ctx?.characters;
    if (!charSys || typeof charSys.createHumanoid !== 'function') return null;

    if (!st.npcRig) {
      const rig = charSys.createHumanoid(st.outfit || PROTAGONIST_BLUEPRINTS[st.id].defaultOutfit);
      styleProtagonistAppearance(rig, st.id);
      charSys.equipWeapon?.(rig, 'unarmed');

      const phoneProp = buildSmartphoneProp(false);
      phoneProp.position.set(0, -0.08, 0.05);
      phoneProp.rotation.set(-0.35, 0, 0);
      phoneProp.visible = false;
      rig.joints?.handR?.add(phoneProp);

      const coffeeProp = buildCoffeeCupProp();
      coffeeProp.position.set(0, -0.07, 0.05);
      coffeeProp.visible = false;
      rig.joints?.handR?.add(coffeeProp);

      st.npcRig = rig;
      st.npcMesh = rig.root || rig;
      st.phoneProp = phoneProp;
      st.coffeeProp = coffeeProp;
      npcLifeRoot.add(st.npcMesh);
    }
    return st.npcRig;
  }

  function snapshotPlayerIntoProtagonist(st, activeCtx = ctx) {
    const p = activeCtx?.player || ctx?.player;
    if (!p || !st) return;

    const extPos = isPlayerInsideInterior(p) ? resolveExteriorAnchorForPlayer(p) : p;
    st.x = Number.isFinite(extPos.x) ? extPos.x : st.x;
    st.y = Number.isFinite(extPos.y) ? extPos.y : sampleGroundY(st.x, st.z, 0.22, activeCtx);
    st.z = Number.isFinite(extPos.z) ? extPos.z : st.z;
    st.yaw = Number.isFinite(p.yaw) ? p.yaw : st.yaw;

    if (Number.isFinite(p.hp) && p.hp > 0) st.hp = clamp(p.hp, 1, st.maxHp);
    if (Number.isFinite(p.armor)) st.armor = clamp(p.armor, 0, 100);
    if (Number.isFinite(p.special)) st.special = clamp(p.special, 0, st.maxSpecial);
    if (Number.isFinite(p.stamina)) st.stamina = clamp(p.stamina, 0, 100);
    if (typeof p.outfit === 'string' && p.outfit) st.outfit = p.outfit;

    const curWeapon = p.weaponId || p.weapon || p.currentWeapon;
    if (typeof curWeapon === 'string' && curWeapon) st.weaponId = curWeapon;

    if (p.ammo && typeof p.ammo === 'object') {
      st.ammo = { ...st.ammo, ...p.ammo };
    }
    if (p.clip && typeof p.clip === 'object') {
      st.clip = { ...p.clip };
    }
  }

  function applyProtagonistToPlayer(st, activeCtx = ctx) {
    const p = activeCtx?.player || ctx?.player;
    if (!p || !st) return;

    // Exit current vehicle or interior cleanly before transferring body
    if (p.inCar) {
      try {
        (activeCtx?.vehicles || ctx?.vehicles)?.exitVehicle?.(true);
      } catch (_) {}
      p.inCar = null;
      p.vehicle = null;
      p.car = null;
    }

    if (p.inSafehouse) p.inSafehouse = false;
    if (p.rappelState) p.rappelState.active = false;
    try { activeCtx?.casinoWorld?.exitCasino?.(); } catch (_) {}
    try { activeCtx?.casinoWorld?.exitNightclub?.(); } catch (_) {}
    try { activeCtx?.worldInfra?.exitBank?.(); } catch (_) {}

    p.maxHp = st.maxHp;
    p.hp = clamp(st.hp, 35, st.maxHp);
    p.armor = clamp(st.armor, 0, 100);
    p.maxSpecial = st.maxSpecial;
    p.special = clamp(st.special, 0, st.maxSpecial);
    p.stamina = clamp(st.stamina, 25, 100);
    p.specialActive = false;
    p.protagonistId = st.id;
    p.protagonistName = st.name;

    p.x = st.x;
    p.z = st.z;
    p.y = Math.max(st.y, sampleGroundY(st.x, st.z, 0.22, activeCtx));
    p.yaw = st.yaw;
    p.vx = 0;
    p.vy = 0;
    p.vz = 0;
    p.isGrounded = true;
    p.onGround = true;

    if (!p.ammo || typeof p.ammo !== 'object') p.ammo = {};
    Object.assign(p.ammo, st.ammo);

    p.outfit = st.outfit;
    const charSys = activeCtx?.characters || ctx?.characters;
    if (charSys && p.rig) {
      styleProtagonistAppearance(p.rig, st.id);
      charSys.equipWeapon?.(p, st.weaponId || PROTAGONIST_BLUEPRINTS[st.id].defaultWeapon);
      charSys.animateHumanoid?.(p.rig, 'idle', 0.016);
    }

    const pMesh = p.mesh || p.rig?.root;
    if (pMesh) {
      pMesh.visible = true;
      pMesh.position.set(p.x, p.y, p.z);
      pMesh.rotation.set(0, p.yaw, 0);
    }

    playerHealthSnapshot = p.hp;
    playerArmorSnapshot = p.armor;

    // Hide the target protagonist's inactive NPC avatar now that player IS them
    if (st.npcMesh) {
      st.npcMesh.visible = false;
    }
  }

  /**
   * Switch Playable Protagonist (`F5` Franklin, `F6` Michael, `F7` Viper)
   * Triggers the Iconic 1.8s Giang Hồ 3-Step Sky-Zoom Camera Sequence!
   */
  function switchProtagonist(targetOrId, opts = {}) {
    const p = ctx.player;
    if (!p || p.isDead || p.dead || p.isBusted) return false;
    if (ctx.gameplay?.mission?.active && !opts.allowInMission) {
      ctx.ui?.showNotification?.('Không thể đổi nhân vật khi đang trong giai đoạn nhiệm vụ cốt truyện!', 2.8);
      return false;
    }

    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Same-frame / dual-listener debounce so ui_audio + npc_life F5/F6/F7 never double-fire or cycle twice!
    if (nowMs - (skySwitch._lastTriggerAtMs || 0) < 180) {
      return true;
    }

    const nextId = resolveProtagonistId(targetOrId);
    if (nextId === activeProtagonistKey && !opts.force) {
      const curBp = PROTAGONIST_BLUEPRINTS[nextId];
      ctx.ui?.showNotification?.(
        `Đang điều khiển ${curBp.name} (${curBp.roleTitle}) • Nhấn [F5/F6/F7] để chuyển nhân vật!`,
        2.5
      );
      revealProtagonistHudWidget(3.6);
      return false;
    }

    skySwitch._lastTriggerAtMs = nowMs;
    if (dossierModalOpen) closeCharacterSelector();

    ensureSceneRootAttached(ctx);
    ensureProtagonistPersonalVehicles(ctx);

    // Close Smartphone or Modal if open so player sees the glorious 1.8s Sky-Zoom!
    if (ctx.ui?.closePhone && ctx.input?.phoneOpen) {
      ctx.ui.closePhone();
    }

    // Deactivate any active Special Ability cleanly before switching
    if (p.specialActive) {
      p.specialActive = false;
      ctx.timeScale = 1.0;
      ctx.engine?.setBulletTimeVisual?.(0.0);
    }

    const prevState = protagonists[activeProtagonistKey];
    const nextState = protagonists[nextId];
    const nextBp = PROTAGONIST_BLUEPRINTS[nextId];

    // 1. Snapshot outgoing protagonist & materialize their live 3D NPC avatar at departure point
    snapshotPlayerIntoProtagonist(prevState, ctx);
    const srcX = prevState.x;
    const srcY = prevState.y;
    const srcZ = prevState.z;
    const srcYaw = prevState.yaw;

    prevState.idleActivity = pickRandom(['checking_phone', 'leaning_car', 'drinking_coffee']);
    const prevAvatar = ensureInactiveProtagonistAvatar(prevState, ctx);
    if (prevAvatar && prevState.npcMesh) {
      styleProtagonistAppearance(prevAvatar, prevState.id);
      prevState.npcMesh.visible = true;
      prevState.npcMesh.position.set(srcX, srcY, srcZ);
      prevState.npcMesh.rotation.set(0, srcYaw, 0);
    }

    // 2. Refresh target protagonist's contextual arrival pose & park their personal car nearby if needed
    const chosenArrivalPose = nextState.idleActivity || pickRandom(['leaning_car', 'checking_phone', 'drinking_coffee']);
    nextState.y = sampleGroundY(nextState.x, nextState.z, nextState.y, ctx);
    if (
      nextState.personalCar &&
      !nextState.personalCar.destroyed &&
      dist2D(nextState.personalCar.x, nextState.personalCar.z, nextState.x, nextState.z) > 28
    ) {
      const carOffX = nextState.x + Math.cos(nextState.yaw) * 3.4;
      const carOffZ = nextState.z - Math.sin(nextState.yaw) * 3.4;
      const testCarPos = { x: carOffX, y: nextState.y, z: carOffZ };
      ctx.world?.resolveCircleAABB?.(testCarPos, 1.8);
      nextState.personalCar.x = testCarPos.x;
      nextState.personalCar.z = testCarPos.z;
      nextState.personalCar.y = sampleGroundY(testCarPos.x, testCarPos.z, 0.05, ctx);
      nextState.personalCar.vx = 0;
      nextState.personalCar.vz = 0;
      nextState.personalCar.mesh?.position.set(nextState.personalCar.x, nextState.personalCar.y, nextState.personalCar.z);
    }

    // 3. Immediately transfer player state so both instant API consumers and 1.8s camera sequence agree!
    const prevId = activeProtagonistKey;
    activeProtagonistKey = nextId;
    applyProtagonistToPlayer(nextState, ctx);
    saveProtagonistPersistence();

    protagonistArrivalActivity = chosenArrivalPose;
    protagonistArrivalPoseTimer = opts.instant ? 0.25 : 2.35;

    if (opts.instant) {
      skySwitch.active = false;
      if (ctx.engine) {
        ctx.engine.camYaw = wrapAngle(nextState.yaw + Math.PI);
        ctx.engine.camPitch = -0.14;
      }
      revealProtagonistHudWidget(4.0);
      return true;
    }

    // 4. Launch Iconic 1.80s Giang Hồ 3-Step Sky-Zoom Choreography!
    skySwitch.active = true;
    skySwitch.elapsed = 0;
    skySwitch.duration = 1.80;
    skySwitch.fromId = prevId;
    skySwitch.toId = nextId;
    skySwitch.srcX = srcX;
    skySwitch.srcY = srcY;
    skySwitch.srcZ = srcZ;
    skySwitch.srcYaw = srcYaw;
    skySwitch.dstX = nextState.x;
    skySwitch.dstY = nextState.y;
    skySwitch.dstZ = nextState.z;
    skySwitch.dstYaw = nextState.yaw;
    skySwitch.stepTriggered = [false, false, false, false, false, false];
    skySwitch.gridFlashAlpha = 0.85;
    skySwitch.tintRGB = [...nextBp.gridTintRGB];
    skySwitch.targetNameLabel = nextBp.name.toUpperCase();
    skySwitch.targetRoleLabel = `${nextBp.roleTitle} • ${nextBp.perkTitle}`;
    skySwitch.currentAltitude = srcY + 45;
    skySwitch.panProgress = 0;

    revealProtagonistHudWidget(5.2);
    return true;
  }

  /**
   * Computes exact camera position, lookAt, FOV, and roll during the 1.8s Giang Hồ Sky-Switch:
   * - 0.00s..0.54s: 3 Punchy Ascent Steps (`y = 45m -> 110m -> 210m`) above `src`
   * - 0.54s..1.26s: Smooth Metropolis Satellite Pan at `y = 210m` from `src` -> `dst`
   * - 1.26s..1.80s: 3 Punchy Slam-Down Steps (`y = 110m -> 45m -> Street Shoulder`) onto `dst`
   */
  function updateSkySwitchCameraOverride(rawDt, activeCtx = ctx) {
    if (!skySwitch.active) return false;
    const cam = getCamera(activeCtx);
    if (!cam) {
      skySwitch.active = false;
      return false;
    }

    const dt = clamp(Number(rawDt) || 0.016, 0.001, 0.08);
    skySwitch.elapsed += dt;
    skySwitch.gridFlashAlpha = Math.max(0, skySwitch.gridFlashAlpha - dt * 3.8);

    const t = skySwitch.elapsed;
    const dur = skySwitch.duration;

    // Trigger 6 discrete audio + city-grid tint flash pulses at each step boundary!
    const stepThresholds = [0.0, 0.18, 0.36, 1.26, 1.44, 1.62];
    for (let s = 0; s < 6; s++) {
      if (!skySwitch.stepTriggered[s] && t >= stepThresholds[s]) {
        skySwitch.stepTriggered[s] = true;
        skySwitch.gridFlashAlpha = s === 5 ? 0.65 : 0.92;
        synthAudio.playSkySwitchStep(s % 3, s >= 3);
        activeCtx.engine?.addShake?.(s === 5 ? 0.24 : 0.12);
      }
    }

    if (t >= dur) {
      skySwitch.active = false;
      skySwitch.gridFlashAlpha = 0;
      const targetSt = protagonists[skySwitch.toId] || protagonists[activeProtagonistKey];
      const targetBp = PROTAGONIST_BLUEPRINTS[targetSt.id];

      // Sync engine spring camera smoothly behind protagonist's shoulder!
      if (activeCtx.engine) {
        activeCtx.engine.camYaw = wrapAngle(targetSt.yaw + Math.PI);
        activeCtx.engine.camPitch = -0.12;
      }
      const quote = pickRandom(targetBp.arrivalQuotes);
      if (quote) activeCtx.ui?.showSubtitle?.(quote, 4.2);
      activeCtx.ui?.showNotification?.(
        `Đã chuyển sang ${targetBp.name} (${targetBp.roleTitle})!`,
        3.2
      );
      return false;
    }

    let camX = skySwitch.srcX;
    let camY = 45;
    let camZ = skySwitch.srcZ;
    let lookX = skySwitch.srcX;
    let lookY = skySwitch.srcY;
    let lookZ = skySwitch.srcZ;
    let roll = 0;
    let fov = 60;

    if (t < 0.54) {
      // PHASE A: 3 Punchy Ascent Steps (45m -> 110m -> 210m)
      skySwitch.panProgress = 0;
      let stepIdx = 0;
      let localT = 0;
      if (t < 0.18) {
        stepIdx = 0;
        localT = t / 0.18;
      } else if (t < 0.36) {
        stepIdx = 1;
        localT = (t - 0.18) / 0.18;
      } else {
        stepIdx = 2;
        localT = (t - 0.36) / 0.18;
      }

      const punch = 1.0 - Math.pow(1.0 - clamp(localT, 0, 1), 3.4);
      const baseAlt = [skySwitch.srcY + 8, 45, 110][stepIdx];
      const targetAlt = [45, 110, 210][stepIdx];
      camY = lerp(baseAlt, targetAlt, punch);
      skySwitch.currentAltitude = camY;

      // Slight top-down offset so skyscrapers show dramatic 3D perspective
      const southTilt = [7.5, 14.0, 22.0][stepIdx];
      camX = skySwitch.srcX + (stepIdx === 1 ? 3.5 : -2.5);
      camZ = skySwitch.srcZ + southTilt;
      lookX = skySwitch.srcX;
      lookY = skySwitch.srcY;
      lookZ = skySwitch.srcZ;
      roll = (stepIdx % 2 === 0 ? 1 : -1) * 0.045 * (1.0 - localT * 0.4);
      fov = [58, 54, 50][stepIdx];
    } else if (t < 1.26) {
      // PHASE B: Smooth High-Altitude Metropolis Pan at y = 210m!
      const panU = clamp((t - 0.54) / 0.72, 0, 1);
      const smoothU = smootherstep(0, 1, panU);
      skySwitch.panProgress = smoothU;

      // Subtle parabolic cloud crest up to 218m mid-pan
      camY = 210 + Math.sin(panU * Math.PI) * 8.0;
      skySwitch.currentAltitude = camY;

      const curFocusX = lerp(skySwitch.srcX, skySwitch.dstX, smoothU);
      const curFocusZ = lerp(skySwitch.srcZ, skySwitch.dstZ, smoothU);
      const curFocusY = lerp(skySwitch.srcY, skySwitch.dstY, smoothU);

      camX = curFocusX;
      camZ = curFocusZ + 22.0;
      lookX = curFocusX;
      lookY = curFocusY;
      lookZ = curFocusZ;

      // Banking roll proportional to lateral pan velocity
      const panVel = Math.sin(panU * Math.PI);
      const panSign = skySwitch.dstX >= skySwitch.srcX ? -1 : 1;
      roll = panSign * panVel * 0.055;
      fov = 50 + panVel * 4.0;
    } else {
      // PHASE C: 3 Punchy Descent Slam Steps (110m -> 45m -> Behind Protagonist Shoulder!)
      skySwitch.panProgress = 1.0;
      const behindYaw = wrapAngle(skySwitch.dstYaw + Math.PI);
      const shoulderCamX = skySwitch.dstX + Math.sin(behindYaw) * 5.8 + Math.cos(behindYaw) * 0.35;
      const shoulderCamY = skySwitch.dstY + 2.2;
      const shoulderCamZ = skySwitch.dstZ + Math.cos(behindYaw) * 5.8 - Math.sin(behindYaw) * 0.35;

      if (t < 1.44) {
        const u = 1.0 - Math.pow(1.0 - clamp((t - 1.26) / 0.18, 0, 1), 3.4);
        camY = lerp(210, 110, u);
        camX = skySwitch.dstX + 2.2;
        camZ = skySwitch.dstZ + lerp(22.0, 14.0, u);
        lookX = skySwitch.dstX;
        lookY = skySwitch.dstY + 1.0;
        lookZ = skySwitch.dstZ;
        roll = 0.04;
        fov = 53;
      } else if (t < 1.62) {
        const u = 1.0 - Math.pow(1.0 - clamp((t - 1.44) / 0.18, 0, 1), 3.4);
        camY = lerp(110, 45, u);
        camX = lerp(skySwitch.dstX + 2.2, skySwitch.dstX - 1.8, u);
        camZ = skySwitch.dstZ + lerp(14.0, 8.2, u);
        lookX = skySwitch.dstX;
        lookY = skySwitch.dstY + 1.2;
        lookZ = skySwitch.dstZ;
        roll = -0.035;
        fov = 57;
      } else {
        const u = smootherstep(0, 1, clamp((t - 1.62) / 0.18, 0, 1));
        camX = lerp(skySwitch.dstX - 1.8, shoulderCamX, u);
        camY = lerp(45, shoulderCamY, Math.pow(u, 0.78));
        camZ = lerp(skySwitch.dstZ + 8.2, shoulderCamZ, u);

        const lookFwdX = skySwitch.dstX + Math.sin(skySwitch.dstYaw) * 8.0;
        const lookFwdZ = skySwitch.dstZ + Math.cos(skySwitch.dstYaw) * 8.0;
        lookX = lerp(skySwitch.dstX, lookFwdX, u);
        lookY = lerp(skySwitch.dstY + 1.2, skySwitch.dstY + 1.52, u);
        lookZ = lerp(skySwitch.dstZ, lookFwdZ, u);
        roll = lerp(-0.035, 0, u);
        fov = lerp(57, 62, u);
      }
      skySwitch.currentAltitude = camY;
    }

    cam.position.set(camX, camY, camZ);
    cam.lookAt(lookX, lookY, lookZ);
    cam.rotation.z += roll;
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    return true;
  }

  // ============================================================================
  // 5B. PER-PROTAGONIST SPECIAL PERK MODIFIERS & LIVE INACTIVE AI ROUTINES
  // ============================================================================
  function cacheOriginalWeaponStats(activeCtx = ctx) {
    if (cachedBaseWeaponStats) return;
    const defs = (activeCtx?.characters || ctx?.characters)?.weaponDefs;
    if (!defs) return;
    cachedBaseWeaponStats = {};
    for (const key of Object.keys(defs)) {
      const d = defs[key];
      cachedBaseWeaponStats[key] = {
        damage: d.damage,
        dmg: d.dmg,
        spread: d.spread,
        recoil: d.recoil,
        headshotMult: d.headshotMult,
        vehicleDamageMult: d.vehicleDamageMult
      };
    }
  }

  function updateActiveProtagonistPerks(dt, rawDt, activeCtx = ctx) {
    const p = activeCtx?.player || ctx?.player;
    if (!p) return;

    cacheOriginalWeaponStats(activeCtx);
    const weaponDefs = (activeCtx?.characters || ctx?.characters)?.weaponDefs;
    const curId = activeProtagonistKey;
    const curState = protagonists[curId];
    const specialOn = Boolean(p.specialActive);

    // Trigger custom protagonist audio cue on Special Ability edge transition
    if (specialOn && !p._npcLifePrevSpecial) {
      synthAudio.playProtagonistSpecial(curId, true);
      const bp = PROTAGONIST_BLUEPRINTS[curId];
      activeCtx.ui?.showNotification?.(`⚡ ${bp.name}: Kích hoạt ${bp.perkTitle}!`, 2.6);
    } else if (!specialOn && p._npcLifePrevSpecial) {
      synthAudio.playProtagonistSpecial(curId, false);
    }
    p._npcLifePrevSpecial = specialOn;

    // 1. Weapon Damage / Accuracy Perk Scaling (`1.5x` Michael Headshot Focus, `2.0x` Viper Berserk!)
    if (weaponDefs && cachedBaseWeaponStats) {
      for (const key of Object.keys(cachedBaseWeaponStats)) {
        const base = cachedBaseWeaponStats[key];
        const def = weaponDefs[key];
        if (!def) continue;

        let dmgMult = 1.0;
        let spreadMult = 1.0;
        let recoilMult = 1.0;
        let hsMult = base.headshotMult;
        let vehMult = base.vehicleDamageMult;

        if (curId === 'michael') {
          if (specialOn && !def.isMelee) {
            dmgMult = 1.5; // Exact 1.5x Precision Bullet-Time Gun Damage!
            spreadMult = 0.28;
            recoilMult = 0.25;
            hsMult = (base.headshotMult || 2.5) * 1.35;
          } else if (!def.isMelee) {
            dmgMult = 1.08;
            spreadMult = 0.85;
          }
        } else if (curId === 'viper') {
          if (specialOn) {
            dmgMult = 2.0; // Exact 2.0x Explosive & Weapon Rampage Damage!
            vehMult = (base.vehicleDamageMult || 1.0) * 2.0;
            recoilMult = 0.45;
          } else if (def.isExplosive || key === 'shotgun') {
            dmgMult = 1.15;
          }
        }

        def.damage = Math.round(base.damage * dmgMult);
        def.dmg = def.damage;
        def.spread = base.spread * spreadMult;
        def.recoil = base.recoil * recoilMult;
        def.headshotMult = hsMult;
        def.vehicleDamageMult = vehMult;
      }
    }

    // 2. Protagonist-Specific TimeScale, Driving Reflexes & Berserk 80% Damage Shield!
    const playerCar = getPlayerVehicle(activeCtx);

    if (curId === 'franklin') {
      // Franklin: Driving Slow-Mo Reflexes + Near-Miss Traffic Recharge!
      if (playerCar && !playerCar.isHeli) {
        if (!playerCar._hasOwnDef && playerCar.def) {
          playerCar._baseGrip = playerCar.def.grip || 1.0;
          playerCar._baseAccel = playerCar.accel || 26;
          playerCar.def = { ...playerCar.def };
          playerCar._hasOwnDef = true;
        }
        const punctureMult = Number.isFinite(playerCar._punctureGripMult) ? playerCar._punctureGripMult : 1.0;
        const reflexGripBoost = specialOn ? 1.85 : 1.08;
        if (playerCar.def) {
          playerCar.def.grip = (playerCar._baseGrip || 1.0) * punctureMult * reflexGripBoost;
        }
        playerCar.accel = (playerCar._baseAccel || 26) * (specialOn ? 1.26 : 1.04);

        if (specialOn) {
          activeCtx.timeScale = 0.34;
        }

        // Near-Miss High-Speed Overtake recharges Franklin's Special Bar!
        if (nearMissRechargeCooldown > 0) nearMissRechargeCooldown -= rawDt;
        const spd = Math.hypot(playerCar.vx || 0, playerCar.vz || 0);
        if (!specialOn && spd > 20 && nearMissRechargeCooldown <= 0) {
          const vList = activeCtx.vehicles?.list || [];
          for (let i = 0; i < vList.length; i++) {
            const other = vList[i];
            if (!other || other === playerCar || other.destroyed) continue;
            const d = dist2D(playerCar.x, playerCar.z, other.x, other.z);
            if (d > 2.3 && d < 4.4) {
              nearMissRechargeCooldown = 0.9;
              p.special = Math.min(p.maxSpecial || 120, (p.special || 0) + 6.5);
              break;
            }
          }
        }
      }
    } else if (curId === 'michael') {
      // Michael: Precision Bullet-Time Headshot Focus (0.28x ultra-crisp aim slow-mo on foot!)
      if (specialOn && !playerCar) {
        activeCtx.timeScale = 0.28;
      }
    } else if (curId === 'viper') {
      // Viper: Berserk Rampage Mode (80% Damage Reduction + Punchy 0.76x Rampage Pace!)
      if (specialOn) {
        activeCtx.timeScale = 0.76;
        const prevTotal = playerHealthSnapshot + playerArmorSnapshot;
        const curHp = Number.isFinite(p.hp) ? p.hp : 100;
        const curArm = Number.isFinite(p.armor) ? p.armor : 0;
        const curTotal = curHp + curArm;

        if (curTotal < prevTotal - 0.1) {
          const rawDamageTaken = prevTotal - curTotal;
          // Absorb 80% of all incoming gunshot, melee, crash, or blast damage!
          const refunded = rawDamageTaken * 0.80;
          const armorRefund = Math.min(100 - curArm, refunded * 0.65);
          const hpRefund = refunded - armorRefund;
          p.armor = clamp(curArm + armorRefund, 0, 100);
          p.hp = clamp(Math.max(8, curHp + hpRefund), 1, p.maxHp || 125);
        }
      }
    }

    playerHealthSnapshot = Number.isFinite(p.hp) ? p.hp : 100;
    playerArmorSnapshot = Number.isFinite(p.armor) ? p.armor : 0;

    // Play arrival contextual idle pose smoothly right after Sky-Zoom lands!
    if (protagonistArrivalPoseTimer > 0) {
      protagonistArrivalPoseTimer = Math.max(0, protagonistArrivalPoseTimer - rawDt);
      const moving = Math.hypot(p.vx || 0, p.vz || 0) > 0.6 || p.inCar || p.isAiming || p.isFiring;
      if (moving && !skySwitch.active) {
        protagonistArrivalPoseTimer = 0;
      } else if (p.rig) {
        applyContextualHumanoidPose(p.rig, protagonistArrivalActivity, activeCtx.elapsed || 0);
      }
    }

    // Keep active protagonist record synced continuously
    if (curState && !skySwitch.active) {
      curState.hp = p.hp;
      curState.armor = p.armor;
      curState.special = p.special;
    }
  }

  function updateInactiveProtagonistsWorldAI(dt, activeCtx = ctx) {
    ensureProtagonistPersonalVehicles(activeCtx);
    const p = activeCtx?.player || ctx?.player;
    const clock = activeCtx?.elapsed || 0;

    for (let i = 0; i < PROTAGONIST_ORDER.length; i++) {
      const id = PROTAGONIST_ORDER[i];
      const st = protagonists[id];
      const bp = PROTAGONIST_BLUEPRINTS[id];

      if (id === activeProtagonistKey && !skySwitch.active) {
        if (st.npcMesh) st.npcMesh.visible = false;
        continue;
      }

      // During Sky-Switch ascent (0..0.54s), keep outgoing protagonist visible at src!
      if (id === activeProtagonistKey && skySwitch.active) {
        if (st.npcMesh) st.npcMesh.visible = false;
        continue;
      }

      if (crewWingmanState.active && crewWingmanState.buddyId === id) {
        continue;
      }

      const rig = ensureInactiveProtagonistAvatar(st, activeCtx);
      if (!rig || !st.npcMesh) continue;

      st.npcMesh.visible = true;
      if (st.greetCooldown > 0) st.greetCooldown -= dt;

      // Background live schedule rotation when far from player (> 115m)
      st.routineTimer -= dt;
      const dPlayer = p ? dist2D(st.x, st.z, p.x, p.z) : 999;

      if (st.routineTimer <= 0 && dPlayer > 115 && !skySwitch.active) {
        st.routineTimer = randRange(42, 75);
        st.hangoutIdx = (st.hangoutIdx + 1) % bp.secondaryHangouts.length;
        const spot = bp.secondaryHangouts[st.hangoutIdx];
        st.x = spot.x;
        st.z = spot.z;
        st.y = sampleGroundY(spot.x, spot.z, spot.y, activeCtx);
        st.yaw = spot.yaw;
        st.idleActivity = spot.activity;

        if (st.personalCar && !st.personalCar.destroyed && st.personalCar !== getPlayerVehicle(activeCtx)) {
          const cx = spot.x + Math.cos(spot.yaw) * 3.2;
          const cz = spot.z - Math.sin(spot.yaw) * 3.2;
          st.personalCar.x = cx;
          st.personalCar.z = cz;
          st.personalCar.y = sampleGroundY(cx, cz, 0.05, activeCtx);
          st.personalCar.yaw = spot.yaw;
          st.personalCar.vx = 0;
          st.personalCar.vz = 0;
          st.personalCar.mesh?.position.set(cx, st.personalCar.y, cz);
        }
      }

      // Friendly Vietnamese banter if active protagonist walks up to an inactive crewmate!
      if (p && dPlayer < 7.2 && !skySwitch.active) {
        const lookAtPlayerYaw = Math.atan2(p.x - st.x, p.z - st.z);
        st.yaw = dampAngle(st.yaw, lookAtPlayerYaw, 5.0, dt);
        if (st.greetCooldown <= 0) {
          st.greetCooldown = 18.0;
          const greet = pickRandom(bp.greetQuotes);
          if (greet) activeCtx.ui?.showSubtitle?.(greet, 4.0);
          spawnFloatingSpeechBubble(
            `protag_${id}`,
            st.x,
            st.y + 2.18,
            st.z,
            greet ? greet.replace(/^[^:]+:\s*/, '') : '"Chào người anh em!"',
            bp.colorHex,
            3.8
          );
        }
      }

      st.y = sampleGroundY(st.x, st.z, st.y, activeCtx);
      st.npcMesh.position.set(st.x, st.y, st.z);
      st.npcMesh.rotation.set(0, st.yaw, 0);

      // Contextual 3D Hand Props & Idle Pose
      if (st.phoneProp) st.phoneProp.visible = st.idleActivity === 'checking_phone';
      if (st.coffeeProp) st.coffeeProp.visible = st.idleActivity === 'drinking_coffee';

      activeCtx.characters?.animateHumanoid?.(rig, 'idle', dt);
      applyContextualHumanoidPose(rig, st.idleActivity, clock + i * 1.7);
    }
  }

  // ============================================================================
  // 6. PILLAR 2: REAL EMERGENCY DISPATCH AI (EMS AMBULANCE & LFD FIRE TRUCK!)
  // ============================================================================
  const activeAmbulances = [];
  const activeFireTrucks = [];
  const persistentBurningWrecks = [];

  const MAX_CONCURRENT_AMBULANCES = 2;
  const MAX_CONCURRENT_FIRETRUCKS = 2;

  let emsAutoScanTimer = 1.2;
  let fireAutoScanTimer = 0.8;
  let combatQuietTimer = 5.0;
  let emergencyUnitCounter = 1;

  function stepEmergencyVehicleKinematics(unit, targetX, targetZ, desiredMaxSpeed, stopRadius, dt, activeCtx = ctx) {
    const dGoal = dist2D(unit.x, unit.z, targetX, targetZ);
    if (dGoal <= stopRadius) {
      unit.speed = damp(unit.speed, 0, 9.5, dt);
      unit.steerAngle = damp(unit.steerAngle, 0, 8.0, dt);
      unit.y = sampleGroundY(unit.x, unit.z, 0.05, activeCtx);
      unit.mesh.position.set(unit.x, unit.y, unit.z);
      unit.mesh.rotation.y = unit.yaw;
      return true;
    }

    // Follow A* city road waypoints until final approach segment
    let steerTargetX = targetX;
    let steerTargetZ = targetZ;
    if (Array.isArray(unit.waypoints) && unit.waypointIdx < unit.waypoints.length) {
      const wp = unit.waypoints[unit.waypointIdx];
      const dWp = dist2D(unit.x, unit.z, wp.x, wp.z);
      if (dWp < 9.5 && unit.waypointIdx < unit.waypoints.length - 1) {
        unit.waypointIdx++;
      }
      const curWp = unit.waypoints[unit.waypointIdx];
      if (curWp) {
        steerTargetX = curWp.x;
        steerTargetZ = curWp.z;
      }
    }

    const desiredYaw = Math.atan2(steerTargetX - unit.x, steerTargetZ - unit.z);
    const yawDiff = wrapAngle(desiredYaw - unit.yaw);
    const turnSharpness = Math.abs(yawDiff);

    // Slow down smoothly for 90-degree avenue intersections & final arrival parking
    const cornerFactor = clamp(1.0 - turnSharpness * 0.45, 0.42, 1.0);
    const approachFactor = clamp((dGoal - stopRadius * 0.65) / 18.0, 0.25, 1.0);
    const targetSpd = desiredMaxSpeed * cornerFactor * approachFactor;

    unit.speed = damp(unit.speed, targetSpd, 4.8, dt);
    unit.yaw = dampAngle(unit.yaw, desiredYaw, 5.2, dt);
    unit.steerAngle = clamp(-yawDiff * 0.65, -0.42, 0.42);

    const prevX = unit.x;
    const prevZ = unit.z;
    unit.x += Math.sin(unit.yaw) * unit.speed * dt;
    unit.z += Math.cos(unit.yaw) * unit.speed * dt;

    // Respect building AABBs cleanly; if nudged, bias forward slide
    const probe = { x: unit.x, y: unit.y + 0.4, z: unit.z };
    activeCtx.world?.resolveCircleAABB?.(probe, 1.35);
    if (distSq2D(probe.x, probe.z, unit.x, unit.z) > 0.001) {
      unit.x = probe.x;
      unit.z = probe.z;
      unit.stuckTimer = (unit.stuckTimer || 0) + dt;
      if (unit.stuckTimer > 1.8) {
        // Unstick around corner curb cleanly
        unit.stuckTimer = 0;
        unit.yaw = desiredYaw;
        unit.x = lerp(prevX, steerTargetX, 0.12);
        unit.z = lerp(prevZ, steerTargetZ, 0.12);
      }
    } else {
      unit.stuckTimer = Math.max(0, (unit.stuckTimer || 0) - dt * 0.5);
    }

    unit.y = sampleGroundY(unit.x, unit.z, 0.05, activeCtx);
    unit.mesh.position.set(unit.x, unit.y, unit.z);
    unit.mesh.rotation.y = unit.yaw;

    // Spin & steer sculpted wheels + subtle chassis braking pitch
    const wheelSpin = (unit.speed / 0.40) * dt;
    for (let i = 0; i < unit.wheels.length; i++) {
      const w = unit.wheels[i];
      if (w.isFront) w.pivot.rotation.y = unit.steerAngle;
      w.spin.rotation.x += wheelSpin;
    }
    if (unit.chassis) {
      unit.chassis.rotation.z = clamp(yawDiff * unit.speed * 0.004, -0.06, 0.06);
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // 6A. EMS AMBULANCE & 2 PARAMEDICS REVIVAL STATE MACHINE
  // ---------------------------------------------------------------------------
  function spawnAmbulanceDispatch(targetX, targetZ, casualtyPed = null, activeCtx = ctx) {
    if (activeAmbulances.length >= MAX_CONCURRENT_AMBULANCES) return null;
    ensureSceneRootAttached(activeCtx);

    const spawnInfo = pickDispatchSpawnOnAvenue(targetX, targetZ, 56, 92, activeCtx);
    const built = buildSculptedAmbulanceMesh();
    const y0 = sampleGroundY(spawnInfo.x, spawnInfo.z, 0.05, activeCtx);
    built.root.position.set(spawnInfo.x, y0, spawnInfo.z);
    built.root.rotation.y = spawnInfo.yaw;
    npcLifeRoot.add(built.root);

    const parkSnap = snapPointToNearestRoadCorridor(targetX, targetZ);
    const parkX = dist2D(parkSnap.x, parkSnap.z, targetX, targetZ) < 22 ? parkSnap.x : targetX + 5.5;
    const parkZ = dist2D(parkSnap.x, parkSnap.z, targetX, targetZ) < 22 ? parkSnap.z : targetZ + 5.5;
    const waypoints = computeRoadRouteWaypoints(spawnInfo.x, spawnInfo.z, parkX, parkZ, 3.0);

    // Build 2 Paramedic Humanoids + 3D Trauma Medkit & Defibrillator
    const charSys = activeCtx?.characters || ctx?.characters;
    const medics = [];
    for (let m = 0; m < 2; m++) {
      const rig = charSys?.createHumanoid ? charSys.createHumanoid('cop') : null;
      if (rig) {
        styleParamedicHumanoid(rig);
        const mesh = rig.root || rig;
        mesh.visible = false;
        npcLifeRoot.add(mesh);
        medics.push({
          index: m,
          rig,
          mesh,
          x: spawnInfo.x,
          y: y0,
          z: spawnInfo.z,
          yaw: 0
        });
      }
    }

    const medkitProp = buildMedkitAndDefibProp();
    medkitProp.visible = false;
    npcLifeRoot.add(medkitProp);

    if (casualtyPed) {
      casualtyPed._emsClaimed = true;
    }

    const unit = {
      id: `ems_${emergencyUnitCounter++}`,
      type: 'ambulance',
      state: 'APPROACHING', // APPROACHING -> DOORS_OPENING -> MEDICS_JOGGING -> EXAMINE_AND_REVIVE -> MEDICS_RETURNING -> DEPARTING
      stateTimer: 0,
      totalAge: 0,
      x: spawnInfo.x,
      y: y0,
      z: spawnInfo.z,
      yaw: spawnInfo.yaw,
      speed: 14,
      steerAngle: 0,
      targetX,
      targetZ,
      parkX,
      parkZ,
      casualty: casualtyPed,
      waypoints,
      waypointIdx: 0,
      exitX: spawnInfo.x,
      exitZ: spawnInfo.z,
      mesh: built.root,
      chassis: built.chassis,
      wheels: built.wheels,
      rearDoorLeftPivot: built.rearDoorLeftPivot,
      rearDoorRightPivot: built.rearDoorRightPivot,
      strobeRedMat: built.strobeRedMat,
      strobeWhiteMat: built.strobeWhiteMat,
      doorOpenRatio: 0,
      sirenActive: true,
      sirenBeepTimer: 0.2,
      strobePhase: 0,
      defibFired: false,
      medics,
      medkitProp
    };

    activeAmbulances.push(unit);
    return unit;
  }

  function destroyAmbulanceUnit(unit) {
    if (!unit) return;
    if (unit.mesh?.parent) unit.mesh.parent.remove(unit.mesh);
    if (unit.medkitProp?.parent) unit.medkitProp.parent.remove(unit.medkitProp);
    if (Array.isArray(unit.medics)) {
      for (const m of unit.medics) {
        if (m.mesh?.parent) m.mesh.parent.remove(m.mesh);
      }
    }
    if (unit.casualty) {
      unit.casualty._emsClaimed = false;
    }
  }

  function reviveCasualtyPedestrian(ped, activeCtx = ctx) {
    if (!ped) return false;
    ped.dead = false;
    ped.alive = true;
    ped._deathHandled = false;
    ped._emsClaimed = false;
    ped.corpseTimer = 0;
    ped.maxHp = ped.maxHp || 65;
    ped.hp = ped.maxHp;
    ped._prevHp = ped.hp;
    ped.state = 'walk';
    ped.panicTimer = 0;
    ped.turnTimer = 5.0;

    if (ped.rig) {
      if (ped.rig.anim) {
        ped.rig.anim.ragdollProgress = 0;
        ped.rig.anim.bloodScale = 0.01;
        ped.rig.anim.state = 'idle';
      }
      if (ped.rig.parts?.bloodDisc) {
        if (ped.rig.parts.bloodDisc) ped.rig.parts.bloodDisc.visible = false;
      }
      if (ped.rig.joints?.root) {
        ped.rig.joints.root.rotation.set(0, 0, 0);
      }
      if (ped.rig.joints?.pelvis) {
        ped.rig.joints.pelvis.position.set(0, 0.92, 0);
        ped.rig.joints.pelvis.rotation.set(0, 0, 0);
      }
      activeCtx.characters?.animateHumanoid?.(ped.rig, 'idle', 0.05);
    }

    ped.y = sampleGroundY(ped.x, ped.z, 0.22, activeCtx);
    if (ped.mesh) {
      ped.mesh.visible = true;
      ped.mesh.position.set(ped.x, ped.y, ped.z);
      ped.mesh.rotation.set(0, ped.yaw || 0, 0);
    }

    spawnFloatingSpeechBubble(
      `revived_${Math.round(ped.x)}_${Math.round(ped.z)}`,
      ped.x,
      ped.y + 2.15,
      ped.z,
      '"Trời ơi may quá sống rồi! Cảm ơn đội cấp cứu EMS!"',
      '#4ade80',
      4.0
    );
    return true;
  }

  function updateAmbulancesAndParamedics(dt, activeCtx = ctx) {
    const p = activeCtx?.player || ctx?.player;
    const clock = activeCtx?.elapsed || 0;

    // Automatic Casualty Detection when no heavy firefight is raging at the scene
    emsAutoScanTimer -= dt;
    if (emsAutoScanTimer <= 0 && activeAmbulances.length < MAX_CONCURRENT_AMBULANCES && p && !isPlayerInsideInterior(p)) {
      emsAutoScanTimer = 2.4;
      const wantedStars = activeCtx.gameplay?.wanted?.stars || 0;
      const heavyCombatNear = combatQuietTimer < 2.2 || wantedStars >= 3;

      if (!heavyCombatNear) {
        const peds = activeCtx.gameplay?.peds || [];
        let bestCasualty = null;
        let bestDist = 115;

        for (let i = 0; i < peds.length; i++) {
          const ped = peds[i];
          if (!ped || !ped.dead || ped._emsClaimed || ped.isMissionEnemy) continue;
          if (ped.y > 18 || ped.x < -210) continue; // Skip rooftop or deep surf
          const d = dist2D(ped.x, ped.z, p.x, p.z);
          if (d < bestDist && d > 4.0) {
            bestDist = d;
            bestCasualty = ped;
          }
        }

        if (bestCasualty) {
          spawnAmbulanceDispatch(bestCasualty.x, bestCasualty.z, bestCasualty, activeCtx);
          activeCtx.ui?.showNotification?.('🚑 Xe Cấp Cứu Tiên Thành EMS đang hú còi tới hiện trường cứu người!', 3.2);
        }
      }
    }

    for (let i = activeAmbulances.length - 1; i >= 0; i--) {
      const unit = activeAmbulances[i];
      unit.totalAge += dt;
      unit.stateTimer += dt;

      // Prevent gameplay.js from despawning the claimed casualty while Y Sư Cấp Cứu are working!
      if (unit.casualty && unit.casualty.dead) {
        unit.casualty.corpseTimer = Math.min(unit.casualty.corpseTimer || 0, 2.0);
        unit.targetX = unit.casualty.x;
        unit.targetZ = unit.casualty.z;
      }

      // Despawn cleanly if very far from player or finished mission timeout
      const distPlayer = p ? dist2D(unit.x, unit.z, p.x, p.z) : 50;
      if (distPlayer > 215 || unit.totalAge > 85) {
        destroyAmbulanceUnit(unit);
        activeAmbulances.splice(i, 1);
        continue;
      }

      // Flashing Red/White Emergency LED Lightbar + Spatial Two-Tone Siren
      if (unit.sirenActive) {
        unit.strobePhase += dt * 13.0;
        const redFlash = Math.sin(unit.strobePhase) > 0;
        unit.strobeRedMat.emissiveIntensity = redFlash ? 4.2 : 0.3;
        unit.strobeWhiteMat.emissiveIntensity = !redFlash ? 3.8 : 0.3;

        if (unit.state === 'APPROACHING') {
          unit.sirenBeepTimer -= dt;
          if (unit.sirenBeepTimer <= 0) {
            unit.sirenBeepTimer = 1.35;
            if (distPlayer < 95) {
              synthAudio.playEmsSirenTwoTone(1.0 - distPlayer / 100);
            }
          }
        }
      } else {
        unit.strobeRedMat.emissiveIntensity = 0.2;
        unit.strobeWhiteMat.emissiveIntensity = 0.2;
      }

      // Smooth Rear Double-Door Swing Animation
      const targetDoorRatio =
        unit.state === 'DOORS_OPENING' ||
        unit.state === 'MEDICS_JOGGING' ||
        unit.state === 'EXAMINE_AND_REVIVE'
          ? 1.0
          : 0.0;
      unit.doorOpenRatio = damp(unit.doorOpenRatio, targetDoorRatio, 6.5, dt);
      unit.rearDoorLeftPivot.rotation.y = unit.doorOpenRatio * 1.78;
      unit.rearDoorRightPivot.rotation.y = -unit.doorOpenRatio * 1.78;

      if (unit.state === 'APPROACHING') {
        const arrived = stepEmergencyVehicleKinematics(
          unit,
          unit.parkX,
          unit.parkZ,
          21.5,
          7.8,
          dt,
          activeCtx
        );
        if (arrived || unit.stateTimer > 18.0) {
          unit.state = 'DOORS_OPENING';
          unit.stateTimer = 0;
          unit.speed = 0;
        }
      } else if (unit.state === 'DOORS_OPENING') {
        if (unit.stateTimer >= 0.55) {
          unit.state = 'MEDICS_JOGGING';
          unit.stateTimer = 0;

          // Deploy both Y Sư Cấp Cứu at the rear step bumper (-sinY * 3.3, -cosY * 3.3)
          const rearX = unit.x - Math.sin(unit.yaw) * 3.4;
          const rearZ = unit.z - Math.cos(unit.yaw) * 3.4;
          for (let m = 0; m < unit.medics.length; m++) {
            const med = unit.medics[m];
            med.x = rearX + (m === 0 ? -0.65 : 0.65);
            med.z = rearZ;
            med.y = sampleGroundY(med.x, med.z, 0.22, activeCtx);
            med.mesh.visible = true;
            med.mesh.position.set(med.x, med.y, med.z);
          }
          // Attach trauma medkit to Paramedic #1's right hand while jogging!
          if (unit.medics[0]?.rig?.joints?.handR) {
            unit.medkitProp.visible = true;
            unit.medics[0].rig.joints.handR.add(unit.medkitProp);
            unit.medkitProp.position.set(0, -0.22, 0.04);
            unit.medkitProp.rotation.set(0, 0, 0);
          }
        }
      } else if (unit.state === 'MEDICS_JOGGING') {
        let allReached = true;
        for (let m = 0; m < unit.medics.length; m++) {
          const med = unit.medics[m];
          const standOffAngle = m === 0 ? 0.4 : -1.2;
          const goalX = unit.targetX + Math.cos(standOffAngle) * 0.95;
          const goalZ = unit.targetZ + Math.sin(standOffAngle) * 0.95;
          const d = dist2D(med.x, med.z, goalX, goalZ);

          if (d > 0.45) {
            allReached = false;
            const jogSpd = 4.4;
            med.yaw = dampAngle(med.yaw, Math.atan2(goalX - med.x, goalZ - med.z), 9.0, dt);
            med.x += ((goalX - med.x) / d) * jogSpd * dt;
            med.z += ((goalZ - med.z) / d) * jogSpd * dt;
            med.y = sampleGroundY(med.x, med.z, 0.22, activeCtx);
            med.mesh.position.set(med.x, med.y, med.z);
            med.mesh.rotation.y = med.yaw;
            activeCtx.characters?.animateHumanoid?.(med.rig, 'run', dt);
          } else {
            med.yaw = Math.atan2(unit.targetX - med.x, unit.targetZ - med.z);
            med.mesh.rotation.y = med.yaw;
            activeCtx.characters?.animateHumanoid?.(med.rig, 'idle', dt);
          }
        }

        if (allReached || unit.stateTimer > 6.5) {
          unit.state = 'EXAMINE_AND_REVIVE';
          unit.stateTimer = 0;
          unit.defibFired = false;

          // Place 3D Red Trauma Medkit on ground right beside casualty!
          npcLifeRoot.add(unit.medkitProp);
          const mkY = sampleGroundY(unit.targetX + 0.55, unit.targetZ + 0.35, 0.22, activeCtx);
          unit.medkitProp.position.set(unit.targetX + 0.55, mkY, unit.targetZ + 0.35);
          unit.medkitProp.rotation.set(0, unit.medics[0]?.yaw || 0, 0);
          unit.medkitProp.visible = true;

          if (unit.medics[0]) {
            spawnFloatingSpeechBubble(
              `${unit.id}_talk`,
              unit.medics[0].x,
              unit.medics[0].y + 2.12,
              unit.medics[0].z,
              '"Kiểm tra nhịp tim... Chuẩn bị máy sốc điện 200J — Đứng lùi ra!"',
              '#38bdf8',
              3.2
            );
          }
        }
      } else if (unit.state === 'EXAMINE_AND_REVIVE') {
        // Paramedic #1 performs kneeling CPR & defibrillator shock; Paramedic #2 monitors vitals
        for (let m = 0; m < unit.medics.length; m++) {
          const med = unit.medics[m];
          med.yaw = Math.atan2(unit.targetX - med.x, unit.targetZ - med.z);
          med.mesh.position.set(med.x, med.y, med.z);
          med.mesh.rotation.y = med.yaw;
          activeCtx.characters?.animateHumanoid?.(med.rig, 'idle', dt);
          if (m === 0) {
            applyContextualHumanoidPose(med.rig, 'paramedic_kneel_cpr', clock);
          } else {
            applyContextualHumanoidPose(med.rig, 'checking_phone', clock);
          }
        }

        if (!unit.defibFired && unit.stateTimer >= 1.8) {
          unit.defibFired = true;
          if (distPlayer < 65) synthAudio.playDefibChargeAndShock();
          const spark = unit.medkitProp.userData?.defibSpark;
          if (spark) {
            spark.visible = true;
            spark.position.set(unit.targetX - unit.medkitProp.position.x, 0.35, unit.targetZ - unit.medkitProp.position.z);
          }
        }

        if (unit.medkitProp.userData?.defibSpark?.visible && unit.stateTimer > 2.65) {
          unit.medkitProp.userData.defibSpark.visible = false;
        }

        if (unit.stateTimer >= 3.2) {
          if (unit.casualty && unit.casualty.dead) {
            reviveCasualtyPedestrian(unit.casualty, activeCtx);
          }
          if (unit.medics[0]?.rig?.joints?.handR) {
            unit.medics[0].rig.joints.handR.add(unit.medkitProp);
            unit.medkitProp.position.set(0, -0.22, 0.04);
          }
          unit.state = 'MEDICS_RETURNING';
          unit.stateTimer = 0;
        }
      } else if (unit.state === 'MEDICS_RETURNING') {
        const rearX = unit.x - Math.sin(unit.yaw) * 3.2;
        const rearZ = unit.z - Math.cos(unit.yaw) * 3.2;
        let allBoarded = true;

        for (let m = 0; m < unit.medics.length; m++) {
          const med = unit.medics[m];
          if (!med.mesh.visible) continue;
          const d = dist2D(med.x, med.z, rearX, rearZ);
          if (d > 0.75) {
            allBoarded = false;
            const spd = 4.2;
            med.yaw = dampAngle(med.yaw, Math.atan2(rearX - med.x, rearZ - med.z), 9.0, dt);
            med.x += ((rearX - med.x) / d) * spd * dt;
            med.z += ((rearZ - med.z) / d) * spd * dt;
            med.y = sampleGroundY(med.x, med.z, 0.22, activeCtx);
            med.mesh.position.set(med.x, med.y, med.z);
            med.mesh.rotation.y = med.yaw;
            activeCtx.characters?.animateHumanoid?.(med.rig, 'run', dt);
          } else {
            med.mesh.visible = false;
          }
        }

        if (allBoarded || unit.stateTimer > 6.0) {
          for (const med of unit.medics) med.mesh.visible = false;
          unit.medkitProp.visible = false;
          unit.sirenActive = false;
          unit.waypoints = computeRoadRouteWaypoints(unit.x, unit.z, unit.exitX, unit.exitZ, 3.0);
          unit.waypointIdx = 0;
          unit.state = 'DEPARTING';
          unit.stateTimer = 0;
        }
      } else if (unit.state === 'DEPARTING') {
        const done = stepEmergencyVehicleKinematics(
          unit,
          unit.exitX,
          unit.exitZ,
          17.5,
          6.0,
          dt,
          activeCtx
        );
        if (done || unit.stateTimer > 18.0) {
          destroyAmbulanceUnit(unit);
          activeAmbulances.splice(i, 1);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 6B. SCULPTED RED LFD FIRE TRUCK & 3D PARABOLIC WATER-CANNON ARC AI
  // ---------------------------------------------------------------------------
  function attachBurningWreckFlames(car) {
    if (!car || car._wreckFireObj) return;
    const fireGrp = buildPersistentWreckFireGroup();
    const y0 = Number.isFinite(car.y) ? car.y : 0.05;
    fireGrp.position.set(car.x, y0 + 0.45, car.z);
    npcLifeRoot.add(fireGrp);

    const wreckEntry = {
      car,
      fireGrp,
      intensity: 1.0,
      life: 48.0
    };
    car._wreckFireObj = wreckEntry;
    persistentBurningWrecks.push(wreckEntry);
  }

  function spawnFireTruckDispatch(targetX, targetZ, burningCar = null, activeCtx = ctx) {
    if (activeFireTrucks.length >= MAX_CONCURRENT_FIRETRUCKS) return null;
    ensureSceneRootAttached(activeCtx);

    const spawnInfo = pickDispatchSpawnOnAvenue(targetX, targetZ, 58, 96, activeCtx);
    const built = buildSculptedFireTruckMesh();
    const y0 = sampleGroundY(spawnInfo.x, spawnInfo.z, 0.05, activeCtx);
    built.root.position.set(spawnInfo.x, y0, spawnInfo.z);
    built.root.rotation.y = spawnInfo.yaw;
    npcLifeRoot.add(built.root);

    // Park 13m away from the blaze so the roof water-cannon forms a dramatic high-pressure arc!
    const dirToSpawnYaw = Math.atan2(spawnInfo.x - targetX, spawnInfo.z - targetZ);
    const rawParkX = targetX + Math.sin(dirToSpawnYaw) * 13.5;
    const rawParkZ = targetZ + Math.cos(dirToSpawnYaw) * 13.5;
    const parkSnap = snapPointToNearestRoadCorridor(rawParkX, rawParkZ);
    const parkX = dist2D(parkSnap.x, parkSnap.z, targetX, targetZ) < 24 ? parkSnap.x : rawParkX;
    const parkZ = dist2D(parkSnap.x, parkSnap.z, targetX, targetZ) < 24 ? parkSnap.z : rawParkZ;
    const waypoints = computeRoadRouteWaypoints(spawnInfo.x, spawnInfo.z, parkX, parkZ, 3.2);

    const waterArcObj = createDynamicWaterArcStreamMesh();

    // 2 Turnout-Gear LFD Đội Cứu Hỏa
    const charSys = activeCtx?.characters || ctx?.characters;
    const crew = [];
    for (let cIdx = 0; cIdx < 2; cIdx++) {
      const rig = charSys?.createHumanoid ? charSys.createHumanoid('road_worker') : null;
      if (rig) {
        styleFirefighterHumanoid(rig);
        const mesh = rig.root || rig;
        mesh.visible = false;
        npcLifeRoot.add(mesh);
        crew.push({ rig, mesh, x: spawnInfo.x, y: y0, z: spawnInfo.z, yaw: 0 });
      }
    }

    if (burningCar) {
      burningCar._lfdClaimed = true;
      attachBurningWreckFlames(burningCar);
    }

    const unit = {
      id: `lfd_${emergencyUnitCounter++}`,
      type: 'firetruck',
      state: 'ARRIVING', // ARRIVING -> DEPLOY_CREW -> BLASTING_WATER_ARC -> MOP_UP -> DEPARTING
      stateTimer: 0,
      totalAge: 0,
      x: spawnInfo.x,
      y: y0,
      z: spawnInfo.z,
      yaw: spawnInfo.yaw,
      speed: 15,
      steerAngle: 0,
      targetX,
      targetZ,
      parkX,
      parkZ,
      exitX: spawnInfo.x,
      exitZ: spawnInfo.z,
      burningCar,
      waypoints,
      waypointIdx: 0,
      mesh: built.root,
      chassis: built.chassis,
      wheels: built.wheels,
      turretYawPivot: built.turretYawPivot,
      turretPitchPivot: built.turretPitchPivot,
      nozzleMuzzleAnchor: built.nozzleMuzzleAnchor,
      strobeRedMat: built.strobeRedMat,
      strobeAmberMat: built.strobeAmberMat,
      waterArcObj,
      crew,
      sirenActive: true,
      hornTimer: 0.35,
      strobePhase: 0,
      sprayProgress: 0,
      dropletEmitTimer: 0,
      steamEmitTimer: 0,
      puddleSpawned: false
    };

    activeFireTrucks.push(unit);
    return unit;
  }

  function destroyFireTruckUnit(unit) {
    if (!unit) return;
    if (unit.mesh?.parent) unit.mesh.parent.remove(unit.mesh);
    if (unit.waterArcObj?.mesh?.parent) {
      unit.waterArcObj.mesh.visible = false;
      unit.waterArcObj.mesh.parent.remove(unit.waterArcObj.mesh);
      unit.waterArcObj.geo?.dispose?.();
    }
    if (Array.isArray(unit.crew)) {
      for (const ff of unit.crew) {
        if (ff.mesh?.parent) ff.mesh.parent.remove(ff.mesh);
      }
    }
  }

  function updateFireTrucksAndWaterCannons(dt, activeCtx = ctx) {
    const p = activeCtx?.player || ctx?.player;
    const clock = activeCtx?.elapsed || 0;
    let maxActiveWaterAudioIntensity = 0;

    // 1. Animate Persistent Wreck Fires & Scan for New Vehicle Blazes / Explosions
    for (let w = persistentBurningWrecks.length - 1; w >= 0; w--) {
      const wr = persistentBurningWrecks[w];
      wr.life -= dt;
      if (!wr.car || wr.intensity <= 0.02 || wr.life <= 0 || (ctx.vehicles?.list && !ctx.vehicles.list.includes(wr.car))) {
        if (wr.fireGrp?.parent) wr.fireGrp.parent.remove(wr.fireGrp);
        if (wr.car) wr.car._wreckFireObj = null;
        persistentBurningWrecks.splice(w, 1);
        continue;
      }

      wr.fireGrp.position.set(wr.car.x, (wr.car.y || 0.05) + 0.42, wr.car.z);
      const cones = wr.fireGrp.userData?.cones || [];
      for (let c = 0; c < cones.length; c++) {
        const flicker = 0.82 + Math.sin(clock * (14 + c * 3.7) + c) * 0.24;
        const s = wr.intensity * flicker;
        cones[c].scale.set(s * (c >= 2 ? 0.65 : 1.1), s * (c >= 2 ? 0.9 : 1.35), s * (c >= 2 ? 0.65 : 1.1));
        cones[c].rotation.y += dt * (c % 2 === 0 ? 2.5 : -2.5);
      }
    }

    fireAutoScanTimer -= dt;
    if (fireAutoScanTimer <= 0 && p && !isPlayerInsideInterior(p)) {
      fireAutoScanTimer = 1.1;
      const vList = activeCtx.vehicles?.list || [];
      let targetBlazeCar = null;
      let bestDist = 140;

      for (let i = 0; i < vList.length; i++) {
        const car = vList[i];
        if (!car || car.isHeli) continue;

        // Attach persistent flames to any newly burning or freshly exploded vehicle!
        if ((car.onFire || (car.destroyed && !car._lfdExtinguished)) && !car._wreckFireObj) {
          attachBurningWreckFlames(car);
        }

        if ((car.onFire || (car.destroyed && !car._lfdExtinguished)) && !car._lfdClaimed) {
          const d = dist2D(car.x, car.z, p.x, p.z);
          if (d < bestDist) {
            bestDist = d;
            targetBlazeCar = car;
          }
        }
      }

      if (targetBlazeCar && activeFireTrucks.length < MAX_CONCURRENT_FIRETRUCKS) {
        spawnFireTruckDispatch(targetBlazeCar.x, targetBlazeCar.z, targetBlazeCar, activeCtx);
        activeCtx.ui?.showNotification?.('🚒 Xe Cứu Hỏa LFD đang hú còi & bật vòi rồng tới dập đám cháy xe!', 3.5);
      }
    }

    // 2. Step Active LFD Fire Trucks & High-Pressure Water-Cannon Streams
    for (let i = activeFireTrucks.length - 1; i >= 0; i--) {
      const unit = activeFireTrucks[i];
      unit.totalAge += dt;
      unit.stateTimer += dt;

      if (unit.burningCar) {
        unit.targetX = unit.burningCar.x;
        unit.targetZ = unit.burningCar.z;
      }

      const distPlayer = p ? dist2D(unit.x, unit.z, p.x, p.z) : 50;
      if (distPlayer > 225 || unit.totalAge > 90) {
        destroyFireTruckUnit(unit);
        activeFireTrucks.splice(i, 1);
        continue;
      }

      // Red/Amber Strobe Lightbar & Dual Brass Air-Horn
      if (unit.sirenActive) {
        unit.strobePhase += dt * 14.5;
        const rOn = Math.sin(unit.strobePhase) > 0;
        unit.strobeRedMat.emissiveIntensity = rOn ? 4.4 : 0.3;
        unit.strobeAmberMat.emissiveIntensity = !rOn ? 4.0 : 0.3;

        if (unit.state === 'ARRIVING') {
          unit.hornTimer -= dt;
          if (unit.hornTimer <= 0) {
            unit.hornTimer = randRange(2.1, 3.2);
            if (distPlayer < 105) {
              synthAudio.playFireAirHorn(1.0 - distPlayer / 110);
            }
          }
        }
      } else {
        unit.strobeRedMat.emissiveIntensity = 0.2;
        unit.strobeAmberMat.emissiveIntensity = 0.2;
      }

      if (unit.state === 'ARRIVING') {
        unit.waterArcObj.mesh.visible = false;
        const arrived = stepEmergencyVehicleKinematics(
          unit,
          unit.parkX,
          unit.parkZ,
          20.5,
          14.2,
          dt,
          activeCtx
        );
        if (arrived || unit.stateTimer > 19.0) {
          unit.state = 'DEPLOY_CREW';
          unit.stateTimer = 0;
          unit.speed = 0;
          if (distPlayer < 85) synthAudio.playFireAirHorn(0.8);
        }
      } else if (unit.state === 'DEPLOY_CREW') {
        // Deploy 2 LFD Đội Cứu Hỏa flanking cab doors
        const sideX = Math.cos(unit.yaw) * 2.1;
        const sideZ = -Math.sin(unit.yaw) * 2.1;
        for (let k = 0; k < unit.crew.length; k++) {
          const ff = unit.crew[k];
          const sign = k === 0 ? 1 : -1;
          ff.x = unit.x + sideX * sign + Math.sin(unit.yaw) * 1.4;
          ff.z = unit.z + sideZ * sign + Math.cos(unit.yaw) * 1.4;
          ff.y = sampleGroundY(ff.x, ff.z, 0.22, activeCtx);
          ff.yaw = Math.atan2(unit.targetX - ff.x, unit.targetZ - ff.z);
          ff.mesh.visible = true;
          ff.mesh.position.set(ff.x, ff.y, ff.z);
          ff.mesh.rotation.y = ff.yaw;
          activeCtx.characters?.animateHumanoid?.(ff.rig, 'idle', dt);
        }

        if (unit.stateTimer >= 0.65) {
          unit.state = 'BLASTING_WATER_ARC';
          unit.stateTimer = 0;
          unit.sprayProgress = 0;
          if (unit.crew[0]) {
            spawnFloatingSpeechBubble(
              `${unit.id}_cmd`,
              unit.crew[0].x,
              unit.crew[0].y + 2.15,
              unit.crew[0].z,
              '"Mở van áp lực tối đa! Phun vòi rồng dập lửa ngay!"',
              '#fbbf24',
              3.4
            );
          }
        }
      } else if (unit.state === 'BLASTING_WATER_ARC') {
        // Hold car.fireTimer steady while water-cannon actively cools the engine!
        if (unit.burningCar && unit.burningCar.onFire) {
          unit.burningCar.fireTimer = Math.max(unit.burningCar.fireTimer || 2.0, 2.5);
        }

        // Aim 360° Roof Deck Turret with realistic sweeping nozzle oscillation
        const sweepOffset = Math.sin(clock * 3.4) * 0.16;
        const worldTargetYaw = Math.atan2(unit.targetX - unit.x, unit.targetZ - unit.z) + sweepOffset;
        const localTurretYaw = wrapAngle(worldTargetYaw - unit.yaw);
        unit.turretYawPivot.rotation.y = dampAngle(unit.turretYawPivot.rotation.y, localTurretYaw, 8.0, dt);
        unit.turretPitchPivot.rotation.x = -0.26 + Math.sin(clock * 2.2) * 0.04;

        unit.mesh.updateMatrixWorld(true);
        unit.nozzleMuzzleAnchor.getWorldPosition(_vecD);

        const impactY = (unit.burningCar?.y ?? sampleGroundY(unit.targetX, unit.targetZ, 0.05, activeCtx)) + 0.55;
        const impactX = unit.targetX + Math.sin(clock * 3.4) * 0.75;
        const impactZ = unit.targetZ + Math.cos(clock * 2.7) * 0.75;
        const targetVec = { x: impactX, y: impactY, z: impactZ };

        const horizDist = dist2D(_vecD.x, _vecD.z, impactX, impactZ);
        const arcLift = clamp(horizDist * 0.20, 1.6, 4.2);
        updateParabolicWaterArcGeometry(unit.waterArcObj, _vecD, targetVec, arcLift, clock);

        // Emit high-velocity pressurized droplets & billowing white steam on contact!
        unit.dropletEmitTimer -= dt;
        if (unit.dropletEmitTimer <= 0) {
          unit.dropletEmitTimer = 0.035;
          const dirX = (impactX - _vecD.x) / Math.max(1, horizDist);
          const dirZ = (impactZ - _vecD.z) / Math.max(1, horizDist);
          spawnWaterCannonDroplet(
            _vecD.x,
            _vecD.y,
            _vecD.z,
            dirX * 14.5,
            3.8,
            dirZ * 14.5
          );
          spawnWaterCannonDroplet(
            impactX,
            impactY + 0.25,
            impactZ,
            randRange(-3.2, 3.2),
            randRange(1.8, 4.2),
            randRange(-3.2, 3.2)
          );
        }

        unit.steamEmitTimer -= dt;
        if (unit.steamEmitTimer <= 0) {
          unit.steamEmitTimer = 0.11;
          spawnExtinguishSteamPuff(impactX, impactY, impactZ);
          if (distPlayer < 65 && Math.random() < 0.35) {
            synthAudio.playSteamSizzle(1.0 - distPlayer / 70);
          }
        }

        if (!unit.puddleSpawned && unit.stateTimer > 0.8) {
          unit.puddleSpawned = true;
          const groundAtBlaze = sampleGroundY(unit.targetX, unit.targetZ, 0.02, activeCtx);
          spawnWetAsphaltPuddle(unit.targetX, groundAtBlaze, unit.targetZ, 3.4);
        }

        if (distPlayer < 85) {
          maxActiveWaterAudioIntensity = Math.max(maxActiveWaterAudioIntensity, clamp(1.0 - distPlayer / 90, 0, 1));
        }

        // Đội Cứu Hỏa animate steady hose/spotter stance
        for (let k = 0; k < unit.crew.length; k++) {
          const ff = unit.crew[k];
          activeCtx.characters?.animateHumanoid?.(ff.rig, 'aim_2h', dt);
        }

        // Progressively extinguish the fire over 3.8 seconds!
        unit.sprayProgress = clamp(unit.stateTimer / 3.8, 0, 1);
        if (unit.burningCar?._wreckFireObj) {
          unit.burningCar._wreckFireObj.intensity = Math.max(0, 1.0 - unit.sprayProgress);
        }

        if (unit.sprayProgress >= 1.0) {
          unit.waterArcObj.mesh.visible = false;
          if (unit.burningCar) {
            unit.burningCar.onFire = false;
            unit.burningCar.fireTimer = 0;
            unit.burningCar._lfdExtinguished = true;
            unit.burningCar._lfdClaimed = false;
            if (!unit.burningCar.destroyed && unit.burningCar.hp < unit.burningCar.maxHp * 0.35) {
              unit.burningCar.hp = Math.round(unit.burningCar.maxHp * 0.38);
            }
            if (unit.burningCar._wreckFireObj) {
              unit.burningCar._wreckFireObj.intensity = 0;
            }
          }
          if (distPlayer < 95) {
            activeCtx.ui?.showNotification?.('🚒 Đội Cứu Hỏa LFD đã dập tắt hoàn toàn đám cháy xe!', 3.2);
          }
          unit.state = 'MOP_UP';
          unit.stateTimer = 0;
        }
      } else if (unit.state === 'MOP_UP') {
        unit.waterArcObj.mesh.visible = false;
        unit.turretYawPivot.rotation.y = dampAngle(unit.turretYawPivot.rotation.y, 0, 5.0, dt);
        unit.turretPitchPivot.rotation.x = damp(unit.turretPitchPivot.rotation.x, 0, 5.0, dt);

        if (unit.stateTimer >= 1.4) {
          for (const ff of unit.crew) ff.mesh.visible = false;
          unit.sirenActive = false;
          unit.waypoints = computeRoadRouteWaypoints(unit.x, unit.z, unit.exitX, unit.exitZ, 3.2);
          unit.waypointIdx = 0;
          unit.state = 'DEPARTING';
          unit.stateTimer = 0;
        }
      } else if (unit.state === 'DEPARTING') {
        const done = stepEmergencyVehicleKinematics(
          unit,
          unit.exitX,
          unit.exitZ,
          17.0,
          6.5,
          dt,
          activeCtx
        );
        if (done || unit.stateTimer > 18.0) {
          destroyFireTruckUnit(unit);
          activeFireTrucks.splice(i, 1);
        }
      }
    }

    return maxActiveWaterAudioIntensity;
  }

  /**
   * Public Emergency Dispatch API (`ctx.npcLife.dispatchEmergency(type, x, z, opts)`)
   */
  function dispatchEmergency(type = 'auto', x = null, z = null, opts = {}) {
    const p = ctx.player;
    const tx = Number.isFinite(x) ? x : (p ? p.x + Math.sin(p.yaw || 0) * 14 : 34);
    const tz = Number.isFinite(z) ? z : (p ? p.z + Math.cos(p.yaw || 0) * 14 : 20);
    const key = String(type || 'auto').trim().toLowerCase();

    if (key.includes('fire') || key.includes('lfd') || key.includes('cuu_hoa')) {
      const unit = spawnFireTruckDispatch(tx, tz, opts.car || null, ctx);
      if (unit) {
        ctx.ui?.showNotification?.('🚒 Tổng đài 911: Đã điều Xe Cứu Hỏa LFD Engine #07 tới vị trí!', 3.2);
      }
      return unit;
    }

    if (key.includes('amb') || key.includes('ems') || key.includes('medic') || key.includes('cap_cuu')) {
      const unit = spawnAmbulanceDispatch(tx, tz, opts.ped || null, ctx);
      if (unit) {
        ctx.ui?.showNotification?.('🚑 Tổng đài 911: Đã điều Xe Cấp Cứu Tiên Thành EMS tới hiện trường!', 3.2);
      }
      return unit;
    }

    // 'auto': check if there is a burning car nearby first, otherwise dispatch EMS Xe Cứu Thương!
    const vList = ctx.vehicles?.list || [];
    const nearFireCar = vList.find((v) => v && (v.onFire || (v.destroyed && !v._lfdExtinguished)) && dist2D(v.x, v.z, tx, tz) < 45);
    if (nearFireCar) {
      return spawnFireTruckDispatch(nearFireCar.x, nearFireCar.z, nearFireCar, ctx);
    }
    const peds = ctx.gameplay?.peds || [];
    const nearDeadPed = peds.find((ped) => ped && ped.dead && !ped._emsClaimed && dist2D(ped.x, ped.z, tx, tz) < 45);
    return spawnAmbulanceDispatch(
      nearDeadPed ? nearDeadPed.x : tx,
      nearDeadPed ? nearDeadPed.z : tz,
      nearDeadPed || null,
      ctx
    );
  }

  // ============================================================================
  // 7. PILLAR 3: ADVANCED Thiên Đình Chấp Pháp COUNTERMEASURES (>= 3★ SPIKE STRIPS, FAST-ROPE & COVER)
  // ============================================================================
  const activeSpikeStrips = [];
  const activeFastRopeInsertions = [];
  const cruiserDoorShieldMap = new WeakMap();

  const MAX_ACTIVE_SPIKE_STRIPS = 4;
  const MAX_ACTIVE_FAST_ROPES = 2;

  let autoSpikeDeployCooldown = 10.0;
  let autoFastRopeCooldown = 14.0;
  let spikeStripIdCounter = 1;

  // ---------------------------------------------------------------------------
  // 7A. POLICE ROADBLOCK SPIKE STRIPS & TIRE-PUNCTURE RIM-SPARK PHYSICS
  // ---------------------------------------------------------------------------
  function deploySpikeStrip(x = null, z = null, yaw = null, opts = {}) {
    ensureSceneRootAttached(ctx);
    const p = ctx.player;
    const playerCar = getPlayerVehicle(ctx);

    let deployX = x;
    let deployZ = z;
    let deployYaw = yaw;

    if (!Number.isFinite(deployX) || !Number.isFinite(deployZ)) {
      // Predict road corridor 56m ahead of speeding player!
      const refX = playerCar ? playerCar.x : (p?.x ?? 40);
      const refZ = playerCar ? playerCar.z : (p?.z ?? 20);
      const vx = playerCar ? (playerCar.vx || 0) : (p?.vx || 0);
      const vz = playerCar ? (playerCar.vz || 0) : (p?.vz || 0);
      const spd = Math.hypot(vx, vz);
      const dirYaw = spd > 2.0 ? Math.atan2(vx, vz) : (playerCar?.yaw ?? p?.yaw ?? 0);

      const aheadX = refX + Math.sin(dirYaw) * 58.0;
      const aheadZ = refZ + Math.cos(dirYaw) * 58.0;
      const snapped = snapPointToNearestRoadCorridor(aheadX, aheadZ);
      deployX = snapped.x;
      deployZ = snapped.z;
      // Orient strip across road lane: strip local X-axis is 7.6m wide!
      // When road runs North-South along Z (`axis === 'Z'`), yaw = 0 places local X across East-West!
      // When road runs East-West along X (`axis === 'X'`), yaw = PI/2 places local X across North-South!
      deployYaw = snapped.axis === 'Z' ? 0 : Math.PI / 2;
    } else if (!Number.isFinite(deployYaw)) {
      const snapped = snapPointToNearestRoadCorridor(deployX, deployZ);
      deployYaw = snapped.axis === 'Z' ? 0 : Math.PI / 2;
    }

    // Recycle oldest spike strip if pool is full
    if (activeSpikeStrips.length >= MAX_ACTIVE_SPIKE_STRIPS) {
      const oldest = activeSpikeStrips.shift();
      destroySpikeStripObj(oldest);
    }

    const groundY = sampleGroundY(deployX, deployZ, 0.02, ctx);
    const stripWidth = opts.width || 7.8;
    const mesh = buildSpikeStripMesh(stripWidth);
    mesh.position.set(deployX, groundY + 0.01, deployZ);
    mesh.rotation.y = deployYaw;
    // Animate quick accordion unfold from 0.15x -> 1.0x width!
    mesh.scale.set(0.15, 1.0, 1.0);
    npcLifeRoot.add(mesh);

    // Optional roadblock cruiser & kneeling Thiên Đình Chấp Pháp officer on shoulder beside the spike strip
    let officerRig = null;
    let officerMesh = null;
    let roadblockCar = null;
    if (opts.withRoadblock !== false && ctx.characters?.createHumanoid) {
      const shoulderOffset = stripWidth * 0.5 + 1.65;
      const offX = deployX + Math.cos(deployYaw) * shoulderOffset;
      const offZ = deployZ - Math.sin(deployYaw) * shoulderOffset;
      const offY = sampleGroundY(offX, offZ, 0.22, ctx);

      officerRig = ctx.characters.createHumanoid('cop');
      officerMesh = officerRig.root || officerRig;
      officerMesh.position.set(offX, offY, offZ);
      officerMesh.rotation.y = deployYaw - Math.PI / 2;
      npcLifeRoot.add(officerMesh);

      if (opts.spawnCruiser && ctx.vehicles?.spawnVehicle) {
        const cruiserX = deployX - Math.cos(deployYaw) * (stripWidth * 0.5 + 2.8);
        const cruiserZ = deployZ + Math.sin(deployYaw) * (stripWidth * 0.5 + 2.8);
        const cruiserY = sampleGroundY(cruiserX, cruiserZ, 0.05, ctx);
        roadblockCar = ctx.vehicles.spawnVehicle('police', cruiserX, cruiserY, cruiserZ, deployYaw + 0.55, {
          isParked: true,
          sirenActive: true
        });
      }
    }

    const distP = p ? dist2D(deployX, deployZ, p.x, p.z) : 30;
    if (distP < 95) {
      synthAudio.playSpikeDeploy(1.0 - distP / 100);
    }

    const stripObj = {
      id: `spike_${spikeStripIdCounter++}`,
      x: deployX,
      y: groundY,
      z: deployZ,
      yaw: deployYaw,
      halfWidth: stripWidth * 0.5,
      halfLength: 0.52,
      unfoldProgress: 0.15,
      age: 0,
      maxLife: opts.duration || 65.0,
      mesh,
      officerRig,
      officerMesh,
      roadblockCar
    };

    activeSpikeStrips.push(stripObj);
    if (!opts.silent) {
      ctx.ui?.showNotification?.('⚠️ Cảnh sát Thiên Đình Chấp Pháp vừa rải Bẫy Đinh Nổ Lốp chặn đầu trên đại lộ!', 3.2);
    }
    return stripObj;
  }

  function destroySpikeStripObj(strip) {
    if (!strip) return;
    if (strip.mesh?.parent) strip.mesh.parent.remove(strip.mesh);
    if (strip.officerMesh?.parent) strip.officerMesh.parent.remove(strip.officerMesh);
    if (strip.roadblockCar && strip.roadblockCar !== getPlayerVehicle(ctx)) {
      ctx.vehicles?.removeVehicle?.(strip.roadblockCar);
    }
  }

  function ensureVehiclePunctureState(car) {
    if (!car) return null;
    if (!Array.isArray(car.puncturedTires)) {
      const wheelCount = Array.isArray(car.wheels) && car.wheels.length > 0 ? car.wheels.length : 4;
      car.puncturedTires = new Array(wheelCount).fill(false);
      car._prevWheelWorld = new Array(wheelCount).fill(null);
      car.tiresPoppedCount = 0;
    }
    if (!car._hasOwnDef && car.def) {
      car._baseGrip = car.def.grip || 1.0;
      car._baseMaxSpeed = car.maxSpeed || car.def.maxSpeed || 35;
      car._baseAccel = car.accel || car.def.accel || 25;
      car.def = { ...car.def };
      car._hasOwnDef = true;
    }
    if (!Number.isFinite(car._punctureGripMult)) {
      car._punctureGripMult = 1.0;
    }
    return car.puncturedTires;
  }

  function applyVehicleTirePuncture(car, wheelIndex, activeCtx = ctx) {
    if (!car || car.destroyed || car.isHeli) return false;
    const pArr = ensureVehiclePunctureState(car);
    if (!pArr || wheelIndex < 0 || wheelIndex >= pArr.length) return false;

    // Check Luyện Khí Các Bulletproof Tires upgrade!
    if (car.bulletproofTires || car.mods?.bulletproofTires || car.hasBulletproofTires) {
      if (!car._bpSparkCooldown || car._bpSparkCooldown <= 0) {
        car._bpSparkCooldown = 0.45;
        synthAudio.playMetallicRicochet(0.9);
        if (car === getPlayerVehicle(activeCtx)) {
          activeCtx.ui?.showNotification?.('🛡️ Lốp Chống Đạn LSC đã kháng thành công Bẫy Đinh Thiên Đình Chấp Pháp!', 2.6);
        }
      }
      return false;
    }

    if (pArr[wheelIndex]) return false;
    pArr[wheelIndex] = true;

    let poppedCount = 0;
    for (let i = 0; i < pArr.length; i++) {
      if (pArr[i]) poppedCount++;
    }
    car.tiresPoppedCount = poppedCount;
    car.hasPuncturedTire = poppedCount > 0;

    // Exact Requirement: Punctured tires drop `latGrip` by 55% (`grip * 0.45`)!
    const gripFactor = 0.45; // 55% lateral grip reduction!
    car._punctureGripMult = gripFactor;
    if (car.def) {
      const baseG = car._baseGrip || 1.0;
      car.def.grip = baseG * gripFactor;
      car.latGrip = car.def.grip;
    }
    car.maxSpeed = (car._baseMaxSpeed || 34) * lerp(0.84, 0.72, poppedCount / Math.max(1, pArr.length));

    // Visually deflate punctured wheel tire so steel alloy rim scrapes directly on asphalt!
    const wheelObj = car.wheels?.[wheelIndex];
    if (wheelObj) {
      if (wheelObj.spinGroup) {
        wheelObj.spinGroup.scale.set(1.0, 0.77, 0.77);
      }
      if (Number.isFinite(wheelObj.baseY) && !wheelObj._origBaseY) {
        wheelObj._origBaseY = wheelObj.baseY;
        wheelObj.baseY -= 0.065;
      }
    }

    // Loud Blowout Hiss + Camera Jolt + Lateral Skid Kick!
    const p = activeCtx?.player || ctx?.player;
    const distP = p ? dist2D(car.x, car.z, p.x, p.z) : 20;
    if (distP < 80) {
      synthAudio.playTireBlowout(1.0 - distP / 85);
    }

    const yaw = car.yaw || 0;
    const rightX = -Math.cos(yaw);
    const rightZ = Math.sin(yaw);
    const kickSign = wheelIndex % 2 === 0 ? 1 : -1;
    car.vx = (car.vx || 0) + rightX * kickSign * 3.4;
    car.vz = (car.vz || 0) + rightZ * kickSign * 3.4;

    if (car === getPlayerVehicle(activeCtx)) {
      activeCtx.engine?.addShake?.(0.42);
      if (poppedCount === 1) {
        activeCtx.ui?.showNotification?.(
          '💥 NỔ LỐP XE! Độ bám đường giảm 55% & vành xe tóe lửa — hãy tới Luyện Khí Các sửa lốp!',
          4.2
        );
      }
    }
    return true;
  }

  function restoreVehiclePuncturedTires(car) {
    if (!car || !Array.isArray(car.puncturedTires)) return false;
    let hadAny = false;
    for (let i = 0; i < car.puncturedTires.length; i++) {
      if (car.puncturedTires[i]) hadAny = true;
      car.puncturedTires[i] = false;
    }
    car.tiresPoppedCount = 0;
    car.hasPuncturedTire = false;
    car._punctureGripMult = 1.0;

    if (car.def && Number.isFinite(car._baseGrip)) {
      car.def.grip = car._baseGrip;
      car.latGrip = car._baseGrip;
    }
    if (Number.isFinite(car._baseMaxSpeed)) {
      car.maxSpeed = car._baseMaxSpeed;
    }

    if (Array.isArray(car.wheels)) {
      for (let i = 0; i < car.wheels.length; i++) {
        const w = car.wheels[i];
        if (w?.spinGroup) w.spinGroup.scale.set(1, 1, 1);
        if (w && Number.isFinite(w._origBaseY)) {
          w.baseY = w._origBaseY;
          w._origBaseY = undefined;
        }
      }
    }
    return hadAny;
  }

  function updateSpikeStripsAndPuncturedTires(dt, activeCtx = ctx) {
    const p = activeCtx?.player || ctx?.player;
    const playerCar = getPlayerVehicle(activeCtx);
    const wantedStars = activeCtx.gameplay?.wanted?.stars || 0;
    const clock = activeCtx.elapsed || 0;

    // 1. Auto-deploy Thiên Đình Chấp Pháp Roadblock Bàn Chông Thiên Đình Chấp Pháp at >= 3★ Wanted ahead of speeding player!
    if (wantedStars <= 0 && activeSpikeStrips.length > 0) {
      for (let i = activeSpikeStrips.length - 1; i >= 0; i--) {
        destroySpikeStripObj(activeSpikeStrips[i]);
        activeSpikeStrips.splice(i, 1);
      }
    } else if (wantedStars >= 3 && playerCar && !playerCar.isHeli) {
      autoSpikeDeployCooldown -= dt;
      const spd = Math.hypot(playerCar.vx || 0, playerCar.vz || 0);
      if (autoSpikeDeployCooldown <= 0 && spd > 9.5) {
        autoSpikeDeployCooldown = wantedStars >= 4 ? 15.0 : 21.0;
        deploySpikeStrip(null, null, null, { spawnCruiser: true });
      }
    }

    // 2. Animate Active Bàn Chông Thiên Đình Chấp Pháp, Flickering Flares & Deploying Officers
    for (let i = activeSpikeStrips.length - 1; i >= 0; i--) {
      const strip = activeSpikeStrips[i];
      strip.age += dt;
      const distP = p ? dist2D(strip.x, strip.z, p.x, p.z) : 50;

      if (strip.age > strip.maxLife || distP > 195) {
        destroySpikeStripObj(strip);
        activeSpikeStrips.splice(i, 1);
        continue;
      }

      if (strip.unfoldProgress < 1.0) {
        strip.unfoldProgress = Math.min(1.0, strip.unfoldProgress + dt * 4.5);
        strip.mesh.scale.set(strip.unfoldProgress, 1.0, 1.0);
      }

      const flares = strip.mesh.userData?.flareDiscs;
      if (Array.isArray(flares)) {
        const pulse = 0.85 + Math.sin(clock * 24.0 + i * 2.0) * 0.25;
        for (let f = 0; f < flares.length; f++) {
          flares[f].scale.setScalar(pulse);
        }
      }

      if (strip.officerRig && strip.officerMesh?.visible) {
        if (p) {
          strip.officerMesh.rotation.y = Math.atan2(p.x - strip.officerMesh.position.x, p.z - strip.officerMesh.position.z);
        }
        activeCtx.characters?.animateHumanoid?.(strip.officerRig, 'aim_1h', dt);
      }
    }

    // 3. Per-Wheel Swept Spike Collision & Continuous Orange Rim-Grinding Sparks!
    const vList = activeCtx.vehicles?.list || [];
    let playerRimGrindIntensity = 0;
    let playerRimSpeedNorm = 0;

    for (let vIdx = 0; vIdx < vList.length; vIdx++) {
      const car = vList[vIdx];
      if (!car || car.destroyed || car.isHeli) continue;
      if (car._bpSparkCooldown > 0) car._bpSparkCooldown -= dt;

      // Skip police units puncturing their own spike strips unless hijacked by player!
      const isPoliceAI = (car.isPolice || car.isPoliceUnit) && car !== playerCar;
      const hasAnyStrips = activeSpikeStrips.length > 0 && !isPoliceAI;
      const hasPunctures = Boolean(car.hasPuncturedTire && car.tiresPoppedCount > 0);

      if (!hasAnyStrips && !hasPunctures) continue;

      const pArr = ensureVehiclePunctureState(car);
      const cosY = Math.cos(car.yaw || 0);
      const sinY = Math.sin(car.yaw || 0);
      const absSpd = Math.hypot(car.vx || 0, car.vz || 0);
      const onSand = car.x < -128 && car.x >= -212 && !(car.z >= -32 && car.z <= 22 && car.y > 2.0);

      const wheelCount = Array.isArray(car.wheels) && car.wheels.length > 0 ? car.wheels.length : 4;
      for (let wIdx = 0; wIdx < wheelCount; wIdx++) {
        const w = car.wheels?.[wIdx];
        const bx = w?.baseX ?? (wIdx % 2 === 0 ? 0.9 : -0.9);
        const bz = w?.baseZ ?? (wIdx < 2 ? 1.38 : -1.35);
        const wx = car.x + bx * cosY + bz * sinY;
        const wz = car.z - bx * sinY + bz * cosY;
        const prevW = car._prevWheelWorld?.[wIdx];

        // Check swept wheel path against every active Thiên Đình Chấp Pháp spike strip
        if (hasAnyStrips && !pArr[wIdx]) {
          for (let sIdx = 0; sIdx < activeSpikeStrips.length; sIdx++) {
            const st = activeSpikeStrips[sIdx];
            if (Math.abs((car.y || 0) - st.y) > 1.6) continue;
            const curHalfW = st.halfWidth * st.unfoldProgress;
            const hit = prevW
              ? segmentIntersectsOBB2D(prevW.x, prevW.z, wx, wz, st.x, st.z, st.yaw, curHalfW, st.halfLength)
              : pointInOBB2D(wx, wz, st.x, st.z, st.yaw, curHalfW, st.halfLength);
            if (hit) {
              applyVehicleTirePuncture(car, wIdx, activeCtx);
              break;
            }
          }
        }

        if (car._prevWheelWorld) {
          car._prevWheelWorld[wIdx] = { x: wx, z: wz };
        }

        // Continuous Orange Rim-Grinding Sparks on Asphalt when tire is popped!
        if (pArr[wIdx] && absSpd > 2.2 && !onSand) {
          car._rimSparkAccum = (car._rimSparkAccum || 0) + dt * clamp(absSpd * 1.4, 8, 45);
          if (car._rimSparkAccum >= 1.0) {
            const burst = Math.min(3, Math.floor(car._rimSparkAccum));
            car._rimSparkAccum -= burst;
            const wy = sampleGroundY(wx, wz, car.y || 0.02, activeCtx);
            spawnRimGrindingSparks(wx, wy, wz, car.vx || 0, car.vz || 0, burst);
          }

          // Subtle lateral rim wobble & pull toward blown tire side at high speed
          if (absSpd > 6.5) {
            const sidePull = (wIdx % 2 === 0 ? 1 : -1) * 0.24 * dt;
            car.yaw = wrapAngle((car.yaw || 0) + sidePull);
          }
        }
      }

      // Enforce 55% lateral grip drop continuously (compatible with Franklin's Slow-Mo Focus!)
      if (car.hasPuncturedTire && car.def) {
        const franklinBoost =
          car === playerCar && activeProtagonistKey === 'franklin' && p?.specialActive ? 1.85 : 1.0;
        car.def.grip = (car._baseGrip || 1.0) * 0.45 * franklinBoost;
        car.latGrip = car.def.grip;

        if (car === playerCar && absSpd > 2.2 && !onSand) {
          playerRimGrindIntensity = clamp((absSpd - 2.0) / 18.0, 0.15, 1.0);
          playerRimSpeedNorm = clamp(absSpd / 35.0, 0, 1.4);
        }
      }
    }

    return { playerRimGrindIntensity, playerRimSpeedNorm };
  }

  // ---------------------------------------------------------------------------
  // 7B. Thiên Binh Cấm Vệ HELICOPTER DUAL FAST-ROPE INSERTION (>= 3★ WANTED)
  // ---------------------------------------------------------------------------
  function spawnSwatFastRopeInsertion(activeCtx = ctx) {
    if (activeFastRopeInsertions.length >= MAX_ACTIVE_FAST_ROPES) return null;
    const p = activeCtx?.player || ctx?.player;
    if (!p || isPlayerInsideInterior(p)) return null;
    ensureSceneRootAttached(activeCtx);

    // Choose open street/plaza drop zone 24–34m from player
    const angle = randRange(0, Math.PI * 2);
    const rawX = clamp(p.x + Math.cos(angle) * 28, -125, 205);
    const rawZ = clamp(p.z + Math.sin(angle) * 28, -195, 195);
    const dropSnap = snapPointToNearestRoadCorridor(rawX, rawZ);
    const dropX = dropSnap.x;
    const dropZ = dropSnap.z;
    const groundY = sampleGroundY(dropX, dropZ, 0.05, activeCtx);
    const hoverY = groundY + 26.5;

    // Dedicated NOOSE Tactical Insertion Maverick Chopper
    let chopperCar = null;
    if (activeCtx.vehicles?.spawnVehicle) {
      chopperCar = activeCtx.vehicles.spawnVehicle('heli', dropX - 38, hoverY + 12, dropZ - 38, 0, {
        color: 0x0f172a,
        isPoliceHeli: true,
        aiControlled: true,
        rotorRunning: true
      });
    }

    // 2 Taut Black Braided Fast-Ropes (Left & Right Skid Anchors) + Rotor Downwash Ring
    const ropeLeft = new THREE.Mesh(sharedGeometries.ropeUnitCyl, sharedMaterials.braidedRope);
    const ropeRight = new THREE.Mesh(sharedGeometries.ropeUnitCyl, sharedMaterials.braidedRope);
    ropeLeft.visible = false;
    ropeRight.visible = false;
    npcLifeRoot.add(ropeLeft, ropeRight);

    const washRing = new THREE.Mesh(
      sharedGeometries.eventBeaconRing,
      new THREE.MeshBasicMaterial({
        color: 0xcbd5e1,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    washRing.visible = false;
    npcLifeRoot.add(washRing);

    // 2 Armored NOOSE Thiên Binh Cấm Vệ Officers sliding down the ropes!
    const charSys = activeCtx?.characters || ctx?.characters;
    const troopers = [];
    for (let t = 0; t < 2; t++) {
      const rig = charSys?.createHumanoid ? charSys.createHumanoid('swat') : null;
      if (rig) {
        charSys.equipWeapon?.(rig, 'carbine');
        const mesh = rig.root || rig;
        mesh.visible = false;
        npcLifeRoot.add(mesh);
        troopers.push({
          side: t === 0 ? -1 : 1,
          rig,
          mesh,
          y: hoverY - 1.2,
          slideSpeed: randRange(8.2, 9.4),
          landed: false
        });
      }
    }

    const op = {
      state: 'SWOOP_IN', // SWOOP_IN -> DROP_ROPES -> SLIDING_TROOPERS -> RETRACT_AND_PEEL
      timer: 0,
      x: dropX - 38,
      y: hoverY + 12,
      z: dropZ - 38,
      yaw: Math.atan2(dropX - (dropX - 38), dropZ - (dropZ - 38)),
      dropX,
      dropZ,
      groundY,
      hoverY,
      ropeUnroll: 0,
      chopperCar,
      ropeLeft,
      ropeRight,
      washRing,
      troopers
    };

    activeFastRopeInsertions.push(op);
    activeCtx.ui?.showNotification?.('🚁 Trực thăng Đặc nhiệm NOOSE đang thả dây đổ bộ lính bắn tỉa xuống phố!', 3.6);
    return op;
  }

  function cleanupFastRopeInsertion(op, activeCtx = ctx) {
    if (!op) return;
    if (op.ropeLeft?.parent) op.ropeLeft.parent.remove(op.ropeLeft);
    if (op.ropeRight?.parent) op.ropeRight.parent.remove(op.ropeRight);
    if (op.washRing?.parent) op.washRing.parent.remove(op.washRing);
    if (op.chopperCar && op.chopperCar !== getPlayerVehicle(activeCtx)) {
      activeCtx.vehicles?.removeVehicle?.(op.chopperCar);
    }
    for (const tr of op.troopers) {
      if (!tr.handedToCops && tr.mesh?.parent) {
        tr.mesh.parent.remove(tr.mesh);
      }
    }
  }

  function updateSwatFastRopeInsertions(dt, activeCtx = ctx) {
    const p = activeCtx?.player || ctx?.player;
    const wantedStars = activeCtx.gameplay?.wanted?.stars || 0;
    const clock = activeCtx.elapsed || 0;

    if (wantedStars >= 3 && p && !isPlayerInsideInterior(p)) {
      autoFastRopeCooldown -= dt;
      const liveCopsCount = (activeCtx.gameplay?.cops || []).filter((c) => c && !c.dead).length;
      if (autoFastRopeCooldown <= 0 && liveCopsCount < 8 && activeFastRopeInsertions.length < MAX_ACTIVE_FAST_ROPES) {
        autoFastRopeCooldown = wantedStars >= 4 ? 18.0 : 25.0;
        spawnSwatFastRopeInsertion(activeCtx);
      }
    } else if (wantedStars === 0 && activeFastRopeInsertions.length > 0) {
      for (let i = activeFastRopeInsertions.length - 1; i >= 0; i--) {
        cleanupFastRopeInsertion(activeFastRopeInsertions[i], activeCtx);
        activeFastRopeInsertions.splice(i, 1);
      }
      return;
    }

    for (let i = activeFastRopeInsertions.length - 1; i >= 0; i--) {
      const op = activeFastRopeInsertions[i];
      op.timer += dt;

      if (op.chopperCar && (op.chopperCar.destroyed || op.chopperCar.hp <= 0)) {
        cleanupFastRopeInsertion(op, activeCtx);
        activeFastRopeInsertions.splice(i, 1);
        continue;
      }

      if (op.state === 'SWOOP_IN') {
        op.x = damp(op.x, op.dropX, 2.6, dt);
        op.z = damp(op.z, op.dropZ, 2.6, dt);
        op.y = damp(op.y, op.hoverY, 2.6, dt);
        if (p) op.yaw = dampAngle(op.yaw, Math.atan2(p.x - op.x, p.z - op.z), 3.5, dt);

        if (dist2D(op.x, op.z, op.dropX, op.dropZ) < 2.2 || op.timer > 4.2) {
          op.state = 'DROP_ROPES';
          op.timer = 0;
          op.ropeLeft.visible = true;
          op.ropeRight.visible = true;
          op.washRing.visible = true;
        }
      } else if (op.state === 'DROP_ROPES') {
        op.x = damp(op.x, op.dropX, 5.0, dt);
        op.z = damp(op.z, op.dropZ, 5.0, dt);
        op.y = op.hoverY + Math.sin(clock * 2.6) * 0.25;
        op.ropeUnroll = Math.min(1.0, op.ropeUnroll + dt * 2.8);

        if (op.ropeUnroll >= 1.0) {
          op.state = 'SLIDING_TROOPERS';
          op.timer = 0;
          const distP = p ? dist2D(op.x, op.z, p.x, p.z) : 35;
          if (distP < 75) synthAudio.playFastRopeSlide(1.0 - distP / 80);

          for (let t = 0; t < op.troopers.length; t++) {
            const tr = op.troopers[t];
            tr.y = op.y - 1.3 - t * 2.2;
            tr.mesh.visible = true;
          }
        }
      } else if (op.state === 'SLIDING_TROOPERS') {
        op.y = op.hoverY + Math.sin(clock * 2.6) * 0.22;
        const cosY = Math.cos(op.yaw);
        const sinY = Math.sin(op.yaw);
        let allLanded = true;

        for (let t = 0; t < op.troopers.length; t++) {
          const tr = op.troopers[t];
          if (tr.landed) continue;
          allLanded = false;

          tr.y -= tr.slideSpeed * dt;
          const ropeX = op.x + cosY * (tr.side * 1.25);
          const ropeZ = op.z - sinY * (tr.side * 1.25);

          if (tr.y <= op.groundY + 0.05) {
            tr.y = op.groundY;
            tr.landed = true;
            tr.handedToCops = true;

            // Register landed Armored NOOSE Trooper directly into ctx.gameplay.cops!
            const scene = getScene(activeCtx);
            if (scene && tr.mesh.parent !== scene) {
              scene.add(tr.mesh);
            }
            const copEntity = {
              preset: 'swat',
              x: ropeX,
              y: op.groundY,
              z: ropeZ,
              yaw: p ? Math.atan2(p.x - ropeX, p.z - ropeZ) : op.yaw,
              hp: 135,
              maxHp: 135,
              _prevHp: 135,
              armor: 75,
              dead: false,
              _deathHandled: false,
              corpseTimer: 0,
              isHostile: true,
              weapon: 'carbine',
              shootCooldown: 0.45,
              rig: tr.rig,
              mesh: tr.mesh
            };
            tr.mesh.position.set(ropeX, op.groundY, ropeZ);
            activeCtx.characters?.animateHumanoid?.(tr.rig, 'aim_2h', 0.016);
            activeCtx.gameplay?.cops?.push?.(copEntity);

            spawnFloatingSpeechBubble(
              `noose_drop_${i}_${t}`,
              ropeX,
              op.groundY + 2.15,
              ropeZ,
              '"Đội Đặc Nhiệm NOOSE đã tiếp đất! Khóa chặt mục tiêu!"',
              '#f87171',
              2.8
            );
          } else {
            tr.mesh.position.set(ropeX, tr.y, ropeZ);
            tr.mesh.rotation.y = p ? Math.atan2(p.x - ropeX, p.z - ropeZ) : op.yaw;
            activeCtx.characters?.animateHumanoid?.(tr.rig, 'idle', dt);
            applyContextualHumanoidPose(tr.rig, 'fast_rope_slide', clock);
          }
        }

        if (allLanded || op.timer > 6.5) {
          op.state = 'RETRACT_AND_PEEL';
          op.timer = 0;
        }
      } else if (op.state === 'RETRACT_AND_PEEL') {
        op.ropeUnroll = Math.max(0, op.ropeUnroll - dt * 2.6);
        op.y += 9.5 * dt;
        op.x += Math.sin(op.yaw) * 16.0 * dt;
        op.z += Math.cos(op.yaw) * 16.0 * dt;
        op.washRing.visible = false;

        if (op.ropeUnroll <= 0.02) {
          op.ropeLeft.visible = false;
          op.ropeRight.visible = false;
        }
        if (op.timer > 3.2) {
          cleanupFastRopeInsertion(op, activeCtx);
          activeFastRopeInsertions.splice(i, 1);
          continue;
        }
      }

      // Sync Chopper Transform & Dual Braided Fast-Rope Geometry
      if (op.chopperCar) {
        op.chopperCar.x = op.x;
        op.chopperCar.y = op.y;
        op.chopperCar.z = op.z;
        op.chopperCar.yaw = op.yaw;
        op.chopperCar.vx = 0;
        op.chopperCar.vy = 0;
        op.chopperCar.vz = 0;
        op.chopperCar.mesh?.position.set(op.x, op.y, op.z);
        if (op.chopperCar.mesh) op.chopperCar.mesh.rotation.y = op.yaw;
      }

      const cosY = Math.cos(op.yaw);
      const sinY = Math.sin(op.yaw);
      const fullRopeLen = Math.max(1.0, (op.y - 0.85) - op.groundY);
      const curRopeLen = fullRopeLen * op.ropeUnroll;

      if (op.ropeLeft.visible) {
        op.ropeLeft.position.set(op.x - cosY * 1.25, op.y - 0.85, op.z + sinY * 1.25);
        op.ropeLeft.scale.set(1, curRopeLen, 1);
        op.ropeLeft.rotation.z = Math.sin(clock * 5.0) * 0.025;
      }
      if (op.ropeRight.visible) {
        op.ropeRight.position.set(op.x + cosY * 1.25, op.y - 0.85, op.z - sinY * 1.25);
        op.ropeRight.scale.set(1, curRopeLen, 1);
        op.ropeRight.rotation.z = -Math.sin(clock * 5.0) * 0.025;
      }
      if (op.washRing.visible) {
        op.washRing.position.set(op.dropX, op.groundY + 0.06, op.dropZ);
        op.washRing.scale.setScalar(2.2 + Math.sin(clock * 9.0) * 0.45);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 7C. TACTICAL POLICE COVER BEHIND OPEN CRUISER DOORS
  // ---------------------------------------------------------------------------
  function updateTacticalPoliceCruiserCover(dt, activeCtx = ctx) {
    const p = activeCtx?.player || ctx?.player;
    const wantedStars = activeCtx.gameplay?.wanted?.stars || 0;
    const cops = activeCtx.gameplay?.cops || [];
    const vList = activeCtx.vehicles?.list || [];
    const playerCar = getPlayerVehicle(activeCtx);
    const clock = activeCtx.elapsed || 0;

    if (!p || wantedStars < 2 || cops.length === 0) return;

    // 1. Identify stopped Thiên Đình Chấp Pháp Cruisers within tactical firefight range (10m..38m) & open their ballistic doors!
    const coverCruisers = [];
    for (let i = 0; i < vList.length; i++) {
      const v = vList[i];
      if (!v || v.destroyed || v === playerCar || v.isHeli) continue;
      if (v.type !== 'police' && !v.isPolice) continue;

      const spd = Math.hypot(v.vx || 0, v.vz || 0);
      const dPlayer = dist2D(v.x, v.z, p.x, p.z);
      const inCoverZone = spd < 2.2 && dPlayer >= 9.5 && dPlayer <= 38.0;

      let doorRig = cruiserDoorShieldMap.get(v);
      if (inCoverZone && !doorRig && v.chassis) {
        doorRig = buildCruiserOpenDoorRig();
        v.chassis.add(doorRig);
        doorRig.userData.openAmt = 0;
        cruiserDoorShieldMap.set(v, doorRig);
      }

      if (doorRig) {
        const targetOpen = inCoverZone ? 1.0 : 0.0;
        doorRig.userData.openAmt = damp(doorRig.userData.openAmt || 0, targetOpen, 7.0, dt);
        const amt = doorRig.userData.openAmt;
        doorRig.visible = amt > 0.03;
        doorRig.userData.leftDoor.rotation.y = amt * 0.92;  // Swing Left Door open 53°
        doorRig.userData.rightDoor.rotation.y = -amt * 0.92; // Swing Right Door open 53°

        if (inCoverZone) {
          coverCruisers.push(v);
        }
      }
    }

    if (coverCruisers.length === 0) return;

    // 2. Assign foot officers near stopped cruisers into Left/Right Door Cover Slots!
    for (let cIdx = 0; cIdx < cops.length; cIdx++) {
      const cop = cops[cIdx];
      if (!cop || cop.dead || !cop.rig) continue;

      // Find closest stopped cover cruiser within 9.5m
      let bestCruiser = null;
      let bestD = 9.5;
      for (let k = 0; k < coverCruisers.length; k++) {
        const cr = coverCruisers[k];
        const d = dist2D(cop.x, cop.z, cr.x, cr.z);
        if (d < bestD) {
          bestD = d;
          bestCruiser = cr;
        }
      }

      if (!bestCruiser) continue;

      const sideSign = cIdx % 2 === 0 ? 1 : -1;
      const cosY = Math.cos(bestCruiser.yaw);
      const sinY = Math.sin(bestCruiser.yaw);
      // Cover slot tucked right behind the open front cruiser door!
      const slotX = bestCruiser.x + cosY * (sideSign * 1.48) - sinY * 0.15;
      const slotZ = bestCruiser.z - sinY * (sideSign * 1.48) - cosY * 0.15;

      const dSlot = dist2D(cop.x, cop.z, slotX, slotZ);
      if (dSlot > 0.55) {
        cop.x = lerp(cop.x, slotX, clamp(dt * 4.5, 0, 1));
        cop.z = lerp(cop.z, slotZ, clamp(dt * 4.5, 0, 1));
        cop.y = sampleGroundY(cop.x, cop.z, 0.22, activeCtx);
        cop.mesh?.position.set(cop.x, cop.y, cop.z);
      } else {
        // Alternate rhythmically: 1.8s crouched behind ballistic door -> 1.4s peeking over window frame firing!
        const cycle = (clock + cIdx * 1.35) % 3.2;
        const isPeeking = cycle >= 1.8;
        cop.yaw = Math.atan2(p.x - cop.x, p.z - cop.z);
        if (cop.mesh) {
          cop.mesh.position.set(cop.x, cop.y, cop.z);
          cop.mesh.rotation.y = cop.yaw;
        }

        if (!isPeeking) {
          applyContextualHumanoidPose(cop.rig, 'cruiser_door_crouch', clock);
          // Frontal ballistic door shield absorbs 70% of incoming shots while crouched!
          if (cop.hp < (cop._doorCoverSnapHp ?? cop.hp)) {
            const lost = (cop._doorCoverSnapHp ?? cop.hp) - cop.hp;
            cop.hp = Math.min(cop.maxHp || 100, cop.hp + lost * 0.70);
            cop._prevHp = cop.hp;
            synthAudio.playMetallicRicochet(0.65);
          }
          // Hold fire while ducked low behind door
          cop.shootCooldown = Math.max(cop.shootCooldown || 0, 0.22);
        } else {
          applyContextualHumanoidPose(cop.rig, 'cruiser_door_peek_fire', clock);
          if (!cop._coverCalloutTimer || cop._coverCalloutTimer <= 0) {
            cop._coverCalloutTimer = 14.0;
            spawnFloatingSpeechBubble(
              `cop_cover_${cIdx}`,
              cop.x,
              cop.y + 2.05,
              cop.z,
              '"Nấp sau cửa xe! Yểm trợ bắn trả mục tiêu!"',
              '#60a5fa',
              2.6
            );
          }
        }
        if (cop._coverCalloutTimer > 0) cop._coverCalloutTimer -= dt;
        cop._doorCoverSnapHp = cop.hp;
      }
    }
  }

  // ============================================================================
  // 8. PILLAR 4: LIVING CITIZEN MICRO-EVENTS, 911 WITNESSES, BUSKERS & BLUE-DOTS
  // ============================================================================
  const HYPERCAR_ADMIRE_QUOTES = [
    '"Ê siêu xe đẹp quá kìa!"',
    '"Trời đất ơi con xe độ chất lừ, chụp đăng Lifeinvader lẹ!"',
    '"Xe Podium Sòng Bạc Diamond ngoài đời thật kìa anh em!"',
    '"Nghe tiếng pô V10 gầm tê tái thiệt sự!"',
    '"Màu sơn với dáng xe nhìn sang chảnh hết nước chấm!"',
    '"Đứng xích ra cho tao chụp tấm siêu xe này coi!"'
  ];

  const WITNESS_CALLING_QUOTES = [
    '"Alo Cảnh sát Thiên Đình Chấp Pháp 911 hả?! Có kẻ đang gây án ngay trên phố nè!"',
    '"Tổng đài 911 ơi cử xe tuần tra tới đại lộ gấp, nguy hiểm quá!"',
    '"Alo 911! Tôi đang nhìn thấy nghi phạm ngay trước mặt đây!"'
  ];

  const WITNESS_INTIMIDATED_QUOTES = [
    '"Á đừng bắn!! Tôi cúp máy ngay đây, không báo cảnh sát nữa đâu!!"',
    '"Tha mạng đại ca ơi! Tôi rớt điện thoại rồi, không dám gọi 911 nữa!"',
    '"Đừng làm hại tôi! Tôi hủy cuộc gọi cảnh sát liền đây!!"'
  ];

  const BUSKER_BLESSING_QUOTES = [
    '"Cảm ơn đại ca hào phóng! Chúc đại ca vào Sòng Bạc Diamond nổ hũ lớn!"',
    '"Quá tuyệt vời! Tặng anh bạn giai điệu cực cháy bên bờ biển Thái Bình Dương!"',
    '"Đa tạ tấm lòng vàng! Chúc tay lái lụa thượng lộ bình an nhé!"'
  ];

  const paparazziPropMap = new WeakMap();
  const activeWitnessCallers = [];
  const streetBuskers = [];
  const droppedCashLoot = [];

  let paparazziScanTimer = 0.4;
  let prevPlayerWantedStars = 0;
  let prevPlayerHeat = 0;
  let prevPlayerWeaponFiredAt = 0;
  let buskersSpawned = false;
  let buskerTipCooldown = 0;

  // Dynamic Blue-Dot Street Event State
  const blueDotEvent = {
    active: false,
    type: '', // 'armored_van' | 'purse_snatcher' | 'vip_hitchhiker' | 'alley_ambush'
    title: '',
    stage: 0,
    x: 0,
    y: 0.22,
    z: 0,
    destX: 0,
    destZ: 0,
    timer: 0,
    cooldown: 14.0,
    cycleIdx: 0,
    beaconMesh: null,
    vanUnit: null,
    brokenCar: null,
    actors: [],
    purseMesh: null,
    purseDropped: false,
    purseCollected: false
  };

  // ---------------------------------------------------------------------------
  // 8A. HYPERCAR / TUNED CAR SMARTPHONE PHOTOGRAPHERS & FLOATING SPEECH BUBBLES
  // ---------------------------------------------------------------------------
  function isExoticOrTunedVehicle(car) {
    if (!car || car.destroyed || car.isHeli) return false;
    const exoticTypes = new Set(['obey9f', 'banshee', 'zentorno', 'superbike', 'chopper']);
    if (exoticTypes.has(car.type)) return true;
    if (
      car.isPodium ||
      car.podiumCar ||
      car.underglow ||
      car.hasUnderglow ||
      car.hasTurbo ||
      car.twinTurbo ||
      (car.mods && Object.keys(car.mods).length > 0)
    ) {
      return true;
    }
    return false;
  }

  function updateHypercarPaparazziCitizens(dt, activeCtx = ctx) {
    const p = activeCtx?.player || ctx?.player;
    const playerCar = getPlayerVehicle(activeCtx);
    const peds = activeCtx.gameplay?.peds || [];
    const wantedStars = activeCtx.gameplay?.wanted?.stars || 0;
    const clock = activeCtx.elapsed || 0;

    const drivingExotic =
      Boolean(playerCar && isExoticOrTunedVehicle(playerCar)) &&
      wantedStars === 0 &&
      Math.hypot(playerCar.vx || 0, playerCar.vz || 0) < 18.5;

    paparazziScanTimer -= dt;
    if (paparazziScanTimer <= 0 && drivingExotic && p) {
      paparazziScanTimer = 0.75;
      let activePhotographers = 0;
      for (let i = 0; i < peds.length; i++) {
        const ped = peds[i];
        if (!ped || ped.dead || ped.isEnemy || ped.isHostile || ped._is911Caller) continue;
        if (ped._paparazziTimer > 0) {
          activePhotographers++;
          continue;
        }
        if (activePhotographers >= 3) break;

        const d = dist2D(ped.x, ped.z, playerCar.x, playerCar.z);
        if (d > 3.6 && d < 16.5 && Math.abs((ped.y || 0) - (playerCar.y || 0)) < 2.8) {
          ped._paparazziTimer = randRange(4.8, 7.6);
          ped._flashCooldown = randRange(0.7, 1.6);
          ped.state = 'idle';
          ped.idleTimer = ped._paparazziTimer + 0.5;

          let phoneProp = paparazziPropMap.get(ped);
          if (!phoneProp && ped.rig?.joints?.handR) {
            phoneProp = buildSmartphoneProp(false);
            phoneProp.position.set(0.02, -0.09, 0.06);
            phoneProp.rotation.set(-0.2, 0.1, 1.57); // Landscape photo orientation!
            ped.rig.joints.handR.add(phoneProp);
            paparazziPropMap.set(ped, phoneProp);
          }
          if (phoneProp) phoneProp.visible = true;

          const quote = pickRandom(HYPERCAR_ADMIRE_QUOTES);
          spawnFloatingSpeechBubble(
            `paparazzi_${i}`,
            ped.x,
            (ped.y || 0.22) + 2.12,
            ped.z,
            quote,
            '#fde047',
            3.8
          );
          activePhotographers++;
        }
      }
    }

    // Animate active smartphone photographers & camera flashes
    for (let i = 0; i < peds.length; i++) {
      const ped = peds[i];
      if (!ped || !ped._paparazziTimer || ped._paparazziTimer <= 0) continue;

      if (ped.dead || ped.state === 'flee' || wantedStars > 0 || !playerCar) {
        ped._paparazziTimer = 0;
        const prop = paparazziPropMap.get(ped);
        if (prop) {
          prop.visible = false;
          if (prop.userData?.flashQuad) prop.userData.flashQuad.visible = false;
        }
        continue;
      }

      ped._paparazziTimer -= dt;
      const dCar = dist2D(ped.x, ped.z, playerCar.x, playerCar.z);
      if (ped._paparazziTimer <= 0 || dCar > 24) {
        ped._paparazziTimer = 0;
        const prop = paparazziPropMap.get(ped);
        if (prop) {
          prop.visible = false;
          if (prop.userData?.flashQuad) prop.userData.flashQuad.visible = false;
        }
        continue;
      }

      // Face player's exotic car & raise smartphone in landscape camera grip!
      ped.yaw = dampAngle(ped.yaw, Math.atan2(playerCar.x - ped.x, playerCar.z - ped.z), 8.0, dt);
      if (ped.mesh) ped.mesh.rotation.y = ped.yaw;
      if (ped.rig) applyContextualHumanoidPose(ped.rig, 'paparazzi_photo', clock);

      const prop = paparazziPropMap.get(ped);
      if (prop) {
        prop.visible = true;
        ped._flashCooldown -= dt;
        if (ped._flashCooldown <= 0) {
          ped._flashCooldown = randRange(1.6, 2.8);
          ped._flashOnTimer = 0.09;
          if (dCar < 18) synthAudio.playCameraShutter(1.0 - dCar / 22);
        }
        if (ped._flashOnTimer > 0) {
          ped._flashOnTimer -= dt;
          if (prop.userData?.flashQuad) {
            prop.userData.flashQuad.visible = ped._flashOnTimer > 0;
          }
        }

        // Bonus reaction if player honks horn for the fans!
        if (activeCtx.input?.hornJustPressed && dCar < 14 && !ped._cheeredHorn) {
          ped._cheeredHorn = true;
          if (p) p.special = Math.min(p.maxSpecial || 100, (p.special || 0) + 4);
          spawnFloatingSpeechBubble(
            `paparazzi_${i}`,
            ped.x,
            (ped.y || 0.22) + 2.14,
            ped.z,
            '"Úi giời ơi tiếng còi & pô siêu xe đỉnh thực sự!!"',
            '#4ade80',
            2.8
          );
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 8B. WITNESS 911 CALLERS & 4.0-SECOND INTIMIDATION COUNTERPLAY
  // ---------------------------------------------------------------------------
  function trySpawnWitness911Caller(crimeX, crimeZ, activeCtx = ctx) {
    if (activeWitnessCallers.length >= 2) return false;
    const peds = activeCtx.gameplay?.peds || [];
    let bestPed = null;
    let bestDist = 30.0;

    for (let i = 0; i < peds.length; i++) {
      const ped = peds[i];
      if (!ped || ped.dead || ped.isEnemy || ped.isHostile || ped._is911Caller || ped.isMissionEnemy) continue;
      const d = dist2D(ped.x, ped.z, crimeX, crimeZ);
      if (d > 4.5 && d < bestDist && Math.abs((ped.y || 0.22) - (activeCtx.player?.y || 0.22)) < 4.5) {
        bestDist = d;
        bestPed = ped;
      }
    }

    if (!bestPed) return false;

    bestPed._is911Caller = true;
    bestPed.state = 'idle';
    bestPed.idleTimer = 6.0;
    bestPed.panicTimer = 0;

    let phone911 = bestPed._phone911Prop;
    if (!phone911 && bestPed.rig?.joints?.handR) {
      phone911 = buildSmartphoneProp(true);
      phone911.position.set(0.02, -0.06, 0.04);
      bestPed.rig.joints.handR.add(phone911);
      bestPed._phone911Prop = phone911;
    }
    if (phone911) phone911.visible = true;

    synthAudio.play911DialBeep(0.85);
    const quote = pickRandom(WITNESS_CALLING_QUOTES);
    spawnFloatingSpeechBubble(
      `witness_${activeWitnessCallers.length}`,
      bestPed.x,
      (bestPed.y || 0.22) + 2.38,
      bestPed.z,
      quote,
      '#ff6b6b',
      4.1
    );

    activeCtx.ui?.showNotification?.(
      '📞 Nhân chứng đang gọi 911 báo cảnh sát (4.0s)! Chĩa súng, bóp còi hoặc áp sát để đe dọa ngăn +1★!',
      3.8
    );

    activeWitnessCallers.push({
      ped: bestPed,
      elapsed: 0,
      duration: 4.0,
      surrenderTimer: 0,
      intimidated: false
    });
    return true;
  }

  function checkPlayerIntimidatesWitness(witnessPed, activeCtx = ctx) {
    const p = activeCtx?.player || ctx?.player;
    if (!p || !witnessPed) return false;

    const d = dist2D(p.x, p.z, witnessPed.x, witnessPed.z);
    if (d > 20.0) return false;

    const playerCar = getPlayerVehicle(activeCtx);
    const inp = activeCtx?.input || ctx?.input || {};

    // 1. Player aims a firearm toward the witness within 18m!
    const curW = p.weaponId || p.weapon || p.currentWeapon || 'unarmed';
    const holdingGun = curW !== 'unarmed' && curW !== 'bat';
    if ((p.isAiming || inp.aim) && holdingGun && d < 18.5) {
      const ray = activeCtx.engine?.getAimRay?.();
      if (ray?.dir) {
        const toWX = (witnessPed.x - p.x) / Math.max(0.5, d);
        const toWZ = (witnessPed.z - p.z) / Math.max(0.5, d);
        const dot = ray.dir.x * toWX + ray.dir.z * toWZ;
        if (dot > 0.72) return true;
      } else {
        return true;
      }
    }

    // 2. Player fires a warning shot within 16m!
    if ((inp.fire || p.isFiring) && holdingGun && d < 16.0) {
      return true;
    }

    // 3. Player sprints right up to witness (< 2.8m) or presses Interact / Shout ([E]/[F]/[G]) within 4.8m!
    if (!playerCar && (d < 2.6 || (d < 4.8 && (inp.interactJustPressed || inp.rollJustPressed || localKeyJustPressed.KeyG)))) {
      return true;
    }

    // 4. Player blares car horn or charges bumper within 5.8m!
    if (playerCar && d < 5.8 && (inp.horn || inp.hornJustPressed || Math.hypot(playerCar.vx || 0, playerCar.vz || 0) > 7.5)) {
      return true;
    }

    return false;
  }

  function updateWitness911Callers(dt, activeCtx = ctx) {
    const p = activeCtx?.player || ctx?.player;
    const wanted = activeCtx.gameplay?.wanted;
    const cops = activeCtx.gameplay?.cops || [];
    const clock = activeCtx.elapsed || 0;

    if (!p || !wanted || isPlayerInsideInterior(p)) {
      prevPlayerWantedStars = wanted?.stars || 0;
      prevPlayerHeat = wanted?.heat || 0;
      return;
    }

    // Track combat quiet timer for EMS safety check
    const curW = p.weaponId || p.weapon || 'unarmed';
    const playerShootingGun = Boolean((activeCtx.input?.fire || p.isFiring) && curW !== 'unarmed' && curW !== 'bat');
    if (playerShootingGun) {
      combatQuietTimer = 0;
    } else {
      combatQuietTimer += dt;
    }

    // Detect street crime when no police officer is nearby -> convert into 4.0s Witness 911 Call!
    const liveCopNear = cops.some((c) => c && !c.dead && dist2D(c.x, c.z, p.x, p.z) < 52);

    if (!liveCopNear && activeWitnessCallers.length === 0 && !activeCtx.gameplay?.mission?.active) {
      // Case A: Heat jumped from 0 -> 1★ without any cop on scene (e.g. carjack / street scuffle)
      if (prevPlayerWantedStars === 0 && wanted.stars === 1 && wanted.heat < 32) {
        if (trySpawnWitness911Caller(p.x, p.z, activeCtx)) {
          // Hold off the +1★ until the witness finishes the 4.0s call!
          wanted.stars = 0;
          wanted.heat = 6;
          wanted.spotted = false;
        }
      }
      // Case B: Player fired a weapon outdoors with 0★ near civilians
      else if (wanted.stars === 0 && playerShootingGun && clock - prevPlayerWeaponFiredAt > 6.5) {
        prevPlayerWeaponFiredAt = clock;
        trySpawnWitness911Caller(p.x, p.z, activeCtx);
      }
    }

    // Step Active 911 Witness Callers
    for (let i = activeWitnessCallers.length - 1; i >= 0; i--) {
      const wc = activeWitnessCallers[i];
      const ped = wc.ped;

      if (!ped || ped.dead) {
        // Witness neutralized before call finished -> call aborted!
        if (ped) {
          ped._is911Caller = false;
          if (ped._phone911Prop) ped._phone911Prop.visible = false;
        }
        activeWitnessCallers.splice(i, 1);
        continue;
      }

      if (wc.intimidated) {
        wc.surrenderTimer -= dt;
        ped.yaw = Math.atan2(p.x - ped.x, p.z - ped.z);
        if (ped.mesh) ped.mesh.rotation.y = ped.yaw;
        if (ped.rig) applyContextualHumanoidPose(ped.rig, 'witness_surrender', clock);

        if (wc.surrenderTimer <= 0) {
          ped._is911Caller = false;
          ped.state = 'flee';
          ped.panicTimer = 7.0;
          activeWitnessCallers.splice(i, 1);
        }
        continue;
      }

      // Check if player intimidates witness before 4.0s timer completes!
      if (checkPlayerIntimidatesWitness(ped, activeCtx)) {
        wc.intimidated = true;
        wc.surrenderTimer = 2.1;
        if (ped._phone911Prop) ped._phone911Prop.visible = false;

        spawnDroppedWitnessPhone(ped.x, (ped.y || 0.22) + 1.15, ped.z, ped.y || 0.22);
        synthAudio.playPhoneDropClatter(0.9);

        if (wanted.stars <= 1 && !liveCopNear) {
          wanted.stars = 0;
          wanted.heat = 0;
          wanted.spotted = false;
        }

        const panicQuote = pickRandom(WITNESS_INTIMIDATED_QUOTES);
        spawnFloatingSpeechBubble(
          `witness_stop_${i}`,
          ped.x,
          (ped.y || 0.22) + 2.22,
          ped.z,
          panicQuote,
          '#4ade80',
          3.4
        );
        activeCtx.ui?.showNotification?.('📵 Đã đe dọa nhân chứng làm rơi điện thoại — Ngăn chặn +1★ thành công!', 3.4);
        continue;
      }

      // Advance 4.0s 911 Dispatch Countdown!
      wc.elapsed += dt;
      ped.state = 'idle';
      ped.idleTimer = 2.0;
      ped.yaw = dampAngle(ped.yaw, Math.atan2(p.x - ped.x, p.z - ped.z), 6.0, dt);
      if (ped.mesh) ped.mesh.rotation.y = ped.yaw;
      if (ped.rig) applyContextualHumanoidPose(ped.rig, 'witness_911_call', clock);

      if (wc.elapsed >= wc.duration) {
        // 4.0s Call Completed -> Thiên Đình Chấp Pháp Dispatched (+1★)!
        ped._is911Caller = false;
        if (ped._phone911Prop) ped._phone911Prop.visible = false;
        ped.state = 'flee';
        ped.panicTimer = 6.5;

        synthAudio.play911DispatchChirp();
        activeCtx.gameplay?.addCrimeHeat?.(20, '911_witness');
        activeCtx.ui?.showNotification?.('🚓 Nhân chứng đã báo xong 911 — Thiên Đình Chấp Pháp phát lệnh truy nã +1★!', 3.6);
        activeWitnessCallers.splice(i, 1);
      }
    }

    prevPlayerWantedStars = wanted.stars;
    prevPlayerHeat = wanted.heat;
  }

  // ---------------------------------------------------------------------------
  // 8C. STREET BUSKERS ON DEL PERRO PIER & BOULEVARD PLAZA
  // ---------------------------------------------------------------------------
  function ensureStreetBuskersSpawned(activeCtx = ctx) {
    if (buskersSpawned) return;
    const charSys = activeCtx?.characters || ctx?.characters;
    if (!charSys || typeof charSys.createHumanoid !== 'function') return;
    buskersSpawned = true;
    ensureSceneRootAttached(activeCtx);

    const buskerSpots = [
      {
        id: 'pier_guitar',
        mode: 'guitar',
        x: -192.0,
        y: 3.8,
        z: -6.5,
        yaw: 0.35,
        outfit: 'beach_tourist',
        label: 'Nghệ Sĩ Guitar Cầu Cảng Bồng Lai'
      },
      {
        id: 'pier_breakdance',
        mode: 'breakdance',
        x: -236.0,
        y: 3.8,
        z: 7.5,
        yaw: -0.65,
        outfit: 'street_hoodie',
        label: 'Vũ Công Đường Phố Bồng Lai Pier'
      },
      {
        id: 'boulevard_guitar',
        mode: 'guitar',
        x: 28.2,
        y: 0.22,
        z: -34.0,
        yaw: Math.PI / 2,
        outfit: 'crossbody_urban',
        label: 'Nghệ Sĩ Acoustic Đại Lộ Bồng Lai'
      }
    ];

    for (let i = 0; i < buskerSpots.length; i++) {
      const sp = buskerSpots[i];
      const groundY = sp.y === 3.8 ? 3.8 : sampleGroundY(sp.x, sp.z, 0.22, activeCtx);
      const performerRig = charSys.createHumanoid(sp.outfit);
      charSys.equipWeapon?.(performerRig, 'unarmed');
      const performerMesh = performerRig.root || performerRig;
      performerMesh.position.set(sp.x, groundY, sp.z);
      performerMesh.rotation.y = sp.yaw;
      npcLifeRoot.add(performerMesh);

      let stageProp = null;
      if (sp.mode === 'guitar') {
        const guitar = buildAcousticGuitarProp();
        performerRig.joints?.spine?.add(guitar);
        guitar.position.set(0.0, 0.26, 0.14);

        stageProp = buildOpenGuitarCaseWithTips();
        stageProp.position.set(
          sp.x + Math.sin(sp.yaw) * 1.15,
          groundY + 0.01,
          sp.z + Math.cos(sp.yaw) * 1.15
        );
        stageProp.rotation.y = sp.yaw;
        npcLifeRoot.add(stageProp);
      } else {
        stageProp = buildRetroBoomboxProp();
        stageProp.position.set(
          sp.x + Math.cos(sp.yaw) * 1.25,
          groundY + 0.01,
          sp.z - Math.sin(sp.yaw) * 1.25
        );
        stageProp.rotation.y = sp.yaw;
        npcLifeRoot.add(stageProp);
      }

      // 2 Swaying/Clapping Spectators enjoying the show
      const spectators = [];
      for (let s = 0; s < 2; s++) {
        const specAngle = sp.yaw + (s === 0 ? -0.42 : 0.45);
        const sx = sp.x + Math.sin(specAngle) * 2.45;
        const sz = sp.z + Math.cos(specAngle) * 2.45;
        const sy = sp.y === 3.8 ? 3.8 : sampleGroundY(sx, sz, 0.22, activeCtx);
        const sRig = charSys.createHumanoid(s === 0 ? 'female_urban' : 'beach_surfer');
        const sMesh = sRig.root || sRig;
        sMesh.position.set(sx, sy, sz);
        sMesh.rotation.y = Math.atan2(sp.x - sx, sp.z - sz);
        npcLifeRoot.add(sMesh);
        spectators.push({ rig: sRig, mesh: sMesh });
      }

      streetBuskers.push({
        ...sp,
        y: groundY,
        rig: performerRig,
        mesh: performerMesh,
        stageProp,
        spectators,
        chordTimer: randRange(0.4, 1.4),
        chordIdx: 0,
        noteBubbleTimer: randRange(2.0, 5.0)
      });
    }
  }

  function updateStreetBuskers(dt, activeCtx = ctx) {
    ensureStreetBuskersSpawned(activeCtx);
    const p = activeCtx?.player || ctx?.player;
    if (!p || isPlayerInsideInterior(p)) return;
    const clock = activeCtx.elapsed || 0;
    const playerCar = getPlayerVehicle(activeCtx);

    if (buskerTipCooldown > 0) buskerTipCooldown -= dt;

    for (let i = 0; i < streetBuskers.length; i++) {
      const b = streetBuskers[i];
      const d = dist2D(p.x, p.z, b.x, b.z);
      const visible = d < 95;
      b.mesh.visible = visible;
      if (b.stageProp) b.stageProp.visible = visible;
      for (const sp of b.spectators) sp.mesh.visible = visible;
      if (!visible) continue;

      activeCtx.characters?.animateHumanoid?.(b.rig, 'idle', dt);
      applyContextualHumanoidPose(
        b.rig,
        b.mode === 'guitar' ? 'busker_guitar' : 'busker_breakdance',
        clock + i * 1.3
      );

      for (let s = 0; s < b.spectators.length; s++) {
        const spec = b.spectators[s];
        activeCtx.characters?.animateHumanoid?.(spec.rig, 'idle', dt);
        if (spec.rig?.joints?.head) {
          spec.rig.joints.head.rotation.z = Math.sin(clock * 4.5 + s) * 0.08;
          spec.rig.joints.head.rotation.x = Math.abs(Math.sin(clock * 4.5)) * 0.12;
        }
      }

      // Spatial Acoustic Guitar Chord Strum & Floating Musical Notes!
      if (d < 24.0) {
        b.chordTimer -= dt;
        if (b.chordTimer <= 0) {
          b.chordTimer = b.mode === 'guitar' ? 1.15 : 1.55;
          if (b.mode === 'guitar') {
            synthAudio.playGuitarChord(b.chordIdx++, 1.0 - d / 26.0);
          }
        }

        b.noteBubbleTimer -= dt;
        if (b.noteBubbleTimer <= 0) {
          b.noteBubbleTimer = randRange(4.8, 7.5);
          const lyric =
            b.mode === 'guitar'
              ? '♪ ♫ Giai điệu chiều gió biển Bồng Lai... ♪'
              : '🔥 Nhịp điệu Hip-Hop Bờ Biển Thái Bình Dương! ♫';
          spawnFloatingSpeechBubble(`busker_${b.id}`, b.x, b.y + 2.15, b.z, lyric, '#67e8f9', 3.0);
        }
      }

      // Tip $20 Interaction when walking close (< 3.6m)!
      if (!playerCar && d < 3.6 && Math.abs(p.y - b.y) < 1.8 && buskerTipCooldown <= 0) {
        activeCtx.ui?.showPrompt?.('Nhấn [G] để thưởng $20 cho Nghệ sĩ đường phố');
        if (localKeyJustPressed.KeyG) {
          if (getPlayerCash(activeCtx) >= 20) {
            buskerTipCooldown = 5.0;
            addPlayerCash(-20, true, activeCtx);
            p.special = Math.min(p.maxSpecial || 100, (p.special || 0) + 12);
            synthAudio.playGuitarChord(2, 0.95);
            const blessing = pickRandom(BUSKER_BLESSING_QUOTES);
            spawnFloatingSpeechBubble(`busker_${b.id}`, b.x, b.y + 2.18, b.z, blessing, '#4ade80', 4.0);
            activeCtx.ui?.showNotification?.('🎸 Đã thưởng $20 cho Nghệ sĩ đường phố (+12 Năng lượng Đặc biệt)!', 3.2);
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 8D. RANDOM BLUE-DOT DYNAMIC STREET EVENTS (4 FULL PLAYABLE ENCOUNTERS!)
  // ---------------------------------------------------------------------------
  function ensureBlueDotBeaconMesh() {
    if (blueDotEvent.beaconMesh) return blueDotEvent.beaconMesh;
    const grp = new THREE.Group();
    const ring = new THREE.Mesh(sharedGeometries.eventBeaconRing, sharedMaterials.blueEventRingMat);
    ring.position.y = 0.05;
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(sharedGeometries.eventBeaconBeam, beamMat);
    beam.position.y = 2.2;
    grp.add(ring, beam);
    grp.visible = false;
    grp.userData.ring = ring;
    npcLifeRoot.add(grp);
    blueDotEvent.beaconMesh = grp;
    return grp;
  }

  function cleanupBlueDotEvent(activeCtx = ctx) {
    blueDotEvent.active = false;
    blueDotEvent.type = '';
    blueDotEvent.stage = 0;
    if (blueDotEvent.beaconMesh) blueDotEvent.beaconMesh.visible = false;

    if (blueDotEvent.vanUnit) {
      if (blueDotEvent.vanUnit.mesh?.parent) blueDotEvent.vanUnit.mesh.parent.remove(blueDotEvent.vanUnit.mesh);
      blueDotEvent.vanUnit = null;
    }
    if (blueDotEvent.brokenCar && blueDotEvent.brokenCar !== getPlayerVehicle(activeCtx)) {
      activeCtx.vehicles?.removeVehicle?.(blueDotEvent.brokenCar);
      blueDotEvent.brokenCar = null;
    }
    if (blueDotEvent.purseMesh?.parent) {
      blueDotEvent.purseMesh.parent.remove(blueDotEvent.purseMesh);
      blueDotEvent.purseMesh = null;
    }

    const peds = activeCtx.gameplay?.peds;
    for (const actor of blueDotEvent.actors) {
      if (actor.mesh?.parent) actor.mesh.parent.remove(actor.mesh);
      if (Array.isArray(peds)) {
        const idx = peds.indexOf(actor);
        if (idx !== -1) peds.splice(idx, 1);
      }
    }
    blueDotEvent.actors.length = 0;
  }

  function spawnDroppedHeavyCashBag(x, y, z, value = 2800) {
    const mesh = buildHeavyCashBagProp();
    mesh.position.set(x, y, z);
    npcLifeRoot.add(mesh);
    droppedCashLoot.push({ x, y, z, value, mesh, age: 0 });
  }

  function startDynamicBlueDotEvent(forcedType = null, activeCtx = ctx) {
    const p = activeCtx?.player || ctx?.player;
    if (!p || isPlayerInsideInterior(p)) return false;
    ensureSceneRootAttached(activeCtx);
    cleanupBlueDotEvent(activeCtx);

    const EVENT_TYPES = ['armored_van', 'purse_snatcher', 'vip_hitchhiker', 'alley_ambush'];
    const chosenType =
      forcedType && EVENT_TYPES.includes(forcedType)
        ? forcedType
        : EVENT_TYPES[blueDotEvent.cycleIdx++ % EVENT_TYPES.length];

    // Pick road node 52..98m from player
    const spawnLoc = pickDispatchSpawnOnAvenue(p.x, p.z, 52, 96, activeCtx);
    const ex = spawnLoc.x;
    const ez = spawnLoc.z;
    const ey = sampleGroundY(ex, ez, 0.22, activeCtx);

    blueDotEvent.active = true;
    blueDotEvent.type = chosenType;
    blueDotEvent.stage = 1;
    blueDotEvent.x = ex;
    blueDotEvent.y = ey;
    blueDotEvent.z = ez;
    blueDotEvent.timer = 95.0;

    const beacon = ensureBlueDotBeaconMesh();
    beacon.position.set(ex, ey, ez);
    beacon.visible = true;

    const charSys = activeCtx?.characters || ctx?.characters;
    const scene = getScene(activeCtx);

    if (chosenType === 'armored_van') {
      blueDotEvent.title = 'Xe Bọc Thép Chở Tiền Gruppe Sechs';
      const built = buildArmoredCashVanMesh();
      built.root.position.set(ex, ey, ez);
      built.root.rotation.y = spawnLoc.yaw;
      npcLifeRoot.add(built.root);

      const goalX = ex > 0 ? -40 : 120;
      const goalZ = ez > 0 ? -120 : 120;
      const waypoints = computeRoadRouteWaypoints(ex, ez, goalX, goalZ, 3.0);

      blueDotEvent.vanUnit = {
        x: ex,
        y: ey,
        z: ez,
        yaw: spawnLoc.yaw,
        speed: 9.5,
        steerAngle: 0,
        vaultHp: 90,
        breached: false,
        doorOpenAmt: 0,
        waypoints,
        waypointIdx: 0,
        goalX,
        goalZ,
        mesh: built.root,
        chassis: built.chassis,
        wheels: built.wheels,
        doorLeftPivot: built.doorLeftPivot,
        doorRightPivot: built.doorRightPivot,
        interiorLoot: built.interiorLoot
      };

      activeCtx.ui?.showNotification?.(
        '🔵 Sự Kiện Đường Phố: Xe Bọc Thép Chở Tiền Gruppe Sechs xuất hiện! Phá cửa sau để cướp $8,500!',
        4.5
      );
    } else if (chosenType === 'purse_snatcher') {
      blueDotEvent.title = 'Truy Đuổi Tên Cướp Giật Ví Du Khách';
      if (charSys?.createHumanoid) {
        // Victim waving arms
        const vicRig = charSys.createHumanoid('female_urban');
        const vicMesh = vicRig.root || vicRig;
        vicMesh.position.set(ex, ey, ez);
        npcLifeRoot.add(vicMesh);

        // Sprinting Mugger 9m ahead
        const mugX = ex + Math.sin(spawnLoc.yaw) * 9.0;
        const mugZ = ez + Math.cos(spawnLoc.yaw) * 9.0;
        const mugY = sampleGroundY(mugX, mugZ, 0.22, activeCtx);
        const mugRig = charSys.createHumanoid('street_hoodie');
        const mugMesh = mugRig.root || mugRig;
        mugMesh.position.set(mugX, mugY, mugZ);
        if (scene) scene.add(mugMesh);

        const mugEntity = {
          role: 'mugger',
          x: mugX,
          y: mugY,
          z: mugZ,
          yaw: spawnLoc.yaw,
          hp: 55,
          maxHp: 55,
          _prevHp: 55,
          dead: false,
          _deathHandled: false,
          corpseTimer: 0,
          noWantedOnKill: true,
          rig: mugRig,
          mesh: mugMesh
        };
        // Register mugger into peds so player bullets & melee hit him natively!
        activeCtx.gameplay?.peds?.push?.(mugEntity);

        blueDotEvent.actors.push(
          { role: 'victim', x: ex, y: ey, z: ez, yaw: spawnLoc.yaw, rig: vicRig, mesh: vicMesh },
          mugEntity
        );
      }
      blueDotEvent.purseDropped = false;
      blueDotEvent.purseCollected = false;
      activeCtx.ui?.showNotification?.(
        '🔵 Sự Kiện Đường Phố: Tên cướp vừa giật ví tiền của du khách! Đuổi theo hạ gục hắn để lấy lại ví ($2,000)!',
        4.5
      );
    } else if (chosenType === 'vip_hitchhiker') {
      blueDotEvent.title = 'Doanh Nhân VIP Gặp Sự Cố Xe Hỏng';
      blueDotEvent.destX = KEY_LANDMARKS.diamondCasino.x;
      blueDotEvent.destZ = KEY_LANDMARKS.diamondCasino.z;

      if (activeCtx.vehicles?.spawnVehicle) {
        const bCar = activeCtx.vehicles.spawnVehicle('banshee', ex + 2.4, ey, ez, spawnLoc.yaw, {
          color: 0x1d4ed8,
          isParked: true,
          hp: 55,
          maxHp: 140
        });
        if (bCar) {
          bCar.hoodBuckle = 0.85;
          blueDotEvent.brokenCar = bCar;
        }
      }

      if (charSys?.createHumanoid) {
        const vipRig = charSys.createHumanoid('business_exec');
        const vipMesh = vipRig.root || vipRig;
        vipMesh.position.set(ex - 1.2, ey, ez + 1.2);
        npcLifeRoot.add(vipMesh);
        blueDotEvent.actors.push({
          role: 'vip',
          x: ex - 1.2,
          y: ey,
          z: ez + 1.2,
          yaw: 0,
          rig: vipRig,
          mesh: vipMesh
        });
      }

      activeCtx.ui?.showNotification?.(
        '🔵 Sự Kiện Đường Phố: Doanh nhân VIP hỏng xe ven đường! Dừng xe đón ông ta tới Sòng Bạc Diamond (+$4,500)!',
        4.5
      );
    } else {
      blueDotEvent.title = 'Giải Cứu Thương Nhân Khỏi Côn Đồ';
      if (charSys?.createHumanoid) {
        const hostRig = charSys.createHumanoid('business_exec');
        const hostMesh = hostRig.root || hostRig;
        hostMesh.position.set(ex, ey, ez);
        npcLifeRoot.add(hostMesh);
        blueDotEvent.actors.push({ role: 'hostage', x: ex, y: ey, z: ez, yaw: 0, rig: hostRig, mesh: hostMesh });

        for (let g = 0; g < 3; g++) {
          const ang = (g / 3) * Math.PI * 2;
          const gx = ex + Math.cos(ang) * 3.2;
          const gz = ez + Math.sin(ang) * 3.2;
          const gy = sampleGroundY(gx, gz, 0.22, activeCtx);
          const gRig = charSys.createHumanoid('gangster');
          charSys.equipWeapon?.(gRig, g === 0 ? 'smg' : 'pistol');
          const gMesh = gRig.root || gRig;
          gMesh.position.set(gx, gy, gz);
          if (scene) scene.add(gMesh);

          const thug = {
            role: 'thug',
            x: gx,
            y: gy,
            z: gz,
            yaw: Math.atan2(ex - gx, ez - gz),
            hp: 65,
            maxHp: 65,
            _prevHp: 65,
            dead: false,
            _deathHandled: false,
            corpseTimer: 0,
            isEnemy: true,
            isHostile: false,
            noWantedOnKill: true,
            weapon: g === 0 ? 'smg' : 'pistol',
            shootCooldown: 0.9,
            rig: gRig,
            mesh: gMesh
          };
          activeCtx.gameplay?.peds?.push?.(thug);
          blueDotEvent.actors.push(thug);
        }
      }
      activeCtx.ui?.showNotification?.(
        '🔵 Sự Kiện Đường Phố: Toán côn đồ đang uy hiếp con tin! Giải cứu để nhận thưởng $5,000 & Áo Giáp!',
        4.5
      );
    }

    return true;
  }

  function updateDynamicBlueDotEvents(dt, activeCtx = ctx) {
    const p = activeCtx?.player || ctx?.player;
    const clock = activeCtx.elapsed || 0;
    const playerCar = getPlayerVehicle(activeCtx);

    // 1. Collect any Dropped Heavy Cash Bags from Gruppe Sechs Armored Van Heist!
    for (let i = droppedCashLoot.length - 1; i >= 0; i--) {
      const bag = droppedCashLoot[i];
      bag.age += dt;
      bag.mesh.rotation.y += dt * 2.1;
      bag.mesh.position.y = bag.y + 0.06 + Math.sin(clock * 3.8 + i) * 0.05;

      if (bag.age > 65.0) {
        if (bag.mesh.parent) bag.mesh.parent.remove(bag.mesh);
        droppedCashLoot.splice(i, 1);
        continue;
      }

      if (p && dist2D(p.x, p.z, bag.x, bag.z) < 2.8) {
        addPlayerCash(bag.value, true, activeCtx);
        activeCtx.audio?.playPickup?.();
        activeCtx.ui?.showNotification?.(`💰 Đã nhặt Túi Tiền Bọc Thép Gruppe Sechs (+$${bag.value.toLocaleString('en-US')})!`, 2.8);
        if (bag.mesh.parent) bag.mesh.parent.remove(bag.mesh);
        droppedCashLoot.splice(i, 1);
      }
    }

    if (!p || isPlayerInsideInterior(p) || activeCtx.gameplay?.mission?.active) {
      return;
    }

    // 2. Spawn Periodic Blue-Dot Street Encounter when idle in open world
    if (!blueDotEvent.active) {
      blueDotEvent.cooldown -= dt;
      if (blueDotEvent.cooldown <= 0 && (activeCtx.gameplay?.wanted?.stars || 0) < 3) {
        blueDotEvent.cooldown = randRange(40, 58);
        startDynamicBlueDotEvent(null, activeCtx);
      }
      return;
    }

    blueDotEvent.timer -= dt;
    const distEvent = dist2D(p.x, p.z, blueDotEvent.x, blueDotEvent.z);
    if (blueDotEvent.timer <= 0 || distEvent > 235) {
      cleanupBlueDotEvent(activeCtx);
      blueDotEvent.cooldown = 32.0;
      return;
    }

    if (blueDotEvent.beaconMesh?.visible) {
      blueDotEvent.beaconMesh.rotation.y += dt * 1.5;
      blueDotEvent.beaconMesh.userData.ring.scale.setScalar(1.0 + Math.sin(clock * 4.2) * 0.12);
    }

    // --- EVENT 1: GRUPPE SECHS ARMORED CASH VAN ---
    if (blueDotEvent.type === 'armored_van' && blueDotEvent.vanUnit) {
      const van = blueDotEvent.vanUnit;
      blueDotEvent.x = van.x;
      blueDotEvent.y = van.y;
      blueDotEvent.z = van.z;
      if (blueDotEvent.beaconMesh) blueDotEvent.beaconMesh.position.set(van.x, van.y, van.z);

      if (!van.breached) {
        stepEmergencyVehicleKinematics(van, van.goalX, van.goalZ, 11.5, 6.0, dt, activeCtx);

        // Detect player shooting rear vault doors OR high-impact vehicle ramming!
        const rearX = van.x - Math.sin(van.yaw) * 2.9;
        const rearZ = van.z - Math.cos(van.yaw) * 2.9;
        const inp = activeCtx.input || {};
        const curW = p.weaponId || p.weapon || 'unarmed';

        if ((inp.fire || p.isFiring) && curW !== 'unarmed' && dist2D(p.x, p.z, rearX, rearZ) < 34) {
          const dps = curW === 'grenade' ? 320 : curW === 'shotgun' ? 95 : 58;
          van.vaultHp -= dps * dt;
          spawnRimGrindingSparks(rearX, van.y + 1.2, rearZ, 0, 0, 2);
        }

        if (playerCar && dist2D(playerCar.x, playerCar.z, van.x, van.z) < 4.4) {
          const relSpd = Math.hypot(playerCar.vx || 0, playerCar.vz || 0);
          if (relSpd > 10.0) {
            van.vaultHp -= relSpd * 2.2;
            spawnRimGrindingSparks(rearX, van.y + 1.0, rearZ, 0, 0, 6);
          }
        }

        if (van.vaultHp <= 0) {
          van.breached = true;
          van.interiorLoot.visible = false;
          activeCtx.characters?.spawnExplosion?.(rearX, van.y + 1.1, rearZ, 0.75, activeCtx);
          activeCtx.gameplay?.addCrimeHeat?.(36, 'armored_van_heist');

          // Scatter 3 Heavy Cash Duffel Bags ($2,800 + $2,800 + $2,900 = $8,500)!
          const amounts = [2800, 2800, 2900];
          for (let k = 0; k < 3; k++) {
            const bx = rearX - Math.sin(van.yaw) * (1.2 + k * 1.1) + (k - 1) * 0.9;
            const bz = rearZ - Math.cos(van.yaw) * (1.2 + k * 1.1);
            const by = sampleGroundY(bx, bz, 0.05, activeCtx);
            spawnDroppedHeavyCashBag(bx, by, bz, amounts[k]);
          }

          activeCtx.ui?.showBanner?.('CƯỚP XE TIỀN THÀNH CÔNG', 'Nhặt 3 Túi Tiền Gruppe Sechs ($8,500) & Cắt đuôi Thiên Đình Chấp Pháp!', 'passed');
          blueDotEvent.timer = 18.0;
        }
      } else {
        // Vault breached -> swing twin steel doors wide open & flee in panic!
        van.doorOpenAmt = damp(van.doorOpenAmt, 2.05, 8.0, dt);
        van.doorLeftPivot.rotation.y = van.doorOpenAmt;
        van.doorRightPivot.rotation.y = -van.doorOpenAmt;
        stepEmergencyVehicleKinematics(van, van.goalX, van.goalZ, 19.5, 4.0, dt, activeCtx);
      }
    }

    // --- EVENT 2: PURSE SNATCHER STREET CHASE ---
    else if (blueDotEvent.type === 'purse_snatcher') {
      const victim = blueDotEvent.actors.find((a) => a.role === 'victim');
      const mugger = blueDotEvent.actors.find((a) => a.role === 'mugger');

      if (victim && victim.rig) {
        victim.yaw = Math.atan2(p.x - victim.x, p.z - victim.z);
        victim.mesh.rotation.y = victim.yaw;
        activeCtx.characters?.animateHumanoid?.(victim.rig, 'idle', dt);
        if (!blueDotEvent.purseCollected && Math.floor(clock * 2) % 3 === 0) {
          spawnFloatingSpeechBubble(
            'purse_vic',
            victim.x,
            victim.y + 2.15,
            victim.z,
            '"Cứu với!! Hắn cướp ví tiền của tôi chạy đằng kia kìa!"',
            '#38bdf8',
            1.8
          );
        }
      }

      if (mugger && !blueDotEvent.purseDropped) {
        // Check if player tackled/bumped mugger on foot or with car, or shot him!
        const dPlayerMug = dist2D(p.x, p.z, mugger.x, mugger.z);
        const tackled = dPlayerMug < (playerCar ? 2.6 : 1.55);

        if (mugger.dead || mugger.hp <= 0 || tackled) {
          blueDotEvent.purseDropped = true;
          mugger.dead = true;
          activeCtx.characters?.animateHumanoid?.(mugger.rig, 'dead', 0.05);

          const pMesh = buildHeavyCashBagProp();
          pMesh.position.set(mugger.x, mugger.y + 0.05, mugger.z);
          npcLifeRoot.add(pMesh);
          blueDotEvent.purseMesh = pMesh;
          blueDotEvent.x = mugger.x;
          blueDotEvent.z = mugger.z;
          if (blueDotEvent.beaconMesh) blueDotEvent.beaconMesh.position.set(mugger.x, mugger.y, mugger.z);

          activeCtx.ui?.showNotification?.('💼 Tên cướp đã gục và đánh rơi chiếc ví! Lại gần để nhặt lại ví!', 3.6);
        } else {
          // Sprint down road away from victim
          const runSpd = 5.6;
          mugger.x += Math.sin(mugger.yaw) * runSpd * dt;
          mugger.z += Math.cos(mugger.yaw) * runSpd * dt;
          activeCtx.world?.resolveCircleAABB?.(mugger, 0.4);
          mugger.y = sampleGroundY(mugger.x, mugger.z, 0.22, activeCtx);
          mugger.mesh.position.set(mugger.x, mugger.y, mugger.z);
          mugger.mesh.rotation.y = mugger.yaw;
          activeCtx.characters?.animateHumanoid?.(mugger.rig, 'run', dt);

          blueDotEvent.x = mugger.x;
          blueDotEvent.z = mugger.z;
          if (blueDotEvent.beaconMesh) blueDotEvent.beaconMesh.position.set(mugger.x, mugger.y, mugger.z);
        }
      } else if (blueDotEvent.purseDropped && !blueDotEvent.purseCollected && blueDotEvent.purseMesh) {
        blueDotEvent.purseMesh.rotation.y += dt * 2.5;
        if (dist2D(p.x, p.z, blueDotEvent.purseMesh.position.x, blueDotEvent.purseMesh.position.z) < 2.5) {
          blueDotEvent.purseCollected = true;
          blueDotEvent.purseMesh.visible = false;
          addPlayerCash(1200, true, activeCtx);
          activeCtx.audio?.playPickup?.();

          if (victim) {
            blueDotEvent.x = victim.x;
            blueDotEvent.z = victim.z;
            if (blueDotEvent.beaconMesh) blueDotEvent.beaconMesh.position.set(victim.x, victim.y, victim.z);
            activeCtx.ui?.showNotification?.(
              '💼 Đã thu hồi ví (+$1,200)! Đem trả lại cho Du khách để nhận thêm +$1,300 & đầy Thanh Kỹ Năng!',
              4.2
            );
          } else {
            cleanupBlueDotEvent(activeCtx);
          }
        }
      } else if (blueDotEvent.purseCollected && victim) {
        if (dist2D(p.x, p.z, victim.x, victim.z) < 3.6) {
          addPlayerCash(1300, true, activeCtx);
          p.special = p.maxSpecial || 100;
          spawnFloatingSpeechBubble(
            'purse_thanks',
            victim.x,
            victim.y + 2.15,
            victim.z,
            '"Người hùng đích thực!! Xin hậu tạ anh thêm $1,300 nhé!"',
            '#4ade80',
            4.2
          );
          activeCtx.ui?.showBanner?.('NGƯỜI HÙNG ĐƯỜNG PHỐ', 'Hoàn trả ví du khách • Tổng thưởng +$2,500!', 'passed');
          cleanupBlueDotEvent(activeCtx);
          blueDotEvent.cooldown = 42.0;
        }
      }
    }

    // --- EVENT 3: STRANDED VIP HITCHHIKER ESCORT ---
    else if (blueDotEvent.type === 'vip_hitchhiker') {
      const vip = blueDotEvent.actors[0];
      if (!vip) {
        cleanupBlueDotEvent(activeCtx);
        return;
      }

      if (blueDotEvent.stage === 1) {
        // Stage 1: Waiting beside smoking sports car waving for a ride
        vip.yaw = Math.atan2(p.x - vip.x, p.z - vip.z);
        vip.mesh.rotation.y = vip.yaw;
        activeCtx.characters?.animateHumanoid?.(vip.rig, 'idle', dt);
        applyContextualHumanoidPose(vip.rig, 'witness_surrender', clock * 0.35);

        if (distEvent < 18 && Math.floor(clock) % 4 === 0) {
          spawnFloatingSpeechBubble(
            'vip_wave',
            vip.x,
            vip.y + 2.18,
            vip.z,
            '"Xe tôi hỏng máy rồi! Dừng xe cho tôi quá giang tới Sòng Bạc Diamond (+$4,500)!"',
            '#38bdf8',
            2.2
          );
        }

        if (
          playerCar &&
          !playerCar.isHeli &&
          dist2D(playerCar.x, playerCar.z, vip.x, vip.z) < 6.8 &&
          Math.hypot(playerCar.vx || 0, playerCar.vz || 0) < 3.5
        ) {
          blueDotEvent.stage = 2;
          blueDotEvent.timer = 75.0;
          vip.mesh.visible = false;
          blueDotEvent.x = blueDotEvent.destX;
          blueDotEvent.z = blueDotEvent.destZ;
          const dy = sampleGroundY(blueDotEvent.destX, blueDotEvent.destZ, 0.22, activeCtx);
          if (blueDotEvent.beaconMesh) blueDotEvent.beaconMesh.position.set(blueDotEvent.destX, dy, blueDotEvent.destZ);

          activeCtx.audio?.playDoor?.();
          activeCtx.ui?.showSubtitle?.(
            'Doanh Nhân VIP: "Cảm ơn bạn hiền! Đạp ga đưa tôi tới Sòng Bạc Diamond (198, -110) trước khi hết giờ nhé!"',
            4.8
          );
        }
      } else if (blueDotEvent.stage === 2) {
        // Stage 2: Driving VIP to Vạn Bảo Đổ Phường Porte-Cochere
        const dDest = dist2D(p.x, p.z, blueDotEvent.destX, blueDotEvent.destZ);
        if (dDest < 11.5 && (!playerCar || Math.hypot(playerCar.vx || 0, playerCar.vz || 0) < 6.5)) {
          addPlayerCash(4500, true, activeCtx);
          activeCtx.audio?.playMissionPassed?.();
          activeCtx.ui?.showBanner?.('ĐƯA ĐÓN VIP THÀNH CÔNG', 'Thù lao +$4,500 • Bí mật cổ phiếu Diamond Resort tăng giá!', 'passed');
          cleanupBlueDotEvent(activeCtx);
          blueDotEvent.cooldown = 45.0;
        }
      }
    }

    // --- EVENT 4: ALLEY GANG STANDOFF HOSTAGE RESCUE ---
    else if (blueDotEvent.type === 'alley_ambush') {
      const hostage = blueDotEvent.actors.find((a) => a.role === 'hostage');
      const thugs = blueDotEvent.actors.filter((a) => a.role === 'thug');
      const aliveThugs = thugs.filter((t) => !t.dead && t.hp > 0);

      if (hostage?.rig) {
        activeCtx.characters?.animateHumanoid?.(hostage.rig, 'idle', dt);
        applyContextualHumanoidPose(hostage.rig, 'witness_surrender', clock);
      }

      if (distEvent < 30) {
        for (const t of aliveThugs) t.isHostile = true;
      }

      if (aliveThugs.length === 0) {
        addPlayerCash(5000, true, activeCtx);
        p.armor = 100;
        activeCtx.audio?.playMissionPassed?.();
        if (hostage) {
          spawnFloatingSpeechBubble(
            'hostage_saved',
            hostage.x,
            hostage.y + 2.18,
            hostage.z,
            '"Ơn giời anh cứu mạng tôi rồi! Xin tặng $5,000 và Áo giáp chống đạn!"',
            '#4ade80',
            4.2
          );
        }
        activeCtx.ui?.showBanner?.('GIẢI CỨU CON TIN', 'Hạ gục toán côn đồ • Phần thưởng +$5,000 & Giáp 100%!', 'passed');
        cleanupBlueDotEvent(activeCtx);
        blueDotEvent.cooldown = 45.0;
      }
    }
  }

  // ============================================================================
  // 9. SCREEN-SPACE HUD, SKY-SWITCH SATELLITE CANVAS, SPEECH BUBBLES & MINIMAP
  // ============================================================================
  const MAX_SPEECH_BUBBLES = 10;
  const MAX_TARGET_DIAMONDS = 8;

  const speechBubbles = [];
  const hudDom = {
    built: false,
    styleEl: null,
    rootLayer: null,
    skyCanvas: null,
    skyCtx: null,
    bubbleEls: [],
    witnessEls: [],
    diamondEls: [],
    perkBannerEl: null,
    tireWarnPill: null,
    charWidgetEl: null,
    charCardEls: {},
    dossierModalEl: null
  };

  let charWidgetVisibleTimer = 6.5;
  let dossierModalOpen = false;

  const localKeyHeld = {};
  const localKeyJustPressed = {};
  let keyboardHookInstalled = false;
  let engineCameraHookInstalled = false;
  let vehicleRepairHookInstalled = false;
  let uiMinimapHookInstalled = false;
  let phoneActionHookInstalled = false;
  let shopsModHookInstalled = false;
  let isInitialized = false;

  function spawnFloatingSpeechBubble(idKey, x, y, z, text, accentHex = '#fde047', duration = 3.4) {
    if (!text) return;
    const existing = speechBubbles.find((b) => b.idKey === idKey && b.active);
    if (existing) {
      existing.x = x;
      existing.y = y;
      existing.z = z;
      existing.text = text;
      existing.accentHex = accentHex;
      existing.life = duration;
      existing.maxLife = duration;
      return;
    }

    let slot = speechBubbles.find((b) => !b.active);
    if (!slot) {
      if (speechBubbles.length < MAX_SPEECH_BUBBLES) {
        slot = { active: false };
        speechBubbles.push(slot);
      } else {
        slot = speechBubbles[0];
      }
    }

    slot.active = true;
    slot.idKey = idKey;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.text = text;
    slot.accentHex = accentHex;
    slot.life = duration;
    slot.maxLife = duration;
  }

  function revealProtagonistHudWidget(seconds = 4.5) {
    charWidgetVisibleTimer = Math.max(charWidgetVisibleTimer, seconds);
  }

  function buildProtagonistPortraitSVG(id) {
    if (id === 'franklin') {
      return `<svg viewBox="0 0 56 56" fill="none">
        <rect width="56" height="56" rx="10" fill="#0b2922"/>
        <circle cx="28" cy="21" r="10.5" fill="#8d5b3c"/>
        <path d="M17.5 19c1-6.5 20-6.5 21 0v-2c-2-6-19-6-21 0v2z" fill="#141313"/>
        <path d="M11 52c2-11 9-16 17-16s15 5 17 16H11z" fill="#0f766e"/>
        <path d="M23 36l5 6 5-6" stroke="#f8fafc" stroke-width="2.2" stroke-linecap="round"/>
      </svg>`;
    }
    if (id === 'michael') {
      return `<svg viewBox="0 0 56 56" fill="none">
        <rect width="56" height="56" rx="10" fill="#0c2238"/>
        <circle cx="28" cy="21" r="10.5" fill="#b88464"/>
        <path d="M17 18c2-7 19-8 22-1-3-2-18-2-22 1z" fill="#27272a"/>
        <rect x="20" y="18.5" width="6.8" height="3.8" rx="1.2" fill="#0f172a"/>
        <rect x="29.2" y="18.5" width="6.8" height="3.8" rx="1.2" fill="#0f172a"/>
        <line x1="26.8" y1="20" x2="29.2" y2="20" stroke="#cbd5e1" stroke-width="1.2"/>
        <path d="M10 52c2-11 9-16 18-16s16 5 18 16H10z" fill="#1e293b"/>
        <polygon points="28,36 25.5,48 28,52 30.5,48" fill="#991b1b"/>
      </svg>`;
    }
    return `<svg viewBox="0 0 56 56" fill="none">
      <rect width="56" height="56" rx="10" fill="#30150b"/>
      <circle cx="28" cy="21" r="10.5" fill="#a97455"/>
      <path d="M18 17c3-5 17-5 20 0" stroke="#18181b" stroke-width="4" stroke-linecap="round"/>
      <rect x="19.5" y="18.5" width="17" height="4.2" rx="1.8" fill="#f97316"/>
      <path d="M10 52c2-12 9-16 18-16s16 4 18 16H10z" fill="#18181b"/>
      <path d="M18 39h20v9H18z" fill="#334155"/>
    </svg>`;
  }

  function ensureNpcLifeDOM() {
    if (hudDom.built || typeof document === 'undefined') return;
    hudDom.built = true;

    const style = document.createElement('style');
    style.id = 'npc-life-styles';
    style.textContent = `
      #npc-life-hud-layer {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 34;
        overflow: hidden;
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      }
      #npc-life-skyswitch-canvas {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 46;
        display: none;
      }
      .npclife-speech-bubble {
        position: absolute;
        left: 0;
        top: 0;
        max-width: 265px;
        padding: 6px 11px;
        border-radius: 10px;
        background: rgba(10, 14, 22, 0.86);
        border: 1.5px solid rgba(253, 224, 71, 0.75);
        color: #f8fafc;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.3;
        text-align: center;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55);
        transform: translate(-50%, -100%);
        white-space: normal;
        display: none;
        backdrop-filter: blur(4px);
      }
      .npclife-speech-bubble::after {
        content: '';
        position: absolute;
        left: 50%;
        bottom: -6px;
        transform: translateX(-50%);
        border-width: 6px 6px 0 6px;
        border-style: solid;
        border-color: rgba(10, 14, 22, 0.9) transparent transparent transparent;
      }
      .npclife-witness-tag {
        position: absolute;
        left: 0;
        top: 0;
        padding: 5px 10px;
        border-radius: 999px;
        background: rgba(127, 29, 29, 0.92);
        border: 1.5px solid #ff4d4d;
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.3px;
        display: none;
        align-items: center;
        gap: 6px;
        transform: translate(-50%, -100%);
        box-shadow: 0 0 16px rgba(239, 68, 68, 0.65);
      }
      .npclife-witness-bar-wrap {
        width: 54px;
        height: 6px;
        background: rgba(0, 0, 0, 0.55);
        border-radius: 4px;
        overflow: hidden;
      }
      .npclife-witness-bar-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #fde047, #ef4444);
      }
      .npclife-target-diamond {
        position: absolute;
        width: 22px;
        height: 22px;
        border: 2px solid #38bdf8;
        box-shadow: 0 0 10px rgba(56, 189, 248, 0.85), inset 0 0 6px rgba(56, 189, 248, 0.45);
        transform: translate(-50%, -50%) rotate(45deg);
        display: none;
      }
      #npc-life-perk-pill {
        position: fixed;
        top: 68px;
        left: 50%;
        transform: translateX(-50%);
        padding: 6px 16px;
        border-radius: 999px;
        background: rgba(9, 13, 22, 0.88);
        border: 1.5px solid #38bdf8;
        color: #f8fafc;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.55);
        display: none;
        z-index: 38;
      }
      #npc-life-tire-pill {
        position: fixed;
        bottom: 168px;
        left: 24px;
        padding: 5px 11px;
        border-radius: 8px;
        background: rgba(124, 45, 18, 0.90);
        border: 1.5px solid #fb923c;
        color: #ffedd5;
        font-size: 11.5px;
        font-weight: 800;
        display: none;
        z-index: 36;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
      }
      #npc-life-char-wheel {
        position: fixed;
        right: 18px;
        bottom: 118px;
        display: flex;
        gap: 7px;
        padding: 7px 9px;
        border-radius: 14px;
        background: rgba(10, 14, 22, 0.82);
        border: 1px solid rgba(148, 163, 184, 0.28);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        pointer-events: auto;
        z-index: 32;
        transition: opacity 0.28s ease, transform 0.28s ease;
      }
      #npc-life-char-wheel.compact-dim {
        opacity: 0.42;
        transform: scale(0.94);
      }
      #npc-life-char-wheel:hover {
        opacity: 1 !important;
        transform: scale(1) !important;
      }
      .npclife-char-card {
        width: 66px;
        padding: 5px 5px 6px;
        border-radius: 10px;
        background: rgba(20, 26, 38, 0.88);
        border: 1.5px solid rgba(100, 116, 139, 0.35);
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        user-select: none;
      }
      .npclife-char-card:hover {
        transform: translateY(-2px);
      }
      .npclife-char-card.active-char {
        background: rgba(30, 41, 59, 0.96);
        box-shadow: 0 0 14px rgba(56, 189, 248, 0.38);
      }
      .npclife-char-avatar {
        width: 38px;
        height: 38px;
        border-radius: 8px;
        overflow: hidden;
        position: relative;
      }
      .npclife-char-key {
        font-size: 9.5px;
        font-weight: 900;
        padding: 1px 5px;
        border-radius: 4px;
        margin-top: 3px;
        color: #0f172a;
        background: #e2e8f0;
      }
      .npclife-char-name {
        font-size: 10px;
        font-weight: 800;
        color: #f1f5f9;
        margin-top: 2px;
      }
      .npclife-mini-bars {
        width: 100%;
        height: 4px;
        background: rgba(0, 0, 0, 0.55);
        border-radius: 3px;
        margin-top: 3px;
        overflow: hidden;
      }
      .npclife-mini-bar-fill {
        height: 100%;
        width: 100%;
        transition: width 0.2s ease;
      }
      #npc-life-dossier-modal {
        position: fixed;
        inset: 0;
        background: rgba(5, 8, 15, 0.78);
        backdrop-filter: blur(7px);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 88;
        pointer-events: auto;
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      }
      .npclife-dossier-panel {
        width: min(860px, 94vw);
        max-height: 88vh;
        overflow-y: auto;
        background: linear-gradient(165deg, #0f172a 0%, #090d16 100%);
        border: 1.5px solid rgba(148, 163, 184, 0.35);
        border-radius: 18px;
        padding: 22px 24px;
        color: #f8fafc;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8);
      }
      .npclife-dossier-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(235px, 1fr));
        gap: 14px;
        margin-top: 16px;
      }
      .npclife-dossier-card {
        background: rgba(19, 27, 42, 0.92);
        border: 1.5px solid rgba(100, 116, 139, 0.35);
        border-radius: 14px;
        padding: 15px;
        display: flex;
        flex-direction: column;
        gap: 9px;
      }
      .npclife-skill-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11.5px;
        color: #cbd5e1;
      }
      .npclife-skill-track {
        width: 108px;
        height: 6px;
        background: rgba(15, 23, 42, 0.9);
        border-radius: 4px;
        overflow: hidden;
      }
      .npclife-dispatch-bar {
        margin-top: 18px;
        padding-top: 14px;
        border-top: 1px solid rgba(148, 163, 184, 0.2);
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: space-between;
        align-items: center;
      }
      .npclife-action-btn {
        padding: 9px 14px;
        border-radius: 9px;
        border: none;
        font-size: 12.5px;
        font-weight: 800;
        cursor: pointer;
        color: #090d16;
        background: #38bdf8;
        transition: filter 0.15s ease, transform 0.12s ease;
      }
      .npclife-action-btn:hover {
        filter: brightness(1.12);
        transform: translateY(-1px);
      }
    `;
    document.head.appendChild(style);
    hudDom.styleEl = style;

    const rootLayer = document.createElement('div');
    rootLayer.id = 'npc-life-hud-layer';
    document.body.appendChild(rootLayer);
    hudDom.rootLayer = rootLayer;

    // Satellite Sky-Switch Full-Screen Canvas
    const skyCanvas = document.createElement('canvas');
    skyCanvas.id = 'npc-life-skyswitch-canvas';
    document.body.appendChild(skyCanvas);
    hudDom.skyCanvas = skyCanvas;
    hudDom.skyCtx = skyCanvas.getContext('2d');

    // Pooled Speech Bubble DOM Nodes
    for (let i = 0; i < MAX_SPEECH_BUBBLES; i++) {
      const el = document.createElement('div');
      el.className = 'npclife-speech-bubble';
      rootLayer.appendChild(el);
      hudDom.bubbleEls.push(el);
    }

    // Pooled 911 Witness Countdown Nodes
    for (let i = 0; i < 3; i++) {
      const el = document.createElement('div');
      el.className = 'npclife-witness-tag';
      el.innerHTML = `
        <span>📞 911</span>
        <div class="npclife-witness-bar-wrap"><div class="npclife-witness-bar-fill"></div></div>
        <span class="npclife-witness-sec">4.0s</span>
      `;
      rootLayer.appendChild(el);
      hudDom.witnessEls.push({
        root: el,
        fill: el.querySelector('.npclife-witness-bar-fill'),
        sec: el.querySelector('.npclife-witness-sec')
      });
    }

    // Pooled Michael Bullet-Time Headshot Target Lock Diamonds
    for (let i = 0; i < MAX_TARGET_DIAMONDS; i++) {
      const el = document.createElement('div');
      el.className = 'npclife-target-diamond';
      rootLayer.appendChild(el);
      hudDom.diamondEls.push(el);
    }

    // Active Perk Status Pill & Punctured Tire Warning Pill
    const perkPill = document.createElement('div');
    perkPill.id = 'npc-life-perk-pill';
    document.body.appendChild(perkPill);
    hudDom.perkBannerEl = perkPill;

    const tirePill = document.createElement('div');
    tirePill.id = 'npc-life-tire-pill';
    document.body.appendChild(tirePill);
    hudDom.tireWarnPill = tirePill;

    // Bottom-Right 3-Protagonist Switcher Widget (disabled & detached)
    const wheel = document.createElement('div');
    wheel.id = 'npc-life-char-wheel';
    wheel.style.display = 'none';
    hudDom.charWheelEl = wheel;
    if (false) for (let i = 0; i < PROTAGONIST_ORDER.length; i++) {
      const id = PROTAGONIST_ORDER[i];
      const bp = PROTAGONIST_BLUEPRINTS[id];
      const card = document.createElement('div');
      card.className = 'npclife-char-card';
      card.title = `Chuyển sang ${bp.name} (${bp.keyBind}) — ${bp.roleTitle}`;
      card.innerHTML = `
        <div class="npclife-char-avatar">${buildProtagonistPortraitSVG(id)}</div>
        <div class="npclife-char-key" style="background:${bp.colorHex}">${bp.keyBind}</div>
        <div class="npclife-char-name">${bp.shortName}</div>
        <div class="npclife-mini-bars">
          <div class="npclife-mini-bar-fill" style="background:${bp.colorHex}"></div>
        </div>
      `;
      card.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (id === activeProtagonistKey) {
          openCharacterSelector();
        } else {
          switchProtagonist(id);
        }
      });
      wheel.appendChild(card);
      hudDom.charCardEls[id] = {
        card,
        barFill: card.querySelector('.npclife-mini-bar-fill')
      };
    }
    hudDom.charWidgetEl = wheel;

    // Full Interactive Giang Hồ 3-Character Dossier & 911 Emergency Modal
    const modal = document.createElement('div');
    modal.id = 'npc-life-dossier-modal';
    modal.addEventListener('click', (ev) => {
      if (ev.target === modal) closeCharacterSelector();
    });
    document.body.appendChild(modal);
    hudDom.dossierModalEl = modal;
  }

  function openCharacterSelector() {
    ensureNpcLifeDOM();
    if (!hudDom.dossierModalEl) return false;
    dossierModalOpen = true;
    ctx.activeModal = 'protagonist_select';
    if (document.pointerLockElement && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (_) {}
    }

    const cardsHtml = PROTAGONIST_ORDER.map((id) => {
      const st = protagonists[id];
      const bp = PROTAGONIST_BLUEPRINTS[id];
      const isCurrent = id === activeProtagonistKey;
      const zoneName =
        ctx.world?.getZoneInfo?.(st.x, st.z)?.zoneName ||
        bp.secondaryHangouts[st.hangoutIdx]?.label ||
        'Tiên Thành';

      const renderBar = (lbl, val) => `
        <div class="npclife-skill-row">
          <span>${lbl}</span>
          <div class="npclife-skill-track">
            <div style="width:${clamp(val, 0, 100)}%;height:100%;background:${bp.colorHex}"></div>
          </div>
        </div>`;

      return `
        <div class="npclife-dossier-card" style="border-color:${isCurrent ? bp.colorHex : 'rgba(100,116,139,0.35)'}">
          <div style="display:flex;align-items:center;gap:11px;">
            <div style="width:52px;height:52px;flex-shrink:0;">${buildProtagonistPortraitSVG(id)}</div>
            <div>
              <div style="font-size:15px;font-weight:900;color:${bp.colorHex}">${bp.name} [${bp.keyBind}]</div>
              <div style="font-size:11.5px;font-weight:700;color:#e2e8f0">${bp.roleTitle}</div>
              <div style="font-size:10.5px;color:#94a3b8">📍 ${zoneName}</div>
            </div>
          </div>
          <div style="font-size:11px;color:#fde047;font-weight:700;background:rgba(255,255,255,0.04);padding:6px 8px;border-radius:7px;">
            ⚡ ${bp.perkTitle}
          </div>
          ${renderBar('Kỹ năng Lái xe', st.skills.driving)}
          ${renderBar('Xạ thủ Tác chiến', st.skills.shooting)}
          ${renderBar('Thể lực & Bền bỉ', st.skills.stamina)}
          ${renderBar('Máu hiện tại', Math.round((st.hp / st.maxHp) * 100))}
          <button type="button" class="npclife-action-btn" data-switch-char="${id}" style="background:${bp.colorHex};margin-top:4px;">
            ${isCurrent ? '✓ ĐANG ĐIỀU KHIỂN' : `⚡ SKY-ZOOM SANG ${bp.shortName.toUpperCase()} (${bp.keyBind})`}
          </button>
          ${
            !isCurrent
              ? `<button type="button" class="npclife-action-btn" data-summon-buddy="${id}" style="background:#1e293b;color:${bp.colorHex};border:1px solid ${bp.colorHex};">
                  🤝 Gọi ${bp.shortName} Tới Yểm Trợ Hỏa Lực
                </button>`
              : ''
          }
        </div>
      `;
    }).join('');

    hudDom.dossierModalEl.innerHTML = `
      <div class="npclife-dossier-panel">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div>
            <div style="font-size:20px;font-weight:900;letter-spacing:0.5px;">👥 HỆ THỐNG 3 NHÂN VẬT Giang Hồ &amp; TỔNG ĐÀI KHẨN CẤP 911</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Nhấn phím tắt [F5] Franklin • [F6] Michael • [F7] Viper bất kỳ lúc nào để chuyển cảnh vệ tinh Sky-Zoom 1.8s!</div>
          </div>
          <button type="button" id="npclife-close-dossier-btn" class="npclife-action-btn" style="background:#ef4444;color:#fff;">✕ Đóng [Esc]</button>
        </div>
        <div class="npclife-dossier-grid">${cardsHtml}</div>
        <div class="npclife-dispatch-bar">
          <div style="font-size:12px;font-weight:800;color:#cbd5e1;">🚨 Điều Phối Khẩn Cấp 911 &amp; Sự Kiện Sống Động:</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            <button type="button" class="npclife-action-btn" data-dispatch-act="ambulance" style="background:#38bdf8;">🚑 Gọi Cấp Cứu EMS</button>
            <button type="button" class="npclife-action-btn" data-dispatch-act="firetruck" style="background:#f97316;color:#fff;">🚒 Gọi Xe Cứu Hỏa LFD</button>
            <button type="button" class="npclife-action-btn" data-dispatch-act="spike_test" style="background:#eab308;color:#0f172a;">⚠️ Thả Bẫy Đinh Thiên Đình Chấp Pháp</button>
            <button type="button" class="npclife-action-btn" data-dispatch-act="blue_event" style="background:#a855f7;color:#fff;">🔵 Triệu Hồi Sự Kiện Chấm Xanh</button>
          </div>
        </div>
      </div>
    `;

    hudDom.dossierModalEl.style.display = 'flex';

    const closeBtn = hudDom.dossierModalEl.querySelector('#npclife-close-dossier-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => closeCharacterSelector());
    }

    const switchBtns = hudDom.dossierModalEl.querySelectorAll('[data-switch-char]');
    switchBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-switch-char');
        closeCharacterSelector();
        if (targetId && targetId !== activeProtagonistKey) {
          switchProtagonist(targetId);
        }
      });
    });

    const buddyBtns = hudDom.dossierModalEl.querySelectorAll('[data-summon-buddy]');
    buddyBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const buddyId = btn.getAttribute('data-summon-buddy');
        closeCharacterSelector();
        if (buddyId) summonCrewBackup(buddyId);
      });
    });

    const dispatchBtns = hudDom.dossierModalEl.querySelectorAll('[data-dispatch-act]');
    dispatchBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.getAttribute('data-dispatch-act');
        closeCharacterSelector();
        if (act === 'ambulance') dispatchEmergency('ambulance');
        else if (act === 'firetruck') dispatchEmergency('firetruck');
        else if (act === 'spike_test') deploySpikeStrip();
        else if (act === 'blue_event') startDynamicBlueDotEvent(null, ctx);
      });
    });

    return true;
  }

  function closeCharacterSelector() {
    dossierModalOpen = false;
    if (hudDom.dossierModalEl) {
      hudDom.dossierModalEl.style.display = 'none';
    }
    if (ctx.activeModal === 'protagonist_select') {
      ctx.activeModal = null;
    }
  }

  // ---------------------------------------------------------------------------
  // 9B. RENDER TACTICAL SATELLITE SKY-ZOOM OVERLAY & 3D PROJECTED HUD TAGS
  // ---------------------------------------------------------------------------
  function renderSkySwitchSatelliteCanvas() {
    if (!hudDom.skyCanvas || !hudDom.skyCtx) return;

    if (!skySwitch.active) {
      if (hudDom.skyCanvas.style.display !== 'none') {
        hudDom.skyCanvas.style.display = 'none';
      }
      return;
    }

    const w = window.innerWidth || 1280;
    const h = window.innerHeight || 720;
    if (hudDom.skyCanvas.width !== w || hudDom.skyCanvas.height !== h) {
      hudDom.skyCanvas.width = w;
      hudDom.skyCanvas.height = h;
    }
    hudDom.skyCanvas.style.display = 'block';

    const g = hudDom.skyCtx;
    g.clearRect(0, 0, w, h);

    const [r, gr, b] = skySwitch.tintRGB;
    const flash = clamp(skySwitch.gridFlashAlpha, 0, 1);

    // 1. Protagonist Color-Graded Vignette & Step Tint Flash!
    const radGrad = g.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.22, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    radGrad.addColorStop(0, `rgba(${r}, ${gr}, ${b}, ${(flash * 0.16).toFixed(3)})`);
    radGrad.addColorStop(1, `rgba(${Math.round(r * 0.35)}, ${Math.round(gr * 0.35)}, ${Math.round(b * 0.35)}, ${(0.38 + flash * 0.34).toFixed(3)})`);
    g.fillStyle = radGrad;
    g.fillRect(0, 0, w, h);

    // 2. Tactical City-Grid Overlay Lines & CRT Scanlines
    const gridSpacing = 68;
    g.strokeStyle = `rgba(${r}, ${gr}, ${b}, ${(0.08 + flash * 0.24).toFixed(3)})`;
    g.lineWidth = 1;
    g.beginPath();
    for (let gx = (w * 0.5) % gridSpacing; gx < w; gx += gridSpacing) {
      g.moveTo(gx, 0);
      g.lineTo(gx, h);
    }
    for (let gy = (h * 0.5) % gridSpacing; gy < h; gy += gridSpacing) {
      g.moveTo(0, gy);
      g.lineTo(w, gy);
    }
    g.stroke();

    // 3. Center Satellite Target Reticle Brackets
    const cx = w * 0.5;
    const cy = h * 0.5;
    const boxHalf = lerp(110, 66, flash * 0.35);
    const cornerLen = 24;
    g.strokeStyle = `rgba(${r}, ${gr}, ${b}, 0.92)`;
    g.lineWidth = 2.6;
    g.beginPath();
    // Top-Left
    g.moveTo(cx - boxHalf, cy - boxHalf + cornerLen);
    g.lineTo(cx - boxHalf, cy - boxHalf);
    g.lineTo(cx - boxHalf + cornerLen, cy - boxHalf);
    // Top-Right
    g.moveTo(cx + boxHalf - cornerLen, cy - boxHalf);
    g.lineTo(cx + boxHalf, cy - boxHalf);
    g.lineTo(cx + boxHalf, cy - boxHalf + cornerLen);
    // Bottom-Left
    g.moveTo(cx - boxHalf, cy + boxHalf - cornerLen);
    g.lineTo(cx - boxHalf, cy + boxHalf);
    g.lineTo(cx - boxHalf + cornerLen, cy + boxHalf);
    // Bottom-Right
    g.moveTo(cx + boxHalf - cornerLen, cy + boxHalf);
    g.lineTo(cx + boxHalf, cy + boxHalf);
    g.lineTo(cx + boxHalf, cy + boxHalf - cornerLen);
    g.stroke();

    // 4. Live Satellite Telemetry Readout (Altitude Step 45m -> 110m -> 210m & Target Protagonist Callout!)
    g.fillStyle = `rgb(${r}, ${gr}, ${b})`;
    g.font = '900 13px monospace';
    g.textAlign = 'left';
    const altStr = String(Math.round(skySwitch.currentAltitude)).padStart(3, '0');
    const curGpsX = Math.round(lerp(skySwitch.srcX, skySwitch.dstX, skySwitch.panProgress));
    const curGpsZ = Math.round(lerp(skySwitch.srcZ, skySwitch.dstZ, skySwitch.panProgress));
    g.fillText(`SAT-LINK LOS SANTOS • ĐỘ CAO: ${altStr}M • TỌA ĐỘ (${curGpsX}, ${curGpsZ})`, cx - boxHalf, cy - boxHalf - 12);

    g.textAlign = 'center';
    g.font = '900 22px system-ui, Segoe UI, sans-serif';
    g.fillStyle = '#ffffff';
    g.fillText(skySwitch.targetNameLabel, cx, cy + boxHalf + 30);

    g.font = '700 13px system-ui, Segoe UI, sans-serif';
    g.fillStyle = `rgb(${r}, ${gr}, ${b})`;
    g.fillText(skySwitch.targetRoleLabel, cx, cy + boxHalf + 50);
  }

  function projectWorldToScreen(wx, wy, wz, cam, screenW, screenH) {
    _projVec.set(wx, wy, wz);
    _projVec.project(cam);
    if (_projVec.z > 1.0 || _projVec.z < -1.0) return null;
    return {
      x: (_projVec.x * 0.5 + 0.5) * screenW,
      y: (-_projVec.y * 0.5 + 0.5) * screenH
    };
  }

  function updateScreenSpaceNpcLifeHUD(rawDt, activeCtx = ctx) {
    ensureNpcLifeDOM();
    renderSkySwitchSatelliteCanvas();

    const p = activeCtx?.player || ctx?.player;
    const cam = getCamera(activeCtx);
    const overlayActive = Boolean(
      activeCtx.activeModal ||
      dossierModalOpen ||
      activeCtx.input?.phoneOpen ||
      activeCtx.input?.wheelOpen
    );
    const hideAll = !activeCtx.started || activeCtx.paused || overlayActive || skySwitch.active || !p || !cam;

    // 1. Update Giang Hồ 3-Protagonist Switcher Cards (positioned above #location-hud, hidden during phone/modals/pause)
    if (hudDom.charWidgetEl) {
      const showWheel = Boolean(
        activeCtx.started &&
        !activeCtx.paused &&
        !overlayActive &&
        !activeCtx.vehiclesExtra?.isCockpitView
      );
      hudDom.charWidgetEl.style.display = showWheel ? 'flex' : 'none';
      if (charWidgetVisibleTimer > 0) {
        charWidgetVisibleTimer = Math.max(0, charWidgetVisibleTimer - rawDt);
      }
      hudDom.charWidgetEl.classList.toggle('compact-dim', charWidgetVisibleTimer <= 0 && !skySwitch.active);

      for (const id of PROTAGONIST_ORDER) {
        const entry = hudDom.charCardEls[id];
        const st = protagonists[id];
        const bp = PROTAGONIST_BLUEPRINTS[id];
        if (!entry || !st) continue;
        const isCurrent = id === activeProtagonistKey;
        entry.card.classList.toggle('active-char', isCurrent);
        entry.card.style.borderColor = isCurrent ? bp.colorHex : 'rgba(100,116,139,0.35)';
        const hpPct = clamp(((isCurrent ? p.hp : st.hp) / Math.max(1, st.maxHp)) * 100, 0, 100);
        entry.barFill.style.width = `${hpPct.toFixed(0)}%`;
      }
    }

    // 2. Active Protagonist Special Ability Banner & Punctured Tire HUD Pill
    if (hudDom.perkBannerEl) {
      if (!hideAll && p.specialActive) {
        const bp = PROTAGONIST_BLUEPRINTS[activeProtagonistKey];
        hudDom.perkBannerEl.style.display = 'block';
        hudDom.perkBannerEl.style.borderColor = bp.colorHex;
        hudDom.perkBannerEl.style.color = bp.colorHex;
        hudDom.perkBannerEl.textContent = `⚡ ${bp.shortName.toUpperCase()}: ${bp.perkTitle}`;
      } else {
        hudDom.perkBannerEl.style.display = 'none';
      }
    }

    const playerCar = getPlayerVehicle(activeCtx);
    if (hudDom.tireWarnPill) {
      if (!hideAll && playerCar && playerCar.hasPuncturedTire && playerCar.tiresPoppedCount > 0) {
        hudDom.tireWarnPill.style.display = 'block';
        hudDom.tireWarnPill.textContent = `⚠️ NỔ ${playerCar.tiresPoppedCount} LỐP (-55% BÁM ĐƯỜNG) • GHÉ LSC SỬA XE`;
      } else {
        hudDom.tireWarnPill.style.display = 'none';
      }
    }

    if (hideAll) {
      for (const el of hudDom.bubbleEls) el.style.display = 'none';
      for (const w of hudDom.witnessEls) w.root.style.display = 'none';
      for (const d of hudDom.diamondEls) d.style.display = 'none';
      return;
    }

    const sw = window.innerWidth || 1280;
    const sh = window.innerHeight || 720;

    // 3. Project 3D Floating Speech Bubbles
    let bubbleRenderIdx = 0;
    for (let i = 0; i < speechBubbles.length; i++) {
      const b = speechBubbles[i];
      if (!b.active) continue;
      b.life -= rawDt;
      if (b.life <= 0) {
        b.active = false;
        continue;
      }
      if (bubbleRenderIdx >= hudDom.bubbleEls.length) continue;

      const dPlayer = dist2D(p.x, p.z, b.x, b.z);
      if (dPlayer > 34) continue;

      const scr = projectWorldToScreen(b.x, b.y, b.z, cam, sw, sh);
      if (!scr || scr.x < 40 || scr.x > sw - 40 || scr.y < 30 || scr.y > sh - 40) continue;

      const el = hudDom.bubbleEls[bubbleRenderIdx++];
      el.style.display = 'block';
      el.style.left = `${scr.x.toFixed(1)}px`;
      el.style.top = `${scr.y.toFixed(1)}px`;
      el.style.borderColor = b.accentHex;
      el.style.opacity = b.life < 0.45 ? (b.life / 0.45).toFixed(2) : '1';
      if (el.textContent !== b.text) {
        el.textContent = b.text;
      }
    }
    for (let k = bubbleRenderIdx; k < hudDom.bubbleEls.length; k++) {
      hudDom.bubbleEls[k].style.display = 'none';
    }

    // 4. Project 911 Witness Countdown Progress Bars above Witness Heads!
    let wRenderIdx = 0;
    for (let i = 0; i < activeWitnessCallers.length && wRenderIdx < hudDom.witnessEls.length; i++) {
      const wc = activeWitnessCallers[i];
      if (!wc.ped || wc.ped.dead || wc.intimidated) continue;
      const scr = projectWorldToScreen(wc.ped.x, (wc.ped.y || 0.22) + 2.02, wc.ped.z, cam, sw, sh);
      if (!scr || scr.x < 20 || scr.x > sw - 20 || scr.y < 20 || scr.y > sh - 20) continue;

      const uiW = hudDom.witnessEls[wRenderIdx++];
      const pct = clamp((wc.elapsed / wc.duration) * 100, 0, 100);
      const rem = Math.max(0, wc.duration - wc.elapsed);
      uiW.root.style.display = 'flex';
      uiW.root.style.left = `${scr.x.toFixed(1)}px`;
      uiW.root.style.top = `${scr.y.toFixed(1)}px`;
      uiW.fill.style.width = `${pct.toFixed(1)}%`;
      uiW.sec.textContent = `${rem.toFixed(1)}s`;
    }
    for (let k = wRenderIdx; k < hudDom.witnessEls.length; k++) {
      hudDom.witnessEls[k].root.style.display = 'none';
    }

    // 5. Project Michael's Bullet-Time Precision Headshot Target Diamonds!
    let dRenderIdx = 0;
    if (activeProtagonistKey === 'michael' && p.specialActive) {
      const candidates = [
        ...(activeCtx.gameplay?.cops || []),
        ...(activeCtx.gameplay?.peds || []).filter((pd) => pd && (pd.isEnemy || pd.isHostile))
      ];
      for (let i = 0; i < candidates.length && dRenderIdx < hudDom.diamondEls.length; i++) {
        const c = candidates[i];
        if (!c || c.dead || c.hp <= 0) continue;
        if (dist2D(p.x, p.z, c.x, c.z) > 62) continue;
        const scr = projectWorldToScreen(c.x, (c.y || 0.22) + 1.58, c.z, cam, sw, sh);
        if (!scr || scr.x < 20 || scr.x > sw - 20 || scr.y < 20 || scr.y > sh - 20) continue;

        const el = hudDom.diamondEls[dRenderIdx++];
        el.style.display = 'block';
        el.style.left = `${scr.x.toFixed(1)}px`;
        el.style.top = `${scr.y.toFixed(1)}px`;
      }
    }
    for (let k = dRenderIdx; k < hudDom.diamondEls.length; k++) {
      hudDom.diamondEls[k].style.display = 'none';
    }
  }

  // ---------------------------------------------------------------------------
  // 9C. ROTATING 3D-TILTED MINIMAP OVERLAY BLIPS (PROTAGONISTS, BLUE-DOT, 911, SPIKES)
  // ---------------------------------------------------------------------------
  function drawNpcLifeMinimapBlips(gameCtx = ctx) {
    if (typeof document === 'undefined') return;
    const canvas = document.querySelector('#minimap-canvas');
    const p = gameCtx?.player || ctx?.player;
    if (!canvas || !p) return;
    const c = canvas.getContext('2d');
    if (!c) return;

    const w = canvas.width || 260;
    const h = canvas.height || 186;
    const inCar = Boolean(p.inCar || p.vehicle);
    const cx = w * 0.5;
    const cy = inCar ? h * 0.60 : h * 0.52;

    const carSpd = inCar
      ? Math.hypot(p.inCar?.vx || 0, p.inCar?.vz || 0) || Math.abs(p.inCar?.speed || 0)
      : 0;
    const scale = inCar ? clamp(1.02 - carSpd * 0.008, 0.68, 1.02) : 1.22;
    const invS = 1 / scale;

    let radarRot = 0;
    const cam = getCamera(gameCtx);
    if (cam?.matrixWorld?.elements) {
      const e = cam.matrixWorld.elements;
      const fx = -e[8];
      const fz = -e[10];
      if (fx * fx + fz * fz > 0.0001) {
        radarRot = -Math.atan2(fx, -fz);
      }
    } else if (Number.isFinite(gameCtx.engine?.camYaw)) {
      radarRot = gameCtx.engine.camYaw;
    }

    const extAnchor = isPlayerInsideInterior(p) ? resolveExteriorAnchorForPlayer(p) : p;
    const px = extAnchor.x;
    const pz = extAnchor.z;
    const pulse = (Math.sin((performance.now() || 0) * 0.008) + 1) * 0.5;

    c.save();
    c.translate(cx, cy);
    c.rotate(radarRot);
    c.scale(scale, scale);
    c.translate(-px, -pz);

    // 1. Inactive Playable Protagonist Blips ('F' Emerald, 'M' Sky-Blue, 'V' Orange)
    for (let i = 0; i < PROTAGONIST_ORDER.length; i++) {
      const id = PROTAGONIST_ORDER[i];
      if (id === activeProtagonistKey) continue;
      const st = protagonists[id];
      const bp = PROTAGONIST_BLUEPRINTS[id];
      if (!st) continue;

      c.fillStyle = bp.colorHex;
      c.strokeStyle = '#080c14';
      c.lineWidth = 1.6 * invS;
      c.beginPath();
      c.arc(st.x, st.z, 5.2 * invS, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      c.save();
      c.translate(st.x, st.z);
      c.rotate(-radarRot);
      c.fillStyle = '#080c14';
      c.font = `900 ${Math.round(7.5 * invS)}px sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(bp.shortName[0], 0, 0.4 * invS);
      c.restore();
    }

    // 2. Pulsing Cyan Blue-Dot Street Event Blip & Dropped Cash Bags!
    if (blueDotEvent.active) {
      c.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      c.lineWidth = 1.8 * invS;
      c.beginPath();
      c.arc(blueDotEvent.x, blueDotEvent.z, (6.5 + pulse * 5.5) * invS, 0, Math.PI * 2);
      c.stroke();

      c.fillStyle = '#38bdf8';
      c.strokeStyle = '#ffffff';
      c.lineWidth = 1.3 * invS;
      c.beginPath();
      c.arc(blueDotEvent.x, blueDotEvent.z, 4.8 * invS, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }

    for (let i = 0; i < droppedCashLoot.length; i++) {
      const bag = droppedCashLoot[i];
      c.fillStyle = '#4ade80';
      c.strokeStyle = '#052e16';
      c.lineWidth = 1.2 * invS;
      c.beginPath();
      c.arc(bag.x, bag.z, 4.0 * invS, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }

    // 3. Active 911 Witness Caller Flashing Alert Blip
    for (let i = 0; i < activeWitnessCallers.length; i++) {
      const wc = activeWitnessCallers[i];
      if (!wc.ped || wc.ped.dead || wc.intimidated) continue;
      c.fillStyle = pulse > 0.5 ? '#ff3b30' : '#fde047';
      c.beginPath();
      c.arc(wc.ped.x, wc.ped.z, 5.2 * invS, 0, Math.PI * 2);
      c.fill();
    }

    // 4. Thiên Đình Chấp Pháp Roadblock Bàn Chông Thiên Đình Chấp Pháp Hazard Bars
    for (let i = 0; i < activeSpikeStrips.length; i++) {
      const st = activeSpikeStrips[i];
      c.save();
      c.translate(st.x, st.z);
      c.rotate(-st.yaw);
      c.strokeStyle = '#facc15';
      c.lineWidth = 2.6 * invS;
      c.beginPath();
      c.moveTo(-st.halfWidth, 0);
      c.lineTo(st.halfWidth, 0);
      c.stroke();
      c.restore();
    }

    // 5. Dispatched EMS Ambulances & LFD Fire Trucks
    for (let i = 0; i < activeAmbulances.length; i++) {
      const amb = activeAmbulances[i];
      c.fillStyle = pulse > 0.5 ? '#ffffff' : '#ef4444';
      c.beginPath();
      c.arc(amb.x, amb.z, 4.4 * invS, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < activeFireTrucks.length; i++) {
      const ft = activeFireTrucks[i];
      c.fillStyle = pulse > 0.5 ? '#ef4444' : '#fbbf24';
      c.beginPath();
      c.arc(ft.x, ft.z, 4.8 * invS, 0, Math.PI * 2);
      c.fill();
    }

    c.restore();
  }

  // ============================================================================
  // 9D. CREW WINGMAN BACKUP AI, STREET HOT-DOG VENDORS & PACIFIC BEACH YOGA
  // ============================================================================
  const crewWingmanState = {
    active: false,
    buddyId: null,
    phase: 'IDLE', // 'DRIVING_IN' | 'ESCORT_COMBAT'
    shootCooldown: 0.35,
    healTossCooldown: 0,
    banterCooldown: 0,
    durationLeft: 0
  };

  const streetVendors = [];
  const beachYogaCircle = [];
  let coastalMicroLifeBuilt = false;
  let vendorBuyCooldown = 0;

  function buildStreetHotDogCartMesh() {
    const cart = new THREE.Group();
    cart.name = 'DelPerro_HotDog_Cart';

    // Stainless steel insulated food box + red lower skirt
    const lowerSkirt = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.48, 0.84), sharedMaterials.emsRed);
    lowerSkirt.position.y = 0.44;
    lowerSkirt.castShadow = true;
    cart.add(lowerSkirt);

    const steelCounter = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.42, 0.88), sharedMaterials.chrome);
    steelCounter.position.y = 0.88;
    steelCounter.castShadow = true;
    cart.add(steelCounter);

    // Sneeze-guard glass + sizzling grill tray + ketchup/mustard squeeze bottles
    const sneezeGlass = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.34, 0.46), sharedMaterials.tintedGlass);
    sneezeGlass.position.set(-0.18, 1.24, 0.14);
    cart.add(sneezeGlass);

    const grillPlate = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.05, 0.48), sharedMaterials.darkChassis);
    grillPlate.position.set(0.42, 1.11, 0);
    cart.add(grillPlate);

    const ketchupBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.16, 10), sharedMaterials.emsRed);
    ketchupBottle.position.set(0.36, 1.18, 0.30);
    const mustardBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.16, 10), sharedMaterials.fireGold);
    mustardBottle.position.set(0.46, 1.18, 0.30);
    cart.add(ketchupBottle, mustardBottle);

    // Push handle & 2 spoked cart wheels
    const pushBar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.78, 8), sharedMaterials.chrome);
    pushBar.rotation.x = Math.PI / 2;
    pushBar.position.set(-0.82, 0.94, 0);
    cart.add(pushBar);

    for (const side of [-1, 1]) {
      const wheel = buildDetailedWheelAssembly(0.26, 0.09, false);
      wheel.pivot.position.set(0.08, 0.26, side * 0.48);
      wheel.pivot.rotation.y = Math.PI / 2;
      cart.add(wheel.pivot);
    }

    // Striped Red & Gold Beach Umbrella Canopy above cart
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 1.56, 10), sharedMaterials.chrome);
    pole.position.set(-0.10, 1.78, 0);
    cart.add(pole);

    const canopyGroup = new THREE.Group();
    canopyGroup.position.set(-0.10, 2.48, 0);
    const wedgeCount = 8;
    for (let w = 0; w < wedgeCount; w++) {
      const a0 = (w / wedgeCount) * Math.PI * 2;
      const sliceGeo = new THREE.ConeGeometry(1.22, 0.42, 3, 1, false, a0, (Math.PI * 2) / wedgeCount);
      const sliceMesh = new THREE.Mesh(
        sliceGeo,
        w % 2 === 0 ? sharedMaterials.emsRed : sharedMaterials.fireGold
      );
      canopyGroup.add(sliceMesh);
    }
    cart.add(canopyGroup);
    cart.userData.canopyGroup = canopyGroup;
    return cart;
  }

  function ensureCoastalVendorsAndYogaBuilt(activeCtx = ctx) {
    if (coastalMicroLifeBuilt) return;
    const charSys = activeCtx?.characters || ctx?.characters;
    if (!charSys || typeof charSys.createHumanoid !== 'function') return;
    coastalMicroLifeBuilt = true;
    ensureSceneRootAttached(activeCtx);

    // 1. Two Interactive Hot-Dog & Cold Soda Street Carts (Pier & Boulevard)
    const vendorSpecs = [
      {
        id: 'vendor_pier',
        x: -198.0,
        y: 3.8,
        z: 6.0,
        yaw: 0.0,
        label: 'Quầy Ẩm Thực Cầu Cảng Bồng Lai'
      },
      {
        id: 'vendor_boulevard',
        x: 28.4,
        y: 0.22,
        z: 6.5,
        yaw: Math.PI / 2,
        label: 'Xe Đồ Ăn Nhanh Đại Lộ Bồng Lai'
      }
    ];

    for (let i = 0; i < vendorSpecs.length; i++) {
      const vs = vendorSpecs[i];
      const gy = sampleGroundY(vs.x, vs.z, 0.22, activeCtx);
      const cartMesh = buildStreetHotDogCartMesh();
      cartMesh.position.set(vs.x, gy, vs.z);
      cartMesh.rotation.y = vs.yaw;
      npcLifeRoot.add(cartMesh);

      const chefRig = charSys.createHumanoid('road_worker');
      if (chefRig.parts) {
        if (chefRig.parts.hardhatGroup) chefRig.parts.hardhatGroup.visible = false;
        if (chefRig.parts.baseballCapGroup) chefRig.parts.baseballCapGroup.visible = true;
        if (chefRig.parts.hiVisGroup) chefRig.parts.hiVisGroup.visible = false;
      }
      charSys.equipWeapon?.(chefRig, 'unarmed');
      const chefMesh = chefRig.root || chefRig;
      const chefX = vs.x - Math.sin(vs.yaw) * 0.92;
      const chefZ = vs.z - Math.cos(vs.yaw) * 0.92;
      chefMesh.position.set(chefX, gy, chefZ);
      chefMesh.rotation.y = vs.yaw;
      npcLifeRoot.add(chefMesh);

      streetVendors.push({
        ...vs,
        y: gy,
        cartMesh,
        chefRig,
        chefMesh,
        steamTimer: randRange(0.2, 0.8),
        barkTimer: randRange(3.5, 7.0)
      });
    }

    // 2. Pacific Beach Sand Yoga & Stretching Group (-158, -38)
    const yogaCenter = { x: -158.0, z: -38.0 };
    const matColors = [0xec4899, 0x06b6d4, 0xa855f7, 0x10b981];
    const offsets = [
      { dx: 0, dz: 0, yaw: Math.PI / 2, outfit: 'female_jogger', isInstructor: true },
      { dx: 2.6, dz: -1.8, yaw: -Math.PI / 2, outfit: 'beach_jogger', isInstructor: false },
      { dx: 2.6, dz: 0.0, yaw: -Math.PI / 2, outfit: 'female_beach', isInstructor: false },
      { dx: 2.6, dz: 1.8, yaw: -Math.PI / 2, outfit: 'beach_surfer', isInstructor: false }
    ];

    for (let i = 0; i < offsets.length; i++) {
      const o = offsets[i];
      const yx = yogaCenter.x + o.dx;
      const yz = yogaCenter.z + o.dz;
      const yy = sampleGroundY(yx, yz, 0.08, activeCtx);

      const yogaMatMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.018, 1.76),
        new THREE.MeshStandardMaterial({ color: matColors[i], roughness: 0.82 })
      );
      yogaMatMesh.position.set(yx, yy + 0.012, yz);
      yogaMatMesh.rotation.y = o.yaw;
      npcLifeRoot.add(yogaMatMesh);

      const rig = charSys.createHumanoid(o.outfit);
      charSys.equipWeapon?.(rig, 'unarmed');
      const mesh = rig.root || rig;
      mesh.position.set(yx, yy + 0.02, yz);
      mesh.rotation.y = o.yaw;
      npcLifeRoot.add(mesh);

      beachYogaCircle.push({
        x: yx,
        y: yy,
        z: yz,
        yaw: o.yaw,
        isInstructor: o.isInstructor,
        rig,
        mesh,
        yogaMatMesh
      });
    }
  }

  function updateCoastalVendorsAndBeachYoga(dt, activeCtx = ctx) {
    ensureCoastalVendorsAndYogaBuilt(activeCtx);
    const p = activeCtx?.player || ctx?.player;
    if (!p || isPlayerInsideInterior(p)) return;
    const clock = activeCtx.elapsed || 0;
    const playerCar = getPlayerVehicle(activeCtx);

    if (vendorBuyCooldown > 0) vendorBuyCooldown -= dt;

    // 1. Update Street Hot-Dog Carts & $10 Health Snack Interaction!
    for (let i = 0; i < streetVendors.length; i++) {
      const v = streetVendors[i];
      const d = dist2D(p.x, p.z, v.x, v.z);
      const vis = d < 95;
      v.cartMesh.visible = vis;
      v.chefMesh.visible = vis;
      if (!vis) continue;

      activeCtx.characters?.animateHumanoid?.(v.chefRig, 'idle', dt);
      if (v.cartMesh.userData?.canopyGroup) {
        v.cartMesh.userData.canopyGroup.rotation.y = Math.sin(clock * 0.7 + i) * 0.06;
      }

      if (d < 26) {
        v.steamTimer -= dt;
        if (v.steamTimer <= 0) {
          v.steamTimer = 0.65;
          spawnExtinguishSteamPuff(v.x, v.y + 1.15, v.z);
        }

        v.barkTimer -= dt;
        if (v.barkTimer <= 0) {
          v.barkTimer = randRange(7.5, 12.0);
          spawnFloatingSpeechBubble(
            `vendor_${v.id}`,
            v.chefMesh.position.x,
            v.y + 2.15,
            v.chefMesh.position.z,
            '"Xúc xích nướng & Soda mát lạnh Bồng Lai chỉ $10 — hồi phục thể lực tức thì đây!"',
            '#fb923c',
            3.4
          );
        }
      }

      if (!playerCar && d < 3.4 && Math.abs(p.y - v.y) < 1.8 && vendorBuyCooldown <= 0) {
        activeCtx.ui?.showPrompt?.('Nhấn [G] mua Xúc xích nướng Bồng Lai ($10 • +45 Máu)');
        if (localKeyJustPressed.KeyG) {
          if (getPlayerCash(activeCtx) >= 10) {
            vendorBuyCooldown = 2.4;
            addPlayerCash(-10, true, activeCtx);
            const maxHp = p.maxHp || 100;
            p.hp = Math.min(maxHp, (p.hp || 100) + 45);
            activeCtx.audio?.playPickup?.();
            spawnFloatingSpeechBubble(
              `vendor_${v.id}`,
              v.chefMesh.position.x,
              v.y + 2.15,
              v.chefMesh.position.z,
              '"Chúc quý khách ngon miệng! Nóng giòn đúng vị bờ biển Cali luôn!"',
              '#4ade80',
              3.2
            );
            activeCtx.ui?.showNotification?.('🌭 Đã thưởng thức Xúc xích nướng Bồng Lai (-$10 • Hồi +45 Máu)!', 2.8);
          }
        }
      }
    }

    // 2. Update Synchronized Pacific Beach Yoga Group
    for (let i = 0; i < beachYogaCircle.length; i++) {
      const yg = beachYogaCircle[i];
      const d = dist2D(p.x, p.z, yg.x, yg.z);
      const vis = d < 92;
      yg.mesh.visible = vis;
      yg.yogaMatMesh.visible = vis;
      if (!vis) continue;

      activeCtx.characters?.animateHumanoid?.(yg.rig, 'idle', dt);
      const j = yg.rig?.joints;
      if (j) {
        // Smooth Sun-Salutation -> Tree Pose -> Warrior Stretch 12s cycle!
        const phase = (clock * 0.65) % (Math.PI * 2);
        const lift = (Math.sin(phase) + 1) * 0.5;
        j.pelvis.position.y = lerp(0.84, 0.94, lift);
        j.spine.rotation.x = lerp(0.18, -0.14, lift);
        j.shoulderL.rotation.set(lerp(-0.4, -2.65, lift), 0.15, lerp(0.25, 0.08, lift));
        j.elbowL.rotation.x = lerp(-0.6, -0.15, lift);
        j.shoulderR.rotation.set(lerp(-0.4, -2.65, lift), -0.15, lerp(-0.25, -0.08, lift));
        j.elbowR.rotation.x = lerp(-0.6, -0.15, lift);
        j.hipR.rotation.z = lerp(0, -0.32, lift);
        j.kneeR.rotation.x = lerp(0.1, 0.85, lift);
      }

      if (yg.isInstructor && d < 18 && Math.floor(clock) % 9 === 0) {
        spawnFloatingSpeechBubble(
          'beach_yoga_inst',
          yg.x,
          yg.y + 2.15,
          yg.z,
          '"Hít sâu gió biển Thái Bình Dương... Vương vai đón nắng mới nào cả lớp!"',
          '#ec4899',
          2.6
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 9E. SUMMON CREW BACKUP WINGMAN AI (CALL FRANKLIN / MICHAEL / VIPER TO FIGHT!)
  // ---------------------------------------------------------------------------
  function summonCrewBackup(requestedId = null) {
    const p = ctx.player;
    if (!p || isPlayerInsideInterior(p)) return false;

    let buddyId = requestedId ? resolveProtagonistId(requestedId) : null;
    if (!buddyId || buddyId === activeProtagonistKey) {
      buddyId = PROTAGONIST_ORDER.find((id) => id !== activeProtagonistKey) || 'viper';
    }

    const st = protagonists[buddyId];
    const bp = PROTAGONIST_BLUEPRINTS[buddyId];
    if (!st) return false;

    ensureSceneRootAttached(ctx);
    const rig = ensureInactiveProtagonistAvatar(st, ctx);
    if (!rig || !st.npcMesh) return false;

    // Position crewmate 16m down the road & equip their signature combat rifle/SMG/shotgun!
    const arriveAngle = (p.yaw || 0) + Math.PI + randRange(-0.4, 0.4);
    st.x = p.x + Math.sin(arriveAngle) * 15.0;
    st.z = p.z + Math.cos(arriveAngle) * 15.0;
    ctx.world?.resolveCircleAABB?.(st, 0.48);
    st.y = sampleGroundY(st.x, st.z, 0.22, ctx);
    st.npcMesh.visible = true;
    st.npcMesh.position.set(st.x, st.y, st.z);

    if (st.phoneProp) st.phoneProp.visible = false;
    if (st.coffeeProp) st.coffeeProp.visible = false;
    ctx.characters?.equipWeapon?.(rig, bp.defaultWeapon);

    crewWingmanState.active = true;
    crewWingmanState.buddyId = buddyId;
    crewWingmanState.phase = 'ESCORT_COMBAT';
    crewWingmanState.durationLeft = 95.0;
    crewWingmanState.shootCooldown = 0.25;
    crewWingmanState.healTossCooldown = 0;

    ctx.ui?.showNotification?.(
      `🤝 ${bp.name} đã mang ${bp.defaultWeapon.toUpperCase()} tới sát cánh yểm trợ hỏa lực cho bạn!`,
      4.0
    );
    spawnFloatingSpeechBubble(
      `wingman_${buddyId}`,
      st.x,
      st.y + 2.18,
      st.z,
      `"${bp.shortName} có mặt! Tụi nào động vào anh em mình là tới số!"`,
      bp.colorHex,
      3.8
    );
    return true;
  }

  function dismissCrewBackup() {
    if (!crewWingmanState.active) return;
    const st = protagonists[crewWingmanState.buddyId];
    if (st?.npcRig) {
      ctx.characters?.equipWeapon?.(st.npcRig, 'unarmed');
    }
    crewWingmanState.active = false;
    crewWingmanState.buddyId = null;
    crewWingmanState.phase = 'IDLE';
  }

  function updateCrewBackupWingmanAI(dt, activeCtx = ctx) {
    if (!crewWingmanState.active || !crewWingmanState.buddyId) return;
    if (crewWingmanState.buddyId === activeProtagonistKey) {
      dismissCrewBackup();
      return;
    }

    const p = activeCtx?.player || ctx?.player;
    const st = protagonists[crewWingmanState.buddyId];
    const bp = PROTAGONIST_BLUEPRINTS[crewWingmanState.buddyId];
    if (!p || !st || !st.npcRig || !st.npcMesh) {
      dismissCrewBackup();
      return;
    }

    crewWingmanState.durationLeft -= dt;
    if (crewWingmanState.durationLeft <= 0 || isPlayerInsideInterior(p)) {
      dismissCrewBackup();
      return;
    }

    if (crewWingmanState.healTossCooldown > 0) crewWingmanState.healTossCooldown -= dt;
    if (crewWingmanState.banterCooldown > 0) crewWingmanState.banterCooldown -= dt;

    st.npcMesh.visible = true;
    if (st.phoneProp) st.phoneProp.visible = false;
    if (st.coffeeProp) st.coffeeProp.visible = false;

    // 1. Emergency Crewmate Medkit/Armor Toss if player HP drops below 45%!
    if ((p.hp || 100) < 48 && crewWingmanState.healTossCooldown <= 0) {
      crewWingmanState.healTossCooldown = 22.0;
      p.hp = Math.min(p.maxHp || 100, (p.hp || 50) + 40);
      p.armor = Math.min(100, (p.armor || 0) + 35);
      activeCtx.audio?.playPickup?.();
      spawnFloatingSpeechBubble(
        `wingman_heal`,
        st.x,
        st.y + 2.18,
        st.z,
        `"Cầm lấy túi cứu thương & giáp dự phòng đi người anh em! Đứng vững lên!"`,
        '#4ade80',
        3.5
      );
      activeCtx.ui?.showNotification?.(`🩹 ${bp.shortName} vừa tiếp tế +40 Máu & +35 Áo Giáp cho bạn!`, 3.0);
    }

    // 2. Follow Player in Tactical Wingman Formation
    const flankX = p.x + Math.cos(p.yaw || 0) * 2.8 - Math.sin(p.yaw || 0) * 2.2;
    const flankZ = p.z - Math.sin(p.yaw || 0) * 2.8 - Math.cos(p.yaw || 0) * 2.2;
    const dFlank = dist2D(st.x, st.z, flankX, flankZ);

    // Teleport catch-up if player sped far ahead in a supercar (> 55m)
    if (dFlank > 55) {
      st.x = flankX;
      st.z = flankZ;
    } else if (dFlank > 2.6) {
      const moveSpd = dFlank > 9.0 ? 8.8 : 5.2;
      const moveYaw = Math.atan2(flankX - st.x, flankZ - st.z);
      st.yaw = dampAngle(st.yaw, moveYaw, 10.0, dt);
      st.x += ((flankX - st.x) / dFlank) * moveSpd * dt;
      st.z += ((flankZ - st.z) / dFlank) * moveSpd * dt;
      activeCtx.world?.resolveCircleAABB?.(st, 0.42);
    }

    st.y = sampleGroundY(st.x, st.z, 0.22, activeCtx);

    // 3. Scan for Nearest Hostile Enemy or Pursuing Thiên Đình Chấp Pháp Officer within 42m & Open Fire!
    let nearestHostile = null;
    let bestHostileDist = 42.0;

    const cops = activeCtx.gameplay?.cops || [];
    if ((activeCtx.gameplay?.wanted?.stars || 0) >= 1) {
      for (let i = 0; i < cops.length; i++) {
        const c = cops[i];
        if (!c || c.dead || c.hp <= 0) continue;
        const d = dist2D(st.x, st.z, c.x, c.z);
        if (d < bestHostileDist) {
          bestHostileDist = d;
          nearestHostile = c;
        }
      }
    }

    const peds = activeCtx.gameplay?.peds || [];
    for (let i = 0; i < peds.length; i++) {
      const pd = peds[i];
      if (!pd || pd.dead || pd.hp <= 0 || (!pd.isEnemy && !pd.isHostile)) continue;
      const d = dist2D(st.x, st.z, pd.x, pd.z);
      if (d < bestHostileDist) {
        bestHostileDist = d;
        nearestHostile = pd;
      }
    }

    let animMode = dFlank > 6.5 ? 'sprint' : dFlank > 2.6 ? 'run' : 'idle';
    if (nearestHostile) {
      st.yaw = dampAngle(st.yaw, Math.atan2(nearestHostile.x - st.x, nearestHostile.z - st.z), 14.0, dt);
      animMode = bp.defaultWeapon === 'smg' ? 'aim_1h' : 'aim_2h';

      crewWingmanState.shootCooldown -= dt;
      if (crewWingmanState.shootCooldown <= 0) {
        crewWingmanState.shootCooldown = bp.defaultWeapon === 'shotgun' ? 0.62 : 0.22;
        nearestHostile.hp = Math.max(0, (nearestHostile.hp || 60) - (bp.defaultWeapon === 'shotgun' ? 32 : 16));
        spawnRimGrindingSparks(nearestHostile.x, (nearestHostile.y || 0.22) + 1.15, nearestHostile.z, 0, 0, 2);
        activeCtx.audio?.playWeaponShot?.(bp.defaultWeapon, 0.35);

        if (crewWingmanState.banterCooldown <= 0) {
          crewWingmanState.banterCooldown = 11.0;
          spawnFloatingSpeechBubble(
            `wingman_fire`,
            st.x,
            st.y + 2.18,
            st.z,
            `"${bp.shortName}: Hạ thêm một mục tiêu! Cứ tiến lên đi!"`,
            bp.colorHex,
            2.6
          );
        }
      }
    }

    st.npcMesh.position.set(st.x, st.y, st.z);
    st.npcMesh.rotation.set(0, st.yaw, 0);
    activeCtx.characters?.animateHumanoid?.(st.npcRig, animMode, dt);
  }

  // ============================================================================
  // 10. PEER MODULE HOOKS, KEYBOARD BINDINGS (F5/F6/F7), INIT & MAIN UPDATE
  // ============================================================================
  function installPeerHooks(activeCtx = ctx) {
    // 1. Keyboard Listener for F5 / F6 / F7 (preventing browser F5 reload!), G, and Escape
    if (!keyboardHookInstalled && typeof window !== 'undefined') {
      keyboardHookInstalled = true;
      window.addEventListener(
        'keydown',
        (ev) => {
          const code = ev.code;
          if (!localKeyHeld[code]) {
            localKeyJustPressed[code] = true;
          }
          localKeyHeld[code] = true;

          if ((code === 'Escape' || ev.key === 'Escape') && dossierModalOpen) {
            ev._modalWasOpenAtCapture = true;
            ev.preventDefault();
            ev.stopPropagation();
            closeCharacterSelector();
          }
        },
        { capture: true }
      );

      window.addEventListener('keyup', (ev) => {
        localKeyHeld[ev.code] = false;
      });
    }

    // 2. Wrap `ctx.engine.updateCamera` so 1.8s Sky-Switch Camera Sequence never fights chase camera!
    const eng = activeCtx?.engine || ctx?.engine;
    if (eng && typeof eng.updateCamera === 'function' && !engineCameraHookInstalled) {
      engineCameraHookInstalled = true;
      const origUpdateCamera = eng.updateCamera.bind(eng);
      eng.updateCamera = function wrappedUpdateCamera(dtArg, ctxArg) {
        if (skySwitch.active) {
          if (updateSkySwitchCameraOverride(dtArg, ctxArg || activeCtx)) {
            return;
          }
        }
        return origUpdateCamera(dtArg, ctxArg);
      };
    }

    // 3. Wrap `ctx.vehicles.repairAndRespray` so LSC repairs punctured tires & rim-grinding sparks!
    const vSys = activeCtx?.vehicles || ctx?.vehicles;
    if (vSys && typeof vSys.repairAndRespray === 'function' && !vehicleRepairHookInstalled) {
      vehicleRepairHookInstalled = true;
      const origRepair = vSys.repairAndRespray.bind(vSys);
      vSys.repairAndRespray = function wrappedRepairAndRespray(targetCar, customColor) {
        const car = targetCar || activeCtx?.player?.inCar || ctx?.player?.inCar;
        if (car) restoreVehiclePuncturedTires(car);
        return origRepair(targetCar, customColor);
      };
    }

    // 4. Wrap `ctx.shops.applyCarMods` when available so LSC tuning / Bulletproof Tires also fixes flats!
    const shops = activeCtx?.shops || ctx?.shops;
    if (shops && typeof shops.applyCarMods === 'function' && !shopsModHookInstalled) {
      shopsModHookInstalled = true;
      const origApplyMods = shops.applyCarMods.bind(shops);
      shops.applyCarMods = function wrappedApplyCarMods(carArg, modsArg, ...rest) {
        const res = origApplyMods(carArg, modsArg, ...rest);
        const car = carArg || activeCtx?.player?.inCar || ctx?.player?.inCar;
        if (car) restoreVehiclePuncturedTires(car);
        return res;
      };
    }

    // 5. Wrap `ctx.ui.updateHUD` / `ctx.ui.update` so Minimap Blips draw cleanly atop the radar!
    const ui = activeCtx?.ui || ctx?.ui;
    if (ui && typeof ui.updateHUD === 'function' && !uiMinimapHookInstalled) {
      uiMinimapHookInstalled = true;
      const origUpdateHUD = ui.updateHUD.bind(ui);
      const patchedHUD = function wrappedUpdateHUD(rawDtArg, gameCtxArg) {
        const out = origUpdateHUD(rawDtArg, gameCtxArg);
        drawNpcLifeMinimapBlips(gameCtxArg || activeCtx);
        return out;
      };
      ui.updateHUD = patchedHUD;
      ui.update = patchedHUD;
      ui.updateUI = patchedHUD;
    }

    // 6. Wrap `ctx.gameplay.triggerPhoneAction` for 911 Dispatch!
    const gp = activeCtx?.gameplay || ctx?.gameplay;
    if (gp && typeof gp.triggerPhoneAction === 'function' && !phoneActionHookInstalled) {
      phoneActionHookInstalled = true;
      const origTriggerPhone = gp.triggerPhoneAction.bind(gp);
      gp.triggerPhoneAction = function wrappedTriggerPhoneAction(actionId, ...rest) {
        const key = String(actionId || '').trim().toLowerCase();
        if (key === '911_ems' || key === 'call_ambulance') return Boolean(dispatchEmergency('ambulance'));
        if (key === '911_fire' || key === 'call_firetruck') return Boolean(dispatchEmergency('firetruck'));
        return origTriggerPhone(actionId, ...rest);
      };
    }
  }

  function init(ctxArg) {
    const activeCtx = ctxArg && typeof ctxArg === 'object' ? ctxArg : ctx;
    ensureSceneRootAttached(activeCtx);
    ensureFXPoolsInitialized();
    ensureNpcLifeDOM();
    installPeerHooks(activeCtx);

    if (!isInitialized) {
      isInitialized = true;
      ensureStreetBuskersSpawned(activeCtx);
      ensureCoastalVendorsAndYogaBuilt(activeCtx);
    }

    return api;
  }

  function update(arg0, arg1, arg2) {
    let activeCtx = ctx;
    if (arg2 && typeof arg2 === 'object') activeCtx = arg2;
    else if (arg1 && typeof arg1 === 'object') activeCtx = arg1;

    if (!isInitialized) {
      init(activeCtx);
    } else {
      ensureSceneRootAttached(activeCtx);
      installPeerHooks(activeCtx);
    }

    const scale = Math.max(0.05, Number(activeCtx?.timeScale) || 1.0);
    const dt = clamp(Number(arg0) || 0.016, 0.0005, 0.1);
    const rawDt =
      typeof arg1 === 'number' && Number.isFinite(arg1) && arg1 > 0
        ? clamp(arg1, 0.0005, 0.12)
        : clamp(dt / scale, 0.0005, 0.12);

    const inp = activeCtx?.input || ctx?.input;
    if (inp) {
      if (inp.secondaryInteractJustPressed || inp.interactGJustPressed || inp.shopInteractJustPressed) {
        localKeyJustPressed.KeyG = true;
      }
    }

    // Emergency ambulances & firetrucks disabled to prevent road clutter and clipping
    const waterAudioLevel = 0;

    const { playerRimGrindIntensity, playerRimSpeedNorm } = updateSpikeStripsAndPuncturedTires(dt, activeCtx);
    updateSwatFastRopeInsertions(dt, activeCtx);
    updateTacticalPoliceCruiserCover(dt, activeCtx);

    updateHypercarPaparazziCitizens(dt, activeCtx);
    // Cheerful Ambient Street Chatter & Lively City Atmosphere around the player
    if (!api._chatterTimer) api._chatterTimer = 1.2;
    api._chatterTimer -= dt;
    if (api._chatterTimer <= 0 && activeCtx?.player && Array.isArray(activeCtx.gameplay?.peds)) {
      api._chatterTimer = 1.8 + Math.random() * 1.6;
      const pl = activeCtx.player;
      const peds = activeCtx.gameplay.peds;
      const CHEERFUL_LINES = [
        '🌸 Hoa đào hôm nay nở rộ đẹp quá!',
        '⚔️ Đại hiệp đi đâu vội thế, ghé Túy Tiên Lâu làm chén trà nhé!',
        '🎶 Phố xá Đại Lộ Chu Tước hôm nay nhộn nhịp thật!',
        '🏎️ Chiến xa kia bóng loáng quá, đúng là bậc hào kiệt!',
        '🏮 Tối nay hội đèn lồng bên bờ biển Bồng Lai đông vui lắm đấy!',
        '🍵 Nghe nói Luyện Khí Các mới về nhiều đồ độ xịn lắm!',
        '😄 Chào đại hiệp! Chúc huynh một ngày hành tẩu thuận lợi!',
        '🌊 Gió biển Bồng Lai mát rượi, dạo phố thật thích!',
        '🥟 Bánh bao nóng hổi đây, mời các vị hào kiệt ghé qua!',
        '🔥 Nghe đồn sắp có giải đua xe náo nhiệt lắm!'
      ];
      let shown = 0;
      const startIdx = Math.floor(Math.random() * peds.length);
      for (let pi = 0; pi < peds.length && shown < 2; pi++) {
        const pd = peds[(pi + startIdx) % peds.length];
        if (!pd || pd.dead || pd.hp <= 0 || pd.isEnemy || pd.state === 'flee') continue;
        const d = dist2D(pd.x, pd.z, pl.x, pl.z);
        if (d > 3.0 && d < 26.0) {
          const line = CHEERFUL_LINES[Math.floor(Math.random() * CHEERFUL_LINES.length)];
          spawnFloatingSpeechBubble(`street_cheer_${(pi + startIdx) % 6}`, pd.x, (pd.y || 0.22) + 2.15, pd.z, line, '#fde68a', 3.2);
          shown++;
        }
      }
    }
    updateWitness911Callers(dt, activeCtx);
    updateStreetBuskers(dt, activeCtx);
    updateCoastalVendorsAndBeachYoga(dt, activeCtx);
    updateCrewBackupWingmanAI(dt, activeCtx);
    updateDynamicBlueDotEvents(dt, activeCtx);

    updateNpcLifeWorldFX(dt, activeCtx);
    synthAudio.updateContinuousLoops(waterAudioLevel, playerRimGrindIntensity, playerRimSpeedNorm);
    updateScreenSpaceNpcLifeHUD(rawDt, activeCtx);

    // Clear local edge-triggered key flags at end of frame
    for (const k of Object.keys(localKeyJustPressed)) {
      localKeyJustPressed[k] = false;
    }
  }

  // ============================================================================
  // PUBLIC MODULE API (`ctx.npcLife`)
  // ============================================================================
  const api = {
    init,
    update,
    updateNpcLife: update,
    switchProtagonist,
    summonCrewBackup,
    dismissCrewBackup,
    openCharacterSelector,
    closeCharacterSelector,
    deploySpikeStrip,
    dispatchEmergency,
    startDynamicBlueDotEvent,
    restoreVehiclePuncturedTires,
    protagonists,
    get activeProtagonist() {
      return activeProtagonistKey;
    },
    set activeProtagonist(val) {
      switchProtagonist(val, { instant: true });
    },
    get activeProtagonistData() {
      return protagonists[activeProtagonistKey];
    },
    get isSkySwitching() {
      return skySwitch.active;
    },
    state: {
      skySwitch,
      ambulances: activeAmbulances,
      fireTrucks: activeFireTrucks,
      spikeStrips: activeSpikeStrips,
      fastRopes: activeFastRopeInsertions,
      witnessCallers: activeWitnessCallers,
      buskers: streetBuskers,
      streetVendors,
      beachYogaCircle,
      crewWingmanState,
      blueDotEvent
    }
  };

  if (ctx && typeof ctx === 'object') {
    ctx.npcLife = api;
  }

  return api;
}
