# DesignScan

URL → design tokens → `DESIGN.md`. Point it at any website and get a
spec-compliant [DESIGN.md](https://github.com/google-labs-code/design.md) file
(YAML tokens + prose) that AI coding agents can read to match that site's look.

## Monorepo layout

| Path | What |
|------|------|
| [`packages/extractor`](packages/extractor) | The extraction + generation engine (Playwright → tokens → `DESIGN.md`). |
| [`examples/`](examples) | Curated sample outputs (Stripe, Linear) — token JSON + generated `DESIGN.md`. |
| [`docs/`](docs) | Research: market/forensic analysis and acquisition memo (EN/BN). |

## Quick start

```bash
npm install
npx playwright install chromium        # one-time browser download

# token profile (JSON) for any URL
npm run extract -- stripe.com

# generate a DESIGN.md
npm run extract -- stripe.com --md --out out/stripe.DESIGN.md
```

## Scripts (root)

| Script | Does |
|--------|------|
| `npm run extract -- <url> [--md] [--out f]` | Extract tokens / generate `DESIGN.md` |
| `npm run typecheck` | Type-check all packages |
| `npm test` | Run the test suite (vitest) |
| `npm run lint:designmd` | Validate generated `out/*.DESIGN.md` against the spec |

## Status

- [x] **Step 1 — Extraction engine** (Playwright → clean token profile)
- [x] **Step 2 — Generator** (token profile → spec-valid `DESIGN.md`, lint-clean)
- [ ] **Step 3** — LLM-refined prose & color-role assignment
- [ ] **Step 4** — HTML preview, brand-seed library, `npx ... add`, checkout

See [`packages/extractor/README.md`](packages/extractor/README.md) for the full
roadmap and engine details.
