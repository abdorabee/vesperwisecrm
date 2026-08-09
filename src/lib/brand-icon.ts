const BRAND_BACKGROUND = "#090a08";
const BRAND_LIME = "#dfff00";

const MONOGRAM_PATHS = [
  "M92 156H129L163 310L198 156H235L186 356H139L92 156Z",
  "M243 156H280L306 302L332 204L358 302L383 156H420L385 356H346L332 289L318 356H279L243 156Z",
] as const;

export function createVesperWiseMarkSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="VesperWise VW mark"><rect width="512" height="512" fill="${BRAND_BACKGROUND}"/><g fill="${BRAND_LIME}">${MONOGRAM_PATHS.map((path) => `<path d="${path}"/>`).join("")}</g></svg>`;
}
