import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out='/tmp/compact-archive-prompt';await mkdir(out,{recursive:true});const browser=await chromium.launch();const results=[];
try{for(const mobile of [false,true]){
 const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},isMobile:mobile,hasTouch:mobile});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5211/?scene=ArchiveScene');await p.waitForFunction(()=>window.game?.scene.isActive('ArchiveScene'));await p.waitForTimeout(300);
 const act=async()=>{if(mobile){const r=await p.locator('canvas').first().boundingBox();await p.touchscreen.tap(r.x+225*r.width/256,r.y+205*r.height/240);}else await p.keyboard.press('Space');await p.waitForTimeout(170);};
 await p.evaluate(()=>{const s=window.game.scene.getScene('ArchiveScene');s.enterRoom('A3',{x:112,y:126},false);});
 await p.waitForFunction(()=>window.game.scene.getScene('ArchiveScene').interactionPrompt.labelText.text==='TALK');
 await act();assert(await p.evaluate(()=>window.game.scene.getScene('ArchiveScene').dialog.active));
 for(let i=0;i<35&&await p.evaluate(()=>window.game.scene.getScene('ArchiveScene').dialog.active);i++)await act();
 assert.equal(await p.evaluate(()=>window.game.scene.getScene('ArchiveScene').dialog.active),false);
 await p.evaluate(()=>{const s=window.game.scene.getScene('ArchiveScene');s.enterRoom('A1',{x:128,y:190},false);const target=s.interactables.find(x=>x.id==='source-note');s.player.setPosition(target.x,target.y+12);});
 await p.waitForFunction(()=>window.game.scene.getScene('ArchiveScene').interactionPrompt.labelText.text==='TAKE NOTE');
 const before=await p.evaluate(()=>{const s=window.game.scene.getScene('ArchiveScene');return {text:s.interactionPrompt.labelText.text,width:s.interactionPrompt.panel.width,visible:s.interactionPrompt.visible,target:JSON.parse(window.render_game_to_text()).nearestInteractable,status:s.sourceNoteStatus};});
 assert(before.visible);assert(before.width<=100);assert.match(before.target,/Source Note/i);
 await p.screenshot({path:`${out}/${mobile?'phone':'desktop'}-cue.png`});
 if(mobile){const r=await p.locator('canvas').first().boundingBox();await p.touchscreen.tap(r.x+225*r.width/256,r.y+205*r.height/240);}else await p.keyboard.press('Space');
 await p.waitForFunction(()=>window.game.scene.getScene('ArchiveScene').sourceNoteStatus==='carried');
 assert.deepEqual(errors,[]);results.push({mobile,...before,pickupSucceeded:true,npcTalkSucceeded:true,errors});await p.close();
}console.log(JSON.stringify(results));await writeFile(`${out}/result.json`,JSON.stringify(results,null,2));}finally{await browser.close();}
