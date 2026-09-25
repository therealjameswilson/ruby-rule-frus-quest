import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out='/tmp/archive-desk';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--disable-audio-output']});
try{for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5211/?scene=ArchiveScene&text=full');await page.waitForFunction(()=>window.game?.scene.isActive('ArchiveScene'));await page.waitForTimeout(1600);
 const desk=await page.evaluate(()=>{const s=window.game.scene.getScene('ArchiveScene'),d=s.children.getByName('archive-prop-research-table');return {texture:d.texture.key,width:d.displayWidth,bottom:d.getBounds().bottom,solid:s.roomSolids.some(r=>r.x===96&&r.y===104&&r.width===64&&r.height===24)};});
 assert.equal(desk.texture,'research-props-v1');assert.equal(desk.width,68);assert(desk.solid);assert(Math.abs(desk.bottom-128)<1);
 await page.waitForFunction(()=>!window.game.scene.getScene('ArchiveScene').toast.visible,{},{timeout:10000});
 await page.screenshot({path:`${out}/${mobile?'phone':'desktop'}.png`});
 // Walk into the existing desk footprint: the hero must stop at its front edge.
 await page.evaluate(()=>window.game.scene.getScene('ArchiveScene').player.setPosition(128,145));
 await page.keyboard.down('ArrowUp');await page.waitForTimeout(550);await page.keyboard.up('ArrowUp');
 const y=await page.evaluate(()=>window.game.scene.getScene('ArchiveScene').player.position.y);assert(y>=128&&y<145,`blocked at ${y}`);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({mobile,desk,collisionY:y,errors}));await page.close();
}}finally{await browser.close();}
