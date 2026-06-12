#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Command } from "commander";
import { extract } from "./extract.js";
import { emit, OUTPUT_FORMATS, type OutputFormat } from "./formats.js";
import { runMcpServer } from "./mcp.js";
import { normalize, profileWarnings } from "./normalize.js";
import { preview } from "./preview.js";

// Where the preview .html lands relative to the run. With --out we sit beside
// the spec file (out/stripe.DESIGN.md -> out/stripe.preview.html); without it we
// fall back to a slug of the hostname in the cwd.
function previewPath(out: string | undefined, target: string): string {
  if (out)
    return `${out.replace(/\.(DESIGN\.md|tokens\.json|md|json|css)$/i, "")}.preview.html`;
  let host = target;
  try {
    host = new URL(target).hostname;
  } catch {}
  return `${host.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "design"}.preview.html`;
}

const program = new Command();

// `designscan mcp` — run as an MCP server over stdio so coding agents
// (Claude Code, Cursor, …) can call the extraction as a tool. Registered as a
// subcommand: commander routes a literal first arg of "mcp" here, anything
// else (URLs) falls through to the default extract action below.
program
  .command("mcp")
  .description(
    "run as an MCP (Model Context Protocol) server over stdio, exposing " +
      "get_design_tokens(url, format, theme) to coding agents",
  )
  .action(async () => {
    await runMcpServer();
    // Keep the process alive for the transport; it exits when stdin closes.
  });

program
  .name("designscan")
  .description("Extract a website's design tokens (step 1: URL -> tokens)")
  .argument("<url>", "URL to analyze")
  .option("-o, --out <file>", "write the output to a file instead of stdout")
  .option(
    "--format <fmt>",
    "output format: json (DesignProfile) | md (DESIGN.md, Google format) | " +
      "w3c (W3C Design Tokens JSON) | css (CSS custom properties)",
    "json",
  )
  .option("--md", "shorthand for --format md", false)
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
  .option(
    "--strict",
    "exit non-zero if the extraction looks degenerate (bot challenge / too " +
      "few signals) — for CI/automation that must not trust junk tokens",
    false,
  )
  .action(async (url: string, opts) => {
    const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;

    const theme = String(opts.theme).toLowerCase();
    if (theme !== "light" && theme !== "dark" && theme !== "both") {
      throw new Error(
        `invalid --theme "${opts.theme}" (expected: light | dark | both)`,
      );
    }

    // --md predates --format and stays as a shorthand for it.
    const format = (
      opts.md ? "md" : String(opts.format).toLowerCase()
    ) as OutputFormat;
    if (!OUTPUT_FORMATS.includes(format)) {
      throw new Error(
        `invalid --format "${opts.format}" (expected: ${OUTPUT_FORMATS.join(" | ")})`,
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
    if (theme === "both") {
      // Light is the base document; dark is folded in as parallel tokens.
      profile = await run("light");
      dark = await run("dark");
    } else {
      profile = await run(theme);
    }

    // Every emitter takes (light, dark?) and decides for itself whether the
    // dark pass is distinct enough to include (they all share isDistinctDark).
    const output = emit(format, profile, dark);

    if (opts.out) {
      await mkdir(dirname(opts.out), { recursive: true });
      await writeFile(opts.out, output, "utf8");
      process.stderr.write(`✓ wrote ${opts.out}\n`);
    } else {
      process.stdout.write(output);
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
          ...(profile.layout
            ? [
                `  layout      ${[
                  profile.layout.containerMaxWidthPx
                    ? `container ${profile.layout.containerMaxWidthPx}px`
                    : "",
                  profile.layout.breakpointsPx?.length
                    ? `breaks(px) ${profile.layout.breakpointsPx.join(" ")}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}`,
              ]
            : []),
          "",
        ].join("\n"),
      );
    }

    // Always surface quality warnings (even under --quiet): a bot-challenge or
    // near-empty extraction must never be mistaken for real tokens.
    const warnings = profileWarnings(profile);
    for (const w of warnings) {
      process.stderr.write(`⚠ ${w}\n`);
    }
    // --strict turns those warnings into a failing exit code so CI/automation
    // doesn't silently consume a challenge page or a near-empty render as if it
    // were real tokens. The output is still written (callers may want to inspect
    // it); only the exit status changes.
    if (opts.strict && warnings.length) {
      process.stderr.write(
        "✗ --strict: the extraction looks unreliable (see warnings above)\n",
      );
      process.exitCode = 1;
    }
  });

program.parseAsync().catch((err) => {
  process.stderr.write(`✗ ${err?.message ?? err}\n`);
  process.exit(1);
});
