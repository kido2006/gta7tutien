import * as THREE from 'three';

// ============================================================================
// Tu Tiên Đại Lộ 3D — PHÂN KHU 1: TRUNG TÂM TÀI CHÍNH & LÕI CAO ỐC (DOWNTOWN & PILLBOX HILL)
// + Seamless FIB Security Atrium & 48m Shatterable Glass / Blue LED Server Room
// + Seamless Walk-In Tiên Bảo Tổng Khố Fortress & Circular Steel Vault Door
// + 120m Maze Bank Supertall (Marble Lobby, Express Helipad Elevator & Parachute)
// + 35m High-Rise Steel Construction Site & 68m Slewing Yellow Tower Crane
// + 4-Story Drivable Multi-Story Parking Garage (0.22 -> 4.2 -> 8.2 -> 12.2m)
// + Custom GLSL 3D Parallax Interior Mapping & Instanced Rooftop Greebles (<20 Draw Calls)
// Exclusively owns: src/map_downtown.js -> export function createMapDowntown(ctx)
// ============================================================================

const ROAD_Y = 0.02;
const SIDEWALK_Y = 0.22;
const EAST_BLVD_X = 320.0;
const EAST_BLVD_HALF_W = 10.0; // 20m wide 4-lane boulevard: X in [310, 330]
const STD_HALF_W = 8.0;        // 16m wide 2-lane avenues
const DOWNTOWN_STREETS = [-200, -120, -40, 40, 120, 200];

// Landmark 1: Maze Bank Supertall (120m Crown Jewel at (278, -40))
const MAZE_CENTER_X = 278.0;
const MAZE_CENTER_Z = -40.0;
const MAZE_ROOF_Y = 120.22;
const MAZE_ELEVATOR_GROUND = { x: 254.0, y: 0.25, z: -40.0 };
const MAZE_ELEVATOR_ROOF = { x: 285.2, y: 120.25, z: -40.0 };
const MAZE_HELIPAD_SPAWN = { x: 278.0, y: 120.3, z: -40.0 };
const MAZE_FOUNTAIN_POS = { x: 244.0, y: 0.06, z: -40.0 };

// Landmark 2: FIB Tower Seamless Ground Atrium & 48m Executive Upgrade ((160, -40), 78m)
const FIB_ATRIUM_DOOR = { x: 160.0, y: 0.24, z: -14.5 };
const FIB_ELEVATOR_GROUND = { x: 169.2, y: 0.26, z: -15.4 };
const FIB_ELEVATOR_EXEC = { x: 159.5, y: 48.06, z: -24.2 };
const FIB_GLASS_PANEL_XS = [139, 145, 151, 157, 163, 169, 175, 181];
const FIB_GLASS_Z = -15.78;
const FIB_EXEC_Y = 48.0;

// Landmark 3: Tiên Bảo Tổng Khố Seamless Walk-In Fortress ((278, -140), X in [246, 310], Z in [-172, -108])
const UD_MIN_X = 246.0;
const UD_MAX_X = 310.0;
const UD_MIN_Z = -172.0;
const UD_MAX_Z = -108.0;
const UD_LOBBY_Y = 0.24;
const UD_VAULT_POS = { x: 298.0, y: 0.24, z: -140.0 };

// Landmark 4: High-Rise Construction Site (35m at (278, +55), X in [248, 308], Z in [25, 85])
const CONST_SKEL_MIN_X = 263.5;
const CONST_SKEL_MAX_X = 306.5;
const CONST_SKEL_MIN_Z = 48.5;
const CONST_SKEL_MAX_Z = 84.5;
const CONST_FLOORS = [0.25, 7.20, 14.20, 21.20, 28.20, 35.00];
const CRANE_BASE = { x: 292.5, y: 0.25, z: 66.5, jibY: 66.5, topY: 68.0 };

// Landmark 5: 4-Story Multi-Story Parking Garage ((278, +148), X in [248, 308], Z in [118, 178])
// Main 4-story helical deck structure sits at X in [272.0, 308.0], Z in [128.0, 178.0]:
//   - West & Central Parking Decks: X in [272.0, 291.4], Z in [128.0, 178.0] (includes (278, +148) on all 4 flat decks!)
//   - Inner Ramp 2 Bay (4.2 -> 8.2m): X in [291.4, 299.4] (width 8.0m >= 7.5m)
//   - Outer East Ramp 1 & 3 Bay (0.22 -> 4.2m & 8.2 -> 12.2m): X in [299.6, 307.6] (width 8.0m >= 7.5m)
const PG_MIN_X = 272.0;
const PG_MAX_X = 308.0;
const PG_MIN_Z = 128.0;
const PG_MAX_Z = 178.0;
const PG_FLAT_DECK_MAX_X = 291.4;
const PG_MID_RAMP_MAX_X = 299.5;
const PG_RAMP_Z_NORTH = 140.0;     // North turnaround Z in [128.5, 140.0]
const PG_RAMP_Z_SOUTH = 166.0;     // South turnaround Z in [166.0, 177.5]
const PG_DECKS = [0.22, 4.20, 8.20, 12.20];

const TAU = Math.PI * 2;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(e0, e1, x) {
  const denom = e1 - e0;
  if (Math.abs(denom) < 1e-8) return x >= e1 ? 1 : 0;
  const t = clamp((x - e0) / denom, 0, 1);
  return t * t * (3 - 2 * t);
}

function smootherstep(e0, e1, x) {
  const denom = e1 - e0;
  if (Math.abs(denom) < 1e-8) return x >= e1 ? 1 : 0;
  const t = clamp((x - e0) / denom, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function createRNG(seed = 20261118) {
  let s = seed >>> 0;
  return function nextRand() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// High-Speed Geometry Batching & Procedural Architectural Primitives
// ============================================================================

const _pos = new THREE.Vector3();
const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();
const _scl = new THREE.Vector3();

function makeMatrix4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _pos.set(x, y, z);
  _euler.set(rx, ry, rz, 'YXZ');
  _quat.setFromEuler(_euler);
  _scl.set(sx, sy, sz);
  const m = new THREE.Matrix4();
  m.compose(_pos, _quat, _scl);
  return m;
}

function mergeBufferGeometries(items) {
  if (!items || items.length === 0) return null;
  let totalVerts = 0;
  let totalIndices = 0;
  let useColors = false;

  for (let i = 0; i < items.length; i++) {
    const g = items[i].geo;
    if (!g || !g.attributes?.position) continue;
    const vc = g.attributes.position.count;
    totalVerts += vc;
    totalIndices += g.index ? g.index.count : vc;
    if (g.attributes.color || items[i].color) useColors = true;
  }
  if (totalVerts === 0) return null;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const colors = useColors ? new Float32Array(totalVerts * 3) : null;
  const indices = totalVerts > 65535 ? new Uint32Array(totalIndices) : new Uint16Array(totalIndices);

  let vOff = 0;
  let iOff = 0;

  for (let idx = 0; idx < items.length; idx++) {
    const { geo, matrix, color } = items[idx];
    if (!geo || !geo.attributes?.position) continue;

    const posAttr = geo.attributes.position;
    const normAttr = geo.attributes.normal;
    const uvAttr = geo.attributes.uv;
    const colAttr = geo.attributes.color;
    const vc = posAttr.count;

    const e = matrix ? matrix.elements : null;
    const m00 = e ? e[0] : 1, m01 = e ? e[4] : 0, m02 = e ? e[8] : 0, m03 = e ? e[12] : 0;
    const m10 = e ? e[1] : 0, m11 = e ? e[5] : 1, m12 = e ? e[9] : 0, m13 = e ? e[13] : 0;
    const m20 = e ? e[2] : 0, m21 = e ? e[6] : 0, m22 = e ? e[10] : 1, m23 = e ? e[14] : 0;

    const sx2 = m00 * m00 + m10 * m10 + m20 * m20 || 1;
    const sy2 = m01 * m01 + m11 * m11 + m21 * m21 || 1;
    const sz2 = m02 * m02 + m12 * m12 + m22 * m22 || 1;
    const n00 = m00 / sx2, n01 = m01 / sy2, n02 = m02 / sz2;
    const n10 = m10 / sx2, n11 = m11 / sy2, n12 = m12 / sz2;
    const n20 = m20 / sx2, n21 = m21 / sy2, n22 = m22 / sz2;

    for (let v = 0; v < vc; v++) {
      const px = posAttr.getX(v);
      const py = posAttr.getY(v);
      const pz = posAttr.getZ(v);
      const b3 = (vOff + v) * 3;

      positions[b3] = m00 * px + m01 * py + m02 * pz + m03;
      positions[b3 + 1] = m10 * px + m11 * py + m12 * pz + m13;
      positions[b3 + 2] = m20 * px + m21 * py + m22 * pz + m23;

      if (normAttr) {
        const nx = normAttr.getX(v);
        const ny = normAttr.getY(v);
        const nz = normAttr.getZ(v);
        const tx = n00 * nx + n01 * ny + n02 * nz;
        const ty = n10 * nx + n11 * ny + n12 * nz;
        const tz = n20 * nx + n21 * ny + n22 * nz;
        const il = 1.0 / (Math.hypot(tx, ty, tz) || 1.0);
        normals[b3] = tx * il;
        normals[b3 + 1] = ty * il;
        normals[b3 + 2] = tz * il;
      } else {
        normals[b3 + 1] = 1;
      }

      if (uvAttr) {
        const b2 = (vOff + v) * 2;
        uvs[b2] = uvAttr.getX(v);
        uvs[b2 + 1] = uvAttr.getY(v);
      }

      if (colors) {
        if (colAttr) {
          colors[b3] = colAttr.getX(v);
          colors[b3 + 1] = colAttr.getY(v);
          colors[b3 + 2] = colAttr.getZ(v);
        } else if (color) {
          colors[b3] = color.r;
          colors[b3 + 1] = color.g;
          colors[b3 + 2] = color.b;
        } else {
          colors[b3] = 1;
          colors[b3 + 1] = 1;
          colors[b3 + 2] = 1;
        }
      }
    }

    if (geo.index) {
      const arr = geo.index.array;
      const ic = geo.index.count;
      for (let k = 0; k < ic; k++) indices[iOff + k] = arr[k] + vOff;
      iOff += ic;
    } else {
      for (let k = 0; k < vc; k++) indices[iOff + k] = vOff + k;
      iOff += vc;
    }
    vOff += vc;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  if (colors) merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}

// World-scaled UV BoxGeometry so 3D Parallax Interior Mapping aligns rooms cleanly
function makeArchitecturalBoxGeo(w, h, d, bayWidth = 4.0, floorHeight = 3.6) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    if (ny > 0.5) {
      uv.setXY(i, (px + w * 0.5) / bayWidth, (pz + d * 0.5) / bayWidth);
    } else if (nx > 0.5) {
      uv.setXY(i, (pz + d * 0.5) / bayWidth, (py + h * 0.5) / floorHeight);
    } else {
      uv.setXY(i, (px + w * 0.5) / bayWidth, (py + h * 0.5) / floorHeight);
    }
  }
  return geo;
}

// Chamfered Octagonal Curtain-Wall Prism for Maze Bank Supertall
function makeChamferedOctagonGeo(radiusTop, radiusBot, height, bayWidth = 4.0, floorHeight = 3.6) {
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBot, height, 8, 1, false);
  // Rotate PI/8 so N, S, E, W faces are flat orthogonal walls and corners are 45-deg chamfers!
  geo.rotateY(Math.PI / 8);
  const nonIndexed = geo.toNonIndexed();
  geo.dispose();
  nonIndexed.computeVertexNormals();

  const pos = nonIndexed.attributes.position;
  const norm = nonIndexed.attributes.normal;
  const uv = nonIndexed.attributes.uv;
  const avgR = (radiusTop + radiusBot) * 0.5;
  const faceW = Math.max(4.0, 2 * avgR * Math.sin(Math.PI / 8));
  const baysPerFace = Math.max(2, Math.round(faceW / bayWidth));
  const stories = Math.max(1, Math.round(height / floorHeight));

  for (let i = 0; i < pos.count; i += 3) {
    const ny = Math.abs(norm.getY(i));
    if (ny > 0.6) {
      for (let k = 0; k < 3; k++) {
        uv.setXY(i + k, (pos.getX(i + k) + avgR) / bayWidth, (pos.getZ(i + k) + avgR) / bayWidth);
      }
    } else {
      // Project along horizontal tangent of this octagonal facet
      const nx = norm.getX(i);
      const nz = norm.getZ(i);
      const tx = -nz;
      const tz = nx;
      for (let k = 0; k < 3; k++) {
        const px = pos.getX(i + k);
        const py = pos.getY(i + k);
        const pz = pos.getZ(i + k);
        const uProj = ((px * tx + pz * tz) / faceW + 0.5) * baysPerFace;
        const vProj = ((py + height * 0.5) / height) * stories;
        uv.setXY(i + k, uProj, vProj);
      }
    }
  }
  return nonIndexed;
}

// Exact Sloped Concrete / Timber Ramp Slab matching getElevation 1:1
function makeSlopedRampSlabGeo(x1, z1, x2, z2, width, y1, y2, thickness = 0.36) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const horizLen = Math.hypot(dx, dz) || 1;
  const dy = y2 - y1;
  const slopeLen = Math.hypot(horizLen, dy);
  const yaw = Math.atan2(dx, dz);
  const pitch = -Math.asin(clamp(dy / slopeLen, -0.95, 0.95));

  const geo = new THREE.BoxGeometry(width, thickness, slopeLen);
  const cx = (x1 + x2) * 0.5;
  const cz = (z1 + z2) * 0.5;
  // Offset downward along slab normal so the TOP surface lies exactly on (x1,y1,z1)->(x2,y2,z2)
  const cosP = Math.cos(pitch);
  const cy = (y1 + y2) * 0.5 - (thickness * 0.5) * cosP;
  geo.applyMatrix4(makeMatrix4(cx, cy, cz, pitch, yaw, 0, 1, 1, 1));
  return geo;
}

// Sign plane sampling horizontal band `rowIdx` of an 8-row signage CanvasTexture atlas
function makeAtlasPlaneGeo(w, h, rowIdx, totalRows = 8) {
  const geo = new THREE.PlaneGeometry(w, h);
  const uv = geo.attributes.uv;
  const vTop = 1.0 - (rowIdx / totalRows) - 0.004;
  const vBot = 1.0 - ((rowIdx + 1) / totalRows) + 0.004;
  for (let i = 0; i < uv.count; i++) {
    const origV = uv.getY(i);
    uv.setY(i, origV > 0.5 ? vTop : vBot);
  }
  return geo;
}

// Box mapped on front & back to a specific row of the signage/server-rack atlas
function makeServerRackBoxGeo(w, h, d, rowIdx = 3, totalRows = 8) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const norm = geo.attributes.normal;
  const uv = geo.attributes.uv;
  const vTop = 1.0 - (rowIdx / totalRows) - 0.004;
  const vBot = 1.0 - ((rowIdx + 1) / totalRows) + 0.004;
  for (let i = 0; i < uv.count; i++) {
    const nz = Math.abs(norm.getZ(i));
    const origU = uv.getX(i);
    const origV = uv.getY(i);
    if (nz > 0.5) {
      uv.setXY(i, clamp(origU * 0.24 + 0.02, 0.01, 0.99), origV > 0.5 ? vTop : vBot);
    } else {
      // Dark metallic side/top region on right end of row 3
      uv.setXY(i, 0.92, (vTop + vBot) * 0.5);
    }
  }
  return geo;
}

// ============================================================================
// Procedural CanvasTexture & DataTexture Generators (100% Self-Contained)
// ============================================================================

function makeCanvasTexture(w, h, drawFn, isSRGB = true, repeatX = 1, repeatY = 1) {
  if (typeof document === 'undefined') {
    const data = new Uint8Array([180, 185, 195, 255]);
    const dt = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    dt.needsUpdate = true;
    return dt;
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  drawFn(g, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (isSRGB) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function buildInteriorRoomAtlasDataTexture() {
  const W = 256;
  const H = 256;
  const data = new Uint8Array(W * H * 4);
  const rng = createRNG(9021077);

  // 4x2 grid of 64x128 furnished corporate office / trading / server / executive room back walls
  for (let cellY = 0; cellY < 2; cellY++) {
    for (let cellX = 0; cellX < 4; cellX++) {
      const ox = cellX * 64;
      const oy = cellY * 128;
      const isWarm = (cellX + cellY) % 2 === 0;
      const baseR = isWarm ? 158 : 132;
      const baseG = isWarm ? 148 : 146;
      const baseB = isWarm ? 132 : 162;

      for (let py = 0; py < 128; py++) {
        for (let px = 0; px < 64; px++) {
          let r = baseR;
          let g = baseG;
          let b = baseB;

          // Subtle vertical wall gradient + wainscot dado rail
          const grad = 0.72 + 0.28 * (1.0 - py / 128);
          r = Math.round(r * grad);
          g = Math.round(g * grad);
          b = Math.round(b * grad);

          if (py > 86) {
            r = Math.round(r * 0.62);
            g = Math.round(g * 0.60);
            b = Math.round(b * 0.58);
          }

          // Venetian blinds near top (py < 20)
          if (py < 18 && py % 4 < 2) {
            r = Math.min(255, r + 38);
            g = Math.min(255, g + 38);
            b = Math.min(255, b + 36);
          }

          // Archetype details per cellX:
          // cellX=0: Bookshelves & framed art; cellX=1: Multi-monitor Vạn Thương Linh Các trading wall;
          // cellX=2: Executive glass boardroom; cellX=3: Data center / server racks
          if (cellX === 0) {
            if (px >= 8 && px <= 55 && py >= 28 && py <= 84) {
              r = 72; g = 48; b = 34;
              if (py % 14 >= 3 && px % 5 !== 0) {
                const cPick = (px * 7 + py * 3) % 4;
                if (cPick === 0) { r = 165; g = 52; b = 46; }
                else if (cPick === 1) { r = 44; g = 92; b = 148; }
                else if (cPick === 2) { r = 196; g = 168; b = 98; }
                else { r = 56; g = 118; b = 82; }
              }
            }
          } else if (cellX === 1) {
            // Glowing dual/quad widescreen trading monitors
            if ((px >= 10 && px <= 29 || px >= 34 && px <= 53) && py >= 44 && py <= 68) {
              r = 38; g = 192; b = 245;
              if ((px + py) % 7 === 0) { r = 64; g = 250; b = 155; }
            }
          } else if (cellX === 2) {
            // Illuminated presentation screen + credenza
            if (px >= 14 && px <= 50 && py >= 34 && py <= 66) {
              r = 225; g = 234; b = 248;
              if (py > 46 && (px % 8 < 4)) { r = 58; g = 128; b = 215; }
            }
          } else {
            // Dark server rack columns + cyan status LEDs
            if (px >= 8 && px <= 56 && py >= 22 && py <= 108 && px % 14 >= 2) {
              r = 24; g = 30; b = 40;
              if (py % 6 === 2 && rng() > 0.28) {
                r = 18; g = 218; b = 255;
              }
            }
          }

          const idx = ((oy + py) * W + (ox + px)) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        }
      }
    }
  }

  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function buildDowntownTextureSuite() {
  const roadAsphalt = makeCanvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#242830';
    g.fillRect(0, 0, w, h);
    const rng = createRNG(4411);
    for (let i = 0; i < 2200; i++) {
      const v = 28 + Math.floor(rng() * 26);
      g.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
      g.fillRect(rng() * w, rng() * h, 2.5, 3.0);
    }
    // Double yellow centerline
    g.fillStyle = '#dfb43c';
    g.fillRect(w * 0.484, 0, 4, h);
    g.fillRect(w * 0.516 - 4, 0, 4, h);
    // Crisp white lane dashes & shoulder lines
    g.fillStyle = 'rgba(235,240,246,0.84)';
    for (let y = 16; y < h; y += 64) {
      g.fillRect(w * 0.25 - 2, y, 4, 30);
      g.fillRect(w * 0.75 - 2, y, 4, 30);
    }
    g.fillStyle = 'rgba(220,226,234,0.72)';
    g.fillRect(w * 0.035, 0, 4, h);
    g.fillRect(w * 0.965 - 4, 0, 4, h);
  });

  const concreteGrain = makeCanvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#e4e6ea';
    g.fillRect(0, 0, w, h);
    const rng = createRNG(8821);
    for (let i = 0; i < 1600; i++) {
      const v = 205 + Math.floor(rng() * 44);
      g.fillStyle = `rgb(${v},${v},${v + 2})`;
      g.fillRect(rng() * w, rng() * h, 2, 2);
    }
    g.strokeStyle = 'rgba(155,160,168,0.35)';
    g.lineWidth = 1.5;
    for (let y = 0; y <= h; y += 32) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    }
    for (let x = 0; x <= w; x += 64) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
    }
  }, true, 4, 4);

  const marbleVeined = makeCanvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#f2f0ec';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(168, 158, 142, 0.36)';
    g.lineWidth = 2.2;
    for (let v = 0; v < 9; v++) {
      g.beginPath();
      let yy = (v * 31) % h;
      g.moveTo(0, yy);
      for (let xx = 16; xx <= w; xx += 24) {
        yy += Math.sin(xx * 0.05 + v) * 9;
        g.lineTo(xx, yy);
      }
      g.stroke();
    }
    g.strokeStyle = 'rgba(212, 182, 112, 0.24)';
    g.lineWidth = 1.0;
    g.strokeRect(2, 2, w - 4, h - 4);
  }, true, 3, 3);

  const curtainFacade = makeCanvasTexture(256, 256, (g, w, h) => {
    // 1x1 architectural glass curtain bay (tiled via world-scaled UVs!)
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#182c42');
    grad.addColorStop(0.55, '#244564');
    grad.addColorStop(1, '#122234');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    // Top/bottom spandrel slab band + aluminum mullions
    g.fillStyle = '#2d3744';
    g.fillRect(0, 0, w, 28);
    g.fillRect(0, h - 20, w, 20);
    g.fillStyle = '#7e8c9c';
    g.fillRect(0, 0, 10, h);
    g.fillRect(w - 10, 0, 10, h);
    g.fillRect(0, 26, w, 6);
    g.fillRect(0, h - 22, w, 6);
  });

  // Shared 8-Row Signage & 42U Server Rack Atlas (Diffuse + Emissive = 1 Draw Call for ALL Signs & Racks!)
  function paintSignAtlas(g, w, h, emissiveOnly) {
    g.fillStyle = '#000000';
    g.fillRect(0, 0, w, h);
    const rowH = h / 8;

    const drawBannerRow = (rowIdx, bg, border, title, sub, titleCol, subCol, badgeCol) => {
      const y0 = rowIdx * rowH;
      g.fillStyle = emissiveOnly ? '#080a10' : bg;
      g.fillRect(0, y0 + 2, w, rowH - 4);
      g.strokeStyle = border;
      g.lineWidth = 6;
      g.strokeRect(8, y0 + 8, w - 16, rowH - 16);

      if (badgeCol) {
        g.fillStyle = badgeCol;
        g.beginPath();
        g.arc(76, y0 + rowH * 0.5, 34, 0, TAU);
        g.fill();
      }
      g.fillStyle = titleCol;
      g.font = '900 48px "Segoe UI", Arial, sans-serif';
      g.textAlign = 'center';
      g.fillText(title, w * 0.52, y0 + 62);
      g.fillStyle = subCol;
      g.font = '700 23px "Segoe UI", Arial, sans-serif';
      g.fillText(sub, w * 0.52, y0 + 100);
    };

    // Row 0: MAZE BANK
    drawBannerRow(
      0,
      '#1a090d',
      '#ef233c',
      'MAZE BANK TOWER',
      'OF LOS SANTOS • 120M SUPERTALL HEADQUARTERS',
      '#ffffff',
      '#ff6b7a',
      '#ef233c'
    );
    // Row 1: UNION DEPOSITORY
    drawBannerRow(
      1,
      '#14181f',
      '#eab308',
      'UNION DEPOSITORY',
      'NGÂN HÀNG DỰ TRỮ LIÊN BANG • GOLD BULLION VAULT',
      '#fef08a',
      '#cbd5e1',
      '#ca8a04'
    );
    // Row 2: FIB SECURITY ATRIUM
    drawBannerRow(
      2,
      '#091526',
      '#38bdf8',
      'FIB • FEDERAL BUREAU',
      'SẢNH KIỂM SOÁT AN NINH & TRUNG TÂM DỮ LIỆU TẦNG 48',
      '#f0f9ff',
      '#38bdf8',
      '#0284c7'
    );

    // Row 3: 42U HIGH-DENSITY BLUE LED SERVER RACK (left 82% = front mesh & LEDs, right 18% = dark cabinet steel)
    {
      const y0 = 3 * rowH;
      g.fillStyle = emissiveOnly ? '#000000' : '#111622';
      g.fillRect(0, y0, w, rowH);
      const rackW = Math.floor(w * 0.84);
      const cols = 4;
      const colW = rackW / cols;
      const rng = createRNG(48480);
      for (let c = 0; c < cols; c++) {
        const cx0 = c * colW + 8;
        if (!emissiveOnly) {
          g.strokeStyle = '#2b3648';
          g.lineWidth = 3;
          g.strokeRect(cx0, y0 + 6, colW - 16, rowH - 12);
        }
        for (let u = 0; u < 14; u++) {
          const uy = y0 + 10 + u * 7.8;
          if (!emissiveOnly) {
            g.fillStyle = '#192231';
            g.fillRect(cx0 + 4, uy, colW - 24, 5.5);
          }
          // Glowing blue/cyan/emerald server blade LEDs!
          for (let led = 0; led < 9; led++) {
            if (rng() > 0.22) {
              const isGreen = rng() > 0.84;
              g.fillStyle = isGreen ? '#10f58c' : (rng() > 0.4 ? '#00d8ff' : '#60a5fa');
              g.fillRect(cx0 + 10 + led * 18, uy + 1.2, 10, 3.2);
            }
          }
        }
      }
    }

    // Row 4: 4-STORY PARKING GARAGE
    drawBannerRow(
      4,
      '#082032',
      '#22c55e',
      '🅿 NHÀ ĐỂ XE ĐA TẦNG 24/7',
      '4 TẦNG ĐỖ XE LIÊN THÔNG • ĐƯỜNG DỐC LÊN SÂN THƯỢNG 12.2M',
      '#ffffff',
      '#4ade80',
      '#16a34a'
    );
    // Row 5: HIGH-RISE CONSTRUCTION SITE
    drawBannerRow(
      5,
      '#241905',
      '#f59e0b',
      '⚠ CÔNG TRƯỜNG CAO ỐC 35M',
      'MILE HIGH CLUB • CẦN CẨU THÁP 68M • CẤM PHẬN SỰ MIỄN VÀO',
      '#fde047',
      '#fb923c',
      '#ea580c'
    );
    // Row 6: EAST FINANCIAL TOWERS
    drawBannerRow(
      6,
      '#0a1924',
      '#34d399',
      'SCHLONGBERG SACHS • LOMBANK',
      'ĐẠI LỘ TÀI CHÍNH ĐÔNG DOWNTOWN • X = +320 BOULEVARD',
      '#ecfdf5',
      '#6ee7b7',
      '#059669'
    );
    // Row 7: EXPRESS HELIPAD ELEVATOR & PARACHUTE
    drawBannerRow(
      7,
      '#210912',
      '#fbbf24',
      '⬆ THANG MÁY TỐC HÀNH [F]',
      'LÊN ĐỈNH MAZE BANK 120M • NHẬN DÙ LƯỢN SKYDIVING MIỄN PHÍ',
      '#fde68a',
      '#fda4af',
      '#e11d48'
    );
  }

  const signAtlasDiffuse = makeCanvasTexture(1024, 1024, (g, w, h) => paintSignAtlas(g, w, h, false));
  signAtlasDiffuse.wrapS = THREE.ClampToEdgeWrapping;
  signAtlasDiffuse.wrapT = THREE.ClampToEdgeWrapping;

  const signAtlasEmissive = makeCanvasTexture(1024, 1024, (g, w, h) => paintSignAtlas(g, w, h, true));
  signAtlasEmissive.wrapS = THREE.ClampToEdgeWrapping;
  signAtlasEmissive.wrapT = THREE.ClampToEdgeWrapping;

  const roomAtlasDataTex = buildInteriorRoomAtlasDataTexture();

  return {
    roadAsphalt,
    concreteGrain,
    marbleVeined,
    curtainFacade,
    signAtlasDiffuse,
    signAtlasEmissive,
    roomAtlasDataTex,
  };
}

// ============================================================================
// Custom GLSL 3D Parallax Interior Mapping Material (0 Extra Polygons, Loop-Free!)
// ============================================================================

function createParallaxCurtainWallMaterial(texSuite) {
  const imUniforms = {
    uDtTime: { value: 0.0 },
    uDtNightFactor: { value: 0.25 },
    uDtRoomDepth: { value: 0.78 },
    tDtRoomAtlas: { value: texSuite.roomAtlasDataTex },
  };

  const mat = new THREE.MeshStandardMaterial({
    name: 'DowntownParallaxCurtainGlass',
    map: texSuite.curtainFacade,
    roughness: 0.14,
    metalness: 0.62,
  });

  // Mark so gfx_ultra.upgradeCityMaterialsWithInteriorMapping never double-patches this shader!
  mat.userData = mat.userData || {};
  mat.userData.hasGfxInteriorMapping = true;
  mat.userData.dtImUniforms = imUniforms;

  mat.customProgramCacheKey = function downtownInteriorKey() {
    return 'downtown_parallax_im3d_v1';
  };

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDtTime = imUniforms.uDtTime;
    shader.uniforms.uDtNightFactor = imUniforms.uDtNightFactor;
    shader.uniforms.uDtRoomDepth = imUniforms.uDtRoomDepth;
    shader.uniforms.tDtRoomAtlas = imUniforms.tDtRoomAtlas;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vDtWorldPos;
      varying vec3 vDtWorldNormal;
      varying vec2 vDtArchUv;`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      vec4 dtWp4 = modelMatrix * vec4(transformed, 1.0);
      vDtWorldPos = dtWp4.xyz;
      vDtWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
      vDtArchUv = uv;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      uniform float uDtTime;
      uniform float uDtNightFactor;
      uniform float uDtRoomDepth;
      uniform sampler2D tDtRoomAtlas;
      varying vec3 vDtWorldPos;
      varying vec3 vDtWorldNormal;
      varying vec2 vDtArchUv;

      float dtHash21(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      vec4 dtTraceInteriorRoom(vec2 archUv, vec3 worldPos, vec3 worldNormal, vec3 camPos) {
        // Horizontal-only curtain-wall faces (roof caps have abs(normal.y) > 0.55)
        if (abs(worldNormal.y) > 0.55) return vec4(0.0);

        float dist = distance(camPos, worldPos);
        float lodFade = 1.0 - smoothstep(185.0, 290.0, dist);
        if (lodFade <= 0.005) return vec4(0.0);

        vec2 cellId = floor(archUv);
        vec2 fUv = fract(archUv);

        // Aluminum mullion & floor spandrel mask (0 = frame, 1 = clear glass pane)
        float maskX = smoothstep(0.04, 0.08, fUv.x) * (1.0 - smoothstep(0.92, 0.96, fUv.x));
        float maskY = smoothstep(0.08, 0.13, fUv.y) * (1.0 - smoothstep(0.88, 0.93, fUv.y));
        float paneMask = maskX * maskY;
        if (paneMask <= 0.01) return vec4(0.0);

        vec2 paneUv = clamp((fUv - vec2(0.06, 0.10)) / vec2(0.88, 0.80), 0.001, 0.999);

        // Local orthonormal room frame: X = right along facade, Y = world up, Z = inward into building
        vec3 nHoriz = normalize(vec3(worldNormal.x, 0.0, worldNormal.z));
        vec3 upVec = vec3(0.0, 1.0, 0.0);
        vec3 rightVec = normalize(cross(upVec, nHoriz));
        vec3 inwardVec = -nHoriz;

        vec3 viewRayW = normalize(worldPos - camPos);
        vec3 rayR = vec3(
          dot(viewRayW, rightVec),
          dot(viewRayW, upVec),
          max(0.06, dot(viewRayW, inwardVec))
        );

        // Closed-form analytical ray-box intersection with [0..1] x [0..1] x [0..depth]
        float tx = rayR.x > 0.0 ? (1.0 - paneUv.x) / max(rayR.x, 1e-4) : (-paneUv.x) / min(rayR.x, -1e-4);
        float ty = rayR.y > 0.0 ? (1.0 - paneUv.y) / max(rayR.y, 1e-4) : (-paneUv.y) / min(rayR.y, -1e-4);
        float tz = uDtRoomDepth / rayR.z;
        float tHit = min(min(tx, ty), tz);

        vec3 hit = vec3(paneUv, 0.0) + rayR * tHit;
        float depthFrac = clamp(hit.z / uDtRoomDepth, 0.0, 1.0);

        // Deterministic per-room seed combining UV cell + coarse building block ID
        vec2 bldgSeed = floor(worldPos.xz * 0.0625);
        float r1 = dtHash21(cellId + bldgSeed * 17.3);
        float r2 = dtHash21(cellId * 2.17 + bldgSeed * 9.1 + 11.7);

        float litThreshold = mix(0.28, 0.68, uDtNightFactor);
        bool isLit = r1 < litThreshold;

        // Warm 3200K executive tungsten vs Cool 6000K financial fluorescent LED
        vec3 tempCol = r2 > 0.46
          ? vec3(0.86, 0.95, 1.08)
          : vec3(1.12, 0.91, 0.68);

        vec3 roomCol = vec3(0.16);
        float emitBoost = 0.0;

        if (tHit >= tz - 1e-4) {
          // Back wall -> sample 4x2 furnished room DataTexture
          float colIdx = floor(mod(r1 * 16.0, 4.0));
          float rowIdx = floor(mod(r2 * 8.0, 2.0));
          vec2 backUv = vec2(clamp(hit.x, 0.03, 0.97), clamp(1.0 - hit.y, 0.03, 0.97));
          if (r2 > 0.5) backUv.x = 1.0 - backUv.x;
          vec2 atlasUv = vec2(colIdx * 0.25, rowIdx * 0.5) + backUv * vec2(0.25, 0.5);
          roomCol = texture2D(tDtRoomAtlas, atlasUv).rgb;
          float lum = dot(roomCol, vec3(0.2126, 0.7152, 0.0722));
          if (lum > 0.55) emitBoost = (lum - 0.50) * 1.45;
        } else if (tHit >= tx - 1e-4) {
          // Side partition walls with subtle vertical acoustic panel stripes
          float panelStripe = 0.88 + 0.12 * step(0.5, fract(depthFrac * 4.0));
          roomCol = vec3(0.46, 0.49, 0.54) * panelStripe * (0.65 + 0.35 * hit.y);
        } else if (rayR.y > 0.0) {
          // Ceiling with glowing recessed 2x2 fluorescent light troffers!
          vec2 cGrid = fract(vec2(hit.x * 2.0, depthFrac * 2.0));
          float troffer = step(0.22, cGrid.x) * step(cGrid.x, 0.78) * step(0.22, cGrid.y) * step(cGrid.y, 0.78);
          roomCol = mix(vec3(0.42, 0.45, 0.49), vec3(1.18, 1.18, 1.15), troffer);
          emitBoost = troffer * 1.35;
        } else {
          // Carpeted / wood-parquet office floor
          float tile = step(0.5, fract(hit.x * 4.0 + floor(depthFrac * 4.0) * 0.5));
          roomCol = vec3(0.20, 0.23, 0.28) * (0.86 + 0.20 * tile);
        }

        // Mid-room desk & monitor plane at z = 0.50 * depth
        float tMid = (uDtRoomDepth * 0.50) / rayR.z;
        if (tMid < tHit - 0.01) {
          vec2 pMid = paneUv + rayR.xy * tMid;
          if (pMid.x > 0.20 && pMid.x < 0.80 && pMid.y < 0.34) {
            roomCol = vec3(0.24, 0.19, 0.15);
            if (pMid.y > 0.22 && pMid.x > 0.34 && pMid.x < 0.66) {
              float scrPulse = 0.85 + 0.15 * sin(uDtTime * 3.4 + r1 * 25.0);
              roomCol = vec3(0.22, 0.74, 1.05) * scrPulse;
              emitBoost = max(emitBoost, 0.95);
            }
          }
        }

        float edgeAO = smoothstep(0.0, 0.16, min(hit.x, 1.0 - hit.x)) * smoothstep(0.0, 0.14, min(hit.y, 1.0 - hit.y));
        float ao = mix(0.42, 1.0, edgeAO) * mix(1.0, 0.70, depthFrac);
        float baseLight = isLit ? (0.65 + 0.75 * uDtNightFactor) : (0.10 + 0.22 * emitBoost);
        vec3 rad = roomCol * tempCol * ao * (baseLight + (isLit ? emitBoost * 0.75 : 0.0));
        return vec4(max(rad, vec3(0.0)), paneMask * lodFade);
      }`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      vec4 dtIm = dtTraceInteriorRoom(vDtArchUv, vDtWorldPos, normalize(vDtWorldNormal), cameraPosition);
      if (dtIm.a > 0.005) {
        vec3 dtView = normalize(cameraPosition - vDtWorldPos);
        vec3 dtNH = normalize(vec3(vDtWorldNormal.x, 0.0001, vDtWorldNormal.z));
        float dtNdotV = clamp(dot(dtNH, dtView), 0.0, 1.0);
        float dtFresnel = clamp(0.18 + 0.76 * pow(1.0 - dtNdotV, 3.5), 0.10, 0.90);
        float dtTrans = (1.0 - dtFresnel) * dtIm.a;
        diffuseColor.rgb = mix(diffuseColor.rgb, dtIm.rgb * 0.45, dtTrans * 0.85);
        totalEmissiveRadiance += dtIm.rgb * dtTrans * (0.38 + 1.15 * uDtNightFactor);
        roughnessFactor = mix(roughnessFactor, 0.08, dtIm.a * 0.80);
      }`
    );
  };

  return mat;
}

// ============================================================================
// Main Module Factory: createMapDowntown(ctx)
// ============================================================================

export function createMapDowntown(ctx = {}) {
  let activeCtx = ctx;
  let initialized = false;
  let vehiclesSpawned = false;
  let worldPatched = false;
  let elapsed = 0;
  let elevatorCooldown = 0;
  let detectorBeepCooldown = 0;
  let udVaultOpenTarget = false;
  let udVaultProgress = 0;
  let prevKeyF = false;
  let prevKeyG = false;

  const root = new THREE.Group();
  root.name = 'MapDowntownDistrict1';

  const aabbs = [];
  const roadNodes = [];
  const roadEdges = [];
  const minimapPolys = [];
  const minimapBlips = [];

  // Dynamic Scene References (kept minimal for <20 draw calls!)
  let parallaxMatRef = null;
  let emissiveGlowMatRef = null;
  let signAtlasMatRef = null;
  let craneSlewGroup = null;
  let udVaultPivot = null;
  let fibGlassInst = null;
  let animPropsInst = null;

  // Dynamic State Pools
  const fibGlassPanels = [];
  const beaconIndices = [];
  const fountainJetDrops = [];
  const fibDetectorBarIndices = [];
  const coronaRingEntries = [];
  const glassShards = [];
  const MAX_GLASS_SHARDS = 96;
  let shardCursor = 0;

  // Stunt Ramp Definitions for Launch & Bonus Tracking
  const downtownStuntRamps = [
    {
      id: 'dt_parking_roof_jump',
      name: 'Cú Bay Sân Thượng Nhà Để Xe 4 Tầng',
      minX: 273.0,
      maxX: 294.0,
      minZ: 130.4,
      maxZ: 137.6,
      yBase: 12.20,
      yTip: 14.80,
      dir: 'west', // rises as X decreases from 294 -> 273
      cooldown: 0,
    },
    {
      id: 'dt_construction_roof_jump',
      name: 'Cú Bay Đỉnh Công Trường Cao Ốc 35m',
      minX: 263.5,
      maxX: 296.0,
      minZ: 62.5,
      maxZ: 70.5,
      yBase: 35.00,
      yTip: 38.40,
      dir: 'west', // rises as X decreases from 296 -> 263.5
      cooldown: 0,
    },
    {
      id: 'dt_construction_mid_jump',
      name: 'Cú Bay Tầng Thép Công Trường 14.2m',
      minX: 263.5,
      maxX: 288.0,
      minZ: 56.8,
      maxZ: 62.2,
      yBase: 14.20,
      yTip: 17.50,
      dir: 'west', // rises as X decreases from 288 -> 263.5
      cooldown: 0,
    },
  ];

  function addAABB(minX, maxX, minZ, maxZ, maxY, minY = 0, tag = 'downtown_solid') {
    if (maxX <= minX || maxZ <= minZ) return null;
    const box = { minX, maxX, minZ, maxZ, maxY, minY, tag, enabled: true, _stamp: 0 };
    aabbs.push(box);
    return box;
  }

  function addMinimapRect(id, label, minX, maxX, minZ, maxZ, fill, stroke = '#2a3340', lineWidth = 1.0, layer = 1) {
    minimapPolys.push({
      id,
      label,
      type: 'rect',
      layer,
      fill,
      color: fill,
      stroke,
      lineWidth,
      minX,
      maxX,
      minZ,
      maxZ,
      x: minX,
      z: minZ,
      w: maxX - minX,
      h: maxZ - minZ,
      points: [
        { x: minX, z: minZ },
        { x: maxX, z: minZ },
        { x: maxX, z: maxZ },
        { x: minX, z: maxZ },
      ],
    });
  }

  // ==========================================================================
  // Safe Procedural Audio Feedback Helper
  // ==========================================================================
  function playLocalTone(freqStart, freqEnd, dur = 0.16, type = 'sine', gainVal = 0.08) {
    try {
      const ac = activeCtx?.audio?.ctx;
      if (!ac || ac.state !== 'running') return;
      const now = ac.currentTime;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(40, freqStart), now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + dur);
      g.gain.setValueAtTime(gainVal, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(g);
      g.connect(ac.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch (_) {}
  }

  // ==========================================================================
  // Road Graph Builder (East Boulevard X = +320 & Connecting Avenues)
  // ==========================================================================
  function buildRoadGraphAndMinimap() {
    roadNodes.length = 0;
    roadEdges.length = 0;
    minimapPolys.length = 0;
    minimapBlips.length = 0;

    const nodeByKey = new Map();
    function ensureNode(x, z) {
      const key = `${Math.round(x)},${Math.round(z)}`;
      let n = nodeByKey.get(key);
      if (!n) {
        const id = roadNodes.length;
        const isBlvd = Math.abs(x - EAST_BLVD_X) < 1.0;
        n = {
          id,
          index: id,
          x,
          z,
          isBoulevard: isBlvd,
          roadWidth: isBlvd ? EAST_BLVD_HALF_W * 2 : STD_HALF_W * 2,
          neighbors: [],
          neighborIds: [],
          edges: [],
          district: 'downtown',
          toString() { return String(this.id); },
          valueOf() { return this.id; },
        };
        roadNodes.push(n);
        nodeByKey.set(key, n);
      }
      return n;
    }

    function connectBidirectional(x1, z1, x2, z2, width = 16) {
      const nA = ensureNode(x1, z1);
      const nB = ensureNode(x2, z2);
      if (nA === nB || nA.neighbors.includes(nB)) return;
      const dist = Math.hypot(x2 - x1, z2 - z1);
      const lanes = width > 18 ? 4 : 2;
      const eAB = { from: nA.id, to: nB.id, a: nA, b: nB, x1: nA.x, z1: nA.z, x2: nB.x, z2: nB.z, length: dist, width, lanes };
      const eBA = { from: nB.id, to: nA.id, a: nB, b: nA, x1: nB.x, z1: nB.z, x2: nA.x, z2: nA.z, length: dist, width, lanes };
      roadEdges.push(eAB, eBA);
      nA.neighbors.push(nB);
      nA.neighborIds.push(nB.id);
      nA.edges.push(eAB);
      nB.neighbors.push(nA);
      nB.neighborIds.push(nA.id);
      nB.edges.push(eBA);
    }

    // 1. North-South East Financial Boulevard at X = +320, Z in [-200, +200]
    for (let i = 0; i < DOWNTOWN_STREETS.length - 1; i++) {
      connectBidirectional(EAST_BLVD_X, DOWNTOWN_STREETS[i], EAST_BLVD_X, DOWNTOWN_STREETS[i + 1], 20);
    }

    // 2. Unobstructed East-West Cross-Avenues connecting X = +200 <-> X = +320
    // Z = -200 (North Côn Lôn Tiên Sơn / Downtown Ave)
    connectBidirectional(200, -200, 246, -200, 16);
    connectBidirectional(246, -200, EAST_BLVD_X, -200, 16);

    // Z = -120 (East Tiên Bảo Tổng Khố Colonnade Turnout)
    connectBidirectional(310, -120, EAST_BLVD_X, -120, 16);

    // Z = -40 (West Maze Bank Fountain Drop-off & East Maze Bank Boulevard Access)
    connectBidirectional(200, -40, 236, -40, 16);
    connectBidirectional(308, -40, EAST_BLVD_X, -40, 16);

    // Z = +40 (Passes cleanly under Construction Site 6.8m Steel Sky-Gantry!)
    connectBidirectional(200, 40, 256, 40, 16);
    connectBidirectional(256, 40, EAST_BLVD_X, 40, 16);

    // Z = +120 (Runs cleanly past 4-Story Parking Garage North Entrance!)
    connectBidirectional(200, 120, 260, 120, 16);
    connectBidirectional(260, 120, EAST_BLVD_X, 120, 16);

    // Z = +200 (South Bích Thủy Kênh / Port Connector Ave)
    connectBidirectional(200, 200, 260, 200, 16);
    connectBidirectional(260, 200, EAST_BLVD_X, 200, 16);

    // 3. Minimap Vector Polygons & Landmark Blips
    addMinimapRect('dt_land_east', 'East Downtown Landmass', 240, 386, -225, 225, '#1b2028', '#252c36', 0.8, 0);
    addMinimapRect('dt_blvd_320', 'East Financial Boulevard', 310, 330, -214, 214, '#596678', '#3a4352', 1.0, 1);
    addMinimapRect('dt_st_n200', 'Côn Lôn Tiên Sơn East Ave', 200, 330, -208, -192, '#4c5563', '#323946', 0.8, 1);
    addMinimapRect('dt_st_p40', 'San Andreas East Ave', 200, 330, 32, 48, '#4c5563', '#323946', 0.8, 1);
    addMinimapRect('dt_st_p120', 'Olympic East Ave', 200, 330, 112, 128, '#4c5563', '#323946', 0.8, 1);
    addMinimapRect('dt_st_p200', 'Bích Thủy Kênh East Ave', 200, 330, 192, 208, '#4c5563', '#323946', 0.8, 1);

    addMinimapRect('dt_maze_bank', 'Tháp Maze Bank (120m)', 248, 308, -70, -10, '#3a1822', '#ef4444', 1.6, 2);
    addMinimapRect('dt_union_dep', 'Tiên Bảo Tổng Khố', 246, 310, -172, -108, '#2d281c', '#eab308', 1.5, 2);
    addMinimapRect('dt_construction', 'Công Trường Cao Ốc 35m', 263, 307, 48, 85, '#362318', '#f97316', 1.3, 2);
    addMinimapRect('dt_parking_4f', 'Nhà Để Xe Đa Tầng', 272, 308, 128, 178, '#192c38', '#22c55e', 1.4, 2);
    addMinimapRect('dt_fib_atrium', 'Sảnh An Ninh FIB', 148, 172, -18, -10, '#19324a', '#38bdf8', 1.2, 2);

    minimapBlips.push(
      { id: 'maze_bank', x: 278, z: -40, label: 'Tháp Maze Bank (120m)', name: 'Tháp Maze Bank (120m)', icon: '🏙', color: '#ef4444', stroke: '#ffffff', radius: 5.4 },
      { id: 'union_depository', x: 278, z: -140, label: 'Tiên Bảo Tổng Khố', name: 'Ngân Hàng Liên Bang Tiên Bảo Tổng Khố', icon: '🏛', color: '#f59e0b', stroke: '#ffffff', radius: 5.0 },
      { id: 'fib_tower_atrium', x: 160, z: -14.5, label: 'Tháp FIB Trung Tâm', name: 'Tháp FIB Trung Tâm (78m)', icon: '🛡', color: '#38bdf8', stroke: '#ffffff', radius: 4.6 },
      { id: 'downtown_construction', x: 285, z: 66, label: 'Công Trường Cao Ốc 35m', name: 'Công Trường Cao Ốc & Cần Cẩu 68m', icon: '🏗', color: '#f97316', stroke: '#111827', radius: 4.6 },
      { id: 'downtown_parking_garage', x: 290, z: 152, label: 'Nhà Để Xe 4 Tầng', name: 'Nhà Để Xe Đa Tầng (4 Tầng)', icon: '🅿', color: '#22c55e', stroke: '#ffffff', radius: 4.8 }
    );
  }

  // ==========================================================================
  // Carve Legacy Block AABBs in ctx.world Only Where Seamless Doors Open
  // ==========================================================================
  function patchWorldSeamlessOpenings(world) {
    if (!world || worldPatched) return;
    const list = world.aabbs;
    if (!Array.isArray(list)) return;
    worldPatched = true;

    const patchList = (arr) => {
      if (!Array.isArray(arr)) return;
      for (let i = 0; i < arr.length; i++) {
        const b = arr[i];
        if (!b) continue;
        // 1) Free ground level y in [0, 6.2] of FIB South Lower block so player walks seamlessly into Security Atrium!
        if (b.tag === 'fib_south_lower') {
          b.minY = 6.2;
        }
        // 2) Give 3.5m wide promenade along X = 242.5..246 in front of Tiên Bảo Tổng Khố West Colonnade!
        if (b.tag === 'skyscraper' && Math.abs(b.maxX - 244) < 1.0 && b.minZ < -170 && b.maxZ > -145) {
          b.maxX = 242.5;
        }
        // 3) Free ground level Z in [-144, -132] of Casino South tip so Tiên Bảo Tổng Khố Z = -140 walk-in axis is 100% open!
        if (b.tag === 'casino_main_skyscraper' && b.minZ < -132.0) {
          b.minZ = -132.0;
        }
      }
    };

    patchList(list);
    if (activeCtx?.casinoWorld?.aabbs && activeCtx.casinoWorld.aabbs !== list) {
      patchList(activeCtx.casinoWorld.aabbs);
    }
  }

  // ==========================================================================
  // Build Entire District 1 Geometry Into Merged Material Batches (<20 Draw Calls!)
  // ==========================================================================
  function buildDistrictGeometry(scene) {
    const tex = buildDowntownTextureSuite();

    // Shared Batched Materials
    const concreteMat = new THREE.MeshStandardMaterial({
      name: 'DtConcreteGranite',
      map: tex.concreteGrain,
      vertexColors: true,
      roughness: 0.76,
      metalness: 0.08,
    });

    const marbleMat = new THREE.MeshStandardMaterial({
      name: 'DtPolishedMarble',
      map: tex.marbleVeined,
      vertexColors: true,
      roughness: 0.18,
      metalness: 0.12,
    });

    const metalMat = new THREE.MeshStandardMaterial({
      name: 'DtStructuralSteel',
      vertexColors: true,
      roughness: 0.30,
      metalness: 0.80,
    });

    const roadMat = new THREE.MeshStandardMaterial({
      name: 'DtRoadAsphalt',
      map: tex.roadAsphalt,
      roughness: 0.68,
      metalness: 0.06,
    });

    parallaxMatRef = createParallaxCurtainWallMaterial(tex);

    emissiveGlowMatRef = new THREE.MeshStandardMaterial({
      name: 'DtEmissiveGlow',
      vertexColors: true,
      emissive: 0xffffff,
      emissiveIntensity: 1.45,
      roughness: 0.22,
      metalness: 0.1,
    });

    signAtlasMatRef = new THREE.MeshStandardMaterial({
      name: 'DtSignAndServerAtlas',
      map: tex.signAtlasDiffuse,
      emissive: 0xffffff,
      emissiveMap: tex.signAtlasEmissive,
      emissiveIntensity: 1.35,
      roughness: 0.26,
      metalness: 0.20,
    });

    const translucentMat = new THREE.MeshStandardMaterial({
      name: 'DtTranslucentGlassAndNet',
      vertexColors: true,
      transparent: true,
      opacity: 0.48,
      roughness: 0.12,
      metalness: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Geometry accumulators per material
    const buckets = {
      concrete: [],
      marble: [],
      metal: [],
      road: [],
      curtain: [],
      emissive: [],
      signs: [],
      translucent: [],
    };

    const uBox = new THREE.BoxGeometry(1, 1, 1);
    const uCyl12 = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
    const uCyl20 = new THREE.CylinderGeometry(0.5, 0.5, 1, 20);
    const uPlane = new THREE.PlaneGeometry(1, 1);

    function pushGeo(bucketName, geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, hexColor = null) {
      buckets[bucketName].push({
        geo,
        matrix: makeMatrix4(x, y, z, rx, ry, rz, sx, sy, sz),
        color: hexColor !== null ? new THREE.Color(hexColor) : null,
      });
    }

    function pushRawGeo(bucketName, geo, hexColor = null) {
      buckets[bucketName].push({
        geo,
        matrix: null,
        color: hexColor !== null ? new THREE.Color(hexColor) : null,
      });
    }

    // Palette Constants
    const COL = {
      graniteLight: 0xd8dce2,
      graniteMed: 0x9aa2ae,
      graniteDark: 0x434a56,
      brutalistConcrete: 0xa6a9ad,
      brutalistDark: 0x626770,
      woodPlank: 0xa97442,
      woodDark: 0x7c512b,
      marbleWhite: 0xf6f4ef,
      marbleCream: 0xe8dfc8,
      marbleSlate: 0x2a323d,
      redOxideSteel: 0x9b2c20,
      craneYellow: 0xf5b700,
      steelSilver: 0xcbd5e1,
      steelDark: 0x27303d,
      brassGold: 0xd4af37,
      mazeCrimson: 0xd91e36,
      crownWarmGlow: 0xfff0c2,
      ledCyan: 0x00e5ff,
      ledBlue: 0x2563eb,
      ledGreen: 0x10f58c,
      ledAmber: 0xfbbf24,
      ledWhite: 0xf8fafc,
      safetyNetGreen: 0x16804a,
      glassCyan: 0x8be9fd,
      waterFountain: 0x38d9f5,
      grassMedian: 0x31663b,
    };

    // Rooftop Greeble Seed Collectors (flushed into 4 InstancedMeshes!)
    const hvacSeeds = [];
    const ductSeeds = [];
    const waterTankSeeds = [];
    const telecomSeeds = [];

    function populateRoofGreebles(cx, cz, w, d, roofY, seedIdx, includeTank = true, includeTelecom = false) {
      const r = createRNG(seedIdx * 997 + 131);
      // 1-2 HVAC Chillers
      const hCount = w > 26 ? 2 : 1;
      for (let i = 0; i < hCount; i++) {
        const ox = (i === 0 ? -0.24 : 0.22) * w + (r() - 0.5) * 2.0;
        const oz = -0.22 * d + (r() - 0.5) * 2.5;
        hvacSeeds.push({ x: cx + ox, y: roofY, z: cz + oz, yaw: Math.floor(r() * 4) * (Math.PI * 0.5), scale: 0.9 + r() * 0.25 });
      }
      // 2 L-Shaped Silver Air Ducts
      ductSeeds.push({ x: cx - w * 0.12, y: roofY, z: cz + d * 0.16, yaw: 0, scale: 1.0 });
      if (w > 22) {
        ductSeeds.push({ x: cx + w * 0.18, y: roofY, z: cz - d * 0.12, yaw: Math.PI * 0.5, scale: 0.92 });
      }
      // Elevated Rooftop Water Tank
      if (includeTank && w >= 20 && d >= 20) {
        waterTankSeeds.push({
          x: cx + w * 0.24,
          y: roofY,
          z: cz + d * 0.24,
          yaw: r() * TAU,
          isWood: seedIdx % 2 === 0,
        });
      }
      // Telecom Cell / Microwave Tower
      if (includeTelecom) {
        telecomSeeds.push({
          x: cx - w * 0.26,
          y: roofY,
          z: cz + d * 0.26,
          yaw: r() * TAU,
          scale: 0.95 + r() * 0.3,
        });
      }
    }

    function addBeaconSeed(x, y, z) {
      pushGeo('metal', uCyl12, x, y + 0.9, z, 0, 0, 0, 0.14, 1.8, 0.14, COL.steelSilver);
      beaconIndices.push({ x, y: y + 1.9, z });
    }

    function makeRoadStrip(w, len, alongZ, repeatStep = 18) {
      const g = new THREE.PlaneGeometry(alongZ ? w : len, alongZ ? len : w);
      g.rotateX(-Math.PI / 2);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        const u = uv.getX(i);
        const v = uv.getY(i);
        if (alongZ) uv.setXY(i, u, v * (len / repeatStep));
        else uv.setXY(i, v, u * (len / repeatStep));
      }
      return g;
    }

    // ========================================================================
    // 0. EAST DOWNTOWN URBAN BASE APRON & NEW X = +320 BOULEVARD GRID
    // ========================================================================
    {
      // Base urban sidewalk/curb slab covering X in [242, 386], Z in [-226, 226]
      pushGeo('concrete', uBox, 314.0, -0.12, 0.0, 0, 0, 0, 144.0, 0.24, 452.0, COL.graniteMed);

      // North-South Boulevard at X = +320 (Z in [-216, +216], width 20m)
      const zStops = [-216, ...DOWNTOWN_STREETS, 216];
      for (let i = 0; i < zStops.length - 1; i++) {
        const zA = i === 0 ? zStops[i] : zStops[i] + STD_HALF_W;
        const zB = i === zStops.length - 2 ? zStops[i + 1] : zStops[i + 1] - STD_HALF_W;
        const segLen = zB - zA;
        if (segLen <= 0.5) continue;
        const cz = (zA + zB) * 0.5;
        const rGeo = makeRoadStrip(EAST_BLVD_HALF_W * 2, segLen, true, 18);
        rGeo.applyMatrix4(makeMatrix4(EAST_BLVD_X, ROAD_Y, cz));
        pushRawGeo('road', rGeo);

        // Raised sidewalks flanking X = +320 Boulevard
        pushGeo('concrete', uBox, EAST_BLVD_X - EAST_BLVD_HALF_W - 2.6, SIDEWALK_Y * 0.5, cz, 0, 0, 0, 5.2, SIDEWALK_Y, segLen, COL.graniteLight);
        pushGeo('concrete', uBox, EAST_BLVD_X + EAST_BLVD_HALF_W + 2.8, SIDEWALK_Y * 0.5, cz, 0, 0, 0, 5.6, SIDEWALK_Y, segLen, COL.graniteLight);

        // Landscaped granite center median along main blocks
        if (i >= 1 && i <= DOWNTOWN_STREETS.length - 1 && segLen > 20) {
          pushGeo('concrete', uBox, EAST_BLVD_X, 0.12, cz, 0, 0, 0, 1.8, 0.20, segLen - 12, COL.graniteLight);
          pushGeo('concrete', uBox, EAST_BLVD_X, 0.23, cz, 0, 0, 0, 1.3, 0.06, segLen - 13.2, COL.grassMedian);
        }
      }

      // Intersection Pads & White Zebra Crosswalk Bars along X = +320
      for (let si = 0; si < DOWNTOWN_STREETS.length; si++) {
        const sz = DOWNTOWN_STREETS[si];
        const intGeo = new THREE.PlaneGeometry(EAST_BLVD_HALF_W * 2, STD_HALF_W * 2);
        intGeo.rotateX(-Math.PI / 2);
        intGeo.applyMatrix4(makeMatrix4(EAST_BLVD_X, ROAD_Y + 0.003, sz));
        pushRawGeo('road', intGeo);

        for (let k = -4; k <= 4; k++) {
          pushGeo('emissive', uBox, EAST_BLVD_X + k * 1.8, ROAD_Y + 0.01, sz - STD_HALF_W - 1.5, 0, 0, 0, 0.75, 0.015, 2.5, COL.ledWhite);
          pushGeo('emissive', uBox, EAST_BLVD_X + k * 1.8, ROAD_Y + 0.01, sz + STD_HALF_W + 1.5, 0, 0, 0, 0.75, 0.015, 2.5, COL.ledWhite);
        }
      }

      // East-West Connecting Road Segments from X = +246 to X = +310
      const ewSegments = [
        { z: -200, xA: 246, xB: 310 },
        { z: -120, xA: 306, xB: 310 },
        { z: -40, xA: 306, xB: 310 },
        { z: 40, xA: 246, xB: 310 },
        { z: 120, xA: 246, xB: 310 },
        { z: 200, xA: 246, xB: 310 },
      ];
      for (const seg of ewSegments) {
        const len = seg.xB - seg.xA;
        if (len <= 0.5) continue;
        const cx = (seg.xA + seg.xB) * 0.5;
        const rGeo = makeRoadStrip(STD_HALF_W * 2, len, false, 18);
        rGeo.applyMatrix4(makeMatrix4(cx, ROAD_Y, seg.z));
        pushRawGeo('road', rGeo);
      }

      // 4 Sleek Financial Towers on East Side of X = +320 Boulevard (X in [338, 370])
      const eastBlvdTowers = [
        { cx: 353, cz: -160, w: 30, d: 44, h: 74, seed: 11 },
        { cx: 353, cz: -80, w: 30, d: 44, h: 86, seed: 12 },
        { cx: 353, cz: 80, w: 30, d: 44, h: 64, seed: 13 },
        { cx: 353, cz: 160, w: 30, d: 44, h: 54, seed: 14 },
      ];
      for (const tw of eastBlvdTowers) {
        pushGeo('concrete', uBox, tw.cx, 3.6, tw.cz, 0, 0, 0, tw.w + 1.4, 7.2, tw.d + 1.4, COL.graniteDark);
        pushRawGeo(
          'curtain',
          makeArchitecturalBoxGeo(tw.w, tw.h - 7.2, tw.d, 4.0, 3.6).applyMatrix4(
            makeMatrix4(tw.cx, 7.2 + (tw.h - 7.2) * 0.5, tw.cz)
          )
        );
        pushGeo('concrete', uBox, tw.cx, tw.h + 0.4, tw.cz, 0, 0, 0, tw.w + 0.8, 0.8, tw.d + 0.8, COL.graniteLight);
        // Glass rooftop parapet
        pushGeo('translucent', uBox, tw.cx - tw.w * 0.5, tw.h + 1.3, tw.cz, 0, 0, 0, 0.14, 1.1, tw.d, COL.glassCyan);
        // Corporate fascia facing West onto X = +320 Boulevard
        const signGeo = makeAtlasPlaneGeo(14.0, 2.6, 6);
        signGeo.applyMatrix4(makeMatrix4(tw.cx - tw.w * 0.5 - 0.78, 5.6, tw.cz, 0, -Math.PI * 0.5, 0));
        pushRawGeo('signs', signGeo);

        populateRoofGreebles(tw.cx, tw.cz, tw.w - 2, tw.d - 2, tw.h + 0.8, tw.seed, true, tw.h >= 74);
        addBeaconSeed(tw.cx - tw.w * 0.4, tw.h + 0.8, tw.cz - tw.d * 0.4);
        addAABB(tw.cx - tw.w * 0.5 - 0.7, tw.cx + tw.w * 0.5 + 0.7, tw.cz - tw.d * 0.5 - 0.7, tw.cz + tw.d * 0.5 + 0.7, tw.h + 1.0, 0, 'east_blvd_skyscraper');
      }

      // Also populate Instanced Rooftop Greebles onto existing Downtown towers so the whole skyline is detailed!
      populateRoofGreebles(160, -160, 32, 32, 82.0, 21, false, true);
      populateRoofGreebles(160, 160, 30, 30, 66.0, 22, false, true);
      populateRoofGreebles(229, -160, 21, 32, 58.0, 23, true, false);
      populateRoofGreebles(229, -80, 21, 32, 76.0, 24, false, true);
      populateRoofGreebles(229, 0, 21, 32, 68.0, 25, false, true);
      populateRoofGreebles(229, 80, 21, 32, 52.0, 26, true, false);
      populateRoofGreebles(229, 160, 21, 32, 44.0, 27, true, false);
    }

    // ========================================================================
    // 1. THÁP MAZE BANK SUPERTALL (120m Crown Jewel at (278, -40))
    //    Bounds: X in [248, 308], Z in [-70, -10]
    //    - Sunken Granite Plaza & Animated 3-Tier Water Fountain at (244, -40)
    //    - Seamless Ground-Floor Marble Lobby (y = 0.22m) + Elevator Corona (254, 0.25, -40)
    //    - Tiered Chamfered Octagonal Curtain-Wall Shaft + 120m Illuminated Crown + Helipad H
    // ========================================================================
    {
      // 1A. Sunken Granite Plaza & Multi-Tier Animated Fountain at (244, -40)
      pushGeo('concrete', uCyl20, MAZE_FOUNTAIN_POS.x, 0.10, MAZE_FOUNTAIN_POS.z, 0, 0, 0, 14.5, 0.20, 14.5, COL.graniteDark);
      pushGeo('concrete', uCyl20, MAZE_FOUNTAIN_POS.x, 0.36, MAZE_FOUNTAIN_POS.z, 0, 0, 0, 7.6, 0.56, 7.6, COL.graniteLight);
      pushGeo('translucent', uCyl20, MAZE_FOUNTAIN_POS.x, 0.58, MAZE_FOUNTAIN_POS.z, 0, 0, 0, 6.9, 0.12, 6.9, COL.waterFountain);
      // Tier 2 & Tier 3 Carved Marble Fountain Bowls
      pushGeo('marble', uCyl20, MAZE_FOUNTAIN_POS.x, 1.05, MAZE_FOUNTAIN_POS.z, 0, 0, 0, 4.4, 0.40, 4.4, COL.marbleWhite);
      pushGeo('translucent', uCyl20, MAZE_FOUNTAIN_POS.x, 1.26, MAZE_FOUNTAIN_POS.z, 0, 0, 0, 4.1, 0.10, 4.1, COL.waterFountain);
      pushGeo('marble', uCyl20, MAZE_FOUNTAIN_POS.x, 1.85, MAZE_FOUNTAIN_POS.z, 0, 0, 0, 2.2, 0.45, 2.2, COL.marbleWhite);
      pushGeo('metal', uCyl12, MAZE_FOUNTAIN_POS.x, 1.35, MAZE_FOUNTAIN_POS.z, 0, 0, 0, 0.85, 2.1, 0.85, COL.brassGold);
      pushGeo('emissive', uCyl20, MAZE_FOUNTAIN_POS.x, 0.66, MAZE_FOUNTAIN_POS.z, 0, 0, 0, 5.2, 0.05, 5.2, COL.ledCyan);
      addAABB(MAZE_FOUNTAIN_POS.x - 3.6, MAZE_FOUNTAIN_POS.x + 3.6, MAZE_FOUNTAIN_POS.z - 3.6, MAZE_FOUNTAIN_POS.z + 3.6, 2.1, 0, 'maze_fountain');

      // Seed 28 animated arching fountain water-jet droplets around (244, -40)
      for (let j = 0; j < 28; j++) {
        fountainJetDrops.push({
          angle: (j / 28) * TAU,
          phase: (j / 28),
          tier: j % 2,
        });
      }

      // Granite Plaza Apron leading into Seamless Ground-Floor Marble Lobby
      pushGeo('concrete', uBox, 278.0, 0.11, -40.0, 0, 0, 0, 60.0, 0.22, 58.0, COL.graniteDark);

      // 1B. Seamless Ground-Floor Marble Lobby (X in [249.5, 267.5], Z in [-51.0, -29.0], Floor y = 0.22m, Ceiling y = 8.6m)
      pushGeo('marble', uBox, 258.8, 0.12, -40.0, 0, 0, 0, 19.2, 0.22, 22.0, COL.marbleWhite);
      // Red Maze Bank carpet runner from West Entrance (249.5, -40) straight to Express Elevator (254, 0.25, -40) & Concierge (264, -40)
      pushGeo('concrete', uBox, 257.0, 0.235, -40.0, 0, 0, 0, 15.0, 0.02, 4.6, COL.mazeCrimson);
      // Lobby Ceiling Slab (y = 8.8m) + Glowing Warm Chandelier Troffers
      pushGeo('marble', uBox, 258.8, 8.9, -40.0, 0, 0, 0, 19.6, 0.6, 23.0, COL.marbleCream);
      for (const lx of [253.5, 259.0, 264.0]) {
        pushGeo('emissive', uBox, lx, 8.56, -40.0, 0, 0, 0, 2.8, 0.08, 6.4, COL.crownWarmGlow);
      }

      // North & South Lobby Perimeter Walls (leaving West X = 249.5, Z in [-46.5, -33.5] WIDE OPEN!)
      pushGeo('marble', uBox, 258.8, 4.5, -51.5, 0, 0, 0, 19.2, 8.8, 1.2, COL.marbleCream);
      pushGeo('marble', uBox, 258.8, 4.5, -28.5, 0, 0, 0, 19.2, 8.8, 1.2, COL.marbleCream);
      addAABB(249.2, 268.4, -52.2, -50.8, 9.2, 0, 'maze_lobby_wall_n');
      addAABB(249.2, 268.4, -29.2, -27.8, 9.2, 0, 'maze_lobby_wall_s');

      // West Facade Fluted Marble Pilasters & Glass Side Sidelights (doorway Z in [-46.0, -34.0] = 12m wide open!)
      pushGeo('marble', uBox, 249.6, 4.5, -48.6, 0, 0, 0, 0.9, 8.8, 4.8, COL.marbleWhite);
      pushGeo('marble', uBox, 249.6, 4.5, -31.4, 0, 0, 0, 0.9, 8.8, 4.8, COL.marbleWhite);
      addAABB(249.1, 250.1, -51.0, -46.2, 9.2, 0, 'maze_lobby_front_n');
      addAABB(249.1, 250.1, -33.8, -29.0, 9.2, 0, 'maze_lobby_front_s');

      // Interior Grand Marble Columns, Concierge Desk & Brushed-Gold Express Elevator Bank
      for (const cz of [-46.2, -33.8]) {
        for (const cx of [254.0, 261.0]) {
          pushGeo('marble', uCyl12, cx, 4.4, cz, 0, 0, 0, 0.95, 8.4, 0.95, COL.marbleWhite);
          pushGeo('metal', uCyl12, cx, 0.42, cz, 0, 0, 0, 1.12, 0.38, 1.12, COL.brassGold);
        }
      }
      // Concierge Desk at (263.6, 0.22, -40) & Brass Elevator Doors on Core Wall (X = 267.4)
      pushGeo('marble', uBox, 263.6, 0.78, -40.0, 0, 0, 0, 1.4, 1.12, 6.8, COL.marbleSlate);
      pushGeo('metal', uBox, 262.88, 1.32, -40.0, 0, 0, 0, 0.12, 0.08, 6.9, COL.brassGold);
      addAABB(262.8, 264.4, -43.5, -36.5, 1.5, 0, 'maze_concierge_desk');

      for (const ez of [-44.2, -40.0, -35.8]) {
        pushGeo('metal', uBox, 267.35, 1.85, ez, 0, 0, 0, 0.25, 3.2, 2.4, COL.brassGold);
        pushGeo('metal', uBox, 267.22, 1.80, ez, 0, 0, 0, 0.08, 3.0, 0.06, COL.steelDark);
      }

      // Glowing Express Helipad Elevator Sign above Lobby & West Canopy
      const elevSign = makeAtlasPlaneGeo(7.6, 1.65, 7);
      elevSign.applyMatrix4(makeMatrix4(267.15, 4.5, -40.0, 0, -Math.PI * 0.5, 0));
      pushRawGeo('signs', elevSign);

      const mazeWestSign = makeAtlasPlaneGeo(15.5, 3.2, 0);
      mazeWestSign.applyMatrix4(makeMatrix4(249.05, 10.8, -40.0, 0, -Math.PI * 0.5, 0));
      pushRawGeo('signs', mazeWestSign);

      const mazeEastSign = makeAtlasPlaneGeo(15.5, 3.2, 0);
      mazeEastSign.applyMatrix4(makeMatrix4(306.8, 10.8, -40.0, 0, Math.PI * 0.5, 0));
      pushRawGeo('signs', mazeEastSign);

      // Register Express Helipad Elevator Corona at exact (254, 0.25, -40) + Roof Return Corona
      coronaRingEntries.push(
        { x: MAZE_ELEVATOR_GROUND.x, y: MAZE_ELEVATOR_GROUND.y, z: MAZE_ELEVATOR_GROUND.z, color: COL.mazeCrimson, radius: 1.45 },
        { x: MAZE_ELEVATOR_ROOF.x, y: MAZE_ELEVATOR_ROOF.y, z: MAZE_ELEVATOR_ROOF.z, color: COL.ledAmber, radius: 1.25 }
      );

      // 1C. Podium Wings (North Z in [-66, -51.5] & South-East Z in [-28.5, -14] & East X in [267.5, 306.5])
      pushGeo('concrete', uBox, 282.0, 4.6, -59.0, 0, 0, 0, 46.0, 9.2, 14.5, COL.graniteLight);
      pushGeo('concrete', uBox, 286.0, 4.6, -21.0, 0, 0, 0, 38.0, 9.2, 14.5, COL.graniteLight);
      pushGeo('concrete', uBox, 287.0, 4.6, -40.0, 0, 0, 0, 38.5, 9.2, 24.0, COL.graniteLight);
      addAABB(259.0, 305.0, -66.2, -51.5, 9.4, 0, 'maze_podium_n');
      addAABB(267.0, 305.0, -28.5, -13.8, 9.4, 0, 'maze_podium_s');
      populateRoofGreebles(282, -59, 36, 11, 9.2, 31, false, false);

      // 1D. Tiered Chamfered Octagonal Curtain-Wall Tower Shaft (y = 9.2m -> 120.0m) at (278, -40)
      // Tier 1: y = 9.2 -> 68.0m (h = 58.8m, R = 21.8 -> 20.6m)
      pushRawGeo(
        'curtain',
        makeChamferedOctagonGeo(20.6, 21.8, 58.8, 4.0, 3.6).applyMatrix4(
          makeMatrix4(MAZE_CENTER_X, 9.2 + 29.4, MAZE_CENTER_Z)
        )
      );
      // Tier 2: y = 68.0 -> 98.0m (h = 30.0m, R = 18.6 -> 17.8m)
      pushRawGeo(
        'curtain',
        makeChamferedOctagonGeo(17.8, 18.6, 30.0, 4.0, 3.6).applyMatrix4(
          makeMatrix4(MAZE_CENTER_X, 68.0 + 15.0, MAZE_CENTER_Z)
        )
      );
      // Tier 3: y = 98.0 -> 112.0m (h = 14.0m, R = 15.8 -> 15.2m)
      pushRawGeo(
        'curtain',
        makeChamferedOctagonGeo(15.2, 15.8, 14.0, 4.0, 3.6).applyMatrix4(
          makeMatrix4(MAZE_CENTER_X, 98.0 + 7.0, MAZE_CENTER_Z)
        )
      );

      // 8 Vertical Granite Structural Corner Fins up the Octagonal Shaft
      for (let f = 0; f < 8; f++) {
        const ang = (f / 8) * TAU + Math.PI / 8;
        const cosA = Math.cos(ang);
        const sinA = Math.sin(ang);
        pushGeo('concrete', uBox, MAZE_CENTER_X + cosA * 20.8, 38.6, MAZE_CENTER_Z + sinA * 20.8, 0, -ang, 0, 1.35, 58.8, 1.35, COL.graniteLight);
        pushGeo('concrete', uBox, MAZE_CENTER_X + cosA * 18.0, 83.0, MAZE_CENTER_Z + sinA * 18.0, 0, -ang, 0, 1.15, 30.0, 1.15, COL.graniteLight);
      }

      // 1E. Illuminated Translucent Crown (y = 112.0 -> 120.0m) + Rooftop Helipad (y = 120.22m)
      pushGeo('concrete', uCyl12, MAZE_CENTER_X, 112.2, MAZE_CENTER_Z, 0, Math.PI / 8, 0, 31.6, 0.7, 31.6, COL.graniteLight);
      pushGeo('emissive', uCyl12, MAZE_CENTER_X, 116.0, MAZE_CENTER_Z, 0, Math.PI / 8, 0, 28.4, 7.4, 28.4, COL.crownWarmGlow);
      for (let f = 0; f < 16; f++) {
        const ang = (f / 16) * TAU;
        pushGeo(
          'emissive',
          uBox,
          MAZE_CENTER_X + Math.cos(ang) * 14.5,
          116.1,
          MAZE_CENTER_Z + Math.sin(ang) * 14.5,
          0,
          -ang,
          0,
          0.45,
          7.8,
          0.95,
          f % 4 === 0 ? COL.mazeCrimson : COL.crownWarmGlow
        );
      }
      // Crown Roof Cap & Helipad Landing Pad at y = 120.22m
      pushGeo('concrete', uCyl20, MAZE_CENTER_X, 119.92, MAZE_CENTER_Z, 0, 0, 0, 29.8, 0.48, 29.8, COL.graniteDark);
      pushGeo('metal', uCyl20, MAZE_CENTER_X, 120.18, MAZE_CENTER_Z, 0, 0, 0, 21.6, 0.08, 21.6, COL.steelDark);
      // Bold Red/White Helipad Circle + "H" Marking at (278, 120.23, -40)
      for (let seg = 0; seg < 24; seg++) {
        const a = (seg / 24) * TAU;
        pushGeo('emissive', uBox, MAZE_CENTER_X + Math.cos(a) * 9.6, 120.23, MAZE_CENTER_Z + Math.sin(a) * 9.6, 0, -a, 0, 0.55, 0.03, 2.55, seg % 2 === 0 ? COL.ledWhite : COL.mazeCrimson);
      }
      pushGeo('emissive', uBox, MAZE_CENTER_X - 2.3, 120.235, MAZE_CENTER_Z, 0, 0, 0, 1.15, 0.03, 6.8, COL.ledWhite);
      pushGeo('emissive', uBox, MAZE_CENTER_X + 2.3, 120.235, MAZE_CENTER_Z, 0, 0, 0, 1.15, 0.03, 6.8, COL.ledWhite);
      pushGeo('emissive', uBox, MAZE_CENTER_X, 120.235, MAZE_CENTER_Z, 0, 0, 0, 4.6, 0.03, 1.15, COL.ledWhite);

      // High-altitude Crown MAZE BANK Neon Banners (visible across Tiên Thành!)
      for (const dir of [
        { x: MAZE_CENTER_X - 14.9, z: MAZE_CENTER_Z, ry: -Math.PI * 0.5 },
        { x: MAZE_CENTER_X + 14.9, z: MAZE_CENTER_Z, ry: Math.PI * 0.5 },
        { x: MAZE_CENTER_X, z: MAZE_CENTER_Z - 14.9, ry: Math.PI },
        { x: MAZE_CENTER_X, z: MAZE_CENTER_Z + 14.9, ry: 0 },
      ]) {
        const sg = makeAtlasPlaneGeo(11.5, 2.3, 0);
        sg.applyMatrix4(makeMatrix4(dir.x, 116.2, dir.z, 0, dir.ry, 0));
        pushRawGeo('signs', sg);
      }

      // Parachute Rack Prop on Rooftop Helipad Edge (272.5, 120.22, -40)
      pushGeo('metal', uBox, 272.2, 120.85, -40.0, 0, 0, 0, 0.5, 1.25, 1.8, COL.steelSilver);
      pushGeo('emissive', uBox, 272.3, 120.95, -40.0, 0, 0, 0, 0.56, 0.68, 0.52, COL.mazeCrimson);

      // 8 Blinking Red Aviation Beacons crowning y = 120m!
      for (let b = 0; b < 8; b++) {
        const ang = (b / 8) * TAU;
        addBeaconSeed(MAZE_CENTER_X + Math.cos(ang) * 14.2, 120.2, MAZE_CENTER_Z + Math.sin(ang) * 14.2);
      }

      // Tower Core Solid AABBs (ground lobby X<267.5 stays open up to y=9.2m; upper shaft y=9.2..120.0m covers full octagon!)
      addAABB(267.5, 297.5, -58.5, -21.5, 120.0, 0, 'maze_tower_core_east');
      addAABB(259.5, 296.5, -58.5, -21.5, 120.0, 9.2, 'maze_tower_shaft_upper');
    }

    // ========================================================================
    // 2. THÁP FIB TRUNG TÂM SEAMLESS UPGRADE ((160, -40), 78m)
    //    - Ground Security Atrium around (160, 0.22, -14.5) (Turnstiles + Metal Detectors + Marble Desk)
    //    - y = 48m Executive Shatterable Outer Glass Panels + Glowing Blue LED Server Racks Room
    // ========================================================================
    {
      // 2A. Seamless Walk-In Security Atrium Pavilion (X in [148, 172], Z in [-17.9, -9.8], y = 0.24..6.15m)
      pushGeo('marble', uBox, 160.0, 0.13, -13.85, 0, 0, 0, 24.4, 0.22, 8.6, COL.marbleSlate);
      pushGeo('marble', uBox, 160.0, 0.245, -13.85, 0, 0, 0, 10.0, 0.02, 7.8, COL.marbleWhite);
      pushGeo('concrete', uBox, 160.0, 6.18, -13.85, 0, 0, 0, 24.6, 0.36, 8.6, COL.graniteDark);

      // Ceiling LED light strips inside Atrium
      for (const ax of [152.5, 160.0, 167.5]) {
        pushGeo('emissive', uBox, ax, 5.96, -13.8, 0, 0, 0, 3.6, 0.06, 4.8, COL.ledWhite);
      }

      // Left, Right & Front-Side Glass Walls (leaving Center Open Glass Doorway X in [156.4, 163.6] at Z = -9.8!)
      pushGeo('metal', uBox, 148.0, 3.1, -13.85, 0, 0, 0, 0.35, 5.8, 8.2, COL.steelDark);
      pushGeo('metal', uBox, 172.0, 3.1, -13.85, 0, 0, 0, 0.35, 5.8, 8.2, COL.steelDark);
      pushGeo('translucent', uBox, 148.0, 3.1, -13.85, 0, 0, 0, 0.12, 5.5, 7.9, COL.glassCyan);
      pushGeo('translucent', uBox, 172.0, 3.1, -13.85, 0, 0, 0, 0.12, 5.5, 7.9, COL.glassCyan);

      pushGeo('translucent', uBox, 152.2, 3.1, -9.8, 0, 0, 0, 8.4, 5.6, 0.14, COL.glassCyan);
      pushGeo('translucent', uBox, 167.8, 3.1, -9.8, 0, 0, 0, 8.4, 5.6, 0.14, COL.glassCyan);
      pushGeo('metal', uBox, 156.35, 3.1, -9.8, 0, 0, 0, 0.32, 5.8, 0.32, COL.steelSilver);
      pushGeo('metal', uBox, 163.65, 3.1, -9.8, 0, 0, 0, 0.32, 5.8, 0.32, COL.steelSilver);
      // Open swung-inward glass door leaves framing X = 156.5 & X = 163.5
      pushGeo('translucent', uBox, 156.6, 1.65, -10.55, 0, 0.25, 0, 0.10, 2.9, 1.35, COL.glassCyan);
      pushGeo('translucent', uBox, 163.4, 1.65, -10.55, 0, -0.25, 0, 0.10, 2.9, 1.35, COL.glassCyan);

      const fibAtriumSign = makeAtlasPlaneGeo(10.5, 1.85, 2);
      fibAtriumSign.applyMatrix4(makeMatrix4(160.0, 5.15, -9.58, 0, 0, 0));
      pushRawGeo('signs', fibAtriumSign);

      // Perimeter Wall AABBs (leaving X in [156.4, 163.6] wide open at Z = -9.8!)
      addAABB(147.7, 148.3, -18.0, -9.6, 6.2, 0, 'fib_atrium_w');
      addAABB(171.7, 172.3, -18.0, -9.6, 6.2, 0, 'fib_atrium_e');
      addAABB(147.8, 156.3, -10.05, -9.55, 6.2, 0, 'fib_atrium_sw');
      addAABB(163.7, 172.2, -10.05, -9.55, 6.2, 0, 'fib_atrium_se');
      addAABB(147.8, 172.2, -18.25, -17.65, 6.2, 0, 'fib_atrium_back');

      // 3 Glowing Green/Red Metal-Detector Arches + 4 Stainless-Steel Turnstiles at Z = -12.5
      const archXs = [155.6, 160.0, 164.4];
      for (let ai = 0; ai < archXs.length; ai++) {
        const ax = archXs[ai];
        pushGeo('metal', uBox, ax - 0.72, 1.35, -12.5, 0, 0, 0, 0.18, 2.35, 0.55, COL.steelSilver);
        pushGeo('metal', uBox, ax + 0.72, 1.35, -12.5, 0, 0, 0, 0.18, 2.35, 0.55, COL.steelSilver);
        pushGeo('metal', uBox, ax, 2.58, -12.5, 0, 0, 0, 1.66, 0.24, 0.58, COL.steelDark);
        // Dynamic green/red LED detector indicator bars stored in animPropsInst!
        fibDetectorBarIndices.push({ x: ax - 0.72, y: 1.45, z: -12.18 });
        fibDetectorBarIndices.push({ x: ax + 0.72, y: 1.45, z: -12.18 });
      }
      for (const tx of [153.6, 157.8, 162.2, 166.4]) {
        pushGeo('metal', uBox, tx, 0.74, -12.5, 0, 0, 0, 0.28, 0.98, 1.35, COL.steelSilver);
        pushGeo('emissive', uBox, tx, 1.24, -11.95, 0, 0, 0, 0.18, 0.04, 0.22, COL.ledGreen);
      }

      // Marble Reception Desk at (160, 0.24, -16.75) + Security Monitors + Executive Elevator Corona
      pushGeo('marble', uBox, 160.0, 0.78, -16.75, 0, 0, 0, 6.8, 1.08, 1.15, COL.marbleWhite);
      pushGeo('metal', uBox, 160.0, 1.34, -16.16, 0, 0, 0, 6.9, 0.08, 0.14, COL.steelSilver);
      pushGeo('emissive', uBox, 158.4, 1.56, -16.75, 0, 0, 0, 0.95, 0.52, 0.08, COL.ledCyan);
      pushGeo('emissive', uBox, 161.6, 1.56, -16.75, 0, 0, 0, 0.95, 0.52, 0.08, COL.ledCyan);
      addAABB(156.5, 163.5, -17.35, -16.15, 1.4, 0, 'fib_reception_desk');

      // Executive Elevator Door & Corona at (169.2, 0.26, -15.4) -> rides to y = 48m Server Room!
      pushGeo('metal', uBox, 171.75, 1.75, -15.4, 0, 0, 0, 0.20, 3.0, 2.2, COL.steelSilver);
      coronaRingEntries.push(
        { x: FIB_ELEVATOR_GROUND.x, y: FIB_ELEVATOR_GROUND.y, z: FIB_ELEVATOR_GROUND.z, color: COL.ledCyan, radius: 1.1 },
        { x: FIB_ELEVATOR_EXEC.x, y: FIB_ELEVATOR_EXEC.y, z: FIB_ELEVATOR_EXEC.z, color: COL.ledCyan, radius: 1.05 }
      );

      // 2B. y = 48m Executive Level: Glowing Blue LED Server Racks Room (X in [165.5, 181.2], Z in [-25.2, -19.8])
      pushGeo('metal', uBox, 173.4, 48.03, -22.5, 0, 0, 0, 15.6, 0.08, 5.4, COL.steelDark);
      pushGeo('emissive', uBox, 173.4, 48.08, -22.5, 0, 0, 0, 14.8, 0.02, 0.22, COL.ledCyan);
      // Glass server-room partition along Z = -19.8 & X = 165.5 (with open doorway at Z in [-23.4, -21.2]!)
      pushGeo('translucent', uBox, 173.4, 50.6, -19.8, 0, 0, 0, 15.6, 5.1, 0.12, COL.glassCyan);
      pushGeo('metal', uBox, 165.55, 50.6, -20.5, 0, 0, 0, 0.16, 5.1, 1.4, COL.steelSilver);
      pushGeo('metal', uBox, 165.55, 50.6, -24.3, 0, 0, 0, 0.16, 5.1, 1.8, COL.steelSilver);

      // 10 Tall 42U Glowing Blue LED Server Racks (2 rows x 5 cabinets!)
      const rackGeo = makeServerRackBoxGeo(1.15, 2.45, 0.95, 3);
      for (let ri = 0; ri < 5; ri++) {
        const rx = 167.8 + ri * 2.75;
        pushRawGeo('signs', rackGeo.clone().applyMatrix4(makeMatrix4(rx, 49.28, -24.35, 0, 0, 0)));
        pushRawGeo('signs', rackGeo.clone().applyMatrix4(makeMatrix4(rx, 49.28, -20.85, 0, Math.PI, 0)));
        addAABB(rx - 0.6, rx + 0.6, -24.85, -23.85, 50.6, 48.0, 'fib_server_rack');
        addAABB(rx - 0.6, rx + 0.6, -21.35, -20.35, 50.6, 48.0, 'fib_server_rack');
      }
      rackGeo.dispose();
      // Overhead yellow fiber-optic cable tray & ceiling blue glow bar
      pushGeo('emissive', uBox, 173.4, 50.65, -22.6, 0, 0, 0, 13.8, 0.10, 0.35, COL.ledAmber);
      pushGeo('emissive', uBox, 173.4, 53.10, -22.6, 0, 0, 0, 14.2, 0.08, 1.8, COL.ledCyan);

      // 2C. 8 Shatterable Outer Curtain-Wall Glass Panels at y = 48.0..53.4m, Z = -15.78 (1 InstancedMesh!)
      const panelGeo = new THREE.BoxGeometry(5.55, 5.35, 0.10);
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x7de2fc,
        emissive: 0x164e63,
        emissiveIntensity: 0.45,
        roughness: 0.06,
        metalness: 0.35,
        transparent: true,
        opacity: 0.56,
      });
      fibGlassInst = new THREE.InstancedMesh(panelGeo, panelMat, FIB_GLASS_PANEL_XS.length);
      fibGlassInst.name = 'FibBreakableGlassPanels';
      for (let i = 0; i < FIB_GLASS_PANEL_XS.length; i++) {
        const gx = FIB_GLASS_PANEL_XS[i];
        const m = makeMatrix4(gx, 50.68, FIB_GLASS_Z, 0, 0, 0, 1, 1, 1);
        fibGlassInst.setMatrixAt(i, m);
        fibGlassPanels.push({
          index: i,
          x: gx,
          y: 50.68,
          z: FIB_GLASS_Z,
          halfW: 2.8,
          halfH: 2.7,
          broken: false,
        });
      }
      fibGlassInst.instanceMatrix.needsUpdate = true;
      root.add(fibGlassInst);
    }

    // ========================================================================
    // 3. NGÂN HÀNG LIÊN BANG UNION DEPOSITORY ((278, -140), X in [246, 310], Z in [-172, -108])
    //    - Brutalist Concrete & Gunmetal Fortress + Monumental Arched Colonnade
    //    - North Armored-Truck Drive-Through Bay (Z in [-171.5, -160.5])
    //    - SEAMLESS WALK-IN GROUND-LEVEL LOBBY (y = 0.24m) from X = +246 & X = +310
    //    - 3D Circular Brushed-Steel Bank Vault Door at (298, -140)
    // ========================================================================
    {
      // 3A. Seamless Marble Lobby Floor (y = 0.24m) & Ceiling (y = 8.4m)
      pushGeo('marble', uBox, 278.0, 0.12, -140.0, 0, 0, 0, 64.5, 0.24, 64.0, COL.marbleCream);
      pushGeo('concrete', uBox, 278.0, 8.6, -140.0, 0, 0, 0, 64.2, 0.7, 64.0, COL.brutalistConcrete);

      // 3B. Upper Brutalist Stepped Fortress Tower (y = 9.0 -> 46.0m, centered East at X = 285 so zero Casino overlap!)
      pushGeo('concrete', uBox, 285.0, 21.0, -140.0, 0, 0, 0, 48.0, 24.0, 60.0, COL.brutalistConcrete);
      pushRawGeo(
        'curtain',
        makeArchitecturalBoxGeo(44.0, 14.0, 52.0, 4.0, 3.6).applyMatrix4(makeMatrix4(286.0, 40.0, -140.0))
      );
      pushGeo('concrete', uBox, 286.0, 47.4, -140.0, 0, 0, 0, 46.0, 1.2, 54.0, COL.brutalistDark);
      // Brutalist vertical concrete fins
      for (let fz = -166; fz <= -114; fz += 6.5) {
        pushGeo('concrete', uBox, 261.2, 21.0, fz, 0, 0, 0, 1.2, 24.0, 1.1, COL.brutalistDark);
        pushGeo('concrete', uBox, 309.0, 21.0, fz, 0, 0, 0, 1.2, 24.0, 1.1, COL.brutalistDark);
      }
      populateRoofGreebles(286, -140, 40, 46, 48.0, 41, true, true);
      addBeaconSeed(266, 48.0, -164);
      addBeaconSeed(306, 48.0, -116);
      // Solid upper tower AABB (minY = 8.6m so ground lobby & drive-through bay are 100% hollow below!)
      addAABB(261.0, 309.5, -170.0, -110.0, 48.5, 8.6, 'ud_upper_fortress');

      // 3C. Monumental Arched Colonnade Pillars along West (X = 246.6) & East (X = 309.4)
      for (let pz = -170; pz <= -124; pz += 7.5) {
        // Keep Z = -140 West Entrance & Z = -166 Armored Bay wide open!
        if (Math.abs(pz - (-140)) < 5.5 || Math.abs(pz - (-166)) < 4.8) continue;
        pushGeo('concrete', uBox, 246.6, 4.3, pz, 0, 0, 0, 1.35, 8.4, 1.35, COL.brutalistConcrete);
      }
      for (let pz = -170; pz <= -110; pz += 7.5) {
        if (Math.abs(pz - (-140)) < 4.5 || Math.abs(pz - (-166)) < 4.8) continue;
        pushGeo('concrete', uBox, 309.4, 4.3, pz, 0, 0, 0, 1.35, 8.4, 1.35, COL.brutalistConcrete);
        addAABB(308.6, 310.2, pz - 0.7, pz + 0.7, 8.6, 0, 'ud_east_col');
      }

      // UNION DEPOSITORY Fascia Banners (West X = 245.9 centered at Z = -140 & East X = 310.1)
      const udSignW = makeAtlasPlaneGeo(18.0, 3.0, 1);
      udSignW.applyMatrix4(makeMatrix4(245.82, 7.6, -140.0, 0, -Math.PI * 0.5, 0));
      pushRawGeo('signs', udSignW);

      const udSignE = makeAtlasPlaneGeo(18.0, 3.1, 1);
      udSignE.applyMatrix4(makeMatrix4(310.15, 7.6, -140.0, 0, Math.PI * 0.5, 0));
      pushRawGeo('signs', udSignE);

      // 3D. North Armored-Truck Drive-Through Bay (Z in [-171.5, -160.5], X in [246, 310], open West & East!)
      pushGeo('concrete', uBox, 278.0, 0.13, -166.0, 0, 0, 0, 64.0, 0.22, 9.6, COL.graniteDark);
      pushGeo('concrete', uBox, 278.0, 4.3, -171.5, 0, 0, 0, 64.0, 8.4, 1.2, COL.brutalistDark);
      pushGeo('concrete', uBox, 278.0, 4.3, -159.8, 0, 0, 0, 64.0, 8.4, 1.2, COL.brutalistDark);
      addAABB(246.0, 310.0, -172.2, -170.8, 8.6, 0, 'ud_bay_wall_n');
      addAABB(246.0, 310.0, -160.4, -159.2, 8.6, 0, 'ud_bay_wall_s');
      for (let lx = 254; lx <= 302; lx += 12) {
        pushGeo('emissive', uBox, lx, 8.15, -166.0, 0, 0, 0, 3.6, 0.08, 0.65, COL.ledAmber);
      }

      // 3E. SEAMLESS WALK-IN GROUND-LEVEL LOBBY (X in [246, 309], Z in [-159.0, -122.0], y = 0.24m):
      //     Wide Open West Sidewalk Doorway centered at (246, 0.24, -140), Z in [-148.0, -133.0] (15m wide open!)
      //     leading straight East to the 3D Circular Brushed-Steel Bank Vault Door at (298, -140)!
      pushGeo('marble', uBox, 246.6, 4.3, -153.6, 0, 0, 0, 1.2, 8.4, 11.2, COL.marbleWhite);
      pushGeo('marble', uBox, 246.6, 4.3, -127.6, 0, 0, 0, 1.2, 8.4, 10.8, COL.marbleWhite);
      addAABB(246.0, 247.3, -159.4, -148.0, 8.6, 0, 'ud_west_wall_s');
      addAABB(246.0, 247.3, -133.0, -122.0, 8.6, 0, 'ud_west_wall_n');

      // North Perimeter Marble Wall of Tiên Bảo Tổng Khố Lobby (Z = -122.2 for X in [246, 310])
      pushGeo('marble', uBox, 278.0, 4.3, -122.2, 0, 0, 0, 64.0, 8.4, 1.2, COL.marbleWhite);
      addAABB(246.0, 310.0, -122.9, -121.6, 8.6, 0, 'ud_hall_wall_n');
      addAABB(245.5, 273.5, -144.0, -132.0, 58.5, 8.6, 'casino_south_upper_cap');

      // Grand Interior Fluted Marble Columns, Chandeliers & Bulletproof Teller Glass Counters
      for (const cx of [273.5, 281.5, 289.5]) {
        for (const cz of [-152.5, -128.5]) {
          pushGeo('marble', uCyl12, cx, 4.3, cz, 0, 0, 0, 1.15, 8.2, 1.15, COL.marbleWhite);
          pushGeo('metal', uCyl12, cx, 0.44, cz, 0, 0, 0, 1.35, 0.4, 1.35, COL.brassGold);
          addAABB(cx - 0.65, cx + 0.65, cz - 0.65, cz + 0.65, 8.4, 0, 'ud_lobby_col');
        }
        pushGeo('emissive', uBox, cx, 8.15, -140.0, 0, 0, 0, 3.2, 0.10, 6.4, COL.crownWarmGlow);
      }

      // North & South Bulletproof Teller Glass Counters inside Main Hall (X in [272, 290])
      for (const side of [-1, 1]) {
        const tz = side < 0 ? -125.8 : -155.2;
        pushGeo('marble', uBox, 281.0, 0.80, tz, 0, 0, 0, 16.5, 1.12, 1.15, COL.marbleSlate);
        pushGeo('translucent', uBox, 281.0, 2.25, tz, 0, 0, 0, 16.2, 1.8, 0.14, COL.glassCyan);
        for (let mx = 273; mx <= 289; mx += 4.0) {
          pushGeo('metal', uBox, mx, 2.25, tz, 0, 0, 0, 0.16, 1.85, 0.22, COL.brassGold);
        }
        addAABB(272.6, 289.4, tz - 0.65, tz + 0.65, 3.2, 0, 'ud_teller_counter');
      }

      // 3F. Reinforced Vault Bulkhead Wall & 3D Circular Brushed-Steel Bank Vault Door at (298, -140)!
      // Bulkhead side walls flanking the circular vault portal (X = 298.0, portal Z in [-142.3, -137.7])
      pushGeo('metal', uBox, 298.0, 4.3, -150.8, 0, 0, 0, 1.4, 8.4, 17.0, COL.steelDark);
      pushGeo('metal', uBox, 298.0, 4.3, -129.2, 0, 0, 0, 1.4, 8.4, 17.0, COL.steelDark);
      pushGeo('metal', uBox, 298.0, 6.65, -140.0, 0, 0, 0, 1.4, 3.7, 4.8, COL.steelDark);
      // Outer Brushed-Steel Circular Vault Ring Frame
      pushGeo('metal', uCyl20, 297.35, 2.55, -140.0, 0, 0, Math.PI * 0.5, 4.7, 0.45, 4.7, COL.steelSilver);
      addAABB(297.2, 298.8, -159.2, -142.2, 8.6, 0, 'ud_vault_wall_s');
      addAABB(297.2, 298.8, -137.8, -121.8, 8.6, 0, 'ud_vault_wall_n');

      // Visible Gold Bullion & Federal Cash Chamber behind Vault Door (X in [298.8, 306.5], Z in [-145, -135])
      pushGeo('metal', uBox, 306.6, 4.3, -140.0, 0, 0, 0, 0.9, 8.4, 12.0, COL.steelDark);
      addAABB(306.1, 307.2, -146.0, -134.0, 8.6, 0, 'ud_vault_back');
      for (const gz of [-142.2, -140.0, -137.8]) {
        pushGeo('metal', uBox, 303.2, 0.62, gz, 0, 0, 0, 1.8, 0.76, 1.1, COL.brassGold);
        pushGeo('emissive', uBox, 303.2, 1.06, gz, 0, 0, 0, 1.4, 0.18, 0.85, COL.ledAmber);
      }
      pushGeo('emissive', uBox, 302.5, 5.2, -140.0, 0, 0, 0, 3.2, 0.08, 3.2, COL.crownWarmGlow);

      // Articulated 3D Circular Brushed-Steel Bank Vault Door Group (1 merged draw call inside pivot!)
      udVaultPivot = new THREE.Group();
      udVaultPivot.position.set(297.25, 2.55, -138.05); // Hinged on North jamb of (298, -140)
      const vItems = [];
      const addV = (geo, lx, ly, lz, rx, ry, rz, sx, sy, sz, col) => {
        vItems.push({ geo, matrix: makeMatrix4(lx, ly, lz, rx, ry, rz, sx, sy, sz), color: new THREE.Color(col) });
      };
      // Massive 3.9m circular steel vault door leaf centered at local (0, 0, -1.95) -> world (297.25, 2.55, -140.0)
      addV(uCyl20, 0, 0, -1.95, 0, 0, Math.PI * 0.5, 3.95, 0.58, 3.95, COL.steelSilver);
      addV(uCyl20, -0.32, 0, -1.95, 0, 0, Math.PI * 0.5, 2.85, 0.18, 2.85, COL.steelDark);
      addV(uCyl20, -0.44, 0, -1.95, 0, 0, Math.PI * 0.5, 1.35, 0.22, 1.35, COL.brassGold);
      // 12 Radial Chrome Locking Bolts + 3-Spoke Combination Wheel
      for (let b = 0; b < 12; b++) {
        const ba = (b / 12) * TAU;
        addV(uBox, -0.22, Math.sin(ba) * 1.85, -1.95 + Math.cos(ba) * 1.85, ba, 0, 0, 0.18, 0.52, 0.18, COL.steelSilver);
      }
      for (let s = 0; s < 3; s++) {
        const sa = (s / 3) * TAU;
        addV(uBox, -0.56, Math.sin(sa) * 0.55, -1.95 + Math.cos(sa) * 0.55, sa, 0, 0, 0.08, 1.15, 0.08, COL.brassGold);
      }
      // Heavy Geared Hinge Bar at z = 0
      addV(uBox, -0.22, 0, -0.35, 0, 0, 0, 0.28, 2.8, 0.7, COL.steelSilver);

      const vaultDoorGeo = mergeBufferGeometries(vItems);
      const vaultDoorMesh = new THREE.Mesh(vaultDoorGeo, metalMat);
      vaultDoorMesh.castShadow = true;
      udVaultPivot.add(vaultDoorMesh);
      root.add(udVaultPivot);
    }

    // ========================================================================
    // 4. CÔNG TRƯỜNG CAO ỐC ĐANG XÂY DỰNG (High-Rise Construction Site, 35m at (278, +55))
    //    Parcel: X in [248, 308], Z in [25, 85]
    //    - 5 Open Red-Oxide Steel I-Beam Stories (y = 0.25, 7.2, 14.2, 21.2, 28.2, 35.0m)
    //    - Continuous Drivable Wooden Contractor Ramps + Safety Netting + Scaffolding
    //    - Giant 68m Yellow Tower Crane with Slowly Slewing Horizontal Jib & Hanging Steel Girder
    //    - Angled Wooden Rooftop Ngự Phong Phi Độ Ramps launching vehicles Westward across X = +200!
    // ========================================================================
    {
      // North Steel Scaffolding Gantry Annex at Z in [25.5, 31.2] + Overhead Sky-Gantry across Z = +40!
      pushGeo('concrete', uBox, 285.0, 0.13, 28.4, 0, 0, 0, 42.0, 0.25, 5.6, COL.brutalistConcrete);
      for (let gx = 265; gx <= 305; gx += 10) {
        pushGeo('metal', uBox, gx, 7.2, 28.4, 0, 0, 0, 0.52, 14.2, 0.52, COL.redOxideSteel);
        // Overhead structural I-beam sky-bridges at y = 14.2m spanning Z = +40 Avenue (clearance = 13.8m!)
        pushGeo('metal', uBox, gx, 14.2, 39.8, 0, 0, 0, 0.55, 0.72, 22.8, COL.redOxideSteel);
        addAABB(gx - 0.35, gx + 0.35, 28.0, 28.8, 14.2, 0, 'const_gantry_col');
      }

      // Main 5-Story Concrete & Red-Oxide Steel Skeleton (X in [263.5, 306.5], Z in [48.5, 84.5])
      for (let fi = 0; fi < CONST_FLOORS.length; fi++) {
        const fy = CONST_FLOORS[fi];
        if (fi === 0) {
          // Full Ground Concrete Pad
          pushGeo('concrete', uBox, 285.0, 0.125, 66.5, 0, 0, 0, 44.0, 0.25, 36.6, COL.brutalistConcrete);
        } else {
          // Central Deck Slab (X in [271.0, 300.0], Z in [54.5, 77.0] — includes (278, +55) on all 5 upper floors!)
          pushGeo('concrete', uBox, 285.5, fy - 0.18, 65.75, 0, 0, 0, 29.0, 0.36, 22.5, COL.brutalistConcrete);
          if (fi % 2 === 1) {
            // Floors 1, 3, 5 (7.2m, 21.2m, 35.0m): West Turnaround Slab (X in [263.5, 271.0], Z in [48.8, 84.2])
            pushGeo('concrete', uBox, 267.25, fy - 0.18, 66.5, 0, 0, 0, 7.5, 0.36, 35.4, COL.brutalistConcrete);
          } else {
            // Floors 2, 4 (14.2m, 28.2m): East Turnaround Slab (X in [300.0, 306.5], Z in [48.8, 84.2])
            pushGeo('concrete', uBox, 303.25, fy - 0.18, 66.5, 0, 0, 0, 6.5, 0.36, 35.4, COL.brutalistConcrete);
          }
          // Top 35m Deck extra East & North/South steel-decking fill so top roof is wide & heroic!
          if (fi === 5) {
            pushGeo('concrete', uBox, 303.25, fy - 0.18, 65.75, 0, 0, 0, 6.5, 0.36, 22.5, COL.brutalistConcrete);
          }
        }

        // Perimeter Horizontal Red-Oxide I-Beam Girders at each story
        if (fi > 0) {
          pushGeo('metal', uBox, 285.0, fy - 0.42, 48.8, 0, 0, 0, 43.2, 0.48, 0.42, COL.redOxideSteel);
          pushGeo('metal', uBox, 285.0, fy - 0.42, 84.2, 0, 0, 0, 43.2, 0.48, 0.42, COL.redOxideSteel);
          pushGeo('metal', uBox, 263.8, fy - 0.42, 66.5, 0, 0, 0, 0.42, 0.48, 35.6, COL.redOxideSteel);
          pushGeo('metal', uBox, 306.2, fy - 0.42, 66.5, 0, 0, 0, 0.42, 0.48, 35.6, COL.redOxideSteel);
        }
      }

      // Exposed Red-Oxide Vertical Structural Steel H-Columns (placed cleanly outside ramp lanes!)
      const colXs = [263.8, 271.2, 285.5, 299.8, 306.2];
      const colZs = [48.8, 56.2, 76.8, 84.2];
      for (const cx of colXs) {
        for (const cz of colZs) {
          pushGeo('metal', uBox, cx, 17.6, cz, 0, 0, 0, 0.56, 35.2, 0.56, COL.redOxideSteel);
          // Only put solid column AABBs on outer perimeter corners so interior driving is extra forgiving!
          if (cx === 263.8 || cx === 306.2) {
            addAABB(cx - 0.35, cx + 0.35, cz - 0.35, cz + 0.35, 35.5, 0, 'const_steel_col');
          }
        }
      }

      // 5 Drivable Heavy-Timber Wooden Contractor Ramps connecting all 5 stories up to 35.0m!
      // Odd flights (0->1, 2->3, 4->5): North Bay Z in [48.7, 54.4], X: 300.0 -> 271.0
      for (const fl of [0, 2, 4]) {
        const yA = CONST_FLOORS[fl];
        const yB = CONST_FLOORS[fl + 1];
        pushRawGeo('concrete', makeSlopedRampSlabGeo(300.0, 51.55, 271.0, 51.55, 5.7, yA, yB, 0.38), COL.woodPlank);
      }
      // Even flights (1->2, 3->4): South Bay Z in [77.0, 84.0], X: 271.0 -> 300.0
      for (const fl of [1, 3]) {
        const yA = CONST_FLOORS[fl];
        const yB = CONST_FLOORS[fl + 1];
        pushRawGeo('concrete', makeSlopedRampSlabGeo(271.0, 80.5, 300.0, 80.5, 6.8, yA, yB, 0.38), COL.woodPlank);
      }

      // Angled Wooden Rooftop Ngự Phong Phi Độ Ramp #1 (Top 35m Deck: 35.0 -> 38.4m launching West across X = +200!)
      pushRawGeo('concrete', makeSlopedRampSlabGeo(296.0, 66.5, 263.5, 66.5, 7.6, 35.00, 38.40, 0.42), COL.woodPlank);
      pushGeo('emissive', uBox, 264.2, 38.48, 63.0, 0, 0, 0, 1.8, 0.14, 0.25, COL.ledAmber);
      pushGeo('emissive', uBox, 264.2, 38.48, 70.0, 0, 0, 0, 1.8, 0.14, 0.25, COL.ledAmber);

      // Angled Wooden Mid-Deck Ngự Phong Phi Độ Ramp #2 (Floor 2 14.2m -> 17.5m launching West over Freeway!)
      pushRawGeo('concrete', makeSlopedRampSlabGeo(288.0, 59.5, 263.5, 59.5, 5.2, 14.20, 17.50, 0.36), COL.woodPlank);
      pushGeo('emissive', uBox, 264.2, 17.56, 57.1, 0, 0, 0, 1.6, 0.12, 0.22, COL.ledAmber);
      pushGeo('emissive', uBox, 264.2, 17.56, 61.9, 0, 0, 0, 1.6, 0.12, 0.22, COL.ledAmber);

      // Green Translucent Safety Netting & Tubular Steel Scaffolding on Upper Stories
      pushGeo('translucent', uBox, 285.0, 24.5, 48.65, 0, 0, 0, 41.0, 13.0, 0.08, COL.safetyNetGreen);
      pushGeo('translucent', uBox, 285.0, 24.5, 84.35, 0, 0, 0, 41.0, 13.0, 0.08, COL.safetyNetGreen);
      pushGeo('translucent', uBox, 306.35, 24.5, 66.5, 0, 0, 0, 0.08, 13.0, 34.0, COL.safetyNetGreen);

      for (let sy = 3.5; sy <= 28.0; sy += 7.0) {
        pushGeo('metal', uBox, 307.2, sy, 66.5, 0, 0, 0, 1.2, 0.12, 28.0, COL.steelSilver);
      }

      // Construction Danger Signage facing East Boulevard & Z = +40
      const constSignE = makeAtlasPlaneGeo(14.0, 2.5, 5);
      constSignE.applyMatrix4(makeMatrix4(306.8, 5.6, 66.5, 0, Math.PI * 0.5, 0));
      pushRawGeo('signs', constSignE);

      const constSignN = makeAtlasPlaneGeo(14.0, 2.5, 5);
      constSignN.applyMatrix4(makeMatrix4(285.0, 14.3, 28.0, 0, Math.PI, 0));
      pushRawGeo('signs', constSignN);

      // GIANT 68m YELLOW TOWER CRANE at (292.5, 0.25, 66.5)
      const cx = CRANE_BASE.x;
      const cz = CRANE_BASE.z;
      pushGeo('concrete', uBox, cx, 0.75, cz, 0, 0, 0, 5.4, 1.1, 5.4, COL.brutalistDark);
      addAABB(cx - 2.6, cx + 2.6, cz - 2.6, cz + 2.6, 66.5, 0, 'tower_crane_mast');

      // 66.5m Yellow Lattice Mast (4 corner chords + horizontal/diagonal lacing)
      for (const ox of [-1.05, 1.05]) {
        for (const oz of [-1.05, 1.05]) {
          pushGeo('metal', uBox, cx + ox, 33.5, cz + oz, 0, 0, 0, 0.24, 66.0, 0.24, COL.craneYellow);
        }
      }
      for (let my = 3.0; my <= 64.5; my += 3.5) {
        pushGeo('metal', uBox, cx, my, cz - 1.05, 0, 0, 0, 2.2, 0.14, 0.14, COL.craneYellow);
        pushGeo('metal', uBox, cx, my, cz + 1.05, 0, 0, 0, 2.2, 0.14, 0.14, COL.craneYellow);
        pushGeo('metal', uBox, cx - 1.05, my, cz, 0, 0, 0, 0.14, 0.14, 2.2, COL.craneYellow);
        pushGeo('metal', uBox, cx + 1.05, my, cz, 0, 0, 0, 0.14, 0.14, 2.2, COL.craneYellow);
        pushGeo('metal', uBox, cx, my + 1.75, cz - 1.05, 0, 0, 0.68, 3.0, 0.10, 0.10, COL.craneYellow);
        pushGeo('metal', uBox, cx, my + 1.75, cz + 1.05, 0, 0, -0.68, 3.0, 0.10, 0.10, COL.craneYellow);
      }

      // Slewing Upper Crane Jib Group at y = 66.5m (Apex reaches y = 73.5m; 1 single merged draw call!)
      craneSlewGroup = new THREE.Group();
      craneSlewGroup.position.set(cx, CRANE_BASE.jibY, cz);
      const jibItems = [];
      const addJib = (geo, lx, ly, lz, rx, ry, rz, sx, sy, sz, col) => {
        jibItems.push({ geo, matrix: makeMatrix4(lx, ly, lz, rx, ry, rz, sx, sy, sz), color: new THREE.Color(col) });
      };
      // Slewing ring + Operator Cab
      addJib(uCyl12, 0, 0.25, 0, 0, 0, 0, 2.6, 0.6, 2.6, COL.steelDark);
      addJib(uBox, 1.55, 0.85, 1.2, 0, 0, 0, 1.7, 2.1, 2.2, COL.craneYellow);
      addJib(uBox, 2.42, 0.95, 1.2, 0, 0, 0, 0.08, 1.35, 1.8, COL.steelDark);
      // Apex Tower (y = 66.5 -> 73.5m)
      addJib(uBox, 0, 3.5, 0, 0, 0, 0, 1.5, 6.8, 1.5, COL.craneYellow);
      // 46m Horizontal Forward Lattice Jib (-X direction: 0 -> -46m) & 17m Counter-Jib (+X: 0 -> +17m)
      addJib(uBox, -23.0, 1.55, 0, 0, 0, 0, 46.0, 0.24, 0.24, COL.craneYellow);
      addJib(uBox, -23.0, 0.15, -0.85, 0, 0, 0, 46.0, 0.22, 0.22, COL.craneYellow);
      addJib(uBox, -23.0, 0.15, 0.85, 0, 0, 0, 46.0, 0.22, 0.22, COL.craneYellow);
      for (let jx = -44; jx <= -2; jx += 3.5) {
        addJib(uBox, jx, 0.85, -0.42, 0.5, 0, 0, 0.12, 1.65, 0.12, COL.craneYellow);
        addJib(uBox, jx, 0.85, 0.42, -0.5, 0, 0, 0.12, 1.65, 0.12, COL.craneYellow);
      }
      // Counter-jib + 4 Concrete Counterweight Slabs
      addJib(uBox, 8.5, 0.65, 0, 0, 0, 0, 17.0, 0.35, 1.7, COL.craneYellow);
      for (let cw = 0; cw < 4; cw++) {
        addJib(uBox, 12.2 + cw * 1.05, 0.55, 0, 0, 0, 0, 0.88, 2.8, 2.2, COL.brutalistConcrete);
      }
      // Steel Pendant Suspension Cables from Apex (0, 6.8, 0) to Jib (-36, 1.6, 0) & Counter-Jib (+15, 0.8, 0)
      addJib(uBox, -18.0, 4.2, 0, 0, 0, 0.142, 36.4, 0.07, 0.07, COL.steelDark);
      addJib(uBox, 7.5, 3.8, 0, 0, 0, -0.38, 16.2, 0.07, 0.07, COL.steelDark);
      // Trolley at x = -31m + Twin Hoist Cables + Hanging Red-Oxide Steel I-Beam Girder at y = -17.5m (~49m world Y!)
      addJib(uBox, -31.0, -0.15, 0, 0, 0, 0, 1.8, 0.45, 1.9, COL.steelDark);
      addJib(uCyl12, -31.0, -8.8, -0.6, 0, 0, 0, 0.06, 17.2, 0.06, COL.steelDark);
      addJib(uCyl12, -31.0, -8.8, 0.6, 0, 0, 0, 0.06, 17.2, 0.06, COL.steelDark);
      addJib(uBox, -31.0, -17.5, 0, 0, 0, 0, 1.2, 0.65, 1.6, COL.craneYellow); // Hook block
      addJib(uBox, -31.0, -18.6, 0, 0, 0.25, 0, 0.62, 0.82, 11.5, COL.redOxideSteel); // Hanging steel girder!
      addJib(uBox, -31.0, -18.22, 0, 0, 0.25, 0, 1.05, 0.14, 11.5, COL.redOxideSteel);
      addJib(uBox, -31.0, -18.98, 0, 0, 0.25, 0, 1.05, 0.14, 11.5, COL.redOxideSteel);

      const craneSlewMesh = new THREE.Mesh(mergeBufferGeometries(jibItems), metalMat);
      craneSlewMesh.castShadow = true;
      craneSlewGroup.add(craneSlewMesh);
      root.add(craneSlewGroup);
      addBeaconSeed(cx, CRANE_BASE.jibY + 7.0, cz);
    }

    // ========================================================================
    // 5. NHÀ ĐỂ XE ĐA TẦNG (4-Story Multi-Story Parking Garage at (278, +148))
    //    Parcel: X in [248, 308], Z in [118, 178]
    //    Main 4-Story Helical Structure: X in [272.0, 308.0], Z in [128.0, 178.0]
    //    - 4 Full Drivable Decks: y = 0.22m, 4.20m, 8.20m, 12.20m (Open Roof Deck!)
    //    - 3 Continuous Sloped Concrete Ramps (width 8.0m >= 7.5m) with exact 3D cutouts!
    //    - Rooftop Ngự Phong Phi Độ Ramp (y = 12.20 -> 14.80m) aimed West toward neighboring building roof!
    // ========================================================================
    {
      // Ground Forecourt & Entry Aprons (covering full parcel X in [248, 308], Z in [118, 178])
      pushGeo('concrete', uBox, 278.0, 0.11, 152.5, 0, 0, 0, 60.0, 0.22, 51.0, COL.graniteDark);

      // 4 Decks: Deck 0 (0.22m) is paved above; build Decks 1 (4.20m), 2 (8.20m), 3 Roof (12.20m)
      // WITH exact ramp-well cutouts on the East Double-Ramp Core (X in [291.4, 307.6], Z in [140.0, 166.0]):
      //   - West & Central Parking Decks (X in [272.0, 291.4], Z in [128.0, 178.0] — including (278, +148)!) have ALL 4 flat slabs!
      //   - North Turnaround (Z in [128.0, 140.0]) & South Turnaround (Z in [166.0, 178.0]) have ALL 4 flat slabs!
      for (let d = 1; d <= 3; d++) {
        const dy = PG_DECKS[d];
        const slabT = 0.32;
        const slabCenterY = dy - slabT * 0.5;

        // 1) Full West & Central Flat Parking Deck Slab: X in [272.0, 291.4], Z in [128.0, 178.0] (19.4m x 50.0m)
        pushGeo('concrete', uBox, 281.7, slabCenterY, 153.0, 0, 0, 0, 19.4, slabT, 50.0, COL.brutalistConcrete);
        // 2) North Turnaround Slab (East side): X in [291.4, 308.0], Z in [128.0, 140.0] (16.6m x 12.0m)
        pushGeo('concrete', uBox, 299.7, slabCenterY, 134.0, 0, 0, 0, 16.6, slabT, 12.0, COL.brutalistConcrete);
        // 3) South Turnaround Slab (East side): X in [291.4, 308.0], Z in [166.0, 178.0] (16.6m x 12.0m)
        pushGeo('concrete', uBox, 299.7, slabCenterY, 172.0, 0, 0, 0, 16.6, slabT, 12.0, COL.brutalistConcrete);
        // 4) Roof Deck 3 also caps Inner Ramp 2 Bay (X in [291.4, 299.5], Z in [140.0, 166.0], 8.0m above Ramp 2!)
        if (d === 3) {
          pushGeo('concrete', uBox, 295.45, slabCenterY, 153.0, 0, 0, 0, 8.1, slabT, 26.0, COL.brutalistConcrete);
        }

        // Yellow painted parking bay lines on West/Central Flat Deck + ceiling fluorescent lights below!
        for (let pz = 141.5; pz <= 164.5; pz += 3.2) {
          pushGeo('emissive', uBox, 276.5, dy + 0.015, pz, 0, 0, 0, 4.6, 0.02, 0.12, COL.ledAmber);
          pushGeo('emissive', uBox, 286.5, dy + 0.015, pz, 0, 0, 0, 4.6, 0.02, 0.12, COL.ledAmber);
        }
        for (const lz of [134.0, 153.0, 172.0]) {
          pushGeo('emissive', uBox, 283.0, dy - slabT - 0.05, lz, 0, 0, 0, 5.2, 0.06, 0.28, COL.ledWhite);
        }

        // Open-Air Spandrel Parapet Walls (height 1.08m) around each upper deck
        pushGeo('concrete', uBox, 290.0, dy + 0.54, 128.3, 0, 0, 0, 36.0, 1.08, 0.55, COL.graniteLight);
        addAABB(272.0, 308.0, 128.0, 128.65, dy + 1.12, dy - 0.1, 'pg_parapet_n');

        pushGeo('concrete', uBox, 290.0, dy + 0.54, 177.7, 0, 0, 0, 36.0, 1.08, 0.55, COL.graniteLight);
        addAABB(272.0, 308.0, 177.35, 178.0, dy + 1.12, dy - 0.1, 'pg_parapet_s');

        pushGeo('concrete', uBox, 307.7, dy + 0.54, 153.0, 0, 0, 0, 0.55, 1.08, 50.0, COL.graniteLight);
        addAABB(307.35, 308.0, 128.0, 178.0, dy + 1.12, dy - 0.1, 'pg_parapet_e');

        if (d < 3) {
          pushGeo('concrete', uBox, 272.3, dy + 0.54, 153.0, 0, 0, 0, 0.55, 1.08, 50.0, COL.graniteLight);
          addAABB(272.0, 272.65, 128.0, 178.0, dy + 1.12, dy - 0.1, 'pg_parapet_w');
        } else {
          // Leave Z in [130.0, 138.0] OPEN on Roof West Parapet for the Rooftop Ngự Phong Phi Độ Ramp!
          pushGeo('concrete', uBox, 272.3, dy + 0.54, 158.0, 0, 0, 0, 0.55, 1.08, 40.0, COL.graniteLight);
          addAABB(272.0, 272.65, 138.0, 178.0, dy + 1.12, dy - 0.1, 'pg_parapet_w_roof');
        }
      }

      // Ground-Level Perimeter Walls (leaving wide North Z=128, East X=308 Z in [129,140], & West Forecourt open!)
      pushGeo('concrete', uBox, 290.0, 2.1, 177.7, 0, 0, 0, 36.0, 4.0, 0.6, COL.graniteDark);
      addAABB(272.0, 308.0, 177.35, 178.0, 4.2, 0, 'pg_ground_s');
      pushGeo('concrete', uBox, 307.7, 2.1, 159.0, 0, 0, 0, 0.6, 4.0, 38.0, COL.graniteDark);
      addAABB(307.35, 308.0, 140.0, 178.0, 4.2, 0, 'pg_ground_e');

      // Structural Ramp-Well Safety Divider Walls along X = 291.4 and X = 299.5 (Z in [140.4, 165.6])
      pushGeo('concrete', uBox, 291.4, 6.2, 153.0, 0, 0, 0, 0.36, 12.2, 25.0, COL.brutalistDark);
      pushGeo('concrete', uBox, 299.5, 6.7, 153.0, 0, 0, 0, 0.36, 13.2, 25.0, COL.brutalistDark);
      addAABB(291.2, 291.6, 140.4, 165.6, 12.2, 0, 'pg_ramp_wall_inner');
      addAABB(299.3, 299.7, 140.4, 165.6, 13.3, 0, 'pg_ramp_wall_mid');

      for (const cx of [272.4, 291.4, 299.5, 307.6]) {
        for (const cz of [128.4, 140.2, 165.8, 177.6]) {
          pushGeo('concrete', uBox, cx, 6.2, cz, 0, 0, 0, 0.80, 12.4, 0.80, COL.graniteLight);
        }
      }

      // 3 Smooth Continuous Sloped Concrete Ramps (7.8m wide >= 7.5m!):
      // Ramp 1 (0.22 -> 4.20m): Outer East Bay X in [299.7, 307.5], Z: 140.0 -> 166.0
      pushRawGeo('concrete', makeSlopedRampSlabGeo(303.6, PG_RAMP_Z_NORTH, 303.6, PG_RAMP_Z_SOUTH, 7.8, PG_DECKS[0], PG_DECKS[1], 0.34), COL.graniteMed);
      // Ramp 2 (4.20 -> 8.20m): Inner Ramp Bay X in [291.6, 299.3], Z: 166.0 -> 140.0
      pushRawGeo('concrete', makeSlopedRampSlabGeo(295.45, PG_RAMP_Z_SOUTH, 295.45, PG_RAMP_Z_NORTH, 7.7, PG_DECKS[1], PG_DECKS[2], 0.34), COL.graniteMed);
      // Ramp 3 (8.20 -> 12.20m): Outer East Bay X in [299.7, 307.5], Z: 140.0 -> 166.0
      pushRawGeo('concrete', makeSlopedRampSlabGeo(303.6, PG_RAMP_Z_NORTH, 303.6, PG_RAMP_Z_SOUTH, 7.8, PG_DECKS[2], PG_DECKS[3], 0.34), COL.graniteMed);

      // Rooftop Ngự Phong Phi Độ Ramp on 12.20m Open Roof Deck (y = 12.20 -> 14.80m, X: 294.0 -> 273.0, Z in [130.5, 137.5])!
      pushRawGeo('concrete', makeSlopedRampSlabGeo(294.0, 134.0, 273.0, 134.0, 7.0, 12.20, 14.80, 0.38), COL.woodPlank);
      // Side guide curbs & glowing neon stunt strips along rooftop ramp
      pushRawGeo('emissive', makeSlopedRampSlabGeo(294.0, 130.45, 273.0, 130.45, 0.25, 12.32, 14.92, 0.16), COL.ledCyan);
      pushRawGeo('emissive', makeSlopedRampSlabGeo(294.0, 137.55, 273.0, 137.55, 0.25, 12.32, 14.92, 0.16), COL.ledCyan);

      // Parking Garage Signage (North Z = 127.9 & East X = 308.1)
      const pgSignN = makeAtlasPlaneGeo(15.0, 2.6, 4);
      pgSignN.applyMatrix4(makeMatrix4(290.0, 6.2, 127.85, 0, Math.PI, 0));
      pushRawGeo('signs', pgSignN);

      const pgSignE = makeAtlasPlaneGeo(15.0, 2.6, 4);
      pgSignE.applyMatrix4(makeMatrix4(308.15, 6.2, 140.0, 0, Math.PI * 0.5, 0));
      pushRawGeo('signs', pgSignE);
    }

    // ========================================================================
    // 6. FLUSH ALL STATIC MERGED MESHES (8 Static Draw Calls!)
    // ========================================================================
    const bucketSpecs = [
      { key: 'concrete', mat: concreteMat, cast: true, receive: true },
      { key: 'marble', mat: marbleMat, cast: false, receive: true },
      { key: 'metal', mat: metalMat, cast: true, receive: true },
      { key: 'road', mat: roadMat, cast: false, receive: true },
      { key: 'curtain', mat: parallaxMatRef, cast: true, receive: true },
      { key: 'emissive', mat: emissiveGlowMatRef, cast: false, receive: false },
      { key: 'signs', mat: signAtlasMatRef, cast: false, receive: false },
      { key: 'translucent', mat: translucentMat, cast: false, receive: false },
    ];

    for (const sp of bucketSpecs) {
      const merged = mergeBufferGeometries(buckets[sp.key]);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, sp.mat);
      mesh.name = `DtBatch_${sp.key}`;
      mesh.castShadow = sp.cast;
      mesh.receiveShadow = sp.receive;
      root.add(mesh);
    }

    // ========================================================================
    // 7. BUILD 4 BATCHED INSTANCEDMESHES FOR ROOFTOP GREEBLES (4 Draw Calls!)
    // ========================================================================
    {
      // 7A. HVAC Chiller Units (compound unit mesh: cabinet + 2 top fan shrouds)
      const hvacGeo = mergeBufferGeometries([
        { geo: uBox, matrix: makeMatrix4(0, 0.95, 0, 0, 0, 0, 4.2, 1.9, 2.6), color: new THREE.Color(0xb8c2cc) },
        { geo: uCyl12, matrix: makeMatrix4(-1.05, 2.02, 0, 0, 0, 0, 1.3, 0.26, 1.3), color: new THREE.Color(0x27303d) },
        { geo: uCyl12, matrix: makeMatrix4(1.05, 2.02, 0, 0, 0, 0, 1.3, 0.26, 1.3), color: new THREE.Color(0x27303d) },
      ]);
      const hvacInst = new THREE.InstancedMesh(hvacGeo, metalMat, Math.max(1, hvacSeeds.length));
      for (let i = 0; i < hvacSeeds.length; i++) {
        const s = hvacSeeds[i];
        hvacInst.setMatrixAt(i, makeMatrix4(s.x, s.y, s.z, 0, s.yaw, 0, s.scale, s.scale, s.scale));
      }
      hvacInst.instanceMatrix.needsUpdate = true;
      root.add(hvacInst);

      // 7B. L-Shaped Silver Galvanized Rooftop Air Ducts
      const ductGeo = mergeBufferGeometries([
        { geo: uBox, matrix: makeMatrix4(0, 0.65, 0, 0, 0, 0, 4.8, 0.85, 0.95), color: new THREE.Color(0xd1d8e0) },
        { geo: uBox, matrix: makeMatrix4(1.92, 0.65, 1.85, 0, 0, 0, 0.95, 0.85, 2.8), color: new THREE.Color(0xc5cdd6) },
        { geo: uBox, matrix: makeMatrix4(-1.6, 0.22, 0, 0, 0, 0, 0.16, 0.45, 1.05), color: new THREE.Color(0x334155) },
        { geo: uBox, matrix: makeMatrix4(1.6, 0.22, 0, 0, 0, 0, 0.16, 0.45, 1.05), color: new THREE.Color(0x334155) },
      ]);
      const ductInst = new THREE.InstancedMesh(ductGeo, metalMat, Math.max(1, ductSeeds.length));
      for (let i = 0; i < ductSeeds.length; i++) {
        const s = ductSeeds[i];
        ductInst.setMatrixAt(i, makeMatrix4(s.x, s.y, s.z, 0, s.yaw, 0, s.scale, s.scale, s.scale));
      }
      ductInst.instanceMatrix.needsUpdate = true;
      root.add(ductInst);

      // 7C. Elevated Rooftop Water Tanks on 4 Steel Truss Legs
      const tankGeo = mergeBufferGeometries([
        { geo: uBox, matrix: makeMatrix4(-0.95, 1.25, -0.95, 0, 0, 0, 0.18, 2.5, 0.18), color: new THREE.Color(0x334155) },
        { geo: uBox, matrix: makeMatrix4(0.95, 1.25, -0.95, 0, 0, 0, 0.18, 2.5, 0.18), color: new THREE.Color(0x334155) },
        { geo: uBox, matrix: makeMatrix4(-0.95, 1.25, 0.95, 0, 0, 0, 0.18, 2.5, 0.18), color: new THREE.Color(0x334155) },
        { geo: uBox, matrix: makeMatrix4(0.95, 1.25, 0.95, 0, 0, 0, 0.18, 2.5, 0.18), color: new THREE.Color(0x334155) },
        { geo: uCyl12, matrix: makeMatrix4(0, 3.95, 0, 0, 0, 0, 3.0, 3.0, 3.0), color: new THREE.Color(0x9a6b44) },
        { geo: new THREE.ConeGeometry(1.65, 0.95, 12), matrix: makeMatrix4(0, 5.9, 0, 0, 0, 0, 1, 1, 1), color: new THREE.Color(0x475569) },
      ]);
      const tankInst = new THREE.InstancedMesh(tankGeo, concreteMat, Math.max(1, waterTankSeeds.length));
      for (let i = 0; i < waterTankSeeds.length; i++) {
        const s = waterTankSeeds[i];
        tankInst.setMatrixAt(i, makeMatrix4(s.x, s.y, s.z, 0, s.yaw, 0, 1, 1, 1));
        tankInst.setColorAt(i, new THREE.Color(s.isWood ? 0xffffff : 0xcbd5e1));
      }
      tankInst.instanceMatrix.needsUpdate = true;
      if (tankInst.instanceColor) tankInst.instanceColor.needsUpdate = true;
      root.add(tankInst);

      // 7D. Telecom Cell / Microwave Lattice Towers
      const teleGeo = mergeBufferGeometries([
        { geo: new THREE.CylinderGeometry(0.18, 0.85, 8.5, 4), matrix: makeMatrix4(0, 4.25, 0, 0, Math.PI / 4, 0, 1, 1, 1), color: new THREE.Color(0xcbd5e1) },
        { geo: uBox, matrix: makeMatrix4(0, 6.8, 0, 0, 0, 0, 2.2, 0.14, 2.2), color: new THREE.Color(0x94a3b8) },
        { geo: uBox, matrix: makeMatrix4(0, 7.2, 1.15, 0, 0, 0, 0.32, 1.5, 0.16), color: new THREE.Color(0xf8fafc) },
        { geo: uBox, matrix: makeMatrix4(1.15, 7.2, 0, 0, 0, 0, 0.16, 1.5, 0.32), color: new THREE.Color(0xf8fafc) },
        { geo: uBox, matrix: makeMatrix4(-1.15, 7.2, 0, 0, 0, 0, 0.16, 1.5, 0.32), color: new THREE.Color(0xf8fafc) },
        { geo: uCyl12, matrix: makeMatrix4(0, 9.6, 0, 0, 0, 0, 0.08, 2.4, 0.08), color: new THREE.Color(0xe2e8f0) },
      ]);
      const teleInst = new THREE.InstancedMesh(teleGeo, metalMat, Math.max(1, telecomSeeds.length));
      for (let i = 0; i < telecomSeeds.length; i++) {
        const s = telecomSeeds[i];
        teleInst.setMatrixAt(i, makeMatrix4(s.x, s.y, s.z, 0, s.yaw, 0, s.scale, s.scale, s.scale));
      }
      teleInst.instanceMatrix.needsUpdate = true;
      root.add(teleInst);
    }

    // ========================================================================
    // 8. SINGLE POOLED DYNAMIC INSTANCEDMESH FOR BEACONS, FOUNTAIN JETS,
    //    METAL-DETECTOR LEDS, ELEVATOR CORONAS & 3D GLASS SHARDS (1 Draw Call!)
    // ========================================================================
    {
      const totalAnimCount =
        beaconIndices.length +
        fountainJetDrops.length +
        fibDetectorBarIndices.length +
        coronaRingEntries.length +
        MAX_GLASS_SHARDS;

      const shardOctaGeo = new THREE.OctahedronGeometry(0.5, 0);
      const animMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      animPropsInst = new THREE.InstancedMesh(shardOctaGeo, animMat, totalAnimCount);
      animPropsInst.name = 'DtDynamicPropsAndShards';
      animPropsInst.frustumCulled = false;

      let cursor = 0;
      for (let i = 0; i < beaconIndices.length; i++) {
        const b = beaconIndices[i];
        b.slot = cursor++;
        animPropsInst.setMatrixAt(b.slot, makeMatrix4(b.x, b.y, b.z, 0, 0, 0, 0.68, 0.68, 0.68));
        animPropsInst.setColorAt(b.slot, new THREE.Color(0xff1e26));
      }
      for (let i = 0; i < fountainJetDrops.length; i++) {
        const fd = fountainJetDrops[i];
        fd.slot = cursor++;
        animPropsInst.setMatrixAt(fd.slot, makeMatrix4(MAZE_FOUNTAIN_POS.x, 1.2, MAZE_FOUNTAIN_POS.z, 0, 0, 0, 0.25, 0.45, 0.25));
        animPropsInst.setColorAt(fd.slot, new THREE.Color(0xdbeafe));
      }
      for (let i = 0; i < fibDetectorBarIndices.length; i++) {
        const db = fibDetectorBarIndices[i];
        db.slot = cursor++;
        animPropsInst.setMatrixAt(db.slot, makeMatrix4(db.x, db.y, db.z, 0, 0, 0, 0.14, 2.1, 0.14));
        animPropsInst.setColorAt(db.slot, new THREE.Color(0x10f58c));
      }
      for (let i = 0; i < coronaRingEntries.length; i++) {
        const cr = coronaRingEntries[i];
        cr.slot = cursor++;
        animPropsInst.setMatrixAt(cr.slot, makeMatrix4(cr.x, cr.y + 0.85, cr.z, 0, 0, 0, cr.radius * 1.15, 1.45, cr.radius * 1.15));
        animPropsInst.setColorAt(cr.slot, new THREE.Color(cr.color));
      }
      for (let i = 0; i < MAX_GLASS_SHARDS; i++) {
        const slot = cursor++;
        glassShards.push({
          slot,
          active: false,
          x: 0, y: -999, z: 0,
          vx: 0, vy: 0, vz: 0,
          rx: 0, ry: 0, rz: 0,
          age: 0, life: 1.6,
        });
        animPropsInst.setMatrixAt(slot, makeMatrix4(0, -999, 0, 0, 0, 0, 0.001, 0.001, 0.001));
        animPropsInst.setColorAt(slot, new THREE.Color(0xbaf2ff));
      }

      animPropsInst.instanceMatrix.needsUpdate = true;
      if (animPropsInst.instanceColor) animPropsInst.instanceColor.needsUpdate = true;
      root.add(animPropsInst);
    }

    uBox.dispose();
    uCyl12.dispose();
    uCyl20.dispose();
    uPlane.dispose();

    if (scene && root.parent !== scene) {
      scene.add(root);
    }
  }

  // ==========================================================================
  // Spawn Parked Sports Cars in 4-Story Garage & Armored Van at Tiên Bảo Tổng Khố
  // ==========================================================================
  function ensureParkedDistrictVehicles() {
    if (vehiclesSpawned || !activeCtx?.vehicles || typeof activeCtx.vehicles.spawnVehicle !== 'function') {
      return;
    }
    vehiclesSpawned = true;
    const specs = [
      // Tiên Bảo Tổng Khố North Armored-Truck Bay
      { type: 'swat_van', x: 282.0, y: 0.28, z: -166.0, yaw: Math.PI * 0.5, color: 0x1e3a2f },
      // 4-Story Multi-Story Parking Garage Parked Sports Cars!
      { type: 'obey9f', x: 277.5, y: 4.25, z: 149.9, yaw: Math.PI * 0.5, color: 0xef4444 },
      { type: 'banshee', x: 286.5, y: 8.25, z: 156.3, yaw: -Math.PI * 0.5, color: 0x3b82f6 },
      { type: 'zentorno', x: 297.5, y: 12.26, z: 134.0, yaw: -Math.PI * 0.5, color: 0xfacc15 },
    ];
    for (const sp of specs) {
      try {
        activeCtx.vehicles.spawnVehicle(sp.type, sp.x, sp.y, sp.z, sp.yaw, {
          isParked: true,
          aiControlled: false,
          hasAIDriver: false,
          color: sp.color,
        });
      } catch (_) {}
    }
  }

  // ==========================================================================
  // Shatterable FIB 48m Outer Glass Panels + Projectile Hit Handler
  // ==========================================================================
  function shatterFibPanel(panel, dirX = 0, dirZ = 1) {
    if (!panel || panel.broken || !fibGlassInst || !animPropsInst) return false;
    panel.broken = true;
    fibGlassInst.setMatrixAt(panel.index, makeMatrix4(panel.x, -999, panel.z, 0, 0, 0, 0.001, 0.001, 0.001));
    fibGlassInst.instanceMatrix.needsUpdate = true;

    for (let k = 0; k < 28; k++) {
      const sh = glassShards[shardCursor];
      shardCursor = (shardCursor + 1) % MAX_GLASS_SHARDS;
      sh.active = true;
      sh.age = 0;
      sh.life = 2.4 + (k % 5) * 0.35;
      sh.x = panel.x + ((k % 7) - 3) * 0.72;
      sh.y = panel.y + (Math.floor(k / 7) - 1.5) * 1.15;
      sh.z = panel.z;
      sh.vx = dirX * 4.5 + (Math.random() - 0.5) * 6.5;
      sh.vy = 1.5 + Math.random() * 4.5;
      sh.vz = (dirZ >= 0 ? 1 : -1) * (3.5 + Math.random() * 6.5);
      sh.rx = Math.random() * 6;
      sh.ry = Math.random() * 6;
      sh.rz = Math.random() * 6;
    }

    if (activeCtx?.audio?.playGlassShatter) activeCtx.audio.playGlassShatter();
    else playLocalTone(1950, 320, 0.22, 'sawtooth', 0.09);
    activeCtx?.characters?.spawnParticles?.(panel.x, panel.y, panel.z, 'glass', 14, 7.0);
    return true;
  }

  function onProjectileHit(hx, hy, hz, _isPlayer, ctxArg) {
    if (ctxArg && typeof ctxArg === 'object') activeCtx = ctxArg;
    if (!Number.isFinite(hx) || !Number.isFinite(hy) || !Number.isFinite(hz)) return false;

    // Check FIB y = 48m Executive Shatterable Outer Glass Panels along Z = -15.78
    if (hy >= 47.4 && hy <= 53.8 && Math.abs(hz - FIB_GLASS_Z) <= 2.6 && hx >= 135.5 && hx <= 184.5) {
      let brokeAny = false;
      for (let i = 0; i < fibGlassPanels.length; i++) {
        const pn = fibGlassPanels[i];
        if (!pn.broken && Math.abs(hx - pn.x) <= pn.halfW + 0.5) {
          if (shatterFibPanel(pn, 0, 1)) brokeAny = true;
        }
      }
      return brokeAny;
    }
    return false;
  }

  // ==========================================================================
  // Exact Multi-Elevation & Ceiling Height Engine: getElevation(x, z, currentY)
  // ==========================================================================
  function inferRefY(x, z, currentY) {
    if (typeof currentY === 'number' && Number.isFinite(currentY)) return currentY;
    const p = activeCtx?.player;
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      const car = p.inCar && typeof p.inCar === 'object' ? p.inCar : null;
      if (car && Math.abs(x - car.x) <= 5.0 && Math.abs(z - car.z) <= 5.0) return car.y;
      if (!car && Math.abs(x - p.x) <= 3.5 && Math.abs(z - p.z) <= 3.5) return p.y;
    }
    return undefined;
  }

  function pickHighestValidSurface(candidates, refY, maxStepUp = 2.4) {
    let best = null;
    if (refY === undefined) {
      // Default to lowest (ground) surface when no altitude context is given
      for (let i = 0; i < candidates.length; i++) {
        if (best === null || candidates[i] < best) best = candidates[i];
      }
      return best;
    }
    const ceilingLimit = refY + maxStepUp;
    for (let i = 0; i < candidates.length; i++) {
      const cy = candidates[i];
      if (cy <= ceilingLimit && (best === null || cy > best)) {
        best = cy;
      }
    }
    // Fallback to lowest surface if entity dropped slightly below ground
    if (best === null && candidates.length > 0) {
      best = candidates[0];
    }
    return best;
  }

  function getElevation(x, z, currentY) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    const refY = inferRefY(x, z, currentY);

    // 1. FIB Tower Seamless Ground Security Atrium & 48m Executive Server Floor ((160, -40))
    if (x >= 147.6 && x <= 172.4 && z >= -18.0 && z <= -9.6) {
      if (refY === undefined || refY < 6.5) return 0.24;
    }
    if (x >= 136.0 && x <= 184.0 && z >= -25.6 && z <= -15.4) {
      if (refY !== undefined && refY >= 44.0 && refY < 62.0) return FIB_EXEC_Y;
    }

    // 2. 4-Story Multi-Story Parking Garage (X in [272.0, 308.0], Z in [128.0, 178.0])
    //    CRITICAL: Computes exact slab & continuous 7.8m-wide ramp height based on (x, z) AND currentY,
    //    returning the highest floor/ramp <= currentY + 2.4!
    if (x >= PG_MIN_X && x <= PG_MAX_X && z >= PG_MIN_Z && z <= PG_MAX_Z) {
      const cands = [];

      if (z < PG_RAMP_Z_NORTH || z > PG_RAMP_Z_SOUTH || x <= PG_FLAT_DECK_MAX_X) {
        // West & Central Flat Decks (including (278, +148)!), North Turnaround, & South Turnaround -> all 4 flat decks!
        cands.push(PG_DECKS[0], PG_DECKS[1], PG_DECKS[2], PG_DECKS[3]);
      } else if (x > PG_MID_RAMP_MAX_X) {
        // Outer East Ramp Bay (X in [299.5, 308.0], Z: 140.0 -> 166.0): Ramp 1 (0.22 -> 4.20m) & Ramp 3 (8.20 -> 12.20m)
        const t = clamp((z - PG_RAMP_Z_NORTH) / (PG_RAMP_Z_SOUTH - PG_RAMP_Z_NORTH), 0, 1);
        cands.push(
          lerp(PG_DECKS[0], PG_DECKS[1], t),
          lerp(PG_DECKS[2], PG_DECKS[3], t)
        );
      } else {
        // Inner Ramp Bay (X in [291.4, 299.5], Z: 166.0 -> 140.0): Ground Deck 0 (0.22m), Ramp 2 (4.20 -> 8.20m), & Roof Deck 3 (12.20m)
        const u = clamp((PG_RAMP_Z_SOUTH - z) / (PG_RAMP_Z_SOUTH - PG_RAMP_Z_NORTH), 0, 1);
        cands.push(
          PG_DECKS[0],
          lerp(PG_DECKS[1], PG_DECKS[2], u),
          PG_DECKS[3]
        );
      }

      // Rooftop Ngự Phong Phi Độ Ramp on 12.20m Open Roof Deck (X: 294.0 -> 273.0, Z in [130.5, 137.5], y = 12.20 -> 14.80m)
      if (x >= 272.5 && x <= 294.2 && z >= 130.5 && z <= 137.5) {
        if (refY !== undefined && refY >= 10.6) {
          const rT = clamp((294.0 - x) / 21.0, 0, 1);
          cands.push(lerp(12.20, 14.80, rT));
        }
      }

      return pickHighestValidSurface(cands, refY, 2.4);
    }

    // Smooth Driveway Aprons into Parking Garage (North Z in [126, 128] & East X in [308, 310.2])
    if (x >= 273.0 && x <= 307.0 && z >= 126.0 && z < 128.0 && (refY === undefined || refY < 3.0)) {
      return lerp(ROAD_Y, PG_DECKS[0], clamp((z - 126.0) / 2.0, 0, 1));
    }
    if (x > 308.0 && x <= 310.2 && z >= 129.0 && z <= 141.0 && (refY === undefined || refY < 3.0)) {
      return lerp(PG_DECKS[0], ROAD_Y, clamp((x - 308.0) / 2.2, 0, 1));
    }

    // 3. High-Rise Construction Site (35m, 5 Open Stories + Wooden Contractor Ramps + Stunt Ramps)
    if (x >= CONST_SKEL_MIN_X && x <= CONST_SKEL_MAX_X && z >= CONST_SKEL_MIN_Z && z <= CONST_SKEL_MAX_Z) {
      const cands = [CONST_FLOORS[0]];

      if (z >= 48.7 && z <= 54.4 && x >= 271.0 && x <= 300.0) {
        // North Wooden Contractor Ramps (X: 300 -> 271): Flights 0->1, 2->3, 4->5
        const t = clamp((300.0 - x) / 29.0, 0, 1);
        cands.push(
          lerp(CONST_FLOORS[0], CONST_FLOORS[1], t),
          lerp(CONST_FLOORS[2], CONST_FLOORS[3], t),
          lerp(CONST_FLOORS[4], CONST_FLOORS[5], t)
        );
      } else if (z >= 77.0 && z <= 84.0 && x >= 271.0 && x <= 300.0) {
        // South Wooden Contractor Ramps (X: 271 -> 300): Flights 1->2, 3->4
        const t = clamp((x - 271.0) / 29.0, 0, 1);
        cands.push(
          lerp(CONST_FLOORS[1], CONST_FLOORS[2], t),
          lerp(CONST_FLOORS[3], CONST_FLOORS[4], t)
        );
      } else if (x < 271.0) {
        // West Turnaround Slabs (Floors 1, 3, 5)
        cands.push(CONST_FLOORS[1], CONST_FLOORS[3], CONST_FLOORS[5]);
      } else if (x > 300.0) {
        // East Turnaround Slabs (Floors 2, 4, and central 5)
        cands.push(CONST_FLOORS[2], CONST_FLOORS[4]);
        if (z >= 54.5 && z <= 77.0) cands.push(CONST_FLOORS[5]);
      } else {
        // Central Concrete Floor Slabs (all 5 stories, including (278, +55)!)
        for (let fi = 1; fi < CONST_FLOORS.length; fi++) cands.push(CONST_FLOORS[fi]);
      }

      // Top 35m Wooden Rooftop Ngự Phong Phi Độ Ramp (35.0 -> 38.4m, X: 296 -> 263.5, Z in [62.5, 70.5])
      if (z >= 62.5 && z <= 70.5 && x >= 263.5 && x <= 296.0 && refY !== undefined && refY >= 33.2) {
        const jt = clamp((296.0 - x) / 32.5, 0, 1);
        cands.push(lerp(35.00, 38.40, jt));
      }
      // Mid-Deck 14.2m Wooden Ngự Phong Phi Độ Ramp (14.2 -> 17.5m, X: 288 -> 263.5, Z in [56.8, 62.2])
      if (z >= 56.8 && z <= 62.2 && x >= 263.5 && x <= 288.0 && refY !== undefined && refY >= 12.6 && refY < 19.5) {
        const jt = clamp((288.0 - x) / 24.5, 0, 1);
        cands.push(lerp(14.20, 17.50, jt));
      }

      return pickHighestValidSurface(cands, refY, 2.4);
    }

    // 4. Maze Bank Supertall (120m Helipad Roof + Seamless Ground Marble Lobby + Sunken Fountain Plaza)
    if (x >= 236.0 && x <= 308.0 && z >= -70.0 && z <= -10.0) {
      // 120.22m Rooftop Helipad Deck
      if (Math.hypot(x - MAZE_CENTER_X, z - MAZE_CENTER_Z) <= 15.2 && refY !== undefined && refY >= 102.0) {
        return MAZE_ROOF_Y;
      }
      // Sunken Granite Fountain Basin at (244, -40)
      if (Math.hypot(x - MAZE_FOUNTAIN_POS.x, z - MAZE_FOUNTAIN_POS.z) <= 7.1 && (refY === undefined || refY < 4.5)) {
        return 0.14;
      }
      if (x >= 249.0 && x <= 268.0 && z >= -51.0 && z <= -29.0 && (refY === undefined || refY < 6.0)) {
        return 0.23; // Seamless Ground Marble Lobby!
      }
      if (refY === undefined || refY < 6.0) {
        return SIDEWALK_Y;
      }
    }

    // 5. Tiên Bảo Tổng Khố Seamless Walk-In Lobby & Armored Drive-Through Bay ((278, -140))
    if (x >= UD_MIN_X && x <= UD_MAX_X && z >= UD_MIN_Z && z <= UD_MAX_Z) {
      if (refY !== undefined && refY >= 44.0) return 48.0;
      if (refY === undefined || refY < 6.5) return UD_LOBBY_Y;
    }

    // 6. East Downtown Boulevard (X = +320) & Connecting East-West Avenues (X >= 246)
    if (x >= 246.0 && x <= 386.0 && z >= -225.0 && z <= 225.0) {
      // Don't override Elevated Freeway (y = 12.5m) when entity is up on the highway!
      if (refY !== undefined && refY >= 4.5 && x <= 272.0) return null;

      const onBlvd = Math.abs(x - EAST_BLVD_X) <= EAST_BLVD_HALF_W && z >= -216.0 && z <= 216.0;
      const onCrossSt =
        x <= 330.0 && (
          Math.abs(z - (-200)) <= STD_HALF_W ||
          (x >= 306.0 && Math.abs(z - (-120)) <= STD_HALF_W) ||
          (x >= 306.0 && Math.abs(z - (-40)) <= STD_HALF_W) ||
          Math.abs(z - 40) <= STD_HALF_W ||
          Math.abs(z - 120) <= STD_HALF_W ||
          Math.abs(z - 200) <= STD_HALF_W
        );
      if (onBlvd || onCrossSt) return ROAD_Y;
      return SIDEWALK_Y;
    }

    return null;
  }

  function getCeilingHeight(x, z, currentY) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    const refY = inferRefY(x, z, currentY) ?? 0.22;

    // 1. Multi-Story Parking Garage Decks 0, 1, 2 (Roof Deck 3 at 12.20m is open sky -> null!)
    if (x >= PG_MIN_X && x <= PG_MAX_X && z >= PG_MIN_Z && z <= PG_MAX_Z) {
      if (refY >= 10.8) return null; // On open roof deck or rooftop ramp
      const inRampZ = z >= PG_RAMP_Z_NORTH && z <= PG_RAMP_Z_SOUTH;
      if (inRampZ && x > PG_MID_RAMP_MAX_X) {
        const t = clamp((z - PG_RAMP_Z_NORTH) / (PG_RAMP_Z_SOUTH - PG_RAMP_Z_NORTH), 0, 1);
        const r1 = lerp(PG_DECKS[0], PG_DECKS[1], t);
        if (refY < r1 + 4.5) return lerp(PG_DECKS[2], PG_DECKS[3], t) - 0.34;
        return null; // Ramp 3 is open to sky!
      }
      if (inRampZ && x > PG_FLAT_DECK_MAX_X && x <= PG_MID_RAMP_MAX_X) {
        const u = clamp((PG_RAMP_Z_SOUTH - z) / (PG_RAMP_Z_SOUTH - PG_RAMP_Z_NORTH), 0, 1);
        const r2 = lerp(PG_DECKS[1], PG_DECKS[2], u);
        if (refY < 2.8) return r2 - 0.34;
        return PG_DECKS[3] - 0.34;
      }
      if (refY < 2.8) return PG_DECKS[1] - 0.34;
      if (refY < 6.8) return PG_DECKS[2] - 0.34;
      if (refY < 10.8) return PG_DECKS[3] - 0.34;
      return null;
    }

    // 2. FIB Ground Security Atrium
    if (x >= 148.0 && x <= 172.0 && z >= -18.0 && z <= -9.8 && refY < 5.9) {
      return 5.95;
    }

    // 3. Maze Bank Seamless Marble Lobby
    if (x >= 249.5 && x <= 267.5 && z >= -51.0 && z <= -29.0 && refY < 8.4) {
      return 8.55;
    }

    // 4. Tiên Bảo Tổng Khố Seamless Walk-In Lobby & Armored Bay
    if (x >= UD_MIN_X && x <= UD_MAX_X && z >= UD_MIN_Z && z <= -122.0 && refY < 8.1) {
      return 8.20;
    }

    return null;
  }

  function getZoneInfo(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    if (x >= 238.0 && x <= 308.0 && z >= -70.0 && z <= -10.0) {
      return { streetName: 'Quảng Trường Đài Phun Nước • Đường Alta', zoneName: 'Tháp Maze Bank (120m) • Linh Đan Đỉnh' };
    }
    if (x >= UD_MIN_X && x <= UD_MAX_X && z >= UD_MIN_Z && z <= UD_MAX_Z) {
      return { streetName: 'Đại Sảnh Dự Trữ Vàng Liên Bang', zoneName: 'Ngân Hàng Tiên Bảo Tổng Khố • Downtown' };
    }
    if (x >= 248.0 && x <= 308.0 && z >= 25.0 && z <= 85.0) {
      return { streetName: 'Đại Lộ San Andreas • Cần Cẩu 68m', zoneName: 'Công Trường Cao Ốc Mile High (35m)' };
    }
    if (x >= 248.0 && x <= 308.0 && z >= 118.0 && z <= 178.0) {
      return { streetName: 'Đường Olympic • Đại Lộ Đông', zoneName: 'Nhà Để Xe Đa Tầng Downtown (4 Tầng)' };
    }
    if (x >= 147.5 && x <= 172.5 && z >= -25.5 && z <= -9.5) {
      return { streetName: 'Sảnh Kiểm Soát An Ninh & Tầng Server 48', zoneName: 'Tháp FIB Trung Tâm • Downtown' };
    }
    if (x >= 246.0 && x <= 386.0 && z >= -225.0 && z <= 225.0) {
      return { streetName: 'Đại Lộ Tài Chính Đông (X = +320)', zoneName: 'Trung Tâm Tài Chính & Lõi Cao Ốc Downtown' };
    }
    return null;
  }

  // ==========================================================================
  // Init & Per-Frame Update Loop
  // ==========================================================================
  function init(ctxArg) {
    if (ctxArg && typeof ctxArg === 'object') activeCtx = ctxArg;
    const scene = activeCtx?.engine?.scene || activeCtx?.scene || null;
    if (!initialized) {
      initialized = true;
      buildRoadGraphAndMinimap();
      buildDistrictGeometry(scene);
    } else if (scene && root.parent !== scene) {
      scene.add(root);
    }
    if (activeCtx?.world) {
      patchWorldSeamlessOpenings(activeCtx.world);
    }
    ensureParkedDistrictVehicles();
    if (activeCtx) activeCtx.mapDowntown = api;
    return api;
  }

  function teleportPlayerSmooth(tx, ty, tz, yaw) {
    const p = activeCtx?.player;
    if (!p) return;
    p.x = tx;
    p.y = ty;
    p.z = tz;
    p.vx = 0;
    p.vy = 0;
    p.vz = 0;
    if (typeof yaw === 'number') p.yaw = yaw;
    if (p.mesh) {
      p.mesh.position.set(tx, ty, tz);
      if (typeof yaw === 'number') p.mesh.rotation.y = yaw;
    }
    if (p.rig?.root) {
      p.rig.root.position.set(tx, ty, tz);
    }
    elevatorCooldown = 0.85;
    if (activeCtx?.audio?.playPhoneConfirm) activeCtx.audio.playPhoneConfirm();
    else playLocalTone(520, 880, 0.20, 'triangle', 0.08);
  }

  function update(dtArg = 0.016, secondArg, thirdArg) {
    if (secondArg && typeof secondArg === 'object') activeCtx = secondArg;
    else if (thirdArg && typeof thirdArg === 'object') activeCtx = thirdArg;

    if (!initialized && (activeCtx?.engine?.scene || activeCtx?.scene)) {
      init(activeCtx);
    }
    if (activeCtx?.world && !worldPatched) {
      patchWorldSeamlessOpenings(activeCtx.world);
    }
    ensureParkedDistrictVehicles();

    const dt = clamp(Number(dtArg) || 0.016, 0.0005, 0.1);
    elapsed += dt;
    if (elevatorCooldown > 0) elevatorCooldown = Math.max(0, elevatorCooldown - dt);
    if (detectorBeepCooldown > 0) detectorBeepCooldown = Math.max(0, detectorBeepCooldown - dt);

    // 1. Sync Custom GLSL Parallax Interior Mapping Uniforms & Night/Day Emissive Gain
    const weather = activeCtx?.engine?.timeWeather || 'BRIGHT_DAY';
    const nightTarget =
      weather === 'NEON_NIGHT' ? 1.0
      : weather === 'OVERCAST_RAIN' ? 0.65
      : weather === 'SUNSET_GOLD' ? 0.52
      : 0.15;
    if (parallaxMatRef?.userData?.dtImUniforms) {
      const u = parallaxMatRef.userData.dtImUniforms;
      u.uDtTime.value = elapsed;
      u.uDtNightFactor.value = lerp(u.uDtNightFactor.value, nightTarget, Math.min(1, dt * 3.0));
    }
    if (emissiveGlowMatRef) {
      emissiveGlowMatRef.emissiveIntensity = lerp(0.85, 1.95, nightTarget);
    }
    if (signAtlasMatRef) {
      signAtlasMatRef.emissiveIntensity = lerp(0.95, 1.75, nightTarget);
    }

    // 2. Slowly Slew Giant 68m Yellow Tower Crane Jib & Hanging Steel Girder!
    if (craneSlewGroup) {
      craneSlewGroup.rotation.y = Math.sin(elapsed * 0.14) * 0.95 + elapsed * 0.045;
    }

    // 3. Animate Tiên Bảo Tổng Khố 3D Circular Brushed-Steel Bank Vault Door Swing!
    if (udVaultPivot) {
      const targetV = udVaultOpenTarget ? 1.0 : 0.0;
      if (Math.abs(udVaultProgress - targetV) > 0.001) {
        udVaultProgress = lerp(udVaultProgress, targetV, Math.min(1, dt * 2.2));
        udVaultPivot.rotation.y = -udVaultProgress * 1.48;
      }
    }

    const p = activeCtx?.player;
    const inp = activeCtx?.input || {};
    const keys = inp.keys || {};
    const fDown = Boolean(keys.KeyF || keys.f);
    const gDown = Boolean(keys.KeyG || keys.g);
    const fJust = Boolean(inp.interactJustPressed || (fDown && !prevKeyF));
    const gJust = Boolean(inp.secondaryInteractJustPressed || inp.interactGJustPressed || (gDown && !prevKeyG));
    prevKeyF = fDown;
    prevKeyG = gDown;

    // 4. Player Interactive Triggers:
    //    - Maze Bank Express Helipad Elevator Corona (254, 0.25, -40) -> (278, 120.3, -40) + Free Parachute!
    //    - FIB Security Atrium Elevator & Armed Metal-Detector Scanner
    //    - FIB 48m Dive-Through Glass Shatter + >160m Glass Reset
    //    - Tiên Bảo Tổng Khố Circular Vault Door Inspection [G]
    if (p && Number.isFinite(p.x) && Number.isFinite(p.z)) {
      const inCar = Boolean(p.inCar);
      const modalBusy = Boolean(activeCtx?.activeModal || activeCtx?.paused);

      // 4A. Maze Bank Ground Express Helipad Elevator (254, 0.25, -40)
      if (!inCar && !modalBusy && elevatorCooldown <= 0) {
        if (Math.hypot(p.x - MAZE_ELEVATOR_GROUND.x, p.z - MAZE_ELEVATOR_GROUND.z) <= 3.4 && (p.y || 0) < 5.0) {
          activeCtx?.ui?.showPrompt?.(
            'Nhấn [F] đi Thang Máy Tốc Hành lên Sân Đỗ Trực Thăng Maze Bank (120m) + Nhận Dù Lượn Miễn Phí!',
            0.25
          );
          if (fJust) {
            p.hasParachute = true;
            teleportPlayerSmooth(MAZE_HELIPAD_SPAWN.x, MAZE_HELIPAD_SPAWN.y, MAZE_HELIPAD_SPAWN.z, -Math.PI * 0.5);
            activeCtx?.ui?.showNotification?.(
              '🪂 Đã lên Đỉnh Tháp Maze Bank (120.3m) & Trang bị Dù Lượn Miễn Phí! Nhảy khỏi mép tháp và nhấn [SPACE] để bung dù!',
              'gold'
            );
          }
        } else if (Math.hypot(p.x - MAZE_ELEVATOR_ROOF.x, p.z - MAZE_ELEVATOR_ROOF.z) <= 2.8 && (p.y || 0) >= 115.0) {
          activeCtx?.ui?.showPrompt?.('Nhấn [F] đi Thang Máy xuống Đại Sảnh Cẩm Thạch Maze Bank', 0.25);
          if (fJust) {
            teleportPlayerSmooth(251.5, 0.25, -40.0, -Math.PI * 0.5);
          }
        } else if (Math.hypot(p.x - FIB_ELEVATOR_GROUND.x, p.z - FIB_ELEVATOR_GROUND.z) <= 2.6 && (p.y || 0) < 5.0) {
          activeCtx?.ui?.showPrompt?.('Nhấn [F] đi Thang Máy An Ninh lên Tầng 48 Phòng Máy Chủ FIB', 0.25);
          if (fJust) {
            p.hasParachute = true;
            teleportPlayerSmooth(160.0, 48.08, -22.5, 0);
            activeCtx?.ui?.showNotification?.(
              '🖥 Đã lên Tầng 48 Tháp FIB (Phòng Server LED Xanh & Kính Cường Lực Có Thể Phá Vỡ)!',
              'blue'
            );
          }
        } else if (Math.hypot(p.x - FIB_ELEVATOR_EXEC.x, p.z - FIB_ELEVATOR_EXEC.z) <= 2.5 && Math.abs((p.y || 0) - 48.0) < 3.5) {
          activeCtx?.ui?.showPrompt?.('Nhấn [F] xuống Sảnh An Ninh Tầng Trệt • [G] lên Đỉnh Tháp FIB (78m)', 0.25);
          if (fJust) {
            teleportPlayerSmooth(160.0, 0.26, -14.2, 0);
          } else if (gJust) {
            p.hasParachute = true;
            teleportPlayerSmooth(160.0, 78.12, -42.0, 0);
          }
        } else if (Math.hypot(p.x - 295.5, p.z - (-140.0)) <= 3.4 && (p.y || 0) < 5.0) {
          activeCtx?.ui?.showPrompt?.(
            udVaultOpenTarget
              ? 'Nhấn [G] để đóng Cửa Hầm Vàng Thép Tròn Tiên Bảo Tổng Khố'
              : 'Nhấn [G] để quay vô-lăng mở Cửa Hầm Vàng Thép Tròn Tiên Bảo Tổng Khố',
            0.25
          );
          if (gJust) {
            udVaultOpenTarget = !udVaultOpenTarget;
            playLocalTone(udVaultOpenTarget ? 180 : 320, udVaultOpenTarget ? 420 : 140, 0.28, 'triangle', 0.09);
            activeCtx?.ui?.showNotification?.(
              udVaultOpenTarget
                ? '🏦 Cửa Hầm Dự Trữ Vàng Liên Bang Tiên Bảo Tổng Khố đang mở thủy lực!'
                : '🔒 Đã khóa Cửa Hầm Dự Trữ Vàng Liên Bang Tiên Bảo Tổng Khố.',
              'gold'
            );
          }
        }
      }

      // 4B. FIB Security Atrium Metal-Detector Arch Armed Check (Z ~ -12.5, X in [154, 166])
      const inDetectorGate =
        !inCar &&
        (p.y || 0) < 4.5 &&
        p.x >= 154.4 &&
        p.x <= 165.6 &&
        Math.abs(p.z - (-12.5)) <= 0.85;
      const activeWeapon = String(p.weaponId || p.currentWeapon || 'unarmed').toLowerCase();
      const playerArmed = inDetectorGate && activeWeapon !== 'unarmed' && activeWeapon !== 'fist';
      if (playerArmed && detectorBeepCooldown <= 0) {
        detectorBeepCooldown = 2.2;
        playLocalTone(1240, 980, 0.14, 'square', 0.06);
        activeCtx?.ui?.showSubtitle?.('🔊 [Cổng Từ An Ninh FIB]: Phát hiện kim loại vũ khí tại Sảnh Kiểm Soát!', 2.2);
      }

      if (animPropsInst && fibDetectorBarIndices.length > 0) {
        const detCol = new THREE.Color(playerArmed ? 0xff1e38 : 0x10f58c);
        for (let i = 0; i < fibDetectorBarIndices.length; i++) {
          animPropsInst.setColorAt(fibDetectorBarIndices[i].slot, detCol);
        }
        if (animPropsInst.instanceColor) animPropsInst.instanceColor.needsUpdate = true;
      }

      // 4C. Dive / Sprint / Jump through FIB y = 48m Shatterable Glass Panels + >160m Reset!
      if ((p.y || 0) >= 47.4 && (p.y || 0) <= 53.6 && Math.abs(p.z - FIB_GLASS_Z) <= 1.05) {
        const pSpd = Math.hypot(p.vx || 0, p.vz || 0);
        if (pSpd > 2.6 || Math.abs(p.vy || 0) > 0.4 || keys.Space) {
          for (let i = 0; i < fibGlassPanels.length; i++) {
            const pn = fibGlassPanels[i];
            if (!pn.broken && Math.abs(p.x - pn.x) <= pn.halfW + 0.25) {
              shatterFibPanel(pn, p.vx || 0, 1);
              p.hasParachute = true; // Ensure thrilling 48m window-dive skydive!
            }
          }
        }
      } else if (Math.hypot(p.x - 160.0, p.z - (-40.0)) > 160.0 && fibGlassInst) {
        let restored = false;
        for (let i = 0; i < fibGlassPanels.length; i++) {
          const pn = fibGlassPanels[i];
          if (pn.broken) {
            pn.broken = false;
            fibGlassInst.setMatrixAt(pn.index, makeMatrix4(pn.x, pn.y, pn.z, 0, 0, 0, 1, 1, 1));
            restored = true;
          }
        }
        if (restored) fibGlassInst.instanceMatrix.needsUpdate = true;
      }

      // 4D. Downtown Rooftop Ngự Phong Phi Độ Launch Fanfare (Parking Garage 14.8m & Construction Site 38.4m)
      const pCar = p.inCar && typeof p.inCar === 'object' ? p.inCar : null;
      for (let r = 0; r < downtownStuntRamps.length; r++) {
        const sr = downtownStuntRamps[r];
        if (sr.cooldown > 0) sr.cooldown = Math.max(0, sr.cooldown - dt);
        if (
          pCar &&
          sr.cooldown <= 0 &&
          pCar.x >= sr.minX - 2.5 &&
          pCar.x <= sr.minX + 2.2 &&
          pCar.z >= sr.minZ &&
          pCar.z <= sr.maxZ &&
          Math.abs((pCar.y || 0) - sr.yTip) <= 2.4 &&
          (pCar.vx || 0) < -11.0
        ) {
          sr.cooldown = 8.0;
          pCar.vy = Math.max(pCar.vy || 0, Math.min(16.5, Math.abs(pCar.vx) * 0.28 + 4.5));
          if (typeof p.cash === 'number') { if (ctx?.antiCheat?.commitCash) ctx.antiCheat.commitCash(p.cash + 1500); else p.cash += 1500; }
          activeCtx?.engine?.addShake?.(0.24);
          activeCtx?.ui?.showNotification?.(`🚀 ${sr.name}! Thưởng Pha Bay Mạo Hiểm +$1,500!`, 'gold');
        }
      }
    }

    // 5. Update Pooled Dynamic InstancedMesh (Blinking Beacons, Fountain Water Jets, Coronas & Falling 3D Glass Shards!)
    if (animPropsInst) {
      const blinkOn = Math.sin(elapsed * 4.4) > -0.1;
      const bScale = blinkOn ? 0.72 : 0.001;
      for (let i = 0; i < beaconIndices.length; i++) {
        const b = beaconIndices[i];
        animPropsInst.setMatrixAt(b.slot, makeMatrix4(b.x, b.y, b.z, 0, 0, 0, bScale, bScale, bScale));
      }

      // Multi-tier arching water fountain droplets at (244, -40)
      for (let i = 0; i < fountainJetDrops.length; i++) {
        const fd = fountainJetDrops[i];
        const u = (elapsed * 1.15 + fd.phase) % 1.0;
        const startR = fd.tier === 0 ? 0.55 : 2.1;
        const endR = fd.tier === 0 ? 2.05 : 3.35;
        const baseH = fd.tier === 0 ? 2.05 : 1.25;
        const peakLift = fd.tier === 0 ? 2.15 : 1.45;
        const r = lerp(startR, endR, u);
        const y = baseH + Math.sin(u * Math.PI) * peakLift - u * 0.65;
        const wx = MAZE_FOUNTAIN_POS.x + Math.cos(fd.angle + elapsed * 0.35) * r;
        const wz = MAZE_FOUNTAIN_POS.z + Math.sin(fd.angle + elapsed * 0.35) * r;
        const s = 0.18 + Math.sin(u * Math.PI) * 0.16;
        animPropsInst.setMatrixAt(fd.slot, makeMatrix4(wx, y, wz, 0, fd.angle, 0, s, s * 1.7, s));
      }

      // Bobbing & spinning Elevator Coronas
      for (let i = 0; i < coronaRingEntries.length; i++) {
        const cr = coronaRingEntries[i];
        const bob = Math.sin(elapsed * 3.2 + i) * 0.12;
        const pulse = cr.radius * (0.92 + Math.sin(elapsed * 4.0 + i) * 0.08);
        animPropsInst.setMatrixAt(cr.slot, makeMatrix4(cr.x, cr.y + 0.88 + bob, cr.z, 0, elapsed * 1.8, 0, pulse, 1.35, pulse));
      }

      // Integrate 3D Spinning Glass Shards falling from FIB 48m windows
      for (let i = 0; i < MAX_GLASS_SHARDS; i++) {
        const sh = glassShards[i];
        if (!sh.active) continue;
        sh.age += dt;
        if (sh.age >= sh.life) {
          sh.active = false;
          animPropsInst.setMatrixAt(sh.slot, makeMatrix4(0, -999, 0, 0, 0, 0, 0.001, 0.001, 0.001));
          continue;
        }
        sh.vy -= 16.5 * dt;
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;
        sh.z += sh.vz * dt;
        sh.rx += 7.5 * dt;
        sh.ry += 6.2 * dt;
        if (sh.y < 0.26) {
          sh.y = 0.26;
          sh.vy = -sh.vy * 0.28;
          sh.vx *= 0.65;
          sh.vz *= 0.65;
        }
        const fade = 1.0 - sh.age / sh.life;
        const sc = 0.36 * fade;
        animPropsInst.setMatrixAt(sh.slot, makeMatrix4(sh.x, sh.y, sh.z, sh.rx, sh.ry, sh.rz, sc, sc * 1.3, sc * 0.22));
      }

      animPropsInst.instanceMatrix.needsUpdate = true;
    }
  }

  // ==========================================================================
  // Public API attached to `ctx.mapDowntown` (Eagerly Populated!)
  // ==========================================================================
  const api = {
    init,
    update,
    getElevation,
    getCeilingHeight,
    getZoneInfo,
    onProjectileHit,
    aabbs,
    roadNodes,
    roadEdges,
    minimapPolys,
    minimapBlips,
    stuntRamps: downtownStuntRamps,
    landmarks: {
      mazeBank: { x: MAZE_CENTER_X, y: 0.23, z: MAZE_CENTER_Z, roofY: MAZE_ROOF_Y, elevator: MAZE_ELEVATOR_GROUND, helipad: MAZE_HELIPAD_SPAWN, fountain: MAZE_FOUNTAIN_POS },
      fibAtrium: { ...FIB_ATRIUM_DOOR, execY: FIB_EXEC_Y },
      unionDepository: { x: 278.0, y: UD_LOBBY_Y, z: -140.0, vaultDoor: UD_VAULT_POS },
      constructionSite: { x: 285.0, y: 0.25, z: 66.5, topY: 35.0, craneTopY: CRANE_BASE.topY },
      parkingGarage: { x: 278.0, y: 0.22, z: 148.0, decks: PG_DECKS.slice() },
    },
    root,
  };

  init(ctx);
  if (ctx && typeof ctx === 'object') {
    ctx.mapDowntown = api;
  }

  return api;
}
