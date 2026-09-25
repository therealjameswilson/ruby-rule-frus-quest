import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,stat} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const engine=process.env.FRUS_QA_ENGINE==='webkit'?webkit:chromium;
const out=process.env.FRUS_QA_OUT??'/tmp/npc-demand-loading';await mkdir(out,{recursive:true});
const browser=await engine.launch();const results=[];
try{
 const title=await browser.newPage();const requests=[];title.on('request',r=>{if(r.url().includes('/colleagues/'))requests.push(r.url());});await title.goto('http://127.0.0.1:5211/');await title.waitForFunction(()=>window.game?.scene.isActive('WarningScene')||window.game?.scene.isActive('TitleScene'));assert.deepEqual(requests,[]);
 const resources=await title.evaluate(()=>performance.getEntriesByType('resource').map(r=>({url:new URL(r.name).pathname,bytes:r.encodedBodySize})));const titleBytes=resources.reduce((n,r)=>n+r.bytes,0);await title.close();
 for(const [scene,npc] of [['ArchiveScene','marcus'],['NetworkScene','marcus'],['ReferralVaultScene','marcus'],['SilentReadScene','priya']]){
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const requested=[],errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(r.url().includes('/colleagues/'))requested.push(r.url().split('/').pop());});
  await page.goto(`http://127.0.0.1:5211/?scene=${scene}`);await page.waitForFunction(s=>window.game?.scene.isActive(s),scene);await page.waitForTimeout(250);
  if(scene==='ArchiveScene')await page.evaluate(()=>window.game.scene.getScene('ArchiveScene').enterRoom('A3',{x:128,y:184},false));
  const read=()=>page.evaluate(({scene,npc})=>{const s=window.game.scene.getScene(scene);const actor=s.children.list.find(o=>o.name===`historian-${npc}`);return actor?{key:actor.texture.key,width:actor.displayWidth,height:actor.displayHeight,visible:actor.visible}:null;},{scene,npc});
  const actor=await read();assert(actor,'Required NPC must actually be present');assert.equal(actor.key,`npc-${npc}-detailed-v1`);assert.equal(actor.width,32);assert.equal(actor.height,48);assert(actor.visible);assert.deepEqual(requested,[`${npc}-v1.png`]);
  await page.screenshot({path:`${out}/${scene}.png`});
  await page.evaluate(scene=>window.game.scene.getScene(scene).scene.restart(),scene);await page.waitForTimeout(500);assert.deepEqual(requested,[`${npc}-v1.png`],'Warm restart must reuse the texture');assert.deepEqual(errors,[]);results.push({scene,npc,requested,actor,reusedOnRestart:true,errors});await page.close();
 }
 const baseline=process.env.FRUS_QA_BASELINE?JSON.parse(await readFile(process.env.FRUS_QA_BASELINE)):null;const before=baseline?.reduce((n,r)=>n+r.bytes,0)??null;const deferredBytes=(await Promise.all(['marcus','priya'].map(async id=>(await stat(`public/assets/characters/colleagues/${id}-v1.png`)).size))).reduce((a,b)=>a+b,0);const result={engine:process.env.FRUS_QA_ENGINE??'chromium',titleNpcRequests:0,titleBytes,beforeBytes:before,savedBytes:before===null?null:before-titleBytes,deferredBytes,results,limitations:['Local transfer sizes; not a network-speed benchmark','Archive hint-room fixture used','Simulated browser; not physical iPhone']};await writeFile(`${out}/result.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
