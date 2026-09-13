import { ABOUT_SERIES_HANDBOOK_PAGES, ABOUT_SERIES_SOURCE } from "../game/aboutSeries";
import type { CodexCategory, CodexEntryReadout } from "../game/codex";
import { pauseTextPages, type PauseHit } from "./pauseMenu";

export const CODEX_LIST_SIZE = 3;
export const CODEX_TABS: readonly PauseHit[] = ["Enemies", "NPCs", "DANN-E Variants", "Items", "close"]
  .map((id, index) => ({ id, x: 32 + index * 48, y: 24, width: 44, height: 44 }));
export const CODEX_BACK: PauseHit = { id: "back", x: 24, y: 24, width: 44, height: 44 };
export const CODEX_CLOSE: PauseHit = { id: "close", x: 232, y: 24, width: 44, height: 44 };
export const CODEX_PREVIOUS: PauseHit = { id: "previous", x: 24, y: 214, width: 44, height: 44 };
export const CODEX_NEXT: PauseHit = { id: "next", x: 232, y: 214, width: 44, height: 44 };
export const CODEX_SOURCE: PauseHit = { id: "source", x: 128, y: 214, width: 140, height: 44 };

export function codexEntryHit(row: number): PauseHit {
  return { id: `entry-${row}`, x: 128, y: 70 + row * 46, width: 236, height: 44 };
}

export function codexListWindow(index: number, count: number) {
  const selected = Math.max(0, Math.min(Math.max(0, count - 1), index));
  const page = Math.floor(selected / CODEX_LIST_SIZE);
  return { selected, page, start: page * CODEX_LIST_SIZE, pages: Math.max(1, Math.ceil(count / CODEX_LIST_SIZE)) };
}

export function turnCodexList(index: number, count: number, direction: -1 | 1) {
  const { page, pages } = codexListWindow(index, count);
  return ((page + direction + pages) % pages) * CODEX_LIST_SIZE;
}

export function codexDetailPages(entry: CodexEntryReadout) {
  if (!entry.unlocked) return pauseTextPages("Encounter this entry in the field to reveal its notes.", 36, 7)
    .map((text) => ({ title: "UNDISCOVERED", text }));
  if (entry.sourceUrl === ABOUT_SERIES_SOURCE.url) {
    return ABOUT_SERIES_HANDBOOK_PAGES.flatMap((page) => pauseTextPages(page.text, 36, 10)
      .map((text) => ({ title: page.title, text })));
  }
  return entry.lore.split(/\n\n+/).flatMap((paragraph) => pauseTextPages(paragraph, 36, 7))
    .map((text) => ({ title: entry.displayName, text }));
}

// Keep native sprites at 1x; reduce large portrait sheets by whole-number divisors.
export function codexArtScale(width: number, height: number, size: number) {
  return 1 / Math.max(1, Math.ceil(Math.max(width, height) / size));
}

export interface CodexViewReadout {
  category: CodexCategory;
  view: "list" | "detail";
  selectedId: string | null;
  selectedName: string;
  selectedIndex: number;
  page: number;
  pages: number;
  title: string;
  text: string | null;
  sourceUrl: string | null;
  visibleEntries: { id: string; name: string; unlocked: boolean }[];
  controls: PauseHit[];
}

let readout: CodexViewReadout | null = null;
export function setCodexViewReadout(value: CodexViewReadout | null) { readout = value; }
export function getCodexViewReadout() { return readout; }
