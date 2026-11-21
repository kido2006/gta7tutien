export function buildWorld(ctx, THREE) {
  const AVENUES = [-120, -40, 40, 120, 200];
  const STREETS = [-200, -120, -40, 40, 120, 200];

  const BOULEVARD_X = 40;
  const BOULEVARD_HALF_W = 11;
  const STD_ROAD_HALF_W = 8;
  const ROAD_Y = 0.02;
  const SIDEWALK_Y = 0.22;
  const PIER_DECK_Y = 3.8;

  function createRNG(seed = 20260707) {
    let s = seed >>> 0;
    return function rng() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (edge0, edge1, x) => {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  function extractTexture(entry) {
    if (!entry) return null;
    if (entry.isTexture) return entry;
    if (entry.map && entry.map.isTexture) return entry.map;
    if (entry.diffuse && entry.diffuse.isTexture) return entry.diffuse;
    return null;
  }

  function extractNormalTexture(textures, key, explicitNormalKey) {
    if (explicitNormalKey) {
      const exp = extractTexture(textures?.[explicitNormalKey]);
      if (exp) return exp;
    }
    const entry = textures?.[key];
    if (entry && !entry.isTexture && entry.normalMap?.isTexture) return entry.normalMap;
    return extractTexture(textures?.[`${key}Normal`]);
  }

  function extractEmissiveTexture(textures, key) {
    const entry = textures?.[key];
    if (entry && !entry.isTexture && entry.emissiveMap?.isTexture) return entry.emissiveMap;
    return extractTexture(textures?.[`${key}Emissive`]);
  }

  function makeCanvasTex(w, h, drawFn, isSRGB = true) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    drawFn(g, w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    if (isSRGB) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  function makeTiledBoxGeometry(wx, wy, wz, tileSizeU = 4, tileSizeV = 3.5, tex = null) {
    const geo = new THREE.BoxGeometry(wx, wy, wz);
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const uv = geo.attributes.uv;
    const repX = tex?.repeat?.x || 1;
    const repY = tex?.repeat?.y || 1;

    for (let i = 0; i < pos.count; i++) {
      const nx = Math.abs(norm.getX(i));
      const ny = Math.abs(norm.getY(i));
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (ny > 0.5) {
        uv.setXY(i, ((x + wx * 0.5) / tileSizeU) / repX, ((z + wz * 0.5) / tileSizeU) / repY);
      } else if (nx > 0.5) {
        uv.setXY(i, ((z + wz * 0.5) / tileSizeU) / repX, ((y + wy * 0.5) / tileSizeV) / repY);
      } else {
        uv.setXY(i, ((x + wx * 0.5) / tileSizeU) / repX, ((y + wy * 0.5) / tileSizeV) / repY);
      }
    }
    uv.needsUpdate = true;
    return geo;
  }

  function makeRoadStripGeometry(width, length, alongZ = true, repeatLen = 18, tex = null) {
    const geo = alongZ
      ? new THREE.PlaneGeometry(width, length, 1, 1)
      : new THREE.PlaneGeometry(length, width, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const uv = geo.attributes.uv;
    const pos = geo.attributes.position;
    const repX = tex?.repeat?.x || 1;
    const repY = tex?.repeat?.y || 1;
    const vTiles = Math.max(1, length / repeatLen);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      if (alongZ) {
        uv.setXY(i, (x / width + 0.5) / repX, ((z / length + 0.5) * vTiles) / repY);
      } else {
        uv.setXY(i, (z / width + 0.5) / repX, ((x / length + 0.5) * vTiles) / repY);
      }
    }
    uv.needsUpdate = true;
    return geo;
  }

  // Ornate Wuxia Plaque Signboard Texture (Gold double frame & calligraphic serif title)
  function makeTextSignTexture(title, subtitle, bgHex, fgHex, accentHex = '#f0c35a', w = 512, h = 128) {
    return makeCanvasTex(w, h, (g) => {
      g.fillStyle = bgHex;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = accentHex;
      g.lineWidth = 6;
      g.strokeRect(5, 5, w - 10, h - 10);
      g.lineWidth = 2;
      g.strokeRect(13, 13, w - 26, h - 26);

      // Corner auspicious knot accents
      const cs = 14;
      for (const [cx, cy] of [[13, 13], [w - 13 - cs, 13], [13, h - 13 - cs], [w - 13 - cs, h - 13 - cs]]) {
        g.strokeRect(cx, cy, cs, cs);
      }

      g.fillStyle = fgHex;
      g.font = 'bold 40px Georgia, "Times New Roman", serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(title, w * 0.5, subtitle ? h * 0.40 : h * 0.52);
      if (subtitle) {
        g.fillStyle = accentHex;
        g.font = 'bold 21px "Segoe UI", Arial, sans-serif';
        g.fillText(subtitle, w * 0.5, h * 0.75);
      }
    });
  }

  function getBeachHeight(x, z) {
    if (x >= -128) return SIDEWALK_Y;
    if (x >= -212) {
      const t = (-128 - x) / 84;
      const ripple = Math.sin(z * 0.045) * 0.035 * Math.sin(t * Math.PI);
      return lerp(0.22, -0.30, t) + ripple;
    }
    const deepT = clamp((-212 - x) / 60, 0, 1);
    return lerp(-0.30, -2.20, deepT);
  }

  function isOnPierRamp(x, z) {
    return x >= -152 && x <= -128 && z >= -22 && z <= 2;
  }

  function isOnPierDeck(x, z) {
    if (x >= -198 && x < -152 && z >= -26 && z <= 4) return true;
    if (x >= -295 && x < -198 && z >= -32 && z <= 22) return true;
    return false;
  }

  function isOnPier(x, z) {
    return isOnPierRamp(x, z) || isOnPierDeck(x, z);
  }

  function getPierHeight(x, z) {
    if (isOnPierRamp(x, z)) {
      const t = clamp((-128 - x) / 24, 0, 1);
      return lerp(SIDEWALK_Y, PIER_DECK_Y, t);
    }
    return PIER_DECK_Y;
  }

  function getHillHeight(x, z) {
    if (z >= -225) return SIDEWALK_Y;
    const northT = smoothstep(-225, -262, z);
    const peaks = [
      { px: -145, pz: -315, h: 68, rx: 66, rz: 56 },
      { px: -45, pz: -335, h: 82, rx: 72, rz: 60 },
      { px: 60, pz: -308, h: 70, rx: 64, rz: 50 },
      { px: 165, pz: -332, h: 94, rx: 76, rz: 62 },
      { px: 235, pz: -305, h: 58, rx: 56, rz: 52 },
    ];
    let sum = 26 * smoothstep(-225, -285, z);
    for (let i = 0; i < peaks.length; i++) {
      const p = peaks[i];
      const dx = (x - p.px) / p.rx;
      const dz = (z - p.pz) / p.rz;
      sum += p.h * Math.exp(-(dx * dx + dz * dz));
    }
    const ridgeDetail =
      Math.sin(x * 0.045 + z * 0.03) * 2.8 +
      Math.cos(x * 0.09 - z * 0.07) * 1.4;
    return SIDEWALK_Y + northT * Math.min(95.0, Math.max(0, sum + ridgeDetail));
  }

  function isOnCityRoad(x, z) {
    if (x < -128.2 || x > 216.2 || z < -222 || z > 222) return false;
    for (let i = 0; i < AVENUES.length; i++) {
      const ax = AVENUES[i];
      const hw = ax === BOULEVARD_X ? BOULEVARD_HALF_W : STD_ROAD_HALF_W;
      if (Math.abs(x - ax) <= hw) return true;
    }
    for (let i = 0; i < STREETS.length; i++) {
      const sz = STREETS[i];
      if (Math.abs(z - sz) <= STD_ROAD_HALF_W) {
        if (sz === -40 && x > 128 && x < 192) continue;
        return true;
      }
    }
    return false;
  }

  const scene = ctx?.engine?.scene;
  const isMobile = Boolean(ctx?.isMobile || ctx?.engine?.isMobile);
  const engTextures = ctx?.engine?.textures || {};
  const rng = createRNG(770405);

  const worldRoot = new THREE.Group();
  worldRoot.name = 'WuxiaWorldRoot';
  if (scene) scene.add(worldRoot);

  const tex = {
    roadBoulevard: extractTexture(engTextures.roadBoulevard),
    roadStandard: extractTexture(engTextures.roadStandard),
    roadIntersection: extractTexture(engTextures.roadIntersection),
    roadNormal: extractNormalTexture(engTextures, 'roadStandard', 'roadNormal'),
    sidewalk: extractTexture(engTextures.sidewalk),
    sidewalkNormal: extractNormalTexture(engTextures, 'sidewalk', 'sidewalkNormal'),
    beachSand: extractTexture(engTextures.beachSand),
    beachSandNormal: extractNormalTexture(engTextures, 'beachSand', 'beachSandNormal'),
    woodPier: extractTexture(engTextures.woodPier),
    facadeGlassTower: extractTexture(engTextures.facadeGlassTower),
    facadeGlassTowerEmissive: extractEmissiveTexture(engTextures, 'facadeGlassTower'),
    facadeModernBalcony: extractTexture(engTextures.facadeModernBalcony),
    facadeModernBalconyEmissive: extractEmissiveTexture(engTextures, 'facadeModernBalcony'),
    facadeCommercial: extractTexture(engTextures.facadeCommercial),
    facadeCommercialEmissive: extractEmissiveTexture(engTextures, 'facadeCommercial'),
    facadeBrick: extractTexture(engTextures.facadeBrick),
    facadeBrickEmissive: extractEmissiveTexture(engTextures, 'facadeBrick'),
  };

  const envMap = scene?.environment ? null : ctx?.engine?.envMap || null;

  const mats = {
    roadStd: new THREE.MeshStandardMaterial({
      map: tex.roadStandard,
      normalMap: tex.roadNormal,
      roughness: 0.72,
      metalness: 0.08,
      envMap,
    }),
    roadBlvd: new THREE.MeshStandardMaterial({
      map: tex.roadBoulevard,
      normalMap: tex.roadNormal,
      roughness: 0.66,
      metalness: 0.10,
      envMap,
    }),
    roadInt: new THREE.MeshStandardMaterial({
      map: tex.roadIntersection,
      normalMap: tex.roadNormal,
      roughness: 0.70,
      metalness: 0.08,
      envMap,
    }),
    sidewalk: new THREE.MeshStandardMaterial({
      map: tex.sidewalk,
      normalMap: tex.sidewalkNormal,
      roughness: 0.84,
      metalness: 0.04,
      envMap,
    }),
    curb: new THREE.MeshStandardMaterial({ color: 0x8e9399, roughness: 0.78, metalness: 0.05 }),
    plazaGranite: new THREE.MeshStandardMaterial({
      map: tex.sidewalk,
      color: 0xd0d4da,
      roughness: 0.52,
      metalness: 0.12,
      envMap,
    }),
    beach: new THREE.MeshStandardMaterial({
      map: tex.beachSand,
      normalMap: tex.beachSandNormal,
      roughness: 0.92,
      metalness: 0.02,
    }),
    pierWood: new THREE.MeshStandardMaterial({
      map: tex.woodPier,
      roughness: 0.84,
      metalness: 0.04,
    }),
    glassSkyscraper: isMobile
      ? new THREE.MeshStandardMaterial({
          map: tex.facadeGlassTower,
          emissive: new THREE.Color(0xffffff),
          emissiveMap: tex.facadeGlassTowerEmissive,
          emissiveIntensity: 0.16,
          color: 0x9ac0d6,
          metalness: 0.52,
          roughness: 0.16,
          envMap,
        })
      : new THREE.MeshPhysicalMaterial({
          map: tex.facadeGlassTower,
          emissive: new THREE.Color(0xffffff),
          emissiveMap: tex.facadeGlassTowerEmissive,
          emissiveIntensity: 0.16,
          color: 0x9ac0d6,
          metalness: 0.55,
          roughness: 0.14,
          reflectivity: 0.95,
          clearcoat: 0.75,
          clearcoatRoughness: 0.1,
          envMap,
          envMapIntensity: 1.35,
        }),
    fibCurtainGlass: isMobile
      ? new THREE.MeshStandardMaterial({
          map: tex.facadeGlassTower,
          emissive: new THREE.Color(0xffe5b0),
          emissiveMap: tex.facadeGlassTowerEmissive,
          emissiveIntensity: 0.20,
          color: 0x678ea8,
          metalness: 0.62,
          roughness: 0.12,
          envMap,
        })
      : new THREE.MeshPhysicalMaterial({
          map: tex.facadeGlassTower,
          emissive: new THREE.Color(0xffe5b0),
          emissiveMap: tex.facadeGlassTowerEmissive,
          emissiveIntensity: 0.20,
          color: 0x678ea8,
          metalness: 0.68,
          roughness: 0.10,
          clearcoat: 1.0,
          clearcoatRoughness: 0.06,
          envMap,
          envMapIntensity: 1.55,
        }),
    clearAtriumGlass: isMobile
      ? new THREE.MeshStandardMaterial({
          color: 0x9ad8f5,
          metalness: 0.15,
          roughness: 0.10,
          transparent: true,
          opacity: 0.36,
          side: THREE.DoubleSide,
        })
      : new THREE.MeshPhysicalMaterial({
          color: 0x9ad8f5,
          metalness: 0.15,
          roughness: 0.06,
          transparent: true,
          opacity: 0.34,
          clearcoat: 1.0,
          side: THREE.DoubleSide,
          envMap,
          envMapIntensity: 1.4,
        }),
    balconyGlass: isMobile
      ? new THREE.MeshStandardMaterial({
          color: 0x7bd4c8,
          metalness: 0.12,
          roughness: 0.12,
          transparent: true,
          opacity: 0.46,
          side: THREE.DoubleSide,
        })
      : new THREE.MeshPhysicalMaterial({
          color: 0x7bd4c8,
          metalness: 0.12,
          roughness: 0.08,
          transparent: true,
          opacity: 0.46,
          side: THREE.DoubleSide,
          envMap,
        }),
    modernTower: new THREE.MeshStandardMaterial({
      map: tex.facadeModernBalcony,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: tex.facadeModernBalconyEmissive,
      emissiveIntensity: 0.14,
      color: 0xf2ece0,
      roughness: 0.48,
      metalness: 0.12,
      envMap,
    }),
    commercialWall: new THREE.MeshStandardMaterial({
      map: tex.facadeCommercial,
      emissive: new THREE.Color(0xffe6b8),
      emissiveMap: tex.facadeCommercialEmissive,
      emissiveIntensity: 0.14,
      roughness: 0.72,
      metalness: 0.08,
    }),
    brickWall: new THREE.MeshStandardMaterial({
      map: tex.facadeBrick,
      emissive: new THREE.Color(0xffdca0),
      emissiveMap: tex.facadeBrickEmissive,
      emissiveIntensity: 0.12,
      roughness: 0.80,
      metalness: 0.05,
    }),
    limestone: new THREE.MeshStandardMaterial({ color: 0xd8d1c4, roughness: 0.60, metalness: 0.1 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x242830, roughness: 0.35, metalness: 0.78, envMap }),
    silverSteel: new THREE.MeshStandardMaterial({ color: 0xbac4cf, roughness: 0.26, metalness: 0.85, envMap }),
    whiteArch: new THREE.MeshStandardMaterial({ color: 0xf2eee6, roughness: 0.45, metalness: 0.10 }),
    hedgeGreen: new THREE.MeshStandardMaterial({ color: 0x296b38, roughness: 0.86, metalness: 0.02 }),
    grassMedian: new THREE.MeshStandardMaterial({ color: 0x357d3e, roughness: 0.86, metalness: 0.02 }),
    roofDark: new THREE.MeshStandardMaterial({ color: 0x262c36, roughness: 0.78, metalness: 0.16 }),
    // Wuxia Architectural Materials
    vermilionWood: new THREE.MeshStandardMaterial({ color: 0x8f1d25, roughness: 0.42, metalness: 0.15 }),
    imperialGold: new THREE.MeshStandardMaterial({ color: 0xe6b645, roughness: 0.24, metalness: 0.86, envMap }),
    pagodaTileCrimson: new THREE.MeshStandardMaterial({ color: 0x781921, roughness: 0.36, metalness: 0.22, envMap }),
    pagodaTileJade: new THREE.MeshStandardMaterial({ color: 0x194a48, roughness: 0.34, metalness: 0.25, envMap }),
    pagodaTileSlate: new THREE.MeshStandardMaterial({ color: 0x222a36, roughness: 0.38, metalness: 0.28, envMap }),
    darkWalnut: new THREE.MeshStandardMaterial({ color: 0x3b2218, roughness: 0.62, metalness: 0.08 }),
    lanternSilk: new THREE.MeshStandardMaterial({
      color: 0xff2b2b,
      emissive: new THREE.Color(0xff4f1f),
      emissiveIntensity: 1.45,
      roughness: 0.35,
    }),
  };

  const windowMaterials = [
    mats.glassSkyscraper,
    mats.fibCurtainGlass,
    mats.modernTower,
    mats.commercialWall,
    mats.brickWall,
  ];

  // ==========================================================================
  // 1. Spatial-Hashed AABB Collision World
  // ==========================================================================
  const CELL_SIZE = 24;
  const aabbs = [];
  const spatialCells = new Map();
  let queryStamp = 1;
  const queryBuffer = [];

  const cellKey = (cx, cz) => `${cx},${cz}`;

  function addAABB(minX, maxX, minZ, maxZ, maxY, minY = 0, tag = 'solid') {
    if (maxX <= minX || maxZ <= minZ) return null;
    const box = { minX, maxX, minZ, maxZ, maxY, minY, tag, _stamp: 0 };
    aabbs.push(box);
    const cMinX = Math.floor(minX / CELL_SIZE);
    const cMaxX = Math.floor(maxX / CELL_SIZE);
    const cMinZ = Math.floor(minZ / CELL_SIZE);
    const cMaxZ = Math.floor(maxZ / CELL_SIZE);
    for (let cx = cMinX; cx <= cMaxX; cx++) {
      for (let cz = cMinZ; cz <= cMaxZ; cz++) {
        const k = cellKey(cx, cz);
        let bucket = spatialCells.get(k);
        if (!bucket) {
          bucket = [];
          spatialCells.set(k, bucket);
        }
        bucket.push(box);
      }
    }
    return box;
  }

  function queryAABBs(minX, maxX, minZ, maxZ) {
    queryBuffer.length = 0;
    queryStamp = (queryStamp + 1) | 0;
    if (queryStamp <= 0) {
      queryStamp = 1;
      for (let i = 0; i < aabbs.length; i++) aabbs[i]._stamp = 0;
    }
    const cMinX = Math.floor(minX / CELL_SIZE);
    const cMaxX = Math.floor(maxX / CELL_SIZE);
    const cMinZ = Math.floor(minZ / CELL_SIZE);
    const cMaxZ = Math.floor(maxZ / CELL_SIZE);

    for (let cx = cMinX; cx <= cMaxX; cx++) {
      for (let cz = cMinZ; cz <= cMaxZ; cz++) {
        const bucket = spatialCells.get(cellKey(cx, cz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const b = bucket[i];
          if (b._stamp === queryStamp) continue;
          b._stamp = queryStamp;
          if (b.maxX >= minX && b.minX <= maxX && b.maxZ >= minZ && b.minZ <= maxZ) {
            queryBuffer.push(b);
          }
        }
      }
    }
    return queryBuffer;
  }

  function addStaticMesh(geo, mat, x, y, z, castShadow = true, receiveShadow = true, parent = worldRoot) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = castShadow;
    m.receiveShadow = receiveShadow;
    m.matrixAutoUpdate = false;
    m.updateMatrix();
    parent.add(m);
    return m;
  }

  // ==========================================================================
  // WUXIA PAGODA ROOF & GRAND PAIFANG ARCHWAY BUILDERS
  // ==========================================================================
  const sharedEaveHornGeo = new THREE.ConeGeometry(0.32, 2.3, 5);
  const sharedFinialGeo = new THREE.ConeGeometry(0.45, 2.1, 8);

  /**
   * Crowns any rectangular building with an authentic Wuxia pagoda roof:
   * flared glazed eaves, 4 upturned dragon-tail corners (mái đao cong), and golden ridge trim!
   */
  function addPagodaRoof(cx, baseY, cz, w, d, style = 'crimson', addSpire = true) {
    const tileMat =
      style === 'jade'
        ? mats.pagodaTileJade
        : style === 'slate'
          ? mats.pagodaTileSlate
          : mats.pagodaTileCrimson;

    const eaveOverhang = 2.2;
    const rw = w + eaveOverhang * 2;
    const rd = d + eaveOverhang * 2;
    const roofH = Math.min(4.2, Math.max(1.8, Math.min(w, d) * 0.13));

    // Vermilion wooden bracket frieze (Đấu củng) right under the roof eaves
    addStaticMesh(new THREE.BoxGeometry(w + 0.5, 0.55, d + 0.5), mats.vermilionWood, cx, baseY + 0.25, cz, false, true);

    // Flared lower eave skirt
    addStaticMesh(new THREE.BoxGeometry(rw, 0.34, rd), tileMat, cx, baseY + 0.62, cz, true, true);

    // Golden eave perimeter trim
    addStaticMesh(new THREE.BoxGeometry(rw + 0.12, 0.12, rd + 0.12), mats.imperialGold, cx, baseY + 0.46, cz, false, false);

    // Pitched 4-sided pyramid/hipped roof body
    const radius = Math.hypot(rw * 0.5, rd * 0.5);
    const pyrGeo = new THREE.ConeGeometry(1, roofH, 4);
    pyrGeo.rotateY(Math.PI / 4);
    const pyr = new THREE.Mesh(pyrGeo, tileMat);
    pyr.scale.set((rw * 0.5) * Math.SQRT2 * 0.94, 1, (rd * 0.5) * Math.SQRT2 * 0.94);
    pyr.position.set(cx, baseY + 0.78 + roofH * 0.5, cz);
    pyr.castShadow = true;
    pyr.receiveShadow = true;
    worldRoot.add(pyr);

    // Golden top ridge beam
    const ridgeHorizontal = rw >= rd;
    const ridgeLen = Math.max(2.0, Math.abs(rw - rd) * 0.55 + 2.5);
    addStaticMesh(
      new THREE.BoxGeometry(ridgeHorizontal ? ridgeLen : 0.48, 0.42, ridgeHorizontal ? 0.48 : ridgeLen),
      mats.imperialGold,
      cx,
      baseY + 0.72 + roofH,
      cz,
      false,
      false
    );

    if (addSpire) {
      addStaticMesh(sharedFinialGeo, mats.imperialGold, cx, baseY + 0.75 + roofH + 0.95, cz, false, false);
    }

    // 4 Iconic Upturned Dragon-Tail Corner Eaves (`Mái đao cong vút 4 góc`)
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const horn = new THREE.Mesh(sharedEaveHornGeo, mats.imperialGold);
        horn.position.set(cx + sx * (rw * 0.49), baseY + 1.05, cz + sz * (rd * 0.49));
        const diagAngle = Math.atan2(sx, sz);
        horn.rotation.y = diagAngle;
        horn.rotation.x = -0.68; // Curved dramatically outward & upward!
        worldRoot.add(horn);
      }
    }
  }

  /**
   * Builds a monumental 3D Vermilion & Gold Cổng Tam Quan (Paifang Gate) spanning across a road/promenade
   * with high >9.6m clearance so trucks & helicopters pass effortlessly.
   */
  function buildPaifangGate(cx, baseY, cz, spanWidth, alongZAxis, title, subtitle) {
    const grp = new THREE.Group();
    grp.position.set(cx, baseY, cz);
    if (!alongZAxis) grp.rotation.y = Math.PI / 2;
    worldRoot.add(grp);

    const halfSpan = spanWidth * 0.5;
    const pillarH = 9.8;

    // 4 Vermilion pillars with carved stone drum bases (placed outside roadway!)
    const pillarOffsets = [-halfSpan - 2.6, -halfSpan, halfSpan, halfSpan + 2.6];
    for (let i = 0; i < pillarOffsets.length; i++) {
      const px = pillarOffsets[i];
      const ph = i === 1 || i === 2 ? pillarH : pillarH * 0.80;
      addStaticMesh(new THREE.CylinderGeometry(0.55, 0.65, 0.9, 12), mats.limestone, px, 0.45, 0, true, true, grp);
      addStaticMesh(new THREE.CylinderGeometry(0.38, 0.42, ph, 12), mats.vermilionWood, px, ph * 0.5 + 0.4, 0, true, true, grp);
    }

    // Main center crossbeams & carved gold lintel
    addStaticMesh(new THREE.BoxGeometry(spanWidth + 1.2, 0.65, 0.75), mats.vermilionWood, 0, pillarH - 0.6, 0, true, true, grp);
    addStaticMesh(new THREE.BoxGeometry(spanWidth + 6.4, 0.55, 0.68), mats.vermilionWood, 0, pillarH * 0.76, 0, true, true, grp);
    addStaticMesh(new THREE.BoxGeometry(spanWidth + 6.6, 0.18, 0.76), mats.imperialGold, 0, pillarH * 0.76 + 0.34, 0, false, false, grp);

    // Center Pagoda Roof Cap + 2 Side Wing Pagoda Roof Caps
    const centerRoofW = spanWidth + 2.8;
    addStaticMesh(new THREE.BoxGeometry(centerRoofW, 0.38, 3.2), mats.pagodaTileCrimson, 0, pillarH + 0.55, 0, true, true, grp);
    addStaticMesh(new THREE.BoxGeometry(centerRoofW + 0.2, 0.14, 3.35), mats.imperialGold, 0, pillarH + 0.35, 0, false, false, grp);
    addStaticMesh(new THREE.BoxGeometry(centerRoofW * 0.82, 0.45, 1.4), mats.pagodaTileCrimson, 0, pillarH + 0.95, 0, true, false, grp);
    addStaticMesh(new THREE.BoxGeometry(centerRoofW * 0.78, 0.26, 0.42), mats.imperialGold, 0, pillarH + 1.28, 0, false, false, grp);

    // Upturned corner horns on center gate roof
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const horn = new THREE.Mesh(sharedEaveHornGeo, mats.imperialGold);
        horn.position.set(sx * (centerRoofW * 0.5), pillarH + 0.92, sz * 1.55);
        horn.rotation.y = Math.atan2(sx, sz);
        horn.rotation.x = -0.65;
        grp.add(horn);
      }
      // Side wing roofs
      const wingX = sx * (halfSpan + 1.35);
      addStaticMesh(new THREE.BoxGeometry(3.8, 0.32, 2.6), mats.pagodaTileJade, wingX, pillarH * 0.82 + 0.3, 0, true, true, grp);
      addStaticMesh(new THREE.BoxGeometry(3.9, 0.12, 2.7), mats.imperialGold, wingX, pillarH * 0.82 + 0.12, 0, false, false, grp);

      // Hanging Glowing Red Silk Lanterns under the gate!
      const lanternX = sx * (halfSpan - 1.4);
      addStaticMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), mats.imperialGold, lanternX, pillarH - 1.2, 0, false, false, grp);
      addStaticMesh(new THREE.SphereGeometry(0.42, 12, 10), mats.lanternSilk, lanternX, pillarH - 1.75, 0, false, false, grp);
    }

    // Calligraphic Plaque Signboard (Double-sided)
    const plaqueTex = makeTextSignTexture(title, subtitle, '#1b0d12', '#fff4d2', '#f0c35a', 512, 128);
    const plaqueMat = new THREE.MeshStandardMaterial({
      map: plaqueTex,
      emissive: 0xffffff,
      emissiveMap: plaqueTex,
      emissiveIntensity: 0.75,
      roughness: 0.3,
    });
    for (const side of [-1, 1]) {
      const pMesh = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 2.4), plaqueMat);
      pMesh.position.set(0, pillarH - 0.55, side * 0.42);
      if (side < 0) pMesh.rotation.y = Math.PI;
      grp.add(pMesh);
    }
  }

  // ==========================================================================
  // 2. City Ground Apron, Street Grid & Đại Lộ Chu Tước
  // ==========================================================================
  const urbanBaseGeo = new THREE.PlaneGeometry(395, 485);
  urbanBaseGeo.rotateX(-Math.PI / 2);
  addStaticMesh(urbanBaseGeo, mats.curb, 68, 0.0, 0, false, true);

  const crosswalkTransforms = [];
  const streetlampPositions = [];
  const cherryTreePositions = [];
  const bambooClusterPositions = [];
  const palmPositions = [];

  for (let ai = 0; ai < AVENUES.length; ai++) {
    const ax = AVENUES[ai];
    const isBlvd = ax === BOULEVARD_X;
    const width = isBlvd ? BOULEVARD_HALF_W * 2 : STD_ROAD_HALF_W * 2;
    const roadMat = isBlvd ? mats.roadBlvd : mats.roadStd;
    const roadTex = isBlvd ? tex.roadBoulevard : tex.roadStandard;

    const zStops = [-225, ...STREETS, 232];
    for (let si = 0; si < zStops.length - 1; si++) {
      const zA = si === 0 ? zStops[si] : zStops[si] + STD_ROAD_HALF_W;
      const zB = si === zStops.length - 2 ? zStops[si + 1] : zStops[si + 1] - STD_ROAD_HALF_W;
      const segLen = zB - zA;
      if (segLen <= 0.5) continue;
      const cz = (zA + zB) * 0.5;
      const geo = makeRoadStripGeometry(width, segLen, true, 18, roadTex);
      addStaticMesh(geo, roadMat, ax, ROAD_Y, cz, false, true);

      // Landscaped Oriental Garden Median Islands along Hero Avenue X = +40 ("Đại Lộ Chu Tước")
      if (isBlvd && si >= 1 && si <= STREETS.length - 1) {
        const medLen = segLen - 12;
        if (medLen > 12) {
          addStaticMesh(new THREE.BoxGeometry(2.1, 0.18, medLen), mats.curb, ax, 0.11, cz, false, true);
          addStaticMesh(new THREE.BoxGeometry(1.65, 0.08, medLen - 1.2), mats.grassMedian, ax, 0.22, cz, false, true);

          for (let mz = zA + 12; mz <= zB - 12; mz += 15) {
            if (Math.round(mz) % 30 === 0) {
              cherryTreePositions.push({ x: ax, y: 0.22, z: mz, scale: 1.15 + rng() * 0.22 });
            } else {
              bambooClusterPositions.push({ x: ax, y: 0.22, z: mz, scale: 1.0 + rng() * 0.25 });
            }
          }
          streetlampPositions.push({ x: ax, y: 0.22, z: cz, yaw: 0, doubleArm: true });
          addAABB(ax - 0.35, ax + 0.35, cz - 0.35, cz + 0.35, 7.5, 0, 'lamp_post');
        }
      }

      const lampEdge = isBlvd ? BOULEVARD_HALF_W + 1.1 : STD_ROAD_HALF_W + 1.0;
      streetlampPositions.push({ x: ax - lampEdge, y: SIDEWALK_Y, z: cz - segLen * 0.24, yaw: 0, doubleArm: false });
      addAABB(ax - lampEdge - 0.32, ax - lampEdge + 0.32, cz - segLen * 0.24 - 0.32, cz - segLen * 0.24 + 0.32, 7.5, 0, 'lamp_post');
      streetlampPositions.push({ x: ax + lampEdge, y: SIDEWALK_Y, z: cz + segLen * 0.24, yaw: Math.PI, doubleArm: false });
      addAABB(ax + lampEdge - 0.32, ax + lampEdge + 0.32, cz + segLen * 0.24 - 0.32, cz + segLen * 0.24 + 0.32, 7.5, 0, 'lamp_post');
    }
  }

  // Grand Paifang / Cổng Tam Quan Archways over Đại Lộ Chu Tước (X = +40, spanWidth = 24.4m > 22m road!)
  buildPaifangGate(40, SIDEWALK_Y, 6.0, 24.4, true, 'ĐẠI LỘ CHU TƯỚC', 'TÂN VÕ LÂM ĐÔ THỊ');
  buildPaifangGate(40, SIDEWALK_Y, -96.0, 24.4, true, 'THIÊN HẠ THÁI BÌNH', 'HUYNH ĐỆ TƯƠNG PHÙNG');

  // Horizontal Streets
  for (let si = 0; si < STREETS.length; si++) {
    const sz = STREETS[si];
    const width = STD_ROAD_HALF_W * 2;
    const xStops = [-128, ...AVENUES, 246];

    for (let ai = 0; ai < xStops.length - 1; ai++) {
      const leftHalf = ai === 0 ? 0 : (xStops[ai] === BOULEVARD_X ? BOULEVARD_HALF_W : STD_ROAD_HALF_W);
      const rightHalf = ai === xStops.length - 2 ? 0 : (xStops[ai + 1] === BOULEVARD_X ? BOULEVARD_HALF_W : STD_ROAD_HALF_W);
      const xA = xStops[ai] + leftHalf;
      const xB = xStops[ai + 1] - rightHalf;
      if (sz === -40 && xA >= 127.5 && xB <= 192.5) continue;

      const segLen = xB - xA;
      if (segLen <= 0.5) continue;
      const cx = (xA + xB) * 0.5;
      const geo = makeRoadStripGeometry(width, segLen, false, 18, tex.roadStandard);
      addStaticMesh(geo, mats.roadStd, cx, ROAD_Y, sz, false, true);
    }
  }

  // Intersection Pads & Crosswalks
  for (let ai = 0; ai < AVENUES.length; ai++) {
    const ax = AVENUES[ai];
    const hwX = ax === BOULEVARD_X ? BOULEVARD_HALF_W : STD_ROAD_HALF_W;
    for (let si = 0; si < STREETS.length; si++) {
      const sz = STREETS[si];
      const hwZ = STD_ROAD_HALF_W;
      const intGeo = makeRoadStripGeometry(hwX * 2, hwZ * 2, true, hwZ * 2, tex.roadIntersection);
      addStaticMesh(intGeo, mats.roadInt, ax, ROAD_Y + 0.002, sz, false, true);

      const stripeCountNS = Math.floor((hwX * 2 - 2) / 1.55);
      for (let k = 0; k < stripeCountNS; k++) {
        const sx = ax - hwX + 1.4 + k * 1.55;
        crosswalkTransforms.push({ x: sx, z: sz - hwZ - 1.6, w: 0.72, l: 2.6 });
        crosswalkTransforms.push({ x: sx, z: sz + hwZ + 1.6, w: 0.72, l: 2.6 });
      }
      const skipEastCrosswalk = sz === -40 && ax === 120;
      const skipWestCrosswalk = sz === -40 && ax === 200;
      const stripeCountEW = Math.floor((hwZ * 2 - 2) / 1.55);
      for (let k = 0; k < stripeCountEW; k++) {
        const zz = sz - hwZ + 1.4 + k * 1.55;
        if (!skipWestCrosswalk) crosswalkTransforms.push({ x: ax - hwX - 1.6, z: zz, w: 2.6, l: 0.72 });
        if (!skipEastCrosswalk) crosswalkTransforms.push({ x: ax + hwX + 1.6, z: zz, w: 2.6, l: 0.72 });
      }
    }
  }

  {
    const cwGeo = new THREE.PlaneGeometry(1, 1);
    cwGeo.rotateX(-Math.PI / 2);
    const cwMat = new THREE.MeshStandardMaterial({
      color: 0xe6dec8,
      roughness: 0.65,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const cwInst = new THREE.InstancedMesh(cwGeo, cwMat, crosswalkTransforms.length);
    cwInst.receiveShadow = true;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < crosswalkTransforms.length; i++) {
      const c = crosswalkTransforms[i];
      dummy.position.set(c.x, ROAD_Y + 0.008, c.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(c.w, 1, c.l);
      dummy.updateMatrix();
      cwInst.setMatrixAt(i, dummy.matrix);
    }
    cwInst.instanceMatrix.needsUpdate = true;
    worldRoot.add(cwInst);
  }

  // ==========================================================================
  // 3. Road Graph & Traffic Lights
  // ==========================================================================
  const roadNodes = [];
  const roadEdges = [];
  const nodeGridMap = new Map();

  for (let ai = 0; ai < AVENUES.length; ai++) {
    for (let si = 0; si < STREETS.length; si++) {
      const x = AVENUES[ai], z = STREETS[si];
      const id = roadNodes.length;
      const node = {
        id, index: id, x, z, ai, si,
        isBoulevard: x === BOULEVARD_X,
        roadWidth: x === BOULEVARD_X ? 22 : 16,
        neighbors: [], neighborIds: [], edges: [],
        toString() { return String(this.id); },
        valueOf() { return this.id; },
      };
      roadNodes.push(node);
      nodeGridMap.set(`${ai},${si}`, node);
    }
  }

  function linkNodes(nA, nB, width) {
    const dist = Math.hypot(nB.x - nA.x, nB.z - nA.z);
    const edgeAB = { from: nA.id, to: nB.id, a: nA, b: nB, x1: nA.x, z1: nA.z, x2: nB.x, z2: nB.z, length: dist, width, lanes: width > 18 ? 4 : 2 };
    roadEdges.push(edgeAB);
    nA.neighbors.push(nB); nA.neighborIds.push(nB.id); nA.edges.push(edgeAB);

    const edgeBA = { from: nB.id, to: nA.id, a: nB, b: nA, x1: nB.x, z1: nB.z, x2: nA.x, z2: nA.z, length: dist, width, lanes: width > 18 ? 4 : 2 };
    roadEdges.push(edgeBA);
    nB.neighbors.push(nA); nB.neighborIds.push(nA.id); nB.edges.push(edgeBA);
  }

  for (let ai = 0; ai < AVENUES.length; ai++) {
    for (let si = 0; si < STREETS.length; si++) {
      const cur = nodeGridMap.get(`${ai},${si}`);
      if (si + 1 < STREETS.length) linkNodes(cur, nodeGridMap.get(`${ai},${si + 1}`), AVENUES[ai] === BOULEVARD_X ? 22 : 16);
      if (ai + 1 < AVENUES.length) {
        if (!(STREETS[si] === -40 && AVENUES[ai] === 120 && AVENUES[ai + 1] === 200)) {
          linkNodes(cur, nodeGridMap.get(`${ai + 1},${si}`), 16);
        }
      }
    }
  }

  const roadGraph = {
    nodes: roadNodes,
    edges: roadEdges,
    avenues: AVENUES.slice(),
    streets: STREETS.slice(),
    getNearestNode(x, z) {
      let best = roadNodes[0], bestD2 = Infinity;
      for (let i = 0; i < roadNodes.length; i++) {
        const n = roadNodes[i];
        const d2 = (n.x - x) ** 2 + (n.z - z) ** 2;
        if (d2 < bestD2) { bestD2 = d2; best = n; }
      }
      return best;
    },
    getNeighbors(nodeOrId) {
      const n = typeof nodeOrId === 'number' ? roadNodes[nodeOrId] : nodeOrId;
      return n ? n.neighbors : [];
    },
    getRandomNode() {
      return roadNodes[Math.floor(Math.random() * roadNodes.length)];
    },
    getLaneOffset(x1, z1, x2, z2) {
      const isBlvd = Math.abs(x1 - BOULEVARD_X) < 1 && Math.abs(x2 - BOULEVARD_X) < 1;
      return isBlvd ? 4.8 : 3.8;
    },
  };

  const trafficLights = [];
  const signalRedOff = new THREE.Color(0x2a0707);
  const signalRedOn = new THREE.Color(0xff2020);
  const signalYelOff = new THREE.Color(0x2c2005);
  const signalYelOn = new THREE.Color(0xffbf18);
  const signalGrnOff = new THREE.Color(0x062912);
  const signalGrnOn = new THREE.Color(0x18f08a);

  const mastPoleGeo = new THREE.CylinderGeometry(0.14, 0.18, 6.2, 8);
  const mastArmGeo = new THREE.CylinderGeometry(0.09, 0.12, 7.6, 8);
  mastArmGeo.rotateZ(Math.PI / 2);
  const signalBoxGeo = new THREE.BoxGeometry(0.46, 1.24, 0.36);
  const lensGeo = new THREE.SphereGeometry(0.13, 8, 8);

  const sharedSignalBanks = [0, 1].map(() => ({
    matR: new THREE.MeshStandardMaterial({ color: 0x330808, emissive: signalRedOn.clone(), roughness: 0.3 }),
    matY: new THREE.MeshStandardMaterial({ color: 0x332406, emissive: signalYelOff.clone(), roughness: 0.3 }),
    matG: new THREE.MeshStandardMaterial({ color: 0x063014, emissive: signalGrnOff.clone(), roughness: 0.3 }),
    matR2: new THREE.MeshStandardMaterial({ color: 0x330808, emissive: signalRedOff.clone(), roughness: 0.3 }),
    matY2: new THREE.MeshStandardMaterial({ color: 0x332406, emissive: signalYelOff.clone(), roughness: 0.3 }),
    matG2: new THREE.MeshStandardMaterial({ color: 0x063014, emissive: signalGrnOn.clone(), roughness: 0.3 }),
  }));

  function buildTrafficSignalRig(ix, iz, hwX, hwZ, bankIdx) {
    const bank = sharedSignalBanks[bankIdx & 1];
    const phaseOffset = (bankIdx & 1) === 0 ? 0 : 12.0;
    const nsBulbs = { r: [bank.matR], y: [bank.matY], g: [bank.matG] };
    const ewBulbs = { r: [bank.matR2], y: [bank.matY2], g: [bank.matG2] };

    const corners = [
      { px: ix + hwX + 1.2, pz: iz + hwZ + 1.2, armDirX: -1, armDirZ: 0, isNS: true },
      { px: ix - hwX - 1.2, pz: iz - hwZ - 1.2, armDirX: 1, armDirZ: 0, isNS: true },
      { px: ix + hwX + 1.2, pz: iz - hwZ - 1.2, armDirX: 0, armDirZ: 1, isNS: false },
      { px: ix - hwX - 1.2, pz: iz + hwZ + 1.2, armDirX: 0, armDirZ: -1, isNS: false },
    ];

    const { matR, matY, matG, matR2, matY2, matG2 } = bank;

    for (let c = 0; c < corners.length; c++) {
      const cfg = corners[c];
      if (!cfg.isNS && iz === -40 && ix === 120 && cfg.px > ix) continue;

      addStaticMesh(mastPoleGeo, mats.vermilionWood, cfg.px, SIDEWALK_Y + 3.1, cfg.pz, true, false);
      const arm = new THREE.Mesh(mastArmGeo, mats.imperialGold);
      if (cfg.armDirX !== 0) {
        arm.position.set(cfg.px + cfg.armDirX * 3.6, SIDEWALK_Y + 5.85, cfg.pz);
      } else {
        arm.rotation.y = Math.PI / 2;
        arm.position.set(cfg.px, SIDEWALK_Y + 5.85, cfg.pz + cfg.armDirZ * 3.6);
      }
      worldRoot.add(arm);

      const bx = cfg.px + cfg.armDirX * 3.2;
      const bz = cfg.pz + cfg.armDirZ * 3.2;
      const by = SIDEWALK_Y + 5.45;
      const box = new THREE.Mesh(signalBoxGeo, mats.darkSteel);
      if (!cfg.isNS) box.rotation.y = Math.PI / 2;
      box.position.set(bx, by, bz);
      worldRoot.add(box);

      const bulbMats = cfg.isNS ? [matR, matY, matG] : [matR2, matY2, matG2];
      const offsets = [0.36, 0, -0.36];
      for (let li = 0; li < 3; li++) {
        for (const side of [-1, 1]) {
          const lens = new THREE.Mesh(lensGeo, bulbMats[li]);
          if (cfg.isNS) lens.position.set(bx, by + offsets[li], bz + side * 0.18);
          else lens.position.set(bx + side * 0.18, by + offsets[li], bz);
          worldRoot.add(lens);
        }
      }
    }

    const node = roadGraph.getNearestNode(ix, iz);
    trafficLights.push({
      x: ix, z: iz, nodeId: node ? node.id : -1, phaseOffset,
      nsState: 'GREEN', ewState: 'RED', state: 'GREEN',
      nsRed: false, ewRed: true, isRed: false,
      nsBulbs, ewBulbs,
      canPass(dirX, dirZ) {
        return Math.abs(dirZ) >= Math.abs(dirX) ? this.nsState !== 'RED' : this.ewState !== 'RED';
      },
    });
  }

  let sigIdx = 0;
  for (const ax of [-40, 40, 120]) {
    const hwX = ax === BOULEVARD_X ? BOULEVARD_HALF_W : STD_ROAD_HALF_W;
    for (let si = 0; si < STREETS.length; si++) {
      buildTrafficSignalRig(ax, STREETS[si], hwX, STD_ROAD_HALF_W, (sigIdx++ + si) & 1);
    }
  }

  // ==========================================================================
  // 4. Raised Bluestone City Block Sidewalks (0.22m)
  // ==========================================================================
  function addSidewalkBlock(minX, maxX, minZ, maxZ, mat = mats.sidewalk) {
    const w = maxX - minX, d = maxZ - minZ;
    const geo = makeTiledBoxGeometry(w, 0.22, d, 3.2, 0.25, tex.sidewalk);
    addStaticMesh(geo, mat, (minX + maxX) * 0.5, 0.11, (minZ + maxZ) * 0.5, false, true);
  }

  const blockCols = [
    { minX: -112, maxX: -48 },
    { minX: -32, maxX: 29 },
    { minX: 51, maxX: 112 },
    { minX: 128, maxX: 192 },
    { minX: 208, maxX: 250 },
  ];
  const blockRows = [
    { minZ: -192, maxZ: -128 },
    { minZ: -112, maxZ: -48 },
    { minZ: -32, maxZ: 32 },
    { minZ: 48, maxZ: 112 },
    { minZ: 128, maxZ: 192 },
  ];

  for (let ci = 0; ci < blockCols.length; ci++) {
    const col = blockCols[ci];
    for (let ri = 0; ri < blockRows.length; ri++) {
      const row = blockRows[ri];
      if (ci === 3 && ri === 1) { addSidewalkBlock(128, 192, -112, 32, mats.plazaGranite); continue; }
      if (ci === 3 && ri === 2) continue;
      if (ci === 0 && ri === 3) {
        addSidewalkBlock(-112, -48, 85.5, 112);
        addSidewalkBlock(-112, -48, 48, 74.5);
        addSidewalkBlock(-112, -66.5, 74.5, 85.5);
        addStaticMesh(new THREE.BoxGeometry(19.0, 0.06, 11.2), mats.roadInt, -57.2, 0.02, 80, false, true);
        continue;
      }
      if (ci === 3 && ri === 3) {
        addSidewalkBlock(149.5, 192, 48, 112);
        addSidewalkBlock(128, 149.5, 76, 112);
        addStaticMesh(new THREE.BoxGeometry(21.5, 0.07, 28.0), mats.roadInt, 138.75, 0.015, 62.0, false, true);
        continue;
      }
      addSidewalkBlock(col.minX, col.maxX, row.minZ, row.maxZ);
    }
  }

  addSidewalkBlock(-128, 250, -225, -208);
  addSidewalkBlock(-128, 250, 208, 230);

  // ==========================================================================
  // 5. Iconic Neo-Wuxia Landmarks (Tháp Thiên Cơ 78m, Tụ Bảo Xa Các, Thái Y Viện, Lục Phiến Môn, Tĩnh Tâm Biệt Viện)
  // ==========================================================================
  const beaconMeshes = [];
  const glowingMarkers = [];
  let showroomDoorMesh = null;
  let showroomDoorOpenFrac = 0;
  let safehouseInteriorGroup = null;
  let safehouseInteriorLight = null;
  let barClubInteriorGroup = null;
  let barClubInteriorLight = null;
  let shopInteriorGroup = null;
  let shopInteriorLight = null;
  let stadiumInteriorGroup = null;
  let stadiumInteriorLight = null;

  function addAviationBeacon(x, y, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 6), mats.imperialGold);
    pole.position.set(x, y + 1.1, z);
    worldRoot.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), mats.lanternSilk);
    bulb.position.set(x, y + 2.3, z);
    worldRoot.add(bulb);
    beaconMeshes.push(bulb);
  }

  function addHelipadMarking(x, y, z, radius = 7.5) {
    const ringGeo = new THREE.RingGeometry(radius - 0.55, radius, 32);
    ringGeo.rotateX(-Math.PI / 2);
    addStaticMesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xf2c230 }), x, y + 0.04, z, false, false);
    const padGeo = new THREE.CircleGeometry(radius - 0.6, 32);
    padGeo.rotateX(-Math.PI / 2);
    addStaticMesh(padGeo, mats.roofDark, x, y + 0.02, z, false, true);
    const barGeo = new THREE.PlaneGeometry(1.1, 6.2);
    barGeo.rotateX(-Math.PI / 2);
    const midGeo = new THREE.PlaneGeometry(3.6, 1.1);
    midGeo.rotateX(-Math.PI / 2);
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xf4f7fa });
    addStaticMesh(barGeo, whiteMat, x - 2.1, y + 0.05, z, false, false);
    addStaticMesh(barGeo, whiteMat, x + 2.1, y + 0.05, z, false, false);
    addStaticMesh(midGeo, whiteMat, x, y + 0.05, z, false, false);
  }

  // 5A. THÁP THIÊN CƠ (78m Hero Mission 3 Skyscraper at 160, -40)
  {
    const fibX = 160, fibZ = -40, w = 48, d = 48;

    addStaticMesh(makeTiledBoxGeometry(w, 48.0, d, 4.0, 3.6, tex.facadeGlassTower), mats.fibCurtainGlass, fibX, 24.0, fibZ, true, true);
    addStaticMesh(makeTiledBoxGeometry(w, 5.5, 38.5, 4.0, 3.6, tex.facadeGlassTower), mats.fibCurtainGlass, fibX, 50.75, -44.75, true, true);
    addStaticMesh(makeTiledBoxGeometry(w, 24.5, d, 4.0, 3.6, tex.facadeGlassTower), mats.fibCurtainGlass, fibX, 65.75, fibZ, true, true);

    // Vermilion & Gold pagoda eave belts at y = 26m, 47.9m, 53.6m, and 77.8m (with upturned corner horns!)
    for (const beltY of [26.0, 47.9, 53.6, 77.7]) {
      addStaticMesh(new THREE.BoxGeometry(50.2, 0.65, 50.2), mats.pagodaTileJade, fibX, beltY, fibZ, false, true);
      addStaticMesh(new THREE.BoxGeometry(50.6, 0.22, 50.6), mats.imperialGold, fibX, beltY - 0.35, fibZ, false, false);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const horn = new THREE.Mesh(sharedEaveHornGeo, mats.imperialGold);
          horn.position.set(fibX + sx * 25.4, beltY + 0.45, fibZ + sz * 25.4);
          horn.rotation.y = Math.atan2(sx, sz);
          horn.rotation.x = -0.65;
          worldRoot.add(horn);
        }
      }
    }

    // Grand Ground Lobby & Plaque
    addStaticMesh(new THREE.BoxGeometry(24, 0.9, 4.2), mats.vermilionWood, fibX, 6.2, -14.2, true, true);
    const fibSignTex = makeTextSignTexture('THÁP THIÊN CƠ', 'TÀNG KINH CÁC • ĐỈNH THÁP 78M', '#101b29', '#fff4d2', '#4ce0b3');
    const fibSignMat = new THREE.MeshStandardMaterial({ map: fibSignTex, emissive: 0xffffff, emissiveMap: fibSignTex, emissiveIntensity: 0.65, roughness: 0.3 });
    addStaticMesh(new THREE.PlaneGeometry(15, 3.6), fibSignMat, fibX, 9.2, -15.68, false, false);

    // Executive Floor at y = 47.82m
    const execFloorMat = new THREE.MeshStandardMaterial({ color: 0x6e3b28, roughness: 0.45, metalness: 0.1 });
    addStaticMesh(new THREE.BoxGeometry(46.0, 0.3, 10.1), execFloorMat, fibX, 47.67, -20.45, false, true);

    const ceilGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe8b8 });
    for (let lx = 142; lx <= 178; lx += 7.2) {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 5.5), ceilGlowMat);
      panel.rotation.x = Math.PI / 2;
      panel.position.set(lx, 53.35, -20.5);
      worldRoot.add(panel);
    }

    for (let gx = 139; gx <= 181; gx += 6) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.2), mats.clearAtriumGlass);
      pane.position.set(gx, 50.75, -16.04);
      worldRoot.add(pane);
    }

    addHelipadMarking(160, 78.02, -42, 9.5);
    addAviationBeacon(137, 78.0, -17);
    addAviationBeacon(183, 78.0, -17);
    addAviationBeacon(137, 78.0, -63);
    addAviationBeacon(183, 78.0, -63);

    // Rooftop Rappel Rig at (160, 78, -17.2)
    addStaticMesh(new THREE.BoxGeometry(12.0, 0.35, 3.6), mats.darkSteel, 160, 78.18, -17.8, true, true);
    for (const rx of [155.5, 160.0, 164.5]) {
      addStaticMesh(new THREE.BoxGeometry(0.42, 2.2, 0.42), mats.imperialGold, rx, 79.2, -17.2, true, false);
      addStaticMesh(new THREE.BoxGeometry(0.36, 0.36, 3.0), mats.imperialGold, rx, 80.15, -16.1, true, false);
    }
    const rigRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.08, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x38e09c, transparent: true, opacity: 0.85 })
    );
    rigRing.rotation.x = Math.PI / 2;
    rigRing.position.set(160, 78.25, -18.0);
    worldRoot.add(rigRing);
    glowingMarkers.push({ mesh: rigRing, baseY: 78.25, spin: 1.5, bob: 0.08 });

    addAABB(136, 184, -64, -25.5, 78.0, 0, 'fib_core');
    addAABB(136, 184, -25.5, -16.0, 48.0, 0, 'fib_south_lower');
    addAABB(136, 138.2, -25.5, -16.0, 78.0, 48.0, 'fib_pillar_w');
    addAABB(181.8, 184, -25.5, -16.0, 78.0, 48.0, 'fib_pillar_e');

    // North Annex Pavilion Tower with Jade Pagoda Roof
    addStaticMesh(makeTiledBoxGeometry(40, 44, 30, 4.0, 3.6, tex.facadeGlassTower), mats.glassSkyscraper, 160, 22.0, -90, true, true);
    addPagodaRoof(160, 44.0, -90, 40, 30, 'jade', true);
    addAABB(140, 180, -105, -75, 48.0, 0, 'fib_annex');

    // Jade Lotus Fountain in Plaza
    addStaticMesh(new THREE.CylinderGeometry(5.2, 5.6, 0.65, 20), mats.limestone, 176, 0.54, 10, true, true);
    const waterDisc = new THREE.Mesh(
      new THREE.CircleGeometry(4.6, 20),
      new THREE.MeshStandardMaterial({ color: 0x1ea896, roughness: 0.1, metalness: 0.3 })
    );
    waterDisc.rotation.x = -Math.PI / 2;
    waterDisc.position.set(176, 0.88, 10);
    worldRoot.add(waterDisc);
    addAABB(170.6, 181.4, 4.6, 15.4, 1.2, 0, 'plaza_fountain');
  }

  // 5B. TỤ BẢO XA CÁC — CƠ QUAN CÔNG XƯỞNG (Showroom & Respray at -80, +80)
  {
    addStaticMesh(makeTiledBoxGeometry(55, 13, 20.4, 4.5, 3.5, tex.facadeModernBalcony), mats.modernTower, -77.5, 6.5, 95.8, true, true);
    addPagodaRoof(-77.5, 13.0, 95.8, 55, 20.4, 'crimson', false);
    addAABB(-105, -50, 85.6, 106, 15.5, 0, 'lsc_north');

    addStaticMesh(makeTiledBoxGeometry(55, 11, 20.4, 4.5, 3.5, tex.facadeBrick), mats.brickWall, -77.5, 5.5, 64.2, true, true);
    addPagodaRoof(-77.5, 11.0, 64.2, 55, 20.4, 'crimson', false);
    addAABB(-105, -50, 54, 74.4, 13.5, 0, 'lsc_south');

    addStaticMesh(makeTiledBoxGeometry(38.5, 11, 11.2, 4.5, 3.5, tex.facadeBrick), mats.brickWall, -85.75, 5.5, 80.0, true, true);
    addAABB(-105, -66.5, 74.4, 85.6, 11.0, 0, 'lsc_back');

    addStaticMesh(new THREE.BoxGeometry(17.0, 5.4, 11.4), mats.vermilionWood, -58.2, 8.3, 80.0, true, true);

    const bayLightMat = new THREE.MeshBasicMaterial({ color: 0xfff0cc });
    for (const bx of [-63, -58, -53]) {
      addStaticMesh(new THREE.BoxGeometry(2.6, 0.12, 5.8), bayLightMat, bx, 5.48, 80.0, false, false);
    }

    const shutterTex = makeCanvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#4a1d1f';
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 16) {
        g.fillStyle = '#2d1113';
        g.fillRect(0, y, w, 3);
      }
      g.fillStyle = '#f0c35a';
      g.fillRect(0, h - 22, w, 14);
    });
    showroomDoorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 5.1, 10.2),
      new THREE.MeshStandardMaterial({ map: shutterTex, roughness: 0.45, metalness: 0.5 })
    );
    showroomDoorMesh.position.set(-50.2, 2.6, 80.0);
    worldRoot.add(showroomDoorMesh);

    const lscSignTex = makeTextSignTexture('TỤ BẢO XA CÁC', 'ĐỘ CHIẾN XA & XÓA TRUY NÃ ($250)', '#1c0c12', '#ffdf85', '#38e09c');
    const lscSignMat = new THREE.MeshStandardMaterial({ map: lscSignTex, emissive: 0xffffff, emissiveMap: lscSignTex, emissiveIntensity: 0.85 });
    const lscSign = new THREE.Mesh(new THREE.PlaneGeometry(12.2, 3.0), lscSignMat);
    lscSign.rotation.y = Math.PI / 2;
    lscSign.position.set(-49.62, 7.6, 80.0);
    worldRoot.add(lscSign);
  }

  // 5C. THÁI Y VIỆN — DƯỢC VƯƠNG CỐC (Hospital around 80, 160)
  {
    addStaticMesh(makeTiledBoxGeometry(47, 30, 41, 4.0, 3.5, tex.facadeModernBalcony), mats.modernTower, 81.5, 15.0, 164.5, true, true);
    addPagodaRoof(81.5, 30.0, 164.5, 47, 41, 'jade', true);
    addAABB(58, 105, 144, 185, 34.0, 0, 'hospital');

    addStaticMesh(new THREE.BoxGeometry(18, 0.8, 7.0), mats.vermilionWood, 80, 5.2, 140.2, true, true);
    addStaticMesh(new THREE.CylinderGeometry(0.38, 0.42, 5.0, 10), mats.vermilionWood, 72.5, 2.6, 137.2, true, false);
    addStaticMesh(new THREE.CylinderGeometry(0.38, 0.42, 5.0, 10), mats.vermilionWood, 87.5, 2.6, 137.2, true, false);

    const hospSignTex = makeTextSignTexture('THÁI Y VIỆN', 'DƯỢC VƯƠNG CỐC • CỨU THƯƠNG 24/7', '#102620', '#8af7c4', '#f0c35a');
    const hospSignMat = new THREE.MeshStandardMaterial({ map: hospSignTex, emissive: 0xffffff, emissiveMap: hospSignTex, emissiveIntensity: 0.65 });
    const hospSign = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 3.2), hospSignMat);
    hospSign.rotation.y = Math.PI;
    hospSign.position.set(80, 7.4, 143.78);
    worldRoot.add(hospSign);
  }

  // 5D. LỤC PHIẾN MÔN — ĐẠI LÝ TỰ (Law Enforcement Precinct around 160, 80)
  {
    addStaticMesh(makeTiledBoxGeometry(37, 24, 52, 4.0, 3.6, tex.facadeBrick), mats.brickWall, 168.5, 12.0, 80.0, true, true);
    addPagodaRoof(168.5, 24.0, 80.0, 37, 52, 'slate', true);
    addAABB(150, 187, 54, 106, 28.0, 0, 'lspd_hq');

    for (let pz = 70; pz <= 90; pz += 5) {
      addStaticMesh(new THREE.CylinderGeometry(0.55, 0.62, 8.5, 12), mats.vermilionWood, 149.2, 4.4, pz, true, true);
    }
    addStaticMesh(new THREE.BoxGeometry(2.6, 1.1, 24), mats.imperialGold, 149.5, 9.0, 80, true, true);

    const lspdSignTex = makeTextSignTexture('LỤC PHIẾN MÔN', 'ĐẠI LÝ TỰ • NHA MÔN TUẦN PHÒNG', '#12182b', '#fff2cc', '#f0c35a');
    const lspdSignMat = new THREE.MeshStandardMaterial({ map: lspdSignTex, emissive: 0xffffff, emissiveMap: lspdSignTex, emissiveIntensity: 0.72 });
    const lspdSign = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.3), lspdSignMat);
    lspdSign.rotation.y = -Math.PI / 2;
    lspdSign.position.set(148.15, 10.9, 80.0);
    worldRoot.add(lspdSign);
  }

  // 5E. TĨNH TÂM BIỆT VIỆN (Luxury Safehouse Pavilion near 0, -80 + Interior at 800, 0, 800)
  {
    addStaticMesh(makeTiledBoxGeometry(44.5, 8.5, 50, 4.0, 3.5, tex.facadeModernBalcony), mats.limestone, -2.75, 4.25, -80, true, true);
    addStaticMesh(makeTiledBoxGeometry(34, 42, 40, 4.0, 3.5, tex.facadeModernBalcony), mats.modernTower, -2.5, 29.0, -80, true, true);
    addPagodaRoof(-2.5, 50.0, -80, 34, 40, 'crimson', true);

    for (let by = 12; by <= 46; by += 4.5) {
      addStaticMesh(new THREE.BoxGeometry(2.4, 0.32, 34), mats.vermilionWood, 15.6, by, -80, true, true);
      const rail = new THREE.Mesh(new THREE.PlaneGeometry(33.8, 1.05), mats.balconyGlass);
      rail.rotation.y = Math.PI / 2;
      rail.position.set(16.75, by + 0.68, -80);
      worldRoot.add(rail);
    }
    addAABB(-25, 19.8, -105, -55, 54.0, 0, 'safehouse_tower');

    const shSignTex = makeTextSignTexture('TĨNH TÂM BIỆT VIỆN', 'SAFEHOUSE • LƯU ĐỒ & HỒI SINH LỰC', '#0b241c', '#8af7c4', '#f0c35a');
    const shSignMat = new THREE.MeshStandardMaterial({ map: shSignTex, emissive: 0xffffff, emissiveMap: shSignTex, emissiveIntensity: 0.72 });
    const shSign = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 2.8), shSignMat);
    shSign.rotation.y = Math.PI / 2;
    shSign.position.set(19.86, 6.2, -80);
    worldRoot.add(shSign);

    const shMarkerGroup = new THREE.Group();
    shMarkerGroup.position.set(24, 0.24, -80);
    const shRing = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 1.55, 28),
      new THREE.MeshBasicMaterial({ color: 0x38e09c, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    shRing.rotation.x = -Math.PI / 2;
    shMarkerGroup.add(shRing);
    worldRoot.add(shMarkerGroup);
    glowingMarkers.push({ mesh: shMarkerGroup, baseY: 0.24, spin: 1.2, bob: 0.04, axis: 'y' });

    // Furnished Wuxia Tea & Sword Pavilion Interior at (800, 0, 800)
    const pentGroup = new THREE.Group();
    pentGroup.visible = false;
    worldRoot.add(pentGroup);
    safehouseInteriorGroup = pentGroup;

    const woodFloorMat = new THREE.MeshStandardMaterial({ color: 0x5c3826, roughness: 0.35, metalness: 0.08 });
    addStaticMesh(new THREE.BoxGeometry(20.4, 0.4, 17.4), woodFloorMat, 800, -0.18, 799.5, false, true, pentGroup);

    const pentWallMat = new THREE.MeshStandardMaterial({ color: 0xf0e8d8, roughness: 0.65 });
    addStaticMesh(new THREE.BoxGeometry(20.4, 0.3, 17.4), mats.darkWalnut, 800, 4.75, 799.5, false, false, pentGroup);
    addStaticMesh(new THREE.BoxGeometry(20.4, 4.8, 0.4), pentWallMat, 800, 2.4, 808.0, false, true, pentGroup);
    addStaticMesh(new THREE.BoxGeometry(0.4, 4.8, 17.4), pentWallMat, 790.0, 2.4, 799.5, false, true, pentGroup);
    addStaticMesh(new THREE.BoxGeometry(0.4, 4.8, 17.4), pentWallMat, 810.0, 2.4, 799.5, false, true, pentGroup);

    const viewGlass = new THREE.Mesh(new THREE.PlaneGeometry(19.6, 4.5), mats.clearAtriumGlass);
    viewGlass.position.set(800, 2.35, 791.2);
    pentGroup.add(viewGlass);

    if (!isMobile) {
      const pentLight = new THREE.PointLight(0xffdfad, 1.6, 28);
      pentLight.position.set(800, 4.1, 799.5);
      pentLight.visible = false;
      pentGroup.add(pentLight);
      safehouseInteriorLight = pentLight;
    }

    // Rosewood Tea Table, Cushions & Calligraphic Scroll Screen
    addStaticMesh(new THREE.BoxGeometry(4.4, 0.48, 1.5), mats.darkWalnut, 800, 0.26, 798.5, true, true, pentGroup);
    const scrollTex = makeTextSignTexture('KIẾM ĐẠO VÔ CỰC', 'TĨNH TÂM DƯỠNG KHÍ • TIẾU NGẠO GIANG HỒ', '#2b1216', '#ffe9b3', '#f0c35a');
    const scrollScreen = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.1, 0.10), new THREE.MeshBasicMaterial({ map: scrollTex }));
    scrollScreen.position.set(800, 2.1, 794.0);
    pentGroup.add(scrollScreen);

    // Wardrobe Closet at (796.5, 0.04, 797.5) & Exit at (800, 0.05, 805)
    addStaticMesh(new THREE.BoxGeometry(1.1, 3.2, 4.4), mats.vermilionWood, 790.8, 1.62, 797.5, false, true, pentGroup);
    const wardRing = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 1.05, 24),
      new THREE.MeshBasicMaterial({ color: 0xf0c35a, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    wardRing.rotation.x = -Math.PI / 2;
    wardRing.position.set(796.5, 0.04, 797.5);
    pentGroup.add(wardRing);
    glowingMarkers.push({ mesh: wardRing, baseY: 0.04, spin: 1.4, bob: 0.02 });

    const exitRing = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.30, 24),
      new THREE.MeshBasicMaterial({ color: 0x38e09c, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    exitRing.rotation.x = -Math.PI / 2;
    exitRing.position.set(800, 0.05, 805);
    pentGroup.add(exitRing);

    addAABB(789.5, 790.3, 790.8, 808.4, 6.0, -1, 'pent_w');
    addAABB(809.7, 810.5, 790.8, 808.4, 6.0, -1, 'pent_e');
    addAABB(789.5, 810.5, 790.6, 791.4, 6.0, -1, 'pent_n');
    addAABB(789.5, 810.5, 807.8, 808.6, 6.0, -1, 'pent_s');

    // ------------------------------------------------------------------------
    // 5F. BAR CLUB VIP — SÒNG BẠC TÀI XỈU INTERIOR at (1100, 0, 1100)
    // ------------------------------------------------------------------------
    const clubGroup = new THREE.Group();
    clubGroup.visible = false;
    worldRoot.add(clubGroup);
    barClubInteriorGroup = clubGroup;

    const clubFloorMat = new THREE.MeshStandardMaterial({ color: 0x1a1026, roughness: 0.28, metalness: 0.22 });
    const clubWallMat = new THREE.MeshStandardMaterial({ color: 0x1e1330, roughness: 0.62, metalness: 0.1 });
    const clubCeilMat = new THREE.MeshStandardMaterial({ color: 0x110a1c, roughness: 0.7 });
    const neonMagentaMat = new THREE.MeshBasicMaterial({ color: 0xe84dff });
    const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const neonGoldMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const feltGreenMat = new THREE.MeshStandardMaterial({ color: 0x0c5c34, roughness: 0.72 });
    const cashGreenMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x14532d, emissiveIntensity: 0.45, roughness: 0.45 });
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.28, metalness: 0.72 });
    const vaultSteelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.75 });

    // Floor, ceiling & 4 walls (28m x 28m, x: 1086..1114, z: 1086..1114)
    addStaticMesh(new THREE.BoxGeometry(28.4, 0.4, 28.4), clubFloorMat, 1100, -0.18, 1100, false, true, clubGroup);
    addStaticMesh(new THREE.BoxGeometry(28.4, 0.35, 28.4), clubCeilMat, 1100, 5.45, 1100, false, false, clubGroup);
    addStaticMesh(new THREE.BoxGeometry(28.4, 5.4, 0.45), clubWallMat, 1100, 2.7, 1086.0, false, true, clubGroup);
    addStaticMesh(new THREE.BoxGeometry(28.4, 5.4, 0.45), clubWallMat, 1100, 2.7, 1114.0, false, true, clubGroup);
    addStaticMesh(new THREE.BoxGeometry(0.45, 5.4, 28.4), clubWallMat, 1086.0, 2.7, 1100, false, true, clubGroup);
    addStaticMesh(new THREE.BoxGeometry(0.45, 5.4, 28.4), clubWallMat, 1114.0, 2.7, 1100, false, true, clubGroup);

    // Neon LED perimeter strips & ceiling disco ring
    addStaticMesh(new THREE.BoxGeometry(27.2, 0.14, 0.14), neonMagentaMat, 1100, 4.95, 1086.35, false, false, clubGroup);
    addStaticMesh(new THREE.BoxGeometry(27.2, 0.14, 0.14), neonCyanMat, 1100, 4.95, 1113.65, false, false, clubGroup);
    addStaticMesh(new THREE.BoxGeometry(0.14, 0.14, 27.2), neonMagentaMat, 1086.35, 4.95, 1100, false, false, clubGroup);
    addStaticMesh(new THREE.BoxGeometry(0.14, 0.14, 27.2), neonGoldMat, 1113.65, 4.95, 1100, false, false, clubGroup);
    // Red velvet VIP carpet runway from entrance to Tài Xỉu table
    addStaticMesh(new THREE.BoxGeometry(4.2, 0.04, 14.5), mats.vermilionWood, 1100, 0.02, 1105.5, false, false, clubGroup);

    // Main Neon Signboard on North Wall
    const clubBannerTex = makeTextSignTexture('BAR CLUB VIP • SÒNG TÀI XỈU', 'ĐẶT CƯỢC ĐỔI ĐỜI • CẤM RÚT SÚNG!', '#1c082c', '#f5d0fe', '#e84dff');
    const clubBanner = new THREE.Mesh(new THREE.BoxGeometry(10.5, 2.3, 0.14), new THREE.MeshBasicMaterial({ map: clubBannerTex }));
    clubBanner.position.set(1100, 3.6, 1086.35);
    clubGroup.add(clubBanner);

    // Central Tài Xỉu VIP Casino Table at (1100, 0, 1098)
    addStaticMesh(new THREE.BoxGeometry(4.8, 0.92, 2.6), mats.darkWalnut, 1100, 0.46, 1097.6, false, true, clubGroup);
    addStaticMesh(new THREE.BoxGeometry(4.5, 0.12, 2.3), feltGreenMat, 1100, 0.96, 1097.6, false, true, clubGroup);
    addStaticMesh(new THREE.BoxGeometry(4.9, 0.09, 2.7), goldTrimMat, 1100, 0.91, 1097.6, false, false, clubGroup);
    // Golden dice bowl dome on table
    const diceDome = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.46, 0.36, 12),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xeab308, emissiveIntensity: 0.45, roughness: 0.2, metalness: 0.7 })
    );
    diceDome.position.set(1100, 1.18, 1097.6);
    clubGroup.add(diceDome);

    const txSignTex = makeTextSignTexture('BÀN TÀI XỈU VIP', '[F] ĐẶT CƯỢC • TÀI / XỈU / BÃO', '#052e16', '#fde047', '#22c55e');
    const txSign = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.85, 0.08), new THREE.MeshBasicMaterial({ map: txSignTex }));
    txSign.position.set(1100, 2.45, 1097.6);
    clubGroup.add(txSign);

    const txRing = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.35, 24),
      new THREE.MeshBasicMaterial({ color: 0xe84dff, transparent: true, opacity: 0.88, side: THREE.DoubleSide })
    );
    txRing.rotation.x = -Math.PI / 2;
    txRing.position.set(1100, 0.05, 1100.8);
    clubGroup.add(txRing);
    glowingMarkers.push({ mesh: txRing, baseY: 0.05, spin: 1.5, bob: 0.02 });

    // West Bar Counter & Neon Liquor Shelf at x = 1089.5
    addStaticMesh(new THREE.BoxGeometry(1.5, 1.12, 11.5), mats.darkWalnut, 1089.8, 0.56, 1100, false, true, clubGroup);
    addStaticMesh(new THREE.BoxGeometry(1.65, 0.1, 11.7), neonCyanMat, 1089.8, 1.14, 1100, false, false, clubGroup);
    addStaticMesh(new THREE.BoxGeometry(0.6, 2.8, 10.2), mats.obsidianGlass, 1086.8, 2.0, 1100, false, false, clubGroup);

    // East Cashier Vault / Quầy Tiền Mặt (Cướp $1,000/lần!) at (1111, 0, 1095)
    addStaticMesh(new THREE.BoxGeometry(1.4, 1.15, 6.2), vaultSteelMat, 1110.6, 0.58, 1095.0, false, true, clubGroup);
    addStaticMesh(new THREE.BoxGeometry(1.5, 0.1, 6.3), goldTrimMat, 1110.6, 1.16, 1095.0, false, false, clubGroup);
    // Steel Vault Door behind cashier
    addStaticMesh(new THREE.BoxGeometry(0.35, 3.2, 2.8), vaultSteelMat, 1113.5, 1.6, 1095.0, false, true, clubGroup);
    const vaultWheel = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 8, 16), goldTrimMat);
    vaultWheel.rotation.y = Math.PI / 2;
    vaultWheel.position.set(1113.25, 1.65, 1095.0);
    clubGroup.add(vaultWheel);
    // Stacked glowing green $1,000 cash bundles on the cashier counter!
    for (let ci = 0; ci < 5; ci++) {
      addStaticMesh(new THREE.BoxGeometry(0.45, 0.24, 0.65), cashGreenMat, 1110.5, 1.32, 1093.2 + ci * 0.9, false, false, clubGroup);
    }
    const vaultSignTex = makeTextSignTexture('KÉT SẮT QUẦY TIỀN', '[F] CƯỚP +$1,000 • VỆ SĨ CANH GÁC!', '#450a0a', '#fef08a', '#ef4444');
    const vaultSign = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.05, 0.1), new THREE.MeshBasicMaterial({ map: vaultSignTex }));
    vaultSign.rotation.y = -Math.PI / 2;
    vaultSign.position.set(1113.4, 3.85, 1095.0);
    clubGroup.add(vaultSign);

    const vaultRing = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.35, 24),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.92, side: THREE.DoubleSide })
    );
    vaultRing.rotation.x = -Math.PI / 2;
    vaultRing.position.set(1108.2, 0.05, 1095.0);
    clubGroup.add(vaultRing);
    glowingMarkers.push({ mesh: vaultRing, baseY: 0.05, spin: -1.8, bob: 0.03 });

    // Bar Club Exit Door at South Wall (1100, 0.05, 1112.2)
    const clubExitTex = makeTextSignTexture('LỐI RA CỬA CHÍNH', '[F] TRỞ RA ĐẠI LỘ CHU TƯỚC', '#042f2e', '#6ee7b7', '#10b981');
    const clubExitSign = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.85, 0.1), new THREE.MeshBasicMaterial({ map: clubExitTex }));
    clubExitSign.rotation.y = Math.PI;
    clubExitSign.position.set(1100, 3.05, 1113.65);
    clubGroup.add(clubExitSign);
    const clubExitRing = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.32, 24),
      new THREE.MeshBasicMaterial({ color: 0x38e09c, transparent: true, opacity: 0.88, side: THREE.DoubleSide })
    );
    clubExitRing.rotation.x = -Math.PI / 2;
    clubExitRing.position.set(1100, 0.05, 1112.2);
    clubGroup.add(clubExitRing);

    if (!isMobile) {
      const clubLight = new THREE.PointLight(0xf0abfc, 1.9, 36);
      clubLight.position.set(1100, 4.6, 1100);
      clubLight.visible = false;
      clubGroup.add(clubLight);
      barClubInteriorLight = clubLight;
    }

    // Interior collision walls & table/counter AABBs for Bar Club
    addAABB(1085.5, 1086.4, 1085.5, 1114.5, 6.0, -1, 'club_w');
    addAABB(1113.6, 1114.5, 1085.5, 1114.5, 6.0, -1, 'club_e');
    addAABB(1085.5, 1114.5, 1085.5, 1086.4, 6.0, -1, 'club_n');
    addAABB(1085.5, 1114.5, 1113.6, 1114.5, 6.0, -1, 'club_s');
    addAABB(1097.4, 1102.6, 1096.1, 1099.1, 1.4, -1, 'club_tx_table');
    addAABB(1088.9, 1090.7, 1094.1, 1105.9, 1.5, -1, 'club_bar_cnt');
    addAABB(1109.8, 1111.5, 1091.8, 1098.2, 1.5, -1, 'club_vault_cnt');

    // ------------------------------------------------------------------------
    // 5G. VÕ QUÁN — CỬA HÀNG ĐỆ TỬ INTERIOR at (1400, 0, 1400)
    // ------------------------------------------------------------------------
    const shopGroup = new THREE.Group();
    shopGroup.visible = false;
    worldRoot.add(shopGroup);
    shopInteriorGroup = shopGroup;

    const dojoFloorMat = new THREE.MeshStandardMaterial({ color: 0x523120, roughness: 0.38, metalness: 0.08 });
    const dojoWallMat = new THREE.MeshStandardMaterial({ color: 0x2b1318, roughness: 0.65 });
    const dojoCeilMat = new THREE.MeshStandardMaterial({ color: 0x1a0b0e, roughness: 0.72 });

    // Floor, ceiling & 4 walls (22m x 22m, x: 1389..1411, z: 1389..1411)
    addStaticMesh(new THREE.BoxGeometry(22.4, 0.4, 22.4), dojoFloorMat, 1400, -0.18, 1400, false, true, shopGroup);
    addStaticMesh(new THREE.BoxGeometry(22.4, 0.35, 22.4), dojoCeilMat, 1400, 5.25, 1400, false, false, shopGroup);
    addStaticMesh(new THREE.BoxGeometry(22.4, 5.2, 0.45), dojoWallMat, 1400, 2.6, 1389.0, false, true, shopGroup);
    addStaticMesh(new THREE.BoxGeometry(22.4, 5.2, 0.45), dojoWallMat, 1400, 2.6, 1411.0, false, true, shopGroup);
    addStaticMesh(new THREE.BoxGeometry(0.45, 5.2, 22.4), dojoWallMat, 1389.0, 2.6, 1400, false, true, shopGroup);
    addStaticMesh(new THREE.BoxGeometry(0.45, 5.2, 22.4), dojoWallMat, 1411.0, 2.6, 1400, false, true, shopGroup);

    // Crimson & Gold Dojo Pillars (4 corners)
    for (const px of [1391.2, 1408.8]) {
      for (const pz of [1391.2, 1408.8]) {
        addStaticMesh(new THREE.CylinderGeometry(0.38, 0.42, 5.0, 10), mats.vermilionWood, px, 2.5, pz, false, false, shopGroup);
        addStaticMesh(new THREE.CylinderGeometry(0.48, 0.48, 0.22, 10), goldTrimMat, px, 4.85, pz, false, false, shopGroup);
      }
    }
    // Gold ceiling border strips
    addStaticMesh(new THREE.BoxGeometry(21.0, 0.14, 0.14), neonGoldMat, 1400, 4.85, 1389.35, false, false, shopGroup);
    addStaticMesh(new THREE.BoxGeometry(21.0, 0.14, 0.14), neonGoldMat, 1400, 4.85, 1410.65, false, false, shopGroup);

    // Main Dojo Signboard on North Wall
    const shopBannerTex = makeTextSignTexture('VÕ QUÁN • CỬA HÀNG ĐỆ TỬ', 'CHIÊU MỘ HỘ VỆ $1 • $10 • $100 GOJO SATORU', '#2c0a11', '#fde68a', '#f59e0b');
    const shopBanner = new THREE.Mesh(new THREE.BoxGeometry(10.0, 2.1, 0.14), new THREE.MeshBasicMaterial({ map: shopBannerTex }));
    shopBanner.position.set(1400, 3.65, 1389.35);
    shopGroup.add(shopBanner);

    // 3 Display Pedestals along North Wall (x = 1395, 1400, 1405, z = 1393.5)
    const pedSpecs = [
      { x: 1395.0, color: 0xb45309, title: 'ĐỆ TỬ HẮC Y ($1)', sub: 'DA #402828 • HỘ VỆ CƠ BẢN' },
      { x: 1400.0, color: 0x38bdf8, title: 'ĐỆ TỬ BẠCH Y ($10)', sub: 'DA #EDE1E1 • XẠ THỦ TINH ANH' },
      { x: 1405.0, color: 0xa855f7, title: 'GOJO SATORU ($100)', sub: 'NỔ MAP 1KM • HỒI CHIÊU 60S' }
    ];
    for (const ps of pedSpecs) {
      addStaticMesh(new THREE.CylinderGeometry(1.15, 1.32, 0.36, 16), mats.darkWalnut, ps.x, 0.18, 1393.5, false, true, shopGroup);
      const pRing = new THREE.Mesh(
        new THREE.RingGeometry(1.05, 1.28, 24),
        new THREE.MeshBasicMaterial({ color: ps.color, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
      );
      pRing.rotation.x = -Math.PI / 2;
      pRing.position.set(ps.x, 0.38, 1393.5);
      shopGroup.add(pRing);
      const pTex = makeTextSignTexture(ps.title, ps.sub, '#160d1c', '#ffffff', '#' + ps.color.toString(16).padStart(6, '0'));
      const pSign = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.68, 0.06), new THREE.MeshBasicMaterial({ map: pTex }));
      pSign.position.set(ps.x, 0.72, 1394.95);
      shopGroup.add(pSign);
    }

    // Master Recruitment Counter at (1400, 0, 1398.5)
    addStaticMesh(new THREE.BoxGeometry(4.4, 1.02, 1.2), mats.vermilionWood, 1400, 0.51, 1398.5, false, true, shopGroup);
    addStaticMesh(new THREE.BoxGeometry(4.55, 0.1, 1.32), goldTrimMat, 1400, 1.04, 1398.5, false, false, shopGroup);
    const shopRing = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.35, 24),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.92, side: THREE.DoubleSide })
    );
    shopRing.rotation.x = -Math.PI / 2;
    shopRing.position.set(1400, 0.05, 1400.8);
    shopGroup.add(shopRing);
    glowingMarkers.push({ mesh: shopRing, baseY: 0.05, spin: 1.5, bob: 0.02 });

    // Shop Exit Door at South Wall (1400, 0.05, 1409.5)
    const shopExitTex = makeTextSignTexture('LỐI RA VÕ QUÁN', '[F] TRỞ RA ĐẠI LỘ CHU TƯỚC', '#042f2e', '#6ee7b7', '#10b981');
    const shopExitSign = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.85, 0.1), new THREE.MeshBasicMaterial({ map: shopExitTex }));
    shopExitSign.rotation.y = Math.PI;
    shopExitSign.position.set(1400, 3.05, 1410.65);
    shopGroup.add(shopExitSign);
    const shopExitRing = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.32, 24),
      new THREE.MeshBasicMaterial({ color: 0x38e09c, transparent: true, opacity: 0.88, side: THREE.DoubleSide })
    );
    shopExitRing.rotation.x = -Math.PI / 2;
    shopExitRing.position.set(1400, 0.05, 1409.5);
    shopGroup.add(shopExitRing);

    if (!isMobile) {
      const shopLight = new THREE.PointLight(0xffdfb0, 1.85, 32);
      shopLight.position.set(1400, 4.4, 1400);
      shopLight.visible = false;
      shopGroup.add(shopLight);
      shopInteriorLight = shopLight;
    }

    // Interior collision walls & counter AABBs for Võ Quán
    addAABB(1388.5, 1389.4, 1388.5, 1411.5, 6.0, -1, 'shop_w');
    addAABB(1410.6, 1411.5, 1388.5, 1411.5, 6.0, -1, 'shop_e');
    addAABB(1388.5, 1411.5, 1388.5, 1389.4, 6.0, -1, 'shop_n');
    addAABB(1388.5, 1411.5, 1410.6, 1411.5, 6.0, -1, 'shop_s');
    addAABB(1397.7, 1402.3, 1397.8, 1399.2, 1.5, -1, 'shop_counter');

    // ------------------------------------------------------------------------
    // 5H. ĐẠI ĐẤU TRƯỜNG HUYỀN THOẠI — HUGE 3D STADIUM at (1800, 0, 1800)
    //     90m x 62m green pitch, goals, tiered grandstands, floodlights & 3 ball hiding spots
    // ------------------------------------------------------------------------
    const stadGroup = new THREE.Group();
    stadGroup.visible = false;
    worldRoot.add(stadGroup);
    stadiumInteriorGroup = stadGroup;

    const turfLightMat = new THREE.MeshStandardMaterial({ color: 0x1e8a42, roughness: 0.78 });
    const turfDarkMat = new THREE.MeshStandardMaterial({ color: 0x167034, roughness: 0.8 });
    const pitchLineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const standConcreteMat = new THREE.MeshStandardMaterial({ color: 0x263142, roughness: 0.72 });
    const standSeatBlueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6 });
    const standSeatRedMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 });
    const goalPostMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.35 });
    const goalNetMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.32, side: THREE.DoubleSide });
    const floodBulbMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    const hideCrateMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.68 });

    // Alternating mowed grass turf stripes (10 stripes x 9m = 90m width, 62m depth)
    for (let si = 0; si < 10; si++) {
      const sx = 1759.5 + si * 9.0;
      addStaticMesh(
        new THREE.BoxGeometry(9.05, 0.4, 64.0),
        si % 2 === 0 ? turfLightMat : turfDarkMat,
        sx, -0.18, 1800, false, true, stadGroup
      );
    }

    // Crisp White Pitch Lines (Touchlines, Goal lines, Halfway line, Center Circle, Penalty Boxes)
    addStaticMesh(new THREE.BoxGeometry(84.0, 0.03, 0.22), pitchLineMat, 1800, 0.03, 1772, false, false, stadGroup);
    addStaticMesh(new THREE.BoxGeometry(84.0, 0.03, 0.22), pitchLineMat, 1800, 0.03, 1828, false, false, stadGroup);
    addStaticMesh(new THREE.BoxGeometry(0.22, 0.03, 56.0), pitchLineMat, 1758, 0.03, 1800, false, false, stadGroup);
    addStaticMesh(new THREE.BoxGeometry(0.22, 0.03, 56.0), pitchLineMat, 1842, 0.03, 1800, false, false, stadGroup);
    addStaticMesh(new THREE.BoxGeometry(0.22, 0.03, 56.0), pitchLineMat, 1800, 0.03, 1800, false, false, stadGroup);
    const centerCircle = new THREE.Mesh(
      new THREE.RingGeometry(8.8, 9.05, 40),
      new THREE.MeshBasicMaterial({ color: 0xf8fafc, side: THREE.DoubleSide })
    );
    centerCircle.rotation.x = -Math.PI / 2;
    centerCircle.position.set(1800, 0.04, 1800);
    stadGroup.add(centerCircle);

    // Penalty Boxes (West & East)
    for (const dir of [-1, 1]) {
      const gx = 1800 + dir * 42;
      const bx = 1800 + dir * 29;
      addStaticMesh(new THREE.BoxGeometry(0.22, 0.03, 28.0), pitchLineMat, bx, 0.03, 1800, false, false, stadGroup);
      addStaticMesh(new THREE.BoxGeometry(13.0, 0.03, 0.22), pitchLineMat, (gx + bx) * 0.5, 0.03, 1786, false, false, stadGroup);
      addStaticMesh(new THREE.BoxGeometry(13.0, 0.03, 0.22), pitchLineMat, (gx + bx) * 0.5, 0.03, 1814, false, false, stadGroup);

      // Football Goal Frame + Net
      const postX = gx + dir * 0.2;
      const backX = gx + dir * 2.4;
      addStaticMesh(new THREE.CylinderGeometry(0.11, 0.11, 3.4, 8), goalPostMat, postX, 1.7, 1795.2, false, false, stadGroup);
      addStaticMesh(new THREE.CylinderGeometry(0.11, 0.11, 3.4, 8), goalPostMat, postX, 1.7, 1804.8, false, false, stadGroup);
      addStaticMesh(new THREE.BoxGeometry(0.2, 0.2, 9.8), goalPostMat, postX, 3.4, 1800, false, false, stadGroup);
      addStaticMesh(new THREE.PlaneGeometry(9.6, 3.4), goalNetMat, backX, 1.7, 1800, false, false, stadGroup).rotation.y = Math.PI / 2;
    }

    // Tiered Stadium Grandstands around all 4 sides
    for (let t = 0; t < 4; t++) {
      const h = 2.6 + t * 2.5;
      const off = 33.5 + t * 2.8;
      const offX = 47.0 + t * 2.8;
      const seatMat = t % 2 === 0 ? standSeatBlueMat : standSeatRedMat;
      addStaticMesh(new THREE.BoxGeometry(96 + t * 5, 2.2, 2.6), seatMat, 1800, h, 1800 - off, false, false, stadGroup);
      addStaticMesh(new THREE.BoxGeometry(96 + t * 5, 2.2, 2.6), seatMat, 1800, h, 1800 + off, false, false, stadGroup);
      addStaticMesh(new THREE.BoxGeometry(2.6, 2.2, 68 + t * 5), seatMat, 1800 - offX, h, 1800, false, false, stadGroup);
      addStaticMesh(new THREE.BoxGeometry(2.6, 2.2, 68 + t * 5), seatMat, 1800 + offX, h, 1800, false, false, stadGroup);
    }
    // Outer Stadium Bowl Retaining Walls
    addStaticMesh(new THREE.BoxGeometry(118, 16, 1.2), standConcreteMat, 1800, 8, 1756, false, false, stadGroup);
    addStaticMesh(new THREE.BoxGeometry(118, 16, 1.2), standConcreteMat, 1800, 8, 1844, false, false, stadGroup);
    addStaticMesh(new THREE.BoxGeometry(1.2, 16, 90), standConcreteMat, 1742, 8, 1800, false, false, stadGroup);
    addStaticMesh(new THREE.BoxGeometry(1.2, 16, 90), standConcreteMat, 1858, 8, 1800, false, false, stadGroup);

    // 4 Towering Corner Floodlight Towers
    for (const fx of [1752, 1848]) {
      for (const fz of [1766, 1834]) {
        addStaticMesh(new THREE.CylinderGeometry(0.45, 0.75, 26, 8), standConcreteMat, fx, 13, fz, false, false, stadGroup);
        addStaticMesh(new THREE.BoxGeometry(5.5, 2.6, 1.0), floodBulbMat, fx, 26.2, fz, false, false, stadGroup);
      }
    }

    // Giant Stadium Scoreboard on North Stand
    const stadScoreTex = makeTextSignTexture('ĐẠI ĐẤU TRƯỜNG HUYỀN THOẠI', 'BOSS: MESSI #10 & RONALDO #7 • THỬ THÁCH SINH TỬ', '#09152b', '#fde047', '#38bdf8');
    const stadScore = new THREE.Mesh(new THREE.BoxGeometry(24, 5.2, 0.4), new THREE.MeshBasicMaterial({ map: stadScoreTex }));
    stadScore.position.set(1800, 15.5, 1762);
    stadGroup.add(stadScore);

    // 3 Ball Hiding Spots around Stadium Perimeter (Tủ Đồ / Kho Dụng Cụ / Hầm Kỹ Thuật)
    const hideSpots = [
      { x: 1800, z: 1770.8, label: 'TỦ ĐỒ BẮC', sub: '[F] GIẤU BÓNG TẠI ĐÂY' },
      { x: 1762, z: 1827.5, label: 'KHO DỤNG CỤ TÂY', sub: '[F] GIẤU BÓNG TẠI ĐÂY' },
      { x: 1838, z: 1827.5, label: 'HẦM KỸ THUẬT ĐÔNG', sub: '[F] GIẤU BÓNG TẠI ĐÂY' }
    ];
    for (const hs of hideSpots) {
      addStaticMesh(new THREE.BoxGeometry(2.4, 1.5, 1.4), hideCrateMat, hs.x, 0.75, hs.z + (hs.z < 1800 ? -1.4 : 1.4), false, true, stadGroup);
      const hRing = new THREE.Mesh(
        new THREE.RingGeometry(1.05, 1.45, 22),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
      );
      hRing.rotation.x = -Math.PI / 2;
      hRing.position.set(hs.x, 0.05, hs.z);
      stadGroup.add(hRing);
      glowingMarkers.push({ mesh: hRing, baseY: 0.05, spin: 1.4, bob: 0.02 });
      const hTex = makeTextSignTexture(hs.label, hs.sub, '#291506', '#fde68a', '#f59e0b');
      const hSign = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.75, 0.08), new THREE.MeshBasicMaterial({ map: hTex }));
      hSign.position.set(hs.x, 2.25, hs.z + (hs.z < 1800 ? -1.4 : 1.4));
      if (hs.z > 1800) hSign.rotation.y = Math.PI;
      stadGroup.add(hSign);
    }

    // Stadium Exit Tunnel at South Center (1800, 0.05, 1829.2)
    const stadExitTex = makeTextSignTexture('LỐI RA ĐẤU TRƯỜNG', '[F] RỜI SÂN VẬN ĐỘNG', '#042f2e', '#6ee7b7', '#10b981');
    const stadExitSign = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.95, 0.12), new THREE.MeshBasicMaterial({ map: stadExitTex }));
    stadExitSign.rotation.y = Math.PI;
    stadExitSign.position.set(1800, 3.0, 1831.2);
    stadGroup.add(stadExitSign);
    const stadExitRing = new THREE.Mesh(
      new THREE.RingGeometry(1.0, 1.45, 24),
      new THREE.MeshBasicMaterial({ color: 0x38e09c, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    stadExitRing.rotation.x = -Math.PI / 2;
    stadExitRing.position.set(1800, 0.05, 1829.2);
    stadGroup.add(stadExitRing);

    if (!isMobile) {
      const stadLight = new THREE.PointLight(0xfffbeb, 1.5, 110);
      stadLight.position.set(1800, 26, 1800);
      stadLight.visible = false;
      stadGroup.add(stadLight);
      stadiumInteriorLight = stadLight;
    }

    // Stadium Perimeter Boundary AABBs
    addAABB(1753.5, 1754.8, 1767.5, 1832.5, 12.0, -1, 'stad_w');
    addAABB(1845.2, 1846.5, 1767.5, 1832.5, 12.0, -1, 'stad_e');
    addAABB(1753.5, 1846.5, 1767.5, 1768.8, 12.0, -1, 'stad_n');
    addAABB(1753.5, 1846.5, 1831.2, 1832.5, 12.0, -1, 'stad_s');
  }

  // ==========================================================================
  // 6. Wuxia Tavern Strip-Malls, Pagoda Luxury Towers & Skyscrapers
  // ==========================================================================
  const signTavern = makeTextSignTexture('TÚY TIÊN TỬU LÂU', 'MỸ TỬU GIAI Đ肴 • ANH HÙNG HỘI TỤ', '#290d11', '#fff0c4', '#f0c35a');
  const signWeaponry = makeTextSignTexture('THẦN BINH BẢO CÁC', 'DANH KIẾM • ÁM KHÍ • HỘ GIÁP', '#12212b', '#e6f7ff', '#4ce0b3');
  const signTeaHouse = makeTextSignTexture('THANH TÂM TRÀ QUÁN', 'TRÀ ĐẠO GIANG NAM • ĐIỂM TÂM', '#13261d', '#f5f2e6', '#e6b645');
  const signSilkShop = makeTextSignTexture('CẨM Y HOA PHƯỜNG', 'Y PHỤC HIỆP KHÁCH • LỤA THƯỢNG HẠNG', '#261429', '#fce8ff', '#f0c35a');
  const shopSigns = [signTavern, signWeaponry, signTeaHouse, signSilkShop];

  // 6A. West Side of Đại Lộ Chu Tước (Col 1) — Wuxia Taverns & Inns with Upturned Pagoda Roofs & Red Lanterns!
  for (let ri = 0; ri < blockRows.length; ri++) {
    if (ri === 1) continue;
    const row = blockRows[ri];
    const cz = (row.minZ + row.maxZ) * 0.5;

    const mallH = 9.2 + (ri % 2) * 2.6;
    const mallD = row.maxZ - row.minZ - 12;
    addStaticMesh(makeTiledBoxGeometry(19.3, mallH, mallD, 4.0, 3.6, tex.facadeCommercial), mats.commercialWall, 13.15, mallH * 0.5, cz, true, true);
    addPagodaRoof(13.15, mallH, cz, 19.3, mallD, ri % 2 === 0 ? 'crimson' : 'jade', true);
    addAABB(3.5, 22.8, row.minZ + 6, row.maxZ - 6, mallH + 3.2, 0, 'strip_mall');

    for (let si = 0; si < 4; si++) {
      const sz = row.minZ + 12.5 + si * 13.0;
      // Upturned wooden tavern eave canopy + twin hanging red silk lanterns
      const awning = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.28, 10.6), mats.pagodaTileCrimson);
      awning.rotation.z = -0.18;
      awning.position.set(23.6, 3.55, sz);
      worldRoot.add(awning);

      for (const lzOff of [-4.2, 4.2]) {
        addStaticMesh(new THREE.SphereGeometry(0.28, 10, 8), mats.lanternSilk, 24.15, 3.05, sz + lzOff, false, false);
      }

      const signTex = shopSigns[(ri + si) % shopSigns.length];
      const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 2.0), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.35 }));
      signMesh.rotation.y = Math.PI / 2;
      signMesh.position.set(22.88, 5.3, sz);
      worldRoot.add(signMesh);
    }

    const westH = 22 + ((ri * 7) % 14);
    addStaticMesh(makeTiledBoxGeometry(22, westH, 48, 4.0, 3.6, tex.facadeBrick), ri % 2 === 0 ? mats.brickWall : mats.modernTower, -15.5, westH * 0.5, cz, true, true);
    addPagodaRoof(-15.5, westH, cz, 22, 48, 'slate', true);
    addAABB(-26.5, -4.5, row.minZ + 8, row.maxZ - 8, westH + 3.5, 0, 'col1_west');
  }

  // 6B. East Side of Đại Lộ Chu Tước (Col 2) — Grand Pavilions & Towers with Bamboo Courtyards & Cherry Blossoms!
  for (let ri = 0; ri < 4; ri++) {
    const row = blockRows[ri];
    const cz = (row.minZ + row.maxZ) * 0.5;
    const towerH = 32 + ri * 5;
    const towerW = 38, towerD = 48;

    addStaticMesh(makeTiledBoxGeometry(towerW, towerH, towerD, 4.0, 3.6, tex.facadeModernBalcony), mats.modernTower, 79.0, towerH * 0.5, cz, true, true);
    addPagodaRoof(79.0, towerH, cz, towerW, towerD, ri % 2 === 0 ? 'jade' : 'crimson', true);

    const floors = Math.floor((towerH - 6) / 4.2);
    for (let f = 1; f <= floors; f++) {
      const fy = 3.2 + f * 4.2;
      addStaticMesh(new THREE.BoxGeometry(2.8, 0.30, towerD - 4), mats.vermilionWood, 58.9, fy, cz, true, true);
      const rail = new THREE.Mesh(new THREE.PlaneGeometry(towerD - 4.4, 1.05), mats.balconyGlass);
      rail.rotation.y = Math.PI / 2;
      rail.position.set(57.55, fy + 0.68, cz);
      worldRoot.add(rail);
    }

    // Stone Planters with Lush Jade Bamboo Groves!
    for (const hz of [cz - 15, cz + 15]) {
      addStaticMesh(new THREE.BoxGeometry(1.5, 0.45, 18.0), mats.limestone, 56.6, 0.44, hz, false, true);
      addStaticMesh(new THREE.BoxGeometry(1.25, 0.85, 17.4), mats.hedgeGreen, 56.6, 0.95, hz, true, true);
      bambooClusterPositions.push({ x: 56.6, y: 0.6, z: hz - 5, scale: 1.25 });
      bambooClusterPositions.push({ x: 56.6, y: 0.6, z: hz + 5, scale: 1.35 });
      addAABB(55.8, 57.4, hz - 9.0, hz + 9.0, 1.7, 0, 'hedge');
    }

    addAABB(57.6, 98.0, cz - 24, cz + 24, towerH + 4.0, 0, 'del_perro_luxury_tower');
    cherryTreePositions.push({ x: 56.4, y: SIDEWALK_Y, z: cz - 26, scale: 1.25 });
    cherryTreePositions.push({ x: 56.4, y: SIDEWALK_Y, z: cz + 26, scale: 1.25 });
  }

  // 6C. Downtown Neo-Wuxia Pagoda Skyscrapers
  function buildNeoWuxiaSkyscraper(cx, cz, w, d, h, styleIdx) {
    const podiumH = 7.5;
    addStaticMesh(makeTiledBoxGeometry(w - 3.2, podiumH, d - 3.2, 4.0, 3.6, tex.facadeGlassTower), mats.glassSkyscraper, cx, podiumH * 0.5, cz, true, true);
    addStaticMesh(new THREE.BoxGeometry(w + 1.2, 0.85, d + 1.2), mats.vermilionWood, cx, podiumH + 0.3, cz, true, true);

    for (let px = cx - w * 0.5 + 1.2; px <= cx + w * 0.5 - 1.0; px += 6.5) {
      addStaticMesh(new THREE.CylinderGeometry(0.45, 0.5, podiumH, 10), mats.vermilionWood, px, podiumH * 0.5, cz - d * 0.5 + 0.8, true, true);
      addStaticMesh(new THREE.CylinderGeometry(0.45, 0.5, podiumH, 10), mats.vermilionWood, px, podiumH * 0.5, cz + d * 0.5 - 0.8, true, true);
    }

    const mainH = (h - podiumH) * 0.70;
    const crownH = h - podiumH - mainH;
    const facadeMat = styleIdx % 3 === 0 ? mats.fibCurtainGlass : mats.glassSkyscraper;

    addStaticMesh(makeTiledBoxGeometry(w - 2.0, mainH, d - 2.0, 4.0, 3.6, tex.facadeGlassTower), facadeMat, cx, podiumH + mainH * 0.5, cz, true, true);
    addPagodaRoof(cx, podiumH + mainH, cz, w - 1.5, d - 1.5, styleIdx % 2 === 0 ? 'jade' : 'slate', false);

    const cw = (w - 2.0) * 0.74;
    const cd = (d - 2.0) * 0.74;
    addStaticMesh(makeTiledBoxGeometry(cw, crownH, cd, 4.0, 3.6, tex.facadeGlassTower), facadeMat, cx, podiumH + mainH + crownH * 0.5, cz, true, true);
    addPagodaRoof(cx, h, cz, cw, cd, styleIdx % 2 === 0 ? 'crimson' : 'jade', true);

    addAviationBeacon(cx - cw * 0.42, h + 1.5, cz - cd * 0.42);
    addAviationBeacon(cx + cw * 0.42, h + 1.5, cz + cd * 0.42);
    addAABB(cx - w * 0.5, cx + w * 0.5, cz - d * 0.5, cz + d * 0.5, h + 4.0, 0, 'skyscraper');
  }

  buildNeoWuxiaSkyscraper(160, -160, 46, 46, 80, 0);
  buildNeoWuxiaSkyscraper(160, 160, 44, 44, 64, 1);

  const eastHeights = [56, 74, 66, 50, 42];
  for (let ri = 0; ri < blockRows.length; ri++) {
    const cz = (blockRows[ri].minZ + blockRows[ri].maxZ) * 0.5;
    buildNeoWuxiaSkyscraper(229, cz, 30, 46, eastHeights[ri], ri + 2);
  }

  // 6D. Beachfront Inns & Pavilions (Col 0)
  for (let ri = 0; ri < blockRows.length; ri++) {
    if (ri === 3) continue;
    const row = blockRows[ri];
    const cz = (row.minZ + row.maxZ) * 0.5;
    const h1 = 15 + ri * 3.2;
    const h2 = 20 + ((ri * 5) % 10);

    addStaticMesh(makeTiledBoxGeometry(21, h1, 46, 4.0, 3.6, tex.facadeModernBalcony), mats.modernTower, -95.5, h1 * 0.5, cz, true, true);
    addPagodaRoof(-95.5, h1, cz, 21, 46, 'jade', true);
    addAABB(-106, -85, cz - 23, cz + 23, h1 + 3.5, 0, 'beachfront_hotel');

    addStaticMesh(makeTiledBoxGeometry(22, h2, 46, 4.0, 3.6, ri % 2 === 0 ? tex.facadeCommercial : tex.facadeBrick), ri % 2 === 0 ? mats.commercialWall : mats.brickWall, -65.0, h2 * 0.5, cz, true, true);
    addPagodaRoof(-65.0, h2, cz, 22, 46, 'crimson', true);
    addAABB(-76, -54, cz - 23, cz + 23, h2 + 3.5, 0, 'rockford_block');

    cherryTreePositions.push({ x: -110.2, y: SIDEWALK_Y, z: cz - 18, scale: 1.15 });
    palmPositions.push({ x: -110.2, y: SIDEWALK_Y, z: cz + 18, scale: 1.0, leanX: -0.06, leanZ: -0.03 });
  }

  // ==========================================================================
  // 7. West Coastline: Đông Hải Ngân Sa, GLSL Ocean & Bến Cảng Bồng Lai
  // ==========================================================================
  {
    const bw = 127, bd = 510;
    const beachGeo = new THREE.PlaneGeometry(bw, bd, isMobile ? 20 : 42, isMobile ? 42 : 84);
    beachGeo.rotateX(-Math.PI / 2);
    const pos = beachGeo.attributes.position;
    const uv = beachGeo.attributes.uv;
    const repX = tex.beachSand?.repeat?.x || 1;
    const repY = tex.beachSand?.repeat?.y || 1;

    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i) - 191.5;
      const wz = pos.getZ(i);
      pos.setX(i, wx);
      pos.setY(i, getBeachHeight(wx, wz));
      pos.setZ(i, wz);
      uv.setXY(i, ((wx + 255) / 14) / repX, ((wz + 255) / 14) / repY);
    }
    beachGeo.computeVertexNormals();
    const beachMesh = new THREE.Mesh(beachGeo, mats.beach);
    beachMesh.receiveShadow = true;
    worldRoot.add(beachMesh);

    for (let pz = -220; pz <= 210; pz += 45) {
      if (pz > -28 && pz < 14) continue;
      addStaticMesh(new THREE.BoxGeometry(0.65, 0.32, 24), mats.limestone, -128.3, 0.28, pz, false, true);
      cherryTreePositions.push({ x: -130.5, y: 0.20, z: pz - 8, scale: 1.15 });
      palmPositions.push({ x: -130.5, y: 0.20, z: pz + 8, scale: 0.95, leanX: -0.09, leanZ: -0.04 });
    }

    // Coastal Watch Pavilions (Vọng Hải Đình) on stilts at (-162, -55) & (-162, +96)
    for (const lz of [-55, 96]) {
      const lx = -162;
      const ly = getBeachHeight(lx, lz);
      const lg = new THREE.Group();
      lg.position.set(lx, ly, lz);
      for (const sx of [-1.6, 1.6]) {
        for (const sz of [-1.6, 1.6]) {
          addStaticMesh(new THREE.CylinderGeometry(0.18, 0.22, 4.2, 8), mats.vermilionWood, sx, 2.1, sz, true, false, lg);
        }
      }
      addStaticMesh(new THREE.BoxGeometry(4.2, 0.26, 4.2), mats.pierWood, 0, 1.8, 0, true, true, lg);
      worldRoot.add(lg);
      addPagodaRoof(lx, ly + 4.1, lz, 3.8, 3.8, 'crimson', true);
      addAABB(lx - 1.8, lx + 1.8, lz - 1.8, lz + 1.8, ly + 5.2, 0, 'watch_pavilion');
    }

    // Coastal Craggy Rocks
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x52595e, roughness: 0.90, flatShading: true });
    const rockGeo = new THREE.DodecahedronGeometry(1, 1);
    const rockClusters = [
      [-192, -230, 4.8, 3.2, 4.0], [-178, -236, 3.4, 2.4, 3.0], [-204, -222, 5.5, 3.8, 4.4],
      [-196, 224, 5.0, 3.4, 4.0], [-180, 232, 3.6, 2.4, 3.4], [-206, 216, 5.6, 3.6, 4.6],
    ];
    for (let i = 0; i < rockClusters.length; i++) {
      const [rx, rz, sx, sy, sz] = rockClusters[i];
      const ry = getBeachHeight(rx, rz);
      const rMesh = new THREE.Mesh(rockGeo, rockMat);
      rMesh.position.set(rx, ry + sy * 0.35, rz);
      rMesh.scale.set(sx, sy, sz);
      rMesh.rotation.set(i * 0.4, i * 1.1, 0.2);
      rMesh.castShadow = true;
      worldRoot.add(rMesh);
      addAABB(rx - sx * 0.8, rx + sx * 0.8, rz - sz * 0.8, rz + sz * 0.8, ry + sy * 0.9, -2, 'rock');
    }
  }

  // GLSL Ocean
  const oceanUniforms = {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(-0.62, 0.58, -0.35).normalize() },
    uSunColor: { value: new THREE.Color(0xfff2d6) },
    uSkyColor: { value: new THREE.Color(0x7ab8eb) },
    uDeepColor: { value: new THREE.Color(0x06354d) },
    uShallowColor: { value: new THREE.Color(0x1ca89c) },
    uFogColor: { value: new THREE.Color(0xa6d6f2) },
    uFogDensity: { value: 0.00145 },
    uShoreX: { value: -201.5 },
  };

  const oceanMat = new THREE.ShaderMaterial({
    uniforms: oceanUniforms,
    transparent: true,
    side: THREE.FrontSide,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uShoreX;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vShoreDist;

      float waveHeight(vec2 p, float t, float ampScale) {
        float w1 = sin(p.x * 0.11 + p.y * 0.04 + t * 1.45) * 0.34;
        float w2 = sin(p.x * 0.23 - p.y * 0.13 + t * 2.05) * 0.16;
        float w3 = cos(p.x * 0.06 + p.y * 0.19 - t * 1.15) * 0.12;
        float w4 = sin((p.x - p.y) * 0.42 + t * 2.85) * 0.05;
        return (w1 + w2 + w3 + w4) * ampScale;
      }

      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float shoreDist = max(0.0, uShoreX - wp.x);
        float southDist = max(0.0, wp.z - 235.0);
        float eastDist = max(0.0, wp.x - 252.0);
        float effDist = max(shoreDist, max(southDist, eastDist));
        float amp = clamp(effDist / 26.0, 0.06, 1.0);

        float eps = 0.65;
        float hC = waveHeight(wp.xz, uTime, amp);
        float hX = waveHeight(wp.xz + vec2(eps, 0.0), uTime, amp);
        float hZ = waveHeight(wp.xz + vec2(0.0, eps), uTime, amp);

        wp.y += hC;
        vWorldPos = wp.xyz;
        vShoreDist = effDist;
        vNormal = normalize(vec3(hC - hX, eps, hC - hZ));

        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uSkyColor;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uFogColor;
      uniform float uFogDensity;

      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vShoreDist;

      void main() {
        vec3 N = normalize(vNormal);
        float r1 = sin(vWorldPos.x * 1.9 + vWorldPos.z * 1.3 + uTime * 3.1) * 0.045;
        float r2 = cos(vWorldPos.x * 2.7 - vWorldPos.z * 2.2 - uTime * 2.6) * 0.045;
        N = normalize(N + vec3(r1, 0.0, r2));

        vec3 V = normalize(cameraPosition - vWorldPos);
        float depthFactor = clamp(vShoreDist / 68.0, 0.0, 1.0);
        vec3 waterCol = mix(uShallowColor, uDeepColor, smoothstep(0.0, 1.0, depthFactor));

        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 4.0);
        waterCol = mix(waterCol, uSkyColor, clamp(fresnel * 0.72, 0.04, 0.78));

        float surfWave = sin(vShoreDist * 0.62 - uTime * 2.5 + sin(vWorldPos.z * 0.08) * 2.2);
        float shoreFoam = (1.0 - smoothstep(0.0, 15.0, vShoreDist)) * smoothstep(0.15, 0.85, surfWave * 0.5 + 0.5);
        float swashEdge = 1.0 - smoothstep(0.0, 3.2, vShoreDist);

        float inPierBox = step(-296.0, vWorldPos.x) * step(vWorldPos.x, -200.0) *
                          step(-33.0, vWorldPos.z) * step(vWorldPos.z, 23.0);
        float pierFoam = inPierBox * 0.25 * (0.5 + 0.5 * sin(vWorldPos.x * 0.9 + uTime * 2.8) * cos(vWorldPos.z * 0.9));

        float foam = clamp(shoreFoam * 0.85 + swashEdge * 0.75 + pierFoam, 0.0, 1.0);
        waterCol = mix(waterCol, vec3(0.94, 0.97, 0.99), foam);

        vec3 H = normalize(uSunDir + V);
        float specTight = pow(max(dot(N, H), 0.0), 210.0) * 2.4;
        float specBroad = pow(max(dot(N, H), 0.0), 26.0) * 0.28;
        waterCol += uSunColor * (specTight + specBroad) * (1.0 - foam * 0.65);

        float camDist = length(cameraPosition - vWorldPos);
        float fogFactor = 1.0 - exp(- (uFogDensity * camDist) * (uFogDensity * camDist));
        waterCol = mix(waterCol, uFogColor, clamp(fogFactor, 0.0, 1.0));

        float alpha = mix(0.76, 0.98, smoothstep(0.0, 10.0, vShoreDist));
        gl_FragColor = vec4(waterCol, alpha);
      }
    `,
  });

  {
    const westOceanGeo = new THREE.PlaneGeometry(785, 1700, isMobile ? 68 : 136, isMobile ? 78 : 150);
    westOceanGeo.rotateX(-Math.PI / 2);
    addStaticMesh(westOceanGeo, oceanMat, -587.5, -0.14, 0, false, false);

    const southOceanGeo = new THREE.PlaneGeometry(1400, 700, isMobile ? 18 : 48, isMobile ? 14 : 36);
    southOceanGeo.rotateX(-Math.PI / 2);
    addStaticMesh(southOceanGeo, oceanMat, 505, -0.16, 588, false, false);

    const eastOceanGeo = new THREE.PlaneGeometry(700, 900, isMobile ? 14 : 36, isMobile ? 18 : 48);
    eastOceanGeo.rotateX(-Math.PI / 2);
    addStaticMesh(eastOceanGeo, oceanMat, 602, -0.16, -210, false, false);
  }

  // Bến Cảng Bồng Lai (Del Perro Pier + Giant Thiên Luân Wheel + Dragon Coaster)
  let ferrisRotorGroup = null;
  const ferrisCabins = [];
  const ferrisRimBulbs = [];
  let coasterCurve = null;
  const coasterCars = [];

  {
    const rampLen = Math.hypot(24, PIER_DECK_Y - SIDEWALK_Y);
    const rampAngle = Math.atan2(PIER_DECK_Y - SIDEWALK_Y, 24);
    const rampGeo = makeTiledBoxGeometry(rampLen + 0.4, 0.36, 24.0, 3.2, 0.4, tex.woodPier);
    const rampMesh = new THREE.Mesh(rampGeo, mats.pierWood);
    rampMesh.position.set(-140.0, (SIDEWALK_Y + PIER_DECK_Y) * 0.5 - 0.16, -10.0);
    rampMesh.rotation.z = -rampAngle;
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    worldRoot.add(rampMesh);

    for (const rz of [-21.8, 1.8]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(rampLen, 1.05, 0.32), mats.vermilionWood);
      rail.position.set(-140.0, (SIDEWALK_Y + PIER_DECK_Y) * 0.5 + 0.52, rz);
      rail.rotation.z = -rampAngle;
      worldRoot.add(rail);
      addAABB(-152, -128.5, rz - 0.25, rz + 0.25, PIER_DECK_Y + 1.2, 0, 'pier_ramp_rail');
    }

    // Grand Cổng Tam Quan at Pier Entrance (X = -129.5)
    buildPaifangGate(-129.5, SIDEWALK_Y, -10.0, 24.2, false, 'BẾN CẢNG BỒNG LAI', 'THIÊN LUÂN HẢI CÁC');

    addStaticMesh(makeTiledBoxGeometry(46, 0.44, 30, 3.2, 0.44, tex.woodPier), mats.pierWood, -175.0, PIER_DECK_Y - 0.22, -11.0, true, true);
    addStaticMesh(makeTiledBoxGeometry(97, 0.48, 54, 3.2, 0.48, tex.woodPier), mats.pierWood, -246.5, PIER_DECK_Y - 0.24, -5.0, true, true);

    const railH = 1.05;
    const pierRails = [
      [-198, -152, -25.8, -25.5],
      [-198, -152, 3.5, 3.8],
      [-198.3, -197.8, -32.0, -25.5],
      [-198.3, -197.8, 3.5, 22.0],
      [-295, -198, -31.8, -31.5],
      [-295, -198, 21.5, 21.8],
      [-295.0, -294.6, -32.0, 22.0],
    ];
    for (let i = 0; i < pierRails.length; i++) {
      const [x1, x2, z1, z2] = pierRails[i];
      addStaticMesh(new THREE.BoxGeometry(x2 - x1, railH, z2 - z1), mats.vermilionWood, (x1 + x2) * 0.5, PIER_DECK_Y + railH * 0.5, (z1 + z2) * 0.5, false, true);
      addAABB(x1, x2, z1, z2, PIER_DECK_Y + railH, PIER_DECK_Y - 0.2, 'pier_rail');
    }

    for (let lx = -160; lx >= -288; lx -= 26) {
      streetlampPositions.push({ x: lx, y: PIER_DECK_Y, z: -24.5, yaw: 0, doubleArm: false });
      streetlampPositions.push({ x: lx, y: PIER_DECK_Y, z: lx < -200 ? 20.5 : 2.8, yaw: Math.PI, doubleArm: false });
    }

    // Pilings
    const pilingCoords = [];
    for (let px = -146; px >= -194; px -= 12) for (const pz of [-24, -15, -6, 2.5]) pilingCoords.push([px, pz]);
    for (let px = -202; px >= -292; px -= 11) for (const pz of [-30, -20, -10, 0, 10, 20]) pilingCoords.push([px, pz]);

    const pilingInst = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.32, 0.36, 7.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x4b3324, roughness: 0.9 }),
      pilingCoords.length
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < pilingCoords.length; i++) {
      const [px, pz] = pilingCoords[i];
      const topY = px > -152 ? getPierHeight(px, pz) - 0.2 : PIER_DECK_Y - 0.25;
      dummy.position.set(px, topY - 3.6, pz);
      dummy.updateMatrix();
      pilingInst.setMatrixAt(i, dummy.matrix);
    }
    pilingInst.instanceMatrix.needsUpdate = true;
    worldRoot.add(pilingInst);

    // Giant Rotating "Thiên Luân" Wheel (-245, 25, -12) with Vermilion-Gold Pagoda Gondolas!
    const fwGroup = new THREE.Group();
    fwGroup.position.set(-245, 25.0, -12.0);
    fwGroup.rotation.y = 0.36;
    worldRoot.add(fwGroup);

    const legGeo = new THREE.CylinderGeometry(0.34, 0.46, 22.4, 8);
    for (const sideZ of [-3.4, 3.4]) {
      for (const sideX of [-1, 1]) {
        const leg = new THREE.Mesh(legGeo, mats.vermilionWood);
        leg.position.set(sideX * 4.75, -10.6, sideZ);
        leg.rotation.z = sideX * 0.42;
        fwGroup.add(leg);
      }
    }
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 7.6, 16), mats.imperialGold);
    axle.rotation.x = Math.PI / 2;
    fwGroup.add(axle);

    ferrisRotorGroup = new THREE.Group();
    fwGroup.add(ferrisRotorGroup);

    const wheelRadius = 20.0;
    const neonRimMatA = new THREE.MeshBasicMaterial({ color: 0xffbf3b });
    const neonRimMatB = new THREE.MeshBasicMaterial({ color: 0x38e09c });

    for (const wz of [-2.2, 2.2]) {
      const outerTorus = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius, 0.26, 10, 48), mats.imperialGold);
      outerTorus.position.z = wz;
      ferrisRotorGroup.add(outerTorus);

      const innerNeon = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius - 2.4, 0.16, 8, 48), wz < 0 ? neonRimMatA : neonRimMatB);
      innerNeon.position.z = wz;
      ferrisRotorGroup.add(innerNeon);
      ferrisRimBulbs.push(innerNeon);
    }

    const spokeGeo = new THREE.CylinderGeometry(0.09, 0.09, wheelRadius, 6);
    const barGeo = new THREE.CylinderGeometry(0.11, 0.11, 4.4, 8);
    barGeo.rotateX(Math.PI / 2);
    const cabinRoofGeo = new THREE.ConeGeometry(1.75, 0.75, 4);
    cabinRoofGeo.rotateY(Math.PI / 4);
    const cabinBodyGeo = new THREE.BoxGeometry(1.85, 1.15, 1.95);
    const hangerGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.35, 6);

    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const cx = Math.cos(ang) * wheelRadius;
      const cy = Math.sin(ang) * wheelRadius;

      for (const wz of [-2.2, 2.2]) {
        const sp = new THREE.Mesh(spokeGeo, mats.vermilionWood);
        sp.position.set(cx * 0.5, cy * 0.5, wz);
        sp.rotation.z = ang - Math.PI / 2;
        ferrisRotorGroup.add(sp);
      }
      const bar = new THREE.Mesh(barGeo, mats.imperialGold);
      bar.position.set(cx, cy, 0);
      ferrisRotorGroup.add(bar);

      const cabinPivot = new THREE.Group();
      cabinPivot.position.set(cx, cy, 0);
      const hanger = new THREE.Mesh(hangerGeo, mats.imperialGold);
      hanger.position.y = -0.68;
      cabinPivot.add(hanger);

      const roof = new THREE.Mesh(cabinRoofGeo, i % 2 === 0 ? mats.pagodaTileCrimson : mats.pagodaTileJade);
      roof.position.y = -1.25;
      cabinPivot.add(roof);

      const lowerTub = new THREE.Mesh(cabinBodyGeo, mats.vermilionWood);
      lowerTub.position.y = -2.25;
      cabinPivot.add(lowerTub);

      ferrisRotorGroup.add(cabinPivot);
      ferrisCabins.push(cabinPivot);
    }

    addAABB(-253.5, -236.5, -16.2, -14.6, PIER_DECK_Y + 3.0, PIER_DECK_Y, 'fw_leg_s');
    addAABB(-253.5, -236.5, -9.4, -7.8, PIER_DECK_Y + 3.0, PIER_DECK_Y, 'fw_leg_n');

    // Coaster ("Xích Long Xa")
    const coasterPts = [
      new THREE.Vector3(-208, PIER_DECK_Y + 2.2, 6.5),
      new THREE.Vector3(-222, PIER_DECK_Y + 8.8, 5.2),
      new THREE.Vector3(-238, PIER_DECK_Y + 14.5, 8.0),
      new THREE.Vector3(-254, PIER_DECK_Y + 5.0, 12.2),
      new THREE.Vector3(-270, PIER_DECK_Y + 12.2, 7.5),
      new THREE.Vector3(-286, PIER_DECK_Y + 7.2, 12.8),
      new THREE.Vector3(-278, PIER_DECK_Y + 4.4, 18.8),
      new THREE.Vector3(-258, PIER_DECK_Y + 9.6, 17.6),
      new THREE.Vector3(-236, PIER_DECK_Y + 4.2, 18.4),
      new THREE.Vector3(-216, PIER_DECK_Y + 6.8, 15.2),
      new THREE.Vector3(-206, PIER_DECK_Y + 2.5, 11.2),
    ];
    coasterCurve = new THREE.CatmullRomCurve3(coasterPts, true, 'catmullrom', 0.5);
    worldRoot.add(new THREE.Mesh(new THREE.TubeGeometry(coasterCurve, 140, 0.24, 8, true), mats.vermilionWood));

    for (let s = 0; s < 22; s++) {
      const pt = coasterCurve.getPointAt(s / 22);
      const colH = pt.y - PIER_DECK_Y;
      if (colH > 0.4) {
        addStaticMesh(new THREE.CylinderGeometry(0.16, 0.20, colH, 6), mats.darkWalnut, pt.x, PIER_DECK_Y + colH * 0.5, pt.z, false, false);
      }
    }

    const carBodyGeo = new THREE.BoxGeometry(2.1, 0.75, 1.25);
    for (let ci = 0; ci < 3; ci++) {
      const carGrp = new THREE.Group();
      const body = new THREE.Mesh(carBodyGeo, mats.imperialGold);
      body.position.y = 0.65;
      carGrp.add(body);
      worldRoot.add(carGrp);
      coasterCars.push(carGrp);
    }
  }

  // ==========================================================================
  // 8. North Misty Wuxia Peaks ("Đỉnh Hoa Sơn") + Giant 3D "GIANG HỒ" Monument + Cliff Pavilion
  // ==========================================================================
  {
    const hw = 510, hd = 170;
    const hillGeo = new THREE.PlaneGeometry(hw, hd, isMobile ? 46 : 92, isMobile ? 22 : 42);
    hillGeo.rotateX(-Math.PI / 2);
    const pos = hillGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cLow = new THREE.Color(0x2f5e3b);
    const cMid = new THREE.Color(0x4a6948);
    const cRock = new THREE.Color(0x636b70);
    const cPeak = new THREE.Color(0x889296);
    const tmpCol = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i) + 15.0;
      const wz = pos.getZ(i) - 310.0;
      const wy = getHillHeight(wx, wz);
      pos.setX(i, wx);
      pos.setY(i, wy);
      pos.setZ(i, wz);

      if (wy < 22) tmpCol.copy(cLow).lerp(cMid, clamp(wy / 22, 0, 1));
      else if (wy < 58) tmpCol.copy(cMid).lerp(cRock, clamp((wy - 22) / 36, 0, 1));
      else tmpCol.copy(cRock).lerp(cPeak, clamp((wy - 58) / 34, 0, 1));

      colors[i * 3] = tmpCol.r;
      colors[i * 3 + 1] = tmpCol.g;
      colors[i * 3 + 2] = tmpCol.b;
    }
    hillGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    hillGeo.computeVertexNormals();

    const hillMesh = new THREE.Mesh(hillGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.90 }));
    hillMesh.receiveShadow = true;
    hillMesh.castShadow = true;
    worldRoot.add(hillMesh);

    for (let tx = -180; tx <= 230; tx += 26) {
      const tz = -238 - ((Math.abs(tx * 17) % 55));
      const ty = getHillHeight(tx, tz);
      if (ty < 52) {
        if (Math.abs(tx) % 52 === 0) cherryTreePositions.push({ x: tx, y: ty - 0.2, z: tz, scale: 1.45 });
        else bambooClusterPositions.push({ x: tx, y: ty - 0.2, z: tz, scale: 1.55 });
      }
    }

    // Ancient Cliffside Mountain Pagoda Pavilion ("Quan Sơn Đình") at (-45, peak, -285)
    {
      const px = -45, pz = -282;
      const py = getHillHeight(px, pz);
      addStaticMesh(new THREE.CylinderGeometry(6.5, 7.2, 2.2, 6), mats.limestone, px, py + 0.8, pz, true, true);
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI * 2;
        addStaticMesh(new THREE.CylinderGeometry(0.28, 0.32, 5.2, 8), mats.vermilionWood, px + Math.cos(ang) * 4.8, py + 4.4, pz + Math.sin(ang) * 4.8, true, false);
      }
      addPagodaRoof(px, py + 6.9, pz, 8.8, 8.8, 'crimson', true);
      addPagodaRoof(px, py + 9.8, pz, 5.8, 5.8, 'jade', true);
    }

    // GIANT GLOWING JADE-GOLD 3D "VÕ LÂM" MONUMENT SIGN AT (60, 62, -295)
    const signMat = new THREE.MeshStandardMaterial({
      color: 0xfff5d6,
      emissive: 0xf0c35a,
      emissiveIntensity: 0.42,
      roughness: 0.28,
      metalness: 0.35,
    });

    const letterStrokes = {
      V: [[-0.42, 1.0, 0.0, 0.0], [0.42, 1.0, 0.0, 0.0]],
      O: [[-0.36, 0.08, -0.36, 0.92], [0.36, 0.08, 0.36, 0.92], [-0.32, 0.96, 0.32, 0.96], [-0.32, 0.04, 0.32, 0.04], [-0.16, 1.15, 0.0, 1.24], [0.0, 1.24, 0.16, 1.15]],
      L: [[-0.36, 1.0, -0.36, 0.0], [-0.36, 0.0, 0.38, 0.0]],
      A: [[-0.42, 0.0, 0.0, 1.0], [0.42, 0.0, 0.0, 1.0], [-0.24, 0.42, 0.24, 0.42], [-0.18, 1.12, 0.0, 1.24], [0.0, 1.24, 0.18, 1.12]],
      M: [[-0.44, 0.0, -0.44, 1.0], [-0.44, 1.0, 0.0, 0.38], [0.0, 0.38, 0.44, 1.0], [0.44, 1.0, 0.44, 0.0]],
    };

    const word = ['V', 'O', 'L', 'A', 'M'];
    const letterW = 10.5, letterH = 14.5, spacing = 14.2, barThick = 1.8, barDepth = 1.3;
    const startX = 60 - ((word.length - 1) * spacing) * 0.5;

    for (let li = 0; li < word.length; li++) {
      const ch = word[li];
      const lx = startX + li * spacing + (li >= 2 ? 4.5 : 0);
      const groundY = Math.max(58.0, getHillHeight(lx, -295));
      const lGroup = new THREE.Group();
      lGroup.position.set(lx, groundY + 1.2, -295);

      for (const [x1, y1, x2, y2] of letterStrokes[ch]) {
        const sx1 = x1 * letterW, sy1 = y1 * letterH;
        const sx2 = x2 * letterW, sy2 = y2 * letterH;
        const len = Math.hypot(sx2 - sx1, sy2 - sy1) + barThick * 0.35;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(len, barThick, barDepth), signMat);
        bar.position.set((sx1 + sx2) * 0.5, (sy1 + sy2) * 0.5, 0);
        bar.rotation.z = Math.atan2(sy2 - sy1, sx2 - sx1);
        lGroup.add(bar);
      }
      worldRoot.add(lGroup);
    }
  }

  // ==========================================================================
  // 9. Instanced Pink Cherry Blossom Trees, Jade Bamboo Groves, Palms & Silk Lantern Streetlamps
  // ==========================================================================

  // 9A. Instanced Pink Cherry Blossom Trees (`Hoa Đào Cổ Thụ`)
  if (cherryTreePositions.length > 0) {
    const count = cherryTreePositions.length;
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.32, 3.1, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x452920, roughness: 0.90 });
    const blossomGeo = new THREE.DodecahedronGeometry(2.25, 1);
    const blossomMatA = new THREE.MeshStandardMaterial({ color: 0xf79bb8, roughness: 0.72, emissive: 0x3b0f1e, emissiveIntensity: 0.14 });
    const blossomMatB = new THREE.MeshStandardMaterial({ color: 0xffc4d6, roughness: 0.70, emissive: 0x3b0f1e, emissiveIntensity: 0.12 });

    const tInst = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const bInstA = new THREE.InstancedMesh(blossomGeo, blossomMatA, count);
    const bInstB = new THREE.InstancedMesh(blossomGeo, blossomMatB, count);
    tInst.castShadow = true;
    bInstA.castShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const p = cherryTreePositions[i];
      const s = p.scale || 1.0;
      dummy.position.set(p.x, p.y + 1.5 * s, p.z);
      dummy.rotation.set(0.05, i * 1.1, -0.04);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      tInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(p.x - 0.35 * s, p.y + 3.8 * s, p.z + 0.2 * s);
      dummy.scale.set(s * 1.12, s * 0.78, s * 1.08);
      dummy.updateMatrix();
      bInstA.setMatrixAt(i, dummy.matrix);

      dummy.position.set(p.x + 0.75 * s, p.y + 4.35 * s, p.z - 0.35 * s);
      dummy.scale.set(s * 0.86, s * 0.68, s * 0.88);
      dummy.updateMatrix();
      bInstB.setMatrixAt(i, dummy.matrix);
    }
    worldRoot.add(tInst, bInstA, bInstB);
  }

  // 9B. Instanced Jade Bamboo Groves (`Rừng Trúc Xanh`)
  if (bambooClusterPositions.length > 0) {
    const stalksPerCluster = 4;
    const totalStalks = bambooClusterPositions.length * stalksPerCluster;
    const stalkGeo = new THREE.CylinderGeometry(0.07, 0.09, 5.4, 6);
    const stalkMat = new THREE.MeshStandardMaterial({ color: 0x368547, roughness: 0.55 });
    const leafGeo = new THREE.ConeGeometry(1.35, 1.8, 5);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2c7840, roughness: 0.75 });

    const sInst = new THREE.InstancedMesh(stalkGeo, stalkMat, totalStalks);
    const lInst = new THREE.InstancedMesh(leafGeo, leafMat, totalStalks);
    sInst.castShadow = true;

    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let i = 0; i < bambooClusterPositions.length; i++) {
      const c = bambooClusterPositions[i];
      const sc = c.scale || 1.0;
      for (let k = 0; k < stalksPerCluster; k++) {
        const ang = k * 1.57 + i * 0.5;
        const ox = Math.cos(ang) * 0.34;
        const oz = Math.sin(ang) * 0.34;
        const hMul = sc * (0.85 + (k % 3) * 0.14);

        dummy.position.set(c.x + ox, c.y + 2.6 * hMul, c.z + oz);
        dummy.rotation.set((k - 1.5) * 0.03, ang, (1.5 - k) * 0.03);
        dummy.scale.set(sc, hMul, sc);
        dummy.updateMatrix();
        sInst.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(c.x + ox * 1.3, c.y + 5.1 * hMul, c.z + oz * 1.3);
        dummy.scale.set(sc, sc, sc);
        dummy.updateMatrix();
        lInst.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    }
    worldRoot.add(sInst, lInst);
  }

  // 9C. Coastal Palms
  if (palmPositions.length > 0) {
    const count = palmPositions.length;
    const segGeo = new THREE.CylinderGeometry(0.19, 0.28, 6.8, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6e523a, roughness: 0.92 });
    const crownGeo = new THREE.ConeGeometry(2.85, 1.65, 7);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x2f7d42, roughness: 0.78 });

    const tInst = new THREE.InstancedMesh(segGeo, trunkMat, count);
    const cInst = new THREE.InstancedMesh(crownGeo, crownMat, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const p = palmPositions[i];
      const s = p.scale || 1.0;
      dummy.position.set(p.x, p.y + 3.4 * s, p.z);
      dummy.rotation.set(p.leanZ || 0, 0, -(p.leanX || 0));
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      tInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(p.x + (p.leanX || 0) * 3.4, p.y + 6.9 * s, p.z + (p.leanZ || 0) * 3.4);
      dummy.rotation.set(0, i * 0.7, 0);
      dummy.updateMatrix();
      cInst.setMatrixAt(i, dummy.matrix);
    }
    worldRoot.add(tInst, cInst);
  }

  // 9D. Instanced Ornate Vermilion Streetlamps with Glowing Red Silk Lanterns (`Đèn Lồng Đỏ`)
  const lampBulbMat = new THREE.MeshStandardMaterial({
    color: 0xff3b2f,
    emissive: new THREE.Color(0xff5e24),
    emissiveIntensity: 1.25,
    roughness: 0.28,
  });

  {
    const count = streetlampPositions.length;
    const poleGeo = new THREE.CylinderGeometry(0.11, 0.16, 6.8, 8);
    const armGeo = new THREE.BoxGeometry(1.9, 0.14, 0.16);
    const lanternGeo = new THREE.SphereGeometry(0.32, 10, 8);
    lanternGeo.scale(0.92, 1.24, 0.92);

    const poleInst = new THREE.InstancedMesh(poleGeo, mats.vermilionWood, count);
    const armInst = new THREE.InstancedMesh(armGeo, mats.imperialGold, count * 2);
    const bulbInst = new THREE.InstancedMesh(lanternGeo, lampBulbMat, count * 2);
    poleInst.castShadow = true;

    const registeredLampVecs = [];
    const dummy = new THREE.Object3D();
    let armIdx = 0;

    for (let i = 0; i < count; i++) {
      const lp = streetlampPositions[i];
      dummy.position.set(lp.x, lp.y + 3.4, lp.z);
      dummy.rotation.set(0, lp.yaw || 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      poleInst.setMatrixAt(i, dummy.matrix);

      const arms = lp.doubleArm ? [-1, 1] : [1];
      for (let a = 0; a < arms.length; a++) {
        const dir = arms[a];
        const cosY = Math.cos(lp.yaw || 0) * dir;
        const sinY = Math.sin(lp.yaw || 0) * dir;

        dummy.position.set(lp.x + cosY * 0.85, lp.y + 6.72, lp.z - sinY * 0.85);
        dummy.rotation.set(0, lp.yaw || 0, 0);
        dummy.updateMatrix();
        armInst.setMatrixAt(armIdx, dummy.matrix);

        const bx = lp.x + cosY * 1.62;
        const by = lp.y + 6.28;
        const bz = lp.z - sinY * 1.62;
        dummy.position.set(bx, by, bz);
        dummy.updateMatrix();
        bulbInst.setMatrixAt(armIdx, dummy.matrix);

        registeredLampVecs.push(new THREE.Vector3(bx, by - 0.2, bz));
        armIdx++;
      }
    }
    armInst.count = armIdx;
    bulbInst.count = armIdx;
    poleInst.instanceMatrix.needsUpdate = true;
    armInst.instanceMatrix.needsUpdate = true;
    bulbInst.instanceMatrix.needsUpdate = true;
    worldRoot.add(poleInst, armInst, bulbInst);

    if (typeof ctx?.engine?.registerStreetlamps === 'function') {
      ctx.engine.registerStreetlamps(registeredLampVecs);
    }
  }

  // ==========================================================================
  // 10. Gameplay, Physics, LOS, GPS & Zone Names API
  // ==========================================================================
  function getGroundHeight(x, z, refY) {
    if (x > 750 && x < 850 && z > 750 && z < 850) return 0.02;
    if (x > 1050 && x < 1150 && z > 1050 && z < 1150) return 0.02;
    if (x > 1350 && x < 1450 && z > 1350 && z < 1450) return 0.02;
    if (x > 1730 && x < 1870 && z > 1740 && z < 1860) return 0.02;
    if (x >= 136 && x <= 184 && z >= -64 && z <= -16) {
      if (refY !== undefined) return refY >= 60 ? 78.0 : refY >= 30 ? 48.0 : 78.0;
      const p = ctx?.player;
      if (p && Math.abs(x - p.x) < 4.5 && Math.abs(z - p.z) < 4.5 && p.y > 60) return 78.0;
      if (z < -25.5) return 78.0;
      return 48.0;
    }
    if (isOnPier(x, z)) return getPierHeight(x, z);
    if (z < -225) return getHillHeight(x, z);
    if (x < -128) return getBeachHeight(x, z);
    if (x >= -67 && x <= -48 && z >= 74.5 && z <= 85.5) return 0.04;
    if (x >= 128 && x <= 149.5 && z >= 48 && z <= 75.8) return 0.05;
    if (isOnCityRoad(x, z)) return ROAD_Y;
    return SIDEWALK_Y;
  }

  function getZoneInfo(x, z) {
    if (x > 1730 && z > 1740) {
      return { streetName: 'Sân Vận Động Đại Đấu Trường', zoneName: 'Thử Thách Boss Huyền Thoại' };
    }
    if (x > 1350 && z > 1350) {
      return { streetName: 'Nội Đường Võ Quán', zoneName: 'Cửa Hàng Tuyển Đệ Tử' };
    }
    if (x > 1050 && z > 1050) {
      return { streetName: 'Sòng Bạc Tài Xỉu VIP', zoneName: 'Bar Club Đêm Hoa Đăng' };
    }
    if (x > 750 && z > 750) {
      return { streetName: 'Tĩnh Tâm Các Nội Viện', zoneName: 'Biệt Viện Ẩn Cư Giang Hồ' };
    }
    if (isOnPier(x, z)) {
      return { streetName: 'Thiên Luân Thủy Các', zoneName: 'Bến Cảng Bồng Lai' };
    }
    if (x < -198) {
      return { streetName: 'Vịnh Bích Hải', zoneName: 'Đông Hải • Sóng Biếc Giang Hồ' };
    }
    if (x < -128) {
      return { streetName: 'Bờ Cát Vàng Ngân Sa', zoneName: 'Đông Hải • Bến Cảng Bồng Lai' };
    }
    if (z < -225) {
      return { streetName: 'Đỉnh Hoa Sơn • Chữ VÕ LÂM', zoneName: 'Thiên Sơn Tuyệt Đỉnh' };
    }

    const aveNames = [
      'Đại Lộ Ven Biển Bích Hải',
      'Đại Lộ Bạch Hổ',
      'Đại Lộ Chu Tước',
      'Đại Lộ Thanh Long',
      'Đại Lộ Huyền Vũ',
    ];
    const stNames = [
      'Phố Vọng Sơn',
      'Phố Tĩnh Tâm',
      'Quảng Trường Thiên Cơ',
      'Phố Tửu Lâu Giang Nam',
      'Phố Dược Vương',
      'Phố Nam Hải',
    ];

    let bestAveDist = Infinity, bestAveIdx = 2;
    for (let i = 0; i < AVENUES.length; i++) {
      const d = Math.abs(x - AVENUES[i]);
      if (d < bestAveDist) { bestAveDist = d; bestAveIdx = i; }
    }
    let bestStDist = Infinity, bestStIdx = 3;
    for (let i = 0; i < STREETS.length; i++) {
      const d = Math.abs(z - STREETS[i]);
      if (d < bestStDist) { bestStDist = d; bestStIdx = i; }
    }

    const streetName = Math.abs(x - BOULEVARD_X) <= 22
      ? 'Đại Lộ Chu Tước'
      : bestAveDist <= bestStDist ? aveNames[bestAveIdx] : stNames[bestStIdx];

    let zoneName = 'Phường Thương Hội Giang Nam';
    if (x >= -112 && x <= -48 && z >= 48 && z <= 112) zoneName = 'Tụ Bảo Xa Các • Công Xưởng';
    else if (x >= 51 && x <= 112 && z >= 128 && z <= 192) zoneName = 'Thái Y Viện • Dược Vương Cốc';
    else if (x >= 128 && x <= 192 && z >= 48 && z <= 112) zoneName = 'Lục Phiến Môn • Đại Lý Tự';
    else if (x >= 128 && x <= 192 && z >= -70 && z <= 32) zoneName = 'Tháp Thiên Cơ • Tàng Kinh Các';
    else if (x >= 110) zoneName = 'Kinh Thành Nội Đô';
    else if (x >= 18 && x < 110) zoneName = 'Phố Hoa Đăng Chu Tước';
    else if (z < -115) zoneName = 'Chân Núi Hoa Sơn';

    return { streetName, zoneName };
  }

  function resolveCircleAABB(ent, radius = 0.42) {
    if (!ent || !Number.isFinite(ent.x) || !Number.isFinite(ent.z)) {
      return { hit: false, normalX: 0, normalZ: 0 };
    }
    const r = Math.max(0.15, radius);
    const inSafehouse = ent.x > 700 && ent.z > 700;
    if (!inSafehouse) {
      ent.x = clamp(ent.x, -318, 278);
      ent.z = clamp(ent.z, -375, 258);
    }

    const entY = Number.isFinite(ent.y) ? ent.y : 0;
    const nearby = queryAABBs(ent.x - r - 0.5, ent.x + r + 0.5, ent.z - r - 0.5, ent.z + r + 0.5);

    let hit = false, lastNX = 0, lastNZ = 0;
    for (let i = 0; i < nearby.length; i++) {
      const b = nearby[i];
      if (entY >= b.maxY - 0.05) continue;
      if (b.minY > 0 && entY + 1.85 < b.minY) continue;

      const cx = clamp(ent.x, b.minX, b.maxX);
      const cz = clamp(ent.z, b.minZ, b.maxZ);
      const dx = ent.x - cx, dz = ent.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;

      hit = true;
      if (d2 > 1e-8) {
        const dist = Math.sqrt(d2);
        const nx = dx / dist, nz = dz / dist;
        ent.x += nx * (r - dist);
        ent.z += nz * (r - dist);
        lastNX = nx; lastNZ = nz;
      } else {
        const dLeft = ent.x - b.minX, dRight = b.maxX - ent.x;
        const dTop = ent.z - b.minZ, dBot = b.maxZ - ent.z;
        const m = Math.min(dLeft, dRight, dTop, dBot);
        if (m === dLeft) { ent.x = b.minX - r; lastNX = -1; lastNZ = 0; }
        else if (m === dRight) { ent.x = b.maxX + r; lastNX = 1; lastNZ = 0; }
        else if (m === dTop) { ent.z = b.minZ - r; lastNX = 0; lastNZ = -1; }
        else { ent.z = b.maxZ + r; lastNX = 0; lastNZ = 1; }
      }
    }
    return { hit, normalX: lastNX, normalZ: lastNZ };
  }

  function resolveCarAABB(car) {
    if (!car || !Number.isFinite(car.x) || !Number.isFinite(car.z)) {
      return { hit: false, normalX: 0, normalZ: 0, impactSpeed: 0 };
    }
    let hit = false, outNX = 0, outNZ = 0;
    if (car.x < -315) { car.x = -315; hit = true; outNX = 1; }
    else if (car.x > 275) { car.x = 275; hit = true; outNX = -1; }
    if (car.z < -370) { car.z = -370; hit = true; outNZ = 1; }
    else if (car.z > 255) { car.z = 255; hit = true; outNZ = -1; }

    const carY = Number.isFinite(car.y) ? car.y : 0;
    const yaw = Number.isFinite(car.yaw) ? car.yaw : (car.rotation || 0);
    const hw = car.halfW || (car.width ? car.width * 0.5 : 0.98);
    const hl = car.halfL || (car.length ? car.length * 0.5 : 2.25);
    const boundR = Math.hypot(hw, hl) + 0.5;

    const ux = Math.cos(yaw), uz = -Math.sin(yaw);
    const fx = Math.sin(yaw), fz = Math.cos(yaw);

    const nearby = queryAABBs(car.x - boundR, car.x + boundR, car.z - boundR, car.z + boundR);
    const axesX = [1, 0, ux, fx];
    const axesZ = [0, 1, uz, fz];

    for (let i = 0; i < nearby.length; i++) {
      const b = nearby[i];
      if (carY >= b.maxY - 0.15) continue;
      if (b.minY > 0 && carY + 2.2 < b.minY) continue;

      const bcx = (b.minX + b.maxX) * 0.5, bcz = (b.minZ + b.maxZ) * 0.5;
      const bhw = (b.maxX - b.minX) * 0.5, bhl = (b.maxZ - b.minZ) * 0.5;
      const dx = car.x - bcx, dz = car.z - bcz;

      let minOverlap = Infinity, bestAX = 0, bestAZ = 0, separated = false;
      for (let a = 0; a < 4; a++) {
        const ax = axesX[a], az = axesZ[a];
        const projCar = hw * Math.abs(ux * ax + uz * az) + hl * Math.abs(fx * ax + fz * az);
        const projBox = bhw * Math.abs(ax) + bhl * Math.abs(az);
        const distProj = dx * ax + dz * az;
        const overlap = projCar + projBox - Math.abs(distProj);
        if (overlap <= 0) { separated = true; break; }
        if (overlap < minOverlap) {
          minOverlap = overlap;
          const sign = distProj >= 0 ? 1 : -1;
          bestAX = ax * sign; bestAZ = az * sign;
        }
      }
      if (!separated && minOverlap < Infinity) {
        car.x += bestAX * minOverlap;
        car.z += bestAZ * minOverlap;
        hit = true; outNX = bestAX; outNZ = bestAZ;
      }
    }

    let impactSpeed = 0;
    if (hit) {
      const nLen = Math.hypot(outNX, outNZ) || 1;
      outNX /= nLen; outNZ /= nLen;
      if (Number.isFinite(car.vx) && Number.isFinite(car.vz)) {
        const vn = car.vx * outNX + car.vz * outNZ;
        impactSpeed = vn < 0 ? -vn : Math.hypot(car.vx, car.vz) * 0.35;
      } else {
        impactSpeed = Math.abs(car.speed || 0);
      }
    }
    return { hit, normalX: outNX, normalZ: outNZ, impactSpeed };
  }

  function raycastWorld(x1, y1, z1, x2, y2, z2) {
    const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
    const candidates = queryAABBs(Math.min(x1, x2), Math.max(x1, x2), Math.min(z1, z2), Math.max(z1, z2));
    let closestT = 1.0, hitBox = null, hitNX = 0, hitNY = 0, hitNZ = 0;

    for (let i = 0; i < candidates.length; i++) {
      const b = candidates[i];
      const bMinY = b.minY || 0, bMaxY = b.maxY;
      let tmin = 0.0005, tmax = closestT, nx = 0, ny = 0, nz = 0;

      if (Math.abs(dx) < 1e-8) { if (x1 < b.minX || x1 > b.maxX) continue; }
      else {
        const inv = 1 / dx;
        let t1 = (b.minX - x1) * inv, t2 = (b.maxX - x1) * inv, s = -1;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; s = 1; }
        if (t1 > tmin) { tmin = t1; nx = s; ny = 0; nz = 0; }
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) continue;
      }

      if (Math.abs(dy) < 1e-8) { if (y1 < bMinY || y1 > bMaxY) continue; }
      else {
        const inv = 1 / dy;
        let t1 = (bMinY - y1) * inv, t2 = (bMaxY - y1) * inv, s = -1;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; s = 1; }
        if (t1 > tmin) { tmin = t1; nx = 0; ny = s; nz = 0; }
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) continue;
      }

      if (Math.abs(dz) < 1e-8) { if (z1 < b.minZ || z1 > b.maxZ) continue; }
      else {
        const inv = 1 / dz;
        let t1 = (b.minZ - z1) * inv, t2 = (b.maxZ - z1) * inv, s = -1;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; s = 1; }
        if (t1 > tmin) { tmin = t1; nx = 0; ny = 0; nz = s; }
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) continue;
      }

      if (tmin < closestT && tmin >= 0.0005) {
        closestT = tmin; hitBox = b; hitNX = nx; hitNY = ny; hitNZ = nz;
      }
    }

    if (hitBox) {
      return { hit: true, t: closestT, x: x1 + dx * closestT, y: y1 + dy * closestT, z: z1 + dz * closestT, normalX: hitNX, normalY: hitNY, normalZ: hitNZ, aabb: hitBox };
    }
    return { hit: false, t: 1.0, x: x2, y: y2, z: z2, normalX: 0, normalY: 1, normalZ: 0, aabb: null };
  }

  function checkLOS(x1, y1, z1, x2, y2, z2) {
    return !raycastWorld(x1, y1, z1, x2, y2, z2).hit;
  }

  function findGPSPath(x1, z1, x2, z2) {
    if (!Number.isFinite(x1) || !Number.isFinite(z1) || !Number.isFinite(x2) || !Number.isFinite(z2)) return [];
    if (Math.hypot(x2 - x1, z2 - z1) < 28 || (x1 < -135 && x2 < -135)) {
      return [{ x: x1, z: z1 }, { x: x2, z: z2 }];
    }
    const startNode = roadGraph.getNearestNode(x1, z1);
    const endNode = roadGraph.getNearestNode(x2, z2);
    if (!startNode || !endNode) return [{ x: x1, z: z1 }, { x: x2, z: z2 }];
    if (startNode.id === endNode.id) return [{ x: x1, z: z1 }, { x: startNode.x, z: startNode.z }, { x: x2, z: z2 }];

    const N = roadNodes.length;
    const gScore = new Float64Array(N).fill(Infinity);
    const fScore = new Float64Array(N).fill(Infinity);
    const cameFrom = new Int16Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const open = [startNode.id];

    gScore[startNode.id] = 0;
    fScore[startNode.id] = Math.hypot(endNode.x - startNode.x, endNode.z - startNode.z);

    while (open.length > 0) {
      let bestIdx = 0;
      for (let i = 1; i < open.length; i++) if (fScore[open[i]] < fScore[open[bestIdx]]) bestIdx = i;
      const curId = open[bestIdx];
      open.splice(bestIdx, 1);
      if (curId === endNode.id) break;
      if (closed[curId]) continue;
      closed[curId] = 1;

      const cur = roadNodes[curId];
      for (let i = 0; i < cur.neighbors.length; i++) {
        const nb = cur.neighbors[i];
        if (closed[nb.id]) continue;
        const weight = nb.isBoulevard && cur.isBoulevard ? 0.92 : 1.0;
        const tentativeG = gScore[curId] + Math.hypot(nb.x - cur.x, nb.z - cur.z) * weight;
        if (tentativeG < gScore[nb.id]) {
          cameFrom[nb.id] = curId;
          gScore[nb.id] = tentativeG;
          fScore[nb.id] = tentativeG + Math.hypot(endNode.x - nb.x, endNode.z - nb.z);
          if (!open.includes(nb.id)) open.push(nb.id);
        }
      }
    }

    const nodeChain = [];
    let walk = endNode.id, guard = 0;
    while (walk !== -1 && guard++ < N + 2) {
      nodeChain.push(roadNodes[walk]);
      if (walk === startNode.id) break;
      walk = cameFrom[walk];
    }
    nodeChain.reverse();

    const waypoints = [{ x: x1, z: z1 }];
    for (let i = 0; i < nodeChain.length; i++) waypoints.push({ x: nodeChain[i].x, z: nodeChain[i].z });
    waypoints.push({ x: x2, z: z2 });
    return waypoints;
  }

  function getTrafficLightAt(x, z, maxDist = 22) {
    let best = null, bestD2 = maxDist * maxDist;
    for (let i = 0; i < trafficLights.length; i++) {
      const tl = trafficLights[i];
      const d2 = (tl.x - x) ** 2 + (tl.z - z) ** 2;
      if (d2 < bestD2) { bestD2 = d2; best = tl; }
    }
    return best;
  }

  function getTrafficLightState(x, z, dirX = 0, dirZ = 1) {
    const tl = getTrafficLightAt(x, z, 24);
    if (!tl) return 'GREEN';
    return Math.abs(dirZ) >= Math.abs(dirX) ? tl.nsState : tl.ewState;
  }

  function isTrafficLightRed(x, z, dirX = 0, dirZ = 1) {
    const tl = getTrafficLightAt(x, z, 24);
    return tl ? !tl.canPass(dirX, dirZ) : false;
  }

  // ==========================================================================
  // 2x2 Spatial Quadrant Static Geometry Batching (~1,500 Meshes -> ~45 Batches)
  // ==========================================================================
  {
    const skipSubtrees = new Set();
    const markSkip = (obj) => {
      if (!obj) return;
      skipSubtrees.add(obj);
      obj.traverse((c) => skipSubtrees.add(c));
    };
    markSkip(ferrisRotorGroup);
    markSkip(showroomDoorMesh);
    markSkip(safehouseInteriorGroup);
    markSkip(barClubInteriorGroup);
    markSkip(shopInteriorGroup);
    markSkip(stadiumInteriorGroup);
    for (const c of coasterCars) markSkip(c);
    for (const b of beaconMeshes) markSkip(b);
    for (const gm of glowingMarkers) markSkip(gm.mesh);

    worldRoot.updateMatrixWorld(true);

    const buckets = new Map();
    const _wp = new THREE.Vector3();
    const _wn = new THREE.Vector3();
    const _nMat = new THREE.Matrix3();

    worldRoot.traverse((obj) => {
      if (!obj || !obj.isMesh || obj.isInstancedMesh) return;
      if (skipSubtrees.has(obj) || !obj.visible) return;
      const mat = obj.material;
      const geo = obj.geometry;
      if (!mat || Array.isArray(mat) || mat === oceanMat) return;
      if (!geo || !geo.attributes?.position || geo.attributes.color) return;

      _wp.setFromMatrixPosition(obj.matrixWorld);
      const qKey = (_wp.x < 40 ? 'W' : 'E') + (_wp.z < 0 ? 'N' : 'S');
      const cFlag = obj.castShadow ? 1 : 0;
      const rFlag = obj.receiveShadow ? 1 : 0;
      const bKey = `${qKey}|${mat.uuid}|${cFlag}|${rFlag}`;

      let bucket = buckets.get(bKey);
      if (!bucket) {
        bucket = { mat, castShadow: !!obj.castShadow, receiveShadow: !!obj.receiveShadow, meshes: [] };
        buckets.set(bKey, bucket);
      }
      bucket.meshes.push(obj);
    });

    let mergedInputCount = 0;
    let mergedOutputCount = 0;

    for (const bucket of buckets.values()) {
      const meshes = bucket.meshes;
      if (meshes.length < 2) continue;

      let totalVerts = 0;
      let totalIndices = 0;
      for (let i = 0; i < meshes.length; i++) {
        const g = meshes[i].geometry;
        if (!g.attributes.normal) g.computeVertexNormals();
        const vCount = g.attributes.position.count;
        totalVerts += vCount;
        totalIndices += g.index ? g.index.count : vCount;
      }
      if (totalVerts === 0 || totalIndices === 0) continue;

      const posArr = new Float32Array(totalVerts * 3);
      const normArr = new Float32Array(totalVerts * 3);
      const uvArr = new Float32Array(totalVerts * 2);
      const idxArr = totalVerts > 65535 ? new Uint32Array(totalIndices) : new Uint16Array(totalIndices);

      let vOffset = 0;
      let iOffset = 0;

      for (let i = 0; i < meshes.length; i++) {
        const m = meshes[i];
        const g = m.geometry;
        const posAttr = g.attributes.position;
        const normAttr = g.attributes.normal;
        const uvAttr = g.attributes.uv;
        const vCount = posAttr.count;
        const mw = m.matrixWorld;
        _nMat.getNormalMatrix(mw);
        const flip = mw.determinant() < 0;

        for (let v = 0; v < vCount; v++) {
          _wp.fromBufferAttribute(posAttr, v).applyMatrix4(mw);
          const pBase = (vOffset + v) * 3;
          posArr[pBase] = _wp.x;
          posArr[pBase + 1] = _wp.y;
          posArr[pBase + 2] = _wp.z;

          if (normAttr) {
            _wn.fromBufferAttribute(normAttr, v).applyMatrix3(_nMat).normalize();
            normArr[pBase] = _wn.x;
            normArr[pBase + 1] = _wn.y;
            normArr[pBase + 2] = _wn.z;
          } else {
            normArr[pBase + 1] = 1;
          }

          const uBase = (vOffset + v) * 2;
          if (uvAttr) {
            uvArr[uBase] = uvAttr.getX(v);
            uvArr[uBase + 1] = uvAttr.getY(v);
          }
        }

        if (g.index) {
          const srcIdx = g.index;
          const ic = srcIdx.count;
          for (let k = 0; k < ic; k += 3) {
            const a = srcIdx.getX(k) + vOffset;
            const b = srcIdx.getX(k + 1) + vOffset;
            const c = srcIdx.getX(k + 2) + vOffset;
            idxArr[iOffset++] = a;
            idxArr[iOffset++] = flip ? c : b;
            idxArr[iOffset++] = flip ? b : c;
          }
        } else {
          for (let k = 0; k < vCount; k += 3) {
            const a = vOffset + k;
            const b = vOffset + k + 1;
            const c = vOffset + k + 2;
            idxArr[iOffset++] = a;
            idxArr[iOffset++] = flip ? c : b;
            idxArr[iOffset++] = flip ? b : c;
          }
        }

        vOffset += vCount;
        if (m.parent) m.parent.remove(m);
      }

      const mergedGeo = new THREE.BufferGeometry();
      mergedGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      mergedGeo.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
      mergedGeo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
      mergedGeo.setIndex(new THREE.BufferAttribute(idxArr, 1));
      mergedGeo.computeBoundingBox();
      mergedGeo.computeBoundingSphere();

      const mergedMesh = new THREE.Mesh(mergedGeo, bucket.mat);
      mergedMesh.castShadow = bucket.castShadow;
      mergedMesh.receiveShadow = bucket.receiveShadow;
      mergedMesh.matrixAutoUpdate = false;
      mergedMesh.updateMatrix();
      worldRoot.add(mergedMesh);

      mergedInputCount += meshes.length;
      mergedOutputCount++;
    }

    // Freeze remaining unmerged static transforms
    worldRoot.traverse((obj) => {
      if (obj === worldRoot || skipSubtrees.has(obj)) return;
      obj.matrixAutoUpdate = false;
      obj.updateMatrix();
    });

    if (typeof console !== 'undefined' && console.info) {
      console.info(`[GiangHo Batcher] Merged ${mergedInputCount} static world meshes -> ${mergedOutputCount} quadrant batches.`);
    }
  }

  let internalElapsed = 0;
  let ferrisAngle = 0;
  let coasterProgress = 0;
  let lastWeatherSynced = '';

  function updateWorld(dt = 0.016, elapsed) {
    const safeDt = clamp(Number.isFinite(dt) ? dt : 0.016, 0, 0.1);
    internalElapsed = Number.isFinite(elapsed) ? elapsed : internalElapsed + safeDt;

    if (safehouseInteriorGroup) {
      const inSafe = Boolean(ctx?.player && (ctx.player.inSafehouse || (ctx.player.x > 750 && ctx.player.x < 850)));
      if (safehouseInteriorGroup.visible !== inSafe) {
        safehouseInteriorGroup.visible = inSafe;
        if (safehouseInteriorLight) safehouseInteriorLight.visible = inSafe;
      }
    }
    if (barClubInteriorGroup) {
      const inClub = Boolean(ctx?.player && (ctx.player.inInterior === 'barclub' || (ctx.player.x > 1050 && ctx.player.x < 1150)));
      if (barClubInteriorGroup.visible !== inClub) {
        barClubInteriorGroup.visible = inClub;
        if (barClubInteriorLight) barClubInteriorLight.visible = inClub;
      }
    }
    if (shopInteriorGroup) {
      const inShop = Boolean(ctx?.player && (ctx.player.inInterior === 'shop' || (ctx.player.x > 1350 && ctx.player.x < 1450)));
      if (shopInteriorGroup.visible !== inShop) {
        shopInteriorGroup.visible = inShop;
        if (shopInteriorLight) shopInteriorLight.visible = inShop;
      }
    }
    if (stadiumInteriorGroup) {
      const inStad = Boolean(ctx?.player && (ctx.player.inInterior === 'stadium' || (ctx.player.x > 1730 && ctx.player.x < 1870)));
      if (stadiumInteriorGroup.visible !== inStad) {
        stadiumInteriorGroup.visible = inStad;
        if (stadiumInteriorLight) stadiumInteriorLight.visible = inStad;
      }
    }

    oceanUniforms.uTime.value = internalElapsed;
    const weather = ctx?.engine?.timeWeather || 'BRIGHT_DAY';
    if (scene?.fog) {
      oceanUniforms.uFogColor.value.copy(scene.fog.color);
      if (Number.isFinite(scene.fog.density)) oceanUniforms.uFogDensity.value = scene.fog.density;
    }

    if (weather !== lastWeatherSynced) {
      lastWeatherSynced = weather;
      if (weather === 'SUNSET_GOLD') {
        oceanUniforms.uSunDir.value.set(-0.88, 0.24, -0.22).normalize();
        oceanUniforms.uSunColor.value.setHex(0xff9438);
        oceanUniforms.uSkyColor.value.setHex(0xde8264);
        oceanUniforms.uDeepColor.value.setHex(0x0b2942);
        oceanUniforms.uShallowColor.value.setHex(0x1f7d82);
        lampBulbMat.emissiveIntensity = 1.95;
        mats.lanternSilk.emissiveIntensity = 1.85;
        for (const wm of windowMaterials) wm.emissiveIntensity = 0.55;
      } else if (weather === 'OVERCAST_RAIN') {
        oceanUniforms.uSunDir.value.set(-0.35, 0.65, -0.3).normalize();
        oceanUniforms.uSunColor.value.setHex(0x9fb0c2);
        oceanUniforms.uSkyColor.value.setHex(0x5d6e7e);
        oceanUniforms.uDeepColor.value.setHex(0x0a2436);
        oceanUniforms.uShallowColor.value.setHex(0x1d5866);
        mats.roadStd.roughness = 0.12;
        mats.roadBlvd.roughness = 0.10;
        mats.sidewalk.roughness = 0.24;
        lampBulbMat.emissiveIntensity = 2.15;
        mats.lanternSilk.emissiveIntensity = 2.05;
        for (const wm of windowMaterials) wm.emissiveIntensity = 0.72;
      } else if (weather === 'NEON_NIGHT') {
        oceanUniforms.uSunDir.value.set(-0.55, 0.45, 0.25).normalize();
        oceanUniforms.uSunColor.value.setHex(0x94b8ff);
        oceanUniforms.uSkyColor.value.setHex(0x0b1830);
        oceanUniforms.uDeepColor.value.setHex(0x030e1c);
        oceanUniforms.uShallowColor.value.setHex(0x0a3c4f);
        lampBulbMat.emissiveIntensity = 2.95;
        mats.lanternSilk.emissiveIntensity = 2.65;
        for (const wm of windowMaterials) wm.emissiveIntensity = 1.35;
      } else {
        oceanUniforms.uSunDir.value.set(-0.62, 0.58, -0.35).normalize();
        oceanUniforms.uSunColor.value.setHex(0xfff2d6);
        oceanUniforms.uSkyColor.value.setHex(0x7ab8eb);
        oceanUniforms.uDeepColor.value.setHex(0x06354d);
        oceanUniforms.uShallowColor.value.setHex(0x1ca89c);
        mats.roadStd.roughness = 0.72;
        mats.roadBlvd.roughness = 0.66;
        mats.sidewalk.roughness = 0.84;
        lampBulbMat.emissiveIntensity = 0.75;
        mats.lanternSilk.emissiveIntensity = 0.95;
        for (const wm of windowMaterials) wm.emissiveIntensity = 0.12;
      }
    }

    if (ferrisRotorGroup) {
      ferrisAngle = (ferrisAngle + safeDt * 0.24) % (Math.PI * 2);
      ferrisRotorGroup.rotation.z = ferrisAngle;
      for (let i = 0; i < ferrisCabins.length; i++) ferrisCabins[i].rotation.z = -ferrisAngle;
    }

    if (coasterCurve && coasterCars.length > 0) {
      const leadPt = coasterCurve.getPointAt(coasterProgress);
      const speedMod = clamp(1.35 - (leadPt.y - PIER_DECK_Y) * 0.045, 0.55, 1.45);
      coasterProgress = (coasterProgress + safeDt * 0.068 * speedMod) % 1;
      for (let ci = 0; ci < coasterCars.length; ci++) {
        const u = (coasterProgress - ci * 0.022 + 1) % 1;
        const p = coasterCurve.getPointAt(u);
        const tan = coasterCurve.getTangentAt(u);
        const car = coasterCars[ci];
        car.position.copy(p);
        car.rotation.set(0, Math.atan2(-tan.z, tan.x), Math.asin(clamp(tan.y, -0.85, 0.85)));
      }
    }

    for (let i = 0; i < trafficLights.length; i++) {
      const tl = trafficLights[i];
      const t = (internalElapsed + tl.phaseOffset) % 24.0;
      let ns = 'RED', ew = 'RED';
      if (t < 9.5) { ns = 'GREEN'; ew = 'RED'; }
      else if (t < 12.0) { ns = 'YELLOW'; ew = 'RED'; }
      else if (t < 21.5) { ns = 'RED'; ew = 'GREEN'; }
      else { ns = 'RED'; ew = 'YELLOW'; }

      if (tl.nsState !== ns || tl.ewState !== ew) {
        tl.nsState = ns; tl.ewState = ew; tl.state = ns;
        tl.nsRed = ns === 'RED'; tl.ewRed = ew === 'RED'; tl.isRed = ns === 'RED';
        for (let k = 0; k < tl.nsBulbs.r.length; k++) {
          tl.nsBulbs.r[k].emissive.copy(ns === 'RED' ? signalRedOn : signalRedOff);
          tl.nsBulbs.y[k].emissive.copy(ns === 'YELLOW' ? signalYelOn : signalYelOff);
          tl.nsBulbs.g[k].emissive.copy(ns === 'GREEN' ? signalGrnOn : signalGrnOff);
        }
        for (let k = 0; k < tl.ewBulbs.r.length; k++) {
          tl.ewBulbs.r[k].emissive.copy(ew === 'RED' ? signalRedOn : signalRedOff);
          tl.ewBulbs.y[k].emissive.copy(ew === 'YELLOW' ? signalYelOn : signalYelOff);
          tl.ewBulbs.g[k].emissive.copy(ew === 'GREEN' ? signalGrnOn : signalGrnOff);
        }
      }
    }

    if (showroomDoorMesh) {
      const p = ctx?.player;
      let near = false;
      if (p && Number.isFinite(p.x) && Number.isFinite(p.z)) {
        const distToMouth = Math.hypot(p.x - (-52), p.z - 80);
        const insideBay = p.x >= -67 && p.x <= -46 && p.z >= 73 && p.z <= 87;
        near = distToMouth <= 12.5 || insideBay;
      }
      const targetOpen = near ? 1.0 : 0.0;
      showroomDoorOpenFrac += (targetOpen - showroomDoorOpenFrac) * Math.min(1, safeDt * 4.5);
      showroomDoorMesh.scale.y = Math.max(0.08, 1.0 - showroomDoorOpenFrac * 0.90);
      showroomDoorMesh.position.y = lerp(2.6, 5.15, showroomDoorOpenFrac);
    }

    const blinkOn = Math.sin(internalElapsed * 4.2) > 0.1;
    for (let i = 0; i < beaconMeshes.length; i++) {
      beaconMeshes[i].visible = blinkOn || (i % 2 === 1 && !blinkOn);
    }
    for (let i = 0; i < glowingMarkers.length; i++) {
      const gm = glowingMarkers[i];
      if (gm.axis === 'y') gm.mesh.rotation.y += safeDt * gm.spin;
      else gm.mesh.rotation.z += safeDt * gm.spin;
      gm.mesh.position.y = gm.baseY + Math.sin(internalElapsed * 2.8 + i) * gm.bob;
    }
  }

  const worldAPI = {
    root: worldRoot,
    aabbs,
    roadGraph,
    trafficLights,
    bounds: { minX: -320, maxX: 280, minZ: -280, maxZ: 260 },
    landmarks: {
      playerSpawn: { x: 26, y: 0.22, z: 28 },
      showroom: { x: -58, y: 0.04, z: 80, entranceX: -52, entranceZ: 80, minX: -66, maxX: -50, minZ: 75, maxZ: 85 },
      hospital: { x: 80, y: 0.22, z: 130 },
      policePrecinct: { x: 130, y: 0.22, z: 80 },
      safehouseEntrance: { x: 24, y: 0.22, z: -80 },
      safehouseInterior: { x: 800, y: 0.02, z: 800, exitX: 800, exitY: 0.05, exitZ: 805, wardrobeX: 796.5, wardrobeZ: 797.5 },
      barClubEntrance: { x: 54.4, y: 0.22, z: 14.0 },
      barClubInterior: { x: 1100, y: 0.02, z: 1109.2, exitX: 1100, exitZ: 1112.2, taiXiuX: 1100, taiXiuZ: 1100.8, vaultX: 1108.2, vaultZ: 1095.0 },
      shopEntrance: { x: 25.6, y: 0.22, z: -14.0 },
      shopInterior: { x: 1400, y: 0.02, z: 1406.5, exitX: 1400, exitZ: 1409.5, counterX: 1400, counterZ: 1400.8 },
      stadiumEntrance: { x: 54.4, y: 0.22, z: 80.0 },
      stadiumInterior: { x: 1800, y: 0.02, z: 1823.0, exitX: 1800, exitZ: 1829.2 },
      fibTower: { x: 160, z: -40, roofY: 78, execFloorY: 48, rappelRig: { x: 160, y: 78, z: -18, wallZ: -15.2 } },
      pier: { x: -215, y: 3.8, z: -8, ferrisWheel: { x: -245, y: 25, z: -12 } },
      vinewoodSign: { x: 60, y: 62, z: -295 },
    },
    queryAABBs,
    getGroundHeight,
    getZoneInfo,
    resolveCircleAABB,
    resolveCarAABB,
    checkLOS,
    raycastWorld,
    findGPSPath,
    getTrafficLightAt,
    getTrafficLightState,
    isTrafficLightRed,
    updateWorld,
  };

  if (ctx) ctx.world = worldAPI;
  return worldAPI;
}
