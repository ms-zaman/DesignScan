# @designscan/extractor

URL → design tokens → (next) `DESIGN.md`. This is **step 1** of the roadmap:
the extraction engine. It runs locally, needs **no API key**, and is the only
"real software" part of the whole business.

> Lives at `packages/extractor` in the DesignScan (pnpm) monorepo. Run workspace
> commands from the repo root (`pnpm extract stripe.com`) or locally from
> this directory.

## What it does today

```
URL
 └─ Playwright (headless Chromium) renders the live page, waits for hydration
     └─ reads getComputedStyle from every visible element
         └─ normalize.ts clusters the raw CSS into a clean token profile:
            background / text / primary / border / muted-surface colors,
            palette, font families, font-size scale, spacing scale,
            radius scale, shadows
             └─ outputs a DesignProfile JSON
```

## Install

```bash
# one-off, no install
npx @designscan/extractor stripe.com --md --out stripe.DESIGN.md

# or install the CLI / library
npm i @designscan/extractor
npx playwright install chromium   # one-time (drives headless Chromium)
```

```ts
// as a library
import { extract, normalize, generate, preview } from "@designscan/extractor";
const profile = normalize(url, await extract(url));
const md = generate(profile); // spec-valid DESIGN.md
```

## Local development

```bash
pnpm install                      # from the repo root
pnpm --filter @designscan/extractor exec playwright install chromium  # one-time
pnpm build                        # tsc -> dist (the publishable build)
```

## Usage

Run from the repo root (no `--` needed — pnpm forwards flags straight through):

```bash
# print JSON to stdout + a summary to stderr
pnpm extract stripe.com

# save the profile
pnpm extract linear.app --out out/linear.json

# emit a Google-format DESIGN.md instead of profile JSON
pnpm extract stripe.com --md --out out/stripe.DESIGN.md

# or pick another format: w3c (W3C Design Tokens JSON — Style Dictionary,
# Tokens Studio, …) | css (paste-ready CSS custom properties)
pnpm extract stripe.com --format w3c --out out/stripe.tokens.json
pnpm extract stripe.com --format css --out out/stripe.tokens.css

# pick a theme: light (default) | dark | both
pnpm extract linear.app --theme dark --md --out out/linear.dark.DESIGN.md

# both = merge light + dark into one DESIGN.md (parallel *-dark tokens)
pnpm extract vercel.com --theme both --md --out out/vercel.DESIGN.md

# --preview = also emit a self-contained HTML proof sheet beside the file
# (out/vercel.preview.html) rendering every token; --theme both adds a toggle
pnpm extract vercel.com --theme both --md --preview --out out/vercel.DESIGN.md

# slow site? raise the per-navigation timeout (default 45000ms)
pnpm extract some-slow-site.com --md --timeout 90000

# watch the browser work
pnpm extract vercel.com --headful
```

Load failures (unreachable host, timeout, a site refusing automated browsers)
exit non-zero with a short, actionable message rather than a raw stack trace.

## Files

| File | Role |
|------|------|
| `src/extract.ts`   | Playwright launch + in-page computed-style collection |
| `src/normalize.ts` | Clusters raw values into token scales + role heuristics |
| `src/resolve.ts`   | Shared role/level/scale resolution (one source of truth for generate + preview) |
| `src/generate.ts`  | `DesignProfile` → Google-format `DESIGN.md` (YAML + prose) |
| `src/agentNotes.ts`| Deterministic "Notes for your coding agent" section (contrast/heading/font guidance) appended to the `DESIGN.md` |
| `src/preview.ts`   | `DesignProfile` → self-contained HTML proof sheet (`--preview`) |
| `src/color.ts`     | rgb/hex parsing, luminance, saturation, neutral test |
| `src/types.ts`     | `RawObservations` and `DesignProfile` shapes |
| `src/cli.ts`       | `designscan <url>` command |

## Roadmap (what's next)

- [x] **Step 1 — Extraction engine** (this) → `DesignProfile` JSON
- [x] **Step 2 — Generator**: `DesignProfile` → `DESIGN.md` (Google spec: YAML
      front-matter + prose) via `--md`. Token mapping + heuristic prose done;
      passes the official `@google/design.md` linter with **0 errors**
      (`pnpm lint:designmd`). Theme selection via `--theme light|dark|both`;
      `both` merges light + dark into one spec-valid file (parallel `*-dark`
      tokens + variants). (LLM-refined prose/rationale moved to Step 4.)
- [x] **Step 3 — HTML preview** renderer (`--preview`): a self-contained,
      offline proof sheet that paints every resolved token — color swatches,
      type specimens at real px/weight, spacing/radius/shadow samples, and the
      six components — inside neutral chrome, with a Light/Dark toggle when a
      distinct dark theme exists. Resolves the same roles/levels/scales as the
      generator (via `resolve.ts`), so it can't drift from the `DESIGN.md`.
- [~] **Step 4 — agent guidance** (`agentNotes.ts`): every `DESIGN.md` now ends
      with a **Notes for your coding agent** section — deterministic, per-extraction
      instructions derived from this profile's actual numbers (heading hierarchy
      vs. muted `text`, sub-AA body contrast, brand-font fallback, primary-button
      contrast, shape/spacing rhythm). The insight: the file is always consumed by
      an AI agent, so we compute the semantic calls here (no LLM, no API key) and
      let the *user's* agent apply them. Optional LLM-refined prose is still future.
- [ ] **Step 5 — Seed 30–40 brand files + public repo** (distribution wedge)
- [ ] **Step 6 — `npx ... add <brand>` CLI** + per-brand SEO pages
- [ ] **Step 7 — Checkout + email delivery** (paid private path)
- [ ] **Step 8 — One native editor integration** (Cursor/Claude Code)

## Known limitations

- Single page only (no crawl of pricing/docs yet).
- Dark theme is emulated via `prefers-color-scheme`. Sites that gate theme on a
  class/localStorage toggle (not the media query) won't switch, so `--theme
  dark`/`both` returns the light palette; `both` detects this and emits a
  light-only file with an honest note rather than fabricating a dark theme.
- Role heuristics (primary/text/background) are frequency/area based — good
  enough to inspect, not yet LLM-refined.

Color parsing now handles the full modern range — `rgb`/`hex`/`hsl`/`hwb`/
`oklab`/`oklch`/`lab`/`lch`/`color()`/`color-mix()` — all converted to sRGB.
