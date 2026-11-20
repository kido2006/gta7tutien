// ============================================================================
// GIANG HỒ ĐẠI LỘ & BỜ BIỂN 3D — GAMEPLAY, LỤC PHIẾN MÔN, NỘI CÔNG & NHIỆM VỤ
// ============================================================================

export function createGameplaySystem(ctx, THREE) {
  const SAVE_KEY = 'giangho_dailo_save_v1';
  const isMobile = Boolean(ctx?.isMobile || ctx?.engine?.isMobile);
  const TARGET_TRAFFIC_COUNT = isMobile ? 8 : 14;
  const BEACH_PED_COUNT = isMobile ? 4 : 6;
  const PIER_PED_COUNT = isMobile ? 3 : 4;
  const TARGET_PED_COUNT = isMobile ? 14 : 22;
  const INVULNERABILITY_DURATION_MS = 300_000;
  const NO_COOLDOWN_DURATION_MS = 100_000;
  let invulnerableUntil = 0;
  let noCooldownUntil = 0;
  let pedAnimFrameCounter = 0;

  const AVENUES_X = [-120, -40, 40, 120, 200];
  const STREETS_Z = [-200, -120, -40, 40, 120, 200];

  const LANDMARKS = {
    showroom: { x: -58, y: 0.05, z: 80 },
    showroomEntry: { x: -52, y: 0.05, z: 80 },
    hospital: { x: 80, y: 0.22, z: 130 },
    precinct: { x: 130, y: 0.22, z: 80 },
    safehouseEntrance: { x: 24, y: 0.22, z: -80 },
    safehouseInterior: { x: 800, y: 0.05, z: 800 },
    safehouseExit: { x: 800, y: 0.05, z: 805 },
    safehouseWardrobe: { x: 796.5, y: 0.05, z: 797.5 },
    fibRooftop: { x: 160, y: 78.05, z: -23.5 },
    fibRappelAnchor: { x: 160, y: 78.05, z: -16.2 },
    downtownDropoff: { x: 34, y: 0.22, z: -10 },
    barClub: { x: 54.4, y: 0.22, z: 14.0 },
    barClubInterior: { x: 1100, y: 0.05, z: 1109.2 },
    barClubExit: { x: 1100, y: 0.05, z: 1112.2 },
    barClubTaiXiu: { x: 1100, y: 0.05, z: 1100.8 },
    barClubVault: { x: 1108.2, y: 0.05, z: 1095.0 },
    discipleShop: { x: 25.6, y: 0.22, z: -14.0 },
    shopInterior: { x: 1400, y: 0.05, z: 1406.5 },
    shopExit: { x: 1400, y: 0.05, z: 1409.5 },
    shopCounter: { x: 1400, y: 0.05, z: 1400.8 },
    stadiumEntrance: { x: 54.4, y: 0.22, z: 80.0 },
    stadiumInterior: { x: 1800, y: 0.05, z: 1823.0 },
    stadiumExit: { x: 1800, y: 0.05, z: 1829.2 }
  };

  const STADIUM_HIDE_SPOTS = [
    { id: 'north', name: 'Tủ Đồ Bắc', x: 1800, z: 1770.8 },
    { id: 'sw', name: 'Kho Dụng Cụ Tây', x: 1762, z: 1827.5 },
    { id: 'se', name: 'Hầm Kỹ Thuật Đông', x: 1838, z: 1827.5 }
  ];

  function isInAnyInterior(p = ctx.player) {
    return Boolean(p && (p.inSafehouse || p.inInterior || p.x > 600));
  }

  const DISCIPLE_SHOP_CATALOG = [
    {
      id: 'disciple_1',
      name: 'Đệ Tử Sơ Cấp',
      price: 1,
      skinHex: '#402828',
      hp: 180,
      weapon: 'pistol',
      damage: 18,
      fireInterval: 0.72,
      hasMapNuke: false,
      desc: 'Da mã màu #402828 • Đi theo hộ vệ, bắn hạ kẻ địch & tuyệt đối không tấn công chủ.'
    },
    {
      id: 'disciple_10',
      name: 'Đệ Tử Tinh Anh',
      price: 10,
      skinHex: '#ede1e1',
      hp: 300,
      weapon: 'carbine',
      damage: 32,
      fireInterval: 0.42,
      hasMapNuke: false,
      desc: 'Da mã màu #ede1e1 • Cẩm Y hộ vệ tinh nhuệ, hỏa lực mạnh, theo sát bảo vệ chủ nhân.'
    },
    {
      id: 'disciple_100',
      name: 'Sư Huynh Vô Hạn (Gojo)',
      price: 100,
      skinHex: '#f2d6c4',
      hp: 999,
      weapon: 'unarmed',
      damage: 65,
      fireInterval: 0.34,
      hasMapNuke: true,
      nukeCooldown: 60,
      nukeRadius: 1000,
      desc: 'Tóc trắng dựng, bịt mắt đen, áo cổ cao • Chiêu [G] Hư Thức Tử nổ bản đồ quét sạch kẻ địch bán kính 1km (hồi 60s).'
    }
  ];

  const LEGEND_DISCIPLE_DEFS = [
    {
      id: 'disciple_messi',
      name: 'Lionel Messi #10 (Huyền Thoại)',
      price: 0,
      skinHex: '#e8bfa3',
      badge: 'M10',
      desc: 'Đệ tử Huyền Thoại • Skill Mua Phiến Quân & Giảm Sao Truy Nã',
      hp: 950,
      weapon: 'carbine',
      damage: 45,
      fireInterval: 0.42,
      hasLegendBribe: true
    },
    {
      id: 'disciple_ronaldo',
      name: 'Cristiano Ronaldo #7 (Huyền Thoại)',
      price: 0,
      skinHex: '#d9a784',
      badge: 'CR7',
      desc: 'Đệ tử Huyền Thoại • Skill Mua Phiến Quân & Giảm Sao Truy Nã',
      hp: 950,
      weapon: 'carbine',
      damage: 48,
      fireInterval: 0.42,
      hasLegendBribe: true
    }
  ];

  const MISSION_DEFS = {
    1: {
      id: 1,
      title: 'BẠCH LONG TUYỆT ẢNH ĐẠI LỘ',
      reward: 3500,
      marker: { x: 30, y: 0.22, z: 12, color: 0xf0c35a, label: 'NV1: Bạch Long Tuyệt Ảnh' }
    },
    2: {
      id: 2,
      title: 'BÃO LỬA BẾN CẢNG BỒNG LAI',
      reward: 6000,
      marker: { x: -135, y: 0.22, z: 5, color: 0xff7b29, label: 'NV2: Bến Cảng Bồng Lai' }
    },
    3: {
      id: 3,
      title: 'ĐỘT KÍCH ĐU DÂY THÁP THIÊN CƠ',
      reward: 15000,
      marker: { x: 140, y: 0.22, z: -5, color: 0x38bdf8, label: 'NV3: Tháp Thiên Cơ' }
    },
    4: {
      id: 4,
      title: 'ĐẤU TRƯỜNG HUYỀN THOẠI — BOSS',
      reward: 100000,
      phoneOnly: true,
      marker: { x: 54.4, y: 0.22, z: 80.0, color: 0xfacc15, label: 'BOSS: Đại Đấu Trường Huyền Thoại' }
    }
  };

  const WEATHER_MODES = ['BRIGHT_DAY', 'SUNSET_GOLD', 'OVERCAST_RAIN', 'NEON_NIGHT'];
  const QUALITY_MODES = ['ULTRA', 'HIGH', 'MOBILE'];

  const peds = [];
  const cops = [];
  const disciples = [];
  const casinoGuards = [];
  const stadiumBosses = [];
  const hollowPurpleBlasts = [];
  const activeThunderbirds = [];
  const helicopters = [];
  const pickups = [];
  const gpsWaypoints = [];
  const trafficCars = [];
  const tracers = [];
  const glassShards = [];
  const completedMissions = new Set();
  let maxDisciples = 6;
  let gojoNukeCooldown = 0;
  let tulenSkillCooldown = 0;
  const TULEN_MAX_COOLDOWN = 10.0;
  let tulenTargetingActive = false;
  let tulenLockedTarget = null;
  let tulenManualLockTimer = 0;
  let tulenReticleGroup = null;
  let legendBribeCooldown = 0;
  let rebelsBribedUntil = 0;

  let casinoDealer = null;
  let casinoAlarmActive = false;
  let casinoRobCooldown = 0;
  let casinoAlarmBannerShown = false;
  let shopShowcaseGroup = null;
  let stadiumCorona = null;
  let stadiumCooldown = 0;
  let stadiumBossDefeated = false;
  const stadiumBall = {
    mesh: null,
    x: 1800,
    y: 0.32,
    z: 1800,
    vx: 0,
    vy: 0,
    vz: 0,
    state: 'loose', // 'loose' | 'carried' | 'hidden' | 'shot'
    hiddenSpot: null,
    hiddenTimer: 0,
    shotBy: null,
    shotLife: 0,
    kickCooldown: 0
  };

  const wanted = {
    stars: 0,
    heat: 0,
    spotted: false,
    evadeTimer: 0,
    evadeDuration: 20,
    flashing: false,
    lethalForce: false,
    arrestProgress: 0,
    roadblockCooldown: 0,
    spawnCooldown: 0
  };

  const mission = {
    active: false,
    id: 0,
    title: '',
    stage: 0,
    objective: '',
    subtitle: '',
    timer: 0,
    maxTimer: 0,
    reward: 0,
    enemies: [],
    targets: [],
    rivalCars: [],
    briefcaseCollected: false,
    bulletTimeCueShown: false,
    targetCar: null,
    getawayCars: [],
    vipNpc: null,
    markers: Object.values(MISSION_DEFS).filter((m) => !m.phoneOnly).map((m) => ({
      id: m.id,
      title: m.title,
      x: m.marker.x,
      y: m.marker.y,
      z: m.marker.z,
      color: m.marker.color
    }))
  };

  const deathArrestState = {
    mode: null,
    timer: 0,
    duration: 2.8
  };

  let initializedVisuals = false;
  let populatedWorld = false;
  let elapsedClock = 0;
  let gpsRefreshTimer = 0;
  let gpsTarget = null;
  let markerCooldown = 0;
  let showroomCooldown = 0;
  let safehouseCooldown = 0;
  let barClubCooldown = 0;
  let discipleShopCooldown = 0;
  let prevSpecialKey = false;
  let prevPlayerShotTime = 0;
  let gunfireAlert = { x: 0, z: 0, timer: 0 };
  let vehicleIntegratesAI = null;

  const gameplayRoot = new THREE.Group();
  gameplayRoot.name = 'GameplaySystemRoot';

  const markerMeshes = [];
  let safehouseCorona = null;
  let safehouseExitCorona = null;
  let safehouseWardrobeCorona = null;
  let showroomCorona = null;
  let barClubCorona = null;
  let discipleShopCorona = null;
  let activeStageCorona = null;
  let fibRigGroup = null;
  let fibAtriumGroup = null;
  let fibGlassIntact = true;

  const sharedGeos = {
    coronaCyl: new THREE.CylinderGeometry(1.35, 1.35, 3.2, 24, 1, true),
    coronaRing: new THREE.RingGeometry(1.05, 1.48, 28),
    smallCoronaCyl: new THREE.CylinderGeometry(0.95, 0.95, 2.2, 20, 1, true),
    cashBill: new THREE.BoxGeometry(0.38, 0.14, 0.24),
    cashBand: new THREE.BoxGeometry(0.10, 0.15, 0.25),
    pickupGlow: new THREE.RingGeometry(0.32, 0.56, 20),
    medKit: new THREE.BoxGeometry(0.42, 0.28, 0.30),
    medCrossH: new THREE.BoxGeometry(0.22, 0.04, 0.07),
    medCrossV: new THREE.BoxGeometry(0.07, 0.04, 0.22),
    armorVest: new THREE.BoxGeometry(0.40, 0.44, 0.22),
    briefcaseBody: new THREE.BoxGeometry(0.52, 0.36, 0.20),
    briefcaseHandle: new THREE.BoxGeometry(0.20, 0.07, 0.05),
    tracerBox: new THREE.BoxGeometry(0.045, 0.045, 1.0),
    shardTri: new THREE.BufferGeometry(),
    searchlightCone: new THREE.ConeGeometry(8.5, 56, 24, 1, true),
    searchlightSpot: new THREE.CircleGeometry(7.6, 24)
  };
  sharedGeos.coronaRing.rotateX(-Math.PI / 2);
  sharedGeos.pickupGlow.rotateX(-Math.PI / 2);
  sharedGeos.searchlightSpot.rotateX(-Math.PI / 2);
  sharedGeos.searchlightCone.translate(0, -28, 0);
  {
    const verts = new Float32Array([
      0.0, 0.18, 0.0,
      -0.15, -0.12, 0.02,
      0.16, -0.09, -0.02
    ]);
    sharedGeos.shardTri.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    sharedGeos.shardTri.computeVertexNormals();
  }

  const sharedMats = {
    cashGreen: new THREE.MeshStandardMaterial({ color: 0xf0c35a, roughness: 0.28, metalness: 0.85, emissive: 0x4d3808, emissiveIntensity: 0.38 }),
    cashBand: new THREE.MeshStandardMaterial({ color: 0xc81d32, roughness: 0.5 }),
    medWhite: new THREE.MeshStandardMaterial({ color: 0xf6f1e6, roughness: 0.35, metalness: 0.1 }),
    medRed: new THREE.MeshStandardMaterial({ color: 0x2ec486, roughness: 0.30, emissive: 0x0b4f33, emissiveIntensity: 0.45 }),
    armorBlue: new THREE.MeshStandardMaterial({ color: 0x2574d9, roughness: 0.35, metalness: 0.35, emissive: 0x0d2f66, emissiveIntensity: 0.35 }),
    chromeCase: new THREE.MeshStandardMaterial({ color: 0xf0c35a, roughness: 0.18, metalness: 0.88, emissive: 0x2ec486, emissiveIntensity: 0.35 }),
    tracerEnemy: new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
    tracerHeli: new THREE.MeshBasicMaterial({ color: 0xfff0a8, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false }),
    tracerAlly: new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false }),
    tracerGojo: new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.96, blending: THREE.AdditiveBlending, depthWrite: false }),
    glassShard: new THREE.MeshPhysicalMaterial({ color: 0xbbeeff, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
    searchlightBeam: new THREE.MeshBasicMaterial({
      color: 0xffecc2,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    searchlightGround: new THREE.MeshBasicMaterial({
      color: 0xfff2d6,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  };

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
  const lerpAngle = (a, b, t) => a + wrapAngle(b - a) * clamp(t, 0, 1);
  const dist2D = (x1, z1, x2, z2) => Math.hypot(x2 - x1, z2 - z1);
  const randRange = (min, max) => min + Math.random() * (max - min);
  const randInt = (min, max) => Math.floor(randRange(min, max + 1));
  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function getScene() {
    return ctx.engine?.scene || ctx.scene || null;
  }

  function getGroundY(x, z, fallback = 0.22) {
    if (ctx.world?.getGroundHeight) {
      const h = ctx.world.getGroundHeight(x, z);
      if (Number.isFinite(h)) return h;
    }
    if (x >= -295 && x <= -150 && z >= -32 && z <= 22) return 3.8;
    if (x < -128 && x >= -212) {
      const t = clamp((-128 - x) / 84, 0, 1);
      return lerp(0.22, -0.3, t);
    }
    return fallback;
  }

  function checkClearLOS(x1, y1, z1, x2, y2, z2) {
    if (ctx.world?.checkLOS) return !!ctx.world.checkLOS(x1, y1, z1, x2, y2, z2);
    return true;
  }

  function getRigObject3D(rig) {
    if (!rig) return null;
    if (rig.isObject3D) return rig;
    return rig.root || rig.mesh || rig.group || null;
  }

  function getPlayerVehicle() {
    const p = ctx.player;
    if (!p) return null;
    if (p.inCar && typeof p.inCar === 'object') return p.inCar;
    if (p.vehicle && typeof p.vehicle === 'object') return p.vehicle;
    if (p.car && typeof p.car === 'object') return p.car;
    return null;
  }

  function syncPlayerCash(newCash, showPopup = true) {
    if (!ctx.player) return;
    const prev = ctx.antiCheat
      ? ctx.antiCheat.readVaultCash()
      : Number.isFinite(ctx.player.cash)
      ? ctx.player.cash
      : Number.isFinite(ctx.player.money)
      ? ctx.player.money
      : 7860;
    const clamped = Math.max(0, Math.round(newCash));
    const delta = clamped - prev;
    if (ctx.antiCheat) {
      ctx.antiCheat.commitCash(clamped);
    } else {
      ctx.player.cash = clamped;
      ctx.player.money = clamped;
    }
    if (showPopup && delta !== 0) {
      ctx.ui?.addCashPopup?.(delta);
      ctx.ui?.onCashChange?.(clamped, delta);
    }
  }

  function getPlayerCash() {
    if (!ctx.player) return 0;
    if (ctx.antiCheat) return ctx.antiCheat.readVaultCash();
    if (Number.isFinite(ctx.player.cash)) return ctx.player.cash;
    if (Number.isFinite(ctx.player.money)) return ctx.player.money;
    ctx.player.cash = 7860;
    ctx.player.money = 7860;
    return 7860;
  }

  function notifyUI(text, duration = 3.5) {
    mission.subtitle = text;
    ctx.ui?.showSubtitle?.(text, duration);
    ctx.ui?.notify?.(text);
    ctx.ui?.showToast?.(text);
  }

  function setMissionObjective(text) {
    mission.objective = text;
    ctx.ui?.setObjective?.(text);
  }

  function grantWeaponToPlayer(weaponId, ammoAmount = 180) {
    const p = ctx.player;
    if (!p) return;
    if (p.unlockedWeapons && typeof p.unlockedWeapons === 'object') {
      p.unlockedWeapons[weaponId] = true;
    }
    if (p.ammo && typeof p.ammo === 'object') {
      const cur = Number(p.ammo[weaponId]) || 0;
      p.ammo[weaponId] = Math.max(cur, ammoAmount);
    }
  }

  function setPlayerActiveWeapon(weaponId) {
    const p = ctx.player;
    if (!p) return;
    grantWeaponToPlayer(weaponId, 180);
    p.weaponId = weaponId;
    p.weapon = weaponId;
    p.currentWeapon = weaponId;
    p.activeWeapon = weaponId;
    ctx.characters?.equipWeapon?.(p.rig || p, weaponId);
  }

  function applyPlayerOutfit(outfitName) {
    const p = ctx.player;
    if (!p) return;
    p.outfit = outfitName;
    if (ctx.characters?.setOutfit) {
      ctx.characters.setOutfit(p.rig || p, outfitName);
    }
    ctx.characters?.setHumanoidCastShadow?.(p.rig || p, true);
  }

  function teleportPlayer(x, y, z, yaw = null) {
    const p = ctx.player;
    if (!p) return;
    const car = getPlayerVehicle();
    if (car) {
      try { ctx.vehicles?.exitVehicle?.(true); } catch (_) {}
      car.driver = null;
      car.isPlayerDriving = false;
    }
    p.inCar = null;
    p.vehicle = null;
    p.car = null;
    p.inCarId = null;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = 0;
    p.vy = 0;
    p.vz = 0;
    if (yaw !== null && Number.isFinite(yaw)) p.yaw = yaw;
    const obj = getRigObject3D(p.rig) || p.mesh;
    if (obj) {
      obj.visible = true;
      obj.position.set(x, y, z);
      if (yaw !== null && Number.isFinite(yaw)) obj.rotation.y = yaw;
    }
  }

  function safeSpawnVehicle(type, x, y, z, yaw = 0, extra = {}) {
    if (!ctx.vehicles?.spawnVehicle) return null;
    const car = ctx.vehicles.spawnVehicle(type, x, y, z, yaw, extra);
    if (!car) return null;
    car.x = x;
    car.y = Number.isFinite(y) ? y : getGroundY(x, z, 0.05);
    car.z = z;
    car.yaw = Number.isFinite(yaw) ? yaw : 0;
    if (car.mesh) {
      car.mesh.position.set(car.x, car.y, car.z);
      car.mesh.rotation.y = car.yaw;
    }
    Object.assign(car, extra);
    return car;
  }

  function safeRemoveVehicle(car) {
    if (!car || car === getPlayerVehicle()) return;
    ctx.vehicles?.removeVehicle?.(car);
  }

  // ==========================================================================
  // 3D CORONA MARKERS, PICKUPS & THÁP THIÊN CƠ PROPS
  // ==========================================================================
  function createCoronaMesh(color, small = false) {
    const group = new THREE.Group();
    const cylMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const cyl = new THREE.Mesh(small ? sharedGeos.smallCoronaCyl : sharedGeos.coronaCyl, cylMat);
    cyl.position.y = small ? 1.1 : 1.6;
    const ring = new THREE.Mesh(sharedGeos.coronaRing, ringMat);
    ring.position.y = 0.05;
    if (small) ring.scale.setScalar(0.72);
    group.add(cyl, ring);
    group.userData = { cyl, ring, cylMat, ringMat, baseColor: color };
    return group;
  }

  function buildFIBProps() {
    fibRigGroup = new THREE.Group();
    fibRigGroup.position.set(160, 78.02, -16.2);
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x8c1922, metalness: 0.45, roughness: 0.35 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf0c35a, metalness: 0.85, roughness: 0.25, emissive: 0x4a3300, emissiveIntensity: 0.25 });

    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 1.8), goldMat);
    basePlate.position.set(0, 0.08, -0.4);
    fibRigGroup.add(basePlate);

    for (const sx of [-1.1, 1.1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.2, 0.22), steelMat);
      post.position.set(sx, 1.15, -0.35);
      const boom = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.20, 1.9), steelMat);
      boom.position.set(sx, 2.2, 0.45);
      fibRigGroup.add(post, boom);
    }
    const crossBar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.5, 14), goldMat);
    crossBar.rotation.z = Math.PI / 2;
    crossBar.position.set(0, 2.2, 1.0);
    fibRigGroup.add(crossBar);

    const rigCorona = createCoronaMesh(0x38bdf8, true);
    rigCorona.position.set(0, 0.02, 0.0);
    fibRigGroup.add(rigCorona);
    fibRigGroup.userData.rigCorona = rigCorona;
    gameplayRoot.add(fibRigGroup);

    fibAtriumGroup = new THREE.Group();
    fibAtriumGroup.position.set(160, 47.75, -15.82);

    const ledgeMat = new THREE.MeshStandardMaterial({ color: 0x2c1b20, metalness: 0.55, roughness: 0.3 });
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(32, 0.28, 0.95), ledgeMat);
    ledge.position.set(0, -0.1, -0.15);
    fibAtriumGroup.add(ledge);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x8ad8ff,
      roughness: 0.08,
      metalness: 0.15,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide
    });
    const glassPanel = new THREE.Mesh(new THREE.PlaneGeometry(30, 4.2), glassMat);
    glassPanel.position.set(0, 2.05, 0.26);
    fibAtriumGroup.add(glassPanel);
    fibAtriumGroup.userData.glassPanel = glassPanel;
    gameplayRoot.add(fibAtriumGroup);
  }

  function shatterFIBAtriumGlass() {
    if (!fibGlassIntact) return;
    fibGlassIntact = false;
    if (fibAtriumGroup?.userData?.glassPanel) {
      fibAtriumGroup.userData.glassPanel.visible = false;
    }
    ctx.audio?.playGlassShatter?.();
    for (let i = 0; i < 42; i++) {
      const shard = new THREE.Mesh(sharedGeos.shardTri, sharedMats.glassShard);
      const sx = 160 + randRange(-14, 14);
      const sy = 48.0 + randRange(0.2, 3.8);
      const sz = -15.5 + randRange(-0.15, 0.35);
      shard.position.set(sx, sy, sz);
      shard.scale.setScalar(randRange(0.7, 1.8));
      shard.rotation.set(randRange(0, 6.28), randRange(0, 6.28), randRange(0, 6.28));
      gameplayRoot.add(shard);
      glassShards.push({
        mesh: shard,
        vx: randRange(-2.5, 2.5),
        vy: randRange(-1.5, 2.5),
        vz: randRange(1.2, 5.2),
        rx: randRange(-6, 6),
        ry: randRange(-6, 6),
        life: randRange(2.2, 3.8)
      });
    }
  }

  function ensureVisualsInitialized() {
    if (initializedVisuals) return;
    const scene = getScene();
    if (!scene) return;
    initializedVisuals = true;
    scene.add(gameplayRoot);

    for (const def of Object.values(MISSION_DEFS)) {
      if (def.phoneOnly) continue;
      const mGroup = createCoronaMesh(def.marker.color, false);
      const gy = getGroundY(def.marker.x, def.marker.z, def.marker.y);
      mGroup.position.set(def.marker.x, gy, def.marker.z);
      gameplayRoot.add(mGroup);
      markerMeshes.push({ id: def.id, def, mesh: mGroup });
    }

    safehouseCorona = createCoronaMesh(0x2ec486, true);
    safehouseCorona.position.set(LANDMARKS.safehouseEntrance.x, LANDMARKS.safehouseEntrance.y, LANDMARKS.safehouseEntrance.z);
    gameplayRoot.add(safehouseCorona);

    safehouseExitCorona = createCoronaMesh(0x38bdf8, true);
    safehouseExitCorona.position.set(LANDMARKS.safehouseExit.x, LANDMARKS.safehouseExit.y, LANDMARKS.safehouseExit.z);
    gameplayRoot.add(safehouseExitCorona);

    safehouseWardrobeCorona = createCoronaMesh(0xf0c35a, true);
    safehouseWardrobeCorona.position.set(LANDMARKS.safehouseWardrobe.x, LANDMARKS.safehouseWardrobe.y, LANDMARKS.safehouseWardrobe.z);
    gameplayRoot.add(safehouseWardrobeCorona);

    showroomCorona = createCoronaMesh(0xf0c35a, true);
    showroomCorona.position.set(LANDMARKS.showroomEntry.x, LANDMARKS.showroomEntry.y, LANDMARKS.showroomEntry.z);
    gameplayRoot.add(showroomCorona);

    // Neon Bar Club & Tài Xỉu Portal on Đại Lộ Chu Tước (54.4, 0.22, 14.0)
    barClubCorona = createCoronaMesh(0xe84dff, true);
    barClubCorona.position.set(LANDMARKS.barClub.x, LANDMARKS.barClub.y, LANDMARKS.barClub.z);
    gameplayRoot.add(barClubCorona);

    const clubGroup = new THREE.Group();
    clubGroup.position.set(57.2, 0.22, 14.0);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x1d112b,
      emissive: 0xc026d3,
      emissiveIntensity: 0.85,
      roughness: 0.28,
      metalness: 0.45
    });
    const goldFrameMat = new THREE.MeshStandardMaterial({
      color: 0xf0c35a,
      emissive: 0x78500a,
      emissiveIntensity: 0.45,
      metalness: 0.85,
      roughness: 0.22
    });
    const doorDarkMat = new THREE.MeshBasicMaterial({ color: 0x0b0714 });
    const doorRecess = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.6, 4.2), doorDarkMat);
    doorRecess.position.set(0.15, 1.8, 0);
    clubGroup.add(doorRecess);
    for (const sz of [-2.2, 2.2]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.45, 4.2, 0.42), pillarMat);
      col.position.set(-0.05, 2.1, sz);
      clubGroup.add(col);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 5.2), goldFrameMat);
    lintel.position.set(-0.1, 4.25, 0);
    clubGroup.add(lintel);

    if (typeof document !== 'undefined') {
      const sc = document.createElement('canvas');
      sc.width = 512;
      sc.height = 160;
      const sg = sc.getContext('2d');
      if (sg) {
        const bg = sg.createLinearGradient(0, 0, 512, 160);
        bg.addColorStop(0, '#1a0826');
        bg.addColorStop(0.5, '#3b0c52');
        bg.addColorStop(1, '#1a0826');
        sg.fillStyle = bg;
        sg.fillRect(0, 0, 512, 160);
        sg.strokeStyle = '#f0c35a';
        sg.lineWidth = 8;
        sg.strokeRect(6, 6, 500, 148);
        sg.strokeStyle = '#e879f9';
        sg.lineWidth = 3;
        sg.strokeRect(14, 14, 484, 132);
        sg.textAlign = 'center';
        sg.textBaseline = 'middle';
        sg.font = '900 44px system-ui, sans-serif';
        sg.fillStyle = '#f5d0fe';
        sg.fillText('BAR CLUB VIP', 256, 58);
        sg.font = '800 28px system-ui, sans-serif';
        sg.fillStyle = '#f0c35a';
        sg.fillText('🎲 SÒNG TÀI XỈU • KIẾM TIỀN', 256, 114);
      }
      const signTex = new THREE.CanvasTexture(sc);
      signTex.colorSpace = THREE.SRGBColorSpace;
      const signMat = new THREE.MeshBasicMaterial({ map: signTex });
      const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 1.55), signMat);
      signMesh.position.set(-0.46, 5.2, 0);
      signMesh.rotation.y = -Math.PI * 0.5;
      clubGroup.add(signMesh);
    }
    gameplayRoot.add(clubGroup);

    // 3D Võ Quán — Cửa Hàng Đệ Tử Portal on West Sidewalk of Đại Lộ Chu Tước (25.6, 0.22, -14.0)
    discipleShopCorona = createCoronaMesh(0xf59e0b, true);
    discipleShopCorona.position.set(LANDMARKS.discipleShop.x, LANDMARKS.discipleShop.y, LANDMARKS.discipleShop.z);
    gameplayRoot.add(discipleShopCorona);

    const shopGroup = new THREE.Group();
    shopGroup.position.set(23.1, 0.22, -14.0);
    const shopPillarMat = new THREE.MeshStandardMaterial({
      color: 0x7c1420,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.45,
      roughness: 0.34,
      metalness: 0.32
    });
    const shopDoorRecess = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.6, 4.2), doorDarkMat);
    shopDoorRecess.position.set(-0.15, 1.8, 0);
    shopGroup.add(shopDoorRecess);
    for (const sz of [-2.2, 2.2]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.45, 4.2, 0.42), shopPillarMat);
      col.position.set(0.05, 2.1, sz);
      shopGroup.add(col);
    }
    const shopLintel = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 5.2), goldFrameMat);
    shopLintel.position.set(0.1, 4.25, 0);
    shopGroup.add(shopLintel);

    if (typeof document !== 'undefined') {
      const sc2 = document.createElement('canvas');
      sc2.width = 512;
      sc2.height = 160;
      const sg2 = sc2.getContext('2d');
      if (sg2) {
        const bg2 = sg2.createLinearGradient(0, 0, 512, 160);
        bg2.addColorStop(0, '#2a0d12');
        bg2.addColorStop(0.5, '#5e141c');
        bg2.addColorStop(1, '#2a0d12');
        sg2.fillStyle = bg2;
        sg2.fillRect(0, 0, 512, 160);
        sg2.strokeStyle = '#f0c35a';
        sg2.lineWidth = 8;
        sg2.strokeRect(6, 6, 500, 148);
        sg2.textAlign = 'center';
        sg2.textBaseline = 'middle';
        sg2.font = '900 40px system-ui, sans-serif';
        sg2.fillStyle = '#fef3c7';
        sg2.fillText('🏪 CỬA HÀNG ĐỆ TỬ', 256, 58);
        sg2.font = '800 26px system-ui, sans-serif';
        sg2.fillStyle = '#f0c35a';
        sg2.fillText('CHIÊU MỘ $1 • $10 • $100 GOJO', 256, 114);
      }
      const shopSignTex = new THREE.CanvasTexture(sc2);
      shopSignTex.colorSpace = THREE.SRGBColorSpace;
      const shopSignMat = new THREE.MeshBasicMaterial({ map: shopSignTex });
      const shopSignMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 1.55), shopSignMat);
      shopSignMesh.position.set(0.46, 5.2, 0);
      shopSignMesh.rotation.y = Math.PI * 0.5;
      shopGroup.add(shopSignMesh);
    }
    gameplayRoot.add(shopGroup);

    // 3D Đại Đấu Trường Huyền Thoại (Boss Stadium Entrance) on East Sidewalk (54.4, 0.22, 80.0)
    stadiumCorona = createCoronaMesh(0x38bdf8, true);
    stadiumCorona.position.set(LANDMARKS.stadiumEntrance.x, LANDMARKS.stadiumEntrance.y, LANDMARKS.stadiumEntrance.z);
    gameplayRoot.add(stadiumCorona);

    const stadFacade = new THREE.Group();
    stadFacade.position.set(57.2, 0.22, 80.0);
    const stadPillarMat = new THREE.MeshStandardMaterial({
      color: 0x0c4a6e,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
      roughness: 0.28,
      metalness: 0.45
    });
    const stadDoorRecess = new THREE.Mesh(new THREE.BoxGeometry(0.42, 4.0, 4.8), doorDarkMat);
    stadDoorRecess.position.set(0.15, 2.0, 0);
    stadFacade.add(stadDoorRecess);
    for (const sz of [-2.6, 2.6]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.8, 0.48), stadPillarMat);
      col.position.set(-0.08, 2.4, sz);
      stadFacade.add(col);
    }
    const stadLintel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 5.8), goldFrameMat);
    stadLintel.position.set(-0.1, 4.85, 0);
    stadFacade.add(stadLintel);
    if (typeof document !== 'undefined') {
      const sc3 = document.createElement('canvas');
      sc3.width = 512;
      sc3.height = 160;
      const sg3 = sc3.getContext('2d');
      if (sg3) {
        const bg3 = sg3.createLinearGradient(0, 0, 512, 160);
        bg3.addColorStop(0, '#081b38');
        bg3.addColorStop(0.5, '#0f3460');
        bg3.addColorStop(1, '#081b38');
        sg3.fillStyle = bg3;
        sg3.fillRect(0, 0, 512, 160);
        sg3.strokeStyle = '#38bdf8';
        sg3.lineWidth = 8;
        sg3.strokeRect(6, 6, 500, 148);
        sg3.textAlign = 'center';
        sg3.textBaseline = 'middle';
        sg3.font = '900 36px system-ui, sans-serif';
        sg3.fillStyle = '#fde047';
        sg3.fillText('⚽ ĐẠI ĐẤU TRƯỜNG BOSS', 256, 58);
        sg3.font = '800 26px system-ui, sans-serif';
        sg3.fillStyle = '#7dd3fc';
        sg3.fillText('MESSI & RONALDO • THƯỞNG $100,000', 256, 114);
      }
      const stadTex = new THREE.CanvasTexture(sc3);
      stadTex.colorSpace = THREE.SRGBColorSpace;
      const stadSignMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.7), new THREE.MeshBasicMaterial({ map: stadTex }));
      stadSignMesh.position.set(-0.48, 5.85, 0);
      stadSignMesh.rotation.y = -Math.PI * 0.5;
      stadFacade.add(stadSignMesh);
    }
    gameplayRoot.add(stadFacade);

    // Tulen Lôi Điểu 3D Electric Lock-On Reticle
    tulenReticleGroup = new THREE.Group();
    tulenReticleGroup.visible = false;
    const tRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.92, side: THREE.DoubleSide });
    const tCoreMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.72, side: THREE.DoubleSide });
    const tRingOuter = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.28, 28), tRingMat);
    tRingOuter.rotation.x = -Math.PI / 2;
    tRingOuter.position.y = 0.08;
    const tRingMid = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.055, 8, 24), tCoreMat);
    tRingMid.rotation.x = Math.PI / 2;
    tRingMid.position.y = 1.1;
    const tBeacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.22, 8.5, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.34, side: THREE.DoubleSide })
    );
    tBeacon.position.y = 4.35;
    tulenReticleGroup.add(tRingOuter, tRingMid, tBeacon);
    tulenReticleGroup.userData = { tRingOuter, tRingMid, tBeacon };
    gameplayRoot.add(tulenReticleGroup);

    activeStageCorona = createCoronaMesh(0xf0c35a, false);
    activeStageCorona.visible = false;
    gameplayRoot.add(activeStageCorona);

    buildFIBProps();

    spawnPickup('health', 82, getGroundY(82, 134, 0.22), 134, 50, true);
    spawnPickup('health', -198, 3.8, 2, 50, true);
    spawnPickup('armor', 136, getGroundY(136, 84, 0.22), 84, 75, true);
    spawnPickup('armor', 146, getGroundY(146, -10, 0.22), -10, 75, true);
    spawnPickup('armor', -232, 3.8, -6, 75, true);
  }

  function spawnPickup(type, x, y, z, value = 100, persistent = false) {
    const group = new THREE.Group();
    let glowColor = 0xf0c35a;

    if (type === 'cash') {
      const bill1 = new THREE.Mesh(sharedGeos.cashBill, sharedMats.cashGreen);
      const bill2 = new THREE.Mesh(sharedGeos.cashBill, sharedMats.cashGreen);
      bill2.position.set(0.03, 0.08, -0.02);
      bill2.rotation.y = 0.18;
      const band = new THREE.Mesh(sharedGeos.cashBand, sharedMats.cashBand);
      band.position.y = 0.04;
      group.add(bill1, bill2, band);
      glowColor = 0xf0c35a;
    } else if (type === 'health') {
      const box = new THREE.Mesh(sharedGeos.medKit, sharedMats.medWhite);
      const ch = new THREE.Mesh(sharedGeos.medCrossH, sharedMats.medRed);
      ch.position.y = 0.15;
      const cv = new THREE.Mesh(sharedGeos.medCrossV, sharedMats.medRed);
      cv.position.y = 0.15;
      group.add(box, ch, cv);
      glowColor = 0x2ec486;
    } else if (type === 'armor') {
      group.add(new THREE.Mesh(sharedGeos.armorVest, sharedMats.armorBlue));
      glowColor = 0x3ea6e8;
    } else if (type === 'briefcase') {
      const body = new THREE.Mesh(sharedGeos.briefcaseBody, sharedMats.chromeCase);
      const handle = new THREE.Mesh(sharedGeos.briefcaseHandle, sharedMats.chromeCase);
      handle.position.y = 0.21;
      const beam = createCoronaMesh(0x2ec486, true);
      beam.position.y = -0.32;
      group.add(body, handle, beam);
      glowColor = 0x2ec486;
    }

    const ringMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(sharedGeos.pickupGlow, ringMat);
    ring.position.y = -0.26;
    group.add(ring);

    group.position.set(x, y + 0.35, z);
    gameplayRoot.add(group);

    const item = {
      type, x, y, z, value, persistent,
      respawnTimer: 0,
      active: true,
      life: persistent || type === 'briefcase' ? 999999 : 65,
      mesh: group
    };
    pickups.push(item);
    return item;
  }

  function removePickup(item) {
    if (item.mesh?.parent) item.mesh.parent.remove(item.mesh);
    const idx = pickups.indexOf(item);
    if (idx !== -1) pickups.splice(idx, 1);
  }

  function spawnVisualTracer(x1, y1, z1, x2, y2, z2, style = false) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 0.2) return;
    const mat =
      style === 'gojo' ? sharedMats.tracerGojo
      : style === 'ally' ? sharedMats.tracerAlly
      : style ? sharedMats.tracerHeli
      : sharedMats.tracerEnemy;
    const mesh = new THREE.Mesh(sharedGeos.tracerBox, mat);
    mesh.position.set((x1 + x2) * 0.5, (y1 + y2) * 0.5, (z1 + z2) * 0.5);
    const thick = style === 'gojo' ? 2.4 : 1.0;
    mesh.scale.set(thick, thick, Math.min(len, 14.0));
    mesh.lookAt(x2, y2, z2);
    gameplayRoot.add(mesh);
    tracers.push({ mesh, life: style === 'gojo' ? 0.18 : 0.11, maxLife: 0.18 });
  }

  // ==========================================================================
  // ROAD GRAPH & GPS
  // ==========================================================================
  const gridNodes = [];
  const gridNodeMap = new Map();
  for (let xi = 0; xi < AVENUES_X.length; xi++) {
    for (let zi = 0; zi < STREETS_Z.length; zi++) {
      const id = `${xi},${zi}`;
      const node = { id, xi, zi, x: AVENUES_X[xi], z: STREETS_Z[zi], neighbors: [] };
      gridNodes.push(node);
      gridNodeMap.set(id, node);
    }
  }
  for (const n of gridNodes) {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nb = gridNodeMap.get(`${n.xi + dx},${n.zi + dz}`);
      if (nb) n.neighbors.push(nb);
    }
  }

  function nearestGridNode(x, z) {
    let best = gridNodes[0];
    let bestD = Infinity;
    for (let i = 0; i < gridNodes.length; i++) {
      const n = gridNodes[i];
      const d = dist2D(x, z, n.x, n.z);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  }

  function computeFallbackGPS(x1, z1, x2, z2) {
    const start = nearestGridNode(x1, z1);
    const goal = nearestGridNode(x2, z2);
    if (!start || !goal) return [{ x: x1, z: z1 }, { x: x2, z: z2 }];
    if (start === goal) return [{ x: x1, z: z1 }, { x: start.x, z: start.z }, { x: x2, z: z2 }];

    const gScore = new Map([[start, 0]]);
    const cameFrom = new Map();
    const open = [start];
    const visited = new Set();

    while (open.length > 0) {
      open.sort((a, b) => ((gScore.get(a) ?? 1e9) + dist2D(a.x, a.z, goal.x, goal.z)) - ((gScore.get(b) ?? 1e9) + dist2D(b.x, b.z, goal.x, goal.z)));
      const current = open.shift();
      if (current === goal) break;
      visited.add(current);
      for (const nb of current.neighbors) {
        if (visited.has(nb)) continue;
        const tentative = (gScore.get(current) ?? 1e9) + dist2D(current.x, current.z, nb.x, nb.z);
        if (tentative < (gScore.get(nb) ?? Infinity)) {
          cameFrom.set(nb, current);
          gScore.set(nb, tentative);
          if (!open.includes(nb)) open.push(nb);
        }
      }
    }

    const path = [];
    let cur = goal;
    while (cur) {
      path.push({ x: cur.x, z: cur.z });
      cur = cameFrom.get(cur);
    }
    path.reverse();
    return [{ x: x1, z: z1 }, ...path, { x: x2, z: z2 }];
  }

  function updateGPSRoute(destX, destZ) {
    const p = ctx.player;
    gpsWaypoints.length = 0;
    if (!p || !Number.isFinite(destX) || !Number.isFinite(destZ)) return;

    let routed = null;
    if (ctx.world?.findGPSPath) {
      try {
        const res = ctx.world.findGPSPath(p.x, p.z, destX, destZ);
        if (Array.isArray(res) && res.length >= 2) routed = res;
      } catch (_) {}
    }
    if (!routed) routed = computeFallbackGPS(p.x, p.z, destX, destZ);

    gpsWaypoints.push({ x: p.x, z: p.z });
    for (let i = 0; i < routed.length; i++) {
      const pt = routed[i];
      if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.z)) {
        gpsWaypoints.push({ x: pt.x, z: pt.z });
      }
    }
    const last = gpsWaypoints[gpsWaypoints.length - 1];
    if (!last || dist2D(last.x, last.z, destX, destZ) > 1.5) {
      gpsWaypoints.push({ x: destX, z: destZ });
    }
  }

  function setGPSTarget(x, z) {
    if (x === null || z === null || !Number.isFinite(x) || !Number.isFinite(z)) {
      gpsTarget = null;
      gpsWaypoints.length = 0;
      return;
    }
    gpsTarget = { x, z };
    gpsRefreshTimer = 0;
    updateGPSRoute(x, z);
  }

  function isTrafficLightRed(ix, iz, dirX, dirZ) {
    if (ctx.world?.getTrafficLightState) {
      try {
        const s = ctx.world.getTrafficLightState(ix, iz, dirX, dirZ);
        if (typeof s === 'string') return s.toUpperCase() !== 'GREEN';
      } catch (_) {}
    }
    return false;
  }

  // ==========================================================================
  // 1. LIVING CITY TRAFFIC AI (Offline Mode; Cleared cleanly in Online Room)
  // ==========================================================================
  const TRAFFIC_TYPES = ['sedan_lux', 'suv', 'taxi', 'taxi', 'suv', 'sedan_lux', 'banshee', 'obey9f'];

  function computeLaneCoords(fromNode, toNode, progress, extraOffset = 0) {
    const dx = toNode.x - fromNode.x;
    const dz = toNode.z - fromNode.z;
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len;
    const uz = dz / len;
    const rightX = -uz;
    const rightZ = ux;
    const isBoulevard = Math.abs(fromNode.x - 40) < 1 && Math.abs(toNode.x - 40) < 1;
    const laneOffset = (isBoulevard ? 5.2 : 3.8) + extraOffset;
    return {
      x: lerp(fromNode.x, toNode.x, progress) + rightX * laneOffset,
      z: lerp(fromNode.z, toNode.z, progress) + rightZ * laneOffset,
      ux, uz, rightX, rightZ,
      yaw: Math.atan2(ux, uz),
      len
    };
  }

  function pickNextTrafficNode(fromNode, currentNode) {
    const candidates = currentNode.neighbors.filter((n) => n !== fromNode);
    if (candidates.length === 0) return fromNode || currentNode.neighbors[0];
    return pickRandom(candidates);
  }

  function spawnOneTrafficCar(nearPlayer = true) {
    if (ctx.mp?.connected) return null;
    const px = ctx.player?.x ?? 26;
    const pz = ctx.player?.z ?? 28;

    for (let attempt = 0; attempt < 24; attempt++) {
      const fromNode = pickRandom(gridNodes);
      const toNode = pickRandom(fromNode.neighbors);
      if (!toNode) continue;
      const progress = randRange(0.18, 0.78);
      const lane = computeLaneCoords(fromNode, toNode, progress);
      const dPlayer = dist2D(lane.x, lane.z, px, pz);
      if (nearPlayer && (dPlayer < 28 || dPlayer > 165)) continue;

      let blocked = false;
      const vList = ctx.vehicles?.list || [];
      for (let i = 0; i < vList.length; i++) {
        const v = vList[i];
        if (v && dist2D(lane.x, lane.z, v.x, v.z) < 12) { blocked = true; break; }
      }
      if (blocked) continue;

      const type = Math.random() < 0.08 ? 'police' : pickRandom(TRAFFIC_TYPES);
      const y = getGroundY(lane.x, lane.z, 0.05);
      const car = safeSpawnVehicle(type, lane.x, y, lane.z, lane.yaw, {
        isTraffic: true,
        aiControlled: true
      });
      if (!car) return null;

      const entry = {
        car, fromNode, toNode, progress,
        cruiseSpeed: randRange(11.5, 16.5),
        curSpeed: randRange(6, 12),
        yieldOffset: 0,
        panicTimer: 0,
        nearMissCooldown: 0
      };
      trafficCars.push(entry);
      return entry;
    }
    return null;
  }

  function clearTrafficCars() {
    for (let i = trafficCars.length - 1; i >= 0; i--) {
      safeRemoveVehicle(trafficCars[i].car);
      trafficCars.splice(i, 1);
    }
  }

  function applyAICarKinematics(car, targetX, targetZ, targetYaw, speed, steerHint, braking, dt) {
    if (
      vehicleIntegratesAI === null &&
      car._gpCheckReady &&
      Math.hypot(car._gpExpectedVx, car._gpExpectedVz) > 2.0 &&
      dt > 0.001
    ) {
      const moved = dist2D(car.x, car.z, car._gpSavedX, car._gpSavedZ);
      vehicleIntegratesAI = moved > Math.hypot(car._gpExpectedVx, car._gpExpectedVz) * dt * 0.35;
    }

    car.yaw = targetYaw;
    car.vx = Math.sin(targetYaw) * speed;
    car.vz = Math.cos(targetYaw) * speed;
    car.speed = speed;
    car.steer = steerHint;
    car.steerAngle = steerHint * 0.38;
    car.braking = braking;
    car.brake = braking ? 1 : 0;
    car.throttle = braking ? 0 : speed > 0.4 ? 0.55 : 0;

    if (!vehicleIntegratesAI) {
      car.x = targetX;
      car.z = targetZ;
    } else {
      car.x = lerp(car.x, targetX, clamp(dt * 4.5, 0, 1));
      car.z = lerp(car.z, targetZ, clamp(dt * 4.5, 0, 1));
    }
    car.y = getGroundY(car.x, car.z, 0.05);

    if (car.mesh) {
      car.mesh.position.set(car.x, car.y, car.z);
      car.mesh.rotation.y = car.yaw;
    }

    car._gpSavedX = car.x;
    car._gpSavedZ = car.z;
    car._gpExpectedVx = car.vx;
    car._gpExpectedVz = car.vz;
    car._gpCheckReady = true;
  }

  function updateTrafficAI(dt, rawDt) {
    if (ctx.mp?.connected) {
      if (trafficCars.length > 0) clearTrafficCars();
      return;
    }

    const p = ctx.player;
    const px = p?.x ?? 26;
    const pz = p?.z ?? 28;
    const playerCar = getPlayerVehicle();

    for (let i = trafficCars.length - 1; i >= 0; i--) {
      const t = trafficCars[i];
      const car = t.car;
      if (!car || car.destroyed || car.dead || car === playerCar || (ctx.vehicles?.list && !ctx.vehicles.list.includes(car))) {
        if (car) {
          car.isTraffic = false;
          car.aiControlled = false;
        }
        trafficCars.splice(i, 1);
        continue;
      }
      if (dist2D(car.x, car.z, px, pz) > 195) {
        safeRemoveVehicle(car);
        trafficCars.splice(i, 1);
      }
    }

    let guard = 0;
    while (trafficCars.length < TARGET_TRAFFIC_COUNT && guard++ < 6) {
      if (!spawnOneTrafficCar(true)) break;
    }

    let sirenSource = null;
    const vList = ctx.vehicles?.list || [];
    for (let i = 0; i < vList.length; i++) {
      const v = vList[i];
      if (v && (v.sirenActive || v.siren)) { sirenSource = v; break; }
    }

    for (let i = 0; i < trafficCars.length; i++) {
      const t = trafficCars[i];
      const car = t.car;
      if (t.nearMissCooldown > 0) t.nearMissCooldown -= rawDt;

      if (gunfireAlert.timer > 0 && dist2D(car.x, car.z, gunfireAlert.x, gunfireAlert.z) < 46) {
        t.panicTimer = 9.0;
      }
      if (t.panicTimer > 0) t.panicTimer -= dt;

      let yielding = false;
      if (sirenSource && sirenSource !== car && dist2D(car.x, car.z, sirenSource.x, sirenSource.z) < 32) {
        yielding = true;
      }
      t.yieldOffset = lerp(t.yieldOffset, yielding ? 1.85 : 0, clamp(dt * 3.0, 0, 1));

      const segLen = dist2D(t.fromNode.x, t.fromNode.z, t.toNode.x, t.toNode.z) || 80;
      const remDist = (1 - t.progress) * segLen;
      const laneNow = computeLaneCoords(t.fromNode, t.toNode, t.progress, t.yieldOffset);

      let desiredSpeed = t.panicTimer > 0 ? t.cruiseSpeed * 1.45 : yielding ? 2.5 : t.cruiseSpeed;
      let braking = false;

      if (t.panicTimer <= 0 && remDist > 8.5 && remDist < 22.0) {
        if (isTrafficLightRed(t.toNode.x, t.toNode.z, laneNow.ux, laneNow.uz)) {
          desiredSpeed = 0;
          braking = true;
        }
      }

      const fwdX = Math.sin(car.yaw);
      const fwdZ = Math.cos(car.yaw);
      for (let j = 0; j < vList.length; j++) {
        const other = vList[j];
        if (!other || other === car) continue;
        const ox = other.x - car.x;
        const oz = other.z - car.z;
        const ahead = ox * fwdX + oz * fwdZ;
        if (ahead > 2.2 && ahead < 16.5) {
          const lat = Math.abs(-ox * fwdZ + oz * fwdX);
          if (lat < 2.6) {
            if (ahead < 8.5) { desiredSpeed = 0; braking = true; }
            else desiredSpeed = Math.min(desiredSpeed, (other.speed ?? 0) * 0.8);
          }
        }
      }

      if (p && !playerCar && !p.inSafehouse && t.panicTimer <= 0) {
        const ox = p.x - car.x;
        const oz = p.z - car.z;
        const ahead = ox * fwdX + oz * fwdZ;
        const lat = Math.abs(-ox * fwdZ + oz * fwdX);
        if (ahead > 1.5 && ahead < 11.0 && lat < 2.2) {
          desiredSpeed = 0;
          braking = true;
        }
      }

      const accelRate = braking || desiredSpeed < t.curSpeed ? 22.0 : 9.5;
      t.curSpeed = lerp(t.curSpeed, desiredSpeed, clamp((accelRate * dt) / Math.max(1, Math.abs(desiredSpeed - t.curSpeed)), 0, 1));
      if (desiredSpeed === 0 && t.curSpeed < 0.25) t.curSpeed = 0;

      t.progress += (t.curSpeed * dt) / segLen;
      if (t.progress >= 1.0) {
        t.progress -= 1.0;
        const nextNode = pickNextTrafficNode(t.fromNode, t.toNode);
        t.fromNode = t.toNode;
        t.toNode = nextNode;
      }

      const nextLane = computeLaneCoords(t.fromNode, t.toNode, t.progress, t.yieldOffset);
      const smoothYaw = lerpAngle(car.yaw, nextLane.yaw, clamp(dt * 6.5, 0, 1));
      const steerHint = clamp(wrapAngle(nextLane.yaw - car.yaw) * 2.2, -1, 1);

      applyAICarKinematics(car, nextLane.x, nextLane.z, smoothYaw, t.curSpeed, steerHint, braking, dt);

      if (
        playerCar &&
        !p.specialActive &&
        t.nearMissCooldown <= 0 &&
        Math.hypot(playerCar.vx || 0, playerCar.vz || 0) > 16
      ) {
        const dCar = dist2D(playerCar.x, playerCar.z, car.x, car.z);
        if (dCar > 2.1 && dCar < 4.1) {
          t.nearMissCooldown = 4.0;
          rechargeSpecial(6.0);
        }
      }
    }
  }

  // ==========================================================================
  // 2. ANATOMICAL WUXIA PEDESTRIANS & ENEMIES
  // ==========================================================================
  function createFallbackHumanoidMesh(colorHex = 0x4a6fa5) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.7 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a17c, roughness: 0.65 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.72, 6, 12), mat);
    body.position.y = 0.95;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skinMat);
    head.position.y = 1.62;
    g.add(body, head);
    return g;
  }

  function buildNPCEntity(preset, x, y, z, opts = {}) {
    const scene = getScene();
    let rig = null;
    if (ctx.characters?.createHumanoid) {
      try { rig = ctx.characters.createHumanoid(preset); } catch (_) {}
    }
    const mesh = getRigObject3D(rig) || createFallbackHumanoidMesh(preset === 'cop' || preset === 'swat' ? 0x1b2a4a : 0x6c7a89);
    mesh.position.set(x, y, z);
    if (scene && !mesh.parent) scene.add(mesh);

    const maxHp = opts.maxHp ?? (preset === 'swat' ? 120 : preset === 'cop' ? 85 : preset === 'gangster' ? 95 : 65);
    const npc = {
      preset,
      type: preset,
      role: opts.role || preset,
      zone: opts.zone || 'city',
      x, y, z,
      vx: 0, vz: 0,
      yaw: opts.yaw ?? randRange(-Math.PI, Math.PI),
      hp: maxHp,
      maxHp,
      _prevHp: maxHp,
      armor: opts.armor ?? (preset === 'swat' ? 60 : 0),
      radius: 0.42,
      height: 1.82,
      dead: false,
      _deathHandled: false,
      corpseTimer: 0,
      state: opts.state || 'walk',
      brave: opts.brave ?? false,
      isEnemy: !!opts.isEnemy,
      isHostile: !!opts.isHostile,
      isGangster: preset === 'gangster' || !!opts.isGangster,
      isMissionEnemy: !!opts.isMissionEnemy,
      isMissionTarget: !!opts.isMissionTarget,
      noWantedOnKill: !!opts.noWantedOnKill,
      fixedY: opts.fixedY ?? null,
      skipAABB: !!opts.skipAABB,
      weapon: opts.weapon || 'unarmed',
      shootCooldown: randRange(0.3, 1.1),
      meleeCooldown: 0,
      panicTimer: 0,
      idleTimer: randRange(0, 4),
      turnTimer: randRange(3, 9),
      rig: rig || mesh,
      mesh,
      takeDamage(dmg, isHeadshot = false) {
        if (this.dead) return;
        let amount = Number(dmg) || 0;
        if (isHeadshot) amount *= 2.5;
        if (this.armor > 0) {
          const absorbed = Math.min(this.armor, amount * 0.65);
          this.armor -= absorbed;
          amount -= absorbed;
        }
        this.hp = Math.max(0, this.hp - amount);
      }
    };

    mesh.rotation.y = npc.yaw;
    mesh.userData = mesh.userData || {};
    mesh.userData.npc = npc;
    mesh.userData.entity = npc;
    return npc;
  }

  function removeNPCMesh(npc) {
    if (npc?.mesh?.parent) npc.mesh.parent.remove(npc.mesh);
  }

  function pickSidewalkSpawn(nearPlayer = true) {
    const px = ctx.player?.x ?? 26;
    const pz = ctx.player?.z ?? 28;
    for (let attempt = 0; attempt < 20; attempt++) {
      const alongAve = Math.random() < 0.5;
      let x = 0, z = 0, yaw = 0;
      if (alongAve) {
        const ave = pickRandom(AVENUES_X);
        const side = Math.random() < 0.5 ? -1 : 1;
        const halfRoad = Math.abs(ave - 40) < 1 ? 11.0 : 8.0;
        x = ave + side * (halfRoad + 2.1);
        z = clamp(pz + randRange(-115, 115), -205, 205);
        yaw = Math.random() < 0.5 ? 0 : Math.PI;
      } else {
        const st = pickRandom(STREETS_Z);
        const side = Math.random() < 0.5 ? -1 : 1;
        z = st + side * 10.1;
        x = clamp(px + randRange(-115, 115), -122, 212);
        yaw = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
      }
      const d = dist2D(x, z, px, pz);
      if (nearPlayer && (d < 16 || d > 145)) continue;
      return { x, y: 0.22, z, yaw };
    }
    return { x: 20, y: 0.22, z: 36, yaw: 0 };
  }

  function spawnAmbientPed(preferredZone = null) {
    const px = ctx.player?.x ?? 26;
    let zone = preferredZone;
    if (!zone) {
      const beachCount = peds.filter((p) => !p.isMissionEnemy && p.zone === 'beach').length;
      const pierCount = peds.filter((p) => !p.isMissionEnemy && p.zone === 'pier').length;
      if (beachCount < BEACH_PED_COUNT) zone = 'beach';
      else if (pierCount < PIER_PED_COUNT) zone = 'pier';
      else zone = px < -115 && Math.random() < 0.5 ? 'beach' : 'city';
    }

    if (zone === 'beach') {
      const x = randRange(-195, -135);
      const z = randRange(-130, 130);
      const ped = buildNPCEntity('beach_ped', x, getGroundY(x, z, 0.1), z, {
        zone: 'beach',
        brave: Math.random() < 0.15,
        state: Math.random() < 0.3 ? 'idle' : 'walk'
      });
      peds.push(ped);
      return ped;
    }

    if (zone === 'pier') {
      const x = randRange(-275, -156);
      const z = randRange(-22, 14);
      const ped = buildNPCEntity(Math.random() < 0.6 ? 'beach_ped' : 'ped', x, 3.8, z, {
        zone: 'pier',
        brave: Math.random() < 0.15,
        state: Math.random() < 0.35 ? 'idle' : 'walk',
        yaw: Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2
      });
      peds.push(ped);
      return ped;
    }

    const sp = pickSidewalkSpawn(true);
    const ped = buildNPCEntity('ped', sp.x, sp.y, sp.z, {
      zone: 'city',
      brave: Math.random() < 0.18,
      yaw: sp.yaw
    });
    peds.push(ped);
    return ped;
  }

  function raiseFleeingArms(rig, clock) {
    if (!rig || typeof rig !== 'object') return;
    const j = rig.joints || rig.bones || rig;
    const sL = j.shoulderL || j.leftShoulder || j.upperArmL;
    const sR = j.shoulderR || j.rightShoulder || j.upperArmR;
    const wave = Math.sin(clock * 11) * 0.22;
    if (sL?.rotation) { sL.rotation.x = -2.55 + wave; sL.rotation.z = 0.25; }
    if (sR?.rotation) { sR.rotation.x = -2.55 - wave; sR.rotation.z = -0.25; }
  }

  function fireNPCWeaponAtPlayer(shooter, weaponId, accuracySpread, damage, isHeli = false) {
    const p = ctx.player;
    if (!p || p.dead || deathArrestState.mode || p.inSafehouse) return;

    const sx = shooter.x;
    const sy = (shooter.y ?? 0) + (isHeli ? -0.8 : 1.42);
    const sz = shooter.z;

    const playerCar = getPlayerVehicle();
    const tx = (playerCar ? playerCar.x : p.x) + randRange(-accuracySpread, accuracySpread);
    const ty = (playerCar ? playerCar.y + 0.85 : p.y + 1.05) + randRange(-accuracySpread * 0.5, accuracySpread * 0.5);
    const tz = (playerCar ? playerCar.z : p.z) + randRange(-accuracySpread, accuracySpread);

    spawnVisualTracer(sx, sy, sz, tx, ty, tz, isHeli);
    ctx.audio?.playWeaponShot?.(weaponId === 'carbine' ? 'carbine' : weaponId === 'smg' ? 'smg' : 'pistol', 0.35);

    if (!checkClearLOS(sx, sy, sz, p.x, p.y + 1.1, p.z)) return;

    const hitDist = dist2D(tx, tz, playerCar ? playerCar.x : p.x, playerCar ? playerCar.z : p.z);
    if (playerCar) {
      if (hitDist < 2.2) {
        ctx.vehicles?.damageVehicle?.(playerCar, damage * 0.55, ctx);
      }
    } else if (hitDist < 0.92 && Math.abs(ty - (p.y + 1.05)) < 1.05) {
      applyDamageToPlayer(damage);
    }
  }

  function applyDamageToPlayer(amount) {
    const p = ctx.player;
    if (!p || p.dead || deathArrestState.mode || p.inSafehouse || isPlayerInvulnerable()) return;
    let dmg = Number(amount) || 0;
    if (p.specialActive) dmg *= 0.55;
    if ((p.armor || 0) > 0) {
      const absorbed = Math.min(p.armor, dmg * 0.7);
      p.armor = Math.max(0, p.armor - absorbed);
      dmg -= absorbed;
    }
    p.hp = Math.max(0, (p.hp ?? 100) - dmg);
    ctx.engine?.triggerDamageFlash?.(clamp(dmg / 26, 0.25, 0.95));
    ctx.engine?.addShake?.(0.16);
  }

  function setInvulnerabilityRemainingMs(remainingMs) {
    invulnerableUntil = Number.isFinite(remainingMs) && remainingMs > 0 ? performance.now() + remainingMs : 0;
  }

  function getInvulnerabilityRemainingMs() {
    return Math.max(0, invulnerableUntil - performance.now());
  }

  function isPlayerInvulnerable() {
    return getInvulnerabilityRemainingMs() > 0;
  }

  function setNoCooldownRemainingMs(remainingMs) {
    noCooldownUntil = Number.isFinite(remainingMs) && remainingMs > 0 ? performance.now() + remainingMs : 0;
    if (noCooldownUntil > 0) {
      tulenSkillCooldown = 0;
      gojoNukeCooldown = 0;
      legendBribeCooldown = 0;
      casinoRobCooldown = 0;
    }
  }

  function getNoCooldownRemainingMs() {
    return Math.max(0, noCooldownUntil - performance.now());
  }

  function isNoCooldownActive() {
    return getNoCooldownRemainingMs() > 0;
  }

  function revokeBuffsOnCheat() {
    invulnerableUntil = 0;
    noCooldownUntil = 0;
  }

  async function dialPhoneCode(code) {
    const p = ctx.player;
    if (!p || p.dead || p.isDead || p.isBusted || p.hp <= 0) return 'unavailable';
    if (ctx.antiCheat?.isLockedOut?.()) return 'unavailable';
    const matched = ctx.antiCheat?.matchSecretCode?.(code) || null;
    if (matched === 'ammo_cash') {
      const fullAmmoSpec = {
        pistol: { reserve: 999, clip: 16 },
        smg: { reserve: 999, clip: 30 },
        carbine: { reserve: 999, clip: 30 },
        shotgun: { reserve: 999, clip: 8 },
        grenade: { reserve: 999, clip: 6 }
      };
      if (!p.ammo || typeof p.ammo !== 'object') p.ammo = {};
      if (!p.clip || typeof p.clip !== 'object') p.clip = {};
      for (const [wid, spec] of Object.entries(fullAmmoSpec)) {
        grantWeaponToPlayer(wid, spec.reserve);
        p.ammo[wid] = Math.max(Number(p.ammo[wid]) || 0, spec.reserve);
        p.clip[wid] = spec.clip;
        if (p.clipAmmo && typeof p.clipAmmo === 'object') p.clipAmmo[wid] = spec.clip;
      }
      syncPlayerCash(getPlayerCash() + 1_000_000, true);
      ctx.audio?.playChime?.();
      return 'ammo_and_cash';
    }
    if (matched === 'no_cooldown') {
      setNoCooldownRemainingMs(NO_COOLDOWN_DURATION_MS);
      ctx.audio?.playChime?.();
      return 'no_cooldown';
    }
    if (matched === 'boss_secret') {
      if ((mission.active && mission.id === 4) || p.inInterior === 'stadium') {
        const ok = defeatStadiumBossesSecretly();
        return ok ? 'boss_defeated' : 'invalid';
      }
      return 'invalid';
    }
    if (matched !== 'invuln') return 'invalid';
    const remainingMs = ctx.mp?.connected
      ? await ctx.mp.requestPhoneCode(code)
      : INVULNERABILITY_DURATION_MS;
    if (!(remainingMs > 0)) return 'unavailable';
    setInvulnerabilityRemainingMs(remainingMs);
    return 'activated';
  }

  function handleNPCDeath(npc, killedByPlayer = true) {
    if (npc._deathHandled) return;
    npc._deathHandled = true;
    npc.dead = true;
    npc.hp = 0;
    npc.state = 'dead';
    npc.corpseTimer = 0;

    ctx.characters?.animateHumanoid?.(npc.rig, 'dead', 0.016);

    if (npc.fixedY === null || npc.y < 8.0) {
      const dropY = getGroundY(npc.x, npc.z, npc.y);
      spawnPickup('cash', npc.x + randRange(-0.35, 0.35), dropY, npc.z + randRange(-0.35, 0.35), randInt(60, 200), false);
    }

    if (killedByPlayer) {
      rechargeSpecial(14);
      ctx.ui?.triggerHitmarker?.(true);
      if (!npc.noWantedOnKill && !npc.isEnemy && !npc.isHostile && !npc.isGangster) {
        if (npc.preset === 'cop' || npc.preset === 'swat') {
          wanted.lethalForce = true;
          addCrimeHeat(38, 'kill_cop');
        } else {
          addCrimeHeat(20, 'kill_ped');
        }
      }
    }
  }

  function checkVehiclePedCollisions(npc) {
    if (npc.dead || npc.fixedY !== null) return;
    const vList = ctx.vehicles?.list || [];
    const playerCar = getPlayerVehicle();

    for (let i = 0; i < vList.length; i++) {
      const v = vList[i];
      if (!v || v.type === 'heli') continue;
      const spd = Math.hypot(v.vx || 0, v.vz || 0);
      if (spd < 4.5) continue;
      if (Math.abs((v.y ?? 0) - npc.y) > 1.8) continue;
      const d = dist2D(v.x, v.z, npc.x, npc.z);
      if (d < 1.85) {
        const dmg = spd * 6.8;
        npc.vx = (v.vx || 0) * 0.65;
        npc.vz = (v.vz || 0) * 0.65;
        npc.hp = Math.max(0, npc.hp - dmg);
        ctx.characters?.spawnParticles?.('blood', npc.x, npc.y + 1.0, npc.z, 8);
        if (v === playerCar) {
          ctx.engine?.addShake?.(0.22);
          if (npc.hp <= 0) handleNPCDeath(npc, true);
          else if (!npc.isEnemy && !npc.isGangster) {
            addCrimeHeat(npc.preset === 'cop' || npc.preset === 'swat' ? 28 : 12, 'hit_ped');
          }
        }
        break;
      }
    }
  }

  function updatePedestriansAndEnemies(dt) {
    const p = ctx.player;
    if (!p) return;
    const px = p.x, pz = p.z;

    let ambientCount = 0;
    for (let i = peds.length - 1; i >= 0; i--) {
      const ped = peds[i];
      if (!ped.isMissionEnemy) ambientCount++;

      if (ped.hp < ped._prevHp) {
        const killed = ped.hp <= 0;
        ped._prevHp = ped.hp;
        rechargeSpecial(4);
        ctx.ui?.triggerHitmarker?.(killed);
        if (!killed) {
          if (ped.isEnemy || ped.isGangster || ped.brave) {
            ped.state = 'fight';
            ped.isHostile = true;
          } else {
            ped.state = 'flee';
            ped.panicTimer = 14;
            addCrimeHeat(14, 'shoot_ped');
          }
        }
      }

      if (ped.hp <= 0 && !ped._deathHandled) handleNPCDeath(ped, true);

      if (ped.dead) {
        ped.corpseTimer += dt;
        ped.x += ped.vx * dt;
        ped.z += ped.vz * dt;
        ped.vx *= Math.max(0, 1 - dt * 5);
        ped.vz *= Math.max(0, 1 - dt * 5);
        if (ped.fixedY === null) ped.y = getGroundY(ped.x, ped.z, ped.y);
        ped.mesh.position.set(ped.x, ped.y, ped.z);
        ctx.characters?.animateHumanoid?.(ped.rig, 'dead', dt);
        if (!ped.isMissionEnemy && ped.corpseTimer > 12) {
          removeNPCMesh(ped);
          peds.splice(i, 1);
          ambientCount--;
        }
        continue;
      }

      const dPlayer = dist2D(ped.x, ped.z, px, pz);
      if (!ped.isMissionEnemy && dPlayer > 165) {
        const zType = ped.zone;
        // These NPCs belong to fixed zones. Respawning them there leaves them just as far away.
        if (p.inSafehouse || zType === 'beach' || zType === 'pier') {
          ped.mesh.visible = false;
          continue;
        }
        removeNPCMesh(ped);
        peds.splice(i, 1);
        ambientCount--;
        spawnAmbientPed(zType);
        ambientCount++;
        continue;
      }

      if (dPlayer < 72 || ped.isMissionEnemy) {
        checkVehiclePedCollisions(ped);
        if (ped.dead) continue;
      }

      if (!ped.isMissionEnemy && !ped.isEnemy && gunfireAlert.timer > 0) {
        if (dist2D(ped.x, ped.z, gunfireAlert.x, gunfireAlert.z) < 48) {
          if (ped.brave && dPlayer < 12) {
            ped.state = 'fight';
            ped.isHostile = true;
          } else {
            ped.state = 'flee';
            ped.panicTimer = 12;
          }
        }
      }

      if (!ped.isMissionEnemy && !getPlayerVehicle() && !p.inSafehouse && dPlayer < 0.88 && Math.abs(p.y - ped.y) < 1.4) {
        const pushAngle = Math.atan2(ped.x - px, ped.z - pz);
        ped.x += Math.sin(pushAngle) * 0.35;
        ped.z += Math.cos(pushAngle) * 0.35;
        if (ped.brave) {
          ped.state = 'fight';
          ped.isHostile = true;
        } else if (Math.hypot(p.vx || 0, p.vz || 0) > 4.2) {
          ped.state = 'flee';
          ped.panicTimer = 7.0;
        }
      }

      let animState = 'idle';

      if (ped.isEnemy || ped.isHostile || ped.state === 'fight') {
        const toPX = px - ped.x;
        const toPZ = pz - ped.z;
        const distP = Math.hypot(toPX, toPZ) || 1;
        ped.yaw = lerpAngle(ped.yaw, Math.atan2(toPX, toPZ), clamp(dt * 8, 0, 1));

        if (ped.weapon && ped.weapon !== 'unarmed') {
          if (ped.fixedY === null && distP > 16 && distP < 75 && ped.zone !== 'pier_guard') {
            ped.x += (toPX / distP) * 3.4 * dt;
            ped.z += (toPZ / distP) * 3.4 * dt;
            animState = 'run';
          } else {
            animState = ped.weapon === 'carbine' ? 'aim_2h' : 'aim_1h';
          }

          ped.shootCooldown -= dt;
          if (ped.shootCooldown <= 0 && distP < 68) {
            ped.shootCooldown = ped.weapon === 'smg' ? randRange(0.28, 0.55) : randRange(0.55, 1.05);
            const spread = ped.fixedY !== null ? 1.35 : 1.15;
            const dmg = ped.weapon === 'carbine' ? 7 : ped.weapon === 'smg' ? 5 : 6;
            fireNPCWeaponAtPlayer(ped, ped.weapon, spread, dmg, false);
          }
        } else {
          if (distP > 1.35 && distP < 28) {
            ped.x += (toPX / distP) * 3.85 * dt;
            ped.z += (toPZ / distP) * 3.85 * dt;
            animState = 'run';
          } else if (distP <= 1.55) {
            animState = 'melee';
            ped.meleeCooldown -= dt;
            if (ped.meleeCooldown <= 0) {
              ped.meleeCooldown = 0.95;
              applyDamageToPlayer(8);
            }
          }
        }
      } else if (ped.state === 'flee' && ped.panicTimer > 0) {
        ped.panicTimer -= dt;
        const awayX = ped.x - gunfireAlert.x;
        const awayZ = ped.z - gunfireAlert.z;
        const awayLen = Math.hypot(awayX, awayZ) || 1;
        ped.yaw = lerpAngle(ped.yaw, Math.atan2(awayX, awayZ), clamp(dt * 7, 0, 1));
        ped.x += (awayX / awayLen) * 4.7 * dt;
        ped.z += (awayZ / awayLen) * 4.7 * dt;
        animState = 'run';
        if (ped.panicTimer <= 0) ped.state = 'walk';
      } else {
        ped.turnTimer -= dt;
        if (ped.state === 'idle') {
          ped.idleTimer -= dt;
          animState = 'idle';
          if (ped.idleTimer <= 0) { ped.state = 'walk'; ped.turnTimer = randRange(5, 11); }
        } else {
          if (ped.turnTimer <= 0) {
            ped.turnTimer = randRange(4, 10);
            if (ped.zone === 'beach' || ped.zone === 'pier') {
              if (Math.random() < 0.28) { ped.state = 'idle'; ped.idleTimer = randRange(2.5, 6.0); }
              else ped.yaw += randRange(-1.4, 1.4);
            } else {
              ped.yaw += (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2);
            }
          }
          ped.x += Math.sin(ped.yaw) * 1.55 * dt;
          ped.z += Math.cos(ped.yaw) * 1.55 * dt;
          animState = 'walk';

          if (ped.zone === 'beach') {
            if (ped.x < -195 || ped.x > -135) ped.yaw = -ped.yaw;
            if (ped.z < -150 || ped.z > 150) ped.yaw = Math.PI - ped.yaw;
            ped.x = clamp(ped.x, -195, -135);
          } else if (ped.zone === 'pier') {
            if (ped.x < -282 || ped.x > -154) ped.yaw = -ped.yaw;
            if (ped.z < -24 || ped.z > 16) ped.yaw = Math.PI - ped.yaw;
            ped.x = clamp(ped.x, -284, -153);
            ped.z = clamp(ped.z, -25, 17);
          }
        }
      }

      if (!ped.skipAABB && ctx.world?.resolveCircleAABB) {
        const prevX = ped.x, prevZ = ped.z;
        ctx.world.resolveCircleAABB(ped, 0.38);
        if (dist2D(prevX, prevZ, ped.x, ped.z) > 0.02 && !ped.isEnemy) ped.yaw += Math.PI * 0.55;
      }

      if (ped.fixedY !== null) ped.y = ped.fixedY;
      else if (ped.zone === 'pier' && ped.x >= -292 && ped.x <= -150 && ped.z >= -30 && ped.z <= 20) ped.y = 3.8;
      else ped.y = getGroundY(ped.x, ped.z, 0.22);

      ped.mesh.position.set(ped.x, ped.y, ped.z);
      ped.mesh.rotation.y = ped.yaw;
      if (!ped.isMissionEnemy && dPlayer > (isMobile ? 78 : 95)) {
        ped.mesh.visible = false;
      } else {
        ped.mesh.visible = true;
        if (dPlayer < 36 || ped.isMissionEnemy || ((pedAnimFrameCounter + i) % 3 === 0)) {
          const animDt = dPlayer < 36 || ped.isMissionEnemy ? dt : dt * 3;
          ctx.characters?.animateHumanoid?.(ped.rig, animState, animDt);
          if (ped.state === 'flee') raiseFleeingArms(ped.rig, elapsedClock + i * 0.7);
        }
      }
    }
    pedAnimFrameCounter = (pedAnimFrameCounter + 1) | 0;

    let spawnGuard = 0;
    while (ambientCount < TARGET_PED_COUNT && spawnGuard++ < 6) {
      spawnAmbientPed(null);
      ambientCount++;
    }
  }

  // ==========================================================================
  // 3. 5-STAR LỤC PHIẾN MÔN & CẨM Y VỆ WANTED SYSTEM
  // ==========================================================================
  const policeVehicles = [];

  function heatToStars(h) {
    if (h >= 92) return 5;
    if (h >= 74) return 4;
    if (h >= 54) return 3;
    if (h >= 32) return 2;
    if (h >= 12) return 1;
    return 0;
  }

  function starsToMinHeat(s) {
    return [0, 18, 38, 60, 80, 96][clamp(s, 0, 5)];
  }

  function setWantedStars(stars) {
    const s = clamp(Math.round(stars), 0, 5);
    wanted.stars = s;
    wanted.heat = s === 0 ? 0 : Math.max(wanted.heat, starsToMinHeat(s));
    if (s === 0) {
      wanted.spotted = false;
      wanted.evadeTimer = 0;
      wanted.flashing = false;
      wanted.lethalForce = false;
      wanted.arrestProgress = 0;
      clearPoliceUnits(false);
    } else {
      wanted.spotted = true;
      wanted.evadeTimer = 0;
      wanted.flashing = false;
      if (s >= 2) wanted.lethalForce = true;
    }
  }

  function addCrimeHeat(amount = 15, reason = 'crime') {
    const p = ctx.player;
    if (!p || p.inSafehouse || deathArrestState.mode) return;
    if (mission.active && mission.id === 3 && mission.stage < 3) return;

    const num = Number(amount) || 15;
    if (String(reason).includes('shoot') || String(reason).includes('kill') || String(reason).includes('explosion') || num >= 20) {
      wanted.lethalForce = true;
      gunfireAlert = { x: p.x, z: p.z, timer: 4.5 };
    }

    wanted.heat = clamp(wanted.heat + num, 0, 100);
    wanted.stars = Math.max(wanted.stars, heatToStars(wanted.heat));
    if (wanted.stars >= 1) {
      wanted.spotted = true;
      wanted.evadeTimer = 0;
      wanted.flashing = false;
    }
  }

  function clearPoliceUnits(immediate = false) {
    for (let i = policeVehicles.length - 1; i >= 0; i--) {
      const pv = policeVehicles[i];
      if (pv.car) {
        pv.car.sirenActive = false;
        if (immediate || dist2D(pv.car.x, pv.car.z, ctx.player?.x ?? 0, ctx.player?.z ?? 0) > 25) {
          safeRemoveVehicle(pv.car);
        }
      }
      policeVehicles.splice(i, 1);
    }
    for (let i = helicopters.length - 1; i >= 0; i--) {
      const h = helicopters[i];
      if (h.searchlightGroup?.parent) h.searchlightGroup.parent.remove(h.searchlightGroup);
      if (h.groundSpot?.parent) h.groundSpot.parent.remove(h.groundSpot);
      if (h.car) safeRemoveVehicle(h.car);
      if (h.fallbackMesh?.parent) h.fallbackMesh.parent.remove(h.fallbackMesh);
      helicopters.splice(i, 1);
    }
    for (let i = cops.length - 1; i >= 0; i--) {
      removeNPCMesh(cops[i]);
      cops.splice(i, 1);
    }
    ctx.audio?.setSiren?.(false);
  }

  function spawnFootOfficer(isSwat = false, nearX = null, nearZ = null) {
    const p = ctx.player;
    const px = nearX ?? (p?.x ?? 26);
    const pz = nearZ ?? (p?.z ?? 28);
    let sx = px, sz = pz;
    if (nearX === null) {
      const angle = randRange(0, Math.PI * 2);
      const dist = randRange(36, 56);
      sx = clamp(px + Math.cos(angle) * dist, -205, 235);
      sz = clamp(pz + Math.sin(angle) * dist, -220, 220);
    }
    const sy = getGroundY(sx, sz, 0.22);
    const officer = buildNPCEntity(isSwat ? 'swat' : 'cop', sx, sy, sz, {
      isHostile: wanted.lethalForce || isSwat,
      weapon: isSwat ? 'carbine' : 'pistol',
      maxHp: isSwat ? 120 : 85,
      armor: isSwat ? 60 : 0
    });
    if (ctx.world?.resolveCircleAABB) ctx.world.resolveCircleAABB(officer, 0.42);
    officer.mesh.position.set(officer.x, officer.y, officer.z);
    cops.push(officer);
    return officer;
  }

  function spawnPursuitVehicle(type = 'police', isRoadblock = false) {
    const p = ctx.player;
    if (!p) return null;
    const angle = isRoadblock ? (p.yaw ?? 0) : randRange(0, Math.PI * 2);
    const dist = isRoadblock ? 58 : randRange(52, 82);
    const rawX = p.x + Math.sin(angle) * dist;
    const rawZ = p.z + Math.cos(angle) * dist;
    const snap = nearestGridNode(rawX, rawZ);
    const x = snap ? snap.x + (isRoadblock ? randRange(-3.2, 3.2) : 3.5) : rawX;
    const z = snap ? snap.z + (isRoadblock ? 0 : 3.5) : rawZ;
    const y = getGroundY(x, z, 0.05);
    const yaw = isRoadblock ? (p.yaw ?? 0) + Math.PI * 0.48 : Math.atan2(p.x - x, p.z - z);

    const car = safeSpawnVehicle(type, x, y, z, yaw, {
      isPoliceUnit: true,
      aiControlled: true,
      sirenActive: true
    });
    if (!car) return null;

    const unit = { car, type, isRoadblock, deployedCrew: false };
    policeVehicles.push(unit);
    if (isRoadblock) spawnFootOfficer(type === 'swat_van', x + 2.8, z - 2.4);
    return unit;
  }

  function spawnPoliceHelicopter() {
    const p = ctx.player;
    if (!p) return null;
    const hx = p.x + 42, hy = 48, hz = p.z - 42;
    const car = safeSpawnVehicle('heli', hx, hy, hz, 0, {
      isPoliceHeli: true,
      aiControlled: true
    });
    if (!car) return null;

    const searchlightGroup = new THREE.Group();
    const coneMesh = new THREE.Mesh(sharedGeos.searchlightCone, sharedMats.searchlightBeam);
    const groundSpot = new THREE.Mesh(sharedGeos.searchlightSpot, sharedMats.searchlightGround);
    gameplayRoot.add(searchlightGroup, groundSpot);
    searchlightGroup.add(coneMesh);

    const heli = {
      x: hx, y: hy, z: hz, yaw: 0,
      orbitAngle: randRange(0, Math.PI * 2),
      hp: 280, maxHp: 280,
      shootCooldown: 1.4, burstRemaining: 0,
      car, mesh: car.mesh,
      searchlightGroup, coneMesh, groundSpot
    };
    helicopters.push(heli);
    return heli;
  }

  function checkUnitSpotsPlayer(ux, uy, uz, uyaw, maxRange, halfAngle) {
    const p = ctx.player;
    if (!p || isInAnyInterior(p) || deathArrestState.mode) return false;
    const dx = p.x - ux, dz = p.z - uz;
    const d = Math.hypot(dx, dz);
    if (d > maxRange) return false;
    if (d > 14.0 && halfAngle < Math.PI) {
      if (Math.abs(wrapAngle(Math.atan2(dx, dz) - uyaw)) > halfAngle) return false;
    }
    return checkClearLOS(ux, uy + 1.5, uz, p.x, p.y + 1.15, p.z);
  }

  function updateWantedAndPolice(dt, rawDt) {
    const p = ctx.player;
    if (!p || deathArrestState.mode) return;

    if (p.inSafehouse) {
      if (wanted.stars > 0) setWantedStars(0);
      return;
    }
    if (p.inInterior) {
      return;
    }

    if (wanted.stars <= 0) {
      wanted.heat = Math.max(0, wanted.heat - dt * 3.5);
      wanted.arrestProgress = 0;
      if (cops.length > 0 || policeVehicles.length > 0 || helicopters.length > 0) clearPoliceUnits(false);
      return;
    }

    wanted.spawnCooldown -= dt;
    wanted.roadblockCooldown -= dt;

    const desiredFootCops = [0, 3, 4, 5, 6, 8][wanted.stars];
    const desiredCars = ctx.mp?.connected ? 0 : [0, 0, 2, 2, 3, 4][wanted.stars];
    const desiredHelis = !ctx.mp?.connected && wanted.stars >= 3 ? 1 : 0;

    if (wanted.spawnCooldown <= 0) {
      wanted.spawnCooldown = 2.6;
      const liveCops = cops.filter((c) => !c.dead).length;
      if (liveCops < desiredFootCops) spawnFootOfficer(wanted.stars >= 4 && Math.random() < 0.65);
      if (policeVehicles.length < desiredCars) {
        spawnPursuitVehicle(wanted.stars >= 4 && Math.random() < 0.6 ? 'swat_van' : 'police', false);
      }
      if (helicopters.length < desiredHelis) spawnPoliceHelicopter();
    }

    if (!ctx.mp?.connected && wanted.stars >= 3 && wanted.roadblockCooldown <= 0 && getPlayerVehicle() && policeVehicles.length < desiredCars + 1) {
      wanted.roadblockCooldown = 22.0;
      spawnPursuitVehicle(wanted.stars >= 4 ? 'swat_van' : 'police', true);
    }

    let anySpotted = false;
    let arrestingOfficerNear = false;
    const playerCar = getPlayerVehicle();
    const playerSpeed = playerCar ? Math.hypot(playerCar.vx || 0, playerCar.vz || 0) : Math.hypot(p.vx || 0, p.vz || 0);

    for (let i = cops.length - 1; i >= 0; i--) {
      const cop = cops[i];
      if (cop.hp < cop._prevHp) {
        const killed = cop.hp <= 0;
        cop._prevHp = cop.hp;
        wanted.lethalForce = true;
        rechargeSpecial(3);
        ctx.ui?.triggerHitmarker?.(killed);
        addCrimeHeat(14, 'shoot_cop');
      }
      if (cop.hp <= 0 && !cop._deathHandled) {
        handleNPCDeath(cop, true);
        if (cop.preset === 'swat') {
          spawnPickup('armor', cop.x, getGroundY(cop.x, cop.z, cop.y), cop.z, 40, false);
        }
      }
      if (cop.dead) {
        cop.corpseTimer += dt;
        ctx.characters?.animateHumanoid?.(cop.rig, 'dead', dt);
        if (cop.corpseTimer > 12) { removeNPCMesh(cop); cops.splice(i, 1); }
        continue;
      }

      const dP = dist2D(cop.x, cop.z, p.x, p.z);
      if (dP > 140) { removeNPCMesh(cop); cops.splice(i, 1); continue; }

      checkVehiclePedCollisions(cop);
      if (cop.dead) continue;

      if (checkUnitSpotsPlayer(cop.x, cop.y, cop.z, cop.yaw, 48, 0.98)) anySpotted = true;

      const toPX = p.x - cop.x, toPZ = p.z - cop.z;
      cop.yaw = lerpAngle(cop.yaw, Math.atan2(toPX, toPZ), clamp(dt * 8.5, 0, 1));

      const useFirearms = wanted.lethalForce || wanted.stars >= 2 || cop.preset === 'swat';
      let animState = 'run';

      if (!useFirearms) {
        if (dP > 1.35) {
          cop.x += (toPX / Math.max(0.1, dP)) * 4.6 * dt;
          cop.z += (toPZ / Math.max(0.1, dP)) * 4.6 * dt;
        } else animState = 'aim_1h';
        if (dP <= 1.85 && Math.abs(p.y - cop.y) < 1.8 && playerSpeed < 2.4) arrestingOfficerNear = true;
      } else {
        const stopRange = cop.preset === 'swat' ? 18 : 14;
        if (dP > stopRange) {
          const runSpd = cop.preset === 'swat' ? 4.35 : 4.2;
          cop.x += (toPX / Math.max(0.1, dP)) * runSpd * dt;
          cop.z += (toPZ / Math.max(0.1, dP)) * runSpd * dt;
        } else {
          animState = cop.weapon === 'carbine' ? 'aim_2h' : 'aim_1h';
          if (dP <= 1.8 && Math.abs(p.y - cop.y) < 1.8 && playerSpeed < 1.6 && !playerCar) arrestingOfficerNear = true;
        }

        cop.shootCooldown -= dt;
        if (cop.shootCooldown <= 0 && dP < 46) {
          cop.shootCooldown = cop.preset === 'swat' ? randRange(0.24, 0.48) : randRange(0.58, 1.05);
          fireNPCWeaponAtPlayer(cop, cop.weapon, 1.25, cop.preset === 'swat' ? 7.5 : 5.5, false);
        }
      }

      if (ctx.world?.resolveCircleAABB) ctx.world.resolveCircleAABB(cop, 0.40);
      cop.y = getGroundY(cop.x, cop.z, 0.22);
      cop.mesh.position.set(cop.x, cop.y, cop.z);
      cop.mesh.rotation.y = cop.yaw;
      ctx.characters?.animateHumanoid?.(cop.rig, animState, dt);
    }

    for (let i = policeVehicles.length - 1; i >= 0; i--) {
      const unit = policeVehicles[i];
      const car = unit.car;
      if (!car || car.destroyed || car === playerCar || (ctx.vehicles?.list && !ctx.vehicles.list.includes(car))) {
        policeVehicles.splice(i, 1);
        continue;
      }

      car.sirenActive = true;
      const dP = dist2D(car.x, car.z, p.x, p.z);
      if (dP > 175) { safeRemoveVehicle(car); policeVehicles.splice(i, 1); continue; }
      if (checkUnitSpotsPlayer(car.x, car.y, car.z, car.yaw, 48, 1.15)) anySpotted = true;

      if (unit.isRoadblock && dP > 24) {
        applyAICarKinematics(car, car.x, car.z, car.yaw, 0, 0, true, dt);
        continue;
      }
      unit.isRoadblock = false;

      if (!unit.deployedCrew && ((unit.type === 'swat_van' && dP < 24) || (!playerCar && dP < 15))) {
        unit.deployedCrew = true;
        const isSwat = unit.type === 'swat_van';
        for (let k = 0; k < (isSwat ? 2 : 1); k++) {
          spawnFootOfficer(isSwat, car.x + (k === 0 ? -2.2 : 2.2), car.z + 1.5);
        }
      }

      if (!playerCar && dP < 11) {
        applyAICarKinematics(car, car.x, car.z, car.yaw, 0, 0, true, dt);
        continue;
      }

      const leadX = p.x + (playerCar ? (playerCar.vx || 0) * 0.45 : 0);
      const leadZ = p.z + (playerCar ? (playerCar.vz || 0) * 0.45 : 0);
      const desiredYaw = Math.atan2(leadX - car.x, leadZ - car.z);
      const newYaw = lerpAngle(car.yaw, desiredYaw, clamp(dt * 4.2, 0, 1));
      const spd = clamp(dP * 0.95, 11, unit.type === 'swat_van' ? 25 : 31);
      applyAICarKinematics(car, car.x + Math.sin(newYaw) * spd * dt, car.z + Math.cos(newYaw) * spd * dt, newYaw, spd, clamp(wrapAngle(desiredYaw - car.yaw) * 2.0, -1, 1), false, dt);
      ctx.world?.resolveCarAABB?.(car);
    }

    for (let i = helicopters.length - 1; i >= 0; i--) {
      const h = helicopters[i];
      if (h.car && (h.car.destroyed || (h.car.hp !== undefined && h.car.hp <= 0))) {
        if (h.searchlightGroup?.parent) h.searchlightGroup.parent.remove(h.searchlightGroup);
        if (h.groundSpot?.parent) h.groundSpot.parent.remove(h.groundSpot);
        helicopters.splice(i, 1);
        rechargeSpecial(15);
        continue;
      }

      h.orbitAngle += dt * 0.42;
      h.x = lerp(h.x, p.x + Math.cos(h.orbitAngle) * 25, clamp(dt * 1.9, 0, 1));
      h.z = lerp(h.z, p.z + Math.sin(h.orbitAngle) * 25, clamp(dt * 1.9, 0, 1));
      h.y = 48 + Math.sin(elapsedClock * 1.7) * 1.1;
      h.yaw = Math.atan2(p.x - h.x, p.z - h.z);

      if (h.car) {
        h.car.x = h.x; h.car.y = h.y; h.car.z = h.z;
        h.car.yaw = h.yaw;
      }
      if (h.mesh) {
        h.mesh.position.set(h.x, h.y, h.z);
        h.mesh.rotation.set(0.12, h.yaw, Math.sin(elapsedClock * 1.2) * 0.08);
      }

      const sweepX = p.x + Math.sin(elapsedClock * 1.45) * 4.2;
      const sweepZ = p.z + Math.cos(elapsedClock * 1.15) * 4.2;
      const sweepY = getGroundY(sweepX, sweepZ, 0.05);

      if (h.searchlightGroup) {
        h.searchlightGroup.position.set(h.x, h.y - 0.9, h.z);
        const beamVec = new THREE.Vector3(sweepX - h.x, sweepY - (h.y - 0.9), sweepZ - h.z);
        const beamLen = beamVec.length() || 48;
        beamVec.normalize();
        h.searchlightGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), beamVec);
        h.coneMesh.scale.set(1, beamLen / 56, 1);
      }
      if (h.groundSpot) h.groundSpot.position.set(sweepX, sweepY + 0.08, sweepZ);

      if (dist2D(sweepX, sweepZ, p.x, p.z) < 16 && checkClearLOS(h.x, h.y - 1, h.z, p.x, p.y + 1.2, p.z)) {
        anySpotted = true;
      }

      h.shootCooldown -= dt;
      if (h.shootCooldown <= 0 && anySpotted) {
        if (h.burstRemaining <= 0) h.burstRemaining = 4;
        fireNPCWeaponAtPlayer(h, 'carbine', 1.85, 5.5, true);
        h.burstRemaining--;
        h.shootCooldown = h.burstRemaining > 0 ? 0.14 : randRange(2.1, 3.2);
      }
    }

    if (anySpotted) {
      wanted.spotted = true;
      wanted.flashing = false;
      wanted.evadeTimer = 0;
    } else {
      wanted.spotted = false;
      wanted.flashing = true;
      wanted.evadeTimer += dt;
      if (wanted.evadeTimer >= wanted.evadeDuration) {
        setWantedStars(0);
        notifyUI('Đã cắt đuôi truy binh Lục Phiến Môn thành công!');
      }
    }

    if (arrestingOfficerNear && !ctx.mp?.connected) {
      wanted.arrestProgress += rawDt;
      if (wanted.arrestProgress >= 2.0) triggerBustedSequence();
    } else {
      wanted.arrestProgress = Math.max(0, wanted.arrestProgress - rawDt * 1.5);
    }
  }

  function triggerWastedSequence() {
    if (deathArrestState.mode) return;
    const p = ctx.player;
    if (!p) return;

    const activeCar = getPlayerVehicle();
    if (activeCar) {
      try { ctx.vehicles?.exitVehicle?.(true); } catch (_) {}
      activeCar.driver = null;
      activeCar.isPlayerDriving = false;
      p.inCar = null;
    }

    deactivateSpecial();
    deathArrestState.mode = 'wasted';
    deathArrestState.timer = 0;
    deathArrestState.duration = 2.8;

    p.dead = true;
    p.isDead = true;
    p.isWasted = true;
    if (p.rappelState) p.rappelState.active = false;
    ctx.timeScale = ctx.mp?.connected ? 1.0 : 0.25;
    ctx.engine?.triggerDamageFlash?.(1.0);
    ctx.characters?.animateHumanoid?.(p.rig, 'dead', 0.016);

    if (mission.active) failActiveMission('Trọng thương ngã gục!');
    ctx.ui?.showBanner?.('TRỌNG THƯƠNG', 'Đã được cứu chữa tại Thái Y Viện (-$200)', 'wasted');
  }

  function triggerBustedSequence() {
    if (deathArrestState.mode) return;
    const p = ctx.player;
    if (!p) return;

    const activeCar = getPlayerVehicle();
    if (activeCar) {
      try { ctx.vehicles?.exitVehicle?.(true); } catch (_) {}
      activeCar.driver = null;
      activeCar.isPlayerDriving = false;
      p.inCar = null;
    }

    deactivateSpecial();
    deathArrestState.mode = 'busted';
    deathArrestState.timer = 0;
    deathArrestState.duration = 2.6;

    p.isBusted = true;
    if (p.rappelState) p.rappelState.active = false;
    ctx.timeScale = ctx.mp?.connected ? 1.0 : 0.32;

    if (mission.active) failActiveMission('Bị Lục Phiến Môn bắt giữ!');
    ctx.ui?.showBanner?.('BỊ BẮT GIỮ', 'Nộp ngân lượng bảo lãnh tại Lục Phiến Môn (-$300)', 'busted');
  }

  function updateWastedBustedState(rawDt) {
    const p = ctx.player;
    if (!p) return;

    if (p.mpControlledDeath) return;

    if (!deathArrestState.mode) {
      if ((p.hp ?? 100) <= 0) triggerWastedSequence();
      return;
    }

    deathArrestState.timer += rawDt;
    if (!ctx.mp?.connected) {
      ctx.timeScale = deathArrestState.mode === 'wasted' ? 0.25 : 0.32;
    }

    if (deathArrestState.timer >= deathArrestState.duration) {
      const wasWasted = deathArrestState.mode === 'wasted';
      deathArrestState.mode = null;
      deathArrestState.timer = 0;
      ctx.timeScale = 1.0;

      p.dead = false;
      p.isDead = false;
      p.isWasted = false;
      p.isBusted = false;
      p.hp = p.maxHp || 100;
      p.inSafehouse = false;
      p.inInterior = null;
      clearCasinoInteriorNPCs();
      clearStadiumEntities();
      cancelTulenTargeting();

      setWantedStars(0);
      syncPlayerCash(getPlayerCash() - (wasWasted ? 200 : 300), true);

      const dest = wasWasted ? LANDMARKS.hospital : LANDMARKS.precinct;
      teleportPlayer(dest.x, dest.y, dest.z, 0);
      ctx.characters?.animateHumanoid?.(p.rig, 'idle', 0.016);
    }
  }

  // ==========================================================================
  // 4. NỘI CÔNG TÂM PHÁP (SPECIAL ABILITY — BULLET-TIME / FOCUS AURA)
  // ==========================================================================
  function rechargeSpecial(amount) {
    const p = ctx.player;
    if (!p || p.specialActive) return;
    p.special = clamp((p.special ?? 100) + amount, 0, p.maxSpecial || 100);
  }

  function activateSpecial() {
    const p = ctx.player;
    if (!p || deathArrestState.mode) return;
    p.specialActive = true;
    ctx.timeScale = ctx.mp?.connected ? 1.0 : 0.36;
    ctx.engine?.setBulletTimeVisual?.(1.0);
    ctx.audio?.playBulletTime?.(true);
  }

  function deactivateSpecial() {
    const p = ctx.player;
    if (p) p.specialActive = false;
    if (!deathArrestState.mode) ctx.timeScale = 1.0;
    ctx.engine?.setBulletTimeVisual?.(0.0);
    ctx.audio?.playBulletTime?.(false);
  }

  function updateSpecialAbility(rawDt) {
    const p = ctx.player;
    if (!p || deathArrestState.mode) return;
    if (!Number.isFinite(p.special)) p.special = 100;

    const rawPressed = !!(ctx.input?.specialJustPressed || (ctx.input?.specialPressed && !prevSpecialKey));
    prevSpecialKey = !!ctx.input?.specialPressed;

    if (rawPressed) {
      if (p.specialActive) deactivateSpecial();
      else if (p.special > 15) activateSpecial();
    }

    if (p.specialActive) {
      ctx.timeScale = ctx.mp?.connected ? 1.0 : 0.36;
      ctx.engine?.setBulletTimeVisual?.(1.0);
      p.special -= 16 * rawDt;
      if (p.special <= 0) {
        p.special = 0;
        deactivateSpecial();
      }
    } else {
      const car = getPlayerVehicle();
      if (car && car.type !== 'heli') {
        const vx = car.vx || 0, vz = car.vz || 0;
        const spd = Math.hypot(vx, vz);
        if (spd > 18) rechargeSpecial(4 * rawDt);
        if (spd > 9) {
          const latSpeed = Math.abs(-vx * Math.cos(car.yaw || 0) + vz * Math.sin(car.yaw || 0));
          if (latSpeed / spd > 0.28 || ctx.input?.handbrake) rechargeSpecial(10 * rawDt);
        }
      }
    }

    if ((ctx.input?.fire || p.isFiring) && p.weapon && p.weapon !== 'unarmed' && p.weapon !== 'bat') {
      if (elapsedClock - prevPlayerShotTime > 0.35) {
        prevPlayerShotTime = elapsedClock;
        gunfireAlert = { x: p.x, z: p.z, timer: 4.0 };
      }
    }
  }

  // ==========================================================================
  // 5. BA KỲ ÁN GIANG HỒ (3 WUXIA OPEN-WORLD STORY MISSIONS)
  // ==========================================================================
  function cleanupMissionEntities() {
    for (const e of mission.enemies) {
      removeNPCMesh(e);
      const idx = peds.indexOf(e);
      if (idx !== -1) peds.splice(idx, 1);
    }
    mission.enemies.length = 0;

    for (const rc of mission.rivalCars) {
      if (rc.car) safeRemoveVehicle(rc.car);
    }
    mission.rivalCars.length = 0;

    if (mission.vipNpc) {
      removeNPCMesh(mission.vipNpc);
      mission.vipNpc = null;
    }

    for (let i = pickups.length - 1; i >= 0; i--) {
      if (pickups[i].type === 'briefcase') removePickup(pickups[i]);
    }

    if (ctx.player?.rappelState) ctx.player.rappelState.active = false;

    mission.targets.length = 0;
    mission.getawayCars.length = 0;
    mission.targetCar = null;
    mission.briefcaseCollected = false;
    mission.bulletTimeCueShown = false;
    if (activeStageCorona) activeStageCorona.visible = false;
    setGPSTarget(null, null);
  }

  function failActiveMission(reasonText) {
    if (!mission.active) return;
    const failedTitle = mission.title;
    cleanupMissionEntities();
    mission.active = false;
    mission.id = 0;
    mission.stage = 0;
    mission.timer = 0;
    setMissionObjective('');
    markerCooldown = 4.0;
    if (!deathArrestState.mode) {
      ctx.ui?.showBanner?.('NHIỆM VỤ THẤT BẠI', `${failedTitle} — ${reasonText}`, 'failed');
    }
    notifyUI(`Nhiệm vụ thất bại: ${reasonText}`, 4.5);
  }

  function completeActiveMission(customBannerTitle = null) {
    const mId = mission.id;
    const reward = mission.reward;
    const mTitle = mission.title;

    completedMissions.add(mId);
    cleanupMissionEntities();
    mission.active = false;
    mission.id = 0;
    mission.stage = 0;
    mission.timer = 0;
    setMissionObjective('');
    markerCooldown = 4.5;

    syncPlayerCash(getPlayerCash() + reward, true);
    ctx.audio?.playMissionPassed?.();

    const bannerMain = customBannerTitle || 'CÔNG THÀNH DANH TOẠI';
    const rewardStr = `+$${reward.toLocaleString('en-US')}`;
    ctx.ui?.showBanner?.(bannerMain, `${mTitle} • ${rewardStr}`, 'passed');
    notifyUI(`Hoàn thành "${mTitle}" (${rewardStr})!`, 5.0);
    saveGame();
  }

  function startMission(missionId) {
    const id = Number(missionId);
    const def = MISSION_DEFS[id];
    if (!def || deathArrestState.mode) return false;

    if (ctx.player?.inSafehouse) exitSafehouse();
    if (ctx.player?.inInterior === 'barclub') exitBarClub();
    if (ctx.player?.inInterior === 'shop') exitDiscipleShop();
    if (ctx.player?.inInterior === 'stadium') exitStadium();

    cleanupMissionEntities();
    setWantedStars(0);

    mission.active = true;
    mission.id = id;
    mission.title = def.title;
    mission.reward = def.reward;
    mission.stage = 1;
    mission.timer = 0;
    mission.maxTimer = 0;
    markerCooldown = 3.0;

    const p = ctx.player;

    if (id === 1) {
      let obeyCar = getPlayerVehicle();
      if (!obeyCar || obeyCar.type !== 'obey9f') {
        const vList = ctx.vehicles?.list || [];
        obeyCar = vList.find((v) => v && v.type === 'obey9f' && !v.isTraffic && !v.destroyed && !v.remoteDriverId) || null;
        if (!obeyCar) {
          obeyCar = safeSpawnVehicle('obey9f', 34.5, 0.05, 18.0, Math.PI, { isMissionCar: true });
        } else {
          obeyCar.hp = obeyCar.maxHp || 140;
        }
        if (p && dist2D(p.x, p.z, obeyCar.x, obeyCar.z) > 95) {
          teleportPlayer(28, 0.22, 22, Math.PI);
        }
      }
      mission.targetCar = obeyCar;
      setMissionObjective('Lên Bạch Long Chiến Xa (9F) trên Đại Lộ Chu Tước!');
      notifyUI('Kỳ Án 1: "BẠCH LONG TUYỆT ẢNH ĐẠI LỘ" — Cầm lái Bạch Long Chiến Xa!', 4.5);
      if (obeyCar) {
        setGPSTarget(obeyCar.x, obeyCar.z);
        mission.targets = [{ x: obeyCar.x, z: obeyCar.z, label: 'Bạch Long 9F', color: '#38bdf8' }];
      }
    } else if (id === 2) {
      const enforcerCoords = [
        { x: -162, z: -14, pier: false, weapon: 'pistol' },
        { x: -172, z: 10, pier: false, weapon: 'smg' },
        { x: -208, z: -10, pier: true, weapon: 'smg' },
        { x: -222, z: 6, pier: true, weapon: 'pistol' },
        { x: -238, z: -14, pier: true, weapon: 'carbine' },
        { x: -250, z: -4, pier: true, weapon: 'smg' }
      ];
      for (const ec of enforcerCoords) {
        const ey = ec.pier ? 3.8 : getGroundY(ec.x, ec.z, 0.15);
        const enf = buildNPCEntity('gangster', ec.x, ey, ec.z, {
          zone: ec.pier ? 'pier_guard' : 'beach',
          isEnemy: true,
          isHostile: false,
          isGangster: true,
          isMissionEnemy: true,
          isMissionTarget: true,
          noWantedOnKill: true,
          weapon: ec.weapon,
          yaw: Math.PI / 2
        });
        peds.push(enf);
        mission.enemies.push(enf);
      }
      spawnPickup('briefcase', -255, 3.8, -10, 0, true);
      setMissionObjective('Tiến ra Bờ Cát Ngân Sa & Bến Cảng Bồng Lai (-215, -8)!');
      notifyUI('Kỳ Án 2: "BÃO LỬA BẾN CẢNG BỒNG LAI" — Quét sạch Thích Khách Hắc Đạo trên Thủy Các!', 4.5);
      setGPSTarget(-215, -8);
      mission.targets = [{ x: -215, z: -8, label: 'Bến Cảng Bồng Lai', color: '#f0c35a' }];
    } else if (id === 3) {
      fibGlassIntact = true;
      if (fibAtriumGroup?.userData?.glassPanel) fibAtriumGroup.userData.glassPanel.visible = true;

      applyPlayerOutfit('tactical_heist');
      grantWeaponToPlayer('pistol', 240);
      grantWeaponToPlayer('carbine', 360);
      setPlayerActiveWeapon('pistol');
      if (p) {
        p.hp = p.maxHp || 100;
        p.armor = 100;
        p.special = Math.max(p.special || 0, 80);
      }

      teleportPlayer(160, 78.05, -23.5, 0);
      if (ctx.engine) ctx.engine.camYaw = Math.PI;

      const xs = [148, 154, 160, 166, 172];
      for (let k = 0; k < xs.length; k++) {
        const agent = buildNPCEntity('gangster', xs[k], 47.82, -15.72, {
          isEnemy: true,
          isHostile: false,
          isGangster: true,
          isMissionEnemy: true,
          isMissionTarget: true,
          noWantedOnKill: true,
          fixedY: 47.82,
          skipAABB: true,
          weapon: k % 2 === 0 ? 'carbine' : 'pistol',
          maxHp: 85,
          yaw: 0
        });
        peds.push(agent);
        mission.enemies.push(agent);
      }

      mission.vipNpc = buildNPCEntity('ped', 160, 47.82, -15.92, {
        fixedY: 47.82,
        skipAABB: true,
        state: 'idle',
        yaw: 0
      });

      setMissionObjective('Tiến tới Móc Cáp Đu Dây ở mép đỉnh Tháp Thiên Cơ (160, 78, -16) hoặc nhấn [F]!');
      notifyUI('Kỳ Án 3: Đã mặc Dạ Hành Ám Ảnh Y! Móc cáp đu dây từ đỉnh Tháp Thiên Cơ (78m)!', 5.0);
      mission.targets = [{ x: 160, z: -16.2, label: 'Móc Cáp Đu Dây', color: '#38bdf8' }];
    } else if (id === 4) {
      stadiumBossDefeated = false;
      setMissionObjective('Đi theo GPS tới Đại Đấu Trường Huyền Thoại (54, 80) và nhấn [F] để vào sân đấu Boss!');
      notifyUI('⚽ THỬ THÁCH BOSS ($100,000): Đã bật GPS tới Đại Đấu Trường! Hãy tới cửa và nhấn [F] để vào sân!', 5.2);
      setGPSTarget(LANDMARKS.stadiumEntrance.x, LANDMARKS.stadiumEntrance.z);
      mission.targets = [{ x: LANDMARKS.stadiumEntrance.x, z: LANDMARKS.stadiumEntrance.z, label: 'Đại Đấu Trường Boss', color: '#38bdf8' }];
    }

    return true;
  }

  function spawnRivalCartelBanshees() {
    const p = ctx.player;
    const baseZ = (p?.z ?? 18) - 42;
    for (const c of [{ x: 35, z: baseZ }, { x: 45, z: baseZ - 10 }]) {
      const car = safeSpawnVehicle('banshee', c.x, getGroundY(c.x, c.z, 0.05), c.z, 0, {
        isRivalCartel: true,
        isMission: true,
        aiControlled: true
      });
      if (car) mission.rivalCars.push({ car, shootCooldown: randRange(0.6, 1.4) });
    }
  }

  function hookOntoFIBRappelRig() {
    const p = ctx.player;
    if (!p) return;
    mission.stage = 2;
    p.x = 160;
    p.y = 77.0;
    p.z = -15.2;
    p.vx = 0; p.vy = 0; p.vz = 0;
    p.yaw = Math.PI;
    p.rappelState = {
      active: true,
      towerX: 160,
      towerZ: -40,
      wallZ: -15.2,
      cableY: 77,
      minY: 2.0,
      maxY: 78
    };
    const obj = getRigObject3D(p.rig) || p.mesh;
    if (obj) obj.position.set(p.x, p.y, p.z);

    setMissionObjective('Đu dây xuống tầng 48m [S / Mũi tên xuống] để đột kích Tàng Kinh Các (0/5 mục tiêu)!');
    notifyUI('Đã móc cáp thép! Nhấn [S] tụt dây dọc vách kính Tháp Thiên Cơ xuống tầng 48m!', 5.0);
  }

  function updateActiveMission(dt) {
    if (!mission.active) {
      if (activeStageCorona) activeStageCorona.visible = false;
      return;
    }

    const p = ctx.player;
    if (!p) return;
    const playerCar = getPlayerVehicle();

    if (mission.id === 1) {
      if (mission.stage === 1) {
        if (mission.targetCar && mission.targetCar.destroyed) {
          failActiveMission('Bạch Long Chiến Xa đã bị phá hủy!');
          return;
        }
        if (playerCar && playerCar.type === 'obey9f') {
          mission.targetCar = playerCar;
          playerCar.hp = playerCar.maxHp || 140;
          mission.stage = 2;
          mission.timer = 120;
          mission.maxTimer = 120;
          spawnRivalCartelBanshees();
          setGPSTarget(LANDMARKS.showroom.x, LANDMARKS.showroom.z);
          notifyUI('2 xe Xích Hỏa Thần Mã đang truy sát! Đua tới Tụ Bảo Xa Các (-58, 80) giữ độ bền > 40%!', 5.0);
        } else if (mission.targetCar && activeStageCorona) {
          activeStageCorona.visible = true;
          activeStageCorona.position.set(mission.targetCar.x, mission.targetCar.y + 0.1, mission.targetCar.z);
        }
      } else if (mission.stage === 2) {
        mission.timer -= dt;
        const tCar = mission.targetCar || (playerCar?.type === 'obey9f' ? playerCar : null);
        if (!tCar || tCar.destroyed) { failActiveMission('Bạch Long Chiến Xa đã bị phá hủy!'); return; }
        const hpPct = Math.round(((tCar.hp ?? 100) / (tCar.maxHp || 100)) * 100);
        if (hpPct <= 40) { failActiveMission('Độ bền chiến xa tụt xuống dưới 40%!'); return; }
        if (mission.timer <= 0) { failActiveMission('Đã hết 120 giây giao xe!'); return; }

        setMissionObjective(`Đua tới Tụ Bảo Xa Các (-58, 80) • Còn: ${Math.ceil(mission.timer)}s • Độ bền: ${hpPct}% (>40%)`);
        if (activeStageCorona) {
          activeStageCorona.visible = true;
          activeStageCorona.position.set(LANDMARKS.showroom.x, LANDMARKS.showroom.y, LANDMARKS.showroom.z);
        }
        mission.targets = [{ x: LANDMARKS.showroom.x, z: LANDMARKS.showroom.z, label: 'Tụ Bảo Xa Các', color: '#f0c35a' }];

        for (let i = mission.rivalCars.length - 1; i >= 0; i--) {
          const rc = mission.rivalCars[i];
          const car = rc.car;
          if (!car || car.destroyed || car === playerCar) { mission.rivalCars.splice(i, 1); continue; }
          const dP = dist2D(car.x, car.z, p.x, p.z);
          const desiredYaw = Math.atan2(p.x - car.x, p.z - car.z);
          const newYaw = lerpAngle(car.yaw, desiredYaw, clamp(dt * 3.8, 0, 1));
          const chaseSpd = dP > 35 ? 36 : dP > 12 ? 29 : 18;
          applyAICarKinematics(car, car.x + Math.sin(newYaw) * chaseSpd * dt, car.z + Math.cos(newYaw) * chaseSpd * dt, newYaw, chaseSpd, clamp(wrapAngle(desiredYaw - car.yaw) * 2, -1, 1), false, dt);
          ctx.world?.resolveCarAABB?.(car);

          rc.shootCooldown -= dt;
          if (rc.shootCooldown <= 0 && dP < 44) {
            rc.shootCooldown = randRange(0.45, 0.85);
            spawnVisualTracer(car.x, car.y + 1.15, car.z, p.x + randRange(-2.2, 2.2), p.y + 0.9, p.z + randRange(-2.2, 2.2), false);
            ctx.audio?.playWeaponShot?.('smg', 0.28);
            if (Math.random() < 0.22 && hpPct > 48) {
              tCar.hp = Math.max((tCar.maxHp || 100) * 0.45, (tCar.hp ?? 100) - 1.2);
            }
          }
          mission.targets.push({ x: car.x, z: car.z, label: 'Truy Binh Hắc Phong', color: '#ff3b30' });
        }

        if (playerCar === tCar && dist2D(tCar.x, tCar.z, LANDMARKS.showroom.x, LANDMARKS.showroom.z) < 9.8) {
          ctx.vehicles?.repairAndRespray?.(tCar);
          tCar.hp = tCar.maxHp || 140;
          completeActiveMission();
        }
      }
    } else if (mission.id === 2) {
      const aliveEnemies = mission.enemies.filter((e) => !e.dead);
      const killedCount = 6 - aliveEnemies.length;

      if (mission.stage === 1) {
        if (activeStageCorona) {
          activeStageCorona.visible = true;
          activeStageCorona.position.set(-215, 3.8, -8);
        }
        if (dist2D(p.x, p.z, -215, -8) < 44 || p.x < -152 || killedCount > 0) {
          mission.stage = 2;
          for (const e of aliveEnemies) e.isHostile = true;
          setGPSTarget(-255, -10);
          notifyUI('Thích Khách trên Bến Cảng Bồng Lai đã xuất chiêu! Hạ 6 tên và đoạt Hòm Bảo Ngọc!', 4.5);
        }
      } else if (mission.stage === 2) {
        for (const e of aliveEnemies) {
          if (dist2D(e.x, e.z, p.x, p.z) < 58) e.isHostile = true;
        }
        mission.targets = aliveEnemies.map((e) => ({ x: e.x, z: e.z, label: 'Thích Khách', color: '#ff3b30' }));
        if (!mission.briefcaseCollected) {
          mission.targets.push({ x: -255, z: -10, label: 'Hòm Bảo Ngọc', color: '#2ec486' });
        }
        if (aliveEnemies.length > 0) {
          setMissionObjective(`Hạ toán Thích Khách Thủy Các (${killedCount}/6) và lấy Hòm Bảo Ngọc (-255, 3.8, -10)!`);
        } else if (!mission.briefcaseCollected) {
          setMissionObjective('Đoạt Hòm Bảo Ngọc phát sáng ở cuối Thủy Các (-255, 3.8, -10)!');
        }

        if (aliveEnemies.length === 0 && mission.briefcaseCollected) {
          mission.stage = 3;
          setWantedStars(2);
          setGPSTarget(LANDMARKS.downtownDropoff.x, LANDMARKS.downtownDropoff.z);
          notifyUI('Đã đoạt Hòm Bảo Ngọc! Lục Phiến Môn 2★ đang truy bắt — rút về Đại Lộ Chu Tước (34, -10)!', 5.0);
        }
      } else if (mission.stage === 3) {
        if (activeStageCorona) {
          activeStageCorona.visible = true;
          activeStageCorona.position.set(LANDMARKS.downtownDropoff.x, LANDMARKS.downtownDropoff.y, LANDMARKS.downtownDropoff.z);
        }
        mission.targets = [{ x: LANDMARKS.downtownDropoff.x, z: LANDMARKS.downtownDropoff.z, label: 'Điểm Hẹn Chu Tước', color: '#f0c35a' }];
        setMissionObjective('Thoát vòng vây Lục Phiến Môn 2★ và mang Bảo Ngọc về Đại Lộ Chu Tước (34, -10)!');

        if (dist2D(p.x, p.z, LANDMARKS.downtownDropoff.x, LANDMARKS.downtownDropoff.z) < 8.5 || (p.x > 15 && wanted.stars === 0)) {
          setWantedStars(0);
          completeActiveMission();
        }
      }
    } else if (mission.id === 3) {
      if (mission.stage === 1) {
        if (p.x >= 135.5 && p.x <= 184.5 && p.z >= -64.5 && p.z <= -14.8 && p.y > 68 && p.y < 78.02) {
          p.y = 78.02;
          p.vy = Math.max(0, p.vy || 0);
          const obj = getRigObject3D(p.rig) || p.mesh;
          if (obj) obj.position.y = p.y;
        }
        const nearAnchor = dist2D(p.x, p.z, 160, -16.2) < 2.4 || p.z >= -16.6;
        const interactHit = !!(ctx.input?.interactJustPressed || ctx.input?.enterJustPressed || ctx.input?.useJustPressed);
        if (nearAnchor || (interactHit && dist2D(p.x, p.z, 160, -16.2) < 9.5)) {
          hookOntoFIBRappelRig();
        }
      } else if (mission.stage === 2) {
        const rs = p.rappelState;
        const cableY = rs?.active ? (Number.isFinite(rs.cableY) ? rs.cableY : p.y) : p.y;
        if (rs?.active) {
          if (Math.abs(p.y - rs.cableY) > 0.05) {
            if (rs._lastCableY !== undefined && Math.abs(rs.cableY - rs._lastCableY) > 0.001) p.y = rs.cableY;
            else rs.cableY = p.y;
          }
          rs._lastCableY = rs.cableY;
        }

        if (!mission.bulletTimeCueShown && cableY <= 54.0) {
          mission.bulletTimeCueShown = true;
          shatterFIBAtriumGlass();
          for (const agent of mission.enemies) if (!agent.dead) agent.isHostile = true;
          p.special = Math.max(p.special || 0, 90);
          activateSpecial();
          notifyUI('Kích hoạt [V] Nội Công Tâm Pháp để hạ Ám Vệ qua lớp kính!', 6.0);
        }

        if (fibGlassIntact && (ctx.input?.fire || p.isFiring) && cableY <= 60) {
          shatterFIBAtriumGlass();
          for (const agent of mission.enemies) if (!agent.dead) agent.isHostile = true;
        }

        if (mission.vipNpc && !mission.vipNpc.dead) {
          mission.vipNpc.mesh.position.set(160, 47.82, -15.92);
          ctx.characters?.animateHumanoid?.(mission.vipNpc.rig, 'idle', dt);
          raiseFleeingArms(mission.vipNpc.rig, elapsedClock);
        }

        const aliveAgents = mission.enemies.filter((e) => !e.dead);
        const killedAgents = 5 - aliveAgents.length;
        mission.targets = aliveAgents.map((e) => ({ x: e.x, z: e.z, label: 'Ám Vệ Cao Thủ', color: '#ff3b30' }));

        if (aliveAgents.length > 0) {
          setMissionObjective(
            cableY > 54
              ? `Đu dây xuống tầng kính Tàng Kinh Các độ cao 48m (Hiện tại: ${Math.round(cableY)}m)!`
              : `Dùng [V] Nội Công Tâm Pháp hạ toàn bộ Ám Vệ qua vách kính! (${killedAgents}/5)`
          );
          if (rs?.active && rs.cableY < 38) { rs.cableY = 38; p.y = 38; }
        } else {
          mission.stage = 3;
          notifyUI('Đã giải cứu Chưởng Môn! Tuột nhanh xuống mặt đất [S + Shift] để rút lui!', 5.0);
          const gCar1 = safeSpawnVehicle('sedan_lux', 156, 0.05, -9.5, -Math.PI / 2, { isMissionCar: true, isMission: true });
          const gCar2 = safeSpawnVehicle('obey9f', 166, 0.05, -9.5, -Math.PI / 2, { isMissionCar: true, isMission: true });
          if (gCar1) mission.getawayCars.push(gCar1);
          if (gCar2) mission.getawayCars.push(gCar2);
        }
      } else if (mission.stage === 3) {
        const rs = p.rappelState;
        const cableY = rs?.active ? Math.min(rs.cableY ?? p.y, p.y) : p.y;

        if (rs?.active) {
          setMissionObjective(`Tuột nhanh xuống mặt đất [S + Shift] để tháo cáp (Độ cao: ${cableY.toFixed(1)}m)!`);
          if (cableY <= 3.0) {
            rs.active = false;
            p.y = getGroundY(p.x, p.z, 0.22);
            p.z = -13.5;
            const obj = getRigObject3D(p.rig) || p.mesh;
            if (obj) obj.position.set(p.x, p.y, p.z);

            setWantedStars(4);
            setGPSTarget(LANDMARKS.safehouseEntrance.x, LANDMARKS.safehouseEntrance.z);
            notifyUI('Đã tháo cáp! Cẩm Y Vệ 4★ đang vây ráp — lên xe rút về Tĩnh Tâm Biệt Viện (24, -80)!', 5.5);
          }
        } else {
          if (activeStageCorona) {
            activeStageCorona.visible = true;
            activeStageCorona.position.set(LANDMARKS.safehouseEntrance.x, LANDMARKS.safehouseEntrance.y, LANDMARKS.safehouseEntrance.z);
          }
          mission.targets = [{ x: LANDMARKS.safehouseEntrance.x, z: LANDMARKS.safehouseEntrance.z, label: 'Tĩnh Tâm Biệt Viện', color: '#2ec486' }];
          setMissionObjective('Phá vây Cẩm Y Vệ 4★ và trở về Tĩnh Tâm Biệt Viện (24, -80)!');

          if (dist2D(p.x, p.z, LANDMARKS.safehouseEntrance.x, LANDMARKS.safehouseEntrance.z) < 8.0) {
            setWantedStars(0);
            completeActiveMission('ĐẠI CÔNG CÁO THÀNH +$15,000');
          }
        }
      }
    }
  }

  // ==========================================================================
  // 6. PICKUPS, TỤ BẢO XA CÁC, TĨNH TÂM BIỆT VIỆN & LINH THÔNG NGỌC GIẢN
  // ==========================================================================
  function updatePickupsAndLandmarks(dt, rawDt) {
    const p = ctx.player;
    if (!p) return;
    const playerCar = getPlayerVehicle();

    if (markerCooldown > 0) markerCooldown -= rawDt;
    if (showroomCooldown > 0) showroomCooldown -= rawDt;
    if (safehouseCooldown > 0) safehouseCooldown -= rawDt;
    if (stadiumCooldown > 0) stadiumCooldown -= rawDt;
    if (casinoRobCooldown > 0) casinoRobCooldown -= rawDt;
    if (legendBribeCooldown > 0) legendBribeCooldown -= rawDt;
    if (ctx.input?.barClubOpen) {
      barClubCooldown = Math.max(barClubCooldown, 2.2);
    } else if (barClubCooldown > 0) {
      barClubCooldown -= rawDt;
    }
    if (ctx.input?.shopOpen) {
      discipleShopCooldown = Math.max(discipleShopCooldown, 2.2);
    } else if (discipleShopCooldown > 0) {
      discipleShopCooldown -= rawDt;
    }

    const pulse = 1 + Math.sin(elapsedClock * 3.8) * 0.08;
    const inInteriorAny = isInAnyInterior(p);
    if (barClubCorona) {
      barClubCorona.visible = !inInteriorAny;
      if (barClubCorona.visible) {
        barClubCorona.userData.ring.scale.setScalar(pulse);
        barClubCorona.rotation.y += dt * 1.4;
      }
    }
    if (discipleShopCorona) {
      discipleShopCorona.visible = !inInteriorAny;
      if (discipleShopCorona.visible) {
        discipleShopCorona.userData.ring.scale.setScalar(pulse);
        discipleShopCorona.rotation.y += dt * 1.4;
      }
    }
    if (stadiumCorona) {
      stadiumCorona.visible = !inInteriorAny;
      if (stadiumCorona.visible) {
        stadiumCorona.userData.ring.scale.setScalar(pulse);
        stadiumCorona.rotation.y += dt * 1.6;
      }
    }
    for (const mm of markerMeshes) {
      mm.mesh.visible = !mission.active && !inInteriorAny;
      if (mm.mesh.visible) {
        mm.mesh.userData.ring.scale.setScalar(pulse);
        mm.mesh.rotation.y += dt * 1.1;
        if (
          markerCooldown <= 0 &&
          !deathArrestState.mode &&
          dist2D(p.x, p.z, mm.def.marker.x, mm.def.marker.z) < 2.6 &&
          Math.abs(p.y - mm.mesh.position.y) < 2.5
        ) {
          const spd = playerCar ? Math.hypot(playerCar.vx || 0, playerCar.vz || 0) : 0;
          if (spd < 9.0) { startMission(mm.id); break; }
        }
      }
    }

    if (activeStageCorona?.visible) {
      activeStageCorona.rotation.y += dt * 1.6;
      activeStageCorona.userData.ring.scale.setScalar(pulse);
    }

    for (let i = pickups.length - 1; i >= 0; i--) {
      const item = pickups[i];
      if (!item.active) {
        item.respawnTimer -= dt;
        if (item.respawnTimer <= 0) { item.active = true; item.mesh.visible = true; }
        continue;
      }

      item.life -= dt;
      if (!item.persistent && item.life <= 0) { removePickup(item); continue; }

      item.mesh.rotation.y += dt * 2.2;
      item.mesh.position.y = item.y + 0.36 + Math.sin(elapsedClock * 3.2 + i) * 0.07;

      if (dist2D(p.x, p.z, item.x, item.z) < 2.25 && Math.abs(p.y - item.y) < 2.2) {
        if (item.type === 'cash') {
          syncPlayerCash(getPlayerCash() + item.value, true);
          ctx.audio?.playPickup?.();
          removePickup(item);
        } else if (item.type === 'health') {
          if ((p.hp ?? 100) < (p.maxHp || 100)) {
            p.hp = Math.min(p.maxHp || 100, (p.hp ?? 100) + item.value);
            ctx.audio?.playPickup?.();
            if (item.persistent) { item.active = false; item.mesh.visible = false; item.respawnTimer = 35; }
            else removePickup(item);
          }
        } else if (item.type === 'armor') {
          if ((p.armor ?? 0) < 100) {
            p.armor = Math.min(100, (p.armor ?? 0) + item.value);
            ctx.audio?.playPickup?.();
            if (item.persistent) { item.active = false; item.mesh.visible = false; item.respawnTimer = 45; }
            else removePickup(item);
          }
        } else if (item.type === 'briefcase') {
          const aliveEnforcers = mission.enemies.filter((e) => !e.dead).length;
          if (mission.id === 2 && aliveEnforcers > 0) {
            notifyUI(`Hạ nốt ${aliveEnforcers} tên Thích Khách trên Thủy Các để lấy Hòm Bảo Ngọc!`, 2.5);
          } else {
            mission.briefcaseCollected = true;
            ctx.audio?.playPickup?.();
            removePickup(item);
          }
        }
      }
    }

    // Tụ Bảo Xa Các Pay 'n' Spray at (-58, 80)
    if (
      playerCar &&
      showroomCooldown <= 0 &&
      !(mission.active && mission.id === 1) &&
      playerCar.x >= -66 && playerCar.x <= -50 &&
      playerCar.z >= 75 && playerCar.z <= 85
    ) {
      const carDamaged = (playerCar.hp ?? 100) < (playerCar.maxHp || 100) - 2;
      if (wanted.stars > 0 || carDamaged) {
        if (getPlayerCash() >= 250) {
          showroomCooldown = 7.0;
          syncPlayerCash(getPlayerCash() - 250, true);
          ctx.vehicles?.repairAndRespray?.(playerCar);
          playerCar.hp = playerCar.maxHp || 140;
          setWantedStars(0);
          ctx.audio?.playChime?.();
          notifyUI('Tụ Bảo Xa Các: Đã tân trang chiến xa & xóa truy nã Lục Phiến Môn (-$250)!', 4.0);
        } else {
          showroomCooldown = 4.0;
          notifyUI('Cần $250 ngân lượng để tân trang chiến xa tại Tụ Bảo Xa Các!', 3.0);
        }
      }
    }

    const interactHit = !!(ctx.input?.interactJustPressed || ctx.input?.enterJustPressed || ctx.input?.useJustPressed);

    // ------------------------------------------------------------------------
    // Exterior -> Interior Entrances (Bar Club VIP, Võ Quán, Đại Đấu Trường)
    // ------------------------------------------------------------------------
    if (
      !inInteriorAny &&
      !playerCar &&
      !(p.rappelState && p.rappelState.active) &&
      !deathArrestState.mode &&
      !ctx.input?.barClubOpen &&
      !ctx.input?.shopOpen
    ) {
      // Bar Club VIP Entrance at (54.4, 0.22, 14.0) -> Walk INSIDE 3D Casino Hall!
      if (barClubCooldown <= 0) {
        const dClub = dist2D(p.x, p.z, LANDMARKS.barClub.x, LANDMARKS.barClub.z);
        if (dClub < 2.0 || (interactHit && dClub < 4.4)) {
          enterBarClub();
        }
      }
      // Võ Quán — Cửa Hàng Đệ Tử Entrance at (25.6, 0.22, -14.0) -> Walk INSIDE 3D Dojo!
      if (discipleShopCooldown <= 0 && !p.inInterior) {
        const dShop = dist2D(p.x, p.z, LANDMARKS.discipleShop.x, LANDMARKS.discipleShop.z);
        if (dShop < 2.0 || (interactHit && dShop < 4.4)) {
          enterDiscipleShop();
        }
      }
      // Đại Đấu Trường Huyền Thoại Entrance at (54.4, 0.22, 80.0) -> Press [F] to enter Boss Stadium!
      if (stadiumCooldown <= 0 && !p.inInterior) {
        const dStad = dist2D(p.x, p.z, LANDMARKS.stadiumEntrance.x, LANDMARKS.stadiumEntrance.z);
        if (interactHit && dStad < 4.6) {
          if (mission.active && mission.id === 4) {
            enterStadium();
          } else {
            stadiumCooldown = 2.0;
            notifyUI('⚽ Mở Điện Thoại [P] → Kỳ Án để chấp nhận thử thách Boss Đại Đấu Trường ($100,000) trước khi vào sân!', 4.2);
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // Interior Station Interactions: Bar Club VIP (1100, 1100)
    // ------------------------------------------------------------------------
    if (p.inInterior === 'barclub' && !deathArrestState.mode) {
      const dExit = dist2D(p.x, p.z, LANDMARKS.barClubExit.x, LANDMARKS.barClubExit.z);
      const dTX = dist2D(p.x, p.z, LANDMARKS.barClubTaiXiu.x, LANDMARKS.barClubTaiXiu.z);
      const dVault = dist2D(p.x, p.z, LANDMARKS.barClubVault.x, LANDMARKS.barClubVault.z);
      if (barClubCooldown <= 0 && (dExit < 1.8 || (interactHit && dExit < 3.4))) {
        exitBarClub();
      } else if (
        barClubCooldown <= 0 &&
        !ctx.input?.barClubOpen &&
        ((interactHit && dTX < 3.8) || (!casinoAlarmActive && dTX < 1.55))
      ) {
        barClubCooldown = 2.6;
        ctx.ui?.openBarClub?.();
      } else if (interactHit && dVault < 4.0) {
        robCasinoCash();
      }
    }

    // ------------------------------------------------------------------------
    // Interior Station Interactions: Võ Quán — Cửa Hàng Đệ Tử (1400, 1400)
    // ------------------------------------------------------------------------
    if (p.inInterior === 'shop' && !deathArrestState.mode) {
      const dExit = dist2D(p.x, p.z, LANDMARKS.shopExit.x, LANDMARKS.shopExit.z);
      const dCounter = dist2D(p.x, p.z, LANDMARKS.shopCounter.x, LANDMARKS.shopCounter.z);
      const dPedestal = dist2D(p.x, p.z, 1400, 1395.0);
      if (discipleShopCooldown <= 0 && (dExit < 1.8 || (interactHit && dExit < 3.4))) {
        exitDiscipleShop();
      } else if (
        discipleShopCooldown <= 0 &&
        !ctx.input?.shopOpen &&
        ((interactHit && (dCounter < 4.2 || dPedestal < 6.5)) || dCounter < 1.55)
      ) {
        discipleShopCooldown = 2.6;
        ctx.ui?.openDiscipleShop?.();
      }
    }

    // ------------------------------------------------------------------------
    // Interior Exit: Đại Đấu Trường Boss Stadium (1800, 1800)
    // ------------------------------------------------------------------------
    if (p.inInterior === 'stadium' && !deathArrestState.mode) {
      const dExit = dist2D(p.x, p.z, LANDMARKS.stadiumExit.x, LANDMARKS.stadiumExit.z);
      if (stadiumCooldown <= 0 && (dExit < 1.8 || (interactHit && dExit < 3.5))) {
        exitStadium();
      }
    }

    // Tĩnh Tâm Biệt Viện Safehouse (24, -80) <-> (800, 0, 800)
    if (!p.inSafehouse && !p.inInterior) {
      if (
        safehouseCooldown <= 0 &&
        !playerCar &&
        !(p.rappelState && p.rappelState.active) &&
        !(mission.active && mission.id === 3 && mission.stage === 3) &&
        dist2D(p.x, p.z, LANDMARKS.safehouseEntrance.x, LANDMARKS.safehouseEntrance.z) < 2.0
      ) {
        enterSafehouse();
      }
    } else if (p.inSafehouse) {
      if (safehouseCooldown <= 0 && dist2D(p.x, p.z, LANDMARKS.safehouseExit.x, LANDMARKS.safehouseExit.z) < 1.8) {
        exitSafehouse();
      } else if (safehouseCooldown <= 0 && dist2D(p.x, p.z, LANDMARKS.safehouseWardrobe.x, LANDMARKS.safehouseWardrobe.z) < 1.6) {
        safehouseCooldown = 2.5;
        const outfits = ['casual_polo', 'luxury_suit', 'tactical_heist'];
        const curIdx = outfits.indexOf(p.outfit || 'casual_polo');
        const nextOutfit = outfits[(curIdx + 1) % outfits.length];
        applyPlayerOutfit(nextOutfit);
        const names = {
          casual_polo: 'Hiệp Khách Hồng Y',
          luxury_suit: 'Cẩm Y Công Tử Bào',
          tactical_heist: 'Dạ Hành Ám Ảnh Y'
        };
        notifyUI(`Tủ Y Phục Biệt Viện: Đã khoác "${names[nextOutfit]}"!`, 3.0);
      }
    }
  }

  function enterSafehouse() {
    const p = ctx.player;
    if (!p || deathArrestState.mode) return false;
    safehouseCooldown = 2.5;
    p.inSafehouse = true;
    p.inInterior = null;
    p.hp = p.maxHp || 100;
    setWantedStars(0);
    teleportPlayer(LANDMARKS.safehouseInterior.x, LANDMARKS.safehouseInterior.y, LANDMARKS.safehouseInterior.z, Math.PI);
    saveGame();
    notifyUI('Tĩnh Tâm Biệt Viện: Đã hồi phục Nội Lực, xóa truy nã & lưu hành trang!', 4.5);
    return true;
  }

  function exitSafehouse() {
    const p = ctx.player;
    if (!p) return false;
    safehouseCooldown = 2.5;
    p.inSafehouse = false;
    teleportPlayer(24, 0.22, -76.5, 0);
    notifyUI('Đã bước ra Đại Lộ Kinh Thành từ Tĩnh Tâm Biệt Viện.', 2.5);
    return true;
  }

  // ==========================================================================
  // 6B. BAR CLUB VIP 3D INTERIOR — TÀI XỈU, CƯỚP TIỀN $1,000, VỆ SĨ & PHIẾN QUÂN
  // ==========================================================================
  const FIREARM_WEAPON_IDS = new Set(['pistol', 'smg', 'carbine', 'shotgun', 'grenade']);

  function hasLegendDisciple() {
    return disciples.some((d) => d && !d.dead && (d.hasLegendBribe || d.tierId === 'disciple_messi' || d.tierId === 'disciple_ronaldo'));
  }

  function areRebelsBribed() {
    return hasLegendDisciple() || elapsedClock < rebelsBribedUntil;
  }

  function clearCasinoInteriorNPCs() {
    for (let i = casinoGuards.length - 1; i >= 0; i--) {
      removeNPCMesh(casinoGuards[i]);
    }
    casinoGuards.length = 0;
    if (casinoDealer) {
      removeNPCMesh(casinoDealer);
      casinoDealer = null;
    }
    casinoAlarmActive = false;
    casinoAlarmBannerShown = false;
  }

  function spawnCasinoInteriorNPCs() {
    clearCasinoInteriorNPCs();
    // Calm Tài Xỉu Dealer behind the green casino table
    casinoDealer = buildNPCEntity('casino_bodyguard', 1100, 0.05, 1095.6, {
      role: 'dealer',
      zone: 'barclub',
      state: 'idle',
      weapon: 'unarmed',
      maxHp: 120,
      noWantedOnKill: true,
      yaw: 0
    });
    casinoDealer.displayName = 'Nhà Cái Tài Xỉu VIP';
    casinoDealer.invulnerable = true;

    const specs = [
      // 3 Vệ Sĩ Sòng Bạc (Bodyguards)
      { preset: 'casino_bodyguard', role: 'bodyguard', name: 'Vệ Sĩ Sòng Bạc', x: 1094.8, z: 1098.5, yaw: Math.PI * 0.2, weapon: 'smg', hp: 120 },
      { preset: 'casino_bodyguard', role: 'bodyguard', name: 'Vệ Sĩ Sòng Bạc', x: 1105.2, z: 1098.5, yaw: -Math.PI * 0.2, weapon: 'smg', hp: 120 },
      { preset: 'casino_bodyguard', role: 'bodyguard', name: 'Đội Trưởng Vệ Sĩ', x: 1107.6, z: 1091.8, yaw: -Math.PI * 0.35, weapon: 'carbine', hp: 145 },
      // 3 Phiến Quân Sòng Bạc (Rebels guarding vault & lounge)
      { preset: 'casino_rebel', role: 'rebel', name: 'Phiến Quân Sòng Bạc', x: 1108.6, z: 1098.2, yaw: -Math.PI * 0.5, weapon: 'carbine', hp: 140 },
      { preset: 'casino_rebel', role: 'rebel', name: 'Phiến Quân Sòng Bạc', x: 1104.0, z: 1090.5, yaw: 0, weapon: 'carbine', hp: 140 },
      { preset: 'casino_rebel', role: 'rebel', name: 'Chỉ Huy Phiến Quân', x: 1093.5, z: 1091.5, yaw: Math.PI * 0.15, weapon: 'carbine', hp: 160 }
    ];

    const rebelsFriendly = areRebelsBribed();
    for (const s of specs) {
      const guard = buildNPCEntity(s.preset, s.x, 0.05, s.z, {
        role: s.role,
        zone: 'barclub',
        state: 'idle',
        weapon: s.weapon,
        maxHp: s.hp,
        armor: s.role === 'rebel' ? 35 : 20,
        isEnemy: false,
        isHostile: false,
        noWantedOnKill: false,
        yaw: s.yaw
      });
      guard.displayName = s.name;
      guard.isCasinoGuard = true;
      guard.isRebel = s.role === 'rebel';
      guard.bribed = guard.isRebel && rebelsFriendly;
      guard.homeX = s.x;
      guard.homeZ = s.z;
      const baseTakeDamage = guard.takeDamage.bind(guard);
      guard.takeDamage = function (dmg, isHeadshot = false) {
        baseTakeDamage(dmg, isHeadshot);
        if (ctx.player?.inInterior === 'barclub') {
          triggerCasinoAlarm('attack');
        }
      };
      casinoGuards.push(guard);
    }
  }

  function triggerCasinoAlarm(reason = 'weapon') {
    const rebelsFriendly = areRebelsBribed();
    let activatedCount = 0;
    for (const g of casinoGuards) {
      if (!g || g.dead) continue;
      if (g.isRebel && rebelsFriendly) {
        g.bribed = true;
        g.isHostile = false;
        g.isEnemy = false;
        continue;
      }
      if (!g.isHostile) activatedCount++;
      g.isHostile = true;
      g.isEnemy = true;
      g.state = 'combat';
    }
    const firstAlarm = !casinoAlarmActive;
    casinoAlarmActive = true;

    if (firstAlarm || (!casinoAlarmBannerShown && activatedCount > 0)) {
      casinoAlarmBannerShown = true;
      ctx.audio?.playCasinoAlarm?.();
      if (reason === 'robbery') {
        addCrimeHeat(45, 'casino_robbery');
      } else {
        addCrimeHeat(22, 'casino_gunfight');
      }
      const msg = rebelsFriendly
        ? '🚨 BÁO ĐỘNG SÒNG BẠC! Vệ sĩ đang khai hỏa — Phiến Quân đã bị Messi/Ronaldo mua chuộc nên KHÔNG tấn công bạn!'
        : reason === 'weapon'
          ? '🚨 PHÁT HIỆN RÚT SÚNG TRONG SÒNG BẠC! Toàn bộ Vệ Sĩ & Phiến Quân đang tấn công bạn!'
          : '🚨 CƯỚP SÒNG BẠC! Vệ Sĩ & Phiến Quân đã báo động và khai hỏa!';
      notifyUI(msg, 4.8);
    }
  }

  function robCasinoCash() {
    const p = ctx.player;
    if (!p || p.inInterior !== 'barclub' || deathArrestState.mode) return false;
    if (casinoRobCooldown > 0.05) {
      ctx.audio?.playPhoneError?.();
      notifyUI(`Đang gom tiền két sắt... chờ ${Math.ceil(casinoRobCooldown)}s để cướp tiếp $1,000!`, 2.2);
      return false;
    }
    if (ctx.antiCheat && !ctx.antiCheat.verifyAndRecordSkill('casino_rob', 3500, isNoCooldownActive())) {
      return false;
    }
    casinoRobCooldown = isNoCooldownActive() ? 0 : 3.5;
    syncPlayerCash(getPlayerCash() + 1000, true);
    ctx.audio?.playChime?.();
    ctx.characters?.spawnParticles?.(LANDMARKS.barClubVault.x + 1.4, 1.3, LANDMARKS.barClubVault.z, 'palm_qi', 12, 4.2);
    ctx.ui?.showBanner?.('CƯỚP KÉT SẮT +$1,000!', 'Vệ sĩ & Phiến quân sòng bạc đang truy sát — Chiến đấu hoặc chạy ra cửa!', 'wanted', 2.6);
    triggerCasinoAlarm('robbery');
    return true;
  }

  function enterBarClub() {
    const p = ctx.player;
    if (!p || deathArrestState.mode) return false;
    barClubCooldown = 2.4;
    p.inSafehouse = false;
    p.inInterior = 'barclub';
    if (gpsTarget && dist2D(gpsTarget.x, gpsTarget.z, LANDMARKS.barClub.x, LANDMARKS.barClub.z) < 5) {
      setGPSTarget(null, null);
    }
    teleportPlayer(LANDMARKS.barClubInterior.x, LANDMARKS.barClubInterior.y, LANDMARKS.barClubInterior.z, Math.PI);
    spawnCasinoInteriorNPCs();
    const curW = p.currentWeapon || p.weapon || 'unarmed';
    if (FIREARM_WEAPON_IDS.has(curW)) {
      triggerCasinoAlarm('weapon');
    } else {
      notifyUI('🍸 Đã vào Bar Club VIP! Lại Bàn Tài Xỉu [F] để đặt cược, hoặc tới Két Sắt [F] để cướp $1,000 (Coi chừng rút súng bị Vệ sĩ & Phiến quân bắn!).', 5.2);
    }
    return true;
  }

  function exitBarClub() {
    const p = ctx.player;
    if (!p) return false;
    barClubCooldown = 2.4;
    p.inInterior = null;
    clearCasinoInteriorNPCs();
    ctx.ui?.closeBarClub?.();
    teleportPlayer(LANDMARKS.barClub.x - 2.0, 0.22, LANDMARKS.barClub.z, -Math.PI * 0.5);
    notifyUI('Đã bước ra Đại Lộ Chu Tước từ Bar Club VIP.', 2.5);
    return true;
  }

  function updateCasinoInterior(dt, rawDt) {
    const p = ctx.player;
    if (!p || p.inInterior !== 'barclub' || deathArrestState.mode) return;

    const curW = p.currentWeapon || p.weapon || 'unarmed';
    const drewGun = FIREARM_WEAPON_IDS.has(curW);
    if (drewGun && !casinoAlarmActive) {
      triggerCasinoAlarm('weapon');
    }

    const rebelsFriendly = areRebelsBribed();

    for (let i = casinoGuards.length - 1; i >= 0; i--) {
      const g = casinoGuards[i];
      if (!g) continue;
      if (g.hp <= 0 && !g._deathHandled) {
        handleNPCDeath(g, true);
      }
      if (g.dead) {
        g.corpseTimer += rawDt;
        if (g.corpseTimer > 16) {
          removeNPCMesh(g);
          casinoGuards.splice(i, 1);
        }
        continue;
      }

      if (g.isRebel && rebelsFriendly) {
        g.bribed = true;
        g.isHostile = false;
        g.isEnemy = false;
        // Friendly rebels just stand guard & watch calmly
        const dP = dist2D(g.x, g.z, p.x, p.z);
        if (dP < 12) {
          g.yaw = lerpAngle(g.yaw, Math.atan2(p.x - g.x, p.z - g.z), clamp(dt * 4, 0, 1));
        }
        g.mesh.position.set(g.x, 0.05, g.z);
        g.mesh.rotation.y = g.yaw;
        ctx.characters?.animateHumanoid?.(g.rig, 'idle', dt, { moveSpeed: 0 });
        continue;
      }

      if (g.isHostile) {
        const dx = p.x - g.x;
        const dz = p.z - g.z;
        const dist = Math.hypot(dx, dz) || 0.001;
        g.yaw = lerpAngle(g.yaw, Math.atan2(dx, dz), clamp(dt * 12, 0, 1));
        let moveSpd = 0;
        let animState = g.weapon === 'carbine' ? 'aim_2h' : 'aim_1h';

        if (dist > 7.5) {
          moveSpd = g.isRebel ? 5.2 : 4.6;
          g.x += (dx / dist) * moveSpd * dt;
          g.z += (dz / dist) * moveSpd * dt;
          animState = 'run';
        } else if (dist < 3.6) {
          moveSpd = 2.6;
          g.x -= (dx / dist) * moveSpd * dt;
          g.z -= (dz / dist) * moveSpd * dt;
          animState = 'walk';
        }
        g.x = clamp(g.x, 1087.0, 1113.0);
        g.z = clamp(g.z, 1087.0, 1113.0);
        if (ctx.world?.resolveCircleAABB) ctx.world.resolveCircleAABB(g, 0.42);

        g.shootCooldown -= dt;
        if (g.shootCooldown <= 0 && dist < 24) {
          g.shootCooldown = g.isRebel ? randRange(0.45, 0.85) : randRange(0.55, 1.0);
          fireNPCWeaponAtPlayer(g, g.weapon || 'smg', g.isRebel ? 0.58 : 0.72, g.isRebel ? 10 : 8, false);
        }
        g.mesh.position.set(g.x, 0.05, g.z);
        g.mesh.rotation.y = g.yaw;
        ctx.characters?.animateHumanoid?.(g.rig, animState, dt, { moveSpeed: moveSpd });
      } else {
        // Calm patrol/watch stance
        const toP = dist2D(g.x, g.z, p.x, p.z);
        if (toP < 9.0) {
          g.yaw = lerpAngle(g.yaw, Math.atan2(p.x - g.x, p.z - g.z), clamp(dt * 4, 0, 1));
        }
        g.mesh.position.set(g.x, 0.05, g.z);
        g.mesh.rotation.y = g.yaw;
        ctx.characters?.animateHumanoid?.(g.rig, 'idle', dt, { moveSpeed: 0 });
      }
    }
  }

  // ==========================================================================
  // 6C. VÕ QUÁN — CỬA HÀNG ĐỆ TỬ 3D INTERIOR + 3 MANNEQUIN SHOWCASE PEDESTALS
  // ==========================================================================
  function ensureShopShowcaseMannequins() {
    if (shopShowcaseGroup) return;
    const scene = getScene();
    if (!scene) return;
    shopShowcaseGroup = new THREE.Group();
    const spots = [
      { tierId: 'disciple_1', x: 1395.0, z: 1393.5 },
      { tierId: 'disciple_10', x: 1400.0, z: 1393.5 },
      { tierId: 'disciple_100', x: 1405.0, z: 1393.5 }
    ];
    for (const sp of spots) {
      let rig = null;
      if (ctx.characters?.createHumanoid) {
        try { rig = ctx.characters.createHumanoid(sp.tierId); } catch (_) {}
      }
      const mesh = getRigObject3D(rig) || createFallbackHumanoidMesh(0x4b3478);
      mesh.position.set(sp.x, 0.36, sp.z);
      mesh.rotation.y = 0; // Facing South toward player entering
      shopShowcaseGroup.add(mesh);
    }
    shopShowcaseGroup.visible = false;
    gameplayRoot.add(shopShowcaseGroup);
  }

  function enterDiscipleShop() {
    const p = ctx.player;
    if (!p || deathArrestState.mode) return false;
    discipleShopCooldown = 2.4;
    p.inSafehouse = false;
    p.inInterior = 'shop';
    if (gpsTarget && dist2D(gpsTarget.x, gpsTarget.z, LANDMARKS.discipleShop.x, LANDMARKS.discipleShop.z) < 5) {
      setGPSTarget(null, null);
    }
    ensureShopShowcaseMannequins();
    if (shopShowcaseGroup) shopShowcaseGroup.visible = true;
    teleportPlayer(LANDMARKS.shopInterior.x, LANDMARKS.shopInterior.y, LANDMARKS.shopInterior.z, Math.PI);
    notifyUI('🏪 Đã vào Võ Quán — Cửa Hàng Đệ Tử! Tiến tới Quầy Tuyển Đệ Tử và nhấn [F] để chiêu mộ đệ tử ($1 / $10 / $100 Gojo)!', 4.8);
    return true;
  }

  function exitDiscipleShop() {
    const p = ctx.player;
    if (!p) return false;
    discipleShopCooldown = 2.4;
    p.inInterior = null;
    if (shopShowcaseGroup) shopShowcaseGroup.visible = false;
    ctx.ui?.closeDiscipleShop?.();
    teleportPlayer(LANDMARKS.discipleShop.x + 2.0, 0.22, LANDMARKS.discipleShop.z, Math.PI * 0.5);
    notifyUI('Đã bước ra Đại Lộ Chu Tước từ Võ Quán.', 2.5);
    return true;
  }

  // ==========================================================================
  // 6D. ĐẠI ĐẤU TRƯỜNG BOSS STADIUM — MESSI & RONALDO (INVINCIBLE + BALL HIDE)
  // ==========================================================================
  function ensureStadiumBallMesh() {
    if (stadiumBall.mesh) return stadiumBall.mesh;
    const ballGroup = new THREE.Group();
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x38bdf8, emissiveIntensity: 0.25, roughness: 0.35 })
    );
    const patchMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const band1 = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.055, 6, 12), patchMat);
    const band2 = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.055, 6, 12), patchMat);
    band2.rotation.y = Math.PI / 2;
    const glowRing = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.72, 20),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = -0.26;
    ballGroup.add(sphere, band1, band2, glowRing);
    ballGroup.userData = { glowRing };
    ballGroup.visible = false;
    gameplayRoot.add(ballGroup);
    stadiumBall.mesh = ballGroup;
    return ballGroup;
  }

  function clearStadiumEntities() {
    for (let i = stadiumBosses.length - 1; i >= 0; i--) {
      removeNPCMesh(stadiumBosses[i]);
    }
    stadiumBosses.length = 0;
    if (stadiumBall.mesh) stadiumBall.mesh.visible = false;
    stadiumBall.state = 'loose';
    stadiumBall.hiddenSpot = null;
    stadiumBall.hiddenTimer = 0;
    stadiumBall.shotBy = null;
    stadiumBall.shotLife = 0;
  }

  function spawnStadiumBossesAndBall() {
    clearStadiumEntities();
    ensureStadiumBallMesh();
    stadiumBall.x = 1800;
    stadiumBall.y = 0.32;
    stadiumBall.z = 1800;
    stadiumBall.vx = 0;
    stadiumBall.vy = 0;
    stadiumBall.vz = 0;
    stadiumBall.state = 'loose';
    stadiumBall.hiddenSpot = null;
    stadiumBall.hiddenTimer = 0;
    stadiumBall.kickCooldown = 1.4;
    stadiumBall.mesh.position.set(stadiumBall.x, stadiumBall.y, stadiumBall.z);
    stadiumBall.mesh.visible = true;

    const bossDefs = [
      { preset: 'boss_messi', id: 'messi', name: 'BOSS LIONEL MESSI #10', x: 1791, z: 1786 },
      { preset: 'boss_ronaldo', id: 'ronaldo', name: 'BOSS CRISTIANO RONALDO #7', x: 1809, z: 1786 }
    ];
    for (const bd of bossDefs) {
      const b = buildNPCEntity(bd.preset, bd.x, 0.05, bd.z, {
        role: 'stadium_boss',
        zone: 'stadium',
        state: 'run',
        weapon: 'unarmed',
        maxHp: BOSS_MAX_HP,
        armor: 0,
        isEnemy: true,
        isHostile: true,
        noWantedOnKill: true,
        yaw: 0
      });
      b.bossId = bd.id;
      b.displayName = bd.name;
      b.isStadiumBoss = true;
      b.invincible = false;
      b.exhausted = false;
      b.exhaustTimer = 0;
      b.searchTargetX = 1800;
      b.searchTargetZ = 1800;
      b.searchTimer = 0;
      // Rất trâu: ~100 viên đạn súng lục mới hạ được về 1 HP. Không thể chết bằng súng —
      // chỉ có Lôi Điểu mới kết liễu được khi Boss đã KIỆT SỨC.
      b.takeDamage = function (dmg, isHeadshot = false) {
        if (this.dead) return;
        let amount = Number(dmg) || 0;
        if (isHeadshot) amount *= 2.0;
        this.hp = Math.max(1, this.hp - amount);
        ctx.characters?.spawnParticles?.(this.x, this.y + 1.2, this.z, 'blood', 2, 2.2);
        if (this.hp <= 1 && !this.exhausted) setBossExhausted(this);
      };
      stadiumBosses.push(b);
    }
  }

  const BOSS_MAX_HP = 2800;
  const BOSS_EXHAUST_DURATION = 14.0;

  function setBossExhausted(boss) {
    boss.hp = 1;
    boss.exhausted = true;
    boss.exhaustTimer = BOSS_EXHAUST_DURATION;
    ctx.characters?.triggerShockRing?.(boss.x, 0.3, boss.z, 0xfacc15, 5.5, 0.5);
    ctx.ui?.showBanner?.(
      `${boss.displayName} KIỆT SỨC!`,
      `Dùng ⚡ LÔI ĐIỂU [R] để KẾT LIỄU trong ${Math.round(BOSS_EXHAUST_DURATION)} giây trước khi hắn hồi sức!`,
      'wanted',
      3.6
    );
  }

  function damageStadiumBoss(boss, amount, source = 'explosion') {
    if (!boss || boss.dead) return { killed: false, dealt: 0 };
    const dmg = Math.max(1, Number(amount) || 160);
    if (source === 'tulen_finisher' && (boss.exhausted || boss.hp <= dmg)) {
      boss.hp = 0;
      boss.exhausted = false;
      handleNPCDeath(boss, true);
      ctx.characters?.triggerShockRing?.(boss.x, 0.3, boss.z, 0x38bdf8, 18, 0.9);
      ctx.characters?.spawnParticles?.(boss.x, boss.y + 1.2, boss.z, 'sword_qi', 26, 10);
      checkStadiumBossVictory();
      return { killed: true, dealt: dmg };
    }
    const prevHp = boss.hp;
    boss.takeDamage(dmg, false);
    return { killed: false, dealt: Math.max(0, Math.round(prevHp - boss.hp)) };
  }

  function checkStadiumBossVictory() {
    if (stadiumBossDefeated || stadiumBosses.length === 0) return;
    if (!stadiumBosses.every((b) => b && b.dead)) return;
    stadiumBossDefeated = true;
    if (stadiumBall.mesh) stadiumBall.mesh.visible = false;
    stadiumBall.state = 'hidden';

    // Permanently raise disciple limit to 8 & recruit Messi #10 + Ronaldo #7!
    maxDisciples = Math.max(maxDisciples, 8);
    if (mission.active && mission.id === 4) {
      completeActiveMission('ĐẠI THẮNG BOSS HUYỀN THOẠI +$100,000');
    } else {
      syncPlayerCash(getPlayerCash() + 100000, true);
      ctx.ui?.showBanner?.('ĐẠI THẮNG BOSS HUYỀN THOẠI!', '+$100,000 • Messi & Ronaldo đã quy phục làm Đệ Tử!', 'passed', 5.0);
    }

    for (const ldef of LEGEND_DISCIPLE_DEFS) {
      const alreadyHas = disciples.some((d) => d && !d.dead && d.tierId === ldef.id);
      if (!alreadyHas) {
        while (disciples.length >= maxDisciples) {
          const rmIdx = disciples.findIndex((d) => d && !d.hasLegendBribe && !d.hasMapNuke);
          const idxToRm = rmIdx >= 0 ? rmIdx : 0;
          removeNPCMesh(disciples[idxToRm]);
          disciples.splice(idxToRm, 1);
        }
        spawnDiscipleInstance(ldef, false);
      }
    }
    rebelsBribedUntil = Math.max(rebelsBribedUntil, elapsedClock + 120);
    setWantedStars(0);
    ctx.audio?.playChime?.();
    saveGame();
    notifyUI('🏆 ĐÃ KẾT LIỄU MESSI #10 & RONALDO #7 BẰNG LÔI ĐIỂU! +$100,000 • Giới hạn đệ tử nâng lên 8 • Messi & Ronaldo gia nhập đội hộ vệ!', 6.5);
  }

  function enterStadium() {
    const p = ctx.player;
    if (!p || deathArrestState.mode) return false;
    stadiumCooldown = 2.5;
    p.inSafehouse = false;
    p.inInterior = 'stadium';
    if (gpsTarget && dist2D(gpsTarget.x, gpsTarget.z, LANDMARKS.stadiumEntrance.x, LANDMARKS.stadiumEntrance.z) < 6) {
      setGPSTarget(null, null);
    }
    teleportPlayer(LANDMARKS.stadiumInterior.x, LANDMARKS.stadiumInterior.y, LANDMARKS.stadiumInterior.z, Math.PI);
    if (!stadiumBossDefeated) {
      spawnStadiumBossesAndBall();
      setMissionObjective('Hạ Messi & Ronaldo (máu cực trâu ~100 viên đạn) về KIỆT SỨC rồi KẾT LIỄU bằng ⚡ Lôi Điểu [R]! Giấu bóng [F] để né cú sút chết người!');
      ctx.ui?.showBanner?.('ĐẠI ĐẤU TRƯỜNG HUYỀN THOẠI!', 'Boss MESSI #10 & RONALDO #7 — Máu cực trâu! Súng chỉ làm kiệt sức, phải kết liễu bằng Lôi Điểu!', 'wanted', 4.0);
    }
    return true;
  }

  function exitStadium() {
    const p = ctx.player;
    if (!p) return false;
    stadiumCooldown = 2.5;
    p.inInterior = null;
    clearStadiumEntities();
    teleportPlayer(LANDMARKS.stadiumEntrance.x - 2.4, 0.22, LANDMARKS.stadiumEntrance.z, -Math.PI * 0.5);
    notifyUI('Đã rời khỏi Đại Đấu Trường ra Đại Lộ Chu Tước.', 2.6);
    return true;
  }

  function updateStadiumBossFight(dt, rawDt) {
    const p = ctx.player;
    if (!p || p.inInterior !== 'stadium' || deathArrestState.mode || stadiumBossDefeated) return;
    if (stadiumBosses.length === 0) return;

    const interactHit = !!(ctx.input?.interactJustPressed || ctx.input?.enterJustPressed || ctx.input?.useJustPressed);
    const BOSS_SPEED = 10.6 * 1.2; // 1.2x player sprint speed (12.72 m/s)

    if (stadiumBall.kickCooldown > 0) stadiumBall.kickCooldown -= rawDt;

    // 1. Player Ball Interaction (Pick up loose ball OR Hide carried ball at hiding spot)
    if (stadiumBall.state === 'loose') {
      const dBall = dist2D(p.x, p.z, stadiumBall.x, stadiumBall.z);
      if (interactHit && dBall < 3.4) {
        stadiumBall.state = 'carried';
        ctx.audio?.playPickup?.();
        notifyUI('⚽ ĐÃ CẦM BÓNG! Chạy nhanh tới Tủ Đồ Bắc / Kho Tây / Hầm Đông và nhấn [F] để GIẤU BÓNG!', 4.2);
      }
    } else if (stadiumBall.state === 'carried') {
      const fwdX = Math.sin(p.yaw || 0);
      const fwdZ = Math.cos(p.yaw || 0);
      stadiumBall.x = p.x + fwdX * 0.85;
      stadiumBall.y = (p.y ?? 0.05) + 0.52;
      stadiumBall.z = p.z + fwdZ * 0.85;

      // Check if near any of the 3 Hiding Spots
      if (interactHit) {
        const nearSpot = STADIUM_HIDE_SPOTS.find((hs) => dist2D(p.x, p.z, hs.x, hs.z) < 4.0);
        if (nearSpot) {
          stadiumBall.state = 'hidden';
          stadiumBall.hiddenSpot = nearSpot;
          stadiumBall.hiddenTimer = 18.0;
          if (stadiumBall.mesh) stadiumBall.mesh.visible = false;
          ctx.audio?.playChime?.();
          notifyUI(`📦 ĐÃ GIẤU BÓNG tại ${nearSpot.name}! Messi & Ronaldo đang mất dấu đi tìm bóng (18 giây an toàn)!`, 4.5);
        }
      }
    } else if (stadiumBall.state === 'hidden') {
      stadiumBall.hiddenTimer -= rawDt;
      if (stadiumBall.hiddenTimer <= 0) {
        const sp = stadiumBall.hiddenSpot || { x: 1800, z: 1800 };
        stadiumBall.x = clamp(sp.x + randRange(-5, 5), 1762, 1838);
        stadiumBall.y = 0.32;
        stadiumBall.z = clamp(sp.z + (sp.z < 1800 ? 6 : -6), 1775, 1823);
        stadiumBall.state = 'loose';
        stadiumBall.hiddenSpot = null;
        stadiumBall.kickCooldown = 1.2;
        if (stadiumBall.mesh) stadiumBall.mesh.visible = true;
        ctx.audio?.playCasinoAlarm?.();
        notifyUI('⚠️ Messi & Ronaldo đã tìm thấy bóng! Chạy né hoặc nhặt giấu bóng tiếp!', 3.8);
      }
    } else if (stadiumBall.state === 'shot') {
      stadiumBall.x += stadiumBall.vx * dt;
      stadiumBall.z += stadiumBall.vz * dt;
      stadiumBall.y = 0.72 + Math.sin(stadiumBall.shotLife * 14) * 0.16;
      stadiumBall.shotLife -= dt;
      if (stadiumBall.mesh) {
        stadiumBall.mesh.rotation.x += dt * 22;
        stadiumBall.mesh.rotation.z += dt * 16;
      }

      // Check 1-SHOT LETHAL HIT on Player!
      if (dist2D(stadiumBall.x, stadiumBall.z, p.x, p.z) < 1.28 && Math.abs((p.y ?? 0) - 0.05) < 1.6) {
        const kickerName = stadiumBall.shotBy || 'Messi / Ronaldo';
        stadiumBall.state = 'loose';
        stadiumBall.vx = 0;
        stadiumBall.vz = 0;
        stadiumBall.y = 0.32;
        ctx.characters?.triggerShockRing?.(p.x, p.y + 0.6, p.z, 0xfacc15, 6.5, 0.5);
        ctx.engine?.addShake?.(1.1);
        ctx.audio?.playExplosion?.(1.1);
        if (!isPlayerInvulnerable()) {
          p.armor = 0;
          p.hp = 0;
          ctx.ui?.showBanner?.('CÚ SÚT THẦN SẦU — 1 HIT!', `Bạn đã bị ${kickerName} sút bóng hạ gục tại chỗ!`, 'wasted', 3.5);
        } else {
          notifyUI(`🛡️ Khiên bất tử đã đỡ cú sút hủy diệt của ${kickerName}!`, 2.5);
        }
      } else if (
        stadiumBall.shotLife <= 0 ||
        stadiumBall.x < 1756 ||
        stadiumBall.x > 1844 ||
        stadiumBall.z < 1770 ||
        stadiumBall.z > 1830
      ) {
        stadiumBall.x = clamp(stadiumBall.x, 1760, 1840);
        stadiumBall.z = clamp(stadiumBall.z, 1773, 1827);
        stadiumBall.y = 0.32;
        stadiumBall.vx = 0;
        stadiumBall.vz = 0;
        stadiumBall.state = 'loose';
      }
    }

    if (stadiumBall.mesh && stadiumBall.state !== 'hidden') {
      stadiumBall.mesh.visible = true;
      stadiumBall.mesh.position.set(stadiumBall.x, stadiumBall.y, stadiumBall.z);
      if (stadiumBall.mesh.userData?.glowRing) {
        stadiumBall.mesh.userData.glowRing.visible = stadiumBall.state === 'loose';
      }
    }

    // 2. Boss AI: Messi #10 & Ronaldo #7 (Invincible, 1.2x player speed, Chase Ball / Tackle / Lethal Kick!)
    for (let i = 0; i < stadiumBosses.length; i++) {
      const boss = stadiumBosses[i];
      if (!boss) continue;
      if (boss.dead) {
        ctx.characters?.animateHumanoid?.(boss.rig, 'dead', dt);
        continue;
      }

      // KIỆT SỨC: quỳ gối đứng yên, chờ Lôi Điểu kết liễu — hết giờ thì hồi 25% máu
      if (boss.exhausted) {
        boss.exhaustTimer -= rawDt;
        if (boss.exhaustTimer <= 0) {
          boss.exhausted = false;
          boss.hp = Math.round(BOSS_MAX_HP * 0.25);
          notifyUI(`⚠️ ${boss.displayName} đã hồi sức (25% máu)! Bắn tiếp rồi dùng Lôi Điểu kết liễu!`, 3.5);
        } else {
          boss.mesh.position.set(boss.x, 0.05, boss.z);
          boss.mesh.rotation.y = boss.yaw;
          ctx.characters?.animateHumanoid?.(boss.rig, 'idle', dt, { moveSpeed: 0 });
          continue;
        }
      }

      let tx = p.x;
      let tz = p.z;
      let speed = BOSS_SPEED;

      if (stadiumBall.state === 'hidden') {
        // Confused — searching the pitch for the hidden ball!
        boss.searchTimer -= rawDt;
        if (boss.searchTimer <= 0 || dist2D(boss.x, boss.z, boss.searchTargetX, boss.searchTargetZ) < 3.0) {
          boss.searchTimer = randRange(1.8, 3.2);
          boss.searchTargetX = randRange(1762, 1838);
          boss.searchTargetZ = randRange(1774, 1825);
        }
        tx = boss.searchTargetX;
        tz = boss.searchTargetZ;
        speed = BOSS_SPEED * 0.72;
      } else if (stadiumBall.state === 'loose') {
        // Nearest active (non-dead, non-exhausted) boss sprints straight for the ball!
        let closerIdx = i;
        let bestD = dist2D(boss.x, boss.z, stadiumBall.x, stadiumBall.z);
        for (let k = 0; k < stadiumBosses.length; k++) {
          const ob = stadiumBosses[k];
          if (!ob || ob.dead || ob.exhausted) continue;
          const od = dist2D(ob.x, ob.z, stadiumBall.x, stadiumBall.z);
          if (od < bestD) {
            bestD = od;
            closerIdx = k;
          }
        }
        if (i === closerIdx) {
          tx = stadiumBall.x;
          tz = stadiumBall.z;
        } else {
          tx = p.x + (i === 0 ? -4.5 : 4.5);
          tz = p.z - 3.0;
        }
      } else if (stadiumBall.state === 'carried') {
        // Both bosses sprint relentlessly at 1.2x player speed to tackle the ball!
        tx = p.x;
        tz = p.z;
      } else if (stadiumBall.state === 'shot') {
        tx = p.x + (i === 0 ? -6 : 6);
        tz = p.z - 6;
        speed = BOSS_SPEED * 0.65;
      }

      const dx = tx - boss.x;
      const dz = tz - boss.z;
      const dist = Math.hypot(dx, dz) || 0.001;
      if (dist > 0.4) {
        boss.x = clamp(boss.x + (dx / dist) * speed * dt, 1756, 1844);
        boss.z = clamp(boss.z + (dz / dist) * speed * dt, 1770, 1830);
        boss.yaw = lerpAngle(boss.yaw, Math.atan2(dx, dz), clamp(dt * 14, 0, 1));
      }

      // If boss tackles player carrying the ball -> knock ball loose & kick!
      if (stadiumBall.state === 'carried' && dist2D(boss.x, boss.z, p.x, p.z) < 1.55) {
        stadiumBall.state = 'loose';
        stadiumBall.x = boss.x + Math.sin(boss.yaw) * 1.1;
        stadiumBall.z = boss.z + Math.cos(boss.yaw) * 1.1;
        stadiumBall.y = 0.32;
        stadiumBall.kickCooldown = 0.35;
        notifyUI(`⚠️ ${boss.displayName} đã xoạc cướp lại bóng! Chạy né cú sút ngay!`, 2.6);
      }

      // If boss reaches loose ball -> FIRE LETHAL 1-SHOT KICK AT PLAYER!
      if (stadiumBall.state === 'loose' && stadiumBall.kickCooldown <= 0 && dist2D(boss.x, boss.z, stadiumBall.x, stadiumBall.z) < 2.2) {
        const kx = p.x - stadiumBall.x;
        const kz = p.z - stadiumBall.z;
        const kd = Math.hypot(kx, kz) || 1;
        const shotSpeed = 29.0;
        stadiumBall.vx = (kx / kd) * shotSpeed;
        stadiumBall.vz = (kz / kd) * shotSpeed;
        stadiumBall.state = 'shot';
        stadiumBall.shotBy = boss.displayName;
        stadiumBall.shotLife = 2.6;
        stadiumBall.kickCooldown = 2.2;
        boss.yaw = Math.atan2(kx, kz);
        ctx.characters?.triggerShockRing?.(stadiumBall.x, 0.35, stadiumBall.z, 0xfacc15, 3.8, 0.38);
        ctx.audio?.playWeaponShot?.('shotgun', 0.65);
      }

      boss.mesh.position.set(boss.x, 0.05, boss.z);
      boss.mesh.rotation.y = boss.yaw;
      ctx.characters?.animateHumanoid?.(boss.rig, dist > 0.5 ? 'sprint' : 'idle', dt, { moveSpeed: speed });
    }
  }

  function defeatStadiumBossesSecretly() {
    const p = ctx.player;
    if (!p) return false;
    stadiumBossDefeated = true;

    // Visual burst on both bosses
    for (const boss of stadiumBosses) {
      if (boss) {
        ctx.characters?.triggerShockRing?.(boss.x, boss.y + 0.5, boss.z, 0xfacc15, 16, 0.85);
        ctx.characters?.spawnParticles?.(boss.x, boss.y + 1.2, boss.z, 'sword_qi', 18, 9.0);
      }
    }
    clearStadiumEntities();

    // Permanently raise disciple limit to 8!
    maxDisciples = Math.max(maxDisciples, 8);

    // Award $100,000 + Complete Mission 4
    if (mission.active && mission.id === 4) {
      completeActiveMission('ĐẠI THẮNG BOSS HUYỀN THOẠI +$100,000');
    } else {
      syncPlayerCash(getPlayerCash() + 100000, true);
      ctx.ui?.showBanner?.('ĐẠI THẮNG BOSS HUYỀN THOẠI!', '+$100,000 • Messi & Ronaldo đã quy phục làm Đệ Tử!', 'passed', 5.0);
    }

    // Exit Stadium back to Đại Lộ Chu Tước so Messi & Ronaldo join right beside you
    if (p.inInterior === 'stadium') {
      p.inInterior = null;
      teleportPlayer(LANDMARKS.stadiumEntrance.x - 2.6, 0.22, LANDMARKS.stadiumEntrance.z, -Math.PI * 0.5);
    }

    // Recruit BOTH Messi #10 & Ronaldo #7 as permanent Disciples (making room if needed up to maxDisciples=8)
    for (const ldef of LEGEND_DISCIPLE_DEFS) {
      const alreadyHas = disciples.some((d) => d && !d.dead && d.tierId === ldef.id);
      if (!alreadyHas) {
        while (disciples.length >= maxDisciples) {
          const rmIdx = disciples.findIndex((d) => d && !d.hasLegendBribe && !d.hasMapNuke);
          const idxToRm = rmIdx >= 0 ? rmIdx : 0;
          removeNPCMesh(disciples[idxToRm]);
          disciples.splice(idxToRm, 1);
        }
        spawnDiscipleInstance(ldef, false);
      }
    }

    rebelsBribedUntil = Math.max(rebelsBribedUntil, elapsedClock + 120);
    setWantedStars(0);
    ctx.audio?.playChime?.();
    saveGame();
    notifyUI('👑 MESSI #10 & RONALDO #7 ĐÃ TRỞ THÀNH ĐỆ TỬ CỦA BẠN! Giới hạn đệ tử tăng lên 8 • Mở khóa kỹ năng Mua Phiến Quân & Giảm Sao Truy Nã [K]!', 6.5);
    return true;
  }

  // ==========================================================================
  // 6E. MESSI & RONALDO SKILL — MUA PHIẾN QUÂN & GIẢM SAO TRUY NÃ [K]
  // ==========================================================================
  function triggerLegendBribeSkill() {
    if (!hasLegendDisciple()) {
      notifyUI('Bạn chưa có đệ tử Messi hoặc Ronaldo để dùng kỹ năng Mua Phiến Quân & Giảm Truy Nã!', 3.2);
      return { ok: false, reason: 'no_legend' };
    }
    if (legendBribeCooldown > 0.05) {
      ctx.audio?.playPhoneError?.();
      notifyUI(`Kỹ năng Messi & Ronaldo đang hồi chiêu — còn ${Math.ceil(legendBribeCooldown)}s!`, 2.5);
      return { ok: false, reason: 'cooldown', remaining: legendBribeCooldown };
    }
    if (ctx.antiCheat && !ctx.antiCheat.verifyAndRecordSkill('legend_bribe', 20000, isNoCooldownActive())) {
      return { ok: false, reason: 'anticheat' };
    }
    legendBribeCooldown = isNoCooldownActive() ? 0 : 20.0;
    rebelsBribedUntil = elapsedClock + 120.0;

    // Immediately pacify all Phiến Quân (Rebels) in Bar Club
    let pacified = 0;
    for (const g of casinoGuards) {
      if (g && !g.dead && g.isRebel) {
        g.bribed = true;
        g.isHostile = false;
        g.isEnemy = false;
        g.state = 'idle';
        pacified++;
      }
    }
    // Reduce / Clear Wanted Stars!
    const oldStars = wanted.stars;
    setWantedStars(0);
    const p = ctx.player;
    if (p) {
      ctx.characters?.triggerShockRing?.(p.x, p.y + 0.2, p.z, 0xfacc15, 14, 0.75);
      ctx.characters?.spawnParticles?.(p.x, p.y + 1.2, p.z, 'palm_qi', 18, 6.5);
    }
    ctx.audio?.playChime?.();
    ctx.ui?.showBanner?.(
      '⚽ MESSI & RONALDO: MUA PHIẾN QUÂN!',
      oldStars > 0
        ? `Phiến Quân đã quy hàng không tấn công bạn • Đã xóa sạch ${oldStars}★ truy nã!`
        : 'Phiến Quân đã được mua chuộc không tấn công bạn & bảo kê giảm sao truy nã!',
      'passed',
      3.5
    );
    return { ok: true, pacified, clearedStars: oldStars };
  }

  // ==========================================================================
  // 6F. SKILL NHÂN VẬT CHÍNH — LÔI ĐIỂU (TULEN) • CHỌN MỤC TIÊU • 1 HIT • 10S CD
  // ==========================================================================
  function getEntityDisplayName(ent) {
    if (!ent) return 'Mục Tiêu';
    if (ent.displayName) return ent.displayName;
    if (ent.isHeli) return 'Trực Thăng Cảnh Sát';
    if (ent.preset === 'swat') return 'Cảnh Sát Cơ Động SWAT';
    if (ent.preset === 'cop') return 'Bổ Khoái Lục Phiến Môn';
    if (ent.preset === 'gangster' || ent.isGangster) return 'Hắc Đạo Giang Hồ';
    if (ent.role === 'bodyguard') return 'Vệ Sĩ Sòng Bạc';
    if (ent.role === 'rebel') return 'Phiến Quân Sòng Bạc';
    if (ent.isRemotePlayer) return ent.name || 'Người Chơi Khác';
    return 'Mục Tiêu Giang Hồ';
  }

  function getTulenTargets() {
    const p = ctx.player;
    if (!p) return [];
    const maxRange = 95;
    const maxR2 = maxRange * maxRange;
    const out = [];
    const seen = new Set();
    const sameZone = (x) => (isInAnyInterior(p) ? Math.abs(x - p.x) < 120 : x < 500);

    const consider = (ent, priority = 1, isHeli = false) => {
      if (!ent || seen.has(ent) || ent.dead || ent === mission.vipNpc || ent.isDisciple || ent.isAlly || ent.invulnerable) return;
      if (!isHeli && typeof ent.hp === 'number' && ent.hp <= 0) return;
      if (!sameZone(ent.x)) return;
      const dx = ent.x - p.x;
      const dz = ent.z - p.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > maxR2) return;
      seen.add(ent);
      out.push({ ent, dist: Math.sqrt(d2), priority, isHeli });
    };

    if (p.inInterior === 'barclub') {
      for (const g of casinoGuards) consider(g, g.isHostile ? 4 : 3, false);
    } else if (p.inInterior === 'stadium') {
      for (const b of stadiumBosses) consider(b, 4, false);
    } else if (!isInAnyInterior(p)) {
      for (const c of cops) consider(c, 4, false);
      for (const h of helicopters) consider({ ...h, _heliRef: h, isHeli: true }, 4, true);
      if (Array.isArray(mission.enemies)) {
        for (const e of mission.enemies) consider(e, 4, false);
      }
      for (const ped of peds) {
        if (!ped) continue;
        const prio = ped.isEnemy || ped.isHostile || ped.isGangster || ped.isMissionEnemy ? 3 : 1;
        consider(ped, prio, false);
      }
      const rps = ctx.mp?.getRemotePlayerTargets?.() || [];
      for (const rp of rps) consider(rp, 3, false);
    }

    // Score by camera crosshair alignment + priority + closeness
    const cam = ctx.engine?.camera;
    const camPos = cam ? cam.position : null;
    const camFwd = cam ? new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).normalize() : null;

    out.sort((a, b) => {
      let scoreA = a.priority * 30 - a.dist * 0.4;
      let scoreB = b.priority * 30 - b.dist * 0.4;
      if (camPos && camFwd) {
        const va = new THREE.Vector3(a.ent.x - camPos.x, (a.ent.y ?? 0) + 1.1 - camPos.y, a.ent.z - camPos.z).normalize();
        const vb = new THREE.Vector3(b.ent.x - camPos.x, (b.ent.y ?? 0) + 1.1 - camPos.y, b.ent.z - camPos.z).normalize();
        scoreA += va.dot(camFwd) * 55;
        scoreB += vb.dot(camFwd) * 55;
      }
      return scoreB - scoreA;
    });
    return out;
  }

  function cancelTulenTargeting() {
    tulenTargetingActive = false;
    tulenLockedTarget = null;
    tulenManualLockTimer = 0;
    if (tulenReticleGroup) tulenReticleGroup.visible = false;
  }

  function toggleTulenTargeting() {
    const p = ctx.player;
    if (!p || p.dead || deathArrestState.mode) return { ok: false, reason: 'unavailable' };
    if (tulenSkillCooldown > 0.05) {
      ctx.audio?.playPhoneError?.();
      notifyUI(`⚡ Lôi Điểu (Tulen) đang hồi chiêu — còn ${tulenSkillCooldown.toFixed(1)}s!`, 2.4);
      return { ok: false, reason: 'cooldown', remaining: tulenSkillCooldown };
    }
    if (tulenTargetingActive && tulenLockedTarget) {
      return fireTulenThunderbird(tulenLockedTarget);
    }
    const list = getTulenTargets();
    if (list.length === 0) {
      ctx.audio?.playPhoneError?.();
      notifyUI('⚡ Lôi Điểu: Không có mục tiêu nào trong tầm 95m!', 2.6);
      return { ok: false, reason: 'no_target' };
    }
    tulenTargetingActive = true;
    tulenLockedTarget = list[0].ent;
    tulenManualLockTimer = 0;
    ctx.audio?.playTulenLock?.();
    notifyUI(`⚡ CHỌN MỤC TIÊU LÔI ĐIỂU: Đã khóa "${getEntityDisplayName(tulenLockedTarget)}"! Nhấn [R] / Click để BẮN 1 HIT, hoặc [X] để Đổi Mục Tiêu!`, 3.5);
    return { ok: true, mode: 'targeting', target: tulenLockedTarget };
  }

  function cycleTulenTarget(dir = 1) {
    if (!tulenTargetingActive) return false;
    const list = getTulenTargets();
    if (list.length === 0) {
      cancelTulenTargeting();
      return false;
    }
    const curIdx = list.findIndex((item) => item.ent === tulenLockedTarget);
    const nextIdx = curIdx < 0 ? 0 : (curIdx + dir + list.length) % list.length;
    tulenLockedTarget = list[nextIdx].ent;
    tulenManualLockTimer = 6.0;
    ctx.audio?.playPhoneTap?.();
    return true;
  }

  function selectTulenTargetByScreenPos(ndcX, ndcY) {
    if (!tulenTargetingActive) return false;
    const cam = ctx.engine?.camera;
    if (!cam) return false;
    const list = getTulenTargets();
    if (list.length === 0) return false;
    let best = null;
    let bestDist2 = 0.12; // ~35% screen radius
    const proj = new THREE.Vector3();
    for (const item of list) {
      proj.set(item.ent.x, (item.ent.y ?? 0) + 1.15, item.ent.z).project(cam);
      if (proj.z > 1 || proj.z < -1) continue;
      const d2 = (proj.x - ndcX) ** 2 + (proj.y - ndcY) ** 2;
      if (d2 < bestDist2) {
        bestDist2 = d2;
        best = item.ent;
      }
    }
    if (best) {
      tulenLockedTarget = best;
      tulenManualLockTimer = 6.0;
      return fireTulenThunderbird(best);
    }
    return false;
  }

  function spawnTulenBirdMesh() {
    const bird = new THREE.Group();
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    const wingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.92, side: THREE.DoubleSide });
    const haloMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.55 });

    const body = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.55, 8), coreMat);
    body.rotation.x = Math.PI / 2;
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.56, 10, 8), haloMat);
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.06, 0.58), wingMat);
    wingL.position.set(-0.78, 0.08, -0.15);
    wingL.rotation.y = 0.42;
    wingL.rotation.z = 0.22;
    const wingR = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.06, 0.58), wingMat);
    wingR.position.set(0.78, 0.08, -0.15);
    wingR.rotation.y = -0.42;
    wingR.rotation.z = -0.22;
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.1, 6), wingMat);
    tail.rotation.x = -Math.PI / 2;
    tail.position.z = -0.95;

    bird.add(body, halo, wingL, wingR, tail);
    gameplayRoot.add(bird);
    return bird;
  }

  function fireTulenThunderbird(explicitTarget = null) {
    const p = ctx.player;
    if (!p || p.dead || deathArrestState.mode) return { ok: false, reason: 'unavailable' };
    if (tulenSkillCooldown > 0.05) {
      ctx.audio?.playPhoneError?.();
      notifyUI(`⚡ Lôi Điểu đang hồi chiêu — còn ${tulenSkillCooldown.toFixed(1)}s!`, 2.2);
      return { ok: false, reason: 'cooldown', remaining: tulenSkillCooldown };
    }
    if (ctx.antiCheat && !ctx.antiCheat.verifyAndRecordSkill('tulen', TULEN_MAX_COOLDOWN * 1000, isNoCooldownActive())) {
      return { ok: false, reason: 'anticheat' };
    }
    let target = explicitTarget || tulenLockedTarget;
    if (!target || target.dead) {
      const list = getTulenTargets();
      if (list.length > 0) target = list[0].ent;
    }
    if (!target) {
      cancelTulenTargeting();
      notifyUI('⚡ Lôi Điểu: Chưa có mục tiêu hợp lệ!', 2.4);
      return { ok: false, reason: 'no_target' };
    }

    tulenSkillCooldown = isNoCooldownActive() ? 0 : TULEN_MAX_COOLDOWN;
    cancelTulenTargeting();

    const sx = p.x;
    const sy = (p.y ?? 0.22) + 1.55;
    const sz = p.z;
    const birdMesh = spawnTulenBirdMesh();
    birdMesh.position.set(sx, sy, sz);

    ctx.characters?.triggerShockRing?.(sx, (p.y ?? 0.22) + 0.25, sz, 0x38bdf8, 5.5, 0.45);
    ctx.characters?.spawnParticles?.(sx, sy, sz, 'sword_qi', 14, 6.5);
    ctx.audio?.playTulenThunderbird?.();
    ctx.engine?.addShake?.(0.32);

    if (p.inInterior === 'barclub' && !casinoAlarmActive) {
      triggerCasinoAlarm('attack');
    }

    activeThunderbirds.push({
      mesh: birdMesh,
      x: sx,
      y: sy,
      z: sz,
      target,
      targetName: getEntityDisplayName(target),
      speed: 58.0,
      life: 0,
      maxLife: 1.85,
      trailTimer: 0
    });
    return { ok: true, targetName: getEntityDisplayName(target) };
  }

  function executeTulenImpact(tb) {
    const t = tb.target;
    const tx = t ? t.x : tb.x;
    const ty = t ? (t.y ?? 0) : tb.y;
    const tz = t ? t.z : tb.z;
    const p = ctx.player;
    const BLAST_RADIUS = 1000;
    const BLAST_RADIUS_SQ = BLAST_RADIUS * BLAST_RADIUS;
    const GRENADE_BLAST_DMG = 160; // Sát thương nổ tương đương súng phóng lựu

    // Dramatic Sky-to-Ground Cyan-White Lightning Strike Pillar + 1km Electric Storm Dome!
    const boltMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.95 });
    const boltMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.65, 28, 8), boltMat);
    boltMesh.position.set(tx, ty + 14, tz);
    gameplayRoot.add(boltMesh);
    tracers.push({ mesh: boltMesh, life: 0.38, maxLife: 0.38, mat: boltMat });

    spawnHollowPurpleDome(tx, ty, tz, 0x38bdf8, 0xe0f2fe);
    ctx.characters?.triggerShockRing?.(tx, ty + 0.25, tz, 0x38bdf8, 85.0, 1.25);
    ctx.characters?.triggerShockRing?.(tx, ty + 0.65, tz, 0xe0f2fe, 45.0, 0.85);
    ctx.characters?.spawnParticles?.(tx, ty + 1.2, tz, 'sword_qi', 26, 12.0);
    ctx.engine?.addShake?.(1.05);
    ctx.audio?.playExplosion?.(1.35);

    const sameZone = (x) => (isInAnyInterior(p) ? Math.abs(x - tx) < 120 : x < 500);
    const seen = new Set();
    let killedRebels = 0;
    let killedOthers = 0;
    let bossStatusMsg = '';

    const applyBlastToEntity = (ent, isDirect = false) => {
      if (!ent || seen.has(ent) || ent.dead || ent === mission.vipNpc || ent.isDisciple || ent.isAlly || ent.invulnerable) return;
      if (!sameZone(ent.x)) return;
      const dx = ent.x - tx;
      const dz = ent.z - tz;
      if (!isDirect && dx * dx + dz * dz > BLAST_RADIUS_SQ) return;
      seen.add(ent);

      // 1. BOSS MESSI & RONALDO: KHÔNG 1 phát chết luôn! Gây sát thương nổ như súng phóng lựu (160 HP),
      //    và KẾT LIỄU nếu Boss đã kiệt sức / máu <= 160!
      if (ent.isStadiumBoss) {
        const res = damageStadiumBoss(ent, GRENADE_BLAST_DMG, 'tulen_finisher');
        if (res.killed) {
          bossStatusMsg = `⚡ LÔI ĐIỂU ĐÃ KẾT LIỄU ${ent.displayName}!`;
        } else {
          bossStatusMsg = `💥 Lôi Điểu gây ${GRENADE_BLAST_DMG} sát thương nổ lên ${ent.displayName} (còn ${Math.ceil(ent.hp)}/${ent.maxHp} HP)!`;
        }
        return;
      }

      if (ent.invincible) {
        notifyUI(`⚡ ${getEntityDisplayName(ent)} miễn nhiễm sát thương!`, 2.6);
        return;
      }

      // 2. PHIẾN QUÂN: 1 phát chết luôn!
      if (ent.isRebel || ent.role === 'rebel') {
        ent.armor = 0;
        ent.hp = 0;
        handleNPCDeath(ent, true);
        killedRebels++;
        return;
      }

      // 3. Các mục tiêu thường khác trong bán kính nổ 1km: gây sát thương nổ như súng phóng lựu (160 HP)
      if (typeof ent.takeDamage === 'function') {
        ent.takeDamage(GRENADE_BLAST_DMG, false);
      } else {
        ent.hp = Math.max(0, (ent.hp ?? 100) - GRENADE_BLAST_DMG);
      }
      if (ent.hp <= 0 && !ent._deathHandled) {
        handleNPCDeath(ent, true);
        killedOthers++;
      }
    };

    // Direct target first
    if (t) {
      if (t.isHeli && t._heliRef) {
        const h = t._heliRef;
        h.hp = 0;
        ctx.characters?.spawnExplosion?.(h.x, h.y, h.z, 1.4, ctx, true);
        if (h.searchlightGroup?.parent) h.searchlightGroup.parent.remove(h.searchlightGroup);
        if (h.groundSpot?.parent) h.groundSpot.parent.remove(h.groundSpot);
        if (h.car) safeRemoveVehicle(h.car);
        if (h.fallbackMesh?.parent) h.fallbackMesh.parent.remove(h.fallbackMesh);
        const hIdx = helicopters.indexOf(h);
        if (hIdx >= 0) helicopters.splice(hIdx, 1);
        killedOthers++;
      } else if (t.isRemotePlayer && ctx.mp?.sendDamage) {
        ctx.mp.sendDamage(t.id, GRENADE_BLAST_DMG, 'tulen_thunderbird');
      } else {
        applyBlastToEntity(t, true);
      }
    }

    // 1km Explosive Shockwave across same zone (Interior OR Exterior 1km)
    if (p?.inInterior === 'barclub') {
      for (const g of casinoGuards) {
        if (g && !g.bribed) applyBlastToEntity(g, false);
      }
    } else if (p?.inInterior === 'stadium') {
      for (const b of stadiumBosses) {
        applyBlastToEntity(b, false);
      }
    } else if (!isInAnyInterior(p)) {
      for (let i = cops.length - 1; i >= 0; i--) applyBlastToEntity(cops[i], false);
      for (let i = 0; i < peds.length; i++) {
        const ped = peds[i];
        if (ped && (ped.isEnemy || ped.isHostile || ped.isGangster || ped.isMissionEnemy || ped.isMissionTarget || ped.isRebel)) {
          applyBlastToEntity(ped, false);
        }
      }
      if (Array.isArray(mission.enemies)) {
        for (let i = 0; i < mission.enemies.length; i++) applyBlastToEntity(mission.enemies[i], false);
      }
      // Blast helicopters & pursuing police cars within 1km (NEVER playerCar!)
      const playerCar = getPlayerVehicle();
      for (let i = helicopters.length - 1; i >= 0; i--) {
        const h = helicopters[i];
        if (!h) continue;
        const dx = h.x - tx;
        const dz = h.z - tz;
        if (dx * dx + dz * dz <= BLAST_RADIUS_SQ) {
          h.hp = 0;
          ctx.characters?.spawnExplosion?.(h.x, h.y, h.z, 1.4, ctx, true);
          if (h.searchlightGroup?.parent) h.searchlightGroup.parent.remove(h.searchlightGroup);
          if (h.groundSpot?.parent) h.groundSpot.parent.remove(h.groundSpot);
          if (h.car) safeRemoveVehicle(h.car);
          if (h.fallbackMesh?.parent) h.fallbackMesh.parent.remove(h.fallbackMesh);
          helicopters.splice(i, 1);
          killedOthers++;
        }
      }
      for (let i = policeVehicles.length - 1; i >= 0; i--) {
        const pv = policeVehicles[i];
        const car = pv?.car;
        if (!car || car === playerCar || car.destroyed) continue;
        const dx = car.x - tx;
        const dz = car.z - tz;
        if (dx * dx + dz * dz <= BLAST_RADIUS_SQ) {
          ctx.vehicles?.damageVehicle?.(car, GRENADE_BLAST_DMG * 2, ctx);
        }
      }
    }

    if (bossStatusMsg) {
      notifyUI(bossStatusMsg, 3.4);
    } else if (killedRebels > 0) {
      notifyUI(`⚡ LÔI ĐIỂU NỔ 1KM: 1 phát kết liễu ${killedRebels} Phiến Quân${killedOthers > 0 ? ` + ${killedOthers} kẻ địch` : ''}!`, 3.6);
    } else if (killedOthers > 0) {
      notifyUI(`⚡ LÔI ĐIỂU NỔ 1KM: Sát thương nổ quét ${killedOthers} mục tiêu trong bán kính 1,000m!`, 3.4);
    } else {
      notifyUI(`⚡ LÔI ĐIỂU NỔ 1KM tại vị trí ${tb.targetName}!`, 2.8);
    }
  }

  function updateTulenSystem(dt, rawDt) {
    if (tulenSkillCooldown > 0) {
      tulenSkillCooldown = Math.max(0, tulenSkillCooldown - rawDt);
    }

    // 1. Update Lock-On Targeting Mode & 3D Cyan Reticle
    if (tulenTargetingActive) {
      if (tulenManualLockTimer > 0) tulenManualLockTimer = Math.max(0, tulenManualLockTimer - rawDt);
      const list = getTulenTargets();
      if (list.length === 0) {
        cancelTulenTargeting();
      } else {
        const stillValid = list.some((it) => it.ent === tulenLockedTarget);
        if (!stillValid || tulenManualLockTimer <= 0) {
          tulenLockedTarget = list[0].ent;
        }
        if (tulenReticleGroup && tulenLockedTarget) {
          tulenReticleGroup.visible = true;
          tulenReticleGroup.position.set(tulenLockedTarget.x, tulenLockedTarget.y ?? 0, tulenLockedTarget.z);
          tulenReticleGroup.rotation.y += rawDt * 4.2;
          const pulse = 1 + Math.sin(elapsedClock * 10) * 0.14;
          tulenReticleGroup.userData?.tRingMid?.scale?.setScalar(pulse);
        }
      }
    } else if (tulenReticleGroup && tulenReticleGroup.visible) {
      tulenReticleGroup.visible = false;
    }

    // 2. Update Active Homing Lôi Điểu Projectiles
    for (let i = activeThunderbirds.length - 1; i >= 0; i--) {
      const tb = activeThunderbirds[i];
      tb.life += rawDt;
      const tx = tb.target ? tb.target.x : tb.x;
      const ty = tb.target ? (tb.target.y ?? 0) + 1.15 : tb.y;
      const tz = tb.target ? tb.target.z : tb.z;
      const dx = tx - tb.x;
      const dy = ty - tb.y;
      const dz = tz - tb.z;
      const dist = Math.hypot(dx, dy, dz) || 0.001;
      const step = tb.speed * rawDt;

      tb.trailTimer -= rawDt;
      if (tb.trailTimer <= 0) {
        tb.trailTimer = 0.04;
        spawnVisualTracer(tb.x, tb.y, tb.z, tb.x - (dx / dist) * 2.2, tb.y - (dy / dist) * 2.2, tb.z - (dz / dist) * 2.2, 'gojo');
      }

      if (dist <= Math.max(1.35, step) || tb.life >= tb.maxLife) {
        tb.x = tx;
        tb.y = ty;
        tb.z = tz;
        executeTulenImpact(tb);
        if (tb.mesh?.parent) tb.mesh.parent.remove(tb.mesh);
        activeThunderbirds.splice(i, 1);
      } else {
        tb.x += (dx / dist) * step;
        tb.y += (dy / dist) * step;
        tb.z += (dz / dist) * step;
        tb.mesh.position.set(tb.x, tb.y, tb.z);
        tb.mesh.lookAt(tx, ty, tz);
      }
    }
  }

  function getTulenState() {
    const p = ctx.player;
    const list = tulenTargetingActive ? getTulenTargets() : [];
    const dist = tulenLockedTarget && p ? Math.round(dist2D(p.x, p.z, tulenLockedTarget.x, tulenLockedTarget.z)) : 0;
    return {
      active: tulenTargetingActive,
      cooldown: tulenSkillCooldown,
      maxCooldown: TULEN_MAX_COOLDOWN,
      hasTarget: Boolean(tulenLockedTarget),
      targetName: tulenLockedTarget ? getEntityDisplayName(tulenLockedTarget) : '',
      targetDist: dist,
      targetCount: list.length
    };
  }

  function deliverVIPVehicleAhead(type) {
    const p = ctx.player;
    if (!p) return null;
    if (p.inSafehouse) exitSafehouse();
    if (p.inInterior === 'barclub') exitBarClub();
    if (p.inInterior === 'shop') exitDiscipleShop();
    if (p.inInterior === 'stadium') exitStadium();

    let sx = p.x + Math.sin(p.yaw || 0) * 8.0;
    let sz = p.z + Math.cos(p.yaw || 0) * 8.0;
    if (ctx.engine?.getAimRay) {
      try {
        const ray = ctx.engine.getAimRay();
        if (ray?.dir) {
          const horiz = Math.hypot(ray.dir.x, ray.dir.z) || 1;
          sx = p.x + (ray.dir.x / horiz) * 8.0;
          sz = p.z + (ray.dir.z / horiz) * 8.0;
        }
      } catch (_) {}
    }

    const temp = { x: sx, y: 0.2, z: sz };
    ctx.world?.resolveCircleAABB?.(temp, 2.4);
    const sy = getGroundY(temp.x, temp.z, 0.08) + (type === 'heli' ? 0.35 : 0.03);
    const carYaw = Math.atan2(p.x - temp.x, p.z - temp.z) + Math.PI / 2;

    const labelMap = {
      obey9f: 'Bạch Long Chiến Xa (9F)',
      banshee: 'Xích Hỏa Thần Mã (Banshee)',
      sedan_lux: 'Hắc Lân Kiệu (Tailgater)',
      heli: 'Thiên Ưng Phi Chu (Maverick)',
      suv: 'Thiết Giáp Hộ Pháp (SUV)',
      police: 'Tuần Phòng Lục Phiến Môn'
    };

    if (ctx.mp?.connected && ctx.mp.requestSpawnVipCar) {
      ctx.mp.requestSpawnVipCar({ type, x: temp.x, y: sy, z: temp.z, yaw: carYaw });
      ctx.audio?.playChime?.();
      notifyUI(`Triệu Hồi Tọa Kỵ Online: Đã gọi ${labelMap[type] || type} tới trước mặt!`, 3.5);
      return true;
    }

    const car = safeSpawnVehicle(type, temp.x, sy, temp.z, carYaw, { isVIPDelivery: true });
    ctx.audio?.playChime?.();
    notifyUI(`Triệu Hồi Tọa Kỵ: Đã giao ${labelMap[type] || type} cách bạn 8m!`, 3.5);
    return car;
  }

  // ==========================================================================
  // 6.5. CỬA HÀNG ĐỆ TỬ (BODYGUARD AI) + GOJO 1KM MAP NUKE + BAR CLUB TÀI XỈU
  // ==========================================================================
  function spawnDiscipleInstance(def, silent = false) {
    const p = ctx.player;
    const scene = getScene();
    if (!p || !scene) return null;

    const idx = disciples.length;
    const spreadAng = (p.yaw || 0) + Math.PI + (idx - 1.5) * 0.52;
    const rad = 2.6 + Math.floor(idx / 3) * 1.4;
    const sx = p.x + Math.sin(spreadAng) * rad;
    const sz = p.z + Math.cos(spreadAng) * rad;
    const sy = isInAnyInterior(p) ? 0.05 : getGroundY(sx, sz, p.y ?? 0.22);

    let rig = null;
    if (ctx.characters?.createHumanoid) {
      try { rig = ctx.characters.createHumanoid(def.id); } catch (_) {}
    }
    const mesh = getRigObject3D(rig) || createFallbackHumanoidMesh(0x4b3478);
    mesh.position.set(sx, sy, sz);
    mesh.rotation.y = p.yaw || 0;
    if (!mesh.parent) scene.add(mesh);

    const disc = {
      id: `disciple_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
      tierId: def.id,
      name: def.name,
      price: def.price,
      skinHex: def.skinHex,
      hasMapNuke: Boolean(def.hasMapNuke),
      hasLegendBribe: Boolean(def.hasLegendBribe),
      nukeRadius: def.nukeRadius || 1000,
      isDisciple: true,
      isAlly: true,
      x: sx,
      y: sy,
      z: sz,
      yaw: p.yaw || 0,
      hp: def.hp,
      maxHp: def.hp,
      dead: false,
      weapon: def.weapon,
      damage: def.damage,
      fireInterval: def.fireInterval,
      shootCooldown: 0.25,
      nukeAnimTimer: 0,
      rig: rig || mesh,
      mesh
    };
    disciples.push(disc);

    if (!silent) {
      ctx.characters?.triggerShockRing?.(sx, sy + 0.12, sz, def.hasMapNuke ? 0xc084fc : 0xf0c35a, def.hasMapNuke ? 4.2 : 2.6, 0.45);
      ctx.characters?.spawnParticles?.(sx, sy + 1.1, sz, def.hasMapNuke ? 'sword_qi' : 'palm_qi', 12, 4.5);
    }
    return disc;
  }

  function buyDisciple(tierId) {
    const def = DISCIPLE_SHOP_CATALOG.find((d) => d.id === tierId);
    if (!def) return { ok: false, reason: 'invalid' };
    if (disciples.length >= maxDisciples) {
      notifyUI(`Đội hộ vệ đã đầy tối đa (${maxDisciples} đệ tử). Hãy giải tán bớt trong Cửa Hàng!`, 3.5);
      return { ok: false, reason: 'full' };
    }
    const cash = getPlayerCash();
    if (cash < def.price) {
      notifyUI(`Không đủ ngân lượng! Cần $${def.price} để chiêu mộ ${def.name} (Hiện có: $${cash}).`, 3.5);
      return { ok: false, reason: 'funds' };
    }

    syncPlayerCash(cash - def.price, true);
    const disc = spawnDiscipleInstance(def, false);
    if (!disc) return { ok: false, reason: 'spawn_failed' };

    ctx.audio?.playChime?.();
    if (def.hasMapNuke) {
      notifyUI(`Đã chiêu mộ ${def.name} (-$${def.price})! Nhấn [G] hoặc nút Tím để tung Hư Thức: Tử nổ 1km (hồi 60s)!`, 5.0);
    } else {
      notifyUI(`Đã chiêu mộ ${def.name} (-$${def.price}, da ${def.skinHex})! Đệ tử sẽ đi theo bảo vệ bạn.`, 3.8);
    }
    return { ok: true, disciple: disc };
  }

  function dismissDisciples() {
    let count = disciples.length;
    for (let i = disciples.length - 1; i >= 0; i--) {
      const d = disciples[i];
      if (d?.mesh?.parent) d.mesh.parent.remove(d.mesh);
      disciples.splice(i, 1);
    }
    if (count > 0) {
      notifyUI(`Đã giải tán ${count} đệ tử hộ vệ.`, 2.8);
    }
    return count;
  }

  function spawnHollowPurpleDome(x, y, z, outerHex = 0xa855f7, coreHex = 0xf5d0fe) {
    const grp = new THREE.Group();
    grp.position.set(x, y + 1.4, z);

    const outerGeo = new THREE.SphereGeometry(1, 20, 14);
    const outerMat = new THREE.MeshBasicMaterial({
      color: outerHex,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);

    const coreGeo = new THREE.SphereGeometry(0.45, 16, 12);
    const coreMat = new THREE.MeshBasicMaterial({
      color: coreHex,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);

    grp.add(outerMesh, coreMesh);
    gameplayRoot.add(grp);
    hollowPurpleBlasts.push({
      grp,
      outerMat,
      coreMat,
      outerGeo,
      coreGeo,
      age: 0,
      maxLife: 1.85,
      maxRadius: 145
    });
  }

  function updateHollowPurpleBlasts(dt) {
    for (let i = hollowPurpleBlasts.length - 1; i >= 0; i--) {
      const b = hollowPurpleBlasts[i];
      b.age += dt;
      const t = b.age / b.maxLife;
      if (t >= 1) {
        if (b.grp.parent) b.grp.parent.remove(b.grp);
        b.outerGeo.dispose();
        b.coreGeo.dispose();
        b.outerMat.dispose();
        b.coreMat.dispose();
        hollowPurpleBlasts.splice(i, 1);
        continue;
      }
      const easeOut = 1 - Math.pow(1 - t, 3);
      const scale = 1.2 + easeOut * b.maxRadius;
      b.grp.scale.setScalar(scale);
      b.outerMat.opacity = (1 - t) * 0.58;
      b.coreMat.opacity = Math.max(0, (1 - t * 1.45) * 0.90);
    }
  }

  function triggerGojoMapNuke(autoTrigger = false) {
    const gojo = disciples.find((d) => d && !d.dead && d.hasMapNuke);
    if (!gojo) {
      if (!autoTrigger) notifyUI('Bạn chưa sở hữu Đệ tử $100 (Sư Huynh Vô Hạn)! Hãy mua trong Cửa Hàng [B].', 3.5);
      return { ok: false, reason: 'no_gojo' };
    }
    if (gojoNukeCooldown > 0.05) {
      if (!autoTrigger) {
        ctx.audio?.playPhoneError?.();
        notifyUI(`Hư Thức: Tử đang hồi chiêu — còn ${Math.ceil(gojoNukeCooldown)} giây!`, 2.8);
      }
      return { ok: false, reason: 'cooldown', remaining: gojoNukeCooldown };
    }
    if (ctx.antiCheat && !ctx.antiCheat.verifyAndRecordSkill('gojo', 60000, isNoCooldownActive())) {
      return { ok: false, reason: 'anticheat' };
    }

    const p = ctx.player;
    const originX = gojo.mesh?.visible ? gojo.x : (p?.x ?? gojo.x);
    const originY = gojo.mesh?.visible ? gojo.y : (p?.y ?? gojo.y);
    const originZ = gojo.mesh?.visible ? gojo.z : (p?.z ?? gojo.z);
    const RADIUS = gojo.nukeRadius || 1000;
    const RADIUS_SQ = RADIUS * RADIUS;

    gojoNukeCooldown = isNoCooldownActive() ? 0 : 60.0;
    gojo.nukeAnimTimer = 1.1;

    // Massive Hollow Purple visual & audio map nuke!
    spawnHollowPurpleDome(originX, originY, originZ);
    ctx.characters?.triggerShockRing?.(originX, originY + 0.3, originZ, 0xc084fc, 95, 1.4);
    ctx.characters?.triggerShockRing?.(originX, originY + 0.8, originZ, 0x38bdf8, 65, 1.1);
    ctx.characters?.spawnParticles?.(originX, originY + 1.5, originZ, 'sword_qi', 28, 16);
    ctx.engine?.addShake?.(1.35);
    if (ctx.audio?.playHollowPurple) ctx.audio.playHollowPurple();
    else ctx.audio?.playExplosion?.(1.6);

    const playerCar = getPlayerVehicle();
    let eliminated = 0;

    // 1. Wipe all Police & SWAT officers within 1km
    for (let i = cops.length - 1; i >= 0; i--) {
      const cop = cops[i];
      if (!cop || cop.dead) continue;
      const dx = cop.x - originX;
      const dz = cop.z - originZ;
      if (dx * dx + dz * dz <= RADIUS_SQ) {
        cop.hp = 0;
        handleNPCDeath(cop, true);
        if (dx * dx + dz * dz < 140 * 140) {
          ctx.characters?.spawnParticles?.(cop.x, cop.y + 1.1, cop.z, 'sword_qi', 6, 5.5);
        }
        eliminated++;
      }
    }

    // 2. Wipe all hostile / enemy / gangster / mission enemy NPCs within 1km (NEVER player, disciples, or VIP!)
    const seen = new Set();
    const wipeEnemy = (ent) => {
      if (!ent || ent.dead || seen.has(ent) || ent === mission.vipNpc || ent.isDisciple || ent.isAlly || ent.invincible || ent.isStadiumBoss) return;
      const dx = ent.x - originX;
      const dz = ent.z - originZ;
      if (dx * dx + dz * dz <= RADIUS_SQ) {
        seen.add(ent);
        ent.hp = 0;
        handleNPCDeath(ent, true);
        if (dx * dx + dz * dz < 140 * 140) {
          ctx.characters?.spawnParticles?.(ent.x, ent.y + 1.1, ent.z, 'sword_qi', 6, 5.5);
        }
        eliminated++;
      }
    };

    for (let i = 0; i < casinoGuards.length; i++) {
      const g = casinoGuards[i];
      if (g && (g.isHostile || g.isEnemy)) wipeEnemy(g);
    }
    for (let i = 0; i < peds.length; i++) {
      const ped = peds[i];
      if (ped && (ped.isEnemy || ped.isHostile || ped.isGangster || ped.isMissionEnemy || ped.isMissionTarget)) {
        wipeEnemy(ped);
      }
    }
    if (Array.isArray(mission.enemies)) {
      for (let i = 0; i < mission.enemies.length; i++) {
        wipeEnemy(mission.enemies[i]);
      }
    }

    // 3. Destroy all enemy Helicopters within 1km
    for (let i = helicopters.length - 1; i >= 0; i--) {
      const h = helicopters[i];
      if (!h) continue;
      const dx = h.x - originX;
      const dz = h.z - originZ;
      if (dx * dx + dz * dz <= RADIUS_SQ) {
        h.hp = 0;
        ctx.characters?.spawnExplosion?.(h.x, h.y, h.z, 1.4, ctx, true);
        if (h.searchlightGroup?.parent) h.searchlightGroup.parent.remove(h.searchlightGroup);
        if (h.groundSpot?.parent) h.groundSpot.parent.remove(h.groundSpot);
        if (h.car) safeRemoveVehicle(h.car);
        if (h.fallbackMesh?.parent) h.fallbackMesh.parent.remove(h.fallbackMesh);
        helicopters.splice(i, 1);
        eliminated++;
      }
    }

    // 4. Destroy chasing Police Vehicles & Mission Rival Cars within 1km (NEVER playerCar!)
    for (let i = policeVehicles.length - 1; i >= 0; i--) {
      const pv = policeVehicles[i];
      const car = pv?.car;
      if (!car || car === playerCar || car.destroyed) continue;
      const dx = car.x - originX;
      const dz = car.z - originZ;
      if (dx * dx + dz * dz <= RADIUS_SQ) {
        ctx.vehicles?.damageVehicle?.(car, 9999, ctx);
        eliminated++;
      }
    }
    if (Array.isArray(mission.rivalCars)) {
      for (let i = mission.rivalCars.length - 1; i >= 0; i--) {
        const car = mission.rivalCars[i]?.car;
        if (!car || car === playerCar || car.destroyed) continue;
        const dx = car.x - originX;
        const dz = car.z - originZ;
        if (dx * dx + dz * dz <= RADIUS_SQ) {
          ctx.vehicles?.damageVehicle?.(car, 9999, ctx);
          eliminated++;
        }
      }
    }

    ctx.ui?.showBanner?.(
      'HƯ THỨC: TỬ — NỔ 1KM!',
      eliminated > 0
        ? `Quét sạch ${eliminated} kẻ địch trong bán kính 1,000m • Hồi chiêu 60s`
        : 'Sóng Hư Thức: Tử đã quét sạch bán kính 1,000m • Hồi chiêu 60s',
      'passed',
      3.4
    );
    return { ok: true, eliminated };
  }

  function findNearestDiscipleTarget(disc, maxRange = 48) {
    let best = null;
    let bestD2 = maxRange * maxRange;
    const p = ctx.player;
    const check = (ent) => {
      if (!ent || ent.dead || ent.hp <= 0 || ent === mission.vipNpc || ent.isDisciple || ent.isAlly || ent.invincible) return;
      const dx = ent.x - disc.x;
      const dz = ent.z - disc.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = ent;
      }
    };

    if (p?.inInterior === 'barclub') {
      for (let i = 0; i < casinoGuards.length; i++) {
        const g = casinoGuards[i];
        if (g && (g.isHostile || g.isEnemy)) check(g);
      }
      return best ? { target: best, dist: Math.sqrt(bestD2) } : null;
    }
    if (isInAnyInterior(p)) return null;

    for (let i = 0; i < cops.length; i++) check(cops[i]);
    for (let i = 0; i < peds.length; i++) {
      const ped = peds[i];
      if (ped && (ped.isEnemy || ped.isHostile || ped.isGangster || ped.isMissionEnemy || ped.isMissionTarget)) {
        check(ped);
      }
    }
    if (Array.isArray(mission.enemies)) {
      for (let i = 0; i < mission.enemies.length; i++) check(mission.enemies[i]);
    }
    return best ? { target: best, dist: Math.sqrt(bestD2) } : null;
  }

  function updateDisciples(dt, rawDt) {
    if (gojoNukeCooldown > 0) {
      gojoNukeCooldown = Math.max(0, gojoNukeCooldown - rawDt);
    }
    const p = ctx.player;
    if (!p || disciples.length === 0) return;

    const inInt = isInAnyInterior(p);
    const playerCar = getPlayerVehicle();
    const carSpeed = playerCar ? Math.hypot(playerCar.vx || 0, playerCar.vz || 0) : 0;
    const hideInFastCar = Boolean(playerCar && carSpeed > 5.5);
    const total = disciples.length;

    for (let i = 0; i < total; i++) {
      const d = disciples[i];
      if (!d || d.dead) continue;

      if (d.hp < d.maxHp) d.hp = Math.min(d.maxHp, d.hp + 12 * rawDt);
      if (d.shootCooldown > 0) d.shootCooldown -= dt;
      if (d.nukeAnimTimer > 0) d.nukeAnimTimer = Math.max(0, d.nukeAnimTimer - dt);

      // Sync inside moving vehicle so disciples never get left behind or run over
      if (hideInFastCar || p.rappelState?.active) {
        d.mesh.visible = false;
        d.x = p.x;
        d.y = p.y;
        d.z = p.z;
        d.mesh.position.set(d.x, d.y, d.z);
        continue;
      }

      if (!d.mesh.visible) {
        const ang = (p.yaw || 0) + Math.PI + (i - (total - 1) * 0.5) * 0.65;
        d.x = p.x + Math.sin(ang) * 3.0;
        d.z = p.z + Math.cos(ang) * 3.0;
        d.y = inInt ? 0.05 : getGroundY(d.x, d.z, p.y ?? 0.22);
        d.mesh.visible = true;
      }

      // Formation anchor behind & flanking player
      const spread = (i - (total - 1) * 0.5) * 0.62;
      const formAng = (p.yaw || 0) + Math.PI + spread;
      const formRad = 2.65 + Math.floor(i / 3) * 1.45;
      const goalX = p.x + Math.sin(formAng) * formRad;
      const goalZ = p.z + Math.cos(formAng) * formRad;

      const distToPlayer = dist2D(d.x, d.z, p.x, p.z);
      if (distToPlayer > 32 || Math.abs(d.x - p.x) > 40) {
        // Khinh Công flash-step catch-up across interiors & city
        d.x = goalX;
        d.z = goalZ;
        d.y = inInt ? 0.05 : getGroundY(d.x, d.z, p.y ?? 0.22);
        ctx.characters?.spawnParticles?.(d.x, d.y + 1.0, d.z, d.hasMapNuke ? 'sword_qi' : 'palm_qi', 6, 3.2);
      }

      const toGoalX = goalX - d.x;
      const toGoalZ = goalZ - d.z;
      const distGoal = Math.hypot(toGoalX, toGoalZ);

      let animState = 'idle';
      let moveSpd = 0;

      if (distGoal > 0.75) {
        moveSpd = distGoal > 6.5 ? 10.2 : distGoal > 2.4 ? 6.8 : 3.6;
        d.x += (toGoalX / distGoal) * moveSpd * dt;
        d.z += (toGoalZ / distGoal) * moveSpd * dt;
        d.yaw = lerpAngle(d.yaw, Math.atan2(toGoalX, toGoalZ), clamp(dt * 10, 0, 1));
        animState = moveSpd > 8.0 ? 'sprint' : moveSpd > 4.5 ? 'run' : 'walk';

        if (!inInt && ctx.world?.resolveCircleAABB) {
          ctx.world.resolveCircleAABB(d, 0.36);
        }
      }

      // Guard / Combat AI: Protect player against enemies (NEVER target player or allies!)
      if (!p.inSafehouse && p.inInterior !== 'shop' && p.inInterior !== 'stadium') {
        const threat = findNearestDiscipleTarget(d, 50);
        if (threat) {
          const tgt = threat.target;
          const tdx = tgt.x - d.x;
          const tdz = tgt.z - d.z;
          d.yaw = lerpAngle(d.yaw, Math.atan2(tdx, tdz), clamp(dt * 14, 0, 1));

          // Auto-unleash 1km Map Nuke if Gojo disciple's 60s cooldown is ready & enemy threatens within 42m
          if (d.hasMapNuke && gojoNukeCooldown <= 0 && threat.dist < 42) {
            triggerGojoMapNuke(true);
          } else {
            if (animState === 'idle') {
              animState = d.hasMapNuke ? 'melee' : d.weapon === 'carbine' ? 'aim_2h' : 'aim_1h';
            }
            if (d.shootCooldown <= 0 && checkClearLOS(d.x, d.y + 1.45, d.z, tgt.x, tgt.y + 1.1, tgt.z)) {
              d.shootCooldown = d.fireInterval;
              spawnVisualTracer(d.x, d.y + 1.42, d.z, tgt.x, tgt.y + 1.12, tgt.z, d.hasMapNuke ? 'gojo' : 'ally');
              if (d.hasMapNuke) {
                ctx.audio?.playSwordSlash?.();
                ctx.characters?.spawnParticles?.(tgt.x, tgt.y + 1.1, tgt.z, 'sword_qi', 6, 4.5);
              } else {
                ctx.audio?.playWeaponShot?.(d.weapon === 'carbine' ? 'carbine' : 'pistol');
                ctx.characters?.spawnParticles?.(tgt.x, tgt.y + 1.1, tgt.z, 'blood', 4, 3.0);
              }
              if (typeof tgt.takeDamage === 'function') tgt.takeDamage(d.damage, false);
              else tgt.hp = Math.max(0, (tgt.hp ?? 60) - d.damage);
              if (tgt.hp <= 0 && !tgt._deathHandled) {
                handleNPCDeath(tgt, true);
              }
            }
          }
        }
      }

      if (d.nukeAnimTimer > 0) animState = 'melee';
      d.y = inInt ? 0.05 : getGroundY(d.x, d.z, d.y);
      d.mesh.position.set(d.x, d.y, d.z);
      d.mesh.rotation.y = d.yaw;
      ctx.characters?.animateHumanoid?.(d.rig, animState, dt, { moveSpeed: moveSpd });
    }
  }

  function playTaiXiuBet(choice, rawAmount) {
    const pick = String(choice || '').toLowerCase();
    if (pick !== 'tai' && pick !== 'xiu' && pick !== 'bao') {
      return { ok: false, reason: 'invalid_choice' };
    }
    const amount = Math.floor(Number(rawAmount) || 0);
    const cash = getPlayerCash();
    if (amount < 1) return { ok: false, reason: 'min_bet' };
    if (amount > cash) return { ok: false, reason: 'insufficient_funds', cash };

    // Deduct wager upfront
    syncPlayerCash(cash - amount, true);

    const d1 = randInt(1, 6);
    const d2 = randInt(1, 6);
    const d3 = randInt(1, 6);
    const sum = d1 + d2 + d3;
    const isTriple = d1 === d2 && d2 === d3;

    let won = false;
    let multiplier = 0;
    if (pick === 'bao') {
      won = isTriple;
      multiplier = 10;
    } else if (pick === 'tai') {
      won = sum >= 11;
      multiplier = 2;
    } else if (pick === 'xiu') {
      won = sum <= 10;
      multiplier = 2;
    }

    const payout = won ? amount * multiplier : 0;
    return {
      ok: true,
      choice: pick,
      amount,
      d1,
      d2,
      d3,
      sum,
      isTriple,
      won,
      multiplier,
      payout,
      net: payout - amount,
      resultTag: isTriple ? 'bao' : sum >= 11 ? 'tai' : 'xiu'
    };
  }

  function applyTaiXiuPayout(payout) {
    const winAmt = Math.max(0, Math.floor(Number(payout) || 0));
    if (winAmt > 0) {
      syncPlayerCash(getPlayerCash() + winAmt, true);
    }
    return getPlayerCash();
  }

  function triggerPhoneAction(actionId) {
    const key = String(actionId || '').toLowerCase().trim();
    if (!key) return false;
    ctx.audio?.playPhoneClick?.();

    if (key === 'mission_1' || key === 'mission1' || key === 'm1' || key === 'start_mission_1') return startMission(1);
    if (key === 'mission_2' || key === 'mission2' || key === 'm2' || key === 'start_mission_2') return startMission(2);
    if (key === 'mission_3' || key === 'mission3' || key === 'm3' || key === 'start_mission_3') return startMission(3);
    if (key === 'mission_4' || key === 'mission4' || key === 'm4' || key === 'start_mission_4') return startMission(4);
    if (key.includes('cancel_mission') || key.includes('abort_mission')) {
      if (mission.active) failActiveMission('Đã hủy kỳ án qua Ngọc Giản.');
      return true;
    }

    if (key.includes('bribe') || key.includes('clear_wanted') || key.includes('lester') || key === 'wanted_clear' || key === 'lspd_bribe' || (key.includes('lspd') && !key.includes('spawn'))) {
      if (wanted.stars === 0) {
        notifyUI('Hiện không có lệnh truy nã của Lục Phiến Môn!', 2.8);
        return false;
      }
      if (getPlayerCash() < 500) {
        notifyUI('Cần $500 ngân lượng để đút lót xóa án tích Lục Phiến Môn!', 3.0);
        return false;
      }
      syncPlayerCash(getPlayerCash() - 500, true);
      setWantedStars(0);
      ctx.audio?.playChime?.();
      notifyUI('Mật Thám Giang Hồ (-$500): Đã xóa sạch lệnh truy nã Lục Phiến Môn!', 4.0);
      return true;
    }

    if (key.includes('casual_polo') || key.includes('polo') || key === 'outfit_1') {
      applyPlayerOutfit('casual_polo');
      notifyUI('Đã khoác: Hiệp Khách Hồng Y (Giao Lĩnh Đỏ & Ngọc Bội)!', 3.0);
      return true;
    }
    if (key.includes('tactical_heist') || key.includes('tactical') || key === 'outfit_2') {
      applyPlayerOutfit('tactical_heist');
      notifyUI('Đã khoác: Dạ Hành Ám Ảnh Y & Đai Cáp Tháp Thiên Cơ!', 3.0);
      return true;
    }
    if (key.includes('luxury_suit') || key.includes('suit') || key === 'outfit_3') {
      applyPlayerOutfit('luxury_suit');
      notifyUI('Đã khoác: Cẩm Y Công Tử Bào Vương Phủ!', 3.0);
      return true;
    }

    if (key.includes('obey9f') || key.includes('9f') || key.includes('cabrio')) return !!deliverVIPVehicleAhead('obey9f');
    if (key.includes('banshee')) return !!deliverVIPVehicleAhead('banshee');
    if (key.includes('sedan_lux') || key.includes('tailgater') || key.includes('sedan')) return !!deliverVIPVehicleAhead('sedan_lux');
    if (key.includes('heli') || key.includes('maverick')) return !!deliverVIPVehicleAhead('heli');
    if (key.includes('suv') || key.includes('baller')) return !!deliverVIPVehicleAhead('suv');
    if (key.includes('swat')) return !!deliverVIPVehicleAhead('swat_van');
    if (key.includes('police')) return !!deliverVIPVehicleAhead('police');

    if (key.includes('bright_day') || key === 'weather_day') {
      ctx.engine?.setTimeWeather?.('BRIGHT_DAY');
      notifyUI('Thiên Thời: Nắng Đẹp Hoa Đào Bay!', 2.8);
      return true;
    }
    if (key.includes('sunset') || key.includes('gold')) {
      ctx.engine?.setTimeWeather?.('SUNSET_GOLD');
      notifyUI('Thiên Thời: Hoàng Hôn Vàng Bến Cảng Bồng Lai!', 2.8);
      return true;
    }
    if (key.includes('overcast') || key.includes('rain')) {
      ctx.engine?.setTimeWeather?.('OVERCAST_RAIN');
      notifyUI('Thiên Thời: Mưa Giang Nam Đường Ướt!', 2.8);
      return true;
    }
    if (key.includes('neon') || key.includes('night')) {
      ctx.engine?.setTimeWeather?.('NEON_NIGHT');
      notifyUI('Thiên Thời: Đêm Hoa Đăng Kinh Thành!', 2.8);
      return true;
    }

    if (key === 'quality_ultra' || key === 'ultra') { ctx.engine?.setQuality?.('ULTRA', true); notifyUI('Đồ họa: Tuyệt Đỉnh (ULTRA)!', 2.5); return true; }
    if (key === 'quality_high' || key === 'high') { ctx.engine?.setQuality?.('HIGH', true); notifyUI('Đồ họa: Cao (HIGH)!', 2.5); return true; }
    if (key === 'quality_mobile' || key === 'mobile') { ctx.engine?.setQuality?.('MOBILE', true); notifyUI('Đồ họa: Mượt Di Động!', 2.5); return true; }

    if (key === 'buy_disciple_1') return buyDisciple('disciple_1').ok;
    if (key === 'buy_disciple_10') return buyDisciple('disciple_10').ok;
    if (key === 'buy_disciple_100') return buyDisciple('disciple_100').ok;
    if (key === 'dismiss_disciples') { dismissDisciples(); return true; }
    if (key === 'gojo_nuke') return triggerGojoMapNuke(false).ok;
    if (key === 'gps_barclub') {
      setGPSTarget(LANDMARKS.barClub.x, LANDMARKS.barClub.z);
      notifyUI('Đã bật GPS dẫn đường tới Bar Club VIP — Sòng Tài Xỉu (54, 14)! Hãy tự di chuyển tới cửa.', 4.0);
      return true;
    }
    if (key === 'gps_shop') {
      setGPSTarget(LANDMARKS.discipleShop.x, LANDMARKS.discipleShop.z);
      notifyUI('Đã bật GPS dẫn đường tới Cửa Hàng Đệ Tử (26, -14)! Hãy tự di chuyển tới cửa.', 4.0);
      return true;
    }
    if (key === 'gps_race') {
      const rp = ctx.raceArena?.ENTRANCE_POS || { x: 25.6, z: 80.0 };
      setGPSTarget(rp.x, rp.z);
      notifyUI('🏁 Đã bật GPS dẫn đường tới Trường Đua Tử Thần (26, 80)! Hãy tự di chuyển tới cửa và bấm [F] để vào.', 4.2);
      return true;
    }

    if (key.includes('reset')) return resetSave();
    if (key.includes('load')) return loadGame();
    if (key.includes('save')) return saveGame();

    return false;
  }

  function hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (_) { return false; }
  }

  function saveGame() {
    const p = ctx.player;
    if (!p) return false;
    const isInsideSafe = !!p.inSafehouse || p.x > 500;
    const payload = {
      version: 1,
      savedAt: Date.now(),
      cash: getPlayerCash(),
      hp: p.hp ?? 100,
      armor: p.armor ?? 0,
      special: p.special ?? 100,
      outfit: p.outfit || 'casual_polo',
      weapon: p.weaponId || p.weapon || 'bat',
      x: isInsideSafe ? 24 : p.x,
      y: isInsideSafe ? 0.22 : p.y,
      z: isInsideSafe ? -76.5 : p.z,
      yaw: p.yaw ?? Math.PI,
      completedMissions: Array.from(completedMissions),
      disciples: disciples.map((d) => d.tierId),
      maxDisciples,
      timeWeather: ctx.engine?.timeWeather || 'BRIGHT_DAY',
      quality: ctx.engine?.quality || 'HIGH'
    };
    try {
      if (ctx.antiCheat?.signSaveObject) {
        payload._acSig = ctx.antiCheat.signSaveObject(payload);
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      notifyUI('Đã lưu hành trang Giang Hồ vào bộ nhớ trình duyệt!', 3.0);
      return true;
    } catch (_) {
      return false;
    }
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return false;
      if (ctx.antiCheat?.verifySaveObject && !ctx.antiCheat.verifySaveObject(data, data._acSig)) {
        try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
        ctx.antiCheat.flagCheat('save_tamper', 'Phát hiện chỉnh sửa file lưu localStorage! Đã hủy bản lưu gian lận.');
        return false;
      }

      const p = ctx.player;
      if (p) {
        syncPlayerCash(Number.isFinite(data.cash) ? data.cash : 7860, false);
        p.hp = clamp(Number(data.hp) || 100, 25, 100);
        p.armor = clamp(Number(data.armor) || 0, 0, 100);
        p.special = clamp(Number(data.special) || 100, 0, 100);
        p.inSafehouse = false;
        p.inInterior = null;
        if (data.outfit) applyPlayerOutfit(data.outfit);
        if (data.weapon) setPlayerActiveWeapon(data.weapon);
        if (Number.isFinite(data.x) && Number.isFinite(data.z) && !ctx.mp?.connected) {
          teleportPlayer(data.x, Number.isFinite(data.y) ? data.y : getGroundY(data.x, data.z, 0.22), data.z, Number.isFinite(data.yaw) ? data.yaw : Math.PI);
        }
      }

      completedMissions.clear();
      if (Array.isArray(data.completedMissions)) {
        for (const mId of data.completedMissions) completedMissions.add(Number(mId));
      }
      maxDisciples = Math.max(6, Number(data.maxDisciples) || (completedMissions.has(4) ? 8 : 6));
      dismissDisciples();
      if (Array.isArray(data.disciples)) {
        const allDefs = [...DISCIPLE_SHOP_CATALOG, ...LEGEND_DISCIPLE_DEFS];
        for (const tid of data.disciples.slice(0, maxDisciples)) {
          const def = allDefs.find((item) => item.id === tid);
          if (def) spawnDiscipleInstance(def, true);
        }
      }
      if (data.timeWeather) ctx.engine?.setTimeWeather?.(data.timeWeather);
      if (data.quality && !isMobile) ctx.engine?.setQuality?.(data.quality);

      setWantedStars(0);
      notifyUI('Đã khôi phục hành trang Giang Hồ thành công!', 3.2);
      return true;
    } catch (_) {
      return false;
    }
  }

  function resetSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
    if (!ctx.mp?.connected) setInvulnerabilityRemainingMs(0);
    cleanupMissionEntities();
    clearCasinoInteriorNPCs();
    clearStadiumEntities();
    cancelTulenTargeting();
    mission.active = false;
    mission.id = 0;
    mission.stage = 0;
    completedMissions.clear();
    dismissDisciples();
    maxDisciples = 6;
    gojoNukeCooldown = 0;
    tulenSkillCooldown = 0;
    legendBribeCooldown = 0;
    noCooldownUntil = 0;
    rebelsBribedUntil = 0;
    stadiumBossDefeated = false;
    deactivateSpecial();
    setWantedStars(0);

    const p = ctx.player;
    if (p) {
      p.inSafehouse = false;
      p.inInterior = null;
      p.dead = false;
      p.hp = 100;
      p.armor = 50;
      p.special = 100;
      syncPlayerCash(7860, false);
      applyPlayerOutfit('casual_polo');
      setPlayerActiveWeapon('bat');
      if (!ctx.mp?.connected) teleportPlayer(26, 0.22, 28, Math.PI);
    }
    notifyUI('Đã khởi tạo lại hành trình mới tại Đại Lộ Chu Tước!', 3.5);
    return true;
  }

  function updateTransientFX(dt) {
    for (let i = tracers.length - 1; i >= 0; i--) {
      const tr = tracers[i];
      tr.life -= dt;
      if (tr.life <= 0) {
        if (tr.mesh.parent) tr.mesh.parent.remove(tr.mesh);
        tracers.splice(i, 1);
      }
    }
    for (let i = glassShards.length - 1; i >= 0; i--) {
      const gs = glassShards[i];
      gs.life -= dt;
      gs.vy -= 9.8 * dt;
      gs.mesh.position.x += gs.vx * dt;
      gs.mesh.position.y += gs.vy * dt;
      gs.mesh.position.z += gs.vz * dt;
      gs.mesh.rotation.x += gs.rx * dt;
      gs.mesh.rotation.y += gs.ry * dt;
      if (gs.life <= 0 || gs.mesh.position.y < 0.05) {
        if (gs.mesh.parent) gs.mesh.parent.remove(gs.mesh);
        glassShards.splice(i, 1);
      }
    }
    if (gunfireAlert.timer > 0) gunfireAlert.timer = Math.max(0, gunfireAlert.timer - dt);
  }

  function ensureWorldPopulated() {
    ensureVisualsInitialized();
    if (populatedWorld) return;
    if (!ctx.world || !ctx.vehicles || !ctx.characters) return;
    populatedWorld = true;

    if (ctx.player) {
      if (!Number.isFinite(ctx.player.hp)) ctx.player.hp = 100;
      if (!Number.isFinite(ctx.player.maxHp)) ctx.player.maxHp = 100;
      if (!Number.isFinite(ctx.player.armor)) ctx.player.armor = 50;
      if (!Number.isFinite(ctx.player.special)) ctx.player.special = 100;
      if (!Number.isFinite(ctx.player.maxSpecial)) ctx.player.maxSpecial = 100;
      getPlayerCash();
    }

    if (!ctx.mp?.connected) {
      for (let i = 0; i < TARGET_TRAFFIC_COUNT; i++) spawnOneTrafficCar(false);
    }

    for (let i = 0; i < BEACH_PED_COUNT; i++) spawnAmbientPed('beach');
    for (let i = 0; i < PIER_PED_COUNT; i++) spawnAmbientPed('pier');
    while (peds.length < TARGET_PED_COUNT) spawnAmbientPed('city');
  }

  function updateGameplay(dtArg, secondArg) {
    const scale = Math.max(0.05, Number(ctx.timeScale) || 1.0);
    const dt = clamp(Number(dtArg) || 0.016, 0.0001, 0.1);
    const rawDt =
      typeof secondArg === 'number' && secondArg > 0 && secondArg <= 0.25
        ? secondArg
        : clamp(dt / scale, 0.0001, 0.1);

    elapsedClock += dt;
    ensureWorldPopulated();

    updateWastedBustedState(rawDt);
    updateSpecialAbility(rawDt);

    if (isNoCooldownActive()) {
      tulenSkillCooldown = 0;
      gojoNukeCooldown = 0;
      legendBribeCooldown = 0;
      casinoRobCooldown = 0;
    }

    if (!deathArrestState.mode) {
      updateTrafficAI(dt, rawDt);
      updatePedestriansAndEnemies(dt);
      updateCasinoInterior(dt, rawDt);
      updateStadiumBossFight(dt, rawDt);
      updateDisciples(dt, rawDt);
      updateWantedAndPolice(dt, rawDt);
      updateActiveMission(dt, rawDt);
      updatePickupsAndLandmarks(dt, rawDt);
      updateTulenSystem(dt, rawDt);

      if (gpsTarget && !(ctx.player?.rappelState && ctx.player.rappelState.active)) {
        gpsRefreshTimer -= rawDt;
        if (gpsRefreshTimer <= 0) {
          gpsRefreshTimer = 0.55;
          updateGPSRoute(gpsTarget.x, gpsTarget.z);
        }
      }
    }

    updateHollowPurpleBlasts(rawDt);
    updateTransientFX(dt);
  }

  ensureWorldPopulated();

  const api = {
    peds,
    cops,
    enemies: casinoGuards,
    casinoGuards,
    stadiumBosses,
    getStadiumBossesHUD: () =>
      stadiumBosses.map((b) => ({
        id: b.bossId,
        name: b.displayName,
        hp: Math.max(0, Math.ceil(b.hp || 0)),
        maxHp: b.maxHp || BOSS_MAX_HP,
        dead: Boolean(b.dead),
        exhausted: Boolean(b.exhausted),
        exhaustTimer: Math.max(0, b.exhaustTimer || 0)
      })),
    stadiumBall,
    STADIUM_HIDE_SPOTS,
    disciples,
    DISCIPLE_SHOP_CATALOG,
    LEGEND_DISCIPLE_DEFS,
    getMaxDisciples: () => maxDisciples,
    helicopters,
    pickups,
    wanted,
    mission,
    gpsWaypoints,
    setGPSTarget,
    getGPSTarget: () => gpsTarget,
    addCrimeHeat,
    setWantedStars,
    clearTrafficCars,
    syncPlayerCash,
    teleportPlayer,
    startMission,
    buyDisciple,
    dismissDisciples,
    triggerGojoMapNuke,
    getGojoNukeCooldown: () => gojoNukeCooldown,
    hasGojoDisciple: () => disciples.some((d) => d && !d.dead && d.hasMapNuke),
    hasLegendDisciple,
    triggerLegendBribeSkill,
    getLegendBribeCooldown: () => legendBribeCooldown,
    toggleTulenTargeting,
    cancelTulenTargeting,
    cycleTulenTarget,
    selectTulenTargetByScreenPos,
    fireTulenThunderbird,
    getTulenState,
    playTaiXiuBet,
    applyTaiXiuPayout,
    enterBarClub,
    exitBarClub,
    robCasinoCash,
    getCasinoState: () => ({ alarm: casinoAlarmActive, robCooldown: casinoRobCooldown, rebelsBribed: areRebelsBribed() }),
    enterDiscipleShop,
    exitDiscipleShop,
    enterStadium,
    exitStadium,
    barClubPos: LANDMARKS.barClub,
    discipleShopPos: LANDMARKS.discipleShop,
    stadiumEntrancePos: LANDMARKS.stadiumEntrance,
    triggerPhoneAction,
    dialPhoneCode,
    isPlayerInvulnerable,
    getInvulnerabilityRemainingMs,
    setInvulnerabilityRemainingMs,
    isNoCooldownActive,
    getNoCooldownRemainingMs,
    revokeBuffsOnCheat,
    enterSafehouse,
    exitSafehouse,
    saveGame,
    loadGame,
    resetSave,
    hasSave,
    updateGameplay
  };

  ctx.gameplay = api;
  return api;
}
