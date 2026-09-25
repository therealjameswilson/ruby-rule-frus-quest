export type AmbienceProfile = 'office' | 'archive' | 'outdoors' | 'equipment' | 'vault';

export function ambienceForScene(scene: string): AmbienceProfile | null {
  if (['CherryBlossomGardenScene','ResearchWorldScene'].includes(scene)) return 'outdoors';
  if (['OfficeScene','SenateHearingChamberScene','historian_office','foggy_bottom','west_wing','frus_floor','capitol_hill'].includes(scene)) return 'office';
  if (['GuideScene','ArchiveScene','NaraStacksScene','SilentReadScene','PresidentialLibraryScene','NscLibraryScene','nara_stacks'].includes(scene)) return 'archive';
  if (['NetworkScene','EmbassyCableRoomScene','embassy'].includes(scene)) return 'equipment';
  if (['ReferralVaultScene','BlackVaultLairScene','black_vault','DanneBoss'].includes(scene)) return 'vault';
  return null;
}

/** River banks occupy the bottom of the outdoor map, with a bridge at y220. */
export function riverPresence(position: {y:number} | null) {
  if (!position || !Number.isFinite(position.y)) return 0;
  const proximity = Math.max(0, Math.min(1, 1 - Math.abs(position.y - 220) / 52));
  return proximity * proximity * (3 - 2 * proximity);
}

const SETTINGS = {
  office: { low:620, high:95, level:.012, hum:60, humLevel:.0012, breath:.07 },
  archive: { low:900, high:130, level:.013, hum:120, humLevel:.0008, breath:.045 },
  outdoors: { low:1700, high:240, level:.013, hum:0, humLevel:0, breath:.09 },
  equipment: { low:1300, high:180, level:.015, hum:90, humLevel:.0014, breath:.055 },
  vault: { low:350, high:45, level:.017, hum:55, humLevel:.0017, breath:.035 }
} as const;
const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
const birdCache = new WeakMap<BaseAudioContext, AudioBuffer>();
function noiseBuffer(context: BaseAudioContext) {
  let buffer=noiseCache.get(context);
  if (buffer) return buffer;
  buffer=context.createBuffer(2, Math.round(context.sampleRate*3.71), context.sampleRate);
  let seed=71023;
  for(let channel=0;channel<2;channel++) {
    const data=buffer.getChannelData(channel);
    for(let i=0;i<data.length;i++) {seed=(Math.imul(seed,1664525)+1013904223)|0;data[i]=seed/2147483648;}
  }
  noiseCache.set(context,buffer);return buffer;
}
function birdBuffer(context: BaseAudioContext) {
  let buffer=birdCache.get(context);
  if(buffer)return buffer;
  buffer=context.createBuffer(2, Math.round(context.sampleRate*29.3), context.sampleRate);
  // Irregular, short naturalistic chirps; not a tune or a sampled recording.
  for(const [at,frequency,direction,pan] of [[2.3,2400,1,-.7],[2.61,2800,-1,-.7],[8.7,3200,-1,.6],[17.4,2100,1,.3],[17.65,2700,1,.3],[25.2,3000,-1,-.4]]) {
    let phase=0;
    const count=Math.floor(context.sampleRate*.14);
    for(let i=0;i<count;i++) {
      const t=i/count;
      phase+=2*Math.PI*(frequency+direction*600*Math.sin(t*Math.PI))/context.sampleRate;
      const value=Math.sin(phase)*Math.sin(Math.PI*t)**2*.0025;
      const offset=Math.floor(at*context.sampleRate)+i;
      buffer.getChannelData(0)[offset]+=value*(1-pan)*.5;
      buffer.getChannelData(1)[offset]+=value*(1+pan)*.5;
    }
  }
  birdCache.set(context,buffer);return buffer;
}

/** Continuous synthesized room tone, independently routed through the effects bus. */
export class RoomAmbience {
  private readonly nodes: AudioNode[]=[];
  private readonly sources: AudioScheduledSourceNode[]=[];
  private readonly gain: GainNode;
  private disposed=false;
  private riverGain: GainNode | null = null;
  private riverLevel = 0;
  constructor(private readonly context: BaseAudioContext, output: AudioNode, readonly profile: AmbienceProfile) {
    const config=SETTINGS[profile],at=context.currentTime;
    this.gain=context.createGain();this.gain.gain.setValueAtTime(0,at);
    this.gain.gain.linearRampToValueAtTime(1,at+.65);this.gain.connect(output);this.nodes.push(this.gain);
    const bed=context.createBufferSource();bed.buffer=noiseBuffer(context);bed.loop=true;
    const low=context.createBiquadFilter();low.type='lowpass';low.frequency.value=config.low;low.Q.value=.5;
    const high=context.createBiquadFilter();high.type='highpass';high.frequency.value=config.high;high.Q.value=.5;
    const level=context.createGain();level.gain.value=config.level;
    const breath=context.createOscillator();breath.type='sine';breath.frequency.value=config.breath;
    const depth=context.createGain();depth.gain.value=config.level*(profile==='outdoors'?.42:.08);
    breath.connect(depth);depth.connect(level.gain);bed.connect(low);low.connect(high);high.connect(level);level.connect(this.gain);
    this.nodes.push(bed,low,high,level,breath,depth);this.sources.push(bed,breath);
    if(config.hum) {
      const hum=context.createOscillator();hum.type='sine';hum.frequency.value=config.hum;
      const volume=context.createGain();volume.gain.value=config.humLevel;
      hum.connect(volume);volume.connect(this.gain);this.nodes.push(hum,volume);this.sources.push(hum);
    }
    if(profile==='outdoors') {
      const birds=context.createBufferSource();birds.buffer=birdBuffer(context);birds.loop=true;
      birds.connect(this.gain);this.nodes.push(birds);this.sources.push(birds);
      // A higher, broad stereo wash contrasts with the low wind bed. Both are original noise.
      const water=context.createBufferSource();water.buffer=noiseBuffer(context);water.loop=true;
      const bank=context.createBiquadFilter();bank.type='highpass';bank.frequency.value=650;bank.Q.value=.5;
      const softness=context.createBiquadFilter();softness.type='lowpass';softness.frequency.value=4200;softness.Q.value=.5;
      this.riverGain=context.createGain();this.riverGain.gain.value=0;
      water.connect(bank);bank.connect(softness);softness.connect(this.riverGain);this.riverGain.connect(this.gain);
      this.nodes.push(water,bank,softness,this.riverGain);this.sources.push(water);
    }
    for(const source of this.sources)source.start(at);
  }
  get riverPresence(){return this.disposed ? 0 : this.riverLevel;}
  setRiverPosition(position: {y:number} | null) {
    if (this.disposed || !this.riverGain) return;
    const level=riverPresence(position);
    if (Math.abs(level-this.riverLevel)<.002) return;
    this.riverLevel=level;
    // Smooth travel and scene-entry jumps; update only when the listener moves appreciably.
    this.riverGain.gain.setTargetAtTime(level*.012,this.context.currentTime,.25);
  }
  get activeSourceCount(){return this.disposed?0:this.sources.length;}
  dispose() {
    if(this.disposed)return;
    this.disposed=true;
    const at=this.context.currentTime;
    this.gain.gain.cancelScheduledValues(at);
    this.gain.gain.setTargetAtTime(0,at,.045);
    let remaining=this.sources.length;
    for(const source of this.sources) {
      source.onended=()=>{if(--remaining===0)for(const node of this.nodes)node.disconnect();};
      source.stop(at+.25);
    }
  }
}
