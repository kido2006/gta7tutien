import * as THREE from 'three';

// ============================================================================
// Giang Hồ 3D — LOS SANTOS CUSTOMS 3D TUNING, WALK-IN AMMU-NATION + LIVE SHOOTING
// RANGE, PONSONBYS FASHION BOUTIQUE & LEGENDARY MOTORSPORT 6-CAR GARAGE
// Exclusively owns: src/customs_shops.js -> export function createCustomsShops(ctx)
// ============================================================================

export function createCustomsShops(ctx = {}) {
  const STORAGE_KEYS = {
    garage: 'gtav_customs_garage_v1',
    arsenal: 'gtav_ammu_arsenal_v1',
    wardrobe: 'gtav_ponsonbys_wardrobe_v1'
  };

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothDamp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt));

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function dampAngle(cur, target, lambda, dt) {
    return wrapAngle(cur + wrapAngle(target - cur) * (1 - Math.exp(-lambda * dt)));
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

  function formatMoney(val) {
    const n = Math.max(0, Math.round(Number(val) || 0));
    return '$' + n.toLocaleString('en-US');
  }

  function escapeHtml(raw) {
    return String(raw ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function safeLoadJSON(key, fallback) {
    try {
      if (typeof localStorage === 'undefined') return fallback;
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function safeSaveJSON(key, data) {
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (_) {
      return false;
    }
  }

  // Reusable scratch math objects (zero per-frame GC allocation)
  const _vA = new THREE.Vector3();
  const _vB = new THREE.Vector3();
  const _vC = new THREE.Vector3();
  const _vD = new THREE.Vector3();
  const _quatA = new THREE.Quaternion();
  const _quatB = new THREE.Quaternion();
  const _colA = new THREE.Color();
  const _colB = new THREE.Color();
  const _upAxis = new THREE.Vector3(0, 1, 0);

  // ==========================================================================
  // 1. EXACT COORDINATES & LANDMARK DEFINITIONS
  // ==========================================================================
  const SHOP_COORDS = {
    lscBay: { x: -58.0, y: 0.05, z: 80.0, minX: -66.2, maxX: -49.8, minZ: 74.8, maxZ: 85.2 },
    lscExitPos: { x: -44.5, y: 0.05, z: 80.0, yaw: Math.PI * 0.5 },
    dealershipTurntable: { x: -54.5, y: 0.08, z: 95.8 },
    dealershipTriggerWest: { x: -47.2, y: 0.22, z: 95.8 },
    dealershipTriggerEast: { x: 209.5, y: 0.22, z: 66.0 },
    ammuExterior: { x: 209.5, y: 0.22, z: 10.0 },
    ammuExitStreet: { x: 207.8, y: 0.22, z: 10.0, yaw: -Math.PI * 0.5 },
    ammuInteriorOrigin: { x: 1800.0, y: 0.05, z: 1800.0 },
    ammuInteriorSpawn: { x: 1800.0, y: 0.05, z: 1808.5, yaw: Math.PI },
    ammuInteriorExit: { x: 1800.0, y: 0.05, z: 1810.6 },
    ammuCounterTrigger: { x: 1793.8, y: 0.05, z: 1802.5 },
    ammuArmorTrigger: { x: 1807.2, y: 0.05, z: 1803.2 },
    ammuRangeTrigger: { x: 1800.0, y: 0.05, z: 1796.6 },
    clothingExterior: { x: 209.5, y: 0.22, z: 95.0 }
  };

  // ==========================================================================
  // 2. LOS SANTOS CUSTOMS — COMPLETE 3D & PBR MODIFICATION CATALOGS
  // ==========================================================================
  const PAINT_FINISHES = [
    {
      id: 'clearcoat',
      name: 'Sơn Bóng Clearcoat',
      badge: 'GLOSS PBR',
      price: 450,
      desc: 'Lớp sơn bóng đa lớp phủ Clearcoat phản chiếu ánh nắng Đại lộ Bồng Lai.',
      metalness: 0.48,
      roughness: 0.11,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.68,
      iridescence: 0.0,
      sheen: 0.0
    },
    {
      id: 'matte',
      name: 'Sơn Nhám (Matte)',
      badge: 'STEALTH',
      price: 850,
      desc: 'Bề mặt nhám lì hấp thụ ánh sáng phong cách siêu xe chiến thuật đường phố.',
      metalness: 0.16,
      roughness: 0.66,
      clearcoat: 0.04,
      clearcoatRoughness: 0.55,
      envMapIntensity: 0.72,
      iridescence: 0.0,
      sheen: 0.18
    },
    {
      id: 'chrome',
      name: 'Mạ Crôm Phản Chiếu (Mirror Chrome)',
      badge: 'MIRROR',
      price: 3200,
      desc: 'Mạ hợp kim Crôm siêu bóng như gương soi phản chiếu toàn cảnh cao ốc & đèn Neon.',
      metalness: 1.0,
      roughness: 0.022,
      clearcoat: 1.0,
      clearcoatRoughness: 0.012,
      envMapIntensity: 2.75,
      iridescence: 0.08,
      sheen: 0.0
    },
    {
      id: 'gold24k',
      name: 'Vàng 24K (Pure Gold)',
      badge: '24K VIP',
      price: 6500,
      desc: 'Phủ vàng ròng 24 Karat nguyên chất dành riêng cho giới tài phiệt Tiên Thành.',
      metalness: 1.0,
      roughness: 0.068,
      clearcoat: 1.0,
      clearcoatRoughness: 0.025,
      envMapIntensity: 2.55,
      iridescence: 0.12,
      sheen: 0.25,
      fixedTintMix: 0.72,
      goldBaseHex: 0xffcc33
    },
    {
      id: 'pearlescent',
      name: 'Ánh Ngọc Trai Đổi Màu (Pearlescent)',
      badge: 'CHAMELEON',
      price: 2400,
      desc: 'Tinh thể ngọc trai đa sắc đổi màu theo góc nhìn dưới nắng hoàng hôn và đèn phố.',
      metalness: 0.62,
      roughness: 0.13,
      clearcoat: 1.0,
      clearcoatRoughness: 0.035,
      envMapIntensity: 1.95,
      iridescence: 1.0,
      iridescenceIOR: 1.48,
      iridescenceThickness: [190, 540],
      sheen: 0.92
    }
  ];

  // Exactly 24 curated Giang Hồ LSC Paint Swatches with complementary Pearlescent sheen hues
  const PAINT_COLORS_24 = [
    { id: 'obsidian_black', name: 'Đen Huyền Vũ', hex: 0x101318, pearlHex: 0x38bdf8 },
    { id: 'diamond_white', name: 'Trắng Ngọc Băng', hex: 0xf4f7fb, pearlHex: 0xa855f7 },
    { id: 'torino_red', name: 'Đỏ Đua Torino', hex: 0xd91b24, pearlHex: 0xffbe0b },
    { id: 'cabernet_wine', name: 'Đỏ Rượu Vang', hex: 0x6b1024, pearlHex: 0xff4d8d },
    { id: 'pfister_pink', name: 'Hồng Neon Pfister', hex: 0xf72585, pearlHex: 0x00f5d4 },
    { id: 'sunrise_orange', name: 'Cam Hoàng Hôn', hex: 0xff6b1a, pearlHex: 0xffe600 },
    { id: 'race_yellow', name: 'Vàng Đường Đua', hex: 0xf5b700, pearlHex: 0xff5400 },
    { id: 'dew_lime', name: 'Xanh Chuối Axit', hex: 0x80ed12, pearlHex: 0x00f5ff },
    { id: 'emerald_green', name: 'Xanh Lục Bảo', hex: 0x0d8a4e, pearlHex: 0x7bf1a8 },
    { id: 'gasoline_teal', name: 'Xanh Khói Xăng', hex: 0x0a7e8c, pearlHex: 0xc77dff },
    { id: 'ultra_blue', name: 'Xanh Siêu Tốc Ultra', hex: 0x1d63dc, pearlHex: 0x4cc9f0 },
    { id: 'midnight_navy', name: 'Xanh Đêm Đại Dương', hex: 0x10254c, pearlHex: 0x4895ef },
    { id: 'schafter_purple', name: 'Tím Hoàng Gia Schafter', hex: 0x691ebd, pearlHex: 0xff2a85 },
    { id: 'midnight_violet', name: 'Tím Bóng Đêm', hex: 0x2f1152, pearlHex: 0x00bbf9 },
    { id: 'cyber_cyan', name: 'Lam Điện Tử Cyber', hex: 0x00d2ff, pearlHex: 0xf72585 },
    { id: 'hot_magenta', name: 'Đỏ Tím Tia Chớp', hex: 0xd9048e, pearlHex: 0xfee440 },
    { id: 'brushed_silver', name: 'Bạc Phay Xước', hex: 0xc4ccd6, pearlHex: 0x90e0ef },
    { id: 'shadow_titanium', name: 'Xám Titan Vũ Trụ', hex: 0x48505c, pearlHex: 0xfb8500 },
    { id: 'champagne_gold', name: 'Vàng Sâm Panh', hex: 0xd9b878, pearlHex: 0xffffff },
    { id: 'imperial_gold', name: 'Vàng Đế Vương 24K', hex: 0xffc300, pearlHex: 0xfff3b0 },
    { id: 'sunset_copper', name: 'Đồng Đỏ Nung', hex: 0xb85328, pearlHex: 0xffb703 },
    { id: 'espresso_bronze', name: 'Nâu Cà Phê Ánh Đồng', hex: 0x42291c, pearlHex: 0xe09f3e },
    { id: 'desert_sand', name: 'Cát Sa Mạc Chiến Thuật', hex: 0xc2ab85, pearlHex: 0xfefae0 },
    { id: 'arctic_ice', name: 'Xanh Băng Bắc Cực', hex: 0xa8dadc, pearlHex: 0x7209b7 }
  ];

  const UNDERGLOW_KITS = [
    { id: 'none', name: 'Tắt Đèn Gầm', hex: 0x000000, price: 0, rainbow: false, desc: 'Gầm xe nguyên bản từ nhà máy.' },
    { id: 'cyan', name: 'Neon Xanh Băng (Cyan)', hex: 0x00f5ff, price: 1200, rainbow: false, desc: 'Dải LED gầm xanh băng + đèn chiếu mặt đường rực sáng.' },
    { id: 'magenta', name: 'Neon Hồng Tím (Magenta)', hex: 0xff1cf7, price: 1250, rainbow: false, desc: 'Ánh sáng hồng tím Synthwave phản chiếu mặt nhựa đường.' },
    { id: 'purple', name: 'Neon Tím Điện (Electric Purple)', hex: 0x9d4edd, price: 1300, rainbow: false, desc: 'Tím tia sét nổi bật trong các giải đua đêm.' },
    { id: 'lime', name: 'Neon Xanh Lá Độc (Toxic Lime)', hex: 0x39ff14, price: 1250, rainbow: false, desc: 'Xanh huỳnh quang đậm chất độ xe đường phố ngầm.' },
    { id: 'gold', name: 'Neon Vàng Hoàng Gia (Royal Gold)', hex: 0xffc800, price: 1500, rainbow: false, desc: 'Hào quang vàng kim kết hợp hoàn hảo với sơn Vàng 24K.' },
    { id: 'crimson', name: 'Neon Đỏ Huyết (Crimson)', hex: 0xff1e38, price: 1350, rainbow: false, desc: 'Đỏ rực đe dọa mọi đối thủ bám đuôi.' },
    { id: 'rainbow', name: 'Neon Đa Sắc Nhịp Đập (Rainbow Pulse)', hex: 0x00ffcc, price: 2600, rainbow: true, desc: 'Hệ thống LED RGB tự động chuyển dải 7 sắc cầu vồng mượt mà!' }
  ];

  const SPOILER_OPTIONS = [
    { id: 'none', name: 'Nguyên Bản (Không Cánh)', price: 0, gripBonus: 0, desc: 'Giữ thiết kế đuôi xe thanh thoát nguyên bản.' },
    { id: 'ducktail', name: 'Cánh Lướt Gió Ducktail Thể Thao', price: 950, gripBonus: 0.04, desc: 'Cánh vuốt đuôi vịt ôm sát cốp sau tăng lực ép nhẹ nhàng.' },
    { id: 'gt_carbon', name: 'Cánh Gió GT Carbon Chân Thiên Nga', price: 1850, gripBonus: 0.09, desc: 'Cánh sợi Carbon dệt chéo kèm 2 chân trụ nhôm CNC khí động học.' },
    { id: 'high_racing', name: 'Cánh Đua Cao Time-Attack GT3', price: 2900, gripBonus: 0.14, desc: 'Cánh gió tầng cao siêu rộng kèm vây định hướng gió tốc độ trên 200 km/h.' }
  ];

  const SPLITTER_OPTIONS = [
    { id: 'none', name: 'Cản Trước Nguyên Bản', price: 0, desc: 'Cản trước tiêu chuẩn theo xe.' },
    { id: 'carbon_lip', name: 'Lưỡi Cản Trước Carbon & Thanh Giằng', price: 850, desc: 'Ốp môi cản trước sợi Carbon kèm cặp ty giằng inox thể thao.' },
    { id: 'time_attack', name: 'Cản Khí Động Học Canard Đôi & Móc Kéo', price: 1650, desc: 'Tấm chia gió đua cỡ lớn + 4 vây gió Canard 2 bên hông và móc kéo đỏ.' }
  ];

  const SKIRT_OPTIONS = [
    { id: 'none', name: 'Ốp Sườn Nguyên Bản', price: 0, desc: 'Lườn xe tiêu chuẩn.' },
    { id: 'carbon_blades', name: 'Ốp Lườn Sợi Carbon & Vây Cá Mập', price: 980, desc: 'Thanh nẹp sườn Carbon chạy dọc thân xe kèm vây đứng trước bánh sau.' },
    { id: 'widebody_aero', name: 'Bodykit Sườn Rộng Khí Động Học', price: 1800, desc: 'Ốp hông bè rộng dẫn luồng khí làm mát phanh sau.' }
  ];

  const HOOD_OPTIONS = [
    { id: 'none', name: 'Nắp Ca-pô Nguyên Bản', price: 0, desc: 'Nắp máy tiêu chuẩn.' },
    { id: 'hood_scoop', name: 'Hốc Hút Gió Kép Ram-Air Carbon', price: 1100, desc: 'Hốc hút gió nổi giữa nắp ca-pô nạp khí lạnh trực tiếp vào cổ góp.' },
    { id: 'carbon_vented', name: 'Nắp Ca-pô Full Carbon Khe Tản Nhiệt', price: 1750, desc: 'Ốp bề mặt sợi Carbon siêu nhẹ kèm 2 dải mang cá thoát nhiệt động cơ.' },
    { id: 'blower_v8', name: 'Siêu Nạp Lộ Thiên V8 Chrome Blower', price: 3100, desc: 'Cụm cổ hút 3 bướm ga mạ Crôm & dây curoa quay trực tiếp nhô trên nắp máy!' }
  ];

  const ROOF_OPTIONS = [
    { id: 'none', name: 'Mui Xe Nguyên Bản', price: 0, desc: 'Không gắn phụ kiện nóc.' },
    { id: 'roof_scoop', name: 'Hốc Gió Nóc Kiểu Đua F1 GT', price: 920, desc: 'Ống dẫn khí động học sợi Carbon đặt chính giữa nóc cabin.' },
    { id: 'roof_louvers', name: 'Lam Chắn Kính Sau Louvers & Vây Xoáy', price: 1550, desc: '6 thanh lam chắn nắng phong cách siêu xe Ý kèm hàng vây tạo xoáy nóc.' }
  ];

  const RIM_FINISHES = [
    { id: 'stock', name: 'Mâm Hợp Kim Bạc Nguyên Bản', hex: 0xd6dde6, metalness: 0.86, roughness: 0.18, caliperHex: 0xd62828, price: 0 },
    { id: 'matte_black', name: 'Mâm Đen Nhám Stealth + Heo Đỏ', hex: 0x16191f, metalness: 0.35, roughness: 0.55, caliperHex: 0xff1e2d, price: 950 },
    { id: 'gold', name: 'Mâm Đúc Vàng 24K Forged + Heo Đen', hex: 0xf5bd1f, metalness: 0.96, roughness: 0.12, caliperHex: 0x1b1e24, price: 1850 },
    { id: 'chrome', name: 'Mâm Mạ Crôm Phản Gương + Heo Xanh', hex: 0xf8fbff, metalness: 1.0, roughness: 0.03, caliperHex: 0x00bbf9, price: 1650 },
    { id: 'bronze_track', name: 'Mâm Đồng Đua Volk + Lốp Chữ Trắng', hex: 0x9e6b3b, metalness: 0.84, roughness: 0.22, caliperHex: 0xf5b700, price: 1400, tireLettering: true }
  ];

  const WINDOW_TINTS = [
    { id: 'stock', name: 'Kính Trong Nguyên Bản', hex: 0x243447, opacity: 0.56, price: 0 },
    { id: 'light_smoke', name: 'Phim Khói Nhẹ (Light Smoke)', hex: 0x18222e, opacity: 0.72, price: 400 },
    { id: 'dark_vip', name: 'Kính Đen VIP (Dark Tint)', hex: 0x0c1017, opacity: 0.86, price: 750 },
    { id: 'limo_black', name: 'Kính Đen Tuyền Limo (Pure Limo Black)', hex: 0x050608, opacity: 0.96, price: 1200 },
    { id: 'cyber_chameleon', name: 'Phim Phản Quang Tím/Lam Chameleon', hex: 0x1b1038, opacity: 0.82, price: 1450, chameleon: true }
  ];

  const ENGINE_STAGES = [
    { level: 0, name: 'Động Cơ Tiêu Chuẩn (Stock)', speedMul: 1.00, accelMul: 1.00, price: 0, hpGain: 0 },
    { level: 1, name: 'EMS Cấp 1 — Lọc Gió & Map Xăng', speedMul: 1.08, accelMul: 1.12, price: 1800, hpGain: 65 },
    { level: 2, name: 'EMS Cấp 2 — Trục Cam & Cổ Xả Titan', speedMul: 1.16, accelMul: 1.24, price: 3600, hpGain: 135 },
    { level: 3, name: 'EMS Cấp 3 — Piston Rèn & Kim Phun Đua', speedMul: 1.24, accelMul: 1.36, price: 6200, hpGain: 220 },
    { level: 4, name: 'EMS Cấp 4 — Bản Độ Đỉnh Cao V12 Spec', speedMul: 1.32, accelMul: 1.48, price: 9800, hpGain: 340 }
  ];

  const BRAKE_STAGES = [
    { level: 0, name: 'Phanh Đĩa Tiêu Chuẩn', decelBonus: 0, price: 0 },
    { level: 1, name: 'Phanh Đường Phố Hiệu Năng Cao', decelBonus: 8, price: 950 },
    { level: 2, name: 'Phanh Đua Đĩa Khoan Lỗ 6-Piston', decelBonus: 16, price: 2100 },
    { level: 3, name: 'Phanh Gốm Carbon Brembo GT3', decelBonus: 26, price: 3800 }
  ];

  const STANCE_LEVELS = [
    { level: 0, name: 'Chiều Cao Gầm Nguyên Bản', dropY: 0.0, camber: 0.0, stiffMul: 1.0, price: 0 },
    { level: 1, name: 'Lò Xo Thể Thao Hạ Gầm (-3cm)', dropY: -0.032, camber: -0.025, stiffMul: 1.12, price: 850 },
    { level: 2, name: 'Phuộc Coilover Đường Đua (-5.5cm)', dropY: -0.058, camber: -0.052, stiffMul: 1.26, price: 1650 },
    { level: 3, name: 'Hạ Sát Đất Stance Air-Ride (-8.5cm)', dropY: -0.085, camber: -0.088, stiffMul: 1.38, price: 2700 }
  ];

  const ARMOR_STAGES = [
    { level: 0, name: 'Khung Vỏ Nguyên Bản (100% HP)', hpMul: 1.0, dentResist: 1.0, price: 0 },
    { level: 1, name: 'Gia Cường Khung Gầm Cấp 1 (135% HP)', hpMul: 1.35, dentResist: 0.78, price: 1600 },
    { level: 2, name: 'Giáp Composite Cấp 2 (170% HP)', hpMul: 1.70, dentResist: 0.58, price: 3400 },
    { level: 3, name: 'Giáp Thép Quân Sự Cấp 3 (210% HP)', hpMul: 2.10, dentResist: 0.38, price: 6200 },
    { level: 4, name: 'Giáp Chống Đạn Toàn Diện Cấp 4 (250% HP)', hpMul: 2.50, dentResist: 0.18, price: 9500 }
  ];

  // ==========================================================================
  // 3. AMMU-NATION WEAPON STORE, ATTACHMENTS, SKINS & RANGE CATALOGS
  // ==========================================================================
  const AMMU_WEAPONS = [
    {
      id: 'bat',
      name: 'Gậy Bóng Chày Hợp Kim',
      category: 'Cận Chiến',
      basePrice: 150,
      ammoPrice: 0,
      ammoPack: 0,
      isMelee: true,
      supportsAttachments: false,
      stats: { dmg: 42, rate: 40, acc: 70, range: 18 },
      desc: 'Gậy nhôm siêu cứng dùng cho cận chiến đường phố êm ái không tiếng súng.'
    },
    {
      id: 'pistol',
      name: 'Súng Lục Chiến Thuật 9mm',
      category: 'Súng Ngắn',
      basePrice: 450,
      ammoPrice: 80,
      ammoPack: 48,
      isMelee: false,
      supportsAttachments: true,
      stats: { dmg: 46, rate: 62, acc: 76, range: 58 },
      desc: 'Súng ngắn bán tự động chính xác, hỗ trợ bắn Drive-By khi lái xe và gắn giảm thanh.'
    },
    {
      id: 'smg',
      name: 'Tiểu Liên Micro-SMG Tốc Độ Cao',
      category: 'Tiểu Liên',
      basePrice: 1250,
      ammoPrice: 140,
      ammoPack: 90,
      isMelee: false,
      supportsAttachments: true,
      stats: { dmg: 38, rate: 92, acc: 64, range: 50 },
      desc: 'Tốc độ xả đạn cực nhanh, vũ khí số 1 khi vừa phóng siêu xe vừa đấu súng.'
    },
    {
      id: 'carbine',
      name: 'Súng Trường Carbine M4 Đặc Nhiệm',
      category: 'Súng Trường',
      basePrice: 3200,
      ammoPrice: 220,
      ammoPack: 90,
      isMelee: false,
      supportsAttachments: true,
      stats: { dmg: 68, rate: 85, acc: 88, range: 86 },
      desc: 'Vũ khí tiêu chuẩn cho các phi vụ cướp ngân hàng & đột kích sòng bạc tầm trung-xa.'
    },
    {
      id: 'shotgun',
      name: 'Shotgun Tác Chiến 8 Viên Chùm',
      category: 'Shotgun',
      basePrice: 2400,
      ammoPrice: 180,
      ammoPack: 24,
      isMelee: false,
      supportsAttachments: true,
      stats: { dmg: 90, rate: 34, acc: 52, range: 35 },
      desc: 'Uy lực hủy diệt ở cự ly gần, thổi bay cửa xe và đội hình Thiên Binh Cấm Vệ chỉ với 1-2 phát.'
    },
    {
      id: 'grenade',
      name: 'Gói Súng Phóng Lựu Hạng Nặng M79',
      category: 'Hạng Nặng',
      basePrice: 7800,
      ammoPrice: 650,
      ammoPack: 10,
      isMelee: false,
      isUnlockPack: true,
      supportsAttachments: false,
      stats: { dmg: 100, rate: 25, acc: 68, range: 72 },
      desc: 'Mở khóa súng phóng lựu 40mm bắn đạn cầu vồng phát nổ diện rộng phá hủy xe bọc thép!'
    },
    {
      id: 'heavy_sniper',
      name: 'Súng Bắn Tỉa Hạng Nặng .50 BMG Mk II',
      category: 'Bắn Tỉa Đặc Biệt',
      basePrice: 9500,
      ammoPrice: 480,
      ammoPack: 20,
      isMelee: false,
      isUnlockPack: true,
      isCustomSpecial: true,
      supportsAttachments: true,
      stats: { dmg: 99, rate: 22, acc: 99, range: 100 },
      desc: 'Đại bác bắn tỉa xuyên giáp tích hợp ống ngắm quang học Zoom sâu [Phím 8] (185 sát thương)!'
    },
    {
      id: 'sticky_bomb',
      name: 'Gói Bom Dính C4 Kích Nổ Từ Xa',
      category: 'Thuốc Nổ C4',
      basePrice: 4200,
      ammoPrice: 750,
      ammoPack: 5,
      isMelee: false,
      isUnlockPack: true,
      isCustomSpecial: true,
      supportsAttachments: false,
      stats: { dmg: 100, rate: 30, acc: 80, range: 42 },
      desc: 'Nhấn [X] ném C4 bám dính lên xe/tường két sắt, nhấn [Z] kích nổ chuỗi liên hoàn!'
    }
  ];

  const WEAPON_ATTACHMENTS = [
    {
      id: 'suppressor',
      name: 'Ống Giảm Thanh Chiến Thuật',
      price: 1150,
      icon: '🔇',
      desc: 'Gắn nòng giảm thanh 3D: giảm 20% độ giật, triệt tiêu chớp lửa & giảm báo động cảnh sát!'
    },
    {
      id: 'drum_mag',
      name: 'Băng Đạn Trống Mở Rộng (x2 Đạn)',
      price: 1450,
      icon: '🥁',
      desc: 'Gắn hộp tiếp đạn trống kép 3D dưới thân súng, tăng gấp đôi cơ số đạn mỗi băng!'
    },
    {
      id: 'laser_sight',
      name: 'Đèn Laser Chỉ Thị Đường Đạn 3D',
      price: 1650,
      icon: '🔴',
      desc: 'Chiếu tia Laser 3D xuyên không gian thực tế tới đúng tâm mục tiêu khi ngắm bắn!'
    },
    {
      id: 'holo_scope',
      name: 'Ống Ngắm Quang Học Holo/ACOG',
      price: 1350,
      icon: '🔭',
      desc: 'Cụm kính ngắm chiến thuật trên ray Picatinny giúp gom tâm đạn chuẩn xác hơn 25%.'
    }
  ];

  const LASER_COLORS = [
    { id: 'red', name: 'Tia Đỏ Chiến Thuật', hex: 0xff1e38 },
    { id: 'green', name: 'Tia Lục Quân Sự NVG', hex: 0x22ff66 },
    { id: 'cyan', name: 'Tia Lam Điện Tử', hex: 0x00f5ff }
  ];

  const WEAPON_SKINS = [
    { id: 'gunmetal', name: 'Thép Đen Quân Dụng (Stock)', price: 0, hex: 0x282d36, metalness: 0.78, roughness: 0.34, engraved: false },
    { id: 'gold_engraved', name: 'Vàng 24K Khắc Hoa Văn Baroque', price: 2800, hex: 0xffc933, metalness: 0.98, roughness: 0.14, engraved: true },
    { id: 'platinum_royal', name: 'Bạch Kim Chạm Nổi Hoàng Gia', price: 2400, hex: 0xe8eef7, metalness: 0.99, roughness: 0.08, engraved: true },
    { id: 'neon_damascus', name: 'Thép Damascus Tím Ánh Lam', price: 2100, hex: 0x7b2cbf, metalness: 0.88, roughness: 0.18, emissiveHex: 0x00bbf9, engraved: true }
  ];

  const BODY_ARMOR_TIERS = [
    { id: 'light', name: 'Áo Giáp Nhẹ Kevlar (+50 Giáp)', armorVal: 50, maxArmorBoost: 100, price: 250, desc: 'Lớp lót sợi Kevlar mỏng nhẹ dưới áo.' },
    { id: 'heavy', name: 'Áo Giáp Chống Đạn Hạng Nặng (100% Giáp)', armorVal: 100, maxArmorBoost: 100, price: 500, desc: 'Phục hồi đầy thanh giáp xanh bảo vệ trước hỏa lực Thiên Đình Chấp Pháp.' },
    { id: 'juggernaut', name: 'Giáp Đặc Nhiệm Tấm Gốm Siêu Cấp (150 Max Giáp)', armorVal: 150, maxArmorBoost: 150, price: 1850, desc: 'Nâng giới hạn thanh giáp tối đa lên 150 điểm cho các phi vụ cướp lớn!' }
  ];

  // ==========================================================================
  // 4. PONSONBYS / SUBURBAN FASHION BOUTIQUE & RIG ACCESSORY CATALOGS
  // ==========================================================================
  const BOUTIQUE_OUTFITS = [
    { id: 'casual_polo', basePreset: 'casual_polo', name: 'Áo Polo Đỏ Bồng Lai', price: 0, desc: 'Trang phục dạo biển và đại lộ phóng khoáng.' },
    { id: 'luxury_suit', basePreset: 'luxury_suit', name: 'Vest Đen Thượng Lưu Downtown', price: 1200, desc: 'Âu phục cắt may thủ công lịch lãm.' },
    { id: 'tactical_heist', basePreset: 'tactical_heist', name: 'Giáp Đột Kích Đu Dây Đặc Nhiệm', price: 1800, desc: 'Bộ đồ chiến thuật chuyên dụng cho phi vụ FIB & Ngân Hàng.' },
    {
      id: 'vice_white_boss',
      basePreset: 'luxury_suit',
      name: 'Vest Trắng Ông Trùm Casino',
      price: 2600,
      palette: { top: 0xf2f5fa, innerTop: 0x9d174d, pants: 0xeaeff5, shoeUpper: 0x1a1d24, tieHex: 0xf5b700 },
      desc: 'Vest trắng ngọc trai kết hợp sơ mi đỏ rượu phong cách Bố Già bờ biển.'
    },
    {
      id: 'crimson_velvet_vip',
      basePreset: 'luxury_suit',
      name: 'Vest Nhung Đỏ Hoàng Gia VIP',
      price: 3200,
      palette: { top: 0x6e0d25, innerTop: 0x111318, pants: 0x14171f, shoeUpper: 0x111317, tieHex: 0xffc300 },
      desc: 'Áo khoác nhung đỏ thẫm cà vạt vàng cho bàn Poker triệu đô.'
    },
    {
      id: 'biker_leather_rebel',
      basePreset: 'luxury_suit',
      name: 'Áo Khoác Da Biker Đen Viền Đỏ',
      price: 1950,
      palette: { top: 0x15181e, innerTop: 0xb91c1c, pants: 0x1e293b, shoeUpper: 0x0f1115, noTie: true },
      desc: 'Áo da mô-tô bụi bặm cực ngầu khi bốc đầu siêu mô-tô Bati 801RR.'
    },
    {
      id: 'gold_street_king',
      basePreset: 'casual_polo',
      name: 'Áo Streetwear Đen Vàng Hoàng Kim',
      price: 1650,
      palette: { top: 0xf59e0b, pants: 0x14171f, shoeUpper: 0xfacc15 },
      desc: 'Tông vàng-đen nổi bật giữa phố đêm Tiên Thành.'
    },
    {
      id: 'cyber_neon_runner',
      basePreset: 'tactical_heist',
      name: 'Bộ Giáp Đêm Cyber Neon',
      price: 3400,
      palette: { top: 0x0f172a, pants: 0x090d16, shoeUpper: 0x00f5ff, vestHex: 0x1e1b4b },
      desc: 'Trang phục đặc nhiệm tương lai phối điểm nhấn xanh điện tử.'
    },
    {
      id: 'emerald_high_roller',
      basePreset: 'luxury_suit',
      name: 'Âu Phục Xanh Lục Bảo Phố Wall',
      price: 2800,
      palette: { top: 0x064e3b, innerTop: 0xf8fafc, pants: 0x063729, shoeUpper: 0x3b2314, tieHex: 0xd4af37 },
      desc: 'Phong thái nhà đầu tư chứng khoán Vạn Thương Linh Các thành đạt.'
    },
    {
      id: 'ocean_resort_linen',
      basePreset: 'casual_polo',
      name: 'Sơ Mi Xanh Biển Du Thuyền Marina',
      price: 1100,
      palette: { top: 0x0284c7, pants: 0xf1f5f9, shoeUpper: 0xffffff },
      desc: 'Sơ mi xanh ngọc quần trắng dạo bến siêu du thuyền Bồng Lai.'
    }
  ];

  const BOUTIQUE_CHAINS = [
    { id: 'none', name: 'Không Đeo Dây Chuyền', price: 0 },
    { id: 'cuban_gold', name: 'Dây Chuyền Vàng Cuban 24K Bản Lớn', price: 1850, hex: 0xffc814 },
    { id: 'diamond_dollar', name: 'Dây Bạch Kim Mặt Đô-La Kim Cương ($)', price: 3600, hex: 0xeef6ff, accentHex: 0x38bdf8 },
    { id: 'emerald_medallion', name: 'Dây Vàng Mặt Ngọc Lục Bảo Casino', price: 2900, hex: 0xffc300, accentHex: 0x10b981 },
    { id: 'military_dogtags', name: 'Thẻ Bài Quân Đội Thép Crôm Đôi', price: 650, hex: 0xcbd5e1 }
  ];

  const BOUTIQUE_WATCHES = [
    { id: 'none', name: 'Không Đeo Đồng Hồ', price: 0 },
    { id: 'crowex_gold', name: 'Đồng Hồ Crowex Vàng Nguyên Khối 24K', price: 3200, caseHex: 0xffc814, dialHex: 0x0f172a },
    { id: 'platinum_diver', name: 'Đồng Hồ Lặn Bạch Kim Mặt Xanh Đại Dương', price: 2400, caseHex: 0xe2e8f0, dialHex: 0x0284c7 },
    { id: 'rose_chrono', name: 'Chronograph Vàng Hồng Thượng Lưu', price: 2750, caseHex: 0xe59866, dialHex: 0x1f1218 },
    { id: 'holo_wrist', name: 'Vòng Tay Tác Chiến Hologram Phát Sáng', price: 1950, caseHex: 0x1e293b, dialHex: 0x00f5ff, emissive: true }
  ];

  const BOUTIQUE_HATS = [
    { id: 'none', name: 'Để Đầu Trần (Kiểu Tóc Gốc)', price: 0 },
    { id: 'snapback_ls', name: 'Mũ Snapback Đen Vàng Tiên Thành', price: 420 },
    { id: 'fedora_boss', name: 'Mũ Phớt Fedora Ông Trùm Mafia', price: 1150 },
    { id: 'cowboy_magnate', name: 'Mũ Cao Bồi Trắng Tài Phiệt Dầu Mỏ', price: 1350 },
    { id: 'moto_carbon_helmet', name: 'Mũ Bảo Hiểm Đua Full-Face Carbon Kính Đổi Màu', price: 2200 },
    { id: 'nvg_specops_helmet', name: 'Mũ Chống Đạn Đặc Nhiệm Kính Nhìn Đêm 4 Ống NVG', price: 3800 },
    { id: 'royal_gold_crown', name: 'Vương Miện Vàng Ròng Vua Sòng Bạc', price: 7500 }
  ];

  const BOUTIQUE_SHADES = [
    { id: 'none', name: 'Không Đeo Kính', price: 0 },
    { id: 'gold_aviator', name: 'Kính Phi Công Gọng Vàng Aviator', price: 750, frameHex: 0xffc300, lensHex: 0x1f2937 },
    { id: 'dark_wayfarer', name: 'Kính Mát Đen Tuyền VIP', price: 620, frameHex: 0x111318, lensHex: 0x05070a },
    { id: 'crimson_tint', name: 'Kính Gọng Bạc Tròng Đỏ Ruby', price: 890, frameHex: 0xe2e8f0, lensHex: 0xbe123c },
    { id: 'cyber_led_visor', name: 'Kính Visor Đèn Neon Phát Sáng Synthwave', price: 1850, frameHex: 0x0f172a, lensHex: 0x00f5ff, emissive: true }
  ];

  const BOUTIQUE_MASKS = [
    { id: 'none', name: 'Không Đeo Mặt Nạ', price: 0 },
    { id: 'gas_mask', name: 'Mặt Nạ Phòng Độc Đặc Nhiệm 2 Lõi Lọc', price: 1100 },
    { id: 'neon_skull', name: 'Mặt Nạ Đầu Lâu Đèn Neon Đổi Màu (Purge)', price: 2450 },
    { id: 'oni_samurai', name: 'Mặt Nạ Quỷ Oni Samurai Sừng Vàng', price: 2950 },
    { id: 'diamond_fox', name: 'Mặt Nạ Cáo Đa Diện Mạ Vàng Phi Vụ VIP', price: 3400 },
    { id: 'ballistic_kevlar', name: 'Mặt Nạ Thép Chống Đạn Đen Nhám', price: 1900 }
  ];

  const BOUTIQUE_GEAR = [
    { id: 'none', name: 'Không Đeo Túi / Giáp Ngoài', price: 0 },
    { id: 'heist_duffel', name: 'Túi Trống Đựng Vàng & Tiền Mặt Phi Vụ', price: 1250 },
    { id: 'heavy_plate_vest', name: 'Áo Giáp Chiến Thuật Tấm Thép Nặng', price: 1800 },
    { id: 'vip_gold_briefcase', name: 'Vali Vàng Ròng Khóa Số Triệu Đô', price: 2600 }
  ];

  // ==========================================================================
  // 5. LUXURY MOTORSPORT DEALERSHIP & 6-CAR PERSONAL GARAGE CATALOG
  // ==========================================================================
  const DEALERSHIP_CATALOG = [
    {
      id: 'obey9f',
      spawnType: 'obey9f',
      name: 'Obey 9F Cabrio V10',
      brand: 'OBEY MOTORSPORT',
      category: 'Siêu Xe Mui Trần',
      price: 18500,
      topSpeedKmh: 315,
      zeroTo100: '2.9s',
      hp: 580,
      defaultColor: 0xf4f7fb,
      presetMods: {
        paintFinish: 'pearlescent',
        paintColor: 0xf4f7fb,
        pearlColor: 0x38bdf8,
        underglow: 'none',
        spoiler: 'gt_carbon',
        rimFinish: 'matte_black',
        engineStage: 1
      },
      desc: 'Siêu xe động cơ V10 đặt giữa mui trần quyến rũ, bám cua cực gắt trên Đại lộ Bồng Lai.'
    },
    {
      id: 'banshee',
      spawnType: 'banshee',
      name: 'Bravado Banshee GT Twin-Turbo',
      brand: 'BRAVADO PERFORMANCE',
      category: 'Coupe Đua Đường Phố',
      price: 22500,
      topSpeedKmh: 328,
      zeroTo100: '2.7s',
      hp: 640,
      defaultColor: 0xd91b24,
      presetMods: {
        paintFinish: 'clearcoat',
        paintColor: 0xd91b24,
        pearlColor: 0xffbe0b,
        underglow: 'none',
        spoiler: 'high_racing',
        splitter: 'time_attack',
        twinTurbo: true,
        engineStage: 2
      },
      desc: 'Biểu tượng cơ bắp Mỹ kết hợp khí động học đường đua, trượt Drift khói lốp đỉnh cao.'
    },
    {
      id: 'zentorno',
      spawnType: 'zentorno',
      fallbackType: 'obey9f',
      name: 'Thanh Long Siêu Chiến Xa Hypercar',
      brand: 'PEGASSI ITALIA',
      category: 'Siêu Phẩm Hypercar Cửa Cắt Kéo',
      price: 65000,
      topSpeedKmh: 368,
      zeroTo100: '2.2s',
      hp: 880,
      defaultColor: 0x101318,
      presetMods: {
        paintFinish: 'pearlescent',
        paintColor: 0x101318,
        pearlColor: 0x48505c,
        underglow: 'none',
        spoiler: 'high_racing',
        splitter: 'time_attack',
        skirts: 'carbon_blades',
        roof: 'roof_louvers',
        rimFinish: 'gold',
        twinTurbo: true,
        engineStage: 3,
        zentornoTrim: true
      },
      desc: 'Ông hoàng tốc độ hình nêm tàng hình với nắp máy lục giác, cửa cắt kéo mở đứng & khè lửa xanh!'
    },
    {
      id: 'armored_kuruma',
      spawnType: 'sedan_lux',
      name: 'Karin Kuruma (Bọc Thép Chống Đạn)',
      brand: 'KARIN TACTICAL',
      category: 'Sedan Đột Kích Bọc Thép',
      price: 38000,
      topSpeedKmh: 295,
      zeroTo100: '3.2s',
      hp: 520,
      defaultColor: 0x16191f,
      presetMods: {
        paintFinish: 'matte',
        paintColor: 0x16191f,
        pearlColor: 0x48505c,
        underglow: 'none',
        spoiler: 'gt_carbon',
        hood: 'hood_scoop',
        rimFinish: 'matte_black',
        windowTint: 'limo_black',
        bulletproofTires: true,
        armorStage: 4,
        engineStage: 2,
        isArmoredKuruma: true
      },
      desc: 'Trang bị tấm chắn thép chống đạn quanh toàn bộ kính xe, lốp Kevlar & độ bền gấp 2.5 lần!'
    },
    {
      id: 'superbike',
      spawnType: 'superbike',
      fallbackType: 'banshee',
      name: 'Xích Thố Thần Câu Superbike',
      brand: 'PEGASSI CORSE',
      category: 'Siêu Mô-Tô Đua GP',
      price: 15500,
      topSpeedKmh: 342,
      zeroTo100: '2.4s',
      hp: 240,
      defaultColor: 0xd91b24,
      presetMods: {
        paintFinish: 'clearcoat',
        paintColor: 0xd91b24,
        pearlColor: 0xffffff,
        underglow: 'none',
        twinTurbo: true,
        bulletproofTires: true,
        engineStage: 2
      },
      desc: 'Siêu mô-tô 1000cc ôm cua nghiêng sát mặt đường và bốc đầu [Left Ctrl] lách mọi kẹt xe!'
    },
    {
      id: 'heli',
      spawnType: 'heli',
      name: 'Buckingham Maverick VIP Gold',
      brand: 'BUCKINGHAM AVIATION',
      category: 'Trực Thăng Cá Nhân Hạng Sang',
      price: 85000,
      topSpeedKmh: 310,
      zeroTo100: 'Cất cánh thẳng đứng',
      hp: 1200,
      defaultColor: 0x101318,
      presetMods: {
        paintFinish: 'gold24k',
        paintColor: 0xffc300,
        windowTint: 'limo_black',
        armorStage: 3,
        engineStage: 2
      },
      desc: 'Trực thăng VIP phủ Vàng 24K đưa bạn bay thẳng lên nóc Tháp FIB, Sòng Bạc và Du Thuyền!'
    }
  ];

  function createDefaultModConfig(baseColor = 0xf4f7fb) {
    return {
      paintFinish: 'clearcoat',
      paintColor: typeof baseColor === 'number' ? baseColor : 0xf4f7fb,
      pearlColor: 0x38bdf8,
      underglow: 'none',
      spoiler: 'none',
      splitter: 'none',
      skirts: 'none',
      hood: 'none',
      roof: 'none',
      rimFinish: 'stock',
      windowTint: 'stock',
      engineStage: 0,
      twinTurbo: false,
      brakesStage: 0,
      stanceLevel: 0,
      bulletproofTires: false,
      armorStage: 0,
      isArmoredKuruma: false,
      zentornoTrim: false,
      plate: ''
    };
  }

  // ==========================================================================
  // 6. PERSISTENT STATE (6-CAR GARAGE, ARSENAL PERKS, WARDROBE)
  // ==========================================================================
  const MAX_GARAGE_SLOTS = 6;
  const savedGarage = [];

  const initialGarageLoad = safeLoadJSON(STORAGE_KEYS.garage, null);
  if (Array.isArray(initialGarageLoad) && initialGarageLoad.length > 0) {
    for (let i = 0; i < Math.min(MAX_GARAGE_SLOTS, initialGarageLoad.length); i++) {
      if (initialGarageLoad[i] && typeof initialGarageLoad[i] === 'object') {
        savedGarage.push(initialGarageLoad[i]);
      }
    }
  } else {
    // Starter customized sports coupe in Slot 1 so player can summon or inspect right away
    savedGarage.push({
      slotId: 'garage_starter_9f',
      catalogId: 'obey9f',
      spawnType: 'obey9f',
      customName: 'Obey 9F Cabrio (Xe Cá Nhân)',
      plate: 'LS7 VIP1',
      value: 18500,
      mods: {
        ...createDefaultModConfig(0xf4f7fb),
        paintFinish: 'pearlescent',
        paintColor: 0xf4f7fb,
        pearlColor: 0x38bdf8,
        underglow: 'none',
        spoiler: 'ducktail',
        engineStage: 1,
        plate: 'LS7 VIP1'
      }
    });
  }

  const defaultArsenalState = {
    ownedWeapons: {
      unarmed: true,
      bat: true,
      pistol: true,
      smg: false,
      carbine: false,
      shotgun: false,
      grenade: false,
      heavy_sniper: false,
      sticky_bomb: false
    },
    attachments: {
      pistol: { suppressor: false, drum_mag: false, laser_sight: false, holo_scope: false, laserColor: 'red', skin: 'gunmetal' },
      smg: { suppressor: false, drum_mag: false, laser_sight: false, holo_scope: false, laserColor: 'green', skin: 'gunmetal' },
      carbine: { suppressor: false, drum_mag: false, laser_sight: false, holo_scope: false, laserColor: 'red', skin: 'gunmetal' },
      shotgun: { suppressor: false, drum_mag: false, laser_sight: false, holo_scope: false, laserColor: 'red', skin: 'gunmetal' },
      heavy_sniper: { suppressor: false, drum_mag: false, laser_sight: true, holo_scope: true, laserColor: 'red', skin: 'gunmetal' }
    },
    sniperAmmo: 0,
    stickyBombCount: 0,
    maxArmorCap: 100,
    rangeBestScore: 0,
    rangeMedals: { bronze: false, silver: false, gold: false },
    rangeReloadFirePerk: false
  };

  const loadedArsenal = safeLoadJSON(STORAGE_KEYS.arsenal, null);
  const arsenalState = {
    ...defaultArsenalState,
    ...(loadedArsenal || {}),
    ownedWeapons: { ...defaultArsenalState.ownedWeapons, ...(loadedArsenal?.ownedWeapons || {}) },
    attachments: {
      pistol: { ...defaultArsenalState.attachments.pistol, ...(loadedArsenal?.attachments?.pistol || {}) },
      smg: { ...defaultArsenalState.attachments.smg, ...(loadedArsenal?.attachments?.smg || {}) },
      carbine: { ...defaultArsenalState.attachments.carbine, ...(loadedArsenal?.attachments?.carbine || {}) },
      shotgun: { ...defaultArsenalState.attachments.shotgun, ...(loadedArsenal?.attachments?.shotgun || {}) },
      heavy_sniper: { ...defaultArsenalState.attachments.heavy_sniper, ...(loadedArsenal?.attachments?.heavy_sniper || {}) }
    },
    rangeMedals: { ...defaultArsenalState.rangeMedals, ...(loadedArsenal?.rangeMedals || {}) }
  };

  const defaultWardrobeState = {
    outfitId: 'casual_polo',
    chainId: 'none',
    watchId: 'none',
    hatId: 'none',
    shadesId: 'none',
    maskId: 'none',
    gearId: 'none',
    unlockedItems: {
      outfit_casual_polo: true,
      outfit_luxury_suit: true,
      outfit_tactical_heist: true
    }
  };

  const loadedWardrobe = safeLoadJSON(STORAGE_KEYS.wardrobe, null);
  const wardrobeState = {
    ...defaultWardrobeState,
    ...(loadedWardrobe || {}),
    unlockedItems: { ...defaultWardrobeState.unlockedItems, ...(loadedWardrobe?.unlockedItems || {}) }
  };

  function persistGarage() {
    safeSaveJSON(STORAGE_KEYS.garage, savedGarage);
  }
  function persistArsenal() {
    safeSaveJSON(STORAGE_KEYS.arsenal, arsenalState);
  }
  function persistWardrobe() {
    safeSaveJSON(STORAGE_KEYS.wardrobe, wardrobeState);
  }

  // Runtime state across LSC, Thần Binh Các, Trường Bắn Binh Khí, Boutique & Dealership
  const state = {
    initialized: false,
    modalOpen: false,
    modalMode: null, // 'customs' | 'ammu' | 'clothing' | 'dealership' | null
    inAmmuInterior: false,
    activeCar: null,
    customsCategory: 'paint',
    ammuTab: 'weapons',
    selectedWeaponForMod: 'carbine',
    clothingTab: 'outfits',
    dealershipTab: 'showroom',
    selectedDealershipId: 'zentorno',
    lscBayCooldown: 0,
    doorTeleportCooldown: 0,
    showroomNightPreview: false,
    revEngineTimer: 0,

    // Orbiting 3D Showroom / Mirror Camera state
    camOrbitYaw: 0.65,
    camOrbitPitch: 0.24,
    camOrbitDist: 5.8,
    camTargetYaw: 0.65,
    camTargetPitch: 0.24,
    camTargetDist: 5.8,
    camAutoSpin: true,
    camManualHoldTimer: 0,
    camLookOffsetY: 0.72,
    isDraggingPreview: false,
    lastDragX: 0,
    lastDragY: 0,
    savedCarTransform: null,

    // Special Weapons Runtime (Heavy Sniper Mk II & Sticky Bomb C4)
    sniperEquipped: false,
    plantedStickyBombs: [],
    prevKeyX: false,
    prevKeyZ: false,
    prevKeyG: false,
    prevKey8: false,
    prevEscape: false,

    // Live Indoor Trường Bắn Binh Khí Minigame (`Trường Bắn Tính Điểm` — 45s)
    rangeActive: false,
    rangeTimer: 0,
    rangeDuration: 45.0,
    rangeScore: 0,
    rangeStreak: 0,
    rangeMaxStreak: 0,
    rangeShotsFired: 0,
    rangeShotsHit: 0,
    rangeHeadshots: 0,
    rangeWaveTimer: 0,
    rangeTargets: [],
    rangePopups: [],
    rangeSavedAmmo: null
  };

  // ==========================================================================
  // 7. PROCEDURAL PBR TEXTURES & SOBEL NORMAL MAPS (CARBON, GOLD, UNDERGLOW)
  // ==========================================================================
  const shopTexCache = {
    carbonDiffuse: null,
    carbonNormal: null,
    goldEngraveNormal: null,
    underglowMap: null,
    shopCheckerFloor: null,
    pegboardTex: null,
    silhouetteTargetTex: null,
    civilianDecoyTex: null,
    signs: new Map()
  };

  function createCanvas2D(w, h) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function heightCanvasToNormalTexture(heightCanvas, strength = 2.2, repeatX = 4, repeatY = 4) {
    if (!heightCanvas) return null;
    const w = heightCanvas.width;
    const h = heightCanvas.height;
    const srcCtx = heightCanvas.getContext('2d');
    const src = srcCtx.getImageData(0, 0, w, h).data;

    const outCanvas = createCanvas2D(w, h);
    const outCtx = outCanvas.getContext('2d');
    const outImg = outCtx.createImageData(w, h);
    const dst = outImg.data;

    const sampleH = (x, y) => {
      const wx = ((x % w) + w) % w;
      const wy = ((y % h) + h) % h;
      return src[(wy * w + wx) * 4] / 255;
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const tl = sampleH(x - 1, y - 1);
        const t = sampleH(x, y - 1);
        const tr = sampleH(x + 1, y - 1);
        const l = sampleH(x - 1, y);
        const r = sampleH(x + 1, y);
        const bl = sampleH(x - 1, y + 1);
        const b = sampleH(x, y + 1);
        const br = sampleH(x + 1, y + 1);

        const dX = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
        const dY = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
        const nz = 1.0;
        const invLen = 1 / Math.sqrt(dX * dX + dY * dY + nz * nz);

        const idx = (y * w + x) * 4;
        dst[idx] = Math.round((-dX * invLen * 0.5 + 0.5) * 255);
        dst[idx + 1] = Math.round((-dY * invLen * 0.5 + 0.5) * 255);
        dst[idx + 2] = Math.round((nz * invLen * 0.5 + 0.5) * 255);
        dst[idx + 3] = 255;
      }
    }

    outCtx.putImageData(outImg, 0, 0);
    const tex = new THREE.CanvasTexture(outCanvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    return tex;
  }

  function ensureShopTextures() {
    if (shopTexCache.carbonDiffuse || typeof document === 'undefined') return shopTexCache;

    // 1. 2x2 Twill Carbon Fiber Diffuse + Normal Map
    {
      const c = createCanvas2D(128, 128);
      const g = c.getContext('2d');
      const hc = createCanvas2D(128, 128);
      const hg = hc.getContext('2d');

      g.fillStyle = '#12151a';
      g.fillRect(0, 0, 128, 128);
      hg.fillStyle = '#505050';
      hg.fillRect(0, 0, 128, 128);

      const cell = 8;
      for (let y = 0; y < 128; y += cell) {
        for (let x = 0; x < 128; x += cell) {
          const step = ((x / cell) + (y / cell)) & 3;
          const bright = step < 2;
          const grad = g.createLinearGradient(x, y, x + cell, y + cell);
          if (bright) {
            grad.addColorStop(0, '#1d222b');
            grad.addColorStop(0.5, '#343c4a');
            grad.addColorStop(1, '#171b22');
          } else {
            grad.addColorStop(0, '#0e1014');
            grad.addColorStop(0.5, '#202630');
            grad.addColorStop(1, '#0c0e12');
          }
          g.fillStyle = grad;
          g.fillRect(x, y, cell - 0.5, cell - 0.5);

          hg.fillStyle = bright ? '#d8d8d8' : '#424242';
          hg.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        }
      }

      const diff = new THREE.CanvasTexture(c);
      diff.colorSpace = THREE.SRGBColorSpace;
      diff.wrapS = THREE.RepeatWrapping;
      diff.wrapT = THREE.RepeatWrapping;
      diff.repeat.set(6, 6);
      shopTexCache.carbonDiffuse = diff;
      shopTexCache.carbonNormal = heightCanvasToNormalTexture(hc, 2.4, 6, 6);
    }

    // 2. Baroque Scroll Engraving Normal Map for Gold / Platinum / Damascus Weapons
    {
      const hc = createCanvas2D(256, 256);
      const hg = hc.getContext('2d');
      hg.fillStyle = '#787878';
      hg.fillRect(0, 0, 256, 256);
      hg.strokeStyle = '#f2f2f2';
      hg.lineWidth = 3.2;

      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const cx = col * 64 + 32;
          const cy = row * 64 + 32;
          hg.beginPath();
          for (let t = 0; t < Math.PI * 3.6; t += 0.16) {
            const r = 3 + t * 2.4;
            const px = cx + Math.cos(t + (row + col) * 0.8) * r;
            const py = cy + Math.sin(t + (row + col) * 0.8) * r;
            if (t === 0) hg.moveTo(px, py);
            else hg.lineTo(px, py);
          }
          hg.stroke();

          hg.beginPath();
          hg.arc(cx, cy, 26, 0, Math.PI * 2);
          hg.strokeStyle = '#b8b8b8';
          hg.lineWidth = 1.6;
          hg.stroke();
          hg.strokeStyle = '#f2f2f2';
          hg.lineWidth = 3.0;
        }
      }
      shopTexCache.goldEngraveNormal = heightCanvasToNormalTexture(hc, 3.0, 3, 2);
    }

    // 3. Soft Rectangular + Radial Underglow Ground-Projection Texture
    {
      const c = createCanvas2D(256, 512);
      const g = c.getContext('2d');
      g.clearRect(0, 0, 256, 512);

      // Soft outer neon pool
      const rad = g.createRadialGradient(128, 256, 18, 128, 256, 220);
      rad.addColorStop(0.0, 'rgba(255,255,255,0.95)');
      rad.addColorStop(0.42, 'rgba(255,255,255,0.62)');
      rad.addColorStop(0.75, 'rgba(255,255,255,0.18)');
      rad.addColorStop(1.0, 'rgba(255,255,255,0.0)');
      g.fillStyle = rad;
      g.save();
      g.translate(128, 256);
      g.scale(0.56, 1.05);
      g.beginPath();
      g.arc(0, 0, 220, 0, Math.PI * 2);
      g.fill();
      g.restore();

      // Bright sill edge tubes intensity boost
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.lineWidth = 14;
      g.strokeRect(48, 72, 160, 368);

      const ugTex = new THREE.CanvasTexture(c);
      ugTex.colorSpace = THREE.SRGBColorSpace;
      shopTexCache.underglowMap = ugTex;
    }

    // 4. Tactical Checkered Thần Binh Các Floor Tile Texture
    {
      const c = createCanvas2D(256, 256);
      const g = c.getContext('2d');
      const sq = 64;
      for (let y = 0; y < 256; y += sq) {
        for (let x = 0; x < 256; x += sq) {
          const odd = ((x / sq) + (y / sq)) & 1;
          g.fillStyle = odd ? '#232830' : '#313844';
          g.fillRect(x, y, sq, sq);
          g.strokeStyle = '#171a20';
          g.lineWidth = 2;
          g.strokeRect(x, y, sq, sq);
        }
      }
      const flTex = new THREE.CanvasTexture(c);
      flTex.colorSpace = THREE.SRGBColorSpace;
      flTex.wrapS = THREE.RepeatWrapping;
      flTex.wrapT = THREE.RepeatWrapping;
      flTex.repeat.set(10, 10);
      shopTexCache.shopCheckerFloor = flTex;
    }

    // 5. Perforated Gun-Wall Pegboard Texture
    {
      const c = createCanvas2D(128, 128);
      const g = c.getContext('2d');
      g.fillStyle = '#3b332b';
      g.fillRect(0, 0, 128, 128);
      g.fillStyle = '#181411';
      for (let y = 8; y < 128; y += 16) {
        for (let x = 8; x < 128; x += 16) {
          g.beginPath();
          g.arc(x, y, 2.4, 0, Math.PI * 2);
          g.fill();
        }
      }
      const pbTex = new THREE.CanvasTexture(c);
      pbTex.colorSpace = THREE.SRGBColorSpace;
      pbTex.wrapS = THREE.RepeatWrapping;
      pbTex.wrapT = THREE.RepeatWrapping;
      pbTex.repeat.set(8, 3);
      shopTexCache.pegboardTex = pbTex;
    }

    // 6. Trường Bắn Binh Khí Paper Silhouette Target Texture (Red Bullseye Rings + Head Zone)
    {
      const c = createCanvas2D(256, 384);
      const g = c.getContext('2d');
      g.fillStyle = '#ece6d8';
      g.fillRect(0, 0, 256, 384);
      g.strokeStyle = '#302b24';
      g.lineWidth = 8;
      g.strokeRect(6, 6, 244, 372);

      // Dark tactical torso + head silhouette
      g.fillStyle = '#1c2026';
      g.beginPath();
      g.arc(128, 78, 42, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(42, 355);
      g.lineTo(50, 148);
      g.quadraticCurveTo(54, 122, 92, 118);
      g.lineTo(164, 118);
      g.quadraticCurveTo(202, 122, 206, 148);
      g.lineTo(214, 355);
      g.closePath();
      g.fill();

      // Concentric scoring rings on chest
      const rings = [82, 60, 38, 18];
      for (let i = 0; i < rings.length; i++) {
        g.beginPath();
        g.arc(128, 224, rings[i], 0, Math.PI * 2);
        g.strokeStyle = i >= 2 ? '#ff3b30' : '#f8fafc';
        g.lineWidth = i === 3 ? 0 : 3;
        if (i === 3) {
          g.fillStyle = '#ff2d20';
          g.fill();
        } else {
          g.stroke();
        }
      }
      // Headshot critical diamond
      g.fillStyle = '#ff2d20';
      g.beginPath();
      g.arc(128, 78, 15, 0, Math.PI * 2);
      g.fill();

      g.fillStyle = '#ffffff';
      g.font = 'bold 20px sans-serif';
      g.textAlign = 'center';
      g.fillText('10', 128, 231);
      g.fillText('HS', 128, 85);

      const tgTex = new THREE.CanvasTexture(c);
      tgTex.colorSpace = THREE.SRGBColorSpace;
      shopTexCache.silhouetteTargetTex = tgTex;
    }

    // 7. Civilian No-Shoot Blue Decoy Target Texture
    {
      const c = createCanvas2D(256, 384);
      const g = c.getContext('2d');
      g.fillStyle = '#e0f2fe';
      g.fillRect(0, 0, 256, 384);
      g.strokeStyle = '#0284c7';
      g.lineWidth = 10;
      g.strokeRect(6, 6, 244, 372);
      g.fillStyle = '#0369a1';
      g.beginPath();
      g.arc(128, 82, 40, 0, Math.PI * 2);
      g.fill();
      g.fillRect(58, 126, 140, 220);
      g.fillStyle = '#ffffff';
      g.font = 'bold 34px sans-serif';
      g.textAlign = 'center';
      g.fillText('DÂN THƯỜNG', 128, 225);
      g.font = 'bold 24px sans-serif';
      g.fillText('KHÔNG BẮN!', 128, 265);

      const dcTex = new THREE.CanvasTexture(c);
      dcTex.colorSpace = THREE.SRGBColorSpace;
      shopTexCache.civilianDecoyTex = dcTex;
    }

    return shopTexCache;
  }

  function getSignTexture(key, title, subtitle, bgHex, titleHex, accentHex, width = 512, height = 160) {
    if (shopTexCache.signs.has(key)) return shopTexCache.signs.get(key);
    const c = createCanvas2D(width, height);
    if (!c) return null;
    const g = c.getContext('2d');

    g.fillStyle = bgHex;
    g.fillRect(0, 0, width, height);

    g.strokeStyle = accentHex;
    g.lineWidth = 6;
    g.strokeRect(8, 8, width - 16, height - 16);

    g.strokeStyle = titleHex;
    g.lineWidth = 2;
    g.strokeRect(16, 16, width - 32, height - 32);

    g.fillStyle = titleHex;
    g.font = `900 ${Math.round(height * 0.30)}px "Segoe UI", Impact, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = accentHex;
    g.shadowBlur = 14;
    g.fillText(title, width * 0.5, height * 0.40);

    g.shadowBlur = 4;
    g.fillStyle = accentHex;
    g.font = `700 ${Math.round(height * 0.16)}px "Segoe UI", sans-serif`;
    g.fillText(subtitle, width * 0.5, height * 0.74);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    shopTexCache.signs.set(key, tex);
    return tex;
  }

  // ==========================================================================
  // 8. DEDICATED SHOP & TWIN-TURBO WEB AUDIO SYNTHESIZER
  // ==========================================================================
  function createShopAudioSynth() {
    let fallbackCtx = null;
    let noiseBuffer = null;
    let turboNodes = null;

    function getAudioCtx() {
      const shared = ctx.audio?.ctx || ctx.ui?.audio?.ctx;
      if (shared && shared.state !== 'closed') return shared;
      if (!fallbackCtx && typeof window !== 'undefined') {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          try {
            fallbackCtx = new AC();
          } catch (_) {}
        }
      }
      return fallbackCtx;
    }

    function ensureNoiseBuffer(ac) {
      if (noiseBuffer && noiseBuffer.sampleRate === ac.sampleRate) return noiseBuffer;
      const len = ac.sampleRate * 1.5;
      noiseBuffer = ac.createBuffer(1, len, ac.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      return noiseBuffer;
    }

    function ensureTurboLoop() {
      const ac = getAudioCtx();
      if (!ac || ac.state !== 'running') return null;
      if (turboNodes && turboNodes.ac === ac) return turboNodes;

      try {
        const osc = ac.createOscillator();
        const oscHarm = ac.createOscillator();
        const filter = ac.createBiquadFilter();
        const gain = ac.createGain();

        osc.type = 'sine';
        oscHarm.type = 'triangle';
        osc.frequency.value = 1800;
        oscHarm.frequency.value = 2700;

        filter.type = 'bandpass';
        filter.frequency.value = 2600;
        filter.Q.value = 4.5;

        gain.gain.value = 0.0001;

        const harmGain = ac.createGain();
        harmGain.gain.value = 0.28;

        osc.connect(filter);
        oscHarm.connect(harmGain);
        harmGain.connect(filter);
        filter.connect(gain);
        gain.connect(ac.destination);

        osc.start();
        oscHarm.start();

        turboNodes = { ac, osc, oscHarm, filter, gain };
        return turboNodes;
      } catch (_) {
        return null;
      }
    }

    // Continuous Twin-Turbo turbine spool whine proportional to boost PSI (0..1.5)
    function updateTurboSpool(boostPsi, active) {
      const nodes = ensureTurboLoop();
      if (!nodes) return;
      const now = nodes.ac.currentTime;
      if (!active || boostPsi < 0.08 || ctx.paused) {
        nodes.gain.gain.setTargetAtTime(0.0001, now, 0.06);
        return;
      }
      const norm = clamp(boostPsi / 1.5, 0, 1);
      const baseFreq = 1650 + norm * 3650;
      nodes.osc.frequency.setTargetAtTime(baseFreq, now, 0.04);
      nodes.oscHarm.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.04);
      nodes.filter.frequency.setTargetAtTime(baseFreq * 1.05, now, 0.04);
      nodes.gain.gain.setTargetAtTime(0.008 + norm * 0.045, now, 0.05);
    }

    // Iconic Twin-Turbo Blow-Off Valve "PSSSHHH!" + Wastegate "stu-tu-tu" whistle!
    function playBlowOffWhistle(intensity = 1.0) {
      const ac = getAudioCtx();
      if (!ac || ac.state !== 'running') return;
      try {
        const now = ac.currentTime;
        const pwr = clamp(intensity, 0.3, 1.4);

        // 1. High-pressure compressed air hiss ("pssshhh")
        const src = ac.createBufferSource();
        src.buffer = ensureNoiseBuffer(ac);
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(5200, now);
        bp.frequency.exponentialRampToValueAtTime(1950, now + 0.34);
        bp.Q.value = 2.8;

        // Subtle flutter LFO on blow-off tail
        const flutterOsc = ac.createOscillator();
        const flutterGain = ac.createGain();
        flutterOsc.frequency.value = 26;
        flutterGain.gain.value = 0.025 * pwr;

        const hissGain = ac.createGain();
        hissGain.gain.setValueAtTime(0.001, now);
        hissGain.gain.linearRampToValueAtTime(0.11 * pwr, now + 0.018);
        hissGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.36);

        flutterOsc.connect(flutterGain);
        flutterGain.connect(hissGain.gain);
        src.connect(bp);
        bp.connect(hissGain);
        hissGain.connect(ac.destination);

        src.start(now);
        src.stop(now + 0.38);
        flutterOsc.start(now);
        flutterOsc.stop(now + 0.38);

        // 2. Crisp metallic valve whistle chirp
        const chirp = ac.createOscillator();
        const chirpGain = ac.createGain();
        chirp.type = 'sine';
        chirp.frequency.setValueAtTime(4200, now);
        chirp.frequency.exponentialRampToValueAtTime(2450, now + 0.19);
        chirpGain.gain.setValueAtTime(0.045 * pwr, now);
        chirpGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.21);
        chirp.connect(chirpGain);
        chirpGain.connect(ac.destination);
        chirp.start(now);
        chirp.stop(now + 0.22);
      } catch (_) {}
    }

    // Anti-lag Exhaust Backfire Crackle ("BANG-POP!")
    function playBackfirePop(power = 1.0) {
      const ac = getAudioCtx();
      if (!ac || ac.state !== 'running') return;
      try {
        const now = ac.currentTime;
        const pwr = clamp(power, 0.3, 1.3);

        const src = ac.createBufferSource();
        src.buffer = ensureNoiseBuffer(ac);
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(980, now);
        lp.frequency.exponentialRampToValueAtTime(160, now + 0.11);

        const g = ac.createGain();
        g.gain.setValueAtTime(0.16 * pwr, now);
        g.gain.exponentialRampToValueAtTime(0.0008, now + 0.12);

        src.connect(lp);
        lp.connect(g);
        g.connect(ac.destination);
        src.start(now);
        src.stop(now + 0.13);

        const thump = ac.createOscillator();
        const tg = ac.createGain();
        thump.type = 'triangle';
        thump.frequency.setValueAtTime(145, now);
        thump.frequency.exponentialRampToValueAtTime(42, now + 0.085);
        tg.gain.setValueAtTime(0.14 * pwr, now);
        tg.gain.exponentialRampToValueAtTime(0.0008, now + 0.09);
        thump.connect(tg);
        tg.connect(ac.destination);
        thump.start(now);
        thump.stop(now + 0.095);
      } catch (_) {}
    }

    // Pneumatic LSC Impact Wrench ("brrr-tk-tk-tk")
    function playImpactWrench() {
      const ac = getAudioCtx();
      if (!ac || ac.state !== 'running') return;
      try {
        const now = ac.currentTime;
        for (let i = 0; i < 5; i++) {
          const t0 = now + i * 0.048;
          const osc = ac.createOscillator();
          const g = ac.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220 + i * 28, t0);
          osc.frequency.exponentialRampToValueAtTime(95, t0 + 0.036);
          g.gain.setValueAtTime(0.09, t0);
          g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.04);
          osc.connect(g);
          g.connect(ac.destination);
          osc.start(t0);
          osc.stop(t0 + 0.042);
        }
      } catch (_) {}
    }

    // Compressed-Air Spray Gun Hiss
    function playPaintSpray() {
      if (ctx.audio?.playSpray) {
        ctx.audio.playSpray();
        return;
      }
      const ac = getAudioCtx();
      if (!ac || ac.state !== 'running') return;
      try {
        const now = ac.currentTime;
        const src = ac.createBufferSource();
        src.buffer = ensureNoiseBuffer(ac);
        const hp = ac.createBiquadFilter();
        hp.type = 'bandpass';
        hp.frequency.value = 3800;
        hp.Q.value = 1.2;
        const g = ac.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.095, now + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0008, now + 0.45);
        src.connect(hp);
        hp.connect(g);
        g.connect(ac.destination);
        src.start(now);
        src.stop(now + 0.48);
      } catch (_) {}
    }

    // Thần Binh Các Metallic Slide Rack ("chk-chk!")
    function playGunCock() {
      const ac = getAudioCtx();
      if (!ac || ac.state !== 'running') return;
      try {
        const now = ac.currentTime;
        for (const [offset, freq] of [[0, 1450], [0.085, 1920]]) {
          const t0 = now + offset;
          const osc = ac.createOscillator();
          const g = ac.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, t0);
          osc.frequency.exponentialRampToValueAtTime(420, t0 + 0.045);
          g.gain.setValueAtTime(0.08, t0);
          g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.05);
          osc.connect(g);
          g.connect(ac.destination);
          osc.start(t0);
          osc.stop(t0 + 0.055);
        }
      } catch (_) {}
    }

    // Trường Bắn Binh Khí Steel Target Plate Ping
    function playTargetPing(isHeadshot = false) {
      const ac = getAudioCtx();
      if (!ac || ac.state !== 'running') return;
      try {
        const now = ac.currentTime;
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isHeadshot ? 1760 : 1180, now);
        osc.frequency.exponentialRampToValueAtTime(isHeadshot ? 2340 : 1040, now + 0.16);
        g.gain.setValueAtTime(0.11, now);
        g.gain.exponentialRampToValueAtTime(0.0008, now + 0.22);
        osc.connect(g);
        g.connect(ac.destination);
        osc.start(now);
        osc.stop(now + 0.24);
      } catch (_) {}
    }

    // Medal Earned Fanfare (Bronze / Silver / Gold)
    function playMedalFanfare(tier = 'gold') {
      const ac = getAudioCtx();
      if (!ac || ac.state !== 'running') return;
      try {
        const notes = tier === 'gold'
          ? [523.25, 659.25, 783.99, 1046.5]
          : tier === 'silver'
            ? [440, 554.37, 659.25]
            : [392, 493.88];
        const now = ac.currentTime;
        notes.forEach((freq, idx) => {
          const t0 = now + idx * 0.095;
          const osc = ac.createOscillator();
          const g = ac.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t0);
          g.gain.setValueAtTime(0.12, t0);
          g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.32);
          osc.connect(g);
          g.connect(ac.destination);
          osc.start(t0);
          osc.stop(t0 + 0.34);
        });
      } catch (_) {}
    }

    // Sticky Bomb C4 Armed Beep
    function playStickyBeep(highPitch = false) {
      const ac = getAudioCtx();
      if (!ac || ac.state !== 'running') return;
      try {
        const now = ac.currentTime;
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(highPitch ? 2480 : 1860, now);
        g.gain.setValueAtTime(0.06, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(g);
        g.connect(ac.destination);
        osc.start(now);
        osc.stop(now + 0.065);
      } catch (_) {}
    }

    return {
      updateTurboSpool,
      playBlowOffWhistle,
      playBackfirePop,
      playImpactWrench,
      playPaintSpray,
      playGunCock,
      playTargetPing,
      playMedalFanfare,
      playStickyBeep
    };
  }

  const shopAudio = createShopAudioSynth();

  // ==========================================================================
  // 9. SHARED CACHED 3D GEOMETRIES & SHOP PBR MATERIALS
  // ==========================================================================
  const shopGeos = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
    cylLow: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
    cone: new THREE.ConeGeometry(0.5, 1, 14, 1, true),
    solidCone: new THREE.ConeGeometry(0.5, 1, 12),
    torus: new THREE.TorusGeometry(0.5, 0.08, 10, 24),
    halfTorus: new THREE.TorusGeometry(0.5, 0.06, 8, 18, Math.PI),
    ring: new THREE.RingGeometry(0.38, 0.5, 28),
    plane: new THREE.PlaneGeometry(1, 1),
    sphere: new THREE.SphereGeometry(0.5, 14, 12),
    octa: new THREE.OctahedronGeometry(0.5, 0),
    coronaCyl: new THREE.CylinderGeometry(1.25, 1.25, 2.7, 24, 1, true),
    coronaRing: new THREE.RingGeometry(0.95, 1.38, 28)
  };
  shopGeos.coronaRing.rotateX(-Math.PI * 0.5);
  // Orient flame cone so apex sits at origin and projects backward along -Z
  const exhaustFlameGeo = new THREE.ConeGeometry(0.085, 0.68, 12, 1, true);
  exhaustFlameGeo.translate(0, -0.34, 0);
  exhaustFlameGeo.rotateX(Math.PI * 0.5);

  const shopMats = {
    initialized: false,
    carbon: null,
    matteBlack: null,
    chrome: null,
    gold24k: null,
    platinum: null,
    redAccent: null,
    armorSteel: null,
    ballisticGlass: null,
    warmWood: null,
    brickDark: null,
    concreteWall: null,
    rangeCeiling: null,
    flameInnerBlue: null,
    flameOuterOrange: null
  };

  function ensureShopMaterials() {
    if (shopMats.initialized) return shopMats;
    const tex = ensureShopTextures();

    shopMats.carbon = new THREE.MeshPhysicalMaterial({
      color: 0x20252e,
      map: tex.carbonDiffuse || null,
      normalMap: tex.carbonNormal || null,
      normalScale: new THREE.Vector2(0.55, 0.55),
      metalness: 0.36,
      roughness: 0.22,
      clearcoat: 0.92,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.45
    });

    shopMats.matteBlack = new THREE.MeshStandardMaterial({
      color: 0x14171d,
      metalness: 0.25,
      roughness: 0.72
    });

    shopMats.chrome = new THREE.MeshPhysicalMaterial({
      color: 0xf4f8ff,
      metalness: 1.0,
      roughness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 2.35
    });

    shopMats.gold24k = new THREE.MeshPhysicalMaterial({
      color: 0xffc928,
      normalMap: tex.goldEngraveNormal || null,
      normalScale: new THREE.Vector2(0.35, 0.35),
      metalness: 0.99,
      roughness: 0.10,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      envMapIntensity: 2.25
    });

    shopMats.platinum = new THREE.MeshPhysicalMaterial({
      color: 0xe6edf7,
      normalMap: tex.goldEngraveNormal || null,
      normalScale: new THREE.Vector2(0.32, 0.32),
      metalness: 0.99,
      roughness: 0.07,
      clearcoat: 1.0,
      envMapIntensity: 2.3
    });

    shopMats.redAccent = new THREE.MeshStandardMaterial({
      color: 0xe11d2a,
      metalness: 0.45,
      roughness: 0.28,
      emissive: 0x45050a,
      emissiveIntensity: 0.35
    });

    shopMats.armorSteel = new THREE.MeshStandardMaterial({
      color: 0x222730,
      metalness: 0.72,
      roughness: 0.42
    });

    shopMats.ballisticGlass = new THREE.MeshPhysicalMaterial({
      color: 0xa5f3fc,
      metalness: 0.1,
      roughness: 0.06,
      transparent: true,
      opacity: 0.34,
      clearcoat: 1.0
    });

    shopMats.warmWood = new THREE.MeshStandardMaterial({
      color: 0x5c3a21,
      metalness: 0.08,
      roughness: 0.58
    });

    shopMats.brickDark = new THREE.MeshStandardMaterial({
      color: 0x4a2520,
      metalness: 0.06,
      roughness: 0.84
    });

    shopMats.concreteWall = new THREE.MeshStandardMaterial({
      color: 0x2d333d,
      metalness: 0.12,
      roughness: 0.78
    });

    shopMats.rangeCeiling = new THREE.MeshStandardMaterial({
      color: 0x191d24,
      metalness: 0.22,
      roughness: 0.82
    });

    shopMats.flameInnerBlue = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    shopMats.flameOuterOrange = new THREE.MeshBasicMaterial({
      color: 0xff7b00,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    shopMats.initialized = true;
    return shopMats;
  }

  function disposeGroupChildren(group) {
    if (!group) return;
    while (group.children.length > 0) {
      const child = group.children[group.children.length - 1];
      group.remove(child);
      child.traverse?.((node) => {
        if (node.userData?.ownGeometry && node.geometry) {
          node.geometry.dispose?.();
        }
        if (node.userData?.ownMaterial && node.material) {
          if (Array.isArray(node.material)) {
            node.material.forEach((m) => m?.dispose?.());
          } else {
            node.material.dispose?.();
          }
        }
      });
    }
  }

  // ==========================================================================
  // 10. REAL 3D CAR MODIFICATION MESH BUILDERS & PBR UPGRADER (`applyCarMods`)
  // ==========================================================================
  function ensureCarBaseSnapshot(car) {
    if (!car || car._lscBaseSaved) return;
    car._lscBaseSaved = true;
    car._baseMaxSpeed = Number(car.maxSpeed) || Number(car.def?.maxSpeed) || 34;
    car._baseAccel = Number(car.accel) || Number(car.def?.accel) || 25;
    car._baseMaxHp = Number(car.maxHp) || Number(car.def?.maxHp) || 140;
    car._baseGrip = Number(car.def?.grip) || 1.04;
    car._baseStiffness = Number(car.def?.stiffness) || 1.0;
    car._baseColor = typeof car.baseColor === 'number'
      ? car.baseColor
      : (car.paintMat?.color ? car.paintMat.color.getHex() : 0xf4f7fb);

    if (Array.isArray(car.wheels)) {
      for (let i = 0; i < car.wheels.length; i++) {
        const w = car.wheels[i];
        if (w && typeof w._origBaseY !== 'number') {
          w._origBaseY = typeof w.baseY === 'number' ? w.baseY : (car.def?.wheelRadius || 0.36);
        }
      }
    }

    if (!car.customMods) {
      car.customMods = createDefaultModConfig(car._baseColor);
    }
  }

  function applyPaintFinishToCar(car, mods) {
    if (!car) return;
    const finish = PAINT_FINISHES.find((f) => f.id === mods.paintFinish) || PAINT_FINISHES[0];
    const swatch = PAINT_COLORS_24.find((c) => c.id === mods.paintColor || c.hex === mods.paintColor);
    const rawHex = typeof mods.paintColor === 'number'
      ? mods.paintColor
      : (swatch ? swatch.hex : (car._baseColor || 0xf4f7fb));
    const pearlHex = typeof mods.pearlColor === 'number'
      ? mods.pearlColor
      : (swatch ? swatch.pearlHex : 0x38bdf8);

    _colA.setHex(rawHex);
    if (finish.id === 'chrome') {
      // Mirror Chrome blends 70% pure mirror silver with 30% chosen tint so colored chrome also works!
      _colB.setHex(0xf4f8ff);
      _colA.lerp(_colB, 0.68);
    } else if (finish.id === 'gold24k') {
      _colB.setHex(finish.goldBaseHex || 0xffcc33);
      _colA.lerp(_colB, finish.fixedTintMix || 0.72);
    }

    car.baseColor = _colA.getHex();

    const applyToPhysMat = (mat) => {
      if (!mat || !mat.color) return;
      mat.color.copy(_colA);
      mat.metalness = finish.metalness;
      mat.roughness = finish.roughness;
      if ('clearcoat' in mat) {
        mat.clearcoat = finish.clearcoat;
        mat.clearcoatRoughness = finish.clearcoatRoughness;
      }
      if ('envMapIntensity' in mat) {
        mat.envMapIntensity = finish.envMapIntensity;
      }
      if ('iridescence' in mat) {
        mat.iridescence = finish.iridescence || 0;
        if (finish.iridescence > 0) {
          mat.iridescenceIOR = finish.iridescenceIOR || 1.48;
          mat.iridescenceThicknessRange = finish.iridescenceThickness || [190, 540];
        }
      }
      if ('sheen' in mat) {
        mat.sheen = finish.sheen || 0;
        if (finish.sheen > 0 && mat.sheenColor) {
          mat.sheenColor.setHex(pearlHex);
          mat.sheenRoughness = finish.id === 'pearlescent' ? 0.22 : 0.45;
        }
      }
      mat.needsUpdate = true;
    };

    if (car.paintMat) {
      applyToPhysMat(car.paintMat);
    } else if (car.chassis) {
      // Support extra vehicles whose body material is attached on child meshes
      car.chassis.traverse((m) => {
        if (m.isMesh && m.material && m.material.isMeshPhysicalMaterial && !m.material.transparent) {
          applyToPhysMat(m.material);
        }
      });
    }
  }

  function applyRimAndWindowMods(car, mods) {
    if (!car) return;
    const rimSpec = RIM_FINISHES.find((r) => r.id === mods.rimFinish) || RIM_FINISHES[0];
    const tintSpec = WINDOW_TINTS.find((t) => t.id === mods.windowTint) || WINDOW_TINTS[0];

    // 1. Custom Rim Finish + Painted Brembo Brake Calipers + Optional Tire Sidewall Ring
    if (Array.isArray(car.wheels) && car.wheels.length > 0) {
      if (!car._customRimMat) {
        car._customRimMat = new THREE.MeshPhysicalMaterial({
          color: rimSpec.hex,
          metalness: rimSpec.metalness,
          roughness: rimSpec.roughness,
          clearcoat: 0.85,
          envMapIntensity: 1.8
        });
      }
      car._customRimMat.color.setHex(rimSpec.hex);
      car._customRimMat.metalness = rimSpec.metalness;
      car._customRimMat.roughness = rimSpec.roughness;
      car._customRimMat.needsUpdate = true;

      if (!car._customCaliperMat) {
        car._customCaliperMat = new THREE.MeshStandardMaterial({
          color: rimSpec.caliperHex,
          metalness: 0.55,
          roughness: 0.26
        });
      }
      car._customCaliperMat.color.setHex(rimSpec.caliperHex);

      for (let i = 0; i < car.wheels.length; i++) {
        const w = car.wheels[i];
        if (!w) continue;

        // Paint metallic wheel spokes/barrel inside spinGroup while leaving dark rubber tire untouched!
        if (w.spinGroup) {
          w.spinGroup.traverse((m) => {
            if (!m.isMesh || !m.material) return;
            if (m.userData?.isTireSidewallRing) return;
            const origMetal = m.userData?._origMetalness ?? m.material.metalness ?? 0;
            if (m.userData && m.userData._origMetalness === undefined) {
              m.userData._origMetalness = origMetal;
            }
            if (origMetal >= 0.5) {
              m.material = car._customRimMat;
            }
          });

          // Racing Tire Sidewall White/Gold Lettering Ring
          let ringMesh = w.spinGroup.getObjectByName('lscTireRing');
          if (rimSpec.tireLettering) {
            if (!ringMesh) {
              const rRad = (car.def?.wheelRadius || 0.35) * 0.80;
              const ringGeo = new THREE.RingGeometry(rRad * 0.84, rRad * 0.96, 24);
              ringGeo.rotateY(Math.PI * 0.5);
              const ringMat = new THREE.MeshBasicMaterial({
                color: 0xf8fafc,
                side: THREE.DoubleSide
              });
              ringMesh = new THREE.Mesh(ringGeo, ringMat);
              ringMesh.name = 'lscTireRing';
              ringMesh.userData.isTireSidewallRing = true;
              ringMesh.userData.ownGeometry = true;
              ringMesh.userData.ownMaterial = true;
              const outSign = w.isLeft ? 1 : -1;
              ringMesh.position.x = outSign * ((car.def?.wheelWidth || 0.26) * 0.508);
              w.spinGroup.add(ringMesh);
            }
            ringMesh.visible = true;
          } else if (ringMesh) {
            ringMesh.visible = false;
          }
        }

        // Paint brake caliper attached to steerPivot
        if (w.steerPivot) {
          w.steerPivot.children.forEach((ch) => {
            if (ch.isMesh && ch !== w.spinGroup) {
              ch.material = car._customCaliperMat;
            }
          });
        }
      }
    }

    // 2. Window Tint (Upgrades translucent cabin/windshield glass meshes cleanly per-car!)
    if (car.chassis) {
      if (!car._customGlassMat) {
        car._customGlassMat = new THREE.MeshPhysicalMaterial({
          color: tintSpec.hex,
          metalness: 0.22,
          roughness: 0.05,
          transparent: true,
          opacity: tintSpec.opacity,
          clearcoat: 1.0,
          clearcoatRoughness: 0.02,
          envMapIntensity: 1.9
        });
      }
      car._customGlassMat.color.setHex(tintSpec.hex);
      car._customGlassMat.opacity = tintSpec.opacity;
      car._customGlassMat.iridescence = tintSpec.chameleon ? 1.0 : 0.0;
      if (tintSpec.chameleon) {
        car._customGlassMat.iridescenceIOR = 1.52;
        car._customGlassMat.iridescenceThicknessRange = [220, 560];
      }
      car._customGlassMat.needsUpdate = true;

      car.chassis.traverse((m) => {
        if (!m.isMesh || !m.material) return;
        if (m.parent && (m.parent.name === 'lscAeroGroup' || m.name === 'lscIgnoreTint')) return;
        const isGlass = m.userData?._isCabinGlass ||
          (m.material.transparent && m.material.opacity > 0.3 && m.material.opacity < 0.92 && m.material.roughness < 0.25);
        if (isGlass) {
          m.userData._isCabinGlass = true;
          m.material = car._customGlassMat;
        }
      });
    }
  }

  const LIVERY_OPTIONS = [
    { id: 'none', name: 'Không Dán Tem Đua', price: 0, desc: 'Thân xe sơn trơn nguyên bản.' },
    { id: 'viper_gold_stripes', name: 'Tem Sọc Kép Đua Vàng 24K', price: 1150, desc: 'Cặp sọc thể thao ánh kim kèm viền mảnh chạy dọc hai bên thân & nắp ca-pô.' },
    { id: 'hotrod_flames', name: 'Tem Lửa Địa Ngục Hot-Rod', price: 1450, desc: 'Ngọn lửa chuyển sắc Cam-Vàng rực cháy vuốt ngược từ hốc bánh trước!' },
    { id: 'jdm_drift_77', name: 'Tem Đua Đường Phố Midnight #77', price: 1650, desc: 'Số hiệu đua #77, vệt xé gió chéo đỏ-trắng và logo giải đua đêm.' },
    { id: 'cyber_lightning', name: 'Tem Tia Chớp Điện Tử Cyan/Pink', price: 1850, desc: 'Tia sét Neon xanh băng và hồng tím đậm chất Cyberpunk 2077.' },
    { id: 'royal_filigree', name: 'Hoa Văn Hoàng Gia Luxury Gold', price: 2200, desc: 'Đường chỉ vàng quý tộc chạm trổ dọc hông siêu xe thượng lưu.' }
  ];

  const liveryMatCache = new Map();

  function getProceduralLiveryMaterial(liveryId) {
    if (!liveryId || liveryId === 'none') return null;
    if (liveryMatCache.has(liveryId)) return liveryMatCache.get(liveryId);

    const c = createCanvas2D(512, 192);
    if (!c) return null;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 512, 192);

    if (liveryId === 'viper_gold_stripes') {
      g.fillStyle = '#facc15';
      g.fillRect(16, 62, 480, 26);
      g.fillRect(16, 102, 480, 26);
      g.fillStyle = '#ffffff';
      g.fillRect(16, 54, 480, 4);
      g.fillRect(16, 132, 480, 4);
    } else if (liveryId === 'hotrod_flames') {
      const grad = g.createLinearGradient(20, 96, 480, 96);
      grad.addColorStop(0, '#ffea00');
      grad.addColorStop(0.5, '#ff6b00');
      grad.addColorStop(1, '#ef233c');
      g.fillStyle = grad;
      for (let f = 0; f < 4; f++) {
        const y0 = 32 + f * 38;
        g.beginPath();
        g.moveTo(18, y0);
        g.quadraticCurveTo(190, y0 - 24, 455 - f * 35, y0 + 8);
        g.quadraticCurveTo(220, y0 + 22, 18, y0 + 22);
        g.closePath();
        g.fill();
      }
    } else if (liveryId === 'jdm_drift_77') {
      g.fillStyle = '#ef4444';
      g.beginPath();
      g.moveTo(40, 165);
      g.lineTo(185, 22);
      g.lineTo(255, 22);
      g.lineTo(110, 165);
      g.closePath();
      g.fill();

      g.fillStyle = '#f8fafc';
      g.fillRect(268, 34, 118, 120);
      g.strokeStyle = '#0f172a';
      g.lineWidth = 5;
      g.strokeRect(268, 34, 118, 120);

      g.fillStyle = '#0f172a';
      g.font = '900 66px Impact, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('77', 327, 96);
    } else if (liveryId === 'cyber_lightning') {
      g.strokeStyle = '#00f5ff';
      g.lineWidth = 10;
      g.shadowColor = '#ff1cf7';
      g.shadowBlur = 12;
      g.beginPath();
      g.moveTo(20, 130);
      g.lineTo(155, 55);
      g.lineTo(195, 118);
      g.lineTo(355, 42);
      g.lineTo(385, 98);
      g.lineTo(492, 58);
      g.stroke();
    } else if (liveryId === 'royal_filigree') {
      g.strokeStyle = '#fbbf24';
      g.lineWidth = 5;
      g.strokeRect(24, 44, 464, 104);
      g.lineWidth = 2.5;
      g.strokeRect(34, 54, 444, 84);
      g.fillStyle = '#fde047';
      g.font = 'italic 800 28px Georgia, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('LOS SANTOS CUSTOMS • ROYAL EDITION', 256, 96);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.18,
      metalness: 0.35,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    liveryMatCache.set(liveryId, mat);
    return mat;
  }

  function build3DBodykitMeshes(car, mods) {
    if (!car || !car.chassis || car.isHeli) return;
    const mats = ensureShopMaterials();

    if (!car._lscAeroGroup) {
      car._lscAeroGroup = new THREE.Group();
      car._lscAeroGroup.name = 'lscAeroGroup';
      car.chassis.add(car._lscAeroGroup);
    } else {
      disposeGroupChildren(car._lscAeroGroup);
    }
    car._blowerPulleys = null;

    const aero = car._lscAeroGroup;
    const w = Number(car.width) || Number(car.def?.width) || 2.02;
    const l = Number(car.length) || Number(car.def?.length) || 4.68;
    const h = Number(car.height) || Number(car.def?.height) || 1.32;
    const halfW = w * 0.5;
    const halfL = l * 0.5;
    const deckY = car.type === 'suv' || car.type === 'swat_van' ? h - 0.02 : Math.min(h * 0.80, 0.98);
    const rearZ = -halfL + 0.22;

    // ------------------------------------------------------------------------
    // A. 3D REAR SPOILERS (Ducktail / GT Carbon / High Racing Time-Attack)
    // ------------------------------------------------------------------------
    if (mods.spoiler === 'ducktail') {
      const lip = new THREE.Mesh(shopGeos.box, car.paintMat || mats.carbon);
      lip.scale.set(w * 0.86, 0.085, 0.20);
      lip.position.set(0, deckY + 0.04, -halfL + 0.09);
      lip.rotation.x = 0.38;
      lip.castShadow = true;

      const carbonEdge = new THREE.Mesh(shopGeos.box, mats.carbon);
      carbonEdge.scale.set(w * 0.87, 0.028, 0.07);
      carbonEdge.position.set(0, deckY + 0.09, -halfL + 0.02);
      carbonEdge.rotation.x = 0.38;
      aero.add(lip, carbonEdge);
    } else if (mods.spoiler === 'gt_carbon') {
      const wingY = deckY + 0.24;
      const mainChord = new THREE.Mesh(shopGeos.box, mats.carbon);
      mainChord.scale.set(w * 0.94, 0.036, 0.28);
      mainChord.position.set(0, wingY, rearZ - 0.04);
      mainChord.rotation.x = 0.11;
      mainChord.castShadow = true;

      const upperFlap = new THREE.Mesh(shopGeos.box, mats.carbon);
      upperFlap.scale.set(w * 0.90, 0.022, 0.11);
      upperFlap.position.set(0, wingY + 0.042, rearZ - 0.14);
      upperFlap.rotation.x = 0.26;
      aero.add(mainChord, upperFlap);

      for (const side of [-1, 1]) {
        // Swan-neck CNC aluminum pylons
        const strut = new THREE.Mesh(shopGeos.box, mats.chrome);
        strut.scale.set(0.032, 0.26, 0.18);
        strut.position.set(side * (w * 0.26), deckY + 0.12, rearZ + 0.02);
        strut.rotation.x = -0.18;

        const neckHook = new THREE.Mesh(shopGeos.box, mats.matteBlack);
        neckHook.scale.set(0.038, 0.06, 0.16);
        neckHook.position.set(side * (w * 0.26), wingY + 0.02, rearZ + 0.01);

        // Carbon aero endplates with red accent stripe
        const endplate = new THREE.Mesh(shopGeos.box, mats.carbon);
        endplate.scale.set(0.024, 0.19, 0.38);
        endplate.position.set(side * (w * 0.475), wingY + 0.01, rearZ - 0.05);
        endplate.rotation.x = 0.06;

        const accent = new THREE.Mesh(shopGeos.box, mats.redAccent);
        accent.scale.set(0.028, 0.028, 0.39);
        accent.position.set(side * (w * 0.476), wingY + 0.085, rearZ - 0.05);
        aero.add(strut, neckHook, endplate, accent);
      }
    } else if (mods.spoiler === 'high_racing') {
      const wingY = Math.max(h + 0.18, deckY + 0.44);
      const strutH = wingY - deckY + 0.04;

      const lowerPlane = new THREE.Mesh(shopGeos.box, mats.carbon);
      lowerPlane.scale.set(w * 1.04, 0.035, 0.32);
      lowerPlane.position.set(0, wingY, rearZ - 0.08);
      lowerPlane.rotation.x = 0.14;
      lowerPlane.castShadow = true;

      const gurneyFlap = new THREE.Mesh(shopGeos.box, mats.carbon);
      gurneyFlap.scale.set(w * 1.02, 0.045, 0.13);
      gurneyFlap.position.set(0, wingY + 0.068, rearZ - 0.20);
      gurneyFlap.rotation.x = 0.34;

      // Center LMP1 shark stabilizer fin
      const centerFin = new THREE.Mesh(shopGeos.box, mats.carbon);
      centerFin.scale.set(0.022, strutH * 0.72, 0.52);
      centerFin.position.set(0, deckY + strutH * 0.42, rearZ + 0.12);
      aero.add(lowerPlane, gurneyFlap, centerFin);

      for (const side of [-1, 1]) {
        const tower = new THREE.Mesh(shopGeos.box, mats.carbon);
        tower.scale.set(0.036, strutH, 0.24);
        tower.position.set(side * (w * 0.34), deckY + strutH * 0.48, rearZ - 0.02);
        tower.rotation.x = -0.15;

        const crossBrace = new THREE.Mesh(shopGeos.cylLow, mats.chrome);
        crossBrace.scale.set(0.025, strutH * 0.85, 0.025);
        crossBrace.position.set(side * (w * 0.22), deckY + strutH * 0.45, rearZ - 0.04);
        crossBrace.rotation.z = side * 0.32;

        const bigEndplate = new THREE.Mesh(shopGeos.box, mats.carbon);
        bigEndplate.scale.set(0.026, 0.28, 0.46);
        bigEndplate.position.set(side * (w * 0.525), wingY + 0.02, rearZ - 0.09);

        const goldTrim = new THREE.Mesh(shopGeos.box, mats.gold24k);
        goldTrim.scale.set(0.030, 0.032, 0.47);
        goldTrim.position.set(side * (w * 0.526), wingY - 0.10, rearZ - 0.09);

        aero.add(tower, crossBrace, bigEndplate, goldTrim);
      }
    }

    // ------------------------------------------------------------------------
    // B. 3D FRONT CARBON SPLITTERS, TIE RODS & CANARDS
    // ------------------------------------------------------------------------
    if (mods.splitter === 'carbon_lip' || mods.splitter === 'time_attack') {
      const isTA = mods.splitter === 'time_attack';
      const lipDepth = isTA ? 0.34 : 0.20;
      const lipW = isTA ? w * 1.03 : w * 0.96;

      const chinTray = new THREE.Mesh(shopGeos.box, mats.carbon);
      chinTray.scale.set(lipW, 0.036, lipDepth);
      chinTray.position.set(0, 0.20, halfL + lipDepth * 0.36);
      chinTray.castShadow = true;
      aero.add(chinTray);

      // Dual stainless splitter support struts
      for (const side of [-1, 1]) {
        const rod = new THREE.Mesh(shopGeos.cylLow, mats.chrome);
        rod.scale.set(0.022, 0.22, 0.022);
        rod.position.set(side * (w * 0.24), 0.29, halfL + lipDepth * 0.42);
        rod.rotation.x = -0.32;
        aero.add(rod);

        if (isTA) {
          // Corner end-fences + upper & lower dive-plane canards!
          const fence = new THREE.Mesh(shopGeos.box, mats.carbon);
          fence.scale.set(0.024, 0.15, 0.28);
          fence.position.set(side * (lipW * 0.5), 0.26, halfL + 0.08);
          aero.add(fence);

          for (const [cy, cz, rotZ] of [[0.36, halfL - 0.04, 0.26], [0.46, halfL - 0.10, 0.32]]) {
            const canard = new THREE.Mesh(shopGeos.box, mats.carbon);
            canard.scale.set(0.16, 0.022, 0.26);
            canard.position.set(side * (halfW + 0.03), cy, cz);
            canard.rotation.y = side * 0.38;
            canard.rotation.z = -side * rotZ;
            aero.add(canard);
          }
        }
      }

      if (isTA) {
        // Red anodized track tow ring protruding from front grille
        const towRing = new THREE.Mesh(shopGeos.torus, mats.redAccent);
        towRing.scale.set(0.14, 0.14, 0.14);
        towRing.rotation.x = Math.PI * 0.5;
        towRing.position.set(w * 0.26, 0.30, halfL + 0.19);
        aero.add(towRing);
      }
    }

    // ------------------------------------------------------------------------
    // C. 3D CARBON SIDE SKIRTS & WIDEBODY ROCKER DIFFUSERS
    // ------------------------------------------------------------------------
    if (mods.skirts === 'carbon_blades' || mods.skirts === 'widebody_aero') {
      const isWide = mods.skirts === 'widebody_aero';
      const skirtLen = l * 0.54;
      for (const side of [-1, 1]) {
        const blade = new THREE.Mesh(shopGeos.box, mats.carbon);
        blade.scale.set(isWide ? 0.15 : 0.09, 0.04, skirtLen);
        blade.position.set(side * (halfW + (isWide ? 0.05 : 0.02)), 0.19, 0.02);
        aero.add(blade);

        // Rear wheel-arch vertical sharklet winglet
        const winglet = new THREE.Mesh(shopGeos.box, mats.carbon);
        winglet.scale.set(0.024, 0.22, 0.24);
        winglet.position.set(side * (halfW + (isWide ? 0.11 : 0.06)), 0.29, -skirtLen * 0.46);
        aero.add(winglet);

        if (isWide) {
          // Sculpted body-colored overfender / side pod accent
          const pod = new THREE.Mesh(shopGeos.box, car.paintMat || mats.carbon);
          pod.scale.set(0.08, 0.22, skirtLen * 0.88);
          pod.position.set(side * (halfW + 0.035), 0.34, 0.02);
          const trimLine = new THREE.Mesh(shopGeos.box, mats.redAccent);
          trimLine.scale.set(0.02, 0.018, skirtLen);
          trimLine.position.set(side * (halfW + 0.125), 0.195, 0.02);
          aero.add(pod, trimLine);
        }
      }
    }

    // ------------------------------------------------------------------------
    // D. 3D HOOD SCOOPS, CARBON VENTED HOOD & SPINNING V8 CHROME BLOWER!
    // ------------------------------------------------------------------------
    const hoodY = car.type === 'suv' || car.type === 'swat_van' ? 1.06 : 0.83;
    const hoodZ = car.def?.midEngine ? 1.08 : halfL * 0.48;

    if (mods.hood === 'hood_scoop') {
      const scoopShell = new THREE.Mesh(shopGeos.box, mats.carbon);
      scoopShell.scale.set(0.68, 0.11, 0.86);
      scoopShell.position.set(0, hoodY + 0.05, hoodZ);
      scoopShell.rotation.x = 0.07;

      for (const side of [-1, 1]) {
        const intakeMouth = new THREE.Mesh(shopGeos.box, mats.matteBlack);
        intakeMouth.scale.set(0.26, 0.075, 0.06);
        intakeMouth.position.set(side * 0.16, hoodY + 0.052, hoodZ + 0.42);
        aero.add(intakeMouth);
      }
      aero.add(scoopShell);
    } else if (mods.hood === 'carbon_vented') {
      const carbonSheet = new THREE.Mesh(shopGeos.box, mats.carbon);
      carbonSheet.scale.set(w * 0.78, 0.024, l * 0.28);
      carbonSheet.position.set(0, hoodY + 0.018, hoodZ);
      carbonSheet.rotation.x = 0.075;
      aero.add(carbonSheet);

      for (const side of [-1, 1]) {
        for (let s = 0; s < 4; s++) {
          const louver = new THREE.Mesh(shopGeos.box, mats.matteBlack);
          louver.scale.set(0.28, 0.025, 0.07);
          louver.position.set(side * (w * 0.22), hoodY + 0.034 - s * 0.005, hoodZ + 0.26 - s * 0.15);
          louver.rotation.x = -0.25;
          aero.add(louver);
        }
      }
    } else if (mods.hood === 'blower_v8') {
      // Exposed Muscle-Car Chrome Supercharger Block + Spinning Belt Pulleys + 3 Red Butterfly Valves!
      const manifold = new THREE.Mesh(shopGeos.box, mats.chrome);
      manifold.scale.set(0.52, 0.18, 0.66);
      manifold.position.set(0, hoodY + 0.09, hoodZ);

      const scoopHat = new THREE.Mesh(shopGeos.box, mats.chrome);
      scoopHat.scale.set(0.56, 0.15, 0.58);
      scoopHat.position.set(0, hoodY + 0.25, hoodZ + 0.02);

      const intakeCavity = new THREE.Mesh(shopGeos.box, mats.matteBlack);
      intakeCavity.scale.set(0.50, 0.11, 0.05);
      intakeCavity.position.set(0, hoodY + 0.25, hoodZ + 0.30);
      aero.add(manifold, scoopHat, intakeCavity);

      for (const bx of [-0.15, 0, 0.15]) {
        const butterfly = new THREE.Mesh(shopGeos.cylLow, mats.redAccent);
        butterfly.scale.set(0.09, 0.02, 0.09);
        butterfly.rotation.x = Math.PI * 0.5;
        butterfly.position.set(bx, hoodY + 0.25, hoodZ + 0.315);
        aero.add(butterfly);
      }

      const belt = new THREE.Mesh(shopGeos.box, mats.matteBlack);
      belt.scale.set(0.32, 0.22, 0.045);
      belt.position.set(0, hoodY + 0.12, hoodZ + 0.35);
      aero.add(belt);

      const pulleys = [];
      for (const [px, py, rad] of [[0, hoodY + 0.21, 0.13], [-0.11, hoodY + 0.06, 0.10], [0.11, hoodY + 0.06, 0.10]]) {
        const pGroup = new THREE.Group();
        pGroup.position.set(px, py, hoodZ + 0.365);
        const wheel = new THREE.Mesh(shopGeos.cyl, mats.chrome);
        wheel.scale.set(rad, 0.05, rad);
        wheel.rotation.x = Math.PI * 0.5;
        const spoke = new THREE.Mesh(shopGeos.box, mats.redAccent);
        spoke.scale.set(rad * 0.85, 0.02, 0.055);
        pGroup.add(wheel, spoke);
        aero.add(pGroup);
        pulleys.push(pGroup);
      }
      car._blowerPulleys = pulleys;
    }

    // ------------------------------------------------------------------------
    // E. 3D ROOF SCOOP & REAR WINDOW LOUVERS (Skipped cleanly on open-top cabrios)
    // ------------------------------------------------------------------------
    if (!car.isOpenTop && (mods.roof === 'roof_scoop' || mods.roof === 'roof_louvers')) {
      const roofTopY = h + 0.01;
      if (mods.roof === 'roof_scoop') {
        const snorkel = new THREE.Mesh(shopGeos.box, mats.carbon);
        snorkel.scale.set(0.38, 0.12, 0.68);
        snorkel.position.set(0, roofTopY + 0.05, -0.05);

        const mouth = new THREE.Mesh(shopGeos.box, mats.redAccent);
        mouth.scale.set(0.30, 0.08, 0.05);
        mouth.position.set(0, roofTopY + 0.055, 0.28);
        aero.add(snorkel, mouth);
      } else if (mods.roof === 'roof_louvers') {
        // 5 Roof Vortex Generators
        for (let vx = -0.52; vx <= 0.521; vx += 0.26) {
          const fin = new THREE.Mesh(shopGeos.box, mats.carbon);
          fin.scale.set(0.022, 0.065, 0.14);
          fin.position.set(vx, roofTopY + 0.03, -0.52);
          aero.add(fin);
        }
        // 6-Slat Angled Matte-Carbon Rear Window Louvers
        for (let s = 0; s < 6; s++) {
          const slat = new THREE.Mesh(shopGeos.box, mats.carbon);
          slat.scale.set(w * 0.72, 0.025, 0.14);
          slat.position.set(0, roofTopY - 0.06 - s * 0.052, -0.74 - s * 0.145);
          slat.rotation.x = 0.34;
          aero.add(slat);
        }
      }
    }

    // ------------------------------------------------------------------------
    // F. BESPOKE 3D CONVERSIONS (ARMORED KURUMA PLATES & ZENTORNO HYPERCAR TRIM)
    // ------------------------------------------------------------------------
    if (mods.isArmoredKuruma || mods.armorStage >= 4) {
      // Armored ballistic window visors & side gun-port plates when Kuruma or Max Stage 4 Armor
      if (mods.isArmoredKuruma) {
        const frontVisor = new THREE.Mesh(shopGeos.box, mats.armorSteel);
        frontVisor.scale.set(w * 0.80, 0.26, 0.05);
        frontVisor.position.set(0, h * 0.78, 0.54);
        frontVisor.rotation.x = -0.62;

        const gunSlit = new THREE.Mesh(shopGeos.box, mats.matteBlack);
        gunSlit.scale.set(w * 0.68, 0.065, 0.06);
        gunSlit.position.set(0, h * 0.78, 0.55);
        gunSlit.rotation.x = -0.62;
        aero.add(frontVisor, gunSlit);

        for (const side of [-1, 1]) {
          const sideArmor = new THREE.Mesh(shopGeos.box, mats.armorSteel);
          sideArmor.scale.set(0.045, 0.28, 1.55);
          sideArmor.position.set(side * (halfW * 0.87), h * 0.77, -0.18);
          aero.add(sideArmor);
        }

        // Front tubular steel ram bar
        const bullBar = new THREE.Mesh(shopGeos.cylLow, mats.armorSteel);
        bullBar.scale.set(0.075, w * 0.82, 0.075);
        bullBar.rotation.z = Math.PI * 0.5;
        bullBar.position.set(0, 0.42, halfL + 0.15);
        aero.add(bullBar);
      }
    }

    if (mods.zentornoTrim && car.type === 'obey9f') {
      // Stealth-Fighter Wedge Rear Deck Hexagonal Louvers (clean matte carbon, no default neon strips)
      for (let i = 0; i < 5; i++) {
        const hexSlat = new THREE.Mesh(shopGeos.box, mats.carbon);
        hexSlat.scale.set(1.06 - i * 0.08, 0.032, 0.14);
        hexSlat.position.set(0, 1.02 - i * 0.035, -0.68 - i * 0.22);
        hexSlat.rotation.x = 0.22;
        aero.add(hexSlat);
      }
    }

    // ------------------------------------------------------------------------
    // G. PROCEDURAL 3D RACING LIVERY & VINYL FLANK / HOOD DECALS
    // ------------------------------------------------------------------------
    if (mods.livery && mods.livery !== 'none') {
      const livMat = getProceduralLiveryMaterial(mods.livery);
      if (livMat) {
        for (const side of [-1, 1]) {
          const flankDecal = new THREE.Mesh(shopGeos.plane, livMat);
          flankDecal.scale.set(l * 0.54, 0.36, 1);
          flankDecal.position.set(side * (halfW + 0.016), 0.52, -0.02);
          flankDecal.rotation.y = side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
          aero.add(flankDecal);
        }
        if (mods.hood !== 'blower_v8' && mods.hood !== 'carbon_vented') {
          const hoodDecal = new THREE.Mesh(shopGeos.plane, livMat);
          hoodDecal.scale.set(w * 0.52, l * 0.25, 1);
          hoodDecal.rotation.x = -Math.PI * 0.5 + 0.08;
          hoodDecal.position.set(0, hoodY + 0.022, hoodZ);
          aero.add(hoodDecal);
        }
      }
    }

    // ------------------------------------------------------------------------
    // H. TWIN-BOTTLE NITROUS OXIDE (N2O) TANKS & CRYOGENIC HOOD PURGE PLUMES!
    // ------------------------------------------------------------------------
    car._nosPurgeCones = null;
    if (mods.nosKit) {
      const nosBlueMat = new THREE.MeshPhysicalMaterial({
        color: 0x0284c7,
        metalness: 0.88,
        roughness: 0.14,
        clearcoat: 1.0
      });
      nosBlueMat.userData = { ownMaterial: true };

      for (const side of [-1, 1]) {
        const tank = new THREE.Mesh(shopGeos.cyl, nosBlueMat);
        tank.userData.ownMaterial = true;
        tank.scale.set(0.11, 0.42, 0.11);
        tank.rotation.x = Math.PI * 0.44;
        tank.position.set(side * 0.19, deckY - 0.04, -0.78);

        const valve = new THREE.Mesh(shopGeos.cylLow, mats.gold24k);
        valve.scale.set(0.045, 0.08, 0.045);
        valve.rotation.x = Math.PI * 0.44;
        valve.position.set(side * 0.19, deckY + 0.01, -0.56);
        aero.add(tank, valve);
      }

      const purgeMat = new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      purgeMat.userData = { ownMaterial: true };

      const purgeCones = [];
      for (const side of [-1, 1]) {
        const pCone = new THREE.Mesh(shopGeos.cone, purgeMat);
        pCone.userData.ownMaterial = true;
        pCone.scale.set(0.24, 1.25, 0.24);
        pCone.position.set(side * (w * 0.34), hoodY + 0.34, halfL * 0.22);
        pCone.rotation.z = -side * 0.68;
        pCone.rotation.x = -0.22;
        pCone.visible = false;
        aero.add(pCone);
        purgeCones.push(pCone);
      }
      car._nosPurgeCones = purgeCones;
      if (typeof car._nosCharge !== 'number') car._nosCharge = 100;
    }
  }

  function build3DUnderglowAndTurboFlames(car, mods) {
    if (!car || !car.mesh || car.isHeli) return;
    ensureShopTextures();
    ensureShopMaterials();

    const w = Number(car.width) || 2.0;
    const l = Number(car.length) || 4.65;
    const halfW = w * 0.5;
    const halfL = l * 0.5;

    // ------------------------------------------------------------------------
    // 1. 3D NEON UNDERGLOW KIT (Ground Projection + 4 Chassis LED Tubes + PointLight)
    // ------------------------------------------------------------------------
    const ugSpec = UNDERGLOW_KITS.find((u) => u.id === mods.underglow) || UNDERGLOW_KITS[0];
    if (ugSpec.id === 'none') {
      if (car._lscUnderglow) {
        car._lscUnderglow.group.visible = false;
        if (car._lscUnderglow.light) car._lscUnderglow.light.intensity = 0;
      }
    } else {
      if (!car._lscUnderglow) {
        const ugGroup = new THREE.Group();
        ugGroup.name = 'lscUnderglowGroup';

        const poolMat = new THREE.MeshBasicMaterial({
          color: ugSpec.hex,
          map: shopTexCache.underglowMap || null,
          transparent: true,
          opacity: 0.88,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3
        });

        const poolPlane = new THREE.Mesh(shopGeos.plane, poolMat);
        poolPlane.rotation.x = -Math.PI * 0.5;
        poolPlane.scale.set(w * 1.48, l * 1.24, 1);
        poolPlane.position.set(0, 0.032, 0);
        ugGroup.add(poolPlane);

        const tubeMat = new THREE.MeshBasicMaterial({
          color: ugSpec.hex
        });

        for (const side of [-1, 1]) {
          const sideTube = new THREE.Mesh(shopGeos.box, tubeMat);
          sideTube.scale.set(0.045, 0.028, l * 0.58);
          sideTube.position.set(side * (halfW * 0.86), 0.14, 0);
          ugGroup.add(sideTube);
        }
        for (const zSign of [-1, 1]) {
          const endTube = new THREE.Mesh(shopGeos.box, tubeMat);
          endTube.scale.set(w * 0.72, 0.028, 0.045);
          endTube.position.set(0, 0.14, zSign * (halfL * 0.82));
          ugGroup.add(endTube);
        }

        const pointLight = new THREE.PointLight(ugSpec.hex, 2.2, 7.5, 1.8);
        pointLight.position.set(0, 0.28, 0);
        pointLight.castShadow = false;
        ugGroup.add(pointLight);

        car.mesh.add(ugGroup);
        car._lscUnderglow = {
          group: ugGroup,
          poolMat,
          tubeMat,
          light: pointLight,
          rainbow: false,
          baseHex: ugSpec.hex
        };
      }

      car._lscUnderglow.group.visible = true;
      car._lscUnderglow.rainbow = Boolean(ugSpec.rainbow);
      car._lscUnderglow.baseHex = ugSpec.hex;
      car._lscUnderglow.poolMat.color.setHex(ugSpec.hex);
      car._lscUnderglow.tubeMat.color.setHex(ugSpec.hex);
      car._lscUnderglow.light.color.setHex(ugSpec.hex);
      car._lscUnderglow.light.intensity = 2.25;
    }

    // ------------------------------------------------------------------------
    // 2. TWIN-TURBO 3D EXHAUST BACKFIRE FLAME CONES (Blue Core + Orange Plasma)
    // ------------------------------------------------------------------------
    if (mods.twinTurbo) {
      if (!car._lscExhaustFlames && car.chassis) {
        const flameGroup = new THREE.Group();
        flameGroup.name = 'lscTwinTurboFlames';
        const offsets = car.def?.quadExhaust ? [-0.66, -0.52, 0.52, 0.66] : [-0.58, 0.58];
        const flameNozzles = [];

        for (const ox of offsets) {
          const nozzle = new THREE.Group();
          nozzle.position.set(ox, 0.25, -halfL - 0.12);

          const coreCone = new THREE.Mesh(exhaustFlameGeo, shopMats.flameInnerBlue);
          coreCone.scale.set(0.82, 0.82, 1.0);

          const outerCone = new THREE.Mesh(exhaustFlameGeo, shopMats.flameOuterOrange);
          outerCone.scale.set(1.38, 1.38, 1.32);

          nozzle.add(coreCone, outerCone);
          flameGroup.add(nozzle);
          flameNozzles.push({ nozzle, coreCone, outerCone });
        }

        const backfireLight = new THREE.PointLight(0x38bdf8, 0, 5.5, 2.0);
        backfireLight.position.set(0, 0.32, -halfL - 0.45);
        backfireLight.castShadow = false;
        flameGroup.add(backfireLight);

        flameGroup.visible = false;
        car.chassis.add(flameGroup);
        car._lscExhaustFlames = {
          group: flameGroup,
          nozzles: flameNozzles,
          light: backfireLight,
          timer: 0,
          boostPsi: 0,
          prevGear: 1,
          prevThrottle: 0,
          bovCooldown: 0
        };
      }
    } else if (car._lscExhaustFlames) {
      car._lscExhaustFlames.group.visible = false;
      car._lscExhaustFlames.timer = 0;
    }
  }

  function applyPerformanceAndArmorStats(car, mods) {
    if (!car) return;
    const eng = ENGINE_STAGES[clamp(Number(mods.engineStage) || 0, 0, 4)];
    const brk = BRAKE_STAGES[clamp(Number(mods.brakesStage) || 0, 0, 3)];
    const stn = STANCE_LEVELS[clamp(Number(mods.stanceLevel) || 0, 0, 3)];
    const arm = ARMOR_STAGES[clamp(Number(mods.armorStage) || 0, 0, 4)];
    const spl = SPOILER_OPTIONS.find((s) => s.id === mods.spoiler) || SPOILER_OPTIONS[0];

    const turboSpeedMul = mods.twinTurbo ? 1.12 : 1.0;
    const turboAccelMul = mods.twinTurbo ? 1.24 : 1.0;

    car.maxSpeed = Number((car._baseMaxSpeed * eng.speedMul * turboSpeedMul).toFixed(2));
    car.accel = Number((car._baseAccel * eng.accelMul * turboAccelMul).toFixed(2));

    const prevRatio = car.maxHp > 0 ? clamp(car.hp / car.maxHp, 0.2, 1.0) : 1.0;
    car.maxHp = Math.round(car._baseMaxHp * arm.hpMul);
    car.hp = Math.max(car.hp || car.maxHp, Math.round(car.maxHp * prevRatio));

    car.bulletproofTires = Boolean(mods.bulletproofTires);
    car._lscBrakeBonus = brk.decelBonus;
    car._lscDentResist = arm.dentResist;
    car._lscStanceDropY = stn.dropY;
    car.isTuned = Boolean(
      mods.engineStage > 0 ||
      mods.twinTurbo ||
      mods.underglow !== 'none' ||
      mods.spoiler !== 'none' ||
      mods.paintFinish === 'chrome' ||
      mods.paintFinish === 'gold24k' ||
      mods.paintFinish === 'pearlescent'
    );
    car.isExoticTuned = car.isTuned;

    // Safely clone car.def per-vehicle before mutating grip/stiffness so shared archetype defaults aren't altered
    if (car.def && !car._hasPrivateDef) {
      car.def = { ...car.def };
      car._hasPrivateDef = true;
    }
    if (car.def) {
      car.def.grip = Number((car._baseGrip + (spl.gripBonus || 0) + (mods.stanceLevel > 0 ? 0.04 : 0)).toFixed(3));
      car.def.stiffness = Number((car._baseStiffness * stn.stiffMul).toFixed(3));
    }

    // Apply Suspension Stance Drop & Subtle Negative Camber on all 4 wheels
    if (Array.isArray(car.wheels)) {
      for (let i = 0; i < car.wheels.length; i++) {
        const w = car.wheels[i];
        if (!w) continue;
        // Lowering chassis relative to wheels means raising wheel rest anchor slightly into wheel-arch + chassis drop
        const origY = typeof w._origBaseY === 'number' ? w._origBaseY : w.baseY;
        w.baseY = origY - stn.dropY * 0.65;
        w.suspNode.position.y = w.baseY;
        const sideSign = w.isLeft ? 1 : -1;
        w.suspNode.rotation.z = sideSign * stn.camber;
      }
    }
  }

  /**
   * Public API: `applyCarMods(car, partialOrFullMods, opts)`
   * Attaches real 3D PBR paint, neon underglow, aero bodykits, custom rims, tint,
   * engine stage 1-4, twin-turbo backfire flames, stance drop, bulletproof tires & 2.5x armor!
   */
  function applyCarMods(targetCar, modOverrides = {}, opts = {}) {
    const car = targetCar || state.activeCar || ctx.player?.inCar;
    if (!car || car.destroyed) return false;

    ensureCarBaseSnapshot(car);
    car.customMods = {
      ...car.customMods,
      ...(modOverrides || {})
    };

    const mods = car.customMods;
    applyPaintFinishToCar(car, mods);
    applyRimAndWindowMods(car, mods);
    build3DBodykitMeshes(car, mods);
    build3DUnderglowAndTurboFlames(car, mods);
    applyPerformanceAndArmorStats(car, mods);

    if (opts.fullRepair || mods.bulletproofTires) {
      ctx.npcLife?.restoreVehiclePuncturedTires?.(car);
    }
    if (opts.fullRepair) {
      car.hp = car.maxHp;
      car.onFire = false;
      car.fireTimer = 0;
      car.dentFront = 0;
      car.dentRear = 0;
      car.hoodBuckle = 0;
      car.tiresPopped = false;
      if (Array.isArray(car.puncturedTires)) {
        car.puncturedTires.fill(false);
      }
    }

    return true;
  }

  function triggerCarBackfireBurst(car, duration = 0.22, intensity = 1.0) {
    const fx = car?._lscExhaustFlames;
    if (!fx) return;
    fx.timer = Math.max(fx.timer, duration);
    fx.group.visible = true;
    if (car === ctx.player?.inCar || car === state.activeCar) {
      shopAudio.playBackfirePop(intensity);
    }
  }

  // Per-frame live update for all tuned vehicles (Underglow Rainbow, Twin-Turbo Spool/BOV/Flames, Bulletproof Tires, Race Brakes)
  function updateTunedVehiclesFX(dt, elapsed) {
    const vList = ctx.vehicles?.list;
    if (!Array.isArray(vList)) return;

    const playerCar = ctx.player?.inCar || null;
    const inp = ctx.input || {};
    const throttle = state.revEngineTimer > 0
      ? 1.0
      : clamp(Number(inp.throttle || (inp.forward ? 1 : 0)) || 0, 0, 1);
    const brakeInput = clamp(Number(inp.brake || (inp.backward ? 1 : 0)) || 0, 0, 1);

    if (state.revEngineTimer > 0) {
      state.revEngineTimer = Math.max(0, state.revEngineTimer - dt);
    }

    let playerHasActiveTurbo = false;
    let playerBoostPsi = 0;

    for (let i = 0; i < vList.length; i++) {
      const car = vList[i];
      if (!car || !car.customMods || car.destroyed) continue;

      const isPlayer = car === playerCar || (state.modalMode === 'customs' && car === state.activeCar);
      const distSqToCam = ctx.player
        ? distSq2D(car.x, car.z, ctx.player.x, ctx.player.z)
        : 0;

      // 1. Bulletproof Tires Shield (blocks spike-strip punctures & restores full grip)
      if (car.bulletproofTires) {
        if (car.tiresPopped) car.tiresPopped = false;
        if (car.flatTires) car.flatTires = 0;
        if (Array.isArray(car.puncturedTires)) {
          for (let t = 0; t < car.puncturedTires.length; t++) car.puncturedTires[t] = false;
        }
      }

      // 2. Reinforced Armor Dent Resistance & Stance Chassis Offset
      if (car._lscDentResist < 1.0 && (car.dentFront > 0 || car.dentRear > 0)) {
        const cap = Math.max(0.12, car._lscDentResist);
        if (car.dentFront > cap) car.dentFront = cap;
        if (car.dentRear > cap) car.dentRear = cap;
        if (car.hoodBuckle > cap) car.hoodBuckle = cap;
      }
      if (car._lscStanceDropY && car.chassis && !car.isHeli) {
        car.chassis.position.y += car._lscStanceDropY * 0.45;
      }

      // 3. Race Brakes Extra Stopping Force for Player Vehicle
      if (isPlayer && car === playerCar && car._lscBrakeBonus > 0 && brakeInput > 0.1 && car.speed > 1.5 && !state.modalOpen) {
        const fwdX = Math.sin(car.yaw);
        const fwdZ = Math.cos(car.yaw);
        const extraDecel = car._lscBrakeBonus * brakeInput * dt;
        const applyAmt = Math.min(car.speed * 0.5, extraDecel);
        car.vx -= fwdX * applyAmt;
        car.vz -= fwdZ * applyAmt;
      }

      // 4. Spin Exposed V8 Supercharger Blower Pulleys proportional to engine speed
      if (car._blowerPulleys) {
        const rpmSpin = (8.0 + Math.abs(car.speed || 0) * 1.4 + (isPlayer ? throttle * 22 : 0)) * dt;
        for (let p = 0; p < car._blowerPulleys.length; p++) {
          car._blowerPulleys[p].rotation.z += rpmSpin * (p === 0 ? 1.35 : 1.0);
        }
      }

      // 5. 3D Neon Underglow Rainbow Pulse & Distance-Aware PointLight Culling
      const ug = car._lscUnderglow;
      if (ug && ug.group.visible) {
        if (ug.rainbow) {
          const hue = (elapsed * 0.28 + i * 0.13) % 1.0;
          _colA.setHSL(hue, 1.0, 0.54);
          ug.poolMat.color.copy(_colA);
          ug.tubeMat.color.copy(_colA);
          ug.light.color.copy(_colA);
        }
        const pulse = 0.86 + 0.14 * Math.sin(elapsed * 5.2 + i);
        ug.poolMat.opacity = 0.84 * pulse;
        // Enable PointLight only when within 65m so city-wide FPS stays rock solid!
        ug.light.intensity = distSqToCam < 65 * 65 ? 2.35 * pulse : 0;
      }

      // 6. Twin-Turbo Spool, Blow-Off `pssshh` Whistle & 3D Blue/Orange Exhaust Flames!
      const tf = car._lscExhaustFlames;
      if (tf && car.customMods.twinTurbo) {
        if (tf.bovCooldown > 0) tf.bovCooldown = Math.max(0, tf.bovCooldown - dt);

        if (isPlayer) {
          playerHasActiveTurbo = true;
          const absSpd = Math.abs(car.speed || 0);
          const maxSpd = Math.max(22, car.maxSpeed || 40);
          const targetBoost = throttle > 0.25
            ? clamp((absSpd / maxSpd) * 0.95 + throttle * 0.68, 0, 1.5)
            : 0;

          tf.boostPsi = smoothDamp(tf.boostPsi, targetBoost, throttle > 0.25 ? 4.8 : 9.5, dt);
          playerBoostPsi = tf.boostPsi;
          car.turboBoostPsi = tf.boostPsi;

          // Detect gear upshift OR sudden high-boost throttle lift-off -> BOV Whistle + Backfire Flames!
          const gearRatios = [0, 0.17, 0.33, 0.50, 0.68, 0.85, 1.2];
          let curGear = 1;
          for (let g = 1; g <= 6; g++) {
            if (absSpd >= gearRatios[g - 1] * maxSpd) curGear = g;
          }

          const upshifted = curGear > tf.prevGear && absSpd > 8;
          const liftedOffHighBoost = tf.prevThrottle > 0.65 && throttle < 0.15 && (tf.boostPsi > 0.52 || absSpd > 14);

          if ((upshifted || liftedOffHighBoost) && tf.bovCooldown <= 0) {
            tf.bovCooldown = 0.32;
            shopAudio.playBlowOffWhistle(clamp(0.55 + tf.boostPsi * 0.55, 0.5, 1.35));
            triggerCarBackfireBurst(car, upshifted ? 0.20 : 0.28, upshifted ? 0.85 : 1.05);
          } else if (absSpd > 18 && throttle < 0.06 && Math.random() < dt * 3.4) {
            // Deceleration anti-lag crackle flames
            triggerCarBackfireBurst(car, 0.11, 0.55);
          }

          tf.prevGear = curGear;
          tf.prevThrottle = throttle;
        }

        // Animate active 3D blue/orange exhaust flame cones
        if (tf.timer > 0) {
          tf.timer = Math.max(0, tf.timer - dt);
          tf.group.visible = true;
          const flicker = 0.72 + Math.random() * 0.68;
          for (let n = 0; n < tf.nozzles.length; n++) {
            const nz = tf.nozzles[n];
            const nJit = 0.85 + Math.random() * 0.4;
            nz.coreCone.scale.set(0.78 * nJit, 0.78 * nJit, 0.85 + flicker * 0.65);
            nz.outerCone.scale.set(1.32 * nJit, 1.32 * nJit, 1.05 + flicker * 0.85);
            nz.nozzle.rotation.z = Math.random() * Math.PI * 2;
          }
          tf.light.intensity = distSqToCam < 55 * 55 ? 3.2 * flicker : 0;
          tf.light.color.setHex(Math.random() > 0.35 ? 0x38bdf8 : 0xff8c00);
        } else if (tf.group.visible) {
          tf.group.visible = false;
          tf.light.intensity = 0;
        }
      }

      // 7. Twin-Bottle Nitrous Oxide (N2O) Hood Purge Plumes & Street `[Left Shift]` Thrust!
      if (car.customMods.nosKit && car._nosPurgeCones) {
        if (typeof car._nosCharge !== 'number') car._nosCharge = 100;
        if (typeof car._nosPurgeTimer !== 'number') car._nosPurgeTimer = 0;
        if (car._nosPurgeTimer > 0) car._nosPurgeTimer = Math.max(0, car._nosPurgeTimer - dt);

        const shiftBoost = Boolean(
          isPlayer &&
          car === playerCar &&
          !state.modalOpen &&
          (inp.boost || inp.sprint || inp.keys?.ShiftLeft || rawShopKeys.ShiftLeft)
        );
        const nosFiring = shiftBoost && throttle > 0.35 && car._nosCharge > 4;

        if (nosFiring) {
          car._nosCharge = Math.max(0, car._nosCharge - 28 * dt);
          const fwdX = Math.sin(car.yaw);
          const fwdZ = Math.cos(car.yaw);
          const curSpd = Math.hypot(car.vx || 0, car.vz || 0);
          if (curSpd < (car.maxSpeed || 42) * 1.18) {
            car.vx += fwdX * (car.accel || 28) * 0.42 * dt;
            car.vz += fwdZ * (car.accel || 28) * 0.42 * dt;
          }
          if (car._lscExhaustFlames) {
            car._lscExhaustFlames.timer = Math.max(car._lscExhaustFlames.timer, 0.08);
            car._lscExhaustFlames.group.visible = true;
          }
        } else {
          car._nosCharge = Math.min(100, car._nosCharge + 14 * dt);
        }

        const showPurge = car._nosPurgeTimer > 0 || (shiftBoost && Math.abs(car.speed || 0) < 3.5);
        for (let pIdx = 0; pIdx < car._nosPurgeCones.length; pIdx++) {
          const cone = car._nosPurgeCones[pIdx];
          cone.visible = showPurge;
          if (showPurge) {
            const jit = 0.85 + Math.random() * 0.45;
            cone.scale.set(0.22 * jit, 1.15 * jit, 0.22 * jit);
          }
        }
      }
    }

    shopAudio.updateTurboSpool(playerBoostPsi, playerHasActiveTurbo && !state.modalOpen);
  }

  // ==========================================================================
  // 11. 3D EXTERIOR SHOP LANDMARKS, LSC WORKSHOP BAY & AMMU-NATION INTERIOR
  // ==========================================================================
  const shopsRoot = new THREE.Group();
  shopsRoot.name = 'CustomsAndShopsRoot';

  const ammuInteriorRoot = new THREE.Group();
  ammuInteriorRoot.name = 'AmmuNationInterior1800';
  shopsRoot.add(ammuInteriorRoot);

  const personalGarageRoot = new THREE.Group();
  personalGarageRoot.name = 'Personal6CarGarage1844';
  shopsRoot.add(personalGarageRoot);

  const stickyBombGroup = new THREE.Group();
  stickyBombGroup.name = 'PlantedStickyBombsGroup';
  shopsRoot.add(stickyBombGroup);

  const exteriorAABBs = [];
  const ammuInteriorAABBs = [];
  const animatedCoronas = [];
  let lscShowroomLightsGroup = null;
  let lscTurntableRing = null;
  let dealershipPodiumGroup = null;
  let lscMechanicRig = null;
  let ammuClerkRig = null;
  let laserBeamMesh = null;
  let laserDotMesh = null;

  function makeCoronaMarker(x, y, z, colorHex, radius = 1.15, height = 2.4) {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);

    const cylMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const cyl = new THREE.Mesh(shopGeos.coronaCyl, cylMat);
    cyl.scale.set(radius / 1.25, height / 2.7, radius / 1.25);
    cyl.position.y = height * 0.5;

    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(shopGeos.coronaRing, ringMat);
    ring.scale.setScalar(radius / 1.15);
    ring.position.y = 0.04;

    grp.add(cyl, ring);
    animatedCoronas.push({ group: grp, cylMat, ring, baseY: y, phase: Math.random() * 6.28 });
    return grp;
  }

  function buildMiniatureDisplayGun(kind, matMain, matSub) {
    const g = new THREE.Group();
    if (kind === 'pistol') {
      const slide = new THREE.Mesh(shopGeos.box, matMain);
      slide.scale.set(0.05, 0.07, 0.28);
      const grip = new THREE.Mesh(shopGeos.box, matSub);
      grip.scale.set(0.045, 0.14, 0.07);
      grip.position.set(0, -0.08, -0.07);
      grip.rotation.x = 0.24;
      g.add(slide, grip);
    } else if (kind === 'smg') {
      const body = new THREE.Mesh(shopGeos.box, matMain);
      body.scale.set(0.06, 0.10, 0.42);
      const mag = new THREE.Mesh(shopGeos.box, matSub);
      mag.scale.set(0.04, 0.20, 0.06);
      mag.position.set(0, -0.13, 0.04);
      const sup = new THREE.Mesh(shopGeos.cylLow, matSub);
      sup.scale.set(0.045, 0.22, 0.045);
      sup.rotation.x = Math.PI * 0.5;
      sup.position.set(0, 0.01, 0.30);
      g.add(body, mag, sup);
    } else if (kind === 'sniper') {
      const rec = new THREE.Mesh(shopGeos.box, matMain);
      rec.scale.set(0.065, 0.10, 0.56);
      const barrel = new THREE.Mesh(shopGeos.cylLow, matMain);
      barrel.scale.set(0.036, 0.72, 0.036);
      barrel.rotation.x = Math.PI * 0.5;
      barrel.position.set(0, 0.02, 0.62);
      const brake = new THREE.Mesh(shopGeos.box, matSub);
      brake.scale.set(0.07, 0.06, 0.11);
      brake.position.set(0, 0.02, 0.98);
      const scope = new THREE.Mesh(shopGeos.cylLow, matSub);
      scope.scale.set(0.055, 0.36, 0.055);
      scope.rotation.x = Math.PI * 0.5;
      scope.position.set(0, 0.11, 0.08);
      const stock = new THREE.Mesh(shopGeos.box, matSub);
      stock.scale.set(0.05, 0.13, 0.34);
      stock.position.set(0, -0.02, -0.42);
      g.add(rec, barrel, brake, scope, stock);
    } else {
      // Carbine / Shotgun
      const rec = new THREE.Mesh(shopGeos.box, matMain);
      rec.scale.set(0.06, 0.10, 0.48);
      const barrel = new THREE.Mesh(shopGeos.cylLow, matMain);
      barrel.scale.set(0.038, 0.44, 0.038);
      barrel.rotation.x = Math.PI * 0.5;
      barrel.position.set(0, 0.02, 0.44);
      const stock = new THREE.Mesh(shopGeos.box, matSub);
      stock.scale.set(0.05, 0.12, 0.28);
      stock.position.set(0, -0.02, -0.36);
      const mag = new THREE.Mesh(shopGeos.box, matSub);
      mag.scale.set(0.045, 0.18, 0.08);
      mag.position.set(0, -0.12, 0.06);
      mag.rotation.x = -0.2;
      g.add(rec, barrel, stock, mag);
    }
    return g;
  }

  function buildShowroomDisplayCarModel(bodyMat, accentMat) {
    const mats = ensureShopMaterials();
    const carGrp = new THREE.Group();

    const lowerBody = new THREE.Mesh(shopGeos.box, bodyMat);
    lowerBody.scale.set(2.04, 0.52, 4.62);
    lowerBody.position.set(0, 0.44, 0);
    lowerBody.castShadow = true;

    const cabin = new THREE.Mesh(shopGeos.box, mats.ballisticGlass);
    cabin.scale.set(1.58, 0.44, 2.05);
    cabin.position.set(0, 0.90, -0.18);

    const roof = new THREE.Mesh(shopGeos.box, mats.carbon);
    roof.scale.set(1.52, 0.05, 1.65);
    roof.position.set(0, 1.13, -0.22);

    const splitter = new THREE.Mesh(shopGeos.box, mats.carbon);
    splitter.scale.set(2.08, 0.04, 0.28);
    splitter.position.set(0, 0.19, 2.34);

    const wing = new THREE.Mesh(shopGeos.box, mats.carbon);
    wing.scale.set(2.06, 0.04, 0.30);
    wing.position.set(0, 1.12, -2.18);
    wing.rotation.x = 0.14;

    carGrp.add(lowerBody, cabin, roof, splitter, wing);

    for (const sx of [-0.62, 0.62]) {
      const pylon = new THREE.Mesh(shopGeos.box, accentMat);
      pylon.scale.set(0.04, 0.36, 0.18);
      pylon.position.set(sx, 0.92, -2.15);
      carGrp.add(pylon);
    }

    for (const [wx, wz] of [[-0.96, 1.42], [0.96, 1.42], [-0.96, -1.38], [0.96, -1.38]]) {
      const tire = new THREE.Mesh(shopGeos.cyl, mats.matteBlack);
      tire.scale.set(0.72, 0.28, 0.72);
      tire.rotation.z = Math.PI * 0.5;
      tire.position.set(wx, 0.36, wz);

      const rim = new THREE.Mesh(shopGeos.cyl, accentMat);
      rim.scale.set(0.50, 0.30, 0.50);
      rim.rotation.z = Math.PI * 0.5;
      rim.position.set(wx, 0.36, wz);
      carGrp.add(tire, rim);
    }

    return carGrp;
  }

  function buildExteriorShopLandmarks() {
    const mats = ensureShopMaterials();

    // ------------------------------------------------------------------------
    // 1. LOS SANTOS CUSTOMS WORKSHOP INTERIOR FURNISHING (`(-58, 0.05, 80)`)
    // ------------------------------------------------------------------------
    const lscGroup = new THREE.Group();
    lscGroup.name = 'LSCWorkshopInterior';

    // Subtle floor ring inside LSC bay (-58, 80) — clean neutral white
    const bayRingMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    lscTurntableRing = new THREE.Mesh(new THREE.RingGeometry(2.85, 3.04, 40), bayRingMat);
    lscTurntableRing.rotation.x = -Math.PI * 0.5;
    lscTurntableRing.position.set(-58.0, 0.065, 80.0);
    lscGroup.add(lscTurntableRing);

    // Embedded Steel Dyno Rollers in Bay Floor
    for (const dz of [-1.36, 1.38]) {
      const rollerPlate = new THREE.Mesh(shopGeos.box, mats.armorSteel);
      rollerPlate.scale.set(1.15, 0.03, 2.35);
      rollerPlate.position.set(-58.0 + dz, 0.055, 80.0);
      lscGroup.add(rollerPlate);
    }

    // Snap-On Red Mechanic Tool Cabinets, Air Compressor, Tire Rack & Nitrous Cart along North/South/Back Walls
    for (const tx of [-63.8, -60.5]) {
      const cabinet = new THREE.Mesh(shopGeos.box, mats.redAccent);
      cabinet.scale.set(1.85, 1.18, 0.68);
      cabinet.position.set(tx, 0.62, 75.35);
      cabinet.castShadow = true;
      const topSteel = new THREE.Mesh(shopGeos.box, mats.chrome);
      topSteel.scale.set(1.88, 0.05, 0.72);
      topSteel.position.set(tx, 1.23, 75.35);
      lscGroup.add(cabinet, topSteel);
    }

    // Stacked Pirelli Racing Slick Tires
    for (const stackZ of [83.9, 84.5]) {
      for (let tier = 0; tier < 4; tier++) {
        const slick = new THREE.Mesh(shopGeos.cyl, mats.matteBlack);
        slick.scale.set(0.74, 0.28, 0.74);
        slick.position.set(-64.2 + (stackZ > 84.2 ? 0.9 : 0), 0.19 + tier * 0.29, stackZ);
        lscGroup.add(slick);
      }
    }

    // Back-Wall LSC Sign (-66.2, y, 80.0) — clean warm workshop lighting
    const lscBackSignTex = getSignTexture(
      'lsc_interior_wall',
      'LOS SANTOS CUSTOMS',
      'XƯỞNG ĐỘ SIÊU XE 3D • TWIN-TURBO • SƠN 24K & CRÔM',
      '#1e242d',
      '#f8fafc',
      '#e2b857'
    );
    if (lscBackSignTex) {
      const wallSign = new THREE.Mesh(
        shopGeos.plane,
        new THREE.MeshStandardMaterial({
          map: lscBackSignTex,
          emissive: 0xffffff,
          emissiveMap: lscBackSignTex,
          emissiveIntensity: 0.32
        })
      );
      wallSign.scale.set(7.2, 2.1, 1);
      wallSign.rotation.y = Math.PI * 0.5;
      wallSign.position.set(-66.15, 3.35, 80.0);
      lscGroup.add(wallSign);
    }

    // LSC Showroom Overhead Spotlights (clean neutral white, activated during `openCustoms`!)
    lscShowroomLightsGroup = new THREE.Group();
    const lightOffsets = [
      [-55.2, 4.6, 77.4, 0xf8fafc],
      [-60.8, 4.6, 82.6, 0xf8fafc],
      [-58.0, 3.8, 76.5, 0xfff8eb]
    ];
    for (const [lx, ly, lz, lhex] of lightOffsets) {
      const pl = new THREE.PointLight(lhex, 0, 14, 1.6);
      pl.position.set(lx, ly, lz);
      pl.castShadow = false;
      lscShowroomLightsGroup.add(pl);
    }
    lscShowroomLightsGroup.visible = false;
    lscGroup.add(lscShowroomLightsGroup);

    // LSC Mechanic NPC standing beside the tool chest
    if (ctx.characters?.createHumanoid) {
      lscMechanicRig = ctx.characters.createHumanoid('road_worker');
      lscMechanicRig.position.set(-62.2, 0.05, 76.2);
      lscMechanicRig.rotation.y = 0.35;
      lscGroup.add(lscMechanicRig);
    }

    lscGroup.add(makeCoronaMarker(-58.0, 0.05, 80.0, 0xd946ef, 1.55, 2.6));
    shopsRoot.add(lscGroup);

    // ------------------------------------------------------------------------
    // 2. AMMU-NATION EXTERIOR STOREFRONT (`(209.5, 0.22, 10.0)` facing West `X = +200`)
    // ------------------------------------------------------------------------
    const ammuExt = new THREE.Group();
    ammuExt.name = 'AmmuNationExteriorStorefront';

    // Facade shell flush against X = 213.85 colonnade facing Boulevard X = 200
    const ammuFrame = new THREE.Mesh(shopGeos.box, mats.brickDark);
    ammuFrame.scale.set(0.85, 5.2, 13.6);
    ammuFrame.position.set(213.55, 2.82, 10.0);
    ammuExt.add(ammuFrame);

    // Tactical Awning Overhang (Red/White/Navy trim)
    const ammuAwning = new THREE.Mesh(shopGeos.box, mats.redAccent);
    ammuAwning.scale.set(2.3, 0.42, 13.8);
    ammuAwning.position.set(212.35, 4.55, 10.0);
    ammuExt.add(ammuAwning);

    const ammuSignTex = getSignTexture(
      'ammu_ext_sign',
      'AMMU-NATION',
      'KHO VŨ KHÍ HẠNG NẶNG • PHỤ KIỆN 3D & TRƯỜNG BẮN',
      '#1a0808',
      '#ff3b30',
      '#facc15'
    );
    if (ammuSignTex) {
      const signMesh = new THREE.Mesh(
        shopGeos.plane,
        new THREE.MeshStandardMaterial({
          map: ammuSignTex,
          emissive: 0xffffff,
          emissiveMap: ammuSignTex,
          emissiveIntensity: 0.92
        })
      );
      signMesh.scale.set(11.4, 2.5, 1);
      signMesh.rotation.y = -Math.PI * 0.5;
      signMesh.position.set(211.16, 5.85, 10.0);
      ammuExt.add(signMesh);
    }

    // Illuminated Ballistic Display Windows & Double Tactical Entry Doors
    for (const wz of [5.8, 14.2]) {
      const winBack = new THREE.Mesh(shopGeos.box, mats.matteBlack);
      winBack.scale.set(0.3, 2.4, 3.4);
      winBack.position.set(213.08, 1.85, wz);
      const winGlass = new THREE.Mesh(shopGeos.plane, mats.ballisticGlass);
      winGlass.scale.set(3.4, 2.4, 1);
      winGlass.rotation.y = -Math.PI * 0.5;
      winGlass.position.set(212.90, 1.85, wz);

      const dispRifle = buildMiniatureDisplayGun('sniper', mats.gold24k, mats.matteBlack);
      dispRifle.rotation.y = Math.PI;
      dispRifle.scale.setScalar(1.45);
      dispRifle.position.set(212.98, 1.9, wz);
      ammuExt.add(winBack, winGlass, dispRifle);
    }

    const ammuDoor = new THREE.Mesh(shopGeos.box, mats.armorSteel);
    ammuDoor.scale.set(0.25, 2.8, 2.6);
    ammuDoor.position.set(213.02, 1.62, 10.0);
    ammuExt.add(ammuDoor);

    // Tactical Sandbag Bunkers flanking entrance
    const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x9c8867, roughness: 0.92 });
    for (const sz of [7.6, 12.4]) {
      for (let row = 0; row < 3; row++) {
        const bag = new THREE.Mesh(shopGeos.box, sandbagMat);
        bag.scale.set(0.55, 0.24, 1.05 - row * 0.1);
        bag.position.set(212.35, 0.34 + row * 0.23, sz);
        ammuExt.add(bag);
      }
    }

    ammuExt.add(makeCoronaMarker(SHOP_COORDS.ammuExterior.x, SHOP_COORDS.ammuExterior.y, SHOP_COORDS.ammuExterior.z, 0xff3b30, 1.25, 2.6));
    shopsRoot.add(ammuExt);

    // ------------------------------------------------------------------------
    // 3. PONSONBYS / SUBURBAN FASHION BOUTIQUE (`(209.5, 0.22, 95.0)`)
    // ------------------------------------------------------------------------
    const clothExt = new THREE.Group();
    clothExt.name = 'PonsonbysFashionBoutiqueExterior';

    const marbleMat = new THREE.MeshPhysicalMaterial({
      color: 0xf1f5f9,
      metalness: 0.12,
      roughness: 0.18,
      clearcoat: 0.85
    });
    const boutiqueFacade = new THREE.Mesh(shopGeos.box, marbleMat);
    boutiqueFacade.scale.set(0.85, 5.4, 13.6);
    boutiqueFacade.position.set(213.55, 2.92, 95.0);
    clothExt.add(boutiqueFacade);

    const goldCanopy = new THREE.Mesh(shopGeos.box, mats.gold24k);
    goldCanopy.scale.set(2.2, 0.28, 13.8);
    goldCanopy.position.set(212.4, 4.62, 95.0);
    clothExt.add(goldCanopy);

    const clothSignTex = getSignTexture(
      'ponsonbys_ext_sign',
      'PONSONBYS • SUBURBAN',
      'THỜI TRANG THƯỢNG LƯU • ĐỒNG HỒ VÀNG & MẶT NẠ NEON',
      '#0f172a',
      '#fde047',
      '#38bdf8'
    );
    if (clothSignTex) {
      const signMesh = new THREE.Mesh(
        shopGeos.plane,
        new THREE.MeshStandardMaterial({
          map: clothSignTex,
          emissive: 0xffffff,
          emissiveMap: clothSignTex,
          emissiveIntensity: 0.88
        })
      );
      signMesh.scale.set(11.4, 2.45, 1);
      signMesh.rotation.y = -Math.PI * 0.5;
      signMesh.position.set(211.2, 5.88, 95.0);
      clothExt.add(signMesh);
    }

    // Illuminated Boutique Display Windows with 2 Dressed 3D Mannequins!
    for (const [idx, wz] of [[0, 91.0], [1, 99.0]]) {
      const alcBack = new THREE.Mesh(shopGeos.box, mats.matteBlack);
      alcBack.scale.set(0.35, 2.8, 3.6);
      alcBack.position.set(213.06, 1.85, wz);
      const alcGlass = new THREE.Mesh(shopGeos.plane, mats.ballisticGlass);
      alcGlass.scale.set(3.6, 2.8, 1);
      alcGlass.rotation.y = -Math.PI * 0.5;
      alcGlass.position.set(212.82, 1.85, wz);
      clothExt.add(alcBack, alcGlass);

      if (ctx.characters?.createHumanoid) {
        const man = ctx.characters.createHumanoid(idx === 0 ? 'luxury_suit' : 'tactical_heist');
        man.position.set(212.95, 0.45, wz);
        man.rotation.y = -Math.PI * 0.5;
        man.scale.setScalar(0.95);
        clothExt.add(man);
      }
    }

    clothExt.add(makeCoronaMarker(SHOP_COORDS.clothingExterior.x, SHOP_COORDS.clothingExterior.y, SHOP_COORDS.clothingExterior.z, 0x38bdf8, 1.25, 2.6));
    shopsRoot.add(clothExt);

    // ------------------------------------------------------------------------
    // 4. LEGENDARY MOTORSPORT DEALERSHIP & 6-CAR PERSONAL GARAGE SHOWROOM
    //    Rotating Hypercar Turntable at `(-54.5, 0.08, 95.8)` + Boulevard Valet `(209.5, 0.22, 66.0)`
    // ------------------------------------------------------------------------
    const dealerExt = new THREE.Group();
    dealerExt.name = 'LegendaryMotorsportDealership';

    const podiumBase = new THREE.Mesh(shopGeos.cyl, mats.matteBlack);
    podiumBase.scale.set(5.4, 0.22, 5.4);
    podiumBase.position.set(SHOP_COORDS.dealershipTurntable.x, 0.15, SHOP_COORDS.dealershipTurntable.z);
    const podiumRim = new THREE.Mesh(shopGeos.cyl, mats.gold24k);
    podiumRim.scale.set(5.52, 0.08, 5.52);
    podiumRim.position.set(SHOP_COORDS.dealershipTurntable.x, 0.24, SHOP_COORDS.dealershipTurntable.z);
    dealerExt.add(podiumBase, podiumRim);

    dealershipPodiumGroup = new THREE.Group();
    dealershipPodiumGroup.position.set(SHOP_COORDS.dealershipTurntable.x, 0.28, SHOP_COORDS.dealershipTurntable.z);
    dealershipPodiumGroup.add(buildShowroomDisplayCarModel(mats.gold24k, mats.chrome));
    dealerExt.add(dealershipPodiumGroup);

    const dealerSignTex = getSignTexture(
      'dealer_ext_sign',
      'LEGENDARY MOTORSPORT',
      'SIÊU XE NHẬP KHẨU & GARA CÁ NHÂN 6 CHỖ',
      '#140e04',
      '#facc15',
      '#ffffff'
    );
    if (dealerSignTex) {
      const westSign = new THREE.Mesh(
        shopGeos.plane,
        new THREE.MeshStandardMaterial({
          map: dealerSignTex,
          emissive: 0xffffff,
          emissiveMap: dealerSignTex,
          emissiveIntensity: 0.9
        })
      );
      westSign.scale.set(10.5, 2.3, 1);
      westSign.rotation.y = Math.PI * 0.5;
      westSign.position.set(-49.6, 8.2, 95.8);
      dealerExt.add(westSign);

      // East Luxury Strip Kiosk Sign at (211.2, 5.6, 66.0)
      const eastSign = westSign.clone();
      eastSign.rotation.y = -Math.PI * 0.5;
      eastSign.position.set(211.2, 5.5, 66.0);
      dealerExt.add(eastSign);
    }

    dealerExt.add(makeCoronaMarker(SHOP_COORDS.dealershipTriggerWest.x, SHOP_COORDS.dealershipTriggerWest.y, SHOP_COORDS.dealershipTriggerWest.z, 0xfacc15, 1.3, 2.6));
    dealerExt.add(makeCoronaMarker(SHOP_COORDS.dealershipTriggerEast.x, SHOP_COORDS.dealershipTriggerEast.y, SHOP_COORDS.dealershipTriggerEast.z, 0xfacc15, 1.25, 2.6));
    shopsRoot.add(dealerExt);
  }

  // ==========================================================================
  // 12. FULL WALK-IN AMMU-NATION 3D INTERIOR & 4-LANE LIVE SHOOTING RANGE
  //     Centered at `(1800, 0, 1800)`:
  //       - Showroom Hall: `28m × 24m` -> `X ∈ [1786, 1814], Z ∈ [1788, 1812]`
  //       - 4-Lane Downrange Ballistic Gallery: `X ∈ [1791, 1809], Z ∈ [1756, 1796]`
  //         so 10m (Z=1786.6), 20m (Z=1776.6), and 35m (Z=1761.6) targets are 1:1 true scale!
  // ==========================================================================
  function buildAmmuNationInterior() {
    const tex = ensureShopTextures();
    const mats = ensureShopMaterials();

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.shopCheckerFloor || null,
      roughness: 0.42,
      metalness: 0.14
    });

    const pegMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.pegboardTex || null,
      roughness: 0.78,
      metalness: 0.08
    });

    // 1. Main `28m × 24m` Showroom Floor & Ceiling
    const mainFloor = new THREE.Mesh(shopGeos.box, floorMat);
    mainFloor.scale.set(28.4, 0.12, 24.4);
    mainFloor.position.set(1800, -0.01, 1800);
    mainFloor.receiveShadow = true;
    ammuInteriorRoot.add(mainFloor);

    const mainCeiling = new THREE.Mesh(shopGeos.box, mats.rangeCeiling);
    mainCeiling.scale.set(28.6, 0.3, 24.6);
    mainCeiling.position.set(1800, 6.25, 1800);
    ammuInteriorRoot.add(mainCeiling);

    // 2. Perimeter Showroom Walls (leaving `18m` central shooting gallery opening on North wall Z = 1788!)
    const southWall = new THREE.Mesh(shopGeos.box, mats.brickDark);
    southWall.scale.set(28.6, 6.3, 0.5);
    southWall.position.set(1800, 3.1, 1812.1);

    const westWall = new THREE.Mesh(shopGeos.box, mats.brickDark);
    westWall.scale.set(0.5, 6.3, 24.4);
    westWall.position.set(1785.9, 3.1, 1800);

    const eastWall = new THREE.Mesh(shopGeos.box, mats.brickDark);
    eastWall.scale.set(0.5, 6.3, 24.4);
    eastWall.position.set(1814.1, 3.1, 1800);

    const northWingW = new THREE.Mesh(shopGeos.box, mats.brickDark);
    northWingW.scale.set(5.4, 6.3, 0.5);
    northWingW.position.set(1788.6, 3.1, 1788.0);

    const northWingE = new THREE.Mesh(shopGeos.box, mats.brickDark);
    northWingE.scale.set(5.4, 6.3, 0.5);
    northWingE.position.set(1811.4, 3.1, 1788.0);

    const northHeader = new THREE.Mesh(shopGeos.box, mats.concreteWall);
    northHeader.scale.set(18.2, 2.1, 0.5);
    northHeader.position.set(1800, 5.2, 1788.0);

    ammuInteriorRoot.add(southWall, westWall, eastWall, northWingW, northWingE, northHeader);

    // 3. Weapon Pegboard Wall Racks + 28 Sculpted 3D Display Guns along West & East Walls
    for (const [sideSign, wallX, rotY] of [[1, 1786.25, Math.PI * 0.5], [-1, 1813.75, -Math.PI * 0.5]]) {
      const board = new THREE.Mesh(shopGeos.box, pegMat);
      board.scale.set(0.08, 3.2, 16.5);
      board.position.set(wallX, 2.5, 1801.5);
      ammuInteriorRoot.add(board);

      const kinds = ['pistol', 'smg', 'carbine', 'sniper'];
      for (let col = 0; col < 7; col++) {
        for (let row = 0; row < 2; row++) {
          const kind = kinds[(col + row) % kinds.length];
          const isLuxury = (col + row + (sideSign > 0 ? 0 : 1)) % 3 === 0;
          const gunMesh = buildMiniatureDisplayGun(
            kind,
            isLuxury ? mats.gold24k : mats.armorSteel,
            isLuxury ? mats.platinum : mats.matteBlack
          );
          gunMesh.rotation.y = rotY;
          gunMesh.position.set(wallX + sideSign * 0.14, 1.85 + row * 1.15, 1794.5 + col * 2.3);
          ammuInteriorRoot.add(gunMesh);
        }
      }
    }

    // 4. L-Shaped Glass & Walnut Weapon Sales Counter (`X ∈ [1788.5, 1795.5], Z ∈ [1800.5, 1806.5]`) + Clerk NPC
    const counterMain = new THREE.Mesh(shopGeos.box, mats.warmWood);
    counterMain.scale.set(1.2, 1.08, 6.2);
    counterMain.position.set(1792.2, 0.54, 1803.2);
    const counterGlass = new THREE.Mesh(shopGeos.box, mats.ballisticGlass);
    counterGlass.scale.set(1.16, 0.26, 6.1);
    counterGlass.position.set(1792.2, 1.20, 1803.2);
    ammuInteriorRoot.add(counterMain, counterGlass);

    for (let g = 0; g < 4; g++) {
      const caseGun = buildMiniatureDisplayGun(g % 2 === 0 ? 'pistol' : 'smg', mats.gold24k, mats.matteBlack);
      caseGun.rotation.z = Math.PI * 0.5;
      caseGun.position.set(1792.2, 1.14, 1801.0 + g * 1.45);
      ammuInteriorRoot.add(caseGun);
    }

    if (ctx.characters?.createHumanoid) {
      ammuClerkRig = ctx.characters.createHumanoid('biker_jacket');
      ammuClerkRig.position.set(1790.2, 0.05, 1803.2);
      ammuClerkRig.rotation.y = Math.PI * 0.5;
      ammuInteriorRoot.add(ammuClerkRig);
    }

    // Counter collision box
    ammuInteriorAABBs.push({ minX: 1789.0, maxX: 1792.9, minZ: 1800.0, maxZ: 1806.5, maxY: 1.5 });

    // 5. East Heavy Kevlar Body Armor Rack & Military Ammo Crates (`X = 1808.8, Z = 1803.2`)
    const armorPedestal = new THREE.Mesh(shopGeos.box, mats.armorSteel);
    armorPedestal.scale.set(2.2, 0.32, 4.8);
    armorPedestal.position.set(1809.2, 0.16, 1803.2);
    ammuInteriorRoot.add(armorPedestal);

    const crateMat = new THREE.MeshStandardMaterial({ color: 0x36492d, roughness: 0.72, metalness: 0.2 });
    for (let k = 0; k < 3; k++) {
      const vestStand = new THREE.Mesh(shopGeos.box, k === 1 ? mats.gold24k : mats.armorSteel);
      vestStand.scale.set(0.55, 0.72, 0.36);
      vestStand.position.set(1809.2, 1.25, 1801.6 + k * 1.6);
      const post = new THREE.Mesh(shopGeos.cylLow, mats.chrome);
      post.scale.set(0.08, 1.1, 0.08);
      post.position.set(1809.2, 0.75, 1801.6 + k * 1.6);

      const ammoCrate = new THREE.Mesh(shopGeos.box, crateMat);
      ammoCrate.scale.set(0.85, 0.45, 0.55);
      ammoCrate.position.set(1811.4, 0.25, 1801.4 + k * 1.5);
      ammuInteriorRoot.add(vestStand, post, ammoCrate);
    }
    ammuInteriorAABBs.push({ minX: 1808.0, maxX: 1812.4, minZ: 1800.6, maxZ: 1805.8, maxY: 1.8 });

    // 6. 4-LANE LIVE INDOOR SHOOTING GALLERY (`Z = 1796.6` Firing Line -> `Z = 1756` Backstop!)
    const rangeFloor = new THREE.Mesh(shopGeos.box, mats.concreteWall);
    rangeFloor.scale.set(18.2, 0.14, 42.0);
    rangeFloor.position.set(1800, -0.02, 1775.0);
    rangeFloor.receiveShadow = true;

    const rangeCeiling = new THREE.Mesh(shopGeos.box, mats.rangeCeiling);
    rangeCeiling.scale.set(18.4, 0.28, 42.0);
    rangeCeiling.position.set(1800, 4.35, 1775.0);

    const rangeWallW = new THREE.Mesh(shopGeos.box, mats.concreteWall);
    rangeWallW.scale.set(0.45, 4.5, 42.0);
    rangeWallW.position.set(1790.9, 2.15, 1775.0);

    const rangeWallE = new THREE.Mesh(shopGeos.box, mats.concreteWall);
    rangeWallE.scale.set(0.45, 4.5, 42.0);
    rangeWallE.position.set(1809.1, 2.15, 1775.0);

    // Angled Steel Bullet-Trap Backstop at Z = 1755.5
    const backstop = new THREE.Mesh(shopGeos.box, mats.armorSteel);
    backstop.scale.set(18.2, 4.6, 0.8);
    backstop.position.set(1800, 2.15, 1755.5);
    backstop.rotation.x = 0.18;

    ammuInteriorRoot.add(rangeFloor, rangeCeiling, rangeWallW, rangeWallE, backstop);

    // Acoustic Ceiling Baffles & Distance Banners (`10M`, `20M`, `35M`) + Overhead Trolley Rails
    for (const [distLabel, zPos, hexCol] of [
      ['10M • CỰ LY GẦN (x1.0)', 1786.6, '#22c55e'],
      ['20M • CỰ LY TRUNG (x1.5)', 1776.6, '#facc15'],
      ['35M • XẠ THỦ TẦM XA (x2.2)', 1761.6, '#ff3b30']
    ]) {
      const baffle = new THREE.Mesh(shopGeos.box, mats.matteBlack);
      baffle.scale.set(17.8, 0.55, 0.22);
      baffle.position.set(1800, 3.85, zPos);
      ammuInteriorRoot.add(baffle);

      const dTex = getSignTexture(`range_${distLabel}`, distLabel, 'TRƯỜNG BẮN AMMU-NATION', '#0f172a', hexCol, '#ffffff', 512, 96);
      if (dTex) {
        const dSign = new THREE.Mesh(shopGeos.plane, new THREE.MeshBasicMaterial({ map: dTex }));
        dSign.scale.set(5.4, 0.72, 1);
        dSign.position.set(1800, 3.82, zPos + 0.13);
        ammuInteriorRoot.add(dSign);
      }
    }

    // 4 Shooting Booths (`X = 1794, 1798, 1802, 1806`) + Waist-High Firing Barrier at `Z = 1795.4`
    const firingCounter = new THREE.Mesh(shopGeos.box, mats.armorSteel);
    firingCounter.scale.set(17.6, 1.04, 0.65);
    firingCounter.position.set(1800, 0.52, 1795.4);
    ammuInteriorRoot.add(firingCounter);
    // Prevent walking downrange into live bullet lanes while keeping shots above y=1.08 unobstructed!
    ammuInteriorAABBs.push({ minX: 1790.8, maxX: 1809.2, minZ: 1755.0, maxZ: 1795.8, maxY: 1.06 });

    for (const divX of [1792.0, 1796.0, 1800.0, 1804.0, 1808.0]) {
      const divider = new THREE.Mesh(shopGeos.box, mats.ballisticGlass);
      divider.scale.set(0.08, 2.35, 2.2);
      divider.position.set(divX, 1.25, 1796.4);
      ammuInteriorRoot.add(divider);
    }

    const rangeHeaderTex = getSignTexture(
      'ammu_range_header',
      'TRƯỜNG BẮN TÍNH ĐIỂM LIVE RANGE',
      '45 GIÂY • ĐỒNG $500 • BẠC $1,000 • VÀNG +$2,000 & +15% TỐC ĐỘ BẮN/NẠP!',
      '#18181b',
      '#facc15',
      '#ef4444',
      768,
      140
    );
    if (rangeHeaderTex) {
      const rhSign = new THREE.Mesh(
        shopGeos.plane,
        new THREE.MeshStandardMaterial({
          map: rangeHeaderTex,
          emissive: 0xffffff,
          emissiveMap: rangeHeaderTex,
          emissiveIntensity: 0.85
        })
      );
      rhSign.scale.set(11.5, 1.75, 1);
      rhSign.position.set(1800, 4.95, 1788.3);
      ammuInteriorRoot.add(rhSign);
    }

    // Warm Interior PointLights (Active only when player is inside Thần Binh Các!)
    const intLights = new THREE.Group();
    intLights.name = 'ammuInteriorLights';
    for (const [lx, ly, lz, lcol, lint, ldist] of [
      [1800, 5.5, 1804, 0xfff3d6, 2.2, 26],
      [1793, 4.8, 1802, 0xffedd5, 1.6, 18],
      [1800, 3.6, 1785, 0xe0f2fe, 1.8, 24],
      [1800, 3.6, 1766, 0xfef08a, 1.9, 24]
    ]) {
      const pl = new THREE.PointLight(lcol, lint, ldist, 1.5);
      pl.position.set(lx, ly, lz);
      pl.castShadow = false;
      intLights.add(pl);
    }
    ammuInteriorRoot.add(intLights);

    // Interactive Station Coronas inside `(1800, 0, 1800)`
    ammuInteriorRoot.add(makeCoronaMarker(SHOP_COORDS.ammuInteriorExit.x, 0.05, SHOP_COORDS.ammuInteriorExit.z, 0x38bdf8, 1.1, 2.2));
    ammuInteriorRoot.add(makeCoronaMarker(SHOP_COORDS.ammuCounterTrigger.x, 0.05, SHOP_COORDS.ammuCounterTrigger.z, 0xff3b30, 1.15, 2.2));
    ammuInteriorRoot.add(makeCoronaMarker(SHOP_COORDS.ammuArmorTrigger.x, 0.05, SHOP_COORDS.ammuArmorTrigger.z, 0x22c55e, 1.05, 2.1));
    ammuInteriorRoot.add(makeCoronaMarker(SHOP_COORDS.ammuRangeTrigger.x, 0.05, SHOP_COORDS.ammuRangeTrigger.z, 0xfacc15, 1.25, 2.3));

    // Build 9 Pooled Motorized Range Targets (3 per tier: 10m, 20m, 35m)
    const targetTiers = [
      { distMeters: 10, z: 1786.6, mult: 1.0, speed: 2.3 },
      { distMeters: 20, z: 1776.6, mult: 1.5, speed: 3.4 },
      { distMeters: 35, z: 1761.6, mult: 2.2, speed: 4.5 }
    ];

    for (let tIdx = 0; tIdx < targetTiers.length; tIdx++) {
      const tier = targetTiers[tIdx];
      // Overhead trolley beam
      const rail = new THREE.Mesh(shopGeos.box, mats.chrome);
      rail.scale.set(16.8, 0.08, 0.08);
      rail.position.set(1800, 3.25, tier.z);
      ammuInteriorRoot.add(rail);

      for (let slot = 0; slot < 3; slot++) {
        const carriage = new THREE.Group();
        const startX = 1794.5 + slot * 5.5;
        carriage.position.set(startX, 3.20, tier.z);

        const trolleyBox = new THREE.Mesh(shopGeos.box, mats.armorSteel);
        trolleyBox.scale.set(0.36, 0.16, 0.22);
        carriage.add(trolleyBox);

        // Flip pivot hinges downward from y = 0 (folded flat at rotation.x = -Math.PI/2, upright at 0)
        const flipPivot = new THREE.Group();
        flipPivot.rotation.x = -Math.PI * 0.5;
        carriage.add(flipPivot);

        const hangerRod = new THREE.Mesh(shopGeos.box, mats.chrome);
        hangerRod.scale.set(0.06, 0.55, 0.04);
        hangerRod.position.set(0, -0.28, 0);

        const boardMat = new THREE.MeshStandardMaterial({
          map: tex.silhouetteTargetTex || null,
          roughness: 0.65,
          side: THREE.DoubleSide
        });
        boardMat.userData = { ownMaterial: true };

        const boardMesh = new THREE.Mesh(shopGeos.box, boardMat);
        boardMesh.scale.set(0.86, 1.32, 0.04);
        // Board spans y in [-1.88, -0.56] relative to carriage (world y in [1.32, 2.64] -> centered nicely at eye level y=1.55m!)
        boardMesh.position.set(0, -1.22, 0);
        // Shift carriage lower so target center sits right at y = 1.48m!
        carriage.position.y = 2.70;

        flipPivot.add(hangerRod, boardMesh);
        ammuInteriorRoot.add(carriage);

        state.rangeTargets.push({
          id: `rt_${tIdx}_${slot}`,
          tierIdx: tIdx,
          distMeters: tier.distMeters,
          z: tier.z,
          mult: tier.mult,
          baseSpeed: tier.speed,
          carriage,
          flipPivot,
          boardMesh,
          boardMat,
          x: startX,
          dir: slot % 2 === 0 ? 1 : -1,
          minX: 1792.4,
          maxX: 1807.6,
          active: false,
          isCivilian: false,
          upTimeLeft: 0,
          flipAngle: -Math.PI * 0.5
        });
      }
    }

    ammuInteriorRoot.visible = false;
  }

  function enterAmmuNation() {
    const p = ctx.player;
    if (!p || state.doorTeleportCooldown > 0) return false;
    if (p.inCar && ctx.vehicles?.exitVehicle) {
      ctx.vehicles.exitVehicle();
    }

    state.doorTeleportCooldown = 1.1;
    state.inAmmuInterior = true;
    p.inAmmuNation = true;
    ammuInteriorRoot.visible = true;

    p.x = SHOP_COORDS.ammuInteriorSpawn.x;
    p.y = SHOP_COORDS.ammuInteriorSpawn.y;
    p.z = SHOP_COORDS.ammuInteriorSpawn.z;
    p.vx = 0;
    p.vy = 0;
    p.vz = 0;
    p.yaw = SHOP_COORDS.ammuInteriorSpawn.yaw;
    if (p.mesh) {
      p.mesh.visible = true;
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.y = p.yaw;
    }
    if (ctx.engine) {
      ctx.engine.camYaw = 0;
      ctx.engine.camPitch = -0.08;
    }
    shopAudio.playGunCock();
    notifyPlayer('Chào mừng tới Thần Binh Các! Tới Quầy Vũ Khí mua súng/phụ kiện hoặc ra Trường Bắn 4 Làn phía sau!', 4.2);
    return true;
  }

  function exitAmmuNation() {
    const p = ctx.player;
    if (!p || state.doorTeleportCooldown > 0) return false;
    if (state.rangeActive) {
      stopShootingRange(true);
    }
    if (state.modalOpen) {
      closeModal();
    }

    state.doorTeleportCooldown = 1.1;
    state.inAmmuInterior = false;
    p.inAmmuNation = false;
    ammuInteriorRoot.visible = false;

    p.x = SHOP_COORDS.ammuExitStreet.x;
    p.y = SHOP_COORDS.ammuExitStreet.y;
    p.z = SHOP_COORDS.ammuExitStreet.z;
    p.vx = 0;
    p.vy = 0;
    p.vz = 0;
    p.yaw = SHOP_COORDS.ammuExitStreet.yaw;
    if (p.mesh) {
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.y = p.yaw;
    }
    notifyPlayer('Đã rời cửa hàng Thần Binh Các ra Đại lộ Đông.', 2.5);
    return true;
  }

  // ==========================================================================
  // 13. PLAYABLE INDOOR SHOOTING RANGE MINIGAME (`Trường Bắn Tính Điểm` — 45s)
  // ==========================================================================
  const RANGE_MEDAL_THRESHOLDS = {
    bronze: 1500,
    silver: 3200,
    gold: 5500
  };

  function spawnRangeWave() {
    const tex = ensureShopTextures();
    // Ensure at least 4 active targets across 10m, 20m, and 35m lanes
    let activeCount = 0;
    for (let i = 0; i < state.rangeTargets.length; i++) {
      if (state.rangeTargets[i].active) activeCount++;
    }
    const wantSpawn = Math.max(1, 5 - activeCount);
    const candidates = state.rangeTargets.filter((t) => !t.active);

    for (let n = 0; n < wantSpawn && candidates.length > 0; n++) {
      const pickIdx = Math.floor(Math.random() * candidates.length);
      const tgt = candidates.splice(pickIdx, 1)[0];
      tgt.active = true;
      // 14% chance of Civilian No-Shoot Blue Decoy to test trigger discipline!
      tgt.isCivilian = activeCount >= 2 && Math.random() < 0.14;
      tgt.boardMat.map = tgt.isCivilian ? tex.civilianDecoyTex : tex.silhouetteTargetTex;
      tgt.boardMat.needsUpdate = true;
      tgt.upTimeLeft = tgt.isCivilian ? 3.8 : (4.8 + Math.random() * 2.8);
      tgt.dir = Math.random() < 0.5 ? 1 : -1;
    }
  }

  function startShootingRange() {
    const p = ctx.player;
    if (!p) return false;

    if (!state.inAmmuInterior) {
      enterAmmuNation();
    }
    if (state.modalOpen) {
      closeModal();
    }

    // Equip firearm if currently holding melee, and snapshot player ammo so range rounds are 100% free!
    const curW = p.weaponId || p.currentWeapon || 'pistol';
    if (curW === 'unarmed' || curW === 'bat' || curW === 'grenade') {
      const bestGun = arsenalState.ownedWeapons.carbine
        ? 'carbine'
        : arsenalState.ownedWeapons.smg
          ? 'smg'
          : 'pistol';
      ctx.characters?.equipWeapon?.(p, bestGun);
    }

    state.rangeSavedAmmo = {
      ammo: { ...(p.ammo || {}) },
      clip: { ...(p.clip || {}) }
    };
    const activeGun = p.weaponId || 'pistol';
    if (!p.ammo) p.ammo = {};
    if (!p.clip) p.clip = {};
    p.ammo[activeGun] = Math.max(p.ammo[activeGun] || 0, 999);
    p.clip[activeGun] = Math.max(p.clip[activeGun] || 0, 60);

    // Position player at central shooting booth facing North (-Z -> yaw = Math.PI)
    p.x = 1800.0;
    p.y = 0.05;
    p.z = 1796.8;
    p.vx = 0;
    p.vz = 0;
    p.yaw = Math.PI;
    if (p.mesh) {
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.y = Math.PI;
    }
    if (ctx.engine) {
      ctx.engine.camYaw = 0;
      ctx.engine.camPitch = -0.03;
    }

    state.rangeActive = true;
    state.rangeTimer = state.rangeDuration;
    state.rangeScore = 0;
    state.rangeStreak = 0;
    state.rangeMaxStreak = 0;
    state.rangeShotsFired = 0;
    state.rangeShotsHit = 0;
    state.rangeHeadshots = 0;
    state.rangeWaveTimer = 0.2;
    state.rangePopups.length = 0;

    for (const tgt of state.rangeTargets) {
      tgt.active = false;
      tgt.flipAngle = -Math.PI * 0.5;
      tgt.flipPivot.rotation.x = tgt.flipAngle;
    }

    spawnRangeWave();
    shopAudio.playGunCock();
    updateRangeHUD(true);
    notifyPlayer('🎯 BẮT ĐẦU TRƯỜNG BẮN 45 GIÂY! Bắn trúng Hồng Tâm & Đầu Bia 10m/20m/35m để giành Huy Chương Vàng!', 4.2);
    return true;
  }

  function evaluateRangeShotRay() {
    if (!state.rangeActive || !ctx.engine?.camera) return;
    state.rangeShotsFired++;

    // Prevent Thiên Đình Chấp Pháp crime heat while firing inside the legal indoor shooting range!
    if (ctx.gameplay?.wanted && ctx.gameplay.wanted.stars === 0) {
      ctx.gameplay.wanted.heat = 0;
    }

    const cam = ctx.engine.camera;
    cam.updateMatrixWorld();
    cam.getWorldPosition(_vA);
    cam.getWorldDirection(_vB).normalize();

    if (_vB.z > -0.15) {
      // Fired away from downrange lanes
      state.rangeStreak = 0;
      return;
    }

    // Sort active targets nearest-to-furthest along ray so front target absorbs bullet first
    let hitTarget = null;
    let hitZone = 'body';
    let bestRayT = Infinity;
    let hitWorldX = 0;
    let hitWorldY = 0;
    let hitWorldZ = 0;

    for (let i = 0; i < state.rangeTargets.length; i++) {
      const tgt = state.rangeTargets[i];
      if (!tgt.active || tgt.flipAngle < -0.55) continue;

      const tPlane = (tgt.z - _vA.z) / _vB.z;
      if (tPlane <= 1.0 || tPlane >= bestRayT) continue;

      const ix = _vA.x + _vB.x * tPlane;
      const iy = _vA.y + _vB.y * tPlane;

      // Board center is at (tgt.x, carriage.y - 1.22 = 1.48m), half-width 0.44m, half-height 0.66m (y in [0.82, 2.14])
      const dx = ix - tgt.x;
      const dy = iy - 1.48;
      if (Math.abs(dx) <= 0.46 && Math.abs(dy) <= 0.68) {
        bestRayT = tPlane;
        hitTarget = tgt;
        hitWorldX = ix;
        hitWorldY = iy;
        hitWorldZ = tgt.z;

        // Head zone sits near top of silhouette (iy in [1.76, 2.10], |dx| <= 0.19)
        if (iy >= 1.74 && Math.abs(dx) <= 0.21) {
          hitZone = 'headshot';
        } else if (Math.hypot(dx, iy - 1.38) <= 0.19) {
          hitZone = 'bullseye';
        } else {
          hitZone = 'body';
        }
      }
    }

    if (!hitTarget) {
      state.rangeStreak = 0;
      return;
    }

    hitTarget.active = false;
    ctx.characters?.spawnParticles?.(hitWorldX, hitWorldY, hitWorldZ + 0.08, 'sparks', 8, 5.5);

    if (hitTarget.isCivilian) {
      state.rangeStreak = 0;
      state.rangeScore = Math.max(0, state.rangeScore - 250);
      shopAudio.playStickyBeep(false);
      pushRangePopup('-250 BẮN NHẦM BIA DÂN THƯỜNG!', '#ef4444');
      return;
    }

    state.rangeShotsHit++;
    state.rangeStreak++;
    if (state.rangeStreak > state.rangeMaxStreak) state.rangeMaxStreak = state.rangeStreak;
    if (hitZone === 'headshot') state.rangeHeadshots++;

    const streakMult = Math.min(5, 1 + Math.floor((state.rangeStreak - 1) / 3));
    const basePts = hitZone === 'headshot' ? 150 : hitZone === 'bullseye' ? 100 : 60;
    const totalPts = Math.round(basePts * hitTarget.mult * streakMult);
    state.rangeScore += totalPts;

    ctx.ui?.triggerHitmarker?.(hitZone === 'headshot');
    shopAudio.playTargetPing(hitZone === 'headshot');

    const tag = hitZone === 'headshot'
      ? `HEADSHOT ${hitTarget.distMeters}M! +${totalPts}`
      : hitZone === 'bullseye'
        ? `HỒNG TÂM ${hitTarget.distMeters}M! +${totalPts}`
        : `TRÚNG ĐÍCH +${totalPts}`;
    pushRangePopup(
      streakMult > 1 ? `${tag} (Combo x${streakMult})` : tag,
      hitZone === 'headshot' ? '#facc15' : hitZone === 'bullseye' ? '#38bdf8' : '#4ade80'
    );
  }

  function stopShootingRange(aborted = false) {
    if (!state.rangeActive) return;
    state.rangeActive = false;

    const p = ctx.player;
    if (p && state.rangeSavedAmmo) {
      p.ammo = { ...state.rangeSavedAmmo.ammo };
      p.clip = { ...state.rangeSavedAmmo.clip };
      state.rangeSavedAmmo = null;
    }

    for (const tgt of state.rangeTargets) {
      tgt.active = false;
      tgt.flipAngle = -Math.PI * 0.5;
      tgt.flipPivot.rotation.x = tgt.flipAngle;
    }

    updateRangeHUD(false);
    if (aborted) return;

    const score = state.rangeScore;
    if (score > arsenalState.rangeBestScore) {
      arsenalState.rangeBestScore = score;
    }

    let medalLabel = 'CHƯA ĐẠT HUY CHƯƠNG';
    let cashReward = 0;

    if (score >= RANGE_MEDAL_THRESHOLDS.gold) {
      medalLabel = '🥇 HUY CHƯƠNG VÀNG XẠ THỦ';
      cashReward = 2000;
      arsenalState.rangeMedals.bronze = true;
      arsenalState.rangeMedals.silver = true;
      arsenalState.rangeMedals.gold = true;
      if (!arsenalState.rangeReloadFirePerk) {
        arsenalState.rangeReloadFirePerk = true;
        applyWeaponAttachmentsAndStatsToPlayer();
      }
      shopAudio.playMedalFanfare('gold');
      ctx.ui?.showBanner?.('HUY CHƯƠNG VÀNG TRƯỜNG BẮN', `${score.toLocaleString()} ĐIỂM • +$2,000 & +15% TỐC ĐỘ BẮN VĨNH VIỄN!`, 'passed');
    } else if (score >= RANGE_MEDAL_THRESHOLDS.silver) {
      medalLabel = '🥈 HUY CHƯƠNG BẠC';
      cashReward = 1000;
      arsenalState.rangeMedals.bronze = true;
      arsenalState.rangeMedals.silver = true;
      if (p) p.armor = Math.max(p.armor || 0, 100);
      shopAudio.playMedalFanfare('silver');
      ctx.ui?.showBanner?.('HUY CHƯƠNG BẠC TRƯỜNG BẮN', `${score.toLocaleString()} ĐIỂM • +$1,000 & GIÁP CHỐNG ĐẠN!`, 'passed');
    } else if (score >= RANGE_MEDAL_THRESHOLDS.bronze) {
      medalLabel = '🥉 HUY CHƯƠNG ĐỒNG';
      cashReward = 500;
      arsenalState.rangeMedals.bronze = true;
      shopAudio.playMedalFanfare('bronze');
      ctx.ui?.showBanner?.('HUY CHƯƠNG ĐỒNG TRƯỜNG BẮN', `${score.toLocaleString()} ĐIỂM • +$500 TIỀN THƯỞNG!`, 'passed');
    } else {
      notifyPlayer(`Kết thúc lượt bắn: ${score.toLocaleString()} điểm (Cần 1,500đ Đồng / 3,200đ Bạc / 5,500đ Vàng). Thử lại ngay!`, 4.5);
    }

    if (cashReward > 0 && p) {
      const nextCash = Math.max(0, (Number(p.cash) || 0) + cashReward);
      if (ctx?.antiCheat?.commitCash) ctx.antiCheat.commitCash(nextCash);
      else p.cash = nextCash;
      notifyPlayer(`${medalLabel}! Điểm số: ${score.toLocaleString()} • Thưởng +${formatMoney(cashReward)}${arsenalState.rangeReloadFirePerk ? ' • Đã kích hoạt Perk +15% tốc độ bắn/nạp!' : ''}`, 5.5);
    }

    persistArsenal();
  }

  let prevRangePlayerCooldown = 0;

  function updateShootingRange(dt) {
    if (!state.rangeActive) return;
    const p = ctx.player;
    if (!p || !state.inAmmuInterior) {
      stopShootingRange(true);
      return;
    }

    // Keep range ammo topped up indefinitely during the 45s round
    const curW = p.weaponId || 'pistol';
    if (p.ammo) p.ammo[curW] = 999;
    if (p.clip && (p.clip[curW] ?? 10) < 5) p.clip[curW] = 30;

    // Keep player inside the firing booth row so every shot aligns downrange
    p.x = clamp(p.x, 1793.2, 1806.8);
    p.z = clamp(p.z, 1796.1, 1798.2);
    if (p.mesh) {
      p.mesh.position.x = p.x;
      p.mesh.position.z = p.z;
    }

    // Detect exact frame player fires a shot (`p.fireCooldown` jumps upward)
    const curCd = Number(p.fireCooldown) || 0;
    if (curCd > prevRangePlayerCooldown + 0.02) {
      evaluateRangeShotRay();
    }
    prevRangePlayerCooldown = curCd;

    state.rangeTimer -= dt;
    if (state.rangeTimer <= 0) {
      state.rangeTimer = 0;
      stopShootingRange(false);
      return;
    }

    state.rangeWaveTimer -= dt;
    if (state.rangeWaveTimer <= 0) {
      state.rangeWaveTimer = 1.35;
      spawnRangeWave();
    }

    // Speed scales up 35% in the final 15 seconds for thrilling Gold-Medal climax!
    const paceBoost = state.rangeTimer < 15 ? 1.35 : 1.0;

    for (let i = 0; i < state.rangeTargets.length; i++) {
      const tgt = state.rangeTargets[i];
      const desiredFlip = tgt.active ? 0.0 : -Math.PI * 0.5;
      tgt.flipAngle = smoothDamp(tgt.flipAngle, desiredFlip, 14.0, dt);
      tgt.flipPivot.rotation.x = tgt.flipAngle;

      if (tgt.active) {
        tgt.x += tgt.dir * tgt.baseSpeed * paceBoost * dt;
        if (tgt.x >= tgt.maxX) {
          tgt.x = tgt.maxX;
          tgt.dir = -1;
        } else if (tgt.x <= tgt.minX) {
          tgt.x = tgt.minX;
          tgt.dir = 1;
        }
        tgt.carriage.position.x = tgt.x;

        tgt.upTimeLeft -= dt;
        if (tgt.upTimeLeft <= 0) {
          tgt.active = false;
          if (!tgt.isCivilian) {
            state.rangeStreak = 0;
          }
        }
      }
    }

    updateRangeHUD(true);
  }

  // ==========================================================================
  // 14. 3D WEAPON ATTACHMENTS, SKINS, 3D LASER SIGHT, HEAVY SNIPER & STICKY C4
  // ==========================================================================
  const weaponSkinMatCache = new Map();

  function getWeaponSkinMaterial(skinId) {
    if (weaponSkinMatCache.has(skinId)) return weaponSkinMatCache.get(skinId);
    const tex = ensureShopTextures();
    const spec = WEAPON_SKINS.find((s) => s.id === skinId) || WEAPON_SKINS[0];

    const mat = new THREE.MeshPhysicalMaterial({
      color: spec.hex,
      metalness: spec.metalness,
      roughness: spec.roughness,
      clearcoat: spec.engraved ? 0.92 : 0.25,
      clearcoatRoughness: 0.08,
      normalMap: spec.engraved ? (tex.goldEngraveNormal || null) : null,
      normalScale: new THREE.Vector2(0.42, 0.42),
      emissive: spec.emissiveHex || 0x000000,
      emissiveIntensity: spec.emissiveHex ? 0.38 : 0,
      envMapIntensity: spec.engraved ? 2.15 : 1.15
    });
    weaponSkinMatCache.set(skinId, mat);
    return mat;
  }

  function applyWeaponAttachmentsAndStatsToPlayer() {
    const p = ctx.player;
    const defs = ctx.characters?.weaponDefs;
    const mats = ensureShopMaterials();

    // 1. Update live weaponDefs stats cleanly from saved base snapshots
    if (defs) {
      const perkMul = arsenalState.rangeReloadFirePerk ? 0.85 : 1.0; // +15% faster fire/reload rate!
      for (const wKey of ['pistol', 'smg', 'carbine', 'shotgun', 'grenade']) {
        const d = defs[wKey];
        if (!d) continue;
        if (!d._ammuBaseSaved) {
          d._ammuBaseSaved = true;
          d._baseCooldown = d.cooldown;
          d._baseClipSize = d.clipSize;
          d._baseSpread = d.spread;
          d._baseDamage = d.damage;
        }
        const att = arsenalState.attachments[wKey] || {};
        const magMul = att.drum_mag ? 2 : 1;
        let spreadMul = 1.0;
        if (att.suppressor) spreadMul *= 0.82;
        if (att.holo_scope) spreadMul *= 0.75;
        if (att.laser_sight) spreadMul *= 0.84;

        d.cooldown = Number((d._baseCooldown * perkMul).toFixed(4));
        d.cd = d.cooldown;
        if (Number.isFinite(d._baseClipSize) && d._baseClipSize > 0) {
          d.clipSize = d._baseClipSize * magMul;
          d.magSize = d.clipSize;
        }
        d.spread = Number((d._baseSpread * spreadMul).toFixed(4));
        d.damage = Math.round(d._baseDamage * (att.suppressor ? 1.04 : 1.0));
        d.dmg = d.damage;
      }
    }

    if (p) {
      p.maxArmor = arsenalState.maxArmorCap || 100;
    }

    // 2. Mount 3D Attachments, Skins & Heavy Sniper Mk II onto `ctx.player.rig.weaponSocket`
    const rig = p?.rig;
    const socket = rig?.weaponSocket;
    const models = socket?.userData?.models;
    if (!socket || !models) return;

    // Ensure bespoke `.50 BMG Heavy Sniper Mk II` 3D model exists inside weaponSocket!
    if (!models.heavy_sniper) {
      const snpGrp = buildMiniatureDisplayGun('sniper', mats.armorSteel, mats.matteBlack);
      snpGrp.name = 'heavySniperModel';
      snpGrp.position.set(0, 0.068, 0.22);
      snpGrp.userData.muzzle = new THREE.Vector3(0, 0.088, 1.18);
      snpGrp.userData.breech = new THREE.Vector3(-0.032, 0.085, 0.16);
      snpGrp.visible = false;
      socket.add(snpGrp);
      models.heavy_sniper = snpGrp;
    }

    for (const wKey of ['pistol', 'smg', 'carbine', 'shotgun', 'heavy_sniper']) {
      const grp = models[wKey];
      if (!grp) continue;
      const att = arsenalState.attachments[wKey] || {};

      // Apply Luxury Weapon Finish onto base receiver/slide/barrel meshes
      const skinId = att.skin || 'gunmetal';
      grp.traverse((node) => {
        if (!node.isMesh || node.parent?.name === 'ammuAttachGroup') return;
        if (!node.userData._origWeaponMat) {
          node.userData._origWeaponMat = node.material;
        }
        node.material = skinId === 'gunmetal'
          ? node.userData._origWeaponMat
          : getWeaponSkinMaterial(skinId);
      });

      // Rebuild 3D Attachment Sub-Group (Suppressor, Drum Mag, Laser Module, Holo Optic)
      let attGrp = grp.getObjectByName('ammuAttachGroup');
      if (!attGrp) {
        attGrp = new THREE.Group();
        attGrp.name = 'ammuAttachGroup';
        grp.add(attGrp);
      } else {
        disposeGroupChildren(attGrp);
      }

      const muzzlePos = grp.userData?.muzzle || new THREE.Vector3(0, 0.065, 0.35);

      if (att.suppressor) {
        const supLen = wKey === 'pistol' ? 0.16 : 0.22;
        const supRad = wKey === 'shotgun' ? 0.044 : 0.034;
        const sup = new THREE.Mesh(shopGeos.cyl, mats.carbon);
        sup.scale.set(supRad, supLen, supRad);
        sup.rotation.x = Math.PI * 0.5;
        sup.position.set(muzzlePos.x, muzzlePos.y, muzzlePos.z + supLen * 0.42);
        attGrp.add(sup);
      }

      if (att.drum_mag) {
        const drumZ = wKey === 'pistol' ? 0.02 : wKey === 'smg' ? 0.09 : 0.13;
        const drumL = new THREE.Mesh(shopGeos.cyl, mats.matteBlack);
        drumL.scale.set(0.085, 0.055, 0.085);
        drumL.rotation.x = Math.PI * 0.5;
        drumL.position.set(0.032, -0.065, drumZ);

        const drumR = new THREE.Mesh(shopGeos.cyl, mats.matteBlack);
        drumR.scale.set(0.085, 0.055, 0.085);
        drumR.rotation.x = Math.PI * 0.5;
        drumR.position.set(-0.032, -0.065, drumZ);

        const drumFront = new THREE.Mesh(shopGeos.cylLow, mats.gold24k);
        drumFront.scale.set(0.04, 0.06, 0.04);
        drumFront.rotation.x = Math.PI * 0.5;
        drumFront.position.set(0, -0.065, drumZ + 0.005);
        attGrp.add(drumL, drumR, drumFront);
      }

      if (att.laser_sight) {
        const peqBox = new THREE.Mesh(shopGeos.box, mats.armorSteel);
        peqBox.scale.set(0.036, 0.028, 0.085);
        peqBox.position.set(0.024, muzzlePos.y - 0.015, muzzlePos.z - 0.12);
        attGrp.add(peqBox);
      }

      if (att.holo_scope && wKey !== 'heavy_sniper') {
        const scopeBase = new THREE.Mesh(shopGeos.box, mats.matteBlack);
        scopeBase.scale.set(0.038, 0.045, 0.095);
        scopeBase.position.set(0, muzzlePos.y + 0.048, 0.09);

        const lens = new THREE.Mesh(shopGeos.box, mats.ballisticGlass);
        lens.scale.set(0.032, 0.034, 0.012);
        lens.position.set(0, muzzlePos.y + 0.055, 0.12);
        attGrp.add(scopeBase, lens);
      }
    }
  }

  function ensureLaserBeamMeshes() {
    if (laserBeamMesh) return;
    // Unit cylinder along +Z from 0 to 1
    const beamGeo = new THREE.CylinderGeometry(0.0045, 0.0045, 1.0, 6, 1, true);
    beamGeo.translate(0, 0.5, 0);
    beamGeo.rotateX(Math.PI * 0.5);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xff1e38,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    laserBeamMesh = new THREE.Mesh(beamGeo, beamMat);
    laserBeamMesh.frustumCulled = false;
    laserBeamMesh.visible = false;

    const dotMat = new THREE.MeshBasicMaterial({
      color: 0xff3b30,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    laserDotMesh = new THREE.Mesh(shopGeos.sphere, dotMat);
    laserDotMesh.scale.setScalar(0.075);
    laserDotMesh.frustumCulled = false;
    laserDotMesh.visible = false;

    shopsRoot.add(laserBeamMesh, laserDotMesh);
  }

  function update3DLaserSightAndSpecialWeapons(dt, elapsed) {
    ensureLaserBeamMeshes();
    const p = ctx.player;
    const inp = ctx.input || {};
    if (!p || p.isDead || p.isBusted || state.modalOpen) {
      laserBeamMesh.visible = false;
      laserDotMesh.visible = false;
      updateSniperScopeOverlay(false);
      return;
    }

    // 1. Toggle Heavy Sniper `.50 BMG` Mk II via `[8]` key when unlocked!
    const key8Down = Boolean(inp.keys?.Digit8 || inp.keys?.Numpad8);
    if (key8Down && !state.prevKey8 && arsenalState.ownedWeapons.heavy_sniper && !p.inCar) {
      state.sniperEquipped = !state.sniperEquipped;
      shopAudio.playGunCock();
      notifyPlayer(
        state.sniperEquipped
          ? `🔭 Đã rút Súng Bắn Tỉa Hạng Nặng .50 BMG (${arsenalState.sniperAmmo} viên) — Giữ Chuột Phải để ngắm Zoom xa!`
          : 'Đã cất Súng Bắn Tỉa .50 BMG về sau lưng.',
        3.0
      );
    }
    state.prevKey8 = key8Down;

    // Auto-yield sniper mode if user switches slot on Weapon Wheel or enters car
    if (state.sniperEquipped && (p.inCar || inp.wheelOpen)) {
      state.sniperEquipped = false;
    }

    const models = p.rig?.weaponSocket?.userData?.models;
    if (models?.heavy_sniper) {
      if (state.sniperEquipped && !p.inCar) {
        for (const k of Object.keys(models)) {
          if (models[k]) models[k].visible = k === 'heavy_sniper';
        }
      } else if (models.heavy_sniper.visible) {
        models.heavy_sniper.visible = false;
      }
    }

    // Fire Heavy Sniper `.50 BMG` hitscan armor-piercing round when equipped!
    const isAiming = Boolean(p.isAiming || inp.aim);
    updateSniperScopeOverlay(state.sniperEquipped && isAiming && !p.inCar);

    if (state.sniperEquipped && !p.inCar && (inp.fireJustPressed || (inp.fire && (p._sniperCd || 0) <= 0))) {
      if ((p._sniperCd || 0) <= 0) {
        if (arsenalState.sniperAmmo > 0 || state.rangeActive) {
          if (!state.rangeActive) {
            arsenalState.sniperAmmo = Math.max(0, arsenalState.sniperAmmo - 1);
            persistArsenal();
          }
          p._sniperCd = arsenalState.rangeReloadFirePerk ? 0.68 : 0.82;
          p.fireCooldown = p._sniperCd;
          fireHeavySniperHitscan();
        } else {
          p._sniperCd = 0.5;
          notifyPlayer('Hết đạn .50 BMG! Hãy ghé Thần Binh Các mua thêm đạn bắn tỉa.', 2.8);
        }
      }
    }
    if ((p._sniperCd || 0) > 0) {
      p._sniperCd = Math.max(0, p._sniperCd - dt);
    }

    // 2. Suppressor Stealth Crime-Heat Dampener on suppressed weapons
    const activeWKey = state.sniperEquipped ? 'heavy_sniper' : (p.weaponId || 'pistol');
    const activeAtt = arsenalState.attachments[activeWKey];
    if (activeAtt?.suppressor && p._recentFireTimer > 0.35 && ctx.gameplay?.wanted) {
      if (ctx.gameplay.wanted.stars === 0 && ctx.gameplay.wanted.heat > 0) {
        ctx.gameplay.wanted.heat = Math.max(0, ctx.gameplay.wanted.heat - 18 * dt);
      }
    }

    // 3. Live 3D Tactical Laser Sight Beam in World Space!
    const showLaser = Boolean(
      activeAtt?.laser_sight &&
      (isAiming || p._recentFireTimer > 0.05) &&
      activeWKey !== 'unarmed' &&
      activeWKey !== 'bat' &&
      ctx.engine?.getAimRay
    );

    if (showLaser) {
      const ray = ctx.engine.getAimRay();
      const wModel = models?.[activeWKey];
      if (ray?.targetPoint && wModel) {
        p.rig.updateMatrixWorld(true);
        _vA.copy(wModel.userData?.muzzle || _vC.set(0, 0.065, 0.35));
        wModel.localToWorld(_vA);

        _vB.copy(ray.targetPoint);
        _vC.subVectors(_vB, _vA);
        const beamLen = _vC.length();

        if (beamLen > 0.25 && beamLen < 160) {
          const colSpec = LASER_COLORS.find((c) => c.id === activeAtt.laserColor) || LASER_COLORS[0];
          laserBeamMesh.material.color.setHex(colSpec.hex);
          laserDotMesh.material.color.setHex(colSpec.hex);

          laserBeamMesh.position.copy(_vA);
          laserBeamMesh.lookAt(_vB);
          laserBeamMesh.scale.set(1, 1, beamLen);
          laserBeamMesh.visible = true;

          laserDotMesh.position.copy(_vB);
          laserDotMesh.scale.setScalar(0.065 + Math.sin(elapsed * 24) * 0.015);
          laserDotMesh.visible = true;
        } else {
          laserBeamMesh.visible = false;
          laserDotMesh.visible = false;
        }
      } else {
        laserBeamMesh.visible = false;
        laserDotMesh.visible = false;
      }
    } else {
      laserBeamMesh.visible = false;
      laserDotMesh.visible = false;
    }

    // 4. Sticky Bomb C4 Toss (`[X]`) & Remote Chain-Reaction Detonation (`[Z]`)!
    const keyX = Boolean(inp.keys?.KeyX);
    const keyZ = Boolean(inp.keys?.KeyZ);

    if (keyX && !state.prevKeyX && !inp.phoneOpen && !inp.wheelOpen && !(p.inCar && p.inCar.type === 'zentorno')) {
      tossStickyBombC4();
    }
    if (keyZ && !state.prevKeyZ && !inp.phoneOpen && !inp.wheelOpen) {
      detonateStickyBombs();
    }
    state.prevKeyX = keyX;
    state.prevKeyZ = keyZ;

    updatePlantedStickyBombs(dt, elapsed);
  }

  function fireHeavySniperHitscan() {
    const p = ctx.player;
    if (!p || !ctx.engine?.camera) return;

    ctx.audio?.playWeaponShot?.('shotgun');
    shopAudio.playBackfirePop(1.15);
    ctx.engine.addShake?.(0.28);

    if (state.rangeActive) {
      evaluateRangeShotRay();
      return;
    }

    const cam = ctx.engine.camera;
    cam.updateMatrixWorld();
    cam.getWorldPosition(_vA);
    cam.getWorldDirection(_vB).normalize();

    const maxDist = 145.0;
    let bestDist = maxDist;
    let hitEntity = null;
    let hitCar = null;
    let isHead = false;

    // Check NPCs & Cops along 145m ray
    const gp = ctx.gameplay;
    const pools = [gp?.cops, gp?.peds, gp?.mission?.enemies];
    for (const arr of pools) {
      if (!Array.isArray(arr)) continue;
      for (let i = 0; i < arr.length; i++) {
        const npc = arr[i];
        if (!npc || npc.dead || (npc.hp ?? 100) <= 0) continue;
        const nx = npc.x ?? 0;
        const ny = (npc.y ?? 0) + 1.05;
        const nz = npc.z ?? 0;
        _vC.set(nx - _vA.x, ny - _vA.y, nz - _vA.z);
        const proj = _vC.dot(_vB);
        if (proj < 1.0 || proj > bestDist) continue;
        _vD.copy(_vA).addScaledVector(_vB, proj);
        const radDist = Math.hypot(_vD.x - nx, _vD.z - nz);
        const dy = _vD.y - (npc.y ?? 0);
        if (radDist < 0.58 && dy >= 0.0 && dy <= 1.95) {
          bestDist = proj;
          hitEntity = npc;
          hitCar = null;
          isHead = dy >= 1.46;
        }
      }
    }

    // Check Vehicles along ray
    const vList = ctx.vehicles?.list || [];
    for (let i = 0; i < vList.length; i++) {
      const car = vList[i];
      if (!car || car.destroyed || car === p.inCar) continue;
      _vC.set(car.x - _vA.x, (car.y + 0.75) - _vA.y, car.z - _vA.z);
      const proj = _vC.dot(_vB);
      if (proj < 1.5 || proj > bestDist) continue;
      _vD.copy(_vA).addScaledVector(_vB, proj);
      if (Math.hypot(_vD.x - car.x, _vD.z - car.z) < 1.85 && Math.abs(_vD.y - (car.y + 0.75)) < 1.15) {
        bestDist = proj;
        hitCar = car;
        hitEntity = null;
      }
    }

    _vD.copy(_vA).addScaledVector(_vB, bestDist);
    ctx.characters?.spawnParticles?.(_vD.x, _vD.y, _vD.z, hitEntity ? 'blood' : 'sparks', 12, 7.5);

    if (hitEntity) {
      hitEntity.hitByPlayer = true;
      hitEntity.hp = Math.max(0, (hitEntity.hp ?? 100) - (isHead ? 350 : 185));
      ctx.ui?.triggerHitmarker?.(true);
    } else if (hitCar) {
      hitCar._damagedByPlayer = true;
      hitCar._lastAttacker = p;
      ctx.vehicles?.damageVehicle?.(hitCar, 165, p, _vD);
      ctx.ui?.triggerHitmarker?.(false);
    }
  }

  function tossStickyBombC4() {
    const p = ctx.player;
    if (!p || !arsenalState.ownedWeapons.sticky_bomb) return false;
    if (arsenalState.stickyBombCount <= 0) {
      notifyPlayer('Bạn đã dùng hết Bom Dính C4! Ghé Thần Binh Các để mua thêm gói C4.', 2.8);
      return false;
    }
    if (state.plantedStickyBombs.length >= 8) {
      detonateStickyBombs();
      return true;
    }

    arsenalState.stickyBombCount--;
    persistArsenal();

    const mats = ensureShopMaterials();
    const c4Grp = new THREE.Group();

    const pack = new THREE.Mesh(shopGeos.box, mats.ConcreteWall || mats.armorSteel);
    pack.scale.set(0.16, 0.08, 0.24);
    const tape = new THREE.Mesh(shopGeos.box, mats.redAccent);
    tape.scale.set(0.17, 0.085, 0.05);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xff1e2d });
    ledMat.userData = { ownMaterial: true };
    const led = new THREE.Mesh(shopGeos.sphere, ledMat);
    led.scale.setScalar(0.045);
    led.position.set(0, 0.055, 0.04);

    c4Grp.add(pack, tape, led);
    stickyBombGroup.add(c4Grp);

    let dirX = Math.sin(p.yaw || 0);
    let dirY = 0.28;
    let dirZ = Math.cos(p.yaw || 0);
    if (ctx.engine?.getAimRay) {
      const ray = ctx.engine.getAimRay();
      if (ray?.dir) {
        dirX = ray.dir.x;
        dirY = clamp(ray.dir.y + 0.22, -0.25, 0.78);
        dirZ = ray.dir.z;
      }
    }
    const len = Math.hypot(dirX, dirY, dirZ) || 1;
    const speed = 19.5;

    const sx = p.x + (dirX / len) * 0.75;
    const sy = (p.y || 0) + 1.35;
    const sz = p.z + (dirZ / len) * 0.75;
    c4Grp.position.set(sx, sy, sz);

    state.plantedStickyBombs.push({
      mesh: c4Grp,
      ledMat,
      x: sx,
      y: sy,
      z: sz,
      vx: (dirX / len) * speed + (p.vx || 0) * 0.4,
      vy: (dirY / len) * speed + 2.2,
      vz: (dirZ / len) * speed + (p.vz || 0) * 0.4,
      stuck: false,
      attachedCar: null,
      localOffset: new THREE.Vector3(),
      beepTimer: 0.4
    });

    shopAudio.playStickyBeep(false);
    notifyPlayer(`💣 Đã ném Bom Dính C4 (Còn ${arsenalState.stickyBombCount} quả) — Nhấn [Z] để kích nổ từ xa!`, 2.6);
    return true;
  }

  function detonateStickyBombs() {
    if (state.plantedStickyBombs.length === 0) return false;
    shopAudio.playStickyBeep(true);

    const bombs = state.plantedStickyBombs.splice(0, state.plantedStickyBombs.length);
    bombs.forEach((b, idx) => {
      const triggerBlast = () => {
        if (b.mesh.parent) b.mesh.parent.remove(b.mesh);
        b.ledMat?.dispose?.();
        ctx.characters?.spawnExplosion?.(b.x, b.y + 0.15, b.z, 1.55, ctx, true);
      };
      if (idx === 0 || typeof setTimeout === 'undefined') {
        triggerBlast();
      } else {
        setTimeout(triggerBlast, idx * 110);
      }
    });
    return true;
  }

  function updatePlantedStickyBombs(dt, elapsed) {
    if (state.plantedStickyBombs.length === 0) return;
    const vList = ctx.vehicles?.list || [];

    for (let i = 0; i < state.plantedStickyBombs.length; i++) {
      const b = state.plantedStickyBombs[i];

      // Blinking C4 armed beacon
      const blinkOn = Math.sin(elapsed * 14 + i * 1.7) > 0;
      b.ledMat.color.setHex(blinkOn ? 0xff1e2d : 0x3b070b);

      if (b.stuck) {
        if (b.attachedCar && !b.attachedCar.destroyed && b.attachedCar.chassis) {
          b.attachedCar.chassis.updateMatrixWorld(true);
          _vA.copy(b.localOffset);
          b.attachedCar.chassis.localToWorld(_vA);
          b.x = _vA.x;
          b.y = _vA.y;
          b.z = _vA.z;
          b.mesh.position.copy(_vA);
        }
        continue;
      }

      // Ballistic arc flight until sticking onto a car, building AABB, or ground!
      b.vy -= 22.0 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      b.mesh.rotation.x += 8 * dt;
      b.mesh.rotation.z += 5 * dt;

      // Check vehicle stick
      for (let v = 0; v < vList.length; v++) {
        const car = vList[v];
        if (!car || car.destroyed || car === ctx.player?.inCar) continue;
        if (Math.hypot(b.x - car.x, b.z - car.z) < 1.65 && Math.abs(b.y - (car.y + 0.7)) < 0.95) {
          b.stuck = true;
          b.attachedCar = car;
          car.chassis.updateMatrixWorld(true);
          b.localOffset.set(b.x, b.y, b.z);
          car.chassis.worldToLocal(b.localOffset);
          shopAudio.playStickyBeep(true);
          break;
        }
      }

      if (!b.stuck) {
        const gY = ctx.world?.getGroundHeight ? ctx.world.getGroundHeight(b.x, b.z) : 0.05;
        const hitWall = ctx.world?.checkLOS && !ctx.world.checkLOS(b.x - b.vx * dt, b.y, b.z - b.vz * dt, b.x, b.y, b.z);
        if (b.y <= gY + 0.05 || hitWall) {
          if (b.y <= gY + 0.05) b.y = gY + 0.05;
          b.stuck = true;
          b.mesh.rotation.set(0, b.mesh.rotation.y, 0);
          shopAudio.playStickyBeep(true);
        }
      }

      b.mesh.position.set(b.x, b.y, b.z);
    }
  }

  // ==========================================================================
  // 15. PONSONBYS / SUBURBAN 3D RIG ACCESSORIES & CUSTOM WARDROBE ENGINE
  // ==========================================================================
  function applyWardrobeToRig(targetRig = null) {
    const rig = targetRig || ctx.player?.rig;
    if (!rig || !rig.joints || !rig.parts) return false;
    const mats = ensureShopMaterials();

    // 1. Base Outfit & Custom Fabric Palette Tailoring
    const outfit = BOUTIQUE_OUTFITS.find((o) => o.id === wardrobeState.outfitId) || BOUTIQUE_OUTFITS[0];
    ctx.characters?.setOutfit?.(rig, outfit.basePreset || 'casual_polo');
    if (ctx.player && rig === ctx.player.rig) {
      ctx.player.outfit = outfit.basePreset || 'casual_polo';
    }

    if (outfit.palette) {
      const pal = outfit.palette;
      const p = rig.parts;
      const cloneTint = (mesh, hex) => {
        if (!mesh || !mesh.material || hex === undefined) return;
        if (!mesh.userData._ponsonbysClonedMat) {
          mesh.material = mesh.material.clone();
          mesh.userData._ponsonbysClonedMat = true;
        }
        mesh.material.color.setHex(hex);
      };

      if (pal.top !== undefined) {
        cloneTint(p.abdomenMesh, pal.top);
        cloneTint(p.chestMesh, pal.top);
        cloneTint(p.bridgeMesh, pal.top);
        cloneTint(p.collarMesh, pal.top);
        cloneTint(p.placketMesh, pal.top);
        cloneTint(p.lapelL, pal.top);
        cloneTint(p.lapelR, pal.top);
        cloneTint(p.armL?.shortSleeve, pal.top);
        cloneTint(p.armR?.shortSleeve, pal.top);
      }
      if (pal.innerTop !== undefined) cloneTint(p.shirtMesh, pal.innerTop);
      if (pal.tieHex !== undefined) cloneTint(p.tieMesh, pal.tieHex);
      if (pal.noTie && p.tieMesh) p.tieMesh.visible = false;
      if (pal.pants !== undefined) {
        cloneTint(p.pelvisMesh, pal.pants);
        cloneTint(p.legL?.thigh, pal.pants);
        cloneTint(p.legL?.calf, pal.pants);
        cloneTint(p.legR?.thigh, pal.pants);
        cloneTint(p.legR?.calf, pal.pants);
      }
      if (pal.shoeUpper !== undefined) {
        cloneTint(p.legL?.shoeUp, pal.shoeUpper);
        cloneTint(p.legR?.shoeUp, pal.shoeUpper);
      }
    }

    // 2. Clear & Rebuild Custom 3D Accessory Sockets on `spine`, `elbowL`, and `head`
    const ensureSocket = (parentNode, socketName) => {
      let grp = parentNode.getObjectByName(socketName);
      if (!grp) {
        grp = new THREE.Group();
        grp.name = socketName;
        parentNode.add(grp);
      } else {
        disposeGroupChildren(grp);
      }
      return grp;
    };

    const spineAcc = ensureSocket(rig.joints.spine, 'ponsonbysSpineAcc');
    const wristAcc = ensureSocket(rig.joints.elbowL, 'ponsonbysWristAcc');
    const headAcc = ensureSocket(rig.joints.head, 'ponsonbysHeadAcc');

    // A. 3D Neck Chains & Pendants (`spineAcc`)
    if (wardrobeState.chainId !== 'none') {
      const chainSpec = BOUTIQUE_CHAINS.find((c) => c.id === wardrobeState.chainId);
      const chainMat = wardrobeState.chainId === 'diamond_dollar' || wardrobeState.chainId === 'military_dogtags'
        ? mats.platinum
        : mats.gold24k;

      const loop = new THREE.Mesh(shopGeos.torus, chainMat);
      loop.scale.set(0.22, 0.26, 0.22);
      loop.position.set(0, 0.405, 0.085);
      loop.rotation.x = 1.08;
      spineAcc.add(loop);

      if (wardrobeState.chainId === 'diamond_dollar' || wardrobeState.chainId === 'emerald_medallion') {
        const gemMat = new THREE.MeshStandardMaterial({
          color: chainSpec?.accentHex || 0x38bdf8,
          emissive: chainSpec?.accentHex || 0x38bdf8,
          emissiveIntensity: 0.75,
          metalness: 0.6,
          roughness: 0.1
        });
        gemMat.userData = { ownMaterial: true };
        const pendant = new THREE.Mesh(shopGeos.octa, gemMat);
        pendant.scale.set(0.065, 0.085, 0.03);
        pendant.position.set(0, 0.315, 0.162);
        spineAcc.add(pendant);
      } else if (wardrobeState.chainId === 'military_dogtags') {
        for (const dx of [-0.015, 0.015]) {
          const tag = new THREE.Mesh(shopGeos.box, mats.chrome);
          tag.scale.set(0.026, 0.045, 0.008);
          tag.position.set(dx, 0.32, 0.158);
          spineAcc.add(tag);
        }
      }
    }

    // B. 3D Luxury Watches (`wristAcc` on Left Forearm/Wrist y = -0.22)
    if (wardrobeState.watchId !== 'none') {
      const wSpec = BOUTIQUE_WATCHES.find((w) => w.id === wardrobeState.watchId) || BOUTIQUE_WATCHES[1];
      const strapMat = wSpec.id === 'crowex_gold' ? mats.gold24k : mats.platinum;
      const dialMat = new THREE.MeshStandardMaterial({
        color: wSpec.dialHex || 0x0f172a,
        emissive: wSpec.emissive ? (wSpec.dialHex || 0x00f5ff) : 0x000000,
        emissiveIntensity: wSpec.emissive ? 1.2 : 0,
        roughness: 0.15,
        metalness: 0.5
      });
      dialMat.userData = { ownMaterial: true };

      const band = new THREE.Mesh(shopGeos.cyl, strapMat);
      band.scale.set(0.095, 0.032, 0.095);
      band.position.set(0, -0.215, 0);

      const dial = new THREE.Mesh(shopGeos.cyl, dialMat);
      dial.scale.set(0.055, 0.016, 0.055);
      dial.rotation.z = Math.PI * 0.5;
      dial.position.set(0.048, -0.215, 0);
      wristAcc.add(band, dial);
    }

    // C. 3D Hats, Helmets & Royal Crowns (`headAcc`)
    const fullHelm = wardrobeState.hatId === 'moto_carbon_helmet' || wardrobeState.hatId === 'nvg_specops_helmet';
    if (rig.parts.hairFadeMesh) {
      if (rig.parts.hairFadeMesh) rig.parts.hairFadeMesh.visible = wardrobeState.hatId === 'none' && wardrobeState.maskId !== 'oni_samurai';
    }
    if (rig.parts.baseballCapGroup) {
      if (rig.parts.baseballCapGroup) rig.parts.baseballCapGroup.visible = wardrobeState.hatId === 'snapback_ls';
    }

    if (wardrobeState.hatId === 'fedora_boss' || wardrobeState.hatId === 'cowboy_magnate') {
      const isCowboy = wardrobeState.hatId === 'cowboy_magnate';
      const hatMat = new THREE.MeshStandardMaterial({
        color: isCowboy ? 0xf8fafc : 0x181b22,
        roughness: 0.65
      });
      hatMat.userData = { ownMaterial: true };

      const brim = new THREE.Mesh(shopGeos.cyl, hatMat);
      brim.scale.set(isCowboy ? 0.38 : 0.31, 0.018, isCowboy ? 0.40 : 0.32);
      brim.position.set(0, 0.19, 0.005);

      const crown = new THREE.Mesh(shopGeos.cyl, hatMat);
      crown.scale.set(0.21, isCowboy ? 0.12 : 0.095, 0.23);
      crown.position.set(0, 0.24, 0);

      const ribbon = new THREE.Mesh(shopGeos.cyl, mats.gold24k);
      ribbon.scale.set(0.216, 0.022, 0.236);
      ribbon.position.set(0, 0.205, 0);
      headAcc.add(brim, crown, ribbon);
    } else if (wardrobeState.hatId === 'moto_carbon_helmet') {
      const shell = new THREE.Mesh(shopGeos.sphere, mats.carbon);
      shell.scale.set(0.255, 0.27, 0.28);
      shell.position.set(0, 0.135, 0.005);

      const visor = new THREE.Mesh(shopGeos.sphere, mats.gold24k);
      visor.scale.set(0.245, 0.13, 0.26);
      visor.position.set(0, 0.135, 0.035);
      headAcc.add(shell, visor);
    } else if (wardrobeState.hatId === 'nvg_specops_helmet') {
      const tacDome = new THREE.Mesh(shopGeos.sphere, mats.armorSteel);
      tacDome.scale.set(0.245, 0.20, 0.26);
      tacDome.position.set(0, 0.175, -0.005);
      headAcc.add(tacDome);

      const nvgLensMat = new THREE.MeshBasicMaterial({ color: 0x22ff66 });
      nvgLensMat.userData = { ownMaterial: true };
      for (const nx of [-0.058, -0.022, 0.022, 0.058]) {
        const tube = new THREE.Mesh(shopGeos.cylLow, mats.matteBlack);
        tube.scale.set(0.026, 0.09, 0.026);
        tube.rotation.x = Math.PI * 0.5;
        tube.position.set(nx, 0.155, 0.145);

        const glow = new THREE.Mesh(shopGeos.cylLow, nvgLensMat);
        glow.scale.set(0.022, 0.01, 0.022);
        glow.rotation.x = Math.PI * 0.5;
        glow.position.set(nx, 0.155, 0.192);
        headAcc.add(tube, glow);
      }
    } else if (wardrobeState.hatId === 'royal_gold_crown') {
      const band = new THREE.Mesh(shopGeos.cyl, mats.gold24k);
      band.scale.set(0.215, 0.065, 0.225);
      band.position.set(0, 0.215, 0);
      headAcc.add(band);

      for (let pIdx = 0; pIdx < 6; pIdx++) {
        const ang = (pIdx / 6) * Math.PI * 2;
        const spike = new THREE.Mesh(shopGeos.solidCone, mats.gold24k);
        spike.scale.set(0.045, 0.075, 0.045);
        spike.position.set(Math.cos(ang) * 0.095, 0.275, Math.sin(ang) * 0.10);
        headAcc.add(spike);
      }
    }

    // D. 3D Aviator Shades & Cyber LED Visors (`headAcc`)
    if (!fullHelm && wardrobeState.shadesId !== 'none') {
      const shSpec = BOUTIQUE_SHADES.find((s) => s.id === wardrobeState.shadesId) || BOUTIQUE_SHADES[1];
      if (wardrobeState.shadesId === 'cyber_led_visor') {
        const visorMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
        visorMat.userData = { ownMaterial: true };
        const bar = new THREE.Mesh(shopGeos.box, visorMat);
        bar.scale.set(0.165, 0.036, 0.035);
        bar.position.set(0, 0.132, 0.112);
        headAcc.add(bar);
      } else {
        const frameMat = shSpec.frameHex === 0xffc300 ? mats.gold24k : mats.chrome;
        const lensMat = new THREE.MeshPhysicalMaterial({
          color: shSpec.lensHex,
          metalness: 0.75,
          roughness: 0.08,
          clearcoat: 1.0
        });
        lensMat.userData = { ownMaterial: true };
        for (const sx of [-0.038, 0.038]) {
          const lens = new THREE.Mesh(shopGeos.box, lensMat);
          lens.scale.set(0.056, 0.038, 0.015);
          lens.position.set(sx, 0.132, 0.112);
          headAcc.add(lens);
        }
        const bridge = new THREE.Mesh(shopGeos.box, frameMat);
        bridge.scale.set(0.145, 0.008, 0.018);
        bridge.position.set(0, 0.146, 0.114);
        headAcc.add(bridge);
      }
    }

    // E. 3D Neon Masks & Heist Faceplates (`headAcc` + `gasMaskGroup`)
    if (rig.parts.gasMaskGroup) {
      if (rig.parts.gasMaskGroup) rig.parts.gasMaskGroup.visible = wardrobeState.maskId === 'gas_mask';
    }
    if (wardrobeState.maskId === 'neon_skull' || wardrobeState.maskId === 'oni_samurai' || wardrobeState.maskId === 'diamond_fox' || wardrobeState.maskId === 'ballistic_kevlar') {
      const mId = wardrobeState.maskId;
      const plateMat = mId === 'diamond_fox'
        ? mats.gold24k
        : mId === 'oni_samurai'
          ? mats.redAccent
          : mats.matteBlack;

      const faceShield = new THREE.Mesh(shopGeos.sphere, plateMat);
      faceShield.scale.set(0.195, 0.215, 0.14);
      faceShield.position.set(0, 0.105, 0.068);
      headAcc.add(faceShield);

      if (mId === 'neon_skull') {
        const neonMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
        neonMat.userData = { ownMaterial: true, isNeonMaskGlow: true };
        for (const ex of [-0.036, 0.036]) {
          const eyeX1 = new THREE.Mesh(shopGeos.box, neonMat);
          eyeX1.scale.set(0.036, 0.008, 0.012);
          eyeX1.rotation.z = 0.78;
          eyeX1.position.set(ex, 0.132, 0.136);
          const eyeX2 = eyeX1.clone();
          eyeX2.rotation.z = -0.78;
          headAcc.add(eyeX1, eyeX2);
        }
        const grin = new THREE.Mesh(shopGeos.box, neonMat);
        grin.scale.set(0.088, 0.016, 0.012);
        grin.position.set(0, 0.068, 0.132);
        headAcc.add(grin);
      } else if (mId === 'oni_samurai' || mId === 'diamond_fox') {
        for (const hx of [-0.065, 0.065]) {
          const horn = new THREE.Mesh(shopGeos.solidCone, mats.gold24k);
          horn.scale.set(0.042, mId === 'oni_samurai' ? 0.12 : 0.09, 0.042);
          horn.position.set(hx, 0.225, 0.08);
          horn.rotation.z = -hx * 3.5;
          horn.rotation.x = 0.25;
          headAcc.add(horn);
        }
      }
    }

    // F. Heist Duffel Bag / Tactical Armor / Gold VIP Briefcase
    if (rig.parts.tacticalGroup) {
      if (rig.parts.tacticalGroup) rig.parts.tacticalGroup.visible =
        outfit.basePreset === 'tactical_heist' || wardrobeState.gearId === 'heavy_plate_vest';
    }
    if (rig.parts.briefcaseGroup) {
      if (rig.parts.briefcaseGroup) rig.parts.briefcaseGroup.visible = wardrobeState.gearId === 'vip_gold_briefcase';
    }
    if (wardrobeState.gearId === 'heist_duffel') {
      const bagMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.72 });
      bagMat.userData = { ownMaterial: true };
      const duffel = new THREE.Mesh(shopGeos.cyl, bagMat);
      duffel.scale.set(0.24, 0.52, 0.24);
      duffel.rotation.z = 0.42;
      duffel.position.set(0.02, 0.24, -0.18);
      spineAcc.add(duffel);
    }

    return true;
  }

  // ==========================================================================
  // 16. LUXURY DEALERSHIP VEHICLE SPAWNER & PERSONAL 6-CAR GARAGE SYSTEM
  // ==========================================================================
  function spawnConfiguredVehicle(spawnType, fallbackType, x, y, z, yaw, modConfig = null, customLabel = null) {
    let car = null;

    // 1. Prefer `ctx.vehiclesExtra.spawnExtraVehicle` for exotic new types (`zentorno`, `superbike`, `chopper`, etc.)
    if (ctx.vehiclesExtra?.spawnExtraVehicle && (spawnType === 'zentorno' || spawnType === 'superbike' || spawnType === 'chopper' || spawnType === 'jetski' || spawnType === 'speedboat' || spawnType === 'rhino_tank')) {
      try {
        car = ctx.vehiclesExtra.spawnExtraVehicle(spawnType, x, y, z, yaw, {
          color: modConfig?.paintColor,
          plate: modConfig?.plate || 'LS7 VIP',
          isParked: true,
          isHero: true
        });
      } catch (_) {
        car = null;
      }
    }

    // 2. Standard or graceful fallback via `ctx.vehicles.spawnVehicle`
    if (!car && ctx.vehicles?.spawnVehicle) {
      const effectiveType = spawnType === 'zentorno' || spawnType === 'superbike'
        ? (fallbackType || 'obey9f')
        : spawnType;
      car = ctx.vehicles.spawnVehicle(effectiveType, x, y, z, yaw, {
        color: modConfig?.paintColor,
        plate: modConfig?.plate || 'LS7 VIP',
        isParked: true,
        isHero: true
      });
      if (car && spawnType === 'zentorno' && car.type !== 'zentorno') {
        car._baseMaxSpeed = 49;
        car._baseAccel = 38;
        car.maxSpeed = 49;
        car.accel = 38;
      }
    }

    if (car) {
      if (customLabel) {
        car.displayName = customLabel;
        car.label = customLabel;
      }
      if (modConfig) {
        applyCarMods(car, modConfig, { fullRepair: true });
      }
    }

    return car;
  }

  function findClearSummonSpotNearPlayer() {
    const p = ctx.player;
    if (!p || p.x > 500) {
      return { x: 34.5, y: 0.05, z: 24.0, yaw: Math.PI };
    }
    const fwdX = Math.sin(p.yaw || 0);
    const fwdZ = Math.cos(p.yaw || 0);
    let sx = clamp(p.x + fwdX * 7.5, -196, 232);
    let sz = clamp(p.z + fwdZ * 7.5, -215, 215);
    const sy = ctx.world?.getGroundHeight ? Math.max(0.05, ctx.world.getGroundHeight(sx, sz)) : 0.05;
    return { x: sx, y: sy, z: sz, yaw: (p.yaw || 0) + Math.PI * 0.5 };
  }

  function summonGarageCar(slotIndex) {
    const entry = savedGarage[slotIndex];
    if (!entry) return null;

    if (state.inAmmuInterior) {
      exitAmmuNation();
    }
    if (state.modalOpen) {
      closeModal();
    }

    // Remove previous summoned copy of this exact garage slot so streets stay clean
    if (entry._liveCarRef && ctx.vehicles?.removeVehicle && ctx.player?.inCar !== entry._liveCarRef) {
      ctx.vehicles.removeVehicle(entry._liveCarRef);
      entry._liveCarRef = null;
    }

    const spot = findClearSummonSpotNearPlayer();
    const spec = DEALERSHIP_CATALOG.find((d) => d.id === entry.catalogId);
    const spawned = spawnConfiguredVehicle(
      entry.spawnType || spec?.spawnType || 'obey9f',
      spec?.fallbackType || 'obey9f',
      spot.x,
      spot.y,
      spot.z,
      spot.yaw,
      entry.mods,
      entry.customName
    );

    if (spawned) {
      spawned.garageSlotId = entry.slotId;
      entry._liveCarRef = spawned;
      ctx.audio?.playChime?.();
      notifyPlayer(`🚗 Thợ Máy Cá Nhân đã giao "${entry.customName}" (Biển số ${entry.plate || 'LS7 VIP'}) ngay trước mặt bạn!`, 4.2);
    }
    return spawned;
  }

  function saveCarToPersonalGarage(car, customTitle = null) {
    if (!car) return false;
    ensureCarBaseSnapshot(car);

    const modsCopy = JSON.parse(JSON.stringify(car.customMods || createDefaultModConfig(car.baseColor)));
    const existingIdx = savedGarage.findIndex((g) => g.slotId === car.garageSlotId);

    const record = {
      slotId: car.garageSlotId || `garage_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      catalogId: modsCopy.isArmoredKuruma ? 'armored_kuruma' : (modsCopy.zentornoTrim ? 'zentorno' : car.type),
      spawnType: car.type,
      customName: customTitle || car.displayName?.split('—')[0]?.trim() || car.name || 'Siêu Xe Độ LSC',
      plate: car.plate || modsCopy.plate || `LS${Math.floor(100 + Math.random() * 899)}VIP`,
      value: 25000 + (modsCopy.engineStage || 0) * 4500 + (modsCopy.twinTurbo ? 6000 : 0),
      mods: modsCopy
    };

    if (existingIdx >= 0) {
      savedGarage[existingIdx] = record;
    } else if (savedGarage.length < MAX_GARAGE_SLOTS) {
      savedGarage.push(record);
    } else {
      // Replace oldest non-starter or last slot if all 6 slots are full
      savedGarage[MAX_GARAGE_SLOTS - 1] = record;
    }

    car.garageSlotId = record.slotId;
    record._liveCarRef = car;
    persistGarage();
    return true;
  }

  // ==========================================================================
  // 17. CUSTOM LICENSE PLATE TEXTURE GENERATOR & LIVE TELEMETRY CANVASES
  // ==========================================================================
  const LICENSE_PLATE_STYLES = [
    { id: 'sa_classic', name: 'San Andreas Trắng Xanh', bg: '#f4f7fb', border: '#1d4ed8', topText: 'SAN ANDREAS', topCol: '#dc2626', charCol: '#0f295c' },
    { id: 'vinewood_black', name: 'Đen Chữ Vàng VIP', bg: '#101318', border: '#facc15', topText: 'LOS SANTOS VIP', topCol: '#facc15', charCol: '#fde047' },
    { id: 'vice_neon', name: ' Tím Hồng Neon Đêm', bg: '#1b0b2e', border: '#00f5ff', topText: 'DEL PERRO NIGHTS', topCol: '#ff2a85', charCol: '#00f5ff' },
    { id: 'gold_royal', name: 'Vàng Ròng Hoàng Gia', bg: '#d99b16', border: '#fffbeb', topText: 'DIAMOND CLUB', topCol: '#111827', charCol: '#111827' },
    { id: 'carbon_stealth', name: 'Xám Nhám Đua Ngầm', bg: '#1e242d', border: '#ef4444', topText: 'MIDNIGHT CLUB', topCol: '#ef4444', charCol: '#f8fafc' }
  ];

  function generateCustomPlateCanvas(plateText, styleId = 'sa_classic') {
    const style = LICENSE_PLATE_STYLES.find((s) => s.id === styleId) || LICENSE_PLATE_STYLES[0];
    const c = createCanvas2D(256, 128);
    if (!c) return null;
    const g = c.getContext('2d');

    g.fillStyle = style.bg;
    g.fillRect(0, 0, 256, 128);

    g.strokeStyle = style.border;
    g.lineWidth = 7;
    g.strokeRect(6, 6, 244, 116);

    g.fillStyle = style.topCol;
    g.font = '800 18px "Segoe UI", sans-serif';
    g.textAlign = 'center';
    g.fillText(style.topText, 128, 29);

    const cleanStr = String(plateText || 'LS7 VIP')
      .toUpperCase()
      .replace(/[^A-Z0-9 -]/g, '')
      .slice(0, 8) || 'LS7 VIP';

    g.fillStyle = style.charCol;
    g.font = '900 50px "Consolas", "Segoe UI", monospace';
    g.textBaseline = 'middle';
    g.fillText(cleanStr, 128, 78);

    return c;
  }

  function applyCustomPlateToCar(car, rawText, styleId = 'sa_classic') {
    if (!car) return false;
    const cleanStr = String(rawText || car.plate || 'LS7 VIP')
      .toUpperCase()
      .replace(/[^A-Z0-9 -]/g, '')
      .slice(0, 8) || 'LS7 VIP';

    car.plate = cleanStr;
    ensureCarBaseSnapshot(car);
    car.customMods.plate = cleanStr;
    car.customMods.plateStyle = styleId;

    const plateCanvas = generateCustomPlateCanvas(cleanStr, styleId);
    if (plateCanvas && car.plateMat) {
      const newTex = new THREE.CanvasTexture(plateCanvas);
      newTex.colorSpace = THREE.SRGBColorSpace;
      if (car.plateMat.userData?.ownPlateTex && car.plateMat.map) {
        car.plateMat.map.dispose?.();
      }
      car.plateMat.map = newTex;
      car.plateMat.userData = { ...(car.plateMat.userData || {}), ownPlateTex: true };
      car.plateMat.needsUpdate = true;
    }
    return true;
  }

  // Live LSC Chassis Dyno Curve Renderer (Stock vs Tuned HP / Torque / Boost + Sweeping Dyno Needle)
  let dynoSweepRpm = 0;
  let dynoSweepActive = false;
  let dynoPeakMeasuredHp = 0;

  function renderLSCDynoCanvas(canvasEl, car) {
    if (!canvasEl || !car) return;
    const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    const cssW = canvasEl.clientWidth || 320;
    const cssH = canvasEl.clientHeight || 138;
    if (canvasEl.width !== Math.round(cssW * dpr) || canvasEl.height !== Math.round(cssH * dpr)) {
      canvasEl.width = Math.round(cssW * dpr);
      canvasEl.height = Math.round(cssH * dpr);
    }

    const g = canvasEl.getContext('2d');
    g.save();
    g.scale(dpr, dpr);
    g.clearRect(0, 0, cssW, cssH);

    // Dark grid background
    g.fillStyle = 'rgba(9, 13, 22, 0.92)';
    g.fillRect(0, 0, cssW, cssH);

    const padL = 34;
    const padR = 14;
    const padT = 18;
    const padB = 22;
    const plotW = cssW - padL - padR;
    const plotH = cssH - padT - padB;

    g.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    g.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const py = padT + (plotH * i) / 4;
      g.beginPath();
      g.moveTo(padL, py);
      g.lineTo(padL + plotW, py);
      g.stroke();
    }
    for (let r = 1; r <= 9; r++) {
      const px = padL + ((r - 1) / 8) * plotW;
      g.beginPath();
      g.moveTo(px, padT);
      g.lineTo(px, padT + plotH);
      g.stroke();
      g.fillStyle = 'rgba(148, 163, 184, 0.72)';
      g.font = '600 9px sans-serif';
      g.textAlign = 'center';
      g.fillText(`${r}k`, px, cssH - 6);
    }

    ensureCarBaseSnapshot(car);
    const mods = car.customMods || createDefaultModConfig();
    const baseHp = Math.round(car._baseMaxSpeed * 13.5);
    const engSpec = ENGINE_STAGES[clamp(mods.engineStage || 0, 0, 4)];
    const turboGain = mods.twinTurbo ? 185 : 0;
    const tunedPeakHp = baseHp + engSpec.hpGain + turboGain;
    const maxAxisHp = Math.max(950, tunedPeakHp + 120);

    const evalHpAtRpm = (rpmFrac, peak, hasTurbo) => {
      // Realistic V8/V10 torque-times-RPM curve peaking at ~0.82 redline
      const baseCurve = Math.sin(Math.pow(rpmFrac, 0.86) * Math.PI * 0.66);
      const spoolSurge = hasTurbo ? Math.pow(clamp((rpmFrac - 0.30) / 0.55, 0, 1), 1.6) * 0.24 : 0;
      return clamp((baseCurve + spoolSurge) / (hasTurbo ? 1.18 : 0.96), 0.12, 1.0) * peak;
    };

    // 1. Stock Baseline Curve (Dashed Slate)
    g.save();
    g.setLineDash([4, 4]);
    g.strokeStyle = 'rgba(148, 163, 184, 0.58)';
    g.lineWidth = 1.6;
    g.beginPath();
    for (let s = 0; s <= 40; s++) {
      const f = s / 40;
      const hp = evalHpAtRpm(f, baseHp, false);
      const px = padL + f * plotW;
      const py = padT + plotH - (hp / maxAxisHp) * plotH;
      if (s === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
    g.restore();

    // 2. Tuned Horsepower Curve (Glowing Cyan/Gold Fill + Stroke)
    const grad = g.createLinearGradient(padL, padT, padL + plotW, padT);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(0.6, '#d946ef');
    grad.addColorStop(1, '#facc15');

    g.strokeStyle = grad;
    g.lineWidth = 2.6;
    g.beginPath();
    const limitFrac = dynoSweepActive ? clamp(dynoSweepRpm / 9000, 0.05, 1.0) : 1.0;
    const steps = Math.max(4, Math.round(48 * limitFrac));
    let liveHpNow = tunedPeakHp;

    for (let s = 0; s <= steps; s++) {
      const f = (s / steps) * limitFrac;
      const hp = evalHpAtRpm(f, tunedPeakHp, mods.twinTurbo);
      liveHpNow = hp;
      const px = padL + f * plotW;
      const py = padT + plotH - (hp / maxAxisHp) * plotH;
      if (s === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();

    if (dynoSweepActive) {
      if (liveHpNow > dynoPeakMeasuredHp) dynoPeakMeasuredHp = Math.round(liveHpNow);
      const needleX = padL + limitFrac * plotW;
      g.strokeStyle = '#ef4444';
      g.lineWidth = 1.8;
      g.beginPath();
      g.moveTo(needleX, padT);
      g.lineTo(needleX, padT + plotH);
      g.stroke();
    }

    // Header Telemetry Readout
    g.fillStyle = '#f8fafc';
    g.font = '700 10.5px "Segoe UI", sans-serif';
    g.textAlign = 'left';
    const shownHp = dynoSweepActive ? Math.round(liveHpNow) : tunedPeakHp;
    const boostStr = mods.twinTurbo ? ' • BOOST 1.45 BAR' : ' • N/A';
    g.fillText(`CÔNG SUẤT DYNO: ${shownHp} HP (Gốc ${baseHp} HP)${boostStr}`, padL, 12);

    g.fillStyle = '#94a3b8';
    g.font = '600 9px sans-serif';
    g.textAlign = 'right';
    g.fillText(`${maxAxisHp}`, padL - 4, padT + 7);
    g.fillText(`${Math.round(maxAxisHp * 0.5)}`, padL - 4, padT + plotH * 0.5 + 3);
    g.fillText('0', padL - 4, padT + plotH);

    g.restore();
  }

  // Thần Binh Các Interactive Ballistics & Recoil Spread Grouping Canvas
  function renderWeaponBallisticsCanvas(canvasEl, weaponId) {
    if (!canvasEl) return;
    const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    const cssW = canvasEl.clientWidth || 320;
    const cssH = canvasEl.clientHeight || 126;
    if (canvasEl.width !== Math.round(cssW * dpr) || canvasEl.height !== Math.round(cssH * dpr)) {
      canvasEl.width = Math.round(cssW * dpr);
      canvasEl.height = Math.round(cssH * dpr);
    }

    const g = canvasEl.getContext('2d');
    g.save();
    g.scale(dpr, dpr);
    g.fillStyle = 'rgba(12, 15, 22, 0.94)';
    g.fillRect(0, 0, cssW, cssH);

    const wSpec = AMMU_WEAPONS.find((w) => w.id === weaponId) || AMMU_WEAPONS[2];
    const att = arsenalState.attachments[weaponId] || {};

    // Left panel: Simulated 20-shot bullseye grouping radius
    const bullX = 64;
    const bullY = cssH * 0.54;
    for (const [rad, col] of [[42, 'rgba(148,163,184,0.22)'], [28, 'rgba(148,163,184,0.32)'], [14, 'rgba(239,68,68,0.55)']]) {
      g.strokeStyle = col;
      g.lineWidth = 1.2;
      g.beginPath();
      g.arc(bullX, bullY, rad, 0, Math.PI * 2);
      g.stroke();
    }

    let spreadFactor = (105 - (wSpec.stats.acc || 70)) * 0.68;
    if (att.suppressor) spreadFactor *= 0.80;
    if (att.holo_scope) spreadFactor *= 0.72;
    if (att.laser_sight) spreadFactor *= 0.82;

    const laserCol = att.laser_sight
      ? (att.laserColor === 'green' ? '#22ff66' : att.laserColor === 'cyan' ? '#00f5ff' : '#ff3b30')
      : '#facc15';

    g.fillStyle = laserCol;
    for (let s = 0; s < 18; s++) {
      const ang = s * 2.39996;
      const dist = Math.sqrt((s + 0.5) / 18) * spreadFactor;
      g.beginPath();
      g.arc(bullX + Math.cos(ang) * dist, bullY + Math.sin(ang) * dist, 2.2, 0, Math.PI * 2);
      g.fill();
    }

    g.fillStyle = '#e2e8f0';
    g.font = '700 9.5px sans-serif';
    g.textAlign = 'center';
    g.fillText('ĐỘ CHỤM TÂM BẮN', bullX, 14);

    // Right panel: Effective Range & Damage Curve
    const rx0 = 136;
    const rw = cssW - rx0 - 14;
    const ry0 = 24;
    const rh = cssH - 42;

    g.strokeStyle = 'rgba(148,163,184,0.2)';
    g.strokeRect(rx0, ry0, rw, rh);

    g.strokeStyle = '#ef4444';
    g.lineWidth = 2.4;
    g.beginPath();
    const rangeNorm = (wSpec.stats.range || 50) / 100;
    const dmgNorm = (wSpec.stats.dmg || 50) / 100;
    for (let x = 0; x <= 30; x++) {
      const f = x / 30;
      const falloff = f < rangeNorm * 0.65
        ? 1.0
        : Math.max(0.25, 1.0 - (f - rangeNorm * 0.65) / Math.max(0.25, 1.15 - rangeNorm * 0.65));
      const py = ry0 + rh - dmgNorm * falloff * (rh - 6);
      const px = rx0 + f * rw;
      if (x === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();

    g.fillStyle = '#f8fafc';
    g.textAlign = 'left';
    g.fillText(`ĐƯỜNG ĐẠN & SÁT THƯƠNG (${arsenalState.rangeReloadFirePerk ? '+15% TỐC ĐỘ VÀNG' : 'TIÊU CHUẨN'})`, rx0, 14);
    g.fillStyle = '#94a3b8';
    g.font = '600 8.5px sans-serif';
    g.fillText('10m', rx0, cssH - 6);
    g.fillText('50m', rx0 + rw * 0.45, cssH - 6);
    g.fillText('120m', rx0 + rw - 24, cssH - 6);

    g.restore();
  }

  // ==========================================================================
  // 18. SCOPED CSS INJECTION & FULL STUDIO / RANGE / SNIPER DOM SHELL
  // ==========================================================================
  const dom = {
    styleEl: null,
    overlay: null,
    panelWrap: null,
    headerTitle: null,
    headerSub: null,
    cashBadge: null,
    tabsBar: null,
    bodyScroll: null,
    footerBar: null,
    orbitHint: null,
    rangeHud: null,
    rangeTimerEl: null,
    rangeScoreEl: null,
    rangeStreakEl: null,
    rangeProgressFill: null,
    rangePopupBox: null,
    sniperScopeEl: null
  };

  function injectCustomsShopsStyles() {
    if (typeof document === 'undefined' || dom.styleEl) return;
    let existing = document.getElementById('gta-customs-shops-css');
    if (existing) {
      dom.styleEl = existing;
      return;
    }

    const style = document.createElement('style');
    style.id = 'gta-customs-shops-css';
    style.textContent = `
      #customs-shops-overlay {
        position: fixed;
        inset: 0;
        z-index: 9400;
        pointer-events: auto;
        display: flex;
        justify-content: space-between;
        align-items: stretch;
        padding: 18px 22px;
        font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
        color: #f8fafc;
        user-select: none;
        background: linear-gradient(90deg, rgba(6, 9, 16, 0.84) 0%, rgba(6, 9, 16, 0.12) 44%, rgba(6, 9, 16, 0.04) 68%, rgba(6, 9, 16, 0.62) 100%);
      }
      #customs-shops-overlay.hidden {
        display: none !important;
      }
      .cs-studio-panel {
        width: min(465px, 92vw);
        max-height: calc(100vh - 36px);
        display: flex;
        flex-direction: column;
        background: rgba(11, 15, 25, 0.92);
        border: 1px solid rgba(56, 189, 248, 0.32);
        border-radius: 14px;
        box-shadow: 0 22px 55px rgba(0, 0, 0, 0.78), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(14px);
        overflow: hidden;
      }
      .cs-studio-panel.theme-ammu {
        border-color: rgba(239, 68, 68, 0.44);
      }
      .cs-studio-panel.theme-clothing {
        border-color: rgba(250, 204, 21, 0.42);
      }
      .cs-studio-panel.theme-dealership {
        border-color: rgba(245, 158, 11, 0.48);
        width: min(520px, 94vw);
      }
      .cs-header {
        padding: 14px 16px 11px;
        background: linear-gradient(135deg, rgba(24, 32, 52, 0.95), rgba(11, 15, 26, 0.95));
        border-bottom: 1px solid rgba(148, 163, 184, 0.18);
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 10px;
      }
      .cs-title {
        font-size: 18px;
        font-weight: 900;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        color: #f8fafc;
        margin: 0;
      }
      .cs-sub {
        font-size: 11.5px;
        color: #94a3b8;
        margin-top: 3px;
      }
      .cs-cash-pill {
        background: rgba(16, 185, 129, 0.16);
        border: 1px solid rgba(52, 211, 153, 0.45);
        color: #4ade80;
        font-weight: 800;
        font-size: 14px;
        padding: 5px 11px;
        border-radius: 999px;
        white-space: nowrap;
      }
      .cs-close-btn {
        background: rgba(239, 68, 68, 0.18);
        border: 1px solid rgba(239, 68, 68, 0.45);
        color: #fca5a5;
        font-weight: 800;
        font-size: 12px;
        padding: 5px 10px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .cs-close-btn:hover {
        background: rgba(239, 68, 68, 0.4);
        color: #ffffff;
      }
      .cs-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        padding: 9px 12px;
        background: rgba(7, 10, 18, 0.85);
        border-bottom: 1px solid rgba(148, 163, 184, 0.15);
      }
      .cs-tab-btn {
        background: rgba(30, 41, 59, 0.68);
        border: 1px solid rgba(148, 163, 184, 0.22);
        color: #cbd5e1;
        font-size: 11.5px;
        font-weight: 700;
        padding: 6px 9px;
        border-radius: 7px;
        cursor: pointer;
        transition: all 0.14s ease;
      }
      .cs-tab-btn:hover {
        border-color: #38bdf8;
        color: #ffffff;
      }
      .cs-tab-btn.active {
        background: linear-gradient(135deg, #0284c7, #6d28d9);
        border-color: #38bdf8;
        color: #ffffff;
        box-shadow: 0 0 12px rgba(56, 189, 248, 0.35);
      }
      .cs-body {
        flex: 1;
        overflow-y: auto;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .cs-body::-webkit-scrollbar {
        width: 6px;
      }
      .cs-body::-webkit-scrollbar-thumb {
        background: rgba(100, 116, 139, 0.55);
        border-radius: 99px;
      }
      .cs-section-label {
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.7px;
        color: #38bdf8;
        margin: 4px 0 2px;
      }
      .cs-card {
        background: rgba(20, 27, 42, 0.82);
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 10px;
        padding: 10px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        transition: all 0.14s ease;
      }
      .cs-card:hover {
        border-color: rgba(56, 189, 248, 0.52);
        background: rgba(28, 38, 58, 0.92);
      }
      .cs-card.equipped {
        border-color: #4ade80;
        background: rgba(20, 48, 40, 0.55);
      }
      .cs-card-info {
        flex: 1;
        min-width: 0;
      }
      .cs-card-name {
        font-size: 13px;
        font-weight: 800;
        color: #f8fafc;
      }
      .cs-card-desc {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 2px;
        line-height: 1.32;
      }
      .cs-buy-btn {
        background: linear-gradient(135deg, #0ea5e9, #2563eb);
        border: 1px solid rgba(125, 211, 252, 0.5);
        color: #ffffff;
        font-weight: 800;
        font-size: 11.5px;
        padding: 7px 12px;
        border-radius: 8px;
        cursor: pointer;
        white-space: nowrap;
        transition: transform 0.1s ease, filter 0.14s ease;
      }
      .cs-buy-btn:hover {
        filter: brightness(1.14);
        transform: translateY(-1px);
      }
      .cs-buy-btn.owned {
        background: rgba(34, 197, 94, 0.22);
        border-color: #4ade80;
        color: #86efac;
      }
      .cs-buy-btn.gold {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        border-color: #fde047;
        color: #0f172a;
      }
      .cs-swatch-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 7px;
      }
      .cs-swatch {
        height: 34px;
        border-radius: 8px;
        border: 2px solid rgba(255, 255, 255, 0.22);
        cursor: pointer;
        position: relative;
        transition: transform 0.12s ease, border-color 0.12s ease;
      }
      .cs-swatch:hover {
        transform: scale(1.08);
        border-color: #ffffff;
      }
      .cs-swatch.active {
        border-color: #facc15;
        box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.45);
      }
      .cs-stat-bars {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 7px 12px;
        padding: 9px 12px;
        background: rgba(8, 12, 20, 0.88);
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 9px;
      }
      .cs-stat-row {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .cs-stat-lbl {
        display: flex;
        justify-content: space-between;
        font-size: 10.5px;
        font-weight: 700;
        color: #cbd5e1;
      }
      .cs-stat-track {
        height: 6px;
        border-radius: 99px;
        background: rgba(51, 65, 85, 0.7);
        overflow: hidden;
      }
      .cs-stat-fill {
        height: 100%;
        border-radius: 99px;
        background: linear-gradient(90deg, #38bdf8, #a855f7, #facc15);
        transition: width 0.22s ease;
      }
      .cs-canvas-box {
        width: 100%;
        height: 132px;
        border-radius: 9px;
        border: 1px solid rgba(56, 189, 248, 0.25);
        overflow: hidden;
        background: #090d16;
      }
      .cs-canvas-box canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
      .cs-footer {
        padding: 9px 12px;
        background: rgba(7, 10, 18, 0.94);
        border-top: 1px solid rgba(148, 163, 184, 0.18);
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        justify-content: space-between;
        align-items: center;
      }
      .cs-viewport-drag-zone {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: center;
        padding-bottom: 18px;
        cursor: grab;
      }
      .cs-viewport-drag-zone:active {
        cursor: grabbing;
      }
      .cs-orbit-pill {
        background: rgba(11, 15, 25, 0.82);
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 999px;
        padding: 7px 16px;
        font-size: 12px;
        font-weight: 700;
        color: #e2e8f0;
        pointer-events: none;
        box-shadow: 0 8px 24px rgba(0,0,0,0.55);
      }
      .cs-plate-input {
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid #38bdf8;
        color: #fde047;
        font-family: "Consolas", monospace;
        font-weight: 900;
        font-size: 15px;
        letter-spacing: 2px;
        text-transform: uppercase;
        padding: 6px 10px;
        border-radius: 7px;
        width: 145px;
        text-align: center;
      }
      /* Live Indoor Trường Bắn Binh Khí Scoreboard HUD */
      #ammu-range-hud {
        position: fixed;
        top: 18px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 8800;
        min-width: 390px;
        background: rgba(11, 15, 24, 0.90);
        border: 1px solid rgba(250, 204, 21, 0.55);
        border-radius: 12px;
        padding: 10px 16px;
        color: #f8fafc;
        font-family: "Segoe UI", sans-serif;
        box-shadow: 0 12px 32px rgba(0,0,0,0.68);
        pointer-events: none;
      }
      #ammu-range-hud.hidden {
        display: none !important;
      }
      .ar-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
      }
      .ar-val {
        font-size: 21px;
        font-weight: 900;
        color: #facc15;
      }
      .ar-bar-bg {
        margin-top: 7px;
        height: 8px;
        border-radius: 99px;
        background: rgba(51, 65, 85, 0.8);
        overflow: hidden;
        position: relative;
      }
      .ar-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #cd7f32 0%, #cbd5e1 55%, #facc15 100%);
        width: 0%;
        transition: width 0.14s ease;
      }
      #ammu-range-popups {
        margin-top: 5px;
        font-size: 12.5px;
        font-weight: 800;
        text-align: center;
        min-height: 18px;
      }
      /* Heavy Sniper .50 BMG Precision Mil-Dot Scope Reticle */
      #heavy-sniper-scope-hud {
        position: fixed;
        inset: 0;
        z-index: 8600;
        pointer-events: none;
        background: radial-gradient(circle at center, transparent 28%, rgba(0, 0, 0, 0.94) 44%);
        display: flex;
        justify-content: center;
        align-items: center;
      }
      #heavy-sniper-scope-hud.hidden {
        display: none !important;
      }
      .sniper-reticle-ring {
        width: min(64vh, 64vw);
        height: min(64vh, 64vw);
        border: 2px solid rgba(56, 189, 248, 0.7);
        border-radius: 50%;
        position: relative;
        box-shadow: inset 0 0 35px rgba(0, 0, 0, 0.85);
      }
      .sniper-reticle-ring::before,
      .sniper-reticle-ring::after {
        content: "";
        position: absolute;
        background: rgba(239, 68, 68, 0.82);
      }
      .sniper-reticle-ring::before {
        left: 0; right: 0; top: 50%; height: 1px;
      }
      .sniper-reticle-ring::after {
        top: 0; bottom: 0; left: 50%; width: 1px;
      }
    `;
    document.head.appendChild(style);
    dom.styleEl = style;
  }

  function ensureShopsDOM() {
    if (typeof document === 'undefined') return false;
    injectCustomsShopsStyles();
    if (dom.overlay) return true;

    const overlay = document.createElement('div');
    overlay.id = 'customs-shops-overlay';
    overlay.className = 'hidden';
    overlay.innerHTML = `
      <div id="cs-studio-panel" class="cs-studio-panel">
        <div class="cs-header">
          <div>
            <h2 id="cs-header-title" class="cs-title">LOS SANTOS CUSTOMS</h2>
            <div id="cs-header-sub" class="cs-sub">Xưởng Độ Siêu Xe 3D &amp; Hiệu Năng Cao</div>
          </div>
          <div style="display:flex;align-items:center;gap:7px;">
            <span id="cs-cash-badge" class="cs-cash-pill">$0</span>
            <button id="cs-btn-close" class="cs-close-btn" type="button">✕ ĐÓNG [ESC]</button>
          </div>
        </div>
        <div id="cs-tabs-bar" class="cs-tabs"></div>
        <div id="cs-body-scroll" class="cs-body"></div>
        <div id="cs-footer-bar" class="cs-footer"></div>
      </div>
      <div id="cs-viewport-drag" class="cs-viewport-drag-zone">
        <div id="cs-orbit-hint" class="cs-orbit-pill">🖱️ Kéo chuột để xoay Camera 360° • Cuộn chuột để Zoom cận cảnh</div>
      </div>
    `;
    document.body.appendChild(overlay);

    const rangeHud = document.createElement('div');
    rangeHud.id = 'ammu-range-hud';
    rangeHud.className = 'hidden';
    rangeHud.innerHTML = `
      <div class="ar-row">
        <div>
          <div style="font-size:10.5px;color:#94a3b8;font-weight:800;">⏱️ THỜI GIAN CÒN LẠI</div>
          <div id="ar-timer-val" class="ar-val">45.0s</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:10.5px;color:#94a3b8;font-weight:800;">🎯 ĐIỂM TRƯỜNG BẮN</div>
          <div id="ar-score-val" class="ar-val" style="color:#38bdf8;">0</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10.5px;color:#94a3b8;font-weight:800;">🔥 CHUỖI COMBO</div>
          <div id="ar-streak-val" class="ar-val" style="color:#4ade80;">x1</div>
        </div>
      </div>
      <div class="ar-bar-bg">
        <div id="ar-progress-fill" class="ar-bar-fill"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#cbd5e1;margin-top:3px;font-weight:700;">
        <span>🥉 Đồng: 1,500</span>
        <span>🥈 Bạc: 3,200</span>
        <span>🥇 Vàng: 5,500 (+$2,000 &amp; +15% Bắn Nhanh!)</span>
      </div>
      <div id="ammu-range-popups">Bắn trúng Đầu Bia &amp; Hồng Tâm 10m / 20m / 35m! [ESC để dừng]</div>
    `;
    document.body.appendChild(rangeHud);

    const scopeEl = document.createElement('div');
    scopeEl.id = 'heavy-sniper-scope-hud';
    scopeEl.className = 'hidden';
    scopeEl.innerHTML = `
      <div class="sniper-reticle-ring">
        <div style="position:absolute;bottom:14px;left:50%;transform:translateX(-50%);font-family:monospace;font-size:12px;color:#38bdf8;font-weight:700;">
          .50 BMG MK II • ZOOM QUANG HỌC 8X
        </div>
      </div>
    `;
    document.body.appendChild(scopeEl);

    dom.overlay = overlay;
    dom.panelWrap = document.getElementById('cs-studio-panel');
    dom.headerTitle = document.getElementById('cs-header-title');
    dom.headerSub = document.getElementById('cs-header-sub');
    dom.cashBadge = document.getElementById('cs-cash-badge');
    dom.tabsBar = document.getElementById('cs-tabs-bar');
    dom.bodyScroll = document.getElementById('cs-body-scroll');
    dom.footerBar = document.getElementById('cs-footer-bar');
    dom.orbitHint = document.getElementById('cs-orbit-hint');
    dom.rangeHud = rangeHud;
    dom.rangeTimerEl = document.getElementById('ar-timer-val');
    dom.rangeScoreEl = document.getElementById('ar-score-val');
    dom.rangeStreakEl = document.getElementById('ar-streak-val');
    dom.rangeProgressFill = document.getElementById('ar-progress-fill');
    dom.rangePopupBox = document.getElementById('ammu-range-popups');
    dom.sniperScopeEl = scopeEl;

    const btnClose = document.getElementById('cs-btn-close');
    btnClose.addEventListener('click', () => closeModal());

    // Interactive 360° Drag-to-Orbit & Scroll-to-Zoom on the live 3D Viewport!
    const dragZone = document.getElementById('cs-viewport-drag');
    dragZone.addEventListener('pointerdown', (e) => {
      state.isDraggingPreview = true;
      state.lastDragX = e.clientX;
      state.lastDragY = e.clientY;
      state.camAutoSpin = false;
      state.camManualHoldTimer = 6.0;
      dragZone.setPointerCapture?.(e.pointerId);
    });
    dragZone.addEventListener('pointermove', (e) => {
      if (!state.isDraggingPreview) return;
      const dx = e.clientX - state.lastDragX;
      const dy = e.clientY - state.lastDragY;
      state.lastDragX = e.clientX;
      state.lastDragY = e.clientY;
      state.camTargetYaw = wrapAngle(state.camTargetYaw - dx * 0.0085);
      state.camTargetPitch = clamp(state.camTargetPitch + dy * 0.0065, 0.04, 0.78);
      state.camManualHoldTimer = 6.0;
    });
    const endDrag = () => {
      state.isDraggingPreview = false;
    };
    dragZone.addEventListener('pointerup', endDrag);
    dragZone.addEventListener('pointercancel', endDrag);
    dragZone.addEventListener('wheel', (e) => {
      e.preventDefault();
      const minD = state.modalMode === 'clothing' ? 1.85 : 3.2;
      const maxD = state.modalMode === 'clothing' ? 4.4 : 8.5;
      state.camTargetDist = clamp(state.camTargetDist + Math.sign(e.deltaY) * 0.45, minD, maxD);
      state.camManualHoldTimer = 5.0;
    }, { passive: false });

    return true;
  }

  function pushRangePopup(text, colorHexStr = '#facc15') {
    if (!dom.rangePopupBox) return;
    dom.rangePopupBox.textContent = text;
    dom.rangePopupBox.style.color = colorHexStr;
  }

  function updateRangeHUD(visible) {
    if (!ensureShopsDOM() || !dom.rangeHud) return;
    dom.rangeHud.classList.toggle('hidden', !visible);
    if (!visible) return;

    dom.rangeTimerEl.textContent = `${ state.rangeTimer.toFixed(1) }s`;
    dom.rangeTimerEl.style.color = state.rangeTimer <= 10 ? '#ef4444' : '#facc15';
    dom.rangeScoreEl.textContent = state.rangeScore.toLocaleString('en-US');
    const mult = Math.min(5, 1 + Math.floor(Math.max(0, state.rangeStreak - 1) / 3));
    dom.rangeStreakEl.textContent = `x${mult} (${state.rangeStreak})`;
    const pct = clamp((state.rangeScore / RANGE_MEDAL_THRESHOLDS.gold) * 100, 0, 100);
    dom.rangeProgressFill.style.width = `${pct.toFixed(1)}%`;
  }

  function updateSniperScopeOverlay(active) {
    if (!dom.sniperScopeEl && active) ensureShopsDOM();
    if (dom.sniperScopeEl) {
      dom.sniperScopeEl.classList.toggle('hidden', !active);
    }
    if (ctx.engine?.camera && state.sniperEquipped) {
      const targetFov = active ? 20 : 62;
      if (Math.abs(ctx.engine.camera.fov - targetFov) > 0.25) {
        ctx.engine.camera.fov = lerp(ctx.engine.camera.fov, targetFov, 0.25);
        ctx.engine.camera.updateProjectionMatrix();
      }
    }
  }

  // ==========================================================================
  // 19. CASH / NOTIFICATION HELPERS & MODAL LIFECYCLE
  // ==========================================================================
  function getPlayerCash() {
    return Math.max(0, Math.round(Number(ctx.player?.cash) || 0));
  }

  function spendPlayerCash(cost, successMsg = null) {
    const price = Math.max(0, Math.round(Number(cost) || 0));
    const cur = getPlayerCash();
    if (cur < price) {
      notifyPlayer(`Không đủ tiền mặt! Cần ${formatMoney(price)} (Hiện có ${formatMoney(cur)}).`, 3.2);
      shopAudio.playStickyBeep(false);
      return false;
    }
    if (ctx.player && price > 0) {
      if (ctx?.antiCheat?.commitCash) ctx.antiCheat.commitCash(cur - price);
      else ctx.player.cash = cur - price;
    }
    if (dom.cashBadge) {
      dom.cashBadge.textContent = formatMoney(getPlayerCash());
    }
    if (successMsg) {
      notifyPlayer(successMsg, 3.2);
    }
    return true;
  }

  function notifyPlayer(msg, duration = 3.2) {
    if (ctx.ui?.notify) {
      ctx.ui.notify(msg, duration);
    } else if (ctx.ui?.showNotification) {
      ctx.ui.showNotification(msg, duration);
    }
  }

  function releasePointerLockCleanly() {
    if (typeof document !== 'undefined' && document.pointerLockElement && document.exitPointerLock) {
      try {
        document.exitPointerLock();
      } catch (_) {}
    }
    if (ctx.input) {
      ctx.input.fire = false;
      ctx.input.isFiring = false;
      ctx.input.fireJustPressed = false;
    }
  }

  function refreshCashHeader() {
    if (dom.cashBadge) {
      dom.cashBadge.textContent = formatMoney(getPlayerCash());
    }
  }

  function closeModal() {
    if (!state.modalOpen) return false;
    const prevMode = state.modalMode;
    state.modalOpen = false;
    state.modalMode = null;
    dynoSweepActive = false;
    state.showroomNightPreview = false;

    if (ctx.activeModal === 'customs' || ctx.activeModal === 'shop') {
      ctx.activeModal = null;
    }

    if (lscShowroomLightsGroup) {
      lscShowroomLightsGroup.visible = false;
      lscShowroomLightsGroup.children.forEach((l) => {
        if (l.isLight) l.intensity = 0;
      });
    }

    // When exiting LSC Luyện Khí Các, roll the freshly tuned car smoothly to the bay apron facing Boulevard!
    if (prevMode === 'customs' && state.activeCar && !state.activeCar.destroyed) {
      state.lscBayCooldown = 5.5;
      const car = state.activeCar;
      car.vx = 0;
      car.vz = 0;
      car.yaw = Math.PI * 0.5;
      car.mesh?.position.set(car.x, car.y, car.z);
      if (car.mesh) car.mesh.rotation.y = car.yaw;
    }

    state.activeCar = null;
    if (dom.overlay) {
      dom.overlay.classList.add('hidden');
    }
    return true;
  }

  // ==========================================================================
  // 20. LOS SANTOS CUSTOMS — FULL 3D INTERACTIVE TUNING STUDIO (`openCustoms`)
  // ==========================================================================
  const LSC_SIGNATURE_BUILDS = [
    {
      id: 'dubai_sheikh_24k',
      name: '👑 Hoàng Đế Vàng Ròng 24K Dubai',
      price: 16500,
      desc: 'Sơn Vàng 24K nguyên chất, mâm đúc Vàng, đèn gầm Hoàng Kim, cánh gió GT3, Twin-Turbo & Giáp Cấp 4!',
      mods: {
        paintFinish: 'gold24k',
        paintColor: 0xffc300,
        pearlColor: 0xfff3b0,
        underglow: 'gold',
        spoiler: 'high_racing',
        splitter: 'time_attack',
        skirts: 'widebody_aero',
        hood: 'carbon_vented',
        roof: 'roof_louvers',
        rimFinish: 'gold',
        windowTint: 'limo_black',
        engineStage: 4,
        twinTurbo: true,
        brakesStage: 3,
        stanceLevel: 2,
        bulletproofTires: true,
        armorStage: 4
      }
    },
    {
      id: 'cyber_midnight_king',
      name: '⚡ Bóng Ma Đua Đêm Cyberpunk',
      price: 14200,
      desc: 'Ngọc trai Đen ánh Hồng Tím, đèn gầm Cầu Vồng RGB, cánh GT Carbon, Twin-Turbo khè lửa xanh & hạ gầm sát đất!',
      mods: {
        paintFinish: 'pearlescent',
        paintColor: 0x101318,
        pearlColor: 0xff1cf7,
        underglow: 'rainbow',
        spoiler: 'gt_carbon',
        splitter: 'time_attack',
        skirts: 'carbon_blades',
        hood: 'hood_scoop',
        roof: 'roof_scoop',
        rimFinish: 'matte_black',
        windowTint: 'cyber_chameleon',
        engineStage: 4,
        twinTurbo: true,
        brakesStage: 3,
        stanceLevel: 3,
        bulletproofTires: true,
        armorStage: 3
      }
    },
    {
      id: 'mirror_chrome_hyper',
      name: '💎 Tia Chớp Mạ Crôm Phản Gương',
      price: 12800,
      desc: 'Toàn thân phủ Mạ Crôm gương soi, đèn gầm Xanh Băng, mâm Crôm heo phanh Xanh, động cơ EMS Cấp 3 + Twin-Turbo!',
      mods: {
        paintFinish: 'chrome',
        paintColor: 0xc4ccd6,
        pearlColor: 0x00f5ff,
        underglow: 'cyan',
        spoiler: 'high_racing',
        splitter: 'carbon_lip',
        skirts: 'carbon_blades',
        hood: 'carbon_vented',
        roof: 'none',
        rimFinish: 'chrome',
        windowTint: 'dark_vip',
        engineStage: 3,
        twinTurbo: true,
        brakesStage: 2,
        stanceLevel: 2,
        bulletproofTires: true,
        armorStage: 2
      }
    },
    {
      id: 'muscle_blower_beast',
      name: '🔥 Quái Thú Cơ Bắp Siêu Nạp V8 Blower',
      price: 11900,
      desc: 'Sơn Đỏ Torino bóng, cụm Siêu Nạp V8 Chrome lộ thiên quay tít trên nắp ca-pô, lốp chữ trắng & Twin-Turbo!',
      mods: {
        paintFinish: 'clearcoat',
        paintColor: 0xd91b24,
        pearlColor: 0xffbe0b,
        underglow: 'crimson',
        spoiler: 'ducktail',
        splitter: 'time_attack',
        skirts: 'widebody_aero',
        hood: 'blower_v8',
        roof: 'roof_louvers',
        rimFinish: 'bronze_track',
        windowTint: 'dark_vip',
        engineStage: 4,
        twinTurbo: true,
        brakesStage: 3,
        stanceLevel: 2,
        bulletproofTires: true,
        armorStage: 3
      }
    },
    {
      id: 'heist_armored_fortress',
      name: '🛡️ Chiến Xa Bọc Thép Đột Kích Ngân Hàng',
      price: 13500,
      desc: 'Sơn Đen Nhám tàng hình, tấm thép chống đạn Kuruma quanh kính, lốp Kevlar bất tử & Giáp Khung Gầm 250% HP!',
      mods: {
        paintFinish: 'matte',
        paintColor: 0x16191f,
        pearlColor: 0x48505c,
        underglow: 'none',
        spoiler: 'gt_carbon',
        splitter: 'carbon_lip',
        skirts: 'carbon_blades',
        hood: 'hood_scoop',
        roof: 'roof_scoop',
        rimFinish: 'matte_black',
        windowTint: 'limo_black',
        engineStage: 3,
        twinTurbo: true,
        brakesStage: 3,
        stanceLevel: 1,
        bulletproofTires: true,
        armorStage: 4,
        isArmoredKuruma: true
      }
    }
  ];

  const CUSTOMS_TABS = [
    { id: 'paint', label: '🎨 Sơn & 24K', camYaw: 0.68, camPitch: 0.24, camDist: 5.5 },
    { id: 'underglow', label: '💡 Đèn Gầm Neon', camYaw: 0.78, camPitch: 0.11, camDist: 5.1 },
    { id: 'aero', label: '🦅 Bodykit 3D', camYaw: 2.48, camPitch: 0.26, camDist: 5.2 },
    { id: 'hood_roof', label: '🔥 Ca-pô & Nóc', camYaw: 0.36, camPitch: 0.34, camDist: 4.6 },
    { id: 'wheels', label: '🛞 Mâm & Kính', camYaw: 1.48, camPitch: 0.14, camDist: 4.2 },
    { id: 'performance', label: '🚀 Động Cơ & Turbo', camYaw: 2.75, camPitch: 0.18, camDist: 4.8 },
    { id: 'armor_stance', label: '🛡️ Giáp & Hạ Gầm', camYaw: 0.95, camPitch: 0.20, camDist: 5.4 },
    { id: 'presets', label: '💾 Gói Độ & Biển Số', camYaw: 0.58, camPitch: 0.23, camDist: 5.6 }
  ];

  function focusCustomsCameraForTab(tabId) {
    const spec = CUSTOMS_TABS.find((t) => t.id === tabId);
    if (!spec) return;
    state.camTargetYaw = spec.camYaw;
    state.camTargetPitch = spec.camPitch;
    state.camTargetDist = spec.camDist;
    state.camManualHoldTimer = 3.2;
  }

  function openCustoms(targetCar = null) {
    if (!ensureShopsDOM()) return false;
    let car = targetCar || ctx.player?.inCar || null;
    if (!car && ctx.player && ctx.vehicles?.findNearestEnterable) {
      car = ctx.vehicles.findNearestEnterable(ctx.player.x, ctx.player.z, 9.5);
    }
    if (!car && Array.isArray(ctx.vehicles?.list) && ctx.vehicles.list.length > 0) {
      car = ctx.vehicles.list.find((v) => v && !v.destroyed && !v.isTraffic) || ctx.vehicles.list[0];
    }
    if (!car || car.destroyed) {
      notifyPlayer('Hãy lái một chiếc xe vào Xưởng Độ Luyện Khí Các (-58, 80) để bắt đầu độ xe 3D!', 3.5);
      return false;
    }

    ensureCarBaseSnapshot(car);
    releasePointerLockCleanly();

    if (state.rangeActive) stopShootingRange(true);

    // Stage car neatly on the illuminated LSC showroom floor at (-58, 0.05, 80)
    car.x = SHOP_COORDS.lscBay.x;
    car.y = SHOP_COORDS.lscBay.y;
    car.z = SHOP_COORDS.lscBay.z;
    car.vx = 0;
    car.vy = 0;
    car.vz = 0;
    car.speed = 0;
    car.yaw = Math.PI * 0.5;
    if (car.mesh) {
      car.mesh.visible = true;
      car.mesh.position.set(car.x, car.y, car.z);
      car.mesh.rotation.y = car.yaw;
    }
    if (ctx.player && ctx.player.inCar === car) {
      ctx.player.x = car.x;
      ctx.player.y = car.y;
      ctx.player.z = car.z;
    }

    // Activate LSC Showroom Overhead Spotlights
    if (lscShowroomLightsGroup) {
      lscShowroomLightsGroup.visible = true;
      lscShowroomLightsGroup.children.forEach((l, idx) => {
        if (l.isLight) l.intensity = idx === 2 ? 2.2 : 3.1;
      });
    }

    state.activeCar = car;
    state.modalOpen = true;
    state.modalMode = 'customs';
    state.camAutoSpin = true;
    state.camManualHoldTimer = 0;
    state.camLookOffsetY = 0.68;
    ctx.activeModal = 'customs';

    focusCustomsCameraForTab(state.customsCategory);
    dom.panelWrap.className = 'cs-studio-panel theme-customs';
    dom.overlay.classList.remove('hidden');
    shopAudio.playImpactWrench();
    renderCustomsStudio();
    return true;
  }

  function buildCarStatBarsHTML(car) {
    ensureCarBaseSnapshot(car);
    const spdPct = clamp(Math.round(((car.maxSpeed || 32) / 62) * 100), 15, 100);
    const accPct = clamp(Math.round(((car.accel || 24) / 52) * 100), 15, 100);
    const gripVal = (car.def?.grip || 1.0) * 65 + (car._lscBrakeBonus || 0) * 1.1;
    const grpPct = clamp(Math.round(gripVal), 20, 100);
    const armPct = clamp(Math.round(((car.maxHp || 140) / 380) * 100), 20, 100);

    return `
      <div class="cs-stat-bars">
        <div class="cs-stat-row">
          <div class="cs-stat-lbl"><span>TỐC ĐỘ TỐI ĐA</span><span>${Math.round((car.maxSpeed || 32) * 7.6)} KM/H</span></div>
          <div class="cs-stat-track"><div class="cs-stat-fill" style="width:${spdPct}%"></div></div>
        </div>
        <div class="cs-stat-row">
          <div class="cs-stat-lbl"><span>GIA TỐC &amp; TURBO</span><span>${accPct}%</span></div>
          <div class="cs-stat-track"><div class="cs-stat-fill" style="width:${accPct}%"></div></div>
        </div>
        <div class="cs-stat-row">
          <div class="cs-stat-lbl"><span>PHANH &amp; BÁM CUA</span><span>${grpPct}%</span></div>
          <div class="cs-stat-track"><div class="cs-stat-fill" style="width:${grpPct}%"></div></div>
        </div>
        <div class="cs-stat-row">
          <div class="cs-stat-lbl"><span>GIÁP CHỐNG ĐẠN</span><span>${Math.round(car.hp || car.maxHp)}/${Math.round(car.maxHp)} HP</span></div>
          <div class="cs-stat-track"><div class="cs-stat-fill" style="width:${armPct}%"></div></div>
        </div>
      </div>
    `;
  }

  function renderCustomsStudio() {
    const car = state.activeCar;
    if (!car || !dom.overlay) return;

    ensureCarBaseSnapshot(car);
    const mods = car.customMods;
    refreshCashHeader();

    dom.headerTitle.textContent = 'LOS SANTOS CUSTOMS 3D';
    dom.headerSub.textContent = `${car.displayName || car.name || 'Siêu Xe Đường Phố'} • Biển số: ${car.plate || 'LS7 VIP'}`;
    dom.orbitHint.textContent = '🖱️ Kéo vùng trống để xoay 360° quanh xe • Cuộn chuột để soi chi tiết Carbon / Mâm / Đèn Gầm';

    // Render Category Tabs
    dom.tabsBar.innerHTML = CUSTOMS_TABS.map(
      (t) => `<button class="cs-tab-btn ${state.customsCategory === t.id ? 'active' : ''}" data-lsc-tab="${t.id}" type="button">${t.label}</button>`
    ).join('');

    dom.tabsBar.querySelectorAll('[data-lsc-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.customsCategory = btn.getAttribute('data-lsc-tab');
        focusCustomsCameraForTab(state.customsCategory);
        renderCustomsStudio();
      });
    });

    let bodyHtml = buildCarStatBarsHTML(car);
    const cat = state.customsCategory;

    if (cat === 'paint') {
      bodyHtml += `<div class="cs-section-label">1. CHẤT LIỆU SƠN PBR CAO CẤP (5 CHẾ ĐỘ PHẢN XẠ)</div>`;
      for (const fin of PAINT_FINISHES) {
        const active = mods.paintFinish === fin.id;
        bodyHtml += `
          <div class="cs-card ${active ? 'equipped' : ''}">
            <div class="cs-card-info">
              <div class="cs-card-name">${escapeHtml(fin.name)} <span style="font-size:10px;color:#facc15;">[${fin.badge}]</span></div>
              <div class="cs-card-desc">${escapeHtml(fin.desc)}</div>
            </div>
            <button class="cs-buy-btn ${active ? 'owned' : ''}" data-paint-finish="${fin.id}" data-price="${fin.price}" type="button">
              ${active ? 'ĐANG DÙNG' : formatMoney(fin.price)}
            </button>
          </div>`;
      }

      bodyHtml += `<div class="cs-section-label">2. BẢNG 24 MÀU SƠN CHỦ ĐẠO LOS SANTOS ($250)</div><div class="cs-swatch-grid">`;
      for (const sw of PAINT_COLORS_24) {
        const hexCss = '#' + sw.hex.toString(16).padStart(6, '0');
        const isSel = mods.paintColor === sw.hex;
        bodyHtml += `<div class="cs-swatch ${isSel ? 'active' : ''}" style="background:${hexCss};" title="${escapeHtml(sw.name)}" data-paint-hex="${sw.hex}" data-pearl-hex="${sw.pearlHex}"></div>`;
      }
      bodyHtml += `</div>`;

      if (mods.paintFinish === 'pearlescent') {
        bodyHtml += `<div class="cs-section-label">3. ÁNH SẮC NGỌC TRAI PHỤ (PEARLESCENT TOPCOAT — MIỄN PHÍ)</div><div class="cs-swatch-grid">`;
        for (const sw of PAINT_COLORS_24.slice(0, 12)) {
          const pHexCss = '#' + sw.pearlHex.toString(16).padStart(6, '0');
          const isPearl = mods.pearlColor === sw.pearlHex;
          bodyHtml += `<div class="cs-swatch ${isPearl ? 'active' : ''}" style="background:${pHexCss};height:26px;" title="Ánh ${escapeHtml(sw.name)}" data-only-pearl="${sw.pearlHex}"></div>`;
        }
        bodyHtml += `</div>`;
      }

      bodyHtml += `<div class="cs-section-label">4. BỘ TEM ĐUA &amp; DECAL THÂN XE 3D (RACING LIVERIES)</div>`;
      for (const lv of LIVERY_OPTIONS) {
        const active = (mods.livery || 'none') === lv.id;
        bodyHtml += `
          <div class="cs-card ${active ? 'equipped' : ''}">
            <div class="cs-card-info">
              <div class="cs-card-name">${escapeHtml(lv.name)}</div>
              <div class="cs-card-desc">${escapeHtml(lv.desc)}</div>
            </div>
            <button class="cs-buy-btn ${active ? 'owned' : ''}" data-mod-key="livery" data-mod-val="${lv.id}" data-price="${lv.price}" type="button">
              ${active ? 'ĐANG DÁN' : (lv.price === 0 ? 'GỠ TEM' : formatMoney(lv.price))}
            </button>
          </div>`;
      }
    } else if (cat === 'underglow') {
      bodyHtml += `<div class="cs-section-label">BỘ ĐÈN GẦM NEON 3D &amp; ÁNH SÁNG PHẢN CHIẾU MẶT ĐƯỜNG</div>`;
      for (const ug of UNDERGLOW_KITS) {
        const active = mods.underglow === ug.id;
        const swatchCss = ug.id === 'none'
          ? '#1e293b'
          : ug.rainbow
            ? 'linear-gradient(135deg,#ff0055,#ffbe0b,#00f5d4,#7209b7)'
            : '#' + ug.hex.toString(16).padStart(6, '0');
        bodyHtml += `
          <div class="cs-card ${active ? 'equipped' : ''}">
            <div style="width:22px;height:22px;border-radius:50%;background:${swatchCss};flex-shrink:0;border:1px solid #fff;"></div>
            <div class="cs-card-info">
              <div class="cs-card-name">${escapeHtml(ug.name)}</div>
              <div class="cs-card-desc">${escapeHtml(ug.desc)}</div>
            </div>
            <button class="cs-buy-btn ${active ? 'owned' : ''}" data-mod-key="underglow" data-mod-val="${ug.id}" data-price="${ug.price}" type="button">
              ${active ? 'ĐÃ LẮP' : (ug.price === 0 ? 'GỠ BỎ' : formatMoney(ug.price))}
            </button>
          </div>`;
      }
    } else if (cat === 'aero') {
      bodyHtml += `<div class="cs-section-label">CÁNH GIÓ KHÍ ĐỘNG HỌC SAU (3D SPOILERS)</div>`;
      for (const sp of SPOILER_OPTIONS) {
        const active = mods.spoiler === sp.id;
        bodyHtml += `
          <div class="cs-card ${active ? 'equipped' : ''}">
            <div class="cs-card-info">
              <div class="cs-card-name">${escapeHtml(sp.name)}</div>
              <div class="cs-card-desc">${escapeHtml(sp.desc)}</div>
            </div>
            <button class="cs-buy-btn ${active ? 'owned' : ''}" data-mod-key="spoiler" data-mod-val="${sp.id}" data-price="${sp.price}" type="button">
              ${active ? 'ĐÃ LẮP' : (sp.price === 0 ? 'ZIN' : formatMoney(sp.price))}
            </button>
          </div>`;
      }

      bodyHtml += `<div class="cs-section-label">CẢN TRƯỚC SỢI CARBON &amp; VÂY CANARD</div>`;
      for (const sl of SPLITTER_OPTIONS) {
        const active = mods.splitter === sl.id;
        bodyHtml += `
          <div class="cs-card ${active ? 'equipped' : ''}">
            <div class="cs-card-info">
              <div class="cs-card-name">${escapeHtml(sl.name)}</div>
              <div class="cs-card-desc">${escapeHtml(sl.desc)}</div>
            </div>
            <button class="cs-buy-btn ${active ? 'owned' : ''}" data-mod-key="splitter" data-mod-val="${sl.id}" data-price="${sl.price}" data-cam-front="1" type="button">
              ${active ? 'ĐÃ LẮP' : (sl.price === 0 ? 'ZIN' : formatMoney(sl.price))}
            </button>
          </div>`;
      }

      bodyHtml += `<div class="cs-section-label">ỐP LƯỜN KHÍ ĐỘNG HỌC 2 BÊN (SIDE SKIRTS)</div>`;
      for (const sk of SKIRT_OPTIONS) {
        const active = mods.skirts === sk.id;
        bodyHtml += `
          <div class="cs-card ${active ? 'equipped' : ''}">
            <div class="cs-card-info">
              <div class="cs-card-name">${escapeHtml(sk.name)}</div>
              <div class="cs-card-desc">${escapeHtml(sk.desc)}</div>
            </div>
            <button class="cs-buy-btn ${active ? 'owned' : ''}" data-mod-key="skirts" data-mod-val="${sk.id}" data-price="${sk.price}" type="button">
              ${active ? 'ĐÃ LẮP' : (sk.price === 0 ? 'ZIN' : formatMoney(sk.price))}
            </button>
          </div>`;
      }
    } else if (cat === 'hood_roof') {
      bodyHtml += `<div class="cs-section-label">NẮP CA-PÔ CARBON &amp; SIÊU NẠP V8 CHROME BLOWER</div>`;
      for (const hd of HOOD_OPTIONS) {
        const active = mods.hood === hd.id;
        bodyHtml += `
          <div class="cs-card ${active ? 'equipped' : ''}">
            <div class="cs-card-info">
              <div class="cs-card-name">${escapeHtml(hd.name)}</div>
              <div class="cs-card-desc">${escapeHtml(hd.desc)}</div>
            </div>
            <button class="cs-buy-btn ${active ? 'owned' : ''}" data-mod-key="hood" data-mod-val="${hd.id}" data-price="${hd.price}" type="button">
              ${active ? 'ĐÃ LẮP' : (hd.price === 0 ? 'ZIN' : formatMoney(hd.price))}
            </button>
          </div>`;
      }

      bodyHtml += `<div class="cs-section-label">HỐC GIÓ NÓC &amp; LAM CHẮN KÍNH SAU LOUVERS</div>`;
      for (const rf of ROOF_OPTIONS) {
        const active = mods.roof === rf.id;
        bodyHtml += `
          <div class="cs-card ${active ? 'equipped' : ''}">
            <div class="cs-card-info">
              <div class="cs-card-name">${escapeHtml(rf.name)}</div>
              <div class="cs-card-desc">${car.isOpenTop && rf.id !== 'none' ? 'Xe mui trần không dùng ốp kính nóc.' : escapeHtml(rf.desc)}</div>
            </div>
            <button class="cs-buy-btn ${active ? 'owned' : ''}" data-mod-key="roof" data-mod-val="${rf.id}" data-price="${rf.price}" type="button">
              ${active ? 'ĐÃ LẮP' : (rf.price === 0 ? 'ZIN' : formatMoney(rf.price))}
            </button>
          </div>`;
      }
    } else if (cat === 'wheels') {
      bodyHtml += `<div class="cs-section-label">MÂM ĐÚC HỢP KIM, HEO BREMBO &amp; LỐP CHỐNG ĐẠN</div>`;
      for (const rm of RIM_FINISHES) {
        const active = mods.rimFinish === rm.id;
        bodyHtml += `
          <div class="cs-card ${active ? 'equipped' : ''}">
            <div class="cs-card-info">
              <div class="cs-card-name">${escapeHtml(rm.name)}</div>
              <div class="cs-card-desc">Hoàn thiện bề mặt mâm PBR + sơn cụm kẹp phanh Brembo thể thao.</div>
            </div>
            <button class="cs-buy-btn ${active ? 'owned' : ''}" data-mod-key="rimFinish" data-mod-val="${rm.id}" data-price="${rm.price}" type="button">
              ${active ? 'ĐÃ LẮP' : (rm.price === 0 ? 'ZIN' : formatMoney(rm.price))}
            </button>
          </div>`;
      }

      const bpOn = Boolean(mods.bulletproofTires);
      bodyHtml += `
        <div class="cs-card ${bpOn ? 'equipped' : ''}">
          <div class="cs-card-info">
            <div class="cs-card-name">🛡️ Lốp Chống Đạn Sợi Kevlar (Bulletproof Tires)</div>
            <div class="cs-card-desc">Miễn nhiễm 100% trước đạn súng và bẫy đinh nổ lốp của cảnh sát Thiên Đình Chấp Pháp 3★!</div>
          </div>
          <button class="cs-buy-btn ${bpOn ? 'owned' : 'gold'}" id="btn-toggle-bptires" type="button">
            ${bpOn ? 'ĐÃ TRANG BỊ' : '$2,500'}
          </button>
        </div>`;

      bodyHtml += `<div class="cs-section-label">PHIM CÁCH NHIỆT KÍNH ĐEN LIMO VIP</div>`;
      for (const wt of WINDOW_TINTS) {
        const active = mods.windowTint === wt.id;
        bodyHtml += `
          <div class="cs-card ${active ? 'equipped' : ''}">
            <div class="cs-card-info">
              <div class="cs-card-name">${escapeHtml(wt.name)}</div>
              <div class="cs-card-desc">Độ xuyên sáng ${Math.round((1 - wt.opacity) * 100)}% chống chói cao cấp.</div>
            </div>
            <button class="cs-buy-btn ${active ? 'owned' : ''}" data-mod-key="windowTint" data-mod-val="${wt.id}" data-price="${wt.price}" type="button">
              ${active ? 'ĐÃ DÁN' : (wt.price === 0 ? 'KÍNH TRONG' : formatMoney(wt.price))}
            </button>
          </div>`;
      }
    } else if (cat === 'performance') {
      bodyHtml += `
        <div class="cs-canvas-box">
          <canvas id="lsc-dyno-canvas"></canvas>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="cs-section-label">BÀN ĐO CÔNG SUẤT DYNO TRỰC TIẾP</span>
          <button id="btn-run-dyno" class="cs-buy-btn gold" type="button">⚡ CHẠY ĐO DYNO 9,000 RPM</button>
        </div>
      `;

      const turboOn = Boolean(mods.twinTurbo);
      const nosOn = Boolean(mods.nosKit);
      bodyHtml += `
        <div class="cs-card ${turboOn ? 'equipped' : ''}">
          <div class="cs-card-info">
            <div class="cs-card-name">🔥 Bộ Tăng Áp Kép Twin-Turbo + Lửa Pô Xanh/Cam</div>
            <div class="cs-card-desc">Thêm tiếng rít Turbo + van xả áp "PSSSHH!" + khè lửa xanh/cam 3D khi sang số &amp; nhả ga!</div>
          </div>
          <button class="cs-buy-btn ${turboOn ? 'owned' : 'gold'}" id="btn-toggle-turbo" type="button">
            ${turboOn ? 'ĐÃ LẮP (TẮT/BẬT)' : '$5,200'}
          </button>
        </div>
        <div class="cs-card ${nosOn ? 'equipped' : ''}">
          <div class="cs-card-info">
            <div class="cs-card-name">💨 Bình Phun Khí Nito Đôi N2O Purge &amp; Boost [Giữ Shift]</div>
            <div class="cs-card-desc">Lắp 2 bình N2O xanh sau ghế, phun khói lạnh 3D ở nắp ca-pô &amp; vọt tốc độ +35% khi đua!</div>
          </div>
          <button class="cs-buy-btn ${nosOn ? 'owned' : 'gold'}" id="btn-toggle-nos" type="button">
            ${nosOn ? 'ĐÃ LẮP (XẢ THỬ)' : '$4,400'}
          </button>
        </div>`;

      bodyHtml += `<div class="cs-section-label">NÂNG CẤP ĐỘNG CƠ EMS CẤP 1–4 (+MAX SPEED &amp; ACCEL)</div>`;
      for (const es of ENGINE_STAGES) {
        const active = (mods.engineStage || 0) === es.level;
        bodyHtml += `
          <div class="cs-card ${active ? 'equipped' : ''}">
            <div class="cs-card-info">
              <div class="cs-card-name">${escapeHtml(es.name)}</div>
              <div class="cs-card-desc">Tốc độ x${es.speedMul.toFixed(2)} • Gia tốc x${es.accelMul.toFixed(2)} (+${es.hpGain} Mã lực)</div>
            </div>
            <button class="cs-buy-btn ${active ? 'owned' : ''}" data-num-key="engineStage" data-num-val="${es.level}" data-price="${es.price}" type="button">
              ${active ? 'ĐANG DÙNG' : (es.price === 0 ? 'ZIN' : formatMoney(es.price))}
            </button>
          </div>`;
      }

      bodyHtml += `<div class="cs-section-label">HỆ THỐNG PHANH ĐUA GỐM CARBON BREMBO</div>`;
      for (const bs of BRAKE_STAGES) {
        const active = (mods.brakesStage || 0) === bs.level;
        bodyHtml += `
          <div class="cs-card ${active ? 'equipped' : ''}">
            <div class="cs-card-info">
              <div class="cs-card-name">${escapeHtml(bs.name)}</div>
              <div class="cs-card-desc">Tăng lực hãm phanh khẩn cấp thêm +${bs.decelBonus} m/s².</div>
            </div>
            <button class="cs-buy-btn ${active ? 'owned' : ''}" data-num-key="brakesStage" data-num-val="${bs.level}" data-price="${bs.price}" type="button">
              ${active ? 'ĐANG DÙNG' : (bs.price === 0 ? 'ZIN' : formatMoney(bs.price))}
            </button>
          </div>`;
      }
    } else if (cat === 'armor_stance') {
      bodyHtml += `<div class="cs-section-label">GIA CƯỜNG GIÁP KHUNG GẦM CẤP 1–4 (TỐI ĐA 2.5X MÁU XE!)</div>`;
      for (const ar of ARMOR_STAGES) {
        const active = (mods.armorStage || 0) === ar.level;
        bodyHtml += `
          <div class="cs-card ${active ? 'equipped' : ''}">
            <div class="cs-card-info">
              <div class="cs-card-name">${escapeHtml(ar.name)}</div>
              <div class="cs-card-desc">Nhân ${ar.hpMul.toFixed(2)}x độ bền khung xe &amp; giảm móp méo va chạm mạnh.</div>
            </div>
            <button class="cs-buy-btn ${active ? 'owned' : ''}" data-num-key="armorStage" data-num-val="${ar.level}" data-price="${ar.price}" type="button">
              ${active ? 'ĐANG DÙNG' : (ar.price === 0 ? 'ZIN' : formatMoney(ar.price))}
            </button>
          </div>`;
      }

      const kurumaOn = Boolean(mods.isArmoredKuruma);
      bodyHtml += `
        <div class="cs-card ${kurumaOn ? 'equipped' : ''}">
          <div class="cs-card-info">
            <div class="cs-card-name">🪖 Tấm Chắn Kính Thép Phong Cách Armored Kuruma</div>
            <div class="cs-card-desc">Ốp tấm thép đục khe bắn quanh kính chắn gió &amp; cửa xe kèm cản húc thép phía trước.</div>
          </div>
          <button class="cs-buy-btn ${kurumaOn ? 'owned' : ''}" id="btn-toggle-kuruma-plates" type="button">
            ${kurumaOn ? 'ĐÃ ỐP (GỠ/BẬT)' : '$3,200'}
          </button>
        </div>`;

      bodyHtml += `<div class="cs-section-label">PHUỘC HẠ GẦM THỂ THAO &amp; GÓC NGHIÊNG BÁNH STANCE</div>`;
      for (const st of STANCE_LEVELS) {
        const active = (mods.stanceLevel || 0) === st.level;
        bodyHtml += `
          <div class="cs-card ${active ? 'equipped' : ''}">
            <div class="cs-card-info">
              <div class="cs-card-name">${escapeHtml(st.name)}</div>
              <div class="cs-card-desc">Hạ thấp trọng tâm xe &amp; tăng độ cứng chống nghiêng thân xe khi ôm cua gắt.</div>
            </div>
            <button class="cs-buy-btn ${active ? 'owned' : ''}" data-num-key="stanceLevel" data-num-val="${st.level}" data-price="${st.price}" type="button">
              ${active ? 'ĐANG DÙNG' : (st.price === 0 ? 'ZIN' : formatMoney(st.price))}
            </button>
          </div>`;
      }
    } else if (cat === 'presets') {
      bodyHtml += `
        <div class="cs-section-label">BIỂN SỐ CÁ NHÂN HÓA SAN ANDREAS ($300)</div>
        <div class="cs-card">
          <input id="lsc-plate-input" class="cs-plate-input" maxlength="8" value="${escapeHtml(car.plate || 'LS7 VIP')}" />
          <div style="display:flex;flex-wrap:wrap;gap:4px;flex:1;">
            ${LICENSE_PLATE_STYLES.map(
              (ps) => `<button class="cs-tab-btn ${(mods.plateStyle || 'sa_classic') === ps.id ? 'active' : ''}" data-plate-style="${ps.id}" type="button">${escapeHtml(ps.name)}</button>`
            ).join('')}
          </div>
        </div>
      `;

      bodyHtml += `<div class="cs-section-label">GÓI ĐỘ TOÀN DIỆN SIGNATURE MASTER BUILDS (1-CLICK)</div>`;
      for (const pb of LSC_SIGNATURE_BUILDS) {
        bodyHtml += `
          <div class="cs-card">
            <div class="cs-card-info">
              <div class="cs-card-name">${escapeHtml(pb.name)}</div>
              <div class="cs-card-desc">${escapeHtml(pb.desc)}</div>
            </div>
            <button class="cs-buy-btn gold" data-sig-build="${pb.id}" type="button">${formatMoney(pb.price)}</button>
          </div>`;
      }
    }

    dom.bodyScroll.innerHTML = bodyHtml;

    // Footer Quick Studio Controls
    dom.footerBar.innerHTML = `
      <button id="lsc-btn-rev" class="cs-tab-btn" type="button">🔥 Nẹt Pô Thử Lửa</button>
      <button id="lsc-btn-repair" class="cs-tab-btn" type="button">🔧 Sửa Xe &amp; Xóa Sao ($250)</button>
      <button id="lsc-btn-save-garage" class="cs-buy-btn gold" type="button">💾 Lưu Vào Gara (${savedGarage.length}/${MAX_GARAGE_SLOTS})</button>
    `;

    // Wire Dyno Canvas if visible
    const dynoCanvas = document.getElementById('lsc-dyno-canvas');
    if (dynoCanvas) {
      renderLSCDynoCanvas(dynoCanvas, car);
    }

    // Wire Event Listeners inside LSC Body
    dom.bodyScroll.querySelectorAll('[data-paint-finish]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const finId = btn.getAttribute('data-paint-finish');
        const price = Number(btn.getAttribute('data-price')) || 0;
        if (mods.paintFinish === finId) return;
        if (!spendPlayerCash(price, `Đã phủ lớp ${finId.toUpperCase()} cao cấp lên thân xe!`)) return;
        applyCarMods(car, { paintFinish: finId });
        shopAudio.playPaintSpray();
        renderCustomsStudio();
      });
    });

    dom.bodyScroll.querySelectorAll('[data-paint-hex]').forEach((sw) => {
      sw.addEventListener('click', () => {
        const hex = Number(sw.getAttribute('data-paint-hex'));
        const pHex = Number(sw.getAttribute('data-pearl-hex'));
        if (mods.paintColor === hex) return;
        if (!spendPlayerCash(250, 'Đã phun màu sơn mới tại phòng sơn LSC!')) return;
        applyCarMods(car, { paintColor: hex, pearlColor: pHex });
        shopAudio.playPaintSpray();
        renderCustomsStudio();
      });
    });

    dom.bodyScroll.querySelectorAll('[data-only-pearl]').forEach((sw) => {
      sw.addEventListener('click', () => {
        const pHex = Number(sw.getAttribute('data-only-pearl'));
        applyCarMods(car, { pearlColor: pHex });
        shopAudio.playPaintSpray();
        renderCustomsStudio();
      });
    });

    dom.bodyScroll.querySelectorAll('[data-mod-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-mod-key');
        const val = btn.getAttribute('data-mod-val');
        const price = Number(btn.getAttribute('data-price')) || 0;
        if (mods[key] === val) return;
        if (price > 0 && !spendPlayerCash(price, 'Đã lắp đặt phụ kiện khí động học 3D lên xe!')) return;
        if (btn.getAttribute('data-cam-front')) {
          state.camTargetYaw = 0.55;
          state.camTargetPitch = 0.16;
          state.camManualHoldTimer = 3.5;
        }
        applyCarMods(car, { [key]: val });
        shopAudio.playImpactWrench();
        renderCustomsStudio();
      });
    });

    dom.bodyScroll.querySelectorAll('[data-num-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-num-key');
        const val = Number(btn.getAttribute('data-num-val')) || 0;
        const price = Number(btn.getAttribute('data-price')) || 0;
        if (mods[key] === val) return;
        const charge = val > (mods[key] || 0) ? price : 0;
        if (charge > 0 && !spendPlayerCash(charge, 'Đã nâng cấp cấu hình hiệu năng cơ khí!')) return;
        applyCarMods(car, { [key]: val }, { fullRepair: key === 'armorStage' });
        shopAudio.playImpactWrench();
        renderCustomsStudio();
      });
    });

    const btnBp = document.getElementById('btn-toggle-bptires');
    if (btnBp) {
      btnBp.addEventListener('click', () => {
        if (!mods.bulletproofTires) {
          if (!spendPlayerCash(2500, 'Đã trang bị Lốp Chống Đạn Kevlar bất tử trước đinh cảnh sát!')) return;
          applyCarMods(car, { bulletproofTires: true });
          shopAudio.playImpactWrench();
          renderCustomsStudio();
        }
      });
    }

    const btnTurbo = document.getElementById('btn-toggle-turbo');
    if (btnTurbo) {
      btnTurbo.addEventListener('click', () => {
        if (!mods.twinTurbo) {
          if (!spendPlayerCash(5200, '🔥 Đã lắp Bộ Tăng Áp Kép Twin-Turbo! Nhấn Nẹt Pô để xem lửa xanh/cam!')) return;
          applyCarMods(car, { twinTurbo: true });
          shopAudio.playBlowOffWhistle(1.2);
          triggerCarBackfireBurst(car, 0.42, 1.2);
        } else {
          applyCarMods(car, { twinTurbo: false });
        }
        renderCustomsStudio();
      });
    }

    const btnNos = document.getElementById('btn-toggle-nos');
    if (btnNos) {
      btnNos.addEventListener('click', () => {
        if (!mods.nosKit) {
          if (!spendPlayerCash(4400, '💨 Đã lắp Bình N2O Đôi! Giữ [Shift Trái] ngoài đường phố để phóng Nitrous!')) return;
          applyCarMods(car, { nosKit: true });
        }
        car._nosPurgeTimer = 1.1;
        state.camTargetYaw = 0.48;
        state.camTargetPitch = 0.22;
        state.camManualHoldTimer = 3.2;
        shopAudio.playPaintSpray();
        shopAudio.playBlowOffWhistle(1.1);
        renderCustomsStudio();
      });
    }

    const btnRunDyno = document.getElementById('btn-run-dyno');
    if (btnRunDyno) {
      btnRunDyno.addEventListener('click', () => {
        dynoSweepActive = true;
        dynoSweepRpm = 900;
        dynoPeakMeasuredHp = 0;
        state.revEngineTimer = 2.4;
        state.camTargetYaw = 2.55;
        state.camTargetPitch = 0.18;
        state.camManualHoldTimer = 3.5;
        shopAudio.playBlowOffWhistle(1.0);
        if (mods.twinTurbo) triggerCarBackfireBurst(car, 0.35, 1.1);
      });
    }

    const btnKurumaPlates = document.getElementById('btn-toggle-kuruma-plates');
    if (btnKurumaPlates) {
      btnKurumaPlates.addEventListener('click', () => {
        if (!mods.isArmoredKuruma) {
          if (!spendPlayerCash(3200, 'Đã ốp bộ giáp kính thép phong cách Armored Kuruma!')) return;
          applyCarMods(car, { isArmoredKuruma: true });
        } else {
          applyCarMods(car, { isArmoredKuruma: false });
        }
        shopAudio.playImpactWrench();
        renderCustomsStudio();
      });
    }

    dom.bodyScroll.querySelectorAll('[data-plate-style]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const inpEl = document.getElementById('lsc-plate-input');
        const txt = inpEl ? inpEl.value : car.plate;
        const stId = btn.getAttribute('data-plate-style');
        if (!spendPlayerCash(300, `Đã dập biển số cá nhân "${txt.toUpperCase()}"!`)) return;
        applyCustomPlateToCar(car, txt, stId);
        state.camTargetYaw = Math.PI;
        state.camTargetPitch = 0.15;
        state.camManualHoldTimer = 3.5;
        shopAudio.playImpactWrench();
        renderCustomsStudio();
      });
    });

    dom.bodyScroll.querySelectorAll('[data-sig-build]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pb = LSC_SIGNATURE_BUILDS.find((b) => b.id === btn.getAttribute('data-sig-build'));
        if (!pb) return;
        if (!spendPlayerCash(pb.price, `Đã hoàn thiện gói độ "${pb.name}"!`)) return;
        applyCarMods(car, pb.mods, { fullRepair: true });
        shopAudio.playPaintSpray();
        shopAudio.playBlowOffWhistle(1.25);
        triggerCarBackfireBurst(car, 0.45, 1.2);
        renderCustomsStudio();
      });
    });

    document.getElementById('lsc-btn-rev')?.addEventListener('click', () => {
      state.revEngineTimer = 1.4;
      state.camTargetYaw = 2.75;
      state.camTargetPitch = 0.14;
      state.camManualHoldTimer = 3.0;
      if (!car.customMods.twinTurbo) {
        shopAudio.playBackfirePop(0.85);
      } else {
        shopAudio.playBlowOffWhistle(1.25);
        triggerCarBackfireBurst(car, 0.42, 1.2);
      }
    });

    document.getElementById('lsc-btn-repair')?.addEventListener('click', () => {
      if (!spendPlayerCash(250, 'Luyện Khí Các: Đã gò hàn phục hồi 100% thân vỏ & xóa sạch sao truy nã!')) return;
      applyCarMods(car, {}, { fullRepair: true });
      if (ctx.gameplay?.wanted) {
        ctx.gameplay.wanted.stars = 0;
        ctx.gameplay.wanted.heat = 0;
      }
      shopAudio.playPaintSpray();
      renderCustomsStudio();
    });

    document.getElementById('lsc-btn-save-garage')?.addEventListener('click', () => {
      saveCarToPersonalGarage(car);
      ctx.audio?.playChime?.();
      notifyPlayer(`💾 Đã lưu bản độ "${car.displayName || car.name}" vào Gara Cá Nhân 6 Chỗ!`, 3.6);
      renderCustomsStudio();
    });
  }

  // ==========================================================================
  // 21. AMMU-NATION TACTICAL STORE & RANGE UI (`openAmmuNation`)
  // ==========================================================================
  const AMMU_TABS = [
    { id: 'weapons', label: '🔫 Vũ Khí & Đạn' },
    { id: 'attachments', label: '🔩 Phụ Kiện & Laser 3D' },
    { id: 'skins', label: '✨ Mạ Vàng & Bạch Kim' },
    { id: 'armor', label: '🛡️ Giáp Kevlar & Y Tế' },
    { id: 'range', label: '🎯 Trường Bắn 45s' }
  ];

  function grantWeaponAndAmmoToPlayer(wId, ammoAmount = 60) {
    const p = ctx.player;
    if (!p) return;
    arsenalState.ownedWeapons[wId] = true;

    if (wId === 'heavy_sniper') {
      arsenalState.sniperAmmo = (arsenalState.sniperAmmo || 0) + ammoAmount;
      state.sniperEquipped = true;
      applyWeaponAttachmentsAndStatsToPlayer();
      persistArsenal();
      return;
    }
    if (wId === 'sticky_bomb') {
      arsenalState.stickyBombCount = (arsenalState.stickyBombCount || 0) + ammoAmount;
      persistArsenal();
      return;
    }

    if (!p.ammo) p.ammo = {};
    if (!p.clip) p.clip = {};
    if (!p.weapons) p.weapons = {};
    p.weapons[wId] = true;

    const def = ctx.characters?.weaponDefs?.[wId];
    if (def && !def.isMelee) {
      p.ammo[wId] = (Number(p.ammo[wId]) || 0) + ammoAmount;
      p.clip[wId] = def.clipSize || 30;
    }
    ctx.characters?.equipWeapon?.(p, wId);
    state.sniperEquipped = false;
    applyWeaponAttachmentsAndStatsToPlayer();
    persistArsenal();
  }

  function openAmmuNation(initialTab = 'weapons') {
    if (!ensureShopsDOM()) return false;
    if (state.rangeActive) stopShootingRange(true);
    releasePointerLockCleanly();

    if (typeof initialTab === 'string' && AMMU_TABS.some((t) => t.id === initialTab)) {
      state.ammuTab = initialTab;
    }
    state.modalOpen = true;
    state.modalMode = 'ammu';
    ctx.activeModal = 'shop';

    dom.panelWrap.className = 'cs-studio-panel theme-ammu';
    dom.overlay.classList.remove('hidden');
    shopAudio.playGunCock();
    renderAmmuNationStudio();
    return true;
  }

  function renderAmmuNationStudio() {
    const p = ctx.player;
    if (!dom.overlay) return;
    refreshCashHeader();

    dom.headerTitle.textContent = 'AMMU-NATION • VŨ KHÍ & TRƯỜNG BẮN';
    dom.headerSub.textContent = arsenalState.rangeReloadFirePerk
      ? '🥇 Xạ Thủ Vàng: Đã kích hoạt vĩnh viễn +15% Tốc Độ Bắn & Nạp Đạn!'
      : 'Trang bị Súng, Ống Giảm Thanh, Laser 3D, Súng Bắn Tỉa .50 BMG & Bom Dính C4';
    dom.orbitHint.textContent = state.inAmmuInterior
      ? '🎯 Đang ở trong Cửa Hàng Thần Binh Các & Trường Bắn 4 Làn (1800, 1800)'
      : '🔫 Bấm [ESC] để đóng quầy vũ khí và thử ngay tia Laser 3D / Bom Dính C4 [X]/[Z]!';

    dom.tabsBar.innerHTML = AMMU_TABS.map(
      (t) => `<button class="cs-tab-btn ${state.ammuTab === t.id ? 'active' : ''}" data-ammu-tab="${t.id}" type="button">${t.label}</button>`
    ).join('');

    dom.tabsBar.querySelectorAll('[data-ammu-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.ammuTab = btn.getAttribute('data-ammu-tab');
        renderAmmuNationStudio();
      });
    });

    let html = '';
    const tab = state.ammuTab;

    if (tab === 'weapons') {
      html += `<div class="cs-section-label">KHO VŨ KHÍ HẠNG NẶNG &amp; GÓI MỞ KHÓA ĐẶC BIỆT</div>`;
      for (const w of AMMU_WEAPONS) {
        const owned = Boolean(arsenalState.ownedWeapons[w.id]);
        let curAmmoStr = '∞';
        if (!w.isMelee) {
          if (w.id === 'heavy_sniper') curAmmoStr = `${arsenalState.sniperAmmo} viên .50`;
          else if (w.id === 'sticky_bomb') curAmmoStr = `${arsenalState.stickyBombCount} quả C4`;
          else curAmmoStr = `${(Number(p?.ammo?.[w.id]) || 0) + (Number(p?.clip?.[w.id]) || 0)} viên`;
        }

        html += `
          <div class="cs-card ${owned ? 'equipped' : ''}">
            <div class="cs-card-info">
              <div class="cs-card-name">${escapeHtml(w.name)} <span style="font-size:10.5px;color:#38bdf8;">[${curAmmoStr}]</span></div>
              <div class="cs-card-desc">${escapeHtml(w.desc)}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
              ${!owned
                ? `<button class="cs-buy-btn ${w.isUnlockPack ? 'gold' : ''}" data-buy-weapon="${w.id}" type="button">MUA ${formatMoney(w.basePrice)}</button>`
                : `<button class="cs-buy-btn owned" data-equip-weapon="${w.id}" type="button">TRANG BỊ</button>`
              }
              ${owned && !w.isMelee
                ? `<button class="cs-tab-btn" data-buy-ammo="${w.id}" type="button">+${w.ammoPack} Đạn (${formatMoney(w.ammoPrice)})</button>`
                : ''
              }
            </div>
          </div>`;
      }
    } else if (tab === 'attachments') {
      const modWeapons = AMMU_WEAPONS.filter((w) => w.supportsAttachments);
      if (!modWeapons.some((w) => w.id === state.selectedWeaponForMod)) {
        state.selectedWeaponForMod = 'carbine';
      }
      const selW = state.selectedWeaponForMod;
      const attObj = arsenalState.attachments[selW] || {};

      html += `
        <div class="cs-section-label">1. CHỌN SÚNG CẦN LẮP PHỤ KIỆN 3D</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;">
          ${modWeapons.map(
            (mw) => `<button class="cs-tab-btn ${selW === mw.id ? 'active' : ''}" data-sel-mod-gun="${mw.id}" type="button">${escapeHtml(mw.name.split(' ')[0] + ' ' + (mw.name.split(' ')[1] || ''))}</button>`
          ).join('')}
        </div>
        <div class="cs-canvas-box">
          <canvas id="ammu-ballistics-canvas"></canvas>
        </div>
        <div class="cs-section-label">2. PHỤ KIỆN TÁC CHIẾN GẮN TRỰC TIẾP LÊN SÚNG 3D</div>
      `;

      for (const att of WEAPON_ATTACHMENTS) {
        if (selW === 'heavy_sniper' && (att.id === 'drum_mag' || att.id === 'holo_scope')) continue;
        const installed = Boolean(attObj[att.id]);
        html += `
          <div class="cs-card ${installed ? 'equipped' : ''}">
            <div class="cs-card-info">
              <div class="cs-card-name">${att.icon} ${escapeHtml(att.name)}</div>
              <div class="cs-card-desc">${escapeHtml(att.desc)}</div>
            </div>
            <button class="cs-buy-btn ${installed ? 'owned' : ''}" data-toggle-att="${att.id}" data-price="${att.price}" type="button">
              ${installed ? 'ĐANG BẬT (THÁO/LẮP)' : formatMoney(att.price)}
            </button>
          </div>`;
      }

      if (attObj.laser_sight) {
        html += `
          <div class="cs-section-label">MÀU TIA LASER CHỈ THỊ 3D TRONG THẾ GIỚI THỰC</div>
          <div style="display:flex;gap:6px;">
            ${LASER_COLORS.map(
              (lc) => `<button class="cs-tab-btn ${(attObj.laserColor || 'red') === lc.id ? 'active' : ''}" data-laser-col="${lc.id}" type="button">${escapeHtml(lc.name)}</button>`
            ).join('')}
          </div>`;
      }
    } else if (tab === 'skins') {
      const modWeapons = AMMU_WEAPONS.filter((w) => w.supportsAttachments);
      const selW = state.selectedWeaponForMod;
      const curSkin = arsenalState.attachments[selW]?.skin || 'gunmetal';

      html += `
        <div class="cs-section-label">CHỌN SÚNG ĐỂ MẠ VÀNG / BẠCH KIM CHẠM KHẮC</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;">
          ${modWeapons.map(
            (mw) => `<button class="cs-tab-btn ${selW === mw.id ? 'active' : ''}" data-sel-mod-gun="${mw.id}" type="button">${escapeHtml(mw.name)}</button>`
          ).join('')}
        </div>
        <div class="cs-section-label">HOÀN THIỆN BỀ MẶT KIM LOẠI &amp; HOA VĂN BAROQUE</div>
      `;

      for (const sk of WEAPON_SKINS) {
        const active = curSkin === sk.id;
        const swHex = '#' + sk.hex.toString(16).padStart(6, '0');
        html += `
          <div class="cs-card ${active ? 'equipped' : ''}">
            <div style="width:24px;height:24px;border-radius:6px;background:${swHex};border:1px solid #fff;flex-shrink:0;"></div>
            <div class="cs-card-info">
              <div class="cs-card-name">${escapeHtml(sk.name)}</div>
              <div class="cs-card-desc">Áp dụng vật liệu kim loại PBR chạm nổi trực tiếp lên mô hình súng trên tay nhân vật.</div>
            </div>
            <button class="cs-buy-btn ${active ? 'owned' : 'gold'}" data-gun-skin="${sk.id}" data-price="${sk.price}" type="button">
              ${active ? 'ĐANG DÙNG' : (sk.price === 0 ? 'MẶC ĐỊNH' : formatMoney(sk.price))}
            </button>
          </div>`;
      }
    } else if (tab === 'armor') {
      html += `<div class="cs-section-label">ÁO GIÁP CHỐNG ĐẠN KEVLAR &amp; TÚI CỨU THƯƠNG TÁC CHIẾN</div>`;
      for (const ar of BODY_ARMOR_TIERS) {
        html += `
          <div class="cs-card">
            <div class="cs-card-info">
              <div class="cs-card-name">🛡️ ${escapeHtml(ar.name)}</div>
              <div class="cs-card-desc">${escapeHtml(ar.desc)}</div>
            </div>
            <button class="cs-buy-btn" data-buy-armor="${ar.id}" type="button">${formatMoney(ar.price)}</button>
          </div>`;
      }
      html += `
        <div class="cs-card">
          <div class="cs-card-info">
            <div class="cs-card-name">💉 Bộ Sơ Cứu Quân Y Adrenaline (Hồi 100% Máu)</div>
            <div class="cs-card-desc">Phục hồi ngay lập tức toàn bộ thanh máu xanh lá trước khi bước vào phi vụ.</div>
          </div>
          <button class="cs-buy-btn" id="btn-ammu-heal" type="button">$200</button>
        </div>`;
    } else if (tab === 'range') {
      html += `
        <div class="cs-card equipped">
          <div class="cs-card-info">
            <div class="cs-card-name">🎯 TRƯỜNG BẮN TÍNH ĐIỂM LIVE RANGE (45 GIÂY)</div>
            <div class="cs-card-desc">
              Bia di động ở 3 cự ly thực tế <b>10m (x1.0) • 20m (x1.5) • 35m (x2.2)</b>.<br/>
              • Headshot: <b>+150đ</b> • Hồng Tâm: <b>+100đ</b> • Chuỗi Combo tối đa <b>x5</b>!<br/>
              • Chú ý: Tránh bắn nhầm bia xanh <i>Dân Thường (-250đ)</i>!<br/>
              • Kỷ lục của bạn: <b style="color:#facc15;">${arsenalState.rangeBestScore.toLocaleString()} điểm</b>
            </div>
          </div>
        </div>
        <div class="cs-card">
          <div class="cs-card-info">
            <div class="cs-card-name">🥉 Huy Chương Đồng (&ge; 1,500 điểm)</div>
            <div class="cs-card-desc">Phần thưởng: +$500 Tiền mặt • Trạng thái: ${arsenalState.rangeMedals.bronze ? '✅ ĐÃ ĐẠT' : 'Chưa đạt'}</div>
          </div>
        </div>
        <div class="cs-card">
          <div class="cs-card-info">
            <div class="cs-card-name">🥈 Huy Chương Bạc (&ge; 3,200 điểm)</div>
            <div class="cs-card-desc">Phần thưởng: +$1,000 &amp; Giáp Hạng Nặng • Trạng thái: ${arsenalState.rangeMedals.silver ? '✅ ĐÃ ĐẠT' : 'Chưa đạt'}</div>
          </div>
        </div>
        <div class="cs-card ${arsenalState.rangeMedals.gold ? 'equipped' : ''}">
          <div class="cs-card-info">
            <div class="cs-card-name">🥇 Huy Chương Vàng (&ge; 5,500 điểm)</div>
            <div class="cs-card-desc">Phần thưởng: <b>+$2,000 + Vĩnh viễn +15% Tốc Độ Bắn &amp; Nạp Đạn!</b> (${arsenalState.rangeMedals.gold ? '✅ ĐÃ MỞ KHÓA PERK' : 'Chưa đạt'})</div>
          </div>
        </div>
        <button id="btn-launch-range-challenge" class="cs-buy-btn gold" style="padding:12px;font-size:14px;" type="button">
          🎯 VÀO BUỒNG BẮN &amp; BẮT ĐẦU THI TÍNH ĐIỂM 45 GIÂY (MIỄN PHÍ ĐẠN!)
        </button>
      `;
    }

    dom.bodyScroll.innerHTML = html;

    dom.footerBar.innerHTML = `
      <button id="ammu-btn-refill-all" class="cs-buy-btn" type="button">⚡ Nạp Đầy Đạn Mọi Súng Đã Sở Hữu ($650)</button>
      <button id="ammu-btn-quick-range" class="cs-tab-btn" type="button">🎯 Thi Trường Bắn Ngay</button>
    `;

    const balCanvas = document.getElementById('ammu-ballistics-canvas');
    if (balCanvas) {
      renderWeaponBallisticsCanvas(balCanvas, state.selectedWeaponForMod);
    }

    // Wire Thần Binh Các Events
    dom.bodyScroll.querySelectorAll('[data-buy-weapon]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wId = btn.getAttribute('data-buy-weapon');
        const spec = AMMU_WEAPONS.find((x) => x.id === wId);
        if (!spec) return;
        if (!spendPlayerCash(spec.basePrice, `🔫 Đã mở khóa & trang bị "${spec.name}"!`)) return;
        grantWeaponAndAmmoToPlayer(wId, spec.ammoPack || 60);
        shopAudio.playGunCock();
        renderAmmuNationStudio();
      });
    });

    dom.bodyScroll.querySelectorAll('[data-equip-weapon]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wId = btn.getAttribute('data-equip-weapon');
        if (wId === 'heavy_sniper') {
          state.sniperEquipped = true;
          notifyPlayer('🔭 Đã cầm Súng Bắn Tỉa Hạng Nặng .50 BMG! Nhấn Chuột Phải để bật ống ngắm Zoom!', 3.2);
        } else if (wId === 'sticky_bomb') {
          notifyPlayer(`💣 Bạn đang có ${arsenalState.stickyBombCount} Bom Dính C4 — Nhấn [X] để ném và [Z] để kích nổ!`, 3.5);
        } else if (ctx.player) {
          state.sniperEquipped = false;
          ctx.characters?.equipWeapon?.(ctx.player, wId);
          notifyPlayer(`Đã trang bị vũ khí: ${wId.toUpperCase()}`, 2.2);
        }
        shopAudio.playGunCock();
        renderAmmuNationStudio();
      });
    });

    dom.bodyScroll.querySelectorAll('[data-buy-ammo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wId = btn.getAttribute('data-buy-ammo');
        const spec = AMMU_WEAPONS.find((x) => x.id === wId);
        if (!spec) return;
        if (!spendPlayerCash(spec.ammoPrice, `Đã mua thêm +${spec.ammoPack} viên đạn cho ${spec.name}!`)) return;
        grantWeaponAndAmmoToPlayer(wId, spec.ammoPack);
        shopAudio.playGunCock();
        renderAmmuNationStudio();
      });
    });

    dom.bodyScroll.querySelectorAll('[data-sel-mod-gun]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedWeaponForMod = btn.getAttribute('data-sel-mod-gun');
        renderAmmuNationStudio();
      });
    });

    dom.bodyScroll.querySelectorAll('[data-toggle-att]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const attId = btn.getAttribute('data-toggle-att');
        const price = Number(btn.getAttribute('data-price')) || 0;
        const wKey = state.selectedWeaponForMod;
        const slot = arsenalState.attachments[wKey];
        if (!slot) return;

        if (!slot[attId]) {
          if (!spendPlayerCash(price, `Đã gắn phụ kiện 3D lên ${wKey.toUpperCase()}!`)) return;
          slot[attId] = true;
        } else {
          slot[attId] = false;
        }
        applyWeaponAttachmentsAndStatsToPlayer();
        persistArsenal();
        shopAudio.playGunCock();
        renderAmmuNationStudio();
      });
    });

    dom.bodyScroll.querySelectorAll('[data-laser-col]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const colId = btn.getAttribute('data-laser-col');
        const slot = arsenalState.attachments[state.selectedWeaponForMod];
        if (slot) {
          slot.laserColor = colId;
          persistArsenal();
          renderAmmuNationStudio();
        }
      });
    });

    dom.bodyScroll.querySelectorAll('[data-gun-skin]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const skinId = btn.getAttribute('data-gun-skin');
        const price = Number(btn.getAttribute('data-price')) || 0;
        const slot = arsenalState.attachments[state.selectedWeaponForMod];
        if (!slot || slot.skin === skinId) return;
        if (price > 0 && !spendPlayerCash(price, '✨ Đã mạ hoàn thiện kim loại quý lên thân súng 3D!')) return;
        slot.skin = skinId;
        applyWeaponAttachmentsAndStatsToPlayer();
        persistArsenal();
        shopAudio.playGunCock();
        renderAmmuNationStudio();
      });
    });

    dom.bodyScroll.querySelectorAll('[data-buy-armor]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tier = BODY_ARMOR_TIERS.find((a) => a.id === btn.getAttribute('data-buy-armor'));
        if (!tier || !ctx.player) return;
        if (!spendPlayerCash(tier.price, `🛡️ Đã mặc ${tier.name}!`)) return;
        if (tier.maxArmorBoost > (arsenalState.maxArmorCap || 100)) {
          arsenalState.maxArmorCap = tier.maxArmorBoost;
          persistArsenal();
        }
        ctx.player.maxArmor = arsenalState.maxArmorCap;
        ctx.player.armor = Math.min(ctx.player.maxArmor, Math.max(ctx.player.armor || 0, tier.armorVal));
        shopAudio.playImpactWrench();
        renderAmmuNationStudio();
      });
    });

    document.getElementById('btn-ammu-heal')?.addEventListener('click', () => {
      if (!ctx.player) return;
      if (!spendPlayerCash(200, '💉 Đã hồi phục 100% Sinh Lực!')) return;
      ctx.player.hp = ctx.player.maxHp || 100;
      renderAmmuNationStudio();
    });

    document.getElementById('btn-launch-range-challenge')?.addEventListener('click', () => {
      startShootingRange();
    });

    document.getElementById('ammu-btn-quick-range')?.addEventListener('click', () => {
      startShootingRange();
    });

    document.getElementById('ammu-btn-refill-all')?.addEventListener('click', () => {
      if (!spendPlayerCash(650, '⚡ Đã nạp đầy ăm-ắp đạn cho toàn bộ kho vũ khí!')) return;
      for (const w of AMMU_WEAPONS) {
        if (!w.isMelee && arsenalState.ownedWeapons[w.id]) {
          grantWeaponAndAmmoToPlayer(w.id, (w.ammoPack || 30) * 3);
        }
      }
      shopAudio.playGunCock();
      renderAmmuNationStudio();
    });
  }

  // ==========================================================================
  // 22. PONSONBYS & SUBURBAN FASHION BOUTIQUE (`openClothing`)
  // ==========================================================================
  const BOUTIQUE_TABS = [
    { id: 'outfits', label: '👔 Trang Phục', camDist: 3.05, lookY: 0.98 },
    { id: 'chains', label: '⛓️ Dây Chuyền', camDist: 2.05, lookY: 1.28 },
    { id: 'watches', label: '⌚ Đồng Hồ', camDist: 2.15, lookY: 1.05 },
    { id: 'hats', label: '🎩 Mũ & Nón Bảo Hiểm', camDist: 1.95, lookY: 1.48 },
    { id: 'shades', label: '🕶️ Kính Mát & Visor', camDist: 1.88, lookY: 1.48 },
    { id: 'masks', label: '🎭 Mặt Nạ Neon & Heist', camDist: 1.90, lookY: 1.46 },
    { id: 'gear', label: '🎒 Túi Tiền & Bộ Sưu Tập', camDist: 2.95, lookY: 1.02 }
  ];

  const BOUTIQUE_LOOKBOOKS = [
    {
      id: 'diamond_casino_don',
      name: '👑 Ông Trùm Sòng Bạc Diamond VIP',
      price: 8200,
      desc: 'Vest Trắng Bố Già + Dây Chuyền Kim Cương ($) + Đồng Hồ Crowex Vàng 24K + Mũ Fedora + Kính Phi Công Vàng!',
      cfg: {
        outfitId: 'vice_white_boss',
        chainId: 'diamond_dollar',
        watchId: 'crowex_gold',
        hatId: 'fedora_boss',
        shadesId: 'gold_aviator',
        maskId: 'none',
        gearId: 'vip_gold_briefcase'
      }
    },
    {
      id: 'purge_neon_phantom',
      name: '💀 Bóng Ma Đua Đêm Mặt Nạ Đầu Lâu Neon',
      price: 6900,
      desc: 'Giáp Đêm Cyber Neon + Mặt Nạ Đầu Lâu Phát Sáng Đổi Màu + Vòng Tay Hologram + Túi Vàng Phi Vụ!',
      cfg: {
        outfitId: 'cyber_neon_runner',
        chainId: 'emerald_medallion',
        watchId: 'holo_wrist',
        hatId: 'none',
        shadesId: 'none',
        maskId: 'neon_skull',
        gearId: 'heist_duffel'
      }
    },
    {
      id: 'bank_heist_specops',
      name: '🪖 Đặc Nhiệm Đột Kích Ngân Hàng NVG',
      price: 7400,
      desc: 'Bộ Đột Kích Đu Dây + Mũ Chống Đạn Kính Nhìn Đêm 4 Ống NVG + Mặt Nạ Thép + Túi Đựng Vàng Pacific!',
      cfg: {
        outfitId: 'tactical_heist',
        chainId: 'military_dogtags',
        watchId: 'holo_wrist',
        hatId: 'nvg_specops_helmet',
        shadesId: 'none',
        maskId: 'ballistic_kevlar',
        gearId: 'heist_duffel'
      }
    },
    {
      id: 'oni_yakuza_lord',
      name: '👹 Thủ Lĩnh Samurai Quỷ Đỏ Oni',
      price: 7800,
      desc: 'Vest Nhung Đỏ Hoàng Gia + Mặt Nạ Quỷ Oni Sừng Vàng + Dây Chuyền Vàng Cuban 24K + Đồng Hồ Vàng Hồng!',
      cfg: {
        outfitId: 'crimson_velvet_vip',
        chainId: 'cuban_gold',
        watchId: 'rose_chrono',
        hatId: 'none',
        shadesId: 'none',
        maskId: 'oni_samurai',
        gearId: 'none'
      }
    },
    {
      id: 'gp_superbike_racer',
      name: '🏍️ Tay Đua Siêu Mô-Tô Bati 801RR Carbon',
      price: 5200,
      desc: 'Áo Khoác Da Biker Đen Đỏ + Mũ Bảo Hiểm Full-Face Carbon Kính Vàng + Đồng Hồ Bạch Kim!',
      cfg: {
        outfitId: 'biker_leather_rebel',
        chainId: 'cuban_gold',
        watchId: 'platinum_diver',
        hatId: 'moto_carbon_helmet',
        shadesId: 'none',
        maskId: 'none',
        gearId: 'none'
      }
    }
  ];

  function focusClothingCameraForTab(tabId) {
    const t = BOUTIQUE_TABS.find((x) => x.id === tabId) || BOUTIQUE_TABS[0];
    state.camTargetDist = t.camDist;
    state.camLookOffsetY = t.lookY;
    state.camTargetPitch = 0.12;
    // Face front of character (`player.yaw`) so mirror camera sees face, chest, chains & masks!
    const pYaw = ctx.player?.yaw || 0;
    state.camTargetYaw = wrapAngle(pYaw);
    state.camManualHoldTimer = 5.0;
  }

  function openClothing(initialTab = 'outfits') {
    if (!ensureShopsDOM()) return false;
    const p = ctx.player;
    if (!p) return false;
    if (p.inCar && ctx.vehicles?.exitVehicle) {
      ctx.vehicles.exitVehicle();
    }
    if (state.rangeActive) stopShootingRange(true);
    releasePointerLockCleanly();

    if (typeof initialTab === 'string' && BOUTIQUE_TABS.some((t) => t.id === initialTab)) {
      state.clothingTab = initialTab;
    }

    if (p.mesh) {
      p.mesh.visible = true;
      ctx.characters?.animateHumanoid?.(p.rig, 'idle', 0.016);
    }

    state.modalOpen = true;
    state.modalMode = 'clothing';
    state.camAutoSpin = false;
    ctx.activeModal = 'shop';

    focusClothingCameraForTab(state.clothingTab);
    dom.panelWrap.className = 'cs-studio-panel theme-clothing';
    dom.overlay.classList.remove('hidden');
    ctx.audio?.playChime?.();
    renderClothingStudio();
    return true;
  }

  function renderBoutiqueItemList(items, stateProp, prefixKey) {
    return items.map((item) => {
      const unlockKey = `${prefixKey}_${item.id}`;
      const isOwned = item.price === 0 || Boolean(wardrobeState.unlockedItems[unlockKey]);
      const isEquipped = wardrobeState[stateProp] === item.id;

      return `
        <div class="cs-card ${isEquipped ? 'equipped' : ''}">
          <div class="cs-card-info">
            <div class="cs-card-name">${escapeHtml(item.name)}</div>
            ${item.desc ? `<div class="cs-card-desc">${escapeHtml(item.desc)}</div>` : ''}
          </div>
          <button
            class="cs-buy-btn ${isEquipped ? 'owned' : (!isOwned && item.price >= 2500 ? 'gold' : '')}"
            data-wardrobe-prop="${stateProp}"
            data-wardrobe-id="${item.id}"
            data-unlock-key="${unlockKey}"
            data-price="${isOwned ? 0 : item.price}"
            type="button"
          >
            ${isEquipped ? 'ĐANG MẶC' : isOwned ? 'MẶC NGAY' : formatMoney(item.price)}
          </button>
        </div>
      `;
    }).join('');
  }

  function renderClothingStudio() {
    if (!dom.overlay) return;
    refreshCashHeader();

    dom.headerTitle.textContent = 'PONSONBYS & SUBURBAN BOUTIQUE';
    dom.headerSub.textContent = 'Phối Đồ Thượng Lưu, Dây Chuyền 24K, Đồng Hồ Crowex & Mặt Nạ Neon 3D';
    dom.orbitHint.textContent = '🖱️ Kéo chuột để xoay Nhân Vật 360° • Cuộn chuột để soi cận cảnh Mặt Nạ, Kính & Đồng Hồ!';

    dom.tabsBar.innerHTML = BOUTIQUE_TABS.map(
      (t) => `<button class="cs-tab-btn ${state.clothingTab === t.id ? 'active' : ''}" data-cloth-tab="${t.id}" type="button">${t.label}</button>`
    ).join('');

    dom.tabsBar.querySelectorAll('[data-cloth-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.clothingTab = btn.getAttribute('data-cloth-tab');
        focusClothingCameraForTab(state.clothingTab);
        renderClothingStudio();
      });
    });

    let html = '';
    const tab = state.clothingTab;

    if (tab === 'outfits') {
      html += `<div class="cs-section-label">TRANG PHỤC THIẾT KẾ RIÊNG PONSONBYS &amp; SUBURBAN</div>`;
      html += renderBoutiqueItemList(BOUTIQUE_OUTFITS, 'outfitId', 'outfit');
    } else if (tab === 'chains') {
      html += `<div class="cs-section-label">DÂY CHUYỀN VÀNG 24K, MẶT ĐÔ-LA KIM CƯƠNG &amp; THẺ BÀI</div>`;
      html += renderBoutiqueItemList(BOUTIQUE_CHAINS, 'chainId', 'chain');
    } else if (tab === 'watches') {
      html += `<div class="cs-section-label">ĐỒNG HỒ CROWEX THƯỢNG LƯU &amp; VÒNG TAY HOLOGRAM (CỔ TAY TRÁI)</div>`;
      html += renderBoutiqueItemList(BOUTIQUE_WATCHES, 'watchId', 'watch');
    } else if (tab === 'hats') {
      html += `<div class="cs-section-label">MŨ PHỚT, NÓN ĐUA CARBON, KÍNH NHÌN ĐÊM NVG &amp; VƯƠNG MIỆN</div>`;
      html += renderBoutiqueItemList(BOUTIQUE_HATS, 'hatId', 'hat');
    } else if (tab === 'shades') {
      html += `<div class="cs-section-label">KÍNH PHI CÔNG GỌNG VÀNG AVIATOR &amp; KÍNH ĐÈN NEON</div>`;
      html += renderBoutiqueItemList(BOUTIQUE_SHADES, 'shadesId', 'shades');
    } else if (tab === 'masks') {
      html += `<div class="cs-section-label">MẶT NẠ ĐẦU LÂU NEON, QUỶ ONI, CÁO VÀNG &amp; MẶT NẠ PHI VỤ</div>`;
      html += renderBoutiqueItemList(BOUTIQUE_MASKS, 'maskId', 'mask');
    } else if (tab === 'gear') {
      html += `<div class="cs-section-label">PHỤ KIỆN PHI VỤ (TÚI ĐỰNG VÀNG, GIÁP THÉP &amp; VALI TRIỆU ĐÔ)</div>`;
      html += renderBoutiqueItemList(BOUTIQUE_GEAR, 'gearId', 'gear');

      html += `<div class="cs-section-label">BỘ SƯU TẬP PHỐI SẴN LOOKBOOK VIP (1-CLICK TRỌN BỘ)</div>`;
      for (const lb of BOUTIQUE_LOOKBOOKS) {
        html += `
          <div class="cs-card">
            <div class="cs-card-info">
              <div class="cs-card-name">${escapeHtml(lb.name)}</div>
              <div class="cs-card-desc">${escapeHtml(lb.desc)}</div>
            </div>
            <button class="cs-buy-btn gold" data-lookbook-id="${lb.id}" type="button">${formatMoney(lb.price)}</button>
          </div>`;
      }
    }

    dom.bodyScroll.innerHTML = html;

    dom.footerBar.innerHTML = `
      <button id="cloth-btn-spin-front" class="cs-tab-btn" type="button">🧍 Nhìn Chính Diện</button>
      <button id="cloth-btn-spin-back" class="cs-tab-btn" type="button">🎒 Soi Sau Lưng</button>
      <button id="cloth-btn-clear-acc" class="cs-tab-btn" type="button">✨ Tháo Hết Phụ Kiện</button>
    `;

    dom.bodyScroll.querySelectorAll('[data-wardrobe-prop]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prop = btn.getAttribute('data-wardrobe-prop');
        const itemId = btn.getAttribute('data-wardrobe-id');
        const unlockKey = btn.getAttribute('data-unlock-key');
        const price = Number(btn.getAttribute('data-price')) || 0;

        if (price > 0) {
          if (!spendPlayerCash(price, '✨ Đã mua & mặc trang phục/phụ kiện mới từ Tiên Y Các!')) return;
          wardrobeState.unlockedItems[unlockKey] = true;
        }
        wardrobeState[prop] = itemId;
        applyWardrobeToRig();
        persistWardrobe();
        ctx.audio?.playChime?.();
        renderClothingStudio();
      });
    });

    dom.bodyScroll.querySelectorAll('[data-lookbook-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lb = BOUTIQUE_LOOKBOOKS.find((x) => x.id === btn.getAttribute('data-lookbook-id'));
        if (!lb) return;
        if (!spendPlayerCash(lb.price, `👑 Đã khoác trọn bộ sưu tập "${lb.name}"!`)) return;
        Object.assign(wardrobeState, lb.cfg);
        wardrobeState.unlockedItems[`outfit_${lb.cfg.outfitId}`] = true;
        wardrobeState.unlockedItems[`chain_${lb.cfg.chainId}`] = true;
        wardrobeState.unlockedItems[`watch_${lb.cfg.watchId}`] = true;
        wardrobeState.unlockedItems[`hat_${lb.cfg.hatId}`] = true;
        wardrobeState.unlockedItems[`shades_${lb.cfg.shadesId}`] = true;
        wardrobeState.unlockedItems[`mask_${lb.cfg.maskId}`] = true;
        wardrobeState.unlockedItems[`gear_${lb.cfg.gearId}`] = true;
        applyWardrobeToRig();
        persistWardrobe();
        shopAudio.playMedalFanfare('silver');
        renderClothingStudio();
      });
    });

    document.getElementById('cloth-btn-spin-front')?.addEventListener('click', () => {
      state.camTargetYaw = wrapAngle(ctx.player?.yaw || 0);
      state.camManualHoldTimer = 5.0;
    });

    document.getElementById('cloth-btn-spin-back')?.addEventListener('click', () => {
      state.camTargetYaw = wrapAngle((ctx.player?.yaw || 0) + Math.PI);
      state.camManualHoldTimer = 5.0;
    });

    document.getElementById('cloth-btn-clear-acc')?.addEventListener('click', () => {
      wardrobeState.chainId = 'none';
      wardrobeState.watchId = 'none';
      wardrobeState.hatId = 'none';
      wardrobeState.shadesId = 'none';
      wardrobeState.maskId = 'none';
      wardrobeState.gearId = 'none';
      applyWardrobeToRig();
      persistWardrobe();
      renderClothingStudio();
    });
  }

  // ==========================================================================
  // 23. LEGENDARY MOTORSPORT DEALERSHIP & 6-CAR PERSONAL GARAGE (`openDealership`)
  // ==========================================================================
  let selectedDealershipPaintHex = 0xffc300;

  function renderDealershipRadarCanvas(canvasEl, itemSpec) {
    if (!canvasEl || !itemSpec) return;
    const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    const cssW = canvasEl.clientWidth || 340;
    const cssH = canvasEl.clientHeight || 132;
    if (canvasEl.width !== Math.round(cssW * dpr) || canvasEl.height !== Math.round(cssH * dpr)) {
      canvasEl.width = Math.round(cssW * dpr);
      canvasEl.height = Math.round(cssH * dpr);
    }

    const g = canvasEl.getContext('2d');
    g.save();
    g.scale(dpr, dpr);
    g.fillStyle = 'rgba(10, 14, 24, 0.94)';
    g.fillRect(0, 0, cssW, cssH);

    // 5-Axis Pentagon Radar on Left + Technical Spec Card on Right
    const cx = 78;
    const cy = cssH * 0.54;
    const maxR = 46;
    const axes = [
      { label: 'TỐC ĐỘ', val: clamp((itemSpec.topSpeedKmh || 300) / 380, 0.4, 1.0) },
      { label: 'GIA TỐC', val: itemSpec.id === 'zentorno' ? 0.98 : itemSpec.id === 'superbike' ? 0.95 : 0.84 },
      { label: 'BÁM ĐƯỜNG', val: itemSpec.id === 'heli' ? 0.88 : (itemSpec.presetMods?.spoiler ? 0.92 : 0.78) },
      { label: 'ĐỘ CƠ ĐỘNG', val: itemSpec.id === 'superbike' || itemSpec.id === 'heli' ? 0.97 : 0.82 },
      { label: 'GIÁP BẢO VỆ', val: itemSpec.id === 'armored_kuruma' ? 1.0 : itemSpec.id === 'heli' ? 0.86 : 0.68 }
    ];

    for (const ringFrac of [0.35, 0.68, 1.0]) {
      g.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI * 0.5 + (i * Math.PI * 2) / 5;
        const px = cx + Math.cos(ang) * maxR * ringFrac;
        const py = cy + Math.sin(ang) * maxR * ringFrac;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.stroke();
    }

    g.fillStyle = 'rgba(250, 204, 21, 0.26)';
    g.strokeStyle = '#facc15';
    g.lineWidth = 2.2;
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI * 0.5 + (i * Math.PI * 2) / 5;
      const px = cx + Math.cos(ang) * maxR * axes[i].val;
      const py = cy + Math.sin(ang) * maxR * axes[i].val;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
    g.stroke();

    // Spec sheet text on Right
    const tx = 152;
    g.fillStyle = '#facc15';
    g.font = '800 11px "Segoe UI", sans-serif';
    g.fillText(itemSpec.brand || 'LEGENDARY MOTORSPORT', tx, 24);

    g.fillStyle = '#f8fafc';
    g.font = '900 14px "Segoe UI", sans-serif';
    g.fillText(itemSpec.name, tx, 44);

    g.fillStyle = '#cbd5e1';
    g.font = '600 11px "Segoe UI", sans-serif';
    g.fillText(`• Vận tốc đỉnh: ${itemSpec.topSpeedKmh} KM/H`, tx, 66);
    g.fillText(`• Tăng tốc 0–100: ${itemSpec.zeroTo100}`, tx, 84);
    g.fillText(`• Công suất máy: ${itemSpec.hp} Mã Lực`, tx, 102);
    g.fillStyle = '#4ade80';
    g.font = '800 11px "Segoe UI", sans-serif';
    g.fillText(`• Bảo hiểm Gara 6 Chỗ: TRỌN ĐỜI`, tx, 120);

    g.restore();
  }

  function openDealership(initialTab = 'showroom') {
    if (!ensureShopsDOM()) return false;
    if (state.rangeActive) stopShootingRange(true);
    releasePointerLockCleanly();

    if (initialTab === 'showroom' || initialTab === 'garage') {
      state.dealershipTab = initialTab;
    }

    state.modalOpen = true;
    state.modalMode = 'dealership';
    state.camAutoSpin = true;
    state.camOrbitDist = 6.6;
    state.camTargetDist = 6.6;
    state.camTargetPitch = 0.25;
    state.camLookOffsetY = 0.72;
    ctx.activeModal = 'shop';

    dom.panelWrap.className = 'cs-studio-panel theme-dealership';
    dom.overlay.classList.remove('hidden');
    ctx.audio?.playChime?.();
    renderDealershipStudio();
    return true;
  }

  function renderDealershipStudio() {
    if (!dom.overlay) return;
    refreshCashHeader();

    dom.headerTitle.textContent = 'LEGENDARY MOTORSPORT & GARA 6 CHỖ';
    dom.headerSub.textContent = `Showroom Siêu Xe Nhập Khẩu • Đang lưu ${savedGarage.length}/${MAX_GARAGE_SLOTS} Xe Cá Nhân`;
    dom.orbitHint.textContent = '🏎️ Bàn Xoay Showroom 3D Trực Tiếp • Mua xe sẽ tự động lưu vào Gara Cá Nhân & giao tới tận nơi!';

    dom.tabsBar.innerHTML = `
      <button class="cs-tab-btn ${state.dealershipTab === 'showroom' ? 'active' : ''}" data-dealer-tab="showroom" type="button">🏎️ Showroom Siêu Xe Ngoại Nhập (6 Mẫu)</button>
      <button class="cs-tab-btn ${state.dealershipTab === 'garage' ? 'active' : ''}" data-dealer-tab="garage" type="button">🏠 Gara Cá Nhân Đã Lưu (${savedGarage.length}/${MAX_GARAGE_SLOTS})</button>
    `;

    dom.tabsBar.querySelectorAll('[data-dealer-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.dealershipTab = btn.getAttribute('data-dealer-tab');
        renderDealershipStudio();
      });
    });

    let html = '';

    if (state.dealershipTab === 'showroom') {
      const selSpec = DEALERSHIP_CATALOG.find((d) => d.id === state.selectedDealershipId) || DEALERSHIP_CATALOG[2];

      html += `
        <div class="cs-canvas-box">
          <canvas id="dealer-radar-canvas"></canvas>
        </div>
        <div class="cs-section-label">CHỌN MÀU SƠN GIAO XE NGAY TẠI SHOWROOM (MIỄN PHÍ)</div>
        <div class="cs-swatch-grid">
          ${PAINT_COLORS_24.slice(0, 12).map((sw) => {
            const hexCss = '#' + sw.hex.toString(16).padStart(6, '0');
            return `<div class="cs-swatch ${selectedDealershipPaintHex === sw.hex ? 'active' : ''}" style="background:${hexCss};height:26px;" title="${escapeHtml(sw.name)}" data-dealer-color="${sw.hex}"></div>`;
          }).join('')}
        </div>
        <div class="cs-section-label">DANH MỤC SIÊU XE, XE BỌC THÉP, MÔ-TÔ GP &amp; TRỰC THĂNG VIP</div>
      `;

      for (const item of DEALERSHIP_CATALOG) {
        const isSel = item.id === selSpec.id;
        html += `
          <div class="cs-card ${isSel ? 'equipped' : ''}" data-select-dealer-car="${item.id}" style="cursor:pointer;">
            <div class="cs-card-info">
              <div class="cs-card-name">${escapeHtml(item.name)} <span style="font-size:10px;color:#facc15;">[${escapeHtml(item.category)}]</span></div>
              <div class="cs-card-desc">${escapeHtml(item.desc)}</div>
            </div>
            <button class="cs-buy-btn gold" data-buy-dealer-car="${item.id}" type="button">
              MUA ${formatMoney(item.price)}
            </button>
          </div>
        `;
      }
    } else {
      html += `<div class="cs-section-label">GARA CÁ NHÂN 6 CHỖ (LƯU TRỮ BẢN ĐỘ VĨNH VIỄN TRONG LOCALSTORAGE)</div>`;

      if (savedGarage.length === 0) {
        html += `
          <div class="cs-card">
            <div class="cs-card-info">
              <div class="cs-card-name">Gara hiện đang trống</div>
              <div class="cs-card-desc">Hãy mua siêu xe bên tab Showroom hoặc mang bất kỳ chiếc xe nào vào Luyện Khí Các nhấn "Lưu Vào Gara"!</div>
            </div>
          </div>`;
      } else {
        savedGarage.forEach((slot, idx) => {
          const m = slot.mods || {};
          const finishLbl = (PAINT_FINISHES.find((f) => f.id === m.paintFinish)?.badge) || 'GLOSS';
          const turboLbl = m.twinTurbo ? ' • 🔥 Twin-Turbo' : '';
          const ugLbl = m.underglow && m.underglow !== 'none' ? ` • 💡 Neon ${m.underglow.toUpperCase()}` : '';
          const armLbl = m.armorStage > 0 ? ` • 🛡️ Giáp Cấp ${m.armorStage}` : '';
          const sellVal = Math.round((slot.value || 18000) * 0.65);

          html += `
            <div class="cs-card equipped">
              <div class="cs-card-info">
                <div class="cs-card-name">#${idx + 1} ${escapeHtml(slot.customName)} <span style="font-size:10.5px;color:#fde047;">[${escapeHtml(slot.plate || 'LS7 VIP')}]</span></div>
                <div class="cs-card-desc">
                  Sơn ${finishLbl} • EMS Cấp ${m.engineStage || 0}${turboLbl}${ugLbl}${armLbl}
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
                <button class="cs-buy-btn gold" data-summon-slot="${idx}" type="button">🚗 TRIỆU HỒI NGAY</button>
                <div style="display:flex;gap:4px;">
                  <button class="cs-tab-btn" data-tune-slot="${idx}" type="button">🔧 Độ LSC</button>
                  <button class="cs-tab-btn" data-sell-slot="${idx}" type="button">💰 Bán ${formatMoney(sellVal)}</button>
                </div>
              </div>
            </div>
          `;
        });
      }
    }

    dom.bodyScroll.innerHTML = html;

    dom.footerBar.innerHTML = `
      <button id="dealer-btn-save-current" class="cs-tab-btn" type="button">💾 Cất Xe Đang Lái</button>
      <button id="dealer-btn-walk-garage" class="cs-buy-btn gold" type="button">🏠 Bước Vào Gara 3D 6 Chỗ</button>
      <button id="dealer-btn-open-lsc" class="cs-buy-btn" type="button">🔧 Xưởng Độ LSC</button>
    `;

    const radarCanvas = document.getElementById('dealer-radar-canvas');
    if (radarCanvas) {
      const selSpec = DEALERSHIP_CATALOG.find((d) => d.id === state.selectedDealershipId) || DEALERSHIP_CATALOG[2];
      renderDealershipRadarCanvas(radarCanvas, selSpec);
    }

    dom.bodyScroll.querySelectorAll('[data-dealer-color]').forEach((sw) => {
      sw.addEventListener('click', () => {
        selectedDealershipPaintHex = Number(sw.getAttribute('data-dealer-color'));
        // Tint turntable display car live!
        if (dealershipPodiumGroup) {
          dealershipPodiumGroup.traverse((m) => {
            if (m.isMesh && m.material === shopMats.gold24k) {
              if (!m.userData._podiumCloned) {
                m.material = m.material.clone();
                m.userData._podiumCloned = true;
              }
              m.material.color.setHex(selectedDealershipPaintHex);
            }
          });
        }
        renderDealershipStudio();
      });
    });

    dom.bodyScroll.querySelectorAll('[data-select-dealer-car]').forEach((card) => {
      card.addEventListener('click', (ev) => {
        if (ev.target && ev.target.closest('button')) return;
        state.selectedDealershipId = card.getAttribute('data-select-dealer-car');
        renderDealershipStudio();
      });
    });

    dom.bodyScroll.querySelectorAll('[data-buy-dealer-car]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const item = DEALERSHIP_CATALOG.find((d) => d.id === btn.getAttribute('data-buy-dealer-car'));
        if (!item) return;
        if (!spendPlayerCash(item.price, `🎉 Chúc mừng! Bạn đã tậu siêu phẩm "${item.name}"!`)) return;

        const customMods = {
          ...createDefaultModConfig(selectedDealershipPaintHex || item.defaultColor),
          ...(item.presetMods || {}),
          paintColor: selectedDealershipPaintHex || item.presetMods?.paintColor || item.defaultColor,
          plate: `VIP ${Math.floor(100 + Math.random() * 899)}`
        };

        const spot = findClearSummonSpotNearPlayer();
        const spawned = spawnConfiguredVehicle(
          item.spawnType,
          item.fallbackType || 'obey9f',
          spot.x,
          spot.y,
          spot.z,
          spot.yaw,
          customMods,
          item.name
        );

        if (spawned) {
          saveCarToPersonalGarage(spawned, item.name);
          const slotRec = savedGarage.find((g) => g.slotId === spawned.garageSlotId);
          if (slotRec) {
            slotRec.value = item.price;
            slotRec.catalogId = item.id;
            persistGarage();
          }
          shopAudio.playMedalFanfare('gold');
          closeModal();
          // Seat player or highlight vehicle right in front of them!
          notifyPlayer(`🏎️ "${item.name}" đã được giao cách bạn 7m và đăng ký bảo hiểm vào Gara Cá Nhân!`, 4.8);
        }
      });
    });

    dom.bodyScroll.querySelectorAll('[data-summon-slot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-summon-slot'));
        summonGarageCar(idx);
      });
    });

    dom.bodyScroll.querySelectorAll('[data-tune-slot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-tune-slot'));
        const spawned = summonGarageCar(idx);
        if (spawned) {
          if (ctx.vehicles?.enterVehicle && !ctx.player?.inCar) {
            ctx.vehicles.enterVehicle(spawned);
          }
          openCustoms(spawned);
        }
      });
    });

    dom.bodyScroll.querySelectorAll('[data-sell-slot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-sell-slot'));
        const entry = savedGarage[idx];
        if (!entry) return;
        const refund = Math.round((entry.value || 18000) * 0.65);
        if (entry._liveCarRef && ctx.vehicles?.removeVehicle && ctx.player?.inCar !== entry._liveCarRef) {
          ctx.vehicles.removeVehicle(entry._liveCarRef);
        }
        savedGarage.splice(idx, 1);
        persistGarage();
        if (ctx.player) {
          if (ctx?.antiCheat?.commitCash) ctx.antiCheat.commitCash(getPlayerCash() + refund);
          else ctx.player.cash = getPlayerCash() + refund;
        }
        ctx.audio?.playCash?.();
        notifyPlayer(`💰 Đã sang nhượng "${entry.customName}" thu về +${formatMoney(refund)}!`, 3.5);
        renderDealershipStudio();
      });
    });

    document.getElementById('dealer-btn-save-current')?.addEventListener('click', () => {
      const curCar = ctx.player?.inCar || (ctx.player && ctx.vehicles?.findNearestEnterable?.(ctx.player.x, ctx.player.z, 8.0));
      if (!curCar) {
        notifyPlayer('Bạn cần đang lái hoặc đứng cạnh một chiếc xe để đưa vào Gara Cá Nhân!', 3.0);
        return;
      }
      saveCarToPersonalGarage(curCar);
      ctx.audio?.playChime?.();
      notifyPlayer(`💾 Đã đăng ký "${curCar.displayName || curCar.name}" vào Gara Cá Nhân 6 Chỗ!`, 3.5);
      state.dealershipTab = 'garage';
      renderDealershipStudio();
    });

    document.getElementById('dealer-btn-walk-garage')?.addEventListener('click', () => {
      enterPersonalGarage();
    });

    document.getElementById('dealer-btn-open-lsc')?.addEventListener('click', () => {
      let targetCar = ctx.player?.inCar;
      if (!targetCar && savedGarage.length > 0) {
        targetCar = summonGarageCar(0);
      }
      if (targetCar) {
        openCustoms(targetCar);
      } else {
        closeModal();
        notifyPlayer('Hãy mua hoặc lên một chiếc xe trước khi vào Xưởng Độ LSC!', 3.2);
      }
    });
  }

  // ==========================================================================
  // 23B. WALK-IN 3D 6-CAR PERSONAL LUXURY SHOWROOM GARAGE AT `(1844, 0, 1800)`
  // ==========================================================================
  const GARAGE_BAY_SPOTS = [
    { x: 1837.6, z: 1793.4, yaw: 0.48 },
    { x: 1837.6, z: 1800.0, yaw: 0.48 },
    { x: 1837.6, z: 1806.6, yaw: 0.48 },
    { x: 1850.4, z: 1793.4, yaw: -0.48 },
    { x: 1850.4, z: 1800.0, yaw: -0.48 },
    { x: 1850.4, z: 1806.6, yaw: -0.48 }
  ];
  const garageDisplayGroup = new THREE.Group();
  garageDisplayGroup.name = 'Garage6CarModels';

  function buildPersonalGarageInterior() {
    const mats = ensureShopMaterials();

    const epoxyMat = new THREE.MeshPhysicalMaterial({
      color: 0xeef2f7,
      metalness: 0.14,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03
    });
    const floor = new THREE.Mesh(shopGeos.box, epoxyMat);
    floor.scale.set(26.4, 0.12, 24.4);
    floor.position.set(1844, -0.01, 1800);
    floor.receiveShadow = true;

    const ceil = new THREE.Mesh(shopGeos.box, mats.matteBlack);
    ceil.scale.set(26.6, 0.28, 24.6);
    ceil.position.set(1844, 5.45, 1800);

    const wNorth = new THREE.Mesh(shopGeos.box, mats.concreteWall);
    wNorth.scale.set(26.6, 5.5, 0.45);
    wNorth.position.set(1844, 2.7, 1787.9);

    const wSouth = new THREE.Mesh(shopGeos.box, mats.concreteWall);
    wSouth.scale.set(26.6, 5.5, 0.45);
    wSouth.position.set(1844, 2.7, 1812.1);

    const wWest = new THREE.Mesh(shopGeos.box, mats.concreteWall);
    wWest.scale.set(0.45, 5.5, 24.4);
    wWest.position.set(1830.9, 2.7, 1800);

    const wEast = new THREE.Mesh(shopGeos.box, mats.concreteWall);
    wEast.scale.set(0.45, 5.5, 24.4);
    wEast.position.set(1857.1, 2.7, 1800);

    personalGarageRoot.add(floor, ceil, wNorth, wSouth, wWest, wEast);

    // Overhead Hexagonal White LED Ceiling Frames & Gold Bay Floor Pads
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const cyanStripMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    for (let i = 0; i < GARAGE_BAY_SPOTS.length; i++) {
      const sp = GARAGE_BAY_SPOTS[i];
      const bayPad = new THREE.Mesh(shopGeos.box, mats.matteBlack);
      bayPad.scale.set(2.8, 0.03, 5.2);
      bayPad.position.set(sp.x, 0.055, sp.z);
      bayPad.rotation.y = sp.yaw;

      const bayTrim = new THREE.Mesh(shopGeos.box, cyanStripMat);
      bayTrim.scale.set(2.92, 0.02, 5.32);
      bayTrim.position.set(sp.x, 0.048, sp.z);
      bayTrim.rotation.y = sp.yaw;

      const hexLight = new THREE.Mesh(shopGeos.torus, ledMat);
      hexLight.scale.set(3.4, 3.4, 1.2);
      hexLight.rotation.x = Math.PI * 0.5;
      hexLight.position.set(sp.x, 5.22, sp.z);
      personalGarageRoot.add(bayPad, bayTrim, hexLight);
    }

    const garSignTex = getSignTexture(
      'personal_garage_wall',
      'GARA SIÊU XE CÁ NHÂN VIP',
      'ĐỨNG CẠNH XE NHẤN [F] ĐỂ LÁI RA PHỐ • [G] ĐỂ QUẢN LÝ SHOWROOM',
      '#090d16',
      '#38bdf8',
      '#facc15',
      768,
      140
    );
    if (garSignTex) {
      const gSign = new THREE.Mesh(
        shopGeos.plane,
        new THREE.MeshStandardMaterial({
          map: garSignTex,
          emissive: 0xffffff,
          emissiveMap: garSignTex,
          emissiveIntensity: 0.9
        })
      );
      gSign.scale.set(11.5, 2.0, 1);
      gSign.position.set(1844, 3.45, 1788.25);
      personalGarageRoot.add(gSign);
    }

    for (const [lx, lz] of [[1840, 1796], [1848, 1804]]) {
      const pl = new THREE.PointLight(0xf0f9ff, 2.3, 25, 1.4);
      pl.position.set(lx, 4.8, lz);
      personalGarageRoot.add(pl);
    }

    // Exit Ring `(1844, 0.05, 1810.5)` & Management Laptop Desk `(1844, 0.05, 1789.8)`
    personalGarageRoot.add(makeCoronaMarker(1844.0, 0.05, 1810.5, 0x38bdf8, 1.15, 2.2));
    personalGarageRoot.add(makeCoronaMarker(1844.0, 0.05, 1789.8, 0xfacc15, 1.10, 2.2));
    personalGarageRoot.add(garageDisplayGroup);
    personalGarageRoot.visible = false;
  }

  function refreshPersonalGarage3DCars() {
    disposeGroupChildren(garageDisplayGroup);
    const mats = ensureShopMaterials();
    const tex = ensureShopTextures();

    for (let i = 0; i < Math.min(MAX_GARAGE_SLOTS, savedGarage.length); i++) {
      const entry = savedGarage[i];
      const spot = GARAGE_BAY_SPOTS[i];
      if (!entry || !spot) continue;

      const m = entry.mods || createDefaultModConfig();
      const fin = PAINT_FINISHES.find((f) => f.id === m.paintFinish) || PAINT_FINISHES[0];
      const bodyMat = new THREE.MeshPhysicalMaterial({
        color: fin.id === 'gold24k' ? 0xffcc33 : (fin.id === 'chrome' ? 0xf1f5f9 : (m.paintColor || 0xf4f7fb)),
        metalness: fin.metalness,
        roughness: fin.roughness,
        clearcoat: fin.clearcoat,
        clearcoatRoughness: fin.clearcoatRoughness,
        iridescence: fin.iridescence || 0,
        envMapIntensity: fin.envMapIntensity
      });
      bodyMat.userData = { ownMaterial: true };

      const rimSpec = RIM_FINISHES.find((r) => r.id === m.rimFinish) || RIM_FINISHES[0];
      const rimMat = new THREE.MeshPhysicalMaterial({
        color: rimSpec.hex,
        metalness: rimSpec.metalness,
        roughness: rimSpec.roughness
      });
      rimMat.userData = { ownMaterial: true };

      const model = buildShowroomDisplayCarModel(bodyMat, rimMat);
      model.position.set(spot.x, 0.06, spot.z);
      model.rotation.y = spot.yaw;

      if (m.underglow && m.underglow !== 'none') {
        const ugHex = UNDERGLOW_KITS.find((u) => u.id === m.underglow)?.hex || 0x00f5ff;
        const ugMat = new THREE.MeshBasicMaterial({
          color: ugHex,
          map: tex.underglowMap || null,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        ugMat.userData = { ownMaterial: true };
        const ugPool = new THREE.Mesh(shopGeos.plane, ugMat);
        ugPool.rotation.x = -Math.PI * 0.5;
        ugPool.scale.set(2.9, 5.4, 1);
        ugPool.position.y = 0.02;
        model.add(ugPool);
      }

      garageDisplayGroup.add(model);
    }
  }

  function enterPersonalGarage() {
    const p = ctx.player;
    if (!p || state.doorTeleportCooldown > 0) return false;
    if (p.inCar) {
      saveCarToPersonalGarage(p.inCar);
      ctx.vehicles?.exitVehicle?.();
    }
    if (state.modalOpen) closeModal();

    state.doorTeleportCooldown = 1.0;
    state.inPersonalGarage = true;
    state.inAmmuInterior = false;
    ammuInteriorRoot.visible = false;
    personalGarageRoot.visible = true;
    refreshPersonalGarage3DCars();

    p.x = 1844.0;
    p.y = 0.05;
    p.z = 1808.8;
    p.vx = 0;
    p.vz = 0;
    p.yaw = Math.PI;
    if (p.mesh) {
      p.mesh.visible = true;
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.y = Math.PI;
    }
    ctx.audio?.playChime?.();
    notifyPlayer(`🏠 Đã bước vào Gara Cá Nhân 6 Chỗ (${savedGarage.length}/6 xe)! Lại gần bất kỳ xe nào và nhấn [F] để lái ra phố!`, 4.5);
    return true;
  }

  function exitPersonalGarage() {
    const p = ctx.player;
    if (!p || state.doorTeleportCooldown > 0) return false;
    state.doorTeleportCooldown = 1.0;
    state.inPersonalGarage = false;
    personalGarageRoot.visible = false;

    p.x = -45.5;
    p.y = 0.22;
    p.z = 95.8;
    p.vx = 0;
    p.vz = 0;
    p.yaw = Math.PI * 0.5;
    if (p.mesh) {
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.y = p.yaw;
    }
    notifyPlayer('Đã rời Gara Cá Nhân ra khu Showroom Bồng Lai.', 2.5);
    return true;
  }

  function driveOutGarageBayCar(slotIdx) {
    const entry = savedGarage[slotIdx];
    if (!entry) return false;
    exitPersonalGarage();
    const spec = DEALERSHIP_CATALOG.find((d) => d.id === entry.catalogId);
    const car = spawnConfiguredVehicle(
      entry.spawnType || spec?.spawnType || 'obey9f',
      spec?.fallbackType || 'obey9f',
      -42.5,
      0.05,
      95.8,
      Math.PI * 0.5,
      entry.mods,
      entry.customName
    );
    if (car) {
      car.garageSlotId = entry.slotId;
      entry._liveCarRef = car;
      ctx.vehicles?.enterVehicle?.(car);
      shopAudio.playBlowOffWhistle(1.0);
      notifyPlayer(`🏎️ Đang lái "${entry.customName}" từ Gara Cá Nhân ra Đại lộ!`, 3.8);
    }
    return true;
  }

  // ==========================================================================
  // 24. 360° SHOWROOM ORBIT CAMERA & SAFE NON-DESTRUCTIVE SYSTEM HOOKS
  // ==========================================================================
  let hooksInstalled = false;
  let savedPlayerPreStepX = 0;
  let savedPlayerPreStepZ = 0;
  let savedPlayerPreStepDt = 0.016;

  function updateShowroomCameraOverride(dt) {
    const cam = ctx.engine?.camera;
    if (!cam || !state.modalOpen) return false;

    let pivotX = 0;
    let pivotY = 0;
    let pivotZ = 0;

    if (state.modalMode === 'customs' && state.activeCar) {
      pivotX = state.activeCar.x;
      pivotY = state.activeCar.y + (state.camLookOffsetY || 0.68);
      pivotZ = state.activeCar.z;
    } else if (state.modalMode === 'clothing' && ctx.player) {
      pivotX = ctx.player.x;
      pivotY = (ctx.player.y || 0) + (state.camLookOffsetY || 1.05);
      pivotZ = ctx.player.z;
    } else if (state.modalMode === 'dealership') {
      pivotX = SHOP_COORDS.dealershipTurntable.x;
      pivotY = SHOP_COORDS.dealershipTurntable.y + 0.78;
      pivotZ = SHOP_COORDS.dealershipTurntable.z;
    } else {
      return false;
    }

    if (state.camManualHoldTimer > 0) {
      state.camManualHoldTimer = Math.max(0, state.camManualHoldTimer - dt);
    } else if (state.camAutoSpin && !state.isDraggingPreview) {
      state.camTargetYaw = wrapAngle(state.camTargetYaw + dt * 0.34);
    }

    state.camOrbitYaw = dampAngle(state.camOrbitYaw, state.camTargetYaw, 8.5, dt);
    state.camOrbitPitch = smoothDamp(state.camOrbitPitch, state.camTargetPitch, 8.5, dt);
    state.camOrbitDist = smoothDamp(state.camOrbitDist, state.camTargetDist, 8.5, dt);

    const cosP = Math.cos(state.camOrbitPitch);
    const sinP = Math.sin(state.camOrbitPitch);
    const camX = pivotX + Math.sin(state.camOrbitYaw) * cosP * state.camOrbitDist;
    const camY = pivotY + sinP * state.camOrbitDist;
    const camZ = pivotZ + Math.cos(state.camOrbitYaw) * cosP * state.camOrbitDist;

    const rightX = Math.cos(state.camOrbitYaw);
    const rightZ = -Math.sin(state.camOrbitYaw);
    const panelShift = state.modalMode === 'clothing' ? -0.38 : -0.85;

    cam.position.set(camX + rightX * panelShift, Math.max(pivotY - 0.35, camY), camZ + rightZ * panelShift);
    cam.lookAt(pivotX + rightX * panelShift, pivotY, pivotZ + rightZ * panelShift);
    if (Math.abs(cam.fov - 52) > 0.2) {
      cam.fov = 52;
      cam.updateProjectionMatrix();
    }
    return true;
  }

  function installSafeSystemHooks() {
    if (hooksInstalled) return;
    if (!ctx.engine || !ctx.world || !ctx.characters || !ctx.vehicles) return;
    hooksInstalled = true;

    // 1. Wrap `ctx.engine.updateCamera` so our 360° LSC / Boutique / Dealership Showroom Camera never flickers!
    if (typeof ctx.engine.updateCamera === 'function' && !ctx.engine.updateCamera._shopsWrapped) {
      const origUpdateCam = ctx.engine.updateCamera.bind(ctx.engine);
      const wrappedUpdateCam = (dt, overrideCtx) => {
        if (state.modalOpen && (state.modalMode === 'customs' || state.modalMode === 'clothing' || state.modalMode === 'dealership')) {
          updateShowroomCameraOverride(clamp(Number(dt) || 0.016, 0.001, 0.08));
          return;
        }
        return origUpdateCam(dt, overrideCtx);
      };
      wrappedUpdateCam._shopsWrapped = true;
      ctx.engine.updateCamera = wrappedUpdateCam;
    }

    // 2. Protect Thần Binh Các `(1800, 1800)` & 6-Car Tọa Kỵ Các (Gara 6 Chỗ) `(1844, 1800)` from `characters.js` `(791..809)` clamp!
    if (typeof ctx.characters.updatePlayerOnFoot === 'function' && !ctx.characters.updatePlayerOnFoot._shopsWrapped) {
      const origOnFoot = ctx.characters.updatePlayerOnFoot.bind(ctx.characters);
      const wrappedOnFoot = (dt, ctxArg) => {
        const p = ctx.player;
        if (p && (state.inAmmuInterior || state.inPersonalGarage)) {
          savedPlayerPreStepX = p.x;
          savedPlayerPreStepZ = p.z;
          savedPlayerPreStepDt = clamp(Number(dt) || 0.016, 0.0005, 0.1);
        }
        if (state.modalOpen) {
          if (p) {
            p.vx = 0;
            p.vz = 0;
            if (p.rig) ctx.characters.animateHumanoid?.(p.rig, 'idle', dt || 0.016);
          }
          return;
        }
        return origOnFoot(dt, ctxArg);
      };
      wrappedOnFoot._shopsWrapped = true;
      ctx.characters.updatePlayerOnFoot = wrappedOnFoot;
    }

    // 3. Chain `ctx.world.resolveCircleAABB`, `getGroundHeight` & `checkLOS` for `(1800, 1800)` & `(1844, 1800)` Interiors!
    if (typeof ctx.world.getGroundHeight === 'function' && !ctx.world.getGroundHeight._shopsWrapped) {
      const origGH = ctx.world.getGroundHeight.bind(ctx.world);
      const wrappedGH = (x, z) => {
        if (x >= 1780 && x <= 1862 && z >= 1750 && z <= 1818) {
          return 0.05;
        }
        return origGH(x, z);
      };
      wrappedGH._shopsWrapped = true;
      ctx.world.getGroundHeight = wrappedGH;
    }

    if (typeof ctx.world.resolveCircleAABB === 'function' && !ctx.world.resolveCircleAABB._shopsWrapped) {
      const origResolve = ctx.world.resolveCircleAABB.bind(ctx.world);
      const wrappedResolve = (ent, radius = 0.42) => {
        if (ent === ctx.player && (state.inAmmuInterior || state.inPersonalGarage)) {
          if (ent.x <= 815 && savedPlayerPreStepX > 1750) {
            ent.x = savedPlayerPreStepX + (ent.vx || 0) * savedPlayerPreStepDt;
            ent.z = savedPlayerPreStepZ + (ent.vz || 0) * savedPlayerPreStepDt;
          }
          if (state.inPersonalGarage) {
            ent.x = clamp(ent.x, 1831.6, 1856.4);
            ent.z = clamp(ent.z, 1788.6, 1811.4);
            return;
          }
          ent.x = clamp(ent.x, 1786.65, 1813.35);
          ent.z = clamp(ent.z, 1788.65, 1811.35);

          for (let i = 0; i < ammuInteriorAABBs.length; i++) {
            const b = ammuInteriorAABBs[i];
            const cx = clamp(ent.x, b.minX, b.maxX);
            const cz = clamp(ent.z, b.minZ, b.maxZ);
            const dx = ent.x - cx;
            const dz = ent.z - cz;
            const d2 = dx * dx + dz * dz;
            if (d2 < radius * radius) {
              const d = Math.sqrt(d2) || 0.001;
              ent.x = cx + (dx / d) * radius;
              ent.z = cz + (dz / d) * radius;
            }
          }
          return;
        }
        return origResolve(ent, radius);
      };
      wrappedResolve._shopsWrapped = true;
      ctx.world.resolveCircleAABB = wrappedResolve;
    }

    if (typeof ctx.world.checkLOS === 'function' && !ctx.world.checkLOS._shopsWrapped) {
      const origLOS = ctx.world.checkLOS.bind(ctx.world);
      const wrappedLOS = (x1, y1, z1, x2, y2, z2) => {
        if (x1 >= 1780 && x1 <= 1862 && z1 >= 1750 && z1 <= 1818) {
          return z2 >= 1755.5 && x2 >= 1786.0 && x2 <= 1857.0;
        }
        return origLOS(x1, y1, z1, x2, y2, z2);
      };
      wrappedLOS._shopsWrapped = true;
      ctx.world.checkLOS = wrappedLOS;
    }

    // 4. Preserve custom 24K Gold / Chrome / Matte / Pearlescent paint when `repairAndRespray` runs!
    if (typeof ctx.vehicles.repairAndRespray === 'function' && !ctx.vehicles.repairAndRespray._shopsWrapped) {
      const origRepair = ctx.vehicles.repairAndRespray.bind(ctx.vehicles);
      const wrappedRepair = (targetCar, customColor) => {
        const car = targetCar || ctx.player?.inCar;
        const hadCustomMods = Boolean(car?.customMods);
        const res = origRepair(targetCar, customColor);
        if (car && hadCustomMods && customColor === undefined) {
          applyPaintFinishToCar(car, car.customMods);
          car.hp = car.maxHp;
        }
        return res;
      };
      wrappedRepair._shopsWrapped = true;
      ctx.vehicles.repairAndRespray = wrappedRepair;
    }
  }

  function installLateGameplayHooks() {
    if (ctx.gameplay?.triggerPhoneAction && !ctx.gameplay.triggerPhoneAction._shopsWrapped) {
      const origPhone = ctx.gameplay.triggerPhoneAction.bind(ctx.gameplay);
      const wrappedPhone = (actionId) => {
        const key = String(actionId || '').toLowerCase().trim();
        if (key === 'open_customs' || key === 'lsc') return openCustoms();
        if (key === 'open_ammu' || key === 'ammunation') return openAmmuNation();
        if (key === 'open_clothing' || key === 'ponsonbys' || key === 'wardrobe') return openClothing();
        if (key === 'open_dealership' || key === 'garage' || key === 'motorsport') return openDealership();
        if (key === 'enter_garage') return enterPersonalGarage();
        if (key.startsWith('summon_garage_')) {
          const slotIdx = Number(key.replace('summon_garage_', '')) || 0;
          return Boolean(summonGarageCar(slotIdx));
        }
        const handled = origPhone(actionId);
        if (key.includes('outfit') || key.includes('polo') || key.includes('suit') || key.includes('heist')) {
          if (ctx.player?.outfit) wardrobeState.outfitId = ctx.player.outfit;
          applyWardrobeToRig();
        }
        return handled;
      };
      wrappedPhone._shopsWrapped = true;
      ctx.gameplay.triggerPhoneAction = wrappedPhone;
    }
  }

  // ==========================================================================
  // 25. CONTEXTUAL WORLD STATIONS, PROMPTS & MAIN `init` / `update` LOOP
  // ==========================================================================
  function getInteractiveStationNear(x, z) {
    const p = ctx.player;
    const inCar = Boolean(p?.inCar);

    if (state.inPersonalGarage || (x >= 1830 && x <= 1860)) {
      if (dist2D(x, z, 1844.0, 1810.5) < 2.4) {
        return { type: 'garage_exit', id: 'garage_exit', label: 'Nhấn [F] hoặc [G] để rời Gara Cá Nhân ra Đại Lộ' };
      }
      if (dist2D(x, z, 1844.0, 1789.8) < 2.6) {
        return { type: 'dealership', id: 'garage_terminal', label: 'Nhấn [G] hoặc [F] để mở Máy Tính Quản Lý Showroom & Mua Thêm Siêu Xe' };
      }
      for (let i = 0; i < Math.min(MAX_GARAGE_SLOTS, savedGarage.length); i++) {
        const sp = GARAGE_BAY_SPOTS[i];
        if (dist2D(x, z, sp.x, sp.z) < 2.95) {
          return {
            type: 'garage_drive_bay',
            slotIdx: i,
            id: `garage_bay_${i}`,
            label: `Nhấn [F] để lái "${savedGarage[i].customName}" ra Phố • [G] Quản Lý Gara`
          };
        }
      }
      return null;
    }

    if (state.inAmmuInterior || x > 1750) {
      if (dist2D(x, z, SHOP_COORDS.ammuInteriorExit.x, SHOP_COORDS.ammuInteriorExit.z) < 2.4) {
        return { type: 'ammu_exit', id: 'ammu_exit', label: 'Nhấn [F] hoặc [G] để rời Thần Binh Các ra Đại Lộ' };
      }
      if (dist2D(x, z, SHOP_COORDS.ammuCounterTrigger.x, SHOP_COORDS.ammuCounterTrigger.z) < 3.0) {
        return { type: 'ammu_counter', id: 'ammu_counter', label: 'Nhấn [G] hoặc [F] để mở Quầy Vũ Khí, Phụ Kiện Laser 3D & Mạ Vàng' };
      }
      if (dist2D(x, z, SHOP_COORDS.ammuArmorTrigger.x, SHOP_COORDS.ammuArmorTrigger.z) < 2.8) {
        return { type: 'ammu_armor', id: 'ammu_armor', label: 'Nhấn [G] hoặc [F] để mua Áo Giáp Kevlar Hạng Nặng' };
      }
      if (dist2D(x, z, SHOP_COORDS.ammuRangeTrigger.x, SHOP_COORDS.ammuRangeTrigger.z) < 3.0) {
        return { type: 'ammu_range', id: 'ammu_range', label: 'Nhấn [G] hoặc [F] để Thi Bắn Bia Tính Điểm 45 Giây (Thưởng Vàng $2,000!)' };
      }
      return null;
    }

    const inLSCBay =
      x >= SHOP_COORDS.lscBay.minX - 2.5 &&
      x <= SHOP_COORDS.lscBay.maxX + 3.5 &&
      z >= SHOP_COORDS.lscBay.minZ - 1.5 &&
      z <= SHOP_COORDS.lscBay.maxZ + 1.5;
    if (inLSCBay && inCar) {
      return { type: 'customs', id: 'lsc_bay', label: 'Nhấn [G] để Độ Xe 3D Luyện Khí Các (Sơn 24K/Crôm • Đèn Gầm • Twin-Turbo)' };
    }

    if (!inCar && dist2D(x, z, SHOP_COORDS.ammuExterior.x, SHOP_COORDS.ammuExterior.z) < 3.4) {
      return { type: 'ammu_enter', id: 'ammu_exterior', label: 'Nhấn [F] để vào Cửa Hàng Thần Binh Các & Trường Bắn • [G] Mua Nhanh' };
    }

    if (!inCar && dist2D(x, z, SHOP_COORDS.clothingExterior.x, SHOP_COORDS.clothingExterior.z) < 3.4) {
      return { type: 'clothing', id: 'ponsonbys_exterior', label: 'Nhấn [G] hoặc [F] để vào Tiên Y Các Thời Trang, Đồng Hồ Vàng & Mặt Nạ Neon' };
    }

    if (
      dist2D(x, z, SHOP_COORDS.dealershipTriggerWest.x, SHOP_COORDS.dealershipTriggerWest.z) < 3.8 ||
      dist2D(x, z, SHOP_COORDS.dealershipTriggerEast.x, SHOP_COORDS.dealershipTriggerEast.z) < 3.4
    ) {
      return {
        type: 'dealership',
        id: 'motorsport_showroom',
        isWestGarage: dist2D(x, z, SHOP_COORDS.dealershipTriggerWest.x, SHOP_COORDS.dealershipTriggerWest.z) < 3.8,
        label: 'Nhấn [G] mở Showroom Mua Xe • [F] Bước Vào Gara 3D 6 Chỗ'
      };
    }

    return null;
  }

  const rawShopKeys = {};
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      rawShopKeys[e.code] = true;
      if (e.code === 'Escape') {
        if (state.modalOpen) {
          e.preventDefault();
          closeModal();
        } else if (state.rangeActive) {
          e.preventDefault();
          stopShootingRange(true);
          notifyPlayer('Đã dừng lượt thi Trường Bắn.', 2.2);
        }
      }
    });
    window.addEventListener('keyup', (e) => {
      rawShopKeys[e.code] = false;
    });
    window.addEventListener('blur', () => {
      for (const k of Object.keys(rawShopKeys)) rawShopKeys[k] = false;
    });
  }

  function init(overrideCtx) {
    if (overrideCtx && typeof overrideCtx === 'object') {
      ctx = overrideCtx;
    }
    if (state.initialized) {
      installSafeSystemHooks();
      installLateGameplayHooks();
      return api;
    }
    state.initialized = true;

    ensureShopTextures();
    ensureShopMaterials();
    ensureShopsDOM();
    buildExteriorShopLandmarks();
    buildAmmuNationInterior();
    buildPersonalGarageInterior();

    const scene = ctx.engine?.scene || ctx.scene;
    if (scene && shopsRoot.parent !== scene) {
      scene.add(shopsRoot);
    }

    installSafeSystemHooks();
    installLateGameplayHooks();

    applyWeaponAttachmentsAndStatsToPlayer();
    applyWardrobeToRig();

    return api;
  }

  let localClock = 0;

  function update(arg0, arg1) {
    if (!state.initialized) {
      init(ctx);
    }
    installSafeSystemHooks();
    installLateGameplayHooks();

    const rawDt = typeof arg0 === 'number' ? arg0 : (typeof arg1 === 'number' ? arg1 : 0.016);
    const dt = clamp(Number.isFinite(rawDt) ? rawDt : 0.016, 0.0005, 0.08);
    localClock += dt;

    const scene = ctx.engine?.scene || ctx.scene;
    if (scene && shopsRoot.parent !== scene) {
      scene.add(shopsRoot);
    }

    if (state.lscBayCooldown > 0) state.lscBayCooldown = Math.max(0, state.lscBayCooldown - dt);
    if (state.doorTeleportCooldown > 0) state.doorTeleportCooldown = Math.max(0, state.doorTeleportCooldown - dt);

    if (state.modalOpen) {
      releasePointerLockCleanly();
      refreshCashHeader();

      if (dynoSweepActive && state.modalMode === 'customs' && state.activeCar) {
        dynoSweepRpm += 3900 * dt;
        if (Array.isArray(state.activeCar.wheels)) {
          for (const w of state.activeCar.wheels) {
            if (w && !w.isFront && w.spinGroup) {
              w.spinGroup.rotation.x += (dynoSweepRpm * 0.0065) * dt;
            }
          }
        }
        if (dynoSweepRpm >= 9000) {
          dynoSweepRpm = 9000;
          dynoSweepActive = false;
          if (state.activeCar.customMods?.twinTurbo) {
            shopAudio.playBlowOffWhistle(1.25);
            triggerCarBackfireBurst(state.activeCar, 0.42, 1.25);
          }
        }
        const dynoCanvas = document.getElementById('lsc-dyno-canvas');
        if (dynoCanvas) renderLSCDynoCanvas(dynoCanvas, state.activeCar);
      }
    }

    for (let i = 0; i < animatedCoronas.length; i++) {
      const c = animatedCoronas[i];
      c.ring.rotation.z = localClock * 1.4 + c.phase;
      c.cylMat.opacity = 0.16 + 0.08 * Math.sin(localClock * 3.2 + c.phase);
    }
    if (lscTurntableRing) {
      lscTurntableRing.rotation.z = localClock * 0.65;
    }
    if (dealershipPodiumGroup) {
      dealershipPodiumGroup.rotation.y = localClock * 0.45;
    }
    if (lscMechanicRig && ctx.characters?.animateHumanoid) {
      ctx.characters.animateHumanoid(lscMechanicRig, 'idle', dt);
    }
    if (ammuClerkRig && state.inAmmuInterior && ctx.characters?.animateHumanoid) {
      ctx.characters.animateHumanoid(ammuClerkRig, 'idle', dt);
    }

    if (wardrobeState.maskId === 'neon_skull' && ctx.player?.rig?.joints?.head) {
      const headAcc = ctx.player.rig.joints.head.getObjectByName('ponsonbysHeadAcc');
      if (headAcc) {
        const hue = (localClock * 0.35) % 1.0;
        _colA.setHSL(hue, 1.0, 0.56);
        headAcc.traverse((n) => {
          if (n.isMesh && n.material?.userData?.isNeonMaskGlow) {
            n.material.color.copy(_colA);
          }
        });
      }
    }

    updateTunedVehiclesFX(dt, localClock);
    update3DLaserSightAndSpecialWeapons(dt, localClock);
    updateShootingRange(dt);

    const p = ctx.player;
    if (!p || !ctx.started || ctx.paused || state.modalOpen || state.rangeActive || p.isDead || p.isBusted) {
      state.prevKeyG = Boolean(rawShopKeys.KeyG || ctx.input?.keys?.KeyG);
      return;
    }

    const keyGNow = Boolean(
      rawShopKeys.KeyG ||
      ctx.input?.keys?.KeyG ||
      ctx.input?.shopJustPressed ||
      ctx.input?.secondaryInteractJustPressed ||
      ctx.input?.shopInteractJustPressed ||
      ctx.input?.interactGJustPressed
    );
    const gJustPressed = Boolean(
      (keyGNow && !state.prevKeyG) ||
      ctx.input?.secondaryInteractJustPressed ||
      ctx.input?.shopInteractJustPressed ||
      ctx.input?.interactGJustPressed
    );
    state.prevKeyG = keyGNow;

    const fJustPressed = Boolean(ctx.input?.interactJustPressed || ctx.input?.useJustPressed);
    const station = getInteractiveStationNear(p.x, p.z);

    if (station) {
      ctx.ui?.showPrompt?.(station.label, 0.25);

      if (station.type === 'customs' && p.inCar) {
        const mission1Active = Boolean(ctx.gameplay?.mission?.active && ctx.gameplay.mission.id === 1);
        const carSpd = Math.hypot(p.inCar.vx || 0, p.inCar.vz || 0);
        const deepInsideBay =
          p.inCar.x >= -64.5 &&
          p.inCar.x <= -52.5 &&
          p.inCar.z >= 76.2 &&
          p.inCar.z <= 83.8;

        if (gJustPressed || (!mission1Active && state.lscBayCooldown <= 0 && deepInsideBay && carSpd < 2.6)) {
          openCustoms(p.inCar);
          return;
        }
      } else if (station.type === 'ammu_enter') {
        if (fJustPressed) {
          enterAmmuNation();
          return;
        }
        if (gJustPressed) {
          openAmmuNation('weapons');
          return;
        }
      } else if (station.type === 'ammu_exit') {
        if (fJustPressed || gJustPressed || dist2D(p.x, p.z, SHOP_COORDS.ammuInteriorExit.x, SHOP_COORDS.ammuInteriorExit.z) < 1.35) {
          exitAmmuNation();
          return;
        }
      } else if (station.type === 'ammu_counter') {
        if (fJustPressed || gJustPressed) {
          openAmmuNation('weapons');
          return;
        }
      } else if (station.type === 'ammu_armor') {
        if (fJustPressed || gJustPressed) {
          openAmmuNation('armor');
          return;
        }
      } else if (station.type === 'ammu_range') {
        if (fJustPressed || gJustPressed) {
          startShootingRange();
          return;
        }
      } else if (station.type === 'clothing') {
        if (fJustPressed || gJustPressed) {
          openClothing('outfits');
          return;
        }
      } else if (station.type === 'garage_exit') {
        if (fJustPressed || gJustPressed || dist2D(p.x, p.z, 1844.0, 1810.5) < 1.35) {
          exitPersonalGarage();
          return;
        }
      } else if (station.type === 'garage_drive_bay') {
        if (fJustPressed) {
          driveOutGarageBayCar(station.slotIdx);
          return;
        }
        if (gJustPressed) {
          openDealership('garage');
          return;
        }
      } else if (station.type === 'dealership') {
        if (gJustPressed) {
          openDealership('showroom');
          return;
        }
        if (fJustPressed) {
          const nearCar = !p.inCar && ctx.vehicles?.findNearestEnterable?.(p.x, p.z, 3.8);
          if (!nearCar) {
            if (station.isWestGarage) {
              enterPersonalGarage();
            } else {
              openDealership('showroom');
            }
            return;
          }
        }
      }
    }
  }

  // ==========================================================================
  // 26. PUBLIC EXPORT API (`ctx.shops`)
  // ==========================================================================
  const api = {
    init,
    update,
    openCustoms,
    openAmmuNation,
    openClothing,
    openDealership,
    closeModal,
    close: closeModal,
    applyCarMods,
    savedGarage,
    get isOpen() {
      return Boolean(state.modalOpen);
    },
    set isOpen(val) {
      if (!val && state.modalOpen) closeModal();
    },
    enterAmmuNation,
    exitAmmuNation,
    enterPersonalGarage,
    exitPersonalGarage,
    driveOutGarageBayCar,
    startShootingRange,
    stopShootingRange,
    summonGarageCar,
    saveCarToPersonalGarage,
    tossStickyBombC4,
    detonateStickyBombs,
    applyWardrobeToRig,
    applyWeaponAttachmentsAndStatsToPlayer,
    getInteractiveStationNear,
    aabbs: exteriorAABBs,
    interiorAABBs: ammuInteriorAABBs,
    state,
    arsenalState,
    wardrobeState
  };

  ctx.shops = api;
  return api;
}
