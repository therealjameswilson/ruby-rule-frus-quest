import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/frus-research-edit-audio';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--disable-audio-output']});
try{
 const p=await browser.newPage({viewport:{width:375,height:667},hasTouch:true}),errors=[],results=[];
 p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(new URL('?scene=SilentReadScene&text=full',process.env.FRUS_QA_URL??'http://127.0.0.1:5221/').href);
 await p.waitForFunction(()=>window.game?.scene.isActive('SilentReadScene'));await p.waitForTimeout(300);
 for(const [board,draft,selector,sound] of [
 ['crossReferenceBoard',0,'[data-record="1"]','paper packet pickup'],
 ['releaseScopeBoard',7,'[data-part="0"]','quiet annotation mark'],
 ['chronologyBoard',3,'[data-focus-key=earlier]','paper page turn']]){
 await p.evaluate(({board,draft})=>{const s=window.game.scene.getScene('SilentReadScene');s.dialog?.hide();window.qaChanges=[];window.qaFiles=[];s[board].show(draft,v=>window.qaChanges.push(v),v=>window.qaFiles.push(v));},{board,draft});await p.waitForTimeout(200);
 const edit=p.locator(selector);await edit.scrollIntoViewIfNeeded();await edit.tap();await p.waitForTimeout(100);
 const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
 assert.equal((await state()).audioStatus,sound);assert.deepEqual(await p.evaluate(()=>window.qaFiles),[]);
 if(board==='crossReferenceBoard'){await edit.tap();assert.deepEqual(await p.evaluate(()=>window.qaChanges),[1]);}
 if(board!=='chronologyBoard'){await p.locator('[data-focus-key=file]').tap();assert.equal((await state()).audioStatus,'warning tone');assert.deepEqual(await p.evaluate(()=>window.qaFiles),[]);}
 await p.screenshot({path:out+'/'+board+'.png'});
 await p.locator('[data-focus-key=leave]').tap();results.push({board,sound,draftOnly:true});
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({scope:'Actual desk actions and audio dispatch, not listening approval',results,errors},null,2));console.log('PASS research edit audio dispatch and unfiled decisions');
}finally{await browser.close();}
