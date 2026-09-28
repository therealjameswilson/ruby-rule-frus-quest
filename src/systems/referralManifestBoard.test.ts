import type Phaser from 'phaser';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {ReferralManifestBoard} from './referralManifestBoard';
import {initialReferralManifest} from '../game/referralManifest';
import {gameState,resetGameState} from '../game/state';
vi.mock('phaser',()=>({default:{Display:{Color:{HexStringToColor:()=>({color:0})}}}}));
vi.mock('../input/InputState',()=>({getInput:()=>({aJustPressed:true}),swallowNextInputFrame:vi.fn()}));
vi.mock('./audio',()=>({retroAudio:{warning:vi.fn(),annotatePaper:vi.fn()}}));
const view=vi.hoisted(()=>({change:(_i:number)=>{},file:()=>{},leave:()=>{},render:vi.fn(),input:vi.fn(),close:vi.fn()}));
vi.mock('./referralManifestDesk',()=>({ReferralManifestDesk:class{
 active=true;
 constructor(_evidence:boolean,change:typeof view.change,file:()=>void,leave:()=>void){Object.assign(view,{change,file,leave});}
 render(...args:unknown[]){view.render(...args);}
 updateInput(input:unknown){view.input(input);}
 close(){this.active=false;view.close();}
}}));
function fixture(evidence=false){const scene={events:{emit:vi.fn(),once:vi.fn()}},board=new ReferralManifestBoard(scene as unknown as Phaser.Scene),change=vi.fn(),approve=vi.fn(),draft=initialReferralManifest();board.show(draft,change,approve,evidence);return{scene,board,change,approve,draft};}
beforeEach(()=>{resetGameState();vi.clearAllMocks();});
describe('manifest source comparison',()=>{
 it('cannot authorize a correct route without the recovered evidence',()=>{
  const f=fixture();view.change(2);view.change(2);view.file();expect(f.approve).not.toHaveBeenCalled();expect(gameState.latestMessage).toContain('not its own evidence');expect(f.draft.white_house_minutes).toBe('CIA');
 });
 it('rejects an incorrect route and requires explicit filing after revision',()=>{
  const f=fixture(true);view.file();expect(f.approve).not.toHaveBeenCalled();
  view.change(2);view.file();expect(f.approve).not.toHaveBeenCalled();
  view.change(2);expect(f.approve).not.toHaveBeenCalled();view.file();expect(f.approve).toHaveBeenCalledExactlyOnceWith({...initialReferralManifest(),white_house_minutes:'NSC'});
  view.change(0);view.file();expect(f.approve).toHaveBeenCalledOnce();expect(f.change).toHaveBeenCalledTimes(2);
 });
 it('restores draft routes without approval, delegates input and leaves cleanly',()=>{
  const f=fixture(true);f.board.show({...f.draft,white_house_minutes:'NSC'},f.change,f.approve,true);expect(f.approve).not.toHaveBeenCalled();
  f.board.updateInput();expect(view.input).toHaveBeenCalled();view.leave();expect(gameState.currentChoice).toBeNull();expect(f.board.active).toBe(false);
 });
 it('removes the desk on shutdown without approving',()=>{
  const f=fixture(true);f.scene.events.once.mock.calls[0][1]();expect(view.close).toHaveBeenCalledOnce();expect(f.approve).not.toHaveBeenCalled();
 });
});
