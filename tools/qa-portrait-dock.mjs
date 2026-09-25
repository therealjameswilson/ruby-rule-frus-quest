import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/portrait-dock';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--disable-audio-output']});
const errors=[];const results={};
try{
const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});p.on('pageerror',e=>errors.push(String(e)));
await p.addInitScript(()=>{window.qaPad={connected:false,index:0,id:'Dock test controller',mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>window.qaPad.connected?[window.qaPad]:[]});});
await p.goto('http://127.0.0.1:5211/?scene=OfficeScene&text=full');await p.waitForFunction(()=>window.game?.scene.isActive('OfficeScene'));await p.waitForTimeout(600);
const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
const dock=p.locator('#portrait-touch-dock');const pad=p.locator('.portrait-dpad');const center=async locator=>{const r=await locator.boundingBox();assert(r);return{x:r.x+r.width/2,y:r.y+r.height/2};};
const cdp=await p.context().newCDPSession(p);const touch=async(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map((v,i)=>({...v,id:v.id??i+1}))});
const stop=()=>touch('touchEnd',[]);const tap=async key=>{const c=await center(p.locator(`[data-control="${key}"]`));await p.touchscreen.tap(c.x,c.y);await p.waitForTimeout(200);};
assert(await dock.isVisible());const room=await p.locator('canvas').first().boundingBox(),box=await dock.boundingBox();assert(box.y>=room.y+room.height+10);assert(box.y+box.height<=844-4);assert(Math.abs((room.y+box.y+box.height)/2-422)<1,"Game and dock must be centered together");assert((await p.locator('[data-control=start]').boundingBox()).height>=44);
const scene=()=>p.evaluate(()=>window.game.scene.getScene('OfficeScene').player.position);
// Position fixture puts the hero on an unobstructed corridor; all actions use real touch events.
await p.evaluate(()=>window.game.scene.getScene('OfficeScene').player.setPosition(128,182));
const c=await center(pad);const right={x:c.x+42,y:c.y,id:1};let initial=await scene();await touch('touchStart',[right]);await p.waitForTimeout(150);assert((await scene()).x>initial.x+3);
const b=await center(p.locator('[data-control=b]'));await touch('touchStart',[right,{...b,id:2}]);await p.waitForTimeout(35);assert(await p.locator('[data-control=b]').evaluate(e=>e.classList.contains('pressed')));assert.equal(await pad.getAttribute('data-direction'),'right');
await touch('touchEnd',[right]);await touch('touchMove',[{x:c.x,y:c.y-42,id:1}]);await p.waitForTimeout(80);assert.equal(await pad.getAttribute('data-direction'),'up');await touch('touchMove',[{...c,id:1}]);await p.waitForTimeout(100);assert.equal(await pad.getAttribute('data-direction'),'');await stop();
await p.waitForTimeout(130);const stopped=await scene();await p.waitForTimeout(150);assert.deepEqual(await scene(),stopped);results.multitouchAndDeadzone=true;
await tap('start');assert((await state()).pauseMenu);await tap('start');assert.equal((await state()).pauseMenu,null);results.menuToggle=true;
await touch('touchStart',[right]);await p.waitForTimeout(50);await p.evaluate(()=>window.dispatchEvent(new Event('blur')));await p.waitForTimeout(160);const blurred=await scene();await p.waitForTimeout(150);assert.deepEqual(await scene(),blurred);await stop();await p.evaluate(()=>window.dispatchEvent(new Event('focus')));results.blurStops=true;
await touch('touchStart',[right]);await p.waitForTimeout(40);await p.setViewportSize({width:844,height:390});await p.waitForTimeout(300);assert(!await dock.isVisible());assert.equal(await p.evaluate(()=>window.rubyRuleTouchControls.portraitDocked),false);await stop();const rotated=await scene();await p.waitForTimeout(150);assert.deepEqual(await scene(),rotated);await p.screenshot({path:`${out}/landscape.png`});results.rotationStops=true;
await p.setViewportSize({width:390,height:844});await p.waitForTimeout(300);assert(await dock.isVisible());const c2=await center(pad);await touch('touchStart',[{x:c2.x+42,y:c2.y,id:1}]);await p.waitForTimeout(40);await p.evaluate(()=>window.qaPad.connected=true);await p.waitForTimeout(350);assert(!await dock.isVisible());await stop();const controllerStop=await scene();await p.waitForTimeout(120);assert.deepEqual(await scene(),controllerStop);await p.evaluate(()=>window.qaPad.connected=false);await p.waitForTimeout(350);assert(await dock.isVisible());results.controllerHandoff=true;
await p.screenshot({path:`${out}/portrait.png`});
for(const [width,height,expected] of [[375,667,false],[320,900,true]]){await p.setViewportSize({width,height});await p.waitForTimeout(350);assert.equal(await dock.isVisible(),expected);if(expected){const padBox=await pad.boundingBox(),menuBox=await p.locator('[data-control=start]').boundingBox();assert(padBox.x+padBox.width<=menuBox.x||padBox.y+padBox.height<=menuBox.y);await p.screenshot({path:`${out}/narrow.png`});}}results.smallScreenFallback=true;
// Earned boss-entry save verifies the second finger performs a real attack.
const combatContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,storageState:process.env.FRUS_QA_STORAGE??'/tmp/frus-campaign-a316292/12-earned-production/earned-storage.json'});
const combat=await combatContext.newPage();combat.on('pageerror',e=>errors.push(String(e)));await combat.goto('http://127.0.0.1:5211/?text=full');await combat.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));
const canvas=await combat.locator('canvas').first().boundingBox();await combat.touchscreen.tap(canvas.x+86*canvas.width/256,canvas.y+154*canvas.height/240);await combat.waitForFunction(()=>window.game.scene.isActive('BlackVaultLairScene'));await combat.waitForTimeout(500);
const combatState=()=>combat.evaluate(()=>JSON.parse(window.render_game_to_text()));
const cp=await center(combat.locator('.portrait-dpad')),cb=await center(combat.locator('[data-control=b]'));const combatCdp=await combat.context().newCDPSession(combat);
const before=await combatState();const finger={x:cp.x,y:cp.y-42,id:1};await combatCdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger]});await combatCdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger,{...cb,id:2}]});await combat.waitForTimeout(100);
const during=await combatState();assert(during.player.y<before.player.y);assert(during.playerCombat.weapon.swingId>before.playerCombat.weapon.swingId);
await combatCdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[finger]});await combat.waitForTimeout(100);assert((await combatState()).player.y<during.player.y);await combatCdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await combat.screenshot({path:`${out}/combat.png`});results.realAttackWhileMoving=true;await combatContext.close();
await p.goto('http://127.0.0.1:5211/');await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));assert(!await dock.isVisible());const titleCanvas=await p.locator('canvas').first().boundingBox();assert(Math.abs(titleCanvas.y+titleCanvas.height/2-450)<1,'Title must regain vertical centering without dock');results.titleHidden=true;assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({...results,errors,limitations:['Simulated Chromium touch; no physical iPhone','Player position fixture used for clear movement corridor']},null,2));console.log(results);
}finally{await browser.close();}
