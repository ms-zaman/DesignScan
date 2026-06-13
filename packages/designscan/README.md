# designscan

The short CLI name for [`@designscan/extractor`](https://www.npmjs.com/package/@designscan/extractor) —
**any URL → design tokens → `DESIGN.md`**, extracted from the live page. Runs
locally, no API key.

```bash
# one-time: install the headless browser
npx playwright install chromium

# any URL -> DESIGN.md (Google Labs open format)
npx designscan stripe.com --md --out stripe.DESIGN.md

# other formats: w3c (W3C Design Tokens JSON) | css (custom properties) | json
npx designscan vercel.com --format w3c --out vercel.tokens.json

# light + dark themes merged into one file, plus a visual proof sheet
npx designscan linear.app --theme both --md --preview --out linear.DESIGN.md

# MCP server for coding agents (stdio)
npx designscan mcp
```

This package is a thin shim: the engine — extraction, normalization, all the
emitters — lives in `@designscan/extractor` and is installed as this package's
only dependency. Docs, options, and the brand-corpus gallery:

- **Repo / full docs:** https://github.com/ms-zaman/DesignScan
- **Live gallery & how it works:** https://ms-zaman.github.io/DesignScan/
