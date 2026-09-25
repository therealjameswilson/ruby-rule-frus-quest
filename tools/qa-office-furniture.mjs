import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {touchPad} from './touch-pad-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');await mkdir('/tmp/office-furniture',{recursive:true});
const browser=await chromium.launch({args:['--disable-audio-output']});
try{for(const mobile of [false,true]){
 const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile});const cdp=await p.context().newCDPSession(p);const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5211/?scene=OfficeScene');await p.waitForFunction(()=>window.game?.scene.getScene('OfficeScene').player);await p.waitForTimeout(1500);
 const art=await p.evaluate(()=>{const s=window.game.scene.getScene('OfficeScene');return {desks:s.children.list.filter(o=>o.name.startsWith('office-detailed-desk')).map(o=>({width:o.displayWidth,bottom:o.y+o.displayHeight/2,depth:o.depth})),solids:s.solids.slice(0,4).map(r=>[r.x,r.y,r.width,r.height])};});
 assert.equal(art.desks.length,4);assert.deepEqual(art.solids,[[45,72,64,34],[147,72,65,34],[43,138,65,32],[150,138,66,32]]);for(const d of art.desks){assert.equal(d.width,64);assert.equal(d.bottom,d.depth);}
 await p.screenshot({path:`/tmp/office-furniture/${mobile?'phone':'desktop'}-start.png`});
 const move=async(key,dx,dy,predicate)=>{
  if(mobile){const b=await p.locator('canvas').first().boundingBox();const pt=(x,y)=>({x:b.x+x*b.width/256,y:b.y+y*b.height/240,id:1});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(touchPad.x,touchPad.y)]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt(touchPad.x+dx*26,touchPad.y+dy*26)]});}
  else await p.keyboard.down(key);
  try{await p.waitForFunction(predicate,{}, {timeout:5000});}finally{if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await p.keyboard.up(key);}
 };
 await move('ArrowUp',0,-1,()=>window.game.scene.getScene('OfficeScene').player.position.y<=122);
 await move('ArrowLeft',-1,0,()=>window.game.scene.getScene('OfficeScene').player.position.x<=94);
 const act=async()=>{if(mobile){const b=await p.locator('canvas').first().boundingBox();await p.touchscreen.tap(b.x+225*b.width/256,b.y+205*b.height/240);}else await p.keyboard.press('Space');await p.waitForTimeout(180);};
 await act();assert(await p.evaluate(()=>window.game.scene.getScene('OfficeScene').dialog.active));
 for(let i=0;i<25;i++){if(!await p.evaluate(()=>window.game.scene.getScene('OfficeScene').dialog.active))break;await act();}
 const end=await p.evaluate(()=>{const s=window.game.scene.getScene('OfficeScene');const save=JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave'));return {departed:save.state.sceneProgress.kathyDeparted,visible:s.juniorCompiler.sprite.visible,solids:s.solids.length};});assert.equal(end.departed,1);assert.equal(end.visible,false);assert.equal(end.solids,4);
 await p.screenshot({path:`/tmp/office-furniture/${mobile?'phone':'desktop'}-departed.png`});assert.deepEqual(errors,[]);console.log(JSON.stringify({mobile,desks:4,walkedToKathy:true,...end,errors}));await p.close();
}}finally{await browser.close();}
