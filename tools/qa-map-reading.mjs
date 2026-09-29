import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5233/';
const out=process.env.FRUS_QA_OUT??'/tmp/frus-map-reading';
await mkdir(out,{recursive:true});
const browser=await chromium.launch(),rows=[],errors=[];
try{
 for(const [layout,width,height] of [['phone',375,667],['small',320,568],['landscape',844,390],['desktop',1024,960]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:layout!=='desktop'});
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(new URL('?scene=GameplayMapScene&map=frus_floor',base).href);
 await page.waitForFunction(()=>window.game?.scene.isActive('GameplayMapScene'));
 await page.waitForTimeout(900);
 const triggers=await page.evaluate(()=>window.game.scene.getScene('GameplayMapScene').triggerZones.map(t=>({label:t.label,text:t.text})));
 for(const t of triggers){
 await page.evaluate(t=>window.game.scene.getScene('GameplayMapScene').showMapDialog(t.label,t.text),t);
 await page.waitForTimeout(260);
 assert.equal(await page.locator('.map-reading-desk [data-explanation]').textContent(),Array.isArray(t.text)?t.text[0]:t.text);
 const snapshot=await page.evaluate(()=>{
 const root=document.querySelector('.map-reading-desk'),title=root.querySelector('h1'),leave=root.querySelector('[data-focus-key=leave]');
 const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
 return{title:box(title),leave:box(leave),buttons:[...root.querySelectorAll('button:not([hidden])')].map(box),mode:JSON.parse(window.render_game_to_text()).mode};
 });
 assert.equal(snapshot.mode,'dialog');assert(snapshot.buttons.every(b=>b.height>=44));
 assert(snapshot.title.y>=snapshot.leave.y+snapshot.leave.height || snapshot.title.x+snapshot.title.width<=snapshot.leave.x || snapshot.title.y+snapshot.title.height<=snapshot.leave.y,'Title and Return overlap');
 await page.screenshot({path:`${out}/${layout}-${t.label.replaceAll(' ','-')}.png`});
 await page.locator('[data-focus-key=continue]').tap();
 assert.equal(await page.locator('.map-reading-desk').count(),0);
 rows.push({layout,label:t.label});
 }
 // Actual trigger handler opens the production lesson; positioning is a fixture.
 await page.evaluate(()=>{const s=window.game.scene.getScene('GameplayMapScene'),t=s.triggerZones[0];t.fired=false;s.player.setPosition(t.rect.centerX,t.rect.centerY);s.handleTriggers();});
 await page.waitForSelector('.map-reading-desk');
 const before=await page.evaluate(()=>JSON.parse(window.render_game_to_text()).player);
 await page.keyboard.press('ArrowRight');await page.waitForTimeout(150);
 assert.deepEqual(await page.evaluate(()=>JSON.parse(window.render_game_to_text()).player),before);
 await page.keyboard.press('Escape');assert.equal(await page.locator('.map-reading-desk').count(),0);
 // Multi-page map conversations can be reread and closed by controller input.
 await page.evaluate(()=>window.game.scene.getScene('GameplayMapScene').showMapDialog('Archive Guide',['First source note.','Second source note.']));
 await page.keyboard.press('Enter');assert.equal(await page.locator('[data-explanation]').textContent(),'Second source note.');
 await page.locator('[data-focus-key=previous]').tap();assert.equal(await page.locator('[data-explanation]').textContent(),'First source note.');
 await page.evaluate(()=>{const d=window.game.scene.getScene('GameplayMapScene').mapReadingDesk;d.updateInput({});d.updateInput({bJustPressed:true});});
 assert.equal(await page.locator('.map-reading-desk').count(),0);
 await page.evaluate(()=>window.game.scene.getScene('GameplayMapScene').showMapDialog('Cleanup','Close on scene restart.'));
 await page.evaluate(()=>window.game.scene.getScene('GameplayMapScene').scene.restart({mapKey:'frus_floor'}));
 await page.waitForTimeout(300);assert.equal(await page.locator('.map-reading-desk').count(),0);
 await page.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({scope:'20 real map-text presentation cases plus trigger/input/lifecycle fixtures; no earned progression',rows,errors},null,2));console.log(JSON.stringify({cases:rows.length,errors}));
}finally{await browser.close();}
