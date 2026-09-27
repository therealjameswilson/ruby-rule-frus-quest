import assert from 'node:assert/strict';import {readFile,mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5219/',out=process.env.FRUS_QA_OUT??'/tmp/frus-resume-card';await mkdir(out,{recursive:true});
const storage=JSON.parse(await readFile('/tmp/frus-fresh-opening/earned-storage.json','utf8'));const b=await chromium.launch({args:['--disable-audio-output']});const results=[];
try{for(const [name,width,height,touch] of [['desktop',1280,900,false],['phone',390,844,true],['landscape',844,390,true]]){
 const p=await b.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch,storageState:storage}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.addInitScript(()=>{window.qaPad={connected:false,index:0,id:'Resume controller',mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>window.qaPad.connected?[window.qaPad]:[]});});
 const pad=async i=>{await p.evaluate(i=>{window.qaPad.connected=true;window.qaPad.buttons[i]={pressed:true,value:1};},i);await p.waitForTimeout(150);await p.evaluate(i=>window.qaPad.buttons[i]={pressed:false,value:0},i);await p.waitForTimeout(150);};
 const click=async(x,y)=>{const r=await p.locator('canvas').first().boundingBox();if(touch)await p.touchscreen.tap(r.x+x*r.width/256,r.y+y*r.height/240);else await p.mouse.click(r.x+x*r.width/256,r.y+y*r.height/240);await p.waitForTimeout(200);};
 await p.goto(base);await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await p.waitForSelector('#boot-loader',{state:'hidden'});
 const original=await p.evaluate(()=>localStorage.getItem('rubyRuleFrusQuestSave'));
 const info=await p.evaluate(()=>{const s=window.game.scene.getScene('TapToStartScene');return Object.fromEntries(['resume-name','resume-location','resume-progress','resume-objective','resume-compiler','resume-continue-button','resume-new-button'].map(k=>{const o=s.children.getByName(k),r=o.getBounds();return[k,{text:o.text,key:o.texture?.key,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}];}));});
 for(const o of Object.values(info)){assert(o.x>=0&&o.right<=256&&o.y>=0&&o.bottom<=240,JSON.stringify(o));}
 assert.equal(info['resume-name'].text,JSON.parse(original).state.playerProfile.displayName);assert.equal(info['resume-objective'].text,JSON.parse(original).state.objective);
 await p.screenshot({path:out+'/'+name+'.png'});
 await click(170,154);assert(await p.evaluate(()=>window.game.scene.getScene('TapToStartScene').confirmingNew));assert.equal(await p.evaluate(()=>localStorage.getItem('rubyRuleFrusQuestSave')),original);await p.screenshot({path:out+'/'+name+'-confirm.png'});
 await click(220,32);assert(await p.evaluate(()=>window.game.scene.getScene('TapToStartScene').confirmingNew));assert.equal(await p.evaluate(()=>localStorage.getItem('rubyRuleFrusQuestSave')),original);
 await click(86,154);assert(!await p.evaluate(()=>window.game.scene.getScene('TapToStartScene').confirmingNew));
 if(!touch){
   await p.keyboard.press('f');
   await p.waitForFunction(()=>Boolean(document.fullscreenElement));
   await pad(15);
   await pad(0);
   await p.waitForFunction(()=>window.game.scene.getScene('TapToStartScene').confirmingNew);
   await pad(1);
   await p.waitForFunction(()=>!window.game.scene.getScene('TapToStartScene').confirmingNew);
   await p.keyboard.press('ArrowDown');
   await p.waitForFunction(()=>window.game.scene.getScene('TapToStartScene').selectedAction==='new');
   await p.keyboard.press('Enter');
   await p.waitForFunction(()=>window.game.scene.getScene('TapToStartScene').confirmingNew);
   await p.keyboard.press('b');
   await p.waitForFunction(()=>!window.game.scene.getScene('TapToStartScene').confirmingNew);
   await p.keyboard.press('Enter');
 }else await click(86,154);
 await p.waitForFunction(()=>window.game.scene.isActive('ArchiveScene'));assert.equal(JSON.parse(await p.evaluate(()=>window.render_game_to_text())).documentPoints,JSON.parse(original).state.documentPoints);
 assert.deepEqual(errors,[]);results.push({name,info,continued:true,cancelPreservedSave:true,errors});await p.close();
}
// A fixture variant checks the saved appearance and a long real objective.
const variant=structuredClone(storage);
const savedItem=variant.origins.flatMap(o=>o.localStorage).find(i=>i.name==='rubyRuleFrusQuestSave');
const savedData=JSON.parse(savedItem.value);
savedData.state.playerProfile.compilerAppearance='compiler_clara';
savedData.state.objective='Embassy cable copied into the collection notes. Finish formal collection at the Office desk.';
savedItem.value=JSON.stringify(savedData);
const variantPage=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,storageState:variant});
await variantPage.goto(base);
await variantPage.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));
await variantPage.waitForSelector('#boot-loader',{state:'hidden'});
const variantInfo=await variantPage.evaluate(()=>{
 const scene=window.game.scene.getScene('TapToStartScene');
 const text=scene.children.getByName('resume-objective'),bounds=text.getBounds();
 return {portrait:scene.children.getByName('resume-compiler').texture.key,objective:text.text,bottom:bounds.bottom};
});
assert.equal(variantInfo.portrait,'compiler_clara_hd');
assert.equal(variantInfo.objective,savedData.state.objective);
assert(variantInfo.bottom<=225,JSON.stringify(variantInfo));
await variantPage.screenshot({path:out+'/phone-long-objective.png'});
await writeFile(out+'/appearance-check.json',JSON.stringify(variantInfo,null,2));
await variantPage.close();
// Explicit replacement is isolated to a fixture context.
const p=await b.newPage({storageState:storage});await p.goto(base);await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await p.keyboard.press('ArrowRight');await p.keyboard.press('Enter');await p.waitForTimeout(150);await p.keyboard.press('ArrowRight');await p.keyboard.press('Enter');await p.waitForFunction(()=>window.game.scene.isActive('TitleScene'));assert.equal(await p.evaluate(()=>localStorage.getItem('rubyRuleFrusQuestSave')),null);await p.close();
}finally{await b.close();}await writeFile(out+'/result.json',JSON.stringify({results,replacementConfirmed:true},null,2));console.log(JSON.stringify({passed:results.map(r=>r.name),replacementConfirmed:true}));
