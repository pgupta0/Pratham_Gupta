# Pratham Gupta: Pratham's Town

Personal portfolio as a small, sunny 3D town. Visitors walk Pratham around an island
where every building is a chapter of his career, and open each chapter at a glowing marker.

**Live:** https://prathamgupta.vercel.app

Static site: plain HTML + ES modules, no build step. three.js 0.170 and Lucide icons load from
the jsDelivr CDN. Hosted on Vercel; every push to `main` redeploys.

## Where things are

| Path | What it is |
|---|---|
| `index.html` | The page: loader, top bar, panels, map, list view, joystick |
| `world/content.js` | **All text and numbers.** Edit this to change what the town says |
| `world/layout.js` | Town plan: plot positions, ring road, spawn point |
| `world/main.js` | Boot, quality tiers (phone vs desktop), render loop |
| `world/env.js` | Sky, sun, sea, island, roads, town square |
| `world/kit.js` | Shared materials and builders (buildings, signs, vehicles, people, trees) |
| `world/player.js` | Walking, collisions, the follow camera |
| `world/ui.js` + `world/world.css` | Markers, panels, map, prompts, list view |
| `world/districts/*.js` | One file per place: `htl` bus depot, `bb` BigBasket store, `dtu`, `lss` Six Sigma, `bitsom`, `lead` leadership square, `ailab` products, `curious` park, `team` contact tower |
| `world/life.js` | Traffic, people walking, trees, beach, birds, clouds |
| `world/assets/vendor/` | Free (CC0) 3D assets, see `ASSETS.md` there for sources and licences |
| `images/` | Portrait, product previews; optional photos in `images/curious/` |
| `transit-one-app.html`, `crave-command-center.html`, `chhatri.html` | Product pages linked from the AI Lab |

## Common edits

- **Change a number or sentence:** edit `world/content.js`. Each place has `spots`; each spot is one
  marker in the town.
- **Add a product:** add it to `PRODUCTS` and a spot under the `ailab` place in `world/content.js`,
  then give it a kiosk and marker in `world/districts/ailab.js`.
- **Add photos for "Still curious":** drop `music.jpg`, `pool.jpg`, `cuisines.jpg`, `travel.jpg`
  into `images/curious/` (they appear in the panels automatically).

## Testing locally

Serve the folder (modules don't run from `file://`):

```bash
python3 -m http.server 8000
```

Open http://localhost:8000. Useful URL options: `?quality=low` (phone tier), `?spot=htl.fuel`
(open a chapter directly), `?only=htl` (build one place), `?cam=x,z,dist,yaw,pitch` (fixed camera).

Old URLs `/portfolio`, `/clean`, `/drive` and `/jump` redirect to the town (see `vercel.json`).
