import type Phaser from "phaser";
import { clearChoiceState, setChoiceState, setLatestMessage } from "../game/state";
import { REFERRAL_EQUITY_PACKETS } from "../game/referralVaultReview";
import { changeManifestRoute, firstManifestMismatch, initialReferralManifest, REFERRAL_MANIFEST_LABELS, REFERRAL_MANIFEST_TITLE, type ReferralManifest } from "../game/referralManifest";
import { getInput, swallowNextInputFrame } from "../input/InputState";
import { retroAudio } from "./audio";
import { CHOICE_PROMPT_OPEN_EVENT } from "./verification";
import { ReferralManifestDesk } from "./referralManifestDesk";
export class ReferralManifestBoard {
 private view?:ReferralManifestDesk;
 private evidenceAvailable=false;
 private manifest=initialReferralManifest();
 private message='';
 private onChange?:(manifest:ReferralManifest)=>void;
 private onApprove?:(manifest:ReferralManifest)=>void;
 constructor(private readonly scene:Phaser.Scene){scene.events.once('shutdown',()=>this.hide());}
 get active(){return this.view?.active??false;}
 show(manifest:ReferralManifest,onChange:(manifest:ReferralManifest)=>void,onApprove:(manifest:ReferralManifest)=>void,evidenceAvailable=false){
  this.hide();this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
  this.manifest={...manifest};this.onChange=onChange;this.onApprove=onApprove;this.evidenceAvailable=evidenceAvailable;
  this.message='Routing only — not release approval.';
  this.view=new ReferralManifestDesk(evidenceAvailable,index=>this.changeRoute(index),()=>this.submit(),()=>this.hide());
  this.refresh();swallowNextInputFrame();
 }
 updateInput(){if(this.active)this.view!.updateInput(getInput());}
 hide(){if(!this.active)return;this.view!.close();this.view=undefined;clearChoiceState();swallowNextInputFrame();}
 private changeRoute(index:number){
  if(!this.active)return;const packet=REFERRAL_EQUITY_PACKETS[index];if(!packet)return;
  this.manifest=changeManifestRoute(this.manifest,packet.id,1);this.onChange?.({...this.manifest});
  this.message='Draft route changed — not filed.';retroAudio.annotatePaper();this.refresh();
 }
 private submit(){
  if(!this.active)return;
  if(!this.evidenceAvailable){
   this.message='Find the dispatch copy north of the equity room.';
   setLatestMessage('The draft is not its own evidence. Find the dispatch copy in the north stacks, then compare and file it here.');
   retroAudio.warning();this.refresh(true);return;
  }
  const mismatch=firstManifestMismatch(this.manifest);
  if(mismatch){
   this.message=`${REFERRAL_MANIFEST_LABELS[mismatch.id]} → ${mismatch.agency}. Revise the draft route.`;
   setLatestMessage(`${mismatch.label} has ${mismatch.agency} equity in this training batch. Correct the draft route before filing.`);
   retroAudio.warning();this.refresh(true);return;
  }
  const manifest={...this.manifest};this.hide();this.onApprove?.(manifest);
 }
 private refresh(error=false){
  this.view?.render(this.manifest,this.message,error);
  setChoiceState(REFERRAL_MANIFEST_TITLE,REFERRAL_EQUITY_PACKETS.map((packet,index)=>({key:(['A','B','C'] as const)[index],label:`${REFERRAL_MANIFEST_LABELS[packet.id]} -> ${this.manifest[packet.id]}`,value:this.manifest[packet.id]})));
 }
}
