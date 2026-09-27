import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5219/';
const out=process.env.FRUS_QA_OUT??'/tmp/frus-manuscript-desk';await mkdir(out,{recursive:true});
const browser=await chromium.launch();const results=[];
try {
 const seed=await browser.newPage();await seed.goto(base+'?scene=PresidentialLibraryScene');await seed.waitForFunction(()=>localStorage.getItem('rubyRuleFrusQuestSave'));const template=await seed.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));await seed.close();
 for(const [name,width,height,touch] of [['fullscreen',1280,900,false]]){
  const saved=structuredClone(template);saved.state.currentScene='ArchiveScene';saved.state.mode='explore';saved.state.activeDialog=null;saved.state.currentChoice=null;saved.state.processStamps=['rule'];saved.state.sceneProgress={compilerSopVersion:1,compilerSop_plan:1,compilerSop_research:1,archiveSourceRoomComplete:1,repositoryCoverageMapComplete:1};
  const p=await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch,storageState:{cookies:[],origins:[{origin:new URL(base).origin,localStorage:[{name:'rubyRuleFrusQuestSave',value:JSON.stringify(saved)}]}]}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
  await p.addInitScript(()=>{window.qaPad={connected:false,index:0,id:'QA desk controller',mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>window.qaPad.connected?[window.qaPad]:[]});});
  const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
  const pressPad=async(index)=>{await p.evaluate(i=>{window.qaPad.connected=true;window.qaPad.buttons[i]={pressed:true,value:1};},index);await p.waitForTimeout(110);await p.evaluate(i=>window.qaPad.buttons[i]={pressed:false,value:0},index);await p.waitForTimeout(110);};
  const click=async(selector)=>{const el=p.locator(selector);await el.scrollIntoViewIfNeeded();if(touch)await el.tap();else await el.click();await p.waitForTimeout(100);};
  const canvasTap=async(x,y)=>{const r=await p.locator('canvas').first().boundingBox();await p.mouse.click(r.x+x*r.width/256,r.y+y*r.height/240);};
  const drain=async()=>{for(let i=0;i<100;i++){if((await state()).mode!=='dialog')return;await p.keyboard.press('Space');await p.waitForTimeout(100);}assert.fail('dialogue stuck');};
  const enter=async()=>{await drain();await p.waitForTimeout(650);await p.evaluate(()=>window.game.scene.getScene('ArchiveScene').player.setPosition(248,120));await p.keyboard.down('ArrowRight');await p.waitForTimeout(150);await p.keyboard.up('ArrowRight');await p.waitForSelector('.manuscript-desk');await p.waitForTimeout(250);};
  await p.goto(base+'?text=full');await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await canvasTap(86,154);await p.waitForFunction(()=>window.game.scene.isActive('ArchiveScene'));await enter();
  for(const selector of ['.manuscript-budget','.manuscript-submit']) {const r=await p.locator(selector).boundingBox();assert(r.y>=0&&r.y+r.height<=height,`${name}: ${selector} outside viewport`);}
  if(touch){
    const body=p.locator('.manuscript-body');const r=await body.boundingBox();const cdp=await p.context().newCDPSession(p);const x=r.x+r.width/2,y=r.y+r.height-20;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*Math.min(25,r.height/10)}]});await p.waitForTimeout(30);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(200);assert(await body.evaluate(e=>e.scrollTop>0),'Finger swipe must scroll the packet area');await body.evaluate(e=>e.scrollTop=0);await cdp.detach();
  }
  await p.screenshot({path:`${out}/${name}-open.png`});
  await p.setViewportSize({width:844,height:390});await p.waitForTimeout(250);
  await p.locator('[data-packet=decision]').focus();
  const scrollBefore=await p.locator('.manuscript-body').evaluate(e=>e.scrollTop);
  await pressPad(13);
  assert(await p.locator('.manuscript-body').evaluate(e=>e.scrollTop)>scrollBefore,'D-pad reveals clipped packet content');
  assert(await p.locator('[data-packet=decision]').evaluate(e=>e===document.activeElement),'Reading keeps packet focus');
  await pressPad(15);assert(await p.locator('[data-packet=routine]').evaluate(e=>e===document.activeElement),'Right moves to next packet');
  await p.setViewportSize({width:1280,height:900});await p.waitForTimeout(250);
  await p.keyboard.press('f');await p.waitForTimeout(700);
  assert(await p.evaluate(()=>Boolean(document.fullscreenElement)), 'Fullscreen entered');
  assert(await p.locator('.manuscript-submit').evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e||e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}), 'Desk remains above fullscreen canvas');
  await p.screenshot({path:out+'/fullscreen.png'});
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  assert.equal(await p.locator('.manuscript-desk').count(),0);assert.equal(await p.evaluate(()=>document.body.style.touchAction),'');
  await enter();await p.evaluate(()=>window.game.scene.getScene('ArchiveScene').scene.start('OfficeScene'));await p.waitForFunction(()=>window.game.scene.isActive('OfficeScene'));assert.equal(await p.locator('.manuscript-desk').count(),0);assert.equal(await p.evaluate(()=>document.body.style.touchAction),'');
  assert.deepEqual(errors,[]);console.log('Short-screen controller reading, fullscreen, Escape, scene shutdown and touch-style restoration passed');await p.close();
 }
}finally{await browser.close();}
