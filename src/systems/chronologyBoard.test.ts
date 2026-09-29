import type Phaser from 'phaser';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {ChronologyBoard,WithholdingChronologyBoard} from './withholdingChronologyBoard';
import {gameState,resetGameState} from '../game/state';
import {EDITOR_CHRONOLOGY_EVIDENCE,editorChronologySequence,restoreEditorChronology,shiftEditorChronology,validateEditorChronology} from '../game/editorChronology';
vi.mock('phaser',()=>({default:{Display:{Color:{HexStringToColor:()=>({color:0})}}}}));
const view=vi.hoisted(()=>({shift:(_d:-1|1)=>{},file:()=>{},leave:()=>{},render:vi.fn(),input:vi.fn(),close:vi.fn()}));
vi.mock('../input/InputState',()=>({getInput:()=>({aJustPressed:true}),swallowNextInputFrame:vi.fn()}));
vi.mock('./audio',()=>({retroAudio:{warning:vi.fn(),turnPaper:vi.fn()}}));
vi.mock('./chronologyDesk',()=>({ChronologyDesk:class{
  active=true;
  constructor(_task:unknown,shift:(d:-1|1)=>void,file:()=>void,leave:()=>void){Object.assign(view,{shift,file,leave});}
  render(...args:unknown[]){view.render(...args);}
  updateInput(input:unknown){view.input(input);}
  close(){this.active=false;view.close();}
}}));
function fixture(withheld=false){
 const scene={events:{emit:vi.fn(),once:vi.fn()}};
 const board=withheld?new WithholdingChronologyBoard(scene as unknown as Phaser.Scene):new ChronologyBoard(scene as unknown as Phaser.Scene,{title:'CHRONOLOGY',heading:'CHRONOLOGY',evidence:EDITOR_CHRONOLOGY_EVIDENCE,initialMessage:'OUT OF ORDER',restore:restoreEditorChronology,shift:shiftEditorChronology,sequence:editorChronologySequence,validate:validateEditorChronology});
 return{board,change:vi.fn(),approve:vi.fn(),scene};
}
beforeEach(()=>{resetGameState();vi.clearAllMocks();});
describe('chronology board decisions and lifecycle',()=>{
 it('rejects a faulty order and requires explicit filing after movement',()=>{
  const f=fixture();f.board.show(undefined,f.change,f.approve);view.file();expect(f.approve).not.toHaveBeenCalled();
  view.shift(-1);expect(f.change).toHaveBeenCalledExactlyOnceWith(2);expect(gameState.currentChoice?.options[1].value).toBe('memcon');expect(f.approve).not.toHaveBeenCalled();
  view.file();expect(f.approve).toHaveBeenCalledExactlyOnceWith(2);view.shift(-1);view.file();expect(f.change).toHaveBeenCalledOnce();expect(f.approve).toHaveBeenCalledOnce();
 });
 it('restores an unfiled placement and delegates native controls',()=>{
  const f=fixture();f.board.show(2,f.change,f.approve);expect(f.approve).not.toHaveBeenCalled();f.board.updateInput();expect(view.input).toHaveBeenCalledWith({aJustPressed:true});view.file();expect(f.approve).toHaveBeenCalledExactlyOnceWith(2);
 });
 it('leaves without approving and removes stale choice state',()=>{
  const f=fixture();f.board.show(2,f.change,f.approve);view.leave();expect(f.board.active).toBe(false);expect(gameState.currentChoice).toBeNull();expect(f.approve).not.toHaveBeenCalled();
 });
 it('cleans up the native desk on scene shutdown',()=>{
  const f=fixture();f.board.show(2,f.change,f.approve);f.scene.events.once.mock.calls[0][1]();expect(view.close).toHaveBeenCalledOnce();expect(f.board.active).toBe(false);
 });
 it('replaces an open desk without leaving a second modal',()=>{
  const f=fixture();f.board.show(1,f.change,f.approve);f.board.show(2,f.change,f.approve);expect(view.close).toHaveBeenCalledOnce();view.file();expect(f.approve).toHaveBeenCalledExactlyOnceWith(2);
 });
 it('preserves the withheld-record insertion task',()=>{
  const f=fixture(true);f.board.show(0,f.change,f.approve);expect(gameState.currentChoice?.options).toHaveLength(2);view.file();expect(f.approve).not.toHaveBeenCalled();view.shift(1);view.shift(1);view.file();expect(f.approve).toHaveBeenCalledExactlyOnceWith(2);
 });
});
