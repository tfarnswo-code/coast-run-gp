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

## Pixel-art sprite system (js/pixelart.js)

All sprites (player bikes, rivals, traffic, animals, scenery) are pixel art authored as
character grids — one char = one pixel, '.' = transparent, chars map to a shared palette
(`PXPAL`) plus per-variant dynamic colors (bike main/accent, rival/traffic colors, brake
light). Grids are pre-rendered once per color variant to offscreen canvases (`pxSprite`,
cached) and blitted bottom-center-anchored with nearest-neighbor scaling (`pxBlit`) so
pixels stay chunky at any draw size. Symmetric rear-view sprites are authored as the LEFT
half only and mirrored by the engine (`half: true`). Player bikes have two sprite sets:
rear view (racing, `PX_PLAYER`) and side view (garage/reward cards, `PXS_PLAYER`,
drawn via `drawBikeSide`), each with distinct tier-1/tier-2 grids (Big Hog gets ape
hangers + saddlebags, Enduro Pro a number plate, Superbike winglets). Side views are
RIDERLESS by Tim's request (clearer in the garage) and double as the crashed bike.
Art direction is Tim's pixel mockups (June 2026): black outlines, silly-cute, 80s
arcade. UI text is monospace to match.

Crash sequence (render() in main.js): bike and rider separate. The bike (side-view
sprite, `drawCrashBike`) slides off in the crash direction, spinning fast then settling
flat, trailing gold sparks; the rider (`drawTumbleRider`, two flail frames) flies over
the bars on a parabola, tumbles, lands flat and skids in a dust cloud. Cliff falls
tumble both down-left while shrinking. Sky décor (`drawSkyDecor`): three parallax
clouds on all courses (dark palette at night), a four-bird flapping flock crossing
day skies every ~30 s.

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

Generator etiquette (keep these): no potholes/dirt/animals on hairpins (|curve| >= 5), dirt
never on cliff segments. Chevron signs were removed June 2026 (Tim: street racing look — plain
white fog lines on road edges, no rumble strips, no turn arrows).

## Bikes (js/data.js BIKES[], drawn in sprites.js drawPlayerBike)

Six stats: `ts` top speed, `ac` accel, `br` braking (multipliers); `hd` handling (steer rate);
`hz` 0–1 hazard tolerance (scales pothole kick/slowdown, dirt drag, grass cap); `tough` scales
crash recovery time; `armor` = crashes absorbed per race as a stagger (the hog line).
`bars[]` is display-only. Four visual kinds: cafe, enduro, hog, rice. Four engine voices in
`SND` (audio.js): the hog is low with a chug LFO, enduro is blatty square waves, rice is a high
whine, cafe is the mid baseline.

## Traffic, cheats, gore

Every run spawns exactly one GREISEN school bus mid-pack (`sbusAt` in reset(); full-grid
sprite PX_SBUS so the lettering doesn't mirror — the name matters to Tim, don't change it).
Typing CHEATER on any screen unlocks all bikes + tracks and refills lives (testing aid;
persists to the save — R on course select resets). Crash particles: gold sparks trail the
bike, RED blood (not dust) sprays where the rider lands, per Tim.

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

1. Tier-3 "gimmick" vehicles — SPECS AGREED WITH TIM (June 10 2026), not yet built. Seven
   vehicles from Tim's pixel mockups. SPACE = the bike's special, one per vehicle:
   - Police Bike: siren parts traffic. Nitro-style meter — drains in use, recharges slowly.
     Space toggles on/off; watch the gauge.
   - Electric Bike: "Yikes!" boost button (Tesla-hyperspace joke), limited time-of-use meter,
     instant torque, near-silent (wind only).
   - Harley Trike: life-farming machine — potholes can't kick it, 3 armor, finishes = +1 life,
     but worst handling and you almost certainly won't podium.
   - Dakar Rally: JUMP on Space — hops over potholes/dirt/animals (not vehicles). Crest-jump
     physics; airborne timer + shadow stays grounded.
   - Vespa: joke bike — best braking in the game, great handling, comically slow.
   - Dune Buggy: wide hitbox (hits traffic easily), otherwise a slightly improved, more
     durable Enduro.
   - Steampunk: boiler pressure — speed climbs without limit while throttle held and no
     braking/crashing; any brake/crash dumps pressure to zero.
   UNLOCKS (replaces feat idea): podium "new bike" reward becomes a RANDOM bike from the
   current tier — all tier 1 before tier 2 starts appearing, all 8 standard bikes before
   tier 3 starts. Some useful, some just fun, that's the point.
2. Tier-3 races — APPROVED SLATE (June 10 2026): point-to-point "Epic Runs", no laps, racing
   the same 12 rivals, distance-to-go HUD. Seven planned, one per tier-3 vehicle:
   Salt Flats (BUILT — long straights, light traffic, let 'er rip), Crest County (BUILT —
   crest-launch hills, deer in the dips), The Coast Run (namesake finale: forest -> cliffs ->
   desert -> night city, LAST unlock), Storm Run (rain mechanic), Wrong Way Express (oncoming
   traffic), The School Run (chase the Greisen bus), Midnight Mystery (night random epic).
   Tier-3 tracks appear as podium track-rewards only after all 8 standard tracks are unlocked.
   WAVE 1 BUILT: Volt (boost meter on Space, +35% top speed, double accel, drains ~2.4s,
   recharges ~16s; brake cancels) + Dakar (Space jump, 1.4s cooldown, clears potholes/dirt/
   animals but NOT vehicles) + both tracks + shared systems: airborne physics (airT/airDur,
   crest auto-launch via T.jumps), p2p finish (trackLen - 160 segs), mystery-bike podium
   reward (random within tier via bikePoolNow), NEW BIKE reveal toast, 10-card race grid,
   5-column garage.
3. Conditions as course variants: night versions of existing tracks (deer eyes glowing!), rain
   (grip down, spray), fog on Big Sir.
4. Championship/season mode: points across three races, season podium.
5. Track features: tunnels (engine echo), train crossing. Crest jumps + oncoming lane now live
   in the tier-3 slate.
6. Mystery Run social play: optional shared "daily course" once there's a backend (currently
   no seed by Tim's explicit choice).
7. Touch controls for phones (currently keyboard-only).
8. PWA service worker for full offline/installable support (manifest exists already).

## Source history

The game predates this repo: it was developed as inline chat-widget versions v1–v11. This repo's
initial commit is the v11 feature set plus localStorage career saves, an R-to-reset-career key,
and the four-file module split.
