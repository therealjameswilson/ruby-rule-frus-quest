import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser=await chromium.launch({args:['--disable-audio-output']});
try { for(const touch of [false,true]) {
const p=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:720},hasTouch:touch,isMobile:touch});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.goto(new URL('?scene=ResearchWorldScene&text=full',process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5173/').href);await p.waitForFunction(()=>window.game?.scene.isActive('ResearchWorldScene'));await p.waitForTimeout(500);
const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
const labels=await p.evaluate(()=>{const s=window.game.scene.getScene('ResearchWorldScene');return ['sweetgreen-order-label','sweetgreen-james-label'].map(name=>{const o=s.children.getByName(name),r=o.getBounds();return {name,visible:o.visible,left:r.left,bottom:r.bottom};});});
assert(labels.every(l=>l.visible));assert(labels[0].bottom<145,'Ordering sign stays above the storefront');assert(labels[1].left>82,'James name clears the movement pad');
await p.screenshot({path:`/tmp/salad-${touch?'phone':'desktop'}-world.png`});

const tap=async(x,y)=>{const r=await p.locator('canvas').first().boundingBox();await p.touchscreen.tap(r.x+x*r.width/256,r.y+y*r.height/240);};
const act=async()=>{if(touch)await tap(225,205);else await p.keyboard.press('Space');await p.waitForTimeout(300);};
await p.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').player.setPosition(64,183));await p.waitForTimeout(200);
// Back and the visible close button cancel without placing an order.
for(const method of ['back','close']) {
 await act();assert.equal((await state()).mode,'choice');
 if(method==='back'){if(touch)await tap(174,216);else await p.keyboard.press('Escape');}
 else {if(touch)await tap(232,36);else {const r=await p.locator('canvas').first().boundingBox();await p.mouse.click(r.x+232*r.width/256,r.y+36*r.height/240);}}
 await p.waitForTimeout(300);assert.equal((await state()).mode,'explore');assert.equal((await state()).sceneProgress.sweetgreenSaladsOrdered,undefined);
}
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
