# Coast Run GP — design and architecture notes

Written for future development sessions. The game was built iteratively in chat (11 widget
versions, June 10 2026) and then ported to this repo. Tim is the designer; he is not a trained
programmer, so explain changes step by step and keep his design rules intact.

## Tim's design rules (do not violate without asking)

- 80s arcade feel everywhere: chiptune jingles, lives, career wipe on wreck-out, silly-cute sprites.
- No difficulty dial and no visible/reproducible seed on Mystery Run — the rider "reads the road."
- Bikes must feel really different but each be viable.
- Crashes need consequences (lives), but near-misses must not crash you — hitboxes are deliberately
  forgiving (see collision constants in `main.js`).
- Tim approves "silly graphical choices" by default and critiques after seeing them.

## How the rendering works (js/sprites.js + render() in main.js)

Classic OutRun-style pseudo-3D. The track is a flat array `segs[]` of segments (200 units long).
Each segment has: `curve` (bend strength), `y1/y2` (elevation), per-segment terrain (`cA/cB` ground
colors, `clf` cliff flag, `dirtC` dirt tint), optional `spr` (scenery), `hz` (hazard), `animal`.

Each frame:
1. Project ~140 segments ahead of the camera into screen space (`sd[]`), tracking a `clip` line so
   road behind hill crests is hidden (this is what makes blind crests work).
2. Cliff pass (far-to-near): for segments with `clf`, draw a rock wall descending from the road's
   left edge to a foam line — near walls correctly cover far ones.
3. Terrain + road pass (near-to-far): ground color band (or land-polygon right of the cliff lip),
   road quad, rumble strips, lane line, potholes/dirt drawn into the road surface.
4. Sprite pass (far-to-near, clipped at crests): scenery, animals, rivals, traffic.
5. Player bike, particles, red crash flash, HUD.

Because everything reads per-segment data, mixed-terrain tracks (Mystery Run's biome zones) work
with no special cases: the generator just writes different colors/flags into different segments.

## Courses (js/data.js)

`THEMES[]` — 8 entries. Each has palette fields, hill amplitude/frequency (`hA1/hA2/hF1/hF2` —
frequencies must be even integers so the elevation loops seamlessly), an optional `traf` count and
`taxi`/`night`/`cliff`/`lock` flags, plus `build()` (pushes segments via `addRoad`) and `dec()`
(stamps scenery/hazards/animals using modular-arithmetic spacing — deterministic, no RNG, except
Mystery). Indices 0–3 start unlocked; 4–7 unlock via podium reward.

Mystery Run (index 3) rolls geometry, hills, sky, traffic count, and 3–5 biome zones
(forest/desert/coast) with `Math.random()` at `buildCourse()` time. No seed by design.

Generator etiquette (keep these): no potholes/dirt/animals on hairpins (|curve| >= 5), chevron
signs auto-placed on hairpin outsides, dirt never on cliff segments.

## Bikes (js/data.js BIKES[], drawn in sprites.js drawPlayerBike)

Six stats: `ts` top speed, `ac` accel, `br` braking (multipliers); `hd` handling (steer rate);
`hz` 0–1 hazard tolerance (scales pothole kick/slowdown, dirt drag, grass cap); `tough` scales
crash recovery time; `armor` = crashes absorbed per race as a stagger (the hog line).
`bars[]` is display-only. Four visual kinds: cafe, enduro, hog, rice. Four engine voices in
`SND` (audio.js): the hog is low with a chug LFO, enduro is blatty square waves, rice is a high
whine, cafe is the mid baseline.

## Game state machine (js/main.js)

`ready` (course select) → `garage` (bike select) → `count` → `race` → `over` (podium ceremony or
plain results) → optional `reward` → back to `ready`. `dead` = wrecked out (lives 0 mid-race) →
career reset. Lives: start 3, max 5; any finish +1; podium reward may add one more.

Career persistence: `saveCareer()/loadCareer()` in main.js, localStorage key `coastrun-career`
(lives, owned bikes, unlocked tracks, current bike). Saved on race finish, reward claim, bike
choice, and career reset. Loaded with validation on boot.

## Collision model

Lateral positions are in road-half-width units (playerN, lane offsets ±0.5). A hit needs lateral
overlap (thresholds per object type, deliberately ~25% smaller than visual width) AND closing
speed > 250 units (vehicles), within ~0.5–0.6 segment lengths. Animals/scenery checked at the
player's visual segment. Cliff death at playerN < -1.18 on `clf` segments. After any crash:
2 s invulnerability with sprite flicker.

## Backlog (discussed with Tim, in rough priority order)

1. Tier-3 "gimmick" bikes — Tim loves this direction. Candidates: GP500 two-stroke with a powerband
   (sluggish low, explosive high), silent electric hyperbike (instant torque, wind-only sound),
   Rat Bike (mediocre stats, 3 armor, near-instant crash recovery), Dakar racer (dirt speeds it up).
   Possible final unlock: a custom bike built from a stat budget. Unlock via feats (win all courses,
   crash-free race, etc.) rather than collection — turns endgame into challenges.
2. Conditions as course variants: night versions of existing tracks (deer eyes glowing!), rain
   (grip down, spray), fog on Big Sir.
3. Championship/season mode: points across three races, season podium.
4. Track features: crest jumps (airborne), tunnels (engine echo), oncoming-traffic lane, train
   crossing. Likely home: a fifth course.
5. Mystery Run social play: optional shared "daily course" once there's a backend (currently
   no seed by Tim's explicit choice).
6. Touch controls for phones (currently keyboard-only).
7. PWA service worker for full offline/installable support (manifest exists already).

## Source history

The game predates this repo: it was developed as inline chat-widget versions v1–v11. This repo's
initial commit is the v11 feature set plus localStorage career saves, an R-to-reset-career key,
and the four-file module split.
