import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');const out='/tmp/historian-presentation';await mkdir(out,{recursive:true});const browser=await chromium.launch({args:['--disable-audio-output']});
try{for(const mobile of [false,true]){
 const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},isMobile:mobile,hasTouch:mobile});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5211/?scene=ArchiveScene&text=full');await p.waitForFunction(()=>window.game?.scene.isActive('ArchiveScene'));await p.waitForTimeout(1800);
 const sample=()=>p.evaluate(()=>{const s=window.game.scene.getScene('ArchiveScene');const npc=s.children.list.find(o=>o.type==='Sprite'&&Math.abs(o.x-42)<1&&o.texture?.key==='compiler_hd');return npc?{key:npc.texture.key,x:npc.x,y:npc.y,width:npc.displayWidth,height:npc.displayHeight,origin:npc.originY}:null;});
 const first=await sample();assert(first);assert.equal(first.width,32);assert.equal(first.height,48);await p.waitForTimeout(1300);assert.deepEqual(await sample(),first);
 await p.screenshot({path:`${out}/${mobile?'phone':'desktop'}.png`});assert.deepEqual(errors,[]);console.log(JSON.stringify({mobile,npc:first,planted:true,errors}));await p.close();
}}finally{await browser.close();}
