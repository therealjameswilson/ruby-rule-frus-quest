export type FootstepSurface = 'carpet' | 'stone' | 'gravel';

export function footstepSurface(scene: string): FootstepSurface {
  if (scene === 'ResearchWorldScene') return 'gravel';
  if (/Office|Conference|Poster/.test(scene)) return 'carpet';
  return 'stone';
}

// Short original sole-contact samples, synthesized once per context and surface.
// A damped body and filtered noise avoid pitched arcade beeps during walking.
export function footstepSamples(surface: FootstepSurface, sampleRate: number): Float32Array {
  const duration = surface === 'gravel' ? .105 : .075;
  const samples = new Float32Array(Math.ceil(sampleRate * duration));
  let seed = 731, low = 0;
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    low += (noise - low) * (surface === 'carpet' ? .06 : .32);
    const t = i / sampleRate;
    const attack = Math.min(1, t / .003);
    const envelope = attack * Math.exp(-t * (surface === 'gravel' ? 48 : 75));
    const body = Math.sin(2 * Math.PI * (surface === 'stone' ? 115 : 78) * t) * .014;
    const texture = low * (surface === 'gravel' ? .06 : surface === 'stone' ? .027 : .012);
    const fade = Math.min(1, (samples.length - 1 - i) / (sampleRate * .008));
    samples[i] = (body + texture) * envelope * fade;
  }
  return samples;
}

const buffers = new WeakMap<BaseAudioContext, Map<FootstepSurface, AudioBuffer>>();
export function playFootstep(context: AudioContext, output: AudioNode, surface: FootstepSurface, right: boolean) {
  let cache = buffers.get(context);
  if (!cache) { cache = new Map(); buffers.set(context, cache); }
  let buffer = cache.get(surface);
  if (!buffer) {
    const data = footstepSamples(surface, context.sampleRate);
    buffer = context.createBuffer(1, data.length, context.sampleRate);
    buffer.getChannelData(0).set(data);
    cache.set(surface, buffer);
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = right ? 1.035 : .975;
  const pan = context.createStereoPanner();
  pan.pan.value = right ? .09 : -.09;
  source.connect(pan); pan.connect(output);
  source.onended = () => { source.disconnect(); pan.disconnect(); };
  source.start();
}
