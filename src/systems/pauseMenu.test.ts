import { describe, expect, it } from "vitest";
import { FRUS_ROOM_GRAPH } from "../game/constants";
import { getString, LANGUAGES, setLanguage } from "./i18n";
import { layoutPauseRooms, movePauseTool, PAUSE_HEADER, PAUSE_NEXT, PAUSE_PREVIOUS, pauseHitAt, pauseTextPages, pauseToolHit } from "./pauseMenu";

describe("readable pause layout", () => {
  it("gives every tab and item its own non-overlapping 44px touch target", () => {
    const hits = [...PAUSE_HEADER, ...Array.from({ length: 10 }, (_, index) => pauseToolHit(index))];
    for (const hit of hits) {
      expect(hit.width).toBeGreaterThanOrEqual(44); expect(hit.height).toBeGreaterThanOrEqual(44);
      expect(pauseHitAt(hits, hit.x, hit.y)?.id).toBe(hit.id);
      for (const other of hits.filter((candidate) => candidate !== hit)) {
        expect(Math.abs(hit.x - other.x) >= (hit.width + other.width) / 2
          || Math.abs(hit.y - other.y) >= (hit.height + other.height) / 2).toBe(true);
      }
    }
    expect(pauseHitAt(hits, 12, 224)).toBeUndefined();
  });

  it("keeps paging arrows separate from the tabs", () => {
    const hits = [...PAUSE_HEADER, PAUSE_PREVIOUS, PAUSE_NEXT];
    expect(pauseHitAt(hits, 32, 80)?.id).toBe("previous");
    expect(pauseHitAt(hits, 224, 80)?.id).toBe("next");
    expect(pauseHitAt(hits, 224, 34)?.id).toBe("close");
  });

  it("uses grid navigation and can reach the tabs with no acquired tools", () => {
    expect(movePauseTool(1, 10, "down")).toBe(5);
    expect(movePauseTool(5, 10, "up")).toBe(1);
    expect(movePauseTool(0, 10, "up")).toBe("header");
    expect(movePauseTool(0, 0, "down")).toBe("header");
    expect(movePauseTool(9, 10, "down")).toBe(9);
    expect(movePauseTool(0, 10, "left")).toBe(0);
  });

  it("retains every word of long source text and URLs in bounded pages", () => {
    const text = `The compiler must preserve the source trail.\n\n${"https://history.state.gov/historicaldocuments/frus1989-92v31/abouttheseries ".repeat(12)}`;
    const pages = pauseTextPages(text);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.join("").replace(/\s/g, "")).toBe(text.replace(/\s/g, ""));
    for (const page of pages) {
      expect(page.split("\n").length).toBeLessThanOrEqual(10);
      for (const line of page.split("\n")) expect(line.length * 6).toBeLessThanOrEqual(216);
    }
  });

  it("handles empty text and guards invalid pagination sizes", () => {
    expect(pauseTextPages("")).toEqual([""]);
    expect(pauseTextPages("ABC", 0, 0)).toEqual(["A", "B", "C"]);
  });

  it("fits every chapter diagram at native pixel positions without overlapping rooms", () => {
    expect(layoutPauseRooms([])).toEqual([]);
    for (const area of new Set(FRUS_ROOM_GRAPH.map((room) => room.area))) {
      const rooms = layoutPauseRooms(FRUS_ROOM_GRAPH.filter((room) => room.area === area));
      for (const room of rooms) {
        expect(Number.isInteger(room.x) && Number.isInteger(room.y)).toBe(true);
        expect(room.x - room.width / 2).toBeGreaterThanOrEqual(16);
        expect(room.x + room.width / 2).toBeLessThanOrEqual(240);
        expect(room.y - room.height / 2).toBeGreaterThanOrEqual(102);
        expect(room.y + room.height / 2).toBeLessThanOrEqual(178);
        expect(room.width).toBeGreaterThanOrEqual(room.id.length * 4);
        expect(room.height).toBeGreaterThanOrEqual(6);
        for (const other of rooms.filter((candidate) => candidate.id !== room.id)) {
          expect(Math.abs(room.x - other.x) >= (room.width + other.width) / 2
            || Math.abs(room.y - other.y) >= (room.height + other.height) / 2).toBe(true);
        }
      }
    }
  });

  it("fits translated tabs at the native 8px font size", () => {
    for (const language of LANGUAGES) {
      setLanguage(language);
      for (const tab of ["tools", "map", "record", "settings"]) expect(getString(`pause.tabs.${tab}`).length * 6).toBeLessThanOrEqual(42);
      expect(getString("pause.mapLegend").length * 6).toBeLessThanOrEqual(224);
      expect(getString("pause.contrast").length * 6 + 24).toBeLessThanOrEqual(216);
    }
    setLanguage("en");
  });
});
