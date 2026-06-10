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

// ============================ PLAYER BIKES (side view, garage) ============================
// 28 x 19, facing right. Rear wheel cols 3-9, front wheel cols 20-26.
const PXS_CAFE = [
  '..............kkkk..........',
  '.............khhhik.........',
  '.............khhggk.........',
  '..............kjjk..........',
  '............kjjjjk..........',
  '...........kjjjjjkk.........',
  '..........kjjjjjjkSk........',
  '.........kjjddk111kk........',
  '........k33kddk111kkf.......',
  '........k111kAAk11ksk.......',
  '...k1111k.kAAAAk..sk1111k...',
  '...kSSSSSSSSSk.....ksk......',
  '.....kkk............kkk.....',
  '....ktttk..........ktttk....',
  '...kttTttk........kttTttk...',
  '...ktTsTtk........ktTsTtk...',
  '...kttTttk........kttTttk...',
  '....ktttk..........ktttk....',
  '.....kkk............kkk.....'
];

// Cafe Royale — flyscreen, gold cowl, twin pipes
const PXS_CAFE2 = [
  '..............kkkk..........',
  '.............khhhik.........',
  '.............khhggk.........',
  '..............kjjk..........',
  '............kjjjjk..........',
  '...........kjjjjjkk.S.......',
  '..........kjjjjjjkSkS.......',
  '.........kjjddk333kk........',
  '........k33kddk333kkf.......',
  '........k311kAAk11ksk.......',
  '...k1111k.kAAAAk..sk1111k...',
  '...kSSSSSSSSSSk...kk........',
  '...kSSSSSSSSSk......kkk.....',
  '....ktttk..........ktttk....',
  '...kttTttk........kttTttk...',
  '...ktTsTtk........ktTsTtk...',
  '...kttTttk........kttTttk...',
  '....ktttk..........ktttk....',
  '.....kkk............kkk.....'
];

const PXS_HOG = [
  '...........kkkk.............',
  '..........khhhik............',
  '..........khhggk............',
  '...........kjjk.............',
  '.........kjjjjjk..kSk.......',
  '.........kjjjjjkkkkSk.......',
  '.........kjjjjjk..k1k.......',
  '........kjjjjjk...k1k.......',
  '......kkjjjjjk..kk11kk......',
  '..k15551kddddddk133kAks.....',
  '..k111511kASSAk11kkbbksk....',
  '...kSSSSSSSSSSSSSkkkksk.....',
  '.....kkk............kkk.....',
  '....ktttk..........ktttk....',
  '...kttTttk........kttTttk...',
  '...ktTsTtk........ktTsTtk...',
  '...kttTttk........kttTttk...',
  '....ktttk..........ktttk....',
  '.....kkk............kkk.....'
];

// Big Hog — ape hangers, saddlebag, windshield
const PXS_HOG2 = [
  '...........kkkk....kSSk.....',
  '..........khhhik...kSk......',
  '..........khhggk.ggkSk......',
  '...........kjjk..gggjk......',
  '.........kjjjjjk.gggjk......',
  '.........kjjjjjkkkkjjk......',
  '.........kjjjjjk..k1k.......',
  '......kkkjjjjjk...k1k.......',
  '.....kjjkjjjjk..kk11kk......',
  '..k15kjjkddddddk133kAks.....',
  '..k151kjjkASSAk11kkbbksk....',
  '...kSSSSSSSSSSSSSkkkksk.....',
  '.....kkk............kkk.....',
  '....ktttk..........ktttk....',
  '...kttTttk........kttTttk...',
  '...ktTsTtk........ktTsTtk...',
  '...kttTttk........kttTttk...',
  '....ktttk..........ktttk....',
  '.....kkk............kkk.....'
];

const PXS_ENDURO = [
  '.............kkkk...........',
  '............khhhik..........',
  '............khhggk..........',
  '.............kjjk...........',
  '...........kj33jjk..........',
  '..........kj33jjjkk.........',
  '..........kjjjjjjkSk........',
  '.......k11kjddk33kkk........',
  '......k111kkddk33k.k11k.....',
  '.......kk11kddkk1kk1111k....',
  '........k11kbbk11ks.kkk.....',
  '.........kkkkkAAkks.........',
  '.....kkk...kkkkk....kkk.....',
  '....kTtTk..........kTtTk....',
  '...kTtTtTk........kTtTtTk...',
  '...ktTsTtk........ktTsTtk...',
  '...kTtTtTk........kTtTtTk...',
  '....ktTtk..........ktTtk....',
  '.....kkk............kkk.....'
];

// Enduro Pro — front number plate, rally tower
const PXS_ENDURO2 = [
  '.............kkkk...........',
  '............khhhik..........',
  '............khhggk..........',
  '.............kjjk..kwwk.....',
  '...........kj33jjk.kw3k.....',
  '..........kj33jjjkkkwk......',
  '..........kjjjjjjkSkk.......',
  '.......k11kjddk33kkk........',
  '......k111kkddk33k.k11k.....',
  '.......kk11kddkk1kk1111k....',
  '........k11kbbk11ks.kkk.....',
  '.........kkkkkAAkks.........',
  '.....kkk...kkkkk....kkk.....',
  '....kTtTk..........kTtTk....',
  '...kTtTtTk........kTtTtTk...',
  '...ktTsTtk........ktTsTtk...',
  '...kTtTtTk........kTtTtTk...',
  '....ktTtk..........ktTtk....',
  '.....kkk............kkk.....'
];

const PXS_RICE = [
  '............kkkk............',
  '...........khhihk...........',
  '....kkk....khhggkk..........',
  '...k333kkkjjjjjjjgk.........',
  '...k33jjjjjjjjjjjggk........',
  '....kjjjjjjjjjkkk11k........',
  '.....kddddjjk..k111kk.......',
  '.....kkdddk11111111kfk......',
  '...k111kdk111111111kk.......',
  '...k1111kbk1111111k.........',
  '....k111kkk111111ksk........',
  '.....k11SSSk11111k.sk.......',
  '.....kkkkkkkkkkkk...........',
  '....ktttk..........ktttk....',
  '...kttTttk........kttTttk...',
  '...ktTsTtk........ktTsTtk...',
  '...kttTttk........kttTttk...',
  '....ktttk..........ktttk....',
  '.....kkk............kkk.....'
];

// Superbike — bigger tail, winglets, fat rubber
const PXS_RICE2 = [
  '............kkkk............',
  '...........khhihk...........',
  '...kkkk....khhggkk..........',
  '..k3333kkkjjjjjjjgk.........',
  '..k333jjjjjjjjjjjggk........',
  '...k3jjjjjjjjjkkk11k........',
  '....kddddjjk..k111kk........',
  '....kkdddk11111111kfk.......',
  '..k111kdk111111111kk........',
  '..k1111kbk1111111k33k.......',
  '...k111kkk111111ksk3k.......',
  '....k11SSSk11111k.sk........',
  '....kkkkkkkkkkkk............',
  '...kttttk.........kttttk....',
  '..kttTtttk.......kttTtttk...',
  '..ktTssTtk.......ktTssTtk...',
  '..kttTtttk.......kttTtttk...',
  '...kttttk.........kttttk....',
  '....kkkk...........kkkk.....'
];

const PXS_PLAYER = { cafe: [PXS_CAFE, PXS_CAFE2], hog: [PXS_HOG, PXS_HOG2], enduro: [PXS_ENDURO, PXS_ENDURO2], rice: [PXS_RICE, PXS_RICE2] };

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
