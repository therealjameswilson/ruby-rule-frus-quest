import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArchiveScene } from './ArchiveScene';
import { addProcessItem, gameState, resetGameState, setLatestMessage } from '../game/state';
import { saveGameNow } from '../systems/save';
vi.mock('phaser',()=>({default:{Scene:class{},GameObjects:{Sprite:class{}}}}));
vi.mock('../entities/Player',()=>({Player:class{}}));
vi.mock('../systems/save',()=>({saveGameNow:vi.fn()}));
vi.mock('../systems/audio',()=>({retroAudio:{warning:vi.fn()}}));
beforeEach(()=>{resetGameState();vi.clearAllMocks();addProcessItem('citation_stamp');Object.assign(gameState.sceneProgress,{sourceNoteProvenanceComplete:1,annotationGatheredMask:7});});
describe('Archive packet review handoff',()=>{
 it('keeps rejected maps in review and preserves scene completion feedback after filing',()=>{
  let file!:(v:string)=>{ok:boolean;message:string},approved!:()=>void,cancelled!:()=>void;
  const resume=vi.fn(),complete=vi.fn(()=>setLatestMessage('Annotation filed. The documents are ready to collect.'));
  const scene=Object.assign(new ArchiveScene(),{researchChoice:{active:false},annotationPacketDesk:{active:false,show:(f:typeof file,a:()=>void,c:()=>void)=>{file=f;approved=a;cancelled=c;}},interactionPrompt:{update:vi.fn()},clearSourceNoteRouteCue:vi.fn(),resumeArchiveReview:resume}) as unknown as {reviewResearchDecision(id:'coverage',onApprove:()=>void):void};
  scene.reviewResearchDecision('coverage',complete);
  expect(file('single_folder').ok).toBe(false);expect(complete).not.toHaveBeenCalled();expect(saveGameNow).not.toHaveBeenCalled();expect(gameState.sceneProgress.repositoryCoverageMapComplete).toBeUndefined();
  cancelled();expect(resume).toHaveBeenCalledOnce();expect(complete).not.toHaveBeenCalled();
  expect(file('coverage').ok).toBe(true);approved();expect(complete).toHaveBeenCalledOnce();expect(saveGameNow).toHaveBeenCalledOnce();expect(gameState.latestMessage).toBe('Annotation filed. The documents are ready to collect.');
 });
 it('does not open another review while the packet desk is active',()=>{
  const show=vi.fn(),scene=Object.assign(new ArchiveScene(),{researchChoice:{active:false},annotationPacketDesk:{active:true,show}}) as unknown as {reviewResearchDecision(id:'coverage',a:()=>void):void};
  scene.reviewResearchDecision('coverage',vi.fn());expect(show).not.toHaveBeenCalled();
 });
});
