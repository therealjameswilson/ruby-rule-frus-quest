import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');const out='/tmp/cached-hud';await mkdir(out,{recursive:true});const b=await chromium.launch();
try{const p=await b.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.goto('http://127.0.0.1:5211/?scene=ArchiveScene&text=full');await p.waitForFunction(()=>window.game?.scene.isActive('ArchiveScene'));await p.waitForTimeout(1600);
const check=()=>p.evaluate(()=>{const s=window.game.scene.getScene('UIScene'),data=s.questBandTexture.getContext().getImageData(0,0,768,78).data;return {visible:s.questBandImage.visible,sourceHidden:!s.questBandGraphics.visible,painted:data.some((v,i)=>i%4===3&&v>0),width:s.questBandTexture.width};});
assert.deepEqual(await check(),{visible:true,sourceHidden:true,painted:true,width:768});
await p.evaluate(()=>{const s=window.game.scene.getScene('UIScene'),old=s.questBandGraphics.generateTexture;s.cacheRebuilds=0;s.questBandGraphics.generateTexture=function(...args){s.cacheRebuilds++;return old.apply(this,args);};});
await p.waitForTimeout(500);assert.equal(await p.evaluate(()=>window.game.scene.getScene('UIScene').cacheRebuilds),0,'Idle HUD should reuse texture');
await p.keyboard.press('x',{delay:60});await p.waitForTimeout(400);assert(await p.evaluate(()=>window.game.scene.getScene('UIScene').cacheRebuilds)>0,'Attack cooldown refreshes HUD');
await p.screenshot({path:`${out}/phone.png`});
await p.evaluate(()=>window.game.scene.getScene('UIScene').scene.restart());await p.waitForTimeout(900);assert((await check()).painted,'Restart repopulates texture');assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({idleCached:true,attackRefreshes:true,restartRepaints:true,errors},null,2));console.log('PASS idle cache, attack refresh, restart');
}finally{await b.close();}
