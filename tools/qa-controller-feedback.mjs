import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/controller-feedback';await mkdir(out,{recursive:true});
const browser=await chromium.launch();const results=[];
try {for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{window.pulses=[];window.resets=0;window.qaPad={connected:true,index:0,id:'Feedback QA pad',mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0})),vibrationActuator:{playEffect:async(type,pulse)=>{window.pulses.push({type,...pulse});return 'complete';},reset:async()=>{window.resets++;return 'complete';}}};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.qaPad]});});
 await page.goto(new URL('?scene=ResearchWorldScene&text=full',process.env.FRUS_QA_URL??'http://127.0.0.1:5211/').href);await page.waitForFunction(()=>window.game?.scene.isActive('ResearchWorldScene'));await page.waitForTimeout(500);
 const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
 const button=async i=>{await page.evaluate(i=>window.qaPad.buttons[i].pressed=true,i);await page.waitForTimeout(80);await page.evaluate(i=>window.qaPad.buttons[i].pressed=false,i);await page.waitForTimeout(100);};
 const hit=()=>page.evaluate(()=>{const p=window.game.scene.getScene('ResearchWorldScene').player;p.invulnerableUntil=0;p.takeHit({x:p.position.x-10,y:p.position.y},16);});
 // A genuine analog direction establishes controller ownership without a button press.
 await page.evaluate(()=>window.qaPad.axes[0]=.7);await page.waitForTimeout(80);await page.evaluate(()=>window.qaPad.axes[0]=0);await hit();
 assert.deepEqual(await page.evaluate(()=>window.pulses),[{type:'dual-rumble',duration:180,startDelay:0,weakMagnitude:.3,strongMagnitude:.6}]);
 await button(9);assert((await state()).pauseMenu);assert((await page.evaluate(()=>window.resets))>=1,'Pause resets the actuator');
 const tap=async id=>{const c=(await state()).pauseMenu.controls.find(c=>c.id===id);assert(c,id);const box=await page.locator('canvas').first().boundingBox();const x=box.x+c.x*box.width/256,y=box.y+c.y*box.height/240;if(mobile)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await page.waitForTimeout(120);};
 await tap('settings');await page.screenshot({path:`${out}/${mobile?'phone':'desktop'}-settings.png`});
 if(mobile)await tap('setting-4');else{for(let i=0;i<4;i++)await button(13);await button(0);}assert.equal(await page.evaluate(()=>localStorage.getItem('ruby-rule.controllerVibration')),'false');
 await button(9);await button(15);await hit();assert.equal(await page.evaluate(()=>window.pulses.length),1,'Opt-out suppresses damage pulse');
 await page.reload();await page.waitForFunction(()=>window.game?.scene.isActive('ResearchWorldScene'));await button(15);await hit();assert.equal(await page.evaluate(()=>window.pulses.length),0,'Opt-out survives reload');
 await button(9);await tap('settings');await tap('setting-4');await button(9);await button(15);await hit();assert.equal(await page.evaluate(()=>window.pulses.length),1,'Re-enabled feedback');
 await page.keyboard.press('ArrowRight');await hit();assert.equal(await page.evaluate(()=>window.pulses.length),1,'Keyboard handoff does not rumble');
 await button(15);await hit();assert.equal(await page.evaluate(()=>window.pulses.length),2);
 const before=await page.evaluate(()=>window.resets);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.evaluate(()=>window.resets),before+1);await page.waitForTimeout(200);await hit();assert.equal(await page.evaluate(()=>window.pulses.length),2,'Unfocused damage stays silent');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await hit();assert.equal(await page.evaluate(()=>window.pulses.length),3,'Focus restores feedback');
 assert.deepEqual(errors,[]);results.push({mobile,analogOwnership:true,damagePulse:true,pauseStops:true,optOutSaved:true,reEnabled:true,keyboardHandoff:true,blurStops:true,errors});await page.close();
}await writeFile(`${out}/result.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();}
