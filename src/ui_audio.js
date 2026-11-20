/**
 * GIANG HỒ ĐẠI LỘ & BỜ BIỂN 3D — Neo-Wuxia HUD, 3D-Tilted GPS Radar Minimap,
 * 7-Slot Bát Quái Weapon Wheel, Linh Thông Ngọc Giản, Dual Input, MP Chat & Web Audio Synth
 */

const WEAPON_WHEEL_SLOTS = [
  {
    id: 'unarmed',
    shortName: 'Quyền Pháp',
    fullName: 'Quyền Pháp Nội Gia',
    dmg: 32,
    rate: 58,
    range: 16,
    melee: true,
    svg: `<svg viewBox="0 0 64 36" fill="none"><circle cx="28" cy="18" r="11" stroke="currentColor" stroke-width="2.2" opacity="0.55"/><path d="M18 23c-2.5 0-4.5-2-4.5-4.5v-4c0-2 1.8-3.8 3.8-3.8h16c3 0 5.5 2 5.5 4.8v3c0 2.6-2.5 4.5-5.5 4.5H18z" fill="currentColor"/><path d="M41 12l9-3-3 5 6 4-8 1 2 5-6-4" stroke="#6bf5e8" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'bat',
    shortName: 'Thanh Phong',
    fullName: 'Thanh Phong Kiếm (Kiếm Khí)',
    dmg: 76,
    rate: 54,
    range: 64,
    melee: true,
    svg: `<svg viewBox="0 0 64 36" fill="none"><path d="M8 28l10-5m2-1l35-17.5L59 3l-2.5 4.5L21.5 25" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 18l7 9" stroke="#f0c35a" stroke-width="3" stroke-linecap="round"/><path d="M8 28c-2 2-1 5 2 5s4-1 6-2" stroke="#de283b" stroke-width="1.8" stroke-linecap="round"/><path d="M36 9q12-4 21 3" stroke="#6bf5e8" stroke-width="1.6" opacity="0.85"/></svg>`,
  },
  {
    id: 'pistol',
    shortName: 'Thủ Pháo',
    fullName: 'Linh Cơ Thủ Pháo',
    dmg: 46,
    rate: 62,
    range: 58,
    melee: false,
    svg: `<svg viewBox="0 0 64 36" fill="none"><path d="M12 11h34v7H27l-4 11h-8l3-11h-6v-7z" fill="currentColor"/><rect x="44" y="12" width="6" height="3" fill="currentColor"/></svg>`,
  },
  {
    id: 'smg',
    shortName: 'Liên Châu',
    fullName: 'Liên Châu Tiễn Cơ',
    dmg: 36,
    rate: 92,
    range: 48,
    melee: false,
    svg: `<svg viewBox="0 0 64 36" fill="none"><path d="M11 12h36v6h-9l-2 11h-6l1.5-11H23l-3 9h-6l2-9h-5v-6z" fill="currentColor"/><rect x="47" y="13.5" width="7" height="3" fill="currentColor"/></svg>`,
  },
  {
    id: 'carbine',
    shortName: 'Hỏa Long',
    fullName: 'Hỏa Long Trường Thương',
    dmg: 64,
    rate: 84,
    range: 86,
    melee: false,
    svg: `<svg viewBox="0 0 64 36" fill="none"><path d="M6 14h11l3-3h24v5h13v2.8H44v2.2h-7l2 9h-5.5l-2-9H23l-2.5 7H16l2-7H6v-7z" fill="currentColor"/><rect x="26" y="8" width="11" height="2.5" rx="1" fill="currentColor"/></svg>`,
  },
  {
    id: 'shotgun',
    shortName: 'Hổ Phách',
    fullName: 'Hổ Phách Thần Pháo',
    dmg: 88,
    rate: 30,
    range: 34,
    melee: false,
    svg: `<svg viewBox="0 0 64 36" fill="none"><path d="M6 16h13l4-3h34v3.2H26v2.8h22v2.5H23l-6 6H10l4-6H6v-5.5z" fill="currentColor"/></svg>`,
  },
  {
    id: 'grenade',
    shortName: 'Hỏa Lựu',
    fullName: 'Thần Công Hỏa Lựu',
    dmg: 100,
    rate: 22,
    range: 70,
    melee: false,
    svg: `<svg viewBox="0 0 64 36" fill="none"><path d="M8 15h14l3-4h24c2 0 3 1.5 3 3.5v3c0 2-1 3.5-3 3.5H27l-4 7h-7l3-7H8v-6z" fill="currentColor"/><circle cx="54" cy="16" r="3" fill="currentColor"/></svg>`,
  },
];

const VEHICLE_DISPLAY_NAMES = {
  obey9f: 'Bạch Long Chiến Xa — Siêu xe V10 mui trần',
  sedan_lux: 'Hắc Lân Kiệu — Xa giá hạng sang',
  banshee: 'Xích Hỏa Thần Mã — Chiến mã tốc độ',
  suv: 'Thiết Giáp Hộ Pháp — Thiết xa hộ vệ',
  taxi: 'Dịch Trạm Phi Xa — Xe dịch trạm kinh thành',
  police: 'Tuần Phòng Lục Phiến Môn — Thiết kỵ tuần bộ',
  swat_van: 'Thiết Xa Cẩm Y Vệ — Chiến xa bọc thép',
  heli: 'Thiên Ưng Phi Chu — Phi chu tuần thiên',
};

const WEATHER_PRESETS = [
  { id: 'BRIGHT_DAY', label: 'Nắng Đẹp Hoa Đào', desc: 'Trời xanh Bồng Lai, cánh hoa đào bay trong gió' },
  { id: 'SUNSET_GOLD', label: 'Hoàng Hôn Vàng', desc: 'Ráng chiều dát vàng trên Đại Lộ Chu Tước & Thiên Luân' },
  { id: 'OVERCAST_RAIN', label: 'Mưa Giang Nam', desc: 'Mưa bụi giang hồ, mặt đường đá xanh phản chiếu đèn lồng' },
  { id: 'NEON_NIGHT', label: 'Đêm Hoa Đăng', desc: 'Kinh thành rực rỡ đèn lồng đỏ, trăng sáng & sao trời' },
];

const QUALITY_PRESETS = [
  { id: 'ULTRA', label: 'Tuyệt Đỉnh (Ultra)', desc: 'Bóng đổ 2K, Bloom điện ảnh, tối đa đèn lồng & hoa đào' },
  { id: 'HIGH', label: 'Cao (High)', desc: 'Hậu kỳ Tân Kiếm Hiệp cân bằng sắc nét & mượt mà' },
  { id: 'MOBILE', label: 'Mượt Di Động (Mobile)', desc: 'Giảm độ phân giải khi cần, tắt bóng đổ và hiệu ứng hậu kỳ' },
];

const OUTFIT_PRESETS = [
  { id: 'casual_polo', label: 'Hiệp Khách Hồng Y', desc: 'Áo cổ phong giao lĩnh đỏ thẫm, đai ngọc bội & băng trán' },
  { id: 'tactical_heist', label: 'Dạ Hành Ám Ảnh Y (Đấu Lạp)', desc: 'Y phục dạ hành huyền thiết, nón Đấu Lạp & dây leo tháp' },
  { id: 'luxury_suit', label: 'Cẩm Y Công Tử Bào', desc: 'Trường bào cẩm vương viền kim tuyến & ngọc bội thượng hạng' },
];

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function escapeHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Format subtitles with highlighted gold/purple/red/green Neo-Wuxia keywords.
 */
function formatGTASubtitle(rawText) {
  if (!rawText) return '';
  let safe = escapeHTML(rawText);
  safe = safe.replace(/\[([^\]]+)\]/g, '<span class="hl-yellow">[$1]</span>');
  safe = safe.replace(/\*([^*]+)\*/g, '<span class="hl-yellow">$1</span>');

  const yellowTerms = [
    'Bạch Long Chiến Xa',
    'Xích Hỏa Thần Mã',
    'Hắc Lân Kiệu',
    'Thiên Ưng Phi Chu',
    'Thanh Phong Kiếm',
    'Kiếm Khí',
    'Khinh Công',
    'Đại Lộ Chu Tước',
    'Bến Cảng Bồng Lai',
    'Thiên Luân',
    'Tháp Thiên Cơ',
    'Quan Sơn Đình',
    'Tĩnh Tâm Biệt Viện',
    'Nội Công Tâm Pháp',
    'Obey 9F',
  ];
  for (const term of yellowTerms) {
    const rx = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    safe = safe.replace(rx, '<span class="hl-yellow">$1</span>');
  }

  const purpleTerms = ['Tụ Bảo Xa Các', 'Ngọc Giản', 'GPS', 'Showroom'];
  for (const term of purpleTerms) {
    const rx = new RegExp(`(${term})`, 'gi');
    safe = safe.replace(rx, '<span class="hl-purple">$1</span>');
  }

  const redTerms = ['Lục Phiến Môn', 'Cẩm Y Vệ', 'Hắc Phong Bang', 'mục tiêu', 'truy nã'];
  for (const term of redTerms) {
    const rx = new RegExp(`(${term})`, 'gi');
    safe = safe.replace(rx, '<span class="hl-red">$1</span>');
  }

  const greenTerms = ['Thái Y Viện', 'ngân lượng'];
  for (const term of greenTerms) {
    const rx = new RegExp(`(${term})`, 'gi');
    safe = safe.replace(rx, '<span class="hl-green">$1</span>');
  }
  return safe;
}

/**
 * Ensure all required HUD, Multiplayer Chat, Splash, Wheel, Ngọc Giản, Touch & Pause DOM nodes exist.
 */
function ensureDOM() {
  let hudRoot = document.getElementById('hud-root');
  if (!hudRoot) {
    hudRoot = document.createElement('div');
    hudRoot.id = 'hud-root';
    hudRoot.className = 'hud-root';
    document.body.appendChild(hudRoot);
  }

  let damageFlash = document.getElementById('damage-flash');
  if (!damageFlash) {
    damageFlash = document.createElement('div');
    damageFlash.id = 'damage-flash';
    damageFlash.className = 'damage-flash';
    document.body.appendChild(damageFlash);
  }

  let notifFeed = document.getElementById('notification-feed');
  if (!notifFeed) {
    notifFeed = document.createElement('div');
    notifFeed.id = 'notification-feed';
    hudRoot.appendChild(notifFeed);
  }

  let mpChatFeed = document.getElementById('mp-chat-feed');
  if (!mpChatFeed) {
    mpChatFeed = document.createElement('div');
    mpChatFeed.id = 'mp-chat-feed';
    hudRoot.appendChild(mpChatFeed);
  }

  let mpChatModal = document.getElementById('mp-chat-modal');
  if (!mpChatModal) {
    mpChatModal = document.createElement('div');
    mpChatModal.id = 'mp-chat-modal';
    mpChatModal.className = 'hidden';
    mpChatModal.innerHTML = `
      <input id="mp-chat-input" type="text" maxlength="140" placeholder="Nhập lời truyền âm giang hồ..." autocomplete="off" />
      <button id="mp-chat-send" type="button">GỬI</button>`;
    hudRoot.appendChild(mpChatModal);
  }

  let topRight = document.getElementById('top-right-hud');
  if (!topRight) {
    topRight = document.createElement('div');
    topRight.id = 'top-right-hud';
    topRight.className = 'top-right-hud';
    topRight.innerHTML = `
      <div id="mp-room-badge" class="hidden">ONLINE • LOBBY</div>
      <div id="wanted-stars" class="wanted-stars calm">
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
        <span id="weapon-name" class="weapon-name">Thanh Phong Kiếm</span>
        <span id="weapon-ammo" class="weapon-ammo">∞</span>
      </button>
      <div id="hud-quick-bar" class="hud-quick-bar">
        <button id="btn-open-chat" class="hud-icon-btn" type="button" title="Truyền Âm Giang Hồ [T]">💬 Truyền Âm</button>
        <button id="btn-open-phone" class="hud-icon-btn" type="button" title="Mở Linh Thông Ngọc Giản [P / ↑]">📱 Ngọc Giản</button>
        <button id="btn-open-pause" class="hud-icon-btn" type="button" title="Tạm dừng [Esc]">⏸ Menu</button>
      </div>`;
    hudRoot.appendChild(topRight);
  } else {
    if (!document.getElementById('mp-room-badge')) {
      const badge = document.createElement('div');
      badge.id = 'mp-room-badge';
      badge.className = 'hidden';
      badge.textContent = 'ONLINE • LOBBY';
      topRight.insertBefore(badge, topRight.firstChild);
    }
    const quickBar = document.getElementById('hud-quick-bar');
    if (quickBar && !document.getElementById('btn-open-chat')) {
      const chatBtn = document.createElement('button');
      chatBtn.id = 'btn-open-chat';
      chatBtn.className = 'hud-icon-btn';
      chatBtn.type = 'button';
      chatBtn.title = 'Truyền Âm Giang Hồ [T]';
      chatBtn.textContent = '💬 Truyền Âm';
      quickBar.insertBefore(chatBtn, quickBar.firstChild);
    }
  }

  const quickBar = document.getElementById('hud-quick-bar');
  if (quickBar && !document.getElementById('btn-cycle-camera')) {
    const cameraBtn = document.createElement('button');
    cameraBtn.id = 'btn-cycle-camera';
    cameraBtn.className = 'hud-icon-btn touch-shortcut';
    cameraBtn.type = 'button';
    cameraBtn.textContent = 'Góc nhìn';
    quickBar.insertBefore(cameraBtn, document.getElementById('btn-open-pause'));
  }
  if (!document.getElementById('invulnerability-status')) {
    const timer = document.createElement('div');
    timer.id = 'invulnerability-status';
    timer.className = 'hidden';
    timer.setAttribute('role', 'timer');
    topRight.appendChild(timer);
  }
  if (!document.getElementById('no-cooldown-status')) {
    const ncTimer = document.createElement('div');
    ncTimer.id = 'no-cooldown-status';
    ncTimer.className = 'hidden';
    ncTimer.setAttribute('role', 'timer');
    topRight.appendChild(ncTimer);
  }
  if (!document.getElementById('gojo-nuke-btn')) {
    const nukeBtn = document.createElement('button');
    nukeBtn.id = 'gojo-nuke-btn';
    nukeBtn.className = 'gojo-nuke-btn hidden';
    nukeBtn.type = 'button';
    nukeBtn.title = 'Kích hoạt Hư Thức: Tử nổ 1km [G]';
    nukeBtn.textContent = '🟣 HƯ THỨC: TỬ 1KM [G]';
    topRight.appendChild(nukeBtn);
  }
  if (!document.getElementById('tulen-skill-btn')) {
    const tulenBtn = document.createElement('button');
    tulenBtn.id = 'tulen-skill-btn';
    tulenBtn.className = 'tulen-skill-btn';
    tulenBtn.type = 'button';
    tulenBtn.title = 'Lôi Điểu (Tulen): Nổ bán kính 1km • 1 hit Phiến Quân • Kết liễu Boss (Hồi chiêu 10s) [R]';
    tulenBtn.textContent = '⚡ LÔI ĐIỂU 1KM [R]';
    topRight.appendChild(tulenBtn);
  }
  if (!document.getElementById('boss-hp-hud')) {
    const bossHud = document.createElement('div');
    bossHud.id = 'boss-hp-hud';
    bossHud.className = 'boss-hp-hud hidden';
    hudRoot.appendChild(bossHud);
  }
  if (!document.getElementById('legend-bribe-btn')) {
    const legBtn = document.createElement('button');
    legBtn.id = 'legend-bribe-btn';
    legBtn.className = 'legend-bribe-btn hidden';
    legBtn.type = 'button';
    legBtn.title = 'Kỹ năng Messi & Ronaldo: Mua Phiến Quân & Giảm Sao Truy Nã [K]';
    legBtn.textContent = '⚽ MUA PHIẾN QUÂN [K]';
    topRight.appendChild(legBtn);
  }
  if (!document.getElementById('tulen-target-bar')) {
    const tBar = document.createElement('div');
    tBar.id = 'tulen-target-bar';
    tBar.className = 'tulen-target-bar hidden';
    tBar.innerHTML = `
      <div class="tulen-target-info" id="tulen-target-info">⚡ ĐÃ KHÓA MỤC TIÊU</div>
      <div class="tulen-target-actions">
        <button type="button" class="tulen-act-btn fire" id="tulen-fire-btn">⚡ BẮN NGAY [R]</button>
        <button type="button" class="tulen-act-btn cycle" id="tulen-cycle-btn">🔄 Đổi Mục Tiêu [X]</button>
        <button type="button" class="tulen-act-btn cancel" id="tulen-cancel-btn">✕ Hủy</button>
      </div>`;
    hudRoot.appendChild(tBar);
  }

  const weaponHud = document.getElementById('weapon-hud');
  let weaponIconEl = document.getElementById('weapon-hud-svg');
  if (weaponHud && !weaponIconEl) {
    weaponIconEl = document.createElement('span');
    weaponIconEl.id = 'weapon-hud-svg';
    weaponIconEl.className = 'weapon-hud-svg';
    weaponIconEl.innerHTML = WEAPON_WHEEL_SLOTS[1].svg;
    weaponHud.insertBefore(weaponIconEl, weaponHud.firstChild);
  }

  let missionTimerBox = document.getElementById('mission-timer-box');
  if (!missionTimerBox) {
    missionTimerBox = document.createElement('div');
    missionTimerBox.id = 'mission-timer-box';
    missionTimerBox.className = 'mission-timer-box hidden';
    missionTimerBox.innerHTML = `<span id="mission-timer-label">KỲ ÁN</span><span id="mission-timer-val">02:00</span>`;
    hudRoot.appendChild(missionTimerBox);
  }

  let crosshair = document.getElementById('crosshair');
  if (!crosshair) {
    crosshair = document.createElement('div');
    crosshair.id = 'crosshair';
    crosshair.className = 'crosshair';
    crosshair.innerHTML = `
      <span class="ch-dot"></span>
      <span class="ch-line ch-top"></span>
      <span class="ch-line ch-right"></span>
      <span class="ch-line ch-bottom"></span>
      <span class="ch-line ch-left"></span>
      <span id="hitmarker" class="hitmarker">×</span>`;
    hudRoot.appendChild(crosshair);
  }

  let interactPrompt = document.getElementById('interact-prompt');
  if (!interactPrompt) {
    interactPrompt = document.createElement('div');
    interactPrompt.id = 'interact-prompt';
    interactPrompt.className = 'interact-prompt hidden';
    hudRoot.appendChild(interactPrompt);
  }

  let minimapContainer = document.getElementById('minimap-container');
  if (!minimapContainer) {
    minimapContainer = document.createElement('div');
    minimapContainer.id = 'minimap-container';
    minimapContainer.className = 'minimap-container';
    minimapContainer.innerHTML = `
      <div id="minimap-tilt-wrap" class="minimap-tilt-wrap">
        <canvas id="minimap-canvas" width="260" height="186"></canvas>
        <div id="minimap-north" class="minimap-north">B</div>
      </div>
      <div id="minimap-bars" class="minimap-bars">
        <div class="stat-bar health-bar-track"><div id="health-bar-fill" class="stat-bar-fill health-fill" style="width:100%"></div></div>
        <div class="stat-bar armor-bar-track"><div id="armor-bar-fill" class="stat-bar-fill armor-fill" style="width:50%"></div></div>
        <div class="stat-bar special-bar-track"><div id="special-bar-fill" class="stat-bar-fill special-fill" style="width:100%"></div></div>
      </div>`;
    hudRoot.appendChild(minimapContainer);
  }

  const tiltWrap = document.getElementById('minimap-tilt-wrap');
  let gpsBadge = document.getElementById('minimap-gps-badge');
  if (tiltWrap && !gpsBadge) {
    gpsBadge = document.createElement('div');
    gpsBadge.id = 'minimap-gps-badge';
    gpsBadge.className = 'hidden';
    tiltWrap.appendChild(gpsBadge);
  }

  let subtitleBar = document.getElementById('subtitle-bar');
  if (!subtitleBar) {
    subtitleBar = document.createElement('div');
    subtitleBar.id = 'subtitle-bar';
    subtitleBar.className = 'subtitle-bar hidden';
    hudRoot.appendChild(subtitleBar);
  }

  let locationHud = document.getElementById('location-hud');
  if (!locationHud) {
    locationHud = document.createElement('div');
    locationHud.id = 'location-hud';
    locationHud.className = 'location-hud';
    locationHud.innerHTML = `
      <div id="speedometer-pill" class="hidden"><span id="speed-num" class="spd-num">0</span><span class="spd-unit">KM/H</span><span id="speed-gear" class="spd-gear">D1</span></div>
      <div id="vehicle-callout" class="vehicle-callout"></div>
      <div id="street-name" class="street-name">Đại Lộ Chu Tước</div>
      <div id="zone-name" class="zone-name">Kinh Thành • Bờ Biển Bồng Lai</div>`;
    hudRoot.appendChild(locationHud);
  }

  let speedPill = document.getElementById('speedometer-pill');
  if (locationHud && !speedPill) {
    speedPill = document.createElement('div');
    speedPill.id = 'speedometer-pill';
    speedPill.className = 'hidden';
    speedPill.innerHTML = `<span id="speed-num" class="spd-num">0</span><span class="spd-unit">KM/H</span><span id="speed-gear" class="spd-gear">D1</span>`;
    locationHud.insertBefore(speedPill, locationHud.firstChild);
  }

  let gtaBanner = document.getElementById('gta-banner');
  if (!gtaBanner) {
    gtaBanner = document.createElement('div');
    gtaBanner.id = 'gta-banner';
    gtaBanner.className = 'gta-banner hidden';
    gtaBanner.innerHTML = `
      <div class="gta-banner-band">
        <div id="gta-banner-title" class="gta-banner-title">KỲ ÁN ĐẠI THÀNH</div>
        <div id="gta-banner-sub" class="gta-banner-sub"></div>
      </div>`;
    hudRoot.appendChild(gtaBanner);
  }

  let weaponWheel = document.getElementById('weapon-wheel');
  if (!weaponWheel) {
    weaponWheel = document.createElement('div');
    weaponWheel.id = 'weapon-wheel';
    weaponWheel.className = 'weapon-wheel hidden';
    weaponWheel.innerHTML = `
      <div id="weapon-wheel-ring" class="weapon-wheel-ring">
        <div id="weapon-wheel-center" class="weapon-wheel-center">
          <div id="wheel-selected-name" class="wheel-selected-name">Thanh Phong Kiếm</div>
          <div id="wheel-selected-ammo" class="wheel-selected-ammo">∞</div>
        </div>
      </div>`;
    hudRoot.appendChild(weaponWheel);
  }

  const wheelRing = document.getElementById('weapon-wheel-ring');
  const wheelCenter = document.getElementById('weapon-wheel-center');
  if (wheelCenter && !document.getElementById('wheel-stat-dmg')) {
    const statWrap = document.createElement('div');
    statWrap.className = 'wheel-stat-bars';
    statWrap.innerHTML = `
      <div class="wheel-stat-line"><span>UY LỰC</span><div class="wheel-stat-track"><div id="wheel-stat-dmg" class="wheel-stat-val" style="width:76%"></div></div></div>
      <div class="wheel-stat-line"><span>TỐC ĐỘ</span><div class="wheel-stat-track"><div id="wheel-stat-rate" class="wheel-stat-val" style="width:54%"></div></div></div>
      <div class="wheel-stat-line"><span>TẦM ĐÁNH</span><div class="wheel-stat-track"><div id="wheel-stat-rng" class="wheel-stat-val" style="width:64%"></div></div></div>`;
    wheelCenter.appendChild(statWrap);
  }

  if (wheelRing && !document.getElementById('weapon-wheel-svg')) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.id = 'weapon-wheel-svg';
    svg.setAttribute('viewBox', '-200 -200 400 400');

    const count = WEAPON_WHEEL_SLOTS.length;
    const step = (Math.PI * 2) / count;
    const gap = 0.035;
    const rInner = 82;
    const rOuter = 178;

    WEAPON_WHEEL_SLOTS.forEach((slot, idx) => {
      const startA = -Math.PI / 2 + idx * step - step / 2 + gap;
      const endA = -Math.PI / 2 + idx * step + step / 2 - gap;
      const midA = (startA + endA) * 0.5;

      const x1 = Math.cos(startA) * rOuter;
      const y1 = Math.sin(startA) * rOuter;
      const x2 = Math.cos(endA) * rOuter;
      const y2 = Math.sin(endA) * rOuter;
      const x3 = Math.cos(endA) * rInner;
      const y3 = Math.sin(endA) * rInner;
      const x4 = Math.cos(startA) * rInner;
      const y4 = Math.sin(startA) * rInner;

      const g = document.createElementNS(svgNS, 'g');
      g.setAttribute('class', 'wheel-slice');
      g.setAttribute('data-slot', String(idx));

      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('class', 'wheel-slice-bg');
      path.setAttribute(
        'd',
        `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${rOuter} ${rOuter} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${rInner} ${rInner} 0 0 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`
      );
      g.appendChild(path);

      const labelR = (rInner + rOuter) * 0.52;
      const lx = Math.cos(midA) * labelR;
      const ly = Math.sin(midA) * labelR;

      const fo = document.createElementNS(svgNS, 'foreignObject');
      fo.setAttribute('x', (lx - 46).toFixed(1));
      fo.setAttribute('y', (ly - 30).toFixed(1));
      fo.setAttribute('width', '92');
      fo.setAttribute('height', '60');
      fo.style.pointerEvents = 'none';
      fo.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#fff7e5;text-align:center;font-family:var(--font-ui);">
          <div style="width:38px;height:20px;color:#f0c35a;">${slot.svg}</div>
          <div style="font-size:9.5px;font-weight:800;line-height:1.1;margin-top:2px;text-shadow:0 1px 3px #000;">${slot.shortName}</div>
          <div id="wheel-ammo-${slot.id}" style="font-size:8.5px;color:#dfd6c4;font-weight:700;"></div>
        </div>`;
      g.appendChild(fo);
      svg.appendChild(g);
    });

    wheelRing.insertBefore(svg, wheelRing.firstChild);
  }

  let phoneEl = document.getElementById('ifruit-phone');
  if (!phoneEl) {
    phoneEl = document.createElement('div');
    phoneEl.id = 'ifruit-phone';
    phoneEl.className = 'ifruit-phone hidden';
    phoneEl.innerHTML = `
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
      </div>`;
    hudRoot.appendChild(phoneEl);
  }

  let barClubModal = document.getElementById('bar-club-modal');
  if (!barClubModal) {
    barClubModal = document.createElement('div');
    barClubModal.id = 'bar-club-modal';
    barClubModal.className = 'bar-club-modal hidden';
    barClubModal.innerHTML = `
      <div class="bar-club-card" role="dialog" aria-label="Bar Club VIP — Sòng Tài Xỉu">
        <div class="bar-club-header">
          <div class="bar-club-title-wrap">
            <h2>🍸 BAR CLUB VIP — SÒNG TÀI XỈU</h2>
            <p>Đặt cược kiếm ngân lượng chiêu mộ đệ tử hộ vệ &amp; Sư Huynh Vô Hạn</p>
          </div>
          <div class="bar-club-top-actions">
            <div class="bar-club-balance">Ví: <span id="tx-balance">$7,860</span></div>
            <button id="tx-gps-shop-btn" type="button" class="bar-club-mini-btn shop">📍 GPS Cửa Hàng</button>
            <button id="tx-close-btn" type="button" class="bar-club-mini-btn close">✖ Rời Bar</button>
          </div>
        </div>

        <div class="tx-stage">
          <div id="tx-bowl" class="tx-bowl">
            <div class="tx-die" id="tx-die-1" data-val="4"></div>
            <div class="tx-die" id="tx-die-2" data-val="5"></div>
            <div class="tx-die" id="tx-die-3" data-val="6"></div>
          </div>
          <div id="tx-result-banner" class="tx-result-banner">Chọn cửa TÀI / XỈU / BÃO, chọn mức cược rồi bấm LẮC XÚC XẮC!</div>
          <div id="tx-history" class="tx-history" aria-label="Lịch sử cầu Tài Xỉu"></div>
        </div>

        <div class="tx-choices">
          <button type="button" class="tx-choice-btn active" data-tx-choice="tai">
            <span class="tx-choice-name">🔴 TÀI</span>
            <span class="tx-choice-sub">Tổng 11 – 18 • Ăn ×2</span>
          </button>
          <button type="button" class="tx-choice-btn" data-tx-choice="xiu">
            <span class="tx-choice-name">🔵 XỈU</span>
            <span class="tx-choice-sub">Tổng 3 – 10 • Ăn ×2</span>
          </button>
          <button type="button" class="tx-choice-btn" data-tx-choice="bao">
            <span class="tx-choice-name">👑 BÃO</span>
            <span class="tx-choice-sub">3 Mặt Giống Nhau • Ăn ×10</span>
          </button>
        </div>

        <div class="tx-bet-panel">
          <div class="tx-bet-row">
            <label for="tx-bet-input">Mức cược ($):</label>
            <input id="tx-bet-input" type="number" min="1" step="1" value="10" inputmode="numeric" />
            <button type="button" class="tx-mod-btn" data-tx-mod="half">½</button>
            <button type="button" class="tx-mod-btn" data-tx-mod="double">×2</button>
            <button type="button" class="tx-mod-btn allin" data-tx-mod="allin">ALL-IN</button>
          </div>
          <div class="tx-chips">
            <button type="button" class="tx-chip" data-tx-chip="1">$1</button>
            <button type="button" class="tx-chip" data-tx-chip="10">$10</button>
            <button type="button" class="tx-chip" data-tx-chip="50">$50</button>
            <button type="button" class="tx-chip" data-tx-chip="100">$100</button>
            <button type="button" class="tx-chip" data-tx-chip="500">$500</button>
            <button type="button" class="tx-chip" data-tx-chip="1000">$1,000</button>
          </div>
        </div>

        <button id="tx-roll-btn" type="button" class="tx-roll-btn">🎲 LẮC XÚC XẮC NGAY</button>
      </div>`;
    hudRoot.appendChild(barClubModal);
  }

  let discipleShopModal = document.getElementById('disciple-shop-modal');
  if (!discipleShopModal) {
    discipleShopModal = document.createElement('div');
    discipleShopModal.id = 'disciple-shop-modal';
    discipleShopModal.className = 'bar-club-modal hidden';
    discipleShopModal.innerHTML = `
      <div class="bar-club-card disciple-shop-card" role="dialog" aria-label="Võ Quán — Cửa Hàng Đệ Tử">
        <div class="bar-club-header">
          <div class="bar-club-title-wrap">
            <h2>🏪 VÕ QUÁN — CỬA HÀNG ĐỆ TỬ</h2>
            <p>Chiêu mộ đệ tử đi theo bảo vệ bạn (không bao giờ tấn công chủ)</p>
          </div>
          <div class="bar-club-top-actions">
            <div class="bar-club-balance">Ví: <span id="shop-balance">$7,860</span> • <span id="shop-squad-count">0/6</span></div>
            <button id="shop-gps-club-btn" type="button" class="bar-club-mini-btn shop">📍 GPS Bar Club</button>
            <button id="shop-close-btn" type="button" class="bar-club-mini-btn close">✖ Rời Quán</button>
          </div>
        </div>
        <div id="disciple-shop-list" class="disciple-shop-list"></div>
      </div>`;
    hudRoot.appendChild(discipleShopModal);
  }

  let raceArenaModal = document.getElementById('race-arena-modal');
  if (!raceArenaModal) {
    raceArenaModal = document.createElement('div');
    raceArenaModal.id = 'race-arena-modal';
    raceArenaModal.className = 'bar-club-modal hidden';
    raceArenaModal.innerHTML = `
      <div class="bar-club-card race-arena-card" role="dialog" aria-label="Trường Đua Tử Thần — Sảnh Chờ & Gara">
        <div class="bar-club-header">
          <div class="bar-club-title-wrap">
            <h2>🏁 TRƯỜNG ĐUA TỬ THẦN — ĐẤU TRƯỜNG TỐC ĐỘ</h2>
            <p>Lệ phí đua: $50,000 • 🥇 $500,000 • 🥈 $200,000 • 🥉 $100,000 • Cá cược ăn ×5</p>
          </div>
          <div class="bar-club-top-actions">
            <div class="bar-club-balance">Ví: <span id="race-balance">$0</span></div>
            <button id="race-close-btn" type="button" class="bar-club-mini-btn close">✖ Rời Trường Đua</button>
          </div>
        </div>
        <div class="race-tabs">
          <button type="button" class="race-tab-btn active" data-race-tab="lobby">🏁 Sảnh Chờ (7 Tay Đua) • Vote Map • Cá Cược</button>
          <button type="button" class="race-tab-btn" data-race-tab="garage">🏎️ Gara Mua Xe Chiến Đấu ($10k - $100M)</button>
        </div>
        <div id="race-modal-body" class="race-modal-body"></div>
      </div>`;
    hudRoot.appendChild(raceArenaModal);
  }

  let raceHud = document.getElementById('race-hud');
  if (!raceHud) {
    raceHud = document.createElement('div');
    raceHud.id = 'race-hud';
    raceHud.className = 'race-hud hidden';
    raceHud.innerHTML = `
      <div class="race-hud-top">
        <div class="race-hud-stats">
          <div class="race-rank-pill" id="race-rank-txt">HẠNG 1/7</div>
          <div class="race-lap-pill" id="race-lap-txt">VÒNG 1/2</div>
          <div class="race-spd-pill" id="race-spd-txt">0 KM/H</div>
        </div>
        <div class="race-hud-center">
          <div id="race-map-badge" class="race-map-badge">🌋 HẺM NÚI TỬ THẦN</div>
          <div id="race-countdown-banner" class="race-countdown-banner hidden">3</div>
          <div id="race-feed-list" class="race-feed-list"></div>
        </div>
        <div class="race-hud-right">
          <button id="race-spectate-cam-btn" type="button" class="bar-club-mini-btn shop hidden">🎥 Đổi Xe Xem</button>
          <button id="race-reset-car-btn" type="button" class="bar-club-mini-btn">↺ Về Đường [R]</button>
          <button id="race-exit-btn" type="button" class="bar-club-mini-btn close">🚪 Thoát Đua</button>
        </div>
      </div>
      <div id="race-leaderboard" class="race-leaderboard"></div>
      <div class="race-hud-bottom">
        <div class="race-bars">
          <div class="race-bar-row"><span>🛡️ MÁU XE</span><span id="race-hp-txt">1000/1000</span></div>
          <div class="race-bar-track"><div id="race-hp-fill" class="race-bar-fill hp"></div></div>
          <div class="race-bar-row"><span>💨 NITRO</span><span id="race-nitro-txt">100%</span></div>
          <div class="race-bar-track"><div id="race-nitro-fill" class="race-bar-fill nitro"></div></div>
        </div>
        <div class="race-action-btns">
          <button id="race-skill-btn" type="button" class="race-big-btn skill">🔥 SKILL XE [Space]</button>
          <button id="race-nitro-btn" type="button" class="race-big-btn nitro">💨 NITRO [Shift]</button>
        </div>
      </div>
      <div id="race-finish-overlay" class="race-finish-overlay hidden"></div>`;
    hudRoot.appendChild(raceHud);
  }

  let fullMapModal = document.getElementById('full-map-modal');
  if (!fullMapModal) {
    fullMapModal = document.createElement('div');
    fullMapModal.id = 'full-map-modal';
    fullMapModal.className = 'bar-club-modal hidden';
    fullMapModal.innerHTML = `
      <div class="bar-club-card full-map-card" role="dialog" aria-label="Bản Đồ Kinh Thành">
        <div class="bar-club-header">
          <div class="bar-club-title-wrap">
            <h2>🗺️ BẢN ĐỒ KINH THÀNH — ĐẠI LỘ CHU TƯỚC</h2>
            <p id="full-map-hint">Click trực tiếp lên bản đồ hoặc chọn địa điểm để cắm mốc GPS • Bấm [~] hoặc [Esc] để đóng</p>
          </div>
          <div class="bar-club-top-actions">
            <span id="full-map-coords" class="bar-club-balance">Vị trí: (26, 28)</span>
            <button id="full-map-clear-gps" type="button" class="bar-club-mini-btn">✕ Xóa GPS</button>
            <button id="full-map-close-btn" type="button" class="bar-club-mini-btn close">✖ Đóng [~]</button>
          </div>
        </div>
        <div class="full-map-layout">
          <div class="full-map-canvas-wrap">
            <canvas id="full-map-canvas" width="760" height="580"></canvas>
          </div>
          <div id="full-map-legend" class="full-map-legend"></div>
        </div>
      </div>`;
    hudRoot.appendChild(fullMapModal);
  }

  let touchControls = document.getElementById('touch-controls');
  if (!touchControls) {
    touchControls = document.createElement('div');
    touchControls.id = 'touch-controls';
    touchControls.className = 'touch-controls hidden';
    touchControls.innerHTML = `
      <div id="joystick-zone" class="joystick-zone">
        <div id="joystick-base" class="joystick-base">
          <div id="joystick-knob" class="joystick-knob"></div>
        </div>
      </div>
      <div id="touch-look-zone" class="touch-look-zone"></div>
      <div id="touch-actions" class="touch-actions"></div>`;
    hudRoot.appendChild(touchControls);
  }

  const touchActions = document.getElementById('touch-actions');
  if (touchActions && !document.getElementById('cluster-onfoot')) {
    touchActions.innerHTML = `
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
      </div>`;
  }

  let pauseMenu = document.getElementById('pause-menu');
  if (!pauseMenu) {
    pauseMenu = document.createElement('div');
    pauseMenu.id = 'pause-menu';
    pauseMenu.className = 'pause-menu hidden';
    pauseMenu.innerHTML = `
      <div class="pause-card">
        <div class="pause-header">
          <h2>TẠM DỪNG — GIANG HỒ ĐẠI LỘ 3D</h2>
          <p>Tân Kiếm Hiệp Đô Thị • Kiếm Khí &amp; Khinh Công • Co-op/PvP Online</p>
        </div>
        <div class="pause-actions">
          <button id="btn-resume-game" type="button" class="gta-btn primary">TIẾP TỤC HÀNH TẨU</button>
          <button id="btn-save-game" type="button" class="gta-btn">LƯU HÀNH TRANG</button>
          <button id="btn-cycle-quality" type="button" class="gta-btn">ĐỒ HỌA: CAO (HIGH)</button>
          <button id="btn-cycle-weather" type="button" class="gta-btn">THIÊN THỜI: NẮNG ĐẸP HOA ĐÀO</button>
          <button id="btn-toggle-touch" type="button" class="gta-btn">ĐIỀU KHIỂN CẢM ỨNG: TỰ ĐỘNG</button>
        </div>
      </div>`;
    document.body.appendChild(pauseMenu);
  }

  // Decorate Splash Screen Collage Panels with Neo-Wuxia Cover Art SVGs
  const splashEl = document.getElementById('splash-screen');
  if (splashEl) {
    const tBoulevard = splashEl.querySelector('.tile-boulevard');
    if (tBoulevard && !tBoulevard.innerHTML.trim()) {
      tBoulevard.innerHTML = `<svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
        <circle cx="315" cy="58" r="36" fill="#ffe48f" opacity="0.88"/>
        <path d="M0 176 L400 176 L400 240 L0 240 Z" fill="#161b26"/>
        <path d="M182 176 L218 176 L278 240 L122 240 Z" fill="#2a3242"/>
        <!-- Vermilion Paifang Gate & Upturned Eaves -->
        <rect x="86" y="72" width="10" height="104" fill="#b81d2c"/><rect x="304" y="72" width="10" height="104" fill="#b81d2c"/>
        <path d="M58 76 Q200 92 342 76 L356 62 Q200 80 44 62 Z" fill="#1c222e" stroke="#f0c35a" stroke-width="2.5"/>
        <circle cx="116" cy="90" r="7" fill="#ff3b30"/><circle cx="284" cy="90" r="7" fill="#ff3b30"/>
        <!-- Cherry Blossom Petals & Bạch Long Supercar -->
        <circle cx="62" cy="112" r="24" fill="#ff9ebb" opacity="0.72"/><circle cx="48" cy="122" r="18" fill="#ffb6cd" opacity="0.72"/>
        <rect x="148" y="184" width="104" height="26" rx="9" fill="#f5f7fa" stroke="#f0c35a" stroke-width="1.5"/>
        <circle cx="168" cy="210" r="8.5" fill="#0d1117"/><circle cx="234" cy="210" r="8.5" fill="#0d1117"/>
      </svg>`;
    }
    const tPier = splashEl.querySelector('.tile-pier');
    if (tPier && !tPier.innerHTML.trim()) {
      tPier.innerHTML = `<svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
        <rect x="0" y="164" width="400" height="76" fill="#114b5f"/>
        <rect x="36" y="148" width="300" height="14" fill="#2b1e19"/>
        <circle cx="155" cy="94" r="46" stroke="#f0c35a" stroke-width="4" fill="none"/>
        <circle cx="155" cy="94" r="31" stroke="#38e09c" stroke-width="2" fill="none"/>
        <line x1="155" y1="94" x2="132" y2="148" stroke="#1a1f28" stroke-width="5"/>
        <line x1="155" y1="94" x2="178" y2="148" stroke="#1a1f28" stroke-width="5"/>
        <!-- Pagoda Pavilion on Pier -->
        <path d="M250 122 Q290 105 330 122 L338 114 Q290 96 242 114 Z" fill="#8f1d2c" stroke="#f0c35a" stroke-width="2"/>
        <rect x="262" y="122" width="6" height="26" fill="#b8293d"/><rect x="312" y="122" width="6" height="26" fill="#b8293d"/>
      </svg>`;
    }
    const tHeist = splashEl.querySelector('.tile-heist');
    if (tHeist && !tHeist.innerHTML.trim()) {
      tHeist.innerHTML = `<svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
        <rect x="92" y="14" width="216" height="226" fill="#132538" opacity="0.92"/>
        <path d="M72 22 Q200 36 328 22 L342 8 Q200 24 58 8 Z" fill="#1d2432" stroke="#f0c35a" stroke-width="2.5"/>
        <g stroke="#254461" stroke-width="1.8"><line x1="146" y1="24" x2="146" y2="240"/><line x1="200" y1="24" x2="200" y2="240"/><line x1="254" y1="24" x2="254" y2="240"/><line x1="92" y1="80" x2="308" y2="80"/><line x1="92" y1="140" x2="308" y2="140"/></g>
        <line x1="200" y1="18" x2="200" y2="130" stroke="#e2d5b8" stroke-width="2.4"/>
        <!-- Conical Hat Đấu Lạp Warrior + Cyan Sword Qi Arc -->
        <polygon points="180,114 220,114 200,101" fill="#1a1d24" stroke="#f0c35a" stroke-width="1.5"/>
        <rect x="191" y="116" width="18" height="30" rx="5" fill="#10131a"/>
        <path d="M222 102 Q272 128 232 168" stroke="#6bf5e8" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      </svg>`;
    }
    const tVinewood = splashEl.querySelector('.tile-vinewood');
    if (tVinewood && !tVinewood.innerHTML.trim()) {
      tVinewood.innerHTML = `<svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
        <circle cx="84" cy="56" r="28" fill="#fff2cc" opacity="0.82"/>
        <path d="M0 192 Q95 104 205 140 T400 112 L400 240 L0 240 Z" fill="#1b2620"/>
        <!-- Quan Sơn Đình Cliffside Pavilion -->
        <path d="M286 94 Q316 80 346 94 L352 88 Q316 72 280 88 Z" fill="#a11d2b" stroke="#f0c35a" stroke-width="1.8"/>
        <rect x="296" y="94" width="5" height="22" fill="#8f1d2c"/><rect x="331" y="94" width="5" height="22" fill="#8f1d2c"/>
        <text x="188" y="152" text-anchor="middle" fill="#fff6dc" stroke="#b88628" stroke-width="1.2" font-family="Impact, sans-serif" font-size="34" letter-spacing="5">VÕ LÂM</text>
      </svg>`;
    }
  }
}

// ============================================================================
// WEB AUDIO API PROCEDURAL SOUND ENGINE (ctx.audio) — NEO-WUXIA + SUPERCAR
// ============================================================================
function createAudioEngine(ctx, onWeaponRecoil) {
  let audioCtx = null;
  let compressor = null;
  let masterGain = null;
  let whiteNoiseBuf = null;
  let pinkNoiseBuf = null;
  let muted = false;
  let masterVol = 0.78;

  let loopsReady = false;
  let engOsc1 = null;
  let engOsc2 = null;
  let engSub = null;
  let engFilter = null;
  let engGain = null;

  let skidSource = null;
  let skidFilter = null;
  let skidGain = null;

  let heliOsc = null;
  let heliNoise = null;
  let heliLfo = null;
  let heliLfoGain = null;
  let heliGain = null;

  let oceanNoise = null;
  let oceanFilter = null;
  let oceanGain = null;

  let sirenOsc = null;
  let sirenGain = null;

  let currentGear = 1;
  let gearShiftTimer = 0;
  let smoothedRpm = 0.18;
  let burbleCooldown = 0;
  let seagullTimer = 3.5;
  let sirenPhase = 0;
  let surfPhase = 0;
  let lastFootstepAt = 0;
  let lastShellAt = 0;
  let playerSirenOn = false;

  function ensureContext() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      return audioCtx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      audioCtx = new AC();
      compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, audioCtx.currentTime);
      compressor.knee.setValueAtTime(18, audioCtx.currentTime);
      compressor.ratio.setValueAtTime(6, audioCtx.currentTime);
      compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
      compressor.release.setValueAtTime(0.18, audioCtx.currentTime);

      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(muted ? 0 : masterVol, audioCtx.currentTime);
      compressor.connect(masterGain);
      masterGain.connect(audioCtx.destination);

      const sr = audioCtx.sampleRate;
      whiteNoiseBuf = audioCtx.createBuffer(1, sr * 2, sr);
      const wd = whiteNoiseBuf.getChannelData(0);
      for (let i = 0; i < wd.length; i++) {
        wd[i] = Math.random() * 2 - 1;
      }

      pinkNoiseBuf = audioCtx.createBuffer(1, sr * 3, sr);
      const pd = pinkNoiseBuf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < pd.length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        pd[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      initContinuousLoops();
    } catch (_) {
      audioCtx = null;
    }
    return audioCtx;
  }

  function initContinuousLoops() {
    if (!audioCtx || loopsReady) return;
    loopsReady = true;
    const now = audioCtx.currentTime;

    engFilter = audioCtx.createBiquadFilter();
    engFilter.type = 'lowpass';
    engFilter.frequency.setValueAtTime(320, now);
    engFilter.Q.setValueAtTime(2.4, now);

    engGain = audioCtx.createGain();
    engGain.gain.setValueAtTime(0.0001, now);

    engOsc1 = audioCtx.createOscillator();
    engOsc1.type = 'sawtooth';
    engOsc1.frequency.setValueAtTime(48, now);

    engOsc2 = audioCtx.createOscillator();
    engOsc2.type = 'triangle';
    engOsc2.frequency.setValueAtTime(120, now);

    engSub = audioCtx.createOscillator();
    engSub.type = 'sine';
    engSub.frequency.setValueAtTime(24, now);

    const g1 = audioCtx.createGain();
    g1.gain.value = 0.48;
    const g2 = audioCtx.createGain();
    g2.gain.value = 0.36;
    const gSub = audioCtx.createGain();
    gSub.gain.value = 0.52;

    engOsc1.connect(g1);
    engOsc2.connect(g2);
    engSub.connect(gSub);
    g1.connect(engFilter);
    g2.connect(engFilter);
    gSub.connect(engFilter);
    engFilter.connect(engGain);
    engGain.connect(compressor);

    engOsc1.start(now);
    engOsc2.start(now);
    engSub.start(now);

    skidSource = audioCtx.createBufferSource();
    skidSource.buffer = whiteNoiseBuf;
    skidSource.loop = true;
    skidFilter = audioCtx.createBiquadFilter();
    skidFilter.type = 'bandpass';
    skidFilter.frequency.setValueAtTime(1180, now);
    skidFilter.Q.setValueAtTime(5.5, now);
    skidGain = audioCtx.createGain();
    skidGain.gain.setValueAtTime(0.0001, now);
    skidSource.connect(skidFilter);
    skidFilter.connect(skidGain);
    skidGain.connect(compressor);
    skidSource.start(now);

    heliNoise = audioCtx.createBufferSource();
    heliNoise.buffer = pinkNoiseBuf;
    heliNoise.loop = true;
    const heliBp = audioCtx.createBiquadFilter();
    heliBp.type = 'lowpass';
    heliBp.frequency.setValueAtTime(210, now);

    heliOsc = audioCtx.createOscillator();
    heliOsc.type = 'triangle';
    heliOsc.frequency.setValueAtTime(42, now);

    const heliPulseNode = audioCtx.createGain();
    heliPulseNode.gain.setValueAtTime(0.55, now);

    heliLfo = audioCtx.createOscillator();
    heliLfo.type = 'sine';
    heliLfo.frequency.setValueAtTime(12.5, now);
    heliLfoGain = audioCtx.createGain();
    heliLfoGain.gain.setValueAtTime(0.45, now);
    heliLfo.connect(heliLfoGain);
    heliLfoGain.connect(heliPulseNode.gain);

    heliGain = audioCtx.createGain();
    heliGain.gain.setValueAtTime(0.0001, now);

    heliNoise.connect(heliBp);
    heliBp.connect(heliPulseNode);
    heliOsc.connect(heliPulseNode);
    heliPulseNode.connect(heliGain);
    heliGain.connect(compressor);

    heliNoise.start(now);
    heliOsc.start(now);
    heliLfo.start(now);

    oceanNoise = audioCtx.createBufferSource();
    oceanNoise.buffer = pinkNoiseBuf;
    oceanNoise.loop = true;
    oceanFilter = audioCtx.createBiquadFilter();
    oceanFilter.type = 'lowpass';
    oceanFilter.frequency.setValueAtTime(420, now);
    oceanFilter.Q.setValueAtTime(0.9, now);
    oceanGain = audioCtx.createGain();
    oceanGain.gain.setValueAtTime(0.0001, now);
    oceanNoise.connect(oceanFilter);
    oceanFilter.connect(oceanGain);
    oceanGain.connect(compressor);
    oceanNoise.start(now);

    sirenOsc = audioCtx.createOscillator();
    sirenOsc.type = 'triangle';
    sirenOsc.frequency.setValueAtTime(720, now);
    sirenGain = audioCtx.createGain();
    sirenGain.gain.setValueAtTime(0.0001, now);
    sirenOsc.connect(sirenGain);
    sirenGain.connect(compressor);
    sirenOsc.start(now);
  }

  function canPlay() {
    if (muted) return false;
    const ac = ensureContext();
    return !!(ac && ac.state === 'running');
  }

  function playNoiseBurst(dur, filterType, freq, q, peakGain, delay = 0) {
    if (!canPlay() || !whiteNoiseBuf) return;
    const t0 = audioCtx.currentTime + delay;
    const src = audioCtx.createBufferSource();
    src.buffer = whiteNoiseBuf;
    src.loop = true;

    const flt = audioCtx.createBiquadFilter();
    flt.type = filterType;
    flt.frequency.setValueAtTime(Math.max(30, freq), t0);
    flt.Q.setValueAtTime(Math.max(0.1, q), t0);

    const g = audioCtx.createGain();
    g.gain.setValueAtTime(Math.max(0.0002, peakGain), t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.02, dur));

    src.connect(flt);
    flt.connect(g);
    g.connect(compressor);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  function playToneSweep(type, fStart, fEnd, dur, peakGain, delay = 0) {
    if (!canPlay()) return;
    const t0 = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, fStart), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, fEnd), t0 + Math.max(0.02, dur));

    const g = audioCtx.createGain();
    g.gain.setValueAtTime(Math.max(0.0002, peakGain), t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.02, dur));

    osc.connect(g);
    g.connect(compressor);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function playExhaustPop(strength = 0.7) {
    if (!canPlay()) return;
    const f = 85 + Math.random() * 65;
    playToneSweep('triangle', f * 1.4, 42, 0.065, 0.14 * strength);
    playNoiseBurst(0.055, 'bandpass', 240 + Math.random() * 140, 2.2, 0.12 * strength);
  }

  function playSeagullCall() {
    if (!canPlay()) return;
    const calls = 1 + (Math.random() < 0.55 ? 1 : 0);
    for (let c = 0; c < calls; c++) {
      const d = c * 0.34;
      const t0 = audioCtx.currentTime + d;
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      const base = 1350 + Math.random() * 260;
      osc.frequency.setValueAtTime(base, t0);
      osc.frequency.linearRampToValueAtTime(base * 1.42, t0 + 0.07);
      osc.frequency.exponentialRampToValueAtTime(base * 0.78, t0 + 0.28);

      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.045, t0 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.29);

      osc.connect(g);
      g.connect(compressor);
      osc.start(t0);
      osc.stop(t0 + 0.31);
    }
  }

  const audio = {
    get ctx() {
      return audioCtx;
    },
    currentGearLabel: 'N',

    unlock() {
      ensureContext();
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    },

    init() {
      this.unlock();
    },

    resume() {
      this.unlock();
    },

    setVolume(v) {
      masterVol = clamp(Number(v) || 0, 0, 1);
      if (masterGain && audioCtx) {
        masterGain.gain.setTargetAtTime(muted ? 0 : masterVol, audioCtx.currentTime, 0.04);
      }
    },

    setMuted(flag) {
      muted = !!flag;
      if (masterGain && audioCtx) {
        masterGain.gain.setTargetAtTime(muted ? 0 : masterVol, audioCtx.currentTime, 0.03);
      }
    },

    // Wuxia Thanh Phong Kiếm Slash + Crescent Sword Qi Resonance
    playSwordSlash() {
      if (typeof onWeaponRecoil === 'function') onWeaponRecoil();
      if (!canPlay()) return;
      const pitchJitter = 0.94 + Math.random() * 0.12;
      playNoiseBurst(0.15, 'bandpass', 1850 * pitchJitter, 1.9, 0.20);
      playToneSweep('sine', 1480 * pitchJitter, 2480 * pitchJitter, 0.20, 0.15);
      playToneSweep('triangle', 740 * pitchJitter, 1180 * pitchJitter, 0.16, 0.12, 0.015);
    },

    // Wuxia Khinh Công Đạp Không Aerial Step + Jade Pentatonic Harmonic
    playKhinhCong(step = 1) {
      if (!canPlay()) return;
      const baseNote = step <= 1 ? 587.33 : 783.99; // D5 -> G5
      playNoiseBurst(0.18, 'bandpass', 1120, 1.6, 0.15);
      playToneSweep('sine', baseNote, baseNote * 1.5, 0.22, 0.13);
      playToneSweep('triangle', baseNote * 2, baseNote * 2.5, 0.16, 0.07, 0.03);
    },

    playShot(weaponId = 'pistol') {
      if (typeof onWeaponRecoil === 'function') onWeaponRecoil();
      if (!canPlay()) return;
      const w = String(weaponId || 'pistol').toLowerCase();

      if (w === 'unarmed' || w === 'fist') {
        this.playMelee(false);
        return;
      }
      if (w === 'bat') {
        this.playSwordSlash();
        return;
      }
      if (w === 'smg' || w === 'uzi') {
        playToneSweep('sawtooth', 230, 62, 0.075, 0.24);
        playNoiseBurst(0.07, 'highpass', 1650, 1.1, 0.22);
      } else if (w === 'carbine' || w === 'rifle' || w === 'm4') {
        playToneSweep('sawtooth', 175, 44, 0.12, 0.34);
        playNoiseBurst(0.11, 'bandpass', 2400, 1.0, 0.32);
        playNoiseBurst(0.16, 'lowpass', 520, 0.8, 0.20, 0.01);
      } else if (w === 'shotgun') {
        playToneSweep('sawtooth', 125, 30, 0.22, 0.44);
        playNoiseBurst(0.24, 'lowpass', 980, 0.9, 0.42);
        playNoiseBurst(0.14, 'highpass', 2100, 1.2, 0.26);
        playNoiseBurst(0.045, 'bandpass', 3200, 3.5, 0.09, 0.24);
        playNoiseBurst(0.050, 'bandpass', 2600, 3.5, 0.10, 0.33);
      } else if (w === 'grenade' || w === 'launcher') {
        playToneSweep('sine', 250, 78, 0.20, 0.38);
        playNoiseBurst(0.14, 'bandpass', 480, 2.6, 0.22);
      } else {
        playToneSweep('triangle', 195, 50, 0.10, 0.30);
        playNoiseBurst(0.09, 'highpass', 1750, 1.2, 0.26);
        playNoiseBurst(0.03, 'bandpass', 4200, 4.0, 0.09, 0.03);
      }
    },

    playGunshot(weaponId) {
      this.playShot(weaponId);
    },

    playWeaponShot(weaponId) {
      this.playShot(weaponId);
    },

    playWeapon(weaponId) {
      this.playShot(weaponId);
    },

    playMelee(isHeavy = false) {
      if (!canPlay()) return;
      if (isHeavy) {
        this.playSwordSlash();
        return;
      }
      // Quyền Pháp Nội Gia Palm Qi Boom
      playNoiseBurst(0.12, 'bandpass', 560, 1.5, 0.20);
      playToneSweep('sine', 220, 52, 0.14, 0.26, 0.01);
    },

    playPunch() {
      this.playMelee(false);
    },

    playSFX(name = 'shot') {
      const k = String(name || '').toLowerCase();
      if (k.includes('sword')) this.playSwordSlash();
      else if (k.includes('khinh')) this.playKhinhCong(1);
      else if (k.includes('glass') || k.includes('shatter')) this.playGlassShatter();
      else if (k.includes('explod') || k.includes('boom')) this.playExplosion(1);
      else if (k.includes('shell') || k.includes('clink')) this.playShellClink();
      else if (k.includes('melee') || k.includes('punch') || k.includes('bat')) this.playMelee(k.includes('bat'));
      else this.playShot(k);
    },

    playDoor() {
      if (!canPlay()) return;
      playNoiseBurst(0.055, 'bandpass', 1650, 3.2, 0.09);
      playToneSweep('triangle', 145, 44, 0.12, 0.24, 0.045);
    },

    playSpray() {
      if (!canPlay()) return;
      playNoiseBurst(0.58, 'highpass', 2900, 1.4, 0.16);
      playToneSweep('sine', 660, 990, 0.14, 0.12, 0.18);
      playToneSweep('sine', 990, 1320, 0.18, 0.12, 0.30);
    },

    setSiren(active) {
      playerSirenOn = !!active;
    },

    updateEngine() {},

    playShellClink() {
      if (!canPlay()) return;
      const now = audioCtx.currentTime;
      if (now - lastShellAt < 0.045) return;
      lastShellAt = now;
      const base = 3950 + Math.random() * 850;
      playToneSweep('sine', base, base * 0.96, 0.055, 0.048);
      playToneSweep('sine', base * 1.41, base * 1.38, 0.045, 0.032, 0.008);
      playToneSweep('sine', base * 1.04, base * 0.99, 0.040, 0.025, 0.068);
    },

    playCasingClink() {
      this.playShellClink();
    },

    playGlassShatter() {
      if (!canPlay()) return;
      playNoiseBurst(0.26, 'highpass', 3400, 1.3, 0.32);
      for (let i = 0; i < 8; i++) {
        const delay = i * 0.024 + Math.random() * 0.03;
        const f = 2300 + Math.random() * 4400;
        playToneSweep('sine', f, f * 0.88, 0.08 + Math.random() * 0.06, 0.07, delay);
      }
    },

    playGlassBreak() {
      this.playGlassShatter();
    },

    playGlass() {
      this.playGlassShatter();
    },

    playShatter() {
      this.playGlassShatter();
    },

    playTireScreech(intensity = 0.65) {
      if (!canPlay()) return;
      const v = clamp(intensity, 0.1, 1.0);
      playNoiseBurst(0.22, 'bandpass', 1240, 6.0, 0.14 * v);
      playToneSweep('sine', 1120, 960, 0.18, 0.06 * v);
    },

    playCrash(impactSpeed = 12) {
      if (!canPlay()) return;
      const mag = clamp(impactSpeed / 26, 0.22, 1.0);
      playToneSweep('sawtooth', 115, 28, 0.24, 0.38 * mag);
      playNoiseBurst(0.26, 'bandpass', 720, 1.4, 0.36 * mag);
      if (impactSpeed > 15) {
        this.playGlassShatter();
      }
    },

    playCollision(impactSpeed) {
      this.playCrash(impactSpeed);
    },

    playImpact(impactSpeed) {
      this.playCrash(impactSpeed);
    },

    playExplosion(power = 1.0) {
      if (!canPlay()) return;
      const p = clamp(power, 0.4, 1.6);
      playToneSweep('sine', 86, 18, 0.95, 0.58 * p);
      playToneSweep('sawtooth', 130, 24, 0.55, 0.36 * p);
      playNoiseBurst(0.88, 'lowpass', 580, 0.85, 0.52 * p);
      playNoiseBurst(0.45, 'bandpass', 1850, 1.1, 0.24 * p, 0.04);
    },

    playHollowPurple() {
      if (!canPlay()) return;
      // Resonant void charge -> massive 1km bass drop & violet shimmer
      playToneSweep('sine', 420, 22, 1.45, 0.62);
      playToneSweep('sawtooth', 180, 28, 1.1, 0.35, 0.04);
      playToneSweep('triangle', 880, 1760, 0.65, 0.22, 0.02);
      playNoiseBurst(1.25, 'lowpass', 720, 0.9, 0.56, 0.03);
      playNoiseBurst(0.75, 'bandpass', 2400, 1.4, 0.26, 0.12);
    },

    playTulenLock() {
      if (!canPlay()) return;
      playToneSweep('sine', 660, 1420, 0.18, 0.22);
      playToneSweep('triangle', 990, 1980, 0.14, 0.14, 0.04);
    },

    playTulenThunderbird() {
      if (!canPlay()) return;
      // Electric screech + crackling bolt + sky thunderclap
      playToneSweep('sawtooth', 1650, 240, 0.42, 0.34);
      playToneSweep('triangle', 2200, 820, 0.28, 0.22, 0.03);
      playToneSweep('sine', 160, 32, 0.72, 0.52, 0.08);
      playNoiseBurst(0.55, 'bandpass', 2600, 1.6, 0.38, 0.02);
      playNoiseBurst(0.68, 'lowpass', 540, 0.8, 0.44, 0.1);
    },

    playCasinoAlarm() {
      if (!canPlay()) return;
      for (let i = 0; i < 3; i++) {
        playToneSweep('square', 920, 620, 0.16, 0.2, i * 0.22);
      }
    },

    playDiceRoll() {
      if (!canPlay()) return;
      for (let i = 0; i < 6; i++) {
        const d = i * 0.11 + Math.random() * 0.03;
        const f = 1450 + Math.random() * 1400;
        playNoiseBurst(0.042, 'bandpass', f, 3.2, 0.16, d);
        playToneSweep('triangle', f * 0.72, f * 0.55, 0.038, 0.08, d);
      }
    },

    playBulletTime(active = true) {
      if (!canPlay()) return;
      if (active) {
        playToneSweep('sine', 265, 34, 0.48, 0.42);
        playToneSweep('triangle', 587.33, 196, 0.42, 0.18);
        playNoiseBurst(0.32, 'bandpass', 950, 2.2, 0.14);
      } else {
        playToneSweep('sine', 42, 290, 0.28, 0.28);
        playToneSweep('triangle', 196, 587.33, 0.24, 0.14);
      }
    },

    playHorn(vehicleType = '') {
      if (!canPlay()) return;
      const vt = String(vehicleType || (ctx.player?.inCar?.type ?? '')).toLowerCase();
      if (vt === 'police' || vt === 'swat_van') {
        playerSirenOn = !playerSirenOn;
        playToneSweep('triangle', 680, 1380, 0.18, 0.22);
        return;
      }
      const f1 = vt === 'obey9f' || vt === 'banshee' ? 440 : 330;
      const f2 = f1 * 1.25;
      playToneSweep('sawtooth', f1, f1 * 0.99, 0.28, 0.16);
      playToneSweep('sawtooth', f2, f2 * 0.99, 0.28, 0.14);
    },

    playFootstep(surfaceHint) {
      if (!canPlay()) return;
      const now = audioCtx.currentTime;
      if (now - lastFootstepAt < 0.19) return;
      lastFootstepAt = now;

      const p = ctx.player;
      let surf = surfaceHint;
      if (!surf && p) {
        if (p.x < -128 && p.y > 2.2) surf = 'wood';
        else if (p.x < -128) surf = 'sand';
        else surf = 'concrete';
      }

      if (surf === 'sand') {
        playNoiseBurst(0.065, 'bandpass', 1450, 1.8, 0.045);
      } else if (surf === 'wood') {
        playToneSweep('triangle', 135, 62, 0.055, 0.075);
      } else {
        playNoiseBurst(0.04, 'bandpass', 1900, 2.4, 0.04);
        playToneSweep('sine', 110, 55, 0.04, 0.045);
      }
    },

    playHitmarker(isCrit = false) {
      if (!canPlay()) return;
      playToneSweep('triangle', isCrit ? 1680 : 1240, isCrit ? 920 : 760, 0.055, 0.14);
    },

    playDamage() {
      if (!canPlay()) return;
      playToneSweep('sawtooth', 140, 48, 0.14, 0.24);
    },

    playPickup(kind = 'cash') {
      if (!canPlay()) return;
      if (kind === 'cash') {
        playToneSweep('sine', 880, 1320, 0.09, 0.14);
        playToneSweep('sine', 1320, 1760, 0.13, 0.14, 0.07);
      } else {
        playToneSweep('triangle', 587, 880, 0.12, 0.15);
        playToneSweep('triangle', 880, 1175, 0.16, 0.15, 0.09);
      }
    },

    playCash() {
      this.playPickup('cash');
    },

    playWantedChange(stars = 1) {
      if (!canPlay()) return;
      if (stars > 0) {
        playToneSweep('triangle', 520, 780, 0.14, 0.16);
      } else {
        playToneSweep('sine', 780, 520, 0.18, 0.14);
      }
    },

    playPhoneOpen() {
      playToneSweep('sine', 587.33, 880, 0.08, 0.10);
      playToneSweep('sine', 880, 1174.66, 0.09, 0.09, 0.06);
    },

    playPhoneClose() {
      playToneSweep('sine', 880, 587.33, 0.10, 0.09);
    },

    playPhoneTap() {
      playToneSweep('sine', 1174.66, 1318.5, 0.038, 0.07);
    },

    playPhoneClick() {
      this.playPhoneTap();
    },

    playPhoneConfirm() {
      playToneSweep('triangle', 659.25, 987.77, 0.08, 0.12);
      playToneSweep('triangle', 987.77, 1318.5, 0.12, 0.12, 0.07);
    },

    playChime() {
      this.playPhoneConfirm();
    },

    playPhoneError() {
      playToneSweep('sawtooth', 240, 170, 0.14, 0.14);
    },

    // Wuxia Pentatonic Triumph Fanfare (D4 Gong + D5 - E5 - G5 - A5 - D6)
    playMissionPassed() {
      if (!canPlay()) return;
      playToneSweep('sine', 146.83, 146.0, 1.8, 0.22);
      const notes = [587.33, 659.25, 783.99, 880.0, 1174.66];
      notes.forEach((freq, idx) => {
        const t0 = audioCtx.currentTime + idx * 0.075;
        const osc = audioCtx.createOscillator();
        osc.type = idx < 2 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, t0);

        const flt = audioCtx.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(2200, t0);

        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.12, t0 + 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.9);

        osc.connect(flt);
        flt.connect(g);
        g.connect(compressor);
        osc.start(t0);
        osc.stop(t0 + 1.95);
      });
    },

    playMissionComplete() {
      this.playMissionPassed();
    },

    playMissionFailed() {
      playToneSweep('sawtooth', 220, 110, 0.55, 0.24);
      playToneSweep('triangle', 164.8, 82.4, 0.65, 0.22, 0.12);
    },

    playWasted() {
      if (!canPlay()) return;
      playToneSweep('sine', 135, 28, 0.75, 0.45);
      playNoiseBurst(0.35, 'lowpass', 420, 1.0, 0.30);
      playToneSweep('sawtooth', 98, 65, 1.35, 0.20, 0.12);
    },

    playBusted() {
      if (!canPlay()) return;
      playToneSweep('triangle', 640, 420, 0.35, 0.22);
      playToneSweep('sawtooth', 165, 98, 0.85, 0.22, 0.10);
    },

    update(rawDt, gameCtx = ctx) {
      if (!audioCtx || audioCtx.state !== 'running' || !loopsReady) return;
      const now = audioCtx.currentTime;
      const p = gameCtx?.player;
      const inp = gameCtx?.input;
      const pausedOrSplash = !gameCtx?.started || !!gameCtx?.paused;

      if (pausedOrSplash || !p) {
        engGain.gain.setTargetAtTime(0.0001, now, 0.08);
        skidGain.gain.setTargetAtTime(0.0001, now, 0.06);
        heliGain.gain.setTargetAtTime(0.0001, now, 0.08);
        oceanGain.gain.setTargetAtTime(0.0001, now, 0.10);
        sirenGain.gain.setTargetAtTime(0.0001, now, 0.08);
        return;
      }

      const car = p.inCar || p.vehicle;
      const inGroundCar = !!(car && car.type !== 'heli');

      if (!car) {
        playerSirenOn = false;
      }

      if (inGroundCar) {
        const vx = Number(car.vx) || 0;
        const vz = Number(car.vz) || 0;
        const rawSpeed = Number.isFinite(car.speed) ? car.speed : Math.hypot(vx, vz);
        const absSpd = Math.abs(rawSpeed);
        const maxSpd = Math.max(18, Number(car.maxSpeed) || 34);
        const throttle = inp ? clamp(inp.throttle || 0, 0, 1) : 0;

        const ratios = [0, 0.17, 0.33, 0.50, 0.68, 0.85, 1.18];
        let targetGear = 1;
        for (let g = 1; g <= 6; g++) {
          if (absSpd >= ratios[g - 1] * maxSpd) targetGear = g;
        }
        if (targetGear > currentGear && gearShiftTimer <= 0) {
          currentGear = targetGear;
          gearShiftTimer = 0.10;
          playExhaustPop(0.75);
        } else if (targetGear < currentGear) {
          currentGear = targetGear;
        }
        if (gearShiftTimer > 0) gearShiftTimer = Math.max(0, gearShiftTimer - rawDt);

        if (absSpd < 0.5 && throttle < 0.05) {
          this.currentGearLabel = 'N';
        } else if (rawSpeed < -0.8 || (absSpd < 2.0 && (inp?.brake || 0) > 0.2 && throttle < 0.05)) {
          this.currentGearLabel = 'R';
        } else {
          this.currentGearLabel = `D${currentGear}`;
        }

        const gLow = ratios[currentGear - 1] * maxSpd;
        const gHigh = ratios[currentGear] * maxSpd;
        const inGearFrac = clamp((absSpd - gLow) / Math.max(3, gHigh - gLow), 0, 1);
        const targetRpm = gearShiftTimer > 0
          ? 0.32
          : clamp(0.18 + inGearFrac * 0.66 + throttle * 0.18, 0.18, 1.0);
        smoothedRpm += (targetRpm - smoothedRpm) * Math.min(1, rawDt * 12);

        const isExotic = car.type === 'obey9f' || car.type === 'banshee';
        const fBase = isExotic ? 46 + smoothedRpm * 188 : 35 + smoothedRpm * 128;
        const harmonicMult = isExotic ? 2.5 : 2.0;
        const timeWarp = clamp(gameCtx.timeScale || 1, 0.35, 1.0);

        engOsc1.frequency.setTargetAtTime(fBase * timeWarp, now, 0.03);
        engOsc2.frequency.setTargetAtTime(fBase * harmonicMult * timeWarp, now, 0.03);
        engSub.frequency.setTargetAtTime(fBase * 0.5 * timeWarp, now, 0.03);

        const cutoff = 260 + smoothedRpm * 1150 + throttle * 920;
        engFilter.frequency.setTargetAtTime(cutoff, now, 0.04);
        const vol = 0.07 + smoothedRpm * 0.08 + throttle * 0.06;
        engGain.gain.setTargetAtTime(vol, now, 0.04);

        burbleCooldown = Math.max(0, burbleCooldown - rawDt);
        if (absSpd > 14 && throttle < 0.04 && burbleCooldown <= 0 && Math.random() < 0.35) {
          burbleCooldown = 0.09 + Math.random() * 0.12;
          playExhaustPop(0.48);
        }

        const steerAmt = Math.abs(inp?.steer || inp?.moveX || 0);
        const drifting = (inp?.handbrake && absSpd > 5.5) || (steerAmt > 0.72 && absSpd > 16);
        skidGain.gain.setTargetAtTime(drifting ? clamp(absSpd / 28, 0.04, 0.14) : 0.0001, now, 0.05);
      } else {
        this.currentGearLabel = 'N';
        engGain.gain.setTargetAtTime(0.0001, now, 0.08);
        skidGain.gain.setTargetAtTime(0.0001, now, 0.05);
      }

      let minHeliDist = Infinity;
      if (car && car.type === 'heli') {
        minHeliDist = 0;
      } else {
        const helis = gameCtx.gameplay?.helicopters || [];
        for (let i = 0; i < helis.length; i++) {
          const h = helis[i];
          if (!h || h.dead) continue;
          const d = Math.hypot((h.x || 0) - p.x, (h.y || 48) - p.y, (h.z || 0) - p.z);
          if (d < minHeliDist) minHeliDist = d;
        }
        const vList = gameCtx.vehicles?.list || [];
        for (let i = 0; i < vList.length; i++) {
          const v = vList[i];
          if (v && v.type === 'heli' && v.alive !== false && (v.isPlayerDriving || v.remoteDriverId || v.sirenActive || Math.abs(v.vy || 0) > 0.2 || (v.y || 0) > 6)) {
            const d = Math.hypot((v.x || 0) - p.x, (v.y || 0) - p.y, (v.z || 0) - p.z);
            if (d < minHeliDist) minHeliDist = d;
          }
        }
      }
      if (minHeliDist < 145) {
        const prox = clamp(1 - minHeliDist / 145, 0, 1);
        heliLfo.frequency.setTargetAtTime(car?.type === 'heli' ? 13.5 : 11.8, now, 0.06);
        heliGain.gain.setTargetAtTime(0.03 + prox * 0.16, now, 0.06);
      } else {
        heliGain.gain.setTargetAtTime(0.0001, now, 0.1);
      }

      if (p.x < -120 && !p.inSafehouse) {
        const coastalProx = clamp((-120 - p.x) / 52, 0.04, 1.0);
        surfPhase += rawDt * 0.92;
        const waveSwell = 0.5 + 0.5 * Math.sin(surfPhase);
        const surfCutoff = 220 + waveSwell * 740;
        oceanFilter.frequency.setTargetAtTime(surfCutoff, now, 0.12);
        oceanGain.gain.setTargetAtTime(coastalProx * (0.045 + waveSwell * 0.085), now, 0.12);

        seagullTimer -= rawDt;
        const weather = gameCtx.engine?.timeWeather || 'BRIGHT_DAY';
        if (seagullTimer <= 0 && coastalProx > 0.22 && weather !== 'NEON_NIGHT' && weather !== 'OVERCAST_RAIN') {
          seagullTimer = 5.0 + Math.random() * 7.5;
          playSeagullCall();
        }
      } else {
        oceanGain.gain.setTargetAtTime(0.0001, now, 0.15);
      }

      let minSirenDist = Infinity;
      if (playerSirenOn && car && (car.type === 'police' || car.type === 'swat_van')) {
        minSirenDist = 0;
      }
      const stars = gameCtx.gameplay?.wanted?.stars || 0;
      const vList = gameCtx.vehicles?.list || [];
      for (let i = 0; i < vList.length; i++) {
        const v = vList[i];
        if (!v || v.alive === false) continue;
        if ((v.type === 'police' || v.type === 'swat_van' || v.isPolice) && (stars >= 2 || v.sirenActive)) {
          const d = Math.hypot((v.x || 0) - p.x, (v.z || 0) - p.z);
          if (d < minSirenDist) minSirenDist = d;
        }
      }
      if (stars >= 2 && !Number.isFinite(minSirenDist) && (gameCtx.gameplay?.cops?.length || 0) > 0) {
        minSirenDist = 55;
      }

      if (minSirenDist < 120) {
        const yelp = minSirenDist < 24;
        sirenPhase += rawDt * (yelp ? 19.0 : 2.35);
        const sirenFreq = yelp
          ? 1060 + Math.sin(sirenPhase) * 390
          : 940 + Math.sin(sirenPhase) * 330;
        const prox = clamp(1 - minSirenDist / 120, 0.08, 1);
        sirenOsc.frequency.setTargetAtTime(sirenFreq, now, 0.025);
        sirenGain.gain.setTargetAtTime(prox * 0.075, now, 0.06);
      } else {
        sirenGain.gain.setTargetAtTime(0.0001, now, 0.08);
      }
    },

    updateAudio(rawDt, gameCtx) {
      this.update(rawDt, gameCtx);
    },
  };

  return audio;
}

// ============================================================================
// DUAL INPUT CONTROLLER (PC KEYBOARD/MOUSE + MOBILE MULTI-TOUCH + MP CHAT)
// ============================================================================
function createInputController(ctx, audio, callbacks) {
  const coarsePointer = Boolean(ctx.isMobile || window.matchMedia('(pointer: coarse)').matches);

  const input = {
    keys: {},
    justPressed: {},
    moveX: 0,
    moveY: 0,
    moveZ: 0,
    joyX: 0,
    joyY: 0,
    joyMag: 0,
    steer: 0,
    throttle: 0,
    gas: 0,
    accel: 0,
    brake: 0,
    reverse: 0,
    handbrake: false,
    drift: false,
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    sprint: false,
    boost: false,
    jump: false,
    jumpPressed: false,
    jumpJustPressed: false,
    rappelUp: false,
    rappelDown: false,
    heliUp: false,
    heliDown: false,
    pitchForward: false,
    pitchBack: false,
    fire: false,
    shoot: false,
    attack: false,
    isFiring: false,
    fireJustPressed: false,
    shootJustPressed: false,
    aim: false,
    isAiming: false,
    interact: false,
    enterExit: false,
    interactJustPressed: false,
    enterExitJustPressed: false,
    enterJustPressed: false,
    useJustPressed: false,
    vehicleJustPressed: false,
    exitCarJustPressed: false,
    special: false,
    specialPressed: false,
    specialJustPressed: false,
    horn: false,
    hornJustPressed: false,
    sirenJustPressed: false,
    lookBehind: false,
    cameraPreset: 0,
    cameraJustPressed: false,
    camDeltaX: 0,
    camDeltaY: 0,
    mouseDeltaX: 0,
    mouseDeltaY: 0,
    pointerLocked: false,
    autoAim: true,
    isTouchDevice: coarsePointer,
    touchMode: 'auto',
    wheelOpen: false,
    phoneOpen: false,
    chatOpen: false,
    barClubOpen: false,
    shopOpen: false,
    paused: false,
    weaponSlotJustSelected: -1,
    weaponSlot: -1,
    selectedWeapon: null,
  };

  let mouseLeftDown = false;
  let mouseRightDown = false;
  let rightDragLastX = 0;
  let rightDragLastY = 0;
  let isRightDragging = false;

  let joyTouchId = null;
  let joyOriginX = 0;
  let joyOriginY = 0;
  let lookTouchId = null;
  let lookLastX = 0;
  let lookLastY = 0;
  let touchAimToggled = false;
  const touchButtonsHeld = {
    fire: false,
    gas: false,
    brake: false,
    drift: false,
    jump: false,
    rappelUp: false,
    rappelDown: false,
    horn: false,
    lookBehind: false,
  };

  function isTextInputFocused() {
    const el = document.activeElement;
    return !!(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable));
  }

  function isOverlayBlockingGameplay() {
    return !ctx.started || input.paused || input.phoneOpen || input.wheelOpen || input.chatOpen || input.barClubOpen || input.shopOpen || isTextInputFocused();
  }

  function setKeyState(e, down) {
    const code = e.code || '';
    const keyLower = (e.key || '').toLowerCase();
    if (down && !input.keys[code]) {
      input.justPressed[code] = true;
      if (keyLower) input.justPressed[keyLower] = true;
    }
    if (code) input.keys[code] = down;
    if (keyLower) input.keys[keyLower] = down;
  }

  window.addEventListener('keydown', (e) => {
    // Allow normal typing when Splash or Chat text inputs are focused
    if (isTextInputFocused()) {
      if (e.code === 'Escape' && input.chatOpen) {
        e.preventDefault();
        callbacks.closeChatModal();
      } else if (e.code === 'Enter' && input.chatOpen) {
        e.preventDefault();
        callbacks.submitChatModal();
      }
      return;
    }

    if (
      e.repeat &&
      (e.code === 'Tab' ||
        e.code === 'Backquote' ||
        e.code === 'KeyP' ||
        e.code === 'KeyG' ||
        e.code === 'KeyR' ||
        e.code === 'KeyX' ||
        e.code === 'KeyK' ||
        e.code === 'KeyT' ||
        e.code === 'Escape' ||
        e.code === 'KeyF' ||
        e.code === 'KeyE' ||
        e.code === 'KeyV' ||
        e.code === 'CapsLock')
    ) {
      e.preventDefault();
      return;
    }

    setKeyState(e, true);
    audio.unlock();

    if (!ctx.started) return;

    if (e.code === 'Backquote' && !input.chatOpen && !input.paused && !ctx.raceArena?.isActive?.()) {
      e.preventDefault();
      callbacks.toggleFullMap();
      return;
    }

    if (e.code === 'Escape') {
      e.preventDefault();
      if (input.mapOpen) {
        callbacks.closeFullMap();
      } else if (input.raceLobbyOpen) {
        callbacks.closeRaceLobby();
      } else if (ctx.raceArena?.isActive?.()) {
        ctx.raceArena.exitRaceArena();
      } else if (ctx.gameplay?.getTulenState?.().active) {
        ctx.gameplay.cancelTulenTargeting();
      } else if (input.shopOpen) {
        callbacks.closeDiscipleShop();
      } else if (input.barClubOpen) {
        callbacks.closeBarClub();
      } else if (input.chatOpen) {
        callbacks.closeChatModal();
      } else if (input.wheelOpen) {
        callbacks.closeWeaponWheel(true);
      } else if (input.phoneOpen) {
        callbacks.closePhone();
      } else {
        callbacks.togglePause();
      }
      return;
    }

    if (input.paused || input.chatOpen || input.barClubOpen || input.shopOpen || input.raceLobbyOpen || input.mapOpen || ctx.raceArena?.isActive?.()) return;

    // G: Trigger Gojo $100 Disciple 1km Map Nuke
    if (e.code === 'KeyG' && !input.phoneOpen && !input.wheelOpen) {
      e.preventDefault();
      callbacks.triggerGojoNuke();
      return;
    }

    // R: Tulen Lôi Điểu (1st press: Chọn mục tiêu, 2nd press: Bắn 1 hit kết liễu!)
    if (e.code === 'KeyR' && !input.phoneOpen && !input.wheelOpen) {
      e.preventDefault();
      ctx.gameplay?.toggleTulenTargeting?.();
      return;
    }

    // X: Cycle target while in Tulen Lôi Điểu targeting mode
    if (e.code === 'KeyX' && !input.phoneOpen && !input.wheelOpen) {
      if (ctx.gameplay?.getTulenState?.().active) {
        e.preventDefault();
        ctx.gameplay.cycleTulenTarget(1);
        return;
      }
    }

    // K: Messi & Ronaldo Skill — Mua Phiến Quân & Giảm Sao Truy Nã
    if (e.code === 'KeyK' && !input.phoneOpen && !input.wheelOpen) {
      e.preventDefault();
      ctx.gameplay?.triggerLegendBribeSkill?.();
      return;
    }

    // T: Open Truyền Âm Giang Hồ Chat
    if (e.code === 'KeyT') {
      e.preventDefault();
      callbacks.openChatModal();
      return;
    }

    // Tab: Hold to open 7-Slot Bát Quái Weapon Wheel
    if (e.code === 'Tab') {
      e.preventDefault();
      if (input.phoneOpen) callbacks.closePhone();
      callbacks.openWeaponWheel();
      return;
    }

    if (input.phoneOpen && /^[0-9]$/.test(e.key)) {
      e.preventDefault();
      if (!e.repeat && !e.altKey && !e.ctrlKey && !e.metaKey) callbacks.handlePhoneKey(e.key);
      return;
    }

    // Number keys 1-7: Quick weapon slot select
    if (e.code >= 'Digit1' && e.code <= 'Digit7') {
      const slotIdx = parseInt(e.code.slice(5), 10) - 1;
      callbacks.selectWeaponSlot(slotIdx, true);
      input.weaponSlotJustSelected = slotIdx;
      return;
    }

    // P or ArrowUp (when on foot & not rappelling): Toggle Linh Thông Ngọc Giản
    const inCar = !!(ctx.player?.inCar || ctx.player?.vehicle);
    const inRappel = !!ctx.player?.rappelState?.active;
    if (e.code === 'KeyP' || (e.code === 'ArrowUp' && !inCar && !inRappel && !input.keys.KeyW)) {
      if (e.code === 'KeyP' || !input.phoneOpen) {
        e.preventDefault();
        callbacks.togglePhone();
        return;
      }
    }

    if (input.phoneOpen) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Backspace'].includes(e.code)) {
        e.preventDefault();
        callbacks.handlePhoneKey(e.code);
        return;
      }
    }

    if (e.code === 'KeyF' || e.code === 'KeyE') {
      input.interactJustPressed = true;
      input.enterExitJustPressed = true;
      input.enterJustPressed = true;
      input.useJustPressed = true;
      input.vehicleJustPressed = true;
      input.exitCarJustPressed = true;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      input.jumpJustPressed = true;
    }

    if (e.code === 'KeyV' || e.code === 'CapsLock') {
      e.preventDefault();
      input.specialJustPressed = true;
      input.specialPressed = true;
    }

    if (e.code === 'KeyH') {
      input.hornJustPressed = true;
      input.sirenJustPressed = true;
      audio.playHorn();
    }

    if (e.code === 'KeyC') {
      input.cycleCamera();
    }
  });

  window.addEventListener('keyup', (e) => {
    setKeyState(e, false);
    if (e.code === 'Tab' && input.wheelOpen) {
      e.preventDefault();
      callbacks.closeWeaponWheel(true);
    }
  });

  window.addEventListener('blur', () => {
    input.keys = {};
    mouseLeftDown = false;
    mouseRightDown = false;
    isRightDragging = false;
  });

  const canvas = document.getElementById('game-canvas') || ctx.canvas;
  document.addEventListener('pointerlockchange', () => {
    input.pointerLocked = !!(canvas && document.pointerLockElement === canvas);
  });

  if (canvas) {
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('mousedown', (e) => {
      audio.unlock();
      if (isOverlayBlockingGameplay()) return;

      if (e.button === 0) {
        mouseLeftDown = true;
        input.fireJustPressed = true;
        input.shootJustPressed = true;
        if (!input.pointerLocked && !input.isTouchDevice && canvas.requestPointerLock) {
          try {
            const p = canvas.requestPointerLock();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } catch (_) {}
        }
      } else if (e.button === 2) {
        e.preventDefault();
        mouseRightDown = true;
        isRightDragging = true;
        rightDragLastX = e.clientX;
        rightDragLastY = e.clientY;
      }
    });
  }

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouseLeftDown = false;
    if (e.button === 2) {
      mouseRightDown = false;
      isRightDragging = false;
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (input.wheelOpen) {
      callbacks.handleWheelPointer(e.clientX, e.clientY);
      return;
    }
    if (isOverlayBlockingGameplay()) return;

    if (input.pointerLocked) {
      const dx = Number(e.movementX) || 0;
      const dy = Number(e.movementY) || 0;
      input.mouseDeltaX += dx;
      input.mouseDeltaY += dy;
      input.camDeltaX += dx;
      input.camDeltaY += dy;
    } else if (isRightDragging) {
      const dx = e.clientX - rightDragLastX;
      const dy = e.clientY - rightDragLastY;
      rightDragLastX = e.clientX;
      rightDragLastY = e.clientY;
      input.mouseDeltaX += dx;
      input.mouseDeltaY += dy;
      input.camDeltaX += dx * 1.3;
      input.camDeltaY += dy * 1.15;
    }
  });

  function setupTouchControls() {
    const touchRoot = document.getElementById('touch-controls');
    const joyZone = document.getElementById('joystick-zone');
    const joyBase = document.getElementById('joystick-base');
    const joyKnob = document.getElementById('joystick-knob');
    const lookZone = document.getElementById('touch-look-zone');
    const actionsRoot = document.getElementById('touch-actions');
    let maxRadius = 44;
    let resetStick = () => {};
    const releaseActions = [];

    input.resetTouchControls = () => {
      resetStick();
      lookTouchId = null;
      releaseActions.forEach((release) => release());
      if (touchAimToggled) input.resetTouchAim();
    };
    window.addEventListener('blur', input.resetTouchControls);
    window.matchMedia('(orientation: portrait)').addEventListener('change', input.resetTouchControls);
    input.setTouchControlsBlocked = (blocked) => {
      if (!touchRoot || touchRoot.inert === blocked) return;
      touchRoot.inert = blocked;
      if (blocked) input.resetTouchControls();
    };

    window.addEventListener(
      'touchstart',
      () => {
        audio.unlock();
        if (!input.isTouchDevice) {
          input.isTouchDevice = true;
          callbacks.syncTouchVisibility();
        }
      },
      { passive: true }
    );

    if (joyZone && joyBase && joyKnob) {
      const updateStick = (clientX, clientY) => {
        const dx = clientX - joyOriginX;
        const dy = clientY - joyOriginY;
        const dist = Math.hypot(dx, dy);
        const clamped = Math.min(dist, maxRadius);
        const angle = dist > 0.001 ? Math.atan2(dy, dx) : 0;
        const kx = Math.cos(angle) * clamped;
        const ky = Math.sin(angle) * clamped;
        joyKnob.style.transform = `translate(${kx.toFixed(1)}px, ${ky.toFixed(1)}px)`;

        const norm = clamped / maxRadius;
        if (norm < 0.10) {
          input.joyX = 0;
          input.joyY = 0;
          input.joyMag = 0;
        } else {
          input.joyX = clamp(kx / maxRadius, -1, 1);
          input.joyY = clamp(ky / maxRadius, -1, 1);
          input.joyMag = norm;
        }
        joyBase.classList.toggle('sprinting', input.joyMag >= 0.70);
      };

      resetStick = () => {
        joyTouchId = null;
        input.joyX = 0;
        input.joyY = 0;
        input.joyMag = 0;
        joyKnob.style.transform = 'translate(0px, 0px)';
        joyBase.classList.remove('sprinting');
        joyBase.style.left = '';
        joyBase.style.top = '';
        joyBase.style.bottom = '';
      };

      joyZone.addEventListener(
        'touchstart',
        (e) => {
          if (joyTouchId !== null) return;
          const t = e.changedTouches[0];
          if (!t) return;
          e.preventDefault();
          joyTouchId = t.identifier;
          joyOriginX = t.clientX;
          joyOriginY = t.clientY;
          const zoneRect = joyZone.getBoundingClientRect();
          maxRadius = Math.min(44, joyBase.offsetWidth * 0.41);
          joyBase.style.bottom = 'auto';
          joyBase.style.left = `${t.clientX - zoneRect.left}px`;
          joyBase.style.top = `${t.clientY - zoneRect.top - joyBase.offsetHeight / 2}px`;
          updateStick(t.clientX, t.clientY);
        },
        { passive: false }
      );

      joyZone.addEventListener(
        'touchmove',
        (e) => {
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === joyTouchId) {
              e.preventDefault();
              updateStick(t.clientX, t.clientY);
              break;
            }
          }
        },
        { passive: false }
      );

      const endHandler = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === joyTouchId) {
            resetStick();
            break;
          }
        }
      };
      joyZone.addEventListener('touchend', endHandler);
      joyZone.addEventListener('touchcancel', endHandler);
    }

    if (lookZone) {
      lookZone.addEventListener(
        'touchstart',
        (e) => {
          if (lookTouchId !== null) return;
          const t = e.changedTouches[0];
          if (!t) return;
          e.preventDefault();
          lookTouchId = t.identifier;
          lookLastX = t.clientX;
          lookLastY = t.clientY;
        },
        { passive: false }
      );

      lookZone.addEventListener(
        'touchmove',
        (e) => {
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === lookTouchId) {
              e.preventDefault();
              const dx = t.clientX - lookLastX;
              const dy = t.clientY - lookLastY;
              lookLastX = t.clientX;
              lookLastY = t.clientY;
              input.mouseDeltaX += dx;
              input.mouseDeltaY += dy;
              input.camDeltaX += dx * 1.65;
              input.camDeltaY += dy * 1.35;
              break;
            }
          }
        },
        { passive: false }
      );

      const endLook = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === lookTouchId) {
            lookTouchId = null;
            break;
          }
        }
      };
      lookZone.addEventListener('touchend', endLook);
      lookZone.addEventListener('touchcancel', endLook);
    }

    if (actionsRoot) {
      const btns = actionsRoot.querySelectorAll('.touch-btn');
      btns.forEach((btn) => {
        const act = btn.getAttribute('data-act');
        let dragFireX = 0;
        let dragFireY = 0;
        let activeTouch = null;

        btn.addEventListener(
          'touchstart',
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (activeTouch !== null || isOverlayBlockingGameplay()) return;
            audio.unlock();
            const t = e.changedTouches[0];
            if (!t) return;
            activeTouch = t.identifier;
            dragFireX = t.clientX;
            dragFireY = t.clientY;
            btn.classList.add('pressed');

            if (act === 'aim') {
              touchAimToggled = !touchAimToggled;
              btn.classList.toggle('toggled', touchAimToggled);
            } else if (act === 'interact') {
              input.interactJustPressed = true;
              input.enterExitJustPressed = true;
              input.enterJustPressed = true;
              input.useJustPressed = true;
              input.vehicleJustPressed = true;
              input.exitCarJustPressed = true;
              input.interact = true;
              input.enterExit = true;
            } else if (act === 'special') {
              input.specialJustPressed = true;
              input.specialPressed = true;
            } else if (act === 'jump') {
              touchButtonsHeld.jump = true;
              input.jumpJustPressed = true;
            } else if (act === 'horn') {
              touchButtonsHeld.horn = true;
              input.hornJustPressed = true;
              input.sirenJustPressed = true;
              audio.playHorn();
            } else if (act === 'fire') {
              touchButtonsHeld.fire = true;
              input.fireJustPressed = true;
              input.shootJustPressed = true;
            } else if (act && act in touchButtonsHeld) {
              touchButtonsHeld[act] = true;
            }
          },
          { passive: false }
        );

        btn.addEventListener(
          'touchmove',
          (e) => {
            if (act !== 'fire' || activeTouch === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
              const t = e.changedTouches[i];
              if (t.identifier === activeTouch) {
                const dx = t.clientX - dragFireX;
                const dy = t.clientY - dragFireY;
                dragFireX = t.clientX;
                dragFireY = t.clientY;
                input.camDeltaX += dx * 1.45;
                input.camDeltaY += dy * 1.15;
                break;
              }
            }
          },
          { passive: false }
        );

        const release = () => {
          if (activeTouch === null) return;
          activeTouch = null;
          btn.classList.remove('pressed');
          if (act === 'interact') {
            input.interact = false;
            input.enterExit = false;
          } else if (act && act in touchButtonsHeld) {
            touchButtonsHeld[act] = false;
          }
        };
        releaseActions.push(release);
        const releaseBtn = (e) => {
          if (!Array.from(e.changedTouches).some((touch) => touch.identifier === activeTouch)) return;
          e.preventDefault();
          release();
        };
        btn.addEventListener('touchend', releaseBtn, { passive: false });
        btn.addEventListener('touchcancel', releaseBtn, { passive: false });
      });
    }
  }

  setupTouchControls();

  input.update = function updateInput() {
    const blocked = isOverlayBlockingGameplay();
    input.setTouchControlsBlocked(blocked);
    const k = input.keys;
    const inCar = !!(ctx.player?.inCar || ctx.player?.vehicle);
    const isHeli = !!(ctx.player?.inCar?.type === 'heli');

    if (blocked) {
      input.moveX = 0;
      input.moveY = 0;
      input.moveZ = 0;
      input.steer = 0;
      input.throttle = 0;
      input.gas = 0;
      input.accel = 0;
      input.brake = 0;
      input.reverse = 0;
      input.handbrake = false;
      input.drift = false;
      input.forward = false;
      input.backward = false;
      input.left = false;
      input.right = false;
      input.sprint = false;
      input.boost = false;
      input.jump = false;
      input.jumpPressed = false;
      input.fire = false;
      input.shoot = false;
      input.attack = false;
      input.isFiring = false;
      input.aim = false;
      input.isAiming = false;
      input.rappelUp = false;
      input.rappelDown = false;
      input.lookBehind = false;
      if (ctx.player) {
        ctx.player.isAiming = false;
        ctx.player.isFiring = false;
      }
      return;
    }

    const kbLeft = !!(k.KeyA || k.ArrowLeft);
    const kbRight = !!(k.KeyD || k.ArrowRight);
    const kbUp = !!(k.KeyW || (k.ArrowUp && (inCar || ctx.player?.rappelState?.active)));
    const kbDown = !!(k.KeyS || k.ArrowDown);
    const kbShift = !!(k.ShiftLeft || k.ShiftRight);
    const kbSpace = !!k.Space;

    let mx = (kbRight ? 1 : 0) - (kbLeft ? 1 : 0);
    let my = (kbUp ? 1 : 0) - (kbDown ? 1 : 0);
    const stickUp = -input.joyY;

    if (Math.abs(input.joyX) > 0.01 || Math.abs(stickUp) > 0.01) {
      mx = clamp(mx + input.joyX, -1, 1);
      if (!inCar || isHeli) {
        my = clamp(my + stickUp, -1, 1);
      }
    }

    if (touchButtonsHeld.rappelUp) my = 1;
    if (touchButtonsHeld.rappelDown) my = -1;

    let thr = kbUp ? 1 : 0;
    let brk = kbDown ? 1 : 0;
    if (touchButtonsHeld.gas) thr = 1;
    if (touchButtonsHeld.brake) brk = 1;
    if (inCar && !isHeli && !touchButtonsHeld.gas && !touchButtonsHeld.brake && Math.abs(stickUp) > 0.25) {
      if (stickUp > 0.25) thr = Math.max(thr, stickUp);
      if (stickUp < -0.25) brk = Math.max(brk, -stickUp);
    }
    if (inCar && (touchButtonsHeld.gas || touchButtonsHeld.brake)) {
      my = thr - brk;
    }

    input.moveX = mx;
    input.moveY = my;
    if (isHeli) {
      const arrowPitch = (k.ArrowUp ? 1 : 0) - (k.ArrowDown ? 1 : 0);
      input.moveZ = Math.abs(input.joyY) > 0.12 ? input.joyY : -arrowPitch;
    } else {
      input.moveZ = -my;
    }
    input.steer = mx;
    input.throttle = thr;
    input.gas = thr;
    input.accel = thr;
    input.brake = brk;
    input.reverse = brk;

    input.forward = my > 0.15;
    input.backward = my < -0.15;
    input.left = mx < -0.15;
    input.right = mx > 0.15;
    input.up = input.forward;
    input.down = input.backward;

    input.sprint = kbShift || (!inCar && input.joyMag >= 0.70);
    input.boost = kbShift;

    input.handbrake = kbSpace || touchButtonsHeld.drift;
    input.drift = input.handbrake;
    input.jump = kbSpace || touchButtonsHeld.jump;
    input.jumpPressed = input.jump;

    input.rappelUp = !!(k.KeyW || k.ArrowUp || touchButtonsHeld.rappelUp || stickUp > 0.35);
    input.rappelDown = !!(k.KeyS || k.ArrowDown || touchButtonsHeld.rappelDown || stickUp < -0.35);

    input.heliUp = !!(k.KeyW || kbSpace || touchButtonsHeld.gas || touchButtonsHeld.drift);
    input.heliDown = !!(k.KeyS || kbShift || touchButtonsHeld.brake);
    input.pitchForward = !!(k.ArrowUp || stickUp > 0.3);
    input.pitchBack = !!(k.ArrowDown || stickUp < -0.3);

    input.aim = mouseRightDown || touchAimToggled;
    input.isAiming = input.aim;

    input.fire = mouseLeftDown || touchButtonsHeld.fire;
    input.shoot = input.fire;
    input.attack = input.fire;
    input.isFiring = input.fire;

    input.interact = !!(k.KeyF || k.KeyE);
    input.enterExit = input.interact;
    input.horn = !!(k.KeyH || touchButtonsHeld.horn);
    input.lookBehind = !!(k.KeyQ || touchButtonsHeld.lookBehind);

    if (ctx.player) {
      ctx.player.isAiming = input.aim && !inCar;
      ctx.player.isFiring = input.fire;
      ctx.player.autoAim = input.autoAim;
    }
  };

  input.endFrame = function endFrame() {
    input.justPressed = {};
    input.jumpJustPressed = false;
    input.fireJustPressed = false;
    input.shootJustPressed = false;
    input.interactJustPressed = false;
    input.enterExitJustPressed = false;
    input.enterJustPressed = false;
    input.useJustPressed = false;
    input.vehicleJustPressed = false;
    input.exitCarJustPressed = false;
    input.specialJustPressed = false;
    input.specialPressed = false;
    input.hornJustPressed = false;
    input.sirenJustPressed = false;
    input.cameraJustPressed = false;
    input.weaponSlotJustSelected = -1;
    input.weaponSlot = -1;
    input.selectedWeapon = null;
    input.camDeltaX = 0;
    input.camDeltaY = 0;
    input.mouseDeltaX = 0;
    input.mouseDeltaY = 0;
  };

  input.consumeDeltas = input.endFrame;

  input.cycleCamera = () => {
    input.cameraPreset = (input.cameraPreset + 1) % 3;
    input.cameraJustPressed = true;
  };

  input.resetTouchAim = function resetTouchAim() {
    touchAimToggled = false;
    const aimBtns = document.querySelectorAll('.touch-btn[data-act="aim"]');
    aimBtns.forEach((b) => b.classList.remove('toggled'));
  };

  return input;
}

// ============================================================================
// MAIN UI, MINIMAP RADAR, BÁT QUÁI WHEEL, NGỌC GIẢN & MP CHAT SYSTEM (ctx.ui)
// ============================================================================
export function createUIAudioAndInput(ctx) {
  ensureDOM();

  let recoilFlashTimer = 0;
  const audio = createAudioEngine(ctx, () => {
    recoilFlashTimer = 0.09;
  });

  const dom = {
    damageFlash: document.getElementById('damage-flash'),
    mpRoomBadge: document.getElementById('mp-room-badge'),
    mpChatFeed: document.getElementById('mp-chat-feed'),
    mpChatModal: document.getElementById('mp-chat-modal'),
    mpChatInput: document.getElementById('mp-chat-input'),
    mpChatSend: document.getElementById('mp-chat-send'),
    btnOpenChat: document.getElementById('btn-open-chat'),
    wantedStars: document.getElementById('wanted-stars'),
    starSpans: Array.from(document.querySelectorAll('#wanted-stars .star')),
    cashDisplay: document.getElementById('cash-display'),
    invulnerabilityStatus: document.getElementById('invulnerability-status'),
    noCooldownStatus: document.getElementById('no-cooldown-status'),
    gojoNukeBtn: document.getElementById('gojo-nuke-btn'),
    tulenSkillBtn: document.getElementById('tulen-skill-btn'),
    legendBribeBtn: document.getElementById('legend-bribe-btn'),
    tulenTargetBar: document.getElementById('tulen-target-bar'),
    tulenTargetInfo: document.getElementById('tulen-target-info'),
    tulenFireBtn: document.getElementById('tulen-fire-btn'),
    tulenCycleBtn: document.getElementById('tulen-cycle-btn'),
    tulenCancelBtn: document.getElementById('tulen-cancel-btn'),
    bossHpHud: document.getElementById('boss-hp-hud'),
    raceArenaModal: document.getElementById('race-arena-modal'),
    raceBalance: document.getElementById('race-balance'),
    raceCloseBtn: document.getElementById('race-close-btn'),
    raceModalBody: document.getElementById('race-modal-body'),
    raceHud: document.getElementById('race-hud'),
    raceRankTxt: document.getElementById('race-rank-txt'),
    raceLapTxt: document.getElementById('race-lap-txt'),
    raceSpdTxt: document.getElementById('race-spd-txt'),
    raceMapBadge: document.getElementById('race-map-badge'),
    raceCountdownBanner: document.getElementById('race-countdown-banner'),
    raceFeedList: document.getElementById('race-feed-list'),
    raceLeaderboard: document.getElementById('race-leaderboard'),
    raceHpTxt: document.getElementById('race-hp-txt'),
    raceHpFill: document.getElementById('race-hp-fill'),
    raceNitroTxt: document.getElementById('race-nitro-txt'),
    raceNitroFill: document.getElementById('race-nitro-fill'),
    raceSkillBtn: document.getElementById('race-skill-btn'),
    raceNitroBtn: document.getElementById('race-nitro-btn'),
    raceResetCarBtn: document.getElementById('race-reset-car-btn'),
    raceExitBtn: document.getElementById('race-exit-btn'),
    raceSpectateCamBtn: document.getElementById('race-spectate-cam-btn'),
    raceFinishOverlay: document.getElementById('race-finish-overlay'),
    fullMapModal: document.getElementById('full-map-modal'),
    fullMapCanvas: document.getElementById('full-map-canvas'),
    fullMapLegend: document.getElementById('full-map-legend'),
    fullMapCoords: document.getElementById('full-map-coords'),
    fullMapClearGps: document.getElementById('full-map-clear-gps'),
    fullMapCloseBtn: document.getElementById('full-map-close-btn'),
    cashDelta: document.getElementById('cash-delta'),
    weaponHud: document.getElementById('weapon-hud'),
    weaponSvg: document.getElementById('weapon-hud-svg'),
    weaponName: document.getElementById('weapon-name'),
    weaponAmmo: document.getElementById('weapon-ammo'),
    btnOpenPhone: document.getElementById('btn-open-phone'),
    btnOpenPause: document.getElementById('btn-open-pause'),
    btnCycleCamera: document.getElementById('btn-cycle-camera'),
    btnFullscreen: document.getElementById('btn-fullscreen'),
    fullscreenStatus: document.getElementById('fullscreen-status'),
    missionTimerBox: document.getElementById('mission-timer-box'),
    missionTimerLabel: document.getElementById('mission-timer-label'),
    missionTimerVal: document.getElementById('mission-timer-val'),
    crosshair: document.getElementById('crosshair'),
    hitmarker: document.getElementById('hitmarker'),
    interactPrompt: document.getElementById('interact-prompt'),
    notifFeed: document.getElementById('notification-feed'),
    minimapContainer: document.getElementById('minimap-container'),
    minimapCanvas: document.getElementById('minimap-canvas'),
    minimapNorth: document.getElementById('minimap-north'),
    minimapGpsBadge: document.getElementById('minimap-gps-badge'),
    healthFill: document.getElementById('health-bar-fill'),
    armorFill: document.getElementById('armor-bar-fill'),
    specialFill: document.getElementById('special-bar-fill'),
    subtitleBar: document.getElementById('subtitle-bar'),
    locationHud: document.getElementById('location-hud'),
    speedPill: document.getElementById('speedometer-pill'),
    speedNum: document.getElementById('speed-num'),
    speedGear: document.getElementById('speed-gear'),
    vehicleCallout: document.getElementById('vehicle-callout'),
    streetName: document.getElementById('street-name'),
    zoneName: document.getElementById('zone-name'),
    gtaBanner: document.getElementById('gta-banner'),
    gtaBannerTitle: document.getElementById('gta-banner-title'),
    gtaBannerSub: document.getElementById('gta-banner-sub'),
    weaponWheel: document.getElementById('weapon-wheel'),
    wheelSvg: document.getElementById('weapon-wheel-svg'),
    wheelSelectedName: document.getElementById('wheel-selected-name'),
    wheelSelectedAmmo: document.getElementById('wheel-selected-ammo'),
    wheelStatDmg: document.getElementById('wheel-stat-dmg'),
    wheelStatRate: document.getElementById('wheel-stat-rate'),
    wheelStatRng: document.getElementById('wheel-stat-rng'),
    phoneEl: document.getElementById('ifruit-phone'),
    phoneClock: document.getElementById('phone-clock'),
    phoneHeader: document.getElementById('phone-header'),
    phoneBody: document.getElementById('phone-body'),
    phoneBackBtn: document.getElementById('phone-back-btn'),
    phoneCloseBtn: document.getElementById('phone-close-btn'),
    barClubModal: document.getElementById('bar-club-modal'),
    txBalance: document.getElementById('tx-balance'),
    txGpsShopBtn: document.getElementById('tx-gps-shop-btn'),
    txCloseBtn: document.getElementById('tx-close-btn'),
    txBowl: document.getElementById('tx-bowl'),
    txDice: [
      document.getElementById('tx-die-1'),
      document.getElementById('tx-die-2'),
      document.getElementById('tx-die-3'),
    ],
    txResultBanner: document.getElementById('tx-result-banner'),
    txHistory: document.getElementById('tx-history'),
    txBetInput: document.getElementById('tx-bet-input'),
    txRollBtn: document.getElementById('tx-roll-btn'),
    discipleShopModal: document.getElementById('disciple-shop-modal'),
    shopBalance: document.getElementById('shop-balance'),
    shopSquadCount: document.getElementById('shop-squad-count'),
    shopGpsClubBtn: document.getElementById('shop-gps-club-btn'),
    shopCloseBtn: document.getElementById('shop-close-btn'),
    discipleShopList: document.getElementById('disciple-shop-list'),
    touchControls: document.getElementById('touch-controls'),
    clusterOnFoot: document.getElementById('cluster-onfoot'),
    clusterDriving: document.getElementById('cluster-driving'),
    clusterRappel: document.getElementById('cluster-rappel'),
    tbtnInteract: document.getElementById('tbtn-context-interact'),
    tbtnDrift: document.getElementById('tbtn-drift-label'),
    pauseMenu: document.getElementById('pause-menu'),
    btnResume: document.getElementById('btn-resume-game'),
    btnSave: document.getElementById('btn-save-game'),
    btnQuality: document.getElementById('btn-cycle-quality'),
    btnWeather: document.getElementById('btn-cycle-weather'),
    btnToggleTouch: document.getElementById('btn-toggle-touch'),
    splashScreen: document.getElementById('splash-screen'),
    btnStartGame: document.getElementById('btn-start-game'),
    btnContinueGame: document.getElementById('btn-continue-game'),
    btnNewGame: document.getElementById('btn-new-game'),
    btnJoinOnline: document.getElementById('btn-join-online'),
  };

  let lastCash = ctx.player ? Number(ctx.player.cash) || 0 : 7860;
  let lastHp = ctx.player ? Number(ctx.player.hp) || 100 : 100;
  let damageFlashTimer = 0;
  let hitmarkerTimer = 0;
  let bannerTimer = 0;
  let subtitleTimer = 0;
  let persistentObjective = '';
  let explicitPrompt = '';
  let explicitPromptTimer = 0;
  let vehicleCalloutTimer = 0;
  let lastVehicleRef = null;
  let lastStreetKey = '';
  let zoneFlashTimer = 0;
  let hoveredWheelSlot = 1; // Default to Thanh Phong Kiếm!
  let preWheelTimeScale = 1.0;
  let phoneCurrentApp = 'home';
  let phoneFocusIdx = 0;
  let phoneDialed = '';
  let phoneDialPending = false;
  let virtualMinutes = 14 * 60 + 30;
  let qualityIdx = Math.max(
    0,
    QUALITY_PRESETS.findIndex((q) => q.id === (ctx.engine?.quality || (ctx.isMobile ? 'MOBILE' : 'HIGH')))
  );
  let weatherIdx = 0;
  let radarScaleSmoothed = 1.18;
  let hudUpdateAccum = 0;
  let minimapDrawAccum = 0.1;
  let cachedMinimapBlocks = null;
  let lastInteractPrompt = '';
  let wasRappelling = false;

  const input = createInputController(ctx, audio, {
    openWeaponWheel: () => openWeaponWheel(),
    closeWeaponWheel: (commit) => closeWeaponWheel(commit),
    handleWheelPointer: (cx, cy) => updateWheelHoverFromPoint(cx, cy),
    selectWeaponSlot: (idx, notify) => equipWeaponSlot(idx, notify),
    togglePhone: () => togglePhone(),
    closePhone: () => closePhone(),
    handlePhoneKey: (code) => handlePhoneKey(code),
    closeDiscipleShop: () => closeDiscipleShop(),
    closeRaceLobby: () => closeRaceLobby(),
    toggleFullMap: () => toggleFullMap(),
    closeFullMap: () => closeFullMap(),
    closeBarClub: () => closeBarClub(),
    triggerGojoNuke: () => triggerGojoNukeAction(),
    togglePause: () => togglePause(),
    syncTouchVisibility: () => syncTouchVisibility(),
    openChatModal: () => openChatModal(),
    closeChatModal: () => closeChatModal(),
    submitChatModal: () => submitChatModal(),
  });

  function syncTouchVisibility() {
    if (!dom.touchControls) return;
    const shouldShow =
      input.touchMode === 'on' || (input.touchMode === 'auto' && input.isTouchDevice);
    dom.touchControls.classList.toggle('hidden', !shouldShow);
    document.body.classList.toggle('touch-hud-visible', shouldShow);
    document.body.classList.toggle('touch-device', input.isTouchDevice);
    if (!shouldShow) input.resetTouchControls();
    dom.btnFullscreen?.classList.toggle('hidden', !input.isTouchDevice || !document.fullscreenEnabled);
    if (dom.btnToggleTouch) {
      const labelMap = { auto: 'TỰ ĐỘNG', on: 'BẬT', off: 'TẮT' };
      dom.btnToggleTouch.textContent = `ĐIỀU KHIỂN CẢM ỨNG: ${labelMap[input.touchMode]}`;
    }
  }

  // --------------------------------------------------------------------------
  // Multiplayer Truyền Âm Chat & Room Badge Helpers
  // --------------------------------------------------------------------------
  function appendChatMessage(name, text, isSystem = false) {
    if (!dom.mpChatFeed || !text) return;
    const line = document.createElement('div');
    line.className = 'mp-chat-line';
    if (isSystem) {
      line.style.borderLeftColor = '#f0c35a';
      line.innerHTML = `<b>[Giang Hồ]</b> ${escapeHTML(text)}`;
    } else {
      line.innerHTML = `<b>${escapeHTML(name || 'Hiệp Khách')}:</b> ${escapeHTML(text)}`;
    }
    dom.mpChatFeed.appendChild(line);

    while (dom.mpChatFeed.children.length > 6) {
      dom.mpChatFeed.removeChild(dom.mpChatFeed.firstChild);
    }

    setTimeout(() => {
      line.style.opacity = '0';
      setTimeout(() => {
        if (line.parentNode) line.parentNode.removeChild(line);
      }, 520);
    }, 12000);
  }

  function updateRoomBadge(text, visible = true) {
    if (!dom.mpRoomBadge) return;
    dom.mpRoomBadge.textContent = text || '';
    dom.mpRoomBadge.classList.toggle('hidden', !visible);
  }

  function openChatModal() {
    if (!ctx.started || input.paused || !dom.mpChatModal) return;
    if (input.wheelOpen) closeWeaponWheel(false);
    if (input.phoneOpen) closePhone();
    input.chatOpen = true;
    if (document.pointerLockElement && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (_) {}
    }
    dom.mpChatModal.classList.remove('hidden');
    if (dom.mpChatInput) {
      dom.mpChatInput.value = '';
      dom.mpChatInput.focus({ preventScroll: true });
    }
    audio.playPhoneTap();
  }

  function closeChatModal() {
    if (!input.chatOpen) return;
    input.chatOpen = false;
    if (dom.mpChatModal) dom.mpChatModal.classList.add('hidden');
    if (dom.mpChatInput) dom.mpChatInput.blur();
  }

  function submitChatModal() {
    const raw = dom.mpChatInput ? dom.mpChatInput.value.trim() : '';
    closeChatModal();
    if (!raw) return;
    if (ctx.mp?.connected && typeof ctx.mp.sendChat === 'function') {
      ctx.mp.sendChat(raw);
    } else {
      appendChatMessage(ctx.player?.name || 'Hiệp Khách', raw, false);
    }
    audio.playPhoneTap();
  }

  if (dom.btnOpenChat) {
    dom.btnOpenChat.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.unlock();
      if (input.chatOpen) closeChatModal();
      else openChatModal();
    });
  }
  if (dom.mpChatSend) {
    dom.mpChatSend.addEventListener('click', (e) => {
      e.stopPropagation();
      submitChatModal();
    });
  }

  // --------------------------------------------------------------------------
  // Weapon Resolution & 7-Slot Bát Quái Radial Weapon Wheel
  // --------------------------------------------------------------------------
  function isSlotUnlocked(slot) {
    const u = ctx.player?.unlockedWeapons;
    if (!u) return true;
    if (Array.isArray(u)) {
      const idx = WEAPON_WHEEL_SLOTS.findIndex((s) => s.id === slot.id);
      return u.includes(slot.id) || !!u[idx];
    }
    if (u instanceof Set) return u.has(slot.id);
    if (typeof u === 'object') return u[slot.id] !== false;
    return true;
  }

  function getSlotAmmoText(slot) {
    if (slot.melee) return '∞';
    const p = ctx.player;
    if (!p) return '0';
    const reserveRaw = p.ammo?.[slot.id];
    const clipRaw = p.clip?.[slot.id] ?? p.clipAmmo?.[slot.id];
    if (!Number.isFinite(reserveRaw)) return '∞';
    if (Number.isFinite(clipRaw)) {
      return `${Math.max(0, Math.floor(clipRaw))} / ${Math.max(0, Math.floor(reserveRaw))}`;
    }
    return `${Math.max(0, Math.floor(reserveRaw))}`;
  }

  function getActiveSlotIndex() {
    const p = ctx.player;
    if (!p) return 1;
    const wid = p.weaponId || p.currentWeapon || p.weapon;
    if (wid) {
      const found = WEAPON_WHEEL_SLOTS.findIndex((s) => s.id === wid);
      if (found !== -1) return found;
    }
    if (Number.isFinite(p.weaponIdx)) return clamp(p.weaponIdx, 0, WEAPON_WHEEL_SLOTS.length - 1);
    return 1;
  }

  function equipWeaponSlot(slotIdx, playSound = true) {
    const idx = clamp(slotIdx, 0, WEAPON_WHEEL_SLOTS.length - 1);
    const slot = WEAPON_WHEEL_SLOTS[idx];
    if (!slot || !isSlotUnlocked(slot)) {
      if (playSound) audio.playPhoneError();
      return false;
    }
    const p = ctx.player;
    if (p) {
      p.weaponIdx = idx;
      p.weaponIndex = idx;
      p.weaponId = slot.id;
      p.currentWeapon = slot.id;
      p.weapon = slot.id;
      p.activeWeapon = slot.id;
      p.equippedWeapon = slot.id;
    }
    input.weaponSlot = idx;
    input.selectedWeapon = slot.id;
    if (ctx.characters && typeof ctx.characters.equipWeapon === 'function') {
      try {
        ctx.characters.equipWeapon(p?.rig || p, slot.id);
      } catch (_) {}
    }
    if (playSound) {
      if (slot.id === 'bat') audio.playSwordSlash();
      else audio.playPhoneTap();
    }
    return true;
  }

  function refreshWheelVisuals() {
    if (!dom.wheelSvg) return;
    const slices = dom.wheelSvg.querySelectorAll('.wheel-slice');
    const activeIdx = getActiveSlotIndex();
    slices.forEach((el, idx) => {
      const slot = WEAPON_WHEEL_SLOTS[idx];
      const unlocked = isSlotUnlocked(slot);
      el.classList.toggle('locked', !unlocked);
      el.classList.toggle('active', idx === activeIdx);
      el.classList.toggle('hovered', idx === hoveredWheelSlot);
      const ammoNode = document.getElementById(`wheel-ammo-${slot.id}`);
      if (ammoNode) ammoNode.textContent = unlocked ? getSlotAmmoText(slot) : 'KHÓA';
    });

    const cur = WEAPON_WHEEL_SLOTS[hoveredWheelSlot] || WEAPON_WHEEL_SLOTS[activeIdx];
    if (dom.wheelSelectedName) dom.wheelSelectedName.textContent = cur.fullName;
    if (dom.wheelSelectedAmmo) {
      dom.wheelSelectedAmmo.textContent = isSlotUnlocked(cur)
        ? (cur.melee ? 'Nội Lực: ∞' : `Đạn: ${getSlotAmmoText(cur)}`)
        : 'Chưa mở khóa';
    }
    if (dom.wheelStatDmg) dom.wheelStatDmg.style.width = `${cur.dmg}%`;
    if (dom.wheelStatRate) dom.wheelStatRate.style.width = `${cur.rate}%`;
    if (dom.wheelStatRng) dom.wheelStatRng.style.width = `${cur.range}%`;
  }

  function openWeaponWheel() {
    if (input.wheelOpen || input.paused || !ctx.started) return;
    if (input.phoneOpen) closePhone();
    if (input.chatOpen) closeChatModal();
    input.wheelOpen = true;
    dom.weaponHud?.setAttribute('aria-expanded', 'true');
    hoveredWheelSlot = getActiveSlotIndex();
    preWheelTimeScale = ctx.timeScale || 1.0;
    ctx.timeScale = ctx.mp?.connected ? 1.0 : Math.min(preWheelTimeScale, 0.18);
    if (document.pointerLockElement && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (_) {}
    }
    if (dom.weaponWheel) dom.weaponWheel.classList.remove('hidden');
    refreshWheelVisuals();
    audio.playPhoneTap();
  }

  function closeWeaponWheel(commitSelection = true) {
    if (!input.wheelOpen) return;
    input.wheelOpen = false;
    dom.weaponHud?.setAttribute('aria-expanded', 'false');
    if (dom.weaponWheel) dom.weaponWheel.classList.add('hidden');
    if (commitSelection) {
      equipWeaponSlot(hoveredWheelSlot, true);
    }
    if (!ctx.player?.isDead && !ctx.player?.isBusted) {
      ctx.timeScale = ctx.mp?.connected ? 1.0 : ctx.player?.specialActive ? 0.36 : 1.0;
    }
  }

  function updateWheelHoverFromPoint(clientX, clientY) {
    if (!dom.wheelSvg) return;
    const rect = dom.wheelSvg.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < 28) return;

    const count = WEAPON_WHEEL_SLOTS.length;
    const step = (Math.PI * 2) / count;
    let rel = Math.atan2(dy, dx) - (-Math.PI / 2 - step / 2);
    while (rel < 0) rel += Math.PI * 2;
    while (rel >= Math.PI * 2) rel -= Math.PI * 2;
    const idx = clamp(Math.floor(rel / step), 0, count - 1);
    if (idx !== hoveredWheelSlot) {
      hoveredWheelSlot = idx;
      audio.playPhoneTap();
      refreshWheelVisuals();
    }
  }

  if (dom.weaponHud) {
    dom.weaponHud.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.unlock();
      if (input.wheelOpen) closeWeaponWheel(true);
      else openWeaponWheel();
    });
  }

  if (dom.weaponWheel) {
    dom.weaponWheel.addEventListener('pointermove', (e) => {
      if (input.wheelOpen) updateWheelHoverFromPoint(e.clientX, e.clientY);
    });
    dom.weaponWheel.addEventListener('click', (e) => {
      if (!input.wheelOpen) return;
      if (e.pointerType === 'touch' || input.isTouchDevice) {
        const slot = e.target.closest('.wheel-slice');
        if (slot) hoveredWheelSlot = Number(slot.dataset.slot);
        closeWeaponWheel(Boolean(slot));
        return;
      }
      updateWheelHoverFromPoint(e.clientX, e.clientY);
      closeWeaponWheel(true);
    });
  }

  // --------------------------------------------------------------------------
  // Slide-Up Linh Thông Ngọc Giản (6 Interactive Wuxia Apps)
  // --------------------------------------------------------------------------
  function runPhoneVehicleDelivery(typeKey, displayName) {
    let handled = false;
    if (ctx.gameplay && typeof ctx.gameplay.triggerPhoneAction === 'function') {
      try {
        const res = ctx.gameplay.triggerPhoneAction(`spawn_${typeKey}`);
        if (res !== false) handled = true;
      } catch (_) {}
    }

    if (!handled && ctx.vehicles && typeof ctx.vehicles.spawnVehicle === 'function' && ctx.player) {
      const p = ctx.player;
      const yaw = Number(p.yaw) || 0;
      const sx = p.x + Math.sin(yaw) * 6.5;
      const sz = p.z + Math.cos(yaw) * 6.5;
      const sy = ctx.world && typeof ctx.world.getGroundHeight === 'function'
        ? ctx.world.getGroundHeight(sx, sz) + 0.05
        : 0.08;
      try {
        ctx.vehicles.spawnVehicle(typeKey, sx, sy, sz, yaw);
        handled = true;
      } catch (_) {}
    }

    audio.playPhoneConfirm();
    showNotification(`Đã triệu hồi ${displayName} tới vị trí của bạn!`, 'blue');
    closePhone();
  }

  function runPhoneWeather(modeId, label) {
    if (ctx.gameplay && typeof ctx.gameplay.triggerPhoneAction === 'function') {
      try { ctx.gameplay.triggerPhoneAction(`weather_${modeId}`); } catch (_) {}
    }
    if (ctx.engine && typeof ctx.engine.setTimeWeather === 'function') {
      try { ctx.engine.setTimeWeather(modeId); } catch (_) {}
    }
    weatherIdx = Math.max(0, WEATHER_PRESETS.findIndex((w) => w.id === modeId));
    syncPauseLabels();
    audio.playPhoneConfirm();
    showNotification(`Thiên Thời: ${label}`, 'blue');
    renderPhoneScreen();
  }

  function runPhoneOutfit(outfitId, label) {
    if (ctx.player) ctx.player.outfit = outfitId;
    if (ctx.gameplay && typeof ctx.gameplay.triggerPhoneAction === 'function') {
      try { ctx.gameplay.triggerPhoneAction(`outfit_${outfitId}`); } catch (_) {}
    }
    if (ctx.characters && typeof ctx.characters.setOutfit === 'function' && ctx.player) {
      try { ctx.characters.setOutfit(ctx.player.rig || ctx.player, outfitId); } catch (_) {}
    }
    audio.playPhoneConfirm();
    showNotification(`Đã khoác y phục: ${label}`, 'purple');
    renderPhoneScreen();
  }

  function runPhoneBribeLSPD() {
    const w = ctx.gameplay?.wanted;
    const p = ctx.player;
    const starsBefore = w ? w.stars : 0;
    if (!starsBefore) {
      audio.playPhoneError();
      showNotification('Bạn hiện không bị Lục Phiến Môn truy nã!', 'gold');
      return;
    }
    if (p && p.cash < 500) {
      audio.playPhoneError();
      showNotification('Không đủ $500 ngân lượng để đút lót Lục Phiến Môn!', 'red');
      return;
    }

    if (ctx.gameplay && typeof ctx.gameplay.triggerPhoneAction === 'function') {
      try { ctx.gameplay.triggerPhoneAction('clear_wanted'); } catch (_) {}
    }
    if (w && w.stars > 0) {
      if (p) {
        const nextCash = Math.max(0, (p.cash || 0) - 500);
        if (ctx.gameplay?.syncPlayerCash) ctx.gameplay.syncPlayerCash(nextCash, true);
        else if (ctx.antiCheat?.commitCash) ctx.antiCheat.commitCash(nextCash);
        else p.cash = nextCash;
      }
      w.stars = 0;
      w.heat = 0;
      w.spotted = false;
      w.evadeTimer = 0;
    }
    audio.playPhoneConfirm();
    showNotification('Mật thám Thiên Cơ đã xóa lệnh truy nã Lục Phiến Môn (-$500)!', 'green');
    closePhone();
  }

  let phoneDialCompleted = false;
  async function pressDialKey(key) {
    if (phoneDialPending) return;
    if (key === 'Backspace') {
      phoneDialed = phoneDialed.slice(0, -1);
      phoneDialCompleted = false;
    } else {
      const shouldReset = phoneDialCompleted || phoneDialed.length >= 6;
      phoneDialed = (shouldReset ? '' : phoneDialed) + key;
      phoneDialCompleted = false;
    }
    const number = dom.phoneBody.querySelector('.dialed-number');
    const status = dom.phoneBody.querySelector('.dialer-status');
    number.textContent = phoneDialed;
    status.textContent = '';
    audio.playPhoneTap();
    if (key === 'Backspace') return;

    const isExactMatch = Boolean(ctx.antiCheat?.matchSecretCode?.(phoneDialed));
    const isPrefix = Boolean(ctx.antiCheat?.isSecretPrefix?.(phoneDialed));
    const shouldSubmit =
      isExactMatch ||
      phoneDialed.length >= 6 ||
      (phoneDialed.length === 4 && !isPrefix);
    if (!shouldSubmit) return;

    phoneDialPending = true;
    phoneDialCompleted = true;
    let result;
    try {
      result = await ctx.gameplay?.dialPhoneCode(phoneDialed);
    } catch (_) {
      result = 'unavailable';
    } finally {
      phoneDialPending = false;
    }
    if (result === 'activated') {
      audio.playPhoneConfirm();
      showNotification('Đã bật bất tử trong 300 giây.', 'green');
      if (input.phoneOpen && status.isConnected) closePhone();
    } else if (result === 'no_cooldown') {
      audio.playPhoneConfirm();
      showNotification('⚡ Đã bật KHÔNG HỒI CHIÊU toàn bộ kỹ năng trong 100 giây!', 'green');
      if (input.phoneOpen && status.isConnected) closePhone();
    } else if (result === 'ammo_and_cash') {
      audio.playPhoneConfirm();
      showNotification('💰 Đã hồi FULL đạn dược tất cả vũ khí & cộng +$1,000,000 vào tài khoản!', 'green');
      if (input.phoneOpen && status.isConnected) closePhone();
    } else if (result === 'boss_defeated') {
      audio.playPhoneConfirm();
      if (input.phoneOpen && status.isConnected) closePhone();
    } else if (status.isConnected) {
      audio.playPhoneError();
      status.textContent = result === 'invalid' ? 'Mã không hợp lệ.' : 'Chưa thể kích hoạt. Hãy thử lại.';
    }
  }

  function renderPhoneScreen() {
    if (!dom.phoneBody || !dom.phoneHeader) return;

    if (phoneCurrentApp === 'home') {
      dom.phoneHeader.textContent = 'Linh Thông Ngọc Giản';
      const apps = [
        { key: 'shop', icon: '🏪', title: 'Cửa Hàng', bg: 'app-bg-shop' },
        { key: 'barclub', icon: '🍸', title: 'Bar Club', bg: 'app-bg-club' },
        { key: 'race', icon: '🏁', title: 'Trường Đua', bg: 'app-bg-race' },
        { key: 'missions', icon: '📜', title: 'Kỳ Án', bg: 'app-bg-mission' },
        { key: 'vipcar', icon: '🐉', title: 'Gọi Tọa Kỵ', bg: 'app-bg-car' },
        { key: 'weather', icon: '🌸', title: 'Thiên Thời', bg: 'app-bg-weather' },
        { key: 'outfit', icon: '🥋', title: 'Tủ Y Phục', bg: 'app-bg-outfit' },
        { key: 'lspd', icon: '⭐', title: 'Xóa Truy Nã', bg: 'app-bg-lspd' },
        { key: 'dialer', icon: '☎', title: 'Quay Số', bg: 'app-bg-config' },
        { key: 'settings', icon: '⚙', title: 'Đồ Họa & Lưu', bg: 'app-bg-config' },
      ];
      phoneFocusIdx = clamp(phoneFocusIdx, 0, apps.length - 1);
      const clockStr = dom.phoneClock ? dom.phoneClock.textContent : '14:30';
      const curZone = dom.streetName ? dom.streetName.textContent : 'Đại Lộ Chu Tước';

      dom.phoneBody.innerHTML = `
        <div class="phone-home-hero">
          <div class="phone-home-time">${escapeHTML(clockStr)}</div>
          <div class="phone-home-loc">${escapeHTML(curZone)}</div>
        </div>
        <div class="phone-app-grid">
          ${apps
            .map(
              (a, i) => `
            <button type="button" class="phone-app-tile ${i === phoneFocusIdx ? 'focused' : ''}" data-open-app="${a.key}">
              <span class="phone-app-badge ${a.bg}">${a.icon}</span>
              <span class="phone-app-title">${a.title}</span>
            </button>`
            )
            .join('')}
        </div>`;

      dom.phoneBody.querySelectorAll('[data-open-app]').forEach((btn) => {
        btn.addEventListener('click', () => {
          phoneCurrentApp = btn.getAttribute('data-open-app');
          phoneDialed = '';
          audio.playPhoneTap();
          phoneFocusIdx = 0;
          renderPhoneScreen();
        });
      });
      return;
    }

    if (phoneCurrentApp === 'race') {
      dom.phoneHeader.textContent = '🏁 GPS • Trường Đua Tử Thần';
      const p = ctx.player;
      const rPos = ctx.raceArena?.ENTRANCE_POS || { x: 25.6, z: 80.0 };
      const distM = p ? Math.round(Math.hypot((p.x || 0) - rPos.x, (p.z || 0) - rPos.z)) : 0;

      dom.phoneBody.innerHTML = `
        <div class="phone-list">
          <div class="phone-action-card shop-summary-card">
            <div class="phone-card-top">
              <span>🏁 Đấu Trường Tốc Độ (7 Tay Đua)</span>
              <span class="phone-card-tag">${distM}m</span>
            </div>
            <div class="phone-card-desc">Địa chỉ: Đại Lộ Chu Tước (26, 80). Tới nơi bấm [F] vào mua xe chiến đấu ($10k–$100M), bình chọn 2 map khổng lồ, cá cược ×5 &amp; đua tranh giải $500,000!</div>
          </div>
          <button type="button" class="phone-action-card active-choice" data-race-gps="1">
            <div class="phone-card-top"><span>📍 Dẫn Đường GPS Tới Trường Đua</span><span class="phone-card-tag">BẬT GPS</span></div>
            <div class="phone-card-desc">Vẽ lộ trình GPS trên minimap dẫn bạn tới tận cổng Trường Đua Tử Thần.</div>
          </button>
        </div>`;

      dom.phoneBody.querySelector('[data-race-gps]')?.addEventListener('click', () => {
        ctx.gameplay?.triggerPhoneAction?.('gps_race');
        audio.playPhoneConfirm();
        closePhone();
      });
      return;
    }

    if (phoneCurrentApp === 'shop') {
      dom.phoneHeader.textContent = '🏪 GPS • Cửa Hàng Đệ Tử';
      const p = ctx.player;
      const shopPos = ctx.gameplay?.discipleShopPos || { x: 25.6, z: -14.0 };
      const distM = p ? Math.round(Math.hypot((p.x || 0) - shopPos.x, (p.z || 0) - shopPos.z)) : 0;
      const squadCount = (ctx.gameplay?.disciples || []).length;

      dom.phoneBody.innerHTML = `
        <div class="phone-list">
          <div class="phone-action-card shop-summary-card">
            <div class="phone-card-top">
              <span>🏪 Võ Quán Chiêu Mộ Đệ Tử</span>
              <span class="phone-card-tag">${distM}m</span>
            </div>
            <div class="phone-card-desc">Địa chỉ: Đại Lộ Chu Tước (26, -14). Hãy tự chạy hoặc lái xe tới cổng vòng sáng vàng để mua đệ tử ($1 / $10 / $100 Gojo)!</div>
          </div>
          <button type="button" class="phone-action-card active-choice" data-shop-gps="1">
            <div class="phone-card-top"><span>📍 Dẫn Đường GPS Tới Cửa Hàng</span><span class="phone-card-tag">BẬT GPS</span></div>
            <div class="phone-card-desc">Vẽ lộ trình GPS trên bản đồ nhỏ dẫn bạn tới tận cửa Võ Quán (Đang theo: ${squadCount}/6 đệ tử).</div>
          </button>
        </div>`;

      dom.phoneBody.querySelectorAll('[data-shop-gps]').forEach((btn) => {
        btn.addEventListener('click', () => {
          ctx.gameplay?.triggerPhoneAction?.('gps_shop');
          audio.playPhoneConfirm();
          closePhone();
        });
      });
      return;
    }

    if (phoneCurrentApp === 'barclub') {
      dom.phoneHeader.textContent = '🍸 GPS • Bar Club VIP';
      const p = ctx.player;
      const clubPos = ctx.gameplay?.barClubPos || { x: 54.4, z: 14.0 };
      const distM = p ? Math.round(Math.hypot((p.x || 0) - clubPos.x, (p.z || 0) - clubPos.z)) : 0;

      dom.phoneBody.innerHTML = `
        <div class="phone-list">
          <div class="phone-action-card shop-summary-card">
            <div class="phone-card-top"><span>🍸 Bar Club — Sòng Tài Xỉu</span><span class="phone-card-tag">${distM}m</span></div>
            <div class="phone-card-desc">Địa chỉ: Mặt tiền Đại Lộ Chu Tước (54, 14). Hãy tự di chuyển tới cổng neon tím-vàng để vào chơi Tài Xỉu kiếm tiền!</div>
          </div>
          <button type="button" class="phone-action-card active-choice" data-club-gps="1">
            <div class="phone-card-top"><span>📍 Dẫn Đường GPS Tới Bar Club</span><span class="phone-card-tag">BẬT GPS</span></div>
            <div class="phone-card-desc">Vẽ đường dẫn GPS trên bản đồ nhỏ tới thẳng cổng neon Bar Club VIP.</div>
          </button>
        </div>`;
      dom.phoneBody.querySelectorAll('[data-club-gps]').forEach((btn) => {
        btn.addEventListener('click', () => {
          ctx.gameplay?.triggerPhoneAction?.('gps_barclub');
          audio.playPhoneConfirm();
          closePhone();
        });
      });
      return;
    }

    if (phoneCurrentApp === 'dialer') {
      dom.phoneHeader.textContent = 'Quay số';
      const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
      dom.phoneBody.innerHTML = `
        <div class="phone-dialer">
          <div class="dialer-display">
            <output class="dialed-number" aria-label="Số đã bấm">${escapeHTML(phoneDialed)}</output>
            <p class="dialer-hint">Nhập số cần gọi.</p>
            <p class="dialer-status" role="status"></p>
          </div>
          <div class="dialer-keypad" role="group" aria-label="Bàn phím số">
            ${digits.map((digit) => `<button type="button" class="dialer-key" data-dial-key="${digit}">${digit}</button>`).join('')}
            <button type="button" class="dialer-key" data-dial-key="Backspace" aria-label="Xóa một số">⌫</button>
          </div>
        </div>`;
      dom.phoneBody.querySelectorAll('[data-dial-key]').forEach((button) => {
        button.addEventListener('click', () => pressDialKey(button.dataset.dialKey));
      });
      return;
    }

    if (phoneCurrentApp === 'missions') {
      dom.phoneHeader.textContent = '📜 Kỳ Án Giang Hồ';
      dom.phoneBody.innerHTML = `
        <div class="phone-list">
          <button type="button" class="phone-action-card" data-msn="1">
            <div class="phone-card-top"><span>1. Bạch Long Tuyệt Ảnh</span><span class="phone-card-tag">+$3,500</span></div>
            <div class="phone-card-desc">Cưỡi Bạch Long Chiến Xa vượt vòng vây Hắc Phong Bang về Tụ Bảo Xa Các.</div>
          </button>
          <button type="button" class="phone-action-card" data-msn="2">
            <div class="phone-card-top"><span>2. Bão Lửa Bến Bồng Lai</span><span class="phone-card-tag">+$6,000</span></div>
            <div class="phone-card-desc">Đột kích Bến Cảng Bồng Lai, đoạt Hòa Thị Bích &amp; thoát truy kích Lục Phiến Môn.</div>
          </button>
          <button type="button" class="phone-action-card" data-msn="3">
            <div class="phone-card-top"><span>3. Đột Kích Tháp Thiên Cơ</span><span class="phone-card-tag">+$15,000</span></div>
            <div class="phone-card-desc">Khoác Dạ Hành Y, đu dây cáp dọc kính Tháp Thiên Cơ 78m đoạt Thiên Cơ Mật Quyển!</div>
          </button>
          <button type="button" class="phone-action-card" data-msn="4">
            <div class="phone-card-top"><span>4. ⚽ Đại Đấu Trường Boss</span><span class="phone-card-tag">+$100,000</span></div>
            <div class="phone-card-desc">Chấp nhận thử thách tiến vào Sân Vận Động đối đầu 2 Boss Huyền Thoại Messi &amp; Ronaldo!</div>
          </button>
        </div>`;
      dom.phoneBody.querySelectorAll('[data-msn]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.getAttribute('data-msn'), 10);
          audio.playPhoneConfirm();
          if (ctx.gameplay && typeof ctx.gameplay.startMission === 'function') {
            ctx.gameplay.startMission(id);
          }
          closePhone();
        });
      });
      return;
    }

    if (phoneCurrentApp === 'vipcar') {
      dom.phoneHeader.textContent = '🐉 Triệu Hồi Tọa Kỵ VIP';
      const cars = [
        { id: 'obey9f', name: 'Bạch Long Chiến Xa', tag: 'MIỄN PHÍ', desc: 'Siêu xe V10 mui trần trắng ngọc trai viền hoàng kim' },
        { id: 'banshee', name: 'Xích Hỏa Thần Mã', tag: 'MIỄN PHÍ', desc: 'Chiến xa đỏ thẫm sọc kim tuyến bứt tốc cực gắt' },
        { id: 'sedan_lux', name: 'Hắc Lân Kiệu', tag: 'MIỄN PHÍ', desc: 'Xa giá hạng sang đen huyền thiết chuẩn chưởng môn' },
        { id: 'heli', name: 'Thiên Ưng Phi Chu', tag: 'PHI THIÊN', desc: 'Trực thăng bay ngắm toàn cảnh biển Bồng Lai & đỉnh VÕ LÂM' },
      ];
      dom.phoneBody.innerHTML = `<div class="phone-list">${cars
        .map(
          (c) => `
        <button type="button" class="phone-action-card" data-car="${c.id}" data-carname="${c.name}">
          <div class="phone-card-top"><span>${c.name}</span><span class="phone-card-tag">${c.tag}</span></div>
          <div class="phone-card-desc">${c.desc}</div>
        </button>`
        )
        .join('')}</div>`;
      dom.phoneBody.querySelectorAll('[data-car]').forEach((btn) => {
        btn.addEventListener('click', () => {
          runPhoneVehicleDelivery(btn.getAttribute('data-car'), btn.getAttribute('data-carname'));
        });
      });
      return;
    }

    if (phoneCurrentApp === 'weather') {
      dom.phoneHeader.textContent = '🌸 Thiên Thời & Khung Giờ';
      const activeW = ctx.engine?.timeWeather || WEATHER_PRESETS[weatherIdx].id;
      dom.phoneBody.innerHTML = `<div class="phone-list">${WEATHER_PRESETS.map(
        (w) => `
        <button type="button" class="phone-action-card ${activeW === w.id ? 'active-choice' : ''}" data-weather="${w.id}" data-wlabel="${w.label}">
          <div class="phone-card-top"><span>${w.label}</span><span class="phone-card-tag">${activeW === w.id ? 'ĐANG BẬT' : 'CHỌN'}</span></div>
          <div class="phone-card-desc">${w.desc}</div>
        </button>`
      ).join('')}</div>`;
      dom.phoneBody.querySelectorAll('[data-weather]').forEach((btn) => {
        btn.addEventListener('click', () => {
          runPhoneWeather(btn.getAttribute('data-weather'), btn.getAttribute('data-wlabel'));
        });
      });
      return;
    }

    if (phoneCurrentApp === 'outfit') {
      dom.phoneHeader.textContent = '🥋 Tủ Y Phục Cổ Phong';
      const curO = ctx.player?.outfit || 'casual_polo';
      dom.phoneBody.innerHTML = `<div class="phone-list">${OUTFIT_PRESETS.map(
        (o) => `
        <button type="button" class="phone-action-card ${curO === o.id ? 'active-choice' : ''}" data-outfit="${o.id}" data-olabel="${o.label}">
          <div class="phone-card-top"><span>${o.label}</span><span class="phone-card-tag">${curO === o.id ? 'ĐANG MẶC' : 'MẶC'}</span></div>
          <div class="phone-card-desc">${o.desc}</div>
        </button>`
      ).join('')}</div>`;
      dom.phoneBody.querySelectorAll('[data-outfit]').forEach((btn) => {
        btn.addEventListener('click', () => {
          runPhoneOutfit(btn.getAttribute('data-outfit'), btn.getAttribute('data-olabel'));
        });
      });
      return;
    }

    if (phoneCurrentApp === 'lspd') {
      dom.phoneHeader.textContent = '⭐ Mật Tuyến Lục Phiến Môn';
      const stars = ctx.gameplay?.wanted?.stars || 0;
      dom.phoneBody.innerHTML = `
        <div class="phone-list">
          <div class="phone-action-card">
            <div class="phone-card-top"><span>Lệnh truy nã hiện tại</span><span class="phone-card-tag">${stars} ★</span></div>
            <div class="phone-card-desc">Nhờ mật thám Thiên Cơ Các rút hồ sơ truy nã khỏi Lục Phiến Môn &amp; Cẩm Y Vệ tức thì.</div>
          </div>
          <button type="button" id="phone-bribe-exec" class="phone-action-card active-choice">
            <div class="phone-card-top"><span>Xóa Truy Nã Ngay</span><span class="phone-card-tag">-$500</span></div>
            <div class="phone-card-desc">Chi $500 ngân lượng để giải tán toàn bộ bổ khoái &amp; phi chu tuần tra.</div>
          </button>
        </div>`;
      const execBtn = document.getElementById('phone-bribe-exec');
      if (execBtn) execBtn.addEventListener('click', runPhoneBribeLSPD);
      return;
    }

    if (phoneCurrentApp === 'settings') {
      dom.phoneHeader.textContent = '⚙ Đồ Họa & Lưu Trữ';
      const curQ = ctx.engine?.quality || QUALITY_PRESETS[qualityIdx].id;
      const qObj = QUALITY_PRESETS.find((q) => q.id === curQ) || QUALITY_PRESETS[1];
      const touchLabel = input.touchMode === 'auto' ? 'Tự Động' : input.touchMode === 'on' ? 'Luôn Bật' : 'Tắt';

      dom.phoneBody.innerHTML = `
        <div class="phone-list">
          <button type="button" class="phone-action-card" data-cfg="quality">
            <div class="phone-card-top"><span>Chất Lượng Đồ Họa</span><span class="phone-card-tag">${qObj.label}</span></div>
            <div class="phone-card-desc">${qObj.desc}</div>
          </button>
          <button type="button" class="phone-action-card" data-cfg="autoaim">
            <div class="phone-card-top"><span>Trợ Lực Tâm Ngắm</span><span class="phone-card-tag">${input.autoAim ? 'BẬT' : 'TẮT'}</span></div>
            <div class="phone-card-desc">Tự động dẫn hướng kiếm khí &amp; đường đạn vào mục tiêu gần tâm.</div>
          </button>
          <button type="button" class="phone-action-card" data-cfg="touch">
            <div class="phone-card-top"><span>Nút Cảm Ứng Mobile</span><span class="phone-card-tag">${touchLabel}</span></div>
            <div class="phone-card-desc">Chuyển đổi hiển thị cụm phím ảo &amp; cần điều khiển trên màn hình.</div>
          </button>
          <button type="button" class="phone-action-card" data-cfg="save">
            <div class="phone-card-top"><span>Lưu Hành Trang</span><span class="phone-card-tag">LƯU NGAY</span></div>
            <div class="phone-card-desc">Ghi lại ngân lượng, binh khí, y phục và kỳ án vào trình duyệt.</div>
          </button>
          <button type="button" class="phone-action-card" data-cfg="reset">
            <div class="phone-card-top"><span>Xóa Dữ Liệu Lưu</span><span class="phone-card-tag" style="color:#ff5e6a">ĐẶT LẠI</span></div>
            <div class="phone-card-desc">Xóa bản lưu cũ để khởi đầu lại từ Đại Lộ Chu Tước.</div>
          </button>
        </div>`;

      dom.phoneBody.querySelectorAll('[data-cfg]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const act = btn.getAttribute('data-cfg');
          if (act === 'quality') {
            cycleQuality();
            renderPhoneScreen();
          } else if (act === 'autoaim') {
            input.autoAim = !input.autoAim;
            if (ctx.player) ctx.player.autoAim = input.autoAim;
            audio.playPhoneTap();
            renderPhoneScreen();
          } else if (act === 'touch') {
            cycleTouchMode();
            renderPhoneScreen();
          } else if (act === 'save') {
            if (ctx.gameplay && typeof ctx.gameplay.saveGame === 'function') {
              ctx.gameplay.saveGame();
            }
            audio.playPhoneConfirm();
            showNotification('Đã lưu hành trang Giang Hồ!', 'green');
          } else if (act === 'reset') {
            if (ctx.gameplay && typeof ctx.gameplay.resetSave === 'function') {
              ctx.gameplay.resetSave();
            } else {
              try {
                localStorage.removeItem('giangho_dailo_save_v1');
                localStorage.removeItem('gtav_web_save_v1');
              } catch (_) {}
            }
            audio.playPhoneConfirm();
            showNotification('Đã đặt lại dữ liệu lưu!', 'red');
          }
        });
      });
    }
  }

  function openPhone(initialApp = 'home') {
    if (input.paused || !ctx.started) return;
    if (input.wheelOpen) closeWeaponWheel(false);
    if (input.chatOpen) closeChatModal();
    if (input.barClubOpen) closeBarClub();
    if (input.shopOpen) closeDiscipleShop();
    const alreadyOpen = input.phoneOpen;
    input.phoneOpen = true;
    phoneCurrentApp = initialApp || 'home';
    phoneDialed = '';
    if (document.pointerLockElement && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (_) {}
    }
    if (dom.phoneEl) dom.phoneEl.classList.remove('hidden');
    renderPhoneScreen();
    if (!alreadyOpen) audio.playPhoneOpen();
    else audio.playPhoneTap();
  }

  function renderDiscipleShopModal() {
    if (!dom.discipleShopList) return;
    const cashNow = Math.max(0, Math.round(Number(ctx.player?.cash) || 0));
    const squad = ctx.gameplay?.disciples || [];
    const maxCap = ctx.gameplay?.getMaxDisciples?.() || 6;
    if (dom.shopBalance) dom.shopBalance.textContent = `$${cashNow.toLocaleString('en-US')}`;
    if (dom.shopSquadCount) dom.shopSquadCount.textContent = `${squad.length}/${maxCap} Đệ tử`;

    const catalog = ctx.gameplay?.DISCIPLE_SHOP_CATALOG || [
      { id: 'disciple_1', name: 'Đệ Tử Sơ Cấp', price: 1, skinHex: '#402828', desc: 'Da #402828 • Đi theo bảo vệ chủ.' },
      { id: 'disciple_10', name: 'Đệ Tử Tinh Anh', price: 10, skinHex: '#ede1e1', desc: 'Da #ede1e1 • Hộ vệ tinh nhuệ.' },
      { id: 'disciple_100', name: 'Sư Huynh Vô Hạn (Gojo)', price: 100, skinHex: '#f2d6c4', hasMapNuke: true, desc: 'Tóc trắng bịt mắt đen • Nổ 1km (hồi 60s).' }
    ];

    dom.discipleShopList.innerHTML = `
      ${catalog.map((item) => `
        <div class="shop-modal-row ${item.hasMapNuke ? 'shop-gojo-card' : ''}">
          <div class="shop-modal-info">
            <div class="shop-modal-name">
              ${item.hasMapNuke
                ? '<span class="shop-gojo-dot" title="Gojo Satoru">∞</span>'
                : `<span class="shop-skin-swatch" style="background:${item.skinHex}" title="Màu da ${item.skinHex}"></span>`}
              <span>${escapeHTML(item.name)}</span>
              <span class="shop-modal-price">$${item.price}</span>
            </div>
            <div class="shop-modal-desc">${escapeHTML(item.desc)}</div>
          </div>
          <button type="button" class="shop-buy-btn ${item.hasMapNuke ? 'gojo' : ''}" data-modal-buy="${item.id}">
            MUA $${item.price}
          </button>
        </div>`).join('')}
      ${squad.length > 0 ? `
        <button type="button" class="shop-dismiss-btn" data-modal-dismiss="1">
          🗑 Giải Tán Toàn Bộ ${squad.length} Đệ Tử Hiện Tại
        </button>` : ''}`;

    dom.discipleShopList.querySelectorAll('[data-modal-buy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tid = btn.getAttribute('data-modal-buy');
        const res = ctx.gameplay?.buyDisciple?.(tid);
        if (res?.ok) audio.playPhoneConfirm();
        else audio.playPhoneError();
        renderDiscipleShopModal();
      });
    });
    dom.discipleShopList.querySelectorAll('[data-modal-dismiss]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ctx.gameplay?.dismissDisciples?.();
        audio.playPhoneTap();
        renderDiscipleShopModal();
      });
    });
  }

  function openDiscipleShop() {
    if (input.shopOpen || input.paused || !ctx.started || !dom.discipleShopModal) return;
    if (input.wheelOpen) closeWeaponWheel(false);
    if (input.phoneOpen) closePhone();
    if (input.chatOpen) closeChatModal();
    if (input.barClubOpen) closeBarClub();
    input.shopOpen = true;
    if (document.pointerLockElement && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (_) {}
    }
    renderDiscipleShopModal();
    dom.discipleShopModal.classList.remove('hidden');
    audio.playPhoneOpen();
  }

  function closeDiscipleShop() {
    if (!input.shopOpen) return;
    input.shopOpen = false;
    if (dom.discipleShopModal) dom.discipleShopModal.classList.add('hidden');
    audio.playPhoneClose();
  }

  // --------------------------------------------------------------------------
  // Trường Đua Tử Thần — Sảnh Chờ 7 Tay Đua • Gara Xe • Vote Map • Cá Cược
  // --------------------------------------------------------------------------
  let raceModalTab = 'lobby';
  let lastRaceFinishRendered = false;

  function renderRaceLobbyModal() {
    if (!dom.raceModalBody || !ctx.raceArena) return;
    const st = ctx.raceArena.getLobbyState();
    if (dom.raceBalance) dom.raceBalance.textContent = `$${st.cash.toLocaleString('en-US')}`;

    dom.raceArenaModal?.querySelectorAll('[data-race-tab]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-race-tab') === raceModalTab);
    });

    const fmtPrice = (n) => {
      if (n === 0) return 'MIỄN PHÍ';
      if (n >= 1_000_000) return `$${(n / 1_000_000).toLocaleString('en-US')} TRIỆU`;
      return `$${n.toLocaleString('en-US')}`;
    };

    if (raceModalTab === 'garage') {
      dom.raceModalBody.innerHTML = `
        <div class="race-garage-list">
          ${st.cars.map((c) => `
            <div class="race-car-row ${c.equipped ? 'equipped' : ''}">
              <div class="race-car-info">
                <div class="race-car-top">
                  <span class="race-car-swatch" style="background:#${c.color.toString(16).padStart(6, '0')}"></span>
                  <span class="race-car-name">${escapeHTML(c.name)}</span>
                  <span class="race-car-price">${fmtPrice(c.price)}</span>
                </div>
                <div class="race-car-stats">🛡️ ${c.hp.toLocaleString('en-US')} HP • ⚡ ${Math.round(c.maxSpeed * 3.6)} km/h • ${c.skillIcon} ${escapeHTML(c.skillName)} (${c.skillCd}s)</div>
                <div class="race-car-desc">${escapeHTML(c.skillDesc)}</div>
              </div>
              <button type="button" class="race-car-btn ${c.equipped ? 'active' : c.owned ? 'owned' : 'buy'}" data-race-car="${c.id}">
                ${c.equipped ? '✓ ĐANG DÙNG' : c.owned ? 'CHỌN XE' : `MUA ${fmtPrice(c.price)}`}
              </button>
            </div>`).join('')}
        </div>`;

      dom.raceModalBody.querySelectorAll('[data-race-car]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const cid = btn.getAttribute('data-race-car');
          const res = ctx.raceArena.buyOrEquipCar(cid);
          if (res?.ok) renderRaceLobbyModal();
        });
      });
      return;
    }

    // Lobby Tab: 7-Racer Roster + 2-Map Vote + Betting + Start Buttons
    const equippedCar = st.cars.find((c) => c.equipped) || st.cars[0];
    dom.raceModalBody.innerHTML = `
      <div class="race-lobby-grid">
        <div class="race-panel">
          <div class="race-panel-title">👥 SẢNH CHỜ (${st.roster.length}/${st.maxRacers} TAY ĐUA — Tự thêm Bot 1.1× tốc độ &amp; bắn nhau!)</div>
          <div class="race-roster-list">
            ${st.roster.map((r, idx) => `
              <div class="race-roster-item ${r.isPlayer ? 'me' : ''}">
                <span>#${idx + 1} ${escapeHTML(r.name)}</span>
                <span class="race-roster-car">${escapeHTML(r.carName)}</span>
              </div>`).join('')}
          </div>
          <div class="race-equipped-note">Xe của bạn: <b>${escapeHTML(equippedCar.name)}</b> (🛡️ ${equippedCar.hp} HP • ${equippedCar.skillIcon} ${escapeHTML(equippedCar.skillName)})</div>
        </div>

        <div class="race-panel">
          <div class="race-panel-title">🗺️ BÌNH CHỌN MAP ĐUA KHỔNG LỒ (2 MAP)</div>
          <div class="race-map-list">
            ${st.maps.map((m) => {
              const votes = st.voteInfo.votes[m.id] || 0;
              const picked = st.voteInfo.playerVote === m.id;
              const winning = st.voteInfo.winnerId === m.id;
              return `
                <button type="button" class="race-map-card ${picked ? 'voted' : ''}" data-race-map="${m.id}">
                  <div class="race-map-top">
                    <span>${escapeHTML(m.name)}</span>
                    <span class="race-vote-badge">${votes} phiếu ${winning ? '★ ĐANG DẪN' : ''}</span>
                  </div>
                  <div class="race-map-sub">${escapeHTML(m.subtitle)}</div>
                </button>`;
            }).join('')}
          </div>

          <div class="race-panel-title" style="margin-top:8px;">🎰 CÁ CƯỢC AI VỀ NHẤT (ĂN ×5)</div>
          <div class="race-bet-box">
            <select id="race-bet-racer" class="race-bet-select">
              ${st.roster.map((r) => `<option value="${escapeHTML(r.id)}" ${r.id === st.selectedBetRacerId ? 'selected' : ''}>${escapeHTML(r.name)}</option>`).join('')}
            </select>
            <input id="race-bet-input" class="race-bet-input" type="number" min="0" step="10000" value="${st.selectedBetAmount}" inputmode="numeric" placeholder="Tiền cược ($)" />
          </div>
          <div class="race-bet-chips">
            ${[0, 10_000, 50_000, 100_000, 500_000, 1_000_000].map((v) => `<button type="button" class="tx-chip" data-race-chip="${v}">${v === 0 ? 'Không cược' : v >= 1_000_000 ? '$1M' : '$' + (v / 1000) + 'k'}</button>`).join('')}
          </div>
        </div>
      </div>

      <div class="race-launch-row">
        <button type="button" id="race-start-join-btn" class="race-launch-btn primary">
          🏁 THAM GIA ĐUA NGAY (Lệ phí $50,000${st.selectedBetAmount > 0 ? ` + Cược $${st.selectedBetAmount.toLocaleString('en-US')}` : ''})
        </button>
        <button type="button" id="race-start-spec-btn" class="race-launch-btn spectate">
          🎰 CHỈ CÁ CƯỢC &amp; XEM ĐUA (Không tốn $50k lệ phí)
        </button>
      </div>`;

    dom.raceModalBody.querySelectorAll('[data-race-map]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ctx.raceArena.voteForMap(btn.getAttribute('data-race-map'));
        renderRaceLobbyModal();
      });
    });

    const betSel = dom.raceModalBody.querySelector('#race-bet-racer');
    const betInp = dom.raceModalBody.querySelector('#race-bet-input');
    const syncBet = () => {
      ctx.raceArena.setBetSelection(betSel?.value || 'player', Math.max(0, Math.floor(Number(betInp?.value) || 0)));
    };
    betSel?.addEventListener('change', () => { syncBet(); renderRaceLobbyModal(); });
    betInp?.addEventListener('change', () => { syncBet(); renderRaceLobbyModal(); });
    dom.raceModalBody.querySelectorAll('[data-race-chip]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const val = Number(chip.getAttribute('data-race-chip')) || 0;
        ctx.raceArena.setBetSelection(betSel?.value || 'player', val);
        audio.playPhoneTap();
        renderRaceLobbyModal();
      });
    });

    const launch = (mode) => {
      syncBet();
      const latest = ctx.raceArena.getLobbyState();
      const res = ctx.raceArena.startRaceEvent({
        mode,
        betRacerId: latest.selectedBetRacerId,
        betAmount: latest.selectedBetAmount
      });
      if (!res?.ok) {
        if (res?.reason === 'need_bet_for_spectate') {
          showNotification('Hãy chọn mức tiền cược (> $0) trước khi vào xem cá cược!', 'red');
        } else if (res?.reason === 'funds') {
          showNotification(`Không đủ tiền! Cần $${(res.needed || 0).toLocaleString('en-US')} (Hiện có: $${(res.cash || 0).toLocaleString('en-US')}).`, 'red');
        }
        return;
      }
      lastRaceFinishRendered = false;
      closeRaceLobby(true);
    };

    dom.raceModalBody.querySelector('#race-start-join-btn')?.addEventListener('click', () => launch('race'));
    dom.raceModalBody.querySelector('#race-start-spec-btn')?.addEventListener('click', () => launch('spectate'));
  }

  function openRaceLobby() {
    if (input.raceLobbyOpen || input.paused || !ctx.started || !dom.raceArenaModal) return;
    if (input.wheelOpen) closeWeaponWheel(false);
    if (input.phoneOpen) closePhone();
    if (input.chatOpen) closeChatModal();
    if (input.barClubOpen) closeBarClub();
    if (input.shopOpen) closeDiscipleShop();
    input.raceLobbyOpen = true;
    if (document.pointerLockElement && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (_) {}
    }
    renderRaceLobbyModal();
    dom.raceArenaModal.classList.remove('hidden');
    audio.playPhoneOpen();
  }

  function closeRaceLobby(silent = false) {
    if (!input.raceLobbyOpen) return;
    input.raceLobbyOpen = false;
    if (dom.raceArenaModal) dom.raceArenaModal.classList.add('hidden');
    if (!silent) audio.playPhoneClose();
  }

  // --------------------------------------------------------------------------
  // Bản Đồ Kinh Thành Toàn Cảnh ([~] Backquote hoặc chạm vào Minimap)
  // --------------------------------------------------------------------------
  const FULL_MAP_BOUNDS = { minX: -310, maxX: 255, minZ: -320, maxZ: 245 };
  const FULL_MAP_LANDMARKS = [
    { id: 'shop', icon: '🏪', name: 'Cửa Hàng Đệ Tử', x: 25.6, z: -14.0, color: '#f59e0b' },
    { id: 'barclub', icon: '🍸', name: 'Bar Club VIP (Tài Xỉu & Cướp $1k)', x: 54.4, z: 14.0, color: '#e84dff' },
    { id: 'race', icon: '🏁', name: 'Trường Đua Tử Thần', x: 25.6, z: 80.0, color: '#f97316' },
    { id: 'stadium', icon: '⚽', name: 'Đại Đấu Trường Boss (Messi & Ronaldo)', x: 54.4, z: 80.0, color: '#38bdf8' },
    { id: 'safehouse', icon: '🏠', name: 'Tĩnh Tâm Biệt Viện (Safehouse)', x: 24.0, z: -80.0, color: '#38e09c' },
    { id: 'showroom', icon: '🔧', name: 'Tụ Bảo Xa Các (Tân Trang Xe)', x: -58.0, z: 80.0, color: '#f0c35a' },
    { id: 'hospital', icon: '🏥', name: 'Y Quán (Bệnh Viện)', x: 80.0, z: 130.0, color: '#ef4444' },
    { id: 'precinct', icon: '⚔️', name: 'Nha Môn Lục Phiến Môn', x: 130.0, z: 80.0, color: '#60a5fa' },
    { id: 'fib', icon: '🏢', name: 'Tháp Thiên Cơ (FIB 78m)', x: 160.0, z: -40.0, color: '#22d3ee' },
    { id: 'pier', icon: '🎡', name: 'Bến Cảng Bồng Lai', x: -215.0, z: -8.0, color: '#2dd4bf' }
  ];

  function worldToFullMap(wx, wz, cw, ch) {
    const u = (wx - FULL_MAP_BOUNDS.minX) / (FULL_MAP_BOUNDS.maxX - FULL_MAP_BOUNDS.minX);
    const v = (wz - FULL_MAP_BOUNDS.minZ) / (FULL_MAP_BOUNDS.maxZ - FULL_MAP_BOUNDS.minZ);
    return { x: u * cw, y: v * ch };
  }

  function fullMapToWorld(cx, cy, cw, ch) {
    const u = clamp(cx / Math.max(1, cw), 0, 1);
    const v = clamp(cy / Math.max(1, ch), 0, 1);
    return {
      x: FULL_MAP_BOUNDS.minX + u * (FULL_MAP_BOUNDS.maxX - FULL_MAP_BOUNDS.minX),
      z: FULL_MAP_BOUNDS.minZ + v * (FULL_MAP_BOUNDS.maxZ - FULL_MAP_BOUNDS.minZ)
    };
  }

  function renderFullMapLegend() {
    if (!dom.fullMapLegend) return;
    dom.fullMapLegend.innerHTML = `
      <div class="full-map-legend-title">📍 CẮM MỐC GPS NHANH</div>
      ${FULL_MAP_LANDMARKS.map((lm) => `
        <button type="button" class="full-map-loc-btn" data-map-loc="${lm.id}">
          <span class="full-map-dot" style="background:${lm.color}"></span>
          <span class="full-map-loc-text">${lm.icon} ${escapeHTML(lm.name)}</span>
          <span class="full-map-loc-xy">(${Math.round(lm.x)}, ${Math.round(lm.z)})</span>
        </button>`).join('')}`;
    dom.fullMapLegend.querySelectorAll('[data-map-loc]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-map-loc');
        const lm = FULL_MAP_LANDMARKS.find((item) => item.id === id);
        if (!lm) return;
        ctx.gameplay?.setGPSTarget?.(lm.x, lm.z);
        audio.playPhoneConfirm();
        showNotification(`📍 Đã cắm mốc GPS tới ${lm.icon} ${lm.name} (${Math.round(lm.x)}, ${Math.round(lm.z)})!`, 'gold');
        drawFullMap(ctx);
      });
    });
  }

  function drawFullMap(gameCtx) {
    if (!input.mapOpen || !dom.fullMapCanvas || !gameCtx?.player) return;
    const cv = dom.fullMapCanvas;
    const c = cv.getContext('2d');
    if (!c) return;
    const cw = cv.width;
    const ch = cv.height;
    const p = gameCtx.player;

    // 1. Ocean background
    c.fillStyle = '#0c3b4c';
    c.fillRect(0, 0, cw, ch);

    // 2. Beach, City Landmass & Northern Mountain Range
    const b1 = worldToFullMap(-195, -320, cw, ch);
    const b2 = worldToFullMap(-126, 245, cw, ch);
    c.fillStyle = '#d4b47c';
    c.fillRect(b1.x, b1.y, b2.x - b1.x, b2.y - b1.y);

    const l1 = worldToFullMap(-128, -225, cw, ch);
    const l2 = worldToFullMap(255, 245, cw, ch);
    c.fillStyle = '#1e2736';
    c.fillRect(l1.x, l1.y, l2.x - l1.x, l2.y - l1.y);

    const m1 = worldToFullMap(-140, -320, cw, ch);
    const m2 = worldToFullMap(255, -222, cw, ch);
    c.fillStyle = '#243c2c';
    c.fillRect(m1.x, m1.y, m2.x - m1.x, m2.y - m1.y);

    // Pier sticking out into Ocean
    const pr1 = worldToFullMap(-265, -24, cw, ch);
    const pr2 = worldToFullMap(-125, 10, cw, ch);
    c.fillStyle = '#8b6343';
    c.fillRect(pr1.x, pr1.y, pr2.x - pr1.x, pr2.y - pr1.y);

    // 3. Complete City Road Grid (Avenues & Streets)
    const avesX = [-120, -40, 40, 120, 200];
    const stsZ = [-200, -120, -40, 40, 120, 200];
    c.fillStyle = '#3b4454';
    for (const ax of avesX) {
      const rw = ax === 40 ? 22 : 16;
      const a = worldToFullMap(ax - rw * 0.5, -210, cw, ch);
      const b = worldToFullMap(ax + rw * 0.5, 220, cw, ch);
      c.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }
    for (const sz of stsZ) {
      const a = worldToFullMap(-130, sz - 8, cw, ch);
      const b = worldToFullMap(220, sz + 8, cw, ch);
      c.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }

    // Centerlines on main avenue (Đại Lộ Chu Tước x = 40)
    c.strokeStyle = 'rgba(240, 195, 90, 0.55)';
    c.lineWidth = 1.5;
    c.setLineDash([6, 6]);
    const aveTop = worldToFullMap(40, -210, cw, ch);
    const aveBot = worldToFullMap(40, 220, cw, ch);
    c.beginPath();
    c.moveTo(aveTop.x, aveTop.y);
    c.lineTo(aveBot.x, aveBot.y);
    c.stroke();
    c.setLineDash([]);

    // Zone Titles
    c.font = 'bold 12px system-ui, sans-serif';
    c.fillStyle = 'rgba(186, 230, 253, 0.72)';
    c.textAlign = 'center';
    const seaPt = worldToFullMap(-250, 120, cw, ch);
    c.fillText('VỊNH BÍCH HẢI', seaPt.x, seaPt.y);
    const mtnPt = worldToFullMap(60, -275, cw, ch);
    c.fillStyle = 'rgba(254, 240, 138, 0.85)';
    c.fillText('⛰️ ĐỈNH HOA SƠN • VÕ LÂM', mtnPt.x, mtnPt.y);

    // 4. Active GPS Route Polyline
    const gpsPts = gameCtx.gameplay?.gpsWaypoints || [];
    if (gpsPts.length > 0) {
      c.strokeStyle = '#facc15';
      c.lineWidth = 4;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      const startP = worldToFullMap(p.x > 500 ? 24 : p.x, p.z > 500 ? -80 : p.z, cw, ch);
      c.moveTo(startP.x, startP.y);
      for (const pt of gpsPts) {
        const mp = worldToFullMap(pt.x, pt.z, cw, ch);
        c.lineTo(mp.x, mp.y);
      }
      c.stroke();
      const endPt = worldToFullMap(gpsPts[gpsPts.length - 1].x, gpsPts[gpsPts.length - 1].z, cw, ch);
      c.fillStyle = '#facc15';
      c.strokeStyle = '#000';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(endPt.x, endPt.y, 7, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }

    // 5. Landmarks with crisp labels
    c.font = 'bold 11px system-ui, sans-serif';
    c.textAlign = 'left';
    for (const lm of FULL_MAP_LANDMARKS) {
      const mp = worldToFullMap(lm.x, lm.z, cw, ch);
      c.fillStyle = lm.color;
      c.strokeStyle = '#0f172a';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(mp.x, mp.y, 6.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      const lbl = `${lm.icon} ${lm.name.split('(')[0].trim()}`;
      c.fillStyle = 'rgba(9, 13, 28, 0.78)';
      const tw = c.measureText(lbl).width + 8;
      c.fillRect(mp.x + 9, mp.y - 9, tw, 17);
      c.fillStyle = '#f8fafc';
      c.fillText(lbl, mp.x + 13, mp.y + 3);
    }

    // 6. Allied Disciples & Police
    const discs = gameCtx.gameplay?.disciples || [];
    for (const d of discs) {
      if (!d || d.dead || d.x > 500) continue;
      const mp = worldToFullMap(d.x, d.z, cw, ch);
      c.fillStyle = d.hasMapNuke ? '#c084fc' : '#38bdf8';
      c.beginPath();
      c.arc(mp.x, mp.y, 4.5, 0, Math.PI * 2);
      c.fill();
    }
    const cops = gameCtx.gameplay?.cops || [];
    for (const cop of cops) {
      if (!cop || cop.dead) continue;
      const mp = worldToFullMap(cop.x, cop.z, cw, ch);
      c.fillStyle = '#ef4444';
      c.beginPath();
      c.arc(mp.x, mp.y, 4, 0, Math.PI * 2);
      c.fill();
    }

    // 7. Player Live Arrow Marker
    const px = p.x > 500 ? (p.inInterior === 'barclub' ? 54.4 : p.inInterior === 'shop' ? 25.6 : p.inInterior === 'stadium' ? 54.4 : 24) : p.x;
    const pz = p.z > 500 ? (p.inInterior === 'barclub' ? 14 : p.inInterior === 'shop' ? -14 : p.inInterior === 'stadium' ? 80 : -80) : p.z;
    const pm = worldToFullMap(px, pz, cw, ch);
    c.save();
    c.translate(pm.x, pm.y);
    c.rotate(-(p.yaw || 0) + Math.PI);
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#0284c7';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(0, -10);
    c.lineTo(7, 8);
    c.lineTo(0, 4);
    c.lineTo(-7, 8);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();

    if (dom.fullMapCoords) {
      dom.fullMapCoords.textContent = `Vị trí: (${Math.round(px)}, ${Math.round(pz)})`;
    }
  }

  function openFullMap() {
    if (input.mapOpen || input.paused || !ctx.started || !dom.fullMapModal || ctx.raceArena?.isActive?.()) return;
    if (input.wheelOpen) closeWeaponWheel(false);
    if (input.phoneOpen) closePhone();
    if (input.chatOpen) closeChatModal();
    if (input.barClubOpen) closeBarClub();
    if (input.shopOpen) closeDiscipleShop();
    if (input.raceLobbyOpen) closeRaceLobby(true);
    input.mapOpen = true;
    if (document.pointerLockElement && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (_) {}
    }
    renderFullMapLegend();
    dom.fullMapModal.classList.remove('hidden');
    drawFullMap(ctx);
    audio.playPhoneOpen();
  }

  function closeFullMap() {
    if (!input.mapOpen) return;
    input.mapOpen = false;
    if (dom.fullMapModal) dom.fullMapModal.classList.add('hidden');
    audio.playPhoneClose();
  }

  function toggleFullMap() {
    if (input.mapOpen) closeFullMap();
    else openFullMap();
  }

  dom.fullMapCloseBtn?.addEventListener('click', () => closeFullMap());
  dom.fullMapClearGps?.addEventListener('click', () => {
    ctx.gameplay?.setGPSTarget?.(null, null);
    audio.playPhoneTap();
    showNotification('Đã xóa mốc dẫn đường GPS.', 'gold');
    drawFullMap(ctx);
  });
  dom.fullMapCanvas?.addEventListener('click', (e) => {
    const rect = dom.fullMapCanvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * dom.fullMapCanvas.width;
    const cy = ((e.clientY - rect.top) / Math.max(1, rect.height)) * dom.fullMapCanvas.height;
    const wpt = fullMapToWorld(cx, cy, dom.fullMapCanvas.width, dom.fullMapCanvas.height);
    ctx.gameplay?.setGPSTarget?.(wpt.x, wpt.z);
    audio.playPhoneConfirm();
    showNotification(`📍 Đã cắm mốc GPS tại tọa độ (${Math.round(wpt.x)}, ${Math.round(wpt.z)})!`, 'gold');
    drawFullMap(ctx);
  });
  // Clicking/tapping the Minimap also opens the Full Map!
  if (dom.minimapContainer) {
    dom.minimapContainer.style.pointerEvents = 'auto';
    dom.minimapContainer.style.cursor = 'pointer';
    dom.minimapContainer.title = 'Mở Bản Đồ Toàn Cảnh [~]';
    dom.minimapContainer.addEventListener('click', (e) => {
      e.stopPropagation();
      if (ctx.started && !ctx.paused && !ctx.raceArena?.isActive?.()) {
        toggleFullMap();
      }
    });
  }

  dom.raceCloseBtn?.addEventListener('click', () => closeRaceLobby());
  dom.raceArenaModal?.querySelectorAll('[data-race-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      raceModalTab = btn.getAttribute('data-race-tab') || 'lobby';
      audio.playPhoneTap();
      renderRaceLobbyModal();
    });
  });
  dom.raceSkillBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    audio.unlock();
    ctx.raceArena?.triggerPlayerRaceSkill?.();
  });
  dom.raceNitroBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    audio.unlock();
    ctx.raceArena?.triggerPlayerRaceNitro?.();
  });
  dom.raceResetCarBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    ctx.raceArena?.resetPlayerCarOnTrack?.();
  });
  dom.raceSpectateCamBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    ctx.raceArena?.cycleSpectateTarget?.();
  });
  dom.raceExitBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    ctx.raceArena?.exitRaceArena?.();
  });

  function updateRaceHUD(gameCtx) {
    if (!dom.raceHud) return;
    const st = gameCtx.raceArena?.getRaceHUDState?.();
    const isActive = Boolean(st && st.active);
    dom.raceHud.classList.toggle('hidden', !isActive);
    if (!isActive) {
      lastRaceFinishRendered = false;
      if (dom.raceFinishOverlay) dom.raceFinishOverlay.classList.add('hidden');
      return;
    }

    if (dom.raceRankTxt) {
      dom.raceRankTxt.textContent = st.mode === 'spectate' ? `🎥 ${st.focusName}` : `HẠNG ${st.rank}/${st.totalRacers}`;
    }
    if (dom.raceLapTxt) dom.raceLapTxt.textContent = `VÒNG ${st.lap}/${st.totalLaps}`;
    if (dom.raceSpdTxt) dom.raceSpdTxt.textContent = `${st.speedKmh} KM/H`;
    if (dom.raceMapBadge) {
      const betNote = st.betAmount > 0 ? ` • 🎰 Cược $${st.betAmount.toLocaleString('en-US')} → ${st.betRacerName}` : '';
      dom.raceMapBadge.textContent = `${st.mapName}${betNote}`;
    }
    if (dom.raceSpectateCamBtn) dom.raceSpectateCamBtn.classList.toggle('hidden', st.mode !== 'spectate');
    if (dom.raceResetCarBtn) dom.raceResetCarBtn.classList.toggle('hidden', st.mode === 'spectate');

    if (dom.raceCountdownBanner) {
      const showCd = st.phase === 'countdown';
      dom.raceCountdownBanner.classList.toggle('hidden', !showCd);
      if (showCd) {
        dom.raceCountdownBanner.textContent = st.countdown > 0 ? String(st.countdown) : 'XUẤT PHÁT!';
      }
    }

    if (dom.raceFeedList) {
      const feedHtml = st.feed.map((f) => `<div class="race-feed-item">${escapeHTML(f.text)}</div>`).join('');
      if (dom.raceFeedList.dataset.prev !== feedHtml) {
        dom.raceFeedList.dataset.prev = feedHtml;
        dom.raceFeedList.innerHTML = feedHtml;
      }
    }

    if (dom.raceLeaderboard) {
      const lbHtml = st.standings
        .map(
          (r) => `
          <div class="race-lb-row ${r.isPlayer ? 'me' : ''}">
            <span>#${r.rank} ${escapeHTML(r.name)}</span>
            <span>V${r.lap} • ${r.hp}HP</span>
          </div>`
        )
        .join('');
      if (dom.raceLeaderboard.dataset.prev !== lbHtml) {
        dom.raceLeaderboard.dataset.prev = lbHtml;
        dom.raceLeaderboard.innerHTML = lbHtml;
      }
    }

    const hpPct = clamp((st.hp / Math.max(1, st.maxHp)) * 100, 0, 100);
    if (dom.raceHpTxt) dom.raceHpTxt.textContent = st.respawnTimer > 0 ? `HỒI SINH ${st.respawnTimer.toFixed(1)}s` : `${st.hp}/${st.maxHp}`;
    if (dom.raceHpFill) dom.raceHpFill.style.width = `${hpPct.toFixed(1)}%`;
    if (dom.raceNitroTxt) dom.raceNitroTxt.textContent = `${st.nitro}%`;
    if (dom.raceNitroFill) dom.raceNitroFill.style.width = `${clamp(st.nitro, 0, 100)}%`;

    if (dom.raceSkillBtn) {
      dom.raceSkillBtn.classList.toggle('hidden', st.mode === 'spectate');
      const ready = st.skillCd <= 0.05;
      dom.raceSkillBtn.classList.toggle('cooling', !ready);
      const lbl = ready ? `${st.skillIcon} ${st.skillName.toUpperCase()} [Space]` : `${st.skillIcon} HỒI CHIÊU ${st.skillCd.toFixed(1)}s`;
      if (dom.raceSkillBtn.textContent !== lbl) dom.raceSkillBtn.textContent = lbl;
    }
    if (dom.raceNitroBtn) {
      dom.raceNitroBtn.classList.toggle('hidden', st.mode === 'spectate');
    }

    if (dom.raceFinishOverlay) {
      if (st.phase === 'finished' && !lastRaceFinishRendered) {
        lastRaceFinishRendered = true;
        const prizeText =
          st.mode === 'spectate'
            ? 'Chế độ Xem & Cá Cược'
            : st.racePrize > 0
              ? `🏆 HẠNG #${st.playerFinishRank} • THƯỞNG ĐUA +$${st.racePrize.toLocaleString('en-US')}!`
              : `Hạng #${st.playerFinishRank} • Không có thưởng đua (Top 3 mới có thưởng)`;
        const betText =
          st.betAmount > 0
            ? st.betPayout > 0
              ? `🎰 THẮNG CƯỢC x5: +$${st.betPayout.toLocaleString('en-US')}!`
              : `🎰 Thua cược ($${st.betAmount.toLocaleString('en-US')})`
            : '';

        dom.raceFinishOverlay.innerHTML = `
          <div class="race-finish-card">
            <h2>🏁 KẾT QUẢ TRƯỜNG ĐUA TỬ THẦN</h2>
            <p class="race-finish-prize">${escapeHTML(prizeText)}</p>
            ${betText ? `<p class="race-finish-bet">${escapeHTML(betText)}</p>` : ''}
            <div class="race-finish-list">
              ${st.standings.map((r) => `
                <div class="race-lb-row ${r.isPlayer ? 'me' : ''}">
                  <span>#${r.rank} ${escapeHTML(r.name)}</span>
                  <span>${r.finished ? `${r.finishTime.toFixed(1)}s` : `Vòng ${r.lap}`}</span>
                </div>`).join('')}
            </div>
            <div class="race-finish-actions">
              <button type="button" id="race-again-btn" class="race-launch-btn primary">🔄 Về Sảnh Chờ Đua Tiếp</button>
              <button type="button" id="race-leave-btn" class="race-launch-btn spectate">🏙️ Ra Đại Lộ Chu Tước</button>
            </div>
          </div>`;
        dom.raceFinishOverlay.classList.remove('hidden');
        dom.raceFinishOverlay.querySelector('#race-again-btn')?.addEventListener('click', () => {
          ctx.raceArena?.exitRaceArena?.();
          openRaceLobby();
        });
        dom.raceFinishOverlay.querySelector('#race-leave-btn')?.addEventListener('click', () => {
          ctx.raceArena?.exitRaceArena?.();
        });
      }
    }
  }

  function triggerGojoNukeAction() {
    if (!ctx.started || input.paused) return;
    ctx.gameplay?.triggerGojoMapNuke?.(false);
  }

  // --------------------------------------------------------------------------
  // Neon Bar Club VIP — Interactive 3-Dice Tài Xỉu Mini-Game
  // --------------------------------------------------------------------------
  let txChoice = 'tai';
  let txRolling = false;
  let txRollTimer = null;
  let txFlickerTimer = null;
  const txHistoryLog = [];

  const DIE_PIPS_MAP = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  function renderDieFace(el, val) {
    if (!el) return;
    const face = clamp(Math.round(Number(val) || 1), 1, 6);
    el.setAttribute('data-val', String(face));
    const pips = DIE_PIPS_MAP[face] || [4];
    let html = '';
    for (let i = 0; i < 9; i++) {
      html += `<span class="tx-pip ${pips.includes(i) ? 'on' : ''}"></span>`;
    }
    el.innerHTML = html;
  }

  function syncBarClubBalance() {
    if (!dom.txBalance) return;
    const cash = Math.max(0, Math.round(Number(ctx.player?.cash) || 0));
    dom.txBalance.textContent = `$${cash.toLocaleString('en-US')}`;
  }

  function renderTaiXiuHistory() {
    if (!dom.txHistory) return;
    if (txHistoryLog.length === 0) {
      dom.txHistory.innerHTML = '<span class="tx-hist-empty">Chưa có phiên nào — lắc để mở cầu!</span>';
      return;
    }
    dom.txHistory.innerHTML = txHistoryLog
      .map(
        (h) =>
          `<span class="tx-hist-pill ${h.tag}" title="Xúc xắc: ${h.d1}-${h.d2}-${h.d3} (Tổng ${h.sum})">${
            h.tag === 'bao' ? 'B' : h.tag === 'tai' ? 'T' : 'X'
          } ${h.sum}</span>`
      )
      .join('');
  }

  function openBarClub() {
    if (input.barClubOpen || input.paused || !ctx.started || !dom.barClubModal) return;
    if (input.wheelOpen) closeWeaponWheel(false);
    if (input.phoneOpen) closePhone();
    if (input.chatOpen) closeChatModal();
    input.barClubOpen = true;
    if (document.pointerLockElement && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (_) {}
    }
    syncBarClubBalance();
    renderDieFace(dom.txDice[0], 4);
    renderDieFace(dom.txDice[1], 5);
    renderDieFace(dom.txDice[2], 6);
    renderTaiXiuHistory();
    dom.barClubModal.classList.remove('hidden');
    audio.playPhoneOpen();
  }

  function closeBarClub() {
    if (!input.barClubOpen) return;
    if (txRolling) return;
    input.barClubOpen = false;
    if (dom.barClubModal) dom.barClubModal.classList.add('hidden');
    audio.playPhoneClose();
  }

  function executeTaiXiuRoll() {
    if (txRolling || !ctx.gameplay?.playTaiXiuBet) return;
    const rawBet = Math.floor(Number(dom.txBetInput?.value) || 0);
    const cash = Math.max(0, Math.round(Number(ctx.player?.cash) || 0));
    if (rawBet < 1) {
      audio.playPhoneError();
      if (dom.txResultBanner) {
        dom.txResultBanner.className = 'tx-result-banner lose';
        dom.txResultBanner.textContent = 'Hãy nhập mức cược tối thiểu $1!';
      }
      return;
    }
    if (rawBet > cash) {
      audio.playPhoneError();
      if (dom.txResultBanner) {
        dom.txResultBanner.className = 'tx-result-banner lose';
        dom.txResultBanner.textContent = `Không đủ ngân lượng! Ví hiện có $${cash.toLocaleString('en-US')}.`;
      }
      return;
    }

    const res = ctx.gameplay.playTaiXiuBet(txChoice, rawBet);
    if (!res?.ok) {
      audio.playPhoneError();
      return;
    }

    txRolling = true;
    syncBarClubBalance();
    if (dom.txRollBtn) {
      dom.txRollBtn.disabled = true;
      dom.txRollBtn.textContent = '🎲 ĐANG LẮC XÚC XẮC...';
    }
    if (dom.txBowl) dom.txBowl.classList.add('rolling');
    if (dom.txResultBanner) {
      dom.txResultBanner.className = 'tx-result-banner';
      dom.txResultBanner.textContent = `Đang lắc cược $${rawBet.toLocaleString('en-US')} vào cửa ${txChoice === 'tai' ? 'TÀI' : txChoice === 'xiu' ? 'XỈU' : 'BÃO'}...`;
    }
    audio.playDiceRoll();

    let ticks = 0;
    txFlickerTimer = setInterval(() => {
      ticks++;
      renderDieFace(dom.txDice[0], 1 + ((ticks * 3 + Math.floor(Math.random() * 6)) % 6));
      renderDieFace(dom.txDice[1], 1 + ((ticks * 5 + Math.floor(Math.random() * 6)) % 6));
      renderDieFace(dom.txDice[2], 1 + ((ticks * 7 + Math.floor(Math.random() * 6)) % 6));
    }, 80);

    txRollTimer = setTimeout(() => {
      if (txFlickerTimer) {
        clearInterval(txFlickerTimer);
        txFlickerTimer = null;
      }
      txRolling = false;
      if (dom.txBowl) dom.txBowl.classList.remove('rolling');
      renderDieFace(dom.txDice[0], res.d1);
      renderDieFace(dom.txDice[1], res.d2);
      renderDieFace(dom.txDice[2], res.d3);

      if (res.payout > 0) {
        ctx.gameplay.applyTaiXiuPayout(res.payout);
      }
      syncBarClubBalance();

      const labelMap = { tai: 'TÀI', xiu: 'XỈU', bao: 'BÃO ĐỒNG NHẤT' };
      const outcomeLabel = res.isTriple
        ? `BÃO ${res.d1}-${res.d2}-${res.d3} (Tổng ${res.sum})`
        : `${res.sum >= 11 ? 'TÀI' : 'XỈU'} • Tổng ${res.sum} (${res.d1}+${res.d2}+${res.d3})`;

      if (dom.txResultBanner) {
        if (res.won) {
          dom.txResultBanner.className = 'tx-result-banner win';
          dom.txResultBanner.textContent = `🎉 THẮNG +$${res.payout.toLocaleString('en-US')} (×${res.multiplier}) • ${outcomeLabel}!`;
          audio.playPhoneConfirm();
          audio.playCash();
        } else {
          dom.txResultBanner.className = 'tx-result-banner lose';
          dom.txResultBanner.textContent = `💸 THUA -$${res.amount.toLocaleString('en-US')} • Kết quả: ${outcomeLabel} (Cửa ${labelMap[res.choice]})`;
          audio.playPhoneError();
        }
      }

      txHistoryLog.unshift({ d1: res.d1, d2: res.d2, d3: res.d3, sum: res.sum, tag: res.resultTag });
      if (txHistoryLog.length > 12) txHistoryLog.pop();
      renderTaiXiuHistory();

      if (dom.txRollBtn) {
        dom.txRollBtn.disabled = false;
        dom.txRollBtn.textContent = '🎲 LẮC XÚC XẮC NGAY';
      }
    }, 840);
  }

  if (dom.barClubModal) {
    dom.barClubModal.querySelectorAll('[data-tx-choice]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (txRolling) return;
        txChoice = btn.getAttribute('data-tx-choice') || 'tai';
        dom.barClubModal.querySelectorAll('[data-tx-choice]').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
        audio.playPhoneTap();
      });
    });

    dom.barClubModal.querySelectorAll('[data-tx-chip]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (txRolling || !dom.txBetInput) return;
        const val = Number(btn.getAttribute('data-tx-chip')) || 10;
        const cash = Math.max(1, Math.round(Number(ctx.player?.cash) || 0));
        dom.txBetInput.value = String(Math.min(val, cash));
        audio.playPhoneTap();
      });
    });

    dom.barClubModal.querySelectorAll('[data-tx-mod]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (txRolling || !dom.txBetInput) return;
        const mod = btn.getAttribute('data-tx-mod');
        const cur = Math.max(1, Math.floor(Number(dom.txBetInput.value) || 10));
        const cash = Math.max(1, Math.round(Number(ctx.player?.cash) || 0));
        if (mod === 'half') dom.txBetInput.value = String(Math.max(1, Math.floor(cur / 2)));
        else if (mod === 'double') dom.txBetInput.value = String(Math.min(cash, cur * 2));
        else if (mod === 'allin') dom.txBetInput.value = String(cash);
        audio.playPhoneTap();
      });
    });

    dom.txRollBtn?.addEventListener('click', () => executeTaiXiuRoll());
    dom.txCloseBtn?.addEventListener('click', () => closeBarClub());
    dom.txGpsShopBtn?.addEventListener('click', () => {
      if (txRolling) return;
      ctx.gameplay?.triggerPhoneAction?.('gps_shop');
      audio.playPhoneConfirm();
      closeBarClub();
    });
  }

  if (dom.discipleShopModal) {
    dom.shopCloseBtn?.addEventListener('click', () => closeDiscipleShop());
    dom.shopGpsClubBtn?.addEventListener('click', () => {
      ctx.gameplay?.triggerPhoneAction?.('gps_barclub');
      audio.playPhoneConfirm();
      closeDiscipleShop();
    });
  }

  if (dom.gojoNukeBtn) {
    dom.gojoNukeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.unlock();
      triggerGojoNukeAction();
    });
  }
  if (dom.tulenSkillBtn) {
    dom.tulenSkillBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.unlock();
      ctx.gameplay?.toggleTulenTargeting?.();
    });
  }
  if (dom.legendBribeBtn) {
    dom.legendBribeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.unlock();
      ctx.gameplay?.triggerLegendBribeSkill?.();
    });
  }
  dom.tulenFireBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    audio.unlock();
    ctx.gameplay?.fireTulenThunderbird?.();
  });
  dom.tulenCycleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    audio.unlock();
    ctx.gameplay?.cycleTulenTarget?.(1);
  });
  dom.tulenCancelBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    ctx.gameplay?.cancelTulenTargeting?.();
  });
  // Tap/Click directly on an enemy in 3D viewport while choosing Tulen Lôi Điểu target
  window.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (!ctx.started || ctx.paused || input.phoneOpen || input.barClubOpen || input.shopOpen || input.chatOpen) return;
    const tState = ctx.gameplay?.getTulenState?.();
    if (!tState || !tState.active) return;
    if (e.target && e.target.closest && e.target.closest('button, #tulen-target-bar, #hud-quick-bar, #touch-controls, #phone-ui')) return;
    const ndcX = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    const ndcY = -(e.clientY / Math.max(1, window.innerHeight)) * 2 + 1;
    const hitSpecific = ctx.gameplay?.selectTulenTargetByScreenPos?.(ndcX, ndcY);
    if (!hitSpecific) {
      ctx.gameplay?.fireTulenThunderbird?.();
    }
  });

  function closePhone() {
    if (!input.phoneOpen) return;
    input.phoneOpen = false;
    if (dom.phoneEl) dom.phoneEl.classList.add('hidden');
    audio.playPhoneClose();
  }

  function togglePhone() {
    if (input.phoneOpen) closePhone();
    else openPhone();
  }

  function handlePhoneKey(code) {
    if (/^[0-9]$/.test(code)) {
      if (phoneCurrentApp !== 'dialer') {
        phoneCurrentApp = 'dialer';
        phoneDialed = '';
        renderPhoneScreen();
      }
      pressDialKey(code);
      return;
    }
    if (phoneCurrentApp === 'dialer' && code === 'Backspace' && phoneDialed) {
      pressDialKey(code);
      return;
    }
    if (phoneCurrentApp === 'home') {
      const tiles = dom.phoneBody.querySelectorAll('[data-open-app]');
      if (!tiles.length) return;
      if (code === 'ArrowRight') phoneFocusIdx = (phoneFocusIdx + 1) % tiles.length;
      else if (code === 'ArrowLeft') phoneFocusIdx = (phoneFocusIdx - 1 + tiles.length) % tiles.length;
      else if (code === 'ArrowDown') phoneFocusIdx = (phoneFocusIdx + 3) % tiles.length;
      else if (code === 'ArrowUp') phoneFocusIdx = (phoneFocusIdx - 3 + tiles.length) % tiles.length;
      else if (code === 'Enter') {
        if (tiles[phoneFocusIdx]) {
          tiles[phoneFocusIdx].click();
          return;
        }
      } else if (code === 'Backspace') {
        closePhone();
        return;
      }
      audio.playPhoneTap();
      renderPhoneScreen();
    } else if (code === 'Backspace') {
      phoneCurrentApp = 'home';
      audio.playPhoneTap();
      renderPhoneScreen();
    }
  }

  if (dom.btnOpenPhone) {
    dom.btnOpenPhone.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.unlock();
      togglePhone();
    });
  }
  if (dom.phoneBackBtn) {
    dom.phoneBackBtn.addEventListener('click', () => {
      audio.playPhoneTap();
      if (phoneCurrentApp === 'home') closePhone();
      else {
        phoneCurrentApp = 'home';
        renderPhoneScreen();
      }
    });
  }
  if (dom.phoneCloseBtn) {
    dom.phoneCloseBtn.addEventListener('click', () => closePhone());
  }

  // --------------------------------------------------------------------------
  // Pause Menu & Settings Helpers
  // --------------------------------------------------------------------------
  function cycleQuality() {
    const current = QUALITY_PRESETS.findIndex((preset) => preset.id === ctx.engine?.quality);
    qualityIdx = ((current < 0 ? qualityIdx : current) + 1) % QUALITY_PRESETS.length;
    const nextQ = QUALITY_PRESETS[qualityIdx];
    if (ctx.engine && typeof ctx.engine.setQuality === 'function') {
      try { ctx.engine.setQuality(nextQ.id, true); } catch (_) {}
    }
    syncPauseLabels();
    audio.playPhoneTap();
    showNotification(`Đồ họa: ${nextQ.label}`, 'gold');
  }

  function cycleWeather() {
    weatherIdx = (weatherIdx + 1) % WEATHER_PRESETS.length;
    const nextW = WEATHER_PRESETS[weatherIdx];
    if (ctx.engine && typeof ctx.engine.setTimeWeather === 'function') {
      try { ctx.engine.setTimeWeather(nextW.id); } catch (_) {}
    }
    syncPauseLabels();
    audio.playPhoneTap();
    showNotification(`Thiên Thời: ${nextW.label}`, 'blue');
  }

  function cycleTouchMode() {
    const order = ['auto', 'on', 'off'];
    const idx = (order.indexOf(input.touchMode) + 1) % order.length;
    input.touchMode = order[idx];
    syncTouchVisibility();
    audio.playPhoneTap();
  }

  function syncPauseLabels() {
    if (dom.btnQuality) {
      const curQ = ctx.engine?.quality || QUALITY_PRESETS[qualityIdx].id;
      const qObj = QUALITY_PRESETS.find((q) => q.id === curQ) || QUALITY_PRESETS[qualityIdx];
      dom.btnQuality.textContent = `ĐỒ HỌA: ${qObj.label.toUpperCase()}`;
    }
    if (dom.btnWeather) {
      const curW = ctx.engine?.timeWeather || WEATHER_PRESETS[weatherIdx].id;
      const wObj = WEATHER_PRESETS.find((w) => w.id === curW) || WEATHER_PRESETS[weatherIdx];
      dom.btnWeather.textContent = `THIÊN THỜI: ${wObj.label.toUpperCase()}`;
    }
  }

  function togglePause(forceState) {
    if (!ctx.started) return;
    const next = typeof forceState === 'boolean' ? forceState : !input.paused;
    if (next) {
      closeWeaponWheel(false);
      closePhone();
      closeChatModal();
      closeBarClub();
      closeDiscipleShop();
    }
    input.paused = next;
    ctx.paused = next;
    if (next && document.pointerLockElement && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (_) {}
    }
    if (dom.pauseMenu) dom.pauseMenu.classList.toggle('hidden', !next);
    syncPauseLabels();
    audio.playPhoneTap();
  }

  if (dom.btnOpenPause) {
    dom.btnOpenPause.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.unlock();
      togglePause();
    });
  }
  dom.btnCycleCamera?.addEventListener('click', () => {
    if (!ctx.started || input.paused || input.wheelOpen || input.phoneOpen || input.chatOpen) return;
    input.cycleCamera();
    audio.playPhoneTap();
  });
  if (dom.btnFullscreen) {
    document.addEventListener('fullscreenchange', () => {
      dom.btnFullscreen.textContent = document.fullscreenElement ? 'THOÁT TOÀN MÀN HÌNH' : 'TOÀN MÀN HÌNH';
    });
    dom.btnFullscreen.addEventListener('click', async () => {
      if (dom.fullscreenStatus) dom.fullscreenStatus.textContent = '';
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
          return;
        }
        await document.documentElement.requestFullscreen();
      } catch (_) {
        if (dom.fullscreenStatus) dom.fullscreenStatus.textContent = 'Hãy xoay ngang thiết bị để chơi với góc nhìn rộng hơn.';
        return;
      }
      try { await screen.orientation?.lock?.('landscape'); } catch (_) {
        if (dom.fullscreenStatus) dom.fullscreenStatus.textContent = 'Hãy xoay ngang thiết bị.';
      }
    });
  }
  if (dom.btnResume) dom.btnResume.addEventListener('click', () => togglePause(false));
  if (dom.btnSave) {
    dom.btnSave.addEventListener('click', () => {
      if (ctx.gameplay && typeof ctx.gameplay.saveGame === 'function') ctx.gameplay.saveGame();
      audio.playPhoneConfirm();
      showNotification('Đã lưu hành trang Giang Hồ!', 'green');
    });
  }
  if (dom.btnQuality) dom.btnQuality.addEventListener('click', cycleQuality);
  if (dom.btnWeather) dom.btnWeather.addEventListener('click', cycleWeather);
  if (dom.btnToggleTouch) dom.btnToggleTouch.addEventListener('click', cycleTouchMode);

  [dom.btnStartGame, dom.btnContinueGame, dom.btnNewGame, dom.btnJoinOnline].forEach((btn) => {
    if (!btn) return;
    btn.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
    btn.addEventListener('touchstart', () => audio.unlock(), { passive: true });
  });

  // --------------------------------------------------------------------------
  // Notifications, Subtitles, Cash Deltas & Full-Width Wuxia Banners
  // --------------------------------------------------------------------------
  let lastToastMsg = '';
  let lastToastAt = 0;
  let lastCashPopupAt = 0;
  let lastHitmarkerSoundAt = 0;

  function showNotification(text, style = 'gold') {
    if (!dom.notifFeed || !text) return;
    const nowMs = performance.now();
    if (text === lastToastMsg && nowMs - lastToastAt < 180) return;
    lastToastMsg = text;
    lastToastAt = nowMs;

    const el = document.createElement('div');
    const styleCls =
      style === 'purple' ? 'toast-purple'
      : style === 'green' ? 'toast-green'
      : style === 'red' ? 'toast-red'
      : style === 'blue' ? 'toast-blue'
      : '';
    el.className = `gta-toast ${styleCls}`.trim();
    el.innerHTML = formatGTASubtitle(text);
    dom.notifFeed.appendChild(el);

    while (dom.notifFeed.children.length > 4) {
      dom.notifFeed.removeChild(dom.notifFeed.firstChild);
    }

    setTimeout(() => {
      el.classList.add('fade-away');
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 320);
    }, 3600);
  }

  function showCashDelta(delta) {
    if (!dom.cashDelta || !delta) return;
    const nowMs = performance.now();
    if (nowMs - lastCashPopupAt < 65) return;
    lastCashPopupAt = nowMs;
    if (ctx.player && Number.isFinite(ctx.player.cash)) {
      lastCash = Math.max(0, Math.round(Number(ctx.player.cash)));
    }
    const item = document.createElement('div');
    const sign = delta > 0 ? '+' : '-';
    item.className = `cash-delta-popup ${delta > 0 ? 'positive' : 'negative'}`;
    item.textContent = `${sign}$${Math.abs(Math.round(delta)).toLocaleString('en-US')}`;
    dom.cashDelta.appendChild(item);
    setTimeout(() => {
      if (item.parentNode) item.parentNode.removeChild(item);
    }, 1650);
  }

  function showVehicleCallout(label, category = '') {
    if (!dom.vehicleCallout || !label) return;
    const full = category && !String(label).includes('—') ? `${label} — ${category}` : String(label);
    dom.vehicleCallout.textContent = full;
    dom.vehicleCallout.classList.add('visible');
    vehicleCalloutTimer = 4.5;
  }

  function showBanner(title, subtitle = '', type = 'passed', duration = 4.2) {
    if (!dom.gtaBanner || !dom.gtaBannerTitle) return;
    const tUpper = String(title || '').toUpperCase();
    let kind = String(type || '').toLowerCase();
    if (kind.includes('wast') || tUpper.includes('TRỌNG THƯƠNG') || tUpper.includes('HẠ GỤC')) kind = 'wasted';
    else if (kind.includes('bust') || tUpper.includes('BẮT GIỮ')) kind = 'busted';
    else if (kind.includes('fail') || tUpper.includes('THẤT BẠI')) kind = 'failed';
    else kind = 'passed';

    dom.gtaBanner.classList.remove('hidden', 'banner-wasted', 'banner-busted', 'banner-passed', 'banner-failed');
    dom.gtaBanner.classList.add(`banner-${kind}`);
    dom.gtaBannerTitle.textContent = title;
    if (dom.gtaBannerSub) dom.gtaBannerSub.textContent = subtitle || '';
    bannerTimer = Math.max(1.5, Number(duration) || 4.2);

    if (kind === 'wasted') audio.playWasted();
    else if (kind === 'busted') audio.playBusted();
    else if (kind === 'failed') audio.playMissionFailed();
    else audio.playMissionPassed();
  }

  function showSubtitle(text, duration = 4.8) {
    if (!dom.subtitleBar) return;
    if (!text) {
      subtitleTimer = 0;
      if (!persistentObjective) dom.subtitleBar.classList.add('hidden');
      return;
    }
    dom.subtitleBar.innerHTML = formatGTASubtitle(text);
    dom.subtitleBar.classList.remove('hidden');
    subtitleTimer = Math.max(0.5, Number(duration) || 4.8);
  }

  function setObjective(text) {
    persistentObjective = text || '';
    if (subtitleTimer <= 0 && dom.subtitleBar) {
      if (persistentObjective) {
        dom.subtitleBar.innerHTML = formatGTASubtitle(persistentObjective);
        dom.subtitleBar.classList.remove('hidden');
      } else {
        dom.subtitleBar.classList.add('hidden');
      }
    }
  }

  function showPrompt(text, duration = 0.25) {
    explicitPrompt = text || '';
    explicitPromptTimer = text ? Math.max(0.1, duration) : 0;
  }

  function triggerHitmarker(isCrit = false) {
    if (!dom.hitmarker) return;
    hitmarkerTimer = 0.17;
    dom.hitmarker.classList.add('active');
    if (isCrit) dom.hitmarker.classList.add('crit');
    const nowMs = performance.now();
    if (nowMs - lastHitmarkerSoundAt > 40) {
      lastHitmarkerSoundAt = nowMs;
      audio.playHitmarker(isCrit);
    }
  }

  // --------------------------------------------------------------------------
  // Neo-Wuxia Rectangular 3D-Tilted GPS Radar Minimap + Multiplayer Blips
  // --------------------------------------------------------------------------
  const minimap2D = dom.minimapCanvas ? dom.minimapCanvas.getContext('2d') : null;

  function fallbackZoneInfo(x, z) {
    if (x > 500 && z > 500) {
      return { streetName: 'Tĩnh Tâm Biệt Viện', zoneName: 'Mật Thất Hiệp Khách' };
    }
    if (x < -128 && z >= -34 && z <= 24) {
      return { streetName: 'Bến Cảng Bồng Lai', zoneName: 'Đông Hải • Thiên Luân Đài' };
    }
    if (x < -202) {
      return { streetName: 'Đông Hải Bồng Lai', zoneName: 'Vùng Biển Rộng' };
    }
    if (x < -128) {
      return { streetName: 'Bãi Cát Bồng Lai', zoneName: 'Bờ Biển Hoa Đào' };
    }
    if (z < -222) {
      return { streetName: 'Quan Sơn Đình', zoneName: 'Đỉnh VÕ LÂM • Bắc Sơn' };
    }
    const street =
      Math.abs(x - 40) < 22 ? 'Đại Lộ Chu Tước'
      : Math.abs(x + 40) < 18 ? 'Phố Bạch Hổ'
      : Math.abs(x - 120) < 18 ? 'Đại Lộ Thanh Long'
      : Math.abs(x - 200) < 18 ? 'Phố Thiên Cơ'
      : Math.abs(x + 120) < 18 ? 'Đường Ven Biển Bồng Lai'
      : 'Phố Huyền Vũ Kinh Thành';
    const zone =
      x >= 110 ? 'Nội Thành Thiên Cơ'
      : x <= -20 ? 'Thương Phường Tụ Bảo'
      : 'Đại Lộ Chu Tước • Kinh Thành';
    return { streetName: street, zoneName: zone };
  }

  function drawMinimap(rawDt, gameCtx) {
    if (!minimap2D || !dom.minimapCanvas || !gameCtx?.player) return;
    const isMob = Boolean(input.isTouchDevice || gameCtx.isMobile || gameCtx.engine?.quality === 'MOBILE');
    if (isMob) {
      minimapDrawAccum += rawDt;
      if (minimapDrawAccum < 0.050) return;
      rawDt = minimapDrawAccum;
      minimapDrawAccum = 0;
    }
    const p = gameCtx.player;
    const inCar = !!(p.inCar || p.vehicle);

    if (dom.minimapContainer) {
      dom.minimapContainer.classList.toggle('in-car', inCar);
      dom.minimapContainer.classList.toggle('wanted-alert', (gameCtx.gameplay?.wanted?.stars || 0) >= 1);
    }

    const targetW = isMob ? 208 : 260;
    const targetH = isMob ? 148 : 186;
    if (dom.minimapCanvas.width !== targetW || dom.minimapCanvas.height !== targetH) {
      dom.minimapCanvas.width = targetW;
      dom.minimapCanvas.height = targetH;
    }

    const c = minimap2D;
    const w = targetW;
    const h = targetH;
    const cx = w * 0.5;
    const cy = inCar ? h * 0.60 : h * 0.52;

    const carSpd = inCar
      ? Math.hypot(p.inCar?.vx || 0, p.inCar?.vz || 0) || Math.abs(p.inCar?.speed || 0)
      : 0;
    const targetScale = inCar ? clamp(1.02 - carSpd * 0.008, 0.68, 1.02) : 1.22;
    radarScaleSmoothed += (targetScale - radarScaleSmoothed) * Math.min(1, rawDt * 6);
    const scale = radarScaleSmoothed;

    let radarRot = 0;
    const cam = gameCtx.engine?.camera;
    if (cam && cam.matrixWorld && cam.matrixWorld.elements) {
      const e = cam.matrixWorld.elements;
      const fx = -e[8];
      const fz = -e[10];
      if (fx * fx + fz * fz > 0.0001) {
        radarRot = -Math.atan2(fx, -fz);
      }
    } else if (Number.isFinite(gameCtx.engine?.camYaw)) {
      radarRot = gameCtx.engine.camYaw;
    }

    const px = p.x > 500 ? 24 : p.x;
    const pz = p.z > 500 ? -80 : p.z;

    c.save();
    // 1. Deep Jade-Teal Bồng Lai Sea
    c.fillStyle = '#1f3947';
    c.fillRect(0, 0, w, h);

    c.translate(cx, cy);
    c.rotate(radarRot);
    c.scale(scale, scale);
    c.translate(-px, -pz);

    // 2. Shallow surf + Sandy Beach + North VÕ LÂM Hills + City Landmass
    c.fillStyle = '#294e5e';
    c.fillRect(-235, -270, 120, 530);

    c.fillStyle = '#8f8062';
    c.fillRect(-212, -245, 84, 490);

    c.fillStyle = '#213026';
    c.fillRect(-215, -395, 485, 175);

    c.fillStyle = '#1a1e26';
    c.fillRect(-128, -230, 395, 470);

    // Bến Cảng Bồng Lai & Thiên Luân Wheel
    c.fillStyle = '#6b5340';
    c.fillRect(-295, -32, 167, 54);
    c.strokeStyle = '#f0c35a';
    c.lineWidth = 1.6;
    c.beginPath();
    c.arc(-245, -12, 18, 0, Math.PI * 2);
    c.stroke();

    // 3. Building Footprints (pre-filtered once for zero per-frame AABB filtering overhead)
    if (!cachedMinimapBlocks && Array.isArray(gameCtx.world?.aabbs) && gameCtx.world.aabbs.length > 0) {
      cachedMinimapBlocks = [];
      for (let i = 0; i < gameCtx.world.aabbs.length; i++) {
        const b = gameCtx.world.aabbs[i];
        if (!b || b.maxY < 2.2 || b.minX > 500) continue;
        const bw = b.maxX - b.minX;
        const bz = b.maxZ - b.minZ;
        if (bw > 240 || bz > 240) continue;
        cachedMinimapBlocks.push({
          x: b.minX,
          z: b.minZ,
          w: bw,
          d: bz,
          cx: (b.minX + b.maxX) * 0.5,
          cz: (b.minZ + b.maxZ) * 0.5,
        });
      }
    }
    if (cachedMinimapBlocks && cachedMinimapBlocks.length > 0) {
      c.fillStyle = '#10131a';
      for (let i = 0; i < cachedMinimapBlocks.length; i++) {
        const b = cachedMinimapBlocks[i];
        if (Math.abs(b.cx - px) > 210 || Math.abs(b.cz - pz) > 210) continue;
        c.fillRect(b.x, b.z, b.w, b.d);
      }
    } else {
      c.fillStyle = '#11151c';
      const vxCols = [-80, 0, 80, 160];
      const hzRows = [-160, -80, 0, 80, 160];
      for (const bx of vxCols) {
        for (const bz of hzRows) {
          c.fillRect(bx - 26, bz - 26, 52, 52);
        }
      }
    }

    // Tháp Thiên Cơ (160, -40)
    c.fillStyle = '#26384d';
    c.strokeStyle = '#f0c35a';
    c.lineWidth = 1.4;
    c.fillRect(136, -64, 48, 48);
    c.strokeRect(136, -64, 48, 48);

    // 4. City Avenues & Chu Tước Boulevard + Vermilion Paifang Gate Markers
    const vRoads = [-120, -40, 40, 120, 200];
    const hRoads = [-200, -120, -40, 40, 120, 200];
    c.fillStyle = '#4c5462';
    for (const rx of vRoads) {
      const rw = rx === 40 ? 22 : 16;
      c.fillRect(rx - rw * 0.5, -225, rw, 450);
    }
    for (const rz of hRoads) {
      c.fillRect(-128, rz - 8, 355, 16);
    }
    c.fillStyle = '#636e80';
    c.fillRect(29, -225, 22, 450);
    c.fillStyle = '#5a3a48';
    c.fillRect(38.8, -215, 2.4, 430);

    // Paifang Gates along Chu Tước Boulevard
    c.fillStyle = '#de283b';
    for (const gz of [188, 6, -188]) {
      c.fillRect(27, gz - 1.5, 26, 3);
    }

    // 5. GPS Route Polyline
    const gps = gameCtx.gameplay?.gpsWaypoints;
    let gpsDistMeters = 0;
    if (Array.isArray(gps) && gps.length > 0) {
      const isMissionActive = !!(gameCtx.gameplay?.mission && gameCtx.gameplay.mission.active);
      const routeColor = isMissionActive ? '#f0c35a' : '#b35cff';

      c.lineCap = 'round';
      c.lineJoin = 'round';

      c.strokeStyle = 'rgba(10, 8, 16, 0.9)';
      c.lineWidth = 6.2 / scale;
      c.beginPath();
      c.moveTo(px, pz);
      let prevX = px;
      let prevZ = pz;
      for (let i = 0; i < gps.length; i++) {
        const pt = gps[i];
        if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.z)) continue;
        c.lineTo(pt.x, pt.z);
        gpsDistMeters += Math.hypot(pt.x - prevX, pt.z - prevZ);
        prevX = pt.x;
        prevZ = pt.z;
      }
      c.stroke();

      c.strokeStyle = routeColor;
      c.lineWidth = 3.6 / scale;
      c.stroke();

      const endPt = gps[gps.length - 1];
      if (endPt && Number.isFinite(endPt.x)) {
        c.fillStyle = routeColor;
        c.beginPath();
        c.arc(endPt.x, endPt.z, 5.5 / scale, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#000';
        c.lineWidth = 1.4 / scale;
        c.stroke();
      }
    }

    if (dom.minimapGpsBadge) {
      if (gpsDistMeters > 8) {
        dom.minimapGpsBadge.textContent =
          gpsDistMeters >= 1000
            ? `${(gpsDistMeters / 1000).toFixed(2)} km`
            : `${Math.round(gpsDistMeters)} m`;
        dom.minimapGpsBadge.classList.remove('hidden');
      } else {
        dom.minimapGpsBadge.classList.add('hidden');
      }
    }

    // 6. Landmarks (Tụ Bảo Xa Các, Tĩnh Tâm Biệt Viện, Quan Sơn Đình, Kỳ Án)
    const invS = 1 / scale;
    // Tụ Bảo Xa Các (-58, 80)
    c.fillStyle = '#b35cff';
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1.2 * invS;
    c.beginPath();
    c.arc(-58, 80, 4.8 * invS, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Tĩnh Tâm Biệt Viện (24, -80)
    c.fillStyle = '#38e09c';
    c.beginPath();
    c.rect(24 - 4.2 * invS, -80 - 4.2 * invS, 8.4 * invS, 8.4 * invS);
    c.fill();
    c.stroke();

    // Quan Sơn Đình (36, -246)
    c.fillStyle = '#ff8fa8';
    c.beginPath();
    c.arc(36, -246, 4.0 * invS, 0, Math.PI * 2);
    c.fill();

    // Bar Club VIP — Sòng Tài Xỉu (54.4, 14.0)
    c.fillStyle = '#e84dff';
    c.strokeStyle = '#f0c35a';
    c.lineWidth = 1.5 * invS;
    c.beginPath();
    c.arc(54.4, 14.0, 5.2 * invS, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Võ Quán — Cửa Hàng Đệ Tử (25.6, -14.0)
    c.fillStyle = '#f59e0b';
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1.5 * invS;
    c.beginPath();
    c.arc(25.6, -14.0, 5.2 * invS, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Đại Đấu Trường Huyền Thoại — Boss Stadium (54.4, 80.0)
    c.fillStyle = '#38bdf8';
    c.strokeStyle = '#facc15';
    c.lineWidth = 1.6 * invS;
    c.beginPath();
    c.arc(54.4, 80.0, 5.4 * invS, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Trường Đua Tử Thần — Combat Race Arena (25.6, 80.0)
    c.fillStyle = '#f97316';
    c.strokeStyle = '#38bdf8';
    c.lineWidth = 1.6 * invS;
    c.beginPath();
    c.arc(25.6, 80.0, 5.4 * invS, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Casino Bodyguards & Rebels blips when inside Bar Club
    const cGuards = gameCtx.gameplay?.casinoGuards || [];
    for (let i = 0; i < cGuards.length; i++) {
      const g = cGuards[i];
      if (!g || g.dead) continue;
      c.fillStyle = g.bribed ? '#22c55e' : g.isHostile ? '#ef4444' : '#f59e0b';
      c.beginPath();
      c.arc(g.x, g.z, 4.0 * invS, 0, Math.PI * 2);
      c.fill();
    }

    // Stadium Bosses (Messi & Ronaldo) & Soccer Ball blips when inside Stadium
    const sBosses = gameCtx.gameplay?.stadiumBosses || [];
    for (let i = 0; i < sBosses.length; i++) {
      const b = sBosses[i];
      if (!b || b.dead) continue;
      c.fillStyle = b.bossId === 'messi' ? '#38bdf8' : '#ef4444';
      c.strokeStyle = '#facc15';
      c.lineWidth = 1.6 * invS;
      c.beginPath();
      c.arc(b.x, b.z, 5.2 * invS, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    const sBall = gameCtx.gameplay?.stadiumBall;
    if (p.inInterior === 'stadium' && sBall && sBall.state !== 'hidden') {
      c.fillStyle = '#ffffff';
      c.strokeStyle = '#0f172a';
      c.lineWidth = 1.3 * invS;
      c.beginPath();
      c.arc(sBall.x, sBall.z, 4.0 * invS, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }

    // Allied Disciples (Bodyguards + Gojo Satoru)
    const disciplesList = gameCtx.gameplay?.disciples || [];
    for (let i = 0; i < disciplesList.length; i++) {
      const d = disciplesList[i];
      if (!d || d.dead || !d.mesh?.visible) continue;
      c.fillStyle = d.hasMapNuke ? '#c084fc' : '#38bdf8';
      c.strokeStyle = d.hasMapNuke ? '#f0c35a' : '#ffffff';
      c.lineWidth = 1.5 * invS;
      c.beginPath();
      c.arc(d.x, d.z, (d.hasMapNuke ? 4.8 : 3.9) * invS, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }

    const msn = gameCtx.gameplay?.mission;
    if (!msn || !msn.active) {
      const markers = [
        { x: 30, z: 12 },
        { x: -135, z: 5 },
        { x: 140, z: -5 },
      ];
      c.fillStyle = '#f0c35a';
      c.strokeStyle = '#000000';
      c.lineWidth = 1.4 * invS;
      for (const mk of markers) {
        c.beginPath();
        c.arc(mk.x, mk.z, 5.0 * invS, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }
    } else if (msn.targetPos || (Number.isFinite(msn.targetX) && Number.isFinite(msn.targetZ))) {
      const tx = msn.targetPos ? msn.targetPos.x : msn.targetX;
      const tz = msn.targetPos ? msn.targetPos.z : msn.targetZ;
      c.fillStyle = '#f0c35a';
      c.strokeStyle = '#000';
      c.lineWidth = 1.5 * invS;
      c.beginPath();
      c.arc(tx, tz, 6.0 * invS, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }

    // Hostile enemies / mission targets (red blips)
    const peds = gameCtx.gameplay?.peds || [];
    for (let i = 0; i < peds.length; i++) {
      const ped = peds[i];
      if (!ped || ped.dead || ped.alive === false || (!ped.hostile && !ped.isEnemy && !ped.isMissionTarget)) continue;
      c.fillStyle = '#ff3b30';
      c.beginPath();
      c.arc(ped.x, ped.z, 3.8 * invS, 0, Math.PI * 2);
      c.fill();
    }

    // 7. Lục Phiến Môn Units + Sight Cones
    const wantedStars = gameCtx.gameplay?.wanted?.stars || 0;
    const flashRed = Math.floor(performance.now() / 220) % 2 === 0;
    const cops = gameCtx.gameplay?.cops || [];
    for (let i = 0; i < cops.length; i++) {
      const cop = cops[i];
      if (!cop || cop.dead || cop.alive === false) continue;
      if (wantedStars >= 1) {
        const cyaw = Number(cop.yaw) || 0;
        const dirA = Math.atan2(Math.sin(cyaw), Math.cos(cyaw));
        c.fillStyle = flashRed ? 'rgba(255, 55, 70, 0.16)' : 'rgba(60, 145, 255, 0.16)';
        c.beginPath();
        c.moveTo(cop.x, cop.z);
        c.arc(cop.x, cop.z, 44, -dirA + Math.PI * 0.5 - 0.45, -dirA + Math.PI * 0.5 + 0.45);
        c.closePath();
        c.fill();
      }
      c.fillStyle = flashRed ? '#ff2e3b' : '#3ea6ff';
      c.beginPath();
      c.arc(cop.x, cop.z, 4.0 * invS, 0, Math.PI * 2);
      c.fill();
    }

    const vList = gameCtx.vehicles?.list || [];
    for (let i = 0; i < vList.length; i++) {
      const v = vList[i];
      if (!v || v.alive === false || v === p.inCar) continue;
      if (v.type === 'police' || v.type === 'swat_van' || v.isPolice) {
        if (wantedStars >= 1) {
          c.fillStyle = flashRed ? '#3ea6ff' : '#ff2e3b';
          c.beginPath();
          c.arc(v.x, v.z, 4.5 * invS, 0, Math.PI * 2);
          c.fill();
        }
      }
    }

    // 8. Remote Online Hiệp Khách Blips (Jade-Cyan Circles + Upright Name Tags)
    const remoteMap = gameCtx.mp?.remotePlayers;
    if (remoteMap && typeof remoteMap.values === 'function') {
      for (const rp of remoteMap.values()) {
        if (!rp || rp.isDead || rp.inSafehouse) continue;
        c.fillStyle = '#38e09c';
        c.strokeStyle = '#08120e';
        c.lineWidth = 1.6 * invS;
        c.beginPath();
        c.arc(rp.x, rp.z, 5.0 * invS, 0, Math.PI * 2);
        c.fill();
        c.stroke();

        c.save();
        c.translate(rp.x, rp.z);
        c.rotate(-radarRot);
        c.font = `800 ${Math.round(8.5 * invS)}px system-ui, sans-serif`;
        c.textAlign = 'center';
        c.fillStyle = '#d4fff0';
        c.strokeStyle = 'rgba(0,0,0,0.88)';
        c.lineWidth = 2.2 * invS;
        const shortNm = String(rp.name || 'Hiệp Khách').slice(0, 10);
        c.strokeText(shortNm, 0, -7.2 * invS);
        c.fillText(shortNm, 0, -7.2 * invS);
        c.restore();
      }
    }

    c.restore();

    // 9. Crisp Gold-Edged White Player Arrow at Radar Origin
    let arrowAngle = 0;
    const entityMesh = (inCar && p.inCar?.mesh) ? p.inCar.mesh : p.mesh;
    if (entityMesh && entityMesh.matrixWorld && entityMesh.matrixWorld.elements) {
      const me = entityMesh.matrixWorld.elements;
      const wx = me[8];
      const wz = me[10];
      if (wx * wx + wz * wz > 0.0001) {
        const worldHeading = Math.atan2(wx, -wz);
        arrowAngle = worldHeading + radarRot;
      }
    }

    c.save();
    c.translate(cx, cy);
    c.rotate(arrowAngle);
    c.fillStyle = '#fff9eb';
    c.strokeStyle = '#080b10';
    c.lineWidth = 2.0;
    c.beginPath();
    c.moveTo(0, -8.5);
    c.lineTo(6.2, 6.8);
    c.lineTo(0, 3.6);
    c.lineTo(-6.2, 6.8);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();

    // 10. Update "B" (Bắc) North Pin along inner border
    if (dom.minimapNorth && dom.minimapContainer) {
      const boxW = dom.minimapContainer.clientWidth || 210;
      const boxH = (dom.minimapContainer.clientHeight || 142) - 9;
      const nx = Math.sin(radarRot);
      const ny = -Math.cos(radarRot);
      const pad = 11;
      const hw = boxW * 0.5 - pad;
      const hh = boxH * 0.5 - pad;
      const tx = Math.abs(nx) > 0.0001 ? hw / Math.abs(nx) : 9999;
      const ty = Math.abs(ny) > 0.0001 ? hh / Math.abs(ny) : 9999;
      const t = Math.min(tx, ty);
      dom.minimapNorth.style.left = `${(boxW * 0.5 + nx * t).toFixed(1)}px`;
      dom.minimapNorth.style.top = `${(boxH * 0.5 + ny * t).toFixed(1)}px`;
    }
  }

  // --------------------------------------------------------------------------
  // Frame-by-Frame HUD Update
  // --------------------------------------------------------------------------
  function updateHUD(rawDt, gameCtx = ctx) {
    const p = gameCtx?.player;
    if (!p) return;
    if (gameCtx.isMobile) {
      hudUpdateAccum += rawDt;
      if (hudUpdateAccum < 0.032) return;
      rawDt = hudUpdateAccum;
      hudUpdateAccum = 0;
    }

    if (gameCtx.started && !gameCtx.paused) {
      virtualMinutes = (virtualMinutes + rawDt * 2.0) % 1440;
      if (dom.phoneClock) {
        const hh = String(Math.floor(virtualMinutes / 60)).padStart(2, '0');
        const mm = String(Math.floor(virtualMinutes % 60)).padStart(2, '0');
        const clock = `${hh}:${mm}`;
        if (dom.phoneClock.textContent !== clock) dom.phoneClock.textContent = clock;
      }
    }

    const invulnerabilitySeconds = Math.ceil((gameCtx.gameplay?.getInvulnerabilityRemainingMs?.() ?? 0) / 1000);
    const timer = dom.invulnerabilityStatus;
    if (timer) {
      timer.classList.toggle('hidden', invulnerabilitySeconds === 0);
      if (invulnerabilitySeconds > 0) {
        const minutes = Math.floor(invulnerabilitySeconds / 60);
        const seconds = String(invulnerabilitySeconds % 60).padStart(2, '0');
        const label = `Bất tử ${minutes}:${seconds}`;
        if (timer.textContent !== label) timer.textContent = label;
      }
    }

    const noCdSeconds = Math.ceil((gameCtx.gameplay?.getNoCooldownRemainingMs?.() ?? 0) / 1000);
    const ncTimer = dom.noCooldownStatus;
    if (ncTimer) {
      ncTimer.classList.toggle('hidden', noCdSeconds === 0);
      if (noCdSeconds > 0) {
        const minutes = Math.floor(noCdSeconds / 60);
        const seconds = String(noCdSeconds % 60).padStart(2, '0');
        const label = `⚡ Không hồi chiêu ${minutes}:${seconds}`;
        if (ncTimer.textContent !== label) ncTimer.textContent = label;
      }
    }

    if (dom.gojoNukeBtn) {
      const hasGojo = Boolean(gameCtx.gameplay?.hasGojoDisciple?.());
      dom.gojoNukeBtn.classList.toggle('hidden', !hasGojo);
      if (hasGojo) {
        const cdSec = Math.ceil(gameCtx.gameplay?.getGojoNukeCooldown?.() || 0);
        const ready = cdSec <= 0;
        dom.gojoNukeBtn.classList.toggle('cooling', !ready);
        const lbl = ready ? '🟣 HƯ THỨC: TỬ 1KM [G]' : `🟣 HỒI CHIÊU ${cdSec}s`;
        if (dom.gojoNukeBtn.textContent !== lbl) dom.gojoNukeBtn.textContent = lbl;
      }
    }

    if (dom.tulenSkillBtn) {
      const tState = gameCtx.gameplay?.getTulenState?.();
      if (tState) {
        const ready = tState.cooldown <= 0.05;
        dom.tulenSkillBtn.classList.toggle('cooling', !ready);
        dom.tulenSkillBtn.classList.toggle('targeting', !!tState.active);
        const lbl = tState.active
          ? '⚡ BẮN LÔI ĐIỂU NGAY [R]'
          : ready
            ? '⚡ LÔI ĐIỂU 1KM [R]'
            : `⚡ LÔI ĐIỂU ${tState.cooldown.toFixed(1)}s`;
        if (dom.tulenSkillBtn.textContent !== lbl) dom.tulenSkillBtn.textContent = lbl;
        if (dom.tulenTargetBar) {
          dom.tulenTargetBar.classList.toggle('hidden', !tState.active);
          if (tState.active && dom.tulenTargetInfo) {
            const infoTxt = tState.hasTarget
              ? `⚡ ĐÃ KHÓA: ${tState.targetName} (${tState.targetDist}m) • NỔ BÁN KÍNH 1KM`
              : '⚡ ĐANG TÌM MỤC TIÊU LÔI ĐIỂU...';
            if (dom.tulenTargetInfo.textContent !== infoTxt) dom.tulenTargetInfo.textContent = infoTxt;
          }
        }
      }
    }

    if (dom.bossHpHud) {
      const inStad = p.inInterior === 'stadium';
      const bosses = inStad ? gameCtx.gameplay?.getStadiumBossesHUD?.() || [] : [];
      const showBosses = inStad && bosses.length > 0;
      dom.bossHpHud.classList.toggle('hidden', !showBosses);
      if (showBosses) {
        const html = bosses
          .map((b) => {
            const pct = clamp((b.hp / Math.max(1, b.maxHp)) * 100, 0, 100);
            const cls = b.dead ? 'dead' : b.exhausted ? 'exhausted' : b.id === 'messi' ? 'messi' : 'ronaldo';
            const status = b.dead
              ? '✅ ĐÃ KẾT LIỄU'
              : b.exhausted
                ? `⚡ KIỆT SỨC (${Math.ceil(b.exhaustTimer)}s) — BẮN LÔI ĐIỂU [R]!`
                : `${b.hp.toLocaleString('en-US')} / ${b.maxHp.toLocaleString('en-US')} HP`;
            return `
              <div class="boss-hp-row ${cls}">
                <div class="boss-hp-top"><span>⚽ ${escapeHTML(b.name)}</span><span>${status}</span></div>
                <div class="boss-hp-track"><div class="boss-hp-fill" style="width:${pct.toFixed(1)}%"></div></div>
              </div>`;
          })
          .join('');
        if (dom.bossHpHud.dataset.prev !== html) {
          dom.bossHpHud.dataset.prev = html;
          dom.bossHpHud.innerHTML = html;
        }
      }
    }

    if (dom.legendBribeBtn) {
      const hasLeg = Boolean(gameCtx.gameplay?.hasLegendDisciple?.());
      dom.legendBribeBtn.classList.toggle('hidden', !hasLeg);
      if (hasLeg) {
        const cdSec = Math.ceil(gameCtx.gameplay?.getLegendBribeCooldown?.() || 0);
        const ready = cdSec <= 0;
        dom.legendBribeBtn.classList.toggle('cooling', !ready);
        const lbl = ready ? '⚽ MUA PHIẾN QUÂN & XÓA TRUY NÃ [K]' : `⚽ HỒI CHIÊU ${cdSec}s`;
        if (dom.legendBribeBtn.textContent !== lbl) dom.legendBribeBtn.textContent = lbl;
      }
    }

    const hpPct = clamp(((Number(p.hp) || 0) / Math.max(1, Number(p.maxHp) || 100)) * 100, 0, 100);
    const armPct = clamp(((Number(p.armor) || 0) / Math.max(1, Number(p.maxArmor) || 100)) * 100, 0, 100);
    const spPct = clamp(((Number(p.special) || 0) / Math.max(1, Number(p.maxSpecial) || 100)) * 100, 0, 100);

    if (dom.healthFill) {
      dom.healthFill.style.width = `${hpPct.toFixed(1)}%`;
      dom.healthFill.classList.toggle('low-hp', hpPct > 0 && hpPct < 25);
    }
    if (dom.armorFill) {
      dom.armorFill.style.width = `${armPct.toFixed(1)}%`;
    }
    if (dom.specialFill) {
      dom.specialFill.style.width = `${spPct.toFixed(1)}%`;
      dom.specialFill.classList.toggle('special-active', !!p.specialActive);
    }

    const curHp = Number(p.hp) || 0;
    if (curHp < lastHp - 0.5) {
      damageFlashTimer = 0.28;
      audio.playDamage();
    }
    lastHp = curHp;

    if (damageFlashTimer > 0) {
      damageFlashTimer = Math.max(0, damageFlashTimer - rawDt);
    }
    if (dom.damageFlash) {
      dom.damageFlash.classList.toggle('active', damageFlashTimer > 0);
      dom.damageFlash.classList.toggle('bullet-time-ring', damageFlashTimer <= 0 && !!p.specialActive);
    }

    const wanted = gameCtx.gameplay?.wanted;
    const stars = clamp(Math.floor(Number(wanted?.stars) || 0), 0, 5);
    if (dom.wantedStars) {
      dom.wantedStars.classList.toggle('calm', stars === 0);
      dom.wantedStars.classList.toggle('spotted', stars > 0 && !!wanted?.spotted);
      dom.wantedStars.classList.toggle('evading', stars > 0 && !wanted?.spotted && (wanted?.evadeTimer || 0) > 0);
      for (let i = 0; i < dom.starSpans.length; i++) {
        dom.starSpans[i].classList.toggle('active', i < stars);
      }
    }

    const curCash = Math.max(0, Math.round(Number(p.cash) || 0));
    if (curCash !== lastCash) {
      const diff = curCash - lastCash;
      lastCash = curCash;
      showCashDelta(diff);
      if (diff > 0) audio.playCash();
    }
    if (dom.cashDisplay) {
      dom.cashDisplay.innerHTML = `<span class="cash-prefix">$</span>${curCash.toLocaleString('en-US')}`;
    }

    const activeIdx = getActiveSlotIndex();
    const activeSlot = WEAPON_WHEEL_SLOTS[activeIdx];
    if (activeSlot) {
      if (dom.weaponName) dom.weaponName.textContent = activeSlot.fullName;
      if (dom.weaponSvg) dom.weaponSvg.innerHTML = activeSlot.svg;
      if (dom.weaponAmmo) {
        if (activeSlot.melee) {
          dom.weaponAmmo.textContent = '∞';
        } else {
          const res = Math.max(0, Math.floor(Number(p.ammo?.[activeSlot.id]) || 0));
          const clip = p.clip?.[activeSlot.id] ?? p.clipAmmo?.[activeSlot.id];
          if (Number.isFinite(clip)) {
            dom.weaponAmmo.innerHTML = `${Math.max(0, Math.floor(clip))} <span class="reserve">/ ${res}</span>`;
          } else {
            dom.weaponAmmo.textContent = String(res);
          }
        }
      }
    }
    if (input.wheelOpen) {
      refreshWheelVisuals();
    }

    if (recoilFlashTimer > 0) recoilFlashTimer = Math.max(0, recoilFlashTimer - rawDt);
    if (hitmarkerTimer > 0) {
      hitmarkerTimer = Math.max(0, hitmarkerTimer - rawDt);
      if (hitmarkerTimer <= 0 && dom.hitmarker) {
        dom.hitmarker.classList.remove('active', 'crit');
      }
    }
    if (dom.crosshair) {
      const hideCross = !gameCtx.started || gameCtx.paused || input.phoneOpen || input.wheelOpen || input.chatOpen || input.barClubOpen || input.shopOpen || input.raceLobbyOpen || input.mapOpen || Boolean(gameCtx.raceArena?.isActive?.());
      dom.crosshair.style.opacity = hideCross ? '0' : '1';
      dom.crosshair.classList.toggle('aiming', !!input.aim);
      dom.crosshair.classList.toggle('recoil', recoilFlashTimer > 0);
      dom.crosshair.classList.toggle('special-on', !!p.specialActive);
    }
    updateRaceHUD(gameCtx);
    if (input.mapOpen) drawFullMap(gameCtx);

    const zInfo =
      (gameCtx.world && typeof gameCtx.world.getZoneInfo === 'function'
        ? gameCtx.world.getZoneInfo(p.x, p.z)
        : null) || fallbackZoneInfo(p.x, p.z);

    const sName = zInfo.streetName || zInfo.street || 'Đại Lộ Chu Tước';
    const zName = zInfo.zoneName || zInfo.zone || 'Kinh Thành';
    if (dom.streetName && dom.streetName.textContent !== sName) {
      dom.streetName.textContent = sName;
      if (lastStreetKey && lastStreetKey !== sName) {
        zoneFlashTimer = 1.4;
      }
      lastStreetKey = sName;
    }
    if (dom.zoneName && dom.zoneName.textContent !== zName) {
      dom.zoneName.textContent = zName;
    }
    if (zoneFlashTimer > 0) {
      zoneFlashTimer = Math.max(0, zoneFlashTimer - rawDt);
    }
    if (dom.locationHud) {
      dom.locationHud.classList.toggle('zone-flash', zoneFlashTimer > 0);
    }

    const curCar = p.inCar || p.vehicle || null;
    const isRappel = !!p.rappelState?.active;
    if (curCar !== lastVehicleRef || isRappel !== wasRappelling) input.resetTouchControls();
    wasRappelling = isRappel;
    if (curCar && curCar !== lastVehicleRef) {
      const vType = curCar.type || 'obey9f';
      const vLabel = curCar.displayName || VEHICLE_DISPLAY_NAMES[vType] || 'Chiến xa giang hồ';
      if (dom.vehicleCallout) {
        dom.vehicleCallout.textContent = vLabel;
        dom.vehicleCallout.classList.add('visible');
      }
      vehicleCalloutTimer = 4.5;
    } else if (!curCar && lastVehicleRef) {
      vehicleCalloutTimer = 0;
      if (dom.vehicleCallout) dom.vehicleCallout.classList.remove('visible');
    }
    lastVehicleRef = curCar;

    if (vehicleCalloutTimer > 0) {
      vehicleCalloutTimer = Math.max(0, vehicleCalloutTimer - rawDt);
      if (vehicleCalloutTimer <= 0 && dom.vehicleCallout) {
        dom.vehicleCallout.classList.remove('visible');
      }
    }

    if (dom.speedPill) {
      if (curCar) {
        const spdMs = Math.hypot(curCar.vx || 0, curCar.vz || 0) || Math.abs(curCar.speed || 0);
        const kmh = Math.round(spdMs * 3.6);
        if (dom.speedNum) dom.speedNum.textContent = String(kmh);
        if (dom.speedGear) {
          dom.speedGear.textContent = curCar.type === 'heli' ? 'PHI' : audio.currentGearLabel;
        }
        dom.speedPill.classList.remove('hidden');
      } else {
        dom.speedPill.classList.add('hidden');
      }
    }

    const msn = gameCtx.gameplay?.mission;
    if (dom.missionTimerBox) {
      if (msn && msn.active && Number.isFinite(msn.timer) && msn.timer > 0) {
        const sec = Math.max(0, Math.ceil(msn.timer));
        const mm = String(Math.floor(sec / 60)).padStart(2, '0');
        const ss = String(sec % 60).padStart(2, '0');
        if (dom.missionTimerLabel) dom.missionTimerLabel.textContent = msn.title || 'THỜI GIAN';
        if (dom.missionTimerVal) {
          dom.missionTimerVal.textContent = `${mm}:${ss}`;
          dom.missionTimerVal.classList.toggle('urgent', sec <= 20);
        }
        dom.missionTimerBox.classList.remove('hidden');
      } else {
        dom.missionTimerBox.classList.add('hidden');
      }
    }

    if (subtitleTimer > 0) {
      subtitleTimer = Math.max(0, subtitleTimer - rawDt);
      if (subtitleTimer <= 0 && dom.subtitleBar) {
        const objText = msn?.active && msn?.objective ? msn.objective : persistentObjective;
        if (objText) {
          dom.subtitleBar.innerHTML = formatGTASubtitle(objText);
          dom.subtitleBar.classList.remove('hidden');
        } else {
          dom.subtitleBar.classList.add('hidden');
        }
      }
    } else if (msn && msn.active && msn.objective && dom.subtitleBar) {
      const formatted = formatGTASubtitle(msn.objective);
      if (dom.subtitleBar.innerHTML !== formatted) {
        dom.subtitleBar.innerHTML = formatted;
      }
      dom.subtitleBar.classList.remove('hidden');
    }

    if (bannerTimer > 0) {
      bannerTimer = Math.max(0, bannerTimer - rawDt);
      if (bannerTimer <= 0 && dom.gtaBanner) {
        dom.gtaBanner.classList.add('hidden');
      }
    }

    if (explicitPromptTimer > 0) {
      explicitPromptTimer = Math.max(0, explicitPromptTimer - rawDt);
      if (explicitPromptTimer <= 0) explicitPrompt = '';
    }
    let promptStr = explicitPrompt;
    let touchInteractLabel = 'TƯƠNG TÁC';
    if (!promptStr && gameCtx.started && !gameCtx.paused && !curCar && !p.rappelState?.active) {
      const nearCar =
        gameCtx.vehicles && typeof gameCtx.vehicles.findNearestEnterable === 'function'
          ? gameCtx.vehicles.findNearestEnterable(p.x, p.z, 4.2)
          : null;
      if (nearCar) {
        const nm = VEHICLE_DISPLAY_NAMES[nearCar.type] || 'Tọa kỵ';
        promptStr = `[F] Lên ${nm.split('—')[0].trim()}`;
        touchInteractLabel = 'LÊN XE';
      } else if (p.inInterior === 'barclub') {
        if (Math.hypot(p.x - 1100, p.z - 1100.8) < 3.8) {
          promptStr = '[F] Chơi Tài Xỉu VIP tại Bàn Sòng Bạc';
          touchInteractLabel = 'TÀI XỈU';
        } else if (Math.hypot(p.x - 1108.2, p.z - 1095.0) < 4.0) {
          promptStr = '[F] Cướp Tiền Két Sắt (+$1,000) — Coi chừng Vệ sĩ & Phiến quân!';
          touchInteractLabel = 'CƯỚP $1000';
        } else if (Math.hypot(p.x - 1100, p.z - 1112.2) < 3.5) {
          promptStr = '[F] Rời Bar Club VIP ra Đại Lộ Chu Tước';
          touchInteractLabel = 'RA NGOÀI';
        }
      } else if (p.inInterior === 'shop') {
        if (Math.hypot(p.x - 1400, p.z - 1400.8) < 4.2 || Math.hypot(p.x - 1400, p.z - 1395.0) < 6.5) {
          promptStr = '[F] Mở Quầy Tuyển Đệ Tử ($1 / $10 / $100 Gojo)';
          touchInteractLabel = 'MUA ĐỆ TỬ';
        } else if (Math.hypot(p.x - 1400, p.z - 1409.5) < 3.5) {
          promptStr = '[F] Rời Võ Quán ra Đại Lộ Chu Tước';
          touchInteractLabel = 'RA NGOÀI';
        }
      } else if (p.inInterior === 'stadium') {
        const sBall = gameCtx.gameplay?.stadiumBall;
        const hideSpots = gameCtx.gameplay?.STADIUM_HIDE_SPOTS || [];
        const nearSpot = hideSpots.find((hs) => Math.hypot(p.x - hs.x, p.z - hs.z) < 4.0);
        if (sBall && sBall.state === 'loose' && Math.hypot(p.x - sBall.x, p.z - sBall.z) < 3.4) {
          promptStr = '[F] Nhặt / Cầm Bóng Đá để đem giấu!';
          touchInteractLabel = 'CẦM BÓNG';
        } else if (sBall && sBall.state === 'carried' && nearSpot) {
          promptStr = `[F] Giấu Bóng vào ${nearSpot.name}!`;
          touchInteractLabel = 'GIẤU BÓNG';
        } else if (Math.hypot(p.x - 1800, p.z - 1829.2) < 3.5) {
          promptStr = '[F] Rời Đại Đấu Trường ra Đại Lộ Chu Tước';
          touchInteractLabel = 'RA NGOÀI';
        }
      } else if (Math.hypot(p.x - 54.4, p.z - 14.0) < 4.4 && !p.inSafehouse) {
        promptStr = '[F] Bước vào Bar Club VIP (Tài Xỉu & Cướp Két Sắt)';
        touchInteractLabel = 'VÀO CLUB';
      } else if (Math.hypot(p.x - 25.6, p.z + 14.0) < 4.4 && !p.inSafehouse) {
        promptStr = '[F] Bước vào Võ Quán — Cửa Hàng Đệ Tử';
        touchInteractLabel = 'VÀO SHOP';
      } else if (Math.hypot(p.x - 54.4, p.z - 80.0) < 4.6 && !p.inSafehouse) {
        promptStr = '[F] Vào Sân Vận Động — Đấu Boss Huyền Thoại';
        touchInteractLabel = 'VÀO SÂN';
      } else if (Math.hypot(p.x - 25.6, p.z - 80.0) < 4.8 && !p.inSafehouse && !p.inInterior) {
        promptStr = '[F] Vào Trường Đua Tử Thần (Mua Xe • Cá Cược • Đua 7 Người)';
        touchInteractLabel = 'TRƯỜNG ĐUA';
      } else if (Math.hypot(p.x - 24, p.z + 80) < 3.5) {
        promptStr = '[F] Vào Tĩnh Tâm Biệt Viện';
        touchInteractLabel = 'VÀO VIỆN';
      } else if (p.inSafehouse && Math.hypot(p.x - 800, p.z - 805) < 3.5) {
        promptStr = '[F] Rời Biệt Viện ra Đại Lộ Chu Tước';
        touchInteractLabel = 'RA NGOÀI';
      } else {
        touchInteractLabel = 'LÊN XE';
      }
    }
    if (dom.tbtnInteract && dom.tbtnInteract.textContent !== touchInteractLabel) {
      dom.tbtnInteract.textContent = touchInteractLabel;
    }
    if (!gameCtx.started || gameCtx.paused) promptStr = '';
    if (input.isTouchDevice) promptStr = promptStr.replace(/\[F\]\s*/g, '');
    if (dom.interactPrompt && promptStr !== lastInteractPrompt) {
      lastInteractPrompt = promptStr;
      dom.interactPrompt.innerHTML = formatGTASubtitle(promptStr).replace(
        /\[([^\]]+)\]/g,
        '<span class="prompt-key">$1</span>'
      );
      dom.interactPrompt.classList.toggle('hidden', !promptStr);
    }

    if (dom.clusterOnFoot && dom.clusterDriving && dom.clusterRappel) {
      const inRaceDrive = Boolean(gameCtx.raceArena?.isActive?.());
      const drivingMode = Boolean(curCar || inRaceDrive);
      dom.clusterRappel.classList.toggle('hidden', !isRappel);
      dom.clusterDriving.classList.toggle('hidden', isRappel || !drivingMode);
      dom.clusterOnFoot.classList.toggle('hidden', isRappel || drivingMode);
      if (curCar && dom.tbtnDrift) {
        const label = curCar.type === 'heli' ? 'BAY LÊN' : 'DRIFT';
        if (dom.tbtnDrift.textContent !== label) dom.tbtnDrift.textContent = label;
      }
    }

    drawMinimap(rawDt, gameCtx);
  }

  syncTouchVisibility();
  syncPauseLabels();

  const ui = {
    audio,
    input,
    get autoAim() {
      return input.autoAim;
    },
    set autoAim(v) {
      input.autoAim = !!v;
      if (ctx.player) ctx.player.autoAim = input.autoAim;
    },
    showBanner,
    showSubtitle,
    setObjective,
    showNotification,
    notify: showNotification,
    showToast: showNotification,
    addFeedMessage: showNotification,
    showCashDelta,
    addCashPopup: showCashDelta,
    showVehicleCallout,
    showVehicleBanner: showVehicleCallout,
    onEnterVehicle(car) {
      if (car) showVehicleCallout(car.label || car.displayName || VEHICLE_DISPLAY_NAMES[car.type] || 'Chiến xa giang hồ');
    },
    showPrompt,
    setInteractPrompt: showPrompt,
    triggerHitmarker,
    showHitmarker: triggerHitmarker,
    appendChatMessage,
    updateRoomBadge,
    openChatModal,
    closeChatModal,
    openPhone,
    closePhone,
    togglePhone,
    openDiscipleShop,
    closeDiscipleShop,
    openRaceLobby,
    closeRaceLobby,
    openFullMap,
    closeFullMap,
    toggleFullMap,
    openBarClub,
    closeBarClub,
    openWeaponWheel,
    closeWeaponWheel,
    togglePause,
    equipWeaponSlot,
    updateHUD,
    update: updateHUD,
    updateUI: updateHUD,
  };

  ctx.audio = audio;
  ctx.input = input;
  ctx.ui = ui;

  return ui;
}
