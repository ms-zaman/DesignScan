# @designscan/extractor

URL → design tokens → (next) `DESIGN.md`. This is **step 1** of the roadmap:
the extraction engine. It runs locally, needs **no API key**, and is the only
"real software" part of the whole business.

> Lives at `packages/extractor` in the DesignScan monorepo. Run workspace
> commands from the repo root (`npm run extract -- stripe.com`) or locally from
> this directory.

## What it does today

```
URL
 └─ Playwright (headless Chromium) renders the live page, waits for hydration
     └─ reads getComputedStyle from every visible element
         └─ normalize.ts clusters the raw CSS into a clean token profile:
            background / text / primary colors, palette, font families,
            font-size scale, spacing scale, radius scale, shadows
             └─ outputs a DesignProfile JSON
```

## Setup

```bash
cd packages/extractor
npm install
npx playwright install chromium   # one-time browser download (~150MB)
```

## Usage

```bash
# print JSON to stdout + a summary to stderr
npm run extract -- stripe.com

# save the profile
npm run extract -- linear.app --out out/linear.json

# emit a Google-format DESIGN.md instead of profile JSON
npm run extract -- stripe.com --md --out out/stripe.DESIGN.md

# extract the dark theme (prefers-color-scheme: dark)
npm run extract -- linear.app --dark --md --out out/linear.dark.DESIGN.md

# watch the browser work
npm run extract -- vercel.com --headful
```

## Files

| File | Role |
|------|------|
| `src/extract.ts`   | Playwright launch + in-page computed-style collection |
| `src/normalize.ts` | Clusters raw values into token scales + role heuristics |
| `src/generate.ts`  | `DesignProfile` → Google-format `DESIGN.md` (YAML + prose) |
| `src/color.ts`     | rgb/hex parsing, luminance, saturation, neutral test |
| `src/types.ts`     | `RawObservations` and `DesignProfile` shapes |
| `src/cli.ts`       | `designscan <url>` command |

## Roadmap (what's next)

- [x] **Step 1 — Extraction engine** (this) → `DesignProfile` JSON
- [~] **Step 2 — Generator**: `DesignProfile` → `DESIGN.md` (Google spec: YAML
      front-matter + prose) via `--md`. Token mapping + heuristic prose done;
      passes the official `@google/design.md` linter with **0 errors**
      (`npm run lint:designmd -- <file>`). Dark theme via `--dark`. Parked:
      LLM-refined prose/rationale, and merging light+dark into one file.
- [ ] **Step 3 — HTML preview** renderer (light/dark token sheets)
- [ ] **Step 4 — Seed 30–40 brand files + public repo** (distribution wedge)
- [ ] **Step 5 — `npx ... add <brand>` CLI** + per-brand SEO pages
- [ ] **Step 6 — Checkout + email delivery** (paid private path)
- [ ] **Step 7 — One native editor integration** (Cursor/Claude Code)

## Known limitations

- Single page only (no crawl of pricing/docs yet).
- One theme per run via `--dark` (emulates `prefers-color-scheme`); not yet
  merged into a single light+dark `DESIGN.md`. Sites that gate theme on a
  class/localStorage toggle (not the media query) won't switch from `--dark`.
- Role heuristics (primary/text/background) are frequency/area based — good
  enough to inspect, not yet LLM-refined.

Color parsing now handles the full modern range — `rgb`/`hex`/`hsl`/`hwb`/
`oklab`/`oklch`/`lab`/`lch`/`color()`/`color-mix()` — all converted to sRGB.
