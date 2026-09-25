import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out='/tmp/photocopier-art';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--disable-audio-output']});
try {
 for(const mobile of [false,true]) {
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:5211/?scene=ArchiveScene');
  await page.waitForFunction(()=>window.game?.scene.getScene('ArchiveScene').bureaucraticWalls?.length>0);
  await page.waitForTimeout(500);
  const state=await page.evaluate(()=>{
   const s=window.game.scene.getScene('ArchiveScene');
   return s.bureaucraticWalls.map(w=>({key:w.stone.texture.key,width:w.stone.displayWidth,height:w.stone.displayHeight,bounds:[w.bounds.width,w.bounds.height],source:w.stone.texture.getSourceImage().width,label:w.container.list.find(c=>c.name==='bureaucratic-wall-label').text}));
  });
  for(const w of state){assert(w.key.startsWith('photocopier-cabinet-v2-'));assert.equal(w.width,32);assert.equal(w.height,32);assert.equal(w.source,128);assert.deepEqual(w.bounds,[30,34]);assert(w.label.length);}
  await page.screenshot({path:`${out}/${mobile?'phone':'desktop'}.png`});
  const hit=await page.evaluate(()=>{const w=window.game.scene.getScene('ArchiveScene').bureaucraticWalls[0];w.markHit();w.update(w.container.scene.time.now,16);return {crack:w.crack.visible,tinted:w.stone.isTinted};});
  assert(hit.crack&&hit.tinted);
  await page.screenshot({path:`${out}/${mobile?'phone':'desktop'}-hit.png`});
  await page.evaluate(()=>window.game.scene.getScene('ArchiveScene').bureaucraticWalls[0].clear());
  await page.waitForTimeout(400);
  assert(await page.evaluate(()=>window.game.scene.getScene('ArchiveScene').bureaucraticWalls[0].isCleared));
  assert.deepEqual(errors,[]);console.log(JSON.stringify({mobile,walls:state.length,hit,cleared:true,errors}));await page.close();
 }
}finally{await browser.close();}
