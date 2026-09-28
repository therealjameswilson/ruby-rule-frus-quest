import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/frus-native-editorial-repair',base=process.env.FRUS_QA_URL??'http://127.0.0.1:5221/';await mkdir(out,{recursive:true});
const b=await chromium.launch(),results=[];
try{for(const [name,width,height] of [['desktop',1280,900],['phone',375,667],['landscape',844,390]]){
const p=await b.newPage({viewport:{width,height},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.addInitScript(()=>{window.qaPad={id:'QA',index:0,connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.qaPad]});});
const pad=async(i)=>{await p.evaluate(i=>window.qaPad.buttons[i]={pressed:true,value:1},i);await p.waitForTimeout(100);await p.evaluate(i=>window.qaPad.buttons[i]={pressed:false,value:0},i);await p.waitForTimeout(100);};
await p.goto(new URL('?scene=SilentReadScene',base).href);await p.waitForFunction(()=>window.game?.scene.isActive('SilentReadScene'));await p.waitForTimeout(300);
for(const record of [
{documentId:'source_note_047',label:'SOURCE NOTE 47',evidence:'3 LINES REMAIN CLASSIFIED',indication:'[3 lines not declassified]'},
{documentId:'sbu_annotation_001',label:'REFERRAL NOTE',evidence:'TEXT WITHHELD / EXTENT UNKNOWN',indication:'[Text not declassified]'}]){
const show=async(repaired=false,proof=false)=>{await p.evaluate(({record,repaired,proof})=>{const s=window.game.scene.getScene('SilentReadScene');s.dialog?.hide();window.qaChanges=0;window.qaFiles=0;s.editorialBoard.show(record,repaired,proof,()=>window.qaChanges++,()=>window.qaFiles++);},{record,repaired,proof});await p.waitForTimeout(200);};
const tap=async(key)=>{const e=p.locator('.editorial-repair-desk [data-focus-key='+key+']');await e.scrollIntoViewIfNeeded();await e.tap();await p.waitForTimeout(100);};
await show();await tap('file');assert.equal(await p.evaluate(()=>window.qaFiles),0);await tap('repair');
assert.equal(await p.evaluate(()=>window.qaChanges),1);assert.equal(await p.evaluate(()=>window.qaFiles),0);
assert.equal(await p.locator('[data-indication] em').innerText(),record.indication);
assert.equal(await p.locator('[data-indication] em').evaluate(e=>getComputedStyle(e).fontStyle),'italic');
assert.equal(await p.locator('[data-evidence]').innerText(),record.evidence);
await p.screenshot({path:out+'/'+name+'-'+record.documentId+'-draft.png'});
await tap('leave');await show(true);await p.locator('[data-focus-key=file]').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>window.qaFiles),1);
await show(false,true);assert(await p.locator('[data-focus-key=repair]').isHidden());await tap('file');assert.equal(await p.evaluate(()=>window.qaFiles),0);assert.match(await p.locator('[data-status]').innerText(),/editor desk/);await tap('leave');
await show(true,true);await p.screenshot({path:out+'/'+name+'-'+record.documentId+'-proof.png'});await pad(0);assert.equal(await p.evaluate(()=>window.qaFiles),1);assert.equal(await p.evaluate(()=>window.qaChanges),0);
await show();await pad(0);await pad(15);await pad(0);assert.equal(await p.evaluate(()=>window.qaChanges),1);assert.equal(await p.evaluate(()=>window.qaFiles),1);
await show();await p.keyboard.press('Escape');assert.equal(await p.locator('.editorial-repair-desk').count(),0);
results.push({name,record:record.documentId,visibleItalic:true,separateDraftAndProof:true,noProofTableEdit:true,touchKeyboardController:true});
}
await p.evaluate(()=>window.game.scene.stop('SilentReadScene'));assert.deepEqual(errors,[]);await p.close();
}await writeFile(out+'/result.json',JSON.stringify({scope:'Bounded native editorial repair fixtures',results},null,2));console.log('PASS editorial repair: two records, three layouts, draft/proof decisions');}finally{await b.close();}
