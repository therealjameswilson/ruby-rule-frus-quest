import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import { gameState, setLatestAbility, setLatestMessage } from "../game/state";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

function abilityHint() {
  const scene = gameState.currentScene;
  const role = gameState.playerProfile.roleId;

  if (role === "compiler") {
    if (scene === "ArchiveScene") return "ARCHIVE SENSE: Repository, collection, box, folder, document.";
    return "ARCHIVE SENSE: Ask what evidence would survive citation.";
  }
  if (role === "editor") {
    if (scene === "SilentReadScene") return "RED PENCIL: Mechanical fixes are easy. Meaning is read.";
    return "RED PENCIL: Style can clarify, but never decide facts.";
  }
  if (role === "declass_reviewer") {
    if (scene === "NetworkScene") return "EQUITY MAP: SBU, classified, and codeword stay ClassNet.";
    if (scene === "ReferralVaultScene") return "EQUITY MAP: Referral tracks agency equity.";
    return "EQUITY MAP: Know which room you are in.";
  }
  if (role === "source_note_specialist") {
    if (scene === "ArchiveScene") return "PROVENANCE CHECK: No repository means not ready.";
    return "PROVENANCE CHECK: A visible source note must carry the trail.";
  }
  if (scene === "SilentReadScene") return "SILENT READ: StateChat flags mechanics. You catch facts.";
  return "SILENT READ: Compare line by line. Plausible can still be wrong.";
}

export function activateRoleAbility(scene: Phaser.Scene) {
  const hint = abilityHint();
  setLatestAbility(hint);
  setLatestMessage(hint);

  const banner = scene.add.container(128, 40).setDepth(1200);
  const box = scene.add.rectangle(0, 0, 230, 34, color(PALETTE.black), 0.96).setStrokeStyle(2, color(PALETTE.goldStamp));
  const text = scene.add.text(0, -10, hint, {
    fontFamily: "monospace",
    fontSize: "7px",
    color: PALETTE.goldStamp,
    align: "center",
    wordWrap: { width: 214, useAdvancedWrap: true }
  }).setOrigin(0.5, 0);
  banner.add([box, text]);

  scene.tweens.add({
    targets: banner,
    y: 33,
    duration: 120,
    yoyo: true,
    repeat: 1,
    ease: "Stepped"
  });
  scene.time.delayedCall(1250, () => banner.destroy());
}
