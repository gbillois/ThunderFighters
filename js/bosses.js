'use strict';
// ============================================================
// Bosses and mid-bosses: big composite machines with
// destructible parts, phases and bullet patterns.
// ============================================================

// ---------- sprite models ----------
function shipModel(L, Wd, hull, deck, mounts) {
  return f => {
    const h = L / 2, w = Wd / 2;
    f.poly(mirrorPoly([[0, h], [w * 0.5, h - L * 0.13], [w, h - L * 0.3], [w, -h + L * 0.14], [w * 0.82, -h + 3], [w * 0.5, -h]]), hull, { bevel: 3 });
    f.poly(mirrorPoly([[0, h - 5], [w * 0.45, h - L * 0.14], [w - 3, h - L * 0.3], [w - 3, -h + L * 0.15], [w * 0.75, -h + 6], [w * 0.42, -h + 3]]), deck, { prof: 'flat', z: 0.35, amp: 0.3 });
    for (let y = -h + 6; y < h - 6; y += 4) f.line(-w + 3, y, w - 3, y, -1);
    f.rect(-w * 0.5, -L * 0.18, w, L * 0.3, hull, { z: 0.5, amp: 0.5, bevel: 2 });
    f.rect(-w * 0.32, -L * 0.13, w * 0.64, L * 0.15, hull, { z: 1.0, amp: 0.5, bevel: 1.5 });
    f.rect(-w * 0.26, -L * 0.005, w * 0.52, 2, 'glass', { z: 1.0, prof: 'flat', amp: 0.2 });
    f.ellipse(0, -L * 0.08, w * 0.2, L * 0.035, 'dark', { z: 1.5 });
    f.ellipse(0, -L * 0.08, w * 0.11, L * 0.02, 'black', { z: 1.6, prof: 'flat' });
    for (const [x, y, r] of mounts) f.circle(x, y, r, 'dark', { prof: 'flat', z: 0.4, bevel: 1 });
    sym(f, s => { for (let y = -h + 14; y < h - 20; y += 9) f.px(s * (w - 2), y, '#d8d0b0'); });
  };
}
function behemothModel(f) {
  sym(f, s => {
    const x0 = s > 0 ? 56 : -76;
    f.rect(x0, -60, 20, 120, 'dark', { z: 0.2, amp: 0.5, bevel: 2 });
    f.rect(x0 + 4, -62, 12, 4, 'gun', { z: 0.3 });
    f.rect(x0 + 4, 58, 12, 4, 'gun', { z: 0.3 });
  });
  f.poly(mirrorPoly([[0, -58], [46, -58], [60, -44], [60, 44], [46, 58], [0, 58]]), 'sand', { bevel: 5, z: 0.4 });
  f.rect(-50, -48, 100, 96, 'khaki', { prof: 'flat', z: 0.55, amp: 0.25 });
  for (let y = -48; y <= 48; y += 16) f.line(-50, y, 50, y, -1);
  for (let x = -48; x <= 48; x += 24) f.line(x, -48, x, 48, -1);
  f.rect(-16, -34, 32, 30, 'sand', { z: 1.0, bevel: 2.5, amp: 0.6 });
  f.rect(-12, -12, 24, 2, 'glassR', { z: 1.2, prof: 'flat', amp: 0.2 });
  for (const [x, y, r] of [[0, 22, 13], [38, -26, 9], [-38, -26, 9], [38, 28, 9], [-38, 28, 9]]) f.circle(x, y, r, 'dark', { prof: 'flat', z: 0.6, bevel: 1 });
  sym(f, s => { f.rect(s * 22 - 6, -54, 12, 12, 'gun', { z: 0.8, bevel: 1.5 }); for (let i = 0; i < 3; i++) f.line(s * 22 - 4, -52 + i * 4, s * 22 + 4, -52 + i * 4, -2); });
}
function condorModel(f) {
  f.poly(mirrorPoly([[0, -24], [26, -30], [52, -22], [78, -28], [106, -16], [106, -8], [44, 18], [0, 38]]), 'dark', { bevel: 5, z: 0.1 });
  for (let x = -96; x <= 96; x += 16) f.line(x, -20, x * 0.4, 30, -1);
  sym(f, s => {
    f.poly([[s * 92, -18], [s * 106, -15], [s * 106, -9], [s * 92, -4]], 'crimson', { paint: true });
    for (const ex of [24, 50, 76]) {
      f.capsule(s * ex, 6 - ex * 0.28, s * ex, -24 - (ex === 50 ? -6 : 0), 4.2, 'gun', { z: 0.6, r2: 3.4 });
      f.ellipse(s * ex, 7 - ex * 0.28, 3, 2, 'black', { z: 0.9 });
    }
    enemyMark(f, s * 64, 2, 3.4);
  });
  f.capsule(0, -26, 0, 30, 11, 'gun', { z: 0.6, r2: 8 });
  f.ellipse(0, 28, 6, 5, 'glassR', { z: 1.3 });
  f.circle(0, 2, 10, 'dark', { prof: 'flat', z: 0.9, bevel: 1.5 });
  for (const [x, y] of [[40, 4], [-40, 4], [86, -6], [-86, -6]]) f.circle(x, y, 7, 'black', { prof: 'flat', z: 0.5, bevel: 1 });
}
function zeppelinModel(f) {
  sym(f, s => {
    f.poly([[s * 30, -70], [s * 56, -96], [s * 58, -104], [s * 26, -94]], 'navy', { z: 0.2, bevel: 2 });
  });
  f.ellipse(0, 0, 44, 102, 'white', { prof: 'cylY' });
  for (let y = -90; y <= 90; y += 12) f.line(-42, y, 42, y, -1);
  f.line(-16, -96, -16, 96, -1); f.line(16, -96, 16, 96, -1);
  f.rect(-3, -110, 6, 30, 'navy', { z: 1.2, bevel: 1 });
  sym(f, s => {
    f.rect(s > 0 ? 26 : -40, -70, 14, 140, 'steel', { paint: true });
    for (const y of [-50, 0, 50]) f.circle(s * 30, y, 8, 'dark', { prof: 'flat', z: 1.05, bevel: 1 });
  });
  f.circle(0, -18, 17, 'steel', { prof: 'flat', z: 1.05, bevel: 2 });
  for (let a = 0; a < 8; a++) f.line(0, -18, Math.cos(a * TAU / 8) * 16, -18 + Math.sin(a * TAU / 8) * 16, -2);
  f.capsule(0, 24, 0, 66, 10, 'gun', { z: 1.3, r2: 8 });
  for (let y = 30; y < 62; y += 6) f.px(-6, y, '#ffe080'), f.px(6, y, '#ffe080');
  enemyMark(f, 0, -60, 6);
}
function citadelModel(f) {
  sym(f, s => {
    f.capsule(s * 96, -44, s * 96, 34, 15, 'gun', { z: 0.4, r2: 12 });
    f.ellipse(s * 96, -46, 10, 5, 'glowR', { z: 0.9 });
    for (let y = -30; y < 30; y += 8) f.line(s * 84, y, s * 108, y, -1);
  });
  f.poly(mirrorPoly([[0, -74], [44, -74], [86, -52], [102, -14], [84, 30], [56, 62], [20, 76], [0, 76]]), 'gun', { bevel: 7, z: 0.6 });
  f.poly(mirrorPoly([[0, -60], [36, -60], [70, -40], [80, -12], [66, 22], [44, 50], [14, 62], [0, 62]]), 'dark', { prof: 'flat', z: 1.0, amp: 0.3 });
  for (let y = -56; y < 60; y += 10) f.line(-74, y, 74, y, -1);
  sym(f, s => {
    f.poly([[s * 36, -60], [s * 44, -60], [s * 82, -12], [s * 74, -12]], 'crimson', { paint: true });
    for (let i = 0; i < 6; i++) f.circle(s * (20 + i * 11), 58 - i * 9, 1.6, 'glowR', { z: 1.5 });
  });
  f.circle(0, 0, 27, 'gun', { z: 1.1, prof: 'dome' });
  for (let a = 0; a < 10; a++) f.line(0, 0, Math.cos(a * TAU / 10) * 26, Math.sin(a * TAU / 10) * 26, -2);
  for (const [x, y] of [[60, -30], [-60, -30], [72, 14], [-72, 14], [40, 42], [-40, 42], [26, -50], [-26, -50]]) f.circle(x, y, 9, 'black', { prof: 'flat', z: 1.05, bevel: 1 });
}
function locoModel(f) {
  f.rect(-11, -26, 22, 52, 'dark', { bevel: 2 });
  f.capsule(0, -4, 0, 24, 8, 'gun', { z: 0.6, r2: 7 });
  for (let y = -2; y < 24; y += 5) f.line(-7, y, 7, y, -1);
  f.circle(0, 16, 3.5, 'black', { z: 1.2 });
  f.rect(-10, -24, 20, 16, 'rust', { z: 0.8, bevel: 2 });
  f.rect(-7, -20, 14, 3, 'glassR', { z: 1, prof: 'flat', amp: 0.2 });
}
function carModel(mat) {
  return f => {
    f.rect(-11, -20, 22, 40, mat, { bevel: 2.5 });
    f.rect(-8, -17, 16, 34, mat, { z: 0.4, prof: 'flat', amp: 0.2 });
    for (let y = -16; y < 18; y += 6) f.line(-8, y, 8, y, -1);
    f.circle(0, 0, 7, 'dark', { prof: 'flat', z: 0.5, bevel: 1 });
  };
}
function coreSprite(glow, ring) {
  return forgeSprite(30, 30, f => {
    f.circle(0, 0, 13, ring, { prof: 'flat', bevel: 3 });
    f.circle(0, 0, 9, glow, { z: 0.5 });
    for (let a = 0; a < 6; a++) f.line(Math.cos(a * TAU / 6) * 10, Math.sin(a * TAU / 6) * 10, Math.cos(a * TAU / 6) * 13, Math.sin(a * TAU / 6) * 13, -2);
  });
}
function podSprite() {
  return forgeSprite(22, 22, f => {
    f.rect(-9, -9, 18, 18, 'gun', { bevel: 2 });
    for (let x = -6; x <= 6; x += 6) for (let y = -6; y <= 6; y += 6) f.circle(x, y, 1.8, 'black', { prof: 'flat', z: 0.6 });
  });
}
function engineSprite() {
  return forgeSprite(18, 18, f => { f.circle(0, 0, 7, 'gun', { prof: 'dome' }); f.circle(0, 0, 3.5, 'glowY', { z: 1 }); });
}

function buildBossSprites() {
  SPR.boss = {};
  SPR.boss.ship1 = forgeSprite(74, 186, shipModel(176, 64, 'gun', 'steel', [[0, 50, 10], [0, 26, 10], [0, -56, 10], [22, 6, 7], [-22, 6, 7], [22, -32, 7], [-22, -32, 7]]));
  SPR.boss.cruiser = forgeSprite(54, 130, shipModel(120, 44, 'gun', 'sand', [[0, 32, 8], [0, -34, 8]]));
  SPR.boss.icebreaker = forgeSprite(58, 136, shipModel(126, 48, 'white', 'steel', [[0, 34, 8], [0, -36, 8], [14, 0, 6], [-14, 0, 6]]));
  SPR.boss.behemoth = forgeSprite(168, 134, behemothModel);
  SPR.boss.condor = forgeSprite(222, 84, condorModel, { oy: 40 });
  SPR.boss.zeppelin = forgeSprite(124, 222, zeppelinModel);
  SPR.boss.citadel = forgeSprite(232, 162, citadelModel);
  SPR.boss.loco = forgeSprite(28, 58, locoModel);
  SPR.boss.car = forgeSprite(28, 46, carModel('rust'));
  SPR.boss.bigBomber = {};
  for (const pn of ['olive', 'dark', 'purple', 'steel']) SPR.boss.bigBomber[pn] = forgeSprite(112, 84, f => { f.sx = 1.7; f.sy = -1.7; ENEMY_MODELS.bomber(f, ENEMY_PAL[pn]); });
  SPR.core = { red: coreSprite('glowR', 'gun'), blue: coreSprite('glowB', 'steel'), purple: coreSprite('glowP', 'dark'), yellow: coreSprite('glowY', 'gun') };
  SPR.pod = podSprite();
  SPR.engine = engineSprite();
  SPR.wreck = makeCrater(18, 9);
}

// ---------- Boss runtime ----------
class Boss {
  constructor(def, o = {}) {
    this.def = def; this.o = o;
    this.mid = !!def.mid; this.isBoss = true;
    this.x = o.x !== undefined ? o.x : W / 2; this.y = o.y !== undefined ? o.y : -def.enterY;
    this.ground = !!def.ground;
    this.body = def.body();
    this.t = 0; this.flash = 0; this.phase = 0; this.active = false;
    const hpMul = Game.D.hp * (o.hpMul || 1) * (def.mid ? 1.4 : 1.8);
    this.parts = def.parts.map(p => {
      const part = Object.assign({ alive: true, ang: Math.PI / 2, flash: 0, wpn: null, armored: false, owner: this }, p);
      part.hp = part.maxHp = Math.round(p.hp * hpMul);
      part.damage = dmg => this.damagePart(part, dmg);
      return part;
    });
    this.maxHp = this.parts.reduce((a, p) => a + p.maxHp, 0);
    this.ai = def.ai(this);
    this.r = 0;
  }
  P(name) { return this.parts.find(p => p.name === name); }
  alive(...names) { return names.some(n => { const p = this.P(n); return p && p.alive; }); }
  get hp() { return this.parts.reduce((a, p) => a + (p.alive ? p.hp : 0), 0); }
  wx(p) { return this.x + p.x; }
  wy(p) { return this.y + p.y; }
  tip(p, len = 12) { return [this.wx(p) + Math.cos(p.ang) * len, this.wy(p) + Math.sin(p.ang) * len]; }
  canFire() { const pl = Game.player; return pl && pl.alive && !Game.bombActive() && this.active && this.y > -20; }
  arm(name, every, fn, k = 0) { const p = this.P(name); if (p) p.wpn = { every, fn, k }; }
  *moveTo(x, y, frames) {
    const sx = this.x, sy = this.y;
    for (let i = 1; i <= frames; i++) { const t = easeInOut(i / frames); this.x = lerp(sx, x, t); this.y = lerp(sy, y, t); yield; }
  }
  *wait(n) { for (let i = 0; i < n; i++) yield; }
  update() {
    this.t++;
    if (!this.dead) {
      // AI scripts place the boss on absolute paths; when a phase change swaps the
      // path, glide to it instead of teleporting
      const px = this.x, py = this.y;
      this.ai.next();
      if (this.t > 1) {
        const dx = this.x - px, dy = this.y - py;
        if (Math.abs(dx) > 2.5) this.x = px + clamp(dx * 0.1, -2.5, 2.5) + (dx > 0 ? 1 : -1) * 0.5;
        if (Math.abs(dy) > 2.5) this.y = py + clamp(dy * 0.1, -2.5, 2.5) + (dy > 0 ? 1 : -1) * 0.5;
      }
    }
    else if (this.mid && this.ground) { this.y += Game.bg.dy + 0.15; if (this.y - this.body.height / 2 > H) this.gone = true; }
    if (this.ground && this.def.scrollWithGround) this.y += Game.bg.dy;
    const pl = Game.player;
    for (const p of this.parts) {
      if (p.flash > 0) p.flash--;
      if (!p.alive) { if (this.t % 7 === 0) FX.smoke(this.wx(p) + rnd.range(-4, 4), this.wy(p), { dark: true, size: 1, vy: -0.4, ground: false }); continue; }
      if (p.aim && pl) p.ang += clamp(angDiff(p.ang, angleTo(this.wx(p), this.wy(p), pl.x, pl.y)), -0.045, 0.045);
      if (p.wpn && !p.armored && this.canFire()) {
        p.wpn.k++;
        const ev = Math.max(4, Math.round(p.wpn.every / Game.D.rate));
        if (p.wpn.k % ev === 0) p.wpn.fn(this, p, Math.floor(p.wpn.k / ev));
      }
    }
    if (this.flash > 0) this.flash--;
    const ratio = this.hp / this.maxHp;
    if (ratio < 0.5 && this.t % (ratio < 0.25 ? 3 : 7) === 0) {
      const bw = this.body.width * 0.7, bh = this.body.height * 0.7;
      FX.smoke(this.x + rnd.range(-bw / 2, bw / 2), this.y + rnd.range(-bh / 2, bh / 2), { dark: true, vy: -0.5, size: rnd.int(0, 1) });
      if (ratio < 0.25 && this.t % 9 === 0) FX.anim(SPR.expl.s[0], this.x + rnd.range(-bw / 2, bw / 2), this.y + rnd.range(-bh / 2, bh / 2), {});
    }
    if (this.def.exitBelow && this.y > H + this.body.height / 2) this.gone = true;
  }
  hit(x, y, r) {
    if (!this.active) return null;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      if (!p.alive || p.armored) continue;
      const rr = p.r + r;
      if (dist2(x, y, this.wx(p), this.wy(p)) < rr * rr) return p;
    }
    return null;
  }
  // bullets hitting armor / hull are absorbed (sparks) without damage
  blocks(x, y) {
    const b = this.body;
    if (Math.abs(x - this.x) > b.width * 0.42 || Math.abs(y - this.y) > b.height * 0.42) return false;
    const px = Math.floor(x - this.x + b.width / 2), py = Math.floor(y - this.y + b.height / 2);
    if (!b.alphaMap) {
      const d = b.ctx.getImageData(0, 0, b.width, b.height).data;
      b.alphaMap = new Uint8Array(b.width * b.height);
      for (let i = 0; i < b.alphaMap.length; i++) b.alphaMap[i] = d[i * 4 + 3] > 0 ? 1 : 0;
    }
    if (px < 0 || py < 0 || px >= b.width || py >= b.height) return false;
    if (!this.active || b.alphaMap[py * b.width + px] !== 1) return false;
    // shots fly over the hull toward any target in their column; otherwise the armor absorbs them
    for (const p of this.parts) if (p.alive && !p.armored && Math.abs(this.wx(p) - x) < p.r + 3 && this.wy(p) < y) return false;
    return true;
  }
  damagePart(p, dmg) {
    if (!p.alive || this.dead) return;
    p.hp -= dmg; p.flash = 2; this.flash = 2;
    Game.addGauge(dmg);
    if (p.hp <= 0) {
      p.alive = false;
      const x = this.wx(p), y = this.wy(p);
      FX.explode(x, y, p.r > 12 ? 'l' : 'm', {});
      Game.addScore(p.score || 3000);
      FX.text(x, y - 8, p.score || 3000);
      if (p.onDeath) p.onDeath(this, p);
      if (this.parts.filter(q => q.core).every(q => !q.alive)) this.kill();
    }
  }
  kill() {
    if (this.dead) return;
    this.dead = true;
    for (const p of this.parts) if (p.alive) { p.alive = false; FX.explode(this.wx(p), this.wy(p), 'm'); }
    const bonus = this.mid ? 20000 : 50000 + Game.stage * 25000;
    Game.addScore(bonus);
    if (this.mid) {
      FX.explode(this.x, this.y, 'l', { ground: this.ground });
      for (let i = 0; i < 6; i++) Game.later(i * 8, () => FX.explode(this.x + rnd.range(-30, 30), this.y + rnd.range(-30, 30), 'm', { ground: this.ground }));
      FX.text(this.x, this.y, bonus, { scale: 1, life: 90 });
      Game.cancelBullets(true);
      Game.spawnItem(Game.stage % 2 ? 'B' : 'P', this.x, this.y);
      for (let i = 0; i < 5; i++) Game.spawnItem('medal', this.x + rnd.range(-30, 30), this.y + rnd.range(-20, 20));
      if (!this.ground) this.dying = 30;
      else this.wreck = true;
    } else {
      FX.bossDeath(this.x, this.y, this.body.width * 0.8, this.body.height * 0.7);
      Game.cancelBullets(true);
      Game.later(170, () => { FX.text(this.x, this.y, bonus, { scale: 2, life: 120 }); });
      this.dying = 175;
    }
    if (this.def.onKill) this.def.onKill(this);
  }
  draw(g) {
    const x = Math.round(this.x), y = Math.round(this.y), b = this.body;
    if (this.dying !== undefined) {
      this.dying--;
      if (this.dying <= 0) { this.gone = true; return; }
      if (this.dying < 10) return;
    }
    if (this.def.drawUnder) this.def.drawUnder(this, g);
    const body = this.bodyOverride || b;
    g.drawImage(body, x - Math.round(body.width / 2), y - Math.round(body.height / 2));
    if (this.def.drawExtra) this.def.drawExtra(this, g);
    for (const p of this.parts) {
      const px = Math.round(this.wx(p)), py = Math.round(this.wy(p));
      if (!p.alive) { if (p.wreck !== false) g.drawImage(SPR.wreck, px - 9, py - 9); continue; }
      if (p.armored || !p.spr) continue;
      const s = typeof p.spr === 'function' ? p.spr(this, p) : p.spr;
      const fl = p.flash > 0 && (Game.t & 2);
      const sp = fl && s.flash ? s.flash : s;
      if (Array.isArray(s)) {
        const fr = rotFrame(s, p.ang, -Math.PI / 2);
        g.drawImage(fl ? fr.flash : fr, px - Math.round(fr.hw), py - Math.round(fr.hh));
      } else g.drawImage(sp, px - Math.round(s.width / 2), py - Math.round(s.height / 2));
    }
    if (this.def.drawOver && !this.dead) this.def.drawOver(this, g);
    if (this.wreck) { g.globalAlpha = 0.55; g.drawImage(b.shadow, x - Math.round(b.width / 2), y - Math.round(b.height / 2)); g.globalAlpha = 1; }
    if (this.flash > 0 && !this.dead && (Game.t & 2)) { g.globalAlpha = 0.25; g.drawImage(b.flash, x - Math.round(b.width / 2), y - Math.round(b.height / 2)); g.globalAlpha = 1; }
  }
  drawShadow(g) {
    if (this.ground || (this.dying !== undefined && this.dying < 10)) return;
    const b = this.body;
    if (!b.shadowB) b.shadowB = scaledShadow(b, 0.7);
    g.globalAlpha = 0.25;
    g.drawImage(b.shadowB, Math.round(this.x + 22 - b.shadowB.width / 2), Math.round(this.y + 40 - b.shadowB.height / 2));
    g.globalAlpha = 1;
  }
}

// ---------- shared weapon patterns ----------
const W_ = {
  aimed: (n, spread, spd, type, len = 12) => (B, p) => { const [x, y] = B.tip(p, len); Shoot.aimed(x, y, { n, spread, speed: spd, type }); },
  burst: (count, gap, spd, type, len = 12) => (B, p) => { for (let i = 0; i < count; i++) Game.later(i * gap, () => { if (p.alive && B.canFire()) { const [x, y] = B.tip(p, len); Shoot.bullet(x, y, p.ang, spd, type); } }); Sound.sfx('enemy_shot'); },
  ring: (n, spd, type) => (B, p, k) => Shoot.ring(B.wx(p), B.wy(p), { n, speed: spd, type, off: k * 0.13 }),
  spiral: (arms, spd, type, step = 0.21) => (B, p, k) => { for (let a = 0; a < arms; a++) Shoot.bullet(B.wx(p), B.wy(p), k * step + a * TAU / arms, spd, type); },
  fan: (n, spread, spd, type) => (B, p) => Shoot.arc(B.wx(p), B.wy(p) + 6, { n, spread, speed: spd, type, ang: Math.PI / 2 }),
};

// ---------- definitions ----------
const BOSSES = {
  // ===== Stage 1 midboss: cruiser =====
  cruiser: {
    mid: true, ground: true, enterY: 70, exitBelow: true, name: 'CRUISER',
    body: () => SPR.boss.cruiser,
    parts: [
      { name: 'fwd', x: 0, y: 32, r: 8, hp: 90, aim: true, score: 2000 },
      { name: 'aft', x: 0, y: -34, r: 8, hp: 90, aim: true, score: 2000 },
      { name: 'bridge', x: 0, y: -6, r: 11, hp: 200, core: true, score: 5000, wreck: false },
    ],
    ai: function* (B) {
      B.P('fwd').spr = SPR.turret.twin; B.P('aft').spr = SPR.turret.twin;
      B.active = true;
      B.arm('fwd', 70, W_.aimed(3, 0.22, 2, 'pink_s'));
      B.arm('aft', 90, W_.burst(4, 5, 2.4, 'orange_s'), 30);
      B.arm('bridge', 120, W_.ring(14, 1.3, 'orange_m'), 60);
      for (;;) { B.y += B.y < 90 ? 0.6 : 0.12; B.x = W / 2 + Math.sin(B.t * 0.01) * 30; yield; }
    }
  },
  // ===== Stage 1 boss: battleship =====
  leviathan: {
    ground: true, enterY: 110, name: 'STEEL LEVIATHAN',
    body: () => SPR.boss.ship1,
    parts: [
      { name: 'aa1', x: 22, y: 6, r: 7, hp: 70, aim: true, score: 2000 },
      { name: 'aa2', x: -22, y: 6, r: 7, hp: 70, aim: true, score: 2000 },
      { name: 'aa3', x: 22, y: -32, r: 7, hp: 70, aim: true, score: 2000 },
      { name: 'aa4', x: -22, y: -32, r: 7, hp: 70, aim: true, score: 2000 },
      { name: 'mainA', x: 0, y: 50, r: 11, hp: 240, aim: true, score: 5000 },
      { name: 'mainB', x: 0, y: 26, r: 11, hp: 240, aim: true, score: 5000 },
      { name: 'rear', x: 0, y: -56, r: 10, hp: 200, aim: true, score: 4000 },
      { name: 'core', x: 0, y: -12, r: 13, hp: 520, core: true, armored: true, score: 10000, wreck: false },
    ],
    drawExtra(B, g) {
      // bow wake
      g.fillStyle = 'rgba(255,255,255,0.75)';
      for (let i = 0; i < 14; i++) { const k = (B.t * 0.7 + i * 9) % 60; g.fillRect(Math.round(B.x - 4 - k * 0.6 + Math.sin(i) * 2), Math.round(B.y + 88 + k * 0.4), 2, 1); g.fillRect(Math.round(B.x + 3 + k * 0.6 + Math.cos(i) * 2), Math.round(B.y + 88 + k * 0.4), 2, 1); }
    },
    ai: function* (B) {
      for (const n of ['aa1', 'aa2', 'aa3', 'aa4']) B.P(n).spr = SPR.turret.small;
      B.P('mainA').spr = SPR.turret.triple; B.P('mainB').spr = SPR.turret.triple; B.P('rear').spr = SPR.turret.big;
      B.P('core').spr = SPR.core.red;
      yield* B.moveTo(W / 2, 92, 200);
      B.active = true;
      B.arm('mainA', 80, W_.aimed(3, 0.18, 2.1, 'pink_m', 16));
      B.arm('mainB', 80, W_.aimed(5, 0.14, 1.8, 'pink_s', 16), 40);
      ['aa1', 'aa2', 'aa3', 'aa4'].forEach((n, i) => B.arm(n, 64, W_.burst(3, 6, 2.6, 'orange_s', 9), i * 16));
      B.arm('rear', 130, W_.ring(18, 1.4, 'orange_m'), 50);
      while (B.alive('mainA', 'mainB')) { B.x = W / 2 + Math.sin(B.t * 0.008) * 26; yield; }
      // phase 2: the deck opens
      B.P('core').armored = false; Game.shake(6); Sound.sfx('explode_l');
      FX.text(B.x, B.y - 30, 'CORE EXPOSED', { color: GRAD.red, life: 80 });
      B.arm('core', 6, W_.spiral(3, 1.5, 'pink_s', 0.19));
      let k = 0;
      for (;;) {
        k++;
        B.x = W / 2 + Math.sin(B.t * 0.012) * 40;
        if (k % 360 === 180) B.arm('core', 70, (B, p) => { Shoot.ring(B.wx(p), B.wy(p), { n: 22, speed: 1.6, type: 'blue_m', aim: true }); });
        if (k % 360 === 0) B.arm('core', 6, W_.spiral(3, 1.5, 'pink_s', 0.19 * (k % 720 ? -1 : 1)));
        yield;
      }
    }
  },
  // ===== Stage 2 midboss: armored train =====
  train: {
    mid: true, ground: true, enterY: 0, name: 'ARMORED TRAIN',
    body: () => { if (!SPR.boss.empty) SPR.boss.empty = finishSprite(makeCanvas(2, 2)); return SPR.boss.empty; },
    parts: [
      { name: 'loco', x: 0, y: 0, r: 11, hp: 220, core: true, score: 6000, base: 'loco' },
      { name: 'c1', x: 0, y: -50, r: 10, hp: 110, aim: true, score: 3000, base: 'car' },
      { name: 'c2', x: 0, y: -98, r: 10, hp: 110, aim: true, score: 3000, base: 'car' },
      { name: 'c3', x: 0, y: -146, r: 10, hp: 110, aim: true, score: 3000, base: 'car' },
    ],
    drawExtra(B, g) {
      for (const p of B.parts) {
        const s = SPR.boss[p.base];
        g.drawImage(p.flash > 0 && p.alive ? s.flash : s, Math.round(B.wx(p) - s.width / 2), Math.round(B.wy(p) - s.height / 2));
      }
    },
    ai: function* (B) {
      const B0 = Game.bg.terrain.biome.railX ? Game.bg.terrain.biome : BIOMES.desert;
      const rail = B0.railX.bind(B0);
      B.P('c1').spr = SPR.turret.sand; B.P('c2').spr = SPR.turret.sand; B.P('c3').spr = SPR.turret.sand;
      B.P('loco').spr = null;
      let ty = Game.bg.toTerrain(-30);
      B.active = true;
      B.arm('c1', 60, W_.aimed(3, 0.2, 2, 'orange_s'));
      B.arm('c2', 60, W_.burst(3, 6, 2.4, 'pink_s'), 20);
      B.arm('c3', 60, W_.aimed(3, 0.2, 2, 'orange_s'), 40);
      B.arm('loco', 100, W_.ring(12, 1.4, 'pink_m'), 50);
      for (;;) {
        ty -= B.t < 160 ? -0.2 : 0.38; // train drives forward
        B.y = Game.bg.toScreen(ty); B.x = rail(ty);
        for (const p of B.parts) { p.x = rail(ty + p.y) - B.x; }
        if (B.t % 6 === 0 && B.alive('loco')) FX.smoke(B.x, B.y + 16, { size: 1, vy: -0.3, dark: true });
        if (B.y - 170 > H) { B.gone = true; }
        yield;
      }
    }
  },
  // ===== Stage 2 boss: land fortress =====
  behemoth: {
    ground: true, enterY: 90, name: 'SAND BEHEMOTH',
    body: () => SPR.boss.behemoth,
    parts: [
      { name: 'podL', x: -22, y: -48, r: 7, hp: 120, score: 3000 },
      { name: 'podR', x: 22, y: -48, r: 7, hp: 120, score: 3000 },
      { name: 't1', x: 38, y: -26, r: 8, hp: 110, aim: true, score: 2500 },
      { name: 't2', x: -38, y: -26, r: 8, hp: 110, aim: true, score: 2500 },
      { name: 't3', x: 38, y: 28, r: 8, hp: 110, aim: true, score: 2500 },
      { name: 't4', x: -38, y: 28, r: 8, hp: 110, aim: true, score: 2500 },
      { name: 'main', x: 0, y: 22, r: 12, hp: 380, aim: true, score: 8000 },
      { name: 'core', x: 0, y: -20, r: 13, hp: 600, core: true, armored: true, score: 12000, wreck: false },
    ],
    drawExtra(B, g) {
      g.fillStyle = '#0c0c12';
      const off = Math.floor(B.t * 0.6) % 6;
      for (const sx of [-66, 66]) for (let y = -58 + off; y < 58; y += 6) g.fillRect(Math.round(B.x + sx - 9), Math.round(B.y + y), 18, 1);
    },
    ai: function* (B) {
      for (const n of ['t1', 't2', 't3', 't4']) B.P(n).spr = SPR.turret.sand;
      B.P('main').spr = SPR.turret.big; B.P('podL').spr = SPR.pod; B.P('podR').spr = SPR.pod; B.P('core').spr = SPR.core.yellow;
      yield* B.moveTo(W / 2, 84, 220);
      B.active = true;
      B.arm('main', 90, (B, p) => { const [x, y] = B.tip(p, 18); Shoot.aimed(x, y, { n: 1, speed: 2.2, type: 'pink_l' }); Game.later(12, () => p.alive && Shoot.aimed(x, y, { n: 5, spread: 0.2, speed: 1.7, type: 'pink_s' })); });
      ['t1', 't2', 't3', 't4'].forEach((n, i) => B.arm(n, 75, W_.aimed(2, 0.25, 2.1, 'orange_s', 11), i * 18));
      const rockets = (B, p) => { const e = Spawn.e('rocket', B.wx(p), B.wy(p), { ai: 'chase', speed: 2.2, ang: -Math.PI / 2 + rnd.range(-0.6, 0.6), pal: 'sand' }); e.score = 50; Sound.sfx('missile'); };
      B.arm('podL', 110, rockets); B.arm('podR', 110, rockets, 55);
      while (B.alive('main')) { B.x = W / 2 + Math.sin(B.t * 0.007) * 34; yield; }
      B.P('core').armored = false; Game.shake(6); Sound.sfx('explode_l');
      FX.text(B.x, B.y - 40, 'CORE EXPOSED', { color: GRAD.red, life: 80 });
      B.arm('core', 5, (B, p, k) => { for (let a = 0; a < 2; a++) Shoot.bullet(B.wx(p), B.wy(p), Math.sin(k * 0.06) * 1.4 + Math.PI / 2 + a * Math.PI, 1.7, 'orange_s'); });
      let k = 0;
      for (;;) {
        k++; B.x = W / 2 + Math.sin(B.t * 0.01) * 44;
        if (k % 300 === 150) B.arm('core', 50, (B, p) => Shoot.ring(B.wx(p), B.wy(p), { n: 24, speed: 1.5, type: 'pink_m', aim: true }));
        if (k % 300 === 0) B.arm('core', 5, (B, p, kk) => { for (let a = 0; a < 2; a++) Shoot.bullet(B.wx(p), B.wy(p), Math.sin(kk * 0.06) * 1.4 + Math.PI / 2 + a * Math.PI, 1.7, 'orange_s'); });
        yield;
      }
    }
  },
  // ===== Stage 3 & 5 midboss: giant bomber =====
  bigBomber: {
    mid: true, enterY: 60, name: 'GIANT BOMBER',
    body: () => SPR.boss.bigBomber[STAGES[Game.stage].bomberPal || 'olive'],
    parts: [
      { name: 'tl', x: -32, y: -2, r: 7, hp: 90, aim: true, score: 2500 },
      { name: 'tr', x: 32, y: -2, r: 7, hp: 90, aim: true, score: 2500 },
      { name: 'tail', x: 0, y: -28, r: 7, hp: 90, aim: true, score: 2500 },
      { name: 'core', x: 0, y: 6, r: 12, hp: 260, core: true, score: 8000, wreck: false },
    ],
    ai: function* (B) {
      B.P('tl').spr = SPR.turret.twin; B.P('tr').spr = SPR.turret.twin; B.P('tail').spr = SPR.turret.small;
      yield* B.moveTo(W / 2, 70, 150);
      B.active = true;
      B.arm('tl', 60, W_.burst(3, 5, 2.4, 'orange_s', 10));
      B.arm('tr', 60, W_.burst(3, 5, 2.4, 'orange_s', 10), 30);
      B.arm('tail', 90, W_.aimed(3, 0.3, 1.9, 'pink_s', 9));
      B.arm('core', 110, W_.ring(16, 1.4, 'pink_m'), 50);
      for (let k = 0; k < 1500; k++) { B.x = W / 2 + Math.sin(k * 0.012) * 50; B.y = 70 + Math.sin(k * 0.02) * 10; yield; }
      for (;;) { B.y -= 1; if (B.y < -80) B.gone = true; yield; }
    }
  },
  // ===== Stage 3 boss: flying wing =====
  condor: {
    enterY: 70, name: 'BLACK CONDOR',
    body: () => SPR.boss.condor,
    parts: [
      { name: 'w1', x: 40, y: 4, r: 8, hp: 130, aim: true, score: 3000 },
      { name: 'w2', x: -40, y: 4, r: 8, hp: 130, aim: true, score: 3000 },
      { name: 'w3', x: 86, y: -6, r: 8, hp: 110, aim: true, score: 3000 },
      { name: 'w4', x: -86, y: -6, r: 8, hp: 110, aim: true, score: 3000 },
      { name: 'eL', x: -50, y: -16, r: 8, hp: 160, score: 4000 },
      { name: 'eR', x: 50, y: -16, r: 8, hp: 160, score: 4000 },
      { name: 'core', x: 0, y: 2, r: 12, hp: 700, core: true, armored: true, score: 15000, wreck: false },
    ],
    drawExtra(B, g) {
      // pusher props on the trailing edge
      g.fillStyle = 'rgba(220,225,235,0.4)';
      for (const ex of [-76, -50, -24, 24, 50, 76]) { const yy = Math.round(B.y - 26 - (Math.abs(ex) === 50 ? -6 : 0)); g.fillRect(Math.round(B.x + ex - 6), yy, 12, 1); g.fillStyle = 'rgba(30,30,40,0.8)'; g.fillRect(Math.round(B.x + ex + ((B.t >> 1) & 1 ? -5 : 3)), yy, 2, 1); g.fillStyle = 'rgba(220,225,235,0.4)'; }
    },
    ai: function* (B) {
      for (const n of ['w1', 'w2', 'w3', 'w4']) B.P(n).spr = SPR.turret.twin;
      B.P('eL').spr = SPR.engine; B.P('eR').spr = SPR.engine; B.P('core').spr = SPR.core.red;
      yield* B.moveTo(W / 2, 66, 180);
      B.active = true;
      B.arm('w1', 70, W_.aimed(3, 0.2, 2.1, 'pink_s', 12));
      B.arm('w2', 70, W_.aimed(3, 0.2, 2.1, 'pink_s', 12), 35);
      B.arm('w3', 50, W_.burst(3, 5, 2.6, 'needle', 12), 10);
      B.arm('w4', 50, W_.burst(3, 5, 2.6, 'needle', 12), 35);
      B.arm('eL', 40, W_.spiral(4, 1.3, 'orange_s', 0.31));
      B.arm('eR', 40, W_.spiral(4, 1.3, 'orange_s', -0.31), 20);
      let k = 0;
      while (B.alive('w1', 'w2', 'w3', 'w4', 'eL', 'eR')) { k++; B.x = W / 2 + Math.sin(k * 0.011) * 22; B.y = 66 + Math.sin(k * 0.022) * 8; yield; }
      B.P('core').armored = false; Game.shake(6); Sound.sfx('explode_l');
      FX.text(B.x, B.y - 30, 'BOMB BAY OPEN', { color: GRAD.red, life: 80 });
      // falling bombs that burst into rings
      B.arm('core', 55, (B, p) => {
        const b = Shoot.bullet(B.wx(p), B.wy(p), Math.PI / 2 + rnd.range(-0.5, 0.5), 1.3, 'orange_l');
        if (b) b.burst = 46;
      });
      for (;;) {
        k++;
        B.x = W / 2 + Math.sin(k * 0.017) * 60; B.y = 64 + Math.sin(k * 0.034) * 14;
        if (k % 140 === 0 && B.canFire()) Shoot.arc(B.x, B.y + 20, { n: 9, spread: 1.2, speed: 2, type: 'pink_s' });
        yield;
      }
    }
  },
  // ===== Stage 4 midboss: icebreaker =====
  icebreaker: {
    mid: true, ground: true, enterY: 72, name: 'ICEBREAKER',
    body: () => SPR.boss.icebreaker,
    parts: [
      { name: 'fwd', x: 0, y: 34, r: 8, hp: 100, aim: true, score: 2000 },
      { name: 'aft', x: 0, y: -36, r: 8, hp: 100, aim: true, score: 2000 },
      { name: 's1', x: 14, y: 0, r: 6, hp: 60, aim: true, score: 1500 },
      { name: 's2', x: -14, y: 0, r: 6, hp: 60, aim: true, score: 1500 },
      { name: 'bridge', x: 0, y: -8, r: 10, hp: 240, core: true, score: 6000, wreck: false },
    ],
    ai: function* (B) {
      B.P('fwd').spr = SPR.turret.ice; B.P('aft').spr = SPR.turret.ice; B.P('s1').spr = SPR.turret.small; B.P('s2').spr = SPR.turret.small;
      B.active = true;
      B.arm('fwd', 70, W_.aimed(3, 0.22, 2.1, 'blue_s'));
      B.arm('aft', 70, W_.aimed(3, 0.22, 2.1, 'blue_s'), 35);
      B.arm('s1', 50, W_.burst(3, 5, 2.4, 'needleB', 8));
      B.arm('s2', 50, W_.burst(3, 5, 2.4, 'needleB', 8), 25);
      B.arm('bridge', 100, W_.ring(16, 1.3, 'blue_m'), 40);
      for (;;) { B.y += B.y < 90 ? 0.6 : 0.1; B.x = W / 2 + Math.sin(B.t * 0.009) * 36; yield; }
    }
  },
  // ===== Stage 4 boss: armored zeppelin =====
  zeppelin: {
    enterY: 120, name: 'FROST TITAN',
    body: () => SPR.boss.zeppelin,
    parts: [
      { name: 'r1', x: 30, y: -50, r: 7, hp: 100, aim: true, score: 2500 },
      { name: 'r2', x: 30, y: 0, r: 7, hp: 100, aim: true, score: 2500 },
      { name: 'r3', x: 30, y: 50, r: 7, hp: 100, aim: true, score: 2500 },
      { name: 'l1', x: -30, y: -50, r: 7, hp: 100, aim: true, score: 2500 },
      { name: 'l2', x: -30, y: 0, r: 7, hp: 100, aim: true, score: 2500 },
      { name: 'l3', x: -30, y: 50, r: 7, hp: 100, aim: true, score: 2500 },
      { name: 'gondola', x: 0, y: 46, r: 10, hp: 340, aim: true, score: 8000 },
      { name: 'core', x: 0, y: -18, r: 14, hp: 800, core: true, armored: true, score: 15000, wreck: false },
    ],
    ai: function* (B) {
      for (const n of ['r1', 'r2', 'r3', 'l1', 'l2', 'l3']) B.P(n).spr = SPR.turret.ice;
      B.P('gondola').spr = SPR.turret.blue; B.P('core').spr = SPR.core.blue;
      yield* B.moveTo(W / 2, 100, 240);
      B.active = true;
      ['r1', 'r2', 'r3', 'l1', 'l2', 'l3'].forEach((n, i) => B.arm(n, 90, W_.aimed(2, 0.2, 2, 'blue_s', 10), i * 15));
      B.arm('gondola', 100, (B, p) => { const [x, y] = B.tip(p, 14); Shoot.arc(x, y, { n: 7, spread: 0.9, speed: 1.8, type: 'needleB' }); Game.later(20, () => p.alive && Shoot.arc(x, y, { n: 6, spread: 0.75, speed: 1.6, type: 'needleB' })); });
      let k = 0;
      while (B.alive('gondola') || B.parts.filter(p => p.alive && !p.core).length > 3) { k++; B.x = W / 2 + Math.sin(k * 0.009) * 30; B.y = 100 + Math.sin(k * 0.017) * 8; yield; }
      B.P('core').armored = false; Game.shake(6); Sound.sfx('explode_l');
      FX.text(B.x, B.y - 50, 'REACTOR EXPOSED', { color: GRAD.ice, life: 80 });
      B.arm('core', 4, (B, p, kk) => { for (let a = 0; a < 4; a++) Shoot.bullet(B.wx(p), B.wy(p), kk * 0.09 + a * TAU / 4, 1.8, 'needleB'); });
      for (;;) {
        k++;
        B.x = W / 2 + Math.sin(k * 0.013) * 44; B.y = 96 + Math.sin(k * 0.021) * 10;
        if (k % 400 === 200) B.arm('core', 30, (B, p, kk) => Shoot.ring(B.wx(p), B.wy(p), { n: 20, speed: 1.3 + (kk % 2) * 0.4, type: 'blue_m', off: kk * 0.15 }));
        if (k % 400 === 0) B.arm('core', 4, (B, p, kk) => { for (let a = 0; a < 4; a++) Shoot.bullet(B.wx(p), B.wy(p), -kk * 0.09 + a * TAU / 4, 1.8, 'needleB'); });
        yield;
      }
    }
  },
  // ===== Stage 5 boss: flying fortress =====
  citadel: {
    enterY: 100, name: 'INFERNO CITADEL', final: true,
    body: () => SPR.boss.citadel,
    parts: [
      { name: 't1', x: 60, y: -30, r: 8, hp: 120, aim: true, score: 3000 },
      { name: 't2', x: -60, y: -30, r: 8, hp: 120, aim: true, score: 3000 },
      { name: 't3', x: 72, y: 14, r: 8, hp: 120, aim: true, score: 3000 },
      { name: 't4', x: -72, y: 14, r: 8, hp: 120, aim: true, score: 3000 },
      { name: 't5', x: 40, y: 42, r: 8, hp: 120, aim: true, score: 3000 },
      { name: 't6', x: -40, y: 42, r: 8, hp: 120, aim: true, score: 3000 },
      { name: 'c1', x: 26, y: -50, r: 9, hp: 260, aim: true, score: 5000 },
      { name: 'c2', x: -26, y: -50, r: 9, hp: 260, aim: true, score: 5000 },
      { name: 'podL', x: -96, y: -6, r: 13, hp: 380, score: 8000 },
      { name: 'podR', x: 96, y: -6, r: 13, hp: 380, score: 8000 },
      { name: 'core', x: 0, y: 0, r: 15, hp: 1400, core: true, armored: true, score: 50000, wreck: false },
    ],
    ai: function* (B) {
      for (const n of ['t1', 't2', 't3', 't4', 't5', 't6']) B.P(n).spr = SPR.turret.red;
      B.P('c1').spr = SPR.turret.big; B.P('c2').spr = SPR.turret.big; B.P('core').spr = SPR.core.purple;
      B.P('podL').spr = SPR.core.red; B.P('podR').spr = SPR.core.red;
      yield* B.moveTo(W / 2, 92, 260);
      B.active = true;
      // PHASE 1: turret batteries
      ['t1', 't2', 't3', 't4', 't5', 't6'].forEach((n, i) => B.arm(n, 80, i % 2 ? W_.aimed(3, 0.18, 2.2, 'pink_s', 10) : W_.burst(3, 5, 2.5, 'orange_s', 10), i * 13));
      B.arm('podL', 160, W_.ring(16, 1.4, 'purple_m'));
      B.arm('podR', 160, W_.ring(16, 1.4, 'purple_m'), 80);
      let k = 0;
      while (B.parts.filter(p => p.alive && p.name[0] === 't').length > 0) { k++; B.x = W / 2 + Math.sin(k * 0.008) * 16; B.y = 92 + Math.sin(k * 0.02) * 6; yield; }
      // PHASE 2: heavy cannons + drone swarms
      FX.text(B.x, B.y - 60, 'WARNING', { color: GRAD.red, life: 70 });
      Sound.sfx('explode_l'); Game.shake(8);
      B.arm('c1', 70, (B, p) => { const [x, y] = B.tip(p, 18); Shoot.aimed(x, y, { n: 3, spread: 0.12, speed: 2.4, type: 'pink_l' }); });
      B.arm('c2', 70, (B, p) => { const [x, y] = B.tip(p, 18); Shoot.aimed(x, y, { n: 3, spread: 0.12, speed: 2.4, type: 'pink_l' }); }, 35);
      B.arm('podL', 200, (B, p) => { for (let i = 0; i < 2; i++) Spawn.e('drone', B.wx(p), B.wy(p) + 10, { ai: 'drone', ty: 140 + i * 30, pal: 'purple' }); }, 60);
      B.arm('podR', 200, (B, p) => { for (let i = 0; i < 2; i++) Spawn.e('drone', B.wx(p), B.wy(p) + 10, { ai: 'drone', ty: 140 + i * 30, pal: 'purple' }); }, 160);
      while (B.alive('c1', 'c2', 'podL', 'podR')) { k++; B.x = W / 2 + Math.sin(k * 0.011) * 28; B.y = 90 + Math.sin(k * 0.023) * 8; yield; }
      // PHASE 3: the core awakens
      B.P('core').armored = false; Game.cancelBullets(true); Game.shake(14); FX.flash(0.8, '#ff4060'); Sound.sfx('explode_boss');
      FX.text(B.x, B.y - 60, 'FINAL CORE', { color: GRAD.pink, life: 90, scale: 2 });
      yield* B.wait(90);
      const patterns = [
        [4, (B, p, kk) => { for (let a = 0; a < 5; a++) Shoot.bullet(B.wx(p), B.wy(p), kk * 0.13 + a * TAU / 5, 1.6, 'purple_s'); }],
        [40, (B, p, kk) => { Shoot.ring(B.wx(p), B.wy(p), { n: 26, speed: 1.4, type: 'pink_m', off: kk * 0.12 }); Shoot.aimed(B.wx(p), B.wy(p), { n: 5, spread: 0.12, speed: 2.6, type: 'needle' }); }],
        [3, (B, p, kk) => { const a = Math.sin(kk * 0.05) * 1.1 + Math.PI / 2; Shoot.bullet(B.wx(p) - 20, B.wy(p), a, 2.2, 'orange_s'); Shoot.bullet(B.wx(p) + 20, B.wy(p), Math.PI - a, 2.2, 'orange_s'); }],
        [60, (B, p, kk) => { for (let r = 0; r < 3; r++) Game.later(r * 10, () => B.canFire() && Shoot.ring(B.wx(p), B.wy(p), { n: 18, speed: 1.2 + r * 0.35, type: r === 1 ? 'blue_m' : 'purple_m', off: kk * 0.2 + r * 0.1 })); }],
      ];
      let pi = 0;
      for (;;) {
        B.arm('core', patterns[pi][0], patterns[pi][1]);
        for (let i = 0; i < 300; i++) { k++; B.x = W / 2 + Math.sin(k * 0.013) * 40; B.y = 88 + Math.sin(k * 0.026) * 12; yield; }
        pi = (pi + 1) % patterns.length;
      }
    }
  },
};
