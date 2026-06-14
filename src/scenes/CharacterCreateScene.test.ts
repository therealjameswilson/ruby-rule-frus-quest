import { describe, expect, it } from "vitest";
import {
  normalizeCharacterDisplayName,
  shouldConfirmCharacterCreateInput
} from "./characterCreateInput";

const idleInput = {
  confirmJustPressed: false,
  aJustPressed: false,
  startJustPressed: false
};

describe("CharacterCreateScene input helpers", () => {
  it("treats an empty name as Sam without storing Sam as typed text", () => {
    expect(normalizeCharacterDisplayName("")).toBe("Sam");
    expect(normalizeCharacterDisplayName("ruby")).toBe("Ruby");
  });

  it("makes confirm reachable from the shared confirm edge", () => {
    expect(shouldConfirmCharacterCreateInput({ ...idleInput, confirmJustPressed: true })).toBe(true);
    expect(shouldConfirmCharacterCreateInput({ ...idleInput, aJustPressed: true })).toBe(true);
    expect(shouldConfirmCharacterCreateInput({ ...idleInput, startJustPressed: true })).toBe(true);
    expect(shouldConfirmCharacterCreateInput(idleInput)).toBe(false);
  });
});
