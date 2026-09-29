import type Phaser from "phaser";
import { clearChoiceState, setChoiceState, setLatestMessage } from "../game/state";
import { WITHHOLDING_CHRONOLOGY_TITLE, WITHHOLDING_EVIDENCE, restoreWithholdingSlot,
  shiftWithholdingSlot, validateWithholdingEntry, withholdingSequence, type WithholdingSlot } from "../game/withholdingChronology";
import { getInput, swallowNextInputFrame } from "../input/InputState";
import { retroAudio } from "./audio";
import { CHOICE_PROMPT_OPEN_EVENT } from "./verification";
import { ChronologyDesk } from "./chronologyDesk";

export interface ChronologyBoardCase {
  title: string;
  heading: string;
  evidence: readonly [string, string, string, string, string];
  initialMessage: string;
  restore: (value: number | undefined) => WithholdingSlot;
  shift: (slot: WithholdingSlot, direction: -1 | 1) => WithholdingSlot;
  sequence: (slot: WithholdingSlot) => ReadonlyArray<{ id: string; label: string; date: string; time: string }>;
  validate: (slot: number) => { ok: boolean; message: string };
}

export class ChronologyBoard {
  private view?:ChronologyDesk;
  private slot:WithholdingSlot=0;
  private message='';
  private onChange?:(slot:WithholdingSlot)=>void;
  private onApprove?:(slot:WithholdingSlot)=>void;
  constructor(private readonly scene:Phaser.Scene,private readonly task:ChronologyBoardCase){
    scene.events.once('shutdown',()=>this.hide());
  }
  get active(){return this.view?.active??false;}
  show(slot:number|undefined,onChange:(slot:WithholdingSlot)=>void,onApprove:(slot:WithholdingSlot)=>void){
    this.hide();
    this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
    this.slot=this.task.restore(slot);this.onChange=onChange;this.onApprove=onApprove;
    this.message=slot===undefined||!this.slot?this.task.initialMessage:'Draft kept — not filed.';
    this.view=new ChronologyDesk(this.task,direction=>this.shift(direction),()=>this.submit(),()=>this.hide());
    this.refresh();swallowNextInputFrame();
  }
  updateInput(){if(this.active)this.view!.updateInput(getInput());}
  hide(){
    if(!this.active)return;
    this.view!.close();this.view=undefined;clearChoiceState();swallowNextInputFrame();
  }
  private shift(direction:-1|1){
    if(!this.active)return;
    const next=this.task.shift(this.slot,direction);
    if(next!==this.slot){this.slot=next;this.onChange?.(next);retroAudio.turnPaper();}
    this.message=this.slot?'Draft edited — not filed.':this.task.initialMessage;
    this.refresh();
  }
  private submit(){
    if(!this.active)return;
    const result=this.task.validate(this.slot);
    if(!result.ok){this.message=result.message;this.refresh(true);setLatestMessage(result.message.replace("\n","; "));retroAudio.warning();return;}
    this.hide();this.onApprove?.(this.slot);
  }
  private refresh(error=false){
    const records=this.task.sequence(this.slot);this.view?.render(records,this.message,error);
    setChoiceState(this.task.title,records.map((record,index)=>({key:(["A","B","C"] as const)[index],label:`${record.label} ${record.date} ${record.time}`,value:record.id})));
  }
}

export class WithholdingChronologyBoard extends ChronologyBoard {
  constructor(scene: Phaser.Scene) {
    super(scene, {
      title: WITHHOLDING_CHRONOLOGY_TITLE, heading: "WITHHOLDING LEDGER",
      evidence: [WITHHOLDING_EVIDENCE.heading, WITHHOLDING_EVIDENCE.drafted,
        WITHHOLDING_EVIDENCE.sourceNote, WITHHOLDING_EVIDENCE.pages, WITHHOLDING_EVIDENCE.clock],
      initialMessage: "WITHHELD ENTRY MISSING", restore: restoreWithholdingSlot,
      shift: shiftWithholdingSlot, sequence: withholdingSequence, validate: validateWithholdingEntry
    });
  }
}
