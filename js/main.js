// Coast Run GP — game state, career persistence, input, physics, render loop.

let state = 'title', speed = 0, position = 0, playerN = 0;
let paused = false;
let raceT = 0, lapStartT = 0, curLap = 0, lapTimes = [], cd = 0, lastCd = 4, bgShift = 0, lean = 0, finalRank = 13, bounce = 0;
let lives = 3, podiumCols = [], conf = [], bonusLife = false;
let owned = [0], curBike = 0, selG = 0, pendingReward = false, rewardOpts = [], selR = 0, armorLeft = 0, staggerT = 0;
let unlockedT = [0, 1, 2, 3];
let crashing = false, crashTimer = 0, crashDur = 2, crashRot = 0, crashDir = 1, invulnT = 0, flashT = 0, bumpT = 0, lastBumpSeg = -1, fell = false;
let parts = [];
let rivals = [], traffic = [];
let keyL = false, keyR = false, keyB = false, keyU = false;
let cheatBuf = '', cheatT = 0;
let airT = 0, airDur = 0, jumpCd = 0, prevGrade = 0;     // jump physics (Dakar + crest launches)
let boostOn = false, boostM = 1;                          // Volt "YIKES!" meter
let newBike = -1, newBikeT = 0;                           // mystery-bike reveal toast
const UPK = 154286;                                       // road units per displayed km

function B() { return BIKES[curBike]; }

// --- Career persistence (localStorage, per browser/device) ---
const SAVE_KEY = 'coastrun-career';
function saveCareer() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, lives: lives, owned: owned, unlockedT: unlockedT, curBike: curBike }));
  } catch (e) { /* private browsing etc. — play without saves */ }
}
function loadCareer() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!d) return;
    if (typeof d.lives === 'number') lives = Math.max(1, Math.min(5, Math.round(d.lives)));
    if (Array.isArray(d.owned)) owned = d.owned.filter(i => Number.isInteger(i) && i >= 0 && i < BIKES.length);
    if (owned.indexOf(0) < 0) owned.unshift(0);
    if (Array.isArray(d.unlockedT)) unlockedT = d.unlockedT.filter(i => Number.isInteger(i) && i >= 0 && i < THEMES.length);
    for (const b of [0, 1, 2, 3]) if (unlockedT.indexOf(b) < 0) unlockedT.push(b);
    if (Number.isInteger(d.curBike) && owned.indexOf(d.curBike) >= 0) curBike = d.curBike;
  } catch (e) { /* corrupt save — start fresh */ }
}

function reset() {
  speed = 0; position = 0; playerN = 0; raceT = 0; lapStartT = 0; curLap = 0; lapTimes = []; bgShift = 0; lastCd = 4;
  crashing = false; crashTimer = 0; crashRot = 0; invulnT = 0; flashT = 0; bumpT = 0; lastBumpSeg = -1; fell = false; parts = []; conf = [];
  armorLeft = B().armor; staggerT = 0;
  airT = 0; airDur = 0; jumpCd = 0; prevGrade = 0; boostOn = false; boostM = 1;
  rivals = []; traffic = [];
  const rGap = T.p2p ? 3600 : trackLen * 0.03;
  for (let i = 0; i < 12; i++) rivals.push({ z: (i + 1) * rGap, off: (i % 3 - 1) * 0.45, base: (i % 3 - 1) * 0.45, speed: maxSpeed * (0.42 + i * 0.024), col: colors[i], ph: i * 1.7 });
  const nt = T.traf || 10;
  const tt = ['car', 'car', 'truck', 'car', 'bus', 'car', 'truck', 'car', 'car', 'bus'];
  let tc = ['#5F5E5A', '#185FA5', '#9AB0BC', '#72243E', '#EF9F27', '#0F6E56', '#B4B2A9', '#444441', '#993C1D', '#EF9F27'];
  if (T.taxi) tc = ['#EFC727', '#EFC727', '#9AB0BC', '#EFC727', '#E24B4A', '#EFC727', '#B4B2A9', '#EFC727', '#185FA5', '#EFC727'];
  const sbusAt = Math.floor(nt / 2); // exactly one Greisen school bus every run
  for (let i = 0; i < nt; i++) {
    const ty = i === sbusAt ? 'sbus' : tt[i % 10];
    traffic.push({ z: trackLen * (0.08 + i * 0.84 / nt), off: [-0.5, 0, 0.5][i % 3], speed: maxSpeed * (0.2 + (i % 4) * 0.045), type: ty, col: tc[i % 10], cw: ty === 'car' ? 0.26 : 0.33 });
  }
}

loadCareer();
buildCourse(sel); reset();

function startRace() { initAudio(); buildCourse(sel); reset(); state = 'count'; cd = 3.2; }
function resetCareer() {
  lives = 3; owned = [0]; curBike = 0; selG = 0; unlockedT = [0, 1, 2, 3];
  if (unlockedT.indexOf(sel) < 0) sel = 0;
  saveCareer();
}
// Tim's scheme: the bike reward is a MYSTERY — random within the current tier.
// All tier-1 bikes before tier 2 appears; all 8 standard bikes before tier 3.
function bikePoolNow() {
  const no = i => owned.indexOf(i) < 0;
  const t1 = [1, 2, 3].filter(no); if (t1.length) return { tier: 1, pool: t1 };
  const t2 = [4, 5, 6, 7].filter(no); if (t2.length) return { tier: 2, pool: t2 };
  const t3 = []; for (let i = 8; i < BIKES.length; i++) if (no(i)) t3.push(i);
  if (t3.length) return { tier: 3, pool: t3 };
  return null;
}
function buildRewards() {
  rewardOpts = [];
  if (lives < 5) rewardOpts.push({ t: 'life' });
  const bp = bikePoolNow();
  if (bp) rewardOpts.push({ t: 'mbike', tier: bp.tier });
  const lt = [4, 5, 6, 7].filter(i => unlockedT.indexOf(i) < 0);
  if (lt.length) rewardOpts.push({ t: 'track', k: lt[0] });
  else {
    const le = []; for (let i = 8; i < THEMES.length; i++) if (unlockedT.indexOf(i) < 0) le.push(i);
    if (le.length) rewardOpts.push({ t: 'track', k: le[0] });
  }
  selR = 0;
}
function claimReward(o) {
  if (o) {
    if (o.t === 'life') lives = Math.min(5, lives + 1);
    else if (o.t === 'mbike') {
      const bp = bikePoolNow();
      if (bp) { const pick = bp.pool[Math.floor(Math.random() * bp.pool.length)]; owned.push(pick); newBike = pick; newBikeT = 5; }
    }
    else unlockedT.push(o.k);
  }
  pendingReward = false; state = 'ready'; saveCareer();
}
function moveSel(dir) {
  do { sel = (sel + dir + THEMES.length) % THEMES.length; } while (unlockedT.indexOf(sel) < 0);
  buildCourse(sel); reset();
}

addEventListener('keydown', e => {
  if (e.key && e.key.length === 1) {
    cheatBuf = (cheatBuf + e.key.toLowerCase()).slice(-7);
    if (cheatBuf === 'cheater') {
      owned = BIKES.map((b, i) => i); unlockedT = THEMES.map((t, i) => i);
      lives = 5; cheatT = 3.5; saveCareer();
      try { initAudio(); winJingle(); } catch (err) { }
    }
  }
  // P pauses mid-race; Q saves and exits to the title (mid-race = forfeit, no penalty no reward)
  if ((state === 'race' || state === 'count') && e.code === 'KeyP') { paused = !paused; return; }
  if (e.code === 'KeyQ' && (state === 'garage' || state === 'ready' || state === 'race' || state === 'count')) {
    paused = false; crashing = false; speed = 0; saveCareer(); state = 'title'; return;
  }
  if (state === 'ready') {
    if (e.code === 'ArrowLeft') { moveSel(-1); e.preventDefault(); return; }
    if (e.code === 'ArrowRight') { moveSel(1); e.preventDefault(); return; }
    if (e.code === 'KeyR') { resetCareer(); buildCourse(sel); reset(); return; }
    if (e.code === 'KeyB') { state = 'garage'; e.preventDefault(); return; }
  }
  if (state === 'garage') {
    if (e.code === 'ArrowLeft') { selG = (selG + owned.length - 1) % owned.length; e.preventDefault(); return; }
    if (e.code === 'ArrowRight') { selG = (selG + 1) % owned.length; e.preventDefault(); return; }
    if (e.code === 'KeyB') { state = 'title'; e.preventDefault(); return; }
  }
  if (state === 'reward' && rewardOpts.length) {
    if (e.code === 'ArrowLeft') { selR = (selR + rewardOpts.length - 1) % rewardOpts.length; e.preventDefault(); return; }
    if (e.code === 'ArrowRight') { selR = (selR + 1) % rewardOpts.length; e.preventDefault(); return; }
  }
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keyL = true; e.preventDefault(); }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') { keyR = true; e.preventDefault(); }
  if (e.code === 'ArrowDown' || e.code === 'KeyS') { keyB = true; e.preventDefault(); }
  if (e.code === 'ArrowUp' || e.code === 'KeyW') { keyU = true; e.preventDefault(); }
  if (e.code === 'KeyM') muted = !muted;
  if (e.code === 'Space' && state === 'race' && !paused && !crashing) {
    const spc = B().sp;
    if (spc === 'boost') { boostOn = boostOn ? false : boostM > 0.05; }
    else if (spc === 'jump' && airT <= 0 && jumpCd <= 0 && speed > 1200) {
      airDur = 0.5 + speed / maxSpeed * 0.4; airT = airDur; jumpCd = 1.4;
      try { note(300, 0, 0.16, 'triangle', 0.12); } catch (er) { }
    }
    e.preventDefault(); return;
  }
  if (e.code === 'Enter' || e.code === 'Space') {
    if (state === 'title') { state = 'garage'; selG = owned.indexOf(curBike); if (selG < 0) selG = 0; initAudio(); }
    else if (state === 'ready') { startRace(); }
    else if (state === 'garage') { curBike = owned[selG]; saveCareer(); state = 'ready'; }
    else if (state === 'over') { state = pendingReward ? 'reward' : 'ready'; }
    else if (state === 'reward') { claimReward(rewardOpts[selR]); }
    else if (state === 'dead') { resetCareer(); state = 'ready'; buildCourse(sel); reset(); }
    e.preventDefault();
  }
});
addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyL = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keyR = false;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') keyB = false;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') keyU = false;
});
addEventListener('blur', () => { keyL = keyR = keyB = keyU = false; });

cv.addEventListener('click', e => {
  const r = cv.getBoundingClientRect();
  const mx = (e.clientX - r.left) * W / r.width, my = (e.clientY - r.top) * H / r.height;
  if (state === 'title') { state = 'garage'; selG = owned.indexOf(curBike); if (selG < 0) selG = 0; initAudio(); return; }
  if (state === 'over') { state = pendingReward ? 'reward' : 'ready'; return; }
  if (state === 'dead') { resetCareer(); state = 'ready'; buildCourse(sel); reset(); return; }
  if (state === 'ready') {
    for (let i = 0; i < THEMES.length; i++) {
      const gx = 30 + (i % 4) * 160, gy = 70 + Math.floor(i / 4) * 100;
      if (mx >= gx && mx <= gx + 150 && my >= gy && my <= gy + 92) {
        if (unlockedT.indexOf(i) < 0) return;
        if (sel === i) { startRace(); }
        else { sel = i; buildCourse(sel); reset(); }
        return;
      }
    }
    return;
  }
  if (state === 'garage') {
    for (let i = 0; i < owned.length; i++) {
      const gx = 22 + (i % 5) * 128, gy = 78 + Math.floor(i / 5) * 106;
      if (mx >= gx && mx <= gx + 122 && my >= gy && my <= gy + 96) {
        if (selG === i) { curBike = owned[selG]; saveCareer(); state = 'ready'; }
        else selG = i;
        return;
      }
    }
    return;
  }
  if (state === 'reward' && rewardOpts.length) {
    const tot = rewardOpts.length * 160 - 10, x0 = (W - tot) / 2;
    for (let i = 0; i < rewardOpts.length; i++) {
      const gx = x0 + i * 160;
      if (mx >= gx && mx <= gx + 150 && my >= 110 && my <= 265) {
        if (selR === i) claimReward(rewardOpts[selR]);
        else selR = i;
        return;
      }
    }
    return;
  }
});

function spawnParts(n, col, spd, up) {
  for (let i = 0; i < n; i++) parts.push({
    x: W / 2 + (Math.random() - 0.5) * 40, y: H - 45 + (Math.random() - 0.5) * 16,
    vx: (Math.random() - 0.5) * spd, vy: -Math.random() * up - 20,
    life: 0.5 + Math.random() * 0.5, r: 2 + Math.random() * 3, col: col });
}

function doCrash(side) {
  lives--; crashing = true; crashDur = 1.4 + (1 - B().tough) * 1.2; crashTimer = crashDur;
  crashRot = 0; crashDir = side; flashT = 0.35; invulnT = 0; fell = false;
  crashSnd();
  spawnParts(14, '#FAC775', 360, 220);
  spawnParts(12, '#D2382E', 240, 160);
}

// Armor (the hog) absorbs a crash as a stagger instead
function hitHard(side) {
  if (armorLeft > 0) {
    armorLeft--; staggerT = 1.4; invulnT = 1; speed *= 0.3; bumpT = 0.9; flashT = 0.2; thud();
    spawnParts(8, '#b9bdc4', 260, 160); playerN += side * 0.12;
  } else doCrash(side);
}

function cliffFall() {
  lives--; crashing = true; crashDur = 2.2; crashTimer = 2.2; crashRot = 0; crashDir = -1; flashT = 0.3; invulnT = 0; fell = true;
  crashSnd();
  note(330, 0, 0.18, 'triangle', 0.15); note(220, 0.18, 0.18, 'triangle', 0.15); note(140, 0.36, 0.4, 'triangle', 0.15);
  spawnParts(12, '#7EC4E8', 300, 180);
}

function finishRace() {
  state = 'over'; speed = 0;
  finalRank = 1 + rivals.filter(r => r.z > position).length;
  bonusLife = lives < 5;
  if (bonusLife) lives++;
  const all = [{ col: '#E24B4A', me: true, p: position }].concat(rivals.map(r => ({ col: r.col, me: false, p: r.z })));
  all.sort((a, b) => b.p - a.p);
  podiumCols = all.slice(0, 3);
  if (finalRank <= 3) { buildRewards(); pendingReward = rewardOpts.length > 0; winJingle(); }
  else { pendingReward = false; loseJingle(); }
  saveCareer();
}

function update(dt) {
  if (paused) { audioTick(); return; }
  const pos = position % trackLen;
  const pSeg = segs[Math.floor((pos + playerZ) / segLen) % N];
  if (flashT > 0) flashT -= dt;
  if (cheatT > 0) cheatT -= dt;
  if (newBikeT > 0) newBikeT -= dt;
  if (bumpT > 0) bumpT -= dt;
  if (staggerT > 0) staggerT -= dt;
  for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 480 * dt; }
  parts = parts.filter(p => p.life > 0);
  if (state === 'over' && finalRank <= 3) {
    if (conf.length < 130) for (let i = 0; i < 2; i++) conf.push({ x: Math.random() * W, y: -10, vy: 60 + Math.random() * 70, vx: (Math.random() - 0.5) * 30, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 7, col: colors[Math.floor(Math.random() * colors.length)] });
    for (const c of conf) { c.y += c.vy * dt; c.x += c.vx * dt + Math.sin(c.y * 0.04) * 0.7; c.rot += c.vr * dt; if (c.y > H + 12) { c.y = -10; c.x = Math.random() * W; } }
  }
  if (state === 'count') {
    cd -= dt;
    const ci = Math.ceil(cd);
    if (ci < lastCd && ci > 0) { beep(440, 0.13); lastCd = ci; }
    if (cd <= 0 && lastCd > 0) { beep(880, 0.35); lastCd = 0; state = 'race'; lapStartT = 0; }
  }
  if (state === 'race') {
    raceT += dt;
    if (invulnT > 0) invulnT -= dt;
    const bk = B();
    if (crashing) {
      crashTimer -= dt;
      crashRot = Math.min(crashRot + dt * 5, 1.6);
      speed = Math.max(0, speed - 15000 * dt);
      if (!fell) {
        // sparks trail the sliding bike; dust kicks up where the rider lands
        const prog = 1 - crashTimer / crashDur;
        const slide = crashDir * (crashDur - crashTimer) * 95;
        if (Math.random() < 0.7) parts.push({
          x: W / 2 + slide + (Math.random() - 0.5) * 30, y: H - 34 - Math.random() * 12,
          vx: -crashDir * (80 + Math.random() * 200), vy: -Math.random() * 90 - 20,
          life: 0.25 + Math.random() * 0.3, r: 1.5 + Math.random() * 2,
          col: Math.random() < 0.5 ? '#FAC775' : '#fff2c0' });
        if (prog * 1.7 >= 1 && Math.random() < 0.5) parts.push({
          x: W / 2 - crashDir * prog * 165 + (Math.random() - 0.5) * 36, y: H - 28,
          vx: -crashDir * (50 + Math.random() * 140), vy: -Math.random() * 130 - 40,
          life: 0.4 + Math.random() * 0.4, r: 2 + Math.random() * 3, col: Math.random() < 0.6 ? '#D2382E' : '#8E1414' });
      }
      position += speed * dt;
      if (crashTimer <= 0) {
        crashing = false;
        if (fell) { playerN = 0; fell = false; }
        if (lives <= 0) { state = 'dead'; finalRank = 13; speed = 0; loseJingle(); }
        else invulnT = 2;
      }
    } else {
      // specials: Volt boost meter + jump timers
      if (jumpCd > 0) jumpCd -= dt;
      if (airT > 0) { airT -= dt; if (airT <= 0) { bumpT = Math.max(bumpT, 0.25); thud(); } }
      if (boostOn) { boostM -= dt / 2.4; if (boostM <= 0) { boostM = 0; boostOn = false; } }
      else if (bk.sp === 'boost') boostM = Math.min(1, boostM + dt / 16);
      // crest launches (Crest County): flying off the top of a sharp rise at speed
      const grd = pSeg.y2 - pSeg.y1;
      if (T.jumps && airT <= 0 && prevGrade > 22 && grd <= 0 && speed > maxSpeed * 0.45) {
        airDur = 0.4 + Math.min(0.55, (prevGrade / 90) * (speed / maxSpeed)); airT = airDur;
      }
      prevGrade = grd;
      const onGrass = Math.abs(playerN) > 1;
      let topS = maxSpeed * bk.ts, acm = bk.ac;
      if (boostOn) { topS *= 1.35; acm *= 2; }
      const cap = onGrass ? grassMax * (0.7 + bk.hz * 0.9) : topS;
      if (keyU && speed < cap) speed += accel * acm * dt * Math.max(0.15, 1 - speed / cap);
      else if (!keyU) speed = Math.max(0, speed - (1500 + speed * 0.15) * dt);
      if (speed > cap) speed = Math.max(cap, speed - 9000 * dt);
      if (keyB) { speed = Math.max(0, speed - brakeF * bk.br * dt); boostOn = false; }
      const sp = speed / maxSpeed;
      const steer = (keyR ? 1 : 0) - (keyL ? 1 : 0);
      playerN += steer * dt * 2.2 * bk.hd * Math.max(sp, 0.25) * (airT > 0 ? 0.25 : 1);
      playerN -= dt * sp * pSeg.curve * 0.36;
      playerN = Math.max(-2.2, Math.min(2.2, playerN));
      lean += ((steer * Math.min(1, sp * 1.5)) - lean) * Math.min(1, dt * 8);
      position += speed * dt;
      bgShift -= pSeg.curve * sp * dt * 60;
      bounce += dt * speed * 0.002;
      if (pSeg.clf && playerN < -1.18 && invulnT <= 0) { cliffFall(); }
      if (!crashing) {
        const pi = Math.floor((pos + playerZ) / segLen);
        const hseg = segs[pi % N];
        if (hseg.hz && airT <= 0) {
          if (hseg.hz.t === 'pot' && Math.abs(playerN - hseg.hz.o) < 0.16) {
            if (pi !== lastBumpSeg) {
              lastBumpSeg = pi; speed *= 0.55 + bk.hz * 0.3; bumpT = 0.7 * (1.2 - bk.hz); thud();
              const kd = Math.random() < 0.5 ? -1 : 1;
              playerN += kd * (0.28 + Math.random() * 0.22) * (1.15 - bk.hz);
              lean += kd * 0.9 * (1.15 - bk.hz);
            }
          } else if (hseg.hz.t === 'dirt' && Math.abs(playerN - hseg.hz.o) < 0.42) {
            speed = Math.max(Math.min(speed, 2600 + bk.hz * 3400), speed - 5200 * (1.1 - bk.hz) * dt);
            bumpT = Math.max(bumpT, 0.2 * (1.2 - bk.hz));
            playerN += (Math.random() - 0.5) * 0.022 * (1.2 - bk.hz);
            if (Math.random() < 0.35) spawnParts(1, '#8a6a44', 130, 70);
          }
        }
        if (invulnT <= 0 && speed > 1200 && airT <= 0) {
          for (let k = 0; k < 2; k++) {
            const ts = segs[(pi + k) % N];
            const a = ts.animal;
            if (a && !a.hit && speed > 1500 && Math.abs(playerN - a.o) < (a.t === 'cow' ? 0.23 : 0.19)) {
              a.hit = true; hitHard(playerN < a.o ? -1 : 1); break;
            }
            if (!ts.spr) continue;
            const ty = ts.spr.t;
            if (ty === 'bush' || ty === 'shrub') {
              if (Math.abs(playerN - ts.spr.o) < 0.26 && speed > grassMax * 0.8) {
                speed *= 0.6; bumpT = 0.5; thud(); spawnParts(6, ty === 'shrub' ? '#A89B5F' : '#4C8F53', 200, 140);
              }
            } else {
              const tw = ty === 'sign' ? 0.14 : ty === 'rock' ? 0.19 : ty === 'cactus' ? 0.15 : ty === 'lamp' ? 0.1 : 0.17;
              if (Math.abs(playerN - ts.spr.o) < tw) { hitHard(playerN > 0 ? -1 : 1); break; }
            }
          }
        }
      }
    }
    for (const r of rivals) {
      r.z += r.speed * dt;
      r.off = r.base + Math.sin(raceT * 0.7 + r.ph) * 0.18;
    }
    for (const t of traffic) t.z += t.speed * dt;
    if (!crashing && invulnT <= 0) {
      let hit = false;
      for (const r of rivals) {
        const dz = ((r.z - position) % trackLen + trackLen) % trackLen;
        if (dz < segLen * 0.5 && Math.abs(playerN - r.off) < 0.15 && speed > r.speed + 250) {
          hitHard(playerN < r.off ? -1 : 1); hit = true; break;
        }
      }
      if (!hit && !crashing) for (const t of traffic) {
        const dz = ((t.z - position) % trackLen + trackLen) % trackLen;
        if (dz < segLen * 0.6 && Math.abs(playerN - t.off) < t.cw && speed > t.speed + 250) {
          hitHard(playerN < t.off ? -1 : 1); break;
        }
      }
    }
    if (T.p2p) {
      if (position >= trackLen - 160 * segLen) finishRace();
    } else {
      const lapNow = Math.floor(position / trackLen);
      if (lapNow > curLap) {
        lapTimes.push(raceT - lapStartT); lapStartT = raceT; curLap = lapNow;
        if (curLap >= 3) finishRace();
        else { beep(660, 0.1); beep(990, 0.18); }
      }
    }
  } else if (state !== 'count') { lean *= 0.95; }
  audioTick();
}

function render() {
  const pos = position % trackLen;
  const base = Math.floor(pos / segLen);
  const pct = (pos % segLen) / segLen;
  const pSegI = Math.floor((pos + playerZ) / segLen) % N;
  const pPct = ((pos + playerZ) % segLen) / segLen;
  const camY = camH + lerp(segs[pSegI].y1, segs[pSegI].y2, pPct);
  const camX = playerN * roadW;
  let shx = 0, shy = 0;
  if (crashing && crashTimer > crashDur - 0.7) { shx = (Math.random() - 0.5) * 10; shy = (Math.random() - 0.5) * 10; }
  else if (bumpT > 0) { shx = (Math.random() - 0.5) * 7 * bumpT; shy = (Math.random() - 0.5) * 9 * bumpT; }
  else if (Math.abs(playerN) > 1 && speed > 3000 && !crashing) { shx = (Math.random() - 0.5) * 4; shy = (Math.random() - 0.5) * 4; }
  cx.save(); cx.translate(shx, shy);
  cx.fillStyle = T.sky; cx.fillRect(-10, -10, W + 20, H + 20);
  if (T.night) {
    cx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let k = 0; k < 40; k++) { const sx2 = (k * 53) % W, sy2 = 8 + MP[k % 48] * H * 0.32; cx.fillRect(sx2, sy2, 1.5, 1.5); }
    cx.fillStyle = '#E8E8E0'; cx.beginPath(); cx.arc(W * 0.78, 56, T.sunR, 0, 7); cx.fill();
    cx.fillStyle = '#d4d4cc'; cx.beginPath(); cx.arc(W * 0.78 - 6, 52, 5, 0, 7); cx.arc(W * 0.78 + 5, 62, 3, 0, 7); cx.fill();
    drawSkyDecor(raceT, true);
    drawSkyline(H * 0.5, 80, T.mtFar, bgShift * 0.2, 56);
    drawSkyline(H * 0.52, 46, T.mtNear, bgShift * 0.45, 42);
  } else {
    cx.fillStyle = '#FFF3C4'; cx.beginPath(); cx.arc(W * 0.78, 58, T.sunR, 0, 7); cx.fill();
    drawSkyDecor(raceT, false);
    drawRange(H * 0.5, 95, T.mtFar, bgShift * 0.2, 110);
    drawRange(H * 0.53, 55, T.mtNear, bgShift * 0.45, 70);
    if (T.ridge) {
      cx.fillStyle = T.ridge; cx.beginPath(); cx.moveTo(-10, H * 0.56);
      for (let px = -10; px <= W + 10; px += 20) cx.lineTo(px, H * 0.56 - Math.abs(Math.sin((px + bgShift * 0.8) * 0.013 + 2)) * 22);
      cx.lineTo(W + 10, H * 0.56); cx.fill();
    }
  }
  // Project all segments first; draw cliff walls far-to-near, then terrain/road near-to-far
  let x = 0, dx = -(segs[base].curve * pct), clip = H;
  const sd = [];
  for (let n = 0; n < drawN; n++) {
    const i = (base + n) % N; const s = segs[i];
    const z1 = Math.max(n * segLen - pct * segLen, 1), z2 = (n + 1) * segLen - pct * segLen;
    const p1 = project(x - camX, s.y1 - camY, z1);
    x += dx; dx += s.curve;
    const p2 = project(x - camX, s.y2 - camY, z2);
    const vis = n >= 1 && p2.y < clip;
    sd[n] = { p1: p1, p2: p2, clip: clip, vis: vis, i: i };
    if (vis) clip = p2.y;
  }
  const farS = segs[(base + drawN - 1) % N];
  cx.fillStyle = farS.clf ? '#26648E' : farS.cA;
  cx.fillRect(-10, H * 0.52, W + 20, H * 0.48 + 10);
  for (let n = drawN - 1; n >= 1; n--) {
    const d = sd[n]; if (!d.vis) continue;
    const s = segs[d.i]; if (!s.clf) continue;
    const p1 = d.p1, p2 = d.p2;
    const alt = Math.floor(d.i / 4) % 2;
    const e1 = p1.x - p1.w * 1.12, e2 = p2.x - p2.w * 1.12;
    const dr1 = p1.w * 0.55, dr2 = p2.w * 0.55;
    cx.fillStyle = alt ? RKA : RKB;
    cx.beginPath();
    cx.moveTo(e1, p1.y + 1); cx.lineTo(e2, p2.y); cx.lineTo(e2 - p2.w * 0.2, p2.y + dr2); cx.lineTo(e1 - p1.w * 0.2, p1.y + 1 + dr1); cx.closePath(); cx.fill();
    cx.fillStyle = '#5e4d3a';
    cx.beginPath();
    cx.moveTo(e1, p1.y + 1); cx.lineTo(e2, p2.y); cx.lineTo(e2 - p2.w * 0.035, p2.y + dr2 * 0.16); cx.lineTo(e1 - p1.w * 0.035, p1.y + 1 + dr1 * 0.16); cx.closePath(); cx.fill();
    cx.fillStyle = 'rgba(255,255,255,0.55)';
    cx.beginPath();
    cx.moveTo(e1 - p1.w * 0.2, p1.y + dr1); cx.lineTo(e2 - p2.w * 0.2, p2.y + dr2); cx.lineTo(e2 - p2.w * 0.27, p2.y + dr2); cx.lineTo(e1 - p1.w * 0.27, p1.y + dr1); cx.closePath(); cx.fill();
  }
  const rdA = T.rA || '#6E6E6E', rdB = T.rB || '#676767', laneC = T.lane || '#E8E8E8';
  for (let n = 1; n < drawN; n++) {
    const d = sd[n]; if (!d.vis) continue;
    const p1 = d.p1, p2 = d.p2, i = d.i, s = segs[i];
    const alt = Math.floor(i / 4) % 2;
    const yb = Math.min(p1.y, d.clip) + 1;
    if (s.clf) {
      cx.fillStyle = alt ? s.cA : s.cB;
      cx.beginPath();
      cx.moveTo(p1.x - p1.w * 1.12, yb); cx.lineTo(W + 10, yb); cx.lineTo(W + 10, p2.y); cx.lineTo(p2.x - p2.w * 1.12, p2.y); cx.closePath(); cx.fill();
      quad(p1.x - p1.w * 1.09, p1.w * 0.05, p1.y, p2.x - p2.w * 1.09, p2.w * 0.05, p2.y, RIM);
    } else {
      cx.fillStyle = alt ? s.cA : s.cB;
      cx.fillRect(0, p2.y, W, yb - p2.y);
    }
    quad(p1.x, p1.w, p1.y, p2.x, p2.w, p2.y, alt ? rdA : rdB);
    quad(p1.x - p1.w * 1.06, p1.w * 0.045, p1.y, p2.x - p2.w * 1.06, p2.w * 0.045, p2.y, laneC);
    quad(p1.x + p1.w * 1.06, p1.w * 0.045, p1.y, p2.x + p2.w * 1.06, p2.w * 0.045, p2.y, laneC);
    if (alt) quad(p1.x, p1.w * 0.015, p1.y, p2.x, p2.w * 0.015, p2.y, laneC);
    if (s.hz) {
      const hx1 = p1.x + s.hz.o * p1.w, hx2 = p2.x + s.hz.o * p2.w, hy = (p1.y + p2.y) / 2, hh = Math.max(1.5, (p1.y - p2.y) * 0.42);
      if (s.hz.t === 'pot') {
        cx.fillStyle = '#7a7a7a'; cx.beginPath(); cx.ellipse(hx1, hy - Math.max(1, hh * 0.25), p1.w * 0.15, hh * 1.1, 0, 0, 7); cx.fill();
        cx.fillStyle = '#2b2b2b'; cx.beginPath(); cx.ellipse(hx1, hy, p1.w * 0.15, hh, 0, 0, 7); cx.fill();
        cx.fillStyle = '#101010'; cx.beginPath(); cx.ellipse(hx1, hy, p1.w * 0.095, hh * 0.6, 0, 0, 7); cx.fill();
      } else {
        quad(hx1, p1.w * 0.38, p1.y, hx2, p2.w * 0.38, p2.y, s.dirtC);
        quad(hx1 - p1.w * 0.1, p1.w * 0.1, p1.y, hx2 - p2.w * 0.1, p2.w * 0.1, p2.y, 'rgba(90,64,38,0.5)');
      }
    }
  }
  // Sprites: scenery, wildlife, vehicles — far to near, clipped at hill crests
  const buckets = [];
  function addVis(z, off, kind, obj) {
    const rz = ((z - position) % trackLen + trackLen) % trackLen;
    if (rz >= (drawN - 2) * segLen) return;
    const n = Math.floor(rz / segLen + pct); if (n < 1 || n >= drawN) return;
    const f = rz / segLen + pct - n;
    (buckets[n] = buckets[n] || []).push({ f: f, off: off, kind: kind, o: obj });
  }
  for (const r of rivals) addVis(r.z, r.off, 'moto', r);
  for (const t of traffic) addVis(t.z, t.off, t.type, t);
  for (let n = drawN - 1; n >= 1; n--) {
    const d = sd[n]; if (!d) continue;
    const i = (base + n) % N, spr = segs[i].spr, ani = segs[i].animal;
    if (spr || ani || buckets[n]) {
      cx.save(); cx.beginPath(); cx.rect(0, 0, W, d.clip); cx.clip();
      if (spr) drawScenery(spr, d.p1.x + spr.o * d.p1.w, d.p1.y, d.p1.w);
      if (ani && !ani.hit) {
        const ax = d.p1.x + ani.o * d.p1.w;
        if (ani.t === 'cow') { const aw = d.p1.w * 0.24; if (aw > 2.5) drawCow(ax, d.p1.y, aw); }
        else { const aw = d.p1.w * 0.2; if (aw > 2.5) drawDeer(ax, d.p1.y, aw); }
      }
      if (buckets[n]) {
        buckets[n].sort((a, b) => b.f - a.f);
        for (const v of buckets[n]) {
          const sx = lerp(d.p1.x, d.p2.x, v.f) + v.off * lerp(d.p1.w, d.p2.w, v.f);
          const sy = lerp(d.p1.y, d.p2.y, v.f);
          const w0 = lerp(d.p1.w, d.p2.w, v.f);
          if (v.kind === 'moto') { const sw = w0 * 0.17; if (sw > 1.5) drawMoto(sx, sy, sw, v.o.col, Math.sin(raceT + v.o.ph) * 0.2, false); }
          else if (v.kind === 'car') { const sw = w0 * 0.3; if (sw > 2) drawCar(sx, sy, sw, v.o.col); }
          else if (v.kind === 'truck') { const sw = w0 * 0.34; if (sw > 2) drawTruck(sx, sy, sw, v.o.col); }
          else if (v.kind === 'sbus') { const sw = w0 * 0.34; if (sw > 2) drawSchoolBus(sx, sy, sw); }
          else { const sw = w0 * 0.34; if (sw > 2) drawBus(sx, sy, sw, v.o.col); }
        }
      }
      cx.restore();
    }
  }
  const px = W / 2 + lean * 10, py = H - 24 + Math.sin(bounce) * Math.min(2, speed / 4000) + (bumpT > 0 ? Math.sin(bounce * 4) * 7 * bumpT : 0);
  if (T.night && (state === 'race' || state === 'count')) {
    cx.fillStyle = 'rgba(255,240,190,0.08)';
    cx.beginPath(); cx.moveTo(px - 26, H - 30); cx.lineTo(px - 95, H * 0.55); cx.lineTo(px + 95, H * 0.55); cx.lineTo(px + 26, H - 30); cx.fill();
  }
  const flicker = invulnT > 0 && Math.floor(invulnT * 12) % 2 === 0;
  if (crashing && fell) {
    // Over the cliff: bike and rider separate and tumble down, shrinking away
    const prog = 1 - crashTimer / crashDur;
    drawCrashBike(px - prog * 190, py - 40 + prog * 130, 84 * (1 - prog * 0.6), B(), -prog * 7);
    drawTumbleRider(px - prog * 110, py - 50 + prog * 150 - Math.sin(Math.min(prog * 1.3, 1) * Math.PI) * 60,
      4.6 * (1 - prog * 0.55), B(), -prog * 9, raceT, false);
  } else if (crashing) {
    // Highside: bike slides off spinning; rider flies over the bars, tumbles,
    // lands hard and skids to a stop in the dust
    const prog = 1 - crashTimer / crashDur;
    const slide = crashDir * (crashDur - crashTimer) * 95;
    const spin = 1 - Math.pow(1 - prog, 2); // fast spin early, settles lying flat
    drawCrashBike(px + slide, py - 24, 84, B(), crashDir * spin * 7.85);
    const air = Math.min(prog * 1.7, 1);
    const rx = px - crashDir * prog * 165;
    const ry = py - 14 - Math.sin(air * Math.PI) * 100;
    const landed = air >= 1;
    drawTumbleRider(rx, ry, 4.6, B(), landed ? crashDir * 1.5 : crashDir * prog * 10, raceT, landed);
  } else if (!flicker && (state === 'race' || state === 'count')) {
    const u = airDur > 0 ? Math.max(0, airT) / airDur : 0;
    const airOff = airT > 0 ? Math.sin((1 - u) * Math.PI) * (26 + airDur * 44) : 0;
    drawPlayerBike(px, py, 84, B(), lean, keyB && state === 'race', airOff);
  }
  for (const p of parts) {
    cx.globalAlpha = Math.min(1, p.life * 2);
    cx.fillStyle = p.col; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7); cx.fill();
  }
  cx.globalAlpha = 1;
  if (flashT > 0) { cx.fillStyle = 'rgba(226,75,74,' + (flashT * 0.5) + ')'; cx.fillRect(0, 0, W, H); }
  cx.restore();
  drawHud();
}

function drawHud() {
  cx.textBaseline = 'middle';
  if (cheatT > 0) {
    cx.fillStyle = 'rgba(20,24,32,0.85)'; rr(W / 2 - 210, H * 0.42, 420, 54, 10); cx.fill();
    cx.fillStyle = '#FAC775'; cx.font = '500 17px monospace'; cx.textAlign = 'center';
    cx.fillText('CHEATER MODE', W / 2, H * 0.42 + 20);
    cx.font = '12px monospace'; cx.fillStyle = '#9FE1CB';
    cx.fillText('all bikes + all tracks unlocked', W / 2, H * 0.42 + 40);
  }
  if (state === 'race' || state === 'count') {
    cx.fillStyle = 'rgba(20,24,32,0.72)';
    rr(12, 12, 150, 32, 8); cx.fill(); rr(W - 122, 12, 110, 32, 8); cx.fill(); rr(W / 2 - 62, 12, 170, 32, 8); cx.fill();
    cx.fillStyle = '#fff'; cx.font = '500 14px monospace'; cx.textAlign = 'left';
    if (T.p2p) {
      const togo = Math.max(0, (trackLen - 160 * segLen - position) / UPK);
      cx.fillText('TO GO ' + togo.toFixed(1) + 'km  ' + fmt(raceT), 24, 29);
    } else cx.fillText('Lap ' + Math.min(curLap + 1, 3) + '/3   ' + fmt(raceT), 24, 29);
    cx.textAlign = 'right';
    const rank = 1 + rivals.filter(r => r.z > position).length;
    cx.fillText('Pos ' + rank + '/13', W - 24, 29);
    cx.font = '11px monospace'; cx.textAlign = 'left'; cx.fillText('Lives', W / 2 - 50, 29);
    for (let i = 0; i < 5; i++) drawLifeIcon(W / 2 - 6 + i * 22, 28, i < lives);
    cx.fillStyle = 'rgba(20,24,32,0.72)'; rr(W - 152, H - 52, 140, 40, 8); cx.fill();
    cx.fillStyle = '#fff'; cx.font = '500 22px monospace'; cx.textAlign = 'right';
    cx.fillText(Math.round(speed / maxSpeed * 280), W - 82, H - 32);
    cx.font = '11px monospace'; cx.fillText('km/h', W - 52, H - 30);
    const gear = speed < 200 ? 'N' : String(1 + Math.min(5, Math.floor(speed / (maxSpeed * B().ts) * 6)));
    cx.font = '500 18px monospace'; cx.fillText(gear, W - 24, H - 33);
    cx.font = '11px monospace'; cx.fillText('gear', W - 20, H - 44);
    cx.fillStyle = 'rgba(20,24,32,0.72)'; rr(12, H - 40, armorLeft > 0 ? 150 : 110, 28, 8); cx.fill();
    cx.fillStyle = '#fff'; cx.font = '11px monospace'; cx.textAlign = 'left';
    cx.fillText(B().name + (armorLeft > 0 ? ' · armor ' + armorLeft : ''), 24, H - 26);
    if (B().sp === 'boost') {
      cx.fillStyle = 'rgba(20,24,32,0.72)'; rr(12, H - 74, 150, 26, 8); cx.fill();
      cx.fillStyle = boostOn ? '#4DD8E8' : '#fff'; cx.font = '500 11px monospace'; cx.fillText(boostOn ? 'YIKES!!!' : 'YIKES! (space)', 24, H - 61);
      cx.fillStyle = 'rgba(255,255,255,0.18)'; cx.fillRect(118, H - 66, 36, 10);
      cx.fillStyle = '#4DD8E8'; cx.fillRect(118, H - 66, 36 * boostM, 10);
    } else if (B().sp === 'jump') {
      cx.fillStyle = 'rgba(20,24,32,0.72)'; rr(12, H - 74, 150, 26, 8); cx.fill();
      const rdy = jumpCd <= 0 && airT <= 0;
      cx.fillStyle = airT > 0 ? '#FAC775' : rdy ? '#9FE1CB' : '#888'; cx.font = '500 11px monospace';
      cx.fillText(airT > 0 ? 'AIRBORNE!' : rdy ? 'JUMP (space)' : 'JUMP ...', 24, H - 61);
    }
    if (muted) {
      const my2 = B().sp ? H - 104 : H - 74;
      cx.fillStyle = 'rgba(20,24,32,0.72)'; rr(12, my2, 72, 26, 8); cx.fill();
      cx.fillStyle = '#fff'; cx.font = '11px monospace'; cx.fillText('muted', 24, my2 + 13);
    }
    if (crashing) {
      cx.textAlign = 'center'; cx.fillStyle = 'rgba(20,24,32,0.85)'; cx.font = '500 34px monospace';
      cx.fillText(fell ? 'Over the cliff!' : 'Crash!', W / 2, H * 0.32);
    } else if (staggerT > 0) {
      cx.textAlign = 'center'; cx.fillStyle = 'rgba(20,24,32,0.85)'; cx.font = '500 26px monospace';
      cx.fillText('Shrugged it off!', W / 2, H * 0.32);
    }
  }
  if (paused && (state === 'race' || state === 'count')) {
    cx.fillStyle = 'rgba(15,18,26,0.6)'; cx.fillRect(0, 0, W, H);
    cx.textAlign = 'center'; cx.fillStyle = '#fff'; cx.font = '500 40px monospace';
    cx.fillText('PAUSED', W / 2, H * 0.42);
    cx.fillStyle = '#FAC775'; cx.font = '500 14px monospace';
    cx.fillText('p: resume · q: save & exit (forfeits the race)', W / 2, H * 0.54);
  }
  if (state === 'count') {
    cx.textAlign = 'center'; cx.font = '500 64px monospace';
    cx.fillStyle = T.night ? '#fff' : 'rgba(20,24,32,0.85)';
    const n = Math.ceil(cd);
    cx.fillText(cd > 0 ? String(n) : 'GO!', W / 2, H * 0.35);
  }
  if (state === 'title') {
    cx.fillStyle = 'rgba(15,18,26,0.78)'; cx.fillRect(0, 0, W, H);
    cx.textAlign = 'center'; cx.fillStyle = '#fff';
    cx.font = '700 46px monospace'; cx.fillText('COAST RUN GP', W / 2, H * 0.22);
    cx.fillStyle = '#B4B2A9'; cx.font = '13px monospace';
    cx.fillText('a motorcycle road racing game', W / 2, H * 0.22 + 32);
    drawBikeSide(W / 2, H * 0.66, 210, B());
    cx.fillStyle = '#B4B2A9'; cx.font = '12px monospace';
    cx.fillText(B().name + ' · bikes ' + owned.length + '/' + BIKES.length + ' · tracks ' + unlockedT.length + '/' + THEMES.length, W / 2, H * 0.72);
    cx.font = '11px monospace'; cx.textAlign = 'right'; cx.fillText('Lives', W - 110, 28);
    for (let i = 0; i < 5; i++) drawLifeIcon(W - 94 + i * 18, 28, i < lives);
    cx.textAlign = 'center';
    if (Math.floor(performance.now() / 600) % 2 === 0) {
      cx.fillStyle = '#FAC775'; cx.font = '500 18px monospace';
      cx.fillText('PRESS ENTER TO START', W / 2, H * 0.86);
    }
  }
  if (state === 'ready') {
    cx.fillStyle = 'rgba(15,18,26,0.85)'; cx.fillRect(0, 0, W, H);
    cx.textAlign = 'center'; cx.fillStyle = '#fff';
    cx.font = '500 24px monospace'; cx.fillText('Choose your race', W / 2, 30);
    cx.font = '12px monospace'; cx.fillStyle = '#B4B2A9'; cx.fillText('Riding the ' + B().name + ' · tracks unlocked: ' + unlockedT.length + '/' + THEMES.length, W / 2, 56);
    cx.font = '11px monospace'; cx.textAlign = 'right'; cx.fillStyle = '#B4B2A9'; cx.fillText('Lives', W - 110, 28);
    for (let i = 0; i < 5; i++) drawLifeIcon(W - 94 + i * 18, 28, i < lives);
    for (let i = 0; i < THEMES.length; i++) {
      drawCourseCard(i, 30 + (i % 4) * 160, 70 + Math.floor(i / 4) * 100);
    }
    cx.fillStyle = '#FAC775'; cx.font = '500 13px monospace'; cx.textAlign = 'center';
    cx.fillText('← → choose · enter: race · b: garage · q: save & exit · any finish = +1 life', W / 2, H - 20);
    if (newBikeT > 0 && newBike >= 0) {
      cx.fillStyle = 'rgba(20,24,32,0.95)'; rr(W / 2 - 170, H / 2 - 80, 340, 160, 12); cx.fill();
      cx.strokeStyle = '#FAC775'; cx.lineWidth = 2; rr(W / 2 - 170, H / 2 - 80, 340, 160, 12); cx.stroke();
      cx.fillStyle = '#FAC775'; cx.font = '500 16px monospace';
      cx.fillText('NEW BIKE!', W / 2, H / 2 - 56);
      drawBikeSide(W / 2, H / 2 + 28, 150, BIKES[newBike]);
      cx.fillStyle = '#fff'; cx.font = '500 15px monospace';
      cx.fillText(BIKES[newBike].name, W / 2, H / 2 + 46);
      cx.fillStyle = '#B4B2A9'; cx.font = '11px monospace';
      cx.fillText(BIKES[newBike].fl, W / 2, H / 2 + 64);
    }
  }
  if (state === 'garage') {
    cx.fillStyle = 'rgba(15,18,26,0.85)'; cx.fillRect(0, 0, W, H);
    cx.textAlign = 'center'; cx.fillStyle = '#fff';
    cx.font = '500 24px monospace'; cx.fillText('Garage', W / 2, 32);
    cx.font = '12px monospace'; cx.fillStyle = '#B4B2A9'; cx.fillText('Pick your ride · enter: choose race · b: title · q: save & exit', W / 2, 56);
    for (let i = 0; i < owned.length; i++) {
      const bk = BIKES[owned[i]];
      const gx = 22 + (i % 5) * 128, gy = 78 + Math.floor(i / 5) * 106;
      cx.fillStyle = '#222a38'; rr(gx, gy, 122, 96, 10); cx.fill();
      drawBikeSide(gx + 61, gy + 70, 88, bk);
      cx.fillStyle = '#fff'; cx.font = '500 12px monospace'; cx.textAlign = 'center';
      cx.fillText(bk.name, gx + 61, gy + 84);
      if (bk.tier > 1) { cx.fillStyle = bk.tier === 3 ? '#4DD8E8' : '#FAC775'; cx.font = '10px monospace'; cx.fillText('Tier ' + bk.tier, gx + 61, gy + 12); }
      if (selG === i) { cx.strokeStyle = '#FAC775'; cx.lineWidth = 2.5; rr(gx, gy, 122, 96, 10); cx.stroke(); }
    }
    const sb = BIKES[owned[selG]];
    cx.fillStyle = '#222a38'; rr(30, H - 100, W - 60, 86, 10); cx.fill();
    cx.fillStyle = '#fff'; cx.font = '500 15px monospace'; cx.textAlign = 'left';
    cx.fillText(sb.name, 50, H - 80);
    cx.fillStyle = '#B4B2A9'; cx.font = '12px monospace';
    cx.fillText(sb.fl + (sb.armor ? ' · absorbs ' + sb.armor + ' crash' + (sb.armor > 1 ? 'es' : '') + ' per race' : ''), 50, H - 60);
    drawStatBars(sb, 250, H - 76);
    cx.fillStyle = '#FAC775'; cx.font = '500 12px monospace'; cx.textAlign = 'left';
    cx.fillText('enter: choose race', 50, H - 32);
  }
  if (state === 'reward') {
    cx.fillStyle = 'rgba(15,18,26,0.88)'; cx.fillRect(0, 0, W, H);
    cx.textAlign = 'center'; cx.fillStyle = '#fff';
    cx.font = '500 26px monospace'; cx.fillText('Podium reward — choose one', W / 2, 52);
    const tot = rewardOpts.length * 160 - 10, x0 = (W - tot) / 2;
    for (let i = 0; i < rewardOpts.length; i++) {
      const o = rewardOpts[i], gx = x0 + i * 160;
      cx.fillStyle = '#222a38'; rr(gx, 110, 150, 155, 10); cx.fill();
      if (o.t === 'life') {
        cx.save(); cx.translate(gx + 75, 165); cx.scale(2.2, 2.2); cx.translate(-(gx + 75), -165); drawLifeIcon(gx + 75, 165, true); cx.restore();
        cx.fillStyle = '#fff'; cx.font = '500 14px monospace';
        cx.fillText('Extra life', gx + 75, 220);
        cx.fillStyle = '#B4B2A9'; cx.font = '11px monospace';
        cx.fillText('Live to wreck again', gx + 75, 240);
      } else if (o.t === 'mbike') {
        cx.fillStyle = '#FAC775'; cx.font = '700 52px monospace';
        cx.fillText('?', gx + 75, 170);
        cx.fillStyle = '#fff'; cx.font = '500 14px monospace';
        cx.fillText('Mystery bike', gx + 75, 220);
        cx.fillStyle = '#B4B2A9'; cx.font = '11px monospace';
        cx.fillText('Random tier ' + o.tier + ' machine', gx + 75, 240);
      } else {
        const th = THEMES[o.k];
        cx.fillStyle = th.sky; cx.fillRect(gx + 18, 135, 114, 46);
        cx.fillStyle = th.night ? th.mtFar : th.mtNear;
        if (th.night) { cx.fillRect(gx + 28, 148, 12, 33); cx.fillRect(gx + 48, 142, 16, 39); cx.fillRect(gx + 72, 150, 12, 31); cx.fillRect(gx + 92, 144, 16, 37); }
        else { cx.beginPath(); cx.moveTo(gx + 22, 181); cx.lineTo(gx + 60, 146); cx.lineTo(gx + 100, 181); cx.fill(); }
        cx.fillStyle = '#fff'; cx.font = '500 14px monospace';
        cx.fillText(th.name, gx + 75, 220);
        cx.fillStyle = '#B4B2A9'; cx.font = '11px monospace';
        cx.fillText('New course unlocked', gx + 75, 240);
      }
      if (selR === i) { cx.strokeStyle = '#FAC775'; cx.lineWidth = 2.5; rr(gx, 110, 150, 155, 10); cx.stroke(); }
    }
    cx.fillStyle = '#FAC775'; cx.font = '500 15px monospace';
    cx.fillText('← → choose · enter to claim', W / 2, H - 60);
  }
  if (state === 'over' && finalRank <= 3) {
    cx.fillStyle = 'rgba(20,24,32,0.82)'; rr(W / 2 - 230, H * 0.08, 460, H * 0.84, 14); cx.fill();
    cx.textAlign = 'center'; cx.fillStyle = '#fff';
    cx.font = '500 28px monospace';
    cx.fillText(finalRank === 1 ? 'You won on ' + T.name + '!' : 'Podium at ' + T.name + '!', W / 2, H * 0.17);
    const t = performance.now() / 1000;
    const baseY = H * 0.72;
    const podCols = ['#cfcdc4', '#bfbdb4', '#aFada4'];
    const slots = [{ x: W / 2, h: 74, n: '1' }, { x: W / 2 - 92, h: 52, n: '2' }, { x: W / 2 + 92, h: 40, n: '3' }];
    for (let i = 2; i >= 0; i--) {
      const s = slots[i];
      cx.fillStyle = podCols[i]; cx.fillRect(s.x - 40, baseY - s.h, 80, s.h);
      cx.fillStyle = '#444441'; cx.font = '500 22px monospace';
      cx.fillText(s.n, s.x, baseY - s.h / 2);
      const pc = podiumCols[i];
      if (pc) drawStandRider(s.x, baseY - s.h, pc.col, pc.me, t);
    }
    if (finalRank === 1) drawCup(W / 2 - 150, H * 0.2, 30);
    cx.fillStyle = '#fff'; cx.font = '14px monospace';
    cx.fillText('Total ' + fmt(raceT) + (lapTimes.length ? ' · best lap ' + fmt(Math.min.apply(null, lapTimes)) : ''), W / 2, H * 0.79);
    cx.fillStyle = '#9FE1CB';
    cx.fillText((bonusLife ? 'Finish bonus +1 life (' + lives + ' in hand)' : 'Lives full (' + lives + ')') + (pendingReward ? ' · reward awaits' : ''), W / 2, H * 0.845);
    cx.fillStyle = '#FAC775'; cx.font = '500 15px monospace';
    cx.fillText('Click or press enter to continue', W / 2, H * 0.9);
    for (const c of conf) {
      cx.save(); cx.translate(c.x, c.y); cx.rotate(c.rot);
      cx.fillStyle = c.col; cx.fillRect(-3, -2, 6, 4);
      cx.restore();
    }
  } else if (state === 'over' || state === 'dead') {
    cx.fillStyle = 'rgba(20,24,32,0.78)'; rr(W / 2 - 210, H * 0.16, 420, H * 0.58, 14); cx.fill();
    cx.textAlign = 'center'; cx.fillStyle = '#fff';
    cx.font = '500 30px monospace';
    cx.fillText(state === 'dead' ? 'Wrecked!' : 'Race complete', W / 2, H * 0.27);
    cx.font = '15px monospace';
    if (state === 'dead') {
      cx.fillText(T.p2p ? 'You ran out of lives ' + (position / UPK).toFixed(1) + 'km into ' + T.name + '.' : 'You ran out of lives on lap ' + Math.min(curLap + 1, 3) + ' of ' + T.name + '.', W / 2, H * 0.38);
      cx.fillText('Time on track: ' + fmt(raceT), W / 2, H * 0.45);
      cx.fillStyle = '#F0997B'; cx.fillText('Career over — garage, tracks and lives reset', W / 2, H * 0.52);
      cx.fillStyle = '#FAC775'; cx.font = '500 17px monospace';
      cx.fillText('Click or press enter — fresh start, cafe racer, 3 lives', W / 2, H * 0.64);
    } else {
      cx.fillText('Final position: ' + finalRank + ' of 13 on ' + T.name, W / 2, H * 0.39);
      cx.fillText('Total ' + fmt(raceT) + (lapTimes.length ? ' · best lap ' + fmt(Math.min.apply(null, lapTimes)) : ''), W / 2, H * 0.46);
      cx.fillStyle = '#9FE1CB';
      cx.fillText(bonusLife ? 'You finished — +1 life (' + lives + ' in hand)' : 'You finished — lives already full (' + lives + ')', W / 2, H * 0.53);
      cx.fillStyle = '#FAC775'; cx.font = '500 17px monospace';
      cx.fillText('Click or press enter for course select', W / 2, H * 0.64);
    }
  }
}

let last = performance.now();
function frame(t) {
  const dt = Math.min((t - last) / 1000, 0.05); last = t;
  update(dt); render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
