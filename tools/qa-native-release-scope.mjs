import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5217/',out=process.env.FRUS_QA_OUT??'/tmp/frus-native-release-scope';
await mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const [name,width,height] of [['desktop',1280,900],['phone',375,667],['landscape',844,390]]){
 const p=await browser.newPage({viewport:{width,height},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.addInitScript(()=>{window.qaPad={id:'QA controller',index:0,connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.qaPad]});});
 const pad=async(index)=>{await p.evaluate(i=>window.qaPad.buttons[i]={pressed:true,value:1},index);await p.waitForTimeout(100);await p.evaluate(i=>window.qaPad.buttons[i]={pressed:false,value:0},index);await p.waitForTimeout(100);};
 await p.goto(new URL('?scene=SilentReadScene',base).href);
 await p.waitForFunction(()=>window.game?.scene.isActive('SilentReadScene'));await p.waitForTimeout(400);
 const show=async(mask)=>{await p.evaluate(mask=>{const s=window.game.scene.getScene('SilentReadScene');s.dialog?.hide();window.qaDraft=mask;window.qaFiled=[];s.releaseScopeBoard.show(mask,v=>window.qaDraft=v,v=>window.qaFiled.push(v));},mask);await p.waitForTimeout(200);};
 const tap=async(selector)=>{const e=p.locator('.release-scope-desk '+selector);await e.scrollIntoViewIfNeeded();await e.tap();await p.waitForTimeout(120);};
 await show(undefined);
 const authority=await p.locator('.release-authorization').innerText();
 await p.screenshot({path:out+'/'+name+'-open.png'});
 for(const selector of ['[data-focus-key=file]','[data-focus-key=leave]','[data-part="0"]']){const r=await p.locator('.release-scope-desk '+selector).boundingBox();assert(r.width>=44&&r.height>=44);}
 await tap('[data-focus-key=file]');assert.deepEqual(await p.evaluate(()=>window.qaFiled),[]);
 for(const i of [0,1,2])await tap('[data-part="'+i+'"]');
 await tap('[data-focus-key=file]');assert.match(await p.locator('[data-status]').innerText(),/KEEP THE CLEARED EXCERPT/);
 await tap('[data-part="1"]');assert.equal(await p.evaluate(()=>window.qaDraft),2);assert.deepEqual(await p.evaluate(()=>window.qaFiled),[]);
 assert.equal(await p.locator('.release-authorization').innerText(),authority);
 await tap('[data-focus-key=leave]');assert.equal(await p.locator('.release-scope-desk').count(),0);
 await show(2);await p.screenshot({path:out+'/'+name+'-correct.png'});
 await p.locator('[data-focus-key=file]').focus();await p.keyboard.press('Enter');
 assert.deepEqual(await p.evaluate(()=>window.qaFiled),[2]);
 await show(2);await pad(0);assert.equal(await p.evaluate(()=>window.qaDraft),3);
 await pad(0);assert.equal(await p.evaluate(()=>window.qaDraft),2);
 await pad(15);await pad(15);await pad(15);await pad(0);assert.deepEqual(await p.evaluate(()=>window.qaFiled),[2]);
 await show(2);await p.keyboard.press('Escape');assert.equal(await p.locator('.release-scope-desk').count(),0);
 await show(2);await p.evaluate(()=>window.game.scene.stop('SilentReadScene'));assert.equal(await p.locator('.release-scope-desk').count(),0);
 assert.deepEqual(errors,[]);results.push({name,rejectAllAndNone:true,explicitFiling:true,restore:true,authorizationUnchanged:true,cleanup:true});await p.close();
}await writeFile(out+'/result.json',JSON.stringify({scope:'Native desk fixtures, not earned campaign',results},null,2));console.log('PASS native release scope: desktop, portrait, landscape');}finally{await browser.close();}
