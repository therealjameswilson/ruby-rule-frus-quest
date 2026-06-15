import type { InputState } from "../input/InputState";

// A blocking controls/tutorial card must never trap the player. The original
// Office Hub card only dismissed on confirm/cancel/pointer, so a player who
// loaded the room and immediately pressed Arrow/WASD saw a frozen avatar and
// concluded movement was broken (live audit, 2026-06-15). Treat any movement
// intent as an implicit "got it" so the card clears the instant the player
// tries to walk, and let the card render non-blocking so that first step is not
// swallowed.
export function shouldDismissControlsCard(input: Pick<
  InputState,
  | "confirmJustPressed"
  | "aJustPressed"
  | "cancelJustPressed"
  | "pointerPrimaryJustPressed"
  | "dir"
>): boolean {
  if (input.confirmJustPressed || input.aJustPressed || input.cancelJustPressed) return true;
  if (input.pointerPrimaryJustPressed) return true;
  return input.dir.x !== 0 || input.dir.y !== 0;
}
