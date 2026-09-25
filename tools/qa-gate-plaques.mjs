import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');const browser=await chromium.launch();const out='/tmp/gate-plaques';await mkdir(out,{recursive:true});const results=[];
try{for(const mobile of [false,true]){
 const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5211/?scene=ArchiveScene');await p.waitForFunction(()=>window.game?.scene.isActive('ArchiveScene'));await p.waitForTimeout(300);
 const state=await p.evaluate(()=>{const s=window.game.scene.getScene('ArchiveScene');return {labels:s.children.list.filter(o=>['snes-gate-lock-label','snes-gate-route-label'].includes(o.name)).map(o=>({text:o.text,left:o.x,right:o.x+o.width})),art:s.children.list.filter(o=>o.name==='snes-gate-caption-art').length};});
 for(const label of ['STAMP','PACKET','CONCURRENCE','OFFICE'])assert(state.labels.some(l=>l.text===label),label);
 assert.equal(state.art,4);assert(state.labels.every(l=>l.left>=18&&l.right<=238));
 await p.waitForTimeout(2600);
 await p.screenshot({path:`${out}/${mobile?'phone':'desktop'}.png`});
 // Isolate visual lock/unlock redraws; this does not change traversal rules or inventory.
 const redraw=await p.evaluate(()=>{const s=window.game.scene.getScene('ArchiveScene');for(const unlocked of [true,false,true,false])s.drawGate('north',true,unlocked,'citation_stamp','NOTES');return {art:s.children.list.filter(o=>o.name==='snes-gate-caption-art').length,labels:s.children.list.filter(o=>o.name==='snes-gate-lock-label').map(o=>o.text)};});assert.equal(redraw.art,4);assert.equal(redraw.labels.filter(l=>l==='STAMP').length,1);
 // Traverse the already-open west exit with real movement input from a door fixture.
 await p.evaluate(()=>window.game.scene.getScene('ArchiveScene').player.setPosition(24,120));
 await p.keyboard.down('ArrowLeft');await p.waitForFunction(()=>window.game.scene.isActive('OfficeScene'));await p.keyboard.up('ArrowLeft');
 assert.deepEqual(errors,[]);results.push({mobile,...state,redrawStable:true,westExitWorked:true,errors});await p.close();
}await writeFile(`${out}/result.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();}
