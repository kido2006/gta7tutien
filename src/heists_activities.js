import * as THREE from 'three';

// ============================================================================
// GTA: Đại Lộ & Bờ Biển 3D — Phase 3 Đại Kiếp Bảo Khố, Interactive Hacking Canvas
// Minigames, Midnight Neon Giải Đua Đêm Giang Hồ, Vạn Thương Linh Các Dynamic Vạn Thương Linh Các,
// Lệnh Truy Nã Giang Hồ & 40 In-Game Thành Tựu Võ Lâm
// Exclusively owns: src/heists_activities.js -> createHeistsActivities(ctx)
// ============================================================================

export function createHeistsActivities(ctx = {}) {
  const SAVE_PORTFOLIO_KEY = 'gtav_bawsaq_portfolio_v3';
  const SAVE_ACHIEVEMENTS_KEY = 'gtav_achievements_v3';
  const SAVE_PROGRESSION_KEY = 'gtav_heists_progression_v3';

  // --------------------------------------------------------------------------
  // 1. DETERMINISTIC MATH, COLOR & FORMATTING UTILITIES
  // --------------------------------------------------------------------------
  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function damp(cur, target, lambda, dt) {
    return lerp(cur, target, 1 - Math.exp(-lambda * dt));
  }

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
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

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function randInt(min, max) {
    return Math.floor(randRange(min, max + 1));
  }

  function formatMoney(amount, showPlus = false) {
    const num = Math.round(Number(amount) || 0);
    const absStr = Math.abs(num).toLocaleString('en-US');
    if (num < 0) return `-$${absStr}`;
    return showPlus && num > 0 ? `+$${absStr}` : `$${absStr}`;
  }

  function formatPrice(price) {
    const p = Math.max(0.5, Number(price) || 0);
    return p >= 100 ? `$${p.toFixed(2)}` : `$${p.toFixed(2)}`;
  }

  function formatRaceTime(sec) {
    const s = Math.max(0, Number(sec) || 0);
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    const centis = Math.floor((s - Math.floor(s)) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  }

  function escapeHTML(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Seeded PRNG for deterministic biometric ridge generation & initial market candles
  function createSeededRNG(seed = 8472913) {
    let s = seed >>> 0;
    return function next() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // --------------------------------------------------------------------------
  // 2. SAFE GAME CONTEXT BRIDGES (Player, Cash, Wanted, Vehicles, Outfits, GPS)
  // --------------------------------------------------------------------------
  let activeCtx = ctx;
  const heistRoot = new THREE.Group();
  heistRoot.name = 'HeistsActivitiesRoot';

  const _tmpVecA = new THREE.Vector3();
  const _tmpVecB = new THREE.Vector3();

  function getScene() {
    return activeCtx?.engine?.scene || activeCtx?.scene || null;
  }

  function getGroundY(x, z, fallback = 0.22) {
    if (x > 2040 && x < 2160 && z > 2040 && z < 2160) {
      if (activeCtx?.worldInfra?.getExtraGroundHeight) {
        const h = activeCtx.worldInfra.getExtraGroundHeight(x, z);
        if (Number.isFinite(h)) return h;
      }
      return 0.05;
    }
    if (x > 1140 && x < 1260 && z > 1135 && z < 1260) {
      if (activeCtx?.casinoWorld?.getGroundHeight) {
        const h = activeCtx.casinoWorld.getGroundHeight(x, z);
        if (Number.isFinite(h)) return h;
      }
      return 0.05;
    }
    if (activeCtx?.world?.getGroundHeight) {
      const h = activeCtx.world.getGroundHeight(x, z);
      if (Number.isFinite(h)) return h;
    }
    return fallback;
  }

  function getPlayerVehicle() {
    const p = activeCtx?.player;
    if (!p) return null;
    if (p.inCar && typeof p.inCar === 'object') return p.inCar;
    if (p.vehicle && typeof p.vehicle === 'object') return p.vehicle;
    return null;
  }

  function getPlayerCash() {
    const p = activeCtx?.player;
    if (!p) return 0;
    if (Number.isFinite(p.cash)) return p.cash;
    if (Number.isFinite(p.money)) return p.money;
    if (ctx?.antiCheat?.commitCash) {
      ctx.antiCheat.commitCash(7860);
    } else {
      p.cash = 7860;
      p.money = 7860;
    }
    return 7860;
  }

  function setPlayerCash(newAmount, showDelta = true) {
    const p = activeCtx?.player;
    if (!p) return 0;
    const prev = getPlayerCash();
    const clamped = Math.max(0, Math.round(Number(newAmount) || 0));
    const delta = clamped - prev;
    if (ctx?.antiCheat?.commitCash) {
      ctx.antiCheat.commitCash(clamped);
    } else {
      p.cash = clamped;
      p.money = clamped;
    }
    if (showDelta && delta !== 0) {
      activeCtx?.ui?.showCashDelta?.(delta);
    }
    return clamped;
  }

  function addPlayerCash(delta, showDelta = true) {
    return setPlayerCash(getPlayerCash() + Math.round(Number(delta) || 0), showDelta);
  }

  function setWantedStars(stars) {
    const target = clamp(Math.round(Number(stars) || 0), 0, 5);
    const w = activeCtx?.gameplay?.wanted;
    if (w) {
      w.stars = target;
      w.heat = target > 0 ? target * 28 : 0;
      w.spotted = target > 0;
      w.evadeTimer = 0;
      w.flashing = false;
      w.lethalForce = target >= 2;
    }
  }

  function notifyFeed(text, style = 'gold') {
    activeCtx?.ui?.showNotification?.(text, style);
  }

  function showSubtitleText(text, duration = 4.5) {
    activeCtx?.ui?.showSubtitle?.(text, duration);
  }

  function setObjectiveText(text) {
    activeCtx?.ui?.setObjective?.(text || '');
    if (activeCtx?.gameplay?.mission && !activeCtx.gameplay.mission.active) {
      activeCtx.gameplay.mission.objective = text || '';
    }
  }

  function showBigBanner(title, subtitle = '', type = 'passed', duration = 4.6) {
    activeCtx?.ui?.showBanner?.(title, subtitle, type, duration);
  }

  function showInteractHint(text, duration = 0.22) {
    if (!text) return;
    activeCtx?.ui?.showPrompt?.(text, duration);
  }

  function exitPointerLockSafe() {
    if (typeof document !== 'undefined' && document.pointerLockElement && document.exitPointerLock) {
      try {
        document.exitPointerLock();
      } catch (_) {}
    }
  }

  function setGPSWaypoints(targetX, targetZ, intermediatePoints = null) {
    const gps = activeCtx?.gameplay?.gpsWaypoints;
    if (!Array.isArray(gps)) return;
    gps.length = 0;
    if (!Number.isFinite(targetX) || !Number.isFinite(targetZ)) return;

    if (Array.isArray(intermediatePoints) && intermediatePoints.length > 0) {
      for (let i = 0; i < intermediatePoints.length; i++) {
        const pt = intermediatePoints[i];
        if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.z)) {
          gps.push({ x: pt.x, z: pt.z });
        }
      }
    } else if (activeCtx?.player && activeCtx.player.x < 500) {
      // Snap via nearest avenue/street corner for authentic Manhattan-style radar line
      const px = activeCtx.player.x;
      const pz = activeCtx.player.z;
      const avenues = [-120, -40, 40, 120, 200];
      const streets = [-200, -120, -40, 40, 120, 200];
      let bestAx = avenues[0];
      let bestSz = streets[0];
      for (const ax of avenues) {
        if (Math.abs(ax - px) < Math.abs(bestAx - px)) bestAx = ax;
      }
      for (const sz of streets) {
        if (Math.abs(sz - targetZ) < Math.abs(bestSz - targetZ)) bestSz = sz;
      }
      if (dist2D(px, pz, targetX, targetZ) > 45) {
        gps.push({ x: bestAx, z: pz });
        gps.push({ x: bestAx, z: bestSz });
      }
    }
    gps.push({ x: targetX, z: targetZ });
  }

  function clearGPSWaypoints() {
    if (Array.isArray(activeCtx?.gameplay?.gpsWaypoints)) {
      activeCtx.gameplay.gpsWaypoints.length = 0;
    }
  }

  function equipHeistLoadout(outfitId = 'tactical_heist', primaryWeapon = 'carbine') {
    const p = activeCtx?.player;
    if (!p) return;
    if (outfitId) {
      p.outfit = outfitId;
      try {
        activeCtx?.characters?.setOutfit?.(p.rig || p, outfitId);
      } catch (_) {}
    }
    p.hp = Math.max(p.hp || 100, p.maxHp || 100);
    p.armor = 100;
    p.maxArmor = 100;

    const grantList = [
      ['pistol', 160, 16],
      ['smg', 300, 30],
      ['carbine', 270, 30],
      ['shotgun', 72, 8],
      ['grenade', 16, 6]
    ];
    if (!p.ammo || typeof p.ammo !== 'object') p.ammo = {};
    if (!p.clip || typeof p.clip !== 'object') p.clip = {};
    for (const [wId, reserve, clip] of grantList) {
      if (p.unlockedWeapons instanceof Set) p.unlockedWeapons.add(wId);
      else if (p.unlockedWeapons && typeof p.unlockedWeapons === 'object') p.unlockedWeapons[wId] = true;
      p.ammo[wId] = Math.max(Number(p.ammo[wId]) || 0, reserve);
      p.clip[wId] = Math.max(Number(p.clip[wId]) || 0, clip);
    }

    if (primaryWeapon) {
      p.weaponId = primaryWeapon;
      p.weapon = primaryWeapon;
      p.currentWeapon = primaryWeapon;
      p.activeWeapon = primaryWeapon;
      try {
        activeCtx?.characters?.equipWeapon?.(p.rig || p, primaryWeapon);
      } catch (_) {}
    }
  }

  function teleportPlayerSafe(x, y, z, yaw = null) {
    const p = activeCtx?.player;
    if (!p) return;
    const car = getPlayerVehicle();
    if (car) {
      try {
        activeCtx?.vehicles?.exitVehicle?.(true);
      } catch (_) {}
      car.driver = null;
      car.isPlayerDriving = false;
    }
    p.inCar = null;
    p.vehicle = null;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = 0;
    p.vy = 0;
    p.vz = 0;
    p.isGrounded = true;
    if (yaw !== null && Number.isFinite(yaw)) {
      p.yaw = yaw;
    }
    const mesh = p.mesh || p.rig?.root || p.rig;
    if (mesh && mesh.position) {
      mesh.visible = true;
      mesh.position.set(x, y, z);
      if (yaw !== null && Number.isFinite(yaw) && mesh.rotation) {
        mesh.rotation.y = yaw;
      }
    }
  }

  function spawnVehicleSafe(type, x, y, z, yaw = 0, opts = {}) {
    let car = null;
    // Try vehiclesExtra first if it's an extra archetype (speedboat, jetski, superbike, zentorno, chopper, rhino_tank)
    if (activeCtx?.vehiclesExtra?.spawnExtraVehicle) {
      const extraSet = new Set(['speedboat', 'jetski', 'superbike', 'chopper', 'zentorno', 'rhino_tank']);
      if (extraSet.has(type)) {
        try {
          car = activeCtx.vehiclesExtra.spawnExtraVehicle(type, x, y, z, yaw, opts);
        } catch (_) {}
      }
    }
    if (!car && activeCtx?.vehicles?.spawnVehicle) {
      try {
        car = activeCtx.vehicles.spawnVehicle(type, x, y, z, yaw, opts);
      } catch (_) {
        try {
          car = activeCtx.vehicles.spawnVehicle('obey9f', x, y, z, yaw, opts);
        } catch (__) {}
      }
    }
    if (car) {
      car.x = x;
      car.y = Number.isFinite(y) ? y : getGroundY(x, z, 0.05);
      car.z = z;
      car.yaw = yaw;
      if (car.mesh) {
        car.mesh.position.set(car.x, car.y, car.z);
        car.mesh.rotation.y = yaw;
      }
      Object.assign(car, opts);
    }
    return car;
  }

  function removeVehicleSafe(car) {
    if (!car) return;
    if (car === getPlayerVehicle()) return;
    if (car._underglowRig && car._underglowRig.parent) {
      car._underglowRig.parent.remove(car._underglowRig);
    }
    if (activeCtx?.vehicles?.removeVehicle) {
      try {
        activeCtx.vehicles.removeVehicle(car);
        return;
      } catch (_) {}
    }
    if (car.mesh?.parent) car.mesh.parent.remove(car.mesh);
    if (Array.isArray(activeCtx?.vehicles?.list)) {
      const idx = activeCtx.vehicles.list.indexOf(car);
      if (idx !== -1) activeCtx.vehicles.list.splice(idx, 1);
    }
  }

  // Non-invasive interior bounds guard:
  // If characters.js clamped a player at Bank (2100, 2100) or Casino (1200, 1200) or Túy Tiên Lâu (1500, 1500)
  // back to Động Phủ Tu Luyện (809, 809), seamlessly restore smooth interior motion without touching characters.js!
  let _interiorGuardInstalled = false;
  function installInteriorWalkGuard() {
    if (_interiorGuardInstalled || !activeCtx?.characters?.updatePlayerOnFoot) return;
    const origFn = activeCtx.characters.updatePlayerOnFoot;
    if (origFn._heistsInteriorGuarded) {
      _interiorGuardInstalled = true;
      return;
    }
    const wrapped = function guardedUpdatePlayerOnFoot(dt, ctxArg) {
      const c = ctxArg || activeCtx;
      const p = c?.player;
      const prevX = p ? p.x : 0;
      const prevZ = p ? p.z : 0;
      const wasFarInterior = Boolean(p && !p.inCar && prevX > 980 && prevZ > 980);

      const res = origFn.call(this, dt, ctxArg);

      if (wasFarInterior && p && Math.abs(p.x - 809) < 0.15 && Math.abs(prevX - 809) > 120) {
        const safeDt = clamp(Number(dt) || 0.016, 0.0005, 0.08);
        let nx = prevX + (p.vx || 0) * safeDt;
        let nz = prevZ + (p.vz || 0) * safeDt;

        if (prevX > 1850) {
          // Linh Thạch Bảo Khố Interior (2100, 0, 2100) + Vault Chamber
          const vaultUnlocked = heistState.active && heistState.id === 4 && heistState.vaultDoorOpen;
          nx = clamp(nx, 2082.8, 2117.2);
          nz = clamp(nz, vaultUnlocked ? 2074.5 : 2086.2, 2114.6);
        } else if (prevX > 1380) {
          // Túy Tiên Lâu Interior (1500, 0, 1500)
          nx = clamp(nx, 1481.5, 1518.5);
          nz = clamp(nz, 1483.5, 1516.5);
        } else {
          // Vạn Bảo Đổ Phường Interior (1200, 0, 1200) + Heist #5 Security Vault Corridor
          const inHeistCorridor =
            (heistState.active && heistState.id === 5) || (nz < 1178.5 && Math.abs(nx - 1200) < 9.5);
          if (inHeistCorridor && nz < 1177.2) {
            const minVaultZ = heistState.vaultDoorOpen ? 1143.5 : 1155.8;
            nx = clamp(nx, 1192.6, 1207.4);
            nz = clamp(nz, minVaultZ, 1222.5);
          } else {
            nx = clamp(nx, 1174.5, 1225.5);
            nz = clamp(nz, inHeistCorridor ? 1155.8 : 1177.4, 1222.6);
          }
        }

        const gy = getGroundY(nx, nz, 0.05);
        p.x = nx;
        p.z = nz;
        p.y = gy;
        p.isGrounded = true;
        p.onGround = true;
        const mesh = p.mesh || p.rig?.root || p.rig;
        if (mesh && mesh.position) {
          mesh.position.set(p.x, p.y, p.z);
        }
      }
      return res;
    };
    wrapped._heistsInteriorGuarded = true;
    activeCtx.characters.updatePlayerOnFoot = wrapped;
    _interiorGuardInstalled = true;
  }

  // --------------------------------------------------------------------------
  // 3. PROCEDURAL WEB AUDIO SYNTHESIZER (Drilling, Hacking, Race, Market, Trophy)
  // --------------------------------------------------------------------------
  const heistSFX = (() => {
    let drillNode = null;
    let drillGain = null;
    let drillFilter = null;
    let lastDrillTickAt = 0;

    function getAudioCtx() {
      const ac = activeCtx?.audio?.ctx || activeCtx?.ui?.audio?.ctx || null;
      if (ac && ac.state === 'running') return ac;
      return null;
    }

    function playTone(freq, endFreq, duration = 0.12, type = 'sine', vol = 0.14, delay = 0) {
      const ac = getAudioCtx();
      if (!ac) return;
      try {
        const t0 = ac.currentTime + delay;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(30, freq), t0);
        if (endFreq && endFreq !== freq) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), t0 + duration);
        }
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.018, duration * 0.25));
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + duration + 0.02);
      } catch (_) {}
    }

    function updateDrillLoop(active, rpm = 0, heat = 0, biting = false, overheated = false) {
      const ac = getAudioCtx();
      if (!ac || !active || rpm <= 0.04 || overheated) {
        if (drillGain && ac) {
          try {
            drillGain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.04);
          } catch (_) {}
        }
        return;
      }
      try {
        if (!drillNode) {
          drillNode = ac.createOscillator();
          drillFilter = ac.createBiquadFilter();
          drillGain = ac.createGain();
          drillNode.type = 'sawtooth';
          drillFilter.type = 'bandpass';
          drillFilter.Q.value = 3.4;
          drillGain.gain.value = 0.0001;
          drillNode.connect(drillFilter);
          drillFilter.connect(drillGain);
          drillGain.connect(ac.destination);
          drillNode.start();
        }
        const baseFreq = 95 + rpm * 215 + (biting ? 58 + Math.sin(performance.now() * 0.09) * 22 : 0);
        drillNode.frequency.setTargetAtTime(baseFreq, ac.currentTime, 0.03);
        drillFilter.frequency.setTargetAtTime(biting ? 980 + heat * 900 : 520, ac.currentTime, 0.04);
        drillGain.gain.setTargetAtTime(clamp(rpm * (biting ? 0.13 : 0.065), 0.001, 0.16), ac.currentTime, 0.03);

        const nowMs = performance.now();
        if (biting && nowMs - lastDrillTickAt > 95) {
          lastDrillTickAt = nowMs;
          playTone(1450 + Math.random() * 650, 620, 0.045, 'triangle', 0.05);
        }
      } catch (_) {}
    }

    function stopDrillLoop() {
      updateDrillLoop(false, 0, 0, false, false);
    }

    function playPinBreak(pinIndex = 1) {
      playTone(540 + pinIndex * 95, 1180 + pinIndex * 110, 0.14, 'triangle', 0.18, 0);
      playTone(880 + pinIndex * 120, 1620, 0.18, 'sine', 0.14, 0.08);
    }

    function playOverheatAlarm() {
      playTone(680, 420, 0.18, 'sawtooth', 0.16, 0);
      playTone(680, 420, 0.18, 'sawtooth', 0.16, 0.20);
      playTone(520, 260, 0.26, 'square', 0.14, 0.40);
    }

    function playHackClick(pitch = 1.0) {
      playTone(720 * pitch, 960 * pitch, 0.055, 'sine', 0.10, 0);
    }

    function playHackSuccess() {
      playTone(523.25, 523.25, 0.12, 'triangle', 0.16, 0);
      playTone(659.25, 659.25, 0.12, 'triangle', 0.16, 0.09);
      playTone(783.99, 783.99, 0.14, 'triangle', 0.17, 0.18);
      playTone(1046.5, 1046.5, 0.34, 'sine', 0.20, 0.28);
    }

    function playHackError() {
      playTone(260, 180, 0.18, 'sawtooth', 0.16, 0);
      playTone(210, 145, 0.24, 'sawtooth', 0.16, 0.15);
    }

    function playVaultOpen() {
      playTone(92, 48, 0.85, 'sawtooth', 0.20, 0);
      playTone(184, 138, 0.55, 'triangle', 0.14, 0.12);
    }

    function playCountdownBeep(isGo = false) {
      if (isGo) {
        playTone(880, 1174.66, 0.42, 'sawtooth', 0.20, 0);
        playTone(440, 587.33, 0.42, 'triangle', 0.18, 0);
      } else {
        playTone(440, 440, 0.17, 'square', 0.14, 0);
      }
    }

    function playCheckpoint(isFinal = false) {
      if (isFinal) {
        playTone(587.33, 880, 0.14, 'triangle', 0.18, 0);
        playTone(880, 1174.66, 0.28, 'sine', 0.20, 0.10);
      } else {
        playTone(660, 990, 0.11, 'sine', 0.14, 0);
      }
    }

    function playStockTrade(isBuy = true) {
      if (isBuy) {
        playTone(640, 960, 0.11, 'triangle', 0.14, 0);
        playTone(960, 1280, 0.16, 'sine', 0.14, 0.08);
      } else {
        playTone(880, 1320, 0.12, 'sine', 0.15, 0);
        playTone(1320, 1760, 0.20, 'triangle', 0.14, 0.09);
      }
    }

    function playTrophyFanfare(tier = 'gold') {
      const mult = tier === 'platinum' ? 1.25 : tier === 'gold' ? 1.12 : 1.0;
      playTone(523.25 * mult, 523.25 * mult, 0.14, 'triangle', 0.16, 0);
      playTone(659.25 * mult, 659.25 * mult, 0.14, 'triangle', 0.16, 0.11);
      playTone(783.99 * mult, 783.99 * mult, 0.16, 'triangle', 0.17, 0.22);
      playTone(1046.5 * mult, 1046.5 * mult, 0.45, 'sine', 0.22, 0.34);
    }

    return {
      updateDrillLoop,
      stopDrillLoop,
      playPinBreak,
      playOverheatAlarm,
      playHackClick,
      playHackSuccess,
      playHackError,
      playVaultOpen,
      playCountdownBeep,
      playCheckpoint,
      playStockTrade,
      playTrophyFanfare
    };
  })();

  // --------------------------------------------------------------------------
  // 4. SCOPED CSS & HIGH-DPI DOM SHELL (Strictly display:none when inactive!)
  // --------------------------------------------------------------------------
  const domRefs = {
    ready: false,
    hackModal: null,
    hackTitle: null,
    hackSub: null,
    hackTimerBadge: null,
    hackCanvas: null,
    hackControlsBar: null,
    hackCloseBtn: null,
    bawsaqModal: null,
    bawsaqCash: null,
    bawsaqNetWorth: null,
    bawsaqPnL: null,
    bawsaqNewsTicker: null,
    bawsaqTickerList: null,
    bawsaqSelectedHeader: null,
    bawsaqChartCanvas: null,
    bawsaqOrderPanel: null,
    bawsaqLedgerBody: null,
    achModal: null,
    achSummaryBar: null,
    achCategoryTabs: null,
    achGrid: null,
    hubModal: null,
    hubBody: null,
    raceHud: null,
    raceCountdown: null,
    racePosVal: null,
    raceLapVal: null,
    raceCpVal: null,
    raceTimeVal: null,
    raceBestVal: null,
    raceStandings: null,
    heistHud: null,
    heistHudTitle: null,
    heistHudLoot: null,
    heistHudExtraLabel: null,
    heistHudExtraFill: null,
    heistHudSub: null,
    trophyStack: null
  };

  function ensureHeistsDOM() {
    if (domRefs.ready || typeof document === 'undefined' || !document.body) return;
    domRefs.ready = true;

    if (!document.getElementById('gta-heists-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'gta-heists-styles';
      styleEl.textContent = `
        .gta-ha-overlay {
          position: fixed;
          inset: 0;
          z-index: 9400;
          display: none;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at center, rgba(9, 14, 24, 0.86), rgba(3, 6, 12, 0.95));
          backdrop-filter: blur(8px);
          font-family: 'Segoe UI', Roboto, system-ui, sans-serif;
          color: #f1f5f9;
          user-select: none;
        }
        .gta-ha-overlay.open {
          display: flex;
        }
        .gta-ha-panel {
          width: min(1120px, 95vw);
          max-height: 91vh;
          background: linear-gradient(165deg, rgba(15, 23, 38, 0.98), rgba(8, 13, 23, 0.99));
          border: 1px solid rgba(56, 189, 248, 0.35);
          border-radius: 16px;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.78), 0 0 36px rgba(14, 165, 233, 0.16);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .gta-ha-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: linear-gradient(90deg, rgba(16, 32, 56, 0.95), rgba(12, 20, 36, 0.95));
          border-bottom: 1px solid rgba(148, 163, 184, 0.18);
          gap: 12px;
        }
        .gta-ha-title-wrap h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 0.6px;
          color: #f8fafc;
          text-transform: uppercase;
        }
        .gta-ha-title-wrap p {
          margin: 3px 0 0;
          font-size: 12.5px;
          color: #94a3b8;
        }
        .gta-ha-close-btn {
          background: rgba(239, 68, 68, 0.16);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.42);
          border-radius: 8px;
          padding: 7px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .gta-ha-close-btn:hover {
          background: rgba(239, 68, 68, 0.34);
          color: #fff;
        }
        /* Hacking & Vault Drill Canvas Modal */
        #gta-heist-hack-panel {
          width: min(940px, 95vw);
          border-color: rgba(34, 211, 238, 0.48);
        }
        .gta-hack-canvas-wrap {
          position: relative;
          width: 100%;
          background: #050a12;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 10px;
          box-sizing: border-box;
        }
        #gta-heist-hack-canvas {
          width: 100%;
          max-width: 896px;
          height: auto;
          aspect-ratio: 16 / 9;
          border-radius: 10px;
          border: 1px solid rgba(56, 189, 248, 0.28);
          cursor: crosshair;
          touch-action: none;
        }
        .gta-hack-timer-pill {
          padding: 6px 14px;
          border-radius: 999px;
          font-weight: 800;
          font-size: 15px;
          font-variant-numeric: tabular-nums;
          background: rgba(16, 185, 129, 0.16);
          border: 1px solid rgba(16, 185, 129, 0.5);
          color: #34d399;
        }
        .gta-hack-timer-pill.urgent {
          background: rgba(239, 68, 68, 0.22);
          border-color: #ef4444;
          color: #fecaca;
          animation: gtaHaPulse 0.6s infinite alternate;
        }
        .gta-hack-controls-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 11px 18px;
          background: rgba(9, 15, 26, 0.96);
          border-top: 1px solid rgba(148, 163, 184, 0.16);
          font-size: 12.5px;
          color: #cbd5e1;
        }
        .gta-ha-btn {
          background: linear-gradient(180deg, #0ea5e9, #0284c7);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.1s ease, filter 0.15s ease;
        }
        .gta-ha-btn:hover { filter: brightness(1.14); }
        .gta-ha-btn:active { transform: scale(0.97); }
        .gta-ha-btn.gold { background: linear-gradient(180deg, #f59e0b, #d97706); color: #0f172a; }
        .gta-ha-btn.green { background: linear-gradient(180deg, #10b981, #059669); }
        .gta-ha-btn.red { background: linear-gradient(180deg, #ef4444, #b91c1c); }
        .gta-ha-btn.purple { background: linear-gradient(180deg, #a855f7, #7e22ce); }
        .gta-ha-btn.ghost {
          background: rgba(30, 41, 59, 0.85);
          border: 1px solid rgba(148, 163, 184, 0.3);
          color: #e2e8f0;
        }
        /* Vạn Thương Linh Các Dynamic Vạn Thương Linh Các Portal */
        .gta-bawsaq-topbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 14px;
          padding: 10px 20px;
          background: rgba(6, 18, 16, 0.92);
          border-bottom: 1px solid rgba(16, 185, 129, 0.26);
        }
        .gta-bawsaq-kpi {
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
        }
        .gta-bawsaq-kpi strong {
          display: block;
          font-size: 15px;
          color: #f8fafc;
          font-variant-numeric: tabular-nums;
        }
        .gta-bawsaq-news {
          flex: 1;
          min-width: 240px;
          background: rgba(245, 158, 11, 0.11);
          border: 1px solid rgba(245, 158, 11, 0.35);
          border-radius: 8px;
          padding: 7px 12px;
          font-size: 12.5px;
          color: #fde68a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .gta-bawsaq-body {
          display: grid;
          grid-template-columns: 300px 1fr 285px;
          gap: 0;
          min-height: 500px;
          max-height: calc(91vh - 130px);
          overflow: hidden;
        }
        @media (max-width: 960px) {
          .gta-bawsaq-body {
            grid-template-columns: 1fr;
            overflow-y: auto;
          }
        }
        .gta-bawsaq-sidebar {
          border-right: 1px solid rgba(148, 163, 184, 0.16);
          overflow-y: auto;
          background: rgba(9, 14, 24, 0.9);
        }
        .gta-stock-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 13px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.09);
          cursor: pointer;
          transition: background 0.12s ease;
        }
        .gta-stock-row:hover { background: rgba(30, 41, 59, 0.65); }
        .gta-stock-row.active {
          background: linear-gradient(90deg, rgba(16, 185, 129, 0.22), rgba(15, 23, 42, 0.6));
          border-left: 3px solid #10b981;
        }
        .gta-stock-sym {
          font-weight: 800;
          font-size: 13.5px;
          color: #f8fafc;
        }
        .gta-stock-name {
          font-size: 11px;
          color: #94a3b8;
        }
        .gta-stock-price-col {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .gta-stock-chg.up { color: #34d399; font-weight: 700; font-size: 11.5px; }
        .gta-stock-chg.down { color: #f87171; font-weight: 700; font-size: 11.5px; }
        .gta-bawsaq-center {
          display: flex;
          flex-direction: column;
          padding: 12px 16px;
          overflow-y: auto;
          gap: 10px;
        }
        #gta-bawsaq-chart-canvas {
          width: 100%;
          height: 295px;
          background: #060b14;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          cursor: crosshair;
        }
        .gta-bawsaq-order-col {
          border-left: 1px solid rgba(148, 163, 184, 0.16);
          padding: 14px;
          background: rgba(11, 17, 29, 0.94);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        /* Thành Tựu Võ Lâm & Hub Grid */
        .gta-ach-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          padding: 10px 20px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.15);
          background: rgba(10, 16, 28, 0.9);
        }
        .gta-ach-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(265px, 1fr));
          gap: 11px;
          padding: 16px 20px;
          overflow-y: auto;
          max-height: calc(91vh - 155px);
        }
        .gta-ach-card {
          background: rgba(17, 25, 40, 0.88);
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 11px;
          padding: 12px;
          display: flex;
          gap: 11px;
          align-items: flex-start;
        }
        .gta-ach-card.unlocked {
          border-color: rgba(245, 158, 11, 0.58);
          background: linear-gradient(145deg, rgba(42, 31, 12, 0.62), rgba(15, 23, 42, 0.92));
        }
        .gta-ach-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          background: rgba(30, 41, 59, 0.9);
          flex-shrink: 0;
        }
        .gta-ach-card.unlocked .gta-ach-icon {
          background: linear-gradient(135deg, #fbbf24, #d97706);
          box-shadow: 0 0 14px rgba(245, 158, 11, 0.45);
        }
        .gta-ach-prog-bar {
          height: 5px;
          background: rgba(51, 65, 85, 0.8);
          border-radius: 999px;
          overflow: hidden;
          margin-top: 7px;
        }
        .gta-ach-prog-fill {
          height: 100%;
          background: linear-gradient(90deg, #38bdf8, #fbbf24);
        }
        /* Đua Đêm Giang Hồ Live HUD */
        #gta-race-hud {
          position: fixed;
          top: 84px;
          left: 22px;
          z-index: 6200;
          display: none;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
          font-family: 'Segoe UI', Roboto, sans-serif;
        }
        #gta-race-hud.visible { display: flex; }
        .gta-race-card {
          background: linear-gradient(135deg, rgba(14, 10, 30, 0.9), rgba(28, 12, 54, 0.86));
          border: 1px solid rgba(192, 132, 252, 0.55);
          border-left: 4px solid #e879f9;
          border-radius: 11px;
          padding: 10px 15px;
          color: #f8fafc;
          min-width: 235px;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
        }
        .gta-race-pos-big {
          font-size: 32px;
          font-weight: 900;
          font-style: italic;
          color: #f0abfc;
          line-height: 1;
        }
        #gta-race-countdown {
          position: fixed;
          top: 26%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 7500;
          display: none;
          font-size: 74px;
          font-weight: 900;
          font-style: italic;
          letter-spacing: 3px;
          color: #fde047;
          text-shadow: 0 0 32px rgba(232, 121, 249, 0.95), 0 6px 18px #000;
          pointer-events: none;
        }
        #gta-race-countdown.visible { display: block; }
        /* Heist Live Bag / Intimidation / Nerve-Gas HUD */
        #gta-heist-hud {
          position: fixed;
          top: 90px;
          left: 22px;
          z-index: 6200;
          display: none;
          flex-direction: column;
          gap: 6px;
          min-width: 260px;
          background: linear-gradient(145deg, rgba(8, 20, 28, 0.9), rgba(15, 23, 42, 0.88));
          border: 1px solid rgba(52, 211, 153, 0.5);
          border-left: 4px solid #10b981;
          border-radius: 11px;
          padding: 11px 15px;
          color: #f8fafc;
          pointer-events: none;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
        }
        #gta-heist-hud.visible { display: flex; }
        /* Trophy Toast Stack */
        #gta-trophy-toast-stack {
          position: fixed;
          top: 18px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9700;
          display: none;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
        }
        #gta-trophy-toast-stack.has-items { display: flex; }
        .gta-trophy-toast {
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, rgba(24, 20, 10, 0.96), rgba(12, 16, 26, 0.96));
          border: 1.5px solid #fbbf24;
          border-radius: 999px;
          padding: 9px 20px 9px 11px;
          color: #fef3c7;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.72), 0 0 24px rgba(251, 191, 36, 0.35);
          animation: gtaTrophyPop 0.38s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        }
        @keyframes gtaTrophyPop {
          from { transform: translateY(-28px) scale(0.86); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes gtaHaPulse {
          from { transform: scale(1); }
          to { transform: scale(1.05); }
        }
      `;
      document.head.appendChild(styleEl);
    }

    // 1. Interactive Heist Hacking & Thermal Vault Drilling Modal
    let hackModal = document.getElementById('gta-heist-hack-modal');
    if (!hackModal) {
      hackModal = document.createElement('div');
      hackModal.id = 'gta-heist-hack-modal';
      hackModal.className = 'gta-ha-overlay';
      hackModal.innerHTML = `
        <div id="gta-heist-hack-panel" class="gta-ha-panel">
          <div class="gta-ha-header">
            <div class="gta-ha-title-wrap">
              <h2 id="gta-hack-title">KHOAN NHIỆT LASER KHO TIỀN</h2>
              <p id="gta-hack-sub">Điều chỉnh lực ép mũi khoan trong vùng xanh và tránh quá nhiệt 100%!</p>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span id="gta-hack-timer-badge" class="gta-hack-timer-pill">00:45.0</span>
              <button id="gta-hack-close-btn" type="button" class="gta-ha-close-btn">✕ Tạm Rời [Esc]</button>
            </div>
          </div>
          <div class="gta-hack-canvas-wrap">
            <canvas id="gta-heist-hack-canvas" width="960" height="540"></canvas>
          </div>
          <div id="gta-hack-controls-bar" class="gta-hack-controls-bar"></div>
        </div>
      `;
      document.body.appendChild(hackModal);
    }
    domRefs.hackModal = hackModal;
    domRefs.hackTitle = document.getElementById('gta-hack-title');
    domRefs.hackSub = document.getElementById('gta-hack-sub');
    domRefs.hackTimerBadge = document.getElementById('gta-hack-timer-badge');
    domRefs.hackCanvas = document.getElementById('gta-heist-hack-canvas');
    domRefs.hackControlsBar = document.getElementById('gta-hack-controls-bar');
    domRefs.hackCloseBtn = document.getElementById('gta-hack-close-btn');

    // 2. Vạn Thương Linh Các Dynamic Vạn Thương Linh Các Portal
    let bawsaqModal = document.getElementById('gta-bawsaq-modal');
    if (!bawsaqModal) {
      bawsaqModal = document.createElement('div');
      bawsaqModal.id = 'gta-bawsaq-modal';
      bawsaqModal.className = 'gta-ha-overlay';
      bawsaqModal.innerHTML = `
        <div class="gta-ha-panel" style="border-color:rgba(16,185,129,0.45);">
          <div class="gta-ha-header">
            <div class="gta-ha-title-wrap">
              <h2 style="color:#34d399;">📈 SÀN CHỨNG KHOÁN ĐỘNG Vạn Thương Linh Các • LOS SANTOS</h2>
              <p>Biến động thời gian thực theo hỗn loạn đường phố, đua xe ngầm &amp; các đại phi vụ ngân hàng / sòng bạc!</p>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <button id="gta-bawsaq-open-ach-btn" type="button" class="gta-ha-btn gold">🏆 Thành Tựu</button>
              <button id="gta-bawsaq-close-btn" type="button" class="gta-ha-close-btn">✕ Đóng Sàn [Esc]</button>
            </div>
          </div>
          <div class="gta-bawsaq-topbar">
            <div class="gta-bawsaq-kpi">Tiền Mặt Khả Dụng<strong id="gta-bawsaq-cash">$0</strong></div>
            <div class="gta-bawsaq-kpi">Tổng Tài Sản Cổ Phiếu<strong id="gta-bawsaq-networth">$0</strong></div>
            <div class="gta-bawsaq-kpi">Lãi / Lỗ Danh Mục<strong id="gta-bawsaq-pnl">+$0 (0.0%)</strong></div>
            <div id="gta-bawsaq-news-ticker" class="gta-bawsaq-news">📰 Vạn Thương Linh Các LIVE: Thị trường mở cửa sôi động tại Trung tâm Tài chính Pillbox...</div>
          </div>
          <div class="gta-bawsaq-body">
            <div id="gta-bawsaq-ticker-list" class="gta-bawsaq-sidebar"></div>
            <div class="gta-bawsaq-center">
              <div id="gta-bawsaq-selected-header"></div>
              <canvas id="gta-bawsaq-chart-canvas" width="680" height="320"></canvas>
              <div id="gta-bawsaq-ledger-body" style="font-size:12px;color:#94a3b8;"></div>
            </div>
            <div id="gta-bawsaq-order-panel" class="gta-bawsaq-order-col"></div>
          </div>
        </div>
      `;
      document.body.appendChild(bawsaqModal);
    }
    domRefs.bawsaqModal = bawsaqModal;
    domRefs.bawsaqCash = document.getElementById('gta-bawsaq-cash');
    domRefs.bawsaqNetWorth = document.getElementById('gta-bawsaq-networth');
    domRefs.bawsaqPnL = document.getElementById('gta-bawsaq-pnl');
    domRefs.bawsaqNewsTicker = document.getElementById('gta-bawsaq-news-ticker');
    domRefs.bawsaqTickerList = document.getElementById('gta-bawsaq-ticker-list');
    domRefs.bawsaqSelectedHeader = document.getElementById('gta-bawsaq-selected-header');
    domRefs.bawsaqChartCanvas = document.getElementById('gta-bawsaq-chart-canvas');
    domRefs.bawsaqOrderPanel = document.getElementById('gta-bawsaq-order-panel');
    domRefs.bawsaqLedgerBody = document.getElementById('gta-bawsaq-ledger-body');

    // 3. 40 In-Game Thành Tựu Võ Lâm Modal
    let achModal = document.getElementById('gta-achievements-modal');
    if (!achModal) {
      achModal = document.createElement('div');
      achModal.id = 'gta-achievements-modal';
      achModal.className = 'gta-ha-overlay';
      achModal.innerHTML = `
        <div class="gta-ha-panel" style="border-color:rgba(251,191,36,0.45);">
          <div class="gta-ha-header">
            <div class="gta-ha-title-wrap">
              <h2 style="color:#fbbf24;">🏆 HỆ THỐNG 40 THÀNH TỰU &amp; TIẾN TRÌNH HUYỀN THOẠI</h2>
              <p id="gta-ach-summary-bar">Đã mở khóa 0 / 40 Cúp Danh Giá • Tổng thưởng thành tựu: $0</p>
            </div>
            <div style="display:flex;gap:8px;">
              <button id="gta-ach-open-hub-btn" type="button" class="gta-ha-btn purple">🏦 Trung Tâm Phi Vụ</button>
              <button id="gta-ach-close-btn" type="button" class="gta-ha-close-btn">✕ Đóng [Esc]</button>
            </div>
          </div>
          <div id="gta-ach-category-tabs" class="gta-ach-tabs"></div>
          <div id="gta-ach-grid" class="gta-ach-grid"></div>
        </div>
      `;
      document.body.appendChild(achModal);
    }
    domRefs.achModal = achModal;
    domRefs.achSummaryBar = document.getElementById('gta-ach-summary-bar');
    domRefs.achCategoryTabs = document.getElementById('gta-ach-category-tabs');
    domRefs.achGrid = document.getElementById('gta-ach-grid');

    // 4. Unified Đại Kiếp Bảo Khố, Midnight Street Racing & Truy Nã Hunter Command Hub Modal
    let hubModal = document.getElementById('gta-activity-hub-modal');
    if (!hubModal) {
      hubModal = document.createElement('div');
      hubModal.id = 'gta-activity-hub-modal';
      hubModal.className = 'gta-ha-overlay';
      hubModal.innerHTML = `
        <div class="gta-ha-panel" style="border-color:rgba(192,132,252,0.5);">
          <div class="gta-ha-header">
            <div class="gta-ha-title-wrap">
              <h2 style="color:#e879f9;">🏦 TRUNG TÂM ĐẠI PHI VỤ • ĐUA XE ĐÊM • SĂN TIỀN THƯỞNG</h2>
              <p>Khởi động ngay Phi Vụ Ngân Hàng, Hầm Ngầm Casino, 5 Giải Đua Đêm Neon ($1K–$25K) &amp; 5 Lệnh Truy Nã!</p>
            </div>
            <div style="display:flex;gap:8px;">
              <button id="gta-hub-stocks-btn" type="button" class="gta-ha-btn green">📈 Vạn Thương Linh Các</button>
              <button id="gta-hub-ach-btn" type="button" class="gta-ha-btn gold">🏆 40 Thành Tựu</button>
              <button id="gta-hub-close-btn" type="button" class="gta-ha-close-btn">✕ Đóng [Esc]</button>
            </div>
          </div>
          <div id="gta-activity-hub-body" style="padding:18px 20px;overflow-y:auto;max-height:calc(91vh - 80px);"></div>
        </div>
      `;
      document.body.appendChild(hubModal);
    }
    domRefs.hubModal = hubModal;
    domRefs.hubBody = document.getElementById('gta-activity-hub-body');

    // 5. Đua Đêm Giang Hồ HUD & Countdown
    let raceHud = document.getElementById('gta-race-hud');
    if (!raceHud) {
      raceHud = document.createElement('div');
      raceHud.id = 'gta-race-hud';
      raceHud.innerHTML = `
        <div class="gta-race-card">
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;">
            <span id="gta-race-pos-val" class="gta-race-pos-big">1st / 6</span>
            <span id="gta-race-lap-val" style="font-weight:800;color:#38bdf8;font-size:14px;">VÒNG 1/2</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:12.5px;color:#cbd5e1;">
            <span id="gta-race-cp-val">Cổng 1/10</span>
            <span id="gta-race-time-val" style="font-variant-numeric:tabular-nums;font-weight:700;color:#fde047;">00:00.00</span>
          </div>
          <div id="gta-race-best-val" style="font-size:11px;color:#94a3b8;margin-top:3px;">Cược: $5,000 • Thưởng Hạng 1: $12,500</div>
          <div id="gta-race-standings" style="margin-top:8px;padding-top:7px;border-top:1px solid rgba(192,132,252,0.25);font-size:11.5px;line-height:1.45;"></div>
        </div>
      `;
      document.body.appendChild(raceHud);
    }
    domRefs.raceHud = raceHud;
    domRefs.racePosVal = document.getElementById('gta-race-pos-val');
    domRefs.raceLapVal = document.getElementById('gta-race-lap-val');
    domRefs.raceCpVal = document.getElementById('gta-race-cp-val');
    domRefs.raceTimeVal = document.getElementById('gta-race-time-val');
    domRefs.raceBestVal = document.getElementById('gta-race-best-val');
    domRefs.raceStandings = document.getElementById('gta-race-standings');

    let raceCountdown = document.getElementById('gta-race-countdown');
    if (!raceCountdown) {
      raceCountdown = document.createElement('div');
      raceCountdown.id = 'gta-race-countdown';
      document.body.appendChild(raceCountdown);
    }
    domRefs.raceCountdown = raceCountdown;

    // 6. Grand Heist Live Loot & Threat Meter HUD
    let heistHud = document.getElementById('gta-heist-hud');
    if (!heistHud) {
      heistHud = document.createElement('div');
      heistHud.id = 'gta-heist-hud';
      heistHud.innerHTML = `
        <div id="gta-heist-hud-title" style="font-size:12px;font-weight:800;letter-spacing:0.6px;color:#34d399;text-transform:uppercase;">ĐẠI PHI VỤ</div>
        <div id="gta-heist-hud-loot" style="font-size:22px;font-weight:900;color:#fde047;font-variant-numeric:tabular-nums;">🎒 $0 / $65,000</div>
        <div id="gta-heist-hud-extra-label" style="font-size:11.5px;color:#cbd5e1;">Khống chế sảnh: 100%</div>
        <div style="height:6px;background:rgba(51,65,85,0.85);border-radius:999px;overflow:hidden;">
          <div id="gta-heist-hud-extra-fill" style="height:100%;width:100%;background:linear-gradient(90deg,#10b981,#38bdf8);transition:width 0.12s linear;"></div>
        </div>
        <div id="gta-heist-hud-sub" style="font-size:11px;color:#94a3b8;">Giai đoạn 1/3</div>
      `;
      document.body.appendChild(heistHud);
    }
    domRefs.heistHud = heistHud;
    domRefs.heistHudTitle = document.getElementById('gta-heist-hud-title');
    domRefs.heistHudLoot = document.getElementById('gta-heist-hud-loot');
    domRefs.heistHudExtraLabel = document.getElementById('gta-heist-hud-extra-label');
    domRefs.heistHudExtraFill = document.getElementById('gta-heist-hud-extra-fill');
    domRefs.heistHudSub = document.getElementById('gta-heist-hud-sub');

    // 7. Animated Trophy Unlock Toast Stack
    let trophyStack = document.getElementById('gta-trophy-toast-stack');
    if (!trophyStack) {
      trophyStack = document.createElement('div');
      trophyStack.id = 'gta-trophy-toast-stack';
      document.body.appendChild(trophyStack);
    }
    domRefs.trophyStack = trophyStack;

    // Bind modal header buttons
    domRefs.hackCloseBtn?.addEventListener('click', () => closeHackMinigame(false));
    document.getElementById('gta-bawsaq-close-btn')?.addEventListener('click', () => closeStockMarket());
    document.getElementById('gta-bawsaq-open-ach-btn')?.addEventListener('click', () => {
      closeStockMarket();
      openAchievements();
    });
    document.getElementById('gta-ach-close-btn')?.addEventListener('click', () => closeAchievements());
    document.getElementById('gta-ach-open-hub-btn')?.addEventListener('click', () => {
      closeAchievements();
      openActivityHub();
    });
    document.getElementById('gta-hub-close-btn')?.addEventListener('click', () => closeActivityHub());
    document.getElementById('gta-hub-stocks-btn')?.addEventListener('click', () => {
      closeActivityHub();
      openStockMarket();
    });
    document.getElementById('gta-hub-ach-btn')?.addEventListener('click', () => {
      closeActivityHub();
      openAchievements();
    });
  }

  // --------------------------------------------------------------------------
  // 5. SHARED 3D PROPS, GLOWING CORONAS, RACE ARCHES & NEON UNDERGLOW BUILDERS
  // --------------------------------------------------------------------------
  const geoPool = {
    coronaCyl: new THREE.CylinderGeometry(1.55, 1.55, 3.6, 28, 1, true),
    coronaRing: new THREE.RingGeometry(1.18, 1.66, 32),
    smallRing: new THREE.RingGeometry(0.75, 1.08, 24),
    checkeredSeg: new THREE.RingGeometry(1.68, 2.08, 24),
    archPillar: new THREE.CylinderGeometry(0.24, 0.30, 7.6, 12),
    archTopTorus: new THREE.TorusGeometry(6.2, 0.24, 10, 28, Math.PI),
    chevronBar: new THREE.BoxGeometry(0.22, 0.16, 1.45),
    goldBar: new THREE.BoxGeometry(0.26, 0.09, 0.13),
    cashStack: new THREE.BoxGeometry(0.30, 0.12, 0.18),
    cartFrame: new THREE.BoxGeometry(1.36, 0.12, 0.86),
    cartLeg: new THREE.CylinderGeometry(0.04, 0.04, 0.72, 8),
    laserBeam: new THREE.CylinderGeometry(0.018, 0.018, 1.0, 8),
    underglowPlane: new THREE.PlaneGeometry(2.35, 4.75),
    nitroCone: new THREE.ConeGeometry(0.14, 0.95, 10, 1, true),
    diamondOcta: new THREE.OctahedronGeometry(0.24, 1)
  };
  geoPool.coronaRing.rotateX(-Math.PI / 2);
  geoPool.smallRing.rotateX(-Math.PI / 2);
  geoPool.checkeredSeg.rotateX(-Math.PI / 2);
  geoPool.laserBeam.rotateZ(Math.PI / 2);
  geoPool.underglowPlane.rotateX(-Math.PI / 2);
  geoPool.nitroCone.rotateX(-Math.PI / 2);

  const matPool = {
    goldBullion: new THREE.MeshStandardMaterial({
      color: 0xffcf40,
      metalness: 0.92,
      roughness: 0.16,
      emissive: 0x5c3f00,
      emissiveIntensity: 0.28
    }),
    cashBundle: new THREE.MeshStandardMaterial({
      color: 0x2ebd59,
      metalness: 0.08,
      roughness: 0.55,
      emissive: 0x0b3d1b,
      emissiveIntensity: 0.28
    }),
    diamondCrystal: new THREE.MeshPhysicalMaterial({
      color: 0xbaf2ff,
      metalness: 0.12,
      roughness: 0.04,
      transmission: 0.55,
      transparent: true,
      opacity: 0.9,
      emissive: 0x22a6f5,
      emissiveIntensity: 0.45
    }),
    darkSteel: new THREE.MeshStandardMaterial({
      color: 0x222933,
      metalness: 0.82,
      roughness: 0.28
    }),
    hazardAmber: new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.35,
      roughness: 0.38,
      emissive: 0x6b3c00,
      emissiveIntensity: 0.35
    }),
    laserRed: new THREE.MeshBasicMaterial({
      color: 0xff1e38,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }),
    gasGreen: new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    nitroBlue: new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  };

  function createCheckeredCanvasTexture(primaryHex = '#c026d3', secondaryHex = '#1e1b4b') {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g = c.getContext('2d');
    if (!g) return null;
    const sq = 16;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        g.fillStyle = (x + y) % 2 === 0 ? primaryHex : secondaryHex;
        g.fillRect(x * sq, y * sq, sq, sq);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  function createFloatingSignSprite(titleText, subText, accentHex = '#38bdf8') {
    if (typeof document === 'undefined') return new THREE.Group();
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 144;
    const g = c.getContext('2d');
    if (g) {
      g.fillStyle = 'rgba(7, 12, 22, 0.86)';
      g.strokeStyle = accentHex;
      g.lineWidth = 4;
      g.beginPath();
      if (g.roundRect) g.roundRect(8, 8, 496, 128, 22);
      else g.rect(8, 8, 496, 128);
      g.fill();
      g.stroke();

      g.textAlign = 'center';
      g.fillStyle = accentHex;
      g.font = '900 28px Segoe UI, sans-serif';
      g.fillText(titleText, 256, 58, 468);

      g.fillStyle = '#f1f5f9';
      g.font = '700 21px Segoe UI, sans-serif';
      g.fillText(subText, 256, 102, 468);
    }
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false
    });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(4.6, 1.3, 1);
    return sp;
  }

  function createWorldCorona3D(colorHex, titleText, subText, checkered = false) {
    const grp = new THREE.Group();
    const cylMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const cyl = new THREE.Mesh(geoPool.coronaCyl, cylMat);
    cyl.position.y = 1.8;
    const ring = new THREE.Mesh(geoPool.coronaRing, ringMat);
    ring.position.y = 0.05;
    grp.add(cyl, ring);

    if (checkered) {
      const chkTex = createCheckeredCanvasTexture('#f0abfc', '#2e1065');
      const chkMat = new THREE.MeshBasicMaterial({
        map: chkTex,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const chkMesh = new THREE.Mesh(geoPool.checkeredSeg, chkMat);
      chkMesh.position.y = 0.06;
      grp.add(chkMesh);
      grp.userData.chkMesh = chkMesh;
    }

    if (titleText) {
      const hexStr = '#' + new THREE.Color(colorHex).getHexString();
      const label = createFloatingSignSprite(titleText, subText || '', hexStr);
      label.position.y = 3.85;
      grp.add(label);
      grp.userData.labelSprite = label;
    }

    grp.userData.ring = ring;
    grp.userData.cyl = cyl;
    return grp;
  }

  function createLootCartMesh(lootKind = 'gold') {
    const grp = new THREE.Group();
    const frame = new THREE.Mesh(geoPool.cartFrame, matPool.darkSteel);
    frame.position.y = 0.72;
    grp.add(frame);

    for (const sx of [-0.58, 0.58]) {
      for (const sz of [-0.34, 0.34]) {
        const leg = new THREE.Mesh(geoPool.cartLeg, matPool.darkSteel);
        leg.position.set(sx, 0.36, sz);
        grp.add(leg);
      }
    }

    const itemsGroup = new THREE.Group();
    itemsGroup.position.y = 0.80;
    if (lootKind === 'diamonds') {
      for (let r = -1; r <= 1; r++) {
        for (let c = -1; c <= 1; c++) {
          const gem = new THREE.Mesh(geoPool.diamondOcta, matPool.diamondCrystal);
          gem.position.set(c * 0.34, 0.16, r * 0.22);
          itemsGroup.add(gem);
        }
      }
    } else {
      const barGeo = lootKind === 'cash' ? geoPool.cashStack : geoPool.goldBar;
      const barMat = lootKind === 'cash' ? matPool.cashBundle : matPool.goldBullion;
      for (let layer = 0; layer < 2; layer++) {
        for (let ix = -1; ix <= 1; ix++) {
          for (let iz = -1; iz <= 1; iz++) {
            const bar = new THREE.Mesh(barGeo, barMat);
            bar.position.set(ix * 0.34, layer * 0.11 + 0.05, iz * 0.20);
            itemsGroup.add(bar);
          }
        }
      }
    }
    grp.add(itemsGroup);

    const glowRing = new THREE.Mesh(
      geoPool.smallRing,
      new THREE.MeshBasicMaterial({
        color: lootKind === 'diamonds' ? 0x38bdf8 : 0xfbbf24,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    glowRing.position.y = 0.04;
    grp.add(glowRing);

    grp.userData.itemsGroup = itemsGroup;
    grp.userData.glowRing = glowRing;
    return grp;
  }

  function attachRacerUnderglowAndAero(car, neonHex = 0x00f5ff) {
    if (!car || !car.mesh) return null;
    const parentNode = car.chassis || car.mesh;
    if (car._underglowRig && car._underglowRig.parent) {
      car._underglowRig.parent.remove(car._underglowRig);
    }

    const rig = new THREE.Group();
    const glowCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    let glowTex = null;
    if (glowCanvas) {
      glowCanvas.width = 128;
      glowCanvas.height = 256;
      const g = glowCanvas.getContext('2d');
      if (g) {
        const col = new THREE.Color(neonHex);
        const rgb = `${Math.round(col.r * 255)}, ${Math.round(col.g * 255)}, ${Math.round(col.b * 255)}`;
        const grad = g.createRadialGradient(64, 128, 12, 64, 128, 118);
        grad.addColorStop(0, `rgba(${rgb}, 0.95)`);
        grad.addColorStop(0.55, `rgba(${rgb}, 0.48)`);
        grad.addColorStop(1, `rgba(${rgb}, 0.0)`);
        g.fillStyle = grad;
        g.fillRect(0, 0, 128, 256);
      }
      glowTex = new THREE.CanvasTexture(glowCanvas);
    }

    // Clean Tuned GT Carbon Aero Wing (no flashy neon underglow pad or glowing wing strip)
    const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.05, 0.28), matPool.darkSteel);
    wingBlade.position.set(0, 1.18, -2.08);
    const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.18), matPool.darkSteel);
    const strutR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.18), matPool.darkSteel);
    strutL.position.set(-0.62, 1.01, -2.06);
    strutR.position.set(0.62, 1.01, -2.06);
    rig.add(wingBlade, strutL, strutR);

    parentNode.add(rig);
    car._underglowRig = rig;
    car._nitroGroup = null;
    return rig;
  }

  // ==========================================================================
  // 6. Vạn Thương Linh Các DYNAMIC STOCK MARKET PORTAL (12 GTA-PARODY CORPORATIONS)
  // ==========================================================================
  const BAWSAQ_COMPANIES = [
    {
      ticker: 'LFI',
      name: 'Lifeinvader Corp.',
      sector: 'Công Nghệ & Mạng Xã Hội',
      ceo: 'Jay Norris Jr.',
      basePrice: 148.50,
      volatility: 0.026,
      dividendYield: 0.004,
      rivalTicker: 'VNW',
      allyTicker: 'SHK',
      color: '#38bdf8',
      desc: 'Mạng xã hội lớn nhất San Andreas. Tăng mạnh khi cư dân chụp ảnh siêu xe & dùng Truyền Âm Ngọc Giản, biến động cao theo xu hướng công nghệ.',
      analystTip: 'Biên độ dao động lớn — lướt sóng ngắn hạn cực tốt khi phố xá đông đúc hoặc vừa độ siêu xe mới.'
    },
    {
      ticker: 'MZE',
      name: 'Maze Bank Tower Group',
      sector: 'Ngân Hàng Đầu Tư',
      ceo: 'Arthur Lombank',
      basePrice: 215.00,
      volatility: 0.016,
      dividendYield: 0.012,
      rivalTicker: 'PSB',
      allyTicker: 'SHK',
      color: '#ef4444',
      desc: 'Đế chế tài chính đối thủ trực tiếp của Linh Thạch Bảo Khố. Hưởng lợi lớn từ dòng vốn tháo chạy mỗi khi Linh Thạch Bảo Khố gặp sự cố an ninh!',
      analystTip: 'Mẹo Nội Gián Lester: Gom mạnh MZE trước khi thực hiện Phi Vụ Ngân Hàng Linh Thạch Bảo Khố để ăn sóng tăng kép!'
    },
    {
      ticker: 'PSB',
      name: 'Linh Thạch Bảo Khố',
      sector: 'Ngân Hàng Trung Ương & Kho Vàng',
      ceo: 'victor Vance III',
      basePrice: 184.00,
      volatility: 0.018,
      dividendYield: 0.014,
      rivalTicker: 'MZE',
      allyTicker: 'AUG',
      color: '#10b981',
      desc: 'Ngân hàng lưu trữ vàng thỏi lớn nhất Đại lộ San Andreas. Cổ phiếu lao dốc thảm hại nếu hầm vàng bị khoan thủng, sau đó phục hồi mạnh.',
      analystTip: 'Sau khi kho tiền bị cướp và giá sập 30%–40%, hãy bắt đáy PSB để thu siêu lợi nhuận khi ngân hàng nhận gói cứu trợ!'
    },
    {
      ticker: 'OBY',
      name: 'Obey & Pegassi Motors',
      sector: 'Siêu Xe Thượng Lưu',
      ceo: 'Enzo Pegassi',
      basePrice: 312.00,
      volatility: 0.024,
      dividendYield: 0.008,
      rivalTicker: null,
      allyTicker: 'LSC',
      color: '#f59e0b',
      desc: 'Liên minh sản xuất siêu xe Obey 9F, Zentorno và Bati 801RR. Bứt phá mạnh mỗi khi bạn vô địch giải đua đêm hoặc phóng trên 150 km/h!',
      analystTip: 'Mua OBY trước khi tham gia Giải Đua Đêm Neon để nhân đôi lợi nhuận từ tiền thưởng đua và đà tăng cổ phiếu.'
    },
    {
      ticker: 'DCR',
      name: 'Diamond Crown Resort',
      sector: 'Sòng Bạc & Nghỉ Dưỡng VIP',
      ceo: ' Thornton Duggan',
      basePrice: 268.00,
      volatility: 0.022,
      dividendYield: 0.011,
      rivalTicker: 'VNW',
      allyTicker: 'SHK',
      color: '#c084fc',
      desc: 'Tổ hợp sòng bạc & khách sạn 5 sao tại Đại lộ phía Đông. Tăng trưởng khi khách chơi bài sôi động, nhưng sập mạnh nếu hầm ngầm bị đột kích!',
      analystTip: 'Bán sạch DCR trước Phi Vụ Hầm Ngầm Sòng Bạc Diamond, sau đó mua bắt đáy ngay khi tin tức vụ cướp lan ra!'
    },
    {
      ticker: 'MWI',
      name: 'Merryweather Security',
      sector: 'Quân Sự Tư Nhân & An Ninh',
      ceo: 'Don Percival',
      basePrice: 196.00,
      volatility: 0.025,
      dividendYield: 0.009,
      rivalTicker: null,
      allyTicker: 'AMU',
      color: '#84cc16',
      desc: 'Nhà thầu an ninh vũ trang hàng đầu. Giá cổ phiếu tăng phi mã khi thành phố có truy nã 3★–5★, đấu súng lớn hoặc săn lùng tội phạm truy nã!',
      analystTip: 'Kênh trú ẩn hoàn hảo trước các cuộc đấu súng nảy lửa với Thiên Đình Chấp Pháp/NOOSE hoặc chiến dịch Săn Tiền Thưởng.'
    },
    {
      ticker: 'AMU',
      name: 'Thần Binh Các Arms Corp.',
      sector: 'Vũ Khí & Đạn Dược',
      ceo: 'Buck Colt',
      basePrice: 129.00,
      volatility: 0.023,
      dividendYield: 0.010,
      rivalTicker: null,
      allyTicker: 'MWI',
      color: '#f97316',
      desc: 'Chuỗi cửa hàng vũ khí độc quyền Tiên Thành. Doanh số và giá cổ phiếu bùng nổ tỷ lệ thuận với lượng đạn tiêu thụ và các vụ nổ trên phố!',
      analystTip: 'Mỗi đợt giao tranh dữ dội trên phố đều đẩy nhu cầu súng đạn của người dân tăng vọt — cổ phiếu ưa thích của tay súng.'
    },
    {
      ticker: 'LSC',
      name: 'Luyện Khí Các',
      sector: 'Độ Xe & Phục Hồi Va Chạm',
      ceo: 'Hao Tran',
      basePrice: 164.00,
      volatility: 0.021,
      dividendYield: 0.009,
      rivalTicker: null,
      allyTicker: 'AUG',
      color: '#ec4899',
      desc: 'Hệ thống xưởng độ xe và sửa chữa độc quyền. Càng nhiều xe hơi trên phố bị đâm hỏng hoặc nổ tung, doanh thu phụ tùng LSC càng tăng sốc!',
      analystTip: 'Gom cổ phiếu LSC rồi gây hỗn loạn giao thông hoặc phá hủy xe đối thủ để chứng kiến biểu đồ nến dựng đứng!'
    },
    {
      ticker: 'AUG',
      name: 'Augury Insurance Group',
      sector: 'Bảo Hiểm Xe & Tài Sản',
      ceo: ' Miles Sovereign',
      basePrice: 112.50,
      volatility: 0.017,
      dividendYield: 0.016,
      rivalTicker: null,
      allyTicker: 'LSC',
      color: '#14b8a6',
      desc: 'Tập đoàn bảo hiểm phương tiện lớn nhất bờ Tây. Tăng phí bảo hiểm và giá cổ phiếu mỗi khi tỷ lệ tai nạn/cháy nổ ngoài đường gia tăng!',
      analystTip: 'Cổ phiếu trả cổ tức ổn định và tăng song hành cùng Luyện Khí Các sau các vụ rượt đuổi tốc độ cao.'
    },
    {
      ticker: 'CBK',
      name: "Cluckin' Bell & Burger",
      sector: 'Ẩm Thực Nhanh & Tiêu Dùng',
      ceo: 'Gus Fringman',
      basePrice: 78.40,
      volatility: 0.013,
      dividendYield: 0.019,
      rivalTicker: null,
      allyTicker: 'VNW',
      color: '#facc15',
      desc: 'Chuỗi gà rán & thức ăn nhanh quốc dân. Cổ phiếu phòng thủ bền vững, hưởng lợi lớn vào khung giờ đêm và tiệc tùng tại Túy Tiên Lâu.',
      analystTip: 'Rủi ro thấp, chia cổ tức tiền mặt cao nhất sàn Vạn Thương Linh Các — thích hợp nắm giữ dài hạn.'
    },
    {
      ticker: 'SHK',
      name: 'Shark Credit FinTech',
      sector: 'Tín Dụng & Thanh Toán Số',
      ceo: 'Devon Weston II',
      basePrice: 142.00,
      volatility: 0.027,
      dividendYield: 0.006,
      rivalTicker: null,
      allyTicker: 'DCR',
      color: '#6366f1',
      desc: 'Đế chế thẻ tín dụng Bull Shark và thanh toán phỉnh Casino. Bứt tốc khi dòng tiền giao dịch lớn hoặc hoạt động vay nóng sôi động.',
      analystTip: 'Nhạy bén với khối lượng giao dịch lớn và biến động dòng tiền từ sòng bạc Diamond.'
    },
    {
      ticker: 'VNW',
      name: 'Võ Lâm & Eclipse Media',
      sector: 'Điện Ảnh, Hộp Đêm & Giải Trí',
      ceo: 'Solomon Richards',
      basePrice: 156.00,
      volatility: 0.020,
      dividendYield: 0.010,
      rivalTicker: 'DCR',
      allyTicker: 'CBK',
      color: '#fb7185',
      desc: 'Tập đoàn truyền thông sở hữu phim trường Võ Lâm và chuỗi hộp đêm Eclipse. Tăng giá mạnh khi bạn bay xe Stunt ngoạn mục hoặc quẩy đêm!',
      analystTip: 'Mỗi cú bay xe mạo hiểm Ngự Phong Phi Độ thành công đều tạo viral truyền thông giúp VNW tăng trưởng ấn tượng.'
    }
  ];

  const stockMarket = {
    stocks: {},
    orderTickers: BAWSAQ_COMPANIES.map((c) => c.ticker),
    selectedTicker: 'PSB',
    chartMode: 'CANDLE', // 'CANDLE' | 'LINE'
    timeframe: 60, // 30 | 60 | 100
    showSMA: true,
    autoTakeProfitPct: 0, // 0 = off, 0.25 = +25%
    hoverCandleIdx: -1,
    tickTimer: 0,
    candleTimer: 0,
    dividendTimer: 0,
    uiRefreshTimer: 0,
    newsFeed: [
      '📰 Vạn Thương Linh Các LIVE: Sàn chứng khoán Tiên Thành khớp lệnh kỷ lục — Dòng tiền đổ mạnh vào nhóm Ngân hàng & Siêu xe!',
      '💡 PHÂN TÍCH: Các vụ nổ xe trên Đại lộ Bồng Lai thường giúp cổ phiếu Luyện Khí Các (LSC) & Bảo hiểm (AUG) tăng nóng!',
      '🕵️ TIN ĐỒN PHỐ WALL: Giới đầu cơ đang theo dõi sát sao hệ thống an ninh tại Ngân hàng Linh Thạch Bảo Khố (PSB)...'
    ],
    newsIndex: 0,
    chaosSnapshot: {
      destroyedSet: new WeakSet(),
      lastWantedStars: 0,
      lastPlayerShots: 0,
      highSpeedAccum: 0,
      lastStuntCount: 0,
      lastCasinoChips: 0
    }
  };

  const portfolio = {
    holdings: {}, // ticker -> { shares, avgCost, totalCost, autoSellPct }
    totalInvested: 0,
    realizedProfit: 0,
    dividendsEarned: 0,
    tradesCount: 0,
    peakProfitSingleTrade: 0,
    ledger: [], // { time, type, ticker, shares, price, total, profit }
    get netWorth() {
      let val = 0;
      for (const sym of stockMarket.orderTickers) {
        const h = this.holdings[sym];
        const st = stockMarket.stocks[sym];
        if (h && h.shares > 0 && st) {
          val += h.shares * st.price;
        }
      }
      return Math.round(val * 100) / 100;
    },
    get unrealizedPnL() {
      let pnl = 0;
      for (const sym of stockMarket.orderTickers) {
        const h = this.holdings[sym];
        const st = stockMarket.stocks[sym];
        if (h && h.shares > 0 && st) {
          pnl += h.shares * (st.price - h.avgCost);
        }
      }
      return Math.round(pnl * 100) / 100;
    },
    getHolding(ticker) {
      const sym = String(ticker || '').toUpperCase();
      return this.holdings[sym] || { shares: 0, avgCost: 0, totalCost: 0 };
    },
    getPortfolioValue() {
      return this.netWorth;
    }
  };

  function initStockMarketData() {
    const rng = createSeededRNG(20261118);
    for (const def of BAWSAQ_COMPANIES) {
      let cur = def.basePrice * (0.94 + rng() * 0.12);
      const candles = [];
      for (let i = 0; i < 100; i++) {
        const open = cur;
        const step = (rng() - 0.495) * def.volatility * 2.1 * open;
        const rev = (def.basePrice - open) * 0.035;
        const close = Math.max(4.0, open + step + rev);
        const wickUp = Math.abs(step) * (0.35 + rng() * 0.95) + open * 0.004;
        const wickDn = Math.abs(step) * (0.35 + rng() * 0.95) + open * 0.004;
        const high = Math.max(open, close) + wickUp;
        const low = Math.max(2.5, Math.min(open, close) - wickDn);
        const vol = Math.round(1200 + rng() * 6800 + Math.abs(close - open) * 950);
        candles.push({
          t: i - 100,
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
          volume: vol
        });
        cur = close;
      }

      const dayOpen = candles[Math.max(0, candles.length - 25)].open;
      const liveCandle = {
        t: 0,
        open: cur,
        high: cur,
        low: cur,
        close: cur,
        volume: 850
      };

      stockMarket.stocks[def.ticker] = {
        ...def,
        price: Number(cur.toFixed(2)),
        dayOpen: Number(dayOpen.toFixed(2)),
        dayHigh: Math.max(...candles.slice(-25).map((c) => c.high), cur),
        dayLow: Math.min(...candles.slice(-25).map((c) => c.low), cur),
        changePct: Number((((cur - dayOpen) / dayOpen) * 100).toFixed(2)),
        momentum: 0, // External chaos/heist impulse
        recoveryTarget: null, // Rebound target after heist crash
        candles,
        liveCandle
      };
    }

    // Restore persisted portfolio from localStorage if available
    try {
      const raw = localStorage.getItem(SAVE_PORTFOLIO_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved === 'object') {
          if (saved.holdings && typeof saved.holdings === 'object') {
            for (const sym of stockMarket.orderTickers) {
              const h = saved.holdings[sym];
              if (h && Number(h.shares) > 0) {
                portfolio.holdings[sym] = {
                  shares: Math.floor(Number(h.shares)),
                  avgCost: Math.max(1, Number(h.avgCost) || stockMarket.stocks[sym].price),
                  totalCost: Math.max(0, Number(h.totalCost) || 0)
                };
              }
            }
          }
          portfolio.realizedProfit = Number(saved.realizedProfit) || 0;
          portfolio.dividendsEarned = Number(saved.dividendsEarned) || 0;
          portfolio.tradesCount = Number(saved.tradesCount) || 0;
          portfolio.peakProfitSingleTrade = Number(saved.peakProfitSingleTrade) || 0;
          if (Array.isArray(saved.ledger)) {
            portfolio.ledger = saved.ledger.slice(0, 24);
          }
        }
      }
    } catch (_) {}
  }

  function savePortfolioState() {
    try {
      const payload = {
        holdings: portfolio.holdings,
        realizedProfit: portfolio.realizedProfit,
        dividendsEarned: portfolio.dividendsEarned,
        tradesCount: portfolio.tradesCount,
        peakProfitSingleTrade: portfolio.peakProfitSingleTrade,
        ledger: portfolio.ledger.slice(0, 24)
      };
      localStorage.setItem(SAVE_PORTFOLIO_KEY, JSON.stringify(payload));
    } catch (_) {}
  }

  function pushMarketNews(headline, notifyToast = false) {
    if (!headline) return;
    stockMarket.newsFeed.unshift(headline);
    if (stockMarket.newsFeed.length > 18) stockMarket.newsFeed.length = 18;
    if (domRefs.bawsaqNewsTicker) {
      domRefs.bawsaqNewsTicker.textContent = headline;
    }
    if (notifyToast) {
      notifyFeed(headline, 'green');
    }
  }

  /**
   * Inject a real-world mission/chaos shock into Vạn Thương Linh Các share prices!
   */
  function triggerMarketEvent(eventType, customMagnitude = 1.0) {
    const mag = clamp(Number(customMagnitude) || 1.0, 0.2, 3.0);

    function shockStock(sym, pctDelta, momentumCarry = 0, setRebound = false) {
      const st = stockMarket.stocks[sym];
      if (!st) return;
      const oldP = st.price;
      const newP = clamp(oldP * (1 + pctDelta), st.basePrice * 0.28, st.basePrice * 3.4);
      st.price = Number(newP.toFixed(2));
      st.momentum = clamp(st.momentum + momentumCarry, -0.18, 0.18);
      if (setRebound) {
        st.recoveryTarget = oldP * 0.96;
      }
      st.liveCandle.close = st.price;
      st.liveCandle.high = Math.max(st.liveCandle.high, st.price);
      st.liveCandle.low = Math.min(st.liveCandle.low, st.price);
      st.liveCandle.volume += Math.round(Math.abs(pctDelta) * 42000);
      st.dayHigh = Math.max(st.dayHigh, st.price);
      st.dayLow = Math.min(st.dayLow, st.price);
      st.changePct = Number((((st.price - st.dayOpen) / st.dayOpen) * 100).toFixed(2));
    }

    if (eventType === 'bank_heist_robbed') {
      shockStock('PSB', -0.34 * mag, -0.04, true);
      shockStock('MZE', +0.165 * mag, +0.035, false);
      shockStock('MWI', +0.08 * mag, +0.02, false);
      shockStock('AUG', -0.06 * mag, +0.025, true);
      pushMarketNews(
        '🚨 CHẤN ĐỘNG Vạn Thương Linh Các: Kho vàng Ngân hàng Linh Thạch Bảo Khố (PSB) bị khoan thủng! Cổ phiếu PSB sập -34%, đối thủ Maze Bank (MZE) tăng vọt +16.5%!',
        true
      );
    } else if (eventType === 'casino_heist_robbed') {
      shockStock('DCR', -0.37 * mag, -0.045, true);
      shockStock('MWI', +0.14 * mag, +0.03, false);
      shockStock('SHK', +0.105 * mag, +0.025, false);
      shockStock('VNW', +0.095 * mag, +0.02, false);
      pushMarketNews(
        '🚨 KHẨN CẤP PHỐ WALL: Hầm ngầm Sòng bạc Diamond (DCR) bị đột kích lấy sạch kim cương! DCR lao dốc -37% — cơ hội bắt đáy lịch sử!',
        true
      );
    } else if (eventType === 'vehicle_destroyed') {
      shockStock('LSC', +0.038 * mag, +0.018, false);
      shockStock('AUG', +0.024 * mag, +0.012, false);
      shockStock('AMU', +0.015 * mag, +0.008, false);
      pushMarketNews(
        `💥 TIN NÓNG Vạn Thương Linh Các: Siêu xe phát nổ trên phố — Cổ phiếu Luyện Khí Các (LSC) & Bảo hiểm Augury (AUG) bật tăng mạnh!`,
        false
      );
    } else if (eventType === 'street_race_won') {
      shockStock('OBY', +0.092 * mag, +0.03, false);
      shockStock('LSC', +0.048 * mag, +0.016, false);
      shockStock('LFI', +0.032 * mag, +0.01, false);
      pushMarketNews(
        '🏁 SÓNG SIÊU XE: Giải Đua Đêm Neon gây sốt mạng xã hội Lifeinvader — Cổ phiếu Obey & Pegassi Motors (OBY) bứt phá +9.2%!',
        false
      );
    } else if (eventType === 'police_siege') {
      shockStock('MWI', +0.045 * mag, +0.02, false);
      shockStock('AMU', +0.036 * mag, +0.016, false);
      shockStock('CBK', -0.018 * mag, 0, false);
      pushMarketNews(
        '🚓 BÁO ĐỘNG AN NINH: Đấu súng căng thẳng với Thiên Đình Chấp Pháp/NOOSE đẩy cổ phiếu Quân sự Merryweather (MWI) & Vũ khí Thần Binh Các (AMU) tăng nóng!',
        false
      );
    } else if (eventType === 'bounty_captured') {
      shockStock('MWI', +0.055 * mag, +0.02, false);
      shockStock('SHK', +0.028 * mag, +0.01, false);
      pushMarketNews(
        '🎯 AN NINH ĐÔ THỊ: Tội phạm truy nã nguy hiểm vừa bị tóm gọn — Cổ phiếu Merryweather (MWI) khởi sắc +5.5%!',
        false
      );
    } else if (eventType === 'stunt_jump') {
      shockStock('VNW', +0.046 * mag, +0.018, false);
      shockStock('OBY', +0.032 * mag, +0.012, false);
      shockStock('LFI', +0.028 * mag, +0.01, false);
      pushMarketNews(
        '🎬 VIRAL VINEWOOD: Pha bay xe mạo hiểm triệu lượt xem đẩy cổ phiếu Võ Lâm Media (VNW) & Lifeinvader (LFI) tăng vọt!',
        false
      );
    }

    if (activeCtx?.activeModal === 'stocks') {
      renderBawsaqUI();
    }
  }

  function monitorWorldChaosForStocks(dt) {
    const snap = stockMarket.chaosSnapshot;

    // 1. Detect newly destroyed vehicles in ctx.vehicles.list
    const cars = activeCtx?.vehicles?.list;
    if (Array.isArray(cars)) {
      let newlyDestroyed = 0;
      for (let i = 0; i < cars.length; i++) {
        const c = cars[i];
        if (c && c.destroyed && !snap.destroyedSet.has(c)) {
          snap.destroyedSet.add(c);
          newlyDestroyed++;
        }
      }
      if (newlyDestroyed > 0) {
        progressionStats.vehiclesDestroyed += newlyDestroyed;
        triggerMarketEvent('vehicle_destroyed', Math.min(2.4, newlyDestroyed * 0.95));
      }
    }

    // 2. Detect Wanted Star escalations (>= 3★)
    const curStars = activeCtx?.gameplay?.wanted?.stars || 0;
    if (curStars >= 3 && snap.lastWantedStars < 3) {
      triggerMarketEvent('police_siege', curStars >= 4 ? 1.4 : 1.0);
    }
    if (curStars >= 5) {
      progressionStats.reachedFiveStars = true;
    }
    snap.lastWantedStars = curStars;

    // 3. Detect High-Speed Supercar Runs (> 41.7 m/s = 150 km/h)
    const pCar = getPlayerVehicle();
    if (pCar) {
      const spdMs = Math.hypot(pCar.vx || 0, pCar.vz || 0) || Math.abs(pCar.speed || 0);
      const kmh = spdMs * 3.6;
      if (kmh > progressionStats.topSpeedKmh) {
        progressionStats.topSpeedKmh = kmh;
      }
      if (pCar.isDrifting && spdMs > 10) {
        progressionStats.driftSeconds += dt;
      }
      if (pCar.type === 'superbike' || pCar.type === 'chopper') {
        if ((pCar.wheelieAngle && Math.abs(pCar.wheelieAngle) > 0.15) || (pCar.pitch && pCar.pitch < -0.15)) {
          progressionStats.wheelieSeconds += dt;
        }
      }
      if (pCar.type === 'speedboat' || pCar.type === 'jetski' || pCar.isBoat) {
        if (spdMs > 4) progressionStats.marineSeconds += dt;
      }
      if (kmh >= 150) {
        snap.highSpeedAccum += dt;
        if (snap.highSpeedAccum >= 7.5) {
          snap.highSpeedAccum = 0;
          const oby = stockMarket.stocks.OBY;
          if (oby) oby.momentum = clamp(oby.momentum + 0.015, -0.15, 0.15);
        }
      }
    }

    // 4. Detect Ngự Phong Phi Độ completed from ctx.worldInfra
    const wi = activeCtx?.worldInfra;
    if (wi) {
      const rawStunts = wi.stuntJumpsCompleted ?? wi.stuntJampsCompleted;
      const stuntCount =
        typeof rawStunts === 'number'
          ? rawStunts
          : rawStunts instanceof Set
            ? rawStunts.size
            : Array.isArray(rawStunts)
              ? rawStunts.length
              : 0;
      if (stuntCount > snap.lastStuntCount) {
        const diff = stuntCount - snap.lastStuntCount;
        snap.lastStuntCount = stuntCount;
        progressionStats.stuntJumps = Math.max(progressionStats.stuntJumps, stuntCount);
        triggerMarketEvent('stunt_jump', Math.min(2.0, diff));
      }
    }

    // 5. Detect Casino chip milestones
    const cg = activeCtx?.casinoGames;
    if (cg && typeof cg.chips === 'number') {
      if (cg.chips > snap.lastCasinoChips + 5000) {
        const dcr = stockMarket.stocks.DCR;
        if (dcr) dcr.momentum = clamp(dcr.momentum + 0.014, -0.15, 0.15);
      }
      snap.lastCasinoChips = cg.chips;
      if (cg.chips > progressionStats.maxCasinoChips) {
        progressionStats.maxCasinoChips = cg.chips;
      }
    }
  }

  function stepBawsaqMarket(rawDt) {
    stockMarket.tickTimer += rawDt;
    stockMarket.candleTimer += rawDt;
    stockMarket.dividendTimer += rawDt;
    stockMarket.uiRefreshTimer += rawDt;

    // Micro price tick every 1.25s
    if (stockMarket.tickTimer >= 1.25) {
      stockMarket.tickTimer = 0;
      const isNight = activeCtx?.engine?.timeWeather === 'NEON_NIGHT';

      for (const sym of stockMarket.orderTickers) {
        const st = stockMarket.stocks[sym];
        if (!st) continue;

        const noise = (Math.random() - 0.496) * st.volatility * 0.65;
        let pull = ((st.basePrice - st.price) / st.basePrice) * 0.018;

        // Post-heist buy-the-dip gradual recovery curve!
        if (st.recoveryTarget !== null) {
          if (st.price < st.recoveryTarget * 0.97) {
            pull += 0.0085;
          } else {
            st.recoveryTarget = null;
          }
        }

        // Nightlife & food boost at night
        const nightBias = isNight && (sym === 'CBK' || sym === 'VNW' || sym === 'DCR') ? 0.0018 : 0;

        const pctStep = clamp(noise + pull + st.momentum * 0.24 + nightBias, -0.065, 0.065);
        st.momentum *= 0.86;

        const nextP = clamp(st.price * (1 + pctStep), st.basePrice * 0.24, st.basePrice * 3.8);
        st.price = Number(nextP.toFixed(2));
        st.liveCandle.close = st.price;
        if (st.price > st.liveCandle.high) st.liveCandle.high = st.price;
        if (st.price < st.liveCandle.low) st.liveCandle.low = st.price;
        st.liveCandle.volume += Math.round(90 + Math.abs(pctStep) * 18000 + Math.random() * 180);

        if (st.price > st.dayHigh) st.dayHigh = st.price;
        if (st.price < st.dayLow) st.dayLow = st.price;
        st.changePct = Number((((st.price - st.dayOpen) / st.dayOpen) * 100).toFixed(2));

        // Optional Auto-Take-Profit trigger if enabled by player
        if (stockMarket.autoTakeProfitPct > 0) {
          const hold = portfolio.holdings[sym];
          if (hold && hold.shares > 0 && st.price >= hold.avgCost * (1 + stockMarket.autoTakeProfitPct)) {
            sellStock(sym, hold.shares, true);
          }
        }
      }
    }

    // Finalize OHLC candle every 7.5s of real play time
    if (stockMarket.candleTimer >= 7.5) {
      stockMarket.candleTimer = 0;
      for (const sym of stockMarket.orderTickers) {
        const st = stockMarket.stocks[sym];
        if (!st) continue;
        st.candles.push({
          t: (st.candles[st.candles.length - 1]?.t ?? 0) + 1,
          open: Number(st.liveCandle.open.toFixed(2)),
          high: Number(st.liveCandle.high.toFixed(2)),
          low: Number(st.liveCandle.low.toFixed(2)),
          close: Number(st.liveCandle.close.toFixed(2)),
          volume: st.liveCandle.volume
        });
        if (st.candles.length > 140) st.candles.shift();
        st.liveCandle = {
          t: (st.candles[st.candles.length - 1]?.t ?? 0) + 1,
          open: st.price,
          high: st.price,
          low: st.price,
          close: st.price,
          volume: Math.round(180 + Math.random() * 240)
        };
      }
    }

    // Periodic Dividend Payout every 90s when player holds dividend-bearing shares
    if (stockMarket.dividendTimer >= 90.0) {
      stockMarket.dividendTimer = 0;
      let totalDiv = 0;
      for (const sym of stockMarket.orderTickers) {
        const h = portfolio.holdings[sym];
        const st = stockMarket.stocks[sym];
        if (h && h.shares > 0 && st && st.dividendYield > 0) {
          totalDiv += h.shares * st.price * (st.dividendYield * 0.35);
        }
      }
      const roundedDiv = Math.floor(totalDiv);
      if (roundedDiv >= 15) {
        portfolio.dividendsEarned += roundedDiv;
        addPlayerCash(roundedDiv, true);
        notifyFeed(`💵 Cổ tức Vạn Thương Linh Các định kỳ: +$${roundedDiv.toLocaleString('en-US')} chảy vào tài khoản!`, 'green');
        savePortfolioState();
      }
    }

    // Refresh open Vạn Thương Linh Các Modal smoothly at ~2.5 Hz
    if (activeCtx?.activeModal === 'stocks' && stockMarket.uiRefreshTimer >= 0.42) {
      stockMarket.uiRefreshTimer = 0;
      renderBawsaqDynamicFigures();
      drawBawsaqChart();
    }
  }

  function buyStock(ticker, rawShares = 1) {
    const sym = String(ticker || stockMarket.selectedTicker).toUpperCase();
    const st = stockMarket.stocks[sym];
    if (!st) return false;
    const shares = Math.max(1, Math.floor(Number(rawShares) || 1));
    const cash = getPlayerCash();
    const maxAffordable = Math.floor(cash / st.price);
    const actualShares = Math.min(shares, maxAffordable);

    if (actualShares <= 0) {
      activeCtx?.audio?.playPhoneError?.();
      notifyFeed(`Không đủ tiền mặt để mua cổ phiếu ${sym} (${formatPrice(st.price)}/CP)!`, 'red');
      return false;
    }

    const totalCost = Math.round(actualShares * st.price);
    setPlayerCash(cash - totalCost, true);

    const prev = portfolio.holdings[sym] || { shares: 0, avgCost: 0, totalCost: 0 };
    const newShares = prev.shares + actualShares;
    const newTotalCost = prev.totalCost + totalCost;
    portfolio.holdings[sym] = {
      shares: newShares,
      avgCost: Number((newTotalCost / newShares).toFixed(2)),
      totalCost: newTotalCost
    };
    portfolio.totalInvested += totalCost;
    portfolio.tradesCount += 1;

    // Large institutional-size order nudges stock price slightly upward
    if (totalCost >= 10000) {
      st.momentum = clamp(st.momentum + 0.008, -0.15, 0.15);
    }

    portfolio.ledger.unshift({
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'MUA',
      ticker: sym,
      shares: actualShares,
      price: st.price,
      total: totalCost,
      profit: 0
    });
    if (portfolio.ledger.length > 24) portfolio.ledger.length = 24;

    heistSFX.playStockTrade(true);
    savePortfolioState();
    evaluateAchievements();
    if (activeCtx?.activeModal === 'stocks') renderBawsaqUI();
    return true;
  }

  function sellStock(ticker, rawShares = 1, isAuto = false) {
    const sym = String(ticker || stockMarket.selectedTicker).toUpperCase();
    const st = stockMarket.stocks[sym];
    const hold = portfolio.holdings[sym];
    if (!st || !hold || hold.shares <= 0) {
      if (!isAuto) {
        activeCtx?.audio?.playPhoneError?.();
        notifyFeed(`Bạn chưa nắm giữ cổ phiếu ${sym} nào để bán!`, 'gold');
      }
      return false;
    }

    const sellQty = Math.min(hold.shares, Math.max(1, Math.floor(Number(rawShares) || 1)));
    const grossProceeds = Math.round(sellQty * st.price);
    const costBasisSold = sellQty * hold.avgCost;
    const tradeProfit = Math.round(grossProceeds - costBasisSold);

    addPlayerCash(grossProceeds, true);

    const remaining = hold.shares - sellQty;
    if (remaining <= 0) {
      delete portfolio.holdings[sym];
    } else {
      portfolio.holdings[sym] = {
        shares: remaining,
        avgCost: hold.avgCost,
        totalCost: Number((remaining * hold.avgCost).toFixed(2))
      };
    }

    portfolio.realizedProfit += tradeProfit;
    portfolio.tradesCount += 1;
    if (tradeProfit > portfolio.peakProfitSingleTrade) {
      portfolio.peakProfitSingleTrade = tradeProfit;
    }

    portfolio.ledger.unshift({
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: isAuto ? 'CHỐT LỜI' : 'BÁN',
      ticker: sym,
      shares: sellQty,
      price: st.price,
      total: grossProceeds,
      profit: tradeProfit
    });
    if (portfolio.ledger.length > 24) portfolio.ledger.length = 24;

    heistSFX.playStockTrade(false);
    if (isAuto) {
      notifyFeed(
        `📈 Chốt lời tự động ${sellQty} CP ${sym}: Thu về ${formatMoney(grossProceeds)} (${formatMoney(tradeProfit, true)})!`,
        'green'
      );
    }
    savePortfolioState();
    evaluateAchievements();
    if (activeCtx?.activeModal === 'stocks') renderBawsaqUI();
    return true;
  }

  function sellAllStock(ticker) {
    const sym = String(ticker || stockMarket.selectedTicker).toUpperCase();
    const hold = portfolio.holdings[sym];
    if (!hold || hold.shares <= 0) return false;
    return sellStock(sym, hold.shares, false);
  }

  function drawBawsaqChart() {
    const canvas = domRefs.bawsaqChartCanvas;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;

    const st = stockMarket.stocks[stockMarket.selectedTicker];
    if (!st) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth || 680;
    const cssH = canvas.clientHeight || 300;
    const targetW = Math.max(320, Math.round(cssW * dpr));
    const targetH = Math.max(200, Math.round(cssH * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    g.save();
    g.scale(dpr, dpr);
    const W = cssW;
    const H = cssH;

    // Deep Bloomberg/Vạn Thương Linh Các dark grid background
    g.fillStyle = '#050a14';
    g.fillRect(0, 0, W, H);

    if (stockMarket.chartMode === 'HEATMAP') {
      drawBawsaqMarketHeatmap(g, W, H);
      g.restore();
      return;
    }

    const allSeries = [...st.candles, st.liveCandle];
    const visibleCount = clamp(stockMarket.timeframe, 20, allSeries.length);
    const series = allSeries.slice(-visibleCount);
    if (series.length === 0) {
      g.restore();
      return;
    }

    const padL = 14;
    const padR = 64;
    const padT = 18;
    const padB = 56;
    const plotW = Math.max(80, W - padL - padR);
    const plotH = Math.max(80, H - padT - padB);
    const volTop = padT + plotH + 8;
    const volH = 34;

    let minP = Infinity;
    let maxP = -Infinity;
    let maxVol = 1;
    for (let i = 0; i < series.length; i++) {
      const c = series[i];
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    }

    const hold = portfolio.holdings[st.ticker];
    if (hold && hold.shares > 0) {
      minP = Math.min(minP, hold.avgCost * 0.98);
      maxP = Math.max(maxP, hold.avgCost * 1.02);
    }

    const span = Math.max(1.2, maxP - minP);
    minP -= span * 0.08;
    maxP += span * 0.08;
    const priceToY = (p) => padT + plotH - ((p - minP) / (maxP - minP)) * plotH;

    // Horizontal price grid lines & right-axis labels
    g.strokeStyle = 'rgba(148, 163, 184, 0.11)';
    g.lineWidth = 1;
    g.fillStyle = '#64748b';
    g.font = '11px Segoe UI, sans-serif';
    g.textAlign = 'left';
    for (let k = 0; k <= 4; k++) {
      const ratio = k / 4;
      const py = padT + ratio * plotH;
      const pVal = maxP - ratio * (maxP - minP);
      g.beginPath();
      g.moveTo(padL, py);
      g.lineTo(padL + plotW, py);
      g.stroke();
      g.fillText(`$${pVal.toFixed(2)}`, padL + plotW + 6, py + 4);
    }

    const stepX = plotW / series.length;
    const candleW = clamp(stepX * 0.64, 3, 14);

    // Volume histogram bars along bottom strip
    for (let i = 0; i < series.length; i++) {
      const c = series[i];
      const cx = padL + (i + 0.5) * stepX;
      const vh = (c.volume / maxVol) * volH;
      const isUp = c.close >= c.open;
      g.fillStyle = isUp ? 'rgba(16, 185, 129, 0.28)' : 'rgba(239, 68, 68, 0.28)';
      g.fillRect(cx - candleW * 0.5, volTop + volH - vh, candleW, vh);
    }

    if (stockMarket.chartMode === 'LINE') {
      // Smooth Gradient Area + Crisp Line Chart
      const isOverallUp = series[series.length - 1].close >= series[0].open;
      const lineCol = isOverallUp ? '#10b981' : '#ef4444';
      const grad = g.createLinearGradient(0, padT, 0, padT + plotH);
      grad.addColorStop(0, isOverallUp ? 'rgba(16, 185, 129, 0.36)' : 'rgba(239, 68, 68, 0.36)');
      grad.addColorStop(1, 'rgba(5, 10, 20, 0.0)');

      g.beginPath();
      for (let i = 0; i < series.length; i++) {
        const cx = padL + (i + 0.5) * stepX;
        const cy = priceToY(series[i].close);
        if (i === 0) g.moveTo(cx, cy);
        else g.lineTo(cx, cy);
      }
      g.strokeStyle = lineCol;
      g.lineWidth = 2.4;
      g.stroke();

      g.lineTo(padL + (series.length - 0.5) * stepX, padT + plotH);
      g.lineTo(padL + 0.5 * stepX, padT + plotH);
      g.closePath();
      g.fillStyle = grad;
      g.fill();
    } else {
      // Authentic Japanese OHLC Candlesticks
      for (let i = 0; i < series.length; i++) {
        const c = series[i];
        const cx = padL + (i + 0.5) * stepX;
        const yHigh = priceToY(c.high);
        const yLow = priceToY(c.low);
        const yOpen = priceToY(c.open);
        const yClose = priceToY(c.close);
        const isUp = c.close >= c.open;
        const col = isUp ? '#10b981' : '#ef4444';

        g.strokeStyle = col;
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(cx, yHigh);
        g.lineTo(cx, yLow);
        g.stroke();

        const bodyTop = Math.min(yOpen, yClose);
        const bodyH = Math.max(2.0, Math.abs(yClose - yOpen));
        g.fillStyle = col;
        g.fillRect(cx - candleW * 0.5, bodyTop, candleW, bodyH);
      }
    }

    // SMA-8 (Cyan) & SMA-21 (Amber) Technical Indicator Curves
    if (stockMarket.showSMA && series.length >= 9) {
      const drawSMA = (period, strokeHex) => {
        g.strokeStyle = strokeHex;
        g.lineWidth = 1.5;
        g.beginPath();
        let started = false;
        for (let i = period - 1; i < series.length; i++) {
          let sum = 0;
          for (let j = i - period + 1; j <= i; j++) sum += series[j].close;
          const avg = sum / period;
          const cx = padL + (i + 0.5) * stepX;
          const cy = priceToY(avg);
          if (!started) {
            g.moveTo(cx, cy);
            started = true;
          } else {
            g.lineTo(cx, cy);
          }
        }
        g.stroke();
      };
      drawSMA(8, '#38bdf8');
      if (series.length >= 21) drawSMA(21, '#fbbf24');
    }

    // Player Average Cost Basis Dashed Line
    if (hold && hold.shares > 0) {
      const yAvg = priceToY(hold.avgCost);
      g.save();
      g.setLineDash([5, 4]);
      g.strokeStyle = '#c084fc';
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(padL, yAvg);
      g.lineTo(padL + plotW, yAvg);
      g.stroke();
      g.fillStyle = '#e9d5ff';
      g.font = '700 10.5px Segoe UI, sans-serif';
      g.fillText(`Giá vốn: $${hold.avgCost.toFixed(2)}`, padL + 8, Math.max(14, yAvg - 5));
      g.restore();
    }

    // Live Price Tag on Right Axis
    const yCur = priceToY(st.price);
    const upDay = st.changePct >= 0;
    g.fillStyle = upDay ? '#059669' : '#dc2626';
    g.fillRect(padL + plotW + 2, yCur - 9, 58, 18);
    g.fillStyle = '#ffffff';
    g.font = '700 10.5px Segoe UI, sans-serif';
    g.fillText(`$${st.price.toFixed(2)}`, padL + plotW + 6, yCur + 3.5);

    // Interactive Crosshair & OHLCV Tooltip
    if (stockMarket.hoverCandleIdx >= 0 && stockMarket.hoverCandleIdx < series.length) {
      const idx = stockMarket.hoverCandleIdx;
      const hc = series[idx];
      const hx = padL + (idx + 0.5) * stepX;
      const hy = priceToY(hc.close);

      g.save();
      g.setLineDash([3, 3]);
      g.strokeStyle = 'rgba(226, 232, 240, 0.45)';
      g.beginPath();
      g.moveTo(hx, padT);
      g.lineTo(hx, padT + plotH + volH + 8);
      g.moveTo(padL, hy);
      g.lineTo(padL + plotW, hy);
      g.stroke();
      g.restore();

      const info = `Mở: $${hc.open.toFixed(2)}  Cao: $${hc.high.toFixed(2)}  Thấp: $${hc.low.toFixed(2)}  Đóng: $${hc.close.toFixed(2)}  KL: ${hc.volume.toLocaleString()}`;
      g.fillStyle = 'rgba(15, 23, 42, 0.92)';
      g.fillRect(padL + 4, 4, Math.min(plotW - 8, 430), 20);
      g.fillStyle = '#e2e8f0';
      g.font = '600 11px Segoe UI, sans-serif';
      g.fillText(info, padL + 10, 18);
    } else if (stockMarket.showSMA) {
      g.fillStyle = '#38bdf8';
      g.font = '600 10.5px Segoe UI, sans-serif';
      g.fillText('● SMA-8', padL + 6, 15);
      g.fillStyle = '#fbbf24';
      g.fillText('● SMA-21', padL + 62, 15);
    }

    g.restore();
  }

  const heatmapTiles = [];

  function drawBawsaqMarketHeatmap(g, W, H) {
    heatmapTiles.length = 0;
    const cols = 4;
    const rows = 3;
    const pad = 8;
    const gap = 6;
    const cellW = (W - pad * 2 - gap * (cols - 1)) / cols;
    const cellH = (H - pad * 2 - gap * (rows - 1)) / rows;

    for (let i = 0; i < stockMarket.orderTickers.length; i++) {
      const sym = stockMarket.orderTickers[i];
      const st = stockMarket.stocks[sym];
      if (!st) continue;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const tx = pad + col * (cellW + gap);
      const ty = pad + row * (cellH + gap);

      const chg = st.changePct;
      const intensity = clamp(Math.abs(chg) / 18.0, 0.16, 0.92);
      if (chg >= 0) {
        const gVal = Math.round(lerp(68, 175, intensity));
        g.fillStyle = `rgb(10, ${gVal}, ${Math.round(gVal * 0.62)})`;
      } else {
        const rVal = Math.round(lerp(82, 195, intensity));
        g.fillStyle = `rgb(${rVal}, 22, 34)`;
      }

      g.fillRect(tx, ty, cellW, cellH);
      const isSel = sym === stockMarket.selectedTicker;
      g.strokeStyle = isSel ? '#fde047' : 'rgba(226, 232, 240, 0.22)';
      g.lineWidth = isSel ? 2.6 : 1.0;
      g.strokeRect(tx, ty, cellW, cellH);

      const hold = portfolio.holdings[sym];
      g.textAlign = 'center';
      g.fillStyle = '#ffffff';
      g.font = '900 17px Segoe UI, sans-serif';
      g.fillText(sym, tx + cellW * 0.5, ty + cellH * 0.34);

      g.fillStyle = 'rgba(241, 245, 249, 0.88)';
      g.font = '700 12.5px Segoe UI, sans-serif';
      g.fillText(formatPrice(st.price), tx + cellW * 0.5, ty + cellH * 0.56);

      g.fillStyle = chg >= 0 ? '#bbf7d0' : '#fecaca';
      g.font = '800 12px Segoe UI, sans-serif';
      g.fillText(`${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`, tx + cellW * 0.5, ty + cellH * 0.76);

      if (hold && hold.shares > 0) {
        g.fillStyle = '#fde047';
        g.font = '700 10px Segoe UI, sans-serif';
        g.fillText(`★ ${hold.shares} CP`, tx + cellW * 0.5, ty + cellH * 0.92);
      }

      heatmapTiles.push({ sym, x: tx, y: ty, w: cellW, h: cellH });
    }
  }

  function renderBawsaqDynamicFigures() {
    if (!domRefs.bawsaqModal) return;
    const cash = getPlayerCash();
    const nw = portfolio.netWorth;
    const unPnL = portfolio.unrealizedPnL;
    const totalCostAll = Object.values(portfolio.holdings).reduce((s, h) => s + (h.totalCost || 0), 0);
    const pnlPct = totalCostAll > 0 ? (unPnL / totalCostAll) * 100 : 0;

    if (domRefs.bawsaqCash) domRefs.bawsaqCash.textContent = formatMoney(cash);
    if (domRefs.bawsaqNetWorth) domRefs.bawsaqNetWorth.textContent = formatMoney(nw);
    if (domRefs.bawsaqPnL) {
      const totalCombined = unPnL + portfolio.realizedProfit;
      domRefs.bawsaqPnL.textContent = `${formatMoney(totalCombined, true)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}% Tạm tính)`;
      domRefs.bawsaqPnL.style.color = totalCombined >= 0 ? '#34d399' : '#f87171';
    }

    // Update sidebar rows in-place if already built
    const rows = domRefs.bawsaqTickerList?.querySelectorAll('[data-stock-sym]');
    if (rows && rows.length === stockMarket.orderTickers.length) {
      rows.forEach((row) => {
        const sym = row.getAttribute('data-stock-sym');
        const st = stockMarket.stocks[sym];
        if (!st) return;
        const hold = portfolio.holdings[sym];
        const pEl = row.querySelector('.js-st-price');
        const cEl = row.querySelector('.js-st-chg');
        const hEl = row.querySelector('.js-st-hold');
        if (pEl) pEl.textContent = formatPrice(st.price);
        if (cEl) {
          cEl.textContent = `${st.changePct >= 0 ? '▲ +' : '▼ '}${st.changePct.toFixed(2)}%`;
          cEl.className = `gta-stock-chg js-st-chg ${st.changePct >= 0 ? 'up' : 'down'}`;
        }
        if (hEl) {
          hEl.textContent = hold && hold.shares > 0 ? `Đang giữ: ${hold.shares} CP` : st.sector;
          hEl.style.color = hold && hold.shares > 0 ? '#fde047' : '#94a3b8';
        }
      });
    }
  }

  function renderBawsaqUI() {
    ensureHeistsDOM();
    if (!domRefs.bawsaqTickerList || !domRefs.bawsaqSelectedHeader || !domRefs.bawsaqOrderPanel) return;

    const sel = stockMarket.stocks[stockMarket.selectedTicker] || stockMarket.stocks.PSB;
    const hold = portfolio.getHolding(sel.ticker);
    const cash = getPlayerCash();
    const maxBuy = Math.max(0, Math.floor(cash / sel.price));
    const posValue = Math.round(hold.shares * sel.price);
    const posPnL = Math.round(hold.shares * (sel.price - hold.avgCost));

    domRefs.bawsaqTickerList.innerHTML = stockMarket.orderTickers
      .map((sym) => {
        const s = stockMarket.stocks[sym];
        const h = portfolio.holdings[sym];
        const isAct = sym === sel.ticker;
        const isUp = s.changePct >= 0;
        return `
          <div class="gta-stock-row ${isAct ? 'active' : ''}" data-stock-sym="${sym}">
            <div>
              <div class="gta-stock-sym"><span style="color:${s.color};">●</span> ${sym} — ${escapeHTML(s.name)}</div>
              <div class="gta-stock-name js-st-hold" style="color:${h && h.shares > 0 ? '#fde047' : '#94a3b8'};">
                ${h && h.shares > 0 ? `Đang giữ: ${h.shares} CP` : escapeHTML(s.sector)}
              </div>
            </div>
            <div class="gta-stock-price-col">
              <div class="js-st-price" style="font-weight:800;font-size:13.5px;">${formatPrice(s.price)}</div>
              <div class="gta-stock-chg js-st-chg ${isUp ? 'up' : 'down'}">${isUp ? '▲ +' : '▼ '}${s.changePct.toFixed(2)}%</div>
            </div>
          </div>`;
      })
      .join('');

    domRefs.bawsaqTickerList.querySelectorAll('[data-stock-sym]').forEach((el) => {
      el.addEventListener('click', () => {
        stockMarket.selectedTicker = el.getAttribute('data-stock-sym');
        stockMarket.hoverCandleIdx = -1;
        heistSFX.playHackClick(1.1);
        renderBawsaqUI();
      });
    });

    domRefs.bawsaqSelectedHeader.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;">
        <div>
          <div style="font-size:18px;font-weight:900;color:#f8fafc;">
            <span style="color:${sel.color};">${sel.ticker}</span> • ${escapeHTML(sel.name)}
            <span style="font-size:16px;margin-left:8px;color:${sel.changePct >= 0 ? '#34d399' : '#f87171'};">
              ${formatPrice(sel.price)} (${sel.changePct >= 0 ? '+' : ''}${sel.changePct.toFixed(2)}%)
            </span>
          </div>
          <div style="font-size:11.5px;color:#94a3b8;margin-top:2px;">
            Ngành: ${escapeHTML(sel.sector)} • Đỉnh ngày: ${formatPrice(sel.dayHigh)} • Đáy ngày: ${formatPrice(sel.dayLow)} • Cổ tức: ${(sel.dividendYield * 100).toFixed(1)}%
          </div>
        </div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;">
          <button type="button" class="gta-ha-btn ghost" data-chart-mode="CANDLE" style="${stockMarket.chartMode === 'CANDLE' ? 'border-color:#10b981;color:#34d399;' : ''}">🕯 Nến Nhật</button>
          <button type="button" class="gta-ha-btn ghost" data-chart-mode="LINE" style="${stockMarket.chartMode === 'LINE' ? 'border-color:#10b981;color:#34d399;' : ''}">📈 Đường</button>
          <button type="button" class="gta-ha-btn ghost" data-chart-mode="HEATMAP" style="${stockMarket.chartMode === 'HEATMAP' ? 'border-color:#fbbf24;color:#fde047;' : ''}">🗺 Bản Đồ Nhiệt</button>
          <button type="button" class="gta-ha-btn ghost" data-tf="35" style="${stockMarket.timeframe === 35 ? 'border-color:#38bdf8;' : ''}">Ngắn</button>
          <button type="button" class="gta-ha-btn ghost" data-tf="65" style="${stockMarket.timeframe === 65 ? 'border-color:#38bdf8;' : ''}">Vừa</button>
          <button type="button" class="gta-ha-btn ghost" data-tf="100" style="${stockMarket.timeframe === 100 ? 'border-color:#38bdf8;' : ''}">Toàn Bộ</button>
          <button type="button" class="gta-ha-btn ghost" id="gta-bawsaq-sma-btn">SMA: ${stockMarket.showSMA ? 'BẬT' : 'TẮT'}</button>
        </div>
      </div>
      <div style="margin-top:6px;padding:8px 11px;background:rgba(15,23,42,0.75);border-left:3px solid ${sel.color};border-radius:6px;font-size:12px;color:#cbd5e1;">
        ${escapeHTML(sel.desc)}<br>
        <span style="color:#fde68a;">💡 Gợi ý Đầu tư: ${escapeHTML(sel.analystTip)}</span>
      </div>
    `;

    domRefs.bawsaqSelectedHeader.querySelectorAll('[data-chart-mode]').forEach((b) => {
      b.addEventListener('click', () => {
        stockMarket.chartMode = b.getAttribute('data-chart-mode');
        renderBawsaqUI();
      });
    });
    domRefs.bawsaqSelectedHeader.querySelectorAll('[data-tf]').forEach((b) => {
      b.addEventListener('click', () => {
        stockMarket.timeframe = Number(b.getAttribute('data-tf')) || 60;
        renderBawsaqUI();
      });
    });
    document.getElementById('gta-bawsaq-sma-btn')?.addEventListener('click', () => {
      stockMarket.showSMA = !stockMarket.showSMA;
      renderBawsaqUI();
    });

    // Right Column: Order Execution Ticket
    domRefs.bawsaqOrderPanel.innerHTML = `
      <div style="font-weight:800;font-size:14px;color:#34d399;text-transform:uppercase;">💼 ĐẶT LỆNH GIAO DỊCH (${sel.ticker})</div>
      <div style="background:rgba(15,23,42,0.85);border:1px solid rgba(148,163,184,0.18);border-radius:9px;padding:10px;font-size:12.5px;line-height:1.6;">
        <div>Sở hữu: <strong style="color:#fde047;">${hold.shares.toLocaleString()} CP</strong> (${formatMoney(posValue)})</div>
        <div>Giá vốn TB: <strong>${hold.shares > 0 ? formatPrice(hold.avgCost) : '—'}</strong></div>
        <div>Lãi/Lỗ mã này: <strong style="color:${posPnL >= 0 ? '#34d399' : '#f87171'};">${hold.shares > 0 ? formatMoney(posPnL, true) : '$0'}</strong></div>
        <div>Sức mua tối đa: <strong style="color:#38bdf8;">${maxBuy.toLocaleString()} CP</strong></div>
      </div>

      <div style="font-size:11.5px;font-weight:700;color:#94a3b8;margin-top:2px;">MUA CỔ PHIẾU (${formatPrice(sel.price)}/CP)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <button type="button" class="gta-ha-btn green" data-buy-qty="1">Mua 1 CP</button>
        <button type="button" class="gta-ha-btn green" data-buy-qty="10">Mua 10 CP</button>
        <button type="button" class="gta-ha-btn green" data-buy-qty="50">Mua 50 CP</button>
        <button type="button" class="gta-ha-btn green" data-buy-frac="0.25">Mua 25% Vốn</button>
        <button type="button" class="gta-ha-btn green" data-buy-frac="0.5">Mua 50% Vốn</button>
        <button type="button" class="gta-ha-btn gold" data-buy-frac="1.0">TẤT TAY 100%</button>
      </div>

      <div style="font-size:11.5px;font-weight:700;color:#94a3b8;margin-top:4px;">BÁN CHỐT LỜI / CẮT LỖ</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <button type="button" class="gta-ha-btn red" data-sell-qty="1">Bán 1 CP</button>
        <button type="button" class="gta-ha-btn red" data-sell-qty="10">Bán 10 CP</button>
        <button type="button" class="gta-ha-btn red" data-sell-frac="0.5">Bán 50%</button>
        <button type="button" class="gta-ha-btn red" data-sell-all="1">BÁN TẤT CẢ</button>
      </div>

      <div style="margin-top:6px;padding-top:8px;border-top:1px solid rgba(148,163,184,0.16);">
        <button type="button" id="gta-bawsaq-autotake-btn" class="gta-ha-btn ghost" style="width:100%;">
          🤖 Chốt Lời Tự Động +25%: ${stockMarket.autoTakeProfitPct > 0 ? 'ĐANG BẬT' : 'TẮT'}
        </button>
      </div>
      <div style="font-size:11.5px;color:#94a3b8;line-height:1.45;">
        Tổng lãi đã chốt: <strong style="color:${portfolio.realizedProfit >= 0 ? '#34d399' : '#f87171'};">${formatMoney(portfolio.realizedProfit, true)}</strong><br>
        Cổ tức đã nhận: <strong style="color:#fde047;">${formatMoney(portfolio.dividendsEarned, true)}</strong>
      </div>
    `;

    domRefs.bawsaqOrderPanel.querySelectorAll('[data-buy-qty]').forEach((b) => {
      b.addEventListener('click', () => buyStock(sel.ticker, Number(b.getAttribute('data-buy-qty'))));
    });
    domRefs.bawsaqOrderPanel.querySelectorAll('[data-buy-frac]').forEach((b) => {
      b.addEventListener('click', () => {
        const frac = Number(b.getAttribute('data-buy-frac')) || 0.25;
        const qty = Math.max(1, Math.floor((getPlayerCash() * frac) / sel.price));
        buyStock(sel.ticker, qty);
      });
    });
    domRefs.bawsaqOrderPanel.querySelectorAll('[data-sell-qty]').forEach((b) => {
      b.addEventListener('click', () => sellStock(sel.ticker, Number(b.getAttribute('data-sell-qty'))));
    });
    domRefs.bawsaqOrderPanel.querySelectorAll('[data-sell-frac]').forEach((b) => {
      b.addEventListener('click', () => {
        const h = portfolio.getHolding(sel.ticker);
        if (h.shares > 0) sellStock(sel.ticker, Math.max(1, Math.floor(h.shares * 0.5)));
      });
    });
    domRefs.bawsaqOrderPanel.querySelectorAll('[data-sell-all]').forEach((b) => {
      b.addEventListener('click', () => sellAllStock(sel.ticker));
    });
    document.getElementById('gta-bawsaq-autotake-btn')?.addEventListener('click', () => {
      stockMarket.autoTakeProfitPct = stockMarket.autoTakeProfitPct > 0 ? 0 : 0.25;
      renderBawsaqUI();
    });

    // Recent Trade Ledger
    if (domRefs.bawsaqLedgerBody) {
      if (portfolio.ledger.length === 0) {
        domRefs.bawsaqLedgerBody.innerHTML =
          '<div style="padding:6px 0;color:#64748b;">Chưa có lịch sử khớp lệnh. Hãy chọn một mã cổ phiếu và nhấn Mua để bắt đầu đầu tư!</div>';
      } else {
        domRefs.bawsaqLedgerBody.innerHTML = `
          <div style="font-weight:700;color:#cbd5e1;margin-bottom:4px;">NHẬT KÝ KHỚP LỆNH GẦN ĐÂY (${portfolio.tradesCount} giao dịch)</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:5px;">
            ${portfolio.ledger
              .slice(0, 6)
              .map(
                (item) => `
              <div style="background:rgba(15,23,42,0.7);padding:5px 8px;border-radius:6px;border:1px solid rgba(148,163,184,0.12);">
                <span style="color:${item.type === 'MUA' ? '#38bdf8' : '#fbbf24'};font-weight:700;">${item.type}</span>
                <strong>${item.shares} ${item.ticker}</strong> @ ${formatPrice(item.price)}
                ${item.type !== 'MUA' ? `<span style="color:${item.profit >= 0 ? '#34d399' : '#f87171'};">(${formatMoney(item.profit, true)})</span>` : ''}
              </div>`
              )
              .join('')}
          </div>`;
      }
    }

    renderBawsaqDynamicFigures();
    drawBawsaqChart();
  }

  function bindBawsaqChartHover() {
    const canvas = domRefs.bawsaqChartCanvas;
    if (!canvas || canvas._hoverBound) return;
    canvas._hoverBound = true;
    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const plotW = Math.max(80, rect.width - 14 - 64);
      const st = stockMarket.stocks[stockMarket.selectedTicker];
      if (!st) return;
      const total = Math.min(stockMarket.timeframe, st.candles.length + 1);
      const idx = Math.floor(((x - 14) / plotW) * total);
      stockMarket.hoverCandleIdx = idx >= 0 && idx < total ? idx : -1;
      drawBawsaqChart();
    });
    canvas.addEventListener('pointerleave', () => {
      stockMarket.hoverCandleIdx = -1;
      drawBawsaqChart();
    });
    canvas.addEventListener('click', (e) => {
      if (stockMarket.chartMode !== 'HEATMAP') return;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      for (let i = 0; i < heatmapTiles.length; i++) {
        const t = heatmapTiles[i];
        if (px >= t.x && px <= t.x + t.w && py >= t.y && py <= t.y + t.h) {
          stockMarket.selectedTicker = t.sym;
          stockMarket.chartMode = 'CANDLE';
          heistSFX.playHackClick(1.15);
          renderBawsaqUI();
          break;
        }
      }
    });
  }

  function openStockMarket(initialTicker = null) {
    ensureHeistsDOM();
    bindBawsaqChartHover();
    if (initialTicker && stockMarket.stocks[String(initialTicker).toUpperCase()]) {
      stockMarket.selectedTicker = String(initialTicker).toUpperCase();
    }
    activeCtx?.ui?.closePhone?.();
    exitPointerLockSafe();
    activeCtx.activeModal = 'stocks';
    domRefs.bawsaqModal?.classList.add('open');
    heistSFX.playHackClick(1.15);
    renderBawsaqUI();
    return true;
  }

  function closeStockMarket() {
    if (domRefs.bawsaqModal) domRefs.bawsaqModal.classList.remove('open');
    if (activeCtx?.activeModal === 'stocks') {
      activeCtx.activeModal = null;
    }
    return true;
  }

  // ==========================================================================
  // 7. INTERACTIVE HEIST HACKING & VAULT DRILLING CANVAS SUITE
  //    Sets ctx.activeModal = 'heist_hack' (Bank Laser Drill & Casino Biometric)
  // ==========================================================================
  const hackGame = {
    active: false,
    mode: null, // 'bank_drill' | 'casino_fingerprint'
    onSuccess: null,
    onCancel: null,
    elapsed: 0,
    timeLeft: 45.0,
    maxTime: 45.0,
    completed: false,
    completeDelay: 0,
    pointerDown: false,
    pointerX: 480,
    pointerY: 270,
    keysHeld: {},
    clickableRects: [],

    // Mode 1: Linh Thạch Bảo Khố Laser-Thermal Vault Drill
    drill: {
      pinIndex: 0,
      totalPins: 4,
      pins: [
        { progress: 0, sweetCenter: 0.52, sweetHalf: 0.16, hardness: 1.0, broken: false },
        { progress: 0, sweetCenter: 0.60, sweetHalf: 0.145, hardness: 1.15, broken: false },
        { progress: 0, sweetCenter: 0.46, sweetHalf: 0.135, hardness: 1.28, broken: false },
        { progress: 0, sweetCenter: 0.64, sweetHalf: 0.125, hardness: 1.42, broken: false }
      ],
      pressure: 0.35, // 0..1 forward pressure
      targetPressure: 0.35,
      rpm: 0, // 0..1 spindle speed
      laserToggle: false,
      autoAlignAssist: false,
      heat: 0, // 0..1
      overheated: false,
      overheatTimer: 0,
      overheatCount: 0,
      coolPurgeCooldown: 0,
      chuckAngle: 0,
      bitShakeX: 0,
      bitShakeY: 0,
      sparks: [],
      smokes: []
    },

    // Mode 2: Vạn Bảo Đổ Phường Biometric Fingerprint Matrix + Laser Mirror Grid
    bio: {
      subStage: 'fingerprint', // 'fingerprint' | 'laser_grid'
      templateId: 0,
      selectedRow: 0,
      sliceOffsets: [3, 5, 2, 6], // 0 === exact match for each of the 4 segments!
      rowLocked: [false, false, false, false],
      scanWaveY: 0,
      verifyFlash: 0,
      verifyErrorFlash: 0,
      masterCanvas: null,
      decoyCanvases: [],
      // Stage B: 5x4 Optical Mirror Relay Grid
      gridCols: 5,
      gridRows: 4,
      sourceRow: 1,
      targetRow: 2,
      // cell: 0 = empty, 1 = '/' mirror, 2 = '\' mirror, 9 = firewall block
      cells: [],
      laserPath: [],
      laserReachedTarget: false
    }
  };

  function buildFingerprintCanvases(seedBase = 5109) {
    if (typeof document === 'undefined') return;
    const W = 240;
    const H = 300;

    function renderPrintVariant(variantSeed, warpShift = 0) {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const g = c.getContext('2d');
      if (!g) return c;

      const rng = createSeededRNG(variantSeed);
      g.fillStyle = '#041019';
      g.fillRect(0, 0, W, H);

      // Subtle biometric scan grid
      g.strokeStyle = 'rgba(34, 211, 238, 0.08)';
      g.lineWidth = 1;
      for (let x = 0; x < W; x += 20) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, H);
        g.stroke();
      }
      for (let y = 0; y < H; y += 20) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W, y);
        g.stroke();
      }

      const cx = W * 0.5 + warpShift * 9;
      const cy = H * 0.48 - warpShift * 6;

      // Concentric swirling dermal friction ridges
      for (let r = 10; r < 142; r += 6.2) {
        g.strokeStyle = r % 12 < 6 ? '#22d3ee' : '#10b981';
        g.lineWidth = 2.2;
        const segments = 5;
        const baseGap = rng() * Math.PI * 2;
        for (let s = 0; s < segments; s++) {
          const a0 = baseGap + (s * Math.PI * 2) / segments + 0.09;
          const a1 = baseGap + ((s + 0.84) * Math.PI * 2) / segments;
          g.beginPath();
          for (let a = a0; a <= a1; a += 0.08) {
            const swirl = Math.sin(a * (2 + (variantSeed % 3)) + r * 0.055) * (4.5 + warpShift * 2.2);
            const rx = (r + swirl) * 0.82;
            const ry = (r + swirl * 0.7) * 1.06;
            const px = cx + Math.cos(a) * rx;
            const py = cy + Math.sin(a) * ry;
            if (a === a0) g.moveTo(px, py);
            else g.lineTo(px, py);
          }
          g.stroke();
        }
      }

      // Minutiae ridge bifurcation markers
      g.strokeStyle = 'rgba(250, 204, 21, 0.78)';
      g.lineWidth = 1.4;
      for (let m = 0; m < 7; m++) {
        const mx = 42 + rng() * (W - 84);
        const my = 36 + rng() * (H - 72);
        g.strokeRect(mx - 5, my - 5, 10, 10);
      }

      return c;
    }

    hackGame.bio.masterCanvas = renderPrintVariant(seedBase, 0);
    hackGame.bio.decoyCanvases = [hackGame.bio.masterCanvas];
    for (let k = 1; k < 8; k++) {
      hackGame.bio.decoyCanvases.push(renderPrintVariant(seedBase + k * 977, (k - 4) * 0.65));
    }
  }

  function initLaserMirrorPuzzle() {
    // 5 cols x 4 rows optical routing puzzle:
    // Source enters at (col=0, row=1) heading RIGHT (dx=1, dy=0).
    // Receiver sits outside right edge of (col=4, row=2) expecting beam heading RIGHT!
    // Solution path:
    //   (0,1) -> (1,1) ['\' = 2] -> goes DOWN to (1,3) ['\' = 2] -> goes RIGHT to (3,3) ['/' = 1]
    //   -> goes UP to (3,2) ['/' = 1] -> goes RIGHT through (4,2) -> TARGET!
    // We pre-set 2 mirrors correctly and scramble 2 mirrors by 1 click so player solves in 2 clicks (or 1s)!
    hackGame.bio.gridCols = 5;
    hackGame.bio.gridRows = 4;
    hackGame.bio.sourceRow = 1;
    hackGame.bio.targetRow = 2;
    hackGame.bio.cells = [
      [0, 0, 9, 0, 0],
      [0, 1, 9, 0, 0], // (1,1) needs to be toggled from 1 ('/') -> 2 ('\')!
      [0, 0, 9, 2, 0], // (3,2) needs to be toggled from 2 ('\') -> 1 ('/')!
      [9, 2, 0, 1, 0]  // (1,3)=2 ('\') and (3,3)=1 ('/') already aligned!
    ];
    recomputeLaserGridPath();
  }

  function recomputeLaserGridPath() {
    const bio = hackGame.bio;
    const path = [{ col: -0.5, row: bio.sourceRow }];
    let c = 0;
    let r = bio.sourceRow;
    let dx = 1;
    let dy = 0;
    let reached = false;
    let safety = 0;

    while (safety++ < 32) {
      if (c < 0 || c >= bio.gridCols || r < 0 || r >= bio.gridRows) {
        if (c === bio.gridCols && r === bio.targetRow && dx === 1 && dy === 0) {
          path.push({ col: bio.gridCols - 0.35, row: r });
          reached = true;
        } else {
          path.push({ col: clamp(c - dx * 0.45, -0.45, bio.gridCols - 0.55), row: clamp(r - dy * 0.45, -0.45, bio.gridRows - 0.55) });
        }
        break;
      }

      const cell = bio.cells[r][c];
      path.push({ col: c, row: r });

      if (cell === 9) {
        // Blocked by security firewall node
        break;
      } else if (cell === 1) {
        // '/' mirror: (1,0)->(0,-1), (-1,0)->(0,1), (0,1)->(-1,0), (0,-1)->(1,0)
        const ndx = -dy;
        const ndy = -dx;
        dx = ndx;
        dy = ndy;
      } else if (cell === 2) {
        // '\' mirror: (1,0)->(0,1), (-1,0)->(0,-1), (0,1)->(1,0), (0,-1)->(-1,0)
        const ndx = dy;
        const ndy = dx;
        dx = ndx;
        dy = ndy;
      }

      c += dx;
      r += dy;
    }

    bio.laserPath = path;
    bio.laserReachedTarget = reached;
    return reached;
  }

  function openHackMinigame(mode, onSuccess, onCancel = null) {
    ensureHeistsDOM();
    bindHackCanvasEvents();

    hackGame.active = true;
    hackGame.mode = mode === 'casino_fingerprint' ? 'casino_fingerprint' : 'bank_drill';
    hackGame.onSuccess = onSuccess;
    hackGame.onCancel = onCancel;
    hackGame.elapsed = 0;
    hackGame.completed = false;
    hackGame.completeDelay = 0;
    hackGame.clickableRects = [];
    hackGame.pointerDown = false;

    exitPointerLockSafe();
    activeCtx.activeModal = 'heist_hack';

    if (hackGame.mode === 'bank_drill') {
      hackGame.maxTime = 95.0;
      hackGame.timeLeft = 95.0;
      const d = hackGame.drill;
      d.pinIndex = 0;
      d.pressure = 0.25;
      d.targetPressure = 0.25;
      d.rpm = 0;
      d.laserToggle = false;
      d.autoAlignAssist = false;
      d.heat = 0;
      d.overheated = false;
      d.overheatTimer = 0;
      d.overheatCount = 0;
      d.coolPurgeCooldown = 0;
      d.sparks.length = 0;
      d.smokes.length = 0;
      const presets = [0.50, 0.58, 0.45, 0.62];
      for (let i = 0; i < 4; i++) {
        d.pins[i].progress = 0;
        d.pins[i].broken = false;
        d.pins[i].sweetCenter = presets[i];
        d.pins[i].sweetHalf = 0.165 - i * 0.01;
        d.pins[i].hardness = 1.0 + i * 0.14;
      }

      if (domRefs.hackTitle) domRefs.hackTitle.textContent = '🔦 KHOAN NHIỆT LASER KHO TIỀN PACIFIC STANDARD';
      if (domRefs.hackSub) {
        domRefs.hackSub.textContent =
          'Giữ Chuột Trái / [Space] để quay mũi khoan • Di chuột dọc hoặc [W/S] giữ Áp Lực trong Vùng Xanh • [R] Xả Khí Làm Mát!';
      }
      renderHackToolbar();
    } else {
      hackGame.maxTime = 45.0;
      hackGame.timeLeft = 45.0;
      const b = hackGame.bio;
      b.subStage = 'fingerprint';
      b.templateId = (b.templateId + 1) % 4;
      b.selectedRow = 0;
      b.sliceOffsets = [
        1 + randInt(0, 6),
        1 + randInt(0, 6),
        1 + randInt(0, 6),
        1 + randInt(0, 6)
      ];
      b.rowLocked = [false, false, false, false];
      b.verifyFlash = 0;
      b.verifyErrorFlash = 0;
      buildFingerprintCanvases(7411 + b.templateId * 313);
      initLaserMirrorPuzzle();

      if (domRefs.hackTitle) domRefs.hackTitle.textContent = '🧬 XÂM NHẬP SINH TRẮC & LƯỚI LASER HẦM NGẦM DIAMOND';
      if (domRefs.hackSub) {
        domRefs.hackSub.textContent =
          'Khớp 4 lát cắt vân tay với Mẫu Gốc bên trái trong 45 giây ([W/S] chọn hàng, [A/D] đổi lát, [Enter] Xác nhận) & nối mạch Laser!';
      }
      renderHackToolbar();
    }

    domRefs.hackModal?.classList.add('open');
    heistSFX.playHackClick(1.0);
    drawHackMinigameCanvas();
    return true;
  }

  function renderHackToolbar() {
    if (!domRefs.hackControlsBar) return;
    if (hackGame.mode === 'bank_drill') {
      const d = hackGame.drill;
      domRefs.hackControlsBar.innerHTML = `
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" id="gta-drill-toggle-btn" class="gta-ha-btn ${d.laserToggle ? 'red' : 'green'}">
            ${d.laserToggle ? '⚡ ĐANG BẬT TIA LASER (Nhấn tắt)' : '⚡ BẬT / GIỮ MŨI KHOAN LASER'}
          </button>
          <button type="button" id="gta-drill-cool-btn" class="gta-ha-btn">❄ Xả Làm Mát N2 [R]</button>
          <button type="button" id="gta-drill-sweet-btn" class="gta-ha-btn ghost">
            🎯 Ổn Định Áp Lực: ${d.autoAlignAssist ? 'BẬT' : 'TẮT'}
          </button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button type="button" id="gta-drill-charge-btn" class="gta-ha-btn gold">💥 Đặt Thuốc Nổ Nhiệt Nhanh (-$2,000)</button>
        </div>
      `;
      document.getElementById('gta-drill-toggle-btn')?.addEventListener('click', () => {
        d.laserToggle = !d.laserToggle;
        renderHackToolbar();
      });
      document.getElementById('gta-drill-cool-btn')?.addEventListener('click', () => triggerDrillCoolantPurge());
      document.getElementById('gta-drill-sweet-btn')?.addEventListener('click', () => {
        d.autoAlignAssist = !d.autoAlignAssist;
        renderHackToolbar();
      });
      document.getElementById('gta-drill-charge-btn')?.addEventListener('click', () => {
        if (getPlayerCash() >= 2000) {
          addPlayerCash(-2000, true);
        }
        solveActiveHack();
      });
    } else {
      const b = hackGame.bio;
      domRefs.hackControlsBar.innerHTML = `
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${
            b.subStage === 'fingerprint'
              ? `
            <button type="button" id="gta-bio-prev-btn" class="gta-ha-btn ghost">◀ Lát Trước [A]</button>
            <button type="button" id="gta-bio-next-btn" class="gta-ha-btn ghost">Lát Tiếp [D] ▶</button>
            <button type="button" id="gta-bio-row-btn" class="gta-ha-btn ghost">▼ Đổi Hàng #${b.selectedRow + 1} [S]</button>
            <button type="button" id="gta-bio-verify-btn" class="gta-ha-btn green">✔ XÁC NHẬN VÂN TAY [Enter]</button>`
              : `
            <span style="color:#34d399;font-weight:700;">✔ Đã khớp Sinh Trắc 100%! Click vào các gương phản xạ trên màn hình để dẫn tia Laser tới Ổ Khóa!</span>`
          }
        </div>
        <div>
          <button type="button" id="gta-bio-bypass-btn" class="gta-ha-btn gold">📡 USB Giải Mã Lester (-$2,500)</button>
        </div>
      `;
      document.getElementById('gta-bio-prev-btn')?.addEventListener('click', () => shiftFingerprintSlice(-1));
      document.getElementById('gta-bio-next-btn')?.addEventListener('click', () => shiftFingerprintSlice(1));
      document.getElementById('gta-bio-row-btn')?.addEventListener('click', () => {
        b.selectedRow = (b.selectedRow + 1) % 4;
        heistSFX.playHackClick(0.95);
        renderHackToolbar();
      });
      document.getElementById('gta-bio-verify-btn')?.addEventListener('click', () => verifyFingerprintMatch());
      document.getElementById('gta-bio-bypass-btn')?.addEventListener('click', () => {
        if (getPlayerCash() >= 2500) {
          addPlayerCash(-2500, true);
        }
        solveActiveHack();
      });
    }
  }

  function triggerDrillCoolantPurge() {
    const d = hackGame.drill;
    if (d.coolPurgeCooldown > 0) return false;
    d.coolPurgeCooldown = 5.5;
    d.heat = Math.max(0, d.heat - 0.44);
    if (d.overheated && d.heat < 0.35) {
      d.overheated = false;
      d.overheatTimer = 0;
    }
    for (let i = 0; i < 18; i++) {
      d.smokes.push({
        x: 340 + randRange(-25, 35),
        y: 268 + randRange(-24, 24),
        vx: randRange(-45, 45),
        vy: randRange(-95, -35),
        r: randRange(8, 18),
        life: randRange(0.45, 0.9),
        maxLife: 0.9,
        coolant: true
      });
    }
    heistSFX.playHackClick(1.35);
    return true;
  }

  function shiftFingerprintSlice(delta) {
    const b = hackGame.bio;
    if (b.subStage !== 'fingerprint') return;
    const r = clamp(b.selectedRow, 0, 3);
    b.sliceOffsets[r] = (b.sliceOffsets[r] + delta + 8) % 8;
    heistSFX.playHackClick(1.0 + r * 0.08);
    // Auto-advance if all 4 slices are aligned to 0!
    if (b.sliceOffsets.every((v) => v === 0)) {
      verifyFingerprintMatch();
    }
  }

  function verifyFingerprintMatch() {
    const b = hackGame.bio;
    if (b.subStage !== 'fingerprint') return false;
    const matchedCount = b.sliceOffsets.filter((v) => v === 0).length;
    if (matchedCount === 4) {
      heistSFX.playHackSuccess();
      b.verifyFlash = 0.65;
      b.subStage = 'laser_grid';
      recomputeLaserGridPath();
      renderHackToolbar();
      return true;
    }
    b.verifyErrorFlash = 0.55;
    hackGame.timeLeft = Math.max(3.0, hackGame.timeLeft - 2.5);
    heistSFX.playHackError();
    return false;
  }

  function advanceActiveHeistAfterHack() {
    if (!heistState.active || heistState.phase !== 2) return;
    heistState.phase = 3;
    heistState.vaultDoorOpen = true;
    heistSFX.playVaultOpen();
    if (heistState.id === 4) {
      heistState.subStep = 'loot_vault';
      if (activeCtx?.worldInfra) {
        activeCtx.worldInfra.bankVaultOpen = true;
        activeCtx.worldInfra.openBankVault?.();
      }
      notifyFeed('💰 CỬA KHO TIỀN ĐÃ MỞ! Vào trong gom sạch $65,000 Vàng & Tiền mặt!', 'green');
    } else if (heistState.id === 5) {
      heistState.subStep = 'loot_diamond_vault';
      heistState.nerveGasActive = true;
      heistState.nerveGasTimer = 55.0;
      notifyFeed(
        '💎 HẦM NGẦM KIM CƯƠNG ĐÃ MỞ! Nhanh chóng vét sạch $120,000 trước khi Khí Độc Thần Kinh phát tán (55s)!',
        'gold'
      );
    }
  }

  function solveActiveHack() {
    if (!hackGame.active) {
      if (heistState.active && heistState.phase === 2) {
        advanceActiveHeistAfterHack();
        return true;
      }
      return false;
    }
    if (hackGame.completed) return false;
    if (hackGame.mode === 'bank_drill') {
      for (const pin of hackGame.drill.pins) {
        pin.progress = 1;
        pin.broken = true;
      }
      hackGame.drill.pinIndex = 4;
    } else {
      hackGame.bio.sliceOffsets = [0, 0, 0, 0];
      hackGame.bio.subStage = 'laser_grid';
      hackGame.bio.cells[1][1] = 2;
      hackGame.bio.cells[2][3] = 1;
      recomputeLaserGridPath();
    }
    completeHackMinigame();
    return true;
  }

  function completeHackMinigame() {
    if (hackGame.completed) return;
    hackGame.completed = true;
    hackGame.completeDelay = 0.65;
    heistSFX.stopDrillLoop();
    heistSFX.playHackSuccess();

    if (hackGame.mode === 'bank_drill' && hackGame.drill.overheatCount === 0) {
      progressionStats.flawlessBankDrill = true;
    }
    if (hackGame.mode === 'casino_fingerprint' && hackGame.elapsed <= 20.0) {
      progressionStats.fastCasinoHack = true;
    }
  }

  function closeHackMinigame(succeeded = false) {
    heistSFX.stopDrillLoop();
    hackGame.active = false;
    hackGame.pointerDown = false;
    domRefs.hackModal?.classList.remove('open');
    if (activeCtx?.activeModal === 'heist_hack') {
      activeCtx.activeModal = null;
    }
    if (succeeded) {
      if (typeof hackGame.onSuccess === 'function') {
        const cb = hackGame.onSuccess;
        hackGame.onSuccess = null;
        cb();
      } else {
        advanceActiveHeistAfterHack();
      }
    } else if (typeof hackGame.onCancel === 'function') {
      const cancelCb = hackGame.onCancel;
      hackGame.onCancel = null;
      cancelCb();
    }
  }

  function bindHackCanvasEvents() {
    const canvas = domRefs.hackCanvas;
    if (!canvas || canvas._hackBound) return;
    canvas._hackBound = true;

    const toLogicalCoords = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = 960 / Math.max(1, rect.width);
      const scaleY = 540 / Math.max(1, rect.height);
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    canvas.addEventListener('pointerdown', (e) => {
      if (!hackGame.active) return;
      const pt = toLogicalCoords(e);
      hackGame.pointerX = pt.x;
      hackGame.pointerY = pt.y;
      hackGame.pointerDown = true;

      // Check interactive hit zones registered by Canvas renderer
      for (let i = 0; i < hackGame.clickableRects.length; i++) {
        const z = hackGame.clickableRects[i];
        if (pt.x >= z.x && pt.x <= z.x + z.w && pt.y >= z.y && pt.y <= z.y + z.h) {
          z.onClick();
          return;
        }
      }

      if (hackGame.mode === 'bank_drill') {
        hackGame.drill.targetPressure = clamp(1 - (pt.y - 95) / 350, 0.05, 0.98);
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!hackGame.active) return;
      const pt = toLogicalCoords(e);
      hackGame.pointerX = pt.x;
      hackGame.pointerY = pt.y;
      if (hackGame.mode === 'bank_drill' && !hackGame.drill.autoAlignAssist) {
        hackGame.drill.targetPressure = clamp(1 - (pt.y - 95) / 350, 0.04, 0.98);
      }
    });

    window.addEventListener('pointerup', () => {
      hackGame.pointerDown = false;
    });
  }

  function updateHackMinigame(rawDt) {
    if (!hackGame.active) return;
    const dt = clamp(rawDt, 0.001, 0.05);
    hackGame.elapsed += dt;

    if (hackGame.completed) {
      hackGame.completeDelay -= dt;
      drawHackMinigameCanvas();
      if (hackGame.completeDelay <= 0) {
        closeHackMinigame(true);
      }
      return;
    }

    // Update countdown timer
    hackGame.timeLeft = Math.max(0, hackGame.timeLeft - dt);
    if (domRefs.hackTimerBadge) {
      const s = hackGame.timeLeft;
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = (s % 60).toFixed(1).padStart(4, '0');
      domRefs.hackTimerBadge.textContent = `${mm}:${ss}`;
      domRefs.hackTimerBadge.classList.toggle('urgent', s <= 12.0);
    }

    if (hackGame.mode === 'bank_drill') {
      const d = hackGame.drill;
      if (d.coolPurgeCooldown > 0) d.coolPurgeCooldown = Math.max(0, d.coolPurgeCooldown - dt);

      const k = hackGame.keysHeld;
      if (k.KeyW || k.ArrowUp) {
        d.autoAlignAssist = false;
        d.targetPressure = clamp(d.targetPressure + 0.52 * dt, 0, 1);
      }
      if (k.KeyS || k.ArrowDown) {
        d.autoAlignAssist = false;
        d.targetPressure = clamp(d.targetPressure - 0.52 * dt, 0, 1);
      }

      const curPin = d.pins[d.pinIndex];
      if (curPin) {
        // Subtle harmonic drift of sweet spot as steel heats up
        curPin.sweetCenter = clamp(
          curPin.sweetCenter + Math.sin(hackGame.elapsed * 1.9 + d.pinIndex) * 0.045 * dt,
          0.26,
          0.78
        );
        if (d.autoAlignAssist) {
          d.targetPressure = curPin.sweetCenter;
        }
      }

      d.pressure = damp(d.pressure, d.targetPressure, 12, dt);

      if (d.overheated) {
        d.overheatTimer -= dt;
        d.rpm = damp(d.rpm, 0, 10, dt);
        d.heat = Math.max(0, d.heat - 0.34 * dt);
        if (d.overheatTimer <= 0) {
          d.overheated = false;
          d.heat = Math.min(d.heat, 0.25);
        }
        heistSFX.updateDrillLoop(false, 0, d.heat, false, true);
      } else {
        const spinning = Boolean(hackGame.pointerDown || k.Space || d.laserToggle);
        d.rpm = damp(d.rpm, spinning ? 1.0 : 0.0, 9.5, dt);
        d.chuckAngle += d.rpm * 38.0 * dt;

        let bitingSweet = false;
        let jamming = false;

        if (curPin && d.rpm > 0.25) {
          const diff = d.pressure - curPin.sweetCenter;
          const absDiff = Math.abs(diff);

          if (absDiff <= curPin.sweetHalf) {
            // Inside Sweet Spot: Fast clean thermal cutting + bright golden sparks!
            bitingSweet = true;
            const efficiency = 1.0 - (absDiff / curPin.sweetHalf) * 0.35;
            curPin.progress += (0.42 * d.rpm * efficiency / curPin.hardness) * dt;
            d.heat += (0.145 + d.pressure * 0.09) * d.rpm * dt;
          } else if (diff > curPin.sweetHalf) {
            // Over-pressure Jamming: Slow progress + rapid friction heat spike!
            jamming = true;
            curPin.progress += (0.09 * d.rpm / curPin.hardness) * dt;
            d.heat += (0.46 + diff * 0.55) * d.rpm * dt;
          } else {
            // Under-pressure: Skimming surface lightly
            curPin.progress += 0.045 * d.rpm * dt;
            d.heat += 0.06 * d.rpm * dt;
          }

          // Spawn molten metal cutting sparks
          if ((bitingSweet || jamming) && Math.random() < 0.85) {
            const pinX = 335 + d.pinIndex * 116;
            const pinY = 252 - curPin.progress * 44;
            for (let s = 0; s < (bitingSweet ? 3 : 2); s++) {
              d.sparks.push({
                x: pinX + randRange(-8, 8),
                y: pinY + randRange(-6, 6),
                vx: randRange(-170, 150),
                vy: randRange(-185, 65),
                life: randRange(0.22, 0.52),
                maxLife: 0.52,
                hot: bitingSweet
              });
            }
          }

          if (curPin.progress >= 1.0) {
            curPin.progress = 1.0;
            curPin.broken = true;
            heistSFX.playPinBreak(d.pinIndex + 1);
            d.heat = Math.max(0, d.heat - 0.14);
            d.pinIndex++;
            if (d.pinIndex >= d.totalPins) {
              completeHackMinigame();
              return;
            }
          }
        } else {
          // Passive air cooling when laser trigger is released
          d.heat = Math.max(0, d.heat - 0.26 * dt);
        }

        if (d.heat >= 1.0) {
          d.heat = 1.0;
          d.overheated = true;
          d.overheatTimer = 2.8;
          d.overheatCount++;
          d.laserToggle = false;
          heistSFX.playOverheatAlarm();
          renderHackToolbar();
        }

        const shakeAmp = d.overheated ? 5.5 : jamming ? 4.2 : bitingSweet ? 1.8 : d.rpm * 0.7;
        d.bitShakeX = (Math.random() - 0.5) * shakeAmp * 2;
        d.bitShakeY = (Math.random() - 0.5) * shakeAmp * 2;
        heistSFX.updateDrillLoop(d.rpm > 0.1, d.rpm, d.heat, bitingSweet || jamming, d.overheated);
      }

      // Step spark & smoke particles
      for (let i = d.sparks.length - 1; i >= 0; i--) {
        const sp = d.sparks[i];
        sp.life -= dt;
        sp.vy += 390 * dt;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        if (sp.life <= 0) d.sparks.splice(i, 1);
      }
      for (let i = d.smokes.length - 1; i >= 0; i--) {
        const sm = d.smokes[i];
        sm.life -= dt;
        sm.x += sm.vx * dt;
        sm.y += sm.vy * dt;
        sm.r += 14 * dt;
        if (sm.life <= 0) d.smokes.splice(i, 1);
      }

      if (hackGame.timeLeft <= 0) {
        // Reset timer with extra police alert heat rather than softlocking the player
        hackGame.timeLeft = 45.0;
        notifyFeed('🚨 Chuông báo động kho tiền vang lên — Tiếp tục khoan xuyên chốt cuối!', 'red');
      }
    } else {
      // Casino Biometric Fingerprint & Laser-Grid Mode
      const b = hackGame.bio;
      b.scanWaveY = (b.scanWaveY + 145 * dt) % 300;
      if (b.verifyFlash > 0) b.verifyFlash = Math.max(0, b.verifyFlash - dt);
      if (b.verifyErrorFlash > 0) b.verifyErrorFlash = Math.max(0, b.verifyErrorFlash - dt);

      if (b.subStage === 'laser_grid' && b.laserReachedTarget) {
        completeHackMinigame();
        return;
      }

      if (hackGame.timeLeft <= 0) {
        // Scramble slices & grant fresh 40s window + alarm warning
        hackGame.timeLeft = 40.0;
        b.sliceOffsets = [1 + randInt(0, 5), 1 + randInt(0, 5), 1 + randInt(0, 5), 1 + randInt(0, 5)];
        b.subStage = 'fingerprint';
        heistSFX.playHackError();
        renderHackToolbar();
        notifyFeed('⚠ Hết 45s! SecuroServ đã đảo lại mã vân tay — Thử lại ngay!', 'red');
      }
    }

    drawHackMinigameCanvas();
  }

  function drawHackMinigameCanvas() {
    const canvas = domRefs.hackCanvas;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;

    const W = 960;
    const H = 540;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    hackGame.clickableRects.length = 0;

    if (hackGame.mode === 'bank_drill') {
      drawBankDrillCanvas(g, W, H);
    } else {
      drawCasinoBiometricCanvas(g, W, H);
    }

    if (hackGame.completed) {
      g.fillStyle = 'rgba(6, 78, 59, 0.78)';
      g.fillRect(0, 0, W, H);
      g.strokeStyle = '#34d399';
      g.lineWidth = 4;
      g.strokeRect(180, 195, 600, 150);
      g.fillStyle = '#ecfdf5';
      g.textAlign = 'center';
      g.font = '900 36px Segoe UI, sans-serif';
      g.fillText(
        hackGame.mode === 'bank_drill' ? 'ĐÃ KHOAN THỦNG KHOÁ KHO TIỀN!' : 'XÁC THỰC SINH TRẮC THÀNH CÔNG!',
        W * 0.5,
        262
      );
      g.fillStyle = '#fde047';
      g.font = '700 20px Segoe UI, sans-serif';
      g.fillText('Đang mở cửa thép thủy lực hạng nặng...', W * 0.5, 306);
    }
  }

  function drawBankDrillCanvas(g, W, H) {
    const d = hackGame.drill;

    // Blueprint dark engineering background
    g.fillStyle = '#060d18';
    g.fillRect(0, 0, W, H);

    g.strokeStyle = 'rgba(56, 189, 248, 0.07)';
    g.lineWidth = 1;
    for (let x = 0; x < W; x += 32) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, H);
      g.stroke();
    }
    for (let y = 0; y < H; y += 32) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }

    // Vault Titanium Lock Cylinder Cross-Section Housing (X: 230..750, Y: 75..410)
    const housingGrad = g.createLinearGradient(230, 80, 230, 410);
    housingGrad.addColorStop(0, '#1e293b');
    housingGrad.addColorStop(0.5, '#0f172a');
    housingGrad.addColorStop(1, '#1e293b');
    g.fillStyle = housingGrad;
    g.strokeStyle = '#475569';
    g.lineWidth = 3;
    g.fillRect(235, 82, 515, 325);
    g.strokeRect(235, 82, 515, 325);

    // Shear line channel where laser drill penetrates horizontally/vertically
    g.fillStyle = '#030712';
    g.fillRect(235, 236, 515, 58);
    g.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    g.setLineDash([6, 5]);
    g.beginPath();
    g.moveTo(235, 236);
    g.lineTo(750, 236);
    g.stroke();
    g.setLineDash([]);

    // Draw 4 Steel Tumbler Lock Pins
    for (let i = 0; i < d.totalPins; i++) {
      const p = d.pins[i];
      const px = 335 + i * 116;
      const shaftTop = 104;
      const shaftH = 192;

      // Pin chamber bore
      g.fillStyle = '#090f1c';
      g.fillRect(px - 26, shaftTop, 52, shaftH);
      g.strokeStyle = i === d.pinIndex ? '#38bdf8' : '#334155';
      g.lineWidth = i === d.pinIndex ? 2.2 : 1.2;
      g.strokeRect(px - 26, shaftTop, 52, shaftH);

      // Coiled brass spring at top of chamber
      g.strokeStyle = '#d97706';
      g.lineWidth = 2.4;
      const springBottom = p.broken ? shaftTop + 42 : shaftTop + 56 - p.progress * 18;
      g.beginPath();
      for (let sy = shaftTop + 8; sy <= springBottom; sy += 7) {
        const dir = ((sy - shaftTop) / 7) % 2 === 0 ? -14 : 14;
        if (sy === shaftTop + 8) g.moveTo(px + dir, sy);
        else g.lineTo(px + dir, sy);
      }
      g.stroke();

      // Hardened Steel Tumbler Pin (melts/retracts upward as progress -> 1)
      const pinRestBottom = 286;
      const cutY = pinRestBottom - p.progress * 50;
      const pinGrad = g.createLinearGradient(px - 18, 0, px + 18, 0);
      if (p.broken) {
        pinGrad.addColorStop(0, '#059669');
        pinGrad.addColorStop(0.5, '#34d399');
        pinGrad.addColorStop(1, '#059669');
      } else {
        pinGrad.addColorStop(0, '#64748b');
        pinGrad.addColorStop(0.5, '#e2e8f0');
        pinGrad.addColorStop(1, '#475569');
      }
      g.fillStyle = pinGrad;
      g.fillRect(px - 18, springBottom + 4, 36, Math.max(18, cutY - (springBottom + 4)));

      // Glowing molten orange tip on active pin
      if (i === d.pinIndex && !p.broken && d.rpm > 0.2) {
        g.fillStyle = `rgba(251, 146, 60, ${0.35 + d.heat * 0.6})`;
        g.fillRect(px - 19, cutY - 8, 38, 9);
      }

      // Pin status label
      g.textAlign = 'center';
      g.font = '800 12.5px Segoe UI, sans-serif';
      g.fillStyle = p.broken ? '#34d399' : i === d.pinIndex ? '#fde047' : '#94a3b8';
      g.fillText(
        p.broken ? `CHỐT #${i + 1} ✓` : `CHỐT #${i + 1} (${Math.round(p.progress * 100)}%)`,
        px,
        324
      );
    }

    // Draw Heavy Laser-Thermal Drill Bit advancing along shear channel!
    const activeIdx = Math.min(d.pinIndex, d.totalPins - 1);
    const activePin = d.pins[activeIdx];
    const tipTargetX = 335 + activeIdx * 116 + (d.pressure - 0.5) * 22 + d.bitShakeX;
    const tipY = 264 + d.bitShakeY;

    // Drill shaft & helical flutes entering from left (X: 35 -> tipTargetX)
    const shaftGrad = g.createLinearGradient(0, tipY - 18, 0, tipY + 18);
    shaftGrad.addColorStop(0, '#475569');
    shaftGrad.addColorStop(0.45, '#cbd5e1');
    shaftGrad.addColorStop(1, '#1e293b');
    g.fillStyle = shaftGrad;
    g.fillRect(42, tipY - 14, Math.max(40, tipTargetX - 66), 28);

    // Animated spinning flute stripes
    g.save();
    g.beginPath();
    g.rect(42, tipY - 14, Math.max(40, tipTargetX - 66), 28);
    g.clip();
    g.strokeStyle = '#0f172a';
    g.lineWidth = 5;
    const fluteShift = (d.chuckAngle * 9) % 28;
    for (let fx = 30 - fluteShift; fx < tipTargetX; fx += 28) {
      g.beginPath();
      g.moveTo(fx, tipY - 16);
      g.lineTo(fx + 16, tipY + 16);
      g.stroke();
    }
    g.restore();

    // Carbide conical drill tip (glows cherry-red to white-hot with heat!)
    g.beginPath();
    g.moveTo(tipTargetX - 24, tipY - 16);
    g.lineTo(tipTargetX + 8, tipY);
    g.lineTo(tipTargetX - 24, tipY + 16);
    g.closePath();
    const rCol = Math.round(lerp(180, 255, d.heat));
    const gCol = Math.round(lerp(195, 90, d.heat));
    const bCol = Math.round(lerp(215, 35, d.heat));
    g.fillStyle = `rgb(${rCol}, ${gCol}, ${bCol})`;
    g.fill();

    // High-energy Laser Core Beam when spinning
    if (d.rpm > 0.2 && !d.overheated) {
      g.strokeStyle = d.heat > 0.8 ? '#ef4444' : '#38bdf8';
      g.lineWidth = 3.5;
      g.beginPath();
      g.moveTo(tipTargetX + 6, tipY);
      g.lineTo(tipTargetX + 34, tipY - activePin.progress * 18);
      g.stroke();
    }

    // Render molten sparks & coolant smoke plumes
    for (let i = 0; i < d.sparks.length; i++) {
      const sp = d.sparks[i];
      const alpha = clamp(sp.life / sp.maxLife, 0, 1);
      g.fillStyle = sp.hot ? `rgba(253, 224, 71, ${alpha})` : `rgba(249, 115, 22, ${alpha})`;
      g.fillRect(sp.x - 2, sp.y - 2, 4, 4);
    }
    for (let i = 0; i < d.smokes.length; i++) {
      const sm = d.smokes[i];
      const alpha = clamp((sm.life / sm.maxLife) * 0.45, 0, 0.5);
      g.fillStyle = sm.coolant ? `rgba(125, 211, 252, ${alpha})` : `rgba(148, 163, 184, ${alpha})`;
      g.beginPath();
      g.arc(sm.x, sm.y, sm.r, 0, Math.PI * 2);
      g.fill();
    }

    // LEFT PANEL: Interactive Forward Pressure vs Sweet-Spot Bar (X: 56..190, Y: 82..435)
    g.fillStyle = 'rgba(15, 23, 42, 0.92)';
    g.strokeStyle = 'rgba(56, 189, 248, 0.32)';
    g.lineWidth = 1.5;
    g.fillRect(46, 82, 162, 368);
    g.strokeRect(46, 82, 162, 368);

    g.fillStyle = '#e2e8f0';
    g.textAlign = 'center';
    g.font = '800 12.5px Segoe UI, sans-serif';
    g.fillText('ÁP LỰC MŨI KHOAN', 127, 104);

    const barX = 104;
    const barY = 120;
    const barW = 46;
    const barH = 295;
    g.fillStyle = '#090f1d';
    g.fillRect(barX, barY, barW, barH);

    if (activePin) {
      const swTop = barY + (1 - (activePin.sweetCenter + activePin.sweetHalf)) * barH;
      const swBot = barY + (1 - (activePin.sweetCenter - activePin.sweetHalf)) * barH;
      g.fillStyle = 'rgba(16, 185, 129, 0.36)';
      g.fillRect(barX, swTop, barW, swBot - swTop);
      g.strokeStyle = '#10b981';
      g.lineWidth = 2;
      g.strokeRect(barX, swTop, barW, swBot - swTop);

      // Over-pressure jam danger zone above sweet spot
      g.fillStyle = 'rgba(239, 68, 68, 0.20)';
      g.fillRect(barX, barY, barW, Math.max(0, swTop - barY));
    }

    // Live Pressure Needle
    const needleY = barY + (1 - d.pressure) * barH;
    g.fillStyle = '#fde047';
    g.fillRect(barX - 10, needleY - 4, barW + 20, 8);
    g.fillStyle = '#94a3b8';
    g.font = '700 11.5px Segoe UI, sans-serif';
    g.fillText(`${Math.round(d.pressure * 100)}% Lực Ép`, 127, 435);

    // RIGHT PANEL: Thermal Heat Gauge & RPM Readout (X: 775..930, Y: 82..450)
    g.fillStyle = 'rgba(15, 23, 42, 0.92)';
    g.strokeStyle = d.overheated ? '#ef4444' : 'rgba(56, 189, 248, 0.32)';
    g.lineWidth = 1.5;
    g.fillRect(774, 82, 152, 368);
    g.strokeRect(774, 82, 152, 368);

    g.fillStyle = '#e2e8f0';
    g.font = '800 12.5px Segoe UI, sans-serif';
    g.fillText('NHIỆT ĐỘ KHOAN', 850, 104);

    const hBarX = 828;
    const hBarY = 120;
    const hBarW = 44;
    const hBarH = 250;
    g.fillStyle = '#090f1d';
    g.fillRect(hBarX, hBarY, hBarW, hBarH);

    const fillH = d.heat * hBarH;
    const heatGrad = g.createLinearGradient(0, hBarY + hBarH, 0, hBarY);
    heatGrad.addColorStop(0, '#0ea5e9');
    heatGrad.addColorStop(0.6, '#f59e0b');
    heatGrad.addColorStop(1, '#ef4444');
    g.fillStyle = heatGrad;
    g.fillRect(hBarX, hBarY + hBarH - fillH, hBarW, fillH);
    g.strokeStyle = '#475569';
    g.strokeRect(hBarX, hBarY, hBarW, hBarH);

    g.fillStyle = d.heat > 0.82 ? '#f87171' : '#f8fafc';
    g.font = '800 15px Segoe UI, sans-serif';
    g.fillText(`${Math.round(d.heat * 100)}°C`, 850, 394);
    g.fillStyle = '#38bdf8';
    g.font = '700 12px Segoe UI, sans-serif';
    g.fillText(`${Math.round(d.rpm * 11800).toLocaleString()} RPM`, 850, 418);

    if (d.overheated) {
      g.fillStyle = 'rgba(220, 38, 38, 0.9)';
      g.fillRect(320, 432, 345, 44);
      g.fillStyle = '#ffffff';
      g.font = '900 17px Segoe UI, sans-serif';
      g.fillText(`⚠ QUÁ NHIỆT MŨI KHOAN! Chờ ${d.overheatTimer.toFixed(1)}s`, 492, 460);
    } else {
      g.fillStyle = '#94a3b8';
      g.font = '600 13px Segoe UI, sans-serif';
      g.fillText(
        `Chốt khóa đã phá: ${d.pinIndex} / ${d.totalPins} • Xả N2: ${d.coolPurgeCooldown > 0 ? d.coolPurgeCooldown.toFixed(1) + 's' : 'SẴN SÀNG [R]'}`,
        492,
        458
      );
    }
  }

  function drawCasinoBiometricCanvas(g, W, H) {
    const b = hackGame.bio;

    g.fillStyle = '#030b12';
    g.fillRect(0, 0, W, H);

    // Subtle SecuroServ emerald matrix header bar
    g.fillStyle = 'rgba(16, 185, 129, 0.12)';
    g.fillRect(0, 0, W, 42);
    g.fillStyle = '#34d399';
    g.textAlign = 'left';
    g.font = '800 14px Consolas, monospace';
    g.fillText(
      `SECUROSERV BIOMETRIC OS v4.2  //  GIAI ĐOẠN: ${b.subStage === 'fingerprint' ? '1/2 QUÉT VÂN TAY 4 LỚP' : '2/2 ĐỊNH TUYẾN GƯƠNG LASER'}`,
      22,
      26
    );

    if (b.subStage === 'fingerprint') {
      // Left Panel: Master Fingerprint Reference (X: 54, Y: 82, 240x300)
      g.fillStyle = '#071521';
      g.strokeStyle = '#10b981';
      g.lineWidth = 2;
      g.fillRect(54, 82, 240, 300);
      if (b.masterCanvas) {
        g.drawImage(b.masterCanvas, 54, 82);
      }
      // Sweeping biometric laser scanline
      g.fillStyle = 'rgba(52, 211, 153, 0.55)';
      g.fillRect(54, 82 + b.scanWaveY, 240, 3);
      g.strokeRect(54, 82, 240, 300);

      g.fillStyle = '#a7f3d0';
      g.textAlign = 'center';
      g.font = '800 13px Segoe UI, sans-serif';
      g.fillText('MẪU VÂN TAY GỐC VIP', 174, 408);

      // Center Panel: 4 Scrambled Fingerprint Slices (X: 390, Y: 82, 240x300, 75px tall each!)
      const sliceX = 390;
      const sliceY = 82;
      const sliceW = 240;
      const sliceH = 75;

      for (let r = 0; r < 4; r++) {
        const sy = sliceY + r * sliceH;
        const variantIdx = b.sliceOffsets[r];
        const srcCanvas = b.decoyCanvases[variantIdx] || b.masterCanvas;
        const isSelected = r === b.selectedRow;
        const isExact = variantIdx === 0;

        if (srcCanvas) {
          g.drawImage(srcCanvas, 0, r * sliceH, sliceW, sliceH, sliceX, sy, sliceW, sliceH);
        }

        g.strokeStyle = isSelected ? '#fde047' : isExact ? 'rgba(52, 211, 153, 0.7)' : 'rgba(56, 189, 248, 0.35)';
        g.lineWidth = isSelected ? 3 : 1.4;
        g.strokeRect(sliceX, sy, sliceW, sliceH);

        // Left '<' button on Canvas
        const leftBtn = { x: sliceX - 50, y: sy + 16, w: 40, h: 42 };
        g.fillStyle = isSelected ? '#0284c7' : '#1e293b';
        g.fillRect(leftBtn.x, leftBtn.y, leftBtn.w, leftBtn.h);
        g.strokeStyle = '#38bdf8';
        g.lineWidth = 1.2;
        g.strokeRect(leftBtn.x, leftBtn.y, leftBtn.w, leftBtn.h);
        g.fillStyle = '#f8fafc';
        g.font = '900 18px Segoe UI, sans-serif';
        g.fillText('◀', leftBtn.x + 20, leftBtn.y + 27);

        hackGame.clickableRects.push({
          ...leftBtn,
          onClick: () => {
            b.selectedRow = r;
            shiftFingerprintSlice(-1);
          }
        });

        // Right '>' button on Canvas
        const rightBtn = { x: sliceX + sliceW + 10, y: sy + 16, w: 40, h: 42 };
        g.fillStyle = isSelected ? '#0284c7' : '#1e293b';
        g.fillRect(rightBtn.x, rightBtn.y, rightBtn.w, rightBtn.h);
        g.strokeStyle = '#38bdf8';
        g.strokeRect(rightBtn.x, rightBtn.y, rightBtn.w, rightBtn.h);
        g.fillStyle = '#f8fafc';
        g.fillText('▶', rightBtn.x + 20, rightBtn.y + 27);

        hackGame.clickableRects.push({
          ...rightBtn,
          onClick: () => {
            b.selectedRow = r;
            shiftFingerprintSlice(1);
          }
        });

        // Clicking slice body selects that row
        hackGame.clickableRects.push({
          x: sliceX,
          y: sy,
          w: sliceW,
          h: sliceH,
          onClick: () => {
            b.selectedRow = r;
            shiftFingerprintSlice(1);
          }
        });
      }

      g.fillStyle = '#fde047';
      g.font = '800 13px Segoe UI, sans-serif';
      g.fillText('CLICK ◀ / ▶ ĐỂ KHỚP 4 LÁT VÂN TAY', sliceX + sliceW * 0.5, 408);

      // Right Panel: Live Signal Match Meter & Big Verify Button
      const matched = b.sliceOffsets.filter((v) => v === 0).length;
      const pct = matched * 25;

      g.fillStyle = 'rgba(15, 23, 42, 0.92)';
      g.strokeStyle = b.verifyErrorFlash > 0 ? '#ef4444' : 'rgba(52, 211, 153, 0.4)';
      g.lineWidth = 2;
      g.fillRect(708, 82, 212, 300);
      g.strokeRect(708, 82, 212, 300);

      g.fillStyle = '#94a3b8';
      g.font = '700 12.5px Segoe UI, sans-serif';
      g.fillText('ĐỘ TƯƠNG ĐỒNG SINH TRẮC', 814, 114);

      g.fillStyle = pct === 100 ? '#34d399' : '#38bdf8';
      g.font = '900 44px Segoe UI, sans-serif';
      g.fillText(`${pct}%`, 814, 172);

      // 4 Segment lock LEDs
      for (let r = 0; r < 4; r++) {
        const ok = b.sliceOffsets[r] === 0;
        g.fillStyle = ok ? 'rgba(16, 185, 129, 0.25)' : 'rgba(30, 41, 59, 0.85)';
        g.fillRect(728, 196 + r * 30, 172, 24);
        g.fillStyle = ok ? '#34d399' : '#cbd5e1';
        g.font = '700 12px Segoe UI, sans-serif';
        g.fillText(`Lát #${r + 1}: ${ok ? 'KHỚP CHÍNH XÁC ✓' : `Lệch pha (${b.sliceOffsets[r]}/8)`}`, 814, 212 + r * 30);
      }

      const vBtn = { x: 726, y: 328, w: 176, h: 42 };
      g.fillStyle = pct === 100 ? '#10b981' : '#0284c7';
      g.fillRect(vBtn.x, vBtn.y, vBtn.w, vBtn.h);
      g.fillStyle = '#ffffff';
      g.font = '800 13.5px Segoe UI, sans-serif';
      g.fillText('XÁC NHẬN QUÉT [Enter]', 814, 354);
      hackGame.clickableRects.push({
        ...vBtn,
        onClick: () => verifyFingerprintMatch()
      });
    } else {
      // Stage B: 5x4 Optical Laser-Grid Mirror Relay Lock
      const gx0 = 210;
      const gy0 = 86;
      const cellS = 92;

      g.fillStyle = '#fde047';
      g.textAlign = 'center';
      g.font = '800 16px Segoe UI, sans-serif';
      g.fillText('CLICK XOAY GƯƠNG QUANG HỌC ĐỂ DẪN TIA LASER XANH VÀO Ổ KHÓA BÊN PHẢI!', W * 0.5, 68);

      // Emitter on left of sourceRow
      const emY = gy0 + (b.sourceRow + 0.5) * cellS;
      g.fillStyle = '#10b981';
      g.fillRect(gx0 - 48, emY - 16, 44, 32);
      g.fillStyle = '#052e16';
      g.font = '900 11px Segoe UI, sans-serif';
      g.fillText('LASER', gx0 - 26, emY + 4);

      // Target Solenoid on right of targetRow
      const tgY = gy0 + (b.targetRow + 0.5) * cellS;
      g.fillStyle = b.laserReachedTarget ? '#fbbf24' : '#1e293b';
      g.strokeStyle = '#fbbf24';
      g.lineWidth = 2.5;
      g.fillRect(gx0 + b.gridCols * cellS + 6, tgY - 22, 68, 44);
      g.strokeRect(gx0 + b.gridCols * cellS + 6, tgY - 22, 68, 44);
      g.fillStyle = b.laserReachedTarget ? '#0f172a' : '#fde047';
      g.font = '900 12px Segoe UI, sans-serif';
      g.fillText('Ổ KHÓA', gx0 + b.gridCols * cellS + 40, tgY + 4);

      // Draw 5x4 optical cells
      for (let r = 0; r < b.gridRows; r++) {
        for (let c = 0; c < b.gridCols; c++) {
          const cx = gx0 + c * cellS;
          const cy = gy0 + r * cellS;
          const val = b.cells[r][c];

          g.fillStyle = val === 9 ? '#27121b' : '#091524';
          g.strokeStyle = 'rgba(56, 189, 248, 0.28)';
          g.lineWidth = 1.5;
          g.fillRect(cx + 3, cy + 3, cellS - 6, cellS - 6);
          g.strokeRect(cx + 3, cy + 3, cellS - 6, cellS - 6);

          if (val === 9) {
            // Red Security Firewall Block
            g.strokeStyle = '#ef4444';
            g.lineWidth = 2.5;
            g.strokeRect(cx + 16, cy + 16, cellS - 32, cellS - 32);
            g.fillStyle = '#f87171';
            g.font = '800 11px Segoe UI, sans-serif';
            g.fillText('TƯỜNG LỬA', cx + cellS * 0.5, cy + cellS * 0.5 + 4);
          } else {
            if (val === 1 || val === 2) {
              // Optical Prism Mirror ('/' = 1, '\' = 2)
              g.strokeStyle = '#38bdf8';
              g.lineWidth = 6;
              g.beginPath();
              if (val === 1) {
                g.moveTo(cx + 20, cy + cellS - 20);
                g.lineTo(cx + cellS - 20, cy + 20);
              } else {
                g.moveTo(cx + 20, cy + 20);
                g.lineTo(cx + cellS - 20, cy + cellS - 20);
              }
              g.stroke();
            } else {
              g.fillStyle = 'rgba(148, 163, 184, 0.22)';
              g.beginPath();
              g.arc(cx + cellS * 0.5, cy + cellS * 0.5, 5, 0, Math.PI * 2);
              g.fill();
            }

            hackGame.clickableRects.push({
              x: cx,
              y: cy,
              w: cellS,
              h: cellS,
              onClick: () => {
                b.cells[r][c] = (b.cells[r][c] + 1) % 3;
                heistSFX.playHackClick(1.18);
                recomputeLaserGridPath();
              }
            });
          }
        }
      }

      // Draw glowing emerald laser ray along computed path
      if (b.laserPath.length >= 2) {
        g.save();
        g.strokeStyle = '#10b981';
        g.shadowColor = '#34d399';
        g.shadowBlur = 12;
        g.lineWidth = 4.5;
        g.beginPath();
        for (let i = 0; i < b.laserPath.length; i++) {
          const pt = b.laserPath[i];
          const px = gx0 + (pt.col + 0.5) * cellS;
          const py = gy0 + (pt.row + 0.5) * cellS;
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.stroke();
        g.restore();
      }
    }
  }

  // ==========================================================================
  // 8. GRAND HEISTS #4 (PACIFIC STANDARD BANK) & #5 (DIAMOND CASINO VAULT)
  // ==========================================================================
  const HEIST_COORDS = {
    bankExterior: { x: 111.0, y: 0.22, z: -120.0 },
    bankSpawnInside: { x: 2100.0, y: 0.05, z: 2111.0 },
    bankExitInside: { x: 2100.0, y: 0.05, z: 2113.6 },
    bankVaultDoor: { x: 2100.0, y: 0.05, z: 2087.6 },
    bankBreachExitOutside: { x: 111.0, y: 0.22, z: -115.5 },
    marinaDock: { x: -218.0, y: 0.15, z: 95.0 },
    oceanEscapeZone: { x: -292.0, y: 0.0, z: 98.0 },

    casinoSideCorona: { x: 209.5, y: 0.22, z: -92.0 },
    casinoInfilInside: { x: 1200.0, y: 0.05, z: 1181.5 },
    casinoVaultKeypad: { x: 1200.0, y: 0.05, z: 1157.6 },
    casinoExitInside: { x: 1200.0, y: 0.05, z: 1221.2 },
    casinoExitOutside: { x: 206.5, y: 0.22, z: -92.0 },
    casinoHelipad: { x: 195.0, y: 0.25, z: -138.0 },
    casinoGetawayCar: { x: 201.5, y: 0.05, z: -87.5 },
    observatoryDropoff: { x: 68.0, y: 28.0, z: -245.0 },
    safehouseDropoff: { x: 24.0, y: 0.22, z: -80.0 }
  };

  const heistState = {
    active: false,
    id: 0, // 4 = Linh Thạch Bảo Khố ($65,000), 5 = Vạn Bảo Đổ Phường Vault ($120,000)
    title: '',
    phase: 0,
    subStep: '',
    objective: '',
    rewardMax: 0,
    lootBag: 0,
    crowdControl: 100, // 0..100% lobby hostage intimidation
    nerveGasTimer: 55.0,
    nerveGasActive: false,
    vaultDoorOpen: false,
    vaultOpenAnim: 0,
    guards: [],
    hostages: [],
    lootCarts: [],
    laserTraps: [],
    spawnedVehicles: [],
    gasParticles: [],
    tracers: [],
    barkTimer: 0,
    bankCoronaMesh: null,
    casinoCoronaMesh: null,
    stageObjectiveCorona: null,
    bankInteriorGroup: null,
    casinoVaultWingGroup: null,
    customBoatActive: false
  };

  const GUARD_COMBAT_BARKS = [
    'Phát hiện đột nhập vũ trang! Khóa chặt cửa hầm tiền ngay!',
    'Bắn áp chế hắn! Đừng để hắn tiếp cận bảng mã khóa!',
    'Gọi đội đặc nhiệm NOOSE chi viện khẩn cấp!',
    'Giữ vững vị trí yểm trợ — Không được lùi bước!'
  ];

  function ensureGameplayEnemyBucket() {
    if (activeCtx?.gameplay) {
      if (!Array.isArray(activeCtx.gameplay.missionEnemies)) {
        activeCtx.gameplay.missionEnemies = [];
      }
      return activeCtx.gameplay.missionEnemies;
    }
    return null;
  }

  function buildHeistArchitectureAndCoronas() {
    const scene = getScene();
    if (!scene) return;
    if (!heistRoot.parent) scene.add(heistRoot);

    // 1. Exterior Trigger Coronas for Đại Kiếp Bảo Khố #4 & #5
    if (!heistState.bankCoronaMesh) {
      const bc = createWorldCorona3D(0x10b981, '🏦 PHI VỤ NGÂN HÀNG', 'THƯỞNG $65,000 • [F]');
      bc.position.set(
        HEIST_COORDS.bankExterior.x,
        getGroundY(HEIST_COORDS.bankExterior.x, HEIST_COORDS.bankExterior.z, 0.22),
        HEIST_COORDS.bankExterior.z
      );
      heistRoot.add(bc);
      heistState.bankCoronaMesh = bc;
    }

    if (!heistState.casinoCoronaMesh) {
      const cc = createWorldCorona3D(0xc084fc, '💎 HẦM NGẦM CASINO', 'THƯỞNG $120,000 • [F]');
      cc.position.set(
        HEIST_COORDS.casinoSideCorona.x,
        getGroundY(HEIST_COORDS.casinoSideCorona.x, HEIST_COORDS.casinoSideCorona.z, 0.22),
        HEIST_COORDS.casinoSideCorona.z
      );
      heistRoot.add(cc);
      heistState.casinoCoronaMesh = cc;
    }

    if (!heistState.stageObjectiveCorona) {
      const sc = createWorldCorona3D(0xfbbf24, '', '', false);
      sc.visible = false;
      heistRoot.add(sc);
      heistState.stageObjectiveCorona = sc;
    }

    // 2. Linh Thạch Bảo Khố Tactical Heist Props & Vault Chamber at (2100, 0, 2100)
    if (!heistState.bankInteriorGroup) {
      const bg = new THREE.Group();
      bg.position.set(2100, 0, 2100);

      // Subtle fallback marble floor & vault annex in case worldInfra vault chamber doesn't extend to Z = 2075
      const marbleMat = new THREE.MeshStandardMaterial({ color: 0x1e2530, roughness: 0.28, metalness: 0.15 });
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a3342, roughness: 0.55, metalness: 0.2 });

      const vaultFloor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.12, 16), marbleMat);
      vaultFloor.position.set(0, -0.04, -19.5);
      bg.add(vaultFloor);

      // Fallback lobby floor slab slightly below y=0 so it never z-fights with worldInfra
      const lobbySafetyFloor = new THREE.Mesh(new THREE.BoxGeometry(36, 0.12, 32), marbleMat);
      lobbySafetyFloor.position.set(0, -0.08, 0);
      bg.add(lobbySafetyFloor);

      const vBackWall = new THREE.Mesh(new THREE.BoxGeometry(16, 5.5, 0.5), wallMat);
      vBackWall.position.set(0, 2.75, -27.2);
      const vLeftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5.5, 16), wallMat);
      vLeftWall.position.set(-7.8, 2.75, -19.5);
      const vRightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5.5, 16), wallMat);
      vRightWall.position.set(7.8, 2.75, -19.5);
      bg.add(vBackWall, vLeftWall, vRightWall);

      // Articulated Circular Steel Vault Door Pivot (swings open on Phase 3!)
      const doorPivot = new THREE.Group();
      doorPivot.position.set(-2.1, 0, -12.4);
      const circularDoor = new THREE.Mesh(
        new THREE.CylinderGeometry(2.05, 2.05, 0.48, 28),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.88, roughness: 0.22 })
      );
      circularDoor.rotation.x = Math.PI / 2;
      circularDoor.position.set(2.1, 2.15, 0);
      const spokeWheel = new THREE.Mesh(
        new THREE.TorusGeometry(0.75, 0.08, 10, 20),
        matPool.goldBullion
      );
      spokeWheel.position.set(2.1, 2.15, 0.28);
      doorPivot.add(circularDoor, spokeWheel);
      bg.add(doorPivot);
      bg.userData.doorPivot = doorPivot;

      // Mounted Tripod Laser-Thermal Drill Rig in front of Vault Door
      const drillRig = new THREE.Group();
      drillRig.position.set(0, 0.05, -11.6);
      const drillBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.95, 14), matPool.hazardAmber);
      drillBody.rotation.x = Math.PI / 2;
      drillBody.position.y = 1.45;
      const drillBit = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.55, 12), matPool.darkSteel);
      drillBit.rotation.x = -Math.PI / 2;
      drillBit.position.set(0, 1.45, -0.72);
      for (const lx of [-0.42, 0.42]) {
        const tripodLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.58, 8), matPool.darkSteel);
        tripodLeg.position.set(lx, 0.76, 0.22);
        tripodLeg.rotation.z = lx > 0 ? 0.26 : -0.26;
        drillRig.add(tripodLeg);
      }
      drillRig.add(drillBody, drillBit);
      drillRig.visible = false;
      bg.add(drillRig);
      bg.userData.drillRig = drillRig;

      const vaultLight = new THREE.PointLight(0xfbbf24, 1.8, 22);
      vaultLight.position.set(0, 4.2, -18.5);
      bg.add(vaultLight);

      bg.visible = false;
      heistRoot.add(bg);
      heistState.bankInteriorGroup = bg;
    }

    // 3. Vạn Bảo Đổ Phường High-Security Underground Vault Corridor & Diamond Chamber at (1200, 0, 1144..1178)
    if (!heistState.casinoVaultWingGroup) {
      const cg = new THREE.Group();
      cg.position.set(1200, 0, 1200);

      const slateFloorMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.32, metalness: 0.25 });
      const bunkerWallMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5, metalness: 0.35 });
      const neonTrimMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });

      // Corridor & Vault floor extending from Casino North back wall (local Z = -22 to -58 -> world Z = 1178 to 1142)
      const corrFloor = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.14, 38), slateFloorMat);
      corrFloor.position.set(0, -0.04, -40);
      const corrCeil = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.2, 38), bunkerWallMat);
      corrCeil.position.set(0, 5.2, -40);
      const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 5.3, 38), bunkerWallMat);
      wallL.position.set(-8.1, 2.6, -40);
      const wallR = new THREE.Mesh(new THREE.BoxGeometry(0.45, 5.3, 38), bunkerWallMat);
      wallR.position.set(8.1, 2.6, -40);
      const backVaultWall = new THREE.Mesh(new THREE.BoxGeometry(16.5, 5.3, 0.5), bunkerWallMat);
      backVaultWall.position.set(0, 2.6, -58.8);
      cg.add(corrFloor, corrCeil, wallL, wallR, backVaultWall);

      // Glowing VIP Vault Archways along corridor
      for (const az of [-25, -32, -39]) {
        const archTop = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.35, 0.45), neonTrimMat);
        archTop.position.set(0, 4.85, az);
        cg.add(archTop);
      }

      // Biometric Keypad Pedestal at world (1200, 0.05, 1157.6) -> local (0, 0, -42.4)
      const keypadStand = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.35, 0.45), matPool.darkSteel);
      keypadStand.position.set(2.35, 0.68, -42.4);
      const keypadScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.42, 0.32),
        new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide })
      );
      keypadScreen.position.set(2.35, 1.25, -42.15);
      cg.add(keypadStand, keypadScreen);

      // Sliding Mantle Vault Blast Door at local Z = -43.5 (world Z = 1156.5)
      const mantleDoor = new THREE.Group();
      mantleDoor.position.set(0, 0, -43.5);
      const blastSlab = new THREE.Mesh(
        new THREE.BoxGeometry(6.8, 4.6, 0.52),
        new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 })
      );
      blastSlab.position.y = 2.3;
      mantleDoor.add(blastSlab);

      // Partition framing flanking the blast door
      const frameL = new THREE.Mesh(new THREE.BoxGeometry(4.8, 5.2, 0.55), bunkerWallMat);
      frameL.position.set(-5.7, 2.6, -43.5);
      const frameR = new THREE.Mesh(new THREE.BoxGeometry(4.8, 5.2, 0.55), bunkerWallMat);
      frameR.position.set(5.7, 2.6, -43.5);
      cg.add(mantleDoor, frameL, frameR);
      cg.userData.mantleDoor = mantleDoor;

      const vaultPtLight = new THREE.PointLight(0x38bdf8, 2.0, 26);
      vaultPtLight.position.set(0, 4.4, -50);
      cg.add(vaultPtLight);

      cg.visible = false;
      heistRoot.add(cg);
      heistState.casinoVaultWingGroup = cg;
    }
  }

  function spawnHeistEnemyNPC(preset, x, y, z, weaponId = 'smg', maxHp = 100, label = 'Vệ Binh Vũ Trang') {
    const scene = getScene();
    let rig = null;
    if (activeCtx?.characters?.createHumanoid) {
      try {
        rig = activeCtx.characters.createHumanoid(preset);
      } catch (_) {}
    }
    const mesh = rig?.root || rig?.mesh || rig || new THREE.Group();
    if (!rig) {
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.26, 0.78, 6, 10),
        new THREE.MeshStandardMaterial({ color: 0x1e293b })
      );
      body.position.y = 0.96;
      mesh.add(body);
    }
    mesh.position.set(x, y, z);
    if (scene && !mesh.parent) scene.add(mesh);

    if (rig && activeCtx?.characters?.equipWeapon) {
      try {
        activeCtx.characters.equipWeapon(rig, weaponId);
      } catch (_) {}
    }

    const enemy = {
      preset,
      label,
      x,
      y,
      z,
      homeX: x,
      homeZ: z,
      vx: 0,
      vz: 0,
      yaw: 0,
      hp: maxHp,
      maxHp,
      armor: preset === 'swat' ? 45 : 20,
      weaponId,
      rig,
      mesh,
      isEnemy: true,
      isHostile: true,
      missionTarget: true,
      noWantedOnKill: true,
      dead: false,
      deathTimer: 0,
      fireTimer: randRange(0.55, 1.45),
      strafePhase: Math.random() * Math.PI * 2,
      takeDamage(dmg, isHeadshot) {
        if (this.dead) return;
        const mult = isHeadshot ? 2.5 : 1.0;
        let rem = dmg * mult;
        if (this.armor > 0) {
          const abs = Math.min(this.armor, rem);
          this.armor -= abs;
          rem -= abs;
        }
        this.hp = Math.max(0, this.hp - rem);
        if (this.hp <= 0 && !this.dead) {
          this.dead = true;
          this.isDead = true;
          progressionStats.enemiesNeutralized += 1;
          if (isHeadshot) progressionStats.headshots += 1;
          if (this.rig && activeCtx?.characters?.animateHumanoid) {
            try {
              activeCtx.characters.animateHumanoid(this.rig, 'dead', 0.016);
            } catch (_) {}
          }
        }
      }
    };

    const bucket = ensureGameplayEnemyBucket();
    if (bucket) bucket.push(enemy);
    heistState.guards.push(enemy);
    return enemy;
  }

  function spawnHeistHostageNPC(x, y, z, preset = 'business_f') {
    const scene = getScene();
    let rig = null;
    if (activeCtx?.characters?.createHumanoid) {
      try {
        rig = activeCtx.characters.createHumanoid(preset);
      } catch (_) {}
    }
    const mesh = rig?.root || rig?.mesh || rig || new THREE.Group();
    mesh.position.set(x, y, z);
    if (scene && !mesh.parent) scene.add(mesh);

    const hostage = {
      x,
      y,
      z,
      yaw: 0,
      rig,
      mesh,
      invulnerable: true,
      cowerPhase: Math.random() * 6.28
    };
    heistState.hostages.push(hostage);
    return hostage;
  }

  function clearHeistEntities() {
    heistSFX.stopDrillLoop();
    const bucket = ensureGameplayEnemyBucket();
    for (const g of heistState.guards) {
      if (g.mesh?.parent) g.mesh.parent.remove(g.mesh);
      if (bucket) {
        const idx = bucket.indexOf(g);
        if (idx !== -1) bucket.splice(idx, 1);
      }
    }
    heistState.guards.length = 0;

    for (const h of heistState.hostages) {
      if (h.mesh?.parent) h.mesh.parent.remove(h.mesh);
    }
    heistState.hostages.length = 0;

    for (const cart of heistState.lootCarts) {
      if (cart.mesh?.parent) cart.mesh.parent.remove(cart.mesh);
    }
    heistState.lootCarts.length = 0;

    for (const tr of heistState.laserTraps) {
      if (tr.mesh?.parent) tr.mesh.parent.remove(tr.mesh);
    }
    heistState.laserTraps.length = 0;

    for (const gp of heistState.gasParticles) {
      if (gp.mesh?.parent) gp.mesh.parent.remove(gp.mesh);
    }
    heistState.gasParticles.length = 0;

    if (Array.isArray(heistState.extractionProps)) {
      for (const ep of heistState.extractionProps) {
        if (ep.mesh?.parent) ep.mesh.parent.remove(ep.mesh);
      }
      heistState.extractionProps.length = 0;
    }

    for (const v of heistState.spawnedVehicles) {
      removeVehicleSafe(v);
    }
    heistState.spawnedVehicles.length = 0;

    if (heistState.stageObjectiveCorona) {
      heistState.stageObjectiveCorona.visible = false;
    }
    if (heistState.bankInteriorGroup) {
      heistState.bankInteriorGroup.visible = false;
      if (heistState.bankInteriorGroup.userData.doorPivot) {
        heistState.bankInteriorGroup.userData.doorPivot.rotation.y = 0;
      }
      if (heistState.bankInteriorGroup.userData.drillRig) {
        heistState.bankInteriorGroup.userData.drillRig.visible = false;
      }
    }
    if (heistState.casinoVaultWingGroup) {
      heistState.casinoVaultWingGroup.visible = false;
      if (heistState.casinoVaultWingGroup.userData.mantleDoor) {
        heistState.casinoVaultWingGroup.userData.mantleDoor.position.x = 0;
      }
    }
    domRefs.heistHud?.classList.remove('visible');
  }

  function enterPacificBankHeistInterior() {
    heistState.subStep = 'inside_lobby';
    if (activeCtx?.worldInfra?.enterBank) {
      try {
        activeCtx.worldInfra.enterBank();
      } catch (_) {}
    }
    teleportPlayerSafe(
      HEIST_COORDS.bankSpawnInside.x,
      HEIST_COORDS.bankSpawnInside.y,
      HEIST_COORDS.bankSpawnInside.z,
      Math.PI
    );

    if (heistState.bankInteriorGroup) {
      heistState.bankInteriorGroup.visible = true;
      if (heistState.bankInteriorGroup.userData.drillRig) {
        heistState.bankInteriorGroup.userData.drillRig.visible = true;
      }
    }

    // Spawn 6 Lobby Hostages & Tellers
    const hostageSpots = [
      [-6.5, 2105.0, 'business_f'],
      [6.5, 2105.0, 'tourist_m'],
      [-5.2, 2098.0, 'business_m'],
      [5.4, 2098.5, 'beach_f'],
      [-3.5, 2092.5, 'casual_polo'],
      [3.5, 2092.5, 'luxury_suit']
    ];
    for (const [ox, wz, pr] of hostageSpots) {
      spawnHeistHostageNPC(2100 + ox, 0.05, wz, pr);
    }

    // Spawn 4 Armed Bank Security Guards
    const guardSpots = [
      [-6.2, 2101.5, 'cop', 'pistol', 85],
      [6.2, 2101.5, 'cop', 'smg', 95],
      [-3.8, 2091.5, 'swat', 'smg', 110],
      [3.8, 2091.5, 'swat', 'shotgun', 115]
    ];
    for (const [ox, wz, pr, wp, hp] of guardSpots) {
      spawnHeistEnemyNPC(pr, 2100 + ox, 0.05, wz, wp, hp, 'Bảo Vệ Ngân Hàng');
    }

    // Pre-place 4 Gold & Cash Bullion Carts inside the Vault Chamber (Z = 2078..2083)
    const cartOffsets = [
      [-3.2, 2082.2, 'gold', 16250],
      [3.2, 2082.2, 'cash', 16250],
      [-2.8, 2078.0, 'gold', 16250],
      [2.8, 2078.0, 'cash', 16250]
    ];
    for (const [ox, wz, kind, val] of cartOffsets) {
      const cMesh = createLootCartMesh(kind);
      cMesh.position.set(2100 + ox, 0.05, wz);
      heistRoot.add(cMesh);
      heistState.lootCarts.push({
        x: 2100 + ox,
        y: 0.05,
        z: wz,
        value: val,
        collected: false,
        mesh: cMesh
      });
    }

    clearGPSWaypoints();
    notifyFeed('🏦 Đã đột nhập Ngân hàng Linh Thạch Bảo Khố! Khống chế đám đông & hạ 4 bảo vệ vũ trang!', 'green');
  }

  function enterDiamondCasinoVaultInfiltration() {
    heistState.subStep = 'inside_corridor';
    if (activeCtx?.casinoWorld?.enterCasino) {
      try {
        activeCtx.casinoWorld.enterCasino();
      } catch (_) {}
    }
    teleportPlayerSafe(
      HEIST_COORDS.casinoInfilInside.x,
      HEIST_COORDS.casinoInfilInside.y,
      HEIST_COORDS.casinoInfilInside.z,
      Math.PI
    );

    if (heistState.casinoVaultWingGroup) {
      heistState.casinoVaultWingGroup.visible = true;
    }

    // Spawn 3 Sweeping Security Laser-Grid Beams in corridor (Z = 1173, 1168, 1163)
    const laserZs = [1173.0, 1168.0, 1163.0];
    for (let i = 0; i < laserZs.length; i++) {
      const beam = new THREE.Mesh(geoPool.laserBeam, matPool.laserRed);
      beam.scale.set(15.2, 1, 1);
      beam.position.set(1200, 0.95 + i * 0.18, laserZs[i]);
      heistRoot.add(beam);
      heistState.laserTraps.push({
        z: laserZs[i],
        baseY: 0.85,
        phase: i * 1.4,
        active: true,
        hitCooldown: 0,
        mesh: beam
      });
    }

    // Spawn 5 Armed Duggan Casino Security Guards along vault corridor
    const casinoGuards = [
      [-4.2, 1175.5, 'luxury_suit', 'pistol', 90],
      [4.2, 1174.0, 'luxury_suit', 'smg', 95],
      [-3.8, 1166.5, 'swat', 'smg', 115],
      [3.8, 1165.0, 'swat', 'carbine', 120],
      [0.0, 1159.8, 'swat', 'shotgun', 130]
    ];
    for (const [ox, wz, pr, wp, hp] of casinoGuards) {
      spawnHeistEnemyNPC(pr, 1200 + ox, 0.05, wz, wp, hp, 'An Ninh Sòng Bạc Duggan');
    }

    // Spawn 5 Diamond & Gold Bullion Carts inside Underground Vault (Z = 1145..1153, $24,000 each = $120,000!)
    const diamondCarts = [
      [0.0, 1152.2, 'diamonds', 24000],
      [-3.6, 1150.0, 'diamonds', 24000],
      [3.6, 1150.0, 'gold', 24000],
      [-3.2, 1146.2, 'diamonds', 24000],
      [3.2, 1146.2, 'gold', 24000]
    ];
    for (const [ox, wz, kind, val] of diamondCarts) {
      const cMesh = createLootCartMesh(kind);
      cMesh.position.set(1200 + ox, 0.05, wz);
      heistRoot.add(cMesh);
      heistState.lootCarts.push({
        x: 1200 + ox,
        y: 0.05,
        z: wz,
        value: val,
        collected: false,
        mesh: cMesh
      });
    }

    clearGPSWaypoints();
    notifyFeed('💎 Đã mặc giáp đặc nhiệm phòng độc & đột nhập Hành lang Hầm ngầm Sòng bạc Diamond!', 'purple');
  }

  /**
   * Launch Grand Heist #4 ('bank' / 4) or Grand Heist #5 ('casino' / 5)!
   */
  function startHeist(rawHeistId = 4) {
    ensureHeistsDOM();
    buildHeistArchitectureAndCoronas();
    closeStockMarket();
    closeAchievements();
    closeActivityHub();
    activeCtx?.ui?.closePhone?.();

    // Abort any active street race or bounty cleanly first
    if (raceState.active) abortStreetRace(true);
    if (bountyState.active) abortBounty(true);
    if (activeCtx?.gameplay?.mission?.active) {
      activeCtx.gameplay.mission.active = false;
    }

    clearHeistEntities();

    const key = String(rawHeistId).toLowerCase();
    const isCasino = key === '5' || key === '2' || key.includes('casino') || key.includes('diamond');
    const id = isCasino ? 5 : 4;

    heistState.active = true;
    heistState.id = id;
    heistState.phase = 1;
    heistState.lootBag = 0;
    heistState.crowdControl = 100;
    heistState.nerveGasTimer = 55.0;
    heistState.nerveGasActive = false;
    heistState.vaultDoorOpen = false;
    heistState.vaultOpenAnim = 0;
    heistState.customBoatActive = false;

    const p = activeCtx?.player;
    equipHeistLoadout('tactical_heist', 'carbine');

    if (id === 4) {
      heistState.title = 'PHI VỤ NGÂN HÀNG PACIFIC STANDARD';
      heistState.rewardMax = 65000;
      const distBank = p ? dist2D(p.x, p.z, HEIST_COORDS.bankExterior.x, HEIST_COORDS.bankExterior.z) : 999;

      if (distBank <= 16.0 || (p && p.x > 1900)) {
        enterPacificBankHeistInterior();
      } else {
        // Enter Bank directly if launched from Smartphone for instant action OR guide if nearby:
        // Wait: brief says "Phase 1: Enter the walk-in Linh Thạch Bảo Khố (2100, 0, 2100), control the lobby crowd, neutralize 4 armed bank guards."
        // If player is in a car driving there vs launching from phone, let's check: if dist > 16m, we teleport right to the Bank entrance / inside lobby so Smartphone launch is immediately playable without a tedious commute, OR set exterior corona if within 45m!
        if (distBank > 55.0) {
          enterPacificBankHeistInterior();
        } else {
          heistState.subStep = 'approach_bank';
          setGPSWaypoints(HEIST_COORDS.bankExterior.x, HEIST_COORDS.bankExterior.z);
        }
      }
      showBigBanner('ĐẠI PHI VỤ #4', 'PHI VỤ NGÂN HÀNG PACIFIC STANDARD • $65,000', 'passed', 3.6);
    } else {
      heistState.title = 'PHI VỤ HẦM NGẦM SÒNG BẠC DIAMOND';
      heistState.rewardMax = 120000;
      const distCas = p ? dist2D(p.x, p.z, HEIST_COORDS.casinoSideCorona.x, HEIST_COORDS.casinoSideCorona.z) : 999;

      if (distCas <= 18.0 || distCas > 60.0 || (p && p.x > 1100 && p.x < 1300)) {
        enterDiamondCasinoVaultInfiltration();
      } else {
        heistState.subStep = 'approach_casino';
        setGPSWaypoints(HEIST_COORDS.casinoSideCorona.x, HEIST_COORDS.casinoSideCorona.z);
      }
      showBigBanner('ĐẠI PHI VỤ #5', 'PHI VỤ HẦM NGẦM SÒNG BẠC DIAMOND • $120,000', 'passed', 3.6);
    }

    domRefs.heistHud?.classList.add('visible');
    return true;
  }

  function triggerBankExteriorBreachSiege() {
    if (activeCtx?.worldInfra?.exitBank) {
      try {
        activeCtx.worldInfra.exitBank();
      } catch (_) {}
    }
    if (heistState.bankInteriorGroup) {
      heistState.bankInteriorGroup.visible = false;
    }

    teleportPlayerSafe(
      HEIST_COORDS.bankBreachExitOutside.x,
      getGroundY(HEIST_COORDS.bankBreachExitOutside.x, HEIST_COORDS.bankBreachExitOutside.z, 0.22),
      HEIST_COORDS.bankBreachExitOutside.z,
      0
    );

    heistState.subStep = 'escape_to_marina';
    setWantedStars(4);

    // Clear interior guards & spawn 4★ Thiên Đình Chấp Pháp + Thiên Binh Cấm Vệ Street Siege + Getaway Vehicles + Marina Boats!
    for (const g of heistState.guards) {
      if (g.mesh?.parent) g.mesh.parent.remove(g.mesh);
    }
    heistState.guards.length = 0;

    const c1 = spawnVehicleSafe('police', 106.0, 0.05, -102.0, 0.45, { isPolice: true, sirenActive: true });
    const c2 = spawnVehicleSafe('swat_van', 117.5, 0.05, -101.5, -0.42, { isPolice: true, sirenActive: true });
    const getawayCar = spawnVehicleSafe('banshee', 101.5, 0.05, -116.5, -Math.PI / 2, {
      color: 0x111827,
      isMissionCar: true
    });
    const getawayBike = spawnVehicleSafe('superbike', 101.5, 0.05, -121.0, -Math.PI / 2, {
      color: 0x10b981,
      isMissionCar: true
    });
    if (getawayCar) attachRacerUnderglowAndAero(getawayCar, 0x10b981);

    // Spawn Escape Speedboat & Jet Ski waiting at Bồng Lai Marina (-218, 0, 95)!
    const boat = spawnVehicleSafe('speedboat', HEIST_COORDS.marinaDock.x, 0.02, HEIST_COORDS.marinaDock.z, -Math.PI / 2, {
      isMissionBoat: true,
      isBoat: true
    });
    const jetski = spawnVehicleSafe('jetski', -218.0, 0.02, 102.5, -Math.PI / 2, {
      isMissionBoat: true,
      isBoat: true
    });

    for (const v of [c1, c2, getawayCar, getawayBike, boat, jetski]) {
      if (v) heistState.spawnedVehicles.push(v);
    }

    spawnHeistEnemyNPC('cop', 105.0, 0.22, -104.5, 'pistol', 85, 'Cảnh Sát Thiên Đình Chấp Pháp');
    spawnHeistEnemyNPC('swat', 116.0, 0.22, -104.0, 'carbine', 115, 'Đặc Nhiệm Thiên Binh Cấm Vệ');
    spawnHeistEnemyNPC('swat', 112.0, 0.22, -98.5, 'smg', 110, 'Đặc Nhiệm Thiên Binh Cấm Vệ');

    // Route via Elevated Coastal Freeway / South Avenue straight to Bồng Lai Marina (-218, 95)
    setGPSWaypoints(HEIST_COORDS.marinaDock.x, HEIST_COORDS.marinaDock.z, [
      { x: 120, z: -120 },
      { x: 120, z: 120 },
      { x: -120, z: 120 },
      { x: -218, z: 95 }
    ]);

    spawnOceanExtractionBuoyCorridor();

    notifyFeed(
      '🚓 Thiên Đình Chấp Pháp & Thiên Binh Cấm Vệ 4★ ĐANG VÂY RÁP! Lên siêu xe rút ra Cao tốc Ven biển tới Bến Du Thuyền Bồng Lai (-218, 95)!',
      'red'
    );
  }

  function spawnSignalFlareBeacon(x, y, z, flareColor = 0x10b981) {
    if (!Array.isArray(heistState.extractionProps)) heistState.extractionProps = [];
    const grp = new THREE.Group();
    const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.36, 10), matPool.hazardAmber);
    canister.rotation.z = 0.4;
    canister.position.y = 0.1;
    grp.add(canister);

    const plumeMat = new THREE.MeshBasicMaterial({
      color: flareColor,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    for (let k = 0; k < 5; k++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.32 + k * 0.24, 10, 8), plumeMat);
      puff.position.set(k * 0.18, 0.45 + k * 0.72, 0);
      grp.add(puff);
    }
    grp.position.set(x, y, z);
    heistRoot.add(grp);
    heistState.extractionProps.push({ kind: 'flare', baseY: y, phase: Math.random() * 6.28, mesh: grp });
    return grp;
  }

  function spawnOceanExtractionBuoyCorridor() {
    if (!Array.isArray(heistState.extractionProps)) heistState.extractionProps = [];
    spawnSignalFlareBeacon(HEIST_COORDS.marinaDock.x + 2.5, 0.2, HEIST_COORDS.marinaDock.z - 2.2, 0x10b981);

    const buoyMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.35,
      metalness: 0.3,
      emissive: 0x7c2d12,
      emissiveIntensity: 0.4
    });
    const beaconGlowMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    for (let step = 0; step < 5; step++) {
      const bx = -232 - step * 15;
      for (const sideZ of [88.5, 104.5]) {
        const buoy = new THREE.Group();
        const floatBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 0.65, 12), buoyMat);
        floatBase.position.y = 0.25;
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.65, 8), matPool.darkSteel);
        mast.position.y = 1.15;
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), beaconGlowMat);
        lamp.position.y = 2.05;
        buoy.add(floatBase, mast, lamp);
        buoy.position.set(bx, 0.0, sideZ);
        heistRoot.add(buoy);
        heistState.extractionProps.push({
          kind: 'buoy',
          x: bx,
          z: sideZ,
          phase: step * 0.9 + (sideZ > 95 ? 1.2 : 0),
          mesh: buoy
        });
      }
    }
  }

  function triggerCasinoExteriorEscapeSiege() {
    if (activeCtx?.casinoWorld?.exitCasino) {
      try {
        activeCtx.casinoWorld.exitCasino();
      } catch (_) {}
    }
    if (heistState.casinoVaultWingGroup) {
      heistState.casinoVaultWingGroup.visible = false;
    }

    teleportPlayerSafe(
      HEIST_COORDS.casinoExitOutside.x,
      getGroundY(HEIST_COORDS.casinoExitOutside.x, HEIST_COORDS.casinoExitOutside.z, 0.22),
      HEIST_COORDS.casinoExitOutside.z,
      -Math.PI / 2
    );

    heistState.subStep = 'escape_to_observatory';
    heistState.nerveGasActive = false;
    setWantedStars(5);

    for (const g of heistState.guards) {
      if (g.mesh?.parent) g.mesh.parent.remove(g.mesh);
    }
    heistState.guards.length = 0;

    // Spawn Tuned Getaway Hypercar AND Rooftop/Plaza Escape Maverick Helicopter!
    const hyper = spawnVehicleSafe(
      'zentorno',
      HEIST_COORDS.casinoGetawayCar.x,
      0.05,
      HEIST_COORDS.casinoGetawayCar.z,
      Math.PI,
      { color: 0x0f172a, isMissionCar: true }
    );
    if (hyper) attachRacerUnderglowAndAero(hyper, 0xc084fc);

    const escapeHeli = spawnVehicleSafe(
      'heli',
      HEIST_COORDS.casinoHelipad.x,
      getGroundY(HEIST_COORDS.casinoHelipad.x, HEIST_COORDS.casinoHelipad.z, 0.22) + 0.25,
      HEIST_COORDS.casinoHelipad.z,
      Math.PI,
      { isMissionCar: true }
    );

    const swatVan = spawnVehicleSafe('swat_van', 194.0, 0.05, -96.0, 1.2, { isPolice: true, sirenActive: true });
    for (const v of [hyper, escapeHeli, swatVan]) {
      if (v) heistState.spawnedVehicles.push(v);
    }

    spawnHeistEnemyNPC('swat', 196.0, 0.22, -93.0, 'carbine', 120, 'Đặc Nhiệm NOOSE');
    spawnHeistEnemyNPC('swat', 196.5, 0.22, -99.0, 'smg', 115, 'Đặc Nhiệm NOOSE');
    spawnHeistEnemyNPC('cop', 199.0, 0.22, -106.0, 'shotgun', 95, 'An Ninh Vũ Trang');

    setGPSWaypoints(HEIST_COORDS.observatoryDropoff.x, HEIST_COORDS.observatoryDropoff.z, [
      { x: 200, z: -120 },
      { x: 200, z: -200 },
      { x: 85, z: -200 },
      { x: 68, z: -245 }
    ]);

    spawnSignalFlareBeacon(
      HEIST_COORDS.casinoHelipad.x + 3.2,
      getGroundY(HEIST_COORDS.casinoHelipad.x, HEIST_COORDS.casinoHelipad.z, 0.22),
      HEIST_COORDS.casinoHelipad.z,
      0xc084fc
    );
    spawnSignalFlareBeacon(
      HEIST_COORDS.observatoryDropoff.x,
      getGroundY(HEIST_COORDS.observatoryDropoff.x, HEIST_COORDS.observatoryDropoff.z, 28.0),
      HEIST_COORDS.observatoryDropoff.z,
      0xfbbf24
    );

    notifyFeed(
      '🚁 TRUY NÃ 5★ NOOSE! Lên Siêu xe Độ (201, -87) hoặc Trực Thăng Maverick (195, -138) rút lên Đài Thiên Văn Võ Lâm (68, -245)!',
      'purple'
    );
  }

  function completeGrandHeist() {
    const id = heistState.id;
    const payout = Math.max(heistState.lootBag, id === 5 ? 120000 : 65000);
    const title = heistState.title;

    clearHeistEntities();
    clearGPSWaypoints();
    setWantedStars(0);
    heistState.active = false;
    heistState.phase = 0;

    addPlayerCash(payout, true);
    if (id === 4) {
      progressionStats.bankHeistCompleted += 1;
      saveProgressionStats();
      showBigBanner('HOÀN THÀNH ĐẠI PHI VỤ', `${title} • +$${payout.toLocaleString('en-US')}`, 'passed', 5.2);
    } else {
      progressionStats.casinoHeistCompleted += 1;
      saveProgressionStats();
      showBigBanner('SIÊU PHI VỤ THÀNH CÔNG', `${title} • +$${payout.toLocaleString('en-US')}`, 'passed', 5.5);
    }

    setObjectiveText('');
    evaluateAchievements();
  }

  function updateHeistCombatAndProps(dt, rawDt) {
    const p = activeCtx?.player;
    if (!p) return;

    // 1. Pulse exterior trigger coronas when idle
    const pulse = 1 + Math.sin(performance.now() * 0.004) * 0.09;
    const freeRoam = !heistState.active && !raceState.active && !bountyState.active && !(activeCtx?.gameplay?.mission?.active);

    if (heistState.bankCoronaMesh) {
      heistState.bankCoronaMesh.visible = freeRoam && p.x < 500;
      if (heistState.bankCoronaMesh.visible) {
        heistState.bankCoronaMesh.userData.ring.scale.setScalar(pulse);
        if (dist2D(p.x, p.z, HEIST_COORDS.bankExterior.x, HEIST_COORDS.bankExterior.z) < 3.4) {
          showInteractHint('Nhấn [F] Bắt đầu PHI VỤ NGÂN HÀNG PACIFIC STANDARD ($65,000)');
          if (activeCtx?.input?.interactJustPressed) {
            startHeist(4);
            return;
          }
        }
      }
    }

    if (heistState.casinoCoronaMesh) {
      heistState.casinoCoronaMesh.visible = freeRoam && p.x < 500;
      if (heistState.casinoCoronaMesh.visible) {
        heistState.casinoCoronaMesh.userData.ring.scale.setScalar(pulse);
        if (dist2D(p.x, p.z, HEIST_COORDS.casinoSideCorona.x, HEIST_COORDS.casinoSideCorona.z) < 3.4) {
          showInteractHint('Nhấn [F] Bắt đầu PHI VỤ HẦM NGẦM SÒNG BẠC DIAMOND ($120,000)');
          if (activeCtx?.input?.interactJustPressed) {
            startHeist(5);
            return;
          }
        }
      }
    }

    if (!heistState.active) return;

    // Fail safely on Wasted / Busted
    if (p.isDead || p.dead || p.isBusted) {
      clearHeistEntities();
      clearGPSWaypoints();
      heistState.active = false;
      setObjectiveText('');
      showBigBanner('PHI VỤ THẤT BẠI', 'Băng nhóm đã bị vô hiệu hóa!', 'failed', 4.0);
      return;
    }

    // Animate Vault Doors smoothly when unlocked
    if (heistState.vaultDoorOpen && heistState.vaultOpenAnim < 1) {
      heistState.vaultOpenAnim = Math.min(1, heistState.vaultOpenAnim + dt * 0.75);
      if (heistState.id === 4 && heistState.bankInteriorGroup?.userData?.doorPivot) {
        heistState.bankInteriorGroup.userData.doorPivot.rotation.y = -heistState.vaultOpenAnim * 1.95;
      }
      if (heistState.id === 5 && heistState.casinoVaultWingGroup?.userData?.mantleDoor) {
        heistState.casinoVaultWingGroup.userData.mantleDoor.position.x = -heistState.vaultOpenAnim * 5.8;
      }
    }

    // Bob ocean extraction buoys on Pacific swell & swirl extraction signal smoke flares
    if (Array.isArray(heistState.extractionProps) && heistState.extractionProps.length > 0) {
      const waveT = performance.now() * 0.0026;
      for (let i = 0; i < heistState.extractionProps.length; i++) {
        const ep = heistState.extractionProps[i];
        if (!ep.mesh) continue;
        if (ep.kind === 'buoy') {
          ep.mesh.position.y = Math.sin(waveT + ep.phase) * 0.24;
          ep.mesh.rotation.z = Math.cos(waveT * 0.9 + ep.phase) * 0.11;
        } else if (ep.kind === 'flare') {
          ep.mesh.rotation.y += dt * 0.85;
        }
      }
    }

    // Update Hostages kneeling/cowering animation
    for (let i = 0; i < heistState.hostages.length; i++) {
      const h = heistState.hostages[i];
      h.yaw = Math.atan2(p.x - h.x, p.z - h.z);
      h.mesh.rotation.y = h.yaw;
      if (h.rig && activeCtx?.characters?.animateHumanoid) {
        try {
          activeCtx.characters.animateHumanoid(h.rig, 'busted', dt);
        } catch (_) {}
      }
    }

    // Update Tactical Heist Guards AI
    heistState.barkTimer -= dt;
    for (let i = 0; i < heistState.guards.length; i++) {
      const g = heistState.guards[i];
      if (g.dead || g.hp <= 0) {
        if (!g.dead) g.takeDamage(999, false);
        continue;
      }

      const dx = p.x - g.x;
      const dz = p.z - g.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 65) continue;

      g.yaw = lerpAngle(g.yaw, Math.atan2(dx, dz), clamp(dt * 8, 0, 1));
      g.strafePhase += dt * 2.2;

      // Tactical lateral strafe within 2.5m of guard post
      const strafeVel = Math.sin(g.strafePhase) * 1.35;
      const rx = -Math.cos(g.yaw);
      const rz = Math.sin(g.yaw);
      const nx = g.x + rx * strafeVel * dt;
      const nz = g.z + rz * strafeVel * dt;
      if (dist2D(nx, nz, g.homeX, g.homeZ) < 3.2) {
        g.x = nx;
        g.z = nz;
      }
      g.mesh.position.set(g.x, g.y, g.z);
      g.mesh.rotation.y = g.yaw;

      if (g.rig && activeCtx?.characters?.animateHumanoid) {
        try {
          activeCtx.characters.animateHumanoid(g.rig, 'aim_2h', dt, { moveSpeed: Math.abs(strafeVel) });
        } catch (_) {}
      }

      // Guard weapon bursts when modal is NOT open
      if (!activeCtx.activeModal && dist < 38 && Math.abs(p.y - g.y) < 5.5) {
        g.fireTimer -= dt;
        if (g.fireTimer <= 0) {
          g.fireTimer = randRange(1.05, 2.15);
          if (activeCtx?.characters?.fireWeapon) {
            try {
              activeCtx.characters.fireWeapon(g, g.weaponId, p, activeCtx);
            } catch (_) {}
          }
          if (heistState.barkTimer <= 0 && Math.random() < 0.35) {
            heistState.barkTimer = 7.5;
            showSubtitleText(`Bảo vệ: "${GUARD_COMBAT_BARKS[randInt(0, GUARD_COMBAT_BARKS.length - 1)]}"`, 3.2);
          }
        }
      }
    }

    // Update Security Laser-Grid Traps in Casino Corridor
    for (let i = 0; i < heistState.laserTraps.length; i++) {
      const tr = heistState.laserTraps[i];
      if (!tr.active) continue;
      if (tr.hitCooldown > 0) tr.hitCooldown -= dt;
      const ly = tr.baseY + Math.sin(performance.now() * 0.0028 + tr.phase) * 0.55;
      tr.mesh.position.y = ly;

      if (Math.abs(p.x - 1200) < 7.5 && Math.abs(p.z - tr.z) < 0.42 && !p.isRolling && tr.hitCooldown <= 0) {
        if (p.y < ly + 0.35 && p.y + 1.65 > ly) {
          tr.hitCooldown = 1.4;
          p.hp = Math.max(15, (p.hp || 100) - 8);
          activeCtx?.engine?.triggerDamageFlash?.(0.35);
          heistSFX.playHackError();
          notifyFeed('⚡ Chạm tia Laser an ninh! Hãy Lăn Né [Ctrl] hoặc nhảy qua tia đỏ!', 'red');
        }
      }
    }

    // Update Heist #4 vs Heist #5 State Machines
    if (heistState.id === 4) {
      stepPacificBankHeist(dt, rawDt, p);
    } else if (heistState.id === 5) {
      stepDiamondCasinoHeist(dt, rawDt, p);
    }

    // Sync Heist HUD Card
    if (domRefs.heistHudTitle) domRefs.heistHudTitle.textContent = heistState.title;
    if (domRefs.heistHudLoot) {
      domRefs.heistHudLoot.textContent = `🎒 ${formatMoney(heistState.lootBag)} / ${formatMoney(heistState.rewardMax)}`;
    }
    if (heistState.id === 4 && heistState.phase === 1) {
      if (domRefs.heistHudExtraLabel) {
        domRefs.heistHudExtraLabel.textContent = `Khống chế đám đông sảnh: ${Math.round(heistState.crowdControl)}%`;
      }
      if (domRefs.heistHudExtraFill) {
        domRefs.heistHudExtraFill.style.width = `${clamp(heistState.crowdControl, 0, 100)}%`;
      }
    } else if (heistState.id === 5 && heistState.nerveGasActive) {
      const pct = clamp((heistState.nerveGasTimer / 55.0) * 100, 0, 100);
      if (domRefs.heistHudExtraLabel) {
        domRefs.heistHudExtraLabel.textContent = `☢ Khí độc thần kinh phát tán: ${Math.ceil(heistState.nerveGasTimer)}s`;
      }
      if (domRefs.heistHudExtraFill) {
        domRefs.heistHudExtraFill.style.width = `${pct}%`;
        domRefs.heistHudExtraFill.style.background =
          heistState.nerveGasTimer < 18 ? '#ef4444' : 'linear-gradient(90deg,#10b981,#eab308)';
      }
    } else {
      const lootPct = clamp((heistState.lootBag / Math.max(1, heistState.rewardMax)) * 100, 0, 100);
      if (domRefs.heistHudExtraLabel) {
        domRefs.heistHudExtraLabel.textContent = `Tiến độ chiến lợi phẩm: ${Math.round(lootPct)}%`;
      }
      if (domRefs.heistHudExtraFill) {
        domRefs.heistHudExtraFill.style.width = `${lootPct}%`;
      }
    }
    if (domRefs.heistHudSub) {
      domRefs.heistHudSub.textContent = `Giai đoạn ${heistState.phase} / 3`;
    }
  }

  function stepPacificBankHeist(dt, rawDt, p) {
    const sc = heistState.stageObjectiveCorona;

    if (heistState.phase === 1) {
      if (heistState.subStep === 'approach_bank') {
        setObjectiveText('Tiến vào cửa chính Ngân hàng Linh Thạch Bảo Khố (111, -120) để bắt đầu đột kích!');
        if (dist2D(p.x, p.z, HEIST_COORDS.bankExterior.x, HEIST_COORDS.bankExterior.z) < 5.2) {
          enterPacificBankHeistInterior();
        }
        return;
      }

      // Crowd control intimidation mechanics
      if (p.isAiming || p.isFiring) {
        heistState.crowdControl = Math.min(100, heistState.crowdControl + 28 * dt);
      } else {
        heistState.crowdControl = Math.max(20, heistState.crowdControl - 4.2 * dt);
      }

      const aliveGuards = heistState.guards.filter((g) => !g.dead).length;
      const killed = 4 - aliveGuards;
      setObjectiveText(
        `Giai đoạn 1: Khống chế con tin (${Math.round(heistState.crowdControl)}%) & hạ 4 Bảo vệ Ngân hàng (${killed}/4)!`
      );

      if (aliveGuards === 0) {
        heistState.phase = 2;
        if (sc) {
          sc.visible = true;
          sc.position.set(HEIST_COORDS.bankVaultDoor.x, 0.06, HEIST_COORDS.bankVaultDoor.z);
        }
        notifyFeed('🔓 Đã quét sạch sảnh Ngân hàng! Tiến tới Cửa Kho Tiền để gắn Mũi Khoan Nhiệt Laser!', 'gold');
      }
    } else if (heistState.phase === 2) {
      setObjectiveText('Giai đoạn 2: Tới Cửa Kho Tiền Thép (2100, 2088) & nhấn [F] để Khoan Nhiệt Laser qua 4 chốt khóa!');
      if (sc) {
        sc.visible = true;
        sc.position.set(HEIST_COORDS.bankVaultDoor.x, 0.06, HEIST_COORDS.bankVaultDoor.z);
      }

      if (!hackGame.active && dist2D(p.x, p.z, HEIST_COORDS.bankVaultDoor.x, HEIST_COORDS.bankVaultDoor.z) < 2.8) {
        showInteractHint('Nhấn [F] Khởi động Máy Khoan Nhiệt Laser Kho Tiền');
        if (activeCtx?.input?.interactJustPressed || dist2D(p.x, p.z, HEIST_COORDS.bankVaultDoor.x, HEIST_COORDS.bankVaultDoor.z) < 1.55) {
          openHackMinigame('bank_drill', () => {
            heistState.phase = 3;
            heistState.subStep = 'loot_vault';
            heistState.vaultDoorOpen = true;
            heistSFX.playVaultOpen();
            // Also notify worldInfra if it exposes vault open flag/method
            if (activeCtx?.worldInfra) {
              activeCtx.worldInfra.bankVaultOpen = true;
              activeCtx.worldInfra.openBankVault?.();
            }
            notifyFeed('💰 CỬA KHO TIỀN ĐÃ MỞ! Vào trong gom sạch $65,000 Vàng & Tiền mặt!', 'green');
          });
        }
      }
    } else if (heistState.phase === 3) {
      if (heistState.subStep === 'loot_vault') {
        let remainingCarts = 0;
        for (const cart of heistState.lootCarts) {
          if (cart.collected) continue;
          remainingCarts++;
          cart.mesh.userData.glowRing.rotation.z += dt * 2.0;
          if (dist2D(p.x, p.z, cart.x, cart.z) < 2.35) {
            cart.collected = true;
            cart.mesh.visible = false;
            heistState.lootBag = Math.min(65000, heistState.lootBag + cart.value);
            activeCtx?.audio?.playCash?.();
            activeCtx?.audio?.playPickup?.();
            notifyFeed(`🎒 Đã gom kiện vàng/tiền mặt (+$${cart.value.toLocaleString('en-US')})!`, 'gold');
            if (heistState.lootBag === cart.value) {
              // Trigger Vạn Thương Linh Các Linh Thạch Bảo Khố stock crash on first vault grab!
              triggerMarketEvent('bank_heist_robbed', 1.0);
            }
          }
        }

        if (heistState.lootBag < 65000 && remainingCarts > 0) {
          setObjectiveText(
            heistState.lootBag > 0
              ? `Giai đoạn 3: Gom nốt Vàng (${formatMoney(heistState.lootBag)} / $65,000) hoặc chạy ra Cửa Chính (2100, 2113.5) để rút lui!`
              : `Giai đoạn 3: Gom vàng thỏi & tiền mặt trong Kho Tiền (${formatMoney(heistState.lootBag)} / $65,000)!`
          );
          if (sc) {
            sc.visible = heistState.lootBag > 0;
            if (sc.visible) sc.position.set(HEIST_COORDS.bankExitInside.x, 0.06, HEIST_COORDS.bankExitInside.z);
          }
          if (heistState.lootBag > 0 && dist2D(p.x, p.z, HEIST_COORDS.bankExitInside.x, HEIST_COORDS.bankExitInside.z) < 2.8) {
            triggerBankExteriorBreachSiege();
          }
        } else {
          setObjectiveText('Đã gom đủ $65,000! Chạy ra Cửa Chính Ngân Hàng (2100, 2113.5) để phá vòng vây Thiên Đình Chấp Pháp!');
          if (sc) {
            sc.visible = true;
            sc.position.set(HEIST_COORDS.bankExitInside.x, 0.06, HEIST_COORDS.bankExitInside.z);
          }
          if (dist2D(p.x, p.z, HEIST_COORDS.bankExitInside.x, HEIST_COORDS.bankExitInside.z) < 2.8) {
            triggerBankExteriorBreachSiege();
          }
        }
      } else if (heistState.subStep === 'escape_to_marina') {
        const curCar = getPlayerVehicle();
        const isOnWatercraft =
          Boolean(curCar && (curCar.type === 'speedboat' || curCar.type === 'jetski' || curCar.isMissionBoat || curCar.isBoat));

        if (!isOnWatercraft && p.x > -232) {
          if (sc) {
            sc.visible = true;
            sc.position.set(HEIST_COORDS.marinaDock.x, 0.25, HEIST_COORDS.marinaDock.z);
          }
          setObjectiveText(
            'Vượt vòng vây 4★ Thiên Đình Chấp Pháp + Thiên Binh Cấm Vệ qua Cao tốc Ven biển tới Bến Du Thuyền Bồng Lai (-218, 95) & lên Tàu Cao Tốc!'
          );

          // Seamless Marina boat boarding assist if vehicle is standard fallback mesh on water
          if (dist2D(p.x, p.z, HEIST_COORDS.marinaDock.x, HEIST_COORDS.marinaDock.z) < 6.5 && !curCar) {
            showInteractHint('Nhấn [F] Lên Tàu Cao Tốc / Mô Tô Nước Tẩu Thoát Ra Khơi!');
            if (activeCtx?.input?.interactJustPressed) {
              const nearBoat = heistState.spawnedVehicles.find((v) => v && v.isMissionBoat);
              if (nearBoat && activeCtx?.vehicles?.enterVehicle) {
                try {
                  activeCtx.vehicles.enterVehicle(nearBoat);
                } catch (_) {}
              }
            }
          }
        } else {
          // Player is piloting the Speedboat / Jet Ski out to open Pacific Ocean!
          if (sc) {
            sc.visible = true;
            sc.position.set(HEIST_COORDS.oceanEscapeZone.x, 0.2, HEIST_COORDS.oceanEscapeZone.z);
          }
          setGPSWaypoints(HEIST_COORDS.oceanEscapeZone.x, HEIST_COORDS.oceanEscapeZone.z);
          setObjectiveText(
            `Lái Tàu Cao Tốc / Jet Ski phóng thẳng ra khơi Thái Bình Dương (X < -280, hiện tại: ${Math.round(p.x)}) để cắt đuôi Thiên Đình Chấp Pháp!`
          );

          // Buoyant ocean propulsion boost in case fallback car archetype is used on water
          if (curCar && curCar.x < -198 && !activeCtx?.vehiclesExtra) {
            const waveY = Math.sin(performance.now() * 0.003 + curCar.x * 0.08) * 0.28;
            curCar.y = waveY;
            if (activeCtx?.input?.keys?.KeyW || activeCtx?.input?.throttle > 0.1) {
              curCar.x -= 28 * dt;
              if (curCar.mesh) curCar.mesh.position.set(curCar.x, curCar.y, curCar.z);
              p.x = curCar.x;
              p.z = curCar.z;
            }
          }

          if (p.x <= -278 || dist2D(p.x, p.z, HEIST_COORDS.oceanEscapeZone.x, HEIST_COORDS.oceanEscapeZone.z) < 18) {
            completeGrandHeist();
          }
        }
      }
    }
  }

  function stepDiamondCasinoHeist(dt, rawDt, p) {
    const sc = heistState.stageObjectiveCorona;

    if (heistState.phase === 1) {
      if (heistState.subStep === 'approach_casino') {
        setObjectiveText('Tiến tới Cửa Phụ VIP Sòng bạc Diamond (209.5, -92) để đột nhập Hầm Ngầm!');
        if (dist2D(p.x, p.z, HEIST_COORDS.casinoSideCorona.x, HEIST_COORDS.casinoSideCorona.z) < 5.2) {
          enterDiamondCasinoVaultInfiltration();
        }
        return;
      }

      const aliveSec = heistState.guards.filter((g) => !g.dead).length;
      const cleared = 5 - aliveSec;
      setObjectiveText(
        `Giai đoạn 1: Vượt lưới Laser & hạ Đội An Ninh Hầm Ngầm Sòng Bạc (${cleared}/5 tên địch)!`
      );

      if (aliveSec === 0) {
        heistState.phase = 2;
        for (const tr of heistState.laserTraps) {
          tr.active = false;
          tr.mesh.visible = false;
        }
        if (sc) {
          sc.visible = true;
          sc.position.set(HEIST_COORDS.casinoVaultKeypad.x, 0.06, HEIST_COORDS.casinoVaultKeypad.z);
        }
        notifyFeed('🧬 Đã vô hiệu hóa đội bảo vệ! Tiến tới Bảng Mã Sinh Trắc (1200, 1157.6) để Hack khóa Hầm Ngầm!', 'purple');
      }
    } else if (heistState.phase === 2) {
      setObjectiveText(
        'Giai đoạn 2: Tiếp cận Bảng Mã Sinh Trắc Hầm Ngầm (1200, 1158) & nhấn [F] giải mã 4 lát Vân Tay trong 45s!'
      );
      if (sc) {
        sc.visible = true;
        sc.position.set(HEIST_COORDS.casinoVaultKeypad.x, 0.06, HEIST_COORDS.casinoVaultKeypad.z);
      }

      if (!hackGame.active && dist2D(p.x, p.z, HEIST_COORDS.casinoVaultKeypad.x, HEIST_COORDS.casinoVaultKeypad.z) < 2.8) {
        showInteractHint('Nhấn [F] Xâm nhập Bảng Mã Vân Tay & Lưới Laser Hầm Ngầm');
        if (
          activeCtx?.input?.interactJustPressed ||
          dist2D(p.x, p.z, HEIST_COORDS.casinoVaultKeypad.x, HEIST_COORDS.casinoVaultKeypad.z) < 1.55
        ) {
          openHackMinigame('casino_fingerprint', () => {
            heistState.phase = 3;
            heistState.subStep = 'loot_diamond_vault';
            heistState.vaultDoorOpen = true;
            heistState.nerveGasActive = true;
            heistState.nerveGasTimer = 55.0;
            heistSFX.playVaultOpen();
            notifyFeed(
              '💎 HẦM NGẦM KIM CƯƠNG ĐÃ MỞ! Nhanh chóng vét sạch $120,000 trước khi Khí Độc Thần Kinh phát tán (55s)!',
              'gold'
            );
          });
        }
      }
    } else if (heistState.phase === 3) {
      if (heistState.subStep === 'loot_diamond_vault') {
        heistState.nerveGasTimer = Math.max(0, heistState.nerveGasTimer - rawDt);

        // Spawn green nerve-gas mist spheres when timer < 24s
        if (heistState.nerveGasTimer < 24.0 && Math.random() < 0.35) {
          const mist = new THREE.Mesh(new THREE.SphereGeometry(randRange(0.55, 1.25), 8, 8), matPool.gasGreen);
          mist.position.set(1200 + randRange(-5.5, 5.5), 4.4, 1149 + randRange(-4.5, 4.5));
          heistRoot.add(mist);
          heistState.gasParticles.push({ mesh: mist, vy: -randRange(0.9, 1.8), life: 2.2 });
        }
        for (let i = heistState.gasParticles.length - 1; i >= 0; i--) {
          const gp = heistState.gasParticles[i];
          gp.life -= dt;
          gp.mesh.position.y += gp.vy * dt;
          gp.mesh.scale.multiplyScalar(1 + 0.35 * dt);
          if (gp.life <= 0) {
            if (gp.mesh.parent) gp.mesh.parent.remove(gp.mesh);
            heistState.gasParticles.splice(i, 1);
          }
        }
        if (heistState.nerveGasTimer <= 0) {
          // Tactical gas mask reduces nerve-gas drain so player has intense urgency without instant death
          p.hp = Math.max(12, (p.hp || 100) - 4.5 * dt);
        }

        let remCarts = 0;
        for (const cart of heistState.lootCarts) {
          if (cart.collected) continue;
          remCarts++;
          cart.mesh.userData.glowRing.rotation.z += dt * 2.4;
          if (dist2D(p.x, p.z, cart.x, cart.z) < 2.45) {
            cart.collected = true;
            cart.mesh.visible = false;
            heistState.lootBag = Math.min(120000, heistState.lootBag + cart.value);
            activeCtx?.audio?.playCash?.();
            activeCtx?.audio?.playPickup?.();
            notifyFeed(`💎 Đã gom xe Kim Cương Hoàng Gia (+$${cart.value.toLocaleString('en-US')})!`, 'purple');
            if (heistState.lootBag === cart.value) {
              triggerMarketEvent('casino_heist_robbed', 1.0);
            }
          }
        }

        if (remCarts > 0 && heistState.nerveGasTimer > 5.0) {
          setObjectiveText(
            heistState.lootBag > 0
              ? `Giai đoạn 3: Vét thêm Kim Cương (${formatMoney(heistState.lootBag)} / $120,000 • Khí độc: ${Math.ceil(heistState.nerveGasTimer)}s) hoặc rút ra Thang Máy VIP (1200, 1181.5)!`
              : `Giai đoạn 3: Vét Kim Cương & Vàng (${formatMoney(heistState.lootBag)} / $120,000) trước khi Khí Độc tràn ngập (${Math.ceil(heistState.nerveGasTimer)}s)!`
          );
          if (sc) {
            sc.visible = heistState.lootBag > 0;
            if (sc.visible) sc.position.set(1200, 0.06, 1181.5);
          }
          if (
            heistState.lootBag > 0 &&
            (dist2D(p.x, p.z, 1200, 1181.5) < 2.8 ||
              dist2D(p.x, p.z, HEIST_COORDS.casinoExitInside.x, HEIST_COORDS.casinoExitInside.z) < 3.2)
          ) {
            triggerCasinoExteriorEscapeSiege();
          }
        } else {
          // Show extraction ring right at Vault Corridor Lift (1200, 1181) AND Casino Main Exit (1200, 1221)
          if (sc) {
            sc.visible = true;
            sc.position.set(1200, 0.06, 1181.5);
          }
          setObjectiveText(
            `Đã gom ${formatMoney(heistState.lootBag)}! Rút nhanh ra Thang Máy VIP (1200, 1181.5) hoặc Cửa Ra Casino để tẩu thoát!`
          );
          if (
            dist2D(p.x, p.z, 1200, 1181.5) < 2.8 ||
            dist2D(p.x, p.z, HEIST_COORDS.casinoExitInside.x, HEIST_COORDS.casinoExitInside.z) < 3.2
          ) {
            triggerCasinoExteriorEscapeSiege();
          }
        }
      } else if (heistState.subStep === 'escape_to_observatory') {
        if (sc) {
          sc.visible = true;
          sc.position.set(
            HEIST_COORDS.observatoryDropoff.x,
            getGroundY(HEIST_COORDS.observatoryDropoff.x, HEIST_COORDS.observatoryDropoff.z, 28.0),
            HEIST_COORDS.observatoryDropoff.z
          );
        }
        setObjectiveText(
          'Lái Trực Thăng Maverick (195, -138) hoặc Siêu Xe Độ (201, -87) cắt đuôi 5★ NOOSE lên Đài Thiên Văn Võ Lâm (68, -245) hoặc Động Phủ Tu Luyện!'
        );

        const dObs = dist2D(p.x, p.z, HEIST_COORDS.observatoryDropoff.x, HEIST_COORDS.observatoryDropoff.z);
        const dSafe = dist2D(p.x, p.z, HEIST_COORDS.safehouseDropoff.x, HEIST_COORDS.safehouseDropoff.z);
        if (dObs < 15.5 || dSafe < 9.5) {
          completeGrandHeist();
        }
      }
    }
  }

  // ==========================================================================
  // 9. MIDNIGHT NEON STREET RACING LEAGUE (5 FULL CIRCUITS • $1K–$25K WAGERS)
  // ==========================================================================
  const STREET_RACE_CIRCUITS = [
    {
      id: 'boulevard_sprint',
      index: 0,
      name: 'Boulevard Sprint',
      vnTitle: 'ĐẠI LỘ ÁNH SÁNG SPRINT',
      desc: 'Đường đua tốc độ cao dọc Đại lộ Bồng Lai rực sáng đèn neon và khu Tài chính.',
      laps: 2,
      defaultWager: 2500,
      start: { x: 40.0, y: 0.05, z: 165.0, yaw: Math.PI },
      checkpoints: [
        { x: 40, z: 95 },
        { x: 40, z: 15 },
        { x: 40, z: -65 },
        { x: 40, z: -120 },
        { x: 120, z: -120 },
        { x: 120, z: -40 },
        { x: 120, z: 40 },
        { x: 120, z: 120 },
        { x: 120, z: 200 },
        { x: 40, z: 200 },
        { x: 40, z: 165 }
      ]
    },
    {
      id: 'coastal_pier_dash',
      index: 1,
      name: 'Coastal Pier Dash',
      vnTitle: 'BÃO ĐÊM BỜ BIỂN PIER DASH',
      desc: 'Ôm cua drift sát bờ biển Thái Bình Dương, Cầu cảng Bồng Lai Pier và Túy Tiên Lâu.',
      laps: 2,
      defaultWager: 5000,
      start: { x: -120.0, y: 0.05, z: -155.0, yaw: 0 },
      checkpoints: [
        { x: -120, z: -85 },
        { x: -120, z: -10 },
        { x: -120, z: 65 },
        { x: -120, z: 120 },
        { x: -40, z: 120 },
        { x: -40, z: 40 },
        { x: -40, z: -40 },
        { x: -40, z: -120 },
        { x: -40, z: -200 },
        { x: -120, z: -200 },
        { x: -120, z: -155 }
      ]
    },
    {
      id: 'elevated_freeway_gp',
      index: 2,
      name: 'Elevated Freeway GP',
      vnTitle: 'CAO TỐC TRÊN CAO GRAND PRIX',
      desc: 'Giải Grand Prix tốc độ tối đa qua trục Tài chính Pillbox, Sòng bạc Diamond & Vành đai Nam.',
      laps: 2,
      defaultWager: 10000,
      start: { x: 200.0, y: 0.05, z: -150.0, yaw: 0 },
      checkpoints: [
        { x: 200, z: -70 },
        { x: 200, z: 20 },
        { x: 200, z: 110 },
        { x: 200, z: 200 },
        { x: 100, z: 200 },
        { x: -20, z: 200 },
        { x: -120, z: 200 },
        { x: -120, z: 60 },
        { x: -120, z: -80 },
        { x: -120, z: -200 },
        { x: 40, z: -200 },
        { x: 200, z: -200 },
        { x: 200, z: -150 }
      ]
    },
    {
      id: 'vinewood_touge_climb',
      index: 3,
      name: 'Võ Lâm Touge Climb',
      vnTitle: 'ĐÈO ĐỒI VINEWOOD TOUGE',
      desc: 'Cung đường kỹ thuật gắt dưới chân Đồi Võ Lâm & Đài Thiên Văn đòi hỏi kỹ năng phanh tay Drift.',
      laps: 2,
      defaultWager: 15000,
      start: { x: -20.0, y: 0.05, z: -200.0, yaw: Math.PI / 2 },
      checkpoints: [
        { x: 40, z: -200 },
        { x: 120, z: -200 },
        { x: 120, z: -120 },
        { x: 40, z: -120 },
        { x: 40, z: -40 },
        { x: -40, z: -40 },
        { x: -40, z: -120 },
        { x: -120, z: -120 },
        { x: -120, z: -200 },
        { x: -20, z: -200 }
      ]
    },
    {
      id: 'metropolis_grand_loop',
      index: 4,
      name: 'Metropolis Grand Loop',
      vnTitle: 'VÒNG ĐUA ĐẠI ĐÔ THỊ METROPOLIS',
      desc: 'Siêu giải vô địch toàn thành phố! Đặt cược tối đa $25,000 nhận ngay $62,500 cho nhà vô địch!',
      laps: 2,
      defaultWager: 25000,
      start: { x: 40.0, y: 0.05, z: -25.0, yaw: Math.PI },
      checkpoints: [
        { x: 40, z: -115 },
        { x: 40, z: -200 },
        { x: 200, z: -200 },
        { x: 200, z: -80 },
        { x: 200, z: 60 },
        { x: 200, z: 200 },
        { x: 40, z: 200 },
        { x: -120, z: 200 },
        { x: -120, z: 60 },
        { x: -120, z: -80 },
        { x: -40, z: -120 },
        { x: 40, z: -120 },
        { x: 40, z: 120 },
        { x: 40, z: 40 },
        { x: 40, z: -25 }
      ]
    }
  ];

  const AI_STREET_RACER_PROFILES = [
    { name: 'Kenji "Drift King"', carType: 'zentorno', paint: 0x0f172a, neon: 0x00f5ff, skill: 1.03, aggression: 0.92 },
    { name: 'Maya "Neon Phantom"', carType: 'obey9f', paint: 0x3b0764, neon: 0xff2cdf, skill: 1.00, aggression: 0.85 },
    { name: 'Dante "Apex Inferno"', carType: 'banshee', paint: 0x7f1d1d, neon: 0xff5500, skill: 0.98, aggression: 0.95 },
    { name: 'Viktor "Night Viper"', carType: 'obey9f', paint: 0x052e16, neon: 0x39ff14, skill: 0.96, aggression: 0.80 },
    { name: 'Rio "Golden Turbo"', carType: 'banshee', paint: 0x1e1b4b, neon: 0xfacc15, skill: 0.94, aggression: 0.78 }
  ];

  const raceState = {
    active: false,
    circuit: null,
    wager: 5000,
    selectedWagerTier: 5000,
    phase: 'idle', // 'countdown' | 'racing' | 'finished'
    countdownTimer: 3.4,
    lastCountdownInt: 4,
    elapsedTime: 0,
    lapStartTime: 0,
    bestLapTime: Infinity,
    bestTimesByCircuit: {},
    playerProgress: {
      lap: 1,
      cpIdx: 0,
      totalScore: 0,
      rank: 1,
      finished: false,
      finishTime: 0
    },
    aiRacers: [],
    playerLoanedCar: null,
    markerMeshes: [],
    activeArch: null,
    previewArch: null,
    chevronGroup: null
  };

  function buildRaceArch3D(colorHex = 0x00f0ff, isPreview = false) {
    const grp = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: isPreview ? 0.30 : 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const leftPillar = new THREE.Mesh(geoPool.archPillar, mat);
    leftPillar.position.set(-6.2, 3.8, 0);
    const rightPillar = new THREE.Mesh(geoPool.archPillar, mat);
    rightPillar.position.set(6.2, 3.8, 0);
    const topArc = new THREE.Mesh(geoPool.archTopTorus, mat);
    topArc.position.set(0, 7.5, 0);

    const groundRing = new THREE.Mesh(new THREE.RingGeometry(5.4, 6.4, 32), mat);
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.y = 0.06;

    grp.add(leftPillar, rightPillar, topArc, groundRing);
    grp.userData.mat = mat;
    return grp;
  }

  function buildDirectionalChevrons3D() {
    const grp = new THREE.Group();
    const chevMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const arrows = [];
    for (let i = 0; i < 3; i++) {
      const arrow = new THREE.Group();
      const wingL = new THREE.Mesh(geoPool.chevronBar, chevMat);
      wingL.position.set(-0.46, 0, 0);
      wingL.rotation.y = -0.62;
      const wingR = new THREE.Mesh(geoPool.chevronBar, chevMat);
      wingR.position.set(0.46, 0, 0);
      wingR.rotation.y = 0.62;
      arrow.add(wingL, wingR);
      arrow.position.set(0, 3.2, (i - 1) * 1.35);
      grp.add(arrow);
      arrows.push(arrow);
    }
    grp.userData.arrows = arrows;
    grp.userData.mat = chevMat;
    return grp;
  }

  function buildStreetRaceWorldMarkers() {
    const scene = getScene();
    if (!scene) return;
    if (!heistRoot.parent) scene.add(heistRoot);
    if (raceState.markerMeshes.length > 0) return;

    for (const circuit of STREET_RACE_CIRCUITS) {
      const gy = getGroundY(circuit.start.x, circuit.start.z, 0.05);
      const corona = createWorldCorona3D(
        0xd946ef,
        `🏁 ${circuit.vnTitle}`,
        `CƯỢC $${circuit.defaultWager.toLocaleString()} • ĂN 2.5X`,
        true
      );
      corona.position.set(circuit.start.x, gy, circuit.start.z);
      heistRoot.add(corona);
      raceState.markerMeshes.push({ circuit, mesh: corona });
    }

    raceState.activeArch = buildRaceArch3D(0x00f0ff, false);
    raceState.activeArch.visible = false;
    heistRoot.add(raceState.activeArch);

    raceState.previewArch = buildRaceArch3D(0xc084fc, true);
    raceState.previewArch.visible = false;
    heistRoot.add(raceState.previewArch);

    raceState.chevronGroup = buildDirectionalChevrons3D();
    raceState.chevronGroup.visible = false;
    heistRoot.add(raceState.chevronGroup);
  }

  function resolveCircuitDef(idOrIdx) {
    if (typeof idOrIdx === 'number') {
      const idx = idOrIdx >= 1 && idOrIdx <= 5 && !STREET_RACE_CIRCUITS[idOrIdx] ? idOrIdx - 1 : clamp(idOrIdx, 0, 4);
      return STREET_RACE_CIRCUITS[idx] || STREET_RACE_CIRCUITS[0];
    }
    const key = String(idOrIdx || '').toLowerCase();
    return (
      STREET_RACE_CIRCUITS.find(
        (c) => c.id === key || c.name.toLowerCase().includes(key) || c.vnTitle.toLowerCase().includes(key)
      ) || STREET_RACE_CIRCUITS[0]
    );
  }

  function syncRaceCheckpointVisuals() {
    const cir = raceState.circuit;
    if (!cir || !raceState.active) return;
    const cps = cir.checkpoints;
    const idx = raceState.playerProgress.cpIdx;
    const curCp = cps[idx];
    const nextCp = cps[(idx + 1) % cps.length];
    const isFinalFinish = raceState.playerProgress.lap === cir.laps && idx === cps.length - 1;

    if (raceState.activeArch && curCp) {
      const gy = getGroundY(curCp.x, curCp.z, 0.05);
      raceState.activeArch.visible = true;
      raceState.activeArch.position.set(curCp.x, gy, curCp.z);

      // Orient arch perpendicular to incoming/outgoing racing line
      const prevCp = idx > 0 ? cps[idx - 1] : cir.start;
      const incomingYaw = Math.atan2(curCp.x - prevCp.x, curCp.z - prevCp.z);
      raceState.activeArch.rotation.y = incomingYaw;
      raceState.activeArch.userData.mat.color.setHex(isFinalFinish ? 0xfbbf24 : 0x00f0ff);

      if (raceState.chevronGroup && nextCp) {
        raceState.chevronGroup.visible = true;
        raceState.chevronGroup.userData.perfIgnore = true;
        raceState.chevronGroup.position.set(curCp.x, gy + 1.8, curCp.z);
        raceState.chevronGroup.scale.set(2.4, 2.4, 2.4);
        const nextYaw = Math.atan2(nextCp.x - curCp.x, nextCp.z - curCp.z);
        raceState.chevronGroup.rotation.y = nextYaw;

        // Show clear turn-direction arrow hint on HUD for upcoming corner
        let diff = nextYaw - incomingYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turnHint = isFinalFinish
          ? '🏁 THẲNG TỚI ĐÍCH!'
          : diff > 0.42
            ? '⬅️ KHÚC CUA PHÍA TRƯỚC: RẼ TRÁI'
            : diff < -0.42
              ? '➡️ KHÚC CUA PHÍA TRƯỚC: RẼ PHẢI'
              : '⬆️ ĐI THẲNG TỚI CỔNG TIẾP THEO';
        setObjectiveText(turnHint);
      }
    }

    if (raceState.previewArch && nextCp && !isFinalFinish) {
      const ngy = getGroundY(nextCp.x, nextCp.z, 0.05);
      raceState.previewArch.visible = true;
      raceState.previewArch.position.set(nextCp.x, ngy, nextCp.z);
      raceState.previewArch.rotation.y = Math.atan2(nextCp.x - curCp.x, nextCp.z - curCp.z);
    } else if (raceState.previewArch) {
      raceState.previewArch.visible = false;
    }

    if (curCp) {
      setGPSWaypoints(curCp.x, curCp.z, [{ x: curCp.x, z: curCp.z }]);
    }
  }

  /**
   * Start one of the 5 Midnight Neon Street Racing Circuits (`wager`: $1,000 .. $25,000)
   */
  function startStreetRace(circuitId = 0, requestedWager = null) {
    ensureHeistsDOM();
    buildStreetRaceWorldMarkers();
    closeStockMarket();
    closeAchievements();
    closeActivityHub();
    activeCtx?.ui?.closePhone?.();

    if (heistState.active) {
      clearHeistEntities();
      heistState.active = false;
    }
    if (bountyState.active) abortBounty(true);
    if (activeCtx?.gameplay?.mission?.active) {
      activeCtx.gameplay.mission.active = false;
    }
    if (raceState.active) {
      cleanupRaceEntities();
    }

    const circuit = resolveCircuitDef(circuitId);
    const rawWager = requestedWager !== null ? Number(requestedWager) : circuit.defaultWager;
    const wager = clamp(Math.round(rawWager || circuit.defaultWager), 1000, 25000);

    const cash = getPlayerCash();
    if (cash >= wager) {
      addPlayerCash(-wager, true);
    } else if (cash >= 1000 && requestedWager === null) {
      // Scale wager down cleanly to player's cash if using default marker trigger
      const affordable = Math.floor(cash / 500) * 500;
      addPlayerCash(-affordable, true);
    }

    setWantedStars(0);
    // Giữ/chuyển sang ban ngày (BRIGHT_DAY) khi đua xe giang hồ
    if (activeCtx?.engine?.timeWeather !== 'BRIGHT_DAY' && activeCtx?.engine?.setTimeWeather) {
      try {
        activeCtx.engine.setTimeWeather('BRIGHT_DAY');
      } catch (_) {}
    }

    raceState.active = true;
    raceState.circuit = circuit;
    raceState.wager = wager;
    raceState.phase = 'countdown';
    raceState.countdownTimer = 3.2;
    raceState.lastCountdownInt = 4;
    raceState.elapsedTime = 0;
    raceState.lapStartTime = 0;
    raceState.bestLapTime = Infinity;
    raceState.playerProgress = {
      lap: 1,
      cpIdx: 0,
      totalScore: 0,
      rank: 6,
      finished: false,
      finishTime: 0
    };

    const startYaw = circuit.start.yaw;
    const fwdX = Math.sin(startYaw);
    const fwdZ = Math.cos(startYaw);
    const rightX = -Math.cos(startYaw);
    const rightZ = Math.sin(startYaw);

    // Ensure Player has a high-performance Đua Đêm Giang Hồ Car & place in Pole/Row-3 Grid Slot!
    let pCar = getPlayerVehicle();
    if (!pCar || pCar.type === 'heli' || pCar.isBoat) {
      const gx = circuit.start.x + rightX * 2.4 - fwdX * 12.0;
      const gz = circuit.start.z + rightZ * 2.4 - fwdZ * 12.0;
      const gy = getGroundY(gx, gz, 0.05);
      teleportPlayerSafe(gx, gy + 0.2, gz, startYaw);
      pCar = spawnVehicleSafe('obey9f', gx, gy, gz, startYaw, {
        color: 0x0ea5e9,
        isMissionCar: true
      });
      if (pCar) {
        attachRacerUnderglowAndAero(pCar, 0x00f5ff);
        raceState.playerLoanedCar = pCar;
        if (activeCtx?.vehicles?.enterVehicle) {
          try {
            activeCtx.vehicles.enterVehicle(pCar);
          } catch (_) {}
        }
      }
    } else {
      const gx = circuit.start.x + rightX * 2.4 - fwdX * 12.0;
      const gz = circuit.start.z + rightZ * 2.4 - fwdZ * 12.0;
      const gy = getGroundY(gx, gz, 0.05);
      pCar.x = gx;
      pCar.y = gy;
      pCar.z = gz;
      pCar.yaw = startYaw;
      pCar.vx = 0;
      pCar.vz = 0;
      if (pCar.mesh) {
        pCar.mesh.position.set(gx, gy, gz);
        pCar.mesh.rotation.y = startYaw;
      }
      if (!pCar._underglowRig) {
        attachRacerUnderglowAndAero(pCar, 0x38bdf8);
      }
    }

    // Move nearby ambient traffic out of the starting grid corridor
    if (Array.isArray(activeCtx?.vehicles?.list)) {
      for (const tc of activeCtx.vehicles.list) {
        if (!tc || tc === pCar || tc.isHero) continue;
        if (dist2D(tc.x, tc.z, circuit.start.x, circuit.start.z) < 34) {
          tc.x += rightX * 26;
          if (tc.mesh) tc.mesh.position.x = tc.x;
        }
      }
    }

    // Spawn 5 Aggressive AI Tuned Supercars with Underglow Neon in Staggered F1 Grid!
    raceState.aiRacers.length = 0;
    for (let i = 0; i < 5; i++) {
      const prof = AI_STREET_RACER_PROFILES[i];
      const row = Math.floor(i / 2);
      const laneSide = i % 2 === 0 ? -2.4 : 2.4;
      const backDist = row * 6.0;
      const rx = circuit.start.x + rightX * laneSide - fwdX * backDist;
      const rz = circuit.start.z + rightZ * laneSide - fwdZ * backDist;
      const ry = getGroundY(rx, rz, 0.05);

      const aiCar = spawnVehicleSafe(prof.carType, rx, ry, rz, startYaw, {
        color: prof.paint,
        isRaceAI: true
      });
      if (aiCar) {
        // Tune AI supercar performance & attach glowing neon underglow + GT wing!
        aiCar.maxSpeed = Math.max(aiCar.maxSpeed || 42, 43.5 * prof.skill);
        aiCar.accel = Math.max(aiCar.accel || 30, 32.5 * prof.skill);
        aiCar.aiInput = { throttle: 0, brake: 1, steer: 0, handbrake: false };
        attachRacerUnderglowAndAero(aiCar, prof.neon);

        raceState.aiRacers.push({
          id: i + 1,
          name: prof.name,
          neonHex: '#' + new THREE.Color(prof.neon).getHexString(),
          skill: prof.skill,
          aggression: prof.aggression,
          car: aiCar,
          lap: 1,
          cpIdx: 0,
          totalScore: 0,
          stuckTimer: 0,
          nitroTimer: 0,
          finished: false,
          finishTime: 0
        });
      }
    }

    syncRaceCheckpointVisuals();
    domRefs.raceHud?.classList.add('visible');
    if (domRefs.raceBestVal) {
      domRefs.raceBestVal.textContent = `Cược: ${formatMoney(wager)} • Hạng 1 (2.5x): ${formatMoney(Math.round(wager * 2.5))}`;
    }
    notifyFeed(
      `🏁 Giải Đua Đêm "${circuit.vnTitle}" — Cược ${formatMoney(wager)} (Thưởng Vô Địch: ${formatMoney(Math.round(wager * 2.5))})!`,
      'purple'
    );
    return true;
  }

  function cleanupRaceEntities() {
    for (const r of raceState.aiRacers) {
      if (r.car) removeVehicleSafe(r.car);
    }
    raceState.aiRacers.length = 0;

    if (raceState.activeArch) raceState.activeArch.visible = false;
    if (raceState.previewArch) raceState.previewArch.visible = false;
    if (raceState.chevronGroup) raceState.chevronGroup.visible = false;
    domRefs.raceHud?.classList.remove('visible');
    domRefs.raceCountdown?.classList.remove('visible');
  }

  function abortStreetRace(silent = false) {
    cleanupRaceEntities();
    clearGPSWaypoints();
    raceState.active = false;
    raceState.phase = 'idle';
    setObjectiveText('');
    if (!silent) {
      notifyFeed('Đã hủy cuộc đua đường phố.', 'gold');
    }
  }

  function finishStreetRace() {
    const cir = raceState.circuit;
    const rank = raceState.playerProgress.rank;
    const wager = raceState.wager;
    let payout = 0;

    if (rank === 1) {
      payout = Math.round(wager * 2.5);
      progressionStats.streetRacesWon += 1;
      progressionStats.wonCircuitsSet.add(cir.id);
      if (wager >= 25000) progressionStats.wonMaxWagerRace = true;
      triggerMarketEvent('street_race_won', wager >= 15000 ? 1.35 : 1.0);
    } else if (rank === 2) {
      payout = Math.round(wager * 1.2);
    } else if (rank === 3) {
      payout = Math.round(wager * 0.5);
    }

    if (payout > 0) {
      addPlayerCash(payout, true);
    }

    const totalTimeStr = formatRaceTime(raceState.elapsedTime);
    const prevBest = raceState.bestTimesByCircuit[cir.id] || Infinity;
    if (raceState.elapsedTime < prevBest) {
      raceState.bestTimesByCircuit[cir.id] = raceState.elapsedTime;
    }

    cleanupRaceEntities();
    clearGPSWaypoints();
    raceState.active = false;
    raceState.phase = 'idle';
    setObjectiveText('');
    saveProgressionStats();
    evaluateAchievements();

    if (rank === 1) {
      showBigBanner(
        `VÔ ĐỊCH HẠNG 1/6 • +$${payout.toLocaleString('en-US')}`,
        `${cir.vnTitle} • Thời gian: ${totalTimeStr}`,
        'passed',
        5.4
      );
    } else {
      showBigBanner(
        `VỀ ĐÍCH HẠNG ${rank}/6`,
        `${cir.vnTitle} • ${payout > 0 ? 'Nhận ' + formatMoney(payout) : 'Chúc may mắn lần sau!'}`,
        rank <= 2 ? 'passed' : 'failed',
        4.5
      );
    }
  }

  function updateStreetRacingLeague(dt, rawDt) {
    const p = activeCtx?.player;
    if (!p) return;

    // 1. World Checkered Purple Race Markers in Free-Roam
    const freeRoam = !heistState.active && !raceState.active && !bountyState.active && !(activeCtx?.gameplay?.mission?.active);
    const pulse = 1 + Math.sin(performance.now() * 0.0045) * 0.09;

    for (let i = 0; i < raceState.markerMeshes.length; i++) {
      const m = raceState.markerMeshes[i];
      m.mesh.visible = freeRoam && p.x < 500;
      if (m.mesh.visible) {
        m.mesh.userData.ring.scale.setScalar(pulse);
        if (m.mesh.userData.chkMesh) {
          m.mesh.userData.chkMesh.rotation.z += dt * 0.9;
        }
        if (dist2D(p.x, p.z, m.circuit.start.x, m.circuit.start.z) < 4.5) {
          showInteractHint(
            `Nhấn [F] Đua "${m.circuit.vnTitle}" ($${m.circuit.defaultWager.toLocaleString()}) • [G] Chọn Mức Cược ($1K–$25K)`
          );
          if (activeCtx?.input?.interactJustPressed) {
            startStreetRace(m.circuit.id, m.circuit.defaultWager);
            return;
          }
          if (activeCtx?.input?.keys?.KeyG) {
            openActivityHub('races');
            return;
          }
        }
      }
    }

    if (!raceState.active || !raceState.circuit) return;

    if (p.isDead || p.dead || p.isBusted) {
      abortStreetRace(true);
      return;
    }

    const cir = raceState.circuit;
    const cps = cir.checkpoints;
    const pCar = getPlayerVehicle();

    // Animate 3D Directional Chevrons pulsing forward inside the active checkpoint arch
    if (raceState.chevronGroup?.visible) {
      const arrows = raceState.chevronGroup.userData.arrows;
      const tWave = performance.now() * 0.006;
      for (let i = 0; i < arrows.length; i++) {
        arrows[i].scale.setScalar(0.85 + Math.sin(tWave - i * 0.9) * 0.22);
      }
    }

    // Phase A: 3 - 2 - 1 - XUẤT PHÁT! Countdown
    if (raceState.phase === 'countdown') {
      raceState.countdownTimer -= rawDt;

      // Hold player & AI cars revving on the grid
      if (pCar) {
        pCar.vx *= 0.2;
        pCar.vz *= 0.2;
      }
      for (const ai of raceState.aiRacers) {
        if (ai.car) {
          ai.car.aiInput = { throttle: 0, brake: 1, steer: 0, handbrake: false };
          ai.car.vx = 0;
          ai.car.vz = 0;
        }
      }

      const ceilSec = Math.ceil(raceState.countdownTimer);
      if (ceilSec !== raceState.lastCountdownInt && ceilSec >= 1 && ceilSec <= 3) {
        raceState.lastCountdownInt = ceilSec;
        heistSFX.playCountdownBeep(false);
        if (domRefs.raceCountdown) {
          domRefs.raceCountdown.textContent = String(ceilSec);
          domRefs.raceCountdown.classList.add('visible');
        }
      }

      if (raceState.countdownTimer <= 0) {
        raceState.phase = 'racing';
        heistSFX.playCountdownBeep(true);
        if (domRefs.raceCountdown) {
          domRefs.raceCountdown.textContent = 'XUẤT PHÁT!';
          domRefs.raceCountdown.classList.add('visible');
          setTimeout(() => {
            domRefs.raceCountdown?.classList.remove('visible');
          }, 950);
        }
      }
      setObjectiveText(`Chuẩn bị xuất phát giải "${cir.vnTitle}" — Hạng 1 ăn 2.5x tiền cược!`);
      return;
    }

    // Phase B: Live Racing & Aggressive Rubber-Banding AI Supercars
    raceState.elapsedTime += dt;

    // 1. Check Player Checkpoint Progression
    const pp = raceState.playerProgress;
    const curCp = cps[pp.cpIdx];
    const px = pCar ? pCar.x : p.x;
    const pz = pCar ? pCar.z : p.z;
    const distToCp = dist2D(px, pz, curCp.x, curCp.z);

    if (distToCp < 11.5) {
      pp.cpIdx++;
      if (pp.cpIdx >= cps.length) {
        if (pp.lap >= cir.laps) {
          pp.finished = true;
          pp.finishTime = raceState.elapsedTime;
          heistSFX.playCheckpoint(true);
          finishStreetRace();
          return;
        } else {
          const lapDur = raceState.elapsedTime - raceState.lapStartTime;
          if (lapDur < raceState.bestLapTime) raceState.bestLapTime = lapDur;
          raceState.lapStartTime = raceState.elapsedTime;
          pp.lap++;
          pp.cpIdx = 0;
          heistSFX.playCheckpoint(true);
          notifyFeed(`🔥 Vòng ${pp.lap}/${cir.laps}! Vòng vừa rồi: ${formatRaceTime(lapDur)}`, 'purple');
        }
      } else {
        heistSFX.playCheckpoint(false);
      }
      syncRaceCheckpointVisuals();
    }

    const nextTargetAfterPlayer = cps[pp.cpIdx];
    pp.totalScore = (pp.lap - 1) * cps.length + pp.cpIdx + clamp(1 - dist2D(px, pz, nextTargetAfterPlayer.x, nextTargetAfterPlayer.z) / 180, 0, 0.99);

    // 2. Step all 5 AI Street Racers with Apex Braking, Drift & Rubber-Banding
    for (let i = 0; i < raceState.aiRacers.length; i++) {
      const ai = raceState.aiRacers[i];
      const car = ai.car;
      if (!car || ai.finished) continue;

      const aiCp = cps[ai.cpIdx];
      const aiNextCp = cps[(ai.cpIdx + 1) % cps.length];
      const dCp = dist2D(car.x, car.z, aiCp.x, aiCp.z);

      if (dCp < 11.0) {
        ai.cpIdx++;
        if (ai.cpIdx >= cps.length) {
          if (ai.lap >= cir.laps) {
            ai.finished = true;
            ai.finishTime = raceState.elapsedTime;
            ai.totalScore = cir.laps * cps.length + 5 - i * 0.01;
            car.aiInput = { throttle: 0, brake: 0.85, steer: 0, handbrake: false };
            continue;
          } else {
            ai.lap++;
            ai.cpIdx = 0;
          }
        }
      }

      const activeTarget = cps[ai.cpIdx];
      ai.totalScore = (ai.lap - 1) * cps.length + ai.cpIdx + clamp(1 - dist2D(car.x, car.z, activeTarget.x, activeTarget.z) / 180, 0, 0.99);

      // Desired steering toward active checkpoint (blending slightly toward next checkpoint near apex)
      const blendNext = dCp < 22 ? clamp(1 - dCp / 22, 0, 0.42) : 0;
      const aimX = lerp(activeTarget.x, aiNextCp.x, blendNext) + Math.sin(i * 2.1) * 1.6;
      const aimZ = lerp(activeTarget.z, aiNextCp.z, blendNext) + Math.cos(i * 2.1) * 1.6;

      const desiredYaw = Math.atan2(aimX - car.x, aimZ - car.z);
      // Note: In vehicles.js stepGroundCar, turning right (str > 0) decreases yaw!
      const angleErr = wrapAngle(desiredYaw - car.yaw);
      const steerCmd = clamp(-angleErr * 1.95, -1, 1);

      const curSpeed = Math.hypot(car.vx || 0, car.vz || 0);

      // Upcoming corner sharpness for realistic apex braking & powerslide drift
      const incomingYaw = Math.atan2(activeTarget.x - car.x, activeTarget.z - car.z);
      const outgoingYaw = Math.atan2(aiNextCp.x - activeTarget.x, aiNextCp.z - activeTarget.z);
      const cornerTurn = Math.abs(wrapAngle(outgoingYaw - incomingYaw));

      // Rubber-banding multiplier relative to player's race score
      const scoreDiff = pp.totalScore - ai.totalScore; // >0 means player is ahead of AI
      const rubberMult = clamp(1.0 + scoreDiff * 0.085, 0.84, 1.18) * ai.skill;
      car.maxSpeed = 42.5 * rubberMult;

      let throttle = 0.96;
      let brake = 0;
      let handbrake = false;

      if (dCp < 28 && cornerTurn > 0.95 && curSpeed > 23) {
        throttle = 0.25;
        brake = 0.55;
        if (Math.abs(angleErr) > 0.55 && curSpeed > 18) {
          handbrake = true;
        }
      } else if (Math.abs(angleErr) > 0.85 && curSpeed > 16) {
        throttle = 0.45;
        handbrake = true;
      }

      // Stuck against building/traffic recovery
      if (curSpeed < 2.2) {
        ai.stuckTimer += dt;
        if (ai.stuckTimer > 1.65) {
          ai.stuckTimer = 0;
          car.x = lerp(car.x, activeTarget.x, 0.08);
          car.z = lerp(car.z, activeTarget.z, 0.08);
          car.yaw = desiredYaw;
          if (car.mesh) {
            car.mesh.position.set(car.x, car.y, car.z);
            car.mesh.rotation.y = car.yaw;
          }
        }
      } else {
        ai.stuckTimer = Math.max(0, ai.stuckTimer - dt);
      }

      // Visual Nitrous Exhaust Cones on straightaway bursts
      const usingNitro = throttle > 0.9 && Math.abs(angleErr) < 0.16 && scoreDiff > 0.25;
      if (car._nitroGroup) {
        car._nitroGroup.visible = usingNitro;
      }

      car.aiInput = {
        throttle,
        brake,
        steer: steerCmd,
        handbrake
      };
    }

    // 2B. Player Slipstream Aerodynamic Drafting & N2O Nitrous Oxide Boost System!
    if (pCar) {
      if (typeof raceState.playerNitro !== 'number') raceState.playerNitro = 65;
      let inSlipstream = false;
      const pFwdX = Math.sin(pCar.yaw || 0);
      const pFwdZ = Math.cos(pCar.yaw || 0);
      const pSpeed = Math.hypot(pCar.vx || 0, pCar.vz || 0);

      if (pSpeed > 14) {
        for (let i = 0; i < raceState.aiRacers.length; i++) {
          const aiCar = raceState.aiRacers[i].car;
          if (!aiCar) continue;
          const dx = aiCar.x - pCar.x;
          const dz = aiCar.z - pCar.z;
          const ahead = dx * pFwdX + dz * pFwdZ;
          const lat = Math.abs(-dx * pFwdZ + dz * pFwdX);
          if (ahead > 3.5 && ahead < 22.0 && lat < 2.85) {
            inSlipstream = true;
            break;
          }
        }
      }

      if (inSlipstream) {
        raceState.playerNitro = Math.min(100, raceState.playerNitro + 22.0 * dt);
        pCar.vx += pFwdX * 4.2 * dt;
        pCar.vz += pFwdZ * 4.2 * dt;
      } else if (pCar.isDrifting && pSpeed > 10) {
        raceState.playerNitro = Math.min(100, raceState.playerNitro + 16.0 * dt);
      } else {
        raceState.playerNitro = Math.min(100, raceState.playerNitro + 3.5 * dt);
      }

      const wantNitro = Boolean(
        (activeCtx?.input?.sprint || activeCtx?.input?.boost || activeCtx?.input?.keys?.ShiftLeft) &&
          raceState.playerNitro > 4 &&
          pSpeed > 8
      );

      if (wantNitro) {
        raceState.playerNitro = Math.max(0, raceState.playerNitro - 28.0 * dt);
        const maxBoosted = (pCar.maxSpeed || 42) * 1.22;
        if (pSpeed < maxBoosted) {
          pCar.vx += pFwdX * 15.5 * dt;
          pCar.vz += pFwdZ * 15.5 * dt;
        }
        if (pCar._nitroGroup) {
          pCar._nitroGroup.visible = true;
          const pulseScale = 0.9 + Math.random() * 0.35;
          pCar._nitroGroup.scale.set(1, 1, pulseScale);
        }
        activeCtx?.engine?.addShake?.(0.018);
      } else if (pCar._nitroGroup) {
        pCar._nitroGroup.visible = false;
      }
    }

    // 3. Compute Live Standings (1st .. 6th) & Update Race HUD
    const board = [
      { isPlayer: true, name: 'BẠN (TAY ĐUA)', score: pp.totalScore, color: '#38bdf8' },
      ...raceState.aiRacers.map((r) => ({
        isPlayer: false,
        name: r.name,
        score: r.totalScore,
        color: r.neonHex
      }))
    ];
    board.sort((a, b) => b.score - a.score);

    const pRank = board.findIndex((b) => b.isPlayer) + 1;
    pp.rank = pRank;
    const suffix = pRank === 1 ? 'st' : pRank === 2 ? 'nd' : pRank === 3 ? 'rd' : 'th';

    if (domRefs.racePosVal) domRefs.racePosVal.textContent = `${pRank}${suffix} / 6`;
    if (domRefs.raceLapVal) domRefs.raceLapVal.textContent = `VÒNG ${pp.lap}/${cir.laps}`;
    if (domRefs.raceCpVal) domRefs.raceCpVal.textContent = `Cổng ${pp.cpIdx + 1}/${cps.length}`;
    if (domRefs.raceTimeVal) domRefs.raceTimeVal.textContent = formatRaceTime(raceState.elapsedTime);

    if (domRefs.raceStandings) {
      const nitroPct = Math.round(raceState.playerNitro ?? 65);
      const nitroBar = `
        <div style="margin-bottom:6px;">
          <div style="display:flex;justify-content:space-between;font-size:10.5px;color:#7dd3fc;font-weight:800;">
            <span>⚡ NITRO N2O [Shift]</span>
            <span>${nitroPct}%</span>
          </div>
          <div style="height:5px;background:rgba(15,23,42,0.9);border-radius:999px;overflow:hidden;margin-top:2px;">
            <div style="height:100%;width:${nitroPct}%;background:linear-gradient(90deg,#0ea5e9,#e879f9);"></div>
          </div>
        </div>`;
      domRefs.raceStandings.innerHTML =
        nitroBar +
        board
          .slice(0, 4)
          .map(
            (entry, idx) =>
              `<div style="display:flex;justify-content:space-between;color:${entry.isPlayer ? '#fde047' : '#cbd5e1'};font-weight:${entry.isPlayer ? '800' : '500'};">
                <span>#${idx + 1} <span style="color:${entry.color};">●</span> ${escapeHTML(entry.name)}</span>
              </div>`
          )
          .join('');
    }

    setObjectiveText(
      `Đua "${cir.vnTitle}": Hạng ${pRank}/6 • Vòng ${pp.lap}/${cir.laps} • Bám theo mũi tên vàng trong Cổng Neon!`
    );
  }

  // ==========================================================================
  // 10. BOUNTY HUNTER SYSTEM (5 NAMED WANTED FUGITIVES — DEAD OR ALIVE!)
  // ==========================================================================
  const BOUNTY_TARGETS = [
    {
      id: 1,
      code: 'marco_vega',
      name: 'Marco "Cá Mập Cảng" Vega',
      alias: 'Trùm Buôn Lậu Cầu Cảng',
      crime: 'Buôn lậu vũ khí quân dụng & cướp tàu hàng Thái Bình Dương',
      threat: 'TRUNG BÌNH • Tiểu liên Micro-SMG',
      reward: 8500,
      aliveBonus: 11475,
      preset: 'gangster',
      weapon: 'smg',
      hp: 155,
      pos: { x: -246.0, y: 3.8, z: 4.0 },
      escapeCar: null,
      guards: [
        { ox: 4.5, oz: -3.2, preset: 'gangster', weapon: 'pistol', hp: 80 },
        { ox: 4.5, oz: 3.5, preset: 'gangster', weapon: 'smg', hp: 85 }
      ]
    },
    {
      id: 2,
      code: 'razer_kuroyama',
      name: 'Razer "Bóng Đêm" Kuroyama',
      alias: 'Ông Trùm Đua Xe Ngầm Rockford',
      crime: 'Tổ chức đua siêu xe trái phép, tông xe tuần tra Thiên Đình Chấp Pháp & tống tiền',
      threat: 'CAO • Cố gắng phóng Banshee GT tẩu thoát!',
      reward: 12000,
      aliveBonus: 16200,
      preset: 'street_racer',
      weapon: 'smg',
      hp: 170,
      pos: { x: -40.0, y: 0.05, z: -112.0 },
      escapeCar: { type: 'banshee', ox: -3.8, oz: 5.5, yaw: 0, color: 0xbe123c, neon: 0xff2cdf },
      guards: [
        { ox: 3.2, oz: -2.5, preset: 'gangster', weapon: 'pistol', hp: 85 },
        { ox: -3.5, oz: -2.0, preset: 'gangster', weapon: 'smg', hp: 90 }
      ]
    },
    {
      id: 3,
      code: 'boris_volkov',
      name: 'Boris "Búa Thép" Volkov',
      alias: 'Trùm Lính Đánh Thuê Bến Du Thuyền',
      crime: 'Cướp xe bọc thép chở vàng & cung cấp thuốc nổ C4 cho băng đảng',
      threat: 'RẤT CAO • Mặc giáp chống đạn + Shotgun tác chiến',
      reward: 16500,
      aliveBonus: 22275,
      preset: 'swat',
      weapon: 'shotgun',
      hp: 210,
      pos: { x: -186.0, y: 0.22, z: 126.0 },
      escapeCar: { type: 'suv', ox: 6.0, oz: -4.0, yaw: Math.PI / 2, color: 0x1e293b, neon: 0xf97316 },
      guards: [
        { ox: -4.0, oz: 3.5, preset: 'gangster', weapon: 'smg', hp: 95 },
        { ox: 4.0, oz: 3.5, preset: 'swat', weapon: 'carbine', hp: 110 },
        { ox: 0.0, oz: -4.5, preset: 'gangster', weapon: 'shotgun', hp: 100 }
      ]
    },
    {
      id: 4,
      code: 'devon_sterling',
      name: 'Devon "Sói Phố Wall" Sterling',
      alias: 'Tỷ Phú Lừa Đảo Sàn Vạn Thương Linh Các',
      crime: 'Thao túng nội gián cổ phiếu ngân hàng & biển thủ $40,000,000 quỹ đầu tư',
      threat: 'CAO • Đội vệ sĩ tư nhân bảo vệ nghiêm ngặt tại Khu Tài Chính',
      reward: 22000,
      aliveBonus: 29700,
      preset: 'luxury_suit',
      weapon: 'pistol',
      hp: 165,
      pos: { x: 196.0, y: 0.22, z: 42.0 },
      escapeCar: { type: 'sedan_lux', ox: 3.8, oz: 6.5, yaw: 0, color: 0x0f172a, neon: 0x38bdf8 },
      guards: [
        { ox: -3.5, oz: -3.0, preset: 'luxury_suit', weapon: 'smg', hp: 105 },
        { ox: 3.5, oz: -3.0, preset: 'luxury_suit', weapon: 'carbine', hp: 115 },
        { ox: -3.0, oz: 3.5, preset: 'swat', weapon: 'smg', hp: 115 }
      ]
    },
    {
      id: 5,
      code: 'el_diablo_salazar',
      name: 'El Diablo "Chúa Tể Đồi Cao" Salazar',
      alias: 'Thủ Lĩnh Tối Cao Cartel Tiên Thành',
      crime: 'Chỉ huy mạng lưới tội phạm xuyên biên giới — Truy nã Đặc biệt Số 1 FIB!',
      threat: 'CỰC NGUY HIỂM • 4 Cận vệ Carbine M4 tinh nhuệ tại Đồi Võ Lâm',
      reward: 35000,
      aliveBonus: 47250,
      preset: 'tactical_heist',
      weapon: 'carbine',
      hp: 260,
      pos: { x: 65.0, y: 0.22, z: -206.0 },
      escapeCar: { type: 'suv', ox: -5.5, oz: 4.5, yaw: -Math.PI / 2, color: 0x450a0a, neon: 0xef4444 },
      guards: [
        { ox: -5.0, oz: -3.5, preset: 'swat', weapon: 'carbine', hp: 125 },
        { ox: 5.0, oz: -3.5, preset: 'swat', weapon: 'carbine', hp: 125 },
        { ox: -4.0, oz: 3.5, preset: 'gangster', weapon: 'shotgun', hp: 115 },
        { ox: 4.0, oz: 3.5, preset: 'gangster', weapon: 'smg', hp: 110 }
      ]
    }
  ];

  const PRECINCT_BOUNTY_BOARD = { x: 126.0, y: 0.22, z: 76.0 };

  const bountyState = {
    active: false,
    def: null,
    stage: 'idle', // 'hunt' | 'surrendered' | 'escort_precinct' | 'confirm_kill'
    fugitive: null,
    bodyguards: [],
    escapeVehicle: null,
    ambushVehicles: [],
    fleeingInCar: false,
    capturedAlive: false,
    boardCoronaMesh: null,
    targetBeaconMesh: null,
    completedIds: new Set(),
    capturedAliveIds: new Set()
  };

  function buildBountyBoardVisuals() {
    const scene = getScene();
    if (!scene) return;
    if (!heistRoot.parent) scene.add(heistRoot);

    if (!bountyState.boardCoronaMesh) {
      const gy = getGroundY(PRECINCT_BOUNTY_BOARD.x, PRECINCT_BOUNTY_BOARD.z, 0.22);
      const corona = createWorldCorona3D(
        0xf97316,
        '🎯 BẢNG TRUY NÃ TỘI PHẠM',
        '5 MỤC TIÊU • THƯỞNG TỚI $47,250'
      );
      corona.position.set(PRECINCT_BOUNTY_BOARD.x, gy, PRECINCT_BOUNTY_BOARD.z);
      heistRoot.add(corona);
      bountyState.boardCoronaMesh = corona;
    }

    if (!bountyState.targetBeaconMesh) {
      const beacon = createWorldCorona3D(0xef4444, '', '', false);
      beacon.visible = false;
      heistRoot.add(beacon);
      bountyState.targetBeaconMesh = beacon;
    }
  }

  function clearBountyEntities() {
    const bucket = ensureGameplayEnemyBucket();
    if (bountyState.fugitive) {
      if (bountyState.fugitive.mesh?.parent) bountyState.fugitive.mesh.parent.remove(bountyState.fugitive.mesh);
      if (bucket) {
        const idx = bucket.indexOf(bountyState.fugitive);
        if (idx !== -1) bucket.splice(idx, 1);
      }
      bountyState.fugitive = null;
    }
    for (const bg of bountyState.bodyguards) {
      if (bg.mesh?.parent) bg.mesh.parent.remove(bg.mesh);
      if (bucket) {
        const idx = bucket.indexOf(bg);
        if (idx !== -1) bucket.splice(idx, 1);
      }
    }
    bountyState.bodyguards.length = 0;

    if (bountyState.escapeVehicle) {
      removeVehicleSafe(bountyState.escapeVehicle);
      bountyState.escapeVehicle = null;
    }
    for (const av of bountyState.ambushVehicles) {
      removeVehicleSafe(av);
    }
    bountyState.ambushVehicles.length = 0;

    if (bountyState.targetBeaconMesh) {
      bountyState.targetBeaconMesh.visible = false;
    }
  }

  function startBounty(targetIdOrIndex = null) {
    ensureHeistsDOM();
    buildBountyBoardVisuals();
    closeStockMarket();
    closeAchievements();
    closeActivityHub();
    activeCtx?.ui?.closePhone?.();

    if (heistState.active) {
      clearHeistEntities();
      heistState.active = false;
    }
    if (raceState.active) abortStreetRace(true);
    if (activeCtx?.gameplay?.mission?.active) {
      activeCtx.gameplay.mission.active = false;
    }
    clearBountyEntities();

    let def = null;
    if (targetIdOrIndex !== null && targetIdOrIndex !== undefined) {
      const num = Number(targetIdOrIndex);
      def =
        BOUNTY_TARGETS.find((b) => b.id === num || b.code === String(targetIdOrIndex).toLowerCase()) ||
        BOUNTY_TARGETS[clamp(num - 1, 0, BOUNTY_TARGETS.length - 1)];
    } else {
      // Pick first uncompleted fugitive, or cycle if all 5 completed
      def = BOUNTY_TARGETS.find((b) => !bountyState.completedIds.has(b.id)) || BOUNTY_TARGETS[0];
    }

    bountyState.active = true;
    bountyState.def = def;
    bountyState.stage = 'hunt';
    bountyState.fleeingInCar = false;
    bountyState.capturedAlive = false;

    const baseY = def.id === 1 ? 3.8 : getGroundY(def.pos.x, def.pos.z, def.pos.y);
    const scene = getScene();

    // Spawn Primary Wanted Fugitive with Surrender / Handcuff Live-Capture Support!
    let fRig = null;
    if (activeCtx?.characters?.createHumanoid) {
      try {
        fRig = activeCtx.characters.createHumanoid(def.preset);
      } catch (_) {}
    }
    const fMesh = fRig?.root || fRig?.mesh || fRig || new THREE.Group();
    fMesh.position.set(def.pos.x, baseY, def.pos.z);
    if (scene && !fMesh.parent) scene.add(fMesh);
    if (fRig && activeCtx?.characters?.equipWeapon) {
      try {
        activeCtx.characters.equipWeapon(fRig, def.weapon);
      } catch (_) {}
    }

    const fugitive = {
      preset: def.preset,
      label: def.name,
      x: def.pos.x,
      y: baseY,
      z: def.pos.z,
      vx: 0,
      vz: 0,
      yaw: 0,
      hp: def.hp,
      maxHp: def.hp,
      armor: 35,
      weaponId: def.weapon,
      rig: fRig,
      mesh: fMesh,
      isEnemy: true,
      isHostile: true,
      missionTarget: true,
      noWantedOnKill: true,
      surrendered: false,
      handcuffed: false,
      dead: false,
      fireTimer: 0.9,
      takeDamage(dmg, isHeadshot) {
        if (this.dead || this.handcuffed) return;
        const pWeapon = activeCtx?.player?.weaponId || 'pistol';
        const isNonLethal = pWeapon === 'unarmed' || pWeapon === 'bat';
        const mult = isHeadshot && !isNonLethal ? 2.2 : 1.0;
        let rem = dmg * mult;
        if (this.armor > 0) {
          const abs = Math.min(this.armor, rem);
          this.armor -= abs;
          rem -= abs;
        }

        // Non-lethal melee hit below 55% HP or gun wound between 1..26% HP triggers SURRENDER!
        const nextHp = this.hp - rem;
        if (!this.surrendered && (isNonLethal ? nextHp <= this.maxHp * 0.55 : nextHp > 0 && nextHp <= this.maxHp * 0.26)) {
          this.hp = Math.max(18, nextHp);
          this.surrendered = true;
          this.isHostile = false;
          bountyState.stage = 'surrendered';
          showSubtitleText(`${def.name}: "Khoan đã! Đừng bắn nữa, tôi đầu hàng! Đừng giết tôi!"`, 4.5);
          notifyFeed(
            `🙌 Mục tiêu "${def.name}" ĐÃ ĐẦU HÀNG! Tiến lại gần nhấn [F] Còng Tay Bắt Sống để nhận thưởng 1.35x (${formatMoney(def.aliveBonus)})!`,
            'green'
          );
          return;
        }

        this.hp = Math.max(0, nextHp);
        if (this.hp <= 0 && !this.dead) {
          this.dead = true;
          this.isDead = true;
          bountyState.stage = 'confirm_kill';
          progressionStats.enemiesNeutralized += 1;
          if (this.rig && activeCtx?.characters?.animateHumanoid) {
            try {
              activeCtx.characters.animateHumanoid(this.rig, 'dead', 0.016);
            } catch (_) {}
          }
          notifyFeed(
            `💀 Đã tiêu diệt mục tiêu truy nã "${def.name}"! Tới xác nhận nhận dạng để lĩnh ${formatMoney(def.reward)}!`,
            'gold'
          );
        }
      }
    };

    const bucket = ensureGameplayEnemyBucket();
    if (bucket) bucket.push(fugitive);
    bountyState.fugitive = fugitive;

    // Spawn Bodyguard Squad
    for (const gd of def.guards) {
      const gx = def.pos.x + gd.ox;
      const gz = def.pos.z + gd.oz;
      const gy = def.id === 1 ? 3.8 : getGroundY(gx, gz, baseY);
      const guard = spawnHeistEnemyNPC(gd.preset, gx, gy, gz, gd.weapon, gd.hp, 'Cận Vệ Tội Phạm');
      // Move from heistState.guards to bountyState.bodyguards so lists stay cleanly separated
      const hIdx = heistState.guards.indexOf(guard);
      if (hIdx !== -1) heistState.guards.splice(hIdx, 1);
      bountyState.bodyguards.push(guard);
    }

    // Spawn Escape Vehicle if fugitive has one
    if (def.escapeCar) {
      const ex = def.pos.x + def.escapeCar.ox;
      const ez = def.pos.z + def.escapeCar.oz;
      const ey = getGroundY(ex, ez, 0.05);
      const eCar = spawnVehicleSafe(def.escapeCar.type, ex, ey, ez, def.escapeCar.yaw, {
        color: def.escapeCar.color,
        isBountyCar: true
      });
      if (eCar) {
        attachRacerUnderglowAndAero(eCar, def.escapeCar.neon);
        bountyState.escapeVehicle = eCar;
      }
    }

    setGPSWaypoints(def.pos.x, def.pos.z);
    showBigBanner(
      `LỆNH TRUY NÃ #${def.id}`,
      `${def.name} • Bắt Sống: ${formatMoney(def.aliveBonus)} / Tiêu Diệt: ${formatMoney(def.reward)}`,
      'passed',
      4.0
    );
    return true;
  }

  function abortBounty(silent = false) {
    clearBountyEntities();
    clearGPSWaypoints();
    bountyState.active = false;
    bountyState.stage = 'idle';
    setObjectiveText('');
    if (!silent) {
      notifyFeed('Đã hủy hợp đồng Săn Tiền Thưởng.', 'gold');
    }
  }

  function completeBountyContract(alive = false) {
    const def = bountyState.def;
    if (!def) return;
    const payout = alive ? def.aliveBonus : def.reward;

    bountyState.completedIds.add(def.id);
    if (alive) {
      bountyState.capturedAliveIds.add(def.id);
      progressionStats.bountiesCapturedAlive += 1;
    }
    progressionStats.bountiesCompleted += 1;

    clearBountyEntities();
    clearGPSWaypoints();
    setWantedStars(0);
    bountyState.active = false;
    bountyState.stage = 'idle';
    setObjectiveText('');

    addPlayerCash(payout, true);
    triggerMarketEvent('bounty_captured', alive ? 1.35 : 1.0);
    saveProgressionStats();
    evaluateAchievements();

    showBigBanner(
      alive ? 'ÁP GIẢI BẮT SỐNG THÀNH CÔNG!' : 'ĐÃ TRỪ KHỬ TỘI PHẠM TRUY NÃ!',
      `${def.name} • Tiền thưởng: +$${payout.toLocaleString('en-US')}`,
      'passed',
      5.0
    );
  }

  function renderMugshotPortraitDataURL(seedIdx = 1, accentColor = '#f97316') {
    if (typeof document === 'undefined') return '';
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 96;
    const g = c.getContext('2d');
    if (!g) return '';

    // Thiên Đình Chấp Pháp Height-Chart Mugshot Backdrop
    g.fillStyle = '#0f172a';
    g.fillRect(0, 0, 96, 96);
    g.strokeStyle = 'rgba(148, 163, 184, 0.22)';
    g.lineWidth = 1;
    for (let y = 14; y < 90; y += 14) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(96, y);
      g.stroke();
    }

    // Stylized silhouette shoulders & head
    const jacketColors = ['#7f1d1d', '#3b0764', '#1e293b', '#0f172a', '#450a0a'];
    const skinColors = ['#d69e72', '#e2b492', '#c88d65', '#ddb08c', '#b97c52'];
    g.fillStyle = jacketColors[(seedIdx - 1) % jacketColors.length];
    g.beginPath();
    g.arc(48, 98, 34, Math.PI, 0);
    g.fill();

    g.fillStyle = skinColors[(seedIdx - 1) % skinColors.length];
    g.beginPath();
    g.arc(48, 42, 18, 0, Math.PI * 2);
    g.fill();

    // Aviator shades / tactical visor
    g.fillStyle = '#020617';
    g.fillRect(34, 36, 12, 7);
    g.fillRect(50, 36, 12, 7);
    g.fillRect(46, 38, 4, 2);

    // Thiên Đình Chấp Pháp placard
    g.fillStyle = '#1e293b';
    g.strokeStyle = accentColor;
    g.lineWidth = 1.5;
    g.fillRect(18, 72, 60, 18);
    g.strokeRect(18, 72, 60, 18);
    g.fillStyle = '#fde047';
    g.font = '800 10px Consolas, monospace';
    g.textAlign = 'center';
    g.fillText(`Thiên Đình Chấp Pháp-00${seedIdx}`, 48, 84);

    return c.toDataURL();
  }

  function updateBountyHunting(dt) {
    const p = activeCtx?.player;
    if (!p) return;

    const freeRoam = !heistState.active && !raceState.active && !bountyState.active && !(activeCtx?.gameplay?.mission?.active);
    const pulse = 1 + Math.sin(performance.now() * 0.0042) * 0.09;

    if (bountyState.boardCoronaMesh) {
      bountyState.boardCoronaMesh.visible = freeRoam && p.x < 500;
      if (bountyState.boardCoronaMesh.visible) {
        bountyState.boardCoronaMesh.userData.ring.scale.setScalar(pulse);
        if (dist2D(p.x, p.z, PRECINCT_BOUNTY_BOARD.x, PRECINCT_BOUNTY_BOARD.z) < 3.6) {
          showInteractHint('Nhấn [F] Nhận Hợp Đồng Săn Tiền Thưởng • [G] Mở Bảng Truy Nã 5 Mục Tiêu');
          if (activeCtx?.input?.interactJustPressed) {
            startBounty();
            return;
          }
          if (activeCtx?.input?.keys?.KeyG) {
            openActivityHub('bounties');
            return;
          }
        }
      }
    }

    if (!bountyState.active || !bountyState.def || !bountyState.fugitive) return;

    if (p.isDead || p.dead || p.isBusted) {
      abortBounty(true);
      return;
    }

    const def = bountyState.def;
    const fug = bountyState.fugitive;
    const beacon = bountyState.targetBeaconMesh;

    // Update Bodyguards AI
    for (let i = 0; i < bountyState.bodyguards.length; i++) {
      const bg = bountyState.bodyguards[i];
      if (bg.dead || bg.hp <= 0) {
        if (!bg.dead) bg.takeDamage(999, false);
        continue;
      }
      const dPlayer = dist2D(bg.x, bg.z, p.x, p.z);
      if (dPlayer < 48) {
        bg.yaw = lerpAngle(bg.yaw, Math.atan2(p.x - bg.x, p.z - bg.z), clamp(dt * 8, 0, 1));
        bg.mesh.rotation.y = bg.yaw;
        if (bg.rig && activeCtx?.characters?.animateHumanoid) {
          try {
            activeCtx.characters.animateHumanoid(bg.rig, 'aim_2h', dt);
          } catch (_) {}
        }
        bg.fireTimer -= dt;
        if (bg.fireTimer <= 0 && !activeCtx.activeModal && dPlayer < 36) {
          bg.fireTimer = randRange(1.15, 2.25);
          try {
            activeCtx?.characters?.fireWeapon?.(bg, bg.weaponId, p, activeCtx);
          } catch (_) {}
        }
      }
    }

    if (bountyState.stage === 'hunt') {
      const distFug = dist2D(p.x, p.z, fug.x, fug.z);

      // Fugitive #2/#4 may jump into their getaway car and flee along avenues when player closes within 28m!
      if (
        !bountyState.fleeingInCar &&
        bountyState.escapeVehicle &&
        !bountyState.escapeVehicle.destroyed &&
        distFug < 28 &&
        (def.id === 2 || def.id === 4)
      ) {
        bountyState.fleeingInCar = true;
        fug.mesh.visible = false;
        notifyFeed(`🏎 "${def.name}" đã phóng lên xe tẩu thoát! Bắn hỏng xe hoặc chặn đầu hắn lại!`, 'red');
      }

      if (bountyState.fleeingInCar && bountyState.escapeVehicle) {
        const ec = bountyState.escapeVehicle;
        if (ec.destroyed || (ec.hp ?? 140) < 42) {
          // Vehicle disabled -> fugitive bails out dazed and surrenders or fights!
          bountyState.fleeingInCar = false;
          fug.x = ec.x + 2.2;
          fug.z = ec.z;
          fug.y = getGroundY(fug.x, fug.z, 0.22);
          fug.mesh.visible = true;
          fug.mesh.position.set(fug.x, fug.y, fug.z);
          ec.aiInput = { throttle: 0, brake: 1, steer: 0, handbrake: true };
          fug.hp = Math.min(fug.hp, fug.maxHp * 0.24);
          fug.surrendered = true;
          fug.isHostile = false;
          bountyState.stage = 'surrendered';
          notifyFeed(`💥 Xe tẩu thoát đã hỏng! "${def.name}" choáng váng đầu hàng — Tới nhấn [F] Còng Tay!`, 'green');
        } else {
          // Drive away along nearest avenue loop
          const awayYaw = Math.atan2(ec.x - p.x, ec.z - p.z);
          const snapAvenueYaw = Math.round(awayYaw / (Math.PI / 2)) * (Math.PI / 2);
          const err = wrapAngle(snapAvenueYaw - ec.yaw);
          ec.maxSpeed = 35;
          ec.aiInput = {
            throttle: 0.88,
            brake: Math.abs(err) > 0.9 ? 0.35 : 0,
            steer: clamp(-err * 1.8, -1, 1),
            handbrake: false
          };
          fug.x = ec.x;
          fug.y = ec.y;
          fug.z = ec.z;
        }
      } else if (!fug.dead && !fug.surrendered) {
        if (distFug < 44) {
          fug.yaw = lerpAngle(fug.yaw, Math.atan2(p.x - fug.x, p.z - fug.z), clamp(dt * 8, 0, 1));
          fug.mesh.rotation.y = fug.yaw;
          if (fug.rig && activeCtx?.characters?.animateHumanoid) {
            try {
              activeCtx.characters.animateHumanoid(fug.rig, 'aim_1h', dt);
            } catch (_) {}
          }
          fug.fireTimer -= dt;
          if (fug.fireTimer <= 0 && !activeCtx.activeModal && distFug < 34) {
            fug.fireTimer = randRange(1.0, 1.9);
            try {
              activeCtx?.characters?.fireWeapon?.(fug, fug.weaponId, p, activeCtx);
            } catch (_) {}
          }
        }
      }

      if (beacon) {
        beacon.visible = true;
        beacon.position.set(fug.x, fug.y + 0.08, fug.z);
      }
      setGPSWaypoints(fug.x, fug.z);
      setObjectiveText(
        `Săn Truy Nã: "${def.name}" (Máu: ${Math.round((fug.hp / fug.maxHp) * 100)}%) • Dùng Gậy/Đấm hoặc bắn yếu máu để BẮT SỐNG (1.35x)!`
      );
    } else if (bountyState.stage === 'surrendered') {
      if (fug.rig && activeCtx?.characters?.animateHumanoid) {
        try {
          activeCtx.characters.animateHumanoid(fug.rig, 'busted', dt);
        } catch (_) {}
      }
      if (beacon) {
        beacon.visible = true;
        beacon.position.set(fug.x, fug.y + 0.08, fug.z);
      }
      setObjectiveText(
        `Mục tiêu "${def.name}" đã đầu hàng! Lại gần nhấn [F] Còng Tay Áp Giải về Đồn Cảnh Sát (${formatMoney(def.aliveBonus)})!`
      );

      if (dist2D(p.x, p.z, fug.x, fug.z) < 2.8) {
        showInteractHint(`Nhấn [F] Còng Tay Bắt Sống ${def.name}`);
        if (activeCtx?.input?.interactJustPressed || dist2D(p.x, p.z, fug.x, fug.z) < 1.35) {
          fug.handcuffed = true;
          bountyState.capturedAlive = true;
          bountyState.stage = 'escort_precinct';
          heistSFX.playHackClick(1.25);
          setGPSWaypoints(PRECINCT_BOUNTY_BOARD.x, PRECINCT_BOUNTY_BOARD.z);
          notifyFeed(
            `⛓ Đã còng tay "${def.name}"! Đưa hắn lên xe và áp giải về Đồn Thiên Đình Chấp Pháp (126, 76) nhận ${formatMoney(def.aliveBonus)}!`,
            'green'
          );
        }
      }
    } else if (bountyState.stage === 'escort_precinct') {
      const pCar = getPlayerVehicle();
      if (pCar) {
        // Seated in passenger seat while player drives to Thiên Đình Chấp Pháp Precinct!
        fug.mesh.visible = false;
        fug.x = pCar.x;
        fug.y = pCar.y;
        fug.z = pCar.z;
      } else {
        fug.mesh.visible = true;
        const dFollow = dist2D(fug.x, fug.z, p.x, p.z);
        if (dFollow > 2.2) {
          const ang = Math.atan2(p.x - fug.x, p.z - fug.z);
          fug.yaw = ang;
          const spd = Math.min(8.8, dFollow * 2.5);
          fug.x += Math.sin(ang) * spd * dt;
          fug.z += Math.cos(ang) * spd * dt;
          fug.y = getGroundY(fug.x, fug.z, p.y);
          fug.mesh.position.set(fug.x, fug.y, fug.z);
          fug.mesh.rotation.y = ang;
          if (fug.rig && activeCtx?.characters?.animateHumanoid) {
            try {
              activeCtx.characters.animateHumanoid(fug.rig, 'run', dt, { moveSpeed: spd });
            } catch (_) {}
          }
        }
      }

      if (beacon) {
        beacon.visible = true;
        beacon.position.set(PRECINCT_BOUNTY_BOARD.x, 0.25, PRECINCT_BOUNTY_BOARD.z);
      }
      setObjectiveText(
        `Áp giải "${def.name}" về Đồn Cảnh Sát Thiên Đình Chấp Pháp (126, 76) để nhận thưởng Bắt Sống ${formatMoney(def.aliveBonus)}!`
      );

      if (dist2D(p.x, p.z, PRECINCT_BOUNTY_BOARD.x, PRECINCT_BOUNTY_BOARD.z) < 8.5) {
        completeBountyContract(true);
      }
    } else if (bountyState.stage === 'confirm_kill') {
      if (beacon) {
        beacon.visible = true;
        beacon.position.set(fug.x, fug.y + 0.08, fug.z);
      }
      setObjectiveText(`Tới gần thi thể "${def.name}" để chụp ảnh xác nhận tiêu diệt & nhận ${formatMoney(def.reward)}!`);
      if (dist2D(p.x, p.z, fug.x, fug.z) < 4.8) {
        completeBountyContract(false);
      }
    }
  }

  // ==========================================================================
  // 11. PROGRESSION TELEMETRY & 40 IN-GAME ACHIEVEMENTS (HỆ THỐNG THÀNH TỰU)
  // ==========================================================================
  const progressionStats = {
    bankHeistCompleted: 0,
    casinoHeistCompleted: 0,
    flawlessBankDrill: false,
    fastCasinoHack: false,
    crewPerksUnlocked: new Set(),

    topSpeedKmh: 0,
    distanceDrivenMeters: 0,
    driftSeconds: 0,
    wheelieSeconds: 0,
    marineSeconds: 0,
    heliSeconds: 0,
    tankSeconds: 0,
    streetRacesWon: 0,
    wonCircuitsSet: new Set(),
    wonMaxWagerRace: false,

    stuntJumps: 0,
    visitedObservatory: false,
    visitedCasino: false,
    visitedNightclub: false,
    visitedBank: false,
    visitedSuperyacht: false,
    protagonistSwitches: 0,
    lastProtagonistId: null,

    enemiesNeutralized: 0,
    headshots: 0,
    vehiclesDestroyed: 0,
    specialAbilityUses: 0,
    wasSpecialActive: false,
    reachedFiveStars: false,
    bountiesCompleted: 0,
    bountiesCapturedAlive: 0,

    maxCasinoChips: 0,
    casinoStationsVisited: 0,
    wasCasinoModalOpen: false,
    barStationsVisited: 0,
    wasBarModalOpen: false,
    reachedDrunkState: false,

    lastSampleX: null,
    lastSampleZ: null
  };

  function loadProgressionStats() {
    try {
      const raw = localStorage.getItem(SAVE_PROGRESSION_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d || typeof d !== 'object') return;
      progressionStats.bankHeistCompleted = Number(d.bankHeistCompleted) || 0;
      progressionStats.casinoHeistCompleted = Number(d.casinoHeistCompleted) || 0;
      progressionStats.flawlessBankDrill = Boolean(d.flawlessBankDrill);
      progressionStats.fastCasinoHack = Boolean(d.fastCasinoHack);
      progressionStats.topSpeedKmh = Number(d.topSpeedKmh) || 0;
      progressionStats.distanceDrivenMeters = Number(d.distanceDrivenMeters) || 0;
      progressionStats.driftSeconds = Number(d.driftSeconds) || 0;
      progressionStats.wheelieSeconds = Number(d.wheelieSeconds) || 0;
      progressionStats.marineSeconds = Number(d.marineSeconds) || 0;
      progressionStats.heliSeconds = Number(d.heliSeconds) || 0;
      progressionStats.tankSeconds = Number(d.tankSeconds) || 0;
      progressionStats.streetRacesWon = Number(d.streetRacesWon) || 0;
      progressionStats.wonMaxWagerRace = Boolean(d.wonMaxWagerRace);
      progressionStats.stuntJumps = Number(d.stuntJumps) || 0;
      progressionStats.visitedObservatory = Boolean(d.visitedObservatory);
      progressionStats.visitedCasino = Boolean(d.visitedCasino);
      progressionStats.visitedNightclub = Boolean(d.visitedNightclub);
      progressionStats.visitedBank = Boolean(d.visitedBank);
      progressionStats.visitedSuperyacht = Boolean(d.visitedSuperyacht);
      progressionStats.protagonistSwitches = Number(d.protagonistSwitches) || 0;
      progressionStats.enemiesNeutralized = Number(d.enemiesNeutralized) || 0;
      progressionStats.headshots = Number(d.headshots) || 0;
      progressionStats.vehiclesDestroyed = Number(d.vehiclesDestroyed) || 0;
      progressionStats.specialAbilityUses = Number(d.specialAbilityUses) || 0;
      progressionStats.reachedFiveStars = Boolean(d.reachedFiveStars);
      progressionStats.bountiesCompleted = Number(d.bountiesCompleted) || 0;
      progressionStats.bountiesCapturedAlive = Number(d.bountiesCapturedAlive) || 0;
      progressionStats.maxCasinoChips = Number(d.maxCasinoChips) || 0;
      progressionStats.casinoStationsVisited = Number(d.casinoStationsVisited) || 0;
      progressionStats.barStationsVisited = Number(d.barStationsVisited) || 0;
      progressionStats.reachedDrunkState = Boolean(d.reachedDrunkState);

      if (Array.isArray(d.wonCircuits)) {
        d.wonCircuits.forEach((c) => progressionStats.wonCircuitsSet.add(c));
      }
      if (Array.isArray(d.bountyCompletedIds)) {
        d.bountyCompletedIds.forEach((id) => bountyState.completedIds.add(Number(id)));
      }
      if (Array.isArray(d.bountyAliveIds)) {
        d.bountyAliveIds.forEach((id) => bountyState.capturedAliveIds.add(Number(id)));
      }
    } catch (_) {}
  }

  function saveProgressionStats() {
    try {
      const payload = {
        bankHeistCompleted: progressionStats.bankHeistCompleted,
        casinoHeistCompleted: progressionStats.casinoHeistCompleted,
        flawlessBankDrill: progressionStats.flawlessBankDrill,
        fastCasinoHack: progressionStats.fastCasinoHack,
        topSpeedKmh: Math.round(progressionStats.topSpeedKmh),
        distanceDrivenMeters: Math.round(progressionStats.distanceDrivenMeters),
        driftSeconds: Number(progressionStats.driftSeconds.toFixed(1)),
        wheelieSeconds: Number(progressionStats.wheelieSeconds.toFixed(1)),
        marineSeconds: Number(progressionStats.marineSeconds.toFixed(1)),
        heliSeconds: Number(progressionStats.heliSeconds.toFixed(1)),
        tankSeconds: Number(progressionStats.tankSeconds.toFixed(1)),
        streetRacesWon: progressionStats.streetRacesWon,
        wonCircuits: Array.from(progressionStats.wonCircuitsSet),
        wonMaxWagerRace: progressionStats.wonMaxWagerRace,
        stuntJumps: progressionStats.stuntJumps,
        visitedObservatory: progressionStats.visitedObservatory,
        visitedCasino: progressionStats.visitedCasino,
        visitedNightclub: progressionStats.visitedNightclub,
        visitedBank: progressionStats.visitedBank,
        visitedSuperyacht: progressionStats.visitedSuperyacht,
        protagonistSwitches: progressionStats.protagonistSwitches,
        enemiesNeutralized: progressionStats.enemiesNeutralized,
        headshots: progressionStats.headshots,
        vehiclesDestroyed: progressionStats.vehiclesDestroyed,
        specialAbilityUses: progressionStats.specialAbilityUses,
        reachedFiveStars: progressionStats.reachedFiveStars,
        bountiesCompleted: progressionStats.bountiesCompleted,
        bountiesCapturedAlive: progressionStats.bountiesCapturedAlive,
        bountyCompletedIds: Array.from(bountyState.completedIds),
        bountyAliveIds: Array.from(bountyState.capturedAliveIds),
        maxCasinoChips: progressionStats.maxCasinoChips,
        casinoStationsVisited: progressionStats.casinoStationsVisited,
        barStationsVisited: progressionStats.barStationsVisited,
        reachedDrunkState: progressionStats.reachedDrunkState
      };
      localStorage.setItem(SAVE_PROGRESSION_KEY, JSON.stringify(payload));
    } catch (_) {}
  }

  function countCoreMissionsCleared() {
    const cm = activeCtx?.gameplay?.completedMissions;
    if (cm instanceof Set) return cm.size;
    if (Array.isArray(cm)) return cm.length;
    try {
      const raw = localStorage.getItem('gtav_web_save_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.completedMissions)) return parsed.completedMissions.length;
      }
    } catch (_) {}
    return 0;
  }

  // Exact 40 Genuine Tracked Thành Tựu Võ Lâm across all 6 Open-World Pillars!
  const ACHIEVEMENT_DEFINITIONS = [
    // --- PILLAR 1: HEISTS & STORY MISSIONS (7 Thành Tựu Võ Lâm) ---
    {
      id: 'ach_01',
      category: 'heists',
      tier: 'bronze',
      icon: '🎬',
      title: 'Khởi Đầu Huyền Thoại',
      desc: 'Hoàn thành nhiệm vụ cốt truyện đầu tiên tại Đại lộ Bồng Lai.',
      reward: 1500,
      target: 1,
      measure: () => countCoreMissionsCleared()
    },
    {
      id: 'ach_02',
      category: 'heists',
      tier: 'silver',
      icon: '🏢',
      title: 'Bóng Ma Đu Dây Tháp FIB',
      desc: 'Hoàn thành trọn vẹn cả 3 nhiệm vụ cốt truyện chính của Tiên Thành.',
      reward: 5000,
      target: 3,
      measure: () => countCoreMissionsCleared()
    },
    {
      id: 'ach_03',
      category: 'heists',
      tier: 'gold',
      icon: '🏦',
      title: 'Cơn Ác Mộng Linh Thạch Bảo Khố',
      desc: 'Khoan thủng kho tiền Ngân hàng Linh Thạch Bảo Khố và tẩu thoát bằng tàu cao tốc ($65,000).',
      reward: 8000,
      target: 1,
      measure: () => progressionStats.bankHeistCompleted
    },
    {
      id: 'ach_04',
      category: 'heists',
      tier: 'gold',
      icon: '🔦',
      title: 'Bàn Tay Vàng Khoan Nhiệt',
      desc: 'Khoan xuyên 4 chốt thép kho tiền Ngân hàng mà không làm quá nhiệt mũi khoan lần nào!',
      reward: 6500,
      target: 1,
      measure: () => (progressionStats.flawlessBankDrill ? 1 : 0)
    },
    {
      id: 'ach_05',
      category: 'heists',
      tier: 'gold',
      icon: '💎',
      title: 'Siêu Trộm Hầm Ngầm Kim Cương',
      desc: 'Đột kích thành công Hầm ngầm Sòng bạc Diamond và tẩu thoát với $120,000.',
      reward: 12000,
      target: 1,
      measure: () => progressionStats.casinoHeistCompleted
    },
    {
      id: 'ach_06',
      category: 'heists',
      tier: 'silver',
      icon: '🧬',
      title: 'Siêu Tin Tặc SecuroServ',
      desc: 'Giải mã hoàn tất Bảng Vân Tay Sinh Trắc & Lưới Laser Sòng bạc dưới 20 giây!',
      reward: 7500,
      target: 1,
      measure: () => (progressionStats.fastCasinoHack ? 1 : 0)
    },
    {
      id: 'ach_07',
      category: 'heists',
      tier: 'platinum',
      icon: '👑',
      title: 'Ông Trùm Đại Phi Vụ (Mastermind)',
      desc: 'Chinh phục cả Phi Vụ Ngân Hàng Linh Thạch Bảo Khố lẫn Phi Vụ Hầm Ngầm Sòng Bạc Diamond!',
      reward: 25000,
      target: 2,
      measure: () =>
        (progressionStats.bankHeistCompleted > 0 ? 1 : 0) + (progressionStats.casinoHeistCompleted > 0 ? 1 : 0)
    },

    // --- PILLAR 2: DRIVING & MIDNIGHT STREET RACING (8 Thành Tựu Võ Lâm) ---
    {
      id: 'ach_08',
      category: 'racing',
      tier: 'bronze',
      icon: '💨',
      title: 'Xé Gió Đại Lộ (140 KM/H)',
      desc: 'Đạt vận tốc tối thiểu 140 km/h trên đường phố Tiên Thành.',
      reward: 1000,
      target: 140,
      measure: () => Math.floor(progressionStats.topSpeedKmh)
    },
    {
      id: 'ach_09',
      category: 'racing',
      tier: 'silver',
      icon: '⚡',
      title: 'Vận Tốc Siêu Thanh (175 KM/H)',
      desc: 'Phóng siêu xe hoặc mô tô phân khối lớn vượt ngưỡng 175 km/h.',
      reward: 3000,
      target: 175,
      measure: () => Math.floor(progressionStats.topSpeedKmh)
    },
    {
      id: 'ach_10',
      category: 'racing',
      tier: 'silver',
      icon: '🛞',
      title: 'Nghệ Nhân Khói Lốp Drift',
      desc: 'Thực hiện kỹ thuật kéo phanh tay Drift tổng cộng 15 giây ở tốc độ cao.',
      reward: 2500,
      target: 15,
      measure: () => Math.floor(progressionStats.driftSeconds)
    },
    {
      id: 'ach_11',
      category: 'racing',
      tier: 'bronze',
      icon: '🏁',
      title: 'Tân Binh Đua Đêm Neon',
      desc: 'Giành chiến thắng Hạng 1 đầu tiên tại Giải Đua Xe Đêm Đường Phố.',
      reward: 3000,
      target: 1,
      measure: () => progressionStats.streetRacesWon
    },
    {
      id: 'ach_12',
      category: 'racing',
      tier: 'gold',
      icon: '🔥',
      title: 'Tay Đua Tất Tay $25,000',
      desc: 'Chiến thắng Hạng 1 ở mức cược tối đa $25,000 (nhận $62,500 tiền thưởng)!',
      reward: 10000,
      target: 1,
      measure: () => (progressionStats.wonMaxWagerRace ? 1 : 0)
    },
    {
      id: 'ach_13',
      category: 'racing',
      tier: 'platinum',
      icon: '🏆',
      title: 'Hoàng Đế Đua Đêm Bất Bại',
      desc: 'Vô địch Hạng 1 trên cả 5 cung đường thuộc Giải Đua Xe Đêm Neon!',
      reward: 20000,
      target: 5,
      measure: () => progressionStats.wonCircuitsSet.size
    },
    {
      id: 'ach_14',
      category: 'racing',
      tier: 'bronze',
      icon: '🏍',
      title: 'Quái Xế Bốc Đầu Mô Tô',
      desc: 'Điều khiển siêu mô tô bốc đầu (Wheelie) hoặc lướt phố tổng cộng 5 giây.',
      reward: 2000,
      target: 5,
      measure: () => Math.floor(progressionStats.wheelieSeconds)
    },
    {
      id: 'ach_15',
      category: 'racing',
      tier: 'bronze',
      icon: '🚤',
      title: 'Thuyền Trưởng Thái Bình Dương',
      desc: 'Cầm lái Tàu Cao Tốc Speedboat hoặc Mô tô nước Jet Ski vượt sóng đại dương 15 giây.',
      reward: 2000,
      target: 15,
      measure: () => Math.floor(progressionStats.marineSeconds)
    },

    // --- PILLAR 3: STUNT JUMPS, VEHICLES & EXPLORATION (7 Thành Tựu Võ Lâm) ---
    {
      id: 'ach_16',
      category: 'stunt',
      tier: 'bronze',
      icon: '🚀',
      title: 'Cú Bay Xe Điện Ảnh Đầu Tiên',
      desc: 'Thực hiện thành công 1 Điểm Bay Xe Mạo Hiểm (Monster Ngự Phong Phi Độ).',
      reward: 2000,
      target: 1,
      measure: () => progressionStats.stuntJumps
    },
    {
      id: 'ach_17',
      category: 'stunt',
      tier: 'silver',
      icon: '🦅',
      title: 'Diễn Viên Đóng Thế Võ Lâm',
      desc: 'Chinh phục 5 Điểm Bay Xe Mạo Hiểm khác nhau trên toàn bản đồ.',
      reward: 5000,
      target: 5,
      measure: () => progressionStats.stuntJumps
    },
    {
      id: 'ach_18',
      category: 'stunt',
      tier: 'platinum',
      icon: '🌠',
      title: 'Huyền Thoại Bay Xe 12/12',
      desc: 'Hoàn thành toàn bộ 12/12 Điểm Bay Xe Mạo Hiểm tại Tiên Thành!',
      reward: 18000,
      target: 12,
      measure: () => progressionStats.stuntJumps
    },
    {
      id: 'ach_19',
      category: 'stunt',
      tier: 'bronze',
      icon: '🔭',
      title: 'Đỉnh Cao Đài Thiên Văn',
      desc: 'Đặt chân lên sân thượng Đài Thiên Văn Đồi Võ Lâm ngắm trọn thành phố.',
      reward: 1500,
      target: 1,
      measure: () => (progressionStats.visitedObservatory ? 1 : 0)
    },
    {
      id: 'ach_20',
      category: 'stunt',
      tier: 'silver',
      icon: '🛥',
      title: 'Khách Quý Siêu Du Thuyền',
      desc: 'Khám phá Bến Du Thuyền Bồng Lai Marina & Siêu Du Thuyền ngoài khơi.',
      reward: 2500,
      target: 1,
      measure: () => (progressionStats.visitedSuperyacht ? 1 : 0)
    },
    {
      id: 'ach_21',
      category: 'stunt',
      tier: 'silver',
      icon: '👥',
      title: 'Bộ Ba Nhân Vật Giang Hồ',
      desc: 'Chuyển đổi góc nhìn đám mây giữa các nhân vật (Franklin / Michael / Viper).',
      reward: 2500,
      target: 1,
      measure: () => progressionStats.protagonistSwitches
    },
    {
      id: 'ach_22',
      category: 'stunt',
      tier: 'silver',
      icon: '🚁',
      title: 'Phi Công Bầu Trời Đêm',
      desc: 'Điều khiển Trực thăng tuần tra / VIP bay lượn trên bầu trời thành phố 20 giây.',
      reward: 2500,
      target: 20,
      measure: () => Math.floor(progressionStats.heliSeconds)
    },

    // --- PILLAR 4: COMBAT, POLICE SIEGE & BOUNTY HUNTING (7 Thành Tựu Võ Lâm) ---
    {
      id: 'ach_23',
      category: 'combat',
      tier: 'bronze',
      icon: '🔫',
      title: 'Phát Súng Khai Màn',
      desc: 'Hạ gục 5 kẻ địch có vũ trang trong các nhiệm vụ hoặc giao tranh.',
      reward: 1200,
      target: 5,
      measure: () => progressionStats.enemiesNeutralized
    },
    {
      id: 'ach_24',
      category: 'combat',
      tier: 'silver',
      icon: '🎯',
      title: 'Xạ Thủ Bách Phát Bách Trúng',
      desc: 'Hạ gục tổng cộng 25 kẻ địch có vũ trang tại Tiên Thành.',
      reward: 4000,
      target: 25,
      measure: () => progressionStats.enemiesNeutralized
    },
    {
      id: 'ach_25',
      category: 'combat',
      tier: 'silver',
      icon: '💥',
      title: 'Chuyên Gia Hủy Diệt Hạng Nặng',
      desc: 'Làm nổ tung 5 phương tiện bằng hỏa lực hoặc Súng Phóng Lựu M79.',
      reward: 3500,
      target: 5,
      measure: () => progressionStats.vehiclesDestroyed
    },
    {
      id: 'ach_26',
      category: 'combat',
      tier: 'bronze',
      icon: '⏱',
      title: 'Phản Xạ Bullet-Time',
      desc: 'Kích hoạt Kỹ năng Đặc biệt [V] 3 lần trong chiến đấu hoặc đua xe.',
      reward: 1500,
      target: 3,
      measure: () => progressionStats.specialAbilityUses
    },
    {
      id: 'ach_27',
      category: 'combat',
      tier: 'gold',
      icon: '⭐⭐⭐⭐⭐',
      title: 'Kẻ Thù Số 1 Quốc Gia (5★)',
      desc: 'Đạt mức độ truy nã tối đa 5 Sao từ lực lượng Thiên Đình Chấp Pháp & đặc nhiệm NOOSE.',
      reward: 6000,
      target: 1,
      measure: () => (progressionStats.reachedFiveStars ? 1 : 0)
    },
    {
      id: 'ach_28',
      category: 'combat',
      tier: 'silver',
      icon: '⛓',
      title: 'Thợ Săn Tiền Thưởng Chuyên Nghiệp',
      desc: 'Hoàn thành hợp đồng Săn Tiền Thưởng đầu tiên (Tiêu diệt hoặc Bắt sống).',
      reward: 3500,
      target: 1,
      measure: () => progressionStats.bountiesCompleted
    },
    {
      id: 'ach_29',
      category: 'combat',
      tier: 'platinum',
      icon: '🤠',
      title: 'Ác Thần Truy Nã (5/5 Mục Tiêu)',
      desc: 'Quét sạch toàn bộ 5 tên tội phạm truy nã nguy hiểm nhất Tiên Thành!',
      reward: 16000,
      target: 5,
      measure: () => bountyState.completedIds.size
    },

    // --- PILLAR 5: DIAMOND CASINO & CLUB ECLIPSE BAR (6 Thành Tựu Võ Lâm) ---
    {
      id: 'ach_30',
      category: 'casino',
      tier: 'bronze',
      icon: '🎰',
      title: 'Bước Chân Thượng Lưu Diamond',
      desc: 'Bước vào đại sảnh Sòng bạc Hoàng gia Vạn Bảo Đổ Phường.',
      reward: 1500,
      target: 1,
      measure: () => (progressionStats.visitedCasino ? 1 : 0)
    },
    {
      id: 'ach_31',
      category: 'casino',
      tier: 'silver',
      icon: '🎲',
      title: 'Tay Chơi Đỏ Đen Khét Tiếng',
      desc: 'Tham gia giải trí tại các bàn cược trong Sòng bạc Diamond ít nhất 3 lần.',
      reward: 3000,
      target: 3,
      measure: () => progressionStats.casinoStationsVisited
    },
    {
      id: 'ach_32',
      category: 'casino',
      tier: 'gold',
      icon: '🪙',
      title: 'Đại Gia Phỉnh Vàng (25,000 Chips)',
      desc: 'Sở hữu từ 25,000 Phỉnh (Chips) trở lên tại Sòng bạc Diamond.',
      reward: 6000,
      target: 25000,
      measure: () => Math.floor(progressionStats.maxCasinoChips)
    },
    {
      id: 'ach_33',
      category: 'casino',
      tier: 'platinum',
      icon: '💎',
      title: 'Thần Bài Bố Già (100,000 Chips)',
      desc: 'Tích lũy kho Phỉnh kỷ lục 100,000 Chips tại Vạn Bảo Đổ Phường!',
      reward: 15000,
      target: 100000,
      measure: () => Math.floor(progressionStats.maxCasinoChips)
    },
    {
      id: 'ach_34',
      category: 'casino',
      tier: 'bronze',
      icon: '🍸',
      title: 'Đêm Không Ngủ Tại Túy Tiên Lâu',
      desc: 'Ghé thăm Hộp đêm & Quầy Bar Neon Túy Tiên Lâu trên Đại lộ Ven biển.',
      reward: 1500,
      target: 1,
      measure: () => (progressionStats.visitedNightclub ? 1 : 0)
    },
    {
      id: 'ach_35',
      category: 'casino',
      tier: 'silver',
      icon: '🎱',
      title: 'Cao Thủ Quầy Bar & Bi-A',
      desc: 'Thưởng thức đồ uống, nhảy Nhạc Hội hoặc chơi Bi-A / Phi tiêu tại Túy Tiên Lâu 2 lần.',
      reward: 3000,
      target: 2,
      measure: () => progressionStats.barStationsVisited + (progressionStats.reachedDrunkState ? 1 : 0)
    },

    // --- PILLAR 6: Vạn Thương Linh Các STOCK MARKET & EMPIRE WEALTH (5 Thành Tựu Võ Lâm -> Total = 40!) ---
    {
      id: 'ach_36',
      category: 'wealth',
      tier: 'bronze',
      icon: '📈',
      title: 'Nhà Đầu Tư Phố Pillbox',
      desc: 'Thực hiện lệnh Mua/Bán cổ phiếu đầu tiên trên Sàn Chứng Khoán Động Vạn Thương Linh Các.',
      reward: 1500,
      target: 1,
      measure: () => portfolio.tradesCount
    },
    {
      id: 'ach_37',
      category: 'wealth',
      tier: 'silver',
      icon: '💼',
      title: 'Sói Già Lướt Sóng Vạn Thương Linh Các',
      desc: 'Khớp thành công 10 giao dịch cổ phiếu trên sàn Vạn Thương Linh Các.',
      reward: 3500,
      target: 10,
      measure: () => portfolio.tradesCount
    },
    {
      id: 'ach_38',
      category: 'wealth',
      tier: 'gold',
      icon: '🦈',
      title: 'Huyền Thoại Bắt Đáy (+$20,000 Lãi)',
      desc: 'Thu về ít nhất $20,000 lợi nhuận thực tế đã chốt từ đầu tư cổ phiếu Vạn Thương Linh Các!',
      reward: 8500,
      target: 20000,
      measure: () => Math.max(0, Math.floor(portfolio.realizedProfit))
    },
    {
      id: 'ach_39',
      category: 'wealth',
      tier: 'gold',
      icon: '💵',
      title: 'Giới Siêu Giàu Bồng Lai ($150,000)',
      desc: 'Đạt tổng tài sản ròng (Tiền mặt + Cổ phiếu Vạn Thương Linh Các) từ $150,000 trở lên.',
      reward: 7500,
      target: 150000,
      measure: () => Math.floor(getPlayerCash() + portfolio.netWorth)
    },
    {
      id: 'ach_40',
      category: 'wealth',
      tier: 'platinum',
      icon: '🏛',
      title: 'Tỷ Phú Đế Chế Tiên Thành ($500,000)',
      desc: 'Sở hữu tổng khối tài sản ròng vượt mốc $500,000 — Đỉnh cao danh vọng!',
      reward: 30000,
      target: 500000,
      measure: () => Math.floor(getPlayerCash() + portfolio.netWorth)
    }
  ];

  // Live exported achievements array (length === 40)
  const achievements = ACHIEVEMENT_DEFINITIONS.map((def, index) => ({
    id: def.id,
    index: index + 1,
    category: def.category,
    tier: def.tier,
    icon: def.icon,
    title: def.title,
    desc: def.desc,
    reward: def.reward,
    target: def.target,
    progress: 0,
    unlocked: false,
    unlockedAt: null
  }));

  let achSelectedCategory = 'all';
  let achCheckAccum = 0;

  function loadAchievementsState() {
    try {
      const raw = localStorage.getItem(SAVE_ACHIEVEMENTS_KEY);
      if (!raw) return;
      const savedMap = JSON.parse(raw);
      if (!savedMap || typeof savedMap !== 'object') return;
      for (const a of achievements) {
        if (savedMap[a.id]) {
          a.unlocked = true;
          a.unlockedAt = savedMap[a.id].unlockedAt || null;
          a.progress = a.target;
        }
      }
    } catch (_) {}
  }

  function saveAchievementsState() {
    try {
      const map = {};
      for (const a of achievements) {
        if (a.unlocked) {
          map[a.id] = { unlocked: true, unlockedAt: a.unlockedAt };
        }
      }
      localStorage.setItem(SAVE_ACHIEVEMENTS_KEY, JSON.stringify(map));
    } catch (_) {}
  }

  function showTrophyUnlockToast(ach) {
    ensureHeistsDOM();
    if (!domRefs.trophyStack) return;

    heistSFX.playTrophyFanfare(ach.tier);

    const tierLabel =
      ach.tier === 'platinum'
        ? 'CÚP BẠCH KIM'
        : ach.tier === 'gold'
          ? 'CÚP VÀNG'
          : ach.tier === 'silver'
            ? 'CÚP BẠC'
            : 'CÚP ĐỒNG';

    const toast = document.createElement('div');
    toast.className = 'gta-trophy-toast';
    toast.innerHTML = `
      <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#fde047,#d97706);display:flex;align-items:center;justify-content:center;font-size:20px;color:#0f172a;font-weight:900;">
        ${ach.icon}
      </div>
      <div style="min-width:0;flex:1;padding-left:6px;overflow:hidden;">
        <div style="font-size:10.5px;font-weight:900;letter-spacing:0.6px;color:#fbbf24;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">🏆 ĐẠT THÀNH TỰU • ${tierLabel} (+$${ach.reward.toLocaleString('en-US')})</div>
        <div style="font-size:13.5px;font-weight:800;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(ach.title)}</div>
      </div>
    `;

    domRefs.trophyStack.appendChild(toast);
    domRefs.trophyStack.classList.add('has-items');

    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      if (domRefs.trophyStack && domRefs.trophyStack.children.length === 0) {
        domRefs.trophyStack.classList.remove('has-items');
      }
    }, 4600);
  }

  function unlockAchievement(idOrIndex) {
    const item =
      typeof idOrIndex === 'number'
        ? achievements[idOrIndex]
        : achievements.find((a) => a.id === idOrIndex || a.title === idOrIndex);
    if (!item || item.unlocked) return false;

    item.unlocked = true;
    item.progress = item.target;
    item.unlockedAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    addPlayerCash(item.reward, true);
    saveAchievementsState();
    showTrophyUnlockToast(item);

    if (activeCtx?.activeModal === 'achievements') {
      renderAchievementsModal();
    }
    return true;
  }

  function evaluateAchievements() {
    let anyUnlocked = false;
    for (let i = 0; i < ACHIEVEMENT_DEFINITIONS.length; i++) {
      const def = ACHIEVEMENT_DEFINITIONS[i];
      const stateItem = achievements[i];
      let val = 0;
      try {
        val = Number(def.measure()) || 0;
      } catch (_) {
        val = 0;
      }
      stateItem.progress = stateItem.unlocked ? stateItem.target : Math.min(stateItem.target, Math.max(0, val));
      if (!stateItem.unlocked && val >= stateItem.target) {
        unlockAchievement(i);
        anyUnlocked = true;
      }
    }
    return anyUnlocked;
  }

  function sampleLiveExplorationAndStats(dt) {
    const p = activeCtx?.player;
    if (!p) return;

    // Distance & vehicle archetype time tracking
    if (progressionStats.lastSampleX !== null) {
      const stepD = dist2D(p.x, p.z, progressionStats.lastSampleX, progressionStats.lastSampleZ);
      if (stepD > 0.05 && stepD < 40 && getPlayerVehicle()) {
        progressionStats.distanceDrivenMeters += stepD;
      }
    }
    progressionStats.lastSampleX = p.x;
    progressionStats.lastSampleZ = p.z;

    const pCar = getPlayerVehicle();
    if (pCar) {
      if (pCar.type === 'heli' && pCar.y > 6) progressionStats.heliSeconds += dt;
      if (pCar.type === 'rhino_tank') progressionStats.tankSeconds += dt;
    }

    // Special Ability edge trigger
    const spNow = Boolean(p.specialActive);
    if (spNow && !progressionStats.wasSpecialActive) {
      progressionStats.specialAbilityUses += 1;
    }
    progressionStats.wasSpecialActive = spNow;

    // Landmark visits
    if (dist2D(p.x, p.z, 68, -245) < 28 && p.y > 16) progressionStats.visitedObservatory = true;
    if (p.x > 1160 && p.x < 1240 && p.z > 1140 && p.z < 1235) progressionStats.visitedCasino = true;
    if (p.x > 1470 && p.x < 1530 && p.z > 1470 && p.z < 1530) progressionStats.visitedNightclub = true;
    if (p.x > 2070 && p.x < 2130 && p.z > 2070 && p.z < 2130) progressionStats.visitedBank = true;
    if (dist2D(p.x, p.z, -295, 115) < 38 || dist2D(p.x, p.z, -218, 95) < 22) {
      progressionStats.visitedSuperyacht = true;
    }

    // 3-Protagonist switches from ctx.npcLife
    const activeProt = activeCtx?.npcLife?.activeProtagonist;
    const protKey = typeof activeProt === 'string' ? activeProt : activeProt?.id || activeProt?.name || null;
    if (protKey && progressionStats.lastProtagonistId && protKey !== progressionStats.lastProtagonistId) {
      progressionStats.protagonistSwitches += 1;
    }
    if (protKey) progressionStats.lastProtagonistId = protKey;

    // Casino & Bar station modal transitions
    const modal = activeCtx?.activeModal;
    if (modal === 'casino' && !progressionStats.wasCasinoModalOpen) {
      progressionStats.casinoStationsVisited += 1;
    }
    progressionStats.wasCasinoModalOpen = modal === 'casino';

    if (modal === 'bar' && !progressionStats.wasBarModalOpen) {
      progressionStats.barStationsVisited += 1;
    }
    progressionStats.wasBarModalOpen = modal === 'bar';

    const drunkLvl = Number(activeCtx?.nightlife?.drunkLevel ?? activeCtx?.nightlifeBar?.drunkLevel ?? 0);
    if (drunkLvl > 0.2) {
      progressionStats.reachedDrunkState = true;
    }
  }

  function renderAchievementsModal() {
    ensureHeistsDOM();
    if (!domRefs.achGrid || !domRefs.achCategoryTabs || !domRefs.achSummaryBar) return;

    evaluateAchievements();

    const unlockedTotal = achievements.filter((a) => a.unlocked).length;
    const bonusEarned = achievements.filter((a) => a.unlocked).reduce((s, a) => s + a.reward, 0);
    domRefs.achSummaryBar.textContent = `Đã mở khóa ${unlockedTotal} / 40 Cúp Danh Giá (${Math.round((unlockedTotal / 40) * 100)}%) • Tổng tiền thưởng đã nhận: ${formatMoney(bonusEarned)}`;

    const categories = [
      { key: 'all', label: `Tất Cả (40)` },
      { key: 'heists', label: '🏦 Đại Phi Vụ (7)' },
      { key: 'racing', label: '🏁 Đua Xe Đêm (8)' },
      { key: 'stunt', label: '🚀 Bay Xe & Khám Phá (7)' },
      { key: 'combat', label: '🎯 Chiến Đấu & Truy Nã (7)' },
      { key: 'casino', label: '🎰 Casino & Hộp Đêm (6)' },
      { key: 'wealth', label: '📈 Sàn Vạn Thương Linh Các & Đế Chế (5)' }
    ];

    domRefs.achCategoryTabs.innerHTML = categories
      .map(
        (c) => `
        <button type="button" class="gta-ha-btn ${achSelectedCategory === c.key ? 'gold' : 'ghost'}" data-ach-cat="${c.key}">
          ${c.label}
        </button>`
      )
      .join('');

    domRefs.achCategoryTabs.querySelectorAll('[data-ach-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        achSelectedCategory = btn.getAttribute('data-ach-cat') || 'all';
        heistSFX.playHackClick(1.05);
        renderAchievementsModal();
      });
    });

    const filtered =
      achSelectedCategory === 'all'
        ? achievements
        : achievements.filter((a) => a.category === achSelectedCategory);

    domRefs.achGrid.innerHTML = filtered
      .map((a) => {
        const pct = clamp(Math.round((a.progress / Math.max(1, a.target)) * 100), 0, 100);
        return `
          <div class="gta-ach-card ${a.unlocked ? 'unlocked' : ''}">
            <div class="gta-ach-icon">${a.icon}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                <span style="font-weight:800;font-size:13.5px;color:${a.unlocked ? '#fef08a' : '#f1f5f9'};">${escapeHTML(a.title)}</span>
                <span style="font-size:11.5px;font-weight:800;color:#34d399;">+$${a.reward.toLocaleString('en-US')}</span>
              </div>
              <div style="font-size:11.5px;color:#94a3b8;margin-top:3px;line-height:1.35;">${escapeHTML(a.desc)}</div>
              <div class="gta-ach-prog-bar">
                <div class="gta-ach-prog-fill" style="width:${pct}%;"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:10.5px;color:#64748b;margin-top:4px;">
                <span>${a.unlocked ? '✔ ĐÃ ĐẠT CÚP' : `Tiến độ: ${a.progress.toLocaleString()} / ${a.target.toLocaleString()}`}</span>
                <span>#${a.index} • ${a.tier.toUpperCase()}</span>
              </div>
            </div>
          </div>`;
      })
      .join('');
  }

  function openAchievements(category = 'all') {
    ensureHeistsDOM();
    achSelectedCategory = category || 'all';
    activeCtx?.ui?.closePhone?.();
    exitPointerLockSafe();
    activeCtx.activeModal = 'achievements';
    domRefs.achModal?.classList.add('open');
    heistSFX.playHackClick(1.1);
    renderAchievementsModal();
    return true;
  }

  function closeAchievements() {
    domRefs.achModal?.classList.remove('open');
    if (activeCtx?.activeModal === 'achievements') {
      activeCtx.activeModal = null;
    }
    return true;
  }

  // ==========================================================================
  // 12. COMMAND HUB (HEIST CREW PREP, RACE WAGER SELECTOR & BOUNTY DOSSIERS)
  // ==========================================================================
  const CREW_PERK_CATALOG = [
    {
      id: 'paige_drill',
      name: 'Paige Harris — Kỹ Sư Mũi Khoan Kim Cương',
      cost: 3000,
      icon: '🔦',
      desc: 'Nâng cấp mũi khoan phủ kim cương & tản nhiệt: Tăng +35% vùng xanh Sweet-Spot và giảm nhiệt khoan Kho Tiền!'
    },
    {
      id: 'avi_hacker',
      name: 'Avi Schwartzman — Chuyên Gia Giải Mã Sinh Trắc',
      cost: 4000,
      icon: '🧬',
      desc: 'Tăng thời gian Hack Hầm Ngầm Sòng Bạc lên 60 giây & tự động khóa sẵn Lát Vân Tay #1!'
    },
    {
      id: 'chef_armor',
      name: 'Chef — Quân Khí Chiến Thuật Hạng Nặng',
      cost: 2500,
      icon: '🛡',
      desc: 'Trang bị Giáp Nano 150 điểm & đầy ắp đạn Súng Phóng Lựu M79 khi bước vào mọi Đại Phi Vụ!'
    }
  ];

  let hubActiveTab = 'heists'; // 'heists' | 'races' | 'bounties'
  const mugshotCache = {};

  function buyCrewPerk(perkId) {
    const def = CREW_PERK_CATALOG.find((p) => p.id === perkId);
    if (!def) return false;
    if (progressionStats.crewPerksUnlocked.has(perkId)) return true;
    if (getPlayerCash() < def.cost) {
      activeCtx?.audio?.playPhoneError?.();
      notifyFeed(`Cần ${formatMoney(def.cost)} để thuê ${def.name}!`, 'red');
      return false;
    }
    addPlayerCash(-def.cost, true);
    progressionStats.crewPerksUnlocked.add(perkId);
    heistSFX.playStockTrade(true);
    notifyFeed(`🤝 Đã chiêu mộ thành viên băng nhóm: ${def.name}!`, 'green');
    renderActivityHubModal();
    return true;
  }

  function applyCrewPerksToSession() {
    if (progressionStats.crewPerksUnlocked.has('chef_armor') && activeCtx?.player) {
      activeCtx.player.maxArmor = 150;
      activeCtx.player.armor = 150;
      if (activeCtx.player.ammo) {
        activeCtx.player.ammo.grenade = Math.max(activeCtx.player.ammo.grenade || 0, 24);
      }
    }
    if (hackGame.active) {
      if (hackGame.mode === 'bank_drill' && progressionStats.crewPerksUnlocked.has('paige_drill')) {
        for (const pin of hackGame.drill.pins) {
          pin.sweetHalf = Math.min(0.24, pin.sweetHalf * 1.35);
          pin.hardness = Math.max(0.72, pin.hardness * 0.78);
        }
      }
      if (hackGame.mode === 'casino_fingerprint' && progressionStats.crewPerksUnlocked.has('avi_hacker')) {
        hackGame.maxTime = 60.0;
        hackGame.timeLeft = Math.max(hackGame.timeLeft, 60.0);
        hackGame.bio.sliceOffsets[0] = 0;
      }
    }
  }

  function renderActivityHubModal() {
    ensureHeistsDOM();
    if (!domRefs.hubBody) return;

    const tabsHtml = `
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid rgba(148,163,184,0.18);">
        <button type="button" class="gta-ha-btn ${hubActiveTab === 'heists' ? 'green' : 'ghost'}" data-hub-tab="heists">
          🏦 2 Đại Phi Vụ &amp; Đội Ngũ
        </button>
        <button type="button" class="gta-ha-btn ${hubActiveTab === 'races' ? 'purple' : 'ghost'}" data-hub-tab="races">
          🏁 5 Giải Đua Xe Đêm Neon ($1K–$25K)
        </button>
        <button type="button" class="gta-ha-btn ${hubActiveTab === 'bounties' ? 'gold' : 'ghost'}" data-hub-tab="bounties">
          🎯 5 Lệnh Truy Nã Săn Tiền Thưởng
        </button>
        ${
          heistState.active || raceState.active || bountyState.active
            ? `<button type="button" id="gta-hub-abort-active-btn" class="gta-ha-btn red" style="margin-left:auto;">✕ Hủy Hoạt Động Đang Chạy</button>`
            : ''
        }
      </div>
    `;

    let contentHtml = '';

    if (hubActiveTab === 'heists') {
      contentHtml = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px;">
          <div style="background:linear-gradient(155deg,rgba(6,46,36,0.68),rgba(15,23,42,0.95));border:1px solid rgba(16,185,129,0.5);border-radius:12px;padding:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:12px;font-weight:900;color:#34d399;">ĐẠI PHI VỤ #4 • PACIFIC STANDARD</span>
              <span style="font-size:16px;font-weight:900;color:#fde047;">THƯỞNG: $65,000</span>
            </div>
            <h3 style="margin:8px 0 6px;font-size:18px;color:#fff;">🏦 PHI VỤ NGÂN HÀNG PACIFIC STANDARD</h3>
            <p style="font-size:12.5px;color:#cbd5e1;line-height:1.5;margin:0 0 12px;">
              • <strong>Giai đoạn 1:</strong> Đột nhập Ngân hàng (2100, 2100), khống chế con tin &amp; hạ 4 bảo vệ vũ trang.<br>
              • <strong>Giai đoạn 2:</strong> Điều khiển Máy Khoan Nhiệt Laser phá xuyên 4 chốt khóa thép Kho Tiền.<br>
              • <strong>Giai đoạn 3:</strong> Vét $65,000 vàng thỏi, phá vây 4★ Thiên Đình Chấp Pháp + Thiên Binh Cấm Vệ ra Bến Du Thuyền (-218, 95) &amp; lái Tàu Cao Tốc ra khơi!
            </p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="gta-ha-btn green" data-launch-heist="4">🚀 BẮT ĐẦU PHI VỤ NGÂN HÀNG</button>
              <button type="button" class="gta-ha-btn ghost" data-gps-heist="4">📍 Đặt GPS (111, -120)</button>
            </div>
          </div>

          <div style="background:linear-gradient(155deg,rgba(54,18,78,0.68),rgba(15,23,42,0.95));border:1px solid rgba(192,132,252,0.55);border-radius:12px;padding:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:12px;font-weight:900;color:#e879f9;">ĐẠI PHI VỤ #5 • DIAMOND CASINO</span>
              <span style="font-size:16px;font-weight:900;color:#fde047;">THƯỞNG: $120,000</span>
            </div>
            <h3 style="margin:8px 0 6px;font-size:18px;color:#fff;">💎 PHI VỤ HẦM NGẦM SÒNG BẠC DIAMOND</h3>
            <p style="font-size:12.5px;color:#cbd5e1;line-height:1.5;margin:0 0 12px;">
              • <strong>Giai đoạn 1:</strong> Mặc giáp phòng độc đặc nhiệm, vượt lưới Laser hành lang ngầm Casino (1200, 1200).<br>
              • <strong>Giai đoạn 2:</strong> Giải mã 4 lát Vân Tay Sinh Trắc &amp; Gương Quang Học trong 45 giây.<br>
              • <strong>Giai đoạn 3:</strong> Vét sạch Kim Cương trước khi Khí Độc tràn ngập &amp; lái Trực Thăng / Siêu Xe lên Đài Thiên Văn!
            </p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="gta-ha-btn purple" data-launch-heist="5">🚀 BẮT ĐẦU PHI VỤ CASINO</button>
              <button type="button" class="gta-ha-btn ghost" data-gps-heist="5">📍 Đặt GPS (209.5, -92)</button>
            </div>
          </div>
        </div>

        <div style="margin-top:18px;">
          <div style="font-size:13.5px;font-weight:800;color:#fde047;margin-bottom:8px;">🛠 CHIÊU MỘ ĐỒNG ĐỘI &amp; THIẾT BỊ HỖ TRỢ ĐẠI PHI VỤ</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(265px,1fr));gap:10px;">
            ${CREW_PERK_CATALOG.map((pk) => {
              const owned = progressionStats.crewPerksUnlocked.has(pk.id);
              return `
                <div style="background:rgba(15,23,42,0.88);border:1px solid ${owned ? '#10b981' : 'rgba(148,163,184,0.2)'};border-radius:10px;padding:12px;">
                  <div style="font-weight:800;font-size:13px;color:#f8fafc;">${pk.icon} ${escapeHTML(pk.name)}</div>
                  <div style="font-size:11.5px;color:#94a3b8;margin:5px 0 10px;line-height:1.4;">${escapeHTML(pk.desc)}</div>
                  <button type="button" class="gta-ha-btn ${owned ? 'ghost' : 'gold'}" data-buy-perk="${pk.id}" ${owned ? 'disabled' : ''}>
                    ${owned ? '✔ ĐÃ TRANG BỊ VĨNH VIỄN' : `Thuê Ngay (${formatMoney(pk.cost)})`}
                  </button>
                </div>`;
            }).join('')}
          </div>
        </div>
      `;
    } else if (hubActiveTab === 'races') {
      const wagerTiers = [1000, 2500, 5000, 10000, 15000, 25000];
      contentHtml = `
        <div style="background:rgba(30,16,58,0.65);border:1px solid rgba(192,132,252,0.4);border-radius:11px;padding:12px 15px;margin-bottom:14px;">
          <div style="font-size:13px;font-weight:800;color:#f0abfc;margin-bottom:8px;">
            💰 CHỌN MỨC TIỀN CƯỢC XUẤT PHÁT: <span style="color:#fde047;">${formatMoney(raceState.selectedWagerTier)}</span>
            → VÔ ĐỊCH HẠNG 1 NHẬN 2.5X: <span style="color:#34d399;">${formatMoney(Math.round(raceState.selectedWagerTier * 2.5))}</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:7px;">
            ${wagerTiers
              .map(
                (w) => `
              <button type="button" class="gta-ha-btn ${raceState.selectedWagerTier === w ? 'gold' : 'ghost'}" data-wager-tier="${w}">
                Cược ${formatMoney(w)}
              </button>`
              )
              .join('')}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;">
          ${STREET_RACE_CIRCUITS.map((c) => {
            const won = progressionStats.wonCircuitsSet.has(c.id);
            const best = raceState.bestTimesByCircuit[c.id];
            return `
              <div style="background:rgba(15,23,42,0.9);border:1px solid ${won ? 'rgba(52,211,153,0.55)' : 'rgba(192,132,252,0.32)'};border-radius:11px;padding:14px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:11.5px;font-weight:800;color:#e879f9;">GIẢI #${c.index + 1} • ${c.laps} VÒNG (${c.checkpoints.length} CỔNG)</span>
                  <span style="font-size:11.5px;font-weight:800;color:${won ? '#34d399' : '#94a3b8'};">${won ? '🏆 ĐÃ VÔ ĐỊCH' : '5 SIÊU XE AI NEON'}</span>
                </div>
                <div style="font-size:16px;font-weight:900;color:#f8fafc;margin:6px 0 4px;">🏁 ${escapeHTML(c.vnTitle)}</div>
                <div style="font-size:12px;color:#94a3b8;margin-bottom:8px;line-height:1.4;">${escapeHTML(c.desc)}</div>
                <div style="font-size:11.5px;color:#fde047;margin-bottom:10px;">
                  Kỷ lục cá nhân: ${best ? formatRaceTime(best) : 'Chưa thiết lập'}
                </div>
                <div style="display:flex;gap:7px;">
                  <button type="button" class="gta-ha-btn purple" data-start-race="${c.id}">🏎 ĐUA NGAY (${formatMoney(raceState.selectedWagerTier)})</button>
                  <button type="button" class="gta-ha-btn ghost" data-gps-race="${c.id}">📍 GPS</button>
                </div>
              </div>`;
          }).join('')}
        </div>
      `;
    } else {
      contentHtml = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(315px,1fr));gap:12px;">
          ${BOUNTY_TARGETS.map((b) => {
            if (!mugshotCache[b.id]) {
              mugshotCache[b.id] = renderMugshotPortraitDataURL(b.id, '#f97316');
            }
            const done = bountyState.completedIds.has(b.id);
            const alive = bountyState.capturedAliveIds.has(b.id);
            return `
              <div style="background:rgba(15,23,42,0.92);border:1px solid ${done ? 'rgba(16,185,129,0.5)' : 'rgba(249,115,22,0.4)'};border-radius:11px;padding:13px;display:flex;gap:12px;">
                <img src="${mugshotCache[b.id]}" alt="${escapeHTML(b.name)}" style="width:76px;height:76px;border-radius:8px;border:1px solid #f97316;flex-shrink:0;" />
                <div style="flex:1;min-width:0;">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:11px;font-weight:800;color:#fb923c;">TRUY NÃ #${b.id}</span>
                    <span style="font-size:11px;font-weight:800;color:${done ? '#34d399' : '#fde047'};">
                      ${alive ? '⛓ ĐÃ BẮT SỐNG' : done ? '✔ ĐÃ TIÊU DIỆT' : 'ĐANG LẨN TRỐN'}
                    </span>
                  </div>
                  <div style="font-size:15px;font-weight:900;color:#f8fafc;margin-top:2px;">${escapeHTML(b.name)}</div>
                  <div style="font-size:11.5px;color:#94a3b8;margin:4px 0;line-height:1.35;">${escapeHTML(b.crime)}</div>
                  <div style="font-size:11px;color:#fca5a5;margin-bottom:8px;">⚠ ${escapeHTML(b.threat)}</div>
                  <div style="font-size:11.5px;color:#fde047;margin-bottom:8px;">
                    Tiêu diệt: <strong>${formatMoney(b.reward)}</strong> • Bắt sống (1.35x): <strong style="color:#34d399;">${formatMoney(b.aliveBonus)}</strong>
                  </div>
                  <button type="button" class="gta-ha-btn gold" data-start-bounty="${b.id}">🎯 SĂN LÙNG MỤC TIÊU #${b.id}</button>
                </div>
              </div>`;
          }).join('')}
        </div>
      `;
    }

    domRefs.hubBody.innerHTML = tabsHtml + contentHtml;

    domRefs.hubBody.querySelectorAll('[data-hub-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        hubActiveTab = btn.getAttribute('data-hub-tab') || 'heists';
        heistSFX.playHackClick(1.05);
        renderActivityHubModal();
      });
    });

    document.getElementById('gta-hub-abort-active-btn')?.addEventListener('click', () => {
      if (heistState.active) {
        clearHeistEntities();
        heistState.active = false;
      }
      if (raceState.active) abortStreetRace(false);
      if (bountyState.active) abortBounty(false);
      setObjectiveText('');
      renderActivityHubModal();
    });

    domRefs.hubBody.querySelectorAll('[data-launch-heist]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const hId = Number(btn.getAttribute('data-launch-heist'));
        startHeist(hId);
        applyCrewPerksToSession();
      });
    });

    domRefs.hubBody.querySelectorAll('[data-gps-heist]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const hId = Number(btn.getAttribute('data-gps-heist'));
        const pt = hId === 5 ? HEIST_COORDS.casinoSideCorona : HEIST_COORDS.bankExterior;
        setGPSWaypoints(pt.x, pt.z);
        closeActivityHub();
        notifyFeed(`📍 Đã đặt lộ trình GPS tới điểm khởi động Đại Phi Vụ #${hId}!`, 'purple');
      });
    });

    domRefs.hubBody.querySelectorAll('[data-buy-perk]').forEach((btn) => {
      btn.addEventListener('click', () => buyCrewPerk(btn.getAttribute('data-buy-perk')));
    });

    domRefs.hubBody.querySelectorAll('[data-wager-tier]').forEach((btn) => {
      btn.addEventListener('click', () => {
        raceState.selectedWagerTier = Number(btn.getAttribute('data-wager-tier')) || 5000;
        heistSFX.playHackClick(1.1);
        renderActivityHubModal();
      });
    });

    domRefs.hubBody.querySelectorAll('[data-start-race]').forEach((btn) => {
      btn.addEventListener('click', () => {
        startStreetRace(btn.getAttribute('data-start-race'), raceState.selectedWagerTier);
      });
    });

    domRefs.hubBody.querySelectorAll('[data-gps-race]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cir = resolveCircuitDef(btn.getAttribute('data-gps-race'));
        setGPSWaypoints(cir.start.x, cir.start.z);
        closeActivityHub();
        notifyFeed(`📍 Đã đặt lộ trình GPS tới vạch xuất phát "${cir.vnTitle}"!`, 'purple');
      });
    });

    domRefs.hubBody.querySelectorAll('[data-start-bounty]').forEach((btn) => {
      btn.addEventListener('click', () => {
        startBounty(Number(btn.getAttribute('data-start-bounty')));
        applyCrewPerksToSession();
      });
    });
  }

  function openActivityHub(initialTab = 'heists') {
    ensureHeistsDOM();
    if (initialTab === 'races' || initialTab === 'bounties' || initialTab === 'heists') {
      hubActiveTab = initialTab;
    }
    activeCtx?.ui?.closePhone?.();
    exitPointerLockSafe();
    activeCtx.activeModal = 'heist_hub';
    domRefs.hubModal?.classList.add('open');
    heistSFX.playHackClick(1.12);
    renderActivityHubModal();
    return true;
  }

  function closeActivityHub() {
    domRefs.hubModal?.classList.remove('open');
    if (activeCtx?.activeModal === 'heist_hub') {
      activeCtx.activeModal = null;
    }
    return true;
  }

  function closeModal() {
    closeHackMinigame(false);
    closeStockMarket();
    closeAchievements();
    closeActivityHub();
    return true;
  }

  // ==========================================================================
  // 13. LIVE MINIMAP RADAR OVERLAY (Race AI Blips, Checkpoints & Truy Nã Target)
  // ==========================================================================
  function drawRadarActivityBlips() {
    if (typeof document === 'undefined') return;
    const mmCanvas = document.getElementById('minimap-canvas');
    if (!mmCanvas) return;
    const c = mmCanvas.getContext('2d');
    if (!c || !activeCtx?.player) return;

    const p = activeCtx.player;
    // Skip exterior radar overlay when inside isolated interiors (x > 500)
    if (p.x > 500) return;

    const w = mmCanvas.width || 260;
    const h = mmCanvas.height || 186;
    const inCar = Boolean(p.inCar || p.vehicle);
    const cx = w * 0.5;
    const cy = inCar ? h * 0.60 : h * 0.52;
    const carSpd = inCar ? Math.hypot(p.inCar?.vx || 0, p.inCar?.vz || 0) : 0;
    const scale = inCar ? clamp(1.02 - carSpd * 0.008, 0.68, 1.02) : 1.22;

    let radarRot = 0;
    const cam = activeCtx?.engine?.camera;
    if (cam?.matrixWorld?.elements) {
      const e = cam.matrixWorld.elements;
      const fx = -e[8];
      const fz = -e[10];
      if (fx * fx + fz * fz > 0.0001) {
        radarRot = -Math.atan2(fx, -fz);
      }
    }

    c.save();
    c.translate(cx, cy);
    c.scale(1, 0.84);
    c.rotate(radarRot);
    c.scale(scale, scale);
    c.translate(-p.x, -p.z);

    const invS = 1 / scale;

    if (raceState.active && raceState.circuit) {
      // Draw active checkpoint gold/cyan ring
      const cp = raceState.circuit.checkpoints[raceState.playerProgress.cpIdx];
      if (cp) {
        c.fillStyle = '#00f0ff';
        c.strokeStyle = '#000';
        c.lineWidth = 1.4 * invS;
        c.beginPath();
        c.arc(cp.x, cp.z, 5.5 * invS, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }
      // Draw 5 AI Neon Racer Dots
      for (const ai of raceState.aiRacers) {
        if (!ai.car) continue;
        c.fillStyle = ai.neonHex || '#e879f9';
        c.strokeStyle = '#fff';
        c.lineWidth = 1.0 * invS;
        c.beginPath();
        c.arc(ai.car.x, ai.car.z, 4.0 * invS, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }
    } else if (bountyState.active && bountyState.fugitive) {
      // Pulsing Crimson Target Blip for Wanted Fugitive
      const fug = bountyState.fugitive;
      c.fillStyle = bountyState.stage === 'surrendered' ? '#22c55e' : '#ef4444';
      c.strokeStyle = '#fde047';
      c.lineWidth = 1.6 * invS;
      c.beginPath();
      c.arc(fug.x, fug.z, 5.4 * invS, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    } else if (!heistState.active && !(activeCtx?.gameplay?.mission?.active)) {
      // Subtle Purple Đua Đêm Giang Hồ Dots & Orange Precinct Truy Nã Blip in Free-Roam
      c.fillStyle = '#d946ef';
      c.strokeStyle = '#1e1b4b';
      c.lineWidth = 1.1 * invS;
      for (const cir of STREET_RACE_CIRCUITS) {
        c.beginPath();
        c.arc(cir.start.x, cir.start.z, 3.6 * invS, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }
      c.fillStyle = '#f97316';
      c.beginPath();
      c.arc(PRECINCT_BOUNTY_BOARD.x, PRECINCT_BOUNTY_BOARD.z, 4.0 * invS, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }

    c.restore();
  }

  // ==========================================================================
  // 14. GAMEPLAY MISSION #4/#5, SMARTPHONE & KEYBOARD BRIDGES
  // ==========================================================================
  let _bridgesInstalled = false;
  let _keyboardInstalled = false;

  function installGameplayAndPhoneBridges() {
    if (_bridgesInstalled) return;
    const gp = activeCtx?.gameplay;
    if (!gp) return;
    _bridgesInstalled = true;

    if (typeof gp.startMission === 'function' && !gp.startMission._heistsExtended) {
      const origStartMission = gp.startMission.bind(gp);
      const wrappedStart = function extendedStartMission(missionId) {
        const idNum = Number(missionId);
        if (idNum === 4 || String(missionId).toLowerCase() === 'bank') {
          const ok = startHeist(4);
          applyCrewPerksToSession();
          return ok;
        }
        if (idNum === 5 || String(missionId).toLowerCase() === 'casino') {
          const ok = startHeist(5);
          applyCrewPerksToSession();
          return ok;
        }
        // Abort custom activities cleanly if starting Story Mission 1..3
        if (heistState.active) {
          clearHeistEntities();
          heistState.active = false;
        }
        if (raceState.active) abortStreetRace(true);
        if (bountyState.active) abortBounty(true);
        return origStartMission(missionId);
      };
      wrappedStart._heistsExtended = true;
      gp.startMission = wrappedStart;
    }

    if (typeof gp.triggerPhoneAction === 'function' && !gp.triggerPhoneAction._heistsExtended) {
      const origPhone = gp.triggerPhoneAction.bind(gp);
      const wrappedPhone = function extendedPhoneAction(actionKey) {
        const k = String(actionKey || '').toLowerCase();
        if (k === 'heist_4' || k === 'bank_heist' || k === 'pacific_heist') return startHeist(4);
        if (k === 'heist_5' || k === 'casino_heist' || k === 'diamond_heist') return startHeist(5);
        if (k === 'street_race' || k.startsWith('race_')) {
          const sub = k.replace('race_', '');
          return sub && sub !== 'street_race' ? startStreetRace(sub) : openActivityHub('races');
        }
        if (k === 'stocks' || k === 'bawsaq' || k === 'stock_market') return openStockMarket();
        if (k === 'achievements' || k === 'trophies') return openAchievements();
        if (k === 'bounty' || k === 'bounties') return startBounty();
        if (k === 'heist_hub' || k === 'activities') return openActivityHub('heists');
        return origPhone(actionKey);
      };
      wrappedPhone._heistsExtended = true;
      gp.triggerPhoneAction = wrappedPhone;
    }
  }

  function installKeyboardListeners() {
    if (_keyboardInstalled || typeof window === 'undefined') return;
    _keyboardInstalled = true;

    window.addEventListener('keydown', (e) => {
      const code = e.code;
      hackGame.keysHeld[code] = true;

      // Clean Escape close for all our modals
      if (code === 'Escape') {
        const m = activeCtx?.activeModal;
        if (m === 'heist_hack' || m === 'stocks' || m === 'achievements' || m === 'heist_hub') {
          closeModal();
          return;
        }
      }

      // Interactive Hacking & Vault Drill Keyboard Controls
      if (hackGame.active && activeCtx?.activeModal === 'heist_hack') {
        if (
          code === 'Space' ||
          code === 'ArrowUp' ||
          code === 'ArrowDown' ||
          code === 'ArrowLeft' ||
          code === 'ArrowRight' ||
          code === 'Enter'
        ) {
          e.preventDefault();
        }
        if (hackGame.mode === 'bank_drill') {
          if (code === 'KeyR') triggerDrillCoolantPurge();
        } else if (hackGame.bio.subStage === 'fingerprint') {
          if (code === 'KeyW' || code === 'ArrowUp') {
            hackGame.bio.selectedRow = (hackGame.bio.selectedRow + 3) % 4;
            heistSFX.playHackClick(0.95);
            renderHackToolbar();
          } else if (code === 'KeyS' || code === 'ArrowDown') {
            hackGame.bio.selectedRow = (hackGame.bio.selectedRow + 1) % 4;
            heistSFX.playHackClick(0.95);
            renderHackToolbar();
          } else if (code === 'KeyA' || code === 'ArrowLeft') {
            shiftFingerprintSlice(-1);
          } else if (code === 'KeyD' || code === 'ArrowRight') {
            shiftFingerprintSlice(1);
          } else if (code === 'Enter' || code === 'NumpadEnter') {
            verifyFingerprintMatch();
          }
        }
        return;
      }

      // Convenient Hotkeys during Gameplay (when no conflicting modal is open)
      if (!activeCtx?.started || activeCtx?.paused) return;
      if (code === 'F8') {
        e.preventDefault();
        if (activeCtx.activeModal === 'heist_hub') closeActivityHub();
        else openActivityHub('heists');
      } else if (code === 'F9') {
        e.preventDefault();
        if (activeCtx.activeModal === 'stocks') closeStockMarket();
        else openStockMarket();
      } else if (code === 'F10') {
        e.preventDefault();
        if (activeCtx.activeModal === 'achievements') closeAchievements();
        else openAchievements();
      } else if (code === 'Backspace' && !activeCtx.activeModal) {
        if (raceState.active) abortStreetRace(false);
        else if (bountyState.active) abortBounty(false);
      }
    });

    window.addEventListener('keyup', (e) => {
      hackGame.keysHeld[e.code] = false;
    });
  }

  // ==========================================================================
  // 15. INITIALIZATION, MAIN PER-FRAME UPDATE & EXPORTED API (ctx.heists)
  // ==========================================================================
  let _initialized = false;
  let _stockMarketSeeded = false;

  function init(ctxArg = null) {
    if (ctxArg && typeof ctxArg === 'object') {
      activeCtx = ctxArg;
    }
    if (!_stockMarketSeeded) {
      _stockMarketSeeded = true;
      loadProgressionStats();
      initStockMarketData();
      loadAchievementsState();
    }
    ensureHeistsDOM();
    installKeyboardListeners();
    installInteriorWalkGuard();
    installGameplayAndPhoneBridges();

    if (getScene()) {
      buildHeistArchitectureAndCoronas();
      buildStreetRaceWorldMarkers();
      buildBountyBoardVisuals();
      _initialized = true;
    }
    return api;
  }

  function update(dtArg = 0.016, rawDtArg = null, ctxArg = null) {
    if (ctxArg && typeof ctxArg === 'object') {
      activeCtx = ctxArg;
    }
    if (!_initialized) {
      init(activeCtx);
    } else {
      installInteriorWalkGuard();
      installGameplayAndPhoneBridges();
    }

    const dt = clamp(Number(dtArg) || 0.016, 0.0005, 0.1);
    const rawDt =
      typeof rawDtArg === 'number' && Number.isFinite(rawDtArg) && rawDtArg > 0
        ? clamp(rawDtArg, 0.0005, 0.1)
        : dt;

    // 1. Always step interactive Hacking / Vault Drilling Canvas minigame even if timeScale is slowed
    if (hackGame.active) {
      applyCrewPerksToSession();
      updateHackMinigame(rawDt);
    }

    if (activeCtx?.paused) return;

    // 2. Step Vạn Thương Linh Các Dynamic Vạn Thương Linh Các prices & Real-World Chaos Coupling
    monitorWorldChaosForStocks(dt);
    stepBawsaqMarket(rawDt);

    // 3. Step Đại Kiếp Bảo Khố (#4 Bank & #5 Casino), Midnight Street Races & Truy Nã Hunts
    if (activeCtx?.started !== false) {
      updateHeistCombatAndProps(dt, rawDt);
      updateStreetRacingLeague(dt, rawDt);
      updateBountyHunting(dt);
      sampleLiveExplorationAndStats(dt);
      drawRadarActivityBlips();

      achCheckAccum += rawDt;
      if (achCheckAccum >= 1.2) {
        achCheckAccum = 0;
        evaluateAchievements();
      }
    }
  }

  function getActiveActivitySnapshot() {
    if (heistState.active) {
      return {
        type: 'heist',
        id: heistState.id,
        title: heistState.title,
        phase: heistState.phase,
        subStep: heistState.subStep,
        lootBag: heistState.lootBag,
        rewardMax: heistState.rewardMax,
        vaultDoorOpen: heistState.vaultDoorOpen
      };
    }
    if (raceState.active && raceState.circuit) {
      return {
        type: 'street_race',
        id: raceState.circuit.id,
        title: raceState.circuit.vnTitle,
        phase: raceState.phase,
        wager: raceState.wager,
        lap: raceState.playerProgress.lap,
        totalLaps: raceState.circuit.laps,
        rank: raceState.playerProgress.rank,
        elapsedTime: raceState.elapsedTime
      };
    }
    if (bountyState.active && bountyState.def) {
      return {
        type: 'bounty',
        id: bountyState.def.id,
        title: bountyState.def.name,
        stage: bountyState.stage,
        reward: bountyState.def.reward,
        aliveBonus: bountyState.def.aliveBonus
      };
    }
    return null;
  }

  const api = {
    init,
    update,
    updateHeists: update,

    // Đại Kiếp Bảo Khố #4 & #5 + Hacking Minigames
    startHeist,
    openHackMinigame,
    closeHackMinigame,
    solveActiveHack,

    // Midnight Neon Giải Đua Đêm Giang Hồ (5 Circuits)
    startStreetRace,
    abortStreetRace,
    circuits: STREET_RACE_CIRCUITS,

    // Vạn Thương Linh Các Dynamic Vạn Thương Linh Các (12 GTA-Parody Corporations)
    openStockMarket,
    closeStockMarket,
    buyStock,
    sellStock,
    sellAllStock,
    triggerMarketEvent,
    stocks: stockMarket.stocks,
    portfolio,

    // Lệnh Truy Nã Giang Hồ (5 Named Fugitives) & 40 In-Game Thành Tựu Võ Lâm
    startBounty,
    abortBounty,
    bounties: BOUNTY_TARGETS,
    openAchievements,
    closeAchievements,
    unlockAchievement,
    evaluateAchievements,
    achievements,
    stats: progressionStats,

    // Unified Command Hub & Modal Close Helpers (used by Escape key / Smartphone)
    openActivityHub,
    closeActivityHub,
    openRaceHub: () => openActivityHub('races'),
    openBountyBoard: () => openActivityHub('bounties'),
    closeModal,
    close: closeModal,

    get isOpen() {
      return Boolean(
        hackGame.active ||
          domRefs.bawsaqModal?.classList?.contains('open') ||
          domRefs.achModal?.classList?.contains('open') ||
          domRefs.hubModal?.classList?.contains('open')
      );
    },

    get activeActivity() {
      return getActiveActivitySnapshot();
    }
  };

  ctx.heists = api;
  ctx.heistsActivities = api;

  // Eagerly seed data & safe non-scene setup so portfolio/achievements/stocks exist immediately on creation
  init(ctx);

  return api;
}
