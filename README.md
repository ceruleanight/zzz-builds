# ZZZ Builds

A static Astro site with agent builds, W-Engines and Drive Discs for Zenless Zone Zero. Based on [genshin-builds](https://github.com/Genshin-Impact-Helper-Team/genshin-builds) and [star-rail-bulds](https://github.com/hsr-navigator/star-rail-builds). 

## Run

```bash
npm install   # or: pnpm install
npm run dev      # local development
npm run build    # static output in dist/
```

## Deploy to GitHub Pages

1. Push to a repository's `main` branch.
2. In the repository, go to **Settings > Pages** and set **Source** to **GitHub Actions**.
3. `.github/workflows/deploy.yml` builds and publishes on every push. It reads the site URL and sub path from GitHub (`actions/configure-pages`), so project sites (`/repo-name/`), user sites and custom domains all work without edits.

To build locally for a sub path:

```bash
SITE=https://<user>.github.io BASE=/<repo-name> npm run build
```

## What is included

- Agent roster (62 agents, version 3.3) with attribute, specialty, rank and faction filters.
- 103 W-Engines with passives and S1 to S5 values
- 30 Drive Disc sets with 2-piece and 4-piece effects
- Per-agent build pages (W-Engine ranking, Drive Disc sets, Disc 4/5/6 main stats, substats, skill priority)
- "Ranked on" agent chips on the W-Engine and Drive Disc pages. On the Drive Disc page, hovering a chip shows that agent's recommended main stats and substats.

Builds are written for all 62 agents. Agent lists show in-game names; agent pages show full names (`src/i18n/en/character-short-names.json`).
Agent images are bundled in `src/assets/character-assets/` (nothing is hotlinked).
See `PLACEHOLDERS.md` for everything that is missing and where to fill it in.

## Dependencies

Both `package-lock.json` and `pnpm-lock.yaml` are committed. After changing `package.json`, update both (`npm install` then `pnpm import`, or `pnpm install` then `npm install --package-lock-only`). CI fails if `pnpm-lock.yaml` is out of date.
