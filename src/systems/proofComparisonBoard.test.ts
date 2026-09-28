import type Phaser from 'phaser';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {ProofComparisonBoard} from './proofComparisonBoard';
import {gameState,resetGameState} from '../game/state';
vi.mock('phaser',()=>({default:{Display:{Color:{HexStringToColor:()=>({color:0})}}}}));
vi.mock('../input/InputState',()=>({getInput:()=>({aJustPressed:true}),swallowNextInputFrame:vi.fn()}));
vi.mock('./audio',()=>({retroAudio:{warning:vi.fn(),annotatePaper:vi.fn()}}));
const view=vi.hoisted(()=>({repair:(_i:number)=>{},file:()=>{},leave:()=>{},render:vi.fn(),input:vi.fn(),close:vi.fn()}));
vi.mock('./proofComparisonDesk',()=>({ProofComparisonDesk:class{
 active=true;
 constructor(repair:typeof view.repair,file:()=>void,leave:()=>void){Object.assign(view,{repair,file,leave});}
 render(...args:unknown[]){view.render(...args);}
 updateInput(input:unknown){view.input(input);}
 close(){this.active=false;view.close();}
}}));
function fixture(draft=0){const scene={events:{emit:vi.fn(),once:vi.fn()}},board=new ProofComparisonBoard(scene as unknown as Phaser.Scene),change=vi.fn(),approve=vi.fn();board.show(draft,change,approve);return{scene,board,change,approve};}
beforeEach(()=>{resetGameState();vi.clearAllMocks();});
describe('proof comparison decisions',()=>{
 it('requires both repairs and separate filing',()=>{
  const f=fixture();view.file();expect(f.approve).not.toHaveBeenCalled();
  view.repair(0);expect(f.change).toHaveBeenLastCalledWith(1);view.file();expect(f.approve).not.toHaveBeenCalled();
  view.repair(2);expect(f.change).toHaveBeenLastCalledWith(3);expect(f.approve).not.toHaveBeenCalled();
  view.file();expect(f.approve).toHaveBeenCalledExactlyOnceWith(3);view.file();view.repair(0);expect(f.approve).toHaveBeenCalledOnce();
 });
 it('leaves faithful text untouched and explains the meaning correction',()=>{
  const f=fixture();view.repair(1);view.repair(3);expect(f.change).not.toHaveBeenCalled();
  view.repair(2);expect(view.render).toHaveBeenLastCalledWith(2,expect.stringContaining('tentative'),false);
  expect(gameState.currentChoice?.options[2].value).toBe('faithful');
 });
 it('restores an unfiled draft and delegates controls',()=>{
  const f=fixture(3);expect(f.approve).not.toHaveBeenCalled();f.board.updateInput();expect(view.input).toHaveBeenCalledWith({aJustPressed:true});view.file();expect(f.approve).toHaveBeenCalledExactlyOnceWith(3);
 });
 it('leaves and shuts down without approval',()=>{
  const f=fixture(1);view.leave();expect(gameState.currentChoice).toBeNull();expect(f.approve).not.toHaveBeenCalled();
  f.board.show(1,f.change,f.approve);f.scene.events.once.mock.calls[0][1]();expect(f.board.active).toBe(false);expect(view.close).toHaveBeenCalledTimes(2);
 });
});
