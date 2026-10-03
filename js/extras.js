'use strict';
// ============================================================
// Depth systems: wingmen, special weapon pods, new items,
// the friendly SUPPLY FORTRESS you fly into, rear alerts.
// ============================================================

// ---------- sprites ----------
function buildExtraSprites() {
  // mini wingman versions of every plane (3 bank frames, 2 prop frames)
  SPR.wing = {};
  for (const name in PLANE_MODELS) {
    const info = PLANE_INFO[name], k = 0.62;
    const w = Math.ceil(info.w * k) + 2, h = Math.ceil(info.h * k) + 2;
    SPR.wing[name] = [-1, 0, 1].map(b => {
      const roll = b * 0.4;
      return [0, 1].map(pf => {
        const c = forgeSprite(w, h, f => { f.sx = k * Math.cos(roll); f.sy = k; f.tilt = Math.sin(roll) * 0.9; PLANE_MODELS[name](f); });
        for (const [px, py] of info.props) propDisc(c, w / 2 + px * k * Math.cos(roll), h / 2 + py * k - 0.5, Math.max(4, info.propW * k * Math.cos(roll)), pf);
        return c;
      });
    });
  }
  // allied supply fortress (airship carrier, nose up, hangar bay at the tail)
  SPR.fortress = forgeSprite(124, 178, f => {
    sym(f, s => {
      f.poly([[s * 30, -10], [s * 58, 6], [s * 58, 16], [s * 30, 12]], 'navy', { bevel: 2 });
      for (const y of [-40, 20]) { f.capsule(s * 44, y - 8, s * 44, y + 10, 6, 'silver', { z: 0.6, r2: 5 }); f.ellipse(s * 44, y - 9, 5, 2, 'navy', { z: 1 }); }
      f.poly([[s * 18, 64], [s * 34, 84], [s * 34, 88], [s * 14, 80]], 'navy', { bevel: 1.5 });
    });
    f.ellipse(0, 0, 32, 86, 'silver', { prof: 'cylY' });
    for (let y = -76; y <= 76; y += 10) f.line(-30, y, 30, y, -1);
    f.rect(-31, -30, 62, 6, 'navy', { paint: true });
    f.rect(-31, 30, 62, 6, 'navy', { paint: true });
    f.roundel(0, -52, [[8, '#1c2a70'], [5.5, '#f0f0f0'], [3, '#c02020']]);
    f.rect(-10, -82, 20, 22, 'steel', { z: 1.1, bevel: 2 });
    f.rect(-7, -80, 14, 3, 'glass', { z: 1.3, prof: 'flat', amp: 0.2 });
    // hangar bay at the tail
    f.rect(-11, 54, 22, 28, 'black', { prof: 'flat', z: 1.05, amp: 0.1 });
    f.rect(-9, 56, 18, 24, 'dark', { prof: 'flat', z: 1.06, amp: 0.1 });
  });
  SPR.fortress.bayY = 68;
}

// ---------- special weapons (replace the main shot for a while) ----------
function hitColumn(x, halfW, yTop, yBot, dmg) {
  const hits = [];
  for (const e of Game.enemies) {
    if (e.dead || e.gone) continue;
    if (e.isBoss) {
      if (!e.active) continue;
      for (const p of e.parts) {
        if (!p.alive || p.armored) continue;
        const px = e.wx(p), py = e.wy(p);
        if (Math.abs(px - x) < halfW + p.r && py < yBot && py > yTop) { p.damage(dmg); hits.push([px, py + p.r]); }
      }
    } else if (Math.abs(e.x - x) < halfW + e.r && e.y < yBot && e.y > Math.max(yTop, -10)) { e.damage(dmg); hits.push([e.x, e.y + e.r]); }
  }
  return hits;
}
const SPECIALS = {
  L: {
    name: 'LASER', grad: GRAD.ice,
    fire(p) {
      p.beam = 4;
      const w = 2 + p.power;
      const hits = hitColumn(p.x, w, -20, p.y - 10, 0.26 + p.power * 0.06);
      for (const [hx, hy] of hits) if (rnd.chance(0.5)) FX.spark(hx, hy, 1, { type: 'blue', smax: 2.5 });
      if (p.t % 7 === 0) Sound.sfx('beam', { vol: 0.5 });
    },
    draw(g, p) {
      if (!p.beam) return;
      const w = 2 + p.power, x = Math.round(p.x), y = Math.round(p.y - 14);
      const cols = ['#1040c0', '#3a90ff', '#a0e8ff', '#ffffff'];
      for (let i = 0; i < 4; i++) {
        const ww = Math.max(1, w + 2 - i * 2 + ((p.t + i) & 1));
        g.fillStyle = cols[i]; g.fillRect(x - ww, 0, ww * 2, y);
      }
      for (let yy = (p.t * 7) % 16; yy < y; yy += 16) { g.fillStyle = '#ffffff'; g.fillRect(x - w - 2, yy, 1, 3); g.fillRect(x + w + 1, yy + 8, 1, 3); }
      pxDisc(g, x, y, w + 2 + (p.t & 1), '#ffffff');
    }
  },
  F: {
    name: 'FLAME', grad: GRAD.fire,
    fire(p) {
      for (let i = 0; i < 2; i++) {
        const a = UP + rnd.range(-0.2, 0.2) + p.bank * 0.25;
        pShot(p.x + rnd.range(-3, 3), p.y - 16, a, rnd.range(5, 6.5), { kind: 'flame', spr: SPR.expl.s[0][0], dmg: 0.11 + p.power * 0.025, r: 7, persistent: true, life: 24 });
      }
      if (p.t % 9 === 0) Sound.sfx('flame', { vol: 0.6 });
    }
  },
  K: {
    name: 'FLAK', grad: GRAD.gold,
    fire(p) {
      if (p.t % 13) return;
      const n = 5 + p.power;
      for (let i = 0; i < n; i++) pShot(p.x, p.y - 14, UP + (i - (n - 1) / 2) * 0.13 + rnd.range(-0.03, 0.03), rnd.range(6.5, 7.5), { kind: 'flak', spr: SPR.bullet.pStreakY, dmg: 2.2, r: 4, fuse: rnd.int(24, 30) });
      Sound.sfx('flak', { vol: 0.6 });
    }
  },
  C: {
    name: 'CHAIN', grad: GRAD.pink,
    fire(p) {
      if (p.t % 9) return;
      let from = [p.x, p.y - 16];
      const done = new Set();
      for (let j = 0; j < 3 + (p.power >> 1); j++) {
        let best = null, bd = (j ? 95 : 160) ** 2;
        for (const e of Game.enemies) {
          if (e.dead || e.gone) continue;
          if (e.isBoss) {
            if (!e.active) continue;
            for (const q of e.parts) { if (!q.alive || q.armored || done.has(q)) continue; const d = dist2(from[0], from[1], e.wx(q), e.wy(q)); if (d < bd) { bd = d; best = { t: q, x: e.wx(q), y: e.wy(q) }; } }
          } else if (!done.has(e) && e.y > -8) { const d = dist2(from[0], from[1], e.x, e.y); if (d < bd) { bd = d; best = { t: e, x: e.x, y: e.y }; } }
        }
        if (!best) break;
        done.add(best.t);
        FX.bolt(from[0], from[1], best.x, best.y, { life: 7, color: '#e080ff' });
        best.t.damage(2.6 + p.power * 0.4);
        FX.spark(best.x, best.y, 4, { type: 'blue', smax: 3 });
        from = [best.x, best.y];
      }
      if (done.size) Sound.sfx('beam', { vol: 0.45, pitch: 1.5 });
      else FX.bolt(p.x, p.y - 16, p.x + rnd.range(-20, 20), p.y - 70, { life: 4, color: '#e080ff' });
    }
  },
};

// ---------- wingmen ----------
class Wingman {
  constructor(side) {
    const p = Game.player;
    this.side = side; this.x = p.x + side * 40; this.y = H + 20; this.hp = 6; this.t = 0; this.flash = 0; this.bank = 0;
  }
  update() {
    const p = Game.player;
    this.t++;
    if (this.flash > 0) this.flash--;
    const tx = p.alive ? p.x + this.side * 27 : W / 2 + this.side * 40;
    const ty = p.alive ? p.y + 12 : H - 50;
    const ox = this.x;
    this.x += (tx - this.x) * 0.12; this.y += (ty - this.y) * 0.12;
    this.bank += (clamp((this.x - ox) * 0.6, -1, 1) - this.bank) * 0.2;
    if (p.alive && p.firing && this.t % 7 === 0) pShot(this.x, this.y - 8, UP, 9, { spr: SPR.bullet.pVulcan, dmg: 0.8 });
    if (p.alive && p.firing && this.t % 45 === 0) pShot(this.x, this.y, UP + this.side * 0.5, 2.5, { spr: SPR.bullet.pMissile, kind: 'homing', dmg: 3, r: 4, speed: 5, turn: 0.12 });
  }
  hit() {
    this.hp--; this.flash = 8;
    Sound.sfx('shield_hit');
    if (this.hp <= 0) { this.dead = true; FX.explode(this.x, this.y, 'm'); }
  }
  draw(g) {
    if (this.flash && (this.t & 1)) return;
    const set = SPR.wing[Game.plane][clamp(Math.round(this.bank) + 1, 0, 2)];
    const spr = set[(this.t >> 1) & 1];
    g.drawImage(spr, Math.round(this.x - spr.hw), Math.round(this.y - spr.hh));
  }
  drawShadow(g) {
    const s = SPR.wing[Game.plane][1][0].shadowS;
    g.globalAlpha = 0.28; g.drawImage(s, Math.round(this.x + 12 - s.width / 2), Math.round(this.y + 22 - s.height / 2)); g.globalAlpha = 1;
  }
}

// ---------- supply fortress ----------
class SupplyFortress {
  constructor() {
    this.x = W / 2; this.y = H + 120; this.state = 'arrive'; this.t = 0; this.door = 0; this.docked = false;
    Game.cancelBullets(false);
    FX.text(W / 2, 150, 'SUPPLY FORTRESS', { color: GRAD.ice, life: 120 });
  }
  get bay() { return this.y + SPR.fortress.bayY; }
  update() {
    this.t++;
    const p = Game.player;
    switch (this.state) {
      case 'arrive':
        this.y += (110 - this.y) * 0.025 - 0.4;
        if (this.y < 112) { this.y = 110; this.state = 'wait'; this.t = 0; }
        break;
      case 'wait':
        this.door = Math.min(1, this.door + 0.04);
        this.x = W / 2 + Math.sin(this.t * 0.01) * 10;
        if (p.alive && !p.entering && Math.abs(p.x - this.x) < 13 && Math.abs(p.y - (this.bay + 6)) < 14) {
          this.state = 'dock'; this.t = 0; p.docked = true; p.inv = 999;
          Sound.sfx('dock'); Game.shake(3);
        } else if (this.t > 660) { this.state = 'leave'; this.t = 0; }
        break;
      case 'dock':
        if (this.t < 175) { p.x += (this.x - p.x) * 0.15; p.y += (this.bay - 4 - p.y) * 0.15; }
        else p.x = this.x;
        if (this.t > 24) this.door = Math.max(0, this.door - 0.06);
        if (this.t > 40 && this.t < 150 && this.t % 6 === 0) FX.spark(this.x + rnd.range(-10, 10), this.bay + rnd.range(-8, 8), 4, { smax: 2.5 });
        if (this.t === 150) this.repair();
        if (this.t > 170) this.door = Math.min(1, this.door + 0.08);
        if (this.t > 185) { p.y += 2.2; if (p.y > this.bay + 34 || p.y > H - 20 || this.t > 260) { p.y = Math.min(p.y, H - 20); p.docked = false; p.inv = 120; this.state = 'leave'; this.t = 0; } }
        break;
      case 'leave':
        this.door = Math.max(0, this.door - 0.05);
        this.y -= Math.min(4, this.t * 0.04);
        if (this.y < -200) this.done = true;
        break;
    }
  }
  repair() {
    const p = Game.player, G = Game;
    G.bombs = Math.min(6, Math.max(G.bombs, G.D.bombs) + 1);
    if (p.power < 4) p.power++;
    p.shield = true;
    G.gauge = 100;
    if (G.wingmen.length < 2) G.addWingman();
    Sound.sfx('repair');
    Sound.playMusic('supply');
    G.later(200, () => { if (G.state === 'play' && !G.boss) Sound.playMusic(STAGES[G.stage].music); });
    FX.text(this.x, this.y - 40, 'REPAIR COMPLETE!', { color: GRAD.green, life: 110 });
    FX.text(this.x, this.y - 28, 'BOMB+1 POWER+1 SHIELD', { color: '#ffffff', life: 110 });
    FX.ring(this.x, this.bay, {});
  }
  draw(g) {
    const s = SPR.fortress, x = Math.round(this.x), y = Math.round(this.y);
    g.drawImage(s, x - Math.round(s.hw), y - Math.round(s.hh));
    // propellers
    for (const ex of [-44, 44]) for (const ey of [-49, 11]) {
      g.fillStyle = 'rgba(220,225,235,0.45)'; g.fillRect(x + ex - 7, y + ey - 1, 14, 1);
      g.fillStyle = '#20202a'; g.fillRect(x + ex + ((this.t >> 1) & 1 ? -6 : 4), y + ey - 1, 2, 1);
    }
    // bay doors (slide sideways) and landing lights
    const by = Math.round(this.bay), open = Math.round(this.door * 9);
    g.fillStyle = '#5e647c'; g.fillRect(x - 9, by - 12, 9 - open, 24); g.fillRect(x + open, by - 12, 9 - open, 24);
    g.fillStyle = '#3a3e54'; g.fillRect(x - 1 - open, by - 12, 1, 24); g.fillRect(x + open, by - 12, 1, 24);
    if (this.state === 'wait' || this.state === 'dock') {
      const on = (this.t >> 3) & 1;
      for (let i = 0; i < 4; i++) { g.fillStyle = ((i + (this.t >> 3)) % 4 === 0) ? '#60ff80' : '#205030'; g.fillRect(x - 13, by - 10 + i * 6, 2, 2); g.fillRect(x + 11, by - 10 + i * 6, 2, 2); }
      if (this.state === 'wait') {
        for (let i = 0; i < 3; i++) { const yy = by + 26 + i * 7 - ((this.t >> 2) % 7); g.fillStyle = on ? '#60ff80' : '#30c050'; pxLine(g, x - 4, yy + 3, x, yy, g.fillStyle); pxLine(g, x, yy, x + 4, yy + 3, g.fillStyle); }
        if ((this.t >> 4) & 1) Font.draw(g, 'FLY IN!', x, by + 52, { align: 'center', color: GRAD.green, outline: '#0a0612' });
      }
    }
  }
  drawShadow(g) {
    if (!SPR.fortress.shadowB) SPR.fortress.shadowB = scaledShadow(SPR.fortress, 0.7);
    const s = SPR.fortress.shadowB;
    g.globalAlpha = 0.22; g.drawImage(s, Math.round(this.x + 24 - s.width / 2), Math.round(this.y + 44 - s.height / 2)); g.globalAlpha = 1;
  }
}

// ---------- Game integration ----------
Object.assign(Game, {
  wingmen: [], special: null, alerts: [], fortress: null,
  resetExtras() { this.alerts = []; this.fortress = null; if (this.player) this.player.docked = false; },
  addWingman() {
    const side = this.wingmen.some(w => w.side === -1) ? 1 : -1;
    this.wingmen.push(new Wingman(side));
    Sound.sfx('wingman');
  },
  alert(x, frames = 70) { this.alerts.push({ x: clamp(x, 12, W - 12), t: frames }); Sound.sfx('behind'); },
  updateExtras() {
    for (const w of this.wingmen) w.update();
    this.wingmen = this.wingmen.filter(w => !w.dead);
    if (this.special && --this.special.t <= 0) { this.special = null; FX.text(this.player.x, this.player.y - 22, 'WEAPON OVER', { color: '#c0c8e0', life: 40 }); }
    for (const a of this.alerts) a.t--;
    this.alerts = this.alerts.filter(a => a.t > 0);
    if (this.fortress) { this.fortress.update(); if (this.fortress.done) this.fortress = null; }
    // enemy bullets also hit wingmen
    if (this.wingmen.length) for (const b of this.ebullets) {
      if (b.dead) continue;
      for (const w of this.wingmen) if (!w.dead && dist2(b.x, b.y, w.x, w.y) < (b.r + 6) ** 2) { b.dead = true; w.hit(); break; }
    }
  },
  pickupExtra(it) {
    const p = this.player;
    switch (it.type) {
      case 'H':
        if (this.wingmen.length < 2) { this.addWingman(); FX.text(p.x, p.y - 22, 'WINGMAN!', { color: GRAD.ice }); }
        else { this.addScore(5000); FX.text(p.x, p.y - 22, '5000', { color: GRAD.gold }); Sound.sfx('powerup'); }
        break;
      case 'F': p.power = 4; FX.text(p.x, p.y - 22, 'FULL POWER!', { color: GRAD.fire }); Sound.sfx('powerup'); break;
      case 'G': this.addScore(5000); FX.text(it.x, it.y - 8, '5000', { color: GRAD.gold, life: 40 }); Sound.sfx('gold'); break;
      case 'W': {
        const k = this.wcycle(it);
        this.special = { key: k, t: 1500, max: 1500 };
        FX.text(p.x, p.y - 22, SPECIALS[k].name + '!', { color: SPECIALS[k].grad, life: 70 });
        Sound.sfx('weapon');
        break;
      }
    }
  },
  wcycle(it) { return 'LFKC'[Math.floor((it.t + (it.seed || 0)) / 100) % 4]; },
  drawAlerts(g) {
    for (const a of this.alerts) {
      if ((a.t >> 2) & 1) continue;
      const x = Math.round(a.x), y = H - 30;
      g.fillStyle = '#0a0612'; for (let i = 0; i < 9; i++) g.fillRect(x - i - 1, y + i - 1, i * 2 + 3, 1);
      g.fillStyle = '#ff3020'; for (let i = 0; i < 8; i++) g.fillRect(x - i, y + i, i * 2 + 1, 1);
      g.fillStyle = '#ffffff'; g.fillRect(x, y + 2, 1, 3); g.fillRect(x, y + 6, 1, 1);
    }
    if (this.alerts.length && (this.t >> 3) & 1) Font.draw(g, 'BEHIND!', W / 2, H - 44, { align: 'center', color: GRAD.red, outline: '#0a0612' });
  },
  drawSpecialHUD(g) {
    const s = this.special;
    if (!s) return;
    const S = SPECIALS[s.key];
    Font.draw(g, S.name, W - 4, 13, { align: 'right', color: S.grad, outline: '#0a0612' });
    const w = 40, fw = Math.round(s.t / s.max * w);
    g.fillStyle = '#0a0612'; g.fillRect(W - w - 5, 22, w + 2, 4);
    g.fillStyle = s.t < 240 && (this.t >> 2) & 1 ? '#ffffff' : '#ffd040'; g.fillRect(W - w - 4, 23, fw, 2);
  },
});
