import { describe, expect, it } from "vitest";
import {
  CHARACTER_CREATE_RANK_COPY,
  CHARACTER_CREATE_TITLE
} from "./characterCreateCopy";
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
  it("frames the first screen as equal-rank FRUS production roles", () => {
    expect(CHARACTER_CREATE_TITLE).toBe("CREATE YOUR FRUS ROLE");
    expect(CHARACTER_CREATE_RANK_COPY).toContain("EQUAL RANK");
    expect(CHARACTER_CREATE_RANK_COPY).toContain("PUBLICATION");
    expect(CHARACTER_CREATE_TITLE).not.toContain("HISTORIAN");
  });

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
