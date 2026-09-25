import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out='/tmp/archive-hud';await mkdir(out,{recursive:true});const browser=await chromium.launch();
try{for(const mobile of [false,true]){
 const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5211/?scene=ArchiveScene&text=full');await p.waitForFunction(()=>window.game?.scene.isActive('ArchiveScene'));await p.waitForTimeout(1800);
 assert.equal(await p.evaluate(()=>window.game.scene.getScene('ArchiveScene').children.list.filter(o=>o.name?.startsWith('archive-minimap')||o.name?.startsWith('archive-compass-relic')).length),0);
 await p.screenshot({path:`${out}/${mobile?'phone':'desktop'}-play.png`});
 const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
 await p.keyboard.press('Escape');await p.waitForFunction(()=>JSON.parse(window.render_game_to_text()).pauseMenu);
 const tap=async id=>{const hit=(await state()).pauseMenu.controls.find(c=>c.id===id);assert(hit);const b=await p.locator('canvas').first().boundingBox();const x=b.x+hit.x*b.width/256,y=b.y+hit.y*b.height/240;if(mobile)await p.touchscreen.tap(x,y);else await p.mouse.click(x,y);await p.waitForTimeout(150);};
 await tap('map');assert.equal((await state()).pauseMenu.page,'map');const before=await state();
 await p.screenshot({path:`${out}/${mobile?'phone':'desktop'}-map.png`});await tap('routes');assert.equal((await state()).pauseMenu.detailOpen,true);
 const texts=await p.evaluate(()=>window.game.scene.getScene('ArchiveScene').children.getByName('pause-menu').list.flatMap(o=>o.list??[]).filter(o=>o.name==='pause-text').map(o=>o.text));assert(texts.some(t=>t.includes('NORTH:')));assert(texts.includes('LOCKED'));
 await tap('back');await tap('close');const after=await state();assert.equal(after.mode,'explore');assert.deepEqual(after.player,before.player);assert.deepEqual(errors,[]);console.log(JSON.stringify({mobile,map:true,routes:true,resumed:true,errors}));await p.close();
}}finally{await browser.close();}
