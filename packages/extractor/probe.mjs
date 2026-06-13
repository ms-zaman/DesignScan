import { extract } from "./src/extract.js";
const sites = process.argv.slice(2);
const RE = /error|danger|destructive|critical|negative|success|positive|warn|caution|info(?!nity)|alert/i;
for (const url of sites) {
  try {
    const raw = await extract(url.includes("://") ? url : "https://" + url, { settleMs: 1500, timeoutMs: 40000 });
    const cp = raw.customProps || {};
    const hits = Object.entries(cp).filter(([k]) => RE.test(k));
    console.log(`\n=== ${url} === (${Object.keys(cp).length} props, ${hits.length} status-named)`);
    for (const [k, v] of hits.slice(0, 30)) console.log("  ", k, "=", v);
  } catch (e) {
    console.log(`\n=== ${url} === ERROR: ${e.message}`);
  }
}
