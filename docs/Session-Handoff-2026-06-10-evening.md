# Coast Run GP — Session Handoff (June 10, 2026, evening)

Supersedes `Session-Handoff-2026-06-10.md`. Everything below is deployed to production
at **https://coast-run-gp.vercel.app** (redeploy: `vercel deploy --prod --yes` from the
repo folder; test locally with the preview config or `npx serve .`). Old localStorage
saves remain valid. Tim's verdict tonight: "looking very good — still needs work."

## Where the game stands

**Feature-complete tier 3: all 15 bikes and all 15 tracks are built and live.**
The big systems added this session, in order:

1. **Wave 2** — Chippy (police superbike, SPACE = siren with flashing red/blue light
   bar; parts traffic incl. oncoming, parked buses stay parked) + Wrong Way Express.
2. **Two-way traffic done RIGHT (US rules)** — with-traffic in the RIGHT lanes
   (positive `off`), oncoming in the LEFT lanes (negative). Streams never share a
   lane. Front-view car/truck sprites (`PX_CAR_F`/`PX_TRUCK_F`). Swept collision so
   fast closers can't tunnel. Player starts at `playerN = 0.4`.
3. **Tim's tuning notes** — Dakar/Ewan jump is much higher, clears EVERYTHING incl.
   vehicles, with a pothole-style landing kick (vulnerable on touchdown); per-tier
   rival speed; CB $450 + Cafe Royale nerfed; truck hitbox 0.33→0.27; crash sprites
   enlarged; deer + cow redrawn; **Mystery Run = ONE biome per run**, held throughout.
4. **Wave 3 (tier-3 completion)** — Third Wheel (noPot + 3 armor), Vespa (br 1.6),
   Dune Buggy (`wide` +0.07 hitbox pad), Steampunk (`sp:'steam'` boiler: topS ×
   (1 + steamP·0.045), unbounded; brake/crash dumps it; whistle at 8 s, smoke, HUD
   gauge) · Storm Run (`rain`: streak overlay, brake ×0.7, steer ×0.85) · The School
   Run (Greisen bus fleet — every 3rd vehicle; every other bus STOPPED on the right
   shoulder with red wig-wags; two-way traffic; `PX_GUARD` crossing guards = static
   crash hazard) · Midnight Mystery (night random, one biome, coast = cliff in the
   dark) · **The Coast Run** (finale: forest→cliffs→desert→night city; sky LERPS
   across the run via `coastSky()`; night mode kicks in at 80%; LAST entry in THEMES
   = always the final unlock). Race select is now a 5×3 grid (cards at 0.813 scale —
   click hit-test must stay in sync).
5. **Bike renames (Tim's)** — CB $450, Cousin Earle's Bike, NipponButa, XYZ567,
   Uncle Mo's Bike, Real Hog, CPA999, Electrode, Ewan MacGregor's Bike, Chippy,
   Third Wheel, Vespa ("La Dolce Vita!"). Layout guards: garage font shrinks >15/>19
   chars; HUD name box auto-sizes; long taglines wrap to two 10px lines.
6. **RIVAL DRIVER AI** (the serious upgrade — full notes in DESIGN.md "Rival driver
   AI"): per-rival cruise/accel/skill + re-plan latency; look-ahead lane changes;
   braking with brake lights; organic failures → stumbles and full spills (bike lies
   flat, recovers; spilled rivals are obstacles); rival-vs-rival rubbing; player
   contact = lateral rub → pothole-style kick BOTH ways (no crash), square rear-end
   at closing > 1800 → real crash (window swept by closing·dt). No rubber-banding,
   by Tim's explicit call. Cruise base +11%; Salt Flats rivalMul 1.7→1.55.

## "Still needs work" — start here tomorrow

Tim play-tested briefly; the rival AI feel is the open thread. Likely dials:

| Knob | Where | Current |
|---|---|---|
| Spill frequency | `rivalDrive` traffic impact: `Math.random() > r.skill + 0.2`; rub spill: `> r.skill + 0.3` | clumsy-biased |
| Bump kick on player | player-contact block | `playerN += kd * 0.22`, speed ×0.94 |
| Rear-end crash threshold | same block | closing > 1800, lat < 0.11 |
| Rival pace | reset(): cruise `0.46 + i*0.027` ×rmul (t2 1.06 / t3 1.16 / Salt Flats 1.55) | top ≈ 0.88–1.17 ×maxSpeed |
| Reaction latency | `r.decT = 0.12 + (1-skill)*0.33` | leaders ~8/s, clumsy ~2/s |
| Steampunk pressure | update(): `topS *= 1 + steamP * 0.045` | unbounded |

Known rough edges (minor, noted during testing):
- Overlapping a near-stationary rival laterally re-triggers the bump kick every 0.7 s
  (`bumpCd`) even at ~zero closing speed. Probably fine; add a closing-speed floor if
  it annoys.
- Cow sprite has a faint mirror seam on the face. CPA999 still wears the old
  "Barely street legal" tagline (Tim said "no tagline" — flagged, unresolved).
- Unrenamed: Cafe Royale, Dune Buggy, Steampunk.
- Tim has NOT yet fully play-tested: The Coast Run end-to-end, Steampunk balance,
  School Run difficulty, Storm Run grip feel, Midnight Mystery.

## Gotchas for the next session

- `relZ(d)` is wrap-aware ONLY on looped tracks (`!T.p2p`); p2p distances are raw.
- Rival home lanes come from `T.oncoming` (right-side lanes [0.25, 0.55] + passing
  lane −0.25) vs normal [−0.45, 0, 0.45] — hardcoded in reset() AND rivalPlan().
- Spill pose renders via `drawMoto`'s 7th arg (rot); rotation derives from
  `r.spillDur - r.spillT` — set BOTH when forcing a spill in tests.
- Race-select cards draw at 0.813 scale; garage rows y=60+i·82 — both have matching
  click hit-tests in the `cv.addEventListener('click')` block. Change together.
- hF1/hF2 even integers; sprite half-grids mirror LEFT half; `bikeGrid()` handles
  1-grid tier-3 kinds — don't index `[tier-1]`.
- Eval-testing pollutes the preview save — CHEATER or R to recover.
- The Greisen name on buses matters to Tim. The School Run fleet is intentional.

## Backlog (after AI tuning)

Championship/season mode · tunnels (engine echo) + train crossing · night variants of
standard tracks · touch controls · PWA service worker · Mystery daily-course (needs
backend; no seed by Tim's choice).
