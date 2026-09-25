export type PaperAction = 'pickup' | 'file';
const noises = new WeakMap<BaseAudioContext, AudioBuffer>();

function paperNoise(context: BaseAudioContext) {
  let buffer = noises.get(context);
  if (buffer) return buffer;
  buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .5), context.sampleRate);
  const samples = buffer.getChannelData(0);
  let seed = 41963;
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    samples[i] = seed / 2147483648 - 1;
  }
  noises.set(context, buffer);
  return buffer;
}

/** Original paper rustle and a damped tabletop/stamp impact; no external recordings. */
export function playPaperFoley(context: BaseAudioContext, output: AudioNode, action: PaperAction, ended: () => void) {
  const now = context.currentTime;
  const nodes: AudioNode[] = [], envelopes: GainNode[] = [];
  const voices: Array<{ source: AudioScheduledSourceNode; at: number; duration: number }> = [];
  const layers = action === 'pickup'
    ? [{ delay: 0, duration: .12, gain: .05, hz: 2600, endHz: 1400, attack: .018 },
       { delay: .055, duration: .10, gain: .035, hz: 3500, endHz: 1900, attack: .012 }]
    : [{ delay: 0, duration: .09, gain: .045, hz: 2100, endHz: 1200, attack: .012 },
       { delay: .07, duration: .065, gain: .11, hz: 950, endHz: 400, attack: .003 },
       { delay: .075, duration: .025, gain: .035, hz: 3300, endHz: 1600, attack: .002 }];
  for (const layer of layers) {
    const at = now + layer.delay;
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = paperNoise(context);
    filter.type = layer.hz < 1000 ? 'lowpass' : 'bandpass'; filter.Q.value = .65;
    filter.frequency.setValueAtTime(layer.hz, at);
    filter.frequency.exponentialRampToValueAtTime(layer.endHz, at + layer.duration);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(layer.gain, at + layer.attack);
    gain.gain.exponentialRampToValueAtTime(.0001, at + layer.duration);
    source.connect(filter); filter.connect(gain); gain.connect(output);
    nodes.push(source, filter, gain); envelopes.push(gain);
    voices.push({ source, at, duration: layer.duration });
  }
  if (action === 'file') {
    const at = now + .07, source = context.createOscillator(), gain = context.createGain();
    source.type = 'sine'; source.frequency.setValueAtTime(155, at);
    source.frequency.exponentialRampToValueAtTime(72, at + .075);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.028, at + .003);
    gain.gain.exponentialRampToValueAtTime(.0001, at + .09);
    source.connect(gain); gain.connect(output);
    nodes.push(source, gain); envelopes.push(gain); voices.push({ source, at, duration: .09 });
  }
  let remaining = voices.length, finished = false, cancelled = false;
  for (const { source, at, duration } of voices) {
    source.onended = () => {
      if (--remaining !== 0 || finished) return;
      finished = true; nodes.forEach(node => node.disconnect()); ended();
    };
    source.start(at); source.stop(at + duration + .015);
  }
  return () => {
    if (finished || cancelled) return;
    cancelled = true;
    const at = context.currentTime;
    for (const gain of envelopes) { gain.gain.cancelScheduledValues(at); gain.gain.setTargetAtTime(.0001, at, .002); }
    for (const { source } of voices) source.stop(at + .012);
  };
}
