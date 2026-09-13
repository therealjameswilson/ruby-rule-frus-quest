import type { InputState } from "../input/InputState";

export function normalizeCharacterDisplayName(name: string) {
  const cleanedName = name.trim() || "Sam";
  return cleanedName.charAt(0).toUpperCase() + cleanedName.slice(1);
}

export function shouldConfirmCharacterCreateInput(
  input: Pick<InputState, "confirmJustPressed" | "aJustPressed" | "startJustPressed">
) {
  return input.confirmJustPressed || input.aJustPressed || input.startJustPressed;
}

export function shouldEndCharacterNameEditing(
  input: Pick<InputState, "confirmJustPressed" | "cancelJustPressed" | "typedText">
) {
  // Z/X also produce gameplay edges; in a focused name field they are letters.
  return !/[a-zA-Z]/.test(input.typedText) && (input.confirmJustPressed || input.cancelJustPressed);
}
