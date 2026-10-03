'use strict';
// ============================================================
// Stage definitions and wave scripts (9 stages + 2 bonus flights)
// ============================================================

const STAGES = [
  { name: 'PACIFIC OCEAN', sub: 'OPERATION SEA STORM', biome: 'ocean', pal: 'green', music: 'stage1', mid: 'cruiser', boss: 'leviathan', len: 6400 },
  { name: 'SAHARA CANYON', sub: 'OPERATION DESERT FANG', biome: 'desert', pal: 'sand', music: 'stage2', mid: 'train', boss: 'behemoth', len: 6400 },
  { name: 'EMERALD JUNGLE', sub: 'OPERATION GREEN HELL', biome: 'jungle', pal: 'olive', music: 'stage3', mid: 'bigBomber', bomberPal: 'olive', boss: 'condor', len: 6400, bonus: 'islands' },
  { name: 'ARCTIC GLACIER', sub: 'OPERATION WHITE STORM', biome: 'arctic', pal: 'ice', music: 'stage4', mid: 'icebreaker', boss: 'zeppelin', len: 6400 },
  { name: 'STEEL CITY', sub: 'OPERATION IRON RAIN', biome: 'city', pal: 'steel', music: 'stage6', mid: 'gunship', boss: 'colossus', len: 6600 },
  { name: 'STORM SEA', sub: 'OPERATION TYPHOON', biome: 'storm', pal: 'navy', music: 'stage7', mid: 'cruiser', boss: 'carrier', len: 6600, bonus: 'sunset' },
  { name: 'ALPINE FORTRESS', sub: 'OPERATION EAGLE NEST', biome: 'alpine', pal: 'crimson', music: 'stage8', mid: 'train', boss: 'bastion', len: 6600 },
  { name: 'VOLCANO FORTRESS', sub: 'OPERATION INFERNO', biome: 'volcano', pal: 'dark', music: 'stage5', mid: 'bigBomber', bomberPal: 'dark', boss: 'citadel', bossMusic: 'finalboss', len: 6600 },
  { name: 'STRATOSPHERE', sub: 'OPERATION DAWN', biome: 'sky', pal: 'purple', music: 'stage9', mid: 'bigBomber', bomberPal: 'purple', boss: 'emperor', bossMusic: 'lastboss', len: 6800 },
];

// ---------- wave library ----------
const WAVES = {
  swoopL() { Spawn.trail(Game.stage >= 3 ? 'jet' : 'fighter', 50, 6, 11, { ai: 'swoop', speed: 2.4, turn: 0.034, turnAt: 45, turnEnd: 125, fireAt: 30 }); },
  swoopR() { Spawn.trail(Game.stage >= 3 ? 'jet' : 'fighter', 190, 6, 11, { ai: 'swoop', speed: 2.4, turn: -0.034, turnAt: 45, turnEnd: 125, fireAt: 30 }); },
  swoopBoth() { this.swoopL(); this.swoopR(); },
  zigL() { Spawn.trail('fighter2', 70, 6, 14, { ai: 'sine', vy: 1.3, amp: 50, freq: 0.035, fireAt: 50 }); },
  zigR() { Spawn.trail('fighter2', 170, 6, 14, { ai: 'sine', vy: 1.3, amp: 50, freq: 0.035, phase: Math.PI, fireAt: 50 }); },
  vee(x = 120) { Spawn.vee('fighter2', x, 5, { ai: 'line', vy: 1.8, fireAt: 45 }); },
  veeP(x = 120) { this.veeDrop(x, 'P'); },
  veeW(x = 120) { this.veeDrop(x, 'W'); },
  veeDrop(x, drop) { Spawn.vee('fighter2', x, 5, { ai: 'line', vy: 1.8, fireAt: 45 }); const e = Game.enemies[Game.enemies.length - 3]; e.drop = drop; e.red = true; },
  crossL() { for (let i = 0; i < 5; i++) Game.later(i * 10, () => Spawn.e('fighter', -12, 30 + i * 4, { ai: 'line', vx: 2.2, vy: 0.9, fireAt: 40 })); },
  crossR() { for (let i = 0; i < 5; i++) Game.later(i * 10, () => Spawn.e('fighter', W + 12, 30 + i * 4, { ai: 'line', vx: -2.2, vy: 0.9, fireAt: 40 })); },
  rise() { for (let i = 0; i < 6; i++) Game.later(i * 8, () => Spawn.e('fighter', 30 + i * 36, H + 12, { ai: 'line', vy: -2.8, vx: 0, fireAt: 999, accel: 0.02 })); },
  // enemies overtaking from behind: warning arrows first, then a fast pass that fires back
  behind(n = 3) {
    const xs = [];
    for (let i = 0; i < n; i++) xs.push(clamp(rnd.range(30, W - 30), 20, W - 20));
    if (Game.player && Game.player.alive && rnd.chance(0.5)) xs[0] = clamp(Game.player.x + rnd.range(-20, 20), 20, W - 20);
    for (const x of xs) Game.alert(x, 70);
    xs.forEach((x, i) => Game.later(70 + i * 10, () => Spawn.e(Game.stage >= 3 ? 'jet' : 'fighter2', x, H + 16, { ai: 'line', vx: 0, vy: -3.4, fireAt: 46, n: 2, spread: 0.3 })));
  },
  behindHeavy() {
    const x = rnd.range(60, W - 60);
    Game.alert(x, 90);
    Game.later(90, () => Spawn.e('heavy', x, H + 24, { ai: 'line', vy: -1.6, fireAt: 60, fireEvery: 50, n: 3, spread: 0.25, drop: rnd.chance(0.5) ? 'W' : 'B', red: true }));
  },
  heavy(x = 120, drop = null) {
    Spawn.e('heavy', x, -20, { ai: 'stop', ty: rnd.range(55, 85), hold: 170, drop, red: !!drop, pattern: (e, k) => { const r = Math.round(60 / Game.D.rate); if (k % r === 25 && Shoot.canFire(e)) Shoot.aimed(e.x, e.y + 10, { n: 3, spread: 0.2, speed: 2.1 }); if (k % r === 55 && Shoot.canFire(e)) Shoot.arc(e.x, e.y + 10, { n: 7, spread: 1.4, speed: 1.6, type: 'orange_s', ang: Math.PI / 2 }); } });
  },
  heavyP(x = 120) { this.heavy(x, 'P'); },
  heavyB(x = 120) { this.heavy(x, 'B'); },
  heavyW(x = 120) { this.heavy(x, 'W'); },
  heavyH(x = 120) { this.heavy(x, 'H'); },
  heavyPair() { this.heavy(70); Game.later(30, () => this.heavy(170)); },
  helis() { const xs = [50, 120, 190]; xs.forEach((x, i) => Game.later(i * 30, () => Spawn.e('heli', x, -20, { ai: 'heli', ty: 50 + i * 20, pal: Game.pal, drop: i === 1 && rnd.chance(0.3) ? 'G' : null }))); },
  kamikaze() { for (let i = 0; i < 6; i++) Game.later(i * 12, () => Spawn.e('rocket', rnd.range(30, W - 30), -12, { ai: 'chase', speed: 2.6 })); },
  jets() { for (let i = 0; i < 4; i++) { Game.later(i * 14, () => Spawn.e('jet', 20 + i * 20, -14, { ai: 'line', vx: 0.8, vy: 3, fireAt: 22, n: 2 })); Game.later(i * 14 + 60, () => Spawn.e('jet', W - 20 - i * 20, -14, { ai: 'line', vx: -0.8, vy: 3, fireAt: 22, n: 2 })); } },
  drones() { for (let i = 0; i < 4; i++) Game.later(i * 25, () => Spawn.e('drone', 40 + i * 53, -16, { ai: 'drone', ty: 60 + (i % 2) * 30 })); },
  bomber(drop = 'B') { Spawn.e('bomber', rnd.range(80, 160), -40, { ai: 'bomber', drop }); },
  bomberP() { this.bomber('P'); },
  bomberH() { this.bomber('H'); },
  // ground
  tanks(n = 3) { for (let i = 0; i < n; i++) Game.later(i * 28, () => Spawn.ground('tank', rnd.range(30, W - 30), { vy: rnd.range(-0.25, 0.15), road: Game.bg.key === 'city' })); },
  aa(n = 2) { for (let i = 0; i < n; i++) Game.later(i * 40, () => Spawn.ground('aa', rnd.range(30, W - 30))); },
  sam(n = 1) { for (let i = 0; i < n; i++) Game.later(i * 50, () => Spawn.ground('sam', rnd.range(30, W - 30))); },
  artillery(n = 1) { for (let i = 0; i < n; i++) Game.later(i * 60, () => Spawn.ground('artillery', rnd.range(40, W - 40))); },
  bunker() { Spawn.ground('bunker', rnd.range(50, W - 50)); },
  boats(n = 3) { for (let i = 0; i < n; i++) Game.later(i * 35, () => Spawn.ground('boat', rnd.range(30, W - 30), { vy: -0.3 })); },
  // a column of supply trucks; the last one carries a prize
  convoy(n = 5) {
    const city = Game.bg.key === 'city';
    const x = city ? rnd.pick([30, 120, 210]) : rnd.range(40, W - 40);
    for (let i = 0; i < n; i++) Game.later(i * 20, () => {
      const last = i === n - 1;
      const e = Spawn.ground('truck', x, { vy: 0.35, road: city, drop: last ? rnd.pick(['G', 'W', 'P', 'B']) : (rnd.chance(0.25) ? 'G' : null) });
      if (e && last) { e.spr = groundSet(Game.pal).truckRed; e.red = true; }
    });
  },
  // fuel depot: tanks that blow up in a chain reaction
  depot() {
    const x = rnd.range(50, W - 50);
    for (let i = 0; i < 5; i++) Game.later(i * 4, () => Spawn.ground('fuel', x + (i % 3 - 1) * 22, { y: -14 - Math.floor(i / 3) * 22 }));
    Game.later(10, () => Spawn.ground('aa', x + 40));
  },
  airfield() {
    const x = rnd.range(40, W - 100);
    for (let i = 0; i < 4; i++) Spawn.ground('parked', x + i * 20, { drop: i === 3 && rnd.chance(0.5) ? 'G' : null });
  },
  ground(n = 3) {
    switch (Game.bg.key) {
      case 'ocean': this.boats(n); if (n > 2) this.aa(1); break;
      case 'desert': this.tanks(n); this.aa(1); if (n > 3) this.artillery(1); break;
      case 'jungle': this.aa(2); this.boats(2); if (n > 2) this.bunker(); break;
      case 'arctic': this.tanks(n); this.aa(1); if (n > 2) this.sam(1); break;
      case 'city': this.tanks(Math.min(n, 3)); this.aa(1); this.sam(1); break;
      case 'storm': this.boats(n + 1); break;
      case 'alpine': this.artillery(1); this.aa(2); if (n > 2) this.tanks(2); break;
      case 'volcano': this.aa(2); this.bunker(); if (n > 2) this.sam(1); break;
      default: this.drones(); if (n > 3) this.jets(); break; // stratosphere: no ground
    }
  },
};

// Stage timelines: "delay wave arg" separated by ';'. Delays in frames (60 = 1 s).
// MID = mid-boss, SUPPLY = friendly repair fortress, BOSS = stage boss.
const TIMELINES = [
  // ---- 1: PACIFIC OCEAN ----
  `140 swoopL; 90 swoopR; 120 vee 120; 80 ground 3; 100 zigL; 60 zigR; 120 heavyP 120;
   160 crossL; 60 crossR; 100 ground 3; 90 vee 70; 40 vee 170; 140 swoopBoth; 120 helis;
   150 ground 4; 80 veeP 120; 140 heavyPair; 160 behind 2; 80 zigL; 60 zigR; 130 ground 3; 120 bomber;
   300 MID; 100 SUPPLY;
   120 swoopL; 70 swoopR; 100 heavyB 60; 60 ground 3; 120 crossL; 50 crossR; 120 vee 120; 80 helis;
   140 heavyW 180; 120 zigL; 50 zigR; 100 ground 4; 100 swoopBoth; 140 heavyPair; 120 vee 90; 40 vee 170;
   120 ground 3; 120 kamikaze; 140 swoopBoth; 260 BOSS`,
  // ---- 2: SAHARA CANYON ----
  `140 vee 120; 80 tanks 3; 100 swoopL; 60 swoopR; 100 convoy 5; 100 heavyP 80; 120 zigL; 60 zigR;
   100 tanks 4; 120 helis; 100 behind 3; 100 depot; 120 bunker; 80 veeW 160; 120 swoopBoth; 120 kamikaze;
   100 ground 4; 120 heavyPair; 150 bomberH; 200 MID; 100 SUPPLY;
   140 swoopL; 60 swoopR; 100 artillery 2; 100 heavyB 160; 120 helis; 120 zigL; 50 zigR; 100 aa 3;
   120 convoy 6; 40 vee 170; 120 kamikaze; 100 heavyP 120; 120 ground 4; 120 behind 3; 50 crossR;
   120 depot; 100 swoopBoth; 120 bunker; 100 heavyPair; 260 BOSS`,
  // ---- 3: EMERALD JUNGLE ----
  `140 helis; 120 ground 3; 100 swoopL; 60 swoopR; 120 heavyP 120; 100 zigL; 60 zigR; 110 ground 3;
   100 kamikaze; 120 helis; 100 vee 120; 100 behind 3; 140 heavyPair; 100 ground 4; 120 veeW 80; 120 bomber;
   120 swoopBoth; 200 MID; 100 SUPPLY;
   120 helis; 100 ground 3; 100 jets; 120 heavyB 120; 100 zigL; 50 zigR; 100 kamikaze; 120 ground 4;
   120 crossL; 50 crossR; 120 heavyH 60; 100 helis; 100 behindHeavy; 120 bomberP; 140 jets; 120 ground 3;
   120 heavyPair; 260 BOSS`,
  // ---- 4: ARCTIC GLACIER ----
  `140 jets; 100 ground 3; 100 swoopL; 60 swoopR; 120 heavyP 120; 120 zigL; 60 zigR; 100 helis;
   120 ground 4; 100 drones; 140 veeW 120; 100 behind 3; 120 jets; 120 heavyPair; 120 sam 2; 100 depot;
   120 bomber; 140 swoopBoth; 200 MID; 100 SUPPLY;
   120 drones; 100 ground 4; 100 jets; 120 heavyB 80; 120 zigL; 50 zigR; 100 helis; 100 kamikaze;
   120 ground 3; 120 heavyP 160; 120 behind 4; 40 crossR; 120 drones; 120 bomberH; 120 jets; 120 swoopBoth;
   120 heavyPair; 120 ground 4; 260 BOSS`,
  // ---- 5: STEEL CITY ----
  `140 convoy 5; 80 swoopL; 60 swoopR; 100 tanks 3; 100 heavyP 120; 100 sam 2; 120 helis; 100 behind 3;
   120 convoy 6; 80 zigL; 50 zigR; 120 aa 3; 100 heavyW 60; 120 jets; 100 depot; 120 tanks 3; 120 bomber;
   140 swoopBoth; 120 sam 2; 200 MID; 100 SUPPLY;
   120 convoy 5; 100 helis; 100 heavyB 160; 120 behind 4; 100 tanks 4; 100 kamikaze; 120 depot; 100 sam 2;
   120 crossL; 50 crossR; 120 heavyH 120; 100 convoy 6; 120 jets; 120 bomberP; 120 behindHeavy; 120 ground 4;
   120 heavyPair; 120 swoopBoth; 260 BOSS`,
  // ---- 6: STORM SEA ----
  `140 boats 4; 100 swoopL; 60 swoopR; 120 heavyP 120; 100 boats 3; 120 jets; 100 behind 3; 120 helis;
   100 zigL; 50 zigR; 120 boats 5; 100 heavyW 180; 120 kamikaze; 100 drones; 120 behindHeavy; 120 bomber;
   120 boats 4; 140 swoopBoth; 200 MID; 100 SUPPLY;
   120 jets; 100 boats 4; 100 heavyB 60; 120 helis; 120 behind 4; 100 boats 5; 100 kamikaze; 120 drones;
   120 heavyH 120; 100 crossL; 40 crossR; 120 boats 4; 120 bomberP; 120 jets; 120 swoopBoth; 120 heavyPair;
   120 behind 3; 260 BOSS`,
  // ---- 7: ALPINE FORTRESS ----
  `140 swoopL; 60 swoopR; 100 artillery 2; 100 heavyP 120; 120 convoy 5; 100 helis; 100 aa 3; 120 behind 3;
   100 jets; 120 artillery 2; 100 heavyW 80; 120 depot; 100 zigL; 50 zigR; 120 tanks 3; 120 bomber;
   120 sam 2; 140 swoopBoth; 200 MID; 100 SUPPLY;
   120 artillery 3; 100 jets; 100 heavyB 160; 120 behind 4; 100 convoy 6; 120 helis; 100 kamikaze;
   120 depot; 120 heavyH 60; 100 drones; 120 behindHeavy; 120 sam 2; 120 bomberP; 120 jets; 120 artillery 2;
   120 heavyPair; 120 swoopBoth; 260 BOSS`,
  // ---- 8: VOLCANO FORTRESS ----
  `140 drones; 100 jets; 120 ground 3; 100 heavyP 120; 120 swoopBoth; 100 kamikaze; 120 behind 3;
   100 ground 4; 120 helis; 120 veeW 120; 100 jets; 120 heavyPair; 120 depot; 120 ground 3; 100 zigL; 50 zigR;
   140 drones; 120 bomber; 200 MID; 100 SUPPLY;
   120 jets; 100 ground 4; 120 heavyB 120; 100 kamikaze; 100 behind 4; 120 drones; 120 heavyH 60;
   120 ground 4; 100 jets; 120 bomberP; 120 drones; 100 behindHeavy; 120 heavyPair; 120 kamikaze; 100 ground 4;
   120 swoopBoth; 120 drones; 120 heavyPair; 280 BOSS`,
  // ---- 9: STRATOSPHERE ----
  `140 jets; 100 drones; 120 swoopBoth; 100 heavyP 120; 120 behind 4; 100 jets; 120 drones; 100 kamikaze;
   120 heavyW 60; 100 zigL; 50 zigR; 120 behindHeavy; 120 jets; 120 drones; 120 bomber; 120 heavyPair;
   120 behind 4; 140 swoopBoth; 200 MID; 100 SUPPLY;
   120 jets; 100 drones; 120 heavyB 120; 100 behind 5; 120 kamikaze; 120 heavyH 180; 100 jets; 120 drones;
   120 bomberP; 100 behindHeavy; 120 swoopBoth; 120 heavyPair; 120 jets; 120 drones; 100 behind 4;
   120 heavyPair; 300 BOSS`,
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
    } else if (step.name === 'SUPPLY') {
      Game.fortress = new SupplyFortress();
      while (Game.fortress) yield 1;
      yield 40;
    } else if (step.name === 'BOSS') {
      // clear the skies, then warning
      let t = 0;
      while (Game.enemies.some(e => !e.dead && !e.gone && !e.ground) && t < 300) { t++; yield 1; }
      Game.warning();
      yield 200;
      const b = new Boss(BOSSES[st.boss], {});
      Game.boss = b;
      Game.enemies.push(b);
      Sound.playMusic(st.bossMusic || 'boss');
      while (!b.dead) yield 1;
      return;
    } else if (WAVES[step.name]) {
      WAVES[step.name](step.arg);
    }
  }
}
