import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out='/tmp/attack-phases';await mkdir(out,{recursive:true});const browser=await chromium.launch();
try {
 const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const errors=[],log=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5211/?scene=NscLibraryScene&text=full');await p.waitForFunction(()=>window.game?.scene.isActive('NscLibraryScene'));await p.waitForTimeout(400);
 for(const [column,facing] of ['south','north','west','east'].entries()){
  // Capture every distinct phase during one genuine controller action, pausing only to inspect it.
  await p.evaluate(facing=>{const s=window.game.scene.getScene('NscLibraryScene');s.player.setPosition(128,172);s.player.facing=facing;s.player.setCombatPaused(true);s.scene.pause();},facing);
  for(const [row,phase] of ['windup','active','cooldown'].entries()){
   const state=await p.evaluate(({phase,start})=>new Promise((resolve,reject)=>{
    const s=window.game.scene.getScene('NscLibraryScene'),h=s.player;
    const timer=setTimeout(()=>{s.events.off('postupdate',capture);reject(Error('Phase timeout: '+phase));},3000);
    function capture(){if(h.combatReadout.weapon.phase!==phase)return;
     clearTimeout(timer);s.events.off('postupdate',capture);h.setCombatPaused(true);s.scene.pause();const a=h.attackPoseSprite;
     resolve({phase,frame:Number(a.frame.name),visible:a.visible,base:h.sprite.visible,foot:a.y,expectedFoot:h.position.y+4});
    }
    s.events.on('postupdate',capture);if(start){h.startAction('stapler');capture();}else {h.setCombatPaused(false);s.scene.resume();}
   }),{phase,start:row===0});
   assert.equal(state.frame,row*4+column);assert(state.visible);assert.equal(state.base,false);assert.equal(state.foot,state.expectedFoot);
   await p.screenshot({path:`${out}/${facing}-${phase}.png`});log.push(state);
  }
  await p.evaluate(()=>{const s=window.game.scene.getScene('NscLibraryScene');s.player.setCombatPaused(false);s.scene.resume();});await p.waitForTimeout(700);
  assert.deepEqual(await p.evaluate(()=>{const h=window.game.scene.getScene('NscLibraryScene').player;return {attack:h.attackPoseSprite.visible,base:h.sprite.visible};}),{attack:false,base:true});
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({phone:true,fixture:true,log,errors},null,2));console.log(JSON.stringify({phases:log.length,errors}));
}finally{await browser.close();}
