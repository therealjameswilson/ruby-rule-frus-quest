import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/tmp/ruby-danne-intro';
const base = process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5202/';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
 for (const device of [{name:'desktop', width:1024,height:960,dpr:1,touch:false}, {name:'iphone-se',width:375,height:667,dpr:2,touch:true}, {name:'iphone',width:393,height:852,dpr:3,touch:true}]) {
  const context = await browser.newContext({viewport:device,deviceScaleFactor:device.dpr,hasTouch:device.touch,isMobile:device.touch});
  const page = await context.newPage(), errors=[];
  page.on('pageerror', e=>errors.push(String(e))); page.on('console', m=>{if(m.type()==='error')errors.push(m.text());});
  const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
  const tap=async(x,y)=>{const b=await page.locator('canvas').first().boundingBox(); if(device.touch)await page.touchscreen.tap(b.x+x*b.width/256,b.y+y*b.height/240);else await page.mouse.click(b.x+x*b.width/256,b.y+y*b.height/240);await page.waitForTimeout(220);};
  const shot=async name=>page.screenshot({path:`${out}/${device.name}-${name}.png`});
  await page.goto(new URL('?scene=CharacterCreateScene&name=Ruby',base).href);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='CharacterCreateScene');
  await page.waitForTimeout(400);await tap(128,188);
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='DanneIntroScene');
  await page.waitForTimeout(400);
  assert((await state()).visibleEntities.includes('Intro 1/8'));
  assert.equal(await page.evaluate(()=>window.rubyRuleTouchControls.enabled),false);
  await shot('opening');
  await tap(121,211);assert((await state()).visibleEntities.includes('Intro 2/8'));
  await tap(36,211);assert((await state()).visibleEntities.includes('Intro 1/8'));
  const messages=[];
  for(let i=0;i<8;i++){
   const s=await state();assert(s.visibleEntities.includes(`Intro ${i+1}/8`));messages.push(s.latestMessage);
   await shot(`page-${i+1}`);
   if(device.touch)await tap(121,211);else{await page.keyboard.press('Enter');await page.waitForTimeout(230);}
  }
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='OfficeScene');
  assert.equal((await state()).objective,'Talk to JR at the west desk.');
  await shot('office');
  // Intro remains transient; it cannot replace an established gameplay save.
  await page.goto(new URL('?scene=DanneIntroScene',base).href);
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='DanneIntroScene');
  await page.waitForTimeout(500);
  const after=await context.storageState();
  for(const origin of after.origins)for(const item of origin.localStorage){
    if(item.value.includes('"currentScene":"DanneIntroScene"'))throw Error('Intro leaked into persistent save');
  }
  if(device.touch)await tap(213,211);else await page.keyboard.press('Escape');
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='OfficeScene');
  assert.deepEqual(errors,[]);
  results.push({device:device.name,passed:['character creation route','eight pages','back','desktop Enter or touch Next','skip to Office','transient save','no HUD or gameplay controls over intro'],messages,errors});
  await context.close();
 }
 await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log('PASS desktop and two iPhone sizes: all intro pages, back, skip, Office, save isolation.');
} finally {await browser.close();}
