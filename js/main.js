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

function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const touch = document.body.classList.contains('touch');
  const landscape = vw > vh;
  let availW = vw, availH = vh;
  if (touch && !landscape) availH = vh - Math.max(130, vh * 0.2);
  if (touch && landscape) availW = vw - 220;
  let scale = Math.min(availW / W, availH / H);
  // integer scaling whenever it still fills most of the screen: crisp, even pixels
  if (scale >= 2 && Math.floor(scale) / scale > 0.82) scale = Math.floor(scale);
  const cssW = Math.floor(W * scale), cssH = Math.floor(H * scale);
  // The canvas stays at the native 240x320: the browser upscales it with
  // nearest-neighbour filtering (image-rendering: pixelated) on the GPU, which is
  // far cheaper on phones than redrawing a full-resolution canvas every frame.
  screenCanvas.style.width = cssW + 'px';
  screenCanvas.style.height = cssH + 'px';
  const left = Math.floor((vw - cssW) / 2);
  const top = touch && !landscape ? Math.max(0, Math.floor((availH - cssH) / 2)) : Math.floor((vh - cssH) / 2);
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
}
function updateScanlines() {
  const sc = document.getElementById('scan');
  if (sc) sc.style.display = Save.data.scanlines && sc.dataset.ok === '1' ? 'block' : 'none';
}

function syncTouchButtons() {
  const sup = document.querySelector('.tbtn[data-btn="super"]');
  const bomb = document.querySelector('.tbtn[data-btn="bomb"]');
  if (!sup) return;
  const playing = Game.state === 'play';
  document.body.classList.toggle('playing', playing);
  sup.classList.toggle('ready', Game.gauge >= 100);
  sup.style.setProperty('--fill', (Game.gauge || 0) + '%');
  bomb.querySelector('span').textContent = 'x' + (Game.bombs || 0);
}

function boot() {
  Save.load();
  screenCanvas = document.getElementById('screen');
  screenCanvas.width = W; screenCanvas.height = H;
  bufCtx = screenCanvas.getContext('2d');
  bufCtx.imageSmoothingEnabled = false;
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
    let last = performance.now(), acc = 0;
    const STEP = 1000 / 60;
    function frame(now) {
      acc += Math.min(100, now - last); last = now;
      let n = 0;
      while (acc >= STEP && n < 4) {
        Input.update();
        for (let k = 0; k < SPEED; k++) Game.update();
        acc -= STEP; n++;
      }
      if (n) { Game.render(bufCtx); syncTouchButtons(); }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }, 30);
}
window.addEventListener('load', boot);
// PWA: installable + playable offline
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}
