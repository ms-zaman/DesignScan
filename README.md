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

This is a [pnpm](https://pnpm.io) workspace (`corepack enable` to get pnpm).

```bash
pnpm install
pnpm --filter @designscan/extractor exec playwright install chromium  # one-time

# token profile (JSON) for any URL
pnpm extract stripe.com

# generate a DESIGN.md
pnpm extract stripe.com --md --out out/stripe.DESIGN.md
```

## Scripts (root)

| Script | Does |
|--------|------|
| `pnpm extract <url> [--md] [--dark] [--out f]` | Extract tokens / generate `DESIGN.md` |
| `pnpm typecheck` | Type-check all packages |
| `pnpm test` | Run the test suite (vitest) |
| `pnpm check` | Biome — format + lint (use `pnpm format` to auto-fix) |
| `pnpm lint:designmd` | Validate `examples/*.DESIGN.md` against the official spec |

All of these run on every push/PR via [GitHub Actions](.github/workflows/ci.yml).
The engine is consumable as a library through its public API
([`packages/extractor/src/index.ts`](packages/extractor/src/index.ts)).

## Status

- [x] **Step 1 — Extraction engine** (Playwright → clean token profile)
- [x] **Step 2 — Generator** (token profile → spec-valid `DESIGN.md`, lint-clean)
- [ ] **Step 3** — LLM-refined prose & color-role assignment
- [ ] **Step 4** — HTML preview, brand-seed library, `npx ... add`, checkout

See [`packages/extractor/README.md`](packages/extractor/README.md) for the full
roadmap and engine details.
