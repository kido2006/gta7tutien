/**
 * Bundler for GIANG HỒ ĐẠI LỘ & BỜ BIỂN 3D
 * Produces a 100% self-contained single-file HTML5 build at:
 *   - ../index.html (Standalone local Offline + Online client)
 *   - ../server/public/index.html (Hosted by Fly.io / Node.js multiplayer server)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const OUT_ROOT_HTML = path.join(ROOT_DIR, 'index.html');
const OUT_SERVER_PUBLIC_DIR = path.join(ROOT_DIR, 'server', 'public');
const OUT_SERVER_HTML = path.join(OUT_SERVER_PUBLIC_DIR, 'index.html');

function readSrc(fileName) {
  return fs.readFileSync(path.join(SRC_DIR, fileName), 'utf8');
}

function wrapModuleFactory(fileName, factoryName) {
  const raw = readSrc(fileName);
  // Strip ESM `export ` prefix cleanly while preserving everything inside an isolated IIFE scope
  const cleaned = raw.replace(/^export\s+(function|const|let|var)\s+/gm, '$1 ');
  return `// ============================================================================\n` +
    `// MODULE: src/${fileName}\n` +
    `// ============================================================================\n` +
    `const ${factoryName} = (() => {\n${cleaned}\n  return ${factoryName};\n})();\n`;
}

const cssContent = readSrc('ui.css');

const jsBundle = [
  wrapModuleFactory('engine.js', 'createEngine'),
  wrapModuleFactory('anticheat.js', 'createAntiCheatSystem'),
  wrapModuleFactory('world.js', 'buildWorld'),
  wrapModuleFactory('characters.js', 'createCharacterSystem'),
  wrapModuleFactory('vehicles.js', 'createVehicleSystem'),
  wrapModuleFactory('gameplay.js', 'createGameplaySystem'),
  wrapModuleFactory('race_arena.js', 'createRaceArenaSystem'),
  wrapModuleFactory('ui_audio.js', 'createUIAudioAndInput'),
  wrapModuleFactory('multiplayer.js', 'createMultiplayerSystem'),
].join('\n');

const htmlDocument = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>Giang Hồ Đại Lộ &amp; Bờ Biển 3D — Tân Kiếm Hiệp Thế Giới Mở (Offline &amp; Online)</title>
  <style>
${cssContent}
  </style>
  <script src="https://cdn.socket.io/4.7.5/socket.io.min.js" crossorigin="anonymous"></script>
  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
    }
  }
  </script>
</head>
<body>
  <!-- 3D WebGL Render Canvas -->
  <canvas id="game-canvas"></canvas>

  <!-- Damage Vignette & Nội Công Tâm Pháp Golden Ring Overlay -->
  <div id="damage-flash" class="damage-flash"></div>

  <!-- Main Neo-Wuxia Open-World HUD Layer -->
  <div id="hud-root" class="hud-root">
    <!-- Above-Minimap Toast Notification Feed -->
    <div id="notification-feed"></div>

    <!-- Top-Left Contextual Prompt & Multiplayer Truyền Âm Chat Feed -->
    <div id="interact-prompt" class="interact-prompt hidden"></div>
    <div id="mp-chat-feed"></div>

    <!-- Multiplayer Truyền Âm Input Modal ([T] Key) -->
    <div id="mp-chat-modal" class="hidden">
      <input id="mp-chat-input" type="text" maxlength="140" placeholder="Nhập lời truyền âm giang hồ..." autocomplete="off" />
      <button id="mp-chat-send" type="button">GỬI</button>
    </div>

    <!-- Top-Right Online Room Badge, Wanted Stars, Cash, Weapon & Quick Bar -->
    <div id="top-right-hud" class="top-right-hud">
      <div id="mp-room-badge" class="hidden">🌐 PHÒNG: LOBBY • 1/12 HIỆP KHÁCH</div>
      <div id="wanted-stars" class="wanted-stars calm" aria-label="Mức truy nã Lục Phiến Môn">
        <span class="star" data-star="1">★</span>
        <span class="star" data-star="2">★</span>
        <span class="star" data-star="3">★</span>
        <span class="star" data-star="4">★</span>
        <span class="star" data-star="5">★</span>
      </div>
      <div id="cash-display" class="cash-display"><span class="cash-prefix">$</span>7,860</div>
      <div id="cash-delta" class="cash-delta"></div>
      <button id="weapon-hud" class="weapon-hud" type="button" aria-label="Chọn binh khí" aria-controls="weapon-wheel" aria-expanded="false" title="Chọn binh khí [Tab]">
        <span id="weapon-hud-svg" class="weapon-hud-svg"></span>
        <span id="weapon-name" class="weapon-name">Thanh Phong Kiếm (Kiếm Khí)</span>
        <span id="weapon-ammo" class="weapon-ammo">∞</span>
      </button>
      <div id="hud-quick-bar" class="hud-quick-bar">
        <button id="btn-open-chat" class="hud-icon-btn" type="button" title="Truyền Âm Giang Hồ [T]">💬 Truyền Âm</button>
        <button id="btn-open-phone" class="hud-icon-btn" type="button" title="Mở Linh Thông Ngọc Giản [P / ↑]">📱 Ngọc Giản</button>
        <button id="btn-open-pause" class="hud-icon-btn" type="button" title="Tạm dừng [Esc]">⏸ Menu</button>
      </div>
    </div>

    <!-- Top-Center Mission Timer & Objective Ticker -->
    <div id="mission-timer-box" class="mission-timer-box hidden">
      <span id="mission-timer-label">KỲ ÁN</span>
      <span id="mission-timer-val">02:00</span>
    </div>

    <!-- Center Dynamic Crosshair & Hitmarker -->
    <div id="crosshair" class="crosshair">
      <span class="ch-dot"></span>
      <span class="ch-line ch-top"></span>
      <span class="ch-line ch-right"></span>
      <span class="ch-line ch-bottom"></span>
      <span class="ch-line ch-left"></span>
      <span id="hitmarker" class="hitmarker">×</span>
    </div>

    <!-- Bottom-Left Rectangular 3D-Tilted GPS Radar Minimap + 3 Segmented Bars -->
    <div id="minimap-container" class="minimap-container">
      <div id="minimap-tilt-wrap" class="minimap-tilt-wrap">
        <canvas id="minimap-canvas" width="260" height="186"></canvas>
        <div id="minimap-north" class="minimap-north">B</div>
        <div id="minimap-gps-badge" class="hidden"></div>
      </div>
      <div id="minimap-bars" class="minimap-bars">
        <div class="stat-bar health-bar-track"><div id="health-bar-fill" class="stat-bar-fill health-fill" style="width:100%"></div></div>
        <div class="stat-bar armor-bar-track"><div id="armor-bar-fill" class="stat-bar-fill armor-fill" style="width:50%"></div></div>
        <div class="stat-bar special-bar-track"><div id="special-bar-fill" class="stat-bar-fill special-fill" style="width:100%"></div></div>
      </div>
    </div>

    <!-- Bottom-Center Subtitle & Mission Objective Bar -->
    <div id="subtitle-bar" class="subtitle-bar hidden"></div>

    <!-- Bottom-Right Calligraphic Street / Zone & Vehicle Callout -->
    <div id="location-hud" class="location-hud">
      <div id="speedometer-pill" class="hidden"><span id="speed-num" class="spd-num">0</span><span class="spd-unit">KM/H</span><span id="speed-gear" class="spd-gear">D1</span></div>
      <div id="vehicle-callout" class="vehicle-callout"></div>
      <div id="street-name" class="street-name">Đại Lộ Chu Tước</div>
      <div id="zone-name" class="zone-name">Kinh Thành • Bờ Biển Bồng Lai</div>
    </div>

    <!-- Full-Width Wuxia Ink Band Banner -->
    <div id="gta-banner" class="gta-banner hidden">
      <div class="gta-banner-band">
        <div id="gta-banner-title" class="gta-banner-title">KỲ ÁN ĐẠI THÀNH</div>
        <div id="gta-banner-sub" class="gta-banner-sub"></div>
      </div>
    </div>

    <!-- 7-Slot Bát Quái Radial Weapon Wheel (Hold Tab) -->
    <div id="weapon-wheel" class="weapon-wheel hidden">
      <div id="weapon-wheel-ring" class="weapon-wheel-ring">
        <div id="weapon-wheel-center" class="weapon-wheel-center">
          <div id="wheel-selected-name" class="wheel-selected-name">Thanh Phong Kiếm</div>
          <div id="wheel-selected-ammo" class="wheel-selected-ammo">Nội Lực: ∞</div>
          <div class="wheel-stat-bars">
            <div class="wheel-stat-line"><span>UY LỰC</span><div class="wheel-stat-track"><div id="wheel-stat-dmg" class="wheel-stat-val" style="width:76%"></div></div></div>
            <div class="wheel-stat-line"><span>TỐC ĐỘ</span><div class="wheel-stat-track"><div id="wheel-stat-rate" class="wheel-stat-val" style="width:54%"></div></div></div>
            <div class="wheel-stat-line"><span>TẦM ĐÁNH</span><div class="wheel-stat-track"><div id="wheel-stat-rng" class="wheel-stat-val" style="width:64%"></div></div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Slide-Up Linh Thông Ngọc Giản (Smartphone) -->
    <div id="ifruit-phone" class="ifruit-phone hidden">
      <div class="phone-notch">
        <span id="phone-carrier">Linh Thông • Thiên Cơ Các</span>
        <span id="phone-clock">14:30</span>
      </div>
      <div id="phone-screen" class="phone-screen">
        <div id="phone-header" class="phone-header">Linh Thông Ngọc Giản</div>
        <div id="phone-body" class="phone-body"></div>
      </div>
      <div class="phone-home-bar">
        <button id="phone-back-btn" type="button" class="phone-nav-btn">◀ Trang Chủ</button>
        <button id="phone-close-btn" type="button" class="phone-nav-btn">● Đóng</button>
      </div>
    </div>

    <!-- Mobile Multi-Touch Virtual Controls -->
    <div id="touch-controls" class="touch-controls hidden">
      <div id="joystick-zone" class="joystick-zone">
        <div id="joystick-base" class="joystick-base">
          <div id="joystick-knob" class="joystick-knob"></div>
        </div>
      </div>
      <div id="touch-look-zone" class="touch-look-zone"></div>
      <div id="touch-actions" class="touch-actions">
        <div id="cluster-onfoot" class="cluster-group">
          <button type="button" class="touch-btn tbtn-fire" data-act="fire">XUẤT CHIÊU</button>
          <button type="button" class="touch-btn tbtn-aim" data-act="aim">NGẮM</button>
          <button type="button" class="touch-btn tbtn-jump" data-act="jump">KHINH CÔNG</button>
          <button type="button" id="tbtn-context-interact" class="touch-btn tbtn-interact" data-act="interact">LÊN XE</button>
          <button type="button" class="touch-btn tbtn-special" data-act="special">TÂM PHÁP</button>
        </div>
        <div id="cluster-driving" class="cluster-group hidden">
          <button type="button" class="touch-btn tbtn-gas" data-act="gas">GA</button>
          <button type="button" class="touch-btn tbtn-brake" data-act="brake">PHANH</button>
          <button type="button" id="tbtn-drift-label" class="touch-btn tbtn-drift" data-act="drift">DRIFT</button>
          <button type="button" class="touch-btn tbtn-exit" data-act="interact">XUỐNG</button>
          <button type="button" class="touch-btn tbtn-horn" data-act="horn">CÒI</button>
          <button type="button" class="touch-btn tbtn-driveby" data-act="fire">BẮN XE</button>
          <button type="button" class="touch-btn tbtn-rear" data-act="lookBehind">NHÌN SAU</button>
        </div>
        <div id="cluster-rappel" class="cluster-group hidden">
          <button type="button" class="touch-btn tbtn-rup" data-act="rappelUp">LÊN DÂY</button>
          <button type="button" class="touch-btn tbtn-rdown" data-act="rappelDown">XUỐNG DÂY</button>
          <button type="button" class="touch-btn tbtn-fire" data-act="fire">BẮN</button>
          <button type="button" class="touch-btn tbtn-aim" data-act="aim">NGẮM</button>
          <button type="button" class="touch-btn tbtn-special" data-act="special">TÂM PHÁP</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Pause Menu Overlay -->
  <div id="pause-menu" class="pause-menu hidden">
    <div class="pause-card">
      <div class="pause-header">
        <h2>TẠM DỪNG — GIANG HỒ ĐẠI LỘ 3D</h2>
        <p>Đồ Họa Tân Kiếm Hiệp PBR • Kiếm Khí &amp; Khinh Công • Thế Giới Mở Offline &amp; Online</p>
      </div>
      <div class="pause-actions">
        <button id="btn-resume-game" type="button" class="gta-btn primary">TIẾP TỤC HÀNH TẨU</button>
        <button id="btn-save-game" type="button" class="gta-btn">LƯU HÀNH TRANG</button>
        <button id="btn-cycle-quality" type="button" class="gta-btn">ĐỒ HỌA: CAO (HIGH)</button>
        <button id="btn-cycle-weather" type="button" class="gta-btn">THIÊN THỜI: NẮNG ĐẸP HOA ĐÀO</button>
        <button id="btn-toggle-touch" type="button" class="gta-btn">ĐIỀU KHIỂN CẢM ỨNG: TỰ ĐỘNG</button>
        <button id="btn-fullscreen" type="button" class="gta-btn hidden">TOÀN MÀN HÌNH</button>
        <p id="fullscreen-status" role="status"></p>
      </div>
      <div class="pause-controls-guide keyboard-guide">
        <div><strong>Di chuyển / Lái xe:</strong> WASD / Mũi tên • <strong>Chạy nhanh:</strong> Shift • <strong>Khinh Công Đạp Không (Nhảy 2–3 bước &amp; Lướt):</strong> Space</div>
        <div><strong>Kiếm Khí / Bắn / Ngắm:</strong> Chuột Trái / Chuột Phải • <strong>Bát Quái Binh Khí:</strong> Giữ Tab (hoặc phím 1–7)</div>
        <div><strong>Lên / Xuống Chiến Xa &amp; Phi Chu:</strong> F / E • <strong>Nội Công Tâm Pháp:</strong> V / CapsLock • <strong>Ngọc Giản:</strong> P / ↑</div>
        <div><strong>Truyền Âm Online:</strong> T • <strong>Còi / Còi Hụ:</strong> H • <strong>Nhìn Sau:</strong> Q • <strong>Đổi Góc Cam:</strong> C</div>
      </div>
      <p class="pause-controls-guide mobile-guide">Kéo cần bên trái để di chuyển, vuốt bên phải để nhìn. Chạm Ngọc Giản để mở ứng dụng, hoặc chạm tên binh khí để đổi vũ khí.</p>
    </div>
  </div>

  <!-- Neo-Wuxia Cover-Art Splash Screen + Offline / Online Mode Selector -->
  <div id="splash-screen" class="splash-screen">
    <div class="splash-collage" aria-hidden="true">
      <div class="collage-tile tile-boulevard"></div>
      <div class="collage-tile tile-pier"></div>
      <div class="collage-tile tile-heist"></div>
      <div class="collage-tile tile-vinewood"></div>
    </div>
    <div class="splash-overlay">
      <div class="splash-badge">TÂN KIẾM HIỆP THẾ GIỚI MỞ 3D • THREE.JS R160 PBR • CO-OP &amp; PVP</div>
      <h1 class="splash-title">GIANG HỒ: ĐẠI LỘ &amp; BỜ BIỂN 3D</h1>
      <p class="splash-subtitle">Đại Lộ Chu Tước • Hoa Đào Bồng Lai • Thanh Phong Kiếm Khí • Khinh Công Đạp Không • Đỉnh VÕ LÂM</p>

      <div class="splash-mode-tabs">
        <button id="tab-mode-single" type="button" class="splash-mode-tab active">⚔️ HÀNH TẨU ĐƠN ĐỘC (OFFLINE)</button>
        <button id="tab-mode-online" type="button" class="splash-mode-tab">🌐 GIANG HỒ ĐỒNG ĐẠO (ONLINE 12 NGƯỜI)</button>
      </div>

      <!-- Single-Player CTA Panel -->
      <div id="panel-mode-single" class="splash-cta-group">
        <button id="btn-start-game" type="button" class="splash-btn primary">BƯỚC VÀO GIANG HỒ</button>
        <button id="btn-continue-game" type="button" class="splash-btn secondary hidden">TIẾP TỤC HÀNH TRÌNH</button>
        <button id="btn-new-game" type="button" class="splash-btn ghost hidden">KHỞI ĐẦU MỚI</button>
      </div>

      <!-- Online Multiplayer Room Panel -->
      <div id="panel-mode-online" class="splash-online-box hidden">
        <div class="splash-field-row">
          <div class="splash-field">
            <label for="mp-name-input">DANH HIỆU HIỆP KHÁCH</label>
            <input id="mp-name-input" type="text" maxlength="18" placeholder="VD: Độc Cô Cầu Bại" value="Hiệp Khách" autocomplete="off" />
          </div>
          <div class="splash-field">
            <label for="mp-room-input">MÃ PHÒNG (TRỐNG = SẢNH CHUNG)</label>
            <input id="mp-room-input" type="text" maxlength="16" placeholder="lobby" autocomplete="off" />
          </div>
        </div>
        <div id="mp-connect-status">Sẵn sàng kết nối máy chủ Singapore tốc độ cao (12 người/phòng)</div>
        <button id="btn-join-online" type="button" class="splash-btn jade">🌐 VÀO GIANG HỒ ONLINE NGAY</button>
      </div>

      <p class="mobile-rotate-hint">Xoay ngang điện thoại để có góc nhìn và điều khiển rộng hơn.</p>
      <div class="splash-footer-tips keyboard-guide">
        <span><strong>Chuột Trái</strong> Phóng Kiếm Khí</span>
        <span><strong>Space ×2</strong> Khinh Công Lướt Mái Đao</span>
        <span><strong>F / E</strong> Cưỡi Bạch Long Chiến Xa</span>
        <span><strong>Tab / 1–7</strong> Bát Quái Binh Khí</span>
        <span><strong>P / ↑</strong> Ngọc Giản Kỳ Án</span>
        <span><strong>V</strong> Nội Công Tâm Pháp</span>
        <span><strong>T</strong> Truyền Âm Online</span>
      </div>
    </div>
  </div>

  <!-- WebGL Error / Fallback Card -->
  <div id="webgl-fallback" role="alert">
    <div class="webgl-fallback-card">
      <h2>KHÔNG THỂ KHỞI TẠO ĐỒ HỌA WEBGL 3D</h2>
      <p id="webgl-fallback-msg">Trình duyệt hoặc thiết bị của bạn hiện đang tắt tăng tốc phần cứng WebGL. Vui lòng bật Hardware Acceleration trong cài đặt trình duyệt và tải lại trang.</p>
    </div>
  </div>

  <script type="module">
// === Unified Three.js r160 ES Module Imports ===
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

${jsBundle}

// ============================================================================
// MAIN GAME BOOTSTRAP & FAULT-TOLERANT LOOP
// ============================================================================
function bootstrap() {
  const canvas = document.getElementById('game-canvas');
  const fallbackEl = document.getElementById('webgl-fallback');
  const fallbackMsg = document.getElementById('webgl-fallback-msg');

  try {
    const testCanvas = document.createElement('canvas');
    const gl =
      testCanvas.getContext('webgl2') ||
      testCanvas.getContext('webgl') ||
      testCanvas.getContext('experimental-webgl');
    if (!gl) {
      if (fallbackEl) fallbackEl.classList.add('visible');
      return;
    }
  } catch (err) {
    if (fallbackMsg) fallbackMsg.textContent = String(err && err.message ? err.message : err);
    if (fallbackEl) fallbackEl.classList.add('visible');
    return;
  }

  const initialClips = {
    pistol: 16,
    smg: 30,
    carbine: 30,
    shotgun: 8,
    grenade: 6,
  };

  const ctx = {
    canvas,
    started: false,
    paused: false,
    timeScale: 1.0,
    elapsed: 0,
    dt: 0.016,
    rawDt: 0.016,
    engine: null,
    world: null,
    characters: null,
    vehicles: null,
    gameplay: null,
    ui: null,
    audio: null,
    input: null,
    mp: null,
    player: {
      name: 'Hiệp Khách',
      x: 26.0,
      y: 0.22,
      z: 28.0,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 2.45, // Faces North-East toward Bạch Long Chiến Xa (34.5, 0.05, 18.0), Paifang Gate & VÕ LÂM Hills
      hp: 100,
      maxHp: 100,
      armor: 50,
      maxArmor: 100,
      special: 100,
      maxSpecial: 100,
      specialActive: false,
      stamina: 100,
      sprintStamina: 100,
      maxStamina: 100,
      cash: 7860,
      money: 7860,
      outfit: 'casual_polo',
      weaponId: 'bat',
      weapon: 'bat',
      currentWeapon: 'bat',
      activeWeapon: 'bat',
      equippedWeapon: 'bat',
      weaponIdx: 1,
      unlockedWeapons: {
        unarmed: true,
        bat: true,
        pistol: true,
        smg: true,
        carbine: true,
        shotgun: true,
        grenade: true,
      },
      ammo: {
        unarmed: Infinity,
        bat: Infinity,
        pistol: 120,
        smg: 240,
        carbine: 180,
        shotgun: 48,
        grenade: 12,
      },
      clip: initialClips,
      clipAmmo: initialClips,
      inCar: null,
      vehicle: null,
      isGrounded: true,
      isAiming: false,
      isFiring: false,
      isSprinting: false,
      inSafehouse: false,
      isDead: false,
      isBusted: false,
      mpControlledDeath: false,
      autoAim: true,
      rappelState: {
        active: false,
        towerX: 160,
        towerZ: -40,
        wallZ: -15.2,
        cableY: 77,
        minY: 2.0,
        maxY: 78,
      },
      mesh: null,
      rig: null,
    },
  };

  // 0. Giang Hồ Guard Anti-Cheat & Console Honeypot (NEVER expose ctx globally!)
  ctx.antiCheat = createAntiCheatSystem(ctx);

  try {
    // 1. Neo-Wuxia Renderer, Post-Processing (CinematicWuxiaPass + Bloom), Procedural HDRI, Petals & Rain
    ctx.engine = createEngine(canvas, ctx, THREE, {
      EffectComposer,
      RenderPass,
      UnrealBloomPass,
      ShaderPass,
      OutputPass,
    });
    ctx.engine.camYaw = -0.58;
    ctx.engine.camPitch = -0.10;

    // 2. Neo-Wuxia Metropolis: Pagoda Roofs, Paifang Gates, Cherry Blossoms, Quan Sơn Đình & VÕ LÂM Hills
    ctx.world = buildWorld(ctx, THREE);

    // 3. 14-Joint Martial Humanoid Rig, Thanh Phong Kiếm + Kiếm Khí, Khinh Công & Ballistics
    ctx.characters = createCharacterSystem(ctx, THREE);
    if (!ctx.player.rig && typeof ctx.characters.createHumanoid === 'function') {
      const playerRig = ctx.characters.createHumanoid('casual_polo');
      ctx.player.rig = playerRig;
      ctx.player.mesh = playerRig.root || playerRig.mesh || playerRig;
      if (ctx.player.mesh && !ctx.player.mesh.parent && ctx.engine && ctx.engine.scene) {
        ctx.engine.scene.add(ctx.player.mesh);
      }
      if (typeof ctx.characters.equipWeapon === 'function') {
        ctx.characters.equipWeapon(playerRig, 'bat');
      }
    }
    if (ctx.world && typeof ctx.world.getGroundHeight === 'function') {
      ctx.player.y = ctx.world.getGroundHeight(ctx.player.x, ctx.player.z);
    }
    if (ctx.player.mesh) {
      ctx.player.mesh.position.set(ctx.player.x, ctx.player.y, ctx.player.z);
      ctx.player.mesh.rotation.y = ctx.player.yaw;
    }

    // 4. Sculpted Clearcoat PBR Vehicles & Thiên Ưng Phi Chu Helicopter
    ctx.vehicles = createVehicleSystem(ctx, THREE);

    // 5. Neo-Wuxia HUD, 3D-Tilted Minimap, Bát Quái Wheel, Ngọc Giản, MP Chat & Web Audio
    ctx.ui = createUIAudioAndInput(ctx);
    if (ctx.ui) {
      if (ctx.ui.audio && !ctx.audio) ctx.audio = ctx.ui.audio;
      if (ctx.ui.input && !ctx.input) ctx.input = ctx.ui.input;
    }

    if (ctx.audio && typeof ctx.audio.playExplosion === 'function') {
      const rawPlayExplosion = ctx.audio.playExplosion.bind(ctx.audio);
      ctx.audio.playExplosion = (arg0 = 1.0, arg1) => {
        const power =
          typeof arg0 === 'number' && Number.isFinite(arg0) && arg1 === undefined && arg0 > 0 && arg0 <= 4
            ? arg0
            : typeof arg0 === 'number' && Number.isFinite(arg0) && arg0 > 0 && arg0 <= 3.5 && Math.abs(arg1 || 0) > 5
              ? arg0
              : 1.25;
        return rawPlayExplosion(power);
      };
    }

    // 6. Real-Time 12-Player Socket.IO Multiplayer Client
    ctx.mp = createMultiplayerSystem(ctx, THREE);

    // 7. Traffic, Pedestrians, Lục Phiến Môn 5-Star Pursuit, Nội Công Tâm Pháp & 3 Kỳ Án Missions
    ctx.gameplay = createGameplaySystem(ctx, THREE);

    // 8. Combat Death Race Arena (Trường Đua Tử Thần — 4 Combat Cars, 7 Racers, 2 Obstacle Maps, Betting)
    ctx.raceArena = createRaceArenaSystem(ctx, THREE);
  } catch (initErr) {
    console.error('[Giang Ho Bootstrap Error]', initErr);
    if (fallbackMsg) {
      fallbackMsg.textContent =
        'Lỗi khởi tạo hệ thống: ' + (initErr && initErr.message ? initErr.message : String(initErr));
    }
    if (fallbackEl) fallbackEl.classList.add('visible');
    return;
  }

  // --------------------------------------------------------------------------
  // Splash Screen Mode Tabs (Offline Single-Player vs Online 12-Player Room)
  // --------------------------------------------------------------------------
  const splashEl = document.getElementById('splash-screen');
  const tabSingle = document.getElementById('tab-mode-single');
  const tabOnline = document.getElementById('tab-mode-online');
  const panelSingle = document.getElementById('panel-mode-single');
  const panelOnline = document.getElementById('panel-mode-online');

  const btnStart = document.getElementById('btn-start-game');
  const btnContinue = document.getElementById('btn-continue-game');
  const btnNew = document.getElementById('btn-new-game');

  const mpNameInput = document.getElementById('mp-name-input');
  const mpRoomInput = document.getElementById('mp-room-input');
  const mpStatusEl = document.getElementById('mp-connect-status');
  const btnJoinOnline = document.getElementById('btn-join-online');

  try {
    const savedName = localStorage.getItem('gh_mp_name_v1');
    if (savedName && mpNameInput) mpNameInput.value = savedName;
    const urlRoom = new URLSearchParams(window.location.search).get('room');
    const savedRoom = localStorage.getItem('gh_mp_room_v1');
    if (mpRoomInput) mpRoomInput.value = urlRoom || savedRoom || '';
  } catch (_) {}

  function selectSplashTab(mode) {
    const isOnline = mode === 'online';
    tabSingle?.classList.toggle('active', !isOnline);
    tabOnline?.classList.toggle('active', isOnline);
    panelSingle?.classList.toggle('hidden', isOnline);
    panelOnline?.classList.toggle('hidden', !isOnline);
  }

  tabSingle?.addEventListener('click', () => selectSplashTab('single'));
  tabOnline?.addEventListener('click', () => selectSplashTab('online'));

  // Auto-select Online tab when opened from hosted Fly.io URL or ?room= invite link
  try {
    const hasRoomParam = new URLSearchParams(window.location.search).has('room');
    const isHostedServer = window.location.protocol === 'http:' || window.location.protocol === 'https:';
    if (hasRoomParam || isHostedServer) {
      selectSplashTab('online');
    }
  } catch (_) {}

  let hasSaveData = false;
  try {
    hasSaveData = Boolean(
      (ctx.gameplay && typeof ctx.gameplay.hasSave === 'function' && ctx.gameplay.hasSave()) ||
        localStorage.getItem('giangho_dailo_save_v1')
    );
  } catch (_) {}

  if (hasSaveData && btnContinue && btnNew) {
    btnContinue.classList.remove('hidden');
    btnNew.classList.remove('hidden');
  }

  const unlockAudio = () => {
    if (ctx.audio) {
      if (typeof ctx.audio.unlock === 'function') ctx.audio.unlock();
      else if (typeof ctx.audio.init === 'function') ctx.audio.init();
      else if (ctx.audio.ctx && typeof ctx.audio.ctx.resume === 'function') ctx.audio.ctx.resume();
    }
  };

  const hideSplashAndEnterWorld = () => {
    ctx.started = true;
    ctx.paused = false;
    if (splashEl) {
      splashEl.classList.add('hidden');
      splashEl.style.display = 'none';
    }
  };

  const startOfflineGame = (mode) => {
    unlockAudio();
    if (ctx.mp?.connected) {
      ctx.mp.disconnect(true);
    }
    if (mode === 'continue' && ctx.gameplay && typeof ctx.gameplay.loadGame === 'function') {
      try {
        ctx.gameplay.loadGame();
      } catch (e) {
        console.warn(e);
      }
    } else if (mode === 'new' && ctx.gameplay && typeof ctx.gameplay.resetSave === 'function') {
      try {
        ctx.gameplay.resetSave();
        ctx.player.yaw = 2.45;
        if (ctx.player.mesh) ctx.player.mesh.rotation.y = 2.45;
        if (ctx.engine) {
          ctx.engine.camYaw = -0.58;
          ctx.engine.camPitch = -0.10;
        }
      } catch (e) {
        console.warn(e);
      }
    }
    hideSplashAndEnterWorld();
    const welcome = ctx.input?.isTouchDevice
      ? 'Kéo cần trái để di chuyển, vuốt bên phải để nhìn. Chạm *Ngọc Giản* để xem kỳ án.'
      : 'Chào mừng đến *Đại Lộ Chu Tước*! Vung *Thanh Phong Kiếm* [Chuột Trái], đạp *Khinh Công* [Space] trên không, lên *Bạch Long Chiến Xa* [F] hoặc mở *Ngọc Giản* [P].';
    ctx.ui?.showSubtitle?.(welcome, 6.5);
  };

  const startOnlineGame = async () => {
    unlockAudio();
    if (!ctx.mp || ctx.mp.connecting) return;
    const name = mpNameInput ? mpNameInput.value.trim() || 'Hiệp Khách' : 'Hiệp Khách';
    const roomCode = mpRoomInput ? mpRoomInput.value.trim() : '';

    if (btnJoinOnline) {
      btnJoinOnline.disabled = true;
      btnJoinOnline.textContent = '⏳ ĐANG KẾT NỐI MÁY CHỦ...';
    }
    if (mpStatusEl) {
      mpStatusEl.style.color = '#ffe082';
      mpStatusEl.textContent = 'Đang kết nối máy chủ Giang Hồ Online...';
    }

    try {
      await ctx.mp.connect({ name, roomCode });
      hideSplashAndEnterWorld();
      const welcome = ctx.input?.isTouchDevice
        ? 'Đã vào *Giang Hồ Đồng Đạo*! Chạm *Ngọc Giản* để gọi tọa kỵ hoặc *Truyền Âm* để gửi tin.'
        : 'Đã bước vào *Giang Hồ Đồng Đạo*! Phóng *Kiếm Khí* [Chuột Trái], *Khinh Công* [Space ×2], gọi *Tọa Kỵ* [P] hoặc *Truyền Âm* [T].';
      ctx.ui?.showSubtitle?.(welcome, 6.5);
    } catch (err) {
      if (mpStatusEl) {
        mpStatusEl.style.color = '#ff6b7a';
        mpStatusEl.textContent = err && err.message ? err.message : 'Kết nối thất bại, vui lòng thử lại!';
      }
    } finally {
      if (btnJoinOnline) {
        btnJoinOnline.disabled = false;
        btnJoinOnline.textContent = '🌐 VÀO GIANG HỒ ONLINE NGAY';
      }
    }
  };

  btnStart?.addEventListener('click', () => startOfflineGame(hasSaveData ? 'continue' : 'start'));
  btnContinue?.addEventListener('click', () => startOfflineGame('continue'));
  btnNew?.addEventListener('click', () => startOfflineGame('new'));
  btnJoinOnline?.addEventListener('click', () => startOnlineGame());
  mpNameInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startOnlineGame();
  });
  mpRoomInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startOnlineGame();
  });

  // --------------------------------------------------------------------------
  // Main Fault-Tolerant Animation Frame Loop
  // --------------------------------------------------------------------------
  let lastTime = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);

    const rawDt = Math.min(1 / 25, Math.max(0.0005, (now - lastTime) / 1000));
    lastTime = now;

    if (!Number.isFinite(ctx.timeScale) || ctx.timeScale <= 0) {
      ctx.timeScale = 1.0;
    }
    if (ctx.mp?.connected && ctx.timeScale !== 1.0) {
      ctx.timeScale = 1.0;
    }
    const dt = rawDt * ctx.timeScale;
    ctx.rawDt = rawDt;
    ctx.dt = dt;

    try {
      if (ctx.input && typeof ctx.input.update === 'function') {
        ctx.input.update(rawDt, ctx);
      }

      if (!ctx.paused) {
        ctx.elapsed += dt;
        ctx.antiCheat?.updateAntiCheat?.(rawDt);

        const inActiveRace = Boolean(ctx.raceArena && typeof ctx.raceArena.isActive === 'function' && ctx.raceArena.isActive());

        if (!inActiveRace && ctx.world && typeof ctx.world.updateWorld === 'function') {
          ctx.world.updateWorld(dt, ctx.elapsed, ctx);
        }

        if (ctx.started) {
          if (inActiveRace) {
            ctx.raceArena.updateRace(dt, rawDt);
          } else {
            if (!ctx.player.inCar && ctx.characters && typeof ctx.characters.updatePlayerOnFoot === 'function') {
              ctx.characters.updatePlayerOnFoot(dt, ctx);
            }

            if (
              ctx.input &&
              ctx.input.interactJustPressed &&
              !ctx.player.inCar &&
              !ctx.player.rappelState?.active &&
              ctx.gameplay
            ) {
              if (
                !ctx.player.inSafehouse &&
                !(ctx.gameplay.mission?.active && ctx.gameplay.mission.id === 3 && ctx.gameplay.mission.stage === 3) &&
                Math.hypot(ctx.player.x - 24, ctx.player.z + 80) < 3.6 &&
                typeof ctx.gameplay.enterSafehouse === 'function'
              ) {
                ctx.gameplay.enterSafehouse();
              } else if (
                ctx.player.inSafehouse &&
                Math.hypot(ctx.player.x - 800, ctx.player.z - 805) < 3.6 &&
                typeof ctx.gameplay.exitSafehouse === 'function'
              ) {
                ctx.gameplay.exitSafehouse();
              }
            }

            if (ctx.vehicles && typeof ctx.vehicles.updateVehicles === 'function') {
              ctx.vehicles.updateVehicles(dt, ctx);
            }

            if (ctx.characters && typeof ctx.characters.updateProjectilesAndFX === 'function') {
              ctx.characters.updateProjectilesAndFX(dt, ctx);
            }

            if (ctx.gameplay && typeof ctx.gameplay.updateGameplay === 'function') {
              ctx.gameplay.updateGameplay(dt, rawDt, ctx);
            }

            if (ctx.raceArena && typeof ctx.raceArena.updateRace === 'function') {
              ctx.raceArena.updateRace(dt, rawDt);
            }

            if (ctx.mp && typeof ctx.mp.updateMultiplayer === 'function') {
              ctx.mp.updateMultiplayer(rawDt);
            }
          }
        }

        if (
          !inActiveRace &&
          (!Number.isFinite(ctx.player.x) ||
            !Number.isFinite(ctx.player.y) ||
            !Number.isFinite(ctx.player.z))
        ) {
          ctx.player.x = 26.0;
          ctx.player.z = 28.0;
          ctx.player.y =
            ctx.world && typeof ctx.world.getGroundHeight === 'function'
              ? ctx.world.getGroundHeight(26, 28)
              : 0.22;
          ctx.player.vx = 0;
          ctx.player.vy = 0;
          ctx.player.vz = 0;
        }

        if (ctx.engine) {
          if (typeof ctx.engine.updateEnvironment === 'function') {
            ctx.engine.updateEnvironment(rawDt, ctx);
          }
          if (!inActiveRace && typeof ctx.engine.updateCamera === 'function') {
            ctx.engine.updateCamera(rawDt, ctx);
          }
        }

        if (ctx.audio && typeof ctx.audio.update === 'function') {
          ctx.audio.update(rawDt, ctx);
        }
      }

      if (ctx.ui) {
        if (typeof ctx.ui.updateHUD === 'function') ctx.ui.updateHUD(rawDt, ctx);
        else if (typeof ctx.ui.update === 'function') ctx.ui.update(rawDt, ctx);
      }

      if (ctx.input && typeof ctx.input.endFrame === 'function') {
        ctx.input.endFrame();
      }

      if (ctx.engine && typeof ctx.engine.renderFrame === 'function') {
        ctx.engine.renderFrame(rawDt, ctx);
      }
    } catch (frameErr) {
      console.error('[Giang Ho Frame Error]', frameErr);
    }
  }

  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
  </script>
</body>
</html>
`;

fs.mkdirSync(OUT_SERVER_PUBLIC_DIR, { recursive: true });
fs.writeFileSync(OUT_ROOT_HTML, htmlDocument, 'utf8');
fs.writeFileSync(OUT_SERVER_HTML, htmlDocument, 'utf8');

const sizeKB = (Buffer.byteLength(htmlDocument, 'utf8') / 1024).toFixed(1);
console.log(`Bundled index.html (${sizeKB} KB) ->\n  1) ${OUT_ROOT_HTML}\n  2) ${OUT_SERVER_HTML}`);
