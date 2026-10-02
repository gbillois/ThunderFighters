'use strict';
// ============================================================
// Effects: explosions, sparks, debris, smoke, shockwaves,
// lightning bolts, score popups. Everything goes boom.
// ============================================================

const FX = {
  anims: [], parts: [], smokes: [], rings: [], texts: [], bolts: [], burners: [], flashes: [],
  reset() { this.anims = []; this.parts = []; this.smokes = []; this.rings = []; this.texts = []; this.bolts = []; this.burners = []; this.flashes = []; },

  anim(frames, x, y, o = {}) {
    if (this.anims.length > 260) return;
    this.anims.push({ frames, x, y, vx: o.vx || 0, vy: o.vy || 0, f: -(o.delay || 0), rate: o.rate || 2, ground: !!o.ground, scale: o.scale || 1, top: !!o.top });
  },
  spark(x, y, n, o = {}) {
    for (let i = 0; i < n && this.parts.length < 1400; i++) {
      const a = o.ang !== undefined ? o.ang + rnd.range(-o.spread, o.spread) : rnd() * TAU;
      const s = rnd.range(o.smin || 1, o.smax || 4);
      this.parts.push({ x, y, vx: Math.cos(a) * s + (o.vx || 0), vy: Math.sin(a) * s + (o.vy || 0), life: rnd.int(o.lmin || 10, o.lmax || 28), max: 28, type: o.type || 'spark', ground: !!o.ground, drag: o.drag || 0.92 });
    }
  },
  debris(x, y, n, o = {}) {
    for (let i = 0; i < n && this.parts.length < 1400; i++) {
      const a = rnd() * TAU, s = rnd.range(0.8, o.speed || 3.2);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd.int(25, 55), max: 55, type: 'debris', size: rnd.int(1, o.big ? 3 : 2), ground: !!o.ground, drag: 0.95, smokeT: rnd.int(2, 5), col: rnd.pick(['#2a2630', '#3c3842', '#544c4c', '#6a5e54']) });
    }
  },
  smoke(x, y, o = {}) {
    if (this.smokes.length > 220) return;
    const size = o.size !== undefined ? o.size : rnd.int(0, o.dark ? 1 : 2);
    this.smokes.push({ base: o.dark ? 2 + size * 2 : 1 + size * 2, dark: !!o.dark, x, y, vx: o.vx !== undefined ? o.vx : rnd.range(-0.2, 0.2), vy: o.vy !== undefined ? o.vy : rnd.range(-0.5, -0.1), life: o.life || rnd.int(30, 60), max: o.life || 60, ground: !!o.ground, grow: o.grow || 0.012 });
  },
  ring(x, y, o = {}) { this.rings.push({ x, y, f: 0, rate: o.rate || 1, ground: !!o.ground, set: o.big ? SPR.ringBig : SPR.ring }); },
  text(x, y, str, o = {}) { this.texts.push({ x, y, str: String(str), life: o.life || 50, max: o.life || 50, color: o.color || GRAD.gold, scale: o.scale || 1 }); },
  bolt(x1, y1, x2, y2, o = {}) {
    // jagged lightning polyline
    const pts = [[x1, y1]], n = 8;
    for (let i = 1; i < n; i++) { const t = i / n; pts.push([lerp(x1, x2, t) + rnd.range(-10, 10), lerp(y1, y2, t) + rnd.range(-6, 6)]); }
    pts.push([x2, y2]);
    this.bolts.push({ pts, life: o.life || 8, color: o.color || '#a8e0ff' });
  },
  burner(x, y, frames, o = {}) { this.burners.push({ x, y, t: frames, ground: o.ground !== false, dark: !!o.dark }); },
  flash(alpha = 0.6, color = '#ffffff') { this.flashes.push({ a: alpha, color }); },

  // The main explosion recipe.
  explode(x, y, size = 's', o = {}) {
    const ground = !!o.ground;
    const vx = o.vx || 0, vy = o.vy || 0;
    if (size === 's') {
      this.anim(rnd.pick(SPR.expl.s), x, y, { ground, vx: vx * 0.3, vy: vy * 0.3, rate: 2 });
      this.spark(x, y, 8, { ground, smax: 3.5 });
      this.debris(x, y, 3, { ground });
      Sound.sfx('explode_s', { pan: (x - W / 2) / W });
      Game.shake(1.5);
    } else if (size === 'm') {
      this.anim(rnd.pick(SPR.expl.m), x, y, { ground, rate: 2 });
      for (let i = 0; i < 3; i++) this.anim(rnd.pick(SPR.expl.s), x + rnd.range(-12, 12), y + rnd.range(-12, 12), { ground, delay: rnd.int(2, 12) });
      this.spark(x, y, 18, { ground, smax: 5 });
      this.debris(x, y, 8, { ground, big: true });
      for (let i = 0; i < 4; i++) this.smoke(x + rnd.range(-8, 8), y + rnd.range(-8, 8), { ground, dark: true, life: 50 });
      this.ring(x, y, { ground });
      Sound.sfx('explode_m', { pan: (x - W / 2) / W });
      Game.shake(4);
    } else if (size === 'l') {
      this.anim(rnd.pick(SPR.expl.l), x, y, { ground, rate: 2 });
      for (let i = 0; i < 7; i++) this.anim(rnd.pick(SPR.expl.m), x + rnd.range(-22, 22), y + rnd.range(-22, 22), { ground, delay: rnd.int(2, 24) });
      for (let i = 0; i < 6; i++) this.anim(rnd.pick(SPR.expl.s), x + rnd.range(-30, 30), y + rnd.range(-30, 30), { ground, delay: rnd.int(6, 34) });
      this.spark(x, y, 40, { ground, smax: 7, lmax: 40 });
      this.debris(x, y, 18, { ground, big: true, speed: 4.5 });
      for (let i = 0; i < 10; i++) this.smoke(x + rnd.range(-18, 18), y + rnd.range(-18, 18), { ground, dark: true, life: 80, size: 1 });
      this.ring(x, y, { ground, rate: 0.7 });
      this.flash(0.35);
      Sound.sfx('explode_l', { pan: (x - W / 2) / W });
      Game.shake(9);
    }
    if (ground && size !== 's') this.burner(x, y, size === 'l' ? 240 : 120, { dark: true });
  },
  // long chain explosion for bosses
  bossDeath(x, y, w, h) {
    Sound.sfx('explode_boss');
    for (let i = 0; i < 40; i++) {
      Game.later(i * 4, () => {
        const px = x + rnd.range(-w / 2, w / 2), py = y + rnd.range(-h / 2, h / 2);
        this.anim(rnd.pick(i % 3 ? SPR.expl.m : SPR.expl.l), px, py, { rate: 2 });
        this.spark(px, py, 10, { smax: 6 });
        if (i % 4 === 0) { Game.shake(6); this.debris(px, py, 6, { big: true, speed: 5 }); }
      });
    }
    Game.later(165, () => {
      for (let i = 0; i < 10; i++) this.anim(rnd.pick(SPR.expl.l), x + rnd.range(-w / 3, w / 3), y + rnd.range(-h / 3, h / 3), { delay: rnd.int(0, 12) });
      this.ring(x, y, { rate: 0.5, big: true });
      this.ring(x, y, { rate: 0.3, big: true });
      this.spark(x, y, 120, { smax: 10, lmax: 60 });
      this.debris(x, y, 40, { big: true, speed: 7 });
      this.flash(1);
      Game.shake(18);
    });
  },

  update(dy) {
    for (const a of this.anims) { a.f++; a.x += a.vx; a.y += a.vy + (a.ground ? dy : 0); }
    this.anims = this.anims.filter(a => a.f < a.frames.length * a.rate);
    for (const p of this.parts) {
      p.x += p.vx; p.y += p.vy + (p.ground ? dy : 0);
      p.vx *= p.drag; p.vy *= p.drag; p.life--;
      if (p.type === 'debris' && --p.smokeT <= 0 && p.life > 15) { p.smokeT = 4; if (this.smokes.length < 160) this.smoke(p.x, p.y, { size: 0, life: 20, vx: 0, vy: 0, ground: p.ground, dark: true }); }
    }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const s of this.smokes) { s.x += s.vx; s.y += s.vy + (s.ground ? dy : 0); s.life--; }
    this.smokes = this.smokes.filter(s => s.life > 0);
    for (const r of this.rings) { r.f += r.rate; if (r.ground) r.y += dy; }
    this.rings = this.rings.filter(r => r.f < r.set.length);
    for (const t of this.texts) { t.y -= 0.4; t.life--; }
    this.texts = this.texts.filter(t => t.life > 0);
    for (const b of this.bolts) b.life--;
    this.bolts = this.bolts.filter(b => b.life > 0);
    for (const b of this.burners) {
      b.t--; if (b.ground) b.y += dy;
      if (b.t % 5 === 0) this.smoke(b.x + rnd.range(-4, 4), b.y + rnd.range(-3, 3), { ground: true, dark: b.dark, size: rnd.int(0, 1), life: 50, vy: rnd.range(-0.3, -0.05) });
      if (b.t % 9 === 0 && b.t > 60) this.parts.push({ x: b.x + rnd.range(-3, 3), y: b.y, vx: rnd.range(-0.2, 0.2), vy: -0.4, life: 16, max: 16, type: 'ember', ground: true, drag: 0.98 });
    }
    this.burners = this.burners.filter(b => b.t > 0 && b.y < H + 20);
    for (const f of this.flashes) f.a -= 0.06;
    this.flashes = this.flashes.filter(f => f.a > 0);
  },
  drawGroundLayer(g) {
    // smoke of ground fires first (below planes)
    for (const s of this.smokes) if (s.ground) this._smoke(g, s);
    for (const a of this.anims) if (a.ground) this._anim(g, a);
  },
  drawAirLayer(g) {
    for (const s of this.smokes) if (!s.ground) this._smoke(g, s);
    for (const r of this.rings) {
      const spr = r.set[Math.floor(r.f)];
      g.drawImage(spr, Math.round(r.x - spr.hw), Math.round(r.y - spr.hh));
    }
    for (const a of this.anims) if (!a.ground) this._anim(g, a);
    for (const p of this.parts) {
      const t = p.life / p.max;
      if (p.type === 'spark') {
        g.fillStyle = t > 0.6 ? '#ffffff' : t > 0.35 ? '#ffe070' : t > 0.15 ? '#ff9030' : '#c03010';
        g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
        if (t > 0.5) g.fillRect(Math.round(p.x - p.vx), Math.round(p.y - p.vy), 1, 1);
      } else if (p.type === 'debris') {
        g.fillStyle = p.col; g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      } else if (p.type === 'ember') {
        g.fillStyle = t > 0.5 ? '#ffd060' : '#ff6020'; g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      } else if (p.type === 'star') {
        g.fillStyle = (p.life >> 1) & 1 ? '#ffffff' : '#80e0ff'; g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      } else if (p.type === 'blue') {
        g.fillStyle = t > 0.5 ? '#e0f8ff' : '#40a0ff'; g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      }
    }
    for (const b of this.bolts) {
      for (let i = 1; i < b.pts.length; i++) {
        const [x0, y0] = b.pts[i - 1], [x1, y1] = b.pts[i];
        if (b.life > 4) pxLine(g, x0, y0, x1, y1, b.color, 3);
        pxLine(g, x0, y0, x1, y1, b.life > 4 ? '#ffffff' : b.color, 1);
      }
    }
  },
  drawTop(g) {
    for (const t of this.texts) {
      if (t.life < 15 && (t.life & 1)) continue;
      Font.draw(g, t.str, t.x, t.y, { color: t.color, align: 'center', outline: '#1a0a10', scale: t.scale });
    }
    for (const f of this.flashes) { g.globalAlpha = clamp(f.a, 0, 1); g.fillStyle = f.color; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  },
  _anim(g, a) {
    if (a.f < 0) return;
    const fr = a.frames[Math.min(a.frames.length - 1, Math.floor(a.f / a.rate))];
    g.drawImage(fr, Math.round(a.x - fr.hw), Math.round(a.y - fr.hh));
  },
  _smoke(g, s) {
    // smoke puffs grow by switching to bigger pre-drawn sizes (never scaled)
    const t = s.life / s.max;
    const sizes = s.dark ? SPR.smokeSizesDark : SPR.smokeSizes;
    const grow = Math.floor((1 - t) * s.grow * 260);
    const spr = sizes[clamp(s.base + grow, 0, sizes.length - 1)];
    if (t < 0.3 && (s.life & 1)) return; // dithered fade-out by flicker
    g.globalAlpha = t < 0.5 ? 0.6 : 0.85;
    g.drawImage(spr, Math.round(s.x - spr.hw), Math.round(s.y - spr.hh));
    g.globalAlpha = 1;
  }
};
