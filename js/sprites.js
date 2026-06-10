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

// Generic sportbike used for all 12 rivals
function drawMoto(bx, by, w, col, ln, brake) {
  cx.save(); cx.translate(bx, by); cx.rotate(ln * 0.4);
  cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.beginPath(); cx.ellipse(0, 2, w * 0.6, w * 0.11, 0, 0, 7); cx.fill();
  cx.fillStyle = '#15151a'; rr(-w * 0.13, -w * 0.38, w * 0.26, w * 0.4, w * 0.06); cx.fill();
  cx.fillStyle = '#3a3a42'; cx.fillRect(-w * 0.025, -w * 0.32, w * 0.05, w * 0.28);
  cx.fillStyle = '#b9bdc4'; rr(w * 0.15, -w * 0.64, w * 0.13, w * 0.34, w * 0.05); cx.fill();
  cx.fillStyle = col; cx.beginPath();
  cx.moveTo(-w * 0.24, -w * 0.46); cx.lineTo(-w * 0.31, -w * 0.8); cx.lineTo(w * 0.31, -w * 0.8); cx.lineTo(w * 0.24, -w * 0.46); cx.closePath(); cx.fill();
  cx.fillStyle = brake ? '#FF3B30' : '#8a3434'; cx.fillRect(-w * 0.15, -w * 0.68, w * 0.3, w * 0.07);
  cx.fillStyle = '#23262e'; rr(-w * 0.2, -w * 1.02, w * 0.4, w * 0.3, w * 0.08); cx.fill();
  cx.fillStyle = '#2b3445'; cx.beginPath();
  cx.moveTo(-w * 0.2, -w * 0.96); cx.lineTo(-w * 0.34, -w * 1.32); cx.lineTo(w * 0.34, -w * 1.32); cx.lineTo(w * 0.2, -w * 0.96); cx.closePath(); cx.fill();
  cx.strokeStyle = '#23262e'; cx.lineWidth = Math.max(1, w * 0.085); cx.lineCap = 'round';
  cx.beginPath(); cx.moveTo(-w * 0.28, -w * 1.24); cx.lineTo(-w * 0.44, -w * 0.98); cx.moveTo(w * 0.28, -w * 1.24); cx.lineTo(w * 0.44, -w * 0.98); cx.stroke();
  cx.fillStyle = '#e8e8ec'; cx.beginPath(); cx.arc(0, -w * 1.46, w * 0.165, 0, 7); cx.fill();
  cx.fillStyle = col; cx.beginPath(); cx.arc(0, -w * 1.46, w * 0.165, Math.PI * 1.15, Math.PI * 1.85); cx.lineTo(0, -w * 1.46); cx.fill();
  cx.restore();
}

// Player bike — four distinct silhouettes by bike kind (cafe, enduro, hog, rice)
function drawPlayerBike(bx, by, w, bk, ln, brake) {
  cx.save(); cx.translate(bx, by); cx.rotate(ln * 0.4);
  const col = bk.col, c2 = bk.col2, k = bk.kind;
  cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.beginPath(); cx.ellipse(0, 2, w * 0.62, w * 0.11, 0, 0, 7); cx.fill();
  if (k === 'hog') {
    cx.fillStyle = '#15151a'; rr(-w * 0.18, -w * 0.36, w * 0.36, w * 0.38, w * 0.08); cx.fill();
    cx.fillStyle = col; cx.beginPath(); cx.moveTo(-w * 0.3, -w * 0.34); cx.quadraticCurveTo(0, -w * 0.62, w * 0.3, -w * 0.34); cx.lineTo(w * 0.24, -w * 0.26); cx.quadraticCurveTo(0, -w * 0.5, -w * 0.24, -w * 0.26); cx.closePath(); cx.fill();
    cx.fillStyle = '#1c1c1c'; rr(-w * 0.56, -w * 0.66, w * 0.2, w * 0.4, w * 0.05); cx.fill(); rr(w * 0.36, -w * 0.66, w * 0.2, w * 0.4, w * 0.05); cx.fill();
    cx.fillStyle = '#b9bdc4'; rr(-w * 0.5, -w * 0.3, w * 0.12, w * 0.22, w * 0.05); cx.fill(); rr(w * 0.38, -w * 0.3, w * 0.12, w * 0.22, w * 0.05); cx.fill();
    cx.fillStyle = col; cx.beginPath(); cx.moveTo(-w * 0.3, -w * 0.42); cx.lineTo(-w * 0.34, -w * 0.78); cx.lineTo(w * 0.34, -w * 0.78); cx.lineTo(w * 0.3, -w * 0.42); cx.closePath(); cx.fill();
    cx.fillStyle = c2; cx.beginPath(); cx.moveTo(-w * 0.18, -w * 0.55); cx.quadraticCurveTo(0, -w * 0.72, w * 0.18, -w * 0.55); cx.quadraticCurveTo(0, -w * 0.62, -w * 0.18, -w * 0.55); cx.fill();
    cx.fillStyle = brake ? '#FF3B30' : '#8a3434'; cx.fillRect(-w * 0.16, -w * 0.5, w * 0.32, w * 0.08);
    cx.fillStyle = '#23262e'; rr(-w * 0.24, -w * 1.06, w * 0.48, w * 0.34, w * 0.1); cx.fill();
    cx.fillStyle = '#2b3445'; cx.beginPath(); cx.moveTo(-w * 0.24, -w * 1.0); cx.lineTo(-w * 0.38, -w * 1.34); cx.lineTo(w * 0.38, -w * 1.34); cx.lineTo(w * 0.24, -w * 1.0); cx.closePath(); cx.fill();
    cx.strokeStyle = '#23262e'; cx.lineWidth = Math.max(1, w * 0.09); cx.lineCap = 'round';
    cx.beginPath(); cx.moveTo(-w * 0.3, -w * 1.28); cx.lineTo(-w * 0.46, -w * 1.5); cx.moveTo(w * 0.3, -w * 1.28); cx.lineTo(w * 0.46, -w * 1.5); cx.stroke();
    cx.strokeStyle = '#b9bdc4'; cx.lineWidth = Math.max(1, w * 0.045);
    cx.beginPath(); cx.moveTo(-w * 0.46, -w * 1.5); cx.lineTo(-w * 0.46, -w * 1.62); cx.moveTo(w * 0.46, -w * 1.5); cx.lineTo(w * 0.46, -w * 1.62); cx.stroke();
    cx.fillStyle = '#1c1c22'; cx.beginPath(); cx.arc(0, -w * 1.48, w * 0.155, 0, 7); cx.fill();
    cx.fillStyle = c2; cx.fillRect(-w * 0.15, -w * 1.5, w * 0.3, w * 0.05);
  } else if (k === 'enduro') {
    cx.fillStyle = '#15151a'; rr(-w * 0.1, -w * 0.42, w * 0.2, w * 0.44, w * 0.05); cx.fill();
    cx.fillStyle = '#1c1c1c';
    for (let i = 0; i < 4; i++) { cx.fillRect(-w * 0.13, -w * 0.4 + i * w * 0.11, w * 0.03, w * 0.05); cx.fillRect(w * 0.1, -w * 0.4 + i * w * 0.11, w * 0.03, w * 0.05); }
    cx.fillStyle = c2; cx.beginPath(); cx.moveTo(-w * 0.2, -w * 0.52); cx.lineTo(-w * 0.26, -w * 0.66); cx.lineTo(w * 0.3, -w * 0.78); cx.lineTo(w * 0.22, -w * 0.56); cx.closePath(); cx.fill();
    cx.fillStyle = '#b9bdc4'; rr(w * 0.13, -w * 0.95, w * 0.11, w * 0.42, w * 0.05); cx.fill();
    cx.fillStyle = col; cx.beginPath(); cx.moveTo(-w * 0.18, -w * 0.5); cx.lineTo(-w * 0.24, -w * 0.95); cx.lineTo(w * 0.24, -w * 0.95); cx.lineTo(w * 0.18, -w * 0.5); cx.closePath(); cx.fill();
    cx.fillStyle = brake ? '#FF3B30' : '#8a3434'; cx.fillRect(-w * 0.1, -w * 0.62, w * 0.2, w * 0.06);
    cx.fillStyle = '#23262e'; rr(-w * 0.19, -w * 1.18, w * 0.38, w * 0.3, w * 0.08); cx.fill();
    cx.fillStyle = '#2b3445'; cx.beginPath(); cx.moveTo(-w * 0.19, -w * 1.12); cx.lineTo(-w * 0.33, -w * 1.46); cx.lineTo(w * 0.33, -w * 1.46); cx.lineTo(w * 0.19, -w * 1.12); cx.closePath(); cx.fill();
    cx.fillStyle = col; cx.fillRect(-w * 0.05, -w * 1.44, w * 0.1, w * 0.3);
    cx.strokeStyle = '#23262e'; cx.lineWidth = Math.max(1, w * 0.08); cx.lineCap = 'round';
    cx.beginPath(); cx.moveTo(-w * 0.27, -w * 1.4); cx.lineTo(-w * 0.48, -w * 1.22); cx.moveTo(w * 0.27, -w * 1.4); cx.lineTo(w * 0.48, -w * 1.22); cx.stroke();
    cx.fillStyle = c2; cx.beginPath(); cx.ellipse(-w * 0.5, -w * 1.24, w * 0.07, w * 0.09, 0.4, 0, 7); cx.ellipse(w * 0.5, -w * 1.24, w * 0.07, w * 0.09, -0.4, 0, 7); cx.fill();
    cx.fillStyle = '#e8e8ec'; cx.beginPath(); cx.arc(0, -w * 1.6, w * 0.16, 0, 7); cx.fill();
    cx.fillStyle = col; cx.fillRect(-w * 0.2, -w * 1.72, w * 0.4, w * 0.06);
    cx.fillStyle = '#1c1c22'; cx.fillRect(-w * 0.11, -w * 1.57, w * 0.22, w * 0.05);
  } else if (k === 'rice') {
    cx.fillStyle = '#15151a'; rr(-w * 0.13, -w * 0.38, w * 0.26, w * 0.4, w * 0.06); cx.fill();
    cx.fillStyle = '#b9bdc4'; rr(-w * 0.1, -w * 0.72, w * 0.08, w * 0.26, w * 0.03); cx.fill(); rr(w * 0.02, -w * 0.72, w * 0.08, w * 0.26, w * 0.03); cx.fill();
    cx.fillStyle = col; cx.beginPath();
    cx.moveTo(-w * 0.22, -w * 0.44); cx.lineTo(-w * 0.3, -w * 0.84); cx.lineTo(w * 0.3, -w * 0.84); cx.lineTo(w * 0.22, -w * 0.44); cx.closePath(); cx.fill();
    cx.fillStyle = c2; cx.beginPath(); cx.moveTo(-w * 0.28, -w * 0.76); cx.lineTo(-w * 0.3, -w * 0.84); cx.lineTo(w * 0.3, -w * 0.84); cx.lineTo(w * 0.28, -w * 0.76); cx.closePath(); cx.fill();
    cx.fillStyle = '#23262e'; cx.fillRect(-w * 0.38, -w * 0.98, w * 0.07, w * 0.18); cx.fillRect(w * 0.31, -w * 0.98, w * 0.07, w * 0.18);
    cx.fillStyle = c2; rr(-w * 0.46, -w * 1.04, w * 0.92, w * 0.08, w * 0.03); cx.fill();
    cx.fillStyle = brake ? '#FF3B30' : '#8a3434'; cx.fillRect(-w * 0.14, -w * 0.7, w * 0.28, w * 0.06);
    cx.fillStyle = '#23262e'; rr(-w * 0.19, -w * 1.0, w * 0.38, w * 0.26, w * 0.08); cx.fill();
    cx.fillStyle = '#2b3445'; cx.beginPath();
    cx.moveTo(-w * 0.19, -w * 0.94); cx.lineTo(-w * 0.33, -w * 1.3); cx.lineTo(w * 0.33, -w * 1.3); cx.lineTo(w * 0.19, -w * 0.94); cx.closePath(); cx.fill();
    cx.fillStyle = col; cx.fillRect(-w * 0.05, -w * 1.28, w * 0.1, w * 0.3);
    cx.strokeStyle = '#23262e'; cx.lineWidth = Math.max(1, w * 0.08); cx.lineCap = 'round';
    cx.beginPath(); cx.moveTo(-w * 0.27, -w * 1.22); cx.lineTo(-w * 0.43, -w * 0.96); cx.moveTo(w * 0.27, -w * 1.22); cx.lineTo(w * 0.43, -w * 0.96); cx.stroke();
    cx.fillStyle = '#e8e8ec'; cx.beginPath(); cx.arc(0, -w * 1.44, w * 0.16, 0, 7); cx.fill();
    cx.fillStyle = c2; cx.beginPath(); cx.arc(0, -w * 1.44, w * 0.16, Math.PI * 1.15, Math.PI * 1.85); cx.lineTo(0, -w * 1.44); cx.fill();
    cx.fillStyle = '#1c1c22'; cx.fillRect(-w * 0.11, -w * 1.41, w * 0.22, w * 0.05);
  } else { // cafe
    cx.fillStyle = '#15151a'; rr(-w * 0.12, -w * 0.38, w * 0.24, w * 0.4, w * 0.06); cx.fill();
    cx.fillStyle = '#b9bdc4'; cx.beginPath(); cx.arc(0, -w * 0.38, w * 0.16, Math.PI, Math.PI * 2); cx.fill();
    cx.fillStyle = '#b9bdc4'; rr(-w * 0.46, -w * 0.4, w * 0.1, w * 0.3, w * 0.04); cx.fill(); rr(w * 0.36, -w * 0.4, w * 0.1, w * 0.3, w * 0.04); cx.fill();
    cx.fillStyle = col; cx.beginPath();
    cx.moveTo(-w * 0.26, -w * 0.42); cx.lineTo(-w * 0.28, -w * 0.7); cx.lineTo(w * 0.28, -w * 0.7); cx.lineTo(w * 0.26, -w * 0.42); cx.closePath(); cx.fill();
    cx.fillStyle = c2; rr(-w * 0.26, -w * 0.78, w * 0.52, w * 0.1, w * 0.04); cx.fill();
    cx.fillStyle = brake ? '#FF3B30' : '#8a3434'; cx.beginPath(); cx.arc(0, -w * 0.52, w * 0.07, 0, 7); cx.fill();
    cx.fillStyle = '#23262e'; rr(-w * 0.2, -w * 1.06, w * 0.4, w * 0.32, w * 0.08); cx.fill();
    cx.fillStyle = '#2b3445'; cx.beginPath();
    cx.moveTo(-w * 0.2, -w * 1.0); cx.lineTo(-w * 0.32, -w * 1.38); cx.lineTo(w * 0.32, -w * 1.38); cx.lineTo(w * 0.2, -w * 1.0); cx.closePath(); cx.fill();
    cx.strokeStyle = '#23262e'; cx.lineWidth = Math.max(1, w * 0.08); cx.lineCap = 'round';
    cx.beginPath(); cx.moveTo(-w * 0.26, -w * 1.3); cx.lineTo(-w * 0.42, -w * 1.06); cx.moveTo(w * 0.26, -w * 1.3); cx.lineTo(w * 0.42, -w * 1.06); cx.stroke();
    cx.fillStyle = '#e8e8ec'; cx.beginPath(); cx.arc(0, -w * 1.52, w * 0.16, 0, 7); cx.fill();
    cx.fillStyle = col; cx.beginPath(); cx.arc(0, -w * 1.52, w * 0.16, Math.PI * 1.15, Math.PI * 1.85); cx.lineTo(0, -w * 1.52); cx.fill();
    cx.fillStyle = '#1c1c22'; cx.fillRect(-w * 0.11, -w * 1.49, w * 0.22, w * 0.05);
  }
  cx.restore();
}

function drawCar(x, y, w, col) {
  cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.beginPath(); cx.ellipse(x, y + 2, w * 0.55, w * 0.1, 0, 0, 7); cx.fill();
  cx.fillStyle = '#1c1c1c'; cx.fillRect(x - w * 0.47, y - w * 0.16, w * 0.13, w * 0.16); cx.fillRect(x + w * 0.34, y - w * 0.16, w * 0.13, w * 0.16);
  cx.fillStyle = col; rr(x - w * 0.5, y - w * 0.52, w, w * 0.44, w * 0.07); cx.fill();
  rr(x - w * 0.37, y - w * 0.8, w * 0.74, w * 0.34, w * 0.08); cx.fill();
  cx.fillStyle = '#26333f'; rr(x - w * 0.3, y - w * 0.75, w * 0.6, w * 0.23, w * 0.04); cx.fill();
  cx.fillStyle = '#E24B4A'; cx.fillRect(x - w * 0.44, y - w * 0.44, w * 0.12, w * 0.08); cx.fillRect(x + w * 0.32, y - w * 0.44, w * 0.12, w * 0.08);
  cx.fillStyle = '#999'; cx.fillRect(x - w * 0.1, y - w * 0.3, w * 0.2, w * 0.1);
}

function drawTruck(x, y, w, col) {
  cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.beginPath(); cx.ellipse(x, y + 2, w * 0.55, w * 0.1, 0, 0, 7); cx.fill();
  cx.fillStyle = '#1c1c1c'; cx.fillRect(x - w * 0.46, y - w * 0.15, w * 0.14, w * 0.15); cx.fillRect(x + w * 0.32, y - w * 0.15, w * 0.14, w * 0.15);
  cx.fillStyle = '#555'; cx.fillRect(x - w * 0.5, y - w * 0.22, w, w * 0.1);
  cx.fillStyle = col; rr(x - w * 0.5, y - w * 1.35, w, w * 1.16, w * 0.04); cx.fill();
  cx.strokeStyle = 'rgba(0,0,0,0.18)'; cx.lineWidth = Math.max(1, w * 0.02);
  cx.beginPath(); cx.moveTo(x, y - w * 1.32); cx.lineTo(x, y - w * 0.24); cx.stroke();
  cx.fillStyle = '#E24B4A'; cx.fillRect(x - w * 0.46, y - w * 0.2, w * 0.1, w * 0.07); cx.fillRect(x + w * 0.36, y - w * 0.2, w * 0.1, w * 0.07);
}

function drawBus(x, y, w, col) {
  cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.beginPath(); cx.ellipse(x, y + 2, w * 0.55, w * 0.1, 0, 0, 7); cx.fill();
  cx.fillStyle = '#1c1c1c'; cx.fillRect(x - w * 0.45, y - w * 0.14, w * 0.13, w * 0.14); cx.fillRect(x + w * 0.32, y - w * 0.14, w * 0.13, w * 0.14);
  cx.fillStyle = col; rr(x - w * 0.5, y - w * 1.25, w, w * 1.12, w * 0.09); cx.fill();
  cx.fillStyle = '#26333f'; rr(x - w * 0.4, y - w * 1.08, w * 0.8, w * 0.3, w * 0.05); cx.fill();
  cx.fillStyle = '#555'; cx.fillRect(x - w * 0.5, y - w * 0.24, w, w * 0.1);
  cx.fillStyle = '#E24B4A'; cx.fillRect(x - w * 0.45, y - w * 0.36, w * 0.1, w * 0.08); cx.fillRect(x + w * 0.35, y - w * 0.36, w * 0.1, w * 0.08);
}

function drawDeer(x, y, w) {
  cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.beginPath(); cx.ellipse(x, y + 1, w * 0.5, w * 0.09, 0, 0, 7); cx.fill();
  cx.strokeStyle = '#7a5230'; cx.lineWidth = Math.max(1.5, w * 0.07); cx.lineCap = 'round';
  cx.beginPath();
  cx.moveTo(x - w * 0.3, y - w * 0.55); cx.lineTo(x - w * 0.32, y);
  cx.moveTo(x - w * 0.12, y - w * 0.55); cx.lineTo(x - w * 0.12, y);
  cx.moveTo(x + w * 0.12, y - w * 0.55); cx.lineTo(x + w * 0.12, y);
  cx.moveTo(x + w * 0.3, y - w * 0.55); cx.lineTo(x + w * 0.32, y); cx.stroke();
  cx.fillStyle = '#9a6b42'; cx.beginPath(); cx.ellipse(x, y - w * 0.68, w * 0.42, w * 0.26, 0, 0, 7); cx.fill();
  cx.fillStyle = '#a87a50'; cx.beginPath(); cx.ellipse(x, y - w * 1.12, w * 0.19, w * 0.23, 0, 0, 7); cx.fill();
  cx.fillStyle = '#c9a87e'; cx.beginPath(); cx.ellipse(x, y - w * 1.02, w * 0.1, w * 0.1, 0, 0, 7); cx.fill();
  cx.fillStyle = '#a87a50'; cx.beginPath(); cx.ellipse(x - w * 0.22, y - w * 1.26, w * 0.09, w * 0.05, -0.5, 0, 7); cx.ellipse(x + w * 0.22, y - w * 1.26, w * 0.09, w * 0.05, 0.5, 0, 7); cx.fill();
  cx.strokeStyle = '#6b4a2f'; cx.lineWidth = Math.max(1, w * 0.045);
  cx.beginPath();
  cx.moveTo(x - w * 0.12, y - w * 1.3); cx.lineTo(x - w * 0.2, y - w * 1.55); cx.moveTo(x - w * 0.17, y - w * 1.45); cx.lineTo(x - w * 0.28, y - w * 1.52);
  cx.moveTo(x + w * 0.12, y - w * 1.3); cx.lineTo(x + w * 0.2, y - w * 1.55); cx.moveTo(x + w * 0.17, y - w * 1.45); cx.lineTo(x + w * 0.28, y - w * 1.52); cx.stroke();
  cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(x - w * 0.08, y - w * 1.16, w * 0.05, 0, 7); cx.arc(x + w * 0.08, y - w * 1.16, w * 0.05, 0, 7); cx.fill();
  cx.fillStyle = '#1c1c1c'; cx.beginPath(); cx.arc(x - w * 0.08, y - w * 1.16, w * 0.025, 0, 7); cx.arc(x + w * 0.08, y - w * 1.16, w * 0.025, 0, 7); cx.fill();
  cx.beginPath(); cx.ellipse(x, y - w * 0.96, w * 0.04, w * 0.03, 0, 0, 7); cx.fill();
}

function drawCow(x, y, w) {
  cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.beginPath(); cx.ellipse(x, y + 1, w * 0.55, w * 0.1, 0, 0, 7); cx.fill();
  cx.strokeStyle = '#3a3632'; cx.lineWidth = Math.max(2, w * 0.09); cx.lineCap = 'round';
  cx.beginPath();
  cx.moveTo(x - w * 0.32, y - w * 0.45); cx.lineTo(x - w * 0.34, y);
  cx.moveTo(x - w * 0.12, y - w * 0.45); cx.lineTo(x - w * 0.12, y);
  cx.moveTo(x + w * 0.12, y - w * 0.45); cx.lineTo(x + w * 0.12, y);
  cx.moveTo(x + w * 0.32, y - w * 0.45); cx.lineTo(x + w * 0.34, y); cx.stroke();
  cx.fillStyle = '#ece8de'; rr(x - w * 0.5, y - w * 0.92, w, w * 0.52, w * 0.16); cx.fill();
  cx.fillStyle = '#2c2c2a';
  cx.beginPath(); cx.ellipse(x - w * 0.26, y - w * 0.72, w * 0.14, w * 0.11, 0.3, 0, 7); cx.fill();
  cx.beginPath(); cx.ellipse(x + w * 0.22, y - w * 0.56, w * 0.12, w * 0.09, -0.4, 0, 7); cx.fill();
  cx.fillStyle = '#ece8de'; rr(x - w * 0.17, y - w * 1.34, w * 0.34, w * 0.5, w * 0.1); cx.fill();
  cx.fillStyle = '#2c2c2a'; cx.beginPath(); cx.ellipse(x - w * 0.09, y - w * 1.22, w * 0.09, w * 0.11, 0.2, 0, 7); cx.fill();
  cx.fillStyle = '#ece8de'; cx.beginPath();
  cx.ellipse(x - w * 0.26, y - w * 1.24, w * 0.1, w * 0.06, -0.4, 0, 7); cx.ellipse(x + w * 0.26, y - w * 1.24, w * 0.1, w * 0.06, 0.4, 0, 7); cx.fill();
  cx.strokeStyle = '#d8c9a0'; cx.lineWidth = Math.max(1.5, w * 0.05);
  cx.beginPath(); cx.arc(x - w * 0.17, y - w * 1.34, w * 0.09, Math.PI * 0.9, Math.PI * 1.6); cx.stroke();
  cx.beginPath(); cx.arc(x + w * 0.17, y - w * 1.34, w * 0.09, Math.PI * 1.4, Math.PI * 2.1); cx.stroke();
  cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(x - w * 0.08, y - w * 1.2, w * 0.05, 0, 7); cx.arc(x + w * 0.08, y - w * 1.2, w * 0.05, 0, 7); cx.fill();
  cx.fillStyle = '#1c1c1c'; cx.beginPath(); cx.arc(x - w * 0.08, y - w * 1.2, w * 0.025, 0, 7); cx.arc(x + w * 0.08, y - w * 1.2, w * 0.025, 0, 7); cx.fill();
  cx.fillStyle = '#d8a0a0'; rr(x - w * 0.11, y - w * 1.02, w * 0.22, w * 0.14, w * 0.06); cx.fill();
  cx.fillStyle = '#a06868'; cx.beginPath(); cx.arc(x - w * 0.05, y - w * 0.95, w * 0.02, 0, 7); cx.arc(x + w * 0.05, y - w * 0.95, w * 0.02, 0, 7); cx.fill();
}

function drawScenery(sp, x, y, w) {
  if (w < 2) return;
  if (sp.t === 'pine') {
    const s = w * 0.45;
    cx.fillStyle = '#6b4a2f'; cx.fillRect(x - s * 0.08, y - s * 0.5, s * 0.16, s * 0.5);
    cx.fillStyle = '#2F6B3C';
    for (let k = 0; k < 3; k++) {
      const yy = y - s * (0.4 + k * 0.55), ww = s * (1.1 - k * 0.28);
      cx.beginPath(); cx.moveTo(x - ww / 2, yy); cx.lineTo(x, yy - s * 0.75); cx.lineTo(x + ww / 2, yy); cx.fill();
    }
  } else if (sp.t === 'tree') {
    const s = w * 0.45;
    cx.fillStyle = '#6b4a2f'; cx.fillRect(x - s * 0.09, y - s * 0.9, s * 0.18, s * 0.9);
    cx.fillStyle = '#3D7A47'; cx.beginPath(); cx.arc(x, y - s * 1.2, s * 0.62, 0, 7); cx.fill();
    cx.fillStyle = '#4C8F53'; cx.beginPath(); cx.arc(x - s * 0.25, y - s * 1.38, s * 0.4, 0, 7); cx.fill();
  } else if (sp.t === 'bush') {
    const s = w * 0.3;
    cx.fillStyle = '#4C8F53'; cx.beginPath(); cx.ellipse(x, y - s * 0.3, s * 0.7, s * 0.4, 0, 0, 7); cx.fill();
  } else if (sp.t === 'shrub') {
    const s = w * 0.3;
    cx.fillStyle = '#A89B5F'; cx.beginPath(); cx.ellipse(x, y - s * 0.3, s * 0.65, s * 0.38, 0, 0, 7); cx.fill();
  } else if (sp.t === 'cactus') {
    const s = w * 0.4;
    cx.fillStyle = '#4F8A5B';
    rr(x - s * 0.12, y - s * 1.6, s * 0.24, s * 1.6, s * 0.12); cx.fill();
    rr(x - s * 0.55, y - s * 1.45, s * 0.16, s * 0.6, s * 0.08); cx.fill();
    cx.fillRect(x - s * 0.55, y - s * 1.0, s * 0.43, s * 0.14);
    rr(x + s * 0.38, y - s * 1.25, s * 0.16, s * 0.5, s * 0.08); cx.fill();
    cx.fillRect(x + s * 0.12, y - s * 0.88, s * 0.42, s * 0.14);
  } else if (sp.t === 'rock') {
    const s = w * 0.32;
    cx.fillStyle = '#8a8478'; cx.beginPath(); cx.ellipse(x, y - s * 0.4, s * 0.75, s * 0.5, 0, 0, 7); cx.fill();
    cx.fillStyle = '#9b9588'; cx.beginPath(); cx.ellipse(x - s * 0.2, y - s * 0.55, s * 0.4, s * 0.28, 0, 0, 7); cx.fill();
  } else if (sp.t === 'lamp') {
    const s = w * 0.4;
    cx.fillStyle = '#6a6e76'; cx.fillRect(x - s * 0.05, y - s * 1.7, s * 0.1, s * 1.7);
    cx.fillRect(x - s * 0.05, y - s * 1.7, s * 0.3, s * 0.07);
    cx.fillStyle = '#FAC775'; cx.beginPath(); cx.arc(x + s * 0.25, y - s * 1.6, s * 0.09, 0, 7); cx.fill();
    cx.fillStyle = 'rgba(250,199,117,0.18)'; cx.beginPath(); cx.arc(x + s * 0.25, y - s * 1.55, s * 0.4, 0, 7); cx.fill();
  } else if (sp.t === 'sign') {
    const s = w * 0.3;
    cx.fillStyle = '#777'; cx.fillRect(x - s * 0.06, y - s * 1.1, s * 0.12, s * 1.1);
    cx.fillStyle = '#D84A3A'; rr(x - s * 0.55, y - s * 1.7, s * 1.1, s * 0.62, s * 0.08); cx.fill();
    cx.fillStyle = '#fff';
    const d = sp.d;
    cx.beginPath(); cx.moveTo(x - d * s * 0.28, y - s * 1.6); cx.lineTo(x + d * s * 0.22, y - s * 1.39); cx.lineTo(x - d * s * 0.28, y - s * 1.18); cx.fill();
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
    cx.fillStyle = '#B4B2A9'; cx.font = '11px system-ui'; cx.textAlign = 'left';
    cx.fillText(STATL[i], col, row);
    cx.fillStyle = 'rgba(255,255,255,0.18)'; cx.fillRect(col + 72, row - 5, 110, 9);
    cx.fillStyle = bk.bars[i] > 0.75 ? '#9FE1CB' : bk.bars[i] < 0.25 ? '#F0997B' : '#FAC775';
    cx.fillRect(col + 72, row - 5, 110 * bk.bars[i], 9);
  }
}

function drawCourseCard(i, gx, gy) {
  const th = THEMES[i];
  const locked = unlockedT.indexOf(i) < 0;
  cx.fillStyle = '#222a38'; rr(gx, gy, 150, 118, 10); cx.fill();
  if (th.mystery) {
    cx.fillStyle = '#1a2030'; cx.fillRect(gx + 10, gy + 8, 130, 38);
    const mc = ['#378ADD', '#1D9E75', '#EF9F27', '#D4537E', '#7F77DD'];
    for (let k = 0; k < 5; k++) { cx.fillStyle = mc[k]; cx.fillRect(gx + 12 + k * 25, gy + 38, 22, 6); }
    cx.fillStyle = '#FAC775'; cx.font = '500 24px system-ui'; cx.textAlign = 'center';
    cx.fillText('?', gx + 75, gy + 27);
  } else {
    cx.fillStyle = th.sky; cx.fillRect(gx + 10, gy + 8, 130, 28);
    if (th.night) {
      cx.fillStyle = th.mtFar;
      cx.fillRect(gx + 16, gy + 16, 12, 20); cx.fillRect(gx + 34, gy + 12, 14, 24); cx.fillRect(gx + 54, gy + 18, 12, 18); cx.fillRect(gx + 72, gy + 10, 16, 26); cx.fillRect(gx + 94, gy + 16, 12, 20); cx.fillRect(gx + 112, gy + 13, 14, 23);
      cx.fillStyle = 'rgba(250,199,117,0.8)';
      for (let k = 0; k < 8; k++) cx.fillRect(gx + 19 + k * 13, gy + 18 + (k % 3) * 5, 2, 3);
    } else {
      cx.fillStyle = th.mtNear;
      cx.beginPath(); cx.moveTo(gx + 10, gy + 36); cx.lineTo(gx + 45, gy + 14); cx.lineTo(gx + 80, gy + 36); cx.fill();
      cx.beginPath(); cx.moveTo(gx + 62, gy + 36); cx.lineTo(gx + 100, gy + 10); cx.lineTo(gx + 140, gy + 36); cx.fill();
    }
    cx.fillStyle = th.gA; cx.fillRect(gx + 10, gy + 36, 130, 12);
    if (th.cliff) { cx.fillStyle = '#2E7FB0'; cx.fillRect(gx + 10, gy + 36, 44, 12); }
    cx.fillStyle = th.rA || '#676767';
    cx.beginPath(); cx.moveTo(gx + 66, gy + 48); cx.lineTo(gx + 84, gy + 48); cx.lineTo(gx + 78, gy + 36); cx.lineTo(gx + 72, gy + 36); cx.fill();
  }
  cx.fillStyle = locked ? '#888' : '#fff'; cx.font = '500 14px system-ui'; cx.textAlign = 'center';
  cx.fillText(th.name, gx + 75, gy + 64);
  cx.font = '10px system-ui'; cx.fillStyle = locked ? '#777' : '#B4B2A9';
  cx.fillText(th.d1, gx + 75, gy + 82);
  cx.fillText(th.d2, gx + 75, gy + 96);
  if (locked) {
    cx.fillStyle = 'rgba(15,18,26,0.55)'; rr(gx, gy, 150, 118, 10); cx.fill();
    cx.fillStyle = '#FAC775'; cx.font = '500 12px system-ui';
    cx.fillText('Locked · podium reward', gx + 75, gy + 110);
  }
  if (sel === i && !locked) { cx.strokeStyle = '#FAC775'; cx.lineWidth = 2.5; rr(gx, gy, 150, 118, 10); cx.stroke(); }
}
