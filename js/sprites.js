// Coast Run GP — drawing library: projection, bikes, vehicles, wildlife,
// scenery, backgrounds, and UI widgets. All hand-drawn canvas shapes.

function project(xr, yr, z) {
  const s = camD / Math.max(z, 1);
  return { x: Math.round(W / 2 + s * xr * W / 2), y: Math.round(H / 2 - s * yr * H / 2), w: s * roadW * W / 2, s: s };
}

function rr(x, y, w, h, r) {
  cx.beginPath(); cx.moveTo(x + r, y);
  cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r);
  cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath();
}

function quad(x1, w1, y1, x2, w2, y2, col) {
  cx.fillStyle = col; cx.beginPath();
  cx.moveTo(x1 - w1, y1 + 1); cx.lineTo(x1 + w1, y1 + 1); cx.lineTo(x2 + w2, y2); cx.lineTo(x2 - w2, y2); cx.fill();
}

// Night dressing for traffic, sized off the sprite width. Rear views get a
// taillight pair; oncoming front views get glowing headlights.
function tailLights(x, y, w, ox, oy) {
  cx.globalAlpha = 0.25; cx.fillStyle = '#FF3B30';
  cx.beginPath(); cx.arc(x - w * ox, y - w * oy, w * 0.14, 0, 7); cx.arc(x + w * ox, y - w * oy, w * 0.14, 0, 7); cx.fill();
  cx.globalAlpha = 1; cx.fillStyle = 'rgba(255,59,48,0.9)';
  cx.fillRect(x - w * (ox + 0.05), y - w * oy - w * 0.035, w * 0.1, w * 0.07);
  cx.fillRect(x + w * (ox - 0.05), y - w * oy - w * 0.035, w * 0.1, w * 0.07);
}
function headLights(x, y, w, ox, oy) {
  cx.globalAlpha = 0.3; cx.fillStyle = '#fff2c0';
  cx.beginPath(); cx.arc(x - w * ox, y - w * oy, w * 0.22, 0, 7); cx.arc(x + w * ox, y - w * oy, w * 0.22, 0, 7); cx.fill();
  cx.globalAlpha = 1; cx.fillStyle = '#fff2c0';
  cx.beginPath(); cx.arc(x - w * ox, y - w * oy, w * 0.09, 0, 7); cx.arc(x + w * ox, y - w * oy, w * 0.09, 0, 7); cx.fill();
}

// Generic sportbike used for all 12 rivals — pixel sprite, palette-swapped per rival
function drawMoto(bx, by, w, col, ln, brake, rot, night) {
  cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.beginPath(); cx.ellipse(bx, by + 2, w * 0.6, w * 0.11, 0, 0, 7); cx.fill();
  if (night && rot === undefined) {
    // headlight pool on the road ahead + taillight glow — rivals read as bikes in
    // the dark (skipped while they're spilled and lying flat)
    cx.fillStyle = 'rgba(255,240,190,0.12)';
    cx.beginPath(); cx.ellipse(bx, by - w * 1.75, w * 0.55, w * 0.18, 0, 0, 7); cx.fill();
    cx.fillStyle = 'rgba(255,59,48,0.5)';
    cx.beginPath(); cx.arc(bx, by - w * 0.5, w * 0.1, 0, 7); cx.fill();
  }
  const img = pxSprite('rival', PX_RIVAL, { 1: col, 2: hexMix(col, 0.55), r: brake || night ? '#FF3B30' : '#8a3434' }, true);
  pxBlit(img, bx, by, w / 17.8, rot !== undefined ? rot : ln * 0.4);   // rot = spilled rival lying down
}

// Tier-safe grid lookup (tier-3 kinds have a single grid)
function bikeGrid(set, bk) { const a = set[bk.kind]; return a[Math.min(bk.tier, a.length) - 1]; }

// Player bike (rear view) — pixel sprites per kind + tier, from js/pixelart.js.
// airOff lifts the bike off its shadow while jumping.
function drawPlayerBike(bx, by, w, bk, ln, brake, airOff) {
  const a = airOff || 0;
  const shrink = Math.max(0.45, 1 - a / 160);
  cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.beginPath(); cx.ellipse(bx, by + 2, w * 0.62 * shrink, w * 0.11 * shrink, 0, 0, 7); cx.fill();
  const grid = bikeGrid(PX_PLAYER, bk);
  const img = pxSprite('pb-' + bk.kind + bk.tier + (brake ? 'B' : ''), grid, bikePal(bk, brake), true);
  pxBlit(img, bx, by - a, w / 21, ln * 0.4);
  if (bk.sp === 'siren') drawSirenLights(bx, by - a, w / 21, ln * 0.4);
}

// Flashing police light bar, drawn over the rear-view bike in the same transform so it
// leans and jumps with it. Bright alternating red/blue when the siren is engaged; dim
// but lit when off, so the Police bike always reads as the Police bike.
function drawSirenLights(bx, by, s, rot) {
  const on = typeof sirenOn !== 'undefined' && sirenOn;
  const phase = Math.floor(performance.now() / 130) % 2;   // ~4 flips/sec
  const ly = -s * 17, r = s * 1.7, off = s * 2.4;
  cx.save();
  cx.translate(bx, by); cx.rotate(rot);
  for (let i = 0; i < 2; i++) {
    const isRed = i === 0;
    const lx = (isRed ? -1 : 1) * off;
    const lit = on ? (phase === (isRed ? 0 : 1)) : true;
    const col = isRed ? '#FF3B30' : '#2E7BFF';
    if (lit && on) { cx.globalAlpha = 0.45; cx.fillStyle = col; cx.beginPath(); cx.arc(lx, ly, r * 2.2, 0, 7); cx.fill(); cx.globalAlpha = 1; }
    cx.fillStyle = lit ? col : (isRed ? '#6e1d18' : '#173360');
    cx.fillRect(lx - r, ly - r * 0.75, r * 2, r * 1.5);
  }
  cx.fillStyle = '#14141b'; cx.fillRect(-off - r - s * 0.3, ly + r * 0.8, off * 2 + r * 2 + s * 0.6, s * 0.7); // bar base
  cx.restore();
}

// Player bike (side view, riderless) — garage and reward cards. w = target drawn width.
function drawBikeSide(bx, by, w, bk) {
  const grid = bikeGrid(PXS_PLAYER, bk);
  const img = pxSprite('sb-' + bk.kind + bk.tier, grid, bikePal(bk, false), false);
  pxBlit(img, bx, by, w / 28, 0);
  if (bk.sp === 'siren') {
    // little beacon flashing on the rear cowl so the Police bike reads in the garage too
    const sc = w / 28, phase = Math.floor(performance.now() / 130) % 2, r = sc * 1.5;
    const lx = bx - w * 0.2, ly = by - 13 * sc;
    for (let i = 0; i < 2; i++) {
      const isRed = i === 0, lit = phase === (isRed ? 0 : 1);
      cx.fillStyle = lit ? (isRed ? '#FF3B30' : '#2E7BFF') : (isRed ? '#6e1d18' : '#173360');
      cx.beginPath(); cx.arc(lx + (isRed ? -r : r), ly, r, 0, 7); cx.fill();
    }
  }
}

// Crashed bike — the riderless side view tumbling/sliding on its side.
function drawCrashBike(bx, by, w, bk, rot) {
  const grid = bikeGrid(PXS_PLAYER, bk);
  const img = pxSprite('sb-' + bk.kind + bk.tier, grid, bikePal(bk, false), false);
  pxBlitC(img, bx, by, w / 28, rot);
}

// Rider thrown from the bike — flails while airborne, lies flat after landing.
function drawTumbleRider(bx, by, scale, bk, rot, t, flat) {
  const fr = flat ? 0 : Math.floor(t * 9) % 2;
  const grid = fr ? PX_TUMBLE2 : PX_TUMBLE1;
  const img = pxSprite('tum' + (fr ? 2 : 1) + bk.kind + bk.tier, grid, bikePal(bk, false), false);
  pxBlitC(img, bx, by, scale, rot);
}

// Clouds drift with parallax; a bird flock crosses day skies now and then.
function drawSkyDecor(t, night) {
  const pal = night ? { w: '#3c4257', s: '#2e3346' } : { w: '#f4f6f8', s: '#d8dfe8' };
  for (let k = 0; k < 3; k++) {
    const span = W + 220;
    const cxp = ((k * 263 + 48 - bgShift * 0.06 - t * (4 + k * 2)) % span + span) % span - 110;
    const grid = k % 2 ? PX_CLOUD2 : PX_CLOUD1;
    pxBlit(pxSprite('cloud' + (k % 2), grid, pal, false), cxp, 40 + ((k * 53) % 64), k === 1 ? 3 : 4, 0);
  }
  if (!night) {
    const span = W + 420;
    const bp = ((t * 36) % span) - 210;
    for (let k = 0; k < 4; k++) {
      const bx = bp - k * 17, by = 48 + (k % 2) * 8 + Math.sin(t * 2 + k) * 4;
      if (bx < -10 || bx > W + 10) continue;
      const fr = Math.floor(t * 6 + k) % 2;
      pxBlit(pxSprite('bird' + fr, fr ? PX_BIRD2 : PX_BIRD1, null, false), bx, by, 2, 0);
    }
  }
}

function drawCar(x, y, w, col, night) {
  cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.beginPath(); cx.ellipse(x, y + 2, w * 0.55, w * 0.1, 0, 0, 7); cx.fill();
  pxBlit(pxSprite('car', PX_CAR, { 1: col, 5: hexMix(col, 1.35) }, true), x, y, w / 20, 0);
  if (night) tailLights(x, y, w, 0.42, 0.32);
}

function drawTruck(x, y, w, col, night) {
  cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.beginPath(); cx.ellipse(x, y + 2, w * 0.55, w * 0.1, 0, 0, 7); cx.fill();
  pxBlit(pxSprite('truck', PX_TRUCK, { 1: col, 2: hexMix(col, 0.6), 5: hexMix(col, 1.35) }, true), x, y, w / 20, 0);
  if (night) tailLights(x, y, w, 0.42, 0.25);
}

// Front views for oncoming traffic (headlights glow via the static 'f' palette colour;
// at night they get a real glow halo on top).
function drawCarFront(x, y, w, col, night) {
  cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.beginPath(); cx.ellipse(x, y + 2, w * 0.55, w * 0.1, 0, 0, 7); cx.fill();
  pxBlit(pxSprite('carF', PX_CAR_F, { 1: col, 5: hexMix(col, 1.35) }, true), x, y, w / 20, 0);
  if (night) headLights(x, y, w, 0.42, 0.33);
}

function drawTruckFront(x, y, w, col, night) {
  cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.beginPath(); cx.ellipse(x, y + 2, w * 0.55, w * 0.1, 0, 0, 7); cx.fill();
  pxBlit(pxSprite('truckF', PX_TRUCK_F, { 1: col, 2: hexMix(col, 0.6), 5: hexMix(col, 1.35) }, true), x, y, w / 20, 0);
  if (night) headLights(x, y, w, 0.42, 0.3);
}

function drawBus(x, y, w, col, night) {
  cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.beginPath(); cx.ellipse(x, y + 2, w * 0.55, w * 0.1, 0, 0, 7); cx.fill();
  pxBlit(pxSprite('bus', PX_BUS, { 1: col, 2: hexMix(col, 0.6) }, true), x, y, w / 20, 0);
  if (night) tailLights(x, y, w, 0.42, 0.25);
}

// The Greisen school bus — full-grid sprite so the name reads. On The School Run the
// whole fleet is out; stopped buses get alternating red wig-wag lights up top.
function drawSchoolBus(x, y, w, stopped, night) {
  cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.beginPath(); cx.ellipse(x, y + 2, w * 0.6, w * 0.1, 0, 0, 7); cx.fill();
  pxBlit(pxSprite('sbus', PX_SBUS, null, false), x, y, w / 24, 0);
  if (night) tailLights(x, y, w, 0.45, 0.22);
  if (stopped) {
    const ph = Math.floor(performance.now() / 350) % 2;
    const ly = y - w * 0.92, r = Math.max(1.5, w * 0.05);
    cx.fillStyle = ph ? '#FF3B30' : '#7a1d18'; cx.fillRect(x - w * 0.52 - r, ly, r * 2, r * 2);
    cx.fillStyle = ph ? '#7a1d18' : '#FF3B30'; cx.fillRect(x + w * 0.52 - r, ly, r * 2, r * 2);
    if (ph) { cx.globalAlpha = 0.3; cx.fillStyle = '#FF3B30'; cx.beginPath(); cx.arc(x - w * 0.52, ly + r, r * 3, 0, 7); cx.fill(); cx.globalAlpha = 1; }
    else { cx.globalAlpha = 0.3; cx.fillStyle = '#FF3B30'; cx.beginPath(); cx.arc(x + w * 0.52, ly + r, r * 3, 0, 7); cx.fill(); cx.globalAlpha = 1; }
  }
}

// The Crossing Guard — stationary hazard on The School Run. Hi-vis vest, STOP sign.
function drawGuard(x, y, w) {
  cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.beginPath(); cx.ellipse(x, y + 1, w * 0.5, w * 0.09, 0, 0, 7); cx.fill();
  pxBlit(pxSprite('guard', PX_GUARD, null, false), x, y, w / 11, 0);
}

function drawDeer(x, y, w) {
  cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.beginPath(); cx.ellipse(x, y + 1, w * 0.5, w * 0.09, 0, 0, 7); cx.fill();
  pxBlit(pxSprite('deer', PX_DEER, null, true), x, y, w / 14, 0);
}

// Full grid (not mirrored) so the Holstein patches read natural — and no face seam.
function drawCow(x, y, w) {
  cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.beginPath(); cx.ellipse(x, y + 1, w * 0.55, w * 0.1, 0, 0, 7); cx.fill();
  pxBlit(pxSprite('cow', PX_COW, null, false), x, y, w / 14, 0);
}

// The squirrel — a furry pothole. Kicks you around; never crashes you.
function drawSquirrel(x, y, w) {
  cx.fillStyle = 'rgba(0,0,0,0.2)'; cx.beginPath(); cx.ellipse(x, y + 1, w * 0.5, w * 0.08, 0, 0, 7); cx.fill();
  pxBlit(pxSprite('squir', PX_SQUIR, null, false), x, y, w / 9, 0);
}

function drawScenery(sp, x, y, w) {
  if (w < 2) return;
  if (sp.t === 'pine') pxBlit(pxSprite('pine', PX_PINE, null, true), x, y, w / 34, 0);
  else if (sp.t === 'pine2') pxBlit(pxSprite('pine2', PX_PINE2, null, true), x, y, w / 32, 0);
  else if (sp.t === 'tree') pxBlit(pxSprite('tree', PX_TREE, null, false), x, y, w / 30, 0);
  else if (sp.t === 'oak') pxBlit(pxSprite('oak', PX_OAK, null, false), x, y, w / 28, 0);
  else if (sp.t === 'bush') pxBlit(pxSprite('bush', PX_BUSH, null, false), x, y, w / 46, 0);
  else if (sp.t === 'shrub') pxBlit(pxSprite('shrub', PX_SHRUB, null, false), x, y, w / 46, 0);
  else if (sp.t === 'cactus') pxBlit(pxSprite('cactus', PX_CACTUS, null, false), x, y, w / 36, 0);
  else if (sp.t === 'cactus2') pxBlit(pxSprite('cactus2', PX_CACTUS2, null, false), x, y, w / 33, 0);
  else if (sp.t === 'barrel') pxBlit(pxSprite('barrel', PX_BARREL, null, false), x, y, w / 50, 0);
  else if (sp.t === 'rock') pxBlit(pxSprite('rock', PX_ROCK, null, false), x, y, w / 42, 0);
  else if (sp.t === 'lamp') {
    pxBlit(pxSprite('lamp', PX_LAMP, null, false), x, y, w / 26, 0);
    const s = w * 0.4;
    cx.fillStyle = 'rgba(250,199,117,0.18)'; cx.beginPath(); cx.arc(x + s * 0.2, y - s * 1.45, s * 0.4, 0, 7); cx.fill();
  } else if (sp.t === 'sign') {
    pxBlit(pxSprite('sign', PX_SIGN, null, false, sp.d < 0), x, y, w / 40, 0);
  }
}

const fmt = t => { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };

// Jagged mountain silhouette (day courses)
function drawRange(yBase, amp, col, shift, step) {
  cx.fillStyle = col; cx.beginPath(); cx.moveTo(-10, yBase);
  for (let px = -10; px <= W + 10; px += 8) {
    const u = (px + shift) / step, i0 = Math.floor(u), f = u - i0;
    const h = lerp(MP[((i0 % 48) + 48) % 48], MP[(((i0 + 1) % 48) + 48) % 48], f);
    cx.lineTo(px, yBase - h * amp);
  }
  cx.lineTo(W + 10, yBase); cx.fill();
}

// Building silhouettes with lit windows (Neon City)
function drawSkyline(yB, amp, col, shift, stepW) {
  const offN = Math.floor(shift / stepW);
  const count = Math.ceil(W / stepW) + 2;
  for (let k = -1; k < count; k++) {
    const idx = (((k + offN) % 48) + 48) % 48;
    const h = 22 + MP[idx] * amp;
    const bx = k * stepW - ((shift % stepW) + stepW) % stepW;
    cx.fillStyle = col; cx.fillRect(bx, yB - h, stepW - 4, h);
    cx.fillStyle = 'rgba(250,199,117,0.65)';
    for (let wy = 0; wy < 3; wy++) for (let wx = 0; wx < 2; wx++) {
      if ((idx * 7 + wy * 3 + wx) % 3 === 0) cx.fillRect(bx + 5 + wx * 9, yB - h + 6 + wy * 10, 3, 4);
    }
  }
}

function drawLifeIcon(x, y, on) {
  cx.globalAlpha = on ? 1 : 0.25;
  cx.fillStyle = '#e8e8ec'; cx.beginPath(); cx.arc(x, y, 7, 0, 7); cx.fill();
  cx.fillStyle = '#E24B4A'; cx.beginPath(); cx.arc(x, y, 7, Math.PI * 1.1, Math.PI * 1.9); cx.lineTo(x, y); cx.fill();
  cx.fillStyle = '#1c1c22'; cx.fillRect(x - 5, y + 1, 10, 3);
  cx.globalAlpha = 1;
}

function drawStandRider(x, y, col, me, t) {
  const hop = me ? Math.abs(Math.sin(t * 4)) * 5 : 0;
  const yy = y - hop;
  cx.fillStyle = '#23262e'; cx.fillRect(x - 7, yy - 22, 5, 22); cx.fillRect(x + 2, yy - 22, 5, 22);
  cx.fillStyle = col; rr(x - 9, yy - 44, 18, 24, 4); cx.fill();
  cx.strokeStyle = col; cx.lineWidth = 5; cx.lineCap = 'round';
  if (me) { cx.beginPath(); cx.moveTo(x - 8, yy - 40); cx.lineTo(x - 16, yy - 56); cx.moveTo(x + 8, yy - 40); cx.lineTo(x + 16, yy - 56); cx.stroke(); }
  else { cx.beginPath(); cx.moveTo(x - 8, yy - 40); cx.lineTo(x - 12, yy - 26); cx.moveTo(x + 8, yy - 40); cx.lineTo(x + 12, yy - 26); cx.stroke(); }
  cx.fillStyle = '#e8e8ec'; cx.beginPath(); cx.arc(x, yy - 52, 8, 0, 7); cx.fill();
  cx.fillStyle = '#1c1c22'; cx.fillRect(x - 6, yy - 54, 12, 3);
  if (me) { cx.fillStyle = '#FAC775'; cx.beginPath(); cx.moveTo(x, yy - 78); cx.lineTo(x - 6, yy - 68); cx.lineTo(x + 6, yy - 68); cx.fill(); }
}

function drawCup(x, y, s) {
  cx.fillStyle = '#FAC775';
  cx.beginPath(); cx.moveTo(x - s * 0.5, y - s); cx.lineTo(x + s * 0.5, y - s); cx.lineTo(x + s * 0.3, y - s * 0.35); cx.lineTo(x - s * 0.3, y - s * 0.35); cx.fill();
  cx.fillRect(x - s * 0.08, y - s * 0.35, s * 0.16, s * 0.25);
  cx.fillRect(x - s * 0.3, y - s * 0.1, s * 0.6, s * 0.1);
  cx.strokeStyle = '#FAC775'; cx.lineWidth = Math.max(1.5, s * 0.09);
  cx.beginPath(); cx.arc(x - s * 0.55, y - s * 0.78, s * 0.18, Math.PI * 0.4, Math.PI * 1.5); cx.stroke();
  cx.beginPath(); cx.arc(x + s * 0.55, y - s * 0.78, s * 0.18, Math.PI * 1.5, Math.PI * 2.6); cx.stroke();
}

function drawStatBars(bk, x0, y0) {
  for (let i = 0; i < 6; i++) {
    const col = i < 3 ? x0 : x0 + 220;
    const row = y0 + (i % 3) * 22;
    cx.fillStyle = '#B4B2A9'; cx.font = '11px monospace'; cx.textAlign = 'left';
    cx.fillText(STATL[i], col, row);
    cx.fillStyle = 'rgba(255,255,255,0.18)'; cx.fillRect(col + 72, row - 5, 110, 9);
    cx.fillStyle = bk.bars[i] > 0.75 ? '#9FE1CB' : bk.bars[i] < 0.25 ? '#F0997B' : '#FAC775';
    cx.fillRect(col + 72, row - 5, 110 * bk.bars[i], 9);
  }
}

function drawCourseCard(i, gx, gy) {
  const th = THEMES[i];
  const locked = unlockedT.indexOf(i) < 0;
  cx.fillStyle = '#222a38'; rr(gx, gy, 150, 92, 10); cx.fill();
  if (th.mystery) {
    cx.fillStyle = '#1a2030'; cx.fillRect(gx + 10, gy + 8, 130, 30);
    const mc = ['#378ADD', '#1D9E75', '#EF9F27', '#D4537E', '#7F77DD'];
    for (let k = 0; k < 5; k++) { cx.fillStyle = mc[k]; cx.fillRect(gx + 12 + k * 25, gy + 31, 22, 5); }
    cx.fillStyle = '#FAC775'; cx.font = '500 20px monospace'; cx.textAlign = 'center';
    cx.fillText('?', gx + 75, gy + 22);
  } else {
    cx.fillStyle = th.sky; cx.fillRect(gx + 10, gy + 8, 130, 22);
    if (th.night) {
      cx.fillStyle = th.mtFar;
      cx.fillRect(gx + 16, gy + 14, 12, 16); cx.fillRect(gx + 34, gy + 11, 14, 19); cx.fillRect(gx + 54, gy + 15, 12, 15); cx.fillRect(gx + 72, gy + 10, 16, 20); cx.fillRect(gx + 94, gy + 14, 12, 16); cx.fillRect(gx + 112, gy + 12, 14, 18);
      cx.fillStyle = 'rgba(250,199,117,0.8)';
      for (let k = 0; k < 8; k++) cx.fillRect(gx + 19 + k * 13, gy + 15 + (k % 3) * 4, 2, 3);
    } else {
      cx.fillStyle = th.mtNear;
      cx.beginPath(); cx.moveTo(gx + 10, gy + 30); cx.lineTo(gx + 45, gy + 13); cx.lineTo(gx + 80, gy + 30); cx.fill();
      cx.beginPath(); cx.moveTo(gx + 62, gy + 30); cx.lineTo(gx + 100, gy + 10); cx.lineTo(gx + 140, gy + 30); cx.fill();
    }
    cx.fillStyle = th.gA; cx.fillRect(gx + 10, gy + 30, 130, 8);
    if (th.cliff) { cx.fillStyle = '#2E7FB0'; cx.fillRect(gx + 10, gy + 30, 44, 8); }
    cx.fillStyle = th.rA || '#676767';
    cx.beginPath(); cx.moveTo(gx + 67, gy + 38); cx.lineTo(gx + 83, gy + 38); cx.lineTo(gx + 78, gy + 30); cx.lineTo(gx + 72, gy + 30); cx.fill();
  }
  if (th.epic) {
    cx.fillStyle = '#4DD8E8'; cx.font = '700 9px monospace'; cx.textAlign = 'right';
    cx.fillText('EPIC', gx + 138, gy + 14);
  }
  cx.fillStyle = locked ? '#888' : '#fff'; cx.font = '500 13px monospace'; cx.textAlign = 'center';
  cx.fillText(th.name, gx + 75, gy + 58);
  if (locked) {
    cx.fillStyle = 'rgba(15,18,26,0.55)'; rr(gx, gy, 150, 92, 10); cx.fill();
    cx.fillStyle = '#FAC775'; cx.font = '500 10px monospace'; cx.textAlign = 'center';
    cx.fillText('Locked · podium previous', gx + 75, gy + 82);
  }
  if (sel === i && !locked) { cx.strokeStyle = '#FAC775'; cx.lineWidth = 2.5; rr(gx, gy, 150, 92, 10); cx.stroke(); }
}
