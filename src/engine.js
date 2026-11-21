export function createEngine(canvas, ctx, THREE, { EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass }) {
  const targetCanvas =
    canvas ||
    (typeof document !== 'undefined'
      ? document.getElementById('game-canvas') || document.querySelector('canvas')
      : null);

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0 || 1e-6), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const wrapAngle = (a) => {
    let r = (a + Math.PI) % (Math.PI * 2);
    if (r < 0) r += Math.PI * 2;
    return r - Math.PI;
  };

  function hash2i(x, y, seed = 1337) {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  function tileNoise(x, y, periodX, periodY, seed = 1337) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);

    const ix0 = ((x0 % periodX) + periodX) % periodX;
    const ix1 = (ix0 + 1) % periodX;
    const iy0 = ((y0 % periodY) + periodY) % periodY;
    const iy1 = (iy0 + 1) % periodY;

    const n00 = hash2i(ix0, iy0, seed);
    const n10 = hash2i(ix1, iy0, seed);
    const n01 = hash2i(ix0, iy1, seed);
    const n11 = hash2i(ix1, iy1, seed);

    return lerp(lerp(n00, n10, ux), lerp(n01, n11, ux), uy);
  }

  function tileFbm(u, v, baseFreq, octaves = 4, seed = 1337) {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    let freq = baseFreq;
    for (let i = 0; i < octaves; i++) {
      sum += amp * tileNoise(u * freq, v * freq, freq, freq, seed + i * 97);
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / (norm || 1);
  }

  function makeOffscreenCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function configureTexture(tex, isSRGB, maxAniso) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = isSRGB ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.anisotropy = maxAniso;
    tex.needsUpdate = true;
    return tex;
  }

  function buildNormalTextureFromHeight(heightMap, w, h, strength, maxAniso) {
    const c = makeOffscreenCanvas(w, h);
    const c2d = c.getContext('2d');
    const img = c2d.createImageData(w, h);
    const data = img.data;
    const maskW = w - 1;
    const maskH = h - 1;
    const isPow2 = (w & maskW) === 0 && (h & maskH) === 0;

    const sampleH = (x, y) => {
      const wx = isPow2 ? x & maskW : ((x % w) + w) % w;
      const wy = isPow2 ? y & maskH : ((y % h) + h) % h;
      return heightMap[wy * w + wx];
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const tl = sampleH(x - 1, y - 1);
        const tc = sampleH(x, y - 1);
        const tr = sampleH(x + 1, y - 1);
        const ml = sampleH(x - 1, y);
        const mr = sampleH(x + 1, y);
        const bl = sampleH(x - 1, y + 1);
        const bc = sampleH(x, y + 1);
        const br = sampleH(x + 1, y + 1);

        const dX = tr + 2 * mr + br - (tl + 2 * ml + bl);
        const dY = bl + 2 * bc + br - (tl + 2 * tc + tr);

        let nx = -dX * strength;
        let ny = -dY * strength;
        let nz = 1.0;
        const invLen = 1.0 / Math.hypot(nx, ny, nz);
        nx *= invLen;
        ny *= invLen;
        nz *= invLen;

        const idx = (y * w + x) * 4;
        data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        data[idx + 3] = 255;
      }
    }
    c2d.putImageData(img, 0, 0);
    return configureTexture(new THREE.CanvasTexture(c), false, maxAniso);
  }

  function buildGrayscaleTexture(values, w, h, maxAniso) {
    const c = makeOffscreenCanvas(w, h);
    const c2d = c.getContext('2d');
    const img = c2d.createImageData(w, h);
    const d = img.data;
    for (let i = 0, n = w * h; i < n; i++) {
      const v = clamp(Math.round(values[i] * 255), 0, 255);
      const p = i * 4;
      d[p] = v;
      d[p + 1] = v;
      d[p + 2] = v;
      d[p + 3] = 255;
    }
    c2d.putImageData(img, 0, 0);
    return configureTexture(new THREE.CanvasTexture(c), false, maxAniso);
  }

  // ---------------------------------------------------------------------------
  // 1. WebGLRenderer, Scene, Camera & Post-Processing Setup
  // ---------------------------------------------------------------------------
  const initWidth = Math.max(
    1,
    (typeof window !== 'undefined' && window.innerWidth) ||
      targetCanvas?.clientWidth ||
      targetCanvas?.width ||
      1280
  );
  const initHeight = Math.max(
    1,
    (typeof window !== 'undefined' && window.innerHeight) ||
      targetCanvas?.clientHeight ||
      targetCanvas?.height ||
      720
  );

  const isMobileDevice = Boolean(
    typeof window !== 'undefined' &&
      ((window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
        (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')))
  );
  if (ctx && typeof ctx === 'object') {
    ctx.isMobile = isMobileDevice;
  }

  const rendererOpts = {
    antialias: !isMobileDevice,
    powerPreference: 'high-performance',
    stencil: false,
  };
  if (targetCanvas) rendererOpts.canvas = targetCanvas;

  const renderer = new THREE.WebGLRenderer(rendererOpts);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.07;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = isMobileDevice ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  const maxAnisotropy = isMobileDevice
    ? Math.min(2, renderer.capabilities.getMaxAnisotropy() || 1)
    : Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xa4d2ee, isMobileDevice ? 0.00185 : 0.00148);

  const camera = new THREE.PerspectiveCamera(62, initWidth / initHeight, 0.35, isMobileDevice ? 260 : 380);
  camera.rotation.order = 'YXZ';
  camera.position.set(26, 2.8, 34);

  const supportsFloatRT =
    Boolean(renderer.capabilities.isWebGL2) &&
    (renderer.extensions.has('EXT_color_buffer_float') ||
      renderer.extensions.has('EXT_color_buffer_half_float'));

  const composerRT = new THREE.WebGLRenderTarget(initWidth, initHeight, {
    type: supportsFloatRT ? THREE.HalfFloatType : THREE.UnsignedByteType,
    colorSpace: THREE.LinearSRGBColorSpace,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    stencilBuffer: false,
  });

  const composer = new EffectComposer(renderer, composerRT);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const initBloomScale = isMobileDevice ? 0.35 : 0.5;
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(
      Math.max(1, Math.round(initWidth * initBloomScale)),
      Math.max(1, Math.round(initHeight * initBloomScale))
    ),
    0.46,
    0.38,
    0.80
  );
  bloomPass.threshold = 0.80;
  bloomPass.strength = 0.46;
  bloomPass.radius = 0.38;
  composer.addPass(bloomPass);

  // Neo-Wuxia Cinematic Grading & Nội Công Hóa Cảnh Aura Pass
  const CinematicWuxiaShader = {
    name: 'CinematicWuxiaPass',
    uniforms: {
      tDiffuse: { value: null },
      uBulletTime: { value: 0.0 },
      uDamageFlash: { value: 0.0 },
      uTime: { value: 0.0 },
      uVignette: { value: 0.27 },
      uContrast: { value: 1.07 },
      uSaturation: { value: 1.15 },
      uTint: { value: new THREE.Vector3(1.02, 1.0, 0.97) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float uBulletTime;
      uniform float uDamageFlash;
      uniform float uTime;
      uniform float uVignette;
      uniform float uContrast;
      uniform float uSaturation;
      uniform vec3 uTint;
      varying vec2 vUv;

      void main() {
        vec2 centered = vUv - 0.5;
        float dist = length(centered);

        vec4 baseTex = texture2D(tDiffuse, vUv);
        vec3 col = baseTex.rgb;
        float caAmount = (uBulletTime * 0.0068 + uDamageFlash * 0.0085) * smoothstep(0.08, 0.72, dist);
        if (caAmount > 0.0002) {
          vec2 dir = dist > 0.0001 ? (centered / dist) : vec2(0.0);
          vec2 uvR = clamp(vUv + dir * caAmount, 0.001, 0.999);
          vec2 uvB = clamp(vUv - dir * caAmount, 0.001, 0.999);
          col.r = texture2D(tDiffuse, uvR).r;
          col.b = texture2D(tDiffuse, uvB).b;
        }

        float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = max(vec3(0.0), mix(vec3(luma), col, uSaturation));
        col = pow(max(col, vec3(0.00001)), vec3(uContrast)) * uTint;

        // Nội Công Hóa Cảnh (Jade-Spirit Focus + Imperial Gold Edge Aura)
        if (uBulletTime > 0.001) {
          float edgeMask = smoothstep(0.16, 0.74, dist);
          float innerFocus = smoothstep(0.04, 0.42, dist) * (1.0 - edgeMask);
          float pulse = 0.93 + 0.07 * sin(uTime * 6.5);
          vec3 jadeFocus = vec3(0.24, 1.06, 0.80);
          vec3 goldEdge = vec3(1.32, 0.92, 0.26) * pulse;
          col = mix(col, col * mix(vec3(1.0), jadeFocus, 0.26), uBulletTime * innerFocus);
          col = mix(col, col * goldEdge + goldEdge * 0.08 * edgeMask, uBulletTime * edgeMask * 0.82);
        }

        // Damage crimson flash
        if (uDamageFlash > 0.001) {
          float dmgMask = smoothstep(0.14, 0.72, dist);
          vec3 crimson = vec3(1.38, 0.04, 0.03);
          col = mix(
            col,
            col * crimson + vec3(0.34, 0.012, 0.01) * dmgMask,
            uDamageFlash * (0.32 + 0.68 * dmgMask)
          );
        }

        float vigStrength = uVignette + uBulletTime * 0.14 + uDamageFlash * 0.16;
        float vig = 1.0 - smoothstep(0.25, 0.86, dist) * vigStrength;
        col *= clamp(vig, 0.22, 1.0);

        gl_FragColor = vec4(max(col, vec3(0.0)), baseTex.a);
      }
    `,
  };

  const cinematicPass = new ShaderPass(CinematicWuxiaShader);
  composer.addPass(cinematicPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  // ---------------------------------------------------------------------------
  // 4. Procedural Neo-Wuxia PBR Texture & Normal-Map Suite
  // ---------------------------------------------------------------------------
  function buildProceduralTextures() {
    const texSuite = {};

    const roadNSize = 256;
    const roadHeight = new Float32Array(roadNSize * roadNSize);
    const roadRoughDry = new Float32Array(roadNSize * roadNSize);
    const roadRoughWet = new Float32Array(roadNSize * roadNSize);

    for (let y = 0; y < roadNSize; y++) {
      const v = y / roadNSize;
      for (let x = 0; x < roadNSize; x++) {
        const u = x / roadNSize;
        const fine = hash2i(x, y, 101);
        const med = tileFbm(u, v, 16, 3, 205);
        const puddle = tileFbm(u, v, 4, 3, 309);
        const crack = Math.abs(tileFbm(u, v, 8, 3, 419) - 0.5);
        const crackDip = crack < 0.018 ? -0.35 * (1 - crack / 0.018) : 0;

        const h = clamp(0.5 + (fine - 0.5) * 0.42 + (med - 0.5) * 0.35 + crackDip, 0, 1);
        const idx = y * roadNSize + x;
        roadHeight[idx] = h;
        roadRoughDry[idx] = clamp(0.70 + (fine - 0.5) * 0.14 + (puddle - 0.5) * 0.12, 0.46, 0.92);
        const isPuddle = smoothstep(0.46, 0.62, puddle);
        roadRoughWet[idx] = lerp(0.30 + fine * 0.1, 0.04, isPuddle);
      }
    }

    const roadNormal = buildNormalTextureFromHeight(roadHeight, roadNSize, roadNSize, 2.5, maxAnisotropy);
    const roadRoughnessDryTex = buildGrayscaleTexture(roadRoughDry, roadNSize, roadNSize, maxAnisotropy);
    const roadRoughnessWetTex = buildGrayscaleTexture(roadRoughWet, roadNSize, roadNSize, maxAnisotropy);

    function paintAsphaltBluestoneBase(w, h, seed, laneTrackPositions) {
      const c = makeOffscreenCanvas(w, h);
      const g = c.getContext('2d');
      const img = g.createImageData(w, h);
      const d = img.data;

      for (let y = 0; y < h; y++) {
        const v = y / h;
        for (let x = 0; x < w; x++) {
          const u = x / w;
          const grain = (hash2i(x, y, seed) - 0.5) * 18;
          const macro = (tileFbm(u, v, 8, 3, seed + 31) - 0.5) * 16;
          const sparkle = hash2i(x, y, seed + 77) > 0.985 ? 15 : 0;

          let wear = 0;
          for (let i = 0; i < laneTrackPositions.length; i++) {
            const dist = Math.abs(u - laneTrackPositions[i]);
            wear += Math.exp(-(dist * dist) / 0.0018) * 9.0;
          }
          const edgeDist = Math.min(u, 1 - u);
          const gutter = edgeDist < 0.06 ? (1 - edgeDist / 0.06) * 10 : 0;

          const base = 42 + grain + macro + sparkle - wear - gutter;
          const p = (y * w + x) * 4;
          d[p] = clamp(Math.round(base * 0.96), 18, 96);
          d[p + 1] = clamp(Math.round(base * 1.01), 20, 102);
          d[p + 2] = clamp(Math.round(base * 1.09), 24, 112);
          d[p + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);

      // Subtle oriental carved stone border trim along road shoulders
      g.strokeStyle = 'rgba(196, 162, 88, 0.42)';
      g.lineWidth = 3;
      g.strokeRect(8, 0, w - 16, h);

      return { canvas: c, ctx2d: g };
    }

    function distressMarkings(g, w, h, seed) {
      g.fillStyle = 'rgba(36, 39, 45, 0.22)';
      for (let i = 0; i < 200; i++) {
        const rx = hash2i(i, 11, seed) * w;
        const ry = hash2i(i, 29, seed) * h;
        const rw = 2 + hash2i(i, 43, seed) * 8;
        const rh = 2 + hash2i(i, 61, seed) * 10;
        g.fillRect(rx, ry, rw, rh);
      }
    }

    // 1) `roadBoulevard` (Đại Lộ Chu Tước 4-lane)
    {
      const w = 512, h = 512;
      const { canvas: c, ctx2d: g } = paintAsphaltBluestoneBase(
        w, h, 501,
        [0.11, 0.19, 0.33, 0.41, 0.59, 0.67, 0.81, 0.89]
      );
      g.fillStyle = 'rgba(228, 212, 172, 0.82)';
      g.fillRect(14, 0, 5, h);
      g.fillRect(w - 19, 0, 5, h);

      // Imperial gold double center lines
      g.fillStyle = 'rgba(236, 184, 58, 0.92)';
      g.fillRect(w * 0.5 - 8, 0, 5, h);
      g.fillRect(w * 0.5 + 3, 0, 5, h);

      g.fillStyle = 'rgba(232, 226, 212, 0.82)';
      for (let y = 16; y < h; y += 64) {
        g.fillRect(Math.round(w * 0.26) - 3, y, 5, 34);
        g.fillRect(Math.round(w * 0.74) - 3, y, 5, 34);
      }
      distressMarkings(g, w, h, 509);
      texSuite.roadBoulevard = configureTexture(new THREE.CanvasTexture(c), true, maxAnisotropy);
    }

    // 2) `roadStandard`
    {
      const w = 512, h = 512;
      const { canvas: c, ctx2d: g } = paintAsphaltBluestoneBase(w, h, 601, [0.22, 0.34, 0.66, 0.78]);
      g.fillStyle = 'rgba(218, 206, 178, 0.75)';
      g.fillRect(16, 0, 5, h);
      g.fillRect(w - 21, 0, 5, h);

      g.fillStyle = 'rgba(232, 180, 52, 0.88)';
      for (let y = 14; y < h; y += 64) {
        g.fillRect(w * 0.5 - 3, y, 6, 36);
      }
      distressMarkings(g, w, h, 613);
      texSuite.roadStandard = configureTexture(new THREE.CanvasTexture(c), true, maxAnisotropy);
    }

    // 3) `roadIntersection` (With subtle Bagua/Lotus bronze medallion at center!)
    {
      const w = 512, h = 512;
      const { canvas: c, ctx2d: g } = paintAsphaltBluestoneBase(w, h, 701, [0.28, 0.72]);

      g.fillStyle = 'rgba(226, 218, 198, 0.82)';
      const inset = 18;
      const barLen = 42;
      const barThick = 15;
      for (let p = 84; p <= w - 100; p += 34) {
        g.fillRect(p, inset, barThick, barLen);
        g.fillRect(p, h - inset - barLen, barThick, barLen);
        g.fillRect(inset, p, barLen, barThick);
        g.fillRect(w - inset - barLen, p, barLen, barThick);
      }

      // Carved Bronze Lotus/Bagua Medallion in intersection center
      g.save();
      g.translate(w * 0.5, h * 0.5);
      g.strokeStyle = 'rgba(198, 158, 78, 0.45)';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(0, 0, 44, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(0, 0, 26, 0, Math.PI * 2);
      g.stroke();
      g.restore();

      distressMarkings(g, w, h, 719);
      texSuite.roadIntersection = configureTexture(new THREE.CanvasTexture(c), true, maxAnisotropy);
    }

    texSuite.roadNormal = roadNormal;
    texSuite.roadRoughness = roadRoughnessDryTex;
    texSuite.roadRoughnessWet = roadRoughnessWetTex;

    // --- B. Carved Oriental Bluestone Sidewalk Slabs (`Đá Thanh Thạch`) ---
    {
      const w = 512, h = 512, nw = 256;
      const c = makeOffscreenCanvas(w, h);
      const g = c.getContext('2d');
      const img = g.createImageData(w, h);
      const d = img.data;
      const sHeight = new Float32Array(nw * nw);

      const slabs = 4;
      const slabPx = w / slabs;

      for (let y = 0; y < h; y++) {
        const sy = Math.floor(y / slabPx);
        const ly = y % slabPx;
        for (let x = 0; x < w; x++) {
          const sx = Math.floor(x / slabPx);
          const lx = x % slabPx;
          const slabTint = (hash2i(sx, sy, 811) - 0.5) * 14;
          const grain = (hash2i(x, y, 823) - 0.5) * 13;
          const wear = (tileFbm(x / w, y / h, 12, 3, 839) - 0.5) * 15;

          const jointDist = Math.min(lx, slabPx - 1 - lx, ly, slabPx - 1 - ly);
          const jointShade = jointDist < 3 ? -(3 - jointDist) * 18 : jointDist === 3 ? 6 : 0;

          const base = 152 + slabTint + grain + wear + jointShade;
          const p = (y * w + x) * 4;
          d[p] = clamp(Math.round(base * 0.96), 65, 218);
          d[p + 1] = clamp(Math.round(base * 0.99), 68, 222);
          d[p + 2] = clamp(Math.round(base * 1.02), 70, 228);
          d[p + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);

      // Subtle classical inner border frame on courtyard stone tiles
      g.strokeStyle = 'rgba(95, 102, 112, 0.35)';
      g.lineWidth = 1.5;
      for (let sy = 0; sy < slabs; sy++) {
        for (let sx = 0; sx < slabs; sx++) {
          g.strokeRect(sx * slabPx + 10, sy * slabPx + 10, slabPx - 20, slabPx - 20);
        }
      }

      const nSlab = nw / slabs;
      for (let y = 0; y < nw; y++) {
        const ly = y % nSlab;
        for (let x = 0; x < nw; x++) {
          const lx = x % nSlab;
          const jointDist = Math.min(lx, nSlab - 1 - lx, ly, nSlab - 1 - ly);
          const groove = jointDist < 2 ? -0.45 * (1 - jointDist / 2) : 0;
          const grain = (hash2i(x, y, 853) - 0.5) * 0.16;
          sHeight[y * nw + x] = clamp(0.65 + groove + grain, 0, 1);
        }
      }

      texSuite.sidewalk = configureTexture(new THREE.CanvasTexture(c), true, maxAnisotropy);
      texSuite.sidewalkNormal = buildNormalTextureFromHeight(sHeight, nw, nw, 2.8, maxAnisotropy);
    }

    // --- C. Golden Coastal Sand (`Đông Hải Ngân Sa`) ---
    {
      const w = 512, h = 512, nw = 256;
      const c = makeOffscreenCanvas(w, h);
      const g = c.getContext('2d');
      const img = g.createImageData(w, h);
      const d = img.data;
      const bHeight = new Float32Array(nw * nw);

      for (let y = 0; y < h; y++) {
        const v = y / h;
        for (let x = 0; x < w; x++) {
          const u = x / w;
          const warp = tileFbm(u, v, 4, 3, 907);
          const ripple = Math.sin((v * 18 + warp * 2.4) * Math.PI * 2) * 0.5 + 0.5;
          const fineSand = hash2i(x, y, 919);
          const shellGlint = hash2i(x, y, 929) > 0.992 ? 22 : 0;

          const lum = 214 + (ripple - 0.5) * 14 + (fineSand - 0.5) * 16 + shellGlint;
          const p = (y * w + x) * 4;
          d[p] = clamp(Math.round(lum * 1.05), 130, 252);
          d[p + 1] = clamp(Math.round(lum * 0.95), 115, 240);
          d[p + 2] = clamp(Math.round(lum * 0.77), 88, 208);
          d[p + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);

      for (let y = 0; y < nw; y++) {
        const v = y / nw;
        for (let x = 0; x < nw; x++) {
          const u = x / nw;
          const warp = tileFbm(u, v, 4, 3, 907);
          const ripple = Math.sin((v * 18 + warp * 2.4) * Math.PI * 2) * 0.5 + 0.5;
          const fine = (hash2i(x, y, 937) - 0.5) * 0.22;
          bHeight[y * nw + x] = clamp(0.45 + ripple * 0.34 + fine, 0, 1);
        }
      }

      texSuite.beachSand = configureTexture(new THREE.CanvasTexture(c), true, maxAnisotropy);
      texSuite.beachSandNormal = buildNormalTextureFromHeight(bHeight, nw, nw, 2.3, maxAnisotropy);
    }

    // --- D. Aged Cedar Wooden Pier (`Bến Cảng Bồng Lai`) ---
    {
      const w = 512, h = 512, nw = 256;
      const c = makeOffscreenCanvas(w, h);
      const g = c.getContext('2d');
      const img = g.createImageData(w, h);
      const d = img.data;
      const pHeight = new Float32Array(nw * nw);

      const planks = 8;
      const plankH = h / planks;

      for (let y = 0; y < h; y++) {
        const py = Math.floor(y / plankH);
        const ly = y % plankH;
        const buttX = Math.floor(hash2i(py, 7, 1013) * w);
        for (let x = 0; x < w; x++) {
          const seg = x >= buttX ? 1 : 0;
          const plankVar = (hash2i(py, seg, 1021) - 0.5) * 24;
          const grain = (tileFbm(x / w, (y * 6) / h, 8, 4, 1031 + py) - 0.5) * 26;
          const gapY = Math.min(ly, plankH - 1 - ly);
          const gapX = Math.min(Math.abs(x - buttX), w - Math.abs(x - buttX));
          const isGap = gapY < 2 || gapX < 2;

          const p = (y * w + x) * 4;
          if (isGap) {
            d[p] = 32; d[p + 1] = 24; d[p + 2] = 19;
          } else {
            const base = 118 + plankVar + grain;
            d[p] = clamp(Math.round(base * 1.08), 52, 192);
            d[p + 1] = clamp(Math.round(base * 0.80), 38, 155);
            d[p + 2] = clamp(Math.round(base * 0.58), 28, 124);
          }
          d[p + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);

      const nPlankH = nw / planks;
      for (let y = 0; y < nw; y++) {
        const py = Math.floor(y / nPlankH);
        const ly = y % nPlankH;
        const buttX = Math.floor(hash2i(py, 7, 1013) * nw);
        for (let x = 0; x < nw; x++) {
          const gapY = Math.min(ly, nPlankH - 1 - ly);
          const gapX = Math.min(Math.abs(x - buttX), nw - Math.abs(x - buttX));
          const groove = gapY < 2 || gapX < 1 ? -0.55 : 0;
          const fiber = (tileFbm(x / nw, (y * 6) / nw, 8, 3, 1031 + py) - 0.5) * 0.22;
          pHeight[y * nw + x] = clamp(0.68 + groove + fiber, 0, 1);
        }
      }

      texSuite.woodPier = configureTexture(new THREE.CanvasTexture(c), true, maxAnisotropy);
      texSuite.woodPierNormal = buildNormalTextureFromHeight(pHeight, nw, nw, 3.1, maxAnisotropy);
    }

    // --- E. 4 Neo-Wuxia Architectural Building Facades (Vermilion Columns + Lattice Windows + Warm Lantern Glow) ---
    function buildWuxiaFacadeSet(kind, seed) {
      const w = 512, h = 512, nw = 256;
      const diffC = makeOffscreenCanvas(w, h);
      const diffG = diffC.getContext('2d');
      const emiC = makeOffscreenCanvas(w, h);
      const emiG = emiC.getContext('2d');
      const fHeight = new Float32Array(nw * nw);
      fHeight.fill(0.75);

      emiG.fillStyle = '#000000';
      emiG.fillRect(0, 0, w, h);

      let cols = 8, rows = 8, padX = 6, padY = 8;

      if (kind === 'glassTower') {
        cols = 8; rows = 8; padX = 6; padY = 8;
        diffG.fillStyle = '#19232e';
        diffG.fillRect(0, 0, w, h);
      } else if (kind === 'modernBalcony') {
        cols = 4; rows = 6; padX = 12; padY = 14;
        diffG.fillStyle = '#eae4d7'; // Warm whitewashed Jiangnan plaster wall
        diffG.fillRect(0, 0, w, h);
      } else if (kind === 'commercial') {
        cols = 4; rows = 5; padX = 14; padY = 16;
        diffG.fillStyle = '#d9ccb4'; // Warm timber-and-plaster tavern wall
        diffG.fillRect(0, 0, w, h);
      } else {
        cols = 4; rows = 5; padX = 16; padY = 18;
        // Classical grey-blue oriental masonry brick (Gạch Xanh Cổ Phong)
        const bImg = diffG.createImageData(w, h);
        const bd = bImg.data;
        const brickH = 8, brickW = 20;
        for (let y = 0; y < h; y++) {
          const row = Math.floor(y / brickH);
          const ly = y % brickH;
          const offset = (row % 2) * (brickW >> 1);
          for (let x = 0; x < w; x++) {
            const bx = Math.floor((x + offset) / brickW);
            const lx = (x + offset) % brickW;
            const isMortar = ly === 0 || lx === 0;
            const p = (y * w + x) * 4;
            if (isMortar) {
              const m = 152 + (hash2i(x, y, seed + 5) - 0.5) * 16;
              bd[p] = m; bd[p + 1] = m; bd[p + 2] = m - 2;
            } else {
              const bv = (hash2i(bx, row, seed + 13) - 0.5) * 26;
              const gr = (hash2i(x, y, seed + 29) - 0.5) * 12;
              bd[p] = clamp(Math.round(86 + bv + gr), 48, 138);
              bd[p + 1] = clamp(Math.round(94 + bv + gr), 52, 146);
              bd[p + 2] = clamp(Math.round(104 + bv + gr), 58, 156);
            }
            bd[p + 3] = 255;
          }
        }
        diffG.putImageData(bImg, 0, 0);
      }

      const cellW = w / cols;
      const cellH = h / rows;

      for (let r = 0; r < rows; r++) {
        const cy = r * cellH;

        if (kind === 'modernBalcony') {
          // Dark walnut carved wood beam + gold accent trim
          diffG.fillStyle = '#3d251b';
          diffG.fillRect(0, cy, w, 9);
          diffG.fillStyle = '#b88c3e';
          diffG.fillRect(0, cy + 9, w, 3);
        } else if (kind === 'commercial') {
          // Vermilion lacquer horizontal tie-beam
          diffG.fillStyle = '#7a1c24';
          diffG.fillRect(0, cy, w, 10);
          diffG.fillStyle = '#d4a244';
          diffG.fillRect(0, cy + 10, w, 2);
        } else if (kind === 'glassTower') {
          diffG.fillStyle = '#24303e';
          diffG.fillRect(0, cy, w, 7);
          diffG.fillStyle = 'rgba(208, 164, 78, 0.45)';
          diffG.fillRect(0, cy + 7, w, 2);
        }

        for (let c = 0; c < cols; c++) {
          const cx = c * cellW;
          const wx = cx + padX;
          const wy = cy + padY;
          const ww = cellW - padX * 2;
          const wh = cellH - padY * 1.5;

          // Vermilion vertical pillar between bays on commercial / modernBalcony
          if (kind === 'commercial' || kind === 'brick') {
            diffG.fillStyle = '#6e1920';
            diffG.fillRect(cx, cy, 5, cellH);
          }

          const rnd = hash2i(c, r, seed + 101);
          const rnd2 = hash2i(c, r, seed + 211);
          const isLitAtNight =
            kind === 'glassTower'
              ? rnd < 0.62
              : kind === 'commercial' && r === rows - 1
                ? rnd < 0.90
                : rnd < 0.58;

          const grad = diffG.createLinearGradient(wx, wy, wx, wy + wh);
          if (kind === 'glassTower') {
            grad.addColorStop(0, '#2c4c63');
            grad.addColorStop(0.55, '#1b3144');
            grad.addColorStop(1, '#142230');
          } else {
            grad.addColorStop(0, '#382a24');
            grad.addColorStop(0.6, '#261c18');
            grad.addColorStop(1, '#1c1411');
          }
          diffG.fillStyle = grad;
          diffG.fillRect(wx, wy, ww, wh);

          // Warm shoji / rice-paper screen backing on traditional buildings
          if (kind !== 'glassTower' && rnd2 > 0.32) {
            diffG.fillStyle = 'rgba(232, 212, 174, 0.34)';
            diffG.fillRect(wx + 3, wy + 3, ww - 6, wh - 6);
          }

          // Oriental Wooden Lattice Window Frame (Chấn song cửa sổ cổ phong)
          diffG.strokeStyle = kind === 'glassTower' ? '#16212c' : '#4a251aa8';
          diffG.lineWidth = 2;
          diffG.strokeRect(wx, wy, ww, wh);
          if (kind !== 'glassTower') {
            diffG.strokeStyle = '#52291c';
            diffG.lineWidth = 1.8;
            diffG.beginPath();
            diffG.moveTo(wx + ww * 0.5, wy);
            diffG.lineTo(wx + ww * 0.5, wy + wh);
            diffG.moveTo(wx, wy + wh * 0.35);
            diffG.lineTo(wx + ww, wy + wh * 0.35);
            diffG.moveTo(wx, wy + wh * 0.70);
            diffG.lineTo(wx + ww, wy + wh * 0.70);
            diffG.stroke();
            // Center lattice diamond motif
            diffG.strokeRect(wx + ww * 0.25, wy + wh * 0.22, ww * 0.5, wh * 0.56);
          }

          // Night Emissive Map (Warm golden paper-lantern & amber candlelit rooms!)
          if (isLitAtNight) {
            const emGrad = emiG.createLinearGradient(wx, wy, wx, wy + wh);
            if (kind === 'glassTower') {
              if (rnd2 > 0.45) {
                emGrad.addColorStop(0, '#ffe3a3');
                emGrad.addColorStop(1, '#d98f3c');
              } else {
                emGrad.addColorStop(0, '#b8f2dc');
                emGrad.addColorStop(1, '#4ca692');
              }
            } else {
              emGrad.addColorStop(0, '#ffe8ae');
              emGrad.addColorStop(0.6, '#f5a94c');
              emGrad.addColorStop(1, '#c96428');
            }
            emiG.fillStyle = emGrad;
            emiG.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);

            // Preserve dark wooden lattice silhouette over glowing night windows!
            if (kind !== 'glassTower') {
              emiG.strokeStyle = 'rgba(38, 18, 12, 0.72)';
              emiG.lineWidth = 2;
              emiG.beginPath();
              emiG.moveTo(wx + ww * 0.5, wy + 2);
              emiG.lineTo(wx + ww * 0.5, wy + wh - 2);
              emiG.moveTo(wx + 2, wy + wh * 0.5);
              emiG.lineTo(wx + ww - 2, wy + wh * 0.5);
              emiG.stroke();
            }
          }

          const nwx0 = Math.max(0, Math.floor((wx / w) * nw));
          const nwx1 = Math.min(nw - 1, Math.ceil(((wx + ww) / w) * nw));
          const nwy0 = Math.max(0, Math.floor((wy / h) * nw));
          const nwy1 = Math.min(nw - 1, Math.ceil(((wy + wh) / h) * nw));
          for (let ny = nwy0; ny <= nwy1; ny++) {
            for (let nx = nwx0; nx <= nwx1; nx++) {
              fHeight[ny * nw + nx] = 0.22;
            }
          }
        }
      }

      const diffTex = configureTexture(new THREE.CanvasTexture(diffC), true, maxAnisotropy);
      const emiTex = configureTexture(new THREE.CanvasTexture(emiC), true, maxAnisotropy);
      const normTex = buildNormalTextureFromHeight(fHeight, nw, nw, 3.2, maxAnisotropy);
      diffTex.emissiveMap = emiTex;
      diffTex.normalMap = normTex;
      return { diffuse: diffTex, emissive: emiTex, normal: normTex };
    }

    const glassTower = buildWuxiaFacadeSet('glassTower', 1103);
    const modernBalcony = buildWuxiaFacadeSet('modernBalcony', 1207);
    const commercial = buildWuxiaFacadeSet('commercial', 1301);
    const brick = buildWuxiaFacadeSet('brick', 1409);

    texSuite.facadeGlassTower = glassTower.diffuse;
    texSuite.facadeGlassTowerEmissive = glassTower.emissive;
    texSuite.facadeGlassTowerNormal = glassTower.normal;

    texSuite.facadeModernBalcony = modernBalcony.diffuse;
    texSuite.facadeModernBalconyEmissive = modernBalcony.emissive;
    texSuite.facadeModernBalconyNormal = modernBalcony.normal;

    texSuite.facadeCommercial = commercial.diffuse;
    texSuite.facadeCommercialEmissive = commercial.emissive;
    texSuite.facadeCommercialNormal = commercial.normal;

    texSuite.facadeBrick = brick.diffuse;
    texSuite.facadeBrickEmissive = brick.emissive;
    texSuite.facadeBrickNormal = brick.normal;

    // --- F. Silk Brocade & Martial Garment PBR Textures ---
    {
      const nw = 256;
      const fabHeight = new Float32Array(nw * nw);
      for (let y = 0; y < nw; y++) {
        const v = y / nw;
        for (let x = 0; x < nw; x++) {
          const u = x / nw;
          const weaveX = Math.sin(u * Math.PI * 128);
          const weaveY = Math.sin(v * Math.PI * 128);
          const weave = (weaveX * weaveY * 0.5 + 0.5) * 0.25;
          const folds = tileFbm(u, v, 6, 3, 1511) * 0.45;
          fabHeight[y * nw + x] = clamp(0.25 + weave + folds, 0, 1);
        }
      }
      texSuite.fabricNormal = buildNormalTextureFromHeight(fabHeight, nw, nw, 1.85, maxAnisotropy);

      const dw = 256;
      const dc = makeOffscreenCanvas(dw, dw);
      const dg = dc.getContext('2d');
      const dImg = dg.createImageData(dw, dw);
      const dd = dImg.data;
      const denHeight = new Float32Array(dw * dw);

      for (let y = 0; y < dw; y++) {
        for (let x = 0; x < dw; x++) {
          const u = x / dw;
          const twill = ((x + y * 2) % 4) / 3;
          const slub = (hash2i(x, y, 1607) - 0.5) * 12;
          const centerFade = Math.exp(-Math.pow((u - 0.5) * 3.2, 2)) * 18;
          const seam = x < 4 || x > dw - 5;

          const p = (y * dw + x) * 4;
          if (seam && (y % 8 < 5)) {
            dd[p] = 212; dd[p + 1] = 168; dd[p + 2] = 78;
            denHeight[y * dw + x] = 0.92;
          } else {
            const lift = twill * 14 + centerFade + slub;
            dd[p] = clamp(Math.round(36 + lift * 0.75), 20, 118);
            dd[p + 1] = clamp(Math.round(44 + lift * 0.82), 26, 132);
            dd[p + 2] = clamp(Math.round(58 + lift * 0.95), 34, 154);
            denHeight[y * dw + x] = clamp(0.45 + twill * 0.28 + (slub / 28) * 0.15, 0, 1);
          }
          dd[p + 3] = 255;
        }
      }
      dg.putImageData(dImg, 0, 0);
      texSuite.denimTexture = configureTexture(new THREE.CanvasTexture(dc), true, maxAnisotropy);
      texSuite.denimNormal = buildNormalTextureFromHeight(denHeight, dw, dw, 2.0, maxAnisotropy);
    }

    return texSuite;
  }

  const textures = buildProceduralTextures();

  const facadeImageToEmissive = new Map([
    [textures.facadeGlassTower.image, textures.facadeGlassTowerEmissive],
    [textures.facadeModernBalcony.image, textures.facadeModernBalconyEmissive],
    [textures.facadeCommercial.image, textures.facadeCommercialEmissive],
    [textures.facadeBrick.image, textures.facadeBrickEmissive],
  ]);

  const roadImages = new Set([
    textures.roadBoulevard.image,
    textures.roadStandard.image,
    textures.roadIntersection.image,
  ]);

  // ---------------------------------------------------------------------------
  // 3. Sky Dome GLSL Shader, Lantern Lighting, Rain & Drifting Cherry Blossom Petals
  // ---------------------------------------------------------------------------
  const WEATHER_ORDER = ['BRIGHT_DAY', 'SUNSET_GOLD', 'OVERCAST_RAIN', 'NEON_NIGHT'];

  const WEATHER_PRESETS = {
    BRIGHT_DAY: {
      zenith: new THREE.Color(0x1b64c2),
      horizon: new THREE.Color(0xa6daf5),
      ground: new THREE.Color(0x46525e),
      sunDir: new THREE.Vector3(-0.52, 0.74, 0.42).normalize(),
      sunColor: new THREE.Color(0xfff4dc),
      sunIntensity: 2.65,
      sunDiscGain: 4.5,
      hemiSky: new THREE.Color(0x98d2ff),
      hemiGround: new THREE.Color(0x5d5146),
      hemiIntensity: 0.88,
      fogColor: new THREE.Color(0xa6d6f2),
      fogDensity: 0.00145,
      exposure: 1.07,
      cloudAmount: 0.28,
      cloudDarkness: 0.06,
      starIntensity: 0.0,
      moonIntensity: 0.0,
      lampIntensity: 0.45,
      windowEmissive: 0.05,
      roadRoughness: 0.74,
      roadMetalness: 0.06,
      rain: false,
      petals: true,
      contrast: 1.06,
      saturation: 1.16,
      tint: new THREE.Vector3(1.02, 1.0, 0.98),
    },
    SUNSET_GOLD: {
      zenith: new THREE.Color(0x281e4d),
      horizon: new THREE.Color(0xff783c),
      ground: new THREE.Color(0x38232c),
      sunDir: new THREE.Vector3(-0.86, 0.22, 0.45).normalize(),
      sunColor: new THREE.Color(0xff9238),
      sunIntensity: 2.55,
      sunDiscGain: 5.4,
      hemiSky: new THREE.Color(0xffa468),
      hemiGround: new THREE.Color(0x3d2832),
      hemiIntensity: 0.80,
      fogColor: new THREE.Color(0xe68456),
      fogDensity: 0.00205,
      exposure: 1.06,
      cloudAmount: 0.48,
      cloudDarkness: 0.22,
      starIntensity: 0.15,
      moonIntensity: 0.0,
      lampIntensity: 2.1,
      windowEmissive: 0.55,
      roadRoughness: 0.60,
      roadMetalness: 0.09,
      rain: false,
      petals: true,
      contrast: 1.08,
      saturation: 1.20,
      tint: new THREE.Vector3(1.06, 0.97, 0.91),
    },
    OVERCAST_RAIN: {
      zenith: new THREE.Color(0x1f2a36),
      horizon: new THREE.Color(0x546675),
      ground: new THREE.Color(0x1b2229),
      sunDir: new THREE.Vector3(-0.35, 0.72, 0.6).normalize(),
      sunColor: new THREE.Color(0xa2bcd4),
      sunIntensity: 1.05,
      sunDiscGain: 0.30,
      hemiSky: new THREE.Color(0x6c8296),
      hemiGround: new THREE.Color(0x21272e),
      hemiIntensity: 0.92,
      fogColor: new THREE.Color(0x526270),
      fogDensity: 0.0034,
      exposure: 1.04,
      cloudAmount: 0.92,
      cloudDarkness: 0.65,
      starIntensity: 0.0,
      moonIntensity: 0.0,
      lampIntensity: 2.85,
      windowEmissive: 0.78,
      roadRoughness: 0.12,
      roadMetalness: 0.25,
      rain: true,
      petals: false,
      contrast: 1.09,
      saturation: 0.96,
      tint: new THREE.Vector3(0.95, 0.99, 1.04),
    },
    NEON_NIGHT: {
      zenith: new THREE.Color(0x050814),
      horizon: new THREE.Color(0x141f3d),
      ground: new THREE.Color(0x080c15),
      sunDir: new THREE.Vector3(0.44, 0.68, -0.58).normalize(),
      sunColor: new THREE.Color(0x82a6ff),
      sunIntensity: 0.68,
      sunDiscGain: 0.0,
      hemiSky: new THREE.Color(0x22345e),
      hemiGround: new THREE.Color(0x0f1018),
      hemiIntensity: 0.56,
      fogColor: new THREE.Color(0x0e162b),
      fogDensity: 0.0021,
      exposure: 1.14,
      cloudAmount: 0.20,
      cloudDarkness: 0.75,
      starIntensity: 1.0,
      moonIntensity: 1.15,
      lampIntensity: 3.9,
      windowEmissive: 1.38,
      roadRoughness: 0.48,
      roadMetalness: 0.15,
      rain: false,
      petals: true,
      contrast: 1.08,
      saturation: 1.18,
      tint: new THREE.Vector3(0.98, 0.99, 1.05),
    },
  };

  const skyUniforms = {
    uZenithColor: { value: WEATHER_PRESETS.BRIGHT_DAY.zenith.clone() },
    uHorizonColor: { value: WEATHER_PRESETS.BRIGHT_DAY.horizon.clone() },
    uGroundColor: { value: WEATHER_PRESETS.BRIGHT_DAY.ground.clone() },
    uSunDir: { value: WEATHER_PRESETS.BRIGHT_DAY.sunDir.clone() },
    uSunColor: { value: WEATHER_PRESETS.BRIGHT_DAY.sunColor.clone() },
    uSunDiscGain: { value: WEATHER_PRESETS.BRIGHT_DAY.sunDiscGain },
    uCloudAmount: { value: WEATHER_PRESETS.BRIGHT_DAY.cloudAmount },
    uCloudDarkness: { value: WEATHER_PRESETS.BRIGHT_DAY.cloudDarkness },
    uStarIntensity: { value: 0.0 },
    uMoonIntensity: { value: 0.0 },
    uTime: { value: 0.0 },
  };

  const skyMat = new THREE.ShaderMaterial({
    name: 'WuxiaSkyDomeShader',
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: skyUniforms,
    vertexShader: /* glsl */ `
      varying vec3 vWorldOffset;
      void main() {
        vWorldOffset = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenithColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uGroundColor;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform float uSunDiscGain;
      uniform float uCloudAmount;
      uniform float uCloudDarkness;
      uniform float uStarIntensity;
      uniform float uMoonIntensity;
      uniform float uTime;
      varying vec3 vWorldOffset;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise2(p);
          p = p * 2.03 + vec2(17.1, 31.7);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 dir = normalize(vWorldOffset);
        float y = dir.y;

        float upT = pow(clamp(y, 0.0, 1.0), 0.52);
        vec3 sky = mix(uHorizonColor, uZenithColor, upT);
        if (y < 0.0) {
          sky = mix(uHorizonColor, uGroundColor, clamp(-y * 3.5, 0.0, 1.0));
        }

        float horizonBand = exp(-abs(y) * 9.0);
        sky += uHorizonColor * horizonBand * 0.18;

        float sunCos = max(dot(dir, normalize(uSunDir)), 0.0);
        if (uSunDiscGain > 0.01) {
          float mieHalo = pow(max(sunCos, 0.0001), 9.0) * 0.42 + pow(max(sunCos, 0.0001), 96.0) * 0.85;
          float sunDisc = smoothstep(0.9985, 0.9994, sunCos) * uSunDiscGain;
          sky += uSunColor * (mieHalo * clamp(uSunDiscGain * 0.25, 0.0, 1.2) + sunDisc);
        }

        if (uStarIntensity > 0.01 && y > 0.04) {
          vec2 starUv = dir.xz / (y + 0.35) * 155.0;
          vec2 cell = floor(starUv);
          vec2 gv = fract(starUv) - 0.5;
          float rnd = hash21(cell);
          if (rnd > 0.962) {
            float d = length(gv);
            float twinkle = 0.68 + 0.32 * sin(uTime * 3.2 + rnd * 62.8);
            float star = smoothstep(0.24, 0.02, d) * twinkle * smoothstep(0.04, 0.28, y);
            sky += vec3(0.88, 0.92, 1.0) * star * uStarIntensity * 1.45;
          }
        }

        if (uMoonIntensity > 0.01) {
          float moonDisc = smoothstep(0.9978, 0.9990, sunCos);
          float moonGlow = pow(max(sunCos, 0.0001), 36.0) * 0.45;
          sky += vec3(0.88, 0.92, 1.0) * (moonDisc * 2.8 + moonGlow) * uMoonIntensity;
        }

        if (y > 0.01 && uCloudAmount > 0.01) {
          vec2 cloudUv = dir.xz / (y + 0.18) * 1.35 + vec2(uTime * 0.008, uTime * 0.004);
          float n = fbm(cloudUv);
          float threshold = mix(0.68, 0.24, uCloudAmount);
          float cloudMask = smoothstep(threshold, threshold + 0.28, n) * smoothstep(0.01, 0.18, y);
          vec3 litCloud = mix(vec3(1.0, 0.99, 0.96), uSunColor * 1.15, 0.45);
          vec3 darkCloud = mix(uHorizonColor * 0.55, vec3(0.14, 0.17, 0.21), uCloudDarkness);
          vec3 cloudCol = mix(litCloud, darkCloud, clamp(uCloudDarkness + (1.0 - n) * 0.35, 0.0, 1.0));
          sky = mix(sky, cloudCol, cloudMask * clamp(uCloudAmount * 1.1, 0.0, 0.94));
        }

        gl_FragColor = vec4(max(sky, vec3(0.0)), 1.0);
      }
    `,
  });

  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(960, 40, 24), skyMat);
  skyDome.frustumCulled = false;
  skyDome.renderOrder = -1000;
  scene.add(skyDome);

  const hemiLight = new THREE.HemisphereLight(0x98d2ff, 0x5d5146, 0.88);
  scene.add(hemiLight);

  const SHADOW_FRUSTUM_HALF = isMobileDevice ? 56 : 85;
  const sunLight = new THREE.DirectionalLight(0xfff4dc, 2.65);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.left = -SHADOW_FRUSTUM_HALF;
  sunLight.shadow.camera.right = SHADOW_FRUSTUM_HALF;
  sunLight.shadow.camera.top = SHADOW_FRUSTUM_HALF;
  sunLight.shadow.camera.bottom = -SHADOW_FRUSTUM_HALF;
  sunLight.shadow.camera.near = 2.0;
  sunLight.shadow.camera.far = 290.0;
  sunLight.shadow.bias = -0.00045;
  sunLight.shadow.normalBias = 0.035;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // Pool of 8 Warm Red-Gold Silk Lantern PointLights
  const MAX_STREETLAMP_POOL = 8;
  const streetlampPool = [];
  for (let i = 0; i < MAX_STREETLAMP_POOL; i++) {
    const pl = new THREE.PointLight(0xff9448, 0, 42, 1.65);
    pl.castShadow = false;
    pl.visible = false;
    scene.add(pl);
    streetlampPool.push(pl);
  }

  let registeredStreetlamps = [];
  let lampAssignTimer = 0;
  let lastLampFocusX = 1e9;
  let lastLampFocusZ = 1e9;

  // 3D Falling Rain Volume (`OVERCAST_RAIN`)
  const RAIN_COUNT = isMobileDevice ? 240 : 1400;
  const RAIN_BOX_X = 64, RAIN_BOX_Y = 34, RAIN_BOX_Z = 64;
  const rainOffsets = new Float32Array(RAIN_COUNT * 3);
  const rainPositions = new Float32Array(RAIN_COUNT * 6);
  for (let i = 0; i < RAIN_COUNT; i++) {
    rainOffsets[i * 3] = (hash2i(i, 1, 3101) - 0.5) * RAIN_BOX_X;
    rainOffsets[i * 3 + 1] = hash2i(i, 2, 3109) * RAIN_BOX_Y;
    rainOffsets[i * 3 + 2] = (hash2i(i, 3, 3119) - 0.5) * RAIN_BOX_Z;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3).setUsage(THREE.DynamicDrawUsage));
  const rainMat = new THREE.LineBasicMaterial({
    color: 0xc2daf2,
    transparent: true,
    opacity: 0.44,
    depthWrite: false,
    fog: false,
  });
  const rainLines = new THREE.LineSegments(rainGeo, rainMat);
  rainLines.frustumCulled = false;
  rainLines.visible = false;
  scene.add(rainLines);

  // 3D Drifting Pink Cherry Blossom Petals (`Hoa Đào Rơi` — Wuxia Signature Ambiance!)
  const PETAL_COUNT = isMobileDevice ? 72 : 240;
  const PETAL_BOX_X = 56, PETAL_BOX_Y = 24, PETAL_BOX_Z = 56;
  const petalOffsets = new Float32Array(PETAL_COUNT * 4);
  for (let i = 0; i < PETAL_COUNT; i++) {
    petalOffsets[i * 4] = (hash2i(i, 1, 5101) - 0.5) * PETAL_BOX_X;
    petalOffsets[i * 4 + 1] = hash2i(i, 2, 5109) * PETAL_BOX_Y;
    petalOffsets[i * 4 + 2] = (hash2i(i, 3, 5119) - 0.5) * PETAL_BOX_Z;
    petalOffsets[i * 4 + 3] = hash2i(i, 4, 5129) * Math.PI * 2;
  }
  const petalGeo = new THREE.PlaneGeometry(0.11, 0.07);
  const petalMat = new THREE.MeshBasicMaterial({
    color: 0xffb2c8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    fog: false,
  });
  const petalInst = new THREE.InstancedMesh(petalGeo, petalMat, PETAL_COUNT);
  petalInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  petalInst.frustumCulled = false;
  scene.add(petalInst);
  const petalDummy = new THREE.Object3D();

  // ---------------------------------------------------------------------------
  // 2. Procedural HDRI Environment Map (`PMREMGenerator`)
  // ---------------------------------------------------------------------------
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileCubemapShader();
  let currentEnvRT = null;
  let envMap = null;

  function rebuildEnvironmentMap(presetKey) {
    const p = WEATHER_PRESETS[presetKey] || WEATHER_PRESETS.BRIGHT_DAY;
    const envScene = new THREE.Scene();

    const envDomeGeo = new THREE.SphereGeometry(60, 32, 20);
    const envDomeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        uZenith: { value: p.zenith.clone().multiplyScalar(presetKey === 'NEON_NIGHT' ? 1.4 : 1.15) },
        uHorizon: { value: p.horizon.clone().multiplyScalar(presetKey === 'SUNSET_GOLD' ? 2.1 : 1.45) },
        uGround: { value: p.ground.clone().multiplyScalar(0.8) },
        uSunDir: { value: p.sunDir.clone() },
        uSunColor: { value: p.sunColor.clone() },
        uSunHdr: { value: presetKey === 'NEON_NIGHT' ? 1.2 : presetKey === 'OVERCAST_RAIN' ? 1.6 : 7.5 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uZenith;
        uniform vec3 uHorizon;
        uniform vec3 uGround;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform float uSunHdr;
        varying vec3 vPos;
        void main() {
          vec3 d = normalize(vPos);
          vec3 col = d.y >= 0.0
            ? mix(uHorizon, uZenith, pow(clamp(d.y, 0.0, 1.0), 0.55))
            : mix(uHorizon * 0.55, uGround, clamp(-d.y * 3.0, 0.0, 1.0));
          float westBounce = clamp(-d.x, 0.0, 1.0) * exp(-abs(d.y) * 5.0);
          col += vec3(0.08, 0.28, 0.36) * westBounce * 0.65;
          float sc = max(dot(d, normalize(uSunDir)), 0.0);
          col += uSunColor * (pow(max(sc, 0.0001), 16.0) * 0.6 + smoothstep(0.96, 0.997, sc) * uSunHdr);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const envDome = new THREE.Mesh(envDomeGeo, envDomeMat);
    envScene.add(envDome);

    const blockGeo = new THREE.BoxGeometry(1, 1, 1);
    const darkSilhouetteMat = new THREE.MeshBasicMaterial({
      color: presetKey === 'NEON_NIGHT' ? 0x0b0e1a : 0x1c212c,
    });
    const accentGlowMat = new THREE.MeshBasicMaterial({
      color:
        presetKey === 'NEON_NIGHT'
          ? new THREE.Color(2.4, 1.25, 0.55)
          : presetKey === 'OVERCAST_RAIN'
            ? new THREE.Color(1.3, 1.4, 1.6)
            : p.sunColor.clone().multiplyScalar(1.8),
    });

    const disposables = [envDomeGeo, envDomeMat, blockGeo, darkSilhouetteMat, accentGlowMat];
    const numBlocks = 26;
    for (let i = 0; i < numBlocks; i++) {
      const ang = (i / numBlocks) * Math.PI * 2;
      if (Math.cos(ang) < -0.68 && i % 2 === 0) continue;
      const radius = 34 + (i % 3) * 4;
      const bw = 4.5 + hash2i(i, 1, 4001) * 5.5;
      const bh = 5.0 + hash2i(i, 2, 4007) * 18.0;
      const bx = Math.cos(ang) * radius;
      const bz = Math.sin(ang) * radius;

      const bMesh = new THREE.Mesh(blockGeo, darkSilhouetteMat);
      bMesh.position.set(bx, bh * 0.5 - 3.0, bz);
      bMesh.scale.set(bw, bh, bw);
      bMesh.lookAt(0, bh * 0.5 - 3.0, 0);
      envScene.add(bMesh);

      const strip = new THREE.Mesh(blockGeo, accentGlowMat);
      strip.position.set(bx * 0.94, bh - 3.4, bz * 0.94);
      strip.scale.set(bw * 0.82, 0.45, 0.45);
      strip.lookAt(0, bh - 3.4, 0);
      envScene.add(strip);
    }

    const nextRT = pmremGenerator.fromScene(envScene, 0.02, 0.1, 120);
    if (currentEnvRT) currentEnvRT.dispose();
    currentEnvRT = nextRT;
    envMap = nextRT.texture;
    scene.environment = envMap;

    for (const d of disposables) d.dispose();
  }

  let quality = 'ULTRA';
  let timeWeather = 'BRIGHT_DAY';
  let fps = 60;
  let fpsAccumFrames = 0;
  let fpsAccumTime = 0;
  let lastPerfTime = typeof performance !== 'undefined' ? performance.now() : 0;
  let internalElapsed = 0;

  let targetBulletTime = 0;
  let currentBulletTime = 0;
  let damageFlashAmount = 0;
  let shakeTrauma = 0;

  let lastSyncedChildCount = -1;
  const lightFwd = new THREE.Vector3();
  const lightRight = new THREE.Vector3();
  const lightUp = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);

  function updateLightBasis(sunDir) {
    lightFwd.copy(sunDir).negate().normalize();
    if (Math.abs(lightFwd.y) > 0.98) {
      lightRight.set(1, 0, 0);
    } else {
      lightRight.crossVectors(worldUp, lightFwd).normalize();
    }
    lightUp.crossVectors(lightFwd, lightRight).normalize();
  }

  function updateStreetlampAssignments(focusX, focusZ, force = false) {
    const p = WEATHER_PRESETS[timeWeather] || WEATHER_PRESETS.BRIGHT_DAY;
    const maxActive =
      p.lampIntensity <= 0.05
        ? 0
        : quality === 'ULTRA'
          ? (isMobileDevice ? 4 : 8)
          : quality === 'HIGH'
            ? (isMobileDevice ? 2 : 4)
            : 0;

    if (maxActive === 0 || registeredStreetlamps.length === 0) {
      for (let i = 0; i < MAX_STREETLAMP_POOL; i++) {
        streetlampPool[i].visible = false;
        streetlampPool[i].intensity = 0;
      }
      return;
    }

    if (!force) {
      const movedSq =
        (focusX - lastLampFocusX) * (focusX - lastLampFocusX) +
        (focusZ - lastLampFocusZ) * (focusZ - lastLampFocusZ);
      if (movedSq < 9.0) {
        for (let i = 0; i < MAX_STREETLAMP_POOL; i++) {
          if (streetlampPool[i].visible) {
            streetlampPool[i].intensity = p.lampIntensity;
          }
        }
        return;
      }
    }

    lastLampFocusX = focusX;
    lastLampFocusZ = focusZ;

    const biasX = focusX - Math.sin(camYaw) * 10;
    const biasZ = focusZ - Math.cos(camYaw) * 10;

    const chosenIdx = [-1, -1, -1, -1, -1, -1, -1, -1];
    const chosenDist = [Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity];

    for (let i = 0, n = registeredStreetlamps.length; i < n; i++) {
      const lp = registeredStreetlamps[i];
      const dx = lp.x - biasX;
      const dz = lp.z - biasZ;
      const dSq = dx * dx + dz * dz;
      if (dSq >= chosenDist[maxActive - 1]) continue;

      let pos = maxActive - 1;
      while (pos > 0 && dSq < chosenDist[pos - 1]) {
        chosenDist[pos] = chosenDist[pos - 1];
        chosenIdx[pos] = chosenIdx[pos - 1];
        pos--;
      }
      chosenDist[pos] = dSq;
      chosenIdx[pos] = i;
    }

    for (let k = 0; k < MAX_STREETLAMP_POOL; k++) {
      const light = streetlampPool[k];
      const idx = k < maxActive ? chosenIdx[k] : -1;
      if (idx >= 0 && chosenDist[k] < 135 * 135) {
        const lp = registeredStreetlamps[idx];
        light.position.set(lp.x, lp.y, lp.z);
        light.intensity = p.lampIntensity;
        light.visible = true;
      } else {
        light.intensity = 0;
        light.visible = false;
      }
    }
  }

  function syncSceneWeatherMaterials() {
    const p = WEATHER_PRESETS[timeWeather] || WEATHER_PRESETS.BRIGHT_DAY;
    const isRain = Boolean(p.rain);
    const activeRoadRoughTex = isRain ? textures.roadRoughnessWet : textures.roadRoughness;

    scene.traverse((obj) => {
      if (!obj || !obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (let i = 0; i < mats.length; i++) {
        const mat = mats[i];
        if (!mat) continue;

        const mapImg = mat.map?.image;
        const normImg = mat.normalMap?.image;

        if (
          (mapImg && roadImages.has(mapImg)) ||
          (normImg && normImg === textures.roadNormal.image)
        ) {
          if ('roughness' in mat) mat.roughness = p.roadRoughness;
          if ('metalness' in mat) mat.metalness = p.roadMetalness;
          if ('roughnessMap' in mat && mat.roughnessMap !== activeRoadRoughTex) {
            const hadRoughMap = Boolean(mat.roughnessMap);
            mat.roughnessMap = activeRoadRoughTex;
            if (!hadRoughMap) mat.needsUpdate = true;
          }
        } else if (mapImg && mapImg === textures.sidewalk.image) {
          if ('roughness' in mat) mat.roughness = isRain ? 0.26 : 0.84;
          if ('metalness' in mat) mat.metalness = isRain ? 0.16 : 0.03;
        }

        if (mapImg && facadeImageToEmissive.has(mapImg) && 'emissiveIntensity' in mat) {
          if (!mat.emissiveMap) {
            const baseEmi = facadeImageToEmissive.get(mapImg);
            const emClone = baseEmi.clone();
            emClone.colorSpace = THREE.SRGBColorSpace;
            emClone.wrapS = mat.map.wrapS;
            emClone.wrapT = mat.map.wrapT;
            emClone.repeat.copy(mat.map.repeat);
            emClone.offset.copy(mat.map.offset);
            emClone.needsUpdate = true;
            mat.emissiveMap = emClone;
            if (mat.emissive && mat.emissive.r === 0 && mat.emissive.g === 0 && mat.emissive.b === 0) {
              mat.emissive.setHex(0xffe4b0);
            }
            mat.needsUpdate = true;
          }
          mat.emissiveIntensity = p.windowEmissive;
        }
      }
    });

    lastSyncedChildCount = scene.children.length;
  }

  function normalizeWeatherMode(mode) {
    if (typeof mode === 'number') {
      return WEATHER_ORDER[((mode % WEATHER_ORDER.length) + WEATHER_ORDER.length) % WEATHER_ORDER.length];
    }
    if (!mode || mode === 'CYCLE' || mode === 'NEXT') {
      const idx = WEATHER_ORDER.indexOf(timeWeather);
      return WEATHER_ORDER[(idx + 1) % WEATHER_ORDER.length];
    }
    const upper = String(mode).toUpperCase().trim();
    if (WEATHER_PRESETS[upper]) return upper;
    if (upper.includes('SUNSET') || upper.includes('GOLD')) return 'SUNSET_GOLD';
    if (upper.includes('RAIN') || upper.includes('OVERCAST') || upper.includes('STORM')) return 'OVERCAST_RAIN';
    if (upper.includes('NIGHT') || upper.includes('NEON')) return 'NEON_NIGHT';
    return 'BRIGHT_DAY';
  }

  function setTimeWeather(mode) {
    const resolved = normalizeWeatherMode(mode);
    timeWeather = resolved;
    const p = WEATHER_PRESETS[resolved];

    skyUniforms.uZenithColor.value.copy(p.zenith);
    skyUniforms.uHorizonColor.value.copy(p.horizon);
    skyUniforms.uGroundColor.value.copy(p.ground);
    skyUniforms.uSunDir.value.copy(p.sunDir);
    skyUniforms.uSunColor.value.copy(p.sunColor);
    skyUniforms.uSunDiscGain.value = p.sunDiscGain;
    skyUniforms.uCloudAmount.value = p.cloudAmount;
    skyUniforms.uCloudDarkness.value = p.cloudDarkness;
    skyUniforms.uStarIntensity.value = p.starIntensity;
    skyUniforms.uMoonIntensity.value = p.moonIntensity;

    sunLight.color.copy(p.sunColor);
    sunLight.intensity = p.sunIntensity;
    updateLightBasis(p.sunDir);

    hemiLight.color.copy(p.hemiSky);
    hemiLight.groundColor.copy(p.hemiGround);
    hemiLight.intensity = p.hemiIntensity;

    scene.fog.color.copy(p.fogColor);
    scene.fog.density = p.fogDensity;
    renderer.setClearColor(p.fogColor, 1);
    renderer.toneMappingExposure = p.exposure;

    cinematicPass.uniforms.uContrast.value = p.contrast;
    cinematicPass.uniforms.uSaturation.value = p.saturation;
    cinematicPass.uniforms.uTint.value.copy(p.tint);

    rainLines.visible = Boolean(p.rain);
    petalInst.visible = Boolean(p.petals);

    rebuildEnvironmentMap(resolved);
    syncSceneWeatherMaterials();
    updateStreetlampAssignments(camera.position.x, camera.position.z, true);

    return timeWeather;
  }

  const mobileQualityKey = 'giangho_dailo_mobile_quality_v1';
  let mobileRenderScale = 0.85;
  let lowFpsStreak = 0;
  let initialWorldMaterialsSynced = false;

  function getTargetPixelRatio(tier) {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    if (tier === 'ULTRA') return Math.min(dpr, 1.15);
    if (tier === 'HIGH') return Math.min(dpr, isMobileDevice ? 0.85 : 1.0);
    return isMobileDevice ? Math.min(dpr, 0.85) : 0.9;
  }

  function setQuality(tier, remember = false) {
    const tiers = ['ULTRA', 'HIGH', 'MOBILE'];
    let next = tier;
    if (!next || String(next).toUpperCase() === 'CYCLE') {
      next = tiers[(tiers.indexOf(quality) + 1) % tiers.length];
    } else {
      const up = String(next).toUpperCase().trim();
      next = up === 'LOW' ? 'MOBILE' : tiers.includes(up) ? up : 'HIGH';
    }
    const prevShadows = renderer.shadowMap.enabled;
    quality = next;
    if (isMobileDevice && remember) {
      try { localStorage.setItem(mobileQualityKey, quality); } catch (_) {}
    }

    if (quality === 'MOBILE') {
      renderer.shadowMap.enabled = false;
      renderer.shadowMap.needsUpdate = false;
      sunLight.castShadow = false;
    } else {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.needsUpdate = true;
      sunLight.castShadow = true;
      const mapDim = quality === 'ULTRA' ? 1024 : 512;
      if (sunLight.shadow.mapSize.width !== mapDim) {
        sunLight.shadow.mapSize.set(mapDim, mapDim);
        if (sunLight.shadow.map) {
          sunLight.shadow.map.dispose();
          sunLight.shadow.map = null;
        }
      }
    }

    if (prevShadows !== renderer.shadowMap.enabled) {
      scene.traverse((obj) => {
        if (obj?.isMesh && obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              if (m) m.needsUpdate = true;
            });
          } else {
            obj.material.needsUpdate = true;
          }
        }
      });
    }

    resize();
    updateStreetlampAssignments(camera.position.x, camera.position.z, true);
    return quality;
  }

  function setBulletTimeVisual(amount) {
    const val = typeof amount === 'boolean' ? (amount ? 1.0 : 0.0) : clamp(Number(amount) || 0, 0, 1);
    targetBulletTime = val;
    if (val > currentBulletTime) {
      currentBulletTime = lerp(currentBulletTime, val, 0.55);
      cinematicPass.uniforms.uBulletTime.value = currentBulletTime;
    }
  }

  function triggerDamageFlash(amount = 0.9) {
    const boost = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0.9;
    damageFlashAmount = clamp(Math.max(damageFlashAmount, boost), 0, 1);
    cinematicPass.uniforms.uDamageFlash.value = damageFlashAmount;
  }

  function addShake(amount = 0.4) {
    const add = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0.4;
    shakeTrauma = clamp(shakeTrauma + add, 0, 1.4);
  }

  function registerStreetlamps(positionsArray) {
    if (!Array.isArray(positionsArray)) return;
    registeredStreetlamps = [];
    for (let i = 0; i < positionsArray.length; i++) {
      const item = positionsArray[i];
      if (!item) continue;
      if (Array.isArray(item)) {
        const x = Number(item[0]);
        const y = Number(item[1] ?? 6.2);
        const z = Number(item[2] ?? item[1] ?? 0);
        if (Number.isFinite(x) && Number.isFinite(z)) {
          registeredStreetlamps.push({ x, y: Number.isFinite(y) ? y : 6.2, z });
        }
      } else {
        const x = Number(item.x);
        const y = Number(item.y ?? 6.2);
        const z = Number(item.z);
        if (Number.isFinite(x) && Number.isFinite(z)) {
          registeredStreetlamps.push({ x, y: Number.isFinite(y) ? y : 6.2, z });
        }
      }
    }
    updateStreetlampAssignments(camera.position.x, camera.position.z, true);
  }

  // ---------------------------------------------------------------------------
  // 5. Third-Person Spring & Over-the-Shoulder Camera
  // ---------------------------------------------------------------------------
  let camYaw = -0.52;
  let camPitch = -0.11;
  let manualOrbitTimer = 0;
  let wasLookingBehind = false;
  let wasRappelling = false;
  let camInitialized = false;

  const smoothLookPos = new THREE.Vector3(26, 1.8, 28);
  const smoothCamPos = new THREE.Vector3(23, 2.8, 33.2);
  let smoothFov = 62;
  let prevCarX = null;
  let prevCarZ = null;
  const focusScratch = new THREE.Vector3();

  function checkSegmentClear(world, x1, y1, z1, x2, y2, z2) {
    if (!world) return true;
    if (typeof world.checkLOS === 'function') {
      return Boolean(world.checkLOS(x1, y1, z1, x2, y2, z2));
    }
    return true;
  }

  function resolveCameraOcclusion(world, tx, ty, tz, desiredX, desiredY, desiredZ) {
    const dx = desiredX - tx;
    const dy = desiredY - ty;
    const dz = desiredZ - tz;
    const fullDist = Math.hypot(dx, dy, dz);
    if (fullDist < 0.05) return { x: desiredX, y: desiredY, z: desiredZ };

    let outX = desiredX, outY = desiredY, outZ = desiredZ;

    if (world && !checkSegmentClear(world, tx, ty, tz, desiredX, desiredY, desiredZ)) {
      let lo = 0.14, hi = 1.0;
      for (let iter = 0; iter < 6; iter++) {
        const mid = (lo + hi) * 0.5;
        if (checkSegmentClear(world, tx, ty, tz, tx + dx * mid, ty + dy * mid, tz + dz * mid)) {
          lo = mid;
        } else {
          hi = mid;
        }
      }
      const safeDist = Math.max(1.05, lo * fullDist - 0.38);
      const ratio = clamp(safeDist / fullDist, 0.15, 1.0);
      outX = tx + dx * ratio;
      outY = ty + dy * ratio;
      outZ = tz + dz * ratio;
    }

    if (world && typeof world.getGroundHeight === 'function') {
      const groundY = world.getGroundHeight(outX, outZ);
      if (Number.isFinite(groundY) && outY < groundY + 0.42) {
        outY = groundY + 0.42;
      }
    }

    return { x: outX, y: outY, z: outZ };
  }

  function getAimRay() {
    camera.updateMatrixWorld();
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3();
    camera.getWorldPosition(origin);
    camera.getWorldDirection(dir).normalize();

    const activeCtx = ctx;
    const world = activeCtx?.world;
    const isRappelling = Boolean(activeCtx?.player?.rappelState?.active);
    let hitDist = 95.0;

    if (!isRappelling && world && typeof world.checkLOS === 'function') {
      const endX = origin.x + dir.x * hitDist;
      const endY = origin.y + dir.y * hitDist;
      const endZ = origin.z + dir.z * hitDist;
      if (!world.checkLOS(origin.x, origin.y, origin.z, endX, endY, endZ)) {
        let lo = 1.0, hi = hitDist;
        for (let i = 0; i < 7; i++) {
          const mid = (lo + hi) * 0.5;
          if (world.checkLOS(origin.x, origin.y, origin.z, origin.x + dir.x * mid, origin.y + dir.y * mid, origin.z + dir.z * mid)) {
            lo = mid;
          } else {
            hi = mid;
          }
        }
        hitDist = Math.max(4.5, hi);
      }
    }

    const targetPoint = origin.clone().addScaledVector(dir, hitDist);
    return { origin, dir, targetPoint };
  }

  function updateCamera(dt = 0.016, overrideCtx) {
    const activeCtx = overrideCtx || ctx;
    const safeDt = typeof dt === 'number' && Number.isFinite(dt) ? clamp(dt, 0.0005, 0.1) : 0.016;

    const player = activeCtx?.player;
    const input = activeCtx?.input;
    const world = activeCtx?.world;

    if (!player) {
      const t = internalElapsed * 0.12;
      camera.position.set(36 + Math.sin(t) * 6, 9.5, 38 + Math.cos(t) * 4);
      camera.lookAt(36, 2.2, -10);
      return;
    }

    const rawDx = Number(input?.camDeltaX) || 0;
    const rawDy = Number(input?.camDeltaY) || 0;
    if (input && ('camDeltaX' in input || 'camDeltaY' in input)) {
      input.camDeltaX = 0;
      input.camDeltaY = 0;
    }

    if (Math.abs(rawDx) > 1e-6 || Math.abs(rawDy) > 1e-6) {
      const isPixelDelta =
        Math.abs(rawDx) >= 0.45 ||
        Math.abs(rawDy) >= 0.45 ||
        Number.isInteger(rawDx) ||
        Number.isInteger(rawDy);
      const sens = isPixelDelta ? 0.0024 : 1.0;
      camYaw = wrapAngle(camYaw - clamp(rawDx * sens, -0.45, 0.45));
      camPitch = clamp(camPitch - clamp(rawDy * sens, -0.35, 0.35), -1.05, 0.58);
      manualOrbitTimer = 1.6;
    } else {
      manualOrbitTimer = Math.max(0, manualOrbitTimer - safeDt);
    }

    const isInCar = Boolean(player.inCar);
    let car = null;
    if (player.inCar && typeof player.inCar === 'object') {
      car = player.inCar;
    } else if (isInCar) {
      car =
        player.car ||
        player.vehicle ||
        activeCtx?.vehicles?.list?.find((v) => v && (v.driver === player || v.isPlayer || v.isPlayerDriving)) ||
        null;
    }

    const rappel = player.rappelState;
    const isRappelling = Boolean(rappel && rappel.active);
    const isAiming = Boolean(player.isAiming || input?.aim || input?.isAiming);
    const lookBehind = Boolean(input?.lookBehind);
    const presetIdx = Number(input?.cameraPreset) || 0;

    const px = Number.isFinite(car?.x) ? car.x : Number.isFinite(player.x) ? player.x : 26;
    const py = Number.isFinite(car?.y) ? car.y : Number.isFinite(player.y) ? player.y : 0.22;
    const pz = Number.isFinite(car?.z) ? car.z : Number.isFinite(player.z) ? player.z : 28;

    let dist = 5.8, pivotHeight = 1.5, offsetRight = 0.35, targetFov = 62;

    if (isRappelling) {
      if (!wasRappelling) {
        camYaw = 0.38;
        camPitch = -0.22;
      }
      if (isAiming) {
        dist = 2.75; pivotHeight = 1.5; offsetRight = 0.78; targetFov = 42;
      } else {
        dist = 4.85; pivotHeight = 1.48; offsetRight = 1.25; targetFov = 65;
      }
    } else if (isInCar) {
      const isHeli = car?.type === 'heli' || car?.archetype === 'heli';
      dist = isHeli ? 10.6 : 7.4;
      pivotHeight = isHeli ? 1.85 : 1.46;
      offsetRight = 0.0;

      if (presetIdx % 3 === 1) {
        dist *= 1.28; pivotHeight *= 1.18;
      } else if (presetIdx % 3 === 2) {
        dist *= 0.8; pivotHeight *= 0.92;
      }

      let vx = Number(car?.vx);
      let vz = Number(car?.vz);
      if (!Number.isFinite(vx) || !Number.isFinite(vz)) {
        if (prevCarX !== null && prevCarZ !== null) {
          vx = (px - prevCarX) / safeDt;
          vz = (pz - prevCarZ) / safeDt;
        } else {
          vx = 0; vz = 0;
        }
      }
      prevCarX = px;
      prevCarZ = pz;

      const speed = Number.isFinite(car?.speed) ? Math.abs(car.speed) : Math.hypot(vx, vz);
      if (manualOrbitTimer <= 0 && Math.hypot(vx, vz) > 1.6 && !lookBehind) {
        const desiredYaw = Math.atan2(-vx, -vz);
        const diff = wrapAngle(desiredYaw - camYaw);
        camYaw = wrapAngle(camYaw + diff * (1 - Math.exp(-3.1 * safeDt)));
        camPitch = lerp(camPitch, isHeli ? -0.18 : -0.12, 1 - Math.exp(-2.4 * safeDt));
      }

      const speedBoost = clamp((speed - 6.0) / 32.0, 0, 1);
      targetFov = isAiming ? 50 : lerp(62, 70, speedBoost);
      if (isAiming) {
        dist = 5.4; offsetRight = 0.45;
      }
    } else {
      prevCarX = null;
      prevCarZ = null;

      if (isAiming) {
        dist = 2.6; pivotHeight = 1.54; offsetRight = 0.62; targetFov = 42;
      } else {
        dist = 5.8; pivotHeight = 1.5; offsetRight = 0.35; targetFov = 62;
        if (presetIdx % 3 === 1) {
          dist = 8.2; pivotHeight = 1.85;
        } else if (presetIdx % 3 === 2) {
          dist = 4.3; pivotHeight = 1.42; offsetRight = 0.44;
        }
      }

      if (player.isDead || (typeof player.hp === 'number' && player.hp <= 0)) {
        dist = 7.2;
        pivotHeight = 1.65;
        camPitch = lerp(camPitch, -0.46, 1 - Math.exp(-2.0 * safeDt));
      }
    }

    wasRappelling = isRappelling;

    const effectiveYaw = lookBehind ? wrapAngle(camYaw + Math.PI) : camYaw;
    const effectivePitch = lookBehind ? -0.1 : camPitch;

    const sinY = Math.sin(effectiveYaw);
    const cosY = Math.cos(effectiveYaw);
    const rightX = cosY;
    const rightZ = -sinY;

    const pivotX = px + rightX * offsetRight;
    const pivotY = py + pivotHeight;
    const pivotZ = pz + rightZ * offsetRight;

    const cosP = Math.cos(effectivePitch);
    const sinP = Math.sin(effectivePitch);
    const lookDirX = -sinY * cosP;
    const lookDirY = sinP;
    const lookDirZ = -cosY * cosP;

    const targetLookX = pivotX + lookDirX * 16.0;
    const targetLookY = pivotY + lookDirY * 16.0;
    const targetLookZ = pivotZ + lookDirZ * 16.0;

    let desiredCamX = pivotX - lookDirX * dist;
    let desiredCamY = pivotY - lookDirY * dist;
    let desiredCamZ = pivotZ - lookDirZ * dist;

    if (isRappelling && Number.isFinite(rappel?.wallZ)) {
      const minExteriorZ = rappel.wallZ + 0.55;
      if (desiredCamZ < minExteriorZ) desiredCamZ = minExteriorZ;
    }

    const occ = resolveCameraOcclusion(world, px, py + 1.38, pz, desiredCamX, desiredCamY, desiredCamZ);

    const lookLerp = !camInitialized || lookBehind !== wasLookingBehind ? 1.0 : 1 - Math.exp(-(isAiming ? 26 : 16) * safeDt);
    const posLerp = !camInitialized || lookBehind !== wasLookingBehind ? 1.0 : 1 - Math.exp(-(isAiming ? 22 : 11) * safeDt);

    smoothLookPos.x = lerp(smoothLookPos.x, targetLookX, lookLerp);
    smoothLookPos.y = lerp(smoothLookPos.y, targetLookY, lookLerp);
    smoothLookPos.z = lerp(smoothLookPos.z, targetLookZ, lookLerp);

    smoothCamPos.x = lerp(smoothCamPos.x, occ.x, posLerp);
    smoothCamPos.y = lerp(smoothCamPos.y, occ.y, posLerp);
    smoothCamPos.z = lerp(smoothCamPos.z, occ.z, posLerp);

    wasLookingBehind = lookBehind;
    camInitialized = true;

    let shakeX = 0, shakeY = 0, shakeZ = 0, shakeRoll = 0;
    if (shakeTrauma > 0.001) {
      const mag = shakeTrauma * shakeTrauma;
      const st = internalElapsed * 37.0;
      shakeX = Math.sin(st * 1.13) * 0.22 * mag;
      shakeY = Math.cos(st * 1.71) * 0.18 * mag;
      shakeZ = Math.sin(st * 1.37 + 1.2) * 0.22 * mag;
      shakeRoll = Math.sin(st * 1.93) * 0.032 * mag;
      shakeTrauma = Math.max(0, shakeTrauma - safeDt * 2.5);
    }

    camera.position.set(smoothCamPos.x + shakeX, smoothCamPos.y + shakeY, smoothCamPos.z + shakeZ);
    camera.lookAt(smoothLookPos.x, smoothLookPos.y, smoothLookPos.z);
    if (Math.abs(shakeRoll) > 1e-5) camera.rotation.z += shakeRoll;

    smoothFov = lerp(smoothFov, targetFov, 1 - Math.exp(-10 * safeDt));
    if (Math.abs(camera.fov - smoothFov) > 0.02) {
      camera.fov = smoothFov;
      camera.updateProjectionMatrix();
    }
  }

  function updateEnvironment(dt = 0.016, arg2, arg3) {
    const safeDt = typeof dt === 'number' && Number.isFinite(dt) ? clamp(dt, 0.0001, 0.1) : 0.016;
    let activeCtx = ctx;
    if (arg2 && typeof arg2 === 'object') activeCtx = arg2;
    else if (arg3 && typeof arg3 === 'object') activeCtx = arg3;

    const simDt = Number.isFinite(activeCtx?.dt) && activeCtx.dt > 0 ? clamp(activeCtx.dt, 0.0001, 0.1) : safeDt;

    if (typeof arg2 === 'number' && Number.isFinite(arg2)) {
      internalElapsed = arg2;
    } else {
      internalElapsed += simDt;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : lastPerfTime + safeDt * 1000;
    const realDt = lastPerfTime > 0 && now > lastPerfTime ? clamp((now - lastPerfTime) * 0.001, 0.0005, 0.25) : safeDt;
    lastPerfTime = now;

    fpsAccumFrames++;
    fpsAccumTime += realDt;
    if (fpsAccumTime >= 0.5) {
      fps = Math.round(fpsAccumFrames / fpsAccumTime);
      fpsAccumFrames = 0;
      fpsAccumTime = 0;

      // Adaptive FPS Guard: automatically step down heavy settings if framerate dips
      const lowFpsThreshold = isMobileDevice ? 40 : 28;
      if (activeCtx?.started && !activeCtx?.paused && fps > 0 && fps < lowFpsThreshold) {
        lowFpsStreak++;
        if (lowFpsStreak >= 4) {
          lowFpsStreak = 0;
          if (quality === 'ULTRA') {
            setQuality('HIGH');
          } else if (quality === 'HIGH') {
            setQuality('MOBILE');
          } else if (isMobileDevice && mobileRenderScale > 0.65) {
            mobileRenderScale = mobileRenderScale > 0.75 ? 0.75 : 0.65;
            renderer.setPixelRatio(getTargetPixelRatio('MOBILE'));
          }
        }
      } else {
        lowFpsStreak = 0;
      }
    }

    if (!initialWorldMaterialsSynced && activeCtx?.world) {
      initialWorldMaterialsSynced = true;
      syncSceneWeatherMaterials();
    }

    skyDome.position.set(camera.position.x, 0, camera.position.z);
    skyUniforms.uTime.value = internalElapsed;
    cinematicPass.uniforms.uTime.value = internalElapsed;

    currentBulletTime = lerp(currentBulletTime, targetBulletTime, 1 - Math.exp(-10.0 * realDt));
    if (currentBulletTime < 0.001 && targetBulletTime === 0) currentBulletTime = 0;
    cinematicPass.uniforms.uBulletTime.value = currentBulletTime;

    if (damageFlashAmount > 0) {
      damageFlashAmount = Math.max(0, damageFlashAmount - realDt * 2.2);
      cinematicPass.uniforms.uDamageFlash.value = damageFlashAmount;
    }

    const player = activeCtx?.player;
    const anchorX = Number.isFinite(player?.x) ? player.x : camera.position.x;
    const anchorZ = Number.isFinite(player?.z) ? player.z : camera.position.z;
    focusScratch.set(anchorX, 0, anchorZ);

    const shadowDim = sunLight.shadow.mapSize.width || 2048;
    const texelWorldSize = (SHADOW_FRUSTUM_HALF * 2) / shadowDim;
    const uSnap = Math.round(focusScratch.dot(lightRight) / texelWorldSize) * texelWorldSize;
    const vSnap = Math.round(focusScratch.dot(lightUp) / texelWorldSize) * texelWorldSize;
    const wDepth = focusScratch.dot(lightFwd);

    sunLight.target.position
      .set(0, 0, 0)
      .addScaledVector(lightRight, uSnap)
      .addScaledVector(lightUp, vSnap)
      .addScaledVector(lightFwd, wDepth);
    sunLight.target.updateMatrixWorld();

    const p = WEATHER_PRESETS[timeWeather] || WEATHER_PRESETS.BRIGHT_DAY;
    sunLight.position.copy(sunLight.target.position).addScaledVector(p.sunDir, 135);

    lampAssignTimer += realDt;
    if (lampAssignTimer >= 0.16) {
      lampAssignTimer = 0;
      updateStreetlampAssignments(anchorX, anchorZ, false);
    }

    // Update 3D Falling Rain
    if (rainLines.visible) {
      const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
      const halfX = RAIN_BOX_X * 0.5, halfZ = RAIN_BOX_Z * 0.5;
      const fallStep = 29.0 * simDt;
      const windX = 2.6 * simDt, windZ = 1.4 * simDt;

      for (let i = 0; i < RAIN_COUNT; i++) {
        const oi = i * 3;
        let dx = rainOffsets[oi] + windX;
        let ry = rainOffsets[oi + 1] - fallStep;
        let dz = rainOffsets[oi + 2] + windZ;

        if (dx > halfX) dx -= RAIN_BOX_X;
        else if (dx < -halfX) dx += RAIN_BOX_X;
        rainOffsets[oi] = dx;

        if (ry < 0) ry += RAIN_BOX_Y;
        rainOffsets[oi + 1] = ry;

        if (dz > halfZ) dz -= RAIN_BOX_Z;
        else if (dz < -halfZ) dz += RAIN_BOX_Z;
        rainOffsets[oi + 2] = dz;

        const wx = cx + dx, wy = cy - 10.0 + ry, wz = cz + dz;
        const vi = i * 6;
        rainPositions[vi] = wx;
        rainPositions[vi + 1] = wy;
        rainPositions[vi + 2] = wz;
        rainPositions[vi + 3] = wx - 0.14;
        rainPositions[vi + 4] = wy + 1.55;
        rainPositions[vi + 5] = wz - 0.08;
      }
      rainGeo.attributes.position.needsUpdate = true;
    }

    // Update 3D Drifting Cherry Blossom Petals (`Hoa Đào Rơi`)
    if (petalInst.visible) {
      const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
      const halfX = PETAL_BOX_X * 0.5, halfZ = PETAL_BOX_Z * 0.5;
      const fallStep = 1.45 * simDt;
      const breezeX = 1.8 * simDt;
      const breezeZ = -0.9 * simDt;

      for (let i = 0; i < PETAL_COUNT; i++) {
        const oi = i * 4;
        const phase = petalOffsets[oi + 3] + internalElapsed * 1.9;
        let dx = petalOffsets[oi] + breezeX + Math.sin(phase) * 0.9 * simDt;
        let ry = petalOffsets[oi + 1] - fallStep;
        let dz = petalOffsets[oi + 2] + breezeZ + Math.cos(phase * 0.8) * 0.9 * simDt;

        if (dx > halfX) dx -= PETAL_BOX_X;
        else if (dx < -halfX) dx += PETAL_BOX_X;
        petalOffsets[oi] = dx;

        if (ry < 0) ry += PETAL_BOX_Y;
        petalOffsets[oi + 1] = ry;

        if (dz > halfZ) dz -= PETAL_BOX_Z;
        else if (dz < -halfZ) dz += PETAL_BOX_Z;
        petalOffsets[oi + 2] = dz;

        petalDummy.position.set(cx + dx, cy - 6.0 + ry, cz + dz);
        petalDummy.rotation.set(phase * 1.1, phase * 0.7, Math.sin(phase) * 0.8);
        petalDummy.updateMatrix();
        petalInst.setMatrixAt(i, petalDummy.matrix);
      }
      petalInst.instanceMatrix.needsUpdate = true;
    }
  }

  let _shadowFrameTick = 0;

  function renderFrame() {
    _shadowFrameTick = (_shadowFrameTick + 1) | 0;
    if (quality === 'ULTRA') {
      renderer.shadowMap.needsUpdate = (_shadowFrameTick & 1) === 0;
    } else if (quality === 'HIGH') {
      renderer.shadowMap.needsUpdate = (_shadowFrameTick & 3) === 0;
    } else {
      renderer.shadowMap.needsUpdate = false;
    }

    const needsPostFX =
      quality !== 'MOBILE' && (quality === 'ULTRA' || currentBulletTime > 0.005 || damageFlashAmount > 0.005);
    if (!needsPostFX) {
      renderer.render(scene, camera);
    } else {
      composer.render();
    }
  }

  function resize(width, height) {
    const w = Math.max(
      1,
      Number(width) ||
        targetCanvas?.clientWidth ||
        (typeof window !== 'undefined' && window.innerWidth) ||
        1280
    );
    const h = Math.max(
      1,
      Number(height) ||
        targetCanvas?.clientHeight ||
        (typeof window !== 'undefined' && window.innerHeight) ||
        720
    );
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    const pr = getTargetPixelRatio(quality);
    const bScale = isMobileDevice ? 0.35 : 0.5;
    if (renderer.getPixelRatio() !== pr) renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    if (quality !== 'MOBILE') {
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
      bloomPass.resolution.set(Math.max(1, Math.round(w * bScale)), Math.max(1, Math.round(h * bScale)));
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => resize());
  }

  let initialQuality = isMobileDevice ? 'MOBILE' : 'HIGH';
  if (isMobileDevice) {
    try { initialQuality = localStorage.getItem(mobileQualityKey) || initialQuality; } catch (_) {}
  }
  setQuality(initialQuality);
  setTimeWeather('BRIGHT_DAY');

  const api = {
    isMobile: isMobileDevice,
    renderer,
    scene,
    camera,
    composer,
    textures,
    get envMap() {
      return envMap;
    },
    get quality() {
      return quality;
    },
    get timeWeather() {
      return timeWeather;
    },
    get fps() {
      return fps;
    },
    get camYaw() {
      return camYaw;
    },
    set camYaw(v) {
      if (typeof v === 'number' && Number.isFinite(v)) camYaw = wrapAngle(v);
    },
    get camPitch() {
      return camPitch;
    },
    set camPitch(v) {
      if (typeof v === 'number' && Number.isFinite(v)) camPitch = clamp(v, -1.05, 0.58);
    },
    setTimeWeather,
    setQuality,
    setBulletTimeVisual,
    triggerDamageFlash,
    addShake,
    registerStreetlamps,
    getAimRay,
    updateEnvironment,
    updateCamera,
    renderFrame,
    resize,
  };

  if (ctx && typeof ctx === 'object') {
    ctx.engine = api;
  }

  return api;
}
