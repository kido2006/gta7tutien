// ============================================================================
// GIANG HỒ GUARD — MULTI-LAYER ANTI-CHEAT & ANTI-HACK SYSTEM
// Protects Cash Vault, Skill Cooldowns, Clock Integrity, localStorage Saves,
// Secret Code Hashes & Global Console Honeypots (Offline + Online Server Sync)
// ============================================================================

export function createAntiCheatSystem(ctx) {
  // Capture native monotonic clocks at boot before any DevTools script can patch them
  const _origPerfFn = typeof performance !== 'undefined' ? performance.now : null;
  const _nativePerfNow = _origPerfFn ? _origPerfFn.bind(performance) : () => Date.now();
  const _origDateNowFn = Date.now;
  const _nativeDateNow = _origDateNowFn.bind(Date);

  const bootPerf = _nativePerfNow();
  const bootDate = _nativeDateNow();

  // Private XOR-obfuscated & shadow-checksummed Cash Vault
  const _xorKey = ((Math.random() * 0x7fffffff) | 0) ^ 0x4a7f2c91;
  const _shadowSalt = ((Math.random() * 0x7fffffff) | 0) ^ 0x1e9b5d33;
  let _vaultEnc = (7860 ^ _xorKey) >>> 0;
  let _vaultShadow = (Math.imul(7860 ^ _shadowSalt, 0x01000193)) >>> 0;
  let _internalWriteDepth = 0;

  // Private monotonic cooldown ledger & anti-cheat strike state
  const _lastSkillCastAt = new Map();
  let _strikes = 0;
  let _lockoutUntil = 0;
  let _lastFlagAt = 0;
  let _checkAccum = 0;
  let _protectedPlayer = null;
  let _lastSafeCash = 7860;

  function hash64(str) {
    let h1 = 0x811c9dc5 ^ 0x5a3c9e17;
    let h2 = 0x2f6e2b1 ^ 0x9e3779b9;
    const full = 'GH_AC_SALT_91:' + String(str) + ':V2';
    for (let i = 0; i < full.length; i++) {
      const ch = full.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 0x01000193);
      h2 = Math.imul(h2 ^ (ch + i * 31), 0x85ebca6b);
    }
    return ((h1 >>> 0).toString(16).padStart(8, '0')) + ((h2 >>> 0).toString(16).padStart(8, '0'));
  }

  // Salted 64-bit hashes of secret codes (ZERO plaintext codes anywhere in client bundle!)
  const SECRET_HASH_MAP = Object.freeze({
    '86602de7ababc5ff': 'invuln',
    '3884a1c28ff4d8dc': 'boss_secret',
    'f43f9c0a30b9f95d': 'no_cooldown',
    'd979e27f073d8657': 'ammo_cash'
  });
  const LONG_PREFIX_HASHES = new Set([
    '91336ceb7d23dd84',
    'fa8c5dd03af39d01',
    '907519c63bd574a2',
    '161c7854649f4b64',
    'a229a0130d5529ee'
  ]);

  function matchSecretCode(input) {
    const h = hash64(String(input || '').trim());
    return SECRET_HASH_MAP[h] || null;
  }

  function isSecretPrefix(input) {
    const s = String(input || '').trim();
    if (s.length >= 6) return false;
    return LONG_PREFIX_HASHES.has(hash64(s));
  }

  function readVaultCash() {
    const raw = (_vaultEnc ^ _xorKey) >>> 0;
    const expectedShadow = (Math.imul(raw ^ _shadowSalt, 0x01000193)) >>> 0;
    if (expectedShadow !== _vaultShadow) {
      flagCheat('vault_corrupt', 'Phát hiện can thiệp bộ nhớ ví tiền!');
      writeVaultCashInternal(0);
      return 0;
    }
    return raw;
  }

  function writeVaultCashInternal(val) {
    const clean = Math.max(0, Math.min(2_000_000_000, Math.floor(Number(val) || 0)));
    _vaultEnc = (clean ^ _xorKey) >>> 0;
    _vaultShadow = (Math.imul(clean ^ _shadowSalt, 0x01000193)) >>> 0;
    _lastSafeCash = clean;
    return clean;
  }

  function commitCash(newAmount) {
    _internalWriteDepth++;
    try {
      const clean = writeVaultCashInternal(newAmount);
      return clean;
    } finally {
      _internalWriteDepth--;
    }
  }

  function protectPlayerObject(player) {
    if (!player || _protectedPlayer === player) return;
    _protectedPlayer = player;
    const initial = Math.max(0, Math.floor(Number(player.cash ?? player.money ?? 7860) || 7860));
    writeVaultCashInternal(initial);

    const defineGuardedProp = (prop) => {
      try {
        Object.defineProperty(player, prop, {
          configurable: false,
          enumerable: true,
          get() {
            return readVaultCash();
          },
          set(val) {
            const num = Math.floor(Number(val) || 0);
            if (_internalWriteDepth > 0) {
              writeVaultCashInternal(num);
              return;
            }
            const cur = readVaultCash();
            // Allow harmless no-op re-assignment of exact current value
            if (num === cur) return;
            // Direct external tamper detected (e.g. DevTools console `player.cash = 999999`)!
            flagCheat('cash_tamper', `Phát hiện hack sửa tiền trực tiếp (${cur} → ${num})!`);
          }
        });
      } catch (_) {}
    };
    defineGuardedProp('cash');
    defineGuardedProp('money');
  }

  function isLockedOut() {
    return _nativePerfNow() < _lockoutUntil;
  }

  function getLockoutRemainingSec() {
    return Math.max(0, Math.ceil((_lockoutUntil - _nativePerfNow()) / 1000));
  }

  function verifyAndRecordSkill(skillId, minCooldownMs, noCooldownAllowed = false) {
    if (isLockedOut()) {
      ctx.ui?.showNotification?.(`🛡️ ANTI-CHEAT: Kỹ năng đang bị khóa (${getLockoutRemainingSec()}s) do phát hiện gian lận!`, 'red');
      return false;
    }
    if (noCooldownAllowed) return true;

    const now = _nativePerfNow();
    const last = _lastSkillCastAt.get(skillId) || 0;
    const elapsed = now - last;
    if (last > 0 && elapsed < minCooldownMs * 0.88) {
      flagCheat('cooldown_hack', `Phát hiện hack không hồi chiêu kỹ năng (${skillId})!`);
      return false;
    }
    _lastSkillCastAt.set(skillId, now);
    return true;
  }

  function signSaveObject(obj) {
    try {
      const canonical = JSON.stringify(obj);
      return hash64('SAVE_SIG:' + canonical);
    } catch (_) {
      return '';
    }
  }

  function verifySaveObject(obj, sig) {
    if (!obj || typeof obj !== 'object' || typeof sig !== 'string' || sig.length < 16) {
      return false;
    }
    const copy = { ...obj };
    delete copy._acSig;
    return signSaveObject(copy) === sig;
  }

  function flagCheat(reasonCode, detailMsg) {
    const now = _nativePerfNow();
    _strikes++;
    _lockoutUntil = Math.max(_lockoutUntil, now + 20_000);

    // Confiscate hacked cash & reset unauthorized buffs!
    writeVaultCashInternal(0);
    if (ctx.gameplay?.revokeBuffsOnCheat) {
      try { ctx.gameplay.revokeBuffsOnCheat(); } catch (_) {}
    }
    if (ctx.gameplay?.setWantedStars) {
      try { ctx.gameplay.setWantedStars(5); } catch (_) {}
    }

    if (now - _lastFlagAt > 2500) {
      _lastFlagAt = now;
      ctx.audio?.playCasinoAlarm?.();
      ctx.ui?.showBanner?.(
        '🛡️ ANTI-CHEAT: PHÁT HIỆN GIAN LẬN!',
        `${detailMsg} Đã tịch thu tiền hack, khóa kỹ năng 20s & truy nã 5★!`,
        'wasted',
        4.5
      );
      ctx.ui?.showNotification?.(`🛡️ GIANG HỒ GUARD (#${_strikes}): ${detailMsg}`, 'red');

      // Report to Online Multiplayer Server if connected!
      if (ctx.mp?.reportAntiCheat) {
        try { ctx.mp.reportAntiCheat(reasonCode, detailMsg); } catch (_) {}
      }
    }
  }

  function installConsoleHoneypot() {
    if (typeof window === 'undefined') return;
    try {
      Object.defineProperty(window, '__GTA_CTX__', {
        configurable: false,
        enumerable: false,
        get() {
          flagCheat('console_probe', 'Phát hiện truy cập bộ nhớ game qua Console (__GTA_CTX__)!');
          return undefined;
        },
        set() {
          flagCheat('console_probe', 'Phát hiện ghi đè bộ nhớ game qua Console!');
        }
      });
    } catch (_) {}
  }

  function updateAntiCheat(rawDt = 0.016) {
    _checkAccum += rawDt;
    if (_checkAccum < 1.2) return;
    _checkAccum = 0;

    // 1. Detect monkey-patched performance.now / Date.now (Time-Skip / Cooldown Hack!)
    if (_origPerfFn && typeof performance !== 'undefined' && performance.now !== _origPerfFn) {
      flagCheat('clock_patch', 'Phát hiện can thiệp hàm đồng hồ performance.now!');
      return;
    }
    if (Date.now !== _origDateNowFn) {
      flagCheat('clock_patch', 'Phát hiện can thiệp hàm đồng hồ Date.now!');
      return;
    }

    // 2. Cross-check monotonic clock drift (Speedhack / Cheat Engine speed multiplier)
    const dPerf = _nativePerfNow() - bootPerf;
    const dDate = _nativeDateNow() - bootDate;
    if (dPerf > 5000 && Math.abs(dPerf - dDate) > 6500 && dPerf > dDate * 1.45) {
      flagCheat('speed_hack', 'Phát hiện tua nhanh tốc độ đồng hồ (Speedhack)!');
      return;
    }

    // 3. Detect impossible player HP tampering
    const p = ctx.player;
    if (p) {
      if (_protectedPlayer !== p) protectPlayerObject(p);
      const maxHp = Number(p.maxHp) || 100;
      if (Number(p.hp) > maxHp + 60) {
        p.hp = maxHp;
        flagCheat('hp_tamper', 'Phát hiện hack máu vô hạn!');
      }
      if (Number(p.armor) > 150) {
        p.armor = 100;
        flagCheat('armor_tamper', 'Phát hiện hack giáp vô hạn!');
      }
      readVaultCash();
    }
  }

  installConsoleHoneypot();
  if (ctx?.player) protectPlayerObject(ctx.player);

  const api = {
    protectPlayerObject,
    readVaultCash,
    commitCash,
    verifyAndRecordSkill,
    isLockedOut,
    getLockoutRemainingSec,
    signSaveObject,
    verifySaveObject,
    matchSecretCode,
    isSecretPrefix,
    flagCheat,
    updateAntiCheat,
    getStrikes: () => _strikes
  };

  if (ctx) ctx.antiCheat = api;
  return api;
}
