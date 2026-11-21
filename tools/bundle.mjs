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

function compactSource(code) {
  // Safe line-level compaction: removes full-line // comments, leading indentation, and blank lines
  return code
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('//'))
    .join('\n');
}

function wrapModuleFactory(fileName, factoryName) {
  const raw = readSrc(fileName);
  // Strip top-level ESM `import ... from ...;` and `export ` prefix cleanly while preserving everything inside an isolated IIFE scope
  const cleaned = compactSource(
    raw
      .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
      .replace(/^export\s+(function|const|let|var)\s+/gm, '$1 ')
  );
  return `// MODULE: src/${fileName}\n` +
    `const ${factoryName} = (() => {\n${cleaned}\nreturn ${factoryName};\n})();\n`;
}

const cssContent = readSrc('ui.css')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean)
  .join('\n');

const jsBundle = [
  wrapModuleFactory('engine.js', 'createEngine'),
  wrapModuleFactory('anticheat.js', 'createAntiCheatSystem'),
  wrapModuleFactory('world.js', 'buildWorld'),
  wrapModuleFactory('world_infra.js', 'createWorldInfra'),
  wrapModuleFactory('casino_world.js', 'createCasinoWorld'),
  wrapModuleFactory('map_downtown.js', 'createMapDowntown'),
  wrapModuleFactory('map_commercial.js', 'createMapCommercial'),
  wrapModuleFactory('map_coast_hills.js', 'createMapCoastHills'),
  wrapModuleFactory('characters.js', 'createCharacterSystem'),
  wrapModuleFactory('vehicles.js', 'createVehicleSystem'),
  wrapModuleFactory('vehicles_extra.js', 'createVehiclesExtra'),
  wrapModuleFactory('customs_shops.js', 'createCustomsShops'),
  wrapModuleFactory('gameplay.js', 'createGameplaySystem'),
  wrapModuleFactory('npc_life.js', 'createNpcLife'),
  wrapModuleFactory('casino_games.js', 'createCasinoGames'),
  wrapModuleFactory('nightlife_bar.js', 'createNightlifeBar'),
  wrapModuleFactory('heists_activities.js', 'createHeistsActivities'),
  wrapModuleFactory('race_arena.js', 'createRaceArenaSystem'),
  wrapModuleFactory('ui_audio.js', 'createUIAudioAndInput'),
  wrapModuleFactory('multiplayer.js', 'createMultiplayerSystem'),
  wrapModuleFactory('perf_core.js', 'createPerfCore'),
].join('\n');

const htmlDocument = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <link rel="icon" href="data:," />
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
        <button id="btn-open-phone" class="hud-icon-btn" type="button" title="Mở Truyền Âm Ngọc Giản [P / ↑]">📱 Ngọc Giản</button>
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

  <!-- Click-to-Resume Blur Overlay (Prevents accidental weapon fire when locking pointer!) -->
  <div id="pointer-lock-overlay" class="hidden" style="position:fixed;inset:0;z-index:850;background:rgba(6,10,16,0.46);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;cursor:pointer;">
    <div style="padding:20px 30px;border-radius:14px;background:rgba(12,16,24,0.88);border:1.5px solid rgba(240,195,90,0.55);box-shadow:0 18px 48px rgba(0,0,0,0.75);text-align:center;color:#f6f3eb;pointer-events:none;">
      <div style="font-size:18px;font-weight:800;color:#f0c35a;margin-bottom:6px;letter-spacing:0.4px;">🖱️ NHẤP CHUỘT ĐỂ TIẾP TỤC HÀNH TẨU</div>
      <div style="font-size:12.5px;color:#cbd5e1;">Khóa chuột để di chuyển &amp; xoay góc nhìn (không bị cướp cò bắn súng)</div>
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

    const safeInit = (label, fn) => {
      try {
        return fn();
      } catch (err) {
        console.warn('[Tu Tien Optional Subsystem Init: ' + label + ']', err);
        return null;
      }
    };

    // 2. Neo-Wuxia Metropolis + Full Tu Tien World Expansions (No Elevated Freeway)
    ctx.world = buildWorld(ctx, THREE);
    ctx.worldInfra = safeInit('worldInfra', () => {
      const api = createWorldInfra(ctx);
      if (api && typeof api.init === 'function') api.init(ctx);
      return api;
    });
    ctx.casinoWorld = safeInit('casinoWorld', () => {
      const api = createCasinoWorld(ctx);
      if (api && typeof api.init === 'function') api.init(ctx);
      return api;
    });
    ctx.mapDowntown = safeInit('mapDowntown', () => {
      const api = createMapDowntown(ctx);
      if (api && typeof api.init === 'function') api.init(ctx);
      return api;
    });
    ctx.mapCommercial = safeInit('mapCommercial', () => {
      const api = createMapCommercial(ctx);
      if (api && typeof api.init === 'function') api.init(ctx);
      return api;
    });
    ctx.mapCoastHills = safeInit('mapCoastHills', () => {
      const api = createMapCoastHills(ctx);
      if (api && typeof api.init === 'function') api.init(ctx);
      return api;
    });

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

    // 4B. Thần Câu Mô-tô, Du Thuyền Bích Ba, Cửu Thiên Thần Ưng, Thanh Long Siêu Xe, Huyền Vũ Thiết Giáp & Buồng Lái 1P
    ctx.vehiclesExtra = safeInit('vehiclesExtra', () => {
      const api = createVehiclesExtra(ctx);
      if (api && typeof api.init === 'function') api.init(ctx);
      return api;
    });

    // Capture pre-shops getGroundHeight so customs_shops's 2-arg wrapper never strips currentY from 3D callers
    if (ctx.world && typeof ctx.world.getGroundHeight === 'function') {
      ctx.world._preShopsGetGroundHeight = ctx.world.getGroundHeight.bind(ctx.world);
    }

    // 4C. Thiên Công Xưởng 3D, Binh Khí Các + Trường Bắn, Cẩm Y Các & Gara Cá Nhân 6 Chỗ
    ctx.shops = safeInit('customsShops', () => {
      const api = createCustomsShops(ctx);
      if (api && typeof api.init === 'function') api.init(ctx);
      return api;
    });

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

    // 7B. Chuyển Đổi 3 Hiệp Khách (F5/F6/F7), Y Tế/Cứu Hỏa, Bàn Chông Lục Phiến Môn & Cẩm Y Vệ SWAT
    ctx.npcLife = safeInit('npcLife', () => {
      const api = createNpcLife(ctx);
      if (api && typeof api.init === 'function') api.init(ctx);
      return api;
    });

    // 7C. Vạn Bảo Đổ Phường (10 Trò Chơi Đỏ Đen) & Túy Tiên Lâu
    ctx.casinoGames = safeInit('casinoGames', () => {
      const api = createCasinoGames(ctx);
      if (api && typeof api.init === 'function') api.init(ctx);
      return api;
    });
    ctx.nightlife = safeInit('nightlifeBar', () => {
      const api = createNightlifeBar(ctx);
      if (api && typeof api.init === 'function') api.init(ctx);
      return api;
    });

    // 7D. Đua Đêm Giang Hồ, Lệnh Truy Nã, Thương Hội Kỳ Trân & 40 Thành Tựu
    ctx.heists = safeInit('heistsActivities', () => {
      const api = createHeistsActivities(ctx);
      if (api && typeof api.init === 'function') api.init(ctx);
      return api;
    });
    ctx.heistsActivities = ctx.heists;

    // 8. Combat Death Race Arena (Trường Đua Tử Thần — 4 Combat Cars, 7 Racers, 2 Obstacle Maps, Betting)
    ctx.raceArena = createRaceArenaSystem(ctx, THREE);

    // 9. Lõi Tối Ưu FPS & Benchmark (F4 Studio Profiler, BVH Culler, Turbo Mode)
    ctx.perfCore = safeInit('perfCore', () => {
      const api = createPerfCore(ctx);
      if (api && typeof api.init === 'function') api.init(ctx);
      return api;
    });
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
  // Click-to-Resume Blur Overlay (Prevents accidental gunshot on focus/entry!)
  // --------------------------------------------------------------------------
  const pointerLockOverlay = document.getElementById('pointer-lock-overlay');
  let _resumeFireBlockUntil = 0;

  function syncPointerLockOverlay() {
    if (!pointerLockOverlay) return;
    const isTouch = Boolean(ctx.input?.isTouchDevice);
    const shouldShow =
      ctx.started &&
      !ctx.paused &&
      !ctx.activeModal &&
      !isTouch &&
      document.pointerLockElement !== canvas;
    pointerLockOverlay.classList.toggle('hidden', !shouldShow);
  }

  pointerLockOverlay?.addEventListener('mousedown', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    _resumeFireBlockUntil = performance.now() + 260;
    if (ctx.input) {
      ctx.input.fire = false;
      ctx.input.fireJustPressed = false;
      ctx.input.aim = false;
    }
    pointerLockOverlay.classList.add('hidden');
    try { canvas?.requestPointerLock?.(); } catch (_) {}
  }, { capture: true });

  document.addEventListener('pointerlockchange', syncPointerLockOverlay);
  window.addEventListener('blur', syncPointerLockOverlay);

  // --------------------------------------------------------------------------
  // Main Fault-Tolerant Animation Frame Loop
  // --------------------------------------------------------------------------
  const safeStep = (label, fn) => {
    try {
      fn();
    } catch (err) {
      console.error('[Giang Ho Subsystem Error: ' + label + ']', err);
    }
  };

  let lastTime = performance.now();
  let frameIdx = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    frameIdx = (frameIdx + 1) | 0;

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

    safeStep('perfCore.beginFrame', () => {
      if (ctx.perfCore && typeof ctx.perfCore.beginFrame === 'function') {
        ctx.perfCore.beginFrame(now, ctx);
      }
    });

    try {
      if (ctx.input && typeof ctx.input.update === 'function') {
        ctx.input.update(rawDt, ctx);
        // Suppress accidental click-to-resume gunshots & movement while blur overlay is active
        const overlayVisible = pointerLockOverlay && !pointerLockOverlay.classList.contains('hidden');
        if (overlayVisible || now < _resumeFireBlockUntil) {
          ctx.input.fire = false;
          ctx.input.fireJustPressed = false;
          ctx.input.aim = false;
          if (overlayVisible) {
            ctx.input.moveX = 0;
            ctx.input.moveZ = 0;
            ctx.input.camDeltaX = 0;
            ctx.input.camDeltaY = 0;
          }
        }
      }
      if ((frameIdx % 10) === 0) syncPointerLockOverlay();

      if (!ctx.paused) {
        ctx.elapsed += dt;
        ctx.antiCheat?.updateAntiCheat?.(rawDt);

        const inActiveRace = Boolean(ctx.raceArena && typeof ctx.raceArena.isActive === 'function' && ctx.raceArena.isActive());

        if (!inActiveRace && ctx.world && typeof ctx.world.updateWorld === 'function') {
          ctx.world.updateWorld(dt, ctx.elapsed, ctx);
        }
        if (!inActiveRace) {
          if ((frameIdx & 1) === 0 && ctx.worldInfra?.update) {
            safeStep('worldInfra', () => ctx.worldInfra.update(dt * 2, rawDt * 2, ctx));
          }
          if ((frameIdx % 4) === 0 && ctx.casinoWorld?.update) {
            safeStep('casinoWorld', () => ctx.casinoWorld.update(dt * 4, ctx.elapsed, ctx));
          }
          if ((frameIdx % 3) === 0 && ctx.mapDowntown?.update) {
            safeStep('mapDowntown', () => ctx.mapDowntown.update(dt * 3, ctx));
          }
          if ((frameIdx % 3) === 1 && ctx.mapCommercial?.update) {
            safeStep('mapCommercial', () => ctx.mapCommercial.update(dt * 3, ctx));
          }
          if ((frameIdx % 4) === 1 && ctx.mapCoastHills?.update) {
            safeStep('mapCoastHills', () => ctx.mapCoastHills.update(dt * 4, ctx));
          }
        }

        if (ctx.started) {
          if (inActiveRace) {
            ctx.raceArena.updateRace(dt, rawDt);
          } else {
            const px = ctx.player.x;
            const casinoActive = ctx.activeModal === 'casino' || (px >= 1100 && px <= 1300) || Boolean(ctx.casinoGames?.isOpen);
            if (casinoActive || (frameIdx % 12) === 0) {
              safeStep('casinoGames', () => {
                if (ctx.casinoGames && typeof ctx.casinoGames.update === 'function') {
                  ctx.casinoGames.update(casinoActive ? rawDt : rawDt * 12, ctx);
                }
              });
            }
            const barActive = ctx.activeModal === 'bar' || (px >= 1400 && px <= 1600) || Boolean(ctx.nightlife?.isOpen) || (ctx.nightlife?.drunkLevel || 0) > 1;
            if (barActive || (frameIdx % 12) === 6) {
              safeStep('nightlife', () => {
                if (ctx.nightlife && typeof ctx.nightlife.update === 'function') {
                  ctx.nightlife.update(barActive ? rawDt : rawDt * 12, ctx);
                }
              });
            }

            let shopsSteppedEarly = false;
            if (
              !ctx.player.inCar &&
              ctx.shops &&
              typeof ctx.shops.getInteractiveStationNear === 'function' &&
              ctx.shops.getInteractiveStationNear(ctx.player.x, ctx.player.z)
            ) {
              shopsSteppedEarly = true;
              safeStep('customsShops', () => {
                const prevX = ctx.player.x;
                const prevModal = ctx.activeModal;
                ctx.shops.update(dt, ctx);
                if ((ctx.activeModal !== prevModal || Math.abs(ctx.player.x - prevX) > 200) && ctx.input) {
                  ctx.input.interactJustPressed = false;
                }
              });
            }

            if (!ctx.player.inCar && !ctx.activeModal && ctx.characters && typeof ctx.characters.updatePlayerOnFoot === 'function') {
              ctx.characters.updatePlayerOnFoot(dt, ctx);
            }

            if (
              !ctx.activeModal &&
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

            if (!ctx.activeModal) {
              if (ctx.vehicles && typeof ctx.vehicles.updateVehicles === 'function') {
                ctx.vehicles.updateVehicles(dt, ctx);
              }
              safeStep('vehiclesExtra', () => {
                if (ctx.vehiclesExtra && typeof ctx.vehiclesExtra.update === 'function') {
                  ctx.vehiclesExtra.update(dt, ctx);
                }
              });
            }

            if (!shopsSteppedEarly && (ctx.activeModal || (frameIdx % 3) === 0)) {
              safeStep('customsShops', () => {
                if (ctx.shops && typeof ctx.shops.update === 'function') {
                  ctx.shops.update(ctx.activeModal ? dt : dt * 3, ctx);
                }
              });
            }

            if (ctx.characters && typeof ctx.characters.updateProjectilesAndFX === 'function') {
              ctx.characters.updateProjectilesAndFX(dt, ctx);
            }

            if (ctx.gameplay && typeof ctx.gameplay.updateGameplay === 'function') {
              ctx.gameplay.updateGameplay(dt, rawDt, ctx);
            }

            if ((frameIdx & 1) === 0) {
              safeStep('npcLife', () => {
                if (ctx.npcLife && typeof ctx.npcLife.update === 'function') {
                  ctx.npcLife.update(dt * 2, rawDt * 2, ctx);
                }
              });
            }

            if (ctx.activeModal || (frameIdx % 3) === 1) {
              safeStep('heists', () => {
                if (ctx.heists && typeof ctx.heists.update === 'function') {
                  ctx.heists.update(ctx.activeModal ? dt : dt * 3, ctx.activeModal ? rawDt : rawDt * 3, ctx);
                }
              });
            }

            // Auto-despawn destroyed/wrecked vehicles after 7s + Traffic anti-pileup & safe following spacing
            if (ctx.vehicles && Array.isArray(ctx.vehicles.list) && typeof ctx.vehicles.removeVehicle === 'function') {
              const vList = ctx.vehicles.list;
              const plCar = ctx.player.inCar;
              for (let vi = vList.length - 1; vi >= 0; vi--) {
                const v = vList[vi];
                if (!v || v === plCar || v.isMission || v.mpId) continue;
                if (v.destroyed || v.alive === false || (typeof v.hp === 'number' && v.hp <= 0)) {
                  v._wreckDespawnTimer = (v._wreckDespawnTimer || 0) + dt;
                  if (v._wreckDespawnTimer >= 7.0) {
                    ctx.vehicles.removeVehicle(v);
                  }
                  continue;
                } else if (v._wreckDespawnTimer) {
                  v._wreckDespawnTimer = 0;
                }

                // Prevent AI traffic cars from tailgating, piling up, or wedging into each other
                if (v.isTraffic && !v.isParked) {
                  const fwdX = Math.sin(v.yaw || 0);
                  const fwdZ = Math.cos(v.yaw || 0);
                  let blockedAhead = false;
                  let wedged = false;
                  for (let vj = 0; vj < vList.length; vj++) {
                    if (vi === vj) continue;
                    const o = vList[vj];
                    if (!o || o.isHeli || Math.abs((o.y || 0) - (v.y || 0)) > 2.0) continue;
                    const dx = o.x - v.x;
                    const dz = o.z - v.z;
                    const d2 = dx * dx + dz * dz;
                    if (d2 < 3.4 * 3.4) {
                      wedged = true;
                      break;
                    }
                    if (d2 < 8.5 * 8.5) {
                      const dot = dx * fwdX + dz * fwdZ;
                      const side = Math.abs(dx * fwdZ - dz * fwdX);
                      if (dot > 1.5 && side < 2.2) {
                        blockedAhead = true;
                      }
                    }
                  }
                  if (blockedAhead) {
                    v.vx *= 0.72;
                    v.vz *= 0.72;
                    if (typeof v.speed === 'number') v.speed *= 0.72;
                  }
                  if (wedged) {
                    v._jamTimer = (v._jamTimer || 0) + dt;
                    if (v._jamTimer >= 3.0) {
                      ctx.vehicles.removeVehicle(v);
                    }
                  } else {
                    v._jamTimer = 0;
                  }
                }
              }
            }

            // Lightweight distance visibility culling + Anti-Stutter High-Speed Driving guard every 15 frames
            if ((frameIdx % 15) === 0) {
              const plx = ctx.player.x;
              const plz = ctx.player.z;
              const plCar = ctx.player.inCar;
              const drivingFast = Boolean(plCar && Math.hypot(plCar.vx || 0, plCar.vz || 0) > 14);
              const inRemoteInt = plx >= 500;
              // Only hide outdoor districts when player is inside a remote interior (prevents pop-in stutter while driving fast!)
              if (ctx.mapDowntown?.root) ctx.mapDowntown.root.visible = !inRemoteInt;
              if (ctx.mapCommercial?.root) ctx.mapCommercial.root.visible = !inRemoteInt;
              if (ctx.mapCoastHills?.root) ctx.mapCoastHills.root.visible = !inRemoteInt;
              if (ctx.worldInfra?.root) ctx.worldInfra.root.visible = !inRemoteInt || (plx >= 1950 && plx <= 2250);
              if (ctx.vehicles && Array.isArray(ctx.vehicles.list)) {
                const vList = ctx.vehicles.list;
                for (let vi = 0; vi < vList.length; vi++) {
                  const v = vList[vi];
                  if (!v || !v.mesh || v === plCar || v.isMission) continue;
                  const dx = v.x - plx;
                  const dz = v.z - plz;
                  const d2 = dx * dx + dz * dz;
                  const vehCullDist = ctx.engine?.isMobile ? 70 : 105;
                  v.mesh.visible = d2 < vehCullDist * vehCullDist;
                }
              }
              if (ctx.gameplay && Array.isArray(ctx.gameplay.peds)) {
                const pList = ctx.gameplay.peds;
                const AVES = [-120, -40, 40, 120, 200];
                const STRS = [-200, -120, -40, 40, 120, 200];
                let recycledThisTick = 0;
                for (let pi = 0; pi < pList.length; pi++) {
                  const ped = pList[pi];
                  const m = ped && (ped.mesh || ped.rig?.root);
                  if (!m || ped.isMission || ped.isDisciple) continue;
                  const dx = (ped.x ?? m.position.x) - plx;
                  const dz = (ped.z ?? m.position.z) - plz;
                  const d2 = dx * dx + dz * dz;
                  // Recycle at most 2 far-away city peds (> 115m) per tick when NOT driving fast (zero high-speed stutter!)
                  if (!drivingFast && recycledThisTick < 2 && d2 > 115 * 115 && ped.zone === 'city' && !ped.dead && ped.state !== 'fight' && plx < 500) {
                    const useAve = Math.random() < 0.55;
                    let sx = plx, sz = plz;
                    if (useAve) {
                      let bestAx = AVES[0], bestD = Infinity;
                      for (let k = 0; k < AVES.length; k++) {
                        const d = Math.abs(plx - AVES[k]);
                        if (d < bestD) { bestD = d; bestAx = AVES[k]; }
                      }
                      const side = Math.random() < 0.5 ? 1 : -1;
                      const off = bestAx === 40 ? 13.4 : 10.4;
                      sx = bestAx + side * off;
                      const dir = Math.random() < 0.5 ? 1 : -1;
                      sz = Math.max(-205, Math.min(205, plz + dir * (42 + Math.random() * 44)));
                    } else {
                      let bestSz = STRS[0], bestD = Infinity;
                      for (let k = 0; k < STRS.length; k++) {
                        const d = Math.abs(plz - STRS[k]);
                        if (d < bestD) { bestD = d; bestSz = STRS[k]; }
                      }
                      const side = Math.random() < 0.5 ? 1 : -1;
                      sz = bestSz + side * 10.4;
                      const dir = Math.random() < 0.5 ? 1 : -1;
                      sx = Math.max(-124, Math.min(205, plx + dir * (42 + Math.random() * 44)));
                    }
                    // Skip if another ped is already standing right there
                    let crowded = false;
                    for (let pj = 0; pj < pList.length; pj++) {
                      const op = pList[pj];
                      if (!op || op === ped || op.dead) continue;
                      if ((op.x - sx) * (op.x - sx) + (op.z - sz) * (op.z - sz) < 2.6 * 2.6) {
                        crowded = true;
                        break;
                      }
                    }
                    if (!crowded) {
                      ped.x = sx;
                      ped.z = sz;
                      ped.y = ctx.world?.getGroundHeight ? ctx.world.getGroundHeight(sx, sz, 0.22) : 0.22;
                      ped.navInit = false;
                      ped.state = 'walk';
                      m.position.set(ped.x, ped.y, ped.z);
                      m.visible = true;
                      recycledThisTick++;
                    } else {
                      m.visible = false;
                    }
                  } else {
                    const pedCullDist = ctx.engine?.isMobile ? 52 : 85;
                    m.visible = d2 < pedCullDist * pedCullDist;
                  }
                }
              }
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

      // Throttle perfCore.update to every 4th frame when profiler overlay & benchmark are inactive to avoid overhead
      if ((frameIdx & 3) === 0 || ctx.perfCore?.isProfilerOpen || ctx.perfCore?.isBenchmarkRunning) {
        safeStep('perfCore.update', () => {
          if (ctx.perfCore && typeof ctx.perfCore.update === 'function') {
            ctx.perfCore.update(rawDt, ctx);
          }
        });
      }

      if (ctx.engine && typeof ctx.engine.renderFrame === 'function') {
        ctx.engine.renderFrame(rawDt, ctx);
      }
    } catch (frameErr) {
      console.error('[Giang Ho Frame Error]', frameErr);
    } finally {
      safeStep('perfCore.endFrame', () => {
        if (ctx.perfCore && typeof ctx.perfCore.endFrame === 'function') {
          ctx.perfCore.endFrame(performance.now(), ctx);
        }
      });
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
