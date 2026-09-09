import { ABOUT_SERIES_SOURCE } from "./aboutSeries";

export const RELEASE_SCOPE_TITLE = "CHECK THE RELEASE SCOPE";
export const RELEASE_SCOPE_SOURCE = ABOUT_SERIES_SOURCE.url;
export const RELEASE_SCOPE_EVIDENCE = "RELEASE NOTE: SECTION B ONLY";
export const RELEASE_SCOPE_PARTS = [
  { id: "source", label: "A SOURCE" },
  { id: "excerpt", label: "B EXCERPT" },
  { id: "annex", label: "C ANNEX" }
] as const;
export type ReleaseScopePart = 0 | 1 | 2;

// Fictional draft mistakenly marks the whole parent record for publication.
export function restoreReleaseScope(value: number | undefined): number {
  return value !== undefined && Number.isInteger(value) && value >= 0 && value <= 7 ? value : 7;
}

export function toggleReleaseScope(value: number, part: ReleaseScopePart): number {
  return restoreReleaseScope(value) ^ (1 << part);
}

export function validateReleaseScope(value: number) {
  const mask = restoreReleaseScope(value);
  if (mask & 5) return { ok: false, message: "A AND C ARE NOT CLEARED" };
  if (!(mask & 2)) return { ok: false, message: "KEEP THE CLEARED EXCERPT" };
  return { ok: true, message: "RELEASE SCOPE VERIFIED" };
}
