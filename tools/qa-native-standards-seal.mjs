import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/frus-native-standards-seal',base=process.env.FRUS_QA_URL??'http://127.0.0.1:5221/';await mkdir(out,{recursive:true});
const b=await chromium.launch(),results=[];
try{for(const [name,width,height] of [['desktop',1280,900],['phone',375,667],['landscape',844,390]]){
 const p=await b.newPage({viewport:{width,height},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.addInitScript(()=>{window.qaPad={id:'QA',index:0,connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.qaPad]});});
 const pad=async(i)=>{await p.evaluate(i=>window.qaPad.buttons[i]={pressed:true,value:1},i);await p.waitForTimeout(100);await p.evaluate(i=>window.qaPad.buttons[i]={pressed:false,value:0},i);await p.waitForTimeout(100);};
 await p.goto(new URL('?scene=EndingScene',base).href);await p.waitForFunction(()=>window.game?.scene.isActive('EndingScene'));await p.waitForTimeout(300);
 const show=async()=>{await p.evaluate(()=>{const s=window.game.scene.getScene('EndingScene');s.dialog?.hide();window.qaEvidence={documents:5,proofed:5,equities:2,resolved:2,hiddenCuts:0,unresolved:0,ready:true};window.qaSealed=0;window.qaLeft=0;s.standardsBoard.show(()=>window.qaEvidence,()=>window.qaSealed++,()=>window.qaLeft++);});await p.waitForTimeout(200);};
 await show();assert.equal(await p.locator('.binding-check[data-complete=true]').count(),4);assert.equal(await p.evaluate(()=>window.qaSealed),0);
 await p.screenshot({path:out+'/'+name+'-ready.png'});
 await p.evaluate(()=>Object.assign(window.qaEvidence,{hiddenCuts:1,ready:false}));await p.locator('[data-focus-key=seal]').tap();
 assert.equal(await p.evaluate(()=>window.qaSealed),0);assert.equal(await p.locator('.binding-check[data-complete=false]').count(),1);
 assert.match(await p.locator('.binding-check[data-complete=false]').innerText(),/Undisclosed cuts/);
 await p.locator('.manuscript-body').evaluate(e=>e.scrollTop=e.scrollHeight);
 await p.screenshot({path:out+'/'+name+'-blocked.png'});
 for(const selector of ['[data-focus-key=seal]','[data-focus-key=leave]']){const r=await p.locator(selector).boundingBox();assert(r.width>=44&&r.height>=44&&r.y>=0&&r.y+r.height<=height);}
 await p.locator('[data-focus-key=leave]').tap();assert.equal(await p.evaluate(()=>window.qaLeft),1);assert.equal(await p.locator('.binding-certification-desk').count(),0);
 await show();await p.locator('[data-focus-key=seal]').tap();assert.equal(await p.evaluate(()=>window.qaSealed),1);
 await show();for(let i=0;i<8;i++)await pad(13);assert.equal(await p.evaluate(()=>window.qaSealed),0);
 await p.locator('[data-focus-key=seal]').focus();await pad(0);assert.equal(await p.evaluate(()=>window.qaSealed),1);
 await show();await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>window.qaLeft),1);
 await show();await p.evaluate(()=>window.game.scene.stop('EndingScene'));assert.equal(await p.locator('.binding-certification-desk').count(),0);
 assert.deepEqual(errors,[]);results.push({name,liveRecheck:true,blockedRecordVisible:true,explicitSeal:true,touchKeyboardController:true,cleanup:true});await p.close();
}await writeFile(out+'/result.json',JSON.stringify({scope:'Bounded standards seal fixtures, not earned publication',results},null,2));console.log('PASS standards seal live evidence and native inputs');}finally{await b.close();}
