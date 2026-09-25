import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {touchPad} from './touch-pad-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');await mkdir('/tmp/office-exit',{recursive:true});const browser=await chromium.launch({args:['--disable-audio-output']});
try{for(const mobile of [false,true]){
 const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile});const cdp=await p.context().newCDPSession(p);const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5211/?scene=OfficeScene');await p.waitForFunction(()=>window.game?.scene.getScene('OfficeScene').player);await p.waitForTimeout(1200);
 const art=await p.evaluate(()=>{const a=window.game.scene.getScene('OfficeScene').children.getByName('office-exterior-door');return {width:a.displayWidth,height:a.displayHeight,source:a.texture.getSourceImage().width};});assert.deepEqual(art,{width:26,height:36,source:104});
 await p.screenshot({path:`/tmp/office-exit/${mobile?'phone':'desktop'}-door.png`});
 if(mobile){const b=await p.locator('canvas').first().boundingBox();const pt=x=>({x:b.x+x*b.width/256,y:b.y+touchPad.y*b.height/240,id:1});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(touchPad.x)]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt(touchPad.x-26)]});}else await p.keyboard.down('ArrowLeft');
 await p.waitForFunction(()=>window.game.scene.getScene('OfficeScene').player.position.x<=53);
 if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await p.keyboard.up('ArrowLeft');
 await p.waitForTimeout(50);
 const approach=await p.evaluate(()=>{const s=window.game.scene.getScene('OfficeScene');return {position:s.player.position,nearest:JSON.parse(window.render_game_to_text()).nearestInteractable};});
 const distance=Math.hypot(approach.position.x-42,approach.position.y-190);assert(distance>7&&distance<=16,`Expected forgiving approach, got ${distance}`);assert.equal(approach.nearest,'Outside: Research World');
 if(mobile){const b=await p.locator('canvas').first().boundingBox();await p.touchscreen.tap(b.x+225*b.width/256,b.y+205*b.height/240);}else await p.keyboard.press('Space');
 await p.waitForFunction(()=>window.game.scene.isActive('ResearchWorldScene'));await p.waitForTimeout(500);await p.screenshot({path:`/tmp/office-exit/${mobile?'phone':'desktop'}-outside.png`});assert.deepEqual(errors,[]);console.log(JSON.stringify({mobile,walked:true,distance,enteredWorld:true,errors}));await p.close();
}}finally{await browser.close();}
