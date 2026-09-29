import assert from 'node:assert/strict';import{mkdir,writeFile}from'node:fs/promises';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5235/',out=process.env.FRUS_QA_OUT??'/tmp/frus-selection-coverage';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),rows=[],errors=[];
try{for(const[layout,width,height]of[['phone',375,667],['small',320,568],['landscape',844,390],['desktop',1280,900]]){
 const p=await browser.newPage({viewport:{width,height},hasTouch:true});p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(new URL('?scene=ArchiveScene',base).href);await p.waitForFunction(()=>window.game?.scene.isActive('ArchiveScene'));
 await p.evaluate(()=>{window.qaDraft={};window.qaSubmitted=0;});
 const open=async()=>{await p.evaluate(()=>{const s=window.game.scene.getScene('ArchiveScene');s.dialog.hide();s.researchChoice.showManuscriptDesk(window.qaDraft,()=>{},()=>{window.qaSubmitted++;s.resumeArchiveReview();},()=>s.resumeArchiveReview());});await p.waitForTimeout(260);};
 await open();await p.locator('[data-packet=approval] .manuscript-placement').tap();assert.match(await p.locator('[data-pages]').innerText(),/1,180/);
 assert.equal(await p.locator('[data-coverage-id=B]').getAttribute('data-printed'),'true');
 for(const id of ['A','C'])assert.equal(await p.locator(`[data-coverage-id=${id}]`).getAttribute('data-printed'),'false');
 await p.locator('.manuscript-submit').tap();assert.match(await p.locator('[data-status]').innerText(),/decision story is incomplete/);
 assert.equal(await p.evaluate(()=>window.qaSubmitted),0);
 const submitBounds=await p.locator('.manuscript-submit').boundingBox();assert(submitBounds.y+submitBounds.height<=height,'Filing button must stay fully visible');
 await p.screenshot({path:`${out}/${layout}-approval-only.png`});
 await p.locator('.manuscript-close').tap();await p.evaluate(()=>window.qaDraft=JSON.parse(JSON.stringify(window.qaDraft)));await open();
 assert.equal(await p.locator('[data-packet=approval]').getAttribute('aria-pressed'),'true');
 await p.locator('[data-packet=decision] .manuscript-placement').tap();await p.locator('.manuscript-submit').tap();
 assert.match(await p.locator('[data-pages]').innerText(),/1,400/);assert.match(await p.locator('[data-status]').innerText(),/selected twice/);
 assert.equal(await p.evaluate(()=>window.qaSubmitted),0);
 await p.screenshot({path:`${out}/${layout}-duplicate.png`});
 await p.locator('[data-packet=approval] .manuscript-placement').tap();await p.locator('.manuscript-submit').tap();
 assert.equal(await p.evaluate(()=>window.qaSubmitted),1);assert.equal(await p.locator('.manuscript-desk').count(),0);
 rows.push({layout,approvalRejected:true,duplicateRejected:true,draftRestored:true,correctedFiled:true});await p.close();
}assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({scope:'Four native selection fixtures with isolated draft; earned progression checked separately',rows,errors},null,2));console.log(JSON.stringify({cases:rows.length,errors}));}finally{await browser.close();}
