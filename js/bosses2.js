'use strict';
// ============================================================
// Expansion bosses: HEAVY GUNSHIP (mid), IRON COLOSSUS (city),
// STORM CARRIER (storm sea), BASTION (alpine), SKY EMPEROR (final)
// ============================================================

function buildBoss2Sprites() {
  const B = SPR.boss;
  // twin-rotor heavy gunship, nose down
  B.gunship = forgeSprite(56, 92, f => {
    sym(f, s => {
      f.poly([[s * 8, -8], [s * 22, -6], [s * 22, 2], [s * 8, 4]], 'olive', { bevel: 1.5, z: 0.2 });
      f.rect(s > 0 ? 9 : -14, 0, 5, 14, 'olive', { z: 0.4, bevel: 1.5 });
    });
    f.capsule(0, -38, 0, 38, 10, 'olive', { z: 0.5, r2: 9 });
    for (let y = -30; y < 30; y += 7) f.line(-8, y, 8, y, -1);
    f.ellipse(0, 36, 6, 5, 'glassR', { z: 1.2 });
    f.circle(0, -30, 4, 'dark', { z: 1.2 });
    f.circle(0, 30, 4, 'dark', { z: 1.2 });
    enemyMark(f, 0, 0, 3.5);
  });
  // iron colossus: walking assault mech
  B.colossus = forgeSprite(132, 104, f => {
    sym(f, s => {
      f.ellipse(s * 48, -6, 16, 20, 'gun', { z: 0.5 });
      f.ellipse(s * 48, -6, 16, 20, 'crimson', { paint: true, z: 0 });
      f.ellipse(s * 48, -6, 12, 16, 'gun', { paint: true });
      f.rect(s > 0 ? 40 : -56, 6, 16, 20, 'gun', { z: 0.6, bevel: 2 });
    });
    f.poly(mirrorPoly([[0, -46], [26, -46], [40, -28], [40, 24], [24, 44], [0, 48]]), 'gun', { bevel: 5, z: 0.6 });
    f.poly(mirrorPoly([[0, -38], [20, -38], [32, -24], [32, 20], [18, 36], [0, 38]]), 'dark', { prof: 'flat', z: 0.9, amp: 0.3 });
    for (let y = -34; y < 34; y += 8) f.line(-30, y, 30, y, -1);
    sym(f, s => f.poly([[s * 20, -38], [s * 26, -38], [s * 34, 20], [s * 28, 20]], 'crimson', { paint: true }));
    f.circle(0, 22, 12, 'gun', { z: 1.2, prof: 'dome' });
  });
  B.colFoot = forgeSprite(22, 30, f => {
    f.rect(-8, -11, 16, 22, 'gun', { bevel: 3 });
    for (let y = -8; y < 10; y += 4) f.line(-6, y, 6, y, -1);
    f.circle(0, -12, 5, 'dark', { z: 0.8 });
  });
  // storm carrier: aircraft carrier, bow down
  B.carrier = forgeSprite(100, 222, f => {
    f.poly(mirrorPoly([[0, 106], [14, 94], [30, 62], [32, -84], [26, -102], [12, -106]]), 'gun', { bevel: 3 });
    f.poly([[-40, -98], [36, -98], [40, -40], [40, 60], [22, 92], [0, 100], [-22, 92], [-40, 40]], 'dark', { prof: 'flat', z: 0.4, amp: 0.2 });
    for (let y = -94; y < 92; y += 6) f.px(-4, y, '#e8e8e0');
    for (let k = 0; k < 18; k++) f.px(-34 + k * 2, -70 + k * 6, '#d8c040');
    f.rect(26, -36, 12, 46, 'gun', { z: 1.2, bevel: 2 });
    f.rect(28, -30, 8, 4, 'glass', { z: 1.4, prof: 'flat', amp: 0.2 });
    f.circle(32, 2, 3, 'steel', { z: 1.6 });
    for (const [x, y] of [[-34, -76], [34, -76], [-34, 56], [34, 56], [0, 88], [0, -92]]) f.circle(x, y, 7, 'black', { prof: 'flat', z: 0.5, bevel: 1 });
    sym(f, s => { for (let y = -90; y < 80; y += 11) f.px(s * 39, y, '#ffe080'); });
  });
  // bastion: star fortress embedded in the mountain
  B.bastion = forgeSprite(200, 132, f => {
    f.poly([[-92, -40], [-60, -62], [60, -62], [92, -40], [92, 30], [60, 62], [-60, 62], [-92, 30]], 'bone', { bevel: 7 });
    f.poly([[-78, -34], [-52, -50], [52, -50], [78, -34], [78, 24], [52, 48], [-52, 48], [-78, 24]], 'rock', { prof: 'flat', z: 0.3, amp: 0.2 });
    for (let x = -88; x < 90; x += 6) { f.px(x, -60, '#f6f0e0'); f.px(x, 60, '#c8bca0'); }
    for (const [x, y] of [[-80, -44], [80, -44], [-80, 36], [80, 36]]) { f.circle(x, y, 13, 'bone', { z: 0.8 }); f.circle(x, y, 9, 'dark', { prof: 'flat', z: 0.85, bevel: 1 }); }
    f.rect(-26, -30, 52, 44, 'gun', { z: 0.7, bevel: 3 });
    f.circle(0, 0, 15, 'dark', { prof: 'flat', z: 0.95, bevel: 2 });
    for (const x of [-50, 50]) { f.rect(x - 9, -30, 18, 18, 'gun', { z: 0.6, bevel: 2 }); f.circle(x, -21, 5, 'black', { prof: 'flat', z: 0.7 }); }
    for (const x of [-40, 40]) f.circle(x, 46, 9, 'dark', { prof: 'flat', z: 0.6, bevel: 1 });
    f.roundel(0, -46, [[6, '#101010'], [4.5, '#d02020'], [2, '#ffd040']]);
  });
  // sky emperor: the final mothership, and its wingless core form
  const emperor = wings => f => {
    if (wings) sym(f, s => {
      f.poly([[s * 30, -34], [s * 114, 8], [s * 112, 22], [s * 72, 26], [s * 36, 40]], 'gun', { bevel: 5 });
      f.poly([[s * 36, -30], [s * 112, 10], [s * 108, 14], [s * 36, -24]], 'crimson', { paint: true });
      for (let i = 0; i < 5; i++) f.circle(s * (52 + i * 12), 18 + i * 1, 1.6, 'glowP', { z: 0.6 });
      f.capsule(s * 70, 0, s * 70, 22, 5, 'dark', { z: 0.4 });
    });
    sym(f, s => {
      f.poly([[s * 18, 36], [s * 34, 44], [s * 30, wings ? 82 : 66], [s * 22, wings ? 80 : 62]], 'gun', { bevel: 3, z: 0.4 });
      f.circle(s * 26, wings ? 78 : 62, 4, 'glowP', { z: 0.8 });
    });
    f.circle(0, 0, 50, 'purple', { amp: 0.8 });
    for (let a = 0; a < 16; a++) f.line(Math.cos(a * TAU / 16) * 32, Math.sin(a * TAU / 16) * 32, Math.cos(a * TAU / 16) * 49, Math.sin(a * TAU / 16) * 49, -1);
    for (let a = 0; a < 12; a++) f.circle(Math.cos(a * TAU / 12) * 42, Math.sin(a * TAU / 12) * 42, 1.6, 'glowR', { z: 1 });
    f.circle(0, 0, 30, 'gun', { z: 0.9 });
    f.circle(0, 0, 18, 'black', { prof: 'flat', z: 1.0, bevel: 2 });
  };
  B.emperor = forgeSprite(236, 176, emperor(true), { oy: 80 });
  B.emperorCore = forgeSprite(236, 176, emperor(false), { oy: 80 });
  // extra rotating weapons
  SPR.turret.gatling = rotSet(34, f => {
    for (const bx of [-2.5, 0, 2.5]) f.capsule(bx, -2, bx, -14, 1, 'gun', { z: 1 });
    f.circle(0, 0, 7, 'gun', { z: 0.6 }); f.circle(0, 0, 3, 'glowR', { z: 1.1 });
  });
  SPR.turret.railgun = rotSet(60, f => {
    f.rect(-3.5, -26, 7, 26, 'steel', { z: 1, bevel: 1.5 });
    f.rect(-1, -27, 2, 24, 'glowB', { z: 1.2, prof: 'flat' });
    f.circle(0, 0, 11, 'gun', { z: 0.7 }); f.circle(0, 0, 5, 'glowB', { z: 1.1 });
  });
}

// beam telegraph helper: aim line then a dense high speed stream
function railShot(B, p, len = 26) {
  p.charge = 50;
  p.lockAng = p.ang;
  Game.later(50, () => {
    if (!p.alive || !B.canFire()) { p.charge = 0; return; }
    const [x, y] = B.tip(p, len);
    for (let i = 0; i < 14; i++) Game.later(i * 2, () => B.canFire() && Shoot.bullet(x, y, p.lockAng, 4.2, 'needleB'));
    Sound.sfx('laser', { pitch: 0.5 });
    p.charge = 0;
  });
}
function drawCharge(B, g, p, len = 26) {
  if (!p.charge || !p.alive) return;
  p.charge--;
  const [x, y] = B.tip(p, len);
  const col = (Game.t >> 1) & 1 ? '#ff4060' : '#ffffff';
  for (let d = 0; d < 360; d += 6) pxLine(g, x + Math.cos(p.lockAng) * d, y + Math.sin(p.lockAng) * d, x + Math.cos(p.lockAng) * (d + 3), y + Math.sin(p.lockAng) * (d + 3), col);
  pxDisc(g, x, y, 2 + ((50 - p.charge) >> 4), col);
}

Object.assign(BOSSES, {
  // ===== mid-boss: twin rotor gunship =====
  gunship: {
    mid: true, enterY: 70, name: 'HEAVY GUNSHIP',
    body: () => SPR.boss.gunship,
    parts: [
      { name: 'gl', x: -12, y: 8, r: 7, hp: 90, aim: true, score: 2500 },
      { name: 'gr', x: 12, y: 8, r: 7, hp: 90, aim: true, score: 2500 },
      { name: 'pl', x: -20, y: -2, r: 6, hp: 70, score: 2000 },
      { name: 'pr', x: 20, y: -2, r: 6, hp: 70, score: 2000 },
      { name: 'core', x: 0, y: -6, r: 12, hp: 280, core: true, score: 8000, wreck: false },
    ],
    drawExtra(B, g) {
      for (const ry of [-30, 30]) {
        const x = Math.round(B.x), y = Math.round(B.y + ry), a = B.t * 0.5 + (ry > 0 ? 0.7 : 0);
        g.globalAlpha = 0.18; pxDisc(g, x, y, 25, '#d8dce4'); g.globalAlpha = 1;
        for (let i = 0; i < 3; i++) { const aa = a + i * TAU / 3; pxLine(g, x, y, x + Math.cos(aa) * 25, y + Math.sin(aa) * 25, '#26262e', 2); }
      }
    },
    ai: function* (B) {
      B.P('gl').spr = SPR.turret.twin; B.P('gr').spr = SPR.turret.twin; B.P('pl').spr = SPR.pod; B.P('pr').spr = SPR.pod;
      yield* B.moveTo(W / 2, 72, 140);
      B.active = true;
      B.arm('gl', 50, W_.burst(4, 5, 2.5, 'orange_s', 10));
      B.arm('gr', 50, W_.burst(4, 5, 2.5, 'orange_s', 10), 25);
      B.arm('pl', 100, (B, p) => Shoot.arc(B.wx(p), B.wy(p) + 6, { n: 5, spread: 0.6, speed: 2.2, type: 'needle', ang: Math.PI / 2 + 0.3 }));
      B.arm('pr', 100, (B, p) => Shoot.arc(B.wx(p), B.wy(p) + 6, { n: 5, spread: 0.6, speed: 2.2, type: 'needle', ang: Math.PI / 2 - 0.3 }), 50);
      B.arm('core', 120, W_.ring(14, 1.5, 'pink_m'), 60);
      for (let k = 0; k < 1700; k++) { B.x = W / 2 + Math.sin(k * 0.014) * 70; B.y = 72 + Math.sin(k * 0.03) * 12; yield; }
      for (;;) { B.y -= 1.2; if (B.y < -90) B.gone = true; yield; }
    }
  },
  // ===== STEEL CITY boss: walking mech =====
  colossus: {
    ground: true, enterY: 120, name: 'IRON COLOSSUS',
    body: () => SPR.boss.colossus,
    parts: [
      { name: 'armL', x: -48, y: 22, r: 9, hp: 260, aim: true, score: 6000 },
      { name: 'armR', x: 48, y: 22, r: 9, hp: 260, aim: true, score: 6000 },
      { name: 'podL', x: -48, y: -8, r: 8, hp: 160, score: 4000 },
      { name: 'podR', x: 48, y: -8, r: 8, hp: 160, score: 4000 },
      { name: 'core', x: 0, y: 22, r: 13, hp: 760, core: true, armored: true, score: 20000, wreck: false },
    ],
    drawUnder(B, g) {
      const step = B.t * 0.045;
      for (const [lx, ly, ph] of [[-40, -38, 0], [40, -38, Math.PI], [-40, 40, Math.PI], [40, 40, 0]]) {
        const off = Math.sin(step + ph) * 7;
        const fx = Math.round(B.x + lx * 1.1), fy = Math.round(B.y + ly + off);
        pxLine(g, B.x + lx * 0.5, B.y + ly * 0.5, fx, fy, '#1e2230', 6);
        pxLine(g, B.x + lx * 0.5, B.y + ly * 0.5, fx, fy, '#3a4256', 3);
        const s = SPR.boss.colFoot;
        g.drawImage(s, fx - 11, fy - 15);
      }
    },
    ai: function* (B) {
      B.P('armL').spr = SPR.turret.gatling; B.P('armR').spr = SPR.turret.gatling;
      B.P('podL').spr = SPR.pod; B.P('podR').spr = SPR.pod; B.P('core').spr = SPR.core.red;
      yield* B.moveTo(W / 2, 96, 240);
      B.active = true;
      const gat = (B, p) => { for (let i = 0; i < 6; i++) Game.later(i * 4, () => { if (p.alive && B.canFire()) { const [x, y] = B.tip(p, 14); Shoot.bullet(x, y, p.ang + rnd.range(-0.08, 0.08), 3, 'needle'); } }); Sound.sfx('enemy_shot'); };
      B.arm('armL', 60, gat); B.arm('armR', 60, gat, 30);
      const rockets = (B, p) => { for (let i = 0; i < 2; i++) { const e = Spawn.e('rocket', B.wx(p), B.wy(p), { ai: 'chase', speed: 2.3, ang: -Math.PI / 2 + rnd.range(-0.8, 0.8), pal: 'steel' }); e.score = 50; } Sound.sfx('missile'); };
      B.arm('podL', 150, rockets); B.arm('podR', 150, rockets, 75);
      let k = 0, lastStep = 0;
      const walk = () => {
        k++; B.x = W / 2 + Math.sin(k * 0.006) * 40; B.y = 96 + Math.sin(k * 0.009) * 10;
        const st = Math.floor((B.t * 0.045) / Math.PI);
        if (st !== lastStep) { lastStep = st; Sound.sfx('artillery', { vol: 0.5 }); FX.smoke(B.x + (st & 1 ? -44 : 44), B.y + 40, { dark: false, size: 1, ground: true, life: 40 }); }
      };
      while (B.alive('armL', 'armR')) { walk(); yield; }
      B.P('core').armored = false; Game.shake(6); Sound.sfx('explode_l');
      FX.text(B.x, B.y - 50, 'REACTOR EXPOSED', { color: GRAD.red, life: 80 });
      B.arm('core', 5, (B, p, kk) => { for (let a = 0; a < 3; a++) Shoot.bullet(B.wx(p), B.wy(p), kk * 0.11 + a * TAU / 3, 1.7, 'pink_s'); Shoot.bullet(B.wx(p), B.wy(p), -kk * 0.07 + Math.PI / 2, 2.2, 'orange_s'); });
      for (;;) { walk(); walk(); yield; }
    }
  },
  // ===== STORM SEA boss: aircraft carrier launching fighters =====
  carrier: {
    ground: true, enterY: 130, name: 'STORM CARRIER',
    body: () => SPR.boss.carrier,
    parts: [
      { name: 't1', x: -34, y: -76, r: 7, hp: 110, aim: true, score: 2500 },
      { name: 't2', x: 34, y: -76, r: 7, hp: 110, aim: true, score: 2500 },
      { name: 't3', x: -34, y: 56, r: 7, hp: 110, aim: true, score: 2500 },
      { name: 't4', x: 34, y: 56, r: 7, hp: 110, aim: true, score: 2500 },
      { name: 'bow', x: 0, y: 88, r: 9, hp: 220, aim: true, score: 5000 },
      { name: 'stern', x: 0, y: -92, r: 9, hp: 220, aim: true, score: 5000 },
      { name: 'cat', x: -14, y: 30, r: 9, hp: 200, score: 6000 },
      { name: 'island', x: 32, y: -12, r: 13, hp: 820, core: true, armored: true, score: 20000, wreck: false },
    ],
    drawExtra(B, g) {
      g.fillStyle = 'rgba(255,255,255,0.75)';
      for (let i = 0; i < 16; i++) { const k = (B.t * 0.7 + i * 9) % 60; g.fillRect(Math.round(B.x - 4 - k * 0.7 + Math.sin(i) * 2), Math.round(B.y + 106 + k * 0.4), 2, 1); g.fillRect(Math.round(B.x + 3 + k * 0.7), Math.round(B.y + 106 + k * 0.4), 2, 1); }
      // parked aircraft on the stern deck
      if (B.alive('cat')) for (let i = 0; i < 4; i++) { const s = SPR.enemy.fighter.navy; g.drawImage(s, Math.round(B.x - 30 + i * 13 - s.hw), Math.round(B.y - 58 - s.hh)); }
    },
    ai: function* (B) {
      for (const n of ['t1', 't2', 't3', 't4']) B.P(n).spr = SPR.turret.twin;
      B.P('bow').spr = SPR.turret.big; B.P('stern').spr = SPR.turret.big; B.P('cat').spr = SPR.pod; B.P('island').spr = SPR.core.blue;
      yield* B.moveTo(W / 2, 108, 260);
      B.active = true;
      ['t1', 't2', 't3', 't4'].forEach((n, i) => B.arm(n, 70, W_.burst(3, 6, 2.5, 'orange_s', 10), i * 17));
      B.arm('bow', 90, W_.aimed(5, 0.16, 1.9, 'pink_m', 16));
      B.arm('stern', 140, W_.ring(18, 1.4, 'blue_m'), 70);
      B.arm('cat', 130, (B, p) => {
        const side = rnd.chance(0.5) ? 1 : -1;
        Spawn.e('fighter', B.wx(p), B.wy(p) + 10, { ai: 'swoop', ang: Math.PI / 2, speed: 2.6, turn: 0.03 * side, turnAt: 30, turnEnd: 90, fireAt: 20, pal: 'navy' });
        FX.smoke(B.wx(p), B.wy(p), { size: 1, life: 30 });
      });
      let k = 0;
      while (B.alive('bow', 'stern')) { k++; B.x = W / 2 + Math.sin(k * 0.006) * 24; yield; }
      B.P('island').armored = false; Game.shake(6); Sound.sfx('explode_l');
      FX.text(B.x, B.y - 60, 'BRIDGE EXPOSED', { color: GRAD.ice, life: 80 });
      B.arm('island', 5, (B, p, kk) => { for (let a = 0; a < 2; a++) Shoot.bullet(B.wx(p), B.wy(p), Math.PI / 2 + Math.sin(kk * 0.07) * 1.3 + (a ? 0.4 : -0.4), 2, 'needleB'); });
      for (;;) {
        k++; B.x = W / 2 + Math.sin(k * 0.01) * 34;
        if (k % 260 === 130) B.arm('island', 45, (B, p, kk) => Shoot.ring(B.wx(p), B.wy(p), { n: 22, speed: 1.4, type: 'blue_m', off: kk * 0.2 }));
        if (k % 260 === 0) B.arm('island', 5, (B, p, kk) => { for (let a = 0; a < 2; a++) Shoot.bullet(B.wx(p), B.wy(p), Math.PI / 2 + Math.sin(kk * 0.07) * 1.3 + (a ? 0.4 : -0.4), 2, 'needleB'); });
        yield;
      }
    }
  },
  // ===== ALPINE boss: mountain bastion with a railgun =====
  bastion: {
    ground: true, enterY: 90, name: 'EAGLE NEST BASTION',
    body: () => SPR.boss.bastion,
    parts: [
      { name: 'tw1', x: -80, y: -44, r: 9, hp: 150, aim: true, score: 3000 },
      { name: 'tw2', x: 80, y: -44, r: 9, hp: 150, aim: true, score: 3000 },
      { name: 'tw3', x: -80, y: 36, r: 9, hp: 150, aim: true, score: 3000 },
      { name: 'tw4', x: 80, y: 36, r: 9, hp: 150, aim: true, score: 3000 },
      { name: 'g1', x: -40, y: 46, r: 9, hp: 180, aim: true, score: 4000 },
      { name: 'g2', x: 40, y: 46, r: 9, hp: 180, aim: true, score: 4000 },
      { name: 's1', x: -50, y: -21, r: 7, hp: 120, score: 3000 },
      { name: 's2', x: 50, y: -21, r: 7, hp: 120, score: 3000 },
      { name: 'rail', x: 0, y: 0, r: 14, hp: 900, core: true, armored: true, aim: true, score: 25000, wreck: false },
    ],
    drawOver(B, g) { const p = B.P('rail'); if (p && !p.armored) drawCharge(B, g, p); },
    ai: function* (B) {
      for (const n of ['tw1', 'tw2', 'tw3', 'tw4']) B.P(n).spr = SPR.turret.twin;
      B.P('g1').spr = SPR.turret.big; B.P('g2').spr = SPR.turret.big;
      B.P('s1').spr = SPR.pod; B.P('s2').spr = SPR.pod; B.P('rail').spr = SPR.turret.railgun;
      yield* B.moveTo(W / 2, 86, 240);
      B.active = true;
      ['tw1', 'tw2', 'tw3', 'tw4'].forEach((n, i) => B.arm(n, 80, W_.aimed(3, 0.2, 2.1, 'pink_s', 11), i * 20));
      B.arm('g1', 110, W_.aimed(1, 0, 2.2, 'pink_l', 16));
      B.arm('g2', 110, W_.aimed(1, 0, 2.2, 'pink_l', 16), 55);
      const silo = (B, p) => { const e = Spawn.e('rocket', B.wx(p), B.wy(p), { ai: 'chase', speed: 2.2, ang: -Math.PI / 2, pal: 'crimson' }); e.score = 50; Sound.sfx('sam'); };
      B.arm('s1', 160, silo); B.arm('s2', 160, silo, 80);
      while (B.parts.filter(p => p.alive && !p.core).length > 4) yield;
      B.P('rail').armored = false; Game.shake(8); Sound.sfx('explode_l');
      FX.text(B.x, B.y - 50, 'RAILGUN ONLINE', { color: GRAD.ice, life: 90 });
      B.arm('rail', 150, (B, p) => railShot(B, p));
      let k = 0;
      for (;;) {
        k++;
        if (k % 150 === 75 && B.canFire()) Shoot.ring(B.x, B.y, { n: 16, speed: 1.3, type: 'blue_s', off: k * 0.1 });
        yield;
      }
    }
  },
  // ===== FINAL boss: the Sky Emperor =====
  emperor: {
    enterY: 110, name: 'SKY EMPEROR', final: true,
    body: () => SPR.boss.emperor,
    parts: [
      { name: 'w1', x: -60, y: 2, r: 8, hp: 150, aim: true, score: 4000 },
      { name: 'w2', x: 60, y: 2, r: 8, hp: 150, aim: true, score: 4000 },
      { name: 'w3', x: -90, y: 12, r: 8, hp: 150, aim: true, score: 4000 },
      { name: 'w4', x: 90, y: 12, r: 8, hp: 150, aim: true, score: 4000 },
      { name: 'b1', x: -26, y: 70, r: 9, hp: 260, aim: true, score: 6000 },
      { name: 'b2', x: 26, y: 70, r: 9, hp: 260, aim: true, score: 6000 },
      { name: 'core', x: 0, y: 0, r: 16, hp: 1700, core: true, armored: true, score: 100000, wreck: false },
    ],
    drawOver(B, g) { for (const n of ['b1', 'b2']) { const p = B.P(n); if (p) drawCharge(B, g, p, 16); } },
    ai: function* (B) {
      for (const n of ['w1', 'w2', 'w3', 'w4']) B.P(n).spr = SPR.turret.red;
      B.P('b1').spr = SPR.turret.blue; B.P('b2').spr = SPR.turret.blue; B.P('core').spr = SPR.core.purple;
      yield* B.moveTo(W / 2, 96, 280);
      B.active = true;
      // PHASE 1: wing batteries and beam cannons
      ['w1', 'w2', 'w3', 'w4'].forEach((n, i) => B.arm(n, 70, i % 2 ? W_.burst(3, 5, 2.6, 'orange_s', 10) : W_.aimed(3, 0.2, 2.2, 'pink_s', 10), i * 17));
      B.arm('b1', 170, (B, p) => railShot(B, p, 16));
      B.arm('b2', 170, (B, p) => railShot(B, p, 16), 85);
      let k = 0;
      while (B.parts.some(p => p.alive && !p.core)) { k++; B.x = W / 2 + Math.sin(k * 0.008) * 18; B.y = 96 + Math.sin(k * 0.019) * 6; yield; }
      // PHASE 2: the wings blow off, orbiting orbs awaken
      Game.cancelBullets(true); Game.shake(14); FX.flash(0.8, '#e080ff'); Sound.sfx('explode_boss');
      for (let i = 0; i < 10; i++) Game.later(i * 5, () => FX.explode(B.x + rnd.range(-110, 110), B.y + rnd.range(-10, 30), 'm'));
      B.bodyOverride = SPR.boss.emperorCore;
      FX.text(B.x, B.y - 70, 'TRANSFORMATION', { color: GRAD.pink, life: 90 });
      const orbs = [];
      for (let i = 0; i < 6; i++) {
        const o = { name: 'orb' + i, x: 0, y: 0, r: 10, alive: true, ang: Math.PI / 2, flash: 0, wpn: null, armored: false, owner: B, score: 5000, wreck: false, spr: SPR.core.red };
        o.hp = o.maxHp = Math.round(140 * Game.D.hp * 1.8);
        o.damage = dmg => B.damagePart(o, dmg);
        B.parts.push(o); orbs.push(o); B.maxHp += o.maxHp;
        B.arm(o.name, 90, (B, p) => Shoot.aimed(B.wx(p), B.wy(p), { n: 3, spread: 0.25, speed: 2, type: 'purple_s' }), i * 15);
      }
      yield* B.wait(60);
      let rot = 0;
      while (orbs.some(o => o.alive)) {
        k++; rot += 0.018;
        B.x = W / 2 + Math.sin(k * 0.01) * 30; B.y = 92 + Math.sin(k * 0.021) * 8;
        orbs.forEach((o, i) => { const a = rot + i * TAU / 6; o.x = Math.cos(a) * 74; o.y = Math.sin(a) * 50; });
        if (k % 120 === 0 && B.canFire()) Shoot.ring(B.x, B.y, { n: 20, speed: 1.3, type: 'pink_m', off: k * 0.05 });
        yield;
      }
      // PHASE 3: the core itself, everything it has
      B.P('core').armored = false; Game.cancelBullets(true); Game.shake(16); FX.flash(1, '#ffffff'); Sound.sfx('explode_boss');
      FX.text(B.x, B.y - 70, 'EMPEROR CORE', { color: GRAD.red, life: 100, scale: 2 });
      yield* B.wait(80);
      const pats = [
        [4, (B, p, kk) => { for (let a = 0; a < 6; a++) Shoot.bullet(B.wx(p), B.wy(p), kk * 0.12 + a * TAU / 6, 1.6, a & 1 ? 'purple_s' : 'pink_s'); }],
        [36, (B, p, kk) => { Shoot.ring(B.wx(p), B.wy(p), { n: 28, speed: 1.3, type: 'blue_m', off: kk * 0.11 }); Shoot.aimed(B.wx(p), B.wy(p), { n: 7, spread: 0.1, speed: 2.8, type: 'needle' }); }],
        [3, (B, p, kk) => { const a = Math.sin(kk * 0.045) * 1.2 + Math.PI / 2; for (const d of [-26, 26]) Shoot.bullet(B.wx(p) + d, B.wy(p), a + d * 0.004, 2.3, 'orange_s'); }],
        [55, (B, p, kk) => { for (let r = 0; r < 4; r++) Game.later(r * 9, () => B.canFire() && Shoot.ring(B.wx(p), B.wy(p), { n: 16, speed: 1.1 + r * 0.3, type: r & 1 ? 'purple_m' : 'pink_m', off: kk * 0.3 + r * 0.2 })); }],
      ];
      let pi = 0;
      for (;;) {
        B.arm('core', pats[pi][0], pats[pi][1]);
        for (let i = 0; i < 300; i++) { k++; B.x = W / 2 + Math.sin(k * 0.016) * 60; B.y = 90 + Math.sin(k * 0.031) * 18; yield; }
        pi = (pi + 1) % pats.length;
      }
    }
  },
});
