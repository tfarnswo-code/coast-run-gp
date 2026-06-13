// Coast Run GP — data layer: canvas, constants, tracks, themes, bikes, sounds.
// Plain scripts share top-level bindings; load order is data -> audio -> sprites -> main.

const cv = document.getElementById('gp'), cx = cv.getContext('2d');
const W = cv.width, H = cv.height;

// Pseudo-3D road constants
const segLen = 200, roadW = 2200, camH = 1050;
const camD = 1 / Math.tan(50 * Math.PI / 180);
const drawN = 140;
const playerZ = camH * camD;

const maxSpeed = 12000, accel = 5200, brakeF = 10500, grassMax = 4200;

// Cliff rock palette (shared by Big Sir and Mystery coast zones)
const RKA = '#8c7355', RKB = '#7d6549', RIM = '#a89070';

const lerp = (a, b, t) => a + (b - a) * t;

// Deterministic bumpy profile used for mountains, skylines, stars
const MP = [];
for (let k = 0; k < 48; k++) MP.push(Math.abs(Math.sin(k * 12.9898 + 4.14)) * 0.7 + Math.abs(Math.sin(k * 5.3)) * 0.3);

// Rival rider colors
const colors = ['#378ADD', '#1D9E75', '#BA7517', '#7F77DD', '#D4537E', '#5F5E5A', '#639922', '#185FA5', '#993C1D', '#534AB7', '#0F6E56', '#993556'];

// Current course state
let segs = [], N = 0, trackLen = 0, T = null, sel = 0;
// Render-only road furniture, set per course in buildCourse():
// gateSeg = checkered start/finish arch; startGateSeg = a second arch you blast
// under at GO on p2p courses; signAt = { segIndex: label } roadside boards
// (finish countdown on p2p, oncoming-zone warning). None of these collide.
let gateSeg = 0, startGateSeg = -1, signAt = {};

function addRoad(e, h, l, c) {
  for (let i = 0; i < e; i++) segs.push({ curve: c * Math.pow(i / e, 2) });
  for (let i = 0; i < h; i++) segs.push({ curve: c });
  for (let i = 0; i < l; i++) segs.push({ curve: c * Math.pow(1 - i / l, 2) });
}

// Long continuous dirt stretches in a single lane (skips hairpins and cliff zones)
function dirtRuns(count, minLen, maxLen) {
  for (let r = 0; r < count; r++) {
    const start = Math.floor(N * (r + 0.5) / count) + (r * 37 % 50);
    const len = minLen + ((r * 53) % (maxLen - minLen + 1));
    const lane = ((r % 3) - 1) * 0.5;
    for (let k = 0; k < len; k++) {
      const s = segs[(start + k) % N];
      if (Math.abs(s.curve) < 5 && !s.hz && !s.clf && !s.clfR) s.hz = { t: 'dirt', o: lane };
    }
  }
}

// Full-width dirt: BOTH lanes gone — w is the half-width used for collision and
// rendering, wide enough that there is no clean line through (Baja Apocalypse).
function dirtRunsAll(count, minLen, maxLen) {
  for (let r = 0; r < count; r++) {
    const start = Math.floor(N * (r + 0.5) / count) + (r * 41 % 60);
    const len = minLen + ((r * 59) % (maxLen - minLen + 1));
    for (let k = 0; k < len; k++) {
      const s = segs[(start + k) % N];
      if (Math.abs(s.curve) < 5 && !s.hz && !s.clf && !s.clfR) s.hz = { t: 'dirt', o: 0, w: 1.15 };
    }
  }
}

// Squirrels: forest-only road critter (tier 2/3 courses). Static like a pothole —
// running one over kicks the bars but never crashes you. Stored as an animal so it
// renders in the sprite pass; collision special-cases the type.
function squirrels(mod) {
  for (let i = 0; i < N; i++) {
    const s = segs[i];
    if (i % mod === Math.floor(mod / 2) && Math.abs(s.curve) < 5 && !s.animal && !s.hz)
      s.animal = { t: 'squir', o: ((i * 17) % 3 - 1) * 0.5, hit: false };
  }
}

// ============ The Mystery roll ============
// ONE roll per race, every component independent, held for the whole run — so you
// get deer in the desert, cactus among the pines, lamps in the scrub, razorback
// cliffs in a downpour. A given combination may not come up again for a long time.
// Shared by Mystery Run (day) and Midnight Mystery (night).
function mysteryDec(th, night) {
  const r = Math.random;
  // terrain: forest green / desert sand / coastal scrub / city pavement
  const G = night
    ? [['#2E4434', '#283D2F'], ['#4A4032', '#443B2E'], ['#3A4030', '#343A2B'], ['#23262c', '#1f2228']]
    : [['#6AAE4E', '#5F9F45'], ['#D9BC85', '#CFB279'], ['#A3AD6E', '#98A263'], ['#63666d', '#5d6066']];
  const gi = Math.floor(r() * 4);
  const city = gi === 3;
  // cliffs: none 50% / left 20% / right 15% / BOTH (razorback) 15%
  const cr = r();
  const cL = (cr > 0.5 && cr <= 0.7) || cr > 0.85;
  const cR = cr > 0.7;
  // scenery: a primary set, plus a 35% chance a second set crashes the party
  const SETS = ['forest', 'desert', 'rocks', 'lamps'];
  const prim = city ? 'lamps' : SETS[Math.floor(r() * 3)];
  let intr = r() < 0.35 ? SETS[Math.floor(r() * SETS.length)] : null;
  if (intr === prim) intr = null;
  // weather + road character (reset EVERY roll — these stick on the theme object)
  th.rain = r() < 0.5;
  th.oncoming = r() < 0.3 ? 0.5 : 0;
  // animals: independent of terrain/scenery — none / deer / cows / (rarely) both.
  // EXCEPT with oncoming traffic (Tim's rule: never both — it's just too much).
  // Squirrels are soft (never crash you) so they're allowed to stay.
  const av = r();
  const deer = !th.oncoming && ((av > 0.3 && av <= 0.62) || av > 0.92);
  const cows = !th.oncoming && av > 0.62;
  const squir = (prim === 'forest' || intr === 'forest') && r() < 0.5;
  th.taxi = city;
  th.rA = city ? '#4a4d54' : null; th.rB = city ? '#45484e' : null; th.lane = city ? '#d8c84a' : null;
  th.sunR = night ? 22 : (th.rain ? 0 : 28);   // rainy days lose the sun; the moon stays out
  if (th.rain && !night) th.sky = '#5E6B78';
  // two-way rolls run LIGHT (Tim: heavy traffic makes the oncoming lane unusable for passing)
  if (th.oncoming) th.traf = Math.min(th.traf || 10, 7);
  const potMod = city ? 29 : [41, 67, 89][Math.floor(r() * 3)];
  th.mysteryBiome = ['forest', 'desert', 'scrub', 'city'][gi] + '/' + prim + (intr ? '+' + intr : '')
    + (cL && cR ? '/razorback' : cL ? '/cliffL' : cR ? '/cliffR' : '')
    + (th.rain ? '/rain' : '') + (th.oncoming ? '/oncoming' : '');
  for (let i = 0; i < N; i++) {
    const s = segs[i];
    s.cA = G[gi][0]; s.cB = G[gi][1];
    if (night) s.dirtC = 'rgba(60,48,35,0.9)';
    s.clf = cL; s.clfR = cR;
    // scenery keeps to solid ground: away from a cliff edge, nowhere on a razorback
    const side = (cL && cR) ? 0 : cL ? 1 : cR ? -1 : (i % 2 ? 1 : -1);
    if (side !== 0) {
      const o = side * (1.6 + (i * 7 % 8) / 5);
      const o2 = side * (2.2 + (i * 3 % 6) / 4);
      const set = (intr && i % 5 === 2) ? intr : prim;
      if (set === 'forest') {
        if (i % 11 === 3) s.spr = { t: forestTree(i), o: o };
        else if (i % 13 === 0) s.spr = { t: 'bush', o: o2 };
      } else if (set === 'desert') {
        if (i % 9 === 4) s.spr = { t: desertCactus(i), o: o };
        else if (i % 7 === 1) s.spr = { t: 'shrub', o: o2 };
      } else if (set === 'rocks') {
        if (i % 9 === 2) s.spr = { t: (i % 18 === 2) ? 'pine' : 'rock', o: o };
      } else if (i % 7 === 2) s.spr = { t: 'lamp', o: side * 1.35 };
    }
    if (Math.abs(s.curve) < 5 && i % potMod === 9) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
    if (deer && i % 181 === 40 && Math.abs(s.curve) < 4) s.animal = { t: 'deer', o: ((i * 13) % 3 - 1) * 0.5, hit: false };
    if (cows && !s.animal && i % 197 === 70 && Math.abs(s.curve) < 4) s.animal = { t: 'cow', o: ((i * 13) % 3 - 1) * 0.5, hit: false };
  }
  if (!cL && !cR && !city) dirtRuns(2 + Math.floor(r() * 3), 24, 55);
  if (squir) squirrels(199);
}

// --- Track geometry builders (shared between base tracks and hard variants) ---
function upBuild() {
  addRoad(0, 80, 0, 0); addRoad(40, 60, 40, 3); addRoad(0, 30, 0, 0); addRoad(40, 70, 40, -6);
  addRoad(0, 30, 0, 0); addRoad(40, 60, 40, 5); addRoad(25, 30, 25, -4); addRoad(25, 30, 25, 4);
  addRoad(0, 60, 0, 0); addRoad(40, 80, 40, 6.5); addRoad(0, 40, 0, 0); addRoad(50, 80, 50, -3);
  addRoad(35, 60, 35, -6); addRoad(0, 50, 0, 0); addRoad(40, 70, 40, 4); addRoad(0, 90, 0, 0);
}
function bsBuild() {
  addRoad(0, 40, 0, 0); addRoad(30, 40, 30, -4); addRoad(20, 30, 20, 3); addRoad(30, 50, 30, 5);
  addRoad(0, 20, 0, 0); addRoad(35, 50, 35, -6); addRoad(25, 35, 25, 4.5); addRoad(30, 40, 30, 6);
  addRoad(0, 30, 0, 0); addRoad(35, 55, 35, -5); addRoad(25, 30, 25, 3.5); addRoad(30, 45, 30, -6.5);
  addRoad(0, 25, 0, 0); addRoad(30, 40, 30, 5.5); addRoad(25, 35, 25, -4); addRoad(30, 40, 30, 6);
  addRoad(0, 40, 0, 0);
}
function bjBuild() {
  addRoad(0, 120, 0, 0); addRoad(40, 60, 40, 2.5); addRoad(0, 100, 0, 0); addRoad(50, 70, 50, -4);
  addRoad(0, 80, 0, 0); addRoad(40, 60, 40, 5); addRoad(0, 60, 0, 0); addRoad(30, 40, 30, -3);
  addRoad(0, 120, 0, 0); addRoad(40, 80, 40, -5.5); addRoad(0, 70, 0, 0); addRoad(50, 60, 50, 3);
  addRoad(0, 100, 0, 0);
}

// --- Decorators: hazards, scenery, wildlife (deerMod etc. control density) ---
// Forest tree mix: pine / tall pine / round tree / broad oak, varied by index
function forestTree(i) {
  if (i % 26 === 5 || i % 14 === 0) return (i % 3 === 0) ? 'pine2' : 'pine';
  return (i % 3 === 1) ? 'oak' : 'tree';
}
// Desert cactus mix: classic saguaro / tall many-armed / squat barrel
function desertCactus(i) {
  return (i % 3 === 0) ? 'cactus2' : (i % 7 === 2) ? 'barrel' : 'cactus';
}
function upDec(deerMod) {
  for (let i = 0; i < N; i++) {
    const s = segs[i];
    if (i % 13 === 5) s.spr = { t: forestTree(i), o: (i % 2 ? 1 : -1) * (1.55 + (i * 7 % 6) / 6) };
    else if (i % 7 === 0) s.spr = { t: forestTree(i), o: (i % 2 ? 1 : -1) * (2.5 + (i * 7 % 10) / 4) };
    else if (i % 11 === 0) s.spr = { t: 'bush', o: (i % 2 ? -1 : 1) * (2.1 + (i * 3 % 6) / 4) };
    if (Math.abs(s.curve) < 5 && i % 89 === 17) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
    if (i % deerMod === Math.floor(deerMod / 3) && Math.abs(s.curve) < 4) s.animal = { t: 'deer', o: ((i * 13) % 3 - 1) * 0.5, hit: false };
  }
  dirtRuns(3, 22, 34);
}
function bsDec() {
  for (let i = 0; i < N; i++) {
    const s = segs[i];
    if (i % 9 === 2) s.spr = { t: (i % 18 === 2) ? 'pine' : 'tree', o: 1.7 + (i * 5 % 8) / 5 };
    else if (i % 17 === 5) s.spr = { t: 'rock', o: 1.5 + (i * 3 % 5) / 5 };
    if (Math.abs(s.curve) < 5 && i % 127 === 40) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
  }
}
// Bigger Sir: the cliff is on the RIGHT, so all the scenery lives on the LEFT
function bsDecR() {
  for (let i = 0; i < N; i++) {
    const s = segs[i];
    if (i % 9 === 2) s.spr = { t: (i % 18 === 2) ? 'pine' : 'tree', o: -(1.7 + (i * 5 % 8) / 5) };
    else if (i % 17 === 5) s.spr = { t: 'rock', o: -(1.5 + (i * 3 % 5) / 5) };
    if (Math.abs(s.curve) < 5 && i % 127 === 40) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
  }
}
function bjDec(potMod, cowMod, runs, maxRun) {
  for (let i = 0; i < N; i++) {
    const s = segs[i];
    if (i % 9 === 4) s.spr = { t: desertCactus(i), o: (i % 2 ? 1 : -1) * (1.5 + (i * 7 % 7) / 6) };
    else if (i % 13 === 6) s.spr = { t: 'rock', o: (i % 2 ? -1 : 1) * (1.6 + (i * 5 % 6) / 5) };
    else if (i % 7 === 1) s.spr = { t: 'shrub', o: (i % 2 ? 1 : -1) * (2.0 + (i * 3 % 6) / 4) };
    if (Math.abs(s.curve) < 5 && i % potMod === 9 % potMod) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
    if (i % cowMod === Math.floor(cowMod / 3) && Math.abs(s.curve) < 4) s.animal = { t: 'cow', o: ((i * 13) % 3 - 1) * 0.5, hit: false };
  }
  dirtRuns(runs, 28, maxRun);
}

// --- Course catalog. Indices 0-3 unlocked from the start; 4-7 are podium rewards. ---
const THEMES = [
  // rivalMul below the tier-1 default (1.04): the only course the nerfed CB $450
  // can podium — see the progression rule on the bike catalog.
  { name: 'Upstate Run', d1: 'Forest hills · balanced', d2: 'Dirt, potholes and deer',
    sky: '#7EC4E8', mtFar: '#A9BCC7', mtNear: '#7F97A3', ridge: '#7FAE82', gA: '#6AAE4E', gB: '#5F9F45',
    dirt: 'rgba(128,95,60,0.85)', cliff: false, hA1: 2800, hA2: 900, hF1: 8, hF2: 18, sunR: 28, rivalMul: 0.96,
    build: upBuild, dec: function () { upDec(353); } },
  { name: 'Big Sir', d1: 'Pacific cliffs · very twisty', d2: 'Off the left edge is fatal',
    sky: '#9AD1EC', mtFar: '#B9A98C', mtNear: '#8E8270', ridge: null, gA: '#A3AD6E', gB: '#98A263',
    dirt: 'rgba(128,95,60,0.85)', cliff: true, hA1: 4800, hA2: 1400, hF1: 10, hF2: 22, sunR: 28, rivalMul: 1.092,  // +5% rivals (Tim, June 12): 1.04 default ×1.05
    build: bsBuild, dec: bsDec },
  { name: 'Baja', d1: 'Open desert · fast straights', d2: 'Dirt everywhere · stray cattle',
    sky: '#AFD8EC', mtFar: '#C7A57E', mtNear: '#A57F54', ridge: '#D8B97F', gA: '#D9BC85', gB: '#CFB279',
    dirt: 'rgba(110,80,48,0.9)', cliff: false, hA1: 2600, hA2: 700, hF1: 6, hF2: 16, sunR: 34, rivalMul: 1.092,  // +5% rivals (Tim, June 12): 1.04 default ×1.05
    build: bjBuild, dec: function () { bjDec(37, 367, 9, 55); } },
  { name: 'Neon City', d1: 'Urban night run', d2: 'Taxis, manholes, lampposts',
    sky: '#0f1322', mtFar: '#1b2030', mtNear: '#141823', ridge: null, gA: '#2a2d33', gB: '#26292e',
    dirt: 'rgba(128,95,60,0.85)', cliff: false, hA1: 900, hA2: 300, hF1: 6, hF2: 16, sunR: 22, night: true, taxi: true, traf: 18, rivalMul: 1.092,  // +5% rivals (Tim, June 12): 1.04 default ×1.05
    rA: '#4a4d54', rB: '#45484e', lane: '#d8c84a',
    build: function () {
      addRoad(0, 90, 0, 0); addRoad(30, 50, 30, 2.5); addRoad(0, 60, 0, 0); addRoad(35, 45, 35, -3.5);
      addRoad(0, 50, 0, 0); addRoad(25, 30, 25, 4); addRoad(25, 30, 25, -4); addRoad(0, 80, 0, 0);
      addRoad(40, 60, 40, -2.5); addRoad(0, 40, 0, 0); addRoad(30, 40, 30, 5); addRoad(0, 70, 0, 0);
      addRoad(35, 50, 35, 3); addRoad(0, 90, 0, 0);
    },
    dec: function () {
      for (let i = 0; i < N; i++) {
        const s = segs[i];
        if (i % 7 === 2) s.spr = { t: 'lamp', o: (i % 14 === 2 ? -1.35 : 1.35) };
        if (Math.abs(s.curve) < 5 && i % 29 === 5) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
      }
    } },
  { name: 'Upstate Stampede', d1: 'The deer own it now', d2: 'An absurd number of deer',
    sky: '#8FCBE0', mtFar: '#A9BCC7', mtNear: '#7F97A3', ridge: '#7FAE82', gA: '#6AAE4E', gB: '#5F9F45',
    dirt: 'rgba(128,95,60,0.85)', cliff: false, hA1: 2800, hA2: 900, hF1: 8, hF2: 18, sunR: 28, lock: true, rivalMul: 1.155,  // +5% rivals (Tim, June 12): 1.1 tier-2 default ×1.05
    build: upBuild, dec: function () { upDec(53); squirrels(151); } },
  // cliffR: the fatal drop is on the RIGHT edge — and half the traffic comes at you
  { name: 'Bigger Sir', d1: 'Two-way on the cliffs', d2: 'The drop is on YOUR side now',
    sky: '#9AD1EC', mtFar: '#B9A98C', mtNear: '#8E8270', ridge: null, gA: '#A3AD6E', gB: '#98A263',
    // Tim's tune (June 12): ~half the previous total, cut asymmetrically — oncoming
    // down 75% (oncFrac 0.25 of traf 4 ≈ 1) and same-direction down 25% (≈ 3).
    // Still unfinishable without cheats (Tim, June 12 round 4) — oncGap 2 doubles
    // the respawn gap so the recycled oncoming car returns half as often, and
    // rivalMul 1.0 (under the tier-2 1.1, ×0.92 two-way = 0.92 effective) because
    // wait-and-dart costs the player laps and the rivals must feel it too.
    dirt: 'rgba(128,95,60,0.85)', cliff: false, cliffR: true, hA1: 4800, hA2: 1400, hF1: 10, hF2: 22, sunR: 28, lock: true, oncoming: 0.5, traf: 4, oncFrac: 0.25, oncGap: 2, rivalMul: 0.9,  // −10% rivals (Tim, June 12): 1.0 → 0.9; ×0.92 two-way ⇒ 0.828 effective
    build: bsBuild, dec: bsDecR },
  // Inherited the old Apocalypse surface treatment (Tim's call): whole-road dirt,
  // pothole minefields, cows — scaled down to a tier-2 lap.
  { name: 'Baja Inferno', d1: 'The road has given up', d2: 'Both lanes dirt · minefields',
    sky: '#EFC9A0', mtFar: '#C7A57E', mtNear: '#A57F54', ridge: '#D8B97F', gA: '#D9BC85', gB: '#CFB279',
    dirt: 'rgba(110,80,48,0.9)', cliff: false, hA1: 2600, hA2: 700, hF1: 6, hF2: 16, sunR: 36, lock: true,
    build: bjBuild, dec: function () {
      for (let i = 0; i < N; i++) {
        const s = segs[i];
        if (i % 9 === 4) s.spr = { t: desertCactus(i), o: (i % 2 ? 1 : -1) * (1.5 + (i * 7 % 7) / 6) };
        else if (i % 13 === 6) s.spr = { t: 'rock', o: (i % 2 ? -1 : 1) * (1.6 + (i * 5 % 6) / 5) };
        else if (i % 7 === 1) s.spr = { t: 'shrub', o: (i % 2 ? 1 : -1) * (2.0 + (i * 3 % 6) / 4) };
        if (i % 173 === 57 && Math.abs(s.curve) < 4) s.animal = { t: 'cow', o: ((i * 13) % 3 - 1) * 0.5, hit: false };
      }
      for (let i = 0; i < N; i++) {
        const s = segs[i];
        if ((i + 320) % 601 < 12 && Math.abs(s.curve) < 5 && !s.hz && !s.animal) s.hz = { t: 'pot', o: ((i * 7) % 3 - 1) * 0.5 };
        else if (Math.abs(s.curve) < 5 && i % 47 === 9 && !s.hz) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
      }
      dirtRunsAll(3, 24, 50);
      dirtRuns(5, 26, 55);
    } },
  { name: 'Mystery Run', d1: 'Different every time', d2: 'Read the road · choose wisely',
    sky: '#7EC4E8', mtFar: '#A9BCC7', mtNear: '#7F97A3', ridge: null, gA: '#6AAE4E', gB: '#5F9F45',
    dirt: 'rgba(128,95,60,0.85)', cliff: false, hA1: 2500, hA2: 800, hF1: 8, hF2: 18, sunR: 28, lock: true, mystery: true,
    build: function () {
      const r = Math.random;
      this.sky = ['#7EC4E8', '#AFD8EC', '#F2CFA0', '#9AD1EC'][Math.floor(r() * 4)];
      this.hA1 = 1300 + r() * 3300; this.hA2 = 400 + r() * 1000;
      this.hF1 = [6, 8, 10][Math.floor(r() * 3)]; this.hF2 = [16, 18, 22][Math.floor(r() * 3)];
      this.traf = 7 + Math.floor(r() * 8);
      while (segs.length < 1700) {
        if (r() < 0.38) addRoad(0, Math.floor(30 + r() * 80), 0, 0);
        else { const c = (r() < 0.5 ? -1 : 1) * (2 + r() * 4.5); const e = Math.floor(25 + r() * 20); addRoad(e, Math.floor(30 + r() * 50), e, c); }
      }
      addRoad(0, 60, 0, 0);
    },
    dec: function () { mysteryDec(this, false); } },
  // --- Tier 3: Epic Runs — point-to-point, no laps. Indices 8+. ---
  { name: 'Salt Flats', d1: 'Long straights · let er rip', d2: 'Light traffic · pure speed',
    sky: '#BFE3F2', mtFar: '#A99BB5', mtNear: '#8B7E99', ridge: null, gA: '#E6E0CE', gB: '#DED8C4',
    dirt: 'rgba(150,130,95,0.7)', cliff: false, hA1: 350, hA2: 120, hF1: 6, hF2: 14, sunR: 36,
    lock: true, epic: true, p2p: true, traf: 18, rivalMul: 1.71,   // −10% rivals (Tim, June 12): 1.9 → 1.71
    build: function () {
      // Epic-length flat-out run (~2x a tier-1 race) — huge straights, gentle sweepers
      addRoad(0, 300, 0, 0);
      for (let k = 0; k < 16; k++) {
        addRoad(60, 150 + (k * 37 % 120), 60, (k % 2 ? -1 : 1) * (1.5 + (k * 5 % 3) * 0.5));
        addRoad(0, 280 + (k * 53 % 260), 0, 0);
      }
      addRoad(0, 200, 0, 0);
    },
    dec: function () {
      for (let i = 0; i < N; i++) {
        const s = segs[i];
        if (i % 23 === 4) s.spr = { t: 'rock', o: (i % 2 ? 1 : -1) * (1.8 + (i * 5 % 6) / 5) };
        else if (i % 17 === 8) s.spr = { t: 'shrub', o: (i % 2 ? -1 : 1) * (2.2 + (i * 3 % 6) / 4) };
        if (Math.abs(s.curve) < 5 && i % 223 === 60) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
      }
    } },
  // A real mountain climb: `climb` adds a steady net elevation gain on top of the
  // rollers, and the hairpins are the tightest in the game. Crest jumps removed
  // (they read as random — the T.jumps flag + launch code stay in the engine).
  // Hill steepness = amplitude x frequency / length: Tim wanted this HILLIER than
  // Big Sir (peak grade ~185 units/seg) — these numbers land ~220 plus the climb.
  { name: 'Escape from Lodi', d1: 'The mountain climb', d2: 'Twistiest road in the game',
    sky: '#8FD0E8', mtFar: '#A9BCC7', mtNear: '#7F97A3', ridge: '#7FAE82', gA: '#7CB85A', gB: '#70AC50',
    dirt: 'rgba(128,95,60,0.85)', cliff: false, hA1: 9500, hA2: 4200, hF1: 16, hF2: 80, sunR: 28, climb: 60000,
    lock: true, epic: true, p2p: true, oncoming: 0.5, traf: 6,
    build: function () {
      // Relentless alternating hairpins, sharper than anything else, fewer breathers
      addRoad(0, 120, 0, 0);
      for (let k = 0; k < 52; k++) {
        addRoad(25, 50 + (k * 13 % 40), 25, (k % 2 ? -1 : 1) * (5 + (k * 7 % 6)));
        if (k % 4 === 3) addRoad(0, 40 + (k * 11 % 50), 0, 0);
      }
      addRoad(0, 100, 0, 0);
    },
    dec: function () {
      for (let i = 0; i < N; i++) {
        const s = segs[i];
        if (i % 13 === 5) s.spr = { t: forestTree(i), o: (i % 2 ? 1 : -1) * (1.6 + (i * 7 % 6) / 6) };
        else if (i % 11 === 0) s.spr = { t: 'bush', o: (i % 2 ? -1 : 1) * (2.1 + (i * 3 % 6) / 4) };
        if (Math.abs(s.curve) < 5 && i % 89 === 17) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
        // no deer here — Tim's rule: oncoming traffic and animals never mix
      }
      dirtRuns(6, 20, 30);
      squirrels(173);
    } },
  { name: 'Wrong Way Express', d1: 'It ALL comes at you', d2: 'Both lanes oncoming · open road',
    sky: '#BCD6E8', mtFar: '#9BA8B5', mtNear: '#7C8A99', ridge: '#79976C', gA: '#6E8F5A', gB: '#648251',
    dirt: 'rgba(120,100,70,0.7)', cliff: false, hA1: 520, hA2: 160, hF1: 6, hF2: 12, sunR: 32,
    lock: true, epic: true, p2p: true, oncoming: 0.5, allOnc: true, traf: 10, oncGap: 8, rivalMul: 1.366, trafStart: 0.02, trafSpan: 0.5,   // Tim, June 12: ALL traffic oncoming across BOTH lanes (a third traffic mode) — easy terrain, but every car is head-on. rivalMul 1.366 → 1.257 effective (+12% vs default, ×0.92 two-way still applies). To adjust feel: RAISE traf = more traffic, LOWER = less; LOWER oncGap = tighter cadence.
    build: function () {
      // The gauntlet runs LONG now — sweepers and straights, traffic never stops coming
      addRoad(0, 220, 0, 0);
      for (let k = 0; k < 22; k++) {
        addRoad(45 + (k % 2) * 5, 130 + (k * 31 % 60), 45 + (k % 2) * 5, (k % 2 ? -1 : 1) * (2 + (k * 7 % 4) * 0.5));
        addRoad(0, 180 + (k * 43 % 110), 0, 0);
      }
      addRoad(0, 170, 0, 0);
    },
    dec: function () {
      for (let i = 0; i < N; i++) {
        const s = segs[i];
        if (i % 19 === 4) s.spr = { t: (i % 38 === 4) ? 'pine' : 'tree', o: (i % 2 ? 1 : -1) * (1.9 + (i * 7 % 6) / 6) };
        else if (i % 13 === 0) s.spr = { t: 'bush', o: (i % 2 ? -1 : 1) * (2.2 + (i * 3 % 6) / 4) };
        if (Math.abs(s.curve) < 5 && i % 211 === 70) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
      }
    } },
  // Redesigned to Tim's spec (June 12): ~50% dirt / 50% asphalt in long alternating
  // stretches (dirt runs straight through the twists — that's the wild ride),
  // Big-Sir-grade twist AND hills, an oncoming lane with LIGHT traffic, cows and
  // pothole minefields like before. The old all-dirt design moved to Baja Inferno.
  // Hills cranked past Big Sir grade (Tim: "MORE hilly than Big Sur" — the old
  // numbers worked out to about HALF Big Sir's per-segment steepness).
  { name: 'Baja Apocalypse', d1: 'Half dirt · all chaos', d2: 'Twisty, hilly, a wild ride',
    sky: '#E8B98A', mtFar: '#C7A57E', mtNear: '#A57F54', ridge: '#D8B97F', gA: '#D9BC85', gB: '#CFB279',
    dirt: 'rgba(110,80,48,0.9)', cliff: false, hA1: 7000, hA2: 3400, hF1: 29, hF2: 76, sunR: 38,
    lock: true, epic: true, p2p: true, oncoming: 0.5, traf: 8, rivalMul: 1.342,  // +10% rivals (Tim, June 12): 1.22 default ×1.1 → ×0.92 two-way ⇒ 1.235 effective. Traffic NOT bumped — recycling keeps these lanes populated (measured ~183-seg with-flow gap)
    build: function () {
      // Big-Sir twist on what's left of the desert road
      addRoad(0, 140, 0, 0);
      for (let k = 0; k < 38; k++) {
        addRoad(30, 70 + (k * 19 % 50), 30, (k % 2 ? -1 : 1) * (4 + (k * 7 % 5) * 0.6));
        if (k % 3 === 2) addRoad(0, 60 + (k * 23 % 60), 0, 0);
      }
      addRoad(0, 120, 0, 0);
    },
    dec: function () {
      for (let i = 0; i < N; i++) {
        const s = segs[i];
        if (i % 9 === 4) s.spr = { t: desertCactus(i), o: (i % 2 ? 1 : -1) * (1.5 + (i * 7 % 7) / 6) };
        else if (i % 13 === 6) s.spr = { t: 'rock', o: (i % 2 ? -1 : 1) * (1.6 + (i * 5 % 6) / 5) };
        else if (i % 7 === 1) s.spr = { t: 'shrub', o: (i % 2 ? 1 : -1) * (2.0 + (i * 3 % 6) / 4) };
        // no cows here — Tim's rule: oncoming traffic and animals never mix
        // ~50/50 surface: two overlapping sine waves give organic dirt/asphalt blocks
        // (~100-400 segs each) that never settle into a rhythm. Full road width, and
        // it does NOT skip curves — dirt mid-hairpin is the point. Start line clean.
        const u = Math.sin(i * 0.0145) + 0.6 * Math.sin(i * 0.0043 + 1.7);
        if (u > 0 && i > 200) s.hz = { t: 'dirt', o: 0, w: 1.15 };
      }
      // Pothole MINEFIELDS on the asphalt halves: every ~600 segs, a 12-seg cluster
      // packed across all three lanes — no clean line, only the least-bad one.
      for (let i = 0; i < N; i++) {
        const s = segs[i];
        if (s.hz) continue;
        if ((i + 320) % 601 < 12 && Math.abs(s.curve) < 5 && !s.animal) s.hz = { t: 'pot', o: ((i * 7) % 3 - 1) * 0.5 };   // +320 phase keeps the start line clean
        else if (Math.abs(s.curve) < 5 && i % 47 === 9) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
      }
    } },
  { name: 'The School Run', d1: 'School zone — buses everywhere', d2: 'Mind the crossing guards!',
    sky: '#9CCFE8', mtFar: '#A9BCC7', mtNear: '#8AA0AC', ridge: '#7FAE82', gA: '#7CB85A', gB: '#70AC50',
    dirt: 'rgba(128,95,60,0.8)', cliff: false, hA1: 600, hA2: 200, hF1: 6, hF2: 14, sunR: 30,
    // traf 20 -> 13 (Tim, June 12: "It's insane") — still bus-heavy, now passable
    lock: true, epic: true, p2p: true, school: true, oncoming: 0.5, traf: 13,
    build: function () {
      // A LONG school zone — the whole district, apparently
      addRoad(0, 220, 0, 0);
      for (let k = 0; k < 18; k++) {
        addRoad(40 + (k % 2) * 5, 110 + (k * 23 % 50), 40 + (k % 2) * 5, (k % 2 ? -1 : 1) * (2 + (k * 5 % 3) * 0.5));
        addRoad(0, 190 + (k * 37 % 90), 0, 0);
      }
      addRoad(0, 190, 0, 0);
    },
    dec: function () {
      for (let i = 0; i < N; i++) {
        const s = segs[i];
        if (i % 9 === 2) s.spr = { t: 'lamp', o: (i % 18 === 2 ? -1.35 : 1.35) };
        else if (i % 17 === 6) s.spr = { t: 'tree', o: (i % 2 ? 1 : -1) * (2.0 + (i * 7 % 6) / 6) };
        else if (i % 13 === 0) s.spr = { t: 'bush', o: (i % 2 ? -1 : 1) * (2.2 + (i * 3 % 6) / 4) };
        if (Math.abs(s.curve) < 5 && i % 199 === 80) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
        // crossing guards holding STOP signs — static hazard, hit = crash
        if (i % 157 === 50 && Math.abs(s.curve) < 4) s.animal = { t: 'guard', o: ((i * 7) % 3 - 1) * 0.45, hit: false };
      }
    } },
  { name: 'Midnight Mystery', d1: 'A random road in the dark', d2: 'Different every time · night',
    sky: '#1B2233', mtFar: '#2A3346', mtNear: '#1E2535', ridge: null, gA: '#2E4434', gB: '#283D2F',
    dirt: 'rgba(60,48,35,0.9)', cliff: false, hA1: 2200, hA2: 700, hF1: 8, hF2: 18, sunR: 22,
    lock: true, epic: true, p2p: true, night: true, mystery: true,
    build: function () {
      const r = Math.random;
      this.sky = ['#1B2233', '#232B3D', '#161D2B'][Math.floor(r() * 3)];
      this.hA1 = 1200 + r() * 2600; this.hA2 = 400 + r() * 900;
      this.hF1 = [6, 8, 10][Math.floor(r() * 3)]; this.hF2 = [16, 18, 22][Math.floor(r() * 3)];
      this.traf = 16 + Math.floor(r() * 10);
      while (segs.length < 9000) {
        if (r() < 0.38) addRoad(0, Math.floor(30 + r() * 80), 0, 0);
        else { const c = (r() < 0.5 ? -1 : 1) * (2 + r() * 4.5); const e = Math.floor(25 + r() * 20); addRoad(e, Math.floor(30 + r() * 50), e, c); }
      }
      addRoad(0, 60, 0, 0);
    },
    dec: function () { mysteryDec(this, true); } },
  // The namesake finale — forest -> cliffs -> desert -> night city in one long run.
  // coastrun flag drives the sky transition in render(). MUST stay last in THEMES
  // (track rewards unlock in index order, and this is the last unlock).
  // Final Boss tuning (Tim, June 12): more traffic, explicitly fast rivals
  // (rivalMul above the 1.22 tier-3 default), and an oncoming-traffic leg through
  // the desert via oncZone — with-flow traffic merges right inside the zone, a
  // warning sign marks the start, and the zone has no animals (Tim's rule).
  { name: 'The Coast Run', d1: 'Forest · cliffs · desert · city', d2: 'The namesake. The finale.',
    sky: '#8FD0E8', mtFar: '#9A8FA8', mtNear: '#7A7088', ridge: null, gA: '#6AAE4E', gB: '#5F9F45',
    dirt: 'rgba(110,80,48,0.9)', cliff: false, hA1: 1900, hA2: 650, hF1: 10, hF2: 22, sunR: 30,
    lock: true, epic: true, p2p: true, coastrun: true, traf: 150, rivalMul: 1.656, trafStart: 0.03, trafSpan: 0.94, oncZone: [0.52, 0.76],  // Tim, June 12: +20% rivals (1.38→1.656) & far more with-flow traffic. This is a long p2p with NO with-flow recycle, so it needs a high count + early start, or the lanes read empty (measured 833-seg gap at traf 44)
    build: function () {
      // The finale runs ~3x a tier-1 race. Zone sizes roughly track the dec()
      // fractions below (0.26 / 0.52 / 0.76).
      // forest: twisty
      for (let k = 0; k < 12; k++) { addRoad(0, 120 + (k * 31 % 60), 0, 0); addRoad(40, 100 + (k * 17 % 50), 40, (k % 2 ? -1 : 1) * (3 + (k * 7 % 4) * 0.5)); }
      // cliffs: the storm leg — Big-Sir twist, exposed, relentless (rain hits here too)
      for (let k = 0; k < 16; k++) { addRoad(0, 55 + (k * 23 % 50), 0, 0); addRoad(30, 90 + (k * 19 % 50), 30, (k % 2 ? 1 : -1) * (4.2 + (k * 5 % 5) * 0.6)); }
      // desert: fast and open
      for (let k = 0; k < 7; k++) { addRoad(0, 240 + (k * 41 % 120), 0, 0); addRoad(60, 150 + (k * 23 % 60), 60, (k % 2 ? -1 : 1) * (2 + (k * 3 % 2) * 0.5)); }
      // night city: gentle, lamp-lit, then the run home
      for (let k = 0; k < 9; k++) { addRoad(40, 100 + (k * 13 % 40), 40, (k % 2 ? -1 : 1) * (2 + (k * 7 % 3) * 0.5)); addRoad(0, 170 + (k * 31 % 80), 0, 0); }
      addRoad(0, 230, 0, 0);
    },
    dec: function () {
      for (let i = 0; i < N; i++) {
        const s = segs[i]; const f = i / N;
        if (f < 0.26) { // forest
          s.cA = '#6AAE4E'; s.cB = '#5F9F45';
          if (i % 11 === 3) s.spr = { t: forestTree(i), o: (i % 2 ? 1 : -1) * (1.6 + (i * 7 % 6) / 6) };
          else if (i % 13 === 0) s.spr = { t: 'bush', o: (i % 2 ? -1 : 1) * (2.1 + (i * 3 % 6) / 4) };
          if (Math.abs(s.curve) < 5 && i % 97 === 20) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
          if (i % 211 === 60 && Math.abs(s.curve) < 4) s.animal = { t: 'deer', o: ((i * 13) % 3 - 1) * 0.5, hit: false };
          else if (i % 227 === 80 && Math.abs(s.curve) < 5 && !s.hz) s.animal = { t: 'squir', o: ((i * 17) % 3 - 1) * 0.5, hit: false };
        } else if (f < 0.52) { // cliffs — fatal on the left, hills cranked to Big Sir grade
          s.cA = '#A3AD6E'; s.cB = '#98A263'; s.clf = true;
          if (i % 9 === 2) s.spr = { t: 'pine', o: 1.7 + (i * 5 % 8) / 5 };
          else if (i % 17 === 5) s.spr = { t: 'rock', o: 1.5 + (i * 3 % 5) / 5 };
          if (Math.abs(s.curve) < 5 && i % 113 === 30) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
        } else if (f < 0.76) { // desert — the oncoming-traffic leg, so NO cows here
          s.cA = '#D9BC85'; s.cB = '#CFB279';
          if (i % 9 === 4) s.spr = { t: desertCactus(i), o: (i % 2 ? 1 : -1) * (1.5 + (i * 7 % 7) / 6) };
          else if (i % 13 === 6) s.spr = { t: 'rock', o: (i % 2 ? -1 : 1) * (1.6 + (i * 5 % 6) / 5) };
          if (Math.abs(s.curve) < 5 && i % 53 === 9) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
        } else { // night city
          s.cA = '#34394A'; s.cB = '#2E3342';
          if (i % 7 === 2) s.spr = { t: 'lamp', o: (i % 14 === 2 ? -1.35 : 1.35) };
          if (Math.abs(s.curve) < 5 && i % 73 === 15) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
        }
      }
      // The cliffs leg climbs and dives: amplify the base hills up to Big-Sir grade,
      // ramping smoothly in and out so the road stays continuous at the zone edges.
      // (Both endpoints of a segment use the same formula, so y stays seamless.)
      const amp = f2 => (f2 < 0.26 || f2 > 0.52) ? 1 : 1 + 1.6 * Math.sin((f2 - 0.26) / 0.26 * Math.PI);
      for (let i = 0; i < N; i++) { const s = segs[i]; s.y1 *= amp(i / N); s.y2 *= amp((i + 1) / N); }
    } }
];

function buildCourse(c) {
  segs = []; T = THEMES[c]; T.build();
  N = segs.length; trackLen = N * segLen;
  // T.climb (p2p only): a steady net elevation gain on top of the rollers —
  // Escape from Lodi's mountain ascent. Loop tracks must not use it (seam jump).
  const hy = i => Math.sin(i / N * Math.PI * T.hF1) * T.hA1 + Math.sin(i / N * Math.PI * T.hF2) * T.hA2 + (T.climb ? T.climb * (i / N) : 0);
  for (let i = 0; i < N; i++) {
    const s = segs[i];
    s.y1 = hy(i); s.y2 = hy(i + 1);
    // Per-segment terrain defaults (Mystery's dec() overrides these per biome zone)
    s.cA = T.gA; s.cB = T.gB; s.dirtC = T.dirt; s.clf = T.cliff; s.clfR = T.cliffR || false;
  }
  T.dec();
  // Start/finish furniture. Loops: one arch at the start/finish line, crossed every
  // lap. P2p: an arch right after the start, the finish arch where finishRace()
  // fires (N-160), and mile-countdown boards so the end never sneaks up on you.
  signAt = {};
  if (T.p2p) {
    gateSeg = N - 160; startGateSeg = 6;
    const mi = Math.round(UPM / segLen);
    if (gateSeg - mi > 0) signAt[gateSeg - mi] = '1 MILE';
    if (gateSeg - Math.round(mi / 2) > 0) signAt[gateSeg - Math.round(mi / 2)] = '1/2 MILE';
  } else { gateSeg = 0; startGateSeg = -1; }
  if (T.oncZone) signAt[Math.max(0, Math.round(N * T.oncZone[0]) - 100)] = 'ONCOMING!';
}

// --- Bike catalog. ts/ac/br/hd are multipliers; hz = hazard tolerance 0-1;
// tough scales crash recovery time; armor = free crashes absorbed per race. ---
const BIKES = [
  // Progression rule (Tim, June 12): the starter bike can podium Upstate Run and
  // NOTHING else — every later course should need a garage upgrade. Nerfed ts/ac
  // accordingly; Upstate Run got its own lower rivalMul to stay winnable on it.
  { name: 'CB $450', kind: 'cafe', tier: 1, col: '#9AA7B0', col2: '#8B5A2B', snd: 'cafe', ts: 0.87, ac: 0.87, br: 1, hd: 1, hz: 0.5, tough: 0.5, armor: 0,
    bars: [0.42, 0.42, 0.55, 0.5, 0.5, 0.55], fl: "It's cool because it's your first bike" },
  { name: "Cousin Earle's Bike", kind: 'enduro', tier: 1, col: '#97C459', col2: '#F2F2F2', snd: 'enduro', ts: 0.88, ac: 1.05, br: 1.25, hd: 1.3, hz: 0.95, tough: 0.6, armor: 0,
    bars: [0.6, 0.42, 0.85, 0.55, 0.95, 0.85], fl: "He wouldn't mind" },
  { name: 'NipponButa', kind: 'hog', tier: 1, col: '#2C2C2A', col2: '#EF9F27', snd: 'hog', ts: 1.08, ac: 0.82, br: 0.9, hd: 0.85, hz: 0.75, tough: 0.9, armor: 1,
    bars: [0.4, 0.7, 0.45, 0.95, 0.75, 0.4], fl: "No, it's not really a Harley..." },
  { name: 'XYZ567', kind: 'rice', tier: 1, col: '#5DCAA5', col2: '#7F77DD', snd: 'rice', ts: 1.15, ac: 1.2, br: 1.05, hd: 1.2, hz: 0.15, tough: 0.15, armor: 0,
    bars: [0.85, 0.9, 0.6, 0.1, 0.15, 0.8], fl: "Hope you're an organ donor" },
  { name: 'Pretty Good Bike', kind: 'cafe', tier: 2, col: '#993556', col2: '#FAC775', snd: 'cafe', ts: 1.06, ac: 1.09, br: 1.16, hd: 1.13, hz: 0.65, tough: 0.65, armor: 0,
    bars: [0.68, 0.68, 0.74, 0.65, 0.65, 0.74], fl: 'Great way to spend your student loan money' },
  { name: "Uncle Mo's Bike", kind: 'enduro', tier: 2, col: '#EF9F27', col2: '#1c1c22', snd: 'enduro', ts: 0.92, ac: 1.09, br: 1.35, hd: 1.4, hz: 0.95, tough: 0.65, armor: 0,
    bars: [0.64, 0.45, 0.95, 0.6, 0.95, 0.95], fl: "He don't need it in there anyhow" },
  { name: 'Real Hog', kind: 'hog', tier: 2, col: '#1c1c22', col2: '#b9bdc4', snd: 'hog', ts: 1.07, ac: 0.87, br: 0.95, hd: 0.9, hz: 0.85, tough: 0.95, armor: 2,
    bars: [0.45, 0.7, 0.5, 1, 0.85, 0.45], fl: 'nothin beats a hawg' },
  { name: 'CPA999', kind: 'rice', tier: 2, col: '#7F77DD', col2: '#FAC775', snd: 'rice', ts: 1.22, ac: 1.3, br: 1.1, hd: 1.3, hz: 0.2, tough: 0.2, armor: 0,
    bars: [0.95, 1, 0.65, 0.15, 0.2, 0.9], fl: 'Barely street legal' },
  // --- Tier 3: gimmick machines. sp = special on SPACE ---
  // Base stats are Duke-level by design (Tim: "should ALREADY be maxed") — and then
  // YIKES! mode (Space) QUADRUPLES top speed, arriving almost instantly (main.js).
  { name: 'Electrode', kind: 'volt', tier: 3, col: '#E8EAF0', col2: '#4DD8E8', snd: 'volt', ts: 1.3, ac: 1.36, br: 1.1, hd: 1.15, hz: 0.3, tough: 0.4, armor: 0, sp: 'boost',
    bars: [1, 1, 0.65, 0.25, 0.3, 0.75], fl: "We're goin to Mars!" },
  { name: "Ewan MacGregor's Bike", kind: 'dakar', tier: 3, col: '#2E6FB8', col2: '#E24B4A', snd: 'enduro', ts: 1.0, ac: 1.1, br: 1.25, hd: 1.25, hz: 0.95, tough: 0.8, armor: 0, sp: 'jump',
    bars: [0.65, 0.6, 0.85, 0.7, 1, 0.85], fl: "He won't miss it" },
  // The Police bike is a Superbike underneath (fast, fragile) — the siren clears the
  // road so all that speed is survivable. sp: 'siren' parts traffic (incl. oncoming).
  { name: 'Chippy', kind: 'police', tier: 3, col: '#E8EAF0', col2: '#1c1c22', snd: 'rice', ts: 1.21, ac: 1.29, br: 1.14, hd: 1.34, hz: 0.24, tough: 0.22, armor: 0, sp: 'siren',  // ts/ac −1 notch (Tim, June 12): 1.25→1.21, 1.33→1.29
    bars: [0.95, 0.95, 0.72, 0.22, 0.25, 0.95], fl: 'Protect and Serve!' },
  // noPot: potholes can't kick it. The survival machine — you won't podium, you WILL finish.
  { name: 'Third Wheel', kind: 'trike', tier: 3, col: '#7A2638', col2: '#E8D9A8', snd: 'hog', ts: 0.93, ac: 0.78, br: 0.92, hd: 0.55, hz: 0.9, tough: 1, armor: 3, noPot: true,
    bars: [0.38, 0.5, 0.4, 1, 0.9, 0.2], fl: "it's not a tricycle! It's a Hog!" },
  { name: 'Vespa', kind: 'vespa', tier: 3, col: '#8FD4CC', col2: '#F4F4F0', snd: 'vespa', ts: 0.62, ac: 0.95, br: 1.6, hd: 1.45, hz: 0.45, tough: 0.6, armor: 0,
    bars: [0.3, 0.05, 1, 0.5, 0.45, 0.95], fl: 'La Dolce Vita!' },
  // The reward for beating the game — always the LAST tier-3 unlock (bikePoolNow
  // holds it back until every other bike is owned). Max everything, near-max terrain,
  // medium durability. Replaced the Dune Buggy (old saves drop it on load).
  { name: 'The Duke', kind: 'duke', tier: 3, col: '#D2382E', col2: '#1c1c22', snd: 'duke', ts: 1.3, ac: 1.36, br: 1.45, hd: 1.45, hz: 0.85, tough: 0.55, armor: 0,
    bars: [1, 1, 1, 0.55, 0.85, 1], fl: 'Oh. Yeah.' },
  // sp 'steam': boiler pressure — hold throttle and speed climbs without limit;
  // any braking or crash dumps the boiler to zero. Builds FAST now (main.js).
  { name: 'Steampunk', kind: 'steam', tier: 3, col: '#B08D4A', col2: '#6E4A33', snd: 'steam', ts: 1.02, ac: 0.88, br: 1.05, hd: 0.9, hz: 0.55, tough: 0.75, armor: 1, sp: 'steam',
    bars: [0.5, 1, 0.55, 0.7, 0.5, 0.55], fl: 'Stoke the boiler. Never brake.' }
];

// Engine voices: f0 base Hz, fr rev range, fg per-gear bump, r2 second-osc ratio,
// flt lowpass Hz, t1/t2 oscillator types, chug = slow amplitude lope (the hog)
const SND = {
  cafe:   { f0: 62, fr: 150, fg: 12, r2: 1.5,  flt: 820,  t1: 'sawtooth', t2: 'square',   chug: 0 },
  hog:    { f0: 36, fr: 70,  fg: 6,  r2: 0.5,  flt: 380,  t1: 'sawtooth', t2: 'square',   chug: 1 },
  enduro: { f0: 88, fr: 200, fg: 10, r2: 1.98, flt: 1300, t1: 'square',   t2: 'square',   chug: 0 },
  rice:   { f0: 95, fr: 280, fg: 18, r2: 2.02, flt: 2100, t1: 'sawtooth', t2: 'sawtooth', chug: 0 },
  volt:   { f0: 480, fr: 900, fg: 60, r2: 1.005, flt: 3200, t1: 'sine',    t2: 'sine',     chug: 0, ev: 1 },
  vespa:  { f0: 150, fr: 260, fg: 14, r2: 2.02,  flt: 1900, t1: 'square',  t2: 'square',   chug: 1 },  // ring-ding two-stroke putter
  duke:   { f0: 66,  fr: 260, fg: 16, r2: 1.5,   flt: 1600, t1: 'sawtooth', t2: 'square',  chug: 0 },  // booming Italian L-twin
  steam:  { f0: 34,  fr: 60,  fg: 5,  r2: 0.75,  flt: 420,  t1: 'sawtooth', t2: 'triangle', chug: 1 }  // locomotive chuff
};

const STATL = ['Accel', 'Top speed', 'Braking', 'Toughness', 'Terrain', 'Handling'];
