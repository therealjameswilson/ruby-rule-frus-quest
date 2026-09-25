import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
assert(process.env.FRUS_QA_STORAGE,'An earned N2 arrival checkpoint is required');
const out=process.env.FRUS_QA_OUT??'/tmp/review-packet-feedback';await mkdir(out,{recursive:true});
const b=await chromium.launch();const results=[];
try{for(const mobile of [false,true]){
 const p=await b.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},isMobile:mobile,hasTouch:mobile,storageState:process.env.FRUS_QA_STORAGE});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(new URL('?text=full',process.env.FRUS_QA_URL??'http://127.0.0.1:5211/').href);await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await p.keyboard.press('Enter');await p.waitForFunction(()=>window.game.scene.isActive('NetworkScene'));await p.waitForTimeout(900);
 // Capture cues at the real scene methods: later enemy audio may legitimately
 // replace the global last-audio status before the test process reads it.
 await p.evaluate(()=>{window.qaPaperCues=[];const s=window.game.scene.getScene('NetworkScene');for(const name of ['pickUpVaultDocket','animateVaultFiling','updateVaultFilingFlights']){const original=s[name];s[name]=function(...args){const before=this.vaultFilingFlights.length;const result=original.apply(this,args);const status=JSON.parse(window.render_game_to_text()).audioStatus;if(name==='pickUpVaultDocket'&&status==='paper packet pickup')window.qaPaperCues.push('pickup');if(status==='paper filing and stamp'&&((name==='updateVaultFilingFlights'&&before>this.vaultFilingFlights.length)||(name==='animateVaultFiling'&&before===this.vaultFilingFlights.length)))window.qaPaperCues.push('file');return result;};}});
 const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
 const position=async(x,y)=>{await p.evaluate(({x,y})=>window.game.scene.getScene('NetworkScene').player.setPosition(x,y),{x,y});await p.waitForTimeout(60);};
 const act=async()=>{if(mobile){const dock=p.locator('#portrait-touch-dock [data-control=space]');if(await dock.isVisible()){const box=await dock.boundingBox();await p.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}else{const box=await p.locator('canvas').first().boundingBox();await p.touchscreen.tap(box.x+225*box.width/256,box.y+205*box.height/240);}}else await p.keyboard.press('Space');};
 assert.equal((await state()).roomTraversal.currentRoomId,'N2');
 await p.screenshot({path:`${out}/${mobile?'phone':'desktop'}-inbox.png`});
 await position(96,132);await act();await p.waitForFunction(()=>!!window.game.scene.getScene('NetworkScene').vaultDocketHeldIcon);await p.waitForTimeout(100);
 assert.deepEqual(await p.evaluate(()=>window.qaPaperCues),['pickup']);
 const carry=await p.evaluate(()=>{const s=window.game.scene.getScene('NetworkScene'),icon=s.vaultDocketHeldIcon,art=icon.list[0],hero=s.player.sprite.getBounds();return {dx:icon.x-s.player.position.x,width:art.displayWidth,height:art.displayHeight,top:icon.y-art.displayHeight/2,heroTop:hero.top,worldGone:!s.vaultDocketWorldIcon};});
 const toastClear=await p.evaluate(()=>{const s=window.game.scene.getScene('NetworkScene'),a=s.toast.container.getBounds(),b=s.player.sprite.getBounds();return a.bottom<b.top||a.top>b.bottom;});assert(toastClear,'Pickup toast must not cover the hero');
 assert.equal(Math.abs(carry.dx),8);assert.equal(carry.width,15);assert(carry.top>carry.heroTop+8,'Packet must stay below the head');assert(carry.worldGone);
 await p.waitForTimeout(1500);await p.screenshot({path:`${out}/${mobile?'phone':'desktop'}-carrying.png`});
 await position(80,150);await act();await p.waitForFunction(()=>window.game.scene.getScene('NetworkScene').vaultFilingFlights.length===1);
 assert.equal((await state()).sceneProgress.classNetVaultReviewStep,1,'Gameplay advances without waiting for the effect');
 await p.keyboard.press('KeyM');await p.waitForFunction(()=>JSON.parse(window.render_game_to_text()).pauseMenu);
 const paused=await p.evaluate(()=>{const f=window.game.scene.getScene('NetworkScene').vaultFilingFlights[0];return {elapsed:f.elapsed,x:f.icon.x,y:f.icon.y};});
 await p.waitForTimeout(350);assert.deepEqual(await p.evaluate(()=>{const f=window.game.scene.getScene('NetworkScene').vaultFilingFlights[0];return {elapsed:f.elapsed,x:f.icon.x,y:f.icon.y};}),paused);
 await p.keyboard.press('KeyM');await p.waitForFunction(()=>window.game.scene.getScene('NetworkScene').vaultFilingFlights.length===0);assert.equal((await state()).sceneProgress.classNetVaultDocketCarried,2);assert.deepEqual(await p.evaluate(()=>window.qaPaperCues),['pickup','file']);
 await p.emulateMedia({reducedMotion:'reduce'});await position(96,96);await act();await p.waitForFunction(()=>JSON.parse(window.render_game_to_text()).sceneProgress.classNetVaultReviewStep===2);
 assert.equal(await p.evaluate(()=>window.game.scene.getScene('NetworkScene').vaultFilingFlights.length),0,'Reduced motion files immediately without a flight');
 assert.deepEqual(await p.evaluate(()=>window.qaPaperCues),['pickup','file','file']);
 await p.screenshot({path:`${out}/${mobile?'phone':'desktop'}-filed.png`});
 await p.reload();await p.waitForFunction(()=>window.game.scene.isActive('TapToStartScene'));await p.keyboard.press('Enter');await p.waitForFunction(()=>window.game.scene.isActive('NetworkScene'));await p.waitForTimeout(300);
 assert.equal((await state()).sceneProgress.classNetVaultReviewStep,2);assert.equal((await state()).sceneProgress.classNetVaultDocketCarried,3);assert.equal(await p.evaluate(()=>window.game.scene.getScene('NetworkScene').vaultFilingFlights.length),0);
 assert.deepEqual(errors,[]);results.push({mobile,carry,paperCuesVerified:true,filesWithoutDelay:true,pauseFreezes:true,resumeCompletes:true,reducedMotionImmediate:true,reloadPreservesProgress:true,errors});await p.close();
}await writeFile(`${out}/result.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await b.close();}
