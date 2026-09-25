import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/combat-tool-art';await mkdir(out,{recursive:true});
const browser=await chromium.launch();
try {
 const p=await browser.newPage({viewport:{width:1024,height:960}}),errors=[],results=[];
 p.on('pageerror',e=>errors.push(String(e)));
 p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.goto(new URL('?scene=NscLibraryScene&text=full',process.env.FRUS_QA_URL??'http://127.0.0.1:5211/').href);
 await p.waitForFunction(()=>window.game?.scene.isActive('NscLibraryScene'));await p.waitForTimeout(500);
 if(process.env.FRUS_QA_APPEARANCE){
  await p.addInitScript(appearance=>{const save=JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave'));if(save){save.state.playerProfile.compilerAppearance=appearance;localStorage.setItem('rubyRuleFrusQuestSave',JSON.stringify(save));}},process.env.FRUS_QA_APPEARANCE);
  await p.goto('http://127.0.0.1:5211/?text=full');await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await p.keyboard.press('Enter');await p.waitForFunction(()=>window.game?.scene.isActive('NscLibraryScene'));await p.waitForTimeout(400);
  assert.equal(await p.evaluate(()=>window.game.scene.getScene('NscLibraryScene').player.characterKey),process.env.FRUS_QA_APPEARANCE+'_hd');
 }

 for(const [tool,key,size] of [['stapler','combat-stapler-detail',16],['citation_stamp','combat-stamp-detail',18],['red_pencil','combat-pencil-detail',20],['review_folder','combat-folder-detail',22]])for(const facing of ['south','west','north','east']){
  // Isolated art fixture: start an actual weapon action, capture its active frame, then resume cooldown.
  const state=await p.evaluate(({tool,facing})=>new Promise((resolve,reject)=>{
   const s=window.game.scene.getScene('NscLibraryScene'),hero=s.player;
   hero.setPosition(128,172);hero.facing=facing;
   const timer=setTimeout(()=>{s.events.off('postupdate',capture);reject(Error('Active frame not reached'));},3000);
   function capture(){if(hero.combatReadout.weapon.phase!=='active')return;
    clearTimeout(timer);s.events.off('postupdate',capture);s.scene.pause();
    const v=hero.weaponVfxSprite,a=hero.attackPoseSprite;
    resolve({pose:{key:a.texture.key,frame:Number(a.frame.name),visible:a.visible,baseVisible:hero.sprite.visible,footY:a.y,groundY:hero.position.y+4,bodyHeight:(hero.attackPoseSheet.poses[Number(a.frame.name)].bottom-hero.attackPoseSheet.poses[Number(a.frame.name)].top+1)*a.scaleY},tool,facing,key:v.texture.key,width:v.displayWidth,height:v.displayHeight,visible:v.visible,angle:v.angle,hitbox:hero.activeActionHitbox,sweep:hero.weaponSweepSprite.visible,oldBlocks:[hero.actionTrail,hero.actionEdge,hero.actionStamp].some(o=>o.visible),phase:hero.combatReadout.weapon.phase});
   }
   s.events.on('postupdate',capture);hero.startAction(tool);
  }),{tool,facing});
  assert.equal(state.key,key);assert.equal(state.width,size*.75);assert.equal(state.height,size*.75);assert(state.visible);assert(state.hitbox);assert.equal(state.phase,'active');assert.equal(state.pose.key,process.env.FRUS_QA_POSE_KEY??'compiler-attack-v1');assert.equal(state.pose.frame,4+['south','north','west','east'].indexOf(facing));assert(state.pose.visible);assert.equal(state.pose.baseVisible,false);assert.equal(state.pose.footY,state.pose.groundY);assert(Math.abs(state.pose.bodyHeight-Number(process.env.FRUS_QA_HEIGHT??44))<.001);assert(state.sweep);assert.equal(state.oldBlocks,false);
  await p.screenshot({path:`${out}/${tool}-${facing}.png`});results.push(state);
  await p.evaluate(()=>window.game.scene.resume('NscLibraryScene'));await p.waitForTimeout(800);
  assert.equal(await p.evaluate(()=>window.game.scene.getScene('NscLibraryScene').player.weaponVfxSprite.visible),false);
  assert.equal(await p.evaluate(()=>window.game.scene.getScene('NscLibraryScene').player.weaponSweepSprite.visible),false);
  assert.deepEqual(await p.evaluate(()=>{const h=window.game.scene.getScene('NscLibraryScene').player;return {base:h.sprite.visible,attack:h.attackPoseSprite.visible};}),{base:true,attack:false});
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({fixture:true,results,errors},null,2));console.log(JSON.stringify({passed:results.length,errors}));
}finally{await browser.close();}
