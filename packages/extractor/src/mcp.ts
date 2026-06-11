// DesignScan as an MCP (Model Context Protocol) server.
//
// Thesis fit: the consuming agent IS the AI layer (see agentNotes.ts) — so
// instead of only shipping files, put the extraction itself in the agent's
// hands as a tool. `designscan mcp` speaks MCP over stdio; a coding agent
// configures it once and can then pull live tokens for any URL mid-task
// ("restyle this app like stripe.com") without leaving its session.
//
// One focused tool, `get_design_tokens`, returning the same outputs as the
// CLI (emit() is shared, so the two surfaces can never drift). stdout is the
// transport channel — nothing here may write to it; diagnostics go to stderr.

import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { extract } from "./extract.js";
import { emit, OUTPUT_FORMATS } from "./formats.js";
import { normalize, profileWarnings } from "./normalize.js";

const VERSION: string = createRequire(import.meta.url)(
  "../package.json",
).version;

// The browser pass is injectable so tests can exercise the full MCP wiring
// (transport, schema validation, tool dispatch) against recorded observations
// instead of launching Chromium.
export interface McpDeps {
  extract: typeof extract;
}

export function createMcpServer(deps: McpDeps = { extract }): McpServer {
  const server = new McpServer({ name: "designscan", version: VERSION });

  server.registerTool(
    "get_design_tokens",
    {
      title: "Extract a website's design tokens",
      description:
        "Render a URL in a headless browser and extract its design system as " +
        "tokens: colors (background/text/primary + observed button :hover), " +
        "typography scale, spacing, radii, shadows, and component specs. " +
        "Formats: md = DESIGN.md (YAML front matter + prose, includes 'Notes " +
        "for your coding agent'), w3c = W3C Design Tokens JSON, css = CSS " +
        "custom properties, json = the raw DesignProfile. Takes ~10-30s (a " +
        "real browser drives the page).",
      inputSchema: {
        url: z
          .string()
          .describe(
            "Page to analyze, e.g. https://stripe.com (https:// is assumed if missing)",
          ),
        format: z
          .enum(OUTPUT_FORMATS)
          .optional()
          .describe("Output format (default: md)"),
        theme: z
          .enum(["light", "dark", "both"])
          .optional()
          .describe(
            "Color scheme(s) to capture via prefers-color-scheme " +
              "(default: light; 'both' merges a distinct dark pass into the output)",
          ),
        timeoutMs: z
          .number()
          .int()
          .positive()
          .max(180_000)
          .optional()
          .describe("Per-navigation timeout in ms (default: 45000)"),
      },
    },
    async ({ url, format = "md", theme = "light", timeoutMs = 45_000 }) => {
      const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      try {
        const run = async (scheme: "light" | "dark") =>
          normalize(
            target,
            await deps.extract(target, { colorScheme: scheme, timeoutMs }),
          );
        const profile = await run(theme === "dark" ? "dark" : "light");
        const dark = theme === "both" ? await run("dark") : undefined;

        // Quality warnings (bot challenge, near-empty render) ride along as a
        // separate block — an agent must never mistake junk for real tokens.
        const warnings = [profile, ...(dark ? [dark] : [])].flatMap((p) =>
          profileWarnings(p),
        );
        return {
          content: [
            { type: "text" as const, text: emit(format, profile, dark) },
            ...(warnings.length
              ? [
                  {
                    type: "text" as const,
                    text: `⚠ Extraction warnings — treat these tokens with suspicion:\n${warnings
                      .map((w) => `- ${w}`)
                      .join("\n")}`,
                  },
                ]
              : []),
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Extraction failed for ${target}: ${
                err instanceof Error ? err.message : String(err)
              }`,
            },
          ],
        };
      }
    },
  );

  return server;
}

export async function runMcpServer(): Promise<void> {
  await createMcpServer().connect(new StdioServerTransport());
  process.stderr.write(`designscan mcp ${VERSION} ready (stdio)\n`);
}
