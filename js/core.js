'use strict';
// ============================================================
// THUNDER FIGHTERS - core utilities, RNG, noise, input, save
// ============================================================

const W = 240;                   // logical width (arcade portrait)
let H = 320;                     // logical height: adapts to the screen between BASE_H and MAX_H
const BASE_H = 320, MAX_H = 440;
const TAU = Math.PI * 2;

// ---------- math ----------
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }

// ---------- RNG ----------
function makeRng(seed) {
  let s = seed >>> 0;
  const r = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (a, b) => a + r() * (b - a);
  r.int = (a, b) => Math.floor(a + r() * (b - a + 1));
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.chance = p => r() < p;
  return r;
}
const rnd = makeRng((Date.now() ^ 0x5eed) >>> 0);

// ---------- value noise ----------
function hash2(x, y, seed) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, seed, px, py) {
  let xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  let x1 = xi + 1, y1 = yi + 1;
  if (px) { xi = ((xi % px) + px) % px; x1 = ((x1 % px) + px) % px; }
  if (py) { yi = ((yi % py) + py) % py; y1 = ((y1 % py) + py) % py; }
  const a = hash2(xi, yi, seed), b = hash2(x1, yi, seed);
  const c = hash2(xi, y1, seed), d = hash2(x1, y1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, seed, oct = 4, px = 0, py = 0) {
  let sum = 0, amp = 0.5, norm = 0, f = 1;
  for (let i = 0; i < oct; i++) {
    sum += amp * vnoise(x * f, y * f, seed + i * 17, px ? px * f : 0, py ? py * f : 0);
    norm += amp; amp *= 0.5; f *= 2;
  }
  return sum / norm;
}
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const bayer = (x, y) => BAYER4[(y & 3) * 4 + (x & 3)];

// ---------- colors ----------
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b) {
  return '#' + ((1 << 24) | (clamp(r | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(b | 0, 0, 255)).toString(16).slice(1);
}
function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}

// ---------- canvas helpers ----------
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  c.ctx = ctx;
  return c;
}
// Silhouette (for hit flash and shadows)
function silhouette(src, color) {
  const c = makeCanvas(src.width, src.height);
  c.ctx.drawImage(src, 0, 0);
  c.ctx.globalCompositeOperation = 'source-in';
  c.ctx.fillStyle = color;
  c.ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

// ---------- save ----------
const Save = {
  data: { hi: [0, 0, 0], musicVol: 0.6, sfxVol: 0.8, scanlines: true, autofire: true, hitbox: true, hfr: true, fps: false, unlockedLoop: false },
  load() {
    try {
      const s = localStorage.getItem('thunderfighters_save');
      if (s) Object.assign(this.data, JSON.parse(s)); else this.fresh = true;
    } catch (e) { /* storage unavailable */ }
  },
  store() {
    try { localStorage.setItem('thunderfighters_save', JSON.stringify(this.data)); } catch (e) { /* ignore */ }
  }
};

// ---------- input ----------
// Virtual buttons: left right up down fire bomb super start back
const Input = {
  held: {}, prev: {}, pressed: {},
  keys: {},
  touchActive: false,         // a finger is currently steering
  touchDX: 0, touchDY: 0,     // accumulated movement in game pixels
  taps: [],                   // taps in game coordinates (menus)
  isTouch: false,
  touchBtn: { bomb: false, super: false },
  pauseTap: false,
  gamepadIndex: -1,
  scale: 1, offX: 0, offY: 0, // canvas mapping, set by main
  KEYMAP: {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    KeyZ: 'fire', Space: 'fire', KeyJ: 'fire',
    KeyX: 'bomb', KeyK: 'bomb',
    KeyC: 'super', KeyL: 'super',
    Enter: 'start', Escape: 'back', KeyP: 'start', Backspace: 'back'
  },
  init(canvas) {
    window.addEventListener('keydown', e => {
      if (this.KEYMAP[e.code]) { this.keys[this.KEYMAP[e.code]] = true; e.preventDefault(); }
      if (e.code === 'KeyM') { const m = Sound.toggleMute(); Game.toast(m ? 'SOUND OFF' : 'SOUND ON'); }
      if (e.code === 'KeyF') toggleFullscreen();
      Sound.init();
    });
    window.addEventListener('keyup', e => {
      if (this.KEYMAP[e.code]) { this.keys[this.KEYMAP[e.code]] = false; e.preventDefault(); }
    });
    window.addEventListener('blur', () => { this.keys = {}; if (Game.state === 'play') Game.pause(true); });

    // Pointer / touch steering: drag anywhere on the page moves the plane (relative).
    const area = document.getElementById('touchArea') || document.body;
    const pointers = new Map();
    let steerId = null, lastX = 0, lastY = 0, startX = 0, startY = 0, startT = 0;
    const toGame = (cx, cy) => [(cx - this.offX) / this.scale, (cy - this.offY) / this.scale];
    area.addEventListener('pointerdown', e => {
      Sound.init();
      if (e.pointerType !== 'mouse') this.setTouch(true);
      if (e.target.closest && e.target.closest('.tbtn')) return;
      e.preventDefault();
      pointers.set(e.pointerId, true);
      if (steerId === null) {
        steerId = e.pointerId; lastX = startX = e.clientX; lastY = startY = e.clientY; startT = performance.now();
        if (e.pointerType !== 'mouse') this.touchActive = true;
        try { area.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
    }, { passive: false });
    area.addEventListener('pointermove', e => {
      if (e.pointerId !== steerId) return;
      e.preventDefault();
      if (e.pointerType === 'mouse' && !(e.buttons & 1)) return;
      const k = 1.15 / this.scale;
      this.touchDX += (e.clientX - lastX) * k;
      this.touchDY += (e.clientY - lastY) * k;
      lastX = e.clientX; lastY = e.clientY;
      if (e.pointerType === 'mouse') this.touchActive = true;
    }, { passive: false });
    const end = e => {
      pointers.delete(e.pointerId);
      if (e.pointerId === steerId) {
        const dt = performance.now() - startT;
        if (dt < 350 && Math.abs(e.clientX - startX) < 12 && Math.abs(e.clientY - startY) < 12) {
          // Pause / fullscreen only react to a real tap, never to a drag passing over them
          const onBtn = id => {
            const el = document.getElementById(id);
            if (!el || getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden') return false;
            const r = el.getBoundingClientRect();
            return startX >= r.left && startX <= r.right && startY >= r.top && startY <= r.bottom;
          };
          if (onBtn('pauseBtn')) this.pauseTap = true;
          else if (onBtn('fsBtn')) toggleFullscreen();
          else this.taps.push(toGame(e.clientX, e.clientY));
        }
        steerId = null; this.touchActive = false;
      }
    };
    area.addEventListener('pointerup', end);
    area.addEventListener('pointercancel', end);

    // On-screen buttons
    document.querySelectorAll('.tbtn').forEach(b => {
      const name = b.dataset.btn;
      const on = e => { e.preventDefault(); Sound.init(); this.setTouch(true); this.touchBtn[name] = true; b.classList.add('down'); };
      const off = e => { e.preventDefault(); this.touchBtn[name] = false; b.classList.remove('down'); };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('pointerleave', off);
    });
    window.addEventListener('gamepadconnected', e => { this.gamepadIndex = e.gamepad.index; });
    document.addEventListener('contextmenu', e => e.preventDefault());
  },
  setTouch(v) {
    if (this.isTouch === v) return;
    this.isTouch = v;
    document.body.classList.toggle('touch', v);
    if (typeof resize === 'function') resize();
  },
  update() {
    const h = {};
    for (const k in this.keys) if (this.keys[k]) h[k] = true;
    if (this.touchBtn.bomb) h.bomb = true;
    if (this.touchBtn.super) h.super = true;
    if (this.pauseTap) { h.start = true; this.pauseTap = false; }
    // gamepad
    const pads = this.gamepadIndex >= 0 && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (ax < -0.35) h.left = true; if (ax > 0.35) h.right = true;
      if (ay < -0.35) h.up = true; if (ay > 0.35) h.down = true;
      const b = i => p.buttons[i] && p.buttons[i].pressed;
      if (b(14)) h.left = true; if (b(15)) h.right = true; if (b(12)) h.up = true; if (b(13)) h.down = true;
      if (b(0) || b(7)) h.fire = true;
      if (b(1) || b(6)) h.bomb = true;
      if (b(2) || b(3) || b(5)) h.super = true;
      if (b(9)) h.start = true;
      if (b(8)) h.back = true;
      this.padAxis = [Math.abs(ax) > 0.2 ? ax : 0, Math.abs(ay) > 0.2 ? ay : 0];
    }
    this.pressed = {};
    for (const k in h) if (!this.prev[k]) this.pressed[k] = true;
    this.prev = h;
    this.held = h;
  },
  consumeTouchDelta() {
    const d = [this.touchDX, this.touchDY];
    this.touchDX = 0; this.touchDY = 0;
    return d;
  },
  consumeTaps() { const t = this.taps; this.taps = []; return t; }
};

function toggleFullscreen() {
  const el = document.documentElement;
  try {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen || (() => { })).call(el);
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(() => { });
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || (() => { })).call(document);
    }
  } catch (e) { /* ignore */ }
}

// ---------- pixel-exact primitives (no anti-aliasing anywhere) ----------
function pxLine(g, x0, y0, x1, y1, color, w = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  g.fillStyle = color;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, n = 0;
  const o = Math.floor(w / 2);
  for (;;) {
    g.fillRect(x0 - o, y0 - o, w, w);
    if ((x0 === x1 && y0 === y1) || ++n > 2000) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function pxCircle(g, cx, cy, r, color) {
  cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
  g.fillStyle = color;
  let x = r, y = 0, err = 1 - r;
  while (x >= y) {
    for (const [a, b] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) g.fillRect(cx + a, cy + b, 1, 1);
    y++;
    if (err < 0) err += 2 * y + 1; else { x--; err += 2 * (y - x) + 1; }
  }
}
function pxDisc(g, cx, cy, r, color) {
  cx = Math.round(cx); cy = Math.round(cy);
  g.fillStyle = color;
  for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); g.fillRect(cx - w, cy + y, w * 2 + 1, 1); }
}
