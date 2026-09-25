import type Phaser from 'phaser';
import { afterEach, expect, it, vi } from 'vitest';
import { characterAlphaSampler } from './characterPixels';

afterEach(() => vi.unstubAllGlobals());

it('reads lazily once and respects trimmed frame bounds', () => {
  const data = new Uint8ClampedArray(4 * 4 * 4);
  for (let i = 0; i < 16; i++) data[i * 4 + 3] = i;
  const getImageData = vi.fn(() => ({ width: 4, height: 4, data }));
  const createElement = vi.fn(() => ({ getContext: () => ({ drawImage: vi.fn(), getImageData }) }));
  vi.stubGlobal('document', { createElement });
  const source = { width: 4, height: 4, image: {} };
  const texture = { get: () => ({ source, x: 1, y: 0, cutX: 1, cutY: 1, cutWidth: 2, cutHeight: 2 }) };
  const sample = characterAlphaSampler(texture as unknown as Phaser.Textures.Texture, 1, () => -1);
  expect(createElement).not.toHaveBeenCalled();
  expect(sample(0, 1, 0)).toBe(5);
  expect(sample(1, 2, 1)).toBe(10);
  expect(sample(0, 0, 0)).toBeNull();
  expect(sample(0, 3, 0)).toBeNull();
  expect(getImageData).toHaveBeenCalledTimes(1);
});

it('falls back without retrying an unavailable pixel context for every sample', () => {
  const createElement = vi.fn(() => ({ getContext: () => null }));
  vi.stubGlobal('document', { createElement });
  const source = { width: 4, height: 4, image: {} };
  const texture = { get: () => ({ source }) };
  const fallback = vi.fn(() => 137);
  const sample = characterAlphaSampler(texture as unknown as Phaser.Textures.Texture, 3, fallback);
  expect(sample(0, 2, 3)).toBe(137);
  expect(sample(1, 4, 5)).toBe(137);
  expect(createElement).toHaveBeenCalledTimes(1);
  expect(fallback).toHaveBeenLastCalledWith(1, 4, 5);
});
