import * as THREE from 'three';

/**
 * Vạn Bảo Đổ Phường & Resort — Complete Interactive Gambling & "Đỏ Đen" Suite
 * Owned exclusively by @casino_games (src/casino_games.js)
 *
 * Stations included (100% Vietnamese Luxury Gold & Crimson Velvet UI + High-DPI Canvas):
 *  1. cashier     — Quầy Thu Ngân, Thượng Lưu VIP & Tín Dụng Đen Mafia (Loan Shark + Outdoor Enforcers)
 *  2. taixiu      — Tài Xỉu Lắc Xí Ngầu Đỏ Đen (Nặn Bát Từ Từ + Soi Cầu 40 Phiên + Đồng Đạo)
 *  3. xocdia      — Xóc Đĩa Đỏ Đen Truyền Thống (4 Quân Vị Đỏ/Trắng + Nặn Đĩa + Cầu Chẵn Lẻ)
 *  4. roulette    — Bàn Quay Roulette Châu Âu 0–36 (Vật Lý Bóng Ngà + Đủ Cược Trong/Ngoài)
 *  5. blackjack   — Xì Dách Hoàng Gia / Blackjack 21 (6 Bộ Bài, Tách Bài, Gấp Đôi, Bảo Hiểm, Ngũ Linh, 21+3)
 *  6. poker       — Texas Hold'em Poker Thượng Lưu (Đấu 4 Cao Thủ AI Cá Tính + Chấm Bài 7 Lá Chuẩn)
 *  7. baccarat    — Baccarat Hoàng Gia Punto Banco (Luật Lá Thứ 3 Chuẩn Macau + Nặn Bài Kịch Tính)
 *  8. slots       — Máy Xèng Kim Cương DIAMOND 777 (5 Cuộn × 3 Hàng, 20 Dòng, Fever x3 & Mega Jackpot)
 *  9. derby       — Cá Cược Đua Ngựa & Siêu Xe Inside Track (6 Tay Đua, Tỷ Lệ Cược, Photo-Finish)
 * 10. lucky_wheel — Vòng Quay Kim Cương 20 Ô (1 Lượt Miễn Phí/Ngày + Giải Đặc Biệt Siêu Xe Vàng Podium)
 */

export function createCasinoGames(ctx) {
  let activeCtx = ctx || {};

  const STORAGE_KEY = 'gtav_diamond_casino_suite_v1';
  const LOAN_DURATION_SEC = 360; // 6 in-game minutes before Mafia Enforcers hunt player outdoors
  const LOAN_INTEREST_RATE = 0.15;

  const CHIP_DENOMS = [
    { value: 10, label: '10', base: '#2b6cb0', rim: '#90cdf4', text: '#ffffff' },
    { value: 50, label: '50', base: '#2f855a', rim: '#9ae6b4', text: '#ffffff' },
    { value: 100, label: '100', base: '#1a202c', rim: '#cbd5e0', text: '#f6e05e' },
    { value: 500, label: '500', base: '#6b46c1', rim: '#d6bcfa', text: '#ffffff' },
    { value: 1000, label: '1K', base: '#d69e2e', rim: '#fefcbf', text: '#1a202c' },
    { value: 5000, label: '5K', base: '#c53030', rim: '#fed7d7', text: '#fde047' },
    { value: 25000, label: '25K', base: '#b7791f', rim: '#fffbeb', text: '#ffffff' }
  ];

  const VIP_TIERS = [
    {
      id: 'dong',
      name: 'Đồng',
      badge: '🥉 Hạng Đồng',
      minPoints: 0,
      rebateRate: 0.005,
      maxLoan: 15000,
      dailyBonus: 1500,
      color: '#cd7f32',
      accent: '#fbd38d'
    },
    {
      id: 'bac',
      name: 'Bạc',
      badge: '🥈 Hạng Bạc',
      minPoints: 2500,
      rebateRate: 0.01,
      maxLoan: 25000,
      dailyBonus: 2500,
      color: '#cbd5e1',
      accent: '#f8fafc'
    },
    {
      id: 'vang',
      name: 'Vàng',
      badge: '🥇 Hạng Vàng',
      minPoints: 10000,
      rebateRate: 0.02,
      maxLoan: 35000,
      dailyBonus: 5000,
      color: '#eab308',
      accent: '#fef08a'
    },
    {
      id: 'kim_cuong',
      name: 'Kim Cương',
      badge: '💎 Kim Cương',
      minPoints: 35000,
      rebateRate: 0.035,
      maxLoan: 45000,
      dailyBonus: 10000,
      color: '#38bdf8',
      accent: '#e0f2fe'
    },
    {
      id: 'bo_gia',
      name: 'Bố Già',
      badge: '👑 Bố Già Thượng Lưu',
      minPoints: 100000,
      rebateRate: 0.05,
      maxLoan: 50000,
      dailyBonus: 22000,
      color: '#f59e0b',
      accent: '#fffbeb'
    }
  ];

  const STATION_ORDER = [
    'cashier',
    'taixiu',
    'xocdia',
    'roulette',
    'blackjack',
    'poker',
    'baccarat',
    'slots',
    'derby',
    'lucky_wheel'
  ];

  const STATION_META = {
    cashier: {
      id: 'cashier',
      shortLabel: '🪙 Thu Ngân & Vay',
      title: 'QUẦY THU NGÂN, VIP & TÍN DỤNG ĐEN',
      subtitle: 'Đổi Tiền Mặt ↔ Phỉnh 1:1 • Đặc Quyền Thượng Lưu • Vay Nóng Mafia',
      minBet: 0,
      maxBet: 50000,
      theme: '#3b1522'
    },
    taixiu: {
      id: 'taixiu',
      shortLabel: '🎲 Tài Xỉu Nặn Cầu',
      title: 'TÀI XỈU LẮC XÍ NGẦU ĐỎ ĐEN VIP',
      subtitle: 'Nặn Bát Từ Từ Kịch Tính • Bão 1:150 • Bảng Soi Cầu 40 Phiên',
      minBet: 10,
      maxBet: 100000,
      theme: '#5a1018'
    },
    xocdia: {
      id: 'xocdia',
      shortLabel: '🔴 Xóc Đĩa VIP',
      title: 'XÓC ĐĨA ĐỎ ĐEN TRUYỀN THỐNG',
      subtitle: '4 Quân Vị Đỏ Trắng • Nặn Đĩa Kéo Tay • Tứ Tử 1:12 • Cầu Chẵn Lẻ',
      minBet: 10,
      maxBet: 100000,
      theme: '#4c0d16'
    },
    roulette: {
      id: 'roulette',
      shortLabel: '🎡 Roulette 0–36',
      title: 'BÀN QUAY ROULETTE ĐỎ ĐEN CHÂU ÂU',
      subtitle: 'Bánh Xe Gỗ Gụ & Đồng Thau • Cược Thẳng 35:1, Đôi 17:1, Góc 8:1',
      minBet: 10,
      maxBet: 100000,
      theme: '#0d3b26'
    },
    blackjack: {
      id: 'blackjack',
      shortLabel: '🂡 Xì Dách 21',
      title: 'XÌ DÁCH HOÀNG GIA • BLACKJACK 21',
      subtitle: 'Hộp 6 Bộ Bài • Xì Dách 3:2 • Ngũ Linh 2:1 • Tách Bài & Cược Phụ 21+3',
      minBet: 25,
      maxBet: 50000,
      theme: '#0e422b'
    },
    poker: {
      id: 'poker',
      shortLabel: '♠️ Hold\'em Poker',
      title: 'TEXAS HOLD\'EM POKER THƯỢNG LƯU',
      subtitle: 'Đấu Trí 4 Đại Gia AI • Thùng Phá Sảnh, Tứ Quý, Cù Lũ • Bluff Kịch Tính',
      minBet: 50,
      maxBet: 100000,
      theme: '#103828'
    },
    baccarat: {
      id: 'baccarat',
      shortLabel: '👑 Baccarat Nặn Bài',
      title: 'BACCARAT HOÀNG GIA PUNTO BANCO',
      subtitle: 'Nhà Con 1:1 • Nhà Cái 1:0.95 • Hòa 1:8 • Đôi 1:11 • Nặn Góc Bài Macau',
      minBet: 25,
      maxBet: 100000,
      theme: '#163529'
    },
    slots: {
      id: 'slots',
      shortLabel: '🎰 Máy Xèng 777',
      title: 'MÁY XÈNG KIM CƯƠNG • DIAMOND 777',
      subtitle: '5 Cuộn × 3 Hàng • 20 Dòng Thắng • 3 Scatter = 10 Vòng Fever x3 • Mega Jackpot',
      minBet: 10,
      maxBet: 10000,
      theme: '#28113b'
    },
    derby: {
      id: 'derby',
      shortLabel: '🏇 Đua Ngựa / Xe',
      title: 'CÁ CƯỢC INSIDE TRACK • ĐUA NGỰA & SIÊU XE',
      subtitle: '6 Chiến Mã & Siêu Xe Turbo • Cược Đơn & Cược Cặp Nhất-Nhì • Camera Photo-Finish',
      minBet: 20,
      maxBet: 50000,
      theme: '#102b3f'
    },
    lucky_wheel: {
      id: 'lucky_wheel',
      shortLabel: '💎 Vòng Quay 20 Ô',
      title: 'VÒNG QUAY KIM CƯƠNG THƯỢNG LƯU',
      subtitle: 'Miễn Phí Mỗi Ngày • Cơ Hội Trúng Siêu Xe Vàng Hoàng Gia Ngoài Sảnh Casino!',
      minBet: 0,
      maxBet: 1000,
      theme: '#311442'
    }
  };

  const VALID_CASINO_STATIONS = new Set([
    ...STATION_ORDER,
    'wheel',
    'luckywheel',
    'inside_track',
    'insidetrack',
    'sicbo',
    'slot',
    'holdem',
    'vip',
    'loan'
  ]);

  function normalizeStationId(raw) {
    if (!raw) return 'cashier';
    const s = String(typeof raw === 'object' ? (raw.type || raw.station || raw.id || '') : raw)
      .trim()
      .toLowerCase();
    if (STATION_META[s]) return s;
    if (s === 'wheel' || s === 'luckywheel') return 'lucky_wheel';
    if (s === 'inside_track' || s === 'insidetrack' || s === 'horse' || s === 'race') return 'derby';
    if (s === 'sicbo' || s === 'tai_xiu') return 'taixiu';
    if (s === 'xoc_dia') return 'xocdia';
    if (s === 'slot' || s === 'slots_777') return 'slots';
    if (s === 'holdem' || s === 'texas_poker') return 'poker';
    if (s === 'vip' || s === 'loan' || s === 'cage') return 'cashier';
    return STATION_META[s] ? s : 'cashier';
  }

  function isCasinoStationCandidate(stationObj) {
    if (!stationObj) return false;
    const rawType = String(stationObj.type || stationObj.station || stationObj.id || '').toLowerCase();
    // Explicitly exclude Nightclub / Bar stations owned by nightlife_bar.js
    if (
      rawType === 'bar_counter' ||
      rawType === 'dancefloor' ||
      rawType === 'pool_table' ||
      rawType === 'darts_board' ||
      rawType.includes('bar') ||
      rawType.includes('pool') ||
      rawType.includes('dart') ||
      rawType.includes('dance')
    ) {
      return false;
    }
    return VALID_CASINO_STATIONS.has(rawType);
  }

  // ============================================================================
  // SHARED MATH & FORMATTING HELPERS
  // ============================================================================
  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(e0, e1, x) {
    const t = clamp((x - e0) / Math.max(1e-6, e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function easeOutCubic(t) {
    const u = 1 - clamp(t, 0, 1);
    return 1 - u * u * u;
  }

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    const u = clamp(t, 0, 1) - 1;
    return 1 + c3 * u * u * u + c1 * u * u;
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randFloat(min, max) {
    return min + Math.random() * (max - min);
  }

  function pickRandom(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function formatNum(n) {
    const val = Math.round(Number(n) || 0);
    return val.toLocaleString('vi-VN');
  }

  function formatChips(n) {
    return `${formatNum(n)} Phỉnh`;
  }

  function formatCash(n) {
    const val = Math.round(Number(n) || 0);
    const sign = val < 0 ? '-' : '';
    return `${sign}$${Math.abs(val).toLocaleString('en-US')}`;
  }

  function todayStamp() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  // ============================================================================
  // PERSISTENT WALLET, VIP PROGRESSION & GAME STATE
  // ============================================================================
  const state = {
    chips: 2500,
    vipPoints: 0,
    vipRebatePool: 0,
    podiumWon: false,
    podiumSpawnedSession: false,
    loanDebt: 0,
    loanPrincipal: 0,
    loanTimer: 0,
    loanOverdue: false,
    lastVisitorDay: '',
    lastFreeWheelDay: '',
    selectedChip: 100,
    activeStation: 'cashier',
    stationContext: null,
    isOpen: false,
    progressiveJackpot: 250000,
    stats: {
      totalWagered: 0,
      totalWon: 0,
      biggestSingleWin: 0,
      roundsPlayed: 0,
      taixiuPlayed: 0,
      xocdiaPlayed: 0,
      roulettePlayed: 0,
      blackjackPlayed: 0,
      pokerPlayed: 0,
      baccaratPlayed: 0,
      slotsSpins: 0,
      derbyRaces: 0,
      wheelSpins: 0,
      loansRepaid: 0
    },
    histories: {
      taixiu: [],
      xocdia: [],
      roulette: [],
      baccarat: []
    }
  };

  function seedInitialHistories() {
    if (state.histories.taixiu.length === 0) {
      for (let i = 0; i < 24; i++) {
        const d1 = randInt(1, 6);
        const d2 = randInt(1, 6);
        const d3 = randInt(1, 6);
        const sum = d1 + d2 + d3;
        const triple = d1 === d2 && d2 === d3;
        state.histories.taixiu.push({
          dice: [d1, d2, d3],
          sum,
          triple,
          outcome: triple ? 'BAO' : sum >= 11 ? 'TAI' : 'XIU'
        });
      }
    }
    if (state.histories.xocdia.length === 0) {
      for (let i = 0; i < 24; i++) {
        const reds = (Math.random() < 0.5 ? 1 : 0) + (Math.random() < 0.5 ? 1 : 0) + (Math.random() < 0.5 ? 1 : 0) + (Math.random() < 0.5 ? 1 : 0);
        state.histories.xocdia.push({
          reds,
          whites: 4 - reds,
          even: reds % 2 === 0
        });
      }
    }
    if (state.histories.roulette.length === 0) {
      const redSet = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
      for (let i = 0; i < 28; i++) {
        const num = randInt(0, 36);
        state.histories.roulette.push({
          num,
          color: num === 0 ? 'green' : redSet.has(num) ? 'red' : 'black'
        });
      }
    }
    if (state.histories.baccarat.length === 0) {
      const pool = ['P', 'B', 'P', 'B', 'B', 'P', 'T', 'B', 'P', 'P', 'B', 'B', 'B', 'P', 'B', 'P', 'T', 'P', 'B', 'B'];
      for (let i = 0; i < pool.length; i++) {
        state.histories.baccarat.push({
          winner: pool[i],
          pScore: randInt(4, 9),
          bScore: randInt(4, 9),
          pPair: Math.random() < 0.08,
          bPair: Math.random() < 0.08
        });
      }
    }
  }

  function loadCasinoState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (Number.isFinite(parsed.chips)) state.chips = Math.max(0, Math.floor(parsed.chips));
          if (Number.isFinite(parsed.vipPoints)) state.vipPoints = Math.max(0, Math.floor(parsed.vipPoints));
          if (Number.isFinite(parsed.vipRebatePool)) state.vipRebatePool = Math.max(0, Math.floor(parsed.vipRebatePool));
          state.podiumWon = Boolean(parsed.podiumWon);
          if (Number.isFinite(parsed.loanDebt)) state.loanDebt = Math.max(0, Math.floor(parsed.loanDebt));
          if (Number.isFinite(parsed.loanPrincipal)) state.loanPrincipal = Math.max(0, Math.floor(parsed.loanPrincipal));
          if (Number.isFinite(parsed.loanTimer)) state.loanTimer = Math.max(0, Number(parsed.loanTimer));
          state.loanOverdue = Boolean(parsed.loanOverdue && state.loanDebt > 0);
          if (typeof parsed.lastVisitorDay === 'string') state.lastVisitorDay = parsed.lastVisitorDay;
          if (typeof parsed.lastFreeWheelDay === 'string') state.lastFreeWheelDay = parsed.lastFreeWheelDay;
          if (Number.isFinite(parsed.progressiveJackpot)) {
            state.progressiveJackpot = Math.max(250000, Math.floor(parsed.progressiveJackpot));
          }
          if (parsed.stats && typeof parsed.stats === 'object') {
            Object.assign(state.stats, parsed.stats);
          }
          if (parsed.histories && typeof parsed.histories === 'object') {
            if (Array.isArray(parsed.histories.taixiu)) state.histories.taixiu = parsed.histories.taixiu.slice(-40);
            if (Array.isArray(parsed.histories.xocdia)) state.histories.xocdia = parsed.histories.xocdia.slice(-40);
            if (Array.isArray(parsed.histories.roulette)) state.histories.roulette = parsed.histories.roulette.slice(-60);
            if (Array.isArray(parsed.histories.baccarat)) state.histories.baccarat = parsed.histories.baccarat.slice(-48);
          }
        }
      }
    } catch (_) {}
    seedInitialHistories();
  }

  let saveDebounceTimer = null;
  function saveCasinoState(immediate = false) {
    const writeNow = () => {
      try {
        const payload = {
          chips: state.chips,
          vipPoints: state.vipPoints,
          vipRebatePool: state.vipRebatePool,
          podiumWon: state.podiumWon,
          loanDebt: state.loanDebt,
          loanPrincipal: state.loanPrincipal,
          loanTimer: Math.round(state.loanTimer),
          loanOverdue: state.loanOverdue,
          lastVisitorDay: state.lastVisitorDay,
          lastFreeWheelDay: state.lastFreeWheelDay,
          progressiveJackpot: state.progressiveJackpot,
          stats: state.stats,
          histories: {
            taixiu: state.histories.taixiu.slice(-40),
            xocdia: state.histories.xocdia.slice(-40),
            roulette: state.histories.roulette.slice(-60),
            baccarat: state.histories.baccarat.slice(-48)
          }
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (_) {}
    };

    if (immediate) {
      if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
        saveDebounceTimer = null;
      }
      writeNow();
      return;
    }
    if (!saveDebounceTimer) {
      saveDebounceTimer = setTimeout(() => {
        saveDebounceTimer = null;
        writeNow();
      }, 350);
    }
  }

  function getCurrentVipTier() {
    let cur = VIP_TIERS[0];
    for (let i = 0; i < VIP_TIERS.length; i++) {
      if (state.vipPoints >= VIP_TIERS[i].minPoints) {
        cur = VIP_TIERS[i];
      }
    }
    return cur;
  }

  function getNextVipTier() {
    for (let i = 0; i < VIP_TIERS.length; i++) {
      if (state.vipPoints < VIP_TIERS[i].minPoints) {
        return VIP_TIERS[i];
      }
    }
    return null;
  }

  function getPlayerCash() {
    const p = activeCtx?.player;
    if (!p) return 0;
    if (Number.isFinite(p.cash)) return Math.max(0, Math.floor(p.cash));
    if (Number.isFinite(p.money)) return Math.max(0, Math.floor(p.money));
    if (ctx?.antiCheat?.commitCash) ctx.antiCheat.commitCash(7860);
    else p.cash = 7860;
    return p.cash;
  }

  function setPlayerCash(nextVal, showHudDelta = true) {
    const p = activeCtx?.player;
    const prev = getPlayerCash();
    const clamped = Math.max(0, Math.floor(Number(nextVal) || 0));
    if (p) {
      if (ctx?.antiCheat?.commitCash) ctx.antiCheat.commitCash(clamped);
      else { p.cash = clamped; if ('money' in p) p.money = clamped; }
    }
    const diff = clamped - prev;
    if (showHudDelta && diff !== 0) {
      activeCtx?.ui?.showCashDelta?.(diff);
    }
    refreshHeaderHUD();
    return clamped;
  }

  function addChips(delta, reason = '') {
    const d = Math.round(Number(delta) || 0);
    if (d === 0) return state.chips;
    state.chips = Math.max(0, state.chips + d);
    if (d > 0 && reason !== 'exchange' && reason !== 'refund' && reason !== 'loan') {
      state.stats.totalWon += d;
      if (d > state.stats.biggestSingleWin) {
        state.stats.biggestSingleWin = d;
      }
    }
    saveCasinoState();
    refreshHeaderHUD();
    return state.chips;
  }

  function spendChips(amount, trackWager = true) {
    const amt = Math.floor(Number(amount) || 0);
    if (amt <= 0) return false;
    if (state.chips < amt) {
      showCasinoToast('Không đủ Phỉnh! Hãy sang Quầy Thu Ngân đổi thêm hoặc Vay Nóng Mafia.', 'error');
      casinoSFX.playError();
      return false;
    }
    state.chips -= amt;
    if (trackWager) {
      state.stats.totalWagered += amt;
      state.progressiveJackpot += Math.max(5, Math.round(amt * 0.04));
      awardVipPoints(amt);
    }
    saveCasinoState();
    refreshHeaderHUD();
    return true;
  }

  function awardVipPoints(wagerAmount) {
    const prevTier = getCurrentVipTier();
    const pts = Math.max(1, Math.round(wagerAmount * 0.12));
    state.vipPoints += pts;
    const rebate = Math.floor(wagerAmount * prevTier.rebateRate);
    if (rebate > 0) {
      state.vipRebatePool += rebate;
    }
    const nextTier = getCurrentVipTier();
    if (nextTier.id !== prevTier.id) {
      showCasinoToast(`🎉 THĂNG HẠNG THƯỢNG LƯU: ${nextTier.badge}! Hoàn trả cược tăng lên ${(nextTier.rebateRate * 100).toFixed(1)}%!`, 'gold', 5.0);
      casinoSFX.playWinFanfare(0.85);
      activeCtx?.ui?.showNotification?.(`Sòng Bạc Diamond: Chúc mừng đạt ${nextTier.badge}!`);
    }
  }

  // ============================================================================
  // HIGH-DPI CANVAS & VECTOR CASINO GRAPHICS LIBRARY (CHIPS, CARDS, DICE, FX)
  // ============================================================================
  function syncCanvasDPI(canvas, logicalW, logicalH) {
    if (!canvas) return null;
    const dpr = clamp(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1, 1, 2);
    const targetW = Math.round(logicalW * dpr);
    const targetH = Math.round(logicalH * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    const g = canvas.getContext('2d');
    if (g) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return g;
  }

  function roundRectPath(g, x, y, w, h, r) {
    const rr = Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5);
    g.beginPath();
    g.moveTo(x + rr, y);
    g.arcTo(x + w, y, x + w, y + h, rr);
    g.arcTo(x + w, y + h, x, y + h, rr);
    g.arcTo(x, y + h, x, y, rr);
    g.arcTo(x, y, x + w, y, rr);
    g.closePath();
  }

  function drawLuxuryFeltBackground(g, w, h, baseHex = '#0d3b26', watermarkTitle = '', watermarkSub = '') {
    const grad = g.createRadialGradient(w * 0.5, h * 0.42, 30, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    grad.addColorStop(0, lightenHex(baseHex, 24));
    grad.addColorStop(0.62, baseHex);
    grad.addColorStop(1, darkenHex(baseHex, 38));
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    // Subtle royal diamond lattice weave
    g.save();
    g.strokeStyle = 'rgba(245, 197, 66, 0.045)';
    g.lineWidth = 1;
    const step = 38;
    for (let x = -h; x < w + h; x += step) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + h, h);
      g.stroke();
      g.beginPath();
      g.moveTo(x + h, 0);
      g.lineTo(x, h);
      g.stroke();
    }

    // Outer mahogany & double gold trim rail
    g.strokeStyle = 'rgba(245, 197, 66, 0.42)';
    g.lineWidth = 2.2;
    roundRectPath(g, 8, 8, w - 16, h - 16, 16);
    g.stroke();

    g.strokeStyle = 'rgba(245, 197, 66, 0.16)';
    g.lineWidth = 1;
    roundRectPath(g, 13, 13, w - 26, h - 26, 13);
    g.stroke();

    if (watermarkTitle) {
      g.fillStyle = 'rgba(253, 224, 71, 0.12)';
      g.font = '800 20px "Segoe UI", system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText(watermarkTitle, w * 0.5, 36);
    }
    if (watermarkSub) {
      g.fillStyle = 'rgba(255, 255, 255, 0.22)';
      g.font = '600 11px "Segoe UI", system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText(watermarkSub, w * 0.5, 52);
    }
    g.restore();
  }

  function parseHexRGB(hex) {
    const clean = String(hex || '#112233').replace('#', '');
    const full = clean.length === 3
      ? clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
      : clean.padEnd(6, '0');
    const num = parseInt(full, 16) || 0;
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  function lightenHex(hex, amt) {
    const [r, g, b] = parseHexRGB(hex);
    return `rgb(${clamp(r + amt, 0, 255)}, ${clamp(g + amt, 0, 255)}, ${clamp(b + amt, 0, 255)})`;
  }

  function darkenHex(hex, amt) {
    return lightenHex(hex, -amt);
  }

  function resolveChipStyle(amount) {
    let chosen = CHIP_DENOMS[0];
    for (let i = 0; i < CHIP_DENOMS.length; i++) {
      if (amount >= CHIP_DENOMS[i].value) chosen = CHIP_DENOMS[i];
    }
    return chosen;
  }

  function drawCasinoChip(g, x, y, radius = 16, denomValue = 100, scaleY = 0.86, labelOverride = null) {
    const st = resolveChipStyle(denomValue);
    g.save();
    g.translate(x, y);
    g.scale(1, scaleY);

    // Drop shadow + 3D chip thickness cylinder
    g.fillStyle = 'rgba(0, 0, 0, 0.45)';
    g.beginPath();
    g.arc(1.5, 4.5, radius, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = darkenHex(st.base, 36);
    g.beginPath();
    g.arc(0, 3, radius, 0, Math.PI * 2);
    g.fill();

    // Main clay disc
    g.fillStyle = st.base;
    g.beginPath();
    g.arc(0, 0, radius, 0, Math.PI * 2);
    g.fill();

    // 6 radial edge stripes
    g.strokeStyle = st.rim;
    g.lineWidth = Math.max(2, radius * 0.2);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + 0.25;
      g.beginPath();
      g.arc(0, 0, radius * 0.86, a, a + 0.22);
      g.stroke();
    }

    // Inner recessed ring
    g.fillStyle = lightenHex(st.base, 14);
    g.beginPath();
    g.arc(0, 0, radius * 0.64, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = '#fde68a';
    g.lineWidth = 1.1;
    g.beginPath();
    g.arc(0, 0, radius * 0.64, 0, Math.PI * 2);
    g.stroke();

    // Denomination label
    const txt = labelOverride !== null
      ? labelOverride
      : denomValue >= 1000
        ? `${(denomValue / 1000).toFixed(denomValue % 1000 === 0 ? 0 : 1)}K`
        : String(denomValue);
    g.fillStyle = st.text;
    g.font = `800 ${Math.max(8, Math.round(radius * 0.56))}px "Segoe UI", sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(txt, 0, 0.5);
    g.restore();
  }

  function drawChipStack(g, x, y, totalAmount, radius = 14, maxDiscs = 7) {
    const amt = Math.floor(Number(totalAmount) || 0);
    if (amt <= 0) return;
    // Decompose into realistic chip discs from largest to smallest
    let rem = amt;
    const discs = [];
    for (let i = CHIP_DENOMS.length - 1; i >= 0; i--) {
      const val = CHIP_DENOMS[i].value;
      while (rem >= val && discs.length < maxDiscs) {
        discs.push(val);
        rem -= val;
      }
    }
    if (discs.length === 0) discs.push(CHIP_DENOMS[0].value);
    for (let k = 0; k < discs.length; k++) {
      const dy = y - k * 3.6;
      const lbl = k === discs.length - 1
        ? (amt >= 10000 ? `${(amt / 1000).toFixed(amt % 1000 === 0 ? 0 : 1)}K` : String(amt))
        : '';
      drawCasinoChip(g, x, dy, radius, discs[k], 0.82, lbl);
    }
  }

  // ============================================================================
  // PLAYING CARD DECKS & VECTOR PLAYING CARD RENDERER (FLIP + SQUEEZE)
  // ============================================================================
  const SUITS = [
    { id: 'S', sym: '♠', color: '#111827', name: 'Bích' },
    { id: 'H', sym: '♥', color: '#dc2626', name: 'Cơ' },
    { id: 'D', sym: '♦', color: '#dc2626', name: 'Rô' },
    { id: 'C', sym: '♣', color: '#111827', name: 'Chuồn' }
  ];

  const RANKS = [
    { rank: 'A', val: 14, bjVal: 11, bacVal: 1 },
    { rank: '2', val: 2, bjVal: 2, bacVal: 2 },
    { rank: '3', val: 3, bjVal: 3, bacVal: 3 },
    { rank: '4', val: 4, bjVal: 4, bacVal: 4 },
    { rank: '5', val: 5, bjVal: 5, bacVal: 5 },
    { rank: '6', val: 6, bjVal: 6, bacVal: 6 },
    { rank: '7', val: 7, bjVal: 7, bacVal: 7 },
    { rank: '8', val: 8, bjVal: 8, bacVal: 8 },
    { rank: '9', val: 9, bjVal: 9, bacVal: 9 },
    { rank: '10', val: 10, bjVal: 10, bacVal: 0 },
    { rank: 'J', val: 11, bjVal: 10, bacVal: 0 },
    { rank: 'Q', val: 12, bjVal: 10, bacVal: 0 },
    { rank: 'K', val: 13, bjVal: 10, bacVal: 0 }
  ];

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function createDeck(numDecks = 1) {
    const cards = [];
    for (let d = 0; d < numDecks; d++) {
      for (let s = 0; s < SUITS.length; s++) {
        for (let r = 0; r < RANKS.length; r++) {
          const st = SUITS[s];
          const rk = RANKS[r];
          cards.push({
            suit: st.id,
            sym: st.sym,
            color: st.color,
            suitName: st.name,
            rank: rk.rank,
            val: rk.val,
            bjVal: rk.bjVal,
            bacVal: rk.bacVal,
            code: `${rk.rank}${st.id}`
          });
        }
      }
    }
    return shuffleArray(cards);
  }

  function drawCardBackContent(g, w, h) {
    roundRectPath(g, -w * 0.5, -h * 0.5, w, h, Math.max(5, w * 0.09));
    g.fillStyle = '#fffdf7';
    g.fill();
    g.strokeStyle = '#d4af37';
    g.lineWidth = 1.4;
    g.stroke();

    const pad = Math.max(4, w * 0.08);
    roundRectPath(g, -w * 0.5 + pad, -h * 0.5 + pad, w - pad * 2, h - pad * 2, 4);
    const bgGrad = g.createLinearGradient(-w * 0.4, -h * 0.4, w * 0.4, h * 0.4);
    bgGrad.addColorStop(0, '#7f1d1d');
    bgGrad.addColorStop(0.5, '#991b1b');
    bgGrad.addColorStop(1, '#450a0a');
    g.fillStyle = bgGrad;
    g.fill();
    g.strokeStyle = '#facc15';
    g.lineWidth = 1.1;
    g.stroke();

    // Diamond Crown emblem in center
    g.fillStyle = '#fde047';
    g.beginPath();
    g.moveTo(0, -h * 0.16);
    g.lineTo(w * 0.16, 0);
    g.lineTo(0, h * 0.16);
    g.lineTo(-w * 0.16, 0);
    g.closePath();
    g.fill();

    g.fillStyle = '#7f1d1d';
    g.beginPath();
    g.moveTo(0, -h * 0.08);
    g.lineTo(w * 0.08, 0);
    g.lineTo(0, h * 0.08);
    g.lineTo(-w * 0.08, 0);
    g.closePath();
    g.fill();
  }

  function drawCardFaceContent(g, card, w, h, hideCornerIndices = false) {
    roundRectPath(g, -w * 0.5, -h * 0.5, w, h, Math.max(5, w * 0.09));
    const ivory = g.createLinearGradient(-w * 0.5, -h * 0.5, w * 0.5, h * 0.5);
    ivory.addColorStop(0, '#ffffff');
    ivory.addColorStop(1, '#f5f2e8');
    g.fillStyle = ivory;
    g.fill();
    g.strokeStyle = '#cbd5e1';
    g.lineWidth = 1.2;
    g.stroke();

    if (!card) return;
    const col = card.color || (card.suit === 'H' || card.suit === 'D' ? '#dc2626' : '#111827');
    g.fillStyle = col;

    if (!hideCornerIndices) {
      const rankFont = Math.max(10, Math.round(w * 0.23));
      const suitFont = Math.max(9, Math.round(w * 0.20));
      g.font = `800 ${rankFont}px "Segoe UI", sans-serif`;
      g.textAlign = 'left';
      g.textBaseline = 'top';
      g.fillText(card.rank, -w * 0.42, -h * 0.44);
      g.font = `${suitFont}px "Segoe UI Symbol", "Segoe UI", sans-serif`;
      g.fillText(card.sym, -w * 0.42, -h * 0.44 + rankFont * 0.95);

      g.save();
      g.rotate(Math.PI);
      g.font = `800 ${rankFont}px "Segoe UI", sans-serif`;
      g.fillText(card.rank, -w * 0.42, -h * 0.44);
      g.font = `${suitFont}px "Segoe UI Symbol", "Segoe UI", sans-serif`;
      g.fillText(card.sym, -w * 0.42, -h * 0.44 + rankFont * 0.95);
      g.restore();
    }

    // Center court art or authentic Macau pip layout (vital for Baccarat Squeeze!)
    if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') {
      const boxW = w * 0.54;
      const boxH = h * 0.58;
      roundRectPath(g, -boxW * 0.5, -boxH * 0.5, boxW, boxH, 4);
      g.fillStyle = col === '#dc2626' ? 'rgba(220, 38, 38, 0.09)' : 'rgba(17, 24, 39, 0.08)';
      g.fill();
      g.strokeStyle = '#d4af37';
      g.lineWidth = 1.2;
      g.stroke();

      // Royal Crown
      g.fillStyle = '#eab308';
      g.beginPath();
      g.moveTo(-boxW * 0.28, -boxH * 0.16);
      g.lineTo(-boxW * 0.22, -boxH * 0.34);
      g.lineTo(0, -boxH * 0.22);
      g.lineTo(boxW * 0.22, -boxH * 0.34);
      g.lineTo(boxW * 0.28, -boxH * 0.16);
      g.closePath();
      g.fill();

      g.fillStyle = col;
      g.font = `900 ${Math.round(w * 0.36)}px Georgia, serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(card.rank, 0, boxH * 0.08);

      g.font = `${Math.round(w * 0.22)}px "Segoe UI Symbol", sans-serif`;
      g.fillText(card.sym, 0, boxH * 0.34);
    } else if (card.rank === 'A') {
      g.font = `${Math.round(w * 0.54)}px "Segoe UI Symbol", "Segoe UI", sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(card.sym, 0, 2);
    } else {
      // Numbered 2..10 pips arranged in authentic left/center/right columns so squeezing reveals legs!
      const n = parseInt(card.rank, 10) || 2;
      const pipSize = Math.max(8, Math.round(w * 0.21));
      g.font = `${pipSize}px "Segoe UI Symbol", "Segoe UI", sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';

      const lx = -w * 0.18;
      const rx = w * 0.18;
      const ty = -h * 0.27;
      const by = h * 0.27;
      const my = 0;

      const coords = [];
      if (n === 2) coords.push([0, ty], [0, by]);
      else if (n === 3) coords.push([0, ty], [0, my], [0, by]);
      else if (n === 4) coords.push([lx, ty], [rx, ty], [lx, by], [rx, by]);
      else if (n === 5) coords.push([lx, ty], [rx, ty], [0, my], [lx, by], [rx, by]);
      else if (n === 6) coords.push([lx, ty], [rx, ty], [lx, my], [rx, my], [lx, by], [rx, by]);
      else if (n === 7) coords.push([lx, ty], [rx, ty], [0, ty * 0.5], [lx, my], [rx, my], [lx, by], [rx, by]);
      else if (n === 8) coords.push([lx, ty], [rx, ty], [lx, ty * 0.34], [rx, ty * 0.34], [lx, by * 0.34], [rx, by * 0.34], [lx, by], [rx, by]);
      else if (n === 9) coords.push([lx, ty], [rx, ty], [lx, ty * 0.36], [rx, ty * 0.36], [0, my], [lx, by * 0.36], [rx, by * 0.36], [lx, by], [rx, by]);
      else coords.push([lx, ty], [rx, ty], [0, ty * 0.62], [lx, ty * 0.26], [rx, ty * 0.26], [lx, by * 0.26], [rx, by * 0.26], [0, by * 0.62], [lx, by], [rx, by]);

      for (let i = 0; i < coords.length; i++) {
        g.fillText(card.sym, coords[i][0], coords[i][1]);
      }
    }
  }

  function drawPlayingCard(g, card, cx, cy, w = 68, h = 96, opts = {}) {
    const {
      faceUp = true,
      flip = faceUp ? 1 : 0, // 0 = full back, 0.5 = edge, 1 = full face
      angle = 0,
      highlight = false,
      dimmed = false,
      squeeze = null // null or { progress: 0..1 } for Macau Nặn Bài peel!
    } = opts;

    g.save();
    g.translate(cx, cy);
    if (angle) g.rotate(angle);

    // Card drop shadow
    const scaleX = Math.max(0.05, Math.abs(Math.cos((1 - clamp(flip, 0, 1)) * Math.PI)));
    const showFace = flip >= 0.5;

    g.fillStyle = 'rgba(0, 0, 0, 0.42)';
    roundRectPath(g, -w * 0.5 * scaleX + 3, -h * 0.5 + 5, w * scaleX, h, 6);
    g.fill();

    if (highlight) {
      g.save();
      g.shadowColor = '#facc15';
      g.shadowBlur = 18;
      g.strokeStyle = '#fde047';
      g.lineWidth = 3;
      roundRectPath(g, -w * 0.5 * scaleX - 2, -h * 0.5 - 2, w * scaleX + 4, h + 4, 8);
      g.stroke();
      g.restore();
    }

    if (squeeze && typeof squeeze.progress === 'number' && squeeze.progress < 0.96) {
      // Interactive Macau Card Squeeze (peeling from bottom/top edge to reveal pips without corner rank!)
      const p = clamp(squeeze.progress, 0, 1);
      const revealH = h * (0.06 + p * 0.94);

      // Unpeeled back portion
      g.save();
      g.beginPath();
      g.rect(-w * 0.6, -h * 0.5, w * 1.2, h - revealH);
      g.clip();
      drawCardBackContent(g, w, h);
      g.restore();

      // Peeled face portion (corner index masked while p < 0.78 for true Macau suspense!)
      g.save();
      g.beginPath();
      g.rect(-w * 0.6, h * 0.5 - revealH, w * 1.2, revealH + 2);
      g.clip();
      drawCardFaceContent(g, card, w, h, p < 0.78);

      // Fold crease shadow gradient
      const foldY = h * 0.5 - revealH;
      const shGrad = g.createLinearGradient(0, foldY, 0, foldY + 20);
      shGrad.addColorStop(0, 'rgba(0,0,0,0.52)');
      shGrad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = shGrad;
      g.fillRect(-w * 0.5, foldY, w, 20);
      g.restore();

      // Curled fold flap lip
      const flapH = Math.min(22, revealH * 0.45 + 5);
      const flapGrad = g.createLinearGradient(0, foldY - flapH * 0.5, 0, foldY + flapH * 0.5);
      flapGrad.addColorStop(0, '#f8fafc');
      flapGrad.addColorStop(0.5, '#cbd5e1');
      flapGrad.addColorStop(1, '#94a3b8');
      g.fillStyle = flapGrad;
      roundRectPath(g, -w * 0.51, foldY - flapH * 0.4, w * 1.02, flapH, 4);
      g.fill();
    } else {
      g.scale(scaleX, 1);
      if (showFace) {
        drawCardFaceContent(g, card, w, h, false);
      } else {
        drawCardBackContent(g, w, h);
      }
    }

    if (dimmed) {
      roundRectPath(g, -w * 0.5, -h * 0.5, w, h, 6);
      g.fillStyle = 'rgba(0, 0, 0, 0.45)';
      g.fill();
    }

    g.restore();
  }

  // ============================================================================
  // 3D-SHADED ASIAN IVORY DICE RENDERER (OVERSIZED RED 1 & 4 PIPS)
  // ============================================================================
  function drawDie3D(g, val, cx, cy, size = 48, rotAngle = 0, glowGold = false) {
    g.save();
    g.translate(cx, cy);
    if (rotAngle) g.rotate(rotAngle);

    const half = size * 0.5;
    // Drop shadow
    g.fillStyle = 'rgba(0, 0, 0, 0.48)';
    roundRectPath(g, -half + 3, -half + 5, size, size, size * 0.2);
    g.fill();

    // 3D lower bevel
    g.fillStyle = '#d6d0c0';
    roundRectPath(g, -half, -half + 3, size, size, size * 0.2);
    g.fill();

    // Ivory face gradient
    const ivory = g.createRadialGradient(-size * 0.16, -size * 0.18, 2, 0, 0, size * 0.72);
    ivory.addColorStop(0, '#ffffff');
    ivory.addColorStop(0.7, '#f8f4e8');
    ivory.addColorStop(1, '#e2dac6');
    g.fillStyle = ivory;
    roundRectPath(g, -half, -half, size, size, size * 0.2);
    g.fill();

    g.strokeStyle = glowGold ? '#facc15' : 'rgba(120, 113, 108, 0.45)';
    g.lineWidth = glowGold ? 2.6 : 1.2;
    g.stroke();

    const o = size * 0.25;
    const pipMap = {
      1: [[0, 0]],
      2: [[-o, -o], [o, o]],
      3: [[-o, -o], [0, 0], [o, o]],
      4: [[-o, -o], [o, -o], [-o, o], [o, o]],
      5: [[-o, -o], [o, -o], [0, 0], [-o, o], [o, o]],
      6: [[-o, -o], [o, -o], [-o, 0], [o, 0], [-o, o], [o, o]]
    };

    const pts = pipMap[val] || pipMap[1];
    const isRed = val === 1 || val === 4;
    const r = val === 1 ? size * 0.16 : isRed ? size * 0.105 : size * 0.095;

    for (let i = 0; i < pts.length; i++) {
      const [px, py] = pts[i];
      // Pip concave inner shadow
      g.fillStyle = isRed ? '#7f1d1d' : '#000000';
      g.beginPath();
      g.arc(px, py - 0.8, r, 0, Math.PI * 2);
      g.fill();

      g.fillStyle = isRed ? '#dc2626' : '#1e293b';
      g.beginPath();
      g.arc(px, py, r * 0.92, 0, Math.PI * 2);
      g.fill();
    }

    g.restore();
  }

  // ============================================================================
  // CANVAS PARTICLE CELEBRATION SYSTEM (GOLD COINS, CONFETTI, FLOATING CALLOUTS)
  // ============================================================================
  const fxCoins = [];
  const fxConfetti = [];
  const fxCallouts = [];

  function spawnCanvasCoins(x, y, count = 28, power = 1.0) {
    for (let i = 0; i < count; i++) {
      const ang = -Math.PI * 0.5 + randFloat(-1.15, 1.15);
      const spd = randFloat(150, 420) * power;
      fxCoins.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 60,
        r: randFloat(6, 11),
        phase: randFloat(0, Math.PI * 2),
        spinSpd: randFloat(8, 16),
        life: randFloat(1.1, 2.2),
        maxLife: 2.2
      });
    }
  }

  function spawnCanvasConfetti(w, h, count = 55) {
    const palette = ['#facc15', '#ef4444', '#38bdf8', '#a855f7', '#4ade80', '#fb923c', '#ffffff'];
    for (let i = 0; i < count; i++) {
      fxConfetti.push({
        x: randFloat(30, w - 30),
        y: randFloat(-40, 40),
        vx: randFloat(-90, 90),
        vy: randFloat(60, 210),
        w: randFloat(5, 10),
        h: randFloat(3, 6),
        rot: randFloat(0, Math.PI * 2),
        vRot: randFloat(-7, 7),
        color: pickRandom(palette),
        life: randFloat(1.6, 3.0)
      });
    }
  }

  function spawnFloatingCallout(x, y, text, color = '#fde047', fontSize = 22) {
    fxCallouts.push({
      x,
      y,
      text,
      color,
      fontSize,
      vy: -42,
      life: 1.85,
      maxLife: 1.85
    });
  }

  function clearCanvasFX() {
    fxCoins.length = 0;
    fxConfetti.length = 0;
    fxCallouts.length = 0;
  }

  function updateAndDrawCanvasFX(g, dt) {
    // 1. Confetti ribbons
    for (let i = fxConfetti.length - 1; i >= 0; i--) {
      const c = fxConfetti[i];
      c.life -= dt;
      if (c.life <= 0) {
        fxConfetti.splice(i, 1);
        continue;
      }
      c.vy += 120 * dt;
      c.vx *= 0.99;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.vRot * dt;

      g.save();
      g.translate(c.x, c.y);
      g.rotate(c.rot);
      g.globalAlpha = clamp(c.life, 0, 1);
      g.fillStyle = c.color;
      g.fillRect(-c.w * 0.5, -c.h * 0.5, c.w, c.h);
      g.restore();
    }

    // 2. Spinning 24K Gold Coins
    for (let i = fxCoins.length - 1; i >= 0; i--) {
      const coin = fxCoins[i];
      coin.life -= dt;
      if (coin.life <= 0) {
        fxCoins.splice(i, 1);
        continue;
      }
      coin.vy += 580 * dt;
      coin.x += coin.vx * dt;
      coin.y += coin.vy * dt;
      coin.phase += coin.spinSpd * dt;

      const squash = Math.max(0.18, Math.abs(Math.cos(coin.phase)));
      g.save();
      g.translate(coin.x, coin.y);
      g.scale(squash, 1);
      g.globalAlpha = clamp(coin.life * 1.3, 0, 1);
      g.fillStyle = '#f59e0b';
      g.beginPath();
      g.arc(0, 0, coin.r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#fef08a';
      g.lineWidth = 1.6;
      g.stroke();
      g.fillStyle = '#fef9c3';
      g.font = `800 ${Math.round(coin.r * 1.1)}px sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('$', 0, 0.5);
      g.restore();
    }

    // 3. Floating payout callouts
    for (let i = fxCallouts.length - 1; i >= 0; i--) {
      const fc = fxCallouts[i];
      fc.life -= dt;
      if (fc.life <= 0) {
        fxCallouts.splice(i, 1);
        continue;
      }
      fc.y += fc.vy * dt;
      fc.vy *= 0.96;
      const alpha = clamp(fc.life / Math.min(0.5, fc.maxLife), 0, 1);
      g.save();
      g.globalAlpha = alpha;
      g.font = `900 ${fc.fontSize}px "Segoe UI", system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      g.strokeText(fc.text, fc.x, fc.y);
      g.fillStyle = fc.color;
      g.fillText(fc.text, fc.x, fc.y);
      g.restore();
    }
  }

  // ============================================================================
  // LUXURY GOLD & CRIMSON VELVET OVERLAY DOM + SCOPED CSS INJECTION
  // ============================================================================
  const dom = {
    styleEl: null,
    overlay: null,
    loanHudWarn: null,
    headerStationTitle: null,
    headerStationSub: null,
    walletCash: null,
    walletChips: null,
    walletVip: null,
    walletLoan: null,
    navRow: null,
    navBtns: {},
    bodyGrid: null,
    canvasWrap: null,
    canvas: null,
    customStage: null,
    sidePanel: null,
    chipBar: null,
    chipBtns: {},
    actionBar: null,
    toastWrap: null,
    closeBtn: null
  };

  function ensureCasinoDOM() {
    if (typeof document === 'undefined') return;
    if (dom.overlay && document.body.contains(dom.overlay)) return;

    let styleEl = document.getElementById('diamond-casino-suite-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'diamond-casino-suite-styles';
      styleEl.textContent = `
        #diamond-casino-loan-hud {
          position: fixed;
          top: 96px;
          right: 18px;
          z-index: 6200;
          padding: 7px 13px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(69,10,10,0.92), rgba(20,10,14,0.95));
          border: 1.5px solid rgba(248,113,113,0.75);
          color: #fecaca;
          font: 700 12.5px/1.35 "Segoe UI", system-ui, sans-serif;
          box-shadow: 0 8px 24px rgba(0,0,0,0.55);
          pointer-events: none;
          transition: opacity 0.25s ease, transform 0.25s ease;
        }
        #diamond-casino-loan-hud.hidden {
          display: none !important;
        }
        #diamond-casino-loan-hud.overdue {
          border-color: #ef4444;
          background: linear-gradient(135deg, rgba(153,27,27,0.96), rgba(45,6,6,0.96));
          animation: dcPulseDanger 0.9s infinite alternate;
        }
        @keyframes dcPulseDanger {
          from { box-shadow: 0 0 10px rgba(239,68,68,0.45); transform: scale(1); }
          to { box-shadow: 0 0 24px rgba(239,68,68,0.95); transform: scale(1.03); }
        }
        #diamond-casino-overlay {
          position: fixed;
          inset: 0;
          z-index: 9600;
          display: flex;
          flex-direction: column;
          background: radial-gradient(circle at 50% 18%, rgba(76, 14, 28, 0.96), rgba(11, 7, 15, 0.985) 75%);
          color: #fef3c7;
          font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
          user-select: none;
          -webkit-user-select: none;
          backdrop-filter: blur(8px);
        }
        #diamond-casino-overlay.hidden {
          display: none !important;
        }
        .dc-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 18px;
          background: linear-gradient(180deg, rgba(34, 12, 20, 0.98), rgba(18, 8, 14, 0.96));
          border-bottom: 1.5px solid rgba(245, 197, 66, 0.55);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
          flex-wrap: wrap;
        }
        .dc-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 240px;
        }
        .dc-crown-emblem {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #fde047, #d97706);
          color: #29090f;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 900;
          box-shadow: 0 0 16px rgba(250, 204, 21, 0.45);
        }
        .dc-title-col h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 0.6px;
          color: #fde047;
          text-shadow: 0 2px 8px rgba(0,0,0,0.8);
        }
        .dc-title-col p {
          margin: 1px 0 0;
          font-size: 11.5px;
          color: #e2e8f0;
          opacity: 0.85;
        }
        .dc-wallet-strip {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
        }
        .dc-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(245, 197, 66, 0.42);
          font-size: 12.5px;
          font-weight: 700;
          color: #f8fafc;
        }
        .dc-pill.chips {
          background: linear-gradient(135deg, rgba(120, 53, 15, 0.85), rgba(45, 18, 6, 0.92));
          border-color: #facc15;
          color: #fef08a;
        }
        .dc-pill.cash {
          border-color: rgba(74, 222, 128, 0.55);
          color: #86efac;
        }
        .dc-pill.vip {
          border-color: rgba(56, 189, 248, 0.55);
          color: #bae6fd;
        }
        .dc-pill.loan {
          border-color: rgba(248, 113, 113, 0.75);
          background: rgba(127, 29, 29, 0.72);
          color: #fecaca;
        }
        .dc-exit-btn {
          padding: 8px 15px;
          border-radius: 9px;
          border: 1.5px solid rgba(248, 113, 113, 0.75);
          background: linear-gradient(180deg, #991b1b, #5c0b0b);
          color: #ffffff;
          font-weight: 800;
          font-size: 12.5px;
          cursor: pointer;
          transition: transform 0.14s ease, filter 0.14s ease;
        }
        .dc-exit-btn:hover {
          filter: brightness(1.16);
          transform: translateY(-1px);
        }
        .dc-nav-tabs {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 16px;
          overflow-x: auto;
          background: rgba(12, 8, 16, 0.9);
          border-bottom: 1px solid rgba(245, 197, 66, 0.25);
        }
        .dc-nav-btn {
          flex: 0 0 auto;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid rgba(245, 197, 66, 0.26);
          background: rgba(30, 18, 28, 0.8);
          color: #e2e8f0;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .dc-nav-btn:hover {
          border-color: rgba(250, 204, 21, 0.65);
          color: #fef08a;
        }
        .dc-nav-btn.active {
          background: linear-gradient(135deg, #f59e0b, #b45309);
          border-color: #fef08a;
          color: #1c0a00;
          box-shadow: 0 0 14px rgba(245, 158, 11, 0.45);
        }
        .dc-stage-layout {
          flex: 1 1 auto;
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 12px;
          padding: 10px 16px;
          overflow: hidden;
        }
        @media (max-width: 1020px) {
          .dc-stage-layout {
            grid-template-columns: 1fr;
            overflow-y: auto;
          }
        }
        .dc-canvas-card {
          position: relative;
          display: flex;
          flex-direction: column;
          min-height: 410px;
          border-radius: 14px;
          border: 1.5px solid rgba(245, 197, 66, 0.45);
          background: rgba(10, 14, 18, 0.88);
          box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.65), 0 10px 28px rgba(0, 0, 0, 0.55);
          overflow: hidden;
        }
        #diamond-casino-canvas {
          width: 100%;
          height: 100%;
          display: block;
          touch-action: none;
          cursor: pointer;
        }
        #diamond-casino-custom-stage {
          position: absolute;
          inset: 0;
          overflow-y: auto;
          padding: 16px;
        }
        #diamond-casino-custom-stage.hidden {
          display: none !important;
        }
        .dc-side-panel {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(245, 197, 66, 0.35);
          background: linear-gradient(180deg, rgba(26, 13, 22, 0.92), rgba(13, 9, 16, 0.95));
          overflow-y: auto;
          font-size: 12.5px;
          color: #f1f5f9;
        }
        .dc-side-box {
          padding: 10px 11px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(245, 197, 66, 0.2);
        }
        .dc-side-box h4 {
          margin: 0 0 6px;
          font-size: 12.5px;
          color: #fde047;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .dc-bottom-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 9px 18px;
          background: linear-gradient(180deg, rgba(20, 10, 16, 0.96), rgba(10, 5, 9, 0.99));
          border-top: 1.5px solid rgba(245, 197, 66, 0.45);
          flex-wrap: wrap;
        }
        .dc-chip-rack {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
        }
        .dc-chip-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 3px dashed rgba(255, 255, 255, 0.85);
          font-size: 11.5px;
          font-weight: 900;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.55);
          transition: transform 0.14s ease, box-shadow 0.14s ease;
        }
        .dc-chip-btn:hover {
          transform: translateY(-3px) scale(1.06);
        }
        .dc-chip-btn.selected {
          transform: translateY(-5px) scale(1.14);
          box-shadow: 0 0 0 3px #fde047, 0 8px 18px rgba(250, 204, 21, 0.65);
        }
        .dc-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .dc-btn {
          padding: 9px 15px;
          border-radius: 9px;
          border: 1.5px solid rgba(245, 197, 66, 0.55);
          background: linear-gradient(180deg, #334155, #1e293b);
          color: #f8fafc;
          font-size: 12.5px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.14s ease;
        }
        .dc-btn:hover:not(:disabled) {
          filter: brightness(1.15);
          transform: translateY(-1px);
        }
        .dc-btn:disabled {
          opacity: 0.42;
          cursor: not-allowed;
        }
        .dc-btn.gold {
          background: linear-gradient(180deg, #facc15, #ca8a04);
          border-color: #fef9c3;
          color: #1c0a00;
          box-shadow: 0 4px 14px rgba(234, 179, 8, 0.4);
        }
        .dc-btn.crimson {
          background: linear-gradient(180deg, #dc2626, #991b1b);
          border-color: #fca5a5;
          color: #ffffff;
        }
        .dc-btn.emerald {
          background: linear-gradient(180deg, #16a34a, #166534);
          border-color: #86efac;
          color: #ffffff;
        }
        .dc-btn.purple {
          background: linear-gradient(180deg, #9333ea, #581c87);
          border-color: #d8b4fe;
          color: #ffffff;
        }
        .dc-cashier-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(275px, 1fr));
          gap: 14px;
        }
        .dc-card-panel {
          padding: 15px;
          border-radius: 13px;
          background: linear-gradient(160deg, rgba(44, 16, 28, 0.92), rgba(17, 12, 22, 0.96));
          border: 1px solid rgba(245, 197, 66, 0.38);
          box-shadow: 0 8px 22px rgba(0,0,0,0.45);
        }
        .dc-card-panel h3 {
          margin: 0 0 8px;
          font-size: 15px;
          color: #fde047;
        }
        .dc-input-row {
          display: flex;
          gap: 8px;
          margin: 8px 0;
        }
        .dc-input {
          flex: 1;
          padding: 8px 11px;
          border-radius: 8px;
          border: 1px solid rgba(245, 197, 66, 0.45);
          background: rgba(9, 13, 22, 0.9);
          color: #fef08a;
          font-size: 14px;
          font-weight: 700;
        }
        .dc-preset-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .dc-mini-btn {
          padding: 5px 9px;
          border-radius: 7px;
          border: 1px solid rgba(245, 197, 66, 0.35);
          background: rgba(30, 41, 59, 0.85);
          color: #e2e8f0;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
        }
        .dc-mini-btn:hover {
          border-color: #fde047;
          color: #fde047;
        }
        .dc-progress-track {
          height: 10px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(245, 197, 66, 0.3);
          overflow: hidden;
          margin: 8px 0;
        }
        .dc-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #f59e0b, #fde047);
          transition: width 0.3s ease;
        }
        #diamond-casino-toast-wrap {
          position: fixed;
          top: 68px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9800;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          pointer-events: none;
        }
        .dc-toast {
          padding: 9px 18px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.95);
          border: 1.5px solid #facc15;
          color: #fef9c3;
          font-size: 13px;
          font-weight: 800;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65);
          animation: dcToastPop 0.22s ease-out;
        }
        .dc-toast.error {
          border-color: #f87171;
          background: rgba(127, 29, 29, 0.95);
          color: #fee2e2;
        }
        .dc-toast.win {
          border-color: #4ade80;
          background: linear-gradient(135deg, rgba(20, 83, 45, 0.96), rgba(6, 46, 22, 0.96));
          color: #bbf7d0;
        }
        @keyframes dcToastPop {
          from { opacity: 0; transform: translateY(-10px) scale(0.94); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `;
      document.head.appendChild(styleEl);
    }
    dom.styleEl = styleEl;

    // Persistent outdoor HUD pill when player carries an active Mafia Loan
    let loanHudWarn = document.getElementById('diamond-casino-loan-hud');
    if (!loanHudWarn) {
      loanHudWarn = document.createElement('div');
      loanHudWarn.id = 'diamond-casino-loan-hud';
      loanHudWarn.className = 'hidden';
      document.body.appendChild(loanHudWarn);
    }
    dom.loanHudWarn = loanHudWarn;

    // Toast container
    let toastWrap = document.getElementById('diamond-casino-toast-wrap');
    if (!toastWrap) {
      toastWrap = document.createElement('div');
      toastWrap.id = 'diamond-casino-toast-wrap';
      document.body.appendChild(toastWrap);
    }
    dom.toastWrap = toastWrap;

    // Full-featured Luxury Overlay
    const overlay = document.createElement('div');
    overlay.id = 'diamond-casino-overlay';
    overlay.className = 'hidden';

    overlay.innerHTML = `
      <div class="dc-topbar">
        <div class="dc-brand">
          <div class="dc-crown-emblem">♛</div>
          <div class="dc-title-col">
            <h2 id="dc-header-title">DIAMOND CROWN CASINO &amp; RESORT</h2>
            <p id="dc-header-sub">Tổ Hợp Giải Trí Thượng Lưu &amp; Đỏ Đen Hoàng Gia</p>
          </div>
        </div>
        <div class="dc-wallet-strip">
          <div class="dc-pill cash" id="dc-wallet-cash">💵 Tiền mặt: $0</div>
          <div class="dc-pill chips" id="dc-wallet-chips">🪙 Phỉnh: 0</div>
          <div class="dc-pill vip" id="dc-wallet-vip">🥉 Hạng Đồng (0 Đ)</div>
          <div class="dc-pill loan hidden" id="dc-wallet-loan">💀 Nợ Mafia: 0</div>
          <button type="button" class="dc-mini-btn" id="dc-btn-bgm" title="Bật/Tắt Nhạc Jazz Thượng Lưu">🎵 Nhạc VIP: BẬT</button>
          <button type="button" class="dc-exit-btn" id="dc-btn-close">✕ Thoát Bàn [ESC]</button>
        </div>
      </div>
      <div class="dc-nav-tabs" id="dc-nav-row"></div>
      <div class="dc-stage-layout" id="dc-body-grid">
        <div class="dc-canvas-card" id="dc-canvas-wrap">
          <canvas id="diamond-casino-canvas" width="980" height="560"></canvas>
          <div id="diamond-casino-custom-stage" class="hidden"></div>
        </div>
        <div class="dc-side-panel" id="dc-side-panel"></div>
      </div>
      <div class="dc-bottom-bar" id="dc-bottom-bar">
        <div class="dc-chip-rack" id="dc-chip-bar"></div>
        <div class="dc-actions" id="dc-action-bar"></div>
      </div>
    `;

    document.body.appendChild(overlay);
    dom.overlay = overlay;
    dom.headerStationTitle = overlay.querySelector('#dc-header-title');
    dom.headerStationSub = overlay.querySelector('#dc-header-sub');
    dom.walletCash = overlay.querySelector('#dc-wallet-cash');
    dom.walletChips = overlay.querySelector('#dc-wallet-chips');
    dom.walletVip = overlay.querySelector('#dc-wallet-vip');
    dom.walletLoan = overlay.querySelector('#dc-wallet-loan');
    dom.navRow = overlay.querySelector('#dc-nav-row');
    dom.bodyGrid = overlay.querySelector('#dc-body-grid');
    dom.canvasWrap = overlay.querySelector('#dc-canvas-wrap');
    dom.canvas = overlay.querySelector('#diamond-casino-canvas');
    dom.customStage = overlay.querySelector('#diamond-casino-custom-stage');
    dom.sidePanel = overlay.querySelector('#dc-side-panel');
    dom.chipBar = overlay.querySelector('#dc-chip-bar');
    dom.actionBar = overlay.querySelector('#dc-action-bar');
    dom.closeBtn = overlay.querySelector('#dc-btn-close');
    dom.bgmBtn = overlay.querySelector('#dc-btn-bgm');

    dom.bgmBtn?.addEventListener('click', () => {
      loungeJazzBGM.enabled = !loungeJazzBGM.enabled;
      if (dom.bgmBtn) {
        dom.bgmBtn.textContent = loungeJazzBGM.enabled ? '🎵 Nhạc VIP: BẬT' : '🔇 Nhạc VIP: TẮT';
      }
      casinoSFX.playChipClink(1);
    });

    dom.closeBtn.addEventListener('click', () => {
      casinoSFX.playChipClink(1);
      closeStation();
    });

    // Build Navigation Tabs for all 10 stations
    dom.navBtns = {};
    for (let i = 0; i < STATION_ORDER.length; i++) {
      const stId = STATION_ORDER[i];
      const meta = STATION_META[stId];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dc-nav-btn';
      btn.textContent = meta.shortLabel;
      btn.addEventListener('click', () => {
        casinoSFX.playChipClink(1);
        switchStationTab(stId);
      });
      dom.navRow.appendChild(btn);
      dom.navBtns[stId] = btn;
    }

    // Build Chip Denomination Selector Rack
    dom.chipBtns = {};
    const rackLabel = document.createElement('span');
    rackLabel.style.cssText = 'font-size:12px;font-weight:800;color:#fde047;margin-right:4px;';
    rackLabel.textContent = 'CHỌN PHỈNH:';
    dom.chipBar.appendChild(rackLabel);

    for (let i = 0; i < CHIP_DENOMS.length; i++) {
      const cd = CHIP_DENOMS[i];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dc-chip-btn' + (state.selectedChip === cd.value ? ' selected' : '');
      b.style.background = cd.base;
      b.style.color = cd.text;
      b.style.borderColor = cd.rim;
      b.textContent = cd.label;
      b.title = `Phỉnh ${formatNum(cd.value)}`;
      b.addEventListener('click', () => {
        state.selectedChip = cd.value;
        casinoSFX.playChipClink(1);
        syncSelectedChipButtons();
      });
      dom.chipBar.appendChild(b);
      dom.chipBtns[cd.value] = b;
    }

    bindCanvasPointerEvents();
  }

  function syncSelectedChipButtons() {
    for (const valStr of Object.keys(dom.chipBtns)) {
      const val = Number(valStr);
      const b = dom.chipBtns[val];
      if (b) b.classList.toggle('selected', state.selectedChip === val);
    }
  }

  function showCasinoToast(message, kind = 'gold', durationSec = 2.8) {
    if (!dom.toastWrap) return;
    const item = document.createElement('div');
    item.className = `dc-toast ${kind}`;
    item.textContent = message;
    dom.toastWrap.appendChild(item);
    while (dom.toastWrap.children.length > 4) {
      dom.toastWrap.removeChild(dom.toastWrap.firstChild);
    }
    setTimeout(() => {
      if (item.parentNode) item.parentNode.removeChild(item);
    }, Math.max(800, durationSec * 1000));
  }

  function refreshHeaderHUD() {
    if (!dom.overlay) return;
    const tier = getCurrentVipTier();
    if (dom.walletCash) dom.walletCash.textContent = `💵 Tiền mặt: ${formatCash(getPlayerCash())}`;
    if (dom.walletChips) dom.walletChips.textContent = `🪙 Phỉnh: ${formatNum(state.chips)}`;
    if (dom.walletVip) dom.walletVip.textContent = `${tier.badge} (${formatNum(state.vipPoints)} Đ)`;
    if (dom.walletLoan) {
      if (state.loanDebt > 0) {
        const sec = Math.max(0, Math.ceil(state.loanTimer));
        const mm = String(Math.floor(sec / 60)).padStart(2, '0');
        const ss = String(sec % 60).padStart(2, '0');
        dom.walletLoan.textContent = state.loanOverdue
          ? `💀 QUÁ HẠN MAFIA: ${formatNum(state.loanDebt)} Phỉnh!`
          : `⏳ Nợ Vay Nóng: ${formatNum(state.loanDebt)} (${mm}:${ss})`;
        dom.walletLoan.classList.remove('hidden');
      } else {
        dom.walletLoan.classList.add('hidden');
      }
    }
  }

  // ============================================================================
  // SECTION 2: DEDICATED PROCEDURAL WEB AUDIO CASINO SFX ENGINE
  // ============================================================================
  const casinoSFX = (() => {
    let fallbackAudioCtx = null;
    let noiseBuffer = null;
    let noiseBufferSampleRate = 0;
    let masterBus = null;
    let boundCtxRef = null;
    let lastScrapeAt = 0;
    let lastPegAt = 0;
    let lastSpinTickAt = 0;

    function getAudioCtx() {
      try {
        if (activeCtx?.audio?.unlock) {
          activeCtx.audio.unlock();
        }
        const shared = activeCtx?.audio?.ctx || activeCtx?.audio?.audioCtx || null;
        const ac = shared || fallbackAudioCtx || createFallbackAudioCtx();
        if (!ac) return null;
        if (ac.state === 'suspended' && typeof ac.resume === 'function') {
          ac.resume().catch(() => {});
        }
        if (ac !== boundCtxRef || !masterBus) {
          boundCtxRef = ac;
          masterBus = ac.createGain();
          masterBus.gain.value = 0.68;
          masterBus.connect(ac.destination);
        }
        if (!noiseBuffer || noiseBufferSampleRate !== ac.sampleRate) {
          noiseBufferSampleRate = ac.sampleRate;
          const len = Math.floor(ac.sampleRate * 1.2);
          noiseBuffer = ac.createBuffer(1, len, ac.sampleRate);
          const data = noiseBuffer.getChannelData(0);
          for (let i = 0; i < len; i++) {
            data[i] = Math.random() * 2 - 1;
          }
        }
        return ac;
      } catch (_) {
        return null;
      }
    }

    function createFallbackAudioCtx() {
      if (typeof window === 'undefined') return null;
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      try {
        fallbackAudioCtx = new Ctor();
        return fallbackAudioCtx;
      } catch (_) {
        return null;
      }
    }

    function tone(type, f0, f1, dur, gainPeak, delay = 0, filterFreq = 0) {
      const ac = getAudioCtx();
      if (!ac || !masterBus) return;
      try {
        const t0 = ac.currentTime + Math.max(0, delay);
        const osc = ac.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(24, f0), t0);
        if (Math.abs(f1 - f0) > 0.5) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(24, f1), t0 + dur);
        }
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(Math.max(0.0002, gainPeak), t0 + Math.min(0.012, dur * 0.25));
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

        if (filterFreq > 0) {
          const flt = ac.createBiquadFilter();
          flt.type = 'lowpass';
          flt.frequency.setValueAtTime(filterFreq, t0);
          osc.connect(flt);
          flt.connect(g);
        } else {
          osc.connect(g);
        }
        g.connect(masterBus);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
      } catch (_) {}
    }

    function noise(dur, filterType, freq, q, gainPeak, delay = 0) {
      const ac = getAudioCtx();
      if (!ac || !masterBus || !noiseBuffer) return;
      try {
        const t0 = ac.currentTime + Math.max(0, delay);
        const src = ac.createBufferSource();
        src.buffer = noiseBuffer;
        const flt = ac.createBiquadFilter();
        flt.type = filterType;
        flt.frequency.setValueAtTime(Math.max(40, freq), t0);
        flt.Q.setValueAtTime(Math.max(0.2, q), t0);

        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(Math.max(0.0002, gainPeak), t0 + Math.min(0.01, dur * 0.2));
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

        src.connect(flt);
        flt.connect(g);
        g.connect(masterBus);
        src.start(t0, Math.random() * 0.4);
        src.stop(t0 + dur + 0.02);
      } catch (_) {}
    }

    return {
      unlock() {
        getAudioCtx();
      },

      playChipClink(count = 1) {
        const n = clamp(count, 1, 6);
        for (let i = 0; i < n; i++) {
          const d = i * 0.032 + Math.random() * 0.012;
          const base = 2750 + Math.random() * 680;
          tone('sine', base, base * 0.94, 0.048, 0.11, d);
          tone('triangle', base * 1.56, base * 1.48, 0.036, 0.065, d + 0.004);
          noise(0.024, 'bandpass', 4200, 4.5, 0.055, d);
        }
      },

      playChipSweep() {
        noise(0.18, 'bandpass', 1800, 1.8, 0.09, 0);
        this.playChipClink(5);
      },

      playCardRiffle() {
        for (let i = 0; i < 14; i++) {
          const d = i * 0.024 + (i > 7 ? 0.02 : 0);
          noise(0.022, 'highpass', 2400 + i * 110, 1.5, 0.09, d);
          tone('triangle', 420 + i * 26, 260, 0.02, 0.035, d);
        }
      },

      playCardDeal() {
        noise(0.055, 'bandpass', 2850, 2.2, 0.14, 0);
        tone('triangle', 540, 210, 0.042, 0.06, 0.008);
      },

      playCardFlip() {
        noise(0.045, 'highpass', 3200, 1.8, 0.12, 0);
        tone('sine', 780, 440, 0.038, 0.055, 0.005);
      },

      playCardSqueezeCreak() {
        const ac = getAudioCtx();
        if (!ac || ac.currentTime - lastScrapeAt < 0.07) return;
        lastScrapeAt = ac.currentTime;
        noise(0.05, 'bandpass', 1450 + Math.random() * 450, 5.0, 0.045, 0);
        tone('sine', 310 + Math.random() * 90, 270, 0.045, 0.025, 0);
      },

      playDiceShakeInBowl() {
        for (let i = 0; i < 11; i++) {
          const d = i * 0.052 + Math.random() * 0.018;
          const f = 1850 + Math.random() * 1450;
          tone('sine', f, f * 0.88, 0.042, 0.11, d);
          tone('triangle', f * 1.42, f * 1.32, 0.03, 0.06, d + 0.006);
          noise(0.032, 'bandpass', 3100, 3.8, 0.085, d);
        }
        // Ceramic plate settle thud
        tone('sine', 210, 82, 0.14, 0.18, 0.62);
      },

      playBowlScrape(speed = 0.5) {
        const ac = getAudioCtx();
        if (!ac || ac.currentTime - lastScrapeAt < 0.06) return;
        lastScrapeAt = ac.currentTime;
        const v = clamp(speed, 0.2, 1.0);
        noise(0.065, 'bandpass', 1120 + v * 650, 4.2, 0.065 * v, 0);
        tone('triangle', 620 + v * 220, 540, 0.05, 0.028 * v, 0);
      },

      playCoinShake() {
        for (let i = 0; i < 10; i++) {
          const d = i * 0.055 + Math.random() * 0.015;
          const f = 3400 + Math.random() * 1700;
          tone('sine', f, f * 0.97, 0.055, 0.095, d);
          tone('sine', f * 1.37, f * 1.34, 0.045, 0.065, d + 0.005);
          noise(0.025, 'highpass', 4500, 2.0, 0.05, d);
        }
        tone('triangle', 190, 76, 0.13, 0.16, 0.58);
      },

      playRouletteSpin() {
        noise(0.45, 'bandpass', 920, 2.6, 0.09, 0);
        tone('sine', 180, 120, 0.35, 0.07, 0);
      },

      playRouletteBallBounce(intensity = 0.7) {
        const v = clamp(intensity, 0.15, 1.0);
        const f = 2100 + Math.random() * 750;
        tone('sine', f, f * 0.84, 0.042, 0.12 * v, 0);
        noise(0.026, 'bandpass', 2600, 4.0, 0.08 * v, 0);
      },

      playSlotSpinTick() {
        const ac = getAudioCtx();
        if (!ac || ac.currentTime - lastSpinTickAt < 0.048) return;
        lastSpinTickAt = ac.currentTime;
        tone('triangle', 740 + Math.random() * 180, 520, 0.024, 0.042, 0);
      },

      playSlotReelClunk(reelIdx = 0) {
        const f = 155 + reelIdx * 22;
        tone('sine', f, 54, 0.095, 0.22, 0);
        noise(0.045, 'bandpass', 1200 + reelIdx * 180, 2.8, 0.11, 0);
      },

      playSlotPaylineLaser(lineIdx = 0) {
        const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
        const f = scale[lineIdx % scale.length];
        tone('triangle', f, f * 1.25, 0.14, 0.11, 0, 3200);
        tone('sine', f * 2, f * 2.5, 0.11, 0.06, 0.03);
      },

      playFeverTrigger() {
        const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.5];
        for (let i = 0; i < notes.length; i++) {
          tone('sawtooth', notes[i], notes[i] * 1.02, 0.26, 0.11, i * 0.075, 2800);
          tone('triangle', notes[i] * 0.5, notes[i] * 0.5, 0.26, 0.09, i * 0.075, 1600);
        }
      },

      playWheelPegClick(velRatio = 0.6) {
        const ac = getAudioCtx();
        if (!ac || ac.currentTime - lastPegAt < 0.028) return;
        lastPegAt = ac.currentTime;
        const v = clamp(velRatio, 0.2, 1.0);
        tone('triangle', 1280 + v * 620, 420, 0.032, 0.11 * v, 0);
        noise(0.018, 'bandpass', 2900, 4.0, 0.06 * v, 0);
      },

      playDerbyStartBell() {
        tone('sine', 1396.9, 1396.9, 0.38, 0.16, 0);
        tone('sine', 2793.8, 2760.0, 0.28, 0.08, 0);
        tone('sine', 1396.9, 1396.9, 0.42, 0.16, 0.18);
      },

      playDerbyGallopOrTurbo(isCarMode = false, intensity = 0.6) {
        const v = clamp(intensity, 0.2, 1.0);
        if (isCarMode) {
          tone('sawtooth', 95 + v * 140, 115 + v * 165, 0.08, 0.05 * v, 0, 1100);
        } else {
          noise(0.035, 'lowpass', 620, 1.4, 0.07 * v, 0);
          noise(0.035, 'lowpass', 740, 1.4, 0.06 * v, 0.075);
        }
      },

      playPhotoShutter() {
        noise(0.075, 'highpass', 2600, 1.2, 0.22, 0);
        tone('sine', 1950, 820, 0.055, 0.12, 0.02);
      },

      playWinFanfare(power = 0.7) {
        const p = clamp(power, 0.3, 1.2);
        const chord = [523.25, 659.25, 783.99, 1046.5];
        for (let i = 0; i < chord.length; i++) {
          tone('triangle', chord[i], chord[i], 0.42, 0.11 * p, i * 0.055, 2900);
        }
        this.playChipClink(Math.round(3 * p));
      },

      playMegaJackpotCascade() {
        const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
        for (let i = 0; i < fanfare.length; i++) {
          tone('sawtooth', fanfare[i], fanfare[i], 0.65, 0.12, i * 0.08, 3200);
          tone('triangle', fanfare[i] * 0.5, fanfare[i] * 0.5, 0.65, 0.10, i * 0.08, 1800);
        }
        // 28 cascading metallic coins into steel hopper
        for (let c = 0; c < 28; c++) {
          const d = 0.18 + c * 0.055 + Math.random() * 0.025;
          const cf = 3100 + Math.random() * 1900;
          tone('sine', cf, cf * 0.96, 0.075, 0.09, d);
          tone('sine', cf * 1.41, cf * 1.38, 0.055, 0.055, d + 0.008);
        }
      },

      playLoanSharkThreat() {
        tone('sawtooth', 110, 82.41, 0.75, 0.22, 0, 520);
        tone('sawtooth', 116.54, 87.31, 0.75, 0.18, 0.06, 520);
        tone('sine', 55, 36.7, 0.95, 0.28, 0);
      },

      playError() {
        tone('sawtooth', 230, 155, 0.16, 0.14, 0, 1100);
      },

      playSoftJazzVoice(type, freq, dur, peak, filterCutoff = 1200, delay = 0) {
        tone(type, freq, freq, dur, peak, delay, filterCutoff);
      },

      playBrushRide(dur = 0.04, peak = 0.02) {
        noise(dur, 'highpass', 5800, 1.4, peak, 0);
      }
    };
  })();

  // Procedural Monte-Carlo Velvet Lounge Jazz Synthesizer (plays softly while inside Casino Overlay)
  const loungeJazzBGM = {
    enabled: true,
    stepTimer: 0,
    stepIdx: 0,
    chords: [
      [261.63, 329.63, 392.00, 493.88, 587.33], // Cmaj9
      [220.00, 261.63, 329.63, 392.00, 493.88], // Am9
      [293.66, 349.23, 440.00, 523.25, 659.25], // Dm9
      [196.00, 246.94, 349.23, 440.00, 587.33]  // G13
    ],
    walkingBass: [
      [65.41, 73.42, 82.41, 98.00],
      [55.00, 65.41, 73.42, 82.41],
      [73.42, 82.41, 87.31, 98.00],
      [49.00, 61.74, 73.42, 61.74]
    ],
    update(dt) {
      if (!this.enabled || !state.isOpen) return;
      this.stepTimer -= dt;
      if (this.stepTimer > 0) return;
      // Swing eighth-note feel (~96 BPM)
      const isOffbeat = this.stepIdx % 2 === 1;
      this.stepTimer = isOffbeat ? 0.24 : 0.36;

      const s8 = this.stepIdx % 8;
      const bar = Math.floor(this.stepIdx / 8) % 4;
      this.stepIdx = (this.stepIdx + 1) % 32;

      // Brushed jazz ride cymbal pattern
      if (s8 % 2 === 0 || s8 === 3 || s8 === 7) {
        casinoSFX.playBrushRide(s8 % 2 === 0 ? 0.055 : 0.032, s8 % 2 === 0 ? 0.018 : 0.012);
      }

      // Upright walking bass on quarter notes
      if (s8 % 2 === 0) {
        const bassFreq = this.walkingBass[bar][(s8 >> 1) & 3];
        casinoSFX.playSoftJazzVoice('triangle', bassFreq, 0.48, 0.038, 420, 0);
      }

      // Warm Rhodes electric piano comping chords
      if (s8 === 0 || s8 === 5) {
        const ch = this.chords[bar];
        for (let i = 0; i < ch.length; i++) {
          casinoSFX.playSoftJazzVoice('sine', ch[i], s8 === 0 ? 1.45 : 0.65, 0.016, 1350, i * 0.016);
        }
      }
    }
  };

  // ============================================================================
  // SECTION 3: STATION 1 — QUẦY THU NGÂN, THƯỢNG LƯU VIP & TÍN DỤNG ĐEN MAFIA
  //            (1:1 Cash <-> Chips + Outdoor Black-Suited Enforcer SUV Squad AI)
  // ============================================================================
  const mafiaEnforcers = {
    activeWave: false,
    respawnCooldown: 0,
    suvs: [],
    gunmen: [],
    warningToastCooldown: 0
  };

  function isPlayerIndoors(p) {
    if (!p) return true;
    if (p.inSafehouse) return true;
    // Casino (1200, 1200), Nightclub (1500, 1500), Động Phủ Tu Luyện (800, 800), Bank (2100, 2100)
    if (Math.hypot(p.x - 1200, p.z - 1200) < 95) return true;
    if (Math.hypot(p.x - 1500, p.z - 1500) < 95) return true;
    if (Math.hypot(p.x - 800, p.z - 800) < 75) return true;
    if (Math.hypot(p.x - 2100, p.z - 2100) < 95) return true;
    return false;
  }

  function clearMafiaEnforcers() {
    const scene = activeCtx?.engine?.scene;
    const gpAgents = activeCtx?.gameplay?.agents;
    for (let i = 0; i < mafiaEnforcers.gunmen.length; i++) {
      const g = mafiaEnforcers.gunmen[i];
      if (g?.mesh?.parent) g.mesh.parent.remove(g.mesh);
      if (Array.isArray(gpAgents)) {
        const idx = gpAgents.indexOf(g);
        if (idx !== -1) gpAgents.splice(idx, 1);
      }
    }
    for (let i = 0; i < mafiaEnforcers.suvs.length; i++) {
      const car = mafiaEnforcers.suvs[i];
      if (car && activeCtx?.vehicles?.removeVehicle) {
        try {
          activeCtx.vehicles.removeVehicle(car);
        } catch (_) {}
      } else if (car?.mesh && scene) {
        scene.remove(car.mesh);
      }
    }
    mafiaEnforcers.gunmen.length = 0;
    mafiaEnforcers.suvs.length = 0;
    mafiaEnforcers.activeWave = false;
  }

  function spawnMafiaEnforcerWave() {
    const p = activeCtx?.player;
    const scene = activeCtx?.engine?.scene;
    if (!p || !scene || isPlayerIndoors(p)) return;

    clearMafiaEnforcers();
    mafiaEnforcers.activeWave = true;

    if (activeCtx.gameplay && !Array.isArray(activeCtx.gameplay.agents)) {
      activeCtx.gameplay.agents = [];
    }

    casinoSFX.playLoanSharkThreat();
    activeCtx?.ui?.showBanner?.('BĂNG ĐÒI NỢ SÒNG BẠC', `Quá hạn nợ ${formatNum(state.loanDebt)} Phỉnh — Sát thủ Mafia đang săn lùng bạn!`, 'danger', 4.2);
    activeCtx?.ui?.showSubtitle?.('Đàn em *Ông Trùm Vũ* đã phóng SUV đen tới đòi nợ máu! Hạ gục chúng hoặc về *Quầy Thu Ngân Casino* trả nợ!', 6.0);

    const angles = [p.yaw + Math.PI + 0.35, p.yaw + Math.PI - 0.35];
    for (let s = 0; s < 2; s++) {
      const ang = angles[s];
      const dist = 36 + s * 9;
      const sx = clamp(p.x + Math.cos(ang) * dist, -230, 230);
      const sz = clamp(p.z + Math.sin(ang) * dist, -230, 230);
      const sy = activeCtx?.world?.getGroundHeight ? activeCtx.world.getGroundHeight(sx, sz) : 0.05;
      const faceYaw = Math.atan2(p.x - sx, p.z - sz);

      let suv = null;
      if (activeCtx?.vehicles?.spawnVehicle) {
        try {
          suv = activeCtx.vehicles.spawnVehicle('suv', sx, sy, sz, faceYaw, {
            color: 0x0a0b0f,
            plate: s === 0 ? 'MAFIA 01' : 'DEBT 888',
            isParked: false
          });
          if (suv) {
            suv.aiControlled = true;
            suv.displayName = 'SUV Đòi Nợ Thuê Mafia Casino';
            mafiaEnforcers.suvs.push(suv);
          }
        } catch (_) {}
      }

      // Spawn 2 black-suited armed Casino Enforcers per SUV
      for (let e = 0; e < 2; e++) {
        const ex = sx + (e === 0 ? -1.8 : 1.8);
        const ez = sz + (s === 0 ? 1.5 : -1.5);
        const ey = activeCtx?.world?.getGroundHeight ? activeCtx.world.getGroundHeight(ex, ez) : sy;

        let rig = null;
        if (activeCtx?.characters?.createHumanoid) {
          try {
            rig = activeCtx.characters.createHumanoid('gangster');
            activeCtx.characters.setOutfit?.(rig, 'luxury_suit');
          } catch (_) {}
        }
        const mesh = rig?.root || rig?.group || rig || new THREE.Group();
        if (mesh && mesh.isObject3D) {
          mesh.position.set(ex, ey, ez);
          if (!mesh.parent) scene.add(mesh);
        }

        const wpn = e === 0 ? 'smg' : 'shotgun';
        const enforcer = {
          role: 'casino_enforcer',
          type: 'gangster',
          x: ex,
          y: ey,
          z: ez,
          vx: 0,
          vz: 0,
          yaw: faceYaw,
          hp: 115,
          maxHp: 115,
          armor: 45,
          dead: false,
          isEnemy: true,
          isHostile: true,
          noWantedOnKill: true,
          weapon: wpn,
          weaponId: wpn,
          shootTimer: randFloat(0.6, 1.5),
          assignedSuv: suv,
          rig,
          mesh
        };

        if (rig && activeCtx?.characters?.equipWeapon) {
          try {
            activeCtx.characters.equipWeapon(enforcer, wpn);
          } catch (_) {}
        }
        mafiaEnforcers.gunmen.push(enforcer);
        if (Array.isArray(activeCtx?.gameplay?.agents)) {
          activeCtx.gameplay.agents.push(enforcer);
        }
      }
    }
  }

  function updateLoanAndMafiaEnforcers(dt) {
    const p = activeCtx?.player;

    // Update Loan Timer & HUD Warning Pill
    if (state.loanDebt > 0) {
      if (!state.loanOverdue) {
        state.loanTimer = Math.max(0, state.loanTimer - dt);
        if (state.loanTimer <= 0) {
          state.loanOverdue = true;
          // Apply additional 10% late penalty once
          state.loanDebt = Math.round(state.loanDebt * 1.1);
          saveCasinoState();
          casinoSFX.playLoanSharkThreat();
          activeCtx?.ui?.showNotification?.('💀 KHOẢN VAY NÓNG SÒNG BẠC ĐÃ QUÁ HẠN! Mafia đã cử đội SUV đen đi săn bạn!');
        }
      }

      if (dom.loanHudWarn) {
        dom.loanHudWarn.classList.remove('hidden');
        dom.loanHudWarn.classList.toggle('overdue', state.loanOverdue);
        if (state.loanOverdue) {
          dom.loanHudWarn.textContent = `💀 QUÁ HẠN NỢ MAFIA: ${formatNum(state.loanDebt)} Phỉnh • Đang bị truy sát!`;
        } else {
          const sec = Math.ceil(state.loanTimer);
          const mm = String(Math.floor(sec / 60)).padStart(2, '0');
          const ss = String(sec % 60).padStart(2, '0');
          dom.loanHudWarn.textContent = `⏳ Nợ Tín Dụng Đen: ${formatNum(state.loanDebt)} Phỉnh (${mm}:${ss})`;
        }
      }
    } else {
      if (dom.loanHudWarn && !dom.loanHudWarn.classList.contains('hidden')) {
        dom.loanHudWarn.classList.add('hidden');
      }
      if (mafiaEnforcers.activeWave) {
        clearMafiaEnforcers();
      }
      return;
    }

    if (!p || p.dead || p.isDead) {
      // If player was Wasted while owing overdue debt, Mafia collects up to 25% of available cash and resets wave
      if (mafiaEnforcers.activeWave) {
        clearMafiaEnforcers();
        mafiaEnforcers.respawnCooldown = 45;
      }
      return;
    }

    if (!state.loanOverdue) return;

    const indoors = isPlayerIndoors(p);
    if (indoors) return;

    if (!mafiaEnforcers.activeWave) {
      mafiaEnforcers.respawnCooldown -= dt;
      if (mafiaEnforcers.respawnCooldown <= 0) {
        spawnMafiaEnforcerWave();
      }
      return;
    }

    // Drive SUV pursuit toward player
    for (let i = 0; i < mafiaEnforcers.suvs.length; i++) {
      const suv = mafiaEnforcers.suvs[i];
      if (!suv || suv.destroyed) continue;
      const dx = p.x - suv.x;
      const dz = p.z - suv.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 17) {
        const targetYaw = Math.atan2(dx, dz);
        let diff = targetYaw - suv.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        suv.yaw += clamp(diff, -2.4 * dt, 2.4 * dt);
        const spd = dist > 38 ? 20 : 12.5;
        suv.x += Math.sin(suv.yaw) * spd * dt;
        suv.z += Math.cos(suv.yaw) * spd * dt;
        suv.braking = false;
      } else {
        suv.braking = true;
      }
    }

    // Drive armed black-suited Enforcer gunmen
    let aliveCount = 0;
    for (let i = 0; i < mafiaEnforcers.gunmen.length; i++) {
      const g = mafiaEnforcers.gunmen[i];
      if (!g) continue;
      if (g.hp <= 0 || g.dead) {
        if (!g.dead) {
          g.dead = true;
          activeCtx?.characters?.animateHumanoid?.(g.rig, 'dead', dt);
        }
        continue;
      }
      aliveCount++;

      const dx = p.x - g.x;
      const dz = p.z - g.z;
      const dist = Math.hypot(dx, dz) || 1;
      g.yaw = Math.atan2(dx, dz);

      let animMode = 'pistol';
      if (dist > 14) {
        const runSpd = dist > 32 ? 6.4 : 4.3;
        g.vx = (dx / dist) * runSpd;
        g.vz = (dz / dist) * runSpd;
        g.x += g.vx * dt;
        g.z += g.vz * dt;
        animMode = runSpd > 5 ? 'run' : 'walk';
      } else {
        // Strafe slightly while aiming
        const strafe = Math.sin((activeCtx.elapsed || 0) * 1.8 + i * 1.7) * 1.6;
        g.x += (-dz / dist) * strafe * dt;
        g.z += (dx / dist) * strafe * dt;
        animMode = g.weapon === 'shotgun' ? 'rifle' : 'pistol';
      }

      const gy = activeCtx?.world?.getGroundHeight ? activeCtx.world.getGroundHeight(g.x, g.z) : 0.05;
      g.y = gy;
      if (g.mesh) {
        g.mesh.position.set(g.x, g.y, g.z);
        g.mesh.rotation.set(0, g.yaw, 0);
      }
      activeCtx?.characters?.animateHumanoid?.(g.rig, animMode, dt, { moveSpeed: Math.hypot(g.vx, g.vz) });

      g.shootTimer -= dt;
      if (g.shootTimer <= 0 && dist < 44) {
        g.shootTimer = g.weapon === 'shotgun' ? randFloat(1.15, 1.85) : randFloat(0.45, 0.95);
        if (activeCtx?.characters?.fireWeapon) {
          try {
            activeCtx.characters.fireWeapon(g, p, g.weapon, activeCtx);
          } catch (_) {}
        }
      }
    }

    if (aliveCount === 0) {
      clearMafiaEnforcers();
      mafiaEnforcers.respawnCooldown = 75; // Next hit squad in 75s until debt is cleared!
      activeCtx?.ui?.showNotification?.('Đã đẩy lùi toán đòi nợ Mafia! Trả nợ tại Casino trước khi toán tiếp theo kéo tới!');
    }
  }

  // Public Wallet & Loan Transactions
  function buyChips(amount) {
    const amt = Math.floor(Number(amount) || 0);
    if (amt <= 0) return false;
    const cash = getPlayerCash();
    if (cash < amt) {
      showCasinoToast(`Không đủ Tiền Mặt! Bạn hiện có ${formatCash(cash)}.`, 'error');
      casinoSFX.playError();
      return false;
    }
    setPlayerCash(cash - amt, true);
    addChips(amt, 'exchange');
    casinoSFX.playChipSweep();
    showCasinoToast(`Đã mua thành công +${formatNum(amt)} Phỉnh (Tỷ lệ 1:1)!`, 'win');
    if (state.activeStation === 'cashier' && state.isOpen) renderCashierDOM();
    return true;
  }

  function cashOutChips(amount) {
    const amt = Math.floor(Number(amount) || 0);
    if (amt <= 0) return false;
    if (state.chips < amt) {
      showCasinoToast(`Bạn chỉ có ${formatNum(state.chips)} Phỉnh để quy đổi!`, 'error');
      casinoSFX.playError();
      return false;
    }
    state.chips -= amt;
    setPlayerCash(getPlayerCash() + amt, true);
    saveCasinoState();
    casinoSFX.playChipSweep();
    showCasinoToast(`Đã đổi ${formatNum(amt)} Phỉnh thành +${formatCash(amt)} Tiền Mặt!`, 'win');
    if (state.activeStation === 'cashier' && state.isOpen) renderCashierDOM();
    return true;
  }

  function claimVisitorBonus() {
    const stamp = todayStamp();
    if (state.lastVisitorDay === stamp) {
      showCasinoToast('Bạn đã nhận Quà Khách Viếng Thăm hôm nay rồi! Quay lại vào ngày mai nhé.', 'error');
      casinoSFX.playError();
      return false;
    }
    const tier = getCurrentVipTier();
    const bonus = tier.dailyBonus;
    state.lastVisitorDay = stamp;
    addChips(bonus, 'exchange');
    casinoSFX.playWinFanfare(0.8);
    showCasinoToast(`🎁 Đã nhận +${formatNum(bonus)} Phỉnh Khách Quý (${tier.badge})!`, 'win', 3.8);
    if (state.activeStation === 'cashier' && state.isOpen) renderCashierDOM();
    return true;
  }

  function claimVipRebate() {
    if (state.vipRebatePool <= 0) {
      showCasinoToast('Chưa có Phỉnh hoàn trả tích lũy! Hãy tham gia đặt cược tại các bàn.', 'error');
      casinoSFX.playError();
      return false;
    }
    const amt = state.vipRebatePool;
    state.vipRebatePool = 0;
    addChips(amt, 'refund');
    casinoSFX.playWinFanfare(0.75);
    showCasinoToast(`💎 Đã nhận +${formatNum(amt)} Phỉnh Hoàn Trả Thượng Lưu VIP!`, 'win');
    if (state.activeStation === 'cashier' && state.isOpen) renderCashierDOM();
    return true;
  }

  function takeLoan(amount) {
    const tier = getCurrentVipTier();
    const maxAllowed = 50000;
    const req = Math.floor(Number(amount) || 0);
    if (req < 500) {
      showCasinoToast('Khoản vay tối thiểu là 500 Phỉnh!', 'error');
      return false;
    }
    const currentPrincipal = state.loanDebt;
    if (currentPrincipal + req > maxAllowed) {
      showCasinoToast(`Tín Dụng Đen Mafia cho vay tối đa ${formatNum(maxAllowed)} Phỉnh!`, 'error');
      casinoSFX.playError();
      return false;
    }
    const totalWithVig = Math.round(req * (1 + LOAN_INTEREST_RATE));
    state.loanPrincipal += req;
    state.loanDebt += totalWithVig;
    if (!state.loanOverdue && state.loanTimer <= 0) {
      state.loanTimer = LOAN_DURATION_SEC;
    } else if (!state.loanOverdue) {
      state.loanTimer = Math.max(state.loanTimer, 240);
    }
    addChips(req, 'loan');
    casinoSFX.playLoanSharkThreat();
    showCasinoToast(
      `💀 Đã vay nóng +${formatNum(req)} Phỉnh (Phải trả ${formatNum(totalWithVig)} trong 6 phút trước khi Mafia truy sát!)`,
      'error',
      4.5
    );
    saveCasinoState(true);
    if (state.activeStation === 'cashier' && state.isOpen) renderCashierDOM();
    return true;
  }

  function repayLoan(amount) {
    if (state.loanDebt <= 0) {
      showCasinoToast('Bạn hiện không nợ đồng nào với Ông Trùm Vũ!', 'win');
      return false;
    }
    const payAmt = Math.min(state.loanDebt, Math.max(1, Math.floor(Number(amount) || state.loanDebt)));
    if (state.chips >= payAmt) {
      state.chips -= payAmt;
    } else {
      const neededCash = payAmt - state.chips;
      const cash = getPlayerCash();
      if (cash < neededCash) {
        showCasinoToast(`Không đủ Phỉnh hoặc Tiền Mặt để trả ${formatNum(payAmt)}!`, 'error');
        casinoSFX.playError();
        return false;
      }
      state.chips = 0;
      setPlayerCash(cash - neededCash, true);
    }

    state.loanDebt = Math.max(0, state.loanDebt - payAmt);
    if (state.loanDebt === 0) {
      state.loanPrincipal = 0;
      state.loanTimer = 0;
      state.loanOverdue = false;
      state.stats.loansRepaid++;
      clearMafiaEnforcers();
      casinoSFX.playWinFanfare(0.9);
      showCasinoToast('✅ ĐÃ TẤT TOÁN SẠCH NỢ TÍN DỤNG ĐEN MAFIA! Lệnh truy sát đã được gỡ bỏ.', 'win', 4.0);
    } else {
      casinoSFX.playChipSweep();
      showCasinoToast(`Đã trả bớt ${formatNum(payAmt)}! Dư nợ còn lại: ${formatNum(state.loanDebt)} Phỉnh.`, 'gold');
    }
    saveCasinoState(true);
    refreshHeaderHUD();
    if (state.activeStation === 'cashier' && state.isOpen) renderCashierDOM();
    return true;
  }

  function renderCashierDOM() {
    if (!dom.customStage || !dom.sidePanel) return;
    const tier = getCurrentVipTier();
    const nextTier = getNextVipTier();
    const cash = getPlayerCash();
    const visitorClaimed = state.lastVisitorDay === todayStamp();
    const freeWheelReady = state.lastFreeWheelDay !== todayStamp();
    const progressPct = nextTier
      ? clamp(((state.vipPoints - tier.minPoints) / Math.max(1, nextTier.minPoints - tier.minPoints)) * 100, 0, 100)
      : 100;

    const loanSec = Math.max(0, Math.ceil(state.loanTimer));
    const loanMM = String(Math.floor(loanSec / 60)).padStart(2, '0');
    const loanSS = String(loanSec % 60).padStart(2, '0');

    dom.customStage.innerHTML = `
      <div class="dc-cashier-grid">
        <div class="dc-card-panel">
          <h3>🏦 ĐỔI TIỀN MẶT ↔ PHỈNH (TỶ LỆ CHUẨN 1:1)</h3>
          <p style="margin:0 0 10px;color:#cbd5e1;font-size:12.5px;">
            Số dư hiện có: <strong style="color:#86efac;">${formatCash(cash)}</strong> •
            <strong style="color:#fde047;">${formatNum(state.chips)} Phỉnh</strong>
          </p>
          <div class="dc-input-row">
            <input type="number" id="dc-cashier-amt" class="dc-input" min="10" step="100" value="1000" placeholder="Nhập số lượng..." />
          </div>
          <div class="dc-preset-row">
            <button type="button" class="dc-mini-btn" data-preset="500">+500</button>
            <button type="button" class="dc-mini-btn" data-preset="2000">+2.000</button>
            <button type="button" class="dc-mini-btn" data-preset="10000">+10.000</button>
            <button type="button" class="dc-mini-btn" data-preset="50000">+50.000</button>
            <button type="button" class="dc-mini-btn" data-preset="max_cash">Tối Đa $</button>
            <button type="button" class="dc-mini-btn" data-preset="max_chips">Tối Đa Phỉnh</button>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="dc-btn gold" id="dc-btn-buy-chips" style="flex:1;">💵 ➔ 🪙 MUA PHỈNH</button>
            <button type="button" class="dc-btn emerald" id="dc-btn-cashout" style="flex:1;">🪙 ➔ 💵 ĐỔI TIỀN MẶT</button>
          </div>
        </div>

        <div class="dc-card-panel" style="border-color:rgba(248,113,113,0.65);">
          <h3 style="color:#fca5a5;">💀 TÍN DỤNG ĐEN MAFIA ("VAY NÓNG ÔNG TRÙM VŨ")</h3>
          <p style="margin:0 0 8px;color:#fecaca;font-size:12px;line-height:1.45;">
            Hạn mức tối đa <strong>50.000 Phỉnh</strong> (Lãi cắt cổ <strong>15%</strong>).
            Cảnh báo: Sau <strong>06:00 phút</strong> không tất toán, đội SUV bọc thép mặc vest đen của Sòng Bạc sẽ truy sát bạn ngoài phố!
          </p>
          <div style="padding:8px 10px;border-radius:8px;background:rgba(0,0,0,0.45);margin-bottom:9px;font-size:12.5px;">
            Dư nợ hiện tại: <strong style="color:${state.loanDebt > 0 ? '#f87171' : '#4ade80'};">${formatNum(state.loanDebt)} Phỉnh</strong>
            ${state.loanDebt > 0 ? ` • Thời hạn: <strong>${state.loanOverdue ? 'QUÁ HẠN — ĐANG TRUY SÁT!' : `${loanMM}:${loanSS}`}</strong>` : ' • Lý lịch sạch'}
          </div>
          <div class="dc-preset-row">
            <button type="button" class="dc-mini-btn" data-loan="5000">Vay 5.000</button>
            <button type="button" class="dc-mini-btn" data-loan="15000">Vay 15.000</button>
            <button type="button" class="dc-mini-btn" data-loan="30000">Vay 30.000</button>
            <button type="button" class="dc-mini-btn" data-loan="50000">Vay Tối Đa 50K</button>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="dc-btn crimson" id="dc-btn-repay-half" ${state.loanDebt <= 0 ? 'disabled' : ''} style="flex:1;">Trả 1/2 Nợ</button>
            <button type="button" class="dc-btn gold" id="dc-btn-repay-all" ${state.loanDebt <= 0 ? 'disabled' : ''} style="flex:1;">Tất Toán Toàn Bộ</button>
          </div>
        </div>

        <div class="dc-card-panel">
          <h3>🎁 ĐẶC QUYỀN KHÁCH QUÝ &amp; VÒNG QUAY MIỄN PHÍ</h3>
          <p style="margin:0 0 10px;color:#cbd5e1;font-size:12px;line-height:1.45;">
            Mỗi ngày ghé thăm Vạn Bảo Đổ Phường nhận ngay <strong>${formatNum(tier.dailyBonus)} Phỉnh Miễn Phí</strong> (theo cấp VIP) và <strong>1 Lượt Quay Kim Cương</strong> trúng Siêu Xe Vàng Podium!
          </p>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <button type="button" class="dc-btn gold" id="dc-btn-visitor-bonus" ${visitorClaimed ? 'disabled' : ''}>
              ${visitorClaimed ? '✓ Đã Nhận Phỉnh Khách Quý Hôm Nay' : `🎁 Nhận Ngay +${formatNum(tier.dailyBonus)} Phỉnh Miễn Phí`}
            </button>
            <button type="button" class="dc-btn purple" id="dc-btn-goto-wheel">
              💎 ${freeWheelReady ? 'Quay Vòng Quay Kim Cương (Đang Có 1 Lượt FREE!)' : 'Mở Vòng Quay Kim Cương 20 Ô'}
            </button>
          </div>
        </div>

        <div class="dc-card-panel">
          <h3>👑 HỒ SƠ THƯỢNG LƯU: ${tier.badge}</h3>
          <p style="margin:0;font-size:12px;color:#e2e8f0;">
            Điểm VIP: <strong style="color:#fde047;">${formatNum(state.vipPoints)}</strong>
            ${nextTier ? ` / ${formatNum(nextTier.minPoints)} (${nextTier.badge})` : ' • ĐÃ ĐẠT ĐỈNH BỐ GIÀ!'}
          </p>
          <div class="dc-progress-track">
            <div class="dc-progress-fill" style="width:${progressPct.toFixed(1)}%;"></div>
          </div>
          <p style="margin:0 0 10px;font-size:12px;color:#bae6fd;">
            Hoàn trả cược tự động (${(tier.rebateRate * 100).toFixed(1)}%): <strong>${formatNum(state.vipRebatePool)} Phỉnh chờ nhận</strong>
          </p>
          <button type="button" class="dc-btn emerald" id="dc-btn-claim-rebate" ${state.vipRebatePool <= 0 ? 'disabled' : ''} style="width:100%;">
            💎 Rút Phỉnh Hoàn Trả VIP (+${formatNum(state.vipRebatePool)})
          </button>
        </div>
      </div>
    `;

    dom.sidePanel.innerHTML = `
      <div class="dc-side-box">
        <h4>📊 Thống Kê Sự Nghiệp Đỏ Đen</h4>
        <div style="display:grid;grid-template-columns:1fr auto;row-gap:5px;font-size:12px;">
          <span>Tổng Phỉnh đã cược:</span><strong>${formatNum(state.stats.totalWagered)}</strong>
          <span>Tổng Phỉnh thắng về:</span><strong style="color:#4ade80;">${formatNum(state.stats.totalWon)}</strong>
          <span>Thắng lớn nhất 1 ván:</span><strong style="color:#fde047;">${formatNum(state.stats.biggestSingleWin)}</strong>
          <span>Siêu xe Vàng Podium:</span><strong>${state.podiumWon ? '🏆 Đã Sở Hữu' : 'Chưa Trúng'}</strong>
          <span>Lần trả sạch nợ Mafia:</span><strong>${state.stats.loansRepaid}</strong>
        </div>
      </div>
      <div class="dc-side-box">
        <h4>🏛️ Bậc Thang Thượng Lưu</h4>
        ${VIP_TIERS.map((t) => `
          <div style="display:flex;justify-content:space-between;padding:3px 0;color:${t.id === tier.id ? '#fde047' : '#94a3b8'};font-weight:${t.id === tier.id ? '800' : '500'};font-size:11.5px;">
            <span>${t.badge}</span>
            <span>${formatNum(t.minPoints)} Đ • Hoàn ${(t.rebateRate * 100).toFixed(1)}%</span>
          </div>
        `).join('')}
      </div>
      <div class="dc-side-box">
        <h4>⚡ Truy Cập Nhanh Các Bàn</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          <button type="button" class="dc-mini-btn" data-jump="taixiu">🎲 Tài Xỉu</button>
          <button type="button" class="dc-mini-btn" data-jump="xocdia">🔴 Xóc Đĩa</button>
          <button type="button" class="dc-mini-btn" data-jump="roulette">🎡 Roulette</button>
          <button type="button" class="dc-mini-btn" data-jump="blackjack">🂡 Xì Dách</button>
          <button type="button" class="dc-mini-btn" data-jump="poker">♠️ Hold'em</button>
          <button type="button" class="dc-mini-btn" data-jump="baccarat">👑 Baccarat</button>
          <button type="button" class="dc-mini-btn" data-jump="slots">🎰 Xèng 777</button>
          <button type="button" class="dc-mini-btn" data-jump="derby">🏇 Đua Xe/Ngựa</button>
        </div>
      </div>
    `;

    dom.actionBar.innerHTML = `
      <button type="button" class="dc-btn gold" id="dc-act-quick-5k">Nạp Nhanh 5.000 Phỉnh</button>
      <button type="button" class="dc-btn purple" id="dc-act-quick-tx">Sang Bàn Tài Xỉu ➔</button>
    `;

    const amtInput = dom.customStage.querySelector('#dc-cashier-amt');
    dom.customStage.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-preset');
        if (!amtInput) return;
        if (key === 'max_cash') amtInput.value = String(Math.max(0, getPlayerCash()));
        else if (key === 'max_chips') amtInput.value = String(Math.max(0, state.chips));
        else amtInput.value = String(Number(key) || 1000);
        casinoSFX.playChipClink(1);
      });
    });

    dom.customStage.querySelector('#dc-btn-buy-chips')?.addEventListener('click', () => {
      buyChips(Number(amtInput?.value || 0));
    });
    dom.customStage.querySelector('#dc-btn-cashout')?.addEventListener('click', () => {
      cashOutChips(Number(amtInput?.value || 0));
    });

    dom.customStage.querySelectorAll('[data-loan]').forEach((btn) => {
      btn.addEventListener('click', () => {
        takeLoan(Number(btn.getAttribute('data-loan') || 0));
      });
    });

    dom.customStage.querySelector('#dc-btn-repay-half')?.addEventListener('click', () => {
      repayLoan(Math.ceil(state.loanDebt * 0.5));
    });
    dom.customStage.querySelector('#dc-btn-repay-all')?.addEventListener('click', () => {
      repayLoan(state.loanDebt);
    });
    dom.customStage.querySelector('#dc-btn-visitor-bonus')?.addEventListener('click', () => {
      claimVisitorBonus();
    });
    dom.customStage.querySelector('#dc-btn-goto-wheel')?.addEventListener('click', () => {
      switchStationTab('lucky_wheel');
    });
    dom.customStage.querySelector('#dc-btn-claim-rebate')?.addEventListener('click', () => {
      claimVipRebate();
    });

    dom.sidePanel.querySelectorAll('[data-jump]').forEach((btn) => {
      btn.addEventListener('click', () => {
        switchStationTab(btn.getAttribute('data-jump'));
      });
    });

    dom.actionBar.querySelector('#dc-act-quick-5k')?.addEventListener('click', () => {
      buyChips(Math.min(5000, Math.max(500, getPlayerCash())));
    });
    dom.actionBar.querySelector('#dc-act-quick-tx')?.addEventListener('click', () => {
      switchStationTab('taixiu');
    });
  }

  // ============================================================================
  // SECTION 4: STATION 2 — TÀI XỈU LẮC XÍ NGẦU ĐỎ ĐEN + NẶN BÁT TỪ TỪ & SOI CẦU
  // ============================================================================
  const TAIXIU_SUM_ODDS = {
    4: 60,
    5: 30,
    6: 18,
    7: 12,
    8: 8,
    9: 6,
    10: 6,
    11: 6,
    12: 6,
    13: 8,
    14: 12,
    15: 18,
    16: 30,
    17: 60
  };

  const TAIXIU_FELLOW_GAMBLERS = [
    { name: 'Đại Gia Minh Nhựa', style: 'tai', avatar: '🕶️' },
    { name: 'Cô Ba Sài Gòn', style: 'xiu', avatar: '💃' },
    { name: 'Anh Tuấn Chợ Lớn', style: 'streak', avatar: '🚬' },
    { name: 'Chú Bảy Quận 5', style: 'bao', avatar: '🎩' },
    { name: 'Tiểu Thư Bảo Ngọc', style: 'sum', avatar: '💎' }
  ];

  const taixiuGame = {
    phase: 'BETTING', // 'BETTING' | 'SHAKING' | 'SQUEEZING' | 'RESULT'
    squeezeMode: true, // Default ON so player can drag-to-peel bowl ("Nặn Bát Từ Từ")!
    bets: {},
    lastBets: {},
    crowdTai: 42500,
    crowdXiu: 38900,
    crowdPlayersTai: 14,
    crowdPlayersXiu: 12,
    chatFeed: [
      '🕶️ Đại Gia Minh Nhựa: Cầu đang đẹp anh em ơi, mạnh tay kiếm chiếc siêu xe!',
      '💃 Cô Ba Sài Gòn: Nặn từ từ thôi nha Dealer, đau tim lắm đó!'
    ],
    dice: [4, 5, 6],
    dicePos: [
      { dx: -34, dy: -16, rot: 0.14 },
      { dx: 32, dy: -12, rot: -0.22 },
      { dx: 2, dy: 28, rot: 0.08 }
    ],
    shakeTimer: 0,
    shakeDuration: 1.05,
    bowlX: 0,
    bowlY: 0,
    draggingBowl: false,
    dragStartMouseX: 0,
    dragStartMouseY: 0,
    dragStartBowlX: 0,
    dragStartBowlY: 0,
    bowlOpenProgress: 0,
    winningZones: new Set(),
    lastNetWin: 0,
    lastPayoutTotal: 0,
    hoverZone: null,
    zones: [],
    crowdTickTimer: 0
  };

  function buildTaiXiuZones() {
    const zones = [];
    // Top Row: XỈU (left) | BỘ BA CỤ THỂ + BÃO BẤT KỲ + CẶP ĐÔI (center) | TÀI (right)
    zones.push({
      id: 'XIU',
      label: 'XỈU',
      sub: '4 – 10 • 1 Ăn 1',
      note: 'Thua Bộ Ba',
      odds: 1,
      x: 24,
      y: 66,
      w: 196,
      h: 138,
      accent: '#38bdf8',
      bigText: true
    });

    zones.push({
      id: 'CHAN',
      label: 'CHẴN',
      sub: '1 Ăn 1',
      odds: 1,
      x: 24,
      y: 210,
      w: 95,
      h: 56,
      accent: '#93c5fd'
    });

    zones.push({
      id: 'LE',
      label: 'LẺ',
      sub: '1 Ăn 1',
      odds: 1,
      x: 125,
      y: 210,
      w: 95,
      h: 56,
      accent: '#fda4af'
    });

    // Center-top: Pairs 1-1 .. 3-3 | BÃO BẤT KỲ 1:30 | Pairs 4-4 .. 6-6
    for (let p = 1; p <= 3; p++) {
      zones.push({
        id: `PAIR_${p}`,
        label: `Đôi ${p}-${p}`,
        sub: '1:10',
        odds: 10,
        x: 228 + (p - 1) * 62,
        y: 66,
        w: 58,
        h: 62,
        accent: '#fbbf24'
      });
    }

    zones.push({
      id: 'BAO_ANY',
      label: 'BÃO BẤT KỲ',
      sub: 'Bộ 3 • 1:30',
      odds: 30,
      x: 416,
      y: 66,
      w: 148,
      h: 62,
      accent: '#facc15'
    });

    for (let p = 4; p <= 6; p++) {
      zones.push({
        id: `PAIR_${p}`,
        label: `Đôi ${p}-${p}`,
        sub: '1:10',
        odds: 10,
        x: 570 + (p - 4) * 62,
        y: 66,
        w: 58,
        h: 62,
        accent: '#fbbf24'
      });
    }

    // Center-middle: Exact Triples 111..666 (1:150)
    for (let b = 1; b <= 6; b++) {
      zones.push({
        id: `BAO_${b}`,
        label: `Bão ${b}${b}${b}`,
        sub: '1:150',
        odds: 150,
        x: 228 + (b - 1) * 88.5,
        y: 134,
        w: 84,
        h: 62,
        accent: '#f87171'
      });
    }

    // Center-lower: Exact Triple reminder banner / quick bet row
    for (let s = 1; s <= 6; s++) {
      zones.push({
        id: `SINGLE_${s}`,
        label: `Mặt ${s}`,
        sub: '1x/2x/3x',
        odds: 1,
        x: 228 + (s - 1) * 88.5,
        y: 202,
        w: 84,
        h: 64,
        accent: '#e2e8f0',
        dieFace: s
      });
    }

    zones.push({
      id: 'TAI',
      label: 'TÀI',
      sub: '11 – 17 • 1 Ăn 1',
      note: 'Thua Bộ Ba',
      odds: 1,
      x: 760,
      y: 66,
      w: 196,
      h: 138,
      accent: '#ef4444',
      bigText: true
    });

    // Right helper under TAI: Quick All-in / Hot streak info box or Sum 11/10 quick
    zones.push({
      id: 'BAO_QUICK_HIGH',
      label: 'BÃO 6-6-6',
      sub: 'Đại Lộc 1:150',
      aliasOf: 'BAO_6',
      odds: 150,
      x: 760,
      y: 210,
      w: 196,
      h: 56,
      accent: '#fde047'
    });

    // Row 3: 14 Sum Zones (4 .. 17) across full width 24..956 (width = 932 -> 14 boxes * 66.5)
    for (let sum = 4; sum <= 17; sum++) {
      const idx = sum - 4;
      const wBox = 63;
      const gap = 3.8;
      zones.push({
        id: `SUM_${sum}`,
        label: `${sum}`,
        sub: `1:${TAIXIU_SUM_ODDS[sum]}`,
        odds: TAIXIU_SUM_ODDS[sum],
        x: 24 + idx * (wBox + gap),
        y: 278,
        w: wBox,
        h: 74,
        accent: sum >= 11 ? '#fca5a5' : '#7dd3fc',
        isSum: true
      });
    }

    taixiuGame.zones = zones;
  }
  buildTaiXiuZones();

  function getTaiXiuTotalBet() {
    let sum = 0;
    for (const k of Object.keys(taixiuGame.bets)) {
      sum += taixiuGame.bets[k] || 0;
    }
    return sum;
  }

  function placeTaiXiuBet(zoneIdRaw) {
    if (taixiuGame.phase !== 'BETTING') {
      showCasinoToast('Đang lắc hoặc nặn bát! Hãy chờ mở kết quả xong.', 'error', 1.8);
      return;
    }
    const zoneObj = taixiuGame.zones.find((z) => z.id === zoneIdRaw);
    const zoneId = zoneObj?.aliasOf || zoneIdRaw;
    const amt = state.selectedChip;
    if (!spendChips(amt, true)) return;
    taixiuGame.bets[zoneId] = (taixiuGame.bets[zoneId] || 0) + amt;
    casinoSFX.playChipClink(2);
    renderTaiXiuSideAndControls();
  }

  function clearTaiXiuBets() {
    if (taixiuGame.phase !== 'BETTING') return;
    const total = getTaiXiuTotalBet();
    if (total <= 0) return;
    taixiuGame.bets = {};
    addChips(total, 'refund');
    casinoSFX.playChipClink(2);
    showCasinoToast(`Đã hoàn lại ${formatNum(total)} Phỉnh trên bàn Tài Xỉu.`, 'gold', 1.8);
    renderTaiXiuSideAndControls();
  }

  function repeatTaiXiuBets(mult = 1) {
    if (taixiuGame.phase !== 'BETTING') return;
    const src = Object.keys(taixiuGame.bets).length > 0 && mult > 1 ? { ...taixiuGame.bets } : taixiuGame.lastBets;
    const keys = Object.keys(src);
    if (keys.length === 0) {
      showCasinoToast('Chưa có lịch sử cược ván trước để đặt lại!', 'error');
      return;
    }
    let needed = 0;
    for (const k of keys) {
      needed += Math.round(src[k] * (mult > 1 && Object.keys(taixiuGame.bets).length > 0 ? mult - 1 : mult));
    }
    if (!spendChips(needed, true)) return;
    if (mult > 1 && Object.keys(taixiuGame.bets).length > 0) {
      for (const k of keys) taixiuGame.bets[k] = (taixiuGame.bets[k] || 0) * mult;
    } else {
      for (const k of keys) taixiuGame.bets[k] = (taixiuGame.bets[k] || 0) + src[k] * mult;
    }
    casinoSFX.playChipSweep();
    renderTaiXiuSideAndControls();
  }

  function startTaiXiuRoll(forceInstant = false) {
    if (taixiuGame.phase !== 'BETTING') return;
    const totalBet = getTaiXiuTotalBet();
    if (totalBet <= 0) {
      showCasinoToast('Hãy đặt ít nhất 1 Phỉnh lên cửa Tài, Xỉu, Chẵn, Lẻ hoặc Bão trước khi lắc!', 'error');
      casinoSFX.playError();
      return;
    }

    taixiuGame.lastBets = { ...taixiuGame.bets };
    taixiuGame.winningZones.clear();
    taixiuGame.lastNetWin = 0;
    taixiuGame.lastPayoutTotal = 0;

    // Roll 3 fair 1..6 dice + non-overlapping positions inside porcelain plate
    taixiuGame.dice = [randInt(1, 6), randInt(1, 6), randInt(1, 6)];
    const baseAng = randFloat(0, Math.PI * 2);
    for (let i = 0; i < 3; i++) {
      const a = baseAng + (i * Math.PI * 2) / 3 + randFloat(-0.22, 0.22);
      const r = randFloat(27, 36);
      taixiuGame.dicePos[i] = {
        dx: Math.cos(a) * r,
        dy: Math.sin(a) * r,
        rot: randFloat(-0.45, 0.45)
      };
    }

    taixiuGame.phase = 'SHAKING';
    taixiuGame.shakeTimer = taixiuGame.shakeDuration;
    taixiuGame.bowlX = 0;
    taixiuGame.bowlY = 0;
    taixiuGame.bowlOpenProgress = 0;
    taixiuGame.draggingBowl = false;
    taixiuGame._forceInstantThisRound = Boolean(forceInstant || !taixiuGame.squeezeMode);

    casinoSFX.playDiceShakeInBowl();
    renderTaiXiuSideAndControls();
  }

  function finalizeTaiXiuRound() {
    if (taixiuGame.phase === 'RESULT') return;
    taixiuGame.phase = 'RESULT';
    taixiuGame.draggingBowl = false;
    taixiuGame.bowlOpenProgress = 1;

    const [d1, d2, d3] = taixiuGame.dice;
    const sum = d1 + d2 + d3;
    const isTriple = d1 === d2 && d2 === d3;
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    counts[d1]++;
    counts[d2]++;
    counts[d3]++;

    const winners = new Set();
    if (isTriple) {
      winners.add('BAO_ANY');
      winners.add(`BAO_${d1}`);
    } else {
      if (sum >= 11 && sum <= 17) winners.add('TAI');
      if (sum >= 4 && sum <= 10) winners.add('XIU');
      if (sum % 2 === 0) winners.add('CHAN');
      else winners.add('LE');
    }
    if (sum >= 4 && sum <= 17) {
      winners.add(`SUM_${sum}`);
    }
    for (let face = 1; face <= 6; face++) {
      if (counts[face] >= 2) winners.add(`PAIR_${face}`);
      if (counts[face] >= 1) winners.add(`SINGLE_${face}`);
    }
    taixiuGame.winningZones = winners;

    let totalReturn = 0;
    const totalWager = getTaiXiuTotalBet();
    for (const [zoneId, betAmt] of Object.entries(taixiuGame.bets)) {
      if (!betAmt || !winners.has(zoneId)) continue;
      if (zoneId.startsWith('SINGLE_')) {
        const face = Number(zoneId.split('_')[1]);
        const c = counts[face] || 1;
        totalReturn += betAmt * (1 + c);
      } else if (zoneId.startsWith('SUM_')) {
        const sVal = Number(zoneId.split('_')[1]);
        totalReturn += betAmt * (1 + (TAIXIU_SUM_ODDS[sVal] || 6));
      } else if (zoneId.startsWith('BAO_') && zoneId !== 'BAO_ANY') {
        totalReturn += betAmt * (1 + 150);
      } else if (zoneId === 'BAO_ANY') {
        totalReturn += betAmt * (1 + 30);
      } else if (zoneId.startsWith('PAIR_')) {
        totalReturn += betAmt * (1 + 10);
      } else {
        totalReturn += betAmt * 2;
      }
    }

    taixiuGame.lastPayoutTotal = totalReturn;
    taixiuGame.lastNetWin = totalReturn - totalWager;

    const outcomeCode = isTriple ? 'BAO' : sum >= 11 ? 'TAI' : 'XIU';
    state.histories.taixiu.push({
      dice: [d1, d2, d3],
      sum,
      triple: isTriple,
      outcome: outcomeCode
    });
    if (state.histories.taixiu.length > 40) {
      state.histories.taixiu.shift();
    }

    state.stats.roundsPlayed++;
    state.stats.taixiuPlayed++;

    // Fellow Gambler Reaction Chat
    const labelStr = isTriple
      ? `BÃO BỘ BA ${d1}-${d2}-${d3} (${sum} nút)!`
      : `${sum >= 11 ? 'TÀI' : 'XỈU'} ${sum} nút (${d1}-${d2}-${d3})`;

    if (isTriple) {
      taixiuGame.chatFeed.unshift(`🎩 Chú Bảy Quận 5: TRỜI ĐẤT ƠI NỔ BÃO ${d1}-${d1}-${d1} KÌA ANH EM!!`);
    } else if (sum >= 11) {
      taixiuGame.chatFeed.unshift(`🕶️ Đại Gia Minh Nhựa: Húp trọn cửa TÀI ${sum} điểm ngọt lịm!`);
    } else {
      taixiuGame.chatFeed.unshift(`💃 Cô Ba Sài Gòn: XỈU ${sum} nút về đúng cầu chuẩn bài luôn!`);
    }
    taixiuGame.chatFeed = taixiuGame.chatFeed.slice(0, 6);

    if (totalReturn > 0) {
      addChips(totalReturn, 'taixiu_win');
      if (isTriple || totalReturn >= totalWager * 4) {
        casinoSFX.playMegaJackpotCascade();
        spawnCanvasConfetti(980, 560, 75);
      } else {
        casinoSFX.playWinFanfare(0.85);
      }
      spawnCanvasCoins(490, 260, Math.min(45, 14 + Math.floor(totalReturn / 250)), 1.05);
      spawnFloatingCallout(490, 195, `+${formatNum(totalReturn)} PHỈNH! (${labelStr})`, '#fde047', 25);
      showCasinoToast(`🎉 ${labelStr} — Bạn thắng +${formatNum(totalReturn)} Phỉnh!`, 'win', 3.4);
    } else {
      casinoSFX.playCardFlip();
      spawnFloatingCallout(490, 195, `${labelStr}`, '#f87171', 21);
      showCasinoToast(`Kết quả: ${labelStr}. Chúc bạn may mắn tay sau!`, 'gold', 2.4);
    }

    saveCasinoState();
    renderTaiXiuSideAndControls();
  }

  function resetTaiXiuNextRound() {
    taixiuGame.phase = 'BETTING';
    taixiuGame.bets = {};
    taixiuGame.winningZones.clear();
    taixiuGame.bowlX = 0;
    taixiuGame.bowlY = 0;
    taixiuGame.bowlOpenProgress = 0;
    taixiuGame.crowdTai = randInt(22, 95) * 1000 + randInt(1, 9) * 100;
    taixiuGame.crowdXiu = randInt(22, 95) * 1000 + randInt(1, 9) * 100;
    taixiuGame.crowdPlayersTai = randInt(8, 26);
    taixiuGame.crowdPlayersXiu = randInt(8, 26);
    renderTaiXiuSideAndControls();
  }

  function updateTaiXiu(dt) {
    // Fellow gambler live chip increments while betting
    if (taixiuGame.phase === 'BETTING') {
      taixiuGame.crowdTickTimer -= dt;
      if (taixiuGame.crowdTickTimer <= 0) {
        taixiuGame.crowdTickTimer = randFloat(0.65, 1.45);
        if (Math.random() < 0.52) {
          taixiuGame.crowdTai += pickRandom([500, 1000, 2000, 5000]);
          if (Math.random() < 0.35) taixiuGame.crowdPlayersTai++;
        } else {
          taixiuGame.crowdXiu += pickRandom([500, 1000, 2000, 5000]);
          if (Math.random() < 0.35) taixiuGame.crowdPlayersXiu++;
        }
      }
    } else if (taixiuGame.phase === 'SHAKING') {
      taixiuGame.shakeTimer -= dt;
      if (taixiuGame.shakeTimer <= 0) {
        if (taixiuGame._forceInstantThisRound) {
          finalizeTaiXiuRound();
        } else {
          taixiuGame.phase = 'SQUEEZING';
          showCasinoToast('👆 Giữ chuột / chạm kéo chiếc bát rồng ra từ từ để NẶN CẦU!', 'gold', 3.0);
          renderTaiXiuSideAndControls();
        }
      }
    } else if (taixiuGame.phase === 'SQUEEZING') {
      const dist = Math.hypot(taixiuGame.bowlX, taixiuGame.bowlY);
      if (!taixiuGame.draggingBowl && dist > 106) {
        finalizeTaiXiuRound();
      }
    }
  }

  function drawTaiXiuCanvas(g, w, h, dt) {
    drawLuxuryFeltBackground(
      g,
      w,
      h,
      '#4a0c14',
      'TÀI XỈU HOÀNG GIA • DIAMOND VIP SIC BO',
      'Lắc Xí Ngầu Đỏ Đen • Kéo Chuột Nặn Bát • Soi Cầu Chuẩn Macau'
    );

    // 1. Draw all interactive betting zones
    const nowPulse = 0.5 + 0.5 * Math.sin((activeCtx.elapsed || 0) * 6.5);
    for (let i = 0; i < taixiuGame.zones.length; i++) {
      const z = taixiuGame.zones[i];
      const realId = z.aliasOf || z.id;
      const isWin = taixiuGame.phase === 'RESULT' && taixiuGame.winningZones.has(realId);
      const isHover = taixiuGame.hoverZone === z.id && taixiuGame.phase === 'BETTING';
      const betVal = z.aliasOf ? 0 : (taixiuGame.bets[realId] || 0);

      g.save();
      roundRectPath(g, z.x, z.y, z.w, z.h, 9);
      if (isWin) {
        g.fillStyle = `rgba(250, 204, 21, ${0.26 + nowPulse * 0.22})`;
      } else if (isHover) {
        g.fillStyle = 'rgba(255, 255, 255, 0.12)';
      } else if (z.id === 'TAI') {
        g.fillStyle = 'rgba(185, 28, 28, 0.34)';
      } else if (z.id === 'XIU') {
        g.fillStyle = 'rgba(14, 116, 144, 0.34)';
      } else {
        g.fillStyle = 'rgba(15, 10, 18, 0.48)';
      }
      g.fill();

      g.lineWidth = isWin ? 2.8 : isHover ? 2.0 : 1.2;
      g.strokeStyle = isWin ? '#fde047' : isHover ? '#ffffff' : 'rgba(245, 197, 66, 0.36)';
      g.stroke();

      g.textAlign = 'center';
      if (z.bigText) {
        g.fillStyle = z.accent;
        g.font = '900 38px "Segoe UI", system-ui, sans-serif';
        g.fillText(z.label, z.x + z.w * 0.5, z.y + 48);

        g.fillStyle = '#fef3c7';
        g.font = '700 13px "Segoe UI", sans-serif';
        g.fillText(z.sub, z.x + z.w * 0.5, z.y + 74);

        g.fillStyle = 'rgba(255,255,255,0.6)';
        g.font = '600 11px "Segoe UI", sans-serif';
        g.fillText(z.note || '', z.x + z.w * 0.5, z.y + 92);

        // Fellow crowd pot badge
        const crowdAmt = z.id === 'TAI' ? taixiuGame.crowdTai : taixiuGame.crowdXiu;
        const crowdCnt = z.id === 'TAI' ? taixiuGame.crowdPlayersTai : taixiuGame.crowdPlayersXiu;
        g.fillStyle = '#fde68a';
        g.font = '700 11.5px "Segoe UI", sans-serif';
        g.fillText(`👥 ${crowdCnt} người • ${formatNum(crowdAmt)}`, z.x + z.w * 0.5, z.y + 122);
      } else if (z.dieFace) {
        drawDie3D(g, z.dieFace, z.x + z.w * 0.5, z.y + 25, 28, 0, isWin);
        g.fillStyle = '#cbd5e1';
        g.font = '700 10.5px "Segoe UI", sans-serif';
        g.fillText(z.sub, z.x + z.w * 0.5, z.y + 54);
      } else if (z.isSum) {
        g.fillStyle = z.accent;
        g.font = '900 20px "Segoe UI", sans-serif';
        g.fillText(z.label, z.x + z.w * 0.5, z.y + 30);
        g.fillStyle = '#fde68a';
        g.font = '700 11px "Segoe UI", sans-serif';
        g.fillText(z.sub, z.x + z.w * 0.5, z.y + 54);
      } else {
        g.fillStyle = z.accent;
        g.font = '800 13px "Segoe UI", sans-serif';
        g.fillText(z.label, z.x + z.w * 0.5, z.y + 26);
        g.fillStyle = '#e2e8f0';
        g.font = '600 11px "Segoe UI", sans-serif';
        g.fillText(z.sub, z.x + z.w * 0.5, z.y + 46);
      }

      if (betVal > 0) {
        drawChipStack(g, z.x + z.w - 22, z.y + z.h - 18, betVal, 13, 5);
      }
      g.restore();
    }

    // 2. Bottom 40-Round Bead Road ("Cầu Hạt Châu 40 Phiên")
    const roadX = 24;
    const roadY = 366;
    const roadW = 932;
    const roadH = 176;
    g.save();
    roundRectPath(g, roadX, roadY, roadW, roadH, 12);
    g.fillStyle = 'rgba(10, 8, 14, 0.76)';
    g.fill();
    g.strokeStyle = 'rgba(245, 197, 66, 0.35)';
    g.lineWidth = 1.3;
    g.stroke();

    const hist = state.histories.taixiu;
    let cntTai = 0;
    let cntXiu = 0;
    let cntBao = 0;
    for (let i = 0; i < hist.length; i++) {
      if (hist[i].outcome === 'TAI') cntTai++;
      else if (hist[i].outcome === 'XIU') cntXiu++;
      else cntBao++;
    }

    g.fillStyle = '#fde047';
    g.font = '800 12.5px "Segoe UI", sans-serif';
    g.textAlign = 'left';
    g.fillText(
      `📈 BẢNG SOI CẦU TÀI XỈU (${hist.length} PHIÊN GẦN NHẤT)   •   🔴 TÀI: ${cntTai}   •   🔵 XỈU: ${cntXiu}   •   🟡 BÃO: ${cntBao}`,
      roadX + 14,
      roadY + 21
    );

    // Left Half: 10 cols x 4 rows Bead Road (40 rounds)
    const beadStartX = roadX + 26;
    const beadStartY = roadY + 46;
    const stepX = 38;
    const stepY = 32;
    const recent40 = hist.slice(-40);
    for (let idx = 0; idx < 40; idx++) {
      const col = Math.floor(idx / 4);
      const row = idx % 4;
      const bx = beadStartX + col * stepX;
      const by = beadStartY + row * stepY;

      g.fillStyle = 'rgba(255,255,255,0.04)';
      g.beginPath();
      g.arc(bx, by, 13, 0, Math.PI * 2);
      g.fill();

      const rec = recent40[idx];
      if (!rec) continue;
      const colHex = rec.outcome === 'TAI' ? '#dc2626' : rec.outcome === 'XIU' ? '#0284c7' : '#eab308';
      g.fillStyle = colHex;
      g.beginPath();
      g.arc(bx, by, 12.5, 0, Math.PI * 2);
      g.fill();

      if (idx === recent40.length - 1) {
        g.strokeStyle = '#ffffff';
        g.lineWidth = 2.2;
        g.stroke();
      }

      g.fillStyle = rec.outcome === 'BAO' ? '#1c1917' : '#ffffff';
      g.font = '800 10.5px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(rec.outcome === 'TAI' ? 'T' : rec.outcome === 'XIU' ? 'X' : 'B', bx, by + 0.5);
    }

    // Right Half: Sum Trend Line Chart (3..18) for last 20 rounds
    const chartX = roadX + 430;
    const chartY = roadY + 38;
    const chartW = 482;
    const chartH = 122;
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.lineWidth = 1;
    g.strokeRect(chartX, chartY, chartW, chartH);

    // Midline separating Tài (11+) and Xỉu (<=10)
    const midY = chartY + chartH * (1 - (10.5 - 3) / 15);
    g.setLineDash([5, 5]);
    g.strokeStyle = 'rgba(250, 204, 21, 0.4)';
    g.beginPath();
    g.moveTo(chartX, midY);
    g.lineTo(chartX + chartW, midY);
    g.stroke();
    g.setLineDash([]);

    const recent20 = hist.slice(-20);
    if (recent20.length > 0) {
      g.beginPath();
      for (let i = 0; i < recent20.length; i++) {
        const px = chartX + 18 + (i / Math.max(1, 19)) * (chartW - 36);
        const py = chartY + chartH - ((recent20[i].sum - 3) / 15) * (chartH - 18) - 9;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.strokeStyle = '#fde047';
      g.lineWidth = 2;
      g.stroke();

      for (let i = 0; i < recent20.length; i++) {
        const r = recent20[i];
        const px = chartX + 18 + (i / Math.max(1, 19)) * (chartW - 36);
        const py = chartY + chartH - ((r.sum - 3) / 15) * (chartH - 18) - 9;
        g.fillStyle = r.outcome === 'TAI' ? '#ef4444' : r.outcome === 'XIU' ? '#38bdf8' : '#facc15';
        g.beginPath();
        g.arc(px, py, 8.5, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#ffffff';
        g.font = '800 9.5px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(String(r.sum), px, py + 0.5);
      }
    }
    g.restore();

    // 3. Center Porcelain Plate & Interactive Dragon Bowl Overlay during SHAKING / SQUEEZING / RESULT
    if (taixiuGame.phase !== 'BETTING') {
      g.save();
      if (taixiuGame.phase === 'SHAKING' || taixiuGame.phase === 'SQUEEZING') {
        g.fillStyle = 'rgba(5, 5, 10, 0.56)';
        g.fillRect(0, 0, w, h);
      }

      const centerPlateX = w * 0.5;
      const centerPlateY = taixiuGame.phase === 'RESULT' ? 195 : 246;
      const plateScale = taixiuGame.phase === 'RESULT' ? 0.82 : 1.08;

      let jx = 0;
      let jy = 0;
      if (taixiuGame.phase === 'SHAKING') {
        const amp = 18 * (taixiuGame.shakeTimer / taixiuGame.shakeDuration);
        jx = Math.sin(taixiuGame.shakeTimer * 52) * amp;
        jy = Math.cos(taixiuGame.shakeTimer * 41) * amp * 0.7;
      }

      g.translate(centerPlateX + jx, centerPlateY + jy);
      g.scale(plateScale, plateScale);

      // Porcelain Plate with Blue/Gold Dragon Rim
      g.fillStyle = 'rgba(0, 0, 0, 0.58)';
      g.beginPath();
      g.arc(4, 10, 104, 0, Math.PI * 2);
      g.fill();

      const plateGrad = g.createRadialGradient(-18, -18, 12, 0, 0, 102);
      plateGrad.addColorStop(0, '#ffffff');
      plateGrad.addColorStop(0.75, '#f1f5f9');
      plateGrad.addColorStop(0.92, '#1e3a8a');
      plateGrad.addColorStop(1, '#d97706');
      g.fillStyle = plateGrad;
      g.beginPath();
      g.arc(0, 0, 100, 0, Math.PI * 2);
      g.fill();

      // Crimson velvet inner pad
      g.fillStyle = '#7f1d1d';
      g.beginPath();
      g.arc(0, 0, 74, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#facc15';
      g.lineWidth = 2;
      g.stroke();

      // Draw the 3 3D-shaded Dice inside the plate
      for (let d = 0; d < 3; d++) {
        const dp = taixiuGame.dicePos[d];
        const val = taixiuGame.phase === 'SHAKING' ? ((Math.floor(taixiuGame.shakeTimer * 24) + d * 2) % 6) + 1 : taixiuGame.dice[d];
        drawDie3D(g, val, dp.dx, dp.dy, 42, dp.rot, taixiuGame.phase === 'RESULT');
      }

      // Draw the Ceramic Dragon Cover Bowl (closed in SHAKING, draggable in SQUEEZING!)
      if (taixiuGame.phase === 'SHAKING' || taixiuGame.phase === 'SQUEEZING') {
        const bx = taixiuGame.phase === 'SQUEEZING' ? taixiuGame.bowlX : 0;
        const by = taixiuGame.phase === 'SQUEEZING' ? taixiuGame.bowlY : 0;

        g.save();
        g.translate(bx, by);

        // Bowl cast shadow onto dice
        g.fillStyle = 'rgba(0, 0, 0, 0.52)';
        g.beginPath();
        g.arc(6, 9, 88, 0, Math.PI * 2);
        g.fill();

        const bowlGrad = g.createRadialGradient(-24, -26, 8, 0, 0, 88);
        bowlGrad.addColorStop(0, '#fef9c3');
        bowlGrad.addColorStop(0.28, '#1d4ed8');
        bowlGrad.addColorStop(0.76, '#1e3a8a');
        bowlGrad.addColorStop(0.95, '#0f172a');
        bowlGrad.addColorStop(1, '#f59e0b');
        g.fillStyle = bowlGrad;
        g.beginPath();
        g.arc(0, 0, 86, 0, Math.PI * 2);
        g.fill();

        // Ornate concentric gold rings + center ceramic grip knob
        g.strokeStyle = '#fde047';
        g.lineWidth = 2.4;
        g.beginPath();
        g.arc(0, 0, 68, 0, Math.PI * 2);
        g.stroke();

        g.fillStyle = '#f59e0b';
        g.beginPath();
        g.arc(0, 0, 22, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#fef08a';
        g.lineWidth = 2;
        g.stroke();

        g.fillStyle = '#fffbeb';
        g.font = '900 14px "Segoe UI", sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('龍', 0, 1);

        if (taixiuGame.phase === 'SQUEEZING') {
          g.fillStyle = '#fde047';
          g.font = '800 12.5px "Segoe UI", sans-serif';
          g.fillText('⇄ KÉO BÁT NẶN CẦU ⇅', 0, 108);
        }
        g.restore();
      }
      g.restore();
    }

    updateAndDrawCanvasFX(g, dt);
  }

  function renderTaiXiuSideAndControls() {
    if (!dom.sidePanel || !dom.actionBar || state.activeStation !== 'taixiu') return;
    const totalBet = getTaiXiuTotalBet();
    const hist = state.histories.taixiu;
    const last = hist[hist.length - 1];

    // Compute current streak
    let streakCount = 0;
    let streakType = last ? last.outcome : 'TAI';
    for (let i = hist.length - 1; i >= 0; i--) {
      if (hist[i].outcome === streakType) streakCount++;
      else break;
    }
    const streakLabel = streakType === 'TAI' ? 'TÀI' : streakType === 'XIU' ? 'XỈU' : 'BÃO';

    dom.sidePanel.innerHTML = `
      <div class="dc-side-box">
        <h4>🎲 Trạng Thái Bàn Tài Xỉu</h4>
        <div style="font-size:12.5px;line-height:1.6;">
          <div>Phiên hiện tại: <strong style="color:#fde047;">#${state.stats.taixiuPlayed + 1}</strong></div>
          <div>Tổng Phỉnh đã đặt: <strong style="color:#4ade80;">${formatNum(totalBet)}</strong></div>
          <div>Nhịp Cầu: <strong style="color:#fca5a5;">${streakCount >= 3 ? `🔥 Bệt ${streakLabel} ${streakCount} tay!` : `${streakLabel} (${streakCount} tay)`}</strong></div>
          ${last ? `<div>Ván trước: <strong>${last.dice.join('-')} (${last.sum} • ${last.outcome})</strong></div>` : ''}
        </div>
        <label style="display:flex;align-items:center;gap:8px;margin-top:9px;cursor:pointer;font-weight:700;color:#fef08a;">
          <input type="checkbox" id="dc-tx-squeeze-chk" ${taixiuGame.squeezeMode ? 'checked' : ''} />
          Chế độ Nặn Bát Từ Từ (Kéo tay)
        </label>
      </div>
      <div class="dc-side-box">
        <h4>💬 Đồng Đạo Bàn Tán</h4>
        <div style="display:flex;flex-direction:column;gap:6px;font-size:11.5px;color:#e2e8f0;">
          ${taixiuGame.chatFeed.map((line) => `<div style="padding:5px 7px;background:rgba(0,0,0,0.35);border-radius:6px;">${line}</div>`).join('')}
        </div>
      </div>
      <div class="dc-side-box">
        <h4>📜 Tỷ Lệ Trả Thưởng Chuẩn</h4>
        <div style="font-size:11.5px;color:#cbd5e1;line-height:1.5;">
          • <strong>Tài (11–17) / Xỉu (4–10)</strong>: 1 ăn 1<br/>
          • <strong>Chẵn / Lẻ</strong>: 1 ăn 1 (Bão nhà cái ăn)<br/>
          • <strong>Bão Bất Kỳ</strong>: 1 ăn 30 • <strong>Bão Cụ Thể</strong>: 1 ăn 150<br/>
          • <strong>Cặp Đôi</strong>: 1 ăn 10 • <strong>Tổng 4/17</strong>: 1 ăn 60
        </div>
      </div>
    `;

    dom.sidePanel.querySelector('#dc-tx-squeeze-chk')?.addEventListener('change', (e) => {
      taixiuGame.squeezeMode = Boolean(e.target.checked);
      casinoSFX.playChipClink(1);
    });

    if (taixiuGame.phase === 'BETTING') {
      dom.actionBar.innerHTML = `
        <button type="button" class="dc-btn" id="dc-tx-clear" ${totalBet <= 0 ? 'disabled' : ''}>Xóa Cược</button>
        <button type="button" class="dc-btn" id="dc-tx-repeat">Đặt Lại</button>
        <button type="button" class="dc-btn" id="dc-tx-double" ${totalBet <= 0 ? 'disabled' : ''}>Nhân Đôi x2</button>
        <button type="button" class="dc-btn purple" id="dc-tx-roll-instant">⚡ Lắc &amp; Mở Ngay</button>
        <button type="button" class="dc-btn gold" id="dc-tx-roll-squeeze">🎲 LẮC XÍ NGẦU (${taixiuGame.squeezeMode ? 'Nặn Bát' : 'Mở'})</button>
      `;
      dom.actionBar.querySelector('#dc-tx-clear')?.addEventListener('click', clearTaiXiuBets);
      dom.actionBar.querySelector('#dc-tx-repeat')?.addEventListener('click', () => repeatTaiXiuBets(1));
      dom.actionBar.querySelector('#dc-tx-double')?.addEventListener('click', () => repeatTaiXiuBets(2));
      dom.actionBar.querySelector('#dc-tx-roll-instant')?.addEventListener('click', () => startTaiXiuRoll(true));
      dom.actionBar.querySelector('#dc-tx-roll-squeeze')?.addEventListener('click', () => startTaiXiuRoll(false));
    } else if (taixiuGame.phase === 'SHAKING') {
      dom.actionBar.innerHTML = `<button type="button" class="dc-btn gold" disabled>🎶 Dealer đang lắc xí ngầu trong bát sứ...</button>`;
    } else if (taixiuGame.phase === 'SQUEEZING') {
      dom.actionBar.innerHTML = `
        <span style="font-size:12.5px;color:#fde047;font-weight:800;">👆 Kéo bát rồng trên màn hình để soi từng nút!</span>
        <button type="button" class="dc-btn gold" id="dc-tx-open-now">💨 Thổi Cầu • Mở Toang Bát!</button>
      `;
      dom.actionBar.querySelector('#dc-tx-open-now')?.addEventListener('click', finalizeTaiXiuRound);
    } else {
      dom.actionBar.innerHTML = `
        <button type="button" class="dc-btn emerald" id="dc-tx-next-rebet">Ván Mới &amp; Đặt Lại Cược Cũ</button>
        <button type="button" class="dc-btn gold" id="dc-tx-next">🎲 VÁN MỚI</button>
      `;
      dom.actionBar.querySelector('#dc-tx-next')?.addEventListener('click', resetTaiXiuNextRound);
      dom.actionBar.querySelector('#dc-tx-next-rebet')?.addEventListener('click', () => {
        resetTaiXiuNextRound();
        repeatTaiXiuBets(1);
      });
    }
  }

  // ============================================================================
  // SECTION 5: STATION 3 — XÓC ĐĨA ĐỎ ĐEN TRUYỀN THỐNG + NẶN ĐĨA & CẦU CHẴN LẺ
  // ============================================================================
  const XOCDIA_ZONES = [
    {
      id: 'CHAN',
      label: 'CHẴN',
      sub: '1 Ăn 1 (2Đ-2T • 4Đ • 4T)',
      odds: 1.0,
      x: 42,
      y: 78,
      w: 250,
      h: 158,
      accent: '#f87171',
      coinsPreview: ['R', 'W', 'R', 'W']
    },
    {
      id: 'LE',
      label: 'LẺ',
      sub: '1 Ăn 1 (3Đ-1T • 3T-1Đ)',
      odds: 1.0,
      x: 688,
      y: 78,
      w: 250,
      h: 158,
      accent: '#e2e8f0',
      coinsPreview: ['R', 'R', 'R', 'W']
    },
    {
      id: 'RED_4',
      label: '4 ĐỎ (TỨ TỬ)',
      sub: '1 Ăn 12',
      odds: 12.0,
      x: 42,
      y: 256,
      w: 212,
      h: 98,
      accent: '#ef4444',
      coinsPreview: ['R', 'R', 'R', 'R']
    },
    {
      id: 'RED_3',
      label: '3 ĐỎ 1 TRẮNG',
      sub: '1 Ăn 2.6',
      odds: 2.6,
      x: 268,
      y: 256,
      w: 212,
      h: 98,
      accent: '#fca5a5',
      coinsPreview: ['R', 'R', 'R', 'W']
    },
    {
      id: 'WHITE_3',
      label: '3 TRẮNG 1 ĐỎ',
      sub: '1 Ăn 2.6',
      odds: 2.6,
      x: 500,
      y: 256,
      w: 212,
      h: 98,
      accent: '#cbd5e1',
      coinsPreview: ['W', 'W', 'W', 'R']
    },
    {
      id: 'WHITE_4',
      label: '4 TRẮNG (BẠCH ĐỊNH)',
      sub: '1 Ăn 12',
      odds: 12.0,
      x: 726,
      y: 256,
      w: 212,
      h: 98,
      accent: '#f8fafc',
      coinsPreview: ['W', 'W', 'W', 'W']
    }
  ];

  const xocdiaGame = {
    phase: 'BETTING', // 'BETTING' | 'SHAKING' | 'SQUEEZING' | 'RESULT'
    squeezeMode: true,
    bets: {},
    lastBets: {},
    crowdBets: { CHAN: 34000, LE: 29500, RED_4: 4500, WHITE_4: 3800, RED_3: 9200, WHITE_3: 8400 },
    coins: [
      { isRed: true, dx: -26, dy: -20, rot: 0.2 },
      { isRed: false, dx: 25, dy: -18, rot: -0.4 },
      { isRed: true, dx: -22, dy: 24, rot: 0.7 },
      { isRed: false, dx: 24, dy: 22, rot: -0.15 }
    ],
    shakeTimer: 0,
    shakeDuration: 1.1,
    bowlX: 0,
    bowlY: 0,
    draggingBowl: false,
    dragStartMouseX: 0,
    dragStartMouseY: 0,
    dragStartBowlX: 0,
    dragStartBowlY: 0,
    winningZones: new Set(),
    hoverZone: null,
    flyingChips: [],
    crowdTimer: 0,
    dealerChat: 'Mời các đại gia xuống tay! Chẵn hay Lẻ, Tứ Tử Đỏ ăn gấp 12 lần!'
  };

  function getXocDiaTotalBet() {
    let total = 0;
    for (const k of Object.keys(xocdiaGame.bets)) {
      total += xocdiaGame.bets[k] || 0;
    }
    return total;
  }

  function spawnXocDiaFlyingChip(fromX, fromY, toX, toY, denom) {
    xocdiaGame.flyingChips.push({
      x0: fromX,
      y0: fromY,
      x1: toX,
      y1: toY,
      denom,
      t: 0,
      dur: 0.34
    });
  }

  function placeXocDiaBet(zoneId) {
    if (xocdiaGame.phase !== 'BETTING') {
      showCasinoToast('Đang xóc hoặc nặn bát! Chờ mở đĩa xong nhé.', 'error', 1.7);
      return;
    }
    const z = XOCDIA_ZONES.find((item) => item.id === zoneId);
    if (!z) return;
    const amt = state.selectedChip;
    if (!spendChips(amt, true)) return;
    xocdiaGame.bets[zoneId] = (xocdiaGame.bets[zoneId] || 0) + amt;
    spawnXocDiaFlyingChip(490, 545, z.x + z.w - 30, z.y + z.h - 24, amt);
    casinoSFX.playChipClink(2);
    renderXocDiaSideAndControls();
  }

  function clearXocDiaBets() {
    if (xocdiaGame.phase !== 'BETTING') return;
    const total = getXocDiaTotalBet();
    if (total <= 0) return;
    xocdiaGame.bets = {};
    addChips(total, 'refund');
    casinoSFX.playChipClink(2);
    showCasinoToast(`Đã thu hồi ${formatNum(total)} Phỉnh trên chiếu Xóc Đĩa.`, 'gold', 1.8);
    renderXocDiaSideAndControls();
  }

  function repeatXocDiaBets(mult = 1) {
    if (xocdiaGame.phase !== 'BETTING') return;
    const hasCurrent = getXocDiaTotalBet() > 0;
    const src = hasCurrent && mult > 1 ? { ...xocdiaGame.bets } : xocdiaGame.lastBets;
    const keys = Object.keys(src);
    if (keys.length === 0) {
      showCasinoToast('Chưa có ván cược trước để đặt lại!', 'error');
      return;
    }
    let cost = 0;
    for (const k of keys) {
      cost += Math.round(src[k] * (hasCurrent && mult > 1 ? mult - 1 : mult));
    }
    if (!spendChips(cost, true)) return;
    for (const k of keys) {
      if (hasCurrent && mult > 1) xocdiaGame.bets[k] = (xocdiaGame.bets[k] || 0) * mult;
      else xocdiaGame.bets[k] = (xocdiaGame.bets[k] || 0) + src[k] * mult;
      const z = XOCDIA_ZONES.find((item) => item.id === k);
      if (z) spawnXocDiaFlyingChip(490, 545, z.x + z.w - 30, z.y + z.h - 24, state.selectedChip);
    }
    casinoSFX.playChipSweep();
    renderXocDiaSideAndControls();
  }

  function startXocDiaShake(forceInstant = false) {
    if (xocdiaGame.phase !== 'BETTING') return;
    if (getXocDiaTotalBet() <= 0) {
      showCasinoToast('Hãy đặt Phỉnh vào Chẵn, Lẻ hoặc Vị Tứ Tử trước khi Xóc Đĩa!', 'error');
      casinoSFX.playError();
      return;
    }
    xocdiaGame.lastBets = { ...xocdiaGame.bets };
    xocdiaGame.winningZones.clear();

    // Toss 4 fair two-sided Red/White coins with distinct positions inside ceramic plate
    const baseA = randFloat(0, Math.PI * 2);
    for (let i = 0; i < 4; i++) {
      const ang = baseA + (i * Math.PI) / 2 + randFloat(-0.24, 0.24);
      const rad = randFloat(24, 38);
      xocdiaGame.coins[i] = {
        isRed: Math.random() < 0.5,
        dx: Math.cos(ang) * rad,
        dy: Math.sin(ang) * rad,
        rot: randFloat(0, Math.PI * 2)
      };
    }

    xocdiaGame.phase = 'SHAKING';
    xocdiaGame.shakeTimer = xocdiaGame.shakeDuration;
    xocdiaGame.bowlX = 0;
    xocdiaGame.bowlY = 0;
    xocdiaGame.draggingBowl = false;
    xocdiaGame._forceInstant = Boolean(forceInstant || !xocdiaGame.squeezeMode);
    xocdiaGame.dealerChat = 'Xóc đều tay... Bát úp kín, mời anh em chuẩn bị mở bát!';
    casinoSFX.playCoinShake();
    renderXocDiaSideAndControls();
  }

  function finalizeXocDiaRound() {
    if (xocdiaGame.phase === 'RESULT') return;
    xocdiaGame.phase = 'RESULT';
    xocdiaGame.draggingBowl = false;

    let reds = 0;
    for (let i = 0; i < 4; i++) {
      if (xocdiaGame.coins[i].isRed) reds++;
    }
    const whites = 4 - reds;
    const isEven = reds % 2 === 0;

    const winners = new Set();
    winners.add(isEven ? 'CHAN' : 'LE');
    if (reds === 4) winners.add('RED_4');
    else if (whites === 4) winners.add('WHITE_4');
    else if (reds === 3) winners.add('RED_3');
    else if (whites === 3) winners.add('WHITE_3');

    xocdiaGame.winningZones = winners;

    let totalReturn = 0;
    const wagered = getXocDiaTotalBet();
    for (const z of XOCDIA_ZONES) {
      const b = xocdiaGame.bets[z.id] || 0;
      if (b > 0 && winners.has(z.id)) {
        const payout = Math.round(b * (1 + z.odds));
        totalReturn += payout;
        spawnXocDiaFlyingChip(490, 155, z.x + z.w * 0.5, z.y + z.h * 0.5, b);
      }
    }

    state.histories.xocdia.push({ reds, whites, even: isEven });
    if (state.histories.xocdia.length > 40) state.histories.xocdia.shift();
    state.stats.roundsPlayed++;
    state.stats.xocdiaPlayed++;

    const desc =
      reds === 4
        ? 'CHẴN • TỨ TỬ 4 ĐỎ RỰC RỠ!'
        : whites === 4
          ? 'CHẴN • BẠCH ĐỊNH 4 TRẮNG!'
          : reds === 2
            ? 'CHẴN • SẤP ĐÔI (2 Đỏ 2 Trắng)'
            : reds === 3
              ? 'LẺ • 3 ĐỎ 1 TRẮNG'
              : 'LẺ • 3 TRẮNG 1 ĐỎ';

    xocdiaGame.dealerChat = `Mở bát: ${desc}!`;

    if (totalReturn > 0) {
      addChips(totalReturn, 'xocdia_win');
      if (reds === 4 || whites === 4 || totalReturn >= wagered * 3) {
        casinoSFX.playMegaJackpotCascade();
        spawnCanvasConfetti(980, 560, 65);
      } else {
        casinoSFX.playWinFanfare(0.85);
      }
      spawnCanvasCoins(490, 175, 28, 1.0);
      spawnFloatingCallout(490, 150, `+${formatNum(totalReturn)} PHỈNH! (${desc})`, '#fde047', 23);
      showCasinoToast(`🎉 ${desc} — Húp +${formatNum(totalReturn)} Phỉnh!`, 'win', 3.4);
    } else {
      casinoSFX.playCardFlip();
      spawnFloatingCallout(490, 150, desc, '#fca5a5', 20);
      showCasinoToast(`Về ${desc}. Làm lại ván mới gỡ gấp đôi nhé!`, 'gold', 2.4);
    }

    saveCasinoState();
    renderXocDiaSideAndControls();
  }

  function resetXocDiaRound() {
    xocdiaGame.phase = 'BETTING';
    xocdiaGame.bets = {};
    xocdiaGame.winningZones.clear();
    xocdiaGame.bowlX = 0;
    xocdiaGame.bowlY = 0;
    xocdiaGame.crowdBets = {
      CHAN: randInt(20, 75) * 1000,
      LE: randInt(20, 75) * 1000,
      RED_4: randInt(2, 14) * 500,
      WHITE_4: randInt(2, 14) * 500,
      RED_3: randInt(6, 26) * 500,
      WHITE_3: randInt(6, 26) * 500
    };
    xocdiaGame.dealerChat = 'Bát mới đã sẵn sàng! Mời anh em đặt cửa Chẵn Lẻ hoặc Tứ Tử!';
    renderXocDiaSideAndControls();
  }

  function updateXocDia(dt) {
    for (let i = xocdiaGame.flyingChips.length - 1; i >= 0; i--) {
      const fc = xocdiaGame.flyingChips[i];
      fc.t += dt / fc.dur;
      if (fc.t >= 1) xocdiaGame.flyingChips.splice(i, 1);
    }

    if (xocdiaGame.phase === 'BETTING') {
      xocdiaGame.crowdTimer -= dt;
      if (xocdiaGame.crowdTimer <= 0) {
        xocdiaGame.crowdTimer = randFloat(0.75, 1.6);
        const pick = pickRandom(XOCDIA_ZONES);
        const add = pickRandom([500, 1000, 2000]);
        xocdiaGame.crowdBets[pick.id] = (xocdiaGame.crowdBets[pick.id] || 0) + add;
        spawnXocDiaFlyingChip(randFloat(80, 900), -10, pick.x + randFloat(30, pick.w - 30), pick.y + pick.h * 0.65, add);
      }
    } else if (xocdiaGame.phase === 'SHAKING') {
      xocdiaGame.shakeTimer -= dt;
      if (xocdiaGame.shakeTimer <= 0) {
        if (xocdiaGame._forceInstant) {
          finalizeXocDiaRound();
        } else {
          xocdiaGame.phase = 'SQUEEZING';
          xocdiaGame.dealerChat = '👆 Kéo chiếc bát sứ sang ngang để NẶN ĐĨA xem từng quân vị!';
          renderXocDiaSideAndControls();
        }
      }
    } else if (xocdiaGame.phase === 'SQUEEZING') {
      if (!xocdiaGame.draggingBowl && Math.hypot(xocdiaGame.bowlX, xocdiaGame.bowlY) > 96) {
        finalizeXocDiaRound();
      }
    }
  }

  function drawXocDiaCoin(g, x, y, r, isRed) {
    g.save();
    g.translate(x, y);
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.beginPath();
    g.arc(1.5, 3, r, 0, Math.PI * 2);
    g.fill();

    const grad = g.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
    if (isRed) {
      grad.addColorStop(0, '#fca5a5');
      grad.addColorStop(0.35, '#dc2626');
      grad.addColorStop(1, '#7f1d1d');
    } else {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.65, '#f1f5f9');
      grad.addColorStop(1, '#94a3b8');
    }
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = isRed ? '#fde047' : '#cbd5e1';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(0, 0, r * 0.78, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }

  function drawGoldIngot(g, x, y, scale = 1) {
    g.save();
    g.translate(x, y);
    g.scale(scale, scale);
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.beginPath();
    g.ellipse(2, 6, 24, 10, 0, 0, Math.PI * 2);
    g.fill();

    // Boat-shaped traditional Asian Sycee gold ingot (Kim Nguyên Bảo)
    const boat = g.createLinearGradient(-22, -8, 22, 10);
    boat.addColorStop(0, '#fef08a');
    boat.addColorStop(0.5, '#f59e0b');
    boat.addColorStop(1, '#b45309');
    g.fillStyle = boat;
    g.beginPath();
    g.moveTo(-24, -4);
    g.quadraticCurveTo(0, 12, 24, -4);
    g.lineTo(17, 9);
    g.quadraticCurveTo(0, 15, -17, 9);
    g.closePath();
    g.fill();

    g.fillStyle = '#fde047';
    g.beginPath();
    g.ellipse(0, -3, 11, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function drawXocDiaCanvas(g, w, h, dt) {
    drawLuxuryFeltBackground(
      g,
      w,
      h,
      '#470a13',
      'XÓC ĐĨA ĐỎ ĐEN TRUYỀN THỐNG THƯỢNG LƯU',
      xocdiaGame.dealerChat
    );

    // Decorative 24K Gold Ingots flanking the porcelain plate
    drawGoldIngot(g, 336, 92, 0.9);
    drawGoldIngot(g, 644, 92, 0.9);

    const pulse = 0.5 + 0.5 * Math.sin((activeCtx.elapsed || 0) * 6.5);

    // 1. Draw the 6 Xóc Đĩa Betting Zones
    for (let i = 0; i < XOCDIA_ZONES.length; i++) {
      const z = XOCDIA_ZONES[i];
      const isWin = xocdiaGame.phase === 'RESULT' && xocdiaGame.winningZones.has(z.id);
      const isHover = xocdiaGame.hoverZone === z.id && xocdiaGame.phase === 'BETTING';
      const playerBet = xocdiaGame.bets[z.id] || 0;
      const crowdBet = xocdiaGame.crowdBets[z.id] || 0;

      g.save();
      roundRectPath(g, z.x, z.y, z.w, z.h, 12);
      if (isWin) {
        g.fillStyle = `rgba(250, 204, 21, ${0.25 + pulse * 0.22})`;
      } else if (isHover) {
        g.fillStyle = 'rgba(255, 255, 255, 0.13)';
      } else if (z.id === 'CHAN') {
        g.fillStyle = 'rgba(153, 27, 27, 0.42)';
      } else if (z.id === 'LE') {
        g.fillStyle = 'rgba(30, 41, 59, 0.52)';
      } else {
        g.fillStyle = 'rgba(18, 10, 16, 0.56)';
      }
      g.fill();

      g.lineWidth = isWin ? 3 : isHover ? 2.1 : 1.4;
      g.strokeStyle = isWin ? '#fde047' : isHover ? '#ffffff' : 'rgba(245, 197, 66, 0.4)';
      g.stroke();

      g.textAlign = 'center';
      g.fillStyle = z.accent;
      g.font = z.id === 'CHAN' || z.id === 'LE' ? '900 34px "Segoe UI", sans-serif' : '800 15px "Segoe UI", sans-serif';
      g.fillText(z.label, z.x + z.w * 0.5, z.y + (z.id === 'CHAN' || z.id === 'LE' ? 46 : 26));

      g.fillStyle = '#fde68a';
      g.font = '700 12px "Segoe UI", sans-serif';
      g.fillText(z.sub, z.x + z.w * 0.5, z.y + (z.id === 'CHAN' || z.id === 'LE' ? 72 : 46));

      // Draw 4-coin legend preview icons inside each zone
      const startCoinX = z.x + z.w * 0.5 - 33;
      const coinY = z.y + (z.id === 'CHAN' || z.id === 'LE' ? 102 : 70);
      for (let c = 0; c < 4; c++) {
        drawXocDiaCoin(g, startCoinX + c * 22, coinY, 8.5, z.coinsPreview[c] === 'R');
      }

      if (z.id === 'CHAN' || z.id === 'LE') {
        g.fillStyle = 'rgba(255,255,255,0.75)';
        g.font = '600 11.5px "Segoe UI", sans-serif';
        g.fillText(`👥 Làng đặt: ${formatNum(crowdBet)}`, z.x + z.w * 0.5, z.y + 136);
      }

      if (playerBet > 0) {
        drawChipStack(g, z.x + z.w - 26, z.y + z.h - 20, playerBet, 14, 6);
      }
      g.restore();
    }

    // 2. Center Ceramic Plate & 4 Red/White Coins + Bowl (at top-center x=490, y=156)
    const plateCX = 490;
    const plateCY = xocdiaGame.phase === 'SQUEEZING' ? 215 : 156;
    const plateScale = xocdiaGame.phase === 'SQUEEZING' ? 1.15 : 0.96;

    if (xocdiaGame.phase === 'SQUEEZING') {
      g.fillStyle = 'rgba(6, 5, 10, 0.52)';
      g.fillRect(0, 0, w, h);
    }

    let shakeDX = 0;
    let shakeDY = 0;
    if (xocdiaGame.phase === 'SHAKING') {
      const p = xocdiaGame.shakeTimer / xocdiaGame.shakeDuration;
      shakeDX = Math.sin(xocdiaGame.shakeTimer * 44) * 26 * p;
      shakeDY = Math.sin(xocdiaGame.shakeTimer * 88) * 11 * p;
    }

    g.save();
    g.translate(plateCX + shakeDX, plateCY + shakeDY);
    g.scale(plateScale, plateScale);

    // Ceramic Plate
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.beginPath();
    g.arc(4, 8, 92, 0, Math.PI * 2);
    g.fill();

    const pGrad = g.createRadialGradient(-16, -16, 10, 0, 0, 90);
    pGrad.addColorStop(0, '#ffffff');
    pGrad.addColorStop(0.76, '#e2e8f0');
    pGrad.addColorStop(0.92, '#991b1b');
    pGrad.addColorStop(1, '#f59e0b');
    g.fillStyle = pGrad;
    g.beginPath();
    g.arc(0, 0, 88, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = '#d97706';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, 66, 0, Math.PI * 2);
    g.stroke();

    // Draw the 4 Red/White Coins inside plate
    for (let i = 0; i < 4; i++) {
      const c = xocdiaGame.coins[i];
      drawXocDiaCoin(g, c.dx, c.dy, 17, c.isRed);
    }

    // Draw Porcelain Bowl when BETTING (open to side) or SHAKING/SQUEEZING (covering plate!)
    if (xocdiaGame.phase === 'SHAKING' || xocdiaGame.phase === 'SQUEEZING') {
      const bx = xocdiaGame.phase === 'SQUEEZING' ? xocdiaGame.bowlX : 0;
      const by = xocdiaGame.phase === 'SQUEEZING' ? xocdiaGame.bowlY : 0;
      g.save();
      g.translate(bx, by);
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.beginPath();
      g.arc(5, 8, 78, 0, Math.PI * 2);
      g.fill();

      const bGrad = g.createRadialGradient(-20, -20, 6, 0, 0, 76);
      bGrad.addColorStop(0, '#fffbeb');
      bGrad.addColorStop(0.45, '#b91c1c');
      bGrad.addColorStop(0.88, '#7f1d1d');
      bGrad.addColorStop(1, '#fde047');
      g.fillStyle = bGrad;
      g.beginPath();
      g.arc(0, 0, 76, 0, Math.PI * 2);
      g.fill();

      g.fillStyle = '#fde047';
      g.beginPath();
      g.arc(0, 0, 20, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#7f1d1d';
      g.font = '900 13px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('發', 0, 1);

      if (xocdiaGame.phase === 'SQUEEZING') {
        g.fillStyle = '#fde047';
        g.font = '800 12px "Segoe UI", sans-serif';
        g.fillText('⇄ KÉO BÁT NẶN ĐĨA ⇅', 0, 96);
      }
      g.restore();
    }
    g.restore();

    // 3. Flying chip stack animations
    for (let i = 0; i < xocdiaGame.flyingChips.length; i++) {
      const fc = xocdiaGame.flyingChips[i];
      const u = easeOutCubic(fc.t);
      const cx = lerp(fc.x0, fc.x1, u);
      const cy = lerp(fc.y0, fc.y1, u) - Math.sin(u * Math.PI) * 34;
      drawCasinoChip(g, cx, cy, 12, fc.denom, 0.85, '');
    }

    // 4. Bottom "Bảng Soi Cầu Chẵn Lẻ 40 Ván"
    const roadX = 42;
    const roadY = 372;
    const roadW = 896;
    const roadH = 168;
    g.save();
    roundRectPath(g, roadX, roadY, roadW, roadH, 12);
    g.fillStyle = 'rgba(10, 8, 14, 0.78)';
    g.fill();
    g.strokeStyle = 'rgba(245, 197, 66, 0.36)';
    g.lineWidth = 1.3;
    g.stroke();

    const hist = state.histories.xocdia;
    let evenCnt = 0;
    let oddCnt = 0;
    let tuTuCnt = 0;
    for (let i = 0; i < hist.length; i++) {
      if (hist[i].even) evenCnt++;
      else oddCnt++;
      if (hist[i].reds === 4 || hist[i].reds === 0) tuTuCnt++;
    }

    g.fillStyle = '#fde047';
    g.font = '800 12.5px "Segoe UI", sans-serif';
    g.textAlign = 'left';
    g.fillText(
      `📊 CẦU CHẴN LẺ & QUÂN VỊ (${hist.length} VÁN)   •   🔴 CHẴN: ${evenCnt}   •   ⚪ LẺ: ${oddCnt}   •   🌟 TỨ TỬ (4Đ/4T): ${tuTuCnt}`,
      roadX + 16,
      roadY + 22
    );

    const recent40 = hist.slice(-40);
    for (let idx = 0; idx < 40; idx++) {
      const col = Math.floor(idx / 4);
      const row = idx % 4;
      const bx = roadX + 36 + col * 42;
      const by = roadY + 48 + row * 31;

      g.fillStyle = 'rgba(255,255,255,0.04)';
      g.beginPath();
      g.arc(bx, by, 12.5, 0, Math.PI * 2);
      g.fill();

      const rec = recent40[idx];
      if (!rec) continue;
      g.fillStyle = rec.even ? '#dc2626' : '#475569';
      g.beginPath();
      g.arc(bx, by, 12.5, 0, Math.PI * 2);
      g.fill();

      if (rec.reds === 4 || rec.reds === 0) {
        g.strokeStyle = '#fde047';
        g.lineWidth = 2.2;
        g.stroke();
      }

      g.fillStyle = '#ffffff';
      g.font = '800 10px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(`${rec.even ? 'C' : 'L'}${rec.reds}`, bx, by + 0.5);
    }

    // Legend on right side of scoreboard
    const legX = roadX + 475;
    g.textAlign = 'left';
    g.fillStyle = '#e2e8f0';
    g.font = '700 12px "Segoe UI", sans-serif';
    g.fillText('Chú giải Ký hiệu Cầu Quân Vị:', legX, roadY + 52);
    g.font = '600 11.5px "Segoe UI", sans-serif';
    g.fillStyle = '#fca5a5';
    g.fillText('• C2 = Chẵn Sấp Đôi (2 Đỏ 2 Trắng)   • C4 = Tứ Tử 4 Đỏ (1:12)', legX, roadY + 78);
    g.fillText('• C0 = Bạch Định 4 Trắng (1:12)', legX, roadY + 100);
    g.fillStyle = '#cbd5e1';
    g.fillText('• L3 = Lẻ 3 Đỏ 1 Trắng (1:2.6)   • L1 = Lẻ 3 Trắng 1 Đỏ (1:2.6)', legX, roadY + 124);
    g.fillStyle = '#fde047';
    g.fillText('• Viền Vàng = Ván nổ Tứ Tử đặc biệt!', legX, roadY + 148);
    g.restore();

    updateAndDrawCanvasFX(g, dt);
  }

  function renderXocDiaSideAndControls() {
    if (!dom.sidePanel || !dom.actionBar || state.activeStation !== 'xocdia') return;
    const totalBet = getXocDiaTotalBet();
    const hist = state.histories.xocdia;
    const last = hist[hist.length - 1];

    dom.sidePanel.innerHTML = `
      <div class="dc-side-box">
        <h4>🔴 Thông Tin Chiếu Xóc Đĩa</h4>
        <div style="font-size:12.5px;line-height:1.65;">
          <div>Tổng Phỉnh bạn đặt: <strong style="color:#4ade80;">${formatNum(totalBet)}</strong></div>
          <div>Làng đặt Chẵn: <strong>${formatNum(xocdiaGame.crowdBets.CHAN)}</strong></div>
          <div>Làng đặt Lẻ: <strong>${formatNum(xocdiaGame.crowdBets.LE)}</strong></div>
          ${last ? `<div>Ván gần nhất: <strong style="color:#fde047;">${last.even ? 'CHẴN' : 'LẺ'} (${last.reds} Đỏ - ${last.whites} Trắng)</strong></div>` : ''}
        </div>
        <label style="display:flex;align-items:center;gap:8px;margin-top:9px;cursor:pointer;font-weight:700;color:#fef08a;">
          <input type="checkbox" id="dc-xd-squeeze-chk" ${xocdiaGame.squeezeMode ? 'checked' : ''} />
          Nặn Bát Xóc Đĩa Bằng Tay
        </label>
      </div>
      <div class="dc-side-box">
        <h4>📜 Luật &amp; Tỷ Lệ Ăn Xóc Đĩa</h4>
        <div style="font-size:11.5px;color:#cbd5e1;line-height:1.55;">
          • <strong>Chẵn</strong> (4 Đỏ, 4 Trắng, 2 Đỏ 2 Trắng): <strong>1 ăn 1</strong><br/>
          • <strong>Lẻ</strong> (3 Đỏ 1 Trắng, 3 Trắng 1 Đỏ): <strong>1 ăn 1</strong><br/>
          • <strong>Tứ Tử 4 Đỏ / 4 Trắng</strong>: <strong>1 ăn 12</strong><br/>
          • <strong>Vị 3 Đỏ 1 Trắng / 3 Trắng 1 Đỏ</strong>: <strong>1 ăn 2.6</strong>
        </div>
      </div>
    `;

    dom.sidePanel.querySelector('#dc-xd-squeeze-chk')?.addEventListener('change', (e) => {
      xocdiaGame.squeezeMode = Boolean(e.target.checked);
      casinoSFX.playChipClink(1);
    });

    if (xocdiaGame.phase === 'BETTING') {
      dom.actionBar.innerHTML = `
        <button type="button" class="dc-btn" id="dc-xd-clear" ${totalBet <= 0 ? 'disabled' : ''}>Xóa Phỉnh</button>
        <button type="button" class="dc-btn" id="dc-xd-repeat">Đặt Lại</button>
        <button type="button" class="dc-btn" id="dc-xd-double" ${totalBet <= 0 ? 'disabled' : ''}>Nhân Đôi x2</button>
        <button type="button" class="dc-btn purple" id="dc-xd-instant">⚡ Xóc &amp; Mở Ngay</button>
        <button type="button" class="dc-btn gold" id="dc-xd-shake">🔴 XÓC ĐĨA (${xocdiaGame.squeezeMode ? 'Nặn Đĩa' : 'Mở'})</button>
      `;
      dom.actionBar.querySelector('#dc-xd-clear')?.addEventListener('click', clearXocDiaBets);
      dom.actionBar.querySelector('#dc-xd-repeat')?.addEventListener('click', () => repeatXocDiaBets(1));
      dom.actionBar.querySelector('#dc-xd-double')?.addEventListener('click', () => repeatXocDiaBets(2));
      dom.actionBar.querySelector('#dc-xd-instant')?.addEventListener('click', () => startXocDiaShake(true));
      dom.actionBar.querySelector('#dc-xd-shake')?.addEventListener('click', () => startXocDiaShake(false));
    } else if (xocdiaGame.phase === 'SHAKING') {
      dom.actionBar.innerHTML = `<button type="button" class="dc-btn gold" disabled>🎶 Nhà cái đang xóc đĩa...</button>`;
    } else if (xocdiaGame.phase === 'SQUEEZING') {
      dom.actionBar.innerHTML = `
        <span style="font-size:12.5px;color:#fde047;font-weight:800;">👆 Kéo chiếc bát đỏ ra khỏi đĩa để soi quân vị!</span>
        <button type="button" class="dc-btn gold" id="dc-xd-open-now">💨 Mở Bát Ngay!</button>
      `;
      dom.actionBar.querySelector('#dc-xd-open-now')?.addEventListener('click', finalizeXocDiaRound);
    } else {
      dom.actionBar.innerHTML = `
        <button type="button" class="dc-btn emerald" id="dc-xd-rebet">Ván Mới &amp; Giữ Cược</button>
        <button type="button" class="dc-btn gold" id="dc-xd-next">🔴 VÁN MỚI</button>
      `;
      dom.actionBar.querySelector('#dc-xd-next')?.addEventListener('click', resetXocDiaRound);
      dom.actionBar.querySelector('#dc-xd-rebet')?.addEventListener('click', () => {
        resetXocDiaRound();
        repeatXocDiaBets(1);
      });
    }
  }

  // ============================================================================
  // SECTION 6: STATION 4 — BÀN QUAY ROULETTE ĐỎ ĐEN CHÂU ÂU (0–36)
  // ============================================================================
  const ROULETTE_WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];

  const ROULETTE_RED_NUMS = new Set([
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
  ]);

  function getRouletteColor(num) {
    if (num === 0) return 'green';
    return ROULETTE_RED_NUMS.has(num) ? 'red' : 'black';
  }

  const rouletteGame = {
    phase: 'BETTING', // 'BETTING' | 'SPINNING' | 'RESULT'
    bets: new Map(), // key -> { key, label, numbers: number[], odds: number, x, y, amount }
    lastBetsSnapshot: [],
    hoverSpot: null,
    wheelAngle: 0,
    wheelVel: 0.35,
    ballAngle: 0,
    ballVel: 0,
    ballRadius: 146,
    ballBouncePhase: 0,
    spinElapsed: 0,
    spinDuration: 4.8,
    winningNumber: null,
    winningIndex: 0,
    lastBounceTick: 0,
    feltSpots: [],
    cellRects: new Map()
  };

  function buildRouletteFeltSpots() {
    const spots = [];
    const cellRects = new Map();

    // Felt Grid Layout on right side of Canvas (x: 400..952, y: 78..388)
    const zeroX = 400;
    const gridX = 446;
    const gridY = 78;
    const cellW = 38.5;
    const cellH = 54;

    // 0 Straight
    const zeroRect = { x: zeroX, y: gridY, w: 44, h: cellH * 3 };
    cellRects.set(0, zeroRect);
    spots.push({
      key: 'STRAIGHT_0',
      label: 'Số 0 Xanh Lá',
      numbers: [0],
      odds: 35,
      x: zeroRect.x + zeroRect.w * 0.5,
      y: zeroRect.y + zeroRect.h * 0.5,
      hitRect: zeroRect,
      priority: 1
    });

    // Numbers 1..36 in 12 columns x 3 rows (Top row: 3,6..36; Mid row: 2,5..35; Bot row: 1,4..34)
    for (let col = 0; col < 12; col++) {
      for (let row = 0; row < 3; row++) {
        const num = col * 3 + (3 - row);
        const rx = gridX + col * cellW;
        const ry = gridY + row * cellH;
        const rect = { x: rx, y: ry, w: cellW, h: cellH };
        cellRects.set(num, rect);
        spots.push({
          key: `STRAIGHT_${num}`,
          label: `Cược Thẳng Số ${num}`,
          numbers: [num],
          odds: 35,
          x: rx + cellW * 0.5,
          y: ry + cellH * 0.5,
          hitRect: rect,
          priority: 1
        });
      }
    }

    // Horizontal & Vertical Split Bets (17:1) — higher priority narrow border hitboxes!
    for (let col = 0; col < 12; col++) {
      for (let row = 0; row < 3; row++) {
        const n1 = col * 3 + (3 - row);
        const rx = gridX + col * cellW;
        const ry = gridY + row * cellH;

        // Vertical neighbor below in same column
        if (row < 2) {
          const n2 = col * 3 + (2 - row);
          const pair = [n2, n1];
          spots.push({
            key: `SPLIT_${pair[0]}_${pair[1]}`,
            label: `Cược Đôi (${pair[0]}, ${pair[1]})`,
            numbers: pair,
            odds: 17,
            x: rx + cellW * 0.5,
            y: ry + cellH,
            hitRect: { x: rx + 7, y: ry + cellH - 6, w: cellW - 14, h: 12 },
            priority: 2
          });
        }

        // Horizontal neighbor to right column
        if (col < 11) {
          const nRight = (col + 1) * 3 + (3 - row);
          const pair = [n1, nRight];
          spots.push({
            key: `SPLIT_${pair[0]}_${pair[1]}`,
            label: `Cược Đôi (${pair[0]}, ${pair[1]})`,
            numbers: pair,
            odds: 17,
            x: rx + cellW,
            y: ry + cellH * 0.5,
            hitRect: { x: rx + cellW - 6, y: ry + 7, w: 12, h: cellH - 14 },
            priority: 2
          });
        }

        // 4-Number Corner Bet at bottom-right intersection (8:1)
        if (col < 11 && row < 2) {
          const nBelow = col * 3 + (2 - row);
          const nRight = (col + 1) * 3 + (3 - row);
          const nDiag = (col + 1) * 3 + (2 - row);
          const quad = [nBelow, n1, nDiag, nRight].sort((a, b) => a - b);
          spots.push({
            key: `CORNER_${quad.join('_')}`,
            label: `Cược Góc (${quad.join(', ')})`,
            numbers: quad,
            odds: 8,
            x: rx + cellW,
            y: ry + cellH,
            hitRect: { x: rx + cellW - 7, y: ry + cellH - 7, w: 14, h: 14 },
            priority: 3
          });
        }
      }
    }

    // 3 Column 2:1 Bets on far right of number grid
    const colBetX = gridX + 12 * cellW + 2;
    for (let row = 0; row < 3; row++) {
      const nums = [];
      for (let c = 0; c < 12; c++) nums.push(c * 3 + (3 - row));
      const rect = { x: colBetX, y: gridY + row * cellH, w: 44, h: cellH };
      spots.push({
        key: `COL_${3 - row}`,
        label: `Cột ${3 - row} (2 ăn 1)`,
        numbers: nums,
        odds: 2,
        x: rect.x + rect.w * 0.5,
        y: rect.y + rect.h * 0.5,
        hitRect: rect,
        isOutside: true,
        shortText: '2:1',
        priority: 1
      });
    }

    // 1st 12, 2nd 12, 3rd 12 Dozen Bets (2:1)
    const dozY = gridY + cellH * 3 + 6;
    const dozW = cellW * 4;
    const dozH = 44;
    const dozDefs = [
      { key: 'DOZ_1', label: 'Tá Đầu 1–12', shortText: 'TÁ 1 (1 – 12)', start: 1, end: 12 },
      { key: 'DOZ_2', label: 'Tá Giữa 13–24', shortText: 'TÁ 2 (13 – 24)', start: 13, end: 24 },
      { key: 'DOZ_3', label: 'Tá Cuối 25–36', shortText: 'TÁ 3 (25 – 36)', start: 25, end: 36 }
    ];
    for (let d = 0; d < 3; d++) {
      const nums = [];
      for (let n = dozDefs[d].start; n <= dozDefs[d].end; n++) nums.push(n);
      const rect = { x: gridX + d * dozW, y: dozY, w: dozW, h: dozH };
      spots.push({
        key: dozDefs[d].key,
        label: `${dozDefs[d].label} (1 ăn 2)`,
        numbers: nums,
        odds: 2,
        x: rect.x + rect.w * 0.5,
        y: rect.y + rect.h * 0.5,
        hitRect: rect,
        isOutside: true,
        shortText: dozDefs[d].shortText,
        priority: 1
      });
    }

    // 6 Even-Money Outside Bets: 1-18 | CHẴN | ĐỎ | ĐEN | LẺ | 19-36
    const evenY = dozY + dozH + 6;
    const evenW = cellW * 2;
    const evenH = 48;
    const all1to36 = Array.from({ length: 36 }, (_, idx) => idx + 1);
    const evenDefs = [
      { key: 'LOW_1_18', label: 'Nửa Nhỏ 1–18', shortText: '1 – 18', nums: all1to36.filter((n) => n <= 18) },
      { key: 'EVEN', label: 'Số Chẵn', shortText: 'CHẴN', nums: all1to36.filter((n) => n % 2 === 0) },
      { key: 'RED', label: 'Ô Đỏ', shortText: '◆ ĐỎ', nums: all1to36.filter((n) => ROULETTE_RED_NUMS.has(n)), bg: '#b91c1c' },
      { key: 'BLACK', label: 'Ô Đen', shortText: '◆ ĐEN', nums: all1to36.filter((n) => !ROULETTE_RED_NUMS.has(n)), bg: '#0f172a' },
      { key: 'ODD', label: 'Số Lẻ', shortText: 'LẺ', nums: all1to36.filter((n) => n % 2 === 1) },
      { key: 'HIGH_19_36', label: 'Nửa Lớn 19–36', shortText: '19 – 36', nums: all1to36.filter((n) => n >= 19) }
    ];
    for (let i = 0; i < evenDefs.length; i++) {
      const def = evenDefs[i];
      const rect = { x: gridX + i * evenW, y: evenY, w: evenW, h: evenH };
      spots.push({
        key: def.key,
        label: `${def.label} (1 ăn 1)`,
        numbers: def.nums,
        odds: 1,
        x: rect.x + rect.w * 0.5,
        y: rect.y + rect.h * 0.5,
        hitRect: rect,
        isOutside: true,
        shortText: def.shortText,
        customBg: def.bg || null,
        priority: 1
      });
    }

    rouletteGame.feltSpots = spots;
    rouletteGame.cellRects = cellRects;
  }
  buildRouletteFeltSpots();

  function hitTestRouletteSpot(mx, my) {
    let best = null;
    for (let i = 0; i < rouletteGame.feltSpots.length; i++) {
      const sp = rouletteGame.feltSpots[i];
      const r = sp.hitRect;
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        if (!best || sp.priority >= best.priority) {
          best = sp;
        }
      }
    }
    return best;
  }

  function getRouletteTotalBet() {
    let total = 0;
    for (const entry of rouletteGame.bets.values()) {
      total += entry.amount;
    }
    return total;
  }

  function placeRouletteBetOnSpot(spot) {
    if (!spot) return;
    if (rouletteGame.phase === 'SPINNING') {
      showCasinoToast('Bánh xe đang quay! Không nhận thêm phỉnh.', 'error', 1.6);
      return;
    }
    if (rouletteGame.phase === 'RESULT') {
      rouletteGame.phase = 'BETTING';
      rouletteGame.bets.clear();
    }
    const amt = state.selectedChip;
    if (!spendChips(amt, true)) return;
    const existing = rouletteGame.bets.get(spot.key);
    if (existing) {
      existing.amount += amt;
    } else {
      rouletteGame.bets.set(spot.key, {
        key: spot.key,
        label: spot.label,
        numbers: spot.numbers,
        odds: spot.odds,
        x: spot.x,
        y: spot.y,
        amount: amt
      });
    }
    casinoSFX.playChipClink(2);
    renderRouletteSideAndControls();
  }

  function clearRouletteBets() {
    if (rouletteGame.phase === 'SPINNING') return;
    const total = getRouletteTotalBet();
    if (total <= 0) return;
    rouletteGame.bets.clear();
    addChips(total, 'refund');
    casinoSFX.playChipClink(2);
    showCasinoToast(`Đã thu hồi ${formatNum(total)} Phỉnh trên bàn Roulette.`, 'gold', 1.8);
    renderRouletteSideAndControls();
  }

  function repeatRouletteBets(mult = 1) {
    if (rouletteGame.phase === 'SPINNING') return;
    if (rouletteGame.phase === 'RESULT') {
      rouletteGame.phase = 'BETTING';
      rouletteGame.bets.clear();
    }

    if (mult > 1 && rouletteGame.bets.size > 0) {
      const addCost = getRouletteTotalBet() * (mult - 1);
      if (!spendChips(addCost, true)) return;
      for (const b of rouletteGame.bets.values()) {
        b.amount *= mult;
      }
      casinoSFX.playChipSweep();
      renderRouletteSideAndControls();
      return;
    }

    if (rouletteGame.lastBetsSnapshot.length === 0) {
      showCasinoToast('Chưa có lịch sử cược Roulette ván trước!', 'error');
      return;
    }
    let cost = 0;
    for (const item of rouletteGame.lastBetsSnapshot) cost += item.amount * mult;
    if (!spendChips(cost, true)) return;
    for (const item of rouletteGame.lastBetsSnapshot) {
      const ex = rouletteGame.bets.get(item.key);
      if (ex) ex.amount += item.amount * mult;
      else rouletteGame.bets.set(item.key, { ...item, amount: item.amount * mult });
    }
    casinoSFX.playChipSweep();
    renderRouletteSideAndControls();
  }

  function spinRouletteWheel() {
    if (rouletteGame.phase === 'SPINNING') return;
    if (rouletteGame.phase === 'RESULT' && rouletteGame.bets.size === 0) {
      repeatRouletteBets(1);
    }
    const total = getRouletteTotalBet();
    if (total <= 0) {
      showCasinoToast('Hãy đặt Phỉnh lên bàn Đỏ/Đen hoặc các con số 0–36 trước khi quay!', 'error');
      casinoSFX.playError();
      return;
    }

    rouletteGame.lastBetsSnapshot = Array.from(rouletteGame.bets.values()).map((b) => ({ ...b }));
    const winIdx = randInt(0, ROULETTE_WHEEL_ORDER.length - 1);
    rouletteGame.winningIndex = winIdx;
    rouletteGame.winningNumber = ROULETTE_WHEEL_ORDER[winIdx];

    rouletteGame.phase = 'SPINNING';
    rouletteGame.spinElapsed = 0;
    rouletteGame.spinDuration = 4.65;
    rouletteGame.startWheelAngle = rouletteGame.wheelAngle;
    // Spin wheel ~2.5 turns clockwise
    rouletteGame.targetWheelAngle = rouletteGame.wheelAngle + Math.PI * 2 * (2.2 + randFloat(0.2, 0.7));

    // Pocket angle on wheel at end of spin
    const slice = (Math.PI * 2) / 37;
    const finalPocketWorldAngle = rouletteGame.targetWheelAngle + winIdx * slice;
    // Spin ball ~7 turns counter-clockwise landing exactly in finalPocketWorldAngle!
    const fullTurns = Math.PI * 2 * 7;
    rouletteGame.startBallAngle = finalPocketWorldAngle + fullTurns;
    rouletteGame.targetBallAngle = finalPocketWorldAngle;
    rouletteGame.ballAngle = rouletteGame.startBallAngle;
    rouletteGame.ballRadius = 148;
    rouletteGame.lastBounceTick = 0;

    casinoSFX.playRouletteSpin();
    renderRouletteSideAndControls();
  }

  function settleRouletteSpin() {
    rouletteGame.phase = 'RESULT';
    const winNum = rouletteGame.winningNumber;
    const winColor = getRouletteColor(winNum);

    let totalReturn = 0;
    const totalBet = getRouletteTotalBet();
    for (const b of rouletteGame.bets.values()) {
      if (b.numbers.includes(winNum)) {
        totalReturn += b.amount * (1 + b.odds);
      }
    }

    state.histories.roulette.push({ num: winNum, color: winColor });
    if (state.histories.roulette.length > 60) state.histories.roulette.shift();
    state.stats.roundsPlayed++;
    state.stats.roulettePlayed++;

    const colorVN = winColor === 'green' ? 'Xanh Lá (Zero)' : winColor === 'red' ? 'Đỏ' : 'Đen';
    if (totalReturn > 0) {
      addChips(totalReturn, 'roulette_win');
      if (totalReturn >= totalBet * 8) {
        casinoSFX.playMegaJackpotCascade();
        spawnCanvasConfetti(980, 560, 70);
      } else {
        casinoSFX.playWinFanfare(0.85);
      }
      const winCell = rouletteGame.cellRects.get(winNum);
      spawnCanvasCoins(winCell ? winCell.x + 20 : 650, winCell ? winCell.y + 20 : 220, 30, 1.0);
      spawnFloatingCallout(665, 185, `SỐ ${winNum} (${colorVN}) • +${formatNum(totalReturn)} PHỈNH!`, '#fde047', 24);
      showCasinoToast(`🎡 Bóng rơi ô số ${winNum} ${colorVN}! Thắng +${formatNum(totalReturn)} Phỉnh!`, 'win', 3.4);
    } else {
      casinoSFX.playRouletteBallBounce(0.5);
      spawnFloatingCallout(665, 185, `SỐ ${winNum} (${colorVN})`, '#f87171', 22);
      showCasinoToast(`Bóng dừng tại ô số ${winNum} (${colorVN}).`, 'gold', 2.4);
    }

    saveCasinoState();
    renderRouletteSideAndControls();
  }

  function updateRoulette(dt) {
    if (rouletteGame.phase === 'BETTING' || rouletteGame.phase === 'RESULT') {
      // Gentle idle luxury wheel rotation; keep ball locked in winning pocket during RESULT
      rouletteGame.wheelAngle += 0.22 * dt;
      if (rouletteGame.phase === 'RESULT' && rouletteGame.winningNumber !== null) {
        const slice = (Math.PI * 2) / 37;
        rouletteGame.ballAngle = rouletteGame.wheelAngle + rouletteGame.winningIndex * slice;
        rouletteGame.ballRadius = 102;
      }
      return;
    }

    if (rouletteGame.phase === 'SPINNING') {
      rouletteGame.spinElapsed += dt;
      const t = clamp(rouletteGame.spinElapsed / rouletteGame.spinDuration, 0, 1);
      const easeW = easeOutCubic(t);
      const easeB = 1 - Math.pow(1 - t, 3.35);

      rouletteGame.wheelAngle = lerp(rouletteGame.startWheelAngle, rouletteGame.targetWheelAngle, easeW);
      rouletteGame.ballAngle = lerp(rouletteGame.startBallAngle, rouletteGame.targetBallAngle, easeB);

      // Radial ball drop from outer wood rim (148) across deflectors (126) into numbered pockets (102) with realistic bounces!
      if (t < 0.56) {
        rouletteGame.ballRadius = 148 - t * 14;
      } else if (t < 0.88) {
        const u = (t - 0.56) / 0.32;
        const bounce = Math.abs(Math.sin(u * Math.PI * 5.5)) * (1 - u) * 20;
        rouletteGame.ballRadius = lerp(140, 102, u) + bounce;
        if (rouletteGame.spinElapsed - rouletteGame.lastBounceTick > 0.14) {
          rouletteGame.lastBounceTick = rouletteGame.spinElapsed;
          casinoSFX.playRouletteBallBounce(1 - u * 0.65);
        }
      } else {
        const u = (t - 0.88) / 0.12;
        rouletteGame.ballRadius = 102 + Math.sin(u * Math.PI * 3) * (1 - u) * 5;
      }

      if (t >= 1) {
        settleRouletteSpin();
      }
    }
  }

  function drawRouletteCanvas(g, w, h, dt) {
    drawLuxuryFeltBackground(
      g,
      w,
      h,
      '#0b3824',
      'EUROPEAN ROULETTE THƯỢNG LƯU • 0 – 36',
      rouletteGame.hoverSpot
        ? `${rouletteGame.hoverSpot.label} — Đặt Phỉnh ${formatNum(state.selectedChip)}`
        : 'Rê chuột lên số, vạch đôi hoặc góc 4 số để đặt cược chuẩn Châu Âu'
    );

    // 1. LEFT: High-Detail Mahogany, Brass & Gold European Roulette Wheel
    const wx = 198;
    const wy = 266;
    g.save();
    g.translate(wx, wy);

    // Outer shadow & Mahogany Bowl
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.beginPath();
    g.arc(5, 8, 170, 0, Math.PI * 2);
    g.fill();

    const woodGrad = g.createRadialGradient(-35, -35, 25, 0, 0, 170);
    woodGrad.addColorStop(0, '#7c2d12');
    woodGrad.addColorStop(0.75, '#431407');
    woodGrad.addColorStop(0.94, '#270b03');
    woodGrad.addColorStop(1, '#d97706');
    g.fillStyle = woodGrad;
    g.beginPath();
    g.arc(0, 0, 168, 0, Math.PI * 2);
    g.fill();

    // Ball track recess & 8 brass diamond deflectors
    g.strokeStyle = 'rgba(250, 204, 21, 0.45)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, 152, 0, Math.PI * 2);
    g.stroke();

    for (let d = 0; d < 8; d++) {
      const da = (d * Math.PI) / 4;
      g.save();
      g.rotate(da);
      g.fillStyle = '#facc15';
      g.beginPath();
      g.moveTo(138, -4);
      g.lineTo(145, 0);
      g.lineTo(138, 4);
      g.lineTo(131, 0);
      g.closePath();
      g.fill();
      g.restore();
    }

    // Rotating 37-pocket rotor
    const slice = (Math.PI * 2) / 37;
    g.save();
    g.rotate(rouletteGame.wheelAngle);

    for (let i = 0; i < 37; i++) {
      const num = ROULETTE_WHEEL_ORDER[i];
      const col = getRouletteColor(num);
      const a0 = i * slice - slice * 0.5;
      const a1 = a0 + slice;

      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, 128, a0, a1);
      g.closePath();
      g.fillStyle = col === 'green' ? '#15803d' : col === 'red' ? '#b91c1c' : '#111827';
      g.fill();
      g.strokeStyle = '#eab308';
      g.lineWidth = 1.0;
      g.stroke();

      // Number label around outer rotor ring
      g.save();
      g.rotate(i * slice);
      g.translate(115, 0);
      g.rotate(Math.PI * 0.5);
      g.fillStyle = '#ffffff';
      g.font = '800 9.5px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(num), 0, 0);
      g.restore();
    }

    // Pocket inner ring divider
    g.strokeStyle = '#fef08a';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, 92, 0, Math.PI * 2);
    g.stroke();

    // Inner Cone & Golden 4-Spoke Turret
    const coneGrad = g.createRadialGradient(-14, -14, 5, 0, 0, 88);
    coneGrad.addColorStop(0, '#fde047');
    coneGrad.addColorStop(0.45, '#b45309');
    coneGrad.addColorStop(1, '#451a03');
    g.fillStyle = coneGrad;
    g.beginPath();
    g.arc(0, 0, 88, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = '#fef08a';
    g.lineWidth = 4.5;
    for (let s = 0; s < 4; s++) {
      const sa = (s * Math.PI) * 0.5;
      g.beginPath();
      g.moveTo(Math.cos(sa) * -52, Math.sin(sa) * -52);
      g.lineTo(Math.cos(sa) * 52, Math.sin(sa) * 52);
      g.stroke();
    }
    g.fillStyle = '#fef9c3';
    g.beginPath();
    g.arc(0, 0, 16, 0, Math.PI * 2);
    g.fill();
    g.restore(); // end rotating rotor

    // Ivory Roulette Ball
    if (rouletteGame.phase === 'SPINNING' || rouletteGame.winningNumber !== null) {
      const bx = Math.cos(rouletteGame.ballAngle) * rouletteGame.ballRadius;
      const by = Math.sin(rouletteGame.ballAngle) * rouletteGame.ballRadius;
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.beginPath();
      g.arc(bx + 2, by + 3, 6.5, 0, Math.PI * 2);
      g.fill();

      const ballG = g.createRadialGradient(bx - 2, by - 2, 1, bx, by, 6.5);
      ballG.addColorStop(0, '#ffffff');
      ballG.addColorStop(0.7, '#f8fafc');
      ballG.addColorStop(1, '#cbd5e1');
      g.fillStyle = ballG;
      g.beginPath();
      g.arc(bx, by, 6.2, 0, Math.PI * 2);
      g.fill();
    }
    g.restore(); // end wheel group

    // 2. RIGHT: European Betting Felt Grid
    const coveredSet = new Set(rouletteGame.hoverSpot ? rouletteGame.hoverSpot.numbers : []);

    // Draw 0 + 1..36 cells
    for (const [num, rect] of rouletteGame.cellRects.entries()) {
      const col = getRouletteColor(num);
      const isCovered = coveredSet.has(num);
      const isWinNum = rouletteGame.phase === 'RESULT' && rouletteGame.winningNumber === num;

      g.save();
      roundRectPath(g, rect.x, rect.y, rect.w, rect.h, 4);
      if (isWinNum) {
        g.fillStyle = '#eab308';
      } else if (isCovered) {
        g.fillStyle = col === 'green' ? '#22c55e' : col === 'red' ? '#ef4444' : '#334155';
      } else {
        g.fillStyle = col === 'green' ? '#15803d' : col === 'red' ? '#991b1b' : '#0f172a';
      }
      g.fill();
      g.strokeStyle = isWinNum || isCovered ? '#fef08a' : 'rgba(255,255,255,0.45)';
      g.lineWidth = isWinNum ? 3 : isCovered ? 2 : 1.1;
      g.stroke();

      g.fillStyle = isWinNum ? '#1c0a00' : '#ffffff';
      g.font = '800 15px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(num), rect.x + rect.w * 0.5, rect.y + rect.h * 0.5);
      g.restore();
    }

    // Draw Outside Bet Boxes (Columns, Dozens, Even-Money)
    for (let i = 0; i < rouletteGame.feltSpots.length; i++) {
      const sp = rouletteGame.feltSpots[i];
      if (!sp.isOutside) continue;
      const r = sp.hitRect;
      const isHov = rouletteGame.hoverSpot === sp;
      const isWin = rouletteGame.phase === 'RESULT' && rouletteGame.winningNumber !== null && sp.numbers.includes(rouletteGame.winningNumber);

      g.save();
      roundRectPath(g, r.x, r.y, r.w, r.h, 5);
      if (isWin) g.fillStyle = 'rgba(250, 204, 21, 0.34)';
      else if (sp.customBg) g.fillStyle = sp.customBg;
      else g.fillStyle = isHov ? 'rgba(255,255,255,0.16)' : 'rgba(6, 32, 20, 0.72)';
      g.fill();

      g.strokeStyle = isWin || isHov ? '#fde047' : 'rgba(255,255,255,0.4)';
      g.lineWidth = isWin || isHov ? 2.2 : 1.1;
      g.stroke();

      g.fillStyle = '#fef3c7';
      g.font = '800 12.5px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(sp.shortText, r.x + r.w * 0.5, r.y + r.h * 0.5);
      g.restore();
    }

    // Draw Placed Chip Stacks on Felt (Straight, Split, Corner, Outside!)
    for (const b of rouletteGame.bets.values()) {
      drawChipStack(g, b.x, b.y, b.amount, 12.5, 5);
    }

    // Draw Crystal Dolly Marker on Winning Number
    if (rouletteGame.phase === 'RESULT' && rouletteGame.winningNumber !== null) {
      const wr = rouletteGame.cellRects.get(rouletteGame.winningNumber);
      if (wr) {
        const dx = wr.x + wr.w * 0.5;
        const dy = wr.y + 14;
        g.save();
        g.fillStyle = 'rgba(56, 189, 248, 0.88)';
        g.strokeStyle = '#ffffff';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(dx, dy, 10, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.restore();
      }
    }

    // 3. Bottom Ribbon: Last 18 Spins History
    const ribX = 400;
    const ribY = 468;
    const ribW = 552;
    const ribH = 72;
    g.save();
    roundRectPath(g, ribX, ribY, ribW, ribH, 10);
    g.fillStyle = 'rgba(8, 12, 16, 0.78)';
    g.fill();
    g.strokeStyle = 'rgba(245, 197, 66, 0.35)';
    g.lineWidth = 1.2;
    g.stroke();

    g.fillStyle = '#fde047';
    g.font = '800 11.5px "Segoe UI", sans-serif';
    g.textAlign = 'left';
    g.fillText('LỊCH SỬ 18 VÒNG QUAY GẦN NHẤT:', ribX + 14, ribY + 18);

    const last18 = state.histories.roulette.slice(-18).reverse();
    for (let i = 0; i < last18.length; i++) {
      const rec = last18[i];
      const bx = ribX + 26 + i * 29.2;
      const by = ribY + 46;
      g.fillStyle = rec.color === 'green' ? '#16a34a' : rec.color === 'red' ? '#dc2626' : '#1e293b';
      g.beginPath();
      g.arc(bx, by, 12.5, 0, Math.PI * 2);
      g.fill();
      if (i === 0) {
        g.strokeStyle = '#fde047';
        g.lineWidth = 2.2;
        g.stroke();
      }
      g.fillStyle = '#ffffff';
      g.font = '800 10.5px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(rec.num), bx, by + 0.5);
    }
    g.restore();

    updateAndDrawCanvasFX(g, dt);
  }

  function renderRouletteSideAndControls() {
    if (!dom.sidePanel || !dom.actionBar || state.activeStation !== 'roulette') return;
    const totalBet = getRouletteTotalBet();
    const hist = state.histories.roulette;

    // Calculate Hot & Cold numbers
    const freq = new Array(37).fill(0);
    for (let i = 0; i < hist.length; i++) {
      const n = hist[i].num;
      if (n >= 0 && n <= 36) freq[n]++;
    }
    const sorted = Array.from({ length: 37 }, (_, n) => ({ n, c: freq[n] })).sort((a, b) => b.c - a.c);
    const hot4 = sorted.slice(0, 4);
    const cold4 = sorted.slice(-4).reverse();

    let redCount = 0;
    let blackCount = 0;
    for (let i = 0; i < hist.length; i++) {
      if (hist[i].color === 'red') redCount++;
      else if (hist[i].color === 'black') blackCount++;
    }
    const spinning = rouletteGame.phase === 'SPINNING';

    dom.sidePanel.innerHTML = `
      <div class="dc-side-box">
        <h4>🎡 Thống Kê Bàn Roulette</h4>
        <div style="font-size:12.5px;line-height:1.6;">
          <div>Tổng Phỉnh trên thảm: <strong style="color:#4ade80;">${formatNum(totalBet)}</strong></div>
          <div>Số vị trí đã đặt: <strong>${rouletteGame.bets.size} cửa</strong></div>
          <div>Tỷ lệ Đỏ / Đen: <strong style="color:#f87171;">${redCount} Đỏ</strong> / <strong style="color:#cbd5e1;">${blackCount} Đen</strong></div>
        </div>
      </div>
      <div class="dc-side-box">
        <h4>🔥 Số Nóng &amp; ❄️ Số Lạnh</h4>
        <div style="margin-bottom:6px;font-size:12px;">
          <strong style="color:#fb923c;">🔥 Số Nóng (Về nhiều):</strong>
          <div style="display:flex;gap:6px;margin-top:4px;">
            ${hot4.map((h) => `<span style="padding:3px 8px;border-radius:6px;background:${getRouletteColor(h.n) === 'red' ? '#b91c1c' : getRouletteColor(h.n) === 'green' ? '#15803d' : '#1e293b'};font-weight:800;">${h.n} (${h.c}x)</span>`).join('')}
          </div>
        </div>
        <div style="font-size:12px;">
          <strong style="color:#7dd3fc;">❄️ Số Lạnh (Ít về):</strong>
          <div style="display:flex;gap:6px;margin-top:4px;">
            ${cold4.map((c) => `<span style="padding:3px 8px;border-radius:6px;background:#0f172a;border:1px solid #334155;font-weight:800;">${c.n} (${c.c}x)</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="dc-side-box">
        <h4>🏎️ Cược Đường Đua Pháp (Racetrack)</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          <button type="button" class="dc-mini-btn" data-rcall="VOISINS" ${spinning ? 'disabled' : ''}>Vòng Số 0 (17 số)</button>
          <button type="button" class="dc-mini-btn" data-rcall="TIERS" ${spinning ? 'disabled' : ''}>Góc Đối Diện (12 số)</button>
          <button type="button" class="dc-mini-btn" data-rcall="ORPHELINS" ${spinning ? 'disabled' : ''}>Số Mồ Côi (8 số)</button>
          <button type="button" class="dc-mini-btn" data-rcall="ZERO" ${spinning ? 'disabled' : ''}>Sát Sườn 0 (7 số)</button>
        </div>
      </div>
      <div class="dc-side-box">
        <h4>📜 Bảng Trả Thưởng Châu Âu</h4>
        <div style="font-size:11.5px;color:#cbd5e1;line-height:1.5;">
          • <strong>Cược Thẳng 1 số (0–36)</strong>: 1 ăn 35<br/>
          • <strong>Cược Đôi (vạch giữa 2 số)</strong>: 1 ăn 17<br/>
          • <strong>Cược Góc (ngã tư 4 số)</strong>: 1 ăn 8<br/>
          • <strong>Tá 12 số / Cột dọc</strong>: 1 ăn 2<br/>
          • <strong>Đỏ / Đen, Chẵn / Lẻ, 1–18 / 19–36</strong>: 1 ăn 1
        </div>
      </div>
    `;

    dom.sidePanel.querySelectorAll('[data-rcall]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const kind = btn.getAttribute('data-rcall');
        const mapNums = {
          VOISINS: [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25],
          TIERS: [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33],
          ORPHELINS: [1, 20, 14, 31, 9, 17, 34, 6],
          ZERO: [12, 35, 3, 26, 0, 32, 15]
        };
        const nums = mapNums[kind] || mapNums.ZERO;
        if (rouletteGame.phase === 'RESULT') {
          rouletteGame.phase = 'BETTING';
          rouletteGame.bets.clear();
        }
        const totalCost = nums.length * state.selectedChip;
        if (!spendChips(totalCost, true)) return;
        for (let i = 0; i < nums.length; i++) {
          const sp = rouletteGame.feltSpots.find((s) => s.key === `STRAIGHT_${nums[i]}`);
          if (!sp) continue;
          const ex = rouletteGame.bets.get(sp.key);
          if (ex) ex.amount += state.selectedChip;
          else {
            rouletteGame.bets.set(sp.key, {
              key: sp.key,
              label: sp.label,
              numbers: sp.numbers,
              odds: sp.odds,
              x: sp.x,
              y: sp.y,
              amount: state.selectedChip
            });
          }
        }
        casinoSFX.playChipSweep();
        showCasinoToast(`Đã trải Phỉnh Racetrack (${nums.length} ô • Tổng ${formatNum(totalCost)} Phỉnh)!`, 'gold', 2.4);
        renderRouletteSideAndControls();
      });
    });

    dom.actionBar.innerHTML = `
      <button type="button" class="dc-btn" id="dc-rl-clear" ${spinning || totalBet <= 0 ? 'disabled' : ''}>Xóa Phỉnh</button>
      <button type="button" class="dc-btn" id="dc-rl-repeat" ${spinning ? 'disabled' : ''}>Đặt Lại</button>
      <button type="button" class="dc-btn" id="dc-rl-double" ${spinning || totalBet <= 0 ? 'disabled' : ''}>Nhân Đôi 2x</button>
      <button type="button" class="dc-btn gold" id="dc-rl-spin" ${spinning ? 'disabled' : ''}>
        ${spinning ? '🎡 Bóng Ngà Đang Lăn...' : '🎡 QUAY BÁNH XE ROULETTE'}
      </button>
    `;

    dom.actionBar.querySelector('#dc-rl-clear')?.addEventListener('click', clearRouletteBets);
    dom.actionBar.querySelector('#dc-rl-repeat')?.addEventListener('click', () => repeatRouletteBets(1));
    dom.actionBar.querySelector('#dc-rl-double')?.addEventListener('click', () => repeatRouletteBets(2));
    dom.actionBar.querySelector('#dc-rl-spin')?.addEventListener('click', spinRouletteWheel);
  }

  // ============================================================================
  // SECTION 7: STATION 5 — XÌ DÁCH HOÀNG GIA / BLACKJACK 21 (6-DECK + NGŨ LINH)
  // ============================================================================
  const blackjackGame = {
    shoe: createDeck(6),
    phase: 'BETTING', // 'BETTING' | 'INSURANCE' | 'PLAYER_TURN' | 'DEALER_TURN' | 'RESULT'
    mainBet: 100,
    sidePerfectPair: 0,
    side21Plus3: 0,
    lastSetup: { mainBet: 100, sidePerfectPair: 0, side21Plus3: 0 },
    insuranceBet: 0,
    dealerCards: [],
    hands: [], // [{ cards, bet, status: 'PLAYING'|'STAND'|'BUST'|'BLACKJACK'|'CHARLIE'|'DOUBLED', outcomeText, payout }]
    activeHandIdx: 0,
    dealerActionTimer: 0,
    statusBanner: 'Chọn Phỉnh và nhấp vào vòng Cược Chính / Cược Phụ 21+3 để bắt đầu!',
    hoverSpot: null,
    betCircles: [
      { id: 'PERFECT_PAIR', label: 'ĐÔI HOÀN HẢO', sub: 'Ăn tới 25:1', x: 325, y: 428, r: 44 },
      { id: 'MAIN', label: 'CƯỢC CHÍNH', sub: 'Xì Dách 3:2 • Ngũ Linh 2:1', x: 490, y: 432, r: 58 },
      { id: 'SIDE_21_3', label: 'POKER 21+3', sub: 'Ăn tới 100:1', x: 655, y: 428, r: 44 }
    ]
  };

  function drawFromBlackjackShoe(faceUp = true, destX = 490, destY = 300, angle = 0) {
    if (blackjackGame.shoe.length < 52) {
      blackjackGame.shoe = createDeck(6);
      casinoSFX.playCardRiffle();
      showCasinoToast('🂠 Dealer vừa xào mới hộp 6 bộ bài!', 'gold', 2.0);
    }
    const raw = blackjackGame.shoe.pop();
    casinoSFX.playCardDeal();
    return {
      ...raw,
      x: 865,
      y: 88,
      tx: destX,
      ty: destY,
      faceUp,
      flip: faceUp ? 1 : 0,
      targetFlip: faceUp ? 1 : 0,
      angle
    };
  }

  function evaluateBlackjackHand(cards) {
    let sum = 0;
    let aces = 0;
    for (let i = 0; i < cards.length; i++) {
      sum += cards[i].bjVal;
      if (cards[i].rank === 'A') aces++;
    }
    while (sum > 21 && aces > 0) {
      sum -= 10;
      aces--;
    }
    const isSoft = aces > 0;
    const isNaturalBJ = cards.length === 2 && sum === 21;
    const isCharlie = cards.length >= 5 && sum <= 21;
    return { total: sum, isSoft, isNaturalBJ, isCharlie, isBust: sum > 21 };
  }

  function evaluatePerfectPairSideBet(c1, c2) {
    if (!c1 || !c2 || c1.rank !== c2.rank) return null;
    if (c1.suit === c2.suit) return { mult: 25, name: 'Đôi Đồng Chất Hoàn Hảo (25:1)!' };
    const red1 = c1.suit === 'H' || c1.suit === 'D';
    const red2 = c2.suit === 'H' || c2.suit === 'D';
    if (red1 === red2) return { mult: 12, name: 'Đôi Cùng Màu (12:1)!' };
    return { mult: 6, name: 'Đôi Khác Màu (6:1)!' };
  }

  function evaluate21Plus3SideBet(c1, c2, dealerUp) {
    if (!c1 || !c2 || !dealerUp) return null;
    const trio = [c1, c2, dealerUp];
    const suited = trio[0].suit === trio[1].suit && trio[1].suit === trio[2].suit;
    const vals = trio.map((c) => c.val).sort((a, b) => a - b);
    const sameRank = vals[0] === vals[1] && vals[1] === vals[2];
    const isStraight =
      (vals[2] - vals[1] === 1 && vals[1] - vals[0] === 1) ||
      (vals[0] === 2 && vals[1] === 3 && vals[2] === 14); // A-2-3

    if (sameRank && suited) return { mult: 100, name: '21+3 Sám Cô Đồng Chất (100:1)!!' };
    if (isStraight && suited) return { mult: 40, name: '21+3 Thùng Phá Sảnh 3 Lá (40:1)!' };
    if (sameRank) return { mult: 30, name: '21+3 Sám Cô 3 Lá (30:1)!' };
    if (isStraight) return { mult: 10, name: '21+3 Sảnh 3 Lá (10:1)!' };
    if (suited) return { mult: 5, name: '21+3 Thùng Đồng Chất (5:1)!' };
    return null;
  }

  function layoutBlackjackCards() {
    // Position dealer cards
    const dCount = blackjackGame.dealerCards.length;
    for (let i = 0; i < dCount; i++) {
      blackjackGame.dealerCards[i].tx = 490 + (i - (dCount - 1) * 0.5) * 48;
      blackjackGame.dealerCards[i].ty = 132;
    }

    // Position 1 or 2 player hands
    const hCount = blackjackGame.hands.length;
    for (let h = 0; h < hCount; h++) {
      const centerX = hCount === 1 ? 490 : h === 0 ? 320 : 660;
      const cards = blackjackGame.hands[h].cards;
      for (let i = 0; i < cards.length; i++) {
        cards[i].tx = centerX + (i - (cards.length - 1) * 0.5) * 44;
        cards[i].ty = 312;
      }
    }
  }

  function clickBlackjackCircle(circleId) {
    if (blackjackGame.phase !== 'BETTING' && blackjackGame.phase !== 'RESULT') return;
    if (blackjackGame.phase === 'RESULT') {
      resetBlackjackToBetting(false);
    }
    const amt = state.selectedChip;
    if (circleId === 'MAIN') {
      blackjackGame.mainBet = clamp(blackjackGame.mainBet + amt, 25, 50000);
    } else if (circleId === 'PERFECT_PAIR') {
      blackjackGame.sidePerfectPair = clamp(blackjackGame.sidePerfectPair + amt, 0, 10000);
    } else if (circleId === 'SIDE_21_3') {
      blackjackGame.side21Plus3 = clamp(blackjackGame.side21Plus3 + amt, 0, 10000);
    }
    casinoSFX.playChipClink(2);
    renderBlackjackSideAndControls();
  }

  function resetBlackjackToBetting(clearAmounts = false) {
    blackjackGame.phase = 'BETTING';
    blackjackGame.dealerCards = [];
    blackjackGame.hands = [];
    blackjackGame.insuranceBet = 0;
    blackjackGame.activeHandIdx = 0;
    if (clearAmounts) {
      blackjackGame.mainBet = 0;
      blackjackGame.sidePerfectPair = 0;
      blackjackGame.side21Plus3 = 0;
    } else if (blackjackGame.mainBet <= 0) {
      blackjackGame.mainBet = blackjackGame.lastSetup.mainBet || 100;
    }
    blackjackGame.statusBanner = 'Chọn mức cược rồi nhấn CHIA BÀI để bắt đầu ván mới!';
    renderBlackjackSideAndControls();
  }

  function startBlackjackDeal() {
    if (blackjackGame.phase !== 'BETTING' && blackjackGame.phase !== 'RESULT') return;
    if (blackjackGame.mainBet < 25) {
      showCasinoToast('Cược Chính tối thiểu bàn Xì Dách là 25 Phỉnh!', 'error');
      casinoSFX.playError();
      return;
    }
    const totalCost = blackjackGame.mainBet + blackjackGame.sidePerfectPair + blackjackGame.side21Plus3;
    if (!spendChips(totalCost, true)) return;

    blackjackGame.lastSetup = {
      mainBet: blackjackGame.mainBet,
      sidePerfectPair: blackjackGame.sidePerfectPair,
      side21Plus3: blackjackGame.side21Plus3
    };
    blackjackGame.insuranceBet = 0;
    blackjackGame.activeHandIdx = 0;

    const p1 = drawFromBlackjackShoe(true);
    const d1 = drawFromBlackjackShoe(true);
    const p2 = drawFromBlackjackShoe(true);
    const d2 = drawFromBlackjackShoe(false); // Dealer hole card face-down!

    blackjackGame.dealerCards = [d1, d2];
    blackjackGame.hands = [
      {
        cards: [p1, p2],
        bet: blackjackGame.mainBet,
        status: 'PLAYING',
        isSplitHand: false,
        outcomeText: '',
        payout: 0
      }
    ];
    layoutBlackjackCards();

    // Settle Perfect Pairs & 21+3 Side Bets immediately!
    let sideWinTotal = 0;
    const sideMsgs = [];
    if (blackjackGame.sidePerfectPair > 0) {
      const pp = evaluatePerfectPairSideBet(p1, p2);
      if (pp) {
        const win = blackjackGame.sidePerfectPair * (1 + pp.mult);
        sideWinTotal += win;
        sideMsgs.push(pp.name);
      }
    }
    if (blackjackGame.side21Plus3 > 0) {
      const p3 = evaluate21Plus3SideBet(p1, p2, d1);
      if (p3) {
        const win = blackjackGame.side21Plus3 * (1 + p3.mult);
        sideWinTotal += win;
        sideMsgs.push(p3.name);
      }
    }
    if (sideWinTotal > 0) {
      addChips(sideWinTotal, 'blackjack_sidebet');
      casinoSFX.playWinFanfare(0.85);
      spawnCanvasCoins(490, 390, 26, 0.95);
      showCasinoToast(`🌟 Trúng Cược Phụ: ${sideMsgs.join(' + ')} (+${formatNum(sideWinTotal)} Phỉnh)!`, 'win', 3.6);
    }

    const pEval = evaluateBlackjackHand(blackjackGame.hands[0].cards);
    const dEval = evaluateBlackjackHand(blackjackGame.dealerCards);

    // Offer Insurance if Dealer upcard is Ace
    if (d1.rank === 'A' && !pEval.isNaturalBJ) {
      blackjackGame.phase = 'INSURANCE';
      blackjackGame.statusBanner = 'Nhà Cái mở lá Át (A)! Bạn có muốn mua BẢO HIỂM (1 ăn 2) không?';
      renderBlackjackSideAndControls();
      return;
    }

    proceedAfterInsuranceCheck();
  }

  function resolveInsuranceChoice(buyIns) {
    if (blackjackGame.phase !== 'INSURANCE') return;
    if (buyIns) {
      const insCost = Math.floor(blackjackGame.mainBet * 0.5);
      if (insCost > 0 && spendChips(insCost, true)) {
        blackjackGame.insuranceBet = insCost;
        casinoSFX.playChipClink(2);
      }
    }
    proceedAfterInsuranceCheck();
  }

  function proceedAfterInsuranceCheck() {
    const hand = blackjackGame.hands[0];
    const pEval = evaluateBlackjackHand(hand.cards);
    const dEval = evaluateBlackjackHand(blackjackGame.dealerCards);

    if (dEval.isNaturalBJ) {
      // Reveal dealer Blackjack immediately
      blackjackGame.dealerCards[1].faceUp = true;
      blackjackGame.dealerCards[1].targetFlip = 1;
      casinoSFX.playCardFlip();
      if (blackjackGame.insuranceBet > 0) {
        const insReturn = blackjackGame.insuranceBet * 3;
        addChips(insReturn, 'blackjack_insurance');
        showCasinoToast(`🛡️ Bảo Hiểm thắng +${formatNum(insReturn)} Phỉnh!`, 'win');
      }
      settleAllBlackjackHands();
      return;
    }

    if (blackjackGame.insuranceBet > 0) {
      showCasinoToast('Nhà Cái không có Xì Dách. Tiền Bảo Hiểm thuộc về Nhà Cái.', 'gold', 2.0);
    }

    if (pEval.isNaturalBJ) {
      hand.status = 'BLACKJACK';
      blackjackGame.dealerCards[1].faceUp = true;
      blackjackGame.dealerCards[1].targetFlip = 1;
      settleAllBlackjackHands();
      return;
    }

    blackjackGame.phase = 'PLAYER_TURN';
    blackjackGame.statusBanner = 'Lượt của bạn: Chọn RÚT BÀI, DỪNG, GẤP ĐÔI hoặc TÁCH BÀI!';
    renderBlackjackSideAndControls();
  }

  function advanceBlackjackHandOrDealer() {
    for (let i = blackjackGame.activeHandIdx + 1; i < blackjackGame.hands.length; i++) {
      if (blackjackGame.hands[i].status === 'PLAYING') {
        blackjackGame.activeHandIdx = i;
        blackjackGame.statusBanner = `Đang chơi Tụ Bài #${i + 1}!`;
        renderBlackjackSideAndControls();
        return;
      }
    }

    // Check if any player hand still needs dealer comparison (not BUST)
    const anyLive = blackjackGame.hands.some((h) => h.status !== 'BUST' && h.status !== 'CHARLIE');
    blackjackGame.dealerCards[1].faceUp = true;
    blackjackGame.dealerCards[1].targetFlip = 1;
    casinoSFX.playCardFlip();

    if (!anyLive) {
      settleAllBlackjackHands();
      return;
    }

    blackjackGame.phase = 'DEALER_TURN';
    blackjackGame.dealerActionTimer = 0.55;
    blackjackGame.statusBanner = 'Lượt Nhà Cái rút bài (Rút dưới 17, Dừng từ 17)...';
    renderBlackjackSideAndControls();
  }

  function playerBlackjackHit() {
    if (blackjackGame.phase !== 'PLAYER_TURN') return;
    const hand = blackjackGame.hands[blackjackGame.activeHandIdx];
    if (!hand || hand.status !== 'PLAYING') return;

    hand.cards.push(drawFromBlackjackShoe(true));
    layoutBlackjackCards();

    const ev = evaluateBlackjackHand(hand.cards);
    if (ev.isBust) {
      hand.status = 'BUST';
      casinoSFX.playError();
      advanceBlackjackHandOrDealer();
    } else if (ev.isCharlie) {
      hand.status = 'CHARLIE';
      casinoSFX.playWinFanfare(0.95);
      showCasinoToast('🌟 NGŨ LINH 5 LÁ KHÔNG QUẮC (Ăn 2:1)!!', 'win', 3.0);
      advanceBlackjackHandOrDealer();
    } else if (ev.total === 21) {
      hand.status = 'STAND';
      advanceBlackjackHandOrDealer();
    } else {
      renderBlackjackSideAndControls();
    }
  }

  function playerBlackjackStand() {
    if (blackjackGame.phase !== 'PLAYER_TURN') return;
    const hand = blackjackGame.hands[blackjackGame.activeHandIdx];
    if (!hand) return;
    hand.status = 'STAND';
    casinoSFX.playChipClink(1);
    advanceBlackjackHandOrDealer();
  }

  function playerBlackjackDouble() {
    if (blackjackGame.phase !== 'PLAYER_TURN') return;
    const hand = blackjackGame.hands[blackjackGame.activeHandIdx];
    if (!hand || hand.cards.length !== 2) return;
    if (!spendChips(hand.bet, true)) return;

    hand.bet *= 2;
    const c = drawFromBlackjackShoe(true, 490, 312, 0.14);
    hand.cards.push(c);
    layoutBlackjackCards();

    const ev = evaluateBlackjackHand(hand.cards);
    hand.status = ev.isBust ? 'BUST' : 'DOUBLED';
    advanceBlackjackHandOrDealer();
  }

  function playerBlackjackSplit() {
    if (blackjackGame.phase !== 'PLAYER_TURN') return;
    if (blackjackGame.hands.length !== 1) return;
    const h0 = blackjackGame.hands[0];
    if (h0.cards.length !== 2) return;
    if (h0.cards[0].bjVal !== h0.cards[1].bjVal) return;
    if (!spendChips(h0.bet, true)) return;

    const secondCard = h0.cards.pop();
    const h1 = {
      cards: [secondCard],
      bet: h0.bet,
      status: 'PLAYING',
      isSplitHand: true,
      outcomeText: '',
      payout: 0
    };
    h0.isSplitHand = true;
    h0.cards.push(drawFromBlackjackShoe(true));
    h1.cards.push(drawFromBlackjackShoe(true));
    blackjackGame.hands = [h0, h1];
    blackjackGame.activeHandIdx = 0;
    layoutBlackjackCards();
    blackjackGame.statusBanner = 'Đã TÁCH ĐÔI thành 2 tụ bài! Đang chơi Tụ #1.';
    renderBlackjackSideAndControls();
  }

  function settleAllBlackjackHands() {
    blackjackGame.phase = 'RESULT';
    const dEval = evaluateBlackjackHand(blackjackGame.dealerCards);
    let grandReturn = 0;
    let totalMainWager = 0;

    for (let i = 0; i < blackjackGame.hands.length; i++) {
      const h = blackjackGame.hands[i];
      totalMainWager += h.bet;
      const pEval = evaluateBlackjackHand(h.cards);

      if (h.status === 'BUST') {
        h.outcomeText = `QUẮC (${pEval.total})`;
        h.payout = 0;
      } else if (h.status === 'CHARLIE') {
        h.outcomeText = `NGŨ LINH 2:1! (${pEval.total})`;
        h.payout = h.bet * 3;
      } else if (pEval.isNaturalBJ && !h.isSplitHand) {
        if (dEval.isNaturalBJ) {
          h.outcomeText = 'HÒA XÌ DÁCH';
          h.payout = h.bet;
        } else {
          h.outcomeText = 'XÌ DÁCH 3:2!';
          h.payout = Math.round(h.bet * 2.5);
        }
      } else if (dEval.isNaturalBJ) {
        h.outcomeText = 'THUA XÌ DÁCH CÁI';
        h.payout = 0;
      } else if (dEval.isBust) {
        h.outcomeText = `CÁI QUẮC • THẮNG!`;
        h.payout = h.bet * 2;
      } else if (pEval.total > dEval.total) {
        h.outcomeText = `THẮNG (${pEval.total} > ${dEval.total})`;
        h.payout = h.bet * 2;
      } else if (pEval.total === dEval.total) {
        h.outcomeText = `HÒA (${pEval.total})`;
        h.payout = h.bet;
      } else {
        h.outcomeText = `THUA (${pEval.total} < ${dEval.total})`;
        h.payout = 0;
      }
      grandReturn += h.payout;
    }

    state.stats.roundsPlayed++;
    state.stats.blackjackPlayed++;

    if (grandReturn > totalMainWager) {
      addChips(grandReturn, 'blackjack_win');
      casinoSFX.playWinFanfare(0.9);
      spawnCanvasCoins(490, 310, 32, 1.0);
      spawnFloatingCallout(490, 235, `+${formatNum(grandReturn)} PHỈNH!`, '#fde047', 26);
      blackjackGame.statusBanner = `🎉 Xuất sắc! Bạn nhận về tổng cộng +${formatNum(grandReturn)} Phỉnh!`;
    } else if (grandReturn > 0) {
      addChips(grandReturn, 'refund');
      casinoSFX.playChipClink(2);
      blackjackGame.statusBanner = `Ván bài Hòa / Hoàn trả ${formatNum(grandReturn)} Phỉnh.`;
    } else {
      blackjackGame.statusBanner = `Nhà Cái (${dEval.total} điểm) thắng ván này. Nhấn CHIA LẠI để phục thù!`;
    }

    saveCasinoState();
    renderBlackjackSideAndControls();
  }

  function updateBlackjack(dt) {
    // Animate sliding & flipping cards
    const allCards = [...blackjackGame.dealerCards];
    for (let h = 0; h < blackjackGame.hands.length; h++) {
      allCards.push(...blackjackGame.hands[h].cards);
    }
    for (let i = 0; i < allCards.length; i++) {
      const c = allCards[i];
      c.x = lerp(c.x, c.tx, Math.min(1, dt * 11));
      c.y = lerp(c.y, c.ty, Math.min(1, dt * 11));
      c.flip = lerp(c.flip, c.targetFlip, Math.min(1, dt * 9));
    }

    if (blackjackGame.phase === 'DEALER_TURN') {
      blackjackGame.dealerActionTimer -= dt;
      if (blackjackGame.dealerActionTimer <= 0) {
        const dEval = evaluateBlackjackHand(blackjackGame.dealerCards);
        if (dEval.total < 17) {
          blackjackGame.dealerCards.push(drawFromBlackjackShoe(true));
          layoutBlackjackCards();
          blackjackGame.dealerActionTimer = 0.62;
        } else {
          settleAllBlackjackHands();
        }
      }
    }
  }

  function drawBlackjackCanvas(g, w, h, dt) {
    drawLuxuryFeltBackground(
      g,
      w,
      h,
      '#0b4228',
      'ROYAL BLACKJACK 21 • XÌ DÁCH HOÀNG GIA',
      blackjackGame.statusBanner
    );

    // Curved Royal Brass Table Arc
    g.save();
    g.strokeStyle = 'rgba(250, 204, 21, 0.28)';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(w * 0.5, -140, 520, Math.PI * 0.22, Math.PI * 0.78);
    g.stroke();

    g.fillStyle = 'rgba(253, 224, 71, 0.22)';
    g.font = '800 13px "Segoe UI", sans-serif';
    g.textAlign = 'center';
    g.fillText('XÌ DÁCH TRẢ 3:2  •  NGŨ LINH 5 LÁ TRẢ 2:1  •  NHÀ CÁI DỪNG Ở 17  •  BẢO HIỂM TRẢ 2:1', w * 0.5, 228);

    // 6-Deck Acrylic Card Shoe at top-right
    roundRectPath(g, 830, 56, 86, 62, 8);
    g.fillStyle = 'rgba(15, 23, 42, 0.75)';
    g.fill();
    g.strokeStyle = '#eab308';
    g.lineWidth = 1.5;
    g.stroke();
    g.fillStyle = '#fde047';
    g.font = '700 10.5px sans-serif';
    g.fillText(`HỘP 6 BỘ BÀI`, 873, 76);
    g.fillStyle = '#e2e8f0';
    g.fillText(`Còn ${blackjackGame.shoe.length} lá`, 873, 96);
    g.restore();

    // Draw Betting Circles
    for (let i = 0; i < blackjackGame.betCircles.length; i++) {
      const bc = blackjackGame.betCircles[i];
      const isHov = blackjackGame.hoverSpot === bc.id;
      const amt =
        bc.id === 'MAIN'
          ? blackjackGame.mainBet
          : bc.id === 'PERFECT_PAIR'
            ? blackjackGame.sidePerfectPair
            : blackjackGame.side21Plus3;

      g.save();
      g.beginPath();
      g.arc(bc.x, bc.y, bc.r, 0, Math.PI * 2);
      g.fillStyle = isHov ? 'rgba(250, 204, 21, 0.18)' : 'rgba(0, 0, 0, 0.28)';
      g.fill();
      g.lineWidth = isHov ? 2.8 : 1.8;
      g.strokeStyle = isHov ? '#ffffff' : '#facc15';
      g.stroke();

      g.textAlign = 'center';
      g.fillStyle = '#fde047';
      g.font = '800 10.5px "Segoe UI", sans-serif';
      g.fillText(bc.label, bc.x, bc.y + bc.r + 16);
      g.fillStyle = '#cbd5e1';
      g.font = '600 10px "Segoe UI", sans-serif';
      g.fillText(bc.sub, bc.x, bc.y + bc.r + 30);

      if (amt > 0) {
        drawChipStack(g, bc.x, bc.y + 4, amt, 14.5, 6);
      }
      g.restore();
    }

    // Draw Dealer Cards & Score Badge
    if (blackjackGame.dealerCards.length > 0) {
      for (let i = 0; i < blackjackGame.dealerCards.length; i++) {
        const c = blackjackGame.dealerCards[i];
        drawPlayingCard(g, c, c.x, c.y, 68, 96, { flip: c.flip });
      }
      const visibleCards = blackjackGame.dealerCards.filter((c) => c.targetFlip > 0.5);
      const dEv = evaluateBlackjackHand(visibleCards);
      const badgeX = 490;
      const badgeY = 196;
      g.save();
      roundRectPath(g, badgeX - 58, badgeY - 12, 116, 24, 12);
      g.fillStyle = 'rgba(15, 23, 42, 0.9)';
      g.fill();
      g.strokeStyle = '#facc15';
      g.lineWidth = 1.2;
      g.stroke();
      g.fillStyle = '#fef08a';
      g.font = '800 12px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(
        `NHÀ CÁI: ${dEv.total}${blackjackGame.dealerCards.length > visibleCards.length ? ' + ?' : ''}`,
        badgeX,
        badgeY
      );
      g.restore();
    }

    // Draw Player Hands
    for (let h = 0; h < blackjackGame.hands.length; h++) {
      const hand = blackjackGame.hands[h];
      const isActive = blackjackGame.phase === 'PLAYER_TURN' && blackjackGame.activeHandIdx === h;
      const centerX = blackjackGame.hands.length === 1 ? 490 : h === 0 ? 320 : 660;

      if (isActive) {
        g.save();
        g.strokeStyle = '#fde047';
        g.lineWidth = 2.5;
        g.setLineDash([6, 4]);
        roundRectPath(g, centerX - 115, 250, 230, 124, 14);
        g.stroke();
        g.restore();
      }

      for (let i = 0; i < hand.cards.length; i++) {
        const c = hand.cards[i];
        drawPlayingCard(g, c, c.x, c.y, 68, 96, {
          flip: c.flip,
          angle: c.angle || 0,
          highlight: isActive && i === hand.cards.length - 1
        });
      }

      const ev = evaluateBlackjackHand(hand.cards);
      const labelTxt = hand.outcomeText
        ? `${hand.outcomeText} • Cược ${formatNum(hand.bet)}`
        : `ĐIỂM: ${ev.total}${ev.isSoft && ev.total <= 21 ? ' (Mềm)' : ''} • Cược ${formatNum(hand.bet)}`;

      g.save();
      roundRectPath(g, centerX - 108, 366, 216, 24, 12);
      g.fillStyle = hand.payout > hand.bet ? 'rgba(22, 101, 52, 0.92)' : ev.isBust ? 'rgba(127, 29, 29, 0.92)' : 'rgba(15, 23, 42, 0.9)';
      g.fill();
      g.strokeStyle = isActive ? '#fde047' : 'rgba(255,255,255,0.35)';
      g.lineWidth = 1.3;
      g.stroke();
      g.fillStyle = '#ffffff';
      g.font = '800 11.5px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(labelTxt, centerX, 378);
      g.restore();
    }

    updateAndDrawCanvasFX(g, dt);
  }

  function renderBlackjackSideAndControls() {
    if (!dom.sidePanel || !dom.actionBar || state.activeStation !== 'blackjack') return;
    const totalStaged = blackjackGame.mainBet + blackjackGame.sidePerfectPair + blackjackGame.side21Plus3;

    dom.sidePanel.innerHTML = `
      <div class="dc-side-box">
        <h4>🂡 Thiết Lập Cược Xì Dách</h4>
        <div style="font-size:12.5px;line-height:1.65;">
          <div>Cược Chính: <strong style="color:#fde047;">${formatNum(blackjackGame.mainBet)} Phỉnh</strong></div>
          <div>Đôi Hoàn Hảo: <strong style="color:#93c5fd;">${formatNum(blackjackGame.sidePerfectPair)} Phỉnh</strong></div>
          <div>Poker 21+3: <strong style="color:#d8b4fe;">${formatNum(blackjackGame.side21Plus3)} Phỉnh</strong></div>
          <div>Tổng mỗi ván: <strong style="color:#4ade80;">${formatNum(totalStaged)} Phỉnh</strong></div>
        </div>
      </div>
      <div class="dc-side-box">
        <h4>👑 Quy Tắc Hoàng Gia</h4>
        <div style="font-size:11.5px;color:#cbd5e1;line-height:1.55;">
          • <strong>Xì Dách Tự Nhiên (A + 10/J/Q/K)</strong>: Trả <strong>3:2</strong><br/>
          • <strong>Ngũ Linh (5 lá &le; 21 điểm)</strong>: Thắng ngay <strong>2:1</strong>!<br/>
          • <strong>Gấp Đôi (Double)</strong>: Nhân đôi cược, rút duy nhất 1 lá<br/>
          • <strong>Tách Bài (Split)</strong>: Tách 2 lá bằng điểm thành 2 tụ độc lập<br/>
          • <strong>Cược Phụ 21+3</strong>: Ghép 2 lá bạn + 1 lá ngửa Cái (Sảnh 10:1, Thùng 5:1, Sám 30:1, Thùng Phá Sảnh 40:1)
        </div>
      </div>
    `;

    const ph = blackjackGame.phase;
    if (ph === 'BETTING' || ph === 'RESULT') {
      dom.actionBar.innerHTML = `
        <button type="button" class="dc-btn" id="dc-bj-clear">Đặt Lại 0</button>
        <button type="button" class="dc-btn" id="dc-bj-min">Cược 100</button>
        <button type="button" class="dc-btn" id="dc-bj-2x">Nhân Đôi Cược 2x</button>
        <button type="button" class="dc-btn gold" id="dc-bj-deal">🂡 CHIA BÀI (${formatNum(totalStaged)} Phỉnh)</button>
      `;
      dom.actionBar.querySelector('#dc-bj-clear')?.addEventListener('click', () => resetBlackjackToBetting(true));
      dom.actionBar.querySelector('#dc-bj-min')?.addEventListener('click', () => {
        blackjackGame.mainBet = 100;
        blackjackGame.sidePerfectPair = 0;
        blackjackGame.side21Plus3 = 0;
        casinoSFX.playChipClink(1);
        renderBlackjackSideAndControls();
      });
      dom.actionBar.querySelector('#dc-bj-2x')?.addEventListener('click', () => {
        blackjackGame.mainBet = clamp(blackjackGame.mainBet * 2 || 200, 25, 50000);
        casinoSFX.playChipClink(2);
        renderBlackjackSideAndControls();
      });
      dom.actionBar.querySelector('#dc-bj-deal')?.addEventListener('click', startBlackjackDeal);
    } else if (ph === 'INSURANCE') {
      const insAmt = Math.floor(blackjackGame.mainBet * 0.5);
      dom.actionBar.innerHTML = `
        <button type="button" class="dc-btn emerald" id="dc-bj-ins-yes">🛡️ Mua Bảo Hiểm (${formatNum(insAmt)} Phỉnh)</button>
        <button type="button" class="dc-btn crimson" id="dc-bj-ins-no">Không Bảo Hiểm • Chơi Tiếp</button>
      `;
      dom.actionBar.querySelector('#dc-bj-ins-yes')?.addEventListener('click', () => resolveInsuranceChoice(true));
      dom.actionBar.querySelector('#dc-bj-ins-no')?.addEventListener('click', () => resolveInsuranceChoice(false));
    } else if (ph === 'PLAYER_TURN') {
      const curHand = blackjackGame.hands[blackjackGame.activeHandIdx];
      const canDouble = curHand && curHand.cards.length === 2 && state.chips >= curHand.bet;
      const canSplit =
        blackjackGame.hands.length === 1 &&
        curHand &&
        curHand.cards.length === 2 &&
        curHand.cards[0].bjVal === curHand.cards[1].bjVal &&
        state.chips >= curHand.bet;

      dom.actionBar.innerHTML = `
        <button type="button" class="dc-btn gold" id="dc-bj-hit">➕ RÚT BÀI (Hit)</button>
        <button type="button" class="dc-btn crimson" id="dc-bj-stand">✋ DỪNG (Stand)</button>
        <button type="button" class="dc-btn emerald" id="dc-bj-double" ${!canDouble ? 'disabled' : ''}>⚡ GẤP ĐÔI (Double)</button>
        <button type="button" class="dc-btn purple" id="dc-bj-split" ${!canSplit ? 'disabled' : ''}>✂️ TÁCH ĐÔI (Split)</button>
      `;
      dom.actionBar.querySelector('#dc-bj-hit')?.addEventListener('click', playerBlackjackHit);
      dom.actionBar.querySelector('#dc-bj-stand')?.addEventListener('click', playerBlackjackStand);
      dom.actionBar.querySelector('#dc-bj-double')?.addEventListener('click', playerBlackjackDouble);
      dom.actionBar.querySelector('#dc-bj-split')?.addEventListener('click', playerBlackjackSplit);
    } else {
      dom.actionBar.innerHTML = `<button type="button" class="dc-btn gold" disabled>🂠 Nhà Cái đang rút bài...</button>`;
    }
  }

  // ============================================================================
  // SECTION 8: STATION 6 — TEXAS HOLD'EM POKER VIP (PLAYER VS 4 AI HIGH-ROLLERS)
  // ============================================================================
  const POKER_HAND_NAMES_VN = [
    'Mậu Thầu',
    'Một Đôi',
    'Thú (Hai Đôi)',
    'Sám Cô',
    'Sảnh',
    'Thùng',
    'Cù Lũ',
    'Tứ Quý',
    'Thùng Phá Sảnh',
    'Thùng Phá Sảnh Hoàng Gia'
  ];

  const POKER_AI_PROFILES = [
    {
      id: 'hai_cang',
      name: 'Ông Trùm Hải Cảng',
      avatar: '🕶️',
      aggression: 0.78,
      tightness: 0.42,
      bluffFreq: 0.28,
      baseStack: 35000,
      quotesRaise: [
        'Tố thêm cho nóng mặt bàn! Ai yếu tim thì úp bài đi!',
        'Cửa này của anh rồi cưng, theo nổi không?',
        'Đẩy phỉnh lên! Đỏ đen là phải bản lĩnh!'
      ],
      quotesCall: ['Theo nhẹ xem bài chung ra gì nào.', 'Chưa sợ đâu, theo luôn!', 'Để xem cậu giấu bài gì.'],
      quotesFold: ['Bài xấu như ma, nhường ván này!', 'Thôi bỏ, giữ vốn ván sau phục thù.'],
      quotesWin: ['Haha! Đọc vị hết cả bàn rồi nhé!', 'Phỉnh về tay Ông Trùm là chuẩn bài!']
    },
    {
      id: 'lan_khue',
      name: 'Nữ Hoàng Lan Khuê',
      avatar: '💃',
      aggression: 0.64,
      tightness: 0.68,
      bluffFreq: 0.14,
      baseStack: 42000,
      quotesRaise: [
        'Chị ít khi tố, mà đã tố là có hàng thật đấy nhé!',
        'Nâng nhẹ mức cược thử lòng các quý ông.',
        'Muốn xem lá tiếp theo thì chồng thêm phỉnh đi cưng.'
      ],
      quotesCall: ['Chị theo nhé, bài đang rất có duyên.', 'Theo xem vòng sau thế nào.'],
      quotesFold: ['Không đúng chuẩn bài đẹp của chị, bỏ nhé.', 'Tạm lui một bước thôi.'],
      quotesWin: ['Cảm ơn các anh đại gia đã tài trợ phấn son nhé!', 'Sắc sảo hơn may mắn!']
    },
    {
      id: 'bao_hoang',
      name: 'Thiếu Gia Bảo Hoàng',
      avatar: '🥂',
      aggression: 0.86,
      tightness: 0.25,
      bluffFreq: 0.36,
      baseStack: 55000,
      quotesRaise: [
        'Tiền nhiều để làm gì?! Tố mạnh tay lên anh em!',
        'Phỉnh với thiếu gia chỉ là con số thôi!',
        'Chơi tới bến luôn, sợ gì vết bẩn!'
      ],
      quotesCall: ['Rẻ quá, theo liền tay!', 'Có mặt thiếu gia ngay!'],
      quotesFold: ['Bài tịt ngòi rồi, nhịn một nhịp!', 'Ủa sao chia bài kỳ vậy Dealer? Bỏ!'],
      quotesWin: ['Quá dễ cho đội thiếu gia! Mở sâm panh ăn mừng!', 'Haha bluff nhẹ mà cũng ăn kìa!']
    },
    {
      id: 'giao_su_kien',
      name: 'Giáo Sư Toán Học Kiên',
      avatar: '🧐',
      aggression: 0.54,
      tightness: 0.72,
      bluffFreq: 0.09,
      baseStack: 32000,
      quotesRaise: [
        'Kỳ vọng toán học EV dương rõ rệt — tôi Tố!',
        'Xác suất thắng vượt ngưỡng 68%, tăng cược hợp lý.',
        'Định lý Bayes chỉ ra bạn đang cầm bài yếu.'
      ],
      quotesCall: ['Pot odds đang rất tốt, tôi Theo.', 'Tỷ lệ rủi ro chấp nhận được.'],
      quotesFold: ['Xác suất dưới 16%, bỏ bài là tối ưu.', 'Không đáng mạo hiểm phỉnh ở nhịp này.'],
      quotesWin: ['Toán học không bao giờ nói dối!', 'Chuẩn xác từng phần trăm xác suất!']
    }
  ];

  // Evaluate exact 5-card poker hand
  function scoreFiveCards(c0, c1, c2, c3, c4) {
    const hand = [c0, c1, c2, c3, c4].sort((a, b) => b.val - a.val);
    const v0 = hand[0].val;
    const v1 = hand[1].val;
    const v2 = hand[2].val;
    const v3 = hand[3].val;
    const v4 = hand[4].val;

    const isFlush =
      hand[0].suit === hand[1].suit &&
      hand[1].suit === hand[2].suit &&
      hand[2].suit === hand[3].suit &&
      hand[3].suit === hand[4].suit;

    let isStraight = false;
    let straightHigh = v0;
    if (v0 - v1 === 1 && v1 - v2 === 1 && v2 - v3 === 1 && v3 - v4 === 1) {
      isStraight = true;
      straightHigh = v0;
    } else if (v0 === 14 && v1 === 5 && v2 === 4 && v3 === 3 && v4 === 2) {
      // Wheel straight A-2-3-4-5
      isStraight = true;
      straightHigh = 5;
    }

    if (isFlush && isStraight) {
      const cat = straightHigh === 14 ? 9 : 8;
      return { category: cat, score: cat * 1e7 + straightHigh };
    }

    // Count rank frequencies
    const freqMap = new Map();
    for (let i = 0; i < 5; i++) {
      freqMap.set(hand[i].val, (freqMap.get(hand[i].val) || 0) + 1);
    }
    const groups = Array.from(freqMap.entries()).sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : b[0] - a[0]));

    // Base-15 tie-breaker encoding
    const encodeVals = (arr) => {
      let s = 0;
      for (let i = 0; i < arr.length; i++) s = s * 15 + arr[i];
      return s;
    };

    if (groups[0][1] === 4) {
      return { category: 7, score: 7 * 1e7 + encodeVals([groups[0][0], groups[1][0]]) };
    }
    if (groups[0][1] === 3 && groups[1][1] === 2) {
      return { category: 6, score: 6 * 1e7 + encodeVals([groups[0][0], groups[1][0]]) };
    }
    if (isFlush) {
      return { category: 5, score: 5 * 1e7 + encodeVals([v0, v1, v2, v3, v4]) };
    }
    if (isStraight) {
      return { category: 4, score: 4 * 1e7 + straightHigh };
    }
    if (groups[0][1] === 3) {
      return { category: 3, score: 3 * 1e7 + encodeVals([groups[0][0], groups[1][0], groups[2][0]]) };
    }
    if (groups[0][1] === 2 && groups[1][1] === 2) {
      return { category: 2, score: 2 * 1e7 + encodeVals([groups[0][0], groups[1][0], groups[2][0]]) };
    }
    if (groups[0][1] === 2) {
      return {
        category: 1,
        score: 1 * 1e7 + encodeVals([groups[0][0], groups[1][0], groups[2][0], groups[3][0]])
      };
    }
    return { category: 0, score: encodeVals([v0, v1, v2, v3, v4]) };
  }

  function evaluateBestHoldemHand(cards) {
    const n = cards.length;
    if (n < 5) {
      if (n === 2) {
        const pair = cards[0].val === cards[1].val;
        return {
          category: pair ? 1 : 0,
          score: pair ? 1e7 + cards[0].val : Math.max(cards[0].val, cards[1].val),
          rankNameVN: pair ? `Đôi ${cards[0].rank}` : `Bài Tẩy ${cards[0].rank}-${cards[1].rank}`,
          best5Codes: new Set(cards.map((c) => c.code))
        };
      }
      return { category: 0, score: 0, rankNameVN: 'Đang Chia', best5Codes: new Set() };
    }

    let best = null;
    let bestCombo = null;
    for (let a = 0; a < n - 4; a++) {
      for (let b = a + 1; b < n - 3; b++) {
        for (let c = b + 1; c < n - 2; c++) {
          for (let d = c + 1; d < n - 1; d++) {
            for (let e = d + 1; e < n; e++) {
              const res = scoreFiveCards(cards[a], cards[b], cards[c], cards[d], cards[e]);
              if (!best || res.score > best.score) {
                best = res;
                bestCombo = [cards[a], cards[b], cards[c], cards[d], cards[e]];
              }
            }
          }
        }
      }
    }

    return {
      category: best.category,
      score: best.score,
      rankNameVN: POKER_HAND_NAMES_VN[best.category] || 'Mậu Thầu',
      best5Codes: new Set(bestCombo ? bestCombo.map((card) => card.code) : [])
    };
  }

  function estimatePreflopStrength(c1, c2) {
    if (!c1 || !c2) return 0.3;
    const hi = Math.max(c1.val, c2.val);
    const lo = Math.min(c1.val, c2.val);
    const suited = c1.suit === c2.suit;
    if (hi === lo) {
      return clamp(0.54 + ((hi - 2) / 12) * 0.44, 0.54, 0.98);
    }
    const gap = hi - lo;
    let score = (hi + lo * 0.65) / 24;
    if (suited) score += 0.08;
    if (gap === 1) score += 0.06;
    else if (gap >= 4) score -= 0.06;
    return clamp(score, 0.12, 0.92);
  }

  const pokerGame = {
    phase: 'IDLE', // 'IDLE' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN'
    smallBlind: 50,
    bigBlind: 100,
    dealerIdx: 0,
    turnIdx: 0,
    pot: 0,
    currentBet: 0,
    minRaise: 100,
    deck: [],
    community: [],
    seats: [],
    aiThinkTimer: 0,
    raiseSliderVal: 200,
    winningCodes: new Set(),
    bannerText: 'Nhấn BẮT ĐẦU VÁN POKER để ngồi vào bàn VIP cùng 4 cao thủ!'
  };

  function initPokerSeatsIfNeeded() {
    if (pokerGame.seats.length === 5) {
      pokerGame.seats[0].stack = state.chips;
      return;
    }
    const seatCoords = [
      { x: 490, y: 446 }, // Seat 0: Player
      { x: 148, y: 368 }, // Seat 1: Ông Trùm Hải Cảng
      { x: 196, y: 126 }, // Seat 2: Nữ Hoàng Lan Khuê
      { x: 784, y: 126 }, // Seat 3: Thiếu Gia Bảo Hoàng
      { x: 832, y: 368 }  // Seat 4: Giáo Sư Toán Học Kiên
    ];

    pokerGame.seats = [
      {
        idx: 0,
        isPlayer: true,
        name: 'BẠN (VIP)',
        avatar: '👑',
        stack: state.chips,
        hole: [],
        streetBet: 0,
        totalContributed: 0,
        folded: false,
        allIn: false,
        acted: false,
        lastAction: '',
        speech: '',
        speechTimer: 0,
        isWinner: false,
        ...seatCoords[0]
      }
    ];

    for (let i = 0; i < 4; i++) {
      const prof = POKER_AI_PROFILES[i];
      pokerGame.seats.push({
        idx: i + 1,
        isPlayer: false,
        profile: prof,
        name: prof.name,
        avatar: prof.avatar,
        stack: prof.baseStack,
        hole: [],
        streetBet: 0,
        totalContributed: 0,
        folded: false,
        allIn: false,
        acted: false,
        lastAction: '',
        speech: '',
        speechTimer: 0,
        isWinner: false,
        ...seatCoords[i + 1]
      });
    }
  }

  function syncPlayerPokerStackToWallet() {
    if (pokerGame.seats[0]) {
      state.chips = Math.max(0, Math.round(pokerGame.seats[0].stack));
      saveCasinoState();
      refreshHeaderHUD();
    }
  }

  function postPokerChipsFromSeat(seat, amount) {
    const actual = Math.min(seat.stack, Math.max(0, Math.round(amount)));
    seat.stack -= actual;
    seat.streetBet += actual;
    seat.totalContributed += actual;
    pokerGame.pot += actual;
    if (seat.stack === 0 && actual > 0) {
      seat.allIn = true;
    }
    if (seat.isPlayer) {
      state.stats.totalWagered += actual;
      awardVipPoints(actual);
      syncPlayerPokerStackToWallet();
    }
    return actual;
  }

  function setSeatSpeech(seat, msg) {
    seat.speech = msg;
    seat.speechTimer = 4.2;
  }

  function startNewPokerHand() {
    initPokerSeatsIfNeeded();
    pokerGame.seats[0].stack = state.chips;

    if (pokerGame.seats[0].stack < pokerGame.bigBlind) {
      showCasinoToast(`Cần tối thiểu ${formatNum(pokerGame.bigBlind)} Phỉnh để vào ván Poker!`, 'error');
      casinoSFX.playError();
      return;
    }

    // Rebuy busted AI high-rollers automatically
    for (let i = 1; i < 5; i++) {
      const s = pokerGame.seats[i];
      if (s.stack < pokerGame.bigBlind * 4) {
        s.stack = s.profile.baseStack;
        setSeatSpeech(s, 'Mới đổi thêm vali phỉnh mới, chiến tiếp anh em!');
      }
    }

    pokerGame.deck = createDeck(1);
    pokerGame.community = [];
    pokerGame.pot = 0;
    pokerGame.winningCodes.clear();
    pokerGame.dealerIdx = (pokerGame.dealerIdx + 1) % 5;

    for (let i = 0; i < 5; i++) {
      const s = pokerGame.seats[i];
      s.hole = [pokerGame.deck.pop(), pokerGame.deck.pop()];
      s.streetBet = 0;
      s.totalContributed = 0;
      s.folded = false;
      s.allIn = false;
      s.acted = false;
      s.lastAction = '';
      s.isWinner = false;
    }

    casinoSFX.playCardRiffle();

    const sbIdx = (pokerGame.dealerIdx + 1) % 5;
    const bbIdx = (pokerGame.dealerIdx + 2) % 5;
    postPokerChipsFromSeat(pokerGame.seats[sbIdx], pokerGame.smallBlind);
    pokerGame.seats[sbIdx].lastAction = `SB ${pokerGame.smallBlind}`;
    postPokerChipsFromSeat(pokerGame.seats[bbIdx], pokerGame.bigBlind);
    pokerGame.seats[bbIdx].lastAction = `BB ${pokerGame.bigBlind}`;

    pokerGame.currentBet = pokerGame.bigBlind;
    pokerGame.minRaise = pokerGame.bigBlind;
    pokerGame.streetRaises = 0;
    pokerGame.phase = 'PREFLOP';
    pokerGame.turnIdx = (bbIdx + 1) % 5;
    pokerGame.aiThinkTimer = 0.65;
    pokerGame.raiseSliderVal = pokerGame.bigBlind * 2;
    pokerGame.bannerText = 'Vòng Pre-Flop: Đấu trí bài tẩy!';

    advanceToNextValidPokerActor(true);
    renderPokerSideAndControls();
  }

  function countActiveUnfoldedSeats() {
    return pokerGame.seats.filter((s) => !s.folded).length;
  }

  function countCanActSeats() {
    return pokerGame.seats.filter((s) => !s.folded && !s.allIn).length;
  }

  function isPokerBettingRoundComplete() {
    for (let i = 0; i < 5; i++) {
      const s = pokerGame.seats[i];
      if (s.folded || s.allIn) continue;
      if (!s.acted || s.streetBet < pokerGame.currentBet) return false;
    }
    return true;
  }

  function advanceToNextValidPokerActor(keepCurrentIfValid = false) {
    if (countActiveUnfoldedSeats() <= 1) {
      finishPokerByEveryoneFolding();
      return;
    }
    if (isPokerBettingRoundComplete() || countCanActSeats() === 0) {
      advancePokerStreet();
      return;
    }

    for (let step = 0; step < 5; step++) {
      const idx = keepCurrentIfValid && step === 0 ? pokerGame.turnIdx : (pokerGame.turnIdx + 1) % 5;
      pokerGame.turnIdx = idx;
      const seat = pokerGame.seats[idx];
      if (!seat.folded && !seat.allIn) {
        pokerGame.aiThinkTimer = 0.62;
        if (seat.isPlayer) {
          const minTotal = Math.min(
            seat.stack + seat.streetBet,
            Math.max(pokerGame.currentBet + pokerGame.minRaise, pokerGame.bigBlind * 2)
          );
          pokerGame.raiseSliderVal = minTotal;
          pokerGame.bannerText = `Đến lượt BẠN hành động! (Cần Theo: ${formatNum(Math.max(0, pokerGame.currentBet - seat.streetBet))})`;
        } else {
          pokerGame.bannerText = `${seat.name} đang suy tính...`;
        }
        renderPokerSideAndControls();
        return;
      }
    }

    advancePokerStreet();
  }

  function advancePokerStreet() {
    for (let i = 0; i < 5; i++) {
      pokerGame.seats[i].streetBet = 0;
      pokerGame.seats[i].acted = false;
      if (!pokerGame.seats[i].folded && !pokerGame.seats[i].allIn) {
        pokerGame.seats[i].lastAction = '';
      }
    }
    pokerGame.currentBet = 0;
    pokerGame.minRaise = pokerGame.bigBlind;
    pokerGame.streetRaises = 0;

    if (pokerGame.phase === 'PREFLOP') {
      pokerGame.phase = 'FLOP';
      pokerGame.community.push(pokerGame.deck.pop(), pokerGame.deck.pop(), pokerGame.deck.pop());
      casinoSFX.playCardFlip();
      pokerGame.bannerText = 'Vòng FLOP — 3 lá bài chung đầu tiên được lật!';
    } else if (pokerGame.phase === 'FLOP') {
      pokerGame.phase = 'TURN';
      pokerGame.community.push(pokerGame.deck.pop());
      casinoSFX.playCardFlip();
      pokerGame.bannerText = 'Vòng TURN — Lá bài chung thứ 4!';
    } else if (pokerGame.phase === 'TURN') {
      pokerGame.phase = 'RIVER';
      pokerGame.community.push(pokerGame.deck.pop());
      casinoSFX.playCardFlip();
      pokerGame.bannerText = 'Vòng RIVER — Lá bài chung cuối cùng quyết định!';
    } else {
      resolvePokerShowdown();
      return;
    }

    // If <= 1 player can still make betting decisions (e.g. All-In runout), deal remaining community cards straight to Showdown!
    if (countCanActSeats() <= 1) {
      while (pokerGame.community.length < 5) {
        pokerGame.community.push(pokerGame.deck.pop());
      }
      resolvePokerShowdown();
      return;
    }

    pokerGame.turnIdx = (pokerGame.dealerIdx + 1) % 5;
    advanceToNextValidPokerActor(true);
  }

  function executePokerSeatAction(seat, action, raiseToTotal = 0) {
    if (
      !seat ||
      seat.folded ||
      seat.allIn ||
      seat.idx !== pokerGame.turnIdx ||
      pokerGame.phase === 'IDLE' ||
      pokerGame.phase === 'SHOWDOWN'
    ) {
      return;
    }
    const toCall = Math.max(0, pokerGame.currentBet - seat.streetBet);

    if (action === 'FOLD') {
      seat.folded = true;
      seat.acted = true;
      seat.lastAction = 'Bỏ Bài';
      casinoSFX.playCardDeal();
      if (!seat.isPlayer) setSeatSpeech(seat, pickRandom(seat.profile.quotesFold));
    } else if (action === 'CHECK') {
      seat.acted = true;
      seat.lastAction = 'Xem';
      casinoSFX.playChipClink(1);
    } else if (action === 'CALL') {
      const paid = postPokerChipsFromSeat(seat, toCall);
      seat.acted = true;
      seat.lastAction = seat.allIn ? 'ALL-IN!' : `Theo ${formatNum(paid)}`;
      casinoSFX.playChipClink(2);
      if (!seat.isPlayer && Math.random() < 0.65) setSeatSpeech(seat, pickRandom(seat.profile.quotesCall));
    } else if (action === 'RAISE') {
      const desiredTotal = Math.min(seat.stack + seat.streetBet, Math.max(pokerGame.currentBet + pokerGame.minRaise, raiseToTotal));
      const diff = Math.max(0, desiredTotal - seat.streetBet);
      postPokerChipsFromSeat(seat, diff);
      if (seat.streetBet > pokerGame.currentBet) {
        pokerGame.streetRaises = (pokerGame.streetRaises || 0) + 1;
        pokerGame.minRaise = Math.max(pokerGame.minRaise, seat.streetBet - pokerGame.currentBet);
        pokerGame.currentBet = seat.streetBet;
        for (let i = 0; i < 5; i++) {
          if (i !== seat.idx && !pokerGame.seats[i].folded && !pokerGame.seats[i].allIn) {
            pokerGame.seats[i].acted = false;
          }
        }
      }
      seat.acted = true;
      seat.lastAction = seat.allIn ? `ALL-IN ${formatNum(seat.streetBet)}!` : `Tố ${formatNum(seat.streetBet)}`;
      casinoSFX.playChipSweep();
      if (!seat.isPlayer) setSeatSpeech(seat, pickRandom(seat.profile.quotesRaise));
    }

    advanceToNextValidPokerActor(false);
  }

  function performAIPokerTurn(seat) {
    const prof = seat.profile;
    const toCall = Math.max(0, pokerGame.currentBet - seat.streetBet);

    let handStrength = 0.4;
    if (pokerGame.community.length === 0) {
      handStrength = estimatePreflopStrength(seat.hole[0], seat.hole[1]);
    } else {
      const ev = evaluateBestHoldemHand([...seat.hole, ...pokerGame.community]);
      // Map category 0..9 into 0.22..0.99
      handStrength = clamp(0.24 + ev.category * 0.13 + (ev.category === 0 ? 0.05 : 0.12), 0.15, 0.99);
    }

    const potOdds = toCall / Math.max(1, pokerGame.pot + toCall);
    const bluffRoll = Math.random() < prof.bluffFreq;

    if (toCall === 0) {
      if ((handStrength > 0.62 && Math.random() < prof.aggression) || bluffRoll) {
        const betAmt = Math.max(pokerGame.bigBlind, Math.round(pokerGame.pot * randFloat(0.45, 0.85)));
        executePokerSeatAction(seat, 'RAISE', betAmt);
      } else {
        executePokerSeatAction(seat, 'CHECK');
      }
      return;
    }

    // Facing a bet
    if (handStrength < potOdds * (0.75 + prof.tightness * 0.65) && !bluffRoll && toCall > pokerGame.bigBlind) {
      executePokerSeatAction(seat, 'FOLD');
    } else if (
      (pokerGame.streetRaises || 0) < 2 &&
      (handStrength > 0.76 || (bluffRoll && toCall < seat.stack * 0.3)) &&
      seat.stack > toCall + pokerGame.minRaise &&
      Math.random() < prof.aggression * 0.65
    ) {
      const raiseTarget = pokerGame.currentBet + Math.max(pokerGame.minRaise, Math.round(pokerGame.pot * 0.6));
      executePokerSeatAction(seat, 'RAISE', raiseTarget);
    } else {
      executePokerSeatAction(seat, 'CALL');
    }
  }

  function finishPokerByEveryoneFolding() {
    pokerGame.phase = 'SHOWDOWN';
    const winner = pokerGame.seats.find((s) => !s.folded) || pokerGame.seats[0];
    winner.isWinner = true;
    winner.stack += pokerGame.pot;
    const wonPot = pokerGame.pot;
    pokerGame.pot = 0;

    state.stats.roundsPlayed++;
    state.stats.pokerPlayed++;

    if (winner.isPlayer) {
      state.stats.totalWon += wonPot;
      if (wonPot > state.stats.biggestSingleWin) state.stats.biggestSingleWin = wonPot;
      syncPlayerPokerStackToWallet();
      casinoSFX.playWinFanfare(0.85);
      spawnCanvasCoins(winner.x, winner.y - 30, 26, 0.95);
      pokerGame.bannerText = `🎉 Cả bàn bỏ bài! BẠN ăn trọn Pot +${formatNum(wonPot)} Phỉnh!`;
    } else {
      syncPlayerPokerStackToWallet();
      setSeatSpeech(winner, pickRandom(winner.profile.quotesWin));
      pokerGame.bannerText = `${winner.name} thắng Pot +${formatNum(wonPot)} Phỉnh (Cả bàn úp bài).`;
    }
    renderPokerSideAndControls();
  }

  function resolvePokerShowdown() {
    pokerGame.phase = 'SHOWDOWN';
    casinoSFX.playCardFlip();

    const contenders = pokerGame.seats.filter((s) => !s.folded);
    for (const s of contenders) {
      s.evalResult = evaluateBestHoldemHand([...s.hole, ...pokerGame.community]);
    }

    // Side-pot distribution by distinct contribution levels
    const levels = Array.from(new Set(pokerGame.seats.map((s) => s.totalContributed).filter((v) => v > 0))).sort((a, b) => a - b);
    let prevLevel = 0;
    let playerWonTotal = 0;
    let mainWinnerDesc = '';

    for (let l = 0; l < levels.length; l++) {
      const lvl = levels[l];
      const slice = lvl - prevLevel;
      if (slice <= 0) continue;

      let subPot = 0;
      const eligible = [];
      for (const s of pokerGame.seats) {
        if (s.totalContributed > prevLevel) {
          subPot += Math.min(slice, s.totalContributed - prevLevel);
        }
        if (!s.folded && s.totalContributed >= lvl) {
          eligible.push(s);
        }
      }
      prevLevel = lvl;

      if (eligible.length === 0) continue;
      let maxScore = -1;
      for (const e of eligible) {
        if (e.evalResult.score > maxScore) maxScore = e.evalResult.score;
      }
      const tiedWinners = eligible.filter((e) => e.evalResult.score === maxScore);
      const share = Math.floor(subPot / tiedWinners.length);
      let rem = subPot - share * tiedWinners.length;

      for (const w of tiedWinners) {
        const payout = share + (rem > 0 ? 1 : 0);
        if (rem > 0) rem--;
        w.stack += payout;
        w.isWinner = true;
        for (const code of w.evalResult.best5Codes) {
          pokerGame.winningCodes.add(code);
        }
        if (w.isPlayer) playerWonTotal += payout;
        if (!mainWinnerDesc) {
          mainWinnerDesc = `${w.name} (${w.evalResult.rankNameVN})`;
        }
        if (!w.isPlayer) {
          setSeatSpeech(w, pickRandom(w.profile.quotesWin));
        }
      }
    }

    pokerGame.pot = 0;
    state.stats.roundsPlayed++;
    state.stats.pokerPlayed++;
    syncPlayerPokerStackToWallet();

    if (playerWonTotal > 0) {
      state.stats.totalWon += playerWonTotal;
      if (playerWonTotal > state.stats.biggestSingleWin) state.stats.biggestSingleWin = playerWonTotal;
      saveCasinoState();
      casinoSFX.playWinFanfare(1.0);
      spawnCanvasConfetti(980, 560, 55);
      spawnCanvasCoins(490, 380, 34, 1.05);
      spawnFloatingCallout(490, 265, `THẮNG SHOWDOWN +${formatNum(playerWonTotal)}!`, '#fde047', 25);
      pokerGame.bannerText = `🏆 BẠN THẮNG SHOWDOWN (${pokerGame.seats[0].evalResult?.rankNameVN}) • +${formatNum(playerWonTotal)} Phỉnh!`;
    } else {
      pokerGame.bannerText = `Showdown: ${mainWinnerDesc} thắng Pot! Nhấn VÁN MỚI để đấu tiếp.`;
    }
    renderPokerSideAndControls();
  }

  function updatePoker(dt) {
    initPokerSeatsIfNeeded();
    for (let i = 0; i < pokerGame.seats.length; i++) {
      const s = pokerGame.seats[i];
      if (s.speechTimer > 0) s.speechTimer = Math.max(0, s.speechTimer - dt);
    }

    if (
      pokerGame.phase === 'PREFLOP' ||
      pokerGame.phase === 'FLOP' ||
      pokerGame.phase === 'TURN' ||
      pokerGame.phase === 'RIVER'
    ) {
      const curSeat = pokerGame.seats[pokerGame.turnIdx];
      if (curSeat && !curSeat.isPlayer && !curSeat.folded && !curSeat.allIn) {
        pokerGame.aiThinkTimer -= dt;
        if (pokerGame.aiThinkTimer <= 0) {
          performAIPokerTurn(curSeat);
        }
      }
    }
  }

  function drawPokerCanvas(g, w, h, dt) {
    initPokerSeatsIfNeeded();
    drawLuxuryFeltBackground(
      g,
      w,
      h,
      '#0b2e21',
      'TEXAS HOLD\'EM POKER VIP • BÀN CAO THỦ THƯỢNG LƯU',
      pokerGame.bannerText
    );

    // Oval VIP Leather Rail & Inner Gold Betting Line
    g.save();
    g.translate(w * 0.5, 282);
    g.fillStyle = '#3b1812';
    g.beginPath();
    g.ellipse(0, 0, 392, 182, 0, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#d97706';
    g.stroke();

    const feltOval = g.createRadialGradient(0, -20, 20, 0, 0, 370);
    feltOval.addColorStop(0, '#14532d');
    feltOval.addColorStop(0.75, '#0f3d24');
    feltOval.addColorStop(1, '#072415');
    g.fillStyle = feltOval;
    g.beginPath();
    g.ellipse(0, 0, 368, 160, 0, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = 'rgba(250, 204, 21, 0.35)';
    g.lineWidth = 1.6;
    g.beginPath();
    g.ellipse(0, 0, 318, 122, 0, 0, Math.PI * 2);
    g.stroke();
    g.restore();

    // Center Pot Readout + Chip Stack
    g.save();
    roundRectPath(g, 405, 180, 170, 30, 15);
    g.fillStyle = 'rgba(10, 15, 24, 0.85)';
    g.fill();
    g.strokeStyle = '#facc15';
    g.lineWidth = 1.4;
    g.stroke();
    g.fillStyle = '#fde047';
    g.font = '900 13px "Segoe UI", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(`💰 POT: ${formatNum(pokerGame.pot)}`, 490, 195);
    if (pokerGame.pot > 0) {
      drawChipStack(g, 386, 196, pokerGame.pot, 11.5, 5);
    }
    g.restore();

    // 5 Community Cards Slots
    for (let c = 0; c < 5; c++) {
      const cx = 354 + c * 68;
      const cy = 272;
      const card = pokerGame.community[c];
      if (card) {
        drawPlayingCard(g, card, cx, cy, 60, 86, {
          faceUp: true,
          highlight: pokerGame.winningCodes.has(card.code)
        });
      } else {
        g.save();
        roundRectPath(g, cx - 30, cy - 43, 60, 86, 6);
        g.strokeStyle = 'rgba(255,255,255,0.16)';
        g.lineWidth = 1.2;
        g.stroke();
        g.restore();
      }
    }

    // Draw all 5 Seats (Player + 4 Named AI High-Rollers)
    const showAllHole = pokerGame.phase === 'SHOWDOWN';
    for (let i = 0; i < pokerGame.seats.length; i++) {
      const s = pokerGame.seats[i];
      const isTurn =
        pokerGame.turnIdx === i &&
        (pokerGame.phase === 'PREFLOP' || pokerGame.phase === 'FLOP' || pokerGame.phase === 'TURN' || pokerGame.phase === 'RIVER');

      // Hole Cards
      if (s.hole.length === 2) {
        const reveal = s.isPlayer || (showAllHole && !s.folded);
        const cardY = s.isPlayer ? s.y - 62 : s.y - 52;
        for (let k = 0; k < 2; k++) {
          const hc = s.hole[k];
          drawPlayingCard(g, hc, s.x + (k === 0 ? -20 : 20), cardY, s.isPlayer ? 54 : 46, s.isPlayer ? 78 : 66, {
            faceUp: reveal,
            dimmed: s.folded,
            highlight: reveal && pokerGame.winningCodes.has(hc.code)
          });
        }
      }

      // Seat Nameplate & Stack Box
      g.save();
      roundRectPath(g, s.x - 86, s.y - 12, 172, 50, 10);
      g.fillStyle = s.isWinner
        ? 'rgba(22, 101, 52, 0.96)'
        : isTurn
          ? 'rgba(146, 64, 14, 0.95)'
          : 'rgba(15, 23, 42, 0.92)';
      g.fill();
      g.lineWidth = s.isWinner || isTurn ? 2.6 : 1.3;
      g.strokeStyle = s.isWinner ? '#4ade80' : isTurn ? '#fde047' : 'rgba(245, 197, 66, 0.4)';
      g.stroke();

      g.textAlign = 'center';
      g.fillStyle = s.folded ? '#94a3b8' : '#fef08a';
      g.font = '800 12px "Segoe UI", sans-serif';
      g.fillText(`${s.avatar} ${s.name}`, s.x, s.y + 6);

      g.fillStyle = '#ffffff';
      g.font = '700 11.5px "Segoe UI", sans-serif';
      g.fillText(`🪙 ${formatNum(s.stack)}${s.lastAction ? ` • ${s.lastAction}` : ''}`, s.x, s.y + 25);

      // Dealer 'D' Button Badge
      if (pokerGame.dealerIdx === i) {
        g.fillStyle = '#fde047';
        g.beginPath();
        g.arc(s.x + 76, s.y - 10, 11, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#111827';
        g.font = '900 11px sans-serif';
        g.textBaseline = 'middle';
        g.fillText('D', s.x + 76, s.y - 9.5);
      }

      // Live Hand Strength Helper Badge for Player
      if (s.isPlayer && s.hole.length === 2 && !s.folded) {
        const myEv = evaluateBestHoldemHand([...s.hole, ...pokerGame.community]);
        roundRectPath(g, s.x + 92, s.y - 4, 142, 28, 8);
        g.fillStyle = 'rgba(30, 41, 59, 0.92)';
        g.fill();
        g.strokeStyle = '#38bdf8';
        g.lineWidth = 1.2;
        g.stroke();
        g.fillStyle = '#bae6fd';
        g.font = '800 11px "Segoe UI", sans-serif';
        g.textBaseline = 'middle';
        g.fillText(`Bài bạn: ${myEv.rankNameVN}`, s.x + 163, s.y + 10);
      }

      // AI Speech Bubble
      if (!s.isPlayer && s.speech && s.speechTimer > 0) {
        const bubW = 210;
        const bubX = s.x < 490 ? s.x + 18 : s.x - bubW - 18;
        const bubY = s.y + 44;
        roundRectPath(g, bubX, bubY, bubW, 32, 8);
        g.fillStyle = 'rgba(255, 251, 235, 0.95)';
        g.fill();
        g.strokeStyle = '#f59e0b';
        g.lineWidth = 1.3;
        g.stroke();
        g.fillStyle = '#1e293b';
        g.font = '700 10.5px "Segoe UI", sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        const clipped = s.speech.length > 38 ? s.speech.slice(0, 36) + '…' : s.speech;
        g.fillText(clipped, bubX + bubW * 0.5, bubY + 16);
      }

      g.restore();
    }

    updateAndDrawCanvasFX(g, dt);
  }

  function renderPokerSideAndControls() {
    if (!dom.sidePanel || !dom.actionBar || state.activeStation !== 'poker') return;
    initPokerSeatsIfNeeded();
    const pSeat = pokerGame.seats[0];
    const isPlayerTurn =
      pokerGame.turnIdx === 0 &&
      !pSeat.folded &&
      !pSeat.allIn &&
      (pokerGame.phase === 'PREFLOP' || pokerGame.phase === 'FLOP' || pokerGame.phase === 'TURN' || pokerGame.phase === 'RIVER');

    dom.sidePanel.innerHTML = `
      <div class="dc-side-box">
        <h4>♠️ Bàn Texas Hold'em VIP</h4>
        <div style="font-size:12.5px;line-height:1.6;">
          <div>Mức Blind: <strong style="color:#fde047;">${formatNum(pokerGame.smallBlind)} / ${formatNum(pokerGame.bigBlind)}</strong></div>
          <div>Vòng hiện tại: <strong>${pokerGame.phase}</strong></div>
          <div>Tổng Pot giữa bàn: <strong style="color:#4ade80;">${formatNum(pokerGame.pot)} Phỉnh</strong></div>
        </div>
        <div style="display:flex;gap:6px;margin-top:8px;">
          <button type="button" class="dc-mini-btn" data-blind="50" ${pokerGame.phase !== 'IDLE' && pokerGame.phase !== 'SHOWDOWN' ? 'disabled' : ''}>50/100</button>
          <button type="button" class="dc-mini-btn" data-blind="250" ${pokerGame.phase !== 'IDLE' && pokerGame.phase !== 'SHOWDOWN' ? 'disabled' : ''}>250/500</button>
          <button type="button" class="dc-mini-btn" data-blind="1000" ${pokerGame.phase !== 'IDLE' && pokerGame.phase !== 'SHOWDOWN' ? 'disabled' : ''}>1K/2K</button>
        </div>
      </div>
      <div class="dc-side-box">
        <h4>🏆 Thứ Hạng Tay Bài (Cao ➔ Thấp)</h4>
        <div style="font-size:11px;color:#cbd5e1;line-height:1.5;">
          1. <strong>Thùng Phá Sảnh Hoàng Gia</strong> (10-J-Q-K-A đồng chất)<br/>
          2. <strong>Thùng Phá Sảnh</strong> • 3. <strong>Tứ Quý</strong><br/>
          4. <strong>Cù Lũ</strong> (Sám + Đôi) • 5. <strong>Thùng</strong> (5 lá đồng chất)<br/>
          6. <strong>Sảnh</strong> (5 lá liên tiếp) • 7. <strong>Sám Cô</strong><br/>
          8. <strong>Thú (2 Đôi)</strong> • 9. <strong>Một Đôi</strong> • 10. <strong>Mậu Thầu</strong>
        </div>
      </div>
    `;

    dom.sidePanel.querySelectorAll('[data-blind]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sb = Number(btn.getAttribute('data-blind')) || 50;
        pokerGame.smallBlind = sb;
        pokerGame.bigBlind = sb * 2;
        casinoSFX.playChipClink(1);
        renderPokerSideAndControls();
      });
    });

    if (pokerGame.phase === 'IDLE' || pokerGame.phase === 'SHOWDOWN') {
      dom.actionBar.innerHTML = `
        <button type="button" class="dc-btn gold" id="dc-pk-deal">♠️ CHIA VÁN POKER MỚI (Blind ${pokerGame.smallBlind}/${pokerGame.bigBlind})</button>
      `;
      dom.actionBar.querySelector('#dc-pk-deal')?.addEventListener('click', startNewPokerHand);
    } else if (isPlayerTurn) {
      const toCall = Math.max(0, pokerGame.currentBet - pSeat.streetBet);
      const maxTotal = pSeat.stack + pSeat.streetBet;
      const minTotal = Math.min(maxTotal, Math.max(pokerGame.currentBet + pokerGame.minRaise, pokerGame.bigBlind * 2));
      const canRaise = pSeat.stack > toCall;

      dom.actionBar.innerHTML = `
        <button type="button" class="dc-btn crimson" id="dc-pk-fold">✕ Bỏ Bài (Fold)</button>
        ${toCall === 0
          ? `<button type="button" class="dc-btn emerald" id="dc-pk-check">✓ Xem (Check)</button>`
          : `<button type="button" class="dc-btn emerald" id="dc-pk-call">Theo (${formatNum(Math.min(pSeat.stack, toCall))})</button>`}
        ${canRaise ? `
          <input type="range" id="dc-pk-slider" min="${minTotal}" max="${maxTotal}" step="${pokerGame.smallBlind}" value="${clamp(pokerGame.raiseSliderVal, minTotal, maxTotal)}" style="width:125px;accent-color:#facc15;" />
          <button type="button" class="dc-btn gold" id="dc-pk-raise">🔥 Tố Lên ${formatNum(clamp(pokerGame.raiseSliderVal, minTotal, maxTotal))}</button>
          <button type="button" class="dc-btn purple" id="dc-pk-allin">💥 ALL-IN (${formatNum(maxTotal)})</button>
        ` : ''}
      `;

      dom.actionBar.querySelector('#dc-pk-fold')?.addEventListener('click', () => executePokerSeatAction(pSeat, 'FOLD'));
      dom.actionBar.querySelector('#dc-pk-check')?.addEventListener('click', () => executePokerSeatAction(pSeat, 'CHECK'));
      dom.actionBar.querySelector('#dc-pk-call')?.addEventListener('click', () => executePokerSeatAction(pSeat, 'CALL'));

      const slider = dom.actionBar.querySelector('#dc-pk-slider');
      const raiseBtn = dom.actionBar.querySelector('#dc-pk-raise');
      slider?.addEventListener('input', () => {
        pokerGame.raiseSliderVal = Number(slider.value);
        if (raiseBtn) raiseBtn.textContent = `🔥 Tố Lên ${formatNum(pokerGame.raiseSliderVal)}`;
      });
      raiseBtn?.addEventListener('click', () => {
        executePokerSeatAction(pSeat, 'RAISE', pokerGame.raiseSliderVal);
      });
      dom.actionBar.querySelector('#dc-pk-allin')?.addEventListener('click', () => {
        executePokerSeatAction(pSeat, 'RAISE', maxTotal);
      });
    } else {
      dom.actionBar.innerHTML = `<button type="button" class="dc-btn gold" disabled>⏳ Các cao thủ AI đang hành động...</button>`;
    }
  }

  // ============================================================================
  // SECTION 9: STATION 7 — BACCARAT HOÀNG GIA PUNTO BANCO + NẶN BÀI KỊCH TÍNH
  // ============================================================================
  const BACCARAT_ZONES = [
    { id: 'P_PAIR', label: 'ĐÔI CON', sub: '1 Ăn 11', odds: 11, x: 48, y: 238, w: 148, h: 108, accent: '#60a5fa' },
    { id: 'PLAYER', label: 'NHÀ CON (PLAYER)', sub: '1 Ăn 1', odds: 1, x: 208, y: 238, w: 206, h: 108, accent: '#38bdf8' },
    { id: 'TIE', label: 'HÒA (TIE)', sub: '1 Ăn 8 (Hoàn Con/Cái)', odds: 8, x: 426, y: 238, w: 128, h: 108, accent: '#4ade80' },
    { id: 'BANKER', label: 'NHÀ CÁI (BANKER)', sub: '1 Ăn 0.95', odds: 0.95, x: 566, y: 238, w: 206, h: 108, accent: '#f87171' },
    { id: 'B_PAIR', label: 'ĐÔI CÁI', sub: '1 Ăn 11', odds: 11, x: 784, y: 238, w: 148, h: 108, accent: '#fca5a5' }
  ];

  const baccaratGame = {
    shoe: createDeck(8),
    phase: 'BETTING', // 'BETTING' | 'DEALING' | 'SQUEEZING' | 'RESULT'
    squeezeMode: true,
    bets: {},
    lastBets: {},
    playerCards: [],
    bankerCards: [],
    pendingQueue: [], // [{ side: 'P'|'B', card, requiresSqueeze: boolean }]
    dealStepTimer: 0,
    squeezeCardRef: null,
    squeezeSide: 'P',
    squeezeProgress: 0,
    draggingSqueeze: false,
    dragStartY: 0,
    dragStartProg: 0,
    hoverZone: null,
    winningZones: new Set(),
    banner: 'Đặt Phỉnh vào Nhà Con, Nhà Cái, Hòa hoặc Đôi để bắt đầu ván Baccarat Thượng Lưu!'
  };

  function calcBaccaratScore(cards, onlyRevealed = false) {
    let sum = 0;
    for (let i = 0; i < cards.length; i++) {
      if (onlyRevealed && !cards[i].revealed) continue;
      sum += cards[i].bacVal;
    }
    return sum % 10;
  }

  function drawBaccaratCardFromShoe() {
    if (baccaratGame.shoe.length < 48) {
      baccaratGame.shoe = createDeck(8);
      casinoSFX.playCardRiffle();
    }
    return { ...baccaratGame.shoe.pop(), revealed: false, flip: 0 };
  }

  function getBaccaratTotalBet() {
    let s = 0;
    for (const k of Object.keys(baccaratGame.bets)) s += baccaratGame.bets[k] || 0;
    return s;
  }

  function placeBaccaratBet(zoneId) {
    if (baccaratGame.phase !== 'BETTING' && baccaratGame.phase !== 'RESULT') return;
    if (baccaratGame.phase === 'RESULT') {
      baccaratGame.phase = 'BETTING';
      baccaratGame.bets = {};
      baccaratGame.winningZones.clear();
    }
    if (!spendChips(state.selectedChip, true)) return;
    baccaratGame.bets[zoneId] = (baccaratGame.bets[zoneId] || 0) + state.selectedChip;
    casinoSFX.playChipClink(2);
    renderBaccaratSideAndControls();
  }

  function clearBaccaratBets() {
    if (baccaratGame.phase !== 'BETTING') return;
    const total = getBaccaratTotalBet();
    if (total <= 0) return;
    baccaratGame.bets = {};
    addChips(total, 'refund');
    casinoSFX.playChipClink(2);
    renderBaccaratSideAndControls();
  }

  function repeatBaccaratBets(mult = 1) {
    if (baccaratGame.phase === 'DEALING' || baccaratGame.phase === 'SQUEEZING') return;
    if (baccaratGame.phase === 'RESULT') {
      baccaratGame.phase = 'BETTING';
      baccaratGame.bets = {};
      baccaratGame.winningZones.clear();
    }
    const curTotal = getBaccaratTotalBet();
    const src = curTotal > 0 && mult > 1 ? { ...baccaratGame.bets } : baccaratGame.lastBets;
    const keys = Object.keys(src);
    if (keys.length === 0) {
      showCasinoToast('Chưa có lịch sử cược ván trước!', 'error');
      return;
    }
    let cost = 0;
    for (const k of keys) cost += Math.round(src[k] * (curTotal > 0 && mult > 1 ? mult - 1 : mult));
    if (!spendChips(cost, true)) return;
    for (const k of keys) {
      if (curTotal > 0 && mult > 1) baccaratGame.bets[k] = (baccaratGame.bets[k] || 0) * mult;
      else baccaratGame.bets[k] = (baccaratGame.bets[k] || 0) + src[k] * mult;
    }
    casinoSFX.playChipSweep();
    renderBaccaratSideAndControls();
  }

  function bankerShouldDrawThird(bScore, playerThirdVal) {
    if (bScore <= 2) return true;
    if (bScore === 3) return playerThirdVal !== 8;
    if (bScore === 4) return playerThirdVal >= 2 && playerThirdVal <= 7;
    if (bScore === 5) return playerThirdVal >= 4 && playerThirdVal <= 7;
    if (bScore === 6) return playerThirdVal === 6 || playerThirdVal === 7;
    return false;
  }

  function startBaccaratDeal(forceFast = false) {
    if (baccaratGame.phase === 'DEALING' || baccaratGame.phase === 'SQUEEZING') return;
    if (baccaratGame.phase === 'RESULT' && getBaccaratTotalBet() === 0) {
      repeatBaccaratBets(1);
    }
    if (getBaccaratTotalBet() <= 0) {
      showCasinoToast('Hãy đặt Phỉnh vào Nhà Con, Nhà Cái hoặc Hòa trước khi chia bài!', 'error');
      casinoSFX.playError();
      return;
    }

    baccaratGame.lastBets = { ...baccaratGame.bets };
    baccaratGame.playerCards = [];
    baccaratGame.bankerCards = [];
    baccaratGame.winningZones.clear();

    // Pre-compute authentic Punto Banco sequence
    const p1 = drawBaccaratCardFromShoe();
    const b1 = drawBaccaratCardFromShoe();
    const p2 = drawBaccaratCardFromShoe();
    const b2 = drawBaccaratCardFromShoe();

    const pInit = (p1.bacVal + p2.bacVal) % 10;
    const bInit = (b1.bacVal + b2.bacVal) % 10;
    const natural = pInit >= 8 || bInit >= 8;

    let p3 = null;
    let b3 = null;
    if (!natural) {
      if (pInit <= 5) {
        p3 = drawBaccaratCardFromShoe();
        if (bankerShouldDrawThird(bInit, p3.bacVal)) {
          b3 = drawBaccaratCardFromShoe();
        }
      } else if (bInit <= 5) {
        b3 = drawBaccaratCardFromShoe();
      }
    }

    // Decide which card gets the VIP Macau Squeeze spotlight!
    const useSqueeze = baccaratGame.squeezeMode && !forceFast;
    const preferBanker = (baccaratGame.bets.BANKER || 0) > (baccaratGame.bets.PLAYER || 0);

    const queue = [
      { side: 'P', card: p1, squeeze: false },
      { side: 'B', card: b1, squeeze: false },
      { side: 'P', card: p2, squeeze: useSqueeze && !preferBanker && !p3 },
      { side: 'B', card: b2, squeeze: useSqueeze && preferBanker && !b3 }
    ];
    if (p3) queue.push({ side: 'P', card: p3, squeeze: useSqueeze && (!b3 || !preferBanker) });
    if (b3) queue.push({ side: 'B', card: b3, squeeze: useSqueeze && preferBanker });

    // Ensure at most ONE dramatic squeeze card per hand so pacing feels crisp!
    let assignedSqueeze = false;
    for (let i = queue.length - 1; i >= 0; i--) {
      if (queue[i].squeeze && !assignedSqueeze) {
        assignedSqueeze = true;
      } else {
        queue[i].squeeze = false;
      }
    }
    if (useSqueeze && !assignedSqueeze) {
      queue[queue.length - 1].squeeze = true;
    }

    baccaratGame.pendingQueue = queue;
    baccaratGame.phase = 'DEALING';
    baccaratGame.dealStepTimer = 0.25;
    baccaratGame.banner = 'Đang chia bài chuẩn Punto Banco...';
    renderBaccaratSideAndControls();
  }

  function finishCurrentBaccaratSqueeze() {
    if (baccaratGame.squeezeCardRef) {
      baccaratGame.squeezeCardRef.revealed = true;
      baccaratGame.squeezeCardRef.flip = 1;
      baccaratGame.squeezeCardRef = null;
      casinoSFX.playCardFlip();
    }
    baccaratGame.draggingSqueeze = false;
    baccaratGame.phase = 'DEALING';
    baccaratGame.dealStepTimer = 0.35;
    renderBaccaratSideAndControls();
  }

  function settleBaccaratHand() {
    baccaratGame.phase = 'RESULT';
    const pScore = calcBaccaratScore(baccaratGame.playerCards, false);
    const bScore = calcBaccaratScore(baccaratGame.bankerCards, false);
    const pPair = baccaratGame.playerCards.length >= 2 && baccaratGame.playerCards[0].rank === baccaratGame.playerCards[1].rank;
    const bPair = baccaratGame.bankerCards.length >= 2 && baccaratGame.bankerCards[0].rank === baccaratGame.bankerCards[1].rank;

    const winner = pScore > bScore ? 'P' : bScore > pScore ? 'B' : 'T';
    const winSet = new Set();
    if (winner === 'P') winSet.add('PLAYER');
    else if (winner === 'B') winSet.add('BANKER');
    else winSet.add('TIE');
    if (pPair) winSet.add('P_PAIR');
    if (bPair) winSet.add('B_PAIR');
    baccaratGame.winningZones = winSet;

    let totalReturn = 0;
    let pureRefund = 0;
    for (const z of BACCARAT_ZONES) {
      const bAmt = baccaratGame.bets[z.id] || 0;
      if (!bAmt) continue;
      if (winSet.has(z.id)) {
        totalReturn += Math.round(bAmt * (1 + z.odds));
      } else if (winner === 'T' && (z.id === 'PLAYER' || z.id === 'BANKER')) {
        // Macau rule: Player & Banker bets PUSH on Tie!
        pureRefund += bAmt;
      }
    }

    state.histories.baccarat.push({ winner, pScore, bScore, pPair, bPair });
    if (state.histories.baccarat.length > 48) state.histories.baccarat.shift();
    state.stats.roundsPlayed++;
    state.stats.baccaratPlayed++;

    const resText =
      winner === 'P'
        ? `NHÀ CON THẮNG (${pScore} vs ${bScore})`
        : winner === 'B'
          ? `NHÀ CÁI THẮNG (${bScore} vs ${pScore})`
          : `HÒA TIE (${pScore} – ${bScore})`;

    if (pureRefund > 0) addChips(pureRefund, 'refund');
    if (totalReturn > 0) {
      addChips(totalReturn, 'baccarat_win');
      casinoSFX.playWinFanfare(0.9);
      spawnCanvasCoins(490, 220, 30, 1.0);
      spawnFloatingCallout(490, 185, `${resText} • +${formatNum(totalReturn)} PHỈNH!`, '#fde047', 24);
      baccaratGame.banner = `🎉 ${resText}! Bạn thu về +${formatNum(totalReturn)} Phỉnh!`;
    } else if (pureRefund > 0) {
      casinoSFX.playChipClink(2);
      baccaratGame.banner = `${resText} — Đã hoàn trả ${formatNum(pureRefund)} Phỉnh cược Con/Cái!`;
    } else {
      baccaratGame.banner = `Kết quả: ${resText}. Nhấn VÁN MỚI để tiếp tục soi cầu!`;
    }

    saveCasinoState();
    renderBaccaratSideAndControls();
  }

  function updateBaccarat(dt) {
    // Flip animation on revealed cards
    const all = [...baccaratGame.playerCards, ...baccaratGame.bankerCards];
    for (let i = 0; i < all.length; i++) {
      if (all[i].revealed) {
        all[i].flip = lerp(all[i].flip, 1, Math.min(1, dt * 10));
      }
    }

    if (baccaratGame.phase === 'DEALING') {
      baccaratGame.dealStepTimer -= dt;
      if (baccaratGame.dealStepTimer <= 0) {
        if (baccaratGame.pendingQueue.length === 0) {
          settleBaccaratHand();
          return;
        }
        const next = baccaratGame.pendingQueue.shift();
        if (next.side === 'P') baccaratGame.playerCards.push(next.card);
        else baccaratGame.bankerCards.push(next.card);
        casinoSFX.playCardDeal();

        if (next.squeeze) {
          baccaratGame.phase = 'SQUEEZING';
          baccaratGame.squeezeCardRef = next.card;
          baccaratGame.squeezeSide = next.side;
          baccaratGame.squeezeProgress = 0.04;
          baccaratGame.banner = `👆 NẶN BÀI ${next.side === 'P' ? 'NHÀ CON' : 'NHÀ CÁI'}: Kéo chuột từ dưới lên để hé từng chân bài!`;
          renderBaccaratSideAndControls();
        } else {
          next.card.revealed = true;
          baccaratGame.dealStepTimer = 0.42;
        }
      }
    } else if (baccaratGame.phase === 'SQUEEZING') {
      if (!baccaratGame.draggingSqueeze && baccaratGame.squeezeProgress >= 0.78) {
        finishCurrentBaccaratSqueeze();
      }
    }
  }

  function drawBaccaratCanvas(g, w, h, dt) {
    drawLuxuryFeltBackground(
      g,
      w,
      h,
      '#123528',
      'BACCARAT HOÀNG GIA • MACAU VIP PUNTO BANCO',
      baccaratGame.banner
    );

    // 1. Top Card Boxes: NHÀ CON (left) vs NHÀ CÁI (right)
    g.save();
    roundRectPath(g, 96, 66, 356, 154, 14);
    g.fillStyle = 'rgba(14, 116, 144, 0.22)';
    g.fill();
    g.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    g.lineWidth = 1.6;
    g.stroke();

    roundRectPath(g, 528, 66, 356, 154, 14);
    g.fillStyle = 'rgba(185, 28, 28, 0.22)';
    g.fill();
    g.strokeStyle = 'rgba(248, 113, 113, 0.55)';
    g.lineWidth = 1.6;
    g.stroke();

    const pPts = calcBaccaratScore(baccaratGame.playerCards, true);
    const bPts = calcBaccaratScore(baccaratGame.bankerCards, true);

    g.font = '900 16px "Segoe UI", sans-serif';
    g.textAlign = 'center';
    g.fillStyle = '#7dd3fc';
    g.fillText(`NHÀ CON (PLAYER) • ${pPts} NÚT`, 274, 88);
    g.fillStyle = '#fca5a5';
    g.fillText(`NHÀ CÁI (BANKER) • ${bPts} NÚT`, 706, 88);
    g.restore();

    // Draw Player & Banker Cards (3rd card laid sideways horizontally per Macau tradition!)
    for (let i = 0; i < baccaratGame.playerCards.length; i++) {
      const c = baccaratGame.playerCards[i];
      const cx = i < 2 ? 215 + i * 74 : 374;
      const cy = 152;
      drawPlayingCard(g, c, cx, cy, 62, 88, {
        flip: c.revealed ? c.flip : 0,
        angle: i === 2 ? Math.PI * 0.5 : 0
      });
    }
    for (let i = 0; i < baccaratGame.bankerCards.length; i++) {
      const c = baccaratGame.bankerCards[i];
      const cx = i < 2 ? 646 + i * 74 : 805;
      const cy = 152;
      drawPlayingCard(g, c, cx, cy, 62, 88, {
        flip: c.revealed ? c.flip : 0,
        angle: i === 2 ? Math.PI * 0.5 : 0
      });
    }

    // 2. Betting Zones Row
    const pulse = 0.5 + 0.5 * Math.sin((activeCtx.elapsed || 0) * 6.5);
    for (let i = 0; i < BACCARAT_ZONES.length; i++) {
      const z = BACCARAT_ZONES[i];
      const isWin = baccaratGame.phase === 'RESULT' && baccaratGame.winningZones.has(z.id);
      const isHov = baccaratGame.hoverZone === z.id;
      const betVal = baccaratGame.bets[z.id] || 0;

      g.save();
      roundRectPath(g, z.x, z.y, z.w, z.h, 12);
      if (isWin) g.fillStyle = `rgba(250, 204, 21, ${0.26 + pulse * 0.22})`;
      else if (isHov) g.fillStyle = 'rgba(255,255,255,0.14)';
      else g.fillStyle = 'rgba(8, 20, 16, 0.62)';
      g.fill();

      g.lineWidth = isWin ? 3 : isHov ? 2.2 : 1.4;
      g.strokeStyle = isWin ? '#fde047' : isHov ? '#ffffff' : 'rgba(245, 197, 66, 0.42)';
      g.stroke();

      g.textAlign = 'center';
      g.fillStyle = z.accent;
      g.font = '900 15px "Segoe UI", sans-serif';
      g.fillText(z.label, z.x + z.w * 0.5, z.y + 34);
      g.fillStyle = '#fde68a';
      g.font = '700 11.5px "Segoe UI", sans-serif';
      g.fillText(z.sub, z.x + z.w * 0.5, z.y + 56);

      if (betVal > 0) {
        drawChipStack(g, z.x + z.w * 0.5, z.y + 86, betVal, 13.5, 5);
      }
      g.restore();
    }

    // 3. Bottom Macau Big Road & Bead Plate Scoreboard
    const sbX = 48;
    const sbY = 364;
    const sbW = 884;
    const sbH = 176;
    g.save();
    roundRectPath(g, sbX, sbY, sbW, sbH, 12);
    g.fillStyle = 'rgba(8, 12, 16, 0.84)';
    g.fill();
    g.strokeStyle = 'rgba(245, 197, 66, 0.36)';
    g.lineWidth = 1.3;
    g.stroke();

    const hist = state.histories.baccarat;
    let pCnt = 0;
    let bCnt = 0;
    let tCnt = 0;
    for (let i = 0; i < hist.length; i++) {
      if (hist[i].winner === 'P') pCnt++;
      else if (hist[i].winner === 'B') bCnt++;
      else tCnt++;
    }

    g.fillStyle = '#fde047';
    g.font = '800 12px "Segoe UI", sans-serif';
    g.textAlign = 'left';
    g.fillText(
      `📋 BẢNG CẦU LỚN MACAU (BIG ROAD)   •   🔵 NHÀ CON: ${pCnt}   •   🔴 NHÀ CÁI: ${bCnt}   •   🟢 HÒA: ${tCnt}`,
      sbX + 14,
      sbY + 21
    );

    // Build Big Road Columns (streaks drop vertically up to 5 rows, switches start new column)
    const bigCols = [];
    for (let i = 0; i < hist.length; i++) {
      const r = hist[i];
      if (r.winner === 'T') {
        if (bigCols.length > 0) {
          const lastCol = bigCols[bigCols.length - 1];
          lastCol[lastCol.length - 1].ties = (lastCol[lastCol.length - 1].ties || 0) + 1;
        }
        continue;
      }
      if (bigCols.length === 0 || bigCols[bigCols.length - 1][0].winner !== r.winner || bigCols[bigCols.length - 1].length >= 5) {
        bigCols.push([{ winner: r.winner, ties: 0 }]);
      } else {
        bigCols[bigCols.length - 1].push({ winner: r.winner, ties: 0 });
      }
    }

    const visibleCols = bigCols.slice(-26);
    const cellS = 24;
    const gridStartX = sbX + 18;
    const gridStartY = sbY + 34;

    for (let c = 0; c < 26; c++) {
      for (let r = 0; r < 5; r++) {
        const gx = gridStartX + c * cellS;
        const gy = gridStartY + r * cellS;
        g.strokeStyle = 'rgba(255,255,255,0.07)';
        g.lineWidth = 1;
        g.strokeRect(gx, gy, cellS, cellS);

        const item = visibleCols[c]?.[r];
        if (item) {
          g.strokeStyle = item.winner === 'B' ? '#ef4444' : '#38bdf8';
          g.lineWidth = 2.6;
          g.beginPath();
          g.arc(gx + cellS * 0.5, gy + cellS * 0.5, 8, 0, Math.PI * 2);
          g.stroke();

          if (item.ties > 0) {
            g.strokeStyle = '#4ade80';
            g.lineWidth = 2;
            g.beginPath();
            g.moveTo(gx + 5, gy + cellS - 5);
            g.lineTo(gx + cellS - 5, gy + 5);
            g.stroke();
          }
        }
      }
    }

    // Right Bead Plate (last 20 exact scores)
    const bpX = sbX + 660;
    const recent20 = hist.slice(-20);
    for (let idx = 0; idx < 20; idx++) {
      const col = Math.floor(idx / 4);
      const row = idx % 4;
      const bx = bpX + 20 + col * 40;
      const by = sbY + 48 + row * 30;
      const rec = recent20[idx];
      if (!rec) continue;
      g.fillStyle = rec.winner === 'B' ? '#dc2626' : rec.winner === 'P' ? '#0284c7' : '#16a34a';
      g.beginPath();
      g.arc(bx, by, 12, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.font = '800 10px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(`${rec.winner}${rec.winner === 'B' ? rec.bScore : rec.pScore}`, bx, by + 0.5);
    }
    g.restore();

    // 4. Interactive Center Card Squeeze Spotlight Overlay ("NẶN BÀI KỊCH TÍNH")!
    if (baccaratGame.phase === 'SQUEEZING' && baccaratGame.squeezeCardRef) {
      g.save();
      g.fillStyle = 'rgba(6, 8, 15, 0.72)';
      g.fillRect(0, 0, w, h);

      roundRectPath(g, w * 0.5 - 190, 88, 380, 376, 18);
      g.fillStyle = 'rgba(20, 12, 24, 0.94)';
      g.fill();
      g.strokeStyle = '#fde047';
      g.lineWidth = 2.5;
      g.stroke();

      g.fillStyle = '#fde047';
      g.font = '900 17px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.fillText(
        `🔥 NẶN BÀI QUYẾT ĐỊNH: ${baccaratGame.squeezeSide === 'P' ? 'NHÀ CON' : 'NHÀ CÁI'}`,
        w * 0.5,
        122
      );

      drawPlayingCard(g, baccaratGame.squeezeCardRef, w * 0.5, 268, 146, 208, {
        squeeze: { progress: baccaratGame.squeezeProgress }
      });

      g.fillStyle = '#fef08a';
      g.font = '700 13px "Segoe UI", sans-serif';
      g.fillText('👆 Giữ chuột kéo LÊN trên lá bài để bẻ góc nặn từng nút!', w * 0.5, 420);
      g.fillStyle = '#94a3b8';
      g.font = '600 11.5px "Segoe UI", sans-serif';
      g.fillText(`Độ mở: ${Math.round(baccaratGame.squeezeProgress * 100)}%`, w * 0.5, 444);
      g.restore();
    }

    updateAndDrawCanvasFX(g, dt);
  }

  function renderBaccaratSideAndControls() {
    if (!dom.sidePanel || !dom.actionBar || state.activeStation !== 'baccarat') return;
    const totalBet = getBaccaratTotalBet();

    dom.sidePanel.innerHTML = `
      <div class="dc-side-box">
        <h4>👑 Bàn Baccarat Thượng Lưu</h4>
        <div style="font-size:12.5px;line-height:1.6;">
          <div>Tổng Phỉnh đã đặt: <strong style="color:#4ade80;">${formatNum(totalBet)}</strong></div>
          <div>Bài còn trong Hộp 8 Bộ: <strong>${baccaratGame.shoe.length} lá</strong></div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;margin-top:9px;cursor:pointer;font-weight:700;color:#fef08a;">
          <input type="checkbox" id="dc-bac-squeeze" ${baccaratGame.squeezeMode ? 'checked' : ''} />
          Nặn Góc Bài Kịch Tính (Chuẩn Macau)
        </label>
      </div>
      <div class="dc-side-box">
        <h4>📜 Luật Punto Banco Chuẩn</h4>
        <div style="font-size:11.5px;color:#cbd5e1;line-height:1.55;">
          • <strong>8 hoặc 9 nút</strong> 2 lá đầu = Thắng Tự Nhiên (Không rút thêm)<br/>
          • <strong>Nhà Con</strong>: 0–5 rút lá thứ 3; 6–7 dừng<br/>
          • <strong>Nhà Cái</strong>: Rút lá thứ 3 theo bảng quy tắc Macau phụ thuộc lá thứ 3 của Nhà Con<br/>
          • <strong>Về Hòa (Tie)</strong>: Cược Hòa ăn <strong>1:8</strong>, hoàn trả 100% Phỉnh đặt Nhà Con &amp; Nhà Cái!
        </div>
      </div>
    `;

    dom.sidePanel.querySelector('#dc-bac-squeeze')?.addEventListener('change', (e) => {
      baccaratGame.squeezeMode = Boolean(e.target.checked);
      casinoSFX.playChipClink(1);
    });

    if (baccaratGame.phase === 'SQUEEZING') {
      dom.actionBar.innerHTML = `
        <span style="font-size:12.5px;color:#fde047;font-weight:800;">👆 Kéo chuột ngược lên trên lá bài để nặn!</span>
        <button type="button" class="dc-btn gold" id="dc-bac-open">⚡ Lật Ngửa Ngay!</button>
      `;
      dom.actionBar.querySelector('#dc-bac-open')?.addEventListener('click', finishCurrentBaccaratSqueeze);
    } else if (baccaratGame.phase === 'DEALING') {
      dom.actionBar.innerHTML = `<button type="button" class="dc-btn gold" disabled>🂠 Đang chia bài...</button>`;
    } else {
      dom.actionBar.innerHTML = `
        <button type="button" class="dc-btn" id="dc-bac-clear" ${totalBet <= 0 ? 'disabled' : ''}>Xóa Cược</button>
        <button type="button" class="dc-btn" id="dc-bac-repeat">Đặt Lại</button>
        <button type="button" class="dc-btn" id="dc-bac-2x" ${totalBet <= 0 ? 'disabled' : ''}>Nhân Đôi 2x</button>
        <button type="button" class="dc-btn purple" id="dc-bac-fast">⚡ Chia Mở Nhanh</button>
        <button type="button" class="dc-btn gold" id="dc-bac-deal">👑 CHIA BÀI (${baccaratGame.squeezeMode ? 'Có Nặn Bài' : 'Mở'})</button>
      `;
      dom.actionBar.querySelector('#dc-bac-clear')?.addEventListener('click', clearBaccaratBets);
      dom.actionBar.querySelector('#dc-bac-repeat')?.addEventListener('click', () => repeatBaccaratBets(1));
      dom.actionBar.querySelector('#dc-bac-2x')?.addEventListener('click', () => repeatBaccaratBets(2));
      dom.actionBar.querySelector('#dc-bac-fast')?.addEventListener('click', () => startBaccaratDeal(true));
      dom.actionBar.querySelector('#dc-bac-deal')?.addEventListener('click', () => startBaccaratDeal(false));
    }
  }

  // ============================================================================
  // SECTION 10: STATION 8 — MÁY XÈNG KIM CƯƠNG DIAMOND 777 (5×3, 20 PAYLINES)
  // ============================================================================
  const SLOT_SYMBOLS = [
    { id: 'WILD', name: 'Kim Cương Wild', weight: 4, pays: { 3: 40, 4: 150, 5: 1000 }, color: '#38bdf8', bg: '#0c4a6e' },
    { id: 'SEVEN', name: 'Số 777 Hoàng Gia', weight: 7, pays: { 3: 20, 4: 65, 5: 280 }, color: '#ef4444', bg: '#450a0a' },
    { id: 'CROWN', name: 'Vương Miện Bố Già', weight: 9, pays: { 3: 14, 4: 40, 5: 140 }, color: '#facc15', bg: '#422006' },
    { id: 'CAR', name: 'Siêu Xe Vàng', weight: 11, pays: { 3: 10, 4: 28, 5: 90 }, color: '#fb923c', bg: '#431407' },
    { id: 'CASH', name: 'Cọc Đô La', weight: 14, pays: { 3: 7, 4: 18, 5: 55 }, color: '#4ade80', bg: '#052e16' },
    { id: 'BELL', name: 'Chuông Vàng', weight: 16, pays: { 3: 5, 4: 14, 5: 38 }, color: '#fde047', bg: '#3f2c06' },
    { id: 'CLOVER', name: 'Cỏ 4 Lá', weight: 18, pays: { 3: 4, 4: 9, 5: 25 }, color: '#22c55e', bg: '#064e3b' },
    { id: 'CHERRY', name: 'Anh Đào Đỏ', weight: 20, pays: { 2: 2, 3: 3, 4: 6, 5: 18 }, color: '#f43f5e', bg: '#4c0519' },
    { id: 'SCATTER', name: 'Ngôi Sao Fever', weight: 6, pays: { 3: 5, 4: 20, 5: 100 }, color: '#e879f9', bg: '#3b0764' }
  ];

  const SLOT_WEIGHTED_POOL = (() => {
    const out = [];
    for (let i = 0; i < SLOT_SYMBOLS.length; i++) {
      for (let w = 0; w < SLOT_SYMBOLS[i].weight; w++) {
        out.push(SLOT_SYMBOLS[i]);
      }
    }
    return out;
  })();

  // 20 Authentic 5-Reel Paylines (each entry is 5 row indices 0..2)
  const SLOT_PAYLINES = [
    [1, 1, 1, 1, 1], // 1: Middle straight
    [0, 0, 0, 0, 0], // 2: Top straight
    [2, 2, 2, 2, 2], // 3: Bottom straight
    [0, 1, 2, 1, 0], // 4: V-shape
    [2, 1, 0, 1, 2], // 5: Inverted V
    [0, 0, 1, 2, 2], // 6: Diagonal step down
    [2, 2, 1, 0, 0], // 7: Diagonal step up
    [1, 0, 0, 0, 1], // 8: Top arch
    [1, 2, 2, 2, 1], // 9: Bottom arch
    [0, 1, 1, 1, 0], // 10: Shallow U
    [2, 1, 1, 1, 2], // 11: Shallow dome
    [1, 0, 1, 2, 1], // 12: S-wave
    [1, 2, 1, 0, 1], // 13: Reverse S-wave
    [0, 1, 0, 1, 0], // 14: Top zigzag
    [2, 1, 2, 1, 2], // 15: Bottom zigzag
    [1, 1, 0, 1, 1], // 16: Center peak
    [1, 1, 2, 1, 1], // 17: Center dip
    [0, 2, 0, 2, 0], // 18: Wide W
    [2, 0, 2, 0, 2], // 19: Wide M
    [0, 2, 2, 2, 0]  // 20: Deep bucket
  ];

  const PAYLINE_COLORS = [
    '#fde047', '#ef4444', '#38bdf8', '#4ade80', '#e879f9',
    '#fb923c', '#2dd4bf', '#f43f5e', '#a3e635', '#c084fc'
  ];

  function randomSlotSymbol() {
    return SLOT_WEIGHTED_POOL[Math.floor(Math.random() * SLOT_WEIGHTED_POOL.length)];
  }

  const slotsGame = {
    phase: 'IDLE', // 'IDLE' | 'SPINNING'
    betPerLine: 10, // Total bet = betPerLine * 20 lines
    lineLevels: [2, 5, 10, 25, 50, 100, 250],
    freeSpinsLeft: 0,
    feverMultiplier: 3,
    autoSpin: false,
    autoDelayTimer: 0,
    leverPullAnim: 0,
    grid: [
      [SLOT_SYMBOLS[0], SLOT_SYMBOLS[1], SLOT_SYMBOLS[2]],
      [SLOT_SYMBOLS[7], SLOT_SYMBOLS[0], SLOT_SYMBOLS[4]],
      [SLOT_SYMBOLS[2], SLOT_SYMBOLS[0], SLOT_SYMBOLS[6]],
      [SLOT_SYMBOLS[5], SLOT_SYMBOLS[1], SLOT_SYMBOLS[3]],
      [SLOT_SYMBOLS[3], SLOT_SYMBOLS[0], SLOT_SYMBOLS[7]]
    ],
    reels: Array.from({ length: 5 }, (_, idx) => ({
      spinning: false,
      stopTimer: 0,
      scrollOffset: 0,
      bounceTimer: 0,
      blurSymbols: [randomSlotSymbol(), randomSlotSymbol(), randomSlotSymbol(), randomSlotSymbol()]
    })),
    winningLines: [], // [{ lineIdx, rows, count, sym, amount, hasWild }]
    scatterPositions: [],
    lastWinAmount: 0,
    laserCycleClock: 0,
    marqueePhase: 0,
    statusMsg: 'Kéo Cần Gạt hoặc nhấn QUAY NGAY để săn Mega Jackpot Kim Cương!'
  };

  function getSlotsTotalBet() {
    return slotsGame.betPerLine * 20;
  }

  function triggerSlotSpin() {
    if (slotsGame.phase === 'SPINNING') return;

    const isFreeSpin = slotsGame.freeSpinsLeft > 0;
    const totalBet = getSlotsTotalBet();

    if (isFreeSpin) {
      slotsGame.freeSpinsLeft--;
    } else {
      if (!spendChips(totalBet, true)) {
        slotsGame.autoSpin = false;
        renderSlotsSideAndControls();
        return;
      }
    }

    slotsGame.phase = 'SPINNING';
    slotsGame.leverPullAnim = 1.0;
    slotsGame.winningLines = [];
    slotsGame.scatterPositions = [];
    slotsGame.lastWinAmount = 0;

    // Generate new target 5x3 grid
    let scatterSeenBefore5th = 0;
    for (let col = 0; col < 5; col++) {
      const colSyms = [];
      for (let row = 0; row < 3; row++) {
        let sym = randomSlotSymbol();
        // Prevent duplicate scatters in the exact same reel column
        if (sym.id === 'SCATTER' && colSyms.some((s) => s.id === 'SCATTER')) {
          sym = SLOT_SYMBOLS[randInt(1, 7)];
        }
        colSyms.push(sym);
        if (col < 4 && sym.id === 'SCATTER') scatterSeenBefore5th++;
      }
      slotsGame.grid[col] = colSyms;
    }

    // Staggered mechanical clunk stop schedule (extra anticipation if >=2 Scatters in first 4 reels!)
    for (let r = 0; r < 5; r++) {
      const extraTease = r === 4 && scatterSeenBefore5th >= 2 ? 0.85 : 0;
      slotsGame.reels[r].spinning = true;
      slotsGame.reels[r].stopTimer = 0.68 + r * 0.28 + extraTease;
      slotsGame.reels[r].bounceTimer = 0;
    }

    slotsGame.statusMsg = isFreeSpin
      ? `🔥 VÒNG QUAY FEVER MIỄN PHÍ (Nhân x${slotsGame.feverMultiplier} mọi giải • Còn ${slotsGame.freeSpinsLeft} lượt)!`
      : '🎰 Các cuộn Kim Cương đang quay tốc độ cao...';

    casinoSFX.playChipClink(1);
    renderSlotsSideAndControls();
  }

  function evaluateSlotsOutcome(wasFreeSpin) {
    slotsGame.phase = 'IDLE';
    const mult = wasFreeSpin ? slotsGame.feverMultiplier : 1;
    const winLines = [];
    let totalPayout = 0;
    let hitMegaJackpot = false;

    // 1. Evaluate all 20 Paylines left-to-right
    for (let l = 0; l < SLOT_PAYLINES.length; l++) {
      const pattern = SLOT_PAYLINES[l];
      const lineSyms = [
        slotsGame.grid[0][pattern[0]],
        slotsGame.grid[1][pattern[1]],
        slotsGame.grid[2][pattern[2]],
        slotsGame.grid[3][pattern[3]],
        slotsGame.grid[4][pattern[4]]
      ];

      // Determine base target symbol (first non-WILD, non-SCATTER; or WILD if all WILDs)
      if (lineSyms[0].id === 'SCATTER') continue;
      let baseSym = lineSyms[0];
      for (let k = 0; k < 5; k++) {
        if (lineSyms[k].id !== 'WILD') {
          if (lineSyms[k].id !== 'SCATTER') baseSym = lineSyms[k];
          break;
        }
      }

      let matchCount = 0;
      let usedWild = false;
      let allWilds = true;
      for (let k = 0; k < 5; k++) {
        const cur = lineSyms[k];
        if (cur.id === 'WILD') {
          matchCount++;
          if (baseSym.id !== 'WILD') usedWild = true;
        } else if (cur.id === baseSym.id) {
          matchCount++;
          allWilds = false;
        } else {
          break;
        }
      }

      if (allWilds && matchCount === 5) {
        // 5x DIAMOND WILD -> PROGRESSIVE MEGA JACKPOT!!
        hitMegaJackpot = true;
        const jpAmt = state.progressiveJackpot;
        state.progressiveJackpot = 250000;
        totalPayout += jpAmt;
        winLines.push({
          lineIdx: l,
          rows: pattern,
          count: 5,
          sym: SLOT_SYMBOLS[0],
          amount: jpAmt,
          hasWild: true
        });
        continue;
      }

      const rawMult = baseSym.pays[matchCount] || 0;
      if (rawMult > 0) {
        const wildBoost = usedWild ? 2 : 1;
        const lineWin = slotsGame.betPerLine * rawMult * wildBoost * mult;
        totalPayout += lineWin;
        winLines.push({
          lineIdx: l,
          rows: pattern,
          count: matchCount,
          sym: baseSym,
          amount: lineWin,
          hasWild: usedWild
        });
      }
    }

    // 2. Evaluate Scatters anywhere on 5x3 grid
    const scatters = [];
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 3; row++) {
        if (slotsGame.grid[col][row].id === 'SCATTER') {
          scatters.push({ col, row });
        }
      }
    }
    slotsGame.scatterPositions = scatters;
    if (scatters.length >= 3) {
      const scatMult = scatters.length === 3 ? 5 : scatters.length === 4 ? 20 : 100;
      const scatPay = getSlotsTotalBet() * scatMult * mult;
      totalPayout += scatPay;
      slotsGame.freeSpinsLeft += 10;
      casinoSFX.playFeverTrigger();
      spawnCanvasConfetti(980, 560, 80);
      showCasinoToast(`🌟 NỔ ${scatters.length} SCATTER! Thưởng +10 Vòng Quay Miễn Phí FEVER x3!`, 'win', 4.2);
    }

    slotsGame.winningLines = winLines;
    slotsGame.lastWinAmount = totalPayout;
    state.stats.roundsPlayed++;
    state.stats.slotsSpins++;

    if (totalPayout > 0) {
      addChips(totalPayout, 'slots_win');
      if (hitMegaJackpot || totalPayout >= getSlotsTotalBet() * 12) {
        casinoSFX.playMegaJackpotCascade();
        spawnCanvasConfetti(980, 560, 95);
        spawnCanvasCoins(490, 290, 55, 1.25);
        spawnFloatingCallout(
          490,
          215,
          hitMegaJackpot ? `💎 MEGA JACKPOT +${formatNum(totalPayout)}!!` : `SIÊU THẮNG LỚN +${formatNum(totalPayout)}!`,
          '#fde047',
          28
        );
      } else {
        casinoSFX.playSlotPaylineLaser(winLines.length);
        casinoSFX.playWinFanfare(0.8);
        spawnCanvasCoins(490, 320, 24, 0.95);
        spawnFloatingCallout(490, 235, `+${formatNum(totalPayout)} PHỈNH! (${winLines.length} dòng)`, '#fde047', 23);
      }
      slotsGame.statusMsg = `🎉 Trúng ${winLines.length} dòng thưởng — Nhận +${formatNum(totalPayout)} Phỉnh!`;
    } else {
      slotsGame.statusMsg =
        slotsGame.freeSpinsLeft > 0
          ? `🔥 Chế độ FEVER x3 đang hoạt động (${slotsGame.freeSpinsLeft} lượt miễn phí còn lại)!`
          : 'Chưa khớp dòng thắng. Nhấn QUAY để săn 3 Ngôi Sao Fever hoặc 5 Kim Cương!';
    }

    if (slotsGame.autoSpin || slotsGame.freeSpinsLeft > 0) {
      slotsGame.autoDelayTimer = totalPayout > 0 ? 1.35 : 0.65;
    }

    saveCasinoState();
    renderSlotsSideAndControls();
  }

  function updateSlots(dt) {
    slotsGame.marqueePhase += dt * 4.5;
    slotsGame.laserCycleClock += dt;
    if (slotsGame.leverPullAnim > 0) {
      slotsGame.leverPullAnim = Math.max(0, slotsGame.leverPullAnim - dt * 2.6);
    }

    if (slotsGame.phase === 'SPINNING') {
      casinoSFX.playSlotSpinTick();
      let anySpinning = false;

      for (let r = 0; r < 5; r++) {
        const reel = slotsGame.reels[r];
        if (reel.spinning) {
          anySpinning = true;
          reel.scrollOffset = (reel.scrollOffset + dt * 1550) % 116;
          if (Math.random() < 0.35) {
            reel.blurSymbols[randInt(0, 3)] = randomSlotSymbol();
          }
          reel.stopTimer -= dt;
          if (reel.stopTimer <= 0) {
            reel.spinning = false;
            reel.bounceTimer = 0.22;
            casinoSFX.playSlotReelClunk(r);
          }
        } else if (reel.bounceTimer > 0) {
          reel.bounceTimer = Math.max(0, reel.bounceTimer - dt);
        }
      }

      if (!anySpinning) {
        evaluateSlotsOutcome(slotsGame._wasFreeSpinFlag);
      }
    } else if (slotsGame.autoSpin || slotsGame.freeSpinsLeft > 0) {
      if (slotsGame.autoDelayTimer > 0) {
        slotsGame.autoDelayTimer -= dt;
        if (slotsGame.autoDelayTimer <= 0 && (slotsGame.autoSpin || slotsGame.freeSpinsLeft > 0)) {
          slotsGame._wasFreeSpinFlag = slotsGame.freeSpinsLeft > 0;
          triggerSlotSpin();
        }
      }
    }
  }

  function drawSlotSymbolVector(g, sym, cx, cy, size = 82, blurred = false) {
    g.save();
    g.translate(cx, cy);
    if (blurred) g.scale(0.94, 1.24);

    const half = size * 0.44;
    roundRectPath(g, -half, -half, half * 2, half * 2, 11);
    g.fillStyle = sym.bg;
    g.fill();
    g.strokeStyle = sym.color;
    g.lineWidth = sym.id === 'WILD' || sym.id === 'SCATTER' ? 2.4 : 1.3;
    g.stroke();

    g.textAlign = 'center';
    g.textBaseline = 'middle';

    if (sym.id === 'WILD') {
      // Faceted Cyan-Gold Diamond + WILD banner
      g.fillStyle = '#38bdf8';
      g.beginPath();
      g.moveTo(-18, -8);
      g.lineTo(-10, -20);
      g.lineTo(10, -20);
      g.lineTo(18, -8);
      g.lineTo(0, 14);
      g.closePath();
      g.fill();
      g.strokeStyle = '#e0f2fe';
      g.lineWidth = 1.5;
      g.stroke();

      g.fillStyle = '#fde047';
      g.font = '900 12px "Segoe UI", sans-serif';
      g.fillText('WILD x2', 0, 23);
    } else if (sym.id === 'SEVEN') {
      g.fillStyle = '#fde047';
      g.font = '900 30px Georgia, serif';
      g.fillText('777', 1, 2);
      g.fillStyle = '#ef4444';
      g.fillText('777', -1, 0);
    } else if (sym.id === 'CROWN') {
      g.fillStyle = '#facc15';
      g.beginPath();
      g.moveTo(-22, 12);
      g.lineTo(-24, -12);
      g.lineTo(-9, 0);
      g.lineTo(0, -18);
      g.lineTo(9, 0);
      g.lineTo(24, -12);
      g.lineTo(22, 12);
      g.closePath();
      g.fill();
      g.fillStyle = '#fef9c3';
      g.font = '800 10px sans-serif';
      g.fillText('VIP', 0, 23);
    } else if (sym.id === 'CAR') {
      // Sleek gold hypercar silhouette
      g.fillStyle = '#f59e0b';
      roundRectPath(g, -25, -2, 50, 13, 5);
      g.fill();
      g.beginPath();
      g.moveTo(-14, -2);
      g.lineTo(-5, -13);
      g.lineTo(12, -13);
      g.lineTo(20, -2);
      g.closePath();
      g.fill();
      g.fillStyle = '#0f172a';
      g.beginPath();
      g.arc(-14, 12, 6, 0, Math.PI * 2);
      g.arc(14, 12, 6, 0, Math.PI * 2);
      g.fill();
    } else if (sym.id === 'SCATTER') {
      // 5-Point Glowing Fever Star
      g.fillStyle = '#f0abfc';
      g.beginPath();
      for (let p = 0; p < 10; p++) {
        const rad = p % 2 === 0 ? 22 : 9.5;
        const a = -Math.PI * 0.5 + (p * Math.PI) / 5;
        const sx = Math.cos(a) * rad;
        const sy = Math.sin(a) * rad - 4;
        if (p === 0) g.moveTo(sx, sy);
        else g.lineTo(sx, sy);
      }
      g.closePath();
      g.fill();
      g.fillStyle = '#fde047';
      g.font = '900 10px sans-serif';
      g.fillText('SCATTER', 0, 23);
    } else {
      const iconMap = { CASH: '💵', BELL: '🔔', CLOVER: '🍀', CHERRY: '🍒' };
      g.font = '28px "Segoe UI Emoji", "Segoe UI Symbol", sans-serif';
      g.fillText(iconMap[sym.id] || '💎', 0, -2);
      g.fillStyle = sym.color;
      g.font = '800 9.5px "Segoe UI", sans-serif';
      g.fillText(sym.id, 0, 22);
    }

    g.restore();
  }

  function drawSlotsCanvas(g, w, h, dt) {
    const inFever = slotsGame.freeSpinsLeft > 0;
    drawLuxuryFeltBackground(
      g,
      w,
      h,
      inFever ? '#3b0764' : '#1e0b30',
      inFever ? '🔥 FEVER FREE SPINS NHÂN x3 ĐANG KÍCH HOẠT! 🔥' : 'DIAMOND 777 • MÁY XÈNG HOÀNG GIA 20 DÒNG',
      slotsGame.statusMsg
    );

    // 1. Progressive MEGA JACKPOT Illuminated Marquee Header
    const jpX = 140;
    const jpY = 62;
    const jpW = 660;
    const jpH = 58;
    g.save();
    roundRectPath(g, jpX, jpY, jpW, jpH, 14);
    const jpGrad = g.createLinearGradient(jpX, jpY, jpX + jpW, jpY + jpH);
    jpGrad.addColorStop(0, '#451a03');
    jpGrad.addColorStop(0.5, '#78350f');
    jpGrad.addColorStop(1, '#451a03');
    g.fillStyle = jpGrad;
    g.fill();
    g.strokeStyle = '#fde047';
    g.lineWidth = 2.6;
    g.stroke();

    // Chasing marquee bulbs
    for (let b = 0; b < 22; b++) {
      const on = (b + Math.floor(slotsGame.marqueePhase)) % 2 === 0;
      g.fillStyle = on ? '#fef08a' : '#92400e';
      g.beginPath();
      g.arc(jpX + 18 + b * 29.5, jpY + 6, 3.2, 0, Math.PI * 2);
      g.arc(jpX + 18 + b * 29.5, jpY + jpH - 6, 3.2, 0, Math.PI * 2);
      g.fill();
    }

    g.fillStyle = '#fef08a';
    g.font = '900 24px "Segoe UI", system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(`💎 MEGA JACKPOT: ${formatNum(state.progressiveJackpot)} PHỈNH 💎`, jpX + jpW * 0.5, jpY + jpH * 0.5 + 1);
    g.restore();

    // 2. 5-Reel x 3-Row Chrome & Gold Slot Cabinet Window
    const cabX = 128;
    const cabY = 132;
    const cabW = 684;
    const cabH = 358;
    const colW = cabW / 5;
    const rowH = cabH / 3;

    g.save();
    roundRectPath(g, cabX - 8, cabY - 8, cabW + 16, cabH + 16, 18);
    g.fillStyle = '#090d16';
    g.fill();
    g.strokeStyle = inFever ? '#f0abfc' : '#f59e0b';
    g.lineWidth = 4;
    g.stroke();

    // Clip interior of 5x3 reel drum window
    roundRectPath(g, cabX, cabY, cabW, cabH, 12);
    g.clip();

    for (let col = 0; col < 5; col++) {
      const rx = cabX + col * colW;
      const reel = slotsGame.reels[col];

      // Drum cylinder vertical shading
      const drumG = g.createLinearGradient(rx, cabY, rx, cabY + cabH);
      drumG.addColorStop(0, '#0f172a');
      drumG.addColorStop(0.2, '#1e293b');
      drumG.addColorStop(0.5, '#263349');
      drumG.addColorStop(0.8, '#1e293b');
      drumG.addColorStop(1, '#0f172a');
      g.fillStyle = drumG;
      g.fillRect(rx, cabY, colW, cabH);

      g.strokeStyle = 'rgba(250, 204, 21, 0.28)';
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(rx, cabY);
      g.lineTo(rx, cabY + cabH);
      g.stroke();

      if (reel.spinning) {
        for (let k = -1; k < 3; k++) {
          const sy = cabY + k * rowH + (reel.scrollOffset % rowH) + rowH * 0.5;
          const sym = reel.blurSymbols[(k + 4) % 4];
          drawSlotSymbolVector(g, sym, rx + colW * 0.5, sy, 88, true);
        }
      } else {
        const bounceY = reel.bounceTimer > 0 ? Math.sin((reel.bounceTimer / 0.22) * Math.PI) * 14 : 0;
        for (let row = 0; row < 3; row++) {
          const sym = slotsGame.grid[col][row];
          const sy = cabY + row * rowH + rowH * 0.5 + bounceY;
          drawSlotSymbolVector(g, sym, rx + colW * 0.5, sy, 92, false);
        }
      }
    }
    g.restore();

    // 3. Animated Winning Payline Laser Beams!
    if (slotsGame.phase === 'IDLE' && slotsGame.winningLines.length > 0) {
      const activeIdx = Math.floor(slotsGame.laserCycleClock * 2.2) % slotsGame.winningLines.length;
      for (let i = 0; i < slotsGame.winningLines.length; i++) {
        const wl = slotsGame.winningLines[i];
        const isSpotlight = i === activeIdx;
        const colHex = PAYLINE_COLORS[wl.lineIdx % PAYLINE_COLORS.length];

        g.save();
        g.strokeStyle = colHex;
        g.lineWidth = isSpotlight ? 5.5 : 2.2;
        g.globalAlpha = isSpotlight ? 0.95 : 0.35;
        if (isSpotlight) {
          g.shadowColor = colHex;
          g.shadowBlur = 16;
        }
        g.beginPath();
        for (let c = 0; c < 5; c++) {
          const px = cabX + c * colW + colW * 0.5;
          const py = cabY + wl.rows[c] * rowH + rowH * 0.5;
          if (c === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.stroke();

        if (isSpotlight) {
          for (let c = 0; c < wl.count; c++) {
            const px = cabX + c * colW + colW * 0.5;
            const py = cabY + wl.rows[c] * rowH + rowH * 0.5;
            roundRectPath(g, px - 44, py - 44, 88, 88, 12);
            g.stroke();
          }
          // Per-line payout pill
          const pillY = cabY + wl.rows[2] * rowH + rowH * 0.5;
          roundRectPath(g, 490 - 88, pillY - 14, 176, 28, 14);
          g.fillStyle = 'rgba(15, 23, 42, 0.94)';
          g.fill();
          g.fillStyle = '#fde047';
          g.font = '900 12.5px "Segoe UI", sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(`Dòng #${wl.lineIdx + 1}: +${formatNum(wl.amount)}`, 490, pillY);
        }
        g.restore();
      }
    }

    // 4. Right Mechanical Arcade Pull-Lever (Clickable!)
    const levBaseX = 856;
    const levBaseY = 365;
    const pullT = Math.sin(slotsGame.leverPullAnim * Math.PI);
    const knobY = lerp(175, 345, pullT);

    g.save();
    // Side mount box
    roundRectPath(g, 820, 325, 28, 68, 6);
    g.fillStyle = '#d97706';
    g.fill();
    // Chrome shaft
    g.strokeStyle = '#e2e8f0';
    g.lineWidth = 8;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(levBaseX - 8, levBaseY);
    g.lineTo(levBaseX + 10, knobY);
    g.stroke();

    // Glowing Ruby Lever Knob
    const knobG = g.createRadialGradient(levBaseX + 4, knobY - 6, 3, levBaseX + 10, knobY, 24);
    knobG.addColorStop(0, '#fecaca');
    knobG.addColorStop(0.4, '#ef4444');
    knobG.addColorStop(1, '#7f1d1d');
    g.fillStyle = knobG;
    g.beginPath();
    g.arc(levBaseX + 10, knobY, 22, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#fde047';
    g.lineWidth = 2;
    g.stroke();

    g.fillStyle = '#fde68a';
    g.font = '800 11px "Segoe UI", sans-serif';
    g.textAlign = 'center';
    g.fillText('GẠT CẦN', levBaseX + 8, 416);
    g.restore();

    // Bottom Win & Bet Readout Bar inside Canvas
    g.save();
    roundRectPath(g, 128, 504, 684, 40, 10);
    g.fillStyle = 'rgba(10, 14, 24, 0.88)';
    g.fill();
    g.strokeStyle = 'rgba(245, 197, 66, 0.4)';
    g.lineWidth = 1.2;
    g.stroke();

    g.font = '800 13px "Segoe UI", sans-serif';
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.fillStyle = '#cbd5e1';
    g.fillText(`20 Dòng × ${formatNum(slotsGame.betPerLine)} = Tổng Cược: ${formatNum(getSlotsTotalBet())} Phỉnh`, 146, 524);

    g.textAlign = 'right';
    g.fillStyle = slotsGame.lastWinAmount > 0 ? '#4ade80' : '#fde047';
    g.fillText(
      slotsGame.freeSpinsLeft > 0
        ? `🔥 FEVER x3: Còn ${slotsGame.freeSpinsLeft} lượt • Thắng: ${formatNum(slotsGame.lastWinAmount)}`
        : `Tiền Thắng Vòng Này: ${formatNum(slotsGame.lastWinAmount)} Phỉnh`,
      796,
      524
    );
    g.restore();

    updateAndDrawCanvasFX(g, dt);
  }

  function renderSlotsSideAndControls() {
    if (!dom.sidePanel || !dom.actionBar || state.activeStation !== 'slots') return;
    const spinning = slotsGame.phase === 'SPINNING';

    dom.sidePanel.innerHTML = `
      <div class="dc-side-box">
        <h4>🎰 Bảng Hệ Số DIAMOND 777</h4>
        <div style="font-size:11.5px;line-height:1.6;color:#e2e8f0;">
          <div>💎 <strong>5x Kim Cương Wild</strong>: <strong style="color:#fde047;">NỔ MEGA JACKPOT!</strong></div>
          <div>💎 <strong>Wild Ghép Dòng</strong>: Nhân đôi <strong>x2</strong> dòng thắng</div>
          <div>7️⃣ <strong>Số 777 Đỏ</strong>: 3x=20 • 4x=65 • 5x=280</div>
          <div>👑 <strong>Vương Miện</strong>: 3x=14 • 4x=40 • 5x=140</div>
          <div>🏎️ <strong>Siêu Xe Vàng</strong>: 3x=10 • 4x=28 • 5x=90</div>
          <div>💵 <strong>Đô La / 🔔 Chuông</strong>: Tới 55x / 38x</div>
          <div>🌟 <strong>3+ Ngôi Sao Scatter</strong>: <strong style="color:#f0abfc;">10 Lượt FEVER x3!</strong></div>
        </div>
      </div>
      <div class="dc-side-box">
        <h4>⚙️ Chọn Mức Cược / Dòng (20 Dòng)</h4>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
          ${slotsGame.lineLevels.map((lv) => `
            <button type="button" class="dc-mini-btn" data-slot-lv="${lv}" style="${slotsGame.betPerLine === lv ? 'border-color:#fde047;background:#78350f;color:#fef08a;' : ''}" ${spinning ? 'disabled' : ''}>
              ${lv}/dòng (${formatNum(lv * 20)})
            </button>
          `).join('')}
        </div>
      </div>
    `;

    dom.sidePanel.querySelectorAll('[data-slot-lv]').forEach((btn) => {
      btn.addEventListener('click', () => {
        slotsGame.betPerLine = Number(btn.getAttribute('data-slot-lv')) || 10;
        casinoSFX.playChipClink(1);
        renderSlotsSideAndControls();
      });
    });

    dom.actionBar.innerHTML = `
      <button type="button" class="dc-btn ${slotsGame.autoSpin ? 'crimson' : 'emerald'}" id="dc-sl-auto">
        ${slotsGame.autoSpin ? '⏹ Dừng Quay Tự Động' : '🔄 Quay Tự Động (Auto)'}
      </button>
      <button type="button" class="dc-btn purple" id="dc-sl-max" ${spinning ? 'disabled' : ''}>⚡ Cược Tối Đa (5.000)</button>
      <button type="button" class="dc-btn gold" id="dc-sl-spin" ${spinning ? 'disabled' : ''}>
        ${spinning
          ? '🎰 ĐANG QUAY...'
          : slotsGame.freeSpinsLeft > 0
            ? `🔥 QUAY MIỄN PHÍ FEVER (${slotsGame.freeSpinsLeft})`
            : `🎰 QUAY NGAY (${formatNum(getSlotsTotalBet())} Phỉnh)`}
      </button>
    `;

    dom.actionBar.querySelector('#dc-sl-auto')?.addEventListener('click', () => {
      slotsGame.autoSpin = !slotsGame.autoSpin;
      if (slotsGame.autoSpin && slotsGame.phase === 'IDLE') {
        slotsGame._wasFreeSpinFlag = slotsGame.freeSpinsLeft > 0;
        triggerSlotSpin();
      } else {
        renderSlotsSideAndControls();
      }
    });

    dom.actionBar.querySelector('#dc-sl-max')?.addEventListener('click', () => {
      slotsGame.betPerLine = 250;
      slotsGame._wasFreeSpinFlag = slotsGame.freeSpinsLeft > 0;
      triggerSlotSpin();
    });

    dom.actionBar.querySelector('#dc-sl-spin')?.addEventListener('click', () => {
      slotsGame._wasFreeSpinFlag = slotsGame.freeSpinsLeft > 0;
      triggerSlotSpin();
    });
  }

  // ============================================================================
  // SECTION 11: STATION 9A — CÁ CƯỢC ĐUA NGỰA & SIÊU XE INSIDE TRACK (6 RACERS)
  // ============================================================================
  const DERBY_HORSE_ROSTER = [
    { name: 'Xích Thố Đại Đế', odds: 2, baseSpd: 1.03, stamina: 0.92, burst: 0.90, color: '#ef4444', silk: '#fde047', form: '1-1-2-1' },
    { name: 'Tia Chớp Thái Bình', odds: 3, baseSpd: 1.01, stamina: 0.88, burst: 0.94, color: '#38bdf8', silk: '#ffffff', form: '2-1-3-1' },
    { name: 'Hắc Long Bất Bại', odds: 5, baseSpd: 0.99, stamina: 0.91, burst: 0.89, color: '#a855f7', silk: '#fef08a', form: '3-2-1-4' },
    { name: 'Thần Gió Sài Gòn', odds: 8, baseSpd: 0.97, stamina: 0.85, burst: 0.96, color: '#22c55e', silk: '#111827', form: '4-1-5-2' },
    { name: 'Mũi Tên Bạc', odds: 14, baseSpd: 0.94, stamina: 0.84, burst: 0.98, color: '#cbd5e1', silk: '#dc2626', form: '5-3-4-2' },
    { name: 'Ngựa Ô Kỳ Tích', odds: 24, baseSpd: 0.91, stamina: 0.82, burst: 1.05, color: '#f97316', silk: '#fef9c3', form: '6-5-2-6' }
  ];

  const DERBY_CAR_ROSTER = [
    { name: 'Zentorno V12 Vàng', odds: 2, baseSpd: 1.03, stamina: 0.93, burst: 0.91, color: '#facc15', silk: '#111827', form: '1-2-1-1' },
    { name: 'Obey 9F Twin-Turbo', odds: 3, baseSpd: 1.01, stamina: 0.89, burst: 0.94, color: '#38bdf8', silk: '#f8fafc', form: '1-3-2-1' },
    { name: 'Banshee GT Đỏ Đen', odds: 5, baseSpd: 0.99, stamina: 0.90, burst: 0.90, color: '#ef4444', silk: '#fde047', form: '2-2-4-1' },
    { name: 'Bóng Ma Neon Violet', odds: 8, baseSpd: 0.97, stamina: 0.86, burst: 0.96, color: '#c084fc', silk: '#ffffff', form: '4-2-1-5' },
    { name: 'Cá Mập Xanh Ngọc', odds: 14, baseSpd: 0.94, stamina: 0.84, burst: 0.99, color: '#2dd4bf', silk: '#0f172a', form: '3-6-4-3' },
    { name: 'Quái Thú Đường Phố', odds: 24, baseSpd: 0.91, stamina: 0.81, burst: 1.06, color: '#fb923c', silk: '#1e293b', form: '6-4-5-2' }
  ];

  const derbyGame = {
    mode: 'CAR', // 'HORSE' | 'CAR'
    phase: 'BETTING', // 'BETTING' | 'COUNTDOWN' | 'RACING' | 'RESULT'
    trackLength: 1000,
    cameraX: 0,
    countdown: 0,
    racers: [],
    winBets: {}, // laneIdx (0..5) -> chipAmount
    exactaPick: null, // { first: laneIdx, second: laneIdx, amount, odds }
    selectedFirstForExacta: null,
    finishOrder: [],
    commentary: 'Chọn Chiến Mã hoặc Siêu Xe yêu thích và đặt Phỉnh để bắt đầu cuộc đua nghẹt thở!',
    commentaryTimer: 0,
    sfxStepTimer: 0,
    photoFlashAlpha: 0,
    photoSlowMo: false,
    hoverLane: -1
  };

  function setupDerbyLineup() {
    const src = derbyGame.mode === 'CAR' ? DERBY_CAR_ROSTER : DERBY_HORSE_ROSTER;
    derbyGame.racers = src.map((r, idx) => ({
      lane: idx,
      name: r.name,
      odds: r.odds,
      baseSpd: r.baseSpd,
      stamina: r.stamina,
      burst: r.burst,
      color: r.color,
      silk: r.silk,
      form: r.form,
      dist: 0,
      vel: 0,
      targetVel: 0,
      surgeTimer: randFloat(0.4, 1.4),
      boostActive: false,
      animPhase: randFloat(0, Math.PI * 2),
      finished: false,
      finishTime: 0,
      rank: idx + 1
    }));
    derbyGame.finishOrder = [];
    derbyGame.cameraX = 0;
    derbyGame.photoFlashAlpha = 0;
    derbyGame.photoSlowMo = false;
  }
  setupDerbyLineup();

  function getDerbyTotalBet() {
    let sum = 0;
    for (const k of Object.keys(derbyGame.winBets)) sum += derbyGame.winBets[k] || 0;
    if (derbyGame.exactaPick) sum += derbyGame.exactaPick.amount || 0;
    return sum;
  }

  function placeDerbyWinBet(laneIdx) {
    if (derbyGame.phase !== 'BETTING' && derbyGame.phase !== 'RESULT') return;
    if (derbyGame.phase === 'RESULT') {
      derbyGame.phase = 'BETTING';
      derbyGame.winBets = {};
      derbyGame.exactaPick = null;
      setupDerbyLineup();
    }
    const amt = state.selectedChip;
    if (!spendChips(amt, true)) return;
    derbyGame.winBets[laneIdx] = (derbyGame.winBets[laneIdx] || 0) + amt;
    casinoSFX.playChipClink(2);
    renderDerbySideAndControls();
  }

  function placeDerbyExactaBet(firstLane, secondLane) {
    if (firstLane === secondLane) return;
    if (derbyGame.phase === 'RESULT') {
      derbyGame.phase = 'BETTING';
      derbyGame.winBets = {};
      derbyGame.exactaPick = null;
      setupDerbyLineup();
    }
    if (derbyGame.phase !== 'BETTING') return;
    const amt = state.selectedChip;
    if (!spendChips(amt, true)) return;
    const r1 = derbyGame.racers[firstLane];
    const r2 = derbyGame.racers[secondLane];
    const combinedOdds = Math.min(95, Math.round((r1.odds + 1) * (r2.odds * 0.65 + 1.5)));
    if (
      derbyGame.exactaPick &&
      derbyGame.exactaPick.first === firstLane &&
      derbyGame.exactaPick.second === secondLane
    ) {
      derbyGame.exactaPick.amount += amt;
    } else {
      if (derbyGame.exactaPick && derbyGame.exactaPick.amount > 0) {
        addChips(derbyGame.exactaPick.amount, 'refund');
      }
      derbyGame.exactaPick = {
        first: firstLane,
        second: secondLane,
        amount: amt,
        odds: combinedOdds
      };
    }
    casinoSFX.playChipClink(2);
    showCasinoToast(`Đã đặt Cược Nhất–Nhì (#${firstLane + 1} ➔ #${secondLane + 1}) tỷ lệ 1 ăn ${combinedOdds}!`, 'gold', 2.4);
    renderDerbySideAndControls();
  }

  function clearDerbyBets() {
    if (derbyGame.phase !== 'BETTING') return;
    const total = getDerbyTotalBet();
    if (total <= 0) return;
    derbyGame.winBets = {};
    derbyGame.exactaPick = null;
    addChips(total, 'refund');
    casinoSFX.playChipClink(2);
    renderDerbySideAndControls();
  }

  function startDerbyRace() {
    if (derbyGame.phase === 'COUNTDOWN' || derbyGame.phase === 'RACING') return;
    if (getDerbyTotalBet() <= 0) {
      showCasinoToast('Hãy chọn đặt Phỉnh vào ít nhất 1 Tay Đua trước khi xuất phát!', 'error');
      casinoSFX.playError();
      return;
    }
    setupDerbyLineup();
    derbyGame.phase = 'COUNTDOWN';
    derbyGame.countdown = 2.4;
    derbyGame.raceClock = 0;
    derbyGame.commentary = '🚦 Các tay đua đã vào vạch xuất phát! Chuẩn bị mở cổng...';
    casinoSFX.playChipClink(1);
    renderDerbySideAndControls();
  }

  function settleDerbyRace() {
    derbyGame.phase = 'RESULT';
    derbyGame.photoSlowMo = false;

    const first = derbyGame.finishOrder[0];
    const second = derbyGame.finishOrder[1];
    let totalReturn = 0;

    // 1. Win bets on 1st place
    const winBetOnFirst = derbyGame.winBets[first.lane] || 0;
    if (winBetOnFirst > 0) {
      totalReturn += winBetOnFirst * (1 + first.odds);
    }

    // 2. Exacta 1st-2nd bet
    let hitExacta = false;
    if (
      derbyGame.exactaPick &&
      derbyGame.exactaPick.first === first.lane &&
      second &&
      derbyGame.exactaPick.second === second.lane
    ) {
      hitExacta = true;
      totalReturn += derbyGame.exactaPick.amount * (1 + derbyGame.exactaPick.odds);
    }

    state.stats.roundsPlayed++;
    state.stats.derbyRaces++;

    const summary = `🏁 VỀ NHẤT: #${first.lane + 1} ${first.name} (1:${first.odds}) • Nhì: #${second.lane + 1} ${second.name}`;
    derbyGame.commentary = summary;

    if (totalReturn > 0) {
      addChips(totalReturn, 'derby_win');
      if (hitExacta || first.odds >= 8) {
        casinoSFX.playMegaJackpotCascade();
        spawnCanvasConfetti(980, 560, 85);
      } else {
        casinoSFX.playWinFanfare(0.95);
      }
      spawnCanvasCoins(490, 250, 38, 1.1);
      spawnFloatingCallout(490, 190, `🏆 THẮNG ĐUA +${formatNum(totalReturn)} PHỈNH!`, '#fde047', 26);
      showCasinoToast(`🎉 ${summary} — Bạn thắng +${formatNum(totalReturn)} Phỉnh!`, 'win', 4.0);
    } else {
      spawnFloatingCallout(490, 190, summary, '#f87171', 19);
      showCasinoToast(summary, 'gold', 3.0);
    }

    saveCasinoState();
    renderDerbySideAndControls();
  }

  function updateDerby(dt) {
    if (derbyGame.photoFlashAlpha > 0) {
      derbyGame.photoFlashAlpha = Math.max(0, derbyGame.photoFlashAlpha - dt * 2.2);
    }

    if (derbyGame.phase === 'COUNTDOWN') {
      derbyGame.countdown -= dt;
      if (derbyGame.countdown <= 0) {
        derbyGame.phase = 'RACING';
        casinoSFX.playDerbyStartBell();
        derbyGame.commentary = '🔥 CỔNG MỞ — TẤT CẢ BỨT TỐC LAO VỀ PHÍA TRƯỚC!';
        renderDerbySideAndControls();
      }
      return;
    }

    if (derbyGame.phase !== 'RACING') return;

    // Photo-finish dramatic slow-motion near finish line!
    let maxDist = 0;
    let secondDist = 0;
    for (let i = 0; i < 6; i++) {
      const d = derbyGame.racers[i].dist;
      if (d > maxDist) {
        secondDist = maxDist;
        maxDist = d;
      } else if (d > secondDist) {
        secondDist = d;
      }
    }

    const nearFinish = maxDist > derbyGame.trackLength - 68 && maxDist < derbyGame.trackLength;
    const tightBattle = maxDist - secondDist < 26;
    derbyGame.photoSlowMo = nearFinish && tightBattle;
    const simDt = dt * (derbyGame.photoSlowMo ? 0.34 : 1.0);
    derbyGame.raceClock += simDt;

    derbyGame.sfxStepTimer -= dt;
    if (derbyGame.sfxStepTimer <= 0) {
      derbyGame.sfxStepTimer = derbyGame.mode === 'CAR' ? 0.12 : 0.17;
      casinoSFX.playDerbyGallopOrTurbo(derbyGame.mode === 'CAR', 0.65);
    }

    const progressFrac = clamp(maxDist / derbyGame.trackLength, 0, 1);

    for (let i = 0; i < 6; i++) {
      const r = derbyGame.racers[i];
      if (r.finished) {
        r.dist += r.vel * simDt * 0.45;
        continue;
      }

      r.surgeTimer -= simDt;
      if (r.surgeTimer <= 0) {
        r.surgeTimer = randFloat(0.55, 1.35);
        // Late-race burst kick favors high-burst dark horses for authentic thrills while respecting odds!
        const lateKick = progressFrac > 0.68 ? r.burst * randFloat(0.92, 1.24) : randFloat(0.88, 1.14);
        const stamFactor = progressFrac > 0.75 ? lerp(0.92, 1.06, r.stamina) : 1.0;
        r.targetVel = 112 * r.baseSpd * lateKick * stamFactor;
        r.boostActive = lateKick > 1.09;
      }

      r.vel = lerp(r.vel, r.targetVel || 108 * r.baseSpd, Math.min(1, simDt * 3.8));
      r.dist += r.vel * simDt;
      r.animPhase += r.vel * simDt * 0.22;

      if (r.dist >= derbyGame.trackLength && !r.finished) {
        r.finished = true;
        r.finishTime = derbyGame.raceClock;
        if (derbyGame.finishOrder.length === 0) {
          derbyGame.photoFlashAlpha = 0.92;
          casinoSFX.playPhotoShutter();
        }
        derbyGame.finishOrder.push(r);
      }
    }

    // Update live rankings 1..6
    const sorted = [...derbyGame.racers].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.dist - a.dist;
    });
    for (let k = 0; k < sorted.length; k++) {
      sorted[k].rank = k + 1;
    }

    // Live sportscaster commentary
    derbyGame.commentaryTimer -= dt;
    if (derbyGame.commentaryTimer <= 0) {
      derbyGame.commentaryTimer = 1.25;
      const leader = sorted[0];
      const chaser = sorted[1];
      if (progressFrac > 0.8) {
        derbyGame.commentary = `🎙️ NƯỚC RÚT CUỐI: #${leader.lane + 1} ${leader.name} đang dẫn đầu, #${chaser.lane + 1} ${chaser.name} bám sát nút!`;
      } else {
        derbyGame.commentary = `🎙️ Mốc ${Math.round(maxDist)}m: #${leader.lane + 1} ${leader.name} giữ ngôi đầu đoàn đua!`;
      }
    }

    derbyGame.cameraX = clamp(maxDist - 520, 0, derbyGame.trackLength - 680);

    if (derbyGame.finishOrder.length >= 6 || (derbyGame.finishOrder.length >= 2 && maxDist > derbyGame.trackLength + 55)) {
      // Ensure all remaining racers are appended in distance order
      for (const s of sorted) {
        if (!derbyGame.finishOrder.includes(s)) derbyGame.finishOrder.push(s);
      }
      settleDerbyRace();
    }
  }

  function drawDerbyRacerSprite(g, r, sx, sy, isCar) {
    g.save();
    g.translate(sx, sy);

    if (isCar) {
      // Turbo Nitrous Flame
      if (r.boostActive && derbyGame.phase === 'RACING') {
        const flLen = 18 + Math.sin(r.animPhase * 3) * 8;
        const flG = g.createLinearGradient(-28, 0, -28 - flLen, 0);
        flG.addColorStop(0, '#38bdf8');
        flG.addColorStop(0.5, '#fde047');
        flG.addColorStop(1, 'rgba(239,68,68,0)');
        g.fillStyle = flG;
        g.beginPath();
        g.moveTo(-26, -4);
        g.lineTo(-26 - flLen, 0);
        g.lineTo(-26, 5);
        g.closePath();
        g.fill();
      }

      // Neon Underglow
      g.fillStyle = r.color;
      g.globalAlpha = 0.35;
      g.beginPath();
      g.ellipse(0, 10, 28, 6, 0, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;

      // Sleek Side-Profile Supercar Body
      g.fillStyle = r.color;
      roundRectPath(g, -26, -5, 52, 13, 5);
      g.fill();
      g.beginPath();
      g.moveTo(-14, -5);
      g.lineTo(-4, -14);
      g.lineTo(12, -14);
      g.lineTo(22, -5);
      g.closePath();
      g.fill();

      // Rear Wing
      g.fillStyle = r.silk;
      g.fillRect(-28, -11, 5, 7);
      // Windshield
      g.fillStyle = '#0f172a';
      g.beginPath();
      g.moveTo(-2, -12);
      g.lineTo(10, -12);
      g.lineTo(17, -5);
      g.lineTo(-9, -5);
      g.closePath();
      g.fill();

      // Wheels
      g.fillStyle = '#090d16';
      g.beginPath();
      g.arc(-15, 8, 6, 0, Math.PI * 2);
      g.arc(15, 8, 6, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#e2e8f0';
      g.lineWidth = 1.4;
      g.stroke();
    } else {
      // Animated Galloping Thoroughbred Horse + Jockey!
      const stride = derbyGame.phase === 'RACING' ? Math.sin(r.animPhase) : 0;
      const bob = derbyGame.phase === 'RACING' ? Math.abs(Math.cos(r.animPhase)) * -3.5 : 0;
      g.translate(0, bob);

      // Legs
      g.strokeStyle = darkenHex(r.color, 35);
      g.lineWidth = 3.2;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-11, 2);
      g.lineTo(-16 - stride * 9, 14);
      g.moveTo(-7, 2);
      g.lineTo(-4 + stride * 7, 14);
      g.moveTo(10, 2);
      g.lineTo(16 + stride * 10, 13);
      g.moveTo(7, 2);
      g.lineTo(4 - stride * 8, 14);
      g.stroke();

      // Horse Torso, Neck & Head
      g.fillStyle = r.color;
      g.beginPath();
      g.ellipse(0, -1, 16, 7.5, 0, 0, Math.PI * 2);
      g.fill();

      g.beginPath();
      g.moveTo(10, -4);
      g.lineTo(20, -14);
      g.lineTo(26, -11);
      g.lineTo(24, -6);
      g.lineTo(14, 2);
      g.closePath();
      g.fill();

      // Flowing Tail
      g.strokeStyle = darkenHex(r.color, 45);
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(-15, -3);
      g.quadraticCurveTo(-24, -5 + stride * 4, -27, 3);
      g.stroke();

      // Jockey Silk Jersey & Helmet
      g.fillStyle = r.silk;
      roundRectPath(g, -5, -15, 11, 9, 3);
      g.fill();
      g.fillStyle = '#fde68a';
      g.beginPath();
      g.arc(3, -18, 4, 0, Math.PI * 2);
      g.fill();
    }

    // Saddle/Door Number Badge
    g.fillStyle = '#0f172a';
    roundRectPath(g, -8, -6, 15, 11, 3);
    g.fill();
    g.fillStyle = '#fde047';
    g.font = '900 9.5px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(r.lane + 1), -0.5, -0.5);

    g.restore();
  }

  function drawDerbyCanvas(g, w, h, dt) {
    const isCar = derbyGame.mode === 'CAR';
    drawLuxuryFeltBackground(
      g,
      w,
      h,
      isCar ? '#0b192c' : '#0b3622',
      isCar ? 'INSIDE TRACK TURBO • ĐUA SIÊU XE ĐƯỜNG ĐUA NEON' : 'INSIDE TRACK DERBY • TRƯỜNG ĐUA NGỰA HOÀNG GIA',
      derbyGame.commentary
    );

    if (derbyGame.phase === 'BETTING') {
      // Render Interactive 6-Racer Selection Cards on Canvas!
      for (let i = 0; i < 6; i++) {
        const r = derbyGame.racers[i];
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = 42 + col * 454;
        const cy = 76 + row * 124;
        const cw = 438;
        const ch = 110;
        const winBet = derbyGame.winBets[i] || 0;
        const isHov = derbyGame.hoverLane === i;

        g.save();
        roundRectPath(g, cx, cy, cw, ch, 12);
        g.fillStyle = isHov ? 'rgba(250, 204, 21, 0.16)' : 'rgba(10, 15, 25, 0.78)';
        g.fill();
        g.lineWidth = winBet > 0 ? 2.6 : isHov ? 2.0 : 1.3;
        g.strokeStyle = winBet > 0 ? '#4ade80' : isHov ? '#fde047' : 'rgba(245, 197, 66, 0.35)';
        g.stroke();

        // Racer Sprite Preview
        drawDerbyRacerSprite(g, r, cx + 52, cy + 58, isCar);

        g.textAlign = 'left';
        g.fillStyle = '#fef08a';
        g.font = '900 15.5px "Segoe UI", sans-serif';
        g.fillText(`#${i + 1} ${r.name}`, cx + 102, cy + 28);

        g.fillStyle = '#cbd5e1';
        g.font = '600 11.5px "Segoe UI", sans-serif';
        g.fillText(`Phong độ: [${r.form}]  •  Nước rút: ${Math.round(r.burst * 95)}`, cx + 102, cy + 50);

        // Stat bar
        roundRectPath(g, cx + 102, cy + 62, 185, 8, 4);
        g.fillStyle = 'rgba(255,255,255,0.12)';
        g.fill();
        roundRectPath(g, cx + 102, cy + 62, 185 * clamp(r.baseSpd * 0.88, 0.4, 1), 8, 4);
        g.fillStyle = r.color;
        g.fill();

        g.fillStyle = '#94a3b8';
        g.font = '600 11px "Segoe UI", sans-serif';
        g.fillText('Nhấp để đặt Cược Về Nhất', cx + 102, cy + 90);

        // Odds Badge on Right
        roundRectPath(g, cx + cw - 102, cy + 16, 86, 36, 9);
        g.fillStyle = '#78350f';
        g.fill();
        g.strokeStyle = '#fde047';
        g.lineWidth = 1.4;
        g.stroke();
        g.fillStyle = '#fef08a';
        g.font = '900 16px "Segoe UI", sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(`1 : ${r.odds}`, cx + cw - 59, cy + 34);

        if (winBet > 0) {
          drawChipStack(g, cx + cw - 58, cy + 84, winBet, 13, 5);
        }
        g.restore();
      }

      // Exacta info strip at bottom
      g.save();
      roundRectPath(g, 42, 460, 892, 76, 12);
      g.fillStyle = 'rgba(15, 23, 42, 0.85)';
      g.fill();
      g.strokeStyle = 'rgba(245, 197, 66, 0.35)';
      g.lineWidth = 1.2;
      g.stroke();
      g.fillStyle = '#fde047';
      g.font = '800 13px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.fillText(
        derbyGame.exactaPick
          ? `🎯 Đang giữ vé CƯỢC SONG MÃ NHẤT–NHÌ: #${derbyGame.exactaPick.first + 1} Nhất ➔ #${derbyGame.exactaPick.second + 1} Nhì • Cược ${formatNum(derbyGame.exactaPick.amount)} (1 ăn ${derbyGame.exactaPick.odds}!)`
          : '💡 MẸO CAO THỦ: Bạn có thể chọn thêm Cược Cặp Nhất–Nhì (Exacta ăn tới 1:95) ở cột bên phải!',
        490,
        498
      );
      g.restore();

      updateAndDrawCanvasFX(g, dt);
      return;
    }

    // LIVE SIDE-SCROLLING RACE VIEW (COUNTDOWN / RACING / RESULT)
    const trackTop = 108;
    const laneH = 62;
    const trackH = laneH * 6;
    const worldToScreenX = (worldM) => 95 + (worldM - derbyGame.cameraX) * 1.12;

    g.save();
    roundRectPath(g, 24, 68, w - 48, 468, 14);
    g.clip();

    // Grandstand & Floodlights Backdrop
    const skyG = g.createLinearGradient(0, 68, 0, trackTop);
    skyG.addColorStop(0, '#090d16');
    skyG.addColorStop(1, '#1e293b');
    g.fillStyle = skyG;
    g.fillRect(24, 68, w - 48, trackTop - 68);

    // Track Surface (Emerald Turf vs Midnight Neon Asphalt)
    for (let l = 0; l < 6; l++) {
      const ly = trackTop + l * laneH;
      if (isCar) {
        g.fillStyle = l % 2 === 0 ? '#1e293b' : '#172033';
      } else {
        g.fillStyle = l % 2 === 0 ? '#15803d' : '#166534';
      }
      g.fillRect(24, ly, w - 48, laneH);

      g.strokeStyle = isCar ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.22)';
      g.lineWidth = 1;
      g.setLineDash([14, 10]);
      g.beginPath();
      g.moveTo(24, ly + laneH);
      g.lineTo(w - 24, ly + laneH);
      g.stroke();
      g.setLineDash([]);
    }

    // Scrolling Distance Furlong Poles every 100m
    for (let m = 0; m <= derbyGame.trackLength; m += 100) {
      const px = worldToScreenX(m);
      if (px < 10 || px > w - 10) continue;
      const isFinish = m === derbyGame.trackLength;

      if (isFinish) {
        // Checkered Finish Line + Red Laser Photo-Finish Beam!
        for (let r = 0; r < 24; r++) {
          g.fillStyle = r % 2 === 0 ? '#ffffff' : '#111827';
          g.fillRect(px - 6, trackTop + r * (trackH / 24), 6, trackH / 24);
          g.fillStyle = r % 2 === 1 ? '#ffffff' : '#111827';
          g.fillRect(px, trackTop + r * (trackH / 24), 6, trackH / 24);
        }
        g.strokeStyle = '#ef4444';
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(px, trackTop);
        g.lineTo(px, trackTop + trackH);
        g.stroke();
      } else {
        g.strokeStyle = 'rgba(255,255,255,0.16)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(px, trackTop);
        g.lineTo(px, trackTop + trackH);
        g.stroke();

        g.fillStyle = '#fde047';
        g.font = '800 10.5px sans-serif';
        g.textAlign = 'center';
        g.fillText(`${derbyGame.trackLength - m}m`, px, trackTop - 8);
      }
    }

    // Draw all 6 Racers
    for (let l = 0; l < 6; l++) {
      const r = derbyGame.racers[l];
      const rx = worldToScreenX(r.dist);
      const ry = trackTop + l * laneH + laneH * 0.54;
      drawDerbyRacerSprite(g, r, rx, ry, isCar);

      // Player bet tag floating behind player-backed racers
      if (derbyGame.winBets[l] > 0) {
        g.fillStyle = '#fde047';
        g.font = '800 10.5px "Segoe UI", sans-serif';
        g.textAlign = 'right';
        g.fillText(`★ CƯỢC CỦA BẠN`, rx - 34, ry - 4);
      }
    }

    // Top Live Leaderboard Strip
    const sorted = [...derbyGame.racers].sort((a, b) => a.rank - b.rank);
    for (let k = 0; k < 6; k++) {
      const rk = sorted[k];
      const bx = 42 + k * 150;
      roundRectPath(g, bx, 73, 142, 24, 6);
      g.fillStyle = k === 0 ? 'rgba(180, 83, 9, 0.92)' : 'rgba(15, 23, 42, 0.86)';
      g.fill();
      g.fillStyle = '#ffffff';
      g.font = '800 10.5px "Segoe UI", sans-serif';
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText(`${k + 1}. #${rk.lane + 1} ${rk.name.slice(0, 12)}`, bx + 7, 85);
    }

    // Countdown Overlay
    if (derbyGame.phase === 'COUNTDOWN') {
      g.fillStyle = 'rgba(0,0,0,0.48)';
      g.fillRect(24, 68, w - 48, 468);
      g.fillStyle = '#fde047';
      g.font = '900 68px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(Math.ceil(derbyGame.countdown)), w * 0.5, 300);
    }

    // Photo-Finish Banner Badge
    if (derbyGame.photoSlowMo) {
      roundRectPath(g, w * 0.5 - 150, 118, 300, 32, 16);
      g.fillStyle = 'rgba(220, 38, 38, 0.92)';
      g.fill();
      g.fillStyle = '#ffffff';
      g.font = '900 13px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('📸 CAMERA PHOTO-FINISH CHẬM!', w * 0.5, 134);
    }

    // Camera Shutter White Flash
    if (derbyGame.photoFlashAlpha > 0) {
      g.fillStyle = `rgba(255, 255, 255, ${derbyGame.photoFlashAlpha})`;
      g.fillRect(24, 68, w - 48, 468);
    }

    g.restore();
    updateAndDrawCanvasFX(g, dt);
  }

  function renderDerbySideAndControls() {
    if (!dom.sidePanel || !dom.actionBar || state.activeStation !== 'derby') return;
    const totalBet = getDerbyTotalBet();
    const busy = derbyGame.phase === 'COUNTDOWN' || derbyGame.phase === 'RACING';

    dom.sidePanel.innerHTML = `
      <div class="dc-side-box">
        <h4>🏇 Chế Độ Trường Đua</h4>
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          <button type="button" class="dc-mini-btn" id="dc-db-mode-car" style="flex:1;${derbyGame.mode === 'CAR' ? 'border-color:#fde047;color:#fde047;' : ''}" ${busy ? 'disabled' : ''}>🏎️ Siêu Xe</button>
          <button type="button" class="dc-mini-btn" id="dc-db-mode-horse" style="flex:1;${derbyGame.mode === 'HORSE' ? 'border-color:#fde047;color:#fde047;' : ''}" ${busy ? 'disabled' : ''}>🏇 Đua Ngựa</button>
        </div>
        <div style="font-size:12px;">Tổng vé cược: <strong style="color:#4ade80;">${formatNum(totalBet)} Phỉnh</strong></div>
      </div>
      <div class="dc-side-box">
        <h4>🎯 Đặt Vé Song Mã Nhất–Nhì (Exacta)</h4>
        <p style="margin:0 0 6px;font-size:11px;color:#cbd5e1;">Dự đoán chính xác Tay đua Về Nhất &amp; Về Nhì nhận thưởng khủng tới <strong>1:95</strong>!</p>
        <div style="display:flex;gap:6px;margin-bottom:6px;">
          <select id="dc-db-ex1" class="dc-input" style="font-size:12px;padding:5px;" ${busy ? 'disabled' : ''}>
            ${derbyGame.racers.map((r, idx) => `<option value="${idx}">Nhất: #${idx + 1} (${1}:${r.odds})</option>`).join('')}
          </select>
          <select id="dc-db-ex2" class="dc-input" style="font-size:12px;padding:5px;" ${busy ? 'disabled' : ''}>
            ${derbyGame.racers.map((r, idx) => `<option value="${idx}" ${idx === 1 ? 'selected' : ''}>Nhì: #${idx + 1}</option>`).join('')}
          </select>
        </div>
        <button type="button" class="dc-btn purple" id="dc-db-place-ex" style="width:100%;padding:7px;" ${busy ? 'disabled' : ''}>
          Đặt Vé Nhất–Nhì (+${formatNum(state.selectedChip)})
        </button>
      </div>
      <div class="dc-side-box">
        <h4>📋 Bảng Tỷ Lệ Chặng Này</h4>
        ${derbyGame.racers.map((r, i) => `
          <div style="display:flex;justify-content:space-between;font-size:11.5px;padding:2px 0;">
            <span>#${i + 1} ${r.name}</span>
            <strong style="color:#fde047;">1:${r.odds} ${derbyGame.winBets[i] ? `(${formatNum(derbyGame.winBets[i])})` : ''}</strong>
          </div>
        `).join('')}
      </div>
    `;

    dom.sidePanel.querySelector('#dc-db-mode-car')?.addEventListener('click', () => {
      if (busy) return;
      derbyGame.mode = 'CAR';
      setupDerbyLineup();
      casinoSFX.playChipClink(1);
      renderDerbySideAndControls();
    });
    dom.sidePanel.querySelector('#dc-db-mode-horse')?.addEventListener('click', () => {
      if (busy) return;
      derbyGame.mode = 'HORSE';
      setupDerbyLineup();
      casinoSFX.playChipClink(1);
      renderDerbySideAndControls();
    });
    dom.sidePanel.querySelector('#dc-db-place-ex')?.addEventListener('click', () => {
      const f = Number(dom.sidePanel.querySelector('#dc-db-ex1')?.value || 0);
      const s = Number(dom.sidePanel.querySelector('#dc-db-ex2')?.value || 1);
      if (f === s) {
        showCasinoToast('Tay đua Nhất và Nhì phải khác nhau!', 'error');
        return;
      }
      placeDerbyExactaBet(f, s);
    });

    if (derbyGame.phase === 'RESULT') {
      dom.actionBar.innerHTML = `
        <button type="button" class="dc-btn emerald" id="dc-db-new">🔄 Chọn Kèo Chặng Mới</button>
        <button type="button" class="dc-btn gold" id="dc-db-rerun">🏁 ĐUA LẠI KÈO CŨ NGAY</button>
      `;
      dom.actionBar.querySelector('#dc-db-new')?.addEventListener('click', () => {
        derbyGame.phase = 'BETTING';
        derbyGame.winBets = {};
        derbyGame.exactaPick = null;
        setupDerbyLineup();
        renderDerbySideAndControls();
      });
      dom.actionBar.querySelector('#dc-db-rerun')?.addEventListener('click', () => {
        const prevWin = { ...derbyGame.winBets };
        const prevEx = derbyGame.exactaPick ? { ...derbyGame.exactaPick } : null;
        let cost = 0;
        for (const k of Object.keys(prevWin)) cost += prevWin[k];
        if (prevEx) cost += prevEx.amount;
        if (!spendChips(cost, true)) return;
        derbyGame.winBets = prevWin;
        derbyGame.exactaPick = prevEx;
        startDerbyRace();
      });
    } else {
      dom.actionBar.innerHTML = `
        <button type="button" class="dc-btn" id="dc-db-clear" ${busy || totalBet <= 0 ? 'disabled' : ''}>Xóa Vé Cược</button>
        <button type="button" class="dc-btn gold" id="dc-db-start" ${busy ? 'disabled' : ''}>
          ${busy ? '🏁 CUỘC ĐUA ĐANG DIỄN RA...' : '🚦 BẮT ĐẦU CUỘC ĐUA INSIDE TRACK!'}
        </button>
      `;
      dom.actionBar.querySelector('#dc-db-clear')?.addEventListener('click', clearDerbyBets);
      dom.actionBar.querySelector('#dc-db-start')?.addEventListener('click', startDerbyRace);
    }
  }

  // ============================================================================
  // SECTION 12: STATION 9B — VÒNG QUAY KIM CƯƠNG 20 Ô & SIÊU XE VÀNG PODIUM
  // ============================================================================
  const LUCKY_WHEEL_SLICES = [
    { id: 0, label: '🏆 SIÊU XE VÀNG', type: 'PODIUM_CAR', val: 0, bg: '#facc15', fg: '#1c0a00' },
    { id: 1, label: '🪙 2.500 Phỉnh', type: 'CHIPS', val: 2500, bg: '#7c2d12', fg: '#ffffff' },
    { id: 2, label: '💵 $5,000', type: 'CASH', val: 5000, bg: '#14532d', fg: '#dcfce7' },
    { id: 3, label: '👑 +500 VIP', type: 'VIP', val: 500, bg: '#1e3a8a', fg: '#dbeafe' },
    { id: 4, label: '🪙 5.000 Phỉnh', type: 'CHIPS', val: 5000, bg: '#991b1b', fg: '#fef08a' },
    { id: 5, label: '🎁 QUÀ BÍ ẨN', type: 'MYSTERY', val: 0, bg: '#581c87', fg: '#f3e8ff' },
    { id: 6, label: '💵 $10,000', type: 'CASH', val: 10000, bg: '#065f46', fg: '#ffffff' },
    { id: 7, label: '🪙 7.500 Phỉnh', type: 'CHIPS', val: 7500, bg: '#78350f', fg: '#fef9c3' },
    { id: 8, label: '🕴️ VEST BỐ GIÀ', type: 'OUTFIT', val: 5000, bg: '#312e81', fg: '#e0e7ff' },
    { id: 9, label: '👑 +1.000 VIP', type: 'VIP', val: 1000, bg: '#0c4a6e', fg: '#bae6fd' },
    { id: 10, label: '🪙 15.000 Phỉnh', type: 'CHIPS', val: 15000, bg: '#b91c1c', fg: '#fde047' },
    { id: 11, label: '💵 $15,000', type: 'CASH', val: 15000, bg: '#166534', fg: '#ffffff' },
    { id: 12, label: '👑 +750 VIP', type: 'VIP', val: 750, bg: '#1d4ed8', fg: '#ffffff' },
    { id: 13, label: '🪙 10.000 Phỉnh', type: 'CHIPS', val: 10000, bg: '#92400e', fg: '#fef08a' },
    { id: 14, label: '🎁 HÒM BÁU VIP', type: 'MYSTERY_GOLD', val: 0, bg: '#701a75', fg: '#fae8ff' },
    { id: 15, label: '💵 $20,000', type: 'CASH', val: 20000, bg: '#15803d', fg: '#fef08a' },
    { id: 16, label: '🪙 20.000 Phỉnh', type: 'CHIPS', val: 20000, bg: '#991b1b', fg: '#ffffff' },
    { id: 17, label: '👑 +2.500 VIP', type: 'VIP', val: 2500, bg: '#0369a1', fg: '#fef08a' },
    { id: 18, label: '💵 $30,000', type: 'CASH', val: 30000, bg: '#047857', fg: '#fde047' },
    { id: 19, label: '🪙 25.000 Phỉnh', type: 'CHIPS', val: 25000, bg: '#b45309', fg: '#ffffff' }
  ];

  const luckyWheelGame = {
    phase: 'IDLE', // 'IDLE' | 'CHARGING' | 'SPINNING' | 'CELEBRATING'
    angle: 0,
    angVel: 0,
    flapperAngle: 0,
    lastPegIdx: 0,
    powerCharge: 0.72,
    draggingPower: false,
    dragStartY: 0,
    podiumCelebrationTimer: 0,
    wonSlice: null,
    history: [],
    statusText: 'Mỗi ngày Quý Khách được tặng 1 LƯỢT QUAY MIỄN PHÍ! Cơ hội 1/20 trúng Siêu Xe Vàng Podium!'
  };

  function isFreeWheelAvailableToday() {
    return state.lastFreeWheelDay !== todayStamp();
  }

  function spawnGoldPodiumHypercarOutside() {
    if (state.podiumSpawnedSession) return true;
    const spawnX = 203.5;
    const spawnZ = -110.0;
    const spawnY = activeCtx?.world?.getGroundHeight ? activeCtx.world.getGroundHeight(spawnX, spawnZ) : 0.05;

    let spawnedCar = null;
    try {
      if (activeCtx?.casinoWorld?.deliverPodiumHypercarOutside) {
        spawnedCar = activeCtx.casinoWorld.deliverPodiumHypercarOutside() || null;
      }
      if (!spawnedCar && activeCtx?.vehiclesExtra?.spawnExtraVehicle) {
        spawnedCar = activeCtx.vehiclesExtra.spawnExtraVehicle('zentorno', spawnX, spawnY, spawnZ, 0, {
          color: 0xf5c542,
          plate: 'GOLD VIP',
          isHero: true
        });
      } else if (!spawnedCar && activeCtx?.vehiclesExtra?.spawnVehicle) {
        spawnedCar = activeCtx.vehiclesExtra.spawnVehicle('zentorno', spawnX, spawnY, spawnZ, 0, {
          color: 0xf5c542,
          plate: 'GOLD VIP',
          isHero: true
        });
      }
    } catch (_) {}

    if (!spawnedCar && activeCtx?.vehicles?.spawnVehicle) {
      try {
        spawnedCar = activeCtx.vehicles.spawnVehicle('banshee', spawnX, spawnY, spawnZ, 0, {
          color: 0xf5c542,
          plate: 'GOLD VIP',
          isParked: true,
          isHero: true
        });
      } catch (_) {}
    }

    if (spawnedCar) {
      spawnedCar.displayName = 'Siêu Xe Vàng Hoàng Gia (Giải Đặc Biệt Vạn Bảo Đổ Phường)';
      spawnedCar.maxSpeed = Math.max(spawnedCar.maxSpeed || 38, 44);
      spawnedCar.accel = Math.max(spawnedCar.accel || 22, 27);
      // Upgrade body paint materials to gleaming 24K Gold Chrome!
      if (spawnedCar.mesh && spawnedCar.mesh.traverse) {
        spawnedCar.mesh.traverse((child) => {
          if (child.isMesh && child.material && child.material.color) {
            const hex = child.material.color.getHex?.() ?? 0;
            if (hex === 0xf5c542 || child.name?.toLowerCase().includes('body')) {
              child.material = child.material.clone();
              child.material.color.setHex(0xfacc15);
              if ('metalness' in child.material) child.material.metalness = 0.92;
              if ('roughness' in child.material) child.material.roughness = 0.12;
            }
          }
        });
      }
      state.podiumSpawnedSession = true;
    }

    // Trigger 3D Podium Turntable celebration spin inside Casino interior!
    luckyWheelGame.podiumCelebrationTimer = 9.0;
    return Boolean(spawnedCar);
  }

  function spinLuckyWheel(customPower = null) {
    if (luckyWheelGame.phase === 'SPINNING') return false;

    const freeReady = isFreeWheelAvailableToday();
    if (freeReady) {
      state.lastFreeWheelDay = todayStamp();
    } else {
      const vipSpinCost = 1000;
      if (!spendChips(vipSpinCost, true)) return false;
    }

    const pwr = customPower !== null ? clamp(customPower, 0.35, 1.0) : randFloat(0.58, 0.98);
    luckyWheelGame.angVel = 11.5 + pwr * 9.5 + randFloat(-0.8, 0.8);
    luckyWheelGame.phase = 'SPINNING';
    luckyWheelGame.wonSlice = null;
    luckyWheelGame.statusText = '💎 Vòng Quay Kim Cương đang xoay tít — Hồi hộp chờ kim chỉ dừng lại!';
    activeCtx?.casinoWorld?.spinLuckyWheelVisual?.();
    casinoSFX.playWheelPegClick(1.0);
    saveCasinoState();
    renderLuckyWheelSideAndControls();
    return true;
  }

  function resolveLuckyWheelStop() {
    luckyWheelGame.phase = 'CELEBRATING';
    const sliceArc = (Math.PI * 2) / 20;
    // Top pointer is at -Math.PI / 2 in world coordinates
    const rel = (((-Math.PI * 0.5 - luckyWheelGame.angle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const idx = Math.floor(((rel + sliceArc * 0.5) % (Math.PI * 2)) / sliceArc) % 20;
    const prize = LUCKY_WHEEL_SLICES[idx];
    luckyWheelGame.wonSlice = prize;
    luckyWheelGame.history.unshift(prize.label);
    luckyWheelGame.history = luckyWheelGame.history.slice(0, 8);

    state.stats.roundsPlayed++;
    state.stats.wheelSpins++;

    if (prize.type === 'PODIUM_CAR') {
      state.podiumWon = true;
      spawnGoldPodiumHypercarOutside();
      activeCtx?.casinoWorld?.triggerJackpotCelebration?.();
      // If player already won it before, also grant 50,000 bonus chips!
      addChips(25000, 'wheel_podium_bonus');
      casinoSFX.playMegaJackpotCascade();
      spawnCanvasConfetti(980, 560, 120);
      spawnCanvasCoins(340, 290, 65, 1.3);
      spawnFloatingCallout(490, 185, '🏆 TRÚNG SIÊU XE VÀNG HOÀNG GIA + 25.000 PHỈNH!!', '#fde047', 26);
      luckyWheelGame.statusText = '🏆 KỲ TÍCH! SIÊU XE VÀNG PODIUM ĐÃ ĐỖ TRƯỚC SẢNH ĐÓN KHÁCH CASINO (203.5, -110)!';
      activeCtx?.ui?.showBanner?.('TRÚNG SIÊU XE PODIUM!', 'Siêu Xe Vàng 24K đã được Valet đỗ ngay trước cửa chính Vạn Bảo Đổ Phường!', 'gold', 5.5);
      activeCtx?.ui?.showSubtitle?.('Bước ra cửa chính *Vạn Bảo Đổ Phường* để lái chiếc *Siêu Xe Vàng Hoàng Gia* của riêng bạn!', 6.5);
    } else if (prize.type === 'CHIPS') {
      addChips(prize.val, 'wheel_win');
      casinoSFX.playWinFanfare(0.9);
      spawnCanvasCoins(340, 290, 32, 1.0);
      spawnFloatingCallout(490, 210, `+${formatNum(prize.val)} PHỈNH!`, '#fde047', 26);
      luckyWheelGame.statusText = `🎉 Chúc mừng! Bạn quay trúng +${formatNum(prize.val)} Phỉnh!`;
    } else if (prize.type === 'CASH') {
      setPlayerCash(getPlayerCash() + prize.val, true);
      casinoSFX.playWinFanfare(0.9);
      spawnCanvasCoins(340, 290, 30, 1.0);
      spawnFloatingCallout(490, 210, `+${formatCash(prize.val)} TIỀN MẶT!`, '#4ade80', 26);
      luckyWheelGame.statusText = `💵 Tuyệt vời! Cộng trực tiếp +${formatCash(prize.val)} vào ví Tiền Mặt!`;
    } else if (prize.type === 'VIP') {
      state.vipPoints += prize.val;
      casinoSFX.playWinFanfare(0.8);
      spawnFloatingCallout(490, 210, `+${formatNum(prize.val)} ĐIỂM THƯỢNG LƯU VIP!`, '#38bdf8', 24);
      luckyWheelGame.statusText = `👑 Đã cộng +${formatNum(prize.val)} Điểm Thượng Lưu VIP!`;
    } else if (prize.type === 'OUTFIT') {
      if (activeCtx?.player && activeCtx?.characters?.setOutfit) {
        try {
          activeCtx.characters.setOutfit(activeCtx.player.rig || activeCtx.player, 'luxury_suit');
          activeCtx.player.outfit = 'luxury_suit';
        } catch (_) {}
      }
      addChips(5000, 'wheel_outfit');
      casinoSFX.playWinFanfare(0.95);
      spawnCanvasConfetti(980, 560, 55);
      spawnFloatingCallout(490, 210, '🕴️ MỞ KHÓA VEST BỐ GIÀ + 5.000 PHỈNH!', '#e0e7ff', 23);
      luckyWheelGame.statusText = '🕴️ Bạn đã mặc bộ Âu Phục Thượng Lưu VIP + tặng kèm 5.000 Phỉnh!';
    } else {
      // MYSTERY / MYSTERY_GOLD: Full Armor + Tactical Weapon + Bonus Chips!
      const p = activeCtx?.player;
      const wpnPool = prize.type === 'MYSTERY_GOLD' ? ['carbine', 'grenade'] : ['smg', 'shotgun', 'carbine'];
      const chosenWpn = pickRandom(wpnPool);
      const chipGift = prize.type === 'MYSTERY_GOLD' ? 12000 : 6000;
      if (p) {
        p.hp = p.maxHp || 100;
        p.armor = 100;
        if (!p.ammo) p.ammo = {};
        p.ammo[chosenWpn] = (p.ammo[chosenWpn] || 0) + (chosenWpn === 'grenade' ? 15 : 180);
        try {
          activeCtx?.characters?.equipWeapon?.(p, chosenWpn);
        } catch (_) {}
      }
      addChips(chipGift, 'wheel_mystery');
      casinoSFX.playMegaJackpotCascade();
      spawnCanvasConfetti(980, 560, 70);
      spawnFloatingCallout(490, 205, `🎁 QUÀ BÍ ẨN: GIÁP 100% + VŨ KHÍ ${chosenWpn.toUpperCase()} + ${formatNum(chipGift)} PHỈNH!`, '#f0abfc', 21);
      luckyWheelGame.statusText = `🎁 Mở Hòm Bí Ẩn: Hồi đầy Giáp 100%, trang bị súng ${chosenWpn.toUpperCase()} kèm đạn & +${formatNum(chipGift)} Phỉnh!`;
    }

    saveCasinoState(true);
    refreshHeaderHUD();
    renderLuckyWheelSideAndControls();
  }

  function updateLuckyWheel(dt) {
    // Celebrate on 3D Casino Podium Car Mesh if present!
    if (luckyWheelGame.podiumCelebrationTimer > 0) {
      luckyWheelGame.podiumCelebrationTimer = Math.max(0, luckyWheelGame.podiumCelebrationTimer - dt);
      const podiumMesh = activeCtx?.casinoWorld?.podiumCarMesh;
      if (podiumMesh && podiumMesh.rotation) {
        podiumMesh.rotation.y += dt * 4.2;
      }
    }

    // Spring return on top rubber flapper pointer
    luckyWheelGame.flapperAngle = lerp(luckyWheelGame.flapperAngle, 0, Math.min(1, dt * 15));

    if (luckyWheelGame.phase === 'SPINNING') {
      luckyWheelGame.angle += luckyWheelGame.angVel * dt;
      // Realistic viscous + peg Coulomb friction deceleration
      const drag = luckyWheelGame.angVel > 3.0 ? 0.42 : 0.62;
      luckyWheelGame.angVel = Math.max(0, luckyWheelGame.angVel - (luckyWheelGame.angVel * drag + 0.38) * dt);

      const sliceArc = (Math.PI * 2) / 20;
      const curPeg = Math.floor((luckyWheelGame.angle + sliceArc * 0.5) / sliceArc);
      if (curPeg !== luckyWheelGame.lastPegIdx) {
        luckyWheelGame.lastPegIdx = curPeg;
        const velRatio = clamp(luckyWheelGame.angVel / 14, 0.18, 1.0);
        luckyWheelGame.flapperAngle = -0.52 * velRatio - 0.14;
        casinoSFX.playWheelPegClick(velRatio);
      }

      if (luckyWheelGame.angVel <= 0.035) {
        luckyWheelGame.angVel = 0;
        resolveLuckyWheelStop();
      }
    }
  }

  function drawLuckyWheelCanvas(g, w, h, dt) {
    drawLuxuryFeltBackground(
      g,
      w,
      h,
      '#260e38',
      'VÒNG QUAY KIM CƯƠNG 20 Ô • DIAMOND LUCKY WHEEL',
      luckyWheelGame.statusText
    );

    const cx = 345;
    const cy = 304;
    const outerR = 212;
    const sliceArc = (Math.PI * 2) / 20;

    // 1. Pedestal Base & Neon Aura Halo behind Wheel
    g.save();
    const aura = g.createRadialGradient(cx, cy, outerR * 0.65, cx, cy, outerR + 38);
    aura.addColorStop(0, 'rgba(250, 204, 21, 0.25)');
    aura.addColorStop(0.6, 'rgba(168, 85, 247, 0.18)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = aura;
    g.beginPath();
    g.arc(cx, cy, outerR + 38, 0, Math.PI * 2);
    g.fill();

    // Gold A-Frame Stand
    g.fillStyle = '#78350f';
    g.beginPath();
    g.moveTo(cx - 88, cy + 236);
    g.lineTo(cx - 26, cy + 40);
    g.lineTo(cx + 26, cy + 40);
    g.lineTo(cx + 88, cy + 236);
    g.closePath();
    g.fill();
    g.strokeStyle = '#fde047';
    g.lineWidth = 2.5;
    g.stroke();

    // Outer Gold Bezel with 40 Chasing LEDs
    g.translate(cx, cy);
    g.fillStyle = '#3b0764';
    g.beginPath();
    g.arc(0, 0, outerR + 14, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#facc15';
    g.lineWidth = 5;
    g.stroke();

    const bulbTick = Math.floor((activeCtx.elapsed || 0) * 8);
    for (let b = 0; b < 40; b++) {
      const ba = (b * Math.PI * 2) / 40;
      const lit = (b + bulbTick) % 2 === 0;
      g.fillStyle = lit ? '#fef9c3' : '#6b21a8';
      g.beginPath();
      g.arc(Math.cos(ba) * (outerR + 7), Math.sin(ba) * (outerR + 7), 3.1, 0, Math.PI * 2);
      g.fill();
    }

    // Rotating 20-Slice Wheel Rotor
    g.save();
    g.rotate(luckyWheelGame.angle);

    for (let i = 0; i < 20; i++) {
      const sl = LUCKY_WHEEL_SLICES[i];
      const a0 = i * sliceArc - sliceArc * 0.5;
      const a1 = a0 + sliceArc;

      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, outerR, a0, a1);
      g.closePath();
      g.fillStyle = sl.bg;
      g.fill();
      g.strokeStyle = '#fde047';
      g.lineWidth = 1.4;
      g.stroke();

      // Radial Text Label along wedge
      g.save();
      g.rotate(i * sliceArc);
      g.fillStyle = sl.fg;
      g.font = sl.id === 0 ? '900 11.5px "Segoe UI", sans-serif' : '800 11px "Segoe UI", sans-serif';
      g.textAlign = 'right';
      g.textBaseline = 'middle';
      g.fillText(sl.label, outerR - 14, 0);
      g.restore();

      // Brass Perimeter Peg on boundary
      const pegX = Math.cos(a0) * (outerR - 4);
      const pegY = Math.sin(a0) * (outerR - 4);
      g.fillStyle = '#fef08a';
      g.beginPath();
      g.arc(pegX, pegY, 3.6, 0, Math.PI * 2);
      g.fill();
    }

    // Center Diamond Crown Hub
    const hubG = g.createRadialGradient(-8, -8, 4, 0, 0, 44);
    hubG.addColorStop(0, '#fef9c3');
    hubG.addColorStop(0.55, '#f59e0b');
    hubG.addColorStop(1, '#78350f');
    g.fillStyle = hubG;
    g.beginPath();
    g.arc(0, 0, 44, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2.4;
    g.stroke();

    g.fillStyle = '#1c0a00';
    g.font = '900 22px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('💎', 0, 1);
    g.restore(); // end wheel rotor

    // Top 12-o'clock Spring-Loaded Flapper Pointer!
    g.save();
    g.translate(0, -(outerR + 15));
    g.rotate(luckyWheelGame.flapperAngle);
    g.fillStyle = '#ef4444';
    g.strokeStyle = '#fef08a';
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(-12, -10);
    g.lineTo(12, -10);
    g.lineTo(0, 26);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();

    g.restore(); // end wheel group

    // 2. RIGHT SHOWCASE CARD: Podium Gold Hypercar Turntable Preview + Drag Power Meter!
    const cardX = 610;
    const cardY = 82;
    const cardW = 334;
    const cardH = 442;
    g.save();
    roundRectPath(g, cardX, cardY, cardW, cardH, 16);
    g.fillStyle = 'rgba(12, 8, 22, 0.88)';
    g.fill();
    g.strokeStyle = '#facc15';
    g.lineWidth = 2;
    g.stroke();

    g.textAlign = 'center';
    g.fillStyle = '#fde047';
    g.font = '900 15.5px "Segoe UI", sans-serif';
    g.fillText('🏆 GIẢI ĐẶC BIỆT BỤC PODIUM', cardX + cardW * 0.5, cardY + 30);

    // Animated Spotlight Turntable with 24K Gold Hypercar Illustration
    const carBob = Math.sin((activeCtx.elapsed || 0) * 2.5) * 3;
    g.fillStyle = 'rgba(250, 204, 21, 0.16)';
    g.beginPath();
    g.ellipse(cardX + cardW * 0.5, cardY + 132, 118, 26, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#fde047';
    g.lineWidth = 2;
    g.stroke();

    g.save();
    g.translate(cardX + cardW * 0.5, cardY + 118 + carBob);
    g.scale(2.15, 2.15);
    g.fillStyle = '#facc15';
    roundRectPath(g, -34, -4, 68, 15, 6);
    g.fill();
    g.beginPath();
    g.moveTo(-18, -4);
    g.lineTo(-6, -15);
    g.lineTo(14, -15);
    g.lineTo(26, -4);
    g.closePath();
    g.fill();
    g.fillStyle = '#fef9c3';
    g.fillRect(-36, -11, 6, 8);
    g.fillStyle = '#0f172a';
    g.beginPath();
    g.arc(-19, 11, 7, 0, Math.PI * 2);
    g.arc(19, 11, 7, 0, Math.PI * 2);
    g.fill();
    g.restore();

    g.fillStyle = state.podiumWon ? '#4ade80' : '#fef3c7';
    g.font = '800 12.5px "Segoe UI", sans-serif';
    g.fillText(
      state.podiumWon ? '✅ ĐÃ TRÚNG! Đỗ tại cổng Sòng Bạc (203.5, -110)' : 'Zentorno / Banshee Mạ Vàng 24K Độc Bản!',
      cardX + cardW * 0.5,
      cardY + 182
    );

    // Interactive Pull-Down Power Gauge
    g.fillStyle = '#cbd5e1';
    g.font = '700 12px "Segoe UI", sans-serif';
    g.fillText('⚡ LỰC KÉO TAY QUAY (Kéo thanh hoặc nhấn Quay):', cardX + cardW * 0.5, cardY + 224);

    const barX = cardX + 32;
    const barY = cardY + 240;
    const barW = cardW - 64;
    const barH = 22;
    roundRectPath(g, barX, barY, barW, barH, 11);
    g.fillStyle = '#1e293b';
    g.fill();
    const fillW = barW * clamp(luckyWheelGame.powerCharge, 0.2, 1.0);
    const pwrG = g.createLinearGradient(barX, 0, barX + barW, 0);
    pwrG.addColorStop(0, '#22c55e');
    pwrG.addColorStop(0.55, '#facc15');
    pwrG.addColorStop(1, '#ef4444');
    roundRectPath(g, barX, barY, fillW, barH, 11);
    g.fillStyle = pwrG;
    g.fill();
    g.strokeStyle = '#fde047';
    g.lineWidth = 1.4;
    roundRectPath(g, barX, barY, barW, barH, 11);
    g.stroke();

    // Recent Wheel Prizes List
    g.fillStyle = '#fde047';
    g.font = '800 12.5px "Segoe UI", sans-serif';
    g.fillText('🎁 KẾT QUẢ QUAY GẦN ĐÂY:', cardX + cardW * 0.5, cardY + 294);

    if (luckyWheelGame.history.length === 0) {
      g.fillStyle = '#94a3b8';
      g.font = '600 12px "Segoe UI", sans-serif';
      g.fillText('Chưa có lượt quay nào trong phiên này.', cardX + cardW * 0.5, cardY + 324);
    } else {
      for (let i = 0; i < Math.min(5, luckyWheelGame.history.length); i++) {
        g.fillStyle = i === 0 ? '#fef08a' : '#cbd5e1';
        g.font = i === 0 ? '800 13px "Segoe UI", sans-serif' : '600 12px "Segoe UI", sans-serif';
        g.fillText(`${i === 0 ? '★ ' : '• '}${luckyWheelGame.history[i]}`, cardX + cardW * 0.5, cardY + 322 + i * 23);
      }
    }
    g.restore();

    updateAndDrawCanvasFX(g, dt);
  }

  function renderLuckyWheelSideAndControls() {
    if (!dom.sidePanel || !dom.actionBar || state.activeStation !== 'lucky_wheel') return;
    const freeToday = isFreeWheelAvailableToday();
    const spinning = luckyWheelGame.phase === 'SPINNING';

    dom.sidePanel.innerHTML = `
      <div class="dc-side-box">
        <h4>💎 Trạng Thái Vòng Quay</h4>
        <div style="font-size:12.5px;line-height:1.65;">
          <div>Lượt Miễn Phí Hôm Nay: <strong style="color:${freeToday ? '#4ade80' : '#94a3b8'};">${freeToday ? 'SẴN SÀNG (1 Lượt)' : 'Đã Dùng'}</strong></div>
          <div>Lượt Quay Thêm VIP: <strong style="color:#fde047;">1.000 Phỉnh / lượt</strong></div>
          <div>Tổng Lần Đã Quay: <strong>${state.stats.wheelSpins}</strong></div>
        </div>
      </div>
      <div class="dc-side-box">
        <h4>🏆 Cơ Cấu 20 Ô Giải Thưởng</h4>
        <div style="font-size:11.5px;color:#cbd5e1;line-height:1.55;">
          • <strong>1 Ô Vàng Đặc Biệt</strong>: Siêu Xe Vàng 24K đỗ ngay cổng Casino!<br/>
          • <strong>7 Ô Phỉnh</strong>: Từ 2.500 tới 25.000 Phỉnh<br/>
          • <strong>5 Ô Tiền Mặt</strong>: Từ $5,000 tới $30,000<br/>
          • <strong>4 Ô Điểm Thượng Lưu</strong>: Tới +2.500 VIP<br/>
          • <strong>3 Ô Quà Bí Ẩn &amp; Vest Bố Già</strong>: Vũ khí hạng nặng, Giáp 100% &amp; Âu phục VIP!
        </div>
      </div>
      ${state.podiumWon ? `
      <div class="dc-side-box" style="border-color:#4ade80;">
        <h4 style="color:#4ade80;">🏎️ Gọi Valet Đưa Xe Tới Cổng</h4>
        <button type="button" class="dc-btn emerald" id="dc-wh-spawn-car" style="width:100%;">Triệu Hồi Siêu Xe Vàng Ra Cổng</button>
      </div>
      ` : ''}
    `;

    dom.sidePanel.querySelector('#dc-wh-spawn-car')?.addEventListener('click', () => {
      state.podiumSpawnedSession = false;
      spawnGoldPodiumHypercarOutside();
      casinoSFX.playWinFanfare(0.8);
      showCasinoToast('🏎️ Valet đã đưa Siêu Xe Vàng 24K ra trước sảnh Vạn Bảo Đổ Phường (203.5, -110)!', 'win', 3.5);
    });

    dom.actionBar.innerHTML = `
      <button type="button" class="dc-btn gold" id="dc-wh-spin" ${spinning ? 'disabled' : ''}>
        ${spinning
          ? '💎 VÒNG QUAY ĐANG XOAY...'
          : freeToday
            ? '🎁 QUAY MIỄN PHÍ HÔM NAY!'
            : '💎 QUAY THÊM LƯỢT VIP (1.000 Phỉnh)'}
      </button>
    `;
    dom.actionBar.querySelector('#dc-wh-spin')?.addEventListener('click', () => {
      spinLuckyWheel(luckyWheelGame.powerCharge);
    });
  }

  // ============================================================================
  // SECTION 13: HIGH-ROLLER CHALLENGES, SESSION PROFIT LEDGER & VIP CONCIERGE
  // ============================================================================
  const CASINO_CHALLENGES = [
    {
      id: 'ch_taixiu_5',
      title: 'Cao Thủ Lắc Xí Ngầu',
      desc: 'Tham gia 5 phiên Tài Xỉu Lắc Xí Ngầu Đỏ Đen',
      statKey: 'taixiuPlayed',
      target: 5,
      rewardChips: 2500,
      rewardVip: 350
    },
    {
      id: 'ch_xocdia_5',
      title: 'Ông Hoàng Chiếu Đỏ',
      desc: 'Tham gia 5 ván Xóc Đĩa Truyền Thống',
      statKey: 'xocdiaPlayed',
      target: 5,
      rewardChips: 2500,
      rewardVip: 350
    },
    {
      id: 'ch_roulette_5',
      title: 'Vòng Xoay Châu Âu',
      desc: 'Quay 5 ván Bàn Roulette Đỏ Đen 0–36',
      statKey: 'roulettePlayed',
      target: 5,
      rewardChips: 3000,
      rewardVip: 400
    },
    {
      id: 'ch_cards_8',
      title: 'Thần Bài Hoàng Gia',
      desc: 'Hoàn thành tổng cộng 8 ván Xì Dách, Poker hoặc Baccarat',
      customProgress: () =>
        (state.stats.blackjackPlayed || 0) +
        (state.stats.pokerPlayed || 0) +
        (state.stats.baccaratPlayed || 0),
      target: 8,
      rewardChips: 4500,
      rewardVip: 600
    },
    {
      id: 'ch_slots_12',
      title: 'Thợ Săn Kim Cương 777',
      desc: 'Quay 12 lượt Máy Xèng Kim Cương Diamond 777',
      statKey: 'slotsSpins',
      target: 12,
      rewardChips: 3500,
      rewardVip: 500
    },
    {
      id: 'ch_derby_3',
      title: 'Ông Trùm Trường Đua',
      desc: 'Đặt cược 3 chặng Đua Siêu Xe / Đua Ngựa Inside Track',
      statKey: 'derbyRaces',
      target: 3,
      rewardChips: 3000,
      rewardVip: 450
    },
    {
      id: 'ch_bigwin_20k',
      title: 'Một Tay Đổi Đời',
      desc: 'Thắng ít nhất 20.000 Phỉnh trong một ván bất kỳ',
      statKey: 'biggestSingleWin',
      target: 20000,
      rewardChips: 6000,
      rewardVip: 1000
    }
  ];

  const claimedChallenges = new Set();
  const sessionChipHistory = [];

  function loadClaimedChallenges() {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}_challenges`);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          for (const id of arr) claimedChallenges.add(String(id));
        }
      }
    } catch (_) {}
  }

  function saveClaimedChallenges() {
    try {
      localStorage.setItem(`${STORAGE_KEY}_challenges`, JSON.stringify([...claimedChallenges]));
    } catch (_) {}
  }

  function recordChipLedgerPoint() {
    const val = state.chips;
    if (sessionChipHistory.length === 0 || sessionChipHistory[sessionChipHistory.length - 1] !== val) {
      sessionChipHistory.push(val);
      if (sessionChipHistory.length > 32) sessionChipHistory.shift();
    }
  }

  function getChallengeProgress(ch) {
    if (typeof ch.customProgress === 'function') return ch.customProgress();
    return Number(state.stats[ch.statKey] || 0);
  }

  function claimCasinoChallenge(chId) {
    const ch = CASINO_CHALLENGES.find((item) => item.id === chId);
    if (!ch || claimedChallenges.has(ch.id)) return false;
    const prog = getChallengeProgress(ch);
    if (prog < ch.target) {
      showCasinoToast('Chưa hoàn thành đủ tiến độ nhiệm vụ Sòng Bạc này!', 'error');
      casinoSFX.playError();
      return false;
    }
    claimedChallenges.add(ch.id);
    saveClaimedChallenges();
    state.vipPoints += ch.rewardVip;
    addChips(ch.rewardChips, 'challenge_bonus');
    casinoSFX.playWinFanfare(0.95);
    showCasinoToast(
      `🏆 Hoàn thành "${ch.title}": +${formatNum(ch.rewardChips)} Phỉnh & +${formatNum(ch.rewardVip)} VIP!`,
      'win',
      3.8
    );
    if (state.activeStation === 'cashier' && state.isOpen) {
      renderCashierDOM();
      appendChallengesToCashierStage();
    }
    return true;
  }

  function appendChallengesToCashierStage() {
    if (!dom.customStage || state.activeStation !== 'cashier') return;
    let sec = dom.customStage.querySelector('#dc-challenges-section');
    if (!sec) {
      sec = document.createElement('div');
      sec.id = 'dc-challenges-section';
      sec.style.marginTop = '14px';
      dom.customStage.appendChild(sec);
    }

    sec.innerHTML = `
      <div class="dc-card-panel">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <h3 style="margin:0;">🏆 NHIỆM VỤ ĐỎ ĐEN &amp; ĐẶC QUYỀN LIMOUSINE VIP</h3>
          <div style="display:flex;gap:8px;">
            <button type="button" class="dc-mini-btn" id="dc-btn-gps-casino">📍 Chỉ Đường GPS Tới Casino</button>
            <button type="button" class="dc-mini-btn" id="dc-btn-limo-casino" style="border-color:#fde047;color:#fde047;">🚖 Xe Limousine Đưa Tới Sảnh Casino</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:10px;">
          ${CASINO_CHALLENGES.map((ch) => {
            const prog = getChallengeProgress(ch);
            const pct = clamp((prog / ch.target) * 100, 0, 100);
            const done = prog >= ch.target;
            const isClaimed = claimedChallenges.has(ch.id);
            return `
              <div style="padding:10px;border-radius:10px;background:rgba(0,0,0,0.38);border:1px solid ${done && !isClaimed ? '#fde047' : 'rgba(255,255,255,0.12)'};">
                <div style="display:flex;justify-content:space-between;font-weight:800;font-size:12.5px;color:#fef08a;">
                  <span>${ch.title}</span>
                  <span>${formatNum(Math.min(prog, ch.target))}/${formatNum(ch.target)}</span>
                </div>
                <div style="font-size:11px;color:#cbd5e1;margin:4px 0;">${ch.desc}</div>
                <div class="dc-progress-track" style="height:6px;margin:6px 0;">
                  <div class="dc-progress-fill" style="width:${pct.toFixed(1)}%;"></div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                  <span style="font-size:11px;color:#86efac;font-weight:700;">+${formatNum(ch.rewardChips)} Phỉnh • +${ch.rewardVip} VIP</span>
                  <button type="button" class="dc-mini-btn" data-claim-ch="${ch.id}" ${!done || isClaimed ? 'disabled' : ''} style="${done && !isClaimed ? 'background:#ca8a04;color:#1c0a00;border-color:#fef08a;' : 'opacity:0.5;'}">
                    ${isClaimed ? '✓ Đã Nhận' : done ? 'Nhận Thưởng!' : 'Đang Làm'}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    sec.querySelectorAll('[data-claim-ch]').forEach((btn) => {
      btn.addEventListener('click', () => {
        claimCasinoChallenge(btn.getAttribute('data-claim-ch'));
      });
    });

    sec.querySelector('#dc-btn-gps-casino')?.addEventListener('click', () => {
      setCasinoGPSWaypoint();
    });

    sec.querySelector('#dc-btn-limo-casino')?.addEventListener('click', () => {
      shuttleToCasino();
    });
  }

  function setCasinoGPSWaypoint() {
    // Vạn Bảo Đổ Phường exterior corona at (209.5, 0.22, -110)
    if (Array.isArray(activeCtx?.gameplay?.gpsWaypoints) && activeCtx?.player) {
      activeCtx.gameplay.gpsWaypoints.length = 0;
      activeCtx.gameplay.gpsWaypoints.push(
        { x: activeCtx.player.x, z: activeCtx.player.z },
        { x: 200, z: activeCtx.player.z },
        { x: 200, z: -110 },
        { x: 209.5, z: -110 }
      );
    }
    casinoSFX.playChipClink(1);
    showCasinoToast('📍 Đã ghim lộ trình GPS tới Vạn Bảo Đổ Phường (Đại lộ X = +200, Z = -110)!', 'win', 3.0);
    activeCtx?.ui?.showNotification?.('GPS: Đã định vị Vạn Bảo Đổ Phường & Resort!');
  }

  function shuttleToCasino() {
    const p = activeCtx?.player;
    if (!p) return false;
    closeStation();

    // Exit current vehicle cleanly if seated
    if (p.inCar && activeCtx?.vehicles?.exitVehicle) {
      try {
        activeCtx.vehicles.exitVehicle();
      } catch (_) {}
    }

    if (activeCtx?.casinoWorld?.enterCasino) {
      try {
        activeCtx.casinoWorld.enterCasino();
        activeCtx?.ui?.showNotification?.('🚖 Limousine VIP đã đưa bạn vào Sảnh Chính Vạn Bảo Đổ Phường!');
        return true;
      } catch (_) {}
    }

    // Fallback teleport straight to Casino Porte-Cochère entrance (206.5, 0.22, -110)
    const gy = activeCtx?.world?.getGroundHeight ? activeCtx.world.getGroundHeight(206.5, -110) : 0.22;
    p.x = 206.5;
    p.y = gy;
    p.z = -110.0;
    p.vx = 0;
    p.vy = 0;
    p.vz = 0;
    p.yaw = Math.PI * 0.5;
    if (p.mesh) p.mesh.position.set(p.x, p.y, p.z);
    activeCtx?.ui?.showNotification?.('🚖 Limousine VIP đã đưa bạn tới cổng chính Vạn Bảo Đổ Phường!');
    return true;
  }

  // ============================================================================
  // SECTION 14: UNIFIED HIGH-DPI CANVAS POINTER, TOUCH & KEYBOARD DISPATCHER
  // ============================================================================
  function getLogicalCanvasCoords(evt) {
    const canvas = dom.canvas;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = evt.touches?.[0]?.clientX ?? evt.changedTouches?.[0]?.clientX ?? evt.clientX ?? 0;
    const clientY = evt.touches?.[0]?.clientY ?? evt.changedTouches?.[0]?.clientY ?? evt.clientY ?? 0;
    const x = ((clientX - rect.left) / Math.max(1, rect.width)) * 980;
    const y = ((clientY - rect.top) / Math.max(1, rect.height)) * 560;
    return { x, y };
  }

  function handleCanvasPointerDown(evt) {
    if (!state.isOpen || state.activeStation === 'cashier') return;
    casinoSFX.unlock();
    const { x, y } = getLogicalCanvasCoords(evt);
    const st = state.activeStation;

    if (st === 'taixiu') {
      if (taixiuGame.phase === 'SQUEEZING') {
        const bowlCX = 490 + taixiuGame.bowlX * 1.08;
        const bowlCY = 246 + taixiuGame.bowlY * 1.08;
        if (Math.hypot(x - bowlCX, y - bowlCY) <= 115) {
          taixiuGame.draggingBowl = true;
          taixiuGame.dragStartMouseX = x;
          taixiuGame.dragStartMouseY = y;
          taixiuGame.dragStartBowlX = taixiuGame.bowlX;
          taixiuGame.dragStartBowlY = taixiuGame.bowlY;
          return;
        }
      }
      if (taixiuGame.phase === 'BETTING' || taixiuGame.phase === 'RESULT') {
        if (taixiuGame.phase === 'RESULT') resetTaiXiuNextRound();
        for (let i = 0; i < taixiuGame.zones.length; i++) {
          const z = taixiuGame.zones[i];
          if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) {
            placeTaiXiuBet(z.id);
            return;
          }
        }
      }
      return;
    }

    if (st === 'xocdia') {
      if (xocdiaGame.phase === 'SQUEEZING') {
        const bowlCX = 490 + xocdiaGame.bowlX * 1.15;
        const bowlCY = 215 + xocdiaGame.bowlY * 1.15;
        if (Math.hypot(x - bowlCX, y - bowlCY) <= 105) {
          xocdiaGame.draggingBowl = true;
          xocdiaGame.dragStartMouseX = x;
          xocdiaGame.dragStartMouseY = y;
          xocdiaGame.dragStartBowlX = xocdiaGame.bowlX;
          xocdiaGame.dragStartBowlY = xocdiaGame.bowlY;
          return;
        }
      }
      if (xocdiaGame.phase === 'BETTING' || xocdiaGame.phase === 'RESULT') {
        if (xocdiaGame.phase === 'RESULT') resetXocDiaRound();
        for (let i = 0; i < XOCDIA_ZONES.length; i++) {
          const z = XOCDIA_ZONES[i];
          if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) {
            placeXocDiaBet(z.id);
            return;
          }
        }
      }
      return;
    }

    if (st === 'roulette') {
      const spot = hitTestRouletteSpot(x, y);
      if (spot) {
        placeRouletteBetOnSpot(spot);
      } else if (Math.hypot(x - 198, y - 266) <= 168 && rouletteGame.phase !== 'SPINNING') {
        spinRouletteWheel();
      }
      return;
    }

    if (st === 'blackjack') {
      for (let i = 0; i < blackjackGame.betCircles.length; i++) {
        const bc = blackjackGame.betCircles[i];
        if (Math.hypot(x - bc.x, y - bc.y) <= bc.r + 6) {
          clickBlackjackCircle(bc.id);
          return;
        }
      }
      return;
    }

    if (st === 'baccarat') {
      if (baccaratGame.phase === 'SQUEEZING' && baccaratGame.squeezeCardRef) {
        if (x >= 300 && x <= 680 && y >= 95 && y <= 460) {
          baccaratGame.draggingSqueeze = true;
          baccaratGame.dragStartY = y;
          baccaratGame.dragStartProg = baccaratGame.squeezeProgress;
          return;
        }
      }
      if (baccaratGame.phase === 'BETTING' || baccaratGame.phase === 'RESULT') {
        for (let i = 0; i < BACCARAT_ZONES.length; i++) {
          const z = BACCARAT_ZONES[i];
          if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) {
            placeBaccaratBet(z.id);
            return;
          }
        }
      }
      return;
    }

    if (st === 'slots') {
      // Click mechanical pull-lever on right side of cabinet
      if (x >= 815 && x <= 910 && y >= 140 && y <= 415 && slotsGame.phase === 'IDLE') {
        slotsGame._wasFreeSpinFlag = slotsGame.freeSpinsLeft > 0;
        triggerSlotSpin();
      }
      return;
    }

    if (st === 'derby') {
      if (derbyGame.phase === 'BETTING') {
        for (let i = 0; i < 6; i++) {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const cx = 42 + col * 454;
          const cy = 76 + row * 124;
          if (x >= cx && x <= cx + 438 && y >= cy && y <= cy + 110) {
            placeDerbyWinBet(i);
            return;
          }
        }
      }
      return;
    }

    if (st === 'lucky_wheel') {
      // Dragging power bar on right showcase card
      if (x >= 635 && x <= 920 && y >= 310 && y <= 355 && luckyWheelGame.phase !== 'SPINNING') {
        luckyWheelGame.draggingPower = true;
        luckyWheelGame.powerCharge = clamp((x - 642) / 270, 0.25, 1.0);
        casinoSFX.playChipClink(1);
        return;
      }
      // Clicking wheel directly spins it!
      if (Math.hypot(x - 345, y - 304) <= 220 && luckyWheelGame.phase !== 'SPINNING') {
        spinLuckyWheel(luckyWheelGame.powerCharge);
      }
    }
  }

  function handleCanvasPointerMove(evt) {
    if (!state.isOpen || state.activeStation === 'cashier') return;
    const { x, y } = getLogicalCanvasCoords(evt);
    const st = state.activeStation;

    if (st === 'taixiu') {
      if (taixiuGame.draggingBowl && taixiuGame.phase === 'SQUEEZING') {
        const prevX = taixiuGame.bowlX;
        const prevY = taixiuGame.bowlY;
        taixiuGame.bowlX = clamp(taixiuGame.dragStartBowlX + (x - taixiuGame.dragStartMouseX) * 0.92, -165, 165);
        taixiuGame.bowlY = clamp(taixiuGame.dragStartBowlY + (y - taixiuGame.dragStartMouseY) * 0.92, -145, 145);
        const moved = Math.hypot(taixiuGame.bowlX - prevX, taixiuGame.bowlY - prevY);
        if (moved > 1.2) {
          casinoSFX.playBowlScrape(clamp(moved / 14, 0.25, 1.0));
        }
        if (Math.hypot(taixiuGame.bowlX, taixiuGame.bowlY) > 132) {
          finalizeTaiXiuRound();
        }
        return;
      }
      let hov = null;
      for (let i = 0; i < taixiuGame.zones.length; i++) {
        const z = taixiuGame.zones[i];
        if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) {
          hov = z.id;
          break;
        }
      }
      taixiuGame.hoverZone = hov;
      return;
    }

    if (st === 'xocdia') {
      if (xocdiaGame.draggingBowl && xocdiaGame.phase === 'SQUEEZING') {
        const prevX = xocdiaGame.bowlX;
        const prevY = xocdiaGame.bowlY;
        xocdiaGame.bowlX = clamp(xocdiaGame.dragStartBowlX + (x - xocdiaGame.dragStartMouseX) * 0.9, -155, 155);
        xocdiaGame.bowlY = clamp(xocdiaGame.dragStartBowlY + (y - xocdiaGame.dragStartMouseY) * 0.9, -135, 135);
        const moved = Math.hypot(xocdiaGame.bowlX - prevX, xocdiaGame.bowlY - prevY);
        if (moved > 1.2) {
          casinoSFX.playBowlScrape(clamp(moved / 14, 0.25, 1.0));
        }
        if (Math.hypot(xocdiaGame.bowlX, xocdiaGame.bowlY) > 122) {
          finalizeXocDiaRound();
        }
        return;
      }
      let hov = null;
      for (let i = 0; i < XOCDIA_ZONES.length; i++) {
        const z = XOCDIA_ZONES[i];
        if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) {
          hov = z.id;
          break;
        }
      }
      xocdiaGame.hoverZone = hov;
      return;
    }

    if (st === 'roulette') {
      rouletteGame.hoverSpot = hitTestRouletteSpot(x, y);
      return;
    }

    if (st === 'blackjack') {
      let hov = null;
      for (let i = 0; i < blackjackGame.betCircles.length; i++) {
        const bc = blackjackGame.betCircles[i];
        if (Math.hypot(x - bc.x, y - bc.y) <= bc.r + 6) {
          hov = bc.id;
          break;
        }
      }
      blackjackGame.hoverSpot = hov;
      return;
    }

    if (st === 'baccarat') {
      if (baccaratGame.draggingSqueeze && baccaratGame.phase === 'SQUEEZING') {
        const deltaUp = (baccaratGame.dragStartY - y) / 165;
        const nextP = clamp(baccaratGame.dragStartProg + deltaUp, 0.02, 1.0);
        if (Math.abs(nextP - baccaratGame.squeezeProgress) > 0.015) {
          casinoSFX.playCardSqueezeCreak();
        }
        baccaratGame.squeezeProgress = nextP;
        if (baccaratGame.squeezeProgress >= 0.88) {
          finishCurrentBaccaratSqueeze();
        }
        return;
      }
      let hov = null;
      for (let i = 0; i < BACCARAT_ZONES.length; i++) {
        const z = BACCARAT_ZONES[i];
        if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) {
          hov = z.id;
          break;
        }
      }
      baccaratGame.hoverZone = hov;
      return;
    }

    if (st === 'derby') {
      let lane = -1;
      if (derbyGame.phase === 'BETTING') {
        for (let i = 0; i < 6; i++) {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const cx = 42 + col * 454;
          const cy = 76 + row * 124;
          if (x >= cx && x <= cx + 438 && y >= cy && y <= cy + 110) {
            lane = i;
            break;
          }
        }
      }
      derbyGame.hoverLane = lane;
      return;
    }

    if (st === 'lucky_wheel' && luckyWheelGame.draggingPower) {
      luckyWheelGame.powerCharge = clamp((x - 642) / 270, 0.25, 1.0);
    }
  }

  function handleCanvasPointerUp() {
    taixiuGame.draggingBowl = false;
    xocdiaGame.draggingBowl = false;
    baccaratGame.draggingSqueeze = false;
    luckyWheelGame.draggingPower = false;
  }

  function bindCanvasPointerEvents() {
    const c = dom.canvas;
    if (!c || c._casinoBound) return;
    c._casinoBound = true;

    c.addEventListener('mousedown', handleCanvasPointerDown);
    window.addEventListener('mousemove', handleCanvasPointerMove);
    window.addEventListener('mouseup', handleCanvasPointerUp);

    c.addEventListener(
      'touchstart',
      (e) => {
        if (!state.isOpen) return;
        e.preventDefault();
        handleCanvasPointerDown(e);
      },
      { passive: false }
    );
    c.addEventListener(
      'touchmove',
      (e) => {
        if (!state.isOpen) return;
        e.preventDefault();
        handleCanvasPointerMove(e);
      },
      { passive: false }
    );
    window.addEventListener('touchend', handleCanvasPointerUp);
  }

  // ============================================================================
  // SECTION 15: PROXIMITY INTERACTION, MODAL LIFECYCLE & PUBLIC API
  // ============================================================================
  const FALLBACK_CASINO_STATIONS = [
    { type: 'cashier', id: 'cashier_main', label: 'Quầy Thu Ngân, VIP & Vay Nóng Mafia', x: 1180, z: 1215, minBet: 0, maxBet: 50000 },
    { type: 'lucky_wheel', id: 'wheel_main', label: 'Vòng Quay Kim Cương 20 Ô', x: 1216, z: 1212, minBet: 0, maxBet: 1000 },
    { type: 'taixiu', id: 'taixiu_1', label: 'Bàn Tài Xỉu Lắc Xí Ngầu Đỏ Đen #1', x: 1184, z: 1198, minBet: 10, maxBet: 100000 },
    { type: 'taixiu', id: 'taixiu_2', label: 'Bàn Tài Xỉu Nặn Cầu Thượng Lưu #2', x: 1184, z: 1190, minBet: 50, maxBet: 100000 },
    { type: 'xocdia', id: 'xocdia_1', label: 'Chiếu Xóc Đĩa Đỏ Đen VIP', x: 1184, z: 1182, minBet: 10, maxBet: 100000 },
    { type: 'roulette', id: 'roulette_1', label: 'Bàn Quay Roulette Châu Âu 0–36', x: 1200, z: 1186, minBet: 10, maxBet: 100000 },
    { type: 'blackjack', id: 'blackjack_1', label: 'Bàn Xì Dách Hoàng Gia 21', x: 1215, z: 1198, minBet: 25, maxBet: 50000 },
    { type: 'poker', id: 'poker_1', label: 'Bàn Texas Hold\'em Poker Thượng Lưu', x: 1215, z: 1188, minBet: 50, maxBet: 100000 },
    { type: 'baccarat', id: 'baccarat_1', label: 'Bàn Baccarat Hoàng Gia (Nặn Bài)', x: 1208, z: 1180, minBet: 25, maxBet: 100000 },
    { type: 'slots', id: 'slots_west', label: 'Dãy Máy Xèng Kim Cương Diamond 777', x: 1177, z: 1200, minBet: 10, maxBet: 10000 },
    { type: 'slots', id: 'slots_east', label: 'Dãy Máy Xèng Jackpot Diamond 777', x: 1223, z: 1200, minBet: 10, maxBet: 10000 },
    { type: 'derby', id: 'derby_lounge', label: 'Khu Cá Cược Đua Siêu Xe & Ngựa Inside Track', x: 1192, z: 1212, minBet: 20, maxBet: 50000 }
  ];

  let modalToggleCooldown = 0;
  let secondaryGJustPressed = false;
  let globalListenersInstalled = false;

  function findNearbyCasinoStation(px, pz) {
    if (!Number.isFinite(px) || !Number.isFinite(pz)) return null;

    if (activeCtx?.casinoWorld && typeof activeCtx.casinoWorld.getInteractiveStationNear === 'function') {
      try {
        const st = activeCtx.casinoWorld.getInteractiveStationNear(px, pz);
        if (st && isCasinoStationCandidate(st)) {
          return st;
        }
        // If near a Bar/Nightclub station, return null immediately so nightlife_bar handles it!
        if (st && !isCasinoStationCandidate(st)) {
          return null;
        }
      } catch (_) {}
    }

    // Fallback coordinate check inside Casino Grand Interior around (1200, 1200)
    if (Math.hypot(px - 1200, pz - 1200) > 60) return null;
    let best = null;
    let bestD = 3.0;
    for (let i = 0; i < FALLBACK_CASINO_STATIONS.length; i++) {
      const item = FALLBACK_CASINO_STATIONS[i];
      const d = Math.hypot(px - item.x, pz - item.z);
      if (d < bestD) {
        bestD = d;
        best = item;
      }
    }
    return best;
  }

  function releasePointerLockSafely() {
    if (typeof document !== 'undefined' && document.pointerLockElement && typeof document.exitPointerLock === 'function') {
      try {
        document.exitPointerLock();
      } catch (_) {}
    }
    if (activeCtx?.input) {
      activeCtx.input.fire = false;
      activeCtx.input.aim = false;
    }
  }

  function switchStationTab(stationRaw) {
    ensureCasinoDOM();
    const stId = normalizeStationId(stationRaw);
    state.activeStation = stId;
    clearCanvasFX();
    slotsGame.autoSpin = false;

    const meta = STATION_META[stId] || STATION_META.cashier;
    if (dom.headerStationTitle) dom.headerStationTitle.textContent = meta.title;
    if (dom.headerStationSub) dom.headerStationSub.textContent = meta.subtitle;

    for (const k of STATION_ORDER) {
      dom.navBtns[k]?.classList.toggle('active', k === stId);
    }

    const isCashier = stId === 'cashier';
    if (dom.customStage) dom.customStage.classList.toggle('hidden', !isCashier);
    if (dom.canvas) dom.canvas.style.display = isCashier ? 'none' : 'block';
    if (dom.chipBar) dom.chipBar.style.display = isCashier || stId === 'lucky_wheel' || stId === 'slots' || stId === 'poker' ? 'none' : 'flex';

    refreshHeaderHUD();
    syncSelectedChipButtons();

    if (stId === 'cashier') {
      renderCashierDOM();
      appendChallengesToCashierStage();
    } else if (stId === 'taixiu') {
      renderTaiXiuSideAndControls();
    } else if (stId === 'xocdia') {
      renderXocDiaSideAndControls();
    } else if (stId === 'roulette') {
      renderRouletteSideAndControls();
    } else if (stId === 'blackjack') {
      renderBlackjackSideAndControls();
    } else if (stId === 'poker') {
      initPokerSeatsIfNeeded();
      renderPokerSideAndControls();
    } else if (stId === 'baccarat') {
      renderBaccaratSideAndControls();
    } else if (stId === 'slots') {
      renderSlotsSideAndControls();
    } else if (stId === 'derby') {
      renderDerbySideAndControls();
    } else if (stId === 'lucky_wheel') {
      renderLuckyWheelSideAndControls();
    }
  }

  function openStation(stationTypeOrObj = 'cashier', opts = {}) {
    if (modalToggleCooldown > 0 && state.isOpen) return true;
    ensureCasinoDOM();
    casinoSFX.unlock();

    if (stationTypeOrObj && typeof stationTypeOrObj === 'object') {
      if (!isCasinoStationCandidate(stationTypeOrObj) && !opts.forceCasino) {
        return false;
      }
      state.stationContext = stationTypeOrObj;
    } else {
      state.stationContext = opts || null;
    }

    const targetId = normalizeStationId(stationTypeOrObj);
    state.isOpen = true;
    modalToggleCooldown = 0.22;
    activeCtx.activeModal = 'casino';
    releasePointerLockSafely();

    if (dom.overlay) {
      dom.overlay.classList.remove('hidden');
    }

    // Close Truyền Âm Ngọc Giản Smartphone cleanly if launched via Quick-Casino Phone App
    if (activeCtx?.ui?.closePhone) {
      try {
        activeCtx.ui.closePhone();
      } catch (_) {}
    }

    switchStationTab(targetId);
    recordChipLedgerPoint();
    return true;
  }

  function openQuickCasino(defaultTab = 'taixiu') {
    return openStation(defaultTab, { fromPhone: true, forceCasino: true });
  }

  function closeStation() {
    if (!state.isOpen) return false;
    state.isOpen = false;
    modalToggleCooldown = 0.22;
    slotsGame.autoSpin = false;
    handleCanvasPointerUp();

    if (dom.overlay) {
      dom.overlay.classList.add('hidden');
    }
    if (activeCtx?.activeModal === 'casino') {
      activeCtx.activeModal = null;
    }
    saveCasinoState(true);
    return true;
  }

  function installGlobalKeyHandlers() {
    if (globalListenersInstalled || typeof window === 'undefined') return;
    globalListenersInstalled = true;

    window.addEventListener(
      'keydown',
      (e) => {
        if (e.code === 'KeyG' && !e.repeat && !state.isOpen && !activeCtx?.activeModal) {
          secondaryGJustPressed = true;
        }

        if (!state.isOpen) return;

        if (e.code === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          casinoSFX.playChipClink(1);
          closeStation();
          return;
        }

        const tag = (e.target?.tagName || '').toUpperCase();
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

        // Number keys 1..7 quick-select chip denomination
        if (e.code >= 'Digit1' && e.code <= 'Digit7') {
          const idx = Number(e.code.replace('Digit', '')) - 1;
          if (CHIP_DENOMS[idx]) {
            state.selectedChip = CHIP_DENOMS[idx].value;
            syncSelectedChipButtons();
            casinoSFX.playChipClink(1);
          }
          return;
        }

        // Spacebar quick-action on active Canvas station
        if (e.code === 'Space') {
          e.preventDefault();
          const st = state.activeStation;
          if (st === 'slots' && slotsGame.phase === 'IDLE') {
            slotsGame._wasFreeSpinFlag = slotsGame.freeSpinsLeft > 0;
            triggerSlotSpin();
          } else if (st === 'taixiu' && taixiuGame.phase === 'BETTING') {
            startTaiXiuRoll(false);
          } else if (st === 'xocdia' && xocdiaGame.phase === 'BETTING') {
            startXocDiaShake(false);
          } else if (st === 'roulette' && rouletteGame.phase !== 'SPINNING') {
            spinRouletteWheel();
          } else if (st === 'lucky_wheel' && luckyWheelGame.phase !== 'SPINNING') {
            spinLuckyWheel(luckyWheelGame.powerCharge);
          }
        }
      },
      true
    );
  }

  function renderActiveStationCanvas(dt) {
    if (!state.isOpen || state.activeStation === 'cashier' || !dom.canvas) return;
    const g = syncCanvasDPI(dom.canvas, 980, 560);
    if (!g) return;

    const st = state.activeStation;
    if (st === 'taixiu') drawTaiXiuCanvas(g, 980, 560, dt);
    else if (st === 'xocdia') drawXocDiaCanvas(g, 980, 560, dt);
    else if (st === 'roulette') drawRouletteCanvas(g, 980, 560, dt);
    else if (st === 'blackjack') drawBlackjackCanvas(g, 980, 560, dt);
    else if (st === 'poker') drawPokerCanvas(g, 980, 560, dt);
    else if (st === 'baccarat') drawBaccaratCanvas(g, 980, 560, dt);
    else if (st === 'slots') drawSlotsCanvas(g, 980, 560, dt);
    else if (st === 'derby') drawDerbyCanvas(g, 980, 560, dt);
    else if (st === 'lucky_wheel') drawLuckyWheelCanvas(g, 980, 560, dt);
  }

  let initialized = false;
  let hudRefreshAccum = 0;

  function init(ctxOverride = null) {
    if (ctxOverride && typeof ctxOverride === 'object') {
      activeCtx = ctxOverride;
    }
    if (!initialized) {
      initialized = true;
      loadCasinoState();
      loadClaimedChallenges();
      ensureCasinoDOM();
      installGlobalKeyHandlers();
      initPokerSeatsIfNeeded();

      // If player previously won the Gold Podium Hypercar in saved progress, park it ready outside Casino!
      if (state.podiumWon && !state.podiumSpawnedSession) {
        spawnGoldPodiumHypercarOutside();
      }
    }
    return api;
  }

  function update(dtArg = 0.016, secondArg = null, thirdArg = null) {
    if (thirdArg && typeof thirdArg === 'object') activeCtx = thirdArg;
    else if (secondArg && typeof secondArg === 'object') activeCtx = secondArg;

    if (!initialized) init(activeCtx);

    const rawDt =
      typeof secondArg === 'number' && secondArg > 0 && secondArg <= 0.25
        ? secondArg
        : clamp(Number(dtArg) || 0.016, 0.0005, 0.1);
    const dt = clamp(Number(dtArg) || rawDt, 0.0005, 0.1);

    if (modalToggleCooldown > 0) {
      modalToggleCooldown = Math.max(0, modalToggleCooldown - rawDt);
    }

    // 1. Update Mafia Loan-Shark Countdown & Outdoor Armed Enforcer SUV Squads!
    updateLoanAndMafiaEnforcers(dt);

    // 2. If Gold Podium Car was won earlier before vehicles system loaded, ensure it spawns once vehicles exist
    if (state.podiumWon && !state.podiumSpawnedSession && activeCtx?.vehicles?.spawnVehicle) {
      spawnGoldPodiumHypercarOutside();
    }

    // 3. Check 3D Casino Floor Station Proximity & [F] / [G] / Touch Interact
    const p = activeCtx?.player;
    if (!state.isOpen && p && activeCtx?.started && !activeCtx?.paused && !activeCtx?.activeModal && !p.inCar) {
      const nearStation = findNearbyCasinoStation(p.x, p.z);
      if (nearStation) {
        const label = nearStation.label || STATION_META[normalizeStationId(nearStation)]?.title || 'Bàn Sòng Bạc';
        activeCtx?.ui?.showPrompt?.(`Nhấn [F] hoặc [G] để vào ${label}`);
        const interactTrig = Boolean(
          activeCtx?.input?.interactJustPressed ||
          activeCtx?.input?.secondaryInteractJustPressed ||
          activeCtx?.input?.interactGJustPressed ||
          secondaryGJustPressed
        );
        if (interactTrig && modalToggleCooldown <= 0) {
          secondaryGJustPressed = false;
          openStation(nearStation);
        }
      }
    }
    secondaryGJustPressed = false;

    // 4. Keep pointer lock released & update active Casino Game Engine when modal is open
    if (state.isOpen) {
      if (activeCtx.activeModal !== 'casino') {
        activeCtx.activeModal = 'casino';
      }
      releasePointerLockSafely();

      hudRefreshAccum += rawDt;
      if (hudRefreshAccum >= 0.25) {
        hudRefreshAccum = 0;
        refreshHeaderHUD();
      }

      loungeJazzBGM.update(rawDt);

      const st = state.activeStation;
      if (st === 'taixiu') updateTaiXiu(rawDt);
      else if (st === 'xocdia') updateXocDia(rawDt);
      else if (st === 'roulette') updateRoulette(rawDt);
      else if (st === 'blackjack') updateBlackjack(rawDt);
      else if (st === 'poker') updatePoker(rawDt);
      else if (st === 'baccarat') updateBaccarat(rawDt);
      else if (st === 'slots') updateSlots(rawDt);
      else if (st === 'derby') updateDerby(rawDt);
      else if (st === 'lucky_wheel') updateLuckyWheel(rawDt);

      renderActiveStationCanvas(rawDt);
    } else if (luckyWheelGame.podiumCelebrationTimer > 0) {
      updateLuckyWheel(rawDt);
    }
  }

  const api = {
    init,
    update,
    updateCasinoGames: update,
    openStation,
    open: openStation,
    openQuickCasino,
    closeStation,
    close: closeStation,
    shuttleToCasino,
    setCasinoGPSWaypoint,
    buyChips,
    cashOutChips,
    claimVisitorBonus,
    claimVipRebate,
    takeLoan,
    repayLoan,
    spinLuckyWheel,
    get chips() {
      return state.chips;
    },
    set chips(v) {
      state.chips = Math.max(0, Math.floor(Number(v) || 0));
      saveCasinoState();
      refreshHeaderHUD();
    },
    get vipPoints() {
      return state.vipPoints;
    },
    set vipPoints(v) {
      state.vipPoints = Math.max(0, Math.floor(Number(v) || 0));
      saveCasinoState();
      refreshHeaderHUD();
    },
    get vipTier() {
      return getCurrentVipTier();
    },
    get loanDebt() {
      return state.loanDebt;
    },
    set loanDebt(v) {
      state.loanDebt = Math.max(0, Math.floor(Number(v) || 0));
      saveCasinoState();
      refreshHeaderHUD();
    },
    get podiumWon() {
      return state.podiumWon;
    },
    set podiumWon(v) {
      state.podiumWon = Boolean(v);
      saveCasinoState();
    },
    get isOpen() {
      return state.isOpen;
    },
    get activeStation() {
      return state.activeStation;
    },
    state
  };

  if (activeCtx && typeof activeCtx === 'object') {
    activeCtx.casinoGames = api;
  }

  return api;
}
