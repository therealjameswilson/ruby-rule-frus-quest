import { RENDER_DENSITY } from "./renderDensity";
import Phaser from "phaser";
import { PIXEL_FONT_KEY, SMALL_PIXEL_FONT_KEY, SMALL_GLYPHS, pixelFontMetrics } from "./pixelFontMetrics";

export { PIXEL_FONT_KEY } from "./pixelFontMetrics";

const GLYPHS: Record<string, readonly string[]> = {
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "\"": [".#.#.", ".#.#.", ".#.#.", ".....", ".....", ".....", "....."],
  "#": [".#.#.", "#####", ".#.#.", ".#.#.", "#####", ".#.#.", "....."],
  "$": [".###.", "#.#..", "#....", ".###.", "...#.", "#.#..", ".###."],
  "%": ["##..#", "##.#.", "..#..", ".#...", "#.##.", "#..##", "....."],
  "&": [".##..", "#..#.", "#.#..", ".#...", "#.#.#", "#..#.", ".##.#"],
  "'": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "*": [".....", "#.#.#", ".###.", "#####", ".###.", "#.#.#", "....."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  ",": [".....", ".....", ".....", ".....", "..#..", "..#..", ".#..."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  "/": ["....#", "...#.", "..#..", ".#...", "#....", ".....", "....."],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["#####", "....#", "...#.", "..##.", "....#", "#...#", ".###."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", ".#...", "#...."],
  "<": ["...#.", "..#..", ".#...", "#....", ".#...", "..#..", "...#."],
  "=": [".....", "#####", ".....", "#####", ".....", ".....", "....."],
  ">": [".#...", "..#..", "...#.", "....#", "...#.", "..#..", ".#..."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "@": [".###.", "#...#", "#.###", "#.#.#", "#.###", "#....", ".####"],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".####"],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", ".#.#.", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", ".#.#.", ".#.#.", "..#..", ".#.#.", ".#.#.", "#...#"],
  Y: ["#...#", ".#.#.", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "[": [".###.", ".#...", ".#...", ".#...", ".#...", ".#...", ".###."],
  "\\": ["#....", ".#...", "..#..", "...#.", "....#", ".....", "....."],
  "]": [".###.", "...#.", "...#.", "...#.", "...#.", "...#.", ".###."],
  "^": ["..#..", ".#.#.", "#...#", ".....", ".....", ".....", "....."],
  "_": [".....", ".....", ".....", ".....", ".....", ".....", "#####"],
  "`": [".#...", "..#..", "...#.", ".....", ".....", ".....", "....."],
  "{": ["...##", "..#..", "..#..", ".#...", "..#..", "..#..", "...##"],
  "|": ["..#..", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  "}": ["##...", "..#..", "..#..", "...#.", "..#..", "..#..", "##..."],
  "~": [".....", ".....", ".##.#", "#.##.", ".....", ".....", "....."]
} as const;

const EXTRA_CHAR_NORMALIZATION = new Map<string, string>([
  ["\u2013", "-"],
  ["\u2014", "-"],
  ["\u2018", "'"],
  ["\u2019", "'"],
  ["\u201c", "\""],
  ["\u201d", "\""],
  ["\u00b7", "*"],
  ["\u2022", "*"],
  ["\u2190", "<"],
  ["\u2192", ">"],
  ["\u2191", "^"],
  ["\u2193", "v"],
  ["\u00d7", "x"],
  ["\u25a0", "#"],
  ["\u2588", "#"],
  ["\u2591", "."]
]);

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;
type BitmapFontCharacterData = Phaser.Types.GameObjects.BitmapText.BitmapFontCharacterData;
type BitmapFontData = Phaser.Types.GameObjects.BitmapText.BitmapFontData;
type TextFactory = Phaser.GameObjects.GameObjectFactory["text"];
type RuntimeBitmapFontCharacterData = BitmapFontCharacterData & { xAdvance: number };

type PixelTextObject = Phaser.GameObjects.BitmapText & {
  setText: (value: string | string[]) => PixelTextObject;
  setColor: (color: string | CanvasGradient | CanvasPattern) => Phaser.GameObjects.Text;
  setStyle: (style?: TextStyle) => Phaser.GameObjects.Text;
  setBackgroundColor: (color?: string) => Phaser.GameObjects.Text;
  setPadding: (left?: number, top?: number, right?: number, bottom?: number) => Phaser.GameObjects.Text;
  setFixedSize: (width?: number, height?: number) => Phaser.GameObjects.Text;
  setWordWrapWidth: (width?: number) => Phaser.GameObjects.Text;
  setStroke: (color?: string, thickness?: number) => Phaser.GameObjects.Text;
  setShadow: (x?: number, y?: number, color?: string, blur?: number, shadowStroke?: boolean, shadowFill?: boolean) => Phaser.GameObjects.Text;
  setResolution: (resolution?: number) => Phaser.GameObjects.Text;
};

type PatchedFactoryPrototype = Phaser.GameObjects.GameObjectFactory & {
  __rubyRulePixelTextPatched?: boolean;
  __rubyRuleOriginalText?: TextFactory;
};

function normalizeGlyph(character: string) {
  const replacement = EXTRA_CHAR_NORMALIZATION.get(character);
  if (replacement) return replacement.toUpperCase();
  return character.toUpperCase();
}

function normalizeTextValue(value: string | string[]) {
  const text = Array.isArray(value) ? value.join("\n") : value;
  return [...String(text)].map((character) => EXTRA_CHAR_NORMALIZATION.get(character) ?? character).join("");
}

function parseTint(color: TextStyle["color"] | string | undefined) {
  if (typeof color !== "string") return 0xffffff;
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const r = color[1];
    const g = color[2];
    const b = color[3];
    return Number.parseInt(`${r}${r}${g}${g}${b}${b}`, 16);
  }
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return Number.parseInt(color.slice(1), 16);
  }
  return 0xffffff;
}

function parseAlign(align: TextStyle["align"] | undefined) {
  if (align === "center") return 1;
  if (align === "right") return 2;
  return 0;
}

function applyBitmapTextStyle(bitmapText: Phaser.GameObjects.BitmapText, style?: TextStyle) {
  if (!style) return bitmapText;
  if (style.fontSize !== undefined) bitmapText.setFontSize(pixelFontMetrics(style.fontSize).fontSize);
  if (style.color !== undefined) bitmapText.setTint(parseTint(style.color));
  if (style.align === "center") bitmapText.setCenterAlign();
  if (style.align === "right") bitmapText.setRightAlign();
  if (style.align === "left") bitmapText.setLeftAlign();
  if (typeof style.lineSpacing === "number") bitmapText.setLineSpacing(Math.round(style.lineSpacing));
  if (typeof style.letterSpacing === "number") bitmapText.setLetterSpacing(Math.round(style.letterSpacing));
  if (style.wordWrap && typeof style.wordWrap.width === "number") {
    bitmapText.setMaxWidth(Math.round(style.wordWrap.width));
  } else if (typeof style.fixedWidth === "number" && style.fixedWidth > 0) {
    bitmapText.setMaxWidth(Math.round(style.fixedWidth));
  }
  return bitmapText;
}

function installCompatibilityMethods(bitmapText: Phaser.GameObjects.BitmapText) {
  const text = bitmapText as PixelTextObject;
  const originalSetText = bitmapText.setText.bind(bitmapText);
  const originalSetFontSize = bitmapText.setFontSize.bind(bitmapText);

  bitmapText.setFontSize = (size: number) => {
    const metrics = pixelFontMetrics(size);
    if (bitmapText.font !== metrics.key) bitmapText.setFont(metrics.key, metrics.fontSize);
    originalSetFontSize(metrics.fontSize);
    return bitmapText;
  };

  text.setText = (value) => {
    originalSetText(normalizeTextValue(value));
    return text;
  };

  text.setColor = (nextColor) => {
    if (typeof nextColor === "string") bitmapText.setTint(parseTint(nextColor));
    return text as unknown as Phaser.GameObjects.Text;
  };
  text.setStyle = (style) => {
    applyBitmapTextStyle(bitmapText, style);
    return text as unknown as Phaser.GameObjects.Text;
  };
  text.setBackgroundColor = () => text as unknown as Phaser.GameObjects.Text;
  text.setPadding = () => text as unknown as Phaser.GameObjects.Text;
  text.setFixedSize = (width) => {
    if (typeof width === "number" && width > 0) bitmapText.setMaxWidth(Math.round(width));
    return text as unknown as Phaser.GameObjects.Text;
  };
  text.setWordWrapWidth = (width) => {
    bitmapText.setMaxWidth(typeof width === "number" && width > 0 ? Math.round(width) : 0);
    return text as unknown as Phaser.GameObjects.Text;
  };
  text.setStroke = () => text as unknown as Phaser.GameObjects.Text;
  text.setShadow = (x, y, color, _blur, _shadowStroke, shadowFill) => {
    if (shadowFill !== false) {
      bitmapText.setDropShadow(Math.round(x ?? 1), Math.round(y ?? 1), parseTint(color), 0.7);
    }
    return text as unknown as Phaser.GameObjects.Text;
  };
  text.setResolution = () => text as unknown as Phaser.GameObjects.Text;
  return text;
}

function buildFont(scene: Phaser.Scene, small: boolean) {
  const fontKey = small ? SMALL_PIXEL_FONT_KEY : PIXEL_FONT_KEY;
  const textureKey = `${fontKey}-texture`;
  const glyphWidth = small ? 3 : 5;
  const glyphHeight = small ? 5 : 7;
  const cellWidth = glyphWidth + 1;
  const cellHeight = glyphHeight + 1;
  const glyphs = small ? SMALL_GLYPHS : GLYPHS;
  const characters = [
    ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    ..."abcdefghijklmnopqrstuvwxyz",
    ..."0123456789",
    ..." !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"
  ];
  const uniqueCharacters = [...new Set(characters)];
  const columns = 16;
  const rows = Math.ceil(uniqueCharacters.length / columns);
  const width = columns * cellWidth;
  const height = rows * cellHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#ffffff";

  const chars: Record<number, RuntimeBitmapFontCharacterData> = {};
  uniqueCharacters.forEach((character, index) => {
    const x = (index % columns) * cellWidth;
    const y = Math.floor(index / columns) * cellHeight;
    const pattern = glyphs[normalizeGlyph(character)] ?? glyphs["?"];
    pattern.forEach((row, rowIndex) => {
      [...row].forEach((pixel, colIndex) => {
        if (pixel === "#") context.fillRect(x + colIndex, y + rowIndex, 1, 1);
      });
    });
    const code = character.charCodeAt(0);
    const isSpace = character === " ";
    chars[code] = {
      x,
      y,
      width: isSpace ? glyphWidth - 2 : glyphWidth,
      height: glyphHeight,
      centerX: Math.floor(glyphWidth / 2),
      centerY: Math.floor(glyphHeight / 2),
      xOffset: 0,
      yOffset: 0,
      xAdvance: isSpace ? cellWidth - 2 : cellWidth,
      data: {},
      kerning: {},
      u0: x / width,
      v0: y / height,
      u1: (x + (isSpace ? glyphWidth - 2 : glyphWidth)) / width,
      v1: (y + glyphHeight) / height
    };
  });

  const texture = scene.textures.addCanvas(textureKey, canvas);
  texture?.setFilter(Phaser.Textures.FilterMode.NEAREST);

  const fontData: BitmapFontData = {
    font: fontKey,
    size: cellHeight,
    lineHeight: cellHeight,
    retroFont: true,
    chars
  };
  scene.cache.bitmapFont.add(fontKey, {
    data: fontData,
    texture: textureKey,
    frame: null
  });
}

export function ensurePixelBitmapFont(scene: Phaser.Scene) {
  if (!scene.cache.bitmapFont.has(PIXEL_FONT_KEY)) buildFont(scene, false);
  if (!scene.cache.bitmapFont.has(SMALL_PIXEL_FONT_KEY)) buildFont(scene, true);
}

export function installPixelTextFactory() {
  const factoryPrototype = Phaser.GameObjects.GameObjectFactory.prototype as PatchedFactoryPrototype;
  if (factoryPrototype.__rubyRulePixelTextPatched) return;

  const originalText = factoryPrototype.text;
  factoryPrototype.__rubyRuleOriginalText = originalText;
  factoryPrototype.text = function patchedPixelTextFactory(
    this: Phaser.GameObjects.GameObjectFactory,
    x: number,
    y: number,
    text: string | string[],
    style?: TextStyle
  ) {
    if (RENDER_DENSITY > 1) {
      return originalText.call(this, x, y, text, { ...style, fontFamily: style?.fontFamily === "monospace" ? "Arial, sans-serif" : style?.fontFamily, resolution: RENDER_DENSITY });
    }
    const scene = this.scene;
    if (!scene.cache.bitmapFont.has(PIXEL_FONT_KEY)) {
      return originalText.call(this, x, y, text, style);
    }
    const metrics = pixelFontMetrics(style?.fontSize);
    const bitmapText = this.bitmapText(
      Math.round(x),
      Math.round(y),
      metrics.key,
      normalizeTextValue(text),
      metrics.fontSize,
      parseAlign(style?.align)
    );
    installCompatibilityMethods(bitmapText);
    applyBitmapTextStyle(bitmapText, style);
    return bitmapText as unknown as Phaser.GameObjects.Text;
  } as TextFactory;
  factoryPrototype.__rubyRulePixelTextPatched = true;
}
