import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Command } from "commander";
import { extract } from "./extract.js";
import { generate } from "./generate.js";
import { normalize } from "./normalize.js";

const program = new Command();

program
  .name("designscan")
  .description("Extract a website's design tokens (step 1: URL -> tokens)")
  .argument("<url>", "URL to analyze")
  .option("-o, --out <file>", "write the output to a file instead of stdout")
  .option("--md", "emit a DESIGN.md (Google format) instead of profile JSON", false)
  .option("--dark", "extract the dark theme (emulates prefers-color-scheme: dark)", false)
  .option("--headful", "run the browser with a visible window", false)
  .option("--quiet", "suppress the human-readable summary", false)
  .action(async (url: string, opts) => {
    const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const scheme = opts.dark ? "dark" : "light";
    process.stderr.write(`→ analyzing ${target} (${scheme})\n`);

    const raw = await extract(target, {
      headful: opts.headful,
      colorScheme: scheme,
    });
    const profile = normalize(target, raw);
    const output = opts.md ? generate(profile) : JSON.stringify(profile, null, 2);

    if (opts.out) {
      await mkdir(dirname(opts.out), { recursive: true });
      await writeFile(opts.out, output, "utf8");
      process.stderr.write(`✓ wrote ${opts.out}\n`);
    } else {
      process.stdout.write(output + (opts.md ? "" : "\n"));
    }

    if (!opts.quiet) {
      const c = profile.colors;
      process.stderr.write(
        [
          "",
          `  title       ${profile.title}`,
          `  background  ${c.background ?? "?"}`,
          `  text        ${c.text ?? "?"}`,
          `  primary     ${c.primary ?? "?"}`,
          `  palette     ${c.palette.slice(0, 6).map((p) => p.hex).join(" ")}`,
          `  fonts       ${profile.typography.families.join(", ") || "?"}`,
          `  sizes(px)   ${profile.typography.sizeScalePx.join(" ")}`,
          `  spacing(px) ${profile.spacingScalePx.join(" ")}`,
          `  radius(px)  ${profile.radiusScalePx.join(" ")}`,
          "",
        ].join("\n"),
      );
    }
  });

program.parseAsync().catch((err) => {
  process.stderr.write(`✗ ${err?.message ?? err}\n`);
  process.exit(1);
});
