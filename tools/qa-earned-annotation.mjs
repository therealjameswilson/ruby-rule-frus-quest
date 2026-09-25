const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
assert(process.env.FRUS_QA_STORAGE, 'Provide an earned Annotation Stacks checkpoint');
const mobile=process.argv.includes('--mobile');
const out=process.env.FRUS_QA_OUT ?? '/tmp/frus-earned-annotation';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
const context=await browser.newContext({storageState:process.env.FRUS_QA_STORAGE,viewport:mobile?{width:375,height:667}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1});
const page=await context.newPage();const cdp=mobile?await context.newCDPSession(page):null;const errors=[];page.on('pageerror',e=>errors.push(String(e)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const shot=async name=>{const data=await page.evaluate(()=>new Promise(r=>window.game.renderer.snapshot(i=>r(i.src))));await writeFile(`${out}/${name}.png`,Buffer.from(data.split(',')[1],'base64'));await writeFile(`${out}/${name}.json`,JSON.stringify(await state(),null,2));if(mobile)await page.screenshot({path:`${out}/${name}-phone.png`});};
const key=async(k,ms=50)=>{
 if(mobile){
  const box=await page.locator('canvas').first().boundingBox();
  const point=(x,y)=>({x:box.x+x*box.width/256,y:box.y+y*box.height/240,id:1});
  const dirs={ArrowLeft:[-26,0],ArrowRight:[26,0],ArrowUp:[0,-26],ArrowDown:[0,26]};
  const origin=dirs[k]?[48, 202]:k==='Enter'?[86,154]:[225,205];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(...origin)]});
  if(dirs[k])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(origin[0]+dirs[k][0],origin[1]+dirs[k][1])]});
  await page.waitForTimeout(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }else{await page.keyboard.down(k);await page.waitForTimeout(ms);await page.keyboard.up(k);}
 await page.waitForTimeout(100);
};
async function move(x,y){for(let i=0;i<100;i++){const p=(await state()).player,dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<(mobile?5:3)&&Math.abs(dy)<(mobile?5:3))return;const h=Math.abs(dx)>=(mobile?5:3);await key(h?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp',Math.min(100,Math.max(mobile?50:20,Math.abs(h?dx:dy)/72*1000)));}throw Error(`Cannot walk to ${x},${y}`);}
try{
 await page.goto(new URL('?text=full',process.env.FRUS_QA_URL??'http://127.0.0.1:5195/').href);
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ArchiveScene');await page.waitForTimeout(1500);
 assert.equal((await state()).roomTraversal.currentRoomId,'AS');await shot('arrival');
 // Advance until the cart reaches its stop; rendered frame rate varies under browser QA.
 for(let attempt=0;attempt<6&&(await state()).sceneProgress.annotationCartY!==112;attempt++)await key('ArrowUp',1000);
 await shot('cart-north');
 assert.equal((await state()).sceneProgress.annotationCartY,112);
 if(process.argv.includes('--reload-cart')){
  const cart=(await state()).sceneProgress;await page.reload();
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ArchiveScene');await page.waitForTimeout(500);
  assert.equal((await state()).roomTraversal.currentRoomId,'AS');
  assert.equal((await state()).sceneProgress.annotationCartY,cart.annotationCartY);
  assert.equal((await state()).sceneProgress.annotationCartX,cart.annotationCartX);
  assert(!(await state()).sceneProgress.annotationCartParked);await shot('cart-restored');
 }
 await move(108,132);await move(108,112);await key('ArrowRight',750);await shot('parked');
 assert.equal((await state()).sceneProgress.annotationCartParked,1);
 if(process.argv.includes('--cart-art')) {
  await page.waitForFunction(()=>!window.game.scene.getScene('ArchiveScene').toast.visible);
  const art=await page.evaluate(()=>{
   const s=window.game.scene.getScene('ArchiveScene'),context=s.children.getByName('archive-annotation-station-contextual_annotation');
   const cart=s.children.getByName('annotation-context-cart').getBounds(),label=context.getByName('annotation-station-label').getBounds();
   return {contextDesks:context.list.filter(o=>o.name==='annotation-station-desk').length,
    totalDesks:s.children.list.filter(o=>o.name?.startsWith('archive-annotation-station-')).flatMap(o=>o.list??[]).filter(o=>o.name==='annotation-station-desk').length,
    cartBottom:cart.bottom,labelTop:label.top,visible:context.visible,
    prompt:s.children.getByName('interaction-prompt').getBounds(),hero:s.player.sprite.getBounds()};
  });
  assert.equal(art.contextDesks,0);assert.equal(art.totalDesks,2);assert(art.visible);assert(art.labelTop>art.cartBottom);assert(art.prompt.x+art.prompt.width<art.hero.x || art.prompt.x>art.hero.x+art.hero.width || art.prompt.y+art.prompt.height<art.hero.y);
  await page.screenshot({path:`${out}/parked-art.png`});await writeFile(`${out}/cart-art.json`,JSON.stringify(art,null,2));
 }
 await key('Space');await shot('context');
 await move(112,112);await move(112,80);await move(48,80);await key('Space');await shot('source');
 await move(208,80);await key('Space');await shot('selectivity');
 assert.equal((await state()).sceneProgress.annotationGatheredMask,7);
 await move(112,80);await move(112,192);await move(128,192);await key('ArrowDown',500);
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).roomTraversal.currentRoomId==='A1');await page.waitForTimeout(700);
 await shot('returned');
 assert.deepEqual(errors,[]);console.log('PASS earned cart parking, three annotation notes, return to source room');
 await context.storageState({path:`${out}/earned-storage.json`});
}finally{await shot('last');await browser.close();}
