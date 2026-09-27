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
  input: Pick<InputState, "confirmJustPressed" | "cancelJustPressed" | "typedText"> & Partial<Pick<InputState, "startJustPressed">>
) {
  // Z/X also produce gameplay edges; in a focused name field they are letters.
  // Enter has its own start edge, so a letter buffered in the same frame cannot swallow it.
  return Boolean(input.startJustPressed) || !/[a-zA-Z]/.test(input.typedText) && (input.confirmJustPressed || input.cancelJustPressed);
}
