import { getInput, swallowNextInputFrame } from "../input/InputState";
import type { InventoryOverlay } from "./inventory";
import type { ReliabilityHud } from "./reliability";

// Centralizes the "an overlay is open" branch shared by every gameplay scene.
// Scenes that toggle Menu before this handler must leave closeOnMenu false.
// Returns true while at least one overlay is open, so the caller should freeze
// the scene for this frame. ESC / Tab / Menu closes; B/X backs out one level, in the
// deterministic update tick, and swallows the still-held key so the edge cannot
// leak into the pause panel on the following frame.
export function handleOpenOverlays(inventory: InventoryOverlay, reliability?: ReliabilityHud, closeOnMenu = false): boolean {
  if (!inventory.active && !reliability?.active) return false;
  const input = getInput();
  if (input.pauseJustPressed || input.selectJustPressed || (closeOnMenu && input.menuJustPressed)) {
    if (inventory.active) inventory.hide();
    if (reliability?.active) reliability.hideDetails();
    swallowNextInputFrame();
  } else if (input.cancelJustPressed || input.bJustPressed) {
    if (inventory.active) inventory.back();
    if (reliability?.active) reliability.hideDetails();
    swallowNextInputFrame();
  } else if (inventory.active) {
    inventory.updateInput?.();
  }
  return true;
}
