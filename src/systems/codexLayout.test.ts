import { describe, expect, it } from "vitest";
import { ABOUT_SERIES_HANDBOOK_PAGES, ABOUT_SERIES_SOURCE } from "../game/aboutSeries";
import { CODEX_CATEGORIES, CODEX_ENTRIES, getCodexEntries, type CodexEntryReadout } from "../game/codex";
import { DANNE_ENEMY_VARIANTS } from "../entities/danneVariants";
import {
  CODEX_BACK, CODEX_CLOSE, CODEX_LIST_SIZE, CODEX_NEXT, CODEX_PREVIOUS, CODEX_SOURCE, CODEX_TABS,
  codexArtScale, codexDetailPages, codexEntryHit, codexListWindow, turnCodexList
} from "./codexLayout";
import type { PauseHit } from "./pauseMenu";

const compact = (text: string) => text.replace(/\s/g, "");
const overlaps = (a: PauseHit, b: PauseHit) => Math.abs(a.x - b.x) < (a.width + b.width) / 2
  && Math.abs(a.y - b.y) < (a.height + b.height) / 2;

describe("readable field guide", () => {
  it.each([
    [...CODEX_TABS, ...Array.from({ length: CODEX_LIST_SIZE }, (_, row) => codexEntryHit(row)), CODEX_PREVIOUS, CODEX_NEXT],
    [CODEX_BACK, CODEX_CLOSE, CODEX_PREVIOUS, CODEX_NEXT, CODEX_SOURCE]
  ])("keeps every touch target at least 44px, separate and within the canvas", (...hits: PauseHit[]) => {
    for (const [index, hit] of hits.entries()) {
      expect(hit.width).toBeGreaterThanOrEqual(44);
      expect(hit.height).toBeGreaterThanOrEqual(44);
      expect(hit.x - hit.width / 2).toBeGreaterThanOrEqual(0);
      expect(hit.y - hit.height / 2).toBeGreaterThanOrEqual(0);
      expect(hit.x + hit.width / 2).toBeLessThanOrEqual(256);
      expect(hit.y + hit.height / 2).toBeLessThanOrEqual(240);
      for (const other of hits.slice(index + 1)) expect(overlaps(hit, other), `${hit.id}/${other.id}`).toBe(false);
    }
  });

  it("reaches every entry with page buttons, including short final pages", () => {
    for (const category of CODEX_CATEGORIES) {
      const entries = getCodexEntries(category), seen: string[] = [];
      let index = 0;
      for (let page = 0; page < codexListWindow(0, entries.length).pages; page++) {
        const window = codexListWindow(index, entries.length);
        seen.push(...entries.slice(window.start, window.start + CODEX_LIST_SIZE).map((entry) => entry.id));
        index = turnCodexList(index, entries.length, 1);
      }
      expect(seen).toEqual(entries.map((entry) => entry.id));
      expect(index).toBe(0);
      expect(turnCodexList(0, entries.length, -1)).toBe(Math.floor((entries.length - 1) / CODEX_LIST_SIZE) * CODEX_LIST_SIZE);
    }
    expect(codexListWindow(100, 4).selected).toBe(3);
    expect(codexListWindow(-4, 4).selected).toBe(0);
    expect(turnCodexList(0, 0, 1)).toBe(0);
  });

  it("retains all unlocked lore without truncation or undersized type", () => {
    for (const entry of CODEX_ENTRIES.filter((entry) => !entry.sourceUrl)) {
      const pages = codexDetailPages({ ...entry, unlocked: true });
      expect(compact(pages.map((page) => page.text).join(""))).toBe(compact(entry.lore));
      for (const page of pages) {
        expect(page.text.split("\n").length).toBeLessThanOrEqual(7);
        for (const line of page.text.split("\n")) expect(line.length).toBeLessThanOrEqual(36);
      }
    }
  });

  it("preserves every handbook section and the official source", () => {
    const entry = getCodexEntries("Items").find((entry) => entry.id === "item-series-handbook")!;
    const pages = codexDetailPages(entry);
    expect(entry.sourceUrl).toBe(ABOUT_SERIES_SOURCE.url);
    expect(pages.map((page) => page.title)).toEqual(ABOUT_SERIES_HANDBOOK_PAGES.map((page) => page.title));
    expect(compact(pages.map((page) => page.text).join(""))).toBe(compact(ABOUT_SERIES_HANDBOOK_PAGES.map((page) => page.text).join("")));
  });

  it("never reveals a locked entry's name, source or lore in its detail pages", () => {
    const entry: CodexEntryReadout = { id: "secret", category: "Enemies", displayName: "SECRET NAME", lore: "SECRET LORE", unlocked: false };
    const pages = codexDetailPages(entry);
    expect(pages).toEqual([{ title: "UNDISCOVERED", text: "Encounter this entry in the field to\nreveal its notes." }]);
    for (const page of pages) for (const line of page.text.split("\n")) expect(line.length).toBeLessThanOrEqual(36);
  });

  it("keeps native character art at its natural size and uses bounded reciprocal reductions", () => {
    expect(codexArtScale(32, 48, 56)).toBe(1);
    expect(codexArtScale(32, 48, 32)).toBe(0.5);
    expect(codexArtScale(1024, 1024, 56)).toBe(1 / 19);
  });

  it("uses the real field variant counter and distinguishes final review", () => {
    const entries = getCodexEntries("DANN-E Variants");
    for (const variant of Object.values(DANNE_ENEMY_VARIANTS)) {
      expect(entries.find((entry) => entry.id === variant.id)?.lore).toContain(variant.defeatMethod);
    }
    expect(entries.find((entry) => entry.id === "danne-cloud-form")?.lore).toContain("Black Vault final review");
    const cloud = entries.find((entry) => entry.id === "danne-cloud-form")!;
    const pages = codexDetailPages({ ...cloud, unlocked: true });
    expect(pages).toHaveLength(2);
    expect(pages[0].text.replace(/\s+/g, " ")).toContain("Citation Stamp");
    expect(pages[1].text).toMatch(/^Black Vault final review:/);
    expect(pages[1].text.replace(/\s+/g, " ")).toContain("Red Pencil");
  });
});
