import Phaser from "phaser";

export const PIXEL_FONT_KEY = "ruby-rule-bitmap-font";
const PIXEL_FONT_TEXTURE_KEY = "ruby-rule-bitmap-font-texture";
const GLYPH_WIDTH = 5;
const GLYPH_HEIGHT = 7;
const CELL_WIDTH = 6;
const CELL_HEIGHT = 8;
const FONT_SIZE = 8;

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

function getPattern(character: string) {
  const normalized = normalizeGlyph(character);
  return GLYPHS[normalized] ?? GLYPHS["?"];
}

function normalizeGlyph(character: string) {
  const replacement = EXTRA_CHAR_NORMALIZATION.get(character);
  if (replacement) return replacement.toUpperCase();
  return character.toUpperCase();
}

function normalizeTextValue(value: string | string[]) {
  const text = Array.isArray(value) ? value.join("\n") : value;
  return [...String(text)].map((character) => EXTRA_CHAR_NORMALIZATION.get(character) ?? character).join("");
}

function parseFontSize(size: TextStyle["fontSize"] | undefined) {
  if (typeof size === "number" && Number.isFinite(size)) return Math.max(4, Math.round(size));
  if (typeof size === "string") {
    const parsed = Number.parseFloat(size);
    if (Number.isFinite(parsed)) return Math.max(4, Math.round(parsed));
  }
  return FONT_SIZE;
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
  bitmapText.setFontSize(parseFontSize(style.fontSize));
  bitmapText.setTint(parseTint(style.color));
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

function buildFont(scene: Phaser.Scene) {
  const characters = [
    ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    ..."abcdefghijklmnopqrstuvwxyz",
    ..."0123456789",
    ..." !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"
  ];
  const uniqueCharacters = [...new Set(characters)];
  const columns = 16;
  const rows = Math.ceil(uniqueCharacters.length / columns);
  const width = columns * CELL_WIDTH;
  const height = rows * CELL_HEIGHT;
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
    const x = (index % columns) * CELL_WIDTH;
    const y = Math.floor(index / columns) * CELL_HEIGHT;
    const pattern = getPattern(character);
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
      width: isSpace ? 3 : GLYPH_WIDTH,
      height: GLYPH_HEIGHT,
      centerX: Math.floor(GLYPH_WIDTH / 2),
      centerY: Math.floor(GLYPH_HEIGHT / 2),
      xOffset: 0,
      yOffset: 0,
      xAdvance: isSpace ? 4 : CELL_WIDTH,
      data: {},
      kerning: {},
      u0: x / width,
      v0: y / height,
      u1: (x + (isSpace ? 3 : GLYPH_WIDTH)) / width,
      v1: (y + GLYPH_HEIGHT) / height
    };
  });

  const texture = scene.textures.addCanvas(PIXEL_FONT_TEXTURE_KEY, canvas);
  texture?.setFilter(Phaser.Textures.FilterMode.NEAREST);

  const fontData: BitmapFontData = {
    font: PIXEL_FONT_KEY,
    size: FONT_SIZE,
    lineHeight: CELL_HEIGHT,
    retroFont: true,
    chars
  };
  scene.cache.bitmapFont.add(PIXEL_FONT_KEY, {
    data: fontData,
    texture: PIXEL_FONT_TEXTURE_KEY,
    frame: null
  });
}

export function ensurePixelBitmapFont(scene: Phaser.Scene) {
  if (scene.cache.bitmapFont.has(PIXEL_FONT_KEY)) return;
  buildFont(scene);
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
    const scene = this.scene;
    if (!scene.cache.bitmapFont.has(PIXEL_FONT_KEY)) {
      return originalText.call(this, x, y, text, style);
    }
    const bitmapText = this.bitmapText(
      Math.round(x),
      Math.round(y),
      PIXEL_FONT_KEY,
      normalizeTextValue(text),
      parseFontSize(style?.fontSize),
      parseAlign(style?.align)
    );
    applyBitmapTextStyle(bitmapText, style);
    installCompatibilityMethods(bitmapText);
    return bitmapText as unknown as Phaser.GameObjects.Text;
  } as TextFactory;
  factoryPrototype.__rubyRulePixelTextPatched = true;
}
