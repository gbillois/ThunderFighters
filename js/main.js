'use strict';
// ============================================================
// Boot, display scaling and main loop
// ============================================================
const params = new URLSearchParams(location.search);
const START_STAGE = clamp(parseInt(params.get('stage') || '1', 10) - 1, 0, 8);
const DEBUG_BOSS = params.get('boss') || null;
const GOD = params.has('god');
const DEBUG_BONUS = params.get('bonus') || null;
const SPEED = clamp(parseInt(params.get('speed') || '1', 10), 1, 8);

let screenCanvas, bufCtx;

// States where the playfield height may change (no live world on screen)
const H_CHANGE_OK = new Set(['boot', 'title', 'options', 'howto', 'select', 'difficulty', 'intro', 'gameover', 'ending']);

// Lay the game out so it fills the whole screen. The playfield keeps a fixed 240 px
// width and grows taller (BASE_H..MAX_H) to use tall phone screens; the touch panel
// takes the remaining height below it, or the sides in landscape.
function relayout(force) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const touch = document.body.classList.contains('touch');
  const landscape = vw > vh;
  let availW = vw, availH = vh, panelMin = 0;
  if (touch && !landscape) { panelMin = clamp(Math.round(vh * 0.15), 126, 150); availH = vh - panelMin; }
  if (touch && landscape) availW = vw - 230;
  const canChange = force || H_CHANGE_OK.has(Game.state);
  let hLog = H;
  if (canChange) {
    let sc = availW / W;
    if (sc >= 2 && Math.floor(sc) / sc > 0.82) sc = Math.floor(sc);
    hLog = clamp(Math.floor(availH / sc), BASE_H, MAX_H);
  }
  if (hLog !== H) { H = hLog; screenCanvas.height = H; bufCtx.imageSmoothingEnabled = false; }
  let scale = Math.min(availW / W, availH / H);
  // integer scaling whenever it still fills most of the screen: crisp, even pixels
  if (scale >= 2 && Math.floor(scale) / scale > 0.82) scale = Math.floor(scale);
  const cssW = Math.floor(W * scale), cssH = Math.floor(H * scale);
  // The canvas keeps its native size: the browser upscales it with nearest-neighbour
  // filtering (image-rendering: pixelated) on the GPU, far cheaper on phones than
  // redrawing a full-resolution canvas every frame.
  screenCanvas.style.width = cssW + 'px';
  screenCanvas.style.height = cssH + 'px';
  const left = Math.floor((vw - cssW) / 2);
  const top = touch && !landscape ? 0 : Math.floor((vh - cssH) / 2);
  screenCanvas.style.left = left + 'px';
  screenCanvas.style.top = top + 'px';
  Input.scale = scale; Input.offX = left; Input.offY = top;
  // scanlines: a static CSS overlay, one darker band per game pixel row (no per-frame cost)
  const sc = document.getElementById('scan');
  if (sc) {
    Object.assign(sc.style, { left: left + 'px', top: top + 'px', width: cssW + 'px', height: cssH + 'px' });
    const k = cssH / H;
    sc.style.backgroundImage = `repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) ${(k * 0.68).toFixed(2)}px, rgba(0,0,0,0.22) ${(k * 0.68).toFixed(2)}px, rgba(0,0,0,0.22) ${k.toFixed(3)}px)`;
    sc.dataset.ok = k * (window.devicePixelRatio || 1) >= 2.5 ? '1' : '0';
  }
  updateScanlines();
  if (typeof TouchUI !== 'undefined') TouchUI.layout({ vw, vh, cssW, cssH, left, top, touch, landscape, scale });
}
function resize() { relayout(false); }
function updateScanlines() {
  const sc = document.getElementById('scan');
  if (sc) sc.style.display = Save.data.scanlines && sc.dataset.ok === '1' ? 'block' : 'none';
}

function boot() {
  Save.load();
  if (Save.fresh && (('ontouchstart' in window) || navigator.maxTouchPoints > 0)) Save.data.scanlines = false; // phones: cheaper by default
  screenCanvas = document.getElementById('screen');
  screenCanvas.width = W; screenCanvas.height = H;
  bufCtx = screenCanvas.getContext('2d');
  bufCtx.imageSmoothingEnabled = false;
  TouchUI.init();
  Input.init(screenCanvas);
  if (('ontouchstart' in window) || navigator.maxTouchPoints > 0) Input.setTouch(true);
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  Sound.setMusicVolume(Save.data.musicVol);
  Sound.setSfxVolume(Save.data.sfxVol);
  // build all assets after the loading text is painted
  setTimeout(() => {
    buildAllSprites();
    buildDecoSprites();
    buildWorld2Sprites();
    buildExtraSprites();
    Game.init();
    document.getElementById('loading').style.display = 'none';
    Atlas.packAll();
    Loop.last = Loop.t0 = performance.now();
    const raf = now => { Loop.frame(now); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }, 30);
}
window.addEventListener('load', boot);
// PWA: installable + playable offline
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}
