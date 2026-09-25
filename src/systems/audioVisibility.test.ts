import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('../game/state',()=>({setAudioStatus:vi.fn()}));
vi.mock('../input/InputState',()=>({addInputGestureListener:vi.fn()}));
let audio:typeof import('./audio').retroAudio;
let hidden=false;
beforeEach(async()=>{vi.resetModules();hidden=false;vi.stubGlobal('window',{AudioContext:class{},addEventListener:vi.fn()});vi.stubGlobal('document',{get hidden(){return hidden;},addEventListener:vi.fn()});audio=(await import('./audio')).retroAudio;});
afterEach(()=>vi.unstubAllGlobals());
it('does not restart music when a pending visible resume finishes after hiding again',async()=>{
 let finish!:()=>void;
 const context={addEventListener:vi.fn(),state:'suspended',resume:vi.fn(()=>new Promise<void>(resolve=>{finish=()=>{context.state='running';resolve();};})),suspend:vi.fn(async()=>{context.state='suspended';})};
 const runtime=audio as unknown as {context:typeof context;hiddenPaused:boolean;currentSceneKey:string;handleVisible():Promise<void>};
 runtime.context=context;runtime.hiddenPaused=true;runtime.currentSceneKey='ArchiveScene';
 const start=vi.spyOn(audio,'startMusic').mockImplementation(()=>{});const pending=runtime.handleVisible();hidden=true;finish();await pending;
 expect(start).not.toHaveBeenCalled();expect(context.suspend).toHaveBeenCalled();expect(runtime.hiddenPaused).toBe(true);
});
it('remembers a hidden room request without preparing or starting playback',()=>{
 hidden=true;const prepare=vi.spyOn(audio,'prepare').mockImplementation(()=>{});audio.startMusic('OfficeScene');audio.startMusic('ArchiveScene');
 expect(prepare).not.toHaveBeenCalled();expect(audio.getDebugState()).toMatchObject({currentSceneKey:'ArchiveScene',pendingSceneKey:'ArchiveScene',musicTimerActive:false,hiddenPaused:true});
});
it('does not restart an interrupted context while hidden',()=>{
 hidden=true;const context={state:'running',suspend:vi.fn(async()=>{})};
 const runtime=audio as unknown as {context:typeof context;resumePending:boolean;lastContextState:string;handleContextStateChange():void};
 runtime.context=context;runtime.resumePending=true;runtime.lastContextState='interrupted';
 const start=vi.spyOn(audio,'startMusic').mockImplementation(()=>{});runtime.handleContextStateChange();expect(start).not.toHaveBeenCalled();expect(context.suspend).toHaveBeenCalled();
});
it('does not unlock audio from an input arriving while hidden',async()=>{
 hidden=true;const prepare=vi.spyOn(audio,'prepare');expect(await audio.unlock()).toBe(false);expect(prepare).not.toHaveBeenCalled();
});
it('honors muting while visible resume is still pending',async()=>{
 let finish!:()=>void;
 const context={addEventListener:vi.fn(),state:'suspended',resume:vi.fn(()=>new Promise<void>(resolve=>{finish=()=>{context.state='running';resolve();};}))};
 const runtime=audio as unknown as {context:typeof context;hiddenPaused:boolean;currentSceneKey:string;handleVisible():Promise<void>};
 runtime.context=context;runtime.hiddenPaused=true;runtime.currentSceneKey='ArchiveScene';
 const start=vi.spyOn(audio,'startMusic').mockImplementation(()=>{});const pending=runtime.handleVisible();audio.toggle();finish();await pending;
 expect(start).not.toHaveBeenCalled();expect(audio.isEnabled).toBe(false);
});
