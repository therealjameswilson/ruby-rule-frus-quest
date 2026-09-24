import type Phaser from "phaser";

export const PANEL_COLORS = {
  background: 0x101925,
  header: 0x1a2735,
  edge: 0x57606a,
  gold: 0xd4b66d,
  text: "#f5efdd",
  muted: "#aebac5"
} as const;

/** Restrained, opaque reading surface shared by dialogue and cutscenes. */
export function presentationPanel(scene: Phaser.Scene, x: number, y: number, width: number, height: number, heading = false) {
  const panel = scene.add.rectangle(x + width / 2, y + height / 2, width, height, PANEL_COLORS.background, .98)
    .setStrokeStyle(.5, PANEL_COLORS.edge).setScrollFactor(0);
  const rule = scene.add.rectangle(x + width / 2, y + .5, width, 1, PANEL_COLORS.gold).setScrollFactor(0);
  const objects: Phaser.GameObjects.GameObject[] = [panel];
  if (heading) objects.push(scene.add.rectangle(x + width / 2, y + 10, width - 1, 18, PANEL_COLORS.header).setScrollFactor(0));
  objects.push(rule);
  return { hitArea: panel, objects };
}
