import { describe, expect, it } from "vitest";
import {
  CHARACTER_CREATE_TITLE,
  FRUS_COMPILER_ROLE_ID
} from "./characterCreateCopy";
import {
  normalizeCharacterDisplayName,
  shouldConfirmCharacterCreateInput,
  shouldEndCharacterNameEditing
} from "./characterCreateInput";

const idleInput = {
  confirmJustPressed: false,
  aJustPressed: false,
  startJustPressed: false
};

describe("CharacterCreateScene input helpers", () => {
  it.each(["z", "Z", "x", "X", "ezrax"])("keeps %s in the focused name field despite action edges", (typedText) => {
    expect(shouldEndCharacterNameEditing({ confirmJustPressed: true, cancelJustPressed: true, typedText })).toBe(false);
  });

  it("ends name editing on non-letter confirm or cancel without starting play", () => {
    expect(shouldEndCharacterNameEditing({ confirmJustPressed: true, cancelJustPressed: false, typedText: "" })).toBe(true);
    expect(shouldEndCharacterNameEditing({ confirmJustPressed: false, cancelJustPressed: true, typedText: "" })).toBe(true);
    expect(shouldEndCharacterNameEditing({ confirmJustPressed: false, cancelJustPressed: false, typedText: "" })).toBe(false);
  });
  it("presents one clear FRUS Compiler identity", () => {
    expect(FRUS_COMPILER_ROLE_ID).toBe("compiler");
    expect(CHARACTER_CREATE_TITLE).toBe("CREATE YOUR FRUS COMPILER");
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
