import { AREA_REGISTRY } from "./constants";

const RESUME_LOCATIONS: Readonly<Record<string, string>> = {
  OfficeScene: "NAVY HILL OFFICE",
  GuideScene: "TRAINING GARDEN",
  SilentReadScene: "EDITORIAL & PROOFING",
  BlackVaultLairScene: "BLACK VAULT",
  EndingScene: "FRUS BINDERY",
  WorldMapScene: "WORLD MAP",
  WorldScene: "OVERWORLD"
};

export function resumeLabel(scene: string, documentPoints: number): string {
  const area = AREA_REGISTRY.find(candidate => candidate.scenes.some(key => key === scene));
  const location = RESUME_LOCATIONS[scene] ?? area?.displayName.toUpperCase() ?? "SAVED QUEST";
  const points = Number.isFinite(documentPoints) ? Math.max(0, Math.floor(documentPoints)) : 0;
  return `${location}  |  ${points} PTS`;
}
