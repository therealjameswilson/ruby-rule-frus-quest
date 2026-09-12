import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
assert(process.env.FRUS_QA_STORAGE, 'Supply an earned partial-stacks save.');
const out=process.env.FRUS_QA_OUT??'/tmp/frus-cart-pressure';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE});
const errors=[];
try {
  const context=await browser.newContext({storageState:JSON.parse(await readFile(process.env.FRUS_QA_STORAGE,'utf8'))});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
  async function key(name,ms=55){await page.keyboard.down(name);await page.waitForTimeout(ms);await page.keyboard.up(name);await page.waitForTimeout(30);}
  async function move(x,y){
    for(let i=0;i<160;i++){
      const s=await state(),dx=x-s.player.x,dy=y-s.player.y;
      if(Math.hypot(dx,dy)<3)return;
      assert.equal(s.mode,'explore');
      await key(Math.abs(dx)>Math.abs(dy)?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp',Math.max(20,Math.min(80,Math.max(Math.abs(dx),Math.abs(dy))*7)));
    }
    throw Error('Could not approach cart');
  }
  async function capture(name){
    const result=await page.evaluate(()=>new Promise(resolve=>window.game.renderer.snapshot(image=>{
      const scene=window.game.scene.getScene('ArchiveScene');
      resolve({image:image.src,state:JSON.parse(window.render_game_to_text()),visible:scene.annotationCartPressure.visible,width:scene.annotationCartPressureFill.width});
    })));
    await writeFile(`${out}/${name}.png`,Buffer.from(result.image.split(',')[1],'base64'));
    const {image,...data}=result;
    await writeFile(`${out}/${name}.json`,JSON.stringify(data,null,2));
    return result;
  }
  await page.goto(process.env.FRUS_QA_URL??'http://127.0.0.1:5195/?text=full');
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');
  await key('Enter');
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ArchiveScene');
  await page.waitForTimeout(850);
  assert.equal((await state()).roomTraversal.currentRoomId,'AS');
  await move(208,190);await move(128,190);await move(128,170);
  const before=await state();
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(()=>window.game.scene.getScene('ArchiveScene').annotationCartPushHold.pressurePixels>=3,{},{polling:'raf',timeout:2000});
  const pressing=await capture('contact-pressure');
  await page.keyboard.up('ArrowUp');await page.waitForTimeout(50);
  assert(pressing.visible);assert(Number.isInteger(pressing.width)&&pressing.width>0&&pressing.width<12);
  assert.equal(pressing.state.sceneProgress.annotationCartY??160,160);
  assert.equal(await page.evaluate(()=>window.game.scene.getScene('ArchiveScene').annotationCartPressure.visible),false);
  await key('ArrowUp',450);
  assert.equal((await state()).sceneProgress.annotationCartY,144);
  await capture('pushed');
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(()=>window.game.scene.getScene('ArchiveScene').annotationCartPushHold.pressurePixels>=3,{},{polling:'raf',timeout:2000});
  await key('m');await page.keyboard.up('ArrowUp');
  const paused=await capture('paused-pressure-cleared');
  assert.equal(paused.state.mode,'pause');assert.equal(paused.visible,false);
  assert.equal(paused.state.sceneProgress.annotationCartY,144);
  assert.equal(paused.state.documentPoints,before.documentPoints);
  assert.equal(paused.state.sceneProgress.annotationGatheredMask,before.sceneProgress.annotationGatheredMask);
  assert.deepEqual(errors,[]);
  await writeFile(`${out}/result.json`,JSON.stringify({errors,pressureWidth:pressing.width,cartY:144},null,2));
  console.log('PASS cart contact feedback, release, push and pause');
} finally {await browser.close();}
