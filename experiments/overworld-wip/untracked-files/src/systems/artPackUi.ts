import Phaser from "phaser";
import { ART_PACK_EXTRAS, UI_KIT_RECTS, UI_NINE_SLICE_MARGINS } from "../game/artPack";

export function addPackNineSliceFrame(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  frameName: keyof typeof UI_NINE_SLICE_MARGINS,
  depth = 0
) {
  const textureKey = ART_PACK_EXTRAS.ui_kit.textureKey;
  if (!scene.textures.exists(textureKey)) return null;
  const texture = scene.textures.get(textureKey);
  const parts = ["tl", "t", "tr", "l", "c", "r", "bl", "b", "br"].map((part) => `${frameName}:${part}`);
  if (!parts.every((part) => texture.has(part))) return null;
  const margin = UI_NINE_SLICE_MARGINS[frameName].target;
  const left = x - width / 2;
  const top = y - height / 2;
  const centerWidth = Math.max(1, width - margin * 2);
  const centerHeight = Math.max(1, height - margin * 2);
  const container = scene.add.container(0, 0).setDepth(depth);
  const specs = [
    { frame: `${frameName}:tl`, x: left, y: top, w: margin, h: margin },
    { frame: `${frameName}:t`, x: left + margin, y: top, w: centerWidth, h: margin },
    { frame: `${frameName}:tr`, x: left + margin + centerWidth, y: top, w: margin, h: margin },
    { frame: `${frameName}:l`, x: left, y: top + margin, w: margin, h: centerHeight },
    { frame: `${frameName}:c`, x: left + margin, y: top + margin, w: centerWidth, h: centerHeight },
    { frame: `${frameName}:r`, x: left + margin + centerWidth, y: top + margin, w: margin, h: centerHeight },
    { frame: `${frameName}:bl`, x: left, y: top + margin + centerHeight, w: margin, h: margin },
    { frame: `${frameName}:b`, x: left + margin, y: top + margin + centerHeight, w: centerWidth, h: margin },
    { frame: `${frameName}:br`, x: left + margin + centerWidth, y: top + margin + centerHeight, w: margin, h: margin }
  ];
  for (const spec of specs) {
    const piece = scene.add.image(spec.x, spec.y, textureKey, spec.frame).setOrigin(0, 0);
    piece.setDisplaySize(spec.w, spec.h);
    container.add(piece);
  }
  return container;
}

export function registerUiKitFrames(textures: Phaser.Textures.TextureManager) {
  const textureKey = ART_PACK_EXTRAS.ui_kit.textureKey;
  if (!textures.exists(textureKey)) return;
  const texture = textures.get(textureKey);
  for (const [name, rect] of Object.entries(UI_KIT_RECTS)) {
    if (!texture.has(name)) texture.add(name, 0, rect.x, rect.y, rect.width, rect.height);
  }
  for (const frameName of Object.keys(UI_NINE_SLICE_MARGINS) as Array<keyof typeof UI_NINE_SLICE_MARGINS>) {
    const rect = UI_KIT_RECTS[frameName];
    const margins = UI_NINE_SLICE_MARGINS[frameName];
    const left = margins.sourceLeft;
    const right = margins.sourceRight;
    const top = margins.sourceTop;
    const bottom = margins.sourceBottom;
    const centerWidth = Math.max(1, rect.width - left - right);
    const centerHeight = Math.max(1, rect.height - top - bottom);
    const pieces = {
      tl: { x: rect.x, y: rect.y, width: left, height: top },
      t: { x: rect.x + left, y: rect.y, width: centerWidth, height: top },
      tr: { x: rect.x + rect.width - right, y: rect.y, width: right, height: top },
      l: { x: rect.x, y: rect.y + top, width: left, height: centerHeight },
      c: { x: rect.x + left, y: rect.y + top, width: centerWidth, height: centerHeight },
      r: { x: rect.x + rect.width - right, y: rect.y + top, width: right, height: centerHeight },
      bl: { x: rect.x, y: rect.y + rect.height - bottom, width: left, height: bottom },
      b: { x: rect.x + left, y: rect.y + rect.height - bottom, width: centerWidth, height: bottom },
      br: { x: rect.x + rect.width - right, y: rect.y + rect.height - bottom, width: right, height: bottom }
    };
    for (const [piece, pieceRect] of Object.entries(pieces)) {
      const key = `${frameName}:${piece}`;
      if (!texture.has(key)) texture.add(key, 0, pieceRect.x, pieceRect.y, pieceRect.width, pieceRect.height);
    }
  }
}
