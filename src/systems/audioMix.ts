export type AudioChannel = 'master' | 'music' | 'effects';
export type AudioMix = Record<AudioChannel, number>;
const KEY = 'ruby-rule.audio-mix';
export function readAudioMix(): AudioMix {
  const defaults = {master:1,music:0.8,effects:1};
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? '{}');
    for (const channel of ['master','music','effects'] as const) {
      const value=saved?.[channel];
      if (typeof value==='number' && Number.isFinite(value)) defaults[channel]=Math.max(0,Math.min(1,value));
    }
  } catch { /* Unavailable/private storage uses a usable default mix. */ }
  return defaults;
}
export function saveAudioMix(mix: AudioMix) {
  try { window.localStorage.setItem(KEY,JSON.stringify(mix)); } catch { /* Session mix still works. */ }
}
