import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createMcpServer } from "./mcp.js";
import type { RawObservations } from "./types.js";

// Full-wiring test: a real MCP client talks to the real server over a linked
// in-memory transport — schema validation, dispatch, and content shaping all
// run for real. Only the browser pass is stubbed (recorded observations), so
// no Chromium launch and no network.

const fxDir = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__");
const stripeRaw = JSON.parse(
  readFileSync(join(fxDir, "stripe.raw.json"), "utf8"),
) as RawObservations;

async function connect(extract: (...args: unknown[]) => Promise<unknown>) {
  const server = createMcpServer({
    extract: extract as never,
  });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return client;
}

const okExtract = async () => stripeRaw;

function textOf(res: Awaited<ReturnType<Client["callTool"]>>): string {
  const content = res.content as { type: string; text: string }[];
  return content.map((c) => c.text).join("\n");
}

describe("designscan mcp – get_design_tokens", () => {
  it("lists the tool with its input schema", async () => {
    const client = await connect(okExtract);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(["get_design_tokens"]);
    expect(tools[0].inputSchema.properties).toHaveProperty("url");
    expect(tools[0].inputSchema.properties).toHaveProperty("format");
  });

  it("returns a DESIGN.md by default and assumes https://", async () => {
    const client = await connect(okExtract);
    const res = await client.callTool({
      name: "get_design_tokens",
      arguments: { url: "stripe.com" },
    });
    expect(res.isError ?? false).toBe(false);
    const text = textOf(res);
    expect(text).toContain("version: alpha");
    expect(text).toContain("https://stripe.com");
    expect(text).toContain("## Notes for your coding agent");
  });

  it("honours the format argument (css)", async () => {
    const client = await connect(okExtract);
    const res = await client.callTool({
      name: "get_design_tokens",
      arguments: { url: "https://stripe.com", format: "css" },
    });
    const text = textOf(res);
    expect(text).toContain(":root {");
    expect(text).toContain("--color-primary:");
  });

  it("rejects an unknown format at the schema layer", async () => {
    const client = await connect(okExtract);
    const res = await client.callTool({
      name: "get_design_tokens",
      arguments: { url: "https://stripe.com", format: "scss" },
    });
    // Schema validation failure surfaces as a tool error, not a crash.
    expect(res.isError).toBe(true);
  });

  it("surfaces extraction failures as isError content, not a protocol fault", async () => {
    const client = await connect(async () => {
      throw new Error("net::ERR_NAME_NOT_RESOLVED");
    });
    const res = await client.callTool({
      name: "get_design_tokens",
      arguments: { url: "https://nope.invalid" },
    });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain("Extraction failed for https://nope.invalid");
    expect(textOf(res)).toContain("ERR_NAME_NOT_RESOLVED");
  });

  it("appends a warnings block for a degenerate extraction", async () => {
    // A near-empty observation set trips profileWarnings.
    const client = await connect(async () => ({
      ...stripeRaw,
      title: "Just a moment...",
    }));
    const res = await client.callTool({
      name: "get_design_tokens",
      arguments: { url: "https://stripe.com" },
    });
    expect(textOf(res)).toContain("⚠ Extraction warnings");
  });
});
