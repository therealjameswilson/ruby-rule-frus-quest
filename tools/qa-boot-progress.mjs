import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base='http://127.0.0.1:5211/';const out='/tmp/boot-progress';await mkdir(out,{recursive:true});const results=[];
for(const [engine,mobile] of [[chromium,false],[webkit,true]]){
 const browser=await engine.launch();
 try{
  const options={viewport:mobile?{width:390,height:844}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile};
  const page=await browser.newPage(options);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  let release;const held=new Promise(resolve=>release=resolve);
  await page.route('**/maya-attack-v1.png',async route=>{await held;await route.continue();});
  await page.goto(base+'?scene=NscLibraryScene',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>{const n=Number(document.getElementById('boot-loader-bar')?.getAttribute('aria-valuenow'));return n>0&&n<100;});
  const partial=Number(await page.locator('#boot-loader-bar').getAttribute('aria-valuenow'));
  assert(await page.locator('#boot-loader').isVisible());await page.screenshot({path:`${out}/${mobile?'phone':'desktop'}-loading.png`});
  release();await page.waitForFunction(()=>window.game?.scene.isActive('NscLibraryScene'));await page.waitForFunction(()=>document.getElementById('boot-loader').hidden);
  assert.equal(await page.locator('#boot-loader-bar').getAttribute('aria-valuenow'),'100');
  const saved=await page.evaluate(()=>localStorage.getItem('rubyRuleFrusQuestSave'));assert(saved);await page.close();
  const retryPage=await browser.newPage({...options,storageState:{cookies:[],origins:[{origin:new URL(base).origin,localStorage:[{name:'rubyRuleFrusQuestSave',value:saved}]}]}});retryPage.on('pageerror',e=>errors.push(String(e)));
  let offline=true;await retryPage.route('**/maya-attack-v1.png',route=>offline?route.abort():route.continue());
  await retryPage.goto(base,{waitUntil:'networkidle'});await retryPage.waitForFunction(()=>document.getElementById('boot-loader').dataset.state==='error');
  assert(await retryPage.locator('#boot-loader-retry').isVisible());assert.equal(await retryPage.evaluate(()=>window.game.scene.getScenes(true).some(s=>s.scene.key!=='BootScene')),false);
  assert.equal(await retryPage.evaluate(()=>localStorage.getItem('rubyRuleFrusQuestSave')),saved);
  await retryPage.screenshot({path:`${out}/${mobile?'phone':'desktop'}-retry.png`});
  offline=false;
  if(mobile){const r=await retryPage.locator('#boot-loader-retry').boundingBox();assert(r.height>=44);await retryPage.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);}else await retryPage.locator('#boot-loader-retry').click();
  await retryPage.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await retryPage.waitForFunction(()=>document.getElementById('boot-loader').hidden);
  assert.equal(await retryPage.evaluate(()=>localStorage.getItem('rubyRuleFrusQuestSave')),saved);assert.deepEqual(errors,[]);
  const result={engine:mobile?'webkit':'chromium',mobile,partial,completed:100,failureKeptCovered:true,retryRecovered:true,savePreserved:true,errors};results.push(result);console.log(JSON.stringify(result));
 }finally{await browser.close();}
}
await writeFile(`${out}/result.json`,JSON.stringify(results,null,2));
