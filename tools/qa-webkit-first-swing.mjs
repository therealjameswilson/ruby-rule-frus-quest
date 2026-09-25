import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const {webkit}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
assert(process.env.FRUS_QA_STORAGE,'Provide an earned ArchiveScene checkpoint');
const storage=JSON.parse(await readFile(process.env.FRUS_QA_STORAGE));
const out=process.env.FRUS_QA_OUT??'/tmp/webkit-first-swing';await mkdir(out,{recursive:true});
const b=await webkit.launch();const results=[];
try{for(const appearance of ['compiler','compiler_clara']){
 const saved=structuredClone(storage),entry=saved.origins[0].localStorage.find(s=>s.name==='rubyRuleFrusQuestSave'),game=JSON.parse(entry.value);game.state.playerProfile.compilerAppearance=appearance;entry.value=JSON.stringify(game);
 const p=await b.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,storageState:saved});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(process.env.FRUS_QA_URL??'http://127.0.0.1:5211/');await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));
 const tap=async(x,y)=>{const r=await p.locator('canvas').first().boundingBox();await p.touchscreen.tap(r.x+x*r.width/256,r.y+y*r.height/240);};
 await tap(86,154);await p.waitForFunction(()=>window.game.scene.isActive('ArchiveScene'));await p.waitForTimeout(500);
 await p.evaluate(()=>{const s=window.game.scene.getScene('ArchiveScene');window.qaSwing=[];const record=()=>{const h=s.player,phase=h.combatReadout.weapon.phase;if(phase==='idle'||window.qaSwing.some(r=>r.phase===phase))return;window.qaSwing.push({phase,frame:Number(h.attackPoseSprite.frame.name),visible:h.attackPoseSprite.visible,baseVisible:h.sprite.visible,key:h.attackPoseSprite.texture.key});};s.events.on('postupdate',record);});
 await tap(174,216);await p.waitForFunction(()=>window.qaSwing.some(r=>r.phase==='cooldown'));await p.waitForTimeout(750);
 const phases=await p.evaluate(()=>window.qaSwing);assert.deepEqual(phases.map(p=>p.phase),['windup','active','cooldown']);for(const [row,phase] of phases.entries()){assert.equal(Math.floor(phase.frame/4),row);assert(phase.visible);assert.equal(phase.baseVisible,false);assert.equal(phase.key,appearance==='compiler'?'compiler-attack-v1':'clara-attack-v1');}
 const idle=await p.evaluate(()=>{const h=window.game.scene.getScene('ArchiveScene').player;return {phase:h.combatReadout.weapon.phase,attack:h.attackPoseSprite.visible,body:h.sprite.visible};});assert.deepEqual(idle,{phase:'idle',attack:false,body:true});
 await p.screenshot({path:`${out}/${appearance}-after.png`});assert.deepEqual(errors,[]);results.push({appearance,phases,idle,errors});await p.close();
}await writeFile(`${out}/result.json`,JSON.stringify(results,null,2));console.log(JSON.stringify({engine:'webkit',touchSwings:results.length,phases:results.reduce((n,r)=>n+r.phases.length,0),errors:[]}));}finally{await b.close();}
