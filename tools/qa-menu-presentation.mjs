const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out=process.env.FRUS_QA_OUT ?? '/tmp/menu-presentation';
const base=process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5173/';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--disable-audio-output']});
for(const [name,width,height,touch] of [['desktop',1280,720,false],['phone',390,844,true],['landscape',844,390,true]]){
 const page=await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch,deviceScaleFactor:touch?3:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(new URL('?scene=OfficeScene&text=full',base).href);
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='OfficeScene');
 await page.waitForTimeout(800);
 const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
 const tap=async(x,y)=>{const r=await page.locator('canvas').first().boundingBox();if(touch)await page.touchscreen.tap(r.x+x*r.width/256,r.y+y*r.height/240);else await page.mouse.click(r.x+x*r.width/256,r.y+y*r.height/240);await page.waitForTimeout(180);};
 if(touch)await tap(120,216);else {await page.keyboard.press('Escape',{delay:60});await page.waitForTimeout(180);}
 assert.equal((await state()).mode,'pause');
 for(const [x,tab] of [[32,'tools'],[80,'map'],[128,'record'],[176,'settings']]){
  await tap(x,34);assert.equal((await state()).pauseMenu.page,tab);
  await page.screenshot({path:`${out}/${name}-${tab}.png`});
 }
 await tap(224,34);assert.equal((await state()).mode,'explore');
 assert.deepEqual(errors,[]);console.log(name,'tabs, close, errors PASS');await page.close();
}
const p=await browser.newPage({viewport:{width:900,height:800}});
await p.goto(new URL('?scene=NaraStacksScene',base).href);
await p.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='NaraStacksScene');
await p.evaluate(()=>window.game.scene.getScene('NaraStacksScene').drawLocationCard());
await p.waitForTimeout(70);
await p.screenshot({path:`${out}/location.png`});
await browser.close();
