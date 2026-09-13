import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { workstationWalkRoute } from '../src/game/workstationGeometry.ts';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');

const base = process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/';
assert(process.env.FRUS_QA_STORAGE, 'Set FRUS_QA_STORAGE to an earned Editor entry from qa-referral-manifest.mjs');
const root = process.env.FRUS_QA_OUT ?? '/tmp/frus-proof-comparison';
const browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE} : {})});
async function run(mobile) {
  const out = `${root}/${mobile ? 'mobile' : 'desktop'}`;
  await mkdir(out,{recursive:true});
  const context = await browser.newContext({storageState:JSON.parse(await readFile(process.env.FRUS_QA_STORAGE,'utf8')),viewport:mobile?{width:375,height:667}:{width:1024,height:960},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?3:1});
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const errors=[];
  page.on('pageerror', e=>errors.push(String(e)));
  page.on('console', m=>{if(m.type()==='error')errors.push(m.text());});
  const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
  const choice=()=>page.evaluate(()=>Boolean(window.game.scene.getScene('SilentReadScene').reviewChoice.active || window.game.scene.getScene('SilentReadScene').proofBoard.active || window.game.scene.getScene('SilentReadScene').editorialBoard.active || window.game.scene.getScene('SilentReadScene').crossReferenceBoard.active || window.game.scene.getScene('SilentReadScene').chronologyBoard.active || window.game.scene.getScene('SilentReadScene').releaseScopeBoard.active));
  async function point(x,y) {
    const b=await page.locator('canvas').first().boundingBox();
    return {x:b.x+x*b.width/256,y:b.y+y*b.height/240,id:1};
  }
  async function touch(x,y,dx=0,dy=0,ms=48) {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[await point(x,y)]});
    if(dx||dy)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[await point(x+dx,y+dy)]});
    await page.waitForTimeout(ms);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  async function press(key='Space') {
    if(mobile)await touch(key==='KeyX'?174:225,key==='KeyX'?216:205);
    else await page.keyboard.press(key==='KeyX'?'x':key,{delay:45});
    await page.waitForTimeout(180);
  }
  async function direction(key) {
    if(mobile) {
      const [dx,dy]={ArrowLeft:[-26,0],ArrowRight:[26,0],ArrowUp:[0,-26],ArrowDown:[0,26]}[key];
      await touch(40,178,dx,dy,80);
    } else {await page.keyboard.down(key);await page.waitForTimeout(80);await page.keyboard.up(key);}
    await page.waitForTimeout(20);
  }
  async function move(x,y,dest) {
    let stalled=0;
    for(let i=0;i<180;i++) {
      const before=await state();
      if(dest&&(before.scene===dest||before.roomTraversal?.currentRoomId===dest)){await page.waitForTimeout(550);return;}
      let dx=x-before.player.x,dy=y-before.player.y;
      if(!dest&&Math.hypot(dx,dy)<5)return;
      if(before.scene==='SilentReadScene') {
        const {solids,feet,room,locked}=await page.evaluate(()=>{const scene=window.game.scene.getScene('SilentReadScene');return {
          room:scene.currentRoomId,locked:scene.roomTransitionLocked,
          solids:scene.roomSolids.map(({x,y,width,height})=>({x,y,width,height})),
          feet:{x:scene.player.logicalX,y:scene.player.logicalY}};});
        if(locked || room!==before.roomTraversal?.currentRoomId){await page.waitForTimeout(100);continue;}
        const route=workstationWalkRoute(feet,{x,y},solids,{x:[28,96,160,228],y:[80,132,184,198]});
        const next=route.find(p=>Math.hypot(p.x-feet.x,p.y-feet.y)>2)??route.at(-1);
        assert(next,`No clear proof aisle from ${JSON.stringify(feet)} to ${x},${y}`);
        dx=next.x-feet.x;dy=next.y-feet.y;
      }
      await direction(Math.abs(dx)>Math.abs(dy)?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp');
      const after=await state();
      stalled=Math.hypot(after.player.x-before.player.x,after.player.y-before.player.y)<1?stalled+1:0;
      if(stalled>12)throw Error(`Blocked ${JSON.stringify(after.player)} -> ${x},${y} ${after.objective}`);
    }
    throw Error('move timeout');
  }
  let n=0;
  async function shot(name) {
    await page.waitForTimeout(250);
    const s=await state(),path=`${out}/${String(n++).padStart(2,'0')}-${name}`;
    const native=await page.evaluate(()=>new Promise(resolve=>window.game.renderer.snapshot(image=>resolve(image.src))));
    await writeFile(`${path}-native.png`,Buffer.from(native.split(',')[1],'base64'));
    await context.storageState({path:`${out}/earned-storage.json`});
    await page.screenshot({path:`${path}.png`});await writeFile(`${path}.json`,JSON.stringify(s,null,2));
    if(s.scene==='SilentReadScene'&&s.mode==='explore') {
      const geometry=await page.evaluate(()=>{
        const scene=window.game.scene.getScene('SilentReadScene'), player=scene.player.sprite.getBounds();
        const bounds=r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom});
        return {player:bounds(player), panels:[scene.toast,scene.interactionPrompt].filter(p=>p.visible)
          .map(p=>bounds(p.container.getBounds()))};
      });
      await writeFile(`${path}-geometry.json`,JSON.stringify(geometry,null,2));
      for(const panel of geometry.panels) {
        assert(panel.bottom<=geometry.player.top||panel.top>=geometry.player.bottom
          ||panel.right<=geometry.player.left||panel.left>=geometry.player.right,`${name}: feedback obscures player`);
        assert(panel.left>=0&&panel.right<=256,`${name}: feedback clips canvas`);
      }
    }
    console.log(name,JSON.stringify({scene:s.scene,room:s.roomTraversal,objective:s.objective,player:s.player,progress:s.sceneProgress.silentReadReviewStep,status:s.sceneProgress.silentReadReviewStatus,points:s.documentPoints,held:s.heldItem}));
    return s;
  }
  async function resume(name) {
    const before=await state();
    await page.goto(`${base}?text=full`);
    await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');
    if(mobile)await touch(86,154);else await page.keyboard.press('Enter',{delay:50});
    await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='SilentReadScene');
    await page.waitForTimeout(900);
    const s=await shot(name);
    assert.equal(s.sceneProgress.silentReadReviewStep,before.sceneProgress.silentReadReviewStep);
    assert.equal(s.sceneProgress.silentReadReviewStatus,before.sceneProgress.silentReadReviewStatus);
    assert.equal(s.heldItem,before.heldItem);
    assert(Math.hypot(s.player.x-before.player.x,s.player.y-before.player.y)<=3);
    assert.deepEqual(s.roomTraversal.visitedRoomIds,before.roomTraversal.visitedRoomIds);
    return s;
  }
  try {
    await page.goto(`${base}?text=full`);
    await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');
    if(mobile)await touch(86,154);else await page.keyboard.press('Enter',{delay:50});
    await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='SilentReadScene');
    await shot('arrival');
    await page.waitForTimeout(1200);
    const initial=await shot('initial');
    const earned=s=>({points:s.documentPoints, inventory:s.inventory, documents:s.documentCandidates,
      step:s.sceneProgress.silentReadReviewStep, status:s.sceneProgress.silentReadReviewStatus});
    await move(36,114); assert.equal((await state()).nearestInteractable, 'ASK PRIYA');
    await press(); const hint=await shot('priya-hint');
    assert.match(hint.latestMessage,/Priya: TAKE THE DRAFT BELOW ME/);
    assert.deepEqual(earned(hint),earned(initial));
    await move(30,198);await move(56,198);await press();
    assert.equal((await state()).sceneProgress.silentReadReviewStatus,1);
    assert.equal((await state()).heldItem,'Review Folder: EDITOR DRAFT');
    await shot('draft-carried');
    await resume('draft-carry-continue');
    await press();assert.equal((await state()).sceneProgress.silentReadReviewStatus,1);
    assert(!(await choice()),'The pickup cannot also reach the Editor desk');
    await move(128,185);await press();
    assert(await choice());await shot('bracket-repair');
    await context.storageState({path:`${out}/pending-bracket-storage.json`});
    assert.equal((await state()).choice.options[0].label, 'Add withholding indication');
    assert.equal(await page.evaluate(()=>window.game.scene.getScene('SilentReadScene').editorialBoard.indication.text), '+ ADD WITHHOLDING INDICATION');
    const bracketStart=await state();
    await press();
    assert.equal((await state()).choice.options[0].value,'visible_italic');
    assert.equal((await state()).sceneProgress.silentReadReviewStatus,2);
    assert.equal((await state()).documentPoints,bracketStart.documentPoints);
    await press('KeyX');
    await resume('bracket-draft-continue');
    await press(); assert.equal((await state()).choice.options[0].value,'visible_italic');
    await press();
    assert.equal((await state()).sceneProgress.silentReadReviewStatus,3);
    assert.equal((await state()).documentPoints,bracketStart.documentPoints);
    await shot('bracket-filed-awaits-stamp'); await press();
    assert((await state()).inventory.includes('Red Pencil'));
    if (process.argv.includes('--editor-only')) {
      await shot('editor-tool-earned');
      assert.deepEqual(errors, []);
      await writeFile(`${out}/result.json`,JSON.stringify({errors,scope:'Editor draft, repair, Continue, filing and Red Pencil'},null,2));
      return;
    }
    await move(215,185);await move(215,124);await move(248,124,'S1');
    await shot('proof-room-entry');
    await move(128,198);await press();
    const stages=[
      {id:1,x:48,y:124,answer:null},
      {id:2,x:208,y:124,answer:'Space'},
      {id:3,x:64,y:180,answer:'Space'},
      {id:4,x:192,y:180,answer:'Space'},
      {id:5,x:64,y:124,answer:'KeyX'},
      {id:6,x:128,y:180,answer:'Space'},
      {id:7,x:192,y:180,answer:'KeyX'}
    ];
    for(const stage of stages) {
      if(stage.id===5)await resume('resume-carried-method-ledger');
      await move(stage.x,stage.y);await press();
      assert.equal((await state()).sceneProgress.silentReadReviewStatus,2);
      if(stage.answer)assert(await choice(),'Placing file must immediately open its check');
      if(stage.id===2||stage.id===5)await resume(`resume-routed-${stage.id}`);
      if(!(await choice()))await press();
      if(stage.id === 1) {
        assert(await choice());
        const initialCatalog=await shot('cross-reference-open');
        await context.storageState({path:`${out}/pending-catalog-storage.json`});
        const paused=s=>({player:s.player,combat:s.playerCombat,threats:s.visibleThreats,points:s.documentPoints,reliability:s.reliability});
        await page.waitForTimeout(1500);assert.deepEqual(paused(await state()),paused(initialCatalog));
        async function click(x,y){if(mobile)await touch(x,y);else{const p=await point(x,y);await page.mouse.click(p.x,p.y,{delay:45});}await page.waitForTimeout(180);}
        await click(128,182);assert(await choice());
        assert.equal((await state()).sceneProgress.silentReadCrossReferenceDraft,undefined);
        await click(54,120);await click(128,182);
        assert.equal((await state()).sceneProgress.silentReadReviewStatus,2);
        assert.equal((await state()).documentPoints,initialCatalog.documentPoints);
        await shot('cross-reference-wrong-type');
        await click(202,120);await click(128,182);
        assert.equal((await state()).sceneProgress.silentReadReviewStatus,2);
        await press('KeyX');await resume('cross-reference-wrong-draft-continue');await press();
        assert.equal((await state()).choice.options[2].value,'pinned');
        if(mobile)await click(102,120);else{await page.keyboard.press('ArrowUp',{delay:50});await press();}
        assert.equal((await state()).sceneProgress.silentReadCrossReferenceDraft,2);
        assert.equal((await state()).sceneProgress.silentReadReviewStatus,2);
        await shot('cross-reference-correct-unfiled');
        await press('KeyX');
        assert.equal((await state()).sceneProgress.silentReadReviewStatus,2,'Touch cancel must not file');
        assert.equal((await state()).playerCombat.weapon.swingId,initialCatalog.playerCombat.weapon.swingId);
        await resume('cross-reference-correct-draft-continue');await press();
        assert.equal((await state()).choice.options[1].value,'pinned');
        assert.equal((await state()).sceneProgress.silentReadReviewStatus,2);
        await click(128,182);
        assert.equal((await state()).sceneProgress['silentReadDecision_public-crossref'],1);
        assert.equal((await state()).documentPoints,initialCatalog.documentPoints);
        await shot('cross-reference-filed-awaits-stamp');
      } else if(stage.id === 2) {
        const initialScope=await shot('release-scope-open');
        await context.storageState({path:`${out}/pending-release-scope-storage.json`});
        const frozen=s=>({player:s.player,combat:s.playerCombat,threats:s.visibleThreats,points:s.documentPoints,reliability:s.reliability});
        await page.waitForTimeout(1200);assert.deepEqual(frozen(await state()),frozen(initialScope));
        async function click(x,y){if(mobile)await touch(x,y);else{const p=await point(x,y);await page.mouse.click(p.x,p.y);}await page.waitForTimeout(180);}
        await click(128,169); assert.match((await state()).latestMessage,/NOT CLEARED/);
        assert.equal((await state()).sceneProgress.silentReadReviewStatus,2);
        await click(52,121); assert.equal((await state()).sceneProgress.silentReadReleaseScope,6);
        await click(128,169); assert(await choice());
        await press('KeyX'); await resume('release-scope-partial-continue'); await press();
        assert.equal((await state()).choice.options[0].value,'hold');
        if(mobile)await click(204,121);else{await page.keyboard.press('ArrowRight',{delay:50});await page.waitForTimeout(80);await page.keyboard.press('ArrowRight',{delay:50});await press();}
        assert.equal((await state()).sceneProgress.silentReadReleaseScope,2);
        assert.equal((await state()).sceneProgress.silentReadReviewStatus,2);
        assert(!(await state()).sceneProgress['silentReadDecision_classified-source']);
        assert.deepEqual((await state()).documentCandidates,initialScope.documentCandidates);
        await shot('release-scope-correct-unfiled');
        await press('KeyX'); assert.equal((await state()).playerCombat.weapon.swingId,initialScope.playerCombat.weapon.swingId);
        await resume('release-scope-correct-continue');await press();
        assert.deepEqual((await state()).choice.options.map(option=>option.value),['hold','print','hold']);
        await click(128,169);
        assert.equal((await state()).sceneProgress['silentReadDecision_classified-source'],1);
        assert.equal((await state()).documentPoints,initialScope.documentPoints);
        await shot('release-scope-filed-awaits-stamp');
      } else if(stage.id === 4) {
        const initialChronology=await shot('chronology-open');
        await context.storageState({path:`${out}/pending-chronology-storage.json`});
        const paused=s=>({player:s.player,combat:s.playerCombat,threats:s.visibleThreats,points:s.documentPoints,reliability:s.reliability});
        await page.waitForTimeout(1200);assert.deepEqual(paused(await state()),paused(initialChronology));
        async function click(x,y){if(mobile)await touch(x,y);else{const p=await point(x,y);await page.mouse.click(p.x,p.y);}await page.waitForTimeout(180);}
        await click(104,168);
        assert(await choice());assert.match((await state()).latestMessage,/NOT THE DRAFT DATE/);
        assert.equal((await state()).documentPoints,initialChronology.documentPoints);
        assert.equal((await state()).sceneProgress.silentReadChronologySlot,undefined);
        await shot('chronology-wrong-sequence');
        if(mobile)await click(34,168);else await page.keyboard.press('ArrowLeft',{delay:50});
        await page.waitForTimeout(180);
        assert.equal((await state()).sceneProgress.silentReadChronologySlot,2);
        assert.equal((await state()).sceneProgress.silentReadReviewStatus,2);
        assert(!(await state()).sceneProgress['silentReadDecision_proof-date']);
        await shot('chronology-correct-unfiled');
        await press('KeyX');assert.equal((await state()).mode,'explore');
        assert.equal((await state()).playerCombat.weapon.swingId,initialChronology.playerCombat.weapon.swingId);
        await resume('chronology-draft-continue');await press();
        assert.equal((await state()).choice.options[1].value,'memcon');
        assert.equal((await state()).sceneProgress.silentReadReviewStatus,2);
        if(mobile)await click(104,168);else{await page.keyboard.press('ArrowDown',{delay:50});await press();}
        assert.equal((await state()).sceneProgress['silentReadDecision_proof-date'],1);
        assert.equal((await state()).documentPoints,initialChronology.documentPoints);
        await shot('chronology-filed-awaits-stamp');
      } else if(stage.id === 7) {
        const initialProof=await shot('proof-comparison-open');
        await context.storageState({path:`${out}/pending-proof-storage.json`});
        const paused=s=>({player:s.player,combat:s.playerCombat,threats:s.visibleThreats,points:s.documentPoints,reliability:s.reliability});
        await page.waitForTimeout(2200);assert.deepEqual(paused(await state()),paused(initialProof));
        async function click(x,y){if(mobile)await touch(x,y);else{const p=await point(x,y);await page.mouse.click(p.x,p.y,{delay:45});}await page.waitForTimeout(180);}
        await click(128,181);await page.waitForTimeout(450);
        assert.equal((await state()).sceneProgress.silentReadReviewStatus,2);assert(await choice());
        await shot('proof-incomplete-rejected');
        await click(44,150);assert.equal((await state()).sceneProgress.silentReadProofRepairs,undefined);
        if(mobile)await click(72,116);else{await page.keyboard.press('ArrowLeft',{delay:50});await press();}
        assert.equal((await state()).sceneProgress.silentReadProofRepairs,1);
        assert.equal((await state()).choice.options[0].label,'Secto 214');
        if(mobile)await touch(174,216);else await page.keyboard.press('Escape',{delay:50});await page.waitForTimeout(180);
        assert.equal((await state()).mode,'explore');assert.equal((await state()).playerCombat.weapon.swingId,initialProof.playerCombat.weapon.swingId);
        await resume('proof-partial-resumed');await press();assert(await choice());
        assert.equal((await state()).sceneProgress.silentReadProofRepairs,1);
        await shot('proof-partial-restored');
        await click(128,181);assert(await choice());assert.equal((await state()).sceneProgress.silentReadReviewStatus,2);
        if(mobile)await click(92,150);else{await page.keyboard.press('ArrowRight',{delay:50});await page.waitForTimeout(80);await page.keyboard.press('ArrowRight',{delay:50});await press();}
        assert.equal((await state()).sceneProgress.silentReadProofRepairs,3);
        assert.equal((await state()).sceneProgress.silentReadReviewStatus,2);
        assert(!(await state()).sceneProgress['silentReadDecision_typesetter-proof']);
        await shot('proof-corrected-unfiled');
        if(mobile)await click(128,181);else{await page.keyboard.press('ArrowRight',{delay:50});await page.waitForTimeout(80);await page.keyboard.press('ArrowRight',{delay:50});await press();}
        const filed=await state();assert.equal(filed.sceneProgress.silentReadReviewStatus,3);
        assert.equal(filed.sceneProgress['silentReadDecision_typesetter-proof'],1);
        assert.equal(filed.documentPoints,initialProof.documentPoints);assert(!filed.inventory.includes('Buckram Key'));
        assert.equal(filed.playerCombat.weapon.swingId,initialProof.playerCombat.weapon.swingId);
        await shot('proof-filed-awaits-stamp');
      } else if(stage.answer) {
        assert(await choice());await shot(`decision-${stage.id}`);
        await context.storageState({path:`${out}/pending-decision-${stage.id}-storage.json`});
        if(process.argv.includes('--cancel-decisions')) {
          const before=await state();
          const unchanged=async()=>{
            const after=await state();
            assert.equal(after.mode,'explore');
            assert.equal(after.sceneProgress.silentReadReviewStatus,2);
            assert.deepEqual(after.sceneProgress,before.sceneProgress);
            assert.equal(after.documentPoints,before.documentPoints);
            assert.deepEqual(after.documentCandidates,before.documentCandidates);
            assert.equal(after.playerCombat.weapon.swingId,before.playerCombat.weapon.swingId);
          };
          if(mobile)await touch(224,16);else await page.keyboard.press('Escape',{delay:45});
          await page.waitForTimeout(180);await unchanged();await press();assert(await choice());
          const back=await page.evaluate(()=>{
            const row=window.game.scene.getScene('SilentReadScene').reviewChoice.optionObjects[4].getBounds();
            return {x:row.centerX,y:row.centerY};
          });
          if(mobile)await touch(back.x,back.y);else{const p=await point(back.x,back.y);await page.mouse.click(p.x,p.y);}
          await page.waitForTimeout(180);await unchanged();await press();assert(await choice());
          await shot(`canceled-and-reopened-${stage.id}`);
        }
        if(stage.id>=5) {
          const before=await state();
          await press(stage.answer==='Space'?'KeyX':'Space');
          assert.equal((await state()).sceneProgress.silentReadReviewStatus,2);
          assert.equal((await state()).documentPoints,before.documentPoints);
          assert(!(await state()).inventory.includes('Buckram Key'));
          assert.equal((await state()).sceneProgress[`silentReadDecision_${['','','','','','editorial-ledger','printer-copy','typesetter-proof'][stage.id]}`],undefined);
          await press();assert(await choice());
        }
        if(mobile&&stage.id===6) {
          const b=await page.evaluate(()=>{
            const row=window.game.scene.getScene('SilentReadScene').reviewChoice.optionObjects[0].getBounds();
            return {x:row.centerX,y:row.centerY};
          });
          await touch(b.x,b.y);await page.waitForTimeout(180);
        }else await press(stage.answer);
        if(stage.id>=5)await shot(`verified-${stage.id}`);
      }
      assert.equal((await state()).sceneProgress.silentReadReviewStatus,3);
      assert(!(await state()).inventory.includes('Buckram Key'));
      if(stage.id===6)await resume('resume-verified-printer');
      await press();
      await shot(`completed-${stage.id}`);
    }
    const end=await state();
    assert.equal(end.sceneProgress.silentReadReviewStep,8);
    assert(end.inventory.includes('Buckram Key'));
    assert.equal(end.documentPoints-initial.documentPoints,87);
    for(const id of ['editorial-ledger','printer-copy','typesetter-proof'])assert.equal(end.sceneProgress[`silentReadDecision_${id}`],1);
    await resume('resume-complete');
    await move(30,187);await move(30,124);await move(8,124,'E1');
    await shot('backtrack-editor');
    assert.equal((await state()).objective,'EXIT EAST - PROOF');
    await resume('resume-backtracked-editor');
    assert.equal((await state()).documentPoints,end.documentPoints);
    await move(248,124,'S1');
    await move(248,124,'BlackVaultLairScene');
    await shot('black-vault-entry');
    assert.deepEqual(errors,[]);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    await writeFile(`${out}/result.json`,JSON.stringify({errors,documentPointsEarned:87,metrics:await page.evaluate(()=>window.rubyRuleMobileMetrics)},null,2));
  } catch(e){await shot('failure');throw e;}finally{await context.close();}
}
try {await run(process.argv.includes('--mobile'));}finally{await browser.close();}
