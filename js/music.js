/*
 * THUNDER FIGHTERS - music data (song notation + compiler).
 * Loaded before audio.js. Defines the global MUSIC: { songName: compiledSong }.
 *
 * Notation (all songs 4/4, 16 steps per bar, 1 step = 16th note):
 *   chords : 'C | G/B | Am F | G7'   one bar per '|'; several chords in a bar split it evenly.
 *            'N' = no chord. A progression shorter than the part repeats.
 *   melody : 'G4 - C5 . E5,F5 G5!'   one token per grid unit (res steps, default 2 = 8th notes).
 *            '-' holds the previous note, '.' is a rest, 'a,b' splits the unit into sub notes,
 *            'C5+E5' plays notes together, suffix '!' accent, '?' soft. '|' is only visual.
 *   bass   : {bass: 'R.R.5.R.R.R.8.5.'} per step: R root (or slash bass), 3 5 7 chord tones,
 *            8 octave, 2 ninth, b fifth below, '-' hold, '.' rest. Pattern repeats.
 *   arp    : {arp: '0.1.2.1.', lo: 60}  digits index the chord tones stacked upward from lo.
 *   pad    : {pad: true, lo: 55}        sustained chord voicing inside [lo, lo+12).
 *   stab   : {stab: 'x..x..x.', lo: 55} chord hits (X accent, '-' hold).
 *   power  : {power: 'x.mmX---'}        power chord roots (the guitar adds 5th + octave), m = palm mute.
 *   harm   : {harm: 'lead'}             harmony line under another track (chord aware).
 *   copy   : {copy: 'lead', semi: 12}   copy of another track, transposed.
 *   drums  : 'rock' or {g: 'rock', fill: 'toms', crash: true, k: '...'}; per drum one char
 *            per step: x normal, X accent, o ghost, 1..9 velocity, '.' nothing.
 *
 * Compiled song: {bpm, loop, loopStart, length, delay, tail,
 *                 tracks: [{name, inst, vol, pan, rev, dly, p, ev: [[step, note, lenSteps, vel], ...]}]}
 * Drum track events use drum names instead of MIDI numbers.
 */
const MUSIC = (function () {
  'use strict';

  var warnings = [];
  function warn(msg) { warnings.push(msg); }

  var PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function accOf(a) { return a === '#' ? 1 : (a === 'b' ? -1 : 0); }

  function noteToMidi(tok) {
    var m = /^([A-G])([#b]?)(-?\d)$/.exec(tok);
    if (!m) return null;
    return 12 * (parseInt(m[3], 10) + 1) + PC[m[1]] + accOf(m[2]);
  }

  var QUAL = {
    '': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'm7': [0, 3, 7, 10], 'maj7': [0, 4, 7, 11],
    'dim': [0, 3, 6], 'dim7': [0, 3, 6, 9], 'aug': [0, 4, 8], 'sus4': [0, 5, 7], 'sus2': [0, 2, 7],
    '5': [0, 7], 'add9': [0, 4, 7, 14], 'madd9': [0, 3, 7, 14], 'm9': [0, 3, 7, 10, 14],
    '6': [0, 4, 7, 9], 'm6': [0, 3, 7, 9], '7sus4': [0, 5, 7, 10]
  };

  var chordCache = {};
  function parseChord(name) {
    if (!name || name === 'N') return null;
    if (chordCache[name]) return chordCache[name];
    var parts = name.split('/');
    var m = /^([A-G])([#b]?)(.*)$/.exec(parts[0]);
    if (!m) { warn('bad chord ' + name); return null; }
    var root = (PC[m[1]] + accOf(m[2]) + 12) % 12;
    var iv = QUAL[m[3]];
    if (!iv) { warn('unknown chord quality ' + name); iv = QUAL['']; }
    var bass = root;
    if (parts[1]) {
      var b = /^([A-G])([#b]?)$/.exec(parts[1]);
      if (b) bass = (PC[b[1]] + accOf(b[2]) + 12) % 12;
    }
    var pcs = iv.map(function (x) { return (root + x) % 12; });
    var c = { name: name, root: root, iv: iv, bass: bass, pcs: pcs };
    chordCache[name] = c;
    return c;
  }

  function progression(str, len) {
    var bars = String(str || 'N').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    var steps = [];
    bars.forEach(function (bar) {
      var ch = bar.split(/\s+/);
      for (var i = 0; i < 16; i++) steps.push(parseChord(ch[Math.floor(i * ch.length / 16)]));
    });
    var out = [];
    for (var i = 0; i < len; i++) out.push(steps[i % steps.length]);
    return out;
  }

  // smallest midi >= lo with pitch class pc
  function above(pc, lo) { return lo + (((pc - lo) % 12) + 12) % 12; }
  function clean(p) { return String(p).replace(/[\s|]/g, ''); }

  function interval(ch, kind) {
    var iv = ch.iv, i;
    if (kind === 3) { for (i = 0; i < iv.length; i++) if (iv[i] === 3 || iv[i] === 4) return iv[i]; for (i = 0; i < iv.length; i++) if (iv[i] === 2 || iv[i] === 5) return iv[i]; return 4; }
    if (kind === 5) { for (i = 0; i < iv.length; i++) if (iv[i] >= 6 && iv[i] <= 8) return iv[i]; return 7; }
    if (kind === 7) { for (i = 0; i < iv.length; i++) if (iv[i] >= 9 && iv[i] <= 11) return iv[i]; return 10; }
    return 0;
  }

  function velChar(c) {
    if (c === 'x') return 0.75;
    if (c === 'X') return 1;
    if (c === 'o') return 0.4;
    if (c >= '1' && c <= '9') return (c.charCodeAt(0) - 48) / 9;
    return 0;
  }

  // ------------------------------------------------------------ generators
  function genMel(str, res, len, where) {
    var toks = String(str).replace(/\|/g, ' ').trim().split(/\s+/);
    var ev = [], pos = 0, cur = [];
    toks.forEach(function (tok) {
      if (!tok) return;
      var subs = tok.split(','), sl = res / subs.length;
      subs.forEach(function (st) {
        if (st === '-') { cur.forEach(function (e) { e[2] += sl; }); }
        else if (st === '.') { cur = []; }
        else {
          var vel = 0.8;
          if (st.charAt(st.length - 1) === '!') { vel = 1; st = st.slice(0, -1); }
          else if (st.charAt(st.length - 1) === '?') { vel = 0.55; st = st.slice(0, -1); }
          cur = [];
          st.split('+').forEach(function (nn) {
            var n = noteToMidi(nn);
            if (n == null) { warn(where + ': bad note ' + nn); return; }
            var e = [pos, n, sl, vel];
            ev.push(e); cur.push(e);
          });
        }
        pos += sl;
      });
    });
    if (pos !== len) {
      if (pos > 0 && pos < len && len % pos === 0) {
        var base = ev.slice();
        for (var k = 1; k < len / pos; k++) base.forEach(function (e) { ev.push([e[0] + k * pos, e[1], e[2], e[3]]); });
      } else warn(where + ': melody length ' + pos + ' steps, part has ' + len);
    }
    return ev;
  }

  function genPattern(pat, chords, len, fn) {
    pat = clean(pat);
    var ev = [], cur = null;
    for (var i = 0; i < len; i++) {
      var c = pat.charAt(i % pat.length), ch = chords[i];
      if (c === '-') { if (cur) cur.forEach(function (e) { e[2] += 1; }); continue; }
      cur = null;
      if (c === '.' || !ch) continue;
      var made = fn(c, ch, i);
      if (made && made.length) { cur = made; made.forEach(function (e) { ev.push(e); }); }
    }
    return ev;
  }

  function genBass(pat, chords, len, lo, vel) {
    return genPattern(pat, chords, len, function (c, ch, i) {
      var r = above(ch.root, lo), b = above(ch.bass, lo), n;
      switch (c) {
        case 'R': n = b; break;
        case '8': n = b + 12; break;
        case '3': n = r + interval(ch, 3); break;
        case '5': n = r + interval(ch, 5); break;
        case '7': n = r + interval(ch, 7); break;
        case '2': n = r + 2; break;
        case 'b': n = r - 5; break;
        default: return null;
      }
      return [[i, n, 1, vel]];
    });
  }

  function chordTones(ch, lo) {
    var r = above(ch.root, lo);
    return ch.iv.map(function (x) { return r + x; }).sort(function (a, b) { return a - b; });
  }

  function genArp(pat, chords, len, lo, vel) {
    return genPattern(pat, chords, len, function (c, ch, i) {
      if (c < '0' || c > '9') return null;
      var idx = c.charCodeAt(0) - 48, t = chordTones(ch, lo), n = t.length;
      return [[i, t[idx % n] + 12 * Math.floor(idx / n), 1, vel]];
    });
  }

  function voicing(ch, lo) {
    return ch.pcs.map(function (pc) { return above(pc, lo); }).sort(function (a, b) { return a - b; });
  }

  function genPad(chords, len, lo, vel) {
    var ev = [], i = 0;
    while (i < len) {
      var ch = chords[i], j = i + 1;
      // chords stay held across bar lines while unchanged
      while (j < len && chords[j] === ch) j++;
      if (ch) voicing(ch, lo).forEach(function (n) { ev.push([i, n, j - i, vel]); });
      i = j;
    }
    return ev;
  }

  function genStab(pat, chords, len, lo) {
    return genPattern(pat, chords, len, function (c, ch, i) {
      var v = velChar(c);
      if (!v) return null;
      return voicing(ch, lo).map(function (n) { return [i, n, 1, v > 0.9 ? 1 : 0.8]; });
    });
  }

  function genPower(pat, chords, len, lo) {
    return genPattern(pat, chords, len, function (c, ch, i) {
      var r = above(ch.root, lo), v;
      if (c === 'm') v = 0.42; else if (c === 'X') v = 1; else if (c === 'x') v = 0.8; else return null;
      // one event per chord: the guitar instrument stacks the 5th and octave itself
      return [[i, r, c === 'm' ? 0.7 : 1, v]];
    });
  }

  // ------------------------------------------------------------ drums
  var GROOVES = {
    rock:    { k: 'x.......x.x.....', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.' },
    rock16:  { k: 'x.......x.x.....', s: '....X.......X...', h: 'xoxoxoxoxoxoxoxo' },
    drive:   { k: 'x...x...x...x...', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.' },
    march:   { k: 'x.......x.......', s: '....X..o.o..X.oo', h: 'x.x.x.x.x.x.x.x.' },
    funk:    { k: 'x.....x.x.......', s: '....X..o.o..X..o', h: 'xoxoxoxoxoxoxoxo' },
    dbeat:   { k: 'x.x.x.x.x.x.x.x.', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.' },
    metal:   { k: 'xoxoxoxoxoxoxoxo', s: '....X.......X...', h: 'x...x...x...x...' },
    half:    { k: 'x.........x.....', s: '........X.......', h: 'x.x.x.x.x.x.x.x.' },
    arctic:  { k: 'x.....x...x.....', s: '....X.......X...', h: 'x.xxx.xxx.xxx.xx' },
    desert:  { k: 'x..x..x...x.....', s: '....X.......X...', cg: '..x.xx...x.x.xx.', rim: 'x..x..x.x..x..x.', sh: 'x.x.x.x.x.x.x.x.' },
    desert2: { k: 'x..x..x.x..x..x.', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.', cg: '..x.xx...x.x.xx.', cgl: 'x......x......x.' },
    tribal:  { k: 'x.......x.......', tb: 'x.....x...x.....', t2: '....x.......x.x.', cg: '..x.xx.x..x.xx.x', sh: 'xoxoxoxoxoxoxoxo' },
    tribal2: { k: 'x...x...x...x...', tb: 'x..x..x...x..x..', s: '....x.......x...', t1: '..x.......x.....', t3: '......x.......xx', cg: '.xx..xx..xx..xx.', sh: 'xoxoxoxoxoxoxoxo' },
    jbreak:  { tb: 'x..x..x.x..x..x.', t1: '..x...x...x...xx', t3: 'x...x...x...x...', cg: 'xx.xx.xx.x.xx.x.', sh: 'xoxoxoxoxoxoxoxo' },
    // an = anvil clank, rd = ride cymbal (added for stages 6 to 9)
    indus:   { k: 'x.....x.x.x.....', s: '....X..o.o..X..o', h: 'xoxoxoxoxoxoxoxo', an: '..x.......x..x..' },
    indus2:  { k: 'x...x...x...x...', s: '....X.......X...', cl: '....x.......x...', oh: '..x...x...x...x.', an: '......x.......x.' },
    gallop:  { k: 'x.......x.x.....', s: '....X.......X...', h: 'x.xxx.xxx.xxx.xx' },
    storm:   { k: 'x.....x...x.....', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.', t3: '..............x.' },
    rush:    { k: 'x.x.x.x.x.x.x.x.', s: '....X.......X...', rd: 'x.x.x.x.x.x.x.x.' },
    bounce:  { k: 'x.....x...x.....', s: '....X.......X...', cl: '....x.......x..o', oh: '..x...x...x...x.', sh: 'xoxoxoxoxoxoxoxo' }
  };
  var FILLS = {
    snare: { k: 'x.......x.......', s: '....x...x.x.xxxx', h: 'x.x.x.x.........' },
    roll:  { k: 'x.......x.......', s: '4.4.5.5.6677889X' },
    toms:  { k: 'x.......x.......', s: '....x...........', t1: '........xx......', t2: '..........xx....', t3: '............xxXX' },
    tribalfill: { tb: 'x..x..x.x.x.xxxx', t1: '..x...x...x.....', t3: '....x...x...xXXX', cg: 'xoxoxoxoxoxoxoxo' }
  };
  var DRUM_RESERVED = { g: 1, fill: 1, crash: 1 };

  function addLines(lines, from, to, ev, where) {
    Object.keys(lines).forEach(function (k) {
      var s = clean(lines[k]);
      if (!s.length || s.length % 16 !== 0) warn(where + ': drum line ' + k + ' length ' + s.length);
      if (!s.length) return;
      for (var i = from; i < to; i++) {
        var v = velChar(s.charAt((i - from) % s.length));
        if (v) ev.push([i, k, 0, v]);
      }
    });
  }

  function genDrums(v, len, where) {
    if (typeof v === 'string') v = { g: v };
    var lines = {};
    if (v.g) {
      if (!GROOVES[v.g]) warn(where + ': unknown groove ' + v.g);
      else Object.keys(GROOVES[v.g]).forEach(function (k) { lines[k] = GROOVES[v.g][k]; });
    }
    Object.keys(v).forEach(function (k) { if (!DRUM_RESERVED[k]) lines[k] = v[k]; });
    var ev = [];
    var fill = v.fill ? (typeof v.fill === 'string' ? FILLS[v.fill] : v.fill) : null;
    if (v.fill && !fill) warn(where + ': unknown fill ' + v.fill);
    var fillStart = (fill && len >= 16) ? len - 16 : len;
    addLines(lines, 0, fillStart, ev, where);
    if (fill && fillStart < len) addLines(fill, fillStart, len, ev, where);
    if (v.crash) ev.push([0, 'c', 0, 0.85]);
    return ev;
  }

  // ------------------------------------------------------------ harmony
  var MODES = {
    major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10], phrygdom: [0, 1, 4, 5, 7, 8, 10]
  };
  function makeScale(key, mode) {
    var k = parseChord(key || 'C').root;
    return (MODES[mode] || MODES.major).map(function (x) { return (x + k) % 12; }).sort(function (a, b) { return a - b; });
  }
  function diatonic(n, deg, scale) {
    var oct = Math.floor(n / 12), pc = n % 12, idx = -1;
    for (var k = 0; k < scale.length; k++) if (scale[k] <= pc) idx = k;
    if (idx < 0) { idx = scale.length - 1; oct -= 1; }
    var off = (oct * 12 + scale[idx]) - n; // <= 0
    var ni = idx + deg, o2 = oct + Math.floor(ni / scale.length);
    ni = ((ni % scale.length) + scale.length) % scale.length;
    return o2 * 12 + scale[ni] - off;
  }
  function harmNote(n, ch, scale, deg) {
    if (ch && deg === -2 && ch.pcs.indexOf(n % 12) >= 0) {
      for (var m = n - 3; m >= n - 9; m--) if (ch.pcs.indexOf(m % 12) >= 0) return m;
    }
    return diatonic(n, deg, scale);
  }

  // ------------------------------------------------------------ compiler
  function gen(v, tr, chords, len, where) {
    if (tr.inst === 'drums') return genDrums(v, len, where);
    if (typeof v === 'string') v = { m: v };
    if (v.m != null) return genMel(v.m, v.res || tr.res || 2, len, where);
    if (v.bass != null) return genBass(v.bass, chords, len, v.lo != null ? v.lo : 34, v.vel || 0.85);
    if (v.arp != null) return genArp(v.arp, chords, len, v.lo != null ? v.lo : 60, v.vel || 0.75);
    if (v.pad) return genPad(chords, len, v.lo != null ? v.lo : 55, v.vel || 0.7);
    if (v.stab != null) return genStab(v.stab, chords, len, v.lo != null ? v.lo : 55);
    if (v.power != null) return genPower(v.power, chords, len, v.lo != null ? v.lo : 38);
    warn(where + ': unknown part spec');
    return [];
  }

  function song(spec) {
    var names = Object.keys(spec.tracks);
    var evs = {};
    names.forEach(function (n) { evs[n] = []; });
    var scale = makeScale(spec.key, spec.mode);
    var pos = 0, loopStart = 0;
    spec.order.forEach(function (pn, oi) {
      if (oi === (spec.loopFrom || 0)) loopStart = pos;
      var part = spec.parts[pn];
      if (!part) { warn(spec.name + ': missing part ' + pn); return; }
      var len = Math.round(part.bars * 16);
      var chords = progression(part.chords, len);
      var local = {};
      names.forEach(function (n) {
        var v = part[n];
        if (v == null || (typeof v === 'object' && (v.harm || v.copy))) return;
        local[n] = gen(v, spec.tracks[n], chords, len, spec.name + '/' + pn + '/' + n);
      });
      names.forEach(function (n) {
        var v = part[n];
        if (!v || typeof v !== 'object' || !(v.harm || v.copy)) return;
        var src = local[v.harm || v.copy];
        if (!src) { warn(spec.name + '/' + pn + '/' + n + ': no source'); return; }
        if (v.copy) {
          local[n] = src.map(function (e) { return [e[0] + (v.shift || 0), e[1] + (v.semi || 0), e[2], e[3] * (v.velMul || 1)]; });
        } else {
          var deg = v.deg != null ? v.deg : -2;
          local[n] = src.map(function (e) { return [e[0], harmNote(e[1], chords[e[0]], scale, deg), e[2], e[3] * 0.9]; });
        }
      });
      names.forEach(function (n) {
        var tr = spec.tracks[n], gate = tr.gate || 1, trans = tr.trans || 0;
        (local[n] || []).forEach(function (e) {
          if (e[0] >= len) return;
          if (tr.inst === 'drums') evs[n].push([e[0] + pos, e[1], 0, e[3]]);
          else evs[n].push([e[0] + pos, e[1] + trans, Math.max(0.25, e[2] * gate), e[3]]);
        });
      });
      pos += len;
    });
    return {
      name: spec.name, bpm: spec.bpm, loop: spec.loop !== false, loopStart: loopStart, length: pos,
      delay: spec.delay || 0.75, tail: spec.tail || 2,
      tracks: names.map(function (n) {
        var t = spec.tracks[n];
        return { name: n, inst: t.inst, vol: t.vol != null ? t.vol : 0.8, pan: t.pan || 0,
          rev: t.rev != null ? t.rev : 0.12, dly: t.dly || 0, p: t.p || null, ev: evs[n] };
      })
    };
  }

  function ext(base, over) {
    var o = {}, k;
    for (k in base) o[k] = base[k];
    for (k in over) o[k] = over[k];
    return o;
  }

  var S = {};
  var A, B, C;

  // =====================================================================
  // TITLE: heroic anthem in C major, brass fanfare intro, bVI-bVII-I cadences
  // =====================================================================
  A = {
    bars: 8, chords: 'C | G | Am | Em | F | C | Dm | G',
    lead: 'G4 - C5 - - - D5 E5 | D5 - - - B4 - G4 - | A4 - C5 - E5 - - D5 | E5 - - - B4 - - - | ' +
          'A4 - C5 - F5 - - E5 | G5 - - - E5 - C5 - | D5 - F5 - A5 - - G5 | G5 - - - - - . .',
    brass: { stab: 'x.....x...x.....', lo: 55 },
    str: { pad: true, lo: 55 },
    arp: { arp: '0.1.2.3.4.3.2.1.', lo: 60 },
    bass: { bass: 'R.R.5.R.R.R.8.5.' },
    drums: { g: 'march', crash: true, fill: 'snare' }
  };
  B = {
    bars: 8, chords: 'F | G | Em | Am | Dm | G | Ab Bb | C',
    lead: 'F5 - - - A5 - C6 - | B5 - - - G5 - D5 - | E5 - G5 - B5 - - A5 | A5 - - - - - E5 - | ' +
          'F5 - - - A5 - D6 - | D6 - - - C6 - B5 - | C6 - - - D6 - - - | E6 - - - - - . .',
    brass: { stab: 'x..x..x.x...x...', lo: 55 },
    str: { pad: true, lo: 60 },
    arp: { arp: '0123012301230123', lo: 64 },
    bass: { bass: 'R.8.R.8.R.8.R.8.' },
    drums: { g: 'drive', crash: true, fill: 'toms' }
  };
  S.title = song({
    name: 'title', bpm: 126, key: 'C', mode: 'major', loopFrom: 1,
    tracks: {
      lead:  { inst: 'lead',    vol: 0.95, pan: 0,     rev: 0.28, dly: 0.2, gate: 0.96 },
      harm:  { inst: 'lead2',   vol: 0.6,  pan: 0.32,  rev: 0.3,  dly: 0.12, gate: 0.96 },
      brass: { inst: 'brass',   vol: 0.85, pan: -0.28, rev: 0.3 },
      str:   { inst: 'strings', vol: 0.9,  pan: 0.18,  rev: 0.45 },
      arp:   { inst: 'pluck',   vol: 0.55, pan: -0.4,  rev: 0.2, dly: 0.3 },
      bass:  { inst: 'fmbass',  vol: 0.95 },
      drums: { inst: 'drums',   vol: 0.9, rev: 0.12 }
    },
    parts: {
      I: {
        bars: 2, chords: 'C | Ab Bb',
        lead: { m: 'G4 . . G4 . . G4 . C5 - - - - - - - | C5 - - - - - - - D5 - - - - - - -', res: 1 },
        brass: { stab: 'x..x..x.x------- x-------x-------', lo: 55 },
        str: { pad: true, lo: 55 },
        bass: { bass: 'R..R..R.R------- R-------R-------' },
        drums: { k: 'x..x..x.x....... x.......x.......', s: '................ 3.4.5.6.789XXXXX',
                 ti: 'x..x..x.x....... x.......x.......', c: 'x............... ................' }
      },
      A: A, B: B,
      A2: ext(A, { harm: { harm: 'lead' }, arp: { arp: '0121012101210121', lo: 60 }, drums: { g: 'rock16', crash: true, fill: 'snare' } }),
      B2: ext(B, { harm: { harm: 'lead' }, drums: { g: 'drive', crash: true, fill: 'roll' } })
    },
    order: ['I', 'A', 'B', 'A2', 'B2']
  });

  // =====================================================================
  // SELECT: bouncy F major menu loop (~20 s)
  // =====================================================================
  S.select = song({
    name: 'select', bpm: 140, key: 'F', mode: 'major',
    tracks: {
      lead:  { inst: 'lead2',  vol: 0.95, pan: 0.1, rev: 0.2, dly: 0.25, gate: 0.9 },
      arp:   { inst: 'pluck',  vol: 0.55, pan: -0.35, rev: 0.15, dly: 0.2 },
      pad:   { inst: 'pad',    vol: 0.8, pan: 0.2, rev: 0.35 },
      bass:  { inst: 'fmbass', vol: 0.9 },
      drums: { inst: 'drums',  vol: 0.85, rev: 0.1 }
    },
    parts: {
      A: {
        bars: 8, chords: 'F | Dm | Bb | C | F | Dm | Gm | C',
        lead: 'C5 . F5 . A5 . G5 F5 | A5 - - . F5 . D5 . | F5 . Bb5 . D6 . C6 Bb5 | C6 - - . G5 . E5 . | ' +
              'C5 . F5 . A5 . G5 F5 | A5 - - . C6 . D6 . | D6 . C6 . Bb5 . A5 G5 | G5 - - . E5 . C5 .',
        arp: { arp: '0.1.2.1.3.1.2.1.', lo: 60 },
        pad: { pad: true, lo: 57 },
        bass: { bass: 'R..R..R.R.8.5.R.' },
        drums: { g: 'funk', crash: true, fill: 'snare' }
      },
      B: {
        bars: 4, chords: 'Bb | C | A7 Dm | Gm C',
        lead: 'D6 - - - C6 - Bb5 - | C6 - - - - - G5 - | C#6 - - - D6 - - - | Bb5 - A5 - G5 - E5 -',
        arp: { arp: '0123012301230123', lo: 62 },
        pad: { pad: true, lo: 57 },
        bass: { bass: 'R.8.R.8.R.8.R.8.' },
        drums: { g: 'drive', crash: true, fill: 'roll' }
      }
    },
    order: ['A', 'B']
  });

  // =====================================================================
  // STAGE 1: Pacific islands, heroic rock march in D major (150 bpm)
  // =====================================================================
  A = {
    bars: 8, chords: 'D | D | G | A | Bm | G | Em | A',
    lead: 'A4 - D5 - E5 - F#5 - | A5 - - - F#5 - D5 - | B4 - D5 - G5 - - F#5 | E5 - - - C#5 - A4 - | ' +
          'B4 - D5 - F#5 - - E5 | G5 - F#5 - E5 - D5 - | E5 - - - G5 - B5 - | A5 - - - - - . .',
    gtr: { power: 'x.mmx.mmx.mmx.mm', lo: 38 },
    str: { pad: true, lo: 57 },
    arp: { arp: '0.1.2.1.0.1.2.1.', lo: 62 },
    bass: { bass: 'R.R.R.R.R.R.R.8.' },
    drums: { g: 'rock', crash: true, fill: 'snare' }
  };
  B = {
    bars: 8, chords: 'G | A | F#m | Bm | G | A | D | D',
    lead: 'B5 - - - A5 - G5 - | A5 - - - - - E5 - | F#5 - - - A5 - C#6 - | B5 - - - D6 - B5 - | ' +
          'G5 - A5 - B5 - D6 - | C#6 - - - B5 - A5 - | D6 - - - - - - - | - - - - A5 B5 C#6 D6',
    gtr: { power: 'X-----x-X-----x-', lo: 38 },
    brass: { stab: 'x..x..x.........', lo: 57 },
    str: { pad: true, lo: 60 },
    arp: { arp: '0123012301230123', lo: 62 },
    bass: { bass: 'R.8.R.8.R.8.R.8.' },
    drums: { g: 'drive', crash: true, fill: 'toms' }
  };
  C = {
    bars: 8, chords: 'Bm | Bm | G | A | Bm | Bm | C | A',
    lead: 'F#5 - - - E5 - D5 - | E5 - F#5 - - - B4 - | D5 - - - E5 - G5 - | F#5 - - - E5 - - - | ' +
          'F#5 - - - E5 - D5 - | E5 - F#5 - - - A5 - | G5 - - - E5 - C5 - | E5 - - - A5 - C#6 -',
    harm: { harm: 'lead' },
    gtr: { power: 'x.x.x.xxx.x.x.xx', lo: 38 },
    brass: { stab: 'x.......x.......', lo: 55 },
    str: { pad: true, lo: 57 },
    arp: { arp: '0.2.1.2.0.2.1.2.', lo: 62 },
    bass: { bass: 'R.RRR.RRR.RRR.R5' },
    drums: { g: 'rock16', crash: true, fill: 'snare' }
  };
  S.stage1 = song({
    name: 'stage1', bpm: 150, key: 'D', mode: 'major', loopFrom: 1,
    tracks: {
      lead:  { inst: 'leadsaw', vol: 0.9, rev: 0.22, dly: 0.18, gate: 0.95 },
      harm:  { inst: 'lead2',   vol: 0.55, pan: 0.3, rev: 0.25, dly: 0.1, gate: 0.95 },
      gtr:   { inst: 'guitar',  vol: 0.7, pan: -0.3, rev: 0.1 },
      brass: { inst: 'brass',   vol: 0.75, pan: 0.25, rev: 0.3 },
      str:   { inst: 'strings', vol: 0.7, pan: 0.1, rev: 0.4 },
      arp:   { inst: 'pluck',   vol: 0.45, pan: 0.4, rev: 0.15, dly: 0.25 },
      bass:  { inst: 'bass',    vol: 0.9 },
      drums: { inst: 'drums',   vol: 0.9, rev: 0.1 }
    },
    parts: {
      I: {
        bars: 2, chords: 'D | Bb C',
        gtr: { power: 'x.mmx.mmx.mmx.mm X-------X-------', lo: 38 },
        brass: { stab: '................ x-------x-------', lo: 55 },
        bass: { bass: 'R.RRR.RRR.RRR.RR R-------R-------' },
        drums: { k: 'x.......x.x..... x.......x.......', s: '....X.......X... X.......X.x.XXXX',
                 h: 'x.x.x.x.x.x.x.x. ................', c: '................ x.......x.......' }
      },
      A: A, B: B, C: C,
      A2: ext(A, { harm: { harm: 'lead' }, drums: { g: 'rock16', crash: true, fill: 'snare' } }),
      B2: ext(B, { harm: { harm: 'lead' }, drums: { g: 'drive', crash: true, fill: 'roll' } })
    },
    order: ['I', 'A', 'B', 'C', 'A2', 'B2']
  });

  // =====================================================================
  // STAGE 2: desert canyon, A harmonic minor, snake-charmer reed lead
  // =====================================================================
  A = {
    bars: 8, chords: 'Am | Am | E | E | Dm | Am | F | E',
    lead: 'E5 - F5 E5 D5 - C5 - | B4 - C5 - A4 - - - | G#4 - A4 - B4 - C5 - | D5 - C5 - B4 - - - | ' +
          'A4 - D5 - F5 - E5 D5 | E5 - - - C5 - A4 - | A5 - - G#5 F5 - E5 - | E5 - F5 E5 G#5 - - -',
    riff: { arp: '0..1..2.3..2..1.', lo: 57 },
    str: { pad: true, lo: 55 },
    bass: { bass: 'R..R..R.R..R..R.' },
    drums: { g: 'desert', crash: true, fill: 'toms' }
  };
  B = {
    bars: 8, chords: 'Am | Dm | E | Am | F | Dm | E | E',
    lead: 'A5 - - - C6 - B5 A5 | D5 - F5 - A5 - G#5 A5 | B5 - - - G#5 - E5 - | A5 - - - - - E5 - | ' +
          'F5 - - - A5 - C6 - | D6 - C6 - B5 - A5 - | B5 - A5 - G#5 - F5 - | E5 - - - - - . .',
    riff: { arp: '0121012101210121', lo: 57 },
    brass: { stab: 'x..x..x.........', lo: 55 },
    str: { pad: true, lo: 57 },
    bass: { bass: 'R..R..R.R.8.R.5.' },
    drums: { g: 'desert2', crash: true, fill: 'snare' }
  };
  S.stage2 = song({
    name: 'stage2', bpm: 140, key: 'A', mode: 'harmonic', loopFrom: 1,
    tracks: {
      lead:  { inst: 'reed',    vol: 0.95, rev: 0.3, dly: 0.22, gate: 0.95 },
      harm:  { inst: 'lead2',   vol: 0.5, pan: -0.3, rev: 0.3, dly: 0.1, gate: 0.95 },
      riff:  { inst: 'pluck',   vol: 0.6, pan: 0.35, rev: 0.2, dly: 0.2 },
      str:   { inst: 'strings', vol: 0.75, pan: -0.1, rev: 0.45 },
      brass: { inst: 'brass',   vol: 0.7, pan: 0.25, rev: 0.3 },
      bass:  { inst: 'bass',    vol: 0.95 },
      drums: { inst: 'drums',   vol: 0.9, rev: 0.14 }
    },
    parts: {
      I: {
        bars: 2, chords: 'E | E',
        riff: 'E4 F4 G#4 F4 E4 F4 G#4 B4 | A4 G#4 F4 G#4 F4 E4 F4 E4',
        str: { pad: true, lo: 52 },
        bass: { bass: 'R..R..R.R..R..R.' },
        drums: { g: 'desert' }
      },
      A: A, B: B,
      A2: ext(A, { harm: { harm: 'lead' } }),
      B2: ext(B, { harm: { harm: 'lead' }, drums: { g: 'desert2', crash: true, fill: 'toms' } })
    },
    order: ['I', 'A', 'B', 'A2', 'B2']
  });

  // =====================================================================
  // STAGE 3: jungle river, A minor pentatonic, flute + marimba + tribal toms
  // =====================================================================
  A = {
    bars: 8, chords: 'Am | G | F | G | Am | G | F | G',
    lead: 'E5 - - - G5 - A5 - | G5 - E5 - D5 - - - | C5 - - D5 E5 - - - | D5 - - - . . . . | ' +
          'E5 - - - G5 - A5 - | C6 - - - A5 - G5 - | A5 - G5 - E5 - D5 - | E5 - - - - - . .',
    mar: { arp: '0.1.2.1.3.2.1.2.', lo: 57 },
    pad: { pad: true, lo: 55 },
    bass: { bass: 'R..R..R.....R.5.' },
    drums: { g: 'tribal', crash: true, fill: 'tribalfill' }
  };
  B = {
    bars: 8, chords: 'Dm | Em | F | G | Am | G | F | E',
    lead: 'F5 - - - A5 - D6 - | B5 - - - G5 - E5 - | C6 - - - A5 - F5 - | G5 - - - B5 - D6 - | ' +
          'C6 - - - - - A5 - | B5 - - - G5 - D5 - | F5 - - - A5 - C6 - | B5 - - - G#5 - E5 -',
    mar: { arp: '0121012101210121', lo: 60 },
    pad: { pad: true, lo: 57 },
    bass: { bass: 'R..R..R.R..R..R.' },
    drums: { g: 'tribal2', crash: true, fill: 'toms' }
  };
  S.stage3 = song({
    name: 'stage3', bpm: 132, key: 'A', mode: 'minor', loopFrom: 1,
    tracks: {
      lead:  { inst: 'flute',   vol: 0.95, rev: 0.3, dly: 0.25, gate: 0.95 },
      harm:  { inst: 'lead2',   vol: 0.45, pan: 0.3, rev: 0.3, gate: 0.95 },
      mar:   { inst: 'marimba', vol: 0.8, pan: -0.3, rev: 0.2, dly: 0.15 },
      pad:   { inst: 'pad',     vol: 0.7, pan: 0.2, rev: 0.45 },
      bass:  { inst: 'fmbass',  vol: 0.95 },
      drums: { inst: 'drums',   vol: 0.95, rev: 0.15 }
    },
    parts: {
      I: {
        bars: 2, chords: 'Am | Am',
        mar: { arp: '0..1..2.3..2..1.', lo: 57 },
        drums: { g: 'tribal', fill: 'tribalfill' }
      },
      A: A, B: B,
      C: {
        bars: 4, chords: 'Am | Am | F | G',
        mar: { arp: '0..1..2.3..2..1.', lo: 57 },
        bass: { bass: 'R..R..R.....R.5.' },
        drums: { g: 'jbreak', fill: 'tribalfill' }
      },
      A2: ext(A, { harm: { harm: 'lead' } }),
      B2: ext(B, { harm: { harm: 'lead' } })
    },
    order: ['I', 'A', 'B', 'C', 'A2', 'B2']
  });

  // =====================================================================
  // STAGE 4: arctic glacier, D minor, FM bells and crystal arps
  // =====================================================================
  A = {
    bars: 8, chords: 'Dm | Bbmaj7 | Gm | A | Dm | Bbmaj7 | Gm | A',
    bell: 'A5 - - - E5 - F5 - | D5 - - - A4 - - - | Bb4 - D5 - G5 - - F5 | E5 - - - C#5 - - - | ' +
          'A5 - - - E5 - F5 - | D6 - - - C6 - A5 - | G5 - A5 - Bb5 - D6 - | C#6 - - - - - . .',
    glock: { arp: '0.1.2.3.2.1.2.3.', lo: 62 },
    str: { pad: true, lo: 57 },
    bass: { bass: 'R..RR..RR..RR.8.' },
    drums: { g: 'arctic', crash: true, fill: 'snare' }
  };
  B = {
    bars: 8, chords: 'Bb | C | Dm | Dm | Bb | C | A | A',
    lead: 'F5 - - - Bb5 - - A5 | G5 - - - E5 - C5 - | D5 - E5 - F5 - A5 - | A5 - - - - - . . | ' +
          'F5 - - - Bb5 - D6 - | C6 - - - G5 - E5 - | E5 - - - A5 - C#6 - | C#6 - - - E6 - - -',
    bell: { copy: 'lead', velMul: 0.8 },
    glock: { arp: '0123012301230123', lo: 62 },
    str: { pad: true, lo: 60 },
    bass: { bass: 'R.R.R.R.R.R.R.8.' },
    drums: { g: 'drive', crash: true, fill: 'toms' }
  };
  S.stage4 = song({
    name: 'stage4', bpm: 136, key: 'D', mode: 'minor', loopFrom: 1,
    tracks: {
      bell:  { inst: 'bell',    vol: 0.95, rev: 0.4, dly: 0.3 },
      lead:  { inst: 'lead',    vol: 0.75, pan: -0.1, rev: 0.3, dly: 0.25, gate: 0.95, p: { vib: [5, 10, 0.3] } },
      harm:  { inst: 'lead2',   vol: 0.45, pan: 0.35, rev: 0.35, gate: 0.95 },
      glock: { inst: 'glock',   vol: 0.6, pan: 0.3, rev: 0.35, dly: 0.3 },
      str:   { inst: 'strings', vol: 0.8, pan: -0.2, rev: 0.5 },
      bass:  { inst: 'bass',    vol: 0.9 },
      drums: { inst: 'drums',   vol: 0.85, rev: 0.15 }
    },
    parts: {
      I: {
        bars: 2, chords: 'Dm | Dm',
        glock: { arp: '0123012301230123', lo: 62 },
        str: { pad: true, lo: 57 },
        drums: { k: 'x.........x..... x.........x.x...', h: '..x...x...x...x. ..x...x...x.xxxx' }
      },
      A: A, B: B,
      A2: ext(A, { harm: { harm: 'bell' } }),
      B2: ext(B, { harm: { harm: 'lead' }, drums: { g: 'drive', crash: true, fill: 'roll' } })
    },
    order: ['I', 'A', 'B', 'A2', 'B2']
  });

  // =====================================================================
  // STAGE 5: volcano fortress, E minor, distorted power chords, 166 bpm
  // =====================================================================
  A = {
    bars: 8, chords: 'Em | Em | C | D | Em | Em | C | B',
    lead: 'B4 - - - E5 - G5 - | F#5 - E5 - D5 - B4 - | C5 - E5 - G5 - - - | F#5 - - - D5 - - - | ' +
          'B4 - - - E5 - G5 - | B5 - - - A5 - G5 - | C6 - - - B5 - G5 - | F#5 - - - D#5 - B4 -',
    gtr: { power: 'X.mmX.mmX.mmX.mm', lo: 38 },
    choir: { pad: true, lo: 52 },
    bass: { bass: 'R.RRR.RRR.RRR.RR' },
    drums: { g: 'dbeat', crash: true, fill: 'snare' }
  };
  B = {
    bars: 8, chords: 'Am | B | Em | C | Am | B | C | D',
    lead: 'E5 - A5 - C6 - B5 A5 | B5 - - - F#5 - D#5 - | E5 - - - G5 - B5 - | C6 - - - B5 - G5 - | ' +
          'A5 - - - C6 - E6 - | D#6 - - - B5 - F#5 - | E6 - D6 - C6 - B5 - | A5 - - - - - . .',
    gtr: { power: 'X-----X-X-----X-', lo: 38 },
    choir: { pad: true, lo: 55 },
    bass: { bass: 'R.R.R.R.R.R.R.R.' },
    drums: { g: 'metal', crash: true, fill: 'toms' }
  };
  S.stage5 = song({
    name: 'stage5', bpm: 166, key: 'E', mode: 'minor', loopFrom: 1,
    tracks: {
      lead:  { inst: 'leadsaw', vol: 0.9, rev: 0.2, dly: 0.15, gate: 0.95 },
      harm:  { inst: 'leadsaw', vol: 0.5, pan: 0.3, rev: 0.2, gate: 0.95 },
      gtr:   { inst: 'guitar',  vol: 0.8, pan: -0.3, rev: 0.08 },
      choir: { inst: 'choir',   vol: 0.8, pan: 0.15, rev: 0.5 },
      bass:  { inst: 'bass',    vol: 0.95 },
      drums: { inst: 'drums',   vol: 0.8, rev: 0.1 }
    },
    parts: {
      I: {
        bars: 2, chords: 'Em | C D',
        gtr: { power: 'X.mmX.mmX.mmX.mm X-------X-------', lo: 38 },
        choir: { pad: true, lo: 52 },
        bass: { bass: 'R.RRR.RRR.RRR.RR R-------R-------' },
        drums: { k: 'x.xxx.xxx.xxx.xx x.......x.......', s: '....X.......X... X.......X.x.XXXX',
                 c: 'x............... x.......x.......' }
      },
      A: A, B: B,
      C: {
        bars: 4, chords: 'Em | C | Am | B',
        gtr: { power: 'mmmmX.mmmmmmX.mm', lo: 38 },
        choir: { pad: true, lo: 52 },
        bass: { bass: 'R.RRR.RRR.RRR.RR' },
        drums: { g: 'half', crash: true, fill: 'toms' }
      },
      A2: ext(A, { harm: { harm: 'lead' } }),
      B2: ext(B, { harm: { harm: 'lead' } })
    },
    order: ['I', 'A', 'B', 'C', 'A2', 'B2']
  });

  // =====================================================================
  // BOSS: C harmonic minor, tense chromatic riffs, 160 bpm
  // =====================================================================
  A = {
    bars: 8, chords: 'Cm | Cm | Ab | G | Cm | Cm | Db | G',
    lead: 'C6 - - - G5 - Eb5 - | F#5 - G5 - - - . . | Ab5 - - - C6 - Eb6 - | D6 - - - B5 - G5 - | ' +
          'C6 - - - G5 - Eb5 - | F#5 - G5 - Ab5 - B5 - | Db6 - - - Ab5 - F5 - | B5 - - - - - . .',
    gtr: { power: 'X.mmX.mmXmXmX.mm', lo: 38 },
    arp: { arp: '0121012101210121', lo: 60 },
    str: { pad: true, lo: 55 },
    bass: { bass: 'R.RRR.RRR.RRR.RR' },
    drums: { g: 'drive', crash: true, fill: 'snare' }
  };
  B = {
    bars: 8, chords: 'Ab | Bb | G | Cm | Ab | Bb | G | G',
    lead: 'Eb6 - - - C6 - Ab5 - | D6 - - - Bb5 - F5 - | B5 - - - D6 - F6 - | Eb6 - - - - - . . | ' +
          'C6 - Eb6 - C6 - Ab5 - | Bb5 - - - D6 - - - | G5 - Ab5 - B5 - D6 - | D6 - - - - - . .',
    gtr: { power: 'X-----X-X-----X-', lo: 38 },
    brass: { stab: 'x..x..x.x.......', lo: 55 },
    arp: { arp: '0123012301230123', lo: 60 },
    str: { pad: true, lo: 57 },
    bass: { bass: 'R.8.R.8.R.8.R.8.' },
    drums: { g: 'dbeat', crash: true, fill: 'toms' }
  };
  S.boss = song({
    name: 'boss', bpm: 160, key: 'C', mode: 'harmonic', loopFrom: 1,
    tracks: {
      lead:  { inst: 'leadsaw', vol: 0.85, rev: 0.2, dly: 0.15, gate: 0.95 },
      harm:  { inst: 'lead2',   vol: 0.5, pan: 0.3, rev: 0.2, gate: 0.95 },
      gtr:   { inst: 'guitar',  vol: 0.75, pan: -0.32, rev: 0.08 },
      arp:   { inst: 'pluck',   vol: 0.5, pan: 0.4, rev: 0.15, dly: 0.2 },
      str:   { inst: 'strings', vol: 0.7, pan: 0.15, rev: 0.45 },
      brass: { inst: 'brass',   vol: 0.75, pan: -0.15, rev: 0.3 },
      bass:  { inst: 'bass',    vol: 0.95 },
      drums: { inst: 'drums',   vol: 0.95, rev: 0.1 }
    },
    parts: {
      I: {
        bars: 2, chords: 'Cm | G',
        arp: { arp: '0121012101210121', lo: 60 },
        gtr: { power: '................ X-----X-X-X-X-X-', lo: 38 },
        bass: { bass: 'R.RRR.RRR.RRR.RR' },
        drums: { k: 'x...x...x...x... x...x...x...x...', s: '................ 3.4.5.6.789XXXXX' }
      },
      A: A, B: B,
      A2: ext(A, { harm: { harm: 'lead' } }),
      B2: ext(B, { harm: { harm: 'lead' }, drums: { g: 'metal', crash: true, fill: 'roll' } })
    },
    order: ['I', 'A', 'B', 'A2', 'B2']
  });

  // =====================================================================
  // FINAL BOSS: D minor epic, choir + organ + guitars + timpani
  // =====================================================================
  A = {
    bars: 8, chords: 'Dm | Bb | Gm | A | Dm | Bb | Eb | A',
    lead: 'D5 - - - A5 - - - | Bb5 - - - A5 - F5 - | G5 - - - Bb5 - D6 - | C#6 - - - A5 - - - | ' +
          'D6 - - - A5 - F5 - | D5 - - - F5 - Bb5 - | Bb5 - - - G5 - Eb5 - | E5 - - - A5 - C#6 -',
    choir: { pad: true, lo: 57 },
    organ: { arp: '0121012101210121', lo: 62 },
    gtr: { power: 'X.mmX.mmX.mmX.mm', lo: 38 },
    bass: { bass: 'R.RRR.RRR.RRR.RR' },
    drums: { g: 'drive', crash: true, fill: 'snare', ti: 'x...............' }
  };
  B = {
    bars: 8, chords: 'Bb | C | Dm | Dm | Gm | A | Bb | A',
    lead: 'D6 - - - - - C6 - | C6 - - - G5 - E5 - | F5 - - - A5 - D6 - | D6 - - - - - . . | ' +
          'D6 - - - Bb5 - G5 - | A5 - - - C#6 - E6 - | D6 - - - Bb5 - - - | C#6 - - - - - - -',
    choir: { pad: true, lo: 60 },
    organ: { arp: '0123012301230123', lo: 62 },
    brass: { stab: 'x..x..x.x.......', lo: 55 },
    gtr: { power: 'X-----X-X-----X-', lo: 38 },
    bass: { bass: 'R.8.R.8.R.8.R.8.' },
    drums: { g: 'dbeat', crash: true, fill: 'toms' }
  };
  S.finalboss = song({
    name: 'finalboss', bpm: 152, key: 'D', mode: 'minor', loopFrom: 1,
    tracks: {
      lead:  { inst: 'leadsaw', vol: 0.85, rev: 0.25, dly: 0.18, gate: 0.95 },
      harm:  { inst: 'lead2',   vol: 0.5, pan: 0.3, rev: 0.25, gate: 0.95 },
      choir: { inst: 'choir',   vol: 0.9, pan: -0.1, rev: 0.55 },
      organ: { inst: 'organ',   vol: 0.6, pan: 0.3, rev: 0.35, dly: 0.12 },
      gtr:   { inst: 'guitar',  vol: 0.75, pan: -0.32, rev: 0.08 },
      brass: { inst: 'brass',   vol: 0.8, pan: 0.15, rev: 0.35 },
      bass:  { inst: 'bass',    vol: 0.95 },
      drums: { inst: 'drums',   vol: 0.95, rev: 0.14 }
    },
    parts: {
      I: {
        bars: 4, chords: 'Dm | Bb | Gm | A',
        choir: { pad: true, lo: 57 },
        organ: { pad: true, lo: 50 },
        brass: { stab: 'x---------------', lo: 50 },
        bass: { bass: 'R---------------' },
        drums: { ti: 'x............... x............... x............... 3456789XXXXXXXXX',
                 c: 'x............... ................ ................ ................' }
      },
      A: A, B: B,
      C: {
        bars: 8, chords: 'Dm | Dm | C | C | Bb | Bb | A | A',
        lead: 'A5 - - - - - - - | F5 - - - D5 - - - | G5 - - - - - - - | E5 - - - C5 - - - | ' +
              'F5 - - - - - - - | D5 - - - Bb4 - - - | C#5 - - - E5 - - - | A5 - - - - - . .',
        harm: { harm: 'lead' },
        organ: { arp: '0123432101234321', lo: 62 },
        gtr: { power: 'x.mmx.mmx.mmx.mm', lo: 38 },
        choir: { pad: true, lo: 55 },
        bass: { bass: 'R.RRR.RRR.RRR.RR' },
        drums: { g: 'half', crash: true, fill: 'roll', ti: 'x.......x.......' }
      },
      A2: ext(A, { harm: { harm: 'lead' }, brass: { stab: 'x.......x.......', lo: 55 } }),
      B2: ext(B, { harm: { harm: 'lead' } })
    },
    order: ['I', 'A', 'B', 'C', 'A2', 'B2']
  });

  // =====================================================================
  // CLEAR: victory fanfare (non looping, ~5 s)
  // =====================================================================
  S.clear = song({
    name: 'clear', bpm: 150, key: 'C', mode: 'major', loop: false, tail: 2.5,
    tracks: {
      lead:  { inst: 'lead',    vol: 0.95, rev: 0.3, dly: 0.15 },
      harm:  { inst: 'lead2',   vol: 0.55, pan: 0.3, rev: 0.3 },
      brass: { inst: 'brass',   vol: 0.9, pan: -0.25, rev: 0.35 },
      str:   { inst: 'strings', vol: 0.8, rev: 0.45 },
      arp:   { inst: 'pluck',   vol: 0.5, pan: 0.35, rev: 0.2, dly: 0.25 },
      bass:  { inst: 'fmbass',  vol: 0.9 },
      drums: { inst: 'drums',   vol: 0.9, rev: 0.2 }
    },
    parts: {
      F: {
        bars: 3, chords: 'C | Ab Bb | C',
        lead: { res: 1, m: 'G4 . C5 . E5 . G5 - - - E5 . G5 - - - | Ab5 - - - - - Ab5 . Bb5 - - - - - Bb5 . | ' +
                           'C6 - - - - - - - - - - - - - - -' },
        harm: { harm: 'lead' },
        brass: { stab: 'x...x...x...x... x-----x.x-----x. x---------------', lo: 55 },
        str: { pad: true, lo: 55 },
        arp: { arp: '0.1.2.3.4.5.6.7. 0.1.2.3.0.1.2.3. 0123456789------', lo: 60 },
        bass: { bass: 'R...R...R...R... R-----R.R-----R. R---------------' },
        drums: { k: 'x.......x....... x.....x.x.....x. x...............',
                 s: '....x...x.x.xxxx ....x.....x.xxxx X...............',
                 c: '................ ................ X...............',
                 ti: 'x............... x.....x.x.....x. x...............' }
      }
    },
    order: ['F']
  });

  // =====================================================================
  // GAME OVER: short sad jingle (~4.3 s)
  // =====================================================================
  S.gameover = song({
    name: 'gameover', bpm: 112, key: 'A', mode: 'harmonic', loop: false, tail: 2.5,
    tracks: {
      lead:  { inst: 'lead2',   vol: 1.25, rev: 0.4, dly: 0.2, p: { vib: [5, 14, 0.2] } },
      bell:  { inst: 'bell',    vol: 0.5, pan: 0.3, rev: 0.4 },
      str:   { inst: 'strings', vol: 1.1, rev: 0.5 },
      bass:  { inst: 'fmbass',  vol: 0.8 },
      drums: { inst: 'drums',   vol: 0.7, rev: 0.3 }
    },
    parts: {
      G: {
        bars: 2, chords: 'F E7 | Am',
        lead: 'C5 - - A4 B4 - G#4 - | A4 - - - - - - -',
        bell: { copy: 'lead', semi: 12 },
        str: { pad: true, lo: 55 },
        bass: { bass: 'R-------R------- R---------------' },
        drums: { ti: 'x.......x....... x...............' }
      }
    },
    order: ['G']
  });

  // =====================================================================
  // ENDING: triumphant credits theme, G major
  // =====================================================================
  A = {
    bars: 8, chords: 'G | D/F# | Em | C | G/B | C | Am D | G',
    lead: 'B4 - - - D5 - G5 - | F#5 - - - E5 - D5 - | E5 - G5 - B5 - - - | A5 - - - G5 - E5 - | ' +
          'D5 - - - G5 - - - | G5 - - - E5 - C5 - | A5 - - - F#5 - - - | G5 - - - - - . .',
    str: { pad: true, lo: 55 },
    arp: { arp: '0.1.2.1.0.1.2.1.', lo: 60 },
    bass: { bass: 'R...R.5.R...R.5.' },
    drums: { g: 'rock', crash: true, fill: 'snare' }
  };
  B = {
    bars: 8, chords: 'C | D | Bm | Em | C | D | Eb F | G',
    lead: 'E5 - - - G5 - C6 - | A5 - - - F#5 - D5 - | D5 - F#5 - B5 - - - | B5 - - - - - G5 - | ' +
          'E5 - G5 - C6 - - - | D6 - - - C6 - A5 - | Bb5 - - - C6 - - - | B5 - - - - - - -',
    brass: { stab: 'x..x..x.........', lo: 55 },
    str: { pad: true, lo: 57 },
    arp: { arp: '0123012301230123', lo: 62 },
    bell: { arp: '0...1...2...3...', lo: 72 },
    bass: { bass: 'R.R.R.R.R.R.R.8.' },
    drums: { g: 'drive', crash: true, fill: 'toms' }
  };
  S.ending = song({
    name: 'ending', bpm: 116, key: 'G', mode: 'major',
    tracks: {
      lead:  { inst: 'lead',    vol: 0.9, rev: 0.32, dly: 0.22, gate: 0.96 },
      harm:  { inst: 'lead2',   vol: 0.5, pan: 0.3, rev: 0.3, gate: 0.96 },
      bell:  { inst: 'bell',    vol: 0.5, pan: -0.35, rev: 0.4, dly: 0.3 },
      brass: { inst: 'brass',   vol: 0.75, pan: -0.2, rev: 0.35 },
      str:   { inst: 'strings', vol: 0.85, pan: 0.15, rev: 0.5 },
      arp:   { inst: 'pluck',   vol: 0.5, pan: 0.4, rev: 0.2, dly: 0.25 },
      bass:  { inst: 'fmbass',  vol: 0.9 },
      drums: { inst: 'drums',   vol: 0.85, rev: 0.15 }
    },
    parts: {
      A: A, B: B,
      A2: ext(A, { harm: { harm: 'lead' }, bell: { arp: '0...2...1...2...', lo: 72 } }),
      B2: ext(B, { harm: { harm: 'lead' }, drums: { g: 'drive', crash: true, fill: 'roll' } })
    },
    order: ['A', 'B', 'A2', 'B2']
  });

  // =====================================================================
  // STAGE 6: STEEL CITY, F# dorian funk-rock / industrial, slap bass + anvils (150 bpm)
  // =====================================================================
  A = {
    bars: 8, chords: 'F#m7 | F#m7 B | F#m7 | D E | F#m7 | F#m7 B | D | C#7',
    lead: 'C#5 . E5 F#5 . F#5 E5 F#5 | A5 - G#5 F#5 D#5 - E5 - | C#5 . E5 F#5 . F#5 A5 B5 | C#6 - - B5 A5 - G#5 - | ' +
          'F#5 - . F#5 A5 . C#6 - | B5 - A5 F#5 D#5 - F#5 - | A5 - - - F#5 - D5 - | E#5 - G#5 - B5 - C#6 -',
    gtr: { power: 'X.mmx.m.mmx.m.x.', lo: 40 },
    arp: { arp: '0.2.1.0.2.1.0.2.', lo: 61 },
    pad: { pad: true, lo: 54 },
    bass: { bass: 'R.R8.R8.R.R8.785' },
    drums: { g: 'indus', crash: true, fill: 'snare' }
  };
  B = {
    bars: 8, chords: 'D | E | F#m | F#m | D | E | G#7 | C#7',
    lead: 'F#5 - A5 - D6 - C#6 - | B5 - - - G#5 - E5 - | A5 - - - F#5 - A5 C#6 | F#6 - - - E6 - C#6 - | ' +
          'D6 - - - A5 - F#5 A5 | B5 - - - E6 - D6 C#6 | B#5 - - - D#6 - F#6 - | E#6 - - - C#6 - - -',
    gtr: { power: 'X-----x-X-----x-', lo: 40 },
    brass: { stab: 'x..x..x.........', lo: 54 },
    arp: { arp: '0123012301230123', lo: 61 },
    pad: { pad: true, lo: 57 },
    bass: { bass: 'R.8.R.8RR.8.R.8R' },
    drums: { g: 'indus2', crash: true, fill: 'toms' }
  };
  S.stage6 = song({
    name: 'stage6', bpm: 150, key: 'F#', mode: 'dorian', loopFrom: 1,
    tracks: {
      lead:  { inst: 'leadsaw', vol: 0.85, rev: 0.2, dly: 0.16, gate: 0.92 },
      harm:  { inst: 'lead2',   vol: 0.5, pan: 0.3, rev: 0.22, dly: 0.1, gate: 0.92 },
      gtr:   { inst: 'guitar',  vol: 0.72, pan: -0.32, rev: 0.08 },
      brass: { inst: 'brass',   vol: 0.75, pan: 0.2, rev: 0.25 },
      arp:   { inst: 'pluck',   vol: 0.45, pan: 0.38, rev: 0.15, dly: 0.25 },
      pad:   { inst: 'pad',     vol: 0.7, pan: -0.15, rev: 0.4 },
      bass:  { inst: 'slap',    vol: 0.95 },
      drums: { inst: 'drums',   vol: 0.9, rev: 0.12 }
    },
    parts: {
      I: {
        bars: 2, chords: 'F#m7 | F#m7',
        bass: { bass: 'R.R8.R8.R.R8.785' },
        gtr: { power: '................ X.......X.x.X...', lo: 40 },
        drums: { an: 'x..x..x.x.x.x.x. x..x..x.x.......', h: 'xoxoxoxoxoxoxoxo', k: 'x.......x....... x.....x.x.......',
                 s: '................ ....x.x.xxXXXXXX' }
      },
      A: A, B: B,
      // breakdown: riff in unison with the slap bass, then a climb back to the main theme
      Ca: {
        bars: 4, chords: 'F#m | F#m | Em | Em',
        lead: 'F#4 - . F#4 A4 . B4 C5 | C#5 - B4 A4 F#4 - E4 F#4 | E4 - . E4 G4 . A4 A#4 | B4 - A4 G4 E4 - D4 E4',
        bass: { copy: 'lead', semi: -24 },
        gtr: { power: 'm.mmm.mmm.mmX...', lo: 40 },
        pad: { pad: true, lo: 54 },
        drums: { g: 'half', crash: true, an: 'x.....x...x...x.', cl: '........x.......' }
      },
      Cb: {
        bars: 4, chords: 'D | D | C#sus4 | C#7',
        lead: 'D5 - - - F#5 - A5 - | D6 - - - C#6 - A5 - | G#5 - - - F#5 - - - | E#5 - - - G#5 - B5 -',
        harm: { harm: 'lead' },
        gtr: { power: 'X-------X-------', lo: 40 },
        brass: { stab: 'x.......x.......', lo: 54 },
        arp: { arp: '0123012301230123', lo: 61 },
        pad: { pad: true, lo: 54 },
        bass: { bass: 'R.R8R.R8R.R8R.R8' },
        drums: { g: 'indus', crash: true, fill: 'roll' }
      },
      A2: ext(A, { harm: { harm: 'lead' } }),
      B2: ext(B, { harm: { harm: 'lead' }, drums: { g: 'indus2', crash: true, fill: 'roll' } })
    },
    order: ['I', 'A', 'B', 'Ca', 'Cb', 'A2', 'B2']
  });

  // =====================================================================
  // STAGE 7: STORM SEA, G harmonic minor, string ostinato + sweeping strings (140 bpm)
  // =====================================================================
  A = {
    bars: 8, chords: 'Gm | Eb | Cm | D | Gm | Eb | Ab | D',
    lead: 'G4 - Bb4 - D5 - - G5 | - - - - F5 Eb5 D5 Eb5 | C5 - - - Eb5 - G5 - | F#5 - - - - - D5 - | ' +
          'G5 - - - Bb5 - A5 G5 | Bb5 - - - G5 - Eb5 - | C6 - - - Bb5 - Ab5 - | A5 - - - F#5 - D5 -',
    sweep: { copy: 'lead', semi: -12, velMul: 0.9 },
    ost: { arp: '0120120120120120', lo: 55 },
    str: { pad: true, lo: 55 },
    bass: { bass: 'R..R..R.R..R..R.' },
    drums: { g: 'storm', crash: true, fill: 'toms',
             tiG: 'x............... ................ ................ ................ x............... ................ ................ ................',
             ti:  '................ ................ ................ x.....x.x....... ................ ................ ................ ................' }
  };
  B = {
    bars: 8, chords: 'Cm | D | Eb | F | Gm | Eb | Cm | D',
    lead: 'Eb5 - - - G5 - C6 - | D6 - - - A5 - F#5 - | G5 - - - Bb5 - Eb6 - | F6 - - - C6 - A5 - | ' +
          'Bb5 - - - D6 - G6 - | - - - - F6 - Eb6 - | Eb6 - D6 - C6 - Bb5 - | A5 - - - - - . .',
    harm: { harm: 'lead' },
    ost: { arp: '0120120120120120', lo: 55 },
    choir: { pad: true, lo: 55 },
    brass: { stab: 'x.....x.....x...', lo: 53 },
    bass: { bass: 'R.R.R.R.R.R.R.R.' },
    drums: { g: 'drive', crash: true, fill: 'roll' }
  };
  S.stage7 = song({
    name: 'stage7', bpm: 140, key: 'G', mode: 'harmonic', loopFrom: 1,
    tracks: {
      lead:  { inst: 'leadsaw', vol: 0.82, rev: 0.3, dly: 0.2, gate: 0.97, p: { vib: [5.4, 22, 0.16] } },
      harm:  { inst: 'lead2',   vol: 0.48, pan: 0.3, rev: 0.3, dly: 0.1, gate: 0.97 },
      sweep: { inst: 'strings', vol: 0.75, pan: -0.25, rev: 0.45 },
      bell:  { inst: 'bell',    vol: 0.85, pan: 0.15, rev: 0.45, dly: 0.3 },
      ost:   { inst: 'pluck',   vol: 0.5, pan: 0.35, rev: 0.2, dly: 0.12, p: { flt: ['lowpass', 300, 1.5, 3] } },
      str:   { inst: 'strings', vol: 0.75, pan: 0.15, rev: 0.5 },
      choir: { inst: 'choir',   vol: 0.8, pan: -0.1, rev: 0.55 },
      brass: { inst: 'brass',   vol: 0.75, pan: 0.2, rev: 0.3 },
      bass:  { inst: 'bass',    vol: 0.95 },
      drums: { inst: 'drums',   vol: 0.9, rev: 0.16 }
    },
    parts: {
      I: {
        bars: 2, chords: 'Gm | Gm',
        ost: { arp: '0120120120120120', lo: 55 },
        str: { pad: true, lo: 50 },
        drums: { tiG: 'x............... 4.4.5.5.6677889X' }
      },
      A: A, B: B,
      // the eye of the storm: bells over war drums, choir and low strings
      C: {
        bars: 8, chords: 'Gm | Ab | Gm | Ab | Eb | F | D | D',
        bell: 'D6 - - - Bb5 - G5 - | C6 - - - Ab5 - Eb5 - | D6 - - - Bb5 - G5 - | Eb6 - - - C6 - Ab5 - | ' +
              'G5 - - - Bb5 - Eb6 - | F6 - - - C6 - A5 - | F#6 - - - D6 - A5 - | C6 - - - A5 - F#5 -',
        ost: { arp: '0.1.2.1.0.1.2.1.', lo: 55 },
        choir: { pad: true, lo: 55 },
        str: { pad: true, lo: 50 },
        bass: { bass: 'R.......R.....R.' },
        drums: { k: 'x.........x.....', tb: 'x.....x...x.....', t3: '..............xx', sh: 'x.x.x.x.x.x.x.x.', crash: true,
                 tiG: 'x............... ................ x............... ................ x............... ................ ................ ................',
                 fill: { k: 'x.......x.......', s: '4.4.5.5.6677889X', ti: 'x.....x.x.x.xxxX' } }
      },
      A2: ext(A, { harm: { harm: 'lead' } })
    },
    order: ['I', 'A', 'B', 'C', 'A2']
  });

  // =====================================================================
  // STAGE 8: ALPINE FORTRESS, E dorian, horn theme + timpani gallop (145 bpm)
  // =====================================================================
  A = {
    bars: 8, chords: 'Em | A | G | D | C | A | Bsus4 | B',
    lead: 'B4 - - E5 - - F#5 G5 | A5 - - - C#6 - B5 A5 | G5 - - D5 - - G5 A5 | F#5 - - - - - . . | ' +
          'G5 - - C6 - - B5 C6 | C#6 - - - E6 - - C#6 | E6 - - - B5 - A5 F#5 | B5 - - - D#6 - - -',
    brass: { stab: 'x..x..x.........', lo: 55 },
    str: { pad: true, lo: 55 },
    bass: { bass: 'R..R..R.R.R.R.8.' },
    drums: { g: 'gallop', crash: true, fill: 'snare',
             tiE: 'x............... ................ ................ ................ ................ ................ ................ ................',
             tiB: '................ ................ ................ ................ ................ ................ x.....x.x....... ................' }
  };
  B = {
    bars: 8, chords: 'C | D | Bm | Em | C | D | E | E',
    lead: 'E6 - - - D6 - C6 - | D6 - - - A5 - F#5 - | B5 - - - D6 - F#6 - | E6 - - - - - B5 - | ' +
          'C6 - - - E6 - G6 - | F#6 - - - E6 - D6 - | E6 - - - B5 - G#5 - | B5 - - - - - . .',
    harm: { harm: 'lead' },
    brass: { stab: 'x..x..x.x..x..x.', lo: 55 },
    str: { pad: true, lo: 57 },
    glock: { arp: '0123012301230123', lo: 67 },
    bass: { bass: 'R.R.R.R.R.R.R.8.' },
    drums: { g: 'rock16', crash: true, fill: 'toms',
             tiE: '................ ................ ................ x............... ................ ................ x.....x.x....... ................' }
  };
  S.stage8 = song({
    name: 'stage8', bpm: 145, key: 'E', mode: 'dorian', loopFrom: 1,
    tracks: {
      lead:  { inst: 'horn',    vol: 0.95, rev: 0.3, dly: 0.15, gate: 0.95, trans: -12 },
      harm:  { inst: 'horn',    vol: 0.55, pan: 0.3, rev: 0.32, gate: 0.95, trans: -12 },
      flute: { inst: 'flute',   vol: 0.8, pan: -0.15, rev: 0.32, dly: 0.25, gate: 0.95 },
      brass: { inst: 'brass',   vol: 0.75, pan: -0.25, rev: 0.32 },
      str:   { inst: 'strings', vol: 0.75, pan: 0.15, rev: 0.45 },
      glock: { inst: 'glock',   vol: 0.5, pan: 0.35, rev: 0.35, dly: 0.25 },
      bass:  { inst: 'bass',    vol: 0.9 },
      drums: { inst: 'drums',   vol: 0.9, rev: 0.15 }
    },
    parts: {
      I: {
        bars: 2, chords: 'Em | C D',
        brass: { stab: 'x.xx..x.X------- x-------X-------', lo: 55 },
        str: { pad: true, lo: 55 },
        bass: { bass: 'R.RR..R.R------- R-------R-------' },
        drums: { tiE: 'x.xx..x.x....... ................', tiC: '................ x...............', ti: '................ ........x.......',
                 s: '................ ........4567889X', c: 'x............... ................' }
      },
      A: A, B: B,
      // castle march: flute tune with the dorian major sixth, timpani on E and A
      C: {
        bars: 8, chords: 'Em | A | Em | A | Em | A | C | D',
        flute: 'E5 - G5 - B5 - A5 G5 | C#6 - - - B5 - A5 - | G5 - E5 - B4 - E5 G5 | F#5 - - - E5 - C#5 - | ' +
               'E5 - G5 - B5 - D6 - | C#6 - - - E6 - C#6 - | C6 - B5 - G5 - E5 - | F#5 - - - A5 - D6 -',
        glock: { arp: '0.1.2.1.3.2.1.2.', lo: 64 },
        str: { pad: true, lo: 55 },
        bass: { bass: 'R...R.5.R...R.5.' },
        drums: { g: 'march', crash: true, fill: 'roll', tiE: 'x............... ................', tih: '................ x...............' }
      },
      A2: ext(A, { harm: { harm: 'lead' }, flute: { copy: 'lead', velMul: 0.6 } })
    },
    order: ['I', 'A', 'B', 'C', 'A2']
  });

  // =====================================================================
  // STAGE 9: STRATOSPHERE, A minor, soaring 3+3+2 theme over the clouds (165 bpm)
  // =====================================================================
  A = {
    bars: 8, chords: 'Am | F | C | G | Dm | F | E | E',
    lead: 'A5 - - E6 - - D6 - | C6 - - B5 - - A5 - | G5 - - E6 - - D6 - | B5 - - - - - . . | ' +
          'A5 - - F6 - - E6 - | D6 - - C6 - - A5 - | B5 - - - - - G#5 - | E5 - G#5 - B5 - D6 -',
    gtr: { power: 'X.mX.mX.X.mX.mX.', lo: 40 },
    arp: { arp: '0123432101234321', lo: 64 },
    str: { pad: true, lo: 57 },
    bass: { bass: 'R8R8R8R8R8R8R8R8' },
    drums: { g: 'rush', crash: true, fill: 'snare' }
  };
  B = {
    bars: 8, chords: 'F | G | Em | Am | Dm | G | C | E',
    lead: 'A5 - - - C6 - F6 - | E6 - - - D6 - B5 - | B5 - - - E6 - G6 - | E6 - - - C6 - A5 - | ' +
          'F5 - - - A5 - D6 - | B5 - - - D6 - G6 - | G6 - - - E6 - C6 - | D6 - - - B5 - G#5 -',
    gtr: { power: 'X-----X-X-----X-', lo: 40 },
    choir: { pad: true, lo: 57 },
    brass: { stab: 'x..x..x.........', lo: 55 },
    arp: { arp: '0123012301230123', lo: 67 },
    bass: { bass: 'R.RRR.RRR.RRR.RR' },
    drums: { g: 'dbeat', crash: true, fill: 'toms' }
  };
  S.stage9 = song({
    name: 'stage9', bpm: 165, key: 'A', mode: 'minor', loopFrom: 1,
    tracks: {
      lead:  { inst: 'leadsaw', vol: 0.88, rev: 0.25, dly: 0.2, gate: 0.96, p: { glide: 0.06, vib: [6, 22, 0.15] } },
      harm:  { inst: 'lead2',   vol: 0.5, pan: 0.3, rev: 0.25, dly: 0.1, gate: 0.96 },
      gtr:   { inst: 'guitar',  vol: 0.72, pan: -0.32, rev: 0.08 },
      arp:   { inst: 'pluck',   vol: 0.45, pan: 0.38, rev: 0.15, dly: 0.2 },
      str:   { inst: 'strings', vol: 0.7, pan: 0.12, rev: 0.45 },
      choir: { inst: 'choir',   vol: 0.75, pan: -0.12, rev: 0.5 },
      brass: { inst: 'brass',   vol: 0.75, pan: 0.2, rev: 0.3 },
      bass:  { inst: 'fmbass',  vol: 0.95 },
      drums: { inst: 'drums',   vol: 0.9, rev: 0.12 }
    },
    parts: {
      I: {
        bars: 2, chords: 'Am | F G',
        arp: { arp: '0123456701234567 0123456712345678', lo: 52 },
        str: { pad: true, lo: 57 },
        bass: { bass: 'R.R.R.R.R.R.R.R.' },
        drums: { k: 'x...x...x...x...', s: '................ ....x...x.x.xxxx', rd: 'x.x.x.x.x.x.x.x.' }
      },
      A: A, B: B,
      // the climb: borrowed D minor colour, then E major pulls back to the theme
      C: {
        bars: 8, chords: 'Bb | C | Dm | Dm | Bb | C | E | E',
        lead: 'F5 - - - Bb5 - D6 - | E6 - - - D6 - C6 - | D6 - - - - - A5 - | F6 - - - E6 - D6 - | ' +
              'D6 - - - C6 - Bb5 - | C6 - - - E6 - G6 - | G#5 - - - B5 - D6 - | E6 - - - - - . .',
        harm: { harm: 'lead' },
        gtr: { power: 'mmmmX.mmmmmmX.mm', lo: 40 },
        str: { pad: true, lo: 57 },
        arp: { arp: '0123432101234321', lo: 62 },
        bass: { bass: 'R.RRR.RRR.RRR.RR' },
        drums: { g: 'half', crash: true, fill: 'roll', rd: 'x.x.x.x.x.x.x.x.' }
      },
      A2: ext(A, { harm: { harm: 'lead' }, drums: { g: 'dbeat', crash: true, fill: 'snare' } }),
      B2: ext(B, { harm: { harm: 'lead' }, drums: { g: 'metal', crash: true, fill: 'roll' } })
    },
    order: ['I', 'A', 'B', 'C', 'A2', 'B2']
  });

  // =====================================================================
  // LAST BOSS: the Sky Emperor. B harmonic minor, 176 bpm, choir + organ + guitars,
  // chorale breakdown that modulates up to C minor, then back home through C# and F#
  // =====================================================================
  A = {
    bars: 8, chords: 'Bm | G | Em | F# | Bm | G | C | F#',
    lead: 'B5 - - A#5 B5 - F#5 - | G5 - - F#5 G5 - D5 - | E5 - G5 - B5 - E6 - | C#6 - - - A#5 - F#5 - | ' +
          'B5 - - A#5 B5 - D6 - | D6 - - C#6 D6 - B5 - | E6 - - - C6 - G5 - | F#5 - A#5 - C#6 - E6 -',
    choir: { pad: true, lo: 54 },
    organ: { arp: '0213021302130213', lo: 59 },
    gtr: { power: 'X.mmX.mmX.mmXmXm', lo: 38 },
    bass: { bass: 'R.R.R.R.R.R.R.RR' },
    drums: { g: 'metal', crash: true, fill: 'snare',
             tiB: 'x............... ................ ................ ................ x............... ................ ................ ................',
             tiF: '................ ................ ................ x.....x.x....... ................ ................ ................ ................' }
  };
  B = {
    bars: 8, chords: 'Em | A | D | G | C | F# | Bm | F#',
    lead: 'G5 - - - B5 - E6 - | E6 - - - C#6 - A5 - | F#6 - - - - - D6 - | D6 - - - B5 - G5 - | ' +
          'G5 - - - C6 - E6 - | F#6 - - - E6 - C#6 - | D6 - - - B5 - F#5 - | A#5 - - - - - . .',
    harm: { harm: 'lead' },
    choir: { pad: true, lo: 57 },
    organ: { arp: '0123012301230123', lo: 62 },
    brass: { stab: 'x..x..x.x..x..x.', lo: 54 },
    gtr: { power: 'X-----X-X-----X-', lo: 38 },
    bass: { bass: 'R.8.R.8.R.8.R.8.' },
    drums: { g: 'dbeat', crash: true, fill: 'toms' }
  };
  S.lastboss = song({
    name: 'lastboss', bpm: 176, key: 'B', mode: 'harmonic', loopFrom: 1,
    tracks: {
      lead:  { inst: 'leadsaw', vol: 0.85, rev: 0.25, dly: 0.16, gate: 0.95, p: { vib: [6.5, 24, 0.14], glide: 0.06 } },
      harm:  { inst: 'lead2',   vol: 0.5, pan: 0.3, rev: 0.25, gate: 0.95 },
      choir: { inst: 'choir',   vol: 0.9, pan: -0.12, rev: 0.55 },
      organ: { inst: 'organ',   vol: 0.6, pan: 0.3, rev: 0.35, dly: 0.1 },
      gtr:   { inst: 'guitar',  vol: 0.75, pan: -0.32, rev: 0.08 },
      brass: { inst: 'brass',   vol: 0.8, pan: 0.15, rev: 0.35 },
      bass:  { inst: 'bass',    vol: 0.95 },
      drums: { inst: 'drums',   vol: 0.95, rev: 0.14 }
    },
    parts: {
      I: {
        bars: 4, chords: 'Bm | G | Em | F#',
        choir: { pad: true, lo: 54 },
        organ: { pad: true, lo: 47 },
        bass: { bass: 'R---------------' },
        brass: { stab: '................ ................ ................ x.x.x.x.X-------', lo: 54 },
        drums: { tiB: 'x............... ................ ................ ................',
                 tiG: '................ x............... ................ ................',
                 tiE: '................ ................ x............... ................',
                 tiF: '................ ................ ................ x.x.x.x.3456789X',
                 c:   'x............... ................ ................ ................' }
      },
      A: A, B: B,
      C: {
        bars: 8, chords: 'Bm | Bm/A | G | F# | Em | C | Ab | G',
        lead: '. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | ' +
              'B4 - E5 - G5 - B5 - | C6 - - - - - G5 - | Ab5 - C6 - Eb6 - - - | D6 - - - F6 - B5 -',
        organ: { arp: '0123432101234321', lo: 59 },
        choir: { pad: true, lo: 54 },
        brass: { stab: '................ ................ ................ ................ x-------x------- x-------x------- x-------x------- x-------x-------', lo: 50 },
        gtr: { power: '................ ................ ................ ................ x.mmx.mmx.mmx.mm x.mmx.mmx.mmx.mm X.mmX.mmX.mmX.mm X.mmX.mmXmXmXmXm', lo: 38 },
        bass: { bass: 'R-------R-------' },
        drums: {
          k:   'x.........x..... x.........x..... x.........x..... x.........x..... x.......x.x..... x.......x.x..... x.x.x.x.x.x.x.x. ................',
          s:   '........x....... ........x....... ........x....... ........x....... ....x.......x... ....x.......x... ....x.......x... ................',
          h:   'x.x.x.x.x.x.x.x.',
          tiB: 'x............... x............... ................ ................ ................ ................ ................ ................',
          tiG: '................ ................ x............... ................ ................ ................ ................ ................',
          tiF: '................ ................ ................ x.....x.x....... ................ ................ ................ ................',
          tiE: '................ ................ ................ ................ x............... ................ ................ ................',
          tiC: '................ ................ ................ ................ ................ x............... ................ ................',
          c:   '................ ................ ................ ................ x............... ................ ................ ................',
          fill: { k: 'x.......x.......', s: '4.4.5.5.6677889X', tiG: 'x.....x.x.x.xxxX' }
        }
      },
      // the main theme a half step higher (C minor); Db (= C#) and F# lead back to B minor
      D: {
        bars: 8, chords: 'Cm | Ab | Fm | G | Cm | Ab | Db | F#',
        lead: 'C6 - - B5 C6 - G5 - | Ab5 - - G5 Ab5 - Eb5 - | F5 - Ab5 - C6 - F6 - | D6 - - - B5 - G5 - | ' +
              'C6 - - B5 C6 - Eb6 - | Eb6 - - D6 Eb6 - C6 - | F6 - - - Db6 - Ab5 - | F#5 - A#5 - C#6 - E6 -',
        harm: { copy: 'lead', semi: -12, velMul: 0.9 },
        choir: { pad: true, lo: 55 },
        organ: { arp: '0213021302130213', lo: 60 },
        brass: { stab: 'x.......x.......', lo: 55 },
        gtr: { power: 'X.mmX.mmX.mmXmXm', lo: 38 },
        bass: { bass: 'R.R.R.R.R.R.R.RR' },
        drums: { g: 'metal', crash: true, fill: 'roll',
                 tiC: 'x............... x............... x............... ................ x............... x............... ................ ................',
                 tiG: '................ ................ ................ x.....x.x....... ................ ................ ................ ................' }
      },
      B2: ext(B, { brass: { stab: 'X..x..x.X..x..x.', lo: 54 }, drums: { g: 'metal', crash: true, fill: 'roll' } })
    },
    order: ['I', 'A', 'B', 'C', 'D', 'B2']
  });

  // =====================================================================
  // BONUS: Mode 7 bonus stage, Bb major, bouncy and bright (160 bpm)
  // =====================================================================
  A = {
    bars: 8, chords: 'Bbmaj7 | Gm7 | Ebmaj7 | F | Bbmaj7 | Gm7 | Cm7 F7 | Bb',
    lead: 'D5 F5 . Bb5 - A5 . F5 | G5 - - F5 G5 . Bb5 . | G5 Bb5 . Eb6 - D6 . Bb5 | C6 - - A5 - . F5 . | ' +
          'D5 F5 . Bb5 - A5 . F5 | G5 - - Bb5 D6 . F6 . | Eb6 - D6 C6 A5 - C6 . | Bb5 - D6 . Bb5 . . .',
    skank: { stab: '..x...x...x...x.', lo: 60 },
    pad: { pad: true, lo: 57 },
    bass: { bass: 'R.8.R.8.R.8.R.8.' },
    drums: { g: 'bounce', crash: true, fill: 'snare' }
  };
  S.bonus = song({
    name: 'bonus', bpm: 160, key: 'Bb', mode: 'major', loopFrom: 1,
    tracks: {
      lead:  { inst: 'lead2',   vol: 0.95, pan: 0.05, rev: 0.2, dly: 0.22, gate: 0.75 },
      sing:  { inst: 'lead',    vol: 0.9, rev: 0.25, dly: 0.2, gate: 0.96 },
      harm:  { inst: 'lead2',   vol: 0.5, pan: 0.32, rev: 0.22, gate: 0.75 },
      mar:   { inst: 'marimba', vol: 0.85, pan: -0.25, rev: 0.2, dly: 0.15 },
      glock: { inst: 'glock',   vol: 0.5, pan: 0.38, rev: 0.3, dly: 0.25 },
      skank: { inst: 'pluck',   vol: 0.5, pan: -0.35, rev: 0.15 },
      pad:   { inst: 'pad',     vol: 0.65, pan: 0.2, rev: 0.4 },
      bass:  { inst: 'fmbass',  vol: 0.95 },
      drums: { inst: 'drums',   vol: 0.85, rev: 0.12 }
    },
    parts: {
      I: {
        bars: 2, chords: 'Bb | F',
        glock: { arp: '0123456701234567 0123456789------', lo: 53 },
        bass: { bass: 'R...R...R...R... R...R...R.R.R.R.' },
        drums: { k: 'x.......x....... x...x...x...x...', cl: '....x.......x... ....x.......x.xx', s: '................ ........4.6.8.XX' }
      },
      A: A,
      B: {
        bars: 8, chords: 'Ebmaj7 | Dm7 | Cm7 | F7 | Ebmaj7 | Dm7 | Gm7 C7 | F7',
        sing: 'G5 - - - Bb5 - D6 - | C6 - - - A5 - F5 - | Eb5 - G5 - Bb5 - D6 - | C6 - - - - - . . | ' +
              'G5 - - - Bb5 - Eb6 - | F6 - - - D6 - A5 - | Bb5 - - - G5 - E5 - | F5 - A5 - C6 - Eb6 -',
        glock: { arp: '0.1.2.3.2.1.2.3.', lo: 72 },
        skank: { stab: '..x...x...x...x.', lo: 60 },
        pad: { pad: true, lo: 57 },
        bass: { bass: 'R.8.5.8.R.8.5.8.' },
        drums: { g: 'funk', crash: true, fill: 'toms', cl: '....x.......x...' }
      },
      // call and response: marimba doubled an octave up by the square lead
      C: {
        bars: 8, chords: 'Gm7 | C7 | Cm7 | F7 | Gm7 | C7 | Ebmaj7 F | F7',
        mar: 'D5 . Bb4 . G4 . Bb4 D5 | E5 . C5 . G4 . Bb4 C5 | Eb5 . C5 . G4 . Bb4 C5 | A4 - - C5 - - Eb5 - | ' +
             'D5 . Bb4 . G4 . Bb4 D5 | E5 . C5 . G4 . Bb4 C5 | D5 - C5 - Bb4 - A4 - | C5 - - - - - . .',
        lead: { copy: 'mar', semi: 12, velMul: 0.7 },
        skank: { stab: '..x...x...x...x.', lo: 60 },
        pad: { pad: true, lo: 57 },
        bass: { bass: 'R.8.R.8.R.8.R.8.' },
        drums: { g: 'bounce', crash: true, fill: 'roll', cg: '..x.xx...x.x.xx.' }
      },
      A2: ext(A, { harm: { harm: 'lead' }, glock: { arp: '0...1...2...3...', lo: 74 } })
    },
    order: ['I', 'A', 'B', 'C', 'A2']
  });

  // =====================================================================
  // SUPPLY: docking at the repair fortress, warm ascending jingle (non looping, ~3 s)
  // =====================================================================
  S.supply = song({
    name: 'supply', bpm: 160, key: 'F', mode: 'major', loop: false, tail: 2.5,
    tracks: {
      lead:  { inst: 'flute',   vol: 0.95, rev: 0.35, dly: 0.2 },
      bell:  { inst: 'bell',    vol: 0.45, pan: 0.3, rev: 0.4 },
      harp:  { inst: 'pluck',   vol: 0.55, pan: -0.3, rev: 0.3, dly: 0.2 },
      str:   { inst: 'strings', vol: 0.9, rev: 0.5 },
      bass:  { inst: 'fmbass',  vol: 0.8 },
      drums: { inst: 'drums',   vol: 0.6, rev: 0.3 }
    },
    parts: {
      R: {
        bars: 2, chords: 'Bb C | F',
        lead: { res: 1, m: 'D5 . F5 . Bb5 - - - E5 . G5 . C6 - - - | A5 - - - C6 - - - F6 - - - - - - -' },
        bell: { copy: 'lead', velMul: 0.7 },
        harp: { arp: '0123456701234567 0123456789------', lo: 53 },
        str: { pad: true, lo: 53 },
        bass: { bass: 'R-------R------- R---------------' },
        drums: { sh: 'x.x.x.x.x.x.x.x. x...............', c: '................ 5...............' }
      }
    },
    order: ['R']
  });

  Object.defineProperty(S, '_warnings', { value: warnings, enumerable: false });
  return S;
})();
