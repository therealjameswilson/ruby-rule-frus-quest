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
    if (px < frame.cutX || px >= frame.cutX + frame.cutWidth || py < frame.cutY || py >= frame.cutY + frame.cutHeight) return null;
    return sheet.data[(py * sheet.width + px) * 4 + 3];
  };
}
