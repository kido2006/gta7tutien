// ============================================================================
// GIANG HỒ ĐẠI LỘ & BỜ BIỂN 3D — TRƯỜNG ĐUA TỬ THẦN (COMBAT DEATH RACE ARENA)
// 4 Xe Chiến Đấu ($10k / $1M / $10M / $100M) • Sảnh Chờ 7 Tay Đua • AI Bot 1.1x
// Cá Cược Về Nhất (x5) • 2 Map Khổng Lồ Nhiều Chướng Ngại Vật + Bình Chọn Map
// ============================================================================

export function createRaceArenaSystem(ctx, THREE) {
  const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const wrapAngle = (a) => {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  };
  const randRange = (min, max) => min + Math.random() * (max - min);

  const STORAGE_KEY = 'giangho_race_arena_v1';
  const ARENA_ORIGIN_X = 2600;
  const ARENA_ORIGIN_Z = 2600;
  const ENTRANCE_POS = { x: 25.6, y: 0.22, z: 80.0 };
  const ENTRY_FEE = 50_000;
  const PRIZES = { 1: 500_000, 2: 200_000, 3: 100_000 };
  const MAX_RACERS = 7;
  const TOTAL_LAPS = 2;

  // ==========================================================================
  // 1. DANH MỤC XE ĐUA CHIẾN ĐẤU ($10k / $1M / $10M / $100M + Xe Tập Miễn Phí)
  // ==========================================================================
  const RACE_CAR_CATALOG = [
    {
      id: 'race_free',
      name: 'Xe Tập Đua Đường Phố',
      price: 0,
      hp: 550,
      maxSpeed: 33,
      accel: 24,
      ramPower: 1.0,
      color: 0x64748b,
      accent: 0xe2e8f0,
      skillId: 'turbo_ram',
      skillName: 'Cản Húc Nitro',
      skillIcon: '💨',
      skillCd: 3.5,
      skillDesc: 'Xe mượn miễn phí • Tăng tốc ngắn + húc đối thủ nhẹ.'
    },
    {
      id: 'race_10k',
      name: 'Bão Thép V8 (Steel Storm)',
      price: 10_000,
      hp: 950,
      maxSpeed: 38,
      accel: 28,
      ramPower: 1.25,
      color: 0xd97706,
      accent: 0xfef08a,
      skillId: 'gatling',
      skillName: 'Súng Máy Gatling Đôi',
      skillIcon: '🔫',
      skillCd: 2.4,
      skillDesc: '950 HP cực lì đòn • Xả liên thanh súng máy đôi phía trước (140 sát thương) + húc văng xe!'
    },
    {
      id: 'race_1m',
      name: 'Hỏa Long Turbo (Fire Dragon)',
      price: 1_000_000,
      hp: 1850,
      maxSpeed: 45,
      accel: 34,
      ramPower: 1.45,
      color: 0xdc2626,
      accent: 0xf97316,
      skillId: 'missile',
      skillName: 'Tên Lửa Tầm Nhiệt',
      skillIcon: '🚀',
      skillCd: 3.4,
      skillDesc: '1,850 HP • Bắn Tên Lửa Tầm Nhiệt tự khóa mục tiêu phía trước nổ 320 sát thương + bứt tốc lửa!'
    },
    {
      id: 'race_10m',
      name: 'Lôi Thần Hypercar (Thunder God)',
      price: 10_000_000,
      hp: 3600,
      maxSpeed: 53,
      accel: 42,
      ramPower: 1.75,
      color: 0x0284c7,
      accent: 0x38bdf8,
      skillId: 'emp_lightning',
      skillName: 'Xung Điện EMP & Sét Lan',
      skillIcon: '⚡',
      skillCd: 4.2,
      skillDesc: '3,600 HP • Phóng sóng EMP 55m gây 460 sát thương + làm TÊ LIỆT động cơ đối thủ 2.6s!'
    },
    {
      id: 'race_100m',
      name: 'Thiên Đế Chiến Xa Ω (Omega)',
      price: 100_000_000,
      hp: 7200,
      maxSpeed: 62,
      accel: 52,
      ramPower: 2.35,
      color: 0x7c3aed,
      accent: 0xfacc15,
      skillId: 'orbital_omega',
      skillName: 'Pháo Quỹ Đạo & Giáp Bất Hoại',
      skillIcon: '☄️',
      skillCd: 4.8,
      skillDesc: '7,200 HP bất khả chiến bại • Bắn 3 tia Pháo Quỹ Đạo (720 dmg) + Khiên Hoàng Kim 3.5s húc bay tất cả!'
    }
  ];

  // ==========================================================================
  // 2. HAI MAP ĐUA KHỔNG LỒ NHIỀU CHƯỚNG NGẠI VẬT (CHO NGƯỜI CHƠI VOTE)
  // ==========================================================================
  const RACE_MAPS = [
    {
      id: 'canyon_death',
      name: '🌋 Hẻm Núi Tử Thần',
      subtitle: '2.4 km/vòng • 38 chướng ngại vật • Đá chắn, thùng nổ, bệ phóng & cua gắt!',
      skyColor: 0x2b120e,
      groundColor: 0x5c2d1e,
      roadColor: 0x24262b,
      railColor: 0xf97316,
      roadWidth: 25,
      controlPoints: [
        [0, 0], [115, -10], [215, -75], [275, -180], [235, -300], [120, -355],
        [-25, -320], [-115, -385], [-240, -345], [-285, -225], [-215, -110], [-140, -20]
      ],
      obstacleCount: 38
    },
    {
      id: 'cyber_skyway',
      name: '🌃 Cao Tốc Không Gian Neon',
      subtitle: '2.8 km/vòng • 44 chướng ngại vật • Cổng laser di động, slalom cao tốc & chuỗi tăng tốc!',
      skyColor: 0x090d24,
      groundColor: 0x111834,
      roadColor: 0x141926,
      railColor: 0x38bdf8,
      roadWidth: 26,
      controlPoints: [
        [0, 0], [135, 10], [260, -45], [315, -165], [250, -275], [140, -240],
        [65, -355], [-65, -415], [-210, -370], [-305, -255], [-270, -115], [-160, -45], [-85, 25]
      ],
      obstacleCount: 44
    }
  ];

  const BOT_PROFILES = [
    { id: 'bot_1', name: 'Bot: Xích Long Vương', color: 0xef4444, accent: 0xfde047, carId: 'race_1m' },
    { id: 'bot_2', name: 'Bot: Bóng Ma Đường Phố', color: 0x8b5cf6, accent: 0xe879f9, carId: 'race_10k' },
    { id: 'bot_3', name: 'Bot: Sát Thủ Nitro', color: 0x10b981, accent: 0x6ee7b7, carId: 'race_1m' },
    { id: 'bot_4', name: 'Bot: Hắc Báo Tốc Độ', color: 0x3b82f6, accent: 0x93c5fd, carId: 'race_10m' },
    { id: 'bot_5', name: 'Bot: Lôi Phong Hủy Diệt', color: 0xf59e0b, accent: 0xfef3c7, carId: 'race_10k' },
    { id: 'bot_6', name: 'Bot: Đế Vương Drift', color: 0xec4899, accent: 0xfbcfe8, carId: 'race_10m' },
    { id: 'bot_7', name: 'Bot: Chiến Thần Thép', color: 0x06b6d4, accent: 0xa5f3fc, carId: 'race_1m' }
  ];

  // ==========================================================================
  // 3. STATE & PERSISTENCE (XE ĐÃ MUA, VOTE MAP, SẢNH CHỜ, ĐUA)
  // ==========================================================================
  let ownedCarIds = new Set(['race_free']);
  let equippedCarId = 'race_free';
  let playerMapVote = 'canyon_death';
  let botVotes = { canyon_death: 2, cyber_skyway: 2 };
  let selectedBetRacerId = 'player';
  let selectedBetAmount = 0;

  function loadGarageState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (ctx.antiCheat?.verifySaveObject && !ctx.antiCheat.verifySaveObject(d, d._acSig)) {
        try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
        ctx.antiCheat.flagCheat('save_tamper', 'Phát hiện chỉnh sửa dữ liệu Gara xe đua trong localStorage!');
        return;
      }
      if (Array.isArray(d.owned)) {
        ownedCarIds = new Set(['race_free', ...d.owned]);
      }
      if (d.equipped && ownedCarIds.has(d.equipped)) {
        equippedCarId = d.equipped;
      }
    } catch (_) {}
  }

  function saveGarageState() {
    try {
      const payload = {
        owned: Array.from(ownedCarIds),
        equipped: equippedCarId
      };
      if (ctx.antiCheat?.signSaveObject) {
        payload._acSig = ctx.antiCheat.signSaveObject(payload);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {}
  }
  loadGarageState();

  function getCarDef(id) {
    return RACE_CAR_CATALOG.find((c) => c.id === id) || RACE_CAR_CATALOG[0];
  }

  function getPlayerCash() {
    return Math.max(0, Math.round(Number(ctx.player?.cash ?? ctx.player?.money) || 0));
  }

  function setPlayerCash(val) {
    const clean = Math.max(0, Math.round(Number(val) || 0));
    if (ctx.gameplay?.syncPlayerCash) ctx.gameplay.syncPlayerCash(clean, true);
    else if (ctx.antiCheat?.commitCash) ctx.antiCheat.commitCash(clean);
    else if (ctx.player) {
      ctx.player.cash = clean;
      ctx.player.money = clean;
    }
  }

  // ==========================================================================
  // 4. EXTERIOR ENTRANCE BUILDING FACADE AT (25.6, 0.22, 80.0)
  // ==========================================================================
  const arenaRoot = new THREE.Group();
  arenaRoot.name = 'RaceArenaRoot';
  let entranceCorona = null;
  let entranceBuilt = false;
  let entranceCooldown = 0;

  function ensureEntranceBuilt() {
    if (entranceBuilt) return;
    const scene = ctx.engine?.scene || ctx.scene;
    if (!scene) return;
    entranceBuilt = true;
    scene.add(arenaRoot);

    // Pulsing cyan-amber corona on West sidewalk of Đại Lộ Chu Tước (25.6, 0.22, 80.0)
    const cGrp = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 1.65, 28),
      new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.25, 3.0, 20, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.24, side: THREE.DoubleSide })
    );
    cyl.position.y = 1.5;
    cGrp.add(ring, cyl);
    cGrp.userData = { ring };
    cGrp.position.set(ENTRANCE_POS.x, ENTRANCE_POS.y, ENTRANCE_POS.z);
    arenaRoot.add(cGrp);
    entranceCorona = cGrp;

    // Grand Death Race Archway Facade facing +X at (23.1, 0.22, 80.0)
    const fac = new THREE.Group();
    fac.position.set(23.1, 0.22, 80.0);
    const doorDarkMat = new THREE.MeshStandardMaterial({ color: 0x090b12, roughness: 0.5 });
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: 0xea580c,
      emissiveIntensity: 0.45,
      roughness: 0.3,
      metalness: 0.55
    });
    const neonTrimMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    const recess = new THREE.Mesh(new THREE.BoxGeometry(0.42, 4.0, 5.0), doorDarkMat);
    recess.position.set(-0.15, 2.0, 0);
    fac.add(recess);
    for (const sz of [-2.7, 2.7]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.55, 4.8, 0.5), pillarMat);
      col.position.set(0.08, 2.4, sz);
      fac.add(col);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 6.2), neonTrimMat);
    lintel.position.set(0.1, 4.85, 0);
    fac.add(lintel);

    if (typeof document !== 'undefined') {
      const cv = document.createElement('canvas');
      cv.width = 512;
      cv.height = 160;
      const g = cv.getContext('2d');
      if (g) {
        const grad = g.createLinearGradient(0, 0, 512, 160);
        grad.addColorStop(0, '#180c24');
        grad.addColorStop(0.5, '#3b1024');
        grad.addColorStop(1, '#0c1f38');
        g.fillStyle = grad;
        g.fillRect(0, 0, 512, 160);
        g.strokeStyle = '#f97316';
        g.lineWidth = 8;
        g.strokeRect(6, 6, 500, 148);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = '900 38px system-ui, sans-serif';
        g.fillStyle = '#fef08a';
        g.fillText('🏁 TRƯỜNG ĐUA TỬ THẦN', 256, 56);
        g.font = '800 24px system-ui, sans-serif';
        g.fillStyle = '#7dd3fc';
        g.fillText('ĐUA XE CHIẾN ĐẤU • CƯỢC X5 • THƯỞNG $500K', 256, 114);
      }
      const tex = new THREE.CanvasTexture(cv);
      if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 1.75), new THREE.MeshBasicMaterial({ map: tex }));
      sign.position.set(0.48, 5.85, 0);
      sign.rotation.y = Math.PI * 0.5;
      fac.add(sign);
    }
    arenaRoot.add(fac);
  }

  // ==========================================================================
  // 5. LIVE 3D RACE TRACK BUILDER, CARS, OBSTACLES, COMBAT & BOT AI (1.1x!)
  // ==========================================================================
  const raceWorldGroup = new THREE.Group();
  raceWorldGroup.visible = false;
  arenaRoot.add(raceWorldGroup);

  const raceState = {
    active: false,
    phase: 'idle', // 'idle' | 'countdown' | 'racing' | 'finished'
    mode: 'race',  // 'race' | 'spectate'
    mapDef: RACE_MAPS[0],
    countdown: 3.5,
    elapsed: 0,
    savedReturnPos: { x: 26, y: 0.22, z: 76, yaw: 0 },
    waypoints: [],
    segLengths: [],
    totalLength: 1,
    obstacles: [],
    racers: [],
    projectiles: [],
    fxList: [],
    feedMessages: [],
    betRacerId: null,
    betAmount: 0,
    betSettled: false,
    betPayout: 0,
    racePrize: 0,
    playerFinishRank: 0,
    spectateIdx: 0,
    finishedCount: 0,
    summaryShown: false
  };

  function clearRaceWorld() {
    while (raceWorldGroup.children.length > 0) {
      const ch = raceWorldGroup.children[0];
      raceWorldGroup.remove(ch);
    }
    raceState.obstacles.length = 0;
    raceState.racers.length = 0;
    raceState.projectiles.length = 0;
    raceState.fxList.length = 0;
    raceState.feedMessages.length = 0;
  }

  function pushRaceFeed(text) {
    raceState.feedMessages.unshift({ text, t: raceState.elapsed });
    if (raceState.feedMessages.length > 4) raceState.feedMessages.length = 4;
  }

  // Smooth Catmull-Rom closed circuit sampler
  function buildTrackWaypoints(mapDef) {
    const pts = mapDef.controlPoints.map(([cx, cz]) => new THREE.Vector3(ARENA_ORIGIN_X + cx, 0, ARENA_ORIGIN_Z + cz));
    const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.45);
    const SAMPLES = 120;
    const wps = [];
    for (let i = 0; i < SAMPLES; i++) {
      const p = curve.getPoint(i / SAMPLES);
      const t = curve.getTangent(i / SAMPLES).normalize();
      wps.push({ x: p.x, z: p.z, tx: t.x, tz: t.z, nx: -t.z, nz: t.x });
    }
    const segLengths = [];
    let total = 0;
    for (let i = 0; i < wps.length; i++) {
      const a = wps[i];
      const b = wps[(i + 1) % wps.length];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      segLengths.push(len);
      a.cumDist = total;
      total += len;
    }
    return { wps, segLengths, total };
  }

  function build3DRaceTrack(mapDef) {
    clearRaceWorld();
    const { wps, segLengths, total } = buildTrackWaypoints(mapDef);
    raceState.waypoints = wps;
    raceState.segLengths = segLengths;
    raceState.totalLength = total;

    const rw = mapDef.roadWidth;
    const halfW = rw * 0.5;

    // Vast arena floor plane
    const groundMat = new THREE.MeshStandardMaterial({ color: mapDef.groundColor, roughness: 0.92 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1100, 1100), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(ARENA_ORIGIN_X, -0.08, ARENA_ORIGIN_Z - 180);
    raceWorldGroup.add(ground);

    // Continuous smooth asphalt ribbon geometry (1 single draw call for the entire 2.6km road!)
    const roadPos = [];
    const roadIdx = [];
    const railPosL = [];
    const railPosR = [];
    for (let i = 0; i <= wps.length; i++) {
      const wp = wps[i % wps.length];
      const lx = wp.x - wp.nx * halfW;
      const lz = wp.z - wp.nz * halfW;
      const rx = wp.x + wp.nx * halfW;
      const rz = wp.z + wp.nz * halfW;
      roadPos.push(lx, 0.04, lz, rx, 0.04, rz);
      railPosL.push(lx, 0.04, lz, lx, 1.35, lz);
      railPosR.push(rx, 0.04, rz, rx, 1.35, rz);
      if (i < wps.length) {
        const b = i * 2;
        roadIdx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
    }
    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPos, 3));
    roadGeo.setIndex(roadIdx);
    roadGeo.computeVertexNormals();
    const roadMesh = new THREE.Mesh(
      roadGeo,
      new THREE.MeshStandardMaterial({ color: mapDef.roadColor, roughness: 0.55, metalness: 0.12, side: THREE.DoubleSide })
    );
    raceWorldGroup.add(roadMesh);

    // Left & Right Glowing Guardrails (2 single merged draw calls!)
    const makeRail = (arr) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      g.setIndex(roadIdx);
      g.computeVertexNormals();
      return new THREE.Mesh(
        g,
        new THREE.MeshBasicMaterial({ color: mapDef.railColor, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
      );
    };
    raceWorldGroup.add(makeRail(railPosL), makeRail(railPosR));

    // Start / Finish Checkered Gantry Arch at wp[0]
    const wp0 = wps[0];
    const startYaw = Math.atan2(wp0.tx, wp0.tz);
    const gantry = new THREE.Group();
    gantry.position.set(wp0.x, 0, wp0.z);
    gantry.rotation.y = startYaw;
    const gPillarMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const gTopMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const pL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 10, 1.1), gPillarMat);
    pL.position.set(-halfW - 0.6, 5, 0);
    const pR = new THREE.Mesh(new THREE.BoxGeometry(1.1, 10, 1.1), gPillarMat);
    pR.position.set(halfW + 0.6, 5, 0);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(rw + 2.4, 1.6, 1.2), gTopMat);
    cross.position.set(0, 9.6, 0);
    const startStripe = new THREE.Mesh(
      new THREE.PlaneGeometry(rw, 2.8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    startStripe.rotation.x = -Math.PI / 2;
    startStripe.position.set(0, 0.08, 0);
    gantry.add(pL, pR, cross, startStripe);
    raceWorldGroup.add(gantry);

    // Scenic Monoliths / Neon Towers outside the track for epic speed sensation
    const pillarGeo = new THREE.BoxGeometry(9, 28, 9);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: mapDef.id === 'canyon_death' ? 0x7c2d12 : 0x1e1b4b,
      emissive: mapDef.id === 'canyon_death' ? 0x431407 : 0x312e81,
      emissiveIntensity: 0.35,
      roughness: 0.7
    });
    for (let i = 0; i < wps.length; i += 6) {
      const wp = wps[i];
      const side = (i % 12 === 0 ? 1 : -1) * (halfW + 18 + (i % 5) * 3);
      const tower = new THREE.Mesh(pillarGeo, pillarMat);
      tower.position.set(wp.x + wp.nx * side, 13, wp.z + wp.nz * side);
      raceWorldGroup.add(tower);
    }

    // ========================================================================
    // 38–44 CHƯỚNG NGẠI VẬT (Concrete Walls, Explosive Barrels, Boost Pads, Jump Ramps, Moving Laser Gates!)
    // ========================================================================
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, emissive: 0x334155, emissiveIntensity: 0.25, roughness: 0.5 });
    const hazardMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.6, roughness: 0.35 });
    const boostMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const rampMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xa16207, emissiveIntensity: 0.4, roughness: 0.4 });
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.85 });

    const count = mapDef.obstacleCount;
    for (let k = 0; k < count; k++) {
      // Spread obstacles across entire circuit (skip immediate start grid wp 0..5)
      const wpIdx = 6 + Math.floor((k / count) * (wps.length - 10));
      const wp = wps[wpIdx % wps.length];
      const yaw = Math.atan2(wp.tx, wp.tz);
      const kindRoll = k % 5;
      const laneOffset = ((k * 37) % 3 - 1) * (halfW * 0.46); // -left, 0 center, +right
      const ox = wp.x + wp.nx * laneOffset;
      const oz = wp.z + wp.nz * laneOffset;

      if (kindRoll === 0) {
        // Heavy Concrete Chicane Block
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.2, 2.2), wallMat);
        mesh.position.set(ox, 1.1, oz);
        mesh.rotation.y = yaw;
        raceWorldGroup.add(mesh);
        raceState.obstacles.push({ type: 'wall', x: ox, z: oz, radius: 3.0, mesh, alive: true });
      } else if (kindRoll === 1) {
        // Explosive Red Barrel Cluster (Blasts cars on contact!)
        const grp = new THREE.Group();
        for (const [bx, bz] of [[-0.8, 0], [0.8, 0], [0, 0.85]]) {
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.5, 10), hazardMat);
          b.position.set(bx, 0.78, bz);
          grp.add(b);
        }
        grp.position.set(ox, 0, oz);
        raceWorldGroup.add(grp);
        raceState.obstacles.push({ type: 'barrel', x: ox, z: oz, radius: 2.2, mesh: grp, alive: true, respawnTimer: 0 });
      } else if (kindRoll === 2) {
        // Cyan Turbo Boost Pad
        const pad = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 9.5), boostMat);
        pad.rotation.x = -Math.PI / 2;
        pad.rotation.z = -yaw;
        pad.position.set(ox, 0.1, oz);
        raceWorldGroup.add(pad);
        raceState.obstacles.push({ type: 'boost', x: ox, z: oz, radius: 3.6, mesh: pad, alive: true });
      } else if (kindRoll === 3) {
        // Golden Jump Ramp
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.95, 6.2), rampMat);
        ramp.position.set(ox, 0.42, oz);
        ramp.rotation.y = yaw;
        ramp.rotation.x = -0.18;
        raceWorldGroup.add(ramp);
        raceState.obstacles.push({ type: 'ramp', x: ox, z: oz, radius: 3.4, mesh: ramp, alive: true });
      } else {
        // Moving Horizontal Laser Barrier Gate!
        const gate = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.3, 0.9), laserMat);
        gate.position.set(wp.x, 1.2, wp.z);
        gate.rotation.y = yaw;
        raceWorldGroup.add(gate);
        raceState.obstacles.push({
          type: 'laser_gate',
          baseX: wp.x,
          baseZ: wp.z,
          nx: wp.nx,
          nz: wp.nz,
          amp: halfW * 0.55,
          phase: k * 1.3,
          x: wp.x,
          z: wp.z,
          radius: 3.4,
          mesh: gate,
          alive: true
        });
      }
    }
  }

  function buildCombatCarMesh(carDef, colorHex, accentHex) {
    const grp = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.25, metalness: 0.65 });
    const accentMat = new THREE.MeshStandardMaterial({ color: accentHex, emissive: accentHex, emissiveIntensity: 0.35, roughness: 0.25, metalness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.12, metalness: 0.9 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.75 });

    // Aggressive sleek hypercar chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.68, 4.7), bodyMat);
    chassis.position.y = 0.66;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.56, 2.1), glassMat);
    cabin.position.set(0, 1.18, -0.2);
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.14, 0.55), accentMat);
    spoiler.position.set(0, 1.28, -2.15);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.32, 0.5), accentMat);
    bumper.position.set(0, 0.52, 2.35);

    // Twin hood weapons / plasma barrels
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 });
    for (const gx of [-0.72, 0.72]) {
      const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.35, 8), gunMat);
      gun.rotation.x = Math.PI / 2;
      gun.position.set(gx, 0.95, 1.65);
      grp.add(gun);
    }

    // 4 wheels
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    for (const wx of [-1.12, 1.12]) {
      for (const wz of [1.45, -1.45]) {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.position.set(wx, 0.42, wz);
        grp.add(w);
      }
    }

    // Golden Energy Shield bubble (for $100M Omega car!)
    const shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.85, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.28, wireframe: true })
    );
    shieldMesh.position.y = 1.05;
    shieldMesh.visible = false;

    // EMP Stun electric ring
    const stunMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.9, 0.08, 8, 20),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    stunMesh.rotation.x = Math.PI / 2;
    stunMesh.position.y = 1.6;
    stunMesh.visible = false;

    grp.add(chassis, cabin, spoiler, bumper, shieldMesh, stunMesh);
    grp.userData = { shieldMesh, stunMesh };
    raceWorldGroup.add(grp);
    return grp;
  }

  // Build Lobby Roster (Always up to 7 racers: Player + Online Humans + Auto-Fill Bots!)
  function getLobbyRoster(includePlayer = true) {
    const roster = [];
    if (includePlayer) {
      const pCar = getCarDef(equippedCarId);
      roster.push({
        id: 'player',
        name: 'Bạn (Người Chơi)',
        isPlayer: true,
        isBot: false,
        carId: pCar.id,
        carName: pCar.name,
        color: pCar.color,
        accent: pCar.accent
      });
    }
    // Include connected multiplayer players if present
    const remotes = ctx.mp?.getRemotePlayerTargets?.() || [];
    for (let i = 0; i < remotes.length && roster.length < MAX_RACERS; i++) {
      const rp = remotes[i];
      if (!rp) continue;
      roster.push({
        id: `mp_${rp.id || i}`,
        name: rp.name || `Tay Đua Online ${i + 1}`,
        isPlayer: false,
        isBot: true, // AI-assisted avatar in local arena race
        carId: 'race_1m',
        carName: 'Hỏa Long Turbo',
        color: 0x22c55e,
        accent: 0xbbf7d0
      });
    }
    // Fill remaining slots with AI Bots up to 7 racers!
    let bi = 0;
    while (roster.length < MAX_RACERS && bi < BOT_PROFILES.length) {
      const bp = BOT_PROFILES[bi++];
      const bCar = getCarDef(bp.carId);
      roster.push({
        id: bp.id,
        name: bp.name,
        isPlayer: false,
        isBot: true,
        carId: bCar.id,
        carName: bCar.name,
        color: bp.color,
        accent: bp.accent
      });
    }
    return roster;
  }

  function getMapVoteSummary() {
    const v1 = botVotes.canyon_death + (playerMapVote === 'canyon_death' ? 2 : 0);
    const v2 = botVotes.cyber_skyway + (playerMapVote === 'cyber_skyway' ? 2 : 0);
    const winnerId = v2 > v1 ? 'cyber_skyway' : 'canyon_death';
    return {
      playerVote: playerMapVote,
      votes: { canyon_death: v1, cyber_skyway: v2 },
      winnerId
    };
  }

  function voteForMap(mapId) {
    if (RACE_MAPS.some((m) => m.id === mapId)) {
      playerMapVote = mapId;
      ctx.audio?.playPhoneTap?.();
      return true;
    }
    return false;
  }

  function buyOrEquipCar(carId) {
    const def = RACE_CAR_CATALOG.find((c) => c.id === carId);
    if (!def) return { ok: false, reason: 'invalid' };
    if (ownedCarIds.has(def.id)) {
      equippedCarId = def.id;
      saveGarageState();
      ctx.audio?.playPhoneConfirm?.();
      return { ok: true, action: 'equipped', car: def };
    }
    const cash = getPlayerCash();
    if (cash < def.price) {
      ctx.audio?.playPhoneError?.();
      ctx.ui?.showNotification?.(`Không đủ tiền! Cần $${def.price.toLocaleString('en-US')} để mua ${def.name}.`, 'red');
      return { ok: false, reason: 'funds', needed: def.price, cash };
    }
    setPlayerCash(cash - def.price);
    ownedCarIds.add(def.id);
    equippedCarId = def.id;
    saveGarageState();
    ctx.audio?.playChime?.();
    ctx.ui?.showNotification?.(`🏎️ Đã mua & trang bị ${def.name} (-$${def.price.toLocaleString('en-US')})!`, 'green');
    return { ok: true, action: 'bought', car: def };
  }

  function setBetSelection(racerId, amount) {
    selectedBetRacerId = racerId || 'player';
    selectedBetAmount = Math.max(0, Math.floor(Number(amount) || 0));
  }

  function startRaceEvent(opts = {}) {
    const mode = opts.mode === 'spectate' ? 'spectate' : 'race';
    const betRacerId = opts.betRacerId !== undefined ? opts.betRacerId : selectedBetRacerId;
    const betAmt = Math.max(0, Math.floor(Number(opts.betAmount !== undefined ? opts.betAmount : selectedBetAmount) || 0));

    const entryCost = mode === 'race' ? ENTRY_FEE : 0;
    const totalNeeded = entryCost + betAmt;
    const cash = getPlayerCash();

    if (mode === 'spectate' && betAmt < 1) {
      ctx.audio?.playPhoneError?.();
      return { ok: false, reason: 'need_bet_for_spectate' };
    }
    if (cash < totalNeeded) {
      ctx.audio?.playPhoneError?.();
      return { ok: false, reason: 'funds', needed: totalNeeded, cash };
    }

    // Deduct entry fee + bet upfront
    if (totalNeeded > 0) setPlayerCash(cash - totalNeeded);

    ensureEntranceBuilt();
    const voteInfo = getMapVoteSummary();
    const mapDef = RACE_MAPS.find((m) => m.id === voteInfo.winnerId) || RACE_MAPS[0];

    // Save player's outside position to return cleanly afterwards
    const p = ctx.player;
    if (p) {
      raceState.savedReturnPos = {
        x: ENTRANCE_POS.x + 2.2,
        y: 0.22,
        z: ENTRANCE_POS.z,
        yaw: Math.PI * 0.5
      };
      if (p.inCar && ctx.vehicles?.exitVehicle) {
        try { ctx.vehicles.exitVehicle(p, ctx); } catch (_) {}
      }
      p.inSafehouse = false;
      p.inInterior = 'race_arena';
    }

    build3DRaceTrack(mapDef);
    raceWorldGroup.visible = true;

    const roster = getLobbyRoster(mode === 'race');
    const wp0 = raceState.waypoints[0];
    const startYaw = Math.atan2(wp0.tx, wp0.tz);

    // Player base reference speed (for Bot 1.1x scaling!)
    const playerCarDef = getCarDef(equippedCarId);
    const normalPlayerRefSpeed = Math.max(36, playerCarDef.maxSpeed * 0.94);

    for (let i = 0; i < roster.length; i++) {
      const slot = roster[i];
      const carDef = getCarDef(slot.carId);
      const row = Math.floor(i / 2);
      const col = (i % 2 === 0 ? -1 : 1) * 4.2;
      const backDist = 4.0 + row * 7.8;
      const sx = wp0.x - wp0.tx * backDist + wp0.nx * col;
      const sz = wp0.z - wp0.tz * backDist + wp0.nz * col;
      const mesh = buildCombatCarMesh(carDef, slot.color, slot.accent);
      mesh.position.set(sx, 0.04, sz);
      mesh.rotation.y = startYaw;

      // Bots drive 1.1x normal player speed (as requested!), with subtle individuality
      const effectiveMaxSpeed = slot.isBot
        ? Math.max(carDef.maxSpeed, normalPlayerRefSpeed * 1.1) * randRange(0.97, 1.04)
        : carDef.maxSpeed;

      raceState.racers.push({
        id: slot.id,
        name: slot.name,
        isPlayer: slot.isPlayer,
        isBot: slot.isBot,
        carDef,
        mesh,
        x: sx,
        y: 0.04,
        z: sz,
        vy: 0,
        vx: 0,
        vz: 0,
        speed: 0,
        yaw: startYaw,
        maxSpeed: effectiveMaxSpeed,
        accel: slot.isBot ? carDef.accel * 1.12 : carDef.accel,
        hp: carDef.hp,
        maxHp: carDef.hp,
        nitro: 100,
        skillCd: 1.5,
        shieldTimer: 0,
        stunTimer: 0,
        boostTimer: 0,
        respawnTimer: 0,
        wpIndex: 0,
        lap: 1,
        progress: -backDist,
        finished: false,
        finishRank: 0,
        finishTime: 0,
        botLaneTarget: col,
        botLaneTimer: randRange(1.5, 4.0),
        botSkillTimer: randRange(2.5, 5.5)
      });
    }

    raceState.active = true;
    raceState.phase = 'countdown';
    raceState.mode = mode;
    raceState.mapDef = mapDef;
    raceState.countdown = 3.2;
    raceState.elapsed = 0;
    raceState.betRacerId = betAmt > 0 ? betRacerId : null;
    raceState.betAmount = betAmt;
    raceState.betSettled = false;
    raceState.betPayout = 0;
    raceState.racePrize = 0;
    raceState.playerFinishRank = 0;
    raceState.finishedCount = 0;
    raceState.summaryShown = false;

    const betIdx = raceState.racers.findIndex((r) => r.id === betRacerId);
    raceState.spectateIdx = betIdx >= 0 ? betIdx : 0;

    pushRaceFeed(`🏁 Chào mừng tới ${mapDef.name} — 7 tay đua sẵn sàng!`);
    if (betAmt > 0) {
      const targetRacer = raceState.racers.find((r) => r.id === betRacerId);
      pushRaceFeed(`🎰 Đã cược $${betAmt.toLocaleString('en-US')} vào ${targetRacer?.name || betRacerId} (x5)!`);
    }
    ctx.audio?.playChime?.();
    return { ok: true, map: mapDef, racers: raceState.racers.length };
  }

  function exitRaceArena() {
    if (!raceState.active) return false;
    raceState.active = false;
    raceState.phase = 'idle';
    raceWorldGroup.visible = false;
    clearRaceWorld();
    entranceCooldown = 2.6;

    const p = ctx.player;
    if (p) {
      p.inInterior = null;
      p.inSafehouse = false;
      const ret = raceState.savedReturnPos || { x: ENTRANCE_POS.x + 2.2, y: 0.22, z: ENTRANCE_POS.z, yaw: Math.PI * 0.5 };
      if (ctx.gameplay?.teleportPlayer) {
        ctx.gameplay.teleportPlayer(ret.x, ret.y, ret.z, ret.yaw);
      } else {
        p.x = ret.x;
        p.y = ret.y;
        p.z = ret.z;
        p.yaw = ret.yaw;
      }
    }
    ctx.ui?.showNotification?.('Đã trở lại Đại Lộ Chu Tước từ Trường Đua Tử Thần.', 'gold');
    return true;
  }

  // ==========================================================================
  // 6. CAR COMBAT SKILLS, PROJECTILES, EXPLOSIONS & DAMAGE
  // ==========================================================================
  function spawnRaceFX(x, y, z, colorHex, maxScale = 7.5, duration = 0.45) {
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const geo = new THREE.SphereGeometry(1, 12, 10);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    raceWorldGroup.add(mesh);
    raceState.fxList.push({ mesh, geo, mat, age: 0, duration, maxScale });
  }

  function damageRacer(victim, amount, attacker, label = '') {
    if (!victim || victim.finished || victim.respawnTimer > 0) return;
    if (victim.shieldTimer > 0) {
      spawnRaceFX(victim.x, victim.y + 1.1, victim.z, 0xfacc15, 3.5, 0.25);
      return;
    }
    victim.hp = Math.max(0, victim.hp - amount);
    if (victim.isPlayer) {
      ctx.engine?.addShake?.(clamp(amount / 350, 0.15, 0.7));
      ctx.engine?.triggerDamageFlash?.(clamp(amount / 400, 0.2, 0.75));
    }
    if (victim.hp <= 0) {
      // Dramatic wreck explosion -> respawn on track after 2.4s!
      victim.respawnTimer = 2.4;
      victim.speed = 0;
      victim.vx = 0;
      victim.vz = 0;
      victim.mesh.visible = false;
      spawnRaceFX(victim.x, victim.y + 1.2, victim.z, 0xf97316, 11.5, 0.65);
      ctx.audio?.playExplosion?.(0.95);
      if (attacker) {
        pushRaceFeed(`💥 ${attacker.name} đã bắn nổ xe của ${victim.name}${label ? ` (${label})` : ''}!`);
      } else {
        pushRaceFeed(`💥 ${victim.name} đã nổ tung trên đường đua!`);
      }
    }
  }

  function findAheadTargets(shooter, maxDist = 95, maxCount = 1) {
    const fwdX = Math.sin(shooter.yaw);
    const fwdZ = Math.cos(shooter.yaw);
    const cands = [];
    for (const r of raceState.racers) {
      if (!r || r === shooter || r.finished || r.respawnTimer > 0) continue;
      const dx = r.x - shooter.x;
      const dz = r.z - shooter.z;
      const d = Math.hypot(dx, dz);
      if (d > maxDist || d < 1) continue;
      const dot = (dx * fwdX + dz * fwdZ) / d;
      if (dot < 0.25) continue;
      cands.push({ r, score: dot * 40 - d * 0.45 });
    }
    cands.sort((a, b) => b.score - a.score);
    return cands.slice(0, maxCount).map((c) => c.r);
  }

  function fireCarSkill(racer) {
    if (!racer || raceState.phase !== 'racing' || racer.finished || racer.respawnTimer > 0) return false;
    if (racer.skillCd > 0.05) return false;

    const def = racer.carDef;
    const noCd = racer.isPlayer && ctx.gameplay?.isNoCooldownActive?.();
    if (racer.isPlayer && ctx.antiCheat && !ctx.antiCheat.verifyAndRecordSkill('race_skill', def.skillCd * 1000, noCd)) {
      return false;
    }
    racer.skillCd = noCd ? 0 : def.skillCd;
    const fx = Math.sin(racer.yaw);
    const fz = Math.cos(racer.yaw);

    if (def.skillId === 'turbo_ram') {
      racer.boostTimer = 1.6;
      racer.speed = Math.min(racer.maxSpeed * 1.32, racer.speed + 12);
      spawnRaceFX(racer.x - fx * 2.4, racer.y + 0.7, racer.z - fz * 2.4, 0x38bdf8, 3.2, 0.3);
      ctx.audio?.playWeaponShot?.('pistol', 0.3);
      return true;
    }

    if (def.skillId === 'gatling') {
      // Twin hood Gatling burst!
      racer.boostTimer = 0.8;
      const tgts = findAheadTargets(racer, 72, 1);
      const tgt = tgts[0] || null;
      const tx = tgt ? tgt.x : racer.x + fx * 55;
      const tz = tgt ? tgt.z : racer.z + fz * 55;
      spawnRaceFX(racer.x + fx * 2.6, racer.y + 1.0, racer.z + fz * 2.6, 0xfef08a, 2.5, 0.22);
      if (tgt) {
        damageRacer(tgt, 140, racer, 'Gatling Đôi');
        spawnRaceFX(tx, tgt.y + 1.0, tz, 0xf59e0b, 4.2, 0.32);
      }
      ctx.audio?.playWeaponShot?.('smg', 0.45);
      return true;
    }

    if (def.skillId === 'missile') {
      // Homing Heat-Seeking Missile!
      racer.boostTimer = 1.2;
      const tgt = findAheadTargets(racer, 110, 1)[0] || null;
      const mMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.32, 1.8, 8),
        new THREE.MeshBasicMaterial({ color: 0xf97316 })
      );
      mMesh.rotation.x = Math.PI / 2;
      mMesh.position.set(racer.x + fx * 2.8, racer.y + 1.25, racer.z + fz * 2.8);
      raceWorldGroup.add(mMesh);
      raceState.projectiles.push({
        kind: 'missile',
        mesh: mMesh,
        shooter: racer,
        target: tgt,
        x: mMesh.position.x,
        y: mMesh.position.y,
        z: mMesh.position.z,
        vx: fx * (racer.speed + 52),
        vz: fz * (racer.speed + 52),
        damage: 320,
        color: 0xf97316,
        life: 2.2
      });
      ctx.audio?.playWeaponShot?.('shotgun', 0.55);
      return true;
    }

    if (def.skillId === 'emp_lightning') {
      // 55m EMP Shockwave + Engine Stun!
      racer.boostTimer = 1.8;
      racer.speed = Math.min(racer.maxSpeed * 1.35, racer.speed + 16);
      spawnRaceFX(racer.x, racer.y + 1.2, racer.z, 0x38bdf8, 28, 0.55);
      ctx.audio?.playTulenThunderbird?.();
      let hitAny = 0;
      for (const other of raceState.racers) {
        if (!other || other === racer || other.finished || other.respawnTimer > 0) continue;
        const d = Math.hypot(other.x - racer.x, other.z - racer.z);
        if (d <= 55) {
          other.stunTimer = Math.max(other.stunTimer, 2.6);
          other.speed *= 0.45;
          damageRacer(other, 460, racer, 'Sóng EMP');
          spawnRaceFX(other.x, other.y + 1.2, other.z, 0x7dd3fc, 5.5, 0.4);
          hitAny++;
        }
      }
      if (hitAny > 0 && racer.isPlayer) {
        pushRaceFeed(`⚡ Xung Điện EMP làm tê liệt ${hitAny} đối thủ!`);
      }
      return true;
    }

    if (def.skillId === 'orbital_omega') {
      // 3 Homing Orbital Plasma Cannons + 3.5s Golden Energy Shield!
      racer.shieldTimer = 3.5;
      racer.boostTimer = 2.6;
      racer.speed = Math.min(racer.maxSpeed * 1.38, racer.speed + 20);
      const tgts = findAheadTargets(racer, 130, 3);
      for (let k = 0; k < Math.max(1, tgts.length); k++) {
        const tgt = tgts[k] || null;
        const pMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.55, 10, 8),
          new THREE.MeshBasicMaterial({ color: 0xfacc15 })
        );
        pMesh.position.set(racer.x + fx * 3.0, racer.y + 1.6, racer.z + fz * 3.0);
        raceWorldGroup.add(pMesh);
        raceState.projectiles.push({
          kind: 'plasma',
          mesh: pMesh,
          shooter: racer,
          target: tgt,
          x: pMesh.position.x,
          y: pMesh.position.y,
          z: pMesh.position.z,
          vx: fx * (racer.speed + 65),
          vz: fz * (racer.speed + 65),
          damage: 720,
          color: 0xc084fc,
          life: 2.5
        });
      }
      spawnRaceFX(racer.x, racer.y + 1.4, racer.z, 0xfacc15, 12, 0.5);
      ctx.audio?.playHollowPurple?.();
      return true;
    }
    return false;
  }

  function triggerPlayerRaceSkill() {
    const pr = raceState.racers.find((r) => r.isPlayer);
    if (!pr) return false;
    return fireCarSkill(pr);
  }

  function triggerPlayerRaceNitro() {
    const pr = raceState.racers.find((r) => r.isPlayer);
    if (!pr || raceState.phase !== 'racing' || pr.respawnTimer > 0) return false;
    if (pr.nitro < 15) return false;
    pr.nitro = Math.max(0, pr.nitro - 35);
    pr.boostTimer = Math.max(pr.boostTimer, 1.5);
    pr.speed = Math.min(pr.maxSpeed * 1.35, pr.speed + 14);
    spawnRaceFX(pr.x, pr.y + 0.6, pr.z, 0x22d3ee, 4.0, 0.3);
    return true;
  }

  function resetPlayerCarOnTrack() {
    const pr = raceState.racers.find((r) => r.isPlayer);
    if (!pr || raceState.phase !== 'racing') return false;
    const wp = raceState.waypoints[pr.wpIndex % raceState.waypoints.length];
    if (!wp) return false;
    pr.x = wp.x;
    pr.z = wp.z;
    pr.y = 0.04;
    pr.vy = 0;
    pr.speed = 8;
    pr.yaw = Math.atan2(wp.tx, wp.tz);
    return true;
  }

  function cycleSpectateTarget() {
    if (raceState.racers.length === 0) return;
    raceState.spectateIdx = (raceState.spectateIdx + 1) % raceState.racers.length;
  }

  // ==========================================================================
  // 7. RACE SIMULATION LOOP (PHYSICS, OBSTACLES, RAMMING, BOT AI, FINISH & PAYOUT)
  // ==========================================================================
  function settleRaceCompletion(racer) {
    if (racer.finished) return;
    racer.finished = true;
    raceState.finishedCount++;
    racer.finishRank = raceState.finishedCount;
    racer.finishTime = raceState.elapsed;
    pushRaceFeed(`🏁 #${racer.finishRank}: ${racer.name} đã cán đích (${racer.finishTime.toFixed(1)}s)!`);

    // Settle Bet immediately once 1st place finishes!
    if (racer.finishRank === 1 && raceState.betAmount > 0 && !raceState.betSettled) {
      raceState.betSettled = true;
      if (racer.id === raceState.betRacerId) {
        const winPay = raceState.betAmount * 5;
        raceState.betPayout = winPay;
        setPlayerCash(getPlayerCash() + winPay);
        ctx.audio?.playChime?.();
        pushRaceFeed(`🎰 THẮNG CƯỢC x5! Nhận +$${winPay.toLocaleString('en-US')}!`);
      } else {
        raceState.betPayout = 0;
        pushRaceFeed(`🎰 Thua cược ($${raceState.betAmount.toLocaleString('en-US')}) — ${racer.name} về nhất!`);
      }
    }

    // Settle Player's Race Prize
    if (racer.isPlayer) {
      raceState.playerFinishRank = racer.finishRank;
      const prize = PRIZES[racer.finishRank] || 0;
      raceState.racePrize = prize;
      if (prize > 0) {
        setPlayerCash(getPlayerCash() + prize);
        ctx.audio?.playChime?.();
      }
      raceState.phase = 'finished';
      raceState.summaryShown = true;
    } else if (raceState.mode === 'spectate' && racer.finishRank >= 3) {
      raceState.phase = 'finished';
      raceState.summaryShown = true;
    }
  }

  function updateRace(dtArg, rawDtArg) {
    ensureEntranceBuilt();
    const dt = clamp(Number(dtArg) || 0.016, 0.001, 0.05);
    const rawDt = clamp(Number(rawDtArg) || dt, 0.001, 0.05);

    if (entranceCooldown > 0) entranceCooldown -= rawDt;

    // Exterior city entrance corona animation & [F] trigger when NOT inside race
    if (!raceState.active) {
      const p = ctx.player;
      if (entranceCorona) {
        const inInt = Boolean(p && (p.inSafehouse || p.inInterior || p.x > 600));
        entranceCorona.visible = !inInt;
        if (entranceCorona.visible) {
          entranceCorona.rotation.y += dt * 1.5;
          const pulse = 1 + Math.sin((ctx.elapsed || 0) * 4.0) * 0.09;
          entranceCorona.userData.ring.scale.setScalar(pulse);
        }
      }
      if (
        p &&
        !p.dead &&
        !p.inSafehouse &&
        !p.inInterior &&
        !ctx.input?.raceLobbyOpen &&
        !ctx.input?.phoneOpen &&
        entranceCooldown <= 0
      ) {
        const dEnt = Math.hypot(p.x - ENTRANCE_POS.x, p.z - ENTRANCE_POS.z);
        const interactHit = !!(ctx.input?.interactJustPressed || ctx.input?.enterJustPressed || ctx.input?.useJustPressed);
        if (interactHit && dEnt < 4.8) {
          entranceCooldown = 1.6;
          ctx.ui?.openRaceLobby?.();
        }
      }
      return;
    }

    // Active Race Simulation!
    if (raceState.phase === 'countdown') {
      raceState.countdown -= rawDt;
      if (raceState.countdown <= 0) {
        raceState.countdown = 0;
        raceState.phase = 'racing';
        ctx.audio?.playChime?.();
        pushRaceFeed('🚀 XUẤT PHÁT! Đạp ga, né chướng ngại vật & bắn hạ đối thủ!');
      }
    } else if (raceState.phase === 'racing') {
      raceState.elapsed += dt;
    }

    const wps = raceState.waypoints;
    const wpCount = wps.length;
    const halfW = raceState.mapDef.roadWidth * 0.5;

    // 1. Update Moving Laser Gates & Barrel Respawns
    for (const obs of raceState.obstacles) {
      if (obs.type === 'laser_gate') {
        const offset = Math.sin(raceState.elapsed * 2.1 + obs.phase) * obs.amp;
        obs.x = obs.baseX + obs.nx * offset;
        obs.z = obs.baseZ + obs.nz * offset;
        obs.mesh.position.x = obs.x;
        obs.mesh.position.z = obs.z;
      } else if (obs.type === 'barrel' && !obs.alive) {
        obs.respawnTimer -= dt;
        if (obs.respawnTimer <= 0) {
          obs.alive = true;
          obs.mesh.visible = true;
        }
      }
    }

    // 2. Update Racers (Player Input + Bot 1.1x AI)
    const inp = ctx.input || {};
    const keys = inp.keys || {};
    for (const r of raceState.racers) {
      if (r.skillCd > 0) r.skillCd = Math.max(0, r.skillCd - rawDt);
      if (r.shieldTimer > 0) r.shieldTimer = Math.max(0, r.shieldTimer - rawDt);
      if (r.stunTimer > 0) r.stunTimer = Math.max(0, r.stunTimer - rawDt);
      if (r.boostTimer > 0) r.boostTimer = Math.max(0, r.boostTimer - rawDt);

      if (r.mesh?.userData?.shieldMesh) r.mesh.userData.shieldMesh.visible = r.shieldTimer > 0;
      if (r.mesh?.userData?.stunMesh) {
        r.mesh.userData.stunMesh.visible = r.stunTimer > 0;
        if (r.stunTimer > 0) r.mesh.userData.stunMesh.rotation.z += dt * 10;
      }

      if (r.respawnTimer > 0) {
        r.respawnTimer -= rawDt;
        if (r.respawnTimer <= 0) {
          const wp = wps[r.wpIndex % wpCount];
          r.x = wp.x;
          r.z = wp.z;
          r.y = 0.04;
          r.vy = 0;
          r.yaw = Math.atan2(wp.tx, wp.tz);
          r.hp = Math.round(r.maxHp * 0.72);
          r.speed = 10;
          r.mesh.visible = true;
          spawnRaceFX(r.x, 1.0, r.z, 0x38bdf8, 4.5, 0.35);
        }
        continue;
      }

      if (raceState.phase !== 'racing') continue;

      r.nitro = Math.min(100, r.nitro + 8 * dt);
      let throttle = 0;
      let steer = 0;

      if (r.isPlayer && !r.finished) {
        const up = Boolean(inp.forward || inp.up || inp.gas || keys.KeyW || keys.ArrowUp);
        const down = Boolean(inp.backward || inp.down || inp.brake || keys.KeyS || keys.ArrowDown);
        const left = Boolean(inp.left || keys.KeyA || keys.ArrowLeft);
        const right = Boolean(inp.right || keys.KeyD || keys.ArrowRight);
        throttle = (up ? 1 : 0) - (down ? 1 : 0);
        steer = (left ? 1 : 0) - (right ? 1 : 0);
        if (inp.jumpJustPressed || keys.Space) fireCarSkill(r);
        if (keys.ShiftLeft || keys.ShiftRight || inp.drift) {
          if (r.nitro > 12) {
            r.nitro = Math.max(0, r.nitro - 28 * dt);
            r.boostTimer = Math.max(r.boostTimer, 0.18);
          }
        }
        if (keys.KeyR) resetPlayerCarOnTrack();
      } else {
        // Smart Aggressive Bot AI (1.1x normal player speed + obstacle avoidance + combat skills!)
        r.botLaneTimer -= dt;
        if (r.botLaneTimer <= 0) {
          r.botLaneTimer = randRange(1.8, 4.2);
          r.botLaneTarget = randRange(-halfW * 0.55, halfW * 0.55);
        }
        // Look ahead 3 waypoints
        const targetWp = wps[(r.wpIndex + 3) % wpCount];
        let aimX = targetWp.x + targetWp.nx * r.botLaneTarget;
        let aimZ = targetWp.z + targetWp.nz * r.botLaneTarget;

        // Swerve around nearby solid obstacles!
        for (const obs of raceState.obstacles) {
          if (!obs.alive || obs.type === 'boost' || obs.type === 'ramp') continue;
          const odx = obs.x - r.x;
          const odz = obs.z - r.z;
          const od = Math.hypot(odx, odz);
          if (od < 22) {
            const crossSide = odx * targetWp.nx + odz * targetWp.nz;
            const dodgeDir = crossSide >= 0 ? -1 : 1;
            aimX += targetWp.nx * dodgeDir * 9.5;
            aimZ += targetWp.nz * dodgeDir * 9.5;
          }
        }

        const desiredYaw = Math.atan2(aimX - r.x, aimZ - r.z);
        const diff = wrapAngle(desiredYaw - r.yaw);
        steer = clamp(diff * 2.4, -1, 1);
        throttle = Math.abs(diff) > 0.85 ? 0.58 : 1.0;

        // Bot attacks player AND other bots aggressively!
        r.botSkillTimer -= dt;
        if (r.botSkillTimer <= 0 && !r.finished) {
          r.botSkillTimer = randRange(2.4, 4.8);
          const tgts = findAheadTargets(r, 75, 1);
          if (tgts.length > 0) fireCarSkill(r);
        }
      }

      // Apply Acceleration, Stun, Boost & Steering Physics
      const topSpd = r.maxSpeed * (r.stunTimer > 0 ? 0.45 : r.boostTimer > 0 ? 1.28 : 1.0);
      if (throttle > 0) {
        r.speed = Math.min(topSpd, r.speed + r.accel * throttle * dt);
      } else if (throttle < 0) {
        r.speed = Math.max(-14, r.speed + r.accel * 1.45 * throttle * dt);
      } else {
        r.speed *= Math.max(0, 1 - 1.35 * dt);
      }

      const steerRate = (r.isPlayer ? 2.45 : 2.85) * clamp(Math.abs(r.speed) / 14, 0.35, 1.0);
      r.yaw = wrapAngle(r.yaw + steer * steerRate * dt * (r.speed >= -0.5 ? 1 : -1));

      r.vx = Math.sin(r.yaw) * r.speed;
      r.vz = Math.cos(r.yaw) * r.speed;
      r.x += r.vx * dt;
      r.z += r.vz * dt;

      // Vertical Jump Ramp Gravity
      if (r.y > 0.04 || r.vy > 0) {
        r.vy -= 26 * dt;
        r.y += r.vy * dt;
        if (r.y <= 0.04) {
          r.y = 0.04;
          r.vy = 0;
        }
      }

      // Advance nearest track waypoint & clamp softly inside guardrails
      let bestIdx = r.wpIndex;
      let bestD2 = Infinity;
      for (let off = -3; off <= 8; off++) {
        const idx = (r.wpIndex + off + wpCount) % wpCount;
        const wp = wps[idx];
        const d2 = (r.x - wp.x) ** 2 + (r.z - wp.z) ** 2;
        if (d2 < bestD2) {
          bestD2 = d2;
          bestIdx = idx;
        }
      }
      // Lap wrap detection
      if (r.wpIndex > wpCount - 14 && bestIdx < 12) {
        r.lap++;
        if (r.lap > TOTAL_LAPS) {
          settleRaceCompletion(r);
        } else if (r.isPlayer) {
          ctx.audio?.playChime?.();
          pushRaceFeed(`🏁 VÒNG CUỐI (${r.lap}/${TOTAL_LAPS})! Cố lên!`);
        }
      }
      r.wpIndex = bestIdx;
      const curWp = wps[bestIdx];
      const latDist = (r.x - curWp.x) * curWp.nx + (r.z - curWp.z) * curWp.nz;
      const maxLat = halfW - 1.5;
      if (Math.abs(latDist) > maxLat) {
        const clampedLat = clamp(latDist, -maxLat, maxLat);
        r.x = curWp.x + curWp.nx * clampedLat;
        r.z = curWp.z + curWp.nz * clampedLat;
        r.speed *= 0.88;
      }
      r.progress = (r.lap - 1) * raceState.totalLength + curWp.cumDist;

      // Obstacle collisions
      for (const obs of raceState.obstacles) {
        if (!obs.alive) continue;
        const dx = r.x - obs.x;
        const dz = r.z - obs.z;
        const d = Math.hypot(dx, dz);
        if (d < obs.radius + 1.45) {
          if (obs.type === 'boost') {
            r.boostTimer = Math.max(r.boostTimer, 1.3);
            r.speed = Math.min(r.maxSpeed * 1.38, r.speed + 16);
            r.nitro = Math.min(100, r.nitro + 22);
          } else if (obs.type === 'ramp') {
            if (r.y <= 0.15 && r.speed > 14) {
              r.vy = clamp(r.speed * 0.28, 7.5, 13.5);
            }
          } else if (obs.type === 'barrel') {
            obs.alive = false;
            obs.mesh.visible = false;
            obs.respawnTimer = 10.0;
            spawnRaceFX(obs.x, 1.2, obs.z, 0xef4444, 9.5, 0.5);
            ctx.audio?.playExplosion?.(0.7);
            damageRacer(r, 180, null, 'Thùng Nổ');
            r.speed *= 0.65;
          } else if (r.y < 1.6) {
            // Solid wall or laser gate bounce!
            const nx = d > 0.01 ? dx / d : 1;
            const nz = d > 0.01 ? dz / d : 0;
            r.x = obs.x + nx * (obs.radius + 1.6);
            r.z = obs.z + nz * (obs.radius + 1.6);
            r.speed *= 0.45;
            damageRacer(r, obs.type === 'laser_gate' ? 140 : 85, null, obs.type === 'laser_gate' ? 'Cổng Laser' : 'Chướng Ngại Vật');
          }
        }
      }

      r.mesh.position.set(r.x, r.y, r.z);
      r.mesh.rotation.y = r.yaw;
      r.mesh.rotation.x = r.vy > 0.5 ? -0.18 : r.vy < -1.0 ? 0.12 : 0;
    }

    // 3. Tanky Car-vs-Car Ramming Collisions!
    for (let i = 0; i < raceState.racers.length; i++) {
      const a = raceState.racers[i];
      if (!a || a.respawnTimer > 0) continue;
      for (let j = i + 1; j < raceState.racers.length; j++) {
        const b = raceState.racers[j];
        if (!b || b.respawnTimer > 0) continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        if (d < 3.1 && d > 0.01 && Math.abs(a.y - b.y) < 1.5) {
          const nx = dx / d;
          const nz = dz / d;
          const overlap = (3.1 - d) * 0.55;
          a.x -= nx * overlap;
          a.z -= nz * overlap;
          b.x += nx * overlap;
          b.z += nz * overlap;
          const relSpd = Math.hypot(a.vx - b.vx, a.vz - b.vz);
          if (relSpd > 6) {
            const dmgToB = Math.round(relSpd * 3.8 * a.carDef.ramPower * (a.shieldTimer > 0 ? 2.8 : 1));
            const dmgToA = Math.round(relSpd * 3.8 * b.carDef.ramPower * (b.shieldTimer > 0 ? 2.8 : 1));
            damageRacer(b, dmgToB, a, 'Đâm Xe');
            damageRacer(a, dmgToA, b, 'Đâm Xe');
            spawnRaceFX((a.x + b.x) * 0.5, 0.9, (a.z + b.z) * 0.5, 0xfef08a, 3.0, 0.22);
          }
        }
      }
    }

    // 4. Update Homing Missiles & Orbital Plasma Projectiles
    for (let i = raceState.projectiles.length - 1; i >= 0; i--) {
      const prj = raceState.projectiles[i];
      prj.life -= dt;
      if (prj.target && prj.target.respawnTimer <= 0 && !prj.target.finished) {
        const dx = prj.target.x - prj.x;
        const dz = prj.target.z - prj.z;
        const d = Math.hypot(dx, dz) || 1;
        const spd = Math.hypot(prj.vx, prj.vz) || 75;
        prj.vx = lerp(prj.vx, (dx / d) * spd, clamp(dt * 8, 0, 1));
        prj.vz = lerp(prj.vz, (dz / d) * spd, clamp(dt * 8, 0, 1));
      }
      prj.x += prj.vx * dt;
      prj.z += prj.vz * dt;
      prj.mesh.position.set(prj.x, prj.y, prj.z);
      prj.mesh.lookAt(prj.x + prj.vx, prj.y, prj.z + prj.vz);

      let hit = false;
      for (const r of raceState.racers) {
        if (!r || r === prj.shooter || r.respawnTimer > 0 || r.finished) continue;
        if (Math.hypot(r.x - prj.x, r.z - prj.z) < 3.2) {
          damageRacer(r, prj.damage, prj.shooter, prj.kind === 'plasma' ? 'Pháo Quỹ Đạo' : 'Tên Lửa');
          spawnRaceFX(prj.x, 1.3, prj.z, prj.color, 9.0, 0.45);
          ctx.audio?.playExplosion?.(0.75);
          hit = true;
          break;
        }
      }
      if (hit || prj.life <= 0) {
        if (prj.mesh.parent) prj.mesh.parent.remove(prj.mesh);
        raceState.projectiles.splice(i, 1);
      }
    }

    // 5. Update Explosion & Skill FX
    for (let i = raceState.fxList.length - 1; i >= 0; i--) {
      const fx = raceState.fxList[i];
      fx.age += rawDt;
      const t = fx.age / fx.duration;
      if (t >= 1) {
        if (fx.mesh.parent) fx.mesh.parent.remove(fx.mesh);
        fx.geo.dispose();
        fx.mat.dispose();
        raceState.fxList.splice(i, 1);
      } else {
        fx.mesh.scale.setScalar(0.6 + t * fx.maxScale);
        fx.mat.opacity = (1 - t) * 0.85;
      }
    }

    // 6. Smooth Dynamic Chase Camera behind Player (or Spectated Racer)
    const cam = ctx.engine?.camera;
    const focusRacer =
      raceState.mode === 'race'
        ? raceState.racers.find((r) => r.isPlayer) || raceState.racers[0]
        : raceState.racers[raceState.spectateIdx % Math.max(1, raceState.racers.length)];
    if (cam && focusRacer) {
      const fx = Math.sin(focusRacer.yaw);
      const fz = Math.cos(focusRacer.yaw);
      const camDist = 11.2 + clamp(focusRacer.speed * 0.08, 0, 4.5);
      const goalX = focusRacer.x - fx * camDist;
      const goalY = focusRacer.y + 4.8;
      const goalZ = focusRacer.z - fz * camDist;
      const s = 1 - Math.exp(-9.0 * rawDt);
      cam.position.x = lerp(cam.position.x, goalX, s);
      cam.position.y = lerp(cam.position.y, goalY, s);
      cam.position.z = lerp(cam.position.z, goalZ, s);
      cam.lookAt(focusRacer.x + fx * 10, focusRacer.y + 1.3, focusRacer.z + fz * 10);
    }
  }

  function getStandings() {
    return [...raceState.racers].sort((a, b) => {
      if (a.finished && b.finished) return a.finishRank - b.finishRank;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });
  }

  function getRaceHUDState() {
    if (!raceState.active) return { active: false };
    const standings = getStandings();
    const pr = raceState.racers.find((r) => r.isPlayer) || null;
    const focus =
      raceState.mode === 'race'
        ? pr
        : raceState.racers[raceState.spectateIdx % Math.max(1, raceState.racers.length)] || null;
    const rank = pr ? standings.indexOf(pr) + 1 : 0;
    const betRacer = raceState.betRacerId ? raceState.racers.find((r) => r.id === raceState.betRacerId) : null;
    return {
      active: true,
      phase: raceState.phase,
      mode: raceState.mode,
      mapName: raceState.mapDef.name,
      countdown: Math.ceil(raceState.countdown),
      elapsed: raceState.elapsed,
      rank,
      totalRacers: raceState.racers.length,
      lap: Math.min(TOTAL_LAPS, focus?.lap || 1),
      totalLaps: TOTAL_LAPS,
      speedKmh: Math.round(Math.abs(focus?.speed || 0) * 3.6),
      hp: Math.ceil(focus?.hp || 0),
      maxHp: focus?.maxHp || 1000,
      nitro: Math.round(focus?.nitro || 0),
      skillName: focus?.carDef?.skillName || '',
      skillIcon: focus?.carDef?.skillIcon || '🔥',
      skillCd: focus?.skillCd || 0,
      respawnTimer: focus?.respawnTimer || 0,
      focusName: focus?.name || '',
      betRacerName: betRacer?.name || '',
      betAmount: raceState.betAmount,
      betPayout: raceState.betPayout,
      racePrize: raceState.racePrize,
      playerFinishRank: raceState.playerFinishRank,
      standings: standings.map((r, i) => ({
        rank: i + 1,
        id: r.id,
        name: r.name,
        isPlayer: r.isPlayer,
        lap: Math.min(TOTAL_LAPS, r.lap),
        hp: Math.ceil(r.hp),
        maxHp: r.maxHp,
        finished: r.finished,
        finishTime: r.finishTime
      })),
      feed: raceState.feedMessages.slice(0, 3)
    };
  }

  function getLobbyState() {
    return {
      entrancePos: ENTRANCE_POS,
      entryFee: ENTRY_FEE,
      prizes: PRIZES,
      maxRacers: MAX_RACERS,
      cars: RACE_CAR_CATALOG.map((c) => ({
        ...c,
        owned: ownedCarIds.has(c.id),
        equipped: equippedCarId === c.id
      })),
      equippedCarId,
      maps: RACE_MAPS.map((m) => ({ id: m.id, name: m.name, subtitle: m.subtitle, obstacleCount: m.obstacleCount })),
      voteInfo: getMapVoteSummary(),
      roster: getLobbyRoster(true),
      selectedBetRacerId,
      selectedBetAmount,
      cash: getPlayerCash()
    };
  }

  ensureEntranceBuilt();

  const api = {
    ENTRANCE_POS,
    ENTRY_FEE,
    PRIZES,
    RACE_CAR_CATALOG,
    RACE_MAPS,
    isActive: () => raceState.active,
    getLobbyState,
    getRaceHUDState,
    buyOrEquipCar,
    voteForMap,
    setBetSelection,
    startRaceEvent,
    exitRaceArena,
    triggerPlayerRaceSkill,
    triggerPlayerRaceNitro,
    resetPlayerCarOnTrack,
    cycleSpectateTarget,
    updateRace
  };

  if (ctx) ctx.raceArena = api;
  return api;
}
