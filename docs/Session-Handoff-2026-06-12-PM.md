# Coast Run GP — Session Handoff (June 12 2026, PM session)

Supersedes `Session-Handoff-2026-06-12.md`. Tim play-tested the morning build and
sent seven notes ("hoping this is the last major update"). All seven are executed
below, **built + preview-verified, NOT deployed** — Tim play-tests first, then
`git push` + `vercel deploy --prod --yes`.

Tim's four decisions this session (asked before building):
- YIKES literally ×4 top speed / ×8 accel ("double it seriously" — confirmed literal).
- Oncoming nerf = ALL FOUR levers in mild form, **plus a School Run traffic cut**
  ("It's insane").
- Hills = BOTH punchy rollers and big elevation swings.
- The Coast Run's oncoming leg goes through the **desert** zone.

## 1. Start/finish gate + race-end cues

- Checkered arch (`drawGate` in sprites.js) at the start/finish line on loops,
  and at the finish (seg N-160, where finishRace fires) on p2p courses — plus a
  start arch at seg 6 you blast under at GO on p2p.
- '1 MILE' and '1/2 MILE' green roadside boards before every p2p finish.
- 'FINAL LAP' gold banner (2.5 s fade) + rising three-note call when lap 3 begins.
- All render-only — none of it collides. Plumbing: `gateSeg`/`startGateSeg`/`signAt`
  globals set in buildCourse, drawn in the render sprite pass.

## 2. Lodi + Apocalypse hills — the diagnosis was GRADE, not amplitude

Per-segment steepness = hA·π·hF/N. Big Sir = ~185 units/seg; Lodi and Apocalypse
were both ~100 (their amplitudes were spread over tracks ~5× longer). Now:
- **Lodi**: hA 9500/4200, hF 16/80, climb 40000→60000 → **219/seg** + visible grade.
- **Apocalypse**: hA 7000/3400, hF 29/76 → **201/seg**.
Both now out-hill Big Sir, measured in preview. The rule is in DESIGN.md.

## 3. Oncoming traffic nerfed on every lever (Tim picked "all of the above")

1. **Forgiving collisions**: oncoming hit window is now the actual crossing this
   frame (`closing*dt + segLen*0.45`, lo −segLen*0.3) with a **78% lateral hitbox**.
   The old swept window flagged mid-dodge near-misses as crashes. Same-direction
   collisions unchanged.
2. **Less traffic**: Lodi 8→6 · Apocalypse 10→8 · Wrong Way 12→10 (oncFrac 0.55
   keeps its identity) · Mystery oncoming cap 9→7 · **School Run 20→13** (Tim's
   add-on). Bigger Sir stays at Tim's own 4-vehicle tune from this morning.
3. **Rivals struggle too**: rivalBlocker ignores oncoming vehicles beyond 55% of
   look-ahead — they react late and spill in two-way traffic like the player does.
4. **No deer/cows with oncoming, ever**: removed from Lodi + Apocalypse outright;
   mysteryDec forces the animal roll off when oncoming rolls; Coast Run desert zone
   has no cows. Squirrels and crossing guards exempt (soft / course identity).

## 4. YIKES ×4 / ×8 (literal, Tim confirmed)

`topS *= 4; acm *= 8` while boosting (was ×2/×4). Exponential delivery unchanged —
measured 98% of the 62,400 cap (≈910 mph displayed) within 1 s. In an uncontrolled
preview run the bike left the road at ~620 mph, which is the point. Meter timings
unchanged (2.4 s drain / 12 s recharge).

## 5. Salt Flats rivalMul 1.7 → 1.9

Top rival now cruises ~265 mph vs Electrode's 228 base top — podium requires
actually using YIKES (and surviving it).

## 6. Low-speed steering floor 0.25 → 0.45 (all bikes)

Getting back onto the road after running wide in a turn actually works now.

## 7. The Coast Run is a Final Boss now

- traf 36→44, explicit `rivalMul: 1.38` (was inheriting the 1.22 tier-3 default).
- **New engine system `T.oncZone: [0.52, 0.76]`** — zone-confined oncoming through
  the desert leg: a 6-vehicle oncoming pool that recycles INSIDE the zone, with-flow
  traffic merges right while in the zone, rivals switch to keep-right lane planning
  there, and an 'ONCOMING!' warning board stands ~100 segs before it. Desert cows
  removed (rule above); the forest deer stay.
- Verified in preview: oncoming all in left lanes (−0.25/−0.55), every with-flow
  vehicle merged right (0.25/0.55), squall still confined to the cliffs leg.

## Verification done (preview, port 4174)

Grades measured (Big Sir 185 / Lodi 219 / Apocalypse 201); animals: Lodi squirrels
only, Apocalypse none, School Run guards only, Mystery×5 oncoming rolls all
animal-free at traf 7; Coast Run 44+6 traffic, gate/signs at correct segs; YIKES
98%-of-cap in 1 s; final-lap trigger fires; screenshots of gate, FINAL LAP banner,
ONCOMING! board, and two-way desert traffic all read correctly. Zero console
errors. Preview localStorage wiped back to a fresh career.

## Gotchas / loose ends

- `T.oncZone` recycling lives in the update() traffic loop guarded by `t.zn`; the
  pool retires (zn=false) once the player passes the zone end. If a second oncZone
  course appears, nothing is hard-coded to the Coast Run — it's all theme-driven.
- The with-flow merge-right easing shares the lane-target variable with the police
  siren logic (`tb`); siren wins while wailing, zone target resumes after.
- Watch in play-test: Apocalypse/Inferno podium rates (rival dirt cap + new rival
  oncoming blindness both soften rivals slightly), School Run feel at 13, and
  whether 6 zone-oncoming vehicles on the Coast Run desert is too few/many.
- Old gotchas from 06-11/06-12 AM still apply (relZ wrap, lane lists in
  reset()+rivalPlan(), race-card hit-test sync, climb never on loops, squall window
  hard-coded in rainAt).
