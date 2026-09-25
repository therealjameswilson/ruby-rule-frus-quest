import type { ProcessItemId } from '../game/constants';

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
function noiseFor(context: BaseAudioContext) {
  let noise = noiseCache.get(context);
  if (noise) return noise;
  noise = context.createBuffer(1, Math.ceil(context.sampleRate * .5), context.sampleRate);
  const data = noise.getChannelData(0); let seed = 7319;
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = seed / 2147483648 - 1;
  }
  noiseCache.set(context, noise); return noise;
}

/** Original physical tool textures, synthesized without downloaded recordings. */
export function playToolFoley(context: AudioContext, output: AudioNode, tool: ProcessItemId, hit: boolean, ended: () => void) {
  const pencil = tool === 'red_pencil', folder = tool === 'review_folder', stapler = tool === 'stapler';
  const duration = pencil ? (hit ? .11 : .075) : folder ? (hit ? .17 : .14) : (hit ? .085 : .045);
  const amplitude = pencil ? (hit ? .1 : .045) : folder ? (hit ? .14 : .075) : (hit ? .18 : .065);
  const frequency = pencil ? 3200 : folder ? 1900 : stapler ? 3400 : 2300;
  const at = context.currentTime;
  const source = context.createBufferSource(), filter = context.createBiquadFilter(), envelope = context.createGain();
  source.buffer = noiseFor(context);
  filter.type = folder || (!pencil && !stapler) ? 'lowpass' : 'bandpass';
  filter.frequency.setValueAtTime(frequency, at); filter.frequency.exponentialRampToValueAtTime(frequency * .58, at + duration);
  filter.Q.value = pencil ? 1.1 : .7;
  envelope.gain.setValueAtTime(0, at);
  envelope.gain.linearRampToValueAtTime(amplitude, at + (folder ? .018 : .003));
  envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
  source.connect(filter); filter.connect(envelope); envelope.connect(output);
  const sources: AudioScheduledSourceNode[] = [source];
  const nodes: AudioNode[] = [source, filter, envelope];
  const envelopes = [envelope];
  // The stapler and stamp have a short mechanical body; paper stays airy.
  if (hit && !pencil) {
    const body = context.createOscillator(), bodyGain = context.createGain();
    body.type = 'sine';body.frequency.setValueAtTime(stapler ? 240 : folder ? 140 : 185, at);
    body.frequency.exponentialRampToValueAtTime(folder ? 65 : 90, at + .065);
    bodyGain.gain.setValueAtTime(0, at);bodyGain.gain.linearRampToValueAtTime(folder ? .028 : .045, at + .003);
    bodyGain.gain.exponentialRampToValueAtTime(.0001, at + .085);
    body.connect(bodyGain);bodyGain.connect(output);sources.push(body);nodes.push(body,bodyGain);envelopes.push(bodyGain);
  }
  let remaining = sources.length, finished = false;
  for (const voice of sources) {
    voice.onended = () => { if (--remaining === 0) { finished = true; nodes.forEach(node => node.disconnect()); ended(); } };
    voice.start(at);voice.stop(at + duration + .02);
  }
  return () => {
    if (finished) return;
    const now = context.currentTime;
    for (const gain of envelopes) { gain.gain.cancelScheduledValues(now); gain.gain.setTargetAtTime(.0001, now, .002); }
    for (const voice of sources) voice.stop(now + .012);
  };
}
