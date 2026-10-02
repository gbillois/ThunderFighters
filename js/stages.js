'use strict';
// ============================================================
// Stage definitions and wave scripts
// ============================================================

const STAGES = [
  { name: 'PACIFIC OCEAN', sub: 'OPERATION SEA STORM', pal: 'green', music: 'stage1', mid: 'cruiser', boss: 'leviathan', len: 6400 },
  { name: 'SAHARA CANYON', sub: 'OPERATION DESERT FANG', pal: 'sand', music: 'stage2', mid: 'train', boss: 'behemoth', len: 6400 },
  { name: 'EMERALD JUNGLE', sub: 'OPERATION GREEN HELL', pal: 'olive', music: 'stage3', mid: 'bigBomber', boss: 'condor', len: 6400 },
  { name: 'ARCTIC GLACIER', sub: 'OPERATION WHITE STORM', pal: 'ice', music: 'stage4', mid: 'icebreaker', boss: 'zeppelin', len: 6400 },
  { name: 'VOLCANO FORTRESS', sub: 'OPERATION INFERNO', pal: 'dark', music: 'stage5', mid: 'bigBomber', boss: 'citadel', len: 6400 },
];

// ---------- wave library ----------
const WAVES = {
  swoopL() { Spawn.trail(Game.stage >= 3 ? 'jet' : 'fighter', 50, 6, 11, { ai: 'swoop', speed: 2.4, turn: 0.034, turnAt: 45, turnEnd: 125, fireAt: 30 }); },
  swoopR() { Spawn.trail(Game.stage >= 3 ? 'jet' : 'fighter', 190, 6, 11, { ai: 'swoop', speed: 2.4, turn: -0.034, turnAt: 45, turnEnd: 125, fireAt: 30 }); },
  swoopBoth() { this.swoopL(); this.swoopR(); },
  zigL() { Spawn.trail('fighter2', 70, 6, 14, { ai: 'sine', vy: 1.3, amp: 50, freq: 0.035, fireAt: 50 }); },
  zigR() { Spawn.trail('fighter2', 170, 6, 14, { ai: 'sine', vy: 1.3, amp: 50, freq: 0.035, phase: Math.PI, fireAt: 50 }); },
  vee(x = 120) { Spawn.vee('fighter2', x, 5, { ai: 'line', vy: 1.8, fireAt: 45 }); },
  veeP(x = 120) { Spawn.vee('fighter2', x, 5, { ai: 'line', vy: 1.8, fireAt: 45 }); const e = Game.enemies[Game.enemies.length - 3]; e.drop = 'P'; e.red = true; },
  crossL() { for (let i = 0; i < 5; i++) Game.later(i * 10, () => Spawn.e('fighter', -12, 30 + i * 4, { ai: 'line', vx: 2.2, vy: 0.9, fireAt: 40 })); },
  crossR() { for (let i = 0; i < 5; i++) Game.later(i * 10, () => Spawn.e('fighter', W + 12, 30 + i * 4, { ai: 'line', vx: -2.2, vy: 0.9, fireAt: 40 })); },
  rise() { for (let i = 0; i < 6; i++) Game.later(i * 8, () => Spawn.e('fighter', 30 + i * 36, H + 12, { ai: 'line', vy: -2.8, vx: 0, fireAt: 999, accel: 0.02 })); },
  heavy(x = 120, drop = null) {
    Spawn.e('heavy', x, -20, { ai: 'stop', ty: rnd.range(55, 85), hold: 170, drop, red: !!drop, pattern: (e, k) => { const r = Math.round(60 / Game.D.rate); if (k % r === 25 && Shoot.canFire(e)) Shoot.aimed(e.x, e.y + 10, { n: 3, spread: 0.2, speed: 2.1 }); if (k % r === 55 && Shoot.canFire(e)) Shoot.arc(e.x, e.y + 10, { n: 7, spread: 1.4, speed: 1.6, type: 'orange_s', ang: Math.PI / 2 }); } });
  },
  heavyP(x = 120) { this.heavy(x, 'P'); },
  heavyB(x = 120) { this.heavy(x, 'B'); },
  heavyPair() { this.heavy(70); Game.later(30, () => this.heavy(170)); },
  helis() { const xs = [50, 120, 190]; xs.forEach((x, i) => Game.later(i * 30, () => Spawn.e('heli', x, -20, { ai: 'heli', ty: 50 + i * 20, pal: Game.pal }))); },
  kamikaze() { for (let i = 0; i < 6; i++) Game.later(i * 12, () => Spawn.e('rocket', rnd.range(30, W - 30), -12, { ai: 'chase', speed: 2.6 })); },
  jets() { for (let i = 0; i < 4; i++) { Game.later(i * 14, () => Spawn.e('jet', 20 + i * 20, -14, { ai: 'line', vx: 0.8, vy: 3, fireAt: 22, n: 2 })); Game.later(i * 14 + 60, () => Spawn.e('jet', W - 20 - i * 20, -14, { ai: 'line', vx: -0.8, vy: 3, fireAt: 22, n: 2 })); } },
  drones() { for (let i = 0; i < 4; i++) Game.later(i * 25, () => Spawn.e('drone', 40 + i * 53, -16, { ai: 'drone', ty: 60 + (i % 2) * 30 })); },
  bomber(drop = 'B') { Spawn.e('bomber', rnd.range(80, 160), -40, { ai: 'bomber', drop }); },
  bomberP() { this.bomber('P'); },
  // ground
  tanks(n = 3) { for (let i = 0; i < n; i++) Game.later(i * 28, () => Spawn.ground('tank', rnd.range(30, W - 30), { vy: rnd.range(-0.25, 0.15) })); },
  aa(n = 2) { for (let i = 0; i < n; i++) Game.later(i * 40, () => Spawn.ground('aa', rnd.range(30, W - 30))); },
  bunker() { Spawn.ground('bunker', rnd.range(50, W - 50)); },
  boats(n = 3) { for (let i = 0; i < n; i++) Game.later(i * 35, () => Spawn.ground('boat', rnd.range(30, W - 30), { vy: -0.3 })); },
  ground(n = 3) {
    switch (Game.stage) {
      case 0: this.boats(n); if (n > 2) this.aa(1); break;
      case 1: this.tanks(n); this.aa(1); break;
      case 2: this.aa(2); this.boats(2); if (n > 2) this.bunker(); break;
      case 3: this.tanks(n); this.aa(2); break;
      default: this.aa(2); this.bunker(); if (n > 2) this.tanks(2); break;
    }
  },
};

// Stage timelines: "delay wave arg" separated by ';'. Delays in frames (60 = 1 s).
const TIMELINES = [
  // ---- STAGE 1: PACIFIC OCEAN ----
  `140 swoopL; 90 swoopR; 120 vee 120; 80 ground 3; 100 zigL; 60 zigR; 120 heavyP 120;
   160 crossL; 60 crossR; 100 ground 3; 90 vee 70; 40 vee 170; 140 swoopBoth; 120 helis;
   150 ground 4; 80 veeP 120; 140 heavyPair; 160 rise; 80 zigL; 60 zigR; 130 ground 3; 120 bomber;
   300 MID;
   120 swoopL; 70 swoopR; 100 heavyB 60; 60 ground 3; 120 crossL; 50 crossR; 120 vee 120; 80 helis;
   140 heavyP 180; 120 zigL; 50 zigR; 100 ground 4; 100 swoopBoth; 140 heavyPair; 120 vee 90; 40 vee 150;
   120 ground 3; 120 kamikaze; 140 swoopBoth; 260 BOSS`,
  // ---- STAGE 2: SAHARA CANYON ----
  `140 vee 120; 80 tanks 3; 100 swoopL; 60 swoopR; 100 aa 2; 100 heavyP 80; 120 zigL; 60 zigR;
   100 tanks 4; 120 helis; 100 crossR; 60 crossL; 120 bunker; 80 veeP 160; 120 swoopBoth; 120 kamikaze;
   100 ground 4; 120 heavyPair; 150 bomber; 200 MID;
   140 swoopL; 60 swoopR; 100 tanks 3; 100 heavyB 160; 120 helis; 120 zigL; 50 zigR; 100 aa 3;
   120 vee 70; 40 vee 170; 120 kamikaze; 100 heavyP 120; 120 ground 4; 120 crossL; 50 crossR;
   120 rise; 100 swoopBoth; 120 bunker; 100 heavyPair; 260 BOSS`,
  // ---- STAGE 3: EMERALD JUNGLE ----
  `140 helis; 120 ground 3; 100 swoopL; 60 swoopR; 120 heavyP 120; 100 zigL; 60 zigR; 110 ground 3;
   100 kamikaze; 120 helis; 100 vee 120; 100 jets; 140 heavyPair; 100 ground 4; 120 veeP 80; 120 bomber;
   120 swoopBoth; 200 MID;
   120 helis; 100 ground 3; 100 jets; 120 heavyB 120; 100 zigL; 50 zigR; 100 kamikaze; 120 ground 4;
   120 crossL; 50 crossR; 120 heavyP 60; 100 helis; 100 swoopBoth; 120 bomberP; 140 jets; 120 ground 3;
   120 heavyPair; 260 BOSS`,
  // ---- STAGE 4: ARCTIC GLACIER ----
  `140 jets; 100 ground 3; 100 swoopL; 60 swoopR; 120 heavyP 120; 120 zigL; 60 zigR; 100 helis;
   120 ground 4; 100 drones; 140 veeP 120; 100 kamikaze; 120 jets; 120 heavyPair; 120 ground 3;
   120 bomber; 140 swoopBoth; 200 MID;
   120 drones; 100 ground 4; 100 jets; 120 heavyB 80; 120 zigL; 50 zigR; 100 helis; 100 kamikaze;
   120 ground 3; 120 heavyP 160; 120 crossL; 40 crossR; 120 drones; 120 bomberP; 120 jets; 120 swoopBoth;
   120 heavyPair; 120 ground 4; 260 BOSS`,
  // ---- STAGE 5: VOLCANO FORTRESS ----
  `140 drones; 100 jets; 120 ground 3; 100 heavyP 120; 120 swoopBoth; 100 kamikaze; 120 drones;
   100 ground 4; 120 helis; 120 veeP 120; 100 jets; 120 heavyPair; 120 bomber; 120 ground 3; 100 zigL; 50 zigR;
   140 drones; 200 MID;
   120 jets; 100 ground 4; 120 heavyB 120; 100 kamikaze; 100 drones; 120 swoopBoth; 120 heavyP 60;
   120 ground 4; 100 jets; 120 bomberP; 120 drones; 100 helis; 120 heavyPair; 120 kamikaze; 100 ground 4;
   120 swoopBoth; 120 drones; 120 heavyPair; 280 BOSS`,
];

function parseTimeline(src) {
  return src.split(';').map(s => s.trim()).filter(Boolean).map(s => {
    const [d, name, arg] = s.split(/\s+/);
    return { delay: +d, name, arg: arg !== undefined ? +arg : undefined };
  });
}

function* stageScript(si) {
  const st = STAGES[si];
  const list = parseTimeline(TIMELINES[si]);
  for (const step of list) {
    yield step.delay;
    if (step.name === 'MID') {
      const mb = new Boss(BOSSES[st.mid], {});
      Game.enemies.push(mb);
      let t = 0;
      while (!mb.dead && !mb.gone && t < 2400) { t++; yield 1; }
      yield 60;
    } else if (step.name === 'BOSS') {
      // clear the skies, then warning
      let t = 0;
      while (Game.enemies.some(e => !e.dead && !e.gone && !e.ground) && t < 300) { t++; yield 1; }
      Game.warning();
      yield 200;
      const b = new Boss(BOSSES[st.boss], {});
      Game.boss = b;
      Game.enemies.push(b);
      Sound.playMusic(st.boss === 'citadel' ? 'finalboss' : 'boss');
      while (!b.dead) yield 1;
      return;
    } else if (WAVES[step.name]) {
      WAVES[step.name](step.arg);
    }
  }
}
