/**
 * GIANG HỒ ĐẠI LỘ & BỜ BIỂN 3D — Real-Time 12-Player Online Multiplayer Client (Socket.IO)
 * Smooth 60 FPS Entity & Vehicle Interpolation, 3D Floating Nameplates, Sword Qi & Gun PvP Sync
 */

export function createMultiplayerSystem(ctx, THREE) {
  const remotePlayers = new Map();
  const mpCars = new Map();

  const _seatWorldPos = new THREE.Vector3();
  const _seatOffset = new THREE.Vector3();
  const _chassisQuat = new THREE.Quaternion();

  let socket = null;
  let sendAccum = 0;
  let pingAccum = 0;
  let lastBadgeStr = '';

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const wrapAngle = (a) => {
    let r = (a + Math.PI) % (Math.PI * 2);
    if (r < 0) r += Math.PI * 2;
    return r - Math.PI;
  };
  const damp = (cur, tgt, lambda, dt) => cur + (tgt - cur) * (1 - Math.exp(-lambda * dt));
  const dampAngle = (cur, tgt, lambda, dt) => cur + wrapAngle(tgt - cur) * (1 - Math.exp(-lambda * dt));

  function resolveDefaultServerUrl() {
    try {
      const q = new URLSearchParams(window.location.search).get('server');
      if (q && q.trim()) return q.trim().replace(/\/+$/, '');
      if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
        return window.location.origin;
      }
    } catch (_) {}
    return 'https://server-noble-snow-933.fly.dev';
  }

  function getReconnectToken() {
    try {
      let tok = sessionStorage.getItem('gh_mp_reconnect_v1');
      if (!tok) {
        tok = 'gh_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
        sessionStorage.setItem('gh_mp_reconnect_v1', tok);
      }
      return tok;
    } catch (_) {
      return 'gh_' + Math.random().toString(36).slice(2, 12);
    }
  }

  // --------------------------------------------------------------------------
  // 3D Floating Canvas Nameplate + HP/Armor Bar Sprite
  // --------------------------------------------------------------------------
  function createNameplateSprite(initialName) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 72;
    const c2d = canvas.getContext('2d');

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;

    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.15, 0.60, 1);
    sprite.renderOrder = 999;

    const meta = {
      canvas,
      c2d,
      tex,
      sprite,
      lastKey: '',
    };
    drawNameplateCanvas(meta, initialName, 100, 100, 50, 0);
    return meta;
  }

  function drawNameplateCanvas(meta, name, hp, maxHp, armor, wantedStars) {
    const hpPct = clamp((Number(hp) || 0) / Math.max(1, Number(maxHp) || 100), 0, 1);
    const armPct = clamp((Number(armor) || 0) / 100, 0, 1);
    const stars = clamp(Math.round(Number(wantedStars) || 0), 0, 5);
    const cacheKey = `${name}|${Math.round(hpPct * 25)}|${Math.round(armPct * 10)}|${stars}`;
    if (meta.lastKey === cacheKey) return;
    meta.lastKey = cacheKey;

    const c = meta.c2d;
    const w = meta.canvas.width;
    const h = meta.canvas.height;
    c.clearRect(0, 0, w, h);

    // Wuxia Dark Jade/Gold Plaque Background
    c.fillStyle = 'rgba(10, 13, 20, 0.84)';
    c.strokeStyle = 'rgba(240, 195, 90, 0.78)';
    c.lineWidth = 2.5;
    c.beginPath();
    if (typeof c.roundRect === 'function') {
      c.roundRect(14, 6, w - 28, 38, 9);
    } else {
      c.rect(14, 6, w - 28, 38);
    }
    c.fill();
    c.stroke();

    // Name + Optional Wanted Star Prefix
    const starPrefix = stars > 0 ? `${'★'.repeat(stars)} ` : '';
    c.font = '900 18px system-ui, -apple-system, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = stars > 0 ? '#ffd86b' : '#fff8e8';
    c.fillText(`${starPrefix}${String(name || 'Hiệp Khách').slice(0, 16)}`, w * 0.5, 25);

    // Health + Armor Bar Track
    const barX = 36;
    const barW = w - 72;
    c.fillStyle = 'rgba(0, 0, 0, 0.82)';
    c.fillRect(barX - 2, 49, barW + 4, 13);

    c.fillStyle = hpPct < 0.3 ? '#ff3b47' : '#38e09c';
    c.fillRect(barX, 51, Math.round(barW * hpPct), 6);

    if (armPct > 0.02) {
      c.fillStyle = '#4cc2ff';
      c.fillRect(barX, 58, Math.round(barW * armPct), 3);
    }

    meta.tex.needsUpdate = true;
  }

  function updateNameplate(rp) {
    if (!rp || !rp.plate) return;
    drawNameplateCanvas(rp.plate, rp.name, rp.hp, rp.maxHp || 100, rp.armor, rp.wantedStars);
  }

  // --------------------------------------------------------------------------
  // Remote Player Lifecycle & Interpolation
  // --------------------------------------------------------------------------
  function upsertRemotePlayer(data) {
    if (!data || !data.id || data.id === mp.playerId) return null;
    const scene = ctx.engine?.scene;
    let rp = remotePlayers.get(data.id);

    if (!rp) {
      const outfit = data.outfit || 'casual_polo';
      const rig = ctx.characters?.createHumanoid
        ? ctx.characters.createHumanoid(outfit)
        : null;
      const mesh = rig ? (rig.root || rig.mesh || rig) : new THREE.Group();
      if (scene && mesh && mesh.parent !== scene) {
        scene.add(mesh);
      }

      const plate = createNameplateSprite(data.name || 'Hiệp Khách');
      if (scene) scene.add(plate.sprite);

      rp = {
        id: data.id,
        name: data.name || 'Hiệp Khách',
        x: Number(data.x) || 26,
        y: Number(data.y) || 0.22,
        z: Number(data.z) || 28,
        vx: Number(data.vx) || 0,
        vy: Number(data.vy) || 0,
        vz: Number(data.vz) || 0,
        yaw: Number(data.yaw) || 0,
        tx: Number(data.x) || 26,
        ty: Number(data.y) || 0.22,
        tz: Number(data.z) || 28,
        tyaw: Number(data.yaw) || 0,
        hp: Number.isFinite(data.hp) ? data.hp : 100,
        maxHp: Number.isFinite(data.maxHp) ? data.maxHp : 100,
        armor: Number.isFinite(data.armor) ? data.armor : 50,
        outfit,
        weaponId: data.weaponId || 'bat',
        animState: data.animState || 'idle',
        inCarId: data.inCarId || null,
        isAiming: Boolean(data.isAiming),
        isRappelling: Boolean(data.isRappelling),
        isDead: Boolean(data.isDead),
        inSafehouse: Boolean(data.inSafehouse),
        wantedStars: Number(data.wantedStars) || 0,
        _inOpenTopCar: false,
        rig,
        mesh,
        plate,
      };

      if (rig && ctx.characters?.equipWeapon) {
        ctx.characters.equipWeapon(rig, rp.weaponId);
      }
      mesh.position.set(rp.x, rp.y, rp.z);
      mesh.rotation.y = rp.yaw;
      remotePlayers.set(rp.id, rp);
    } else {
      rp.name = data.name || rp.name;
      rp.tx = Number.isFinite(data.x) ? data.x : rp.tx;
      rp.ty = Number.isFinite(data.y) ? data.y : rp.ty;
      rp.tz = Number.isFinite(data.z) ? data.z : rp.tz;
      rp.vx = Number(data.vx) || 0;
      rp.vy = Number(data.vy) || 0;
      rp.vz = Number(data.vz) || 0;
      if (Number.isFinite(data.yaw)) rp.tyaw = data.yaw;
      if (Number.isFinite(data.hp)) rp.hp = data.hp;
      if (Number.isFinite(data.maxHp)) rp.maxHp = data.maxHp;
      if (Number.isFinite(data.armor)) rp.armor = data.armor;
      rp.animState = data.animState || 'idle';
      rp.inCarId = data.inCarId || null;
      rp.isAiming = Boolean(data.isAiming);
      rp.isRappelling = Boolean(data.isRappelling);
      rp.isDead = Boolean(data.isDead);
      rp.inSafehouse = Boolean(data.inSafehouse);
      rp.wantedStars = Number(data.wantedStars) || 0;

      if (data.outfit && data.outfit !== rp.outfit) {
        rp.outfit = data.outfit;
        if (rp.rig && ctx.characters?.setOutfit) {
          ctx.characters.setOutfit(rp.rig, rp.outfit);
        }
      }
      if (data.weaponId && data.weaponId !== rp.weaponId) {
        rp.weaponId = data.weaponId;
        if (rp.rig && ctx.characters?.equipWeapon) {
          ctx.characters.equipWeapon(rp.rig, rp.weaponId);
        }
      }

      if (Math.hypot(rp.tx - rp.x, rp.tz - rp.z) > 35) {
        rp.x = rp.tx;
        rp.y = rp.ty;
        rp.z = rp.tz;
        rp.yaw = rp.tyaw;
      }
    }

    updateNameplate(rp);
    return rp;
  }

  function removeRemotePlayer(playerId) {
    const rp = remotePlayers.get(playerId);
    if (!rp) return;
    if (rp.mesh && rp.mesh.parent) rp.mesh.parent.remove(rp.mesh);
    if (rp.plate?.sprite) {
      if (rp.plate.sprite.parent) rp.plate.sprite.parent.remove(rp.plate.sprite);
      rp.plate.tex?.dispose?.();
      rp.plate.sprite.material?.dispose?.();
    }
    remotePlayers.delete(playerId);
  }

  function clearAllRemoteEntities() {
    for (const pid of Array.from(remotePlayers.keys())) {
      removeRemotePlayer(pid);
    }
    remotePlayers.clear();
    mpCars.clear();
  }

  // --------------------------------------------------------------------------
  // Shared Room Vehicle Synchronization
  // --------------------------------------------------------------------------
  function syncOrSpawnCar(sc) {
    if (!sc || !sc.id || !ctx.vehicles) return null;
    let car = mpCars.get(sc.id) || ctx.vehicles.list.find((v) => v && v.mpId === sc.id) || null;

    if (!sc.alive) {
      return car;
    }

    if (car && car.destroyed) {
      ctx.vehicles.removeVehicle(car);
      mpCars.delete(sc.id);
      car = null;
    }

    const remoteDrv = sc.driverId && sc.driverId !== mp.playerId ? sc.driverId : null;

    if (!car) {
      car = ctx.vehicles.spawnVehicle(sc.type || 'obey9f', sc.x, sc.y, sc.z, sc.yaw || 0, {
        mpId: sc.id,
        color: sc.color,
        hp: sc.hp,
        maxHp: sc.maxHp,
        remoteDriverId: remoteDrv,
        sirenActive: Boolean(sc.sirenActive),
        isParked: !sc.driverId,
        isHero: true,
        rotorRunning: sc.type === 'heli' && (Boolean(sc.driverId) || (sc.rotorRpm || 0) > 0.25),
      });
      if (car) mpCars.set(sc.id, car);
    }

    if (!car) return null;
    mpCars.set(sc.id, car);
    car.remoteDriverId = remoteDrv;

    if (car !== ctx.player?.inCar) {
      car.mpTarget = {
        x: Number(sc.x) || 0,
        y: Number(sc.y) || 0.05,
        z: Number(sc.z) || 0,
        vx: Number(sc.vx) || 0,
        vy: Number(sc.vy) || 0,
        vz: Number(sc.vz) || 0,
        yaw: Number(sc.yaw) || 0,
        speed: Number(sc.speed) || 0,
        steerAngle: Number(sc.steerAngle) || 0,
        rotorRpm: Number(sc.rotorRpm) || 0,
        sirenActive: Boolean(sc.sirenActive),
      };
      if (Number.isFinite(sc.hp)) car.hp = sc.hp;
      if (Number.isFinite(sc.maxHp)) car.maxHp = sc.maxHp;

      if (Math.hypot(car.x - car.mpTarget.x, car.z - car.mpTarget.z) > 40) {
        car.x = car.mpTarget.x;
        car.y = car.mpTarget.y;
        car.z = car.mpTarget.z;
        car.yaw = car.mpTarget.yaw;
        car.mesh?.position.set(car.x, car.y, car.z);
      }
    }
    return car;
  }

  function refreshRoomBadge() {
    if (!mp.connected) {
      if (lastBadgeStr !== '') {
        lastBadgeStr = '';
        ctx.ui?.updateRoomBadge?.('', false);
      }
      return;
    }
    const totalCount = 1 + remotePlayers.size;
    const pingPart = mp.pingMs > 0 ? ` • ${mp.pingMs}ms` : '';
    const txt = `🌐 PHÒNG: ${String(mp.roomCode || 'LOBBY').toUpperCase()} • ${totalCount}/12 HIỆP KHÁCH${pingPart}`;
    if (txt !== lastBadgeStr) {
      lastBadgeStr = txt;
      ctx.ui?.updateRoomBadge?.(txt, true);
    }
  }

  // --------------------------------------------------------------------------
  // Socket.IO Connection & Room Event Binding
  // --------------------------------------------------------------------------
  function connect(opts = {}) {
    const serverUrl = (opts.serverUrl || resolveDefaultServerUrl()).replace(/\/+$/, '');
    const rawName = (opts.name || 'Hiệp Khách').trim() || 'Hiệp Khách';
    const roomCode = (opts.roomCode || '').trim().toLowerCase();

    if (typeof window.io !== 'function') {
      return Promise.reject(new Error('Không tải được thư viện kết nối Socket.IO! Vui lòng kiểm tra mạng Internet.'));
    }

    disconnect(false);
    mp.connecting = true;
    mp.serverUrl = serverUrl;
    if (ctx.player) ctx.player.name = rawName;
    try {
      localStorage.setItem('gh_mp_name_v1', rawName);
      if (roomCode) localStorage.setItem('gh_mp_room_v1', roomCode);
    } catch (_) {}

    return new Promise((resolve, reject) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        mp.connecting = false;
        try { socket?.disconnect(); } catch (_) {}
        socket = null;
        reject(new Error('Máy chủ đang khởi động hoặc phản hồi chậm — vui lòng bấm thử lại sau vài giây!'));
      }, 14000);

      socket = window.io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 1000,
        timeout: 12000,
      });

      socket.on('connect', () => {
        socket.emit('join', {
          name: rawName,
          roomCode,
          reconnectToken: getReconnectToken(),
          outfit: ctx.player?.outfit || 'casual_polo',
        });
        socket.emit('pingCheck', Date.now());
      });

      socket.on('connect_error', (err) => {
        if (!settled) {
          clearTimeout(timeoutId);
          settled = true;
          mp.connecting = false;
          try { socket?.disconnect(); } catch (_) {}
          socket = null;
          reject(new Error('Không thể kết nối máy chủ Online (' + (err?.message || 'mạng lỗi') + ')'));
        }
      });

      socket.on('joinError', (payload = {}) => {
        if (!settled) {
          clearTimeout(timeoutId);
          settled = true;
          mp.connecting = false;
          try { socket?.disconnect(); } catch (_) {}
          socket = null;
          reject(new Error(payload.reason || 'Không thể vào phòng chơi!'));
        } else {
          ctx.ui?.showNotification?.(payload.reason || 'Lỗi phòng chơi!', 'red');
        }
      });

      socket.on('joined', (data = {}) => {
        clearTimeout(timeoutId);
        mp.connected = true;
        mp.connecting = false;
        mp.playerId = data.playerId;
        mp.roomCode = data.roomCode || 'lobby';
        ctx.timeScale = 1.0;
        ctx.gameplay?.setInvulnerabilityRemainingMs(data.invulnerabilityRemainingMs);

        if (ctx.player?.inCar) {
          ctx.vehicles?.exitVehicle?.(true);
        }
        ctx.gameplay?.clearTrafficCars?.();
        ctx.vehicles?.clearNonMissionVehicles?.();
        clearAllRemoteEntities();

        if (ctx.player && data.spawn) {
          ctx.player.mpControlledDeath = false;
          ctx.player.isDead = false;
          ctx.player.isWasted = false;
          ctx.player.inSafehouse = false;
          ctx.gameplay?.teleportPlayer?.(
            Number(data.spawn.x) || 26,
            Number(data.spawn.y) || 0.22,
            Number(data.spawn.z) || 28,
            Number(data.spawn.yaw) || 2.45
          );
        }
        if (Number.isFinite(data.cash)) {
          if (ctx.gameplay?.syncPlayerCash) ctx.gameplay.syncPlayerCash(data.cash, false);
          else if (ctx.antiCheat?.commitCash) ctx.antiCheat.commitCash(data.cash);
      else if (ctx.player) ctx.player.cash = data.cash;
        }

        if (Array.isArray(data.cars)) {
          for (let i = 0; i < data.cars.length; i++) {
            syncOrSpawnCar(data.cars[i]);
          }
        }
        if (Array.isArray(data.players)) {
          for (let i = 0; i < data.players.length; i++) {
            if (data.players[i]?.id !== mp.playerId) {
              upsertRemotePlayer(data.players[i]);
            }
          }
        }

        refreshRoomBadge();
        const chatHint = ctx.input?.isTouchDevice ? 'Chạm Truyền Âm' : 'Nhấn [T]';
        ctx.ui?.appendChatMessage?.(
          '',
          `Đã kết nối phòng [${mp.roomCode.toUpperCase()}]! ${chatHint} để trò chuyện cùng đồng đạo.`,
          true
        );

        if (!settled) {
          settled = true;
          resolve(data);
        }
      });

      socket.on('pongCheck', (data = {}) => {
        if (Number.isFinite(data.clientSentAt)) {
          mp.pingMs = Math.max(1, Math.round(Date.now() - data.clientSentAt));
          refreshRoomBadge();
        }
      });

      socket.on('playerJoined', (data = {}) => {
        if (data.player && data.player.id !== mp.playerId) {
          upsertRemotePlayer(data.player);
          refreshRoomBadge();
          ctx.ui?.appendChatMessage?.('', `${data.player.name} vừa bước vào giang hồ!`, true);
          ctx.audio?.playPhoneTap?.();
        }
      });

      socket.on('playerLeft', (data = {}) => {
        if (data.playerId) {
          removeRemotePlayer(data.playerId);
          for (const c of mpCars.values()) {
            if (c.remoteDriverId === data.playerId) c.remoteDriverId = null;
          }
          refreshRoomBadge();
          ctx.ui?.appendChatMessage?.('', `${data.name || 'Một hiệp khách'} đã cáo từ rời phòng.`, true);
        }
      });

      socket.on('roomSnapshot', (snap = {}) => {
        if (!mp.connected) return;
        if (Array.isArray(snap.cars)) {
          for (let i = 0; i < snap.cars.length; i++) {
            syncOrSpawnCar(snap.cars[i]);
          }
        }
        if (Array.isArray(snap.players)) {
          const seen = new Set();
          for (let i = 0; i < snap.players.length; i++) {
            const sp = snap.players[i];
            if (!sp || !sp.id) continue;
            if (sp.id === mp.playerId) continue;
            seen.add(sp.id);
            upsertRemotePlayer(sp);
          }
          for (const existingId of Array.from(remotePlayers.keys())) {
            if (!seen.has(existingId)) removeRemotePlayer(existingId);
          }
        }
        refreshRoomBadge();
      });

      socket.on('carSpawned', (data = {}) => {
        if (data.car) syncOrSpawnCar(data.car);
      });

      socket.on('carRemoved', (data = {}) => {
        if (!data.carId) return;
        const car = mpCars.get(data.carId);
        mpCars.delete(data.carId);
        ctx.vehicles?.removeVehicle?.(car || data.carId);
      });

      socket.on('carDriverChanged', (data = {}) => {
        const car = mpCars.get(data.carId) || ctx.vehicles?.list?.find((v) => v && v.mpId === data.carId);
        if (!car) return;
        car.remoteDriverId = data.driverId && data.driverId !== mp.playerId ? data.driverId : null;
        if (data.driverId && data.driverId !== mp.playerId && ctx.player?.inCar === car) {
          ctx.vehicles?.exitVehicle?.(true);
        }
      });

      socket.on('carResprayed', (data = {}) => {
        const car = mpCars.get(data.carId) || ctx.vehicles?.list?.find((v) => v && v.mpId === data.carId);
        if (car) {
          ctx.vehicles?.repairAndRespray?.(car, data.color, true);
        }
      });

      socket.on('carExploded', (data = {}) => {
        const car = mpCars.get(data.carId) || ctx.vehicles?.list?.find((v) => v && v.mpId === data.carId);
        if (car && !car.destroyed) {
          ctx.vehicles?.detonateVehicle?.(car, true);
        }
      });

      socket.on('remoteAttack', (data = {}) => {
        if (!data || data.attackerId === mp.playerId) return;
        const rp = remotePlayers.get(data.attackerId);
        if (rp && rp.rig?.anim) {
          if (data.weaponId === 'bat' || data.weaponId === 'unarmed') {
            rp.rig.anim.meleeTimer = 0.34;
          } else {
            rp.rig.anim.recoil = 0.36;
          }
        }
        ctx.characters?.spawnRemoteAttack?.(data);
        if (ctx.player && data.origin) {
          const dist = Math.hypot((data.origin.x || 0) - ctx.player.x, (data.origin.z || 0) - ctx.player.z);
          if (dist < 68) {
            if (data.isSwordQi || data.weaponId === 'bat') ctx.audio?.playSwordSlash?.();
            else ctx.audio?.playShot?.(data.weaponId);
          }
        }
      });

      socket.on('playerDamaged', (data = {}) => {
        if (data.victimId === mp.playerId && ctx.player) {
          ctx.player.hp = clamp(Number(data.hp) || 0, 0, 100);
          ctx.player.armor = clamp(Number(data.armor) || 0, 0, 100);
          ctx.engine?.triggerDamageFlash?.(0.55);
          ctx.engine?.addShake?.(0.20);
        } else {
          const rp = remotePlayers.get(data.victimId);
          if (rp) {
            rp.hp = clamp(Number(data.hp) || 0, 0, 100);
            rp.armor = clamp(Number(data.armor) || 0, 0, 100);
            updateNameplate(rp);
          }
        }
      });

      socket.on('playerWasted', (data = {}) => {
        ctx.ui?.appendChatMessage?.(
          '',
          `${data.killerName || 'Cao thủ'} đã hạ gục ${data.victimName || 'Hiệp khách'}!`,
          true
        );
        if (data.victimId === mp.playerId && ctx.player) {
          ctx.player.mpControlledDeath = true;
          ctx.player.isDead = true;
          ctx.player.hp = 0;
          if (ctx.player.rappelState) ctx.player.rappelState.active = false;
          if (ctx.player.inCar) ctx.vehicles?.exitVehicle?.(true);
          ctx.characters?.animateHumanoid?.(ctx.player.rig, 'dead', 0.016);
          ctx.ui?.showBanner?.(
            'TRỌNG THƯƠNG',
            `Bị ${data.killerName || 'cao thủ'} đánh bại! Đang đưa về Thái Y Viện...`,
            'wasted',
            3.0
          );
        } else {
          const rp = remotePlayers.get(data.victimId);
          if (rp) {
            rp.isDead = true;
            rp.hp = 0;
            rp.inCarId = null;
            updateNameplate(rp);
          }
        }
      });

      socket.on('playerRespawned', (data = {}) => {
        if (data.playerId === mp.playerId && ctx.player) {
          ctx.player.mpControlledDeath = false;
          ctx.player.isDead = false;
          ctx.player.isWasted = false;
          ctx.player.hp = 100;
          ctx.player.armor = 25;
          ctx.gameplay?.teleportPlayer?.(
            Number(data.x) || 80,
            Number(data.y) || 0.22,
            Number(data.z) || 130,
            Number(data.yaw) || Math.PI
          );
          ctx.ui?.showNotification?.('Thái Y Viện đã trị thương hồi phục kinh mạch cho bạn!', 'green');
        } else {
          const rp = remotePlayers.get(data.playerId);
          if (rp) {
            rp.isDead = false;
            rp.hp = 100;
            rp.armor = 25;
            rp.x = rp.tx = Number(data.x) || 80;
            rp.y = rp.ty = Number(data.y) || 0.22;
            rp.z = rp.tz = Number(data.z) || 130;
            rp.yaw = rp.tyaw = Number(data.yaw) || Math.PI;
            updateNameplate(rp);
          }
        }
      });

      socket.on('bountyReward', (data = {}) => {
        if (data.killerId === mp.playerId && ctx.player) {
          const amt = Number(data.amount) || 350;
          const nextCash = (Number(ctx.player.cash) || 0) + amt;
          if (ctx.gameplay?.syncPlayerCash) ctx.gameplay.syncPlayerCash(nextCash, true);
          else if (ctx.antiCheat?.commitCash) ctx.antiCheat.commitCash(nextCash);
      else ctx.player.cash = nextCash;
          ctx.ui?.showNotification?.(
            `Thưởng Giang Hồ +$${amt} (Chiến thắng ${data.victimName || 'đối thủ'})!`,
            'green'
          );
        }
      });

      socket.on('chat', (data = {}) => {
        if (data.text) {
          ctx.ui?.appendChatMessage?.(data.name || 'Hiệp Khách', data.text, false);
        }
      });

      socket.on('disconnect', () => {
        if (mp.connected) {
          ctx.ui?.showNotification?.('Đang tự động kết nối lại máy chủ Giang Hồ...', 'red');
        }
      });
    });
  }

  function disconnect(restoreSinglePlayer = true) {
    if (mp.connected) ctx.gameplay?.setInvulnerabilityRemainingMs(0);
    mp.connected = false;
    mp.connecting = false;
    mp.playerId = null;
    if (socket) {
      try { socket.disconnect(); } catch (_) {}
      socket = null;
    }
    clearAllRemoteEntities();
    refreshRoomBadge();
    if (ctx.player) {
      ctx.player.mpControlledDeath = false;
    }
    if (restoreSinglePlayer && ctx.vehicles) {
      ctx.vehicles.clearNonMissionVehicles?.();
      ctx.vehicles.spawnInitialSinglePlayerCars?.();
    }
  }

  // --------------------------------------------------------------------------
  // Frame-by-Frame 60 FPS Interpolation & 20Hz Outbound State Emitter
  // --------------------------------------------------------------------------
  function updateMultiplayer(rawDt) {
    if (!mp.connected || !socket) return;
    const dt = clamp(Number(rawDt) || 0.016, 0.0005, 0.1);
    const localInSafehouse = Boolean(ctx.player?.inSafehouse);

    // 1. Smoothly Interpolate & Animate Remote Players + Position Nameplates
    for (const rp of remotePlayers.values()) {
      const sameRealm = Boolean(rp.inSafehouse) === localInSafehouse;

      if (rp.inCarId) {
        const car = mpCars.get(rp.inCarId) || ctx.vehicles?.list?.find((v) => v && v.mpId === rp.inCarId);
        if (car && !car.destroyed) {
          car.remoteDriverId = rp.id;
          rp.x = car.x;
          rp.y = car.y;
          rp.z = car.z;
          rp.yaw = car.yaw;
          rp._inOpenTopCar = Boolean(car.isOpenTop);

          if (car.isOpenTop && car.driverSeatAnchor && rp.mesh && sameRealm && !rp.isDead) {
            rp.mesh.visible = true;
            car.chassis.updateMatrixWorld(true);
            car.driverSeatAnchor.getWorldPosition(_seatWorldPos);
            car.chassis.getWorldQuaternion(_chassisQuat);
            _seatOffset.set(0, -0.35, 0.03).applyQuaternion(_chassisQuat);
            rp.mesh.position.copy(_seatWorldPos).add(_seatOffset);
            rp.mesh.quaternion.copy(_chassisQuat);
            if (rp.rig && ctx.characters?.animateHumanoid) {
              ctx.characters.animateHumanoid(rp.rig, 'driving', dt, {
                steer: (car.steerAngle || 0) / 0.42,
              });
            }
          } else if (rp.mesh) {
            rp.mesh.visible = false;
          }

          if (rp.plate?.sprite) {
            rp.plate.sprite.visible = sameRealm && !rp.isDead;
            rp.plate.sprite.position.set(car.x, car.y + (car.isHeli ? 3.2 : 2.35), car.z);
          }
          continue;
        }
      }

      rp._inOpenTopCar = false;
      // Dead-reckoning + exponential smoothing on foot / Khinh Công / Rappel
      rp.tx += rp.vx * dt * 0.35;
      rp.tz += rp.vz * dt * 0.35;
      rp.x = damp(rp.x, rp.tx, 14, dt);
      rp.y = damp(rp.y, rp.ty, 14, dt);
      rp.z = damp(rp.z, rp.tz, 14, dt);
      rp.yaw = dampAngle(rp.yaw, rp.tyaw, 16, dt);

      if (rp.mesh) {
        rp.mesh.visible = sameRealm;
        rp.mesh.position.set(rp.x, rp.y, rp.z);
        rp.mesh.rotation.set(0, rp.yaw, 0);
      }

      if (rp.rig && ctx.characters?.animateHumanoid && sameRealm) {
        const st = rp.isDead
          ? 'dead'
          : rp.rig.anim?.meleeTimer > 0
            ? 'melee'
            : rp.animState || 'idle';
        const spd = Math.hypot(rp.vx, rp.vz);
        ctx.characters.animateHumanoid(rp.rig, st, dt, {
          moveSpeed: spd,
          aimPitch: 0,
        });
      }

      if (rp.plate?.sprite) {
        rp.plate.sprite.visible = sameRealm && !rp.isDead;
        rp.plate.sprite.position.set(rp.x, rp.y + 2.22, rp.z);
      }
    }

    // 2. Emit Local Player & Driven Vehicle State at 20Hz
    sendAccum += dt;
    if (sendAccum >= 0.05 && ctx.player) {
      sendAccum = 0;
      const p = ctx.player;
      const curCar = p.inCar;

      if (curCar && curCar.mpId && !p.isDead) {
        socket.volatile.emit('carState', {
          carId: curCar.mpId,
          x: curCar.x,
          y: curCar.y,
          z: curCar.z,
          vx: curCar.vx || 0,
          vy: curCar.vy || 0,
          vz: curCar.vz || 0,
          yaw: curCar.yaw || 0,
          speed: curCar.speed || 0,
          steerAngle: curCar.steerAngle || 0,
          rotorRpm: curCar.rotorRpm || 0,
          sirenActive: Boolean(curCar.sirenActive),
        });
      }

      if (!p.isDead) {
        socket.volatile.emit('playerState', {
          x: curCar ? curCar.x : p.x,
          y: curCar ? curCar.y : p.y,
          z: curCar ? curCar.z : p.z,
          vx: curCar ? curCar.vx || 0 : p.vx || 0,
          vy: curCar ? curCar.vy || 0 : p.vy || 0,
          vz: curCar ? curCar.vz || 0 : p.vz || 0,
          yaw: curCar ? curCar.yaw || 0 : p.yaw || 0,
          hp: p.hp ?? 100,
          armor: p.armor ?? 0,
          outfit: p.outfit || 'casual_polo',
          weaponId: p.weaponId || 'bat',
          animState: curCar ? 'driving' : p.animState || 'idle',
          isAiming: Boolean(p.isAiming),
          isRappelling: Boolean(p.rappelState?.active),
          inSafehouse: Boolean(p.inSafehouse),
          wantedStars: ctx.gameplay?.wanted?.stars || 0,
        });
      }
    }

    // 3. Periodic Ping Measurement (every 3.0s)
    pingAccum += dt;
    if (pingAccum >= 3.0) {
      pingAccum = 0;
      socket.emit('pingCheck', Date.now());
    }
  }

  // --------------------------------------------------------------------------
  // Cross-Module Hooks Called by characters.js, vehicles.js, gameplay.js & ui
  // --------------------------------------------------------------------------
  function getRemotePlayerTargets() {
    if (!mp.connected || remotePlayers.size === 0) return [];
    const localInSafe = Boolean(ctx.player?.inSafehouse);
    const out = [];
    for (const rp of remotePlayers.values()) {
      if (!rp || rp.isDead) continue;
      if (Boolean(rp.inSafehouse) !== localInSafe) continue;
      if (rp.inCarId && !rp._inOpenTopCar) continue;
      out.push(rp);
    }
    return out;
  }

  function reportAntiCheat(reason, detail) {
    if (!mp.connected || !socket) return;
    socket.emit('anticheat_flag', {
      reason: String(reason || 'tamper').slice(0, 32),
      detail: String(detail || '').slice(0, 100)
    });
  }

  function onLocalAttack(atk) {
    if (!mp.connected || !socket || !atk) return;
    socket.emit('playerAttack', {
      weaponId: atk.weaponId || 'bat',
      origin: atk.origin,
      dir: atk.dir,
      isSwordQi: Boolean(atk.isSwordQi),
      isExplosive: Boolean(atk.isExplosive),
    });
  }

  function requestPhoneCode(code) {
    const liveSocket = socket;
    if (!mp.connected || !liveSocket?.connected) return Promise.resolve(0);
    return new Promise((resolve) => {
      liveSocket.timeout(4000).emit('dialPhoneCode', code, (error, remainingMs) => {
        resolve(!error && socket === liveSocket && mp.connected && Number.isFinite(remainingMs) ? remainingMs : 0);
      });
    });
  }

  function sendDamagePlayer(targetId, damage, isHeadshot = false, weaponId = 'bat') {
    if (!mp.connected || !socket || !targetId) return;
    socket.emit('damagePlayer', {
      targetId,
      damage,
      isHeadshot: Boolean(isHeadshot),
      weaponId,
    });
  }

  function onEnterCar(car) {
    if (!mp.connected || !socket || !car?.mpId) return;
    socket.emit('enterCar', { carId: car.mpId });
  }

  function onExitCar(car) {
    if (!mp.connected || !socket) return;
    socket.emit('exitCar', {
      x: car?.x ?? ctx.player?.x ?? 26,
      y: car?.y ?? ctx.player?.y ?? 0.05,
      z: car?.z ?? ctx.player?.z ?? 28,
      yaw: car?.yaw ?? ctx.player?.yaw ?? 0,
    });
  }

  function onDamageCar(car, damage) {
    if (!mp.connected || !socket || !car?.mpId) return;
    socket.emit('damageCar', {
      carId: car.mpId,
      damage: Math.round(Number(damage) || 15),
    });
  }

  function onResprayCar(car) {
    if (!mp.connected || !socket || !car?.mpId) return;
    socket.emit('resprayCar', {
      carId: car.mpId,
      color: car.baseColor,
    });
  }

  function requestSpawnVipCar(spec = {}) {
    if (!mp.connected || !socket) return;
    socket.emit('spawnVipCar', {
      type: spec.type || 'obey9f',
      x: spec.x ?? 30,
      y: spec.y ?? 0.05,
      z: spec.z ?? 20,
      yaw: spec.yaw ?? 0,
      color: spec.color,
    });
  }

  function sendChat(text) {
    if (!mp.connected || !socket || !text) return;
    socket.emit('chatMessage', { text: String(text).slice(0, 140) });
  }

  const mp = {
    connected: false,
    connecting: false,
    playerId: null,
    roomCode: 'lobby',
    pingMs: 0,
    serverUrl: resolveDefaultServerUrl(),
    remotePlayers,
    mpCars,
    connect,
    disconnect,
    updateMultiplayer,
    getRemotePlayerTargets,
    onLocalAttack,
    reportAntiCheat,
    requestPhoneCode,
    sendDamagePlayer,
    onEnterCar,
    onExitCar,
    onDamageCar,
    onResprayCar,
    requestSpawnVipCar,
    sendChat,
  };

  ctx.mp = mp;
  return mp;
}
