import fs from 'node:fs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');import assert from 'node:assert/strict';
const out=process.env.FRUS_QA_OUT ?? '/tmp/ruby-readable-panels';fs.mkdirSync(out,{recursive:true});
const base=process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5173/';
const b=await chromium.launch({args:['--disable-audio-output']});
for(const [label,viewport,touch] of [['desktop',{width:1280,height:720},false],['phone',{width:390,height:844},true],['landscape',{width:844,height:390},true]]){
const p=await b.newPage({viewport,hasTouch:touch,isMobile:touch,deviceScaleFactor:touch?3:1});const errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto(base+'?scene=OfficeScene');await p.waitForFunction(()=>window.game?.scene.getScene('OfficeScene')?.dialog);await p.waitForTimeout(400);
await p.evaluate(()=>{window.__dialogDone=0;const s=window.game.scene.getScene('OfficeScene');s.dialog.show('KATHY — GENERAL EDITOR',['Your mission is to compile a FRUS volume. Research the record, verify your citations, and carry it through review.','Now I need to talk with the HAC — so do not bother me anymore.'],()=>window.__dialogDone++);});
let count=0;while(await p.evaluate(()=>window.game.scene.getScene('OfficeScene').dialog.active)){
const layout=await p.evaluate(()=>{const d=window.game.scene.getScene('OfficeScene').dialog;const r=d.bodyText.getBounds();return{bottom:r.bottom,footer:d.advanceText.y,right:r.right,y:d.container.list[0].getBounds().bottom};});assert(layout.bottom<layout.footer);assert(layout.right<=240);if(touch)assert(layout.y<=172);
if(count===0)await p.screenshot({path:`${out}/dialogue-${label}.png`});if(touch){const r=await p.locator('canvas').first().boundingBox();await p.touchscreen.tap(r.x+r.width*.5,r.y+r.height*140/240);}else await p.keyboard.press('Space',{delay:40});await p.waitForTimeout(180);assert(++count<15);
}assert.equal(await p.evaluate(()=>window.__dialogDone),1);
await p.evaluate(()=>{const s=window.game.scene.getScene('OfficeScene');s.toast.show('Research saved. Return to the general editor with your verified source note.',{x:245,y:60},'info');});await p.waitForTimeout(70);
const toast=await p.evaluate(()=>{const t=window.game.scene.getScene('OfficeScene').toast;return{panel:t.border.getBounds(),text:t.text.getBounds()};});assert(toast.panel.x>=7);assert(toast.panel.x+toast.panel.width<=249);assert(toast.text.height<toast.panel.height);await p.screenshot({path:`${out}/toast-${label}.png`});assert.deepEqual(errors,[]);console.log(label,'dialogue pages',count,'and wrapped toast PASS');await p.close();}
await b.close();
