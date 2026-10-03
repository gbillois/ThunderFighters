'use strict';
// ============================================================
// Procedural scrolling backgrounds for 5 biomes.
// Terrain canvas (W x len) is generated per stage: coarse noise
// fields -> hillshading -> palette quantization with Bayer
// dithering -> decorations (forged buildings, trees...).
// Water / lava is an animated tile layer drawn beneath.
// ============================================================

const PALS = (() => {
  const P = a => a.map(hexToRgb);
  return {
    sand: P(['#5a3e26', '#7a5834', '#9a7444', '#b89054', '#d0aa6a', '#e4c486', '#f2dca8']),
    beach: P(['#9a8058', '#b89c6c', '#d2b884', '#e6d09c', '#f4e4b8']),
    grass: P(['#16301a', '#1e4222', '#285a2a', '#367234', '#4c8a3c', '#68a248', '#8cbc5c']),
    jungle: P(['#081a10', '#0e2616', '#14341c', '#1c4624', '#265a2c', '#357034', '#4c8a3e', '#6aa64c']),
    rock: P(['#221c22', '#342a30', '#4a3e40', '#625450', '#7c6c64', '#98887c', '#b8a898']),
    mesa: P(['#3a1a12', '#56281a', '#743822', '#924c2c', '#ac6438', '#c47e4a', '#da9c62', '#ecbc84']),
    dirt: P(['#2a1c12', '#3c2a1a', '#523a24', '#6a4c2e', '#82603a', '#9c7848']),
    mud: P(['#2c2414', '#3c321c', '#4e4224', '#62542e']),
    snow: P(['#4e6488', '#6a82a6', '#8aa2c2', '#a8c0da', '#c4d8ec', '#dceaf6', '#f0f8ff', '#ffffff']),
    iceblue: P(['#1a3e64', '#24557e', '#327098', '#4a8cb4', '#6aaad0', '#94cae6']),
    basalt: P(['#0c080c', '#151014', '#1e171c', '#282024', '#342a2e', '#42363a', '#544648', '#6a5a5a']),
    ash: P(['#2e2a2e', '#3e383c', '#504a4c', '#625a5c', '#76706e']),
    glow: P(['#2a0806', '#4a0c08', '#7a1408', '#b02408', '#e04010', '#ff7020', '#ffb040']),
    metal: P(['#14161e', '#1e222c', '#2a303c', '#38404e', '#485262', '#5c6878', '#768496', '#98a6b8']),
    road: P(['#3a342e', '#4a4239', '#5a5046', '#6a6054']),
    pine: P(['#0a1a16', '#10261e', '#173428', '#204434', '#2c5642']),
  };
})();
function pick(ramp, v, x, y, dith = 0.7) {
  const n = ramp.length;
  return ramp[clamp(Math.floor(v * n + (bayer(x, y) - 0.5) * dith), 0, n - 1)];
}

// ---------------- decoration sprites ----------------
function buildDecoSprites() {
  const D = SPR.deco = {};
  const roofFill = (f, x, y, w, h, mat, alongY) => f._fill(f.X(x), f.Y(y), f.X(x + w), f.Y(y + h), (px, py) => {
    const u = alongY ? (px - f.X(x)) / (w) : (py - f.Y(y)) / (h);
    if (px < f.X(x) || px > f.X(x + w) || py < f.Y(y) || py > f.Y(y + h)) return -1;
    return 1 - Math.abs(u - 0.5) * 2;
  }, mat, {});
  D.house = ['rust', 'crimson', 'sand', 'bone'].map(m => forgeSprite(16, 14, f => { roofFill(f, -6, -5, 12, 10, m, false); f.line(-6, 0, 6, 0, 1); }));
  D.houseV = ['rust', 'gun', 'khaki'].map(m => forgeSprite(14, 18, f => { roofFill(f, -5, -7, 10, 14, m, true); }));
  D.hut = ['khaki', 'sand'].map(m => forgeSprite(14, 14, f => { f.circle(0, 0, 5.5, m, { prof: 'dome' }); for (let a = 0; a < 8; a++) f.line(0, 0, Math.cos(a * 0.785) * 5, Math.sin(a * 0.785) * 5, -1); }));
  D.flat = [0, 1, 2].map(i => forgeSprite(18 + i * 4, 16, f => {
    f.rect(-7 - i * 2, -6, 14 + i * 4, 12, 'sand', { bevel: 1.2, amp: 0.6 });
    f.rect(-5 - i * 2, -4, 10 + i * 4, 8, 'sand', { z: 0.2, amp: 0.2, prof: 'flat', shade: -1 });
  }));
  D.hangar = forgeSprite(30, 22, f => { f.ellipse(0, 0, 12, 9, 'gun', { prof: 'cylX' }); for (let x = -10; x <= 10; x += 4) f.line(x, -8, x, 8, -1); });
  D.tankFuel = forgeSprite(14, 14, f => { f.circle(0, 0, 5.5, 'white', { prof: 'dome' }); f.circle(0, 0, 1.5, 'gun', { z: 1.1 }); });
  D.palm = [0, 1, 2].map(i => forgeSprite(18, 18, f => {
    for (let a = 0; a < 6; a++) {
      const an = a / 6 * TAU + i;
      f.capsule(0, 0, Math.cos(an) * 7, Math.sin(an) * 7, 1.6, 'green', { z: 0.6, r2: 0.6 });
    }
    f.circle(0, 0, 1.6, 'olive', { z: 1 });
  }));
  D.pine = [0, 1].map(i => forgeSprite(14, 14, f => {
    const P = [];
    for (let a = 0; a < 14; a++) { const r = a % 2 ? 2.4 : 5.5 - i * 0.5; P.push([Math.cos(a / 14 * TAU) * r, Math.sin(a / 14 * TAU) * r]); }
    f.poly(P, 'green', { bevel: 2.5 });
    f._fill(0, 0, f.w - 1, f.h - 1, (px, py) => (px - f.ox + py - f.oy < -1.5) ? 1 : -1, 'white', { paint: true });
  }));
  D.temple = forgeSprite(42, 42, f => {
    for (let s = 0; s < 4; s++) { const r = 18 - s * 4.2; f.rect(-r, -r, r * 2, r * 2, 'bone', { z: s * 0.6, amp: 0.6, bevel: 1.5 }); }
    f.rect(-2, -18, 4, 9, 'bone', { z: 0.9, amp: 0.3, prof: 'flat', shade: -1 });
  });
  D.boulder = [0, 1, 2].map(i => forgeSprite(12 + i * 4, 10 + i * 3, f => f.ellipse(0, 0, 4 + i * 2, 3 + i * 1.4, 'rock', { prof: 'dome' })));
  D.iceBoulder = [0, 1].map(i => forgeSprite(14 + i * 6, 12 + i * 5, f => f.ellipse(0, 0, 5 + i * 3, 4 + i * 2, 'ice', { prof: 'dome' })));
  D.pad = forgeSprite(40, 40, f => {
    f.circle(0, 0, 18, 'gun', { prof: 'flat', bevel: 3 });
    f.circle(0, 0, 13, 'dark', { prof: 'flat', bevel: 1, z: 0.05 });
    f.roundel(0, 0, [[8, '#e0b020'], [6.5, '#202020']]);
  });
  D.vent = forgeSprite(20, 20, f => {
    f.rect(-8, -8, 16, 16, 'gun', { bevel: 2 });
    for (let y = -6; y <= 6; y += 3) f.line(-6, y, 6, y, -2);
  });
  D.pylon = forgeSprite(14, 14, f => { f.circle(0, 0, 5, 'steel', { prof: 'dome' }); f.circle(0, 0, 2, 'glowR', { z: 1.2 }); });
}

// ---------------- animated liquid tiles ----------------
const LIQUIDS = {
    sea: { ramp: ['#0a2450', '#0e3062', '#123c76', '#184a8a', '#1e5a9e'], crest: ['#5aa0d8', '#bfe6ff'], seed: 11 },
    river: { ramp: ['#14303a', '#183c44', '#1e4a50', '#26585a', '#306862'], crest: ['#6a9a90', '#c8e8d8'], seed: 12 },
    icy: { ramp: ['#08182a', '#0c2036', '#102a44', '#163652', '#1c4262'], crest: ['#5a8ab0', '#d0f0ff'], seed: 13 },
    oasis: { ramp: ['#0c3a48', '#10485a', '#16586a', '#1e6a7c', '#28808e'], crest: ['#70c8d0', '#e0ffff'], seed: 14 },
    lava: { ramp: ['#3a0804', '#6a1006', '#a01c06', '#d43608', '#f45c10'], crest: ['#ffa030', '#fff0a0'], seed: 15 },
  };

function makeLiquidTiles(kind) {
  const S = 64, N = 8, frames = [];
  const cfg = LIQUIDS[kind];
  const ramp = cfg.ramp.map(hexToRgb), crest = cfg.crest.map(hexToRgb);
  for (let k = 0; k < N; k++) {
    const c = makeCanvas(S, S), img = c.ctx.createImageData(S, S), d = img.data;
    const ph = k / N * TAU;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const n1 = fbm(x / S * 4, y / S * 4, cfg.seed, 3, 4, 4);
      const n2 = fbm(x / S * 2 + 7, y / S * 2, cfg.seed + 5, 2, 2, 2);
      const w1 = Math.sin(n1 * TAU * 3 + ph), w2 = Math.sin(n2 * TAU * 2 - ph);
      let v = 0.5 + 0.5 * (0.65 * w1 + 0.35 * w2);
      let col;
      if (cfg.custom) col = cfg.custom(x, y, n1, n2, v, ph, ramp, crest);
      else if (kind === 'lava') {
        const crust = n2 + 0.15 * Math.sin(ph + n1 * 6);
        if (crust > 0.62) col = ramp[crust > 0.7 ? 0 : 1];
        else if (v > 0.93) col = crest[1];
        else if (v > 0.8) col = crest[0];
        else col = ramp[clamp(Math.floor(2 + v * 3 + (bayer(x, y) - 0.5) * 0.8), 0, 4)];
      } else {
        if (v > 0.965 && n1 > 0.45) col = crest[1];
        else if (v > 0.9 && n1 > 0.4) col = crest[0];
        else col = ramp[clamp(Math.floor((n2 * 0.6 + v * 0.4) * 5 + (bayer(x, y) - 0.5) * 0.9), 0, 4)];
      }
      const i = (y * S + x) * 4;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
    c.ctx.putImageData(img, 0, 0);
    frames.push(c);
  }
  return frames;
}

// ---------------- biome definitions ----------------
// field(x,y,seed,len) -> [e, f2]; pixel(e,f2,s,x,y,T) -> [r,g,b,a] | null (transparent)
const T_WATER = 0, T_LAND = 1, T_RAIL = 2, T_ROAD = 3;
const BIOMES = {
  ocean: {
    liquid: 'sea', clouds: 'white', shadeK: 26,
    field(x, y, seed, len) {
      let e = fbm(x * 0.011, y * 0.011, seed, 4) * 0.8 + fbm(x * 0.04, y * 0.04, seed + 9, 2) * 0.2;
      e += 0.12 * Math.sin(y * 0.0017 + seed);
      if (y > len - 360) e += (y - (len - 360)) / 360 * 0.55 * (1 - Math.abs(x - 120) / 260); // home island
      if (y < 900) e -= (900 - y) / 900 * 0.25; // open sea for the boss
      return [e, fbm(x * 0.05, y * 0.05, seed + 3, 2)];
    },
    pixel(e, f2, s, x, y, T) {
      if (e < 0.5) { T.cls(x, y, T_WATER); return e > 0.46 ? (bayer(x, y) < (e - 0.46) / 0.04 * 0.5 ? [90, 200, 210, 70] : null) : null; }
      if (e < 0.555) { T.cls(x, y, T_WATER); const a = 0.3 + (e - 0.5) / 0.055 * 0.4; return bayer(x, y) < 0.5 ? [70, 190, 200, a * 255] : [110, 210, 210, a * 230]; }
      if (e < 0.568) { T.cls(x, y, T_WATER); return hash2(x, y >> 1, 3) > 0.35 ? [235, 250, 255, 220] : [120, 220, 220, 150]; }
      T.cls(x, y, T_LAND);
      if (e < 0.6) return pick(PALS.beach, 0.6 + s * 0.6 + (hash2(x, y, 1) - 0.5) * 0.2, x, y);
      if (e < 0.74) return pick(PALS.grass, 0.55 + s * 0.7 + (f2 - 0.5) * 0.6 + (hash2(x, y, 2) - 0.5) * 0.15, x, y);
      if (e < 0.82) return pick(PALS.jungle, 0.5 + s * 0.8 + (hash2(x, y, 4) - 0.5) * 0.35, x, y);
      return pick(PALS.rock, 0.5 + s * 0.9, x, y);
    },
    decorate(T) {
      const r = T.rng;
      // home airfield runway at the start
      T.runway(120, T.len - 150, 220);
      for (let i = 0; i < 900; i++) {
        const x = r.range(4, W - 4), y = r.range(0, T.len);
        const e = T.eAt(x, y);
        if (e > 0.6 && e < 0.64) T.stamp(r.pick(SPR.deco.palm), x, y, 0.5);
        else if (e > 0.64 && e < 0.72 && r.chance(0.25)) T.stamp(r.pick(SPR.deco.house), x, y, 0.5);
        else if (e > 0.64 && e < 0.7 && r.chance(0.15)) T.stamp(r.pick(SPR.deco.hut), x, y, 0.5);
      }
      T.trees(PALS.jungle, (x, y) => T.eAt(x, y) > 0.72 && T.eAt(x, y) < 0.82, 1400, 3, 7);
    }
  },
  desert: {
    liquid: 'oasis', clouds: 'sand', shadeK: 30,
    railX(y) { return 150 + 45 * Math.sin(y * 0.0018) + 12 * Math.sin(y * 0.0071); },
    field(x, y, seed) {
      const m = fbm(x * 0.0075, y * 0.0075, seed + 5, 4);
      const dune = 0.5 * fbm(x * 0.012, y * 0.012, seed, 3) + 0.06 * Math.sin(x * 0.11 + y * 0.035 + fbm(x * 0.02, y * 0.02, seed + 1, 2) * 7);
      const cliff = clamp((m - 0.58) / 0.025, 0, 1);
      return [dune + cliff * 0.55, m];
    },
    pixel(e, m, s, x, y, T) {
      const rx = this.railX(y);
      // oases
      for (const o of T.oases) { const dd = ((x - o[0]) ** 2) / (o[2] * o[2]) + ((y - o[1]) ** 2) / (o[2] * o[2] * 0.6); if (dd < 1) { T.cls(x, y, T_WATER); return dd > 0.75 ? [60, 150, 140, 140] : null; } if (dd < 1.6) { T.cls(x, y, T_LAND); return pick(PALS.grass, 0.45 + s * 0.5, x, y); } }
      T.cls(x, y, Math.abs(x - rx) < 8 ? T_RAIL : T_LAND);
      if (m > 0.6) {
        const strata = Math.sin(y * 0.5 + x * 0.08 + m * 30) * 0.08;
        return pick(PALS.mesa, 0.6 + s * 0.5 + strata + (hash2(x, y, 7) - 0.5) * 0.12, x, y);
      }
      if (m > 0.575) return pick(PALS.mesa, 0.35 + s * 0.9, x, y);
      const ripple = Math.sin(x * 0.7 + y * 0.25 + e * 30) * 0.05;
      return pick(PALS.sand, 0.55 + s * 0.65 + ripple + (hash2(x, y, 9) - 0.5) * 0.1, x, y);
    },
    prepare(T) {
      const r = T.rng; T.oases = [];
      for (let i = 0; i < 5; i++) T.oases.push([r.range(30, 110), r.range(800, T.len - 600), r.range(14, 24)]);
    },
    decorate(T) {
      const r = T.rng;
      // railway
      for (let y = 0; y < T.len; y += 1) {
        const x = this.railX(y);
        if (y % 5 === 0) T.rectA(x - 6, y, 12, 2, [72, 50, 34, 255]);
        T.rectA(x - 4, y, 1, 1, [150, 156, 170, 255]); T.rectA(x + 3, y, 1, 1, [150, 156, 170, 255]);
        T.rectA(x - 3, y, 1, 1, [70, 72, 84, 255]); T.rectA(x + 4, y, 1, 1, [70, 72, 84, 255]);
      }
      for (const o of T.oases) for (let i = 0; i < 9; i++) { const a = r.range(0, TAU); T.stamp(r.pick(SPR.deco.palm), o[0] + Math.cos(a) * o[2] * 1.2, o[1] + Math.sin(a) * o[2] * 0.95, 0.5); }
      // desert villages
      for (let v = 0; v < 7; v++) {
        const cx = r.range(30, 110), cy = r.range(400, T.len - 400);
        if (T.mAt(cx, cy) > 0.56) continue;
        for (let i = 0; i < 9; i++) T.stamp(r.pick(SPR.deco.flat), cx + r.range(-26, 26), cy + r.range(-22, 22), 0.5);
      }
      for (let i = 0; i < 300; i++) { const x = r.range(0, W), y = r.range(0, T.len); if (T.mAt(x, y) < 0.55 && Math.abs(x - this.railX(y)) > 12) T.stamp(r.pick(SPR.deco.boulder), x, y, 0.45); }
    }
  },
  jungle: {
    liquid: 'river', clouds: 'green', shadeK: 22,
    riverX(y) { return 110 + 62 * Math.sin(y * 0.0024 + 1) + 22 * Math.sin(y * 0.0093); },
    riverW(y) { return 17 + 6 * Math.sin(y * 0.0041) + (y < 900 ? (900 - y) / 900 * 20 : 0); },
    field(x, y, seed) { return [fbm(x * 0.01, y * 0.01, seed, 4), fbm(x * 0.012, y * 0.012, seed + 4, 3)]; },
    pixel(e, f2, s, x, y, T) {
      const dx = Math.abs(x - this.riverX(y)), rw = this.riverW(y);
      if (dx < rw) { T.cls(x, y, T_WATER); return dx > rw - 3 ? [70, 60, 30, 120 + (bayer(x, y) * 60)] : null; }
      T.cls(x, y, T_LAND);
      if (dx < rw + 4) return pick(PALS.mud, 0.5 + s * 0.6 + (hash2(x, y, 3) - 0.5) * 0.3, x, y);
      if (f2 > 0.64) return pick(PALS.dirt, 0.5 + s * 0.6 + (hash2(x, y, 5) - 0.5) * 0.25, x, y);
      if (f2 > 0.6) return pick(PALS.grass, 0.45 + s * 0.6 + (hash2(x, y, 6) - 0.5) * 0.3, x, y);
      return pick(PALS.jungle, 0.25 + s * 0.5, x, y);
    },
    decorate(T) {
      const r = T.rng;
      const isJ = (x, y) => { const dx = Math.abs(x - this.riverX(y)); return dx > this.riverW(y) + 3 && T.mAt(x, y) < 0.6; };
      T.trees(PALS.jungle, isJ, 9000, 4, 9);
      // clearings: villages and ruins
      for (let i = 0; i < 500; i++) {
        const x = r.range(8, W - 8), y = r.range(0, T.len);
        const m = T.mAt(x, y);
        if (m > 0.66 && r.chance(0.5)) T.stamp(r.pick(SPR.deco.hut), x, y, 0.5);
        else if (m > 0.68 && r.chance(0.04)) T.stamp(SPR.deco.temple, x, y, 0.5);
      }
    }
  },
  arctic: {
    liquid: 'icy', clouds: 'snow', shadeK: 28,
    field(x, y, seed) {
      let e = fbm(x * 0.01, y * 0.01, seed, 4) * 0.85 + fbm(x * 0.05, y * 0.05, seed + 2, 2) * 0.15;
      e += 0.1 * Math.sin(y * 0.002 + 2);
      if (y < 1000) e += (1000 - y) / 1000 * 0.25; // glacier plateau for the boss
      return [e, fbm(x * 0.02, y * 0.02, seed + 7, 3)];
    },
    pixel(e, f2, s, x, y, T) {
      if (e < 0.46) {
        T.cls(x, y, T_WATER);
        // ice floes
        const fl = fbm(x * 0.06, y * 0.06, 99, 2);
        if (fl > 0.68) return pick(PALS.snow, 0.7 + (fl - 0.68) * 2 + (x + y & 7 ? 0 : -0.2), x, y);
        if (fl > 0.65) return [200, 230, 250, 140];
        return null;
      }
      T.cls(x, y, T_LAND);
      if (e < 0.475) return pick(PALS.iceblue, 0.35 + s * 0.9, x, y);
      const crev = Math.abs(fbm(x * 0.025, y * 0.025, 55, 3) - 0.5);
      if (crev < 0.012 && e > 0.5) return pick(PALS.iceblue, 0.2 + crev * 20, x, y);
      if (e > 0.8 && s < 0.0) return pick(PALS.rock, 0.4 + s * 0.8, x, y);
      return pick(PALS.snow, 0.62 + s * 0.75 + (hash2(x, y, 8) - 0.5) * 0.06, x, y);
    },
    decorate(T) {
      const r = T.rng;
      for (let i = 0; i < 2600; i++) {
        const x = r.range(4, W - 4), y = r.range(0, T.len);
        const e = T.eAt(x, y), m = T.mAt(x, y);
        if (e > 0.52 && e < 0.72 && m > 0.55) T.stamp(r.pick(SPR.deco.pine), x, y, 0.4);
      }
      for (let i = 0; i < 40; i++) { const x = r.range(20, W - 20), y = r.range(0, T.len); if (T.eAt(x, y) > 0.55 && T.mAt(x, y) < 0.4) { T.stamp(SPR.deco.hangar, x, y, 0.5); T.stamp(SPR.deco.tankFuel, x + 22, y + 4, 0.5); } }
      for (let i = 0; i < 160; i++) { const x = r.range(0, W), y = r.range(0, T.len); if (T.eAt(x, y) < 0.42) T.stamp(r.pick(SPR.deco.iceBoulder), x, y, 0.4); }
    }
  },
  volcano: {
    liquid: 'lava', clouds: 'ash', shadeK: 30,
    fortress: 1900,
    field(x, y, seed) {
      const e = fbm(x * 0.009, y * 0.009, seed, 4);
      const v = Math.abs(fbm(x * 0.012, y * 0.012, seed + 3, 3) - 0.5);
      return [e, v];
    },
    pixel(e, v, s, x, y, T) {
      if (y < this.fortress) return this.plate(x, y, T);
      const lavaV = 0.022;
      if (v < lavaV || e < 0.3) { T.cls(x, y, T_WATER); return null; }
      T.cls(x, y, T_LAND);
      const dv = v - lavaV, de = e - 0.3;
      if (dv < 0.02 || de < 0.025) { const prox = Math.min(dv / 0.02, de / 0.025); return pick(PALS.glow, clamp(0.8 - prox * 0.75 + s * 0.2, 0, 1), x, y); }
      if (T.mAt(x, y) > 0 && fbm(x * 0.03, y * 0.03, 5, 2) > 0.62) return pick(PALS.ash, 0.5 + s * 0.6, x, y);
      return pick(PALS.basalt, 0.45 + s * 0.85 + (hash2(x, y, 11) - 0.5) * 0.15, x, y);
    },
    plate(x, y, T) {
      // armored fortress floor with lava trenches
      const trench = (y % 220) < 14 && (Math.floor(y / 220) % 2 === 0 ? x < 90 || x > 150 : x > 60 && x < 180);
      if (trench) { T.cls(x, y, T_WATER); const ty = y % 220; if (ty < 2 || ty > 11) return pick(PALS.glow, 0.5, x, y); return null; }
      T.cls(x, y, T_LAND);
      const S = 24, px = ((x % S) + S) % S, py = ((y % S) + S) % S;
      const cell = hash2(Math.floor(x / S), Math.floor(y / S), 21);
      let v = 0.42 + cell * 0.15;
      if (px === 0 || py === 0) v = 0.08;
      else if (px === 1 || py === 1) v += 0.28;
      else if (px === S - 1 || py === S - 1) v -= 0.22;
      if ((px === 4 || px === S - 4) && (py === 4 || py === S - 4)) v = 0.95;
      // hazard stripes
      if ((y % 330) > 300 && (y % 330) < 312) { return ((x + y) >> 3) & 1 ? [230, 180, 30, 255] : [24, 22, 28, 255]; }
      // glowing seams
      if (cell > 0.92 && px > 6 && px < S - 6 && py > 10 && py < 13) return [255, 90, 30, 255];
      return pick(PALS.metal, v, x, y, 0.5);
    },
    decorate(T) {
      const r = T.rng;
      for (let i = 0; i < 260; i++) { const x = r.range(0, W), y = r.range(this.fortress, T.len); if (T.eAt(x, y) > 0.42) T.stamp(r.pick(SPR.deco.boulder), x, y, 0.45); }
      for (let i = 0; i < 40; i++) T.stamp(SPR.crater[2 + (i & 1)], r.range(10, W - 10), r.range(this.fortress, T.len), 0);
      for (let i = 0; i < 26; i++) { const y = r.range(80, this.fortress - 60); const x = r.pick([36, 204, 120]); if (!T.isWater(x, y)) T.stamp(r.pick([SPR.deco.pad, SPR.deco.vent, SPR.deco.pylon]), x, y, 0.5); }
    }
  }
};
const STAGE_BIOME = ['ocean', 'desert', 'jungle', 'arctic', 'volcano'];

// ---------------- terrain builder ----------------
class Terrain {
  constructor(biomeKey, len, seed) {
    this.biome = BIOMES[biomeKey]; this.key = biomeKey;
    this.len = len; this.seed = seed;
    this.rng = makeRng(seed * 7 + 3);
    this.cw = W >> 2; this.ch = (len >> 2) + 1;
    this.clsGrid = new Uint8Array(this.cw * this.ch);
    const B = this.biome;
    if (B.prepare) B.prepare(this);
    // coarse fields
    const gw = (W >> 2) + 3, gh = (len >> 2) + 3;
    this.gw = gw; this.gh = gh;
    const E = this.E = new Float32Array(gw * gh), M = this.M = new Float32Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      const [e, m] = B.field((gx - 1) * 4, (gy - 1) * 4, seed, len);
      E[gy * gw + gx] = e; M[gy * gw + gx] = m;
    }
    const Sg = this.S = new Float32Array(gw * gh);
    const k = B.shadeK || 25;
    for (let gy = 1; gy < gh - 1; gy++) for (let gx = 1; gx < gw - 1; gx++) {
      const i = gy * gw + gx;
      const dx = E[i - 1] - E[i + 1], dy = E[i - gw] - E[i + gw];
      Sg[i] = clamp((dx * 0.55 + dy * 0.8) * k, -1, 1) * 0.5;
    }
    // pixels
    this.canvas = makeCanvas(W, len);
    const ctx = this.canvas.ctx;
    const img = ctx.createImageData(W, len), d = img.data;
    for (let y = 0; y < len; y++) {
      for (let x = 0; x < W; x++) {
        const e = this.eAt(x, y), m = this.mAt(x, y), s = this.sAt(x, y);
        const c = B.pixel(e, m, s, x, y, this);
        if (!c) continue;
        const i = (y * W + x) * 4;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = c[3] === undefined ? 255 : c[3];
      }
    }
    this.img = img;
    if (B.decoratePixels) B.decoratePixels(this);
    ctx.putImageData(img, 0, 0);
    this.img = null;
    B.decorate && B.decorate(this);
    this.liquid = makeLiquidTiles(B.liquid);
  }
  _interp(F, x, y) {
    const fx = x / 4 + 1, fy = y / 4 + 1;
    const xi = Math.floor(fx), yi = Math.floor(fy);
    const tx = fx - xi, ty = fy - yi;
    const gw = this.gw;
    const xc = clamp(xi, 0, gw - 2), yc = clamp(yi, 0, this.gh - 2);
    const i = yc * gw + xc;
    const a = F[i], b = F[i + 1], c = F[i + gw], dd = F[i + gw + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + dd) * tx * ty;
  }
  eAt(x, y) { return this._interp(this.E, x, y); }
  mAt(x, y) { return this._interp(this.M, x, y); }
  sAt(x, y) { return this._interp(this.S, x, y); }
  cls(x, y, v) { if ((x & 3) === 0 && (y & 3) === 0) this.clsGrid[(y >> 2) * this.cw + (x >> 2)] = v; }
  clsAt(x, y) {
    x = clamp(Math.floor(x) >> 2, 0, this.cw - 1); y = clamp(Math.floor(y) >> 2, 0, this.ch - 1);
    return this.clsGrid[y * this.cw + x];
  }
  isWater(x, y) { return this.clsAt(x, y) === T_WATER; }
  // draw a sprite with ground shadow onto terrain
  stamp(spr, x, y, shadowA = 0.45, off = 2) {
    const g = this.canvas.ctx;
    const sx = Math.round(x - spr.width / 2), sy = Math.round(y - spr.height / 2);
    if (shadowA > 0 && spr.shadow) { g.globalAlpha = shadowA; g.drawImage(spr.shadow, sx + off, sy + off); g.globalAlpha = 1; }
    g.drawImage(spr, sx, sy);
  }
  rectA(x, y, w, h, c) {
    const g = this.canvas.ctx;
    g.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(c[3] === undefined ? 255 : c[3]) / 255})`;
    g.fillRect(Math.round(x), Math.round(y), w, h);
  }
  runway(cx, cy, len) {
    const g = this.canvas.ctx;
    g.fillStyle = '#2c2c30'; g.fillRect(cx - 14, cy - len / 2, 28, len);
    g.fillStyle = '#3c3c42'; g.fillRect(cx - 13, cy - len / 2 + 1, 26, len - 2);
    g.fillStyle = '#e8e8e0';
    for (let y = cy - len / 2 + 8; y < cy + len / 2 - 8; y += 14) g.fillRect(cx - 1, y, 2, 7);
    for (let i = 0; i < 6; i++) { g.fillRect(cx - 11 + i * 4, cy - len / 2 + 3, 2, 8); g.fillRect(cx - 11 + i * 4, cy + len / 2 - 11, 2, 8); }
    this.stamp(SPR.deco.hangar, cx - 34, cy - 30, 0.5);
    this.stamp(SPR.deco.hangar, cx - 34, cy + 5, 0.5);
    this.stamp(SPR.deco.tankFuel, cx + 28, cy - 20, 0.5);
    this.stamp(SPR.deco.tankFuel, cx + 28, cy - 6, 0.5);
  }
  // canopy of shaded tree crowns
  trees(ramp, test, count, rmin, rmax) {
    const r = this.rng, list = [];
    for (let i = 0; i < count; i++) {
      const x = r.range(-4, W + 4), y = r.range(0, this.len);
      if (!test(clamp(x, 0, W - 1), y)) continue;
      list.push([x, y, r.range(rmin, rmax), r()]);
    }
    list.sort((a, b) => a[1] - b[1]);
    const g = this.canvas.ctx;
    const img = g.getImageData(0, 0, W, this.len), d = img.data;
    const n = ramp.length;
    for (const [cx, cy, rad, v] of list) {
      const x0 = Math.floor(cx - rad - 3), x1 = Math.ceil(cx + rad + 3), y0 = Math.floor(cy - rad - 3), y1 = Math.ceil(cy + rad + 3);
      // shadow
      for (let y = y0 + 3; y <= y1; y++) for (let x = x0 + 2; x <= x1; x++) {
        if (x < 0 || x >= W || y < 0 || y >= this.len) continue;
        const dx = (x - cx - 2.5) / rad, dy = (y - cy - 3) / rad;
        if (dx * dx + dy * dy > 1) continue;
        const i = (y * W + x) * 4; d[i] *= 0.6; d[i + 1] *= 0.6; d[i + 2] *= 0.65;
      }
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (x < 0 || x >= W || y < 0 || y >= this.len) continue;
        const dx = (x + 0.5 - cx) / rad, dy = (y + 0.5 - cy) / rad;
        const leaf = hash2(x, y, 31);
        const dd = dx * dx + dy * dy;
        if (dd > 1 - (leaf < 0.3 ? 0.18 : 0)) continue;
        const h = Math.sqrt(1 - Math.min(1, dd));
        let lit = 0.45 - dx * 0.38 - dy * 0.48 + h * 0.25 + (leaf - 0.5) * 0.28 + (v - 0.5) * 0.15;
        const c = ramp[clamp(Math.floor(lit * n + (bayer(x, y) - 0.5) * 0.8), 1, n - 1)];
        const i = (y * W + x) * 4;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }
}

// ---------------- runtime background ----------------
class Background {
  constructor(key, len, seed = 1) {
    this.key = key;
    this.terrain = new Terrain(key, len, 1000 + seed * 77);
    const stageIndex = seed;
    this.len = len;
    this.scroll = 0;         // pixels scrolled
    this.speed = 0.5;
    this.time = 0;
    this.clouds = [];
    this.cloudSet = SPR.clouds[this.terrain.biome.clouds];
    this.cloudRng = makeRng(stageIndex * 31 + 5);
    for (let i = 0; i < 3; i++) this.spawnCloud(this.cloudRng.range(-40, H));
    if (this.initWeather) this.initWeather();
  }
  get camTop() { return this.len - H - this.scroll; }
  // screen y of a terrain row
  toScreen(ty) { return ty - this.camTop; }
  toTerrain(sy) { return sy + this.camTop; }
  get atEnd() { return this.scroll >= this.len - H; }
  spawnCloud(y) {
    const r = this.cloudRng;
    const spr = r.pick(this.cloudSet);
    this.clouds.push({ spr, x: r.range(-spr.width / 2, W - spr.width / 2), y: y !== undefined ? y : -spr.height, v: r.range(0.9, 1.4) });
  }
  update() {
    this.time++;
    if (this.updateWeather) this.updateWeather();
    const prev = this.scroll;
    this.scroll = Math.min(this.len - H, this.scroll + this.speed);
    this.dy = this.scroll - prev;
    const cloudSpeed = Math.max(this.dy, 0.25);
    for (const c of this.clouds) c.y += cloudSpeed * 2.2 * c.v;
    this.clouds = this.clouds.filter(c => c.y < H + 10);
    if (this.cloudRng() < 0.006 && this.clouds.length < 5) this.spawnCloud();
  }
  drawGround(g, shakeX = 0, shakeY = 0) {
    const top = this.camTop;
    // liquid layer
    const fr = this.terrain.liquid[Math.floor(this.time / 7) % 8];
    const oy = Math.floor(-(top % 64 + 64) % 64);
    const ox = Math.floor((this.time * 0.15) % 64);
    for (let y = oy - 64; y < H + 64; y += 64) for (let x = -ox - 64; x < W + 64; x += 64) g.drawImage(fr, x + shakeX, y + shakeY);
    // terrain
    const sy = Math.floor(top);
    g.drawImage(this.terrain.canvas, 0, sy, W, H + 2, shakeX, shakeY - (top - sy), W, H + 2);
  }
  drawCloudShadows(g) {
    g.globalAlpha = 0.16;
    for (const c of this.clouds) g.drawImage(c.spr.shadow, Math.round(c.x + 26), Math.round(c.y + 40));
    g.globalAlpha = 1;
  }
  drawClouds(g) {
    for (const c of this.clouds) g.drawImage(c.spr, Math.round(c.x), Math.round(c.y));
  }
  // permanent crater decal
  crater(sx, sy, size) {
    const spr = SPR.crater[clamp(size, 0, 3)];
    const ty = this.toTerrain(sy);
    this.terrain.canvas.ctx.drawImage(spr, Math.round(sx - spr.width / 2), Math.round(ty - spr.height / 2));
  }
}
