import type Phaser from 'phaser';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {EditorialRepairBoard} from './editorialRepairBoard';
import {EDITORIAL_REPAIR_RECORDS} from '../game/editorialRepair';
import {resetGameState,gameState} from '../game/state';
vi.mock('phaser',()=>({default:{Display:{Color:{HexStringToColor:()=>({color:0})}}}}));
vi.mock('../input/InputState',()=>({getInput:()=>({aJustPressed:true}),swallowNextInputFrame:vi.fn()}));
vi.mock('./audio',()=>({retroAudio:{warning:vi.fn(),annotatePaper:vi.fn()}}));
const view=vi.hoisted(()=>({repair:()=>{},file:()=>{},leave:()=>{},render:vi.fn(),input:vi.fn(),close:vi.fn()}));
vi.mock('./editorialRepairDesk',()=>({EditorialRepairDesk:class{
 active=true;
 constructor(_record:unknown,_proof:boolean,repair:()=>void,file:()=>void,leave:()=>void){Object.assign(view,{repair,file,leave});}
 render(...args:unknown[]){view.render(...args);}
 updateInput(input:unknown){view.input(input);}
 close(){this.active=false;view.close();}
}}));
function fixture(proof=false,repaired=false){const scene={events:{emit:vi.fn(),once:vi.fn()}},board=new EditorialRepairBoard(scene as unknown as Phaser.Scene),change=vi.fn(),file=vi.fn();board.show(EDITORIAL_REPAIR_RECORDS[0],repaired,proof,change,file);return{scene,board,change,file};}
beforeEach(()=>{resetGameState();vi.clearAllMocks();});
describe('editorial repair decisions',()=>{
 it('requires an indication and separate draft filing',()=>{
  const f=fixture();view.file();expect(f.file).not.toHaveBeenCalled();
  view.repair();view.repair();expect(f.change).toHaveBeenCalledOnce();expect(f.file).not.toHaveBeenCalled();
  expect(gameState.currentChoice?.options[0].value).toBe('visible_italic');
  view.file();expect(f.file).toHaveBeenCalledOnce();view.file();view.repair();expect(f.file).toHaveBeenCalledOnce();expect(f.change).toHaveBeenCalledOnce();
 });
 it('cannot create a missing indication at the proof table',()=>{
  const f=fixture(true);view.repair();view.file();expect(f.change).not.toHaveBeenCalled();expect(f.file).not.toHaveBeenCalled();
  expect(view.render).toHaveBeenLastCalledWith(false,expect.stringContaining('editor desk'),true);
 });
 it('restores a draft without approval and files a rechecked proof without editing',()=>{
  const f=fixture(true,true);expect(f.file).not.toHaveBeenCalled();view.repair();expect(f.change).not.toHaveBeenCalled();view.file();expect(f.file).toHaveBeenCalledOnce();
 });
 it('keeps cancellation and scene shutdown free of approval',()=>{
  const f=fixture();view.leave();expect(f.board.active).toBe(false);expect(gameState.currentChoice).toBeNull();
  f.board.show(EDITORIAL_REPAIR_RECORDS[1],true,false,f.change,f.file);f.board.updateInput();expect(view.input).toHaveBeenCalled();
  f.scene.events.once.mock.calls[0][1]();expect(f.board.active).toBe(false);expect(f.file).not.toHaveBeenCalled();
 });
});
