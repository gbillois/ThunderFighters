'use strict';
// ============================================================
// Enemies: definitions, AI (generators), bullet patterns
// ============================================================

// ---------- enemy bullets ----------
const Shoot = {
  bullet(x, y, ang, spd, type = 'pink_s') {
    if (Game.ebullets.length > 700) return null;
    spd *= Game.D.bspd;
    const isNeedle = type === 'needle' || type === 'needleB';
    const b = { x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, spr: SPR.bullet[type], ang, r: type.endsWith('_l') ? 5 : type.endsWith('_m') ? 3 : 2, needle: isNeedle, t: 0, acc: 0 };
    Game.ebullets.push(b);
    return b;
  },
  canFire(e) {
    const p = Game.player;
    if (!p || !p.alive || Game.bombActive()) return false;
    if (e.y < 4 || e.y > H * 0.78 || e.x < 0 || e.x > W) return false;
    return dist2(e.x, e.y, p.x, p.y) > 44 * 44;
  },
  aimAng(x, y) { const p = Game.player; return p ? angleTo(x, y, p.x, p.y) : Math.PI / 2; },
  aimed(x, y, o = {}) {
    const n = (o.n || 1) + (Game.diff === 2 && o.n > 1 ? 1 : 0);
    const spread = o.spread || 0.25, base = (o.ang !== undefined ? o.ang : this.aimAng(x, y)) + (o.off || 0);
    for (let i = 0; i < n; i++) this.bullet(x, y, base + (n > 1 ? (i - (n - 1) / 2) * spread : 0), o.speed || 2, o.type || 'pink_s');
    Sound.sfx('enemy_shot', { vol: 0.5 });
  },
  ring(x, y, o = {}) {
    const n = Math.round((o.n || 12) * (Game.diff === 0 ? 0.7 : Game.diff === 2 ? 1.25 : 1));
    const off = o.off !== undefined ? o.off : (o.aim ? this.aimAng(x, y) : 0);
    for (let i = 0; i < n; i++) this.bullet(x, y, off + i / n * TAU, o.speed || 1.6, o.type || 'orange_s');
    Sound.sfx('enemy_shot', { vol: 0.7 });
  },
  arc(x, y, o = {}) { // fan around angle
    const n = o.n || 5, spread = o.spread || 0.9;
    const base = o.ang !== undefined ? o.ang : this.aimAng(x, y);
    for (let i = 0; i < n; i++) this.bullet(x, y, base - spread / 2 + spread * (n > 1 ? i / (n - 1) : 0.5), o.speed || 1.8, o.type || 'pink_s');
    Sound.sfx('enemy_shot', { vol: 0.6 });
  }
};

// ---------- definitions ----------
const EDEF = {
  fighter: { spr: 'fighter', hp: 2, r: 8, score: 100, rot: true },
  fighter2: { spr: 'fighter2', hp: 3, r: 9, score: 150, rot: true },
  rocket: { spr: 'rocket', hp: 1, r: 6, score: 80, rot: true },
  jet: { spr: 'jet', hp: 6, r: 10, score: 300, rot: true },
  heavy: { spr: 'heavy', hp: 26, r: 14, score: 1000, expl: 'm' },
  heli: { spr: 'heli', hp: 16, r: 10, score: 600, expl: 'm', rotor: true },
  drone: { spr: 'drone', hp: 10, r: 10, score: 400, spin: true },
  bomber: { spr: 'bomber', hp: 150, r: 24, score: 6000, expl: 'l', big: true },
  tank: { ground: true, hp: 10, r: 9, score: 400, body: 'tank', turret: 'tankTurret', expl: 'm' },
  aa: { ground: true, hp: 16, r: 10, score: 600, body: 'aaBase', turret: 'aaTurret', expl: 'm', medal: true },
  bunker: { ground: true, hp: 45, r: 13, score: 2000, body: 'bunker', turret: 'bunkerGun', expl: 'm', medal: true },
  boat: { ground: true, hp: 18, r: 10, score: 700, water: true, expl: 'm', medal: true },
  truck: { ground: true, hp: 5, r: 7, score: 300, body: 'truck', noFire: true, medal: true },
  sam: { ground: true, hp: 16, r: 9, score: 900, body: 'samBase', turret: 'samRack', expl: 'm', medal: true },
  artillery: { ground: true, hp: 24, r: 11, score: 1200, body: 'artBase', turret: 'artGun', expl: 'm', medal: true },
  fuel: { ground: true, hp: 5, r: 9, score: 500, body: 'fuel', expl: 'm', noFire: true, chain: true, medal: true },
  parked: { ground: true, hp: 3, r: 8, score: 300, noFire: true, parked: true },
};

class Enemy {
  constructor(type, x, y, o = {}) {
    const d = EDEF[type];
    this.type = type; this.d = d; this.o = o;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.hp = Math.max(1, Math.round(d.hp * Game.D.hp * (o.hpMul || 1))); this.maxHp = this.hp;
    this.r = d.r; this.ground = !!d.ground; this.t = 0; this.flash = 0;
    this.ang = Math.PI / 2; this.tang = Math.PI / 2;
    this.pal = o.pal || Game.pal;
    this.score = d.score;
    this.drop = o.drop || null;
    this.seen = false;
    if (d.spr) this.spr = SPR.enemy[d.spr][this.pal] || SPR.enemy[d.spr].green;
    else if (type === 'boat') this.spr = SPR.boat;
    else if (d.parked) this.spr = SPR.enemy.fighter[this.pal] || SPR.enemy.fighter.green;
    else { const G = groundSet(this.pal); this.spr = G[d.body]; this.tspr = d.turret ? G[d.turret] : null; }
    if (o.red) { this.red = true; }
    const ai = o.ai || (this.ground ? 'ground' : 'line');
    this.ai = AI[ai](this, o);
  }
  update() {
    this.t++;
    this.ai.next();
    this.x += this.vx; this.y += this.vy;
    if (this.ground) this.y += Game.bg.dy;
    if (this.flash > 0) this.flash--;
    const m = 40 + (this.spr ? this.spr.width / 2 : 0);
    if (this.x > -10 && this.x < W + 10 && this.y > -10 && this.y < H + 10) this.seen = true;
    if (this.seen && (this.x < -m || this.x > W + m || this.y < -m - 30 || this.y > H + m)) this.gone = true;
    if (this.t > 2400) this.gone = true;
    if (this.d.big && this.hp < this.maxHp * 0.4 && this.t % 6 === 0) FX.smoke(this.x + rnd.range(-15, 15), this.y + rnd.range(-6, 6), { dark: true, vy: -0.6 });
  }
  hit(x, y, r) { const rr = this.r + r; return dist2(x, y, this.x, this.y) < rr * rr ? this : null; }
  damage(dmg) {
    if (this.dead) return;
    this.hp -= dmg; this.flash = 2;
    Game.addGauge(dmg);
    if (this.hp <= 0) this.kill();
  }
  kill() {
    this.dead = true;
    const d = this.d;
    Game.addScore(this.score);
    FX.explode(this.x, this.y, d.expl || 's', { ground: this.ground, vx: this.vx, vy: this.vy });
    if (this.ground) {
      Game.bg.crater(this.x, this.y, d.expl === 'm' ? 2 : 1);
      if (d.medal) Game.spawnItem('medal', this.x, this.y);
    }
    if (this.score >= 1000) FX.text(this.x, this.y - 10, this.score);
    if (this.drop) Game.spawnItem(this.drop, this.x, this.y);
    if (d.chain) { const x = this.x, y = this.y; Game.later(7, () => Game.areaDamage(x, y, 34, 12, true)); FX.ring(x, y, { ground: true }); }
    // suicide bullets on hard
    if (Game.diff === 2 && !this.ground && this.r <= 10 && rnd.chance(0.35) && Shoot.canFire(this)) Shoot.aimed(this.x, this.y, { speed: 1.6, type: 'orange_s' });
    if (this.o.onKill) this.o.onKill(this);
  }
  frame() {
    if (this.d.rot) return rotFrame(enemyRotSet(this.d.spr, this.pal in ENEMY_PAL ? this.pal : 'green'), this.ang, Math.PI / 2);
    return this.spr;
  }
  draw(g) {
    const x = Math.round(this.x), y = Math.round(this.y);
    const base = this.frame();
    const fl = this.flash > 0 && (Game.t & 2 || this.flash > 1);
    const spr = fl ? base.flash : base;
    if (this.type === 'boat' && this.t % 2 === 0) g.drawImage(SPR.boatWake, x - 13, y - 26);
    g.drawImage(spr, x - Math.round(spr.hw), y - Math.round(spr.hh));
    if (this.d.spin) {
      for (let i = 0; i < 4; i++) { const a = this.t * 0.15 + i * TAU / 4; g.fillStyle = (this.t >> 2) & 1 ? '#ffd040' : '#ff6020'; g.fillRect(Math.round(x + Math.cos(a) * 8), Math.round(y + Math.sin(a) * 8), 2, 2); }
    }
    if (this.tspr) {
      const ts = rotFrame(this.tspr, this.tang, -Math.PI / 2);
      g.drawImage(fl ? ts.flash : ts, x - Math.round(ts.hw), y - Math.round(ts.hh));
    }
    if (this.d.rotor) {
      const a = this.t * 0.6;
      for (let i = 0; i < 2; i++) { const aa = a + i * Math.PI / 2; pxLine(g, x - Math.cos(aa) * 12, y - 2 - Math.sin(aa) * 12, x + Math.cos(aa) * 12, y - 2 + Math.sin(aa) * 12, '#28283a'); }
      g.globalAlpha = 0.16; pxDisc(g, x, y - 2, 12, '#d0d8e0'); g.globalAlpha = 1;
    }
    if (this.red && (this.t >> 3) & 1) { g.globalAlpha = 0.4; g.drawImage(base.flash, x - Math.round(base.hw), y - Math.round(base.hh)); g.globalAlpha = 1; }
  }
  drawShadow(g) {
    if (this.ground) return;
    const s = this.frame().shadowS;
    const sx = Math.round(this.x + 14 + (this.x - W / 2) * 0.05 - s.width / 2), sy = Math.round(this.y + 26 - s.height / 2);
    g.globalAlpha = 0.28;
    g.drawImage(s, sx, sy);
    g.globalAlpha = 1;
  }
}

// ---------- AI behaviours (generators, one step per frame) ----------
function fireCheck(e, o) {
  if (o.fireAt === undefined) return;
  const t = e.t - o.fireAt;
  if (t < 0) return;
  if (t === 0 || (o.fireEvery && t % Math.round(o.fireEvery / Game.D.rate) === 0)) {
    if (o.shots !== undefined && (e.shotsDone = (e.shotsDone || 0) + 1) > o.shots) return;
    if (!Shoot.canFire(e)) return;
    (o.pattern || defaultPattern)(e, o);
  }
}
function defaultPattern(e, o) { Shoot.aimed(e.x, e.y + 6, { n: o.n || 1, spread: o.spread || 0.22, speed: o.speed || 2, type: o.btype || 'pink_s' }); }

const AI = {
  *line(e, o) {
    e.vx = o.vx || 0; e.vy = o.vy !== undefined ? o.vy : 1.6;
    e.ang = Math.atan2(e.vy, e.vx);
    for (;;) {
      if (o.accel) { e.vy += o.accel; e.ang = Math.atan2(e.vy, e.vx); }
      fireCheck(e, o); yield;
    }
  },
  *sine(e, o) {
    const x0 = e.x; e.vy = o.vy || 1.2;
    for (;;) {
      const nx = x0 + Math.sin(e.t * (o.freq || 0.04) + (o.phase || 0)) * (o.amp || 40);
      e.vx = nx - e.x; e.ang = Math.atan2(e.vy, e.vx);
      fireCheck(e, o); yield;
    }
  },
  *swoop(e, o) {
    let ang = o.ang !== undefined ? o.ang : Math.PI / 2;
    const sp = o.speed || 2.2, turn = o.turn || 0.035, t0 = o.turnAt || 40, t1 = o.turnEnd || t0 + 70;
    for (;;) {
      if (e.t > t0 && e.t < t1) ang += turn;
      e.vx = Math.cos(ang) * sp; e.vy = Math.sin(ang) * sp; e.ang = ang;
      fireCheck(e, o); yield;
    }
  },
  *chase(e, o) {
    let ang = o.ang !== undefined ? o.ang : Math.PI / 2;
    const sp = (o.speed || 2.4);
    for (;;) {
      const p = Game.player;
      if (p && p.alive && e.y < p.y - 30) ang += clamp(angDiff(ang, angleTo(e.x, e.y, p.x, p.y)), -0.035, 0.035);
      e.vx = Math.cos(ang) * sp; e.vy = Math.sin(ang) * sp; e.ang = ang;
      if (e.t % 4 === 0) FX.smoke(e.x - Math.cos(ang) * 6, e.y - Math.sin(ang) * 6, { size: 0, life: 18, vx: 0, vy: 0 });
      fireCheck(e, o); yield;
    }
  },
  // come in, stop, attack, leave
  *stop(e, o) {
    const ty = o.ty || 70, tx = o.tx !== undefined ? o.tx : e.x;
    while (Math.abs(e.y - ty) > 1) {
      e.vy = (ty - e.y) * 0.05 + Math.sign(ty - e.y) * 0.2; e.vx = (tx - e.x) * 0.04; yield;
    }
    e.vx = 0; e.vy = 0;
    const hold = o.hold || 150;
    const pat = o.pattern || ((e, k) => { if (k % Math.round(50 / Game.D.rate) === 20 && Shoot.canFire(e)) Shoot.aimed(e.x, e.y + 8, { n: 3, spread: 0.25, speed: 2 }); });
    for (let k = 0; k < hold; k++) {
      e.vx = Math.sin(k * 0.03) * 0.3;
      pat(e, k); yield;
    }
    e.vx = 0;
    for (;;) { e.vy += o.leaveUp ? -0.04 : 0.04; yield; }
  },
  *ground(e, o) {
    e.vx = o.vx || 0; e.vy = o.vy || 0;
    let ft = o.fireAt !== undefined ? o.fireAt : rnd.int(30, 80);
    const every = o.fireEvery || 110;
    for (;;) {
      const p = Game.player;
      if (p) e.tang += clamp(angDiff(e.tang, angleTo(e.x, e.y, p.x, p.y)), -0.05, 0.05);
      if (e.vx || e.vy) e.ang = Math.atan2(e.vy, e.vx);
      if (e.t >= ft && !e.d.noFire) {
        ft += Math.round((e.type === 'sam' ? 190 : e.type === 'artillery' ? 150 : every) / Game.D.rate) + rnd.int(0, 30);
        if (Shoot.canFire(e)) {
          const bx = e.x + Math.cos(e.tang) * 10, by = e.y + Math.sin(e.tang) * 10;
          if (e.type === 'aa') { for (let i = 0; i < 3; i++) Game.later(i * 6, () => !e.dead && Shoot.aimed(bx, by, { speed: 2.2, type: 'orange_s' })); }
          else if (e.type === 'bunker') Shoot.aimed(bx, by, { n: 5, spread: 0.2, speed: 1.8, type: 'pink_m' });
          else if (e.type === 'boat') Shoot.aimed(bx, by, { n: 2, spread: 0.3, speed: 1.9, type: 'orange_s' });
          else if (e.type === 'sam') {
            // launches a homing missile
            const m = Spawn.e('rocket', bx, by, { ai: 'chase', speed: 2.3, ang: e.tang, pal: Game.pal });
            m.score = 50; Sound.sfx('sam'); FX.smoke(bx, by, { size: 1, ground: true, life: 40 });
          } else if (e.type === 'artillery') {
            // slow heavy shell that bursts into a ring
            const b = Shoot.bullet(bx, by, e.tang, 1.15, 'orange_l');
            if (b) b.burst = 70;
            Sound.sfx('artillery'); FX.anim(SPR.expl.s[0], bx, by, { ground: true });
          }
          else Shoot.aimed(bx, by, { speed: 1.9, type: 'pink_s' });
        }
      }
      yield;
    }
  },
  // heli: hover around and fire bursts
  *heli(e, o) {
    const ty = o.ty || rnd.range(50, 110);
    while (e.y < ty) { e.vy = Math.max(0.5, (ty - e.y) * 0.04); yield; }
    e.vy = 0;
    for (let k = 0; k < (o.hold || 260); k++) {
      e.vx = Math.sin(k * 0.025 + e.x) * 0.5;
      if (k % Math.round(70 / Game.D.rate) === 30 && Shoot.canFire(e)) {
        for (let i = 0; i < 4; i++) Game.later(i * 5, () => !e.dead && Shoot.aimed(e.x, e.y + 8, { speed: 2.4, type: 'needle' }));
      }
      yield;
    }
    for (;;) { e.vy += 0.03; e.vx *= 0.98; yield; }
  },
  // drones: zig-zag and ring bursts
  *drone(e, o) {
    const ty = o.ty || 80;
    while (e.y < ty) { e.vy = Math.max(0.6, (ty - e.y) * 0.05); e.vx = 0; yield; }
    for (let k = 0; ; k++) {
      e.vx = Math.sin(k * 0.04) * 1.2; e.vy = 0.25;
      if (k % Math.round(90 / Game.D.rate) === 40 && Shoot.canFire(e)) Shoot.ring(e.x, e.y, { n: 10, speed: 1.4, type: 'purple_s', off: k * 0.1 });
      yield;
    }
  },
  // heavy bomber: slow descent, rings and aimed spreads
  *bomber(e, o) {
    e.vy = 0.7;
    for (let k = 0; ; k++) {
      if (e.y > 70 && e.y < 100) e.vy = 0.25;
      if (k > 520) e.vy = Math.min(e.vy + 0.02, 1.5);
      if (e.y > 10 && Shoot.canFire(e)) {
        const r = Math.round(80 / Game.D.rate);
        if (k % r === 0) Shoot.ring(e.x, e.y + 10, { n: 16, speed: 1.3, type: 'orange_m', off: k * 0.05 });
        if (k % r === 40) { Shoot.aimed(e.x - 18, e.y + 4, { n: 3, spread: 0.2, speed: 2 }); Shoot.aimed(e.x + 18, e.y + 4, { n: 3, spread: 0.2, speed: 2 }); }
      }
      yield;
    }
  },
};

// ---------- spawn helpers used by stage scripts ----------
const Spawn = {
  e(type, x, y, o) { const e = new Enemy(type, x, y, o); Game.enemies.push(e); return e; },
  // V or line formations
  vee(type, cx, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      this.e(type, cx + k * 18, -16 - Math.abs(k) * 14, Object.assign({}, o));
    }
  },
  row(type, n, o = {}) { for (let i = 0; i < n; i++) this.e(type, (W / (n + 1)) * (i + 1), -16, Object.assign({}, o)); },
  // a trailing line (snake) entering from a point
  trail(type, x, n, gap, o = {}) {
    for (let i = 0; i < n; i++) Game.later(i * gap, () => this.e(type, x, -14, Object.assign({}, o)));
  },
  // ground units: find valid terrain spot near x at the top of the screen
  ground(type, x, o = {}) {
    const bg = Game.bg, y = o.y !== undefined ? o.y : -14;
    const wantWater = EDEF[type].water;
    if (bg.terrain.biome.noGround) return null;
    if (o.road) {
      const ty = bg.toTerrain(y);
      for (let d = 0; d < 120; d += 2) for (const s of [1, -1]) {
        const xx = clamp(x + d * s, 10, W - 10);
        if (bg.terrain.clsAt(xx, ty) === T_ROAD && bg.terrain.clsAt(xx, ty + 12) === T_ROAD) return this.e(type, xx, y, o);
      }
    }
    for (let d = 0; d < 90; d += 6) {
      for (const s of [1, -1]) {
        const xx = clamp(x + d * s, 14, W - 14);
        const ty = bg.toTerrain(y);
        const water = bg.terrain.isWater(xx, ty);
        if (water === !!wantWater && bg.terrain.clsAt(xx, ty) !== T_RAIL) {
          // check neighbours to avoid coast edges
          if (bg.terrain.isWater(xx - 8, ty) === water && bg.terrain.isWater(xx + 8, ty) === water && bg.terrain.isWater(xx, ty - 8) === water && bg.terrain.isWater(xx, ty + 8) === water)
            return this.e(type, xx, y, o);
        }
      }
    }
    return null;
  }
};
