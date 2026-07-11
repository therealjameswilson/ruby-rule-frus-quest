import { afterEach, describe, expect, it } from "vitest";
import {
  getInput,
  pressKeyForTests,
  resetInput,
  setKeyboardDownForTests,
  tickInput
} from "../input/InputState";
import { handleOpenOverlays } from "./overlayInput";
import type { InventoryOverlay } from "./inventory";
import type { ReliabilityHud } from "./reliability";

// The helper only touches `.active`, `.hide()` and `.hideDetails()`, so a light
// duck-typed stub is enough to exercise the close + edge-swallow behavior without
// standing up a real Phaser scene.
function makeInventory(active: boolean) {
  let open = active;
  return {
    get active() {
      return open;
    },
    hide() {
      open = false;
    }
  } as unknown as InventoryOverlay & { hide: () => void };
}

function makeReliability(active: boolean) {
  let open = active;
  return {
    get active() {
      return open;
    },
    hideDetails() {
      open = false;
    }
  } as unknown as ReliabilityHud & { hideDetails: () => void };
}

describe("handleOpenOverlays", () => {
  afterEach(() => resetInput());

  it("returns false and closes nothing when no overlay is open", () => {
    const inventory = makeInventory(false);
    const reliability = makeReliability(false);
    setKeyboardDownForTests(["Escape"]);
    tickInput();
    expect(handleOpenOverlays(inventory, reliability)).toBe(false);
    expect(inventory.active).toBe(false);
    expect(reliability.active).toBe(false);
  });

  it("keeps the scene frozen but does not close while no close key is pressed", () => {
    const inventory = makeInventory(true);
    const reliability = makeReliability(false);
    resetInput();
    tickInput();
    expect(handleOpenOverlays(inventory, reliability)).toBe(true);
    expect(inventory.active).toBe(true);
  });

  it("closes the inventory on Escape and swallows the still-held edge", () => {
    const inventory = makeInventory(true);
    const reliability = makeReliability(false);
    setKeyboardDownForTests(["Escape"]);
    tickInput();
    expect(getInput().pauseJustPressed).toBe(true);

    expect(handleOpenOverlays(inventory, reliability)).toBe(true);
    expect(inventory.active).toBe(false);

    // Escape is physically still down on the next frame (browser key-repeat);
    // the swallow must keep the pause edge from leaking into the pause panel.
    pressKeyForTests("Escape");
    tickInput();
    expect(getInput().pauseJustPressed).toBe(false);
    expect(getInput().cancelJustPressed).toBe(false);
  });

  it("closes the reliability detail on Tab (select)", () => {
    const inventory = makeInventory(false);
    const reliability = makeReliability(true);
    setKeyboardDownForTests(["Tab"]);
    tickInput();
    expect(getInput().selectJustPressed).toBe(true);

    expect(handleOpenOverlays(inventory, reliability)).toBe(true);
    expect(reliability.active).toBe(false);
  });

  // Regression for the gameplay-scene wiring: a scene that freezes itself while
  // an overlay is open MUST route the frozen frame through handleOpenOverlays so
  // ESC actually closes the overlay. A bare `if (inventory.active) return;`
  // guard freezes the scene but swallows the ESC edge, leaving the overlay stuck
  // open (the GuideScene regression). This asserts the close happens on the same
  // frozen frame, the way OfficeScene/ArchiveScene already do it.
  it("closes a frozen-scene overlay on Escape instead of only freezing", () => {
    const inventory = makeInventory(true);
    const reliability = makeReliability(false);
    setKeyboardDownForTests(["Escape"]);
    tickInput();

    const frozen = handleOpenOverlays(inventory, reliability);
    expect(frozen).toBe(true);
    expect(inventory.active).toBe(false);
  });
});
