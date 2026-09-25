import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/combat-effect-loading';await mkdir(out,{recursive:true});const b=await chromium.launch();const results=[];
const base='http://127.0.0.1:5211/';const assets=['19_vfx_ego_bolt_strip.webp','effects_stamps.png','20_ui_scroll_corners.webp'];
try{
 const title=await b.newPage();const requests=[];title.on('request',r=>requests.push(r.url().split('/').pop()));await title.goto(base);await title.waitForFunction(()=>window.game?.scene.isActive('WarningScene')||window.game?.scene.isActive('TitleScene'));assert(!requests.some(r=>assets.includes(r)));
 const titleBytes=await title.evaluate(()=>performance.getEntriesByType('resource').reduce((n,r)=>n+r.encodedBodySize,0));await title.close();
 const seed=await b.newPage();await seed.goto(base+'?scene=OfficeScene');await seed.waitForFunction(()=>window.game?.scene.isActive('OfficeScene'));const saved=await seed.evaluate(()=>localStorage.getItem('rubyRuleFrusQuestSave'));assert(saved);await seed.close();
 for(const failedAsset of assets.slice(0,2)){
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,storageState:{cookies:[],origins:[{origin:base.slice(0,-1),localStorage:[{name:'rubyRuleFrusQuestSave',value:saved}]}]}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));let fail=true;const fetched=[];p.on('request',r=>{if(assets.some(a=>r.url().endsWith(a)))fetched.push(r.url().split('/').pop());});await p.route('**/'+failedAsset,r=>fail?r.abort():r.continue());
  await p.goto(base);await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));assert.equal(fetched.length,0);
  const tap=async(x,y)=>{const r=await p.locator('canvas').first().boundingBox();await p.touchscreen.tap(r.x+x*r.width/256,r.y+y*r.height/240);};await tap(86,154);await p.waitForFunction(()=>window.game?.scene.isActive('PlayerArtLoadScene')&&window.game.scene.getScene('PlayerArtLoadScene').failed);assert(!await p.evaluate(()=>window.game.scene.isActive('OfficeScene')));assert.equal(await p.evaluate(()=>localStorage.getItem('rubyRuleFrusQuestSave')),saved);
  assert(!await p.locator('#portrait-touch-dock').isVisible(),'Loading screen must hide gameplay controls');await p.screenshot({path:`${out}/${failedAsset}-retry.png`});fail=false;await tap(128,159);await p.waitForFunction(()=>window.game.scene.isActive('OfficeScene'));await p.waitForTimeout(250);
  assert(await p.locator('#portrait-touch-dock').isVisible(),'Gameplay restores the touch controls');
  const art=await p.evaluate(()=>({ego:window.game.textures.get('danne-vfx-ego-bolt').getFrameNames().length,stamp:window.game.textures.get('pack-effects-stamps').getFrameNames().length,animation:window.game.anims.exists('danne-vfx-ego-bolt-fly')}));assert.equal(art.ego,8);assert.equal(art.stamp,20);assert(art.animation);assert(!fetched.includes(assets[2]));assert(fetched.filter(a=>a===failedAsset).length>=2);assert.equal(fetched.filter(a=>a!==failedAsset).length,1,'Successful effects should not reload on retry');
  await p.screenshot({path:`${out}/${failedAsset}-recovered.png`});assert.deepEqual(errors,[]);results.push({failedAsset,retry:true,savedProgressPreserved:true,art,fetched,errors});await p.close();
 }
 const gallery=await b.newPage();await gallery.goto(base+'?scene=DanneGallery');await gallery.waitForFunction(()=>window.game?.scene.isActive('DanneGallery'),null,{timeout:60000});assert(await gallery.evaluate(()=>window.game.textures.exists('danne-ui-scroll-corners')));await gallery.close();
 await writeFile(`${out}/result.json`,JSON.stringify({titleBytes,titleRequestsExcluded:assets,galleryScrollPreserved:true,results},null,2));console.log(JSON.stringify({titleBytes,titleRequestsExcluded:assets,galleryScrollPreserved:true,results}));
}finally{await b.close();}
