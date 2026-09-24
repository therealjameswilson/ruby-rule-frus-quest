import type { ScorePart } from "./scoreVoice";

type Note = number | null;
export interface ScoreTheme {
  title: string;
  source: string;
  midiStem: string;
  stepMs: number;
  notes: Note[];
  chords: number[][];
  lead: ScorePart;
  pulse: boolean;
  gain: number;
}
export interface ScoreEvent {
  note: number;
  offset: number;
  duration: number;
  volume: number;
  part: ScorePart;
}
const rest = null;
// Original Ruby Rule motif: an open fifth answered by a falling third.
// Each score develops it over sixteen bars instead of repeating one short cell.
const journey: Note[] = [64,rest,67,69,rest,71,67,64, 62,rest,64,67,69,rest,67,rest,
  72,rest,71,67,69,rest,64,62, 64,67,rest,62,60,rest,rest,rest];
const answer: Note[] = [69,rest,72,74,72,rest,67,69, 71,rest,67,64,62,rest,64,rest,
  67,69,72,rest,71,67,64,rest, 62,64,67,rest,64,rest,rest,rest];
const major: Note[] = [66,rest,69,71,rest,74,73,69, 64,rest,66,69,71,rest,69,rest,
  74,rest,73,69,71,rest,66,64, 66,69,rest,64,62,rest,rest,rest];
const majorAnswer: Note[] = [71,rest,74,76,74,rest,69,71, 73,rest,69,66,64,rest,66,rest,
  69,71,74,rest,73,69,66,rest, 64,66,69,rest,62,rest,rest,rest];
const tension: Note[] = [52,rest,59,60,rest,55,59,rest, 53,rest,60,64,62,rest,60,rest,
  55,rest,62,64,rest,59,62,rest, 59,60,rest,55,52,rest,rest,rest];
function transpose(notes: Note[], semitones: number) { return notes.map(n => n === null ? null : n + semitones); }
function theme(id: string, title: string, bpm: number, a: Note[], b: Note[], chords: number[][],
  lead: ScorePart = "lead", pulse = false, gain = .027): ScoreTheme {
  // A, answering phrase, developed A, then a sparse cadence that breathes into the loop.
  const developed = a.map((n, i) => n !== null && i >= 16 && i % 4 === 0 ? n + 12 : n);
  const cadence = b.map((n, i) => i > 25 ? null : n);
  return { title, source: "Original Ruby Rule composition; locally synthesized instruments",
    midiStem: `original:${id}`, stepMs: 30000 / bpm, notes: [...a, ...b, ...developed, ...cadence],
    chords, lead, pulse, gain };
}
const minorHarmony = [[45,52,60],[41,48,57],[48,55,64],[43,50,59]];
const majorHarmony = [[50,57,66],[47,54,62],[43,50,59],[45,52,61]];
const darkHarmony = [[40,47,55],[41,48,57],[43,50,59],[47,54,60]];
export const ORIGINAL_SCORE: Record<string, ScoreTheme> = {
  title: theme("title", "The Unwritten Volume", 88, journey, answer, minorHarmony, "lead"),
  officeHub: theme("office", "A Desk in the Morning", 92, major, majorAnswer, majorHarmony, "pluck", false, .024),
  cherryGarden: theme("outside", "Across the Capital", 108, transpose(major, -7), transpose(majorAnswer, -7), majorHarmony.map(c => c.map(n => n - 7)), "bell", false, .028),
  archiveDungeon: theme("archive", "Footnotes in the Stacks", 98, journey, answer, minorHarmony, "pluck", false, .022),
  blackVault: theme("vault", "Beneath the Record", 82, tension, transpose(answer, -12), darkHarmony, "lead", false, .024),
  danneCombat: theme("combat", "Ego and Evidence", 132, tension, transpose(journey, -5), darkHarmony, "pluck", true, .029),
  openNetRouting: theme("network", "Routes and Returns", 116, transpose(major, -2), transpose(majorAnswer, -2), majorHarmony.map(c => c.map(n => n - 2)), "bell", true, .023),
  referralVault: theme("referral", "An Answer Under Seal", 84, transpose(journey, -5), transpose(answer, -5), minorHarmony.map(c => c.map(n => n - 5)), "lead", false, .023),
  silentReadTower: theme("proof", "Between the Lines", 76, major, majorAnswer, majorHarmony, "bell", false, .020),
  bindingCeremony: theme("binding", "Bound in Ruby", 96, majorAnswer, transpose(major, 12), majorHarmony, "lead", false, .027)
};
// Locations share musical families; aliases preserve saved/debug theme keys.
for (const [alias, source] of Object.entries({senate:"silentReadTower", naraStacks:"archiveDungeon",
  embassyCable:"openNetRouting", miniboss:"danneCombat", danneBoss:"blackVault"})) ORIGINAL_SCORE[alias] = ORIGINAL_SCORE[source];

/** One deterministic scheduler shared by live playback and offline listening exports. */
export function scoreEventsAtStep(theme: ScoreTheme, index: number): ScoreEvent[] {
  const step = theme.stepMs / 1000, position = index % theme.notes.length;
  const bar = Math.floor(position / 8), beat = position % 8;
  const chord = theme.chords[bar % theme.chords.length];
  const events: ScoreEvent[] = [];
  const note = theme.notes[position];
  if (note !== null) {
    let sustain = 1;
    while (sustain < 3 && theme.notes[(position + sustain) % theme.notes.length] === null) sustain++;
    events.push({note, offset:0, duration:step * sustain * .83, volume:theme.gain * (beat === 0 ? 1 : .86), part:theme.lead});
  }
  if (beat === 0 || beat === 4) events.push({note:chord[0] - (beat === 0 ? 12 : 0), offset:0,
    duration:step * 3.4, volume:.021, part:"bass"});
  if (beat === 0) for (const note of chord.slice(1)) events.push({note, offset:0,
    duration:step * 7.2, volume:.006, part:"pad"});
  // Counterline enters in the answering and development sections, rests for the cadence.
  if (bar >= 4 && bar < 12 && beat % 2 === 1) events.push({note:chord[1 + (beat % 3 === 0 ? 1 : 0)] + 12,
    offset:step * .08, duration:step * .6, volume:.008, part:"counter"});
  return events;
}
