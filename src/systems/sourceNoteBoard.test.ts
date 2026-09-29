import type Phaser from 'phaser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SourceNoteBoard } from './sourceNoteBoard';
import { getInput, type InputState } from '../input/InputState';
import { gameState, resetGameState } from '../game/state';
import { retroAudio } from './audio';
vi.mock('phaser',()=>({default:{Display:{Color:{HexStringToColor:()=>({color:0})}}}}));
const views = vi.hoisted(() => [] as any[]);
vi.mock('./sourceNoteDesk', () => ({SourceNoteDesk: class {
 active = true; render = vi.fn(); updateInput = vi.fn();
 constructor(public repair: () => void, public file: () => void, public leave: () => void) { views.push(this); }
 close() { this.active = false; }
}}));
vi.mock('../input/InputState', () => ({getInput: vi.fn(() => ({})), swallowNextInputFrame: vi.fn()}));
vi.mock('./audio', () => ({retroAudio: {warning: vi.fn(), annotatePaper: vi.fn()}}));
function fixture(repaired = false) {
 const once = vi.fn(), scene = {events: {emit: vi.fn(), once}};
 const board = new SourceNoteBoard(scene as unknown as Phaser.Scene);
 const changed = vi.fn(), filed = vi.fn(), cancelled = vi.fn();
 const open = () => board.show(repaired, changed, filed, cancelled);
 return {board, changed, filed, cancelled, open, shutdown: () => once.mock.calls[0][1]()};
}
beforeEach(() => {resetGameState(); vi.clearAllMocks(); views.length = 0;});
describe('source note evidence repair', () => {
 it('rejects unsupported filing without spending hearts or points', () => {
  const f = fixture(); f.open(); const before = [gameState.reliability, gameState.documentPoints];
  views[0].file(); expect(f.filed).not.toHaveBeenCalled(); expect(f.board.active).toBe(true);
  expect(views[0].render).toHaveBeenLastCalledWith(false, expect.stringMatching(/readership/), true);
  expect([gameState.reliability, gameState.documentPoints]).toEqual(before);
 });
 it('repairs once and requires a separate filing; stale callbacks cannot grant progress', () => {
  const f = fixture(); f.open(); const v = views[0];v.repair();v.repair();
  expect(f.changed).toHaveBeenCalledOnce();expect(retroAudio.annotatePaper).toHaveBeenCalledOnce();expect(f.filed).not.toHaveBeenCalled();
  expect(gameState.currentChoice?.options[0].value).toBe('evidence_limited');
  v.file();v.file();v.repair();expect(f.filed).toHaveBeenCalledOnce();expect(f.cancelled).not.toHaveBeenCalled();expect(f.board.active).toBe(false);
 });
 it('restores a corrected draft without auto filing or repeating the edit', () => {
  const f=fixture(true);f.open();expect(f.filed).not.toHaveBeenCalled();views[0].repair();expect(f.changed).not.toHaveBeenCalled();views[0].file();expect(f.filed).toHaveBeenCalledOnce();
 });
 it('delegates input and cleans up on leave or scene shutdown', () => {
  const f=fixture();f.open();const input={navDownJustPressed:true} as InputState;vi.mocked(getInput).mockReturnValue(input);f.board.updateInput();expect(views[0].updateInput).toHaveBeenCalledWith(input);
  views[0].leave();expect(f.cancelled).toHaveBeenCalledOnce();expect(gameState.currentChoice).toBeNull();
  f.open();f.shutdown();expect(f.cancelled).toHaveBeenCalledTimes(2);expect(f.filed).not.toHaveBeenCalled();expect(f.board.active).toBe(false);
 });
});
