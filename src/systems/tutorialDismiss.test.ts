import { describe, expect, it } from "vitest";
import { shouldDismissControlsCard } from "./tutorialDismiss";

type CardInput = Parameters<typeof shouldDismissControlsCard>[0];

function input(overrides: Partial<CardInput> = {}): CardInput {
  return {
    confirmJustPressed: false,
    aJustPressed: false,
    cancelJustPressed: false,
    pointerPrimaryJustPressed: false,
    dir: { x: 0, y: 0 },
    ...overrides
  };
}

describe("shouldDismissControlsCard", () => {
  it("stays up when no input is given", () => {
    expect(shouldDismissControlsCard(input())).toBe(false);
  });

  // Regression for the live audit (2026-06-15): the Office Hub controls card froze
  // the player and only confirm/cancel/pointer dismissed it, so pressing Arrow/WASD
  // looked like broken movement. Any movement intent must dismiss it.
  it("dismisses on horizontal movement intent", () => {
    expect(shouldDismissControlsCard(input({ dir: { x: 1, y: 0 } }))).toBe(true);
    expect(shouldDismissControlsCard(input({ dir: { x: -1, y: 0 } }))).toBe(true);
  });

  it("dismisses on vertical movement intent", () => {
    expect(shouldDismissControlsCard(input({ dir: { x: 0, y: 1 } }))).toBe(true);
    expect(shouldDismissControlsCard(input({ dir: { x: 0, y: -1 } }))).toBe(true);
  });

  it("still dismisses on confirm / A / cancel / pointer", () => {
    expect(shouldDismissControlsCard(input({ confirmJustPressed: true }))).toBe(true);
    expect(shouldDismissControlsCard(input({ aJustPressed: true }))).toBe(true);
    expect(shouldDismissControlsCard(input({ cancelJustPressed: true }))).toBe(true);
    expect(shouldDismissControlsCard(input({ pointerPrimaryJustPressed: true }))).toBe(true);
  });
});
