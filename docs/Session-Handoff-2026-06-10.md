# Coast Run GP — Session Handoff (June 10, 2026)

Massive visual + feature session. Everything below is committed, pushed to GitHub
(tfarnswo-code/coast-run-gp), and deployed to production at
**https://coast-run-gp.vercel.app**. Redeploy after future changes with
`vercel deploy --prod --yes` from the repo folder. Test locally with `npx serve .`
(or the `.claude/launch.json` preview config).

## What shipped this session (in order)

1. **Pixel-art overhaul** — new sprite engine (`js/pixelart.js`): every sprite is a
   character grid (one char = one pixel) pre-rendered to an offscreen canvas and drawn
   with crisp nearest-neighbor scaling. All 8 original bikes (rear + side views, tier 2
   visibly beefier), rivals, traffic, deer/cows, all scenery, retro monospace UI.
   Art direction: Tim's pixel mockups (also covering the 5 unbuilt tier-3 vehicles).
2. **Riderless side views** in the garage (clearer), which double as the crashed bike.
3. **Crash sequence** — bike and rider separate: bike slides off spinning then settles
   flat trailing gold sparks; rider flies over the bars, tumbles (2 flail frames),
   lands and skids in **red blood** (Tim: blood, not grey dust). Cliff falls tumble both.
4. **Sky life** — 3 parallax clouds everywhere (dark at night), bird flock on day courses.
5. **Street look** — white fog lines (no red/white rumble strips), chevron signs removed.
6. **Rival size bug fixed** — they were drawn ~1.9× too large (wrong scale divisor).
7. **GREISEN school bus** — exactly one per run (`sbusAt` in `reset()`), full-grid sprite
   so the lettering doesn't mirror. The name matters to Tim. Do not change it.
8. **CHEATER** typed anywhere = all bikes + tracks + 5 lives (testing aid, saves).
9. **Navigation** — Title screen → Garage (pick bike) → Choose your race → race →
   results → race select. B walks backward. **P** = pause (full freeze, engine fades).
   **Q** = save & exit to title (mid-race = forfeit, no penalty/reward).
10. **Lives meter** always shows all 5 slots (start 3, earn up to 2).
11. **Tier 3 wave 1** (see below).

## Tier 3 — design agreed with Tim, wave 1 built

**Rule: SPACE = the bike's special.** One gimmick per vehicle.

Built and live:
- **Volt** (electric) — "YIKES!" boost on Space: +35% top speed, 2× accel while the
  meter drains (~2.4 s full burn, ~16 s recharge, braking cancels). Near-silent.
- **Dakar** (rally) — jump on Space (1.4 s cooldown): clears potholes/dirt/animals,
  NOT vehicles. Shadow stays grounded; steering reduced airborne.
- **Salt Flats** — Tim's fast race: huge straights, light traffic, let 'er rip.
- **Crest County** — every crest auto-launches you at speed; deer in the dips.

Epic Run format (both new tracks): **point-to-point, no laps**, vs the same 12 rivals,
"TO GO x.x km" HUD, finish line at `trackLen - 160 * segLen` (the last 160 segments are
padding so the horizon past the finish looks right).

Remaining vehicles (specs in DESIGN.md backlog): Police (siren meter parts traffic),
Harley Trike (life farmer: pothole-proof, 3 armor, awful handling), Vespa (joke bike,
best brakes), Dune Buggy (wide hitbox, durable enduro-plus), Steampunk (boiler pressure:
speed climbs without limit until you brake/crash).

Remaining races: **The Coast Run** (namesake finale, forest→cliffs→desert→night city,
must be the LAST unlock), Storm Run (rain), Wrong Way Express (oncoming traffic),
The School Run (chase the Greisen bus), Midnight Mystery (random night epic).
7 vehicles ↔ 7 races. Build in waves; each wave feeds systems to the next.

**Unlock scheme (Tim's design, replaces the old pick-a-bike reward):** the podium bike
reward is a single **Mystery Bike** card — random within the current tier
(`bikePoolNow()` in main.js). All tier 1 before tier 2 appears; all 8 standard bikes
before tier 3. Tier-3 tracks appear as podium track rewards only after all 8 standard
tracks. Claiming pops a gold "NEW BIKE!" reveal on the race-select screen.

## Where things live

| File | Contents |
|---|---|
| `js/data.js` | Constants, BIKES[] (10), THEMES[] (10), SND voices, course builders |
| `js/pixelart.js` | Sprite engine (`pxSprite`/`pxBlit`/`pxBlitC`) + every sprite grid |
| `js/sprites.js` | Draw functions, sky décor, HUD widgets, course cards |
| `js/audio.js` | WebAudio engine voices (incl. near-silent `volt`), jingles, SFX |
| `js/main.js` | State machine, physics (incl. airborne/boost), rewards, all screens |
| `docs/DESIGN.md` | Architecture + Tim's design rules + full tier-3 specs in backlog |

## Tuning knobs Tim may ask about (all in js/main.js unless noted)

- Boost: drain `dt / 2.4`, recharge `dt / 16`, strength `topS *= 1.35` / `acm *= 2`
- Jump: cooldown `1.4`, duration `0.5 + speed/maxSpeed * 0.4`, visual height
  `26 + airDur * 44` (render), crest-launch threshold `prevGrade > 22` + `speed > 0.45 max`
- Crest County hill shape: `hA2: 2800, hF2: 38` in data.js (hF must stay EVEN)
- Blood amount/colors: `doCrash()` and the crash-particle block in `update()`
- Greisen bus frequency: currently exactly 1/run (`sbusAt`)

## Gotchas for the next session

- **Sprite grids:** rows are strings; `half: true` grids are the LEFT half only
  (mirrored), so text/asymmetric details need full grids (see PX_SBUS). Tier-3 kinds
  have ONE grid; lookup goes through `bikeGrid()` — don't index `[tier - 1]` directly.
- **Editing scenery decorators in data.js:** several are `if / else if` chains —
  deleting the first `if` orphans the chain (this bit us once).
- **hF1/hF2 must be even integers** or track elevation won't loop.
- The preview panel user save can be polluted by eval-testing rewards — restore via
  CHEATER or R.
- `Math.min` on empty `lapTimes` = Infinity; p2p results already guard this — keep
  guarding in any new results UI.
- Three-way split note: this game repo is independent of the Charlabús/Charlamed/
  Charlapren apps. Game work happens here only.

## Next session candidates (Tim decides)

1. Ride-and-tune wave 1 (boost/jump/crest numbers above).
2. Tier-3 wave 2 — natural pairings: Police + Wrong Way Express (siren ↔ oncoming
   traffic), or Steampunk + The Coast Run (pressure run ↔ longest road).
3. Tim has **new bike names** to propose — still unspoken; renames fit naturally
   alongside tier-3 work.
4. Backlog: rain/weather, championship mode, tunnels/train, touch controls, PWA worker.
