import type Phaser from "phaser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReleaseScopeBoard } from "./releaseScopeBoard";
import { getInput } from "../input/InputState";
import { gameState, resetGameState } from "../game/state";

vi.mock("phaser", () => ({ default: { Display: { Color: { HexStringToColor: () => ({ color: 0 }) } } } }));
vi.mock("../input/InputState", () => ({ bindPointerDown: vi.fn(), getInput: vi.fn(() => ({})), swallowNextInputFrame: vi.fn() }));
vi.mock("./audio", () => ({ retroAudio: { warning: vi.fn(), blip: vi.fn() } }));
const view=vi.hoisted(()=>({toggle:(_part:0|1|2)=>{},file:()=>{},leave:()=>{},render:vi.fn(),input:vi.fn(),close:vi.fn()}));
vi.mock("./releaseScopeDesk",()=>({ReleaseScopeDesk:class{
 active=true;
 constructor(toggle:typeof view.toggle,file:()=>void,leave:()=>void){Object.assign(view,{toggle,file,leave});}
 render(...args:unknown[]){view.render(...args);}
 updateInput(input:unknown){view.input(input);}
 close(){this.active=false;view.close();}
}}));
function fixture() {
 const scene={events:{emit:vi.fn(),once:vi.fn()}};
 const board=new ReleaseScopeBoard(scene as unknown as Phaser.Scene);
 const change=vi.fn(),file=vi.fn();
 const tap=(index:number)=>index===3?view.file():view.toggle(index as 0|1|2);
 return {board,change,file,tap,scene};
}
beforeEach(() => { resetGameState(); vi.clearAllMocks(); });
describe("release-scope marking controls", () => {
  it("rejects all and none, then files only the excerpt without automatic approval", () => {
    const f = fixture(); f.board.show(undefined, f.change, f.file);
    f.tap(3); expect(f.file).not.toHaveBeenCalled();
    f.tap(0); f.tap(1); f.tap(2); f.tap(3);
    expect(gameState.latestMessage).toBe("KEEP THE CLEARED EXCERPT");
    expect(f.file).not.toHaveBeenCalled();
    f.tap(1); expect(f.change).toHaveBeenLastCalledWith(2);
    expect(f.file).not.toHaveBeenCalled();
    f.tap(3); expect(f.file).toHaveBeenCalledExactlyOnceWith(2);
    f.tap(0); f.tap(3); expect(f.file).toHaveBeenCalledOnce();
  });
  it("restores an unfiled draft and delegates native input",()=>{
    const f=fixture();f.board.show(6,f.change,f.file);
    expect(gameState.currentChoice?.options.map(option=>option.value)).toEqual(["hold","print","print"]);
    f.board.updateInput();expect(view.input).toHaveBeenCalled();
    f.tap(2);expect(f.change).toHaveBeenCalledWith(2);
    expect(f.file).not.toHaveBeenCalled();f.tap(3);expect(f.file).toHaveBeenCalledExactlyOnceWith(2);
  });
  it("leaves without editing or filing",()=>{
    const f=fixture();f.board.show(2,f.change,f.file);view.leave();
    expect(f.board.active).toBe(false);expect(gameState.currentChoice).toBeNull();
    expect(f.change).not.toHaveBeenCalled();expect(f.file).not.toHaveBeenCalled();
  });
  it("cleans up on shutdown and replaces old desks",()=>{
    const f=fixture();f.board.show(7,f.change,f.file);f.board.show(2,f.change,f.file);
    expect(view.close).toHaveBeenCalledOnce();f.scene.events.once.mock.calls[0][1]();
    expect(view.close).toHaveBeenCalledTimes(2);expect(f.board.active).toBe(false);
  });
});
