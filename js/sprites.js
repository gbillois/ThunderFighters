'use strict';
// ============================================================
// All game sprites, generated procedurally at startup.
// ============================================================

const SPR = {};

// ---------- helpers ----------
function mirrorPoly(halfPts) {
  // halfPts: right side points from top to bottom (x>=0); mirrored to full polygon
  const right = halfPts;
  const left = halfPts.slice().reverse().map(([x, y]) => [-x, y]);
  return right.concat(left);
}
function sym(f, fn) { fn(1); fn(-1); }
function camo(f, mat, seed, th = 0.55, scale = 0.18) {
  f._fill(0, 0, f.w - 1, f.h - 1, (px, py) => fbm(px * scale, py * scale, seed, 2) > th ? 1 : -1, mat, { paint: true });
}
function propDisc(c, x, y, w, frame, vertical = false) {
  const g = c.ctx;
  g.fillStyle = 'rgba(210,220,235,0.45)';
  if (!vertical) g.fillRect(x - w / 2, y, w, 1);
  g.fillStyle = 'rgba(40,40,50,0.85)';
  const b = Math.floor(w / 2) - 1;
  if (frame === 0) { g.fillRect(x - b, y, 2, 1); g.fillRect(x + b - 2, y, 2, 1); }
  else { g.fillRect(x - 2, y, 1, 1); g.fillRect(x + 1, y, 1, 1); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(x - b + 1, y, 1, 1); g.fillRect(x + b - 2, y, 1, 1); }
  g.fillStyle = '#20202a'; g.fillRect(Math.floor(x) - 1, y - 1, 2, 2);
}

// ============================================================
// PLAYER PLANES
// ============================================================
const PLANE_MODELS = {
  lightning(f) {
    // P-38 twin boom
    f.poly([[-21, -1], [21, -1], [20, 4], [-20, 4]], 'silver', { z: 0.1, amp: 0.45, bevel: 1.8 });
    sym(f, s => {
      f.capsule(8 * s, -10, 8 * s, 15, 2.6, 'silver', { z: 0.35, r2: 1.6 });
      f.capsule(8 * s, -13, 8 * s, -4, 3.3, 'navy', { z: 0.5, r2: 2.8 });
      f.ellipse(8 * s, 15, 1.3, 3.2, 'navy', { z: 0.9 });
      f.ellipse(19.5 * s, 1.5, 2, 2.6, 'navy', { z: 0.2, prof: 'flat' });
      f.roundel(14 * s, 1.5, [[2.4, '#203070'], [1.4, '#ffffff'], [0.6, '#203070']]);
      f.line(8 * s, -2, 8 * s, 12, -1);
    });
    f.poly([[-9, 12], [9, 12], [9, 15], [-9, 15]], 'silver', { z: 0.2, amp: 0.4 });
    f.capsule(0, -11, 0, 6, 3.4, 'silver', { z: 0.55, r2: 2.4 });
    f.ellipse(0, -11.5, 2.4, 2.2, 'navy', { z: 1.0 });
    f.ellipse(0, -3.5, 1.8, 3.4, 'glass', { z: 1.45 });
    f.line(-1, 2, 1, 2, -1);
  },
  mustang(f) {
    // P-51 single seat
    f.poly(mirrorPoly([[3, -4], [18, -1], [17.5, 2.5], [3, 5]]), 'silver', { z: 0.1, amp: 0.5, bevel: 2 });
    sym(f, s => {
      f.poly([[16 * s, -1.5], [18.2 * s, -1], [17.8 * s, 2.6], [15.5 * s, 3]], 'red', { z: 0.12, amp: 0.4, prof: 'flat' });
      f.roundel(11 * s, 1, [[2.3, '#1a2050'], [1.2, '#f0f0f0']]);
      f.line(6 * s, -2.6, 6 * s, 4, -1);
    });
    f.poly(mirrorPoly([[2, 10], [8, 11], [7.5, 14], [1.5, 14]]), 'silver', { z: 0.2, amp: 0.4 });
    f.capsule(0, -12, 0, 13, 3.2, 'silver', { z: 0.5, r2: 1.6 });
    f.ellipse(0, -12.5, 3.1, 3, 'red', { z: 0.9 });
    f.ellipse(0, 12.5, 1.1, 3.4, 'red', { z: 1.0 });
    f.ellipse(0, -2.5, 1.8, 3.6, 'glass', { z: 1.4 });
    f.line(-2, -8, 2, -8, -1);
    f.line(-1, 4, -1, 10, -1);
  },
  shinden(f) {
    // J7W canard pusher
    f.poly(mirrorPoly([[3, 0], [18, 8], [18, 11.5], [3, 9]]), 'green', { z: 0.1, amp: 0.5, bevel: 2 });
    sym(f, s => {
      f.poly([[4 * s, 0.5], [17.5 * s, 8], [18 * s, 9], [4 * s, 2]], 'yellow', { z: 0.12, prof: 'flat', amp: 0.4 });
      f.ellipse(10 * s, 7, 1.2, 3.6, 'green', { z: 0.9 });
      f.poly([[2 * s, -11], [9 * s, -8], [9 * s, -6], [2 * s, -7.5]], 'green', { z: 0.3, amp: 0.4 });
      f.roundel(14 * s, 9.2, [[1.9, '#ffffff'], [1.3, '#c01818']]);
    });
    f.capsule(0, -15, 0, 11, 3, 'green', { z: 0.5, r2: 3.4 });
    f.ellipse(0, -15, 1.6, 1.6, 'yellow', { z: 0.8 });
    f.ellipse(0, -1.5, 1.8, 3.6, 'glass', { z: 1.4 });
    f.line(-2, 4, 2, 4, -1);
    f.capsule(-1.5, -16, -1.5, -13, 0.6, 'gun', { z: 1 });
    f.capsule(1.5, -16, 1.5, -13, 0.6, 'gun', { z: 1 });
  },
  mosquito(f) {
    // DH.98 twin engine fighter-bomber
    f.poly(mirrorPoly([[3, -3], [22, -1], [22, 2.5], [3, 4.5]]), 'khaki', { z: 0.1, amp: 0.5, bevel: 2 });
    sym(f, s => {
      f.capsule(9 * s, -12, 9 * s, 6, 3.1, 'khaki', { z: 0.55, r2: 2 });
      f.roundel(16 * s, 0.8, [[2.6, '#1c2a70'], [1.8, '#f0f0f0'], [1, '#c02020']]);
      f.line(9 * s, -6, 9 * s, 3, -1);
    });
    camo(f, 'olive', 77, 0.52, 0.15);
    f.poly(mirrorPoly([[2, 11], [9, 12], [8.5, 15], [1.5, 15]]), 'khaki', { z: 0.2, amp: 0.4 });
    camo(f, 'olive', 78, 0.6, 0.2);
    f.capsule(0, -13, 0, 14, 3.4, 'khaki', { z: 0.6, r2: 1.7 });
    camo(f, 'olive', 79, 0.56, 0.2);
    f.ellipse(0, 13.5, 1.2, 3.4, 'khaki', { z: 1.0 });
    f.ellipse(0, -13, 2.2, 2.4, 'glass', { z: 1.0 });
    f.ellipse(0, -6, 2, 2.8, 'glass', { z: 1.4 });
    f.ellipse(0, 13, 1.3, 1.1, 'red', { z: 1.2, prof: 'flat' });
  }
};
const PLANE_INFO = {
  lightning: { w: 46, h: 38, props: [[-8, -14], [8, -14]], propW: 9 },
  mustang: { w: 42, h: 38, props: [[0, -16]], propW: 11 },
  shinden: { w: 42, h: 40, props: [[0, 13]], propW: 10 },
  mosquito: { w: 50, h: 40, props: [[-9, -14], [9, -14]], propW: 10 },
};

function buildPlayerPlanes() {
  SPR.player = {};
  for (const name in PLANE_MODELS) {
    const info = PLANE_INFO[name];
    const banks = [];
    for (let b = -2; b <= 2; b++) {
      const roll = b * 0.33;
      const frames = [];
      for (let pf = 0; pf < 2; pf++) {
        const c = forgeSprite(info.w, info.h, PLANE_MODELS[name], { sx: Math.cos(roll), tilt: Math.sin(roll) * 0.9, oy: info.h / 2 - 0.5 });
        for (const [px, py] of info.props) propDisc(c, info.w / 2 + px * Math.cos(roll), info.h / 2 + py - 0.5, info.propW * Math.cos(roll), pf);
        frames.push(c);
      }
      banks.push(frames);
    }
    SPR.player[name] = banks;
  }
}

// ============================================================
// ENEMY AIRCRAFT (nose pointing DOWN, built with sy = -1)
// palettes: {body, accent, belly}
// ============================================================
const ENEMY_PAL = {
  green: { body: 'green', accent: 'red', dark: 'dark' },
  sand: { body: 'sand', accent: 'crimson', dark: 'rust' },
  olive: { body: 'olive', accent: 'yellow', dark: 'dark' },
  ice: { body: 'white', accent: 'navy', dark: 'steel' },
  dark: { body: 'gun', accent: 'glowR', dark: 'black' },
  purple: { body: 'purple', accent: 'glowR', dark: 'black' },
};
function enemyMark(f, x, y, r = 1.8) { f.roundel(x, y, [[r + 0.6, '#101010'], [r, '#d02020'], [r * 0.45, '#ffd040']]); }

const ENEMY_MODELS = {
  fighter(f, p) {
    f.poly(mirrorPoly([[2, -3], [10, -1.5], [10, 1.5], [2, 3]]), p.body, { z: 0.1, amp: 0.5 });
    sym(f, s => enemyMark(f, 6.5 * s, 0, 1.4));
    f.poly(mirrorPoly([[1, 6], [4.5, 7], [4.5, 9], [1, 9]]), p.body, { z: 0.2, amp: 0.4 });
    f.capsule(0, -8, 0, 9, 2.3, p.body, { z: 0.5, r2: 1.2 });
    f.ellipse(0, -8, 2.2, 1.8, p.dark, { z: 0.8 });
    f.ellipse(0, -1.5, 1.3, 2.2, 'glassR', { z: 1.2 });
  },
  fighter2(f, p) {
    // gull wing interceptor
    f.poly(mirrorPoly([[2, -2], [6, -3], [11, -1], [11, 1.5], [6, 1], [2, 3]]), p.body, { z: 0.1, amp: 0.5 });
    sym(f, s => { f.poly([[9 * s, -1.5], [11 * s, -1], [11 * s, 1.5], [9 * s, 1.4]], p.accent, { paint: true }); });
    f.poly(mirrorPoly([[1, 6], [5, 8], [4.5, 9.5], [1, 9]]), p.body, { z: 0.2, amp: 0.4 });
    f.capsule(0, -9, 0, 9, 2.4, p.body, { z: 0.5, r2: 1.2 });
    f.ellipse(0, -9, 2.4, 2, p.accent, { z: 0.9 });
    f.ellipse(0, -1, 1.3, 2.4, 'glassR', { z: 1.2 });
  },
  heavy(f, p) {
    // twin engine heavy fighter
    f.poly(mirrorPoly([[3, -3], [17, -1.5], [17, 2], [3, 3.5]]), p.body, { z: 0.1, amp: 0.5 });
    sym(f, s => {
      f.capsule(7 * s, -9, 7 * s, 5, 2.8, p.body, { z: 0.5, r2: 1.8 });
      f.ellipse(7 * s, -9.5, 2.6, 1.6, p.dark, { z: 0.9 });
      enemyMark(f, 13 * s, 0.3, 1.6);
    });
    f.poly(mirrorPoly([[1.5, 9], [7, 10], [6.5, 13], [1.5, 13]]), p.body, { z: 0.2, amp: 0.4 });
    f.capsule(0, -12, 0, 13, 3, p.body, { z: 0.55, r2: 1.4 });
    f.ellipse(0, -11, 2.2, 2.4, 'glassR', { z: 1.0 });
    f.ellipse(0, -3, 1.6, 2.8, 'glassR', { z: 1.3 });
    f.line(-1, 4, 1, 4, -1);
  },
  jet(f, p) {
    // swept jet fighter
    f.poly(mirrorPoly([[2, -4], [13, 5], [13, 7], [2, 4]]), p.body, { z: 0.1, amp: 0.5 });
    sym(f, s => {
      f.capsule(6 * s, -4, 6 * s, 7, 2.2, p.body, { z: 0.6, r2: 1.6 });
      f.ellipse(6 * s, 8, 1.4, 1.4, 'glowY', { z: 1 });
    });
    f.poly(mirrorPoly([[1, 8], [5, 11], [5, 12.5], [1, 11]]), p.body, { z: 0.2, amp: 0.4 });
    f.capsule(0, -11, 0, 11, 2.4, p.body, { z: 0.5, r2: 1.6 });
    f.ellipse(0, -4, 1.3, 2.6, 'glassR', { z: 1.2 });
    sym(f, s => f.poly([[2 * s, -1], [12 * s, 5.5], [12 * s, 6.2], [2 * s, 0.5]], p.accent, { paint: true }));
  },
  bomber(f, p) {
    // 4-engine heavy bomber
    f.poly(mirrorPoly([[4, -6], [30, -2], [30, 2], [4, 4]]), p.body, { z: 0.1, amp: 0.5, bevel: 2.5 });
    sym(f, s => {
      f.capsule(10 * s, -12, 10 * s, 2, 3, p.body, { z: 0.6, r2: 2.2 });
      f.capsule(19 * s, -10, 19 * s, 1, 2.6, p.body, { z: 0.6, r2: 2 });
      f.ellipse(10 * s, -12.5, 2.6, 1.6, p.dark, { z: 1 });
      f.ellipse(19 * s, -10.5, 2.2, 1.4, p.dark, { z: 1 });
      enemyMark(f, 25 * s, 0, 2);
      f.line(14.5 * s, -4, 14.5 * s, 3, -1);
    });
    f.poly(mirrorPoly([[2, 14], [12, 16], [11.5, 20], [2, 20]]), p.body, { z: 0.2, amp: 0.4 });
    f.capsule(0, -18, 0, 20, 4.6, p.body, { z: 0.6, r2: 2.2 });
    f.ellipse(0, -17, 3.2, 3, 'glassR', { z: 1.1 });
    f.ellipse(0, -9, 2.2, 2.6, 'glassR', { z: 1.5 });
    f.circle(0, 2, 2.2, p.dark, { z: 1.4 });
    f.line(-3, 8, 3, 8, -1);
    f.line(-3, 12, 3, 12, -1);
  },
  heli(f, p) {
    f.capsule(0, 2, 0, 17, 1.6, p.body, { z: 0.5, r2: 1 });
    f.poly(mirrorPoly([[0.5, 14], [5, 15], [5, 17], [0.5, 17]]), p.body, { z: 0.4, amp: 0.4 });
    sym(f, s => f.rect(5 * s - (s < 0 ? 3 : 0), -3, 3, 7, p.dark, { z: 0.6, amp: 0.5 }));
    sym(f, s => { f.capsule(7 * s, -2, 7 * s, 3, 1.1, 'gun', { z: 0.9 }); });
    f.ellipse(0, -2, 5.5, 8, p.body, { z: 0.6 });
    f.ellipse(0, -7, 3.6, 3.4, 'glassR', { z: 1.2 });
    f.circle(0, 0, 1.5, p.dark, { z: 1.6 });
    enemyMark(f, 0, 4, 1.4);
  },
  drone(f, p) {
    f.circle(0, 0, 9, p.body, { z: 0.2, prof: 'flat', bevel: 2.5 });
    sym(f, s => { f.poly([[7 * s, -3], [12 * s, -1], [12 * s, 1], [7 * s, 3]], p.dark, { z: 0.4 }); });
    f.circle(0, 0, 5, p.dark, { z: 0.6 });
    f.circle(0, 0, 3.4, 'glowR', { z: 1 });
    for (let a = 0; a < 8; a++) f.line(Math.cos(a * TAU / 8) * 6, Math.sin(a * TAU / 8) * 6, Math.cos(a * TAU / 8) * 8.5, Math.sin(a * TAU / 8) * 8.5, -1);
  },
  rocket(f, p) {
    f.poly(mirrorPoly([[1, 2], [6, 7], [6, 8.5], [1, 6]]), p.body, { z: 0.1, amp: 0.5 });
    f.capsule(0, -8, 0, 7, 2.2, p.body, { z: 0.5, r2: 1.6 });
    f.ellipse(0, -8, 2, 2, p.accent, { z: 0.8 });
    f.ellipse(0, 8, 1.4, 1.4, 'glowY', { z: 1 });
    f.ellipse(0, -3, 1, 1.6, 'glassR', { z: 1.1 });
  }
};
const ENEMY_SIZES = {
  fighter: [24, 22], fighter2: [26, 24], heavy: [38, 32], jet: [30, 28],
  bomber: [66, 46], heli: [22, 40], drone: [28, 24], rocket: [16, 22],
};

const ROT_TYPES = ['fighter', 'fighter2', 'jet', 'rocket'];
// natively rotated enemy planes (16 directions), built per palette on demand
function enemyRotSet(type, pal) {
  SPR.enemyRot = SPR.enemyRot || {};
  const key = type + '_' + pal;
  if (!SPR.enemyRot[key]) {
    const [w, h] = ENEMY_SIZES[type];
    const size = Math.ceil(Math.hypot(w, h)) + 1;
    SPR.enemyRot[key] = rotSet(size, f => { f.sy = -1; ENEMY_MODELS[type](f, ENEMY_PAL[pal]); });
  }
  return SPR.enemyRot[key];
}
function buildEnemies() {
  SPR.enemy = {};
  for (const type in ENEMY_MODELS) {
    SPR.enemy[type] = {};
    for (const pn in ENEMY_PAL) {
      const [w, h] = ENEMY_SIZES[type];
      SPR.enemy[type][pn] = forgeSprite(w, h, (f) => { f.sy = -1; ENEMY_MODELS[type](f, ENEMY_PAL[pn]); });
      if (type === 'heli') SPR.enemy[type][pn] = SPR.enemy[type][pn]; // rotor drawn at runtime
    }
  }
}

// ============================================================
// GROUND UNITS
// ============================================================
function buildGround() {
  SPR.ground = {};
  const pals = { green: 'olive', sand: 'sand', ice: 'white', dark: 'gun', olive: 'olive', purple: 'gun' };
  for (const pn in pals) {
    const body = pals[pn];
    const G = SPR.ground[pn] = {};
    // tank hull (facing down)
    G.tank = forgeSprite(20, 26, f => {
      sym(f, s => {
        f.rect(5 * s - (s < 0 ? 4 : 0), -11, 4, 22, 'dark', { z: 0.2, amp: 0.4 });
        for (let y = -10; y <= 10; y += 2) f.line(5 * s - (s < 0 ? 4 : 0), y, 5 * s + (s < 0 ? 0 : 4) - (s < 0 ? 0 : 0), y, -2);
      });
      f.rect(-5, -10, 10, 20, body, { z: 0.4, amp: 0.5, bevel: 2 });
      f.line(-4, 6, 4, 6, -1);
    });
    G.tankTurret = rotSet(28, f => {
      f.capsule(0, -1, 0, -11, 1.2, 'gun', { z: 0.9 });
      f.circle(0, 0, 4.6, body, { z: 0.6 });
      f.circle(-1, -1, 1.3, 'dark', { z: 1.1 });
    });
    // AA emplacement base (sandbag ring / concrete)
    G.aaBase = forgeSprite(26, 26, f => {
      f.circle(0, 0, 11, 'bone', { prof: 'flat', bevel: 3, z: 0.1 });
      f.circle(0, 0, 7.5, 'dark', { prof: 'flat', bevel: 1, z: 0.05 });
      for (let a = 0; a < 10; a++) f.line(Math.cos(a * TAU / 10) * 8, Math.sin(a * TAU / 10) * 8, Math.cos(a * TAU / 10) * 11, Math.sin(a * TAU / 10) * 11, -1);
    });
    G.aaTurret = rotSet(30, f => {
      f.capsule(-1.6, -2, -1.6, -12, 0.9, 'gun', { z: 1 });
      f.capsule(1.6, -2, 1.6, -12, 0.9, 'gun', { z: 1 });
      f.circle(0, 0, 5, body, { z: 0.7 });
      f.rect(-2, -1, 4, 3, 'dark', { z: 1.0 });
    });
    // bunker / big gun emplacement
    G.bunker = forgeSprite(32, 32, f => {
      f.poly([[-13, -8], [-8, -13], [8, -13], [13, -8], [13, 8], [8, 13], [-8, 13], [-13, 8]], 'bone', { z: 0.1, bevel: 4 });
      f.circle(0, 0, 7, body, { z: 0.6, prof: 'dome' });
      f.rect(-12, -1, 24, 2, 'dark', { paint: true, shade: -1 });
    });
    G.bunkerGun = rotSet(36, f => {
      f.capsule(0, 0, 0, -15, 2, 'gun', { z: 1, r2: 1.6 });
      f.circle(0, 0, 4, 'dark', { z: 1.2 });
    });
  }
  // gunboat (water)
  SPR.boat = forgeSprite(22, 44, f => {
    f.poly([[0, 20], [6, 10], [7, -14], [5, -19], [-5, -19], [-7, -14], [-6, 10]], 'gun', { z: 0.2, bevel: 2.5 });
    f.poly([[0, 17], [4.5, 9], [5, -13], [3.5, -17], [-3.5, -17], [-5, -13], [-4.5, 9]], 'sand', { z: 0.4, prof: 'flat' });
    for (let y = -16; y < 14; y += 3) f.line(-4, y, 4, y, -1);
    f.rect(-3, -6, 6, 8, 'gun', { z: 0.9, amp: 0.4 });
    f.ellipse(0, -2, 1.5, 1.5, 'dark', { z: 1.3 });
  });
  SPR.boatWake = (() => {
    const c = makeCanvas(26, 30); const g = c.ctx;
    for (let i = 0; i < 60; i++) {
      const t = Math.random(); const y = t * 28; const spread = 3 + t * 9;
      g.fillStyle = `rgba(255,255,255,${0.75 - t * 0.6})`;
      g.fillRect(13 + (Math.random() - 0.5) * 2 * spread, y, 1 + (Math.random() < 0.3 ? 1 : 0), 1);
    }
    return c;
  })();
}

// ============================================================
// TURRET (generic, rotatable, barrel pointing up at angle -90deg)
// ============================================================
function buildTurrets() {
  SPR.turret = {};
  const mk = (name, mat, size, barrels, len, glow) => {
    const D = (size + len) * 2 + 4;
    SPR.turret[name] = rotSet(D, f => {
      for (const bx of barrels) f.capsule(bx, -2, bx, -size - len + 3, 1.1, 'gun', { z: 1, r2: 0.9 });
      f.circle(0, 0, size, mat, { z: 0.6 });
      f.circle(0, 0, size * 0.55, 'dark', { z: 0.9 });
      if (glow) f.circle(0, 0, size * 0.35, glow, { z: 1.2 });
    });
  };
  mk('small', 'gun', 5, [0], 7);
  mk('twin', 'gun', 6, [-2, 2], 9);
  mk('big', 'gun', 9, [-3, 3], 13);
  mk('triple', 'steel', 8, [-3, 0, 3], 12);
  mk('red', 'gun', 7, [-2, 2], 10, 'glowR');
  mk('blue', 'steel', 7, [0], 12, 'glowB');
  mk('sand', 'sand', 7, [-2, 2], 10);
  mk('olive', 'olive', 7, [-2, 2], 10);
  mk('ice', 'white', 7, [-2, 2], 10);
}

// ============================================================
// BULLETS
// ============================================================
function radialSprite(r, stops) {
  // stops: array of [radiusFraction, color] from center out; quantized hard steps
  const s = Math.ceil(r * 2) + 2;
  const c = makeCanvas(s, s); const g = c.ctx;
  const cx = s / 2, cy = s / 2;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
    for (const [rf, col] of stops) { if (d <= rf) { g.fillStyle = col; g.fillRect(x, y, 1, 1); break; } }
  }
  c.hw = s / 2; c.hh = s / 2;
  return c;
}
function buildBullets() {
  const B = SPR.bullet = {};
  // classic pink/orange balls (2 frames pulse)
  const pal = {
    pink: ['#ffffff', '#ffd0f0', '#ff60b0', '#c01868', '#400020'],
    orange: ['#ffffff', '#fff0b0', '#ffa030', '#d04010', '#401000'],
    blue: ['#ffffff', '#d0f0ff', '#50b0ff', '#1850c0', '#081840'],
    green: ['#ffffff', '#e0ffd0', '#70f050', '#20a020', '#083008'],
    purple: ['#ffffff', '#f0d0ff', '#c070ff', '#7020c0', '#200840'],
  };
  for (const k in pal) {
    const p = pal[k];
    B[k + '_s'] = [radialSprite(3.2, [[0.35, p[0]], [0.6, p[1]], [0.85, p[2]], [1.05, p[3]], [1.35, p[4]]]),
      radialSprite(3.2, [[0.45, p[0]], [0.7, p[2]], [0.95, p[3]], [1.25, p[4]]])];
    B[k + '_m'] = [radialSprite(4.6, [[0.35, p[0]], [0.55, p[1]], [0.8, p[2]], [1.0, p[3]], [1.25, p[4]]]),
      radialSprite(4.6, [[0.42, p[0]], [0.68, p[2]], [0.95, p[3]], [1.2, p[4]]])];
    B[k + '_l'] = [radialSprite(7, [[0.3, p[0]], [0.5, p[1]], [0.75, p[2]], [0.95, p[3]], [1.15, p[4]]]),
      radialSprite(7, [[0.38, p[0]], [0.62, p[1]], [0.85, p[2]], [1.12, p[4]]])];
  }
  // needles: natively rotated, 16 directions, model points right (angle 0)
  B.needle = rotSet(15, f => f.capsule(-5, 0, 5, 0, 1.9, 'glowR', { r2: 1.3 }));
  B.needleB = rotSet(15, f => f.capsule(-5, 0, 5, 0, 1.9, 'glowB', { r2: 1.3 }));
  // player shots
  const vulcan = (c1, c2, c3, w = 4, h = 14) => {
    const c = makeCanvas(w, h); const g = c.ctx;
    g.fillStyle = c3; g.fillRect(0, 2, w, h - 2); g.fillRect(1, 0, w - 2, h);
    g.fillStyle = c2; g.fillRect(1, 1, w - 2, h - 3);
    g.fillStyle = c1; g.fillRect(Math.floor(w / 2) - (w > 4 ? 1 : 0), 0, w > 4 ? 2 : 1, h - 4);
    c.hw = w / 2; c.hh = h / 2; return c;
  };
  B.pVulcan = vulcan('#ffffff', '#fff070', '#e08010');
  B.pVulcanB = vulcan('#ffffff', '#ffd060', '#c84010', 6, 16);
  B.pRed = vulcan('#ffffff', '#ff9070', '#c01818', 5, 14);
  B.pGreen = vulcan('#ffffff', '#b0ff80', '#208020', 5, 14);
  // rotated streak shots (model points up)
  B.pStreakY = rotSet(17, f => f.capsule(0, -5, 0, 5, 2.1, 'glowY', { r2: 1.4 }));
  B.pStreakG = rotSet(15, f => f.capsule(0, -4, 0, 4, 1.7, 'glowG', { r2: 1.2 }));
  // laser wave segment (shinden)
  B.pWave = (() => {
    const c = makeCanvas(18, 8); const g = c.ctx;
    const rows = [[3, 12, '#1840c0'], [1, 16, '#3a80ff'], [0, 18, '#90d8ff'], [2, 14, '#ffffff'], [4, 10, '#90d8ff'], [6, 6, '#3a80ff']];
    rows.forEach(([x, w, col], y) => { g.fillStyle = col; g.fillRect(x, y + 1, w, 1); });
    c.hw = 9; c.hh = 4; return c;
  })();
  // homing missile (pointing up)
  B.pMissile = rotSet(17, f => {
    f.capsule(0, -5, 0, 5, 1.6, 'white', { z: 0.5 });
    f.ellipse(0, -5, 1.4, 1.6, 'red', { z: 0.8 });
    sym(f, s => f.poly([[1 * s, 3], [3.5 * s, 6], [1 * s, 6]], 'gun', { z: 0.3 }));
  });
  B.pRocket = rotSet(17, f => {
    f.capsule(0, -5, 0, 5, 1.7, 'olive', { z: 0.5 });
    f.ellipse(0, -5.5, 1.5, 1.5, 'yellow', { z: 0.8 });
    sym(f, s => f.poly([[1 * s, 3], [3.5 * s, 6], [1 * s, 6]], 'dark', { z: 0.3 }));
  });
  B.pBomb = forgeSprite(9, 13, f => {
    f.ellipse(0, -1, 2.6, 4.2, 'dark', { z: 0.5 });
    f.rect(-3, 3, 6, 2, 'gun', { z: 0.3 });
  });
  // super/charge shots
  B.pOrb = [radialSprite(9, [[0.3, '#ffffff'], [0.55, '#c0f0ff'], [0.8, '#40a0ff'], [1.0, '#1040c0'], [1.2, '#081860']]),
    radialSprite(9, [[0.4, '#ffffff'], [0.7, '#80d0ff'], [0.95, '#2060e0'], [1.18, '#081860']])];
  B.pFire = [radialSprite(9, [[0.3, '#ffffff'], [0.55, '#fff0a0'], [0.8, '#ff9020'], [1.0, '#d03010'], [1.2, '#601008']]),
    radialSprite(9, [[0.4, '#ffffff'], [0.7, '#ffd060'], [0.95, '#ff6020'], [1.18, '#601008']])];
}

// ============================================================
// ITEMS
// ============================================================
function buildItems() {
  const I = SPR.item = {};
  const badge = (letter, ramp, grad) => {
    const frames = [];
    for (let fr = 0; fr < 4; fr++) {
      const c = forgeSprite(18, 16, f => {
        f.poly([[-7, -6], [7, -6], [8, -4], [8, 4], [7, 6], [-7, 6], [-8, 4], [-8, -4]], ramp, { z: 0.2, bevel: 2.2 });
        f.light = [[-0.55, -0.75, 0.9], [0.2, -0.9, 0.8], [0.6, -0.4, 0.9], [0, 0.6, 1]][fr];
      });
      Font.draw(c.ctx, letter, 9, 5, { color: grad, align: 'center', shadow: '#200810' });
      c.hw = 9; c.hh = 8;
      frames.push(c);
    }
    return frames;
  };
  I.P = badge('P', 'red', GRAD.gold);
  I.B = badge('B', 'green', GRAD.gold);
  I.S = badge('S', 'navy', GRAD.ice);
  I.L = badge('1UP', 'yellow', '#ffffff');
  // fix width for 1UP
  I.L = [0, 1, 2, 3].map(fr => {
    const c = forgeSprite(26, 14, f => {
      f.poly([[-11, -5], [11, -5], [12, -3], [12, 3], [11, 5], [-11, 5], [-12, 3], [-12, -3]], 'yellow', { z: 0.2, bevel: 2 });
      f.light = [[-0.55, -0.75, 0.9], [0.2, -0.9, 0.8], [0.6, -0.4, 0.9], [0, 0.6, 1]][fr];
    });
    Font.draw(c.ctx, '1UP', 13, 4, { color: '#ffffff', align: 'center', shadow: '#602000' });
    c.hw = 13; c.hh = 7; return c;
  });
  // gold medal spinning (6 frames)
  I.medal = [];
  for (let fr = 0; fr < 6; fr++) {
    const sx = Math.max(0.18, Math.abs(Math.cos(fr / 6 * Math.PI)));
    I.medal.push(forgeSprite(14, 16, f => {
      f.sx = sx;
      f.circle(0, 0, 6, 'yellow', { prof: 'flat', bevel: 2, z: 0.2 });
      f.circle(0, 0, 3.6, 'yellow', { prof: 'dome', z: 0.3, amp: 0.4 });
      if (sx > 0.5) f.line(0, -2, 0, 2, -2);
    }));
  }
}

// ============================================================
// EXPLOSIONS, SMOKE, CLOUDS, CRATERS
// ============================================================
const FIRE_RAMP = ['#ffffff', '#fff8c8', '#ffe070', '#ffb030', '#f87018', '#d83c10', '#a01808', '#5c0c08'].map(hexToRgb);
const SMOKE_RAMP = ['#6a6470', '#504a58', '#3a3442', '#28222e'].map(hexToRgb);
function makeExplosion(S, F, seed) {
  const frames = [];
  for (let f = 0; f < F; f++) {
    const t = f / (F - 1);
    const c = makeCanvas(S, S);
    const img = c.ctx.createImageData(S, S), d = img.data;
    const R = S / 2 - 1;
    const r = R * (0.3 + 0.7 * easeOut(Math.min(1, t * 1.5)));
    const ns = 5 / S * 3;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - S / 2, dy = y + 0.5 - S / 2;
      const dd = Math.hypot(dx, dy) / r;
      if (dd > 1.25) continue;
      const n = fbm(x * ns + seed * 7.1, y * ns - t * 1.2, seed, 3);
      let heat = 1.3 - dd * 1.05 - t * 1.15 + (n - 0.5) * 1.1;
      heat -= Math.max(0, t - 0.35) * Math.max(0, 1 - dd) * 1.4; // burn out from the centre
      const dth = (bayer(x, y) - 0.5) * 0.12;
      let col = null, a = 255;
      if (heat + dth > 0.08) {
        const idx = clamp(Math.floor((1 - Math.min(1, heat + dth)) * FIRE_RAMP.length), 0, FIRE_RAMP.length - 1);
        col = FIRE_RAMP[idx];
      } else if (t > 0.12) {
        // billowing smoke that dissolves with an ordered dither (no soft alpha)
        const sm = (1.12 - dd) + (n - 0.5) * 0.8 - t * 0.35;
        if (sm > 0.1 && dd < 0.97 && bayer(x, y) > (t - 0.5) * 2.2) {
          const lit = clamp((-dx - dy) / (r * 2) + 0.5 + (n - 0.5) * 0.6, 0, 1);
          col = SMOKE_RAMP[clamp(Math.floor((1 - lit) * 3.2 + t * 0.8), 0, 3)];
        }
      }
      if (!col) continue;
      const i = (y * S + x) * 4;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = a;
    }
    c.ctx.putImageData(img, 0, 0);
    c.hw = S / 2; c.hh = S / 2;
    frames.push(c);
  }
  return frames;
}
function makeSmoke(S, ramp) {
  const c = makeCanvas(S, S); const g = c.ctx;
  const img = g.createImageData(S, S), d = img.data;
  const R = S / 2 - 0.5;
  const rr = ramp.map(hexToRgb);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (x + 0.5 - S / 2) / R, dy = (y + 0.5 - S / 2) / R;
    const dd = dx * dx + dy * dy;
    if (dd > 1) continue;
    const hgt = Math.sqrt(1 - dd);
    const lit = clamp(-dx * 0.5 - dy * 0.6 + hgt * 0.7, 0, 1);
    const idx = clamp(Math.floor(lit * rr.length + (bayer(x, y) - 0.5) * 0.8), 0, rr.length - 1);
    const i = (y * S + x) * 4;
    d[i] = rr[idx][0]; d[i + 1] = rr[idx][1]; d[i + 2] = rr[idx][2]; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  c.hw = S / 2; c.hh = S / 2;
  return c;
}
function makeCloud(w, h, seed, ramp, alphaMul = 1) {
  const rng = makeRng(seed);
  const blobs = [];
  const n = 5 + Math.floor(w / 18);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    blobs.push([w * (0.18 + 0.64 * t) + rng.range(-6, 6), h * 0.55 + rng.range(-h * 0.18, h * 0.12), rng.range(h * 0.18, h * 0.36) * (1 - Math.abs(t - 0.5) * 0.8)]);
  }
  const c = makeCanvas(w, h);
  const img = c.ctx.createImageData(w, h), d = img.data;
  const field = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0;
    for (const [bx, by, br] of blobs) { const dd = ((x - bx) ** 2 + (y - by) ** 2) / (br * br); if (dd < 4) v += Math.exp(-dd * 1.6); }
    v += (fbm(x * 0.12, y * 0.12, seed, 3) - 0.5) * 0.35;
    field[y * w + x] = v;
  }
  const rr = ramp.map(hexToRgb);
  const F = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : field[y * w + x];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = field[y * w + x];
    const th = 0.42;
    if (v < th + (bayer(x, y) - 0.5) * 0.12) continue;
    const nx = F(x - 1, y) - F(x + 1, y), ny = F(x, y - 1) - F(x, y + 1);
    let lit = 0.55 - nx * 1.6 - ny * 2.2 + (v - th) * 0.6;
    const idx = clamp(Math.floor((1 - clamp(lit, 0, 1)) * rr.length + (bayer(x, y) - 0.5) * 0.7), 0, rr.length - 1);
    const i = (y * w + x) * 4;
    d[i] = rr[idx][0]; d[i + 1] = rr[idx][1]; d[i + 2] = rr[idx][2];
    d[i + 3] = Math.round(255 * alphaMul);
  }
  c.ctx.putImageData(img, 0, 0);
  c.shadow = silhouette(c, 'rgba(0,0,20,1)');
  return c;
}
function makeCrater(S, seed) {
  const c = makeCanvas(S, S);
  const img = c.ctx.createImageData(S, S), d = img.data;
  const R = S / 2 - 1;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x + 0.5 - S / 2, dy = y + 0.5 - S / 2;
    const n = fbm(x * 0.3, y * 0.3, seed, 2);
    const dd = Math.hypot(dx, dy) / R + (n - 0.5) * 0.5;
    if (dd > 1) continue;
    let col, a;
    if (dd < 0.45) { col = (dx + dy < 0) ? [20, 14, 12] : [40, 30, 24]; a = 230; }
    else if (dd < 0.62) { col = (dx + dy < 0) ? [36, 26, 20] : [86, 70, 54]; a = 210; }
    else { col = [30, 24, 20]; a = Math.round(170 * (1 - (dd - 0.62) / 0.38)); if (bayer(x, y) > (1 - (dd - 0.62) / 0.38)) continue; }
    const i = (y * S + x) * 4;
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = a;
  }
  c.ctx.putImageData(img, 0, 0);
  return c;
}

function buildFx() {
  SPR.expl = {
    s: [makeExplosion(24, 10, 1), makeExplosion(24, 10, 2)],
    m: [makeExplosion(44, 13, 3), makeExplosion(44, 13, 4)],
    l: [makeExplosion(80, 16, 5), makeExplosion(80, 16, 6)],
  };
  const lightR = ['#c8c4cc', '#9890a0', '#6c6474', '#48404e'], darkR = ['#585060', '#403848', '#2c2634', '#1c1822'];
  SPR.smokeSizes = [];
  SPR.smokeSizesDark = [];
  for (let s = 4; s <= 22; s += 2) { SPR.smokeSizes.push(makeSmoke(s, lightR)); SPR.smokeSizesDark.push(makeSmoke(s, darkR)); }
  SPR.smoke = [SPR.smokeSizes[1], SPR.smokeSizes[3], SPR.smokeSizes[5]];
  SPR.smokeDark = [SPR.smokeSizesDark[2], SPR.smokeSizesDark[4]];
  SPR.crater = [makeCrater(16, 1), makeCrater(22, 2), makeCrater(34, 3), makeCrater(48, 4)];
  const cloudRamps = {
    white: ['#ffffff', '#f0f4fa', '#d6e0ee', '#b4c4dc', '#8ea2c4'],
    sand: ['#fff8ec', '#f2e4cc', '#dcc8a8', '#c0a888', '#9c8468'],
    green: ['#ffffff', '#e8f4ec', '#c8dcd0', '#a0bcb0', '#7a9a8e'],
    snow: ['#ffffff', '#f4faff', '#dceaf8', '#bcd2ec', '#94b0d4'],
    ash: ['#8a7e84', '#6e6268', '#544a50', '#3e363c', '#2a2428'],
  };
  SPR.clouds = {};
  for (const k in cloudRamps) {
    SPR.clouds[k] = [];
    for (let i = 0; i < 6; i++) {
      const w = 70 + i * 16, h = 34 + (i % 3) * 10;
      SPR.clouds[k].push(makeCloud(w, h, 100 + i * 13 + k.length, cloudRamps[k], k === 'ash' ? 0.85 : 0.92));
    }
  }
  // shockwave ring frames
  SPR.ring = [];
  for (let i = 0; i < 8; i++) {
    const S = 20 + i * 14; const c = makeCanvas(S, S); const g = c.ctx;
    const r = S / 2 - 1;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const d = Math.hypot(x + 0.5 - S / 2, y + 0.5 - S / 2);
      if (Math.abs(d - r + 1) < 1.4 - i * 0.1) { g.fillStyle = i < 3 ? '#ffffff' : i < 6 ? '#fff0b0' : '#ffb060'; g.fillRect(x, y, 1, 1); }
    }
    c.hw = S / 2; c.hh = S / 2;
    SPR.ring.push(c);
  }
  SPR.ringBig = [];
  for (let i = 0; i < 10; i++) {
    const S = 40 + i * 30, c = makeCanvas(S, S), g = c.ctx, r = S / 2 - 1;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const d = Math.hypot(x + 0.5 - S / 2, y + 0.5 - S / 2);
      const th = 2.2 - i * 0.12;
      if (Math.abs(d - r + 2) < th) { g.fillStyle = i < 4 ? '#ffffff' : i < 7 ? '#fff0b0' : '#ffb060'; g.fillRect(x, y, 1, 1); }
      else if (i < 6 && Math.abs(d - r + 2) < th + 1.5 && bayer(x, y) < 0.5) { g.fillStyle = '#ffd060'; g.fillRect(x, y, 1, 1); }
    }
    c.hw = S / 2; c.hh = S / 2;
    SPR.ringBig.push(c);
  }
}

function buildAllSprites() {
  buildPlayerPlanes();
  buildEnemies();
  buildGround();
  buildTurrets();
  buildBullets();
  buildItems();
  buildFx();
  if (typeof buildBossSprites === 'function') buildBossSprites();
}
