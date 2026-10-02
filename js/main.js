'use strict';
// ============================================================
// Boot, display scaling and main loop
// ============================================================
const params = new URLSearchParams(location.search);
const START_STAGE = clamp(parseInt(params.get('stage') || '1', 10) - 1, 0, 4);
const DEBUG_BOSS = params.get('boss') || null;
const GOD = params.has('god');
const SPEED = clamp(parseInt(params.get('speed') || '1', 10), 1, 8);

let screenCanvas, screenCtx, buf, bufCtx, scanPattern = null;

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
  const dpr = window.devicePixelRatio || 1;
  screenCanvas.style.width = cssW + 'px';
  screenCanvas.style.height = cssH + 'px';
  screenCanvas.width = Math.round(cssW * dpr);
  screenCanvas.height = Math.round(cssH * dpr);
  screenCtx = screenCanvas.getContext('2d');
  screenCtx.imageSmoothingEnabled = false;
  const left = Math.floor((vw - cssW) / 2);
  const top = touch && !landscape ? Math.max(0, Math.floor((availH - cssH) / 2)) : Math.floor((vh - cssH) / 2);
  screenCanvas.style.left = left + 'px';
  screenCanvas.style.top = top + 'px';
  Input.scale = scale; Input.offX = left; Input.offY = top;
  // scanline pattern: one darker line per game pixel row
  const k = screenCanvas.height / H;
  scanPattern = null;
  if (k >= 2.5) {
    const pc = document.createElement('canvas');
    pc.width = 4; pc.height = Math.round(k * 2);
    const pg = pc.getContext('2d');
    pg.fillStyle = 'rgba(0,0,0,0.22)';
    const lh = Math.max(1, Math.round(k * 0.3));
    pg.fillRect(0, Math.round(k) - lh, 4, lh);
    pg.fillRect(0, Math.round(k * 2) - lh, 4, lh);
    scanPattern = screenCtx.createPattern(pc, 'repeat');
  }
}

function present() {
  const c = screenCtx;
  c.imageSmoothingEnabled = false;
  c.drawImage(buf, 0, 0, screenCanvas.width, screenCanvas.height);
  if (Save.data.scanlines && scanPattern) { c.fillStyle = scanPattern; c.fillRect(0, 0, screenCanvas.width, screenCanvas.height); }
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
  buf = makeCanvas(W, H); bufCtx = buf.ctx;
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
      if (n) { Game.render(bufCtx); present(); syncTouchButtons(); }
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
