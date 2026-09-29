import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/frus-native-manifest',base=process.env.FRUS_QA_URL??'http://127.0.0.1:5221/';await mkdir(out,{recursive:true});
const b=await chromium.launch(),results=[];
try{for(const [name,width,height] of [['desktop',1280,900],['phone',375,667],['landscape',844,390]]){
const p=await b.newPage({viewport:{width,height},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.addInitScript(()=>{window.qaPad={id:'QA',index:0,connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.qaPad]});});
const pad=async(i)=>{await p.evaluate(i=>window.qaPad.buttons[i]={pressed:true,value:1},i);await p.waitForTimeout(100);await p.evaluate(i=>window.qaPad.buttons[i]={pressed:false,value:0},i);await p.waitForTimeout(100);};
await p.goto(new URL('?scene=ReferralVaultScene',base).href);await p.waitForFunction(()=>window.game?.scene.isActive('ReferralVaultScene'));await p.waitForTimeout(300);
const show=async(evidence,correct=false)=>{await p.evaluate(({evidence,correct})=>{const s=window.game.scene.getScene('ReferralVaultScene');s.dialog?.hide();window.qaFiles=[];window.qaDraft={intelligence_annex:'CIA',base_access_memo:'DOD',white_house_minutes:correct?'NSC':'CIA'};s.manifestBoard.show(window.qaDraft,v=>window.qaDraft=v,v=>window.qaFiles.push(v),evidence);},{evidence,correct});await p.waitForTimeout(200);};
const tap=async(selector)=>{const e=p.locator('.referral-manifest-desk '+selector);await e.scrollIntoViewIfNeeded();await e.tap();await p.waitForTimeout(100);};
await show(false,true);await tap('[data-focus-key=file]');assert.deepEqual(await p.evaluate(()=>window.qaFiles),[]);assert.match(await p.locator('[data-status]').innerText(),/dispatch copy/);await tap('[data-focus-key=leave]');
await show(true);await tap('[data-focus-key=file]');assert.deepEqual(await p.evaluate(()=>window.qaFiles),[]);
await tap('[data-route="2"]');await tap('[data-route="2"]');assert.equal(await p.evaluate(()=>window.qaDraft.white_house_minutes),'NSC');assert.deepEqual(await p.evaluate(()=>window.qaFiles),[]);
assert.match(await p.locator('[data-evidence]').innerText(),/WH MINUTES > NSC/);
assert(await p.locator('[data-evidence]').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));
await p.screenshot({path:out+'/'+name+'-corrected.png'});await tap('[data-focus-key=leave]');
await show(true,true);await p.locator('[data-focus-key=file]').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>window.qaFiles.length),1);
await show(true);await pad(15);await pad(15);await pad(0);await pad(0);assert.equal(await p.evaluate(()=>window.qaDraft.white_house_minutes),'NSC');await pad(15);await pad(0);assert.equal(await p.evaluate(()=>window.qaFiles.length),1);
await show(true);await p.keyboard.press('Escape');assert.equal(await p.locator('.referral-manifest-desk').count(),0);
await show(true);await p.evaluate(()=>window.game.scene.stop('ReferralVaultScene'));assert.equal(await p.locator('.referral-manifest-desk').count(),0);
assert.deepEqual(errors,[]);results.push({name,evidenceRequired:true,routesMustMatch:true,explicitFiling:true,touchKeyboardController:true,cleanup:true});await p.close();
}await writeFile(out+'/result.json',JSON.stringify({scope:'Bounded referral manifest fixtures',results},null,2));console.log('PASS native manifest: evidence gate, routes and inputs');}finally{await b.close();}
