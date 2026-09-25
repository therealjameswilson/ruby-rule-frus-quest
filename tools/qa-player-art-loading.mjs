import assert from 'node:assert/strict';
import {mkdir,writeFile,stat} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5211/';
const out=process.env.FRUS_QA_OUT??'/tmp/player-art-loading';await mkdir(out,{recursive:true});
const b=await chromium.launch();const results=[];
const roster=[['compiler','compiler'],['compiler_ada','ada'],['compiler_clara','clara'],['compiler_maya','maya'],['compiler_robin','robin'],['compiler_quinn','quinn']];
try {
 const fresh=await b.newPage();const freshRequests=[];fresh.on('request',r=>{if(r.url().includes('/compilers/combat/'))freshRequests.push(r.url());});
 await fresh.goto(base);await fresh.waitForFunction(()=>window.game?.scene.isActive('WarningScene')||window.game?.scene.isActive('TitleScene'));assert.deepEqual(freshRequests,[]);await fresh.close();
 const seedPage=await b.newPage();await seedPage.goto(new URL('?scene=NscLibraryScene',base).href);await seedPage.waitForFunction(()=>window.game?.scene.isActive('NscLibraryScene'));
 const seed=await seedPage.evaluate(()=>localStorage.getItem('rubyRuleFrusQuestSave'));assert(seed);await seedPage.close();
 for(const [appearance,stem] of roster){
  const saved=JSON.parse(seed);saved.state.playerProfile.compilerAppearance=appearance;
  const mobile=appearance==='compiler_ada';
  const p=await b.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},isMobile:mobile,hasTouch:mobile,storageState:{cookies:[],origins:[{origin:new URL(base).origin,localStorage:[{name:'rubyRuleFrusQuestSave',value:JSON.stringify(saved)}]}]}});
  const requests=[],errors=[];p.on('pageerror',e=>errors.push(String(e)));p.on('request',r=>{if(r.url().includes('/compilers/combat/'))requests.push(r.url().split('/').pop());});
  let fail=mobile;
  await p.route('**/compilers/combat/*',async route=>{if(fail){await route.abort();}else{await new Promise(r=>setTimeout(r,350));await route.continue();}});
  await p.goto(base);await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));assert.deepEqual(requests,[]);
  const tap=async(x,y)=>{const r=await p.locator('canvas').first().boundingBox();await p.touchscreen.tap(r.x+x*r.width/256,r.y+y*r.height/240);};
  if(mobile)await tap(86,154);else await p.keyboard.press('Enter');
  if(mobile){await p.waitForFunction(()=>window.game?.scene.isActive('PlayerArtLoadScene')&&window.game.scene.getScene('PlayerArtLoadScene').failed);
   assert.equal(await p.evaluate(()=>window.game.scene.isActive('NscLibraryScene')),false);assert.equal(await p.evaluate(()=>window.game.scene.getScene('UIScene').sys.settings.visible),false);
   const current=await p.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));assert.equal(current.state.currentScene,saved.state.currentScene);assert.equal(current.state.playerProfile.compilerAppearance,appearance);
   await p.screenshot({path:`${out}/phone-retry.png`});fail=false;await tap(128,159);
  }
  await p.waitForFunction(()=>window.game.scene.isActive('NscLibraryScene'));await p.waitForTimeout(350);
  assert.equal(await p.evaluate(()=>window.game.scene.getScene('UIScene').sys.settings.visible),true);
  const pose=await p.evaluate(()=>{const h=window.game.scene.getScene('NscLibraryScene').player;return {key:h.attackPoseSprite?.texture.key,frames:h.attackPoseSprite?.texture.getFrameNames().length};});
  assert.equal(pose.key,stem+'-attack-v1');assert.equal(pose.frames,12);assert(requests.every(r=>r===stem+'-attack-v1.png'));if(mobile)assert(requests.length>=2);else assert.equal(requests.length,1);
  const active=await p.evaluate(()=>new Promise((resolve,reject)=>{const s=window.game.scene.getScene('NscLibraryScene'),h=s.player;const timeout=setTimeout(()=>reject(Error('No attack')),4000);const capture=()=>{if(h.combatReadout.weapon.phase!=='active')return;s.events.off('postupdate',capture);clearTimeout(timeout);s.scene.pause();resolve({visible:h.attackPoseSprite.visible,frame:Number(h.attackPoseSprite.frame.name)});};s.events.on('postupdate',capture);h.startAction('stapler');}));assert(active.visible);assert(active.frame>=4&&active.frame<=7);
  await p.screenshot({path:`${out}/${appearance}-attack.png`});assert.deepEqual(errors,[]);results.push({appearance,mobile,requests,pose,active,retry:mobile,errors});await p.close();
 }
 const totalBytes=(await Promise.all(roster.map(async([,stem])=>(await stat(`public/assets/characters/compilers/combat/${stem}-attack-v1.png`)).size))).reduce((a,b)=>a+b,0);
 await writeFile(`${out}/result.json`,JSON.stringify({freshTitleAttackRequests:0,totalBytesDeferredFromBoot:totalBytes,results},null,2));console.log(JSON.stringify({freshTitleAttackRequests:0,totalBytesDeferredFromBoot:totalBytes,roster:results.length,phoneRetry:true}));
} finally {await b.close();}
