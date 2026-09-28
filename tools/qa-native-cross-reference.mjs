import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5217/',out=process.env.FRUS_QA_OUT??'/tmp/frus-native-cross-reference';
await mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const [name,width,height] of [['desktop',1280,900],['phone',375,667],['landscape',844,390]]){
 const p=await browser.newPage({viewport:{width,height},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.addInitScript(()=>{window.qaPad={id:'QA controller',index:0,connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.qaPad]});});
 const pad=async(index)=>{await p.evaluate(i=>window.qaPad.buttons[i]={pressed:true,value:1},index);await p.waitForTimeout(100);await p.evaluate(i=>window.qaPad.buttons[i]={pressed:false,value:0},index);await p.waitForTimeout(100);};
 await p.goto(new URL('?scene=SilentReadScene',base).href);
 await p.waitForFunction(()=>window.game?.scene.isActive('SilentReadScene'));await p.waitForTimeout(400);
 const show=async(mask)=>{await p.evaluate(mask=>{const s=window.game.scene.getScene('SilentReadScene');s.dialog?.hide();window.qaDraft=mask;window.qaFiled=[];s.crossReferenceBoard.show(mask,v=>window.qaDraft=v,v=>window.qaFiled.push(v));},mask);await p.waitForTimeout(200);};
 const tap=async(selector)=>{const e=p.locator('.cross-reference-desk '+selector);await e.scrollIntoViewIfNeeded();await e.tap();await p.waitForTimeout(120);};
 await show(0);
 const target=await p.locator('.reference-target').innerText();
 await p.screenshot({path:out+'/'+name+'-open.png'});
 for(const selector of ['[data-focus-key=file]','[data-focus-key=leave]','[data-record="1"]']){const r=await p.locator('.cross-reference-desk '+selector).boundingBox();assert(r.width>=44&&r.height>=44);}
 await tap('[data-focus-key=file]');assert.match(await p.locator('[data-status]').innerText(),/SELECT A RECORD/);
 for(const i of [1,3]){await tap('[data-record="'+i+'"]');await tap('[data-focus-key=file]');assert.deepEqual(await p.evaluate(()=>window.qaFiled),[]);assert.match(await p.locator('[data-status]').innerText(),/WRONG/);}
 await tap('[data-record="2"]');assert.equal(await p.evaluate(()=>window.qaDraft),2);assert.deepEqual(await p.evaluate(()=>window.qaFiled),[]);
 assert.equal(await p.locator('.reference-target').innerText(),target);
 await tap('[data-focus-key=leave]');assert.equal(await p.locator('.cross-reference-desk').count(),0);
 await show(2);await p.screenshot({path:out+'/'+name+'-correct.png'});
 await p.locator('[data-focus-key=file]').focus();await p.keyboard.press('Enter');
 assert.deepEqual(await p.evaluate(()=>window.qaFiled),[2]);
 await show(0);await pad(15);await pad(0);assert.equal(await p.evaluate(()=>window.qaDraft),2);
 assert.deepEqual(await p.evaluate(()=>window.qaFiled),[]);
 await pad(15);await pad(15);await pad(0);assert.deepEqual(await p.evaluate(()=>window.qaFiled),[2]);
 await show(2);await p.keyboard.press('Escape');assert.equal(await p.locator('.cross-reference-desk').count(),0);
 await show(2);await p.evaluate(()=>window.game.scene.stop('SilentReadScene'));assert.equal(await p.locator('.cross-reference-desk').count(),0);
 assert.deepEqual(errors,[]);results.push({name,rejectMissingAndWrong:true,explicitFiling:true,restore:true,citationUnchanged:true,cleanup:true});await p.close();
}await writeFile(out+'/result.json',JSON.stringify({scope:'Native desk fixtures, not earned campaign',results},null,2));console.log('PASS native cross reference: desktop, portrait, landscape');}finally{await browser.close();}
