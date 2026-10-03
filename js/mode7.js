'use strict';
// ============================================================
// BONUS STAGE: SNES "Mode 7" style pseudo-3D flight.
// A wrapping 512x512 world texture is projected per scanline
// onto a perspective ground plane with dithered distance fog.
// Fly through the golden rings, pop balloons, grab coins.
// ============================================================

const M7 = { HZ: 92, F: 150, CAMB: 40, CAMH: 37, TS: 512 };

// sky / horizon look for every biome (the flight blends from one to the next)
const M7THEMES = {
  ocean: { sky: ['#1c4a9c', '#2a62b8', '#3a7ccc', '#5096dc', '#6aaee6', '#88c4ee', '#a8d8f4', '#c8e8f8'], fog: '#b8dcf0', far: '#5a8cb8', near: '#3a6a5a', sun: '#fff8d0', strip: 'mountains' },
  desert: { sky: ['#2a5aa8', '#3a70bc', '#5088cc', '#6aa0d8', '#88b8e0', '#a8cce4', '#c8dce0', '#e8e0c8'], fog: '#e8d8b0', far: '#b08060', near: '#8a5a3a', sun: '#fffbe0', strip: 'mesa' },
  jungle: { sky: ['#1a5a8a', '#2a70a0', '#3c88b4', '#54a0c4', '#70b4cc', '#8cc4cc', '#a8d4cc', '#c4e0d0'], fog: '#b8d8c4', far: '#3a6a4a', near: '#1e4428', sun: '#fff8d8', strip: 'mountains' },
  arctic: { sky: ['#4a6a9a', '#5a7cac', '#6c90bc', '#80a4cc', '#98b8d8', '#b0cce4', '#c8dcec', '#e0ecf4'], fog: '#e4eef6', far: '#a8bcd4', near: '#8aa0bc', sun: '#ffffff', strip: 'mountains' },
  city: { sky: ['#3a2a40', '#4e3446', '#6a3e48', '#8a4c48', '#a85e48', '#c07448', '#d08c50', '#d8a060'], fog: '#a08880', far: '#3a3440', near: '#24202a', sun: '#ffd890', strip: 'city' },
  storm: { sky: ['#05060c', '#080a14', '#0c1020', '#10162a', '#141c34', '#1a243e', '#202c48', '#283652'], fog: '#1a2438', far: '#10141e', near: '#0a0c14', sun: null, strip: 'mountains' },
  alpine: { sky: ['#1a50a8', '#2662b8', '#3474c4', '#4a88d0', '#62a0dc', '#80b6e4', '#a0cae8', '#c4dcec'], fog: '#d4e2f0', far: '#e0e8f4', near: '#3e5e44', sun: '#fffff0', strip: 'peaks' },
  volcano: { sky: ['#120404', '#1e0706', '#2c0a08', '#3e100a', '#52180c', '#6a2210', '#863014', '#a44418'], fog: '#5a2414', far: '#200a0a', near: '#100404', sun: null, strip: 'mountains' },
  sky: { sky: ['#24307a', '#3a44a0', '#5a5cbc', '#8274cc', '#ae88cc', '#d8a0c4', '#f0b8bc', '#ffd4b4'], fog: '#f6d0d4', far: '#e8c4dc', near: '#d8acd0', sun: '#fff4d0', strip: 'clouds' },
};

// ---------- world textures ----------
function m7Texture(kind) {
  const S = M7.TS, S1 = S - 1, buf = new Uint32Array(S * S);
  const pack = c => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
  const P = arr => arr.map(h => pack(hexToRgb(h)));
  const seed = 40 + Object.keys(M7THEMES).indexOf(kind);
  const Hf = new Float32Array(S * S), Mf = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    Hf[y * S + x] = fbm(x / S * 6, y / S * 6, seed, 5, 6, 6);
    Mf[y * S + x] = fbm(x / S * 10, y / S * 10, seed + 9, 3, 10, 10);
  }
  const hAt = (x, y) => Hf[((y & S1) * S) + (x & S1)];
  const C = {
    sea: P(['#0c2c6a', '#123a80', '#1a4a94', '#2660a8', '#3a80c0']), shal: P(['#2a90b8', '#3aa8c4', '#58c0cc']),
    sand: P(['#c8a868', '#dcc080', '#ecd498']), grass: P(['#2a6a2a', '#3a8030', '#4e983a', '#6aae48']),
    forest: P(['#163a1c', '#1e4c22', '#2a5e2a']), rock: P(['#5a4c48', '#76665c', '#948272']), snow: P(['#9ab4d0', '#bcd0e4', '#dce8f4', '#ffffff']),
    dune: P(['#a8804c', '#c09a5c', '#d6b070', '#e8c888', '#f4dca4']), mesa: P(['#6a2e1a', '#8a4024', '#a85a34', '#c47848', '#d8945e']),
    canopy: P(['#0c2814', '#123a1c', '#1a4c24', '#24602c', '#347838', '#4a9044']), river: P(['#1a3a3a', '#24504a', '#2e6458']), dirt: P(['#5a4028', '#72543a', '#8a6a48']),
    ice: P(['#0c2036', '#123050', '#1a4068']), crev: P(['#2a5a8a', '#3a78a8']),
    asphalt: pack([56, 56, 62]), dash: pack([200, 190, 120]), roofs: [P(['#4a4a52', '#5a5a62', '#6e6e76']), P(['#5a4a3c', '#6e5a48', '#826c56']), P(['#6a3a30', '#7a4a3a', '#8e5a46']), P(['#3e4656', '#4e5868', '#62707e'])],
    storm: P(['#081020', '#0c1828', '#102034', '#16283e']), foam: P(['#6a7a90', '#c8d4e2']), wet: P(['#1e1a1c', '#2a2428', '#3a3236']),
    lake: P(['#123e6a', '#1a4e80', '#2a6496']), meadow: P(['#2e6a26', '#3e8030', '#56983c', '#76b04c']),
    basalt: P(['#140e10', '#1e1618', '#2a2024', '#382c30', '#4a3a3c']), lava: P(['#c83008', '#ff6a10', '#ffa030', '#ffe080']), glow: P(['#4a0c08', '#7a1408', '#b02408']),
    cloud: P(['#6a5898', '#8a74b0', '#b090c4', '#d0acd4', '#ecc8dc', '#fce0e4', '#fff4f0']), deep: P(['#1a3a7a', '#24488a']),
  };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const h = hAt(x, y), m = Mf[y * S + x], sh = (hAt(x - 1, y - 1) - hAt(x + 1, y + 1)) * 30;
    const d = bayer(x, y) - 0.5;
    const pk = (r, v) => r[clamp(Math.floor(v * r.length + d * 0.8), 0, r.length - 1)];
    let c;
    switch (kind) {
      case 'desert': {
        if (h < 0.3) c = h > 0.285 ? pk(C.grass, 0.5) : pk(C.lake, 0.5 + sh);
        else if (h > 0.64) c = pk(C.mesa, 0.55 + sh * 1.4 + Math.sin(y * 0.5 + m * 20) * 0.08);
        else if (h > 0.62) c = pk(C.mesa, 0.2 + sh);
        else c = pk(C.dune, 0.55 + sh * 0.8 + Math.sin(x * 0.12 + y * 0.05 + m * 12) * 0.18);
        break;
      }
      case 'jungle': {
        const rv = Math.abs(x - (256 + 110 * Math.sin(y / S * TAU * 2) + 30 * Math.sin(y / S * TAU * 5)));
        const crown = fbm(x / S * 48, y / S * 48, seed + 3, 2, 48, 48);
        if (rv < 9) c = pk(C.river, 0.5 + sh);
        else if (rv < 12) c = pk(C.dirt, 0.5);
        else if (m > 0.7) c = pk(C.dirt, 0.5 + sh);
        else c = pk(C.canopy, 0.3 + crown * 0.9 + sh * 0.6);
        break;
      }
      case 'arctic': {
        const cr = Math.abs(fbm(x / S * 12, y / S * 12, seed + 5, 3, 12, 12) - 0.5);
        if (h < 0.42) c = pk(C.ice, h / 0.42 * 0.9);
        else if (h > 0.8) c = pk(C.rock, 0.5 + sh);
        else if (cr < 0.012) c = pk(C.crev, cr * 60);
        else c = pk(C.snow, 0.6 + sh);
        break;
      }
      case 'city': {
        const bx = x >> 6, by = y >> 6, lx = x & 63, ly = y & 63;
        if (lx < 8 || ly < 8) c = ((lx === 3 || lx === 4) && (y & 7) < 4 && ly >= 8) || ((ly === 3 || ly === 4) && (x & 7) < 4 && lx >= 8) ? C.dash : C.asphalt;
        else {
          const hb = hash2(bx, by, 7);
          if (hb < 0.14) c = pk(C.grass, 0.4 + hash2(x >> 2, y >> 2, 2) * 0.5);
          else {
            const sx = (lx - 8) % 28, sy = (ly - 8) % 28;
            const roof = C.roofs[Math.floor(hash2(bx * 2 + ((lx - 8) / 28 | 0), by * 2 + ((ly - 8) / 28 | 0), 5) * 4)];
            if (sx > 25 || sy > 25) c = C.asphalt;
            else c = pk(roof, sx < 2 || sy < 2 ? 0.95 : sx > 23 || sy > 23 ? 0.05 : 0.5);
          }
        }
        break;
      }
      case 'storm': {
        const w = Math.sin(TAU * (x + 2 * y) / 64 + m * 7);
        if (h > 0.7) c = pk(C.wet, 0.4 + sh);
        else if (w > 0.93 && m > 0.45) c = C.foam[1];
        else if (w > 0.82 && m > 0.42) c = C.foam[0];
        else c = pk(C.storm, m * 0.7 + (w * 0.5 + 0.5) * 0.3);
        break;
      }
      case 'alpine': {
        if (h < 0.3) c = pk(C.lake, 0.5 + sh);
        else if (h < 0.46) c = pk(C.meadow, 0.5 + sh + (m - 0.5) * 0.4);
        else if (h < 0.6) c = pk(C.forest, 0.5 + sh);
        else if (h < 0.72) c = pk(C.rock, 0.5 + sh * 1.2);
        else c = pk(C.snow, 0.6 + sh);
        break;
      }
      case 'volcano': {
        const v = Math.abs(fbm(x / S * 8, y / S * 8, seed + 2, 3, 8, 8) - 0.5);
        if (v < 0.02 || h < 0.28) c = pk(C.lava, 0.5 + (0.02 - Math.min(v, 0.02)) * 25 + Math.sin(x * 0.3 + y * 0.2) * 0.2);
        else if (v < 0.035 || h < 0.31) c = pk(C.glow, 0.5);
        else c = pk(C.basalt, 0.45 + sh * 1.1);
        break;
      }
      case 'sky': {
        const hh = h * 0.6 + m * 0.4;
        if (hh < 0.33) c = pk(C.deep, 0.5);
        else c = pk(C.cloud, 0.62 + sh * 1.2 + (hh - 0.5) * 0.8);
        break;
      }
      default: { // ocean islands
        if (h < 0.5) c = h > 0.47 ? pk(C.shal, (h - 0.47) / 0.03) : pk(C.sea, h / 0.47 + (((x * 7 + y * 3) & 31) === 0 ? 0.3 : 0));
        else if (h < 0.52) c = pk(C.sand, 0.5 + sh);
        else if (h < 0.62) c = pk(C.grass, 0.5 + sh + (hash2(x >> 3, y >> 3, 3) - 0.5) * 0.4);
        else if (h < 0.7) c = pk(C.forest, 0.5 + sh + (hash2(x, y, 4) - 0.5) * 0.5);
        else if (h < 0.78) c = pk(C.rock, 0.5 + sh);
        else c = pk(C.snow, 0.5 + sh);
      }
    }
    buf[y * S + x] = c;
  }
  return buf;
}
function m7Tex(kind) {
  M7.texCache = M7.texCache || {};
  return M7.texCache[kind] || (M7.texCache[kind] = m7Texture(kind));
}

function m7Sprites() {
  if (SPR.m7) return SPR.m7;
  const M = SPR.m7 = {};
  // rear views of each plane (5 roll frames, natively rotated)
  const specs = {
    lightning: { body: 'silver', acc: 'navy', span: 24, booms: true },
    mustang: { body: 'silver', acc: 'red', span: 20 },
    shinden: { body: 'green', acc: 'yellow', span: 19, pusher: true },
    mosquito: { body: 'khaki', acc: 'olive', span: 25, engines: [10] },
  };
  M.rear = {};
  for (const k in specs) {
    const sp = specs[k];
    M.rear[k] = [-2, -1, 0, 1, 2].map(b => forgeSprite(60, 40, f => {
      const s = sp.span;
      f.poly([[-s, -3], [-4, 1], [4, 1], [s, -3], [s, -1], [4, 3], [-4, 3], [-s, -1]], sp.body, { bevel: 1.2, amp: 0.6 });
      f.poly([[-s, -3], [-s + 4, -2.4], [-s + 4, -0.4], [-s, -1]], sp.acc, { paint: true });
      f.poly([[s, -3], [s - 4, -2.4], [s - 4, -0.4], [s, -1]], sp.acc, { paint: true });
      if (sp.booms) {
        sym(f, q => { f.circle(q * 8, 1, 3, sp.body, { z: 0.5 }); f.rect(q * 8 - 1, -9, 2, 9, sp.acc, { z: 0.6 }); f.circle(q * 8, 1, 1.2, 'glowY', { z: 1 }); });
        f.rect(-9, -8, 18, 2, sp.body, { z: 0.4 });
      } else {
        f.rect(-9, -6, 18, 2, sp.body, { z: 0.4, bevel: 1 });
        f.rect(-1, -13, 2, 9, sp.acc, { z: 0.6, bevel: 0.8 });
      }
      for (const ex of sp.engines || []) sym(f, q => { f.circle(q * ex, 1, 3.2, sp.body, { z: 0.5 }); f.circle(q * ex, 1, 1.3, 'glowY', { z: 1 }); });
      f.circle(0, 1, 4.6, sp.body, { z: 0.7 });
      f.ellipse(0, -2.5, 2.4, 1.6, 'glass', { z: 1.2 });
      f.circle(0, 2, 1.6, 'glowY', { z: 1.2 });
    }, { rot: b * 0.3 }));
  }
  // golden rings in many sizes (drawn at 1:1 so pixels never get scaled)
  M.ring = [];
  for (let d = 6; d <= 140; d += 4) {
    const c = makeCanvas(d + 2, d + 2), g = c.ctx, r = d / 2, th = Math.max(1, Math.round(d / 14));
    for (let i = 0; i < th; i++) pxCircle(g, r + 1, r + 1, r - i, i === 0 ? '#7a4a08' : i === th - 1 ? '#fff0a0' : '#ffc030');
    if (th > 2) pxCircle(g, r + 1, r + 1, r - Math.floor(th / 2), '#ffd860');
    c.hw = c.width / 2; c.hh = c.height / 2; c.d = d;
    M.ring.push(c);
  }
  M.balloon = { red: [], blue: [] };
  for (const [col, mat] of [['red', 'red'], ['blue', 'sky']]) for (let d = 3; d <= 51; d += 3) {
    const c = forgeSprite(d + 4, Math.round(d * 1.5) + 4, f => { f.oy = d / 2 + 2; f.ellipse(0, 0, d / 2, d / 2 * 1.12, mat, { prof: 'dome' }); });
    if (d > 8) pxLine(c.ctx, c.width / 2, d + 2, c.width / 2 + 1, c.height - 1, '#e8e8e8');
    c.d = d; M.balloon[col].push(c);
  }
  M.coin = [];
  for (let d = 3; d <= 33; d += 2) M.coin.push(forgeSprite(d + 3, d + 3, f => { f.circle(0, 0, d / 2, 'yellow', { prof: 'flat', bevel: Math.max(1, d / 6) }); }));
  M.shadow = [];
  for (let w = 4; w <= 64; w += 4) { const c = makeCanvas(w, Math.max(2, w >> 2)); c.ctx.fillStyle = '#000'; for (let y = 0; y < c.height; y++) { const k = 1 - Math.pow((y + 0.5 - c.height / 2) / (c.height / 2), 2); const ww = Math.round(w * Math.sqrt(Math.max(0, k))); c.ctx.fillRect((w - ww) >> 1, y, ww, 1); } c.d = w; M.shadow.push(c); }
  return M;
}
function m7Pick(list, d) {
  let best = list[0];
  for (const s of list) if (Math.abs(s.d - d) < Math.abs(best.d - d)) best = s;
  return best;
}

class BonusStage {
  // a short flight from biome A to biome B: the ground and sky blend halfway
  constructor(from, to, nextName) {
    this.from = from; this.to = to; this.nextName = nextName;
    this.thA = M7THEMES[from] || M7THEMES.ocean; this.thB = M7THEMES[to] || M7THEMES.ocean;
    this.texA = m7Tex(from); this.texB = m7Tex(to);
    this.spr = m7Sprites();
    this.GH = H - M7.HZ;
    this.img = new ImageData(W, this.GH);
    this.px32 = new Uint32Array(this.img.data.buffer);
    this.stripsA = this.buildStrips(this.thA); this.stripsB = this.buildStrips(this.thB);
    this.x = 256; this.z = 256; this.h = 0; this.alt = 30; this.speed = 3.3; this.bank = 0;
    this.t = 0; this.phase = 'intro';
    this.bullets = []; this.pops = [];
    this.rings = []; this.balloons = []; this.coins = [];
    this.got = { rings: 0, balloons: 0, coins: 0 };
    this.genCourse();
    // organic border between the two worlds
    this.border = new Float32Array(M7.TS);
    for (let u = 0; u < M7.TS; u++) this.border[u] = (fbm(u / M7.TS * 6, 0.5, 77, 3, 6, 0) - 0.5) * 120;
    this.skyP = -1;
    this.updateBlend();
  }
  get progress() { return clamp((this.zStart - this.z) / (this.zStart - this.zEnd), 0, 1); }
  updateBlend() {
    const p = clamp((this.progress - 0.35) / 0.3, 0, 1);
    if (Math.abs(p - this.skyP) < 0.02 && this.sky) return;
    this.skyP = p;
    const mix = (a, b) => { const A = hexToRgb(a), B = hexToRgb(b); return [lerp(A[0], B[0], p) | 0, lerp(A[1], B[1], p) | 0, lerp(A[2], B[2], p) | 0]; };
    const cols = this.thA.sky.map((c, i) => mix(c, this.thB.sky[i]));
    const c = this.sky = this.sky || makeCanvas(W, M7.HZ), g = c.ctx;
    const img = g.createImageData(W, M7.HZ), d = img.data;
    for (let y = 0; y < M7.HZ; y++) for (let x = 0; x < W; x++) {
      const k = clamp(Math.floor(y / M7.HZ * (cols.length - 1) + (bayer(x, y) - 0.5) * 0.9 + 0.5), 0, cols.length - 1);
      const i = (y * W + x) * 4; d[i] = cols[k][0]; d[i + 1] = cols[k][1]; d[i + 2] = cols[k][2]; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const f = mix(this.thA.fog, this.thB.fog);
    this.fog32 = (255 << 24) | (f[2] << 16) | (f[1] << 8) | f[0];
    this.th = p < 0.5 ? this.thA : this.thB;
    this.strips = p < 0.5 ? this.stripsA : this.stripsB;
  }
  // horizon silhouettes wrapping around 360 degrees
  buildStrips(th) {
    const strip = (col, amp, seed, kind) => {
      const s = makeCanvas(720, 34), sg = s.ctx; sg.fillStyle = col;
      for (let x = 0; x < 720; x++) {
        const n = fbm(x / 720 * 12, 0.5, seed, 3, 12, 0);
        let hh;
        if (kind === 'city') { const b = Math.floor(x / 9); hh = hash2(b, seed, 3) < 0.2 ? 2 : Math.round(4 + hash2(b, seed, 1) * amp * 1.3); }
        else if (kind === 'mesa') hh = Math.round(2 + Math.floor(Math.pow(n, 1.4) * amp * 1.8 / 6) * 6);
        else if (kind === 'peaks') hh = Math.round(2 + Math.pow(n, 2.2) * amp * 3.2);
        else if (kind === 'clouds') hh = Math.round(3 + Math.abs(Math.sin(x * 0.05 + n * 6)) * amp * 0.5 + n * amp * 0.5);
        else hh = Math.round(2 + amp * Math.pow(n, 1.6) * 1.6);
        sg.fillRect(x, 34 - hh, 1, hh);
        if (kind === 'city' && hh > 6 && (x % 3 === 1)) for (let wy = 34 - hh + 3; wy < 32; wy += 4) if (hash2(x, wy, 9) > 0.55) { sg.fillStyle = '#ffd070'; sg.fillRect(x, wy, 1, 1); sg.fillStyle = col; }
      }
      return s;
    };
    return [strip(th.far, 22, 5, th.strip), strip(th.near, 15, 6, th.strip === 'peaks' ? 'mountains' : th.strip)];
  }
  genCourse() {
    let x = this.x, z = this.z, h = 0;
    const N = 18;
    for (let i = 0; i < N * 13 + 40; i++) {
      h += 0.0042 * Math.sin(i * 0.011) + 0.0025 * Math.sin(i * 0.037);
      x += Math.sin(h) * 10; z -= Math.cos(h) * 10;
      if (i < 25) continue;
      const k = i - 25;
      if (k % 13 === 0 && k / 13 < N) this.rings.push({ x, z, a: 30 + 18 * Math.sin(k * 0.03) + 8 * Math.sin(k * 0.11), prev: 1e9 });
      if (k % 13 === 6 && k / 13 < N - 1) for (let j = -1; j <= 1; j++) this.coins.push({ x, z, a: 30 + 18 * Math.sin(k * 0.03) + j * 6 });
      if (k % 52 === 26) {
        const side = (k / 52) & 1 ? 1 : -1;
        for (let j = 0; j < 3; j++) {
          const lat = side * (34 + j * 14);
          this.balloons.push({ x: x + Math.cos(h) * lat, z: z + Math.sin(h) * lat, a: 22 + j * 12, col: j === 1 ? 'blue' : 'red', bob: rnd() * TAU });
        }
      }
    }
    this.zStart = this.z; this.zEnd = this.rings[this.rings.length - 1].z;
    this.zb = (this.zStart + this.zEnd) / 2;
    this.total = { rings: this.rings.length, balloons: this.balloons.length, coins: this.coins.length };
  }
  get fwd() { return [Math.sin(this.h), -Math.cos(this.h)]; }
  get right() { return [Math.cos(this.h), Math.sin(this.h)]; }
  update() {
    this.t++;
    if (this.phase === 'results') { this.updateResults(); return; }
    if (this.phase === 'intro' && this.t > 90) this.phase = 'fly';
    // steering
    let turn = 0, climb = 0;
    if (this.phase !== 'outro') {
      const I = Input.held;
      if (I.left) turn -= 1; if (I.right) turn += 1; if (I.up) climb += 1; if (I.down) climb -= 1;
      if (Input.padAxis) { if (Input.padAxis[0]) turn = Input.padAxis[0]; if (Input.padAxis[1]) climb = -Input.padAxis[1]; }
      const [tx, ty] = Input.consumeTouchDelta();
      if (tx || ty) { turn = clamp(tx * 0.35, -1.5, 1.5); climb = clamp(-ty * 0.35, -1.5, 1.5); }
    } else Input.consumeTouchDelta();
    this.h += turn * 0.024;
    this.alt = clamp(this.alt + climb * 0.9, 8, 70);
    this.bank += (turn - this.bank) * 0.15;
    const [fx, fz] = this.fwd, [rx, rz] = this.right;
    this.x += fx * this.speed; this.z += fz * this.speed;
    // shooting
    if ((Input.held.fire || Input.isTouch || Save.data.autofire) && this.t % 6 === 0 && this.phase === 'fly') {
      for (const s of [-1, 1]) this.bullets.push({ x: this.x + rx * s * 6, z: this.z + rz * s * 6, a: this.alt, life: 45 });
      Sound.sfx('shot', { vol: 0.4 });
    }
    for (const b of this.bullets) { b.x += fx * 10; b.z += fz * 10; b.life--; }
    // rings: detect crossing the ring plane
    const rel = o => { const dx = o.x - this.x, dz = o.z - this.z; return [dx * fx + dz * fz, dx * rx + dz * rz]; };
    for (const r of this.rings) {
      if (r.done) continue;
      const [d, lat] = rel(r);
      if (r.prev > 0 && d <= 0 && r.prev < 60) {
        r.done = true;
        if (Math.abs(lat) < 14 && Math.abs(r.a - this.alt) < 14) {
          r.got = true; this.got.rings++; this.streak = (this.streak || 0) + 1;
          Game.addScore(1000);
          Sound.sfx('ring', { pitch: 1 + Math.min(12, this.streak) * 0.06 });
          this.pops.push({ x: W / 2, y: 170, t: 30, txt: '1000' });
        } else { this.streak = 0; this.pops.push({ x: W / 2, y: 150, t: 30, txt: 'MISS', red: true }); }
      }
      r.prev = d;
    }
    for (const c of this.coins) {
      if (c.done) continue;
      const [d, lat] = rel(c);
      if (Math.abs(d) < 6 && Math.abs(lat) < 9 && Math.abs(c.a - this.alt) < 8) { c.done = true; this.got.coins++; Game.addScore(500); Sound.sfx('medal', { pitch: 1.3 }); }
      if (d < -20) c.done = true;
    }
    for (const bl of this.balloons) {
      if (bl.done) continue;
      const ba = bl.a + Math.sin(this.t * 0.05 + bl.bob) * 2;
      for (const b of this.bullets) {
        if (b.life <= 0) continue;
        if (dist2(b.x, b.z, bl.x, bl.z) < 81 && Math.abs(b.a - ba) < 8) {
          bl.done = true; b.life = 0; this.got.balloons++; Game.addScore(2000);
          Sound.sfx('explode_s', { pitch: 1.6 });
          bl.pop = 12;
          break;
        }
      }
    }
    this.bullets = this.bullets.filter(b => b.life > 0);
    for (const p of this.pops) p.t--;
    this.pops = this.pops.filter(p => p.t > 0);
    // end of course
    const last = this.rings[this.rings.length - 1];
    if (this.phase === 'fly' && ((last && last.done) || this.t > 1600)) { this.phase = 'outro'; this.outroT = 0; }
    if (this.phase === 'outro' && ++this.outroT > 60) this.toResults();
  }
  toResults() {
    this.phase = 'results'; this.rt = 0;
    const g = this.got, T = this.total;
    const perfect = g.rings === T.rings;
    this.lines = [
      ['RINGS', g.rings + '/' + T.rings],
      ['BALLOONS', g.balloons + '/' + T.balloons],
      ['COINS', g.coins + '/' + T.coins],
    ];
    this.reward = perfect ? 'PERFECT! BOMB +1  +20000' : g.rings >= T.rings * 0.8 ? 'GREAT! +10000' : 'GOOD FLIGHT';
    if (perfect) { Game.bombs = Math.min(6, Game.bombs + 1); Game.addScore(20000); Sound.sfx('bomb_item'); }
    else if (g.rings >= T.rings * 0.8) Game.addScore(10000);
    Sound.playMusic('clear');
  }
  updateResults() {
    this.rt++;
    if ((this.rt > 60 && (Game.confirmPressed() || Game.tapped())) || this.rt > 200) this.finished = true;
  }

  // ---------------- rendering ----------------
  project(o, a) {
    const [fx, fz] = this.fwd, [rx, rz] = this.right;
    const cx = this.x - fx * M7.CAMB, cz = this.z - fz * M7.CAMB, ca = this.alt + M7.CAMH;
    const dx = o.x - cx, dz = o.z - cz;
    const zc = dx * fx + dz * fz, xc = dx * rx + dz * rz;
    if (zc < 6) return null;
    return { sx: W / 2 + xc * M7.F / zc, sy: M7.HZ + (ca - a) * M7.F / zc, gy: M7.HZ + ca * M7.F / zc, k: M7.F / zc, zc };
  }
  renderGround(g) {
    const [fx, fz] = this.fwd, [rx, rz] = this.right;
    const cx = this.x - fx * M7.CAMB, cz = this.z - fz * M7.CAMB, ca = this.alt + M7.CAMH;
    const texA = this.texA, texB = this.texB, px = this.px32, F = M7.F, S1 = M7.TS - 1, zb = this.zb, border = this.border;
    for (let y = 0; y < this.GH; y++) {
      const zc = ca * F / (y + 1);
      const half = (W / 2) * zc / F;
      let u = cx + fx * zc - rx * half, v = cz + fz * zc - rz * half;
      const du = rx * zc / F, dv = rz * zc / F;
      const fog = clamp((zc - 180) / 620, 0, 1);
      const row = y * W, by = (y & 3) * 4;
      for (let x = 0; x < W; x++) {
        const bt = BAYER4[by + (x & 3)];
        if (fog > bt) px[row + x] = this.fog32;
        else {
          const ui = (u | 0) & S1, ti = ((v | 0) & S1) * M7.TS + ui;
          px[row + x] = v < zb + border[ui] + bt * 6 ? texB[ti] : texA[ti];
        }
        u += du; v += dv;
      }
    }
    g.putImageData(this.img, 0, M7.HZ);
  }
  render(g) {
    // sky with heading-parallax mountains
    this.updateBlend();
    g.drawImage(this.sky, 0, 0);
    const hdeg = ((this.h % TAU) + TAU) % TAU;
    const sunA = angDiff(this.h, -0.7);
    if (this.th.sun && Math.abs(sunA) < 0.9) pxDisc(g, W / 2 + Math.tan(sunA) * M7.F, M7.HZ - 38, 11, this.th.sun);
    [this.strips[0], this.strips[1]].forEach((strip, i) => {
      const k = i ? 1.6 : 1;
      const off = -Math.floor(hdeg / TAU * 720 * k) % 720;
      for (let x = off - 720; x < W; x += 720) g.drawImage(strip, x, M7.HZ - 34);
    });
    this.renderGround(g);
    // objects, far to near
    const vis = [];
    for (const r of this.rings) if (!r.done || r.prev > -10) { const p = this.project(r, r.a); if (p && p.zc < 1100) vis.push({ o: r, p, kind: 'ring' }); }
    for (const b of this.balloons) { if (b.done && !(b.pop > 0)) continue; const a = b.a + Math.sin(this.t * 0.05 + b.bob) * 2; const p = this.project(b, a); if (p && p.zc < 900) vis.push({ o: b, p, kind: 'balloon' }); }
    for (const c of this.coins) { if (c.done) continue; const p = this.project(c, c.a); if (p && p.zc < 700) vis.push({ o: c, p, kind: 'coin' }); }
    vis.sort((a, b) => b.p.zc - a.p.zc);
    // shadows on the ground first
    g.globalAlpha = 0.3;
    for (const v of vis) if (v.p.gy < H && v.kind !== 'coin') { const s = m7Pick(this.spr.shadow, (v.kind === 'ring' ? 22 : 10) * v.p.k); g.drawImage(s, Math.round(v.p.sx - s.width / 2), Math.round(v.p.gy - s.height / 2)); }
    g.globalAlpha = 1;
    for (const v of vis) {
      const p = v.p;
      if (v.kind === 'ring') {
        const s = m7Pick(this.spr.ring, 26 * p.k);
        if (v.o.got) continue;
        g.drawImage(s, Math.round(p.sx - s.hw), Math.round(p.sy - s.hh));
      } else if (v.kind === 'balloon') {
        if (v.o.pop > 0) { v.o.pop--; const r = Math.max(2, Math.round(6 * p.k)); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; g.fillStyle = i & 1 ? '#ffffff' : '#ffe040'; g.fillRect(Math.round(p.sx + Math.cos(a) * r * (1.4 - v.o.pop / 12)), Math.round(p.sy + Math.sin(a) * r * (1.4 - v.o.pop / 12)), 2, 2); } continue; }
        const s = m7Pick(this.spr.balloon[v.o.col], 10 * p.k);
        g.drawImage(s, Math.round(p.sx - s.width / 2), Math.round(p.sy - s.d / 2 - 2));
      } else {
        const list = this.spr.coin, d = 7 * p.k;
        let s = list[0]; for (const c of list) if (Math.abs(c.width - 3 - d) < Math.abs(s.width - 3 - d)) s = c;
        g.drawImage(s, Math.round(p.sx - s.hw), Math.round(p.sy - s.hh));
      }
    }
    // bullets
    for (const b of this.bullets) { const p = this.project(b, b.a); if (!p) continue; const s = clamp(Math.round(1.6 * p.k), 1, 3); g.fillStyle = (b.life & 2) ? '#fff8c0' : '#ffb020'; g.fillRect(Math.round(p.sx - s / 2), Math.round(p.sy - s), s, s * 2); }
    // the player's plane, seen from behind, with its ground shadow
    const gy = M7.HZ + (this.alt + M7.CAMH) * M7.F / M7.CAMB;
    if (gy < H + 10) { g.globalAlpha = 0.35; const s = m7Pick(this.spr.shadow, 44); g.drawImage(s, W / 2 - s.width / 2, Math.round(gy - s.height / 2)); g.globalAlpha = 1; }
    const bi = clamp(Math.round(this.bank * 2) + 2, 0, 4);
    const ps = this.spr.rear[Game.plane][bi];
    const py = M7.HZ + M7.CAMH * M7.F / M7.CAMB + Math.sin(this.t * 0.08) * 1.5;
    g.drawImage(ps, Math.round(W / 2 - ps.hw), Math.round(py - ps.hh));
    if (Game.plane === 'shinden') { g.globalAlpha = 0.35; pxDisc(g, W / 2, Math.round(py + 1), 7, '#d0d8e0'); g.globalAlpha = 1; }
    // guide arrow toward the next ring
    const next = this.rings.find(r => !r.done);
    if (next) {
      const p = this.project(next, next.a);
      if (!p || p.sx < 4 || p.sx > W - 4 || p.sy < 0) {
        const dx = next.x - this.x, dz = next.z - this.z;
        const side = dx * this.right[0] + dz * this.right[1] > 0 ? 1 : -1;
        if ((this.t >> 3) & 1) Font.draw(g, side > 0 ? '>>' : '<<', side > 0 ? W - 18 : 6, 150, { color: GRAD.gold, outline: '#0a0612' });
      }
    }
    this.drawHUD(g);
  }
  drawHUD(g) {
    Font.draw(g, String(Game.score).padStart(8, '0'), 4, 3, { color: '#ffffff', outline: '#0a0612' });
    Font.draw(g, 'RINGS ' + this.got.rings + '/' + this.total.rings, W - 4, 3, { align: 'right', color: GRAD.gold, outline: '#0a0612' });
    Font.draw(g, 'BALLOONS ' + this.got.balloons, W - 4, 13, { align: 'right', color: GRAD.red, outline: '#0a0612' });
    for (const p of this.pops) Font.draw(g, p.txt, p.x, p.y - (30 - p.t), { align: 'center', color: p.red ? GRAD.red : GRAD.gold, outline: '#0a0612' });
    if (this.phase === 'intro') {
      if ((this.t >> 3) & 1 || this.t > 90) {
        Font.draw(g, 'BONUS FLIGHT', W / 2, 120, { scale: 2, align: 'center', color: GRAD.gold, outline: '#0a0612' });
        Font.draw(g, 'NEXT: ' + this.nextName, W / 2, 140, { align: 'center', color: GRAD.ice, outline: '#0a0612' });
      }
      Font.draw(g, 'FLY THROUGH THE RINGS!', W / 2, 160, { align: 'center', color: '#ffffff', outline: '#0a0612' });
      Font.draw(g, 'SHOOT THE BALLOONS', W / 2, 170, { align: 'center', color: '#ffffff', outline: '#0a0612' });
    }
    if (this.phase === 'results') {
      g.fillStyle = 'rgba(4,2,16,0.6)'; g.fillRect(0, 70, W, 160);
      Font.draw(g, 'BONUS CLEAR!', W / 2, 82, { scale: 2, align: 'center', color: GRAD.gold, outline: '#0a0612' });
      this.lines.forEach(([a, b], i) => { if (this.rt < 20 + i * 15) return; Font.draw(g, a, 50, 116 + i * 16, { color: '#ffffff', outline: '#0a0612' }); Font.draw(g, b, 190, 116 + i * 16, { align: 'right', color: GRAD.gold, outline: '#0a0612' }); });
      if (this.rt > 70) Font.draw(g, this.reward, W / 2, 176, { align: 'center', color: (this.t >> 3) & 1 ? GRAD.pink : GRAD.gold, outline: '#0a0612' });
      if (this.rt > 60 && (this.t >> 4) & 1) Font.draw(g, Input.isTouch ? 'TAP TO CONTINUE' : 'PRESS FIRE', W / 2, 206, { align: 'center', color: '#ffffff', outline: '#0a0612' });
    }
  }
}

Object.assign(Game, {
  startBonus(from, to) {
    this.setState('bonus');
    const next = STAGES.find(st => st.biome === to);
    this.bonus = new BonusStage(from, to, next ? next.name : '');
    Sound.playMusic('bonus');
  },
  u_bonus() {
    if (Input.pressed.start && this.bonus.phase !== 'results') { this.bonusPaused = !this.bonusPaused; Sound.setPaused(this.bonusPaused); }
    if (this.bonusPaused) return;
    this.bonus.update();
    if (this.bonus.finished) { this.bonus = null; this.saveHi(); if (this.stage < STAGES.length - 1) { this.bonusDone = false; this.startStage(this.stage + 1); } }
  },
  r_bonus(g) {
    this.bonus.render(g);
    if (this.bonusPaused) { g.fillStyle = 'rgba(4,2,16,0.6)'; g.fillRect(0, 0, W, H); Font.draw(g, 'PAUSE', W / 2, 140, { scale: 3, align: 'center', color: GRAD.ice, outline: '#0a0612' }); }
  },
});
