import { afterEach, expect, it, vi } from "vitest";
import { getPrimaryActionBadge, getSecondaryActionBadge, resetInput, tickInput, getInput, swallowNextInputFrame } from "./InputState";

afterEach(() => {
  vi.unstubAllGlobals();
  resetInput();
  tickInput();
});

it("uses controller labels on connection and restores keyboard labels on disconnect", () => {
  const pad = { connected: true, index: 0, id: "QA controller", axes: [0, 0], buttons: [] };
  vi.stubGlobal("window", {});
  vi.stubGlobal("navigator", { maxTouchPoints: 0, getGamepads: () => [pad] });
  resetInput();
  tickInput();
  expect(getPrimaryActionBadge()).toBe("A");
  expect(getSecondaryActionBadge()).toBe("B");
  pad.connected = false;
  tickInput();
  expect(getPrimaryActionBadge()).toBe("Z");
  expect(getSecondaryActionBadge()).toBe("X");
});

it("keeps touch labels after a controller disconnects on a phone", () => {
  vi.stubGlobal("window", {});
  vi.stubGlobal("navigator", { maxTouchPoints: 5, getGamepads: () => [] });
  resetInput();
  tickInput();
  expect(getPrimaryActionBadge()).toBe("A");
  expect(getSecondaryActionBadge()).toBe("B");
});


it.each([0,1,9])("requires held controller button %s to release after an overlay closes", index => {
  const pad={connected:true,index:0,id:"QA controller",axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};
  vi.stubGlobal("window",{});
  vi.stubGlobal("navigator",{maxTouchPoints:0,getGamepads:()=>[pad]});
  resetInput();tickInput();
  pad.buttons[index].pressed=true;tickInput();
  const edge=()=>index===0?getInput().aJustPressed:index===1?getInput().bJustPressed:getInput().startJustPressed;
  expect(edge()).toBe(true);
  swallowNextInputFrame();tickInput();tickInput();tickInput();
  expect(edge()).toBe(false);
  pad.buttons[index].pressed=false;tickInput();
  pad.buttons[index].pressed=true;tickInput();
  expect(edge()).toBe(true);
});
