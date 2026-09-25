import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const storagePath = process.env.FRUS_QA_STORAGE;
if (!storagePath) throw new Error('FRUS_QA_STORAGE must name an earned Black Vault entry storage file.');
const mobile=process.argv.includes('--mobile'), baseline=process.argv.includes('--baseline');
const cpuThrottle=Number(process.env.FRUS_QA_CPU_THROTTLE ?? 1);
assert(Number.isFinite(cpuThrottle) && cpuThrottle>=1, 'CPU throttle must be at least one');
const out=process.env.FRUS_QA_OUT??`/tmp/frus-boss-rhythm-${baseline?'before':'after'}-${mobile?'touch':'desktop'}`;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_EXECUTABLE});
const context=await browser.newContext({storageState:JSON.parse(await readFile(storagePath,'utf8')),
  viewport:mobile?{width:375,height:667}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1});
const page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[],log=[];
await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpuThrottle});
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const boss=s=>s.visibleThreats.find(t=>t.bossCombat);
async function point(x,y){const b=await page.locator('canvas').first().boundingBox();return{x:b.x+x*b.width/256,y:b.y+y*b.height/240,id:1};}
async function touch(x,y,dx=0,dy=0,ms=55){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[await point(x,y)]});if(dx||dy)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[await point(x+dx,y+dy)]});await page.waitForTimeout(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
async function press(key='Space'){if(mobile)await touch(...(key==='x'?[174,216]:key==='m'?[120, 216]:key==='Escape'?[224,34]:[225,205]));else await page.keyboard.press(key,{delay:55});}
async function direction(key,ms=70){if(mobile){const [dx,dy]={ArrowLeft:[-26,0],ArrowRight:[26,0],ArrowUp:[0,-26],ArrowDown:[0,26]}[key];await touch(48, 202,dx,dy,ms);}else{await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);}await page.waitForTimeout(20);}
async function move(x,y){for(let i=0;i<50;i++){const s=await state(),dx=x-s.player.x,dy=y-s.player.y;if(s.mode!=='explore'||Math.hypot(dx,dy)<4)return;await direction(Math.abs(dx)>Math.abs(dy)?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp',Math.max(16,Math.min(180,Math.max(Math.abs(dx),Math.abs(dy))*6)));}throw Error('Movement stalled');}
async function shot(label){const s=await state();const img=await page.evaluate(()=>new Promise(resolve=>window.game.renderer.snapshot(i=>resolve(i.src))));await writeFile(`${out}/${label}-native.png`,Buffer.from(img.split(',')[1],'base64'));await page.screenshot({path:`${out}/${label}.png`});await writeFile(`${out}/${label}.json`,JSON.stringify(s,null,2));const entry={label,scene:s.scene,p:s.player,rel:s.reliability,phase:boss(s)?.enemyState,hp:boss(s)?.hp,returns:boss(s)?.bossCombat.boltsReturned,window:boss(s)?.bossCombat.counterWindowMs};log.push(entry);console.log(JSON.stringify(entry));return s;}
try{
 await page.goto(`${process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/'}?text=full`);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');
 if(mobile)await touch(86,154);else await press('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='BlackVaultLairScene');await page.waitForTimeout(1600);
 await shot('entry');
 // The vault readies the earned Red Pencil; no menu detour is required.
 assert.equal((await state()).playerCombat.weapon.tool,'red_pencil');

 if(mobile && process.argv.includes('--multitouch')) {
   await move(128,180);
   const before=await state();
   const origin=await point(48, 202),moved=await point(48, 176),swing={...await point(174,216),id:2};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[origin]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[moved]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[moved,swing]});
   await page.waitForTimeout(100);
   const active=await state();
   const controls=await page.evaluate(()=>window.rubyRuleTouchControls);
   assert(controls.dpadPointerId!==null&&controls.dpadDirection!==null,'Movement pointer must remain captured');
   assert(controls.pressedButtons.includes('b'),'Second pointer must hold the tool button');
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
 }
 await move(128,144);await press();
 if(process.argv.includes('--boast-skip')) {
   async function assertBossPortrait() {
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
     assert(keys.includes('pack-danne-boss-portrait'),'DANN-E must speak with the robot portrait');
     assert(!keys.includes('danne-portrait-archivist'),'An ally must not appear to speak the boss boast');
   }
   await page.waitForFunction(()=>{
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
   if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[await point(174,216)]});
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
   const control=await page.evaluate(()=>{
     const soda=window.game.scene.getScene('BlackVaultLairScene').danneBoss.soda;
     const b=soda.button,r=b.getBounds(),hit=b.input.hitArea;
     return {x:b.x,y:b.y,left:r.left+hit.x,top:r.top+hit.y,
       right:r.left+hit.x+hit.width,bottom:r.top+hit.y+hit.height,flavor:soda.flavor};
   });
   assert(control.bottom<194,'Soda target must end above the entire Menu target');
   assert(control.left>82 && control.right<150,'Soda target must clear D-pad and B');
   const swing=(await state()).playerCombat.weapon.swingId;
   if(mobile)await touch(control.x,control.y);
   else {const p=await point(control.x,control.y);await page.mouse.click(p.x,p.y);}
   await page.waitForFunction(prior=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.soda.flavor!==prior,control.flavor);
   assert.equal((await state()).mode,'explore','Soda must not open Menu');
   assert.equal((await state()).playerCombat.weapon.swingId,swing,'Soda must not trigger B');
   await shot('soda-thrown');
   await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).latestMessage.includes('soda'),{},{timeout:4000});
   if(mobile)await touch(120,196);else await press('m');
   await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='pause');
   const pausedFlavor=await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.soda.flavor);
   await page.waitForTimeout(200);
   assert.equal(await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.soda.button.visible),false);
   await shot('menu-separated');
   await press('Escape');
   await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='explore');
   assert.equal(await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.soda.flavor),pausedFlavor,'Menu must not queue a throw');
   await shot('controls-ready');
   log.push({label:'soda-controls-summary',mobile,distinctTargets:true,throws:true,pause:true});
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
      await press('m');await page.waitForTimeout(100);const paused=await state(),pb=boss(paused);await shot('core-open-paused');await page.waitForTimeout(1800);assert.deepEqual(boss(await state()).bossCombat,pb.bossCombat);await press('Escape');await page.waitForTimeout(80);
      assert.equal((await state()).playerCombat.weapon.swingId,paused.playerCombat.weapon.swingId);
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
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='EndingScene',{},{timeout:6000});await page.waitForTimeout(1200);
  const end=await shot('bindery-entry');assert.equal(end.sceneProgress.blackVaultBossCleared,1);assert.equal(end.sceneProgress.danneBadEnding||0,0);
  assert.equal(end.sceneProgress.blackVaultCombatDamage,0);assert(end.reliability>0);assert.equal(end.documentPoints,spam.documentPoints);
  assert.deepEqual(end.documentCandidates,spam.documentCandidates);
  for(const phase of ['colossus','swarm','cloud'])assert.equal(end.completionStats.danneVariantsDefeated.counts[phase],1);
  assert(freshCoreHits>0,'The route must demonstrate fresh melee damage, not only returned bolts');
  if(process.argv.includes('--phase-resume'))assert(reloadedPhase,'Must actually reload a damaged Cloud phase');
  const completion={cycles,retries,freshCoreHits,tightApproaches,phases:[...phases],seconds:(Date.now()-started)/1000,deadlineMissed:Boolean(end.sceneProgress.statutoryDeadlineMissed)};
  log.push({label:'fight-summary',...completion});
  await context.storageState({path:`${out}/earned-bindery-storage.json`});
  await page.reload();await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');
  if(mobile)await touch(86,154);else await press('Enter');
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='EndingScene');await page.waitForTimeout(1300);
  const resumed=await shot('bindery-continued');assert.equal(resumed.sceneProgress.blackVaultBossCleared,1);
  assert.equal(resumed.documentPoints,end.documentPoints);assert.deepEqual(resumed.inventory,end.inventory);
  assert.deepEqual(resumed.completionStats.danneVariantsDefeated,end.completionStats.danneVariantsDefeated);
  console.log('earned fight complete',JSON.stringify(completion));
 }
 }
 assert.deepEqual(errors,[]);
}catch(e){await shot('failure').catch(()=>{});throw e;}
finally{await writeFile(`${out}/result.json`,JSON.stringify({cpuThrottle,errors,log},null,2));await browser.close();}
