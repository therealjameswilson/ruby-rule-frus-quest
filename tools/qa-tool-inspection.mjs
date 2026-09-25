import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5211/',out=process.env.FRUS_QA_OUT??'/tmp/tool-inspection';await mkdir(out,{recursive:true});
const storage=JSON.parse(await readFile(process.env.FRUS_QA_STORAGE,'utf8'));
const browser=await chromium.launch(),results=[];
try{
 for(const [name,width,height,touch] of [['desktop',1280,720,false],['phone',390,844,true],['landscape',844,390,true]]){
  const page=await browser.newPage({storageState:storage,viewport:{width,height},isMobile:touch,hasTouch:touch,deviceScaleFactor:touch?3:1}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
  const click=async(x,y)=>{const r=await page.locator('canvas').first().boundingBox();if(touch)await page.touchscreen.tap(r.x+x*r.width/256,r.y+y*r.height/240);else await page.mouse.click(r.x+x*r.width/256,r.y+y*r.height/240);await page.waitForTimeout(130);};
  const control=async id=>{const hit=(await state()).pauseMenu.controls.find(h=>h.id===id);assert(hit,`Missing ${id}`);await click(hit.x,hit.y);};
  await page.goto(`${base}?text=full`);await page.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));if(touch)await click(86,154);else await page.keyboard.press('Enter');
  await page.waitForFunction(()=>window.game?.scene.isActive('BlackVaultLairScene'));await page.waitForTimeout(700);const before=await state();
  if(touch){const menu=page.locator('#portrait-touch-dock [data-control=start]');if(await menu.isVisible())await menu.tap();else await click(120,216);}else await page.keyboard.press('m');
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='pause');await page.waitForTimeout(700);
  const tools=(await state()).processItems;const inspected=[];
  for(let i=0;i<tools.length;i++){
   const tool=tools[i];assert(tool.acquired);
   for(let j=0;j<3&&!(await state()).pauseMenu.detailOpen;j++)await control(`tool-${i}`);
   const current=await state();assert(current.pauseMenu.detailOpen);assert.equal(current.pauseMenu.selectedTool,tool.id);
   const texts=await page.evaluate(()=>{const scene=window.game.scene.getScene('BlackVaultLairScene'),menu=scene.children.getByName('pause-menu'),result=[];function visit(o){if(typeof o.text==='string'){const b=o.getBounds();result.push({text:o.text,x:b.x,y:b.y,right:b.right,bottom:b.bottom});}if(o.list)o.list.forEach(visit);}visit(menu);return result;});
   const description=tool.pickupDialog.slice(1).join(' '),text=texts.map(t=>t.text).join(' ').replace(/\s+/g,' ');
   assert(text.includes(description),`Missing full description for ${tool.id}`);assert(text.includes(tool.frusMeaning.toUpperCase()));
   for(const t of texts)assert(t.x>=8&&t.right<=248&&t.y>=12&&t.bottom<=236,`Text outside panel: ${t.text}`);
   const prose=texts.find(t=>t.text.replace(/\s+/g,' ')===description);assert(prose.bottom<=201,'Description overlaps Back button');
   await page.screenshot({path:`${out}/${name}-${tool.id}.png`});await control('back');assert.equal((await state()).pauseMenu.detailOpen,false);assert.equal((await state()).mode,'pause');inspected.push(tool.id);
  }
  await control('close');const after=await state();assert.equal(after.mode,'explore');assert.equal(after.playerCombat.weapon.swingId,before.playerCombat.weapon.swingId);assert.equal(after.documentPoints,before.documentPoints);assert.deepEqual(after.player,before.player);assert.deepEqual(errors,[]);results.push({name,inspected,errors});await page.close();
 }
}finally{await writeFile(`${out}/results.json`,JSON.stringify({scope:'Earned boss-entry save, actual menu input and all eight tool descriptions, desktop/portrait/landscape; no movement or progress injection.',results},null,2));await browser.close();}
