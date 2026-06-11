// Public API for @designscan/extractor. Downstream packages (a future
// generator/CLI/editor integration) should import from here, not deep paths.

export type { RGBA } from "./color.js";
export {
  isNeutral,
  luminance,
  parseColor,
  saturation,
  toHex,
} from "./color.js";
export type { ExtractOptions } from "./extract.js";
export { extract } from "./extract.js";
export type { OutputFormat } from "./formats.js";
export { cssVars, emit, OUTPUT_FORMATS, w3cTokens } from "./formats.js";
export { generate } from "./generate.js";
export { createMcpServer, runMcpServer } from "./mcp.js";
export { normalize, profileWarnings } from "./normalize.js";
export { preview } from "./preview.js";
export type { ShadowToken } from "./resolve.js";
export { shadowTokens } from "./resolve.js";
export type {
  ButtonSample,
  DesignProfile,
  HoverSample,
  InputSample,
  RawObservations,
} from "./types.js";
export { PROFILE_SCHEMA_VERSION } from "./types.js";
