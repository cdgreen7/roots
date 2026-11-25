/**
 * Thee unit helpers convert the board/API units to units used in frontend (essentially C to F), and vice versa if necessary. 
 * They also provide a helper to format readings for display.
 */

// cToF converts C to F, rounded to one decimal place. Returns null when there is no value.
export function cToF(c: number | null | undefined): number | null {
  if (c == null) return null;
  return Math.round((c * 9 / 5 + 32) * 10) / 10;
}

// fToC converts F to C, rounded to one decimal place.
export function fToC(f: number): number {
  return Math.round(((f - 32) * 5 / 9) * 10) / 10;
}

// show formats a reading for display, or "--" when there isn't one.
export function show(value: number | null | undefined, digits = 1): string {
  return value == null ? '--' : String(Number(value.toFixed(digits)));
}