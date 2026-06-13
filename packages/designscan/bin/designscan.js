#!/usr/bin/env node
// `designscan` is the short npx name for @designscan/extractor — one tiny
// shim so the real CLI lives (and versions) with the engine. The dependency
// range (>=0.3.1 <1) floats across 0.x minors, so engine releases don't
// require a wrapper republish.
//
// The engine's `exports` map only exposes the library root, so the CLI entry
// is reached *relative to it*: resolve the package root URL, then import the
// cli.js that sits beside index.js in dist/. import.meta.resolve goes through
// the module resolver, so this works in npm/pnpm/yarn layouts alike — no
// node_modules path guessing. (Once the engine publishes a "./cli" export,
// this can become a plain `import "@designscan/extractor/cli"`.)
const indexUrl = import.meta.resolve("@designscan/extractor");
await import(new URL("cli.js", indexUrl));
