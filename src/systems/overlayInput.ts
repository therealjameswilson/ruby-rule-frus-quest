import { getInput, swallowNextInputFrame } from "../input/InputState";
import type { InventoryOverlay } from "./inventory";
import type { ReliabilityHud } from "./reliability";

// Centralizes the "an overlay is open" branch shared by every gameplay scene.
// Returns true while at least one overlay is open, so the caller should freeze
// the scene for this frame. ESC / B / Tab closes the open overlay here, in the
// deterministic update tick, and swallows the still-held key so the edge cannot
// leak into the pause panel on the following frame.
export function handleOpenOverlays(inventory: InventoryOverlay, reliability: ReliabilityHud): boolean {
  if (!inventory.active && !reliability.active) return false;
  const input = getInput();
  if (input.pauseJustPressed || input.cancelJustPressed || input.selectJustPressed) {
    if (inventory.active) inventory.hide();
    if (reliability.active) reliability.hideDetails();
    swallowNextInputFrame();
  }
  return true;
}
