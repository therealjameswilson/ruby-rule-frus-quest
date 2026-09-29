import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/frus-native-treatment',base=process.env.FRUS_QA_URL??'http://127.0.0.1:5221/';await mkdir(out,{recursive:true});
const b=await chromium.launch(),results=[];
try{for(const [name,width,height] of [['desktop',1280,900],['phone',375,667],['landscape',844,390]]){
const p=await b.newPage({viewport:{width,height},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.addInitScript(()=>{window.qaPad={id:'QA',index:0,connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.qaPad]});});
const pad=async(i)=>{await p.evaluate(i=>window.qaPad.buttons[i]={pressed:true,value:1},i);await p.waitForTimeout(100);await p.evaluate(i=>window.qaPad.buttons[i]={pressed:false,value:0},i);await p.waitForTimeout(100);};
await p.goto(new URL('?scene=ReferralVaultScene',base).href);await p.waitForFunction(()=>window.game?.scene.isActive('ReferralVaultScene'));await p.waitForTimeout(300);
const show=async(correct=false)=>{await p.evaluate(correct=>{const s=window.game.scene.getScene('ReferralVaultScene');s.dialog?.hide();window.qaFiles=0;window.qaDraft={permission:correct?'HOLD':'PRINT',withholding:correct?'APPEAL':'OMIT'};s.treatmentBoard.show(window.qaDraft,v=>window.qaDraft=v,()=>window.qaFiles++);},correct);await p.waitForTimeout(200);};
const tap=async(key)=>{const e=p.locator('.referral-treatment-desk [data-focus-key='+key+']');await e.scrollIntoViewIfNeeded();await e.tap();await p.waitForTimeout(100);};
await show();await p.screenshot({path:out+'/'+name+'-open.png'});
await tap('file');assert.equal(await p.evaluate(()=>window.qaFiles),0);assert.match(await p.locator('[data-status]').innerText(),/PERMISSION/);
await tap('permission');await tap('file');assert.equal(await p.evaluate(()=>window.qaFiles),0);assert.match(await p.locator('[data-status]').innerText(),/APPEAL/);
await tap('withholding');assert.deepEqual(await p.evaluate(()=>window.qaDraft),{permission:'HOLD',withholding:'APPEAL'});assert.equal(await p.evaluate(()=>window.qaFiles),0);
assert.match(await p.locator('[data-effect=withholding]').innerText(),/does not itself release/);
await p.screenshot({path:out+'/'+name+'-corrected.png'});
await tap('leave');await show(true);await p.locator('[data-focus-key=file]').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>window.qaFiles),1);
await show();await pad(0);await pad(15);await pad(0);await pad(15);await pad(0);assert.equal(await p.evaluate(()=>window.qaFiles),1);
await show();await p.keyboard.press('Escape');assert.equal(await p.locator('.referral-treatment-desk').count(),0);
await show();await p.evaluate(()=>window.game.scene.stop('ReferralVaultScene'));assert.equal(await p.locator('.referral-treatment-desk').count(),0);
assert.deepEqual(errors,[]);results.push({name,bothFieldsRequired:true,explicitFiling:true,restore:true,touchKeyboardController:true,cleanup:true});await p.close();
}await writeFile(out+'/result.json',JSON.stringify({scope:'Bounded treatment fixtures',results},null,2));console.log('PASS native treatment: case evidence, both limits and inputs');}finally{await b.close();}
