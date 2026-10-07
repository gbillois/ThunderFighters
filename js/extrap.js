'use strict';
// ============================================================
// High refresh rate support. The simulation always ticks at 60 Hz; on a
// 90/120/144 Hz screen we still render at the display rate. Between two
// ticks every moving object is drawn a fraction `alpha` further along the
// motion it made during the last tick (dead reckoning), so movement stays
// smooth without touching any gameplay code.
// ============================================================

const Extrap = {
  MAXJUMP: 24, // per-tick displacement above this is a teleport (respawn...), never extrapolated

  snapList(a) {
    const M = this.MAXJUMP;
    for (let i = 0; i < a.length; i++) {
      const o = a[i], px = o.px;
      if (px === undefined) { o.ex = 0; o.ey = 0; }
      else {
        const dx = o.x - px, dy = o.y - o.py;
        if (dx > M || dx < -M || dy > M || dy < -M) { o.ex = 0; o.ey = 0; } else { o.ex = dx; o.ey = dy; }
      }
      o.px = o.x; o.py = o.y;
    }
  },
  shiftList(a, k) {
    for (let i = 0; i < a.length; i++) {
      const o = a[i], ex = o.ex;
      if (ex !== 0 || o.ey !== 0) { o.x += ex * k; o.y += o.ey * k; }
    }
  },

  // call once after every simulation tick
  snap() {
    const G = Game;
    this.snapList(G.enemies); this.snapList(G.pbullets); this.snapList(G.ebullets); this.snapList(G.items);
    this.snapList(G.wingmen); this.snapList(FX.parts); this.snapList(FX.smokes); this.snapList(FX.anims);
    this.snapList(FX.rings); this.snapList(FX.texts);
    if (G.player) { this.one[0] = G.player; this.snapList(this.one); }
    if (G.fortress) { this.one[0] = G.fortress; this.snapList(this.one); }
    if (G.bg) this.snapList(G.bg.clouds);
  },
  one: [null],

  // displace everything forward by k ticks (k may be negative to undo)
  shift(k) {
    const G = Game;
    this.shiftList(G.enemies, k); this.shiftList(G.pbullets, k); this.shiftList(G.ebullets, k); this.shiftList(G.items, k);
    this.shiftList(G.wingmen, k); this.shiftList(FX.parts, k); this.shiftList(FX.smokes, k); this.shiftList(FX.anims, k);
    this.shiftList(FX.rings, k); this.shiftList(FX.texts, k);
    if (G.player) { this.one[0] = G.player; this.shiftList(this.one, k); }
    if (G.fortress) { this.one[0] = G.fortress; this.shiftList(this.one, k); }
    if (G.bg) { G.bg.scroll += (G.bg.dy || 0) * k; this.shiftList(G.bg.clouds, k); }
  },
};

// ============================================================
// Frame loop: fixed 60 Hz ticks, render on every display refresh.
// ============================================================
const Loop = {
  STEP: 1000 / 60, TOL: 2, acc: 0, last: 0,
  frames: 0, ticks: 0, fps: 0, ups: 0, t0: 0, drawMs: 0, msAvg: 0,

  // advance the clock by dt ms. Returns alpha (0..1) when a frame should be drawn, or -1 to skip drawing
  advance(dt) {
    if (dt > 100 || dt < 0) dt = this.STEP;       // tab was hidden / clock hiccup
    this.acc += dt;
    let n = 0;
    while (this.acc >= this.STEP - this.TOL && n < 4) {
      Input.update();
      for (let k = 0; k < SPEED; k++) Game.update();
      Extrap.snap();
      this.acc -= this.STEP; n++;
    }
    if (this.acc > this.STEP * 2) this.acc = 0;   // spiral guard
    this.ticks += n;
    const st = Game.state;
    const smooth = Save.data.hfr !== false && (st === 'play' || st === 'clear');
    if (!n && !smooth) return -1;                  // nothing moved, keep the previous picture
    return smooth ? clamp(this.acc / this.STEP, 0, 1) : 0;
  },

  // one display refresh
  frame(now) {
    const dt = now - this.last; this.last = now;
    const alpha = this.advance(dt);
    if (alpha >= 0) {
      const t0 = performance.now();
      Game.render(bufCtx, alpha);
      TouchUI.update();
      if (Save.data.fps) this.meter(bufCtx);
      this.drawMs += performance.now() - t0;
      this.frames++;
    }
    if (now - this.t0 >= 1000) {
      this.fps = Math.round(this.frames * 1000 / (now - this.t0));
      this.ups = Math.round(this.ticks * 1000 / (now - this.t0));
      this.msAvg = this.frames ? this.drawMs / this.frames : 0;
      this.frames = 0; this.ticks = 0; this.drawMs = 0; this.t0 = now;
    }
  },

  meter(g) {
    const s = this.fps + ' FPS  ' + this.ups + ' UPS  ' + this.msAvg.toFixed(1) + ' MS';
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(W - Font.width(s) - 6, H - 40, Font.width(s) + 6, 11);
    Font.draw(g, s, W - 3, H - 38, { align: 'right', color: this.fps >= 55 ? '#8affb4' : '#ff8060' });
  },
};
