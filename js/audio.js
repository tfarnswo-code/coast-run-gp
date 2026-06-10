// Coast Run GP — WebAudio: engine voices, wind, crashes, chiptune jingles.
// Browsers require a user gesture before audio starts; initAudio() is called
// from the first click/enter in main.js.

let AC = null, master = null, eng = null, windG = null, noiseBuf = null;
let muted = false;

function initAudio() {
  if (AC) { AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 1; master.connect(AC.destination);
    const o1 = AC.createOscillator(); o1.type = 'sawtooth';
    const o2 = AC.createOscillator(); o2.type = 'square';
    const eg = AC.createGain(); eg.gain.value = 0;
    const ef = AC.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 820;
    o1.connect(eg); o2.connect(eg); eg.connect(ef); ef.connect(master);
    o1.start(); o2.start();
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const ws = AC.createBufferSource(); ws.buffer = noiseBuf; ws.loop = true;
    const wf = AC.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 550;
    windG = AC.createGain(); windG.gain.value = 0;
    ws.connect(wf); wf.connect(windG); windG.connect(master); ws.start();
    eng = { o1: o1, o2: o2, g: eg, f: ef, snd: '' };
  } catch (e) { AC = null; }
}

function beep(f, d) {
  if (!AC || muted) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine'; o.frequency.value = f;
  g.gain.setValueAtTime(0.16, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + d);
  o.connect(g); g.connect(master); o.start(); o.stop(AC.currentTime + d);
}

function note(f, t0, d, type, vol) {
  if (!AC || muted) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = f;
  const t = AC.currentTime + t0;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.setValueAtTime(vol, t + d - 0.04);
  g.gain.linearRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.05);
}

function winJingle() {
  const m = [[523, 0, 0.14], [659, 0.14, 0.14], [784, 0.28, 0.14], [1047, 0.42, 0.3], [784, 0.76, 0.13], [1047, 0.9, 0.55]];
  for (const n of m) note(n[0], n[1], n[2], 'square', 0.1);
  const b = [[262, 0, 0.42], [330, 0.42, 0.34], [392, 0.76, 0.7]];
  for (const n of b) note(n[0], n[1], n[2], 'triangle', 0.12);
}

function loseJingle() {
  const m = [[392, 0, 0.3], [370, 0.34, 0.3], [349, 0.68, 0.3], [330, 1.02, 0.75]];
  for (const n of m) note(n[0], n[1], n[2], 'square', 0.09);
  note(165, 1.02, 0.75, 'triangle', 0.12);
}

function thud() {
  if (!AC || muted) return;
  note(70, 0, 0.12, 'square', 0.22);
  const s = AC.createBufferSource(); s.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.18, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.12);
  s.connect(f); f.connect(g); g.connect(master); s.start(); s.stop(AC.currentTime + 0.15);
}

function crashSnd() {
  if (!AC || muted) return;
  const s = AC.createBufferSource(); s.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.4, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.7);
  s.connect(f); f.connect(g); g.connect(master); s.start(); s.stop(AC.currentTime + 0.75);
}

// Called every frame from update(); follows the selected bike's voice
function audioTick() {
  if (!AC || !eng) return;
  master.gain.value = muted ? 0 : 1;
  const sc = SND[B().snd];
  if (eng.snd !== B().snd) {
    eng.o1.type = sc.t1; eng.o2.type = sc.t2;
    eng.f.frequency.value = sc.flt; eng.snd = B().snd;
  }
  const racing = state === 'race' && !paused;
  const sp = racing ? speed / (maxSpeed * B().ts) : 0;
  const gear = Math.min(5, Math.floor(sp * 6));
  const rf = Math.min(1, sp * 6 - gear);
  const idle = !racing || crashing;
  const f = idle ? sc.f0 + Math.sin(performance.now() / 90) * sc.f0 * 0.05 : sc.f0 + rf * sc.fr + gear * sc.fg;
  const t = AC.currentTime;
  eng.o1.frequency.setTargetAtTime(f, t, 0.03);
  eng.o2.frequency.setTargetAtTime(f * sc.r2 + 4, t, 0.03);
  let tg = racing ? (crashing ? 0.015 : 0.028 + (keyU ? 0.026 : 0) + sp * 0.012) : (state === 'count' || state === 'garage' ? 0.04 : 0);
  if (sc.chug) tg *= 1 - 0.28 * (1 - sp * 0.7) * (0.5 + 0.5 * Math.sin(performance.now() / 45));
  eng.g.gain.setTargetAtTime(tg, t, 0.06);
  windG.gain.setTargetAtTime(racing ? sp * sp * 0.05 : 0, t, 0.1);
}
