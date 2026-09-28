import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const url=process.env.FRUS_QA_URL??'http://127.0.0.1:5221/';
const out=process.env.FRUS_QA_OUT??'/tmp/frus-continue-audit';await mkdir(out,{recursive:true});
const storage=JSON.parse(await readFile(process.env.FRUS_QA_STORAGE,'utf8'));
for(const entry of storage.origins)entry.origin=new URL(url).origin;
const browser=await chromium.launch();const results=[];
try{for(const mobile of [false,true]){
 const page=await browser.newPage({storageState:storage,viewport:mobile?{width:375,height:667}:{width:1280,height:720},hasTouch:mobile,isMobile:mobile});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const snapshot=()=>page.evaluate(()=>({game:window.render_game_to_text?JSON.parse(window.render_game_to_text()):null,save:JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')??'null'),active:window.game?.scene.getScenes(true).map(s=>s.scene.key)}));
 const tap=async(x,y)=>{const b=await page.locator('canvas').first().boundingBox();const px=b.x+x*b.width/256,py=b.y+y*b.height/240;if(mobile)await page.touchscreen.tap(px,py);else await page.mouse.click(px,py);};
 try{for(let iteration=0;iteration<4;iteration++){
  await page.goto(new URL('?text=full',url).href);
  await page.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));
  const before=await snapshot();assert.equal(before.save?.state.finalGateCertification?.status,'published');
  if(mobile)await tap(86,154);else await page.keyboard.press('Enter');
  await page.waitForFunction(()=>window.game.scene.isActive('EndingScene'));
  await page.waitForTimeout(2500);
  const restored=await snapshot();
  await writeFile(`${out}/${mobile?'phone':'desktop'}-${iteration}.json`,JSON.stringify(restored,null,2));
  assert.equal(restored.game.finalGateCertification?.status,'published');assert.equal(restored.game.documentPoints,241);
  assert.equal(restored.save.state.finalGateCertification?.status,'published');
  await tap(67,216);await page.waitForTimeout(100);await tap(67,216);await page.waitForTimeout(100);
  await tap(189,216);await page.waitForFunction(()=>window.game.scene.isActive('TitleScene'));
  const titled=await snapshot();
  assert.equal(titled.save.state.finalGateCertification?.status,'published');
  results.push({mobile,iteration,restored:true,stored:true,active:titled.active});
 }
 assert.deepEqual(errors,[]);
 }catch(error){await writeFile(`${out}/failure.json`,JSON.stringify({mobile,errors,...await snapshot()},null,2));await page.screenshot({path:`${out}/failure.png`});throw error;}
 await page.close();
}
}finally{await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));await browser.close();}
console.log(`PASS ${results.length} production-build publication Continue cycles`);
