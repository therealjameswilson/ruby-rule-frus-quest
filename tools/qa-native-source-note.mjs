import assert from 'node:assert/strict';import{mkdir,writeFile}from'node:fs/promises';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');const out=process.env.FRUS_QA_OUT??'/tmp/frus-native-source-note',base=process.env.FRUS_QA_URL??'http://127.0.0.1:5217/';await mkdir(out,{recursive:true});const b=await chromium.launch(),results=[];
try{for(const[name,width,height]of[['desktop',1280,900],['phone',375,667],['small-phone',320,568],['landscape',844,390]]){
 const p=await b.newPage({viewport:{width,height},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.addInitScript(()=>{window.qaPad={id:'QA',index:0,connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.qaPad]});});
 const pad=async i=>{await p.evaluate(i=>window.qaPad.buttons[i]={pressed:true,value:1},i);await p.waitForTimeout(100);await p.evaluate(i=>window.qaPad.buttons[i]={pressed:false,value:0},i);await p.waitForTimeout(100);};
 await p.goto(new URL('?scene=ArchiveScene',base).href);await p.waitForFunction(()=>window.game?.scene.isActive('ArchiveScene'));await p.waitForTimeout(300);
 const show=async corrected=>{await p.evaluate(corrected=>{const s=window.game.scene.getScene('ArchiveScene');s.dialog?.hide();window.qaChanged=0;window.qaFiled=0;window.qaCancelled=0;s.sourceNoteBoard.show(corrected,()=>window.qaChanged++,()=>window.qaFiled++,()=>window.qaCancelled++);},corrected);await p.waitForTimeout(200);};
 const tap=async key=>{const e=p.locator('.source-note-desk [data-focus-key='+key+']');await e.scrollIntoViewIfNeeded();await e.tap();await p.waitForTimeout(120);};
 await show(false);await p.screenshot({path:out+'/'+name+'-evidence.png'});
 assert.match(await p.locator('.note47-evidence').innerText(),/Original classification\nNot recorded/);assert.match(await p.locator('.note47-evidence').innerText(),/complete first footnote/);
 await tap('file');assert.equal(await p.evaluate(()=>window.qaFiled),0);assert.match(await p.locator('[data-status]').innerText(),/readership/);
 await tap('repair');assert.equal(await p.evaluate(()=>window.qaChanged),1);assert.equal(await p.evaluate(()=>window.qaFiled),0);assert.match(await p.locator('[data-effect]').innerText(),/does not mean/);
 const strip=await p.locator('.desk-evidence-strip').boundingBox(),file=await p.locator('[data-focus-key=file]').boundingBox();assert(strip.y>=0&&strip.y+strip.height<height);assert(file.height>=44&&file.y+file.height<=height);
 await p.screenshot({path:out+'/'+name+'-corrected.png'});await tap('leave');assert.equal(await p.evaluate(()=>window.qaCancelled),1);
 await show(true);await p.locator('[data-focus-key=file]').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>window.qaFiled),1);
 await show(false);await pad(0);await pad(15);await pad(0);assert.equal(await p.evaluate(()=>window.qaFiled),1);
 await show(false);await p.keyboard.press('Escape');assert.equal(await p.locator('.source-note-desk').count(),0);
 await show(false);await p.evaluate(()=>window.game.scene.stop('ArchiveScene'));assert.equal(await p.locator('.source-note-desk').count(),0);
 assert.deepEqual(errors,[]);results.push({name,evidenceLimits:true,separateFiling:true,restore:true,touchKeyboardController:true,cleanup:true,errors});await p.close();
}await writeFile(out+'/result.json',JSON.stringify({scope:'Bounded source-note UI fixtures; not earned progression',results},null,2));console.log('PASS native source note: four layouts and inputs');}finally{await b.close();}
