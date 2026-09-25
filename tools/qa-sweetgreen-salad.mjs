import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser=await chromium.launch({args:['--disable-audio-output']});
try { for(const touch of [false,true]) {
const p=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:720},hasTouch:touch,isMobile:touch});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.goto(new URL('?scene=ResearchWorldScene&text=full',process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5173/').href);await p.waitForFunction(()=>window.game?.scene.isActive('ResearchWorldScene'));await p.waitForTimeout(500);
const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
const tap=async(x,y)=>{const r=await p.locator('canvas').first().boundingBox();await p.touchscreen.tap(r.x+x*r.width/256,r.y+y*r.height/240);};
const act=async()=>{if(touch)await tap(225,205);else await p.keyboard.press('Space');await p.waitForTimeout(300);};
await p.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').player.setPosition(64,183));await p.waitForTimeout(200);
for(const index of [3,0,1,2]){
await act();assert.equal((await state()).mode,'choice');
await p.screenshot({path:`/tmp/salad-${touch?'phone':'desktop'}-menu.png`});
if(touch){const r=await p.evaluate(i=>{const r=window.game.scene.getScene('ResearchWorldScene').choice.rows[i].getBounds();return {x:r.centerX,y:r.centerY};},index);await tap(r.x,r.y);}else {for(let j=0;j<index;j++){await p.keyboard.press('ArrowDown');await p.waitForTimeout(90);}await p.keyboard.press('Space');}
await p.waitForTimeout(300);
if(index===3){assert.equal((await state()).sceneProgress.sweetgreenSaladsOrdered,undefined);assert.equal((await state()).mode,'explore');continue;}
assert.equal((await state()).sceneProgress.sweetgreenSaladsOrdered,index+1);assert.equal((await state()).sceneProgress.sweetgreenPaidByJames,1);
await p.screenshot({path:`/tmp/salad-${touch?'phone':'desktop'}-receipt.png`});
for(let i=0;i<15&&(await state()).mode==='dialog';i++)await act();assert.equal((await state()).mode,'explore');
}
const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));assert.equal(saved.state.sceneProgress.sweetgreenSaladsOrdered,3);assert.equal(saved.state.sceneProgress.sweetgreenLastSalad,3);assert.deepEqual(errors,[]);console.log(JSON.stringify({touch,orders:3,cancel:true,saved:true,errors}));await p.close();
}}finally{await browser.close();}
