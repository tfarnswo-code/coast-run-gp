# Coast Run GP — Session Handoff (June 12, 2026)

Supersedes `Session-Handoff-2026-06-11.md`. This session executed all five of Tim's
notes from that file, plus a sixth he added at session start (headlight origin).
Everything below is **built and preview-verified, NOT yet deployed** — Tim play-tests
first, then `vercel deploy --prod --yes` from the repo.

Tim's two decisions this session (asked before building):
- The Coast Run gets harder via a **weather leg AND a twist+hills leg** (not exposure,
  not zone-hazard escalation).
- The headlight fix became a **full night-lighting pass**: player + rivals + traffic.

## 1. The Coast Run — squall + mountain leg (the cliffs zone does double duty)

- **Rain is now positional**: `rainAt(z)` in main.js. On `T.coastrun` it returns true
  for f 0.28–0.52 (the cliffs leg); on every other theme it just reads `T.rain`. ALL
  rain physics/rendering route through it — player brakes/steering/wet potholes/mud,
  the rival wet penalties, the rain overlay, and the daytime sun (hidden while wet,
  matching the Mystery rule). Each rival is wet where *it* is, not where the player is.
- The rival cruise rain penalty (×0.92) moved OUT of `reset()`'s rmul into
  `rivalDrive` (dynamic, per-rival). Constant-rain themes behave the same as before.
- `coastSky()` got storm-gray stops bracketing the squall (0.31–0.49) so the sky
  darkens in and clears out on the same schedule as the rain.
- **Cliffs-leg geometry**: build() section replaced — 16 sharp sweepers (4.2–6.6 curve,
  short straights) instead of 10 gentle ones, same zone length (~4100 segs, so the
  dec() zone fractions still line up). dec() now multiplies s.y1/s.y2 by a smooth
  amplification ramp (peak ×2.6 → hills ~5900 units, Big Sir grade) across f 0.26–0.52.
  Same formula on both segment endpoints = no seams.

## 2. Baja Inferno ← the old Apocalypse surface

Tier-2 Inferno (index 6, 3-lap loop on bjBuild) now carries the all-dirt design:
`dirtRunsAll(3, 24, 50)` + `dirtRuns(5, 26, 55)` + minefields (`(i+320)%601<12`) +
scattered potholes (%47) + cows (%173). Its old bjDec call is gone.

## 3. Baja Apocalypse — redesigned to Tim's spec

- ~**48% full-width dirt** in organic alternating blocks (two overlapping sines:
  `sin(i*0.0145) + 0.6*sin(i*0.0043+1.7) > 0`, skip first 200 segs). Dirt runs
  straight through the hairpins — deliberately ("a wild ride").
- **Big-Sir twist** (38 sweepers, max curve 6.4) **and Big-Sir hills**
  (hA1 4800/hA2 1400, hF 29/64 scaled to its 7,193 segs).
- **oncoming 0.5 with traf 10** (light, per note 4). Minefields + scattered potholes
  on the asphalt halves; cows as before.
- **Rivals now slow on full-width dirt** (rivalDrive: speed capped at
  `(2600 + 0.7*3400)`, ×0.55 wet — a mid-pack hz of 0.7). Without this they'd sail
  over half the track unaffected and the course would be unwinnable. Single-LANE dirt
  still doesn't slow them ("they know the line") — so the older desert tracks play as
  before except where the road is all dirt. **Flag to Tim: this also softens Baja
  Inferno's rivals a bit** (it has full-width runs now). Watch the podium rate there.

## 4. Escape from Lodi — the mountain

- `jumps` flag removed (crest-launch code stays in the engine, unused).
- New theme field **`climb: 40000`** — `buildCourse()` adds `T.climb * (i/N)` to the
  height profile. A steady net 40k-unit ascent under the existing 6800/3400 rollers.
  **p2p tracks only** — on a loop it would seam-jump at the wrap.
- Sharpest curves in the game: hairpins now 5–10 (was 4.5–8.5), breathers every 4th
  (was every 3rd). traf 16 → 8.

## 5. Two-way traffic cut (oncoming lane must be usable for passing)

Bigger Sir 14→8 · Lodi 16→8 · Wrong Way Express 22→12 · Mystery oncoming rolls now
`min(traf, 9)` instead of +6 · new Apocalypse 10. **The School Run keeps 20** (only
exception, per Tim).

## 6. Electrode, take two

- Base ts 1.24→**1.3**, ac 1.3→**1.36** — identical to The Duke. Bars maxed.
- YIKES: topS ×1.8→**×2** (cap 31,200 ≈ 455 mph displayed), and delivery is now
  exponential: `speed += (cap - speed) * min(1, dt*2.2)` while on — measured 95% of
  the doubled cap inside 1 second from base top speed. Meter timings unchanged
  (2.4s drain / 12s recharge). Boost no longer requires holding throttle.

## 7. Night-lighting pass (Tim's note + full scope by his choice)

- **Player beam origin moved to the FAIRING** (was hard-coded at the bike's base,
  H-30): trapezoid from ±9 px at `py-58` opening to ±95 at H*0.55, plus a soft halo
  ellipse at lamp height peeking around the bike body. Uses `nightNow` (not `T.night`)
  so the Coast Run's night-city finale gets it; suppressed while crashing.
- **Rivals at night** (drawMoto night param): faint headlight pool on the road ahead
  (ellipse at by - 1.75w) + glowing red taillight; taillight palette forced bright at
  night. Skipped while spilled.
- **Traffic at night**: rear views (car/truck/bus/school bus) get `tailLights()` —
  red pair + glow, positioned per sprite grid; front views (oncoming car/truck) get
  `headLights()` — warm-white pair + big halo. Both helpers in sprites.js, sized off
  sprite width. Day rendering unchanged (param false).
- All vehicle draw calls in render() now pass `nightNow`.

## Verification done (preview, port 4174)

Track sizes sane (Apocalypse 7,193 · Lodi 7,289 · Coast Run 16,036 — zone fractions
hold). Apocalypse 48% dirt. Lodi net +40,000 y, max curve 10. Squall active only in
the cliffs zone with storm sky + no sun. Night screenshots confirmed: beam from
fairing, taillights/headlights/rival lights all read. YIKES measured 15,600→29,523
in 1s. No console errors. Test-context localStorage wiped back to a fresh career.

## Gotchas / loose ends

- **`climb` must never go on a looped course** (seam jump at the wrap).
- Coast Run hill amplification lives in its dec() and multiplies AFTER buildCourse
  sets y from hA — if the zone fractions in build() shift, update the `amp()` window
  (0.26–0.52) to match.
- The squall window (0.28–0.52) is in `rainAt()` in main.js, hard-coded for
  `T.coastrun` — not a theme field yet. Make it one if a second zone-rain course
  appears.
- Rival full-width-dirt cap also applies on Baja Inferno (see §3 flag).
- Boost while off-throttle now sustains speed (intentional — Tesla torque).
- Old gotchas from 06-11 still apply (relZ wrap, lane lists hardcoded in
  reset()+rivalPlan(), race-card hit-test sync, half-grid mirroring).

## NOT yet done / next

- Tim play-tests all of the above, especially: Apocalypse podium rate (rival dirt cap
  is a first guess), Inferno podium rate, Lodi feel, Coast Run squall difficulty.
- Deploy after verdict: `git push` + `vercel deploy --prod --yes`.
