import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const storagePath = process.env.FRUS_QA_STORAGE;
if (!storagePath) throw new Error('FRUS_QA_STORAGE must name an earned Black Vault entry storage file.');
const tallPhone=process.argv.includes('--tall-phone');
const mobile=process.argv.includes('--mobile')||tallPhone, baseline=process.argv.includes('--baseline');
const cpuThrottle=Number(process.env.FRUS_QA_CPU_THROTTLE ?? 1);
assert(Number.isFinite(cpuThrottle) && cpuThrottle>=1, 'CPU throttle must be at least one');
const out=process.env.FRUS_QA_OUT??`/tmp/frus-boss-rhythm-${baseline?'before':'after'}-${mobile?'touch':'desktop'}`;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_EXECUTABLE,
 ...(process.env.FRUS_QA_CHANNEL?{channel:process.env.FRUS_QA_CHANNEL}:{}),
 ...(process.env.FRUS_QA_ANGLE?{args:[`--use-angle=${process.env.FRUS_QA_ANGLE}`]}:{})});
const context=await browser.newContext({storageState:JSON.parse(await readFile(storagePath,'utf8')),
  reducedMotion:process.argv.includes('--reduced-motion')?'reduce':'no-preference',
  viewport:mobile?(tallPhone?{width:390,height:844}:{width:375,height:667}):{width:1024,height:960},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1});
const controller=process.argv.includes('--soda-controller');
if(controller)await context.addInitScript(()=>{
  window.qaSodaPad={connected:true,index:0,id:'QA standard controller',mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};
  Object.defineProperty(navigator,'getGamepads',{value:()=>[window.qaSodaPad]});
});
const page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[],log=[];
await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpuThrottle});
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
let cpuProfileStarted=false;
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const boss=s=>s.visibleThreats.find(t=>t.bossCombat);
async function point(x,y){const b=await page.locator('canvas').first().boundingBox();return{x:b.x+x*b.width/256,y:b.y+y*b.height/240,id:1};}
async function touch(x,y,dx=0,dy=0,ms=55){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[await point(x,y)]});if(dx||dy)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[await point(x+dx,y+dy)]});await page.waitForTimeout(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
async function controlPoint(control, fallback) {
 const target=page.locator(`#portrait-touch-dock [data-control="${control}"]`);
 if(mobile&&await target.isVisible()){const b=await target.boundingBox();return{x:b.x+b.width/2,y:b.y+b.height/2,id:1};}
 return point(...fallback);
}
async function padPoints(key) {
 const target=page.locator('#portrait-touch-dock [data-control=pad]');
 const [dx,dy]={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[key];
 if(await target.isVisible()){const b=await target.boundingBox(),origin={x:b.x+b.width/2,y:b.y+b.height/2,id:1};return[origin,{...origin,x:origin.x+dx*b.width*.35,y:origin.y+dy*b.height*.35}];}
 return [await point(48,202),await point(48+dx*26,202+dy*26)];
}
async function press(key='Space'){
 if(mobile){const p=key==='Escape'?await point(224,34):await controlPoint(key==='x'?'b':key==='m'?'start':'space',key==='x'?[174,216]:key==='m'?[120,216]:[225,205]);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await page.waitForTimeout(55);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 else await page.keyboard.press(key,{delay:55});
}
async function direction(key,ms=70){
 if(mobile){const [origin,moved]=await padPoints(key);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[origin]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[moved]});await page.waitForTimeout(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 else{await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);}await page.waitForTimeout(20);
}
async function move(x,y){for(let i=0;i<50;i++){const s=await state(),dx=x-s.player.x,dy=y-s.player.y;if(s.mode!=='explore'||Math.hypot(dx,dy)<4)return;await direction(Math.abs(dx)>Math.abs(dy)?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp',Math.max(16,Math.min(180,Math.max(Math.abs(dx),Math.abs(dy))*6)));}throw Error('Movement stalled');}
async function shot(label){const s=await state();if(!process.argv.includes('--no-captures')){const img=await page.evaluate(()=>new Promise(resolve=>window.game.renderer.snapshot(i=>resolve(i.src))));await writeFile(`${out}/${label}-native.png`,Buffer.from(img.split(',')[1],'base64'));await page.screenshot({path:`${out}/${label}.png`});}await writeFile(`${out}/${label}.json`,JSON.stringify(s,null,2));const entry={label,scene:s.scene,p:s.player,rel:s.reliability,phase:boss(s)?.enemyState,hp:boss(s)?.hp,returns:boss(s)?.bossCombat.boltsReturned,window:boss(s)?.bossCombat.counterWindowMs};log.push(entry);console.log(JSON.stringify(entry));return s;}
try{
 await page.goto(`${process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/'}?text=full`);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');
 if(mobile)await touch(86,154);else await press('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='BlackVaultLairScene');await page.waitForTimeout(1600);
 await shot('entry');
 if(process.argv.includes('--cpu-profile')){await cdp.send('Profiler.enable');await cdp.send('Profiler.start');cpuProfileStarted=true;}
 if(process.argv.includes('--hud-cache'))await page.evaluate(()=>{
   const ui=window.game.scene.getScene('UIScene'),render=ui.questBandGraphics.generateTexture;
   window.hudCacheAudit={refreshes:0,signatures:[],invalid:[]};
   ui.questBandGraphics.generateTexture=function(...args){
     const result=render.apply(this,args),audit=window.hudCacheAudit;
     audit.refreshes++;if(!audit.signatures.includes(ui.questBandSignature))audit.signatures.push(ui.questBandSignature);
     if(ui.questBandGraphics.visible||ui.questBandTexture.width!==768)audit.invalid.push('HUD cache geometry or visibility');
     return result;
   };
 });
 if(process.argv.includes('--damage-trail'))await page.evaluate(()=>{
   window.damageTrailAudit={samples:0,phases:{},invalid:[]};
   window.game.events.on('poststep',()=>{
     const scene=window.game.scene.getScene('BlackVaultLairScene');
     if(!scene.scene.isActive())return;
     const hud=scene.children.getByName('boss-health-hud'),boss=scene.danneBoss;
     const trail=hud?.list.find(o=>o.name==='boss-damage-trail');
     const handlers=scene.events.listeners('update').filter(f=>f.name==='updateDamageTrail');
     const audit=window.damageTrailAudit;
     if(handlers.length>1)audit.invalid.push('Duplicate trail update handlers');
     if(!trail?.visible)return;
     audit.samples++;audit.phases[boss.currentPhase]=(audit.phases[boss.currentPhase]??0)+1;
     if(trail.width<Math.round(148*boss.hp/boss.maxHp)||trail.width>148)audit.invalid.push('Trail outside health bounds');
   });
 });
 if(process.argv.includes('--attack-art'))await page.evaluate(()=>{
   window.attackArtAudit={samples:0,invalid:[],phases:{},images:{}};
   const scene=window.game.scene.getScene('BlackVaultLairScene');
   scene.events.on('postupdate',()=>{
     const hero=scene.player,pose=hero?.attackPoseSprite;
     if(!pose||hero.combatReadout.weapon.phase!=='active')return;
     const audit=window.attackArtAudit,phase=scene.danneBoss?.currentPhase;
     if(!['colossus','swarm','cloud'].includes(phase))return;
     const expected=4+['south','north','west','east'].indexOf(hero.facing);
     audit.samples++;audit.phases[phase]=(audit.phases[phase]||0)+1;
     if(!pose.visible||hero.sprite.visible||Number(pose.frame.name)!==expected||Math.abs(pose.y-hero.position.y-4)>.51||pose.alpha!==hero.sprite.alpha)
       audit.invalid.push({phase,frame:pose.frame.name,expected,visible:pose.visible,baseVisible:hero.sprite.visible,foot:pose.y,ground:hero.position.y+4});
     if(!audit.images[phase]){
       audit.images[phase]='pending';
       window.game.renderer.snapshot(image=>{audit.images[phase]=image.src;});
     }
   });
 });
 if(process.argv.includes('--frame-pacing')) await page.evaluate(()=>{
   window.bossFrameSamples={};let previous=performance.now(),previousPhase=null;
   const gl=window.game.renderer.gl,debug=gl?.getExtension('WEBGL_debug_renderer_info');
   window.bossRenderer=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'unknown';
   window.game.events.on('step',()=>{
     const now=performance.now(),delta=now-previous;previous=now;
     const scene=window.game.scene.getScene('BlackVaultLairScene');
     if(!scene.scene.isActive()){previousPhase=null;return;}
     const boss=scene.danneBoss;
     if(!boss||boss.phaseDialogueActive||boss.inputLocked||boss.phaseTransitioning||scene.inventory.active||boss.combatPausedAt!==null){previousPhase=null;return;}
     const phase=boss.currentPhase;
     if(!['colossus','swarm','cloud'].includes(phase)){previousPhase=null;return;}
     if(previousPhase!==phase){previousPhase=phase;return;}
     (window.bossFrameSamples[phase]??=[]).push(delta);
   });
 });
 // The vault readies the earned Red Pencil; no menu detour is required.
 assert.equal((await state()).playerCombat.weapon.tool,'red_pencil');

 if(mobile && process.argv.includes('--multitouch')) {
   await move(128,180);
   const before=await state();
   const [origin,moved]=await padPoints('ArrowUp'),swing={...await controlPoint('b',[174,216]),id:2};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[origin]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[moved]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[moved,swing]});
   await page.waitForTimeout(100);
   const active=await state();
   const controls=await page.evaluate(()=>window.rubyRuleTouchControls);
   if(controls.portraitDocked){
     assert.equal(await page.locator('#portrait-touch-dock [data-control=pad]').getAttribute('data-direction'),'up');
     assert(await page.locator('#portrait-touch-dock [data-control=b]').evaluate(el=>el.classList.contains('pressed')));
   }else{
     assert(controls.dpadPointerId!==null&&controls.dpadDirection!==null,'Movement pointer must remain captured');
     assert(controls.pressedButtons.includes('b'),'Second pointer must hold the tool button');
   }
   assert(active.player.y<before.player.y,'Walking continues while a second finger swings');
   assert(active.playerCombat.weapon.swingId>before.playerCombat.weapon.swingId,'The simultaneous tool press must actually swing');
   await shot('two-finger-swing');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[moved]});
   await page.waitForTimeout(120);
   assert((await state()).player.y<active.player.y,'Releasing the tool must not cancel the D-pad');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForTimeout(100);
   const released=await page.evaluate(()=>window.rubyRuleTouchControls);
   assert.equal(released.dpadPointerId,null);assert.deepEqual(released.pressedButtons,[]);
   if(released.portraitDocked){assert.equal(await page.locator('#portrait-touch-dock [data-control=pad]').getAttribute('data-direction'),'');assert.equal(await page.locator('#portrait-touch-dock .pressed').count(),0);}
 }
 await move(128,144);await press();
 if(process.argv.includes('--boast-skip')) {
   async function assertBossPortrait() {
     await page.waitForFunction(()=>window.game.scene.getScene('BlackVaultLairScene').children.list.some(o=>o.name==='boss-boast-stage'&&o.alpha>=0.99));
     assert.equal(await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.clockContainer.visible),false,'Combat clock stays out of phase presentation');
     const keys=await page.evaluate(()=>{
       const result=[];
       function visit(nodes) {
         for(const node of nodes) {
           if(!node.visible)continue;
           if(node.texture)result.push(node.texture.key);
           if(Array.isArray(node.list))visit(node.list);
         }
       }
       visit(window.game.scene.getScene('BlackVaultLairScene').children.list);
       return result;
     });
     assert(keys.includes('danne-boss-combat-hd'),'Phase introduction must use detailed combat artwork');
     if(process.argv.includes('--reduced-motion'))assert.equal(await page.evaluate(()=>{const stage=window.game.scene.getScene('BlackVaultLairScene').children.list.find(o=>o.name==='boss-boast-stage');return stage.list.find(o=>o.anims)?.anims.isPlaying;}),false,'Reduced motion keeps presentation actor still');
     assert(keys.includes('pack-danne-boss-portrait'),'DANN-E must speak with the robot portrait');
     assert(!keys.includes('danne-portrait-archivist'),'An ally must not appear to speak the boss boast');
   }
   if(!process.argv.includes('--reduced-motion'))await page.waitForFunction(()=>{
     const s=JSON.parse(window.render_game_to_text());
     const ui=window.game.scene.getScene('UIScene');
     return s.mode==='dialog' && !s.dialog && ui.questBandText.text===''
       && ui.questBandCueText.text==='' && ui.questBandVerbText.text==='';
   },{},{timeout:1000,polling:'raf'});
   await shot('boast-arrival');
   await page.waitForFunction(()=>Boolean(window.game.scene.getScene('BlackVaultLairScene').danneBoss?.finishBoast));
   await page.waitForFunction(()=>{
     const s=JSON.parse(window.render_game_to_text()),ui=window.game.scene.getScene('UIScene');
     return Boolean(s.dialog?.text) && ui.questBandText.text==='Read line.'
       && ui.questBandCueText.text==='NEXT LINE' && ui.questBandVerbText.text!=='';
   });
   await assertBossPortrait();
   const intro=await shot('intro-boast');
   await page.waitForTimeout(400);
   assert.deepEqual((await state()).player,intro.player);
   assert.equal((await state()).sceneProgress.statutoryClockTenths,intro.sceneProgress.statutoryClockTenths);
   await press();
   await page.waitForFunction(()=>{const b=window.game.scene.getScene('BlackVaultLairScene').danneBoss;return b?.currentPhase==='colossus'&&Boolean(b.finishBoast);});
   await assertBossPortrait();
   const line=await shot('colossus-boast');
   await page.waitForTimeout(1200);
   assert(await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.phaseDialogueActive),'Readable line must outlast the old 1.15-second hold');
   assert.deepEqual((await state()).player,line.player);
   assert.equal((await state()).sceneProgress.statutoryClockTenths,line.sceneProgress.statutoryClockTenths);
   await press();
   await page.waitForFunction(()=>!window.game.scene.getScene('BlackVaultLairScene').danneBoss.phaseDialogueActive);
   assert.equal((await state()).playerCombat.weapon.swingId,intro.playerCombat.weapon.swingId);
   assert.equal(await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').children.list.some(o=>o.name==='boss-boast-stage')),false,'Introduction stage must be destroyed on return to combat');
 }
 await page.waitForFunction(()=>{const s=JSON.parse(window.render_game_to_text());return s.mode==='explore'&&s.visibleThreats.some(t=>t.enemyState==='colossus');});
 if(process.argv.includes('--spacing')) {
   await move(128,150);
   await page.waitForFunction(()=>window.game.scene.getScene('UIScene').questBandCueText.text==='STEP BACK; FACE BOLT', {}, {timeout:3000});
   await shot('spacing-too-close');
   await move(128,176);
   await page.waitForFunction(()=>window.game.scene.getScene('UIScene').questBandCueText.text==='FACE BOLT + SWING', {}, {timeout:3000});
   await shot('spacing-counter-distance');
 }
 await page.waitForTimeout(2400);
 if(process.argv.includes('--retry-guard')) {
   await move(128,130);
   if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[await controlPoint('b',[174,216])]});
   else await page.keyboard.down('x');
   await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).visibleThreats.some(t=>t.bossCombat?.retryAvailable),{},{timeout:90000});
   await page.waitForTimeout(500);
   const interrupted=await shot('retry-held-input');
   assert(boss(interrupted)?.bossCombat.retryAvailable,'Held combat input must not choose retreat');
   if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   else await page.keyboard.up('x');
   await page.waitForTimeout(100);
   await press();
   await page.waitForFunction(()=>{const s=JSON.parse(window.render_game_to_text());return s.mode==='explore'&&s.visibleThreats.some(t=>t.bossCombat&&!t.bossCombat.retryAvailable);});
   const retried=await shot('retry-deliberate');
   assert.equal(boss(retried).enemyState,boss(interrupted).enemyState);
   assert.deepEqual(retried.documentCandidates,interrupted.documentCandidates);
   assert.equal(retried.documentPoints,interrupted.documentPoints);
   assert(retried.reliability>0);
 }
 await move(128,136);await direction('ArrowUp',25);
 if(!baseline)await page.waitForFunction(()=>{
   const ui=window.game.scene.getScene('UIScene');
   return JSON.parse(window.render_game_to_text()).objective==='RETURN THE BOLT'
     && ui.questBandText.text==='RETURN THE BOLT';
 },{},{timeout:2000});
 await shot('core-approach');
 if(process.argv.includes('--combat-help')) {
   const before=await state();
   await press();await page.waitForTimeout(80);
   const after=await shot('combat-help');
   assert.equal(after.mode,'explore','Combat help must not interrupt movement');
   assert(after.latestMessage.includes('Face an incoming Ego bolt'));
   assert.deepEqual(after.documentCandidates,before.documentCandidates);
   assert.equal(after.documentPoints,before.documentPoints);
   assert.equal(after.playerCombat.weapon.swingId,before.playerCombat.weapon.swingId);
 }
 if(process.argv.includes('--soda-controls')) {
   await move(128,180);
   await page.waitForTimeout(250);
   const control=await page.evaluate(()=>{
     const soda=window.game.scene.getScene('BlackVaultLairScene').danneBoss.soda;
     window.qaSodaHits=[];
     const onHit=soda.onHit;
     soda.onHit=flavor=>{window.qaSodaHits.push(flavor);onHit(flavor);};
     const b=soda.button,r=b.getBounds(),hit=b.input.hitArea;
     return {x:b.x,y:b.y,left:r.left+hit.x,top:r.top+hit.y,
       right:r.left+hit.x+hit.width,bottom:r.top+hit.y+hit.height,flavor:soda.flavor,alpha:b.alpha,labelAlpha:soda.label.alpha,visualWidth:b.width,icon:soda.controlArt?.texture.key,iconVisible:soda.controlArt?.visible};
   });
   assert.equal(control.visualWidth,24,'Compact visual must preserve its larger touch target');
   assert.equal(control.right-control.left,44);assert(control.icon?.startsWith('soda-can-'));assert(control.iconVisible);
   if(mobile&&!controller){
     assert(control.bottom<194,'Soda target must end above the entire Menu target');
     assert(control.left>82 && control.right<150,'Soda target must clear D-pad and B');
     assert(control.alpha<0.4 && control.labelAlpha<0.4,'Overlapping phone control must reveal the hero');
     assert.equal(control.bottom-control.top,44,'Fading must retain full touch target');
   } else {
     assert(control.left>=200 && control.top>=190,'Keyboard/controller prompt stays out of central combat aisle');
   }
   await shot('hero-clear-of-controls');
   const swing=(await state()).playerCombat.weapon.swingId;
   if(controller)await page.evaluate(()=>window.qaSodaPad.buttons[5].pressed=true);
   else if(mobile)await touch(control.x,control.y-19);
   else await page.keyboard.press('v');
   await page.waitForFunction(prior=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.soda.flavor!==prior,control.flavor);
   assert.equal((await state()).mode,'explore','Soda must not open Menu');
   assert.equal((await state()).playerCombat.weapon.swingId,swing,'Soda must not trigger B');
   if(controller){
     await page.waitForTimeout(1400);
     assert.equal(await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.soda.flavor),(control.flavor+1)%3,'Held shoulder throws once');
     await page.evaluate(()=>window.qaSodaPad.buttons[5].pressed=false);
   }
   await shot('soda-thrown');
   await page.waitForFunction(()=>window.qaSodaHits.length===1,{},{timeout:4000});
   if(mobile)await touch(120,196);else await press('m');
   await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='pause');
   const pausedFlavor=await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.soda.flavor);
   await page.waitForTimeout(200);
   assert.equal(await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.soda.button.visible),false);
   assert.equal(await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.soda.controlArt.visible),false);
   await shot('menu-separated');
   if(controller)await page.evaluate(()=>window.qaSodaPad.buttons[5].pressed=true);
   else if(!mobile)await page.keyboard.press('v');
   await page.waitForTimeout(150);
   await press('Escape');
   await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='explore');
   assert.equal(await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.soda.flavor),pausedFlavor,'Menu must not queue a throw');
   await page.waitForTimeout(150);
   assert.equal(await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.soda.flavor),pausedFlavor,'Paused throw input must not carry into combat');
   if(controller)await page.evaluate(()=>window.qaSodaPad.buttons[5].pressed=false);
   await shot('controls-ready');
   if(mobile&&!controller) {
     await move(128,130);
     await page.waitForFunction(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.soda.label.alpha>0.9,{},{timeout:3000});
     await shot('control-restored');
   }
   log.push({label:'soda-controls-summary',mobile,controller,distinctTargets:true,throws:true,pause:true});
 } else if(process.argv.includes('--clock-resume')) {
   const elapsed = await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.statutoryYear);
   assert(elapsed>21.6,'The live clock must have advanced before testing reload');
   await page.reload();
   await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');
   if(mobile)await touch(86,154);else await press('Enter');
   await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='BlackVaultLairScene');
   await page.waitForTimeout(800);
   await move(128,144);await press();
   await page.waitForFunction(()=>Boolean(window.game.scene.getScene('BlackVaultLairScene').danneBoss?.finishBoast));
   const restored=await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.statutoryYear);
   assert(restored>=Math.floor(elapsed*10)/10,'Re-entering the boss cannot rewind the saved deadline');
   assert(restored<=elapsed+0.5,'Loading and introduction must not consume combat time');
   await shot('clock-restored');
   log.push({label:'clock-resume-summary',elapsed,restored});
 } else if(process.argv.includes('--imprecise')) {
   const before=await state();
   // Fixed uneven cadence: no projectile, HP or opening reads drive these inputs.
   const cadence=[420,760,500,620];
   for(let i=0;i<16;i++) {
     if(i%4===0)await direction('ArrowUp',80);
     await press('x');await page.waitForTimeout(cadence[i%cadence.length]);
   }
   const after=await shot('imprecise-swings'),b=boss(after);
   assert.deepEqual(after.documentCandidates,before.documentCandidates);
   assert.equal(after.documentPoints,before.documentPoints);
   log.push({label:'imprecise-summary',swingsAttempted:16,phase:b?.enemyState,
     hp:b?.hp,returns:b?.bossCombat.boltsReturned,reliabilityLost:before.reliability-after.reliability,
     retryAvailable:b?.bossCombat.retryAvailable,scope:'Fixed uneven swings; not an unaided human playtest'});
 } else {
 for(let i=0;i<3;i++){
   const before=boss(await state());await press('x');await page.waitForTimeout(180);const after=boss(await state());
   if(!baseline&&!before.bossCombat.coreOpen&&before.bossCombat.boltsReturned===after.bossCombat.boltsReturned)assert.equal(after.hp,before.hp,'Protected melee without a return must not damage');
   await page.waitForTimeout(420);
 }
 const spam=await shot('opening-strikes');
 if(baseline){assert.equal(boss(spam).bossCombat.boltsReturned,0);assert(boss(spam).hp<180);}
 else {
  if(boss(spam).bossCombat.boltsReturned===0)assert.equal(boss(spam).hp,180);
  let cycles=0,retries=0,freshCoreHits=0,tightApproaches=0,reloadedPhase=false;const started=Date.now(),phases=new Set();
  while(Date.now()-started<240000){
    const s=await state(),b=boss(s);if(s.scene==='EndingScene')break;
    if(s.mode!=='explore'){
      if(s.choice?.options?.some(o=>o.value==='standards')){await press('x');}
      else if(b?.bossCombat.retryAvailable){
        assert(retries<3,'Repeated retries need investigation');
        // Respect the prompt's 300ms input guard; count confirmed restarts,
        // not repeated taps on the same newly opened prompt.
        await page.waitForTimeout(350);
        const interrupted=await shot(`retry-${retries+1}`);
        // Movement bursts can reach the menu as fresh navigation after the
        // settle guard. Choose the labeled Retry row, not an assumed highlight.
        if (mobile) {
          const row=await page.evaluate(()=>{
            const r=window.game.scene.getScene('BlackVaultLairScene').danneBoss.retryChoice.rows[0].getBounds();
            return {x:r.centerX,y:r.centerY};
          });
          await touch(row.x,row.y);
        } else await page.keyboard.press('a');
        await page.waitForFunction(()=>{
          const s=JSON.parse(window.render_game_to_text());
          const restored=s.visibleThreats.find(t=>t.bossCombat);
          return s.reliability>0&&restored&&!restored.bossCombat.retryAvailable;
        },{},{timeout:2000});
        retries++;
        assert.equal(boss(await state()).hp,boss(interrupted).hp,'Retry must retain damage earned in this phase');
        assert.deepEqual((await state()).documentCandidates,spam.documentCandidates);
      }
      await page.waitForTimeout(100);continue;
    }
    if(!b){await page.waitForTimeout(100);continue;}
    if(!phases.has(b.enemyState)){
      phases.add(b.enemyState);await shot(`phase-${b.enemyState}`);
      if(b.enemyState==='cloud' && process.argv.includes('--cloud-warning')) {
        await page.waitForFunction(()=>{
          const s=JSON.parse(window.render_game_to_text()),b=s.visibleThreats.find(t=>t.bossCombat);
          return b?.telegraph?.kind==='cloud_shift' && b.telegraph.msRemaining>300;
        },{},{timeout:10000,polling:'raf'});
        const warning=await shot('cloud-warning'),lanes=boss(warning).telegraph.lanes;
        assert.equal(lanes.length,3,'Cloud warns about every spread lane');
        assert.equal(new Set(lanes.map(p=>`${p.x},${p.y}`)).size,3);
      }
      if(b.enemyState==='cloud' && process.argv.includes('--cloud-imprecise')) {
        await move(128,150);
        const before=await shot('cloud-untimed-start');
        const cadence=[420,760,500,620];
        let attempts=0;
        for(let i=0;i<16;i++) {
          const visible=await state(),enemy=boss(visible);
          if(visible.mode!=='explore'||enemy?.enemyState!=='cloud')break;
          // Use visible relative position only. No bolt, HP, telegraph timer
          // or core-window reads select the direction or timing of a swing.
          const dx=enemy.x-visible.player.x,dy=enemy.y-visible.player.y;
          await direction(Math.abs(dx)>Math.abs(dy)?dx<0?'ArrowLeft':'ArrowRight':dy<0?'ArrowUp':'ArrowDown',25);
          await press('x');attempts++;
          await page.waitForTimeout(cadence[i%cadence.length]);
        }
        const after=await shot('cloud-untimed-end'),enemy=boss(after);
        assert.deepEqual(after.documentCandidates,before.documentCandidates);
        assert.equal(after.documentPoints,before.documentPoints);
        assert(attempts > 0, 'The uneven-input check must actually attempt swings');
        assert(after.reliability > 0, 'This short counter practice must leave room to recover');
        assert(after.sceneProgress.blackVaultBossCleared || (enemy && (enemy.enemyState !== 'cloud' || enemy.hp < boss(before).hp)),
          'Uneven visible-facing swings must demonstrate actual progress, not just survive');
        log.push({label:'cloud-untimed-summary',attempts,
          hpBefore:boss(before).hp,hpAfter:enemy?.hp,
          returned: (enemy?.bossCombat.boltsReturned??0)-boss(before).bossCombat.boltsReturned,
          reliabilityBefore:before.reliability,reliabilityAfter:after.reliability,
          retryAvailable:enemy?.bossCombat.retryAvailable,
          scope:'Uneven untimed swings using visible enemy position; not an unaided human test'});
        continue;
      }
      if(b.enemyState==='swarm' && process.argv.includes('--disperse')) {
        const initial=await state(),prior=boss(initial).bossCombat.minisDispersed??0;
        await move(128,174);await direction('ArrowUp',25);
        const until=Date.now()+16000;
        while(Date.now()<until) {
          const s=await state(),swarm=boss(s);
          if(s.mode!=='explore'||swarm?.enemyState!=='swarm'||!swarm.bossCombat.minis.length)break;
          await press('x');await page.waitForTimeout(440);
        }
        const cleared=await shot('swarm-countered'),swarm=boss(cleared);
        assert((swarm?.bossCombat.minisDispersed??0)>prior,'Actual tool swings must disperse satellites');
        assert.equal(cleared.documentPoints,initial.documentPoints,'No farming rewards from satellites');
        assert.deepEqual(cleared.documentCandidates,initial.documentCandidates);
        if(swarm?.enemyState==='swarm'&&!swarm.bossCombat.minis.length)assert.equal(cleared.objective,swarm.bossCombat.coreOpen?'PENCIL THE CORE':'RETURN THE BOLT');
        continue;
      }
    }
    const face=b.y>160?'ArrowDown':b.x<100?'ArrowLeft':b.x>156?'ArrowRight':'ArrowUp';
    // Fight from the central aisle, not the solid rubble below Cloud's side perches.
    await move(128,face==='ArrowUp'?174:142);await direction(face,25);
    const ready=await state();if(ready.mode!=='explore')continue;
    try{await page.waitForFunction(({face,x,y})=>{const s=JSON.parse(window.render_game_to_text()),b=s.visibleThreats.find(t=>t.bossCombat);return s.mode!=='explore'||b?.x!==x||b?.y!==y||b?.bossCombat.bolts.some(p=>{
      if(p.returned)return false;const dx=p.x-s.player.x,dy=p.y-s.player.y;
      if(face==='ArrowUp')return Math.abs(dx)<10&&dy>=-47&&dy<=-35;
      if(face==='ArrowDown')return Math.abs(dx)<18&&dy>=30&&dy<=43;
      return Math.abs(dy)<26&&(face==='ArrowLeft'?dx>=-38&&dx<=-26:dx>=26&&dx<=38);
    });},{face,x:b.x,y:b.y},{timeout:4500,polling:'raf'});}catch{continue;}
    if((await state()).mode!=='explore')continue;
    const before=await state(),prior=boss(before);if(prior.x!==b.x||prior.y!==b.y)continue;await press('x');
    try{await page.waitForFunction(hp=>{const s=JSON.parse(window.render_game_to_text()),b=s.visibleThreats.find(t=>t.bossCombat);return s.scene==='EndingScene'||s.mode!=='explore'||b?.hp<hp;},prior.hp,{timeout:1600,polling:'raf'});}catch{continue;}
    const returned=await state(),r=boss(returned);if(!r||returned.mode!=='explore'||!r.bossCombat.coreOpen)continue;
    cycles++;
    if(cycles===1){
      await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).objective==='PENCIL THE CORE'
        && window.game.scene.getScene('UIScene').questBandText.text==='PENCIL THE CORE',{},{timeout:1000});
      await shot('core-open-guidance');
      if(process.argv.includes('--core-marker')) {
        const marker=await page.evaluate(()=>{
          const b=window.game.scene.getScene('BlackVaultLairScene').danneBoss;
          return {visible:b.coreOpeningFrame.visible,label:b.coreOpeningLabel.text,
            top:b.coreOpeningFrame.getBounds().top,bottom:b.coreOpeningFrame.getBounds().bottom};
        });
        assert(marker.visible);assert.equal(marker.label,'CORE OPEN');
        assert(marker.top>53,'Core cue must clear the fixed HUD');
        assert(marker.bottom<156,'Core cue must clear Soda and movement controls');
      }
      await press('m');await page.waitForTimeout(100);const paused=await state(),pb=boss(paused);await shot('core-open-paused');await page.waitForTimeout(1800);assert.deepEqual(boss(await state()).bossCombat,pb.bossCombat);await press('Escape');await page.waitForTimeout(80);
      assert.equal((await state()).playerCombat.weapon.swingId,paused.playerCombat.weapon.swingId);
      if(process.argv.includes('--core-marker')) {
        await page.waitForFunction(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.coreOpeningLabel.text==='CLOSING',{},{timeout:5000});
        await page.waitForFunction(()=>!window.game.scene.getScene('BlackVaultLairScene').danneBoss.coreOpening.visible,{},{timeout:3000});
        assert.equal(await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.coreOpeningFrame.visible),false);
        assert.equal(await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.coreOpeningLabel.visible),false);
        await shot('core-closed');
        log.push({label:'core-marker-summary',mobile,earnedReturn:true,clearOfHud:true,pauseFrozen:true,closingCue:true,hiddenWhenArmored:true});
        break;
      }
    }
    // Stop at pencil reach instead of walking into the boss sprite.
    await move(128,face==='ArrowUp'?145:face==='ArrowDown'?142:130);await direction(face,25);
    const beforeHit=await state(),h=boss(beforeHit);if(beforeHit.mode!=='explore'||h?.enemyState!==r.enemyState)continue;
    await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).playerCombat.weapon.canSwing,{},{timeout:800});
    await press('x');await page.waitForTimeout(180);const hit=await state(),hb=boss(hit);
    console.log(JSON.stringify({cycle:cycles,phase:hb?.enemyState,hp:hb?.hp,rel:hit.reliability,window:hb?.bossCombat.counterWindowMs}));
    if(hb?.enemyState===h.enemyState && hb.hp<h.hp && hb.bossCombat.boltsReturned===h.bossCombat.boltsReturned)freshCoreHits++;
    if(h.bossCombat.counterWindowMs>=600)assert(hb?.hp<h.hp||hit.mode!=='explore','A fresh swing must damage the open core');
    else tightApproaches++;
    if(hit.mode==='explore'&&hb?.bossCombat.coreOpen){
      await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).playerCombat.weapon.canSwing,{},{timeout:800});
      if(boss(await state())?.bossCombat.coreOpen)await press('x');await page.waitForTimeout(150);
    }
    if(process.argv.includes('--preserve-retry') && cycles===1) {
      // Earn a counter first, then deliberately take pressure without attacking.
      // No health or damage state is injected to reach the retry prompt.
      await move(128,130);
      await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).visibleThreats.some(t=>t.bossCombat?.retryAvailable), {}, {timeout:60000});
    }
    if(process.argv.includes('--phase-resume') && !reloadedPhase) {
      const current=await state(),enemy=boss(current);
      if(current.mode==='explore' && enemy?.enemyState==='cloud' && enemy.hp>0 && enemy.hp<180) {
        await press('m');
        await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='pause');
        const checkpoint=await shot('phase-before-reload');
        await page.reload();
        await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');
        if(mobile)await touch(86,154);else await press('Enter');
        await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='BlackVaultLairScene');
        await page.waitForTimeout(800);
        await move(128,144);await press();
        await page.waitForFunction(()=>Boolean(window.game.scene.getScene('BlackVaultLairScene').danneBoss?.finishBoast));
        const restored=await shot('phase-restored');
        assert.equal(boss(restored).enemyState,'cloud');
        assert.equal(boss(restored).hp,boss(checkpoint).hp);
        assert.deepEqual(restored.completionStats.danneVariantsDefeated,checkpoint.completionStats.danneVariantsDefeated);
        assert.deepEqual(restored.documentCandidates,checkpoint.documentCandidates);
        assert(restored.sceneProgress.statutoryClockTenths>=checkpoint.sceneProgress.statutoryClockTenths);
        await press();
        await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='explore');
        reloadedPhase=true;
      }
    }
  }
  if(!process.argv.includes('--core-marker')) {
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='EndingScene',{},{timeout:6000});await page.waitForTimeout(1200);
  const end=await shot('bindery-entry');assert.equal(end.sceneProgress.blackVaultBossCleared,1);assert.equal(end.sceneProgress.danneBadEnding||0,0);
  assert.equal(end.sceneProgress.blackVaultCombatDamage,0);assert(end.reliability>0);assert.equal(end.documentPoints,spam.documentPoints);
  assert.deepEqual(end.documentCandidates,spam.documentCandidates);
  for(const phase of ['colossus','swarm','cloud'])assert.equal(end.completionStats.danneVariantsDefeated.counts[phase],1);
  assert(freshCoreHits>0,'The route must demonstrate fresh melee damage, not only returned bolts');
  if(process.argv.includes('--phase-resume'))assert(reloadedPhase,'Must actually reload a damaged Cloud phase');
  const completion={cycles,retries,freshCoreHits,tightApproaches,phases:[...phases],seconds:(Date.now()-started)/1000,deadlineMissed:Boolean(end.sceneProgress.statutoryDeadlineMissed)};
  log.push({label:'fight-summary',...completion});
  if(process.argv.includes('--require-on-time'))assert.equal(completion.deadlineMissed,false,'Earned route must beat the statutory clock');
  await context.storageState({path:`${out}/earned-bindery-storage.json`});
  if(process.argv.includes('--frame-pacing')) {
    const pacing=await page.evaluate(()=>({renderer:window.bossRenderer,phases:window.bossFrameSamples}));
    pacing.capturesEnabled=!process.argv.includes('--no-captures');
    pacing.scope='Active phase windows exclude pauses, choices and phase dialogue; automation polling overhead remains.';
    pacing.summary=Object.fromEntries(Object.entries(pacing.phases).map(([phase,frames])=>{
      const sorted=[...frames].sort((a,b)=>a-b);
      return [phase,{frames:frames.length,p99Ms:sorted[Math.ceil(sorted.length*.99)-1],maxMs:sorted.at(-1),over33Ms:frames.filter(ms=>ms>33.4).length}];
    }));
    for(const phase of ['colossus','swarm','cloud'])assert(pacing.summary[phase]?.frames>100,`Missing active ${phase} frame coverage`);
    await writeFile(`${out}/frame-pacing.json`,JSON.stringify(pacing,null,2));
    console.log('frame pacing',JSON.stringify(pacing.summary));
  }
  if(process.argv.includes('--attack-art')){
    const audit=await page.evaluate(()=>window.attackArtAudit);
    assert(audit.samples>0);assert.deepEqual(audit.invalid,[]);
    for(const phase of ['colossus','swarm','cloud']){
      assert(audit.phases[phase]>0,`No active attack art in ${phase}`);
      assert(audit.images[phase]?.startsWith('data:image/'),`Missing ${phase} attack capture`);
      await writeFile(`${out}/attack-${phase}.png`,Buffer.from(audit.images[phase].split(',')[1],'base64'));
    }
    delete audit.images;await writeFile(`${out}/attack-art.json`,JSON.stringify(audit,null,2));
    console.log('attack art',JSON.stringify(audit));
  }
  if(process.argv.includes('--hud-cache')){
    const audit=await page.evaluate(()=>window.hudCacheAudit);
    assert(audit.refreshes>20);assert(audit.signatures.some(s=>s.includes('|active|')));assert(audit.signatures.some(s=>s.includes('|cooldown|')));assert.deepEqual(audit.invalid,[]);
    await writeFile(`${out}/hud-cache.json`,JSON.stringify(audit,null,2));
  }
 if(process.argv.includes('--damage-trail')){
    const audit=await page.evaluate(()=>window.damageTrailAudit);
    assert(audit.samples>0);assert.deepEqual(audit.invalid,[]);
    assert.deepEqual(Object.keys(audit.phases).sort(),['cloud','colossus','swarm']);
    assert.equal(await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').events.listeners('update').filter(f=>f.name==='updateDamageTrail').length),0);
    await writeFile(`${out}/damage-trail.json`,JSON.stringify(audit,null,2));
  }
  await page.reload();await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');
  if(mobile)await touch(86,154);else await press('Enter');
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='EndingScene');await page.waitForTimeout(1300);
  const resumed=await shot('bindery-continued');assert.equal(resumed.sceneProgress.blackVaultBossCleared,1);
  assert.equal(resumed.documentPoints,end.documentPoints);assert.deepEqual(resumed.inventory,end.inventory);
  assert.deepEqual(resumed.completionStats.danneVariantsDefeated,end.completionStats.danneVariantsDefeated);
  console.log('earned fight complete',JSON.stringify(completion));
  }
 }
 }
  assert.deepEqual(errors,[]);
}catch(e){await shot('failure').catch(()=>{});throw e;}
finally{if(cpuProfileStarted){const {profile}=await cdp.send('Profiler.stop');await writeFile(`${out}/cpu-profile.json`,JSON.stringify(profile));}await writeFile(`${out}/result.json`,JSON.stringify({cpuThrottle,mobile,tallPhone,errors,log},null,2));await browser.close();}
