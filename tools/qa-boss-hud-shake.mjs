import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');assert(process.env.FRUS_QA_STORAGE,'Provide earned final-vault entry save');
const out=process.env.FRUS_QA_OUT??'/tmp/boss-hud-shake';await mkdir(out,{recursive:true});const b=await chromium.launch();const results=[];
try{for(const mobile of [false,true]){
 const p=await b.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile,storageState:process.env.FRUS_QA_STORAGE});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(process.env.FRUS_QA_URL??'http://127.0.0.1:5211/');await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await p.keyboard.press('Enter');await p.waitForFunction(()=>window.game.scene.isActive('BlackVaultLairScene'));
 // Controlled presentation fixture: enter the earned boss, then trigger its genuine hit-feedback method.
 await p.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').startDanneBoss());
 for(let i=0;i<30;i++){await p.keyboard.press('Space');await p.waitForTimeout(180);if(await p.evaluate(()=>{const boss=window.game.scene.getScene('BlackVaultLairScene').danneBoss;return boss?.currentPhase==='colossus'&&!boss.phaseDialogueActive;}))break;}
 await p.waitForTimeout(700);
 const samples=await p.evaluate(()=>new Promise(resolve=>{const s=window.game.scene.getScene('BlackVaultLairScene'),cam=s.cameras.main,hud=s.children.getByName('boss-health-hud'),label=hud.list.find(o=>o.text==='DANN-E'),records=[];
  s.danneBoss.nextBoltAt=s.time.now+5000;
  const capture=()=>{if(!cam.shakeEffect.isRunning)return;records.push({x:cam.matrix.tx/3,y:cam.matrix.ty/3,labelTop:label.getBounds().top+cam.matrix.ty/3,barTop:hud.list[1].getBounds().top+cam.matrix.ty/3});};
  window.game.events.on('postrender',capture);s.danneBoss.takeReturnedBolt(s.time.now);
  setTimeout(()=>{window.game.events.off('postrender',capture);resolve(records);},300);
 }));
 assert(samples.length>=2);for(const r of samples){assert(Math.abs(r.x)<=1.281);assert(Math.abs(r.y)<=1.201);assert(r.labelTop>26);assert(r.barTop>26);}
 await p.screenshot({path:`${out}/${mobile?'phone':'desktop'}-hud.png`});
 await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>{const s=window.game.scene.getScene('BlackVaultLairScene');s.danneBoss.takeReturnedBolt(s.time.now);});
 assert.equal(await p.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').cameras.main.shakeEffect.isRunning),false);assert.deepEqual(errors,[]);
 results.push({mobile,samples,reducedMotionNoShake:true,errors});await p.close();
}await writeFile(`${out}/result.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({mobile:r.mobile,samples:r.samples.length,maxLogicalX:Math.max(...r.samples.map(s=>Math.abs(s.x))),maxLogicalY:Math.max(...r.samples.map(s=>Math.abs(s.y))),reducedMotionNoShake:true,errors:r.errors}))));}finally{await b.close();}
