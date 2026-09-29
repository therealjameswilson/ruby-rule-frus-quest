import assert from 'node:assert/strict';import{mkdir,writeFile}from'node:fs/promises';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5235/',out=process.env.FRUS_QA_OUT??'/tmp/frus-selection-controller';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),rows=[],errors=[];
try{for(const[layout,width,height]of[['phone',375,667],['small',320,568],['landscape',844,390],['desktop',1280,900]]){
 const p=await browser.newPage({viewport:{width,height}});p.on('pageerror',e=>errors.push(String(e)));
 await p.addInitScript(()=>{window.qaPad={id:'QA Controller',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.qaPad]});});
 await p.goto(new URL('?scene=ArchiveScene',base).href);await p.waitForFunction(()=>window.game?.scene.isActive('ArchiveScene'));await p.waitForTimeout(350);
 const pad=async(i,ms=100)=>{await p.evaluate(i=>window.qaPad.buttons[i]={pressed:true,value:1},i);await p.waitForTimeout(ms);await p.evaluate(i=>window.qaPad.buttons[i]={pressed:false,value:0},i);await p.waitForTimeout(120);};
 const focus=()=>p.evaluate(()=>document.activeElement.dataset.packet??(document.activeElement.classList.contains('manuscript-submit')?'file':'leave'));
 const open=()=>p.evaluate(()=>{const s=window.game.scene.getScene('ArchiveScene');s.dialog.hide();s.researchChoice.showManuscriptDesk(window.qaDraft,()=>{},()=>{window.qaFiled++;s.resumeArchiveReview();},()=>{window.qaCancelled++;s.resumeArchiveReview();});});
 await p.evaluate(()=>{window.qaDraft={};window.qaFiled=0;window.qaCancelled=0;window.qaPad.buttons[0]={pressed:true,value:1};});
 await open();await p.waitForTimeout(350);assert.deepEqual(await p.evaluate(()=>window.qaDraft),{},'Held A must not choose on entry');
 await p.evaluate(()=>window.qaPad.buttons[0]={pressed:false,value:0});await p.waitForTimeout(180);
 const hero=await p.evaluate(()=>JSON.parse(window.render_game_to_text()).player);
 assert.equal(await focus(),'decision');
 let scrollPresses=0;
 while(scrollPresses<15){
 const clipped=await p.evaluate(()=>{const a=document.activeElement.getBoundingClientRect(),b=document.querySelector('.manuscript-body').getBoundingClientRect();return a.bottom>b.bottom+4;});
 if(!clipped)break;await pad(13);scrollPresses++;assert.equal(await focus(),'decision','Down must read before changing packets');
 }
 assert(scrollPresses<15,'Decision evidence must be fully reachable');
 await pad(15);assert.equal(await focus(),'routine');await pad(15);assert.equal(await focus(),'approval');
 await p.screenshot({path:`${out}/${layout}-approval-focus.png`});
 await pad(0);assert.equal(await p.locator('[data-packet=approval]').getAttribute('aria-pressed'),'true');
 await pad(15);assert.equal(await focus(),'file');await pad(0);assert.equal(await p.evaluate(()=>window.qaFiled),0);assert.match(await p.locator('[data-status]').innerText(),/decision story is incomplete/);
 await pad(14);assert.equal(await focus(),'approval');await pad(0);
 await pad(14);await pad(14);assert.equal(await focus(),'decision');await pad(0);
 assert.deepEqual(await p.evaluate(()=>JSON.parse(window.render_game_to_text()).player),hero,'Controller reading must not move hero');
 await pad(1);assert.equal(await p.locator('.selection-desk').count(),0);assert.equal(await p.evaluate(()=>window.qaCancelled),1);assert.equal(await p.evaluate(()=>window.qaFiled),0);
 await open();await p.waitForTimeout(250);assert.equal(await p.locator('[data-packet=decision]').getAttribute('aria-pressed'),'true');
 await pad(15);await pad(15);await pad(15);assert.equal(await focus(),'file');await pad(0);assert.equal(await p.evaluate(()=>window.qaFiled),1);assert.equal(await p.locator('.selection-desk').count(),0);
 rows.push({layout,scrollPresses,heldInputSafe:true,threePacketsNavigable:true,rejectedThenCorrected:true,cancelPreservesDraft:true,noHeroMovement:true});await p.close();
}assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({scope:'Simulated Gamepad API integration; isolated draft, not physical hardware',rows,errors},null,2));console.log(JSON.stringify({cases:rows.length,errors}));}finally{await browser.close();}
