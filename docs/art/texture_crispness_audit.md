# Texture Crispness Audit

Date: 2026-06-14

## Runtime Filtering

- BootScene now generates the repository-local bitmap pixel font before starting gameplay scenes.
- BootScene installs the pixel-text factory once, so existing `scene.add.text(...)` UI calls render through Phaser BitmapText glyphs rather than browser/canvas font rasterization.
- BootScene listens for Phaser's texture `ADD` event and immediately applies NEAREST to textures created after boot.
- BootScene applies `Phaser.Textures.FilterMode.NEAREST` to every loaded or generated texture key returned by `this.textures.getTextureKeys()`.
- The global NEAREST pass includes:
  - loaded PNG art packs,
  - loaded SVG fallback textures,
  - generated fallback textures,
  - generated bitmap-font texture.

## `src/game/snesAtlas.ts`

Audit command checked all frame/dimension-style numeric metadata for decimal values:

```sh
node - <<'NODE'
const fs = require('fs');
const text = fs.readFileSync('src/game/snesAtlas.ts', 'utf8');
const decimals = [...text.matchAll(/\b(?:x|y|w|h|width|height|frame|frameW|frameH|columns|rows|imageWidth|imageHeight|displayCellPx|nativeTileSize):\s*([0-9]+\.[0-9]+)/g)];
const paths = [...text.matchAll(/["'`]([^"'`]+\.(?:png|svg|tmj|json))["'`]/gi)].map((match) => match[1]);
console.log({ decimals: decimals.length, scaled: paths.filter((path) => /(?:@2x|\b2x\b|hires|highres|display|1024|896)/i.test(path)) });
NODE
```

Findings:

- Decimal frame/dimension metadata: 0.
- Scaled/display-like source paths: 0.
- All atlas dimensions and frame sizes are authored as integers.
- This file references repository-local SVG and generated fallback art. Phaser rasterizes those sources using integer dimensions from the atlas metadata.

## `src/assets/registry.ts`

Audit command checked all registry paths for scaled variants and all numeric metadata for decimals.

Findings:

- Decimal frame/dimension metadata: 0.
- Scaled/display-like source paths: 0.
- Registered PNG paths are canonical source assets, not `@2x`, `2x`, `hires`, display-sheet, `1024`, or `896` variants.
- Tiled map paths are `.tmj` data files and do not introduce texture filtering risk.

## Notes

- Some older packed tileset work elsewhere in the repo may include native/display variants by design. This audit is scoped to `src/game/snesAtlas.ts` and `src/assets/registry.ts`, per the implementation request.
- Future sprite/atlas entries should keep all frame coordinates and source dimensions as integers and should prefer canonical 1x source art paths.
