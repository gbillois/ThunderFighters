'use strict';
// ============================================================
// Touch control panel, drawn in pixel art in the spirit of the game:
// riveted diamond-plate steel, hazard stripe, round bezel buttons with
// a live gauge, and a small LCD status screen.
// ============================================================

const TouchUI = {
  k: 2, built: false, cv: {}, keys: {},

  init() {
    const root = document.documentElement.style;
    root.setProperty('--tile', 'url(' + this.tile().toDataURL() + ')');
    root.setProperty('--stripe', 'url(' + this.stripe().toDataURL() + ')');
    const q = id => document.getElementById(id);
    this.cv.bomb = q('cBomb'); this.cv.sup = q('cSuper'); this.cv.lcd = q('lcd');
    this.cv.pause = document.querySelector('#pauseBtn canvas');
    this.cv.full = document.querySelector('#fsBtn canvas');
    for (const k in this.cv) if (this.cv[k]) this.cv[k].getContext('2d').imageSmoothingEnabled = false;
    this.drawSmall(this.cv.pause, 'pause', false);
    this.drawSmall(this.cv.full, 'full', false);
    this.built = true;
    this.update(true);
  },

  // ---------- panel textures ----------
  tile() { // 16x16 diamond plate with beveled seams
    const c = makeCanvas(16, 16), g = c.ctx;
    g.fillStyle = '#161c2e'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#1b2238';
    for (let y = 2; y < 16; y += 2) g.fillRect(1, y, 15, 1);
    for (const [x, y] of [[5, 5], [12, 12]]) {
      g.fillStyle = '#34416a'; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3);
      g.fillStyle = '#0c1020'; g.fillRect(x + 1, y + 1, 1, 1);
      g.fillStyle = '#4a5a8a'; g.fillRect(x, y - 1, 1, 1);
    }
    g.fillStyle = '#0c1020'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16);
    g.fillStyle = '#262f4c'; g.fillRect(1, 1, 15, 1); g.fillRect(1, 1, 1, 15);
    return c;
  },
  stripe() { // 16x6 hazard stripe (seamless horizontally)
    const c = makeCanvas(16, 6), g = c.ctx;
    for (let y = 0; y < 6; y++) for (let x = 0; x < 16; x++) {
      let col;
      if (y === 0 || y === 5) col = '#0a0612';
      else { const on = ((x + y) & 7) < 4; col = on ? (y === 1 ? '#ffd060' : y === 4 ? '#b87810' : '#f0a824') : (y === 1 ? '#2a2234' : '#16101e'); }
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
    return c;
  },

  // ---------- generic round bezel button ----------
  // dome(dx, dy, r, x, y) -> [r,g,b] for the pixels inside the bezel
  bezel(w, h, cx, cy, R, ringW, pressed, dome) {
    const img = new ImageData(w, h), d = img.data;
    const steel = MAT_RGB[MAT_INDEX.steel], OUT = OUTLINE_RGB;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy);
      if (r > R + 0.5) continue;
      let col;
      if (r > R - 0.7) col = OUT;
      else if (r > R - ringW) {
        const lit = clamp(0.5 + ((-dx * 0.5 - dy * 0.85) / r) * 0.55 * (pressed ? -0.35 : 1), 0, 1);
        col = steel[clamp(Math.floor(lit * 7 + (bayer(x, y) - 0.5) * 0.8), 0, 6)];
      } else if (r > R - ringW - 0.9) col = OUT;
      else col = dome(dx, dy, r, x, y, R - ringW - 0.9);
      const i = (y * w + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
    // rivets around the ring
    if (ringW >= 4) for (let a = 0; a < 8; a++) {
      const an = a * TAU / 8 + 0.39, rx = Math.round(cx + Math.cos(an) * (R - ringW / 2 - 0.3)), ry = Math.round(cy + Math.sin(an) * (R - ringW / 2 - 0.3));
      for (const [ox, oy, c] of [[0, 0, [230, 240, 248]], [1, 1, [38, 47, 71]]]) { const i = ((ry + oy) * w + rx + ox) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
    }
    return img;
  },
  shadeDome(ramp, dx, dy, r, Rd, x, y, boost = 0) {
    const nz = Math.sqrt(Math.max(0, 1 - (r / Rd) * (r / Rd)));
    const lit = clamp(0.3 + ((-dx * 0.5 - dy * 0.6) / Rd) * 0.55 + nz * 0.5 + boost, 0, 1);
    let idx = Math.floor(lit * (ramp.length - 1) + (bayer(x, y) - 0.5) * 0.9 + 0.5);
    if (lit > 0.93 && nz > 0.3) idx = ramp.length - 1;
    return ramp[clamp(idx, 0, ramp.length - 1)];
  },

  drawBig(canvas, kind, o) {
    const g = canvas.getContext('2d'), W2 = 40, H2 = 46, cx = 20, cy = 19.5, R = 18.2;
    g.clearRect(0, 0, W2, H2);
    const P = o.pressed;
    const red = MAT_RGB[MAT_INDEX.red], navy = MAT_RGB[MAT_INDEX.navy], sky = MAT_RGB[MAT_INDEX.sky], pur = MAT_RGB[MAT_INDEX.purple], wht = MAT_RGB[MAT_INDEX.white];
    const level = kind === 'sup' ? cy + 12.4 - o.fill * 24.8 : 0;
    const dome = (dx, dy, r, x, y, Rd) => {
      const sh = P ? -0.22 : 0;
      if (kind === 'bomb') return this.shadeDome(red, dx, dy, r, Rd, x, y, sh);
      if (o.ready) return this.shadeDome(o.flash ? wht : pur, dx, dy, r, Rd, x, y, sh);
      if (o.fill > 0 && y + 0.5 >= level) {
        if (y + 0.5 - level < 1.2 && o.fill < 1) return [224, 246, 255];
        return this.shadeDome(sky, dx, dy, r, Rd, x, y, sh);
      }
      return this.shadeDome(navy, dx, dy, r, Rd, x, y, sh - 0.12);
    };
    g.putImageData(this.bezel(W2, H2, cx, cy + (P ? 0.5 : 0), R, 4.6, P, dome), 0, 0);
    const iy = Math.round(cy) + (P ? 1 : 0);
    if (kind === 'bomb') this.iconBomb(g, cx, iy);
    else this.iconBolt(g, cx, iy, o.ready && o.flash ? '#a02890' : '#ffffff');
    // label under the button
    const label = kind === 'bomb' ? 'BOMB' : (o.ready ? 'READY' : 'SUPER');
    Font.draw(g, label, 20, 39, { align: 'center', color: kind === 'bomb' ? GRAD.gold : (o.ready ? (o.flash ? GRAD.pink : GRAD.ice) : GRAD.ice), outline: '#0a0612' });
    if (kind === 'bomb') { // stock badge
      pxDisc(g, 33, 7, 6, '#0a0612'); pxDisc(g, 33, 7, 5, o.count > 0 ? '#f0a824' : '#5a5060');
      g.fillStyle = o.count > 0 ? '#ffd870' : '#7a7080'; g.fillRect(30, 3, 4, 1);
      Font.draw(g, String(Math.min(9, o.count)), 33, 4, { align: 'center', color: '#2a0a00' });
    }
  },
  iconBomb(g, cx, cy) {
    pxDisc(g, cx - 1, cy + 2, 6, '#0a0612'); pxDisc(g, cx - 1, cy + 2, 5, '#2a2a36'); pxDisc(g, cx - 1, cy + 2, 3, '#3c3c4c');
    g.fillStyle = '#d8dce8'; g.fillRect(cx - 4, cy, 2, 1); g.fillRect(cx - 5, cy + 1, 1, 2);
    g.fillStyle = '#0a0612'; g.fillRect(cx - 2, cy - 5, 5, 3);
    g.fillStyle = '#8890a4'; g.fillRect(cx - 1, cy - 4, 3, 2);
    pxLine(g, cx + 2, cy - 5, cx + 4, cy - 7, '#0a0612', 3); pxLine(g, cx + 2, cy - 5, cx + 4, cy - 7, '#e8e8e8', 1);
    g.fillStyle = '#ffe040'; g.fillRect(cx + 4, cy - 9, 2, 2); g.fillRect(cx + 5, cy - 10, 1, 1);
  },
  iconBolt(g, cx, cy, col) {
    const pts = [[cx + 3, cy - 8], [cx - 2, cy + 0], [cx + 2, cy + 0], [cx - 3, cy + 8]];
    for (let i = 0; i < 3; i++) pxLine(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#0a0612', 5);
    for (let i = 0; i < 3; i++) pxLine(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col, 3);
  },
  drawSmall(canvas, kind, pressed) {
    if (!canvas) return;
    const g = canvas.getContext('2d'), S = 22, c = 11, R = 10.5;
    g.clearRect(0, 0, S, S);
    const ramp = MAT_RGB[MAT_INDEX.gun];
    g.putImageData(this.bezel(S, S, c, c, R, 3, pressed, (dx, dy, r, x, y, Rd) => this.shadeDome(ramp, dx, dy, r, Rd, x, y, pressed ? -0.2 : 0.1)), 0, 0);
    const o = pressed ? 1 : 0;
    g.fillStyle = '#0a0612';
    if (kind === 'pause') { g.fillRect(6 + o, 6 + o, 4, 10); g.fillRect(12 + o, 6 + o, 4, 10); g.fillStyle = '#e8f0f8'; g.fillRect(7 + o, 7 + o, 2, 8); g.fillRect(13 + o, 7 + o, 2, 8); }
    else { // expand corners
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const x = c + o - sx * 5, y = c + o - sy * 5;
        g.fillStyle = '#0a0612'; g.fillRect(x - (sx > 0 ? 1 : 3), y - 1, 4, 3); g.fillRect(x - 1, y - (sy > 0 ? 1 : 3), 3, 4);
        g.fillStyle = '#ffffff'; g.fillRect(x - (sx > 0 ? 0 : 2), y, 3, 1); g.fillRect(x, y - (sy > 0 ? 0 : 2), 1, 3);
      }
    }
  },

  // ---------- LCD status screen ----------
  drawLcd() {
    const cv = this.cv.lcd; if (!cv) return;
    const g = cv.getContext('2d'), w = 96, h = 30, G = Game;
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#0a0612'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5a6e8e'; g.fillRect(1, 1, w - 2, 1); g.fillRect(1, 1, 1, h - 2);
    g.fillStyle = '#262f47'; g.fillRect(1, h - 2, w - 2, 1); g.fillRect(w - 2, 1, 1, h - 2);
    g.fillStyle = '#071a10'; g.fillRect(2, 2, w - 4, h - 4);
    const T = (s, x, y, col = '#8affb4') => Font.draw(g, s, x, y, { color: col, shadow: '#0c3a22', align: x === 'c' ? 'center' : 'left' });
    if (G.state === 'play' || G.state === 'pause') {
      Font.draw(g, 'STAGE ' + (G.stage + 1) + '/' + STAGES.length, 6, 4, { color: '#8affb4', shadow: '#0c3a22' });
      Font.draw(g, 'LIFE ' + Math.max(0, G.lives) + '  BOMB ' + G.bombs, 6, 12, { color: '#8affb4', shadow: '#0c3a22' });
      Font.draw(g, 'PW', 6, 20, { color: '#8affb4', shadow: '#0c3a22' });
      for (let i = 0; i < 4; i++) { g.fillStyle = i < (G.player ? G.player.power : 1) ? (i === 3 ? '#ff7a50' : '#ffe070') : '#14442a'; g.fillRect(20 + i * 6, 20, 5, 6); }
      if (G.special) Font.draw(g, SPECIALS[G.special.key].name, w - 6, 20, { align: 'right', color: '#ffb8f0', shadow: '#401040' });
      else if (G.wingmen && G.wingmen.length) Font.draw(g, 'WING x' + G.wingmen.length, w - 6, 20, { align: 'right', color: '#9ad8ff', shadow: '#102a44' });
    } else {
      Font.draw(g, 'THUNDER', w / 2, 4, { align: 'center', color: '#8affb4', shadow: '#0c3a22' });
      Font.draw(g, 'FIGHTERS', w / 2, 12, { align: 'center', color: '#8affb4', shadow: '#0c3a22' });
      if ((G.t >> 4) & 1) Font.draw(g, 'DRAG TO FLY', w / 2, 20, { align: 'center', color: '#ffe070', shadow: '#402a08' });
    }
    g.fillStyle = 'rgba(0,0,0,0.28)'; for (let y = 3; y < h - 2; y += 2) g.fillRect(2, y, w - 4, 1);
  },

  // ---------- per-frame refresh (redraws only when something changed) ----------
  update(force) {
    if (!this.built) return;
    const G = Game, playing = G.state === 'play';
    if (document.body.classList.contains('playing') !== playing) document.body.classList.toggle('playing', playing);
    const canPause = playing || G.state === 'bonus';
    if (document.body.classList.contains('canpause') !== canPause) document.body.classList.toggle('canpause', canPause);
    const ready = G.gauge >= 100, flash = ready ? (G.t >> 3) & 1 : 0;
    const pb = Input.touchBtn.bomb ? 1 : 0, ps = Input.touchBtn.super ? 1 : 0;
    const bombs = G.bombs | 0, fill = Math.round(clamp(G.gauge, 0, 100) / 4) / 25;
    const kb = [bombs, pb].join();
    if (force || kb !== this.keys.b) { this.keys.b = kb; this.drawBig(this.cv.bomb, 'bomb', { pressed: !!pb, count: bombs }); }
    const ks = [fill, ps, flash, ready].join();
    if (force || ks !== this.keys.s) { this.keys.s = ks; this.drawBig(this.cv.sup, 'sup', { pressed: !!ps, fill, ready, flash }); }
    const kl = [G.state === 'play' || G.state === 'pause' ? 'P' : 'M' + (G.t >> 4 & 1), G.stage, G.lives, G.bombs, G.player && G.player.power, G.special && G.special.key, G.special && Math.ceil(G.special.t / 90), G.wingmen && G.wingmen.length].join();
    if (force || kl !== this.keys.l) { this.keys.l = kl; this.drawLcd(); }
    // pause button pressed look
    const pp = this.pausePressed ? 1 : 0;
    if (this.pp !== pp) { this.pp = pp; this.drawSmall(this.cv.pause, 'pause', !!pp); }
  },

  // ---------- geometry (called from relayout) ----------
  layout(L) {
    const pad = document.getElementById('pad');
    if (!pad) return;
    document.body.classList.toggle('land', L.landscape);
    if (!L.touch) { pad.style.cssText = ''; return; }
    let k;
    if (L.landscape) k = L.vh >= 600 ? 3 : 2;
    else { const panelH = L.vh - L.cssH; k = clamp(Math.floor((panelH - 16) / 46), 2, 3); }
    this.k = k;
    document.documentElement.style.setProperty('--k', k);
    if (L.landscape) Object.assign(pad.style, { left: '0px', right: '0px', top: '0px', bottom: '0px', height: 'auto' });
    else Object.assign(pad.style, { left: '0px', right: '0px', top: (L.top + L.cssH) + 'px', bottom: '0px', height: 'auto' });
  },
};
