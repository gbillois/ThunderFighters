'use strict';
// ============================================================
// Player planes, weapons, bombs and super attacks
// ============================================================

const PLANES = {
  lightning: {
    name: 'P-38 LIGHTNING', speed: 2.15, color: GRAD.ice,
    shot: 'WIDE VULCAN', sub: 'HOMING MISSILES', bomb: 'THUNDERSTORM', sup: 'BALL LIGHTNING',
    stats: { SPEED: 3, POWER: 3, RANGE: 5 },
  },
  mustang: {
    name: 'P-51 MUSTANG', speed: 2.55, color: GRAD.red,
    shot: 'TWIN VULCAN', sub: 'ROCKETS', bomb: 'MISSILE STORM', sup: 'ROCKET SALVO',
    stats: { SPEED: 5, POWER: 4, RANGE: 2 },
  },
  shinden: {
    name: 'J7W SHINDEN', speed: 2.35, color: GRAD.green,
    shot: 'PIERCING WAVE', sub: 'SIDE NEEDLES', bomb: 'SKY LASER', sup: 'WAVE STORM',
    stats: { SPEED: 4, POWER: 4, RANGE: 3 },
  },
  mosquito: {
    name: 'MOSQUITO', speed: 1.9, color: GRAD.gold,
    shot: 'HEAVY SPREAD', sub: 'CARPET BOMBS', bomb: 'NAPALM WALL', sup: 'MEGA BOMB',
    stats: { SPEED: 2, POWER: 5, RANGE: 4 },
  },
};
const PLANE_ORDER = ['lightning', 'mustang', 'shinden', 'mosquito'];

// ---------- player bullets ----------
function pShot(x, y, ang, spd, o) {
  if (Game.pbullets.length > 400) return null;
  const b = Object.assign({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, ang, dmg: 1, r: 3, spr: SPR.bullet.pVulcan, kind: 'shot', t: 0 }, o);
  Game.pbullets.push(b);
  return b;
}
const UP = -Math.PI / 2, DEG = Math.PI / 180;

const WEAPONS = {
  lightning: {
    rate: 5,
    shot(p, lv) {
      const sets = [
        [[-3, 0], [3, 0], [-7, -5], [7, 5]],
        [[-3, 0], [3, 0], [-7, -6], [7, 6], [-9, -12], [9, 12]],
        [[-3, 0], [3, 0], [-6, -5], [6, 5], [-9, -10], [9, 10], [-11, -16], [11, 16]],
        [[-3, 0], [3, 0], [-6, -5], [6, 5], [-9, -10], [9, 10], [-11, -15], [11, 15], [-13, -21], [13, 21]],
      ][lv - 1];
      for (const [ox, a] of sets) pShot(p.x + ox, p.y - 14, UP + a * DEG, 9, { spr: lv >= 4 ? SPR.bullet.pVulcanB : SPR.bullet.pVulcan, dmg: lv >= 4 ? 1.1 : 1 });
      Sound.sfx('shot', { vol: 0.5 });
    },
    sub(p, lv) {
      if (lv < 2 || p.t % 22) return;
      const n = lv >= 4 ? 4 : 2;
      for (let i = 0; i < n; i++) {
        const s = i % 2 ? 1 : -1;
        pShot(p.x + s * (8 + (i >> 1) * 6), p.y - 4, UP + s * (0.5 + (i >> 1) * 0.3), 2.5, { spr: SPR.bullet.pMissile, kind: 'homing', dmg: 3.2, r: 4, speed: 5.5, turn: 0.13 });
      }
      Sound.sfx('missile', { vol: 0.4 });
    }
  },
  mustang: {
    rate: 4,
    shot(p, lv) {
      const sets = [
        [[-3, 0], [3, 0]],
        [[-7, 0], [-2.5, 0], [2.5, 0], [7, 0]],
        [[-7, 0], [-2.5, 0], [2.5, 0], [7, 0], [-10, -4], [10, 4]],
        [[-10, 0], [-6, 0], [-2, 0], [2, 0], [6, 0], [10, 0], [-12, -5], [12, 5]],
      ][lv - 1];
      for (const [ox, a] of sets) pShot(p.x + ox, p.y - 14, UP + a * DEG, 10, { spr: lv >= 3 ? SPR.bullet.pRed : SPR.bullet.pVulcan, dmg: lv >= 3 ? 1.05 : 0.95 });
      Sound.sfx('shot', { vol: 0.5 });
    },
    sub(p, lv) {
      if (lv < 2 || p.t % 14) return;
      const xs = lv >= 4 ? [-14, -9, 9, 14] : [-11, 11];
      for (const ox of xs) pShot(p.x + ox, p.y, UP, 1.5, { spr: SPR.bullet.pRocket, kind: 'rocket', dmg: 4.2, r: 4 });
      Sound.sfx('missile', { vol: 0.35 });
    }
  },
  shinden: {
    rate: 6,
    shot(p, lv) {
      const sets = [[[0, 0]], [[-4, 0], [4, 0]], [[0, 0], [-8, -6], [8, 6]], [[-4, 0], [4, 0], [-10, -7], [10, 7]]][lv - 1];
      for (const [ox, a] of sets) pShot(p.x + ox, p.y - 14, UP + a * DEG, 8, { spr: SPR.bullet.pWave, kind: 'wave', dmg: 1.45, r: 6, pierce: new Set() });
      Sound.sfx('laser', { vol: 0.45 });
    },
    sub(p, lv) {
      if (lv < 2 || p.t % 9) return;
      const angs = lv >= 4 ? [-30, -20, 20, 30] : lv >= 3 ? [-25, -15, 15, 25] : [-22, 22];
      for (const a of angs) pShot(p.x + Math.sign(a) * 8, p.y - 2, UP + a * DEG, 8.5, { spr: SPR.bullet.pStreakG, dmg: 0.9 });
    }
  },
  mosquito: {
    rate: 6,
    shot(p, lv) {
      const sets = [
        [[0, 0], [-4, -7], [4, 7]],
        [[-3, 0], [3, 0], [-5, -8], [5, 8], [-7, -15], [7, 15]],
        [[-6, 0], [-2, 0], [2, 0], [6, 0], [-6, -8], [6, 8], [-8, -16], [8, 16]],
        [[-8, 0], [-3, 0], [3, 0], [8, 0], [-6, -7], [6, 7], [-8, -13], [8, 13], [-10, -20], [10, 20]],
      ][lv - 1];
      for (const [ox, a] of sets) pShot(p.x + ox, p.y - 14, UP + a * DEG, 7.5, { spr: SPR.bullet.pStreakY, dmg: 1.45, r: 4 });
      Sound.sfx('shot', { vol: 0.55, pitch: 0.8 });
    },
    sub(p, lv) {
      if (lv < 2 || p.t % 26) return;
      const xs = lv >= 4 ? [-16, -8, 8, 16] : lv >= 3 ? [-12, 0, 12] : [-10, 10];
      for (const ox of xs) pShot(p.x + ox, p.y, UP, 3.2, { spr: SPR.bullet.pBomb, kind: 'pbomb', dmg: 6, r: 5, fuse: 34 });
    }
  },
};

// ---------- Player ----------
class Player {
  constructor(plane) {
    this.plane = plane; this.def = PLANES[plane]; this.wpn = WEAPONS[plane];
    this.power = 1;
    this.reset();
  }
  reset() {
    this.x = W / 2; this.y = H + 30; this.alive = true; this.entering = 50;
    this.inv = 150; this.bank = 0; this.t = 0; this.shotT = 0; this.dead = false;
  }
  get hitR() { return 2.2; }
  update() {
    this.t++;
    if (!this.alive) return;
    if (this.inv > 0) this.inv--;
    if (this.beam > 0) this.beam--;
    let mx = 0, my = 0;
    if (this.docked) { Input.consumeTouchDelta(); this.bank *= 0.8; this.firing = false; return; }
    if (this.entering > 0) {
      this.entering--;
      this.y += (H - 60 - this.y) * 0.08;
      this.bank *= 0.8;
    } else if (!Game.clearing) {
      const I = Input.held;
      if (I.left) mx -= 1; if (I.right) mx += 1; if (I.up) my -= 1; if (I.down) my += 1;
      if (Input.padAxis && (Input.padAxis[0] || Input.padAxis[1])) { mx = Input.padAxis[0]; my = Input.padAxis[1]; }
      const l = Math.hypot(mx, my);
      if (l > 1) { mx /= l; my /= l; }
      const sp = this.def.speed;
      let dx = mx * sp, dy = my * sp;
      const [tx, ty] = Input.consumeTouchDelta();
      if (tx || ty) { dx += clamp(tx, -14, 14); dy += clamp(ty, -14, 14); mx = clamp(tx * 0.5, -1, 1); }
      this.x = clamp(this.x + dx, 10, W - 10);
      this.y = clamp(this.y + dy, 16, H - 14);
      this.bank += (mx - this.bank) * 0.18;
    } else {
      Input.consumeTouchDelta();
      this.bank *= 0.85;
    }
    // weapons
    const firing = !Game.clearing && this.entering <= 0 && (Input.held.fire || Input.isTouch || Save.data.autofire);
    this.firing = firing;
    if (firing) {
      if (Game.special) SPECIALS[Game.special.key].fire(this);
      else if (this.shotT <= 0) { this.wpn.shot(this, this.power); this.shotT = this.wpn.rate; this.muzzle = 3; }
      this.wpn.sub(this, this.power);
    }
    if (this.shotT > 0) this.shotT--;
    if (this.muzzle > 0) this.muzzle--;
    if (!Game.clearing && this.entering <= 0) {
      if (Input.pressed.bomb) Game.useBomb();
      if (Input.pressed.super) Game.useSuper();
    }
  }
  draw(g) {
    if (!this.alive || this.docked) return;
    if (this.inv > 0 && this.entering <= 0 && (this.t >> 1) & 1) return;
    const banks = SPR.player[this.plane];
    const bi = clamp(Math.round(this.bank * 2) + 2, 0, 4);
    const spr = banks[bi][(this.t >> 1) & 1];
    const x = Math.round(this.x), y = Math.round(this.y);
    g.drawImage(spr, x - Math.round(spr.hw), y - Math.round(spr.hh));
    if (this.muzzle > 0) {
      g.fillStyle = this.muzzle > 1 ? '#ffffff' : '#ffe070';
      g.fillRect(x - 2, y - 18, 4, 3); g.fillRect(x - 1, y - 20, 2, 2);
    }
    if (this.shield) pxCircle(g, x, y, 20, (this.t >> 2) & 1 ? '#80d0ff' : '#ffffff');
  }
  drawShadow(g) {
    if (!this.alive || this.docked) return;
    const banks = SPR.player[this.plane];
    const sh = banks[clamp(Math.round(this.bank * 2) + 2, 0, 4)][0].shadowS;
    g.globalAlpha = 0.3;
    g.drawImage(sh, Math.round(this.x + 14 + (this.x - W / 2) * 0.05 - sh.width / 2), Math.round(this.y + 26 - sh.height / 2));
    g.globalAlpha = 1;
  }
}

// ---------- update for player bullets (homing, rockets, bombs) ----------
function nearestTarget(x, y, maxD = 1e9, frontOnly = false) {
  let best = null, bd = maxD * maxD;
  for (const e of Game.enemies) {
    if (e.dead || e.gone) continue;
    if (e.isBoss) {
      if (!e.active) continue;
      for (const p of e.parts) {
        if (!p.alive || p.armored) continue;
        const px = e.wx(p), py = e.wy(p);
        if (frontOnly && py > y) continue;
        const d = dist2(x, y, px, py); if (d < bd) { bd = d; best = { x: px, y: py, t: p }; }
      }
    } else {
      if (e.y < -10 || e.y > H) continue;
      if (frontOnly && e.y > y) continue;
      const d = dist2(x, y, e.x, e.y); if (d < bd) { bd = d; best = { x: e.x, y: e.y, t: e }; }
    }
  }
  return best;
}
function updatePlayerBullet(b) {
  b.t++;
  if (b.kind === 'homing') {
    if (b.t > 6) {
      const tg = nearestTarget(b.x, b.y, 260, true);
      let ang = Math.atan2(b.vy, b.vx);
      if (tg) ang += clamp(angDiff(ang, angleTo(b.x, b.y, tg.x, tg.y)), -b.turn, b.turn);
      else ang += clamp(angDiff(ang, UP), -0.08, 0.08);
      const sp = Math.min(b.speed, Math.hypot(b.vx, b.vy) + 0.3);
      b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp;
    }
    if (b.t % 3 === 0) FX.smoke(b.x - b.vx, b.y - b.vy, { size: 0, life: 14, vx: 0, vy: 0.3 });
  } else if (b.kind === 'rocket') {
    b.vy -= 0.35; if (b.vy < -10) b.vy = -10;
    if (b.t % 3 === 0) FX.smoke(b.x, b.y + 6, { size: 0, life: 12, vx: 0, vy: 0.4 });
  } else if (b.kind === 'pbomb') {
    b.vy *= 0.94;
    if (b.t >= b.fuse) { b.dead = true; Game.areaDamage(b.x, b.y, 20, b.dmg, true); FX.explode(b.x, b.y, 's'); }
  } else if (b.kind === 'flame') {
    b.vx *= 0.93; b.vy *= 0.93;
    const fr = SPR.expl.s[(b.t & 1)];
    b.spr = fr[Math.min(fr.length - 1, Math.floor(b.t / 2.6))];
    if (b.t >= b.life) b.dead = true;
  } else if (b.kind === 'flak') {
    if (b.t >= b.fuse) { b.dead = true; Game.areaDamage(b.x, b.y, 12, 2, true); FX.anim(SPR.expl.s[b.t & 1], b.x, b.y, {}); }
  } else if (b.kind === 'megabomb') {
    b.vy *= 0.97;
    if (b.t >= b.fuse) { b.dead = true; megaBlast(b.x, b.y); }
  } else if (b.kind === 'orb') {
    if (b.t % 6 === 0) {
      const tg = nearestTarget(b.x, b.y, 80);
      if (tg) { FX.bolt(b.x, b.y, tg.x, tg.y); tg.t.damage(3); }
    }
    if (b.t % 2 === 0) FX.parts.push({ x: b.x + rnd.range(-8, 8), y: b.y + rnd.range(-8, 8), vx: rnd.range(-1, 1), vy: rnd.range(-1, 1), life: 10, max: 10, type: 'blue', drag: 0.9 });
  } else if (b.kind === 'salvo') {
    if (b.t > 12) {
      const tg = nearestTarget(b.x, b.y, 300);
      let ang = Math.atan2(b.vy, b.vx);
      if (tg) ang += clamp(angDiff(ang, angleTo(b.x, b.y, tg.x, tg.y)), -0.1, 0.1);
      const sp = Math.min(7, Math.hypot(b.vx, b.vy) + 0.25);
      b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp;
    }
    if (b.t % 2 === 0) FX.smoke(b.x - b.vx, b.y - b.vy, { size: 0, life: 16, vx: 0, vy: 0.2 });
  }
  b.x += b.vx; b.y += b.vy;
  if (b.y < -24 || b.y > H + 24 || b.x < -24 || b.x > W + 24) b.dead = true;
}
function drawPlayerBullet(g, b) {
  let s = b.spr;
  if (Array.isArray(s) && s.length === ROT_N) s = rotFrame(s, Math.atan2(b.vy, b.vx), b.base !== undefined ? b.base : -Math.PI / 2);
  else if (Array.isArray(s)) s = s[(b.t >> 2) & 1];
  g.drawImage(s, Math.round(b.x - s.hw), Math.round(b.y - s.hh));
  if (b.kind === 'homing' || b.kind === 'salvo' || b.kind === 'rocket') { g.fillStyle = (b.t >> 1) & 1 ? '#ffe070' : '#ff8020'; const l = Math.hypot(b.vx, b.vy) || 1; g.fillRect(Math.round(b.x - b.vx / l * 7) - 1, Math.round(b.y - b.vy / l * 7) - 1, 2, 2); }
}
function megaBlast(x, y) {
  FX.explode(x, y, 'l');
  FX.ring(x, y, { rate: 0.5, scale: 1.5 });
  for (let i = 0; i < 8; i++) Game.later(i * 3, () => FX.anim(rnd.pick(SPR.expl.m), x + rnd.range(-40, 40), y + rnd.range(-40, 40), {}));
  Game.areaDamage(x, y, 64, 140, true);
  Game.cancelBullets(false, x, y, 70);
}

// ---------- Bombs (screen clearing specials) ----------
const BOMBS = {
  lightning: {
    dur: 150,
    start() { FX.flash(0.7, '#a0d8ff'); },
    tick(b) {
      if (b.t % 4 === 0) {
        const tg = nearestTarget(rnd.range(0, W), rnd.range(0, H * 0.8), 999);
        const x = tg ? tg.x : rnd.range(20, W - 20), y = tg ? tg.y : rnd.range(20, H * 0.7);
        FX.bolt(x + rnd.range(-30, 30), -10, x, y, { life: 10 });
        FX.anim(rnd.pick(SPR.expl.s), x, y, {});
        FX.spark(x, y, 10, { type: 'blue', smax: 4 });
        if (tg) tg.t.damage(9);
        if (b.t % 12 === 0) { Sound.sfx('explode_s', { pitch: 1.4 }); Game.shake(3); }
      }
      if (b.t % 20 === 0) FX.flash(0.25, '#80c0ff');
      Game.areaDamage(W / 2, H / 2, 400, 0.35, false);
    },
    draw(g, b) { g.globalAlpha = 0.15 + Math.sin(b.t * 0.5) * 0.08; g.fillStyle = '#4070ff'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  },
  mustang: {
    dur: 150,
    start(b) {
      b.planes = [];
      for (let i = 0; i < 5; i++) b.planes.push({ x: 30 + i * 45, y: H + 40 + Math.abs(i - 2) * 22 });
    },
    tick(b) {
      for (const pl of b.planes) {
        pl.y -= 3.2;
        if (b.t % 6 === 0 && pl.y < H && pl.y > -20) pShot(pl.x, pl.y - 10, UP + rnd.range(-0.4, 0.4), 2.5, { spr: SPR.bullet.pMissile, kind: 'salvo', dmg: 5, r: 5, onHit: 's' });
        if (b.t % 3 === 0) pShot(pl.x, pl.y - 14, UP, 10, { spr: SPR.bullet.pRed, dmg: 1.2 });
      }
      Game.areaDamage(W / 2, H / 2, 400, 0.15, false);
    },
    draw(g, b) {
      const spr = SPR.player.mustang[2][(b.t >> 1) & 1];
      for (const pl of b.planes) { g.globalAlpha = 0.3; g.drawImage(spr.shadowS, Math.round(pl.x + 10 - spr.shadowS.width / 2), Math.round(pl.y + 26 - spr.shadowS.height / 2)); g.globalAlpha = 1; g.drawImage(spr, Math.round(pl.x - spr.hw), Math.round(pl.y - spr.hh)); }
    }
  },
  shinden: {
    dur: 160,
    start() { FX.flash(0.6, '#c0ffd0'); },
    tick(b) {
      const p = Game.player, w = 26 + Math.sin(b.t * 0.6) * 3;
      b.x = p.x; b.y = p.y - 16; b.w = w;
      for (const e of Game.enemies) {
        if (e.isBoss) { for (const pt of e.parts) if (pt.alive && !pt.armored && Math.abs(e.wx(pt) - b.x) < w + pt.r && e.wy(pt) < b.y) pt.damage(2.2); }
        else if (!e.dead && Math.abs(e.x - b.x) < w + e.r && e.y < b.y) e.damage(2.2);
      }
      for (const eb of Game.ebullets) if (Math.abs(eb.x - b.x) < w + 6 && eb.y < b.y) { eb.dead = true; FX.spark(eb.x, eb.y, 2, { type: 'blue' }); }
      if (b.t % 3 === 0) FX.spark(b.x + rnd.range(-w, w), rnd.range(0, b.y), 3, { type: 'blue', smax: 3 });
      Game.shake(1.5);
    },
    draw(g, b) {
      const w = b.w || 26;
      const cols = ['#0a40a0', '#2080ff', '#80d0ff', '#ffffff'];
      for (let i = 0; i < 4; i++) { g.fillStyle = cols[i]; const ww = w * (1 - i * 0.25) + Math.sin(b.t + i) * 1.5; g.fillRect(Math.round(b.x - ww), 0, Math.round(ww * 2), Math.round(b.y)); }
      pxDisc(g, b.x, b.y, Math.round(w * 0.7 + Math.sin(b.t * 0.8) * 3), '#ffffff');
    }
  },
  mosquito: {
    dur: 170,
    start(b) { b.row = 0; },
    tick(b) {
      if (b.t % 14 === 0 && b.row < 10) {
        const y = H - 30 - b.row * 30; b.row++;
        for (let x = 12; x < W; x += 26) FX.anim(rnd.pick(SPR.expl.m), x + rnd.range(-6, 6), y + rnd.range(-6, 6), { delay: rnd.int(0, 6) });
        Game.areaDamage(W / 2, y, 999, 22, false, 26);
        Game.cancelBullets(false, W / 2, y, 999, 30);
        Sound.sfx('explode_m'); Game.shake(5);
        for (let i = 0; i < 4; i++) FX.smoke(rnd.range(0, W), y, { dark: true, size: 1, life: 70 });
      }
      Game.areaDamage(W / 2, H / 2, 400, 0.12, false);
    },
    draw(g, b) { g.globalAlpha = 0.12; g.fillStyle = '#ff6020'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  }
};

const SUPERS = {
  lightning(p) { for (const a of [-14, 0, 14]) pShot(p.x, p.y - 16, UP + a * DEG, 3.2, { spr: SPR.bullet.pOrb, kind: 'orb', dmg: 0.9, r: 10, pierce: null, persistent: true }); },
  mustang(p) { for (let i = 0; i < 16; i++) { const a = UP + (i - 7.5) * 0.11; pShot(p.x + (i - 7.5) * 2, p.y - 6, a, 3, { spr: SPR.bullet.pRocket, kind: 'salvo', dmg: 9, r: 5, onHit: 's' }); } },
  shinden(p) { for (let i = 0; i < 15; i++) { const a = UP + (i - 7) * 0.12; pShot(p.x, p.y - 12, a, 6, { spr: SPR.bullet.pWave, kind: 'wave', dmg: 6, r: 9, pierce: new Set(), big: true }); } },
  mosquito(p) { pShot(p.x, p.y - 16, UP, 4.5, { spr: SPR.bullet.pFire, kind: 'megabomb', dmg: 0, r: 0, fuse: 40, noHit: true }); },
};
