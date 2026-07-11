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
