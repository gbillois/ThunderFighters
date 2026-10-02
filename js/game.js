'use strict';
// ============================================================
// Game state machine, gameplay loop, HUD and menus
// ============================================================

const DIFFS = [
  { name: 'EASY', desc: ['SLOWER BULLETS', 'MORE LIVES AND BOMBS'], bspd: 0.78, rate: 0.7, hp: 0.85, lives: 4, bombs: 3, col: GRAD.green },
  { name: 'NORMAL', desc: ['THE ARCADE EXPERIENCE', ''], bspd: 1.0, rate: 1.0, hp: 1.0, lives: 2, bombs: 3, col: GRAD.gold },
  { name: 'HARD', desc: ['BULLET HELL', 'REVENGE BULLETS'], bspd: 1.18, rate: 1.4, hp: 1.2, lives: 1, bombs: 2, col: GRAD.red },
];
const EXTENDS = [200000, 600000, 1200000, 2000000];

const Game = {
  state: 'boot', t: 0, st: 0,
  diff: 1, D: DIFFS[1], planeIdx: 0, plane: 'lightning',
  stage: 0, pal: 'green',
  score: 0, lives: 3, bombs: 3, gauge: 0, continues: 0,
  enemies: [], pbullets: [], ebullets: [], items: [], laters: [],
  bomb: null, boss: null, player: null, bg: null,
  shakeAmt: 0, menu: 0, hot: [], toastMsg: null, toastT: 0,
  medalValue: 200, extendIdx: 0,

  init() {
    this.buildUI();
    this.toTitle();
  },
  buildUI() {
    SPR.icon = {
      life: forgeSprite(13, 12, f => {
        f.poly(mirrorPoly([[1, -1], [5, 0], [5, 2], [1, 3]]), 'silver', { amp: 0.5 });
        f.capsule(0, -4, 0, 4, 1.5, 'silver', { z: 0.5 });
        f.poly(mirrorPoly([[0.5, 3], [2.5, 4], [2.5, 5], [0.5, 5]]), 'silver');
      }),
      bomb: forgeSprite(9, 12, f => {
        f.ellipse(0, 0, 2.6, 3.8, 'red', { z: 0.5 });
        f.rect(-2.5, 3, 5, 2, 'gun', { z: 0.3 });
        f.ellipse(0, -1, 1, 1.5, 'white', { z: 1, paint: true });
      }),
    };
    // logo
    const L = this.logo = makeCanvas(232, 92);
    const g = L.ctx;
    const steel = ['#ffffff', '#e0ecff', '#b8d0f0', '#88a8d8', '#6080c0', '#4058a0', '#283878'];
    const draw = (txt, y, grad) => {
      for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, -2], [-2, 2], [2, 2], [0, 5], [-2, 5], [2, 5], [3, 4], [-3, 4]]) Font.draw(g, txt, 116 + dx, y + dy, { scale: 4, align: 'center', color: '#0a0612' });
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [0, 2], [1, 2], [-1, 2]]) Font.draw(g, txt, 116 + dx, y + dy, { scale: 4, align: 'center', color: '#3a1028' });
      // per-pixel gradient across the 28px glyph height
      const tmp = makeCanvas(232, 30);
      Font.draw(tmp.ctx, txt, 116, 0, { scale: 4, align: 'center', color: '#fff' });
      tmp.ctx.globalCompositeOperation = 'source-atop';
      for (let i = 0; i < 28; i++) { tmp.ctx.fillStyle = grad[Math.min(grad.length - 1, Math.floor(i / 4))]; tmp.ctx.fillRect(0, i, 232, 1); }
      tmp.ctx.fillStyle = 'rgba(255,255,255,0.9)';
      tmp.ctx.globalCompositeOperation = 'source-atop';
      tmp.ctx.fillRect(0, 13, 232, 1);
      g.drawImage(tmp, 0, y);
    };
    draw('THUNDER', 6, steel);
    draw('FIGHTERS', 52, GRAD.fire);
    // speed stripes between the words
    for (let i = 0; i < 3; i++) {
      const y = 41 + i * 3, x0 = 30 + i * 10, x1 = 202 - i * 10;
      g.fillStyle = '#0a0612'; g.fillRect(x0 - 1, y - 1, x1 - x0 + 2, 3);
      g.fillStyle = ['#ffe040', '#ff8020', '#c02818'][i]; g.fillRect(x0, y, x1 - x0, 1);
    }
    L.shine = silhouette(L, '#ffffff');
  },

  // ---------------- helpers used everywhere ----------------
  later(frames, fn) { this.laters.push({ t: frames, fn }); },
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); },
  toast(msg) { this.toastMsg = msg; this.toastT = 90; },
  bombActive() { return !!this.bomb; },
  addScore(n) {
    this.score += n;
    if (this.extendIdx < EXTENDS.length && this.score >= EXTENDS[this.extendIdx]) {
      this.extendIdx++; this.lives++; Sound.sfx('oneup');
      if (this.player) FX.text(this.player.x, this.player.y - 20, 'EXTEND!', { color: GRAD.green, life: 80 });
    }
  },
  addGauge(dmg) {
    if (this.gauge >= 100) return;
    this.gauge = Math.min(100, this.gauge + dmg * 0.12);
    if (this.gauge >= 100) { Sound.sfx('charge_ready'); if (this.player) FX.text(this.player.x, this.player.y - 26, 'SUPER READY', { color: GRAD.pink, life: 70 }); }
  },
  spawnItem(type, x, y) {
    const it = { type, x: clamp(x, 10, W - 10), y, t: 0, vx: 0, vy: 0 };
    if (type === 'medal') { it.vy = -1.2; it.vx = rnd.range(-0.6, 0.6); }
    else { it.vx = rnd.chance(0.5) ? 0.7 : -0.7; it.vy = -0.9; }
    this.items.push(it);
  },
  cancelBullets(score, x = W / 2, y = H / 2, r = 9999, band = 0) {
    let n = 0;
    for (const b of this.ebullets) {
      if (b.dead) continue;
      if (band ? Math.abs(b.y - y) > band : dist2(b.x, b.y, x, y) > r * r) continue;
      b.dead = true; n++;
      if (score) { FX.parts.push({ x: b.x, y: b.y, vx: 0, vy: -0.6, life: 30, max: 30, type: 'star', drag: 0.98 }); }
      else if (n % 2) FX.parts.push({ x: b.x, y: b.y, vx: rnd.range(-1, 1), vy: rnd.range(-1, 1), life: 12, max: 12, type: 'spark', drag: 0.9 });
    }
    if (score && n) { this.addScore(n * 50); }
  },
  areaDamage(x, y, r, dmg, ground, band = 0) {
    for (const e of this.enemies) {
      if (e.dead || e.gone) continue;
      if (e.isBoss) {
        if (!e.active) continue;
        for (const p of e.parts) {
          if (!p.alive || p.armored) continue;
          const px = e.wx(p), py = e.wy(p);
          if (band ? Math.abs(py - y) < band + p.r : dist2(px, py, x, y) < (r + p.r) ** 2) p.damage(dmg);
        }
      } else {
        if (e.y < -16) continue;
        if (band ? Math.abs(e.y - y) < band + e.r : dist2(e.x, e.y, x, y) < (r + e.r) ** 2) e.damage(dmg);
      }
    }
  },
  useBomb() {
    if (this.bomb || this.bombs <= 0 || !this.player.alive) return;
    this.bombs--;
    const def = BOMBS[this.plane];
    this.bomb = { def, t: 0 };
    def.start && def.start(this.bomb);
    this.cancelBullets(false);
    this.player.inv = Math.max(this.player.inv, def.dur + 40);
    Sound.sfx('bomb'); this.shake(6);
  },
  useSuper() {
    if (this.gauge < 100 || !this.player.alive) return;
    this.gauge = 0;
    SUPERS[this.plane](this.player);
    Sound.sfx('super'); FX.flash(0.3, '#fff0c0'); this.shake(3);
    FX.ring(this.player.x, this.player.y - 10, { rate: 1.2 });
  },
  warning() {
    this.warnT = 200;
    Sound.stopMusic(0.8);
    Sound.sfx('warning');
  },

  // ---------------- state changes ----------------
  setState(s) { this.state = s; this.st = 0; this.menu = 0; Input.consumeTaps(); Input.pressed = {}; },
  toTitle() {
    this.setState('title');
    this.titleBg = new Background(0, 2400);
    this.titleBg.scroll = 400;
    this.titleBg.speed = 0.6;
    this.enemies = []; this.ebullets = []; this.pbullets = []; this.items = [];
    FX.reset();
    Sound.playMusic('title');
  },
  newGame() {
    this.D = DIFFS[this.diff];
    this.score = 0; this.lives = this.D.lives; this.bombs = this.D.bombs; this.gauge = 0;
    this.continues = 0; this.extendIdx = 0; this.medalValue = 200;
    this.player = new Player(this.plane);
    this.startStage(START_STAGE || 0);
  },
  startStage(i) {
    this.stage = i;
    this.setState('intro');
    Sound.stopMusic(0.4);
  },
  beginStage() {
    const st = STAGES[this.stage];
    this.pal = st.pal;
    this.enemies = []; this.ebullets = []; this.pbullets = []; this.items = []; this.laters = [];
    this.bomb = null; this.boss = null; this.warnT = 0; this.clearing = false; this.clearT = 0;
    this.deathsThisStage = 0; this.medalsThisStage = 0;
    FX.reset();
    this.bg = new Background(this.stage, st.len);
    for (const t of ROT_TYPES) enemyRotSet(t, this.pal);
    const D0 = DIFFS[this.diff];
    this.D = Object.assign({}, D0, { rate: D0.rate * (1 + this.stage * 0.07), bspd: D0.bspd * (1 + this.stage * 0.03) });
    this.player.reset();
    this.script = stageScript(this.stage);
    this.scriptWait = 0;
    if (DEBUG_BOSS) { this.script = (function* () { yield 30; const b = new Boss(BOSSES[DEBUG_BOSS], {}); Game.boss = b.mid ? null : b; Game.enemies.push(b); while (!b.dead && !b.gone) yield 1; })(); }
    this.bannerT = 240;
    Sound.playMusic(st.music);
    Sound.sfx('stage_start');
  },

  // ---------------- main update ----------------
  update() {
    this.t++; this.st++;
    if (this.toastT > 0) this.toastT--;
    const fn = this['u_' + this.state];
    if (fn) fn.call(this);
    this.shakeAmt *= 0.86; if (this.shakeAmt < 0.3) this.shakeAmt = 0;
  },
  tapped() {
    const taps = Input.consumeTaps();
    for (const [x, y] of taps) for (const h of this.hot) if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
    return taps.length ? { any: true } : null;
  },
  menuNav(n) {
    if (Input.pressed.up) { this.menu = (this.menu + n - 1) % n; Sound.sfx('select'); }
    if (Input.pressed.down) { this.menu = (this.menu + 1) % n; Sound.sfx('select'); }
  },
  confirmPressed() { return Input.pressed.fire || Input.pressed.start; },

  u_title() {
    this.titleBg.update();
    if (this.titleBg.scroll >= this.titleBg.len - H - 2) this.titleBg.scroll = 0;
    this.menuNav(3);
    const tap = this.tapped();
    let act = null;
    if (tap && tap.action !== undefined) { this.menu = tap.action; act = tap.action; }
    if (this.confirmPressed()) act = this.menu;
    if (act === 0) { Sound.sfx('confirm'); this.setState('select'); Sound.playMusic('select'); this.menu = this.planeIdx; }
    else if (act === 1) { Sound.sfx('confirm'); this.setState('options'); }
    else if (act === 2) { Sound.sfx('confirm'); this.setState('howto'); }
  },
  u_options() {
    this.titleBg.update();
    if (this.titleBg.scroll >= this.titleBg.len - H - 2) this.titleBg.scroll = 0;
    const N = 5;
    this.menuNav(N);
    const tap = this.tapped();
    const S = Save.data;
    let dir = 0, act = null;
    if (Input.pressed.left) dir = -1; if (Input.pressed.right) dir = 1;
    if (tap && tap.action !== undefined) { this.menu = tap.action; act = tap.action; dir = tap.dir || 1; }
    if (this.confirmPressed()) { act = this.menu; dir = 1; }
    if (dir || act !== null) {
      const m = act !== null ? act : this.menu;
      if (m === 0) { S.musicVol = clamp(Math.round((S.musicVol + dir * 0.1) * 10) / 10, 0, 1); if (S.musicVol === 0 && dir > 0 && act !== null) S.musicVol = 0.1; Sound.setMusicVolume(S.musicVol); }
      if (m === 1) { S.sfxVol = clamp(Math.round((S.sfxVol + dir * 0.1) * 10) / 10, 0, 1); Sound.setSfxVolume(S.sfxVol); Sound.sfx('medal'); }
      if (m === 2) { S.scanlines = !S.scanlines; }
      if (m === 3) { S.autofire = !S.autofire; }
      if (m === 4 && act !== null) { Save.store(); Sound.sfx('cancel'); this.setState('title'); this.menu = 1; return; }
      if (m !== 1) Sound.sfx('select');
      Save.store();
    }
    if (Input.pressed.back) { Save.store(); Sound.sfx('cancel'); this.setState('title'); this.menu = 1; }
  },
  u_howto() {
    this.titleBg.update();
    if (this.titleBg.scroll >= this.titleBg.len - H - 2) this.titleBg.scroll = 0;
    if (this.tapped() || this.confirmPressed() || Input.pressed.back) { Sound.sfx('cancel'); this.setState('title'); this.menu = 2; }
  },
  u_select() {
    this.titleBg.update();
    if (this.titleBg.scroll >= this.titleBg.len - H - 2) this.titleBg.scroll = 0;
    if (Input.pressed.left) { this.planeIdx = (this.planeIdx + 3) % 4; Sound.sfx('select'); }
    if (Input.pressed.right) { this.planeIdx = (this.planeIdx + 1) % 4; Sound.sfx('select'); }
    const tap = this.tapped();
    let go = this.confirmPressed();
    if (tap && tap.plane !== undefined) { if (this.planeIdx === tap.plane) go = true; else { this.planeIdx = tap.plane; Sound.sfx('select'); } }
    if (tap && tap.go) go = true;
    if (tap && tap.back || Input.pressed.back) { Sound.sfx('cancel'); this.setState('title'); Sound.playMusic('title'); return; }
    if (go) { this.plane = PLANE_ORDER[this.planeIdx]; Sound.sfx('confirm'); this.setState('difficulty'); this.menu = this.diff; }
  },
  u_difficulty() {
    this.titleBg.update();
    if (this.titleBg.scroll >= this.titleBg.len - H - 2) this.titleBg.scroll = 0;
    this.menuNav(3);
    const tap = this.tapped();
    let go = this.confirmPressed();
    if (tap && tap.action !== undefined) { this.menu = tap.action; go = true; }
    if (tap && tap.back || Input.pressed.back) { Sound.sfx('cancel'); this.setState('select'); return; }
    if (go) { this.diff = this.menu; Sound.sfx('confirm'); this.newGame(); }
  },
  u_intro() {
    if (this.st === 3) this.beginStage();
    if (this.st > 3) this.setState('play');
  },
  u_play() {
    if (Input.pressed.start || Input.pressed.back) { this.pause(true); return; }
    const p = this.player;
    // stage script
    if (this.script && !this.clearing) {
      if (this.scriptWait > 0) this.scriptWait--;
      while (this.scriptWait <= 0 && this.script) {
        const r = this.script.next();
        if (r.done) { this.script = null; break; }
        this.scriptWait = r.value || 1;
      }
    }
    this.bg.update();
    for (const l of this.laters) l.t--;
    const due = this.laters.filter(l => l.t <= 0);
    this.laters = this.laters.filter(l => l.t > 0);
    for (const l of due) l.fn();
    if (this.bannerT > 0) this.bannerT--;
    if (this.warnT > 0) this.warnT--;

    p.update();
    // player bullets
    for (const b of this.pbullets) updatePlayerBullet(b);
    this.collidePlayerBullets();
    this.pbullets = this.pbullets.filter(b => !b.dead);
    // enemies
    for (const e of this.enemies) if (!e.dead || e.isBoss) e.update();
    this.enemies = this.enemies.filter(e => !(e.dead && !e.isBoss) && !e.gone);
    // enemy bullets
    for (const b of this.ebullets) {
      b.x += b.vx; b.y += b.vy; b.t++;
      if (b.burst && --b.burst <= 0) {
        b.dead = true;
        if (this.player.alive) Shoot.ring(b.x, b.y, { n: 10, speed: 1.3, type: 'pink_s', off: rnd() * TAU });
        FX.anim(SPR.expl.s[0], b.x, b.y, {});
      }
      if (b.x < -12 || b.x > W + 12 || b.y < -12 || b.y > H + 12) b.dead = true;
    }
    this.collidePlayer();
    this.ebullets = this.ebullets.filter(b => !b.dead);
    // items
    this.updateItems();
    // bomb
    if (this.bomb) {
      const b = this.bomb; b.t++;
      b.def.tick(b);
      if (b.t >= b.def.dur) this.bomb = null;
    }
    FX.update(this.bg.dy);
    // death & respawn
    if (!p.alive) {
      this.respawnT--;
      if (this.respawnT <= 0) {
        if (this.lives >= 0) { p.reset(); this.bombs = Math.max(this.bombs, this.D.bombs); }
        else { this.setState('continue'); this.contT = 10 * 60 - 1; Sound.stopMusic(1); }
      }
    }
    // boss defeated -> clear
    if (this.boss && this.boss.dead && !this.clearing) {
      this.clearing = true; this.clearT = 0;
      Sound.stopMusic(1.5);
    }
    if (this.clearing) {
      this.clearT++;
      if (this.clearT === 200) Sound.playMusic('clear');
      if (this.clearT > 220) { p.y -= Math.min(6, (this.clearT - 220) * 0.12); p.bank *= 0.9; }
      if (this.clearT === 330) this.toClear();
    }
  },
  pause(on) {
    if (on && this.state === 'play') { this.setState('pause'); Sound.setPaused(true); Sound.sfx('pause'); }
  },
  u_pause() {
    this.menuNav(2);
    const tap = this.tapped();
    let act = null;
    if (tap && tap.action !== undefined) act = tap.action;
    if (this.confirmPressed()) act = this.menu;
    if (Input.pressed.back) act = 0;
    if (act === 0) { this.state = 'play'; Input.pressed = {}; Sound.setPaused(false); Sound.sfx('pause'); }
    if (act === 1) { Sound.setPaused(false); this.saveHi(); this.toTitle(); }
  },
  u_continue() {
    FX.update(0);
    this.contT--;
    const tap = this.tapped();
    if (this.st > 30 && (this.confirmPressed() || (tap && tap.cont))) {
      this.continues++; this.lives = this.D.lives; this.bombs = this.D.bombs; this.score = 0;
      this.player.power = Math.max(2, this.player.power);
      this.player.reset(); this.state = 'play'; Input.pressed = {};
      Sound.playMusic(this.boss ? (STAGES[this.stage].boss === 'citadel' ? 'finalboss' : 'boss') : STAGES[this.stage].music);
      Sound.sfx('confirm');
      return;
    }
    if (Input.pressed.bomb || (tap && tap.giveup)) this.contT = Math.floor(this.contT / 60) * 60 - 1;
    if (Input.pressed.bomb) this.contT -= 0;
    if (this.contT % 60 === 59) Sound.sfx('select');
    if (this.contT <= 0) { this.saveHi(); this.setState('gameover'); Sound.playMusic('gameover'); }
  },
  u_gameover() {
    if (this.st > 300 || (this.st > 60 && (this.confirmPressed() || this.tapped()))) this.toTitle();
  },
  toClear() {
    this.setState('clear');
    const noMiss = this.deathsThisStage === 0;
    this.tally = [
      ['STAGE BONUS', 10000 * (this.stage + 1)],
      ['NO MISS BONUS', noMiss ? 30000 * (this.stage + 1) : 0],
      ['BOMB STOCK', this.bombs * 5000],
      ['MEDALS', this.medalsThisStage * 500],
    ];
    this.tallyTotal = this.tally.reduce((a, b) => a + b[1], 0);
    this.tallyShown = 0;
  },
  u_clear() {
    this.bg.update(); FX.update(this.bg.dy);
    const k = this.st;
    if (k > 60 && this.tallyShown < this.tallyTotal) {
      const step = Math.max(500, Math.ceil(this.tallyTotal / 90));
      const add = Math.min(step, this.tallyTotal - this.tallyShown);
      this.tallyShown += add; this.addScore(add);
      if (k % 3 === 0) Sound.sfx('tally');
    }
    if ((k > 140 && this.tallyShown >= this.tallyTotal && (this.confirmPressed() || this.tapped())) || k > 600) {
      this.addScore(this.tallyTotal - this.tallyShown); this.tallyShown = this.tallyTotal;
      this.saveHi();
      if (this.stage < STAGES.length - 1) this.startStage(this.stage + 1);
      else { this.setState('ending'); Sound.playMusic('ending'); this.endBg = new Background(0, 2400); this.endBg.speed = 0.5; }
    }
  },
  u_ending() {
    this.endBg.update();
    if (this.endBg.scroll >= this.endBg.len - H - 2) this.endBg.scroll = 0;
    if (this.st > 400 && (this.confirmPressed() || this.tapped())) { this.saveHi(); this.toTitle(); }
  },
  saveHi() {
    const S = Save.data;
    if (this.score > (S.hi[this.diff] || 0)) { S.hi[this.diff] = this.score; Save.store(); }
  },

  // ---------------- collisions ----------------
  collidePlayerBullets() {
    for (const b of this.pbullets) {
      if (b.dead || b.noHit) continue;
      for (const e of this.enemies) {
        if (e.dead || e.gone) continue;
        if (!e.isBoss && (e.y < -12 || e.y > H + 8)) continue;
        const tgt = e.hit(b.x, b.y, b.r);
        if (tgt) {
          if (b.pierce) { if (b.pierce.has(tgt)) continue; b.pierce.add(tgt); tgt.damage(b.dmg); FX.spark(b.x, b.y, 2, { type: 'blue', smax: 2 }); continue; }
          if (b.persistent) { tgt.damage(b.dmg); continue; }
          tgt.damage(b.dmg);
          b.dead = true;
          if (b.onHit === 's') { FX.explode(b.x, b.y, 's'); this.areaDamage(b.x, b.y, 14, b.dmg * 0.5, true); }
          else { FX.spark(b.x, b.y - 4, 2, { ang: -Math.PI / 2, spread: 1.2, smax: 2.5, lmax: 10 }); Sound.sfx('hit', { vol: 0.4 }); }
          break;
        } else if (e.isBoss && !b.pierce && !b.persistent && e.blocks(b.x, b.y)) {
          b.dead = true;
          if (b.t % 2) FX.parts.push({ x: b.x, y: b.y, vx: rnd.range(-1, 1), vy: rnd.range(-1.5, 0), life: 8, max: 28, type: 'spark', drag: 0.9 });
          break;
        }
      }
    }
  },
  collidePlayer() {
    const p = this.player;
    if (!p.alive || p.inv > 0 || this.bomb || this.clearing || GOD) return;
    const hr = p.hitR;
    for (const b of this.ebullets) {
      if (b.dead) continue;
      const rr = b.r + hr;
      if (dist2(b.x, b.y, p.x, p.y - 1) < rr * rr) { b.dead = true; this.playerHit(); return; }
    }
    for (const e of this.enemies) {
      if (e.dead || e.ground || e.isBoss) continue;
      const rr = e.r * 0.7 + hr;
      if (dist2(e.x, e.y, p.x, p.y) < rr * rr) { e.damage(20); this.playerHit(); return; }
    }
  },
  playerHit() {
    const p = this.player;
    if (p.shield) { p.shield = false; p.inv = 90; this.cancelBullets(false, p.x, p.y, 60); Sound.sfx('explode_m'); FX.ring(p.x, p.y); return; }
    p.alive = false;
    FX.explode(p.x, p.y, 'l');
    FX.spark(p.x, p.y, 60, { smax: 8 });
    Sound.sfx('player_die');
    this.shake(12);
    this.lives--;
    this.deathsThisStage++;
    if (p.power > 1) { p.power--; this.spawnItem('P', p.x, p.y); }
    this.gauge = Math.max(0, this.gauge - 30);
    this.respawnT = 110;
    this.cancelBullets(false);
  },
  updateItems() {
    const p = this.player;
    for (const it of this.items) {
      it.t++;
      if (it.type === 'medal') {
        it.vy = Math.min(1.1, it.vy + 0.05);
        it.vx *= 0.97;
        if (p.alive && dist2(it.x, it.y, p.x, p.y) < 40 * 40) { const a = angleTo(it.x, it.y, p.x, p.y); it.vx = Math.cos(a) * 3; it.vy = Math.sin(a) * 3; }
        if (it.y > H + 10) { it.dead = true; this.medalValue = 200; }
      } else {
        if (it.t < 600) {
          if (it.x < 10 || it.x > W - 10) it.vx = -it.vx;
          if (it.y < 12 && it.vy < 0) it.vy = -it.vy;
          if (it.y > H - 20 && it.vy > 0) it.vy = -it.vy;
          if (it.t > 30 && Math.abs(it.vy) < 0.6) it.vy = Math.sign(it.vy || 1) * 0.6;
        } else if (it.y > H + 12) it.dead = true;
        it.vy = clamp(it.vy + 0.01, -1, 1);
      }
      it.x += it.vx; it.y += it.vy;
      if (p.alive && dist2(it.x, it.y, p.x, p.y) < 16 * 16) { it.dead = true; this.pickup(it); }
    }
    this.items = this.items.filter(i => !i.dead);
  },
  pickup(it) {
    const p = this.player;
    switch (it.type) {
      case 'P':
        if (p.power < 4) { p.power++; FX.text(p.x, p.y - 22, p.power === 4 ? 'MAX POWER!' : 'POWER UP!', { color: GRAD.gold }); }
        else { this.addScore(10000); FX.text(p.x, p.y - 22, '10000', { color: GRAD.gold }); }
        Sound.sfx('powerup'); break;
      case 'B':
        if (this.bombs < 6) this.bombs++; else this.addScore(10000);
        FX.text(p.x, p.y - 22, 'BOMB +1', { color: GRAD.green }); Sound.sfx('bomb_item'); break;
      case 'S': p.shield = true; FX.text(p.x, p.y - 22, 'SHIELD', { color: GRAD.ice }); Sound.sfx('powerup'); break;
      case 'L': this.lives++; FX.text(p.x, p.y - 22, '1UP!', { color: GRAD.green }); Sound.sfx('oneup'); break;
      case 'medal':
        this.addScore(this.medalValue); this.medalsThisStage++;
        FX.text(it.x, it.y - 8, this.medalValue, { color: GRAD.gold, life: 30 });
        Sound.sfx('medal', { pitch: 1 + this.medalValue / 4000 });
        this.medalValue = Math.min(5000, this.medalValue + 200);
        break;
    }
  },

  // ================= RENDER =================
  render(g) {
    g.imageSmoothingEnabled = false;
    const fn = this['r_' + this.state];
    if (fn) fn.call(this, g);
    if (this.toastT > 0) {
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, H - 22, W, 12);
      Font.draw(g, this.toastMsg, W / 2, H - 20, { align: 'center', color: '#fff' });
    }
  },
  // world rendering shared by play / pause / clear / continue
  drawWorld(g) {
    const sx = this.shakeAmt ? Math.round(rnd.range(-this.shakeAmt, this.shakeAmt)) : 0;
    const sy = this.shakeAmt ? Math.round(rnd.range(-this.shakeAmt, this.shakeAmt)) : 0;
    g.save(); g.translate(sx, sy);
    this.bg.drawGround(g);
    // ground units
    for (const e of this.enemies) if (e.ground) e.draw(g);
    FX.drawGroundLayer(g);
    this.bg.drawCloudShadows(g);
    // shadows of flying stuff
    for (const e of this.enemies) if (!e.ground) e.drawShadow(g);
    this.player.drawShadow(g);
    this.bg.drawClouds(g);
    // items
    for (const it of this.items) this.drawItem(g, it);
    // air units
    for (const e of this.enemies) if (!e.ground) e.draw(g);
    if (this.bomb && this.plane !== 'shinden') this.bomb.def.draw(g, this.bomb);
    for (const b of this.pbullets) drawPlayerBullet(g, b);
    this.player.draw(g);
    if (this.bomb && this.plane === 'shinden') this.bomb.def.draw(g, this.bomb);
    FX.drawAirLayer(g);
    // enemy bullets on top for readability
    for (const b of this.ebullets) {
      const fr = b.needle ? null : b.spr[(b.t >> 2) & 1];
      if (b.needle) { const nf = rotFrame(b.spr, Math.atan2(b.vy, b.vx), 0); g.drawImage(nf, Math.round(b.x - nf.hw), Math.round(b.y - nf.hh)); }
      else g.drawImage(fr, Math.round(b.x - fr.hw), Math.round(b.y - fr.hh));
    }
    FX.drawTop(g);
    g.restore();
  },
  drawItem(g, it) {
    if (it.type === 'medal') {
      const fr = SPR.item.medal[(it.t >> 2) % 6];
      g.drawImage(fr, Math.round(it.x - fr.width / 2), Math.round(it.y - fr.height / 2));
      if ((it.t >> 3) % 4 === 0) { g.fillStyle = '#ffffff'; g.fillRect(Math.round(it.x) - 3, Math.round(it.y) - 4, 1, 1); }
      return;
    }
    const set = SPR.item[it.type];
    const fr = set[(it.t >> 3) % 4];
    if (it.t > 540 && (it.t >> 2) & 1) return;
    g.drawImage(fr, Math.round(it.x - fr.hw), Math.round(it.y - fr.hh));
  },
  drawHUD(g) {
    // score
    Font.draw(g, '1P', 4, 3, { color: GRAD.ice, outline: '#0a0612' });
    Font.draw(g, String(this.score).padStart(8, '0'), 18, 3, { color: '#ffffff', outline: '#0a0612' });
    const hi = Math.max(Save.data.hi[this.diff] || 0, this.score);
    Font.draw(g, 'HI', 150, 3, { color: GRAD.red, outline: '#0a0612' });
    Font.draw(g, String(hi).padStart(8, '0'), 164, 3, { color: GRAD.gold, outline: '#0a0612' });
    // lives
    for (let i = 0; i < Math.min(this.lives, 6); i++) g.drawImage(SPR.icon.life, 3 + i * 11, 12);
    // bombs
    for (let i = 0; i < this.bombs; i++) g.drawImage(SPR.icon.bomb, 3 + i * 8, H - 15);
    // power pips
    Font.draw(g, 'PW', W - 46, H - 12, { color: GRAD.gold, outline: '#0a0612' });
    for (let i = 0; i < 4; i++) {
      g.fillStyle = '#0a0612'; g.fillRect(W - 32 + i * 7, H - 13, 6, 9);
      g.fillStyle = i < this.player.power ? (i === 3 ? '#ff6040' : '#ffd040') : '#3a3448';
      g.fillRect(W - 31 + i * 7, H - 12, 4, 7);
      if (i < this.player.power) { g.fillStyle = '#fff8c0'; g.fillRect(W - 31 + i * 7, H - 12, 4, 1); }
    }
    // super gauge
    const gx = 70, gy = H - 11, gw = 100;
    g.fillStyle = '#0a0612'; g.fillRect(gx - 1, gy - 1, gw + 2, 7);
    g.fillStyle = '#2a2238'; g.fillRect(gx, gy, gw, 5);
    const full = this.gauge >= 100;
    const fw = Math.floor(this.gauge / 100 * gw);
    for (let x = 0; x < fw; x += 2) {
      g.fillStyle = full ? ((this.t >> 2) & 1 ? '#ffffff' : '#ff80e0') : x / gw < 0.5 ? '#3070ff' : x / gw < 0.85 ? '#40c0ff' : '#a0f0ff';
      g.fillRect(gx + x, gy, 2, 5);
    }
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(gx, gy, fw, 1);
    Font.draw(g, full ? 'SUPER OK!' : 'SUPER', gx + gw / 2, gy - 9, { align: 'center', color: full ? GRAD.pink : '#a0a8c8', outline: '#0a0612' });
    // boss bar
    const b = this.boss;
    if (b && b.active && !b.dead) {
      const r = b.hp / b.maxHp;
      g.fillStyle = '#0a0612'; g.fillRect(19, 22, 202, 6);
      g.fillStyle = '#401018'; g.fillRect(20, 23, 200, 4);
      for (let x = 0; x < Math.floor(200 * r); x += 2) { g.fillStyle = r < 0.25 && (this.t >> 2) & 1 ? '#ffffff' : x < 60 ? '#ff3020' : x < 140 ? '#ff7020' : '#ffc030'; g.fillRect(20 + x, 23, 2, 4); }
      Font.draw(g, b.def.name, W / 2, 30, { align: 'center', color: GRAD.red, outline: '#0a0612' });
    }
    // touch hint for super
    if (this.bannerT > 0) {
      const st = STAGES[this.stage];
      const a = this.bannerT;
      if (a < 230 && (a > 30 || (a >> 1) & 1)) {
        g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 108, W, 52);
        g.fillStyle = '#ffd040'; g.fillRect(0, 108, W, 1); g.fillRect(0, 159, W, 1);
        Font.draw(g, 'STAGE ' + (this.stage + 1), W / 2, 114, { scale: 2, align: 'center', color: GRAD.gold, outline: '#0a0612' });
        Font.draw(g, st.name, W / 2, 133, { align: 'center', color: '#ffffff', outline: '#0a0612' });
        Font.draw(g, st.sub, W / 2, 145, { align: 'center', color: GRAD.ice, outline: '#0a0612' });
      }
    }
    if (this.warnT > 0) {
      const k = this.warnT;
      if ((k >> 4) & 1 || k < 20) {
        g.fillStyle = 'rgba(160,0,0,0.35)'; g.fillRect(0, 118, W, 40);
        for (let x = -(this.t % 16); x < W; x += 16) { g.fillStyle = '#ffd020'; g.fillRect(x, 118, 8, 3); g.fillRect(x + 8, 155, 8, 3); }
        Font.draw(g, 'WARNING!!', W / 2, 126, { scale: 3, align: 'center', color: GRAD.red, outline: '#0a0612' });
      }
      Font.draw(g, BOSSES[STAGES[this.stage].boss].name + ' APPROACHING', W / 2, 168, { align: 'center', color: (k >> 2) & 1 ? '#ffffff' : '#ff6060', outline: '#0a0612' });
    }
  },

  r_play(g) { this.drawWorld(g); this.drawHUD(g); },
  r_intro(g) {
    g.fillStyle = '#05040a'; g.fillRect(0, 0, W, H);
    Font.draw(g, 'STAGE ' + (this.stage + 1), W / 2, 140, { scale: 3, align: 'center', color: GRAD.gold, outline: '#2a0a10' });
    Font.draw(g, STAGES[this.stage].name, W / 2, 172, { align: 'center', color: '#ffffff' });
  },
  r_pause(g) {
    this.drawWorld(g); this.drawHUD(g);
    g.fillStyle = 'rgba(4,2,16,0.6)'; g.fillRect(0, 0, W, H);
    Font.draw(g, 'PAUSE', W / 2, 110, { scale: 3, align: 'center', color: GRAD.ice, outline: '#0a0612' });
    this.drawMenu(g, ['RESUME', 'QUIT TO TITLE'], 160, 20);
  },
  r_continue(g) {
    this.drawWorld(g);
    g.fillStyle = 'rgba(4,2,16,0.65)'; g.fillRect(0, 0, W, H);
    this.hot = [];
    Font.draw(g, 'CONTINUE?', W / 2, 100, { scale: 3, align: 'center', color: GRAD.gold, outline: '#0a0612' });
    const n = Math.max(0, Math.floor(this.contT / 60));
    Font.draw(g, String(n), W / 2, 140, { scale: 6, align: 'center', color: n < 4 ? GRAD.red : GRAD.ice, outline: '#0a0612' });
    if ((this.t >> 4) & 1) Font.draw(g, Input.isTouch ? 'TAP TO CONTINUE' : 'PRESS FIRE TO CONTINUE', W / 2, 200, { align: 'center', color: '#ffffff', outline: '#0a0612' });
    this.hot.push({ x: 0, y: 90, w: W, h: 130, cont: true });
    Font.draw(g, 'GIVE UP', W / 2, 240, { align: 'center', color: '#8890a8', outline: '#0a0612' });
    this.hot.unshift({ x: 70, y: 232, w: 100, h: 20, giveup: true });
  },
  r_gameover(g) {
    g.fillStyle = '#05040a'; g.fillRect(0, 0, W, H);
    Font.draw(g, 'GAME OVER', W / 2, 120, { scale: 3, align: 'center', color: GRAD.red, outline: '#2a0a10' });
    Font.draw(g, 'SCORE ' + this.score, W / 2, 170, { align: 'center', color: GRAD.gold });
    if (this.score >= (Save.data.hi[this.diff] || 0) && this.score > 0) Font.draw(g, 'NEW HIGH SCORE!', W / 2, 186, { align: 'center', color: (this.t >> 3) & 1 ? GRAD.pink : GRAD.gold });
  },
  r_clear(g) {
    this.drawWorld(g);
    this.drawHUD(g);
    g.fillStyle = 'rgba(4,2,16,0.55)'; g.fillRect(0, 60, W, 170);
    Font.draw(g, 'STAGE ' + (this.stage + 1) + ' CLEAR!', W / 2, 72, { scale: 2, align: 'center', color: GRAD.gold, outline: '#0a0612' });
    this.tally.forEach(([label, v], i) => {
      if (this.st < 30 + i * 12) return;
      Font.draw(g, label, 30, 110 + i * 16, { color: '#ffffff', outline: '#0a0612' });
      Font.draw(g, String(v), 210, 110 + i * 16, { align: 'right', color: GRAD.gold, outline: '#0a0612' });
    });
    if (this.st > 80) {
      Font.draw(g, 'TOTAL', 30, 186, { color: GRAD.ice, outline: '#0a0612' });
      Font.draw(g, String(this.tallyShown), 210, 186, { align: 'right', color: GRAD.fire, outline: '#0a0612' });
    }
    if (this.st > 140 && (this.t >> 4) & 1) Font.draw(g, Input.isTouch ? 'TAP TO CONTINUE' : 'PRESS FIRE', W / 2, 212, { align: 'center', color: '#ffffff', outline: '#0a0612' });
  },
  drawMenu(g, items, y0, gap, xs) {
    this.hot = [];
    items.forEach((label, i) => {
      const y = y0 + i * gap, sel = this.menu === i;
      const w = Font.width(label, 1) + 24;
      if (sel) {
        g.fillStyle = 'rgba(255,200,40,0.18)'; g.fillRect(W / 2 - w / 2, y - 4, w, 15);
        const bob = (this.t >> 3) & 1;
        Font.draw(g, '>', W / 2 - w / 2 + 2 + bob, y, { color: GRAD.gold, outline: '#0a0612' });
        Font.draw(g, '<', W / 2 + w / 2 - 7 - bob, y, { color: GRAD.gold, outline: '#0a0612' });
      }
      Font.draw(g, label, W / 2, y, { align: 'center', color: sel ? GRAD.gold : '#c0c8e0', outline: '#0a0612' });
      this.hot.push({ x: W / 2 - 70, y: y - 6, w: 140, h: gap, action: i });
    });
  },
  drawTitleBg(g, dim = 0) {
    this.titleBg.drawGround(g);
    this.titleBg.drawCloudShadows(g);
    this.titleBg.drawClouds(g);
    if (dim) { g.fillStyle = `rgba(4,2,20,${dim})`; g.fillRect(0, 0, W, H); }
  },
  r_title(g) {
    this.drawTitleBg(g, 0.25);
    // squadron flying
    const t = this.t;
    PLANE_ORDER.forEach((pn, i) => {
      const spr = SPR.player[pn][2][(t >> 1) & 1];
      const x = 48 + i * 48, y = 236 + Math.sin(t * 0.03 + i) * 4 + (i === 1 || i === 2 ? -10 : 0);
      g.globalAlpha = 0.3; g.drawImage(spr.shadowS, Math.round(x + 12 - spr.shadowS.width / 2), Math.round(y + 22 - spr.shadowS.height / 2)); g.globalAlpha = 1;
      g.drawImage(spr, Math.round(x - spr.hw), Math.round(y - spr.hh));
    });
    const ly = 34 + Math.round(Math.sin(t * 0.04) * 2);
    g.drawImage(this.logo, 4, ly);
    // shine sweep
    const sx = (t * 3) % 500 - 120;
    g.save(); g.beginPath(); g.rect(sx, 0, 10, H); g.rect(sx + 14, 0, 4, H); g.clip();
    g.globalAlpha = 0.3; g.drawImage(this.logo.shine, 4, ly); g.restore();
    g.globalAlpha = 1;
    Font.draw(g, 'A WW2 ARCADE SHOOT EM UP', W / 2, 136, { align: 'center', color: GRAD.ice, outline: '#0a0612' });
    this.drawMenu(g, ['START GAME', 'OPTIONS', 'HOW TO PLAY'], 160, 17);
    Font.draw(g, 'HI ' + String(Math.max(...Save.data.hi)).padStart(8, '0'), W / 2, 274, { align: 'center', color: GRAD.gold, outline: '#0a0612' });
    Font.draw(g, Input.isTouch ? 'TAP TO SELECT' : 'ARROWS + Z TO SELECT', W / 2, 296, { align: 'center', color: '#8890b0', outline: '#0a0612' });
    Font.draw(g, '(C) 2026 THUNDER FIGHTERS TEAM', W / 2, 308, { align: 'center', color: '#606880', outline: '#0a0612' });
  },
  r_options(g) {
    this.drawTitleBg(g, 0.55);
    Font.draw(g, 'OPTIONS', W / 2, 40, { scale: 3, align: 'center', color: GRAD.ice, outline: '#0a0612' });
    const S = Save.data;
    const bar = v => '#'.repeat(Math.round(v * 10)).padEnd(10, '.');
    const items = ['MUSIC  ' + bar(S.musicVol), 'SOUND  ' + bar(S.sfxVol), 'SCANLINES  ' + (S.scanlines ? 'ON' : 'OFF'), 'AUTO FIRE  ' + (S.autofire ? 'ON' : 'OFF'), 'BACK'];
    this.drawMenu(g, items, 100, 24);
    // touch arrows for volume
    for (let i = 0; i < 2; i++) {
      Font.draw(g, '<', 20, 100 + i * 24, { color: GRAD.gold, outline: '#0a0612' });
      Font.draw(g, '>', 214, 100 + i * 24, { color: GRAD.gold, outline: '#0a0612' });
      this.hot.unshift({ x: 6, y: 92 + i * 24, w: 34, h: 22, action: i, dir: -1 }, { x: 200, y: 92 + i * 24, w: 34, h: 22, action: i, dir: 1 });
    }
    Font.draw(g, 'M = MUTE    F = FULLSCREEN', W / 2, 250, { align: 'center', color: '#8890b0', outline: '#0a0612' });
  },
  r_howto(g) {
    this.drawTitleBg(g, 0.7);
    Font.draw(g, 'HOW TO PLAY', W / 2, 16, { scale: 2, align: 'center', color: GRAD.gold, outline: '#0a0612' });
    const lines = [
      ['KEYBOARD', GRAD.ice], ['ARROWS / WASD   MOVE', '#fff'], ['Z / SPACE   FIRE (HOLD)', '#fff'], ['X   BOMB', '#fff'], ['C   SUPER ATTACK', '#fff'], ['ENTER / ESC   PAUSE', '#fff'], ['', '#fff'],
      ['TOUCH', GRAD.ice], ['DRAG ANYWHERE TO FLY', '#fff'], ['AUTO FIRE IS ALWAYS ON', '#fff'], ['BOMB AND SUPER BUTTONS', '#fff'], ['', '#fff'],
      ['ITEMS', GRAD.ice], ['P  POWER UP   B  BOMB', '#fff'], ['GOLD MEDALS: CHAIN THEM!', '#fff'], ['SUPER GAUGE FILLS AS YOU', '#fff'], ['DESTROY ENEMIES', '#fff'],
    ];
    lines.forEach(([s, c], i) => Font.draw(g, s, W / 2, 42 + i * 14, { align: 'center', color: c, outline: '#0a0612' }));
    if ((this.t >> 4) & 1) Font.draw(g, 'PRESS FIRE', W / 2, 300, { align: 'center', color: GRAD.gold, outline: '#0a0612' });
  },
  r_select(g) {
    this.drawTitleBg(g, 0.55);
    this.hot = [];
    Font.draw(g, 'SELECT YOUR PLANE', W / 2, 10, { scale: 2, align: 'center', color: GRAD.gold, outline: '#0a0612' });
    PLANE_ORDER.forEach((pn, i) => {
      const x = 30 + i * 60, y = 50, sel = i === this.planeIdx;
      g.fillStyle = sel ? 'rgba(255,210,60,0.25)' : 'rgba(0,0,0,0.35)'; g.fillRect(x - 27, y - 22, 54, 44);
      g.fillStyle = sel ? ((this.t >> 3) & 1 ? '#ffe060' : '#ff9020') : '#2a3048';
      g.fillRect(x - 27, y - 22, 54, 1); g.fillRect(x - 27, y + 21, 54, 1); g.fillRect(x - 27, y - 22, 1, 44); g.fillRect(x + 26, y - 22, 1, 44);
      const spr = SPR.player[pn][2][(this.t >> 1) & 1];
      g.drawImage(spr, Math.round(x - spr.hw), Math.round(y - spr.hh + (sel ? Math.sin(this.t * 0.1) * 2 : 0)));
      this.hot.push({ x: x - 28, y: y - 24, w: 56, h: 48, plane: i });
    });
    const pn = PLANE_ORDER[this.planeIdx], P = PLANES[pn];
    // preview, banking (1:1 pixels, on a radar pedestal)
    const bank = Math.round(Math.sin(this.t * 0.03) * 2.4);
    const big = SPR.player[pn][clamp(bank + 2, 0, 4)][(this.t >> 1) & 1];
    const bx = 58, by = 132 + Math.round(Math.sin(this.t * 0.05) * 2);
    g.globalAlpha = 0.5; pxDisc(g, 58, 134, 34, '#0a1830'); g.globalAlpha = 1;
    pxCircle(g, 58, 134, 34, '#2a6090'); pxCircle(g, 58, 134, 22, '#1a4060'); pxCircle(g, 58, 134, 10, '#1a4060');
    const sw = this.t * 0.04;
    pxLine(g, 58, 134, 58 + Math.cos(sw) * 33, 134 + Math.sin(sw) * 33, '#40c0ff');
    g.globalAlpha = 0.3; g.drawImage(big.shadowS, Math.round(bx + 10 - big.shadowS.width / 2), Math.round(by + 20 - big.shadowS.height / 2)); g.globalAlpha = 1;
    g.drawImage(big, Math.round(bx - big.hw), Math.round(by - big.hh));
    Font.draw(g, P.name, 160, 92, { align: 'center', color: P.color, outline: '#0a0612' });
    let yy = 108;
    for (const k in P.stats) {
      Font.draw(g, k, 118, yy, { color: '#c0c8e0', outline: '#0a0612' });
      for (let i = 0; i < 5; i++) { g.fillStyle = '#0a0612'; g.fillRect(166 + i * 12, yy - 1, 11, 9); g.fillStyle = i < P.stats[k] ? (i < 2 ? '#40c060' : i < 4 ? '#ffd040' : '#ff5030') : '#2a2438'; g.fillRect(167 + i * 12, yy, 9, 7); }
      yy += 13;
    }
    const info = [['SHOT', P.shot], ['SUB', P.sub], ['BOMB', P.bomb], ['SUPER', P.sup]];
    info.forEach(([k, v], i) => {
      Font.draw(g, k, 12, 196 + i * 13, { color: GRAD.ice, outline: '#0a0612' });
      Font.draw(g, v, 60, 196 + i * 13, { color: '#ffffff', outline: '#0a0612' });
    });
    // buttons
    g.fillStyle = 'rgba(255,190,40,0.25)'; g.fillRect(140, 262, 90, 22);
    Font.draw(g, 'GO!', 185, 266, { scale: 2, align: 'center', color: (this.t >> 3) & 1 ? GRAD.gold : GRAD.fire, outline: '#0a0612' });
    this.hot.push({ x: 140, y: 258, w: 90, h: 30, go: true });
    Font.draw(g, 'BACK', 40, 270, { align: 'center', color: '#8890b0', outline: '#0a0612' });
    this.hot.push({ x: 8, y: 260, w: 70, h: 26, back: true });
    Font.draw(g, Input.isTouch ? 'TAP A PLANE THEN GO' : '< > CHOOSE   Z CONFIRM', W / 2, 302, { align: 'center', color: '#8890b0', outline: '#0a0612' });
  },
  r_difficulty(g) {
    this.drawTitleBg(g, 0.6);
    Font.draw(g, 'DIFFICULTY', W / 2, 50, { scale: 2, align: 'center', color: GRAD.gold, outline: '#0a0612' });
    this.hot = [];
    DIFFS.forEach((d, i) => {
      const y = 100 + i * 58, sel = this.menu === i;
      g.fillStyle = sel ? 'rgba(255,210,60,0.22)' : 'rgba(0,0,0,0.35)'; g.fillRect(30, y - 8, 180, 46);
      if (sel) { g.fillStyle = (this.t >> 3) & 1 ? '#ffe060' : '#ff9020'; g.fillRect(30, y - 8, 180, 1); g.fillRect(30, y + 37, 180, 1); g.fillRect(30, y - 8, 1, 46); g.fillRect(209, y - 8, 1, 46); }
      Font.draw(g, d.name, W / 2, y, { scale: 2, align: 'center', color: sel ? d.col : '#8088a0', outline: '#0a0612' });
      Font.draw(g, d.desc[0], W / 2, y + 18, { align: 'center', color: '#ffffff', outline: '#0a0612' });
      Font.draw(g, d.desc[1], W / 2, y + 27, { align: 'center', color: '#c0c8e0', outline: '#0a0612' });
      this.hot.push({ x: 30, y: y - 8, w: 180, h: 46, action: i });
    });
    Font.draw(g, 'HI ' + String(Save.data.hi[this.menu] || 0).padStart(8, '0'), W / 2, 280, { align: 'center', color: GRAD.gold, outline: '#0a0612' });
    Font.draw(g, 'BACK', W / 2, 300, { align: 'center', color: '#8890b0', outline: '#0a0612' });
    this.hot.push({ x: 80, y: 292, w: 80, h: 22, back: true });
  },
  r_ending(g) {
    this.endBg.drawGround(g); this.endBg.drawCloudShadows(g); this.endBg.drawClouds(g);
    g.fillStyle = 'rgba(4,2,20,0.35)'; g.fillRect(0, 0, W, H);
    const spr = SPR.player[this.plane][clamp(Math.round(Math.sin(this.t * 0.02) * 2.4) + 2, 0, 4)][(this.t >> 1) & 1];
    const px = W / 2 + Math.sin(this.t * 0.013) * 50, py = 250 + Math.sin(this.t * 0.02) * 10;
    g.globalAlpha = 0.3; g.drawImage(spr.shadowS, Math.round(px + 12 - spr.shadowS.width / 2), Math.round(py + 24 - spr.shadowS.height / 2)); g.globalAlpha = 1;
    g.drawImage(spr, Math.round(px - spr.hw), Math.round(py - spr.hh));
    const lines = [
      ['CONGRATULATIONS!', GRAD.gold, 2], ['', '#fff', 1],
      ['THE INFERNO CITADEL HAS FALLEN.', '#fff', 1], ['THE SKIES ARE FREE AGAIN.', '#fff', 1], ['', '#fff', 1],
      ['FINAL SCORE', GRAD.ice, 1], [String(this.score), GRAD.fire, 2], ['DIFFICULTY ' + DIFFS[this.diff].name, '#fff', 1], ['CONTINUES ' + this.continues, '#fff', 1], ['', '#fff', 1],
      ['THUNDER FIGHTERS', GRAD.gold, 1], ['CODE, PIXEL ART, MUSIC', GRAD.ice, 1], ['ALL MADE BY CLAUDE', '#fff', 1], ['', '#fff', 1], ['THANK YOU FOR PLAYING!', GRAD.pink, 1],
    ];
    let y = Math.max(14, H - this.st * 0.5);
    for (const [s, c, sc] of lines) { Font.draw(g, s, W / 2, y, { align: 'center', color: c, scale: sc, outline: '#0a0612' }); y += sc === 2 ? 20 : 12; }
    if (this.st > 400 && (this.t >> 4) & 1) Font.draw(g, 'PRESS FIRE', W / 2, 304, { align: 'center', color: GRAD.gold, outline: '#0a0612' });
  },
};
