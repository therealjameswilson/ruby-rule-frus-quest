import { SCENE_ORDER } from "./constants";

export function resolveStartScene(requested: string | null, hasSave: boolean) {
  if (requested && SCENE_ORDER.includes(requested as (typeof SCENE_ORDER)[number])) return requested;
  return hasSave ? "TapToStartScene" : "WarningScene";
}
