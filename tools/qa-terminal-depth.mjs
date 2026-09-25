import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');const out='/tmp/terminal-depth';await mkdir(out,{recursive:true});const browser=await chromium.launch();
try{for(const mobile of [false,true]){
const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},isMobile:mobile,hasTouch:mobile});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.goto('http://127.0.0.1:5211/?scene=ArchiveScene&text=full');await p.waitForFunction(()=>window.game?.scene.isActive('ArchiveScene'));await p.waitForTimeout(2000);
for(const [label,y] of [['behind',83],['front',85]]){
 const r=await p.evaluate(y=>{const s=window.game.scene.getScene('ArchiveScene');s.scene.pause();const t=s.children.getByName('archive-source-room-statechat'),e=s.danneLurker;e.currentX=208;e.currentY=y;e.syncRender(s.time.now);s.children.depthSort();return {depth:t.depth,enemy:e.container.depth,parts:t.list.length,owned:t.list.every(o=>o.parentContainer===t),front:s.children.list.indexOf(e.container)>s.children.list.indexOf(t),interaction:s.interactables.some(i=>i.id==='source-room-statechat')};},y);
 assert.equal(r.depth,84);assert.equal(r.parts,7);assert(r.owned&&r.interaction);assert.equal(r.front,label==='front');await p.waitForTimeout(100);await p.screenshot({path:`${out}/${mobile?'phone':'desktop'}-${label}.png`});
}
assert.deepEqual(errors,[]);console.log(JSON.stringify({mobile,behindAndFront:true,errors}));await p.close();
}}finally{await browser.close();}
