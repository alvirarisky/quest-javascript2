export const pauseReasons = new Set<string>();
export const keys = new Set<string>();
export function resetInput() {
  keys.clear();
}
export const settings = {
  reduced:
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches,
  volume: 0.25,
  gore: true,
};
