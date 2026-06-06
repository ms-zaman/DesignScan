// Records real RawObservations from live sites into committed *.raw.json
// fixtures, so the normalize/generate heuristics can be regression-tested
// against real-world data without a browser or network in CI.
//
// Re-run after changing the shape of RawObservations (extract.ts), or to refresh
// against a site redesign:
//
//   pnpm --filter @designscan/extractor exec tsx src/__fixtures__/capture.ts
//
// The golden tests (golden.test.ts) then assert the profiles these produce.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extract } from "../extract.js";

const SITES: { name: string; url: string; scheme: "light" | "dark" }[] = [
  // Light, brand-colored CTA + slate body text + fractional-noise sizes.
  { name: "stripe", url: "https://stripe.com", scheme: "light" },
  // Light, monochrome brand (black primary via the contrast guard).
  { name: "vercel-light", url: "https://vercel.com", scheme: "light" },
  // Real prefers-color-scheme dark theme (inverted palette).
  { name: "vercel-dark", url: "https://vercel.com", scheme: "dark" },
];

const dir = dirname(fileURLToPath(import.meta.url));

for (const site of SITES) {
  process.stderr.write(`→ capturing ${site.name} (${site.scheme})\n`);
  const raw = await extract(site.url, { colorScheme: site.scheme });
  const file = join(dir, `${site.name}.raw.json`);
  writeFileSync(file, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
  process.stderr.write(`✓ wrote ${file}\n`);
}
