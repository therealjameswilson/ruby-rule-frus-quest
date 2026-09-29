import assert from 'node:assert/strict';import{mkdir,writeFile}from'node:fs/promises';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');const out=process.env.FRUS_QA_OUT??'/tmp/frus-native-annotation-packet',base=process.env.FRUS_QA_URL??'http://127.0.0.1:5217/';await mkdir(out,{recursive:true});const b=await chromium.launch(),results=[];
try{for(const[name,width,height]of[['desktop',1280,900],['phone',375,667],['small-phone',320,568],['landscape',844,390]]){
 const p=await b.newPage({viewport:{width,height},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.addInitScript(()=>{window.qaPad={id:'QA',index:0,connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.qaPad]});});
 const pad=async i=>{await p.evaluate(i=>window.qaPad.buttons[i]={pressed:true,value:1},i);await p.waitForTimeout(100);await p.evaluate(i=>window.qaPad.buttons[i]={pressed:false,value:0},i);await p.waitForTimeout(100);};
 await p.goto(new URL('?scene=ArchiveScene',base).href);await p.waitForFunction(()=>window.game?.scene.isActive('ArchiveScene'));await p.waitForTimeout(300);
 const show=async()=>{await p.evaluate(()=>{const s=window.game.scene.getScene('ArchiveScene');s.dialog?.hide();window.qaFiled=0;window.qaDecisions=[];s.annotationPacketDesk.show(v=>{window.qaDecisions.push(v);return {ok:v==='coverage',message:'Keep repositories and gaps visible.'};},()=>window.qaFiled++,()=>{});});await p.waitForTimeout(200);};
 const tap=async key=>{const e=p.locator('.annotation-packet-desk [data-focus-key='+key+']');await e.scrollIntoViewIfNeeded();await e.tap();await p.waitForTimeout(120);};
 await show();await p.screenshot({path:out+'/'+name+'-notes.png'});assert.equal(await p.locator('.annotation-note-summary article').count(),3);assert.match(await p.locator('.annotation-map').innerText(),/leads to investigate/);
 await tap('file');assert.equal(await p.evaluate(()=>window.qaDecisions.length),0);
 await tap('single_folder');await tap('file');assert.equal(await p.evaluate(()=>window.qaFiled),0);await tap('coverage');assert.equal(await p.evaluate(()=>window.qaFiled),0);
 await p.screenshot({path:out+'/'+name+'-map.png'});const strip=await p.locator('.desk-evidence-strip').boundingBox();assert(strip.y>=0&&strip.y+strip.height<height);
 await tap('leave');await show();assert.equal(await p.locator('[aria-pressed=true]').count(),0);await tap('coverage');await p.locator('[data-focus-key=file]').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>window.qaFiled),1);
 await show();await pad(15);await pad(0);await pad(15);await pad(0);assert.equal(await p.evaluate(()=>window.qaFiled),1);
 await show();await p.keyboard.press('Escape');assert.equal(await p.locator('.annotation-packet-desk').count(),0);
 await show();await p.evaluate(()=>window.game.scene.stop('ArchiveScene'));assert.equal(await p.locator('.annotation-packet-desk').count(),0);assert.deepEqual(errors,[]);results.push({name,notesReadable:true,leadsNotExamined:true,explicitFiling:true,noApprovalOnCancel:true,touchKeyboardController:true,errors});await p.close();
}await writeFile(out+'/result.json',JSON.stringify({scope:'Bounded packet UI fixtures; not earned progression',results},null,2));console.log('PASS annotation packet four layouts and inputs');}finally{await b.close();}
