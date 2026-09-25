import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/attack-phases';await mkdir(out,{recursive:true});const browser=await chromium.launch();
try {
 const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const errors=[],log=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5211/?scene=NscLibraryScene&text=full');await p.waitForFunction(()=>window.game?.scene.isActive('NscLibraryScene'));await p.waitForTimeout(400);
 if(process.env.FRUS_QA_APPEARANCE){
  await p.addInitScript(appearance=>{const save=JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave'));if(save){save.state.playerProfile.compilerAppearance=appearance;localStorage.setItem('rubyRuleFrusQuestSave',JSON.stringify(save));}},process.env.FRUS_QA_APPEARANCE);
  await p.goto('http://127.0.0.1:5211/?text=full');await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await p.keyboard.press('Enter');await p.waitForFunction(()=>window.game?.scene.isActive('NscLibraryScene'));await p.waitForTimeout(400);
  assert.equal(await p.evaluate(()=>window.game.scene.getScene('NscLibraryScene').player.characterKey),process.env.FRUS_QA_APPEARANCE+'_hd');
 }

 for(const [column,facing] of ['south','north','west','east'].entries()){
  // Capture every distinct phase during one genuine controller action, pausing only to inspect it.
  await p.evaluate(facing=>{const s=window.game.scene.getScene('NscLibraryScene');s.player.setPosition(128,172);s.player.facing=facing;s.player.setCombatPaused(true);s.scene.pause();},facing);
  for(const [row,phase] of ['windup','active','cooldown'].entries()){
   const state=await p.evaluate(({phase,start})=>new Promise((resolve,reject)=>{
    const s=window.game.scene.getScene('NscLibraryScene'),h=s.player;
    const timer=setTimeout(()=>{s.events.off('postupdate',capture);reject(Error('Phase timeout: '+phase));},3000);
    function capture(){if(h.combatReadout.weapon.phase!==phase)return;
     clearTimeout(timer);s.events.off('postupdate',capture);h.setCombatPaused(true);s.scene.pause();const a=h.attackPoseSprite;
     const pose=h.attackPoseSheet.poses[Number(a.frame.name)];
     resolve({phase,flip:a.flipX,footX:a.x+((a.flipX?a.frame.realWidth-pose.center:pose.center)-a.displayOriginX)*a.scaleX,expectedX:h.position.x,frame:Number(a.frame.name),visible:a.visible,base:h.sprite.visible,foot:a.y,expectedFoot:h.position.y+4,bodyHeight:(h.attackPoseSheet.poses[Number(a.frame.name)].bottom-h.attackPoseSheet.poses[Number(a.frame.name)].top+1)*a.scaleY});
    }
    s.events.on('postupdate',capture);if(start){h.startAction('stapler');capture();}else {s.scene.resume();}
   }),{phase,start:row===0});
   assert.equal(state.frame,row*4+column);assert.equal(state.flip,process.env.FRUS_QA_MIRRORED_FRAME!==undefined&&state.frame===Number(process.env.FRUS_QA_MIRRORED_FRAME));assert(Math.abs(state.footX-state.expectedX)<.001);assert(state.visible);assert.equal(state.base,false);assert.equal(state.foot,state.expectedFoot);assert(Math.abs(state.bodyHeight-Number(process.env.FRUS_QA_HEIGHT??44))<.001);
   await p.screenshot({path:`${out}/${facing}-${phase}.png`});log.push(state);
  }
  await p.evaluate(()=>{const s=window.game.scene.getScene('NscLibraryScene');s.scene.resume();});await p.waitForTimeout(700);
  assert.deepEqual(await p.evaluate(()=>{const h=window.game.scene.getScene('NscLibraryScene').player;return {attack:h.attackPoseSprite.visible,base:h.sprite.visible};}),{attack:false,base:true});
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({phone:true,fixture:true,log,errors},null,2));console.log(JSON.stringify({phases:log.length,errors}));
}finally{await browser.close();}
