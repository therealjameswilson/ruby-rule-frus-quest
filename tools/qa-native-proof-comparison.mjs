import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/frus-native-proof',base=process.env.FRUS_QA_URL??'http://127.0.0.1:5221/';await mkdir(out,{recursive:true});
const b=await chromium.launch(),results=[];
try{for(const [name,width,height] of [['desktop',1280,900],['phone',375,667],['landscape',844,390]]){
const p=await b.newPage({viewport:{width,height},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.addInitScript(()=>{window.qaPad={id:'QA',index:0,connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.qaPad]});});
const pad=async(i)=>{await p.evaluate(i=>window.qaPad.buttons[i]={pressed:true,value:1},i);await p.waitForTimeout(100);await p.evaluate(i=>window.qaPad.buttons[i]={pressed:false,value:0},i);await p.waitForTimeout(100);};
await p.goto(new URL('?scene=SilentReadScene',base).href);await p.waitForFunction(()=>window.game?.scene.isActive('SilentReadScene'));await p.waitForTimeout(300);
const show=async(draft)=>{await p.evaluate(d=>{const s=window.game.scene.getScene('SilentReadScene');s.dialog?.hide();window.qaDraft=d;window.qaFiled=[];s.proofBoard.show(d,v=>window.qaDraft=v,v=>window.qaFiled.push(v));},draft);await p.waitForTimeout(200);};
const touch=async(selector)=>{const e=p.locator('.proof-comparison-desk '+selector);await e.scrollIntoViewIfNeeded();await e.tap();await p.waitForTimeout(100);};
await show(0);await p.screenshot({path:out+'/'+name+'-open.png'});
assert.equal(await p.locator('[data-original]').innerText(),'Secto 214 — We may agree.');
await touch('[data-focus-key=file]');assert.deepEqual(await p.evaluate(()=>window.qaFiled),[]);
await touch('[data-fragment="1"]');assert.equal(await p.evaluate(()=>window.qaDraft),0);
await touch('[data-fragment="0"]');assert.equal(await p.evaluate(()=>window.qaDraft),1);
await touch('[data-focus-key=file]');assert.deepEqual(await p.evaluate(()=>window.qaFiled),[]);
await touch('[data-fragment="2"]');assert.equal(await p.evaluate(()=>window.qaDraft),3);assert.match(await p.locator('[data-status]').innerText(),/tentative/);
assert.deepEqual(await p.evaluate(()=>window.qaFiled),[]);assert.equal(await p.locator('[data-original]').innerText(),'Secto 214 — We may agree.');
for(const selector of ['[data-original]','[data-focus-key=file]'])assert(await p.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));
await p.screenshot({path:out+'/'+name+'-repaired.png'});
await touch('[data-focus-key=leave]');await show(3);
await p.locator('[data-focus-key=file]').focus();await p.keyboard.press('Enter');assert.deepEqual(await p.evaluate(()=>window.qaFiled),[3]);
await show(0);await pad(0);await pad(15);await pad(15);await pad(0);assert.equal(await p.evaluate(()=>window.qaDraft),3);
await pad(15);await pad(15);await pad(0);assert.deepEqual(await p.evaluate(()=>window.qaFiled),[3]);
await show(1);await p.keyboard.press('Escape');assert.equal(await p.locator('.proof-comparison-desk').count(),0);
await show(1);await p.evaluate(()=>window.game.scene.stop('SilentReadScene'));assert.equal(await p.locator('.proof-comparison-desk').count(),0);
assert.deepEqual(errors,[]);results.push({name,faithfulUnchanged:true,twoRepairsRequired:true,explicitFiling:true,restore:true,touchKeyboardController:true});await p.close();
}await writeFile(out+'/result.json',JSON.stringify({scope:'Bounded native proof fixtures',results},null,2));console.log('PASS native proof comparison: three layouts, corrections and input');}finally{await b.close();}
