import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import type { ProcessRoleId } from "../game/constants";
import { gameState, setLatestAbility, setLatestMessage } from "../game/state";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

function roleVisualSpec(role: ProcessRoleId) {
  if (role === "compiler") return { code: "ARCH", accent: PALETTE.archiveAmber, flash: PALETTE.terminalCyan };
  if (role === "editor") return { code: "EDIT", accent: PALETTE.buckramHighlight, flash: PALETTE.goldStamp };
  if (role === "declass_reviewer") return { code: "EQTY", accent: PALETTE.classNetRed, flash: PALETTE.terminalCyan };
  if (role === "source_note_specialist") return { code: "SRC", accent: PALETTE.terminalCyan, flash: PALETTE.goldStamp };
  return { code: "READ", accent: PALETTE.creamPaper, flash: PALETTE.terminalCyan };
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

  const banner = scene.add.container(128, 40).setName("role-ability-banner").setDepth(1200);
  const box = scene.add.rectangle(0, 0, 230, 34, color(PALETTE.black))
    .setName("role-ability-banner-box")
    .setStrokeStyle(2, color(PALETTE.goldStamp));
  const text = scene.add.text(0, -10, hint, {
    fontFamily: "monospace",
    fontSize: "7px",
    color: PALETTE.goldStamp,
    align: "center",
    wordWrap: { width: 214, useAdvancedWrap: true }
  }).setName("role-ability-banner-text").setOrigin(0.5, 0);
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
  const container = scene.add.container(x, y).setName("role-ability-visual").setDepth(1185);
  const role = gameState.playerProfile.roleId;
  drawAbilityBurst(scene, container, role);

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

function addRect(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  name = "role-ability-rect"
) {
  const rect = scene.add.rectangle(x, y, width, height, color(fill)).setOrigin(0, 0).setName(name);
  container.add(rect);
  return rect;
}

function addText(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  x: number,
  y: number,
  text: string,
  fill: string = PALETTE.creamPaper,
  name = "role-ability-text"
) {
  const label = scene.add.text(x, y, text, {
    fontFamily: "monospace",
    fontSize: "6px",
    color: fill,
    align: "center"
  }).setOrigin(0.5).setName(name);
  container.add(label);
  return label;
}

function addImage(scene: Phaser.Scene, container: Phaser.GameObjects.Container, x: number, y: number, key: string, name = "role-ability-image") {
  if (!scene.textures.exists(key)) return undefined;
  const image = scene.add.image(x, y, key).setName(name);
  container.add(image);
  return image;
}

function drawAbilityBurst(scene: Phaser.Scene, container: Phaser.GameObjects.Container, role: ProcessRoleId) {
  const spec = roleVisualSpec(role);
  const shadow = scene.add.ellipse(0, 20, 66, 10, color(PALETTE.black), 0.5).setName("role-ability-snes-shadow");
  const backPlate = scene.add.rectangle(0, -3, 72, 44, color(PALETTE.black), 0.72)
    .setName("role-ability-snes-burst")
    .setStrokeStyle(1, color(spec.accent), 0.8);
  const topBand = scene.add.rectangle(0, -24, 56, 5, color(PALETTE.deepRuby), 0.96)
    .setName("role-ability-snes-top-band")
    .setStrokeStyle(1, color(PALETTE.goldStamp));
  const code = scene.add.text(0, -28, spec.code, {
    fontFamily: "monospace",
    fontSize: "5px",
    color: spec.flash
  }).setName("role-ability-snes-code").setOrigin(0.5, 0);
  container.add([shadow, backPlate, topBand, code]);

  for (const [index, sparkX, sparkY] of [
    [0, -30, -14],
    [1, 28, -10],
    [2, -34, 6],
    [3, 32, 10],
    [4, -20, 20],
    [5, 18, 19]
  ] as const) {
    const spark = scene.add.rectangle(sparkX, sparkY, index % 2 === 0 ? 3 : 2, index % 2 === 0 ? 3 : 2, color(index % 2 === 0 ? spec.flash : spec.accent), 0.86)
      .setName("role-ability-snes-spark");
    container.add(spark);
    scene.tweens.add({
      targets: spark,
      alpha: 0.28,
      duration: 90 + index * 18,
      yoyo: true,
      repeat: 3,
      ease: "Stepped"
    });
  }

  for (let ray = 0; ray < 4; ray += 1) {
    const horizontal = ray % 2 === 0;
    const bar = scene.add.rectangle(
      horizontal ? 0 : (ray === 1 ? -26 : 26),
      horizontal ? (ray === 0 ? -14 : 12) : -1,
      horizontal ? 46 : 2,
      horizontal ? 2 : 28,
      color(spec.flash),
      0.22
    ).setName("role-ability-snes-pulse");
    container.add(bar);
  }
}

function drawArchiveSense(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
  addRect(scene, container, -28, -18, 56, 28, PALETTE.black, "role-ability-archive-panel-shadow");
  addRect(scene, container, -26, -16, 52, 24, PALETTE.shadowNavy, "role-ability-archive-panel");
  addImage(scene, container, -16, -4, "source-note", "role-ability-archive-source-note");
  addRect(scene, container, 0, -12, 22, 2, PALETTE.goldStamp, "role-ability-archive-evidence-line");
  addRect(scene, container, 0, -6, 18, 2, PALETTE.terminalCyan, "role-ability-archive-evidence-line");
  addRect(scene, container, 0, 0, 14, 2, PALETTE.goldStamp, "role-ability-archive-evidence-line");
  addRect(scene, container, 20, -16, 3, 3, PALETTE.creamPaper, "role-ability-archive-glint");
  addText(scene, container, 9, 13, "SRC CLUE", PALETTE.goldStamp, "role-ability-archive-label");
}

function drawEquityMap(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
  addRect(scene, container, -31, -20, 62, 34, PALETTE.black, "role-ability-equity-panel-shadow");
  addRect(scene, container, -28, -17, 56, 28, PALETTE.shadowNavy, "role-ability-equity-panel");
  addRect(scene, container, -20, -8, 40, 2, PALETTE.terminalCyan, "role-ability-equity-route-line");
  addRect(scene, container, -1, -15, 2, 22, PALETTE.terminalCyan, "role-ability-equity-route-line");
  drawSeal(scene, container, -22, -15, "CIA", PALETTE.goldStamp);
  drawSeal(scene, container, 6, -15, "DOD", PALETTE.classNetRed);
  drawSeal(scene, container, -8, 2, "NSC", PALETTE.terminalCyan);
}

function drawSeal(scene: Phaser.Scene, container: Phaser.GameObjects.Container, x: number, y: number, label: string, accent: string) {
  addRect(scene, container, x, y, 18, 12, PALETTE.black, "role-ability-equity-seal-shadow");
  addRect(scene, container, x + 1, y + 1, 16, 10, accent, "role-ability-equity-seal");
  addText(scene, container, x + 9, y + 6, label, PALETTE.black, "role-ability-equity-seal-label");
}

function drawRedPencil(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
  addRect(scene, container, -30, -17, 44, 30, PALETTE.black, "role-ability-editor-copy-shadow");
  addRect(scene, container, -27, -14, 38, 24, PALETTE.white, "role-ability-editor-copy");
  addRect(scene, container, -23, -9, 24, 2, PALETTE.sepiaInk, "role-ability-editor-copy-line");
  addRect(scene, container, -23, -3, 20, 2, PALETTE.sepiaInk, "role-ability-editor-copy-line");
  addRect(scene, container, -22, 3, 26, 2, PALETTE.buckramHighlight, "role-ability-editor-red-mark");
  addRect(scene, container, -8, 2, 3, 5, PALETTE.buckramRed, "role-ability-editor-caret");
  addImage(scene, container, 18, -3, "red-pencil", "role-ability-editor-red-pencil");
  addText(scene, container, -6, 17, "MARK", PALETTE.buckramHighlight, "role-ability-editor-label");
}

function drawSilentRead(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
  addRect(scene, container, -31, -18, 62, 31, PALETTE.black, "role-ability-proof-panel-shadow");
  addImage(scene, container, -11, -4, "proof-page", "role-ability-proof-page");
  addImage(scene, container, 18, -4, "proof-lens", "role-ability-proof-lens");
  addRect(scene, container, -21, -9, 15, 2, PALETTE.sepiaInk, "role-ability-proof-line");
  addRect(scene, container, 5, -9, 15, 2, PALETTE.sepiaInk, "role-ability-proof-line");
  addRect(scene, container, 4, -2, 17, 4, PALETTE.terminalCyan, "role-ability-proof-highlight");
  addRect(scene, container, 5, -1, 15, 2, PALETTE.buckramHighlight, "role-ability-proof-highlight-core");
  addText(scene, container, 0, 17, "COMPARE", PALETTE.goldStamp, "role-ability-proof-label");
}

function drawProvenanceLock(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
  addRect(scene, container, -30, -18, 60, 32, PALETTE.black, "role-ability-provenance-panel-shadow");
  addImage(scene, container, -18, -5, "source-note", "role-ability-provenance-source-note");
  addImage(scene, container, 15, -7, "citation-stamp", "role-ability-provenance-citation-stamp");
  addRect(scene, container, 1, -10, 16, 18, PALETTE.black, "role-ability-provenance-lock-shadow");
  addRect(scene, container, 3, -2, 12, 10, PALETTE.goldStamp, "role-ability-provenance-lock-body");
  addRect(scene, container, 6, -9, 6, 7, PALETTE.goldStamp, "role-ability-provenance-lock-shackle");
  addRect(scene, container, 7, -8, 4, 5, PALETTE.black, "role-ability-provenance-lock-hole");
  addRect(scene, container, 7, 1, 4, 3, PALETTE.buckramRed, "role-ability-provenance-keyhole");
  addText(scene, container, 0, 18, "LOCK", PALETTE.goldStamp, "role-ability-provenance-label");
}
