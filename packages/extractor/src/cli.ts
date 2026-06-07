#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Command } from "commander";
import { extract } from "./extract.js";
import { generate } from "./generate.js";
import { normalize, profileWarnings } from "./normalize.js";
import { preview } from "./preview.js";

// Where the preview .html lands relative to the run. With --out we sit beside
// the spec file (out/stripe.DESIGN.md -> out/stripe.preview.html); without it we
// fall back to a slug of the hostname in the cwd.
function previewPath(out: string | undefined, target: string): string {
  if (out) return `${out.replace(/\.(DESIGN\.md|md|json)$/i, "")}.preview.html`;
  let host = target;
  try {
    host = new URL(target).hostname;
  } catch {}
  return `${host.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "design"}.preview.html`;
}

const program = new Command();

program
  .name("designscan")
  .description("Extract a website's design tokens (step 1: URL -> tokens)")
  .argument("<url>", "URL to analyze")
  .option("-o, --out <file>", "write the output to a file instead of stdout")
  .option(
    "--md",
    "emit a DESIGN.md (Google format) instead of profile JSON",
    false,
  )
  .option(
    "--theme <mode>",
    "which theme(s) to capture: light | dark | both " +
      "(both = merge into one file; dark is emulated via prefers-color-scheme)",
    "light",
  )
  .option(
    "--preview",
    "also write a self-contained HTML proof sheet rendering the tokens " +
      "(<out>.preview.html, or <host>.preview.html without --out)",
    false,
  )
  .option(
    "--timeout <ms>",
    "per-navigation timeout in milliseconds (raise it for slow sites)",
    "45000",
  )
  .option("--headful", "run the browser with a visible window", false)
  .option("--quiet", "suppress the human-readable summary", false)
  .action(async (url: string, opts) => {
    const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;

    const theme = String(opts.theme).toLowerCase();
    if (theme !== "light" && theme !== "dark" && theme !== "both") {
      throw new Error(
        `invalid --theme "${opts.theme}" (expected: light | dark | both)`,
      );
    }

    const timeoutMs = Number(opts.timeout);
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new Error(`invalid --timeout "${opts.timeout}" (expected ms > 0)`);
    }

    const run = async (scheme: "light" | "dark") => {
      process.stderr.write(`→ analyzing ${target} (${scheme})\n`);
      const raw = await extract(target, {
        headful: opts.headful,
        colorScheme: scheme,
        timeoutMs,
      });
      return normalize(target, raw);
    };

    let profile: ReturnType<typeof normalize>;
    let dark: ReturnType<typeof normalize> | undefined;
    let output: string;
    if (theme === "both") {
      // Light is the base document; dark is folded in as parallel tokens.
      const light = await run("light");
      dark = await run("dark");
      profile = light;
      output = opts.md
        ? generate(light, dark)
        : JSON.stringify({ light, dark }, null, 2);
    } else {
      profile = await run(theme);
      output = opts.md ? generate(profile) : JSON.stringify(profile, null, 2);
    }

    if (opts.out) {
      await mkdir(dirname(opts.out), { recursive: true });
      await writeFile(opts.out, output, "utf8");
      process.stderr.write(`✓ wrote ${opts.out}\n`);
    } else {
      process.stdout.write(output + (opts.md ? "" : "\n"));
    }

    if (opts.preview) {
      const html = preview(profile, dark);
      const htmlPath = previewPath(opts.out, target);
      await mkdir(dirname(htmlPath), { recursive: true });
      await writeFile(htmlPath, html, "utf8");
      process.stderr.write(`✓ wrote ${htmlPath}\n`);
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
          `  palette     ${c.palette
            .slice(0, 6)
            .map((p) => p.hex)
            .join(" ")}`,
          `  fonts       ${profile.typography.families.join(", ") || "?"}`,
          `  sizes(px)   ${profile.typography.sizeScalePx.join(" ")}`,
          `  spacing(px) ${profile.spacingScalePx.join(" ")}`,
          `  radius(px)  ${profile.radiusScalePx.join(" ")}`,
          "",
        ].join("\n"),
      );
    }

    // Always surface quality warnings (even under --quiet): a bot-challenge or
    // near-empty extraction must never be mistaken for real tokens.
    for (const w of profileWarnings(profile)) {
      process.stderr.write(`⚠ ${w}\n`);
    }
  });

program.parseAsync().catch((err) => {
  process.stderr.write(`✗ ${err?.message ?? err}\n`);
  process.exit(1);
});
