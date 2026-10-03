'use strict';
// ============================================================
// BONUS STAGE: SNES "Mode 7" style pseudo-3D flight.
// A wrapping 512x512 world texture is projected per scanline
// onto a perspective ground plane with dithered distance fog.
// Fly through the golden rings, pop balloons, grab coins.
// ============================================================

const M7 = { HZ: 92, F: 150, CAMB: 40, CAMH: 37, TS: 512 };

const M7THEMES = {
  islands: {
    name: 'TROPICAL SKIES',
    sky: ['#1c4a9c', '#2a62b8', '#3a7ccc', '#5096dc', '#6aaee6', '#88c4ee', '#a8d8f4', '#c8e8f8'],
    fog: '#b8dcf0', far: '#5a8cb8', near: '#3a6a5a', sun: '#fff8d0',
  },
  sunset: {
    name: 'GOLDEN VALLEY',
    sky: ['#1a1040', '#2c1650', '#48205c', '#6c2a60', '#9a3a5a', '#c85450', '#ec7c48', '#ffaa58'],
    fog: '#f0a070', far: '#7a3a60', near: '#4a2a40', sun: '#fff0b0',
  },
};

// ---------- world textures ----------
function m7Texture(kind) {
  const S = M7.TS, buf = new Uint32Array(S * S);
  const pack = c => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
  const P = arr => arr.map(h => pack(hexToRgb(h)));
  const H = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) H[y * S + x] = fbm(x / S * 6, y / S * 6, kind === 'islands' ? 41 : 42, 5, 6, 6);
  const hAt = (x, y) => H[((y & (S - 1)) * S) + (x & (S - 1))];
  if (kind === 'islands') {
    const sea = P(['#0c2c6a', '#123a80', '#1a4a94', '#2660a8', '#3a80c0']), shal = P(['#2a90b8', '#3aa8c4', '#58c0cc']);
    const sand = P(['#c8a868', '#dcc080', '#ecd498']), grass = P(['#2a6a2a', '#3a8030', '#4e983a', '#6aae48']);
    const forest = P(['#163a1c', '#1e4c22', '#2a5e2a']), rock = P(['#5a4c48', '#76665c', '#948272']), snow = P(['#c8d8e8', '#e8f0f8', '#ffffff']);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const h = hAt(x, y), sh = (hAt(x - 1, y - 1) - hAt(x + 1, y + 1)) * 30;
      const d = bayer(x, y) - 0.5;
      const pk = (r, v) => r[clamp(Math.floor(v * r.length + d * 0.8), 0, r.length - 1)];
      let c;
      if (h < 0.5) c = h > 0.47 ? pk(shal, (h - 0.47) / 0.03) : pk(sea, h / 0.47 + (((x * 7 + y * 3) & 31) === 0 ? 0.3 : 0));
      else if (h < 0.52) c = pk(sand, 0.5 + sh);
      else if (h < 0.62) c = pk(grass, 0.5 + sh + (hash2(x >> 3, y >> 3, 3) - 0.5) * 0.4);
      else if (h < 0.7) c = pk(forest, 0.5 + sh + (hash2(x, y, 4) - 0.5) * 0.5);
      else if (h < 0.78) c = pk(rock, 0.5 + sh);
      else c = pk(snow, 0.5 + sh);
      buf[y * S + x] = c;
    }
    // villages: red roof dots
    const r = makeRng(9);
    for (let i = 0; i < 260; i++) {
      const x = r.int(0, S - 1), y = r.int(0, S - 1), h = hAt(x, y);
      if (h > 0.53 && h < 0.6) for (let k = 0; k < 6; k++) { const xx = (x + r.int(-6, 6)) & (S - 1), yy = (y + r.int(-6, 6)) & (S - 1); buf[yy * S + xx] = pack([200, 60, 40]); buf[yy * S + ((xx + 1) & (S - 1))] = pack([140, 40, 30]); }
    }
  } else {
    // golden valley: patchwork fields, hedges, river, forests, hills
    const crops = [P(['#c89a38', '#d8ac48', '#e8c060']), P(['#5a8a2a', '#6a9c34', '#7cae40']), P(['#7a5030', '#8a6038', '#9a7044']), P(['#a8a040', '#bcb24c', '#d0c458'])];
    const forest = P(['#1e3818', '#2a4820', '#36582a']), water = P(['#2a5a8a', '#3a70a0', '#5a90b8']), hedge = pack([40, 60, 28]);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const h = hAt(x, y), sh = (hAt(x - 1, y - 1) - hAt(x + 1, y + 1)) * 34;
      const d = bayer(x, y) - 0.5;
      const pk = (r, v) => r[clamp(Math.floor(v * r.length + d * 0.8), 0, r.length - 1)];
      const rv = Math.abs(x - (256 + 120 * Math.sin(y / S * TAU * 2) + 40 * Math.sin(y / S * TAU * 5)));
      let c;
      if (h < 0.36 || rv < 5) c = pk(water, 0.5 + sh + (rv < 5 ? 0.2 : 0));
      else if (h > 0.64) c = pk(forest, 0.5 + sh + (hash2(x, y, 6) - 0.5) * 0.6);
      else {
        const cx = x >> 5, cy = y >> 5;
        if ((x & 31) === 0 || (y & 31) === 0) c = hedge;
        else {
          const crop = crops[Math.floor(hash2(cx, cy, 8) * crops.length)];
          const stripe = hash2(cx, cy, 9) > 0.5 ? (x & 3) === 0 : (y & 3) === 0;
          c = pk(crop, 0.5 + sh + (stripe ? -0.25 : 0));
        }
      }
      buf[y * S + x] = c;
    }
  }
  return buf;
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
  constructor(themeKey) {
    this.key = themeKey; this.th = M7THEMES[themeKey];
    M7.texCache = M7.texCache || {};
    this.tex = M7.texCache[themeKey] || (M7.texCache[themeKey] = m7Texture(themeKey));
    this.spr = m7Sprites();
    this.GH = H - M7.HZ;
    this.img = new ImageData(W, this.GH);
    this.px32 = new Uint32Array(this.img.data.buffer);
    this.fogRGB = hexToRgb(this.th.fog);
    this.fog32 = (255 << 24) | (this.fogRGB[2] << 16) | (this.fogRGB[1] << 8) | this.fogRGB[0];
    this.buildSky();
    this.x = 256; this.z = 256; this.h = 0; this.alt = 30; this.speed = 3.3; this.bank = 0;
    this.t = 0; this.phase = 'intro';
    this.bullets = []; this.pops = [];
    this.rings = []; this.balloons = []; this.coins = [];
    this.got = { rings: 0, balloons: 0, coins: 0 };
    this.genCourse();
  }
  buildSky() {
    const c = this.sky = makeCanvas(W, M7.HZ), g = c.ctx, cols = this.th.sky.map(hexToRgb);
    const img = g.createImageData(W, M7.HZ), d = img.data;
    for (let y = 0; y < M7.HZ; y++) for (let x = 0; x < W; x++) {
      const v = y / M7.HZ * (cols.length - 1);
      const k = clamp(Math.floor(v + (bayer(x, y) - 0.5) * 0.9 + 0.5), 0, cols.length - 1);
      const i = (y * W + x) * 4; d[i] = cols[k][0]; d[i + 1] = cols[k][1]; d[i + 2] = cols[k][2]; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // distant mountain silhouettes, wrapping around 360 degrees
    const strip = (col, amp, seed) => {
      const s = makeCanvas(720, 30), sg = s.ctx; sg.fillStyle = col;
      for (let x = 0; x < 720; x++) { const hh = Math.round(2 + amp * Math.pow(fbm(x / 720 * 12, 0.5, seed, 3, 12, 0), 1.6) * 1.6); sg.fillRect(x, 30 - hh, 1, hh); }
      return s;
    };
    this.farStrip = strip(this.th.far, 22, 5);
    this.nearStrip = strip(this.th.near, 16, 6);
  }
  genCourse() {
    let x = this.x, z = this.z, h = 0;
    const N = 52;
    for (let i = 0; i < N * 13 + 40; i++) {
      h += 0.0042 * Math.sin(i * 0.011) + 0.0025 * Math.sin(i * 0.037);
      x += Math.sin(h) * 10; z -= Math.cos(h) * 10;
      if (i < 25) continue;
      const k = i - 25;
      if (k % 13 === 0 && k / 13 < N) this.rings.push({ x, z, a: 30 + 18 * Math.sin(k * 0.03) + 8 * Math.sin(k * 0.11), prev: 1e9 });
      if (k % 13 === 6) for (let j = -1; j <= 1; j++) this.coins.push({ x: x - Math.cos(h) * 0, z: z - 0, a: 30 + 18 * Math.sin(k * 0.03) + j * 6, dx: 0 });
      if (k % 40 === 20) {
        const side = (k / 40) & 1 ? 1 : -1;
        for (let j = 0; j < 3; j++) {
          const lat = side * (34 + j * 14);
          this.balloons.push({ x: x + Math.cos(h) * lat, z: z + Math.sin(h) * lat, a: 22 + j * 12, col: j === 1 ? 'blue' : 'red', bob: rnd() * TAU });
        }
      }
    }
    this.total = { rings: this.rings.length, balloons: this.balloons.length, coins: this.coins.length };
  }
  get fwd() { return [Math.sin(this.h), -Math.cos(this.h)]; }
  get right() { return [Math.cos(this.h), Math.sin(this.h)]; }
  update() {
    this.t++;
    if (this.phase === 'results') { this.updateResults(); return; }
    if (this.phase === 'intro' && this.t > 120) this.phase = 'fly';
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
    if (this.phase === 'fly' && ((last && last.done) || this.t > 3400)) { this.phase = 'outro'; this.outroT = 0; }
    if (this.phase === 'outro' && ++this.outroT > 90) this.toResults();
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
    this.reward = perfect ? 'PERFECT! 1UP + 50000' : g.rings >= T.rings * 0.8 ? 'GREAT! BOMB +1' : 'GOOD FLIGHT';
    if (perfect) { Game.lives++; Game.addScore(50000); Sound.sfx('oneup'); }
    else if (g.rings >= T.rings * 0.8) { Game.bombs = Math.min(6, Game.bombs + 1); Sound.sfx('bomb_item'); }
    Sound.playMusic('clear');
  }
  updateResults() {
    this.rt++;
    if ((this.rt > 120 && (Game.confirmPressed() || Game.tapped())) || this.rt > 480) this.finished = true;
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
    const tex = this.tex, px = this.px32, F = M7.F, S1 = M7.TS - 1;
    for (let y = 0; y < this.GH; y++) {
      const zc = ca * F / (y + 1);
      const half = (W / 2) * zc / F;
      let u = cx + fx * zc - rx * half, v = cz + fz * zc - rz * half;
      const du = rx * zc / F, dv = rz * zc / F;
      const fog = clamp((zc - 180) / 620, 0, 1);
      const row = y * W, by = (y & 3) * 4;
      for (let x = 0; x < W; x++) {
        px[row + x] = fog > BAYER4[by + (x & 3)] ? this.fog32 : tex[((v | 0) & S1) * M7.TS + ((u | 0) & S1)];
        u += du; v += dv;
      }
    }
    g.putImageData(this.img, 0, M7.HZ);
  }
  render(g) {
    // sky with heading-parallax mountains
    g.drawImage(this.sky, 0, 0);
    const hdeg = ((this.h % TAU) + TAU) % TAU;
    const sunA = angDiff(this.h, -0.7);
    if (Math.abs(sunA) < 0.9) pxDisc(g, W / 2 + Math.tan(sunA) * M7.F, M7.HZ - 34, 11, this.th.sun);
    for (const [strip, k] of [[this.farStrip, 1], [this.nearStrip, 1.6]]) {
      const off = -Math.floor(hdeg / TAU * 720 * k) % 720;
      for (let x = off - 720; x < W; x += 720) g.drawImage(strip, x, M7.HZ - 30);
    }
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
        Font.draw(g, 'BONUS STAGE', W / 2, 120, { scale: 2, align: 'center', color: GRAD.gold, outline: '#0a0612' });
        Font.draw(g, this.th.name, W / 2, 140, { align: 'center', color: GRAD.ice, outline: '#0a0612' });
      }
      Font.draw(g, 'FLY THROUGH THE RINGS!', W / 2, 160, { align: 'center', color: '#ffffff', outline: '#0a0612' });
      Font.draw(g, 'SHOOT THE BALLOONS', W / 2, 170, { align: 'center', color: '#ffffff', outline: '#0a0612' });
    }
    if (this.phase === 'results') {
      g.fillStyle = 'rgba(4,2,16,0.6)'; g.fillRect(0, 70, W, 160);
      Font.draw(g, 'BONUS CLEAR!', W / 2, 82, { scale: 2, align: 'center', color: GRAD.gold, outline: '#0a0612' });
      this.lines.forEach(([a, b], i) => { if (this.rt < 20 + i * 15) return; Font.draw(g, a, 50, 116 + i * 16, { color: '#ffffff', outline: '#0a0612' }); Font.draw(g, b, 190, 116 + i * 16, { align: 'right', color: GRAD.gold, outline: '#0a0612' }); });
      if (this.rt > 70) Font.draw(g, this.reward, W / 2, 176, { align: 'center', color: (this.t >> 3) & 1 ? GRAD.pink : GRAD.gold, outline: '#0a0612' });
      if (this.rt > 120 && (this.t >> 4) & 1) Font.draw(g, Input.isTouch ? 'TAP TO CONTINUE' : 'PRESS FIRE', W / 2, 206, { align: 'center', color: '#ffffff', outline: '#0a0612' });
    }
  }
}

Object.assign(Game, {
  startBonus(theme) {
    this.setState('bonus');
    this.bonus = new BonusStage(theme);
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
