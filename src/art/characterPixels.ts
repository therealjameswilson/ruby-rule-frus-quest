import type Phaser from 'phaser';

/** Read a sheet once, lazily, instead of a canvas readback for every sample. */
export function characterAlphaSampler(
  texture: Phaser.Textures.Texture, density: number,
  fallback: (frame: number, x: number, y: number) => number | null
) {
  const sheets = new Map<Phaser.Textures.TextureSource, ImageData | null>();
  return (index: number, x: number, y: number): number | null => {
    const frame = texture.get(index);
    const source = frame.source;
    if (!sheets.has(source)) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = source.width; canvas.height = source.height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('No pixel reader');
        context.drawImage(source.image as CanvasImageSource, 0, 0);
        sheets.set(source, context.getImageData(0, 0, canvas.width, canvas.height));
      } catch {
        sheets.set(source, null);
      }
    }
    const sheet = sheets.get(source);
    if (!sheet) return fallback(index, x, y);
    // Match Phaser's frame trim and source cut coordinates exactly.
    const px = x * density - frame.x + frame.cutX;
    const py = y * density - frame.y + frame.cutY;
    // Every logical pixel covers a density-by-density block. A single corner
    // sample misses thin soles or hair edges in high-resolution artwork.
    const left = Math.max(px, frame.cutX), top = Math.max(py, frame.cutY);
    const right = Math.min(px + density, frame.cutX + frame.cutWidth);
    const bottom = Math.min(py + density, frame.cutY + frame.cutHeight);
    if (left >= right || top >= bottom) return null;
    let alpha = 0;
    for (let yy = top; yy < bottom; yy++) for (let xx = left; xx < right; xx++) {
      alpha = Math.max(alpha, sheet.data[(yy * sheet.width + xx) * 4 + 3]);
    }
    return alpha;
  };
}
