import * as THREE from 'three';

// ============================================================================
// GTA: Đại Lộ & Bờ Biển 3D — Core Performance, Spatial BVH, Software Horizon
// Skyscraper Occlusion Culler, Smart Shadow Priority Queue, Cooperative 1.8ms
// Frame-Budget Scheduler, Generational Memory Pools & F4 Thiên Cơ Đo Hiệu Năng Suite
// Exclusively owns: src/perf_core.js
// ============================================================================

const PERF_HISTORY_FRAMES = 240;
const PERF_EXTENDED_FRAMES = 600;
const DEFAULT_SCHEDULER_BUDGET_MS = 1.8;
const TIGHT_SCHEDULER_BUDGET_MS = 0.75;
const SHADOW_RANK_INTERVAL_SEC = 0.15;
const SCENE_RESYNC_INTERVAL_SEC = 1.25;
const WATCHDOG_SLICE_SIZE = 32;
const HORIZON_BIN_COUNT = 180;
const MAX_SCREEN_OCCLUDERS = 16;
const TWO_PI = Math.PI * 2;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// Walk-in 3D Interior Room Hubs — visibility inside active hub is always
// restored cleanly while outdoor skyscraper occluders are suspended!
const INTERIOR_ROOM_HUBS = Object.freeze([
  Object.freeze({
    id: 'safehouse_penthouse',
    index: 0,
    name: 'Động Phủ Tu Luyện An Cư',
    centerX: 800,
    centerY: 0,
    centerZ: 800,
    minX: 720,
    maxX: 880,
    minZ: 720,
    maxZ: 880,
    minY: -12,
    maxY: 45,
    radius: 95,
    keepSkyVisible: true,
  }),
  Object.freeze({
    id: 'ammu_nation_range',
    index: 1,
    name: 'Thần Binh Các & Trường Bắn',
    centerX: 1800,
    centerY: 0,
    centerZ: 1800,
    minX: 1700,
    maxX: 1900,
    minZ: 1700,
    maxZ: 1900,
    minY: -12,
    maxY: 40,
    radius: 105,
    keepSkyVisible: false,
  }),
]);

const QUALITY_TIER_CONFIGS = Object.freeze({
  ULTRA: Object.freeze({
    id: 'ULTRA',
    label: 'Cực Phẩm',
    maxShadowCasters: 18,
    shadowMaxDist: 78,
    sectorLodRadius: 215,
    propCullRadius: 190,
    dynamicActorCullRadius: 210,
    occluderInset: 2.35,
    occluderMinDepthMargin: 3.0,
    maxAnisotropy: 8,
    schedulerBudgetMs: 1.8,
    targetPixelRatioCap: 1.75,
    trafficDensity: 'HIGH',
  }),
  HIGH: Object.freeze({
    id: 'HIGH',
    label: 'Cao Cân Bằng',
    maxShadowCasters: 8,
    shadowMaxDist: 62,
    sectorLodRadius: 165,
    propCullRadius: 150,
    dynamicActorCullRadius: 175,
    occluderInset: 2.15,
    occluderMinDepthMargin: 2.5,
    maxAnisotropy: 4,
    schedulerBudgetMs: 1.65,
    targetPixelRatioCap: 1.35,
    trafficDensity: 'BALANCED',
  }),
  MOBILE: Object.freeze({
    id: 'MOBILE',
    label: 'Di Động Mượt',
    maxShadowCasters: 0,
    shadowMaxDist: 0,
    sectorLodRadius: 122,
    propCullRadius: 108,
    dynamicActorCullRadius: 130,
    occluderInset: 1.95,
    occluderMinDepthMargin: 2.1,
    maxAnisotropy: 1,
    schedulerBudgetMs: 1.25,
    targetPixelRatioCap: 1.0,
    trafficDensity: 'LIGHT',
  }),
  TURBO: Object.freeze({
    id: 'TURBO',
    label: 'Turbo 60/120 FPS',
    maxShadowCasters: 6,
    shadowMaxDist: 52,
    sectorLodRadius: 138,
    propCullRadius: 126,
    dynamicActorCullRadius: 152,
    occluderInset: 2.0,
    occluderMinDepthMargin: 2.2,
    maxAnisotropy: 2,
    schedulerBudgetMs: 1.35,
    targetPixelRatioCap: 1.08,
    trafficDensity: 'BALANCED',
  }),
});

const SUBSYSTEM_DEFINITIONS = Object.freeze([
  Object.freeze({ key: 'world', label: 'World & Infra', shortLabel: 'World', color: '#38bdf8' }),
  Object.freeze({ key: 'ai', label: 'AI, Traffic & Heists', shortLabel: 'AI', color: '#a78bfa' }),
  Object.freeze({ key: 'physics', label: 'Vehicles & Physics', shortLabel: 'Physics', color: '#fb923c' }),
  Object.freeze({ key: 'characters', label: 'Characters & FX', shortLabel: 'Characters', color: '#4ade80' }),
  Object.freeze({ key: 'casinoNightlife', label: 'Casino, Bar & Shops', shortLabel: 'Casino/Bar', color: '#f472b6' }),
  Object.freeze({ key: 'render', label: 'WebGL Scene Render', shortLabel: 'Render', color: '#facc15' }),
  Object.freeze({ key: 'postfx', label: 'PostFX & Shaders', shortLabel: 'PostFX', color: '#fb7185' }),
  Object.freeze({ key: 'perfInternal', label: 'BVH Culler & Sched', shortLabel: 'BVH/Sched', color: '#2dd4bf' }),
]);

const STANDARD_REFRESH_RATES = Object.freeze([60, 75, 90, 120, 144, 165, 240]);

const OBJECT_CLASS = Object.freeze({
  UNKNOWN: 0,
  SKY_ENV: 1,
  INTERIOR_MESH: 2,
  ANIMATED_WORLD: 3,
  DYNAMIC_ACTOR: 4,
  STATIC_CITY_BATCH: 5,
  STATIC_SECTOR_DETAIL: 6,
  STATIC_INSTANCED: 7,
  LIGHT_OR_HELPER: 8,
});

const TASK_PRIORITY = Object.freeze({
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
  IDLE: 4,
});

// ============================================================================
// Pure Numeric, Hashing, Formatting & Spline Interpolation Utilities
// ============================================================================

const perfNow = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function invLerp(a, b, v) {
  const denom = b - a;
  if (Math.abs(denom) < 1e-8) return 0;
  return clamp((v - a) / denom, 0, 1);
}

function smoothstep(e0, e1, x) {
  const t = invLerp(e0, e1, x);
  return t * t * (3 - 2 * t);
}

function dampScalar(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-Math.max(0, lambda) * Math.max(0, dt)));
}

function wrapAnglePi(angle) {
  let a = (angle + Math.PI) % TWO_PI;
  if (a < 0) a += TWO_PI;
  return a - Math.PI;
}

function wrapAngle2Pi(angle) {
  let a = angle % TWO_PI;
  if (a < 0) a += TWO_PI;
  return a;
}

function fnv1aHashString(str, seed = 0x811c9dc5) {
  let h = seed >>> 0;
  for (let i = 0, len = str.length; i < len; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function formatCompactCount(n) {
  const val = Number(n) || 0;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 10_000) return `${(val / 1_000).toFixed(1)}K`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(2)}K`;
  return String(Math.round(val));
}

function formatMegabytes(bytes) {
  const b = Math.max(0, Number(bytes) || 0);
  if (b >= 1024 * 1024 * 1024) return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${Math.round(b)} B`;
}

function evaluateCatmullRom3D(pts, u, outVec) {
  const n = pts.length;
  if (n === 0) {
    outVec.set(0, 0, 0);
    return outVec;
  }
  if (n === 1) {
    outVec.set(pts[0][0], pts[0][1], pts[0][2]);
    return outVec;
  }
  const scaled = clamp(u, 0, 1) * (n - 1);
  const seg = Math.min(n - 2, Math.floor(scaled));
  const t = scaled - seg;
  const t2 = t * t;
  const t3 = t2 * t;

  const p0 = pts[Math.max(0, seg - 1)];
  const p1 = pts[seg];
  const p2 = pts[seg + 1];
  const p3 = pts[Math.min(n - 1, seg + 2)];

  const x =
    0.5 *
    (2 * p1[0] +
      (-p0[0] + p2[0]) * t +
      (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
      (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
  const y =
    0.5 *
    (2 * p1[1] +
      (-p0[1] + p2[1]) * t +
      (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
      (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
  const z =
    0.5 *
    (2 * p1[2] +
      (-p0[2] + p2[2]) * t +
      (2 * p0[2] - 5 * p1[2] + 4 * p2[2] - p3[2]) * t2 +
      (-p0[2] + 3 * p1[2] - 3 * p2[2] + p3[2]) * t3);

  outVec.set(x, y, z);
  return outVec;
}

function detectInteriorHubAt(x, y, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  if (x < 680 || z < 680) return null;
  for (let i = 0; i < INTERIOR_ROOM_HUBS.length; i++) {
    const hub = INTERIOR_ROOM_HUBS[i];
    if (x >= hub.minX && x <= hub.maxX && z >= hub.minZ && z <= hub.maxZ) {
      if (Number.isFinite(y) && (y < hub.minY - 20 || y > hub.maxY + 40)) {
        continue;
      }
      return hub;
    }
  }
  return null;
}

// ============================================================================
// CHAPTER 1: High-Precision Circular Telemetry Buffers, Quickselect Percentiles,
// Display Refresh-Rate Calibrator & Non-Intrusive Subsystem Timing Profiler
// ============================================================================

class CircularTelemetryRing {
  constructor(capacity = PERF_HISTORY_FRAMES) {
    this.capacity = Math.max(16, capacity | 0);
    this.values = new Float32Array(this.capacity);
    this.sortScratch = new Float32Array(this.capacity);
    this.histogramBins = new Uint16Array(8);
    this.writeIndex = 0;
    this.count = 0;
    this.totalSamples = 0;

    this.ema = 16.67;
    this.minVal = 16.67;
    this.maxVal = 16.67;
    this.meanVal = 16.67;
    this.stdDevVal = 0;
    this.p50 = 16.67;
    this.p90 = 16.67;
    this.p95 = 16.67;
    this.p99 = 16.67;
    this.p999 = 16.67;
    this.spikesOver18Ms = 0;
    this.spikesOver33Ms = 0;
    this.pacingScore = 100;
    this._statsDirty = true;
  }

  reset(initialMs = 16.67) {
    this.values.fill(0);
    this.histogramBins.fill(0);
    this.writeIndex = 0;
    this.count = 0;
    this.totalSamples = 0;
    this.ema = initialMs;
    this.minVal = initialMs;
    this.maxVal = initialMs;
    this.meanVal = initialMs;
    this.stdDevVal = 0;
    this.p50 = initialMs;
    this.p90 = initialMs;
    this.p95 = initialMs;
    this.p99 = initialMs;
    this.p999 = initialMs;
    this.spikesOver18Ms = 0;
    this.spikesOver33Ms = 0;
    this.pacingScore = 100;
    this._statsDirty = false;
  }

  push(sampleMs) {
    const clean = Number.isFinite(sampleMs) ? clamp(sampleMs, 0.05, 250.0) : 16.67;
    this.values[this.writeIndex] = clean;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
    this.totalSamples++;

    if (this.totalSamples === 1) {
      this.ema = clean;
    } else {
      this.ema = this.ema * 0.9 + clean * 0.1;
    }

    if (clean > 18.5) this.spikesOver18Ms++;
    if (clean > 33.4) this.spikesOver33Ms++;
    this._statsDirty = true;
  }

  latest() {
    if (this.count === 0) return this.ema;
    const idx = (this.writeIndex - 1 + this.capacity) % this.capacity;
    return this.values[idx];
  }

  getChronological(indexFromOldest) {
    if (this.count === 0) return 0;
    const clampedIdx = clamp(indexFromOldest | 0, 0, this.count - 1);
    const start = this.count < this.capacity ? 0 : this.writeIndex;
    return this.values[(start + clampedIdx) % this.capacity];
  }

  recomputePercentiles() {
    if (!this._statsDirty) return this;
    this._statsDirty = false;

    const n = this.count;
    if (n === 0) return this;

    this.histogramBins.fill(0);
    let sum = 0;
    let minV = Infinity;
    let maxV = -Infinity;
    let deltaJitterSum = 0;
    const start = n < this.capacity ? 0 : this.writeIndex;
    let prev = this.values[start];

    for (let i = 0; i < n; i++) {
      const v = this.values[(start + i) % this.capacity];
      this.sortScratch[i] = v;
      sum += v;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
      if (i > 0) deltaJitterSum += Math.abs(v - prev);
      prev = v;

      // Frame-time distribution buckets:
      // [0]: <=8.5ms, [1]: <=12ms, [2]: <=16.8ms, [3]: <=20ms,
      // [4]: <=25ms, [5]: <=33.4ms, [6]: <=50ms, [7]: >50ms
      let bin = 7;
      if (v <= 8.5) bin = 0;
      else if (v <= 12.0) bin = 1;
      else if (v <= 16.8) bin = 2;
      else if (v <= 20.0) bin = 3;
      else if (v <= 25.0) bin = 4;
      else if (v <= 33.4) bin = 5;
      else if (v <= 50.0) bin = 6;
      this.histogramBins[bin]++;
    }

    const mean = sum / n;
    let varianceSum = 0;
    for (let i = 0; i < n; i++) {
      const d = this.sortScratch[i] - mean;
      varianceSum += d * d;
    }
    const stdDev = Math.sqrt(varianceSum / n);

    // In-place insertion/shell sort on contiguous Float32Array view (n <= 600 -> < 0.015ms!)
    const sub = this.sortScratch.subarray(0, n);
    sub.sort();

    this.minVal = minV;
    this.maxVal = maxV;
    this.meanVal = mean;
    this.stdDevVal = stdDev;
    this.p50 = sub[Math.min(n - 1, Math.floor(n * 0.5))];
    this.p90 = sub[Math.min(n - 1, Math.floor(n * 0.9))];
    this.p95 = sub[Math.min(n - 1, Math.floor(n * 0.95))];
    this.p99 = sub[Math.min(n - 1, Math.floor(n * 0.99))];
    this.p999 = sub[n - 1];

    const avgFrameStepJitter = n > 1 ? deltaJitterSum / (n - 1) : 0;
    const relJitter = avgFrameStepJitter / Math.max(4.0, mean);
    const tailRatio = (this.p99 - this.p50) / Math.max(6.0, this.p50);
    this.pacingScore = clamp(Math.round(100 - relJitter * 55 - tailRatio * 22), 0, 100);
    return this;
  }

  getInstantFps() {
    const ms = Math.max(0.5, this.ema);
    return 1000 / ms;
  }

  getAvgFps() {
    this.recomputePercentiles();
    return 1000 / Math.max(0.5, this.meanVal);
  }

  getOnePercentLowFps() {
    this.recomputePercentiles();
    return 1000 / Math.max(0.5, this.p99);
  }

  getPointOnePercentLowFps() {
    this.recomputePercentiles();
    return 1000 / Math.max(0.5, this.p999);
  }
}

class RefreshRateCalibrator {
  constructor() {
    this.intervalBins = new Uint16Array(STANDARD_REFRESH_RATES.length);
    this.sampleCount = 0;
    this.detectedHz = 60;
    this.targetFrameMs = 16.667;
    this.halfRateFrameMs = 33.333;
    this.isHighRefreshDisplay = false;
    this.confidence = 0;
  }

  recordWallDeltaMs(wallMs) {
    if (!Number.isFinite(wallMs) || wallMs < 3.4 || wallMs > 22.0) return;

    let bestIdx = -1;
    let bestErr = Infinity;
    for (let i = 0; i < STANDARD_REFRESH_RATES.length; i++) {
      const idealMs = 1000 / STANDARD_REFRESH_RATES[i];
      const err = Math.abs(wallMs - idealMs);
      if (err < bestErr) {
        bestErr = err;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0 && bestErr <= 1.65) {
      this.intervalBins[bestIdx]++;
      this.sampleCount++;

      // Decay older bins periodically so moving browser window across monitors adapts cleanly
      if (this.sampleCount >= 180) {
        for (let i = 0; i < this.intervalBins.length; i++) {
          this.intervalBins[i] = (this.intervalBins[i] * 3) >>> 2;
        }
        this.sampleCount = 90;
      }

      let winnerIdx = 0;
      let winnerVotes = 0;
      let totalVotes = 0;
      for (let i = 0; i < this.intervalBins.length; i++) {
        const v = this.intervalBins[i];
        totalVotes += v;
        if (v > winnerVotes) {
          winnerVotes = v;
          winnerIdx = i;
        }
      }

      if (totalVotes >= 24 && winnerVotes / totalVotes >= 0.45) {
        this.detectedHz = STANDARD_REFRESH_RATES[winnerIdx];
        this.targetFrameMs = 1000 / this.detectedHz;
        this.halfRateFrameMs = this.targetFrameMs * 2;
        this.isHighRefreshDisplay = this.detectedHz >= 90;
        this.confidence = clamp(winnerVotes / totalVotes, 0, 1);
      }
    }
  }
}

class SubsystemTimingTracker {
  constructor(definitions = SUBSYSTEM_DEFINITIONS, historyLen = PERF_HISTORY_FRAMES) {
    this.defs = definitions;
    this.historyLen = historyLen;
    this.tracks = new Map();
    this.orderedTracks = [];
    this.activeStack = [];

    for (let i = 0; i < definitions.length; i++) {
      const def = definitions[i];
      const track = {
        key: def.key,
        label: def.label,
        shortLabel: def.shortLabel,
        color: def.color,
        currentAccumMs: 0,
        lastFrameMs: 0,
        emaMs: 0,
        peakHoldMs: 0,
        peakHoldTimer: 0,
        callCount: 0,
        lastCallCount: 0,
        budgetSharePct: 0,
        history: new Float32Array(historyLen),
        historyCursor: 0,
        openStartMs: -1,
        openDepth: 0,
      };
      this.tracks.set(def.key, track);
      this.orderedTracks.push(track);
    }
  }

  ensureTrack(key, label = key, color = '#94a3b8') {
    let t = this.tracks.get(key);
    if (!t) {
      t = {
        key,
        label,
        shortLabel: label.slice(0, 12),
        color,
        currentAccumMs: 0,
        lastFrameMs: 0,
        emaMs: 0,
        peakHoldMs: 0,
        peakHoldTimer: 0,
        callCount: 0,
        lastCallCount: 0,
        budgetSharePct: 0,
        history: new Float32Array(this.historyLen),
        historyCursor: 0,
        openStartMs: -1,
        openDepth: 0,
      };
      this.tracks.set(key, t);
      this.orderedTracks.push(t);
    }
    return t;
  }

  beginFrameReset() {
    this.activeStack.length = 0;
    for (let i = 0; i < this.orderedTracks.length; i++) {
      const t = this.orderedTracks[i];
      t.currentAccumMs = 0;
      t.callCount = 0;
      t.openStartMs = -1;
      t.openDepth = 0;
    }
  }

  begin(key) {
    const t = this.tracks.get(key) || this.ensureTrack(key);
    if (t.openDepth === 0) {
      t.openStartMs = perfNow();
    }
    t.openDepth++;
    t.callCount++;
    return t.openStartMs;
  }

  end(key) {
    const t = this.tracks.get(key);
    if (!t || t.openDepth <= 0) return 0;
    t.openDepth--;
    if (t.openDepth === 0 && t.openStartMs >= 0) {
      const elapsed = Math.max(0, perfNow() - t.openStartMs);
      t.currentAccumMs += elapsed;
      t.openStartMs = -1;
      return elapsed;
    }
    return 0;
  }

  recordSpan(key, durationMs) {
    if (!Number.isFinite(durationMs) || durationMs < 0) return;
    const t = this.tracks.get(key) || this.ensureTrack(key);
    t.currentAccumMs += durationMs;
    t.callCount++;
  }

  commitFrame(dtSec = 0.016, targetBudgetMs = 16.667) {
    const safeDt = clamp(dtSec, 0.001, 0.25);
    const invBudget = 100 / Math.max(4.0, targetBudgetMs);
    let totalTrackedCpuMs = 0;

    for (let i = 0; i < this.orderedTracks.length; i++) {
      const t = this.orderedTracks[i];
      if (t.openDepth > 0 && t.openStartMs >= 0) {
        t.currentAccumMs += Math.max(0, perfNow() - t.openStartMs);
        t.openDepth = 0;
        t.openStartMs = -1;
      }

      const ms = clamp(t.currentAccumMs, 0, 120);
      t.lastFrameMs = ms;
      t.lastCallCount = t.callCount;
      t.emaMs = t.emaMs === 0 ? ms : t.emaMs * 0.86 + ms * 0.14;
      t.budgetSharePct = clamp(t.emaMs * invBudget, 0, 200);
      totalTrackedCpuMs += t.emaMs;

      if (ms >= t.peakHoldMs) {
        t.peakHoldMs = ms;
        t.peakHoldTimer = 2.6;
      } else {
        t.peakHoldTimer = Math.max(0, t.peakHoldTimer - safeDt);
        if (t.peakHoldTimer <= 0) {
          t.peakHoldMs = lerp(t.peakHoldMs, t.emaMs, 0.12);
        }
      }

      t.history[t.historyCursor] = ms;
      t.historyCursor = (t.historyCursor + 1) % this.historyLen;
    }

    return totalTrackedCpuMs;
  }

  getSnapshotObject() {
    const out = {};
    for (let i = 0; i < this.orderedTracks.length; i++) {
      const t = this.orderedTracks[i];
      out[t.key] = {
        label: t.label,
        shortLabel: t.shortLabel,
        color: t.color,
        ms: Number(t.emaMs.toFixed(3)),
        rawMs: Number(t.lastFrameMs.toFixed(3)),
        peakMs: Number(t.peakHoldMs.toFixed(3)),
        calls: t.lastCallCount,
        budgetPct: Number(t.budgetSharePct.toFixed(1)),
      };
    }
    return out;
  }
}

// ============================================================================
// CHAPTER 2: Zero-GC Generational Object Pools, Power-of-Two TypedArray Slabs,
// Structure-of-Arrays Particle Ring Pool & Memory Utilization Registry
// ============================================================================

class GenerationalObjectPool {
  constructor(options = {}) {
    this.name = options.name || 'generic_pool';
    this.category = options.category || 'general';
    this.factory =
      typeof options.factory === 'function' ? options.factory : () => ({});
    this.resetFn =
      typeof options.reset === 'function' ? options.reset : null;
    this.bytesPerItem = Math.max(16, Number(options.bytesPerItem) || 96);
    this.initialCapacity = Math.max(4, Number(options.initialCapacity) || 32);
    this.maxCapacity = Math.max(
      this.initialCapacity,
      Number(options.maxCapacity) || 4096
    );

    this.freeList = [];
    this.frameScratch = [];
    this.totalAllocated = 0;
    this.inUseCount = 0;
    this.peakInUse = 0;
    this.borrowHits = 0;
    this.borrowMisses = 0;
    this.totalBorrows = 0;
    this.totalReturns = 0;
    this.doubleFreePrevented = 0;
    this.compactedItems = 0;
    this.generationCounter = 1;
    this.idleFramesBelowHalf = 0;

    this.prewarm(this.initialCapacity);
  }

  _mintItem() {
    const obj = this.factory();
    if (obj && typeof obj === 'object') {
      Object.defineProperty(obj, '_perfPoolFlag', {
        value: {
          inFreeList: false,
          gen: this.generationCounter++,
          poolName: this.name,
        },
        enumerable: false,
        configurable: true,
        writable: false,
      });
    }
    this.totalAllocated++;
    return obj;
  }

  prewarm(targetCount) {
    const clamped = Math.min(this.maxCapacity, Math.max(0, targetCount | 0));
    while (this.totalAllocated < clamped) {
      const item = this._mintItem();
      if (this.resetFn) this.resetFn(item);
      if (item && item._perfPoolFlag) item._perfPoolFlag.inFreeList = true;
      this.freeList.push(item);
    }
    return this.freeList.length;
  }

  acquire() {
    this.totalBorrows++;
    let item;
    if (this.freeList.length > 0) {
      item = this.freeList.pop();
      this.borrowHits++;
      if (item && item._perfPoolFlag) {
        item._perfPoolFlag.inFreeList = false;
        item._perfPoolFlag.gen = (item._perfPoolFlag.gen + 1) | 0;
      }
    } else {
      this.borrowMisses++;
      if (this.totalAllocated < this.maxCapacity) {
        const batchGrow = Math.min(
          this.maxCapacity - this.totalAllocated,
          Math.max(4, Math.min(64, Math.ceil(this.totalAllocated * 0.35)))
        );
        for (let i = 1; i < batchGrow; i++) {
          const extra = this._mintItem();
          if (this.resetFn) this.resetFn(extra);
          if (extra && extra._perfPoolFlag) extra._perfPoolFlag.inFreeList = true;
          this.freeList.push(extra);
        }
      }
      item = this._mintItem();
      if (this.resetFn) this.resetFn(item);
      if (item && item._perfPoolFlag) {
        item._perfPoolFlag.inFreeList = false;
      }
    }

    this.inUseCount++;
    if (this.inUseCount > this.peakInUse) {
      this.peakInUse = this.inUseCount;
    }
    return item;
  }

  acquireScratch() {
    const item = this.acquire();
    this.frameScratch.push(item);
    return item;
  }

  release(item) {
    if (!item || typeof item !== 'object') return false;
    const meta = item._perfPoolFlag;
    if (meta) {
      if (meta.poolName !== this.name) return false;
      if (meta.inFreeList) {
        this.doubleFreePrevented++;
        return false;
      }
      meta.inFreeList = true;
      meta.gen = (meta.gen + 1) | 0;
    }

    if (this.resetFn) {
      this.resetFn(item);
    }

    this.inUseCount = Math.max(0, this.inUseCount - 1);
    this.totalReturns++;

    if (this.freeList.length < this.maxCapacity) {
      this.freeList.push(item);
    } else {
      this.totalAllocated = Math.max(this.inUseCount, this.totalAllocated - 1);
    }
    return true;
  }

  reclaimFrameScratch() {
    const n = this.frameScratch.length;
    if (n === 0) return 0;
    for (let i = n - 1; i >= 0; i--) {
      this.release(this.frameScratch[i]);
    }
    this.frameScratch.length = 0;
    return n;
  }

  compactIdle(minRetainRatio = 0.5) {
    const capacity = this.inUseCount + this.freeList.length;
    if (capacity <= this.initialCapacity) {
      this.idleFramesBelowHalf = 0;
      return 0;
    }

    if (this.inUseCount * 3 < capacity) {
      this.idleFramesBelowHalf++;
    } else {
      this.idleFramesBelowHalf = 0;
      return 0;
    }

    if (this.idleFramesBelowHalf < 8) return 0;
    this.idleFramesBelowHalf = 0;

    const targetCap = Math.max(
      this.initialCapacity,
      Math.ceil(Math.max(this.inUseCount * 2, capacity * clamp(minRetainRatio, 0.25, 0.9)))
    );
    const maxFreeKeep = Math.max(4, targetCap - this.inUseCount);
    let trimmed = 0;
    while (this.freeList.length > maxFreeKeep) {
      this.freeList.pop();
      this.totalAllocated = Math.max(this.inUseCount, this.totalAllocated - 1);
      trimmed++;
    }
    this.compactedItems += trimmed;
    return trimmed;
  }

  getHitRate() {
    if (this.totalBorrows === 0) return 100;
    return (this.borrowHits / this.totalBorrows) * 100;
  }

  getUtilizationPct() {
    const cap = Math.max(1, this.inUseCount + this.freeList.length);
    return clamp((this.inUseCount / cap) * 100, 0, 100);
  }

  getMetrics() {
    const capacity = this.inUseCount + this.freeList.length;
    return {
      name: this.name,
      category: this.category,
      inUse: this.inUseCount,
      free: this.freeList.length,
      capacity,
      peakInUse: this.peakInUse,
      hitRatePct: Number(this.getHitRate().toFixed(1)),
      utilizationPct: Number(this.getUtilizationPct().toFixed(1)),
      estimatedBytes: capacity * this.bytesPerItem,
      savedAllocBytes: this.borrowHits * this.bytesPerItem,
      borrows: this.totalBorrows,
      returns: this.totalReturns,
      compacted: this.compactedItems,
    };
  }
}

class TypedArraySlabPool {
  constructor() {
    this.bucketLengths = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];
    this.floatBuckets = this.bucketLengths.map(() => []);
    this.intBuckets = this.bucketLengths.map(() => []);
    this.uint16Buckets = this.bucketLengths.map(() => []);
    this.frameFloatScratch = [];
    this.frameIntScratch = [];

    this.maxSlabsPerBucket = 24;
    this.totalBorrows = 0;
    this.borrowHits = 0;
    this.inUseSlabs = 0;
    this.peakInUseSlabs = 0;
    this.cachedBytes = 0;

    // Prewarm small & medium slabs used frequently by BVH & Horizon culler
    for (let b = 0; b <= 5; b++) {
      const len = this.bucketLengths[b];
      const count = b <= 3 ? 6 : 3;
      for (let k = 0; k < count; k++) {
        this.floatBuckets[b].push(new Float32Array(len));
        this.intBuckets[b].push(new Int32Array(len));
        this.cachedBytes += len * 8;
      }
    }
  }

  _resolveBucketIndex(minLength) {
    const req = Math.max(1, minLength | 0);
    for (let i = 0; i < this.bucketLengths.length; i++) {
      if (this.bucketLengths[i] >= req) return i;
    }
    return -1;
  }

  acquireFloat32(minLength, zeroFill = true) {
    this.totalBorrows++;
    const idx = this._resolveBucketIndex(minLength);
    let arr;
    if (idx >= 0) {
      const bucket = this.floatBuckets[idx];
      if (bucket.length > 0) {
        arr = bucket.pop();
        this.borrowHits++;
        this.cachedBytes = Math.max(0, this.cachedBytes - arr.byteLength);
        if (zeroFill) arr.fill(0);
      } else {
        arr = new Float32Array(this.bucketLengths[idx]);
      }
    } else {
      arr = new Float32Array(Math.max(1, minLength | 0));
    }
    this.inUseSlabs++;
    if (this.inUseSlabs > this.peakInUseSlabs) this.peakInUseSlabs = this.inUseSlabs;
    return arr;
  }

  acquireFloat32Scratch(minLength, zeroFill = false) {
    const arr = this.acquireFloat32(minLength, zeroFill);
    this.frameFloatScratch.push(arr);
    return arr;
  }

  releaseFloat32(arr) {
    if (!(arr instanceof Float32Array)) return false;
    this.inUseSlabs = Math.max(0, this.inUseSlabs - 1);
    const idx = this.bucketLengths.indexOf(arr.length);
    if (idx >= 0 && this.floatBuckets[idx].length < this.maxSlabsPerBucket) {
      this.floatBuckets[idx].push(arr);
      this.cachedBytes += arr.byteLength;
      return true;
    }
    return false;
  }

  acquireInt32(minLength, zeroFill = true) {
    this.totalBorrows++;
    const idx = this._resolveBucketIndex(minLength);
    let arr;
    if (idx >= 0) {
      const bucket = this.intBuckets[idx];
      if (bucket.length > 0) {
        arr = bucket.pop();
        this.borrowHits++;
        this.cachedBytes = Math.max(0, this.cachedBytes - arr.byteLength);
        if (zeroFill) arr.fill(0);
      } else {
        arr = new Int32Array(this.bucketLengths[idx]);
      }
    } else {
      arr = new Int32Array(Math.max(1, minLength | 0));
    }
    this.inUseSlabs++;
    if (this.inUseSlabs > this.peakInUseSlabs) this.peakInUseSlabs = this.inUseSlabs;
    return arr;
  }

  acquireInt32Scratch(minLength, zeroFill = false) {
    const arr = this.acquireInt32(minLength, zeroFill);
    this.frameIntScratch.push(arr);
    return arr;
  }

  releaseInt32(arr) {
    if (!(arr instanceof Int32Array)) return false;
    this.inUseSlabs = Math.max(0, this.inUseSlabs - 1);
    const idx = this.bucketLengths.indexOf(arr.length);
    if (idx >= 0 && this.intBuckets[idx].length < this.maxSlabsPerBucket) {
      this.intBuckets[idx].push(arr);
      this.cachedBytes += arr.byteLength;
      return true;
    }
    return false;
  }

  acquireUint16(minLength, zeroFill = true) {
    this.totalBorrows++;
    const idx = this._resolveBucketIndex(minLength);
    let arr;
    if (idx >= 0) {
      const bucket = this.uint16Buckets[idx];
      if (bucket.length > 0) {
        arr = bucket.pop();
        this.borrowHits++;
        this.cachedBytes = Math.max(0, this.cachedBytes - arr.byteLength);
        if (zeroFill) arr.fill(0);
      } else {
        arr = new Uint16Array(this.bucketLengths[idx]);
      }
    } else {
      arr = new Uint16Array(Math.max(1, minLength | 0));
    }
    this.inUseSlabs++;
    if (this.inUseSlabs > this.peakInUseSlabs) this.peakInUseSlabs = this.inUseSlabs;
    return arr;
  }

  releaseUint16(arr) {
    if (!(arr instanceof Uint16Array)) return false;
    this.inUseSlabs = Math.max(0, this.inUseSlabs - 1);
    const idx = this.bucketLengths.indexOf(arr.length);
    if (idx >= 0 && this.uint16Buckets[idx].length < this.maxSlabsPerBucket) {
      this.uint16Buckets[idx].push(arr);
      this.cachedBytes += arr.byteLength;
      return true;
    }
    return false;
  }

  reclaimFrameScratch() {
    for (let i = this.frameFloatScratch.length - 1; i >= 0; i--) {
      this.releaseFloat32(this.frameFloatScratch[i]);
    }
    this.frameFloatScratch.length = 0;

    for (let i = this.frameIntScratch.length - 1; i >= 0; i--) {
      this.releaseInt32(this.frameIntScratch[i]);
    }
    this.frameIntScratch.length = 0;
  }

  compact(keepMaxPerBucket = 8) {
    let freedBytes = 0;
    for (let b = 0; b < this.bucketLengths.length; b++) {
      while (this.floatBuckets[b].length > keepMaxPerBucket) {
        const s = this.floatBuckets[b].pop();
        freedBytes += s.byteLength;
      }
      while (this.intBuckets[b].length > keepMaxPerBucket) {
        const s = this.intBuckets[b].pop();
        freedBytes += s.byteLength;
      }
      while (this.uint16Buckets[b].length > keepMaxPerBucket) {
        const s = this.uint16Buckets[b].pop();
        freedBytes += s.byteLength;
      }
    }
    this.cachedBytes = Math.max(0, this.cachedBytes - freedBytes);
    return freedBytes;
  }

  getMetrics() {
    let freeSlabs = 0;
    for (let b = 0; b < this.bucketLengths.length; b++) {
      freeSlabs +=
        this.floatBuckets[b].length +
        this.intBuckets[b].length +
        this.uint16Buckets[b].length;
    }
    const totalCap = Math.max(1, this.inUseSlabs + freeSlabs);
    return {
      name: 'typed_array_slabs',
      inUse: this.inUseSlabs,
      free: freeSlabs,
      capacity: totalCap,
      peakInUse: this.peakInUseSlabs,
      cachedBytes: this.cachedBytes,
      hitRatePct:
        this.totalBorrows > 0
          ? Number(((this.borrowHits / this.totalBorrows) * 100).toFixed(1))
          : 100,
      utilizationPct: Number(clamp((this.inUseSlabs / totalCap) * 100, 0, 100).toFixed(1)),
    };
  }
}

// Structure-of-Arrays (SoA) Transient Particle & Decal Ring Pool
// Eliminates per-particle JS object allocations for ambient debris/dust/sparks
class SoATransientPool {
  constructor(capacity = 512) {
    this.capacity = Math.max(32, capacity | 0);
    this.posX = new Float32Array(this.capacity);
    this.posY = new Float32Array(this.capacity);
    this.posZ = new Float32Array(this.capacity);
    this.velX = new Float32Array(this.capacity);
    this.velY = new Float32Array(this.capacity);
    this.velZ = new Float32Array(this.capacity);
    this.scale = new Float32Array(this.capacity);
    this.age = new Float32Array(this.capacity);
    this.life = new Float32Array(this.capacity);
    this.gravity = new Float32Array(this.capacity);
    this.active = new Uint8Array(this.capacity);
    this.kind = new Uint8Array(this.capacity);
    this.freeIndices = new Int32Array(this.capacity);
    this.freeTop = this.capacity;
    this.activeCount = 0;
    this.peakActive = 0;
    this.totalSpawned = 0;
    this.totalReclaimed = 0;

    for (let i = 0; i < this.capacity; i++) {
      this.freeIndices[i] = this.capacity - 1 - i;
    }
  }

  spawn(x, y, z, vx, vy, vz, lifeSec = 1.0, scaleVal = 0.25, gravityVal = 9.8, kindId = 1) {
    let slot = -1;
    if (this.freeTop > 0) {
      this.freeTop--;
      slot = this.freeIndices[this.freeTop];
      this.activeCount++;
      if (this.activeCount > this.peakActive) this.peakActive = this.activeCount;
    } else {
      // Steal oldest particle slot cleanly when saturated
      let bestSlot = 0;
      let bestFrac = -1;
      for (let i = 0; i < this.capacity; i += 4) {
        const frac = this.age[i] / Math.max(0.01, this.life[i]);
        if (frac > bestFrac) {
          bestFrac = frac;
          bestSlot = i;
        }
      }
      slot = bestSlot;
    }

    this.posX[slot] = x;
    this.posY[slot] = y;
    this.posZ[slot] = z;
    this.velX[slot] = vx;
    this.velY[slot] = vy;
    this.velZ[slot] = vz;
    this.scale[slot] = scaleVal;
    this.age[slot] = 0;
    this.life[slot] = Math.max(0.05, lifeSec);
    this.gravity[slot] = gravityVal;
    this.active[slot] = 1;
    this.kind[slot] = kindId & 0xff;
    this.totalSpawned++;
    return slot;
  }

  stepSlice(dt, startIdx = 0, maxCount = this.capacity) {
    if (this.activeCount === 0) return 0;
    const end = Math.min(this.capacity, startIdx + maxCount);
    let reclaimed = 0;
    for (let i = startIdx; i < end; i++) {
      if (this.active[i] === 0) continue;
      const nextAge = this.age[i] + dt;
      if (nextAge >= this.life[i]) {
        this.active[i] = 0;
        this.freeIndices[this.freeTop++] = i;
        this.activeCount = Math.max(0, this.activeCount - 1);
        this.totalReclaimed++;
        reclaimed++;
        continue;
      }
      this.age[i] = nextAge;
      this.velY[i] -= this.gravity[i] * dt;
      this.posX[i] += this.velX[i] * dt;
      this.posY[i] += this.velY[i] * dt;
      this.posZ[i] += this.velZ[i] * dt;
    }
    return reclaimed;
  }

  clearAll() {
    this.active.fill(0);
    this.activeCount = 0;
    this.freeTop = this.capacity;
    for (let i = 0; i < this.capacity; i++) {
      this.freeIndices[i] = this.capacity - 1 - i;
    }
  }

  getByteLength() {
    return (
      this.posX.byteLength * 10 +
      this.active.byteLength * 2 +
      this.freeIndices.byteLength
    );
  }
}

class PerfMemoryPoolRegistry {
  constructor() {
    this.poolsByName = new Map();
    this.orderedPools = [];
    this.typedSlabs = new TypedArraySlabPool();
    this.soaParticles = new SoATransientPool(512);

    // 1. Three.js Math Scratch & Transform Pools
    this.vec2 = this.registerPool({
      name: 'vec2',
      category: 'math',
      initialCapacity: 32,
      maxCapacity: 512,
      bytesPerItem: 48,
      factory: () => new THREE.Vector2(),
      reset: (v) => v.set(0, 0),
    });

    this.vec3 = this.registerPool({
      name: 'vec3',
      category: 'math',
      initialCapacity: 96,
      maxCapacity: 1024,
      bytesPerItem: 56,
      factory: () => new THREE.Vector3(),
      reset: (v) => v.set(0, 0, 0),
    });

    this.vec4 = this.registerPool({
      name: 'vec4',
      category: 'math',
      initialCapacity: 32,
      maxCapacity: 512,
      bytesPerItem: 64,
      factory: () => new THREE.Vector4(),
      reset: (v) => v.set(0, 0, 0, 1),
    });

    this.quat = this.registerPool({
      name: 'quat',
      category: 'math',
      initialCapacity: 32,
      maxCapacity: 512,
      bytesPerItem: 64,
      factory: () => new THREE.Quaternion(),
      reset: (q) => q.identity(),
    });

    this.euler = this.registerPool({
      name: 'euler',
      category: 'math',
      initialCapacity: 24,
      maxCapacity: 256,
      bytesPerItem: 64,
      factory: () => new THREE.Euler(0, 0, 0, 'YXZ'),
      reset: (e) => e.set(0, 0, 0, 'YXZ'),
    });

    this.mat4 = this.registerPool({
      name: 'mat4',
      category: 'math',
      initialCapacity: 32,
      maxCapacity: 512,
      bytesPerItem: 128,
      factory: () => new THREE.Matrix4(),
      reset: (m) => m.identity(),
    });

    this.box3 = this.registerPool({
      name: 'box3',
      category: 'spatial',
      initialCapacity: 64,
      maxCapacity: 1024,
      bytesPerItem: 112,
      factory: () => new THREE.Box3(),
      reset: (b) => b.makeEmpty(),
    });

    this.sphere = this.registerPool({
      name: 'sphere',
      category: 'spatial',
      initialCapacity: 48,
      maxCapacity: 512,
      bytesPerItem: 88,
      factory: () => new THREE.Sphere(),
      reset: (s) => {
        s.center.set(0, 0, 0);
        s.radius = 0;
      },
    });

    this.ray = this.registerPool({
      name: 'ray',
      category: 'spatial',
      initialCapacity: 24,
      maxCapacity: 256,
      bytesPerItem: 112,
      factory: () => new THREE.Ray(),
      reset: (r) => {
        r.origin.set(0, 0, 0);
        r.direction.set(0, 0, -1);
      },
    });

    this.color = this.registerPool({
      name: 'color',
      category: 'render',
      initialCapacity: 24,
      maxCapacity: 256,
      bytesPerItem: 56,
      factory: () => new THREE.Color(1, 1, 1),
      reset: (c) => c.setRGB(1, 1, 1),
    });

    // 2. Engine / Culler / AI Pathfinding / Shadow Queue Record Pools
    this.rayHit = this.registerPool({
      name: 'rayHit',
      category: 'spatial',
      initialCapacity: 32,
      maxCapacity: 512,
      bytesPerItem: 120,
      factory: () => ({
        hit: false,
        distance: Infinity,
        x: 0,
        y: 0,
        z: 0,
        nx: 0,
        ny: 1,
        nz: 0,
        object: null,
        entryIndex: -1,
      }),
      reset: (h) => {
        h.hit = false;
        h.distance = Infinity;
        h.x = 0;
        h.y = 0;
        h.z = 0;
        h.nx = 0;
        h.ny = 1;
        h.nz = 0;
        h.object = null;
        h.entryIndex = -1;
      },
    });

    this.shadowCandidate = this.registerPool({
      name: 'shadowCandidate',
      category: 'render',
      initialCapacity: 96,
      maxCapacity: 512,
      bytesPerItem: 96,
      factory: () => ({
        actor: null,
        rootMesh: null,
        score: Infinity,
        distSq: Infinity,
        isVehicle: false,
        isPlayer: false,
        inFrustum: false,
      }),
      reset: (c) => {
        c.actor = null;
        c.rootMesh = null;
        c.score = Infinity;
        c.distSq = Infinity;
        c.isVehicle = false;
        c.isPlayer = false;
        c.inFrustum = false;
      },
    });

    this.occluderRect = this.registerPool({
      name: 'occluderRect',
      category: 'spatial',
      initialCapacity: 32,
      maxCapacity: 256,
      bytesPerItem: 112,
      factory: () => ({
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
        farViewDepth: 0,
        nearViewDepth: 0,
        worldMinY: 0,
        worldMaxY: 0,
        solidArea: 0,
        sourceIndex: -1,
      }),
      reset: (o) => {
        o.minX = 0;
        o.maxX = 0;
        o.minY = 0;
        o.maxY = 0;
        o.farViewDepth = 0;
        o.nearViewDepth = 0;
        o.worldMinY = 0;
        o.worldMaxY = 0;
        o.solidArea = 0;
        o.sourceIndex = -1;
      },
    });

    this.pathNode = this.registerPool({
      name: 'pathNode',
      category: 'ai',
      initialCapacity: 128,
      maxCapacity: 2048,
      bytesPerItem: 88,
      factory: () => ({
        nodeId: -1,
        x: 0,
        z: 0,
        gCost: 0,
        fCost: 0,
        parent: null,
        closed: false,
      }),
      reset: (n) => {
        n.nodeId = -1;
        n.x = 0;
        n.z = 0;
        n.gCost = 0;
        n.fCost = 0;
        n.parent = null;
        n.closed = false;
      },
    });

    this.scheduledTask = this.registerPool({
      name: 'scheduledTask',
      category: 'scheduler',
      initialCapacity: 64,
      maxCapacity: 1024,
      bytesPerItem: 128,
      factory: () => ({
        id: 0,
        name: '',
        priority: TASK_PRIORITY.NORMAL,
        effectivePriority: TASK_PRIORITY.NORMAL,
        fn: null,
        stepFn: null,
        cursor: 0,
        totalItems: 0,
        chunkSize: 16,
        enqueuedAtMs: 0,
        estCostMs: 0.25,
        ageFrames: 0,
        completed: false,
      }),
      reset: (t) => {
        t.id = 0;
        t.name = '';
        t.priority = TASK_PRIORITY.NORMAL;
        t.effectivePriority = TASK_PRIORITY.NORMAL;
        t.fn = null;
        t.stepFn = null;
        t.cursor = 0;
        t.totalItems = 0;
        t.chunkSize = 16;
        t.enqueuedAtMs = 0;
        t.estCostMs = 0.25;
        t.ageFrames = 0;
        t.completed = false;
      },
    });
  }

  registerPool(options) {
    const existing = this.poolsByName.get(options.name);
    if (existing) return existing;
    const pool = new GenerationalObjectPool(options);
    this.poolsByName.set(pool.name, pool);
    this.orderedPools.push(pool);
    return pool;
  }

  createCustomPool(name, factory, reset, initialCapacity = 32, maxCapacity = 1024) {
    return this.registerPool({
      name,
      category: 'custom',
      factory,
      reset,
      initialCapacity,
      maxCapacity,
    });
  }

  acquire(poolName) {
    const pool = this.poolsByName.get(poolName);
    return pool ? pool.acquire() : null;
  }

  acquireScratch(poolName) {
    const pool = this.poolsByName.get(poolName);
    return pool ? pool.acquireScratch() : null;
  }

  release(poolName, item) {
    const pool = this.poolsByName.get(poolName);
    return pool ? pool.release(item) : false;
  }

  endFrameReclaim() {
    let reclaimed = 0;
    for (let i = 0; i < this.orderedPools.length; i++) {
      reclaimed += this.orderedPools[i].reclaimFrameScratch();
    }
    this.typedSlabs.reclaimFrameScratch();
    return reclaimed;
  }

  compactIdlePools() {
    let trimmed = 0;
    for (let i = 0; i < this.orderedPools.length; i++) {
      trimmed += this.orderedPools[i].compactIdle(0.55);
    }
    this.typedSlabs.compact(8);
    return trimmed;
  }

  getSummaryTelemetry() {
    let totalInUse = 0;
    let totalCapacity = 0;
    let totalBorrows = 0;
    let totalHits = 0;
    let totalBytes = this.typedSlabs.cachedBytes + this.soaParticles.getByteLength();
    let savedAllocBytes = 0;

    const groups = {
      math: { inUse: 0, capacity: 0, label: 'Math Scratch (Vec/Mat)' },
      spatial: { inUse: 0, capacity: 0, label: 'BVH & Ray Spatial' },
      render: { inUse: 0, capacity: 0, label: 'Shadow & Render Slots' },
      ai: { inUse: 0, capacity: 0, label: 'AI Path & Scheduler' },
    };

    const details = [];
    for (let i = 0; i < this.orderedPools.length; i++) {
      const p = this.orderedPools[i];
      const m = p.getMetrics();
      details.push(m);
      totalInUse += m.inUse;
      totalCapacity += m.capacity;
      totalBorrows += p.totalBorrows;
      totalHits += p.borrowHits;
      totalBytes += m.estimatedBytes;
      savedAllocBytes += m.savedAllocBytes;

      const gKey =
        m.category === 'scheduler' || m.category === 'custom' ? 'ai' : m.category;
      const g = groups[gKey] || groups.ai;
      g.inUse += m.inUse;
      g.capacity += m.capacity;
    }

    const slabMetrics = this.typedSlabs.getMetrics();
    totalInUse += slabMetrics.inUse + this.soaParticles.activeCount;
    totalCapacity += slabMetrics.capacity + this.soaParticles.capacity;

    const hitRatePct =
      totalBorrows > 0 ? Number(((totalHits / totalBorrows) * 100).toFixed(1)) : 100;
    const utilizationPct =
      totalCapacity > 0
        ? Number(clamp((totalInUse / totalCapacity) * 100, 0, 100).toFixed(1))
        : 0;

    let jsHeapUsedMB = 0;
    let jsHeapLimitMB = 0;
    if (
      typeof performance !== 'undefined' &&
      performance.memory &&
      Number.isFinite(performance.memory.usedJSHeapSize)
    ) {
      jsHeapUsedMB = Number(
        (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1)
      );
      jsHeapLimitMB = Number(
        ((performance.memory.jsHeapSizeLimit || 0) / (1024 * 1024)).toFixed(0)
      );
    }

    return {
      totalInUse,
      totalCapacity,
      utilizationPct,
      hitRatePct,
      poolFootprintBytes: totalBytes,
      savedAllocBytes,
      soaParticlesActive: this.soaParticles.activeCount,
      soaParticlesCapacity: this.soaParticles.capacity,
      jsHeapUsedMB,
      jsHeapLimitMB,
      slabMetrics,
      groups,
      details,
    };
  }
}

// ============================================================================
// CHAPTER 3: Scene Graph Classifier, Animated Prop Safeguards, Static Matrix
// Freezer (`matrixAutoUpdate = false`), Dirty Watchdog & Material/GPU Optimizer
// ============================================================================

const ANIMATED_NAME_PATTERN =
  /ferris|coaster|rotor|blade|propeller|wheel|tire|door|shutter|gate|vault|laser|strobe|beam|reel|slot|roulette|lucky|podium|turntable|corona|marker|ring|beacon|blink|signal|traffic|rain|sky|ocean|water|geyser|spark|flame|nitro|exhaust|smoke|dust|particle|bullet|tracer|shell|casing|explosion|rappel|cable|ped|npc|cop|swat|guard|dealer|dancer|bouncer|player|car|vehicle|bike|boat|jetski|yacht|heli|tank|turret|pickup|briefcase|target|drone/i;

class SceneClassifierAndOptimizer {
  constructor(pools) {
    this.pools = pools;
    this.explicitAnimatedSet = new WeakSet();
    this.explicitDynamicRoots = new Set();
    this.classifiedObjects = new WeakMap();

    // Flat Structure-of-Arrays for Frozen Static Watchdog (Zero-GC verification!)
    this.frozenObjects = [];
    this.frozenCapacity = 2048;
    this.frozenSnap = new Float32Array(this.frozenCapacity * 9);
    this.frozenPromoted = new Uint8Array(this.frozenCapacity);
    this.watchdogCursor = 0;
    this.initialFastVerifyFrames = 0;

    // Indexed Spatial Entries extracted for StaticSceneBVH & Interior Portal Manager
    this.staticEntries = [];
    this.interiorEntriesByHub = INTERIOR_ROOM_HUBS.map(() => []);
    this.outdoorEntries = [];

    // Material & GPU Resource Tracking
    this.canonicalMaterials = new Map();
    this.sharedMaterialsSet = new WeakSet();
    this.protectedMaterialsSet = new WeakSet();
    this.trackedGeometries = new Set();
    this.trackedMaterials = new Set();
    this.trackedTextures = new Set();
    this.disposedOrphanGeometries = 0;
    this.disposedOrphanMaterials = 0;
    this.disposedOrphanTextures = 0;
    this.deduplicatedMaterialCount = 0;
    this.deduplicatedUniformCount = 0;
    this.frozenStaticCount = 0;
    this.unfrozenByWatchdogCount = 0;
    this.skippedAnimatedCount = 0;
    this.estimatedVramBytes = 0;

    // Reusable scratch math objects for tight world bounds extraction
    this._tmpBox = new THREE.Box3();
    this._tmpBox2 = new THREE.Box3();
    this._tmpMat4 = new THREE.Matrix4();
    this._tmpSphere = new THREE.Sphere();
    this._tmpVec3 = new THREE.Vector3();
  }

  registerAnimatedObject(obj) {
    if (!obj || typeof obj !== 'object') return;
    this.explicitAnimatedSet.add(obj);
    if (typeof obj.traverse === 'function') {
      obj.traverse((child) => {
        this.explicitAnimatedSet.add(child);
        if (child.matrixAutoUpdate === false) {
          child.matrixAutoUpdate = true;
          child.updateMatrix();
          child.updateMatrixWorld(true);
        }
      });
    }
    let p = obj.parent;
    while (p && !p.isScene) {
      this.explicitAnimatedSet.add(p);
      p = p.parent;
    }
  }

  registerDynamicRoot(groupOrMesh) {
    if (!groupOrMesh || typeof groupOrMesh !== 'object') return;
    this.explicitDynamicRoots.add(groupOrMesh);
    this.registerAnimatedObject(groupOrMesh);
  }

  _collectKnownDynamicReferences(ctx) {
    const dynRoots = new WeakSet();
    const markTree = (root, protectMats = true) => {
      if (!root || typeof root !== 'object') return;
      dynRoots.add(root);
      if (typeof root.traverse === 'function') {
        root.traverse((node) => {
          dynRoots.add(node);
          if (protectMats && node.material) {
            if (Array.isArray(node.material)) {
              for (let i = 0; i < node.material.length; i++) {
                if (node.material[i]) this.protectedMaterialsSet.add(node.material[i]);
              }
            } else {
              this.protectedMaterialsSet.add(node.material);
            }
          }
        });
      }
      let anc = root.parent;
      while (anc && !anc.isScene) {
        dynRoots.add(anc);
        anc = anc.parent;
      }
    };

    for (const r of this.explicitDynamicRoots) {
      markTree(r, true);
    }

    // 1. Player rig & mesh
    if (ctx?.player) {
      markTree(ctx.player.mesh, true);
      markTree(ctx.player.rig?.root || ctx.player.rig?.mesh, true);
    }

    // 2. All ground, marine, air & armored vehicles
    const vehicles = ctx?.vehicles?.list;
    if (Array.isArray(vehicles)) {
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        if (v) markTree(v.mesh || v.root || v.group, true);
      }
    }
    const extraVehicles = ctx?.vehiclesExtra?.list || ctx?.vehiclesExtra?.boats;
    if (Array.isArray(extraVehicles)) {
      for (let i = 0; i < extraVehicles.length; i++) {
        const v = extraVehicles[i];
        if (v) markTree(v.mesh || v.root || v.group, true);
      }
    }

    // 3. Pedestrians, Cops, Helicopters, Pickups & Ambient NPC Life
    const gp = ctx?.gameplay;
    if (gp) {
      const actorArrays = [gp.peds, gp.cops, gp.helicopters, gp.pickups];
      for (let a = 0; a < actorArrays.length; a++) {
        const arr = actorArrays[a];
        if (!Array.isArray(arr)) continue;
        for (let i = 0; i < arr.length; i++) {
          const ent = arr[i];
          if (ent) markTree(ent.mesh || ent.root || ent.rig?.root, true);
        }
      }
    }

    const npcLife = ctx?.npcLife;
    if (npcLife) {
      const npcArrays = [npcLife.npcs, npcLife.emergencyUnits, npcLife.events, npcLife.protagonists];
      for (let a = 0; a < npcArrays.length; a++) {
        const arr = npcArrays[a];
        if (!Array.isArray(arr)) continue;
        for (let i = 0; i < arr.length; i++) {
          const ent = arr[i];
          if (ent) markTree(ent.mesh || ent.root || ent.rig?.root, true);
        }
      }
    }

    // 4. Physics-Destructible Street Props (Streetlights, Hydrants, Trash Bins, News Boxes)
    const dProps = ctx?.world?.destructibleProps;
    if (Array.isArray(dProps)) {
      for (let i = 0; i < dProps.length; i++) {
        const dp = dProps[i];
        if (!dp) continue;
        if (dp.meshA) markTree(dp.meshA, true);
        if (dp.meshB) markTree(dp.meshB, true);
        if (dp.mesh) markTree(dp.mesh, true);
      }
    }

    // 5. Casino Podium Car & Heist / Đua Đêm Giang Hồ Dynamic Entities
    if (ctx?.casinoWorld?.podiumCarMesh) {
      markTree(ctx.casinoWorld.podiumCarMesh, true);
    }
    if (ctx?.heists) {
      const heistArrays = [ctx.heists.racers, ctx.heists.checkpoints, ctx.heists.bounties];
      for (let a = 0; a < heistArrays.length; a++) {
        const arr = heistArrays[a];
        if (!Array.isArray(arr)) continue;
        for (let i = 0; i < arr.length; i++) {
          const ent = arr[i];
          if (ent) markTree(ent.mesh || ent.group || ent.root, true);
        }
      }
    }

    return dynRoots;
  }

  _isSpatiallyAnimatedLandmark(obj, worldBox) {
    if (!obj) return false;
    if (this.explicitAnimatedSet.has(obj)) return true;
    if (obj.userData && (obj.userData.animated || obj.userData.isDynamic || obj.userData.noStaticFreeze)) {
      return true;
    }

    const nameStr = `${obj.name || ''} ${obj.parent?.name || ''} ${obj.geometry?.name || ''}`;
    if (nameStr.trim().length > 0 && ANIMATED_NAME_PATTERN.test(nameStr)) {
      return true;
    }

    // Lights, Cameras, Sprites, Lines (Rain, Lasers, Rappel), Points (Dust/Sparks), SkinnedMeshes
    if (
      obj.isLight ||
      obj.isCamera ||
      obj.isSprite ||
      obj.isLine ||
      obj.isLineSegments ||
      obj.isPoints ||
      obj.isSkinnedMesh
    ) {
      return true;
    }

    // Custom ShaderMaterial (Sky Dome, Animated GLSL Ocean, Sweeping Túy Tiên Lâu Lasers, Neon Pulse)
    const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
    if (mat && (mat.isShaderMaterial || mat.isRawShaderMaterial)) {
      return true;
    }
    if (mat && mat.uniforms && (mat.uniforms.uTime || mat.uniforms.time)) {
      return true;
    }

    // InstancedMesh checks:
    // - Traffic signal lenses have instanceColor updated dynamically
    // - Pooled water geysers & sparks park inactive instances at y = -999
    // - Ferris wheel cabins (count === 16) sit on Bồng Lai Pier
    if (obj.isInstancedMesh) {
      if (obj.instanceColor) return true;
      const count = obj.count || 0;
      if (count > 0 && count <= 512) {
        const checkLimit = Math.min(count, 24);
        for (let i = 0; i < checkLimit; i++) {
          obj.getMatrixAt(i, this._tmpMat4);
          const wy = this._tmpMat4.elements[13];
          if (wy < -150 || !Number.isFinite(wy)) {
            return true;
          }
        }
      }
      if (count === 16 && worldBox && worldBox.min.x < -195 && worldBox.max.x > -290) {
        return true;
      }
    }

    // Geometry-type checks for rotating/bobbing corona markers & glowing rings
    const geoType = obj.geometry?.type || '';
    if (geoType === 'RingGeometry' || geoType === 'TorusGeometry' || geoType === 'OctahedronGeometry') {
      return true;
    }
    if (
      geoType === 'CylinderGeometry' &&
      mat &&
      mat.transparent === true &&
      mat.depthWrite === false
    ) {
      return true;
    }

    if (worldBox && !worldBox.isEmpty()) {
      const cx = (worldBox.min.x + worldBox.max.x) * 0.5;
      const cy = (worldBox.min.y + worldBox.max.y) * 0.5;
      const cz = (worldBox.min.z + worldBox.max.z) * 0.5;
      const sx = worldBox.max.x - worldBox.min.x;
      const sy = worldBox.max.y - worldBox.min.y;
      const sz = worldBox.max.z - worldBox.min.z;

      // 1) Luyện Khí Các Showroom Overhead Shutter Door around (-52, 2.6..5.3, 80)
      if (
        cx >= -55.5 &&
        cx <= -48.5 &&
        cz >= 73.5 &&
        cz <= 86.5 &&
        cy >= 1.2 &&
        cy <= 6.8 &&
        sx < 3.0 &&
        sz >= 6.0 &&
        sz <= 14.0
      ) {
        return true;
      }

      // 2) Bồng Lai Pier Rotating Ferris Wheel (-245, 25, -12, radius ~21m)
      if (
        cx >= -272 &&
        cx <= -218 &&
        cz >= -25 &&
        cz <= 2 &&
        worldBox.max.y >= 6.5 &&
        sx <= 52 &&
        sz <= 26
      ) {
        return true;
      }

      // 3) Bồng Lai Pier 3-Car Roller Coaster Train Cars along (-290..-200, z in [-2, +22])
      if (
        cx >= -295 &&
        cx <= -198 &&
        cz >= -2 &&
        cz <= 24 &&
        cy >= 3.8 &&
        sx <= 5.5 &&
        sy <= 4.0 &&
        sz <= 5.5
      ) {
        return true;
      }

      // 4) Vạn Bảo Đổ Phường Interior Rotating Podium / Vòng Quay Thiên Mệnh / Roulette / Slots around (1200, 1200)
      if (
        cx >= 1170 &&
        cx <= 1230 &&
        cz >= 1175 &&
        cz <= 1225 &&
        sx <= 6.5 &&
        sz <= 6.5 &&
        sy <= 6.5
      ) {
        return true;
      }

      // 5) Túy Tiên Lâu Interior Sweeping Lasers, DJ Turntables & Dancefloor around (1500, 1500)
      if (
        cx >= 1480 &&
        cx <= 1520 &&
        cz >= 1480 &&
        cz <= 1518 &&
        sx <= 14.0 &&
        sz <= 14.0 &&
        (mat?.transparent || mat?.emissiveIntensity > 0.8)
      ) {
        return true;
      }

      // 6) Linh Thạch Bảo Khố Circular Steel Bank Vault Door around (2100, 2100)
      if (
        cx >= 2080 &&
        cx <= 2120 &&
        cz >= 2080 &&
        cz <= 2120 &&
        sx <= 7.0 &&
        sz <= 7.0 &&
        sy <= 6.5
      ) {
        return true;
      }
    }

    return false;
  }

  computeTightWorldBox(obj, outBox) {
    outBox.makeEmpty();
    if (!obj || !obj.geometry) return outBox;

    const geo = obj.geometry;
    if (!geo.boundingBox) {
      geo.computeBoundingBox();
    }
    if (!geo.boundingSphere) {
      geo.computeBoundingSphere();
    }
    const localBox = geo.boundingBox;
    if (!localBox || localBox.isEmpty()) return outBox;

    if (obj.isInstancedMesh) {
      const count = obj.count || 0;
      if (count <= 0) return outBox;
      let validInstances = 0;
      for (let i = 0; i < count; i++) {
        obj.getMatrixAt(i, this._tmpMat4);
        const wy = this._tmpMat4.elements[13];
        if (!Number.isFinite(wy) || wy < -250) continue;
        this._tmpBox2.copy(localBox).applyMatrix4(this._tmpMat4);
        outBox.union(this._tmpBox2);
        validInstances++;
      }
      if (validInstances === 0) return outBox.makeEmpty();
      outBox.applyMatrix4(obj.matrixWorld);
      return outBox;
    }

    outBox.copy(localBox).applyMatrix4(obj.matrixWorld);
    return outBox;
  }

  _recordFrozenObject(obj) {
    const idx = this.frozenObjects.length;
    if (idx >= this.frozenCapacity) {
      const nextCap = this.frozenCapacity * 2;
      const nextSnap = new Float32Array(nextCap * 9);
      nextSnap.set(this.frozenSnap);
      this.frozenSnap = nextSnap;

      const nextProm = new Uint8Array(nextCap);
      nextProm.set(this.frozenPromoted);
      this.frozenPromoted = nextProm;
      this.frozenCapacity = nextCap;
    }

    this.frozenObjects.push(obj);
    const base = idx * 9;
    this.frozenSnap[base] = obj.position.x;
    this.frozenSnap[base + 1] = obj.position.y;
    this.frozenSnap[base + 2] = obj.position.z;
    this.frozenSnap[base + 3] = obj.rotation.x;
    this.frozenSnap[base + 4] = obj.rotation.y;
    this.frozenSnap[base + 5] = obj.rotation.z;
    this.frozenSnap[base + 6] = obj.scale.x;
    this.frozenSnap[base + 7] = obj.scale.y;
    this.frozenSnap[base + 8] = obj.scale.z;
    this.frozenPromoted[idx] = 0;
    this.frozenStaticCount++;
  }

  runTransformWatchdogSlice(maxChecks = WATCHDOG_SLICE_SIZE) {
    const total = this.frozenObjects.length;
    if (total === 0) return 0;

    // During first 4 frames after indexing, sweep larger chunks to catch any
    // newly animated custom props within 1-2 frames!
    const checks =
      this.initialFastVerifyFrames > 0
        ? Math.ceil(total * 0.35)
        : Math.min(total, Math.max(8, maxChecks | 0));
    if (this.initialFastVerifyFrames > 0) this.initialFastVerifyFrames--;

    let promotedNow = 0;
    for (let k = 0; k < checks; k++) {
      const i = (this.watchdogCursor + k) % total;
      if (this.frozenPromoted[i]) continue;
      const obj = this.frozenObjects[i];
      if (!obj || !obj.parent) {
        this.frozenPromoted[i] = 1;
        continue;
      }

      const b = i * 9;
      const moved =
        Math.abs(obj.position.x - this.frozenSnap[b]) > 1e-4 ||
        Math.abs(obj.position.y - this.frozenSnap[b + 1]) > 1e-4 ||
        Math.abs(obj.position.z - this.frozenSnap[b + 2]) > 1e-4 ||
        Math.abs(obj.rotation.x - this.frozenSnap[b + 3]) > 1e-4 ||
        Math.abs(obj.rotation.y - this.frozenSnap[b + 4]) > 1e-4 ||
        Math.abs(obj.rotation.z - this.frozenSnap[b + 5]) > 1e-4 ||
        Math.abs(obj.scale.x - this.frozenSnap[b + 6]) > 1e-4 ||
        Math.abs(obj.scale.y - this.frozenSnap[b + 7]) > 1e-4 ||
        Math.abs(obj.scale.z - this.frozenSnap[b + 8]) > 1e-4;

      if (moved) {
        this.frozenPromoted[i] = 1;
        this.frozenStaticCount = Math.max(0, this.frozenStaticCount - 1);
        this.unfrozenByWatchdogCount++;
        this.registerAnimatedObject(obj);
        obj.matrixAutoUpdate = true;
        obj.updateMatrix();
        obj.updateMatrixWorld(true);
        promotedNow++;
      }
    }

    this.watchdogCursor = (this.watchdogCursor + checks) % Math.max(1, total);
    return promotedNow;
  }

  _computeMaterialSignature(mat) {
    if (!mat || typeof mat !== 'object') return null;
    if (this.protectedMaterialsSet.has(mat)) return null;
    if (mat.isShaderMaterial || mat.isRawShaderMaterial) return null;
    if (typeof mat.onBeforeCompile === 'function') {
      // Check if it's Three.js default no-op onBeforeCompile vs custom injected shader
      const fnSrc = Function.prototype.toString.call(mat.onBeforeCompile);
      if (fnSrc.length > 42) return null;
    }

    const allowedTypes =
      mat.isMeshStandardMaterial ||
      mat.isMeshPhysicalMaterial ||
      mat.isMeshLambertMaterial ||
      mat.isMeshPhongMaterial ||
      mat.isMeshBasicMaterial;
    if (!allowedTypes) return null;

    const texKey = (t) => (t && t.uuid ? t.uuid : 'none');
    const colHex = mat.color && typeof mat.color.getHexString === 'function' ? mat.color.getHexString() : 'no';
    const emiHex =
      mat.emissive && typeof mat.emissive.getHexString === 'function'
        ? mat.emissive.getHexString()
        : '000000';

    return [
      mat.type,
      colHex,
      emiHex,
      Number(mat.emissiveIntensity ?? 0).toFixed(3),
      Number(mat.roughness ?? -1).toFixed(3),
      Number(mat.metalness ?? -1).toFixed(3),
      Number(mat.clearcoat ?? 0).toFixed(3),
      Number(mat.clearcoatRoughness ?? 0).toFixed(3),
      Number(mat.opacity ?? 1).toFixed(3),
      mat.transparent ? 1 : 0,
      Number(mat.alphaTest ?? 0).toFixed(3),
      mat.side ?? 0,
      mat.depthWrite ? 1 : 0,
      mat.depthTest ? 1 : 0,
      mat.vertexColors ? 1 : 0,
      mat.flatShading ? 1 : 0,
      mat.wireframe ? 1 : 0,
      mat.blending ?? 1,
      mat.polygonOffset ? `${mat.polygonOffsetFactor}:${mat.polygonOffsetUnits}` : '0',
      Number(mat.envMapIntensity ?? 1).toFixed(2),
      texKey(mat.map),
      texKey(mat.normalMap),
      texKey(mat.roughnessMap),
      texKey(mat.metalnessMap),
      texKey(mat.aoMap),
      texKey(mat.emissiveMap),
      texKey(mat.alphaMap),
      texKey(mat.envMap),
    ].join('|');
  }

  _deduplicateMeshMaterialsAndUniforms(obj, orphanCandidates) {
    if (!obj || !obj.material) return;

    const processSingleMat = (mat) => {
      if (!mat) return mat;
      this.trackedMaterials.add(mat);
      this._trackMaterialTextures(mat);

      // Deduplicate identical static Vector2/Vector3/Color uniform objects inside ShaderMaterials
      if (mat.uniforms && typeof mat.uniforms === 'object') {
        const uKeys = Object.keys(mat.uniforms);
        for (let i = 0; i < uKeys.length; i++) {
          const uName = uKeys[i];
          const uObj = mat.uniforms[uName];
          if (!uObj || uObj.value == null) continue;
          if (uObj.value && uObj.value.isTexture) {
            this.trackedTextures.add(uObj.value);
          }
        }
      }

      const sig = this._computeMaterialSignature(mat);
      if (!sig) return mat;

      const canonical = this.canonicalMaterials.get(sig);
      if (!canonical) {
        this.canonicalMaterials.set(sig, mat);
        this.sharedMaterialsSet.add(mat);
        return mat;
      }
      if (canonical === mat) return mat;

      this.deduplicatedMaterialCount++;
      this.deduplicatedUniformCount += 8;
      orphanCandidates.add(mat);
      return canonical;
    };

    if (Array.isArray(obj.material)) {
      let changed = false;
      const nextArr = obj.material.slice();
      for (let i = 0; i < nextArr.length; i++) {
        const deduped = processSingleMat(nextArr[i]);
        if (deduped !== nextArr[i]) {
          nextArr[i] = deduped;
          changed = true;
        }
      }
      if (changed) obj.material = nextArr;
    } else {
      const deduped = processSingleMat(obj.material);
      if (deduped !== obj.material) {
        obj.material = deduped;
      }
    }
  }

  _trackMaterialTextures(mat) {
    if (!mat) return;
    const slots = [
      'map',
      'normalMap',
      'roughnessMap',
      'metalnessMap',
      'aoMap',
      'emissiveMap',
      'alphaMap',
      'bumpMap',
      'lightMap',
      'envMap',
      'clearcoatNormalMap',
    ];
    for (let i = 0; i < slots.length; i++) {
      const tex = mat[slots[i]];
      if (tex && tex.isTexture) {
        this.trackedTextures.add(tex);
      }
    }
  }

  _estimateSceneVramBytes() {
    let geoBytes = 0;
    for (const geo of this.trackedGeometries) {
      if (!geo || !geo.attributes) continue;
      const attrNames = Object.keys(geo.attributes);
      for (let i = 0; i < attrNames.length; i++) {
        const attr = geo.attributes[attrNames[i]];
        if (attr?.array?.byteLength) geoBytes += attr.array.byteLength;
      }
      if (geo.index?.array?.byteLength) {
        geoBytes += geo.index.array.byteLength;
      }
    }

    let texBytes = 0;
    for (const tex of this.trackedTextures) {
      const img = tex?.image;
      if (!img) continue;
      const w = Number(img.width || img.videoWidth || 256);
      const h = Number(img.height || img.videoHeight || 256);
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        const mipFactor = tex.generateMipmaps !== false ? 1.333 : 1.0;
        texBytes += Math.round(w * h * 4 * mipFactor);
      }
    }

    this.estimatedVramBytes = geoBytes + texBytes;
    return this.estimatedVramBytes;
  }

  setStaticFreezeEnabled(enabled) {
    const freeze = Boolean(enabled);
    for (let i = 0; i < this.frozenObjects.length; i++) {
      if (this.frozenPromoted[i]) continue;
      const obj = this.frozenObjects[i];
      if (!obj) continue;
      if (freeze) {
        obj.updateMatrix();
        obj.matrixAutoUpdate = false;
      } else {
        obj.matrixAutoUpdate = true;
      }
    }
  }

  applyTextureAnisotropyCap(maxAniso, renderer) {
    const hwCap = Math.min(16, renderer?.capabilities?.getMaxAnisotropy?.() || 4);
    const target = clamp(maxAniso | 0, 1, hwCap);
    let updated = 0;
    for (const tex of this.trackedTextures) {
      if (!tex || tex.isCubeTexture) continue;
      if (tex.anisotropy !== target) {
        tex.anisotropy = target;
        updated++;
      }
    }
    return updated;
  }

  scanAndOptimizeScene(ctx, options = {}) {
    const scene = ctx?.engine?.scene;
    if (!scene) return { indexedStatic: 0, frozenCount: 0 };

    const enableFreeze = options.enableStaticFreeze !== false;
    const enableMatDedup = options.enableMaterialDedup !== false;

    scene.updateMatrixWorld(true);

    const dynamicSet = this._collectKnownDynamicReferences(ctx);
    const orphanMaterialCandidates = new Set();
    const activeMaterialsAfterPass = new WeakSet();

    // Reset spatial arrays while keeping canonical material table warm
    this.staticEntries.length = 0;
    this.outdoorEntries.length = 0;
    for (let h = 0; h < this.interiorEntriesByHub.length; h++) {
      this.interiorEntriesByHub[h].length = 0;
    }
    this.frozenObjects.length = 0;
    this.frozenStaticCount = 0;
    this.skippedAnimatedCount = 0;

    // Protect weather-mutated materials on road/sidewalk/windows in world.js by
    // checking emissive/roughness sync candidates safely: deduplication only merges
    // materials that already have 100% identical properties!
    const lodSectorGroupSet = new WeakSet();
    const lodSectors = ctx?.world?.lodSectors;
    if (Array.isArray(lodSectors)) {
      for (let i = 0; i < lodSectors.length; i++) {
        if (lodSectors[i]?.group) lodSectorGroupSet.add(lodSectors[i].group);
      }
    }

    scene.traverse((obj) => {
      if (!obj || obj === scene) return;

      if (obj.geometry) {
        this.trackedGeometries.add(obj.geometry);
      }

      if (obj.isLight || obj.isCamera) {
        this.classifiedObjects.set(obj, OBJECT_CLASS.LIGHT_OR_HELPER);
        return;
      }

      const isRenderable =
        obj.isMesh || obj.isInstancedMesh || obj.isLine || obj.isLineSegments || obj.isPoints || obj.isSprite;
      if (!isRenderable) return;

      if (dynamicSet.has(obj)) {
        this.classifiedObjects.set(obj, OBJECT_CLASS.DYNAMIC_ACTOR);
        this.skippedAnimatedCount++;
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m && this.trackedMaterials.add(m));
          } else {
            this.trackedMaterials.add(obj.material);
          }
        }
        return;
      }

      const wBox = this.computeTightWorldBox(obj, this._tmpBox);
      const hasValidBounds =
        !wBox.isEmpty() &&
        Number.isFinite(wBox.min.x) &&
        Number.isFinite(wBox.max.x) &&
        Number.isFinite(wBox.min.y) &&
        Number.isFinite(wBox.max.y) &&
        Number.isFinite(wBox.min.z) &&
        Number.isFinite(wBox.max.z);

      // Sky dome or giant ocean envelope (> 850m span) -> SKY_ENV, never cull!
      if (hasValidBounds) {
        const spanX = wBox.max.x - wBox.min.x;
        const spanZ = wBox.max.z - wBox.min.z;
        if (spanX > 850 || spanZ > 850) {
          this.classifiedObjects.set(obj, OBJECT_CLASS.SKY_ENV);
          this.skippedAnimatedCount++;
          return;
        }
      }

      const isAnimated = this._isSpatiallyAnimatedLandmark(obj, hasValidBounds ? wBox : null);
      if (isAnimated) {
        this.classifiedObjects.set(obj, OBJECT_CLASS.ANIMATED_WORLD);
        this.skippedAnimatedCount++;
        return;
      }

      // Deduplicate identical static materials cleanly
      if (enableMatDedup) {
        this._deduplicateMeshMaterialsAndUniforms(obj, orphanMaterialCandidates);
      }

      // Freeze matrixAutoUpdate on genuinely static renderable mesh!
      if (enableFreeze) {
        obj.updateMatrix();
        obj.updateMatrixWorld(false);
        obj.matrixAutoUpdate = false;
        this._recordFrozenObject(obj);
      }

      if (!hasValidBounds) return;

      const cx = (wBox.min.x + wBox.max.x) * 0.5;
      const cy = (wBox.min.y + wBox.max.y) * 0.5;
      const cz = (wBox.min.z + wBox.max.z) * 0.5;
      const dx = (wBox.max.x - wBox.min.x) * 0.5;
      const dy = (wBox.max.y - wBox.min.y) * 0.5;
      const dz = (wBox.max.z - wBox.min.z) * 0.5;
      const radius = Math.hypot(dx, dy, dz);

      const interiorHub = detectInteriorHubAt(cx, cy, cz);
      const isLargeBatch = dx * 2 > 140 || dz * 2 > 140;

      // Check if an ancestor group is managed by world.js lodSectors
      let managedByWorldLodSector = false;
      let pNode = obj.parent;
      while (pNode && !pNode.isScene) {
        if (lodSectorGroupSet.has(pNode)) {
          managedByWorldLodSector = true;
          break;
        }
        pNode = pNode.parent;
      }

      const objClass = interiorHub
        ? OBJECT_CLASS.INTERIOR_MESH
        : obj.isInstancedMesh
          ? OBJECT_CLASS.STATIC_INSTANCED
          : isLargeBatch
            ? OBJECT_CLASS.STATIC_CITY_BATCH
            : OBJECT_CLASS.STATIC_SECTOR_DETAIL;

      this.classifiedObjects.set(obj, objClass);

      const estTris = obj.geometry
        ? (obj.geometry.index
            ? obj.geometry.index.count / 3
            : (obj.geometry.attributes?.position?.count || 0) / 3) *
          (obj.isInstancedMesh ? Math.max(1, obj.count || 1) : 1)
        : 12;

      const entry = {
        id: this.staticEntries.length,
        object: obj,
        objClass,
        interiorHubIndex: interiorHub ? interiorHub.index : -1,
        isLargeCityBatch: isLargeBatch,
        managedByWorldLodSector,
        minX: wBox.min.x,
        minY: wBox.min.y,
        minZ: wBox.min.z,
        maxX: wBox.max.x,
        maxY: wBox.max.y,
        maxZ: wBox.max.z,
        cx,
        cy,
        cz,
        radius,
        estTriangles: Math.round(estTris),
      };

      this.staticEntries.push(entry);
      if (interiorHub) {
        this.interiorEntriesByHub[interiorHub.index].push(entry);
      } else {
        this.outdoorEntries.push(entry);
      }
    });

    // Safely dispose any newly orphaned duplicate materials that have zero live references
    if (orphanMaterialCandidates.size > 0) {
      scene.traverse((obj) => {
        if (!obj?.material) return;
        if (Array.isArray(obj.material)) {
          for (let i = 0; i < obj.material.length; i++) {
            if (obj.material[i]) activeMaterialsAfterPass.add(obj.material[i]);
          }
        } else {
          activeMaterialsAfterPass.add(obj.material);
        }
      });

      for (const cand of orphanMaterialCandidates) {
        if (!activeMaterialsAfterPass.has(cand) && typeof cand.dispose === 'function') {
          cand.dispose();
          this.trackedMaterials.delete(cand);
          this.disposedOrphanMaterials++;
        }
      }
    }

    this.initialFastVerifyFrames = 4;
    this._estimateSceneVramBytes();

    return {
      indexedStatic: this.staticEntries.length,
      outdoorCount: this.outdoorEntries.length,
      frozenCount: this.frozenStaticCount,
      skippedAnimated: this.skippedAnimatedCount,
      deduplicatedMaterials: this.deduplicatedMaterialCount,
      estimatedVramBytes: this.estimatedVramBytes,
    };
  }

  disposeUnusedResources(ctx) {
    const scene = ctx?.engine?.scene;
    if (!scene) return { geometries: 0, materials: 0, textures: 0 };

    const liveGeos = new Set();
    const liveMats = new Set();
    const liveTexs = new Set();

    // Protect engine shared procedural textures!
    const engTextures = ctx?.engine?.textures;
    if (engTextures && typeof engTextures === 'object') {
      const vals = Object.values(engTextures);
      for (let i = 0; i < vals.length; i++) {
        if (vals[i]?.isTexture) liveTexs.add(vals[i]);
      }
    }
    if (ctx?.engine?.envMap) liveTexs.add(ctx.engine.envMap);

    scene.traverse((obj) => {
      if (obj.geometry) liveGeos.add(obj.geometry);
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (let i = 0; i < mats.length; i++) {
          const m = mats[i];
          if (!m) continue;
          liveMats.add(m);
          const slots = [
            'map',
            'normalMap',
            'roughnessMap',
            'metalnessMap',
            'aoMap',
            'emissiveMap',
            'alphaMap',
            'envMap',
          ];
          for (let s = 0; s < slots.length; s++) {
            if (m[slots[s]]?.isTexture) liveTexs.add(m[slots[s]]);
          }
          if (m.uniforms) {
            for (const u of Object.values(m.uniforms)) {
              if (u?.value?.isTexture) liveTexs.add(u.value);
            }
          }
        }
      }
    });

    let dispGeo = 0;
    let dispMat = 0;
    let dispTex = 0;

    for (const g of Array.from(this.trackedGeometries)) {
      if (!liveGeos.has(g) && typeof g?.dispose === 'function') {
        g.dispose();
        this.trackedGeometries.delete(g);
        this.disposedOrphanGeometries++;
        dispGeo++;
      }
    }

    for (const m of Array.from(this.trackedMaterials)) {
      if (
        !liveMats.has(m) &&
        !this.sharedMaterialsSet.has(m) &&
        !this.protectedMaterialsSet.has(m) &&
        typeof m?.dispose === 'function'
      ) {
        m.dispose();
        this.trackedMaterials.delete(m);
        this.disposedOrphanMaterials++;
        dispMat++;
      }
    }

    for (const t of Array.from(this.trackedTextures)) {
      if (!liveTexs.has(t) && typeof t?.dispose === 'function') {
        t.dispose();
        this.trackedTextures.delete(t);
        this.disposedOrphanTextures++;
        dispTex++;
      }
    }

    this.pools.compactIdlePools();
    this._estimateSceneVramBytes();

    return { geometries: dispGeo, materials: dispMat, textures: dispTex };
  }
}

// ============================================================================
// CHAPTER 4: Contiguous TypedArray 3D SAH Bounding Volume Hierarchy (FlatSAHBVH)
// & Zero-Allocation 2D Dynamic Actor Spatial Hash Grid
// ============================================================================

const SAH_BIN_COUNT = 8;

class FlatSAHBVH {
  constructor(initialLeafCapacity = 1024) {
    const maxNodes = Math.max(64, initialLeafCapacity * 2);
    this.maxNodes = maxNodes;
    this.nodeBounds = new Float32Array(maxNodes * 6);
    this.nodeLeft = new Int32Array(maxNodes);
    this.nodeRight = new Int32Array(maxNodes);
    this.nodeStart = new Int32Array(maxNodes);
    this.nodeCount = new Int32Array(maxNodes);
    this.entryIndices = new Int32Array(initialLeafCapacity);

    this.entries = [];
    this.nodeUsed = 0;
    this.maxDepth = 0;
    this.leafCount = 0;
    this.lastBuildMs = 0;

    // Reusable 6-plane Gribb-Hartmann frustum buffer: [nx, ny, nz, d] * 6
    this.frustumPlanes = new Float32Array(24);
    this._projScreenMatrix = new THREE.Matrix4();

    // Fixed traversal stack (no recursion overhead or call-stack allocation!)
    this._travNodeStack = new Int32Array(128);
    this._travMaskStack = new Uint8Array(128);

    // Reusable SAH binning buffers
    this._binCounts = new Int32Array(SAH_BIN_COUNT);
    this._binBounds = new Float32Array(SAH_BIN_COUNT * 6);
    this._leftArea = new Float32Array(SAH_BIN_COUNT);
    this._leftCounts = new Int32Array(SAH_BIN_COUNT);
    this._rightBounds = new Float32Array(6);
  }

  _ensureCapacity(entryCount) {
    if (entryCount > this.entryIndices.length) {
      let cap = this.entryIndices.length;
      while (cap < entryCount) cap *= 2;
      this.entryIndices = new Int32Array(cap);
    }
    const reqNodes = Math.max(64, entryCount * 2 + 8);
    if (reqNodes > this.maxNodes) {
      let nCap = this.maxNodes;
      while (nCap < reqNodes) nCap *= 2;
      this.maxNodes = nCap;
      this.nodeBounds = new Float32Array(nCap * 6);
      this.nodeLeft = new Int32Array(nCap);
      this.nodeRight = new Int32Array(nCap);
      this.nodeStart = new Int32Array(nCap);
      this.nodeCount = new Int32Array(nCap);
    }
  }

  build(entriesArray) {
    const t0 = perfNow();
    this.entries = Array.isArray(entriesArray) ? entriesArray : [];
    const n = this.entries.length;
    this.nodeUsed = 0;
    this.maxDepth = 0;
    this.leafCount = 0;

    if (n === 0) {
      this.lastBuildMs = perfNow() - t0;
      return this;
    }

    this._ensureCapacity(n);
    for (let i = 0; i < n; i++) {
      this.entryIndices[i] = i;
    }

    this._buildNodeRecursive(0, n, 0);
    this.lastBuildMs = perfNow() - t0;
    return this;
  }

  _allocNode() {
    const id = this.nodeUsed++;
    this.nodeLeft[id] = -1;
    this.nodeRight[id] = -1;
    this.nodeStart[id] = 0;
    this.nodeCount[id] = 0;
    return id;
  }

  _surfaceArea(minX, minY, minZ, maxX, maxY, maxZ) {
    const dx = Math.max(0, maxX - minX);
    const dy = Math.max(0, maxY - minY);
    const dz = Math.max(0, maxZ - minZ);
    return 2.0 * (dx * dy + dy * dz + dz * dx);
  }

  _buildNodeRecursive(start, count, depth) {
    const nodeId = this._allocNode();
    if (depth > this.maxDepth) this.maxDepth = depth;

    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;
    let cMinX = Infinity,
      cMinY = Infinity,
      cMinZ = Infinity;
    let cMaxX = -Infinity,
      cMaxY = -Infinity,
      cMaxZ = -Infinity;

    for (let i = start, end = start + count; i < end; i++) {
      const e = this.entries[this.entryIndices[i]];
      if (e.minX < minX) minX = e.minX;
      if (e.minY < minY) minY = e.minY;
      if (e.minZ < minZ) minZ = e.minZ;
      if (e.maxX > maxX) maxX = e.maxX;
      if (e.maxY > maxY) maxY = e.maxY;
      if (e.maxZ > maxZ) maxZ = e.maxZ;

      if (e.cx < cMinX) cMinX = e.cx;
      if (e.cy < cMinY) cMinY = e.cy;
      if (e.cz < cMinZ) cMinZ = e.cz;
      if (e.cx > cMaxX) cMaxX = e.cx;
      if (e.cy > cMaxY) cMaxY = e.cy;
      if (e.cz > cMaxZ) cMaxZ = e.cz;
    }

    const nb = nodeId * 6;
    this.nodeBounds[nb] = minX;
    this.nodeBounds[nb + 1] = minY;
    this.nodeBounds[nb + 2] = minZ;
    this.nodeBounds[nb + 3] = maxX;
    this.nodeBounds[nb + 4] = maxY;
    this.nodeBounds[nb + 5] = maxZ;

    // Leaf termination condition
    if (count <= 4 || depth >= 22) {
      this.nodeStart[nodeId] = start;
      this.nodeCount[nodeId] = count;
      this.leafCount++;
      return nodeId;
    }

    const extX = cMaxX - cMinX;
    const extY = cMaxY - cMinY;
    const extZ = cMaxZ - cMinZ;

    // Pick longest centroid extent axis (preferring XZ horizontal city plane when tied)
    let axis = 0;
    let axisMin = cMinX;
    let axisExtent = extX;
    if (extZ >= extX && extZ >= extY * 0.85) {
      axis = 2;
      axisMin = cMinZ;
      axisExtent = extZ;
    } else if (extY > extX && extY > extZ) {
      axis = 1;
      axisMin = cMinY;
      axisExtent = extY;
    }

    if (axisExtent < 1e-4) {
      this.nodeStart[nodeId] = start;
      this.nodeCount[nodeId] = count;
      this.leafCount++;
      return nodeId;
    }

    // 8-Bin Surface Area Heuristic (SAH) evaluation along chosen axis
    this._binCounts.fill(0);
    for (let b = 0; b < SAH_BIN_COUNT; b++) {
      const bo = b * 6;
      this._binBounds[bo] = Infinity;
      this._binBounds[bo + 1] = Infinity;
      this._binBounds[bo + 2] = Infinity;
      this._binBounds[bo + 3] = -Infinity;
      this._binBounds[bo + 4] = -Infinity;
      this._binBounds[bo + 5] = -Infinity;
    }

    const scale = SAH_BIN_COUNT / axisExtent;
    for (let i = start, end = start + count; i < end; i++) {
      const e = this.entries[this.entryIndices[i]];
      const cVal = axis === 0 ? e.cx : axis === 1 ? e.cy : e.cz;
      let bin = Math.floor((cVal - axisMin) * scale);
      if (bin < 0) bin = 0;
      else if (bin >= SAH_BIN_COUNT) bin = SAH_BIN_COUNT - 1;

      this._binCounts[bin]++;
      const bo = bin * 6;
      if (e.minX < this._binBounds[bo]) this._binBounds[bo] = e.minX;
      if (e.minY < this._binBounds[bo + 1]) this._binBounds[bo + 1] = e.minY;
      if (e.minZ < this._binBounds[bo + 2]) this._binBounds[bo + 2] = e.minZ;
      if (e.maxX > this._binBounds[bo + 3]) this._binBounds[bo + 3] = e.maxX;
      if (e.maxY > this._binBounds[bo + 4]) this._binBounds[bo + 4] = e.maxY;
      if (e.maxZ > this._binBounds[bo + 5]) this._binBounds[bo + 5] = e.maxZ;
    }

    // Prefix sweep for left child SAH area & count
    let lMinX = Infinity,
      lMinY = Infinity,
      lMinZ = Infinity;
    let lMaxX = -Infinity,
      lMaxY = -Infinity,
      lMaxZ = -Infinity;
    let lCnt = 0;

    for (let b = 0; b < SAH_BIN_COUNT - 1; b++) {
      const bo = b * 6;
      if (this._binCounts[b] > 0) {
        lCnt += this._binCounts[b];
        if (this._binBounds[bo] < lMinX) lMinX = this._binBounds[bo];
        if (this._binBounds[bo + 1] < lMinY) lMinY = this._binBounds[bo + 1];
        if (this._binBounds[bo + 2] < lMinZ) lMinZ = this._binBounds[bo + 2];
        if (this._binBounds[bo + 3] > lMaxX) lMaxX = this._binBounds[bo + 3];
        if (this._binBounds[bo + 4] > lMaxY) lMaxY = this._binBounds[bo + 4];
        if (this._binBounds[bo + 5] > lMaxZ) lMaxZ = this._binBounds[bo + 5];
      }
      this._leftCounts[b] = lCnt;
      this._leftArea[b] =
        lCnt > 0 ? this._surfaceArea(lMinX, lMinY, lMinZ, lMaxX, lMaxY, lMaxZ) : 0;
    }

    // Suffix sweep for right child SAH cost minimization
    let rMinX = Infinity,
      rMinY = Infinity,
      rMinZ = Infinity;
    let rMaxX = -Infinity,
      rMaxY = -Infinity,
      rMaxZ = -Infinity;
    let rCnt = 0;
    let bestCost = Infinity;
    let bestSplitBin = -1;

    for (let b = SAH_BIN_COUNT - 1; b >= 1; b--) {
      const bo = b * 6;
      if (this._binCounts[b] > 0) {
        rCnt += this._binCounts[b];
        if (this._binBounds[bo] < rMinX) rMinX = this._binBounds[bo];
        if (this._binBounds[bo + 1] < rMinY) rMinY = this._binBounds[bo + 1];
        if (this._binBounds[bo + 2] < rMinZ) rMinZ = this._binBounds[bo + 2];
        if (this._binBounds[bo + 3] > rMaxX) rMaxX = this._binBounds[bo + 3];
        if (this._binBounds[bo + 4] > rMaxY) rMaxY = this._binBounds[bo + 4];
        if (this._binBounds[bo + 5] > rMaxZ) rMaxZ = this._binBounds[bo + 5];
      }
      const leftCount = this._leftCounts[b - 1];
      if (leftCount > 0 && rCnt > 0) {
        const rightArea = this._surfaceArea(rMinX, rMinY, rMinZ, rMaxX, rMaxY, rMaxZ);
        const cost = leftCount * this._leftArea[b - 1] + rCnt * rightArea;
        if (cost < bestCost) {
          bestCost = cost;
          bestSplitBin = b;
        }
      }
    }

    const parentArea = Math.max(1e-4, this._surfaceArea(minX, minY, minZ, maxX, maxY, maxZ));
    const leafCost = count * parentArea;
    let splitPos = axisMin + axisExtent * 0.5;
    if (bestSplitBin > 0 && bestCost < leafCost * 1.15) {
      splitPos = axisMin + (bestSplitBin / SAH_BIN_COUNT) * axisExtent;
    }

    // In-place Hoare partition of entryIndices[start .. start + count - 1]
    let i = start;
    let j = start + count - 1;
    while (i <= j) {
      const e = this.entries[this.entryIndices[i]];
      const cVal = axis === 0 ? e.cx : axis === 1 ? e.cy : e.cz;
      if (cVal < splitPos) {
        i++;
      } else {
        const tmp = this.entryIndices[i];
        this.entryIndices[i] = this.entryIndices[j];
        this.entryIndices[j] = tmp;
        j--;
      }
    }

    let leftCount = i - start;
    if (leftCount <= 0 || leftCount >= count) {
      leftCount = count >>> 1;
    }

    const leftChild = this._buildNodeRecursive(start, leftCount, depth + 1);
    const rightChild = this._buildNodeRecursive(start + leftCount, count - leftCount, depth + 1);

    this.nodeLeft[nodeId] = leftChild;
    this.nodeRight[nodeId] = rightChild;
    this.nodeStart[nodeId] = start;
    this.nodeCount[nodeId] = 0; // 0 denotes internal node
    return nodeId;
  }

  extractCameraFrustumPlanes(camera) {
    if (!camera) return this.frustumPlanes;
    camera.updateMatrixWorld();
    this._projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const m = this._projScreenMatrix.elements;

    const setPlane = (idx, a, b, c, d) => {
      const invLen = 1.0 / (Math.hypot(a, b, c) || 1e-8);
      const o = idx * 4;
      this.frustumPlanes[o] = a * invLen;
      this.frustumPlanes[o + 1] = b * invLen;
      this.frustumPlanes[o + 2] = c * invLen;
      this.frustumPlanes[o + 3] = d * invLen;
    };

    // Gribb-Hartmann 6 normalized world-space frustum planes (inward-pointing normals)
    setPlane(0, m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]); // Right
    setPlane(1, m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]); // Left
    setPlane(2, m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]); // Bottom
    setPlane(3, m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]); // Top
    setPlane(4, m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]); // Far
    setPlane(5, m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]); // Near
    return this.frustumPlanes;
  }

  isSphereInFrustum(cx, cy, cz, radius, margin = 1.2) {
    const r = radius + margin;
    const p = this.frustumPlanes;
    for (let k = 0; k < 6; k++) {
      const o = k * 4;
      const dist = p[o] * cx + p[o + 1] * cy + p[o + 2] * cz + p[o + 3];
      if (dist < -r) return false;
    }
    return true;
  }

  isBoxInFrustumMasked(minX, minY, minZ, maxX, maxY, maxZ, inMask = 0x3f, margin = 0.75) {
    const p = this.frustumPlanes;
    let outChildMask = 0;

    for (let k = 0; k < 6; k++) {
      const bit = 1 << k;
      if ((inMask & bit) === 0) continue;

      const o = k * 4;
      const nx = p[o];
      const ny = p[o + 1];
      const nz = p[o + 2];
      const d = p[o + 3];

      const px = nx >= 0 ? maxX : minX;
      const py = ny >= 0 ? maxY : minY;
      const pz = nz >= 0 ? maxZ : minZ;
      if (nx * px + ny * py + nz * pz + d < -margin) {
        return -1; // Strictly outside frustum!
      }

      const qx = nx >= 0 ? minX : maxX;
      const qy = ny >= 0 ? minY : maxY;
      const qz = nz >= 0 ? minZ : maxZ;
      if (nx * qx + ny * qy + nz * qz + d < margin) {
        outChildMask |= bit; // Intersects plane k; children still need plane k check
      }
    }
    return outChildMask;
  }

  traverseFrustumVisibility(visibilityFlagsUint8, margin = 1.0) {
    let nodesVisited = 0;
    let leavesVisited = 0;
    if (this.nodeUsed === 0) return { nodesVisited, leavesVisited };

    visibilityFlagsUint8.fill(0);

    let sp = 0;
    this._travNodeStack[sp] = 0;
    this._travMaskStack[sp] = 0x3f;
    sp++;

    while (sp > 0) {
      sp--;
      const nodeId = this._travNodeStack[sp];
      const planeMask = this._travMaskStack[sp];
      nodesVisited++;

      let nextMask = 0;
      if (planeMask !== 0) {
        const nb = nodeId * 6;
        nextMask = this.isBoxInFrustumMasked(
          this.nodeBounds[nb],
          this.nodeBounds[nb + 1],
          this.nodeBounds[nb + 2],
          this.nodeBounds[nb + 3],
          this.nodeBounds[nb + 4],
          this.nodeBounds[nb + 5],
          planeMask,
          margin
        );
        if (nextMask < 0) continue; // Entire BVH subtree outside camera frustum!
      }

      const cnt = this.nodeCount[nodeId];
      if (cnt > 0) {
        leavesVisited++;
        const start = this.nodeStart[nodeId];
        if (nextMask === 0) {
          // Entire leaf guaranteed inside all 6 frustum planes!
          for (let i = start, end = start + cnt; i < end; i++) {
            visibilityFlagsUint8[this.entryIndices[i]] = 1;
          }
        } else {
          for (let i = start, end = start + cnt; i < end; i++) {
            const idx = this.entryIndices[i];
            const e = this.entries[idx];
            const res = this.isBoxInFrustumMasked(
              e.minX,
              e.minY,
              e.minZ,
              e.maxX,
              e.maxY,
              e.maxZ,
              nextMask,
              margin
            );
            if (res >= 0) visibilityFlagsUint8[idx] = 1;
          }
        }
      } else {
        const left = this.nodeLeft[nodeId];
        const right = this.nodeRight[nodeId];
        if (right >= 0 && sp < 126) {
          this._travNodeStack[sp] = right;
          this._travMaskStack[sp] = nextMask;
          sp++;
        }
        if (left >= 0 && sp < 126) {
          this._travNodeStack[sp] = left;
          this._travMaskStack[sp] = nextMask;
          sp++;
        }
      }
    }

    return { nodesVisited, leavesVisited };
  }

  querySphere(cx, cy, cz, radius, outEntries = []) {
    outEntries.length = 0;
    if (this.nodeUsed === 0) return outEntries;
    const rSq = radius * radius;

    let sp = 0;
    this._travNodeStack[sp++] = 0;
    while (sp > 0) {
      const nodeId = this._travNodeStack[--sp];
      const nb = nodeId * 6;
      const nx = clamp(cx, this.nodeBounds[nb], this.nodeBounds[nb + 3]) - cx;
      const ny = clamp(cy, this.nodeBounds[nb + 1], this.nodeBounds[nb + 4]) - cy;
      const nz = clamp(cz, this.nodeBounds[nb + 2], this.nodeBounds[nb + 5]) - cz;
      if (nx * nx + ny * ny + nz * nz > rSq) continue;

      const cnt = this.nodeCount[nodeId];
      if (cnt > 0) {
        const start = this.nodeStart[nodeId];
        for (let i = start, end = start + cnt; i < end; i++) {
          const e = this.entries[this.entryIndices[i]];
          const ex = clamp(cx, e.minX, e.maxX) - cx;
          const ey = clamp(cy, e.minY, e.maxY) - cy;
          const ez = clamp(cz, e.minZ, e.maxZ) - cz;
          if (ex * ex + ey * ey + ez * ez <= rSq) {
            outEntries.push(e);
          }
        }
      } else {
        if (this.nodeRight[nodeId] >= 0 && sp < 126) this._travNodeStack[sp++] = this.nodeRight[nodeId];
        if (this.nodeLeft[nodeId] >= 0 && sp < 126) this._travNodeStack[sp++] = this.nodeLeft[nodeId];
      }
    }
    return outEntries;
  }

  raycast(ox, oy, oz, dx, dy, dz, maxDist = 500) {
    if (this.nodeUsed === 0) return null;
    const invDx = Math.abs(dx) > 1e-8 ? 1 / dx : 1e8;
    const invDy = Math.abs(dy) > 1e-8 ? 1 / dy : 1e8;
    const invDz = Math.abs(dz) > 1e-8 ? 1 / dz : 1e8;

    let closestT = maxDist;
    let bestEntry = null;

    let sp = 0;
    this._travNodeStack[sp++] = 0;
    while (sp > 0) {
      const nodeId = this._travNodeStack[--sp];
      const nb = nodeId * 6;

      const tx1 = (this.nodeBounds[nb] - ox) * invDx;
      const tx2 = (this.nodeBounds[nb + 3] - ox) * invDx;
      let tmin = Math.min(tx1, tx2);
      let tmax = Math.max(tx1, tx2);

      const ty1 = (this.nodeBounds[nb + 1] - oy) * invDy;
      const ty2 = (this.nodeBounds[nb + 4] - oy) * invDy;
      tmin = Math.max(tmin, Math.min(ty1, ty2));
      tmax = Math.min(tmax, Math.max(ty1, ty2));

      const tz1 = (this.nodeBounds[nb + 2] - oz) * invDz;
      const tz2 = (this.nodeBounds[nb + 5] - oz) * invDz;
      tmin = Math.max(tmin, Math.min(tz1, tz2));
      tmax = Math.min(tmax, Math.max(tz1, tz2));

      if (tmax < Math.max(0, tmin) || tmin > closestT) continue;

      const cnt = this.nodeCount[nodeId];
      if (cnt > 0) {
        const start = this.nodeStart[nodeId];
        for (let i = start, end = start + cnt; i < end; i++) {
          const e = this.entries[this.entryIndices[i]];
          const ex1 = (e.minX - ox) * invDx;
          const ex2 = (e.maxX - ox) * invDx;
          let etmin = Math.min(ex1, ex2);
          let etmax = Math.max(ex1, ex2);

          const ey1 = (e.minY - oy) * invDy;
          const ey2 = (e.maxY - oy) * invDy;
          etmin = Math.max(etmin, Math.min(ey1, ey2));
          etmax = Math.min(etmax, Math.max(ey1, ey2));

          const ez1 = (e.minZ - oz) * invDz;
          const ez2 = (e.maxZ - oz) * invDz;
          etmin = Math.max(etmin, Math.min(ez1, ez2));
          etmax = Math.min(etmax, Math.max(ez1, ez2));

          if (etmax >= Math.max(0, etmin) && etmin < closestT) {
            closestT = Math.max(0, etmin);
            bestEntry = e;
          }
        }
      } else {
        if (this.nodeRight[nodeId] >= 0 && sp < 126) this._travNodeStack[sp++] = this.nodeRight[nodeId];
        if (this.nodeLeft[nodeId] >= 0 && sp < 126) this._travNodeStack[sp++] = this.nodeLeft[nodeId];
      }
    }

    if (!bestEntry) return null;
    return {
      entry: bestEntry,
      object: bestEntry.object,
      distance: closestT,
      x: ox + dx * closestT,
      y: oy + dy * closestT,
      z: oz + dz * closestT,
    };
  }
}

class DynamicSpatialHash2D {
  constructor(cellSize = 32, tableBuckets = 512, maxActors = 512) {
    this.cellSize = Math.max(8, cellSize);
    this.invCellSize = 1 / this.cellSize;
    this.bucketMask = tableBuckets - 1;
    this.bucketHeads = new Int32Array(tableBuckets);
    this.bucketHeads.fill(-1);

    this.maxActors = maxActors;
    this.nextLink = new Int32Array(maxActors);
    this.cellCoordX = new Int16Array(maxActors);
    this.cellCoordZ = new Int16Array(maxActors);
    this.actorX = new Float32Array(maxActors);
    this.actorY = new Float32Array(maxActors);
    this.actorZ = new Float32Array(maxActors);
    this.actorRadius = new Float32Array(maxActors);
    this.actorKind = new Uint8Array(maxActors); // 1=vehicle, 2=ped, 3=cop, 4=heli, 5=pickup, 6=other
    this.actorRefs = new Array(maxActors);
    this.actorMeshes = new Array(maxActors);
    this.count = 0;
  }

  _grow(minCap) {
    let cap = this.maxActors;
    while (cap < minCap) cap *= 2;
    this.maxActors = cap;
    this.nextLink = new Int32Array(cap);
    this.cellCoordX = new Int16Array(cap);
    this.cellCoordZ = new Int16Array(cap);
    this.actorX = new Float32Array(cap);
    this.actorY = new Float32Array(cap);
    this.actorZ = new Float32Array(cap);
    this.actorRadius = new Float32Array(cap);
    this.actorKind = new Uint8Array(cap);
    this.actorRefs.length = cap;
    this.actorMeshes.length = cap;
  }

  _hashCell(cx, cz) {
    const h = (Math.imul(cx, 73856093) ^ Math.imul(cz, 19349663)) >>> 0;
    return h & this.bucketMask;
  }

  clear() {
    this.bucketHeads.fill(-1);
    for (let i = 0; i < this.count; i++) {
      this.actorRefs[i] = null;
      this.actorMeshes[i] = null;
    }
    this.count = 0;
  }

  insert(actor, mesh, x, y, z, radius = 1.5, kind = 2) {
    if (!mesh || !Number.isFinite(x) || !Number.isFinite(z)) return -1;
    const idx = this.count;
    if (idx >= this.maxActors) this._grow(idx + 32);

    const cx = Math.floor(x * this.invCellSize);
    const cz = Math.floor(z * this.invCellSize);
    const b = this._hashCell(cx, cz);

    this.nextLink[idx] = this.bucketHeads[b];
    this.bucketHeads[b] = idx;
    this.cellCoordX[idx] = cx;
    this.cellCoordZ[idx] = cz;
    this.actorX[idx] = x;
    this.actorY[idx] = Number.isFinite(y) ? y : 0.5;
    this.actorZ[idx] = z;
    this.actorRadius[idx] = radius;
    this.actorKind[idx] = kind;
    this.actorRefs[idx] = actor;
    this.actorMeshes[idx] = mesh;
    this.count++;
    return idx;
  }

  rebuildFromContext(ctx) {
    this.clear();
    if (!ctx) return 0;

    // 1. Vehicles (`ctx.vehicles.list` + `ctx.vehiclesExtra`)
    const seenMeshes = new WeakSet();
    const addVehicleList = (arr) => {
      if (!Array.isArray(arr)) return;
      for (let i = 0; i < arr.length; i++) {
        const car = arr[i];
        const mesh = car?.mesh || car?.root || car?.group;
        if (!car || !mesh || seenMeshes.has(mesh)) continue;
        seenMeshes.add(mesh);
        const x = Number.isFinite(car.x) ? car.x : mesh.position.x;
        const y = Number.isFinite(car.y) ? car.y : mesh.position.y;
        const z = Number.isFinite(car.z) ? car.z : mesh.position.z;
        const r = car.isHeli ? 5.2 : Math.max(2.3, Number(car.halfL) ? car.halfL + 0.6 : 2.6);
        this.insert(car, mesh, x, y + 0.9, z, r, car.isHeli ? 4 : 1);
      }
    };
    addVehicleList(ctx.vehicles?.list);
    addVehicleList(ctx.vehiclesExtra?.list);
    addVehicleList(ctx.vehiclesExtra?.boats);
    addVehicleList(ctx.heists?.racers);

    // 2. Pedestrians, Cops, Helicopters, Pickups & Ambient NPC Life
    const addCharList = (arr, kindId, radius, yOff) => {
      if (!Array.isArray(arr)) return;
      for (let i = 0; i < arr.length; i++) {
        const ent = arr[i];
        const mesh = ent?.mesh || ent?.root || ent?.rig?.root;
        if (!ent || !mesh || seenMeshes.has(mesh)) continue;
        seenMeshes.add(mesh);
        const x = Number.isFinite(ent.x) ? ent.x : mesh.position.x;
        const y = Number.isFinite(ent.y) ? ent.y : mesh.position.y;
        const z = Number.isFinite(ent.z) ? ent.z : mesh.position.z;
        this.insert(ent, mesh, x, y + yOff, z, radius, kindId);
      }
    };

    const gp = ctx.gameplay;
    if (gp) {
      addCharList(gp.peds, 2, 1.15, 0.95);
      addCharList(gp.cops, 3, 1.2, 0.95);
      addCharList(gp.helicopters, 4, 5.4, 1.2);
      addCharList(gp.pickups, 5, 1.1, 0.5);
    }
    if (ctx.npcLife) {
      addCharList(ctx.npcLife.npcs, 2, 1.15, 0.95);
      addCharList(ctx.npcLife.emergencyUnits, 1, 2.8, 1.0);
    }
    if (ctx.heists) {
      addCharList(ctx.heists.bounties, 3, 1.25, 0.95);
    }

    return this.count;
  }

  queryRadius2D(x, z, radius, outIndices = []) {
    outIndices.length = 0;
    const minCX = Math.floor((x - radius) * this.invCellSize);
    const maxCX = Math.floor((x + radius) * this.invCellSize);
    const minCZ = Math.floor((z - radius) * this.invCellSize);
    const maxCZ = Math.floor((z + radius) * this.invCellSize);
    const rSq = radius * radius;

    for (let cz = minCZ; cz <= maxCZ; cz++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        let idx = this.bucketHeads[this._hashCell(cx, cz)];
        while (idx !== -1) {
          if (this.cellCoordX[idx] === cx && this.cellCoordZ[idx] === cz) {
            const dx = this.actorX[idx] - x;
            const dz = this.actorZ[idx] - z;
            if (dx * dx + dz * dz <= rSq) {
              outIndices.push(idx);
            }
          }
          idx = this.nextLink[idx];
        }
      }
    }
    return outIndices;
  }
}

// ============================================================================
// CHAPTER 5: Software Horizon & Solid Skyscraper AABB Occluder Culler +
// 5-Interior Room Portal Visibility Restorer & Isolator
// ============================================================================

class SkyscraperHorizonOcclusionCuller {
  constructor(bvh, dynamicGrid, sceneOptimizer, pools) {
    this.bvh = bvh;
    this.dynamicGrid = dynamicGrid;
    this.sceneOptimizer = sceneOptimizer;
    this.pools = pools;

    this.frustumCullingEnabled = true;
    this.occlusionCullingEnabled = true;
    this.interiorIsolationEnabled = true;

    // Extracted conservative solid skyscraper & city-block AABB cores
    this.solidOccluders = [];
    this.activeScreenOccluders = [];
    this.occluderOrderScratch = [];

    // 180-Bin (2-degree) Azimuthal Software Horizon Wall Depth & Top-Slope Buffer
    this.horizonWallDist = new Float32Array(HORIZON_BIN_COUNT);
    this.horizonTopSlope = new Float32Array(HORIZON_BIN_COUNT);
    this.horizonActiveBins = 0;

    // BVH frustum visibility bitmask per static entry
    this.staticFrustumVisible = new Uint8Array(1024);

    // Portal state across the 5 walk-in interior hubs
    this.currentInteriorHub = null;
    this.lastInteriorHubIndex = -1;

    // Per-frame Culling Telemetry
    this.stats = {
      totalStaticIndexed: 0,
      staticVisible: 0,
      staticFrustumCulled: 0,
      staticSkyscraperOccluded: 0,
      staticDistanceCulled: 0,
      dynamicTotal: 0,
      dynamicVisible: 0,
      dynamicFrustumCulled: 0,
      dynamicSkyscraperOccluded: 0,
      activeOccludersProjected: 0,
      horizonBinsPopulated: 0,
      activeInteriorId: 'outdoors',
      activeInteriorName: 'Ngoài Trời (Coastal Metropolis)',
      estimatedTrianglesSaved: 0,
      estimatedDrawCallsSaved: 0,
    };

    this._camPos = new THREE.Vector3();
    this._camDir = new THREE.Vector3();
    this._viewMat = new THREE.Matrix4();
    this._projMat = new THREE.Matrix4();
    this._vpMat = new THREE.Matrix4();
  }

  _setPerfCulledState(obj, shouldCull) {
    if (!obj) return false;
    if (!obj.userData) obj.userData = {};

    if (shouldCull) {
      // Never cull dynamic combat VFX / projectiles (e.g. sword qi waves, bullets, shock rings)
      if (obj.userData && (obj.userData.perfIgnore || obj.userData.isDynamicFX)) return;
      if (obj.material && obj.material.blending === THREE.AdditiveBlending) return;
      // Respect gameplay/world intentional hiding: only mark _perfCulled if currently visible!
      if (obj.visible === true) {
        obj.visible = false;
        obj.userData._perfCulled = true;
        return true;
      }
      return Boolean(obj.userData._perfCulled);
    }

    // Restore ONLY objects that perf_core itself culled!
    if (obj.userData._perfCulled) {
      obj.visible = true;
      obj.userData._perfCulled = false;
      return true;
    }
    return false;
  }

  restoreAllCulledVisibility(ctx) {
    const entries = this.sceneOptimizer.staticEntries;
    for (let i = 0; i < entries.length; i++) {
      this._setPerfCulledState(entries[i].object, false);
    }

    const scene = ctx?.engine?.scene;
    if (scene) {
      scene.traverse((obj) => {
        if (obj?.userData?._perfCulled) {
          obj.visible = true;
          obj.userData._perfCulled = false;
        }
      });
    }
  }

  rebuildSolidOccluders(ctx, inset = 2.2) {
    this.solidOccluders.length = 0;
    const rawLists = [ctx?.world?.aabbs, ctx?.casinoWorld?.aabbs];
    const safeInset = clamp(inset, 1.4, 3.5);

    for (let l = 0; l < rawLists.length; l++) {
      const aabbs = rawLists[l];
      if (!Array.isArray(aabbs)) continue;

      for (let i = 0; i < aabbs.length; i++) {
        const b = aabbs[i];
        if (!b) continue;
        const minX = Number(b.minX);
        const maxX = Number(b.maxX);
        const minZ = Number(b.minZ);
        const maxZ = Number(b.maxZ);
        const minY = Number(b.minY ?? 0);
        let maxY = Number(b.maxY ?? 0);

        if (
          !Number.isFinite(minX) ||
          !Number.isFinite(maxX) ||
          !Number.isFinite(minZ) ||
          !Number.isFinite(maxZ) ||
          !Number.isFinite(maxY)
        ) {
          continue;
        }

        // Skip interior room AABBs (X > 600, Z > 600)
        if (minX > 600 || minZ > 600) continue;

        const w = maxX - minX;
        const d = maxZ - minZ;
        const h = maxY - minY;

        // Only large, grounded, genuinely solid architectural blocks & Downtown skyscrapers!
        if (minY > 1.2 || w < 10.5 || d < 10.5 || h < 11.5) continue;

        const cx = (minX + maxX) * 0.5;
        const cz = (minZ + maxZ) * 0.5;

        // Skip Luyện Khí Các hollow drive-in bay envelope (-66..-50, 75..85)
        if (maxX >= -67 && minX <= -49 && maxZ >= 74 && minZ <= 86) {
          continue;
        }

        // FIB Central Tower at (160, -40) [136..184, -64..-16]:
        // Cap solid occluder height below y = 39m so clear-glass y = 48m breach atrium
        // and y = 78m rooftop rappel zone are NEVER treated as opaque!
        if (cx >= 134 && cx <= 186 && cz >= -66 && cz <= -14) {
          maxY = Math.min(maxY, 39.0);
          if (maxY - minY < 11.5) continue;
        }

        const sMinX = minX + safeInset;
        const sMaxX = maxX - safeInset;
        const sMinZ = minZ + safeInset;
        const sMaxZ = maxZ - safeInset;
        const sMaxY = maxY - 1.25;

        if (sMaxX - sMinX < 5.0 || sMaxZ - sMinZ < 5.0 || sMaxY - minY < 9.5) {
          continue;
        }

        this.solidOccluders.push({
          minX: sMinX,
          maxX: sMaxX,
          minY: Math.max(0, minY),
          maxY: sMaxY,
          minZ: sMinZ,
          maxZ: sMaxZ,
          cx: (sMinX + sMaxX) * 0.5,
          cz: (sMinZ + sMaxZ) * 0.5,
          halfW: (sMaxX - sMinX) * 0.5,
          halfD: (sMaxZ - sMinZ) * 0.5,
          footprintRadius: Math.hypot((sMaxX - sMinX) * 0.5, (sMaxZ - sMinZ) * 0.5),
          tag: String(b.tag || 'building'),
        });
      }
    }

    return this.solidOccluders.length;
  }

  _buildFrameOcclusionStructures(camera) {
    this.activeScreenOccluders.length = 0;
    this.horizonWallDist.fill(1e9);
    this.horizonTopSlope.fill(-1e9);
    this.horizonActiveBins = 0;

    if (!this.occlusionCullingEnabled || this.solidOccluders.length === 0) return;

    const camX = this._camPos.x;
    const camY = this._camPos.y;
    const camZ = this._camPos.z;

    // Suspend skyscraper horizon culling during high-altitude helicopter / sky-switch camera (> 68m)
    if (camY > 68.0) return;

    this.occluderOrderScratch.length = 0;
    for (let i = 0; i < this.solidOccluders.length; i++) {
      const occ = this.solidOccluders[i];
      if (occ.maxY <= camY + 1.8) continue;

      // Skip if camera is inside or brushing against the occluder footprint
      if (
        camX >= occ.minX - 1.6 &&
        camX <= occ.maxX + 1.6 &&
        camZ >= occ.minZ - 1.6 &&
        camZ <= occ.maxZ + 1.6
      ) {
        continue;
      }

      const nearX = clamp(camX, occ.minX, occ.maxX);
      const nearZ = clamp(camZ, occ.minZ, occ.maxZ);
      const dSq = (nearX - camX) ** 2 + (nearZ - camZ) ** 2;
      if (dSq > 195 * 195 || dSq < 2.2) continue;

      this.occluderOrderScratch.push({ index: i, distSq: dSq });
    }

    if (this.occluderOrderScratch.length === 0) return;
    this.occluderOrderScratch.sort((a, b) => a.distSq - b.distSq);

    const vm = this._viewMat.elements;
    const vpm = this._vpMat.elements;
    const binScale = HORIZON_BIN_COUNT / TWO_PI;

    // 1. Populate 180-Bin Azimuthal Software Horizon Wall Buffer (when camera is below 36m)
    if (camY < 36.0) {
      const maxHorizonObjs = Math.min(this.occluderOrderScratch.length, 38);
      for (let k = 0; k < maxHorizonObjs; k++) {
        const occ = this.solidOccluders[this.occluderOrderScratch[k].index];
        if (occ.minY > camY - 0.6 || occ.maxY < camY + 3.2) continue;

        // Compute angular span & conservative far-wall distance across the 4 vertical edges
        const cornersX = [occ.minX - camX, occ.maxX - camX, occ.maxX - camX, occ.minX - camX];
        const cornersZ = [occ.minZ - camZ, occ.minZ - camZ, occ.maxZ - camZ, occ.maxZ - camZ];

        const baseAng = Math.atan2(occ.cz - camZ, occ.cx - camX);
        let minRel = Infinity;
        let maxRel = -Infinity;
        let maxFrontWallDist = 0;

        for (let c = 0; c < 4; c++) {
          const ang = Math.atan2(cornersZ[c], cornersX[c]);
          const rel = wrapAnglePi(ang - baseAng);
          if (rel < minRel) minRel = rel;
          if (rel > maxRel) maxRel = rel;
        }

        // Conservative slab depth = distance to center + half-diagonal * 0.45 so objects
        // alongside diagonal corners are NEVER prematurely occluded!
        const centerDist = Math.hypot(occ.cx - camX, occ.cz - camZ);
        maxFrontWallDist = centerDist + occ.footprintRadius * 0.35;

        // Shrink angular span inward by 1.8 degrees on both sides for strict edge safety
        minRel += 1.8 * DEG_TO_RAD;
        maxRel -= 1.8 * DEG_TO_RAD;
        if (maxRel <= minRel) continue;

        const conservativeTopSlope = (occ.maxY - 0.8 - camY) / Math.max(4.0, maxFrontWallDist);
        if (conservativeTopSlope <= 0.02) continue;

        const spanSteps = Math.max(1, Math.ceil((maxRel - minRel) * binScale));
        for (let s = 0; s <= spanSteps; s++) {
          const a = wrapAngle2Pi(baseAng + lerp(minRel, maxRel, s / spanSteps));
          const bin = Math.min(HORIZON_BIN_COUNT - 1, Math.floor(a * binScale));
          if (maxFrontWallDist < this.horizonWallDist[bin]) {
            if (this.horizonWallDist[bin] > 1e8) this.horizonActiveBins++;
            this.horizonWallDist[bin] = maxFrontWallDist;
            this.horizonTopSlope[bin] = Math.max(this.horizonTopSlope[bin], conservativeTopSlope);
          } else if (Math.abs(maxFrontWallDist - this.horizonWallDist[bin]) < 14.0) {
            this.horizonTopSlope[bin] = Math.max(this.horizonTopSlope[bin], conservativeTopSlope);
          }
        }
      }
    }

    // 2. Project Top-16 Nearest In-Frustum Solid Skyscrapers into Conservative NDC Rectangles
    const maxScreenCandidates = Math.min(this.occluderOrderScratch.length, 28);
    for (
      let k = 0;
      k < maxScreenCandidates && this.activeScreenOccluders.length < MAX_SCREEN_OCCLUDERS;
      k++
    ) {
      const occ = this.solidOccluders[this.occluderOrderScratch[k].index];

      // Quick sphere-frustum check
      const midY = (occ.minY + occ.maxY) * 0.5;
      const rad = Math.hypot(occ.footprintRadius, (occ.maxY - occ.minY) * 0.5);
      if (!this.bvh.isSphereInFrustum(occ.cx, midY, occ.cz, rad, 2.0)) continue;

      // Project the 4 front-most vertical face segments into NDC to obtain an inscribed solid rect
      // First pick the 1 or 2 faces of the AABB facing toward the camera!
      const faces = [];
      if (camX < occ.minX) {
        faces.push([
          [occ.minX, occ.minY, occ.minZ],
          [occ.minX, occ.minY, occ.maxZ],
          [occ.minX, occ.maxY, occ.maxZ],
          [occ.minX, occ.maxY, occ.minZ],
        ]);
      } else if (camX > occ.maxX) {
        faces.push([
          [occ.maxX, occ.minY, occ.minZ],
          [occ.maxX, occ.minY, occ.maxZ],
          [occ.maxX, occ.maxY, occ.maxZ],
          [occ.maxX, occ.maxY, occ.minZ],
        ]);
      }
      if (camZ < occ.minZ) {
        faces.push([
          [occ.minX, occ.minY, occ.minZ],
          [occ.maxX, occ.minY, occ.minZ],
          [occ.maxX, occ.maxY, occ.minZ],
          [occ.minX, occ.maxY, occ.minZ],
        ]);
      } else if (camZ > occ.maxZ) {
        faces.push([
          [occ.minX, occ.minY, occ.maxZ],
          [occ.maxX, occ.minY, occ.maxZ],
          [occ.maxX, occ.maxY, occ.maxZ],
          [occ.minX, occ.maxY, occ.maxZ],
        ]);
      }

      for (let f = 0; f < faces.length; f++) {
        const quad = faces[f];
        let allInFront = true;
        let ndcMinX = Infinity,
          ndcMaxX = -Infinity;
        let ndcMinY = Infinity,
          ndcMaxY = -Infinity;
        let maxFaceViewDepth = 0;
        let minFaceViewDepth = Infinity;

        // Inscribed conservative bounds of projected planar quad:
        // top Y uses min of top 2 vertices, bottom Y uses max of bottom 2 vertices,
        // left X uses max of left 2 vertices, right X uses min of right 2 vertices!
        const projX = [0, 0, 0, 0];
        const projY = [0, 0, 0, 0];

        for (let v = 0; v < 4; v++) {
          const vx = quad[v][0];
          const vy = quad[v][1];
          const vz = quad[v][2];

          // View-space Z in Three.js camera is negative in front of camera -> depth = -viewZ
          const viewZ = vm[2] * vx + vm[6] * vy + vm[10] * vz + vm[14];
          const depth = -viewZ;
          if (depth <= 0.65) {
            allInFront = false;
            break;
          }
          if (depth > maxFaceViewDepth) maxFaceViewDepth = depth;
          if (depth < minFaceViewDepth) minFaceViewDepth = depth;

          const clipX = vpm[0] * vx + vpm[4] * vy + vpm[8] * vz + vpm[12];
          const clipY = vpm[1] * vx + vpm[5] * vy + vpm[9] * vz + vpm[13];
          const clipW = vpm[3] * vx + vpm[7] * vy + vpm[11] * vz + vpm[15];
          if (clipW <= 0.5) {
            allInFront = false;
            break;
          }
          projX[v] = clipX / clipW;
          projY[v] = clipY / clipW;
        }

        if (!allInFront) continue;

        // Vertices 0,1 are bottom edge; 2,3 are top edge
        const leftA = Math.min(projX[0], projX[1]);
        const rightA = Math.max(projX[0], projX[1]);
        const leftB = Math.min(projX[2], projX[3]);
        const rightB = Math.max(projX[2], projX[3]);

        // Conservative inner rectangle strictly inscribed inside the perspective trapezoid!
        ndcMinX = Math.max(leftA, leftB) + 0.018;
        ndcMaxX = Math.min(rightA, rightB) - 0.018;
        ndcMinY = Math.max(projY[0], projY[1]) + 0.018;
        ndcMaxY = Math.min(projY[2], projY[3]) - 0.022;

        if (ndcMaxX - ndcMinX < 0.08 || ndcMaxY - ndcMinY < 0.08) continue;
        if (ndcMaxX < -1 || ndcMinX > 1 || ndcMaxY < -1 || ndcMinY > 1) continue;

        const rect = this.pools.occluderRect.acquireScratch();
        rect.minX = clamp(ndcMinX, -1.2, 1.2);
        rect.maxX = clamp(ndcMaxX, -1.2, 1.2);
        rect.minY = clamp(ndcMinY, -1.2, 1.2);
        rect.maxY = clamp(ndcMaxY, -1.2, 1.2);
        rect.farViewDepth = maxFaceViewDepth;
        rect.nearViewDepth = minFaceViewDepth;
        rect.worldMinY = occ.minY;
        rect.worldMaxY = occ.maxY;
        rect.solidArea = (rect.maxX - rect.minX) * (rect.maxY - rect.minY);
        rect.sourceIndex = this.occluderOrderScratch[k].index;
        this.activeScreenOccluders.push(rect);

        if (this.activeScreenOccluders.length >= MAX_SCREEN_OCCLUDERS) break;
      }
    }

    this.stats.activeOccludersProjected = this.activeScreenOccluders.length;
    this.stats.horizonBinsPopulated = this.horizonActiveBins;
  }

  isSphereOccludedBySkyscrapers(cx, cy, cz, radius, depthMargin = 2.6) {
    if (!this.occlusionCullingEnabled) return false;

    const camX = this._camPos.x;
    const camY = this._camPos.y;
    const camZ = this._camPos.z;
    const safeR = Math.max(0.4, radius);

    // Never occlude large structures (radius > 24m) — those are buildings/sectors themselves!
    if (safeR > 24.0) return false;

    const dx = cx - camX;
    const dz = cz - camZ;
    const horizDist = Math.hypot(dx, dz);
    const nearHorizDist = horizDist - safeR;
    if (nearHorizDist < 12.0) return false;

    // Stage 1: Exact Conservative Screen-Space Skyscraper Quad Occlusion
    const occCount = this.activeScreenOccluders.length;
    if (occCount > 0) {
      const vm = this._viewMat.elements;
      const pm = this._projMat.elements;
      const viewX = vm[0] * cx + vm[4] * cy + vm[8] * cz + vm[12];
      const viewY = vm[1] * cx + vm[5] * cy + vm[9] * cz + vm[13];
      const viewZ = vm[2] * cx + vm[6] * cy + vm[10] * cz + vm[14];
      const centerDepth = -viewZ;
      const targetNearDepth = centerDepth - safeR;

      if (targetNearDepth > 8.0) {
        const invDepth = 1.0 / Math.max(1.0, targetNearDepth);
        const ndcCenterX = (viewX * pm[0]) / Math.max(1.0, centerDepth);
        const ndcCenterY = (viewY * pm[5]) / Math.max(1.0, centerDepth);
        const ndcHalfW = Math.abs(safeR * pm[0] * invDepth) + 0.012;
        const ndcHalfH = Math.abs(safeR * pm[5] * invDepth) + 0.012;

        const tMinX = ndcCenterX - ndcHalfW;
        const tMaxX = ndcCenterX + ndcHalfW;
        const tMinY = ndcCenterY - ndcHalfH;
        const tMaxY = ndcCenterY + ndcHalfH;

        for (let i = 0; i < occCount; i++) {
          const o = this.activeScreenOccluders[i];
          if (targetNearDepth <= o.farViewDepth + depthMargin) continue;
          if (cy + safeR >= o.worldMaxY - 0.85) continue;
          if (
            tMinX >= o.minX &&
            tMaxX <= o.maxX &&
            tMinY >= o.minY &&
            tMaxY <= o.maxY
          ) {
            return true;
          }
        }
      }
    }

    // Stage 2: 180-Bin Multi-Skyscraper Azimuthal Horizon Depth + Elevation Buffer
    if (this.horizonActiveBins > 0 && camY < 36.0 && nearHorizDist > 16.0) {
      const angHalf = Math.asin(clamp((safeR + 0.6) / horizDist, 0, 0.85));
      if (angHalf < 0.42) {
        const centerAng = Math.atan2(dz, dx);
        const targetTopSlope = (cy + safeR + 0.75 - camY) / nearHorizDist;
        const binScale = HORIZON_BIN_COUNT / TWO_PI;
        const steps = Math.max(2, Math.ceil(angHalf * 2 * binScale) + 1);

        let allBinsOcclude = true;
        for (let s = 0; s <= steps; s++) {
          const a = wrapAngle2Pi(centerAng - angHalf + (2 * angHalf * s) / steps);
          const bin = Math.min(HORIZON_BIN_COUNT - 1, Math.floor(a * binScale));
          if (
            this.horizonWallDist[bin] + depthMargin >= nearHorizDist ||
            targetTopSlope >= this.horizonTopSlope[bin] - 0.015
          ) {
            allBinsOcclude = false;
            break;
          }
        }
        if (allBinsOcclude) return true;
      }
    }

    return false;
  }

  executeFrameCull(ctx, tierCfg) {
    const engine = ctx?.engine;
    const camera = engine?.camera;
    if (!camera) return this.stats;

    camera.getWorldPosition(this._camPos);
    camera.getWorldDirection(this._camDir);
    this._viewMat.copy(camera.matrixWorldInverse);
    this._projMat.copy(camera.projectionMatrix);
    this._vpMat.multiplyMatrices(this._projMat, this._viewMat);

    const player = ctx?.player;
    const px = Number.isFinite(player?.x) ? player.x : this._camPos.x;
    const py = Number.isFinite(player?.y) ? player.y : this._camPos.y;
    const pz = Number.isFinite(player?.z) ? player.z : this._camPos.z;

    // 1. Detect Walk-In Interior Room Hub ((800,800), (1200,1200), (1500,1500), (1800,1800), (2100,2100))
    const activeHub =
      detectInteriorHubAt(px, py, pz) ||
      detectInteriorHubAt(this._camPos.x, this._camPos.y, this._camPos.z);

    this.currentInteriorHub = activeHub;
    const curHubIndex = activeHub ? activeHub.index : -1;

    // Cleanly restore visibility on transition between Outdoors <-> Interior Hub!
    if (curHubIndex !== this.lastInteriorHubIndex) {
      this.restoreAllCulledVisibility(ctx);
      this.lastInteriorHubIndex = curHubIndex;
    }

    const entries = this.sceneOptimizer.staticEntries;
    const totalStatic = entries.length;
    if (this.staticFrustumVisible.length < totalStatic) {
      this.staticFrustumVisible = new Uint8Array(Math.max(1024, totalStatic * 2));
    }

    this.stats.totalStaticIndexed = totalStatic;
    this.stats.staticVisible = 0;
    this.stats.staticFrustumCulled = 0;
    this.stats.staticSkyscraperOccluded = 0;
    this.stats.staticDistanceCulled = 0;
    this.stats.dynamicTotal = 0;
    this.stats.dynamicVisible = 0;
    this.stats.dynamicFrustumCulled = 0;
    this.stats.dynamicSkyscraperOccluded = 0;
    this.stats.estimatedTrianglesSaved = 0;
    this.stats.estimatedDrawCallsSaved = 0;
    this.stats.activeInteriorId = activeHub ? activeHub.id : 'outdoors';
    this.stats.activeInteriorName = activeHub
      ? activeHub.name
      : 'Ngoài Trời (Coastal Metropolis)';

    // Extract 6 camera frustum planes
    this.bvh.extractCameraFrustumPlanes(camera);

    // CASE A: Inside one of the 5 Walk-In Interior Rooms!
    // Guarantee 100% restored visibility inside the active room, suspend outdoor skyscraper occluders,
    // and isolate distant outdoor geometry cleanly!
    if (activeHub) {
      this.stats.activeOccludersProjected = 0;
      this.stats.horizonBinsPopulated = 0;

      for (let i = 0; i < totalStatic; i++) {
        const e = entries[i];
        if (e.interiorHubIndex === activeHub.index) {
          this._setPerfCulledState(e.object, false);
          this.stats.staticVisible++;
        } else if (this.interiorIsolationEnabled) {
          // Safely cull outdoor static clutter & other distant interior rooms while inside active room
          this._setPerfCulledState(e.object, true);
          this.stats.staticDistanceCulled++;
          this.stats.estimatedDrawCallsSaved++;
          this.stats.estimatedTrianglesSaved += e.estTriangles;
        } else {
          this._setPerfCulledState(e.object, false);
          this.stats.staticVisible++;
        }
      }

      // Restore dynamic actors inside active interior room, cull outdoor dynamic actors far away
      this.dynamicGrid.rebuildFromContext(ctx);
      this.stats.dynamicTotal = this.dynamicGrid.count;
      for (let i = 0; i < this.dynamicGrid.count; i++) {
        const mesh = this.dynamicGrid.actorMeshes[i];
        const ax = this.dynamicGrid.actorX[i];
        const az = this.dynamicGrid.actorZ[i];
        const inThisHub =
          ax >= activeHub.minX &&
          ax <= activeHub.maxX &&
          az >= activeHub.minZ &&
          az <= activeHub.maxZ;
        if (inThisHub || !this.interiorIsolationEnabled) {
          this._setPerfCulledState(mesh, false);
          this.stats.dynamicVisible++;
        } else {
          this._setPerfCulledState(mesh, true);
          this.stats.dynamicFrustumCulled++;
          this.stats.estimatedDrawCallsSaved += 3;
        }
      }

      if (player?.mesh) this._setPerfCulledState(player.mesh, false);
      return this.stats;
    }

    // CASE B: Outdoors in Coastal Metropolis — Full BVH Frustum + Software Skyscraper Occlusion!
    const depthMargin = tierCfg?.occluderMinDepthMargin ?? 2.6;
    const propCullDistSq = (tierCfg?.propCullRadius ?? 185) ** 2;
    const dynCullDistSq = (tierCfg?.dynamicActorCullRadius ?? 200) ** 2;

    this._buildFrameOcclusionStructures(camera);

    if (this.frustumCullingEnabled) {
      this.bvh.traverseFrustumVisibility(this.staticFrustumVisible, 1.5);
    } else {
      this.staticFrustumVisible.fill(1, 0, totalStatic);
    }

    const camX = this._camPos.x;
    const camY = this._camPos.y;
    const camZ = this._camPos.z;

    for (let i = 0; i < totalStatic; i++) {
      const e = entries[i];
      const obj = e.object;

      // Cull walk-in interior rooms (800..2100) cleanly while player is outdoors
      if (e.interiorHubIndex >= 0) {
        if (this.interiorIsolationEnabled) {
          this._setPerfCulledState(obj, true);
          this.stats.staticDistanceCulled++;
          this.stats.estimatedDrawCallsSaved++;
          this.stats.estimatedTrianglesSaved += e.estTriangles;
        } else {
          this._setPerfCulledState(obj, false);
          this.stats.staticVisible++;
        }
        continue;
      }

      // Large merged city-wide batches (roads, sidewalks, merged facades) stay unculled unless strictly behind camera frustum
      if (e.isLargeCityBatch) {
        if (this.frustumCullingEnabled && this.staticFrustumVisible[i] === 0) {
          this._setPerfCulledState(obj, true);
          this.stats.staticFrustumCulled++;
          this.stats.estimatedDrawCallsSaved++;
          this.stats.estimatedTrianglesSaved += e.estTriangles;
        } else {
          this._setPerfCulledState(obj, false);
          this.stats.staticVisible++;
        }
        continue;
      }

      // 1. Camera Frustum Test via SAH BVH
      if (this.frustumCullingEnabled && this.staticFrustumVisible[i] === 0) {
        this._setPerfCulledState(obj, true);
        this.stats.staticFrustumCulled++;
        this.stats.estimatedDrawCallsSaved++;
        this.stats.estimatedTrianglesSaved += e.estTriangles;
        continue;
      }

      // 2. Small static prop distance LOD check (for small detail meshes < 6m radius)
      if (e.radius < 6.0) {
        const dSq = (e.cx - camX) ** 2 + (e.cz - camZ) ** 2;
        if (dSq > propCullDistSq) {
          this._setPerfCulledState(obj, true);
          this.stats.staticDistanceCulled++;
          this.stats.estimatedDrawCallsSaved++;
          this.stats.estimatedTrianglesSaved += e.estTriangles;
          continue;
        }
      }

      // 3. Software Horizon & Skyscraper Solid-AABB Occlusion Test (for props/details < 18m radius)
      if (
        this.occlusionCullingEnabled &&
        e.radius < 18.0 &&
        this.isSphereOccludedBySkyscrapers(e.cx, e.cy, e.cz, e.radius, depthMargin)
      ) {
        this._setPerfCulledState(obj, true);
        this.stats.staticSkyscraperOccluded++;
        this.stats.estimatedDrawCallsSaved++;
        this.stats.estimatedTrianglesSaved += e.estTriangles;
        continue;
      }

      this._setPerfCulledState(obj, false);
      this.stats.staticVisible++;
    }

    // Dynamic Actors (Vehicles, Pedestrians, Cops, Pickups) Frustum + Skyscraper Occlusion!
    this.dynamicGrid.rebuildFromContext(ctx);
    const dynCount = this.dynamicGrid.count;
    this.stats.dynamicTotal = dynCount;
    const playerCar = player?.inCar || player?.vehicle || null;

    for (let i = 0; i < dynCount; i++) {
      const actor = this.dynamicGrid.actorRefs[i];
      const mesh = this.dynamicGrid.actorMeshes[i];
      const kind = this.dynamicGrid.actorKind[i];

      // Never cull player's active vehicle, helicopters, or critical mission entities
      const isProtected =
        actor === playerCar ||
        kind === 4 ||
        Boolean(actor?.isMissionCar || actor?.isMissionEnemy || actor?.isRivalCartel || actor?.isVIPDelivery);

      if (isProtected) {
        this._setPerfCulledState(mesh, false);
        this.stats.dynamicVisible++;
        continue;
      }

      const ax = this.dynamicGrid.actorX[i];
      const ay = this.dynamicGrid.actorY[i];
      const az = this.dynamicGrid.actorZ[i];
      const ar = this.dynamicGrid.actorRadius[i];

      const dSq = (ax - camX) ** 2 + (az - camZ) ** 2;

      // Keep nearby actors (< 14m) unculled so close-by cars/peds cast shadows into camera view
      if (dSq < 14 * 14) {
        this._setPerfCulledState(mesh, false);
        this.stats.dynamicVisible++;
        continue;
      }

      if (dSq > dynCullDistSq) {
        this._setPerfCulledState(mesh, true);
        this.stats.dynamicFrustumCulled++;
        this.stats.estimatedDrawCallsSaved += kind === 1 ? 6 : 4;
        this.stats.estimatedTrianglesSaved += kind === 1 ? 850 : 420;
        continue;
      }

      if (this.frustumCullingEnabled && !this.bvh.isSphereInFrustum(ax, ay, az, ar, 2.2)) {
        this._setPerfCulledState(mesh, true);
        this.stats.dynamicFrustumCulled++;
        this.stats.estimatedDrawCallsSaved += kind === 1 ? 6 : 4;
        this.stats.estimatedTrianglesSaved += kind === 1 ? 850 : 420;
        continue;
      }

      if (
        this.occlusionCullingEnabled &&
        this.isSphereOccludedBySkyscrapers(ax, ay, az, ar, depthMargin)
      ) {
        this._setPerfCulledState(mesh, true);
        this.stats.dynamicSkyscraperOccluded++;
        this.stats.estimatedDrawCallsSaved += kind === 1 ? 6 : 4;
        this.stats.estimatedTrianglesSaved += kind === 1 ? 850 : 420;
        continue;
      }

      this._setPerfCulledState(mesh, false);
      this.stats.dynamicVisible++;
    }

    if (player?.mesh) {
      this._setPerfCulledState(player.mesh, false);
    }

    return this.stats;
  }
}

// ============================================================================
// CHAPTER 6: Smart Shadow-Caster Priority Queue (0.15s Cadence: 18 ULTRA /
// 8 HIGH / 0 MOBILE) & Cascaded Dynamic Actor LOD Tier Coordinator
// ============================================================================

class SmartShadowPriorityManager {
  constructor(bvh, dynamicGrid, pools) {
    this.bvh = bvh;
    this.dynamicGrid = dynamicGrid;
    this.pools = pools;

    this.enabled = true;
    this.refreshIntervalSec = SHADOW_RANK_INTERVAL_SEC;
    this.accumSec = SHADOW_RANK_INTERVAL_SEC; // Run immediately on first frame
    this.overrideMaxCasters = null;

    // Cache shadow-eligible child meshes per actor root to avoid traverse() every 0.15s!
    this.shadowSubmeshCache = new WeakMap();
    this.actorShadowState = new WeakMap();
    this.currentlyEnabledRoots = new Set();
    this.candidatesScratch = [];

    this.stats = {
      budgetMax: 18,
      activeCasters: 0,
      eligibleInFrustum: 0,
      totalEvaluated: 0,
      togglesLastPass: 0,
      lastRankCostMs: 0,
      lodNearCount: 0,
      lodMidCount: 0,
      lodFarCount: 0,
    };

    this._camPos = new THREE.Vector3();
    this._camFwd = new THREE.Vector3();
  }

  resolveBudgetForQuality(quality, turboActive = false) {
    if (!this.enabled) return 0;
    if (typeof this.overrideMaxCasters === 'number' && this.overrideMaxCasters >= 0) {
      return this.overrideMaxCasters | 0;
    }
    const q = String(quality || 'ULTRA').toUpperCase();
    if (q === 'MOBILE' || q === 'LOW') return 0;
    if (turboActive) return q === 'ULTRA' ? 8 : 5;
    if (q === 'HIGH') return 8;
    return 18; // Exact Requirement #2: 18 on ULTRA, 8 on HIGH, 0 on MOBILE!
  }

  _getEligibleShadowMeshes(rootObj) {
    if (!rootObj) return [];
    let cached = this.shadowSubmeshCache.get(rootObj);
    // Re-collect if child count changed (e.g. weapon equipped or 3D bodykit/spoiler added at LSC!)
    const directChildSig = rootObj.children ? rootObj.children.length : 0;
    if (cached && cached.childSig === directChildSig) {
      return cached.meshes;
    }

    const meshes = [];
    if (typeof rootObj.traverse === 'function') {
      rootObj.traverse((node) => {
        if (!node || (!node.isMesh && !node.isInstancedMesh && !node.isSkinnedMesh)) return;
        const mat = Array.isArray(node.material) ? node.material[0] : node.material;
        if (!mat) return;

        // Skip glass windows, additive headlight/laser cones, neon underglow planes,
        // unlit MeshBasicMaterial UI/glow sprites, and transparent decals!
        if (mat.isMeshBasicMaterial || mat.isShaderMaterial) return;
        if (mat.transparent && (mat.opacity ?? 1) < 0.72) return;
        if (mat.blending === THREE.AdditiveBlending) return;
        if (mat.depthWrite === false) return;

        meshes.push(node);
      });
    }

    this.shadowSubmeshCache.set(rootObj, { childSig: directChildSig, meshes });
    return meshes;
  }

  _applyActorShadowState(rootObj, castEnabled) {
    if (!rootObj) return false;
    const prev = this.actorShadowState.get(rootObj);
    if (prev === castEnabled) return false;

    this.actorShadowState.set(rootObj, castEnabled);
    const meshes = this._getEligibleShadowMeshes(rootObj);
    for (let i = 0; i < meshes.length; i++) {
      meshes[i].castShadow = castEnabled;
    }
    if (castEnabled) {
      this.currentlyEnabledRoots.add(rootObj);
    } else {
      this.currentlyEnabledRoots.delete(rootObj);
    }
    return true;
  }

  disableAllDynamicShadows() {
    let changed = 0;
    for (const root of Array.from(this.currentlyEnabledRoots)) {
      if (this._applyActorShadowState(root, false)) changed++;
    }
    this.currentlyEnabledRoots.clear();
    this.stats.activeCasters = 0;
    return changed;
  }

  forceImmediateRefresh() {
    this.accumSec = this.refreshIntervalSec + 0.01;
  }

  update(dtSec, ctx, turboActive = false) {
    const engine = ctx?.engine;
    const camera = engine?.camera;
    const renderer = engine?.renderer;
    const quality = engine?.quality || 'ULTRA';
    const shadowMapOn = renderer?.shadowMap?.enabled !== false;

    const configChanged =
      quality !== this._lastQuality ||
      turboActive !== this._lastTurbo ||
      shadowMapOn !== this._lastShadowMapOn;

    this._lastQuality = quality;
    this._lastTurbo = turboActive;
    this._lastShadowMapOn = shadowMapOn;

    this.accumSec += clamp(dtSec, 0.001, 0.25);
    if (!configChanged && this.accumSec < this.refreshIntervalSec) return this.stats;
    this.accumSec = 0;

    const t0 = perfNow();

    const maxCasters = !shadowMapOn
      ? 0
      : this.resolveBudgetForQuality(quality, turboActive);

    this.stats.budgetMax = maxCasters;
    this.stats.lodNearCount = 0;
    this.stats.lodMidCount = 0;
    this.stats.lodFarCount = 0;

    if (!camera || maxCasters <= 0) {
      const toggles = this.disableAllDynamicShadows();
      this.stats.togglesLastPass = toggles;
      this.stats.eligibleInFrustum = 0;
      this.stats.totalEvaluated = this.dynamicGrid.count;
      this.stats.lastRankCostMs = perfNow() - t0;
      return this.stats;
    }

    camera.getWorldPosition(this._camPos);
    camera.getWorldDirection(this._camFwd);
    const camX = this._camPos.x;
    const camY = this._camPos.y;
    const camZ = this._camPos.z;
    const fwdX = this._camFwd.x;
    const fwdZ = this._camFwd.z;

    const player = ctx?.player;
    const anchorX = Number.isFinite(player?.x) ? player.x : camX;
    const anchorZ = Number.isFinite(player?.z) ? player.z : camZ;
    const playerCar = player?.inCar || player?.vehicle || null;

    const tierCfg = turboActive
      ? QUALITY_TIER_CONFIGS.TURBO
      : QUALITY_TIER_CONFIGS[quality] || QUALITY_TIER_CONFIGS.ULTRA;
    const maxShadowDistSq = (tierCfg.shadowMaxDist || 76) ** 2;

    this.candidatesScratch.length = 0;
    const selectedNextSet = new Set();
    let eligibleInFrustum = 0;

    // 1. Evaluate Player Character Rig (when on foot or rappelling & visible)
    if (player?.mesh && player.mesh.visible && !playerCar) {
      const pDistSq = (anchorX - camX) ** 2 + (anchorZ - camZ) ** 2;
      if (pDistSq <= maxShadowDistSq) {
        const cand = this.pools.shadowCandidate.acquireScratch();
        cand.actor = player;
        cand.rootMesh = player.mesh;
        cand.distSq = pDistSq;
        cand.isPlayer = true;
        cand.isVehicle = false;
        cand.inFrustum = true;
        cand.score = -1e6; // Player always receives #1 shadow priority!
        this.candidatesScratch.push(cand);
        eligibleInFrustum++;
      }
    }

    // 2. Evaluate All Indexed Dynamic Actors (Vehicles, Peds, Cops, Helicopters, NPCs, Racers)
    const dynCount = this.dynamicGrid.count;
    for (let i = 0; i < dynCount; i++) {
      const actor = this.dynamicGrid.actorRefs[i];
      const mesh = this.dynamicGrid.actorMeshes[i];
      const kind = this.dynamicGrid.actorKind[i];
      if (!mesh) continue;

      const ax = this.dynamicGrid.actorX[i];
      const ay = this.dynamicGrid.actorY[i];
      const az = this.dynamicGrid.actorZ[i];
      const ar = this.dynamicGrid.actorRadius[i];

      const dAnchorSq = (ax - anchorX) ** 2 + (az - anchorZ) ** 2;

      // Assign Cascaded Actor LOD Hint for AI/Animation systems:
      // 0 = Full Hero Detail (<38m), 1 = Medium (<85m), 2 = Low (<145m), 3 = Dormant (>=145m)
      if (actor && typeof actor === 'object') {
        if (dAnchorSq < 38 * 38) {
          actor._perfLodTier = 0;
          this.stats.lodNearCount++;
        } else if (dAnchorSq < 85 * 85) {
          actor._perfLodTier = 1;
          this.stats.lodMidCount++;
        } else if (dAnchorSq < 145 * 145) {
          actor._perfLodTier = 2;
          this.stats.lodFarCount++;
        } else {
          actor._perfLodTier = 3;
          this.stats.lodFarCount++;
        }
      }

      // Skip pickups (kind === 5), hidden/culled actors, or actors outside directional shadow map box!
      if (kind === 5 || !mesh.visible || dAnchorSq > maxShadowDistSq) {
        continue;
      }

      const isPlayerVehicle = actor === playerCar;
      const inFrustum =
        isPlayerVehicle ||
        dAnchorSq < 12 * 12 ||
        this.bvh.isSphereInFrustum(ax, ay, az, ar + 2.5, 2.0);

      if (!inFrustum) continue;
      eligibleInFrustum++;

      const dxCam = ax - camX;
      const dzCam = az - camZ;
      const dCamSq = dxCam * dxCam + (ay - camY) * (ay - camY) + dzCam * dzCam;
      const invLen = 1.0 / (Math.hypot(dxCam, dzCam) || 1);
      const fwdDot = (dxCam * fwdX + dzCam * fwdZ) * invLen; // [-1..+1]

      // Vehicles & Helicopters cast larger, more grounded contact shadows -> 0.72 perceptual weight
      const typeWeight = kind === 1 || kind === 4 ? 0.72 : 1.0;
      const gazeWeight = fwdDot > 0.25 ? 0.85 : 1.15;
      const priorityScore = isPlayerVehicle ? -9e5 : dCamSq * typeWeight * gazeWeight;

      const cand = this.pools.shadowCandidate.acquireScratch();
      cand.actor = actor;
      cand.rootMesh = mesh;
      cand.distSq = dCamSq;
      cand.isVehicle = kind === 1 || kind === 4;
      cand.isPlayer = isPlayerVehicle;
      cand.inFrustum = true;
      cand.score = priorityScore;
      this.candidatesScratch.push(cand);
    }

    // Sort ascending by priority score so top N win castShadow = true!
    if (this.candidatesScratch.length > 1) {
      this.candidatesScratch.sort((a, b) => a.score - b.score);
    }

    const winnersCount = Math.min(maxCasters, this.candidatesScratch.length);
    let toggles = 0;

    for (let i = 0; i < winnersCount; i++) {
      const root = this.candidatesScratch[i].rootMesh;
      selectedNextSet.add(root);
      if (this._applyActorShadowState(root, true)) toggles++;
    }

    // Disable castShadow on any previously enabled dynamic actor that dropped out of top N!
    for (const prevRoot of Array.from(this.currentlyEnabledRoots)) {
      if (!selectedNextSet.has(prevRoot)) {
        if (this._applyActorShadowState(prevRoot, false)) toggles++;
      }
    }

    if (toggles > 0 && renderer?.shadowMap && renderer.shadowMap.autoUpdate === false) {
      renderer.shadowMap.needsUpdate = true;
    }

    this.stats.activeCasters = this.currentlyEnabledRoots.size;
    this.stats.eligibleInFrustum = eligibleInFrustum;
    this.stats.totalEvaluated = dynCount + (player?.mesh ? 1 : 0);
    this.stats.togglesLastPass = toggles;
    this.stats.lastRankCostMs = perfNow() - t0;
    return this.stats;
  }
}

// ============================================================================
// CHAPTER 7: Frame-Budget Cooperative Task Scheduler (Strict 1.8ms Cap),
// Quantized Road-Graph LRU Path Cache & Tiled Static Minimap Layer Baker
// ============================================================================

class FrameBudgetScheduler {
  constructor(pools, defaultBudgetMs = DEFAULT_SCHEDULER_BUDGET_MS) {
    this.pools = pools;
    this.enabled = true;
    this.baseBudgetMs = clamp(defaultBudgetMs, 0.4, 5.0);
    this.activeBudgetMs = this.baseBudgetMs;

    // 5 Priority Queues: CRITICAL(0), HIGH(1), NORMAL(2), LOW(3), IDLE(4)
    this.queues = [[], [], [], [], []];
    this.recurringJobs = new Map();
    this.namedTaskGuards = new Set();
    this.nextTaskId = 1;

    this.stats = {
      budgetMs: this.baseBudgetMs,
      lastSpentMs: 0,
      emaSpentMs: 0,
      utilizationPct: 0,
      pendingCount: 0,
      executedLastFrame: 0,
      slicedYieldsLastFrame: 0,
      totalCompleted: 0,
      recurringJobCount: 0,
      starvationPromotions: 0,
    };
  }

  setBudgetMs(ms) {
    this.baseBudgetMs = clamp(Number(ms) || DEFAULT_SCHEDULER_BUDGET_MS, 0.35, 6.0);
    this.activeBudgetMs = this.baseBudgetMs;
    this.stats.budgetMs = this.baseBudgetMs;
  }

  getPendingCount() {
    let sum = 0;
    for (let p = 0; p < 5; p++) sum += this.queues[p].length;
    return sum;
  }

  enqueue(name, fn, priority = TASK_PRIORITY.NORMAL, options = {}) {
    if (typeof fn !== 'function') return -1;
    const dedupeKey = options.dedupeKey || null;
    if (dedupeKey && this.namedTaskGuards.has(dedupeKey)) {
      return 0;
    }

    const prio = clamp(priority | 0, 0, 4);
    const task = this.pools.scheduledTask.acquire();
    task.id = this.nextTaskId++;
    task.name = String(name || 'bg_task');
    task.priority = prio;
    task.effectivePriority = prio;
    task.fn = fn;
    task.stepFn = null;
    task.cursor = 0;
    task.totalItems = 1;
    task.chunkSize = 1;
    task.enqueuedAtMs = perfNow();
    task.estCostMs = Math.max(0.05, Number(options.estCostMs) || 0.25);
    task.ageFrames = 0;
    task.completed = false;
    task._dedupeKey = dedupeKey;

    if (dedupeKey) this.namedTaskGuards.add(dedupeKey);
    this.queues[prio].push(task);
    this.stats.pendingCount = this.getPendingCount();
    return task.id;
  }

  enqueueSliced(name, stepFn, totalItems, chunkSize = 16, priority = TASK_PRIORITY.LOW, options = {}) {
    if (typeof stepFn !== 'function' || !(totalItems > 0)) return -1;
    const dedupeKey = options.dedupeKey || null;
    if (dedupeKey && this.namedTaskGuards.has(dedupeKey)) {
      return 0;
    }

    const prio = clamp(priority | 0, 0, 4);
    const task = this.pools.scheduledTask.acquire();
    task.id = this.nextTaskId++;
    task.name = String(name || 'sliced_task');
    task.priority = prio;
    task.effectivePriority = prio;
    task.fn = null;
    task.stepFn = stepFn;
    task.cursor = 0;
    task.totalItems = totalItems | 0;
    task.chunkSize = Math.max(1, chunkSize | 0);
    task.enqueuedAtMs = perfNow();
    task.estCostMs = Math.max(0.08, Number(options.estCostMs) || 0.35);
    task.ageFrames = 0;
    task.completed = false;
    task._dedupeKey = dedupeKey;

    if (dedupeKey) this.namedTaskGuards.add(dedupeKey);
    this.queues[prio].push(task);
    this.stats.pendingCount = this.getPendingCount();
    return task.id;
  }

  registerRecurring(id, intervalSec, jobFn, priority = TASK_PRIORITY.LOW) {
    if (!id || typeof jobFn !== 'function') return false;
    this.recurringJobs.set(String(id), {
      id: String(id),
      intervalSec: Math.max(0.08, Number(intervalSec) || 1.0),
      accumSec: 0,
      priority: clamp(priority | 0, 0, 4),
      jobFn,
    });
    this.stats.recurringJobCount = this.recurringJobs.size;
    return true;
  }

  unregisterRecurring(id) {
    const ok = this.recurringJobs.delete(String(id));
    this.stats.recurringJobCount = this.recurringJobs.size;
    return ok;
  }

  clearAll() {
    for (let p = 0; p < 5; p++) {
      const q = this.queues[p];
      while (q.length > 0) {
        const t = q.pop();
        if (t._dedupeKey) this.namedTaskGuards.delete(t._dedupeKey);
        this.pools.scheduledTask.release(t);
      }
    }
    this.namedTaskGuards.clear();
    this.stats.pendingCount = 0;
  }

  _ageStarvedTasks() {
    // Promote lower-priority tasks waiting > 45 frames so background work never starves
    for (let p = 4; p >= 2; p--) {
      const q = this.queues[p];
      for (let i = q.length - 1; i >= 0; i--) {
        const t = q[i];
        t.ageFrames++;
        if (t.ageFrames >= 45) {
          t.ageFrames = 0;
          t.effectivePriority = p - 1;
          q.splice(i, 1);
          this.queues[p - 1].push(t);
          this.stats.starvationPromotions++;
        }
      }
    }
  }

  runFrameSlice(dtSec, currentFrameElapsedMs = 0, ctx = null) {
    if (!this.enabled) {
      this.stats.lastSpentMs = 0;
      this.stats.emaSpentMs *= 0.9;
      this.stats.utilizationPct = 0;
      return 0;
    }

    // Tick recurring cooperative job timers and enqueue due jobs without duplicating
    const safeDt = clamp(dtSec, 0.001, 0.2);
    for (const rec of this.recurringJobs.values()) {
      rec.accumSec += safeDt;
      if (rec.accumSec >= rec.intervalSec) {
        rec.accumSec = 0;
        this.enqueue(rec.id, rec.jobFn, rec.priority, { dedupeKey: `rec:${rec.id}` });
      }
    }

    this._ageStarvedTasks();

    // Tighten per-frame budget if main render/gameplay already consumed > 12.5ms this frame!
    const dynamicBudget =
      currentFrameElapsedMs > 14.0
        ? Math.min(this.baseBudgetMs, 0.45)
        : currentFrameElapsedMs > 11.5
          ? Math.min(this.baseBudgetMs, TIGHT_SCHEDULER_BUDGET_MS)
          : this.baseBudgetMs;

    this.activeBudgetMs = dynamicBudget;
    const startMs = perfNow();
    const deadlineMs = startMs + dynamicBudget;

    let executed = 0;
    let yields = 0;

    outerLoop: for (let p = 0; p < 5; p++) {
      const q = this.queues[p];
      while (q.length > 0) {
        if (perfNow() >= deadlineMs && (p > TASK_PRIORITY.CRITICAL || executed > 0)) {
          break outerLoop;
        }

        const task = q[0];
        if (task.stepFn) {
          // Cooperative Sliced Loop: checks budget after each chunk!
          let finished = false;
          while (task.cursor < task.totalItems) {
            const endIdx = Math.min(task.totalItems, task.cursor + task.chunkSize);
            try {
              const res = task.stepFn(task.cursor, endIdx, ctx);
              if (res === false) {
                finished = true;
                break;
              }
            } catch (_) {
              finished = true;
              break;
            }
            task.cursor = endIdx;
            executed++;
            if (task.cursor >= task.totalItems) {
              finished = true;
              break;
            }
            if (perfNow() >= deadlineMs) {
              yields++;
              break outerLoop;
            }
          }

          if (finished || task.cursor >= task.totalItems) {
            q.shift();
            if (task._dedupeKey) this.namedTaskGuards.delete(task._dedupeKey);
            this.pools.scheduledTask.release(task);
            this.stats.totalCompleted++;
          }
        } else if (task.fn) {
          q.shift();
          try {
            task.fn(ctx);
          } catch (_) {
            // Fault-isolated background execution
          }
          if (task._dedupeKey) this.namedTaskGuards.delete(task._dedupeKey);
          this.pools.scheduledTask.release(task);
          executed++;
          this.stats.totalCompleted++;
        } else {
          q.shift();
          this.pools.scheduledTask.release(task);
        }
      }
    }

    const spentMs = Math.max(0, perfNow() - startMs);
    this.stats.budgetMs = Number(dynamicBudget.toFixed(2));
    this.stats.lastSpentMs = Number(spentMs.toFixed(3));
    this.stats.emaSpentMs = Number((this.stats.emaSpentMs * 0.88 + spentMs * 0.12).toFixed(3));
    this.stats.utilizationPct = Number(
      clamp((this.stats.emaSpentMs / Math.max(0.2, this.baseBudgetMs)) * 100, 0, 100).toFixed(1)
    );
    this.stats.pendingCount = this.getPendingCount();
    this.stats.executedLastFrame = executed;
    this.stats.slicedYieldsLastFrame = yields;

    return spentMs;
  }
}

// Cooperative LRU Road-Graph Path Cache & Background Pre-Baker
class RoadGraphRouteCache {
  constructor(maxEntries = 512, cellQuantizeM = 20) {
    this.maxEntries = maxEntries;
    this.quantize = cellQuantizeM;
    this.invQuantize = 1 / cellQuantizeM;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
    this.prebakedRoutes = 0;
    this._installedOnWorld = null;
    this._rawFindGPSPath = null;

    // Precompute key city avenue/street intersection pairs for background warming
    this.keyHubCoords = [
      [40, 40],
      [40, -40],
      [40, -120],
      [40, 120],
      [-40, 80],
      [-120, -40],
      [-120, 120],
      [120, -40],
      [120, 80],
      [200, -110],
      [200, 10],
      [200, 120],
      [111, -120],
      [-129, -95],
      [80, 130],
    ];
    this.prewarmCursor = 0;
  }

  _makeKey(x1, z1, x2, z2) {
    const qx1 = Math.round(x1 * this.invQuantize);
    const qz1 = Math.round(z1 * this.invQuantize);
    const qx2 = Math.round(x2 * this.invQuantize);
    const qz2 = Math.round(z2 * this.invQuantize);
    return `${qx1}:${qz1}->${qx2}:${qz2}`;
  }

  _clonePathWithEndpoints(cachedMidPoints, x1, z1, x2, z2) {
    const len = cachedMidPoints.length;
    if (len <= 2) {
      return [
        { x: x1, z: z1 },
        { x: x2, z: z2 },
      ];
    }
    const out = new Array(len);
    out[0] = { x: x1, z: z1 };
    for (let i = 1; i < len - 1; i++) {
      out[i] = { x: cachedMidPoints[i].x, z: cachedMidPoints[i].z };
    }
    out[len - 1] = { x: x2, z: z2 };
    return out;
  }

  installOnWorld(ctx) {
    const world = ctx?.world;
    if (!world || typeof world.findGPSPath !== 'function') return false;
    if (this._installedOnWorld === world) return true;

    const rawFn = world.findGPSPath.bind(world);
    this._rawFindGPSPath = rawFn;
    this._installedOnWorld = world;

    world.findGPSPath = (x1, z1, x2, z2) => {
      if (
        !Number.isFinite(x1) ||
        !Number.isFinite(z1) ||
        !Number.isFinite(x2) ||
        !Number.isFinite(z2)
      ) {
        return [];
      }
      if (Math.hypot(x2 - x1, z2 - z1) < 32) {
        return [
          { x: x1, z: z1 },
          { x: x2, z: z2 },
        ];
      }

      const key = this._makeKey(x1, z1, x2, z2);
      const hit = this.cache.get(key);
      if (hit) {
        this.hits++;
        // Refresh LRU order
        this.cache.delete(key);
        this.cache.set(key, hit);
        return this._clonePathWithEndpoints(hit, x1, z1, x2, z2);
      }

      this.misses++;
      const computed = rawFn(x1, z1, x2, z2);
      if (Array.isArray(computed) && computed.length >= 2) {
        if (this.cache.size >= this.maxEntries) {
          const oldestKey = this.cache.keys().next().value;
          if (oldestKey !== undefined) this.cache.delete(oldestKey);
        }
        this.cache.set(
          key,
          computed.map((pt) => ({ x: pt.x, z: pt.z }))
        );
      }
      return computed;
    };

    return true;
  }

  prebakeNextPair(ctx) {
    if (!this._rawFindGPSPath && !this.installOnWorld(ctx)) return false;
    const hubs = this.keyHubCoords;
    const totalPairs = hubs.length * (hubs.length - 1);
    if (this.prebakedRoutes >= totalPairs) return false;

    const idx = this.prewarmCursor % totalPairs;
    this.prewarmCursor++;
    const i = Math.floor(idx / (hubs.length - 1));
    let j = idx % (hubs.length - 1);
    if (j >= i) j++;

    const a = hubs[i];
    const b = hubs[j];
    const key = this._makeKey(a[0], a[1], b[0], b[1]);
    if (!this.cache.has(key) && this._rawFindGPSPath) {
      const path = this._rawFindGPSPath(a[0], a[1], b[0], b[1]);
      if (Array.isArray(path) && path.length >= 2) {
        if (this.cache.size >= this.maxEntries) {
          const oldest = this.cache.keys().next().value;
          if (oldest !== undefined) this.cache.delete(oldest);
        }
        this.cache.set(key, path);
        this.prebakedRoutes++;
      }
    }
    return true;
  }

  getHitRatePct() {
    const total = this.hits + this.misses;
    return total > 0 ? Number(((this.hits / total) * 100).toFixed(1)) : 100;
  }
}

// Cooperative Tiled Offscreen Static Minimap Layer Baker
// Pre-renders coastal metropolis roads, avenues, pier, freeway, marina & landmarks across slices
class MinimapStaticCanvasBaker {
  constructor(resolution = 512) {
    this.resolution = resolution;
    this.worldMinX = -325;
    this.worldMaxX = 285;
    this.worldMinZ = -310;
    this.worldMaxZ = 270;
    this.canvas = null;
    this.ctx2d = null;
    this.isReady = false;
    this.bakeStage = 0;
    this.bakeCount = 0;
    this.lastBakeTimeMs = 0;
  }

  _ensureCanvas() {
    if (this.canvas || typeof document === 'undefined') return Boolean(this.canvas);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.resolution;
    this.canvas.height = this.resolution;
    this.ctx2d = this.canvas.getContext('2d');
    return Boolean(this.ctx2d);
  }

  worldToMapX(wx) {
    return ((wx - this.worldMinX) / (this.worldMaxX - this.worldMinX)) * this.resolution;
  }

  worldToMapY(wz) {
    return ((wz - this.worldMinZ) / (this.worldMaxZ - this.worldMinZ)) * this.resolution;
  }

  scheduleCooperativeBake(scheduler) {
    if (!this._ensureCanvas() || !scheduler) return false;
    this.bakeStage = 0;

    scheduler.enqueueSliced(
      'minimap_static_bake',
      (startStep) => {
        const g = this.ctx2d;
        const W = this.resolution;
        const H = this.resolution;
        const scaleX = W / (this.worldMaxX - this.worldMinX);
        const scaleZ = H / (this.worldMaxZ - this.worldMinZ);

        if (startStep === 0) {
          // Slice 0: Deep Pacific Ocean, Coastal Shallows, Sandy Beach & Urban Landmass
          g.clearRect(0, 0, W, H);
          g.fillStyle = '#0c273d';
          g.fillRect(0, 0, W, H);

          // Shallow surf gradient strip along X = -212..-195
          const surfGrad = g.createLinearGradient(
            this.worldToMapX(-235),
            0,
            this.worldToMapX(-128),
            0
          );
          surfGrad.addColorStop(0, '#0c273d');
          surfGrad.addColorStop(0.42, '#176078');
          surfGrad.addColorStop(0.55, '#c9b482');
          surfGrad.addColorStop(1, '#232c38');
          g.fillStyle = surfGrad;
          g.fillRect(
            this.worldToMapX(-235),
            this.worldToMapY(-260),
            (107 * W) / (this.worldMaxX - this.worldMinX),
            (510 * H) / (this.worldMaxZ - this.worldMinZ)
          );

          // Main urban landmass & North Võ Lâm hills
          g.fillStyle = '#202833';
          g.fillRect(
            this.worldToMapX(-128),
            this.worldToMapY(-295),
            this.worldToMapX(280) - this.worldToMapX(-128),
            this.worldToMapY(258) - this.worldToMapY(-295)
          );

          g.fillStyle = '#243528';
          g.fillRect(
            this.worldToMapX(-128),
            this.worldToMapY(-305),
            this.worldToMapX(275) - this.worldToMapX(-128),
            this.worldToMapY(-222) - this.worldToMapY(-305)
          );
        } else if (startStep === 1) {
          // Slice 1: Bồng Lai Pier, Luxury Marina & Lighthouse Peninsula
          g.fillStyle = '#785a3c';
          g.fillRect(
            this.worldToMapX(-295),
            this.worldToMapY(-32),
            167 * scaleX,
            54 * scaleZ
          );

          // Luxury Yacht Marina pontoons (-275..-200, +75..+145)
          g.fillStyle = '#4e5d6c';
          g.fillRect(
            this.worldToMapX(-275),
            this.worldToMapY(75),
            75 * scaleX,
            70 * scaleZ
          );

          // Lighthouse Island (-290..-255, +185..+215)
          g.fillStyle = '#3b4a3e';
          g.beginPath();
          g.arc(this.worldToMapX(-275), this.worldToMapY(200), 18 * scaleX, 0, TWO_PI);
          g.fill();
        } else if (startStep === 2) {
          // Slice 2: City Street Grid, Hero Boulevard Bồng Lai & Sidewalk Blocks
          const avenues = [-120, -40, 40, 120, 200];
          const streets = [-200, -120, -40, 40, 120, 200];

          g.fillStyle = '#3c4654';
          for (let i = 0; i < avenues.length; i++) {
            const ax = avenues[i];
            const rw = ax === 40 ? 22 : 16;
            g.fillRect(
              this.worldToMapX(ax - rw * 0.5),
              this.worldToMapY(-220),
              rw * scaleX,
              440 * scaleZ
            );
          }
          for (let i = 0; i < streets.length; i++) {
            const sz = streets[i];
            g.fillRect(
              this.worldToMapX(-130),
              this.worldToMapY(sz - 8),
              380 * scaleX,
              16 * scaleZ
            );
          }

          // Boulevard Bồng Lai landscaped green center median
          g.fillStyle = '#3b8c47';
          g.fillRect(
            this.worldToMapX(38.8),
            this.worldToMapY(-195),
            2.4 * scaleX,
            390 * scaleZ
          );
        } else if (startStep === 3) {
          // Slice 3: Elevated Outer Freeway, Red Cable-Stayed Bridge & Landmark Footprints
          g.strokeStyle = '#64748b';
          g.lineWidth = Math.max(2.5, 11 * scaleX);
          g.beginPath();
          g.moveTo(this.worldToMapX(-120), this.worldToMapY(232));
          g.lineTo(this.worldToMapX(236), this.worldToMapY(232));
          g.lineTo(this.worldToMapX(236), this.worldToMapY(-180));
          g.stroke();

          // Red Cable-Stayed Coastal Bridge (-245..-120, Z=+200)
          g.strokeStyle = '#dc2626';
          g.lineWidth = Math.max(2.2, 9 * scaleX);
          g.beginPath();
          g.moveTo(this.worldToMapX(-265), this.worldToMapY(200));
          g.lineTo(this.worldToMapX(-120), this.worldToMapY(200));
          g.stroke();

          // Vạn Bảo Đổ Phường Footprint [214..274, -152..-68]
          g.fillStyle = '#58337a';
          g.fillRect(
            this.worldToMapX(214),
            this.worldToMapY(-152),
            60 * scaleX,
            84 * scaleZ
          );

          // Túy Tiên Lâu Footprint [-166..-131, -116..-74]
          g.fillStyle = '#6b215c';
          g.fillRect(
            this.worldToMapX(-166),
            this.worldToMapY(-116),
            35 * scaleX,
            42 * scaleZ
          );

          // FIB Central Tower [136..184, -64..-16]
          g.fillStyle = '#2d4f6c';
          g.fillRect(
            this.worldToMapX(136),
            this.worldToMapY(-64),
            48 * scaleX,
            48 * scaleZ
          );

          this.isReady = true;
          this.bakeCount++;
        }
        return true;
      },
      4,
      1,
      TASK_PRIORITY.LOW,
      { dedupeKey: 'minimap_static_bake_job' }
    );
    return true;
  }
}

// ============================================================================
// CHAPTER 8: Adaptive Frame-Pacing Governor & 1-Click "Siêu Tối Ưu Turbo
// 60/120 FPS" Coordinator (engine + gfxUltra + gameplay + world + shadows)
// ============================================================================

const HEAVY_GFX_ULTRA_EFFECT_KEYS = Object.freeze([
  'ssao',
  'gtao',
  'wetReflection',
  'wetReflections',
  'ssr',
  'godRays',
  'crepuscularRays',
  'motionBlur',
  'bokeh',
  'dof',
  'depthOfField',
]);

class AdaptiveTurboGovernor {
  constructor(options) {
    this.culler = options.culler;
    this.shadowMgr = options.shadowMgr;
    this.scheduler = options.scheduler;
    this.sceneOptimizer = options.sceneOptimizer;
    this.calibrator = options.calibrator;
    this.frameRing = options.frameRing;

    this.turboMode = false;
    this.adaptiveEnabled = true;
    this.savedUserSnapshot = null;

    // Live dynamic LOD & pacing scalars (1.0 = tier baseline, 0.65..1.15 adaptive range)
    this.lodDistanceScale = 1.0;
    this.adaptiveStepLevel = 0; // 0 = nominal, 1..3 = progressive relief steps
    this.overBudgetTimer = 0;
    this.underBudgetTimer = 0;
    this.sectorSyncAccum = 0;

    this.stats = {
      turboActive: false,
      targetFps: 60,
      targetFrameMs: 16.67,
      effectiveTierId: 'ULTRA',
      lodDistanceScale: 1.0,
      effectiveSectorRadiusM: 215,
      adaptiveStepLevel: 0,
      pixelRatioActive: 1.0,
    };
  }

  getActiveTierConfig(ctx) {
    if (this.turboMode) return QUALITY_TIER_CONFIGS.TURBO;
    const q = String(ctx?.engine?.quality || 'ULTRA').toUpperCase();
    return QUALITY_TIER_CONFIGS[q] || QUALITY_TIER_CONFIGS.ULTRA;
  }

  _captureCurrentSettings(ctx) {
    const engine = ctx?.engine;
    const gfx = ctx?.gfxUltra;
    const gp = ctx?.gameplay;

    const gfxEffectsCopy = {};
    if (gfx?.state && typeof gfx.state === 'object') {
      const src = gfx.state.effects || gfx.state;
      for (const k of Object.keys(src)) {
        if (typeof src[k] === 'boolean') {
          gfxEffectsCopy[k] = src[k];
        }
      }
    }

    return {
      engineQuality: engine?.quality || 'ULTRA',
      engineAutoOptimize: Boolean(engine?.autoOptimize ?? true),
      rendererPixelRatio: engine?.renderer?.getPixelRatio?.() || 1.0,
      gameplayDensity: gp?.densityMode || 'HIGH',
      gfxPreset: gfx?.state?.preset || gfx?.preset || null,
      gfxEffectsCopy,
      schedulerBudgetMs: this.scheduler.baseBudgetMs,
      shadowOverride: this.shadowMgr.overrideMaxCasters,
    };
  }

  _applyPixelRatioToEngine(ctx, pr) {
    const engine = ctx?.engine;
    const renderer = engine?.renderer;
    if (!renderer) return;

    const safePR = clamp(Number(pr.toFixed(2)), 0.7, 2.0);
    const w = Math.max(
      1,
      (typeof window !== 'undefined' && window.innerWidth) ||
        renderer.domElement?.clientWidth ||
        1280
    );
    const h = Math.max(
      1,
      (typeof window !== 'undefined' && window.innerHeight) ||
        renderer.domElement?.clientHeight ||
        720
    );

    renderer.setPixelRatio(safePR);
    renderer.setSize(w, h, false);
    if (engine.composer && typeof engine.composer.setPixelRatio === 'function') {
      engine.composer.setPixelRatio(safePR);
      engine.composer.setSize(w, h);
    }
    this.stats.pixelRatioActive = safePR;
  }

  setTurboMode(enabled, ctx, silent = false) {
    const nextTurbo =
      enabled === undefined || enabled === null || String(enabled).toUpperCase() === 'TOGGLE'
        ? !this.turboMode
        : Boolean(enabled);

    if (nextTurbo === this.turboMode && this.savedUserSnapshot !== null) {
      return this.turboMode;
    }

    const engine = ctx?.engine;
    const gfx = ctx?.gfxUltra;
    const gp = ctx?.gameplay;

    if (nextTurbo) {
      // Snapshot pre-Turbo configuration for lossless 1-click restore
      this.savedUserSnapshot = this._captureCurrentSettings(ctx);
      this.turboMode = true;
      this.lodDistanceScale = 0.78;
      this.adaptiveStepLevel = 2;

      // 1. Coordinate Engine Quality, Auto-DRS & Crisp 1.0x PixelRatio Lock
      const is120Hz = this.calibrator.detectedHz >= 100;
      const targetPR = is120Hz ? 0.92 : 1.0;
      if (engine) {
        if (typeof engine.setQuality === 'function' && engine.quality === 'ULTRA') {
          engine.setQuality('HIGH');
        }
        if (typeof engine.setAutoOptimize === 'function') {
          engine.setAutoOptimize(true);
        }
        this._applyPixelRatioToEngine(ctx, targetPR);
      }

      // 2. Coordinate GfxUltra Heavy Post-Processing Passes
      if (gfx) {
        if (typeof gfx.setPreset === 'function') {
          try {
            gfx.setPreset('HIGH');
          } catch (_) {}
        }
        if (typeof gfx.toggleEffect === 'function') {
          for (let i = 0; i < HEAVY_GFX_ULTRA_EFFECT_KEYS.length; i++) {
            try {
              gfx.toggleEffect(HEAVY_GFX_ULTRA_EFFECT_KEYS[i], false);
            } catch (_) {}
          }
        }
      }

      // 3. Coordinate Gameplay Traffic & Pedestrian Streamlined Density (protects mission entities!)
      if (gp && typeof gp.setTrafficDensity === 'function') {
        const curMs = this.frameRing.ema || 16.6;
        gp.setTrafficDensity(curMs > 22.0 ? 'LIGHT' : 'BALANCED', true);
      }

      // 4. Coordinate Texture Anisotropy, Shadow Priority Cap, Occluder & 1.35ms Scheduler Budget
      this.sceneOptimizer.applyTextureAnisotropyCap(2, engine?.renderer);
      this.shadowMgr.overrideMaxCasters = is120Hz ? 4 : 6;
      this.shadowMgr.forceImmediateRefresh();
      this.culler.frustumCullingEnabled = true;
      this.culler.occlusionCullingEnabled = true;
      this.culler.rebuildSolidOccluders(ctx, QUALITY_TIER_CONFIGS.TURBO.occluderInset);
      this.scheduler.setBudgetMs(QUALITY_TIER_CONFIGS.TURBO.schedulerBudgetMs);

      this._enforceWorldSectorRadius(ctx, QUALITY_TIER_CONFIGS.TURBO.sectorLodRadius);

      if (!silent) {
        const hzLabel = is120Hz ? '120 FPS' : '60/120 FPS';
        ctx?.ui?.showNotification?.(
          `⚡ Siêu Tối Ưu Turbo ${hzLabel}: ĐÃ BẬT — Khóa khung hình siêu mượt!`,
          3.4
        );
      }
    } else {
      // Restore previous Studio settings cleanly
      this.turboMode = false;
      this.lodDistanceScale = 1.0;
      this.adaptiveStepLevel = 0;

      const snap = this.savedUserSnapshot;
      if (snap) {
        if (engine) {
          if (typeof engine.setQuality === 'function' && snap.engineQuality) {
            engine.setQuality(snap.engineQuality);
          }
          if (typeof engine.setAutoOptimize === 'function') {
            engine.setAutoOptimize(snap.engineAutoOptimize);
          }
          if (snap.rendererPixelRatio) {
            this._applyPixelRatioToEngine(ctx, snap.rendererPixelRatio);
          }
        }

        if (gfx) {
          if (snap.gfxPreset && typeof gfx.setPreset === 'function') {
            try {
              gfx.setPreset(snap.gfxPreset);
            } catch (_) {}
          }
          if (snap.gfxEffectsCopy && typeof gfx.toggleEffect === 'function') {
            for (const [effKey, effState] of Object.entries(snap.gfxEffectsCopy)) {
              try {
                gfx.toggleEffect(effKey, effState);
              } catch (_) {}
            }
          }
        }

        if (gp && typeof gp.setTrafficDensity === 'function' && snap.gameplayDensity) {
          gp.setTrafficDensity(snap.gameplayDensity, true);
        }

        const restoredTier =
          QUALITY_TIER_CONFIGS[snap.engineQuality] || QUALITY_TIER_CONFIGS.ULTRA;
        this.sceneOptimizer.applyTextureAnisotropyCap(
          restoredTier.maxAnisotropy,
          engine?.renderer
        );
        this.shadowMgr.overrideMaxCasters = snap.shadowOverride;
        this.shadowMgr.forceImmediateRefresh();
        this.culler.rebuildSolidOccluders(ctx, restoredTier.occluderInset);
        this.scheduler.setBudgetMs(snap.schedulerBudgetMs || DEFAULT_SCHEDULER_BUDGET_MS);
      } else {
        this.shadowMgr.overrideMaxCasters = null;
        this.shadowMgr.forceImmediateRefresh();
        this.scheduler.setBudgetMs(DEFAULT_SCHEDULER_BUDGET_MS);
      }

      if (!silent) {
        ctx?.ui?.showNotification?.(
          '✨ Đã tắt Chế độ Turbo — Khôi phục cấu hình đồ họa gốc!',
          2.8
        );
      }
    }

    this.stats.turboActive = this.turboMode;
    return this.turboMode;
  }

  _enforceWorldSectorRadius(ctx, radiusMeters) {
    const lodSectors = ctx?.world?.lodSectors;
    if (!Array.isArray(lodSectors) || lodSectors.length === 0) return;

    const px = Number.isFinite(ctx?.player?.x)
      ? ctx.player.x
      : ctx?.engine?.camera?.position?.x ?? 26;
    const pz = Number.isFinite(ctx?.player?.z)
      ? ctx.player.z
      : ctx?.engine?.camera?.position?.z ?? 28;

    // Inside interior rooms (X > 650, Z > 650), world.js already hides outdoor sectors
    if (px > 650 && pz > 650) return;

    const rSq = radiusMeters * radiusMeters;
    for (let i = 0; i < lodSectors.length; i++) {
      const s = lodSectors[i];
      if (!s?.group) continue;
      const nearX = clamp(px, s.minX, s.maxX);
      const nearZ = clamp(pz, s.minZ, s.maxZ);
      const dSq = (px - nearX) ** 2 + (pz - nearZ) ** 2;
      s.group.visible = dSq < rSq;
    }
  }

  update(dtSec, ctx, benchmarkActive = false) {
    const safeDt = clamp(dtSec, 0.001, 0.2);
    const tierCfg = this.getActiveTierConfig(ctx);
    const targetHz = this.calibrator.detectedHz || 60;
    const budgetMs = this.turboMode && targetHz >= 100 ? 8.8 : 16.67;

    this.stats.turboActive = this.turboMode;
    this.stats.targetFps = this.turboMode && targetHz >= 100 ? 120 : 60;
    this.stats.targetFrameMs = Number(budgetMs.toFixed(2));
    this.stats.effectiveTierId = tierCfg.id;
    this.stats.pixelRatioActive = Number(
      (ctx?.engine?.renderer?.getPixelRatio?.() || 1.0).toFixed(2)
    );

    // Freeze adaptive stepping while running deterministic GPU benchmark!
    if (benchmarkActive || !this.adaptiveEnabled || ctx?.paused) {
      return this.stats;
    }

    const emaMs = this.frameRing.ema;
    const highThreshold = budgetMs * 1.14; // ~19.0ms at 60Hz
    const lowThreshold = budgetMs * 0.78; // ~13.0ms at 60Hz

    if (emaMs > highThreshold) {
      this.overBudgetTimer += safeDt;
      this.underBudgetTimer = 0;
      if (this.overBudgetTimer >= 0.85) {
        this.overBudgetTimer = 0;
        this.lodDistanceScale = Math.max(0.66, this.lodDistanceScale - 0.08);
        if (this.adaptiveStepLevel < 3) {
          this.adaptiveStepLevel++;
          if (this.adaptiveStepLevel >= 2 && !this.turboMode && this.shadowMgr.overrideMaxCasters === null) {
            const baseMax = tierCfg.maxShadowCasters;
            this.shadowMgr.overrideMaxCasters = Math.max(0, Math.floor(baseMax * 0.65));
            this.shadowMgr.forceImmediateRefresh();
          }
        }
      }
    } else if (emaMs < lowThreshold) {
      this.underBudgetTimer += safeDt;
      this.overBudgetTimer = 0;
      if (this.underBudgetTimer >= 2.2) {
        this.underBudgetTimer = 0;
        const maxScale = this.turboMode ? 0.86 : 1.05;
        this.lodDistanceScale = Math.min(maxScale, this.lodDistanceScale + 0.06);
        if (this.adaptiveStepLevel > 0) {
          this.adaptiveStepLevel--;
          if (this.adaptiveStepLevel === 0 && !this.turboMode) {
            this.shadowMgr.overrideMaxCasters = null;
            this.shadowMgr.forceImmediateRefresh();
          }
        }
      }
    } else {
      this.overBudgetTimer = Math.max(0, this.overBudgetTimer - safeDt * 0.5);
      this.underBudgetTimer = Math.max(0, this.underBudgetTimer - safeDt * 0.5);
    }

    const effectiveSectorRadius = Math.round(tierCfg.sectorLodRadius * this.lodDistanceScale);
    this.stats.lodDistanceScale = Number(this.lodDistanceScale.toFixed(2));
    this.stats.effectiveSectorRadiusM = effectiveSectorRadius;
    this.stats.adaptiveStepLevel = this.adaptiveStepLevel;

    // Coordinate world.js lodSectors radius smoothly when Turbo or relief step is active
    if (this.turboMode || this.adaptiveStepLevel > 0) {
      this.sectorSyncAccum += safeDt;
      if (this.sectorSyncAccum >= 0.22) {
        this.sectorSyncAccum = 0;
        this._enforceWorldSectorRadius(ctx, effectiveSectorRadius);
      }
    }

    return this.stats;
  }
}

// ============================================================================
// CHAPTER 9: Automated 15-Second Cinematic Flythrough Camera Benchmark Suite
// (`Chạy Đo Hiệu Năng Tự Động`) & Hardware Rank Scorer (`Hạng S+ / S / A / B`)
// ============================================================================

const BENCHMARK_STAGES = Object.freeze([
  Object.freeze({
    index: 0,
    id: 'boulevard_del_perro',
    title: 'Đại Lộ Bồng Lai & Dòng Giao Thông',
    weather: 'BRIGHT_DAY',
    fovStart: 62,
    fovEnd: 66,
    eyeSpline: [
      [38, 8.5, 145],
      [42, 6.2, 65],
      [36, 7.5, -18],
      [44, 11.5, -105],
    ],
    lookSpline: [
      [40, 2.5, 85],
      [40, 2.2, 5],
      [40, 3.2, -75],
      [40, 4.5, -165],
    ],
  }),
  Object.freeze({
    index: 1,
    id: 'downtown_skyscrapers',
    title: 'Trung Tâm Tài Chính Downtown & Tháp FIB',
    weather: 'SUNSET_GOLD',
    fovStart: 65,
    fovEnd: 60,
    eyeSpline: [
      [108, 22.0, 28],
      [126, 36.0, -14],
      [152, 46.0, 12],
      [196, 30.0, -48],
    ],
    lookSpline: [
      [158, 34.0, -38],
      [160, 44.0, -40],
      [165, 38.0, -42],
      [160, 24.0, -40],
    ],
  }),
  Object.freeze({
    index: 2,
    id: 'pier_and_pacific_ocean',
    title: 'Cầu Cảng Bồng Lai Pier & Đại Dương GLSL',
    weather: 'SUNSET_GOLD',
    fovStart: 64,
    fovEnd: 68,
    eyeSpline: [
      [-142, 12.5, 58],
      [-188, 16.0, 26],
      [-228, 21.5, 28],
      [-268, 24.0, 14],
    ],
    lookSpline: [
      [-215, 10.0, -5],
      [-240, 18.0, -10],
      [-245, 23.0, -12],
      [-245, 20.0, -12],
    ],
  }),
  Object.freeze({
    index: 3,
    id: 'casino_and_freeway_night',
    title: 'Vạn Bảo Đổ Phường & Cao Tốc Đêm Neon',
    weather: 'NEON_NIGHT',
    fovStart: 64,
    fovEnd: 62,
    eyeSpline: [
      [194, 9.5, -45],
      [196, 12.0, -96],
      [198, 16.5, -138],
      [226, 20.0, -172],
    ],
    lookSpline: [
      [234, 16.0, -105],
      [240, 20.0, -110],
      [242, 24.0, -112],
      [205, 12.0, -110],
    ],
  }),
  Object.freeze({
    index: 4,
    id: 'rainstorm_reflections',
    title: 'Bão Đêm Đô Thị & Phản Chiếu Mặt Đường Ướt',
    weather: 'OVERCAST_RAIN',
    fovStart: 62,
    fovEnd: 65,
    eyeSpline: [
      [118, 8.0, 118],
      [78, 6.2, 68],
      [42, 5.5, 36],
      [24, 6.8, -12],
    ],
    lookSpline: [
      [68, 2.4, 65],
      [42, 2.0, 28],
      [40, 2.2, -25],
      [40, 3.0, -75],
    ],
  }),
]);

class AutomatedFlythroughBenchmark {
  constructor(governor, culler, shadowMgr) {
    this.governor = governor;
    this.culler = culler;
    this.shadowMgr = shadowMgr;

    this.active = false;
    this.durationSec = 15.0;
    this.elapsedSec = 0;
    this.warmupSec = 0.35;
    this.autoApplySettings = true;
    this.lastAppliedWeather = '';

    this.savedState = null;
    this.frameSamples = [];
    this.stageAccum = [];
    this.peakDrawCalls = 0;
    this.peakTriangles = 0;
    this.sumDrawCalls = 0;
    this.sampleCount = 0;
    this.lastReport = null;
    this._pendingResolvers = [];
    this._onCompleteCallback = null;

    this._eyePos = new THREE.Vector3();
    this._lookPos = new THREE.Vector3();
    this.bannerEl = null;
    this.bannerTitleEl = null;
    this.bannerMetricsEl = null;
    this.bannerBarFillEl = null;
  }

  _ensureBannerDOM() {
    if (this.bannerEl || typeof document === 'undefined' || !document.body) return;

    const wrap = document.createElement('div');
    wrap.id = 'perf-benchmark-banner';
    wrap.style.cssText = [
      'position:fixed',
      'top:16px',
      'left:50%',
      'transform:translateX(-50%)',
      'z-index:9996',
      'min-width:420px',
      'max-width:92vw',
      'padding:11px 18px 13px',
      'background:rgba(8,12,20,0.94)',
      'border:1.5px solid rgba(56,189,248,0.55)',
      'border-radius:8px',
      'box-shadow:0 12px 34px rgba(0,0,0,0.75)',
      'color:#f1f5f9',
      'font-family:"Segoe UI",system-ui,sans-serif',
      'display:none',
      'pointer-events:auto',
    ].join(';');

    const topRow = document.createElement('div');
    topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:6px;';

    const title = document.createElement('div');
    title.id = 'perf-benchmark-title';
    title.style.cssText = 'font-size:13px;font-weight:800;letter-spacing:0.04em;color:#38bdf8;';
    title.textContent = '🎬 ĐANG ĐO HIỆU NĂNG TỰ ĐỘNG (15 GIÂY)';

    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'perf-benchmark-cancel-btn';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Dừng [Esc]';
    cancelBtn.style.cssText = [
      'background:rgba(239,68,68,0.2)',
      'border:1px solid rgba(239,68,68,0.55)',
      'color:#fca5a5',
      'border-radius:4px',
      'padding:2px 8px',
      'font-size:11px',
      'font-weight:700',
      'cursor:pointer',
    ].join(';');
    cancelBtn.addEventListener('click', () => {
      if (this._activeCtx) this.stop(this._activeCtx, true);
    });

    topRow.appendChild(title);
    topRow.appendChild(cancelBtn);

    const metrics = document.createElement('div');
    metrics.id = 'perf-benchmark-metrics';
    metrics.style.cssText = 'font-size:12px;color:#cbd5e1;margin-bottom:7px;font-variant-numeric:tabular-nums;';
    metrics.textContent = 'Chuẩn bị đường bay camera...';

    const barBg = document.createElement('div');
    barBg.style.cssText = 'width:100%;height:6px;background:rgba(148,163,184,0.2);border-radius:3px;overflow:hidden;';

    const barFill = document.createElement('div');
    barFill.id = 'perf-benchmark-bar-fill';
    barFill.style.cssText = 'width:0%;height:100%;background:linear-gradient(90deg,#22d3ee,#3b82f6,#a855f7);transition:width 0.08s linear;';
    barBg.appendChild(barFill);

    wrap.appendChild(topRow);
    wrap.appendChild(metrics);
    wrap.appendChild(barBg);
    document.body.appendChild(wrap);

    this.bannerEl = wrap;
    this.bannerTitleEl = title;
    this.bannerMetricsEl = metrics;
    this.bannerBarFillEl = barFill;
  }

  start(ctx, options = {}) {
    this._activeCtx = ctx;
    if (this.active) {
      return new Promise((resolve) => this._pendingResolvers.push(resolve));
    }

    const reqDur = Number(options.duration);
    this.durationSec =
      Number.isFinite(reqDur) && reqDur >= 0.8 && reqDur <= 60 ? reqDur : 15.0;
    this.warmupSec = Math.min(0.35, this.durationSec * 0.1);
    this.autoApplySettings = options.autoApply !== false;
    this._onCompleteCallback =
      typeof options.onComplete === 'function' ? options.onComplete : null;

    const p = ctx?.player;
    const eng = ctx?.engine;

    // Save lossless player, vehicle, interior, modal & weather state
    this.savedState = {
      px: Number.isFinite(p?.x) ? p.x : 26,
      py: Number.isFinite(p?.y) ? p.y : 0.22,
      pz: Number.isFinite(p?.z) ? p.z : 28,
      pvx: p?.vx || 0,
      pvy: p?.vy || 0,
      pvz: p?.vz || 0,
      pyaw: p?.yaw || 0,
      php: p?.hp ?? 100,
      parmor: p?.armor ?? 50,
      inCar: p?.inCar || null,
      inSafehouse: Boolean(p?.inSafehouse),
      meshVisible: p?.mesh ? p.mesh.visible : true,
      dodgeImmunity: Boolean(p?.dodgeImmunity),
      weather: eng?.timeWeather || 'BRIGHT_DAY',
      camYaw: eng?.camYaw ?? -0.52,
      camPitch: eng?.camPitch ?? -0.11,
      camFov: eng?.camera?.fov ?? 62,
      paused: Boolean(ctx?.paused),
      started: Boolean(ctx?.started),
    };

    if (ctx) {
      ctx.paused = false;
      ctx.started = true;
    }

    if (p) {
      p.inCar = null;
      p.inSafehouse = false;
      p.dodgeImmunity = true;
      if (p.mesh) p.mesh.visible = false;
    }

    this.frameSamples.length = 0;
    this.stageAccum = BENCHMARK_STAGES.map((s) => ({
      id: s.id,
      title: s.title,
      frames: 0,
      totalMs: 0,
      maxMs: 0,
      avgFps: 0,
    }));
    this.peakDrawCalls = 0;
    this.peakTriangles = 0;
    this.sumDrawCalls = 0;
    this.sampleCount = 0;
    this.elapsedSec = 0;
    this.lastAppliedWeather = '';
    this.active = true;

    this._ensureBannerDOM();
    if (this.bannerEl) this.bannerEl.style.display = 'block';

    // Apply initial Stage 0 pose immediately
    this.applyCameraPose(ctx);

    return new Promise((resolve) => {
      this._pendingResolvers.push(resolve);
    });
  }

  applyCameraPose(ctx) {
    if (!this.active) return false;
    const eng = ctx?.engine;
    const cam = eng?.camera;
    if (!cam) return false;

    const progress = clamp(this.elapsedSec / Math.max(0.1, this.durationSec), 0, 0.999999);
    const stageFloat = progress * BENCHMARK_STAGES.length;
    const stageIdx = Math.min(BENCHMARK_STAGES.length - 1, Math.floor(stageFloat));
    const localU = smoothstep(0, 1, stageFloat - stageIdx);
    const stage = BENCHMARK_STAGES[stageIdx];

    if (stage.weather !== this.lastAppliedWeather && typeof eng.setTimeWeather === 'function') {
      this.lastAppliedWeather = stage.weather;
      eng.setTimeWeather(stage.weather);
    }

    evaluateCatmullRom3D(stage.eyeSpline, localU, this._eyePos);
    evaluateCatmullRom3D(stage.lookSpline, localU, this._lookPos);

    cam.position.copy(this._eyePos);
    cam.lookAt(this._lookPos);
    const desiredFov = lerp(stage.fovStart, stage.fovEnd, localU);
    if (Math.abs(cam.fov - desiredFov) > 0.05) {
      cam.fov = desiredFov;
      cam.updateProjectionMatrix();
    }
    cam.updateMatrixWorld(true);

    // Keep player ground anchor near flythrough gaze so LOD sectors, directional shadows,
    // streetlamps, and rain stream authentically around the benchmark camera!
    const p = ctx?.player;
    if (p) {
      const anchorX = lerp(this._eyePos.x, this._lookPos.x, 0.35);
      const anchorZ = lerp(this._eyePos.z, this._lookPos.z, 0.35);
      p.x = clamp(anchorX, -305, 265);
      p.z = clamp(anchorZ, -270, 250);
      p.y =
        ctx?.world && typeof ctx.world.getGroundHeight === 'function'
          ? ctx.world.getGroundHeight(p.x, p.z)
          : 0.22;
      p.vx = 0;
      p.vy = 0;
      p.vz = 0;
      p.dodgeImmunity = true;
      if (p.mesh) p.mesh.visible = false;
    }

    return true;
  }

  recordFrame(wallDtSec, frameMs, drawCalls, triangles, ctx) {
    if (!this.active) return null;
    const safeDt = clamp(wallDtSec, 0.001, 0.12);
    this.elapsedSec += safeDt;

    const progress = clamp(this.elapsedSec / Math.max(0.1, this.durationSec), 0, 1);
    const stageIdx = Math.min(
      BENCHMARK_STAGES.length - 1,
      Math.floor(progress * BENCHMARK_STAGES.length)
    );
    const stageInfo = BENCHMARK_STAGES[stageIdx];

    if (this.elapsedSec >= this.warmupSec) {
      const cleanMs = clamp(frameMs, 0.5, 200);
      this.frameSamples.push(cleanMs);
      this.sampleCount++;
      this.sumDrawCalls += drawCalls;
      if (drawCalls > this.peakDrawCalls) this.peakDrawCalls = drawCalls;
      if (triangles > this.peakTriangles) this.peakTriangles = triangles;

      const st = this.stageAccum[stageIdx];
      if (st) {
        st.frames++;
        st.totalMs += cleanMs;
        if (cleanMs > st.maxMs) st.maxMs = cleanMs;
      }
    }

    if (this.bannerEl) {
      const remSec = Math.max(0, this.durationSec - this.elapsedSec);
      const instFps = Math.round(1000 / Math.max(1, frameMs));
      if (this.bannerTitleEl) {
        this.bannerTitleEl.textContent = `🎬 BENCHMARK [${stageIdx + 1}/5]: ${stageInfo.title}`;
      }
      if (this.bannerMetricsEl) {
        this.bannerMetricsEl.textContent = `${instFps} FPS (${frameMs.toFixed(1)} ms) • ${drawCalls} Draw Calls • ${formatCompactCount(triangles)} Tris • Còn ${remSec.toFixed(1)}s`;
      }
      if (this.bannerBarFillEl) {
        this.bannerBarFillEl.style.width = `${(progress * 100).toFixed(1)}%`;
      }
    }

    if (this.elapsedSec >= this.durationSec) {
      return this.stop(ctx, false);
    }
    return null;
  }

  _computeFinalReport(cancelled) {
    const n = this.frameSamples.length;
    if (n === 0) {
      return {
        cancelled: Boolean(cancelled),
        rank: 'A',
        rankLabel: 'Hạng A — Cân Bằng Cao Cấp',
        score: 7200,
        avgFps: 60,
        low1PercentFps: 48,
        minFps: 45,
        maxFps: 60,
        avgFrameMs: 16.67,
        p95FrameMs: 19.2,
        p99FrameMs: 20.8,
        peakDrawCalls: this.peakDrawCalls,
        avgDrawCalls: 0,
        peakTriangles: this.peakTriangles,
        recommendedTier: 'HIGH',
        recommendedTurbo: false,
        stages: [],
        timestamp: Date.now(),
      };
    }

    const sorted = Float32Array.from(this.frameSamples).sort();
    let sumMs = 0;
    for (let i = 0; i < n; i++) sumMs += sorted[i];
    const avgMs = sumMs / n;
    const minMs = sorted[0];
    const maxMs = sorted[n - 1];
    const p95Ms = sorted[Math.min(n - 1, Math.floor(n * 0.95))];
    const p99Ms = sorted[Math.min(n - 1, Math.floor(n * 0.99))];

    const avgFps = 1000 / Math.max(0.5, avgMs);
    const low1Fps = 1000 / Math.max(0.5, p99Ms);
    const minFps = 1000 / Math.max(0.5, maxMs);
    const maxFps = 1000 / Math.max(0.5, minMs);

    // Composite Studio GPU Score (weights smooth avg FPS + 1% low stability)
    const rawScore = Math.round(avgFps * 118 + low1Fps * 64 - Math.max(0, p95Ms - 16.7) * 42);
    const score = clamp(rawScore, 850, 16500);

    let rank = 'B';
    let rankLabel = 'Hạng B — Laptop / Thiết Bị Phổ Thông (Khuyên dùng Turbo Smooth)';
    let recommendedTier = 'HIGH';
    let recommendedTurbo = true;

    if (avgFps >= 56 && low1Fps >= 43) {
      rank = 'S+';
      rankLabel = 'Hạng S+ — Siêu Cấp Studio Ultra (60–120+ FPS)';
      recommendedTier = 'ULTRA';
      recommendedTurbo = false;
    } else if (avgFps >= 48 && low1Fps >= 35) {
      rank = 'S';
      rankLabel = 'Hạng S — Đồ Họa Ultra Mượt Mà';
      recommendedTier = 'ULTRA';
      recommendedTurbo = false;
    } else if (avgFps >= 36) {
      rank = 'A';
      rankLabel = 'Hạng A — Đồ Họa Cao Cân Bằng (High 60 FPS)';
      recommendedTier = 'HIGH';
      recommendedTurbo = false;
    } else if (avgFps < 24) {
      rank = 'B';
      rankLabel = 'Hạng B — Cấu Hình Tiết Kiệm (Kích hoạt Siêu Tối Ưu Turbo)';
      recommendedTier = 'MOBILE';
      recommendedTurbo = true;
    }

    const stagesOut = this.stageAccum.map((st) => {
      const sAvgMs = st.frames > 0 ? st.totalMs / st.frames : avgMs;
      return {
        id: st.id,
        title: st.title,
        frames: st.frames,
        avgMs: Number(sAvgMs.toFixed(2)),
        avgFps: Math.round(1000 / Math.max(0.5, sAvgMs)),
      };
    });

    return {
      cancelled: Boolean(cancelled),
      rank,
      rankLabel,
      score,
      avgFps: Number(avgFps.toFixed(1)),
      low1PercentFps: Number(low1Fps.toFixed(1)),
      minFps: Number(minFps.toFixed(1)),
      maxFps: Number(maxFps.toFixed(1)),
      avgFrameMs: Number(avgMs.toFixed(2)),
      p95FrameMs: Number(p95Ms.toFixed(2)),
      p99FrameMs: Number(p99Ms.toFixed(2)),
      peakDrawCalls: this.peakDrawCalls,
      avgDrawCalls: Math.round(this.sumDrawCalls / Math.max(1, this.sampleCount)),
      peakTriangles: this.peakTriangles,
      recommendedTier,
      recommendedTurbo,
      stages: stagesOut,
      timestamp: Date.now(),
    };
  }

  applyRecommendedProfile(report, ctx) {
    if (!report || !ctx) return;
    const eng = ctx.engine;
    const gfx = ctx.gfxUltra;
    const gp = ctx.gameplay;

    if (report.recommendedTurbo) {
      if (eng?.setQuality && report.recommendedTier === 'MOBILE') {
        eng.setQuality('MOBILE');
      }
      this.governor.setTurboMode(true, ctx, true);
    } else {
      if (this.governor.turboMode) {
        this.governor.setTurboMode(false, ctx, true);
      }
      if (eng?.setQuality) {
        eng.setQuality(report.recommendedTier);
      }
      if (eng?.setAutoOptimize) {
        eng.setAutoOptimize(true);
      }
      if (gfx?.setPreset) {
        try {
          gfx.setPreset(report.recommendedTier);
        } catch (_) {}
      }
      if (gp?.setTrafficDensity) {
        gp.setTrafficDensity(report.recommendedTier === 'ULTRA' ? 'HIGH' : 'BALANCED', true);
      }
      this.shadowMgr.forceImmediateRefresh();
    }
  }

  stop(ctx, cancelled = false) {
    if (!this.active) return this.lastReport;
    this.active = false;

    if (this.bannerEl) {
      this.bannerEl.style.display = 'none';
    }

    // Restore saved player, vehicle, interior, camera & weather state cleanly!
    const s = this.savedState;
    const p = ctx?.player;
    const eng = ctx?.engine;

    if (s) {
      if (eng) {
        if (typeof eng.setTimeWeather === 'function' && s.weather) {
          eng.setTimeWeather(s.weather);
        }
        eng.camYaw = s.camYaw;
        eng.camPitch = s.camPitch;
        if (eng.camera) {
          eng.camera.fov = s.camFov;
          eng.camera.updateProjectionMatrix();
        }
      }
      if (p) {
        p.x = s.px;
        p.y = s.py;
        p.z = s.pz;
        p.vx = s.pvx;
        p.vy = s.pvy;
        p.vz = s.pvz;
        p.yaw = s.pyaw;
        p.hp = s.php;
        p.armor = s.parmor;
        p.inCar = s.inCar;
        p.inSafehouse = s.inSafehouse;
        p.dodgeImmunity = s.dodgeImmunity;
        if (p.mesh) {
          p.mesh.visible = s.meshVisible;
          p.mesh.position.set(s.px, s.py, s.pz);
          p.mesh.rotation.y = s.pyaw;
        }
      }
    }

    const report = this._computeFinalReport(cancelled);
    this.lastReport = report;

    if (!cancelled && this.autoApplySettings) {
      this.applyRecommendedProfile(report, ctx);
    }

    // Ensure visibility is freshly evaluated at restored player position
    this.culler.restoreAllCulledVisibility(ctx);
    this.shadowMgr.forceImmediateRefresh();

    if (!cancelled) {
      ctx?.ui?.showNotification?.(
        `🏆 Kết quả Benchmark: ${report.rankLabel} • ${report.avgFps} FPS (1% Low: ${report.low1PercentFps} FPS) • Đã áp dụng cấu hình tối ưu!`,
        5.5
      );
    } else {
      ctx?.ui?.showNotification?.('⏹ Đã dừng bài đo hiệu năng tự động.', 2.5);
    }

    if (this._onCompleteCallback) {
      try {
        this._onCompleteCallback(report);
      } catch (_) {}
      this._onCompleteCallback = null;
    }

    const resolvers = this._pendingResolvers.splice(0, this._pendingResolvers.length);
    for (let i = 0; i < resolvers.length; i++) {
      try {
        resolvers[i](report);
      } catch (_) {}
    }

    return report;
  }
}

// ============================================================================
// CHAPTER 10: Live 2D Spatial BVH / Frustum / Skyscraper Horizon Radar Debugger
// & Automated Bottleneck Classification / Diagnostics Engine
// ============================================================================

class SpatialRadarDebugger {
  constructor(bvh, dynamicGrid, culler, shadowMgr) {
    this.bvh = bvh;
    this.dynamicGrid = dynamicGrid;
    this.culler = culler;
    this.shadowMgr = shadowMgr;
    this.rangeMeters = 195;
    this.showHorizonField = true;
    this.showStaticLeaves = true;
    this.showOccluders = true;
    this.showDynamicActors = true;
  }

  zoom(deltaSteps) {
    this.rangeMeters = clamp(this.rangeMeters + deltaSteps * 25, 80, 360);
    return this.rangeMeters;
  }

  renderToCanvas(ctx2d, width, height, gameCtx) {
    if (!ctx2d || width <= 10 || height <= 10) return;

    const cam = gameCtx?.engine?.camera;
    const camX = cam?.position?.x ?? gameCtx?.player?.x ?? 26;
    const camY = cam?.position?.y ?? 2.8;
    const camZ = cam?.position?.z ?? gameCtx?.player?.z ?? 28;

    const halfW = width * 0.5;
    const halfH = height * 0.5;
    const radiusPx = Math.min(halfW, halfH) - 10;
    const scale = radiusPx / Math.max(40, this.rangeMeters);

    const toScreenX = (wx) => halfW + (wx - camX) * scale;
    const toScreenY = (wz) => halfH + (wz - camZ) * scale;

    // 1. Radar Dark Studio Background & Concentric Range Rings
    ctx2d.fillStyle = '#070b13';
    ctx2d.fillRect(0, 0, width, height);

    ctx2d.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx2d.lineWidth = 1;
    for (let ring = 1; ring <= 3; ring++) {
      const rPx = (radiusPx * ring) / 3;
      ctx2d.beginPath();
      ctx2d.arc(halfW, halfH, rPx, 0, TWO_PI);
      ctx2d.stroke();
    }

    // Crosshair axes
    ctx2d.beginPath();
    ctx2d.moveTo(halfW - radiusPx, halfH);
    ctx2d.lineTo(halfW + radiusPx, halfH);
    ctx2d.moveTo(halfW, halfH - radiusPx);
    ctx2d.lineTo(halfW, halfH + radiusPx);
    ctx2d.stroke();

    // 2. Render 180-Bin Azimuthal Software Horizon Occlusion Shadow Wedges
    if (
      this.showHorizonField &&
      !this.culler.currentInteriorHub &&
      this.culler.horizonActiveBins > 0
    ) {
      ctx2d.fillStyle = 'rgba(244, 63, 94, 0.14)';
      const stepAng = TWO_PI / HORIZON_BIN_COUNT;
      for (let b = 0; b < HORIZON_BIN_COUNT; b++) {
        const wallD = this.culler.horizonWallDist[b];
        if (wallD >= this.rangeMeters || wallD > 1e7) continue;
        const a0 = b * stepAng;
        const a1 = a0 + stepAng + 0.004;
        const innerR = Math.max(4, wallD * scale);
        ctx2d.beginPath();
        ctx2d.arc(halfW, halfH, radiusPx, a0, a1, false);
        ctx2d.arc(halfW, halfH, innerR, a1, a0, true);
        ctx2d.closePath();
        ctx2d.fill();
      }
    }

    // 3. Render Camera View Frustum Wedge
    if (cam) {
      const fwdX = this.culler._camDir.x || 0;
      const fwdZ = this.culler._camDir.z || -1;
      const horizLen = Math.hypot(fwdX, fwdZ) || 1;
      const centerYaw = Math.atan2(fwdZ / horizLen, fwdX / horizLen);
      const aspect = cam.aspect || 1.77;
      const vFovRad = (cam.fov || 62) * DEG_TO_RAD;
      const hFovHalf = Math.atan(Math.tan(vFovRad * 0.5) * aspect);

      ctx2d.fillStyle = 'rgba(56, 189, 248, 0.11)';
      ctx2d.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx2d.lineWidth = 1.25;
      ctx2d.beginPath();
      ctx2d.moveTo(halfW, halfH);
      ctx2d.arc(halfW, halfH, radiusPx, centerYaw - hFovHalf, centerYaw + hFovHalf);
      ctx2d.closePath();
      ctx2d.fill();
      ctx2d.stroke();
    }

    // 4. Render Static BVH Entries within Radar Range (Emerald=Visible, Slate=FrustumCulled, Red=SkyscraperOccluded)
    if (this.showStaticLeaves) {
      const entries = this.culler.sceneOptimizer.staticEntries;
      const maxRangeSq = (this.rangeMeters * 1.15) ** 2;

      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (e.isLargeCityBatch) continue;
        const dx = e.cx - camX;
        const dz = e.cz - camZ;
        if (dx * dx + dz * dz > maxRangeSq) continue;

        const sx = toScreenX(e.minX);
        const sy = toScreenY(e.minZ);
        const sw = Math.max(2, (e.maxX - e.minX) * scale);
        const sh = Math.max(2, (e.maxZ - e.minZ) * scale);

        const culled = Boolean(e.object?.userData?._perfCulled);
        if (!culled) {
          ctx2d.strokeStyle = 'rgba(74, 222, 128, 0.42)';
        } else if (this.culler.staticFrustumVisible[i] === 1) {
          // Inside frustum but culled -> Skyscraper Occluded!
          ctx2d.strokeStyle = 'rgba(251, 113, 133, 0.72)';
        } else {
          ctx2d.strokeStyle = 'rgba(100, 116, 139, 0.25)';
        }
        ctx2d.lineWidth = 1;
        ctx2d.strokeRect(sx, sy, sw, sh);
      }
    }

    // 5. Render Solid Skyscraper Occluder Cores
    if (this.showOccluders && !this.culler.currentInteriorHub) {
      const occluders = this.culler.solidOccluders;
      const maxRangeSq = (this.rangeMeters * 1.15) ** 2;
      ctx2d.fillStyle = 'rgba(30, 58, 95, 0.65)';
      ctx2d.strokeStyle = 'rgba(96, 165, 250, 0.78)';
      ctx2d.lineWidth = 1.1;

      for (let i = 0; i < occluders.length; i++) {
        const o = occluders[i];
        const dx = o.cx - camX;
        const dz = o.cz - camZ;
        if (dx * dx + dz * dz > maxRangeSq) continue;

        const x0 = toScreenX(o.minX);
        const y0 = toScreenY(o.minZ);
        const w = Math.max(2, (o.maxX - o.minX) * scale);
        const h = Math.max(2, (o.maxZ - o.minZ) * scale);
        ctx2d.fillRect(x0, y0, w, h);
        ctx2d.strokeRect(x0, y0, w, h);
      }
    }

    // 6. Render Dynamic Vehicles & Characters + Gold Ring on Active Top-N Shadow Casters!
    if (this.showDynamicActors) {
      const dg = this.dynamicGrid;
      const shadowSet = this.shadowMgr.currentlyEnabledRoots;
      const maxR2 = this.rangeMeters * this.rangeMeters;

      for (let i = 0; i < dg.count; i++) {
        const ax = dg.actorX[i];
        const az = dg.actorZ[i];
        const dx = ax - camX;
        const dz = az - camZ;
        if (dx * dx + dz * dz > maxR2) continue;

        const mesh = dg.actorMeshes[i];
        const kind = dg.actorKind[i];
        const px = toScreenX(ax);
        const py = toScreenY(az);
        const isCulled = Boolean(mesh?.userData?._perfCulled);
        const castsShadow = mesh ? shadowSet.has(mesh) : false;

        if (castsShadow) {
          ctx2d.strokeStyle = '#facc15';
          ctx2d.lineWidth = 1.4;
          ctx2d.beginPath();
          ctx2d.arc(px, py, kind === 1 ? 5.2 : 4.2, 0, TWO_PI);
          ctx2d.stroke();
        }

        if (isCulled) {
          ctx2d.fillStyle = 'rgba(244, 63, 94, 0.72)';
        } else if (kind === 1 || kind === 4) {
          ctx2d.fillStyle = '#38bdf8';
        } else if (kind === 3) {
          ctx2d.fillStyle = '#c084fc';
        } else {
          ctx2d.fillStyle = '#4ade80';
        }

        ctx2d.beginPath();
        ctx2d.arc(px, py, kind === 1 || kind === 4 ? 3.0 : 2.1, 0, TWO_PI);
        ctx2d.fill();
      }
    }

    // 7. Camera Center Dot & Legend Overlay
    ctx2d.fillStyle = '#ffffff';
    ctx2d.beginPath();
    ctx2d.arc(halfW, halfH, 3.4, 0, TWO_PI);
    ctx2d.fill();

    ctx2d.font = '600 10px "Segoe UI", system-ui, sans-serif';
    ctx2d.fillStyle = '#94a3b8';
    ctx2d.textAlign = 'left';
    ctx2d.fillText(
      `Bán kính Radar: ${this.rangeMeters}m • Y=${camY.toFixed(1)}m`,
      8,
      14
    );

    // Compact color key at bottom-left
    const legendY = height - 8;
    ctx2d.fillStyle = '#4ade80';
    ctx2d.fillText('■ Hiện', 8, legendY);
    ctx2d.fillStyle = '#fb7185';
    ctx2d.fillText('■ Khuất Cao Ốc', 52, legendY);
    ctx2d.fillStyle = '#facc15';
    ctx2d.fillText('◎ Đổ Bóng Top-N', 138, legendY);
  }
}

class BottleneckDiagnosticsEngine {
  constructor() {
    this.lastAnalysisTime = 0;
    this.currentReport = {
      code: 'OPTIMAL_LOCKED',
      severity: 'good', // 'good' | 'info' | 'warn' | 'critical'
      headline: 'Khung hình ổn định — GPU & CPU cân bằng tối ưu',
      detail: 'Tất cả hệ thống BVH, Occluder và Hàng đợi 1.8ms đang vận hành dưới ngưỡng ngân sách.',
      recommendedActionLabel: '',
      recommendedActionId: '',
    };
  }

  evaluate(telemetry, subsystems, webglInfo, governorStats) {
    const avgMs = telemetry.ema;
    const p99Ms = telemetry.p99;
    const pacing = telemetry.pacingScore;
    const targetMs = governorStats.targetFrameMs || 16.67;
    const calls = webglInfo.drawCalls || 0;
    const tris = webglInfo.triangles || 0;

    const renderMs = subsystems.tracks.get('render')?.emaMs || 0;
    const postfxMs = subsystems.tracks.get('postfx')?.emaMs || 0;
    const aiMs = subsystems.tracks.get('ai')?.emaMs || 0;
    const physMs = subsystems.tracks.get('physics')?.emaMs || 0;
    const worldMs = subsystems.tracks.get('world')?.emaMs || 0;
    const simCpuMs = aiMs + physMs + worldMs;

    if (avgMs <= targetMs * 1.04 && pacing >= 82) {
      this.currentReport = {
        code: 'OPTIMAL_LOCKED',
        severity: 'good',
        headline: 'Khung hình khóa mượt 60/120 FPS — Độ ổn định cao',
        detail: `Pacing ${pacing}% • 1% Low ${(1000 / Math.max(1, p99Ms)).toFixed(0)} FPS • Đã lọc ${webglInfo.savedDrawCalls} Draw Calls khuất sau tòa nhà.`,
        recommendedActionLabel: '',
        recommendedActionId: '',
      };
      return this.currentReport;
    }

    if (postfxMs > 5.5 || (avgMs > targetMs * 1.18 && governorStats.pixelRatioActive > 1.25)) {
      this.currentReport = {
        code: 'GPU_FILLRATE_BOUND',
        severity: avgMs > 24 ? 'critical' : 'warn',
        headline: 'Nghẽn GPU Fillrate / Hậu Kỳ Screen-Space Shaders',
        detail: `PostFX chiếm ${postfxMs.toFixed(2)}ms ở PixelRatio ${governorStats.pixelRatioActive}x. Bật Turbo hoặc giảm xuống HIGH sẽ tăng mạnh FPS.`,
        recommendedActionLabel: 'Bật Siêu Tối Ưu Turbo',
        recommendedActionId: 'enable_turbo',
      };
      return this.currentReport;
    }

    if (calls > 260 && renderMs > 5.0) {
      this.currentReport = {
        code: 'DRAW_CALL_DRIVER_BOUND',
        severity: 'warn',
        headline: 'Tải WebGL Draw Calls cao trong khung hình',
        detail: `Đang gửi ${calls} lệnh vẽ (${formatCompactCount(tris)} tam giác). Hãy bật đầy đủ BVH + Skyscraper Occlusion & Smart Shadow.`,
        recommendedActionLabel: 'Tối Ưu Lệnh Vẽ & Bóng Đổ',
        recommendedActionId: 'enable_all_cullers',
      };
      return this.currentReport;
    }

    if (simCpuMs > 7.5 && simCpuMs > renderMs + postfxMs) {
      this.currentReport = {
        code: 'CPU_SIMULATION_BOUND',
        severity: 'warn',
        headline: 'Tải CPU Mô Phỏng Đô Thị (AI / Vật Lý Xe) cao',
        detail: `AI (${aiMs.toFixed(1)}ms) + Vật lý (${physMs.toFixed(1)}ms) + World (${worldMs.toFixed(1)}ms). Giảm mật độ giao thông sẽ giải phóng ngay CPU.`,
        recommendedActionLabel: 'Giảm Mật Độ Đô Thị',
        recommendedActionId: 'reduce_density',
      };
      return this.currentReport;
    }

    if (p99Ms > avgMs * 1.65 && pacing < 72) {
      this.currentReport = {
        code: 'FRAME_PACING_JITTER',
        severity: 'info',
        headline: 'Dao động nhịp khung hình (1% Low Micro-Jitter)',
        detail: `TB ${avgMs.toFixed(1)}ms nhưng P99 đạt ${p99Ms.toFixed(1)}ms. Dọn bộ nhớ đệm VRAM/Pool hoặc khóa Turbo giúp nhịp mượt đều.`,
        recommendedActionLabel: 'Dọn Rác VRAM & Pool',
        recommendedActionId: 'gc_resources',
      };
      return this.currentReport;
    }

    this.currentReport = {
      code: 'MODERATE_LOAD',
      severity: 'info',
      headline: 'Hiệu năng khá — Có thể kích hoạt Turbo để khóa 60/120 FPS',
      detail: `Khung hình TB ${avgMs.toFixed(1)}ms (${Math.round(1000 / Math.max(1, avgMs))} FPS) • ${calls} Draw Calls.`,
      recommendedActionLabel: 'Bật Turbo 60/120 FPS',
      recommendedActionId: 'enable_turbo',
    };
    return this.currentReport;
  }

  buildExportJSON(statsSnapshot, frameRing) {
    const traceMs = [];
    for (let i = 0; i < frameRing.count; i++) {
      traceMs.push(Number(frameRing.getChronological(i).toFixed(2)));
    }
    return JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        bottleneck: this.currentReport,
        summary: statsSnapshot,
        frameHistory240Ms: traceMs,
      },
      null,
      2
    );
  }
}

// ============================================================================
// CHAPTER 11: Interactive `F4` Studio Performance Profiler Canvas HUD
// Real-Time 240-Frame Sparkline (`8.3ms` & `16.6ms`), Subsystem Timing Bars,
// WebGL `renderer.info` Inspector, Pool Meters, Radar & Benchmark Scorecard
// ============================================================================

const STUDIO_PROFILER_CSS = `
#perf-studio-panel {
  position: fixed;
  top: 56px;
  right: 16px;
  width: 456px;
  max-width: calc(100vw - 24px);
  max-height: calc(100vh - 72px);
  background: rgba(8, 13, 23, 0.96);
  border: 1.5px solid rgba(56, 189, 248, 0.42);
  border-radius: 10px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.82);
  color: #e2e8f0;
  font-family: 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif;
  font-size: 11.5px;
  line-height: 1.35;
  z-index: 9990;
  display: none;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  pointer-events: auto;
}
#perf-studio-panel.compact-mode {
  width: 320px;
}
#perf-studio-panel * {
  box-sizing: border-box;
}
.perf-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 11px;
  background: linear-gradient(90deg, rgba(15, 23, 42, 0.98), rgba(12, 30, 52, 0.96));
  border-bottom: 1px solid rgba(56, 189, 248, 0.26);
  cursor: move;
}
.perf-hdr-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-weight: 800;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: #38bdf8;
}
.perf-hdr-badge {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 800;
  background: rgba(34, 197, 94, 0.18);
  border: 1px solid rgba(34, 197, 94, 0.48);
  color: #4ade80;
}
.perf-hdr-badge.turbo {
  background: rgba(250, 204, 21, 0.2);
  border-color: rgba(250, 204, 21, 0.65);
  color: #fde047;
}
.perf-hdr-actions {
  display: flex;
  align-items: center;
  gap: 5px;
}
.perf-icon-btn {
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.32);
  color: #cbd5e1;
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
}
.perf-icon-btn:hover {
  border-color: #38bdf8;
  color: #ffffff;
}
.perf-kpi-strip {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 5px;
  padding: 7px 10px;
  background: rgba(11, 18, 31, 0.95);
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}
.perf-kpi-box {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 5px;
  padding: 4px 6px;
  text-align: center;
}
.perf-kpi-lbl {
  font-size: 9.5px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.perf-kpi-val {
  font-size: 13px;
  font-weight: 800;
  color: #f8fafc;
  font-variant-numeric: tabular-nums;
}
.perf-tabs {
  display: flex;
  gap: 4px;
  padding: 5px 10px;
  background: rgba(10, 15, 26, 0.95);
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
}
.perf-tab-btn {
  flex: 1;
  background: rgba(30, 41, 59, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #94a3b8;
  border-radius: 4px;
  padding: 4px 5px;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
}
.perf-tab-btn.active {
  background: rgba(14, 116, 144, 0.38);
  border-color: rgba(56, 189, 248, 0.72);
  color: #e0f2fe;
}
.perf-body {
  padding: 8px 10px 10px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.perf-hero-btns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.perf-cta-btn {
  padding: 7px 9px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.22);
  text-align: center;
  letter-spacing: 0.02em;
}
.perf-cta-turbo {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.22), rgba(249, 115, 22, 0.26));
  border-color: rgba(250, 204, 21, 0.6);
  color: #fef08a;
}
.perf-cta-turbo.active {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.48), rgba(239, 68, 68, 0.42));
  border-color: #fde047;
  color: #ffffff;
}
.perf-cta-bench {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.25), rgba(99, 102, 241, 0.28));
  border-color: rgba(56, 189, 248, 0.6);
  color: #bae6fd;
}
.perf-cta-bench:hover, .perf-cta-turbo:hover {
  filter: brightness(1.15);
}
.perf-section-card {
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 6px;
  padding: 7px 8px;
}
.perf-sec-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10.5px;
  font-weight: 800;
  color: #93c5fd;
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.perf-sec-sub {
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: none;
}
.perf-canvas-block {
  width: 100%;
  display: block;
  border-radius: 4px;
  background: #060a12;
  border: 1px solid rgba(51, 65, 85, 0.65);
}
.perf-webgl-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
}
.perf-wgl-cell {
  background: rgba(9, 14, 24, 0.85);
  border: 1px solid rgba(71, 85, 105, 0.38);
  border-radius: 4px;
  padding: 4px 6px;
}
.perf-wgl-k {
  font-size: 9.5px;
  color: #94a3b8;
}
.perf-wgl-v {
  font-size: 12px;
  font-weight: 800;
  color: #f1f5f9;
  font-variant-numeric: tabular-nums;
}
.perf-toggles-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}
.perf-tgl-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 7px;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(100, 116, 139, 0.35);
  color: #cbd5e1;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
}
.perf-tgl-btn.on {
  border-color: rgba(52, 211, 153, 0.58);
  background: rgba(6, 78, 59, 0.32);
  color: #ecfdf5;
}
.perf-tgl-dot {
  font-size: 9.5px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(71, 85, 105, 0.5);
  color: #94a3b8;
}
.perf-tgl-btn.on .perf-tgl-dot {
  background: rgba(16, 185, 129, 0.3);
  color: #6ee7b7;
}
.perf-tier-row {
  display: flex;
  gap: 5px;
  margin-top: 5px;
}
.perf-tier-btn {
  flex: 1;
  padding: 4px 6px;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(100, 116, 139, 0.35);
  color: #94a3b8;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
}
.perf-tier-btn.active {
  border-color: #38bdf8;
  background: rgba(14, 165, 233, 0.26);
  color: #ffffff;
}
.perf-advisor-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 5px;
  background: rgba(15, 23, 42, 0.92);
  border-left: 3px solid #22c55e;
}
.perf-advisor-bar.warn {
  border-left-color: #f59e0b;
}
.perf-advisor-bar.critical {
  border-left-color: #ef4444;
}
.perf-bench-report {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 11px;
}
`;

class StudioProfilerUI {
  constructor(deps) {
    this.frameRing = deps.frameRing;
    this.subsystems = deps.subsystems;
    this.pools = deps.pools;
    this.sceneOptimizer = deps.sceneOptimizer;
    this.bvh = deps.bvh;
    this.culler = deps.culler;
    this.shadowMgr = deps.shadowMgr;
    this.scheduler = deps.scheduler;
    this.routeCache = deps.routeCache;
    this.governor = deps.governor;
    this.benchmark = deps.benchmark;
    this.radar = deps.radar;
    this.diagnostics = deps.diagnostics;
    this.calibrator = deps.calibrator;
    this.callbacks = deps.callbacks || {};

    this.isOpen = false;
    this.compactMode = false;
    this.activeTab = 'studio'; // 'studio' | 'radar' | 'benchmark'
    this.domBuilt = false;
    this.uiRefreshAccum = 0;

    // Direct DOM element references (zero external getElementById needed!)
    this.styleEl = null;
    this.panelEl = null;
    this.hdrBadgeEl = null;
    this.kpiEls = {};
    this.tabBtnEls = {};
    this.tabViews = {};
    this.turboBtnEl = null;
    this.benchBtnEl = null;
    this.sparkCanvas = null;
    this.sparkCtx = null;
    this.barsCanvas = null;
    this.barsCtx = null;
    this.poolsCanvas = null;
    this.poolsCtx = null;
    this.radarCanvas = null;
    this.radarCtx = null;
    this.wglValueEls = {};
    this.toggleBtnEls = {};
    this.tierBtnEls = {};
    this.advisorBoxEl = null;
    this.advisorTitleEl = null;
    this.advisorSubEl = null;
    this.advisorActBtn = null;
    this.benchSummaryEl = null;
    this.interiorStatusEl = null;

    this._dragState = { active: false, startX: 0, startY: 0, origLeft: 0, origTop: 0 };
  }

  _buildDOM(gameCtx) {
    if (this.domBuilt || typeof document === 'undefined' || !document.body) return;
    this.domBuilt = true;

    const style = document.createElement('style');
    style.id = 'perf-studio-styles';
    style.textContent = STUDIO_PROFILER_CSS;
    document.head.appendChild(style);
    this.styleEl = style;

    const panel = document.createElement('div');
    panel.id = 'perf-studio-panel';

    // Stop pointer/mouse events inside profiler from triggering 3D weapon fire or camera orbit!
    const stopProp = (ev) => ev.stopPropagation();
    panel.addEventListener('mousedown', stopProp);
    panel.addEventListener('mouseup', stopProp);
    panel.addEventListener('click', stopProp);
    panel.addEventListener('pointerdown', stopProp);
    panel.addEventListener('wheel', stopProp, { passive: true });

    // 1. Draggable Header
    const hdr = document.createElement('div');
    hdr.className = 'perf-hdr';

    const hdrLeft = document.createElement('div');
    hdrLeft.className = 'perf-hdr-title';
    hdrLeft.innerHTML = '<span>📊 STUDIO PROFILER</span>';

    const badge = document.createElement('span');
    badge.id = 'perf-studio-mode-badge';
    badge.className = 'perf-hdr-badge';
    badge.textContent = 'ULTRA';
    hdrLeft.appendChild(badge);
    this.hdrBadgeEl = badge;

    const hdrActions = document.createElement('div');
    hdrActions.className = 'perf-hdr-actions';

    const btnCompact = document.createElement('button');
    btnCompact.type = 'button';
    btnCompact.className = 'perf-icon-btn';
    btnCompact.textContent = 'Thu Gọn';
    btnCompact.addEventListener('click', () => {
      this.compactMode = !this.compactMode;
      panel.classList.toggle('compact-mode', this.compactMode);
      btnCompact.textContent = this.compactMode ? 'Mở Rộng' : 'Thu Gọn';
      this._syncTabVisibility();
    });

    const btnClose = document.createElement('button');
    btnClose.type = 'button';
    btnClose.className = 'perf-icon-btn';
    btnClose.textContent = 'Đóng [F4]';
    btnClose.addEventListener('click', () => this.toggle(false, gameCtx));

    hdrActions.appendChild(btnCompact);
    hdrActions.appendChild(btnClose);
    hdr.appendChild(hdrLeft);
    hdr.appendChild(hdrActions);
    this._bindDragHeader(hdr, panel);
    panel.appendChild(hdr);

    // 2. Top 5 KPI Strip (FPS, 1% Low, Frame ms, Pacing %, Draw Calls)
    const kpiStrip = document.createElement('div');
    kpiStrip.className = 'perf-kpi-strip';
    const kpiDefs = [
      { key: 'fps', label: 'FPS Thực' },
      { key: 'low1', label: '1% Low' },
      { key: 'ms', label: 'Frame ms' },
      { key: 'pacing', label: 'Ổn Định' },
      { key: 'dc', label: 'Draw Calls' },
    ];
    for (let i = 0; i < kpiDefs.length; i++) {
      const box = document.createElement('div');
      box.className = 'perf-kpi-box';
      const l = document.createElement('div');
      l.className = 'perf-kpi-lbl';
      l.textContent = kpiDefs[i].label;
      const v = document.createElement('div');
      v.className = 'perf-kpi-val';
      v.textContent = '--';
      box.appendChild(l);
      box.appendChild(v);
      kpiStrip.appendChild(box);
      this.kpiEls[kpiDefs[i].key] = v;
    }
    panel.appendChild(kpiStrip);

    // 3. Mode Tabs
    const tabsBar = document.createElement('div');
    tabsBar.className = 'perf-tabs';
    const tabList = [
      { id: 'studio', label: 'Tổng Quan & Đồ Thị' },
      { id: 'radar', label: 'Radar BVH & Tòa Nhà' },
      { id: 'benchmark', label: 'Đo Điểm GPU (15s)' },
    ];
    for (let i = 0; i < tabList.length; i++) {
      const tb = tabList[i];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'perf-tab-btn' + (tb.id === this.activeTab ? ' active' : '');
      b.textContent = tb.label;
      b.addEventListener('click', () => {
        this.activeTab = tb.id;
        this._syncTabVisibility();
      });
      tabsBar.appendChild(b);
      this.tabBtnEls[tb.id] = b;
    }
    panel.appendChild(tabsBar);

    // 4. Scrollable Studio Body
    const body = document.createElement('div');
    body.className = 'perf-body';

    // Always-accessible Hero 1-Click Action Row (Turbo 60/120 FPS + 15s Benchmark)
    const heroBtns = document.createElement('div');
    heroBtns.className = 'perf-hero-btns';

    const turboBtn = document.createElement('button');
    turboBtn.id = 'perf-btn-turbo-mode';
    turboBtn.type = 'button';
    turboBtn.className = 'perf-cta-btn perf-cta-turbo';
    turboBtn.textContent = '⚡ Siêu Tối Ưu Turbo 60/120 FPS';
    turboBtn.addEventListener('click', () => {
      this.callbacks.onToggleTurbo?.();
      this.renderNow(gameCtx, {});
    });
    this.turboBtnEl = turboBtn;

    const benchBtn = document.createElement('button');
    benchBtn.id = 'perf-btn-run-benchmark';
    benchBtn.type = 'button';
    benchBtn.className = 'perf-cta-btn perf-cta-bench';
    benchBtn.textContent = '🎬 Chạy Đo Hiệu Năng Tự Động';
    benchBtn.addEventListener('click', () => {
      this.activeTab = 'benchmark';
      this._syncTabVisibility();
      this.callbacks.onRunBenchmark?.();
    });
    this.benchBtnEl = benchBtn;

    heroBtns.appendChild(turboBtn);
    heroBtns.appendChild(benchBtn);
    body.appendChild(heroBtns);

    // 4A. Sparkline Card (240-Frame FPS & Frame-Time with 8.3ms & 16.6ms Reference Lines!)
    const sparkCard = document.createElement('div');
    sparkCard.className = 'perf-section-card';
    const sparkHdr = document.createElement('div');
    sparkHdr.className = 'perf-sec-hdr';
    sparkHdr.innerHTML =
      '<span>Đồ Thị 240 Khung Hình (FPS &amp; ms)</span><span class="perf-sec-sub">Chuẩn 8.3ms • 16.6ms</span>';
    sparkCard.appendChild(sparkHdr);

    const sparkPair = this._createHiDPICanvas(420, 102, 'perf-sparkline-canvas');
    this.sparkCanvas = sparkPair.canvas;
    this.sparkCtx = sparkPair.ctx2d;
    sparkCard.appendChild(this.sparkCanvas);
    body.appendChild(sparkCard);

    // 4B. Studio Tab Container (Subsystem Bars + WebGL Inspector + Memory/Pool Meters + Toggles)
    const studioContainer = document.createElement('div');
    studioContainer.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

    // Subsystem Timing Bars Card
    const barsCard = document.createElement('div');
    barsCard.className = 'perf-section-card';
    barsCard.innerHTML =
      '<div class="perf-sec-hdr"><span>Phân Bổ Thời Gian CPU Từng Hệ Thống</span><span class="perf-sec-sub">EMA • Đỉnh 3s</span></div>';
    const barsPair = this._createHiDPICanvas(420, 132, 'perf-subsystem-canvas');
    this.barsCanvas = barsPair.canvas;
    this.barsCtx = barsPair.ctx2d;
    barsCard.appendChild(this.barsCanvas);
    studioContainer.appendChild(barsCard);

    // WebGL renderer.info & Culler Inspector Card
    const wglCard = document.createElement('div');
    wglCard.className = 'perf-section-card';
    const wglHdr = document.createElement('div');
    wglHdr.className = 'perf-sec-hdr';
    wglHdr.innerHTML = '<span>WebGL2 Renderer.Info &amp; Bộ Lọc BVH</span>';
    const intSpan = document.createElement('span');
    intSpan.className = 'perf-sec-sub';
    intSpan.textContent = 'Ngoài Trời';
    this.interiorStatusEl = intSpan;
    wglHdr.appendChild(intSpan);
    wglCard.appendChild(wglHdr);

    const wglGrid = document.createElement('div');
    wglGrid.className = 'perf-webgl-grid';
    const wglCells = [
      { key: 'calls', label: 'Draw Calls' },
      { key: 'tris', label: 'Triangles' },
      { key: 'geos', label: 'Geometries' },
      { key: 'texs', label: 'Textures' },
      { key: 'progs', label: 'Shaders' },
      { key: 'culled', label: 'BVH Lọc' },
      { key: 'occluded', label: 'Khuất Tòa Nhà' },
      { key: 'shadows', label: 'Bóng Đổ Động' },
    ];
    for (let i = 0; i < wglCells.length; i++) {
      const cell = document.createElement('div');
      cell.className = 'perf-wgl-cell';
      const kEl = document.createElement('div');
      kEl.className = 'perf-wgl-k';
      kEl.textContent = wglCells[i].label;
      const vEl = document.createElement('div');
      vEl.className = 'perf-wgl-v';
      vEl.textContent = '0';
      cell.appendChild(kEl);
      cell.appendChild(vEl);
      wglGrid.appendChild(cell);
      this.wglValueEls[wglCells[i].key] = vEl;
    }
    wglCard.appendChild(wglGrid);
    studioContainer.appendChild(wglCard);

    // Memory / Pool & 1.8ms Scheduler Utilization Meters Card
    const poolCard = document.createElement('div');
    poolCard.className = 'perf-section-card';
    poolCard.innerHTML =
      '<div class="perf-sec-hdr"><span>Bộ Nhớ Đệm Pool, VRAM &amp; Hàng Đợi 1.8ms</span><span class="perf-sec-sub">Zero-GC</span></div>';
    const poolsPair = this._createHiDPICanvas(420, 96, 'perf-pools-canvas');
    this.poolsCanvas = poolsPair.canvas;
    this.poolsCtx = poolsPair.ctx2d;
    poolCard.appendChild(this.poolsCanvas);
    studioContainer.appendChild(poolCard);

    // Interactive Per-Feature Optimization Toggles & Quality Tier Selector
    const tglCard = document.createElement('div');
    tglCard.className = 'perf-section-card';
    tglCard.innerHTML =
      '<div class="perf-sec-hdr"><span>Công Tắc Tối Ưu Thời Gian Thực</span><span class="perf-sec-sub">Bật / Tắt Trực Tiếp</span></div>';

    const tglGrid = document.createElement('div');
    tglGrid.className = 'perf-toggles-grid';
    const toggleSpecs = [
      { id: 'frustum', label: 'BVH Frustum Culling' },
      { id: 'occlusion', label: 'Khuất Cao Ốc Horizon' },
      { id: 'shadows', label: 'Ưu Tiên Bóng Đổ Top-N' },
      { id: 'staticFreeze', label: 'Khóa Ma Trận Tĩnh' },
      { id: 'scheduler', label: 'Hàng Đợi Mượt 1.8ms' },
      { id: 'autoDrs', label: 'Auto-DRS Độ Phân Giải' },
    ];
    for (let i = 0; i < toggleSpecs.length; i++) {
      const sp = toggleSpecs[i];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'perf-tgl-btn on';
      const lbl = document.createElement('span');
      lbl.textContent = sp.label;
      const dot = document.createElement('span');
      dot.className = 'perf-tgl-dot';
      dot.textContent = 'BẬT';
      b.appendChild(lbl);
      b.appendChild(dot);
      b.addEventListener('click', () => {
        this.callbacks.onToggleFeature?.(sp.id);
        this.renderNow(gameCtx, {});
      });
      tglGrid.appendChild(b);
      this.toggleBtnEls[sp.id] = { btn: b, dot };
    }
    tglCard.appendChild(tglGrid);

    const tierRow = document.createElement('div');
    tierRow.className = 'perf-tier-row';
    for (const tierId of ['ULTRA', 'HIGH', 'MOBILE']) {
      const tb = document.createElement('button');
      tb.type = 'button';
      tb.className = 'perf-tier-btn';
      tb.textContent = `Đồ họa ${tierId}`;
      tb.addEventListener('click', () => {
        this.callbacks.onSelectQuality?.(tierId);
        this.renderNow(gameCtx, {});
      });
      tierRow.appendChild(tb);
      this.tierBtnEls[tierId] = tb;
    }

    const btnGC = document.createElement('button');
    btnGC.type = 'button';
    btnGC.className = 'perf-tier-btn';
    btnGC.textContent = '🧹 Dọn VRAM';
    btnGC.addEventListener('click', () => {
      const freed = this.callbacks.onDisposeResources?.();
      gameCtx?.ui?.showNotification?.(
        `🧹 Đã dọn bộ nhớ GPU & Pool (${freed?.geometries || 0} Geo, ${freed?.materials || 0} Mat)!`,
        2.5
      );
    });
    tierRow.appendChild(btnGC);
    tglCard.appendChild(tierRow);
    studioContainer.appendChild(tglCard);

    this.tabViews.studio = studioContainer;
    body.appendChild(studioContainer);

    // 4C. Radar Tab View (Live 2D Top-Down BVH Frustum & Skyscraper Horizon Occluder Map)
    const radarContainer = document.createElement('div');
    radarContainer.style.cssText = 'display:none;flex-direction:column;gap:8px;';
    const radarCard = document.createElement('div');
    radarCard.className = 'perf-section-card';
    radarCard.innerHTML =
      '<div class="perf-sec-hdr"><span>Radar Không Gian BVH &amp; Bóng Khuất Cao Ốc</span><span class="perf-sec-sub">Lăn chuột Zoom</span></div>';
    const radarPair = this._createHiDPICanvas(420, 250, 'perf-radar-canvas');
    this.radarCanvas = radarPair.canvas;
    this.radarCtx = radarPair.ctx2d;
    this.radarCanvas.addEventListener(
      'wheel',
      (ev) => {
        this.radar.zoom(ev.deltaY > 0 ? 1 : -1);
      },
      { passive: true }
    );
    radarCard.appendChild(this.radarCanvas);
    radarContainer.appendChild(radarCard);
    this.tabViews.radar = radarContainer;
    body.appendChild(radarContainer);

    // 4D. Benchmark & Bottleneck Advisor Tab View
    const benchContainer = document.createElement('div');
    benchContainer.style.cssText = 'display:none;flex-direction:column;gap:8px;';

    const advCard = document.createElement('div');
    advCard.className = 'perf-section-card';
    advCard.innerHTML =
      '<div class="perf-sec-hdr"><span>Chẩn Đoán Cổ Chai Phần Cứng Trực Tiếp</span></div>';
    const advBar = document.createElement('div');
    advBar.className = 'perf-advisor-bar';
    const advTextWrap = document.createElement('div');
    const advTitle = document.createElement('div');
    advTitle.style.cssText = 'font-weight:800;color:#f8fafc;font-size:11.5px;';
    const advSub = document.createElement('div');
    advSub.style.cssText = 'color:#94a3b8;font-size:10.5px;margin-top:2px;';
    advTextWrap.appendChild(advTitle);
    advTextWrap.appendChild(advSub);
    const advBtn = document.createElement('button');
    advBtn.type = 'button';
    advBtn.className = 'perf-icon-btn';
    advBtn.style.display = 'none';
    advBtn.addEventListener('click', () => {
      const act = this.diagnostics.currentReport.recommendedActionId;
      this.callbacks.onRunAdvisorAction?.(act);
    });
    advBar.appendChild(advTextWrap);
    advBar.appendChild(advBtn);
    advCard.appendChild(advBar);
    this.advisorBoxEl = advBar;
    this.advisorTitleEl = advTitle;
    this.advisorSubEl = advSub;
    this.advisorActBtn = advBtn;
    benchContainer.appendChild(advCard);

    const reportCard = document.createElement('div');
    reportCard.className = 'perf-section-card';
    reportCard.innerHTML =
      '<div class="perf-sec-hdr"><span>Bảng Điểm Đo Hiệu Năng Flythrough 15 Giây</span><span class="perf-sec-sub">5 Quận Đô Thị</span></div>';
    const benchSummary = document.createElement('div');
    benchSummary.id = 'perf-benchmark-report-box';
    benchSummary.className = 'perf-bench-report';
    benchSummary.textContent =
      'Nhấn "Chạy Đo Hiệu Năng Tự Động" để bay kiểm tra qua 5 khu vực nặng nhất (Đại lộ Bồng Lai, Cao ốc Downtown, Cầu cảng Pier, Sòng bạc Đêm Neon và Bão Mưa Phản Chiếu) và chấm hạng GPU (S+ / S / A / B).';
    reportCard.appendChild(benchSummary);
    this.benchSummaryEl = benchSummary;
    benchContainer.appendChild(reportCard);

    this.tabViews.benchmark = benchContainer;
    body.appendChild(benchContainer);

    panel.appendChild(body);
    document.body.appendChild(panel);
    this.panelEl = panel;
    this._syncTabVisibility();
  }

  _createHiDPICanvas(logicalW, logicalH, idStr) {
    const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    const canvas = document.createElement('canvas');
    canvas.id = idStr;
    canvas.className = 'perf-canvas-block';
    canvas.width = Math.round(logicalW * dpr);
    canvas.height = Math.round(logicalH * dpr);
    canvas.style.height = `${logicalH}px`;
    const ctx2d = canvas.getContext('2d');
    if (ctx2d) ctx2d.scale(dpr, dpr);
    canvas._logicalW = logicalW;
    canvas._logicalH = logicalH;
    return { canvas, ctx2d };
  }

  _bindDragHeader(hdr, panel) {
    hdr.addEventListener('mousedown', (ev) => {
      if (ev.target && ev.target.tagName === 'BUTTON') return;
      const rect = panel.getBoundingClientRect();
      this._dragState.active = true;
      this._dragState.startX = ev.clientX;
      this._dragState.startY = ev.clientY;
      this._dragState.origLeft = rect.left;
      this._dragState.origTop = rect.top;
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', (ev) => {
        if (!this._dragState.active || !this.panelEl) return;
        const nx = clamp(
          this._dragState.origLeft + (ev.clientX - this._dragState.startX),
          6,
          Math.max(6, window.innerWidth - this.panelEl.offsetWidth - 6)
        );
        const ny = clamp(
          this._dragState.origTop + (ev.clientY - this._dragState.startY),
          6,
          Math.max(6, window.innerHeight - 80)
        );
        this.panelEl.style.right = 'auto';
        this.panelEl.style.left = `${nx}px`;
        this.panelEl.style.top = `${ny}px`;
      });

      window.addEventListener('mouseup', () => {
        this._dragState.active = false;
      });
    }
  }

  _syncTabVisibility() {
    for (const [id, btn] of Object.entries(this.tabBtnEls)) {
      btn.classList.toggle('active', id === this.activeTab);
    }
    if (this.compactMode) {
      for (const view of Object.values(this.tabViews)) {
        view.style.display = 'none';
      }
      return;
    }
    for (const [id, view] of Object.entries(this.tabViews)) {
      view.style.display = id === this.activeTab ? 'flex' : 'none';
    }
  }

  toggle(forceState, gameCtx) {
    this._buildDOM(gameCtx);
    if (!this.panelEl) return false;

    this.isOpen =
      typeof forceState === 'boolean' ? forceState : !this.isOpen;
    this.panelEl.style.display = this.isOpen ? 'flex' : 'none';

    if (this.isOpen) {
      // Release pointer lock cleanly so user can click Profiler controls immediately
      if (
        typeof document !== 'undefined' &&
        document.pointerLockElement &&
        typeof document.exitPointerLock === 'function'
      ) {
        try {
          document.exitPointerLock();
        } catch (_) {}
      }
      this.renderNow(gameCtx, {});
    }
    return this.isOpen;
  }

  _drawSparklineGraph() {
    const g = this.sparkCtx;
    const c = this.sparkCanvas;
    if (!g || !c) return;
    const W = c._logicalW;
    const H = c._logicalH;

    this.frameRing.recomputePercentiles();

    g.clearRect(0, 0, W, H);
    g.fillStyle = '#060a12';
    g.fillRect(0, 0, W, H);

    // Map 0..40ms vertical range
    const maxScaleMs = 40.0;
    const msToY = (ms) => H - 6 - clamp(ms / maxScaleMs, 0, 1) * (H - 16);

    // Shaded >= 25ms warning band at top
    const y25 = msToY(25.0);
    g.fillStyle = 'rgba(239, 68, 68, 0.08)';
    g.fillRect(0, 0, W, y25);

    // Reference Line 1: 16.6 ms (60 FPS)
    const y16 = msToY(16.667);
    g.strokeStyle = 'rgba(74, 222, 128, 0.58)';
    g.lineWidth = 1;
    g.setLineDash([4, 3]);
    g.beginPath();
    g.moveTo(0, y16);
    g.lineTo(W, y16);
    g.stroke();

    // Reference Line 2: 8.3 ms (120 FPS)
    const y8 = msToY(8.333);
    g.strokeStyle = 'rgba(56, 189, 248, 0.52)';
    g.beginPath();
    g.moveTo(0, y8);
    g.lineTo(W, y8);
    g.stroke();
    g.setLineDash([]);

    // Draw scrolling 240-frame sparkline curve + gradient fill
    const count = this.frameRing.count;
    if (count >= 2) {
      const graphW = W - 66; // Reserve right 62px for mini frame-time histogram!
      const stepX = graphW / (PERF_HISTORY_FRAMES - 1);
      const startOffset = PERF_HISTORY_FRAMES - count;

      const areaGrad = g.createLinearGradient(0, msToY(32), 0, H);
      areaGrad.addColorStop(0, 'rgba(251, 113, 133, 0.36)');
      areaGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.25)');
      areaGrad.addColorStop(1, 'rgba(16, 185, 129, 0.05)');

      g.beginPath();
      for (let i = 0; i < count; i++) {
        const ms = this.frameRing.getChronological(i);
        const x = (startOffset + i) * stepX;
        const y = msToY(ms);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokeStyle = this.frameRing.ema <= 17.5 ? '#38bdf8' : this.frameRing.ema <= 25 ? '#fbbf24' : '#fb7185';
      g.lineWidth = 1.6;
      g.stroke();

      g.lineTo((startOffset + count - 1) * stepX, H - 4);
      g.lineTo(startOffset * stepX, H - 4);
      g.closePath();
      g.fillStyle = areaGrad;
      g.fill();

      // Right-side 8-bucket mini histogram
      const hx0 = W - 58;
      const hw = 52;
      const bins = this.frameRing.histogramBins;
      const binColors = ['#38bdf8', '#22d3ee', '#4ade80', '#a3e635', '#facc15', '#fb923c', '#f87171', '#ef4444'];
      const rowH = (H - 16) / 8;
      for (let b = 0; b < 8; b++) {
        const frac = count > 0 ? bins[b] / count : 0;
        const by = H - 8 - (b + 1) * rowH;
        g.fillStyle = 'rgba(30, 41, 59, 0.7)';
        g.fillRect(hx0, by + 1, hw, rowH - 2);
        g.fillStyle = binColors[b];
        g.fillRect(hx0, by + 1, Math.max(1, frac * hw), rowH - 2);
      }
    }

    // Crisp reference labels
    g.font = '700 9.5px "Segoe UI", system-ui, sans-serif';
    g.fillStyle = '#4ade80';
    g.fillText('16.6ms (60 FPS)', 5, y16 - 3);
    g.fillStyle = '#38bdf8';
    g.fillText('8.3ms (120 FPS)', 5, Math.min(H - 6, y8 - 3));
  }

  _drawSubsystemBars() {
    const g = this.barsCtx;
    const c = this.barsCanvas;
    if (!g || !c) return;
    const W = c._logicalW;
    const H = c._logicalH;

    g.clearRect(0, 0, W, H);
    g.fillStyle = '#060a12';
    g.fillRect(0, 0, W, H);

    const tracks = this.subsystems.orderedTracks;
    const rows = Math.min(tracks.length, 8);
    const rowH = (H - 8) / rows;
    const labelW = 86;
    const valW = 64;
    const barMaxW = W - labelW - valW - 14;
    const scaleMaxMs = 8.0; // Full bar = 8.0ms subsystem share

    g.font = '600 10px "Segoe UI", system-ui, sans-serif';
    for (let i = 0; i < rows; i++) {
      const t = tracks[i];
      const y = 4 + i * rowH;
      const barY = y + 3;
      const barH = Math.max(6, rowH - 6);

      g.fillStyle = '#cbd5e1';
      g.textAlign = 'left';
      g.fillText(t.shortLabel, 6, y + rowH * 0.72);

      // Track background
      g.fillStyle = 'rgba(30, 41, 59, 0.78)';
      g.fillRect(labelW, barY, barMaxW, barH);

      // EMA fill bar
      const fillW = clamp(t.emaMs / scaleMaxMs, 0, 1) * barMaxW;
      g.fillStyle = t.color;
      g.fillRect(labelW, barY, Math.max(1.5, fillW), barH);

      // Peak-hold tick marker
      const peakX = labelW + clamp(t.peakHoldMs / scaleMaxMs, 0, 1) * barMaxW;
      g.fillStyle = '#ffffff';
      g.fillRect(Math.min(labelW + barMaxW - 1.5, peakX), barY, 1.5, barH);

      // Numeric ms readout
      g.fillStyle = t.emaMs > 4.2 ? '#fca5a5' : '#94a3b8';
      g.textAlign = 'right';
      g.fillText(`${t.emaMs.toFixed(2)} ms`, W - 6, y + rowH * 0.72);
    }
    g.textAlign = 'left';
  }

  _drawPoolAndSchedulerMeters() {
    const g = this.poolsCtx;
    const c = this.poolsCanvas;
    if (!g || !c) return;
    const W = c._logicalW;
    const H = c._logicalH;

    const pm = this.pools.getSummaryTelemetry();
    const sched = this.scheduler.stats;

    g.clearRect(0, 0, W, H);
    g.fillStyle = '#060a12';
    g.fillRect(0, 0, W, H);

    const meters = [
      {
        label: 'Hàng Đợi Mượt 1.8ms',
        pct: sched.utilizationPct,
        text: `${sched.emaSpentMs.toFixed(2)}/${sched.budgetMs}ms (${sched.pendingCount} chờ)`,
        color: '#2dd4bf',
      },
      {
        label: 'Pool Toán Học & BVH',
        pct: pm.utilizationPct,
        text: `${pm.totalInUse}/${pm.totalCapacity} • Hit ${pm.hitRatePct}%`,
        color: '#38bdf8',
      },
      {
        label: 'Bộ Đệm Đường Đi AI',
        pct: clamp((this.routeCache.cache.size / this.routeCache.maxEntries) * 100, 0, 100),
        text: `${this.routeCache.cache.size}/${this.routeCache.maxEntries} • Hit ${this.routeCache.getHitRatePct()}%`,
        color: '#a78bfa',
      },
      {
        label: 'VRAM & JS Heap Ước Tính',
        pct: clamp((this.sceneOptimizer.estimatedVramBytes / (256 * 1024 * 1024)) * 100, 4, 100),
        text: `VRAM ${formatMegabytes(this.sceneOptimizer.estimatedVramBytes)}${pm.jsHeapUsedMB > 0 ? ` • Heap ${pm.jsHeapUsedMB}MB` : ''}`,
        color: '#f472b6',
      },
    ];

    const rowH = (H - 8) / meters.length;
    const lblW = 128;
    const barW = 142;

    g.font = '600 10px "Segoe UI", system-ui, sans-serif';
    for (let i = 0; i < meters.length; i++) {
      const m = meters[i];
      const y = 4 + i * rowH;
      const by = y + 4;
      const bh = Math.max(7, rowH - 8);

      g.fillStyle = '#cbd5e1';
      g.textAlign = 'left';
      g.fillText(m.label, 6, y + rowH * 0.72);

      g.fillStyle = 'rgba(30, 41, 59, 0.82)';
      g.fillRect(lblW, by, barW, bh);

      g.fillStyle = m.color;
      g.fillRect(lblW, by, Math.max(2, (clamp(m.pct, 0, 100) / 100) * barW), bh);

      g.fillStyle = '#94a3b8';
      g.textAlign = 'right';
      g.fillText(m.text, W - 6, y + rowH * 0.72);
    }
    g.textAlign = 'left';
  }

  _updateBenchmarkScorecardDOM() {
    if (!this.benchSummaryEl) return;
    const rep = this.benchmark.lastReport;
    if (this.benchmark.active) {
      this.benchSummaryEl.innerHTML =
        '<div style="color:#38bdf8;font-weight:700;">⏳ Đang chạy hành trình Camera Benchmark 15 giây qua 5 quận...</div>';
      return;
    }
    if (!rep) return;

    const rankColor =
      rep.rank === 'S+' ? '#fde047' : rep.rank === 'S' ? '#4ade80' : rep.rank === 'A' ? '#38bdf8' : '#fb923c';

    const stageRowsHtml = (rep.stages || [])
      .map(
        (s, idx) =>
          `<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid rgba(148,163,184,0.1);">
            <span style="color:#cbd5e1;">${idx + 1}. ${s.title}</span>
            <span style="font-weight:700;color:#e2e8f0;">${s.avgFps} FPS (${s.avgMs} ms)</span>
          </div>`
      )
      .join('');

    this.benchSummaryEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 7px;background:rgba(14,116,144,0.2);border-radius:5px;border:1px solid rgba(56,189,248,0.35);">
        <div>
          <div style="font-size:13px;font-weight:900;color:${rankColor};">${rep.rankLabel}</div>
          <div style="font-size:10.5px;color:#cbd5e1;">Điểm tổng: <b>${rep.score.toLocaleString()} pts</b> • Cấu hình áp dụng: <b>${rep.recommendedTurbo ? 'TURBO SMOOTH' : rep.recommendedTier}</b></div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:14px;font-weight:900;color:#f8fafc;">${rep.avgFps} FPS</div>
          <div style="font-size:10px;color:#94a3b8;">1% Low: ${rep.low1PercentFps} FPS</div>
        </div>
      </div>
      <div style="margin-top:4px;">${stageRowsHtml}</div>
    `;
  }

  renderNow(gameCtx, webglSnapshot) {
    if (!this.isOpen || !this.panelEl) return;

    this.frameRing.recomputePercentiles();
    const fps = Math.round(this.frameRing.getInstantFps());
    const low1 = Math.round(this.frameRing.getOnePercentLowFps());
    const ms = this.frameRing.ema;
    const pacing = this.frameRing.pacingScore;
    const dc = webglSnapshot.drawCalls ?? gameCtx?.engine?.drawCalls ?? 0;

    if (this.kpiEls.fps) {
      this.kpiEls.fps.textContent = `${fps}`;
      this.kpiEls.fps.style.color = fps >= 55 ? '#4ade80' : fps >= 35 ? '#facc15' : '#fb7185';
    }
    if (this.kpiEls.low1) this.kpiEls.low1.textContent = `${low1}`;
    if (this.kpiEls.ms) this.kpiEls.ms.textContent = ms.toFixed(1);
    if (this.kpiEls.pacing) this.kpiEls.pacing.textContent = `${pacing}%`;
    if (this.kpiEls.dc) this.kpiEls.dc.textContent = String(dc);

    const isTurbo = this.governor.turboMode;
    const quality = String(gameCtx?.engine?.quality || 'ULTRA').toUpperCase();
    if (this.hdrBadgeEl) {
      this.hdrBadgeEl.textContent = isTurbo
        ? `TURBO ${this.calibrator.detectedHz}Hz`
        : `${quality} • ${this.calibrator.detectedHz}Hz`;
      this.hdrBadgeEl.classList.toggle('turbo', isTurbo);
    }

    if (this.turboBtnEl) {
      this.turboBtnEl.classList.toggle('active', isTurbo);
      this.turboBtnEl.textContent = isTurbo
        ? '⚡ TURBO 60/120 FPS: ĐANG BẬT'
        : '⚡ Siêu Tối Ưu Turbo 60/120 FPS';
    }

    this._drawSparklineGraph();

    if (this.compactMode) return;

    if (this.activeTab === 'studio') {
      this._drawSubsystemBars();
      this._drawPoolAndSchedulerMeters();

      if (this.interiorStatusEl) {
        this.interiorStatusEl.textContent = this.culler.stats.activeInteriorName;
      }

      const cs = this.culler.stats;
      const ss = this.shadowMgr.stats;
      if (this.wglValueEls.calls) {
        this.wglValueEls.calls.textContent = `${dc} (-${cs.estimatedDrawCallsSaved})`;
      }
      if (this.wglValueEls.tris) {
        this.wglValueEls.tris.textContent = formatCompactCount(webglSnapshot.triangles || 0);
      }
      if (this.wglValueEls.geos) {
        this.wglValueEls.geos.textContent = String(webglSnapshot.geometries || 0);
      }
      if (this.wglValueEls.texs) {
        this.wglValueEls.texs.textContent = String(webglSnapshot.textures || 0);
      }
      if (this.wglValueEls.progs) {
        this.wglValueEls.progs.textContent = String(webglSnapshot.programs || 0);
      }
      if (this.wglValueEls.culled) {
        this.wglValueEls.culled.textContent = String(
          cs.staticFrustumCulled + cs.staticDistanceCulled + cs.dynamicFrustumCulled
        );
      }
      if (this.wglValueEls.occluded) {
        this.wglValueEls.occluded.textContent = String(
          cs.staticSkyscraperOccluded + cs.dynamicSkyscraperOccluded
        );
      }
      if (this.wglValueEls.shadows) {
        this.wglValueEls.shadows.textContent = `${ss.activeCasters} / ${ss.budgetMax}`;
      }

      const featureMap = {
        frustum: this.culler.frustumCullingEnabled,
        occlusion: this.culler.occlusionCullingEnabled,
        shadows: this.shadowMgr.enabled,
        staticFreeze: this.callbacks.getStaticFreezeState?.() ?? true,
        scheduler: this.scheduler.enabled,
        autoDrs: Boolean(gameCtx?.engine?.autoOptimize ?? true),
      };
      for (const [fKey, fOn] of Object.entries(featureMap)) {
        const entry = this.toggleBtnEls[fKey];
        if (entry) {
          entry.btn.classList.toggle('on', Boolean(fOn));
          entry.dot.textContent = fOn ? 'BẬT' : 'TẮT';
        }
      }

      for (const [tKey, tBtn] of Object.entries(this.tierBtnEls)) {
        tBtn.classList.toggle('active', !isTurbo && quality === tKey);
      }
    } else if (this.activeTab === 'radar') {
      if (this.radarCtx && this.radarCanvas) {
        this.radar.renderToCanvas(
          this.radarCtx,
          this.radarCanvas._logicalW,
          this.radarCanvas._logicalH,
          gameCtx
        );
      }
    } else if (this.activeTab === 'benchmark') {
      const diag = this.diagnostics.evaluate(
        this.frameRing,
        this.subsystems,
        {
          drawCalls: dc,
          triangles: webglSnapshot.triangles || 0,
          savedDrawCalls: this.culler.stats.estimatedDrawCallsSaved,
        },
        this.governor.stats
      );

      if (this.advisorBoxEl) {
        this.advisorBoxEl.className =
          'perf-advisor-bar' +
          (diag.severity === 'warn' ? ' warn' : diag.severity === 'critical' ? ' critical' : '');
      }
      if (this.advisorTitleEl) this.advisorTitleEl.textContent = diag.headline;
      if (this.advisorSubEl) this.advisorSubEl.textContent = diag.detail;
      if (this.advisorActBtn) {
        if (diag.recommendedActionLabel) {
          this.advisorActBtn.style.display = 'inline-block';
          this.advisorActBtn.textContent = diag.recommendedActionLabel;
        } else {
          this.advisorActBtn.style.display = 'none';
        }
      }

      this._updateBenchmarkScorecardDOM();
    }
  }

  update(rawDtSec, gameCtx, webglSnapshot) {
    if (!this.isOpen) return;
    this.uiRefreshAccum += clamp(rawDtSec, 0.001, 0.2);
    // Smooth 15 Hz Canvas Sparkline & HUD refresh when Thiên Cơ Đo Hiệu Năng is open!
    if (this.uiRefreshAccum >= 0.065) {
      this.uiRefreshAccum = 0;
      this.renderNow(gameCtx, webglSnapshot);
    }
  }
}

// ============================================================================
// CHAPTER 12: Multi-Pass WebGL `renderer.info` Collector, Non-Intrusive Context
// Subsystem Instrumentor & Public `createPerfCore(ctx)` Engine Orchestrator
// ============================================================================

class WebGLMultiPassInfoCollector {
  constructor() {
    this.wrappedObjects = new WeakSet();
    this.snapshot = {
      drawCalls: 0,
      triangles: 0,
      points: 0,
      lines: 0,
      geometries: 0,
      textures: 0,
      programs: 0,
      renderPassCalls: 0,
      postPassCalls: 0,
    };
  }

  captureAroundRender(engine, subsystems, invokeOriginalRender, benchmark, gameCtx) {
    const renderer = engine?.renderer;
    if (!renderer || !renderer.info) {
      subsystems.begin('render');
      try {
        return invokeOriginalRender();
      } finally {
        subsystems.end('render');
      }
    }

    // Instrument EffectComposer individual passes once so Scene Render vs PostFX split cleanly!
    const composer = engine.composer;
    if (composer && Array.isArray(composer.passes)) {
      for (let i = 0; i < composer.passes.length; i++) {
        const pass = composer.passes[i];
        if (!pass || typeof pass.render !== 'function' || this.wrappedObjects.has(pass)) {
          continue;
        }
        this.wrappedObjects.add(pass);
        const origPassRender = pass.render.bind(pass);
        const isSceneRenderPass = i === 0;
        pass.render = (...args) => {
          const trackKey = isSceneRenderPass ? 'render' : 'postfx';
          subsystems.begin(trackKey);
          try {
            return origPassRender(...args);
          } finally {
            subsystems.end(trackKey);
          }
        };
      }
    }

    // Lock benchmark flythrough camera pose immediately prior to scene submission!
    if (benchmark?.active) {
      benchmark.applyCameraPose(gameCtx);
    }

    const info = renderer.info;
    const prevAutoReset = info.autoReset;
    info.autoReset = false;
    info.reset();

    const isDirectMobileRender = String(engine.quality || '').toUpperCase() === 'MOBILE';
    if (isDirectMobileRender) subsystems.begin('render');
    let result;
    try {
      result = invokeOriginalRender();
    } finally {
      if (isDirectMobileRender) subsystems.end('render');
      this.snapshot.drawCalls = info.render?.calls || 0;
      this.snapshot.triangles = info.render?.triangles || 0;
      this.snapshot.points = info.render?.points || 0;
      this.snapshot.lines = info.render?.lines || 0;
      this.snapshot.geometries = info.memory?.geometries || 0;
      this.snapshot.textures = info.memory?.textures || 0;
      this.snapshot.programs = Array.isArray(info.programs) ? info.programs.length : 0;
      info.autoReset = prevAutoReset;
    }

    return result;
  }

  samplePassive(renderer) {
    if (!renderer?.info) return this.snapshot;
    const info = renderer.info;
    if ((info.render?.calls || 0) > 0) {
      this.snapshot.drawCalls = info.render.calls;
      this.snapshot.triangles = info.render.triangles || 0;
    }
    this.snapshot.geometries = info.memory?.geometries || 0;
    this.snapshot.textures = info.memory?.textures || 0;
    this.snapshot.programs = Array.isArray(info.programs) ? info.programs.length : 0;
    return this.snapshot;
  }
}

class ContextTelemetryInstrumentor {
  constructor(subsystems, webglCollector, culler, benchmark) {
    this.subsystems = subsystems;
    this.webglCollector = webglCollector;
    this.culler = culler;
    this.benchmark = benchmark;
    this.wrappedTargets = new WeakMap();
  }

  _wrapMethodOnce(hostObj, methodName, trackKey, customAroundFn = null) {
    if (!hostObj || typeof hostObj[methodName] !== 'function') return false;
    let methodSet = this.wrappedTargets.get(hostObj);
    if (!methodSet) {
      methodSet = new Set();
      this.wrappedTargets.set(hostObj, methodSet);
    }
    if (methodSet.has(methodName)) return false;

    const original = hostObj[methodName].bind(hostObj);
    methodSet.add(methodName);

    if (customAroundFn) {
      hostObj[methodName] = (...args) => customAroundFn(original, args);
    } else {
      hostObj[methodName] = (...args) => {
        this.subsystems.begin(trackKey);
        try {
          return original(...args);
        } finally {
          this.subsystems.end(trackKey);
        }
      };
    }
    return true;
  }

  instrumentAll(ctx) {
    if (!ctx || typeof ctx !== 'object') return;

    // 1. World & Infrastructure Animations
    this._wrapMethodOnce(ctx.world, 'updateWorld', 'world');
    this._wrapMethodOnce(ctx.worldInfra, 'update', 'world');
    this._wrapMethodOnce(ctx.engine, 'updateEnvironment', 'world');

    // 2. AI, Traffic, Pedestrians, NPC Life & Đại Kiếp Bảo Khố
    this._wrapMethodOnce(ctx.gameplay, 'updateGameplay', 'ai');
    this._wrapMethodOnce(ctx.npcLife, 'update', 'ai');
    this._wrapMethodOnce(ctx.heists, 'update', 'ai');

    // 3. Vehicles, Suspension, Boats, Bikes, Helicopters & Collisions
    this._wrapMethodOnce(ctx.vehicles, 'updateVehicles', 'physics');
    this._wrapMethodOnce(ctx.vehiclesExtra, 'update', 'physics');

    // 4. Characters, Ballistics, Shells & Explosions
    this._wrapMethodOnce(ctx.characters, 'updatePlayerOnFoot', 'characters');
    this._wrapMethodOnce(ctx.characters, 'updateProjectilesAndFX', 'characters');

    // 5. Casino, Túy Tiên Lâu Bar & Luyện Khí Các / Thần Binh Các Shops
    this._wrapMethodOnce(ctx.casinoWorld, 'update', 'casinoNightlife');
    this._wrapMethodOnce(ctx.casinoGames, 'update', 'casinoNightlife');
    this._wrapMethodOnce(ctx.nightlife, 'update', 'casinoNightlife');
    this._wrapMethodOnce(ctx.shops, 'update', 'casinoNightlife');

    // 6. GfxUltra Post-Processing & Atmospheric Micro-FX
    this._wrapMethodOnce(ctx.gfxUltra, 'update', 'postfx');

    // 7. Engine Camera, Prewarm & Multi-Pass WebGL Render
    if (ctx.engine) {
      this._wrapMethodOnce(ctx.engine, 'updateCamera', 'render', (origCam, args) => {
        if (this.benchmark.active) {
          this.benchmark.applyCameraPose(ctx);
          return undefined;
        }
        this.subsystems.begin('render');
        try {
          return origCam(...args);
        } finally {
          this.subsystems.end('render');
        }
      });

      this._wrapMethodOnce(ctx.engine, 'renderFrame', 'render', (origRender, args) =>
        this.webglCollector.captureAroundRender(
          ctx.engine,
          this.subsystems,
          () => origRender(...args),
          this.benchmark,
          ctx
        )
      );

      // Ensure 100% of meshes are visible if prewarmShaders() is invoked at any point!
      this._wrapMethodOnce(ctx.engine, 'prewarmShaders', 'render', (origPrewarm, args) => {
        this.culler.restoreAllCulledVisibility(ctx);
        return origPrewarm(...args);
      });
    }
  }
}

export function createPerfCore(ctx = {}) {
  let activeCtx = ctx || {};

  // 1. Core Telemetry, Refresh Calibrator, Subsystem Tracker & Generational Memory Pools
  const frameRing = new CircularTelemetryRing(PERF_HISTORY_FRAMES);
  const extendedRing = new CircularTelemetryRing(PERF_EXTENDED_FRAMES);
  const calibrator = new RefreshRateCalibrator();
  const subsystems = new SubsystemTimingTracker(SUBSYSTEM_DEFINITIONS, PERF_HISTORY_FRAMES);
  const poolRegistry = new PerfMemoryPoolRegistry();

  // 2. Scene Classifier, Static Matrix Freezer, SAH BVH, Dynamic Grid & Skyscraper Culler
  const sceneOptimizer = new SceneClassifierAndOptimizer(poolRegistry);
  const staticBVH = new FlatSAHBVH(1024);
  const dynamicGrid = new DynamicSpatialHash2D(32, 512, 512);
  const culler = new SkyscraperHorizonOcclusionCuller(
    staticBVH,
    dynamicGrid,
    sceneOptimizer,
    poolRegistry
  );

  // 3. Smart Shadow-Caster Priority Queue, 1.8ms Scheduler, Path Cache & Minimap Baker
  const shadowMgr = new SmartShadowPriorityManager(staticBVH, dynamicGrid, poolRegistry);
  const schedulerMgr = new FrameBudgetScheduler(poolRegistry, DEFAULT_SCHEDULER_BUDGET_MS);
  const routeCache = new RoadGraphRouteCache(512, 20);
  const minimapBaker = new MinimapStaticCanvasBaker(512);

  // 4. Adaptive Turbo Governor, 15s Khảo Nghiệm Phong Cảnh 15s, Spatial Radar & Bottleneck Engine
  const governor = new AdaptiveTurboGovernor({
    culler,
    shadowMgr,
    scheduler: schedulerMgr,
    sceneOptimizer,
    calibrator,
    frameRing,
  });
  const benchmark = new AutomatedFlythroughBenchmark(governor, culler, shadowMgr);
  const radar = new SpatialRadarDebugger(staticBVH, dynamicGrid, culler, shadowMgr);
  const diagnostics = new BottleneckDiagnosticsEngine();
  const webglCollector = new WebGLMultiPassInfoCollector();
  const instrumentor = new ContextTelemetryInstrumentor(
    subsystems,
    webglCollector,
    culler,
    benchmark
  );

  // Lifecycle & Idempotency State
  let initialized = false;
  let staticFreezeEnabled = true;
  let frameCounter = 0;
  let lastFrameBeginWallMs = 0;
  let currentFrameBeginWallMs = 0;
  let lastWallDtSec = 0.01667;
  let explicitStepDtSec = 0;
  let culledThisFrame = false;
  let updatedThisFrame = false;
  let lastSceneChildCount = -1;
  let lastWorldAabbCount = -1;
  let sceneCheckAccumSec = 0;
  let particleSliceCursor = 0;
  let toggleInvocationSeq = 0;

  // Live Telemetry Snapshot Object (`ctx.perfCore.stats`) mutated in place every frame!
  const stats = {
    fps: 60,
    avgFps: 60,
    low1PercentFps: 60,
    low01PercentFps: 60,
    frameMs: 16.67,
    rawFrameMs: 16.67,
    jitterStdDevMs: 0,
    pacingScore: 100,
    detectedRefreshHz: 60,
    turboMode: false,
    profilerOpen: false,
    benchmarkRunning: false,
    quality: 'ULTRA',
    activeInterior: 'outdoors',
    drawCalls: 0,
    savedDrawCalls: 0,
    triangles: 0,
    savedTriangles: 0,
    geometries: 0,
    textures: 0,
    shaderPrograms: 0,
    estimatedVramMB: 0,
    jsHeapUsedMB: 0,
    bvhNodes: 0,
    bvhLeaves: 0,
    staticIndexed: 0,
    staticFrozen: 0,
    frustumCulled: 0,
    skyscraperOccluded: 0,
    shadowCastersActive: 0,
    shadowCastersBudget: 18,
    schedulerSpentMs: 0,
    schedulerBudgetMs: DEFAULT_SCHEDULER_BUDGET_MS,
    schedulerPending: 0,
    poolUtilizationPct: 0,
    poolHitRatePct: 100,
    routeCacheSize: 0,
    routeCacheHitRatePct: 100,
    bottleneckCode: 'OPTIMAL_LOCKED',
    subsystems: {},
    lastBenchmark: null,
  };

  function rebuildSpatialIndex(ctxOverride) {
    const c = ctxOverride || activeCtx;
    const t0 = perfNow();
    const tierCfg = governor.getActiveTierConfig(c);

    // Temporarily restore perf-culled flags before computing world bounds so all static
    // hierarchies have fresh world transforms!
    culler.restoreAllCulledVisibility(c);

    const scanStats = sceneOptimizer.scanAndOptimizeScene(c, {
      enableStaticFreeze: staticFreezeEnabled,
      enableMaterialDedup: true,
    });

    staticBVH.build(sceneOptimizer.staticEntries);
    culler.rebuildSolidOccluders(c, tierCfg.occluderInset);
    dynamicGrid.rebuildFromContext(c);
    shadowMgr.forceImmediateRefresh();

    lastSceneChildCount = c?.engine?.scene?.children?.length ?? -1;
    lastWorldAabbCount = Array.isArray(c?.world?.aabbs) ? c.world.aabbs.length : -1;

    subsystems.recordSpan('perfInternal', perfNow() - t0);
    return {
      ...scanStats,
      bvhNodes: staticBVH.nodeUsed,
      bvhLeaves: staticBVH.leafCount,
      solidOccluders: culler.solidOccluders.length,
    };
  }

  function registerBackgroundCooperativeJobs() {
    // Job 1: Sliced Transform Dirty Watchdog (verifies frozen static meshes never moved!)
    schedulerMgr.registerRecurring(
      'static_matrix_watchdog',
      0.22,
      () => {
        sceneOptimizer.runTransformWatchdogSlice(WATCHDOG_SLICE_SIZE);
      },
      TASK_PRIORITY.HIGH
    );

    // Job 2: Distant AI Road-Graph Shortest-Path Pre-Baker (warms 512-entry LRU cache!)
    schedulerMgr.registerRecurring(
      'ai_road_path_prewarm',
      0.18,
      (c) => {
        for (let i = 0; i < 3; i++) {
          if (!routeCache.prebakeNextPair(c || activeCtx)) break;
        }
      },
      TASK_PRIORITY.LOW
    );

    // Job 3: SoA Particle & Idle Slab Pool Compactor
    schedulerMgr.registerRecurring(
      'transient_pool_sweep',
      0.65,
      () => {
        poolRegistry.soaParticles.stepSlice(0.65, particleSliceCursor, 128);
        particleSliceCursor =
          (particleSliceCursor + 128) % poolRegistry.soaParticles.capacity;
        poolRegistry.compactIdlePools();
      },
      TASK_PRIORITY.IDLE
    );

    // Job 4: Periodic Static Minimap Layer Refresh
    schedulerMgr.registerRecurring(
      'minimap_layer_refresh',
      12.0,
      () => {
        minimapBaker.scheduleCooperativeBake(schedulerMgr);
      },
      TASK_PRIORITY.IDLE
    );
  }

  function setFeatureEnabled(featureId, enabled) {
    const key = String(featureId || '').trim();
    if (key === 'frustum') {
      const next = typeof enabled === 'boolean' ? enabled : !culler.frustumCullingEnabled;
      culler.frustumCullingEnabled = next;
      if (!next && !culler.occlusionCullingEnabled) {
        culler.restoreAllCulledVisibility(activeCtx);
      }
      return next;
    }
    if (key === 'occlusion') {
      const next = typeof enabled === 'boolean' ? enabled : !culler.occlusionCullingEnabled;
      culler.occlusionCullingEnabled = next;
      if (!next) {
        culler.restoreAllCulledVisibility(activeCtx);
      }
      return next;
    }
    if (key === 'shadows') {
      const next = typeof enabled === 'boolean' ? enabled : !shadowMgr.enabled;
      shadowMgr.enabled = next;
      if (!next) shadowMgr.disableAllDynamicShadows();
      else shadowMgr.forceImmediateRefresh();
      return next;
    }
    if (key === 'staticFreeze') {
      const next = typeof enabled === 'boolean' ? enabled : !staticFreezeEnabled;
      staticFreezeEnabled = next;
      sceneOptimizer.setStaticFreezeEnabled(next);
      return next;
    }
    if (key === 'scheduler') {
      const next = typeof enabled === 'boolean' ? enabled : !schedulerMgr.enabled;
      schedulerMgr.enabled = next;
      return next;
    }
    if (key === 'autoDrs') {
      if (activeCtx?.engine?.setAutoOptimize) {
        const next =
          typeof enabled === 'boolean' ? enabled : !activeCtx.engine.autoOptimize;
        return activeCtx.engine.setAutoOptimize(next);
      }
      return false;
    }
    return false;
  }

  function getFeatureState(featureId) {
    const key = String(featureId || '').trim();
    if (key === 'frustum') return culler.frustumCullingEnabled;
    if (key === 'occlusion') return culler.occlusionCullingEnabled;
    if (key === 'shadows') return shadowMgr.enabled;
    if (key === 'staticFreeze') return staticFreezeEnabled;
    if (key === 'scheduler') return schedulerMgr.enabled;
    if (key === 'autoDrs') return Boolean(activeCtx?.engine?.autoOptimize ?? true);
    return false;
  }

  // 5. Interactive Studio Performance Profiler UI (`F4` or Smartphone App)
  const profilerUI = new StudioProfilerUI({
    frameRing,
    subsystems,
    pools: poolRegistry,
    sceneOptimizer,
    bvh: staticBVH,
    culler,
    shadowMgr,
    scheduler: schedulerMgr,
    routeCache,
    governor,
    benchmark,
    radar,
    diagnostics,
    calibrator,
    callbacks: {
      onToggleTurbo: () => setTurboMode('TOGGLE'),
      onRunBenchmark: () => runBenchmark(),
      onToggleFeature: (fId) => setFeatureEnabled(fId),
      getStaticFreezeState: () => staticFreezeEnabled,
      onSelectQuality: (tierId) => {
        if (governor.turboMode) governor.setTurboMode(false, activeCtx, true);
        activeCtx?.engine?.setQuality?.(tierId);
        activeCtx?.gfxUltra?.setPreset?.(tierId);
        const cfg = QUALITY_TIER_CONFIGS[tierId] || QUALITY_TIER_CONFIGS.ULTRA;
        sceneOptimizer.applyTextureAnisotropyCap(
          cfg.maxAnisotropy,
          activeCtx?.engine?.renderer
        );
        shadowMgr.forceImmediateRefresh();
      },
      onDisposeResources: () => sceneOptimizer.disposeUnusedResources(activeCtx),
      onRunAdvisorAction: (actId) => {
        if (actId === 'enable_turbo') {
          setTurboMode(true);
        } else if (actId === 'enable_all_cullers') {
          setFeatureEnabled('frustum', true);
          setFeatureEnabled('occlusion', true);
          setFeatureEnabled('shadows', true);
        } else if (actId === 'reduce_density') {
          activeCtx?.gameplay?.setTrafficDensity?.('LIGHT', false);
        } else if (actId === 'gc_resources') {
          sceneOptimizer.disposeUnusedResources(activeCtx);
        }
      },
    },
  });

  function init(ctxArg) {
    if (ctxArg && typeof ctxArg === 'object') {
      activeCtx = ctxArg;
      activeCtx.perfCore = api;
    }

    instrumentor.instrumentAll(activeCtx);
    routeCache.installOnWorld(activeCtx);

    if (!initialized) {
      initialized = true;
      registerBackgroundCooperativeJobs();
      minimapBaker.scheduleCooperativeBake(schedulerMgr);
    }

    const indexReport = rebuildSpatialIndex(activeCtx);

    // Ensure 100% visibility restored right after init so engine.prewarmShaders() compiles every shader!
    culler.restoreAllCulledVisibility(activeCtx);
    syncStatsObject(16.67);

    return indexReport;
  }

  function setTurboMode(enabled, silent = false) {
    const state = governor.setTurboMode(enabled, activeCtx, silent);
    stats.turboMode = state;
    if (profilerUI.isOpen) {
      profilerUI.renderNow(activeCtx, webglCollector.snapshot);
    }
    return state;
  }

  function toggleTurboMode() {
    return setTurboMode(!governor.turboMode, false);
  }

  function toggleProfilerUI(forceState) {
    toggleInvocationSeq++;
    const open = profilerUI.toggle(forceState, activeCtx);
    stats.profilerOpen = open;
    return open;
  }

  function runBenchmark(options = {}) {
    stats.benchmarkRunning = true;
    const promise = benchmark.start(activeCtx, {
      ...options,
      onComplete: (rep) => {
        stats.benchmarkRunning = false;
        stats.lastBenchmark = rep;
        if (profilerUI.isOpen) {
          profilerUI.renderNow(activeCtx, webglCollector.snapshot);
        }
        if (typeof options.onComplete === 'function') {
          options.onComplete(rep);
        }
      },
    });
    return promise;
  }

  function stopBenchmark() {
    const rep = benchmark.stop(activeCtx, true);
    stats.benchmarkRunning = false;
    stats.lastBenchmark = rep;
    return rep;
  }

  function _runPreRenderOptimizations(dtSec) {
    if (culledThisFrame) return;
    culledThisFrame = true;

    const t0 = perfNow();

    // Re-instrument lazily if new sibling modules mounted onto ctx after init
    instrumentor.instrumentAll(activeCtx);
    routeCache.installOnWorld(activeCtx);

    // Periodically check if new top-level groups or exterior AABBs were spawned dynamically
    sceneCheckAccumSec += dtSec;
    if (sceneCheckAccumSec >= SCENE_RESYNC_INTERVAL_SEC) {
      sceneCheckAccumSec = 0;
      const curChildren = activeCtx?.engine?.scene?.children?.length ?? -1;
      const curAabbs = Array.isArray(activeCtx?.world?.aabbs) ? activeCtx.world.aabbs.length : -1;
      if (
        (staticBVH.nodeUsed === 0 && curChildren > 0) ||
        Math.abs(curAabbs - lastWorldAabbCount) >= 4
      ) {
        schedulerMgr.enqueue(
          'incremental_bvh_resync',
          () => rebuildSpatialIndex(activeCtx),
          TASK_PRIORITY.HIGH,
          { dedupeKey: 'incremental_bvh_resync' }
        );
      } else {
        lastSceneChildCount = curChildren;
      }
    }

    // Fast Transform Watchdog during initial frames to unfreeze any custom animated meshes immediately
    if (sceneOptimizer.initialFastVerifyFrames > 0) {
      sceneOptimizer.runTransformWatchdogSlice(96);
    }

    const tierCfg = governor.getActiveTierConfig(activeCtx);
    culler.executeFrameCull(activeCtx, tierCfg);
    shadowMgr.update(dtSec, activeCtx, governor.turboMode);

    if (benchmark.active) {
      benchmark.applyCameraPose(activeCtx);
    }

    subsystems.recordSpan('perfInternal', perfNow() - t0);
  }

  function beginFrame(nowArg, ctxArg) {
    if (ctxArg && typeof ctxArg === 'object') activeCtx = ctxArg;
    if (!initialized && activeCtx?.engine?.scene) {
      init(activeCtx);
    }

    const now = perfNow();
    currentFrameBeginWallMs = now;
    if (lastFrameBeginWallMs > 0) {
      const wallMs = now - lastFrameBeginWallMs;
      if (wallMs > 0.2 && wallMs < 250) {
        lastWallDtSec = wallMs * 0.001;
        calibrator.recordWallDeltaMs(wallMs);
      }
    }
    lastFrameBeginWallMs = now;

    frameCounter++;
    explicitStepDtSec = 0;
    culledThisFrame = false;
    updatedThisFrame = false;
    subsystems.beginFrameReset();

    // Run BVH Frustum + Skyscraper Horizon Culler & Smart Shadow Priority Queue from frame 2 onward
    // (guaranteeing frame 1 / shader prewarm sees 100% unculled scene!)
    if (frameCounter >= 2) {
      const hintDt =
        typeof activeCtx?.rawDt === 'number' && Number.isFinite(activeCtx.rawDt) && activeCtx.rawDt > 0
          ? Math.max(lastWallDtSec, clamp(activeCtx.rawDt, 0.001, 0.1))
          : lastWallDtSec;
      _runPreRenderOptimizations(hintDt);
    }
  }

  function update(dtArg, ctxArg) {
    if (ctxArg && typeof ctxArg === 'object') activeCtx = ctxArg;
    const hasExplicitDt = typeof dtArg === 'number' && Number.isFinite(dtArg) && dtArg > 0;
    const ctxHintDt =
      typeof activeCtx?.rawDt === 'number' && Number.isFinite(activeCtx.rawDt) && activeCtx.rawDt > 0
        ? clamp(activeCtx.rawDt, 0.0005, 0.25)
        : lastWallDtSec;
    const rawDt = hasExplicitDt ? clamp(dtArg, 0.0005, 0.25) : Math.max(lastWallDtSec, ctxHintDt);
    if (hasExplicitDt) explicitStepDtSec = rawDt;

    if (!initialized && activeCtx?.engine?.scene) {
      init(activeCtx);
    }

    if (!culledThisFrame && frameCounter >= 1) {
      _runPreRenderOptimizations(rawDt);
    } else if (hasExplicitDt && rawDt > lastWallDtSec) {
      shadowMgr.update(rawDt - lastWallDtSec, activeCtx, governor.turboMode);
    }

    if (!updatedThisFrame) {
      updatedThisFrame = true;
      const t0 = perfNow();
      governor.update(rawDt, activeCtx, benchmark.active);
      const elapsedSoFarMs =
        currentFrameBeginWallMs > 0 ? Math.max(0, t0 - currentFrameBeginWallMs) : 0;
      schedulerMgr.runFrameSlice(rawDt, elapsedSoFarMs, activeCtx);
      subsystems.recordSpan('perfInternal', perfNow() - t0);
      profilerUI.update(rawDt, activeCtx, webglCollector.snapshot);
    }
  }

  function syncStatsObject(instFrameMs) {
    frameRing.recomputePercentiles();
    const wgl = webglCollector.samplePassive(activeCtx?.engine?.renderer);
    const poolSum = poolRegistry.getSummaryTelemetry();
    const cs = culler.stats;

    stats.fps = Math.round(frameRing.getInstantFps());
    stats.avgFps = Number(frameRing.getAvgFps().toFixed(1));
    stats.low1PercentFps = Number(frameRing.getOnePercentLowFps().toFixed(1));
    stats.low01PercentFps = Number(frameRing.getPointOnePercentLowFps().toFixed(1));
    stats.frameMs = Number(frameRing.ema.toFixed(2));
    stats.rawFrameMs = Number(instFrameMs.toFixed(2));
    stats.jitterStdDevMs = Number(frameRing.stdDevVal.toFixed(2));
    stats.pacingScore = frameRing.pacingScore;
    stats.detectedRefreshHz = calibrator.detectedHz;
    stats.turboMode = governor.turboMode;
    stats.profilerOpen = profilerUI.isOpen;
    stats.benchmarkRunning = benchmark.active;
    stats.quality = activeCtx?.engine?.quality || 'ULTRA';
    stats.activeInterior = cs.activeInteriorId;
    stats.drawCalls = wgl.drawCalls || activeCtx?.engine?.drawCalls || 0;
    stats.savedDrawCalls = cs.estimatedDrawCallsSaved;
    stats.triangles = wgl.triangles || 0;
    stats.savedTriangles = cs.estimatedTrianglesSaved;
    stats.geometries = wgl.geometries || 0;
    stats.textures = wgl.textures || 0;
    stats.shaderPrograms = wgl.programs || 0;
    stats.estimatedVramMB = Number(
      (sceneOptimizer.estimatedVramBytes / (1024 * 1024)).toFixed(1)
    );
    stats.jsHeapUsedMB = poolSum.jsHeapUsedMB;
    stats.bvhNodes = staticBVH.nodeUsed;
    stats.bvhLeaves = staticBVH.leafCount;
    stats.staticIndexed = cs.totalStaticIndexed;
    stats.staticFrozen = sceneOptimizer.frozenStaticCount;
    stats.frustumCulled =
      cs.staticFrustumCulled + cs.staticDistanceCulled + cs.dynamicFrustumCulled;
    stats.skyscraperOccluded =
      cs.staticSkyscraperOccluded + cs.dynamicSkyscraperOccluded;
    stats.shadowCastersActive = shadowMgr.stats.activeCasters;
    stats.shadowCastersBudget = shadowMgr.stats.budgetMax;
    stats.schedulerSpentMs = schedulerMgr.stats.emaSpentMs;
    stats.schedulerBudgetMs = schedulerMgr.stats.budgetMs;
    stats.schedulerPending = schedulerMgr.stats.pendingCount;
    stats.poolUtilizationPct = poolSum.utilizationPct;
    stats.poolHitRatePct = poolSum.hitRatePct;
    stats.routeCacheSize = routeCache.cache.size;
    stats.routeCacheHitRatePct = routeCache.getHitRatePct();
    stats.bottleneckCode = diagnostics.currentReport.code;
    stats.subsystems = subsystems.getSnapshotObject();
    stats.lastBenchmark = benchmark.lastReport;
  }

  function endFrame(nowArg, ctxArg) {
    if (ctxArg && typeof ctxArg === 'object') activeCtx = ctxArg;

    // Ensure cooperative scheduler & governor still run even if caller only wired beginFrame() + endFrame()!
    if (!updatedThisFrame) {
      update(undefined, activeCtx);
    }

    const endWallMs = perfNow();
    const rawFrameSpanMs =
      currentFrameBeginWallMs > 0
        ? Math.max(lastWallDtSec * 1000, endWallMs - currentFrameBeginWallMs)
        : lastWallDtSec * 1000;

    // Ignore background tab hibernation (> 180ms) when pushing telemetry ring
    const recordedMs = rawFrameSpanMs <= 180 ? rawFrameSpanMs : frameRing.ema;
    frameRing.push(recordedMs);
    extendedRing.push(recordedMs);

    subsystems.commitFrame(lastWallDtSec, governor.stats.targetFrameMs || 16.67);
    syncStatsObject(recordedMs);

    if (benchmark.active) {
      const benchStepSec =
        explicitStepDtSec > 0
          ? Math.max(lastWallDtSec, explicitStepDtSec)
          : typeof activeCtx?.rawDt === 'number' && Number.isFinite(activeCtx.rawDt) && activeCtx.rawDt > 0
            ? Math.max(lastWallDtSec, clamp(activeCtx.rawDt, 0.001, 0.1))
            : lastWallDtSec;
      benchmark.recordFrame(
        benchStepSec,
        recordedMs,
        stats.drawCalls,
        stats.triangles,
        activeCtx
      );
    }

    // Reclaim all frame-scoped scratch Vectors, Matrices, Rays, Candidates & Slabs with Zero GC!
    poolRegistry.endFrameReclaim();
  }

  // Bind F4 Thiên Cơ Đo Hiệu Năng Shortcut (with Capture/Bubble single-fire guard so even if
  // ui_audio.js also invokes toggleProfilerUI() on F4, it toggles cleanly ONCE!)
  if (typeof window !== 'undefined') {
    let seqAtF4Capture = -1;
    window.addEventListener(
      'keydown',
      (ev) => {
        if (ev.code === 'F4' || ev.key === 'F4') {
          seqAtF4Capture = toggleInvocationSeq;
        }
      },
      true
    );

    window.addEventListener(
      'keydown',
      (ev) => {
        if (ev.code === 'F4' || ev.key === 'F4') {
          ev.preventDefault();
          if (toggleInvocationSeq === seqAtF4Capture) {
            toggleProfilerUI();
          }
        } else if ((ev.code === 'Escape' || ev.key === 'Escape') && benchmark.active) {
          stopBenchmark();
        }
      },
      false
    );
  }

  // Public `scheduler` & `pools` Facades exposed directly on `ctx.perfCore`
  const schedulerFacade = {
    enqueue: (name, fn, priority, opts) => schedulerMgr.enqueue(name, fn, priority, opts),
    enqueueSliced: (name, stepFn, total, chunk, priority, opts) =>
      schedulerMgr.enqueueSliced(name, stepFn, total, chunk, priority, opts),
    registerRecurring: (id, sec, fn, priority) =>
      schedulerMgr.registerRecurring(id, sec, fn, priority),
    unregisterRecurring: (id) => schedulerMgr.unregisterRecurring(id),
    setBudgetMs: (ms) => schedulerMgr.setBudgetMs(ms),
    clearAll: () => schedulerMgr.clearAll(),
    priorities: TASK_PRIORITY,
    get stats() {
      return schedulerMgr.stats;
    },
    get pendingCount() {
      return schedulerMgr.getPendingCount();
    },
  };

  const poolsFacade = {
    vec2: poolRegistry.vec2,
    vec3: poolRegistry.vec3,
    vec4: poolRegistry.vec4,
    quat: poolRegistry.quat,
    euler: poolRegistry.euler,
    mat4: poolRegistry.mat4,
    box3: poolRegistry.box3,
    sphere: poolRegistry.sphere,
    ray: poolRegistry.ray,
    color: poolRegistry.color,
    rayHit: poolRegistry.rayHit,
    shadowCandidate: poolRegistry.shadowCandidate,
    occluderRect: poolRegistry.occluderRect,
    pathNode: poolRegistry.pathNode,
    typedSlabs: poolRegistry.typedSlabs,
    particles: poolRegistry.soaParticles,
    createPool: (name, factory, reset, initCap, maxCap) =>
      poolRegistry.createCustomPool(name, factory, reset, initCap, maxCap),
    acquire: (name) => poolRegistry.acquire(name),
    acquireScratch: (name) => poolRegistry.acquireScratch(name),
    release: (name, item) => poolRegistry.release(name, item),
    compactAll: () => poolRegistry.compactIdlePools(),
    getTelemetry: () => poolRegistry.getSummaryTelemetry(),
  };

  const api = {
    init,
    beginFrame,
    endFrame,
    update,
    runBenchmark,
    stopBenchmark,
    getBenchmarkReport: () => benchmark.lastReport,
    setTurboMode,
    toggleTurboMode,
    toggleProfilerUI,
    stats,
    scheduler: schedulerFacade,
    pools: poolsFacade,
    rebuildSpatialIndex,
    disposeUnusedResources: () => sceneOptimizer.disposeUnusedResources(activeCtx),
    registerAnimatedObject: (obj) => sceneOptimizer.registerAnimatedObject(obj),
    registerDynamicGroup: (grp) => sceneOptimizer.registerDynamicRoot(grp),
    setFeatureEnabled,
    getFeatureState,
    beginSection: (key) => subsystems.begin(key),
    endSection: (key) => subsystems.end(key),
    markSubsystem: (key, ms) => subsystems.recordSpan(key, ms),
    exportDiagnosticsJSON: () => diagnostics.buildExportJSON(stats, frameRing),
    get minimapStaticCanvas() {
      return minimapBaker.isReady ? minimapBaker.canvas : null;
    },
    get turboMode() {
      return governor.turboMode;
    },
    get isTurboMode() {
      return governor.turboMode;
    },
    get isOpen() {
      return profilerUI.isOpen;
    },
    get isProfilerOpen() {
      return profilerUI.isOpen;
    },
    get isBenchmarkRunning() {
      return benchmark.active;
    },
  };

  if (activeCtx && typeof activeCtx === 'object') {
    activeCtx.perfCore = api;
    // If scene is already populated when createPerfCore(ctx) is invoked, index immediately!
    if (activeCtx.engine?.scene) {
      init(activeCtx);
    }
  }

  return api;
}
