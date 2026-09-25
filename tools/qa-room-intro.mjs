import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');const browser=await chromium.launch();const out='/tmp/room-intro';await mkdir(out,{recursive:true});const results=[];
try{for(const mobile of [false,true])for(const reduced of [false,true]){
 const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile,reducedMotion:reduced?'reduce':'no-preference'});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5211/?scene=ArchiveScene');await p.waitForFunction(()=>window.game?.scene.isActive('ArchiveScene'));
 const state=await p.evaluate(()=>{const s=window.game.scene.getScene('ArchiveScene'),banner=s.children.getByName('snes-room-intro-banner'),panel=banner.list.find(o=>o.name==='snes-room-intro-panel'),title=banner.list.find(o=>o.name==='snes-room-intro-title');return {bannerY:banner.y,panelHeight:panel.height,title:title.text,titleWidth:title.width,panelWidth:panel.width,toast:s.toast.visible,objective:JSON.parse(window.render_game_to_text()).objective};});
 assert.equal(state.bannerY,48);assert.equal(state.panelHeight,24);assert(state.titleWidth<=state.panelWidth-16);assert.equal(state.toast,false);assert.match(state.objective,/SOURCE NOTE/i);
 await p.screenshot({path:`${out}/${mobile?'phone':'desktop'}-${reduced?'reduced':'normal'}.png`});
 await p.waitForFunction(()=>!window.game.scene.getScene('ArchiveScene').children.getByName('snes-room-intro-banner'));
 assert.deepEqual(errors,[]);results.push({mobile,reduced,...state,dismissed:true,errors});await p.close();
}console.log(JSON.stringify(results));await writeFile(`${out}/result.json`,JSON.stringify(results,null,2));}finally{await browser.close();}
