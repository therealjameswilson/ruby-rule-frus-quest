import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const engine=process.env.FRUS_QA_ENGINE==='webkit'?webkit:chromium;const out=process.env.FRUS_QA_OUT??'/tmp/nsc-route';
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5211/';await mkdir(out,{recursive:true});const browser=await engine.launch({args:engine===chromium?['--disable-audio-output']:[]});
try{
 const p=await browser.newPage({viewport:{width:1024,height:960}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(new URL('?scene=PresidentialLibraryScene',base).href);await p.waitForFunction(()=>window.game?.scene.isActive('PresidentialLibraryScene'));
 // Dismiss the genuine briefing; no player-position or progression mutation.
 for(let i=0;i<65;i++){if(!await p.evaluate(()=>window.game.scene.getScene('PresidentialLibraryScene').dialog.active))break;await p.keyboard.press('Space');await p.waitForTimeout(150);}
 const pos=()=>p.evaluate(()=>window.game.scene.getScene(window.game.scene.isActive('NscLibraryScene')?'NscLibraryScene':'PresidentialLibraryScene').player.position);
 const move=async(key,predicate)=>{await p.keyboard.down(key);try{await p.waitForFunction(predicate,{}, {timeout:10000});}finally{await p.keyboard.up(key);}await p.waitForTimeout(150);};
 await move('ArrowLeft',()=>window.game.scene.getScene('PresidentialLibraryScene').player.position.x<=95);
 await move('ArrowUp',()=>window.game.scene.getScene('PresidentialLibraryScene').player.position.y<=86);
 await move('ArrowRight',()=>window.game.scene.getScene('PresidentialLibraryScene').player.position.x>=125);
 await p.screenshot({path:`${out}/lobby-entrance.png`});await p.keyboard.press('Space');await p.waitForFunction(()=>window.game.scene.isActive('NscLibraryScene'));await p.waitForTimeout(350);
 await move('ArrowUp',()=>window.game.scene.getScene('NscLibraryScene').player.position.y<=146);
 await move('ArrowLeft',()=>window.game.scene.getScene('NscLibraryScene').player.position.x<=64);
 await p.keyboard.press('Space');await p.waitForTimeout(250);assert(await p.evaluate(()=>window.game.scene.getScene('NscLibraryScene').dialog.active));
 for(let i=0;i<40;i++){if(!await p.evaluate(()=>window.game.scene.getScene('NscLibraryScene').dialog.active))break;await p.keyboard.press('Space');await p.waitForTimeout(150);}
 // South return remains available before solving anything.
 await move('ArrowRight',()=>window.game.scene.getScene('NscLibraryScene').player.position.x>=125);
 await move('ArrowUp',()=>window.game.scene.getScene('NscLibraryScene').player.position.y<=86);
 await p.screenshot({path:`${out}/wing-north-signage.png`});
 const layers=await p.evaluate(()=>{const s=window.game.scene.getScene('NscLibraryScene');const hero=s.player.sprite.getBounds(),sign=s.gate.getBounds();return {hero:s.player.sprite.depth,sign:s.gate.depth,overlaps:hero.left<sign.right&&hero.right>sign.left&&hero.top<sign.bottom&&hero.bottom>sign.top};});assert(layers.sign<layers.hero&&!layers.overlaps);
 await p.keyboard.down('ArrowDown');await p.waitForFunction(()=>window.game.scene.isActive('PresidentialLibraryScene'));await p.keyboard.up('ArrowDown');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({walkedFromLobby:true,readGuide:true,unsolvedReturn:true,errors}));await p.close();
}finally{await browser.close();}
