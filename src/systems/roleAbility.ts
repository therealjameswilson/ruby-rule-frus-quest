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
  if (scene === "SilentReadScene") return "PROOF LENS: StateChat flags mechanics. You catch tiny discrepancies.";
  return "SILENT READ: Compare line by line. Plausible can still be wrong.";
}

export function activateRoleAbility(scene: Phaser.Scene) {
  const hint = abilityHint();
  setLatestAbility(hint);
  setLatestMessage(hint);
  scene.events.emit("role-ability-frame");
  const abilityVisual = createAbilityVisual(scene);

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
  scene.time.delayedCall(1250, () => {
    banner.destroy();
    abilityVisual.destroy();
  });
}

function createAbilityVisual(scene: Phaser.Scene) {
  const x = Phaser.Math.Clamp(gameState.player.x, 44, 212);
  const y = Phaser.Math.Clamp(gameState.player.y - 38, 62, 152);
  const container = scene.add.container(x, y).setDepth(1185);
  const role = gameState.playerProfile.roleId;

  if (role === "compiler") drawArchiveSense(scene, container);
  else if (role === "declass_reviewer") drawEquityMap(scene, container);
  else if (role === "editor") drawRedPencil(scene, container);
  else if (role === "source_note_specialist") drawProvenanceLock(scene, container);
  else drawSilentRead(scene, container);

  scene.tweens.add({
    targets: container,
    y: y - 4,
    duration: 140,
    yoyo: true,
    repeat: 2,
    ease: "Stepped"
  });
  return container;
}

function addRect(scene: Phaser.Scene, container: Phaser.GameObjects.Container, x: number, y: number, width: number, height: number, fill: string) {
  const rect = scene.add.rectangle(x, y, width, height, color(fill)).setOrigin(0, 0);
  container.add(rect);
  return rect;
}

function addText(scene: Phaser.Scene, container: Phaser.GameObjects.Container, x: number, y: number, text: string, fill: string = PALETTE.creamPaper) {
  const label = scene.add.text(x, y, text, {
    fontFamily: "monospace",
    fontSize: "6px",
    color: fill,
    align: "center"
  }).setOrigin(0.5);
  container.add(label);
  return label;
}

function addImage(scene: Phaser.Scene, container: Phaser.GameObjects.Container, x: number, y: number, key: string) {
  if (!scene.textures.exists(key)) return undefined;
  const image = scene.add.image(x, y, key);
  container.add(image);
  return image;
}

function drawArchiveSense(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
  addRect(scene, container, -28, -18, 56, 28, PALETTE.black);
  addRect(scene, container, -26, -16, 52, 24, PALETTE.shadowNavy);
  addImage(scene, container, -16, -4, "source-note");
  addRect(scene, container, 0, -12, 22, 2, PALETTE.goldStamp);
  addRect(scene, container, 0, -6, 18, 2, PALETTE.terminalCyan);
  addRect(scene, container, 0, 0, 14, 2, PALETTE.goldStamp);
  addRect(scene, container, 20, -16, 3, 3, PALETTE.creamPaper);
  addText(scene, container, 9, 13, "SRC CLUE", PALETTE.goldStamp);
}

function drawEquityMap(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
  addRect(scene, container, -31, -20, 62, 34, PALETTE.black);
  addRect(scene, container, -28, -17, 56, 28, PALETTE.shadowNavy);
  addRect(scene, container, -20, -8, 40, 2, PALETTE.terminalCyan);
  addRect(scene, container, -1, -15, 2, 22, PALETTE.terminalCyan);
  drawSeal(scene, container, -22, -15, "CIA", PALETTE.goldStamp);
  drawSeal(scene, container, 6, -15, "DOD", PALETTE.classNetRed);
  drawSeal(scene, container, -8, 2, "NSC", PALETTE.terminalCyan);
}

function drawSeal(scene: Phaser.Scene, container: Phaser.GameObjects.Container, x: number, y: number, label: string, accent: string) {
  addRect(scene, container, x, y, 18, 12, PALETTE.black);
  addRect(scene, container, x + 1, y + 1, 16, 10, accent);
  addText(scene, container, x + 9, y + 6, label, PALETTE.black);
}

function drawRedPencil(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
  addRect(scene, container, -30, -17, 44, 30, PALETTE.black);
  addRect(scene, container, -27, -14, 38, 24, PALETTE.white);
  addRect(scene, container, -23, -9, 24, 2, PALETTE.sepiaInk);
  addRect(scene, container, -23, -3, 20, 2, PALETTE.sepiaInk);
  addRect(scene, container, -22, 3, 26, 2, PALETTE.buckramHighlight);
  addRect(scene, container, -8, 2, 3, 5, PALETTE.buckramRed);
  addImage(scene, container, 18, -3, "red-pencil");
  addText(scene, container, -6, 17, "MARK", PALETTE.buckramHighlight);
}

function drawSilentRead(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
  addRect(scene, container, -31, -18, 62, 31, PALETTE.black);
  addImage(scene, container, -11, -4, "proof-page");
  addImage(scene, container, 18, -4, "proof-lens");
  addRect(scene, container, -21, -9, 15, 2, PALETTE.sepiaInk);
  addRect(scene, container, 5, -9, 15, 2, PALETTE.sepiaInk);
  addRect(scene, container, 4, -2, 17, 4, PALETTE.terminalCyan);
  addRect(scene, container, 5, -1, 15, 2, PALETTE.buckramHighlight);
  addText(scene, container, 0, 17, "COMPARE", PALETTE.goldStamp);
}

function drawProvenanceLock(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
  addRect(scene, container, -30, -18, 60, 32, PALETTE.black);
  addImage(scene, container, -18, -5, "source-note");
  addImage(scene, container, 15, -7, "citation-stamp");
  addRect(scene, container, 1, -10, 16, 18, PALETTE.black);
  addRect(scene, container, 3, -2, 12, 10, PALETTE.goldStamp);
  addRect(scene, container, 6, -9, 6, 7, PALETTE.goldStamp);
  addRect(scene, container, 7, -8, 4, 5, PALETTE.black);
  addRect(scene, container, 7, 1, 4, 3, PALETTE.buckramRed);
  addText(scene, container, 0, 18, "LOCK", PALETTE.goldStamp);
}
