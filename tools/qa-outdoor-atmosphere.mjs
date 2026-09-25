import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/outdoor-atmosphere';await mkdir(out,{recursive:true});
const browser=await chromium.launch();
try{
 for(const mobile of [false,true]){
  const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
  await p.goto(new URL('?scene=ResearchWorldScene&text=full',process.env.FRUS_QA_URL??'http://127.0.0.1:5211/').href);await p.waitForFunction(()=>window.game?.scene.isActive('ResearchWorldScene'));await p.waitForTimeout(600);
  const read=()=>p.evaluate(()=>{const s=window.game.scene.getScene('ResearchWorldScene');return {elapsed:s.atmosphere.elapsed,count:s.children.list.filter(o=>o.name==='outdoor-atmosphere').length,depth:s.atmosphere.art.depth};});
  const before=await read();await p.waitForTimeout(350);assert((await read()).elapsed>before.elapsed);assert.equal(before.count,1);assert.equal(before.depth,-19);
  await p.screenshot({path:`${out}/${mobile?'phone':'desktop'}.png`});
  const tap=async(x,y)=>{const b=await p.locator('canvas').first().boundingBox();await p.touchscreen.tap(b.x+x*b.width/256,b.y+y*b.height/240);};
  if(mobile)await tap(120,216);else await p.keyboard.press('m',{delay:60});await p.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='pause');const paused=(await read()).elapsed;await p.waitForTimeout(350);assert.equal((await read()).elapsed,paused);
  if(mobile){const close=await p.evaluate(()=>JSON.parse(window.render_game_to_text()).pauseMenu.controls.find(c=>c.id==='close'));await tap(close.x,close.y);}else await p.keyboard.press('Escape',{delay:60});await p.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='explore');
  await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(100);const reduced=(await read()).elapsed;await p.waitForTimeout(350);assert.equal((await read()).elapsed,reduced);
  await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForTimeout(200);assert((await read()).elapsed>reduced);
  assert.deepEqual(errors,[]);const result={mobile,animated:true,paused:true,reducedMotionRespected:true,resumed:true,oneGraphicsObject:true,errors};await writeFile(`${out}/${mobile?'phone':'desktop'}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));await p.close();
 }
}finally{await browser.close();}
