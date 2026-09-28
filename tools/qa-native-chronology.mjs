import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5221/',out=process.env.FRUS_QA_OUT??'/tmp/frus-native-chronology';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const [name,width,height] of [['desktop',1280,900],['phone',375,667],['landscape',844,390]]){
 const p=await browser.newPage({viewport:{width,height},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.addInitScript(()=>{window.qaPad={id:'QA controller',index:0,connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.qaPad]});});
 const pad=async(index)=>{await p.evaluate(i=>window.qaPad.buttons[i]={pressed:true,value:1},index);await p.waitForTimeout(100);await p.evaluate(i=>window.qaPad.buttons[i]={pressed:false,value:0},index);await p.waitForTimeout(100);};
 const touch=async(key)=>{const b=p.locator(`.chronology-desk [data-focus-key=${key}]`);await b.scrollIntoViewIfNeeded();await b.tap();await p.waitForTimeout(100);};
 for(const scene of ['NetworkScene','SilentReadScene']){
  await p.goto(new URL(`?scene=${scene}`,base).href);await p.waitForFunction(scene=>window.game?.scene.isActive(scene),scene);await p.waitForTimeout(300);
  const show=async(slot)=>{await p.evaluate(({scene,slot})=>{const s=window.game.scene.getScene(scene);s.dialog?.hide();window.qaDraft=slot;window.qaFiled=[];window.qaBoard=scene==='NetworkScene'?s.ledgerChoice:s.chronologyBoard;window.qaBoard.show(slot,v=>window.qaDraft=v,v=>window.qaFiled.push(v));},{scene,slot});await p.waitForTimeout(200);};
  await show(undefined);await p.screenshot({path:`${out}/${name}-${scene}-open.png`});
  assert(await p.locator('.chronology-desk').evaluate(e=>e.open));
  assert.equal(await p.evaluate(()=>document.activeElement.dataset.focusKey),scene==='NetworkScene'?'later':'earlier');
  assert(await p.locator('.chronology-desk').evaluate(e=>{const a=e.querySelector('h1').getBoundingClientRect(),b=e.querySelector('[data-focus-key=leave]').getBoundingClientRect();return a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top;}),'Heading must not overlap the leave control');
  for(const key of ['earlier','later','file','leave']){const r=await p.locator(`.chronology-desk [data-focus-key=${key}]`).boundingBox();assert(r.width>=44&&r.height>=44,`${name}/${key}: native target ${r.width}x${r.height} must be at least 44px`);}

  assert(await p.locator('.chronology-evidence p').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=14));
  await touch('file');assert.deepEqual(await p.evaluate(()=>window.qaFiled),[]);assert(await p.locator('[data-status]').getAttribute('data-error')==='true');
  if(scene==='NetworkScene'){await touch('later');await touch('later');}else await touch('earlier');
  assert.equal(await p.evaluate(()=>window.qaDraft),2);assert.deepEqual(await p.evaluate(()=>window.qaFiled),[]);
  await touch('leave');assert.equal(await p.locator('.chronology-desk').count(),0);await show(2);
  // Controller moving away and back cannot file implicitly.
  await pad(0);assert.equal(await p.evaluate(()=>window.qaDraft),1);await pad(15);await pad(0);assert.equal(await p.evaluate(()=>window.qaDraft),2);
  await pad(15);await pad(0);assert.deepEqual(await p.evaluate(()=>window.qaFiled),[2]);assert.equal(await p.locator('.chronology-desk').count(),0);
  await show(2);
  // Background overlay must cover the native ledger and preserve its draft.
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await p.locator('#tap-resume-overlay button').tap();assert.equal(await p.evaluate(()=>window.qaDraft),2);assert.deepEqual(await p.evaluate(()=>window.qaFiled),[]);
  await p.keyboard.press('Escape');assert.equal(await p.locator('.chronology-desk').count(),0);await show(2);
  // Read all evidence with Up while keeping the first control focused.
  await p.locator('[data-focus-key=earlier]').scrollIntoViewIfNeeded();
  for(let n=0;n<10;n++){const visible=await p.locator('.chronology-evidence').evaluate(e=>{const r=e.getBoundingClientRect(),v=e.closest('.manuscript-body').getBoundingClientRect();return r.top>=v.top;});if(visible)break;await pad(12);}
  await p.screenshot({path:`${out}/${name}-${scene}-draft.png`});
  assert.equal(await p.evaluate(()=>window.qaDraft),2);
  for(let n=0;n<8&&!(await p.locator('[data-focus-key=file]').evaluate(e=>e===document.activeElement));n++)await p.keyboard.press('Tab');
  await p.keyboard.press('Enter');assert.deepEqual(await p.evaluate(()=>window.qaFiled),[2]);
  await show(2);await p.evaluate(scene=>window.game.scene.stop(scene),scene);await p.waitForTimeout(100);assert.equal(await p.locator('.chronology-desk').count(),0);
  results.push({name,scene,wrongOrderRejected:true,explicitFiling:true,draftRestored:true,touchKeyboardController:true,backgroundResume:true,shutdownClean:true});
 }
 assert.deepEqual(errors,[]);await p.close();
}await writeFile(out+'/result.json',JSON.stringify({scope:'Bounded board fixtures; no campaign reward claims.',results},null,2));console.log('PASS native chronology: both cases, three layouts, touch, keyboard, controller and lifecycle');}finally{await browser.close();}
