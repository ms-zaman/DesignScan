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
export { generate } from "./generate.js";
export { normalize } from "./normalize.js";
export { preview } from "./preview.js";
export type {
  ButtonSample,
  DesignProfile,
  RawObservations,
} from "./types.js";
export { PROFILE_SCHEMA_VERSION } from "./types.js";
