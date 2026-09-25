import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const b=await chromium.launch({args:['--disable-audio-output']});try{
const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.goto('http://127.0.0.1:5211/?scene=ArchiveScene');await p.waitForFunction(()=>window.game?.scene.isActive('ArchiveScene'));await p.mouse.click(500,400);await p.waitForFunction(()=>window.rubyRuleAudioDebug?.().musicTimerActive);
const samples=[];for(let cycle=0;cycle<3;cycle++){
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await p.waitForFunction(()=>window.rubyRuleAudioDebug().contextState==='suspended');let a=await p.evaluate(()=>window.rubyRuleAudioDebug());assert.equal(a.musicTimerActive,false);assert.equal(a.ambienceSources,0);samples.push({cycle,phase:'hidden',...a});
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await p.waitForFunction(()=>window.rubyRuleAudioDebug().musicTimerActive&&window.rubyRuleAudioDebug().contextState==='running');
 a=await p.evaluate(()=>window.rubyRuleAudioDebug());assert.equal(a.currentSceneKey,'ArchiveScene');assert.equal(a.hiddenPaused,false);samples.push({cycle,phase:'visible',...a});
 await p.locator('#tap-resume-overlay').click();await p.waitForTimeout(150);
}
assert.deepEqual(errors,[]);await p.screenshot({path:'/tmp/audio-visibility-game.png'});console.log(JSON.stringify({cycles:3,samples:samples.map(s=>({cycle:s.cycle,phase:s.phase,context:s.contextState,music:s.musicTimerActive,ambience:s.ambienceSources})),errors}));
}finally{await b.close();}
