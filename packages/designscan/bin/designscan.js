#!/usr/bin/env node
// `designscan` is the short npx name for @designscan/extractor — one tiny
// shim so the real CLI lives (and versions) with the engine. The dependency
// range (>=0.4.0 <1) floats across 0.x minors, so engine releases don't
// require a wrapper republish. The engine exposes its CLI as a "./cli"
// subpath export, so this is a plain re-entry into that bin.
import "@designscan/extractor/cli";
