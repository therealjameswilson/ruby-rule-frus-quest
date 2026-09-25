export type FootstepSurface = 'carpet' | 'stone' | 'gravel' | 'grass' | 'wood';

export function footstepSurface(scene: string, position?: {x:number; y:number}): FootstepSurface {
  if (scene === 'PresidentialLibraryScene') {
    if (!position) return 'wood';
    // Classify the planted feet, five pixels below the logical hero origin.
    const x=position.x, y=position.y+5;
    if(x>=112&&x<=144&&y>=202) return 'stone';
    const runner=x>=110&&x<=146&&y>=74&&y<=224;
    const deskRug=([48,202].some(cx=>x>=cx-28&&x<=cx+28))
      && ([86,154].some(top=>y>=top&&y<=top+39));
    return runner||deskRug?'carpet':'wood';
  }
  if (scene === 'ResearchWorldScene') {
    if (!position) return 'gravel';
    // Landscape is displayed at (128,137), 256x206: paths cross at (128,128).
    const onSpine = position.x >= 118 && position.x <= 138;
    if (onSpine && position.y >= 208 && position.y <= 232) return 'stone';
    if (onSpine || (position.y >= 122 && position.y <= 135)) return 'gravel';
    return 'grass';
  }
  if (/Office|Conference|Poster/.test(scene)) return 'carpet';
  return 'stone';
}

// Short original sole-contact samples, synthesized once per context and surface.
// A damped body and filtered noise avoid pitched arcade beeps during walking.
export function footstepSamples(surface: FootstepSurface, sampleRate: number): Float32Array {
  const duration = surface === 'gravel' ? .105 : surface === 'grass' ? .09 : surface === 'wood' ? .085 : .075;
  const samples = new Float32Array(Math.ceil(sampleRate * duration));
  let seed = 731, low = 0;
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    low += (noise - low) * (surface === 'carpet' ? .06 : surface === 'grass' ? .12 : surface === 'wood' ? .18 : .32);
    const t = i / sampleRate;
    const attack = Math.min(1, t / .003);
    const envelope = attack * Math.exp(-t * (surface === 'gravel' ? 48 : 75));
    const body = surface === 'wood'
      ? (Math.sin(2*Math.PI*94*t)*.009 + Math.sin(2*Math.PI*164*t)*.005)*Math.exp(-t*22)
      : Math.sin(2 * Math.PI * (surface === 'stone' ? 115 : 78) * t) * .014;
    const texture = low * (surface === 'gravel' ? .06 : surface === 'grass' ? .023 : surface === 'stone' ? .027 : surface === 'wood' ? .019 : .012);
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
