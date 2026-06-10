# Coast Run GP

A retro pseudo-3D motorcycle road racing game in the spirit of 1980s arcade racers.
Pure HTML/JavaScript — no build step, no dependencies, no framework. Open the page and ride.

Built collaboratively with Claude, June 2026.

## How to play

| Key | Action |
|-----|--------|
| ← → | Steer (also: navigate menus) |
| ↑ | Throttle |
| ↓ | Brake |
| Enter | Confirm / start |
| B | Back (from garage to course select) |
| M | Sound on/off |
| R | Reset career (on the course select screen) |

**The rules:** You start dead last in a 13-rider field with 3 lives. Crashing — into rivals, traffic,
trees, cactus, rocks, lampposts, deer, or cows — costs a life. Riding off the cliff edge on coastal
roads is always fatal. Run out of lives mid-race and your career is over: garage, courses, and lives
all reset.

**Earning things back:** Finishing any race (even in last place) restores one life, up to a maximum
of 5. Finishing on the podium (top 3) additionally lets you choose a reward: an extra life, a new
motorcycle, or a new course.

**The garage:** You start with the Cafe Racer. Tier 1 unlocks are the Enduro (dirt specialist), The
Hog (slow to accelerate, but armored — it shrugs off one crash per race), and the Rice Burner (very
fast, very fragile). Own all four and tier 2 versions start appearing in podium rewards.

**The courses:** Upstate Run, Big Sir, Baja, and Mystery Run are open from the start. Mystery Run
generates a brand-new course every race — random corners, hills, and a journey through mixed terrain
(forest, desert, cliff coast). Four harder courses unlock through podium rewards: Upstate Stampede,
Big Sir Rush, Baja Inferno, and Neon City (a night race).

**Saves:** Your career (lives, bikes, courses) is saved automatically in the browser you're playing
in. It survives closing the tab and restarting the computer. It does NOT transfer between browsers
or devices, and clearing browser data erases it.

## Running it locally

The simplest way — in Terminal:

```bash
cd ~/projects/coast-run-gp
npx serve .
```

Then open the address it prints (usually http://localhost:3000) in your browser.
Press Ctrl+C in Terminal to stop the server when you're done.

(Double-clicking `index.html` also works in most browsers, but the local server is more reliable.)

## Deploying to Vercel (sharing with friends)

One-time setup, step by step:

1. **Put it on GitHub.** In Terminal:
   ```bash
   cd ~/projects/coast-run-gp
   gh repo create coast-run-gp --public --source=. --push
   ```
   If `gh` asks you to log in first, run `gh auth login` and follow the prompts.

2. **Connect it to Vercel.** Go to [vercel.com](https://vercel.com) and log in (same account as
   your other projects). Click **Add New… → Project**. Find `coast-run-gp` in the repository list
   and click **Import**. Don't change any settings — Vercel detects it's a plain static site.
   Click **Deploy**.

3. **Share the link.** After about 30 seconds, Vercel gives you a URL like
   `https://coast-run-gp.vercel.app`. Anyone with that link can play — on a laptop or a phone
   (though it currently needs a keyboard, so laptops are the real audience). Each person's career
   saves in their own browser automatically.

From then on, any change pushed to GitHub (`git push`) redeploys automatically.

## Project layout

```
index.html          The page: canvas, styles, loads the scripts
js/data.js          Constants, course catalog, bike catalog, course builder
js/audio.js         WebAudio engine sounds, jingles, crash/bump effects
js/sprites.js       Everything drawn: bikes, vehicles, wildlife, scenery, UI
js/main.js          Game state, career saves, input, physics, renderer
manifest.webmanifest + icon.svg    Web app identity (icon, "add to home screen")
docs/DESIGN.md      Architecture notes and design history (for development)
```

For how the game actually works under the hood — and the backlog of planned features —
see [docs/DESIGN.md](docs/DESIGN.md).
