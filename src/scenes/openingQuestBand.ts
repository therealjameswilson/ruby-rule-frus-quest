import { getGuideCavernStage } from "../game/guideCavernFlow";
import { getOfficeStarterStage, type OfficeStarterRouteContext } from "../game/officeStarterRoute";
import { getString } from "../systems/i18n";

export function officeApproachCue(scene: string | null, mode: string, nearest: string | null) {
  return scene === "OfficeScene" && mode === "explore" && !nearest
    ? { text: getString("hud.followQuestArrow"), badge: "!" }
    : null;
}

export function officeQuestBandObjective(context: OfficeStarterRouteContext) {
  return getString(`hud.office.${getOfficeStarterStage(context)}`);
}

export function guideQuestBandObjective(
  hasStamp: boolean,
  hasFragment: boolean,
  counterTrained = hasFragment
) {
  return getString(`hud.guide.${getGuideCavernStage(hasStamp, hasFragment, counterTrained)}`);
}
