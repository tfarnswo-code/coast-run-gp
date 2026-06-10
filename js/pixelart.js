// Coast Run GP — pixel-art sprite engine + sprite sheets.
// Sprites are authored as character grids (one char = one pixel, '.' = transparent),
// pre-rendered once per color variant to offscreen canvases, then blitted with
// nearest-neighbor scaling so pixels stay chunky at any distance.
// Grids marked half:true are the LEFT half only; the engine mirrors them.

const PXCACHE = {};

function hexMix(hex, f) {
  // f < 1 darkens toward black, f > 1 lightens toward white (f=1.4 → 40% toward white)
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f <= 1) { r *= f; g *= f; b *= f; }
  else { const m = Math.min(1, f - 1); r += (255 - r) * m; g += (255 - g) * m; b += (255 - b) * m; }
  return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
}

// Shared fixed palette
const PXPAL = {
  k: '#14141b',  // outline
  t: '#30303c', T: '#555563',                    // tire + highlight
  s: '#828897', S: '#c9cdd6', A: '#565b66',      // metals
  w: '#eceef2',                                   // white
  j: '#34343f', J: '#4c4c59',                     // rider jacket + highlight
  d: '#3f6296', D: '#2f4a72',                     // denim
  b: '#7a5230',                                   // boots / leather
  g: '#27384a',                                   // glass / visor
  y: '#FAC775', o: '#EF9F27', f: '#fff2c0',       // amber / orange / headlight
  x: '#E24B4A', p: '#d8a0a0',                     // red / pink
  e: '#c9a87e', n: '#9a6b42', N: '#6b4a2f',       // deer tans
  m: '#ece8de', M: '#2c2c2a',                     // cow white / black
  G: '#2F6B3C', F: '#3D7A47', L: '#4C8F53',       // greens
  c: '#4F8A5B', C: '#3a6b47',                     // cactus
  q: '#8a8478', Q: '#9b9588',                     // rock
  u: '#6b4a2f', U: '#8a6a48',                     // wood
  v: '#A89B5F'                                    // dry shrub
};

function pxSprite(key, rows, dyn, half, flip) {
  const ck = key + '|' + (dyn ? Object.keys(dyn).map(c => dyn[c]).join(',') : '') + (flip ? '|f' : '');
  if (PXCACHE[ck]) return PXCACHE[ck];
  let hw = 0; for (const r of rows) hw = Math.max(hw, r.length);
  const w = half ? hw * 2 : hw, h = rows.length;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  for (let yy = 0; yy < h; yy++) {
    const row = rows[yy];
    for (let xx = 0; xx < row.length; xx++) {
      const ch = row[xx]; if (ch === '.' || ch === ' ') continue;
      const col = (dyn && dyn[ch]) || PXPAL[ch]; if (!col) continue;
      g.fillStyle = col;
      const px = flip ? hw - 1 - xx : xx;
      g.fillRect(px, yy, 1, 1);
      if (half) g.fillRect(w - 1 - px, yy, 1, 1);
    }
  }
  PXCACHE[ck] = c; return c;
}

// Blit bottom-center anchored at (x, y), each grid pixel drawn at `scale` screen px.
function pxBlit(img, x, y, scale, rot) {
  const dw = img.width * scale, dh = img.height * scale;
  cx.save();
  cx.imageSmoothingEnabled = false;
  cx.translate(x, y);
  if (rot) cx.rotate(rot);
  cx.drawImage(img, -dw / 2, -dh, dw, dh);
  cx.restore();
}

// Center-anchored blit — for tumbling things that rotate about their middle.
function pxBlitC(img, x, y, scale, rot) {
  const dw = img.width * scale, dh = img.height * scale;
  cx.save();
  cx.imageSmoothingEnabled = false;
  cx.translate(x, y);
  if (rot) cx.rotate(rot);
  cx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  cx.restore();
}

// Dynamic palette for a player bike: 1/2/5 = main color shades, 3/4 = accent
// shades, h/i = helmet, r = taillight (bright when braking).
function bikePal(bk, brake) {
  return {
    1: bk.col, 2: hexMix(bk.col, 0.55), 5: hexMix(bk.col, 1.4),
    3: bk.col2, 4: hexMix(bk.col2, 0.55),
    h: bk.col, i: hexMix(bk.col, 1.5),
    r: brake ? '#FF3B30' : '#8a3434'
  };
}

// ============================ RIVAL SPORTBIKE (rear) ============================
const PX_RIVAL = [
  '......kk',
  '.....kww',
  '....kwww',
  '....kwgw',
  '....kwww',
  '.....kww',
  '...kk111',
  '..k11111',
  '.k111111',
  '.k121111',
  'kSk21111',
  'kSk21111',
  '.kk21111',
  '..k21111',
  '..k11111',
  '..kj1111',
  '..kjj111',
  '...kj111',
  '...k2222',
  '...k2rrr',
  '...k2222',
  '..kdd222',
  '..kbb2S2',
  '...kkkS2',
  '.....ktt',
  '.....ktT',
  '.....ktT',
  '......kt'
];

// ============================ PLAYER BIKES (rear, half-grids) ============================
const PX_CAFE = [
  '.......kkk',
  '......khhh',
  '.....khhhh',
  '.....khiih',
  '.....khiih',
  '.....khhhh',
  '......kkkk',
  '.....kjjjj',
  '...kkjjjjj',
  '..kjjjjjjj',
  '..kjJJjjjj',
  '.kSkjJjjjj',
  '.kSkjJjjjj',
  '..kkjjjjjj',
  '...kjjjjjj',
  '...kjjjjjj',
  '....kjjjjj',
  '....kj3333',
  '...k113333',
  '...k11rrrr',
  '...k111111',
  '..kddk1111',
  '..kddk1111',
  '..kbbkS111',
  '...kkkS2kk',
  '.....k1111',
  '.....k1111',
  '......kttt',
  '......ktTt',
  '......ktTt',
  '......ktTt',
  '.......ktt',
  '........kk'
];

// Cafe Royale — beefier: flyscreen over the bars, wider shoulders, twin pipes
const PX_CAFE2 = [
  '.......kkk',
  '......khhh',
  '.....khhhh',
  '.....khiih',
  '.....khiih',
  '.....khhhh',
  '......kkkk',
  '....kkjjjj',
  '..kkjjjjjj',
  '.kjjjjjjjj',
  '.kjJJjjjjj',
  'kSkjJjjjjj',
  'kSkjJj3jjj',
  '.kkjjj3jjj',
  '..kjjjjjjj',
  '..kjjjjjjj',
  '...kjjjjjj',
  '...kj33333',
  '..k1113333',
  '..k11rrrrr',
  '..k1111111',
  '.kddk11111',
  '.kddk11111',
  '.kbbkSS111',
  '..kkkSS2kk',
  '....k11111',
  '....k11111',
  '......kttt',
  '......ktTt',
  '......ktTt',
  '......ktTt',
  '.......ktt',
  '........kk'
];

const PX_HOG = [
  '.........kkk',
  '........khhh',
  '.......khhhh',
  '.......khiih',
  '.......khhhh',
  '........kkkk',
  '.......kjjjj',
  '.....kkjjjjj',
  '....kjjjjjjj',
  'kSSSkjjjjjjj',
  '.kkkjjJjjjjj',
  '....kjJjjjjj',
  '....kjjjjjjj',
  '...kjjjjjjjj',
  '...kjjj33jjj',
  '...kjjj33jjj',
  '....kjjjjjjj',
  '..kk11111111',
  '.k1111111111',
  '.k111111rrrr',
  '.k1111111111',
  '.kddk1111111',
  '.kddk1111111',
  '.kbbkSS11111',
  '..kkkSS2kkkk',
  '....k1111111',
  '....k1111111',
  '.......ktttt',
  '.......ktTtt',
  '.......ktTtt',
  '.......ktTtt',
  '........kttt',
  '.........kkk'
];

// Big Hog — ape hangers, saddlebags, extra chrome
const PX_HOG2 = [
  '.........kkk',
  'kk......khhh',
  'kSk....khhhh',
  'kSk....khiih',
  'kSk....khhhh',
  'kSk.....kkkk',
  'kSk....kjjjj',
  'kjk..kkjjjjj',
  '.kjkkjjjjjjj',
  '.kjjjjjjjjjj',
  '..kjjJjjjjjj',
  '...kjJjjjjjj',
  '....kjjjjjjj',
  '...kjjjjjjjj',
  '...kjjj33jjj',
  '...kjjj33jjj',
  '....kjjjjjjj',
  '..kk11111111',
  '.k1111111111',
  '.k111111rrrr',
  'kjjk11111111',
  'kjjkddk11111',
  'kjjkddk11111',
  'kjjkbbkSS111',
  '.kkkkkkSS2kk',
  '....k1111111',
  '....k1111111',
  '.......ktttt',
  '.......ktTtt',
  '.......ktTtt',
  '.......ktTtt',
  '........kttt',
  '.........kkk'
];

const PX_ENDURO = [
  '.......kkk',
  '......khhh',
  '.....khhhh',
  '.....khiih',
  '.....khhhh',
  '......kkkk',
  '.....kjjjj',
  '....kj3j3j',
  '..kkjjjjjj',
  '.kSkjJjjjj',
  'kSSkjJjjjj',
  '.kkkjjjjjj',
  '...kjjjjjj',
  '...kjjjjjj',
  '....kjjjjj',
  '....kj1111',
  '...k111111',
  '...k11rrrr',
  '...k111111',
  '..kddk1111',
  '..kddk1111',
  '..kbbk1S11',
  '...kkkkS2k',
  '.....k1111',
  '....k11111',
  '.....kkkkk',
  '......kttt',
  '......kTtT',
  '......ktTt',
  '......kTtT',
  '......ktTt',
  '......kTtT',
  '.......ktt',
  '........kk'
];

// Enduro Pro — rear number plate, double pipes, handguards
const PX_ENDURO2 = [
  '.......kkk',
  '......khhh',
  '.....khhhh',
  '.....khiih',
  '.....khhhh',
  '......kkkk',
  '.....kjjjj',
  '....kj3j3j',
  '..kkjjjjjj',
  '.kSkjJjjjj',
  'kSSkjJjjjj',
  '.kkkjjjjjj',
  '...kjjjjjj',
  '...kjjjjjj',
  '....kjjjjj',
  '....kjwwww',
  '...k11wwww',
  '...k11rrrr',
  '...k111111',
  '..kddk1111',
  '..kddk1111',
  '..kbbkSS11',
  '...kkkSS2k',
  '.....k1111',
  '....k11111',
  '.....kkkkk',
  '......kttt',
  '......kTtT',
  '......ktTt',
  '......kTtT',
  '......ktTt',
  '......kTtT',
  '.......ktt',
  '........kk'
];

const PX_RICE = [
  '........kk',
  '......khhh',
  '.....khhhh',
  '.....khiih',
  '.....khhhh',
  '....kkkkkk',
  '..kkjjjjjj',
  '.kjjjjjjjj',
  '.kjJjjjjjj',
  'kSkjJjjjjj',
  'kSkjJjjjjj',
  '.kkjjjjjjj',
  '..kjjjjjjj',
  '..kjjjjjjj',
  '...kjj3333',
  '...kj11111',
  '..k3111111',
  '..k311rrrr',
  '..k3111111',
  '.k33111111',
  '.kddk11111',
  '.kddk11111',
  '.kbbk11111',
  '..kkk1SS11',
  '....kkSSkk',
  '.....k1111',
  '......kttt',
  '......ktTt',
  '......ktTt',
  '......ktTt',
  '.......ktt',
  '........kk'
];

// Superbike — winglets, taller tail, fatter rubber
const PX_RICE2 = [
  '........kk',
  '......khhh',
  '.....khhhh',
  '.....khiih',
  '.....khhhh',
  '....kkkkkk',
  '..kkjjjjjj',
  '.kjjjjjjjj',
  '.kjJjjjjjj',
  'kSkjJjjjjj',
  'kSkjJjjjjj',
  '.kkjjjjjjj',
  '..kjjjjjjj',
  '..kjjjjjjj',
  '..kjjj3333',
  'k3kj111111',
  'k33k111111',
  '.k3311rrrr',
  '.k33111111',
  'k333111111',
  'kddk111111',
  'kddk111111',
  'kbbk111111',
  '.kkk11SS11',
  '...kkkSSkk',
  '....k11111',
  '.....ktttt',
  '.....ktTtt',
  '.....ktTtt',
  '.....ktTtt',
  '......kttt',
  '.......kkk'
];

const PX_PLAYER = { cafe: [PX_CAFE, PX_CAFE2], hog: [PX_HOG, PX_HOG2], enduro: [PX_ENDURO, PX_ENDURO2], rice: [PX_RICE, PX_RICE2] };

// ============================ PLAYER BIKES (side view, riderless) ============================
// 28 x 16, facing right, no rider — used in the garage/reward cards and as the
// crashed bike sliding on its side. Rear wheel cols 3-9, front wheel cols 20-26.
const PXS_CAFE = [
  '........kkk........kk.......',
  '.......k333k......kSSk......',
  '......k3333kkkkkkkksk.......',
  '.....k3333111555111kskk.....',
  '.....k1111111111111kkffk....',
  '......kkkk1111111kkkkffk....',
  '...k111kkAAAAASAkk11ksk.....',
  '..k11111kASSSASk1111ksk.....',
  '..kSSSSSSSSSSSSSk..kksk.....',
  '.....kkk............kkk.....',
  '....ktttk..........ktttk....',
  '...kttTttk........kttTttk...',
  '...ktTsTtk........ktTsTtk...',
  '...kttTttk........kttTttk...',
  '....ktttk..........ktttk....',
  '.....kkk............kkk.....'
];

// Cafe Royale — flyscreen, twin pipes, gold details
const PXS_CAFE2 = [
  '........kkk........kkkk.....',
  '.......k333k......kSSgk.....',
  '......k3333kkkkkkkkskgk.....',
  '.....k3333111555111kskk.....',
  '.....k1111111111111kkffk....',
  '......kkkk1111111kkkkffk....',
  '...k111kkAAAAASAkk11ksk.....',
  '..k11111kASSSASk1111ksk.....',
  '..kSSSSSSSSSSSSSk11kksk.....',
  '..kSSSSSSSSSSSk.....kkk.....',
  '....ktttk..........ktttk....',
  '...kttTttk........kttTttk...',
  '...ktT3Ttk........ktT3Ttk...',
  '...kttTttk........kttTttk...',
  '....ktttk..........ktttk....',
  '.....kkk............kkk.....'
];

const PXS_HOG = [
  '..................kkk.......',
  '.........kkkk....kSSSk......',
  '........kjjjjk....ksk.......',
  '..k111111kjjk155551ksk......',
  '.k11111111kk1555555kkskk....',
  '.k511111111k15555551kkfk....',
  '..kkkkkkk.kkAASAAk11ksfk....',
  '........kkASSSSAk111ksk.....',
  '..kSSSSSSSSSSSSSSk1kksk.....',
  '..kSSSSSSSSSSSSk....kkk.....',
  '....ktttk..........ktttk....',
  '...kttTttk........kttTttk...',
  '...ktTsTtk........ktTsTtk...',
  '...kttTttk........kttTttk...',
  '....ktttk..........ktttk....',
  '.....kkk............kkk.....'
];

// Big Hog — ape hangers, windshield, saddlebag
const PXS_HOG2 = [
  '..................kk.kggk...',
  '.........kkkk....kSk.kggk...',
  '........kjjjjk...kSkkggk....',
  '..k111111kjjk15555kSkgk.....',
  '.k11111111kk155555kkskk.....',
  '.k511111111k15555551kkfk....',
  '.kjjjjkkk.kkAASAAk11ksfk....',
  '.kjjjjk.kkASSSSAk111ksk.....',
  '.kj33jkSSSSSSSSSSk1kksk.....',
  '.kjjjjkSSSSSSSSk....kkk.....',
  '..kkkktttk.........ktttk....',
  '...kttTttk........kttTttk...',
  '...ktTsTtk........ktTsTtk...',
  '...kttTttk........kttTttk...',
  '....ktttk..........ktttk....',
  '.....kkk............kkk.....'
];

const PXS_ENDURO = [
  '..........kkkkk.....kk......',
  '.........k11111kkkkkSk......',
  '........k1111111111kskk.....',
  '......kk13333111111kksk.....',
  '....kk3333333k11111kkskk....',
  '...k333333333k111kk.k111k...',
  '..k33kkkkkAAk111k..k11111k..',
  '..kk....kASSAk1k....kkkkk...',
  '.........kSSk.kk............',
  '.....kkk............kkk.....',
  '....kTtTk..........kTtTk....',
  '...kTtTtTk........kTtTtTk...',
  '...ktTsTtk........ktTsTtk...',
  '...kTtTtTk........kTtTtTk...',
  '....ktTtk..........ktTtk....',
  '.....kkk............kkk.....'
];

// Enduro Pro — rally tower + number plate up front, gold hubs
const PXS_ENDURO2 = [
  '..........kkkkk....kwwk.....',
  '.........k11111kkkkkw3k.....',
  '........k1111111111kwwkk....',
  '......kk13333111111kksk.....',
  '....kk3333333k11111kkskk....',
  '...k333333333k111kk.k111k...',
  '..k33kkkkkAAk111k..k11111k..',
  '..kk....kASSAk1k....kkkkk...',
  '.........kSSk.kk............',
  '.....kkk............kkk.....',
  '....kTtTk..........kTtTk....',
  '...kTtTtTk........kTtTtTk...',
  '...ktT3Ttk........ktT3Ttk...',
  '...kTtTtTk........kTtTtTk...',
  '....ktTtk..........ktTtk....',
  '.....kkk............kkk.....'
];

const PXS_RICE = [
  '.....kkkk...................',
  '....k3333k..................',
  '....k33331kkkkk.............',
  '.....k11111111111kkk........',
  '......k1111111111111ggk.....',
  '.....k155511111111111ggk....',
  '....k15511kkkk11111111kk....',
  '...k15511kk..kk1111111kfk...',
  '...k111kk.....kk11111kkkk...',
  '.....kkk......k1111kkkk.....',
  '....ktttk......kkkktttk.....',
  '...kttTttk........kttTttk...',
  '...ktTsTtk........ktTsTtk...',
  '...kttTttk........kttTttk...',
  '....ktttk..........ktttk....',
  '.....kkk............kkk.....'
];

// Superbike — winglets, undertail pipes, fat rubber
const PXS_RICE2 = [
  '....kkkkk...................',
  '...k33333k..................',
  '...k333331kkkkk.............',
  '....k1111111111111kkk.......',
  '.....k111111111111111ggk....',
  '....k1555111111111111ggk....',
  '...k15511kkkk331111111kk....',
  '..k15511kSSkk3311111111fk...',
  '..k111kkSSk...kk11111kkkk...',
  '....kkkk......k1111kkkk.....',
  '...kttttk......kkkttttk.....',
  '..kttTtttk.......kttTtttk...',
  '..ktT33Ttk.......ktT33Ttk...',
  '..kttTtttk.......kttTtttk...',
  '...kttttk.........kttttk....',
  '....kkkk...........kkkk.....'
];

const PXS_PLAYER = { cafe: [PXS_CAFE, PXS_CAFE2], hog: [PXS_HOG, PXS_HOG2], enduro: [PXS_ENDURO, PXS_ENDURO2], rice: [PXS_RICE, PXS_RICE2] };

// ============================ TUMBLING RIDER (crash) ============================
// Two flail frames, alternated while airborne. Helmet uses the bike's h/i palette.
const PX_TUMBLE1 = [
  '.....kkk.....',
  '....khhhk....',
  '....khihk....',
  'kk.kkjjjkk.kk',
  '.kjkjjjjjkjk.',
  '..kjjjjjjjk..',
  '...kjjjjjk...',
  '..kdk...kdk..',
  '.kdk.....kdk.',
  '.kbk.....kbk.'
];
const PX_TUMBLE2 = [
  '...kkkk....',
  '..khhhhk...',
  '.khihhhjk..',
  '.kjjjjjjk..',
  'kjjdjjjdjk.',
  '.kddjjddk..',
  '..kbkkbk...'
];

// ============================ SKY (clouds + birds) ============================
const PX_CLOUD1 = [
  '......wwwww.........',
  '....wwwwwwwww..ww...',
  '..wwwwwwwwwwwwwwww..',
  '.wwwwwwwwwwwwwwwwww.',
  'wwsswwwwwwsswwwwwww.',
  '.ssswwwssssssswwss..'
];
const PX_CLOUD2 = [
  '...wwww......',
  '.wwwwwwww.w..',
  'wwwwwwwwwwww.',
  '.sswwwssswws.'
];
const PX_BIRD1 = [
  'k...k',
  '.k.k.',
  '..k..'
];
const PX_BIRD2 = [
  '.....',
  'kk.kk',
  '..k..'
];

// ============================ TRAFFIC (rear, half-grids) ============================
const PX_CAR = [
  '...kkkkkkk',
  '..k1111111',
  '.k11gggggg',
  '.k11gggggg',
  '.k11111111',
  'k111111111',
  'k155111111',
  'k111111111',
  'kxxk111111',
  'k111111111',
  'ksssssssww',
  '.kkkkkkkkk',
  '.kttk.....',
  '.kttk.....',
  '..kk......'
];

const PX_TRUCK = [
  '.kkkkkkkkk',
  'k111111111',
  'k155555551',
  'k111111111',
  'k111111111',
  'k111111111',
  'k111111111',
  'k111111111',
  'k122222222',
  'k111111111',
  'k111111111',
  'k111111111',
  'k111111111',
  'k111111111',
  'k111111111',
  'k111111111',
  'k111111111',
  'kkkkkkkkkk',
  '.kssssssss',
  '.kxxk...kw',
  '.kssssssss',
  '.kttkttk..',
  '.kttkttk..',
  '..kk..kk..'
];

const PX_BUS = [
  '..kkkkkkkk',
  '.k11111111',
  '.k1kwwwwww',
  '.k11111111',
  '.k1gggggg.',
  '.k1gggggg.',
  '.k11111111',
  '.k11111111',
  '.k11111111',
  '.k11111111',
  '.k11111111',
  '.k11111111',
  '.k11111111',
  '.k11111111',
  '.k12222222',
  '.k11111111',
  '.kkkkkkkkk',
  '.kssssssss',
  '.kxxk...kw',
  '.kssssssss',
  '.kttk.....',
  '.kttk.....',
  '..kk......'
];

// ============================ WILDLIFE (half-grids) ============================
const PX_DEER = [
  '.N..N...',
  '.NN.N...',
  '..NNN...',
  '...N....',
  '.nn.nnnn',
  '.knnnnnn',
  '...nwknn',
  '...nnnnn',
  '....nenn',
  '....knnn',
  '...knnnn',
  '..knnnnn',
  '.knnnnnn',
  '.knnnnnn',
  '.knnneen',
  '.knnneen',
  '..knnnnn',
  '..kN..kN',
  '..kN..kN',
  '..kN..kN',
  '..kN..kN',
  '..kN..kN',
  '..kk..kk'
];

const PX_COW = [
  '..........',
  '.Mk....kmm',
  '..Mk..kmmm',
  '...kmmmmmm',
  '..kmmmmmmm',
  '..kmmwkmmm',
  '..kmmmmmmm',
  '..kmmmmmmm',
  '...kmppppp',
  '...kmpkpkp',
  '....kppppp',
  '...kmmmmmm',
  '..kmmmmmmm',
  '.kmmMMmmmm',
  '.kmmMMmmmm',
  '.kmmmmmmMM',
  '.kmmmmmmMM',
  '..kmmmmmmm',
  '..kM..kM..',
  '..kM..kM..',
  '..kM..kM..',
  '..kk..kk..'
];

// ============================ SCENERY ============================
const PX_PINE = [
  '.......k',
  '......kG',
  '......kG',
  '.....kGG',
  '.....kGG',
  '....kGGG',
  '.....kGG',
  '....kGGG',
  '...kGGGG',
  '..kGGGGG',
  '....kGGG',
  '...kGGGG',
  '..kGGGGG',
  '.kGGGGGG',
  'kGGGGGGG',
  '......ku',
  '......ku',
  '......ku'
];

const PX_TREE = [
  '....kkkkk...',
  '..kkFFFFLkk.',
  '.kFFLLLFFFFk',
  'kFLLLLLFFFFk',
  'kFLLLLFFFFFk',
  'kFFLLFFFFFFk',
  '.kFFFFFFFFk.',
  '..kkFFFFkk..',
  '....kuuk....',
  '....kuuk....',
  '....kuuk....',
  '....kuuk....'
];

const PX_BUSH = [
  '..kLLLk...',
  '.kLLLLLLk.',
  'kLLFFLLLLk',
  'kLFFLLLLLk',
  '.kkLLLLkk.'
];

const PX_SHRUB = [
  '..kvvvk...',
  '.kvvvvvvk.',
  'kvvUvvvvvk',
  'kvUvvvvvvk',
  '.kkvvvvkk.'
];

const PX_CACTUS = [
  '.....kck......',
  '....kccck.....',
  '....kccck.....',
  'kk..kcCck..kk.',
  'kck.kcCck.kcck',
  'kck.kcCck.kcck',
  'kcck.kcCk.kck.',
  '.kcckcCckkck..',
  '..kkkcCckk....',
  '....kcCck.....',
  '....kcCck.....',
  '....kcCck.....',
  '....kcCck.....',
  '....kcCck.....'
];

const PX_ROCK = [
  '...kQQk....',
  '..kQQQQkk..',
  '.kQQqqqqqk.',
  'kQqqqqqqqqk',
  'kqqqqqqqqqk',
  '.kkqqqqqkk.'
];

const PX_LAMP = [
  '.kkkkk...',
  '.ksskfk..',
  '....kkk..',
  '..ksk....',
  '..ksk....',
  '..ksk....',
  '..ksk....',
  '..ksk....',
  '..ksk....',
  '..ksk....',
  '..ksk....',
  '..ksk....',
  '..ksk....',
  '..ksk....',
  '.ksssk...',
  '.kkkkk...'
];

const PX_SIGN = [
  'kkkkkkkkk',
  'kxxxxxxxk',
  'kxwwxxxxk',
  'kxxwwxxxk',
  'kxxxwwxxk',
  'kxxwwxxxk',
  'kxwwxxxxk',
  'kxxxxxxxk',
  'kkkkkkkkk',
  '...ksk...',
  '...ksk...',
  '...ksk...',
  '...ksk...'
];

// ============================ GREISEN SCHOOL BUS (rear, full grid — text must not mirror) ============================
const PX_SBUS = [
  '..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
  '.kooooooooooooooooooooooooooook.',
  '.kkkkokkookkkokkkokkkokkkokokok.',
  '.kkoookokokooookookoookoookkkok.',
  '.kkokokkookkoookookkkokkookokok.',
  '.kkokokokokooookooookokoookokok.',
  '.kkkkokokokkkokkkokkkokkkokokok.',
  '.kooooooooooooooooooooooooooook.',
  '.koggggkggggkggggkggggkggggggok.',
  '.koggggkggggkggggkggggkggggggok.',
  '.koggggkggggkggggkggggkggggggok.',
  '.kooooooooooooooooooooooooooook.',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  '.kooooooooooooooooooooooooooook.',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  '.kooooooooooooooooooooooooooook.',
  '.kxxkooooooooooooooookwwwkkxxk.',
  '.kssssssssssssssssssssssssssssk.',
  '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  '..kttkttk..............kttkttk..',
  '..kttkttk..............kttkttk..',
  '...kk.kk................kk.kk...'
];

// ============================ TIER 3: VOLT (electric) ============================
const PX_VOLT = [
  '........kk',
  '......khhh',
  '.....khhhh',
  '.....khiih',
  '.....khhhh',
  '....kkkkkk',
  '..kkjjjjjj',
  '.kjjjjjjjj',
  '.kj3jjjjjj',
  'kSkj3jjjjj',
  'kSkj3jjjjj',
  '.kkjj3jjjj',
  '..kjj3jjjj',
  '..kjjj3jjj',
  '...kjj3333',
  '...kj11111',
  '..k3111111',
  '..k311rrrr',
  '..k3111111',
  '.k33111111',
  '.kddk11111',
  '.kddk11111',
  '.kbbk11111',
  '..kkk11111',
  '....kk1111',
  '.....k1111',
  '......kttt',
  '......kt3t',
  '......ktTt',
  '......kt3t',
  '.......ktt',
  '........kk'
];
const PXS_VOLT = [
  '.....kkkk...................',
  '....k1111k..................',
  '....k11113kkkkk.............',
  '.....k11111111111kkk........',
  '......k3333333333333ggk.....',
  '.....k111111111111111ggk....',
  '....k11111kkkk11111111kk....',
  '...k11111kk..kk1111111kfk...',
  '...k111kk.....kk11111kkkk...',
  '.....kkk......k1111kkkk.....',
  '....ktttk......kkkktttk.....',
  '...ktt3ttk........ktt3ttk...',
  '...kt3s3tk........kt3s3tk...',
  '...ktt3ttk........ktt3ttk...',
  '....ktttk..........ktttk....',
  '.....kkk............kkk.....'
];

// ============================ TIER 3: DAKAR (rally) ============================
const PX_DAKAR = [
  '.......kww',
  '.......kw3',
  '.......kkk',
  '......khhh',
  '.....khhhh',
  '.....khiih',
  '.....khhhh',
  '......kkkk',
  '.....kjjjj',
  '....kj3j3j',
  '..kkjjjjjj',
  '.kSkjJjjjj',
  'kSSkjJjjjj',
  '.kkkjjjjjj',
  '...kjjjjjj',
  '...kjjjjjj',
  '....kjjjjj',
  '....kjwwww',
  '...k11wwww',
  '...k11rrrr',
  '.kkk111111',
  'kjjkddk111',
  'kjjkddk111',
  'kjjkbbk1S1',
  '.kkkkkkS2k',
  '.....k1111',
  '....k11111',
  '.....kkkkk',
  '......kttt',
  '......kTtT',
  '......ktTt',
  '......kTtT',
  '......ktTt',
  '......kTtT',
  '.......ktt',
  '........kk'
];
const PXS_DAKAR = [
  '..........kkkkk....kwwk.....',
  '.........k11111kkkkkw3k.....',
  '........k1111111111kwwkk....',
  '......kk13333111111kksk.....',
  '....kk3333333k11111kkskk....',
  '.kkkk333333313k111kk.k111k..',
  '.kwwk3kkkkkAAk111k..k11111k.',
  '.kwwk...kASSAk1k.....kkkkk..',
  '.kkkk....kSSk.kk............',
  '.....kkk............kkk.....',
  '....kTtTk..........kTtTk....',
  '...kTtTtTk........kTtTtTk...',
  '...ktT3Ttk........ktT3Ttk...',
  '...kTtTtTk........kTtTtTk...',
  '....ktTtk..........ktTtk....',
  '.....kkk............kkk.....'
];
PX_PLAYER.volt = [PX_VOLT]; PXS_PLAYER.volt = [PXS_VOLT];
PX_PLAYER.dakar = [PX_DAKAR]; PXS_PLAYER.dakar = [PXS_DAKAR];
