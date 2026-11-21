import * as THREE from 'three';

export function createNightlifeBar(ctx = {}) {
  const SAVE_KEY = 'gtav_nightlife_save_v1';
  const CLUB_CENTER_X = 1500.0;
  const CLUB_CENTER_Y = 0.05;
  const CLUB_CENTER_Z = 1500.0;
  const CLUB_EXTERIOR_X = -129.0;
  const CLUB_EXTERIOR_Y = 0.22;
  const CLUB_EXTERIOR_Z = -95.0;

  const STATION_COORDS = {
    bar_counter: {
      type: 'bar_counter',
      id: 'club_bar_counter',
      x: 1485.0,
      y: 0.05,
      z: 1498.0,
      radius: 3.3,
      label: 'Quầy Pha Chế Tiên Tửu Neon',
      prompt: 'Nhấn [F] để gọi Tiên Tửu & Rượu mạnh tại Quầy Bar Neon'
    },
    dancefloor: {
      type: 'dancefloor',
      id: 'club_dancefloor',
      x: 1500.0,
      y: 0.03,
      z: 1498.0,
      radius: 4.4,
      label: 'Sàn Nhảy Nhạc Hội Rhythm Fever',
      prompt: 'Nhấn [F] để khuấy đảo Sàn Nhảy Nhạc Hội theo nhịp DJ'
    },
    pool_table: {
      type: 'pool_table',
      id: 'club_pool_table',
      x: 1513.0,
      y: 0.05,
      z: 1504.0,
      radius: 3.2,
      label: 'Bàn Bi-a 8 Bóng Cá Cược ($100–$10,000)',
      prompt: 'Nhấn [F] để đấu Bi-a 8 Bóng ($100–$10,000)'
    },
    darts_board: {
      type: 'darts_board',
      id: 'club_darts_board',
      x: 1515.0,
      y: 0.05,
      z: 1495.0,
      radius: 3.0,
      label: 'Bảng Phi Tiêu Phi Tiêu Tửu Quán 301 & Cricket ($100–$5,000)',
      prompt: 'Nhấn [F] để thi Phi Tiêu Phi Tiêu Tửu Quán ($100–$5,000)'
    },
    vip_desk: {
      type: 'vip_desk',
      id: 'club_vip_desk',
      x: 1486.8,
      y: 0.05,
      z: 1489.2,
      radius: 2.9,
      label: 'Bàn Quản Lý VIP & Két Sắt Túy Tiên Lâu',
      prompt: 'Nhấn [F] để mở Quản Lý Túy Tiên Lâu & Thu Tiền Két Sắt VIP'
    },
    bouncer: {
      type: 'bouncer',
      id: 'club_bouncer_post',
      x: 1494.6,
      y: 0.05,
      z: 1511.2,
      radius: 2.8,
      label: 'Trưởng Đội Bảo Vệ Bouncer VIP',
      prompt: 'Nhấn [F] để nhận Nhiệm Vụ Bảo Vệ Hộp Đêm & Dẹp Loạn'
    },
    dj_booth: {
      type: 'dj_booth',
      id: 'club_dj_booth',
      x: 1500.0,
      y: 0.8,
      z: 1487.5,
      radius: 3.4,
      label: 'Bàn Phối Nhạc DJ Live & Đấu Tửu Lượng',
      prompt: 'Nhấn [F] để lên Bàn DJ Chà Đĩa Live & Phun Khói Lạnh CO2'
    },
    vip_booth: {
      type: 'vip_desk',
      id: 'club_vip_booth',
      x: 1500.0,
      y: 0.05,
      z: 1507.5,
      radius: 2.9,
      label: 'Ghế Sofa VIP Thượng Lưu',
      prompt: 'Nhấn [F] để mở Dịch Vụ Bàn VIP & Quản Lý Hộp Đêm'
    }
  };

  const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt));
  const wrapAngle = (a) => {
    let r = a;
    while (r > Math.PI) r -= Math.PI * 2;
    while (r < -Math.PI) r += Math.PI * 2;
    return r;
  };
  const randRange = (min, max) => min + Math.random() * (max - min);
  const randInt = (min, max) => Math.floor(randRange(min, max + 1));
  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const formatCash = (n) => '$' + Math.max(0, Math.round(Number(n) || 0)).toLocaleString('en-US');

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const COCKTAIL_MENU = [
    {
      id: 'pisswasser',
      index: 0,
      name: 'Bia Pißwasser Thượng Hạng',
      shortName: 'Bia Pißwasser',
      tagline: 'Đặc sản lúa mạch Bavaria đóng chai mát lạnh • Giải khát tức thì',
      price: 15,
      alcohol: 10,
      healHp: 12,
      staminaBoost: 12,
      armorGain: 0,
      popularityGain: 1,
      glassStyle: 'mug',
      primaryColor: '#f59e0b',
      secondaryColor: '#fde68a',
      foamColor: '#fffbeb',
      bartenderLine: 'Một vại Pißwasser ướp lạnh sủi bọt trắng xóa cho ngày dài trên Đại lộ!',
      drinkQuip: 'Khààà! Bia lúa mạch mát lạnh trôi tuột xuống cổ họng!'
    },
    {
      id: 'bourbon',
      index: 1,
      name: 'Whiskey Bourbon Cổ Điển',
      shortName: 'Whiskey Bourbon',
      tagline: 'Ủ thùng gỗ sồi cháy 12 năm • Đá viên cầu pha lê nguyên khối',
      price: 45,
      alcohol: 18,
      healHp: 22,
      staminaBoost: 20,
      armorGain: 0,
      popularityGain: 2,
      glassStyle: 'rocks',
      primaryColor: '#b45309',
      secondaryColor: '#f59e0b',
      foamColor: '#fef3c7',
      bartenderLine: 'Bourbon 12 năm cùng viên đá cầu vạt cạnh thủ công — chuẩn quý ông Tiên Thành.',
      drinkQuip: 'Hương gỗ sồi cay nồng ấm rực cả lồng ngực...'
    },
    {
      id: 'tequila',
      index: 2,
      name: 'Tequila Bồng Lai Muối Chanh',
      shortName: 'Tequila Bồng Lai',
      tagline: '100% Agave xanh vùng biên giới • Viền muối biển & lát chanh tươi',
      price: 60,
      alcohol: 23,
      healHp: 25,
      staminaBoost: 28,
      armorGain: 0,
      popularityGain: 3,
      glassStyle: 'shot_lime',
      primaryColor: '#eab308',
      secondaryColor: '#fef08a',
      foamColor: '#84cc16',
      bartenderLine: 'Liếm muối, nốc cạn Tequila rồi cắn lát chanh xanh nhé người anh em!',
      drinkQuip: 'Chua cay bùng nổ! Đầu óc bắt đầu lâng lâng theo tiếng nhạc!'
    },
    {
      id: 'vodka_double',
      index: 3,
      name: 'Vodka Nga Đúp Tuyết Lạnh',
      shortName: 'Vodka Nga Đúp',
      tagline: 'Chưng cất 7 lần ở -18°C • Đúp 2 ly liên hoàn cực mạnh',
      price: 90,
      alcohol: 29,
      healHp: 30,
      staminaBoost: 35,
      armorGain: 5,
      popularityGain: 4,
      glassStyle: 'double_vodka',
      primaryColor: '#38bdf8',
      secondaryColor: '#e0f2fe',
      foamColor: '#ffffff',
      bartenderLine: 'Vodka Nga nguyên chất ướp tuyết trắng — coi chừng bước ra cửa thấy hai mặt trăng!',
      drinkQuip: 'Lạnh buốt sống lưng rồi nóng bừng như lò phản ứng!'
    },
    {
      id: 'neon_cyber',
      index: 4,
      name: 'Tiên Tửu Neon Cyber Eclipse',
      shortName: 'Tiên Tửu Neon Cyber',
      tagline: 'Pha chế phân tầng Blue Curaçao, Rượu Mâm Xôi Đỏ & Khói Đá Khô phát sáng',
      price: 120,
      alcohol: 24,
      healHp: 45,
      staminaBoost: 55,
      armorGain: 10,
      popularityGain: 6,
      glassStyle: 'martini_neon',
      primaryColor: '#ec4899',
      secondaryColor: '#06b6d4',
      foamColor: '#f472b6',
      bartenderLine: 'Tuyệt phẩm độc quyền của Túy Tiên Lâu! Khói lạnh nitơ và sắc đèn neon rực cháy!',
      drinkQuip: 'Vị ngọt điện tử thanh mát, thanh Năng lượng Đặc biệt căng tràn!'
    },
    {
      id: 'bleuterd_vip',
      index: 5,
      name: "Rượu Sâm Panh Vàng Blêuter'd VIP",
      shortName: "Sâm Panh Blêuter'd VIP",
      tagline: 'Chai Magnum dát vàng 24K • Kích hoạt Đoàn Vũ Công Pháo Sáng VIP diễu hành!',
      price: 5000,
      alcohol: 28,
      healHp: 100,
      staminaBoost: 100,
      armorGain: 50,
      popularityGain: 26,
      isVipParade: true,
      glassStyle: 'champagne_vip',
      primaryColor: '#fbbf24',
      secondaryColor: '#fef08a',
      foamColor: '#ffffff',
      bartenderLine: 'BÁO ĐỘNG ĐẠI GIA!! Khui chai Blêuter’d Vàng 24K — Đội Bottle-Girl Pháo Sáng xuất kích!',
      drinkQuip: 'Đẳng cấp thượng lưu Tiên Thành! Cả hộp đêm đang reo hò tên bạn!'
    },
    {
      id: 'energy_sober',
      index: 6,
      name: 'Nước Tăng Lực Giải Rượu Junk',
      shortName: 'Tăng Lực Giải Rượu',
      tagline: 'Taurine siêu tốc + Điện giải Chanh Muối • Hạ ngay 38% Nồng độ cồn & Hồi sức bền!',
      price: 25,
      alcohol: -38,
      healHp: 20,
      staminaBoost: 65,
      armorGain: 0,
      popularityGain: 1,
      isSobering: true,
      glassStyle: 'energy_can',
      primaryColor: '#22c55e',
      secondaryColor: '#bef264',
      foamColor: '#ecfccb',
      bartenderLine: 'Uống lon Tăng Lực Giải Rượu này vào cho tỉnh táo trước khi cầm vô-lăng kẻo Thiên Đình Chấp Pháp tuýt còi!',
      drinkQuip: 'Tỉnh cả người! Mắt sáng trưng, tay chân hết hẳn run rẩy!'
    },
    {
      id: 'macbeth',
      index: 7,
      name: 'Shot Bí Ẩn Macbeth Huyền Thoại',
      shortName: 'Shot Bí Ẩn Macbeth',
      tagline: 'Rượu mạch nha đen 78° bốc lửa tím • CẢNH BÁO: Gục tại chỗ & Thức dậy ở nơi không tưởng!',
      price: 350,
      alcohol: 100,
      healHp: 100,
      staminaBoost: 100,
      armorGain: 25,
      popularityGain: 10,
      triggersBlackout: true,
      glassStyle: 'macbeth_flame',
      primaryColor: '#9333ea',
      secondaryColor: '#3b82f6',
      foamColor: '#f43f5e',
      bartenderLine: 'Gan to đấy! Chưa một ai ở Tiên Thành trụ nổi 5 giây sau khi nốc cạn ly Macbeth bốc lửa này...',
      drinkQuip: 'Á... trời đất quay cuồng... Sàn nhà sao lại ập vào mặt thế này...'
    }
  ];

  const DRUNK_MONOLOGUE_QUIPS = [
    'Ơ kìa cái cột đèn giao thông tự nhiên biết đi... Đứng lại nói chuyện coi nào!',
    'Đường Đại lộ Bồng Lai hôm nay ông thầu nào lát hình sóng sin thế này hả trời...',
    'Ủa nãy mình lái siêu xe tới quán hay đi bộ tới vậy cà... Chìa khóa đâu mất tiêu rồi?!',
    'Sao tự nhiên có hai anh bảo vệ đứng chồng lên nhau thế kia... Chào cả bốn anh nhé!',
    'Một ly nữa thôi... Thề danh dự nốt ly cuối là về Động Phủ Tu Luyện đi ngủ ngoan!',
    'Nhạc DJ đánh căng quá hay tim mình đang đập bass 128 BPM trong tai vậy nhỉ...',
    'Ê cái vỉa hè này tự nhiên nhô cao thế... Suýt nữa thì đo đất kiểu đại gia!',
    'Biển Thái Bình Dương hôm nay nghiêng 45 độ mà nước không đổ ra ngoài, hay thật sự!',
    'Mình hoàn toàn tỉnh táo nhé... Đi thẳng tắp... Ơ sao cái tường tự nhiên nhảy ra chắn đường!',
    'Alo Franklin hả... Hay Michael đấy... Điện thoại sao bấm hoài toàn ra máy tính bỏ túi vậy!',
    'Đừng ai cản tôi lên sàn nhảy làm cú xoay 720 độ... Hức... Chóng mặt quá!',
    'Cây cọ ven đường hôm nay múa dẻo y hệt vũ công trong Túy Tiên Lâu luôn kìa!',
    'Nãy hình như vừa bo cho Bartender tờ 100 đô hay tờ hóa đơn tiền điện ấy nhỉ...',
    'Cảnh sát Thiên Đình Chấp Pháp mà hỏi thì bảo tôi đang đi tuần tra độ phẳng của mặt nhựa đường nhé!'
  ];

  const MACBETH_AFTERMATH_SCENARIOS = [
    {
      id: 'vinewood_sign_top',
      title: 'ĐỈNH ĐỒI CHỮ VINEWOOD',
      x: 71.4,
      y: 74.2,
      z: -295.0,
      yaw: 0.0,
      useExactY: true,
      bonusCash: 0,
      subtitle: 'Á đù... Sao đêm qua mình lại trèo lên tận đỉnh chữ *VINEWOOD* nằm ngủ ngon lành thế này?!'
    },
    {
      id: 'del_perro_shoreline',
      title: 'BỜ SÓNG BÃI BIỂN DEL PERRO',
      x: -188.0,
      y: 0.25,
      z: 28.0,
      yaw: 1.45,
      useExactY: false,
      outfit: 'casual_polo',
      bonusCash: 150,
      subtitle: 'Sóng biển Thái Bình Dương vỗ ướt sũng cả giày... Đêm qua rủ cá heo ra *Bồng Lai Pier* thi bơi à?! (+$150 nhặt vỏ sò)'
    },
    {
      id: 'fib_helipad_78m',
      title: 'SÂN ĐỖ TRỰC THĂNG THÁP FIB (78M)',
      x: 160.0,
      y: 78.15,
      z: -23.5,
      yaw: Math.PI,
      useExactY: true,
      bonusCash: 0,
      subtitle: 'HẢ?! Sân trực thăng đỉnh *Tháp FIB Trung Tâm* cao 78 mét?! Đêm qua cướp trực thăng bay lên đây lúc nào không biết?!'
    },
    {
      id: 'mystery_supercar_jackpot',
      title: 'ĐẠI LỘ DEL PERRO & SIÊU XE BÍ ẨN',
      x: 34.5,
      y: 0.22,
      z: -48.0,
      yaw: 0.35,
      useExactY: false,
      spawnSupercar: 'banshee',
      supercarColor: 0xfbbf24,
      bonusCash: 2500,
      subtitle: 'Ủa chìa khóa chiếc *Banshee GT* mạ vàng của đại gia nào đỗ ngay cạnh thế này?! Trong túi áo còn dư thêm *$2,500* tiền thắng độ đêm qua!'
    },
    {
      id: 'pier_ferris_boardwalk',
      title: 'MŨI CẦU CẢNG VÒNG QUAY MẶT TRỜI',
      x: -234.0,
      y: 4.15,
      z: -6.0,
      yaw: -1.5,
      useExactY: false,
      bonusCash: 320,
      subtitle: 'Đầu óc vẫn xoay vòng vòng chẳng kém gì cái Vòng Quay Mặt Trời trên *Cầu Cảng Bồng Lai*... Ít ra ví vẫn còn dư *$320*!'
    },
    {
      id: 'diamond_casino_steps',
      title: 'TIỀN SẢNH SÒNG BẠC HOÀNG GIA DIAMOND',
      x: 206.5,
      y: 0.22,
      z: -110.0,
      yaw: -Math.PI * 0.5,
      useExactY: false,
      outfit: 'luxury_suit',
      bonusCash: 888,
      subtitle: 'Mặc nguyên bộ Vest lịch lãm tỉnh dậy trước thềm *Vạn Bảo Đổ Phường* cùng *$888* tiền lộc đỏ đen... Đêm qua cháy phố thật sự!'
    }
  ];

  const CLUB_UPGRADES = [
    {
      id: 'sound_laser_4k',
      name: 'Hệ Thống Loa Funktion-One & Laser 4K',
      desc: 'Tăng +$500 thu nhập thụ động mỗi chu kỳ & Bổ sung dàn tia Laser 3D đa sắc quét trần hộp đêm.',
      cost: 12000,
      incomeBonus: 500,
      popularityFloor: 35
    },
    {
      id: 'mixology_elite',
      name: 'Đội Pha Chế Mixologist Thượng Hạng',
      desc: 'Tăng +$650 thu nhập két sắt, giảm 20% giá đồ uống cho Chủ Túy Tiên Lâu & Giữ nhiệt khách VIP lâu hơn.',
      cost: 15000,
      incomeBonus: 650,
      popularityFloor: 45
    },
    {
      id: 'bouncer_tactical',
      name: 'Đội Vệ Sĩ Bouncer Đặc Nhiệm',
      desc: 'Tăng +$450 thu nhập két sắt, ngăn chặn mất điểm danh tiếng & Hỗ trợ đắc lực khi ẩu đả Quầy Bar.',
      cost: 10000,
      incomeBonus: 450,
      popularityFloor: 55
    }
  ];

  const state = {
    initialized: false,
    isOpen: false,
    activeStation: null,
    drunkLevel: 0,
    drunkPeakHoldTimer: 0,
    staminaBuffTimer: 0,
    staminaBuffBonus: 0,
    drunkPhase: 0,
    drunkStumbleTimer: 0,
    drunkLurchVelX: 0,
    drunkLurchVelZ: 0,
    drunkQuipTimer: 9.0,
    lastQuipIndex: -1,
    duiCheckTimer: 1.5,
    duiCooldown: 0,
    blackoutActive: false,
    blackoutTimer: 0,
    blackoutDuration: 4.8,
    blackoutTeleportDone: false,
    blackoutScenario: null,
    lastScenarioIndex: -1,
    bottleParadeActive: false,
    bottleParadeTimer: 0,
    clubOwned: false,
    clubPrice: 35000,
    clubPopularity: 58,
    safeBalance: 0,
    safeMaxCapacity: 50000,
    safeIncomeTimer: 180.0,
    safeIncomeInterval: 180.0,
    baseSafePayout: 2500,
    totalDrinksConsumed: 0,
    totalPoolWins: 0,
    totalDartsWins: 0,
    totalDanceHighScore: 0,
    totalClubEarnings: 0,
    upgrades: {
      sound_laser_4k: false,
      mixology_elite: false,
      bouncer_tactical: false
    },
    selectedDrinkId: 'neon_cyber',
    pouringAnim: {
      active: false,
      drink: null,
      progress: 0,
      duration: 1.65,
      bubbles: []
    },
    djTrackIndex: 0,
    djFilterCutoffNorm: 0.86,
    openCloseGuardTimer: 0,
    promptCooldown: 0,
    bouncerMission: {
      active: false,
      type: null,
      stage: 0,
      timer: 0,
      reward: 0,
      popReward: 20,
      brawlers: [],
      vipNpc: null,
      escortCar: null,
      pursuers: [],
      supplyTruck: null,
      targetPos: null
    }
  };

  function getActiveCtx(overrideCtx) {
    if (overrideCtx && typeof overrideCtx === 'object') return overrideCtx;
    return ctx;
  }

  function isPlayerInsideNightclub(gCtx = ctx) {
    const p = gCtx?.player;
    if (!p) return false;
    if (p.inNightclub === true) return true;
    if (gCtx?.casinoWorld?.inNightclub === true) return true;
    return Math.hypot((p.x || 0) - CLUB_CENTER_X, (p.z || 0) - CLUB_CENTER_Z) < 42.0;
  }

  function getPlayerCash(gCtx = ctx) {
    const p = gCtx?.player;
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

  function addPlayerCash(delta, gCtx = ctx, silent = false) {
    const p = gCtx?.player;
    if (!p) return false;
    const cur = getPlayerCash(gCtx);
    const next = Math.max(0, Math.round(cur + delta));
    if (ctx?.antiCheat?.commitCash) {
      ctx.antiCheat.commitCash(next);
    } else {
      p.cash = next;
      p.money = next;
    }
    if (!silent && delta !== 0) {
      if (delta > 0) gCtx?.audio?.playCash?.();
    }
    return true;
  }

  function spendPlayerCash(amount, gCtx = ctx) {
    const cost = Math.max(0, Math.round(Number(amount) || 0));
    const cur = getPlayerCash(gCtx);
    if (cur < cost) return false;
    addPlayerCash(-cost, gCtx, false);
    return true;
  }

  function notifyClub(text, duration = 3.4, gCtx = ctx) {
    gCtx?.ui?.showNotification?.(text);
    gCtx?.ui?.showSubtitle?.(text, duration);
  }

  function showClubBanner(title, sub, duration = 3.5, gCtx = ctx) {
    if (typeof gCtx?.ui?.showBanner === 'function') {
      gCtx.ui.showBanner(title, sub, duration);
    } else {
      notifyClub(`${title} — ${sub}`, duration, gCtx);
    }
  }

  function saveNightlifeState() {
    try {
      const payload = {
        v: 1,
        clubOwned: state.clubOwned,
        clubPopularity: Math.round(state.clubPopularity * 10) / 10,
        safeBalance: Math.round(state.safeBalance),
        safeIncomeTimer: Math.round(state.safeIncomeTimer),
        totalDrinksConsumed: state.totalDrinksConsumed,
        totalPoolWins: state.totalPoolWins,
        totalDartsWins: state.totalDartsWins,
        totalDanceHighScore: state.totalDanceHighScore,
        totalClubEarnings: state.totalClubEarnings,
        upgrades: { ...state.upgrades },
        djTrackIndex: state.djTrackIndex
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (_) {}
  }

  function loadNightlifeState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d || typeof d !== 'object') return;
      state.clubOwned = Boolean(d.clubOwned);
      if (Number.isFinite(d.clubPopularity)) {
        state.clubPopularity = clamp(d.clubPopularity, 0, 100);
      }
      if (Number.isFinite(d.safeBalance)) {
        state.safeBalance = clamp(Math.round(d.safeBalance), 0, state.safeMaxCapacity);
      }
      if (Number.isFinite(d.safeIncomeTimer)) {
        state.safeIncomeTimer = clamp(d.safeIncomeTimer, 5, state.safeIncomeInterval);
      }
      if (Number.isFinite(d.totalDrinksConsumed)) state.totalDrinksConsumed = Math.max(0, d.totalDrinksConsumed | 0);
      if (Number.isFinite(d.totalPoolWins)) state.totalPoolWins = Math.max(0, d.totalPoolWins | 0);
      if (Number.isFinite(d.totalDartsWins)) state.totalDartsWins = Math.max(0, d.totalDartsWins | 0);
      if (Number.isFinite(d.totalDanceHighScore)) state.totalDanceHighScore = Math.max(0, d.totalDanceHighScore | 0);
      if (Number.isFinite(d.totalClubEarnings)) state.totalClubEarnings = Math.max(0, d.totalClubEarnings | 0);
      if (d.upgrades && typeof d.upgrades === 'object') {
        for (const k of Object.keys(state.upgrades)) {
          if ( k in d.upgrades ) state.upgrades[k] = Boolean(d.upgrades[k]);
        }
      }
      if (Number.isFinite(d.djTrackIndex)) {
        state.djTrackIndex = ((d.djTrackIndex | 0) % 3 + 3) % 3;
      }
    } catch (_) {}
  }

  // ============================================================================
  // SCOPED NIGHTCLUB & BAR CSS + HIGH-DPI OVERLAY DOM ARCHITECTURE
  // ============================================================================
  const dom = {
    styleEl: null,
    drunkOverlay: null,
    drunkGhostA: null,
    drunkGhostB: null,
    drunkBadge: null,
    drunkBadgeFill: null,
    drunkBadgeVal: null,
    blackoutOverlay: null,
    blackoutSpiralCanvas: null,
    blackoutTitle: null,
    blackoutSub: null,
    paradeBanner: null,
    brawlHud: null,
    brawlList: null,
    modalRoot: null,
    modalCard: null,
    headerCash: null,
    headerHp: null,
    headerDrunk: null,
    headerPop: null,
    headerTrackBtn: null,
    closeBtn: null,
    tabButtons: {},
    panels: {},
    // Bar Counter DOM
    drinkGrid: null,
    barStageCanvas: null,
    barDrinkTitle: null,
    barDrinkDesc: null,
    barDrinkStats: null,
    barQuoteBox: null,
    btnOrderDrink: null,
    btnTipBartender: null,
    btnBuyRound: null,
    // Dancefloor DOM
    danceCanvas: null,
    danceTrackSelect: null,
    danceDiffSelect: null,
    btnDanceStart: null,
    btnDanceCashout: null,
    danceScoreVal: null,
    danceComboVal: null,
    danceHypeFill: null,
    danceHypePct: null,
    danceMoveButtons: [],
    danceTouchPads: [],
    // Bida 8 Bi DOM
    poolCanvas: null,
    poolSpinCanvas: null,
    poolOpponentSelect: null,
    poolWagerInput: null,
    btnPoolNewMatch: null,
    btnPoolResetSpin: null,
    poolTurnBanner: null,
    poolGroupPlayer: null,
    poolGroupAi: null,
    poolRackTrayPlayer: null,
    poolRackTrayAi: null,
    poolStatusMsg: null,
    poolPowerFill: null,
    // Phi Tiêu Tửu Quán DOM
    dartsCanvas: null,
    dartsModeSelect: null,
    dartsOpponentSelect: null,
    dartsWagerInput: null,
    btnDartsStart: null,
    dartsPlayerScore: null,
    dartsAiScore: null,
    dartsDartsLeft: null,
    dartsTurnInfo: null,
    dartsCricketGrid: null,
    dartsDrunkWarn: null,
    // VIP & Bouncer Management DOM
    vipDeedStatus: null,
    btnBuyClub: null,
    vipSafeAmount: null,
    vipSafeTimer: null,
    vipPopFill: null,
    vipPopLabel: null,
    btnCollectSafe: null,
    btnPromoteClub: null,
    vipUpgradeList: null,
    bouncerMissionList: null,
    vipStatsSummary: null
  };

  function buildNightlifeCSS() {
    return `
      #nl-drunk-world-fx {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 42;
        opacity: 0;
        transition: opacity 0.25s ease;
        overflow: hidden;
      }
      #nl-drunk-world-fx.active {
        opacity: 1;
      }
      #nl-drunk-ghost-cyan,
      #nl-drunk-ghost-magenta {
        position: absolute;
        inset: -24px;
        pointer-events: none;
        mix-blend-mode: screen;
      }
      #nl-drunk-ghost-cyan {
        box-shadow: inset 0 0 115px rgba(6, 182, 212, 0.36);
        background: radial-gradient(circle at 48% 50%, transparent 42%, rgba(6, 182, 212, 0.16) 100%);
      }
      #nl-drunk-ghost-magenta {
        box-shadow: inset 0 0 125px rgba(236, 72, 153, 0.38);
        background: radial-gradient(circle at 52% 50%, transparent 40%, rgba(217, 70, 239, 0.18) 100%);
      }
      #nl-drunk-hud-pill {
        position: fixed;
        top: 94px;
        right: 18px;
        z-index: 55;
        display: none;
        align-items: center;
        gap: 9px;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(13, 10, 26, 0.86);
        border: 1px solid rgba(236, 72, 153, 0.6);
        box-shadow: 0 6px 22px rgba(236, 72, 153, 0.28);
        color: #fdf4ff;
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 12px;
        font-weight: 700;
        pointer-events: none;
      }
      #nl-drunk-hud-pill.visible {
        display: flex;
      }
      .nl-drunk-bar-track {
        width: 68px;
        height: 7px;
        border-radius: 99px;
        background: rgba(255, 255, 255, 0.14);
        overflow: hidden;
      }
      .nl-drunk-bar-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #22d3ee, #ec4899, #ef4444);
        transition: width 0.15s linear;
      }
      #nl-parade-toast {
        position: fixed;
        top: 15%;
        left: 50%;
        transform: translateX(-50%) scale(0.94);
        z-index: 64;
        padding: 14px 28px;
        border-radius: 16px;
        background: linear-gradient(135deg, rgba(28, 19, 8, 0.94), rgba(68, 42, 6, 0.92));
        border: 2px solid #fbbf24;
        box-shadow: 0 0 40px rgba(251, 191, 36, 0.55);
        color: #fef3c7;
        font-family: 'Segoe UI', system-ui, sans-serif;
        text-align: center;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      #nl-parade-toast.visible {
        opacity: 1;
        transform: translateX(-50%) scale(1);
      }
      #nl-brawl-hud {
        position: fixed;
        top: 136px;
        left: 20px;
        z-index: 56;
        min-width: 248px;
        padding: 11px 14px;
        border-radius: 12px;
        background: rgba(15, 11, 28, 0.88);
        border: 1px solid rgba(244, 63, 94, 0.65);
        box-shadow: 0 8px 26px rgba(0, 0, 0, 0.5);
        color: #f8fafc;
        font-family: 'Segoe UI', system-ui, sans-serif;
        display: none;
        pointer-events: none;
      }
      #nl-brawl-hud.visible {
        display: block;
      }
      .nl-brawl-title {
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.6px;
        color: #fb7185;
        text-transform: uppercase;
        margin-bottom: 7px;
      }
      .nl-brawl-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 5px;
        font-size: 11.5px;
      }
      .nl-brawl-hp-bg {
        flex: 1;
        height: 6px;
        background: rgba(255, 255, 255, 0.14);
        border-radius: 99px;
        overflow: hidden;
      }
      .nl-brawl-hp-fg {
        height: 100%;
        background: linear-gradient(90deg, #f43f5e, #fb923c);
      }
      #nl-blackout-screen {
        position: fixed;
        inset: 0;
        z-index: 260;
        background: #04020a;
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: all;
        opacity: 0;
        transition: opacity 0.35s ease;
      }
      #nl-blackout-screen.visible {
        display: flex;
        opacity: 1;
      }
      #nl-blackout-canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }
      .nl-blackout-caption {
        position: relative;
        z-index: 2;
        text-align: center;
        font-family: 'Segoe UI', system-ui, sans-serif;
        padding: 24px;
      }
      .nl-blackout-title {
        font-size: clamp(28px, 5vw, 52px);
        font-weight: 900;
        letter-spacing: 4px;
        color: #f8fafc;
        text-shadow: 0 0 28px rgba(168, 85, 247, 0.85);
        margin-bottom: 12px;
      }
      .nl-blackout-sub {
        font-size: clamp(14px, 2.2vw, 20px);
        color: #cbd5e1;
        font-style: italic;
      }
      #nl-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 175;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 14px;
        background: radial-gradient(circle at 50% 25%, rgba(30, 12, 54, 0.62), rgba(5, 4, 14, 0.82));
        backdrop-filter: blur(5px);
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        color: #f8fafc;
        user-select: none;
      }
      #nl-modal-backdrop.open {
        display: flex;
      }
      #nl-modal-backdrop.dance-transparent {
        background: linear-gradient(180deg, rgba(8, 6, 20, 0.45) 0%, rgba(8, 6, 20, 0.18) 50%, rgba(8, 6, 20, 0.58) 100%);
        backdrop-filter: none;
      }
      .nl-club-shell {
        width: min(1140px, 97vw);
        max-height: 93vh;
        display: flex;
        flex-direction: column;
        border-radius: 18px;
        background: linear-gradient(160deg, rgba(16, 12, 34, 0.95), rgba(9, 9, 22, 0.97));
        border: 1px solid rgba(236, 72, 153, 0.48);
        box-shadow: 0 22px 65px rgba(0, 0, 0, 0.78), 0 0 38px rgba(217, 70, 239, 0.22);
        overflow: hidden;
      }
      #nl-modal-backdrop.dance-transparent .nl-club-shell {
        background: linear-gradient(160deg, rgba(14, 10, 30, 0.76), rgba(8, 8, 20, 0.82));
      }
      .nl-topbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 11px 16px;
        background: linear-gradient(90deg, rgba(46, 16, 101, 0.85), rgba(15, 23, 42, 0.9));
        border-bottom: 1px solid rgba(236, 72, 153, 0.35);
      }
      .nl-brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .nl-brand-logo {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        background: linear-gradient(135deg, #ec4899, #8b5cf6, #06b6d4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        box-shadow: 0 0 14px rgba(236, 72, 153, 0.65);
      }
      .nl-brand-title {
        font-size: 15px;
        font-weight: 900;
        letter-spacing: 1.1px;
        background: linear-gradient(90deg, #f9a8d4, #67e8f9);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .nl-brand-sub {
        font-size: 11px;
        color: #94a3b8;
      }
      .nl-telemetry {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      .nl-stat-chip {
        padding: 5px 10px;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.78);
        border: 1px solid rgba(148, 163, 184, 0.28);
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
      }
      .nl-stat-chip.cash { color: #4ade80; border-color: rgba(74, 222, 128, 0.4); }
      .nl-stat-chip.hp { color: #f87171; border-color: rgba(248, 113, 113, 0.4); }
      .nl-stat-chip.drunk { color: #f472b6; border-color: rgba(244, 114, 182, 0.45); }
      .nl-stat-chip.pop { color: #fbbf24; border-color: rgba(251, 191, 36, 0.45); }
      .nl-dj-btn {
        cursor: pointer;
        padding: 5px 11px;
        border-radius: 999px;
        border: 1px solid rgba(34, 211, 238, 0.55);
        background: rgba(8, 51, 68, 0.65);
        color: #67e8f9;
        font-size: 11.5px;
        font-weight: 700;
      }
      .nl-dj-btn:hover { background: rgba(14, 116, 144, 0.8); }
      .nl-close-btn {
        cursor: pointer;
        padding: 6px 13px;
        border-radius: 9px;
        border: 1px solid rgba(248, 113, 113, 0.55);
        background: rgba(127, 29, 29, 0.65);
        color: #fecaca;
        font-size: 12px;
        font-weight: 800;
      }
      .nl-close-btn:hover { background: rgba(185, 28, 28, 0.88); color: #fff; }
      .nl-nav-tabs {
        display: flex;
        gap: 6px;
        padding: 8px 16px;
        background: rgba(9, 11, 24, 0.9);
        border-bottom: 1px solid rgba(148, 163, 184, 0.16);
        overflow-x: auto;
      }
      .nl-tab-btn {
        cursor: pointer;
        padding: 7px 14px;
        border-radius: 9px;
        border: 1px solid rgba(148, 163, 184, 0.2);
        background: rgba(30, 41, 59, 0.5);
        color: #cbd5e1;
        font-size: 12.5px;
        font-weight: 700;
        white-space: nowrap;
        transition: all 0.15s ease;
      }
      .nl-tab-btn:hover {
        border-color: rgba(236, 72, 153, 0.55);
        color: #fff;
      }
      .nl-tab-btn.active {
        background: linear-gradient(135deg, rgba(219, 39, 119, 0.85), rgba(124, 58, 237, 0.85));
        border-color: #f472b6;
        color: #ffffff;
        box-shadow: 0 0 16px rgba(236, 72, 153, 0.42);
      }
      .nl-body-wrap {
        flex: 1;
        overflow-y: auto;
        padding: 14px 16px;
      }
      .nl-panel {
        display: none;
      }
      .nl-panel.active {
        display: block;
      }
      .nl-bar-layout {
        display: grid;
        grid-template-columns: 1.35fr 1fr;
        gap: 14px;
      }
      @media (max-width: 860px) {
        .nl-bar-layout, .nl-pool-layout, .nl-darts-layout, .nl-vip-layout {
          grid-template-columns: 1fr !important;
        }
      }
      .nl-drink-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(156px, 1fr));
        gap: 10px;
      }
      .nl-drink-card {
        cursor: pointer;
        border-radius: 12px;
        padding: 9px;
        background: rgba(22, 27, 48, 0.78);
        border: 1px solid rgba(148, 163, 184, 0.22);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        transition: transform 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease;
      }
      .nl-drink-card:hover {
        transform: translateY(-2px);
        border-color: rgba(34, 211, 238, 0.6);
      }
      .nl-drink-card.selected {
        border-color: #ec4899;
        background: linear-gradient(180deg, rgba(59, 17, 75, 0.82), rgba(20, 24, 46, 0.92));
        box-shadow: 0 0 18px rgba(236, 72, 153, 0.35);
      }
      .nl-drink-illust {
        width: 84px;
        height: 84px;
        border-radius: 10px;
        margin-bottom: 6px;
        background: radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.08), rgba(4, 6, 16, 0.65));
      }
      .nl-drink-name {
        font-size: 12.5px;
        font-weight: 800;
        color: #f8fafc;
        line-height: 1.25;
        margin-bottom: 3px;
      }
      .nl-drink-price {
        font-size: 12px;
        font-weight: 900;
        color: #4ade80;
      }
      .nl-drink-alc {
        font-size: 10.5px;
        color: #cbd5e1;
        margin-top: 2px;
      }
      .nl-bar-stage {
        border-radius: 14px;
        padding: 13px;
        background: rgba(15, 18, 36, 0.88);
        border: 1px solid rgba(34, 211, 238, 0.32);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      #nl-bar-stage-canvas {
        width: 100%;
        height: 196px;
        border-radius: 10px;
        background: #070914;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .nl-quote-box {
        padding: 9px 11px;
        border-radius: 9px;
        background: rgba(30, 41, 59, 0.65);
        border-left: 3px solid #22d3ee;
        font-size: 12px;
        color: #e2e8f0;
        line-height: 1.4;
      }
      .nl-btn-primary {
        cursor: pointer;
        padding: 11px 16px;
        border-radius: 10px;
        border: none;
        background: linear-gradient(135deg, #ec4899, #8b5cf6);
        color: #fff;
        font-size: 13.5px;
        font-weight: 800;
        letter-spacing: 0.4px;
        box-shadow: 0 6px 20px rgba(236, 72, 153, 0.4);
      }
      .nl-btn-primary:hover { filter: brightness(1.1); }
      .nl-btn-secondary {
        cursor: pointer;
        padding: 8px 12px;
        border-radius: 9px;
        border: 1px solid rgba(56, 189, 248, 0.45);
        background: rgba(15, 23, 42, 0.85);
        color: #7dd3fc;
        font-size: 12px;
        font-weight: 700;
      }
      .nl-btn-secondary:hover { background: rgba(30, 58, 138, 0.65); color: #fff; }
      .nl-btn-gold {
        cursor: pointer;
        padding: 10px 15px;
        border-radius: 10px;
        border: 1px solid #fbbf24;
        background: linear-gradient(135deg, #d97706, #b45309);
        color: #fef3c7;
        font-size: 13px;
        font-weight: 800;
      }
      .nl-btn-gold:hover { filter: brightness(1.12); }
      .nl-row-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      /* Dancefloor Layout */
      .nl-dance-layout {
        display: grid;
        grid-template-columns: 1.55fr 1fr;
        gap: 14px;
        align-items: stretch;
      }
      @media (max-width: 860px) {
        .nl-dance-layout { grid-template-columns: 1fr; }
      }
      #nl-dance-canvas {
        width: 100%;
        height: 410px;
        border-radius: 14px;
        background: rgba(7, 6, 18, 0.72);
        border: 1px solid rgba(236, 72, 153, 0.45);
        display: block;
      }
      .nl-dance-touch-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-top: 8px;
      }
      .nl-dance-pad {
        cursor: pointer;
        padding: 11px 6px;
        border-radius: 10px;
        border: 1px solid rgba(103, 232, 249, 0.5);
        background: rgba(15, 23, 42, 0.84);
        color: #f8fafc;
        font-size: 14px;
        font-weight: 900;
        text-align: center;
      }
      .nl-dance-pad:active, .nl-dance-pad.pressed {
        background: linear-gradient(135deg, #ec4899, #06b6d4);
        transform: scale(0.96);
      }
      .nl-hype-meter-box {
        padding: 11px;
        border-radius: 11px;
        background: rgba(15, 23, 42, 0.82);
        border: 1px solid rgba(168, 85, 247, 0.38);
      }
      .nl-hype-bar-bg {
        height: 13px;
        border-radius: 99px;
        background: rgba(255, 255, 255, 0.12);
        overflow: hidden;
        margin-top: 6px;
      }
      .nl-hype-bar-fg {
        height: 100%;
        width: 20%;
        background: linear-gradient(90deg, #06b6d4, #a855f7, #ec4899, #fbbf24);
        transition: width 0.12s ease;
      }
      .nl-move-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 7px;
      }
      /* Bida 8 Bi & Phi Tiêu Layouts */
      .nl-pool-layout {
        display: grid;
        grid-template-columns: 1.9fr 0.9fr;
        gap: 14px;
        align-items: start;
      }
      #nl-pool-canvas {
        width: 100%;
        aspect-ratio: 16 / 9.3;
        border-radius: 14px;
        background: #071912;
        border: 2px solid rgba(217, 119, 6, 0.65);
        cursor: crosshair;
        display: block;
      }
      .nl-side-card {
        border-radius: 13px;
        padding: 12px;
        background: rgba(15, 20, 38, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.24);
        display: flex;
        flex-direction: column;
        gap: 9px;
      }
      .nl-select, .nl-input {
        width: 100%;
        padding: 7px 10px;
        border-radius: 8px;
        border: 1px solid rgba(148, 163, 184, 0.35);
        background: rgba(9, 13, 28, 0.95);
        color: #f8fafc;
        font-size: 12.5px;
        font-weight: 600;
      }
      .nl-spin-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      #nl-pool-spin-canvas {
        width: 78px;
        height: 78px;
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid rgba(248, 250, 252, 0.35);
      }
      .nl-ball-tray {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        min-height: 22px;
      }
      .nl-mini-ball {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 9.5px;
        font-weight: 900;
        color: #0f172a;
        background: #f8fafc;
        border: 1px solid rgba(0,0,0,0.5);
      }
      .nl-darts-layout {
        display: grid;
        grid-template-columns: 1.45fr 1fr;
        gap: 14px;
        align-items: start;
      }
      #nl-darts-canvas {
        width: 100%;
        max-height: 455px;
        aspect-ratio: 1.15 / 1;
        border-radius: 14px;
        background: radial-gradient(circle at 50% 50%, #1c1917, #090a12);
        border: 1px solid rgba(251, 191, 36, 0.45);
        cursor: none;
        display: block;
      }
      .nl-score-duel {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .nl-score-box {
        padding: 9px;
        border-radius: 10px;
        background: rgba(9, 13, 26, 0.88);
        border: 1px solid rgba(148, 163, 184, 0.22);
        text-align: center;
      }
      .nl-score-big {
        font-size: 26px;
        font-weight: 900;
        color: #38bdf8;
      }
      .nl-vip-layout {
        display: grid;
        grid-template-columns: 1.1fr 1fr;
        gap: 14px;
      }
      .nl-vip-card {
        border-radius: 14px;
        padding: 14px;
        background: rgba(16, 20, 39, 0.9);
        border: 1px solid rgba(251, 191, 36, 0.34);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .nl-upgrade-item, .nl-mission-item {
        padding: 10px 12px;
        border-radius: 10px;
        background: rgba(9, 13, 28, 0.82);
        border: 1px solid rgba(148, 163, 184, 0.2);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
    `;
  }

  function ensureNightlifeDOM() {
    if (typeof document === 'undefined') return false;
    if (dom.modalRoot && document.body.contains(dom.modalRoot)) return true;

    const styleEl = document.createElement('style');
    styleEl.id = 'nightlife-bar-styles';
    styleEl.textContent = buildNightlifeCSS();
    document.head.appendChild(styleEl);
    dom.styleEl = styleEl;

    // 1. World Drunk Double-Vision & Chromatic Overlay
    const drunkOverlay = document.createElement('div');
    drunkOverlay.id = 'nl-drunk-world-fx';
    drunkOverlay.innerHTML = `
      <div id="nl-drunk-ghost-cyan"></div>
      <div id="nl-drunk-ghost-magenta"></div>
    `;
    document.body.appendChild(drunkOverlay);
    dom.drunkOverlay = drunkOverlay;
    dom.drunkGhostA = drunkOverlay.querySelector('#nl-drunk-ghost-cyan');
    dom.drunkGhostB = drunkOverlay.querySelector('#nl-drunk-ghost-magenta');

    // 2. HUD BAC Intoxication Pill
    const drunkPill = document.createElement('div');
    drunkPill.id = 'nl-drunk-hud-pill';
    drunkPill.innerHTML = `
      <span>🍸 CỒN</span>
      <div class="nl-drunk-bar-track"><div class="nl-drunk-bar-fill"></div></div>
      <span class="nl-drunk-pct">0%</span>
    `;
    document.body.appendChild(drunkPill);
    dom.drunkBadge = drunkPill;
    dom.drunkBadgeFill = drunkPill.querySelector('.nl-drunk-bar-fill');
    dom.drunkBadgeVal = drunkPill.querySelector('.nl-drunk-pct');

    // 3. VIP Champagne Bottle-Girl Parade Toast
    const paradeToast = document.createElement('div');
    paradeToast.id = 'nl-parade-toast';
    paradeToast.innerHTML = `
      <div style="font-size:18px;font-weight:900;letter-spacing:1px;color:#fde047;">🍾✨ ĐOÀN VŨ CÔNG PHÁO SÁNG BLÊUTER'D VIP! ✨🍾</div>
      <div style="font-size:12.5px;margin-top:4px;">Pháo sáng vàng 24K rực cháy • Hồi 100% Máu + 50 Giáp + 26% Danh Tiếng Hộp Đêm!</div>
    `;
    document.body.appendChild(paradeToast);
    dom.paradeBanner = paradeToast;

    // 4. Túy Tiên Lâu Bar Brawl Live Enemy Health HUD
    const brawlHud = document.createElement('div');
    brawlHud.id = 'nl-brawl-hud';
    brawlHud.innerHTML = `
      <div class="nl-brawl-title">🥊 NHIỆM VỤ BOUNCER CLUB ECLIPSE</div>
      <div class="nl-brawl-list"></div>
    `;
    document.body.appendChild(brawlHud);
    dom.brawlHud = brawlHud;
    dom.brawlList = brawlHud.querySelector('.nl-brawl-list');

    // 5. Macbeth 100% Say Ngất Spiral Screen ("3 GIỜ SAU...")
    const blackoutEl = document.createElement('div');
    blackoutEl.id = 'nl-blackout-screen';
    blackoutEl.innerHTML = `
      <canvas id="nl-blackout-canvas"></canvas>
      <div class="nl-blackout-caption">
        <div class="nl-blackout-title">3 GIỜ SAU...</div>
        <div class="nl-blackout-sub">Ly rượu Macbeth bí ẩn đã đánh gục hoàn toàn trí nhớ của bạn...</div>
      </div>
    `;
    document.body.appendChild(blackoutEl);
    dom.blackoutOverlay = blackoutEl;
    dom.blackoutSpiralCanvas = blackoutEl.querySelector('#nl-blackout-canvas');
    dom.blackoutTitle = blackoutEl.querySelector('.nl-blackout-title');
    dom.blackoutSub = blackoutEl.querySelector('.nl-blackout-sub');

    // 6. Main Interactive Nightlife & Bar Modal Shell
    const modalRoot = document.createElement('div');
    modalRoot.id = 'nl-modal-backdrop';
    modalRoot.innerHTML = `
      <div class="nl-club-shell">
        <div class="nl-topbar">
          <div class="nl-brand">
            <div class="nl-brand-logo">🍸</div>
            <div>
              <div class="nl-brand-title">CLUB ECLIPSE &amp; NEON BAR</div>
              <div class="nl-brand-sub">Tổ Hợp Giải Trí Đêm Đại Lộ Ven Biển Tiên Thành</div>
            </div>
          </div>
          <div class="nl-telemetry">
            <span class="nl-stat-chip cash" data-role="cash">$7,860</span>
            <span class="nl-stat-chip hp" data-role="hp">❤️ 100 HP</span>
            <span class="nl-stat-chip drunk" data-role="drunk">🍺 Cồn: 0%</span>
            <span class="nl-stat-chip pop" data-role="pop">🔥 Độ Hot: 58%</span>
            <button type="button" class="nl-dj-btn" data-role="dj-track">🎧 DJ Mix #1: Deep House</button>
            <button type="button" class="nl-close-btn" data-role="close">✕ ĐÓNG [ESC]</button>
          </div>
        </div>
        <div class="nl-nav-tabs">
          <button type="button" class="nl-tab-btn active" data-tab="bar_counter">🍸 Quầy Bar Tiên Tửu</button>
          <button type="button" class="nl-tab-btn" data-tab="dancefloor">🕺 Sàn Nhảy Nhạc Hội Rhythm</button>
          <button type="button" class="nl-tab-btn" data-tab="pool_table">🎱 Bi-a 8 Bóng</button>
          <button type="button" class="nl-tab-btn" data-tab="darts_board">🎯 Phi Tiêu Phi Tiêu Tửu Quán</button>
          <button type="button" class="nl-tab-btn" data-tab="dj_booth">🎛️ Bàn DJ &amp; Đấu Tửu</button>
          <button type="button" class="nl-tab-btn" data-tab="vip_desk">👑 Quản Lý VIP &amp; Bouncer</button>
        </div>
        <div class="nl-body-wrap">
          <!-- PANEL 1: COCKTAIL BAR -->
          <div class="nl-panel active" data-panel="bar_counter">
            <div class="nl-bar-layout">
              <div>
                <div style="font-size:13px;font-weight:800;color:#f9a8d4;margin-bottom:8px;">
                  THỰC ĐƠN PHA CHẾ THƯỢNG HẠNG (8 ĐỒ UỐNG MINH HỌA THỦ CÔNG)
                </div>
                <div class="nl-drink-grid"></div>
              </div>
              <div class="nl-bar-stage">
                <canvas id="nl-bar-stage-canvas" width="420" height="210"></canvas>
                <div style="font-size:16px;font-weight:900;color:#f8fafc;" data-role="bar-title">Tiên Tửu Neon Cyber</div>
                <div style="font-size:12px;color:#94a3b8;" data-role="bar-desc"></div>
                <div style="font-size:12px;font-weight:700;color:#67e8f9;" data-role="bar-stats"></div>
                <div class="nl-quote-box" data-role="bar-quote">Bartender: "Chào mừng tới Túy Tiên Lâu! Hôm nay uống nhẹ hay làm tới bến đây người anh em?"</div>
                <button type="button" class="nl-btn-primary" data-role="btn-order">🍸 GỌI &amp; THƯỞNG THỨC NGAY</button>
                <div class="nl-row-actions">
                  <button type="button" class="nl-btn-secondary" data-role="btn-tip">💵 Bo Bartender $25 (Nghe Tin Mật)</button>
                  <button type="button" class="nl-btn-gold" data-role="btn-round">🥂 Mời Cả Quán 1 Chầu ($500 • +12% Độ Hot)</button>
                </div>
              </div>
            </div>
          </div>

          <!-- PANEL 2: Nhạc Hội RHYTHM DANCEFLOOR -->
          <div class="nl-panel" data-panel="dancefloor">
            <div class="nl-dance-layout">
              <div>
                <canvas id="nl-dance-canvas" width="680" height="410"></canvas>
                <div class="nl-dance-touch-row">
                  <button type="button" class="nl-dance-pad" data-lane="0">⬅ TRÁI [A / ←]</button>
                  <button type="button" class="nl-dance-pad" data-lane="1">⬇ XUỐNG [S / ↓]</button>
                  <button type="button" class="nl-dance-pad" data-lane="2">⬆ LÊN [W / ↑]</button>
                  <button type="button" class="nl-dance-pad" data-lane="3">➡ PHẢI [D / →]</button>
                </div>
              </div>
              <div class="nl-side-card">
                <div style="font-size:14px;font-weight:900;color:#67e8f9;">🕺 ĐẠI TIỆC SÀN NHẢY Nhạc Hội RHYTHM FEVER</div>
                <div style="font-size:11.5px;color:#cbd5e1;">Bấm phím <b>W/A/S/D</b>, <b>Mũi Tên</b> hoặc chạm 4 ô cảm ứng đúng lúc Vòng Nhịp chạm tâm sáng!</div>
                <label style="font-size:11.5px;color:#94a3b8;">Bản phối DJ Túy Tiên Lâu:</label>
                <select class="nl-select" data-role="dance-track">
                  <option value="0">Mix #1: Solomun After Hours Deep House (124 BPM)</option>
                  <option value="1">Mix #2: Neon Bồng Lai Cyber Electro (128 BPM)</option>
                  <option value="2">Mix #3: Berlin Underground Acid Techno (134 BPM)</option>
                </select>
                <label style="font-size:11.5px;color:#94a3b8;">Độ khó Vũ Đạo:</label>
                <select class="nl-select" data-role="dance-diff">
                  <option value="0">Chill Groove (Dễ • Thưởng x1.0)</option>
                  <option value="1" selected>Túy Tiên Lâu Fever (Chuẩn • Thưởng x1.5)</option>
                  <option value="2">DJ God-Mode (Siêu Khó • Thưởng x2.2)</option>
                </select>
                <div class="nl-score-duel">
                  <div class="nl-score-box">
                    <div style="font-size:10.5px;color:#94a3b8;">ĐIỂM FEVER</div>
                    <div class="nl-score-big" data-role="dance-score">0</div>
                  </div>
                  <div class="nl-score-box">
                    <div style="font-size:10.5px;color:#94a3b8;">CHUỖI COMBO</div>
                    <div class="nl-score-big" style="color:#f472b6;" data-role="dance-combo">0x</div>
                  </div>
                </div>
                <div class="nl-hype-meter-box">
                  <div style="display:flex;justify-content:space-between;font-size:11.5px;font-weight:800;">
                    <span>🔥 NHIỆT ĐỘ ĐÁM ĐÔNG (CLUB HYPE)</span>
                    <span data-role="dance-hype-pct">20%</span>
                  </div>
                  <div class="nl-hype-bar-bg"><div class="nl-hype-bar-fg" data-role="dance-hype-fill"></div></div>
                </div>
                <div style="font-size:11.5px;font-weight:700;color:#e2e8f0;">Động tác 3D trực tiếp trên Sàn LED (Phím 1–6):</div>
                <div class="nl-move-grid" data-role="dance-moves"></div>
                <div class="nl-row-actions" style="margin-top:4px;">
                  <button type="button" class="nl-btn-primary" style="flex:1;" data-role="dance-start">▶ BẮT ĐẦU NHẢY</button>
                  <button type="button" class="nl-btn-gold" data-role="dance-cashout">💰 NHẬN THƯỞNG</button>
                </div>
              </div>
            </div>
          </div>

          <!-- PANEL 3: 8-BALL POOL -->
          <div class="nl-panel" data-panel="pool_table">
            <div class="nl-pool-layout">
              <div>
                <canvas id="nl-pool-canvas" width="920" height="534"></canvas>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:7px;font-size:12px;color:#cbd5e1;">
                  <span data-role="pool-status">Rê chuột ngắm đường cơ, kéo lùi gậy (hoặc giữ Chuột Trái / Space) để căn lực đánh!</span>
                  <span>Lực cơ: <strong style="color:#fbbf24;" data-role="pool-power">0%</strong></span>
                </div>
              </div>
              <div class="nl-side-card">
                <div style="font-size:14px;font-weight:900;color:#4ade80;">🎱 BI-A 8 BÓNG VẬT LÝ CHUYÊN NGHIỆP</div>
                <div style="padding:7px 10px;border-radius:8px;background:rgba(6,78,59,0.55);border:1px solid rgba(52,211,153,0.4);font-size:12px;font-weight:800;" data-role="pool-turn">
                  Lượt của bạn • Bàn Mở (Chưa phân Trơn / Sọc)
                </div>
                <div style="font-size:11.5px;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                    <span>👤 Bạn (<b data-role="pool-grp-p">Chưa chọn</b>):</span>
                  </div>
                  <div class="nl-ball-tray" data-role="pool-tray-p"></div>
                  <div style="display:flex;justify-content:space-between;margin:6px 0 3px;">
                    <span>🤖 Đối thủ (<b data-role="pool-grp-ai">Chưa chọn</b>):</span>
                  </div>
                  <div class="nl-ball-tray" data-role="pool-tray-ai"></div>
                </div>
                <div class="nl-spin-row">
                  <canvas id="nl-pool-spin-canvas" width="84" height="84"></canvas>
                  <div style="flex:1;font-size:11px;color:#cbd5e1;">
                    <div style="font-weight:800;color:#f8fafc;margin-bottom:3px;">Tâm Xoáy Bi Cái (English)</div>
                    <div>Chấm đỏ chỉnh Áp-phê Trô (Kéo), Cu-lê (Đẩy) &amp; Xoáy Cạnh Băng.</div>
                    <button type="button" class="nl-btn-secondary" style="margin-top:5px;padding:4px 9px;" data-role="pool-reset-spin">Đặt lại tâm bi</button>
                  </div>
                </div>
                <label style="font-size:11.5px;color:#94a3b8;">Chọn Tay Cơ Đối Thủ:</label>
                <select class="nl-select" data-role="pool-opponent">
                  <option value="0">Gã Say Billy ($100 – $1,000 • Nghiệp dư)</option>
                  <option value="1" selected>Tay Cơ Đường Phố Rico ($500 – $5,000 • Cao thủ)</option>
                  <option value="2">Cá Mập Bi-a Minh Vũ ($2,000 – $10,000 • Huyền thoại)</option>
                </select>
                <label style="font-size:11.5px;color:#94a3b8;">Tiền Cược Ván Đấu ($100 – $10,000):</label>
                <input type="number" class="nl-input" min="100" max="10000" step="100" value="500" data-role="pool-wager" />
                <button type="button" class="nl-btn-primary" data-role="pool-new">🎱 XẾP BÓNG &amp; ĐẶT CƯỢC VÁN MỚI</button>
              </div>
            </div>
          </div>

          <!-- PANEL 4: PUB DARTS -->
          <div class="nl-panel" data-panel="darts_board">
            <div class="nl-darts-layout">
              <div>
                <canvas id="nl-darts-canvas" width="600" height="520"></canvas>
              </div>
              <div class="nl-side-card">
                <div style="font-size:14px;font-weight:900;color:#fbbf24;">🎯 PHI TIÊU PUB DARTS 301 &amp; CRICKET</div>
                <div style="font-size:11.5px;color:#f472b6;font-weight:700;display:none;" data-role="darts-drunk-warn">
                  🍺 Cảnh báo: Nồng độ cồn cao khiến hồng tâm lảo đảo mạnh!
                </div>
                <div class="nl-score-duel">
                  <div class="nl-score-box">
                    <div style="font-size:10.5px;color:#94a3b8;">👤 ĐIỂM CỦA BẠN</div>
                    <div class="nl-score-big" data-role="darts-score-p">301</div>
                  </div>
                  <div class="nl-score-box">
                    <div style="font-size:10.5px;color:#94a3b8;">🤖 ĐỐI THỦ AI</div>
                    <div class="nl-score-big" style="color:#fb7185;" data-role="darts-score-ai">301</div>
                  </div>
                </div>
                <div style="padding:8px 10px;border-radius:8px;background:rgba(30,41,59,0.75);font-size:12px;" data-role="darts-turn-info">
                  Lượt của bạn • Còn <b>3</b> phi tiêu • Giữ Chuột Trái hoặc [SPACE] để nạp lực ném!
                </div>
                <div data-role="darts-cricket-box" style="display:none;font-size:11.5px;"></div>
                <label style="font-size:11.5px;color:#94a3b8;">Chế Độ Thi Đấu:</label>
                <select class="nl-select" data-role="darts-mode">
                  <option value="301">301 Truyền Thống (Đưa điểm về đúng 0)</option>
                  <option value="cricket">Cricket Chiến Thuật (Khóa các ô 20, 19, 18, 17, 16, 15 &amp; Bull)</option>
                </select>
                <label style="font-size:11.5px;color:#94a3b8;">Đối Thủ Quán Rượu:</label>
                <select class="nl-select" data-role="darts-opponent">
                  <option value="0">Bợm Nhậu Trevor Jr. (Cược gợi ý $100–$800)</option>
                  <option value="1" selected>Xạ Thủ Cầu Cảng Dutch (Cược gợi ý $500–$2,500)</option>
                  <option value="2">Vua Phi Tiêu Vương Quốc Anh Phil ($1,000–$5,000)</option>
                </select>
                <label style="font-size:11.5px;color:#94a3b8;">Tiền Cược ($100 – $5,000):</label>
                <input type="number" class="nl-input" min="100" max="5000" step="100" value="300" data-role="darts-wager" />
                <button type="button" class="nl-btn-primary" data-role="darts-start">🎯 BẮT ĐẦU TRẬN PHI TIÊU MỚI</button>
              </div>
            </div>
          </div>

          <!-- PANEL 5: VIP CLUB OWNERSHIP & BOUNCER SECURITY -->
          <div class="nl-panel" data-panel="vip_desk">
            <div class="nl-vip-layout">
              <div class="nl-vip-card">
                <div style="font-size:15px;font-weight:900;color:#fde047;">👑 SỞ HỮU CLUB ECLIPSE &amp; KÉT SẮT THU NHẬP THỤ ĐỘNG</div>
                <div style="font-size:12.5px;color:#e2e8f0;" data-role="vip-deed-status"></div>
                <button type="button" class="nl-btn-gold" data-role="btn-buy-club">🏢 MUA ĐỨT HỘP ĐÊM CLUB ECLIPSE ($35,000)</button>
                <div style="padding:12px;border-radius:11px;background:rgba(6,78,59,0.4);border:1px solid rgba(74,222,128,0.4);">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                      <div style="font-size:11px;color:#a7f3d0;">TIỀN MẶT TRONG KÉT SẮT VIP (TỐI ĐA $50,000)</div>
                      <div style="font-size:26px;font-weight:900;color:#4ade80;" data-role="vip-safe-amt">$0</div>
                      <div style="font-size:11px;color:#cbd5e1;" data-role="vip-safe-timer">Chu kỳ doanh thu tiếp theo (+$2,500): 03:00</div>
                    </div>
                    <button type="button" class="nl-btn-primary" data-role="btn-collect-safe">💼 THU TIỀN KÉT SẮT</button>
                  </div>
                </div>
                <div>
                  <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:800;margin-bottom:4px;">
                    <span>🔥 ĐỘ NỔI TIẾNG HỘP ĐÊM (POPULARITY)</span>
                    <span data-role="vip-pop-label">58%</span>
                  </div>
                  <div class="nl-hype-bar-bg"><div class="nl-hype-bar-fg" data-role="vip-pop-fill"></div></div>
                  <div style="margin-top:8px;">
                    <button type="button" class="nl-btn-secondary" data-role="btn-promote-club">📣 Thuê DJ Khách Mời &amp; Phát Tờ Rơi Quảng Bá ($1,200 • +22% Độ Hot)</button>
                  </div>
                </div>
                <div style="font-size:13px;font-weight:800;color:#67e8f9;margin-top:4px;">NÂNG CẤP CƠ SỞ HẠ TẦNG VIP:</div>
                <div style="display:flex;flex-direction:column;gap:8px;" data-role="vip-upgrades"></div>
              </div>
              <div class="nl-vip-card" style="border-color:rgba(244,63,94,0.4);">
                <div style="font-size:15px;font-weight:900;color:#fb7185;">🕶️ NHIỆM VỤ AN NINH BOUNCER &amp; DẸP LOẠN QUẦY BAR</div>
                <div style="font-size:12px;color:#cbd5e1;">
                  Trực tiếp ra tay xử lý khách say quậy phá, hộ tống đại gia VIP hoặc thu hồi nguồn rượu Sâm Panh bị băng đảng cướp để nhận tiền thưởng nóng &amp; giữ vững 100% Độ Hot cho Túy Tiên Lâu!
                </div>
                <div style="display:flex;flex-direction:column;gap:9px;" data-role="bouncer-missions"></div>
                <div style="margin-top:auto;padding:10px;border-radius:10px;background:rgba(15,23,42,0.8);font-size:11.5px;color:#94a3b8;" data-role="vip-stats-summary"></div>
              </div>
            </div>
          </div>

          <!-- PANEL 6: LIVE DJ TURNTABLE MIXER & BAR CHUGGING CHALLENGE -->
          <div class="nl-panel" data-panel="dj_booth">
            <div class="nl-vip-layout">
              <div class="nl-vip-card" style="border-color:rgba(6,182,212,0.48);">
                <div style="font-size:15px;font-weight:900;color:#67e8f9;">🎛️ BÀN CHÀ ĐĨA DJ LIVE &amp; HIỆU ỨNG SÂN KHẤU 3D</div>
                <div style="font-size:11.5px;color:#cbd5e1;">
                  Kéo chuột chà đĩa trên 2 mâm CDJ, vặn thanh Lọc Tần Số (Filter Sweep) và bấm 8 Pad Hiệu Ứng Sân Khấu để bắn khói lạnh CO2 3D &amp; nhận tiền Tip từ khán giả!
                </div>
                <canvas id="nl-dj-deck-canvas" width="520" height="230" style="width:100%;border-radius:12px;background:#070a16;border:1px solid rgba(56,189,248,0.35);cursor:grab;"></canvas>
                <div style="display:flex;align-items:center;gap:10px;font-size:12px;">
                  <span style="font-weight:800;color:#f472b6;white-space:nowrap;">🎚️ DJ Filter Cutoff:</span>
                  <input type="range" min="12" max="100" value="86" style="flex:1;accent-color:#ec4899;" data-role="dj-filter-slider" />
                  <span style="font-weight:800;color:#4ade80;" data-role="dj-tips-val">Tip: $0</span>
                </div>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:7px;" data-role="dj-pad-grid"></div>
              </div>
              <div class="nl-vip-card" style="border-color:rgba(245,158,11,0.48);">
                <div style="font-size:15px;font-weight:900;color:#fbbf24;">🍺 ĐẤU TỬU LƯỢNG QUẦY BAR (CHUGGING DUEL)</div>
                <div style="font-size:11.5px;color:#cbd5e1;">
                  Giữ Chuột Trái hoặc phím <b>[SPACE]</b> để giữ cột bọt bia nằm gọn trong Khung Xanh — Nốc cạn vại nhanh hơn đối thủ mà không trào bọt để ăn trọn x2 tiền cược!
                </div>
                <canvas id="nl-chug-canvas" width="460" height="230" style="width:100%;border-radius:12px;background:#090c1a;border:1px solid rgba(251,191,36,0.35);cursor:pointer;"></canvas>
                <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:8px;">
                  <select class="nl-select" data-role="chug-opponent">
                    <option value="0">"Gấu Nga" Boris ($100–$600 • Khá Đô)</option>
                    <option value="1" selected>Nữ Hoàng Tiệc Tùng Chloe ($300–$1,500 • Cao Thủ)</option>
                    <option value="2">Thánh Nhậu Cầu Cảng Bích Thủy Kênh ($500–$2,500 • Bất Bại)</option>
                  </select>
                  <input type="number" class="nl-input" min="100" max="2500" step="100" value="400" data-role="chug-wager" />
                </div>
                <button type="button" class="nl-btn-gold" data-role="btn-chug-start">🍻 THÁCH ĐẤU TỬU LƯỢNG NGAY</button>
                <div style="font-size:12px;color:#e2e8f0;font-weight:700;" data-role="chug-status">
                  Sẵn sàng so găng tửu lượng! Nhấp giữ trên vại bia hoặc bấm [SPACE] khi bắt đầu!
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalRoot);
    dom.modalRoot = modalRoot;
    dom.modalCard = modalRoot.querySelector('.nl-club-shell');
    dom.headerCash = modalRoot.querySelector('[data-role="cash"]');
    dom.headerHp = modalRoot.querySelector('[data-role="hp"]');
    dom.headerDrunk = modalRoot.querySelector('[data-role="drunk"]');
    dom.headerPop = modalRoot.querySelector('[data-role="pop"]');
    dom.headerTrackBtn = modalRoot.querySelector('[data-role="dj-track"]');
    dom.closeBtn = modalRoot.querySelector('[data-role="close"]');

    modalRoot.querySelectorAll('.nl-tab-btn').forEach((btn) => {
      const key = btn.getAttribute('data-tab');
      dom.tabButtons[key] = btn;
    });
    modalRoot.querySelectorAll('.nl-panel').forEach((pnl) => {
      const key = pnl.getAttribute('data-panel');
      dom.panels[key] = pnl;
    });

    dom.drinkGrid = modalRoot.querySelector('.nl-drink-grid');
    dom.barStageCanvas = modalRoot.querySelector('#nl-bar-stage-canvas');
    dom.barDrinkTitle = modalRoot.querySelector('[data-role="bar-title"]');
    dom.barDrinkDesc = modalRoot.querySelector('[data-role="bar-desc"]');
    dom.barDrinkStats = modalRoot.querySelector('[data-role="bar-stats"]');
    dom.barQuoteBox = modalRoot.querySelector('[data-role="bar-quote"]');
    dom.btnOrderDrink = modalRoot.querySelector('[data-role="btn-order"]');
    dom.btnTipBartender = modalRoot.querySelector('[data-role="btn-tip"]');
    dom.btnBuyRound = modalRoot.querySelector('[data-role="btn-round"]');

    dom.danceCanvas = modalRoot.querySelector('#nl-dance-canvas');
    dom.danceTrackSelect = modalRoot.querySelector('[data-role="dance-track"]');
    dom.danceDiffSelect = modalRoot.querySelector('[data-role="dance-diff"]');
    dom.btnDanceStart = modalRoot.querySelector('[data-role="dance-start"]');
    dom.btnDanceCashout = modalRoot.querySelector('[data-role="dance-cashout"]');
    dom.danceScoreVal = modalRoot.querySelector('[data-role="dance-score"]');
    dom.danceComboVal = modalRoot.querySelector('[data-role="dance-combo"]');
    dom.danceHypeFill = modalRoot.querySelector('[data-role="dance-hype-fill"]');
    dom.danceHypePct = modalRoot.querySelector('[data-role="dance-hype-pct"]');
    dom.danceTouchPads = Array.from(modalRoot.querySelectorAll('.nl-dance-pad'));

    dom.poolCanvas = modalRoot.querySelector('#nl-pool-canvas');
    dom.poolSpinCanvas = modalRoot.querySelector('#nl-pool-spin-canvas');
    dom.poolOpponentSelect = modalRoot.querySelector('[data-role="pool-opponent"]');
    dom.poolWagerInput = modalRoot.querySelector('[data-role="pool-wager"]');
    dom.btnPoolNewMatch = modalRoot.querySelector('[data-role="pool-new"]');
    dom.btnPoolResetSpin = modalRoot.querySelector('[data-role="pool-reset-spin"]');
    dom.poolTurnBanner = modalRoot.querySelector('[data-role="pool-turn"]');
    dom.poolGroupPlayer = modalRoot.querySelector('[data-role="pool-grp-p"]');
    dom.poolGroupAi = modalRoot.querySelector('[data-role="pool-grp-ai"]');
    dom.poolRackTrayPlayer = modalRoot.querySelector('[data-role="pool-tray-p"]');
    dom.poolRackTrayAi = modalRoot.querySelector('[data-role="pool-tray-ai"]');
    dom.poolStatusMsg = modalRoot.querySelector('[data-role="pool-status"]');
    dom.poolPowerFill = modalRoot.querySelector('[data-role="pool-power"]');

    dom.dartsCanvas = modalRoot.querySelector('#nl-darts-canvas');
    dom.dartsModeSelect = modalRoot.querySelector('[data-role="darts-mode"]');
    dom.dartsOpponentSelect = modalRoot.querySelector('[data-role="darts-opponent"]');
    dom.dartsWagerInput = modalRoot.querySelector('[data-role="darts-wager"]');
    dom.btnDartsStart = modalRoot.querySelector('[data-role="darts-start"]');
    dom.dartsPlayerScore = modalRoot.querySelector('[data-role="darts-score-p"]');
    dom.dartsAiScore = modalRoot.querySelector('[data-role="darts-score-ai"]');
    dom.dartsTurnInfo = modalRoot.querySelector('[data-role="darts-turn-info"]');
    dom.dartsCricketGrid = modalRoot.querySelector('[data-role="darts-cricket-box"]');
    dom.dartsDrunkWarn = modalRoot.querySelector('[data-role="darts-drunk-warn"]');

    dom.vipDeedStatus = modalRoot.querySelector('[data-role="vip-deed-status"]');
    dom.btnBuyClub = modalRoot.querySelector('[data-role="btn-buy-club"]');
    dom.vipSafeAmount = modalRoot.querySelector('[data-role="vip-safe-amt"]');
    dom.vipSafeTimer = modalRoot.querySelector('[data-role="vip-safe-timer"]');
    dom.vipPopFill = modalRoot.querySelector('[data-role="vip-pop-fill"]');
    dom.vipPopLabel = modalRoot.querySelector('[data-role="vip-pop-label"]');
    dom.btnCollectSafe = modalRoot.querySelector('[data-role="btn-collect-safe"]');
    dom.btnPromoteClub = modalRoot.querySelector('[data-role="btn-promote-club"]');
    dom.vipUpgradeList = modalRoot.querySelector('[data-role="vip-upgrades"]');
    dom.bouncerMissionList = modalRoot.querySelector('[data-role="bouncer-missions"]');
    dom.vipStatsSummary = modalRoot.querySelector('[data-role="vip-stats-summary"]');

    // Stop pointer events inside modal from leaking into 3D canvas weapon fire
    modalRoot.addEventListener('mousedown', (ev) => ev.stopPropagation());
    modalRoot.addEventListener('mouseup', (ev) => ev.stopPropagation());
    modalRoot.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (ev.target === modalRoot) {
        closeBarStation();
      }
    });

    return true;
  }

  // ============================================================================
  // PROCEDURAL MULTI-TRACK CLUB Nhạc Hội / HOUSE / TECHNO WEB AUDIO SYNTH & BAR SFX
  // ============================================================================
  const DJ_TRACKS = [
    {
      id: 'deep_house',
      index: 0,
      title: 'Solomun After Hours Deep House',
      shortLabel: 'Deep House 124 BPM',
      bpm: 124,
      keyName: 'F Minor',
      colorHex: '#06b6d4',
      accentHex: '#ec4899',
      // Fm9 - Dbmaj7 - Abmaj7 - Eb6
      bassRoots: [43.65, 34.65, 51.91, 38.89],
      chordVoicings: [
        [174.61, 207.65, 261.63, 311.13, 392.0],
        [138.59, 174.61, 207.65, 261.63, 311.13],
        [207.65, 261.63, 311.13, 392.0, 466.16],
        [155.56, 196.0, 233.08, 261.63, 349.23]
      ],
      arpScale: [349.23, 415.3, 466.16, 523.25, 622.25, 523.25, 466.16, 415.3],
      bassPattern: [0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1],
      chordSteps: [0, 6, 10, 14]
    },
    {
      id: 'cyber_edm',
      index: 1,
      title: 'Neon Bồng Lai Cyber Electro',
      shortLabel: 'Cyber Nhạc Hội 128 BPM',
      bpm: 128,
      keyName: 'A Minor',
      colorHex: '#ec4899',
      accentHex: '#fde047',
      // Am - F - C - G
      bassRoots: [55.0, 43.65, 65.41, 49.0],
      chordVoicings: [
        [220.0, 261.63, 329.63, 440.0],
        [174.61, 220.0, 261.63, 349.23],
        [261.63, 329.63, 392.0, 523.25],
        [196.0, 246.94, 293.66, 392.0]
      ],
      arpScale: [440.0, 523.25, 659.25, 880.0, 783.99, 659.25, 587.33, 523.25],
      bassPattern: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 2, 1, 2],
      chordSteps: [0, 3, 6, 10, 12]
    },
    {
      id: 'acid_techno',
      index: 2,
      title: 'Berlin Underground Acid Techno',
      shortLabel: 'Acid Techno 134 BPM',
      bpm: 134,
      keyName: 'D Phrygian',
      colorHex: '#a855f7',
      accentHex: '#22c55e',
      // D - D - Eb - C
      bassRoots: [36.71, 36.71, 38.89, 32.7],
      chordVoicings: [
        [146.83, 174.61, 220.0, 293.66],
        [146.83, 155.56, 220.0, 293.66],
        [155.56, 196.0, 233.08, 311.13],
        [130.81, 164.81, 196.0, 261.63]
      ],
      acidNotes: [
        73.42, 73.42, 146.83, 73.42, 77.78, 146.83, 110.0, 73.42,
        73.42, 174.61, 146.83, 77.78, 130.81, 110.0, 73.42, 146.83
      ],
      acidAccents: [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1],
      arpScale: [293.66, 311.13, 440.0, 293.66, 349.23, 311.13, 261.63, 293.66],
      bassPattern: [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
      chordSteps: [0, 8]
    }
  ];

  function createClubAudioSynth() {
    let fallbackCtx = null;
    let clubBus = null;
    let clubFilter = null;
    let sfxBus = null;
    let noiseBuffer = null;
    let boundCtx = null;

    let nextStepAudioTime = 0;
    let currentStep64 = 0;
    let virtualClockSec = 0;
    let kickPulse = 0;
    let bassEnergy = 0;
    let highEnergy = 0;
    let lastPresenceGain = 0;

    function resolveAudioContext(gCtx = ctx) {
      const shared = gCtx?.audio?.ctx || ctx?.audio?.ctx || null;
      if (shared) return shared;
      if (fallbackCtx) return fallbackCtx;
      if (typeof window !== 'undefined') {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          try {
            fallbackCtx = new AC();
          } catch (_) {
            fallbackCtx = null;
          }
        }
      }
      return fallbackCtx;
    }

    function ensureAudioGraph(gCtx = ctx) {
      const ac = resolveAudioContext(gCtx);
      if (!ac) return null;
      if (boundCtx === ac && clubBus && clubFilter && sfxBus) {
        return ac;
      }
      try {
        boundCtx = ac;
        clubFilter = ac.createBiquadFilter();
        clubFilter.type = 'lowpass';
        clubFilter.frequency.value = 16000;
        clubFilter.Q.value = 1.15;

        clubBus = ac.createGain();
        clubBus.gain.value = 0.0001;

        sfxBus = ac.createGain();
        sfxBus.gain.value = 0.52;

        clubBus.connect(clubFilter);
        clubFilter.connect(ac.destination);
        sfxBus.connect(ac.destination);

        // Pre-bake 1.2s stereo/mono white-noise buffer for hi-hats, claps, shakers, risers & fizz
        const len = Math.floor(ac.sampleRate * 1.2);
        noiseBuffer = ac.createBuffer(1, len, ac.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) {
          data[i] = Math.random() * 2 - 1;
        }
      } catch (_) {
        return null;
      }
      return ac;
    }

    function canEmitAudio(gCtx = ctx) {
      const ac = ensureAudioGraph(gCtx);
      if (!ac || ac.state !== 'running') return null;
      return ac;
    }

    function unlockIfPossible(gCtx = ctx) {
      gCtx?.audio?.unlock?.();
      const ac = ensureAudioGraph(gCtx);
      if (ac && ac.state === 'suspended') {
        ac.resume().catch(() => {});
      }
    }

    // --- Core Synthesis Voices for Túy Tiên Lâu Nhạc Hội / Deep House / Acid Techno ---
    function scheduleKick909(ac, t0, punch = 1.0) {
      try {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(156 * punch, t0);
        osc.frequency.exponentialRampToValueAtTime(52, t0 + 0.048);
        osc.frequency.exponentialRampToValueAtTime(36, t0 + 0.23);

        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.linearRampToValueAtTime(0.62 * punch, t0 + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);

        osc.connect(gain);
        gain.connect(clubBus);
        osc.start(t0);
        osc.stop(t0 + 0.26);

        // Beater click transient
        const clickOsc = ac.createOscillator();
        const clickGain = ac.createGain();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(920, t0);
        clickOsc.frequency.exponentialRampToValueAtTime(120, t0 + 0.016);
        clickGain.gain.setValueAtTime(0.18, t0);
        clickGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.018);
        clickOsc.connect(clickGain);
        clickGain.connect(clubBus);
        clickOsc.start(t0);
        clickOsc.stop(t0 + 0.02);
      } catch (_) {}
    }

    function scheduleSidechainBass(ac, t0, freq, stepDur, mode = 1) {
      try {
        const osc1 = ac.createOscillator();
        const osc2 = ac.createOscillator();
        const flt = ac.createBiquadFilter();
        const gain = ac.createGain();

        osc1.type = 'sawtooth';
        osc2.type = mode === 2 ? 'square' : 'sawtooth';
        const f = Math.max(28, freq);
        osc1.frequency.setValueAtTime(f, t0);
        osc2.frequency.setValueAtTime(f * (mode === 2 ? 2.0 : 1.006), t0);

        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(mode === 2 ? 780 : 420, t0);
        flt.frequency.exponentialRampToValueAtTime(145, t0 + stepDur * 0.92);
        flt.Q.value = 3.2;

        const dur = stepDur * 0.92;
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(0.28, t0 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.002, t0 + dur);

        osc1.connect(flt);
        osc2.connect(flt);
        flt.connect(gain);
        gain.connect(clubBus);

        osc1.start(t0);
        osc2.start(t0);
        osc1.stop(t0 + dur + 0.01);
        osc2.stop(t0 + dur + 0.01);
      } catch (_) {}
    }

    function scheduleAcid303Voice(ac, t0, freq, stepDur, accent = false) {
      try {
        const osc = ac.createOscillator();
        const flt = ac.createBiquadFilter();
        const gain = ac.createGain();

        osc.type = accent ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(freq * 0.98, t0);
        osc.frequency.exponentialRampToValueAtTime(freq, t0 + 0.025);

        flt.type = 'lowpass';
        flt.Q.value = accent ? 12.5 : 8.2;
        const peakCutoff = accent ? 2950 : 1350;
        flt.frequency.setValueAtTime(peakCutoff, t0);
        flt.frequency.exponentialRampToValueAtTime(190, t0 + stepDur * 0.88);

        const dur = stepDur * 0.9;
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(accent ? 0.24 : 0.16, t0 + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.002, t0 + dur);

        osc.connect(flt);
        flt.connect(gain);
        gain.connect(clubBus);
        osc.start(t0);
        osc.stop(t0 + dur + 0.01);
      } catch (_) {}
    }

    function scheduleHouseChordStab(ac, t0, freqs, dur = 0.26, brightness = 1900) {
      if (!Array.isArray(freqs) || freqs.length === 0) return;
      try {
        const flt = ac.createBiquadFilter();
        const gain = ac.createGain();
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(brightness, t0);
        flt.frequency.exponentialRampToValueAtTime(480, t0 + dur);
        flt.Q.value = 1.8;

        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(0.11, t0 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0015, t0 + dur);

        flt.connect(gain);
        gain.connect(clubBus);

        for (let i = 0; i < freqs.length; i++) {
          const osc = ac.createOscillator();
          osc.type = i % 2 === 0 ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(freqs[i] * (1 + (i - 1.5) * 0.0022), t0);
          osc.connect(flt);
          osc.start(t0);
          osc.stop(t0 + dur + 0.015);
        }
      } catch (_) {}
    }

    function scheduleSynthLeadNote(ac, t0, freq, dur = 0.14, wave = 'sawtooth', vol = 0.095) {
      try {
        const oscA = ac.createOscillator();
        const oscB = ac.createOscillator();
        const flt = ac.createBiquadFilter();
        const gain = ac.createGain();

        oscA.type = wave;
        oscB.type = wave;
        oscA.frequency.setValueAtTime(freq * 0.996, t0);
        oscB.frequency.setValueAtTime(freq * 1.004, t0);

        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(3400, t0);
        flt.frequency.exponentialRampToValueAtTime(900, t0 + dur);
        flt.Q.value = 2.1;

        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

        oscA.connect(flt);
        oscB.connect(flt);
        flt.connect(gain);
        gain.connect(clubBus);

        oscA.start(t0);
        oscB.start(t0);
        oscA.stop(t0 + dur + 0.01);
        oscB.stop(t0 + dur + 0.01);
      } catch (_) {}
    }

    function schedulePercNoise(ac, t0, dur, filterType, freq, q, vol, targetBus = clubBus) {
      if (!noiseBuffer || !targetBus) return;
      try {
        const src = ac.createBufferSource();
        src.buffer = noiseBuffer;
        const flt = ac.createBiquadFilter();
        flt.type = filterType;
        flt.frequency.setValueAtTime(freq, t0);
        flt.Q.value = q;

        const gain = ac.createGain();
        gain.gain.setValueAtTime(Math.max(0.0005, vol), t0);
        gain.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);

        src.connect(flt);
        flt.connect(gain);
        gain.connect(targetBus);
        src.start(t0, Math.random() * 0.35, dur + 0.015);
      } catch (_) {}
    }

    function scheduleDJStep(ac, track, step64, t0, stepDur) {
      const s16 = step64 & 15;
      const bar = (step64 >> 4) & 3;
      const isBuildBar = bar === 3 && s16 >= 8;

      // 1) Four-on-the-floor Kick (steps 0, 4, 8, 12) + build-up snare roll on bar 4
      if (s16 % 4 === 0) {
        scheduleKick909(ac, t0, track.id === 'acid_techno' ? 1.12 : 1.0);
        kickPulse = 1.0;
        bassEnergy = 1.0;
      } else if (isBuildBar && s16 % 2 === 1) {
        schedulePercNoise(ac, t0, 0.075, 'bandpass', 1850 + (s16 - 8) * 220, 1.8, 0.14);
      }

      // 2) Crisp Clap / Snare on beats 2 & 4 (steps 4 & 12)
      if (s16 === 4 || s16 === 12) {
        schedulePercNoise(ac, t0, 0.115, 'bandpass', 1950, 1.35, 0.18);
        schedulePercNoise(ac, t0 + 0.011, 0.085, 'highpass', 2800, 1.1, 0.11);
      }

      // 3) Off-beat 909 Open Hi-Hat (steps 2, 6, 10, 14) + Closed 16th Shaker
      if (s16 % 4 === 2) {
        schedulePercNoise(ac, t0, 0.13, 'highpass', 6800, 1.2, 0.115);
        highEnergy = 0.95;
      } else {
        schedulePercNoise(ac, t0, 0.032, 'highpass', 8800, 1.5, s16 % 2 === 1 ? 0.048 : 0.028);
      }

      // 4) Track-Specific Bassline, Chords & Melodic Hook
      const rootFreq = track.bassRoots[bar];
      const bassCode = track.bassPattern[s16];
      if (bassCode > 0) {
        scheduleSidechainBass(ac, t0, rootFreq, stepDur, bassCode);
        bassEnergy = Math.max(bassEnergy, 0.78);
      }

      if (track.chordSteps.includes(s16)) {
        const chord = track.chordVoicings[bar];
        const bright = track.id === 'cyber_edm' ? 2800 : track.id === 'deep_house' ? 1750 : 1400;
        scheduleHouseChordStab(ac, t0, chord, stepDur * 2.1, bright);
      }

      if (track.id === 'acid_techno' && track.acidNotes) {
        const acidFreq = track.acidNotes[s16] * (bar === 2 ? 1.05946 : bar === 3 ? 0.8909 : 1.0);
        const accented = Boolean(track.acidAccents[s16]);
        scheduleAcid303Voice(ac, t0, acidFreq, stepDur, accented);
      } else {
        // Arpeggiated Cyber / Deep House Top Lead
        const playLead =
          track.id === 'cyber_edm'
            ? s16 % 2 === 0 || s16 === 7 || s16 === 15
            : bar >= 1 && (s16 === 2 || s16 === 5 || s16 === 9 || s16 === 11 || s16 === 14);
        if (playLead) {
          const baseArp = track.arpScale[s16 & 7];
          const transpose = bar === 1 ? 0.8909 : bar === 2 ? 1.12246 : bar === 3 ? 0.94387 : 1.0;
          scheduleSynthLeadNote(
            ac,
            t0,
            baseArp * transpose,
            stepDur * 1.15,
            track.id === 'cyber_edm' ? 'sawtooth' : 'triangle',
            track.id === 'cyber_edm' ? 0.092 : 0.068
          );
        }
      }

      // Bar 1 Downbeat Crash Shimmer
      if (bar === 0 && s16 === 0) {
        schedulePercNoise(ac, t0, 0.55, 'highpass', 5200, 0.8, 0.12);
      }
    }

    // --- One-Shot SFX Helpers on sfxBus ---
    function playQuickTone(type, fStart, fEnd, dur, vol = 0.18, delay = 0) {
      const ac = canEmitAudio();
      if (!ac || !sfxBus) return;
      try {
        const t0 = ac.currentTime + delay;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(20, fStart), t0);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, fEnd), t0 + dur);
        gain.gain.setValueAtTime(0.0008, t0);
        gain.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.012, dur * 0.25));
        gain.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
        osc.connect(gain);
        gain.connect(sfxBus);
        osc.start(t0);
        osc.stop(t0 + dur + 0.015);
      } catch (_) {}
    }

    function update(rawDt, gCtx = ctx) {
      const dt = clamp(Number(rawDt) || 0.016, 0.0005, 0.1);
      virtualClockSec += dt;

      const track = DJ_TRACKS[state.djTrackIndex] || DJ_TRACKS[0];
      const beatDur = 60 / track.bpm;
      const stepDur = beatDur * 0.25;

      // Deterministic visual beat envelope fallback so visuals pulse even when muted
      const beatFrac = ((virtualClockSec / beatDur) % 1 + 1) % 1;
      const fallbackKick = Math.pow(Math.max(0, 1 - beatFrac * 2.6), 2.2);
      kickPulse = Math.max(fallbackKick, kickPulse * Math.exp(-9.5 * dt));
      bassEnergy = Math.max(fallbackKick * 0.85, bassEnergy * Math.exp(-6.0 * dt));
      highEnergy = Math.max(
        beatFrac >= 0.45 && beatFrac <= 0.72 ? 0.75 : 0.18,
        highEnergy * Math.exp(-8.0 * dt)
      );

      const p = gCtx?.player;
      const insideClub = isPlayerInsideNightclub(gCtx) || state.isOpen;
      const extDist = p
        ? Math.hypot((p.x || 0) - CLUB_EXTERIOR_X, (p.z || 0) - CLUB_EXTERIOR_Z)
        : 999;
      const nearExterior = !insideClub && extDist < 48.0 && !p?.inSafehouse;

      const ac = ensureAudioGraph(gCtx);
      if (!ac || ac.state !== 'running' || gCtx?.paused) {
        return;
      }

      const now = ac.currentTime;
      if (insideClub || nearExterior) {
        const targetGain = insideClub
          ? state.activeStation === 'dancefloor'
            ? 0.36
            : 0.25
          : clamp(1 - extDist / 48.0, 0.02, 1.0) * 0.22;

        const targetCutoff = insideClub
          ? lerp(950, 17500, clamp(state.djFilterCutoffNorm, 0.08, 1.0))
          : lerp(95, 220, clamp(1 - extDist / 48.0, 0, 1));

        clubBus.gain.setTargetAtTime(targetGain, now, 0.08);
        clubFilter.frequency.setTargetAtTime(targetCutoff, now, 0.09);
        clubFilter.Q.setTargetAtTime(insideClub ? 1.25 : 3.1, now, 0.08);
        lastPresenceGain = targetGain;

        if (nextStepAudioTime < now - 0.12 || nextStepAudioTime > now + 1.0) {
          nextStepAudioTime = now + 0.025;
        }
        let guard = 0;
        while (nextStepAudioTime < now + 0.12 && guard++ < 5) {
          scheduleDJStep(ac, track, currentStep64, nextStepAudioTime, stepDur);
          currentStep64 = (currentStep64 + 1) & 63;
          nextStepAudioTime += stepDur;
        }
      } else if (lastPresenceGain > 0.001) {
        clubBus.gain.setTargetAtTime(0.0001, now, 0.12);
        lastPresenceGain = 0;
      }
    }

    function getBeatState() {
      const track = DJ_TRACKS[state.djTrackIndex] || DJ_TRACKS[0];
      const beatDur = 60 / track.bpm;
      const exactBeats = virtualClockSec / beatDur;
      const beatPhase = ((exactBeats % 1) + 1) % 1;
      return {
        track,
        bpm: track.bpm,
        beatDur,
        exactBeats,
        beatPhase,
        kickPulse,
        bassEnergy,
        highEnergy,
        step16: Math.floor(exactBeats * 4) & 15,
        barIndex: Math.floor(exactBeats / 4)
      };
    }

    return {
      tracks: DJ_TRACKS,
      unlock: unlockIfPossible,
      update,
      getBeatState,

      playShakeAndPour() {
        unlockIfPossible();
        const ac = canEmitAudio();
        if (!ac) return;
        // Tiên Tửu ice shaker rattle + liquid glug pour + glass clink
        for (let i = 0; i < 5; i++) {
          schedulePercNoise(ac, ac.currentTime + i * 0.085, 0.048, 'bandpass', 3600 + i * 240, 2.8, 0.16, sfxBus);
        }
        for (let g = 0; g < 6; g++) {
          playQuickTone('sine', 340 + g * 58, 510 + g * 62, 0.075, 0.14, 0.44 + g * 0.09);
        }
        playQuickTone('sine', 2480, 2420, 0.16, 0.12, 1.02);
        playQuickTone('sine', 3720, 3660, 0.12, 0.08, 1.03);
      },

      playDrinkGulp(isStrong = false) {
        unlockIfPossible();
        playQuickTone('sine', 260, 145, 0.11, 0.2, 0.0);
        playQuickTone('sine', 240, 135, 0.11, 0.2, 0.16);
        if (isStrong) {
          playQuickTone('sawtooth', 180, 420, 0.28, 0.15, 0.32);
        } else {
          playQuickTone('triangle', 440, 660, 0.22, 0.14, 0.32);
        }
      },

      playChampagnePopAndSparkler() {
        unlockIfPossible();
        const ac = canEmitAudio();
        // Cork POP!
        playQuickTone('sine', 520, 95, 0.09, 0.42, 0);
        if (ac) {
          schedulePercNoise(ac, ac.currentTime + 0.04, 0.65, 'highpass', 4500, 1.1, 0.28, sfxBus);
          for (let s = 0; s < 10; s++) {
            schedulePercNoise(ac, ac.currentTime + 0.25 + s * 0.18, 0.15, 'bandpass', 6200 + (s % 3) * 900, 2.5, 0.14, sfxBus);
          }
        }
        // Royal fanfare triad
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((f, idx) => playQuickTone('triangle', f, f * 1.002, 0.36, 0.18, 0.12 + idx * 0.09));
      },

      playBlackoutSpiral() {
        unlockIfPossible();
        playQuickTone('sawtooth', 360, 42, 1.85, 0.28, 0);
        playQuickTone('sine', 540, 58, 2.1, 0.24, 0.08);
        playQuickTone('triangle', 120, 32, 2.4, 0.32, 0.2);
      },

      playHiccup() {
        unlockIfPossible();
        playQuickTone('sine', 290, 640, 0.075, 0.16, 0);
        playQuickTone('triangle', 580, 410, 0.05, 0.1, 0.07);
      },

      playCueStrike(powerNorm = 0.6) {
        unlockIfPossible();
        const p = clamp(powerNorm, 0.12, 1.0);
        const ac = canEmitAudio();
        playQuickTone('triangle', 320 + p * 180, 95, 0.055, 0.32 * p, 0);
        if (ac) {
          schedulePercNoise(ac, ac.currentTime, 0.028, 'bandpass', 2200, 3.0, 0.22 * p, sfxBus);
        }
      },

      playBallClack(speedNorm = 0.5) {
        const v = clamp(speedNorm, 0.06, 1.0);
        const f1 = 1920 + Math.random() * 240;
        playQuickTone('sine', f1, f1 * 0.92, 0.042, 0.28 * v, 0);
        playQuickTone('triangle', f1 * 1.56, f1 * 1.48, 0.028, 0.16 * v, 0.002);
      },

      playRailCushion(speedNorm = 0.4) {
        const v = clamp(speedNorm, 0.08, 1.0);
        playQuickTone('sine', 165, 68, 0.065, 0.22 * v, 0);
      },

      playPocketDrop() {
        unlockIfPossible();
        playQuickTone('sine', 240, 82, 0.14, 0.26, 0);
        playQuickTone('triangle', 760, 540, 0.08, 0.14, 0.09);
      },

      playDartThrow() {
        unlockIfPossible();
        const ac = canEmitAudio();
        if (ac) {
          schedulePercNoise(ac, ac.currentTime, 0.09, 'bandpass', 2600, 1.9, 0.16, sfxBus);
        }
        playQuickTone('sine', 420, 790, 0.08, 0.09, 0);
      },

      playDartThwack(multiplier = 1, isBull = false) {
        unlockIfPossible();
        playQuickTone('triangle', 210, 68, 0.075, 0.28, 0);
        if (isBull || multiplier === 3) {
          playQuickTone('sine', 880, 1318.5, 0.16, 0.2, 0.05);
          playQuickTone('triangle', 1318.5, 1760, 0.22, 0.2, 0.14);
        } else if (multiplier === 2) {
          playQuickTone('sine', 659.25, 987.77, 0.15, 0.16, 0.05);
        }
      },

      playDanceHit(tier = 'perfect') {
        unlockIfPossible();
        if (tier === 'perfect') {
          playQuickTone('sine', 1046.5, 1567.98, 0.11, 0.16, 0);
          playQuickTone('triangle', 1567.98, 2093.0, 0.13, 0.12, 0.04);
        } else if (tier === 'great') {
          playQuickTone('sine', 783.99, 1174.66, 0.1, 0.14, 0);
        } else {
          playQuickTone('triangle', 523.25, 659.25, 0.08, 0.11, 0);
        }
      },

      playDanceMiss() {
        unlockIfPossible();
        playQuickTone('sawtooth', 185, 92, 0.15, 0.18, 0);
      },

      playArcadeWinFanfare() {
        unlockIfPossible();
        const seq = [523.25, 659.25, 783.99, 1046.5, 1318.5];
        seq.forEach((f, i) => playQuickTone('triangle', f, f * 1.005, 0.24, 0.2, i * 0.08));
      },

      playArcadeLoseBuzzer() {
        unlockIfPossible();
        playQuickTone('sawtooth', 220, 146.83, 0.25, 0.2, 0);
        playQuickTone('sawtooth', 164.81, 98.0, 0.36, 0.22, 0.22);
      }
    };
  }

  const clubAudio = createClubAudioSynth();

  // ============================================================================
  // 3D NIGHTCLUB STAGE FX, BOTTLE-GIRL SPARKLER PARADE, CROWD & 6 DANCE MOVES
  // ============================================================================
  const DANCE_MOVES = [
    { id: 'hiphop_bounce', index: 0, label: '1. Hip-Hop Bounce', icon: '🧢' },
    { id: 'cyber_robot', index: 1, label: '2. Cyber Robot', icon: '🤖' },
    { id: 'spin_flair', index: 2, label: '3. Xoay 360° Flair', icon: '🌪️' },
    { id: 'edm_fistpump', index: 3, label: '4. Nhạc Hội Fist-Pump', icon: '🙌' },
    { id: 'shuffle_glide', index: 4, label: '5. Neon Shuffle', icon: '⚡' },
    { id: 'euphoria_wave', index: 5, label: '6. Sóng Vũ Trường', icon: '🌊' }
  ];

  function createClub3DStage() {
    const clubStageRoot = new THREE.Group();
    clubStageRoot.name = 'NightlifeClubStageRoot';
    clubStageRoot.visible = false;

    let stageBuilt = false;
    let vipSafeDoorPivot = null;
    let vipCashStackGroup = null;
    let vipCoronaMesh = null;
    let bouncerCoronaMesh = null;
    let bouncerChiefRig = null;
    const extraLaserCones = [];
    const crowdDancers = [];
    const bottleGirls = [];

    // Instanced Sparkler & Confetti Particle Pool (2 draw calls total)
    const MAX_SPARKS = 140;
    const sparkData = [];
    let sparkInst = null;
    let sparkCursor = 0;

    const MAX_CONFETTI = 120;
    const confettiData = [];
    let confettiInst = null;
    let confettiCursor = 0;

    const _dummy = new THREE.Object3D();
    const _colorTmp = new THREE.Color();

    let playerDancingActive = false;
    let activeDanceMoveIdx = 0;
    let danceSpinAccum = 0;
    let savedPreDancePos = null;

    function buildFallbackClubRig(accentHex = 0xec4899, suitHex = 0x111827) {
      const root = new THREE.Group();
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ac82, roughness: 0.65 });
      const topMat = new THREE.MeshStandardMaterial({
        color: accentHex,
        roughness: 0.35,
        metalness: 0.25,
        emissive: accentHex,
        emissiveIntensity: 0.22
      });
      const pantsMat = new THREE.MeshStandardMaterial({ color: suitHex, roughness: 0.55 });

      const pelvis = new THREE.Group();
      pelvis.position.set(0, 0.92, 0);
      root.add(pelvis);

      const spine = new THREE.Group();
      spine.position.set(0, 0.08, 0);
      pelvis.add(spine);

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 0.22), topMat);
      torso.position.y = 0.24;
      spine.add(torso);

      const neck = new THREE.Group();
      neck.position.set(0, 0.52, 0);
      spine.add(neck);

      const head = new THREE.Group();
      neck.add(head);
      const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), skinMat);
      headMesh.position.y = 0.1;
      head.add(headMesh);

      const makeArm = (sign) => {
        const shoulder = new THREE.Group();
        shoulder.position.set(sign * 0.22, 0.44, 0);
        spine.add(shoulder);
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.27, 8), skinMat);
        upper.position.y = -0.135;
        shoulder.add(upper);
        const elbow = new THREE.Group();
        elbow.position.set(0, -0.27, 0);
        shoulder.add(elbow);
        const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.25, 8), skinMat);
        fore.position.y = -0.125;
        elbow.add(fore);
        const hand = new THREE.Group();
        hand.position.set(0, -0.25, 0);
        elbow.add(hand);
        return { shoulder, elbow, hand };
      };

      const makeLeg = (sign) => {
        const hip = new THREE.Group();
        hip.position.set(sign * 0.1, 0, 0);
        pelvis.add(hip);
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.056, 0.44, 8), pantsMat);
        thigh.position.y = -0.22;
        hip.add(thigh);
        const knee = new THREE.Group();
        knee.position.set(0, -0.44, 0);
        hip.add(knee);
        const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.44, 8), pantsMat);
        calf.position.y = -0.22;
        knee.add(calf);
        return { hip, knee };
      };

      const armL = makeArm(1);
      const armR = makeArm(-1);
      const legL = makeLeg(1);
      const legR = makeLeg(-1);

      root.joints = {
        root,
        pelvis,
        spine,
        neck,
        head,
        shoulderL: armL.shoulder,
        elbowL: armL.elbow,
        handL: armL.hand,
        shoulderR: armR.shoulder,
        elbowR: armR.elbow,
        handR: armR.hand,
        hipL: legL.hip,
        kneeL: legL.knee,
        hipR: legR.hip,
        kneeR: legR.knee
      };
      return root;
    }

    function spawnHumanoidOrFallback(gCtx, presetName, accentHex, suitHex) {
      if (gCtx?.characters && typeof gCtx.characters.createHumanoid === 'function') {
        try {
          const h = gCtx.characters.createHumanoid(presetName);
          if (h && (h.joints || h.root)) {
            return h.root || h;
          }
        } catch (_) {}
      }
      return buildFallbackClubRig(accentHex, suitHex);
    }

    function ensureBuilt(gCtx = ctx) {
      const scene = gCtx?.engine?.scene || gCtx?.scene;
      if (!scene) return false;
      if (!clubStageRoot.parent) {
        scene.add(clubStageRoot);
      }
      if (stageBuilt) return true;
      stageBuilt = true;

      // 1. VIP Management Desk & Wall Safe at (1486.8, 0, 1489.2)
      const vipGroup = new THREE.Group();
      vipGroup.position.set(STATION_COORDS.vip_desk.x, 0, STATION_COORDS.vip_desk.z);
      vipGroup.rotation.y = Math.PI * 0.25;
      clubStageRoot.add(vipGroup);

      const marbleMat = new THREE.MeshStandardMaterial({ color: 0x11131f, roughness: 0.22, metalness: 0.5 });
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.24,
        metalness: 0.88,
        emissive: 0x78350f,
        emissiveIntensity: 0.35
      });
      const safeSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.82 });
      const cashMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        roughness: 0.55,
        emissive: 0x14532d,
        emissiveIntensity: 0.4
      });

      const deskBase = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.92, 0.85), marbleMat);
      deskBase.position.y = 0.46;
      const deskTrim = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.08, 0.9), goldMat);
      deskTrim.position.y = 0.92;
      vipGroup.add(deskBase, deskTrim);

      // Executive Steel Safe Cabinet behind VIP desk
      const safeBox = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.15, 0.68), safeSteelMat);
      safeBox.position.set(0, 0.58, -0.95);
      vipGroup.add(safeBox);

      vipCashStackGroup = new THREE.Group();
      vipCashStackGroup.position.set(0, 0.45, -0.72);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const bill = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.12), cashMat);
          bill.position.set((c - 1) * 0.2, r * 0.1, 0);
          vipCashStackGroup.add(bill);
        }
      }
      vipGroup.add(vipCashStackGroup);

      vipSafeDoorPivot = new THREE.Group();
      vipSafeDoorPivot.position.set(-0.44, 0.58, -0.6);
      const safeDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.04, 0.07), safeSteelMat);
      safeDoorMesh.position.x = 0.43;
      const safeWheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 18), goldMat);
      safeWheel.position.set(0.55, 0, 0.05);
      vipSafeDoorPivot.add(safeDoorMesh, safeWheel);
      vipGroup.add(vipSafeDoorPivot);

      vipCoronaMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1.05, 1.05, 1.9, 24, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
          transparent: true,
          opacity: 0.34,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      vipCoronaMesh.position.set(0, 0.95, 0.95);
      vipGroup.add(vipCoronaMesh);

      // 2. Bouncer Security Station at (1494.6, 0, 1511.2)
      const bouncerGroup = new THREE.Group();
      bouncerGroup.position.set(STATION_COORDS.bouncer.x, 0, STATION_COORDS.bouncer.z);
      clubStageRoot.add(bouncerGroup);

      bouncerChiefRig = spawnHumanoidOrFallback(gCtx, 'luxury_suit', 0x1e293b, 0x0f172a);
      bouncerChiefRig.position.set(0, 0.02, 0);
      bouncerChiefRig.rotation.y = 0.45;
      bouncerGroup.add(bouncerChiefRig);

      bouncerCoronaMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 0.95, 1.8, 22, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xf43f5e,
          transparent: true,
          opacity: 0.32,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      bouncerCoronaMesh.position.set(0.9, 0.9, 0.5);
      bouncerGroup.add(bouncerCoronaMesh);

      // 3. Extra Funktion-One Ceiling 4K Laser Cones around Dancefloor (1500, 7.6, 1498)
      const laserColors = [0x06b6d4, 0xec4899, 0xa855f7, 0x22c55e, 0xfbbf24, 0x38bdf8];
      const coneGeo = new THREE.ConeGeometry(2.6, 8.8, 18, 1, true);
      coneGeo.translate(0, -4.4, 0);
      for (let i = 0; i < 6; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: laserColors[i % laserColors.length],
          transparent: true,
          opacity: 0.16,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
        const cone = new THREE.Mesh(coneGeo, mat);
        const ang = (i / 6) * Math.PI * 2;
        cone.position.set(CLUB_CENTER_X + Math.cos(ang) * 5.6, 7.75, 1498.0 + Math.sin(ang) * 5.6);
        clubStageRoot.add(cone);
        extraLaserCones.push({ mesh: cone, baseAngle: ang, phase: i * 1.05 });
      }

      // 4. Cheering Dancefloor Crowd Circle (8 Clubgoers around Dancefloor)
      const crowdPalettes = [
        [0xec4899, 0x1e1b4b],
        [0x06b6d4, 0x0f172a],
        [0xfbbf24, 0x1f2937],
        [0xa855f7, 0x111827],
        [0x22c55e, 0x1e293b],
        [0xf43f5e, 0x0f172a],
        [0x38bdf8, 0x1e1b4b],
        [0xe879f9, 0x111827]
      ];
      const presets = ['casual_polo', 'luxury_suit', 'casual_polo', 'luxury_suit'];
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + 0.2;
        const radius = 3.85 + (i % 2) * 0.55;
        const [topHex, botHex] = crowdPalettes[i];
        const rig = spawnHumanoidOrFallback(gCtx, presets[i % presets.length], topHex, botHex);
        const gx = CLUB_CENTER_X + Math.cos(ang) * radius;
        const gz = 1498.0 + Math.sin(ang) * radius;
        rig.position.set(gx, 0.03, gz);
        rig.rotation.y = Math.atan2(CLUB_CENTER_X - gx, 1498.0 - gz);
        clubStageRoot.add(rig);
        crowdDancers.push({
          rig,
          baseX: gx,
          baseZ: gz,
          angle: ang,
          phase: i * 0.78,
          moveStyle: i % 6
        });
      }

      // 5. Three VIP Bottle-Girl Sparkler Parade Performers
      const magnumGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.34, 10);
      const sparkWandGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.32, 6);
      const sparkTipMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      for (let b = 0; b < 3; b++) {
        const rig = buildFallbackClubRig(0xfbbf24, 0x78350f);
        rig.visible = false;
        const bottle = new THREE.Mesh(magnumGeo, goldMat);
        bottle.position.set(0, -0.08, 0.08);
        bottle.rotation.x = Math.PI * 0.35;
        rig.joints.handL.add(bottle);

        const wand = new THREE.Mesh(sparkWandGeo, sparkTipMat);
        wand.position.set(0, -0.1, 0.1);
        wand.rotation.x = Math.PI * 0.42;
        rig.joints.handR.add(wand);

        clubStageRoot.add(rig);
        bottleGirls.push({ rig, wand, offsetIdx: b });
      }

      // 6. Pooled Instanced Sparkler Sparks & 24K Confetti
      sparkInst = new THREE.InstancedMesh(
        new THREE.OctahedronGeometry(0.048, 0),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        }),
        MAX_SPARKS
      );
      sparkInst.frustumCulled = false;

      confettiInst = new THREE.InstancedMesh(
        new THREE.PlaneGeometry(0.09, 0.055),
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
        MAX_CONFETTI
      );
      confettiInst.frustumCulled = false;

      _dummy.position.set(0, -999, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      for (let i = 0; i < MAX_SPARKS; i++) {
        sparkData.push({ active: false, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.5 });
        sparkInst.setMatrixAt(i, _dummy.matrix);
        sparkInst.setColorAt(i, _colorTmp.setHex(i % 2 === 0 ? 0xfef08a : 0xf97316));
      }
      const confColors = [0xfbbf24, 0xec4899, 0x06b6d4, 0xa855f7, 0x4ade80];
      for (let i = 0; i < MAX_CONFETTI; i++) {
        confettiData.push({ active: false, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, life: 0 });
        confettiInst.setMatrixAt(i, _dummy.matrix);
        confettiInst.setColorAt(i, _colorTmp.setHex(confColors[i % confColors.length]));
      }
      sparkInst.instanceMatrix.needsUpdate = true;
      confettiInst.instanceMatrix.needsUpdate = true;
      if (sparkInst.instanceColor) sparkInst.instanceColor.needsUpdate = true;
      if (confettiInst.instanceColor) confettiInst.instanceColor.needsUpdate = true;

      clubStageRoot.add(sparkInst, confettiInst);
      return true;
    }

    function emitSparklerBurst(wx, wy, wz, count = 4) {
      if (!sparkInst) return;
      for (let i = 0; i < count; i++) {
        const sp = sparkData[sparkCursor];
        sparkCursor = (sparkCursor + 1) % MAX_SPARKS;
        sp.active = true;
        sp.x = wx + (Math.random() - 0.5) * 0.08;
        sp.y = wy + (Math.random() - 0.5) * 0.08;
        sp.z = wz + (Math.random() - 0.5) * 0.08;
        const a = Math.random() * Math.PI * 2;
        const spd = 1.2 + Math.random() * 2.8;
        sp.vx = Math.cos(a) * spd;
        sp.vy = 2.0 + Math.random() * 3.4;
        sp.vz = Math.sin(a) * spd;
        sp.maxLife = 0.25 + Math.random() * 0.32;
        sp.life = sp.maxLife;
      }
    }

    function emitGoldenConfetti(centerX, centerY, centerZ, count = 30) {
      if (!confettiInst) return;
      for (let i = 0; i < count; i++) {
        const cf = confettiData[confettiCursor];
        confettiCursor = (confettiCursor + 1) % MAX_CONFETTI;
        cf.active = true;
        cf.x = centerX + (Math.random() - 0.5) * 6.5;
        cf.y = centerY + Math.random() * 2.2;
        cf.z = centerZ + (Math.random() - 0.5) * 6.5;
        cf.vx = (Math.random() - 0.5) * 2.2;
        cf.vy = -1.2 - Math.random() * 1.4;
        cf.vz = (Math.random() - 0.5) * 2.2;
        cf.rx = Math.random() * 6.28;
        cf.ry = Math.random() * 6.28;
        cf.life = 2.6 + Math.random() * 1.8;
      }
    }

    function applyDanceJoints(joints, moveIdx, exactBeats, energy = 1.0, dt = 0.016) {
      if (!joints) return;
      const w = exactBeats * Math.PI * 2;
      const halfW = exactBeats * Math.PI;
      const amp = clamp(energy, 0.35, 1.35);

      const pel = joints.pelvis;
      const spn = joints.spine;
      const hd = joints.head;
      const shL = joints.shoulderL;
      const shR = joints.shoulderR;
      const elL = joints.elbowL;
      const elR = joints.elbowR;
      const hpL = joints.hipL;
      const hpR = joints.hipR;
      const knL = joints.kneeL;
      const knR = joints.kneeR;

      if (moveIdx === 0) {
        // 1. Hip-Hop West Coast Bounce & Shoulder Pop
        if (pel) {
          pel.position.y = 0.91 - Math.abs(Math.sin(w * 0.5)) * 0.075 * amp;
          pel.rotation.y = Math.sin(halfW) * 0.22 * amp;
        }
        if (spn) {
          spn.rotation.z = Math.sin(halfW) * 0.14 * amp;
          spn.rotation.x = 0.08 + Math.abs(Math.cos(w * 0.5)) * 0.12 * amp;
        }
        if (hd) hd.rotation.x = Math.sin(w) * 0.18 * amp;
        if (shL) {
          shL.rotation.x = -0.65 + Math.sin(halfW) * 0.45 * amp;
          shL.rotation.z = 0.32 + Math.cos(halfW) * 0.18;
        }
        if (shR) {
          shR.rotation.x = -0.65 - Math.sin(halfW) * 0.45 * amp;
          shR.rotation.z = -0.32 - Math.cos(halfW) * 0.18;
        }
        if (elL) elL.rotation.x = -1.15;
        if (elR) elR.rotation.x = -1.15;
        if (hpL) hpL.rotation.x = -0.18 * Math.max(0, Math.sin(halfW));
        if (hpR) hpR.rotation.x = -0.18 * Math.max(0, -Math.sin(halfW));
        if (knL) knL.rotation.x = 0.35 * Math.max(0, Math.sin(halfW));
        if (knR) knR.rotation.x = 0.35 * Math.max(0, -Math.sin(halfW));
      } else if (moveIdx === 1) {
        // 2. Cyber Robot Quantized Step Isolations
        const quant = Math.round(exactBeats * 2) / 2;
        const qw = quant * Math.PI;
        if (pel) {
          pel.position.y = 0.92;
          pel.rotation.y = Math.sin(qw) * 0.28;
        }
        if (spn) {
          spn.rotation.y = -Math.sin(qw) * 0.25;
          spn.rotation.z = Math.cos(qw * 2) * 0.1;
        }
        if (hd) hd.rotation.y = Math.cos(qw) * 0.36;
        if (shL) {
          shL.rotation.x = -1.45 * (0.5 + 0.5 * Math.sin(qw));
          shL.rotation.z = 0.45;
        }
        if (shR) {
          shR.rotation.x = -1.45 * (0.5 - 0.5 * Math.sin(qw));
          shR.rotation.z = -0.45;
        }
        if (elL) elL.rotation.x = -1.52;
        if (elR) elR.rotation.x = -1.52;
        if (knL) knL.rotation.x = 0.12;
        if (knR) knR.rotation.x = 0.12;
      } else if (moveIdx === 2) {
        // 3. 360° Túy Tiên Lâu Tornado Spin & Pose
        danceSpinAccum = (danceSpinAccum + dt * 5.4) % (Math.PI * 2);
        if (pel) pel.position.y = 0.93 + Math.sin(w) * 0.04;
        if (spn) spn.rotation.x = -0.08;
        if (shL) {
          shL.rotation.z = 1.25 + Math.sin(w) * 0.2;
          shL.rotation.x = -0.35;
        }
        if (shR) {
          shR.rotation.z = -1.25 - Math.sin(w) * 0.2;
          shR.rotation.x = -0.35;
        }
        if (elL) elL.rotation.x = -0.55;
        if (elR) elR.rotation.x = -0.55;
        if (hpL) hpL.rotation.x = -0.25;
        if (knL) knL.rotation.x = 0.52;
      } else if (moveIdx === 3) {
        // 4. Nhạc Hội Festival Fist-Pump Bass Drop
        const pump = Math.max(0, Math.sin(w));
        if (pel) pel.position.y = 0.92 - (1 - pump) * 0.08 * amp;
        if (spn) {
          spn.rotation.x = 0.06 - pump * 0.14;
          spn.rotation.y = Math.sin(halfW * 0.5) * 0.2;
        }
        if (shR) {
          shR.rotation.x = -2.55 - pump * 0.45 * amp;
          shR.rotation.z = -0.22;
        }
        if (elR) elR.rotation.x = -0.55 + pump * 0.4;
        if (shL) {
          shL.rotation.x = -0.85 + Math.cos(halfW) * 0.3;
          shL.rotation.z = 0.28;
        }
        if (elL) elL.rotation.x = -1.25;
        if (hd) hd.rotation.x = -0.15 + pump * 0.25;
      } else if (moveIdx === 4) {
        // 5. Melbourne Neon Shuffle Glide
        const stride = Math.sin(halfW * 2);
        if (pel) {
          pel.position.y = 0.9 + Math.abs(stride) * 0.06;
          pel.position.x = Math.sin(halfW) * 0.12 * amp;
        }
        if (hpL) hpL.rotation.x = stride * 0.58 * amp;
        if (hpR) hpR.rotation.x = -stride * 0.58 * amp;
        if (knL) knL.rotation.x = Math.max(0, -stride) * 0.75;
        if (knR) knR.rotation.x = Math.max(0, stride) * 0.75;
        if (shL) shL.rotation.x = -stride * 0.55 - 0.35;
        if (shR) shR.rotation.x = stride * 0.55 - 0.35;
        if (elL) elL.rotation.x = -0.9;
        if (elR) elR.rotation.x = -0.9;
      } else {
        // 6. Hands-Up Ibiza Euphoria Wave
        if (pel) {
          pel.position.y = 0.92 + Math.sin(w) * 0.045;
          pel.rotation.z = Math.sin(halfW) * 0.1;
        }
        if (spn) {
          spn.rotation.z = Math.sin(halfW + 0.6) * 0.22 * amp;
          spn.rotation.x = -0.1;
        }
        if (shL) {
          shL.rotation.x = -2.75;
          shL.rotation.z = 0.38 + Math.sin(halfW) * 0.38 * amp;
        }
        if (shR) {
          shR.rotation.x = -2.75;
          shR.rotation.z = -0.38 + Math.sin(halfW) * 0.38 * amp;
        }
        if (elL) elL.rotation.x = -0.25;
        if (elR) elR.rotation.x = -0.25;
        if (hd) hd.rotation.z = Math.sin(halfW) * 0.18;
      }
    }

    function resetPlayerJointsNeutral(gCtx = ctx) {
      const joints = gCtx?.player?.rig?.joints;
      if (!joints) return;
      if (joints.pelvis) {
        joints.pelvis.position.x = 0;
        joints.pelvis.position.y = 0.92;
        joints.pelvis.rotation.set(0, 0, 0);
      }
      for (const k of ['spine', 'neck', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR']) {
        if (joints[k]) joints[k].rotation.set(0, 0, 0);
      }
    }

    function setPlayerDanceActive(flag, moveIdx = activeDanceMoveIdx, gCtx = ctx) {
      activeDanceMoveIdx = ((moveIdx | 0) % DANCE_MOVES.length + DANCE_MOVES.length) % DANCE_MOVES.length;
      if (flag && !playerDancingActive) {
        playerDancingActive = true;
        const p = gCtx?.player;
        if (p && isPlayerInsideNightclub(gCtx) && !p.inCar) {
          savedPreDancePos = { x: p.x, y: p.y, z: p.z, yaw: p.yaw };
          p.x = CLUB_CENTER_X;
          p.z = 1498.0;
          p.vx = 0;
          p.vz = 0;
          if (p.mesh) {
            p.mesh.position.set(p.x, p.y, p.z);
          }
        }
      } else if (!flag && playerDancingActive) {
        playerDancingActive = false;
        resetPlayerJointsNeutral(gCtx);
        if (savedPreDancePos && gCtx?.player && isPlayerInsideNightclub(gCtx)) {
          gCtx.player.yaw = savedPreDancePos.yaw;
          if (gCtx.player.mesh) gCtx.player.mesh.rotation.y = savedPreDancePos.yaw;
        }
        savedPreDancePos = null;
      }
    }

    function triggerBottleGirlParade(gCtx = ctx) {
      ensureBuilt(gCtx);
      state.bottleParadeActive = true;
      state.bottleParadeTimer = 9.5;
      clubAudio.playChampagnePopAndSparkler();
      emitGoldenConfetti(CLUB_CENTER_X, 5.8, 1498.0, 90);
      if (dom.paradeBanner) {
        dom.paradeBanner.classList.add('visible');
      }
    }

    function update(dt, beat, hypeNorm = 0.35, gCtx = ctx) {
      const inside = isPlayerInsideNightclub(gCtx);
      if (!inside && !state.bottleParadeActive) {
        if (clubStageRoot.visible) clubStageRoot.visible = false;
        if (dom.paradeBanner) dom.paradeBanner.classList.remove('visible');
        return;
      }

      ensureBuilt(gCtx);
      clubStageRoot.visible = inside;

      const t = beat.exactBeats;
      // Animate VIP Safe Door & Cash Bricks based on safeBalance
      if (vipSafeDoorPivot && vipCashStackGroup) {
        const hasSafeCash = state.clubOwned && state.safeBalance > 0;
        vipCashStackGroup.visible = hasSafeCash;
        const fillScale = clamp(state.safeBalance / 15000, 0.25, 1.25);
        vipCashStackGroup.scale.set(1, fillScale, 1);
        const targetDoorAngle = state.clubOwned ? -1.15 : 0;
        vipSafeDoorPivot.rotation.y = damp(vipSafeDoorPivot.rotation.y, targetDoorAngle, 4.0, dt);
      }

      if (vipCoronaMesh) {
        vipCoronaMesh.rotation.y += dt * 1.2;
        vipCoronaMesh.material.opacity = 0.24 + beat.kickPulse * 0.22;
      }
      if (bouncerCoronaMesh) {
        bouncerCoronaMesh.rotation.y -= dt * 1.1;
        bouncerCoronaMesh.material.opacity = 0.22 + beat.kickPulse * 0.2;
      }

      // Keep Túy Tiên Lâu lighting simple and comfortable (disable flashy 4K rainbow laser cones)
      const showExtraLasers = false;
      for (let i = 0; i < extraLaserCones.length; i++) {
        const lc = extraLaserCones[i];
        lc.mesh.visible = showExtraLasers;
      }

      // Animate Cheering Dancefloor Crowd Circle
      const crowdEnergy = playerDancingActive ? 0.65 + hypeNorm * 0.7 : 0.48;
      for (let i = 0; i < crowdDancers.length; i++) {
        const cd = crowdDancers[i];
        const move = playerDancingActive && hypeNorm > 0.75 ? 5 : (cd.moveStyle + (beat.barIndex & 1)) % 6;
        applyDanceJoints(cd.rig.joints, move, t + cd.phase * 0.25, crowdEnergy, dt);
      }

      // Apply Live Procedural 3D Dance Move to Player Character on LED Dancefloor
      if (playerDancingActive && gCtx?.player?.rig?.joints && !gCtx.player.inCar) {
        applyDanceJoints(gCtx.player.rig.joints, activeDanceMoveIdx, t, 0.85 + hypeNorm * 0.45, dt);
        if (gCtx.player.mesh) {
          if (activeDanceMoveIdx === 2) {
            gCtx.player.mesh.rotation.y = danceSpinAccum;
          } else {
            gCtx.player.mesh.rotation.y = Math.sin(t * 0.5) * 0.45;
          }
        }
      }

      // Animate Bottle-Girl Sparkler Parade
      if (state.bottleParadeActive) {
        state.bottleParadeTimer -= dt;
        const prog = 1 - clamp(state.bottleParadeTimer / 9.5, 0, 1);
        for (let b = 0; b < bottleGirls.length; b++) {
          const bg = bottleGirls[b];
          bg.rig.visible = true;
          const orbitAng = prog * Math.PI * 2.4 + b * ((Math.PI * 2) / 3);
          const rx = CLUB_CENTER_X + Math.cos(orbitAng) * 2.75;
          const rz = 1498.0 + Math.sin(orbitAng) * 2.75;
          bg.rig.position.set(rx, 0.03, rz);
          bg.rig.rotation.y = -orbitAng + Math.PI * 0.5;
          applyDanceJoints(bg.rig.joints, 5, t + b * 0.3, 1.1, dt);

          // Emit golden sparkler fountain from right-hand wand
          emitSparklerBurst(rx + Math.cos(orbitAng) * 0.25, 1.68, rz + Math.sin(orbitAng) * 0.25, 3);
        }
        if (Math.random() < 0.35) {
          emitGoldenConfetti(CLUB_CENTER_X, 6.2, 1498.0, 4);
        }
        if (state.bottleParadeTimer <= 0) {
          state.bottleParadeActive = false;
          for (const bg of bottleGirls) bg.rig.visible = false;
          if (dom.paradeBanner) dom.paradeBanner.classList.remove('visible');
        }
      }

      // Step Instanced Sparkler Sparks & Confetti
      if (sparkInst) {
        let dirtySparks = false;
        for (let i = 0; i < MAX_SPARKS; i++) {
          const sp = sparkData[i];
          if (!sp.active) continue;
          dirtySparks = true;
          sp.life -= dt;
          if (sp.life <= 0) {
            sp.active = false;
            _dummy.position.set(0, -999, 0);
            _dummy.scale.setScalar(0.001);
          } else {
            sp.vy -= 9.2 * dt;
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            sp.z += sp.vz * dt;
            _dummy.position.set(sp.x, sp.y, sp.z);
            _dummy.rotation.set(sp.life * 8, sp.life * 5, 0);
            _dummy.scale.setScalar(clamp(sp.life / sp.maxLife, 0.1, 1.2));
          }
          _dummy.updateMatrix();
          sparkInst.setMatrixAt(i, _dummy.matrix);
        }
        if (dirtySparks) sparkInst.instanceMatrix.needsUpdate = true;
      }

      if (confettiInst) {
        let dirtyConf = false;
        for (let i = 0; i < MAX_CONFETTI; i++) {
          const cf = confettiData[i];
          if (!cf.active) continue;
          dirtyConf = true;
          cf.life -= dt;
          if (cf.life <= 0 || cf.y < 0.04) {
            cf.active = false;
            _dummy.position.set(0, -999, 0);
            _dummy.scale.setScalar(0.001);
          } else {
            cf.x += (cf.vx + Math.sin(cf.life * 5 + i) * 0.6) * dt;
            cf.y += cf.vy * dt;
            cf.z += (cf.vz + Math.cos(cf.life * 4 + i) * 0.6) * dt;
            cf.rx += dt * 6.5;
            cf.ry += dt * 4.8;
            _dummy.position.set(cf.x, cf.y, cf.z);
            _dummy.rotation.set(cf.rx, cf.ry, 0);
            _dummy.scale.setScalar(1.0);
          }
          _dummy.updateMatrix();
          confettiInst.setMatrixAt(i, _dummy.matrix);
        }
        if (dirtyConf) confettiInst.instanceMatrix.needsUpdate = true;
      }
    }

    return {
      root: clubStageRoot,
      ensureBuilt,
      update,
      setPlayerDanceActive,
      setDanceMove(idx) {
        activeDanceMoveIdx = ((idx | 0) % DANCE_MOVES.length + DANCE_MOVES.length) % DANCE_MOVES.length;
      },
      get activeDanceMoveIdx() {
        return activeDanceMoveIdx;
      },
      triggerBottleGirlParade,
      emitGoldenConfetti,
      spawnHumanoidOrFallback
    };
  }

  const clubStage3D = createClub3DStage();

  // ============================================================================
  // ILLUSTRATED COCKTAIL RENDERER, BARTENDER STAGE, INTOXICATION & BLACKOUT
  // ============================================================================
  const BARTENDER_RUMORS = [
    'Bartender: "Nghe đồn Kho Tiền Ngân Hàng Linh Thạch Bảo Khố ở (111, -120) vừa nhập lô vàng thỏi $65,000 đấy — sắm mũi khoan nhiệt là hốt bạc!"',
    'Bartender: "Cổ phiếu Luyện Khí Các trên sàn Vạn Thương Linh Các cứ hễ ngoài đường nổ xe ầm ầm là tăng phi mã!"',
    'Bartender: "Dưới hầm ngầm Vạn Bảo Đổ Phường (209.5, -110) chứa hơn $120,000 kim cương, nhưng phải giải mã vân tay trong 45 giây!"',
    'Bartender: "Muốn kiếm tiền thụ động nhàn tênh thì mua đứt Túy Tiên Lâu này đi — két sắt VIP đẻ đều $2,500 mỗi 3 phút!"',
    'Bartender: "Đừng dại lái siêu xe ngang qua mặt tuần tra Thiên Đình Chấp Pháp khi nồng độ cồn trên 35%, ăn ngay 1 Sao truy nã DUI đấy!"',
    'Bartender: "Trên bến du thuyền Bồng Lai Marina (-218, +95) có tàu cao tốc Speedboat phóng ngoài biển phê hết nấc!"'
  ];

  function getEffectiveDrinkPrice(drink) {
    if (!drink) return 0;
    if (state.clubOwned && state.upgrades.mixology_elite) {
      return Math.max(5, Math.round(drink.price * 0.8));
    }
    return drink.price;
  }

  function findDrinkDef(drinkIdOrIndex) {
    if (typeof drinkIdOrIndex === 'number' && Number.isFinite(drinkIdOrIndex)) {
      const idx = ((Math.floor(drinkIdOrIndex) % COCKTAIL_MENU.length) + COCKTAIL_MENU.length) % COCKTAIL_MENU.length;
      return COCKTAIL_MENU[idx];
    }
    if (drinkIdOrIndex && typeof drinkIdOrIndex === 'object' && drinkIdOrIndex.id) {
      return COCKTAIL_MENU.find((d) => d.id === drinkIdOrIndex.id) || COCKTAIL_MENU[0];
    }
    const key = String(drinkIdOrIndex || '').trim().toLowerCase();
    if (!key) return COCKTAIL_MENU.find((d) => d.id === state.selectedDrinkId) || COCKTAIL_MENU[0];
    return (
      COCKTAIL_MENU.find((d) => d.id === key) ||
      COCKTAIL_MENU.find((d) => d.name.toLowerCase().includes(key) || d.shortName.toLowerCase().includes(key)) ||
      COCKTAIL_MENU[0]
    );
  }

  function drawCocktailIllustration(canvas, drink, animTime = 0, fillRatio = 1.0) {
    if (!canvas || !drink) return;
    const g = canvas.getContext('2d');
    if (!g) return;
    const w = canvas.width;
    const h = canvas.height;
    g.clearRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.54;
    const lv = clamp(fillRatio, 0.08, 1.0);

    // Subtle neon halo behind glass
    const halo = g.createRadialGradient(cx, cy, 4, cx, cy, w * 0.46);
    halo.addColorStop(0, drink.primaryColor + '55');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = halo;
    g.fillRect(0, 0, w, h);

    g.save();
    if (drink.glassStyle === 'mug') {
      // Frothy Bavarian Beer Mug (Pißwasser)
      g.strokeStyle = 'rgba(226,232,240,0.82)';
      g.lineWidth = 3.2;
      g.beginPath();
      g.arc(cx + 18, cy + 2, 11, -Math.PI * 0.45, Math.PI * 0.45);
      g.stroke();

      const mw = 34;
      const mh = 46;
      const mx = cx - mw * 0.5 - 3;
      const my = cy - mh * 0.5 + 4;

      const beerGrad = g.createLinearGradient(mx, my, mx, my + mh);
      beerGrad.addColorStop(0, drink.secondaryColor);
      beerGrad.addColorStop(1, drink.primaryColor);
      g.fillStyle = beerGrad;
      const fillH = mh * lv;
      g.fillRect(mx + 2, my + mh - fillH, mw - 4, fillH - 2);

      // Rising carbonation bubbles
      g.fillStyle = 'rgba(255,255,255,0.65)';
      for (let b = 0; b < 6; b++) {
        const bx = mx + 7 + ((b * 9) % (mw - 12));
        const by = my + mh - 6 - (((animTime * 28 + b * 11) % Math.max(8, fillH - 6)));
        g.beginPath();
        g.arc(bx, by, 1.5, 0, Math.PI * 2);
        g.fill();
      }

      //Thick white foam head
      if (lv > 0.65) {
        g.fillStyle = drink.foamColor;
        for (let f = -1; f <= 2; f++) {
          g.beginPath();
          g.arc(mx + 7 + f * 8.5, my + 2, 7.2, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.strokeStyle = 'rgba(248,250,252,0.85)';
      g.lineWidth = 2.4;
      g.strokeRect(mx, my, mw, mh);
    } else if (drink.glassStyle === 'rocks') {
      // Crystal Whiskey Rocks Tumbler + Sphere Ice
      const gw = 38;
      const gh = 36;
      const gx = cx - gw * 0.5;
      const gy = cy - gh * 0.35;

      const liqH = gh * 0.72 * lv;
      const wGrad = g.createLinearGradient(gx, gy, gx, gy + gh);
      wGrad.addColorStop(0, drink.secondaryColor);
      wGrad.addColorStop(1, drink.primaryColor);
      g.fillStyle = wGrad;
      g.fillRect(gx + 3, gy + gh - liqH - 3, gw - 6, liqH);

      // Carved crystal ice sphere
      g.fillStyle = 'rgba(224, 242, 254, 0.72)';
      g.beginPath();
      g.arc(cx, gy + gh - 15, 9.5, 0, Math.PI * 2);
      g.fill();

      g.strokeStyle = 'rgba(241,245,249,0.9)';
      g.lineWidth = 2.4;
      g.strokeRect(gx, gy, gw, gh);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(gx + 2, gy + gh - 4, gw - 4, 4);
    } else if (drink.glassStyle === 'shot_lime') {
      // Tequila Shot Glass + Salt Rim + Green Lime Wedge
      const topW = 28;
      const botW = 20;
      const sh = 38;
      const sy = cy - 12;

      g.fillStyle = drink.primaryColor;
      g.beginPath();
      const curTopY = sy + sh * (1 - 0.8 * lv);
      g.moveTo(cx - topW * 0.44, curTopY);
      g.lineTo(cx + topW * 0.44, curTopY);
      g.lineTo(cx + botW * 0.44, sy + sh - 3);
      g.lineTo(cx - botW * 0.44, sy + sh - 3);
      g.closePath();
      g.fill();

      // Glass trapezoid + salt rim
      g.strokeStyle = '#f8fafc';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(cx - topW * 0.5, sy);
      g.lineTo(cx + topW * 0.5, sy);
      g.lineTo(cx + botW * 0.5, sy + sh);
      g.lineTo(cx - botW * 0.5, sy + sh);
      g.closePath();
      g.stroke();

      // Fresh lime slice on rim
      g.fillStyle = '#84cc16';
      g.beginPath();
      g.arc(cx + topW * 0.5, sy + 1, 9, -Math.PI * 0.8, Math.PI * 0.4);
      g.fill();
      g.strokeStyle = '#ecfccb';
      g.lineWidth = 1.4;
      g.stroke();
    } else if (drink.glassStyle === 'double_vodka') {
      // Two Frosted Tall Shot Glasses side-by-side
      for (const dx of [-13, 13]) {
        const vx = cx + dx - 9;
        const vy = cy - 14;
        const vw = 18;
        const vh = 38;
        const gGrad = g.createLinearGradient(vx, vy, vx, vy + vh);
        gGrad.addColorStop(0, '#e0f2fe');
        gGrad.addColorStop(1, '#38bdf8');
        g.fillStyle = gGrad;
        g.fillRect(vx + 2, vy + vh * (1 - 0.82 * lv), vw - 4, vh * 0.82 * lv - 2);
        g.strokeStyle = 'rgba(224,242,254,0.92)';
        g.lineWidth = 2;
        g.strokeRect(vx, vy, vw, vh);
      }
    } else if (drink.glassStyle === 'martini_neon') {
      // Layered Cyberpunk Martini Glass + Glowing Stirrer & Dry Ice Mist
      const rimY = cy - 22;
      const bowlBotY = cy + 4;
      const baseY = cy + 28;

      const mGrad = g.createLinearGradient(cx, rimY, cx, bowlBotY);
      mGrad.addColorStop(0, '#06b6d4');
      mGrad.addColorStop(0.55, '#a855f7');
      mGrad.addColorStop(1, '#ec4899');
      g.fillStyle = mGrad;
      g.beginPath();
      const spread = 24 * lv;
      g.moveTo(cx - spread, bowlBotY - (bowlBotY - rimY) * lv);
      g.lineTo(cx + spread, bowlBotY - (bowlBotY - rimY) * lv);
      g.lineTo(cx, bowlBotY);
      g.closePath();
      g.fill();

      g.strokeStyle = '#e2e8f0';
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(cx - 26, rimY);
      g.lineTo(cx, bowlBotY);
      g.lineTo(cx + 26, rimY);
      g.moveTo(cx, bowlBotY);
      g.lineTo(cx, baseY);
      g.moveTo(cx - 14, baseY);
      g.lineTo(cx + 14, baseY);
      g.stroke();

      // Glowing neon cocktail pick
      g.strokeStyle = '#fde047';
      g.lineWidth = 1.8;
      g.beginPath();
      g.moveTo(cx - 4, bowlBotY - 4);
      g.lineTo(cx + 18, rimY - 10);
      g.stroke();
      g.fillStyle = '#f43f5e';
      g.beginPath();
      g.arc(cx + 11, rimY - 4, 3.8, 0, Math.PI * 2);
      g.fill();
    } else if (drink.glassStyle === 'champagne_vip') {
      // 24K Gold Blêuter'd Magnum Bottle + Sparkler Starburst
      const bx = cx - 11;
      const by = cy - 12;
      const bGrad = g.createLinearGradient(bx, by - 20, bx + 22, by + 36);
      bGrad.addColorStop(0, '#fef08a');
      bGrad.addColorStop(0.5, '#f59e0b');
      bGrad.addColorStop(1, '#92400e');
      g.fillStyle = bGrad;
      g.beginPath();
      g.roundRect ? g.roundRect(bx, by, 22, 36, 5) : g.rect(bx, by, 22, 36);
      g.fill();
      g.fillRect(cx - 4.5, by - 18, 9, 19);

      // Red VIP Shield Label
      g.fillStyle = '#991b1b';
      g.fillRect(bx + 3, by + 11, 16, 12);
      g.strokeStyle = '#fde047';
      g.lineWidth = 1.3;
      g.strokeRect(bx + 3, by + 11, 16, 12);

      // Animated Sparkler Rays at Bottle Neck
      g.strokeStyle = '#fef08a';
      g.lineWidth = 1.6;
      for (let r = 0; r < 8; r++) {
        const a = (r / 8) * Math.PI * 2 + animTime * 4.5;
        const len = 7 + (r % 2) * 5;
        g.beginPath();
        g.moveTo(cx + 12, by - 14);
        g.lineTo(cx + 12 + Math.cos(a) * len, by - 14 + Math.sin(a) * len);
        g.stroke();
      }
    } else if (drink.glassStyle === 'energy_can') {
      // Neon-Green Junk Energy Sober Can + Lightning Bolt
      const cw = 26;
      const ch = 46;
      const x0 = cx - cw * 0.5;
      const y0 = cy - ch * 0.5 + 2;
      const cGrad = g.createLinearGradient(x0, y0, x0 + cw, y0 + ch);
      cGrad.addColorStop(0, '#16a34a');
      cGrad.addColorStop(0.5, '#4ade80');
      cGrad.addColorStop(1, '#14532d');
      g.fillStyle = cGrad;
      g.fillRect(x0, y0, cw, ch);
      g.fillStyle = '#cbd5e1';
      g.fillRect(x0 + 2, y0 - 3, cw - 4, 4);
      g.fillRect(x0 + 2, y0 + ch - 2, cw - 4, 3);

      // Yellow Lightning Icon
      g.fillStyle = '#fde047';
      g.beginPath();
      g.moveTo(cx + 3, y0 + 9);
      g.lineTo(cx - 6, y0 + 24);
      g.lineTo(cx + 1, y0 + 24);
      g.lineTo(cx - 3, y0 + 38);
      g.lineTo(cx + 7, y0 + 21);
      g.lineTo(cx, y0 + 21);
      g.closePath();
      g.fill();
    } else {
      // Macbeth Legendary Flaming Purple-Blue Shot!
      const sw = 28;
      const sh = 34;
      const sx = cx - sw * 0.5;
      const sy = cy - 4;

      const mGrad = g.createLinearGradient(sx, sy, sx, sy + sh);
      mGrad.addColorStop(0, '#3b82f6');
      mGrad.addColorStop(0.5, '#7e22ce');
      mGrad.addColorStop(1, '#1e1b4b');
      g.fillStyle = mGrad;
      g.fillRect(sx + 3, sy + sh * (1 - 0.85 * lv), sw - 6, sh * 0.85 * lv - 2);

      // Flickering Arcane Blue/Violet Flame above Rim!
      for (let f = 0; f < 3; f++) {
        const fxOff = (f - 1) * 6 + Math.sin(animTime * 9 + f * 2) * 2.2;
        const fh = 18 + Math.cos(animTime * 11 + f) * 4;
        g.fillStyle = f === 1 ? 'rgba(96, 165, 250, 0.88)' : 'rgba(192, 132, 252, 0.72)';
        g.beginPath();
        g.moveTo(cx - 9 + f * 3, sy);
        g.quadraticCurveTo(cx + fxOff, sy - fh, cx + 9 - f * 3, sy);
        g.fill();
      }

      g.strokeStyle = '#e9d5ff';
      g.lineWidth = 2.4;
      g.strokeRect(sx, sy, sw, sh);
    }
    g.restore();
  }

  function renderBartenderStage(animTime) {
    const canvas = dom.barStageCanvas;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;
    const w = canvas.width;
    const h = canvas.height;

    // Backbar Neon Shelves & Bottle Silhouettes
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#130926');
    bg.addColorStop(0.68, '#0b1024');
    bg.addColorStop(1, '#1e1b2e');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);

    // Glowing Shelf Strips
    const shelfColors = ['#ec4899', '#06b6d4'];
    for (let s = 0; s < 2; s++) {
      const sy = 46 + s * 44;
      g.fillStyle = shelfColors[s];
      g.fillRect(24, sy, w - 48, 2.5);
      for (let b = 0; b < 11; b++) {
        const bx = 36 + b * 32;
        const bh = 20 + ((b * 7 + s * 5) % 12);
        g.fillStyle = `hsla(${(b * 38 + s * 90) % 360}, 82%, 56%, 0.42)`;
        g.fillRect(bx, sy - bh, 11, bh);
        g.fillRect(bx + 3, sy - bh - 6, 5, 6);
      }
    }

    // Polished Black Marble Bar Countertop
    const counterY = h - 44;
    const counterGrad = g.createLinearGradient(0, counterY, 0, h);
    counterGrad.addColorStop(0, '#312e81');
    counterGrad.addColorStop(0.14, '#0f172a');
    counterGrad.addColorStop(1, '#020617');
    g.fillStyle = counterGrad;
    g.fillRect(0, counterY, w, 44);

    const drink = findDrinkDef(state.selectedDrinkId);
    const pour = state.pouringAnim;
    const fillRatio = pour.active ? clamp(pour.progress / 0.82, 0.1, 1.0) : 1.0;

    // Draw Pouring Shaker Stream if currently mixing
    if (pour.active && pour.progress < 0.85) {
      const shakerX = w * 0.5 + 48;
      const shakerY = 48 + Math.sin(animTime * 22) * 3;
      g.save();
      g.translate(shakerX, shakerY);
      g.rotate(-0.95);
      g.fillStyle = '#cbd5e1';
      g.fillRect(-12, -22, 24, 44);
      g.restore();

      // Liquid stream into glass
      g.strokeStyle = drink.primaryColor;
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(shakerX - 22, shakerY + 12);
      g.quadraticCurveTo(w * 0.5 + 4, shakerY + 42, w * 0.5, counterY - 26);
      g.stroke();
    }

    // Render Selected Drink Glass Large on Countertop
    const subCanvas = renderBartenderStage._subCanvas || (renderBartenderStage._subCanvas = document.createElement('canvas'));
    subCanvas.width = 128;
    subCanvas.height = 128;
    drawCocktailIllustration(subCanvas, drink, animTime, fillRatio);
    g.drawImage(subCanvas, w * 0.5 - 64, counterY - 102);

    // Price & Alcohol HUD Tag on Stage
    const effPrice = getEffectiveDrinkPrice(drink);
    g.fillStyle = 'rgba(15, 23, 42, 0.82)';
    g.fillRect(14, 12, 152, 26);
    g.fillStyle = '#4ade80';
    g.font = 'bold 13px Segoe UI, sans-serif';
    g.fillText(`Giá: ${formatCash(effPrice)}`, 22, 29);
    g.fillStyle = drink.alcohol < 0 ? '#22c55e' : '#f472b6';
    g.fillText(`${drink.alcohol > 0 ? '+' : ''}${drink.alcohol}% Cồn`, 92, 29);
  }

  function refreshBarMenuSelectionUI() {
    if (!dom.drinkGrid) return;
    const drink = findDrinkDef(state.selectedDrinkId);
    const effPrice = getEffectiveDrinkPrice(drink);

    dom.drinkGrid.querySelectorAll('.nl-drink-card').forEach((card) => {
      const id = card.getAttribute('data-drink-id');
      card.classList.toggle('selected', id === drink.id);
      const d = findDrinkDef(id);
      const prEl = card.querySelector('.nl-drink-price');
      if (prEl && d) {
        const pVal = getEffectiveDrinkPrice(d);
        prEl.textContent = pVal < d.price ? `${formatCash(pVal)} (VIP -20%)` : formatCash(pVal);
      }
    });

    if (dom.barDrinkTitle) dom.barDrinkTitle.textContent = drink.name;
    if (dom.barDrinkDesc) dom.barDrinkDesc.textContent = drink.tagline;
    if (dom.barDrinkStats) {
      const alcTxt = drink.alcohol < 0 ? `Giải rượu ${drink.alcohol}% Cồn` : `+${drink.alcohol}% Cồn`;
      const armorTxt = drink.armorGain > 0 ? ` • +${drink.armorGain} Giáp` : '';
      dom.barDrinkStats.textContent = `+${drink.healHp} Máu${armorTxt} • +${drink.staminaBoost}% Thể lực • ${alcTxt}`;
    }
    if (dom.barQuoteBox) {
      dom.barQuoteBox.textContent = `Bartender: "${drink.bartenderLine}"`;
    }
    if (dom.btnOrderDrink) {
      dom.btnOrderDrink.textContent = `🍸 GỌI ${drink.shortName.toUpperCase()} (${formatCash(effPrice)})`;
    }
  }

  function populateBarMenuDOM() {
    if (!dom.drinkGrid) return;
    dom.drinkGrid.innerHTML = '';
    for (const drink of COCKTAIL_MENU) {
      const card = document.createElement('div');
      card.className = 'nl-drink-card' + (drink.id === state.selectedDrinkId ? ' selected' : '');
      card.setAttribute('data-drink-id', drink.id);

      const cvs = document.createElement('canvas');
      cvs.className = 'nl-drink-illust';
      cvs.width = 88;
      cvs.height = 88;
      drawCocktailIllustration(cvs, drink, 0.5, 1.0);

      const nameEl = document.createElement('div');
      nameEl.className = 'nl-drink-name';
      nameEl.textContent = drink.shortName;

      const priceEl = document.createElement('div');
      priceEl.className = 'nl-drink-price';
      priceEl.textContent = formatCash(getEffectiveDrinkPrice(drink));

      const alcEl = document.createElement('div');
      alcEl.className = 'nl-drink-alc';
      alcEl.textContent =
        drink.alcohol < 0
          ? `⚡ ${drink.alcohol}% Cồn • Tỉnh Táo`
          : drink.triggersBlackout
          ? '💀 100% Gục Tại Chỗ!'
          : `🔥 +${drink.alcohol}% Cồn • +${drink.healHp} HP`;

      card.append(cvs, nameEl, priceEl, alcEl);
      card.addEventListener('click', () => {
        state.selectedDrinkId = drink.id;
        refreshBarMenuSelectionUI();
        renderBartenderStage(performance.now() * 0.001);
      });
      card.addEventListener('dblclick', () => {
        state.selectedDrinkId = drink.id;
        drinkCocktail(drink.id, false);
      });
      dom.drinkGrid.appendChild(card);
    }
    refreshBarMenuSelectionUI();
  }

  function drinkCocktail(drinkIdOrIndex, free = false, gCtx = ctx) {
    const activeCtx = getActiveCtx(gCtx);
    const drink = findDrinkDef(drinkIdOrIndex);
    if (!drink) return false;

    const cost = free ? 0 : getEffectiveDrinkPrice(drink);
    if (cost > 0 && !spendPlayerCash(cost, activeCtx)) {
      notifyClub(`Không đủ tiền mặt! Cần ${formatCash(cost)} để gọi ${drink.shortName}.`, 3.2, activeCtx);
      clubAudio.playArcadeLoseBuzzer();
      return false;
    }

    state.selectedDrinkId = drink.id;
    state.pouringAnim.active = true;
    state.pouringAnim.drink = drink;
    state.pouringAnim.progress = 0;

    clubAudio.playShakeAndPour();
    setTimeout(() => {
      clubAudio.playDrinkGulp(drink.alcohol >= 22);
    }, 320);

    // Apply Player HP, Armor & Temporary Max Stamina / Special Buffs
    const p = activeCtx?.player;
    if (p) {
      const maxHp = Number.isFinite(p.maxHp) && p.maxHp > 0 ? p.maxHp : 100;
      p.hp = clamp((Number(p.hp) || 80) + drink.healHp, 1, maxHp);
      if (drink.armorGain > 0) {
        p.armor = clamp((Number(p.armor) || 0) + drink.armorGain, 0, 100);
      }
      const maxSpec = Number.isFinite(p.maxSpecial) && p.maxSpecial > 0 ? p.maxSpecial : 100;
      p.special = clamp((Number(p.special) || 0) + drink.staminaBoost, 0, maxSpec);
      p.stamina = 135;
      p.maxStamina = 135;
    }
    state.staminaBuffTimer = 90.0;
    state.staminaBuffBonus = 35;

    // Update Túy Tiên Lâu Popularity & Lifetime Counter
    state.totalDrinksConsumed++;
    state.clubPopularity = clamp(state.clubPopularity + drink.popularityGain, 0, 100);

    // Adjust Intoxication Level (0..100%)
    if (drink.triggersBlackout) {
      state.drunkLevel = 100;
      state.drunkPeakHoldTimer = 14.0;
    } else {
      state.drunkLevel = clamp(state.drunkLevel + drink.alcohol, 0, 100);
      if (drink.alcohol > 0) {
        state.drunkPeakHoldTimer = 12.5;
      }
    }

    if (dom.barQuoteBox) {
      dom.barQuoteBox.textContent = `🍸 ${drink.drinkQuip} (Nồng độ cồn hiện tại: ${Math.round(state.drunkLevel)}%)`;
    }
    notifyClub(`Đã thưởng thức *${drink.shortName}*! (${drink.drinkQuip})`, 3.6, activeCtx);

    // Special Event 1: $5,000 Blêuter'd VIP Sparkler Bottle-Girl Parade!
    if (drink.isVipParade) {
      clubStage3D.triggerBottleGirlParade(activeCtx);
      showClubBanner("BLÊUTER'D CHAMPAGNE VIP", 'Đoàn Vũ Công Pháo Sáng Vàng 24K Xuất Kích!', 4.2, activeCtx);
    }

    saveNightlifeState();
    syncHeaderTelemetry(activeCtx);

    // Special Event 2: Macbeth Shot or 100% BAC -> Trigger GTA Say Ngất Sequence!
    if (drink.triggersBlackout || state.drunkLevel >= 100) {
      triggerBlackout(drink.triggersBlackout ? 'macbeth' : 'max_bac', activeCtx);
    }

    return true;
  }

  // ============================================================================
  // MACBETH / 100% BAC SPIRAL BLACKOUT TELEPORT SEQUENCE ("3 GIỜ SAU...")
  // ============================================================================
  function safeTeleportPlayerToWorld(tx, ty, tz, tyaw, useExactY, gCtx = ctx) {
    const p = gCtx?.player;
    if (!p) return;

    // Exit vehicle or interior cleanly first
    if (p.inCar && typeof gCtx?.vehicles?.exitVehicle === 'function') {
      try {
        gCtx.vehicles.exitVehicle();
      } catch (_) {}
    }
    p.inNightclub = false;
    p.inCasino = false;
    p.inSafehouse = false;
    if (gCtx?.casinoWorld && typeof gCtx.casinoWorld === 'object') {
      gCtx.casinoWorld.inNightclub = false;
      gCtx.casinoWorld.inCasino = false;
    }

    let finalY = ty;
    if (!useExactY && typeof gCtx?.world?.getGroundHeight === 'function') {
      const gh = gCtx.world.getGroundHeight(tx, tz);
      if (Number.isFinite(gh)) finalY = gh + 0.06;
    }

    p.x = tx;
    p.y = finalY;
    p.z = tz;
    p.vx = 0;
    p.vy = 0;
    p.vz = 0;
    if (Number.isFinite(tyaw)) p.yaw = tyaw;
    if (p.mesh) {
      p.mesh.position.set(p.x, p.y, p.z);
      if (Number.isFinite(tyaw)) p.mesh.rotation.y = tyaw;
    }
    if (gCtx?.engine && Number.isFinite(tyaw)) {
      gCtx.engine.camYaw = wrapAngle(tyaw + Math.PI);
      gCtx.engine.camPitch = -0.14;
    }
  }

  function triggerBlackout(reason = 'macbeth', gCtx = ctx) {
    const activeCtx = getActiveCtx(gCtx);
    if (state.blackoutActive) return;

    ensureNightlifeDOM();
    if (state.isOpen) {
      closeBarStation(activeCtx);
    }

    // Pick one of the 6 hilarious Giang Hồ aftermath locations (never repeating back-to-back)
    let pickIdx = randInt(0, MACBETH_AFTERMATH_SCENARIOS.length - 1);
    if (pickIdx === state.lastScenarioIndex) {
      pickIdx = (pickIdx + 1) % MACBETH_AFTERMATH_SCENARIOS.length;
    }
    state.lastScenarioIndex = pickIdx;
    const scenario = MACBETH_AFTERMATH_SCENARIOS[pickIdx];

    state.blackoutActive = true;
    state.blackoutTimer = 0;
    state.blackoutDuration = 4.4;
    state.blackoutTeleportDone = false;
    state.blackoutScenario = scenario;

    clubAudio.playBlackoutSpiral();
    activeCtx?.engine?.addShake?.(0.65);

    if (dom.blackoutTitle) {
      dom.blackoutTitle.textContent = '3 GIỜ SAU...';
    }
    if (dom.blackoutSub) {
      dom.blackoutSub.textContent =
        reason === 'macbeth'
          ? 'Ly rượu Shot Bí Ẩn Macbeth vừa đánh sập hoàn toàn ý thức của bạn...'
          : 'Nồng độ cồn chạm ngưỡng 100% — Bạn gục ngã ngay giữa ánh đèn Neon...';
    }
    if (dom.blackoutOverlay) {
      dom.blackoutOverlay.classList.add('visible');
    }
  }

  function updateBlackoutSequence(rawDt, gCtx = ctx) {
    if (!state.blackoutActive) return;
    state.blackoutTimer += rawDt;
    const t = state.blackoutTimer;
    const dur = state.blackoutDuration;

    // Render Hypnotic Macbeth Spiral on #nl-blackout-canvas
    const cvs = dom.blackoutSpiralCanvas;
    if (cvs) {
      const w = (cvs.width = Math.max(320, Math.floor((window.innerWidth || 800) * 0.5)));
      const h = (cvs.height = Math.max(200, Math.floor((window.innerHeight || 600) * 0.5)));
      const g = cvs.getContext('2d');
      if (g) {
        g.fillStyle = 'rgba(4, 2, 12, 0.34)';
        g.fillRect(0, 0, w, h);
        const cx = w * 0.5;
        const cy = h * 0.5;
        g.save();
        g.translate(cx, cy);
        g.rotate(t * 2.8);
        for (let ring = 0; ring < 14; ring++) {
          const rad = ((ring * 26 + t * 85) % (Math.max(w, h) * 0.65)) + 6;
          g.strokeStyle = ring % 2 === 0 ? 'rgba(168, 85, 247, 0.36)' : 'rgba(6, 182, 212, 0.28)';
          g.lineWidth = 3;
          g.beginPath();
          g.arc(0, 0, rad, ring * 0.4, ring * 0.4 + Math.PI * 1.35);
          g.stroke();
        }
        g.restore();
      }
    }

    // Perform actual world teleport + aftermath spawns at midpoint (t >= 2.1s) while screen is opaque
    if (!state.blackoutTeleportDone && t >= 2.05) {
      state.blackoutTeleportDone = true;
      const sc = state.blackoutScenario || MACBETH_AFTERMATH_SCENARIOS[0];
      safeTeleportPlayerToWorld(sc.x, sc.y, sc.z, sc.yaw, sc.useExactY, gCtx);

      const p = gCtx?.player;
      if (p) {
        p.hp = p.maxHp || 100;
        if (sc.outfit && typeof gCtx?.characters?.applyOutfit === 'function') {
          try {
            gCtx.characters.applyOutfit(p.rig, sc.outfit);
            p.outfit = sc.outfit;
          } catch (_) {}
        }
      }

      if (sc.spawnSupercar && typeof gCtx?.vehicles?.spawnVehicle === 'function') {
        try {
          const groundH =
            typeof gCtx?.world?.getGroundHeight === 'function'
              ? gCtx.world.getGroundHeight(sc.x + 3.4, sc.z + 1.2)
              : 0.05;
          gCtx.vehicles.spawnVehicle(sc.spawnSupercar, sc.x + 3.4, groundH + 0.05, sc.z + 1.2, sc.yaw, {
            color: sc.supercarColor || 0xfbbf24,
            plate: 'MCBTH777',
            isParked: true
          });
        } catch (_) {}
      }

      if (sc.bonusCash > 0) {
        addPlayerCash(sc.bonusCash, gCtx, false);
      }

      // Leave player with mild 26% morning-after buzz so they aren't trapped in infinite blackouts
      state.drunkLevel = 26;
      state.drunkPeakHoldTimer = 8.0;
    }

    if (t >= dur) {
      state.blackoutActive = false;
      if (dom.blackoutOverlay) {
        dom.blackoutOverlay.classList.remove('visible');
      }
      const sc = state.blackoutScenario;
      if (sc) {
        showClubBanner('TỈNH DẬY SAU CƠN SAY', sc.title, 4.2, gCtx);
        gCtx?.ui?.showSubtitle?.(sc.subtitle, 6.8);
      }
    }
  }

  // ============================================================================
  // 3D WORLD DRUNK CAMERA SWAY, STUMBLE-WALK, MONOLOGUES & +1★ Thiên Đình Chấp Pháp DUI CHECK
  // ============================================================================
  function isWorldStepClearOfWalls(nx, nz, py, gCtx = ctx) {
    const pad = 0.48;
    const pools = [gCtx?.world?.aabbs, gCtx?.casinoWorld?.interiorAABBs, gCtx?.casinoWorld?.aabbs];
    for (const list of pools) {
      if (!Array.isArray(list)) continue;
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        if (!b) continue;
        const minY = b.minY ?? -10;
        const maxY = b.maxY ?? 999;
        if (py + 1.5 < minY || py + 0.25 > maxY) continue;
        if (nx > b.minX - pad && nx < b.maxX + pad && nz > b.minZ - pad && nz < b.maxZ + pad) {
          return false;
        }
      }
    }
    return true;
  }

  function updateWorldIntoxicationEffects(dt, rawDt, gCtx = ctx) {
    // 1. Temporary Stamina Buff Decay
    if (state.staminaBuffTimer > 0) {
      state.staminaBuffTimer = Math.max(0, state.staminaBuffTimer - rawDt);
      if (state.staminaBuffTimer <= 0 && gCtx?.player) {
        gCtx.player.maxStamina = 100;
      }
    }

    // 2. Metabolic BAC Sobering Curve
    if (state.drunkPeakHoldTimer > 0) {
      state.drunkPeakHoldTimer = Math.max(0, state.drunkPeakHoldTimer - rawDt);
    } else if (state.drunkLevel > 0 && !state.blackoutActive) {
      state.drunkLevel = Math.max(0, state.drunkLevel - rawDt * 1.15);
    }

    if (state.duiCooldown > 0) {
      state.duiCooldown = Math.max(0, state.duiCooldown - rawDt);
    }

    const bac = state.drunkLevel;
    const norm = clamp(bac / 100, 0, 1);

    // Update Top-Right BAC Intoxication Pill
    if (dom.drunkBadge) {
      const showPill = bac >= 3.0 && !state.blackoutActive;
      dom.drunkBadge.classList.toggle('visible', showPill);
      if (showPill) {
        if (dom.drunkBadgeFill) dom.drunkBadgeFill.style.width = `${Math.round(bac)}%`;
        if (dom.drunkBadgeVal) dom.drunkBadgeVal.textContent = `${Math.round(bac)}%`;
      }
    }

    // Update Double-Vision & Chromatic Aberration Screen Overlay
    if (dom.drunkOverlay) {
      const showFx = bac >= 16 && !state.isOpen && !state.blackoutActive;
      dom.drunkOverlay.classList.toggle('active', showFx);
      if (showFx) {
        state.drunkPhase += rawDt * (1.85 + norm * 2.4);
        const shiftX = Math.sin(state.drunkPhase * 1.3) * (3 + norm * 14);
        const shiftY = Math.cos(state.drunkPhase * 0.95) * (2 + norm * 9);
        const blurPx = ((bac - 16) / 84) * 3.4;
        dom.drunkOverlay.style.opacity = String(clamp((bac - 14) / 78, 0.12, 0.92));
        dom.drunkOverlay.style.backdropFilter = `blur(${blurPx.toFixed(2)}px)`;
        if (dom.drunkGhostA) {
          dom.drunkGhostA.style.transform = `translate(${shiftX.toFixed(1)}px, ${shiftY.toFixed(1)}px)`;
        }
        if (dom.drunkGhostB) {
          dom.drunkGhostB.style.transform = `translate(${(-shiftX).toFixed(1)}px, ${(-shiftY).toFixed(1)}px)`;
        }
      } else {
        dom.drunkOverlay.style.backdropFilter = 'none';
      }
    }

    if (bac < 15 || state.blackoutActive || gCtx?.paused || !gCtx?.started) return;

    state.drunkPhase += dt * (1.6 + norm * 2.1);
    const p = gCtx?.player;
    const cam = gCtx?.engine?.camera;

    // 3. Sinusoidal Camera Roll, Pitch Sway & Breathing FOV in 3D World
    if (cam && !state.isOpen) {
      const rollAmp = 0.018 + norm * 0.088;
      const pitchAmp = 0.008 + norm * 0.032;
      cam.rotation.z += Math.sin(state.drunkPhase * 1.15) * rollAmp + Math.cos(state.drunkPhase * 0.62) * rollAmp * 0.45;
      cam.rotation.x += Math.sin(state.drunkPhase * 0.85 + 1.1) * pitchAmp;
    }

    if (!p) return;

    const car = p.inCar && typeof p.inCar === 'object' ? p.inCar : null;

    // 4A. On-Foot Giang Hồ Hilarious Stumble-Walk Lateral Drift & Upper-Body Wobble
    if (!car && !p.rappelState?.active && !state.isOpen && state.activeStation !== 'dancefloor') {
      const inp = gCtx?.input;
      const moving = Boolean(
        inp && (Math.abs(inp.moveX || 0) > 0.1 || Math.abs(inp.moveY || 0) > 0.1 || inp.forward || inp.backward || inp.left || inp.right)
      );

      if (moving && bac >= 22) {
        state.drunkStumbleTimer -= dt;
        if (state.drunkStumbleTimer <= 0 && bac >= 50) {
          state.drunkStumbleTimer = randRange(2.4, 4.8);
          const lurchAng = (p.yaw || 0) + (Math.random() < 0.5 ? Math.PI * 0.5 : -Math.PI * 0.5);
          const lurchMag = (1.6 + norm * 2.6);
          state.drunkLurchVelX = Math.sin(lurchAng) * lurchMag;
          state.drunkLurchVelZ = Math.cos(lurchAng) * lurchMag;
        }

        state.drunkLurchVelX *= Math.exp(-3.6 * dt);
        state.drunkLurchVelZ *= Math.exp(-3.6 * dt);

        const rightX = Math.cos(p.yaw || 0);
        const rightZ = -Math.sin(p.yaw || 0);
        const weaveSpeed = Math.sin(state.drunkPhase * 1.75) * (0.65 + norm * 1.95);
        const stepX = (rightX * weaveSpeed + state.drunkLurchVelX) * dt;
        const stepZ = (rightZ * weaveSpeed + state.drunkLurchVelZ) * dt;

        if (isWorldStepClearOfWalls(p.x + stepX, p.z + stepZ, p.y || 0, gCtx)) {
          p.x += stepX;
          p.z += stepZ;
          if (p.mesh) {
            p.mesh.position.x = p.x;
            p.mesh.position.z = p.z;
          }
        }
      }

      // Subtle Giang Hồ drunken spine/head tilt on character rig
      const joints = p.rig?.joints;
      if (joints && !p.isAiming) {
        if (joints.spine) {
          joints.spine.rotation.z += Math.sin(state.drunkPhase * 1.4) * 0.14 * norm;
          joints.spine.rotation.x += Math.cos(state.drunkPhase * 0.9) * 0.08 * norm;
        }
        if (joints.head) {
          joints.head.rotation.z += Math.cos(state.drunkPhase * 1.8) * 0.16 * norm;
        }
      }
    }

    // 4B. Drunk Driving Steering Wobble + +1★ Thiên Đình Chấp Pháp DUI Detection!
    if (car && bac >= 28 && !car.isHeli) {
      const spd = Math.hypot(car.vx || 0, car.vz || 0);
      if (spd > 2.2) {
        const wobbleYaw =
          (Math.sin(state.drunkPhase * 2.1) * 0.62 + Math.sin(state.drunkPhase * 3.7 + 0.8) * 0.38) *
          norm *
          clamp(spd / 16, 0.25, 1.15);
        car.yaw = wrapAngle((car.yaw || 0) + wobbleYaw * dt * 1.35);
        const sideX = Math.cos(car.yaw);
        const sideZ = -Math.sin(car.yaw);
        car.vx = (car.vx || 0) + sideX * wobbleYaw * spd * 0.26 * dt;
        car.vz = (car.vz || 0) + sideZ * wobbleYaw * spd * 0.26 * dt;
        if (car.mesh) {
          car.mesh.rotation.y = car.yaw;
        }

        // Check if any Thiên Đình Chấp Pháp foot cop or patrol cruiser spots the erratic drunk swerving!
        if (bac >= 35 && spd > 5.5 && state.duiCooldown <= 0) {
          state.duiCheckTimer -= dt;
          if (state.duiCheckTimer <= 0) {
            state.duiCheckTimer = 0.65;
            let copSpotted = false;
            const cops = gCtx?.gameplay?.cops;
            if (Array.isArray(cops)) {
              for (let i = 0; i < cops.length; i++) {
                const c = cops[i];
                if (c && !c.dead && Math.hypot((c.x || 0) - p.x, (c.z || 0) - p.z) < 38.0) {
                  copSpotted = true;
                  break;
                }
              }
            }
            if (!copSpotted && Array.isArray(gCtx?.vehicles?.list)) {
              for (let i = 0; i < gCtx.vehicles.list.length; i++) {
                const v = gCtx.vehicles.list[i];
                if (v && v !== car && (v.type === 'police' || v.isPolice) && !v.destroyed) {
                  if (Math.hypot((v.x || 0) - p.x, (v.z || 0) - p.z) < 40.0) {
                    copSpotted = true;
                    break;
                  }
                }
              }
            }

            if (copSpotted) {
              state.duiCooldown = 36.0;
              if (typeof gCtx?.gameplay?.addCrimeHeat === 'function') {
                gCtx.gameplay.addCrimeHeat(38, 'DUI');
              }
              if (gCtx?.gameplay?.wanted && gCtx.gameplay.wanted.stars < 1) {
                gCtx.gameplay.wanted.stars = 1;
                gCtx.gameplay.wanted.heat = Math.max(gCtx.gameplay.wanted.heat || 0, 35);
                gCtx.gameplay.wanted.evadeTimer = 20;
              }
              gCtx?.audio?.playWantedChange?.(1);
              notifyClub(
                '🚔 Thiên Đình Chấp Pháp TUÝT CÒI (+1★): Phát hiện lái xe lạng lách khi say rượu (DUI)! Tấp vào lề ngay!',
                4.8,
                gCtx
              );
            }
          }
        }
      }
    }

    // 5. Hilarious Slurred Vietnamese Monologue Quips every ~11s
    if (bac >= 30 && !state.isOpen) {
      state.drunkQuipTimer -= rawDt;
      if (state.drunkQuipTimer <= 0) {
        state.drunkQuipTimer = randRange(10.5, 15.5);
        let qIdx = randInt(0, DRUNK_MONOLOGUE_QUIPS.length - 1);
        if (qIdx === state.lastQuipIndex) qIdx = (qIdx + 1) % DRUNK_MONOLOGUE_QUIPS.length;
        state.lastQuipIndex = qIdx;
        clubAudio.playHiccup();
        gCtx?.ui?.showSubtitle?.(`🥴 *Hức...* "${DRUNK_MONOLOGUE_QUIPS[qIdx]}"`, 4.8);
      }
    }
  }

  // ============================================================================
  // 2. BEAT-SYNCED 4-LANE Nhạc Hội DANCEFLOOR RHYTHM FEVER MINIGAME ('dancefloor')
  // ============================================================================
  function createDancefloorMinigame() {
    const LANE_DEFS = [
      { idx: 0, symbol: '←', keyLabel: 'A / ←', color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.65)' },
      { idx: 1, symbol: '↓', keyLabel: 'S / ↓', color: '#ec4899', glow: 'rgba(236, 72, 153, 0.65)' },
      { idx: 2, symbol: '↑', keyLabel: 'W / ↑', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.65)' },
      { idx: 3, symbol: '→', keyLabel: 'D / →', color: '#fde047', glow: 'rgba(253, 224, 71, 0.65)' }
    ];

    const DIFF_CONFIGS = [
      { id: 0, name: 'Chill Groove', speedBeats: 3.4, density: 0.48, chordChance: 0.05, mult: 1.0 },
      { id: 1, name: 'Túy Tiên Lâu Fever', speedBeats: 2.65, density: 0.72, chordChance: 0.16, mult: 1.5 },
      { id: 2, name: 'DJ God-Mode', speedBeats: 2.05, density: 0.94, chordChance: 0.28, mult: 2.2 }
    ];

    const dState = {
      playing: false,
      difficulty: 1,
      score: 0,
      combo: 0,
      maxCombo: 0,
      hype: 25,
      feverActive: false,
      perfectCount: 0,
      greatCount: 0,
      goodCount: 0,
      missCount: 0,
      sessionStartBeat: 0,
      sessionLengthBeats: 96,
      generatedUpToStep: -1,
      notes: [],
      laneFlash: [0, 0, 0, 0],
      judgementBanner: { text: '', sub: '', color: '#fde047', timer: 0, scale: 1 },
      burstParticles: [],
      lastPhraseBar: -1
    };

    function seedDeterministic(stepIdx, trackIdx) {
      let x = ((stepIdx + 1) * 2654435761 + (trackIdx + 3) * 1013904223) >>> 0;
      x ^= x >>> 15;
      x = Math.imul(x, 2246822519) >>> 0;
      return (x >>> 0) / 4294967296;
    }

    function generateNotesAhead(currentBeats) {
      const diff = DIFF_CONFIGS[dState.difficulty] || DIFF_CONFIGS[1];
      const maxBeat = dState.sessionStartBeat + dState.sessionLengthBeats;
      const horizonBeat = Math.min(maxBeat, currentBeats + diff.speedBeats + 4.0);
      const startStep = Math.max(
        Math.ceil((dState.sessionStartBeat + 2.0) * 2),
        dState.generatedUpToStep + 1
      );
      const endStep = Math.floor(horizonBeat * 2); // 8th-note grid (0.5 beat resolution)

      for (let step = startStep; step <= endStep; step++) {
        dState.generatedUpToStep = step;
        const beatPos = step * 0.5;
        if (beatPos >= maxBeat - 1.0) break;

        const isQuarterBeat = step % 2 === 0;
        const stepInBar = step & 7;
        const r1 = seedDeterministic(step, state.djTrackIndex);
        const r2 = seedDeterministic(step + 997, state.djTrackIndex);

        let shouldSpawn = false;
        if (dState.difficulty === 0) {
          shouldSpawn = isQuarterBeat && (stepInBar === 0 || stepInBar === 4 || r1 < diff.density);
        } else if (dState.difficulty === 1) {
          shouldSpawn = isQuarterBeat ? r1 < 0.88 : r1 < 0.34;
        } else {
          shouldSpawn = isQuarterBeat ? true : r1 < 0.62;
        }

        if (!shouldSpawn) continue;

        const primaryLane = Math.floor(r2 * 4) & 3;
        dState.notes.push({
          id: step * 10 + primaryLane,
          lane: primaryLane,
          targetBeat: beatPos,
          hit: false,
          missed: false
        });

        // Simultaneous 2-hand chord on strong downbeats
        if (isQuarterBeat && (stepInBar === 0 || stepInBar === 4) && r1 < diff.chordChance) {
          const secondLane = (primaryLane + 1 + (step & 1) * 2) & 3;
          dState.notes.push({
            id: step * 10 + secondLane + 4,
            lane: secondLane,
            targetBeat: beatPos,
            hit: false,
            missed: false
          });
        }
      }
    }

    function spawnHitBurst(x, y, colorHex, count = 16) {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.35;
        const spd = 75 + Math.random() * 195;
        dState.burstParticles.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          color: colorHex,
          size: 3 + Math.random() * 3.5,
          life: 0.38 + Math.random() * 0.22
        });
      }
    }

    function showJudgement(label, subText, color) {
      dState.judgementBanner.text = label;
      dState.judgementBanner.sub = subText;
      dState.judgementBanner.color = color;
      dState.judgementBanner.timer = 0.72;
      dState.judgementBanner.scale = 1.32;
    }

    function startSession(gCtx = ctx) {
      clubAudio.unlock(gCtx);
      const beat = clubAudio.getBeatState();
      dState.difficulty = clamp(Number(dom.danceDiffSelect?.value ?? 1) | 0, 0, 2);
      const pickedTrack = clamp(Number(dom.danceTrackSelect?.value ?? state.djTrackIndex) | 0, 0, 2);
      if (pickedTrack !== state.djTrackIndex) {
        switchDjTrack(pickedTrack, gCtx);
      }

      dState.playing = true;
      dState.score = 0;
      dState.combo = 0;
      dState.maxCombo = 0;
      dState.hype = 28;
      dState.feverActive = false;
      dState.perfectCount = 0;
      dState.greatCount = 0;
      dState.goodCount = 0;
      dState.missCount = 0;
      dState.notes = [];
      dState.burstParticles = [];
      dState.sessionStartBeat = Math.ceil(beat.exactBeats);
      dState.sessionLengthBeats = 96;
      dState.generatedUpToStep = -1;
      dState.lastPhraseBar = -1;

      clubStage3D.setPlayerDanceActive(true, clubStage3D.activeDanceMoveIdx, gCtx);
      generateNotesAhead(beat.exactBeats);
      showJudgement('SẴN SÀNG NHẢY!', `${beat.track.shortLabel}`, '#67e8f9');

      if (dom.btnDanceStart) {
        dom.btnDanceStart.textContent = '🔄 CHƠI LẠI TỪ ĐẦU';
      }
      syncDanceSideUI();
    }

    function finishAndRewardSession(gCtx = ctx, manualStop = false) {
      const activeCtx = getActiveCtx(gCtx);
      if (!dState.playing && dState.score <= 0) {
        notifyClub('Hãy bấm BẮT ĐẦU NHẢY và ghi điểm nhịp điệu trước khi nhận thưởng!', 2.8, activeCtx);
        return 0;
      }

      dState.playing = false;
      const diff = DIFF_CONFIGS[dState.difficulty] || DIFF_CONFIGS[1];
      const rawReward = Math.round((dState.score * 0.085 + dState.maxCombo * 14) * diff.mult);
      const cashPrize = dState.score > 0 ? clamp(rawReward, 60, 4800) : 0;
      const popBoost = clamp(Math.round(dState.hype * 0.22), 2, 24);

      if (dState.score > state.totalDanceHighScore) {
        state.totalDanceHighScore = dState.score;
      }
      state.clubPopularity = clamp(state.clubPopularity + popBoost, 0, 100);

      if (cashPrize > 0) {
        addPlayerCash(cashPrize, activeCtx, false);
        state.totalClubEarnings += cashPrize;
        clubAudio.playArcadeWinFanfare();
        clubStage3D.emitGoldenConfetti(CLUB_CENTER_X, 5.8, 1498.0, 55);
        showJudgement(
          manualStop ? 'KẾT THÚC MÀN NHẢY!' : 'HOÀN THÀNH SÀN NHẢY!',
          `Thưởng +${formatCash(cashPrize)} • +${popBoost}% Độ Hot Túy Tiên Lâu!`,
          '#4ade80'
        );
        notifyClub(
          `🕺 Khép lại màn vũ đạo đỉnh cao! Điểm: ${dState.score.toLocaleString('en-US')} • Thưởng *${formatCash(cashPrize)}* & +${popBoost}% Độ Hot!`,
          4.4,
          activeCtx
        );
      }

      dState.score = 0;
      dState.combo = 0;
      if (dom.btnDanceStart) {
        dom.btnDanceStart.textContent = '▶ BẮT ĐẦU NHẢY';
      }
      saveNightlifeState();
      syncDanceSideUI();
      syncHeaderTelemetry(activeCtx);
      return cashPrize;
    }

    function pressLane(laneIdx, gCtx = ctx) {
      const lane = clamp(laneIdx | 0, 0, 3);
      dState.laneFlash[lane] = 1.0;

      if (dom.danceTouchPads[lane]) {
        dom.danceTouchPads[lane].classList.add('pressed');
        setTimeout(() => dom.danceTouchPads[lane]?.classList.remove('pressed'), 110);
      }

      if (!dState.playing) {
        startSession(gCtx);
      }

      const beat = clubAudio.getBeatState();
      const beatSec = beat.beatDur;

      // Find closest unhit note in this lane within 175ms window
      let bestNote = null;
      let bestAbsSec = Infinity;
      for (let i = 0; i < dState.notes.length; i++) {
        const n = dState.notes[i];
        if (n.hit || n.missed || n.lane !== lane) continue;
        const deltaSec = Math.abs(n.targetBeat - beat.exactBeats) * beatSec;
        if (deltaSec < bestAbsSec) {
          bestAbsSec = deltaSec;
          bestNote = n;
        }
      }

      const canvas = dom.danceCanvas;
      const receptorX = canvas ? canvas.width * (0.2 + lane * 0.2) : 200;
      const receptorY = canvas ? canvas.height - 64 : 340;

      if (bestNote && bestAbsSec <= 0.165) {
        bestNote.hit = true;
        dState.combo++;
        if (dState.combo > dState.maxCombo) dState.maxCombo = dState.combo;

        const comboMult = Math.min(8, 1 + Math.floor(dState.combo / 8)) * (dState.feverActive ? 2 : 1);
        if (bestAbsSec <= 0.052) {
          dState.perfectCount++;
          const pts = 300 * comboMult;
          dState.score += pts;
          dState.hype = clamp(dState.hype + 6.2, 0, 100);
          clubAudio.playDanceHit('perfect');
          spawnHitBurst(receptorX, receptorY, '#fde047', 20);
          showJudgement('HOÀN HẢO!!', `+${pts} • Combo ${dState.combo}x`, '#fde047');
        } else if (bestAbsSec <= 0.105) {
          dState.greatCount++;
          const pts = 180 * comboMult;
          dState.score += pts;
          dState.hype = clamp(dState.hype + 3.8, 0, 100);
          clubAudio.playDanceHit('great');
          spawnHitBurst(receptorX, receptorY, '#4ade80', 14);
          showJudgement('TUYỆT VỜI!', `+${pts} • Combo ${dState.combo}x`, '#4ade80');
        } else {
          dState.goodCount++;
          const pts = 90 * comboMult;
          dState.score += pts;
          dState.hype = clamp(dState.hype + 1.6, 0, 100);
          clubAudio.playDanceHit('good');
          spawnHitBurst(receptorX, receptorY, '#38bdf8', 9);
          showJudgement('TỐT!', `+${pts}`, '#38bdf8');
        }

        // Trigger Fever Mode above 80% Túy Tiên Lâu Hype!
        if (!dState.feverActive && dState.hype >= 80) {
          dState.feverActive = true;
          clubStage3D.emitGoldenConfetti(CLUB_CENTER_X, 5.6, 1498.0, 40);
          showJudgement('🔥 BÙNG NỔ FEVER X2!! 🔥', 'Nhân đôi toàn bộ điểm vũ đạo!', '#ec4899');
        }

        // Auto-chain flashy 3D character dance move every 12 combo!
        if (dState.combo > 0 && dState.combo % 12 === 0) {
          const nextMove = (clubStage3D.activeDanceMoveIdx + 1) % DANCE_MOVES.length;
          selectDanceMove(nextMove);
        }
      } else {
        // Early/empty mash penalty (mild)
        dState.combo = 0;
        dState.hype = clamp(dState.hype - 2.5, 0, 100);
        if (dState.hype < 65) dState.feverActive = false;
        clubAudio.playDanceMiss();
        showJudgement('LỆCH NHỊP!', 'Canh vòng sáng chạm đúng tâm!', '#fb7185');
      }

      syncDanceSideUI();
    }

    function selectDanceMove(moveIdx) {
      clubStage3D.setDanceMove(moveIdx);
      dom.danceMoveButtons.forEach((b, i) => {
        b.classList.toggle('active', i === clubStage3D.activeDanceMoveIdx);
      });
    }

    function syncDanceSideUI() {
      if (dom.danceScoreVal) dom.danceScoreVal.textContent = dState.score.toLocaleString('en-US');
      if (dom.danceComboVal) dom.danceComboVal.textContent = `${dState.combo}x`;
      if (dom.danceHypeFill) dom.danceHypeFill.style.width = `${Math.round(dState.hype)}%`;
      if (dom.danceHypePct) {
        dom.danceHypePct.textContent = dState.feverActive
          ? `🔥 FEVER ${Math.round(dState.hype)}%`
          : `${Math.round(dState.hype)}%`;
      }
    }

    function bindDOM(gCtx = ctx) {
      if (!dom.modalRoot) return;
      const moveBox = dom.modalRoot.querySelector('[data-role="dance-moves"]');
      if (moveBox && moveBox.children.length === 0) {
        dom.danceMoveButtons = [];
        for (const mv of DANCE_MOVES) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'nl-tab-btn' + (mv.index === 0 ? ' active' : '');
          btn.style.fontSize = '11.5px';
          btn.style.padding = '6px 9px';
          btn.textContent = `${mv.icon} ${mv.label}`;
          btn.addEventListener('click', () => selectDanceMove(mv.index));
          moveBox.appendChild(btn);
          dom.danceMoveButtons.push(btn);
        }
      }

      dom.btnDanceStart?.addEventListener('click', () => startSession(gCtx));
      dom.btnDanceCashout?.addEventListener('click', () => finishAndRewardSession(gCtx, true));
      dom.danceTrackSelect?.addEventListener('change', () => {
        const idx = clamp(Number(dom.danceTrackSelect.value) | 0, 0, 2);
        switchDjTrack(idx, gCtx);
      });
      dom.danceDiffSelect?.addEventListener('change', () => {
        dState.difficulty = clamp(Number(dom.danceDiffSelect.value) | 0, 0, 2);
      });

      dom.danceTouchPads.forEach((pad, idx) => {
        pad.addEventListener('pointerdown', (ev) => {
          ev.preventDefault();
          pressLane(idx, gCtx);
        });
      });

      dom.danceCanvas?.addEventListener('pointerdown', (ev) => {
        const rect = dom.danceCanvas.getBoundingClientRect();
        if (rect.width <= 0) return;
        const relX = (ev.clientX - rect.left) / rect.width;
        const lane = clamp(Math.floor((relX - 0.1) / 0.2), 0, 3);
        pressLane(lane, gCtx);
      });
    }

    function updateAndRender(rawDt, beat, gCtx = ctx) {
      for (let l = 0; l < 4; l++) {
        dState.laneFlash[l] = Math.max(0, dState.laneFlash[l] - rawDt * 5.2);
      }
      if (dState.judgementBanner.timer > 0) {
        dState.judgementBanner.timer = Math.max(0, dState.judgementBanner.timer - rawDt);
        dState.judgementBanner.scale = damp(dState.judgementBanner.scale, 1.0, 12.0, rawDt);
      }

      // Step Ring Burst Particles
      for (let i = dState.burstParticles.length - 1; i >= 0; i--) {
        const pt = dState.burstParticles[i];
        pt.life -= rawDt;
        if (pt.life <= 0) {
          dState.burstParticles.splice(i, 1);
          continue;
        }
        pt.x += pt.vx * rawDt;
        pt.y += pt.vy * rawDt;
        pt.vy += 240 * rawDt;
      }

      if (dState.playing) {
        generateNotesAhead(beat.exactBeats);

        // Check missed notes past receptor window
        const missWindowBeats = 0.18 / beat.beatDur;
        for (let i = 0; i < dState.notes.length; i++) {
          const n = dState.notes[i];
          if (n.hit || n.missed) continue;
          if (beat.exactBeats - n.targetBeat > missWindowBeats) {
            n.missed = true;
            dState.missCount++;
            dState.combo = 0;
            dState.hype = clamp(dState.hype - 4.2, 0, 100);
            if (dState.hype < 65) dState.feverActive = false;
            showJudgement('TRƯỢT!', 'Mất chuỗi Combo', '#f43f5e');
            syncDanceSideUI();
          }
        }

        // Prune old notes
        if (dState.notes.length > 64) {
          dState.notes = dState.notes.filter((n) => beat.exactBeats - n.targetBeat < 1.2);
        }

        // Auto-finish after 96 beats (~45s full club set)
        if (beat.exactBeats >= dState.sessionStartBeat + dState.sessionLengthBeats + 0.5) {
          finishAndRewardSession(gCtx, false);
        }
      }

      // Render Crisp High-DPI Rhythm Highway Canvas
      const cvs = dom.danceCanvas;
      if (!cvs || state.activeStation !== 'dancefloor') return;
      const g = cvs.getContext('2d');
      if (!g) return;
      const w = cvs.width;
      const h = cvs.height;

      g.clearRect(0, 0, w, h);

      // Translucent Dark Cyber Highway Backdrop
      const bgGrad = g.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, dState.feverActive ? 'rgba(74, 14, 78, 0.72)' : 'rgba(8, 10, 26, 0.72)');
      bgGrad.addColorStop(1, 'rgba(5, 6, 18, 0.88)');
      g.fillStyle = bgGrad;
      g.fillRect(0, 0, w, h);

      // 28-Bar Beat-Synced Túy Tiên Lâu Equalizer Spectrum across Top
      const barCount = 28;
      const eqW = (w - 80) / barCount;
      for (let b = 0; b < barCount; b++) {
        const wave = Math.abs(Math.sin(beat.exactBeats * 3.1 + b * 0.45));
        const kickLift = b < 8 ? beat.kickPulse * 34 : beat.highEnergy * 18;
        const bh = 8 + wave * 24 + kickLift;
        g.fillStyle = b % 2 === 0 ? beat.track.colorHex + 'aa' : beat.track.accentHex + 'aa';
        g.fillRect(40 + b * eqW, 54 - bh, eqW - 3, bh);
      }

      const topY = 66;
      const receptorY = h - 64;
      const diff = DIFF_CONFIGS[dState.difficulty] || DIFF_CONFIGS[1];

      // Draw 4 Perspective Neon Lanes & Receptor Rings
      for (let l = 0; l < 4; l++) {
        const def = LANE_DEFS[l];
        const topX = w * (0.32 + l * 0.12);
        const botX = w * (0.2 + l * 0.2);

        // Lane Beam
        g.strokeStyle = dState.laneFlash[l] > 0.05 ? def.color : 'rgba(148, 163, 184, 0.22)';
        g.lineWidth = dState.laneFlash[l] > 0.05 ? 4 : 1.5;
        g.beginPath();
        g.moveTo(topX, topY);
        g.lineTo(botX, receptorY + 24);
        g.stroke();

        // Receptor Target Ring (pulses on quarter beat!)
        const pulseR = 25 + beat.kickPulse * 4 + dState.laneFlash[l] * 7;
        g.save();
        g.beginPath();
        g.arc(botX, receptorY, pulseR, 0, Math.PI * 2);
        g.fillStyle = dState.laneFlash[l] > 0.05 ? def.glow : 'rgba(15, 23, 42, 0.78)';
        g.fill();
        g.lineWidth = 3.2;
        g.strokeStyle = def.color;
        g.stroke();

        g.fillStyle = '#f8fafc';
        g.font = '900 18px Segoe UI, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(def.symbol, botX, receptorY);
        g.restore();
      }

      // Draw Falling Beat Notes along Perspective Highway
      for (let i = 0; i < dState.notes.length; i++) {
        const n = dState.notes[i];
        if (n.hit || n.missed) continue;
        const beatsUntil = n.targetBeat - beat.exactBeats;
        if (beatsUntil > diff.speedBeats || beatsUntil < -0.25) continue;

        const progress = 1 - beatsUntil / diff.speedBeats; // 0 at topY -> 1 at receptorY
        const def = LANE_DEFS[n.lane];
        const topX = w * (0.32 + n.lane * 0.12);
        const botX = w * (0.2 + n.lane * 0.2);
        const nx = lerp(topX, botX, progress);
        const ny = lerp(topY, receptorY, progress);
        const radius = lerp(11, 25, clamp(progress, 0, 1.1));

        g.save();
        g.beginPath();
        g.arc(nx, ny, radius, 0, Math.PI * 2);
        g.fillStyle = def.color;
        g.shadowColor = def.color;
        g.shadowBlur = 14;
        g.fill();
        g.lineWidth = 2.5;
        g.strokeStyle = '#ffffff';
        g.stroke();

        g.shadowBlur = 0;
        g.fillStyle = '#090d16';
        g.font = `900 ${Math.round(radius * 0.85)}px Segoe UI, sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(def.symbol, nx, ny);
        g.restore();
      }

      // Draw Hit Sparkle Particles
      for (let i = 0; i < dState.burstParticles.length; i++) {
        const pt = dState.burstParticles[i];
        g.fillStyle = pt.color;
        g.globalAlpha = clamp(pt.life * 2.2, 0, 1);
        g.beginPath();
        g.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;

      // Draw Judgement Callout ("HOÀN HẢO! / TUYỆT VỜI! / TRƯỢT!")
      if (dState.judgementBanner.timer > 0) {
        g.save();
        g.translate(w * 0.5, h * 0.44);
        g.scale(dState.judgementBanner.scale, dState.judgementBanner.scale);
        g.textAlign = 'center';
        g.font = '900 30px Segoe UI, sans-serif';
        g.fillStyle = dState.judgementBanner.color;
        g.shadowColor = 'rgba(0,0,0,0.9)';
        g.shadowBlur = 10;
        g.fillText(dState.judgementBanner.text, 0, 0);
        if (dState.judgementBanner.sub) {
          g.font = '700 14px Segoe UI, sans-serif';
          g.fillStyle = '#f8fafc';
          g.fillText(dState.judgementBanner.sub, 0, 24);
        }
        g.restore();
      } else if (!dState.playing) {
        g.save();
        g.textAlign = 'center';
        g.fillStyle = '#f8fafc';
        g.font = '800 20px Segoe UI, sans-serif';
        g.fillText('BẤM [BẮT ĐẦU NHẢY] HOẶC PHÍM W/A/S/D ĐỂ KHUẤY ĐẢO SÀN LED!', w * 0.5, h * 0.46);
        g.font = '600 13px Segoe UI, sans-serif';
        g.fillStyle = '#94a3b8';
        g.fillText(`Kỷ lục điểm cao nhất của bạn: ${state.totalDanceHighScore.toLocaleString('en-US')}`, w * 0.5, h * 0.54);
        g.restore();
      }

      // Progress Bar along Bottom of Dance Canvas
      if (dState.playing) {
        const pct = clamp((beat.exactBeats - dState.sessionStartBeat) / dState.sessionLengthBeats, 0, 1);
        g.fillStyle = 'rgba(255,255,255,0.12)';
        g.fillRect(24, h - 14, w - 48, 6);
        g.fillStyle = dState.feverActive ? '#fde047' : '#ec4899';
        g.fillRect(24, h - 14, (w - 48) * pct, 6);
      }
    }

    return {
      state: dState,
      bindDOM,
      startSession,
      finishAndRewardSession,
      pressLane,
      selectDanceMove,
      updateAndRender,
      get hypeNorm() {
        return clamp(dState.hype / 100, 0, 1);
      }
    };
  }

  const danceGame = createDancefloorMinigame();

  // ============================================================================
  // 3. FULL PHYSICS 8-BALL POOL / BILLIARDS WAGER MINIGAME ('pool_table')
  // ============================================================================
  function createPoolMinigame() {
    const TABLE_W = 920;
    const TABLE_H = 534;
    const RAIL_X = 56;
    const RAIL_Y = 56;
    const PLAY_LEFT = RAIL_X;
    const PLAY_RIGHT = TABLE_W - RAIL_X;
    const PLAY_TOP = RAIL_Y;
    const PLAY_BOT = TABLE_H - RAIL_Y;
    const BALL_R = 11.8;
    const POCKET_R = 23.5;

    const POCKETS = [
      { id: 0, x: PLAY_LEFT - 3, y: PLAY_TOP - 3, name: 'Góc Trái Trên' },
      { id: 1, x: TABLE_W * 0.5, y: PLAY_TOP - 7, name: 'Lỗ Giữa Trên' },
      { id: 2, x: PLAY_RIGHT + 3, y: PLAY_TOP - 3, name: 'Góc Phải Trên' },
      { id: 3, x: PLAY_LEFT - 3, y: PLAY_BOT + 3, name: 'Góc Trái Dưới' },
      { id: 4, x: TABLE_W * 0.5, y: PLAY_BOT + 7, name: 'Lỗ Giữa Dưới' },
      { id: 5, x: PLAY_RIGHT + 3, y: PLAY_BOT + 3, name: 'Góc Phải Dưới' }
    ];

    const BALL_COLORS = {
      0: '#f8fafc',
      1: '#facc15',
      2: '#2563eb',
      3: '#dc2626',
      4: '#7e22ce',
      5: '#ea580c',
      6: '#16a34a',
      7: '#881337',
      8: '#0f172a',
      9: '#facc15',
      10: '#2563eb',
      11: '#dc2626',
      12: '#7e22ce',
      13: '#ea580c',
      14: '#16a34a',
      15: '#881337'
    };

    const AI_HUSTLERS = [
      { id: 0, name: 'Gã Say Billy', errRad: 0.058, powerJitter: 0.14, thinkTime: 1.05 },
      { id: 1, name: 'Tay Cơ Rico', errRad: 0.021, powerJitter: 0.06, thinkTime: 1.15 },
      { id: 2, name: 'Cá Mập Minh Vũ', errRad: 0.0065, powerJitter: 0.025, thinkTime: 1.25 }
    ];

    const pState = {
      matchActive: false,
      matchOver: false,
      wager: 500,
      opponentIdx: 1,
      turn: 'player', // 'player' | 'ai'
      phase: 'aiming', // 'aiming' | 'rolling' | 'ai_thinking' | 'ball_in_hand' | 'game_over'
      tableOpen: true,
      isBreakShot: true,
      playerGroup: null, // 'solids' | 'stripes' | null
      aiGroup: null,
      balls: [],
      droppingAnims: [],
      aimAngle: 0,
      mouseCanvasX: TABLE_W * 0.72,
      mouseCanvasY: TABLE_H * 0.5,
      chargingPower: false,
      dragStartX: 0,
      dragStartY: 0,
      shotPower: 0,
      chargeOscPhase: 0,
      spinX: 0, // -1..1 left/right English
      spinY: 0, // -1..1 back(draw) / top(follow)
      cueSpinArmed: false,
      shotFirstHitId: null,
      shotPottedIds: [],
      shotRailHits: 0,
      aiTimer: 0,
      aiPlannedShot: null,
      statusText: 'Chọn mức cược ($100–$10,000) hoặc ngắm đánh ngay ván Bi-a 8 Bóng!'
    };

    function isSolid(id) {
      return id >= 1 && id <= 7;
    }
    function isStripe(id) {
      return id >= 9 && id <= 15;
    }
    function ballBelongsToGroup(id, grp) {
      if (grp === 'solids') return isSolid(id);
      if (grp === 'stripes') return isStripe(id);
      return false;
    }

    function rackStandard15Balls() {
      pState.balls = [];
      pState.droppingAnims = [];

      const headX = PLAY_LEFT + (PLAY_RIGHT - PLAY_LEFT) * 0.23;
      const centerY = TABLE_H * 0.5;
      pState.balls.push({
        id: 0,
        x: headX,
        y: centerY,
        vx: 0,
        vy: 0,
        potted: false,
        rollPhase: 0,
        rollAxisAngle: 0
      });

      // Official 8-Ball Apex Triangle Rack (8-ball in center of row 3, 1 solid & 1 stripe in back corners)
      const rackOrder = [
        [1],
        [9, 2],
        [10, 8, 3],
        [4, 14, 5, 11],
        [12, 6, 15, 13, 7]
      ];
      const apexX = PLAY_LEFT + (PLAY_RIGHT - PLAY_LEFT) * 0.73;
      const rowStepX = BALL_R * 1.745;
      const colStepY = BALL_R * 2.02;

      for (let r = 0; r < rackOrder.length; r++) {
        const row = rackOrder[r];
        const rx = apexX + r * rowStepX;
        const startY = centerY - ((row.length - 1) * colStepY) * 0.5;
        for (let c = 0; c < row.length; c++) {
          pState.balls.push({
            id: row[c],
            x: rx + (Math.random() - 0.5) * 0.28,
            y: startY + c * colStepY + (Math.random() - 0.5) * 0.28,
            vx: 0,
            vy: 0,
            potted: false,
            rollPhase: Math.random() * 6.28,
            rollAxisAngle: Math.random() * 6.28
          });
        }
      }
    }

    function startNewWagerMatch(paidWager = true, gCtx = ctx) {
      const activeCtx = getActiveCtx(gCtx);
      clubAudio.unlock(activeCtx);

      const rawWager = Number(dom.poolWagerInput?.value ?? pState.wager) || 500;
      const wager = clamp(Math.round(rawWager / 50) * 50, 100, 10000);
      if (dom.poolWagerInput) dom.poolWagerInput.value = String(wager);

      if (paidWager) {
        if (!spendPlayerCash(wager, activeCtx)) {
          notifyClub(`Không đủ tiền đặt cược ván Bi-a (${formatCash(wager)})!`, 3.2, activeCtx);
          clubAudio.playArcadeLoseBuzzer();
          return false;
        }
      }

      pState.wager = paidWager ? wager : 0;
      pState.opponentIdx = clamp(Number(dom.poolOpponentSelect?.value ?? 1) | 0, 0, 2);
      pState.matchActive = true;
      pState.matchOver = false;
      pState.turn = 'player';
      pState.phase = 'aiming';
      pState.tableOpen = true;
      pState.isBreakShot = true;
      pState.playerGroup = null;
      pState.aiGroup = null;
      pState.aimAngle = 0;
      pState.shotPower = 0;
      pState.chargingPower = false;
      pState.spinX = 0;
      pState.spinY = 0;

      rackStandard15Balls();
      const opp = AI_HUSTLERS[pState.opponentIdx];
      pState.statusText = paidWager
        ? `Đã cược ${formatCash(wager)} đấu với ${opp.name}! Bạn quyền Đề-pa khai cuộc!`
        : `Bàn luyện tập miễn phí với ${opp.name} — Mời bạn Đề-pa!`;

      drawSpinControlPad();
      syncPoolUI();
      syncHeaderTelemetry(activeCtx);
      return true;
    }

    function getCueBall() {
      return pState.balls.find((b) => b.id === 0) || null;
    }

    function remainingGroupCount(grp) {
      if (!grp) return 7;
      let count = 0;
      for (const b of pState.balls) {
        if (!b.potted && ballBelongsToGroup(b.id, grp)) count++;
      }
      return count;
    }

    function isCuePlacementValid(x, y) {
      if (x < PLAY_LEFT + BALL_R + 2 || x > PLAY_RIGHT - BALL_R - 2) return false;
      if (y < PLAY_TOP + BALL_R + 2 || y > PLAY_BOT - BALL_R - 2) return false;
      for (const pk of POCKETS) {
        if (Math.hypot(x - pk.x, y - pk.y) < POCKET_R + 4) return false;
      }
      for (const b of pState.balls) {
        if (b.id === 0 || b.potted) continue;
        if (Math.hypot(x - b.x, y - b.y) < BALL_R * 2.12) return false;
      }
      return true;
    }

    function executeCueStrike(angle, powerNorm) {
      const cue = getCueBall();
      if (!cue || cue.potted) return;

      const pwr = clamp(powerNorm, 0.08, 1.0);
      // Subtle drunken cue tremor if BAC > 30%
      let finalAngle = angle;
      if (pState.turn === 'player' && state.drunkLevel > 30) {
        const drunkErr = ((state.drunkLevel - 30) / 70) * 0.055;
        finalAngle += (Math.random() - 0.5) * 2 * drunkErr;
      }

      const maxSpeed = pState.isBreakShot ? 1040 : 890;
      const speed = 135 + pwr * (maxSpeed - 135);

      cue.vx = Math.cos(finalAngle) * speed;
      cue.vy = Math.sin(finalAngle) * speed;

      pState.cueSpinArmed = true;
      pState.shotFirstHitId = null;
      pState.shotPottedIds = [];
      pState.shotRailHits = 0;
      pState.phase = 'rolling';
      pState.chargingPower = false;
      pState.shotPower = 0;

      clubAudio.playCueStrike(pwr);
      syncPoolUI();
    }

    function stepPoolPhysics(rawDt, gCtx = ctx) {
      const dt = clamp(rawDt, 0.001, 0.05);

      // Step Pocket Drop Animations
      for (let i = pState.droppingAnims.length - 1; i >= 0; i--) {
        const da = pState.droppingAnims[i];
        da.t += dt * 3.6;
        if (da.t >= 1) pState.droppingAnims.splice(i, 1);
      }

      if (pState.phase !== 'rolling') return;

      const SUBSTEPS = 8;
      const subDt = dt / SUBSTEPS;
      let anyMoving = false;
      let clackCooldown = 0;

      for (let s = 0; s < SUBSTEPS; s++) {
        if (clackCooldown > 0) clackCooldown -= subDt;

        // 1. Integrate Ball Positions, Cloth Friction & Pocket Capture
        for (let i = 0; i < pState.balls.length; i++) {
          const b = pState.balls[i];
          if (b.potted) continue;

          const spd = Math.hypot(b.vx, b.vy);
          if (spd > 0.01) {
            b.x += b.vx * subDt;
            b.y += b.vy * subDt;
            b.rollPhase = (b.rollPhase + (spd * subDt) / BALL_R) % (Math.PI * 2);
            b.rollAxisAngle = Math.atan2(b.vy, b.vx);

            // Realistic baize rolling + sliding deceleration
            const drag = spd > 180 ? 0.92 : 1.48;
            const decel = Math.max(0, spd - (44 + spd * drag) * subDt);
            const ratio = decel / spd;
            b.vx *= ratio;
            b.vy *= ratio;
            if (decel < 2.2) {
              b.vx = 0;
              b.vy = 0;
            } else {
              anyMoving = true;
            }
          }

          // Check Pocket Capture
          let captured = false;
          for (let p = 0; p < POCKETS.length; p++) {
            const pk = POCKETS[p];
            const dist = Math.hypot(b.x - pk.x, b.y - pk.y);
            if (dist < POCKET_R) {
              b.potted = true;
              b.vx = 0;
              b.vy = 0;
              pState.shotPottedIds.push(b.id);
              pState.droppingAnims.push({
                id: b.id,
                x: b.x,
                y: b.y,
                pkX: pk.x,
                pkY: pk.y,
                t: 0
              });
              clubAudio.playPocketDrop();
              captured = true;
              break;
            }
          }
          if (captured) continue;

          // Cushion Rail Rebound (skip rail segments right inside pocket mouths!)
          const nearSidePocketX = Math.abs(b.x - TABLE_W * 0.5) < POCKET_R * 1.15;
          const nearCornerY = b.y < PLAY_TOP + POCKET_R * 0.95 || b.y > PLAY_BOT - POCKET_R * 0.95;
          const nearCornerX = b.x < PLAY_LEFT + POCKET_R * 0.95 || b.x > PLAY_RIGHT - POCKET_R * 0.95;

          if (!nearCornerY) {
            if (b.x - BALL_R < PLAY_LEFT) {
              b.x = PLAY_LEFT + BALL_R;
              if (b.vx < 0) {
                const hitSpd = Math.abs(b.vx);
                b.vx = -b.vx * 0.81;
                if (b.id === 0 && pState.cueSpinArmed) b.vy += pState.spinX * hitSpd * 0.28;
                pState.shotRailHits++;
                if (clackCooldown <= 0 && hitSpd > 25) {
                  clubAudio.playRailCushion(hitSpd / 550);
                  clackCooldown = 0.025;
                }
              }
            } else if (b.x + BALL_R > PLAY_RIGHT) {
              b.x = PLAY_RIGHT - BALL_R;
              if (b.vx > 0) {
                const hitSpd = Math.abs(b.vx);
                b.vx = -b.vx * 0.81;
                if (b.id === 0 && pState.cueSpinArmed) b.vy -= pState.spinX * hitSpd * 0.28;
                pState.shotRailHits++;
                if (clackCooldown <= 0 && hitSpd > 25) {
                  clubAudio.playRailCushion(hitSpd / 550);
                  clackCooldown = 0.025;
                }
              }
            }
          }

          if (!nearCornerX && !nearSidePocketX) {
            if (b.y - BALL_R < PLAY_TOP) {
              b.y = PLAY_TOP + BALL_R;
              if (b.vy < 0) {
                const hitSpd = Math.abs(b.vy);
                b.vy = -b.vy * 0.81;
                if (b.id === 0 && pState.cueSpinArmed) b.vx -= pState.spinX * hitSpd * 0.28;
                pState.shotRailHits++;
                if (clackCooldown <= 0 && hitSpd > 25) {
                  clubAudio.playRailCushion(hitSpd / 550);
                  clackCooldown = 0.025;
                }
              }
            } else if (b.y + BALL_R > PLAY_BOT) {
              b.y = PLAY_BOT - BALL_R;
              if (b.vy > 0) {
                const hitSpd = Math.abs(b.vy);
                b.vy = -b.vy * 0.81;
                if (b.id === 0 && pState.cueSpinArmed) b.vx += pState.spinX * hitSpd * 0.28;
                pState.shotRailHits++;
                if (clackCooldown <= 0 && hitSpd > 25) {
                  clubAudio.playRailCushion(hitSpd / 550);
                  clackCooldown = 0.025;
                }
              }
            }
          }
        }

        // 2. Pairwise Elastic Ball-on-Ball Collision Resolution + English Spin Transfer
        const minDist = BALL_R * 2;
        for (let i = 0; i < pState.balls.length; i++) {
          const a = pState.balls[i];
          if (a.potted) continue;
          for (let j = i + 1; j < pState.balls.length; j++) {
            const b = pState.balls[j];
            if (b.potted) continue;

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0.0001 && dist < minDist) {
              const nx = dx / dist;
              const ny = dy / dist;
              const overlap = (minDist - dist) * 0.505;
              a.x -= nx * overlap;
              a.y -= ny * overlap;
              b.x += nx * overlap;
              b.y += ny * overlap;

              // Record first object ball contacted by Cue Ball
              if (pState.shotFirstHitId === null && (a.id === 0 || b.id === 0)) {
                pState.shotFirstHitId = a.id === 0 ? b.id : a.id;
              }

              const rvx = a.vx - b.vx;
              const rvy = a.vy - b.vy;
              const velAlongNormal = rvx * nx + rvy * ny;
              if (velAlongNormal > 0) {
                const restitution = 0.945;
                const imp = ((1 + restitution) * velAlongNormal) * 0.5;
                a.vx -= imp * nx;
                a.vy -= imp * ny;
                b.vx += imp * nx;
                b.vy += imp * ny;

                // Apply Top Follow / Back Draw & Side English on first cue impact!
                if (pState.cueSpinArmed && (a.id === 0 || b.id === 0)) {
                  pState.cueSpinArmed = false;
                  const cueObj = a.id === 0 ? a : b;
                  const sign = a.id === 0 ? 1 : -1;
                  const spinImpulse = velAlongNormal * 0.44;
                  cueObj.vx += sign * nx * pState.spinY * spinImpulse - ny * pState.spinX * spinImpulse * 0.35;
                  cueObj.vy += sign * ny * pState.spinY * spinImpulse + nx * pState.spinX * spinImpulse * 0.35;
                }

                if (clackCooldown <= 0 && velAlongNormal > 16) {
                  clubAudio.playBallClack(velAlongNormal / 620);
                  clackCooldown = 0.018;
                }
                anyMoving = true;
              }
            }
          }
        }
      }

      if (!anyMoving) {
        evaluateShotOutcome(gCtx);
      }
    }

    function evaluateShotOutcome(gCtx = ctx) {
      const activeCtx = getActiveCtx(gCtx);
      const shooter = pState.turn;
      const other = shooter === 'player' ? 'ai' : 'player';
      const shooterGrp = shooter === 'player' ? pState.playerGroup : pState.aiGroup;
      const oppName = AI_HUSTLERS[pState.opponentIdx]?.name || 'Đối thủ AI';

      const cuePotted = pState.shotPottedIds.includes(0);
      const eightPotted = pState.shotPottedIds.includes(8);
      const remainingBefore = remainingGroupCount(shooterGrp);
      const onEightBall = !pState.tableOpen && shooterGrp !== null && remainingBefore === 0;

      pState.isBreakShot = false;

      // Respawn cue ball onto table if scratched
      const cue = getCueBall();
      if (cue && cuePotted) {
        cue.potted = false;
        cue.vx = 0;
        cue.vy = 0;
        cue.x = PLAY_LEFT + (PLAY_RIGHT - PLAY_LEFT) * 0.23;
        cue.y = TABLE_H * 0.5;
        while (!isCuePlacementValid(cue.x, cue.y)) {
          cue.x += 14;
          if (cue.x > PLAY_RIGHT - 40) {
            cue.x = PLAY_LEFT + 60;
            cue.y = clamp(cue.y + 24, PLAY_TOP + 30, PLAY_BOT - 30);
          }
        }
      }

      // 1. Check 8-Ball Potted Win / Loss Conditions!
      if (eightPotted) {
        const legalWin = onEightBall && !cuePotted && pState.shotFirstHitId === 8;
        const playerWon = (shooter === 'player' && legalWin) || (shooter === 'ai' && !legalWin);
        finishPoolMatch(playerWon, eightPotted && !legalWin, activeCtx);
        return;
      }

      // 2. Assign Solids vs Stripes if Table is Open and a Colored Ball was Legally Potted
      let assignedNow = false;
      if (pState.tableOpen && !cuePotted && pState.shotFirstHitId !== null && pState.shotFirstHitId !== 8) {
        const firstPottedColor = pState.shotPottedIds.find((id) => id >= 1 && id !== 8);
        if (firstPottedColor) {
          const pickedGrp = isSolid(firstPottedColor) ? 'solids' : 'stripes';
          if (shooter === 'player') {
            pState.playerGroup = pickedGrp;
            pState.aiGroup = pickedGrp === 'solids' ? 'stripes' : 'solids';
          } else {
            pState.aiGroup = pickedGrp;
            pState.playerGroup = pickedGrp === 'solids' ? 'stripes' : 'solids';
          }
          pState.tableOpen = false;
          assignedNow = true;
        }
      }

      // 3. Determine Foul (Cue Scratch, No Contact, or Wrong Group Hit First)
      const activeGrpNow = shooter === 'player' ? pState.playerGroup : pState.aiGroup;
      let foulReason = '';
      if (cuePotted) {
        foulReason = 'Lỗi chết Bi Cái xuống lỗ!';
      } else if (pState.shotFirstHitId === null) {
        foulReason = 'Lỗi đánh trượt không chạm bi nào!';
      } else if (!pState.tableOpen && !assignedNow) {
        if (onEightBall && pState.shotFirstHitId !== 8) {
          foulReason = 'Lỗi phải chạm trực tiếp Bi Số 8!';
        } else if (!onEightBall && !ballBelongsToGroup(pState.shotFirstHitId, activeGrpNow)) {
          foulReason = 'Lỗi chạm bi đối phương trước!';
        }
      }

      if (foulReason) {
        pState.turn = other;
        if (other === 'player') {
          pState.phase = 'ball_in_hand';
          pState.statusText = `${oppName} phạm lỗi (${foulReason}) — Bạn được Đặt Bi Cái Tự Do (Click lên thảm xanh)!`;
        } else {
          placeAiBallInHand();
          pState.phase = 'ai_thinking';
          pState.aiTimer = AI_HUSTLERS[pState.opponentIdx].thinkTime;
          pState.aiPlannedShot = computeSmartAiPoolShot();
          pState.statusText = `${foulReason} — Lượt của ${oppName} (Đặt bi tự do)...`;
        }
        syncPoolUI();
        return;
      }

      // 4. Did Shooter Pot at Least One Legal Ball?
      const pottedOwn = pState.shotPottedIds.some((id) =>
        pState.tableOpen ? id >= 1 && id !== 8 : ballBelongsToGroup(id, activeGrpNow)
      );

      if (pottedOwn) {
        if (shooter === 'player') {
          pState.phase = 'aiming';
          pState.statusText = assignedNow
            ? `Đẳng cấp! Bạn nhận nhóm bi ${pState.playerGroup === 'solids' ? 'TRƠN (1–7)' : 'SỌC (9–15)'} — Tiếp tục cơ của bạn!`
            : 'Ăn bi chuẩn xác! Bạn tiếp tục giữ lượt cơ!';
        } else {
          pState.phase = 'ai_thinking';
          pState.aiTimer = AI_HUSTLERS[pState.opponentIdx].thinkTime;
          pState.aiPlannedShot = computeSmartAiPoolShot();
          pState.statusText = `${oppName} vừa ăn bi đẹp mắt và tiếp tục ngắm cơ tiếp theo...`;
        }
      } else {
        pState.turn = other;
        if (other === 'player') {
          pState.phase = 'aiming';
          pState.statusText = `Tới lượt cơ của bạn! Ngắm chuẩn và giữ Chuột Trái / [SPACE] để ra cơ.`;
        } else {
          pState.phase = 'ai_thinking';
          pState.aiTimer = AI_HUSTLERS[pState.opponentIdx].thinkTime;
          pState.aiPlannedShot = computeSmartAiPoolShot();
          pState.statusText = `Chuyển lượt cho ${oppName} đang tính góc băng...`;
        }
      }

      syncPoolUI();
    }

    function finishPoolMatch(playerWon, byEarlyEight, gCtx = ctx) {
      pState.matchOver = true;
      pState.phase = 'game_over';
      const opp = AI_HUSTLERS[pState.opponentIdx];

      if (playerWon) {
        const payout = pState.wager > 0 ? pState.wager * 2 : 250;
        addPlayerCash(payout, gCtx, false);
        state.totalPoolWins++;
        state.totalClubEarnings += payout;
        state.clubPopularity = clamp(state.clubPopularity + 9, 0, 100);
        clubAudio.playArcadeWinFanfare();
        pState.statusText = `🏆 CHIẾN THẮNG BI-A 8 BÓNG! Bạn hạ gục ${opp.name} và thắng lớn ${formatCash(payout)}!`;
        notifyClub(`🎱 Thắng độ Bi-a 8 Bóng trước ${opp.name}! Nhận thưởng *${formatCash(payout)}*!`, 4.4, gCtx);
      } else {
        clubAudio.playArcadeLoseBuzzer();
        pState.statusText = byEarlyEight
          ? `💥 THUA CUỘC! Đánh rơi Bi Số 8 sai luật — Mất tiền cược ${formatCash(pState.wager)}!`
          : `😤 ${opp.name} đã dọn sạch bàn và ăn Bi Số 8! Bấm Xếp Bóng Mới để phục thù!`;
      }
      saveNightlifeState();
      syncPoolUI();
      syncHeaderTelemetry(gCtx);
    }

    // --- Smart AI Bar Hustler Shot Planner ---
    function isSegmentObstructed(x1, y1, x2, y2, ignoreIdA, ignoreIdB) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1) return false;
      const clearance = BALL_R * 1.96;
      for (const b of pState.balls) {
        if (b.potted || b.id === ignoreIdA || b.id === ignoreIdB) continue;
        const t = clamp(((b.x - x1) * dx + (b.y - y1) * dy) / lenSq, 0, 1);
        const px = x1 + t * dx;
        const py = y1 + t * dy;
        if (Math.hypot(b.x - px, b.y - py) < clearance) return true;
      }
      return false;
    }

    function getLegalAiTargetBalls() {
      if (pState.tableOpen) {
        return pState.balls.filter((b) => !b.potted && b.id >= 1 && b.id !== 8);
      }
      const rem = remainingGroupCount(pState.aiGroup);
      if (rem === 0) {
        return pState.balls.filter((b) => !b.potted && b.id === 8);
      }
      return pState.balls.filter((b) => !b.potted && ballBelongsToGroup(b.id, pState.aiGroup));
    }

    function placeAiBallInHand() {
      const cue = getCueBall();
      if (!cue) return;
      const targets = getLegalAiTargetBalls();
      for (const tb of targets) {
        for (const pk of POCKETS) {
          const ux = (pk.x - tb.x) / Math.max(1, Math.hypot(pk.x - tb.x, pk.y - tb.y));
          const uy = (pk.y - tb.y) / Math.max(1, Math.hypot(pk.x - tb.x, pk.y - tb.y));
          const candX = tb.x - ux * 95;
          const candY = tb.y - uy * 95;
          if (isCuePlacementValid(candX, candY) && !isSegmentObstructed(candX, candY, tb.x, tb.y, 0, tb.id)) {
            cue.x = candX;
            cue.y = candY;
            return;
          }
        }
      }
    }

    function computeSmartAiPoolShot() {
      const cue = getCueBall();
      const opp = AI_HUSTLERS[pState.opponentIdx] || AI_HUSTLERS[1];
      if (!cue) return { angle: 0, power: 0.55 };

      const targets = getLegalAiTargetBalls();
      let bestScore = -Infinity;
      let bestAngle = 0;
      let bestPower = 0.58;

      for (const tb of targets) {
        for (const pk of POCKETS) {
          const toPkX = pk.x - tb.x;
          const toPkY = pk.y - tb.y;
          const distPk = Math.hypot(toPkX, toPkY);
          if (distPk < 1) continue;
          const dirPkX = toPkX / distPk;
          const dirPkY = toPkY / distPk;

          // Exact Ghost Ball impact point
          const ghostX = tb.x - dirPkX * (BALL_R * 2.0);
          const ghostY = tb.y - dirPkY * (BALL_R * 2.0);

          const cueToGhostX = ghostX - cue.x;
          const cueToGhostY = ghostY - cue.y;
          const distCue = Math.hypot(cueToGhostX, cueToGhostY);
          if (distCue < BALL_R) continue;

          const dirCueX = cueToGhostX / distCue;
          const dirCueY = cueToGhostY / distCue;

          // Cut angle alignment cosine (> 0.22 prevents impossible thin back-cuts)
          const cutCos = dirCueX * dirPkX + dirCueY * dirPkY;
          if (cutCos < 0.2) continue;

          const blockedCue = isSegmentObstructed(cue.x, cue.y, ghostX, ghostY, 0, tb.id);
          const blockedPot = isSegmentObstructed(tb.x, tb.y, pk.x, pk.y, tb.id, 0);

          let score = cutCos * 120 - distCue * 0.08 - distPk * 0.1;
          if (blockedCue) score -= 220;
          if (blockedPot) score -= 190;

          if (score > bestScore) {
            bestScore = score;
            bestAngle = Math.atan2(cueToGhostY, cueToGhostX);
            bestPower = clamp(0.36 + (distCue + distPk) / 1350 + (1 - cutCos) * 0.22, 0.3, 0.86);
          }
        }
      }

      // Fallback direct hit on nearest legal target if completely snookered
      if (bestScore < -120 && targets.length > 0) {
        const t0 = targets[0];
        bestAngle = Math.atan2(t0.y - cue.y, t0.x - cue.x);
        bestPower = 0.52;
      }

      const jitterAngle = bestAngle + (Math.random() - 0.5) * 2 * opp.errRad;
      const jitterPower = clamp(bestPower + (Math.random() - 0.5) * opp.powerJitter, 0.25, 0.92);
      return { angle: jitterAngle, power: jitterPower };
    }

    // --- Raycast Aim Preview (Finds Ghost Ball Contact & Deflection Vectors) ---
    function computeAimPreview(cue, angle) {
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      let bestT = 1200;
      let hitBall = null;

      // Check Cushion Wall Distance for Cue Ball Center
      if (dirX > 0.0001) bestT = Math.min(bestT, (PLAY_RIGHT - BALL_R - cue.x) / dirX);
      else if (dirX < -0.0001) bestT = Math.min(bestT, (PLAY_LEFT + BALL_R - cue.x) / dirX);
      if (dirY > 0.0001) bestT = Math.min(bestT, (PLAY_BOT - BALL_R - cue.y) / dirY);
      else if (dirY < -0.0001) bestT = Math.min(bestT, (PLAY_TOP + BALL_R - cue.y) / dirY);

      const twoR = BALL_R * 2;
      for (const b of pState.balls) {
        if (b.id === 0 || b.potted) continue;
        const ocX = b.x - cue.x;
        const ocY = b.y - cue.y;
        const proj = ocX * dirX + ocY * dirY;
        if (proj <= 0) continue;
        const perpSq = ocX * ocX + ocY * ocY - proj * proj;
        if (perpSq >= twoR * twoR) continue;
        const tHit = proj - Math.sqrt(twoR * twoR - perpSq);
        if (tHit > 0 && tHit < bestT) {
          bestT = tHit;
          hitBall = b;
        }
      }

      return {
        ghostX: cue.x + dirX * bestT,
        ghostY: cue.y + dirY * bestT,
        hitBall
      };
    }

    function drawSpinControlPad() {
      const cvs = dom.poolSpinCanvas;
      if (!cvs) return;
      const g = cvs.getContext('2d');
      if (!g) return;
      const w = cvs.width;
      const h = cvs.height;
      const r = w * 0.44;
      const cx = w * 0.5;
      const cy = h * 0.5;

      g.clearRect(0, 0, w, h);
      const grad = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 3, cx, cy, r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.75, '#e2e8f0');
      grad.addColorStop(1, '#94a3b8');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();

      g.strokeStyle = 'rgba(15, 23, 42, 0.25)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(cx - r, cy);
      g.lineTo(cx + r, cy);
      g.moveTo(cx, cy - r);
      g.lineTo(cx, cy + r);
      g.stroke();

      // Red Chalk Contact Reticle (spinY > 0 = top follow => visual Y up!)
      const dotX = cx + pState.spinX * (r * 0.72);
      const dotY = cy - pState.spinY * (r * 0.72);
      g.fillStyle = '#ef4444';
      g.beginPath();
      g.arc(dotX, dotY, 5.5, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 1.5;
      g.stroke();
    }

    function syncPoolUI() {
      if (dom.poolTurnBanner) {
        const oppName = AI_HUSTLERS[pState.opponentIdx]?.name || 'Đối thủ AI';
        const grpLabel = pState.tableOpen
          ? 'Bàn Mở (Chưa phân Trơn / Sọc)'
          : `Bạn: ${pState.playerGroup === 'solids' ? 'Bi Trơn (1–7)' : 'Bi Sọc (9–15)'}`;
        dom.poolTurnBanner.textContent =
          pState.turn === 'player'
            ? `🟢 Lượt của Bạn • ${grpLabel}`
            : `🟠 Lượt của ${oppName} • ${grpLabel}`;
      }
      if (dom.poolGroupPlayer) {
        dom.poolGroupPlayer.textContent = pState.playerGroup
          ? pState.playerGroup === 'solids'
            ? 'Trơn 1–7'
            : 'Sọc 9–15'
          : 'Mở';
      }
      if (dom.poolGroupAi) {
        dom.poolGroupAi.textContent = pState.aiGroup
          ? pState.aiGroup === 'solids'
            ? 'Trơn 1–7'
            : 'Sọc 9–15'
          : 'Mở';
      }
      if (dom.poolStatusMsg) dom.poolStatusMsg.textContent = pState.statusText;
      if (dom.poolPowerFill) dom.poolPowerFill.textContent = `${Math.round(pState.shotPower * 100)}%`;

      // Render remaining target balls in side trays
      const renderTray = (el, grp) => {
        if (!el) return;
        el.innerHTML = '';
        if (!grp) return;
        const targets = pState.balls.filter((b) => !b.potted && ballBelongsToGroup(b.id, grp));
        const list = targets.length > 0 ? targets : pState.balls.filter((b) => !b.potted && b.id === 8);
        for (const b of list) {
          const badge = document.createElement('span');
          badge.className = 'nl-mini-ball';
          badge.style.background = isStripe(b.id)
            ? `linear-gradient(180deg, #fff 22%, ${BALL_COLORS[b.id]} 23%, ${BALL_COLORS[b.id]} 77%, #fff 78%)`
            : BALL_COLORS[b.id];
          badge.style.color = b.id === 8 || b.id === 2 || b.id === 4 || b.id === 7 ? '#ffffff' : '#0f172a';
          badge.textContent = String(b.id);
          el.appendChild(badge);
        }
      };
      renderTray(dom.poolRackTrayPlayer, pState.playerGroup);
      renderTray(dom.poolRackTrayAi, pState.aiGroup);
    }

    function renderPoolBall(g, id, x, y, r, rollPhase = 0) {
      // Soft drop shadow on felt
      g.fillStyle = 'rgba(0, 0, 0, 0.36)';
      g.beginPath();
      g.arc(x + 2.5, y + 3.2, r * 0.98, 0, Math.PI * 2);
      g.fill();

      g.save();
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.clip();

      const col = BALL_COLORS[id] || '#ffffff';
      if (id === 0) {
        g.fillStyle = '#f8fafc';
        g.fillRect(x - r, y - r, r * 2, r * 2);
        // Measles spin dot
        g.fillStyle = '#dc2626';
        g.beginPath();
        g.arc(x + Math.cos(rollPhase) * 4, y + Math.sin(rollPhase) * 4, 2.2, 0, Math.PI * 2);
        g.fill();
      } else if (isStripe(id)) {
        g.fillStyle = '#f8fafc';
        g.fillRect(x - r, y - r, r * 2, r * 2);
        g.save();
        g.translate(x, y);
        g.rotate(rollPhase * 0.6);
        g.fillStyle = col;
        g.fillRect(-r, -r * 0.56, r * 2, r * 1.12);
        g.restore();
      } else {
        g.fillStyle = col;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }

      // Number circle badge
      if (id >= 1) {
        const offX = Math.sin(rollPhase) * 2.4;
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(x + offX, y, r * 0.46, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#090d16';
        g.font = '900 8.5px Segoe UI, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(String(id), x + offX, y + 0.4);
      }

      // Glossy 3D phenolic sphere highlight
      const spec = g.createRadialGradient(x - r * 0.36, y - r * 0.38, 1, x, y, r);
      spec.addColorStop(0, 'rgba(255, 255, 255, 0.62)');
      spec.addColorStop(0.32, 'rgba(255, 255, 255, 0.12)');
      spec.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
      g.fillStyle = spec;
      g.fillRect(x - r, y - r, r * 2, r * 2);

      g.restore();
    }

    function renderPoolTable(animTime) {
      const cvs = dom.poolCanvas;
      if (!cvs || state.activeStation !== 'pool_table') return;
      const g = cvs.getContext('2d');
      if (!g) return;

      // 1. Carved Mahogany Rails & Brushed Brass Corners
      const railGrad = g.createLinearGradient(0, 0, TABLE_W, TABLE_H);
      railGrad.addColorStop(0, '#451a03');
      railGrad.addColorStop(0.5, '#78350f');
      railGrad.addColorStop(1, '#3b1506');
      g.fillStyle = railGrad;
      g.fillRect(0, 0, TABLE_W, TABLE_H);

      // Cushion Bevel Rim
      g.fillStyle = '#064e3b';
      g.fillRect(PLAY_LEFT - 11, PLAY_TOP - 11, PLAY_RIGHT - PLAY_LEFT + 22, PLAY_BOT - PLAY_TOP + 22);

      // Tournament Baize Cloth Surface
      const feltGrad = g.createRadialGradient(TABLE_W * 0.5, TABLE_H * 0.5, 40, TABLE_W * 0.5, TABLE_H * 0.5, 520);
      feltGrad.addColorStop(0, '#10b981');
      feltGrad.addColorStop(0.65, '#047857');
      feltGrad.addColorStop(1, '#065f46');
      g.fillStyle = feltGrad;
      g.fillRect(PLAY_LEFT, PLAY_TOP, PLAY_RIGHT - PLAY_LEFT, PLAY_BOT - PLAY_TOP);

      // Subtle Túy Tiên Lâu Watermark & Head-String Kitchen Line
      const headX = PLAY_LEFT + (PLAY_RIGHT - PLAY_LEFT) * 0.23;
      g.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(headX, PLAY_TOP);
      g.lineTo(headX, PLAY_BOT);
      g.stroke();

      g.fillStyle = 'rgba(255, 255, 255, 0.06)';
      g.font = '900 28px Segoe UI, sans-serif';
      g.textAlign = 'center';
      g.fillText('CLUB ECLIPSE VIP BILLIARDS', TABLE_W * 0.54, TABLE_H * 0.51);

      // 18 Mother-of-Pearl Rail Diamonds
      g.fillStyle = '#fef3c7';
      for (let d = 1; d <= 7; d++) {
        if (d === 4) continue;
        const dx = PLAY_LEFT + ((PLAY_RIGHT - PLAY_LEFT) * d) / 8;
        for (const dy of [RAIL_Y * 0.48, TABLE_H - RAIL_Y * 0.48]) {
          g.beginPath();
          g.arc(dx, dy, 3.2, 0, Math.PI * 2);
          g.fill();
        }
      }
      for (let d = 1; d <= 3; d++) {
        const dy = PLAY_TOP + ((PLAY_BOT - PLAY_TOP) * d) / 4;
        for (const dx of [RAIL_X * 0.48, TABLE_W - RAIL_X * 0.48]) {
          g.beginPath();
          g.arc(dx, dy, 3.2, 0, Math.PI * 2);
          g.fill();
        }
      }

      // 6 Leather Drop Pockets + Brass Rim Castings
      for (const pk of POCKETS) {
        g.fillStyle = '#d97706';
        g.beginPath();
        g.arc(pk.x, pk.y, POCKET_R + 5, 0, Math.PI * 2);
        g.fill();

        g.fillStyle = '#05070d';
        g.beginPath();
        g.arc(pk.x, pk.y, POCKET_R, 0, Math.PI * 2);
        g.fill();
      }

      // Potted Ball Spiral Drop Animations
      for (const da of pState.droppingAnims) {
        const px = lerp(da.x, da.pkX, da.t);
        const py = lerp(da.y, da.pkY, da.t);
        const rScale = Math.max(2, BALL_R * (1 - da.t * 0.78));
        renderPoolBall(g, da.id, px, py, rScale, da.t * 8);
      }

      // Active Balls on Table
      for (const b of pState.balls) {
        if (b.potted) continue;
        if (pState.phase === 'ball_in_hand' && b.id === 0) continue;
        renderPoolBall(g, b.id, b.x, b.y, BALL_R, b.rollPhase);
      }

      const cue = getCueBall();
      // Ball-in-Hand Cursor Preview
      if (pState.phase === 'ball_in_hand' && cue) {
        const cx = clamp(pState.mouseCanvasX, PLAY_LEFT + BALL_R + 3, PLAY_RIGHT - BALL_R - 3);
        const cy = clamp(pState.mouseCanvasY, PLAY_TOP + BALL_R + 3, PLAY_BOT - BALL_R - 3);
        const valid = isCuePlacementValid(cx, cy);
        g.save();
        g.globalAlpha = 0.85;
        renderPoolBall(g, 0, cx, cy, BALL_R, 0);
        g.strokeStyle = valid ? '#4ade80' : '#ef4444';
        g.lineWidth = 2.5;
        g.beginPath();
        g.arc(cx, cy, BALL_R + 4, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      }

      // Aiming Trajectory Line + Ghost Ball + Cue Stick
      if ((pState.phase === 'aiming' || pState.phase === 'ai_thinking') && cue && !cue.potted) {
        let drawAngle = pState.aimAngle;
        let pullPower = pState.shotPower;

        if (pState.phase === 'ai_thinking' && pState.aiPlannedShot) {
          drawAngle = pState.aiPlannedShot.angle;
          pullPower = clamp(1 - pState.aiTimer / 1.2, 0, 1) * pState.aiPlannedShot.power;
        } else if (state.drunkLevel > 30) {
          drawAngle += Math.sin(animTime * 4.2) * ((state.drunkLevel - 30) / 70) * 0.045;
        }

        const preview = computeAimPreview(cue, drawAngle);
        g.save();
        g.setLineDash([7, 6]);
        g.strokeStyle = pState.phase === 'ai_thinking' ? 'rgba(251, 191, 36, 0.55)' : 'rgba(248, 250, 252, 0.72)';
        g.lineWidth = 1.8;
        g.beginPath();
        g.moveTo(cue.x, cue.y);
        g.lineTo(preview.ghostX, preview.ghostY);
        g.stroke();
        g.setLineDash([]);

        // Ghost Ball Circle + Object Ball Target Vector
        g.strokeStyle = 'rgba(103, 232, 249, 0.82)';
        g.lineWidth = 1.8;
        g.beginPath();
        g.arc(preview.ghostX, preview.ghostY, BALL_R, 0, Math.PI * 2);
        g.stroke();

        if (preview.hitBall && pState.phase === 'aiming') {
          const hb = preview.hitBall;
          const nx = (hb.x - preview.ghostX) / Math.max(1, Math.hypot(hb.x - preview.ghostX, hb.y - preview.ghostY));
          const ny = (hb.y - preview.ghostY) / Math.max(1, Math.hypot(hb.x - preview.ghostX, hb.y - preview.ghostY));
          g.strokeStyle = '#fde047';
          g.lineWidth = 2.2;
          g.beginPath();
          g.moveTo(hb.x, hb.y);
          g.lineTo(hb.x + nx * 68, hb.y + ny * 68);
          g.stroke();
        }

        // Sculpted Maple & Carbon Cue Stick pulled back by pullPower
        g.translate(cue.x, cue.y);
        g.rotate(drawAngle + Math.PI);
        const pullback = 18 + pullPower * 78;
        // Leather tip & white ferrule
        g.fillStyle = '#38bdf8';
        g.fillRect(pullback, -2.5, 4, 5);
        g.fillStyle = '#f8fafc';
        g.fillRect(pullback + 4, -2.6, 7, 5.2);
        // Maple shaft
        g.fillStyle = '#fde68a';
        g.fillRect(pullback + 11, -3.2, 115, 6.4);
        // Carbon/ebony butt wrap
        g.fillStyle = '#1e1b4b';
        g.fillRect(pullback + 126, -4.4, 110, 8.8);
        g.restore();
      }
    }

    function bindDOM(gCtx = ctx) {
      rackStandard15Balls();
      drawSpinControlPad();
      syncPoolUI();

      const toTableCoords = (ev) => {
        const rect = dom.poolCanvas.getBoundingClientRect();
        return {
          x: ((ev.clientX - rect.left) / Math.max(1, rect.width)) * TABLE_W,
          y: ((ev.clientY - rect.top) / Math.max(1, rect.height)) * TABLE_H
        };
      };

      dom.poolCanvas?.addEventListener('pointermove', (ev) => {
        const pt = toTableCoords(ev);
        pState.mouseCanvasX = pt.x;
        pState.mouseCanvasY = pt.y;
        const cue = getCueBall();
        if (!cue) return;

        if (pState.phase === 'aiming' && pState.turn === 'player') {
          if (pState.chargingPower) {
            const pullDist = Math.hypot(pt.x - pState.dragStartX, pt.y - pState.dragStartY);
            if (pullDist > 8) {
              pState.shotPower = clamp(pullDist / 145, 0.08, 1.0);
              if (dom.poolPowerFill) dom.poolPowerFill.textContent = `${Math.round(pState.shotPower * 100)}%`;
            }
          } else {
            pState.aimAngle = Math.atan2(pt.y - cue.y, pt.x - cue.x);
          }
        }
      });

      dom.poolCanvas?.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        clubAudio.unlock(gCtx);
        const pt = toTableCoords(ev);
        pState.mouseCanvasX = pt.x;
        pState.mouseCanvasY = pt.y;

        if (pState.phase === 'ball_in_hand' && pState.turn === 'player') {
          const cue = getCueBall();
          if (cue && isCuePlacementValid(pt.x, pt.y)) {
            cue.x = pt.x;
            cue.y = pt.y;
            pState.phase = 'aiming';
            pState.statusText = 'Đã đặt Bi Cái! Ngắm mục tiêu và giữ Chuột Trái / [SPACE] để ra cơ!';
            syncPoolUI();
          }
          return;
        }

        if (pState.phase === 'aiming' && pState.turn === 'player') {
          const cue = getCueBall();
          if (cue && !pState.chargingPower) {
            pState.aimAngle = Math.atan2(pt.y - cue.y, pt.x - cue.x);
          }
          pState.chargingPower = true;
          pState.dragStartX = pt.x;
          pState.dragStartY = pt.y;
          pState.shotPower = 0.18;
          pState.chargeOscPhase = 0;
        }
      });

      window.addEventListener('pointerup', () => {
        if (state.activeStation !== 'pool_table') return;
        if (pState.chargingPower && pState.phase === 'aiming' && pState.turn === 'player') {
          executeCueStrike(pState.aimAngle, Math.max(0.14, pState.shotPower));
        }
      });

      // Cue Ball Spin ("English") Pad Interaction
      dom.poolSpinCanvas?.addEventListener('pointerdown', (ev) => {
        const rect = dom.poolSpinCanvas.getBoundingClientRect();
        const nx = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
        const ny = 1 - ((ev.clientY - rect.top) / Math.max(1, rect.height)) * 2;
        const mag = Math.hypot(nx, ny);
        const scale = mag > 0.85 ? 0.85 / mag : 1;
        pState.spinX = nx * scale;
        pState.spinY = ny * scale;
        drawSpinControlPad();
      });

      dom.btnPoolResetSpin?.addEventListener('click', () => {
        pState.spinX = 0;
        pState.spinY = 0;
        drawSpinControlPad();
      });

      dom.btnPoolNewMatch?.addEventListener('click', () => startNewWagerMatch(true, gCtx));
    }

    function updateAndRender(rawDt, animTime, gCtx = ctx) {
      if (state.activeStation !== 'pool_table') return;

      // Auto-oscillate power meter gently if holding click without dragging mouse
      if (pState.chargingPower && pState.phase === 'aiming') {
        const dragMoved = Math.hypot(pState.mouseCanvasX - pState.dragStartX, pState.mouseCanvasY - pState.dragStartY);
        if (dragMoved <= 10) {
          pState.chargeOscPhase += rawDt * 2.3;
          pState.shotPower = 0.12 + Math.abs(Math.sin(pState.chargeOscPhase)) * 0.88;
          if (dom.poolPowerFill) dom.poolPowerFill.textContent = `${Math.round(pState.shotPower * 100)}%`;
        }
      }

      if (pState.phase === 'ai_thinking') {
        pState.aiTimer -= rawDt;
        if (pState.aiTimer <= 0 && pState.aiPlannedShot) {
          executeCueStrike(pState.aiPlannedShot.angle, pState.aiPlannedShot.power);
        }
      }

      stepPoolPhysics(rawDt, gCtx);
      renderPoolTable(animTime);
    }

    return {
      state: pState,
      bindDOM,
      startNewWagerMatch,
      executeCueStrike,
      updateAndRender
    };
  }

  const poolGame = createPoolMinigame();

  // ============================================================================
  // 4. INTERACTIVE 301 & CRICKET PUB DARTS WAGER MINIGAME ('darts_board')
  // ============================================================================
  function createDartsMinigame() {
    const CANVAS_W = 600;
    const CANVAS_H = 520;
    const BOARD_CX = 276;
    const BOARD_CY = 260;

    // Regulation Dartboard Radii (px)
    const R_INNER_BULL = 11.5;
    const R_OUTER_BULL = 26.5;
    const R_TRIPLE_IN = 103;
    const R_TRIPLE_OUT = 119;
    const R_DOUBLE_IN = 180;
    const R_DOUBLE_OUT = 197;
    const R_CABINET = 232;

    const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
    const CRICKET_NUMS = [20, 19, 18, 17, 16, 15, 25];

    const AI_DARTERS = [
      { id: 0, name: 'Bợm Nhậu Trevor Jr.', spreadPx: 38, bullBias: 0.2 },
      { id: 1, name: 'Xạ Thủ Cầu Cảng Dutch', spreadPx: 19, bullBias: 0.45 },
      { id: 2, name: 'Vua Phi Tiêu Anh Quốc Phil', spreadPx: 9.5, bullBias: 0.78 }
    ];

    const dtState = {
      matchActive: false,
      matchOver: false,
      mode: '301', // '301' | 'cricket'
      wager: 300,
      opponentIdx: 1,
      turn: 'player', // 'player' | 'ai'
      dartsLeft: 3,
      playerScore: 301,
      aiScore: 301,
      turnStartScore: 301,
      turnTotalScored: 0,
      cricketMarks: {
        player: { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 },
        ai: { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 }
      },
      baseAimX: BOARD_CX,
      baseAimY: BOARD_CY - 111, // Default aimed near Triple 20!
      liveCrossX: BOARD_CX,
      liveCrossY: BOARD_CY - 111,
      swayTime: 0,
      charging: false,
      powerMeter: 0, // 0..1 (sweet spot at 0.78)
      powerDir: 1,
      lockedAimX: BOARD_CX,
      lockedAimY: BOARD_CY,
      flyingDart: null, // { fromX, fromY, toX, toY, prog }
      stuckDarts: [], // { x, y, owner, label }
      callout: { text: '', color: '#fde047', timer: 0 },
      aiThrowTimer: 0
    };

    function getSectorCenterCoords(sectorVal, ringType = 'single') {
      if (sectorVal === 50) return { x: BOARD_CX, y: BOARD_CY };
      if (sectorVal === 25) return { x: BOARD_CX + 16, y: BOARD_CY };
      const idx = SECTORS.indexOf(sectorVal);
      if (idx < 0) return { x: BOARD_CX, y: BOARD_CY };
      const ang = -Math.PI * 0.5 + idx * ((Math.PI * 2) / 20);
      const r =
        ringType === 'triple'
          ? (R_TRIPLE_IN + R_TRIPLE_OUT) * 0.5
          : ringType === 'double'
          ? (R_DOUBLE_IN + R_DOUBLE_OUT) * 0.5
          : (R_OUTER_BULL + R_TRIPLE_IN) * 0.55;
      return {
        x: BOARD_CX + Math.cos(ang) * r,
        y: BOARD_CY + Math.sin(ang) * r
      };
    }

    function evaluateDartboardHit(x, y) {
      const dx = x - BOARD_CX;
      const dy = y - BOARD_CY;
      const r = Math.hypot(dx, dy);

      if (r <= R_INNER_BULL) {
        return { points: 50, baseVal: 25, mult: 2, isBull: true, label: 'HỒNG TÂM ĐÔI! (50)' };
      }
      if (r <= R_OUTER_BULL) {
        return { points: 25, baseVal: 25, mult: 1, isBull: true, label: 'HỒNG TÂM ĐƠN (25)' };
      }
      if (r > R_DOUBLE_OUT) {
        return { points: 0, baseVal: 0, mult: 0, isBull: false, label: 'TRƯỢT NGOÀI BẢNG! (0)' };
      }

      // Clockwise angle from top (-PI/2), offset by half-sector (9 deg = PI/20)
      let degFromTop = ((Math.atan2(dy, dx) + Math.PI * 0.5 + Math.PI / 20) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const sectorIdx = Math.floor(degFromTop / (Math.PI / 10)) % 20;
      const val = SECTORS[sectorIdx];

      if (r >= R_TRIPLE_IN && r <= R_TRIPLE_OUT) {
        return { points: val * 3, baseVal: val, mult: 3, isBull: false, label: `NHÂN BA T${val}! (+${val * 3})` };
      }
      if (r >= R_DOUBLE_IN && r <= R_DOUBLE_OUT) {
        return { points: val * 2, baseVal: val, mult: 2, isBull: false, label: `NHÂN ĐÔI D${val}! (+${val * 2})` };
      }
      return { points: val, baseVal: val, mult: 1, isBull: false, label: `Ô ${val} (+${val})` };
    }

    function startNewDartsMatch(paidWager = true, gCtx = ctx) {
      const activeCtx = getActiveCtx(gCtx);
      clubAudio.unlock(activeCtx);

      const rawWager = Number(dom.dartsWagerInput?.value ?? dtState.wager) || 300;
      const wager = clamp(Math.round(rawWager / 50) * 50, 100, 5000);
      if (dom.dartsWagerInput) dom.dartsWagerInput.value = String(wager);

      if (paidWager && !spendPlayerCash(wager, activeCtx)) {
        notifyClub(`Không đủ tiền mặt đặt cược Phi Tiêu (${formatCash(wager)})!`, 3.2, activeCtx);
        clubAudio.playArcadeLoseBuzzer();
        return false;
      }

      dtState.mode = dom.dartsModeSelect?.value === 'cricket' ? 'cricket' : '301';
      dtState.opponentIdx = clamp(Number(dom.dartsOpponentSelect?.value ?? 1) | 0, 0, 2);
      dtState.wager = paidWager ? wager : 0;
      dtState.matchActive = true;
      dtState.matchOver = false;
      dtState.turn = 'player';
      dtState.dartsLeft = 3;
      dtState.turnTotalScored = 0;
      dtState.stuckDarts = [];
      dtState.flyingDart = null;
      dtState.charging = false;

      if (dtState.mode === '301') {
        dtState.playerScore = 301;
        dtState.aiScore = 301;
        dtState.turnStartScore = 301;
      } else {
        dtState.playerScore = 0;
        dtState.aiScore = 0;
        for (const num of CRICKET_NUMS) {
          dtState.cricketMarks.player[num] = 0;
          dtState.cricketMarks.ai[num] = 0;
        }
      }

      const opp = AI_DARTERS[dtState.opponentIdx];
      showDartCallout(`KHAI CUỘC ${dtState.mode.toUpperCase()} VS ${opp.name.toUpperCase()}!`, '#67e8f9');
      syncDartsUI();
      syncHeaderTelemetry(activeCtx);
      return true;
    }

    function showDartCallout(text, color = '#fde047') {
      dtState.callout.text = text;
      dtState.callout.color = color;
      dtState.callout.timer = 1.25;
    }

    function launchDartToward(targetX, targetY, owner) {
      clubAudio.playDartThrow();
      dtState.flyingDart = {
        owner,
        fromX: BOARD_CX + (owner === 'player' ? 40 : -40),
        fromY: CANVAS_H + 30,
        toX: clamp(targetX, 18, CANVAS_W - 70),
        toY: clamp(targetY, 18, CANVAS_H - 18),
        prog: 0
      };
    }

    function beginPlayerCharge() {
      if (dtState.matchOver || dtState.turn !== 'player' || dtState.flyingDart || dtState.dartsLeft <= 0) return;
      dtState.charging = true;
      dtState.powerMeter = 0.08;
      dtState.powerDir = 1;
      dtState.lockedAimX = dtState.liveCrossX;
      dtState.lockedAimY = dtState.liveCrossY;
    }

    function releasePlayerCharge() {
      if (!dtState.charging) return;
      dtState.charging = false;

      // Sweet spot is at powerMeter = 0.78!
      const sweetDiff = dtState.powerMeter - 0.78;
      // Underpower drops dart downward (+Y); Overpower kicks dart upward (-Y)
      const verticalOffset = -sweetDiff * 145;
      const drunkScatter = state.drunkLevel > 30 ? ((state.drunkLevel - 30) / 70) * 24 : 2.5;
      const hitX = dtState.lockedAimX + (Math.random() - 0.5) * 2 * drunkScatter;
      const hitY = dtState.lockedAimY + verticalOffset + (Math.random() - 0.5) * drunkScatter;

      launchDartToward(hitX, hitY, 'player');
    }

    function applyLandedDart(x, y, owner, gCtx = ctx) {
      const activeCtx = getActiveCtx(gCtx);
      const res = evaluateDartboardHit(x, y);
      dtState.stuckDarts.push({ x, y, owner, label: res.label });
      dtState.dartsLeft--;

      clubAudio.playDartThwack(res.mult, res.isBull);

      if (dtState.mode === '301') {
        const curScore = owner === 'player' ? dtState.playerScore : dtState.aiScore;
        const nextScore = curScore - res.points;

        if (nextScore === 0) {
          if (owner === 'player') dtState.playerScore = 0;
          else dtState.aiScore = 0;
          finishDartsMatch(owner === 'player', activeCtx);
          return;
        }

        if (nextScore < 0) {
          // BUST! Score reverts to start of turn and turn ends immediately
          if (owner === 'player') dtState.playerScore = dtState.turnStartScore;
          else dtState.aiScore = dtState.turnStartScore;
          showDartCallout(`QUÁ ĐIỂM (BUST)! Quay về ${dtState.turnStartScore}`, '#f43f5e');
          dtState.dartsLeft = 0;
        } else {
          if (owner === 'player') dtState.playerScore = nextScore;
          else dtState.aiScore = nextScore;
          dtState.turnTotalScored += res.points;
          if (dtState.dartsLeft === 0 && dtState.turnTotalScored === 180) {
            showDartCallout('🔥 ONE HUNDRED AND EIGHTY!! (180) 🔥', '#fde047');
          } else {
            showDartCallout(res.label, res.mult >= 2 || res.isBull ? '#fde047' : '#e2e8f0');
          }
        }
      } else {
        // Cricket Rules (Numbers 20, 19, 18, 17, 16, 15 & Bull=25)
        const targetKey = res.isBull ? 25 : res.baseVal;
        if (CRICKET_NUMS.includes(targetKey) && res.mult > 0) {
          const myMarks = dtState.cricketMarks[owner];
          const oppMarks = dtState.cricketMarks[owner === 'player' ? 'ai' : 'player'];
          const prev = myMarks[targetKey] || 0;
          const totalMarks = prev + res.mult;
          myMarks[targetKey] = Math.min(3, totalMarks);

          const overflow = Math.max(0, totalMarks - 3);
          if (overflow > 0 && (oppMarks[targetKey] || 0) < 3) {
            const pts = overflow * targetKey;
            if (owner === 'player') dtState.playerScore += pts;
            else dtState.aiScore += pts;
            showDartCallout(`KHÓA Ô ${targetKey === 25 ? 'BULL' : targetKey} • +${pts} ĐIỂM!`, '#4ade80');
          } else {
            showDartCallout(res.label, '#67e8f9');
          }

          // Check Cricket Victory: All 7 targets closed (>= 3 marks) AND score >= opponent!
          const allClosed = CRICKET_NUMS.every((n) => (myMarks[n] || 0) >= 3);
          const myPts = owner === 'player' ? dtState.playerScore : dtState.aiScore;
          const theirPts = owner === 'player' ? dtState.aiScore : dtState.playerScore;
          if (allClosed && myPts >= theirPts) {
            finishDartsMatch(owner === 'player', activeCtx);
            return;
          }
        } else {
          showDartCallout(res.points > 0 ? `${res.label} (Ngoài ô Cricket)` : 'TRƯỢT BẢNG!', '#94a3b8');
        }
      }

      // Advance Turn if 0 darts left
      if (dtState.dartsLeft <= 0 && !dtState.matchOver) {
        setTimeout(() => {
          if (dtState.matchOver) return;
          dtState.stuckDarts = [];
          dtState.turn = owner === 'player' ? 'ai' : 'player';
          dtState.dartsLeft = 3;
          dtState.turnTotalScored = 0;
          dtState.turnStartScore = dtState.turn === 'player' ? dtState.playerScore : dtState.aiScore;
          if (dtState.turn === 'ai') {
            dtState.aiThrowTimer = 0.85;
          }
          syncDartsUI();
        }, 680);
      }

      syncDartsUI();
    }

    function finishDartsMatch(playerWon, gCtx = ctx) {
      dtState.matchOver = true;
      const opp = AI_DARTERS[dtState.opponentIdx];
      if (playerWon) {
        const payout = dtState.wager > 0 ? dtState.wager * 2 : 200;
        addPlayerCash(payout, gCtx, false);
        state.totalDartsWins++;
        state.totalClubEarnings += payout;
        state.clubPopularity = clamp(state.clubPopularity + 8, 0, 100);
        clubAudio.playArcadeWinFanfare();
        showDartCallout(`🏆 THẮNG TRẬN! +${formatCash(payout)}!`, '#4ade80');
        notifyClub(`🎯 Hạ gục ${opp.name} ở bộ môn Phi Tiêu! Thắng cược *${formatCash(payout)}*!`, 4.4, gCtx);
      } else {
        clubAudio.playArcadeLoseBuzzer();
        showDartCallout(`😤 ${opp.name.toUpperCase()} VỀ ĐÍCH TRƯỚC!`, '#fb7185');
      }
      saveNightlifeState();
      syncDartsUI();
      syncHeaderTelemetry(gCtx);
    }

    function computeAiDartTarget() {
      const opp = AI_DARTERS[dtState.opponentIdx] || AI_DARTERS[1];
      let ideal = getSectorCenterCoords(20, 'triple');

      if (dtState.mode === '301') {
        const rem = dtState.aiScore;
        if (rem === 50) {
          ideal = getSectorCenterCoords(50);
        } else if (rem === 25) {
          ideal = getSectorCenterCoords(25);
        } else if (rem <= 20) {
          ideal = getSectorCenterCoords(rem, 'single');
        } else if (rem <= 40 && rem % 2 === 0) {
          ideal = getSectorCenterCoords(rem / 2, 'double');
        } else if (rem <= 60 && rem % 3 === 0) {
          ideal = getSectorCenterCoords(rem / 3, 'triple');
        } else {
          ideal = getSectorCenterCoords(20, 'triple');
        }
      } else {
        // Cricket Strategy: Close highest open number (20 -> 15 -> Bull), or score on unclosed player number
        let chosen = 20;
        let ring = 'triple';
        for (const num of CRICKET_NUMS) {
          if ((dtState.cricketMarks.ai[num] || 0) < 3) {
            chosen = num;
            ring = num === 25 ? 'bull' : 'triple';
            break;
          }
        }
        ideal = chosen === 25 ? getSectorCenterCoords(50) : getSectorCenterCoords(chosen, ring);
      }

      return {
        x: ideal.x + (Math.random() - 0.5) * 2 * opp.spreadPx,
        y: ideal.y + (Math.random() - 0.5) * 2 * opp.spreadPx
      };
    }

    function syncDartsUI() {
      if (dom.dartsPlayerScore) dom.dartsPlayerScore.textContent = String(dtState.playerScore);
      if (dom.dartsAiScore) dom.dartsAiScore.textContent = String(dtState.aiScore);
      if (dom.dartsDrunkWarn) {
        const showWarn = state.drunkLevel > 30;
        dom.dartsDrunkWarn.style.display = showWarn ? 'block' : 'none';
        if (showWarn) {
          dom.dartsDrunkWarn.textContent = `🍺 Tay đang lảo đảo mạnh vì nồng độ cồn ${Math.round(state.drunkLevel)}%!`;
        }
      }
      if (dom.dartsTurnInfo) {
        const oppName = AI_DARTERS[dtState.opponentIdx]?.name || 'Đối thủ AI';
        if (dtState.matchOver) {
          dom.dartsTurnInfo.innerHTML = 'Ván đấu kết thúc! Bấm <b>Bắt Đầu Trận Phi Tiêu Mới</b> để tái đấu.';
        } else if (dtState.turn === 'player') {
          dom.dartsTurnInfo.innerHTML = `🟢 Lượt của bạn • Còn <b>${dtState.dartsLeft}</b> phi tiêu • Giữ Chuột Trái / [SPACE] thả ở vạch Xanh!`;
        } else {
          dom.dartsTurnInfo.innerHTML = `🟠 ${escapeHtml(oppName)} đang ném (còn <b>${dtState.dartsLeft}</b> tiêu)...`;
        }
      }

      if (dom.dartsCricketGrid) {
        if (dtState.mode !== 'cricket') {
          dom.dartsCricketGrid.style.display = 'none';
        } else {
          dom.dartsCricketGrid.style.display = 'block';
          const markSym = (m) => (m >= 3 ? '⊗' : m === 2 ? '✕' : m === 1 ? '╱' : '·');
          let html = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;text-align:center;gap:3px;background:rgba(9,13,26,0.85);padding:6px;border-radius:8px;">';
          html += '<b style="color:#38bdf8;">Bạn</b><b style="color:#fde047;">Mục Tiêu</b><b style="color:#fb7185;">AI</b>';
          for (const num of CRICKET_NUMS) {
            const lbl = num === 25 ? 'BULL' : String(num);
            html += `<span>${markSym(dtState.cricketMarks.player[num])}</span><b>${lbl}</b><span>${markSym(dtState.cricketMarks.ai[num])}</span>`;
          }
          html += '</div>';
          dom.dartsCricketGrid.innerHTML = html;
        }
      }
    }

    function renderDartboardCanvas() {
      const cvs = dom.dartsCanvas;
      if (!cvs || state.activeStation !== 'darts_board') return;
      const g = cvs.getContext('2d');
      if (!g) return;

      g.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // 1. Outer Black Sisal Number Ring Cabinet
      g.fillStyle = '#090b10';
      g.beginPath();
      g.arc(BOARD_CX, BOARD_CY, R_CABINET, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = 5;
      g.strokeStyle = '#b45309';
      g.stroke();

      // 2. Draw 20 Alternating Sisal Wedges + Red/Green Double & Triple Rings
      const sliceRad = (Math.PI * 2) / 20;
      for (let i = 0; i < 20; i++) {
        const a0 = -Math.PI * 0.5 - sliceRad * 0.5 + i * sliceRad;
        const a1 = a0 + sliceRad;
        const isDark = i % 2 === 0;
        const singleCol = isDark ? '#14161f' : '#f5ebd6';
        const ringCol = isDark ? '#dc2626' : '#16a34a';

        // Double Ring (Outer)
        g.fillStyle = ringCol;
        g.beginPath();
        g.moveTo(BOARD_CX, BOARD_CY);
        g.arc(BOARD_CX, BOARD_CY, R_DOUBLE_OUT, a0, a1);
        g.closePath();
        g.fill();

        // Outer Single
        g.fillStyle = singleCol;
        g.beginPath();
        g.moveTo(BOARD_CX, BOARD_CY);
        g.arc(BOARD_CX, BOARD_CY, R_DOUBLE_IN, a0, a1);
        g.closePath();
        g.fill();

        // Triple Ring
        g.fillStyle = ringCol;
        g.beginPath();
        g.moveTo(BOARD_CX, BOARD_CY);
        g.arc(BOARD_CX, BOARD_CY, R_TRIPLE_OUT, a0, a1);
        g.closePath();
        g.fill();

        // Inner Single
        g.fillStyle = singleCol;
        g.beginPath();
        g.moveTo(BOARD_CX, BOARD_CY);
        g.arc(BOARD_CX, BOARD_CY, R_TRIPLE_IN, a0, a1);
        g.closePath();
        g.fill();

        // Spider Wire Radial Divider
        g.strokeStyle = 'rgba(203, 213, 225, 0.65)';
        g.lineWidth = 1.1;
        g.beginPath();
        g.moveTo(BOARD_CX + Math.cos(a0) * R_OUTER_BULL, BOARD_CY + Math.sin(a0) * R_OUTER_BULL);
        g.lineTo(BOARD_CX + Math.cos(a0) * R_DOUBLE_OUT, BOARD_CY + Math.sin(a0) * R_DOUBLE_OUT);
        g.stroke();

        // Crisp Metallic Sector Number
        const midA = a0 + sliceRad * 0.5;
        const nx = BOARD_CX + Math.cos(midA) * 214;
        const ny = BOARD_CY + Math.sin(midA) * 214;
        g.fillStyle = '#f8fafc';
        g.font = '900 15px Segoe UI, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(String(SECTORS[i]), nx, ny);
      }

      // 3. Outer Green Bull (25) & Inner Crimson Bullseye (50)
      g.fillStyle = '#16a34a';
      g.beginPath();
      g.arc(BOARD_CX, BOARD_CY, R_OUTER_BULL, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#e2e8f0';
      g.lineWidth = 1.3;
      g.stroke();

      g.fillStyle = '#dc2626';
      g.beginPath();
      g.arc(BOARD_CX, BOARD_CY, R_INNER_BULL, 0, Math.PI * 2);
      g.fill();
      g.stroke();

      // 4. Stuck Steel-Tip Phi Tiêu with Cast Shadows & Tail Flights
      for (const d of dtState.stuckDarts) {
        const flightCol = d.owner === 'player' ? '#06b6d4' : '#f43f5e';
        // Shadow
        g.strokeStyle = 'rgba(0,0,0,0.55)';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(d.x, d.y);
        g.lineTo(d.x + 16, d.y + 18);
        g.stroke();

        // Barrel & Flight Fins
        g.strokeStyle = '#e2e8f0';
        g.lineWidth = 2.6;
        g.beginPath();
        g.moveTo(d.x, d.y);
        g.lineTo(d.x + 9, d.y - 13);
        g.stroke();

        g.fillStyle = flightCol;
        g.beginPath();
        g.arc(d.x + 10, d.y - 14, 5.5, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#ffffff';
        g.lineWidth = 1.2;
        g.stroke();
      }

      // 5. Flying Dart Perspective Arc
      if (dtState.flyingDart) {
        const fd = dtState.flyingDart;
        const p = fd.prog;
        const arcLift = Math.sin(p * Math.PI) * 52;
        const fx = lerp(fd.fromX, fd.toX, p);
        const fy = lerp(fd.fromY, fd.toY, p) - arcLift;
        const scale = lerp(2.2, 1.0, p);

        g.save();
        g.translate(fx, fy);
        g.scale(scale, scale);
        g.fillStyle = fd.owner === 'player' ? '#06b6d4' : '#f43f5e';
        g.beginPath();
        g.moveTo(0, -12);
        g.lineTo(-7, 6);
        g.lineTo(7, 6);
        g.closePath();
        g.fill();
        g.restore();
      }

      // 6. Swaying Hand Crosshair (with Double-Vision Ghost Reticle if Drunk > 30%!)
      if (!dtState.matchOver && dtState.turn === 'player' && !dtState.flyingDart) {
        const cx = dtState.charging ? dtState.lockedAimX : dtState.liveCrossX;
        const cy = dtState.charging ? dtState.lockedAimY : dtState.liveCrossY;

        if (state.drunkLevel > 30) {
          const ghostOff = ((state.drunkLevel - 30) / 70) * 18;
          g.strokeStyle = 'rgba(236, 72, 153, 0.48)';
          g.lineWidth = 1.8;
          g.beginPath();
          g.arc(cx + Math.sin(dtState.swayTime * 4) * ghostOff, cy + Math.cos(dtState.swayTime * 3) * ghostOff, 14, 0, Math.PI * 2);
          g.stroke();
        }

        g.save();
        g.strokeStyle = dtState.charging ? '#fde047' : '#22d3ee';
        g.lineWidth = 2.2;
        g.beginPath();
        g.arc(cx, cy, 14, 0, Math.PI * 2);
        g.moveTo(cx - 20, cy);
        g.lineTo(cx - 6, cy);
        g.moveTo(cx + 6, cy);
        g.lineTo(cx + 20, cy);
        g.moveTo(cx, cy - 20);
        g.lineTo(cx, cy - 6);
        g.moveTo(cx, cy + 6);
        g.lineTo(cx, cy + 20);
        g.stroke();
        g.restore();
      }

      // 7. Right-Side Vertical Timing Power & Sweet-Spot Meter
      const meterX = 548;
      const meterY = 74;
      const meterW = 24;
      const meterH = 368;

      g.fillStyle = 'rgba(15, 23, 42, 0.9)';
      g.fillRect(meterX, meterY, meterW, meterH);
      g.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      g.lineWidth = 2;
      g.strokeRect(meterX, meterY, meterW, meterH);

      // Green Sweet-Spot Zone (0.72 .. 0.84 from bottom)
      const sweetTop = meterY + meterH * (1 - 0.84);
      const sweetHeight = meterH * 0.12;
      g.fillStyle = 'rgba(34, 197, 94, 0.48)';
      g.fillRect(meterX + 2, sweetTop, meterW - 4, sweetHeight);

      if (dtState.charging) {
        const fillH = meterH * dtState.powerMeter;
        const barGrad = g.createLinearGradient(0, meterY + meterH, 0, meterY);
        barGrad.addColorStop(0, '#38bdf8');
        barGrad.addColorStop(0.75, '#4ade80');
        barGrad.addColorStop(1, '#ef4444');
        g.fillStyle = barGrad;
        g.fillRect(meterX + 3, meterY + meterH - fillH, meterW - 6, fillH);
      }

      g.fillStyle = '#cbd5e1';
      g.font = '800 10.5px Segoe UI, sans-serif';
      g.textAlign = 'center';
      g.fillText('LỰC', meterX + meterW * 0.5, meterY - 10);
      g.fillStyle = '#4ade80';
      g.fillText('CHUẨN', meterX - 24, sweetTop + sweetHeight * 0.5 + 3);

      // 8. Floating Score Callout Banner
      if (dtState.callout.timer > 0) {
        g.save();
        g.textAlign = 'center';
        g.font = '900 22px Segoe UI, sans-serif';
        g.fillStyle = dtState.callout.color;
        g.shadowColor = 'rgba(0,0,0,0.95)';
        g.shadowBlur = 10;
        g.fillText(dtState.callout.text, BOARD_CX, 28);
        g.restore();
      }
    }

    function bindDOM(gCtx = ctx) {
      syncDartsUI();

      dom.dartsCanvas?.addEventListener('pointermove', (ev) => {
        const rect = dom.dartsCanvas.getBoundingClientRect();
        dtState.baseAimX = clamp(((ev.clientX - rect.left) / Math.max(1, rect.width)) * CANVAS_W, 30, 515);
        dtState.baseAimY = clamp(((ev.clientY - rect.top) / Math.max(1, rect.height)) * CANVAS_H, 30, CANVAS_H - 30);
      });

      dom.dartsCanvas?.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        clubAudio.unlock(gCtx);
        if (!dtState.matchActive) {
          startNewDartsMatch(false, gCtx);
        }
        beginPlayerCharge();
      });

      window.addEventListener('pointerup', () => {
        if (state.activeStation === 'darts_board' && dtState.charging) {
          releasePlayerCharge();
        }
      });

      dom.btnDartsStart?.addEventListener('click', () => startNewDartsMatch(true, gCtx));
      dom.dartsModeSelect?.addEventListener('change', () => startNewDartsMatch(false, gCtx));
    }

    function updateAndRender(rawDt, gCtx = ctx) {
      if (state.activeStation !== 'darts_board') return;

      dtState.swayTime += rawDt;
      if (dtState.callout.timer > 0) {
        dtState.callout.timer = Math.max(0, dtState.callout.timer - rawDt);
      }

      // Compute Lissajous Hand Sway (Amplified dramatically when drunkLevel > 30%!)
      const drunkFactor = state.drunkLevel > 30 ? 1 + ((state.drunkLevel - 30) / 70) * 3.1 : 1.0;
      const swayAmpX = 11.5 * drunkFactor;
      const swayAmpY = 9.5 * drunkFactor;
      const hiccupJerk =
        state.drunkLevel > 45 ? Math.sin(dtState.swayTime * 7.4) * ((state.drunkLevel - 45) / 55) * 14 : 0;

      dtState.liveCrossX =
        dtState.baseAimX + Math.sin(dtState.swayTime * 2.15) * swayAmpX + Math.cos(dtState.swayTime * 3.6) * 4 * drunkFactor;
      dtState.liveCrossY =
        dtState.baseAimY + Math.sin(dtState.swayTime * 2.85 + 0.7) * swayAmpY + hiccupJerk;

      // Oscillate Timing Power Meter while holding throw
      if (dtState.charging) {
        const meterSpeed = 1.45 + (state.drunkLevel > 35 ? 0.45 : 0);
        dtState.powerMeter += dtState.powerDir * meterSpeed * rawDt;
        if (dtState.powerMeter >= 1.0) {
          dtState.powerMeter = 1.0;
          dtState.powerDir = -1;
        } else if (dtState.powerMeter <= 0.05) {
          dtState.powerMeter = 0.05;
          dtState.powerDir = 1;
        }
      }

      // Step Flying Dart Animation
      if (dtState.flyingDart) {
        dtState.flyingDart.prog += rawDt * 4.1;
        if (dtState.flyingDart.prog >= 1.0) {
          const finished = dtState.flyingDart;
          dtState.flyingDart = null;
          applyLandedDart(finished.toX, finished.toY, finished.owner, gCtx);
        }
      } else if (!dtState.matchOver && dtState.turn === 'ai' && dtState.dartsLeft > 0) {
        dtState.aiThrowTimer -= rawDt;
        if (dtState.aiThrowTimer <= 0) {
          dtState.aiThrowTimer = 0.85;
          const aiPt = computeAiDartTarget();
          launchDartToward(aiPt.x, aiPt.y, 'ai');
        }
      }

      renderDartboardCanvas();
    }

    return {
      state: dtState,
      bindDOM,
      startNewDartsMatch,
      beginPlayerCharge,
      releasePlayerCharge,
      updateAndRender
    };
  }

  const dartsGame = createDartsMinigame();

  // ============================================================================
  // 5. CLUB ECLIPSE OWNERSHIP ($35K), PASSIVE SAFE INCOME & BOUNCER MISSIONS
  // ============================================================================
  const BOUNCER_MISSION_DEFS = [
    {
      id: 'bar_brawl',
      title: 'Dẹp Loạn Ẩu Đả Quầy Bar (3 Tên Côn Đồ)',
      desc: 'Hạ đo ván 3 gã say rượu đang đập phá chai lọ ngay bên trong Túy Tiên Lâu bằng cận chiến hoặc vũ khí.',
      reward: 3500,
      popGain: 20,
      btnLabel: '🥊 Bắt Đầu Dẹp Loạn ($3,500)'
    },
    {
      id: 'vip_escort',
      title: 'Hộ Tống Đại Gia VIP Về Động Phủ Tu Luyện',
      desc: 'Lái xe Sedan hạng sang đưa vị khách tỷ phú đang say khướt từ cửa Túy Tiên Lâu (-129, -95) về Căn hộ Động Phủ Tu Luyện an toàn.',
      reward: 6000,
      popGain: 25,
      btnLabel: '🚘 Nhận Hộ Tống VIP ($6,000)'
    },
    {
      id: 'champagne_recovery',
      title: 'Thu Hồi Xe Rượu Sâm Panh Bị Cướp',
      desc: 'Đoạt lại chiếc SUV chở lô rượu Blêuter’d Vàng tại ngã tư (120, 40) và lái về cổng VIP Túy Tiên Lâu trước khi hết giờ.',
      reward: 8500,
      popGain: 30,
      btnLabel: '🍾 Đi Thu Hồi Xe Rượu ($8,500)'
    }
  ];

  function computeSafeCyclePayout() {
    let base = state.baseSafePayout; // $2,500 baseline per 3 minutes
    for (const upg of CLUB_UPGRADES) {
      if (state.upgrades[upg.id]) {
        base += upg.incomeBonus;
      }
    }
    const popFactor = lerp(0.72, 1.28, clamp(state.clubPopularity / 100, 0, 1));
    return Math.max(2500, Math.round((base * popFactor) / 50) * 50);
  }

  function getPopularityFloor() {
    let floor = 20;
    for (const upg of CLUB_UPGRADES) {
      if (state.upgrades[upg.id] && upg.popularityFloor > floor) {
        floor = upg.popularityFloor;
      }
    }
    return floor;
  }

  function buyClub(gCtx = ctx) {
    const activeCtx = getActiveCtx(gCtx);
    clubAudio.unlock(activeCtx);

    if (state.clubOwned) {
      notifyClub('Bạn đã là Chủ Sở Hữu hợp pháp của Hộp Đêm Túy Tiên Lâu!', 3.0, activeCtx);
      return true;
    }
    if (!spendPlayerCash(state.clubPrice, activeCtx)) {
      notifyClub(
        `Không đủ vốn đầu tư! Cần ${formatCash(state.clubPrice)} để mua đứt bất động sản Túy Tiên Lâu.`,
        3.6,
        activeCtx
      );
      clubAudio.playArcadeLoseBuzzer();
      return false;
    }

    state.clubOwned = true;
    state.clubPopularity = Math.max(state.clubPopularity, 85);
    state.safeBalance = Math.min(state.safeMaxCapacity, state.safeBalance + 2500);
    state.safeIncomeTimer = state.safeIncomeInterval;

    clubAudio.playChampagnePopAndSparkler();
    clubStage3D.emitGoldenConfetti(CLUB_CENTER_X, 6.0, 1498.0, 80);
    showClubBanner('ĐÃ MUA CLUB ECLIPSE!', 'Thu nhập két sắt thụ động +$2,500 mỗi 3 phút đã kích hoạt!', 4.6, activeCtx);
    notifyClub(
      '🏢 Chúc mừng Tân Chủ Nhân *Túy Tiên Lâu*! Đã tặng ngay $2,500 tiền khai trương vào Két Sắt VIP!',
      4.5,
      activeCtx
    );

    saveNightlifeState();
    refreshVipManagementDOM(activeCtx);
    refreshBarMenuSelectionUI();
    syncHeaderTelemetry(activeCtx);
    return true;
  }

  function collectSafeIncome(gCtx = ctx) {
    const activeCtx = getActiveCtx(gCtx);
    clubAudio.unlock(activeCtx);

    if (!state.clubOwned) {
      notifyClub('Bạn cần mua đứt Túy Tiên Lâu ($35,000) để mở khóa Két Sắt doanh thu!', 3.2, activeCtx);
      return 0;
    }
    const amt = Math.floor(state.safeBalance);
    if (amt <= 0) {
      notifyClub('Két sắt VIP hiện đang trống — Doanh thu mới sẽ chuyển về sau ít phút!', 3.0, activeCtx);
      return 0;
    }

    state.safeBalance = 0;
    state.totalClubEarnings += amt;
    addPlayerCash(amt, activeCtx, false);
    clubAudio.playArcadeWinFanfare();
    notifyClub(`💼 Đã thu *${formatCash(amt)}* tiền doanh thu hộp đêm từ Két Sắt VIP!`, 3.8, activeCtx);

    saveNightlifeState();
    refreshVipManagementDOM(activeCtx);
    syncHeaderTelemetry(activeCtx);
    return amt;
  }

  function promoteClub(gCtx = ctx) {
    const activeCtx = getActiveCtx(gCtx);
    clubAudio.unlock(activeCtx);
    const promoCost = 1200;
    if (!spendPlayerCash(promoCost, activeCtx)) {
      notifyClub(`Cần ${formatCash(promoCost)} để thuê DJ khách mời & chạy chiến dịch quảng bá!`, 3.0, activeCtx);
      clubAudio.playArcadeLoseBuzzer();
      return false;
    }
    state.clubPopularity = clamp(state.clubPopularity + 22, 0, 100);
    clubAudio.playArcadeWinFanfare();
    clubStage3D.emitGoldenConfetti(CLUB_CENTER_X, 5.8, 1498.0, 45);
    notifyClub(`📣 Chiến dịch quảng bá thành công! Độ Hot Túy Tiên Lâu tăng lên *${Math.round(state.clubPopularity)}%*!`, 3.6, activeCtx);
    saveNightlifeState();
    refreshVipManagementDOM(activeCtx);
    syncHeaderTelemetry(activeCtx);
    return true;
  }

  function buyClubUpgrade(upgradeId, gCtx = ctx) {
    const activeCtx = getActiveCtx(gCtx);
    const upg = CLUB_UPGRADES.find((u) => u.id === upgradeId);
    if (!upg) return false;
    if (!state.clubOwned) {
      notifyClub('Hãy mua quyền sở hữu Túy Tiên Lâu ($35,000) trước khi nâng cấp cơ sở hạ tầng!', 3.2, activeCtx);
      return false;
    }
    if (state.upgrades[upg.id]) {
      notifyClub(`Hạng mục "${upg.name}" đã được lắp đặt tối đa!`, 2.6, activeCtx);
      return true;
    }
    if (!spendPlayerCash(upg.cost, activeCtx)) {
      notifyClub(`Không đủ tiền! Cần ${formatCash(upg.cost)} để nâng cấp ${upg.name}.`, 3.2, activeCtx);
      clubAudio.playArcadeLoseBuzzer();
      return false;
    }

    state.upgrades[upg.id] = true;
    state.clubPopularity = clamp(state.clubPopularity + 15, getPopularityFloor(), 100);
    clubAudio.playChampagnePopAndSparkler();
    notifyClub(`✨ Đã lắp đặt *${upg.name}*! Doanh thu chu kỳ tăng lên ${formatCash(computeSafeCyclePayout())}!`, 4.2, activeCtx);

    saveNightlifeState();
    refreshVipManagementDOM(activeCtx);
    refreshBarMenuSelectionUI();
    syncHeaderTelemetry(activeCtx);
    return true;
  }

  // ============================================================================
  // BOUNCER VIP SECURITY & 3D CLUB BAR BRAWL MISSION ENGINE
  // ============================================================================
  const missionWorldGroup = new THREE.Group();
  missionWorldGroup.name = 'NightlifeBouncerMissionGroup';
  let missionCoronaMesh = null;

  function ensureMissionCorona(gCtx = ctx) {
    const scene = gCtx?.engine?.scene || gCtx?.scene;
    if (scene && !missionWorldGroup.parent) {
      scene.add(missionWorldGroup);
    }
    if (!missionCoronaMesh) {
      missionCoronaMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(2.4, 2.4, 4.2, 24, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
          transparent: true,
          opacity: 0.38,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      missionCoronaMesh.visible = false;
      missionWorldGroup.add(missionCoronaMesh);
    }
  }

  function cleanupBouncerMission(gCtx = ctx) {
    const bm = state.bouncerMission;
    for (const br of bm.brawlers) {
      if (br.rig && br.rig.parent) br.rig.parent.remove(br.rig);
    }
    bm.brawlers = [];
    if (bm.vipNpc && bm.vipNpc.parent) bm.vipNpc.parent.remove(bm.vipNpc);
    bm.vipNpc = null;
    if (missionCoronaMesh) missionCoronaMesh.visible = false;
    bm.active = false;
    bm.type = null;
    bm.stage = 0;
    if (dom.brawlHud) dom.brawlHud.classList.remove('visible');
    gCtx?.ui?.setObjective?.('');
  }

  function startBouncerMission(missionId = 'bar_brawl', gCtx = ctx) {
    const activeCtx = getActiveCtx(gCtx);
    const def = BOUNCER_MISSION_DEFS.find((m) => m.id === missionId) || BOUNCER_MISSION_DEFS[0];

    cleanupBouncerMission(activeCtx);
    ensureMissionCorona(activeCtx);
    if (state.isOpen) {
      closeBarStation(activeCtx);
    }

    const bm = state.bouncerMission;
    bm.active = true;
    bm.type = def.id;
    bm.stage = 1;
    bm.reward = def.reward;
    bm.popReward = def.popGain;

    if (def.id === 'bar_brawl') {
      // Ensure player is inside Túy Tiên Lâu (1500, 0, 1500) for the 3D Bar Brawl!
      const p = activeCtx?.player;
      if (p && !isPlayerInsideNightclub(activeCtx)) {
        p.inNightclub = true;
        if (activeCtx?.casinoWorld) activeCtx.casinoWorld.inNightclub = true;
        p.x = 1500.0;
        p.y = 0.05;
        p.z = 1509.0;
        if (p.mesh) p.mesh.position.set(p.x, p.y, p.z);
      }

      bm.timer = 120;
      const brawlerSpecs = [
        { name: 'Gã Say Đập Chai Billy', x: 1488.2, z: 1498.5, hp: 110, color: 0xdc2626 },
        { name: 'Côn Đồ Xăm Trổ Viktor', x: 1508.5, z: 1503.0, hp: 130, color: 0xea580c },
        { name: 'Võ Sĩ Xỉn Rượu Rocco', x: 1502.5, z: 1493.5, hp: 150, color: 0x9333ea }
      ];

      const scene = activeCtx?.engine?.scene || activeCtx?.scene;
      for (let i = 0; i < brawlerSpecs.length; i++) {
        const sp = brawlerSpecs[i];
        const rig = clubStage3D.spawnHumanoidOrFallback(activeCtx, 'casual_polo', sp.color, 0x111827);
        rig.position.set(sp.x, 0.04, sp.z);
        if (scene) scene.add(rig);
        bm.brawlers.push({
          id: i,
          name: sp.name,
          rig,
          x: sp.x,
          y: 0.04,
          z: sp.z,
          yaw: 0,
          hp: sp.hp,
          maxHp: sp.hp,
          attackCooldown: 1.0 + i * 0.35,
          hitStun: 0,
          ko: false
        });
      }

      showClubBanner('NHIỆM VỤ BOUNCER', 'Dẹp Loạn 3 Kẻ Quậy Phá Trong Túy Tiên Lâu!', 3.6, activeCtx);
      activeCtx?.ui?.setObjective?.(
        'Hạ gục 3 tên côn đồ say rượu đang quậy phá trong *Túy Tiên Lâu* bằng cận chiến [Chuột Trái] hoặc [F]!'
      );
    } else if (def.id === 'vip_escort') {
      // Teleport outside Túy Tiên Lâu (-124.5, 0.22, -95.0) with a luxury VIP Tailgater Sedan!
      safeTeleportPlayerToWorld(-125.0, 0.22, -95.0, Math.PI * 0.5, false, activeCtx);
      bm.timer = 165;
      bm.targetPos = { x: 24.0, y: 0.22, z: -75.5 };

      if (typeof activeCtx?.vehicles?.spawnVehicle === 'function') {
        try {
          const groundY = activeCtx?.world?.getGroundHeight?.(-121.0, -95.0) ?? 0.05;
          bm.escortCar = activeCtx.vehicles.spawnVehicle('sedan_lux', -121.0, groundY + 0.05, -95.0, 0, {
            color: 0x0f172a,
            plate: 'VIP CLUB',
            isParked: true
          });
        } catch (_) {}
      }

      if (missionCoronaMesh) {
        missionCoronaMesh.position.set(bm.targetPos.x, 2.1, bm.targetPos.z);
        missionCoronaMesh.visible = true;
      }

      showClubBanner('HỘ TỐNG ĐẠI GIA VIP', 'Đưa Khách VIP Về Động Phủ Tu Luyện (24, -76) An Toàn!', 4.0, activeCtx);
      activeCtx?.ui?.setObjective?.(
        'Lên chiếc *Tailgater* màu đen trước cửa Túy Tiên Lâu và chở khách VIP tới điểm vàng *Động Phủ Tu Luyện* (24, -76)!'
      );
    } else {
      // Champagne Supply Truck Recovery at (120, 0.22, 40) -> Deliver back to (-122, 0.22, -95)
      if (isPlayerInsideNightclub(activeCtx)) {
        safeTeleportPlayerToWorld(-126.0, 0.22, -95.0, Math.PI * 0.5, false, activeCtx);
      }
      bm.timer = 195;
      bm.stage = 1; // Stage 1: Reach stolen SUV at (120, 40); Stage 2: Drive back to Túy Tiên Lâu (-122, -95)
      bm.targetPos = { x: 120.0, y: 0.22, z: 40.0 };

      if (typeof activeCtx?.vehicles?.spawnVehicle === 'function') {
        try {
          const gy = activeCtx?.world?.getGroundHeight?.(120.0, 40.0) ?? 0.05;
          bm.supplyTruck = activeCtx.vehicles.spawnVehicle('suv', 120.0, gy + 0.05, 40.0, Math.PI, {
            color: 0xfbbf24,
            plate: 'BLEUTERD',
            isParked: true
          });
        } catch (_) {}
      }

      if (missionCoronaMesh) {
        missionCoronaMesh.position.set(120.0, 2.1, 40.0);
        missionCoronaMesh.visible = true;
      }

      showClubBanner('THU HỒI RƯỢU SÂM PANH', 'Đoạt Lại Xe SUV Vàng Tại (120, 40)!', 4.0, activeCtx);
      activeCtx?.ui?.setObjective?.(
        'Tới giao lộ *(120, 40)* chiếm lại chiếc SUV mạ vàng chở rượu Sâm Panh Blêuter’d!'
      );
    }

    return true;
  }

  function completeBouncerMission(gCtx = ctx) {
    const activeCtx = getActiveCtx(gCtx);
    const bm = state.bouncerMission;
    const cash = bm.reward || 3500;
    const pop = bm.popReward || 20;

    cleanupBouncerMission(activeCtx);
    addPlayerCash(cash, activeCtx, false);
    state.totalClubEarnings += cash;
    state.clubPopularity = clamp(state.clubPopularity + pop, 0, 100);

    clubAudio.playChampagnePopAndSparkler();
    showClubBanner('HOÀN THÀNH NHIỆM VỤ VIP!', `Thưởng +${formatCash(cash)} • +${pop}% Độ Hot Túy Tiên Lâu`, 4.6, activeCtx);
    notifyClub(`🕶️ Nhiệm vụ Bouncer hoàn tất xuất sắc! Nhận *${formatCash(cash)}* và +${pop}% Danh tiếng hộp đêm!`, 4.4, activeCtx);
    saveNightlifeState();
  }

  let brawlerPunchCooldown = 0;

  function updateBouncerMission(dt, rawDt, gCtx = ctx) {
    const bm = state.bouncerMission;
    if (!bm.active) return;

    const p = gCtx?.player;
    if (!p) return;

    if (brawlerPunchCooldown > 0) brawlerPunchCooldown = Math.max(0, brawlerPunchCooldown - rawDt);

    bm.timer -= dt;
    if (bm.timer <= 0) {
      cleanupBouncerMission(gCtx);
      clubAudio.playArcadeLoseBuzzer();
      showClubBanner('NHIỆM VỤ THẤT BẠI', 'Đã hết thời gian thực hiện nhiệm vụ Bouncer!', 3.6, gCtx);
      return;
    }

    if (missionCoronaMesh && missionCoronaMesh.visible) {
      missionCoronaMesh.rotation.y += dt * 1.6;
    }

    if (bm.type === 'bar_brawl') {
      const inp = gCtx?.input;
      const playerAttacked =
        brawlerPunchCooldown <= 0 &&
        Boolean(inp?.fireJustPressed || inp?.shootJustPressed || inp?.attack || inp?.interactJustPressed);

      if (playerAttacked) {
        brawlerPunchCooldown = 0.34;
      }

      let aliveCount = 0;
      let hudHtml = '';

      for (let i = 0; i < bm.brawlers.length; i++) {
        const br = bm.brawlers[i];
        if (br.ko) continue;
        aliveCount++;

        const dx = p.x - br.x;
        const dz = p.z - br.z;
        const dist = Math.hypot(dx, dz);
        br.yaw = Math.atan2(dx, dz);

        if (br.hitStun > 0) {
          br.hitStun = Math.max(0, br.hitStun - dt);
        } else if (dist > 1.35) {
          const moveSpd = 2.65;
          br.x += (dx / Math.max(0.01, dist)) * moveSpd * dt;
          br.z += (dz / Math.max(0.01, dist)) * moveSpd * dt;
        } else {
          br.attackCooldown -= dt;
          if (br.attackCooldown <= 0) {
            br.attackCooldown = 1.35;
            const dmg = state.upgrades.bouncer_tactical ? 4 : 7;
            p.hp = Math.max(10, (Number(p.hp) || 100) - dmg);
            gCtx?.audio?.playMelee?.(false);
            gCtx?.engine?.addShake?.(0.16);
          }
        }

        // Check Player Melee / Bat / Weapon Strike against Brawler
        const activeWeapon = String(p.weapon || p.currentWeapon || 'unarmed').toLowerCase();
        const reach = activeWeapon === 'bat' ? 3.2 : activeWeapon === 'unarmed' ? 2.6 : 16.0;
        if (playerAttacked && dist <= reach) {
          const hitDmg = activeWeapon === 'bat' ? 62 : activeWeapon === 'unarmed' ? 42 : 55;
          br.hp = Math.max(0, br.hp - hitDmg);
          br.hitStun = 0.42;
          if (dist > 0.05) {
            br.x -= (dx / dist) * 0.65;
            br.z -= (dz / dist) * 0.65;
          }
          gCtx?.audio?.playMelee?.(activeWeapon === 'bat');
          gCtx?.ui?.triggerHitmarker?.(br.hp <= 0);

          if (br.hp <= 0) {
            br.ko = true;
            if (br.rig) {
              br.rig.rotation.x = -Math.PI * 0.48;
              br.rig.position.y = 0.16;
            }
            notifyClub(`🥊 Đã hạ đo ván *${br.name}*!`, 2.4, gCtx);
          }
        }

        if (br.rig && !br.ko) {
          br.rig.position.set(br.x, br.y, br.z);
          br.rig.rotation.y = br.yaw;
          const joints = br.rig.joints;
          if (joints) {
            const swing = Math.sin(performance.now() * 0.012 + i);
            if (joints.shoulderL) joints.shoulderL.rotation.x = -1.1 + swing * 0.45;
            if (joints.shoulderR) joints.shoulderR.rotation.x = -1.1 - swing * 0.45;
            if (joints.elbowL) joints.elbowL.rotation.x = -1.2;
            if (joints.elbowR) joints.elbowR.rotation.x = -1.2;
          }
        }

        const pct = Math.round((br.hp / br.maxHp) * 100);
        hudHtml += `
          <div class="nl-brawl-row">
            <span style="width:128px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(br.name)}</span>
            <div class="nl-brawl-hp-bg"><div class="nl-brawl-hp-fg" style="width:${pct}%"></div></div>
          </div>
        `;
      }

      if (dom.brawlHud && dom.brawlList) {
        dom.brawlHud.classList.toggle('visible', aliveCount > 0);
        dom.brawlList.innerHTML = hudHtml;
      }

      if (aliveCount === 0) {
        completeBouncerMission(gCtx);
      }
    } else if (bm.type === 'vip_escort') {
      const dist = Math.hypot(p.x - bm.targetPos.x, p.z - bm.targetPos.z);
      if (dist < 8.5) {
        completeBouncerMission(gCtx);
      }
    } else if (bm.type === 'champagne_recovery') {
      if (bm.stage === 1) {
        const distToSuv = Math.hypot(p.x - 120.0, p.z - 40.0);
        if (distToSuv < 8.0 || (bm.supplyTruck && p.inCar === bm.supplyTruck)) {
          bm.stage = 2;
          bm.targetPos = { x: -123.0, y: 0.22, z: -95.0 };
          if (missionCoronaMesh) {
            missionCoronaMesh.position.set(-123.0, 2.1, -95.0);
            missionCoronaMesh.visible = true;
          }
          notifyClub('🍾 Đã lấy lại xe rượu Sâm Panh! Mau lái về cổng *Túy Tiên Lâu (-123, -95)*!', 4.0, gCtx);
          gCtx?.ui?.setObjective?.('Lái xe rượu Sâm Panh về vòng sáng vàng trước cửa *Túy Tiên Lâu (-123, -95)*!');
        }
      } else if (bm.stage === 2) {
        const distBack = Math.hypot(p.x - bm.targetPos.x, p.z - bm.targetPos.z);
        if (distBack < 9.5) {
          completeBouncerMission(gCtx);
        }
      }
    }
  }

  function refreshVipManagementDOM(gCtx = ctx) {
    if (!dom.modalRoot) return;

    if (dom.vipDeedStatus) {
      const payout = computeSafeCyclePayout();
      dom.vipDeedStatus.innerHTML = state.clubOwned
        ? `✅ <b>Trạng thái: ĐÃ SỞ HỮU HỢP PHÁP</b> • Thu nhập thụ động hiện tại: <b style="color:#4ade80;">+${formatCash(payout)} / 3 phút</b>.`
        : `🏢 <b>Chưa sở hữu:</b> Mua đứt Hộp Đêm Túy Tiên Lâu với giá <b style="color:#fde047;">${formatCash(state.clubPrice)}</b> để mở Két Sắt tự động sinh lời <b style="color:#4ade80;">+$2,500 mỗi 3 phút</b>!`;
    }
    if (dom.btnBuyClub) {
      dom.btnBuyClub.style.display = state.clubOwned ? 'none' : 'block';
    }
    if (dom.vipSafeAmount) {
      dom.vipSafeAmount.textContent = formatCash(state.safeBalance);
    }
    if (dom.vipSafeTimer) {
      const sec = Math.max(0, Math.ceil(state.safeIncomeTimer));
      const mm = String(Math.floor(sec / 60)).padStart(2, '0');
      const ss = String(sec % 60).padStart(2, '0');
      dom.vipSafeTimer.textContent = state.clubOwned
        ? `Chu kỳ tiền về tiếp theo (+${formatCash(computeSafeCyclePayout())}): ${mm}:${ss}`
        : 'Mua Túy Tiên Lâu để bắt đầu tích lũy tiền két sắt tự động!';
    }
    if (dom.vipPopLabel) dom.vipPopLabel.textContent = `${Math.round(state.clubPopularity)}%`;
    if (dom.vipPopFill) dom.vipPopFill.style.width = `${Math.round(state.clubPopularity)}%`;

    if (dom.vipUpgradeList) {
      dom.vipUpgradeList.innerHTML = '';
      for (const upg of CLUB_UPGRADES) {
        const owned = Boolean(state.upgrades[upg.id]);
        const row = document.createElement('div');
        row.className = 'nl-upgrade-item';
        row.innerHTML = `
          <div>
            <div style="font-size:12.5px;font-weight:800;color:#f8fafc;">${escapeHtml(upg.name)}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${escapeHtml(upg.desc)}</div>
          </div>
        `;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = owned ? 'nl-btn-secondary' : 'nl-btn-gold';
        btn.style.whiteSpace = 'nowrap';
        btn.disabled = owned;
        btn.textContent = owned ? '✓ ĐÃ LẮP ĐẶT' : `Nâng Cấp ${formatCash(upg.cost)}`;
        if (!owned) {
          btn.addEventListener('click', () => buyClubUpgrade(upg.id, gCtx));
        }
        row.appendChild(btn);
        dom.vipUpgradeList.appendChild(row);
      }
    }

    if (dom.bouncerMissionList) {
      dom.bouncerMissionList.innerHTML = '';
      for (const m of BOUNCER_MISSION_DEFS) {
        const row = document.createElement('div');
        row.className = 'nl-mission-item';
        row.innerHTML = `
          <div>
            <div style="font-size:12.5px;font-weight:800;color:#fda4af;">${escapeHtml(m.title)}</div>
            <div style="font-size:11px;color:#cbd5e1;margin-top:2px;">${escapeHtml(m.desc)}</div>
          </div>
        `;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nl-btn-primary';
        btn.style.whiteSpace = 'nowrap';
        btn.style.fontSize = '12px';
        btn.textContent = m.btnLabel;
        btn.addEventListener('click', () => startBouncerMission(m.id, gCtx));
        row.appendChild(btn);
        dom.bouncerMissionList.appendChild(row);
      }
    }

    if (dom.vipStatsSummary) {
      dom.vipStatsSummary.innerHTML =
        `📊 <b>Hồ sơ Đêm Tiên Thành:</b> Đã uống <b>${state.totalDrinksConsumed}</b> ly • ` +
        `Thắng Bi-a: <b>${state.totalPoolWins}</b> ván • Thắng Phi Tiêu: <b>${state.totalDartsWins}</b> trận • ` +
        `Kỷ lục Nhảy Nhạc Hội: <b>${state.totalDanceHighScore.toLocaleString('en-US')}</b> • ` +
        `Tổng thu nhập Túy Tiên Lâu &amp; Giải thưởng: <b style="color:#4ade80;">${formatCash(state.totalClubEarnings)}</b>`;
    }
  }

  // ============================================================================
  // 6. LIVE DJ TURNTABLE MIXER, 3D CO2 CRYO-JETS & BAR CHUGGING DUEL ('dj_booth')
  // ============================================================================
  function createDjAndChuggingStudio() {
    const DJ_SAMPLE_PADS = [
      { id: 'airhorn', key: 'Q', label: '📣 Còi Airhorn', color: '#ef4444' },
      { id: 'siren', key: 'W', label: '🚨 Rave Siren', color: '#f97316' },
      { id: 'subdrop', key: 'E', label: '💣 Bass Drop', color: '#a855f7' },
      { id: 'laser', key: 'R', label: '⚡ Laser Zap', color: '#06b6d4' },
      { id: 'crowd', key: 'A', label: '🙌 Hò Reo VIP', color: '#22c55e' },
      { id: 'snareroll', key: 'S', label: '🥁 Snare Build', color: '#eab308' },
      { id: 'rewind', key: 'D', label: '⏪ Tua Đĩa Spin', color: '#ec4899' },
      { id: 'co2jet', key: 'F', label: '💨 Khói Lạnh CO2', color: '#38bdf8' }
    ];

    const CHUG_RIVALS = [
      { id: 0, name: '"Gấu Nga" Boris', drinkRate: 0.165, stamina: 0.72 },
      { id: 1, name: 'Nữ Hoàng Chloe', drinkRate: 0.215, stamina: 0.84 },
      { id: 2, name: 'Thánh Nhậu Bích Thủy Kênh', drinkRate: 0.265, stamina: 0.94 }
    ];

    const studio = {
      deckCanvas: null,
      chugCanvas: null,
      filterSlider: null,
      tipsLabel: null,
      padGrid: null,
      chugOppSelect: null,
      chugWagerInput: null,
      chugStartBtn: null,
      chugStatusEl: null,
      platterAngleL: 0,
      platterAngleR: 0,
      scratchingDeck: 0, // 0 none, 1 left, 2 right
      scratchLastX: 0,
      scratchVel: 0,
      crossfader: 0.5,
      padFlash: [0, 0, 0, 0, 0, 0, 0, 0],
      djHypeCombo: 0,
      djSessionTips: 0,
      lastSampleAt: 0,
      // 3D CO2 Cryo-Smoke Columns inside (1500, 0, 1500)
      cryoGroup: new THREE.Group(),
      cryoCones: [],
      cryoTimer: 0,
      // Chugging Duel State
      chugActive: false,
      chugWager: 400,
      chugOppIdx: 1,
      holdingDrink: false,
      playerRemaining: 1.0,
      aiRemaining: 1.0,
      foamPressure: 0.25,
      sweetZoneCenter: 0.56,
      sweetZoneWidth: 0.28,
      sweetPhase: 0,
      spillStunTimer: 0
    };

    function ensureCryo3DJets(gCtx = ctx) {
      const scene = gCtx?.engine?.scene || gCtx?.scene;
      if (scene && !studio.cryoGroup.parent) {
        scene.add(studio.cryoGroup);
      }
      if (studio.cryoCones.length > 0) return;

      const jetCoords = [
        [1495.2, 0.1, 1489.5],
        [1504.8, 0.1, 1489.5],
        [1494.5, 0.1, 1502.5],
        [1505.5, 0.1, 1502.5]
      ];
      const jetGeo = new THREE.ConeGeometry(1.15, 6.4, 14, 1, true);
      jetGeo.translate(0, 3.2, 0);

      for (let i = 0; i < jetCoords.length; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: 0xe0f2fe,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
        const mesh = new THREE.Mesh(jetGeo, mat);
        mesh.position.set(jetCoords[i][0], jetCoords[i][1], jetCoords[i][2]);
        mesh.rotation.x = Math.PI; // Inverted cone blasting upward from floor nozzle!
        mesh.position.y = 6.4;
        studio.cryoGroup.add(mesh);
        studio.cryoCones.push(mesh);
      }
    }

    function playSynthClubSample(sampleId, gCtx = ctx) {
      clubAudio.unlock(gCtx);
      const ac = gCtx?.audio?.ctx || ctx?.audio?.ctx;
      if (ac && ac.state === 'running') {
        try {
          const now = ac.currentTime;
          if (sampleId === 'airhorn') {
            // Iconic Reggae/Nhạc Hội Triple-Blast Festival Airhorn!
            const blasts = [0, 0.15, 0.31];
            const durs = [0.11, 0.11, 0.42];
            blasts.forEach((off, idx) => {
              for (const f of [466.16, 587.33, 932.33]) {
                const osc = ac.createOscillator();
                const g = ac.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(f * 0.96, now + off);
                osc.frequency.linearRampToValueAtTime(f, now + off + 0.03);
                g.gain.setValueAtTime(0.085, now + off);
                g.gain.exponentialRampToValueAtTime(0.001, now + off + durs[idx]);
                osc.connect(g);
                g.connect(ac.destination);
                osc.start(now + off);
                osc.stop(now + off + durs[idx] + 0.02);
              }
            });
          } else if (sampleId === 'siren') {
            const osc = ac.createOscillator();
            const g = ac.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.linearRampToValueAtTime(1240, now + 0.25);
            osc.frequency.linearRampToValueAtTime(560, now + 0.5);
            g.gain.setValueAtTime(0.16, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
            osc.connect(g);
            g.connect(ac.destination);
            osc.start(now);
            osc.stop(now + 0.56);
          } else if (sampleId === 'subdrop') {
            const osc = ac.createOscillator();
            const g = ac.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(28, now + 0.85);
            g.gain.setValueAtTime(0.38, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
            osc.connect(g);
            g.connect(ac.destination);
            osc.start(now);
            osc.stop(now + 0.92);
          } else if (sampleId === 'laser') {
            for (let z = 0; z < 3; z++) {
              const osc = ac.createOscillator();
              const g = ac.createGain();
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(1950, now + z * 0.09);
              osc.frequency.exponentialRampToValueAtTime(130, now + z * 0.09 + 0.08);
              g.gain.setValueAtTime(0.14, now + z * 0.09);
              g.gain.exponentialRampToValueAtTime(0.001, now + z * 0.09 + 0.085);
              osc.connect(g);
              g.connect(ac.destination);
              osc.start(now + z * 0.09);
              osc.stop(now + z * 0.09 + 0.09);
            }
          } else if (sampleId === 'rewind' || sampleId === 'scratch') {
            const osc = ac.createOscillator();
            const g = ac.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(1480, now + 0.12);
            osc.frequency.exponentialRampToValueAtTime(210, now + 0.24);
            g.gain.setValueAtTime(0.14, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(g);
            g.connect(ac.destination);
            osc.start(now);
            osc.stop(now + 0.26);
          } else {
            clubAudio.playArcadeWinFanfare();
          }
        } catch (_) {}
      }

      if (sampleId === 'co2jet') {
        ensureCryo3DJets(gCtx);
        studio.cryoTimer = 2.4;
        clubStage3D.emitGoldenConfetti(CLUB_CENTER_X, 5.8, 1498.0, 32);
      }

      // Award DJ Live Performance Tips when dropping rhythmic FX combos!
      const nowMs = Date.now();
      if (nowMs - studio.lastSampleAt > 380) {
        studio.lastSampleAt = nowMs;
        studio.djHypeCombo++;
        state.clubPopularity = clamp(state.clubPopularity + 0.8, 0, 100);
        if (studio.djHypeCombo % 4 === 0) {
          const tip = randInt(45, 160);
          studio.djSessionTips += tip;
          state.totalClubEarnings += tip;
          addPlayerCash(tip, gCtx, false);
          if (studio.tipsLabel) {
            studio.tipsLabel.textContent = `Tip: ${formatCash(studio.djSessionTips)}`;
          }
          notifyClub(`🎧 Khán giả phấn khích ném tiền Tip lên bàn DJ: *+${formatCash(tip)}*!`, 2.6, gCtx);
        }
      }
    }

    function startChuggingDuel(gCtx = ctx) {
      const activeCtx = getActiveCtx(gCtx);
      clubAudio.unlock(activeCtx);

      const rawWager = Number(studio.chugWagerInput?.value ?? 400) || 400;
      const wager = clamp(Math.round(rawWager / 50) * 50, 100, 2500);
      if (studio.chugWagerInput) studio.chugWagerInput.value = String(wager);

      if (!spendPlayerCash(wager, activeCtx)) {
        notifyClub(`Không đủ tiền mặt đặt cược Đấu Tửu Lượng (${formatCash(wager)})!`, 3.0, activeCtx);
        clubAudio.playArcadeLoseBuzzer();
        return false;
      }

      studio.chugOppIdx = clamp(Number(studio.chugOppSelect?.value ?? 1) | 0, 0, 2);
      studio.chugWager = wager;
      studio.chugActive = true;
      studio.holdingDrink = false;
      studio.playerRemaining = 1.0;
      studio.aiRemaining = 1.0;
      studio.foamPressure = 0.45;
      studio.sweetZoneCenter = 0.55;
      studio.spillStunTimer = 0;

      const opp = CHUG_RIVALS[studio.chugOppIdx];
      if (studio.chugStatusEl) {
        studio.chugStatusEl.textContent = `🍻 BẮT ĐẦU! Nhấp giữ Chuột Trái lên vại bia hoặc giữ [SPACE] để vượt mặt ${opp.name}!`;
      }
      syncHeaderTelemetry(activeCtx);
      return true;
    }

    function finishChuggingDuel(playerWon, gCtx = ctx) {
      studio.chugActive = false;
      studio.holdingDrink = false;
      const opp = CHUG_RIVALS[studio.chugOppIdx];

      // Drinking a full stein in the duel raises BAC +16%!
      state.totalDrinksConsumed++;
      state.drunkLevel = clamp(state.drunkLevel + 16, 0, 100);
      state.drunkPeakHoldTimer = 10.0;

      if (playerWon) {
        const prize = studio.chugWager * 2;
        addPlayerCash(prize, gCtx, false);
        state.totalClubEarnings += prize;
        state.clubPopularity = clamp(state.clubPopularity + 10, 0, 100);
        clubAudio.playChampagnePopAndSparkler();
        if (studio.chugStatusEl) {
          studio.chugStatusEl.textContent = `🏆 ĐỈNH CAO TỬU LƯỢNG! Bạn nốc cạn trước ${opp.name} và thắng ${formatCash(prize)}!`;
        }
        notifyClub(`🍺 Thắng kèo Đấu Tửu Lượng trước ${opp.name}! Ẵm trọn *${formatCash(prize)}*!`, 4.2, gCtx);
      } else {
        clubAudio.playArcadeLoseBuzzer();
        if (studio.chugStatusEl) {
          studio.chugStatusEl.textContent = `😵 ${opp.name} đã nốc cạn vại trước bạn! Bấm Thách Đấu Lại để gỡ gạc!`;
        }
      }

      saveNightlifeState();
      syncHeaderTelemetry(gCtx);
      if (state.drunkLevel >= 100) {
        triggerBlackout('max_bac', gCtx);
      }
    }

    function bindDOM(gCtx = ctx) {
      if (!dom.modalRoot) return;
      studio.deckCanvas = dom.modalRoot.querySelector('#nl-dj-deck-canvas');
      studio.chugCanvas = dom.modalRoot.querySelector('#nl-chug-canvas');
      studio.filterSlider = dom.modalRoot.querySelector('[data-role="dj-filter-slider"]');
      studio.tipsLabel = dom.modalRoot.querySelector('[data-role="dj-tips-val"]');
      studio.padGrid = dom.modalRoot.querySelector('[data-role="dj-pad-grid"]');
      studio.chugOppSelect = dom.modalRoot.querySelector('[data-role="chug-opponent"]');
      studio.chugWagerInput = dom.modalRoot.querySelector('[data-role="chug-wager"]');
      studio.chugStartBtn = dom.modalRoot.querySelector('[data-role="btn-chug-start"]');
      studio.chugStatusEl = dom.modalRoot.querySelector('[data-role="chug-status"]');

      if (studio.padGrid && studio.padGrid.children.length === 0) {
        DJ_SAMPLE_PADS.forEach((pad, idx) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'nl-dance-pad';
          btn.style.fontSize = '11.5px';
          btn.style.padding = '9px 6px';
          btn.style.borderColor = pad.color;
          btn.textContent = `${pad.label} [${pad.key}]`;
          btn.addEventListener('pointerdown', (ev) => {
            ev.preventDefault();
            studio.padFlash[idx] = 1.0;
            playSynthClubSample(pad.id, gCtx);
          });
          studio.padGrid.appendChild(btn);
        });
      }

      studio.filterSlider?.addEventListener('input', () => {
        state.djFilterCutoffNorm = clamp(Number(studio.filterSlider.value) / 100, 0.1, 1.0);
      });

      studio.deckCanvas?.addEventListener('pointerdown', (ev) => {
        const rect = studio.deckCanvas.getBoundingClientRect();
        const relX = (ev.clientX - rect.left) / Math.max(1, rect.width);
        studio.scratchingDeck = relX < 0.5 ? 1 : 2;
        studio.scratchLastX = ev.clientX;
        playSynthClubSample('scratch', gCtx);
      });

      window.addEventListener('pointermove', (ev) => {
        if (studio.scratchingDeck > 0) {
          const dx = ev.clientX - studio.scratchLastX;
          studio.scratchLastX = ev.clientX;
          studio.scratchVel = clamp(dx * 0.08, -1.5, 1.5);
          if (Math.abs(dx) > 14) {
            playSynthClubSample('scratch', gCtx);
          }
        }
      });

      window.addEventListener('pointerup', () => {
        studio.scratchingDeck = 0;
        studio.holdingDrink = false;
      });

      studio.chugStartBtn?.addEventListener('click', () => startChuggingDuel(gCtx));
      studio.chugCanvas?.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        if (!studio.chugActive) {
          startChuggingDuel(gCtx);
        }
        studio.holdingDrink = true;
      });
    }

    function triggerPadByKey(code, gCtx = ctx) {
      const map = {
        KeyQ: 0,
        KeyW: 1,
        KeyE: 2,
        KeyR: 3,
        KeyA: 4,
        KeyS: 5,
        KeyD: 6,
        KeyF: 7
      };
      if (code in map) {
        const idx = map[code];
        studio.padFlash[idx] = 1.0;
        playSynthClubSample(DJ_SAMPLE_PADS[idx].id, gCtx);
        return true;
      }
      return false;
    }

    function renderDjDeckCanvas(beat) {
      const cvs = studio.deckCanvas;
      if (!cvs) return;
      const g = cvs.getContext('2d');
      if (!g) return;
      const w = cvs.width;
      const h = cvs.height;

      g.fillStyle = '#070a16';
      g.fillRect(0, 0, w, h);

      // Draw Left & Right Pioneer-Style CDJ Jog Platters
      const platters = [
        { cx: 122, cy: 118, ang: studio.platterAngleL, col: '#06b6d4', title: 'DECK A • MASTER' },
        { cx: w - 122, cy: 118, ang: studio.platterAngleR, col: '#ec4899', title: 'DECK B • REMIX' }
      ];

      for (const pl of platters) {
        // Outer LED Jog Ring
        g.beginPath();
        g.arc(pl.cx, pl.cy, 82 + beat.kickPulse * 3, 0, Math.PI * 2);
        g.fillStyle = '#111827';
        g.fill();
        g.lineWidth = 4;
        g.strokeStyle = pl.col;
        g.stroke();

        // Vinyl Grooves
        for (let r = 32; r <= 72; r += 10) {
          g.beginPath();
          g.arc(pl.cx, pl.cy, r, 0, Math.PI * 2);
          g.strokeStyle = 'rgba(148, 163, 184, 0.16)';
          g.lineWidth = 1;
          g.stroke();
        }

        // Rotating Position Cue Marker
        g.save();
        g.translate(pl.cx, pl.cy);
        g.rotate(pl.ang);
        g.strokeStyle = '#fde047';
        g.lineWidth = 3.5;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(0, -76);
        g.stroke();

        g.fillStyle = pl.col;
        g.beginPath();
        g.arc(0, 0, 22, 0, Math.PI * 2);
        g.fill();
        g.restore();

        g.fillStyle = '#94a3b8';
        g.font = '800 10.5px Segoe UI, sans-serif';
        g.textAlign = 'center';
        g.fillText(pl.title, pl.cx, 22);
      }

      // Center 4-Channel Mixer VU Meter & BPM Readout
      const mixX = w * 0.5 - 38;
      g.fillStyle = '#0f172a';
      g.fillRect(mixX, 30, 76, 174);
      g.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      g.lineWidth = 1.5;
      g.strokeRect(mixX, 30, 76, 174);

      g.fillStyle = '#fde047';
      g.font = '900 13px Segoe UI, sans-serif';
      g.textAlign = 'center';
      g.fillText(`${beat.bpm} BPM`, w * 0.5, 50);

      // Stereo LED Peak Meters
      const segs = 12;
      const lvlL = Math.round((0.35 + beat.kickPulse * 0.62) * segs);
      const lvlR = Math.round((0.3 + beat.bassEnergy * 0.65) * segs);
      for (let s = 0; s < segs; s++) {
        const sy = 186 - s * 10;
        const segCol = s >= 10 ? '#ef4444' : s >= 7 ? '#fde047' : '#22c55e';
        g.fillStyle = s < lvlL ? segCol : 'rgba(255,255,255,0.08)';
        g.fillRect(w * 0.5 - 20, sy, 14, 7);
        g.fillStyle = s < lvlR ? segCol : 'rgba(255,255,255,0.08)';
        g.fillRect(w * 0.5 + 6, sy, 14, 7);
      }
    }

    function renderChuggingCanvas() {
      const cvs = studio.chugCanvas;
      if (!cvs) return;
      const g = cvs.getContext('2d');
      if (!g) return;
      const w = cvs.width;
      const h = cvs.height;

      g.fillStyle = '#090c1a';
      g.fillRect(0, 0, w, h);

      const oppName = CHUG_RIVALS[studio.chugOppIdx]?.name || 'Đối thủ';

      // Draw Player Stein (Left) & Opponent Stein (Right)
      const drawMugGauge = (x, label, remRatio, accent) => {
        const mw = 84;
        const mh = 152;
        const my = 46;
        g.fillStyle = 'rgba(30, 41, 59, 0.7)';
        g.fillRect(x, my, mw, mh);

        const fillH = mh * clamp(remRatio, 0, 1);
        const beerGrad = g.createLinearGradient(x, my + mh - fillH, x, my + mh);
        beerGrad.addColorStop(0, '#fde68a');
        beerGrad.addColorStop(1, '#d97706');
        g.fillStyle = beerGrad;
        g.fillRect(x + 4, my + mh - fillH, mw - 8, fillH);

        if (fillH > 8) {
          g.fillStyle = '#fffbeb';
          g.fillRect(x + 4, my + mh - fillH - 6, mw - 8, 8);
        }

        g.strokeStyle = accent;
        g.lineWidth = 2.8;
        g.strokeRect(x, my, mw, mh);

        g.fillStyle = '#f8fafc';
        g.font = '800 12px Segoe UI, sans-serif';
        g.textAlign = 'center';
        g.fillText(label, x + mw * 0.5, 28);
        g.fillStyle = accent;
        g.fillText(`Còn ${Math.round(remRatio * 100)}%`, x + mw * 0.5, my + mh + 18);
      };

      drawMugGauge(46, '👤 VẠI CỦA BẠN', studio.playerRemaining, '#4ade80');
      drawMugGauge(w - 130, `🤖 ${oppName}`, studio.aiRemaining, '#fb7185');

      // Center Balance Foam Sweet-Spot Column!
      const barX = w * 0.5 - 22;
      const barY = 42;
      const barW = 44;
      const barH = 160;

      g.fillStyle = '#0f172a';
      g.fillRect(barX, barY, barW, barH);
      g.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      g.lineWidth = 2;
      g.strokeRect(barX, barY, barW, barH);

      // Moving Green Sweet Zone
      const zHalf = studio.sweetZoneWidth * 0.5;
      const zTopNorm = clamp(studio.sweetZoneCenter + zHalf, 0, 1);
      const zBotNorm = clamp(studio.sweetZoneCenter - zHalf, 0, 1);
      const zy = barY + barH * (1 - zTopNorm);
      const zh = barH * (zTopNorm - zBotNorm);

      g.fillStyle = 'rgba(34, 197, 94, 0.38)';
      g.fillRect(barX + 2, zy, barW - 4, zh);
      g.strokeStyle = '#4ade80';
      g.strokeRect(barX + 2, zy, barW - 4, zh);

      // Player Foam Marker
      const markerY = barY + barH * (1 - clamp(studio.foamPressure, 0, 1));
      g.fillStyle = studio.spillStunTimer > 0 ? '#ef4444' : '#fde047';
      g.fillRect(barX - 5, markerY - 5, barW + 10, 10);

      g.fillStyle = '#cbd5e1';
      g.font = '800 10.5px Segoe UI, sans-serif';
      g.textAlign = 'center';
      g.fillText(studio.spillStunTimer > 0 ? 'SẶC BỌT!' : 'GIỮ TRONG Ô XANH', w * 0.5, 28);
    }

    function updateAndRender(dt, rawDt, beat, gCtx = ctx) {
      // Step 3D CO2 Cryo-Smoke Columns inside Túy Tiên Lâu
      if (studio.cryoTimer > 0) {
        studio.cryoTimer = Math.max(0, studio.cryoTimer - dt);
        const inside = isPlayerInsideNightclub(gCtx);
        studio.cryoGroup.visible = inside;
        const alpha = clamp(studio.cryoTimer / 1.2, 0, 1) * 0.42;
        for (let i = 0; i < studio.cryoCones.length; i++) {
          const c = studio.cryoCones[i];
          c.material.opacity = alpha * (0.75 + 0.25 * Math.sin(performance.now() * 0.025 + i));
          c.scale.set(0.85 + (1 - alpha) * 0.45, 1, 0.85 + (1 - alpha) * 0.45);
        }
      } else if (studio.cryoGroup.visible) {
        studio.cryoGroup.visible = false;
      }

      if (state.activeStation !== 'dj_booth') return;

      // Spin DJ Platters
      const baseSpin = rawDt * 2.8;
      studio.platterAngleL = (studio.platterAngleL + (studio.scratchingDeck === 1 ? studio.scratchVel : baseSpin)) % (Math.PI * 2);
      studio.platterAngleR = (studio.platterAngleR + (studio.scratchingDeck === 2 ? studio.scratchVel : baseSpin)) % (Math.PI * 2);
      studio.scratchVel *= Math.exp(-8 * rawDt);

      // Step Bar Chugging Balance Duel
      if (studio.chugActive) {
        studio.sweetPhase += rawDt * 1.65;
        studio.sweetZoneCenter = 0.52 + Math.sin(studio.sweetPhase) * 0.24;

        if (studio.spillStunTimer > 0) {
          studio.spillStunTimer = Math.max(0, studio.spillStunTimer - rawDt);
          studio.foamPressure = Math.max(0.15, studio.foamPressure - rawDt * 0.85);
        } else {
          if (studio.holdingDrink) {
            studio.foamPressure = Math.min(1.0, studio.foamPressure + rawDt * 0.92);
          } else {
            studio.foamPressure = Math.max(0.0, studio.foamPressure - rawDt * 0.78);
          }

          const inZone = Math.abs(studio.foamPressure - studio.sweetZoneCenter) <= studio.sweetZoneWidth * 0.54;
          if (inZone) {
            studio.playerRemaining = Math.max(0, studio.playerRemaining - rawDt * 0.255);
          } else if (studio.foamPressure >= 0.97) {
            // Over-foamed & choked for 0.65s!
            studio.spillStunTimer = 0.65;
            clubAudio.playHiccup();
          } else if (studio.holdingDrink) {
            studio.playerRemaining = Math.max(0, studio.playerRemaining - rawDt * 0.085);
          }
        }

        const rival = CHUG_RIVALS[studio.chugOppIdx] || CHUG_RIVALS[1];
        const aiWave = 0.78 + 0.38 * Math.sin(studio.sweetPhase * 2.3);
        studio.aiRemaining = Math.max(0, studio.aiRemaining - rawDt * rival.drinkRate * aiWave);

        if (studio.playerRemaining <= 0) {
          finishChuggingDuel(true, gCtx);
        } else if (studio.aiRemaining <= 0) {
          finishChuggingDuel(false, gCtx);
        }
      }

      renderDjDeckCanvas(beat);
      renderChuggingCanvas();
    }

    return {
      state: studio,
      bindDOM,
      triggerPadByKey,
      startChuggingDuel,
      updateAndRender
    };
  }

  const djStudio = createDjAndChuggingStudio();

  // ============================================================================
  // STATION ROUTING, MODAL LIFECYCLE, KEYBOARD SHORTCUTS & MAIN UPDATE LOOP
  // ============================================================================
  function normalizeStationName(stationTypeOrObj) {
    const raw =
      stationTypeOrObj && typeof stationTypeOrObj === 'object'
        ? stationTypeOrObj.type || stationTypeOrObj.station || stationTypeOrObj.id || ''
        : String(stationTypeOrObj || '');
    const k = raw.trim().toLowerCase();
    if (k.includes('dj') || k.includes('turntable') || k.includes('chug')) return 'dj_booth';
    if (k.includes('dance') || k.includes('rhythm')) return 'dancefloor';
    if (k.includes('pool') || k.includes('billiard')) return 'pool_table';
    if (k.includes('dart')) return 'darts_board';
    if (k.includes('vip') || k.includes('safe') || k.includes('bouncer') || k.includes('manage')) return 'vip_desk';
    return 'bar_counter';
  }

  function switchDjTrack(nextIdx, gCtx = ctx) {
    state.djTrackIndex = ((Number(nextIdx) || 0) % DJ_TRACKS.length + DJ_TRACKS.length) % DJ_TRACKS.length;
    const tr = DJ_TRACKS[state.djTrackIndex];
    if (dom.headerTrackBtn) {
      dom.headerTrackBtn.textContent = `🎧 DJ Mix #${state.djTrackIndex + 1}: ${tr.shortLabel}`;
    }
    if (dom.danceTrackSelect) {
      dom.danceTrackSelect.value = String(state.djTrackIndex);
    }
    saveNightlifeState();
    syncHeaderTelemetry(gCtx);
    return tr;
  }

  function syncHeaderTelemetry(gCtx = ctx) {
    if (!dom.modalRoot) return;
    const p = gCtx?.player;
    if (dom.headerCash) dom.headerCash.textContent = formatCash(getPlayerCash(gCtx));
    if (dom.headerHp) dom.headerHp.textContent = `❤️ ${Math.round(Number(p?.hp) || 100)} HP`;
    if (dom.headerDrunk) dom.headerDrunk.textContent = `🍺 Cồn: ${Math.round(state.drunkLevel)}%`;
    if (dom.headerPop) dom.headerPop.textContent = `🔥 Độ Hot: ${Math.round(state.clubPopularity)}%`;
    const tr = DJ_TRACKS[state.djTrackIndex] || DJ_TRACKS[0];
    if (dom.headerTrackBtn) {
      dom.headerTrackBtn.textContent = `🎧 DJ Mix #${state.djTrackIndex + 1}: ${tr.shortLabel}`;
    }
  }

  function activateTab(tabKey, gCtx = ctx) {
    const normalized = normalizeStationName(tabKey);
    state.activeStation = normalized;

    for (const [k, btn] of Object.entries(dom.tabButtons)) {
      if (btn) btn.classList.toggle('active', k === normalized);
    }
    for (const [k, pnl] of Object.entries(dom.panels)) {
      if (pnl) pnl.classList.toggle('active', k === normalized);
    }

    if (dom.modalRoot) {
      dom.modalRoot.classList.toggle('dance-transparent', normalized === 'dancefloor');
    }

    // Toggle live 3D character dancing on the LED floor when Dancefloor tab is active
    if (normalized === 'dancefloor') {
      clubStage3D.setPlayerDanceActive(true, clubStage3D.activeDanceMoveIdx, gCtx);
    } else {
      clubStage3D.setPlayerDanceActive(false, clubStage3D.activeDanceMoveIdx, gCtx);
    }

    if (normalized === 'bar_counter') {
      refreshBarMenuSelectionUI();
      renderBartenderStage(performance.now() * 0.001);
    } else if (normalized === 'vip_desk') {
      refreshVipManagementDOM(gCtx);
    }

    syncHeaderTelemetry(gCtx);
  }

  function openBarStation(stationType = 'bar_counter', extraOpts, gCtx = ctx) {
    const activeCtx = getActiveCtx(gCtx);
    init(activeCtx);
    if (state.blackoutActive) return false;
    if (state.openCloseGuardTimer > 0 && state.isOpen) {
      const targetTab = normalizeStationName(stationType);
      if (targetTab !== state.activeStation) activateTab(targetTab, activeCtx);
      return true;
    }

    clubAudio.unlock(activeCtx);

    // Release Pointer Lock cleanly so mouse cursor can interact with Bar/Pool/Phi Tiêu UI
    if (typeof document !== 'undefined' && document.pointerLockElement && typeof document.exitPointerLock === 'function') {
      try {
        document.exitPointerLock();
      } catch (_) {}
    }

    state.isOpen = true;
    state.openCloseGuardTimer = 0.28;
    activeCtx.activeModal = 'bar';
    if (ctx && ctx !== activeCtx) ctx.activeModal = 'bar';

    const targetTab = normalizeStationName(stationType);
    if (dom.modalRoot) {
      dom.modalRoot.classList.add('open');
    }
    activateTab(targetTab, activeCtx);
    return true;
  }

  function closeBarStation(gCtx = ctx) {
    const activeCtx = getActiveCtx(gCtx);
    if (!state.isOpen && activeCtx?.activeModal !== 'bar') return false;

    // Auto-bank any unsaved dancefloor points if player closes Dancefloor mid-set
    if (danceGame.state.playing && danceGame.state.score >= 300) {
      danceGame.finishAndRewardSession(activeCtx, true);
    } else {
      danceGame.state.playing = false;
    }

    clubStage3D.setPlayerDanceActive(false, 0, activeCtx);
    state.isOpen = false;
    state.activeStation = null;
    state.openCloseGuardTimer = 0.25;

    if (activeCtx && activeCtx.activeModal === 'bar') {
      activeCtx.activeModal = null;
    }
    if (ctx && ctx.activeModal === 'bar') {
      ctx.activeModal = null;
    }

    if (dom.modalRoot) {
      dom.modalRoot.classList.remove('open', 'dance-transparent');
    }
    return true;
  }

  function findNearbyClubStation(px, pz, gCtx = ctx) {
    // 1. Query ctx.casinoWorld.getInteractiveStationNear(px, pz) first if available!
    if (typeof gCtx?.casinoWorld?.getInteractiveStationNear === 'function') {
      try {
        const cwSt = gCtx.casinoWorld.getInteractiveStationNear(px, pz);
        if (cwSt) {
          const t = String(cwSt.type || cwSt.station || cwSt.id || '').toLowerCase();
          if (
            t.includes('bar') ||
            t.includes('dance') ||
            t.includes('pool') ||
            t.includes('dart') ||
            t.includes('vip') ||
            t.includes('bouncer')
          ) {
            const mapped = normalizeStationName(cwSt);
            return STATION_COORDS[mapped] || { ...cwSt, type: mapped };
          }
        }
      } catch (_) {}
    }

    // 2. Built-in Túy Tiên Lâu (1500, 0, 1500) Station Proximity Check
    let best = null;
    let bestDist = Infinity;
    for (const st of Object.values(STATION_COORDS)) {
      const d = Math.hypot(px - st.x, pz - st.z);
      if (d <= st.radius && d < bestDist) {
        bestDist = d;
        best = st;
      }
    }
    return best;
  }

  let domEventsBound = false;

  function bindGlobalEvents(gCtx = ctx) {
    if (domEventsBound || typeof window === 'undefined') return;
    domEventsBound = true;

    dom.closeBtn?.addEventListener('click', () => closeBarStation(gCtx));
    dom.headerTrackBtn?.addEventListener('click', () => {
      clubAudio.unlock(gCtx);
      switchDjTrack(state.djTrackIndex + 1, gCtx);
    });

    for (const [tabKey, btn] of Object.entries(dom.tabButtons)) {
      btn?.addEventListener('click', () => activateTab(tabKey, gCtx));
    }

    // Bar Counter Action Buttons
    dom.btnOrderDrink?.addEventListener('click', () => {
      drinkCocktail(state.selectedDrinkId, false, gCtx);
    });
    dom.btnTipBartender?.addEventListener('click', () => {
      if (!spendPlayerCash(25, gCtx)) {
        notifyClub('Bạn cần ít nhất $25 tiền lẻ để bo cho Bartender!', 2.6, gCtx);
        return;
      }
      state.clubPopularity = clamp(state.clubPopularity + 2, 0, 100);
      const rumor = pickRandom(BARTENDER_RUMORS);
      if (dom.barQuoteBox) dom.barQuoteBox.textContent = rumor;
      notifyClub(rumor, 4.5, gCtx);
      syncHeaderTelemetry(gCtx);
    });
    dom.btnBuyRound?.addEventListener('click', () => {
      if (!spendPlayerCash(500, gCtx)) {
        notifyClub('Cần $500 để mời toàn bộ khách trong Túy Tiên Lâu 1 chầu rượu!', 3.0, gCtx);
        clubAudio.playArcadeLoseBuzzer();
        return;
      }
      state.clubPopularity = clamp(state.clubPopularity + 12, 0, 100);
      clubAudio.playChampagnePopAndSparkler();
      clubStage3D.emitGoldenConfetti(CLUB_CENTER_X, 5.8, 1498.0, 50);
      if (dom.barQuoteBox) {
        dom.barQuoteBox.textContent = '🥂 CẢ HỘP ĐÊM REO HÒ: "Cạn ly vì Đại gia hào phóng nhất Tiên Thành!!" (+12% Độ Hot Túy Tiên Lâu)';
      }
      notifyClub('🥂 Đã khao cả quán 1 chầu lớn! Độ Hot Túy Tiên Lâu tăng +12%!', 3.8, gCtx);
      saveNightlifeState();
      syncHeaderTelemetry(gCtx);
    });

    // VIP Management Action Buttons
    dom.btnBuyClub?.addEventListener('click', () => buyClub(gCtx));
    dom.btnCollectSafe?.addEventListener('click', () => collectSafeIncome(gCtx));
    dom.btnPromoteClub?.addEventListener('click', () => promoteClub(gCtx));

    // Sub-Minigames DOM Wiring
    danceGame.bindDOM(gCtx);
    poolGame.bindDOM(gCtx);
    dartsGame.bindDOM(gCtx);
    djStudio.bindDOM(gCtx);

    // Keyboard Handler for Modal Controls & Clean Escape Exit
    window.addEventListener(
      'keydown',
      (ev) => {
        if (!state.isOpen) return;

        if (ev.code === 'Escape') {
          ev.preventDefault();
          ev.stopImmediatePropagation();
          closeBarStation(gCtx);
          return;
        }

        // Ignore shortcuts if typing inside a numeric wager input
        const tag = ev.target?.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

        if (state.activeStation === 'dancefloor') {
          if (ev.code === 'KeyA' || ev.code === 'ArrowLeft') {
            ev.preventDefault();
            danceGame.pressLane(0, gCtx);
          } else if (ev.code === 'KeyS' || ev.code === 'ArrowDown') {
            ev.preventDefault();
            danceGame.pressLane(1, gCtx);
          } else if (ev.code === 'KeyW' || ev.code === 'ArrowUp') {
            ev.preventDefault();
            danceGame.pressLane(2, gCtx);
          } else if (ev.code === 'KeyD' || ev.code === 'ArrowRight') {
            ev.preventDefault();
            danceGame.pressLane(3, gCtx);
          } else if (ev.code >= 'Digit1' && ev.code <= 'Digit6') {
            ev.preventDefault();
            danceGame.selectDanceMove(parseInt(ev.code.slice(5), 10) - 1);
          } else if (ev.code === 'Enter' || (ev.code === 'Space' && !danceGame.state.playing)) {
            ev.preventDefault();
            danceGame.startSession(gCtx);
          }
        } else if (state.activeStation === 'pool_table') {
          if (ev.code === 'ArrowLeft' || ev.code === 'KeyA') {
            ev.preventDefault();
            poolGame.state.aimAngle -= ev.shiftKey ? 0.008 : 0.032;
          } else if (ev.code === 'ArrowRight' || ev.code === 'KeyD') {
            ev.preventDefault();
            poolGame.state.aimAngle += ev.shiftKey ? 0.008 : 0.032;
          } else if (ev.code === 'Space' && !ev.repeat) {
            ev.preventDefault();
            if (poolGame.state.phase === 'aiming' && poolGame.state.turn === 'player') {
              poolGame.state.chargingPower = true;
              poolGame.state.dragStartX = poolGame.state.mouseCanvasX;
              poolGame.state.dragStartY = poolGame.state.mouseCanvasY;
              poolGame.state.chargeOscPhase = 0;
            }
          }
        } else if (state.activeStation === 'darts_board') {
          const step = 10;
          if (ev.code === 'ArrowLeft' || ev.code === 'KeyA') {
            ev.preventDefault();
            dartsGame.state.baseAimX = clamp(dartsGame.state.baseAimX - step, 30, 515);
          } else if (ev.code === 'ArrowRight' || ev.code === 'KeyD') {
            ev.preventDefault();
            dartsGame.state.baseAimX = clamp(dartsGame.state.baseAimX + step, 30, 515);
          } else if (ev.code === 'ArrowUp' || ev.code === 'KeyW') {
            ev.preventDefault();
            dartsGame.state.baseAimY = clamp(dartsGame.state.baseAimY - step, 30, 490);
          } else if (ev.code === 'ArrowDown' || ev.code === 'KeyS') {
            ev.preventDefault();
            dartsGame.state.baseAimY = clamp(dartsGame.state.baseAimY + step, 30, 490);
          } else if (ev.code === 'Space' && !ev.repeat) {
            ev.preventDefault();
            if (!dartsGame.state.matchActive) dartsGame.startNewDartsMatch(false, gCtx);
            dartsGame.beginPlayerCharge();
          }
        } else if (state.activeStation === 'bar_counter') {
          if (ev.code >= 'Digit1' && ev.code <= 'Digit8') {
            ev.preventDefault();
            const d = COCKTAIL_MENU[parseInt(ev.code.slice(5), 10) - 1];
            if (d) {
              state.selectedDrinkId = d.id;
              refreshBarMenuSelectionUI();
            }
          } else if (ev.code === 'Enter') {
            ev.preventDefault();
            drinkCocktail(state.selectedDrinkId, false, gCtx);
          }
        } else if (state.activeStation === 'dj_booth') {
          if (ev.code === 'Space') {
            ev.preventDefault();
            if (!djStudio.state.chugActive && !ev.repeat) {
              djStudio.startChuggingDuel(gCtx);
            }
            djStudio.state.holdingDrink = true;
          } else if (!ev.repeat && djStudio.triggerPadByKey(ev.code, gCtx)) {
            ev.preventDefault();
          }
        }
      },
      true
    );

    window.addEventListener('keyup', (ev) => {
      if (!state.isOpen) return;
      if (ev.code === 'Space') {
        if (state.activeStation === 'pool_table' && poolGame.state.chargingPower && poolGame.state.phase === 'aiming') {
          poolGame.executeCueStrike(poolGame.state.aimAngle, Math.max(0.18, poolGame.state.shotPower));
        } else if (state.activeStation === 'darts_board' && dartsGame.state.charging) {
          dartsGame.releasePlayerCharge();
        } else if (state.activeStation === 'dj_booth') {
          djStudio.state.holdingDrink = false;
        }
      }
    });
  }

  function init(overrideCtx) {
    const activeCtx = getActiveCtx(overrideCtx);
    if (!state.initialized) {
      state.initialized = true;
      loadNightlifeState();
    }
    if (ensureNightlifeDOM()) {
      populateBarMenuDOM();
      refreshVipManagementDOM(activeCtx);
      bindGlobalEvents(activeCtx);
    }
    clubStage3D.ensureBuilt(activeCtx);
    return api;
  }

  let vipRefreshAccum = 0;

  function update(dtArg = 0.016, rawDtArg, maybeCtx) {
    const activeCtx =
      rawDtArg && typeof rawDtArg === 'object'
        ? rawDtArg
        : maybeCtx && typeof maybeCtx === 'object'
        ? maybeCtx
        : ctx;

    const dt = clamp(Number(dtArg) || 0.016, 0.0005, 0.1);
    const rawDt =
      typeof rawDtArg === 'number' && Number.isFinite(rawDtArg) && rawDtArg > 0
        ? clamp(rawDtArg, 0.0005, 0.1)
        : dt;

    if (!state.initialized) {
      init(activeCtx);
    }

    if (state.openCloseGuardTimer > 0) {
      state.openCloseGuardTimer = Math.max(0, state.openCloseGuardTimer - rawDt);
    }

    // 1. Step Procedural Multi-Track Túy Tiên Lâu Nhạc Hội / House / Techno Synthesizer
    clubAudio.update(rawDt, activeCtx);
    const beat = clubAudio.getBeatState();

    // 2. Step Passive Túy Tiên Lâu Safe Income (+$2,500+ every 3 minutes when owned!)
    if (state.clubOwned && !activeCtx?.paused) {
      const floor = getPopularityFloor();
      if (state.clubPopularity > floor) {
        state.clubPopularity = Math.max(floor, state.clubPopularity - dt * 0.018);
      }

      state.safeIncomeTimer -= dt;
      if (state.safeIncomeTimer <= 0) {
        state.safeIncomeTimer = state.safeIncomeInterval;
        const payout = computeSafeCyclePayout();
        if (state.safeBalance < state.safeMaxCapacity) {
          const prev = state.safeBalance;
          state.safeBalance = Math.min(state.safeMaxCapacity, state.safeBalance + payout);
          const added = state.safeBalance - prev;
          if (added > 0) {
            saveNightlifeState();
            activeCtx?.ui?.showNotification?.(
              `💼 Túy Tiên Lâu vừa chuyển +${formatCash(added)} doanh thu vào Két Sắt VIP (Tổng: ${formatCash(state.safeBalance)})!`
            );
          }
        }
      }
    }

    // 3. Step Bartender Pouring Stage Animation if Bar Modal is Open
    if (state.pouringAnim.active) {
      state.pouringAnim.progress += rawDt / state.pouringAnim.duration;
      if (state.pouringAnim.progress >= 1.0) {
        state.pouringAnim.active = false;
        state.pouringAnim.progress = 1.0;
      }
    }

    // 4. Step 3D Túy Tiên Lâu Stage, Crowd Circle, Lasers, Bottle-Girl Parade & Player Dance Pose
    const hypeNorm = state.activeStation === 'dancefloor' ? danceGame.hypeNorm : clamp(state.clubPopularity / 100, 0.25, 1);
    clubStage3D.update(dt, beat, hypeNorm, activeCtx);
    djStudio.updateAndRender(dt, rawDt, beat, activeCtx);

    // 5. Step Active Modal UI & Minigames
    if (state.isOpen) {
      if (activeCtx && activeCtx.activeModal !== 'bar') {
        activeCtx.activeModal = 'bar';
      }
      const nowSec = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;

      if (state.activeStation === 'bar_counter') {
        renderBartenderStage(nowSec);
      } else if (state.activeStation === 'dancefloor') {
        danceGame.updateAndRender(rawDt, beat, activeCtx);
      } else if (state.activeStation === 'pool_table') {
        poolGame.updateAndRender(rawDt, nowSec, activeCtx);
      } else if (state.activeStation === 'darts_board') {
        dartsGame.updateAndRender(rawDt, activeCtx);
      } else if (state.activeStation === 'vip_desk') {
        vipRefreshAccum += rawDt;
        if (vipRefreshAccum >= 0.5) {
          vipRefreshAccum = 0;
          refreshVipManagementDOM(activeCtx);
        }
      }

      syncHeaderTelemetry(activeCtx);
    } else if (
      !state.blackoutActive &&
      !activeCtx?.paused &&
      activeCtx?.started &&
      !activeCtx?.activeModal &&
      isPlayerInsideNightclub(activeCtx)
    ) {
      // 6. Contextual Station Prompt & [F] / [E] Trigger inside Túy Tiên Lâu (1500, 0, 1500)
      const p = activeCtx.player;
      if (p && !p.inCar) {
        const nearSt = findNearbyClubStation(p.x, p.z, activeCtx);
        if (nearSt) {
          activeCtx.ui?.showPrompt?.(nearSt.prompt || `Nhấn [F] để mở ${nearSt.label || 'Túy Tiên Lâu'}`);
          const trig = Boolean(
            activeCtx.input?.interactJustPressed ||
              activeCtx.input?.secondaryInteractJustPressed ||
              activeCtx.input?.shopInteractJustPressed ||
              activeCtx.input?.interactGJustPressed
          );
          if (trig && state.openCloseGuardTimer <= 0) {
            openBarStation(nearSt.type, nearSt, activeCtx);
          }
        }
      }
    }

    // 7. Step Bouncer Security & Bar Brawl Missions
    updateBouncerMission(dt, rawDt, activeCtx);

    // 8. Step Macbeth 100% Say Ngất Sequence & World Drunk Camera / Stumble / DUI Physics
    updateBlackoutSequence(rawDt, activeCtx);
    updateWorldIntoxicationEffects(dt, rawDt, activeCtx);
  }

  const api = {
    init,
    update,
    openBarStation,
    closeBarStation,
    closeStation: closeBarStation,
    drinkCocktail,
    buyClub,
    collectSafeIncome,
    buyClubUpgrade,
    promoteClub,
    startBouncerMission,
    triggerBlackout,
    switchDjTrack,
    soberUp() {
      state.drunkLevel = 0;
      state.drunkPeakHoldTimer = 0;
      if (dom.drunkOverlay) dom.drunkOverlay.classList.remove('active');
      if (dom.drunkBadge) dom.drunkBadge.classList.remove('visible');
    },
    get drunkLevel() {
      return Math.round(state.drunkLevel * 10) / 10;
    },
    set drunkLevel(val) {
      state.drunkLevel = clamp(Number(val) || 0, 0, 100);
      if (state.drunkLevel >= 100 && !state.blackoutActive) {
        triggerBlackout('max_bac', ctx);
      }
    },
    get clubPopularity() {
      return Math.round(state.clubPopularity * 10) / 10;
    },
    set clubPopularity(val) {
      state.clubPopularity = clamp(Number(val) || 0, 0, 100);
    },
    get isOpen() {
      return Boolean(state.isOpen);
    },
    get activeStation() {
      return state.activeStation;
    },
    get clubOwned() {
      return Boolean(state.clubOwned);
    },
    get safeBalance() {
      return Math.round(state.safeBalance);
    },
    menu: COCKTAIL_MENU,
    tracks: DJ_TRACKS,
    stations: STATION_COORDS,
    danceGame,
    poolGame,
    dartsGame,
    djStudio,
    audio: clubAudio,
    state
  };

  if (ctx && typeof ctx === 'object') {
    ctx.nightlife = api;
  }

  return api;
}
