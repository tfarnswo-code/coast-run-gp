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
      if (Math.abs(s.curve) < 5 && !s.hz && !s.clf) s.hz = { t: 'dirt', o: lane };
    }
  }
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
function upDec(deerMod) {
  for (let i = 0; i < N; i++) {
    const s = segs[i];
    if (i % 13 === 5) s.spr = { t: (i % 26 === 5) ? 'pine' : 'tree', o: (i % 2 ? 1 : -1) * (1.55 + (i * 7 % 6) / 6) };
    else if (i % 7 === 0) s.spr = { t: (i % 14 === 0) ? 'pine' : 'tree', o: (i % 2 ? 1 : -1) * (2.5 + (i * 7 % 10) / 4) };
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
function bjDec(potMod, cowMod, runs, maxRun) {
  for (let i = 0; i < N; i++) {
    const s = segs[i];
    if (i % 9 === 4) s.spr = { t: 'cactus', o: (i % 2 ? 1 : -1) * (1.5 + (i * 7 % 7) / 6) };
    else if (i % 13 === 6) s.spr = { t: 'rock', o: (i % 2 ? -1 : 1) * (1.6 + (i * 5 % 6) / 5) };
    else if (i % 7 === 1) s.spr = { t: 'shrub', o: (i % 2 ? 1 : -1) * (2.0 + (i * 3 % 6) / 4) };
    if (Math.abs(s.curve) < 5 && i % potMod === 9 % potMod) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
    if (i % cowMod === Math.floor(cowMod / 3) && Math.abs(s.curve) < 4) s.animal = { t: 'cow', o: ((i * 13) % 3 - 1) * 0.5, hit: false };
  }
  dirtRuns(runs, 28, maxRun);
}

// --- Course catalog. Indices 0-3 unlocked from the start; 4-7 are podium rewards. ---
const THEMES = [
  { name: 'Upstate Run', d1: 'Forest hills · balanced', d2: 'Dirt, potholes and deer',
    sky: '#7EC4E8', mtFar: '#A9BCC7', mtNear: '#7F97A3', ridge: '#7FAE82', gA: '#6AAE4E', gB: '#5F9F45',
    dirt: 'rgba(128,95,60,0.85)', cliff: false, hA1: 2800, hA2: 900, hF1: 8, hF2: 18, sunR: 28,
    build: upBuild, dec: function () { upDec(353); } },
  { name: 'Big Sir', d1: 'Pacific cliffs · very twisty', d2: 'Off the left edge is fatal',
    sky: '#9AD1EC', mtFar: '#B9A98C', mtNear: '#8E8270', ridge: null, gA: '#A3AD6E', gB: '#98A263',
    dirt: 'rgba(128,95,60,0.85)', cliff: true, hA1: 4800, hA2: 1400, hF1: 10, hF2: 22, sunR: 28,
    build: bsBuild, dec: bsDec },
  { name: 'Baja', d1: 'Open desert · fast straights', d2: 'Dirt everywhere · stray cattle',
    sky: '#AFD8EC', mtFar: '#C7A57E', mtNear: '#A57F54', ridge: '#D8B97F', gA: '#D9BC85', gB: '#CFB279',
    dirt: 'rgba(110,80,48,0.9)', cliff: false, hA1: 2600, hA2: 700, hF1: 6, hF2: 16, sunR: 34,
    build: bjBuild, dec: function () { bjDec(37, 367, 9, 55); } },
  { name: 'Mystery Run', d1: 'Different every time', d2: 'Read the road · choose wisely',
    sky: '#7EC4E8', mtFar: '#A9BCC7', mtNear: '#7F97A3', ridge: null, gA: '#6AAE4E', gB: '#5F9F45',
    dirt: 'rgba(128,95,60,0.85)', cliff: false, hA1: 2500, hA2: 800, hF1: 8, hF2: 18, sunR: 28, mystery: true,
    build: function () {
      const r = Math.random;
      this.sky = ['#7EC4E8', '#AFD8EC', '#F2CFA0', '#9AD1EC'][Math.floor(r() * 4)];
      this.hA1 = 1300 + r() * 3300; this.hA2 = 400 + r() * 1000;
      this.hF1 = [6, 8, 10][Math.floor(r() * 3)]; this.hF2 = [16, 18, 22][Math.floor(r() * 3)];
      this.traf = 7 + Math.floor(r() * 8);
      while (segs.length < 1350) {
        if (r() < 0.38) addRoad(0, Math.floor(30 + r() * 80), 0, 0);
        else { const c = (r() < 0.5 ? -1 : 1) * (2 + r() * 4.5); const e = Math.floor(25 + r() * 20); addRoad(e, Math.floor(30 + r() * 50), e, c); }
      }
      addRoad(0, 60, 0, 0);
    },
    dec: function () {
      const r = Math.random;
      const nz = 3 + Math.floor(r() * 3);
      const bs = []; let prev = -1;
      for (let z = 0; z < nz; z++) { let b; do { b = Math.floor(r() * 3); } while (b === prev); prev = b; bs.push(b); }
      for (let i = 0; i < N; i++) {
        const b = bs[Math.min(nz - 1, Math.floor(i / N * nz))];
        const s = segs[i];
        if (b === 0) { // forest zone
          s.cA = '#6AAE4E'; s.cB = '#5F9F45';
          if (i % 13 === 5) s.spr = { t: (i % 26 === 5) ? 'pine' : 'tree', o: (i % 2 ? 1 : -1) * (1.55 + (i * 7 % 6) / 6) };
          else if (i % 7 === 0) s.spr = { t: 'tree', o: (i % 2 ? 1 : -1) * (2.5 + (i * 7 % 10) / 4) };
          else if (i % 11 === 0) s.spr = { t: 'bush', o: (i % 2 ? -1 : 1) * (2.1 + (i * 3 % 6) / 4) };
          if (Math.abs(s.curve) < 5 && i % 89 === 17) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
          if (i % 241 === 60 && Math.abs(s.curve) < 4) s.animal = { t: 'deer', o: ((i * 13) % 3 - 1) * 0.5, hit: false };
        } else if (b === 1) { // desert zone
          s.cA = '#D9BC85'; s.cB = '#CFB279'; s.dirtC = 'rgba(110,80,48,0.9)';
          if (i % 9 === 4) s.spr = { t: 'cactus', o: (i % 2 ? 1 : -1) * (1.5 + (i * 7 % 7) / 6) };
          else if (i % 13 === 6) s.spr = { t: 'rock', o: (i % 2 ? -1 : 1) * (1.6 + (i * 5 % 6) / 5) };
          else if (i % 7 === 1) s.spr = { t: 'shrub', o: (i % 2 ? 1 : -1) * (2.0 + (i * 3 % 6) / 4) };
          if (Math.abs(s.curve) < 5 && i % 41 === 9) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
          if (i % 283 === 100 && Math.abs(s.curve) < 4) s.animal = { t: 'cow', o: ((i * 13) % 3 - 1) * 0.5, hit: false };
        } else { // coast zone — cliff on the left, fatal
          s.cA = '#A3AD6E'; s.cB = '#98A263'; s.clf = true;
          if (i % 9 === 2) s.spr = { t: 'pine', o: 1.7 + (i * 5 % 8) / 5 };
          else if (i % 17 === 5) s.spr = { t: 'rock', o: 1.5 + (i * 3 % 5) / 5 };
          if (Math.abs(s.curve) < 5 && i % 127 === 40) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
        }
      }
      dirtRuns(2 + Math.floor(r() * 4), 24, 55);
    } },
  { name: 'Upstate Stampede', d1: 'The deer own it now', d2: 'An absurd number of deer',
    sky: '#8FCBE0', mtFar: '#A9BCC7', mtNear: '#7F97A3', ridge: '#7FAE82', gA: '#6AAE4E', gB: '#5F9F45',
    dirt: 'rgba(128,95,60,0.85)', cliff: false, hA1: 2800, hA2: 900, hF1: 8, hF2: 18, sunR: 28, lock: true,
    build: upBuild, dec: function () { upDec(53); } },
  { name: 'Big Sir Rush', d1: 'Rush hour on the cliffs', d2: 'Wall-to-wall traffic',
    sky: '#9AD1EC', mtFar: '#B9A98C', mtNear: '#8E8270', ridge: null, gA: '#A3AD6E', gB: '#98A263',
    dirt: 'rgba(128,95,60,0.85)', cliff: true, hA1: 4800, hA2: 1400, hF1: 10, hF2: 22, sunR: 28, lock: true, traf: 22,
    build: bsBuild, dec: bsDec },
  { name: 'Baja Inferno', d1: 'The desert fights back', d2: 'Potholes and dirt everywhere',
    sky: '#EFC9A0', mtFar: '#C7A57E', mtNear: '#A57F54', ridge: '#D8B97F', gA: '#D9BC85', gB: '#CFB279',
    dirt: 'rgba(110,80,48,0.9)', cliff: false, hA1: 2600, hA2: 700, hF1: 6, hF2: 16, sunR: 36, lock: true,
    build: bjBuild, dec: function () { bjDec(17, 173, 14, 80); } },
  { name: 'Neon City', d1: 'Urban night run', d2: 'Taxis, manholes, lampposts',
    sky: '#0f1322', mtFar: '#1b2030', mtNear: '#141823', ridge: null, gA: '#2a2d33', gB: '#26292e',
    dirt: 'rgba(128,95,60,0.85)', cliff: false, hA1: 900, hA2: 300, hF1: 6, hF2: 16, sunR: 22, lock: true, night: true, taxi: true, traf: 18,
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
  // --- Tier 3: Epic Runs — point-to-point, no laps. Indices 8+. ---
  { name: 'Salt Flats', d1: 'Long straights · let er rip', d2: 'Light traffic · pure speed',
    sky: '#BFE3F2', mtFar: '#A99BB5', mtNear: '#8B7E99', ridge: null, gA: '#E6E0CE', gB: '#DED8C4',
    dirt: 'rgba(150,130,95,0.7)', cliff: false, hA1: 350, hA2: 120, hF1: 6, hF2: 14, sunR: 36,
    lock: true, epic: true, p2p: true, traf: 5,
    build: function () {
      addRoad(0, 300, 0, 0); addRoad(60, 200, 60, 1.5); addRoad(0, 350, 0, 0); addRoad(70, 180, 70, -2);
      addRoad(0, 400, 0, 0); addRoad(60, 160, 60, 2.5); addRoad(0, 300, 0, 0); addRoad(70, 200, 70, -1.5);
      addRoad(0, 260, 0, 0); addRoad(60, 150, 60, 2); addRoad(0, 170, 0, 0);
    },
    dec: function () {
      for (let i = 0; i < N; i++) {
        const s = segs[i];
        if (i % 23 === 4) s.spr = { t: 'rock', o: (i % 2 ? 1 : -1) * (1.8 + (i * 5 % 6) / 5) };
        else if (i % 17 === 8) s.spr = { t: 'shrub', o: (i % 2 ? -1 : 1) * (2.2 + (i * 3 % 6) / 4) };
        if (Math.abs(s.curve) < 5 && i % 223 === 60) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
      }
    } },
  { name: 'Crest County', d1: 'Every crest launches you', d2: 'Deer hide in the dips',
    sky: '#8FD0E8', mtFar: '#A9BCC7', mtNear: '#7F97A3', ridge: '#7FAE82', gA: '#7CB85A', gB: '#70AC50',
    dirt: 'rgba(128,95,60,0.85)', cliff: false, hA1: 2600, hA2: 2800, hF1: 8, hF2: 38, sunR: 28,
    lock: true, epic: true, p2p: true, jumps: true, traf: 8,
    build: function () {
      addRoad(0, 200, 0, 0); addRoad(40, 120, 40, 3); addRoad(0, 200, 0, 0); addRoad(50, 140, 50, -3.5);
      addRoad(0, 240, 0, 0); addRoad(40, 100, 40, 2.5); addRoad(0, 220, 0, 0); addRoad(50, 120, 50, -2.5);
      addRoad(0, 260, 0, 0); addRoad(40, 110, 40, 4); addRoad(0, 200, 0, 0); addRoad(40, 100, 40, -3);
      addRoad(0, 170, 0, 0);
    },
    dec: function () {
      for (let i = 0; i < N; i++) {
        const s = segs[i];
        if (i % 13 === 5) s.spr = { t: (i % 26 === 5) ? 'pine' : 'tree', o: (i % 2 ? 1 : -1) * (1.6 + (i * 7 % 6) / 6) };
        else if (i % 11 === 0) s.spr = { t: 'bush', o: (i % 2 ? -1 : 1) * (2.1 + (i * 3 % 6) / 4) };
        if (Math.abs(s.curve) < 5 && i % 89 === 17) s.hz = { t: 'pot', o: ((i * 11) % 3 - 1) * 0.5 };
        if (i % 197 === 60 && Math.abs(s.curve) < 4) s.animal = { t: 'deer', o: ((i * 13) % 3 - 1) * 0.5, hit: false };
      }
      dirtRuns(3, 20, 30);
    } }
];

function buildCourse(c) {
  segs = []; T = THEMES[c]; T.build();
  N = segs.length; trackLen = N * segLen;
  const hy = i => Math.sin(i / N * Math.PI * T.hF1) * T.hA1 + Math.sin(i / N * Math.PI * T.hF2) * T.hA2;
  for (let i = 0; i < N; i++) {
    const s = segs[i];
    s.y1 = hy(i); s.y2 = hy(i + 1);
    // Per-segment terrain defaults (Mystery's dec() overrides these per biome zone)
    s.cA = T.gA; s.cB = T.gB; s.dirtC = T.dirt; s.clf = T.cliff;
  }
  T.dec();
}

// --- Bike catalog. ts/ac/br/hd are multipliers; hz = hazard tolerance 0-1;
// tough scales crash recovery time; armor = free crashes absorbed per race. ---
const BIKES = [
  { name: 'Cafe Racer', kind: 'cafe', tier: 1, col: '#9AA7B0', col2: '#8B5A2B', snd: 'cafe', ts: 1, ac: 1, br: 1, hd: 1, hz: 0.5, tough: 0.5, armor: 0,
    bars: [0.55, 0.55, 0.55, 0.5, 0.5, 0.55], fl: 'The trusty all-rounder' },
  { name: 'Enduro', kind: 'enduro', tier: 1, col: '#97C459', col2: '#F2F2F2', snd: 'enduro', ts: 0.85, ac: 1.05, br: 1.25, hd: 1.3, hz: 0.9, tough: 0.6, armor: 0,
    bars: [0.6, 0.35, 0.85, 0.55, 0.9, 0.85], fl: 'Eats dirt for breakfast' },
  { name: 'The Hog', kind: 'hog', tier: 1, col: '#2C2C2A', col2: '#EF9F27', snd: 'hog', ts: 1.08, ac: 0.82, br: 0.9, hd: 0.85, hz: 0.75, tough: 0.9, armor: 1,
    bars: [0.4, 0.7, 0.45, 0.95, 0.75, 0.4], fl: 'Heavy metal thunder' },
  { name: 'Rice Burner', kind: 'rice', tier: 1, col: '#5DCAA5', col2: '#7F77DD', snd: 'rice', ts: 1.15, ac: 1.2, br: 1.05, hd: 1.2, hz: 0.15, tough: 0.15, armor: 0,
    bars: [0.85, 0.9, 0.6, 0.1, 0.15, 0.8], fl: 'Fast, fragile, furious' },
  { name: 'Cafe Royale', kind: 'cafe', tier: 2, col: '#993556', col2: '#FAC775', snd: 'cafe', ts: 1.08, ac: 1.12, br: 1.12, hd: 1.1, hz: 0.6, tough: 0.6, armor: 0,
    bars: [0.7, 0.7, 0.7, 0.6, 0.6, 0.7], fl: 'All-rounder, all grown up' },
  { name: 'Enduro Pro', kind: 'enduro', tier: 2, col: '#EF9F27', col2: '#1c1c22', snd: 'enduro', ts: 0.95, ac: 1.15, br: 1.35, hd: 1.4, hz: 0.95, tough: 0.65, armor: 0,
    bars: [0.7, 0.5, 0.95, 0.6, 0.95, 0.95], fl: 'Factory rally weapon' },
  { name: 'Big Hog', kind: 'hog', tier: 2, col: '#1c1c22', col2: '#b9bdc4', snd: 'hog', ts: 1.12, ac: 0.92, br: 0.95, hd: 0.9, hz: 0.85, tough: 0.95, armor: 2,
    bars: [0.5, 0.8, 0.5, 1, 0.85, 0.45], fl: 'An armored couch at 290' },
  { name: 'Superbike', kind: 'rice', tier: 2, col: '#7F77DD', col2: '#FAC775', snd: 'rice', ts: 1.22, ac: 1.3, br: 1.1, hd: 1.3, hz: 0.2, tough: 0.2, armor: 0,
    bars: [0.95, 1, 0.65, 0.15, 0.2, 0.9], fl: 'Barely street legal' },
  // --- Tier 3: gimmick machines. sp = special on SPACE ---
  { name: 'Volt', kind: 'volt', tier: 3, col: '#E8EAF0', col2: '#4DD8E8', snd: 'volt', ts: 1.18, ac: 1.3, br: 1.1, hd: 1.15, hz: 0.3, tough: 0.4, armor: 0, sp: 'boost',
    bars: [1, 0.85, 0.65, 0.25, 0.3, 0.75], fl: 'Silent. Then... YIKES!' },
  { name: 'Dakar', kind: 'dakar', tier: 3, col: '#2E6FB8', col2: '#E24B4A', snd: 'enduro', ts: 1.0, ac: 1.1, br: 1.25, hd: 1.25, hz: 0.95, tough: 0.8, armor: 0, sp: 'jump',
    bars: [0.65, 0.6, 0.85, 0.7, 1, 0.85], fl: 'Press space — flies over trouble' }
];

// Engine voices: f0 base Hz, fr rev range, fg per-gear bump, r2 second-osc ratio,
// flt lowpass Hz, t1/t2 oscillator types, chug = slow amplitude lope (the hog)
const SND = {
  cafe:   { f0: 62, fr: 150, fg: 12, r2: 1.5,  flt: 820,  t1: 'sawtooth', t2: 'square',   chug: 0 },
  hog:    { f0: 36, fr: 70,  fg: 6,  r2: 0.5,  flt: 380,  t1: 'sawtooth', t2: 'square',   chug: 1 },
  enduro: { f0: 88, fr: 200, fg: 10, r2: 1.98, flt: 1300, t1: 'square',   t2: 'square',   chug: 0 },
  rice:   { f0: 95, fr: 280, fg: 18, r2: 2.02, flt: 2100, t1: 'sawtooth', t2: 'sawtooth', chug: 0 },
  volt:   { f0: 480, fr: 900, fg: 60, r2: 1.005, flt: 3200, t1: 'sine',    t2: 'sine',     chug: 0, ev: 1 }
};

const STATL = ['Accel', 'Top speed', 'Braking', 'Toughness', 'Terrain', 'Handling'];
