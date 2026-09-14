import { afterEach, expect, it, vi } from "vitest";
import { getPrimaryActionBadge, getSecondaryActionBadge, resetInput, tickInput } from "./InputState";

afterEach(() => {
  vi.unstubAllGlobals();
  resetInput();
  tickInput();
});

it("uses controller labels on connection and restores keyboard labels on disconnect", () => {
  const pad = { connected: true, index: 0, id: "QA controller", axes: [0, 0], buttons: [] };
  vi.stubGlobal("window", {});
  vi.stubGlobal("navigator", { maxTouchPoints: 0, getGamepads: () => [pad] });
  resetInput();
  tickInput();
  expect(getPrimaryActionBadge()).toBe("A");
  expect(getSecondaryActionBadge()).toBe("B");
  pad.connected = false;
  tickInput();
  expect(getPrimaryActionBadge()).toBe("Z");
  expect(getSecondaryActionBadge()).toBe("X");
});

it("keeps touch labels after a controller disconnects on a phone", () => {
  vi.stubGlobal("window", {});
  vi.stubGlobal("navigator", { maxTouchPoints: 5, getGamepads: () => [] });
  resetInput();
  tickInput();
  expect(getPrimaryActionBadge()).toBe("A");
  expect(getSecondaryActionBadge()).toBe("B");
});
