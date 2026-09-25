import {readFile} from 'node:fs/promises';
// Read the authored layout instead of silently testing a retired pad position.
const source = await readFile(new URL('../src/input/TouchControls.ts', import.meta.url), 'utf8');
const match = source.match(/export const FIXED_DPAD = \{ x: ([\d.]+), y: ([\d.]+), radius: ([\d.]+) \}/);
if (!match) throw new Error('Touch layout changed: update the movement fixture to read FIXED_DPAD.');
export const touchPad = {x: Number(match[1]), y: Number(match[2]), radius: Number(match[3])};
