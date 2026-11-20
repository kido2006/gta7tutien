// ============================================================================
// GIANG HỒ ĐẠI LỘ & BỜ BIỂN 3D — REAL-TIME MULTIPLAYER SERVER (Node.js + Socket.IO)
// ============================================================================
import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import { Server } from 'socket.io';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const INDEX_PATH = path.join(PUBLIC_DIR, 'index.html');

const app = express();
app.use(cors({ origin: '*' }));

app.get('/health', (_req, res) => {
  res.status(200).type('text/plain').send('ok');
});

app.use(express.static(PUBLIC_DIR));

app.get('/', (_req, res) => {
  if (fs.existsSync(INDEX_PATH)) {
    res.sendFile(INDEX_PATH);
  } else {
    res.status(200).type('text/plain').send('Giang Ho Dai Lo 3D Server Running');
  }
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 10000,
  pingTimeout: 8000
});

// ============================================================================
// CONSTANTS & INITIAL WORLD VEHICLES
// ============================================================================
const TICK_HZ = 20;
const TICK_MS = 1000 / TICK_HZ;
const MAX_PLAYERS_PER_ROOM = 12;
const RECONNECT_GRACE_MS = 30000;
const INVULNERABILITY_DURATION_MS = 300_000;

const VALID_VEHICLE_TYPES = new Set([
  'obey9f', 'sedan_lux', 'banshee', 'suv', 'taxi', 'police', 'swat_van', 'heli'
]);

const VEHICLE_MAX_HP = {
  obey9f: 140,
  sedan_lux: 150,
  banshee: 140,
  suv: 180,
  taxi: 135,
  police: 150,
  swat_van: 260,
  heli: 210
};

const HERO_SPAWN_CARS = [
  { type: 'obey9f', x: 34.5, y: 0.05, z: 18.0, yaw: Math.PI, color: 0xf2f4f7 },
  { type: 'banshee', x: 45.5, y: 0.05, z: 26.0, yaw: Math.PI, color: 0xc81d25 },
  { type: 'sedan_lux', x: -168.0, y: 0.40, z: 12.0, yaw: -0.35, color: 0x14171c },
  { type: 'banshee', x: -46.0, y: 0.05, z: 62.0, yaw: 0, color: 0x9e1b22 },
  { type: 'taxi', x: 46.0, y: 0.05, z: -24.0, yaw: 0, color: 0xf2b718 },
  { type: 'police', x: 142.0, y: 0.05, z: 68.0, yaw: -Math.PI * 0.5, color: 0x111318 },
  { type: 'suv', x: 34.0, y: 0.05, z: -68.0, yaw: 0, color: 0x1d4d4f },
  { type: 'heli', x: -222.0, y: 3.85, z: -12.0, yaw: 0.4, color: 0x16325c },
  { type: 'heli', x: 160.0, y: 78.05, z: -42.0, yaw: 0, color: 0x1c232d }
];

const PLAYER_SPAWNS = [
  { x: 26.0, y: 0.22, z: 28.0, yaw: 2.45 },
  { x: 24.5, y: 0.22, z: 22.0, yaw: 2.10 },
  { x: 27.0, y: 0.22, z: 14.0, yaw: 1.85 },
  { x: 53.5, y: 0.22, z: 24.0, yaw: -2.20 },
  { x: 53.5, y: 0.22, z: 12.0, yaw: -1.90 },
  { x: 26.0, y: 0.22, z: -18.0, yaw: 2.30 }
];

const VALID_OUTFITS = new Set(['casual_polo', 'tactical_heist', 'luxury_suit']);
const VALID_WEAPONS = new Set(['unarmed', 'bat', 'pistol', 'smg', 'carbine', 'shotgun', 'grenade']);

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function getInvulnerabilityRemainingMs(player) {
  return Math.max(0, (player.invulnerableUntil ?? 0) - performance.now());
}

function sanitizeName(raw) {
  if (typeof raw !== 'string') return 'Hiệp Khách';
  const cleaned = raw
    .replace(/[<>&"'`]/g, '')
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/[^\p{L}\p{N}_\-\s.]/gu, '')
    .trim()
    .slice(0, 18);
  return cleaned || 'Hiệp Khách';
}

function sanitizeChat(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[<>]/g, '')
    .replace(/https?:\/\/\S+/gi, '[link]')
    .replace(/www\.\S+/gi, '[link]')
    .replace(/[\uD800-\uDFFF]/g, '')
    .trim()
    .slice(0, 140);
}

function normalizeRoomCode(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 16);
}

// ============================================================================
// ROOMS & ENTITY MANAGEMENT
// ============================================================================
const rooms = new Map();
let nextEntityId = 1;
const makeId = (prefix) => `${prefix}_${nextEntityId++}`;

function findPublicLobbyCode() {
  if (!rooms.has('lobby')) return 'lobby';
  const lobby = rooms.get('lobby');
  if (lobby.players.size < MAX_PLAYERS_PER_ROOM) return 'lobby';
  let idx = 2;
  while (rooms.has(`lobby-${idx}`) && rooms.get(`lobby-${idx}`).players.size >= MAX_PLAYERS_PER_ROOM) {
    idx++;
  }
  return `lobby-${idx}`;
}

function spawnServerCar(room, spec, isHero = false) {
  const type = VALID_VEHICLE_TYPES.has(spec.type) ? spec.type : 'obey9f';
  const maxHp = VEHICLE_MAX_HP[type] || 140;
  const id = makeId('mpcar');
  const car = {
    id,
    type,
    x: clamp(Number(spec.x) || 0, -315, 275),
    y: clamp(Number(spec.y) || 0.05, -2, 130),
    z: clamp(Number(spec.z) || 0, -370, 255),
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: Number(spec.yaw) || 0,
    speed: 0,
    steerAngle: 0,
    rotorRpm: 0,
    sirenActive: false,
    color: typeof spec.color === 'number' ? spec.color : 0xf2f4f7,
    hp: maxHp,
    maxHp,
    alive: true,
    driverId: null,
    isHero,
    heroTemplate: isHero ? { ...spec } : null,
    respawnTimer: 0
  };
  room.cars.set(id, car);
  return car;
}

function createRoom(code) {
  const room = {
    code,
    players: new Map(),
    disconnectedPlayers: new Map(),
    cars: new Map(),
    createdAt: Date.now()
  };
  for (const hc of HERO_SPAWN_CARS) {
    spawnServerCar(room, hc, true);
  }
  rooms.set(code, room);
  return room;
}

function serializePlayer(p) {
  return {
    id: p.id,
    name: p.name,
    x: round2(p.x),
    y: round2(p.y),
    z: round2(p.z),
    vx: round2(p.vx),
    vy: round2(p.vy),
    vz: round2(p.vz),
    yaw: round2(p.yaw),
    hp: Math.round(p.hp),
    maxHp: p.maxHp,
    armor: Math.round(p.armor),
    outfit: p.outfit,
    weaponId: p.weaponId,
    animState: p.animState,
    inCarId: p.inCarId,
    isAiming: p.isAiming,
    isRappelling: p.isRappelling,
    isDead: p.isDead,
    inSafehouse: p.inSafehouse,
    wantedStars: p.wantedStars
  };
}

function serializeCar(c) {
  return {
    id: c.id,
    type: c.type,
    x: round2(c.x),
    y: round2(c.y),
    z: round2(c.z),
    vx: round2(c.vx),
    vy: round2(c.vy),
    vz: round2(c.vz),
    yaw: round2(c.yaw),
    speed: round2(c.speed),
    steerAngle: round2(c.steerAngle),
    rotorRpm: round2(c.rotorRpm),
    sirenActive: c.sirenActive,
    color: c.color,
    hp: Math.round(c.hp),
    maxHp: c.maxHp,
    alive: c.alive,
    driverId: c.driverId
  };
}

function releasePlayerVehicle(room, player) {
  if (!player.inCarId) return;
  const car = room.cars.get(player.inCarId);
  if (car && car.driverId === player.id) {
    car.driverId = null;
    car.vx = 0;
    car.vz = 0;
    car.speed = 0;
    io.to(room.code).emit('carDriverChanged', { carId: car.id, driverId: null });
  }
  player.inCarId = null;
}

// ============================================================================
// SOCKET.IO HANDLERS
// ============================================================================
io.on('connection', (socket) => {
  let currentRoom = null;
  let currentPlayer = null;
  let statePackets = 0;
  let attackPackets = 0;
  let spawnCarCd = 0;
  let windowResetAt = Date.now() + 1000;

  function checkRateLimits() {
    const now = Date.now();
    if (now >= windowResetAt) {
      statePackets = 0;
      attackPackets = 0;
      if (spawnCarCd > 0) spawnCarCd = Math.max(0, spawnCarCd - 1);
      windowResetAt = now + 1000;
    }
  }

  socket.on('pingCheck', (clientSentAt) => {
    socket.emit('pongCheck', { clientSentAt, serverTime: Date.now() });
  });

  socket.on('join', (payload = {}) => {
    const cleanName = sanitizeName(payload.name);
    const reqCode = normalizeRoomCode(payload.roomCode);
    const code = reqCode || findPublicLobbyCode();
    const reconnectToken = typeof payload.reconnectToken === 'string' ? payload.reconnectToken.slice(0, 48) : '';
    const outfit = VALID_OUTFITS.has(payload.outfit) ? payload.outfit : 'casual_polo';

    let room = rooms.get(code);
    if (!room) room = createRoom(code);

    if (room.players.size >= MAX_PLAYERS_PER_ROOM) {
      socket.emit('joinError', { reason: 'Phòng đã đầy (12/12 Hiệp Khách)!' });
      return;
    }

    let restored = null;
    if (reconnectToken && room.disconnectedPlayers.has(reconnectToken)) {
      restored = room.disconnectedPlayers.get(reconnectToken);
      room.disconnectedPlayers.delete(reconnectToken);
    }

    const sp = PLAYER_SPAWNS[room.players.size % PLAYER_SPAWNS.length];
    const player = restored
      ? {
          ...restored.playerState,
          socketId: socket.id,
          name: cleanName,
          reconnectToken,
          inCarId: null,
          isDead: false,
          hp: Math.max(50, restored.playerState.hp || 100)
        }
      : {
          id: makeId('pl'),
          socketId: socket.id,
          name: cleanName,
          reconnectToken,
          x: sp.x + (Math.random() - 0.5) * 2.5,
          y: sp.y,
          z: sp.z + (Math.random() - 0.5) * 2.5,
          vx: 0,
          vy: 0,
          vz: 0,
          yaw: sp.yaw,
          hp: 100,
          maxHp: 100,
          armor: 50,
          cash: 7860,
          outfit,
          weaponId: 'bat',
          animState: 'idle',
          inCarId: null,
          isAiming: false,
          isRappelling: false,
          inSafehouse: false,
          isDead: false,
          invulnerableUntil: 0,
          respawnTimer: 0,
          wantedStars: 0
        };

    currentRoom = room;
    currentPlayer = player;
    room.players.set(player.id, player);
    socket.join(room.code);

    socket.emit('joined', {
      playerId: player.id,
      roomCode: room.code,
      cash: player.cash,
      invulnerabilityRemainingMs: getInvulnerabilityRemainingMs(player),
      spawn: { x: player.x, y: player.y, z: player.z, yaw: player.yaw },
      players: Array.from(room.players.values()).map(serializePlayer),
      cars: Array.from(room.cars.values()).map(serializeCar)
    });

    socket.to(room.code).emit('playerJoined', {
      player: serializePlayer(player)
    });
  });

  socket.on('dialPhoneCode', (code, acknowledge) => {
    if (typeof acknowledge !== 'function') return;
    if (code !== '113' || !currentPlayer || currentPlayer.isDead) {
      acknowledge(0);
      return;
    }
    currentPlayer.invulnerableUntil = performance.now() + INVULNERABILITY_DURATION_MS;
    acknowledge(INVULNERABILITY_DURATION_MS);
  });

  socket.on('playerState', (data = {}) => {
    if (!currentRoom || !currentPlayer || currentPlayer.isDead) return;
    checkRateLimits();
    if (++statePackets > 45) return;

    const inSafe = Boolean(data.inSafehouse);
    currentPlayer.inSafehouse = inSafe;
    if (inSafe) {
      currentPlayer.x = clamp(Number(data.x) || 800, 788, 812);
      currentPlayer.y = clamp(Number(data.y) || 0.05, -1, 8);
      currentPlayer.z = clamp(Number(data.z) || 800, 788, 812);
    } else {
      currentPlayer.x = clamp(Number(data.x) || currentPlayer.x, -318, 278);
      currentPlayer.y = clamp(Number(data.y) || 0.22, -3, 132);
      currentPlayer.z = clamp(Number(data.z) || currentPlayer.z, -375, 258);
    }

    currentPlayer.vx = clamp(Number(data.vx) || 0, -55, 55);
    currentPlayer.vy = clamp(Number(data.vy) || 0, -45, 45);
    currentPlayer.vz = clamp(Number(data.vz) || 0, -55, 55);
    if (Number.isFinite(data.yaw)) currentPlayer.yaw = Number(data.yaw);

    if (VALID_OUTFITS.has(data.outfit)) currentPlayer.outfit = data.outfit;
    if (VALID_WEAPONS.has(data.weaponId)) currentPlayer.weaponId = data.weaponId;
    if (typeof data.animState === 'string') currentPlayer.animState = data.animState.slice(0, 18);
    currentPlayer.isAiming = Boolean(data.isAiming);
    currentPlayer.isRappelling = Boolean(data.isRappelling);
    currentPlayer.wantedStars = clamp(Math.round(Number(data.wantedStars) || 0), 0, 5);

    // Allow client medkit/armor pickups to heal cleanly up to max
    if (Number.isFinite(data.armor)) {
      currentPlayer.armor = clamp(Number(data.armor), 0, 100);
    }
    if (Number.isFinite(data.hp) && data.hp > currentPlayer.hp) {
      currentPlayer.hp = clamp(Number(data.hp), 1, currentPlayer.maxHp);
    }
  });

  socket.on('enterCar', (data = {}) => {
    if (!currentRoom || !currentPlayer || currentPlayer.isDead) return;
    const car = currentRoom.cars.get(data.carId);
    if (!car || !car.alive) return;
    if (car.driverId && car.driverId !== currentPlayer.id && currentRoom.players.has(car.driverId)) {
      return;
    }
    releasePlayerVehicle(currentRoom, currentPlayer);
    car.driverId = currentPlayer.id;
    currentPlayer.inCarId = car.id;
    io.to(currentRoom.code).emit('carDriverChanged', { carId: car.id, driverId: currentPlayer.id });
  });

  socket.on('exitCar', (data = {}) => {
    if (!currentRoom || !currentPlayer) return;
    const car = currentPlayer.inCarId ? currentRoom.cars.get(currentPlayer.inCarId) : null;
    if (car && car.driverId === currentPlayer.id) {
      if (Number.isFinite(data.x)) car.x = clamp(Number(data.x), -318, 278);
      if (Number.isFinite(data.y)) car.y = clamp(Number(data.y), -2, 130);
      if (Number.isFinite(data.z)) car.z = clamp(Number(data.z), -375, 258);
      if (Number.isFinite(data.yaw)) car.yaw = Number(data.yaw);
    }
    releasePlayerVehicle(currentRoom, currentPlayer);
  });

  socket.on('carState', (data = {}) => {
    if (!currentRoom || !currentPlayer || currentPlayer.isDead) return;
    const car = currentRoom.cars.get(data.carId);
    if (!car || !car.alive || car.driverId !== currentPlayer.id) return;

    car.x = clamp(Number(data.x) || car.x, -318, 278);
    car.y = clamp(Number(data.y) || car.y, -2.5, 132);
    car.z = clamp(Number(data.z) || car.z, -375, 258);
    car.vx = clamp(Number(data.vx) || 0, -60, 60);
    car.vy = clamp(Number(data.vy) || 0, -35, 35);
    car.vz = clamp(Number(data.vz) || 0, -60, 60);
    if (Number.isFinite(data.yaw)) car.yaw = Number(data.yaw);
    car.speed = clamp(Number(data.speed) || 0, -30, 58);
    car.steerAngle = clamp(Number(data.steerAngle) || 0, -0.5, 0.5);
    car.rotorRpm = clamp(Number(data.rotorRpm) || 0, 0, 1.2);
    car.sirenActive = Boolean(data.sirenActive);

    currentPlayer.x = car.x;
    currentPlayer.y = car.y;
    currentPlayer.z = car.z;
    currentPlayer.yaw = car.yaw;
  });

  socket.on('spawnVipCar', (data = {}) => {
    if (!currentRoom || !currentPlayer || spawnCarCd > 0) return;
    checkRateLimits();
    spawnCarCd = 2;

    // Limit total dynamic VIP vehicles in room to keep memory clean
    if (currentRoom.cars.size >= 28) {
      for (const [cid, c] of currentRoom.cars.entries()) {
        if (!c.isHero && !c.driverId) {
          currentRoom.cars.delete(cid);
          io.to(currentRoom.code).emit('carRemoved', { carId: cid });
          break;
        }
      }
    }

    const car = spawnServerCar(
      currentRoom,
      {
        type: data.type,
        x: data.x,
        y: data.y,
        z: data.z,
        yaw: data.yaw,
        color: data.color
      },
      false
    );
    io.to(currentRoom.code).emit('carSpawned', { car: serializeCar(car) });
  });

  socket.on('resprayCar', (data = {}) => {
    if (!currentRoom || !currentPlayer) return;
    const car = currentRoom.cars.get(data.carId);
    if (!car || !car.alive) return;
    car.hp = car.maxHp;
    if (typeof data.color === 'number') car.color = data.color;
    io.to(currentRoom.code).emit('carResprayed', {
      carId: car.id,
      color: car.color,
      hp: car.hp
    });
  });

  socket.on('playerAttack', (data = {}) => {
    if (!currentRoom || !currentPlayer || currentPlayer.isDead) return;
    checkRateLimits();
    if (++attackPackets > 25) return;

    const weaponId = VALID_WEAPONS.has(data.weaponId) ? data.weaponId : 'pistol';
    const ox = clamp(Number(data.origin?.x) || currentPlayer.x, -320, 280);
    const oy = clamp(Number(data.origin?.y) || currentPlayer.y + 1.3, -3, 135);
    const oz = clamp(Number(data.origin?.z) || currentPlayer.z, -380, 260);
    let dx = Number(data.dir?.x) || 0;
    let dy = Number(data.dir?.y) || 0;
    let dz = Number(data.dir?.z) || 1;
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len;
    dy /= len;
    dz /= len;

    socket.to(currentRoom.code).emit('remoteAttack', {
      attackerId: currentPlayer.id,
      weaponId,
      origin: { x: round2(ox), y: round2(oy), z: round2(oz) },
      dir: { x: round2(dx), y: round2(dy), z: round2(dz) },
      isSwordQi: Boolean(data.isSwordQi),
      isExplosive: Boolean(data.isExplosive)
    });
  });

  let lastDamageAt = 0;
  let acServerStrikes = 0;

  function kickCheater(reasonText) {
    if (!currentRoom || !currentPlayer) return;
    const pname = currentPlayer.name || 'Hiệp Khách';
    io.to(currentRoom.code).emit('chatMessage', {
      id: makeId('sys'),
      name: '🛡️ ANTI-CHEAT',
      text: `Đã đá ${pname} khỏi phòng vì phát hiện gian lận (${reasonText})!`,
      isSystem: true,
      ts: Date.now()
    });
    socket.disconnect(true);
  }

  socket.on('anticheat_flag', (data = {}) => {
    if (!currentRoom || !currentPlayer) return;
    const reason = sanitizeChat(data.reason || 'can thiệp bộ nhớ').slice(0, 40);
    kickCheater(reason || 'can thiệp bộ nhớ');
  });

  socket.on('damagePlayer', (data = {}) => {
    if (!currentRoom || !currentPlayer || currentPlayer.isDead) return;
    const nowMs = Date.now();
    if (nowMs - lastDamageAt < 85) {
      if (++acServerStrikes >= 6) kickCheater('hack bắn siêu tốc / không hồi chiêu');
      return;
    }
    lastDamageAt = nowMs;
    const victim = currentRoom.players.get(data.targetId);
    if (!victim || victim.id === currentPlayer.id || victim.isDead || victim.inSafehouse) return;
    if (getInvulnerabilityRemainingMs(victim) > 0) return;

    const dist = Math.hypot(victim.x - currentPlayer.x, victim.z - currentPlayer.z);
    if (dist > 85) return;

    let dmg = clamp(Number(data.damage) || 18, 2, 140);
    if (victim.armor > 0) {
      const absorbed = Math.min(victim.armor, dmg * 0.65);
      victim.armor = Math.max(0, victim.armor - absorbed);
      dmg -= absorbed;
    }
    victim.hp = Math.max(0, victim.hp - dmg);

    io.to(currentRoom.code).emit('playerDamaged', {
      victimId: victim.id,
      attackerId: currentPlayer.id,
      damage: Math.round(dmg),
      hp: Math.round(victim.hp),
      armor: Math.round(victim.armor),
      isHeadshot: Boolean(data.isHeadshot)
    });

    if (victim.hp <= 0) {
      victim.isDead = true;
      victim.respawnTimer = 3.0;
      victim.animState = 'dead';
      releasePlayerVehicle(currentRoom, victim);

      io.to(currentRoom.code).emit('playerWasted', {
        victimId: victim.id,
        victimName: victim.name,
        killerId: currentPlayer.id,
        killerName: currentPlayer.name
      });

      currentPlayer.cash += 350;
      socket.emit('bountyReward', {
        killerId: currentPlayer.id,
        amount: 350,
        victimName: victim.name
      });
    }
  });

  socket.on('damageCar', (data = {}) => {
    if (!currentRoom || !currentPlayer) return;
    const car = currentRoom.cars.get(data.carId);
    if (!car || !car.alive) return;

    const dmg = clamp(Number(data.damage) || 15, 2, 180);
    car.hp = Math.max(0, car.hp - dmg);

    if (car.hp <= 0) {
      car.alive = false;
      car.respawnTimer = car.isHero ? 18.0 : 8.0;
      const prevDriverId = car.driverId;
      if (prevDriverId) {
        const drv = currentRoom.players.get(prevDriverId);
        if (drv) drv.inCarId = null;
        if (drv && getInvulnerabilityRemainingMs(drv) === 0) {
          drv.hp = 0;
          drv.isDead = true;
          drv.respawnTimer = 3.0;
          io.to(currentRoom.code).emit('playerWasted', {
            victimId: drv.id,
            victimName: drv.name,
            killerId: currentPlayer.id,
            killerName: currentPlayer.name
          });
        }
        car.driverId = null;
      }
      io.to(currentRoom.code).emit('carExploded', {
        carId: car.id,
        x: round2(car.x),
        y: round2(car.y),
        z: round2(car.z),
        attackerId: currentPlayer.id
      });
    }
  });

  socket.on('chatMessage', (data = {}) => {
    if (!currentRoom || !currentPlayer) return;
    const text = sanitizeChat(data.text);
    if (!text) return;
    io.to(currentRoom.code).emit('chat', {
      playerId: currentPlayer.id,
      name: currentPlayer.name,
      text
    });
  });

  socket.on('disconnect', () => {
    if (!currentRoom || !currentPlayer) return;
    releasePlayerVehicle(currentRoom, currentPlayer);
    currentRoom.players.delete(currentPlayer.id);
    io.to(currentRoom.code).emit('playerLeft', {
      playerId: currentPlayer.id,
      name: currentPlayer.name
    });

    if (currentPlayer.reconnectToken) {
      currentRoom.disconnectedPlayers.set(currentPlayer.reconnectToken, {
        disconnectedAt: Date.now(),
        playerState: { ...currentPlayer, inCarId: null }
      });
    }
  });
});

// ============================================================================
// SERVER 20Hz ROOM TICK (Respawns, Car Recovery & Snapshot Broadcast)
// ============================================================================
setInterval(() => {
  const dt = 1 / TICK_HZ;
  const now = Date.now();

  for (const [code, room] of rooms.entries()) {
    // 1. Player Respawn Timers (Respawn at Thái Y Viện: 80, 0.22, 130)
    for (const p of room.players.values()) {
      if (p.isDead) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          p.isDead = false;
          p.hp = p.maxHp;
          p.armor = 25;
          p.x = 80 + (Math.random() - 0.5) * 4;
          p.y = 0.22;
          p.z = 130 + (Math.random() - 0.5) * 3;
          p.yaw = Math.PI;
          p.animState = 'idle';
          io.to(room.code).emit('playerRespawned', {
            playerId: p.id,
            x: round2(p.x),
            y: round2(p.y),
            z: round2(p.z),
            yaw: round2(p.yaw)
          });
        }
      }
    }

    // 2. Destroyed Vehicle Respawn / Cleanup
    for (const [cid, car] of room.cars.entries()) {
      if (!car.alive) {
        car.respawnTimer -= dt;
        if (car.respawnTimer <= 0) {
          if (car.isHero && car.heroTemplate) {
            car.alive = true;
            car.hp = car.maxHp;
            car.x = car.heroTemplate.x;
            car.y = car.heroTemplate.y;
            car.z = car.heroTemplate.z;
            car.yaw = car.heroTemplate.yaw;
            car.vx = 0;
            car.vy = 0;
            car.vz = 0;
            car.speed = 0;
            car.driverId = null;
            io.to(room.code).emit('carSpawned', { car: serializeCar(car) });
          } else {
            room.cars.delete(cid);
            io.to(room.code).emit('carRemoved', { carId: cid });
          }
        }
      }
    }

    // 3. Purge expired reconnect tokens
    for (const [tok, saved] of room.disconnectedPlayers.entries()) {
      if (now - saved.disconnectedAt > RECONNECT_GRACE_MS) {
        room.disconnectedPlayers.delete(tok);
      }
    }

    // 4. Broadcast 20Hz Snapshot
    if (room.players.size > 0) {
      io.to(room.code).volatile.emit('roomSnapshot', {
        t: now,
        players: Array.from(room.players.values()).map(serializePlayer),
        cars: Array.from(room.cars.values()).map(serializeCar)
      });
    } else if (code !== 'lobby' && room.disconnectedPlayers.size === 0) {
      rooms.delete(code);
    }
  }
}, TICK_MS);

httpServer.listen(PORT, () => {
  console.log(`Giang Ho Dai Lo 3D server listening on port ${PORT} (${TICK_HZ} Hz)`);
});
