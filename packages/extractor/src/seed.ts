#!/usr/bin/env node
// Brand-seed library runner. Builds the curated public corpus under examples/:
// for each brand it writes a token JSON, a spec `DESIGN.md`, and a self-contained
// HTML preview, then regenerates the gallery (index.html) and markdown index
// (README.md).
//
//   pnpm seed rebuild            # regen md/preview/index from committed JSON (no network)
//   pnpm seed add <url> [url...] # extract live, write artifacts, then rebuild
//
// `add` skips any brand whose extraction looks degenerate (bot challenge / too
// few signals) so the corpus only ever contains real, trustworthy specs.

import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extract } from "./extract.js";
import {
  GALLERY_CSS,
  GALLERY_CSS_FILENAME,
  type GalleryEntry,
  galleryHtml,
  galleryMarkdown,
} from "./gallery.js";
import { generate } from "./generate.js";
import { normalize, profileWarnings } from "./normalize.js";
import { preview } from "./preview.js";
import type { DesignProfile } from "./types.js";

const EXAMPLES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../examples",
);

// A stored brand is either a flat light profile or a {light, dark} bundle.
type Stored = DesignProfile | { light: DesignProfile; dark?: DesignProfile };
const asProfile = (s: Stored): DesignProfile =>
  "light" in s ? s.light : (s as DesignProfile);
const asDark = (s: Stored): DesignProfile | undefined =>
  "light" in s ? s.dark : undefined;

function slugFromUrl(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, "");
  return host.split(".")[0].replace(/[^a-z0-9]+/gi, "-");
}

async function writeArtifacts(name: string, stored: Stored): Promise<void> {
  const profile = asProfile(stored);
  const dark = asDark(stored);
  await writeFile(
    join(EXAMPLES_DIR, `${name}.json`),
    `${JSON.stringify(stored, null, 2)}\n`,
  );
  await writeFile(
    join(EXAMPLES_DIR, `${name}.DESIGN.md`),
    generate(profile, dark),
  );
  await writeFile(
    join(EXAMPLES_DIR, `${name}.preview.html`),
    preview(profile, dark),
  );
}

async function rebuild(): Promise<void> {
  const files = (await readdir(EXAMPLES_DIR)).filter((f) =>
    f.endsWith(".json"),
  );
  const entries: GalleryEntry[] = [];
  for (const f of files) {
    const name = basename(f, ".json");
    const stored = JSON.parse(
      await readFile(join(EXAMPLES_DIR, f), "utf8"),
    ) as Stored;
    await writeArtifacts(name, stored);
    entries.push({ name, profile: asProfile(stored) });
  }
  await writeFile(join(EXAMPLES_DIR, "index.html"), galleryHtml(entries));
  await writeFile(join(EXAMPLES_DIR, GALLERY_CSS_FILENAME), GALLERY_CSS);
  await writeFile(join(EXAMPLES_DIR, "README.md"), galleryMarkdown(entries));
  process.stderr.write(
    `✓ rebuilt ${entries.length} brand(s) → examples/index.html + README.md\n`,
  );
}

async function add(rawUrls: string[]): Promise<void> {
  for (const raw of rawUrls) {
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const name = slugFromUrl(url);
    process.stderr.write(`→ seeding ${name} (${url})\n`);
    try {
      const profile = normalize(url, await extract(url, { timeoutMs: 60000 }));
      const warnings = profileWarnings(profile);
      if (warnings.length) {
        process.stderr.write(`  ⚠ skipped (${warnings[0]})\n`);
        continue;
      }
      await writeArtifacts(name, profile);
      process.stderr.write(`  ✓ primary ${profile.colors.primary}\n`);
    } catch (e) {
      process.stderr.write(`  ✗ ${(e as Error).message}\n`);
    }
  }
  await rebuild();
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === undefined || cmd === "rebuild") {
  await rebuild();
} else if (cmd === "add") {
  if (!args.length) {
    process.stderr.write("usage: seed add <url> [url...]\n");
    process.exit(1);
  }
  await add(args);
} else {
  process.stderr.write(
    `unknown command "${cmd}" (use: rebuild | add <url...>)\n`,
  );
  process.exit(1);
}
