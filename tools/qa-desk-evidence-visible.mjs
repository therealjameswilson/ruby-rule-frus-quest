import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5221/',out=process.env.FRUS_QA_OUT??'/tmp/frus-desk-evidence-visible';
await mkdir(out,{recursive:true});const browser=await chromium.launch(),results=[];
try{for(const [name,width,height] of [['desktop',1280,900],['phone',375,667],['landscape',844,390],['small-phone',320,568]]){
 const p=await browser.newPage({viewport:{width,height},hasTouch:true}),errors=[];
 p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(new URL('?scene=SilentReadScene',base).href);await p.waitForFunction(()=>window.game?.scene.isActive('SilentReadScene'));await p.waitForTimeout(300);
 for(const [kind,board,draft,selector,expected] of [
 ['reference','crossReferenceBoard',0,'[data-record="3"]','BERLIN MEMCON / 10 JAN'],
 ['release','releaseScopeBoard',7,'[data-part="2"]','RELEASE NOTE: SECTION B ONLY']]){
 await p.evaluate(({board,draft})=>{const s=window.game.scene.getScene('SilentReadScene');s.dialog?.hide();window.qaFiled=[];s[board].show(draft,v=>window.qaDraft=v,v=>window.qaFiled.push(v));},{board,draft});await p.waitForTimeout(200);
 const summary=p.locator('[data-evidence-summary]');assert.equal(await summary.innerText(),expected);
 const target=p.locator(selector);await target.scrollIntoViewIfNeeded();await target.tap();await p.waitForTimeout(100);
 const assertInView=async(selector)=>assert(await p.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&r.width>0&&r.height>0;}),name+' '+kind+' '+selector+' in view');
 await assertInView('.desk-evidence-strip');await assertInView('[data-focus-key=file]');await assertInView(selector);
 assert.equal(await summary.innerText(),expected);assert.deepEqual(await p.evaluate(()=>window.qaFiled),[]);
 assert(await p.locator('.manuscript-body').evaluate(e=>e.clientHeight>=100),'Reading viewport must remain usable');
 await p.screenshot({path:out+'/'+name+'-'+kind+'.png'});
 await p.locator('[data-focus-key=file]').tap();assert.deepEqual(await p.evaluate(()=>window.qaFiled),[]);
 await assertInView('.desk-evidence-strip');assert.equal(await summary.innerText(),expected);
 await p.locator('[data-focus-key=leave]').tap();results.push({name,kind,evidenceVisibleWhileComparing:true,unchangedAfterWrongFiling:true});
 }
 assert.deepEqual(errors,[]);await p.close();
}await writeFile(out+'/result.json',JSON.stringify({scope:'Bounded scrolling and comparison fixtures',results},null,2));console.log('PASS persistent comparison evidence: two desks, four layouts');}finally{await browser.close();}
