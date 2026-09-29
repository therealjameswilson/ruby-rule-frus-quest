import type Phaser from "phaser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BindingCertificationBoard } from "./bindingCertificationBoard";
import { bindPointerDown, getInput, swallowNextInputFrame, type InputState } from "../input/InputState";
import { gameState, resetGameState } from "../game/state";
import type { BindingCertificationEvidence } from "../game/bindingCertification";
import { cloneInitialDocumentCandidates } from "../game/documentWorkflow";
import { EDITORIAL_REPAIR_RECORDS } from "../game/editorialRepair";

vi.mock("phaser", () => ({ default: { Display: { Color: { HexStringToColor: () => ({ color: 0 }) } } } }));
vi.mock("../input/InputState", () => ({ bindPointerDown: vi.fn(), getInput: vi.fn(() => ({})), swallowNextInputFrame: vi.fn() }));
vi.mock("./audio", () => ({ retroAudio: { warning: vi.fn() } }));

const view=vi.hoisted(()=>({seal:()=>{},leave:()=>{},render:vi.fn(),input:vi.fn(),close:vi.fn()}));
vi.mock("./bindingCertificationDesk",()=>({BindingCertificationDesk:class{
 active=true;
 constructor(seal:()=>void,leave:()=>void){Object.assign(view,{seal,leave});}
 render(...args:unknown[]){view.render(...args);}
 updateInput(input:unknown){view.input(input);}
 close(){this.active=false;view.close();}
}}));
function fixture() {
 const scene={events:{emit:vi.fn(),once:vi.fn()}};
 const board=new BindingCertificationBoard(scene as unknown as Phaser.Scene);
 const evidence:BindingCertificationEvidence={documents:5,proofed:5,equities:2,resolved:2,hiddenCuts:0,unresolved:0,ready:true};
 const onSeal=vi.fn(),onCancel=vi.fn(),pointer=(i:number)=>i===0?view.seal():view.leave();
 return{board,evidence,onSeal,onCancel,pointer,scene};
}
beforeEach(() => { resetGameState(); vi.clearAllMocks(); vi.mocked(getInput).mockReturnValue({} as InputState); });

describe("bindery human standards board", () => {
  it.each([false, true])("points a blocked seal toward its next repair station (draft filed: %s)", draftFiled => {
    const { board, evidence, onSeal, onCancel, pointer } = fixture();
    const document = cloneInitialDocumentCandidates().find(candidate => candidate.id === "source_note_047")!;
    document.workflowState = "proofed";
    document.undisclosedDeletion = true;
    if (draftFiled) document.editorialRepair = { indication: EDITORIAL_REPAIR_RECORDS[0].indication, style: "italic", status: "draft" };
    gameState.documentCandidates = [document];
    evidence.ready = false; evidence.hiddenCuts = 1;
    board.show(() => evidence, onSeal, onCancel);
    const hint = draftFiled ? "WEST EXIT -> PROOF TABLE" : "WEST EXIT -> EDITOR DESK";
    expect(view.render).toHaveBeenLastCalledWith(evidence,hint,false);
    pointer(0);
    expect(gameState.latestMessage).toContain(hint);
    expect(document.undisclosedDeletion).toBe(true);
    expect(onSeal).not.toHaveBeenCalled();
  });

  it("opens with live evidence and swallows the delivery action", () => {
    const { board, evidence, onSeal, onCancel } = fixture();
    board.show(() => evidence, onSeal, onCancel);
    expect(board.active).toBe(true);
    expect(view.render).toHaveBeenCalledWith(evidence,expect.any(String),false);
    expect(swallowNextInputFrame).toHaveBeenCalledOnce();
    expect(onSeal).not.toHaveBeenCalled();
  });

  it("seals once on an actual confirmation, not on construction or a hidden tap", () => {
    const { board, evidence, onSeal, onCancel, pointer } = fixture();
    expect(onSeal).not.toHaveBeenCalled();
    board.show(() => evidence, onSeal, onCancel);
    vi.mocked(getInput).mockReturnValue({ aJustPressed: true } as InputState);
    board.updateInput();
    pointer(0);
    expect(onSeal).toHaveBeenCalledOnce();
    expect(board.active).toBe(false);
    expect(swallowNextInputFrame).toHaveBeenCalledTimes(2);
  });

  it("rechecks evidence at a touch seal and leaves the panel open when work is unresolved", () => {
    const { board, evidence, onSeal, onCancel, pointer } = fixture();
    board.show(() => evidence, onSeal, onCancel);
    evidence.hiddenCuts = 1; evidence.ready = false;
    pointer(0);
    expect(onSeal).not.toHaveBeenCalled();
    expect(board.active).toBe(true);
    expect(view.render).toHaveBeenLastCalledWith(evidence,expect.any(String),true);
    expect(gameState.latestMessage).toContain("cannot clear");
  });

  it("supports touch return and B/cancel without granting progress or leaking input", () => {
    const { board, evidence, onSeal, onCancel, pointer } = fixture();
    board.show(() => evidence, onSeal, onCancel);
    pointer(1);
    expect(onCancel).toHaveBeenCalledOnce();
    board.show(() => evidence, onSeal, onCancel);
    vi.mocked(getInput).mockReturnValue({ bJustPressed: true, aJustPressed: true } as InputState);
    view.leave();
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onSeal).not.toHaveBeenCalled();
    expect(board.active).toBe(false);
  });

  it("delegates native input and cleans up on scene shutdown without sealing",()=>{
    const f=fixture();f.board.show(()=>f.evidence,f.onSeal,f.onCancel);f.board.updateInput();
    expect(view.input).toHaveBeenCalled();f.scene.events.once.mock.calls[0][1]();
    expect(f.board.active).toBe(false);expect(gameState.currentChoice).toBeNull();
    expect(f.onSeal).not.toHaveBeenCalled();expect(f.onCancel).not.toHaveBeenCalled();
  });
});
