// ============================================================================
// GIANG HỒ ĐẠI LỘ & BỜ BIỂN 3D — CHARACTERS, WUXIA COMBAT, KHINH CÔNG & FX
// ============================================================================

export function createCharacterSystem(ctx = {}, THREE) {
  const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  function damp(cur, target, lambda, dt) {
    return lerp(cur, target, 1 - Math.exp(-lambda * dt));
  }

  function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function dampAngle(cur, target, lambda, dt) {
    const diff = normalizeAngle(target - cur);
    return normalizeAngle(cur + diff * (1 - Math.exp(-lambda * dt)));
  }

  let _rngSeed = 918273;
  function nextRand() {
    _rngSeed = (_rngSeed * 1664525 + 1013904223) >>> 0;
    return _rngSeed / 4294967296;
  }

  const _v1 = new THREE.Vector3();
  const _v2 = new THREE.Vector3();
  const _v3 = new THREE.Vector3();
  const _camFwd = new THREE.Vector3();
  const _camRight = new THREE.Vector3();
  const _quat = new THREE.Quaternion();
  const _upVec = new THREE.Vector3(0, 1, 0);

  // ============================================================================
  // 2. NEO-WUXIA WEAPON DEFINITIONS (7 Slots, 100% ID-Compatible)
  // ============================================================================
  const WEAPON_ORDER = ['unarmed', 'bat', 'pistol', 'smg', 'carbine', 'shotgun', 'grenade'];

  const weaponDefs = {
    unarmed: {
      id: 'unarmed',
      slot: 0,
      name: 'Quyền Pháp Nội Gia',
      shortName: 'Quyền Pháp',
      label: 'Quyền Pháp Nội Gia',
      category: 'melee',
      animType: 'melee',
      isMelee: true,
      isExplosive: false,
      auto: false,
      fullAuto: false,
      driveBy: false,
      allowInVehicle: false,
      damage: 24,
      dmg: 24,
      cooldown: 0.28,
      cd: 0.28,
      range: 2.55,
      speed: 0,
      spread: 0,
      pellets: 1,
      clipSize: Infinity,
      magSize: 0,
      defaultAmmo: Infinity,
      recoil: 0.14,
      headshotMult: 1.5,
      vehicleDamageMult: 0.5,
      scopeZoom: false,
      ejectShell: false,
      sound: 'unarmed'
    },
    bat: {
      id: 'bat',
      slot: 1,
      name: 'Thanh Phong Kiếm',
      shortName: 'Thanh Phong Kiếm',
      label: 'Thanh Phong Kiếm (Kiếm Khí)',
      category: 'melee',
      animType: 'melee',
      isMelee: true,
      hasSwordQi: true,
      isExplosive: false,
      auto: false,
      fullAuto: false,
      driveBy: false,
      allowInVehicle: false,
      damage: 52,
      dmg: 52,
      cooldown: 0.44,
      cd: 0.44,
      range: 22.0,
      meleeRange: 3.1,
      speed: 44,
      spread: 0.008,
      pellets: 1,
      clipSize: Infinity,
      magSize: 0,
      defaultAmmo: Infinity,
      recoil: 0.22,
      headshotMult: 1.85,
      vehicleDamageMult: 1.35,
      scopeZoom: false,
      ejectShell: false,
      sound: 'bat'
    },
    pistol: {
      id: 'pistol',
      slot: 2,
      name: 'Linh Cơ Thủ Pháo',
      shortName: 'Thủ Pháo',
      label: 'Linh Cơ Thủ Pháo',
      category: 'pistol',
      animType: 'aim_1h',
      isMelee: false,
      isExplosive: false,
      auto: false,
      fullAuto: false,
      driveBy: true,
      allowInVehicle: true,
      damage: 28,
      dmg: 28,
      cooldown: 0.20,
      cd: 0.20,
      range: 52,
      speed: 155,
      spread: 0.015,
      pellets: 1,
      clipSize: 16,
      magSize: 16,
      defaultAmmo: 120,
      recoil: 0.24,
      headshotMult: 2.5,
      vehicleDamageMult: 1.0,
      scopeZoom: false,
      ejectShell: true,
      shellColor: 0xd4af37,
      sound: 'pistol'
    },
    smg: {
      id: 'smg',
      slot: 3,
      name: 'Liên Châu Tiễn Cơ',
      shortName: 'Liên Châu Tiễn',
      label: 'Liên Châu Tiễn Cơ',
      category: 'smg',
      animType: 'aim_1h',
      isMelee: false,
      isExplosive: false,
      auto: true,
      fullAuto: true,
      driveBy: true,
      allowInVehicle: true,
      damage: 17,
      dmg: 17,
      cooldown: 0.08,
      cd: 0.08,
      range: 45,
      speed: 148,
      spread: 0.042,
      pellets: 1,
      clipSize: 30,
      magSize: 30,
      defaultAmmo: 240,
      recoil: 0.14,
      headshotMult: 2.5,
      vehicleDamageMult: 0.95,
      scopeZoom: false,
      ejectShell: true,
      shellColor: 0xd4af37,
      sound: 'smg'
    },
    carbine: {
      id: 'carbine',
      slot: 4,
      name: 'Hỏa Long Trường Thương',
      shortName: 'Hỏa Long Thương',
      label: 'Hỏa Long Trường Thương',
      category: 'rifle',
      animType: 'aim_2h',
      isMelee: false,
      isExplosive: false,
      auto: true,
      fullAuto: true,
      driveBy: false,
      allowInVehicle: false,
      damage: 25,
      dmg: 25,
      cooldown: 0.10,
      cd: 0.10,
      range: 68,
      speed: 185,
      spread: 0.014,
      pellets: 1,
      clipSize: 30,
      magSize: 30,
      defaultAmmo: 180,
      recoil: 0.16,
      headshotMult: 2.5,
      vehicleDamageMult: 1.25,
      scopeZoom: true,
      ejectShell: true,
      shellColor: 0xd4af37,
      sound: 'carbine'
    },
    shotgun: {
      id: 'shotgun',
      slot: 5,
      name: 'Hổ Phách Thần Pháo',
      shortName: 'Hổ Phách Pháo',
      label: 'Hổ Phách Thần Pháo',
      category: 'shotgun',
      animType: 'aim_2h',
      isMelee: false,
      isExplosive: false,
      auto: false,
      fullAuto: false,
      driveBy: false,
      allowInVehicle: false,
      damage: 12,
      dmg: 12,
      totalDamage: 96,
      cooldown: 0.72,
      cd: 0.72,
      range: 26,
      speed: 132,
      spread: 0.092,
      pellets: 8,
      clipSize: 8,
      magSize: 8,
      defaultAmmo: 48,
      recoil: 0.46,
      headshotMult: 2.5,
      vehicleDamageMult: 2.1,
      scopeZoom: false,
      ejectShell: true,
      shellColor: 0xb82222,
      sound: 'shotgun'
    },
    grenade: {
      id: 'grenade',
      slot: 6,
      name: 'Thần Công Hỏa Lựu',
      shortName: 'Thần Công Lựu',
      label: 'Thần Công Hỏa Lựu',
      category: 'heavy',
      animType: 'aim_2h',
      isMelee: false,
      isExplosive: true,
      auto: false,
      fullAuto: false,
      driveBy: false,
      allowInVehicle: false,
      damage: 150,
      dmg: 150,
      cooldown: 1.02,
      cd: 1.02,
      range: 58,
      speed: 35,
      gravity: 15.5,
      spread: 0.012,
      pellets: 1,
      clipSize: 6,
      magSize: 6,
      defaultAmmo: 12,
      recoil: 0.42,
      headshotMult: 1.0,
      vehicleDamageMult: 3.0,
      blastRadius: 8.5,
      scopeZoom: false,
      ejectShell: false,
      sound: 'grenade'
    }
  };

  Object.defineProperties(weaponDefs, {
    0: { value: weaponDefs.unarmed, enumerable: false },
    1: { value: weaponDefs.bat, enumerable: false },
    2: { value: weaponDefs.pistol, enumerable: false },
    3: { value: weaponDefs.smg, enumerable: false },
    4: { value: weaponDefs.carbine, enumerable: false },
    5: { value: weaponDefs.shotgun, enumerable: false },
    6: { value: weaponDefs.grenade, enumerable: false },
    fist: { value: weaponDefs.unarmed, enumerable: false },
    sword: { value: weaponDefs.bat, enumerable: false },
    uzi: { value: weaponDefs.smg, enumerable: false },
    rifle: { value: weaponDefs.carbine, enumerable: false },
    m4: { value: weaponDefs.carbine, enumerable: false },
    launcher: { value: weaponDefs.grenade, enumerable: false },
    order: { value: WEAPON_ORDER, enumerable: false }
  });

  function resolveWeaponDef(keyOrIdx) {
    if (!keyOrIdx && keyOrIdx !== 0) return weaponDefs.bat;
    if (typeof keyOrIdx === 'object' && keyOrIdx.id) return weaponDefs[keyOrIdx.id] || keyOrIdx;
    return weaponDefs[keyOrIdx] || weaponDefs.bat;
  }

  // ============================================================================
  // 3. SHARED ANATOMICAL + WUXIA MARTIAL GEOMETRY CACHE
  // ============================================================================
  function mergeGeos(geos) {
    const nonIndexed = geos.map((g) => (g.index ? g.toNonIndexed() : g.clone()));
    let totalVerts = 0;
    for (let i = 0; i < nonIndexed.length; i++) {
      totalVerts += nonIndexed[i].attributes.position.count;
    }
    const pos = new Float32Array(totalVerts * 3);
    const norm = new Float32Array(totalVerts * 3);
    let offset = 0;
    for (let i = 0; i < nonIndexed.length; i++) {
      const g = nonIndexed[i];
      const p = g.attributes.position.array;
      pos.set(p, offset);
      if (g.attributes.normal) {
        norm.set(g.attributes.normal.array, offset);
      }
      offset += p.length;
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
    merged.computeBoundingSphere();
    return merged;
  }

  const geoCache = (() => {
    const pelvis = new THREE.CylinderGeometry(0.152, 0.138, 0.19, 16);
    pelvis.scale(1.06, 1.0, 0.74);

    const hipJoint = new THREE.SphereGeometry(0.080, 12, 10);
    hipJoint.scale(0.96, 1.0, 0.96);

    const abdomen = new THREE.CylinderGeometry(0.162, 0.148, 0.22, 16);
    abdomen.scale(1.04, 1.0, 0.72);
    abdomen.translate(0, 0.11, 0);

    const chest = new THREE.CylinderGeometry(0.192, 0.160, 0.28, 18);
    chest.scale(1.12, 1.0, 0.75);
    chest.translate(0, 0.33, 0);

    const shoulderBridge = new THREE.CapsuleGeometry(0.068, 0.30, 8, 14);
    shoulderBridge.rotateZ(Math.PI / 2);
    shoulderBridge.scale(1.0, 0.86, 0.92);
    shoulderBridge.translate(0, 0.43, -0.005);

    const neck = new THREE.CylinderGeometry(0.055, 0.064, 0.11, 14);
    neck.translate(0, 0.045, 0);

    const cranium = new THREE.SphereGeometry(0.112, 18, 16);
    cranium.scale(0.88, 1.06, 0.97);
    cranium.translate(0, 0.125, 0.004);

    const jaw = new THREE.CapsuleGeometry(0.068, 0.045, 8, 12);
    jaw.scale(0.95, 0.90, 0.98);
    jaw.translate(0, 0.072, 0.022);

    const ear = new THREE.SphereGeometry(0.024, 8, 8);
    ear.scale(0.45, 1.15, 0.75);

    const nose = new THREE.ConeGeometry(0.016, 0.042, 6);
    nose.rotateX(Math.PI * 0.42);
    nose.translate(0, 0.112, 0.112);

    const eye = new THREE.SphereGeometry(0.013, 8, 8);
    const brow = new THREE.CapsuleGeometry(0.007, 0.026, 4, 6);
    brow.rotateZ(Math.PI / 2);

    const hairTop = new THREE.SphereGeometry(0.116, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58);
    hairTop.scale(0.90, 1.06, 0.99);
    hairTop.translate(0, 0.132, -0.004);

    // Wuxia Topknot (Búi Tóc Hiệp Khách + Trâm Vàng)
    const hairBun = new THREE.SphereGeometry(0.045, 10, 8);
    hairBun.scale(0.95, 1.15, 0.95);
    hairBun.translate(0, 0.245, -0.025);

    const hairPin = new THREE.CylinderGeometry(0.005, 0.005, 0.16, 6);
    hairPin.rotateZ(Math.PI / 2);
    hairPin.translate(0, 0.248, -0.025);

    // Wuxia Headband Ring + Flowing Ribbon Tail
    const headbandRing = new THREE.CylinderGeometry(0.106, 0.106, 0.026, 16, 1, true);
    headbandRing.scale(0.92, 1.0, 1.02);
    headbandRing.translate(0, 0.164, 0.002);

    const ribbonTail = new THREE.BoxGeometry(0.024, 0.006, 0.34);
    ribbonTail.translate(0, 0, -0.17);

    // Conical Martial Hat (Đấu Lạp Giang Hồ)
    const conicalHatCone = new THREE.ConeGeometry(0.32, 0.15, 18);
    conicalHatCone.translate(0, 0.255, 0);
    const conicalHatFinial = new THREE.SphereGeometry(0.024, 8, 6);
    conicalHatFinial.translate(0, 0.335, 0);

    const sunglasses = new THREE.CapsuleGeometry(0.020, 0.11, 6, 10);
    sunglasses.rotateZ(Math.PI / 2);
    sunglasses.scale(1.0, 0.85, 0.55);
    sunglasses.translate(0, 0.126, 0.098);

    const deltoid = new THREE.SphereGeometry(0.066, 12, 10);
    deltoid.scale(0.95, 1.08, 0.95);

    const shortSleeve = new THREE.CylinderGeometry(0.072, 0.064, 0.165, 14);
    shortSleeve.translate(0, -0.078, 0);

    const upperArm = new THREE.CylinderGeometry(0.061, 0.050, 0.275, 14);
    upperArm.translate(0, -0.1375, 0);

    const elbowJoint = new THREE.SphereGeometry(0.049, 10, 10);

    const foreArm = new THREE.CylinderGeometry(0.049, 0.037, 0.255, 14);
    foreArm.translate(0, -0.1275, 0);

    // Wuxia Martial Bracer (Hộ Uyển)
    const wuxiaBracer = new THREE.CylinderGeometry(0.053, 0.044, 0.135, 12);
    wuxiaBracer.translate(0, -0.145, 0);

    const hand = new THREE.CapsuleGeometry(0.034, 0.042, 6, 10);
    hand.scale(0.78, 1.0, 1.05);
    hand.translate(0, -0.042, 0.006);

    const thigh = new THREE.CylinderGeometry(0.086, 0.066, 0.42, 14);
    thigh.scale(0.98, 1.0, 1.06);
    thigh.translate(0, -0.21, 0);

    const shortsLeg = new THREE.CylinderGeometry(0.089, 0.078, 0.28, 14);
    shortsLeg.scale(0.97, 1.0, 1.06);
    shortsLeg.translate(0, -0.14, 0);

    const kneeJoint = new THREE.SphereGeometry(0.062, 12, 10);

    const calf = new THREE.CylinderGeometry(0.062, 0.044, 0.40, 14);
    calf.scale(0.95, 1.0, 1.04);
    calf.translate(0, -0.20, 0);

    const shoeUpper = new THREE.CapsuleGeometry(0.048, 0.115, 8, 12);
    shoeUpper.rotateX(Math.PI / 2);
    shoeUpper.scale(1.02, 0.84, 1.0);
    shoeUpper.translate(0, -0.028, 0.042);

    const shoeSole = new THREE.CapsuleGeometry(0.051, 0.128, 6, 12);
    shoeSole.rotateX(Math.PI / 2);
    shoeSole.scale(1.06, 0.36, 1.02);
    shoeSole.translate(0, -0.056, 0.044);

    // Wuxia Waist Sash + Jade Pendant (Đai Lưng Lụa + Ngọc Bội)
    const belt = new THREE.CylinderGeometry(0.164, 0.162, 0.062, 16);
    belt.scale(1.06, 1.0, 0.77);
    belt.translate(0, 0.055, 0);

    const robeSkirtFlap = new THREE.BoxGeometry(0.24, 0.28, 0.025);

    const jadePendant = new THREE.TorusGeometry(0.028, 0.009, 8, 14);
    jadePendant.translate(0.135, -0.04, 0.095);

    const poloCollar = new THREE.TorusGeometry(0.072, 0.016, 8, 16, Math.PI * 1.45);
    poloCollar.rotateX(Math.PI / 2);
    poloCollar.rotateY(Math.PI * 0.78);
    poloCollar.translate(0, 0.465, 0.005);

    // Crossed Cổ Phong Lapel Strips
    const wuxiaLapelStrip = new THREE.BoxGeometry(0.036, 0.25, 0.018);

    const shirtFront = new THREE.ConeGeometry(0.078, 0.22, 4);
    shirtFront.rotateX(Math.PI);
    shirtFront.scale(1.0, 1.0, 0.25);
    shirtFront.translate(0, 0.365, 0.138);

    const necktie = new THREE.CylinderGeometry(0.012, 0.022, 0.22, 6);
    necktie.scale(1.0, 1.0, 0.35);
    necktie.translate(0, 0.34, 0.148);

    const tacticalVest = new THREE.CylinderGeometry(0.204, 0.178, 0.27, 16);
    tacticalVest.scale(1.12, 1.0, 0.80);
    tacticalVest.translate(0, 0.31, 0);

    const shoulderArmor = new THREE.SphereGeometry(0.074, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
    shoulderArmor.translate(0, 0.01, 0);

    const forearmPad = new THREE.CapsuleGeometry(0.026, 0.12, 6, 8);
    forearmPad.translate(0, -0.12, -0.032);

    const kneePad = new THREE.SphereGeometry(0.052, 10, 8);
    kneePad.scale(0.95, 1.15, 0.65);
    kneePad.translate(0, 0, 0.044);

    const harnessWaist = new THREE.CylinderGeometry(0.172, 0.170, 0.048, 16);
    harnessWaist.scale(1.08, 1.0, 0.78);
    harnessWaist.translate(0, 0.09, 0);

    const harnessStrap = new THREE.CapsuleGeometry(0.016, 0.31, 6, 8);
    harnessStrap.scale(1.2, 1.0, 0.45);

    const thighStrap = new THREE.TorusGeometry(0.082, 0.013, 6, 14);
    thighStrap.rotateX(Math.PI / 2);
    thighStrap.scale(0.98, 1.06, 1.0);
    thighStrap.translate(0, -0.14, 0);

    const carabiner = new THREE.TorusGeometry(0.030, 0.0065, 8, 14);
    carabiner.scale(0.78, 1.25, 1.0);

    const maskShell = new THREE.SphereGeometry(0.116, 16, 14);
    maskShell.scale(0.92, 1.08, 1.02);
    maskShell.translate(0, 0.125, 0.008);

    const maskVisorLens = new THREE.CapsuleGeometry(0.040, 0.078, 8, 12);
    maskVisorLens.rotateZ(Math.PI / 2);
    maskVisorLens.scale(1.0, 0.92, 0.58);
    maskVisorLens.translate(0, 0.132, 0.094);

    const maskSnout = new THREE.CylinderGeometry(0.034, 0.040, 0.058, 12);
    maskSnout.rotateX(Math.PI * 0.38);
    maskSnout.translate(0, 0.068, 0.108);

    const maskCanister = new THREE.CylinderGeometry(0.032, 0.032, 0.072, 12);
    maskCanister.rotateZ(Math.PI * 0.32);
    maskCanister.rotateX(Math.PI * 0.25);
    maskCanister.translate(0.068, 0.064, 0.088);

    const badge = new THREE.CircleGeometry(0.022, 6);
    badge.translate(-0.068, 0.375, 0.146);

    const swatHelmet = new THREE.SphereGeometry(0.128, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.64);
    swatHelmet.scale(0.95, 1.04, 1.04);
    swatHelmet.translate(0, 0.135, -0.002);

    // FX Geometries (Bullets, Grenades & Glowing Crescent Sword Qi!)
    const shellGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.040, 8);
    shellGeo.rotateX(Math.PI / 2);

    const tracerGeo = new THREE.CapsuleGeometry(0.018, 0.52, 4, 6);
    tracerGeo.rotateX(Math.PI / 2);

    const grenadeRoundGeo = new THREE.CapsuleGeometry(0.045, 0.09, 6, 8);
    grenadeRoundGeo.rotateX(Math.PI / 2);

    // Crescent Sword Qi Wave (Kiếm Khí Bán Nguyệt) oriented forward (+Z)
    const swordQiGeo = new THREE.TorusGeometry(0.82, 0.055, 8, 22, Math.PI * 0.92);
    swordQiGeo.rotateX(Math.PI / 2);
    swordQiGeo.rotateY(-Math.PI * 0.46);
    swordQiGeo.rotateZ(0.22); // stylish diagonal martial slash tilt!

    const muzzleFinGeo = new THREE.ConeGeometry(0.065, 0.28, 5);
    muzzleFinGeo.rotateX(Math.PI / 2);
    muzzleFinGeo.translate(0, 0, 0.14);

    const particleSphere = new THREE.SphereGeometry(0.09, 7, 6);
    const glassShardGeo = new THREE.TetrahedronGeometry(0.075, 0);
    const shockRingGeo = new THREE.RingGeometry(0.68, 1.0, 28);
    shockRingGeo.rotateX(-Math.PI / 2);

    const bloodPoolGeo = new THREE.CircleGeometry(0.46, 14);
    bloodPoolGeo.rotateX(-Math.PI / 2);

    const cableCylGeo = new THREE.CylinderGeometry(0.013, 0.013, 1.0, 8);
    cableCylGeo.translate(0, 0.5, 0);

    // Pre-merged RenderWare-style anatomical geometries (reduces per-humanoid draw calls)
    const torsoMerged = mergeGeos([abdomen, chest, shoulderBridge]);

    const frontFlapGeo = robeSkirtFlap.clone();
    frontFlapGeo.rotateX(-0.06);
    frontFlapGeo.translate(0, -0.09, 0.122);
    const backFlapGeo = robeSkirtFlap.clone();
    backFlapGeo.rotateX(0.06);
    backFlapGeo.translate(0, -0.09, -0.122);
    const robeSkirtsMerged = mergeGeos([frontFlapGeo, backFlapGeo]);

    const lapelLGeo = wuxiaLapelStrip.clone();
    lapelLGeo.rotateZ(-0.34);
    lapelLGeo.translate(0.032, 0.355, 0.144);
    const poloCollarMerged = mergeGeos([poloCollar, lapelLGeo]);

    const hStrapDefs = [
      [0.075, 0.28, 0.135, 0.22],
      [-0.075, 0.28, 0.135, -0.22],
      [0.07, 0.28, -0.13, -0.18],
      [-0.07, 0.28, -0.13, 0.18]
    ];
    const harnessParts = [harnessWaist];
    for (let i = 0; i < hStrapDefs.length; i++) {
      const [hx, hy, hz, hzRot] = hStrapDefs[i];
      const g = harnessStrap.clone();
      g.rotateZ(hzRot);
      g.translate(hx, hy, hz);
      harnessParts.push(g);
    }
    const harnessStrapsMerged = mergeGeos(harnessParts);

    const earLGeo = ear.clone();
    earLGeo.translate(0.098, 0.118, 0.0);
    const earRGeo = ear.clone();
    earRGeo.translate(-0.098, 0.118, 0.0);
    const headSkinMerged = mergeGeos([cranium, jaw, nose, earLGeo, earRGeo]);

    const eyeLGeo = eye.clone();
    eyeLGeo.translate(0.036, 0.130, 0.098);
    const eyeRGeo = eye.clone();
    eyeRGeo.translate(-0.036, 0.130, 0.098);
    const eyesMerged = mergeGeos([eyeLGeo, eyeRGeo]);

    const browLGeo = brow.clone();
    browLGeo.translate(0.036, 0.148, 0.102);
    const browRGeo = brow.clone();
    browRGeo.translate(-0.036, 0.148, 0.102);
    const browsMerged = mergeGeos([browLGeo, browRGeo]);

    const gasMaskMetalMerged = mergeGeos([maskSnout, maskCanister]);
    const upperArmMerged = mergeGeos([deltoid, upperArm]);
    const foreArmMerged = mergeGeos([elbowJoint, foreArm]);
    const thighMerged = mergeGeos([hipJoint, thigh]);
    const shortsMerged = mergeGeos([hipJoint, shortsLeg]);
    const calfMerged = mergeGeos([kneeJoint, calf]);

    const blobShadowGeo = new THREE.PlaneGeometry(0.95, 0.95);
    blobShadowGeo.rotateX(-Math.PI / 2);

    // Gojo Satoru ($100 Ultimate Disciple) Merged Spiky White Hair, Blindfold & High Collar
    const gojoHairParts = [];
    const gojoCrown = new THREE.SphereGeometry(0.118, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56);
    gojoCrown.scale(0.94, 1.06, 1.02);
    gojoCrown.translate(0, 0.145, -0.004);
    gojoHairParts.push(gojoCrown);
    const spikeDefs = [
      // [x, y, z, rx, rz, radius, height]
      [0.0, 0.285, 0.015, 0.08, 0.0, 0.036, 0.125],
      [0.048, 0.275, 0.025, 0.14, -0.34, 0.033, 0.118],
      [-0.048, 0.275, 0.025, 0.14, 0.34, 0.033, 0.118],
      [0.088, 0.242, 0.018, 0.10, -0.68, 0.030, 0.110],
      [-0.088, 0.242, 0.018, 0.10, 0.68, 0.030, 0.110],
      [0.030, 0.270, 0.068, 0.42, -0.22, 0.028, 0.105],
      [-0.030, 0.270, 0.068, 0.42, 0.22, 0.028, 0.105],
      [0.072, 0.236, 0.062, 0.36, -0.58, 0.026, 0.095],
      [-0.072, 0.236, 0.062, 0.36, 0.58, 0.026, 0.095],
      [0.0, 0.272, -0.042, -0.32, 0.0, 0.034, 0.115],
      [0.056, 0.256, -0.048, -0.34, -0.44, 0.030, 0.108],
      [-0.056, 0.256, -0.048, -0.34, 0.44, 0.030, 0.108],
      [0.098, 0.205, -0.024, -0.18, -0.88, 0.026, 0.092],
      [-0.098, 0.205, -0.024, -0.18, 0.88, 0.026, 0.092],
      [0.0, 0.232, -0.086, -0.72, 0.0, 0.030, 0.102],
      [0.048, 0.215, -0.082, -0.68, -0.42, 0.026, 0.090],
      [-0.048, 0.215, -0.082, -0.68, 0.42, 0.026, 0.090]
    ];
    for (let i = 0; i < spikeDefs.length; i++) {
      const [sx, sy, sz, rx, rz, r, h] = spikeDefs[i];
      const sp = new THREE.ConeGeometry(r, h, 5);
      sp.rotateX(rx);
      sp.rotateZ(rz);
      sp.translate(sx, sy, sz);
      gojoHairParts.push(sp);
    }
    const gojoHairMerged = mergeGeos(gojoHairParts);

    const bfBand = new THREE.CylinderGeometry(0.115, 0.113, 0.072, 18, 1, false);
    bfBand.scale(0.94, 1.0, 1.04);
    bfBand.translate(0, 0.138, 0.006);
    const bfRidge = new THREE.TorusGeometry(0.112, 0.011, 6, 16);
    bfRidge.rotateX(Math.PI / 2);
    bfRidge.scale(0.94, 1.04, 1.0);
    bfRidge.translate(0, 0.154, 0.006);
    const gojoBlindfold = mergeGeos([bfBand, bfRidge]);

    const collarCyl = new THREE.CylinderGeometry(0.112, 0.102, 0.145, 16, 1, false);
    collarCyl.scale(1.06, 1.0, 0.96);
    collarCyl.translate(0, 0.495, 0.005);
    const collarRim = new THREE.TorusGeometry(0.110, 0.014, 6, 16);
    collarRim.rotateX(Math.PI / 2);
    collarRim.scale(1.06, 0.96, 1.0);
    collarRim.translate(0, 0.562, 0.005);
    const gojoCollarMerged = mergeGeos([collarCyl, collarRim]);

    const vf1 = new THREE.BoxGeometry(0.036, 0.34, 0.022);
    vf1.rotateZ(-0.22);
    vf1.translate(0.055, 0.30, 0.142);
    const vf2 = new THREE.BoxGeometry(0.032, 0.28, 0.022);
    vf2.rotateZ(0.32);
    vf2.translate(-0.075, 0.33, 0.136);
    const gojoVioletFold = mergeGeos([vf1, vf2]);

    return {
      pelvis,
      hipJoint,
      abdomen,
      chest,
      shoulderBridge,
      torsoMerged,
      neck,
      cranium,
      jaw,
      ear,
      nose,
      eye,
      brow,
      headSkinMerged,
      eyesMerged,
      browsMerged,
      hairTop,
      hairBun,
      hairPin,
      headbandRing,
      ribbonTail,
      conicalHatCone,
      conicalHatFinial,
      sunglasses,
      deltoid,
      shortSleeve,
      upperArm,
      upperArmMerged,
      elbowJoint,
      foreArm,
      foreArmMerged,
      wuxiaBracer,
      hand,
      thigh,
      thighMerged,
      shortsLeg,
      shortsMerged,
      kneeJoint,
      calf,
      calfMerged,
      shoeUpper,
      shoeSole,
      belt,
      robeSkirtFlap,
      robeSkirtsMerged,
      jadePendant,
      poloCollar,
      poloCollarMerged,
      wuxiaLapelStrip,
      shirtFront,
      necktie,
      tacticalVest,
      shoulderArmor,
      forearmPad,
      kneePad,
      harnessWaist,
      harnessStrap,
      harnessStrapsMerged,
      thighStrap,
      carabiner,
      maskShell,
      maskVisorLens,
      maskSnout,
      maskCanister,
      gasMaskMetalMerged,
      badge,
      swatHelmet,
      gojoHairMerged,
      gojoBlindfold,
      gojoCollarMerged,
      gojoVioletFold,
      shellGeo,
      tracerGeo,
      grenadeRoundGeo,
      swordQiGeo,
      muzzleFinGeo,
      particleSphere,
      glassShardGeo,
      shockRingGeo,
      bloodPoolGeo,
      blobShadowGeo,
      cableCylGeo
    };
  })();

  // ============================================================================
  // 4. SHARED PBR MATERIALS & WUXIA JADE / GOLD / SWORD QI SHADERS
  // ============================================================================
  const matPool = {
    chrome: new THREE.MeshStandardMaterial({ color: 0xd8e0e8, metalness: 0.92, roughness: 0.14 }),
    swordBlade: new THREE.MeshStandardMaterial({
      color: 0xe8f7ff,
      emissive: 0x2ec4b6,
      emissiveIntensity: 0.35,
      metalness: 0.95,
      roughness: 0.10
    }),
    imperialGold: new THREE.MeshStandardMaterial({
      color: 0xf0c35a,
      emissive: 0x3b2806,
      emissiveIntensity: 0.18,
      metalness: 0.88,
      roughness: 0.22
    }),
    jadeStone: new THREE.MeshStandardMaterial({
      color: 0x2ec486,
      emissive: 0x0b4f33,
      emissiveIntensity: 0.28,
      metalness: 0.15,
      roughness: 0.22
    }),
    bambooHat: new THREE.MeshStandardMaterial({ color: 0x382c22, roughness: 0.72, metalness: 0.08 }),
    crimsonRibbon: new THREE.MeshStandardMaterial({
      color: 0xc81d32,
      emissive: 0x38060c,
      emissiveIntensity: 0.15,
      roughness: 0.55
    }),
    gunmetal: new THREE.MeshStandardMaterial({ color: 0x1c2026, metalness: 0.72, roughness: 0.34 }),
    darkPolymer: new THREE.MeshStandardMaterial({ color: 0x131519, metalness: 0.20, roughness: 0.65 }),
    goldBadge: new THREE.MeshStandardMaterial({ color: 0xe6c14f, metalness: 0.88, roughness: 0.22 }),
    brassShell: new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.90, roughness: 0.18 }),
    shotgunShell: new THREE.MeshStandardMaterial({ color: 0xb82222, metalness: 0.35, roughness: 0.38 }),
    reflectiveVisor: new THREE.MeshPhysicalMaterial({
      color: 0x142230,
      metalness: 0.85,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05
    }),
    eyeDark: new THREE.MeshStandardMaterial({ color: 0x121316, roughness: 0.25 }),
    whiteCloth: new THREE.MeshStandardMaterial({ color: 0xf2eee4, roughness: 0.68 }),
    sneakerWhite: new THREE.MeshStandardMaterial({ color: 0xedeff2, roughness: 0.50 }),
    leatherBlack: new THREE.MeshStandardMaterial({ color: 0x181416, roughness: 0.40, metalness: 0.14 }),
    tacticalArmor: new THREE.MeshStandardMaterial({ color: 0x232730, roughness: 0.42, metalness: 0.36 }),
    canisterAccent: new THREE.MeshStandardMaterial({ color: 0xc99a2c, roughness: 0.45, metalness: 0.35 }),
    cableSteel: new THREE.MeshStandardMaterial({ color: 0x9aa4b0, metalness: 0.85, roughness: 0.26 }),
    gojoWhiteHair: new THREE.MeshStandardMaterial({
      color: 0xf4f7ff,
      emissive: 0x2a3348,
      emissiveIntensity: 0.28,
      roughness: 0.52,
      metalness: 0.05
    }),
    gojoBlindfold: new THREE.MeshStandardMaterial({ color: 0x101218, roughness: 0.82, metalness: 0.04 }),
    gojoVioletAccent: new THREE.MeshStandardMaterial({
      color: 0x4b3478,
      emissive: 0x1c1036,
      emissiveIntensity: 0.22,
      roughness: 0.56,
      metalness: 0.10
    }),
    bloodPool: new THREE.MeshBasicMaterial({
      color: 0x4d0608,
      transparent: true,
      opacity: 0.82,
      depthWrite: false
    }),
    tracerBullet: new THREE.MeshBasicMaterial({
      color: 0xffe494,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }),
    swordQiWave: new THREE.MeshBasicMaterial({
      color: 0x6bf5e8,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    muzzleFlash: new THREE.MeshBasicMaterial({
      color: 0xffd268,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    blobShadow: (() => {
      let tex = null;
      if (typeof document !== 'undefined') {
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        const g = c.getContext('2d');
        if (g) {
          const grad = g.createRadialGradient(32, 32, 4, 32, 32, 30);
          grad.addColorStop(0, 'rgba(0,0,0,0.52)');
          grad.addColorStop(0.6, 'rgba(0,0,0,0.24)');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = grad;
          g.fillRect(0, 0, 64, 64);
          tex = new THREE.CanvasTexture(c);
        }
      }
      return new THREE.MeshBasicMaterial({
        color: 0x000000,
        map: tex,
        transparent: true,
        opacity: tex ? 0.95 : 0.32,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      });
    })()
  };

  function makeFabricMat(hex, opts = {}) {
    const tex = ctx.engine?.textures;
    const mat = new THREE.MeshStandardMaterial({
      color: hex,
      roughness: opts.roughness ?? 0.74,
      metalness: opts.metalness ?? 0.05
    });
    if (opts.useDenim && tex?.denimTexture) {
      mat.map = tex.denimTexture;
    }
    if (tex?.fabricNormal) {
      mat.normalMap = tex.fabricNormal;
      mat.normalScale = new THREE.Vector2(0.30, 0.30);
    }
    mat.userData.isFabric = true;
    mat.userData.useDenim = Boolean(opts.useDenim);
    return mat;
  }

  function makeSkinMat(hex) {
    return new THREE.MeshStandardMaterial({
      color: hex,
      roughness: 0.60,
      metalness: 0.02
    });
  }

  let _texturesBound = false;
  const _trackedFabricMats = [];
  function ensureFabricTextures() {
    if (_texturesBound) return;
    const tex = ctx.engine?.textures;
    if (!tex) return;
    _texturesBound = true;
    for (let i = 0; i < _trackedFabricMats.length; i++) {
      const m = _trackedFabricMats[i];
      if (tex.fabricNormal && !m.normalMap) {
        m.normalMap = tex.fabricNormal;
        m.normalScale = new THREE.Vector2(0.30, 0.30);
        m.needsUpdate = true;
      }
      if (m.userData.useDenim && tex.denimTexture && !m.map) {
        m.map = tex.denimTexture;
        m.needsUpdate = true;
      }
    }
    _trackedFabricMats.length = 0;
  }

  // ============================================================================
  // 5. LAZY ON-DEMAND 3D WEAPON BUILDER (Featuring Thanh Phong Kiếm!)
  // ============================================================================
  const _weaponGeoCache = {};

  function buildSingleWeaponModel(id) {
    if (id === 'bat') {
      if (!_weaponGeoCache.bat) {
        const gripGeo = new THREE.CylinderGeometry(0.015, 0.016, 0.20, 10);
        gripGeo.rotateX(Math.PI * 0.46);
        gripGeo.translate(0, 0.0, 0.04);

        const pommelGeo = new THREE.OctahedronGeometry(0.024, 0);
        pommelGeo.translate(0, -0.015, -0.065);
        const guardGeo = new THREE.BoxGeometry(0.14, 0.028, 0.036);
        guardGeo.translate(0, 0.022, 0.145);
        const goldMerged = mergeGeos([pommelGeo, guardGeo]);

        const jadeGeo = new THREE.SphereGeometry(0.016, 8, 8);
        jadeGeo.translate(0, 0.022, 0.145);

        const bladeGeo = new THREE.ConeGeometry(0.026, 0.86, 4);
        bladeGeo.scale(1.25, 1.0, 0.28);
        bladeGeo.rotateX(Math.PI * 0.46);
        bladeGeo.translate(0, 0.068, 0.57);

        _weaponGeoCache.bat = { gripGeo, goldMerged, jadeGeo, bladeGeo };
      }
      const cg = _weaponGeoCache.bat;
      const swordGrp = new THREE.Group();
      swordGrp.add(
        new THREE.Mesh(cg.gripGeo, matPool.crimsonRibbon),
        new THREE.Mesh(cg.goldMerged, matPool.imperialGold),
        new THREE.Mesh(cg.jadeGeo, matPool.jadeStone),
        new THREE.Mesh(cg.bladeGeo, matPool.swordBlade)
      );
      swordGrp.userData.muzzle = new THREE.Vector3(0, 0.09, 0.86);
      swordGrp.userData.breech = new THREE.Vector3(0, 0.02, 0.15);
      return swordGrp;
    }

    if (id === 'pistol') {
      if (!_weaponGeoCache.pistol) {
        const gripGeo = new THREE.BoxGeometry(0.030, 0.105, 0.046);
        gripGeo.rotateX(0.22);
        gripGeo.translate(0, -0.01, 0.01);
        const frameGeo = new THREE.BoxGeometry(0.032, 0.028, 0.195);
        frameGeo.translate(0, 0.042, 0.072);
        const slideGeo = new THREE.BoxGeometry(0.034, 0.032, 0.20);
        const barrelGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.045, 8);
        barrelGeo.rotateX(Math.PI / 2);
        barrelGeo.translate(0, 0.064, 0.185);
        _weaponGeoCache.pistol = { gripGeo, frameGeo, slideGeo, barrelGeo };
      }
      const cg = _weaponGeoCache.pistol;
      const pistolGrp = new THREE.Group();
      const pSlide = new THREE.Mesh(cg.slideGeo, matPool.chrome);
      pSlide.position.set(0, 0.066, 0.074);
      pistolGrp.add(
        new THREE.Mesh(cg.gripGeo, matPool.darkPolymer),
        new THREE.Mesh(cg.frameGeo, matPool.imperialGold),
        pSlide,
        new THREE.Mesh(cg.barrelGeo, matPool.gunmetal)
      );
      pistolGrp.userData.slide = pSlide;
      pistolGrp.userData.slideRestZ = 0.074;
      pistolGrp.userData.muzzle = new THREE.Vector3(0, 0.065, 0.22);
      pistolGrp.userData.breech = new THREE.Vector3(-0.024, 0.075, 0.075);
      return pistolGrp;
    }

    if (id === 'smg') {
      if (!_weaponGeoCache.smg) {
        const bodyGeo = new THREE.BoxGeometry(0.042, 0.062, 0.26);
        bodyGeo.translate(0, 0.06, 0.08);
        const trimGeo = new THREE.BoxGeometry(0.045, 0.014, 0.22);
        trimGeo.translate(0, 0.085, 0.08);
        const gripGeo = new THREE.BoxGeometry(0.032, 0.10, 0.044);
        gripGeo.rotateX(0.14);
        gripGeo.translate(0, -0.005, 0.02);
        const magGeo = new THREE.BoxGeometry(0.024, 0.15, 0.032);
        magGeo.translate(0, -0.035, 0.09);
        const darkMerged = mergeGeos([gripGeo, magGeo]);
        const barrelGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.09, 10);
        barrelGeo.rotateX(Math.PI / 2);
        barrelGeo.translate(0, 0.062, 0.245);
        _weaponGeoCache.smg = { bodyGeo, trimGeo, darkMerged, barrelGeo };
      }
      const cg = _weaponGeoCache.smg;
      const smgGrp = new THREE.Group();
      smgGrp.add(
        new THREE.Mesh(cg.bodyGeo, matPool.gunmetal),
        new THREE.Mesh(cg.trimGeo, matPool.imperialGold),
        new THREE.Mesh(cg.darkMerged, matPool.darkPolymer),
        new THREE.Mesh(cg.barrelGeo, matPool.chrome)
      );
      smgGrp.userData.muzzle = new THREE.Vector3(0, 0.062, 0.30);
      smgGrp.userData.breech = new THREE.Vector3(-0.026, 0.076, 0.09);
      return smgGrp;
    }

    if (id === 'carbine') {
      if (!_weaponGeoCache.carbine) {
        const recGeo = new THREE.BoxGeometry(0.046, 0.072, 0.28);
        recGeo.translate(0, 0.065, 0.09);
        const stockGeo = new THREE.BoxGeometry(0.038, 0.085, 0.22);
        stockGeo.translate(0, 0.052, -0.14);
        const gripGeo = new THREE.BoxGeometry(0.032, 0.10, 0.044);
        gripGeo.rotateX(0.25);
        gripGeo.translate(0, -0.005, 0.0);
        const darkMerged = mergeGeos([stockGeo, gripGeo]);
        const magGeo = new THREE.BoxGeometry(0.026, 0.145, 0.052);
        magGeo.rotateX(-0.18);
        magGeo.translate(0, -0.03, 0.13);
        const scopeGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.10, 10);
        scopeGeo.rotateX(Math.PI / 2);
        scopeGeo.translate(0, 0.118, 0.09);
        const goldMerged = mergeGeos([magGeo, scopeGeo]);
        const handguardGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.24, 10);
        handguardGeo.rotateX(Math.PI / 2);
        handguardGeo.translate(0, 0.068, 0.34);
        const barrelGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.20, 8);
        barrelGeo.rotateX(Math.PI / 2);
        barrelGeo.translate(0, 0.068, 0.52);
        _weaponGeoCache.carbine = { recGeo, darkMerged, goldMerged, handguardGeo, barrelGeo };
      }
      const cg = _weaponGeoCache.carbine;
      const carbineGrp = new THREE.Group();
      carbineGrp.add(
        new THREE.Mesh(cg.recGeo, matPool.gunmetal),
        new THREE.Mesh(cg.darkMerged, matPool.darkPolymer),
        new THREE.Mesh(cg.goldMerged, matPool.imperialGold),
        new THREE.Mesh(cg.handguardGeo, matPool.crimsonRibbon),
        new THREE.Mesh(cg.barrelGeo, matPool.chrome)
      );
      carbineGrp.userData.muzzle = new THREE.Vector3(0, 0.068, 0.63);
      carbineGrp.userData.breech = new THREE.Vector3(-0.028, 0.078, 0.11);
      return carbineGrp;
    }

    if (id === 'shotgun') {
      if (!_weaponGeoCache.shotgun) {
        const recGeo = new THREE.BoxGeometry(0.046, 0.068, 0.26);
        recGeo.translate(0, 0.062, 0.08);
        const barrelGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.46, 10);
        barrelGeo.rotateX(Math.PI / 2);
        barrelGeo.translate(0, 0.076, 0.42);
        const metalMerged = mergeGeos([recGeo, barrelGeo]);
        const stockGeo = new THREE.BoxGeometry(0.038, 0.082, 0.22);
        stockGeo.rotateX(0.08);
        stockGeo.translate(0, 0.04, -0.14);
        const tubeGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.40, 10);
        tubeGeo.rotateX(Math.PI / 2);
        tubeGeo.translate(0, 0.048, 0.39);
        const pumpGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.16, 10);
        pumpGeo.rotateX(Math.PI / 2);
        pumpGeo.translate(0, 0.048, 0.34);
        _weaponGeoCache.shotgun = { metalMerged, stockGeo, tubeGeo, pumpGeo };
      }
      const cg = _weaponGeoCache.shotgun;
      const sgGrp = new THREE.Group();
      sgGrp.add(
        new THREE.Mesh(cg.metalMerged, matPool.gunmetal),
        new THREE.Mesh(cg.stockGeo, matPool.crimsonRibbon),
        new THREE.Mesh(cg.tubeGeo, matPool.imperialGold),
        new THREE.Mesh(cg.pumpGeo, matPool.darkPolymer)
      );
      sgGrp.userData.muzzle = new THREE.Vector3(0, 0.076, 0.66);
      sgGrp.userData.breech = new THREE.Vector3(-0.028, 0.072, 0.12);
      return sgGrp;
    }

    if (id === 'grenade') {
      if (!_weaponGeoCache.grenade) {
        const drumGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.14, 12);
        drumGeo.rotateX(Math.PI / 2);
        drumGeo.translate(0, 0.06, 0.14);
        const barrelGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.32, 12);
        barrelGeo.rotateX(Math.PI / 2);
        barrelGeo.translate(0, 0.082, 0.35);
        const stockGeo = new THREE.BoxGeometry(0.038, 0.075, 0.18);
        stockGeo.translate(0, 0.055, -0.06);
        const foregripGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.09, 8);
        foregripGeo.translate(0, 0.015, 0.33);
        _weaponGeoCache.grenade = { drumGeo, barrelGeo, stockGeo, foregripGeo };
      }
      const cg = _weaponGeoCache.grenade;
      const glGrp = new THREE.Group();
      glGrp.add(
        new THREE.Mesh(cg.drumGeo, matPool.imperialGold),
        new THREE.Mesh(cg.barrelGeo, matPool.gunmetal),
        new THREE.Mesh(cg.stockGeo, matPool.crimsonRibbon),
        new THREE.Mesh(cg.foregripGeo, matPool.darkPolymer)
      );
      glGrp.userData.muzzle = new THREE.Vector3(0, 0.082, 0.52);
      glGrp.userData.breech = new THREE.Vector3(-0.05, 0.06, 0.14);
      return glGrp;
    }

    return null;
  }

  function buildWeaponMeshSet() {
    const root = new THREE.Group();
    root.name = 'weaponSocket';
    root.position.set(0, -0.055, 0.025);

    const unarmedGrp = new THREE.Group();
    unarmedGrp.userData.muzzle = new THREE.Vector3(0, 0, 0.14);
    unarmedGrp.userData.breech = new THREE.Vector3(0, 0, 0.05);
    root.add(unarmedGrp);

    root.userData.models = { unarmed: unarmedGrp };
    root.userData.equipped = 'unarmed';
    return root;
  }

  function equipRigWeapon(rig, weaponId) {
    const resolved = resolveRig(rig);
    if (!resolved || !resolved.weaponSocket) return;
    const def = resolveWeaponDef(weaponId);
    const models = resolved.weaponSocket.userData.models;
    if (resolved.weaponSocket.userData.equipped === def.id && models[def.id]) return;

    if (!models[def.id] && def.id !== 'unarmed') {
      const built = buildSingleWeaponModel(def.id);
      if (built) {
        built.visible = false;
        models[def.id] = built;
        resolved.weaponSocket.add(built);
      }
    }

    for (const key in models) {
      if (models[key]) models[key].visible = key === def.id;
    }
    resolved.weaponSocket.userData.equipped = def.id;
    resolved.equippedWeapon = def.id;
  }

  // ============================================================================
  // 6. 14-JOINT ANATOMICAL WUXIA HUMANOID BUILDER & OUTFIT PRESETS
  // ============================================================================
  const SKIN_TONES = [0xe4ba99, 0xdba882, 0xc9926c, 0xb57c56, 0x996444, 0xedd0b4];
  const PED_TOPS = [0x8c2432, 0x24566e, 0x2b5c48, 0x6e4f35, 0x3b3558, 0x7a3428, 0x28435c, 0x5c2f4a];
  const PED_PANTS = [0x1c222e, 0x282624, 0x2b3340, 0x382e28, 0x181c24];
  const BEACH_TOPS = [0xd6544b, 0x2ea0b8, 0xdfb748, 0xf2eee4, 0xc74c6b, 0x3ba878];
  const BEACH_SHORTS = [0x245678, 0xb84232, 0x286652, 0x323640, 0xc8922e];
  const GANG_TOPS = [0x5e141c, 0x181a22, 0x243628, 0x3d1c3a];

  function resolveRig(target) {
    if (!target) return null;
    if (target.joints) return target;
    if (target.rig && target.rig.joints) return target.rig;
    if (target.mesh && target.mesh.joints) return target.mesh;
    if (target.userData && target.userData.rig && target.userData.rig.joints) {
      return target.userData.rig;
    }
    return null;
  }

  function setHumanoidCastShadow(target, enabled) {
    const rig = resolveRig(target);
    if (!rig || !Array.isArray(rig.shadowMeshes)) return;
    const flag = Boolean(enabled);
    for (let i = 0; i < rig.shadowMeshes.length; i++) {
      rig.shadowMeshes[i].castShadow = flag;
    }
  }

  function createHumanoid(preset = 'casual_polo') {
    ensureFabricTextures();

    const root = new THREE.Group();
    root.name = `humanoid_${preset}`;
    const shadowMeshes = [];

    const upperArmMat = makeFabricMat(0x821926, { roughness: 0.68 });
    const foreArmMat = makeSkinMat(0xdba882);
    const mats = {
      skin: makeSkinMat(0xdba882),
      hair: new THREE.MeshStandardMaterial({ color: 0x141214, roughness: 0.80 }),
      top: makeFabricMat(0x821926, { roughness: 0.68 }),
      upperArmL: upperArmMat,
      upperArmR: upperArmMat,
      foreArmL: foreArmMat,
      foreArmR: foreArmMat,
      hand: makeSkinMat(0xdba882),
      pants: makeFabricMat(0x1f2b3d, { roughness: 0.78, useDenim: true }),
      calf: makeFabricMat(0x1f2b3d, { roughness: 0.78, useDenim: true }),
      shoeUpper: new THREE.MeshStandardMaterial({ color: 0x1c1f26, roughness: 0.45 }),
      shoeSole: new THREE.MeshStandardMaterial({ color: 0xedeff2, roughness: 0.60 }),
      accent: makeFabricMat(0xd9a738, { roughness: 0.42, metalness: 0.25 }),
      sash: makeFabricMat(0xc81d32, { roughness: 0.52 })
    };
    if (!_texturesBound) {
      _trackedFabricMats.push(mats.top, mats.upperArmL, mats.pants, mats.calf, mats.accent, mats.sash);
    }

    const blobShadowMesh = new THREE.Mesh(geoCache.blobShadowGeo, matPool.blobShadow);
    blobShadowMesh.position.set(0, 0.022, 0);
    blobShadowMesh.renderOrder = 1;
    root.add(blobShadowMesh);

    // 1. Pelvis (y = 0.92m)
    const pelvis = new THREE.Group();
    pelvis.position.set(0, 0.92, 0);
    root.add(pelvis);

    const pelvisMesh = new THREE.Mesh(geoCache.pelvis, mats.pants);
    shadowMeshes.push(pelvisMesh);
    pelvis.add(pelvisMesh);

    const beltMesh = new THREE.Mesh(geoCache.belt, mats.sash);
    pelvis.add(beltMesh);

    // Wuxia Lower Robe Tunic Flaps + Jade Waist Pendant (Ngọc Bội)
    const wuxiaWaistGroup = new THREE.Group();
    const robeSkirtsMesh = new THREE.Mesh(geoCache.robeSkirtsMerged, mats.top);
    const jadeMesh = new THREE.Mesh(geoCache.jadePendant, matPool.jadeStone);
    wuxiaWaistGroup.add(robeSkirtsMesh, jadeMesh);
    pelvis.add(wuxiaWaistGroup);

    // 2. Spine / Chest
    const spine = new THREE.Group();
    spine.position.set(0, 0.04, 0);
    pelvis.add(spine);

    const torsoMesh = new THREE.Mesh(geoCache.torsoMerged, mats.top);
    shadowMeshes.push(torsoMesh);
    spine.add(torsoMesh);

    // Crossed Cổ Phong V-Collar Group (Giao Lĩnh Y)
    const poloGroup = new THREE.Group();
    const collarMesh = new THREE.Mesh(geoCache.poloCollarMerged, mats.accent);
    const lapelR = new THREE.Mesh(geoCache.wuxiaLapelStrip, matPool.whiteCloth);
    lapelR.position.set(-0.028, 0.365, 0.139);
    lapelR.rotation.z = 0.34;
    poloGroup.add(collarMesh, lapelR);
    spine.add(poloGroup);

    // Imperial Brocade Cẩm Y Group
    const suitGroup = new THREE.Group();
    const shirtMesh = new THREE.Mesh(geoCache.shirtFront, matPool.whiteCloth);
    const tieMesh = new THREE.Mesh(geoCache.necktie, mats.accent);
    suitGroup.add(shirtMesh, tieMesh);
    suitGroup.visible = false;
    spine.add(suitGroup);

    const copBadgeGroup = new THREE.Group();
    const badgeMesh = new THREE.Mesh(geoCache.badge, matPool.goldBadge);
    copBadgeGroup.add(badgeMesh);
    copBadgeGroup.visible = false;
    spine.add(copBadgeGroup);

    // Gojo Satoru High Jujutsu Uniform Collar & Violet Fold Highlights
    const gojoCollarGroup = new THREE.Group();
    const gojoCollarMesh = new THREE.Mesh(geoCache.gojoCollarMerged, mats.top);
    const gojoVioletMesh = new THREE.Mesh(geoCache.gojoVioletFold, matPool.gojoVioletAccent);
    gojoCollarGroup.add(gojoCollarMesh, gojoVioletMesh);
    gojoCollarGroup.visible = false;
    spine.add(gojoCollarGroup);

    // Tactical Armor + Skyscraper Rappel Harness
    const tacticalGroup = new THREE.Group();
    const vestMesh = new THREE.Mesh(geoCache.tacticalVest, matPool.tacticalArmor);
    shadowMeshes.push(vestMesh);
    tacticalGroup.add(vestMesh);

    const harnessGroup = new THREE.Group();
    const hStraps = new THREE.Mesh(geoCache.harnessStrapsMerged, matPool.leatherBlack);

    const chestCarabiner = new THREE.Mesh(geoCache.carabiner, matPool.chrome);
    chestCarabiner.position.set(0, 0.26, 0.172);
    const hipCarabiner = new THREE.Mesh(geoCache.carabiner, matPool.chrome);
    hipCarabiner.position.set(-0.178, 0.09, 0.02);
    hipCarabiner.rotation.y = Math.PI / 2;
    hipCarabiner.scale.setScalar(0.82);

    harnessGroup.add(hStraps, chestCarabiner, hipCarabiner);
    tacticalGroup.add(harnessGroup);
    tacticalGroup.visible = false;
    spine.add(tacticalGroup);

    // 3 & 4. Neck & Head
    const neck = new THREE.Group();
    neck.position.set(0, 0.48, 0);
    spine.add(neck);
    neck.add(new THREE.Mesh(geoCache.neck, mats.skin));

    const head = new THREE.Group();
    head.position.set(0, 0.09, 0);
    neck.add(head);

    const faceGroup = new THREE.Group();
    const headSkinMesh = new THREE.Mesh(geoCache.headSkinMerged, mats.skin);
    shadowMeshes.push(headSkinMesh);
    const eyesMesh = new THREE.Mesh(geoCache.eyesMerged, matPool.eyeDark);
    const browsMesh = new THREE.Mesh(geoCache.browsMerged, mats.hair);
    faceGroup.add(headSkinMesh, eyesMesh, browsMesh);
    head.add(faceGroup);

    // Hair + Wuxia Topknot & Gold Hairpin
    const hairGroup = new THREE.Group();
    const hairMesh = new THREE.Mesh(geoCache.hairTop, mats.hair);
    const bunMesh = new THREE.Mesh(geoCache.hairBun, mats.hair);
    const pinMesh = new THREE.Mesh(geoCache.hairPin, matPool.imperialGold);
    hairGroup.add(hairMesh, bunMesh, pinMesh);
    head.add(hairGroup);

    // Flowing Wuxia Martial Headband Ribbons
    const headbandGroup = new THREE.Group();
    const hbRing = new THREE.Mesh(geoCache.headbandRing, mats.sash);
    const ribbonPivotL = new THREE.Group();
    ribbonPivotL.position.set(0.025, 0.16, -0.102);
    ribbonPivotL.add(new THREE.Mesh(geoCache.ribbonTail, mats.sash));
    const ribbonPivotR = new THREE.Group();
    ribbonPivotR.position.set(-0.025, 0.155, -0.102);
    ribbonPivotR.add(new THREE.Mesh(geoCache.ribbonTail, mats.sash));
    headbandGroup.add(hbRing, ribbonPivotL, ribbonPivotR);
    head.add(headbandGroup);

    // Conical Martial Hat (Đấu Lạp — Lục Phiến Môn & Thích Khách)
    const conicalHatGroup = new THREE.Group();
    const hatCone = new THREE.Mesh(geoCache.conicalHatCone, matPool.bambooHat);
    shadowMeshes.push(hatCone);
    const hatFinial = new THREE.Mesh(geoCache.conicalHatFinial, matPool.imperialGold);
    conicalHatGroup.add(hatCone, hatFinial);
    conicalHatGroup.visible = false;
    head.add(conicalHatGroup);

    const shadesMesh = new THREE.Mesh(geoCache.sunglasses, matPool.reflectiveVisor);
    shadesMesh.visible = false;
    head.add(shadesMesh);

    // Full-Face Mask (Dạ Hành / Mission 3 Rappel)
    const gasMaskGroup = new THREE.Group();
    const gmShell = new THREE.Mesh(geoCache.maskShell, matPool.darkPolymer);
    shadowMeshes.push(gmShell);
    const gmVisor = new THREE.Mesh(geoCache.maskVisorLens, matPool.reflectiveVisor);
    const gmMetal = new THREE.Mesh(geoCache.gasMaskMetalMerged, matPool.gunmetal);
    const gmRing = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.014, 12), matPool.canisterAccent);
    gmRing.rotation.z = Math.PI * 0.32;
    gmRing.rotation.x = Math.PI * 0.25;
    gmRing.position.set(0.068, 0.064, 0.088);
    gasMaskGroup.add(gmShell, gmVisor, gmMetal, gmRing);
    gasMaskGroup.visible = false;
    head.add(gasMaskGroup);

    // Armored Helmet (Cẩm Y Vệ Trọng Giáp / SWAT)
    const swatHelmetGroup = new THREE.Group();
    const sHelm = new THREE.Mesh(geoCache.swatHelmet, matPool.tacticalArmor);
    const sCrest = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 6), matPool.crimsonRibbon);
    sCrest.position.set(0, 0.28, -0.02);
    const sGoggles = new THREE.Mesh(geoCache.maskVisorLens, matPool.reflectiveVisor);
    swatHelmetGroup.add(sHelm, sCrest, sGoggles);
    swatHelmetGroup.visible = false;
    head.add(swatHelmetGroup);

    // Gojo Satoru Spiky White Hair + Black Cloth Blindfold
    const gojoHeadGroup = new THREE.Group();
    const gojoHairMesh = new THREE.Mesh(geoCache.gojoHairMerged, matPool.gojoWhiteHair);
    const gojoBlindfoldMesh = new THREE.Mesh(geoCache.gojoBlindfold, matPool.gojoBlindfold);
    gojoHeadGroup.add(gojoHairMesh, gojoBlindfoldMesh);
    gojoHeadGroup.visible = false;
    head.add(gojoHeadGroup);

    // 5–10. Left & Right Arms with Martial Bracers (Hộ Uyển)
    function buildArm(isRight) {
      const sign = isRight ? -1 : 1;
      const shoulder = new THREE.Group();
      shoulder.position.set(sign * 0.215, 0.415, 0);
      spine.add(shoulder);

      const upperMat = isRight ? mats.upperArmR : mats.upperArmL;
      const foreMat = isRight ? mats.foreArmR : mats.foreArmL;

      const shortSleeveMesh = new THREE.Mesh(geoCache.shortSleeve, mats.top);
      const upperArmMesh = new THREE.Mesh(geoCache.upperArmMerged, upperMat);
      shadowMeshes.push(upperArmMesh);

      const sArmor = new THREE.Mesh(geoCache.shoulderArmor, matPool.tacticalArmor);
      sArmor.visible = false;
      shoulder.add(shortSleeveMesh, upperArmMesh, sArmor);

      const elbow = new THREE.Group();
      elbow.position.set(0, -0.275, 0);
      shoulder.add(elbow);

      const foreArmMesh = new THREE.Mesh(geoCache.foreArmMerged, foreMat);
      shadowMeshes.push(foreArmMesh);
      const bracerMesh = new THREE.Mesh(geoCache.wuxiaBracer, mats.sash);
      const fArmor = new THREE.Mesh(geoCache.forearmPad, matPool.tacticalArmor);
      fArmor.visible = false;
      elbow.add(foreArmMesh, bracerMesh, fArmor);

      const handGrp = new THREE.Group();
      handGrp.position.set(0, -0.255, 0);
      elbow.add(handGrp);

      const handMesh = new THREE.Mesh(geoCache.hand, mats.hand);
      handGrp.add(handMesh);

      return {
        shoulder,
        upperArm: upperArmMesh,
        shortSleeve: shortSleeveMesh,
        shoulderArmor: sArmor,
        elbow,
        foreArm: foreArmMesh,
        bracer: bracerMesh,
        forearmPad: fArmor,
        hand: handGrp,
        handMesh
      };
    }

    const armL = buildArm(false);
    const armR = buildArm(true);

    const weaponSocket = buildWeaponMeshSet();
    armR.hand.add(weaponSocket);

    // 11–14. Left & Right Legs
    function buildLeg(isRight) {
      const sign = isRight ? -1 : 1;
      const hip = new THREE.Group();
      hip.position.set(sign * 0.104, -0.03, 0);
      pelvis.add(hip);

      const thighMesh = new THREE.Mesh(geoCache.thighMerged, mats.pants);
      shadowMeshes.push(thighMesh);
      const shortsMesh = new THREE.Mesh(geoCache.shortsMerged, mats.pants);
      shortsMesh.visible = false;
      shadowMeshes.push(shortsMesh);
      const harnessLoop = new THREE.Mesh(geoCache.thighStrap, matPool.leatherBlack);
      harnessLoop.visible = false;
      hip.add(thighMesh, shortsMesh, harnessLoop);

      const knee = new THREE.Group();
      knee.position.set(0, -0.42, 0);
      hip.add(knee);

      const calfMesh = new THREE.Mesh(geoCache.calfMerged, mats.calf);
      shadowMeshes.push(calfMesh);
      const kPad = new THREE.Mesh(geoCache.kneePad, matPool.tacticalArmor);
      kPad.visible = false;
      knee.add(calfMesh, kPad);

      const shoe = new THREE.Group();
      shoe.position.set(0, -0.40, 0);
      knee.add(shoe);

      const shoeUp = new THREE.Mesh(geoCache.shoeUpper, mats.shoeUpper);
      shadowMeshes.push(shoeUp);
      const shoeSl = new THREE.Mesh(geoCache.shoeSole, mats.shoeSole);
      shoe.add(shoeUp, shoeSl);

      return {
        hip,
        thigh: thighMesh,
        shorts: shortsMesh,
        harnessLoop,
        knee,
        calf: calfMesh,
        kneePad: kPad,
        shoe
      };
    }

    const legL = buildLeg(false);
    const legR = buildLeg(true);

    const bloodDisc = new THREE.Mesh(geoCache.bloodPoolGeo, matPool.bloodPool);
    bloodDisc.position.set(0, 0.015, 0);
    bloodDisc.scale.setScalar(0.01);
    bloodDisc.visible = false;
    root.add(bloodDisc);

    const joints = {
      root,
      pelvis,
      spine,
      chest: spine,
      neck,
      head,
      shoulderL: armL.shoulder,
      upperArmL: armL.upperArm,
      elbowL: armL.elbow,
      foreArmL: armL.foreArm,
      handL: armL.hand,
      shoulderR: armR.shoulder,
      upperArmR: armR.upperArm,
      elbowR: armR.elbow,
      foreArmR: armR.foreArm,
      handR: armR.hand,
      weaponSocket,
      hipL: legL.hip,
      thighL: legL.thigh,
      kneeL: legL.knee,
      calfL: legL.calf,
      shoeL: legL.shoe,
      hipR: legR.hip,
      thighR: legR.thigh,
      kneeR: legR.knee,
      calfR: legR.calf,
      shoeR: legR.shoe
    };

    root.root = root;
    root.mesh = root;
    root.group = root;
    root.joints = joints;
    root.weaponSocket = weaponSocket;
    root.carabinerNode = chestCarabiner;
    root.mats = mats;
    root.shadowMeshes = shadowMeshes;
    root.parts = {
      blobShadowMesh,
      poloGroup,
      suitGroup,
      copBadgeGroup,
      gojoCollarGroup,
      gojoHeadGroup,
      tacticalGroup,
      harnessGroup,
      wuxiaWaistGroup,
      faceGroup,
      hairMesh: hairGroup,
      bunMesh,
      pinMesh,
      headbandGroup,
      ribbonPivotL,
      ribbonPivotR,
      conicalHatGroup,
      shadesMesh,
      gasMaskGroup,
      swatHelmetGroup,
      beltMesh,
      armL,
      armR,
      legL,
      legR,
      bloodDisc
    };
    root.anim = {
      time: nextRand() * 10,
      walkPhase: nextRand() * Math.PI * 2,
      lastStepSign: 0,
      state: 'idle',
      recoil: 0,
      flinch: 0,
      meleeTimer: 0,
      meleeCombo: 0,
      aimPitch: 0,
      aimYawOffset: 0,
      ragdollProgress: 0,
      ragdollFaceUp: false,
      ragdollVelX: 0,
      ragdollVelZ: 0,
      bloodScale: 0.01,
      isPlayerRig: false
    };
    root.userData.rig = root;

    setOutfit(root, preset);
    setHumanoidCastShadow(root, preset === 'player');
    return root;
  }

  // ============================================================================
  // 6B. CHI TIẾT KHUÔN MẶT CẦU THỦ HUYỀN THOẠI — MESSI #10 & RONALDO #7
  // ============================================================================
  const _footballerTexCache = {};
  function makeFootballerCanvasTex(key, drawFn, w = 256, h = 256) {
    if (_footballerTexCache[key]) return _footballerTexCache[key];
    if (typeof document === 'undefined') return null;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d');
    if (!g) return null;
    drawFn(g, w, h);
    const tex = new THREE.CanvasTexture(cv);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    _footballerTexCache[key] = tex;
    return tex;
  }

  function buildFootballerHead(kind, skinHex) {
    const isMessi = kind === 'messi';
    const grp = new THREE.Group();
    grp.name = `FootballerHead_${kind}`;

    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.55 });
    const skinShadeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(skinHex).multiplyScalar(0.78),
      roughness: 0.6
    });
    const scleraMat = new THREE.MeshStandardMaterial({ color: 0xf7f5f0, roughness: 0.25 });
    const irisMat = new THREE.MeshStandardMaterial({ color: isMessi ? 0x5a3a1e : 0x3a2414, roughness: 0.2 });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hairColor = isMessi ? 0x4a2f1c : 0x15110e;
    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: isMessi ? 0.75 : 0.32,
      metalness: isMessi ? 0.02 : 0.12
    });
    const beardMat = new THREE.MeshStandardMaterial({ color: isMessi ? 0x553522 : 0x1a1512, roughness: 0.85 });
    const lipMat = new THREE.MeshStandardMaterial({ color: isMessi ? 0xb4705e : 0xa8604c, roughness: 0.45 });
    const teethMat = new THREE.MeshStandardMaterial({ color: 0xfbfaf5, roughness: 0.2 });
    const nostrilMat = new THREE.MeshBasicMaterial({ color: 0x2a1610 });

    // --- Eyes: sclera + iris + pupil + glint + eyelids + lower lid shading ---
    for (const sx of [-1, 1]) {
      const ex = sx * 0.036;
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.0135, 14, 10), scleraMat);
      sclera.scale.set(1.25, 0.78, 0.55);
      sclera.position.set(ex, 0.128, 0.099);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0078, 12, 10), irisMat);
      iris.scale.set(1, 1, 0.45);
      iris.position.set(ex, 0.128, 0.1055);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0039, 10, 8), pupilMat);
      pupil.scale.set(1, 1, 0.4);
      pupil.position.set(ex, 0.128, 0.1085);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0015, 6, 6), glintMat);
      glint.position.set(ex + 0.0028, 0.1305, 0.1098);
      const lid = new THREE.Mesh(new THREE.CapsuleGeometry(0.0045, 0.022, 4, 8), skinShadeMat);
      lid.rotation.z = Math.PI / 2;
      lid.position.set(ex, 0.1365, 0.1005);
      const lowerLid = new THREE.Mesh(new THREE.CapsuleGeometry(0.0028, 0.02, 4, 8), skinShadeMat);
      lowerLid.rotation.z = Math.PI / 2;
      lowerLid.position.set(ex, 0.1195, 0.1005);
      const lash = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.0022, 0.004), pupilMat);
      lash.position.set(ex, 0.1338, 0.1048);

      // Eyebrows: Messi soft & straight, Ronaldo sharp & sculpted-arch
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.034, isMessi ? 0.0075 : 0.0062, 0.008), hairMat);
      brow.position.set(sx * 0.037, isMessi ? 0.1475 : 0.1495, 0.1035);
      brow.rotation.z = isMessi ? -sx * 0.08 : -sx * 0.2;
      brow.rotation.y = sx * 0.18;
      const browTail = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.005, 0.007), hairMat);
      browTail.position.set(sx * 0.056, isMessi ? 0.1445 : 0.1435, 0.098);
      browTail.rotation.z = sx * (isMessi ? 0.3 : 0.55);
      browTail.rotation.y = sx * 0.4;

      // Ears with inner fold
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), skinMat);
      ear.scale.set(0.42, 1.12, 0.72);
      ear.position.set(sx * 0.099, 0.118, 0.004);
      const earInner = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), skinShadeMat);
      earInner.scale.set(0.3, 1.0, 0.6);
      earInner.position.set(sx * 0.105, 0.118, 0.008);

      // Cheekbones (Ronaldo: very sculpted)
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), skinMat);
      cheek.scale.set(1.0, 0.7, 0.55);
      cheek.position.set(sx * 0.052, 0.108, 0.088);

      grp.add(sclera, iris, pupil, glint, lid, lowerLid, lash, brow, browTail, ear, earInner, cheek);
    }

    // --- Nose: bridge + tip + wings + nostrils ---
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.04, 0.014), skinMat);
    bridge.position.set(0, 0.118, 0.11);
    bridge.rotation.x = -0.22;
    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 12, 10), skinMat);
    noseTip.position.set(0, 0.0985, 0.1195);
    grp.add(bridge, noseTip);
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 10, 8), skinMat);
      wing.position.set(sx * 0.0115, 0.0965, 0.1135);
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.0034, 6, 6), nostrilMat);
      nostril.scale.set(1.3, 0.7, 1);
      nostril.position.set(sx * 0.0068, 0.0918, 0.1185);
      grp.add(wing, nostril);
    }

    // --- Mouth: upper lip + lower lip (+ Ronaldo's signature smile with teeth) ---
    const upperLip = new THREE.Mesh(new THREE.CapsuleGeometry(0.0048, 0.03, 4, 10), lipMat);
    upperLip.rotation.z = Math.PI / 2;
    upperLip.position.set(0, 0.0795, 0.1045);
    const lowerLip = new THREE.Mesh(new THREE.CapsuleGeometry(0.0058, 0.026, 4, 10), lipMat);
    lowerLip.rotation.z = Math.PI / 2;
    lowerLip.position.set(0, isMessi ? 0.0715 : 0.0695, 0.1025);
    grp.add(upperLip, lowerLip);
    if (!isMessi) {
      const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.0062, 0.004), teethMat);
      teeth.position.set(0, 0.0752, 0.1062);
      grp.add(teeth);
      for (const sx of [-1, 1]) {
        const dimple = new THREE.Mesh(new THREE.SphereGeometry(0.0032, 6, 6), skinShadeMat);
        dimple.position.set(sx * 0.024, 0.077, 0.1);
        grp.add(dimple);
      }
      // Strong square chin + cleft
      const chin = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), skinMat);
      chin.scale.set(1.25, 0.8, 0.85);
      chin.position.set(0, 0.052, 0.088);
      const cleft = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.012, 0.003), skinShadeMat);
      cleft.position.set(0, 0.052, 0.1065);
      grp.add(chin, cleft);
    }

    if (isMessi) {
      // --- MESSI: Full trimmed brown beard + moustache + medium side-swept hair ---
      const beardShell = new THREE.Mesh(
        new THREE.SphereGeometry(0.103, 22, 14, 0, Math.PI, Math.PI * 0.56, Math.PI * 0.3),
        beardMat
      );
      beardShell.scale.set(0.92, 1.05, 1.02);
      beardShell.position.set(0, 0.114, 0.006);
      const chinBeard = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), beardMat);
      chinBeard.scale.set(1.2, 0.95, 0.9);
      chinBeard.position.set(0, 0.052, 0.082);
      const moustache = new THREE.Mesh(new THREE.CapsuleGeometry(0.0062, 0.032, 4, 10), beardMat);
      moustache.rotation.z = Math.PI / 2;
      moustache.position.set(0, 0.0855, 0.1075);
      for (const sx of [-1, 1]) {
        const sideburn = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.03), beardMat);
        sideburn.position.set(sx * 0.089, 0.115, 0.03);
        const jawBeard = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), beardMat);
        jawBeard.scale.set(0.7, 0.9, 1.2);
        jawBeard.position.set(sx * 0.064, 0.072, 0.058);
        const mousCorner = new THREE.Mesh(new THREE.CapsuleGeometry(0.0045, 0.014, 4, 6), beardMat);
        mousCorner.position.set(sx * 0.021, 0.0765, 0.1035);
        mousCorner.rotation.z = sx * 0.25;
        grp.add(sideburn, jawBeard, mousCorner);
      }
      grp.add(beardShell, chinBeard, moustache);

      // Hair: soft medium-length cap + side-swept fringe + volume at back
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.121, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
      cap.scale.set(0.93, 1.02, 1.03);
      cap.position.set(0, 0.134, -0.006);
      const back = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12), hairMat);
      back.scale.set(0.95, 0.85, 0.7);
      back.position.set(0, 0.125, -0.045);
      grp.add(cap, back);
      for (let i = 0; i < 6; i++) {
        const lock = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.045, 4, 8), hairMat);
        lock.position.set(-0.05 + i * 0.022, 0.198 - Math.abs(i - 2.5) * 0.004, 0.072 - Math.abs(i - 2.5) * 0.006);
        lock.rotation.z = -0.95 + i * 0.05;
        lock.rotation.x = 0.55;
        grp.add(lock);
      }
      for (const sx of [-1, 1]) {
        const sideHair = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), hairMat);
        sideHair.scale.set(0.45, 1.0, 1.3);
        sideHair.position.set(sx * 0.094, 0.16, -0.01);
        grp.add(sideHair);
      }
    } else {
      // --- RONALDO: Sharp skin-fade sides + gelled textured quiff on top, light stubble ---
      const fade = new THREE.Mesh(new THREE.SphereGeometry(0.117, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), hairMat);
      fade.scale.set(0.91, 1.0, 0.99);
      fade.position.set(0, 0.13, -0.004);
      grp.add(fade);
      const quiffBase = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), hairMat);
      quiffBase.scale.set(1.0, 0.55, 1.25);
      quiffBase.position.set(0, 0.226, 0.012);
      grp.add(quiffBase);
      for (let i = 0; i < 7; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.05, 6), hairMat);
        spike.position.set(-0.045 + i * 0.015, 0.246 + Math.sin(i * 0.9) * 0.004, 0.055 - Math.abs(i - 3) * 0.004);
        spike.rotation.x = 0.85;
        spike.rotation.z = (i - 3) * -0.08;
        grp.add(spike);
      }
      // Neat hairline part line (shaved side part)
      const part = new THREE.Mesh(
        new THREE.BoxGeometry(0.002, 0.004, 0.11),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(skinHex).multiplyScalar(0.85) })
      );
      part.position.set(-0.045, 0.218, 0.0);
      grp.add(part);
      const stubbleMat = new THREE.MeshStandardMaterial({ color: 0x2a201a, roughness: 0.95, transparent: true, opacity: 0.32 });
      const stubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.103, 20, 12, 0, Math.PI, Math.PI * 0.6, Math.PI * 0.26),
        stubbleMat
      );
      stubble.scale.set(0.93, 1.05, 1.02);
      stubble.position.set(0, 0.114, 0.008);
      grp.add(stubble);
    }

    grp.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
      }
    });
    return grp;
  }

  function applyFootballerKit(rig, kind) {
    const { mats, parts } = rig;
    const isMessi = kind === 'messi';
    const skinHex = isMessi ? 0xe8bfa3 : 0xd9a784;

    // Hide generic stylised eyes / brows / topknot hair
    if (parts.faceGroup) {
      parts.faceGroup.visible = true;
      for (let i = 1; i < parts.faceGroup.children.length; i++) parts.faceGroup.children[i].visible = false;
    }
    parts.hairMesh.visible = false;
    parts.bunMesh.visible = false;
    parts.pinMesh.visible = false;
    parts.wuxiaWaistGroup.visible = false;
    parts.beltMesh.visible = false;

    const head = parts.faceGroup?.parent;
    if (head) {
      if (!parts.footballerHead || parts.footballerHead.userData.kind !== kind) {
        if (parts.footballerHead?.parent) parts.footballerHead.parent.remove(parts.footballerHead);
        parts.footballerHead = buildFootballerHead(kind, skinHex);
        parts.footballerHead.userData.kind = kind;
        head.add(parts.footballerHead);
      }
      parts.footballerHead.visible = true;
    }

    // Jersey: Argentina sky-blue/white stripes vs Portugal deep red
    const stripesTex = isMessi
      ? makeFootballerCanvasTex('arg_stripes', (g, w, h) => {
          const n = 10;
          for (let i = 0; i < n; i++) {
            g.fillStyle = i % 2 === 0 ? '#f8fafc' : '#75aadb';
            g.fillRect((i * w) / n, 0, w / n + 1, h);
          }
        })
      : null;
    mats.top.map = stripesTex;
    mats.top.color.setHex(isMessi ? 0xffffff : 0xb91c1c);
    mats.top.userData.footballMap = !!stripesTex;
    mats.top.needsUpdate = true;

    // Back name + number & front crest
    const spine = head?.parent?.parent;
    if (spine) {
      if (!parts.jerseyGroup || parts.jerseyGroup.userData.kind !== kind) {
        if (parts.jerseyGroup?.parent) parts.jerseyGroup.parent.remove(parts.jerseyGroup);
        const jg = new THREE.Group();
        jg.userData.kind = kind;
        const backTex = makeFootballerCanvasTex(`jersey_back_${kind}`, (g, w, h) => {
          g.clearRect(0, 0, w, h);
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.font = '900 44px system-ui, sans-serif';
          g.fillStyle = isMessi ? '#0b1f4a' : '#facc15';
          g.fillText(isMessi ? 'MESSI' : 'RONALDO', w / 2, 48);
          g.font = '900 150px system-ui, sans-serif';
          g.lineWidth = 8;
          g.strokeStyle = isMessi ? '#ffffff' : '#14532d';
          g.strokeText(isMessi ? '10' : '7', w / 2, 158);
          g.fillText(isMessi ? '10' : '7', w / 2, 158);
        });
        if (backTex) {
          const back = new THREE.Mesh(
            new THREE.PlaneGeometry(0.24, 0.24),
            new THREE.MeshBasicMaterial({ map: backTex, transparent: true, depthWrite: false })
          );
          back.position.set(0, 0.315, -0.172);
          back.rotation.y = Math.PI;
          jg.add(back);
        }
        const crestTex = makeFootballerCanvasTex(`jersey_crest_${kind}`, (g, w, h) => {
          g.clearRect(0, 0, w, h);
          g.fillStyle = isMessi ? '#75aadb' : '#14532d';
          g.beginPath();
          g.moveTo(w * 0.2, h * 0.15);
          g.lineTo(w * 0.8, h * 0.15);
          g.lineTo(w * 0.8, h * 0.55);
          g.lineTo(w * 0.5, h * 0.9);
          g.lineTo(w * 0.2, h * 0.55);
          g.closePath();
          g.fill();
          g.lineWidth = 10;
          g.strokeStyle = '#facc15';
          g.stroke();
          g.fillStyle = '#facc15';
          g.font = '900 64px system-ui, sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(isMessi ? '★★★' : '★', w / 2, h * 0.45);
        }, 128, 128);
        if (crestTex) {
          const crest = new THREE.Mesh(
            new THREE.PlaneGeometry(0.06, 0.06),
            new THREE.MeshBasicMaterial({ map: crestTex, transparent: true, depthWrite: false })
          );
          crest.position.set(0.07, 0.385, 0.168);
          jg.add(crest);
        }
        spine.add(jg);
        parts.jerseyGroup = jg;
      }
      parts.jerseyGroup.visible = true;
    }
    return skinHex;
  }

  function setOutfit(target, outfitName = 'casual_polo') {
    const rig = resolveRig(target);
    if (!rig) return null;
    ensureFabricTextures();

    const { mats, parts } = rig;
    const p = outfitName === 'player' ? 'casual_polo' : outfitName;
    rig.outfit = p;

    if (parts.footballerHead) parts.footballerHead.visible = false;
    if (parts.jerseyGroup) parts.jerseyGroup.visible = false;
    if (parts.faceGroup) {
      for (let i = 0; i < parts.faceGroup.children.length; i++) parts.faceGroup.children[i].visible = true;
    }
    if (mats.top.userData?.footballMap) {
      mats.top.map = null;
      mats.top.userData.footballMap = false;
      mats.top.needsUpdate = true;
    }
    parts.poloGroup.visible = false;
    parts.suitGroup.visible = false;
    parts.copBadgeGroup.visible = false;
    if (parts.gojoCollarGroup) parts.gojoCollarGroup.visible = false;
    if (parts.gojoHeadGroup) parts.gojoHeadGroup.visible = false;
    parts.tacticalGroup.visible = false;
    parts.harnessGroup.visible = false;
    parts.wuxiaWaistGroup.visible = true;
    parts.gasMaskGroup.visible = false;
    parts.conicalHatGroup.visible = false;
    parts.swatHelmetGroup.visible = false;
    parts.shadesMesh.visible = false;
    parts.headbandGroup.visible = false;
    parts.faceGroup.visible = true;
    parts.hairMesh.visible = true;
    parts.bunMesh.visible = true;
    parts.pinMesh.visible = true;
    parts.beltMesh.visible = true;

    parts.armL.shortSleeve.visible = false;
    parts.armR.shortSleeve.visible = false;
    parts.armL.bracer.visible = false;
    parts.armR.bracer.visible = false;
    parts.armL.shoulderArmor.visible = false;
    parts.armR.shoulderArmor.visible = false;
    parts.armL.forearmPad.visible = false;
    parts.armR.forearmPad.visible = false;

    parts.legL.shorts.visible = false;
    parts.legR.shorts.visible = false;
    parts.legL.thigh.visible = true;
    parts.legR.thigh.visible = true;
    parts.legL.harnessLoop.visible = false;
    parts.legR.harnessLoop.visible = false;
    parts.legL.kneePad.visible = false;
    parts.legR.kneePad.visible = false;

    const tex = ctx.engine?.textures;
    const setDenimMode = (enableDenim) => {
      mats.pants.map = enableDenim && tex?.denimTexture ? tex.denimTexture : null;
      mats.calf.map = enableDenim && tex?.denimTexture ? tex.denimTexture : null;
      mats.pants.userData.useDenim = enableDenim;
      mats.calf.userData.useDenim = enableDenim;
      mats.pants.needsUpdate = true;
      mats.calf.needsUpdate = true;
    };

    if (p === 'casual_polo') {
      // Hiệp Khách Hồng Y: Burgundy-Crimson Martial Tunic, Gold Crossed Collar, Jade Waist Pendant & Flowing Ribbons
      const skinHex = 0xdba882;
      mats.skin.color.setHex(skinHex);
      mats.hair.color.setHex(0x141214);
      mats.top.color.setHex(0x881a28);
      mats.accent.color.setHex(0xe8bd4c);
      mats.sash.color.setHex(0xc81d32);
      mats.upperArmL.color.setHex(0x881a28);
      mats.upperArmR.color.setHex(0x881a28);
      mats.foreArmL.color.setHex(skinHex);
      mats.foreArmR.color.setHex(skinHex);
      mats.hand.color.setHex(skinHex);
      mats.pants.color.setHex(0x1c2838);
      mats.calf.color.setHex(0x182230);
      mats.shoeUpper.color.setHex(0x181b22);
      mats.shoeSole.color.setHex(0xf0f2f5);
      setDenimMode(false);

      parts.poloGroup.visible = true;
      parts.headbandGroup.visible = true;
      parts.armL.shortSleeve.visible = true;
      parts.armR.shortSleeve.visible = true;
      parts.armL.bracer.visible = true;
      parts.armR.bracer.visible = true;
    } else if (p === 'tactical_heist') {
      // Dạ Hành Ám Ảnh Y (Shadow Assassin + Skyscraper Rappel Gear)
      mats.skin.color.setHex(0x16181d);
      mats.top.color.setHex(0x16181d);
      mats.sash.color.setHex(0x8c1926);
      mats.upperArmL.color.setHex(0x16181d);
      mats.upperArmR.color.setHex(0x16181d);
      mats.foreArmL.color.setHex(0x16181d);
      mats.foreArmR.color.setHex(0x16181d);
      mats.hand.color.setHex(0x111317);
      mats.pants.color.setHex(0x16181d);
      mats.calf.color.setHex(0x16181d);
      mats.shoeUpper.color.setHex(0x121418);
      mats.shoeSole.color.setHex(0x0c0e11);
      setDenimMode(false);

      parts.faceGroup.visible = false;
      parts.hairMesh.visible = false;
      parts.wuxiaWaistGroup.visible = false;
      parts.gasMaskGroup.visible = true;
      parts.headbandGroup.visible = true;
      parts.tacticalGroup.visible = true;
      parts.harnessGroup.visible = true;
      parts.armL.shoulderArmor.visible = true;
      parts.armR.shoulderArmor.visible = true;
      parts.armL.forearmPad.visible = true;
      parts.armR.forearmPad.visible = true;
      parts.legL.harnessLoop.visible = true;
      parts.legR.harnessLoop.visible = true;
      parts.legL.kneePad.visible = true;
      parts.legR.kneePad.visible = true;
    } else if (p === 'luxury_suit') {
      // Cẩm Y Công Tử Bào (Imperial Brocade Silk Robe + Gold Sash & Jade)
      const skinHex = 0xdba882;
      mats.skin.color.setHex(skinHex);
      mats.hair.color.setHex(0x141214);
      mats.top.color.setHex(0x192538);
      mats.accent.color.setHex(0xf0c35a);
      mats.sash.color.setHex(0xd4a438);
      mats.upperArmL.color.setHex(0x192538);
      mats.upperArmR.color.setHex(0x192538);
      mats.foreArmL.color.setHex(0x192538);
      mats.foreArmR.color.setHex(0x192538);
      mats.hand.color.setHex(skinHex);
      mats.pants.color.setHex(0x151e2e);
      mats.calf.color.setHex(0x151e2e);
      mats.shoeUpper.color.setHex(0x121417);
      mats.shoeUpper.roughness = 0.22;
      mats.shoeSole.color.setHex(0xf2efe6);
      setDenimMode(false);

      parts.poloGroup.visible = true;
      parts.suitGroup.visible = true;
      parts.headbandGroup.visible = true;
      parts.armL.bracer.visible = true;
      parts.armR.bracer.visible = true;
    } else if (p === 'cop') {
      // Bộ Đầu Lục Phiến Môn: Dark Navy & Crimson Martial Robe, Gold Badge & Conical Hat (Đấu Lạp)
      const skinHex = SKIN_TONES[Math.floor(nextRand() * SKIN_TONES.length)];
      mats.skin.color.setHex(skinHex);
      mats.hair.color.setHex(0x181515);
      mats.top.color.setHex(0x162033);
      mats.accent.color.setHex(0xc81d32);
      mats.sash.color.setHex(0xb81d2c);
      mats.upperArmL.color.setHex(0x162033);
      mats.upperArmR.color.setHex(0x162033);
      mats.foreArmL.color.setHex(0x162033);
      mats.foreArmR.color.setHex(0x162033);
      mats.hand.color.setHex(skinHex);
      mats.pants.color.setHex(0x121926);
      mats.calf.color.setHex(0x121926);
      mats.shoeUpper.color.setHex(0x121417);
      mats.shoeSole.color.setHex(0xd8dce2);
      setDenimMode(false);

      parts.copBadgeGroup.visible = true;
      parts.conicalHatGroup.visible = true;
      parts.poloGroup.visible = true;
      parts.armL.bracer.visible = true;
      parts.armR.bracer.visible = true;
      equipRigWeapon(rig, 'pistol');
    } else if (p === 'swat') {
      // Cẩm Y Vệ Trọng Giáp (Heavy Imperial Guard / SWAT)
      mats.skin.color.setHex(0x181c24);
      mats.top.color.setHex(0x28141c);
      mats.sash.color.setHex(0xd4a438);
      mats.upperArmL.color.setHex(0x28141c);
      mats.upperArmR.color.setHex(0x28141c);
      mats.foreArmL.color.setHex(0x28141c);
      mats.foreArmR.color.setHex(0x28141c);
      mats.hand.color.setHex(0x111317);
      mats.pants.color.setHex(0x151822);
      mats.calf.color.setHex(0x151822);
      mats.shoeUpper.color.setHex(0x111317);
      mats.shoeSole.color.setHex(0x0b0d10);
      setDenimMode(false);

      parts.hairMesh.visible = false;
      parts.swatHelmetGroup.visible = true;
      parts.tacticalGroup.visible = true;
      parts.armL.shoulderArmor.visible = true;
      parts.armR.shoulderArmor.visible = true;
      parts.legL.kneePad.visible = true;
      parts.legR.kneePad.visible = true;
      equipRigWeapon(rig, 'carbine');
    } else if (p === 'beach_ped') {
      const skinHex = SKIN_TONES[Math.floor(nextRand() * 4)];
      const topHex = BEACH_TOPS[Math.floor(nextRand() * BEACH_TOPS.length)];
      const shortHex = BEACH_SHORTS[Math.floor(nextRand() * BEACH_SHORTS.length)];
      mats.skin.color.setHex(skinHex);
      mats.hair.color.setHex(0x1d1916);
      mats.top.color.setHex(topHex);
      mats.upperArmL.color.setHex(skinHex);
      mats.upperArmR.color.setHex(skinHex);
      mats.foreArmL.color.setHex(skinHex);
      mats.foreArmR.color.setHex(skinHex);
      mats.hand.color.setHex(skinHex);
      mats.pants.color.setHex(shortHex);
      mats.calf.color.setHex(skinHex);
      mats.shoeUpper.color.setHex(0xeaeef2);
      mats.shoeSole.color.setHex(0x282c34);
      setDenimMode(false);

      parts.wuxiaWaistGroup.visible = false;
      parts.bunMesh.visible = nextRand() < 0.4;
      parts.pinMesh.visible = false;
      parts.beltMesh.visible = false;
      parts.legL.thigh.visible = false;
      parts.legR.thigh.visible = false;
      parts.legL.shorts.visible = true;
      parts.legR.shorts.visible = true;
      parts.shadesMesh.visible = nextRand() < 0.5;
    } else if (p === 'gangster') {
      // Hắc Đạo Thích Khách (Syndicate Martial Enforcer with Đấu Lạp)
      const skinHex = SKIN_TONES[Math.floor(nextRand() * SKIN_TONES.length)];
      const topHex = GANG_TOPS[Math.floor(nextRand() * GANG_TOPS.length)];
      mats.skin.color.setHex(skinHex);
      mats.hair.color.setHex(0x151414);
      mats.top.color.setHex(topHex);
      mats.accent.color.setHex(0xb88c28);
      mats.sash.color.setHex(0x8c1922);
      mats.upperArmL.color.setHex(topHex);
      mats.upperArmR.color.setHex(topHex);
      mats.foreArmL.color.setHex(skinHex);
      mats.foreArmR.color.setHex(skinHex);
      mats.hand.color.setHex(skinHex);
      mats.pants.color.setHex(0x181c24);
      mats.calf.color.setHex(0x181c24);
      mats.shoeUpper.color.setHex(0x181a1f);
      mats.shoeSole.color.setHex(0xe5e7eb);
      setDenimMode(false);

      parts.conicalHatGroup.visible = nextRand() < 0.72;
      parts.poloGroup.visible = true;
      parts.armL.bracer.visible = true;
      parts.armR.bracer.visible = true;
      equipRigWeapon(rig, nextRand() < 0.5 ? 'smg' : 'pistol');
    } else if (p === 'disciple_1') {
      // Đệ Tử Sơ Cấp ($1) — Da mã màu #402828
      const skinHex = 0x402828;
      mats.skin.color.setHex(skinHex);
      mats.hair.color.setHex(0x141214);
      mats.top.color.setHex(0x4b2128);
      mats.accent.color.setHex(0xd9a738);
      mats.sash.color.setHex(0xb81d2c);
      mats.upperArmL.color.setHex(0x4b2128);
      mats.upperArmR.color.setHex(0x4b2128);
      mats.foreArmL.color.setHex(skinHex);
      mats.foreArmR.color.setHex(skinHex);
      mats.hand.color.setHex(skinHex);
      mats.pants.color.setHex(0x1b202b);
      mats.calf.color.setHex(0x1b202b);
      mats.shoeUpper.color.setHex(0x16181f);
      mats.shoeSole.color.setHex(0xe2e4e8);
      setDenimMode(false);

      parts.poloGroup.visible = true;
      parts.armL.shortSleeve.visible = true;
      parts.armR.shortSleeve.visible = true;
      parts.armL.bracer.visible = true;
      parts.armR.bracer.visible = true;
      equipRigWeapon(rig, 'pistol');
    } else if (p === 'disciple_10') {
      // Đệ Tử Tinh Anh ($10) — Da mã màu #ede1e1
      const skinHex = 0xede1e1;
      mats.skin.color.setHex(skinHex);
      mats.hair.color.setHex(0x161418);
      mats.top.color.setHex(0x1b3454);
      mats.accent.color.setHex(0xf0c35a);
      mats.sash.color.setHex(0xc81d32);
      mats.upperArmL.color.setHex(0x1b3454);
      mats.upperArmR.color.setHex(0x1b3454);
      mats.foreArmL.color.setHex(0x1b3454);
      mats.foreArmR.color.setHex(0x1b3454);
      mats.hand.color.setHex(skinHex);
      mats.pants.color.setHex(0x142034);
      mats.calf.color.setHex(0x142034);
      mats.shoeUpper.color.setHex(0x14171f);
      mats.shoeSole.color.setHex(0xf0c35a);
      setDenimMode(false);

      parts.poloGroup.visible = true;
      parts.headbandGroup.visible = true;
      parts.armL.bracer.visible = true;
      parts.armR.bracer.visible = true;
      equipRigWeapon(rig, 'carbine');
    } else if (p === 'disciple_100' || p === 'gojo') {
      // Sư Huynh Vô Hạn ($100 — Gojo Satoru: Tóc trắng dựng, bịt mắt đen, đồng phục cổ cao đen-tím)
      const skinHex = 0xf2d6c4;
      mats.skin.color.setHex(skinHex);
      mats.hair.color.setHex(0xf4f7ff);
      mats.top.color.setHex(0x191624);
      mats.accent.color.setHex(0x4b3478);
      mats.sash.color.setHex(0x281e3d);
      mats.upperArmL.color.setHex(0x191624);
      mats.upperArmR.color.setHex(0x191624);
      mats.foreArmL.color.setHex(0x191624);
      mats.foreArmR.color.setHex(0x191624);
      mats.hand.color.setHex(skinHex);
      mats.pants.color.setHex(0x14121e);
      mats.calf.color.setHex(0x14121e);
      mats.shoeUpper.color.setHex(0x0b0c10);
      mats.shoeUpper.roughness = 0.16;
      mats.shoeSole.color.setHex(0x08090c);
      setDenimMode(false);

      parts.hairMesh.visible = false;
      parts.wuxiaWaistGroup.visible = false;
      parts.beltMesh.visible = false;
      if (parts.gojoCollarGroup) parts.gojoCollarGroup.visible = true;
      if (parts.gojoHeadGroup) parts.gojoHeadGroup.visible = true;
      equipRigWeapon(rig, 'unarmed');
    } else if (p === 'disciple_messi' || p === 'boss_messi' || p === 'messi') {
      // Lionel Messi #10 — Áo sọc xanh thiên thanh - trắng Argentina, quần đen, giày vàng kim
      const skinHex = applyFootballerKit(rig, 'messi');
      mats.skin.color.setHex(skinHex);
      mats.hair.color.setHex(0x4a2f1c);
      mats.accent.color.setHex(0xffffff);
      mats.sash.color.setHex(0xfacc15);
      mats.upperArmL.color.setHex(0xe8f1fb);
      mats.upperArmR.color.setHex(0xe8f1fb);
      mats.foreArmL.color.setHex(skinHex);
      mats.foreArmR.color.setHex(skinHex);
      mats.hand.color.setHex(skinHex);
      mats.pants.color.setHex(0x111827);
      mats.calf.color.setHex(0xf8fafc);
      mats.shoeUpper.color.setHex(0xfacc15);
      mats.shoeSole.color.setHex(0xffffff);
      setDenimMode(false);
      parts.poloGroup.visible = true;
      parts.armL.shortSleeve.visible = true;
      parts.armR.shortSleeve.visible = true;
      equipRigWeapon(rig, 'unarmed');
    } else if (p === 'disciple_ronaldo' || p === 'boss_ronaldo' || p === 'ronaldo') {
      // Cristiano Ronaldo #7 — Áo đỏ thẫm Bồ Đào Nha, quần xanh lục, giày vàng rực
      const skinHex = applyFootballerKit(rig, 'ronaldo');
      mats.skin.color.setHex(skinHex);
      mats.hair.color.setHex(0x15110e);
      mats.accent.color.setHex(0x15803d);
      mats.sash.color.setHex(0xfacc15);
      mats.upperArmL.color.setHex(0xb91c1c);
      mats.upperArmR.color.setHex(0xb91c1c);
      mats.foreArmL.color.setHex(skinHex);
      mats.foreArmR.color.setHex(skinHex);
      mats.hand.color.setHex(skinHex);
      mats.pants.color.setHex(0x15803d);
      mats.calf.color.setHex(0xb91c1c);
      mats.shoeUpper.color.setHex(0xfbbf24);
      mats.shoeSole.color.setHex(0x111827);
      setDenimMode(false);
      parts.poloGroup.visible = true;
      parts.armL.shortSleeve.visible = true;
      parts.armR.shortSleeve.visible = true;
      equipRigWeapon(rig, 'unarmed');
    } else if (p === 'casino_bodyguard') {
      // Vệ Sĩ Sòng Bạc — Vest đen sang trọng, cà vạt đỏ, kính râm
      const skinHex = 0xd9b08c;
      mats.skin.color.setHex(skinHex);
      mats.hair.color.setHex(0x111114);
      mats.top.color.setHex(0x11131a);
      mats.accent.color.setHex(0xdc2626);
      mats.sash.color.setHex(0x1f2430);
      mats.upperArmL.color.setHex(0x11131a);
      mats.upperArmR.color.setHex(0x11131a);
      mats.foreArmL.color.setHex(0x11131a);
      mats.foreArmR.color.setHex(0x11131a);
      mats.hand.color.setHex(skinHex);
      mats.pants.color.setHex(0x0d0f14);
      mats.calf.color.setHex(0x0d0f14);
      mats.shoeUpper.color.setHex(0x08090c);
      mats.shoeSole.color.setHex(0x1f2937);
      setDenimMode(false);
      if (parts.suitGroup) parts.suitGroup.visible = true;
      if (parts.glassesGroup) parts.glassesGroup.visible = true;
      equipRigWeapon(rig, 'smg');
    } else if (p === 'casino_rebel') {
      // Phiến Quân Sòng Bạc — Giáp tác chiến rằn ri đỏ-ô liu, băng trán đỏ, súng trường
      const skinHex = 0xc99672;
      mats.skin.color.setHex(skinHex);
      mats.hair.color.setHex(0x1c1917);
      mats.top.color.setHex(0x3f4f2f);
      mats.accent.color.setHex(0xdc2626);
      mats.sash.color.setHex(0x991b1b);
      mats.upperArmL.color.setHex(0x3f4f2f);
      mats.upperArmR.color.setHex(0x3f4f2f);
      mats.foreArmL.color.setHex(skinHex);
      mats.foreArmR.color.setHex(skinHex);
      mats.hand.color.setHex(skinHex);
      mats.pants.color.setHex(0x27272a);
      mats.calf.color.setHex(0x27272a);
      mats.shoeUpper.color.setHex(0x18181b);
      mats.shoeSole.color.setHex(0x52525b);
      setDenimMode(false);
      if (parts.headbandGroup) parts.headbandGroup.visible = true;
      if (parts.tacticalGroup) parts.tacticalGroup.visible = true;
      equipRigWeapon(rig, 'carbine');
    } else {
      // Bách Tính / Giang Hồ Lãng Khách ('ped')
      const skinHex = SKIN_TONES[Math.floor(nextRand() * SKIN_TONES.length)];
      const topHex = PED_TOPS[Math.floor(nextRand() * PED_TOPS.length)];
      const pantHex = PED_PANTS[Math.floor(nextRand() * PED_PANTS.length)];
      const longSleeve = nextRand() < 0.72;
      mats.skin.color.setHex(skinHex);
      mats.hair.color.setHex(0x181514);
      mats.top.color.setHex(topHex);
      mats.accent.color.setHex(0xd9c6a3);
      mats.sash.color.setHex(0x283242);
      mats.upperArmL.color.setHex(longSleeve ? topHex : skinHex);
      mats.upperArmR.color.setHex(longSleeve ? topHex : skinHex);
      mats.foreArmL.color.setHex(longSleeve ? topHex : skinHex);
      mats.foreArmR.color.setHex(longSleeve ? topHex : skinHex);
      mats.hand.color.setHex(skinHex);
      mats.pants.color.setHex(pantHex);
      mats.calf.color.setHex(pantHex);
      mats.shoeUpper.color.setHex(0x1e2228);
      mats.shoeSole.color.setHex(0xe4e6ea);
      setDenimMode(false);

      parts.poloGroup.visible = true;
      parts.conicalHatGroup.visible = nextRand() < 0.18;
      parts.armL.shortSleeve.visible = !longSleeve;
      parts.armR.shortSleeve.visible = !longSleeve;
    }

    if (outfitName === 'player' || rig.isPlayer || rig.anim?.isPlayerRig) {
      setHumanoidCastShadow(rig, true);
    }

    return rig;
  }

  // ============================================================================
  // 7. PROCEDURAL ANIMATION STATE MACHINE + FLUTTERING WUXIA RIBBONS
  // ============================================================================
  let _worldRappelGroup = null;
  let _worldRappelCable = null;
  let _worldRappelAnchor = null;

  function ensureWorldRappelCable(scene) {
    if (_worldRappelGroup) {
      if (scene && _worldRappelGroup.parent !== scene) scene.add(_worldRappelGroup);
      return _worldRappelGroup;
    }
    _worldRappelGroup = new THREE.Group();
    _worldRappelGroup.name = 'rappelCableWorld';
    _worldRappelCable = new THREE.Mesh(geoCache.cableCylGeo, matPool.cableSteel);
    _worldRappelAnchor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.20, 0.24, 10),
      matPool.gunmetal
    );
    _worldRappelGroup.add(_worldRappelCable, _worldRappelAnchor);
    _worldRappelGroup.visible = false;
    if (scene) scene.add(_worldRappelGroup);
    return _worldRappelGroup;
  }

  function animateHumanoid(target, state = 'idle', dt = 0.016, opts = {}) {
    const rig = resolveRig(target);
    if (!rig) return;

    const safeDt = clamp(dt || 0.016, 0.0005, 0.1);
    const j = rig.joints;
    const a = rig.anim;
    const s = String(state || 'idle').toLowerCase();
    a.state = s;
    a.time += safeDt;

    a.recoil = Math.max(0, a.recoil - safeDt * 2.8);
    a.flinch = Math.max(0, a.flinch - safeDt * 3.5);
    if (a.meleeTimer > 0) a.meleeTimer = Math.max(0, a.meleeTimer - safeDt);

    // Animate fluttering Wuxia headband ribbons!
    if (rig.parts?.headbandGroup?.visible) {
      const spdFactor = clamp((opts.moveSpeed || 0) / 9.5, 0, 1.3);
      const lift = -0.35 + spdFactor * 0.62 + (s === 'jump' ? 0.35 : 0);
      const waveL = Math.sin(a.time * (5.2 + spdFactor * 7.0)) * (0.08 + spdFactor * 0.18);
      const waveR = Math.cos(a.time * (5.6 + spdFactor * 7.0) + 0.9) * (0.08 + spdFactor * 0.18);
      rig.parts.ribbonPivotL.rotation.set(lift + waveL, 0.12 + waveR * 0.5, 0);
      rig.parts.ribbonPivotR.rotation.set(lift + waveR, -0.12 + waveL * 0.5, 0);
    }

    const pistolModel = rig.weaponSocket?.userData?.models?.pistol;
    if (pistolModel && pistolModel.visible && pistolModel.userData.slide) {
      pistolModel.userData.slide.position.z =
        pistolModel.userData.slideRestZ - Math.min(0.032, a.recoil * 0.09);
    }

    if (s === 'dead' || s === 'ragdoll') {
      a.ragdollProgress = Math.min(1, a.ragdollProgress + safeDt * 3.6);
      const rp = a.ragdollProgress;
      const fallDir = a.ragdollFaceUp ? 1 : -1;

      j.pelvis.position.y = damp(j.pelvis.position.y, 0.14, 10, safeDt);
      j.pelvis.position.x = damp(j.pelvis.position.x, 0, 8, safeDt);
      j.pelvis.rotation.x = dampAngle(j.pelvis.rotation.x, fallDir * (Math.PI * 0.48), 9, safeDt);
      j.pelvis.rotation.z = dampAngle(j.pelvis.rotation.z, 0.12 * fallDir, 8, safeDt);
      j.pelvis.rotation.y = dampAngle(j.pelvis.rotation.y, 0, 8, safeDt);

      j.spine.rotation.set(
        dampAngle(j.spine.rotation.x, -0.08 * fallDir, 8, safeDt),
        dampAngle(j.spine.rotation.y, 0.15, 8, safeDt),
        dampAngle(j.spine.rotation.z, 0, 8, safeDt)
      );
      j.head.rotation.set(
        dampAngle(j.head.rotation.x, 0.18, 8, safeDt),
        dampAngle(j.head.rotation.y, 0.42, 8, safeDt),
        0
      );

      j.hipL.rotation.set(dampAngle(j.hipL.rotation.x, -0.15, 8, safeDt), 0, dampAngle(j.hipL.rotation.z, 0.28, 8, safeDt));
      j.hipR.rotation.set(dampAngle(j.hipR.rotation.x, 0.10, 8, safeDt), 0, dampAngle(j.hipR.rotation.z, -0.24, 8, safeDt));
      j.kneeL.rotation.x = dampAngle(j.kneeL.rotation.x, 0.36, 8, safeDt);
      j.kneeR.rotation.x = dampAngle(j.kneeR.rotation.x, 0.18, 8, safeDt);

      j.shoulderL.rotation.set(dampAngle(j.shoulderL.rotation.x, -0.35, 8, safeDt), 0, dampAngle(j.shoulderL.rotation.z, 0.95, 8, safeDt));
      j.shoulderR.rotation.set(dampAngle(j.shoulderR.rotation.x, -0.22, 8, safeDt), 0, dampAngle(j.shoulderR.rotation.z, -0.78, 8, safeDt));
      j.elbowL.rotation.x = dampAngle(j.elbowL.rotation.x, -0.55, 8, safeDt);
      j.elbowR.rotation.x = dampAngle(j.elbowR.rotation.x, -0.38, 8, safeDt);

      if (rp > 0.35 && a.showBlood) {
        rig.parts.bloodDisc.visible = true;
        a.bloodScale = Math.min(1.0, a.bloodScale + safeDt * 0.9);
        rig.parts.bloodDisc.scale.setScalar(a.bloodScale);
      }
      if (rig.parts.blobShadowMesh) rig.parts.blobShadowMesh.visible = false;
      return;
    }

    if (rig.parts.blobShadowMesh && !rig.parts.blobShadowMesh.visible) {
      rig.parts.blobShadowMesh.visible = true;
    }
    a.ragdollProgress = 0;
    if (rig.parts.bloodDisc.visible) {
      rig.parts.bloodDisc.visible = false;
      a.bloodScale = 0.01;
    }

    if (s === 'driving' || s === 'drive' || s === 'incar') {
      const steer = clamp(opts.steer ?? 0, -1, 1);
      j.pelvis.position.set(0, damp(j.pelvis.position.y, 0.48, 16, safeDt), 0);
      j.pelvis.rotation.set(0, 0, dampAngle(j.pelvis.rotation.z, -steer * 0.05, 12, safeDt));

      j.spine.rotation.set(
        dampAngle(j.spine.rotation.x, -0.12, 14, safeDt),
        dampAngle(j.spine.rotation.y, steer * 0.08, 12, safeDt),
        0
      );
      j.head.rotation.set(
        dampAngle(j.head.rotation.x, 0.08, 12, safeDt),
        dampAngle(j.head.rotation.y, -steer * 0.22, 12, safeDt),
        0
      );

      j.hipL.rotation.set(dampAngle(j.hipL.rotation.x, -1.38, 16, safeDt), 0, 0.09);
      j.hipR.rotation.set(dampAngle(j.hipR.rotation.x, -1.38, 16, safeDt), 0, -0.09);
      j.kneeL.rotation.x = dampAngle(j.kneeL.rotation.x, 1.26, 16, safeDt);
      j.kneeR.rotation.x = dampAngle(j.kneeR.rotation.x, 1.26, 16, safeDt);

      j.shoulderL.rotation.set(
        dampAngle(j.shoulderL.rotation.x, -1.06 + steer * 0.22, 14, safeDt),
        dampAngle(j.shoulderL.rotation.y, -0.22, 14, safeDt),
        dampAngle(j.shoulderL.rotation.z, 0.06, 14, safeDt)
      );
      j.elbowL.rotation.x = dampAngle(j.elbowL.rotation.x, -0.44, 14, safeDt);

      if (opts.aimDriveBy) {
        const pitch = clamp(opts.aimPitch ?? a.aimPitch ?? 0, -0.6, 0.6);
        const yawOff = clamp(opts.aimYawOffset ?? a.aimYawOffset ?? 0, -1.4, 1.4);
        j.shoulderR.rotation.set(
          dampAngle(j.shoulderR.rotation.x, -Math.PI / 2 + pitch - a.recoil * 0.7, 20, safeDt),
          dampAngle(j.shoulderR.rotation.y, yawOff, 20, safeDt),
          0
        );
        j.elbowR.rotation.x = dampAngle(j.elbowR.rotation.x, -0.08, 20, safeDt);
      } else {
        j.shoulderR.rotation.set(
          dampAngle(j.shoulderR.rotation.x, -1.06 - steer * 0.22, 14, safeDt),
          dampAngle(j.shoulderR.rotation.y, 0.22, 14, safeDt),
          dampAngle(j.shoulderR.rotation.z, -0.06, 14, safeDt)
        );
        j.elbowR.rotation.x = dampAngle(j.elbowR.rotation.x, -0.44, 14, safeDt);
      }
      return;
    }

    if (s === 'rappel') {
      const climbVel = opts.climbVel ?? 0;
      const lateralVel = opts.lateralVel ?? 0;
      const pitch = clamp(opts.aimPitch ?? a.aimPitch ?? 0, -0.85, 0.85);
      const yawOff = clamp(opts.aimYawOffset ?? a.aimYawOffset ?? 0, -1.5, 1.5);

      if (Math.abs(climbVel) > 0.2) {
        a.walkPhase += Math.abs(climbVel) * 1.35 * safeDt;
      }
      const wallBounce = Math.abs(climbVel) > 0.2 ? Math.sin(a.walkPhase) * 0.16 : 0;

      j.pelvis.position.set(0, damp(j.pelvis.position.y, 0.88, 14, safeDt), 0);
      j.pelvis.rotation.set(
        dampAngle(j.pelvis.rotation.x, -0.22, 14, safeDt),
        0,
        dampAngle(j.pelvis.rotation.z, -lateralVel * 0.035, 10, safeDt)
      );

      j.spine.rotation.set(
        dampAngle(j.spine.rotation.x, -0.10 + a.flinch * 0.25, 14, safeDt),
        dampAngle(j.spine.rotation.y, yawOff * 0.55 + 0.14, 16, safeDt),
        0
      );
      j.head.rotation.set(
        dampAngle(j.head.rotation.x, -pitch * 0.55 + 0.16, 16, safeDt),
        dampAngle(j.head.rotation.y, yawOff * 0.45 - 0.10, 16, safeDt),
        0
      );

      j.hipL.rotation.set(dampAngle(j.hipL.rotation.x, -0.96 + wallBounce, 14, safeDt), 0, dampAngle(j.hipL.rotation.z, 0.15, 12, safeDt));
      j.hipR.rotation.set(dampAngle(j.hipR.rotation.x, -0.84 - wallBounce, 14, safeDt), 0, dampAngle(j.hipR.rotation.z, -0.15, 12, safeDt));
      j.kneeL.rotation.x = dampAngle(j.kneeL.rotation.x, 0.52 - wallBounce * 0.5, 14, safeDt);
      j.kneeR.rotation.x = dampAngle(j.kneeR.rotation.x, 0.44 + wallBounce * 0.5, 14, safeDt);

      j.shoulderL.rotation.set(
        dampAngle(j.shoulderL.rotation.x, -1.18, 16, safeDt),
        dampAngle(j.shoulderL.rotation.y, -0.46, 16, safeDt),
        dampAngle(j.shoulderL.rotation.z, 0.08, 16, safeDt)
      );
      j.elbowL.rotation.x = dampAngle(j.elbowL.rotation.x, -0.86, 16, safeDt);

      j.shoulderR.rotation.set(
        dampAngle(j.shoulderR.rotation.x, -Math.PI / 2 + pitch - a.recoil * 0.85, 22, safeDt),
        dampAngle(j.shoulderR.rotation.y, yawOff * 0.45 + 0.06, 22, safeDt),
        dampAngle(j.shoulderR.rotation.z, -0.04, 16, safeDt)
      );
      j.elbowR.rotation.x = dampAngle(j.elbowR.rotation.x, -0.06 - a.recoil * 0.25, 22, safeDt);

      if (!opts.useWorldCable && ctx.engine?.scene) {
        rig.updateMatrixWorld(true);
        rig.getWorldPosition(_v2);
        updateWorldRappelCableVisual(
          { rig, x: _v2.x, y: _v2.y, z: _v2.z },
          ctx.player?.rappelState || { active: true, maxY: 78, wallZ: _v2.z },
          ctx
        );
      }
      return;
    }

    const isAirborne = s === 'jump' || s === 'fall' || s === 'airborne';
    const isAim1H = s === 'aim_1h' || s === 'shoot' || s === 'aim';
    const isAim2H = s === 'aim_2h';
    const isMelee = s === 'melee' || s === 'punch' || s === 'bat' || a.meleeTimer > 0;
    const isFlee = s === 'flee' || s === 'panic';
    const isSurrender = s === 'busted' || s === 'surrender' || s === 'hands_up';

    const moveSpeed = opts.moveSpeed ?? (
      s === 'sprint' ? 10.0 :
      (s === 'run' || isFlee) ? 7.4 :
      s === 'walk' ? 4.5 : 0
    );

    let targetPelvisY = 0.92;
    let targetPelvisYaw = 0;
    let targetHipL = 0;
    let targetHipR = 0;
    let targetKneeL = 0.04;
    let targetKneeR = 0.04;
    let targetHipSpread = 0.03;

    if (isAirborne) {
      // Graceful Wuxia Khinh Công Crane Pose!
      targetPelvisY = 0.96;
      targetHipL = -0.85;
      targetKneeL = 1.18;
      targetHipR = 0.36;
      targetKneeR = 0.42;
      targetHipSpread = 0.08;
    } else if (moveSpeed > 0.35) {
      const strideRatio = clamp(moveSpeed / 10.2, 0.28, 1.15);
      const freq = lerp(6.4, 13.8, clamp((moveSpeed - 2.0) / 8.5, 0, 1));
      const prevSin = Math.sin(a.walkPhase);
      a.walkPhase = (a.walkPhase + freq * safeDt) % (Math.PI * 2);
      const curSin = Math.sin(a.walkPhase);
      const curCos = Math.cos(a.walkPhase);

      if (a.isPlayerRig && ((prevSin <= 0 && curSin > 0) || (prevSin >= 0 && curSin < 0))) {
        ctx.audio?.playFootstep?.(opts.surface || 'concrete');
      }

      const hipAmp = lerp(0.42, 0.92, strideRatio);
      const kneeAmp = lerp(0.52, 1.12, strideRatio);
      const bobAmp = lerp(0.018, 0.052, strideRatio);

      targetHipL = -curSin * hipAmp;
      targetHipR = curSin * hipAmp;
      targetKneeL = Math.max(0.05, curCos * kneeAmp + 0.14);
      targetKneeR = Math.max(0.05, -curCos * kneeAmp + 0.14);
      targetPelvisY = 0.92 + Math.abs(curCos) * bobAmp - strideRatio * 0.025;
      targetPelvisYaw = curSin * 0.085;
    } else {
      targetPelvisY = 0.92 + Math.sin(a.time * 2.2) * 0.008;
      targetHipSpread = isAim1H || isAim2H ? 0.07 : 0.035;
      targetKneeL = isAim1H || isAim2H ? 0.10 : 0.04;
      targetKneeR = isAim1H || isAim2H ? 0.12 : 0.04;
    }

    j.pelvis.position.set(0, damp(j.pelvis.position.y, targetPelvisY, 18, safeDt), 0);
    j.pelvis.rotation.set(
      dampAngle(j.pelvis.rotation.x, 0, 14, safeDt),
      dampAngle(j.pelvis.rotation.y, targetPelvisYaw, 16, safeDt),
      dampAngle(j.pelvis.rotation.z, 0, 14, safeDt)
    );

    j.hipL.rotation.set(dampAngle(j.hipL.rotation.x, targetHipL, 20, safeDt), 0, dampAngle(j.hipL.rotation.z, targetHipSpread, 14, safeDt));
    j.hipR.rotation.set(dampAngle(j.hipR.rotation.x, targetHipR, 20, safeDt), 0, dampAngle(j.hipR.rotation.z, -targetHipSpread, 14, safeDt));
    j.kneeL.rotation.x = dampAngle(j.kneeL.rotation.x, targetKneeL, 22, safeDt);
    j.kneeR.rotation.x = dampAngle(j.kneeR.rotation.x, targetKneeR, 22, safeDt);

    const pitch = clamp(opts.aimPitch ?? a.aimPitch ?? 0, -0.78, 0.78);

    if (isSurrender) {
      j.spine.rotation.set(0, 0, 0);
      j.head.rotation.set(0.12, Math.sin(a.time * 2.0) * 0.18, 0);
      j.shoulderL.rotation.set(-2.65, 0, 0.25);
      j.shoulderR.rotation.set(-2.65, 0, -0.25);
      j.elbowL.rotation.x = -0.55;
      j.elbowR.rotation.x = -0.55;
      return;
    }

    if (isAim1H) {
      j.spine.rotation.set(
        dampAngle(j.spine.rotation.x, 0.06 - pitch * 0.25 - a.flinch * 0.3, 18, safeDt),
        dampAngle(j.spine.rotation.y, 0.22, 18, safeDt),
        0
      );
      j.head.rotation.set(
        dampAngle(j.head.rotation.x, -pitch * 0.65, 18, safeDt),
        dampAngle(j.head.rotation.y, -0.20, 18, safeDt),
        0
      );
      j.shoulderR.rotation.set(
        dampAngle(j.shoulderR.rotation.x, -Math.PI / 2 + pitch - a.recoil * 0.95, 24, safeDt),
        dampAngle(j.shoulderR.rotation.y, -0.16, 20, safeDt),
        dampAngle(j.shoulderR.rotation.z, -0.03, 18, safeDt)
      );
      j.elbowR.rotation.x = dampAngle(j.elbowR.rotation.x, -0.06 - a.recoil * 0.30, 24, safeDt);

      j.shoulderL.rotation.set(
        dampAngle(j.shoulderL.rotation.x, -1.38 + pitch * 0.85 - a.recoil * 0.45, 20, safeDt),
        dampAngle(j.shoulderL.rotation.y, -0.64, 20, safeDt),
        dampAngle(j.shoulderL.rotation.z, 0.05, 18, safeDt)
      );
      j.elbowL.rotation.x = dampAngle(j.elbowL.rotation.x, -0.44, 20, safeDt);
      return;
    }

    if (isAim2H) {
      j.spine.rotation.set(
        dampAngle(j.spine.rotation.x, 0.11 - pitch * 0.32 - a.flinch * 0.3, 18, safeDt),
        dampAngle(j.spine.rotation.y, 0.36, 18, safeDt),
        0
      );
      j.head.rotation.set(
        dampAngle(j.head.rotation.x, -pitch * 0.60 + 0.06, 18, safeDt),
        dampAngle(j.head.rotation.y, -0.32, 18, safeDt),
        dampAngle(j.head.rotation.z, -0.08, 16, safeDt)
      );
      j.shoulderR.rotation.set(
        dampAngle(j.shoulderR.rotation.x, -1.26 + pitch - a.recoil * 0.72, 24, safeDt),
        dampAngle(j.shoulderR.rotation.y, -0.22, 20, safeDt),
        dampAngle(j.shoulderR.rotation.z, -0.10, 18, safeDt)
      );
      j.elbowR.rotation.x = dampAngle(j.elbowR.rotation.x, -0.52 - a.recoil * 0.22, 24, safeDt);

      j.shoulderL.rotation.set(
        dampAngle(j.shoulderL.rotation.x, -1.34 + pitch * 0.92 - a.recoil * 0.55, 22, safeDt),
        dampAngle(j.shoulderL.rotation.y, -0.74, 22, safeDt),
        dampAngle(j.shoulderL.rotation.z, 0.04, 18, safeDt)
      );
      j.elbowL.rotation.x = dampAngle(j.elbowL.rotation.x, -0.34, 22, safeDt);
      return;
    }

    if (isMelee) {
      const isSword = rig.equippedWeapon === 'bat' || s === 'bat';
      const dur = isSword ? 0.44 : 0.28;
      const tNorm = 1 - clamp(a.meleeTimer / dur, 0, 1);
      const swingArc = Math.sin(tNorm * Math.PI);

      if (isSword) {
        // Wuxia Swordsmanship Slash (Alternating Forehand & Backhand Kiếm Pháp!)
        const alt = a.meleeCombo % 2 === 0 ? 1 : -1;
        j.spine.rotation.set(0.18, alt * lerp(-0.62, 0.72, swingArc), 0);
        j.head.rotation.set(0, -j.spine.rotation.y * 0.55, 0);
        j.shoulderR.rotation.set(-1.38 - swingArc * 0.28, alt * lerp(0.65, -0.85, swingArc), -0.22);
        j.elbowR.rotation.x = -0.22;
        // Left sword-finger (Kiếm Chỉ) Counter-balance pose!
        j.shoulderL.rotation.set(-0.95, 0.45, 0.55);
        j.elbowL.rotation.x = -0.45;
      } else {
        // Nội Gia Chưởng Pháp (Palm Strike Combo)
        const rightStrike = a.meleeCombo % 2 === 0;
        j.spine.rotation.set(0.14, (rightStrike ? 1 : -1) * swingArc * 0.52, 0);
        j.head.rotation.set(0.05, -j.spine.rotation.y * 0.6, 0);
        if (rightStrike) {
          j.shoulderR.rotation.set(-0.65 - swingArc * 1.05, -swingArc * 0.18, -0.06);
          j.elbowR.rotation.x = lerp(-1.20, -0.06, swingArc);
          j.shoulderL.rotation.set(-0.95, -0.25, 0.18);
          j.elbowL.rotation.x = -1.35;
        } else {
          j.shoulderL.rotation.set(-0.65 - swingArc * 1.05, swingArc * 0.18, 0.06);
          j.elbowL.rotation.x = lerp(-1.20, -0.06, swingArc);
          j.shoulderR.rotation.set(-0.95, 0.25, -0.18);
          j.elbowR.rotation.x = -1.35;
        }
      }
      return;
    }

    if (isFlee) {
      const wave = Math.sin(a.time * 16) * 0.32;
      j.spine.rotation.set(dampAngle(j.spine.rotation.x, 0.18, 14, safeDt), -targetPelvisYaw, 0);
      j.head.rotation.set(-0.08, Math.sin(a.time * 8) * 0.25, 0);
      j.shoulderL.rotation.set(-2.55 + wave, 0, 0.32);
      j.shoulderR.rotation.set(-2.55 - wave, 0, -0.32);
      j.elbowL.rotation.x = -0.35;
      j.elbowR.rotation.x = -0.35;
      return;
    }

    if (isAirborne) {
      // Wuxia Outstretched Khinh Công Glide Arms!
      j.spine.rotation.set(dampAngle(j.spine.rotation.x, 0.20, 14, safeDt), 0, 0);
      j.head.rotation.set(-0.12, 0, 0);
      j.shoulderL.rotation.set(-0.42, 0.15, 0.78);
      j.shoulderR.rotation.set(-0.38, -0.15, -0.78);
      j.elbowL.rotation.x = -0.34;
      j.elbowR.rotation.x = -0.30;
      return;
    }

    if (moveSpeed > 0.35) {
      const strideRatio = clamp(moveSpeed / 10.2, 0.25, 1.15);
      const curSin = Math.sin(a.walkPhase);
      const armAmp = lerp(0.34, 0.85, strideRatio);
      const elbowBend = lerp(-0.24, -1.08, strideRatio);
      const forwardLean = lerp(0.04, 0.24, strideRatio);

      j.spine.rotation.set(
        dampAngle(j.spine.rotation.x, forwardLean - a.flinch * 0.3, 14, safeDt),
        dampAngle(j.spine.rotation.y, -curSin * 0.11, 16, safeDt),
        0
      );
      j.head.rotation.set(
        dampAngle(j.head.rotation.x, -forwardLean * 0.65, 14, safeDt),
        dampAngle(j.head.rotation.y, curSin * 0.06, 14, safeDt),
        0
      );

      j.shoulderL.rotation.set(dampAngle(j.shoulderL.rotation.x, curSin * armAmp, 18, safeDt), 0, dampAngle(j.shoulderL.rotation.z, 0.09, 14, safeDt));
      j.shoulderR.rotation.set(dampAngle(j.shoulderR.rotation.x, -curSin * armAmp, 18, safeDt), 0, dampAngle(j.shoulderR.rotation.z, -0.09, 14, safeDt));
      j.elbowL.rotation.x = dampAngle(j.elbowL.rotation.x, elbowBend - Math.max(0, -curSin) * 0.25, 18, safeDt);
      j.elbowR.rotation.x = dampAngle(j.elbowR.rotation.x, elbowBend - Math.max(0, curSin) * 0.25, 18, safeDt);
    } else {
      const breathe = Math.sin(a.time * 2.1);
      const scan = Math.sin(a.time * 0.65) * 0.10;
      j.spine.rotation.set(
        dampAngle(j.spine.rotation.x, breathe * 0.015 - a.flinch * 0.3, 10, safeDt),
        dampAngle(j.spine.rotation.y, scan * 0.35, 8, safeDt),
        0
      );
      j.head.rotation.set(
        dampAngle(j.head.rotation.x, -breathe * 0.012, 10, safeDt),
        dampAngle(j.head.rotation.y, scan, 8, safeDt),
        0
      );
      j.shoulderL.rotation.set(dampAngle(j.shoulderL.rotation.x, 0.03, 12, safeDt), 0, dampAngle(j.shoulderL.rotation.z, 0.08 + breathe * 0.01, 12, safeDt));
      j.shoulderR.rotation.set(dampAngle(j.shoulderR.rotation.x, 0.03, 12, safeDt), 0, dampAngle(j.shoulderR.rotation.z, -0.08 - breathe * 0.01, 12, safeDt));
      j.elbowL.rotation.x = dampAngle(j.elbowL.rotation.x, -0.18, 12, safeDt);
      j.elbowR.rotation.x = dampAngle(j.elbowR.rotation.x, -0.18, 12, safeDt);
    }
  }

  // ============================================================================
  // 8. OBJECT-POOLED BALLISTICS, SWORD QI, SHELLS, KHINH CÔNG RINGS & EXPLOSIONS
  // ============================================================================
  const fxGroup = new THREE.Group();
  fxGroup.name = 'charactersFX';

  function ensureFXInScene() {
    const scene = ctx.engine?.scene;
    if (scene && fxGroup.parent !== scene) {
      scene.add(fxGroup);
    }
  }

  const MUZZLE_POOL_SIZE = 12;
  const muzzlePool = [];
  for (let i = 0; i < MUZZLE_POOL_SIZE; i++) {
    const g = new THREE.Group();
    const f1 = new THREE.Mesh(geoCache.muzzleFinGeo, matPool.muzzleFlash);
    const f2 = new THREE.Mesh(geoCache.muzzleFinGeo, matPool.muzzleFlash);
    f2.rotation.z = Math.PI / 3;
    f2.scale.set(0.85, 0.85, 0.7);
    const core = new THREE.Mesh(geoCache.particleSphere, matPool.muzzleFlash);
    core.scale.setScalar(0.85);
    g.add(f1, f2, core);
    g.visible = false;
    g.matrixAutoUpdate = false;
    fxGroup.add(g);
    muzzlePool.push({ mesh: g, life: 0 });
  }

  const muzzleLights = ctx?.isMobile
    ? []
    : [
        new THREE.PointLight(0xffaa33, 0, 10, 2),
        new THREE.PointLight(0xffaa33, 0, 10, 2)
      ];
  muzzleLights.forEach((l) => fxGroup.add(l));
  let _muzzleLightIdx = 0;
  const _muzzleLightTimers = [0, 0];

  function triggerMuzzleFlash(x, y, z, dirX, dirY, dirZ, scale = 1.0) {
    ensureFXInScene();
    for (let i = 0; i < MUZZLE_POOL_SIZE; i++) {
      const m = muzzlePool[i];
      if (m.life <= 0) {
        m.life = 0.052;
        m.mesh.matrixAutoUpdate = true;
        m.mesh.visible = true;
        m.mesh.position.set(x, y, z);
        _v1.set(x + dirX, y + dirY, z + dirZ);
        m.mesh.lookAt(_v1);
        m.mesh.rotateZ(nextRand() * Math.PI * 2);
        m.mesh.scale.setScalar(scale * (0.85 + nextRand() * 0.35));
        break;
      }
    }
    if (muzzleLights.length > 0) {
      const li = _muzzleLightIdx++ % muzzleLights.length;
      muzzleLights[li].position.set(x, y, z);
      muzzleLights[li].intensity = 3.8 * scale;
      _muzzleLightTimers[li] = 0.055;
    }
  }

  const SHELL_POOL_SIZE = 48;
  const shellPool = [];
  for (let i = 0; i < SHELL_POOL_SIZE; i++) {
    const mesh = new THREE.Mesh(geoCache.shellGeo, matPool.brassShell);
    mesh.visible = false;
    mesh.matrixAutoUpdate = false;
    fxGroup.add(mesh);
    shellPool.push({
      mesh,
      active: false,
      life: 0,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      rx: 0,
      ry: 0,
      rz: 0,
      bounced: false
    });
  }
  let _shellCursor = 0;

  function ejectBrassShell(x, y, z, rightX, rightZ, isShotgun = false) {
    ensureFXInScene();
    const s = shellPool[_shellCursor];
    _shellCursor = (_shellCursor + 1) % SHELL_POOL_SIZE;

    s.active = true;
    s.life = 2.8;
    s.bounced = false;
    s.x = x;
    s.y = y;
    s.z = z;
    const latSpeed = 2.1 + nextRand() * 1.4;
    s.vx = rightX * latSpeed + (nextRand() - 0.5) * 0.7;
    s.vy = 2.4 + nextRand() * 1.3;
    s.vz = rightZ * latSpeed + (nextRand() - 0.5) * 0.7;
    s.rx = (nextRand() * 24 + 14) * (nextRand() < 0.5 ? 1 : -1);
    s.ry = (nextRand() * 20 + 10) * (nextRand() < 0.5 ? 1 : -1);
    s.rz = (nextRand() * 28 + 16) * (nextRand() < 0.5 ? 1 : -1);

    s.mesh.material = isShotgun ? matPool.shotgunShell : matPool.brassShell;
    s.mesh.scale.setScalar(isShotgun ? 1.35 : 1.0);
    s.mesh.position.set(x, y, z);
    s.mesh.matrixAutoUpdate = true;
    s.mesh.visible = true;
  }

  const PARTICLE_POOL_SIZE = 240;
  const particlePool = [];
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 1
    });
    const mesh = new THREE.Mesh(geoCache.particleSphere, mat);
    mesh.visible = false;
    mesh.matrixAutoUpdate = false;
    fxGroup.add(mesh);
    particlePool.push({
      mesh,
      mat,
      active: false,
      age: 0,
      maxLife: 0.5,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      gravity: 12,
      startScale: 1,
      endScale: 0.1,
      spin: 0
    });
  }
  let _particleCursor = 0;

  const SHOCK_POOL_SIZE = 10;
  const shockPool = [];
  for (let i = 0; i < SHOCK_POOL_SIZE; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff9d3b,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geoCache.shockRingGeo, mat);
    mesh.visible = false;
    mesh.matrixAutoUpdate = false;
    fxGroup.add(mesh);
    shockPool.push({ mesh, mat, active: false, age: 0, maxLife: 0.45, maxScale: 9 });
  }
  const blastLight = new THREE.PointLight(0xff771a, 0, 38, 1.5);
  if (!ctx?.isMobile) {
    fxGroup.add(blastLight);
  }
  let _blastLightTimer = 0;

  function triggerShockRing(x, y, z, colorHex = 0x6bf5e8, maxScale = 2.6, maxLife = 0.34) {
    ensureFXInScene();
    for (let i = 0; i < SHOCK_POOL_SIZE; i++) {
      const sw = shockPool[i];
      if (!sw.active) {
        sw.active = true;
        sw.age = 0;
        sw.maxLife = maxLife;
        sw.maxScale = maxScale;
        sw.mat.color.setHex(colorHex);
        sw.mat.opacity = 0.92;
        sw.mesh.position.set(x, y, z);
        sw.mesh.scale.setScalar(0.35);
        sw.mesh.matrixAutoUpdate = true;
        sw.mesh.visible = true;
        break;
      }
    }
  }

  const PARTICLE_PRESETS = {
    sparks: { color: 0xffc44d, altColor: 0xff771a, gravity: 18, speed: 6.5, size: 0.55, endScale: 0.05, life: 0.34, additive: true },
    sword_qi: { color: 0x6bf5e8, altColor: 0xf5ca5c, gravity: -1.5, speed: 4.8, size: 0.72, endScale: 0.08, life: 0.38, additive: true },
    palm_qi: { color: 0xf5ca5c, altColor: 0xffe89e, gravity: -2.0, speed: 5.2, size: 0.85, endScale: 0.12, life: 0.35, additive: true },
    petals: { color: 0xff9ebb, altColor: 0xffd1e0, gravity: 2.5, speed: 3.2, size: 0.52, endScale: 0.20, life: 0.75, additive: false, useGlassGeo: true },
    blood: { color: 0x9e0b12, altColor: 0x630508, gravity: 16, speed: 3.6, size: 0.72, endScale: 0.18, life: 0.42, additive: false },
    smoke: { color: 0x8b9098, altColor: 0x646870, gravity: -3.2, speed: 1.8, size: 1.8, endScale: 4.6, life: 0.95, additive: false },
    black_smoke: { color: 0x22252b, altColor: 0x353942, gravity: -4.2, speed: 2.2, size: 2.2, endScale: 5.8, life: 1.25, additive: false },
    fire: { color: 0xff7b14, altColor: 0xffcf40, gravity: -5.5, speed: 3.2, size: 1.9, endScale: 0.35, life: 0.52, additive: true },
    glass: { color: 0xcbefff, altColor: 0xffffff, gravity: 16.5, speed: 5.8, size: 0.95, endScale: 0.45, life: 0.75, additive: true, useGlassGeo: true },
    sand: { color: 0xd8be94, altColor: 0xc4a87a, gravity: 12, speed: 2.6, size: 0.85, endScale: 1.5, life: 0.45, additive: false },
    water: { color: 0xd8f4ff, altColor: 0x8ad4eb, gravity: 14, speed: 2.8, size: 0.9, endScale: 1.8, life: 0.42, additive: false },
    dust: { color: 0x9c988e, altColor: 0x7d7a72, gravity: -1.2, speed: 2.0, size: 1.2, endScale: 2.8, life: 0.65, additive: false }
  };

  function spawnParticles(a0, a1, a2, a3, a4, a5) {
    ensureFXInScene();
    let x = 0, y = 0, z = 0;
    let type = 'sparks';
    let customColor = null;
    let count = 8;
    let speedMul = 1.0;

    if (typeof a0 === 'object' && a0 !== null && !a0.isVector3) {
      x = a0.x ?? a0.position?.x ?? 0;
      y = a0.y ?? a0.position?.y ?? 0;
      z = a0.z ?? a0.position?.z ?? 0;
      type = a0.type || 'sparks';
      if (a0.color !== undefined) customColor = a0.color;
      count = a0.count ?? 8;
      speedMul = a0.speed ? a0.speed / 5.0 : 1.0;
    } else if (typeof a0 === 'string') {
      type = a0;
      if (typeof a1 === 'object' && a1 !== null) {
        x = a1.x ?? 0;
        y = a1.y ?? 0;
        z = a1.z ?? 0;
        count = typeof a2 === 'number' ? a2 : 8;
      } else {
        x = Number(a1) || 0;
        y = Number(a2) || 0;
        z = Number(a3) || 0;
        count = typeof a4 === 'number' ? a4 : 8;
      }
    } else if (typeof a0 === 'object' && a0 !== null && a0.isVector3) {
      x = a0.x;
      y = a0.y;
      z = a0.z;
      if (typeof a1 === 'string') type = a1;
      else if (typeof a1 === 'number') customColor = a1;
      count = typeof a2 === 'number' ? a2 : 8;
    } else {
      x = Number(a0) || 0;
      y = Number(a1) || 0;
      z = Number(a2) || 0;
      if (typeof a3 === 'string' && !a3.startsWith('#')) {
        type = a3;
      } else if (a3 !== undefined) {
        customColor = a3;
      }
      if (typeof a4 === 'number') count = a4;
      if (typeof a5 === 'number') speedMul = a5 / 5.0;
    }

    const preset = PARTICLE_PRESETS[type] || PARTICLE_PRESETS.sparks;
    const total = clamp(Math.round(count), 1, 36);

    for (let i = 0; i < total; i++) {
      const p = particlePool[_particleCursor];
      _particleCursor = (_particleCursor + 1) % PARTICLE_POOL_SIZE;

      p.active = true;
      p.age = 0;
      p.maxLife = preset.life * (0.75 + nextRand() * 0.5);
      p.x = x + (nextRand() - 0.5) * 0.16;
      p.y = y + (nextRand() - 0.5) * 0.16;
      p.z = z + (nextRand() - 0.5) * 0.16;

      const theta = nextRand() * Math.PI * 2;
      const elevation = (nextRand() - 0.25) * Math.PI * 0.75;
      const spd = preset.speed * speedMul * (0.45 + nextRand() * 0.85);
      p.vx = Math.cos(theta) * Math.cos(elevation) * spd;
      p.vy = Math.sin(elevation) * spd + (preset.gravity > 0 ? 1.4 : 0.6);
      p.vz = Math.sin(theta) * Math.cos(elevation) * spd;
      p.gravity = preset.gravity;
      p.startScale = preset.size * (0.7 + nextRand() * 0.6);
      p.endScale = preset.endScale;
      p.spin = preset.useGlassGeo ? (nextRand() - 0.5) * 18 : 0;

      p.mesh.geometry = preset.useGlassGeo ? geoCache.glassShardGeo : geoCache.particleSphere;
      if (customColor !== null) {
        p.mat.color.set(customColor);
      } else {
        p.mat.color.setHex(nextRand() < 0.55 ? preset.color : preset.altColor);
      }
      p.mat.blending = preset.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
      p.mat.depthWrite = !preset.additive;
      p.mat.opacity = 0.95;

      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.scale.setScalar(p.startScale);
      p.mesh.matrixAutoUpdate = true;
      p.mesh.visible = true;
    }
  }

  let _explosionDepth = 0;

  function spawnExplosion(xArg, yArg, zArg, powerArg = 1.0, ctxArg = null, visualOnly = false) {
    const activeCtx = ctxArg && (ctxArg.engine || ctxArg.world) ? ctxArg : ctx;
    ensureFXInScene();

    let x = 0, y = 0, z = 0, power = 1.0;
    if (typeof xArg === 'object' && xArg !== null) {
      x = xArg.x ?? 0;
      y = xArg.y ?? 0;
      z = xArg.z ?? 0;
      if (typeof yArg === 'number') power = yArg;
    } else {
      x = Number(xArg) || 0;
      y = Number(yArg) || 0;
      z = Number(zArg) || 0;
      if (typeof powerArg === 'number') power = powerArg;
    }
    power = clamp(power, 0.35, 3.0);

    spawnParticles(x, y + 0.35, z, 'fire', Math.round(16 * power), 7 * power);
    spawnParticles(x, y + 0.65, z, 'black_smoke', Math.round(12 * power), 4.5 * power);
    spawnParticles(x, y + 0.25, z, 'sparks', Math.round(20 * power), 11 * power);
    triggerShockRing(x, y + 0.14, z, 0xff9d3b, 8.8 * power, 0.44);

    blastLight.position.set(x, y + 1.2, z);
    blastLight.intensity = 10.0 * power;
    _blastLightTimer = 0.42;

    activeCtx.audio?.playExplosion?.(power, x, y, z);
    const pl = activeCtx.player;
    if (pl) {
      const distToPl = Math.hypot(pl.x - x, (pl.y || 0) - y, pl.z - z);
      const shakeAmt = clamp(1.35 * power * (1 - distToPl / 52), 0, 1.4);
      if (shakeAmt > 0.02) activeCtx.engine?.addShake?.(shakeAmt);
    }

    if (visualOnly || _explosionDepth >= 3) return;
    _explosionDepth++;
    try {
      const radius = 8.5 * power;
      const radiusSq = radius * radius;

      const npcTargets = collectNPCTargets(activeCtx);
      for (let i = 0; i < npcTargets.length; i++) {
        const ent = npcTargets[i];
        const ex = ent.x ?? ent.mesh?.position?.x ?? 0;
        const ey = (ent.y ?? ent.mesh?.position?.y ?? 0) + 0.9;
        const ez = ent.z ?? ent.mesh?.position?.z ?? 0;
        const dx = ex - x;
        const dy = ey - y;
        const dz = ez - z;
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq < radiusSq) {
          const dist = Math.sqrt(dSq) || 0.1;
          const falloff = 1 - dist / radius;
          const dmg = 165 * power * falloff;
          applyNPCDamage(ent, dmg, {
            isHeadshot: false,
            isExplosion: true,
            isPlayer: true,
            dirX: dx / dist,
            dirZ: dz / dist,
            impulse: 9.5 * falloff
          }, activeCtx);
        }
      }

      // Remote Multiplayer Players in Blast Radius
      const remotePlayers = activeCtx.mp?.getRemotePlayerTargets?.() || [];
      for (let i = 0; i < remotePlayers.length; i++) {
        const rp = remotePlayers[i];
        const dx = rp.x - x;
        const dy = (rp.y || 0) + 0.9 - y;
        const dz = rp.z - z;
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq < radiusSq) {
          const falloff = 1 - Math.sqrt(dSq) / radius;
          const dmg = Math.round(135 * power * falloff);
          if (dmg >= 5) {
            activeCtx.mp.sendDamagePlayer?.(rp.id, dmg, false, 'grenade');
            activeCtx.ui?.triggerHitmarker?.(dmg >= 65);
          }
        }
      }

      const cars = activeCtx.vehicles?.list;
      if (Array.isArray(cars)) {
        for (let i = 0; i < cars.length; i++) {
          const car = cars[i];
          if (!car || car.exploded || car.hp <= 0) continue;
          const dx = (car.x ?? 0) - x;
          const dy = (car.y ?? 0) - y;
          const dz = (car.z ?? 0) - z;
          const dSq = dx * dx + dy * dy + dz * dz;
          if (dSq < radiusSq * 1.25) {
            const dist = Math.max(0.5, Math.sqrt(dSq));
            const falloff = clamp(1 - dist / (radius * 1.12), 0, 1);
            if (typeof car.vx === 'number') car.vx += (dx / dist) * 14 * power * falloff;
            if (typeof car.vz === 'number') car.vz += (dz / dist) * 14 * power * falloff;
            activeCtx.vehicles?.damageVehicle?.(car, 155 * power * falloff, activeCtx);
          }
        }
      }

      if (pl && !pl.isDead && !pl.isBusted) {
        const dx = pl.x - x;
        const dy = (pl.y || 0) + 0.9 - y;
        const dz = pl.z - z;
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq < radiusSq) {
          const dist = Math.max(0.4, Math.sqrt(dSq));
          const falloff = 1 - dist / radius;
          const pDmg = Math.round(95 * power * falloff);
          if (pDmg > 2) {
            applyPlayerDamage(pDmg, null, activeCtx);
            if (!pl.inCar && !pl.rappelState?.active) {
              pl.vx = (pl.vx || 0) + (dx / dist) * 9 * falloff;
              pl.vz = (pl.vz || 0) + (dz / dist) * 9 * falloff;
              pl.vy = Math.max(pl.vy || 0, 4.5 * falloff);
              pl.isGrounded = false;
            }
          }
        }
      }

      if (!activeCtx.gameplay?.mission?.active) {
        activeCtx.gameplay?.addCrimeHeat?.(Math.round(24 * power), 'explosion');
      }
    } finally {
      _explosionDepth--;
    }
  }

  // 8.5 Pooled Projectiles (Bullets, Grenades & Crescent Sword Qi Waves!)
  const PROJ_POOL_SIZE = 96;
  const projPool = [];
  for (let i = 0; i < PROJ_POOL_SIZE; i++) {
    const mesh = new THREE.Mesh(geoCache.tracerGeo, matPool.tracerBullet);
    mesh.visible = false;
    mesh.matrixAutoUpdate = false;
    fxGroup.add(mesh);
    projPool.push({
      mesh,
      active: false,
      isExplosive: false,
      isSwordQi: false,
      isRemoteVisual: false,
      isPlayer: false,
      shooter: null,
      weaponId: 'pistol',
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      gravity: 0,
      damage: 25,
      headshotMult: 2.5,
      vehicleDamageMult: 1.0,
      blastRadius: 0,
      distTraveled: 0,
      maxRange: 50,
      shatteredFibGlass: false,
      smokeTick: 0,
      pierceCount: 0,
      hitSet: new Set()
    });
  }
  let _projCursor = 0;

  function collectNPCTargets(activeCtx) {
    const gp = activeCtx?.gameplay;
    if (!gp) return [];
    const vip = gp.mission?.vipNpc;
    const seen = new Set();
    const out = [];
    const lists = [
      gp.cops,
      gp.peds,
      gp.enemies,
      gp.missionEnemies,
      gp.agents,
      gp.mission?.enemies,
      gp.mission?.targets,
      gp.mission?.agents,
      gp.stadiumBosses
    ];
    for (let l = 0; l < lists.length; l++) {
      const arr = lists[l];
      if (!Array.isArray(arr)) continue;
      for (let i = 0; i < arr.length; i++) {
        const e = arr[i];
        if (!e || seen.has(e) || e === vip || e.role === 'vip' || e.isVIP || e.invulnerable) {
          continue;
        }
        if (!e.mesh && !e.rig && typeof e.hp !== 'number') continue;
        if (e.dead || e.isDead || e.alive === false || (typeof e.hp === 'number' && e.hp <= 0)) {
          continue;
        }
        seen.add(e);
        out.push(e);
      }
    }
    return out;
  }

  function applyNPCDamage(ent, rawBaseDmg, info, activeCtx) {
    if (!ent) return false;
    const baseDmg = Math.max(1, Number(rawBaseDmg) || 1);
    const isHeadshot = Boolean(info.isHeadshot);
    const headshotMult = info.headshotMult ?? 2.5;
    const hpBefore = typeof ent.hp === 'number' ? ent.hp : 100;
    if (typeof ent.hp !== 'number') ent.hp = 100;

    if (typeof ent.takeDamage === 'function') {
      ent.takeDamage(baseDmg, isHeadshot);
    } else if (typeof activeCtx.gameplay?.damageEntity === 'function') {
      activeCtx.gameplay.damageEntity(ent, isHeadshot ? baseDmg * headshotMult : baseDmg, info);
    } else if (typeof activeCtx.gameplay?.onEntityHit === 'function') {
      activeCtx.gameplay.onEntityHit(ent, isHeadshot ? baseDmg * headshotMult : baseDmg, info);
    }

    if (ent.hp === hpBefore && !ent.isStadiumBoss) {
      let rem = isHeadshot ? baseDmg * headshotMult : baseDmg;
      if (typeof ent.armor === 'number' && ent.armor > 0) {
        const absorbed = Math.min(ent.armor, rem);
        ent.armor -= absorbed;
        rem -= absorbed;
      }
      ent.hp = Math.max(0, ent.hp - rem);
    }

    ent.hitByPlayer = Boolean(info.isPlayer);
    ent.lastHitHeadshot = isHeadshot;
    const imp = info.impulse ?? 2.2;
    if (typeof ent.vx === 'number') ent.vx += (info.dirX || 0) * imp;
    if (typeof ent.vz === 'number') ent.vz += (info.dirZ || 0) * imp;

    const rig = resolveRig(ent);
    if (rig) {
      rig.anim.flinch = 0.42;
      rig.anim.showBlood = !info.isBlunt;
    }

    const died = ent.hp <= 0;
    if (info.isPlayer) {
      activeCtx.ui?.triggerHitmarker?.(Boolean(isHeadshot || died));
      activeCtx.ui?.showHitmarker?.(Boolean(isHeadshot || died));
      if (ent._prevHp === undefined) {
        if (died && activeCtx.player && !activeCtx.player.specialActive) {
          const maxSp = activeCtx.player.maxSpecial || 100;
          activeCtx.player.special = Math.min(maxSp, (activeCtx.player.special || 0) + 14);
        }
        if (
          info.weaponId &&
          info.weaponId !== 'unarmed' &&
          !ent.noWantedOnKill &&
          !ent.isEnemy &&
          !ent.isHostile
        ) {
          const isLaw = ent.isCop || ent.type === 'cop' || ent.type === 'swat';
          activeCtx.gameplay?.addCrimeHeat?.(died ? (isLaw ? 34 : 16) : (isLaw ? 18 : 6), 'gunshot');
        }
      }
    }

    if (died && rig) {
      rig.anim.ragdollFaceUp = isHeadshot;
      animateHumanoid(rig, 'dead', 0.016);
    }
    return died;
  }

  function applyPlayerDamage(dmg, attacker, activeCtx) {
    const pl = activeCtx?.player;
    if (!pl || pl.isDead || pl.isBusted || activeCtx.gameplay?.isPlayerInvulnerable?.()) return;
    const hpBefore = pl.hp;

    if (typeof activeCtx.gameplay?.damagePlayer === 'function') {
      activeCtx.gameplay.damagePlayer(dmg, attacker);
    }

    if (pl.hp === hpBefore) {
      let rem = dmg;
      if ((pl.armor || 0) > 0) {
        const absorbed = Math.min(pl.armor, rem);
        pl.armor -= absorbed;
        rem -= absorbed;
      }
      pl.hp = Math.max(0, (pl.hp ?? 100) - rem);
    }

    activeCtx.engine?.triggerDamageFlash?.(clamp(dmg / 40, 0.25, 0.85));
    activeCtx.engine?.addShake?.(clamp(dmg / 90, 0.08, 0.35));
    const rig = resolveRig(pl);
    if (rig) rig.anim.flinch = 0.38;
  }

  // ============================================================================
  // 9. POLYMORPHIC fireWeapon + SWORD QI WAVE + MULTIPLAYER BROADCAST
  // ============================================================================
  function playWeaponAudio(wId, activeCtx) {
    const aud = activeCtx?.audio;
    if (!aud) return;
    if (wId === 'bat' && aud.playSwordSlash) {
      aud.playSwordSlash();
      return;
    }
    if (wId === 'unarmed' || wId === 'bat') {
      if (aud.playMelee) aud.playMelee(wId === 'bat');
      else aud.playWeaponShot?.(wId);
      return;
    }
    if (aud.playWeaponShot) aud.playWeaponShot(wId);
    else if (aud.playGunshot) aud.playGunshot(wId);
  }

  function launchSwordQiProjectile(originX, originY, originZ, dirX, dirY, dirZ, shooter, isPlayer, isRemoteVisual = false) {
    ensureFXInScene();
    const pr = projPool[_projCursor];
    _projCursor = (_projCursor + 1) % PROJ_POOL_SIZE;

    pr.active = true;
    pr.isExplosive = false;
    pr.isSwordQi = true;
    pr.isRemoteVisual = isRemoteVisual;
    pr.isPlayer = isPlayer;
    pr.shooter = shooter;
    pr.weaponId = 'bat';
    pr.x = originX;
    pr.y = originY;
    pr.z = originZ;
    pr.vx = dirX * weaponDefs.bat.speed;
    pr.vy = dirY * weaponDefs.bat.speed;
    pr.vz = dirZ * weaponDefs.bat.speed;
    pr.gravity = 0;
    pr.damage = weaponDefs.bat.damage;
    pr.headshotMult = 1.65;
    pr.vehicleDamageMult = 1.35;
    pr.blastRadius = 0;
    pr.distTraveled = 0;
    pr.maxRange = weaponDefs.bat.range;
    pr.shatteredFibGlass = false;
    pr.smokeTick = 0;
    pr.pierceCount = 0;
    pr.hitSet.clear();

    pr.mesh.geometry = geoCache.swordQiGeo;
    pr.mesh.material = matPool.swordQiWave;
    pr.mesh.frustumCulled = false;
    pr.mesh.userData.perfIgnore = true;
    pr.mesh.visible = true;
    pr.mesh.scale.setScalar(1.0);
    pr.mesh.position.set(originX, originY, originZ);
    _v1.set(originX + dirX, originY + dirY, originZ + dirZ);
    pr.mesh.lookAt(_v1);
    pr.mesh.matrixAutoUpdate = true;
    pr.mesh.visible = true;
  }

  function spawnRemoteAttack(data = {}) {
    ensureFXInScene();
    const def = resolveWeaponDef(data.weaponId || 'pistol');
    const ox = Number(data.origin?.x) || 0;
    const oy = Number(data.origin?.y) || 1.3;
    const oz = Number(data.origin?.z) || 0;
    const dx = Number(data.dir?.x) || 0;
    const dy = Number(data.dir?.y) || 0;
    const dz = Number(data.dir?.z) || 1;

    if (data.isSwordQi || def.id === 'bat') {
      ctx.audio?.playSwordSlash?.();
      spawnParticles(ox, oy, oz, 'sword_qi', 6, 4.0);
      launchSwordQiProjectile(ox, oy, oz, dx, dy, dz, null, false, true);
      return;
    }
    if (def.id === 'unarmed') {
      spawnParticles(ox + dx * 0.8, oy, oz + dz * 0.8, 'palm_qi', 8, 4.2);
      return;
    }

    triggerMuzzleFlash(ox, oy, oz, dx, dy, dz, def.id === 'shotgun' || def.id === 'grenade' ? 1.35 : 0.95);
    const pr = projPool[_projCursor];
    _projCursor = (_projCursor + 1) % PROJ_POOL_SIZE;
    pr.active = true;
    pr.isExplosive = Boolean(data.isExplosive || def.isExplosive);
    pr.isSwordQi = false;
    pr.isRemoteVisual = true;
    pr.isPlayer = false;
    pr.shooter = null;
    pr.weaponId = def.id;
    pr.x = ox;
    pr.y = oy;
    pr.z = oz;
    pr.vx = dx * (def.speed || 150);
    pr.vy = dy * (def.speed || 150);
    pr.vz = dz * (def.speed || 150);
    pr.gravity = def.gravity || 0;
    pr.damage = 0;
    pr.distTraveled = 0;
    pr.maxRange = def.range || 50;
    pr.shatteredFibGlass = false;
    pr.smokeTick = 0;
    pr.hitSet.clear();

    pr.mesh.geometry = pr.isExplosive ? geoCache.grenadeRoundGeo : geoCache.tracerGeo;
    pr.mesh.material = pr.isExplosive ? matPool.gunmetal : matPool.tracerBullet;
    pr.mesh.scale.setScalar(1.0);
    pr.mesh.position.set(ox, oy, oz);
    _v1.set(ox + dx, oy + dy, oz + dz);
    pr.mesh.lookAt(_v1);
    pr.mesh.matrixAutoUpdate = true;
    pr.mesh.visible = true;
  }

  function fireWeapon(arg0, arg1, arg2, arg3) {
    const args = [arg0, arg1, arg2, arg3];
    let activeCtx = ctx;
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a && typeof a === 'object' && (a.engine || a.world || a.vehicles)) {
        activeCtx = a;
        break;
      }
    }

    let shooter = null;
    let explicitWeaponId = null;
    let explicitDir = null;
    let explicitTarget = null;
    let explicitOrigin = null;

    if (!arg0 || arg0 === activeCtx) {
      shooter = activeCtx.player;
    } else if (
      typeof arg0 === 'object' &&
      arg0.origin &&
      (arg0.dir || arg0.direction || arg0.target)
    ) {
      shooter = arg0.shooter || arg0.owner || null;
      explicitOrigin = arg0.origin;
      explicitDir = arg0.dir || arg0.direction || null;
      explicitTarget = arg0.target || null;
      explicitWeaponId = arg0.weaponId || arg0.weapon || null;
    } else {
      shooter = arg0;
      for (let i = 1; i < args.length; i++) {
        const a = args[i];
        if (!a || a === activeCtx) continue;
        if (typeof a === 'string') {
          explicitWeaponId = a;
        } else if (typeof a === 'object' && a.id && weaponDefs[a.id]) {
          explicitWeaponId = a.id;
        } else if (typeof a === 'object' && typeof a.x === 'number' && typeof a.z === 'number') {
          const magSq = a.x * a.x + (a.y || 0) * (a.y || 0) + a.z * a.z;
          if (a === activeCtx.player || 'hp' in a || 'yaw' in a || magSq > 2.25) {
            explicitTarget = a;
          } else {
            explicitDir = a;
          }
        }
      }
    }

    const isPlayer = shooter === activeCtx.player || Boolean(shooter?.isPlayer);
    if (shooter && (shooter.isDead || shooter.dead || shooter.isBusted)) return false;

    let wKey =
      explicitWeaponId ||
      shooter?.weaponId ||
      shooter?.currentWeapon ||
      shooter?.equippedWeapon ||
      shooter?.weapon ||
      (typeof shooter?.weaponIdx === 'number' ? WEAPON_ORDER[shooter.weaponIdx] : null) ||
      (isPlayer ? 'bat' : 'pistol');

    if (isPlayer && shooter?.inCar) {
      const candidate = resolveWeaponDef(wKey);
      if (!candidate.driveBy) {
        if ((shooter.ammo?.smg ?? 0) > 0 || (shooter.clip?.smg ?? 0) > 0) wKey = 'smg';
        else wKey = 'pistol';
      }
    }

    const def = resolveWeaponDef(wKey);

    if (shooter) {
      if ((shooter.fireCooldown || 0) > 0.001) return false;
    }

    if (isPlayer && !def.isMelee && shooter) {
      if (!shooter.ammo) shooter.ammo = {};
      if (!shooter.clip) shooter.clip = {};
      const curClip = shooter.clip[def.id];
      const curReserve = shooter.ammo[def.id];

      if (typeof curClip === 'number' && Number.isFinite(def.clipSize)) {
        if (curClip <= 0) {
          if ((curReserve ?? 0) <= 0) return false;
          const load = Math.min(def.clipSize, curReserve);
          shooter.clip[def.id] = load;
          shooter.ammo[def.id] = curReserve - load;
        }
        shooter.clip[def.id] = Math.max(0, shooter.clip[def.id] - 1);
      } else if (typeof curReserve === 'number' && Number.isFinite(curReserve)) {
        if (curReserve <= 0) return false;
        shooter.ammo[def.id] = curReserve - 1;
      }
    }

    if (shooter) {
      shooter.fireCooldown = def.cooldown;
      shooter._recentFireTimer = 0.45;
    }

    const rig = resolveRig(shooter);
    if (rig && (!shooter?.inCar || def.driveBy)) {
      equipRigWeapon(rig, def.id);
    }

    let muzzleX = explicitOrigin?.x ?? shooter?.x ?? 0;
    let muzzleY = explicitOrigin?.y ?? (shooter?.y ?? 0) + 1.38;
    let muzzleZ = explicitOrigin?.z ?? shooter?.z ?? 0;
    let breechX = muzzleX;
    let breechY = muzzleY;
    let breechZ = muzzleZ;
    const shooterYaw = shooter?.yaw ?? 0;
    const fwdX = Math.sin(shooterYaw);
    const fwdZ = Math.cos(shooterYaw);
    const rightX = -Math.cos(shooterYaw);
    const rightZ = Math.sin(shooterYaw);

    if (!explicitOrigin) {
      if (shooter?.inCar) {
        const car = shooter.inCar;
        const cx = car.x ?? shooter.x ?? 0;
        const cy = car.y ?? shooter.y ?? 0;
        const cz = car.z ?? shooter.z ?? 0;
        muzzleX = cx + rightX * 0.65 + fwdX * 0.35;
        muzzleY = cy + 1.18;
        muzzleZ = cz + rightZ * 0.65 + fwdZ * 0.35;
        breechX = muzzleX + rightX * 0.12;
        breechY = muzzleY + 0.04;
        breechZ = muzzleZ + rightZ * 0.12;
      } else if (rig && rig.weaponSocket && !def.isMelee) {
        rig.updateMatrixWorld(true);
        const wModel = rig.weaponSocket.userData.models?.[def.id];
        if (wModel && wModel.userData.muzzle) {
          _v1.copy(wModel.userData.muzzle);
          wModel.localToWorld(_v1);
          muzzleX = _v1.x;
          muzzleY = _v1.y;
          muzzleZ = _v1.z;

          _v2.copy(wModel.userData.breech || wModel.userData.muzzle);
          wModel.localToWorld(_v2);
          breechX = _v2.x;
          breechY = _v2.y;
          breechZ = _v2.z;
        } else {
          muzzleX += fwdX * 0.55 + rightX * 0.18;
          muzzleZ += fwdZ * 0.55 + rightZ * 0.18;
        }
      } else {
        muzzleX = (shooter?.x ?? 0) + fwdX * 0.72;
        muzzleY = (shooter?.y ?? 0) + 1.22;
        muzzleZ = (shooter?.z ?? 0) + fwdZ * 0.72;
      }
    }

    let dirX = fwdX;
    let dirY = 0;
    let dirZ = fwdZ;

    if (explicitDir) {
      dirX = explicitDir.x ?? 0;
      dirY = explicitDir.y ?? 0;
      dirZ = explicitDir.z ?? 0;
    } else if (explicitTarget) {
      const tx = explicitTarget.x ?? 0;
      const ty = (explicitTarget.y ?? 0) + (explicitTarget === activeCtx.player ? 1.18 : 0);
      const tz = explicitTarget.z ?? 0;
      dirX = tx - muzzleX;
      dirY = ty - muzzleY;
      dirZ = tz - muzzleZ;
    } else if (isPlayer && activeCtx.engine?.getAimRay) {
      const ray = activeCtx.engine.getAimRay();
      if (ray && ray.targetPoint) {
        dirX = ray.targetPoint.x - muzzleX;
        dirY = ray.targetPoint.y - muzzleY;
        dirZ = ray.targetPoint.z - muzzleZ;
        if (dirX * ray.dir.x + dirY * ray.dir.y + dirZ * ray.dir.z < 0.2) {
          dirX = ray.dir.x;
          dirY = ray.dir.y;
          dirZ = ray.dir.z;
        }
      } else if (ray && ray.dir) {
        dirX = ray.dir.x;
        dirY = ray.dir.y;
        dirZ = ray.dir.z;
      }

      const autoAimEnabled =
        activeCtx.settings?.autoAim !== false && activeCtx.ui?.autoAim !== false;
      if (autoAimEnabled && !shooter?.isAiming && (!def.isMelee || def.hasSwordQi)) {
        const dLen = Math.hypot(dirX, dirY, dirZ) || 1;
        const ndx = dirX / dLen;
        const ndy = dirY / dLen;
        const ndz = dirZ / dLen;
        const hostiles = collectNPCTargets(activeCtx);
        let bestDot = 0.91;
        let bestTarget = null;
        for (let i = 0; i < hostiles.length; i++) {
          const h = hostiles[i];
          const isHostile =
            h.isCop ||
            h.isHostile ||
            h.hostile ||
            h.isEnemy ||
            h.type === 'cop' ||
            h.type === 'swat' ||
            h.type === 'gangster' ||
            h.missionTarget;
          if (!isHostile) continue;
          const hx = (h.x ?? h.mesh?.position?.x ?? 0) - muzzleX;
          const hy = (h.y ?? h.mesh?.position?.y ?? 0) + 1.22 - muzzleY;
          const hz = (h.z ?? h.mesh?.position?.z ?? 0) - muzzleZ;
          const dist = Math.hypot(hx, hy, hz);
          if (dist < 1.0 || dist > Math.min(34, def.range)) continue;
          const dot = (hx * ndx + hy * ndy + hz * ndz) / dist;
          if (dot > bestDot) {
            bestDot = dot;
            bestTarget = { hx, hy, hz };
          }
        }
        if (bestTarget) {
          dirX = bestTarget.hx;
          dirY = bestTarget.hy;
          dirZ = bestTarget.hz;
        }
      }
    }

    const invLen = 1 / (Math.hypot(dirX, dirY, dirZ) || 1);
    dirX *= invLen;
    dirY *= invLen;
    dirZ *= invLen;

    // Broadcast player attack to Multiplayer Room!
    if (isPlayer && activeCtx.mp?.connected) {
      activeCtx.mp.onLocalAttack?.({
        weaponId: def.id,
        origin: { x: muzzleX, y: muzzleY, z: muzzleZ },
        dir: { x: dirX, y: dirY, z: dirZ },
        isSwordQi: Boolean(def.hasSwordQi),
        isExplosive: Boolean(def.isExplosive)
      });
    }

    // --------------------------------------------------------------------------
    // Wuxia Martial Arts & Thanh Phong Kiếm (Close Cleave + Crescent Kiếm Khí!)
    // --------------------------------------------------------------------------
    if (def.isMelee) {
      if (rig) {
        rig.anim.meleeTimer = def.cooldown;
        rig.anim.meleeCombo = (rig.anim.meleeCombo + 1) % 2;
      }
      playWeaponAudio(def.id, activeCtx);

      // Rotate player toward camera aim ray when unleashing Sword Qi!
      if (isPlayer && def.hasSwordQi && shooter) {
        shooter.yaw = Math.atan2(dirX, dirZ);
      }

      const sx = shooter?.x ?? muzzleX;
      const sy = shooter?.y ?? 0;
      const sz = shooter?.z ?? muzzleZ;
      const closeRange = def.meleeRange || def.range;

      if (def.id === 'unarmed') {
        spawnParticles(sx + fwdX * 1.1, sy + 1.25, sz + fwdZ * 1.1, 'palm_qi', 10, 4.5);
      } else if (def.hasSwordQi) {
        const qx = sx + dirX * 0.95;
        const qy = sy + 1.22;
        const qz = sz + dirZ * 0.95;
        spawnParticles(qx, qy, qz, 'sword_qi', 8, 4.8);
        launchSwordQiProjectile(qx, qy, qz, dirX, clamp(dirY, -0.35, 0.35), dirZ, shooter, isPlayer, false);
        if (isPlayer) activeCtx.engine?.addShake?.(0.045);
      }

      const targets = isPlayer ? collectNPCTargets(activeCtx) : activeCtx.player ? [activeCtx.player] : [];
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        const tx = t.x ?? t.mesh?.position?.x ?? 0;
        const ty = t.y ?? t.mesh?.position?.y ?? 0;
        const tz = t.z ?? t.mesh?.position?.z ?? 0;
        if (Math.abs(ty - sy) > 1.9) continue;
        const dx = tx - sx;
        const dz = tz - sz;
        const dist = Math.hypot(dx, dz);
        if (dist <= closeRange) {
          const dot = dist < 0.35 ? 1 : (dx * dirX + dz * dirZ) / dist;
          if (dot >= 0.15) {
            spawnParticles(tx, ty + 1.15, tz, def.id === 'bat' ? 'sword_qi' : 'palm_qi', 9, 4.2);
            if (t === activeCtx.player) {
              applyPlayerDamage(def.damage, shooter, activeCtx);
            } else {
              applyNPCDamage(t, def.damage, {
                isHeadshot: false,
                isBlunt: def.id === 'unarmed',
                isPlayer,
                weaponId: def.id,
                dirX,
                dirZ,
                impulse: def.id === 'bat' ? 7.0 : 4.2
              }, activeCtx);
            }
            if (!def.hasSwordQi) break;
          }
        }
      }

      // Close-range PvP hit check against Remote Players (for Unarmed Palm Qi)
      if (isPlayer && def.id === 'unarmed' && activeCtx.mp?.connected) {
        const rps = activeCtx.mp.getRemotePlayerTargets?.() || [];
        for (let i = 0; i < rps.length; i++) {
          const rp = rps[i];
          const dx = rp.x - sx;
          const dz = rp.z - sz;
          const dist = Math.hypot(dx, dz);
          if (dist <= closeRange && Math.abs((rp.y || 0) - sy) < 1.9) {
            activeCtx.mp.sendDamagePlayer?.(rp.id, def.damage, false, def.id);
            activeCtx.ui?.triggerHitmarker?.(false);
            spawnParticles(rp.x, (rp.y || 0) + 1.15, rp.z, 'palm_qi', 10, 4.5);
            break;
          }
        }
      }

      return true;
    }

    // --------------------------------------------------------------------------
    // Firearm & Grenade Execution
    // --------------------------------------------------------------------------
    if (rig) {
      rig.anim.recoil = Math.min(0.65, rig.anim.recoil + def.recoil);
      rig.anim.aimPitch = clamp(Math.asin(clamp(dirY, -0.85, 0.85)), -0.78, 0.78);
    }

    playWeaponAudio(def.id, activeCtx);
    triggerMuzzleFlash(
      muzzleX,
      muzzleY,
      muzzleZ,
      dirX,
      dirY,
      dirZ,
      def.id === 'shotgun' || def.id === 'grenade' ? 1.45 : 1.0
    );

    if (def.ejectShell) {
      ejectBrassShell(breechX, breechY, breechZ, rightX, rightZ, def.id === 'shotgun');
    }

    if (isPlayer) {
      activeCtx.engine?.addShake?.(def.id === 'shotgun' || def.id === 'grenade' ? 0.14 : 0.035);
    }

    const spreadScale = isPlayer
      ? (shooter?.isAiming ? (def.scopeZoom ? 0.22 : 0.42) : 1.0) *
        (shooter?.specialActive ? 0.45 : 1.0)
      : 1.85;

    const pellets = def.pellets || 1;
    for (let pIdx = 0; pIdx < pellets; pIdx++) {
      const pr = projPool[_projCursor];
      _projCursor = (_projCursor + 1) % PROJ_POOL_SIZE;

      const sp = def.spread * spreadScale;
      let px = dirX + (nextRand() - 0.5) * 2 * sp;
      let py = dirY + (nextRand() - 0.5) * 2 * sp + (def.isExplosive ? 0.08 : 0);
      let pz = dirZ + (nextRand() - 0.5) * 2 * sp;
      const pInv = 1 / (Math.hypot(px, py, pz) || 1);
      px *= pInv;
      py *= pInv;
      pz *= pInv;

      pr.active = true;
      pr.isExplosive = Boolean(def.isExplosive);
      pr.isSwordQi = false;
      pr.isRemoteVisual = false;
      pr.isPlayer = isPlayer;
      pr.shooter = shooter;
      pr.weaponId = def.id;
      pr.x = muzzleX;
      pr.y = muzzleY;
      pr.z = muzzleZ;
      pr.vx = px * def.speed;
      pr.vy = py * def.speed;
      pr.vz = pz * def.speed;
      pr.gravity = def.gravity || 0;
      pr.damage = isPlayer ? def.damage : Math.max(5, Math.round(def.damage * 0.42));
      pr.headshotMult = def.headshotMult || 2.5;
      pr.vehicleDamageMult = def.vehicleDamageMult || 1.0;
      pr.blastRadius = def.blastRadius || 0;
      pr.distTraveled = 0;
      pr.maxRange = def.range;
      pr.shatteredFibGlass = false;
      pr.smokeTick = 0;
      pr.pierceCount = 0;
      pr.hitSet.clear();

      pr.mesh.geometry = pr.isExplosive ? geoCache.grenadeRoundGeo : geoCache.tracerGeo;
      pr.mesh.material = pr.isExplosive ? matPool.gunmetal : matPool.tracerBullet;
      pr.mesh.scale.setScalar(1.0);
      pr.mesh.position.set(muzzleX, muzzleY, muzzleZ);
      _v1.set(muzzleX + px, muzzleY + py, muzzleZ + pz);
      pr.mesh.lookAt(_v1);
      pr.mesh.matrixAutoUpdate = true;
      pr.mesh.visible = true;
    }

    return true;
  }

  // ============================================================================
  // 10. SUB-STEPPED PROJECTILE BALLISTICS & FX UPDATE
  // ============================================================================
  function isInsideFibGlassAtrium(x, y, z) {
    return x >= 134 && x <= 186 && z >= -66 && z <= -14.5 && y >= 38 && y <= 62;
  }

  function updateProjectilesAndFX(dt = 0.016, ctxArg = null) {
    const activeCtx = ctxArg && (ctxArg.engine || ctxArg.world) ? ctxArg : ctx;
    const safeDt = clamp(dt || 0.016, 0.0005, 0.1);
    ensureFXInScene();

    for (let i = 0; i < MUZZLE_POOL_SIZE; i++) {
      const m = muzzlePool[i];
      if (m.life > 0) {
        m.life -= safeDt;
        if (m.life <= 0) {
          m.mesh.visible = false;
          m.mesh.matrixAutoUpdate = false;
        }
      }
    }
    for (let i = 0; i < muzzleLights.length; i++) {
      if (_muzzleLightTimers[i] > 0) {
        _muzzleLightTimers[i] -= safeDt;
        if (_muzzleLightTimers[i] <= 0) muzzleLights[i].intensity = 0;
      }
    }
    if (_blastLightTimer > 0) {
      _blastLightTimer -= safeDt;
      blastLight.intensity = Math.max(0, blastLight.intensity * Math.exp(-9 * safeDt));
      if (_blastLightTimer <= 0) blastLight.intensity = 0;
    }

    for (let i = 0; i < SHOCK_POOL_SIZE; i++) {
      const sw = shockPool[i];
      if (!sw.active) continue;
      sw.age += safeDt;
      const t = sw.age / sw.maxLife;
      if (t >= 1) {
        sw.active = false;
        sw.mesh.visible = false;
        sw.mesh.matrixAutoUpdate = false;
      } else {
        sw.mesh.scale.setScalar(lerp(0.5, sw.maxScale, 1 - Math.pow(1 - t, 2.2)));
        sw.mat.opacity = (1 - t) * 0.85;
      }
    }

    const pl = activeCtx.player;
    for (let i = 0; i < SHELL_POOL_SIZE; i++) {
      const s = shellPool[i];
      if (!s.active) continue;
      s.life -= safeDt;
      if (s.life <= 0) {
        s.active = false;
        s.mesh.visible = false;
        s.mesh.matrixAutoUpdate = false;
        continue;
      }

      const gY = activeCtx.world?.getGroundHeight ? activeCtx.world.getGroundHeight(s.x, s.z) : 0.02;
      s.vy -= 18.5 * safeDt;
      s.x += s.vx * safeDt;
      s.y += s.vy * safeDt;
      s.z += s.vz * safeDt;

      if (s.y <= gY + 0.014) {
        s.y = gY + 0.014;
        if (!s.bounced) {
          s.bounced = true;
          if (pl && Math.hypot(pl.x - s.x, pl.z - s.z) < 18) {
            activeCtx.audio?.playShellClink?.();
          }
        }
        if (Math.abs(s.vy) > 0.65) {
          s.vy = -s.vy * 0.42;
          s.vx *= 0.62;
          s.vz *= 0.62;
          s.rx *= 0.5;
          s.rz *= 0.5;
        } else {
          s.vy = 0;
          s.vx *= 0.82;
          s.vz *= 0.82;
          s.rx = 0;
          s.ry *= 0.85;
          s.rz = 0;
          s.mesh.rotation.x = 0;
        }
      } else {
        s.mesh.rotation.x += s.rx * safeDt;
        s.mesh.rotation.y += s.ry * safeDt;
        s.mesh.rotation.z += s.rz * safeDt;
      }
      s.mesh.position.set(s.x, s.y, s.z);
    }

    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = particlePool[i];
      if (!p.active) continue;
      p.age += safeDt;
      const t = p.age / p.maxLife;
      if (t >= 1) {
        p.active = false;
        p.mesh.visible = false;
        p.mesh.matrixAutoUpdate = false;
        continue;
      }
      p.vy -= p.gravity * safeDt;
      p.x += p.vx * safeDt;
      p.y += p.vy * safeDt;
      p.z += p.vz * safeDt;
      if (p.spin !== 0) {
        p.mesh.rotation.x += p.spin * safeDt;
        p.mesh.rotation.y += p.spin * 0.7 * safeDt;
      }
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.scale.setScalar(lerp(p.startScale, p.endScale, t));
      p.mat.opacity = (1 - t) * 0.92;
    }

    let cachedNPCs = null;
    const remotePlayers = activeCtx.mp?.getRemotePlayerTargets?.() || null;
    const cars = activeCtx.vehicles?.list;
    const helis = activeCtx.gameplay?.helicopters;

    for (let i = 0; i < PROJ_POOL_SIZE; i++) {
      const pr = projPool[i];
      if (!pr.active) continue;

      if (pr.gravity !== 0) {
        pr.vy -= pr.gravity * safeDt;
      }
      if (pr.isExplosive) {
        pr.smokeTick += safeDt;
        if (pr.smokeTick >= 0.045) {
          pr.smokeTick = 0;
          spawnParticles(pr.x, pr.y, pr.z, 'smoke', 1, 0.5);
        }
      } else if (pr.isSwordQi) {
        pr.smokeTick += safeDt;
        if (pr.smokeTick >= 0.035) {
          pr.smokeTick = 0;
          spawnParticles(pr.x, pr.y, pr.z, nextRand() < 0.7 ? 'sword_qi' : 'petals', 1, 1.4);
        }
      }

      const dxTotal = pr.vx * safeDt;
      const dyTotal = pr.vy * safeDt;
      const dzTotal = pr.vz * safeDt;
      const stepLen = Math.hypot(dxTotal, dyTotal, dzTotal);
      const subSteps = clamp(Math.ceil(stepLen / 0.85), 1, 10);
      const sdx = dxTotal / subSteps;
      const sdy = dyTotal / subSteps;
      const sdz = dzTotal / subSteps;
      const subDist = stepLen / subSteps;

      const spdInv = 1 / (Math.hypot(pr.vx, pr.vy, pr.vz) || 1);
      const ndx = pr.vx * spdInv;
      const ndz = pr.vz * spdInv;
      const hitRadSq = pr.isSwordQi ? 1.35 : 0.16;

      let hitSomething = false;

      for (let st = 0; st < subSteps; st++) {
        const prevX = pr.x;
        const prevY = pr.y;
        const prevZ = pr.z;
        pr.x += sdx;
        pr.y += sdy;
        pr.z += sdz;
        pr.distTraveled += subDist;

        if (
          !pr.shatteredFibGlass &&
          pr.y > 5.0 &&
          pr.x >= 136 &&
          pr.x <= 184 &&
          ((prevZ > -16.0 && pr.z <= -16.0) || (prevZ < -16.0 && pr.z >= -16.0))
        ) {
          pr.shatteredFibGlass = true;
          spawnParticles(pr.x, pr.y, -16.0, 'glass', 14, 6.5);
          if (activeCtx.audio?.playGlassShatter) activeCtx.audio.playGlassShatter();
          else activeCtx.audio?.playGlass?.();
        }

        // A1. Hit Local NPCs & Remote Players
        if (pr.isPlayer && !pr.isRemoteVisual) {
          if (!cachedNPCs) cachedNPCs = collectNPCTargets(activeCtx);
          for (let n = 0; n < cachedNPCs.length; n++) {
            const ent = cachedNPCs[n];
            if (ent === pr.shooter || ent.hp <= 0 || pr.hitSet.has(ent)) continue;
            const ex = ent.x ?? ent.mesh?.position?.x ?? 0;
            const ey = ent.y ?? ent.mesh?.position?.y ?? 0;
            const ez = ent.z ?? ent.mesh?.position?.z ?? 0;
            const hdx = pr.x - ex;
            const hdz = pr.z - ez;
            const horizSq = hdx * hdx + hdz * hdz;

            if (horizSq <= hitRadSq && pr.y >= ey - 0.15 && pr.y <= ey + 1.95) {
              if (pr.isExplosive) {
                spawnExplosion(pr.x, pr.y, pr.z, 1.15, activeCtx);
                hitSomething = true;
                break;
              }
              const isHeadshot = !pr.isSwordQi && pr.y >= ey + 1.46;
              spawnParticles(pr.x, pr.y, pr.z, pr.isSwordQi ? 'sword_qi' : 'blood', isHeadshot ? 14 : 8, 4.2);
              applyNPCDamage(ent, pr.damage, {
                isHeadshot,
                headshotMult: pr.headshotMult,
                isPlayer: true,
                weaponId: pr.weaponId,
                dirX: ndx,
                dirZ: ndz,
                impulse: pr.isSwordQi ? 6.5 : isHeadshot ? 3.6 : 2.0
              }, activeCtx);

              if (pr.isSwordQi) {
                pr.hitSet.add(ent);
                pr.pierceCount++;
                if (pr.pierceCount >= 3) {
                  hitSomething = true;
                  break;
                }
              } else {
                hitSomething = true;
                break;
              }
            }
          }

          // Check Remote Multiplayer Players!
          if (!hitSomething && remotePlayers && remotePlayers.length > 0) {
            for (let r = 0; r < remotePlayers.length; r++) {
              const rp = remotePlayers[r];
              if (pr.hitSet.has(rp.id)) continue;
              const hdx = pr.x - rp.x;
              const hdz = pr.z - rp.z;
              const ry = rp.y || 0;
              if (hdx * hdx + hdz * hdz <= hitRadSq && pr.y >= ry - 0.15 && pr.y <= ry + 1.95) {
                if (pr.isExplosive) {
                  spawnExplosion(pr.x, pr.y, pr.z, 1.15, activeCtx);
                  hitSomething = true;
                  break;
                }
                const isHeadshot = !pr.isSwordQi && pr.y >= ry + 1.46;
                const finalDmg = Math.round(isHeadshot ? pr.damage * 1.85 : pr.damage);
                spawnParticles(pr.x, pr.y, pr.z, pr.isSwordQi ? 'sword_qi' : 'blood', 10, 4.2);
                activeCtx.mp?.sendDamagePlayer?.(rp.id, finalDmg, isHeadshot, pr.weaponId);
                activeCtx.ui?.triggerHitmarker?.(isHeadshot);
                pr.hitSet.add(rp.id);
                if (!pr.isSwordQi) {
                  hitSomething = true;
                  break;
                }
              }
            }
          }
        } else if (!pr.isRemoteVisual && pl && pr.shooter !== pl && !pl.isDead && !pl.isBusted) {
          const hdx = pr.x - pl.x;
          const hdz = pr.z - pl.z;
          const pyBase = pl.y ?? 0;
          if (hdx * hdx + hdz * hdz <= 0.15 && pr.y >= pyBase + 0.05 && pr.y <= pyBase + 1.85) {
            if (pr.isExplosive) {
              spawnExplosion(pr.x, pr.y, pr.z, 1.0, activeCtx);
            } else {
              spawnParticles(pr.x, pr.y, pr.z, 'blood', 6, 3.2);
              applyPlayerDamage(pr.damage, pr.shooter, activeCtx);
            }
            hitSomething = true;
          }
        }
        if (hitSomething) break;

        // B. Vehicle & Helicopter Hit Test
        if (Array.isArray(cars)) {
          for (let c = 0; c < cars.length; c++) {
            const car = cars[c];
            if (!car || car === pr.shooter?.inCar || car === pr.shooter) continue;
            const cy = car.y ?? 0;
            const isHeli = car.type === 'heli' || car.archetype === 'heli';
            const maxH = isHeli ? 2.6 : 1.65;
            if (pr.y < cy - 0.3 || pr.y > cy + maxH) continue;

            const cdx = pr.x - (car.x ?? 0);
            const cdz = pr.z - (car.z ?? 0);
            if (cdx * cdx + cdz * cdz > (isHeli ? 14 : 8.5)) continue;

            const cyaw = car.yaw ?? 0;
            const cosY = Math.cos(-cyaw);
            const sinY = Math.sin(-cyaw);
            const lx = cdx * cosY - cdz * sinY;
            const lz = cdx * sinY + cdz * cosY;
            const halfW = (isHeli ? 1.45 : (car.halfW || 1.02)) + (pr.isSwordQi ? 0.55 : 0);
            const halfL = (isHeli ? 3.2 : (car.halfL || 2.32)) + (pr.isSwordQi ? 0.55 : 0);

            if (Math.abs(lx) <= halfW && Math.abs(lz) <= halfL) {
              if (pr.isExplosive) {
                spawnExplosion(pr.x, pr.y, pr.z, 1.25, activeCtx, pr.isRemoteVisual);
              } else {
                spawnParticles(pr.x, pr.y, pr.z, pr.isSwordQi ? 'sword_qi' : 'sparks', 8, 6.0);
                if (!pr.isRemoteVisual) {
                  const vDmg = pr.damage * pr.vehicleDamageMult;
                  activeCtx.vehicles?.damageVehicle?.(car, vDmg, activeCtx);
                }
              }
              hitSomething = true;
              break;
            }
          }
        }
        if (hitSomething) break;

        if (!pr.isRemoteVisual && Array.isArray(helis)) {
          for (let h = 0; h < helis.length; h++) {
            const heli = helis[h];
            if (!heli || (cars && cars.includes(heli)) || heli.dead || heli.hp <= 0) continue;
            const hdx = pr.x - (heli.x ?? 0);
            const hdy = pr.y - (heli.y ?? 48);
            const hdz = pr.z - (heli.z ?? 0);
            if (hdx * hdx + hdy * hdy + hdz * hdz <= 10.5) {
              if (pr.isExplosive) {
                spawnExplosion(pr.x, pr.y, pr.z, 1.35, activeCtx);
              } else {
                spawnParticles(pr.x, pr.y, pr.z, 'sparks', 9, 6.5);
                if (typeof heli.hp === 'number') heli.hp -= pr.damage * pr.vehicleDamageMult;
                activeCtx.ui?.triggerHitmarker?.(heli.hp <= 0);
              }
              hitSomething = true;
              break;
            }
          }
        }
        if (hitSomething) break;

        // C. World Ground & Building AABB Collision
        const gY = activeCtx.world?.getGroundHeight ? activeCtx.world.getGroundHeight(pr.x, pr.z) : 0.02;
        if (pr.y <= gY) {
          if (pr.isExplosive) {
            spawnExplosion(pr.x, gY + 0.08, pr.z, 1.2, activeCtx, pr.isRemoteVisual);
          } else {
            const surfType = pr.isSwordQi ? 'sword_qi' : pr.x < -202 ? 'water' : pr.x < -128 ? 'sand' : 'sparks';
            spawnParticles(pr.x, gY + 0.05, pr.z, surfType, 6, 4.0);
          }
          hitSomething = true;
          break;
        }

        if (
          activeCtx.world?.checkLOS &&
          !isInsideFibGlassAtrium(pr.x, pr.y, pr.z) &&
          !activeCtx.world.checkLOS(prevX, prevY, prevZ, pr.x, pr.y, pr.z)
        ) {
          if (pr.isExplosive) {
            spawnExplosion(prevX, prevY, prevZ, 1.2, activeCtx, pr.isRemoteVisual);
          } else {
            spawnParticles(prevX, prevY, prevZ, pr.isSwordQi ? 'sword_qi' : 'sparks', 8, 5.2);
          }
          hitSomething = true;
          break;
        }

        if (pr.distTraveled >= pr.maxRange) {
          if (pr.isExplosive) {
            spawnExplosion(pr.x, pr.y, pr.z, 1.1, activeCtx, pr.isRemoteVisual);
          }
          hitSomething = true;
          break;
        }
      }

      if (hitSomething) {
        pr.active = false;
        pr.mesh.visible = false;
        pr.mesh.matrixAutoUpdate = false;
      } else {
        pr.mesh.position.set(pr.x, pr.y, pr.z);
        _v1.set(pr.x + pr.vx, pr.y + pr.vy, pr.z + pr.vz);
        pr.mesh.lookAt(_v1);
        if (pr.isSwordQi) {
          const fade = 1 - clamp(pr.distTraveled / pr.maxRange, 0, 1) * 0.35;
          pr.mesh.scale.setScalar(1.0 + pr.distTraveled * 0.025);
          matPool.swordQiWave.opacity = 0.95 * fade;
        }
      }
    }
  }

  // ============================================================================
  // 11. PLAYER INITIALIZATION, KHINH CÔNG ĐẠP KHÔNG & ON-FOOT PHYSICS
  // ============================================================================
  let _lastSyncedWeaponId = null;
  let _lastSyncedWeaponIdx = null;
  let _lastSyncedOutfit = null;
  let _wasJumpDown = false;
  let _wasInCar = false;
  let _moveYSign = 1;
  let _surfSplashTimer = 0;
  let _glidePetalTimer = 0;

  function ensurePlayerInitialized(activeCtx) {
    if (!activeCtx.player) {
      activeCtx.player = {};
    }
    const p = activeCtx.player;

    if (typeof p.x !== 'number' || Number.isNaN(p.x)) p.x = 26;
    if (typeof p.y !== 'number' || Number.isNaN(p.y)) p.y = 0.22;
    if (typeof p.z !== 'number' || Number.isNaN(p.z)) p.z = 28;
    if (typeof p.vx !== 'number') p.vx = 0;
    if (typeof p.vy !== 'number') p.vy = 0;
    if (typeof p.vz !== 'number') p.vz = 0;
    if (typeof p.yaw !== 'number') p.yaw = Math.PI;
    if (typeof p.hp !== 'number') p.hp = 100;
    if (typeof p.maxHp !== 'number') p.maxHp = 100;
    if (typeof p.armor !== 'number') p.armor = 0;
    if (typeof p.maxArmor !== 'number') p.maxArmor = 100;
    if (typeof p.special !== 'number') p.special = 100;
    if (typeof p.maxSpecial !== 'number') p.maxSpecial = 100;
    if (typeof p.stamina !== 'number') p.stamina = 100;
    if (typeof p.sprintStamina !== 'number') p.sprintStamina = p.stamina;
    if (typeof p.cash !== 'number') p.cash = 7860;
    if (p.isGrounded === undefined) p.isGrounded = true;
    if (typeof p.airJumps !== 'number') p.airJumps = 0;
    if (!p.outfit) p.outfit = 'casual_polo';
    p.isPlayer = true;

    if (!p.weaponId && !p.currentWeapon && !p.equippedWeapon && !p.weapon && !p.activeWeapon) {
      p.weaponId = typeof p.weaponIdx === 'number' ? WEAPON_ORDER[p.weaponIdx] || 'bat' : 'bat';
    }
    const initW = resolveWeaponDef(
      p.weaponId || p.currentWeapon || p.activeWeapon || p.weapon || p.equippedWeapon
    );
    p.weaponId = initW.id;
    p.weapon = initW.id;
    p.currentWeapon = initW.id;
    p.activeWeapon = initW.id;
    p.equippedWeapon = initW.id;
    p.weaponIdx = initW.slot;

    if (!p.unlockedWeapons) {
      p.unlockedWeapons = {
        unarmed: true,
        bat: true,
        pistol: true,
        smg: true,
        carbine: true,
        shotgun: true,
        grenade: true
      };
    }

    if (!p.ammo) {
      p.ammo = {
        unarmed: Infinity,
        bat: Infinity,
        pistol: 120,
        smg: 240,
        carbine: 180,
        shotgun: 48,
        grenade: 12
      };
    }
    if (!p.clip) {
      p.clip = {
        pistol: 16,
        smg: 30,
        carbine: 30,
        shotgun: 8,
        grenade: 6
      };
    }

    if (!p.rig || !p.rig.joints) {
      const rig = createHumanoid(p.outfit);
      rig.isPlayer = true;
      rig.anim.isPlayerRig = true;
      setHumanoidCastShadow(rig, true);
      p.rig = rig;
      p.mesh = rig;
      equipRigWeapon(rig, p.weaponId);
      rig.position.set(p.x, p.y, p.z);
      rig.rotation.set(0, p.yaw, 0);
      _lastSyncedOutfit = p.outfit;
      _lastSyncedWeaponId = p.weaponId;
      _lastSyncedWeaponIdx = p.weaponIdx;
    }

    if (activeCtx.engine?.scene && !p.inCar && p.mesh.parent !== activeCtx.engine.scene) {
      activeCtx.engine.scene.add(p.mesh);
    }
    return p;
  }

  function syncPlayerEquipment(p, input) {
    if (input) {
      const slotFromInput =
        typeof input.selectedWeapon === 'string'
          ? input.selectedWeapon
          : typeof input.weaponSlot === 'number' && input.weaponSlot >= 0
          ? WEAPON_ORDER[input.weaponSlot]
          : null;
      if (slotFromInput && weaponDefs[slotFromInput]) {
        p.weaponId = weaponDefs[slotFromInput].id;
      }
    }

    if (typeof p.weaponIdx === 'number' && p.weaponIdx !== _lastSyncedWeaponIdx) {
      const byIdx = WEAPON_ORDER[clamp(p.weaponIdx, 0, WEAPON_ORDER.length - 1)];
      if (byIdx) {
        p.weaponId = byIdx;
        p.weapon = byIdx;
        p.currentWeapon = byIdx;
        p.activeWeapon = byIdx;
        p.equippedWeapon = byIdx;
      }
    } else {
      const candidateId =
        p.weaponId && p.weaponId !== _lastSyncedWeaponId
          ? p.weaponId
          : p.weapon && p.weapon !== _lastSyncedWeaponId
          ? p.weapon
          : p.currentWeapon && p.currentWeapon !== _lastSyncedWeaponId
          ? p.currentWeapon
          : p.activeWeapon && p.activeWeapon !== _lastSyncedWeaponId
          ? p.activeWeapon
          : p.equippedWeapon && p.equippedWeapon !== _lastSyncedWeaponId
          ? p.equippedWeapon
          : p.weaponId || p.weapon || p.currentWeapon || 'bat';
      const resolved = resolveWeaponDef(candidateId);
      p.weaponId = resolved.id;
      p.weapon = resolved.id;
      p.currentWeapon = resolved.id;
      p.activeWeapon = resolved.id;
      p.equippedWeapon = resolved.id;
      p.weaponIdx = resolved.slot;
    }

    _lastSyncedWeaponId = p.weaponId;
    _lastSyncedWeaponIdx = p.weaponIdx;
    equipRigWeapon(p.rig, p.weaponId);

    const activeDef = resolveWeaponDef(p.weaponId);
    p.currentClip = activeDef.isMelee ? Infinity : (p.clip?.[activeDef.id] ?? activeDef.clipSize);
    p.clipCount = p.currentClip;
    p.reserveCount = activeDef.isMelee ? Infinity : (p.ammo?.[activeDef.id] ?? 0);

    if (p.outfit && p.outfit !== _lastSyncedOutfit) {
      setOutfit(p.rig, p.outfit);
      _lastSyncedOutfit = p.outfit;
    }
  }

  function readMovementInput(input) {
    if (!input) {
      return { ix: 0, iy: 0, sprint: false, jump: false, aim: false, fire: false, rapUp: false, rapDown: false };
    }
    const keys = input.keys || {};
    const kRight = Boolean(input.right || input.moveRight || keys.KeyD || keys.ArrowRight);
    const kLeft = Boolean(input.left || input.moveLeft || keys.KeyA || keys.ArrowLeft);
    const kUp = Boolean(input.forward || input.up || input.moveForward || keys.KeyW || keys.ArrowUp);
    const kDown = Boolean(input.backward || input.down || input.moveBackward || keys.KeyS || keys.ArrowDown);

    const keyX = (kRight ? 1 : 0) - (kLeft ? 1 : 0);
    const keyY = (kUp ? 1 : 0) - (kDown ? 1 : 0);

    if (kUp && !kDown && typeof input.moveY === 'number' && Math.abs(input.moveY) > 0.5) {
      _moveYSign = input.moveY < 0 ? -1 : 1;
    }

    let stickX = typeof input.moveX === 'number' ? input.moveX : (input.joyX ?? input.axisX ?? 0);
    let stickY = 0;
    if (typeof input.moveZ === 'number') {
      stickY = -input.moveZ;
    } else if (typeof input.moveY === 'number') {
      stickY = input.moveY * _moveYSign;
    } else if (typeof input.joyY === 'number') {
      stickY = -input.joyY;
    }

    const ix = Math.abs(stickX) > Math.abs(keyX) ? clamp(stickX, -1, 1) : keyX;
    const iy = Math.abs(stickY) > Math.abs(keyY) ? clamp(stickY, -1, 1) : keyY;
    const stickMag = Math.hypot(stickX, stickY);

    const sprint = Boolean(
      input.sprint ||
      input.shift ||
      input.boost ||
      keys.ShiftLeft ||
      keys.ShiftRight ||
      stickMag >= 0.72
    );
    const jump = Boolean(input.jump || input.jumpJustPressed || input.space || keys.Space);
    const aim = Boolean(input.aim || input.isAiming || input.aiming || input.rightMouse);
    const fire = Boolean(
      input.fire ||
      input.shoot ||
      input.isFiring ||
      input.attack ||
      input.fireJustPressed ||
      input.driveBy ||
      input.leftMouse
    );
    const rapUp = Boolean(kUp || input.rappelUp || input.ascend || input.climbUp || iy > 0.35);
    const rapDown = Boolean(kDown || input.rappelDown || input.descend || input.climbDown || iy < -0.35);

    return { ix, iy, sprint, jump, aim, fire, rapUp, rapDown };
  }

  function extractCameraHorizontalBasis(activeCtx) {
    const cam = activeCtx.engine?.camera;
    if (cam && typeof cam.getWorldDirection === 'function') {
      cam.getWorldDirection(_camFwd);
      if (activeCtx.input?.lookBehind) {
        _camFwd.x = -_camFwd.x;
        _camFwd.z = -_camFwd.z;
      }
      _camFwd.y = 0;
      const len = Math.hypot(_camFwd.x, _camFwd.z);
      if (len > 0.001) {
        _camFwd.x /= len;
        _camFwd.z /= len;
        _camRight.set(-_camFwd.z, 0, _camFwd.x);
        return;
      }
    }
    const cy = activeCtx.engine?.camYaw ?? Math.PI;
    _camFwd.set(-Math.sin(cy), 0, -Math.cos(cy));
    _camRight.set(-_camFwd.z, 0, _camFwd.x);
  }

  function detectSurfaceType(x, z, groundY) {
    if (x < -198 || groundY < -0.05) return 'water';
    if (x >= -296 && x <= -128 && z >= -32 && z <= 22 && groundY > 0.9) return 'wood';
    if (x < -128) return 'sand';
    return 'concrete';
  }

  function updateWorldRappelCableVisual(p, rs, activeCtx) {
    const grp = ensureWorldRappelCable(activeCtx.engine?.scene);
    if (!rs || !rs.active) {
      grp.visible = false;
      return;
    }
    grp.visible = true;
    p.rig.updateMatrixWorld(true);
    if (p.rig.carabinerNode) {
      p.rig.carabinerNode.getWorldPosition(_v1);
    } else {
      _v1.set(p.x, p.y + 1.22, p.z);
    }

    const maxY = rs.maxY ?? 78;
    const anchorX = _v1.x;
    const anchorZ = rs.wallZ ?? -15.2;
    const bottomX = _v1.x;
    const bottomY = _v1.y - 0.85;
    const bottomZ = _v1.z;

    _v3.set(anchorX - bottomX, maxY - bottomY, anchorZ - bottomZ);
    const cableLen = Math.max(0.5, _v3.length());
    _v3.normalize();

    _worldRappelCable.position.set(bottomX, bottomY, bottomZ);
    _quat.setFromUnitVectors(_upVec, _v3);
    _worldRappelCable.quaternion.copy(_quat);
    _worldRappelCable.scale.set(1, cableLen, 1);

    _worldRappelAnchor.position.set(anchorX, maxY, anchorZ);
  }

  function updatePlayerOnFoot(dt = 0.016, ctxArg = null) {
    const activeCtx = ctxArg && (ctxArg.engine || ctxArg.world) ? ctxArg : ctx;
    const safeDt = clamp(dt || 0.016, 0.0005, 0.1);

    const p = ensurePlayerInitialized(activeCtx);
    const inp = readMovementInput(activeCtx.input);
    syncPlayerEquipment(p, activeCtx.input);

    if ((p.fireCooldown || 0) > 0) p.fireCooldown = Math.max(0, p.fireCooldown - safeDt);
    if ((p._recentFireTimer || 0) > 0) p._recentFireTimer = Math.max(0, p._recentFireTimer - safeDt);

    if (!p.rappelState?.active && _worldRappelGroup?.visible) {
      _worldRappelGroup.visible = false;
    }

    if (p.isDead || p.dead) {
      p.isAiming = false;
      p.vx *= Math.exp(-6 * safeDt);
      p.vz *= Math.exp(-6 * safeDt);
      p.x += p.vx * safeDt;
      p.z += p.vz * safeDt;
      const gY = activeCtx.world?.getGroundHeight ? activeCtx.world.getGroundHeight(p.x, p.z) : 0.22;
      p.y = damp(p.y, gY, 12, safeDt);
      p.rig.anim.showBlood = true;
      animateHumanoid(p.rig, 'dead', safeDt);
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.set(0, p.yaw, 0);
      return;
    }

    if (p.isBusted) {
      p.isAiming = false;
      p.vx = 0;
      p.vz = 0;
      animateHumanoid(p.rig, 'busted', safeDt);
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.set(0, p.yaw, 0);
      return;
    }

    if (p.inCar) {
      _wasInCar = true;
      p.isAiming = Boolean(inp.aim);
      const steerVal = activeCtx.input?.steer ?? inp.ix;
      let aimYawOff = 0;
      let aimPitch = 0;
      const firingDriveBy = Boolean(inp.fire);

      if ((firingDriveBy || p.isAiming) && activeCtx.engine?.getAimRay) {
        const ray = activeCtx.engine.getAimRay();
        if (ray?.dir) {
          const worldAimYaw = Math.atan2(ray.dir.x, ray.dir.z);
          aimYawOff = normalizeAngle(worldAimYaw - (p.inCar.yaw ?? p.yaw));
          aimPitch = clamp(Math.asin(clamp(ray.dir.y, -0.7, 0.7)), -0.55, 0.55);
        }
      }

      if (firingDriveBy) {
        fireWeapon(p, activeCtx);
      }

      animateHumanoid(p.rig, 'driving', safeDt, {
        steer: steerVal,
        aimDriveBy: firingDriveBy || p.isAiming,
        aimYawOffset: aimYawOff,
        aimPitch
      });
      return;
    }

    if (_wasInCar) {
      _wasInCar = false;
      p.mesh.visible = true;
      p.mesh.scale.set(1, 1, 1);
      if (activeCtx.engine?.scene && p.mesh.parent !== activeCtx.engine.scene) {
        activeCtx.engine.scene.add(p.mesh);
      }
    }

    // Skyscraper Cable Rappel Mode (Tháp Thiên Cơ)
    if (p.rappelState?.active) {
      const rs = p.rappelState;
      const minY = rs.minY ?? 2.0;
      const maxY = rs.maxY ?? 78.0;
      const wallZ = rs.wallZ ?? -15.2;
      if (typeof rs.cableY !== 'number') rs.cableY = clamp(p.y || 77, minY, maxY);
      if (typeof rs.swingVx !== 'number') rs.swingVx = 0;

      let climbVel = 0;
      if (inp.rapUp && !inp.rapDown) {
        climbVel = 5.6;
      } else if (inp.rapDown) {
        climbVel = inp.sprint ? -16.5 : -7.6;
        if (inp.sprint && nextRand() < 0.45) {
          spawnParticles(p.x, p.y + 1.2, p.z + 0.1, 'sparks', 1, 2.5);
        }
      }
      rs.cableY = clamp(rs.cableY + climbVel * safeDt, minY, maxY);
      p.y = damp(p.y, rs.cableY, 20, safeDt);
      p.vy = climbVel;
      p.isGrounded = false;

      extractCameraHorizontalBasis(activeCtx);
      const rightSign = _camRight.x >= -0.15 ? 1 : -1;
      const targetLatVel = inp.ix * rightSign * 6.8;
      rs.swingVx = damp(rs.swingVx, targetLatVel, 9, safeDt);
      p.x = clamp(p.x + rs.swingVx * safeDt, 142, 178);
      const swingOutZ = wallZ + Math.min(0.45, Math.abs(rs.swingVx) * 0.055);
      p.z = damp(p.z, swingOutZ, 14, safeDt);
      p.vx = rs.swingVx;
      p.vz = 0;

      p.isAiming = Boolean(inp.aim);
      const curDef = resolveWeaponDef(p.weaponId);
      if (curDef.isMelee) {
        p.weaponId = 'pistol';
        syncPlayerEquipment(p, null);
      }

      let aimPitch = 0;
      let aimYawOffset = 0;
      if (activeCtx.engine?.getAimRay) {
        const ray = activeCtx.engine.getAimRay();
        if (ray?.dir) {
          const camWorldYaw = Math.atan2(ray.dir.x, ray.dir.z);
          aimPitch = clamp(Math.asin(clamp(ray.dir.y, -0.85, 0.85)), -0.80, 0.80);
          if (p.isAiming || inp.fire || p._recentFireTimer > 0) {
            p.yaw = dampAngle(p.yaw, camWorldYaw, 18, safeDt);
          } else {
            p.yaw = dampAngle(p.yaw, Math.PI, 8, safeDt);
          }
          aimYawOffset = clamp(normalizeAngle(camWorldYaw - p.yaw), -1.25, 1.25);
        }
      }

      if (inp.fire) {
        fireWeapon(p, activeCtx);
      }

      p.animState = 'rappel';
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.set(0, p.yaw, 0);

      animateHumanoid(p.rig, 'rappel', safeDt, {
        climbVel,
        lateralVel: rs.swingVx,
        aimPitch,
        aimYawOffset,
        useWorldCable: true
      });
      updateWorldRappelCableVisual(p, rs, activeCtx);
      return;
    }

    // Standard On-Foot Movement + Wuxia Khinh Công Đạp Không!
    extractCameraHorizontalBasis(activeCtx);
    const curWeapon = resolveWeaponDef(p.weaponId);
    p.isAiming = Boolean(inp.aim);

    let wishX = _camRight.x * inp.ix + _camFwd.x * inp.iy;
    let wishZ = _camRight.z * inp.ix + _camFwd.z * inp.iy;
    const wishMag = Math.hypot(wishX, wishZ);
    const inputIntensity = clamp(wishMag, 0, 1);
    if (wishMag > 0.001) {
      wishX /= wishMag;
      wishZ /= wishMag;
    }

    const canSprint =
      inp.sprint &&
      inputIntensity > 0.25 &&
      !p.isAiming &&
      !p.sprintExhausted &&
      p.stamina > 0;

    if (canSprint && p.isGrounded) {
      p.stamina = Math.max(0, p.stamina - 16 * safeDt);
      if (p.stamina <= 0.1) p.sprintExhausted = true;
    } else {
      p.stamina = Math.min(100, p.stamina + 20 * safeDt);
      if (p.sprintExhausted && p.stamina >= 22) p.sprintExhausted = false;
    }
    p.sprintStamina = p.stamina;
    p.isSprinting = canSprint;

    const inSafehouse = Boolean(p.inSafehouse || p.inHouse || p.inInterior);
    const onFibRoofPad =
      !inSafehouse && p.x >= 135.5 && p.x <= 184.5 && p.z >= -64.5 && p.z <= -14.8 && p.y >= 74.0;

    let preGroundY = activeCtx.world?.getGroundHeight
      ? activeCtx.world.getGroundHeight(p.x, p.z)
      : 0.22;
    if (onFibRoofPad) preGroundY = Math.max(preGroundY, 78.02);

    const inShallowSurf = !inSafehouse && !onFibRoofPad && (p.x < -202 || preGroundY < -0.06);
    const surfDrag = inShallowSurf ? 0.78 : 1.0;

    const targetMaxSpeed =
      (p.isAiming ? 4.0 : canSprint ? 10.6 : 5.8) * inputIntensity * surfDrag;

    const accel = p.isGrounded ? 44 : 22;
    if (inputIntensity > 0.04) {
      p.vx = damp(p.vx, wishX * targetMaxSpeed, accel * 0.35, safeDt);
      p.vz = damp(p.vz, wishZ * targetMaxSpeed, accel * 0.35, safeDt);
    } else if (p.isGrounded) {
      const drop = 34 * safeDt;
      const curSpd = Math.hypot(p.vx, p.vz);
      if (curSpd <= drop) {
        p.vx = 0;
        p.vz = 0;
      } else {
        const ratio = (curSpd - drop) / curSpd;
        p.vx *= ratio;
        p.vz *= ratio;
      }
    }

    p.x += p.vx * safeDt;
    p.z += p.vz * safeDt;

    if (!inSafehouse && p.x < 500) {
      p.x = clamp(p.x, -298, 276);
      p.z = clamp(p.z, -345, 256);
      const onPierCorridor = p.z >= -33 && p.z <= 23 && p.y > 1.2;
      if (!onPierCorridor && p.x < -226) {
        p.x = -226;
        if (p.vx < 0) p.vx = 0;
      }
    } else if (p.inInterior === 'stadium' || (p.x >= 1730 && p.x <= 1870)) {
      p.x = clamp(p.x, 1755.4, 1844.6);
      p.z = clamp(p.z, 1769.4, 1830.6);
    } else if (p.inInterior === 'barclub' || (p.x >= 1050 && p.x <= 1150)) {
      p.x = clamp(p.x, 1086.6, 1113.4);
      p.z = clamp(p.z, 1086.6, 1113.4);
    } else if (p.inInterior === 'shop' || (p.x >= 1350 && p.x <= 1450)) {
      p.x = clamp(p.x, 1389.6, 1410.4);
      p.z = clamp(p.z, 1389.6, 1410.4);
    } else if (inSafehouse || p.x >= 500) {
      p.x = clamp(p.x, 791, 809);
      p.z = clamp(p.z, 791, 809);
    }

    const stillOnFibRoof =
      !inSafehouse && p.x >= 135.5 && p.x <= 184.5 && p.z >= -64.5 && p.z <= -14.8 && p.y >= 74.0;
    if (!stillOnFibRoof) {
      activeCtx.world?.resolveCircleAABB?.(p, 0.42);
    }

    let groundY = activeCtx.world?.getGroundHeight
      ? activeCtx.world.getGroundHeight(p.x, p.z)
      : 0.22;
    if (stillOnFibRoof) groundY = Math.max(groundY, 78.02);

    const jumpJustTriggered = inp.jump && !_wasJumpDown;
    _wasJumpDown = inp.jump;

    if (p.isGrounded && jumpJustTriggered && !p.isAiming) {
      p.vy = 8.8;
      p.isGrounded = false;
      p.airJumps = 0;
    } else if (!p.isGrounded && jumpJustTriggered && !p.isAiming && !inSafehouse && (p.airJumps || 0) < 2) {
      // KHINH CÔNG ĐẠP KHÔNG (Double / Triple Aerial Step + Wind Ring & Blossom Burst!)
      p.airJumps = (p.airJumps || 0) + 1;
      p.vy = p.airJumps === 1 ? 10.4 : 9.6;
      const boostDirX = inputIntensity > 0.1 ? wishX : Math.sin(p.yaw);
      const boostDirZ = inputIntensity > 0.1 ? wishZ : Math.cos(p.yaw);
      p.vx = boostDirX * Math.max(Math.hypot(p.vx, p.vz), 9.6) + boostDirX * 2.2;
      p.vz = boostDirZ * Math.max(Math.hypot(p.vx, p.vz), 9.6) + boostDirZ * 2.2;

      triggerShockRing(p.x, p.y + 0.08, p.z, p.airJumps === 1 ? 0x6bf5e8 : 0xf5ca5c, 2.5, 0.34);
      spawnParticles(p.x, p.y + 0.1, p.z, 'petals', 8, 3.2);
      spawnParticles(p.x, p.y + 0.1, p.z, 'sword_qi', 6, 3.8);
      activeCtx.audio?.playKhinhCong?.(p.airJumps);
    }

    if (!p.isGrounded) {
      // Hold Space while falling for graceful Wuxia Lăng Không Glide!
      const isGliding = inp.jump && p.vy < -1.8 && !inSafehouse;
      const grav = isGliding ? 8.2 : 24.5;
      p.vy -= grav * safeDt;
      if (isGliding && p.vy < -4.8) p.vy = -4.8;
      if (isGliding) {
        _glidePetalTimer -= safeDt;
        if (_glidePetalTimer <= 0) {
          _glidePetalTimer = 0.12;
          spawnParticles(p.x, p.y + 0.4, p.z, 'petals', 2, 1.5);
        }
      }
      p.y += p.vy * safeDt;
      if (p.y <= groundY) {
        p.y = groundY;
        p.vy = 0;
        p.isGrounded = true;
        p.airJumps = 0;
      }
    } else {
      p.airJumps = 0;
      const heightDelta = groundY - p.y;
      if (heightDelta < -0.58) {
        p.isGrounded = false;
        p.vy = 0;
      } else {
        p.y = damp(p.y, groundY, 26, safeDt);
        p.vy = 0;
      }
    }
    p.onGround = p.isGrounded;

    const horizSpeed = Math.hypot(p.vx, p.vz);
    if (inShallowSurf && horizSpeed > 0.8 && p.isGrounded) {
      _surfSplashTimer -= safeDt;
      if (_surfSplashTimer <= 0) {
        _surfSplashTimer = canSprint ? 0.18 : 0.30;
        spawnParticles(p.x, Math.max(p.y, -0.05) + 0.08, p.z, 'water', 4, 2.6);
      }
    }

    let aimPitch = 0;
    const isUsingGun = !curWeapon.isMelee && (p.isAiming || inp.fire || p._recentFireTimer > 0);
    if (isUsingGun && activeCtx.engine?.getAimRay) {
      const ray = activeCtx.engine.getAimRay();
      if (ray?.dir) {
        const aimYaw = Math.atan2(ray.dir.x, ray.dir.z);
        p.yaw = dampAngle(p.yaw, aimYaw, 24, safeDt);
        aimPitch = clamp(Math.asin(clamp(ray.dir.y, -0.82, 0.82)), -0.75, 0.75);
      }
    } else if (horizSpeed > 0.25) {
      const moveYaw = Math.atan2(p.vx, p.vz);
      p.yaw = dampAngle(p.yaw, moveYaw, 15, safeDt);
    }

    if (inp.fire) {
      fireWeapon(p, activeCtx);
    }

    const surface = detectSurfaceType(p.x, p.z, groundY);
    let animState = 'idle';
    if (!p.isGrounded && (p.vy > 1.0 || p.y - groundY > 0.55)) {
      animState = 'jump';
    } else if (p.rig.anim.meleeTimer > 0) {
      animState = 'melee';
    } else if (isUsingGun) {
      animState = curWeapon.animType;
    } else if (horizSpeed > 7.6) {
      animState = 'sprint';
    } else if (horizSpeed > 3.6) {
      animState = 'run';
    } else if (horizSpeed > 0.35) {
      animState = 'walk';
    }

    p.animState = animState;
    p.isFiring = Boolean(inp.fire);
    p.mesh.position.set(p.x, p.y, p.z);
    p.mesh.rotation.set(0, p.yaw, 0);

    animateHumanoid(p.rig, animState, safeDt, {
      moveSpeed: horizSpeed,
      aimPitch,
      surface
    });
  }

  function equipWeapon(target, weaponId) {
    const def = resolveWeaponDef(weaponId);
    equipRigWeapon(target, def.id);
    if (ctx.player && (target === ctx.player || target === ctx.player.rig)) {
      ctx.player.weaponId = def.id;
      ctx.player.weapon = def.id;
      ctx.player.currentWeapon = def.id;
      ctx.player.activeWeapon = def.id;
      ctx.player.equippedWeapon = def.id;
      ctx.player.weaponIdx = def.slot;
      _lastSyncedWeaponId = def.id;
      _lastSyncedWeaponIdx = def.slot;
    }
  }

  const api = {
    weaponDefs,
    createHumanoid,
    setHumanoidCastShadow,
    setOutfit,
    equipWeapon,
    animateHumanoid,
    updatePlayerOnFoot,
    fireWeapon,
    spawnRemoteAttack,
    triggerShockRing,
    spawnExplosion,
    spawnParticles,
    updateProjectilesAndFX
  };

  ctx.characters = api;
  ensurePlayerInitialized(ctx);
  ensureFXInScene();

  return api;
}
