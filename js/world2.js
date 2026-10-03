'use strict';
// ============================================================
// Expansion worlds: STEEL CITY, STORM SEA, ALPINE FORTRESS,
// STRATOSPHERE. New liquids, palettes, decorations, weather.
// ============================================================

Object.assign(LIQUIDS, {
  canal: { ramp: ['#16241f', '#1b2b25', '#20322b', '#263a31', '#2e4338'], crest: ['#5a6a60', '#a0b0a0'], seed: 21 },
  lake: { ramp: ['#08243f', '#0c2d4d', '#10375c', '#15426c', '#1b4e7c'], crest: ['#6aa8d8', '#e0f4ff'], seed: 22 },
  stormsea: {
    ramp: ['#070d18', '#0a1220', '#0e1828', '#132032', '#1a2a3e'], crest: ['#5c6e86', '#c8d4e2'], seed: 23,
    custom(x, y, n1, n2, v, ph, ramp, crest) {
      // wind-driven diagonal swell, periodic in the 64px tile
      const w = Math.sin(TAU * (x + 2 * y) / 64 + n1 * 7 - ph);
      if (w > 0.94 && n2 > 0.46) return crest[1];
      if (w > 0.82 && n2 > 0.42) return crest[0];
      return ramp[clamp(Math.floor((n2 * 0.65 + (w * 0.5 + 0.5) * 0.35) * 5 + (bayer(x, y) - 0.5) * 0.9), 0, 4)];
    }
  },
  cloudsea: {
    ramp: ['#5a4c8e', '#7462a6', '#9480bc', '#b69ccc', '#d4b8d8'], crest: ['#f0d4e0', '#fff2f0'], seed: 24,
    custom(x, y, n1, n2, v, ph) {
      // big soft cloud tops lit from the rising sun (top-left)
      const h = n2 * 0.8 + n1 * 0.2;
      const nb = fbm((x + 2) / 64 * 2 + 7, (y + 2) / 64 * 2, this.seed + 5, 2, 2, 2) * 0.8 + n1 * 0.2;
      const all = this.ramp.concat(this.crest).map(hexToRgb);
      const lit = clamp(0.62 + (h - nb) * 9 + (h - 0.5) * 0.7 + Math.sin(ph + n1 * 5) * 0.03, 0, 1);
      return all[clamp(Math.floor(lit * all.length + (bayer(x, y) - 0.5) * 0.7), 0, all.length - 1)];
    }
  },
});

(() => {
  const P = a => a.map(hexToRgb);
  Object.assign(PALS, {
    asphalt: P(['#26262c', '#2e2e35', '#36363e', '#3e3e47']),
    concrete: P(['#4a4a52', '#5a5a62', '#6a6a72', '#7c7c84', '#8e8e96']),
    rubble: P(['#2a2422', '#3c3430', '#52463e', '#6a5c50', '#82725f']),
    meadow: P(['#1a3818', '#24501e', '#306a26', '#3e842e', '#56a03a', '#78ba4c', '#a0d064']),
    cloudPink: P(['#5a4c8e', '#7462a6', '#9480bc', '#b69ccc', '#d4b8d8', '#f0d4e0', '#fff2f0']),
  });
})();

// ---------------- decoration sprites ----------------
function buildWorld2Sprites() {
  const D = SPR.deco;
  const rng = makeRng(77);
  // city rooftops: parapet, roof units, water towers
  D.buildings = [];
  const mats = ['gun', 'bone', 'rust', 'steel', 'khaki', 'gun', 'bone'];
  for (let i = 0; i < 28; i++) {
    const w = rng.int(12, 34), h = rng.int(12, 30), m = mats[i % mats.length];
    const b = forgeSprite(w + 4, h + 4, f => {
      f.rect(-w / 2, -h / 2, w, h, m, { bevel: 1.2, amp: 0.7 });
      f.rect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, m, { prof: 'flat', z: 0.15, amp: 0.2, shade: -1 });
      const n = rng.int(0, 3);
      for (let k = 0; k < n; k++) f.rect(rng.range(-w / 2 + 3, w / 2 - 7), rng.range(-h / 2 + 3, h / 2 - 7), 4, 3, 'silver', { z: 0.5, bevel: 1 });
      if (rng.chance(0.3) && w > 18) f.circle(w / 4, -h / 4, 3, 'rust', { z: 0.8 });
      if (rng.chance(0.25)) f.rect(-w / 2 + 3, h / 2 - 5, 3, 2, 'black', { z: 0.4, prof: 'flat' });
    });
    b.bw = w; b.bh = h; b.tall = rng.int(2, 5);
    D.buildings.push(b);
  }
  D.factory = forgeSprite(46, 36, f => {
    for (let i = 0; i < 5; i++) f._fill(f.X(-20 + i * 8), f.Y(-14), f.X(-12 + i * 8), f.Y(14), (px, py) => {
      const u = (px - f.X(-20 + i * 8)) / 8;
      return u >= 0 && u <= 1 ? 0.2 + u * 0.8 : -1;
    }, i % 2 ? 'gun' : 'steel', {});
    f.line(-20, 0, 20, 0, -1);
  });
  D.chimney = forgeSprite(12, 12, f => { f.circle(0, 0, 4.5, 'rust', { prof: 'dome' }); f.circle(0, 0, 2.2, 'black', { z: 1.2, prof: 'flat' }); });
  // alpine castle: walls, corner towers with conical roofs, keep
  D.castle = [0, 1].map(v => forgeSprite(48 + v * 10, 48 + v * 10, f => {
    const R = 17 + v * 5;
    f.rect(-R, -R, R * 2, R * 2, 'bone', { bevel: 2.5, amp: 0.6 });
    f.rect(-R + 4, -R + 4, R * 2 - 8, R * 2 - 8, 'green', { prof: 'flat', z: 0.05, amp: 0.1 });
    for (let k = -R; k < R; k += 4) { f.px(k, -R, '#f0e8d8'); f.px(-R, k, '#f0e8d8'); }
    sym(f, s => { f.circle(R * s, -R, 5, 'bone', { z: 0.6 }); f.circle(R * s, R, 5, 'bone', { z: 0.6 }); });
    for (const [x, y] of [[R, -R], [-R, -R], [R, R], [-R, R]]) f.circle(x, y, 4, 'crimson', { z: 1.0 });
    f.rect(-7, -9, 14, 16, 'bone', { z: 0.8, bevel: 2 });
    f._fill(f.X(-8), f.Y(-10), f.X(8), f.Y(8), (px, py) => { const u = (py - f.Y(-10)) / 18; return u >= 0 && u <= 1 ? 1.4 - Math.abs(u - 0.5) * 1.2 : -1; }, 'crimson', { z: 0.6 });
  }));
  D.chalet = ['rust', 'crimson'].map(m => forgeSprite(16, 18, f => {
    f._fill(f.X(-6), f.Y(-7), f.X(6), f.Y(7), (px, py) => { const u = (px - f.X(-6)) / 12; return u >= 0 && u <= 1 ? 1 - Math.abs(u - 0.5) * 2 : -1; }, m, {});
    f.rect(-6, 6, 12, 1, 'bone', { prof: 'flat' });
  }));
  D.pineG = [0, 1, 2].map(i => forgeSprite(14, 14, f => {
    const P = [];
    for (let a = 0; a < 14; a++) { const r = a % 2 ? 2.4 : 5.5 - i * 0.6; P.push([Math.cos(a / 14 * TAU) * r, Math.sin(a / 14 * TAU) * r]); }
    f.poly(P, 'green', { bevel: 2.5 });
  }));
  D.lighthouse = forgeSprite(20, 20, f => {
    f.circle(0, 0, 7, 'white', { prof: 'dome' });
    f.circle(0, 0, 7, 'red', { paint: true });
    f.circle(0, 0, 5, 'white', { paint: true });
    f.circle(0, 0, 2.5, 'glowY', { z: 1.2 });
  });
  D.pier = forgeSprite(10, 40, f => { f.rect(-3, -18, 6, 36, 'rust', { prof: 'flat', bevel: 1 }); for (let y = -16; y < 18; y += 3) f.line(-3, y, 3, y, -1); });
  // extra cloud sets
  const ramps = {
    storm: ['#58606e', '#464e5c', '#363d4a', '#282e3a', '#1c212c'],
    pink: ['#ffffff', '#fff0f0', '#f8d8e4', '#e0b8d4', '#b898c4'],
  };
  for (const k in ramps) {
    SPR.clouds[k] = [];
    for (let i = 0; i < 6; i++) SPR.clouds[k].push(makeCloud(80 + i * 16, 36 + (i % 3) * 10, 300 + i * 7 + k.length, ramps[k], 0.9));
  }
}

function drawRails(T, railX, y0 = 0, y1 = T.len) {
  for (let y = y0; y < y1; y++) {
    const x = railX(y);
    if (y % 5 === 0) T.rectA(x - 6, y, 12, 2, [72, 50, 34, 255]);
    T.rectA(x - 4, y, 1, 1, [150, 156, 170, 255]); T.rectA(x + 3, y, 1, 1, [150, 156, 170, 255]);
    T.rectA(x - 3, y, 1, 1, [70, 72, 84, 255]); T.rectA(x + 4, y, 1, 1, [70, 72, 84, 255]);
  }
}

// ---------------- biomes ----------------
Object.assign(BIOMES, {
  // ===== STEEL CITY: avenues, blocks, canals with bridges =====
  city: {
    liquid: 'canal', clouds: 'storm', shadeK: 10,
    avenues: [30, 120, 210],
    blockOf(x) { return x < 30 ? 0 : x < 120 ? 1 : x < 210 ? 2 : 3; },
    canal(y) { const k = y % 1500; return k > 700 && k < 746; },
    field(x, y, seed) { return [fbm(x * 0.02, y * 0.02, seed, 2), 0]; },
    pixel(e, m, s, x, y, T) {
      let av = -1;
      for (const a of this.avenues) if (Math.abs(x - a) <= 7) av = a;
      const k = y % 1500;
      if (this.canal(y)) {
        if (av >= 0) { // bridge deck with railings
          T.cls(x, y, T_ROAD);
          if (Math.abs(x - av) === 7) return [150, 150, 160, 255];
          return pick(PALS.asphalt, 0.6, x, y);
        }
        T.cls(x, y, T_WATER);
        if (k < 704 || k > 742) return pick(PALS.concrete, k < 704 ? 0.8 : 0.25, x, y);
        return null;
      }
      const street = (y % 88) < 10;
      if (av >= 0) {
        T.cls(x, y, T_ROAD);
        const d = Math.abs(x - av);
        if (d >= 6) return pick(PALS.concrete, 0.75, x, y);
        if (d === 0 && (y >> 2) & 1) return [220, 180, 50, 255];
        return pick(PALS.asphalt, 0.45 + (hash2(x, y, 3) - 0.5) * 0.4, x, y);
      }
      if (street) {
        T.cls(x, y, T_ROAD);
        const r = y % 88;
        if (r === 0 || r === 9) return pick(PALS.concrete, 0.7, x, y);
        if (r === 5 && (x >> 2) & 1) return [200, 200, 200, 255];
        return pick(PALS.asphalt, 0.45 + (hash2(x, y, 4) - 0.5) * 0.4, x, y);
      }
      T.cls(x, y, T_LAND);
      const h = hash2(this.blockOf(x), Math.floor(y / 88), 7);
      if (h < 0.13) return pick(PALS.grass, 0.45 + (hash2(x, y, 5) - 0.5) * 0.3, x, y);
      if (h < 0.24) return pick(PALS.rubble, 0.5 + (hash2(x >> 1, y >> 1, 6) - 0.5) * 0.7, x, y);
      return pick(PALS.concrete, 0.4 + (hash2(x, y, 8) - 0.5) * 0.15 + e * 0.1, x, y);
    },
    decorate(T) {
      const r = T.rng;
      const spans = [[2, 22], [38, 112], [128, 202], [218, 238]];
      for (let by = 0; by * 88 < T.len; by++) {
        for (let bx = 0; bx < 4; bx++) {
          const [x0, x1] = spans[bx];
          const y0 = by * 88 + 12, y1 = by * 88 + 86;
          if (this.canal(y0) || this.canal(y1) || this.canal((y0 + y1) / 2)) continue;
          const h = hash2(bx, by, 7);
          if (h < 0.13) { // park
            for (let i = 0; i < 14; i++) T.stamp(r.pick(SPR.deco.palm.concat(SPR.deco.pineG)), r.range(x0 + 4, x1 - 4), r.range(y0 + 4, y1 - 4), 0.4);
            continue;
          }
          if (h < 0.24) { // bombed block
            for (let i = 0; i < 3; i++) T.stamp(SPR.crater[r.int(0, 2)], r.range(x0 + 6, x1 - 6), r.range(y0 + 6, y1 - 6), 0);
            for (let i = 0; i < 4; i++) T.stamp(r.pick(SPR.deco.boulder), r.range(x0 + 4, x1 - 4), r.range(y0 + 4, y1 - 4), 0.4);
            continue;
          }
          if (h < 0.33 && x1 - x0 > 50) {
            T.stamp(SPR.deco.factory, (x0 + x1) / 2, (y0 + y1) / 2 - 6, 0.5, 3);
            T.stamp(SPR.deco.chimney, x0 + 8, y1 - 10, 0.5, 4); T.stamp(SPR.deco.chimney, x1 - 8, y1 - 10, 0.5, 4);
            continue;
          }
          // pack buildings in rows, filling the block
          let y = y0;
          while (y < y1 - 10) {
            let x = x0, rowH = 10;
            while (x < x1 - 10) {
              const fits = SPR.deco.buildings.filter(b => b.bw <= x1 - x && b.bh <= y1 - y);
              if (!fits.length) break;
              const b = r.pick(fits);
              T.stamp(b, x + b.bw / 2 + 1, y + b.bh / 2 + 1, 0.5, b.tall);
              rowH = Math.max(rowH, b.bh);
              x += b.bw + r.int(1, 3);
            }
            y += rowH + r.int(2, 4);
          }
        }
      }
    }
  },
  // ===== STORM SEA: dark ocean, rocky islets, night storm =====
  storm: {
    liquid: 'stormsea', clouds: 'storm', shadeK: 30, weather: 'storm',
    field(x, y, seed) {
      let e = fbm(x * 0.012, y * 0.012, seed, 4) * 0.85 + fbm(x * 0.05, y * 0.05, seed + 4, 2) * 0.15;
      if (y < 1100) e -= (1100 - y) / 1100 * 0.25;
      return [e, fbm(x * 0.05, y * 0.05, seed + 1, 2)];
    },
    pixel(e, m, s, x, y, T) {
      if (e < 0.64) {
        T.cls(x, y, T_WATER);
        if (e > 0.615) return bayer(x, y) < (e - 0.615) / 0.025 ? [200, 214, 228, 170] : null;
        return null;
      }
      T.cls(x, y, T_LAND);
      if (e < 0.665) return pick(PALS.rock, 0.25 + s * 0.6, x, y);
      if (m > 0.6 && e > 0.7) return pick(PALS.grass, 0.25 + s * 0.6, x, y);
      return pick(PALS.rock, 0.42 + s * 0.9 + (hash2(x, y, 9) - 0.5) * 0.15, x, y);
    },
    decorate(T) {
      const r = T.rng;
      for (let i = 0; i < 500; i++) {
        const x = r.range(8, W - 8), y = r.range(0, T.len), e = T.eAt(x, y);
        if (e > 0.72 && r.chance(0.04)) T.stamp(SPR.deco.lighthouse, x, y, 0.5, 3);
        else if (e > 0.68 && r.chance(0.2)) T.stamp(r.pick(SPR.deco.boulder), x, y, 0.4);
        else if (e > 0.66 && e < 0.68 && r.chance(0.03)) T.stamp(SPR.deco.pier, x, y + 20, 0.4);
      }
    }
  },
  // ===== ALPINE FORTRESS: peaks, meadows, lakes, castles, railway =====
  alpine: {
    liquid: 'lake', clouds: 'white', shadeK: 44,
    railX(y) { return 120 + 66 * Math.sin(y * 0.0015 + 0.5) + 16 * Math.sin(y * 0.0063); },
    field(x, y, seed) {
      const rid = 1 - Math.abs(fbm(x * 0.009, y * 0.009, seed + 2, 4) * 2 - 1);
      let e = fbm(x * 0.006, y * 0.006, seed, 3) * 0.55 + rid * rid * 0.55;
      const d = Math.abs(x - this.railX(y));
      if (d < 30) e = lerp(0.36, e, clamp((d - 12) / 18, 0, 1));
      return [e, fbm(x * 0.03, y * 0.03, seed + 5, 2)];
    },
    pixel(e, m, s, x, y, T) {
      const d = Math.abs(x - this.railX(y));
      if (e < 0.27 && d > 12) { T.cls(x, y, T_WATER); return e > 0.255 ? pick(PALS.beach, 0.5, x, y) : null; }
      T.cls(x, y, d < 8 ? T_RAIL : T_LAND);
      if (e < 0.44) {
        if (hash2(x, y, 12) > 0.985) return hash2(x, y, 13) > 0.5 ? [240, 220, 80, 255] : [230, 240, 255, 255]; // wild flowers
        return pick(PALS.meadow, 0.45 + s * 0.7 + (m - 0.5) * 0.4, x, y);
      }
      if (e < 0.6) return pick(PALS.jungle, 0.35 + s * 0.7, x, y);
      if (e < 0.73) return pick(PALS.rock, 0.45 + s * 0.9, x, y);
      return pick(PALS.snow, 0.55 + s * 0.8, x, y);
    },
    decorate(T) {
      const r = T.rng;
      drawRails(T, this.railX.bind(this));
      for (let i = 0; i < 3200; i++) {
        const x = r.range(4, W - 4), y = r.range(0, T.len), e = T.eAt(x, y);
        if (Math.abs(x - this.railX(y)) < 14) continue;
        if (e > 0.45 && e < 0.6) T.stamp(r.pick(SPR.deco.pineG), x, y, 0.45);
        else if (e > 0.6 && e < 0.73 && r.chance(0.1)) T.stamp(r.pick(SPR.deco.boulder), x, y, 0.4);
        else if (e > 0.3 && e < 0.42 && r.chance(0.03)) T.stamp(r.pick(SPR.deco.chalet), x, y, 0.5, 3);
      }
      let placed = 0;
      for (let i = 0; i < 400 && placed < 7; i++) {
        const x = r.range(40, W - 40), y = r.range(300, T.len - 400), e = T.eAt(x, y);
        if (e > 0.48 && e < 0.62 && Math.abs(x - this.railX(y)) > 50) { T.stamp(r.pick(SPR.deco.castle), x, y, 0.5, 4); placed++; }
      }
    }
  },
  // ===== STRATOSPHERE: sea of clouds at sunrise =====
  sky: {
    liquid: 'sea', clouds: 'pink', shadeK: 26, noGround: true,
    field(x, y, seed) { return [fbm(x * 0.007, y * 0.007, seed, 4), fbm(x * 0.028, y * 0.028, seed + 3, 3)]; },
    pixel(e, m, s, x, y, T) {
      // a non-repeating sea of clouds far below; rare gaps show the ocean
      T.cls(x, y, T_WATER);
      const h = e * 0.55 + m * 0.45;
      if (h < 0.3) return null;
      if (h < 0.315) return bayer(x, y) < 0.5 ? [120, 100, 170, 255] : null;
      const lm = (m - T.mAt(x + 3, y + 3)) * 7;
      const tower = e > 0.68 ? (e - 0.68) * 2.5 : 0;
      return pick(PALS.cloudPink, 0.68 + s * 0.8 + lm * 0.8 + (h - 0.5) * 0.6 + tower, x, y);
    },
    decorate() { }
  },
});

// ---------------- weather (storm stage) ----------------
Background.prototype.initWeather = function () {
  this.weather = this.terrain.biome.weather || null;
  this.rain = [];
  this.boltT = 200;
  this.flashA = 0;
  if (this.weather === 'storm') for (let i = 0; i < 70; i++) this.rain.push({ x: rnd.range(0, W + 60), y: rnd.range(0, H), l: rnd.int(5, 9), v: rnd.range(6, 8) });
};
Background.prototype.updateWeather = function () {
  if (this.weather !== 'storm') return;
  for (const d of this.rain) { d.x -= d.v * 0.3; d.y += d.v; if (d.y > H + 10) { d.y = -10; d.x = rnd.range(0, W + 60); } }
  if (this.flashA > 0) this.flashA -= 0.08;
  if (--this.boltT <= 0) {
    this.boltT = rnd.int(220, 480);
    this.flashA = 0.55;
    const x = rnd.range(20, W - 20);
    FX.bolt(x + rnd.range(-40, 40), -10, x, rnd.range(80, 220), { life: 9, color: '#c8d8ff' });
    Game.later(rnd.int(15, 40), () => Sound.sfx('thunder', { pan: (x - W / 2) / W }));
  }
};
Background.prototype.drawNight = function (g) {
  if (this.weather !== 'storm') return;
  g.globalAlpha = Math.max(0, 0.42 - this.flashA);
  g.fillStyle = '#040818'; g.fillRect(-10, -10, W + 20, H + 20);
  g.globalAlpha = 1;
};
Background.prototype.drawWeather = function (g) {
  if (this.weather !== 'storm') return;
  g.fillStyle = '#9aa8c4';
  g.globalAlpha = 0.5;
  for (const d of this.rain) for (let i = 0; i < d.l; i++) g.fillRect(Math.round(d.x + i * 0.3), Math.round(d.y - i), 1, 1);
  g.globalAlpha = 1;
  if (this.flashA > 0) { g.globalAlpha = this.flashA * 0.6; g.fillStyle = '#e0e8ff'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
};
