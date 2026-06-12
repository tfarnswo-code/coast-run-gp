# Coast Run GP — Session Handoff (June 11–12, 2026)

Supersedes `Session-Handoff-2026-06-10-evening.md`. Everything below (rounds 1–3) was
play-tested by Tim in preview ("Incredibly fun - amazing work") and **DEPLOYED to
production June 12 2026** (`vercel deploy --prod --yes`). Tim's verdict on difficulty:
podiuming right at ~50% — do not touch the rival knobs without new notes from him.
**Tim has more notes coming next session — read this file first, then ask for them.**

## Bike balance (Tim's notes, all done)

- **Uncle Mo's Bike** nerfed: ts 0.95→0.92, ac 1.15→1.09. **Real Hog** nerfed: ts 1.12→1.07, ac 0.92→0.87.
- **Cafe Royale → "Pretty Good Bike"** ("Great way to spend your student loan money"), modest all-around buff (ts 1.06 / ac 1.09 / br 1.16 / hd 1.13 / hz+tough 0.65).
- **Electrode**: ts 1.18→1.24. YIKES! mode is now insane by design: topS ×1.8, accel ×4 while on (was ×1.35/×2), recharge 16s→12s. At ~2× maxSpeed the steering/curve push scale up with speed, so it's nearly uncontrollable — per Tim, that's the point.
- **Steampunk**: ts 0.95→1.02, tough 0.75, **armor 1**. Boiler stokes ×1.6 faster and pays +7%/unit (was +4.5%); accel also scales with pressure. Brake/crash still dumps to zero.
- **Chippy siren**: range 26→110 segments; traffic now pulls fully OFF the road (target ±1.38, beyond the lane edges) instead of just to the shoulder.
- **Dune Buggy is GONE → "The Duke"** (kind `duke`, Ducati-red superbike, snd `duke` L-twin voice, new PX_DUKE/PXS_DUKE sprites). ts 1.3 / ac 1.36 / br 1.45 / hd 1.45 / hz 0.85 (near-max per Tim) / tough 0.55 (medium). Tagline "Oh. Yeah." `bikePoolNow()` holds it out of the tier-3 mystery pool until it's the only bike left — always the FINAL unlock. Save migration (v1→v2) silently removes owned Dune Buggys (Tim: "vanish is fine").
- CPA999 tagline stays "Barely street legal" (Tim: "it's fine, just leave it"). RESOLVED.

## Graphics

- **PX_DEER / PX_COW redrawn** to Tim's pixel reference: proper buck with an 8-point rack, white chest; Holstein cow is now a FULL grid (asymmetric patches, white blaze, pink udder — and the old mirror-seam-on-face bug is gone by construction).
- **New scenery**: `oak` (broad crown), `pine2` (tall slim), `cactus2` (3-arm saguaro), `barrel` (squat + bloom). Mixed in via `forestTree(i)` / `desertCactus(i)` helpers in data.js.
- **Squirrel** (`PX_SQUIR`, stored as `s.animal = {t:'squir'}` so it renders in the sprite pass): a "furry pothole" — kicks the bars, never crashes you, persists after a hit. Rivals dodge it but never brake for it (soft blocker); hitting one costs them a stumble, not a spill. Forest tier-2/3 only: Upstate Stampede, Mystery Run (forest roll), Escape from Lodi, Midnight Mystery (forest roll), The Coast Run forest zone.

## Difficulty (target: ~50% podium, was >90%)

reset(): cruise ladder `0.46+i*0.027` → `0.49+i*0.028`; skill `0.35..0.95` → `0.42..0.97`;
rmul tier-1 1→1.04, tier-2 1.06→1.10, tier-3 1.16→1.22, Salt Flats 1.55→1.7.
Spill odds cut: traffic-impact spill threshold `skill+0.2`→`skill+0.32`, player-rub spill
`skill+0.3`→`skill+0.42`. **These are the knobs to iterate after Tim play-tests.**
Note: tier-3 courses are now ~3× longer, so small pace gaps compound — expect another
tuning pass on rmul.

## Progression

- **Reward gating**: `courseTier(sel)` (0-3→1, 4-7→2, 8+→3). A podium on a tier-N course
  only offers bikes/tracks up to tier N+1. Grinding Upstate Run cannot open tier 3.
- **Neon City ↔ Mystery Run swapped** (Neon City now start-unlocked index 3; Mystery Run
  is the last tier-2 unlock at index 7). Save migration remaps old unlockedT 3↔7.
- Save format v2 (`coastrun-career`); v1 saves migrate on load.

## Garage nudge

Course-select screen now has a pulsing "YOUR BIKE: <name> — press B to swap bikes" panel
(bottom-left, with the side-view sprite). Footer moved to the right, b-hint removed from it.

## Courses

- **Bigger Sir** (was Big Sir Rush): cliff on the RIGHT (`cliffR` theme flag, mirrored wall/
  terrain/rim rendering, fall at playerN > 1.18, fall animation mirrors via `fellD`),
  two-way traffic (oncoming 0.5), traf 22→14. Scenery moved to the left (`bsDecR`).
- **Escape from Lodi** (was Crest County): hA1 6800/hA2 3400 (vs Big Sir 4800/1400),
  52 alternating hairpins, oncoming 0.5, deer kept, squirrels added, 7450 segs.
  **Crest-launch bug FIXED**: grade eases smoothly through 0 at a crest so the old
  `prevGrade > 22` check never fired; now detects the sign crossing and scans the
  steepest climb over the previous 45 segments (verified airborne in preview, ~0.8s).
- **Baja Apocalypse** (replaces Storm Run; `rain` flag + rendering/physics kept in engine
  for a future course): full-width dirt runs (`dirtRunsAll`, hz `{t:'dirt', o:0, w:1.15}` —
  hz.w drives both collision width and render width), 12-seg all-lane pothole minefields
  every ~601 segs (phase +320 keeps the start line clean), cows, heavy scattered potholes.
- **Salt Flats**: rivalMul 1.7, 11,820 segs (~15.3 km).
- **Lengths**: all tier-3 p2p courses now ~2× a tier-1 race; The Coast Run ~3× (16,126 segs,
  ~21 km). Mystery Run bumped to ~1,884 segs as a tier-2. Traffic counts scaled with length
  (oncoming tracks rely on the recycle loop, so they got smaller bumps).

## Round 2 (same session, Tim's corrections)

- **Course unlocking is a strict CHAIN**: only Upstate Run unlocked at start
  (`unlockedT = [0]`, R-reset too); podiuming course i is the only way to be offered
  course i+1. The tier-gating on TRACK rewards is gone (superseded); bike rewards stay
  tier-gated by `courseTier(sel)`. Locked cards read "Locked · podium previous".
- **"armor" → "hits"** in all player-facing text: HUD "· hits N", garage "takes N
  hit(s) per race", crash-absorb banner is now **"Ow!"** (was "Shrugged it off!").
  Internal field names (`armor`, `armorLeft`) unchanged.
- **Third Wheel nerfed**: ts 1.02→0.93, ac 0.85→0.78.
- **MPH everywhere**: speedo `speed/maxSpeed*175` + "mph", `UPM = 248308` road units
  per mile, "TO GO x.x mi", death-screen distance in mi. UPK kept for reference.
- **Course-card bylines removed** (d1/d2 still in THEMES as documentation, just not drawn).

## Round 3: the Mystery roll + real rain (Tim's spec, verified in test preview)

- **`mysteryDec(th, night)`** in data.js now drives Mystery Run AND Midnight Mystery.
  ONE roll per race, all components independent, held for the whole run:
  ground (forest/desert/scrub/CITY pavement) · scenery primary set + 35% "intruder"
  set sprinkled in (cactus among pines, lamps in the desert) · animals independent of
  terrain (deer/cows/both/none + squirrels if trees) · cliffs none 50% / left 20% /
  right 15% / **BOTH = razorback** 15% · oncoming 30% (+6 traf) · **rain 50%** ·
  city = lamps + taxis + dark road + yellow lanes + manhole-dense potholes.
  `T.mysteryBiome` is a debug summary string of the roll. All rolled theme fields
  (rain/oncoming/taxi/rA/rB/lane/sunR) are reset every roll — they stick on the theme
  object otherwise.
- **Razorback rendering**: segments with BOTH `clf` and `clfR` draw ocean on both
  sides, a narrow ground shelf under the road, rims + rock walls on both edges
  (wall pass loops over sides). Fall check was already side-independent. No scenery
  on razorback (no land), dirtRuns skip clfR segs too.
- **Rain is now a real event** and hits the AI too (Tim: otherwise unwinnable):
  player brakes ×0.5 (was 0.7), steering ×0.7 (was 0.85); wet potholes kick ×1.7
  steering + ×1.3 bumpT; dirt becomes mud (speed cap ×0.55, drag ×1.6, darker spray).
  Rivals in rain: cruise ×0.92, braking force 0.7→0.5, traffic-spill threshold
  skill+0.32→+0.18 (spill more), pothole hit 0.84→0.72 + longer stumble.
  Rain only appears on Mystery tracks right now (50%); the flag still works on any
  theme when Tim wants a fixed wet course.
- **Cousin Earle's Bike**: ts 0.85→0.88, hz (Terrain) 0.9→0.95 — "a bit more sass."
- Difficulty confirmed by Tim at ~50% podium — leave the rival knobs alone.
- A second launch config `coast-run-gp-test` (port 4174) exists in Charlapren's
  .claude/launch.json for verifying changes without disturbing Tim's play session
  on 4173 (separate browser context + separate localStorage).

## Gotchas / loose ends

- Tier-3 traf counts and rmul are first-guess values for the new lengths — tune with Tim.
- `wide` bike flag and PX(S)_BUGGY sprites are now unused but kept for a future gimmick.
- SND `buggy` voice removed (replaced by `duke`); nothing references it.
- Old gotchas from the 06-10-evening handoff still apply (relZ wrap, lane lists hardcoded
  in reset()+rivalPlan(), race-card hit-test sync, half-grid mirroring).
