import type Phaser from 'phaser';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {ReferralTreatmentBoard} from './referralTreatmentBoard';
import {gameState,resetGameState} from '../game/state';
import type {TreatmentDraft} from '../game/referralTreatmentDraft';
vi.mock('phaser',()=>({default:{Display:{Color:{HexStringToColor:()=>({color:0})}}}}));
vi.mock('../input/InputState',()=>({getInput:()=>({aJustPressed:true}),swallowNextInputFrame:vi.fn()}));
vi.mock('./audio',()=>({retroAudio:{warning:vi.fn(),annotatePaper:vi.fn()}}));
const view=vi.hoisted(()=>({toggle:(_f:keyof TreatmentDraft)=>{},file:()=>{},leave:()=>{},render:vi.fn(),input:vi.fn(),close:vi.fn()}));
vi.mock('./referralTreatmentDesk',()=>({ReferralTreatmentDesk:class{
 active=true;
 constructor(toggle:typeof view.toggle,file:()=>void,leave:()=>void){Object.assign(view,{toggle,file,leave});}
 render(...args:unknown[]){view.render(...args);}
 updateInput(input:unknown){view.input(input);}
 close(){this.active=false;view.close();}
}}));
function fixture(draft:TreatmentDraft={permission:'PRINT',withholding:'OMIT'}){const scene={events:{emit:vi.fn(),once:vi.fn()}},board=new ReferralTreatmentBoard(scene as unknown as Phaser.Scene),change=vi.fn(),file=vi.fn();board.show(draft,change,file);return{scene,board,change,file,draft};}
beforeEach(()=>{resetGameState();vi.clearAllMocks();});
describe('treatment evidence decisions',()=>{
 it('requires both limits to be respected before separate filing',()=>{
  const f=fixture();view.file();expect(gameState.latestMessage).toContain('PERMISSION IS PENDING');expect(f.file).not.toHaveBeenCalled();
  view.toggle('permission');view.file();expect(gameState.latestMessage).toContain('APPEAL TRAIL');expect(f.file).not.toHaveBeenCalled();
  view.toggle('withholding');expect(f.file).not.toHaveBeenCalled();view.file();expect(f.file).toHaveBeenCalledOnce();
  view.toggle('permission');view.file();expect(f.file).toHaveBeenCalledOnce();expect(f.change).toHaveBeenCalledTimes(2);
  expect(f.draft).toEqual({permission:'PRINT',withholding:'OMIT'});
 });
 it('restores a correct unfiled draft without approving or editing it',()=>{
  const f=fixture({permission:'HOLD',withholding:'APPEAL'});expect(f.file).not.toHaveBeenCalled();expect(f.change).not.toHaveBeenCalled();
  f.board.updateInput();expect(view.input).toHaveBeenCalled();view.file();expect(f.file).toHaveBeenCalledOnce();
 });
 it('can reverse either draft choice and still rejects unsafe filing',()=>{
  const f=fixture({permission:'HOLD',withholding:'APPEAL'});view.toggle('withholding');view.file();expect(f.file).not.toHaveBeenCalled();
  view.toggle('withholding');view.toggle('permission');view.file();expect(f.file).not.toHaveBeenCalled();
 });
 it('cancels and shuts down without granting approval',()=>{
  const f=fixture();view.leave();expect(f.board.active).toBe(false);expect(gameState.currentChoice).toBeNull();
  f.board.show(f.draft,f.change,f.file);f.scene.events.once.mock.calls[0][1]();expect(f.board.active).toBe(false);expect(f.file).not.toHaveBeenCalled();
 });
});
