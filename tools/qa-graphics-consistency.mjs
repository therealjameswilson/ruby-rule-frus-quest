import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5211/';
const out=process.env.FRUS_QA_OUT??'/tmp/frus-graphics-consistency';await mkdir(out,{recursive:true});
const scenes=(process.env.FRUS_QA_SCENES?.split(',')??['OfficeScene','GuideScene','ArchiveScene','NetworkScene','ReferralVaultScene','SilentReadScene','ResearchWorldScene','PresidentialLibraryScene','NscLibraryScene','EndingScene','CherryBlossomGardenScene','NaraStacksScene','EmbassyCableRoomScene','SenateHearingChamberScene','HiddenReadingRoomScene','BlackVaultLairScene','WorldMapScene']);
const browser=await chromium.launch();const results=[];
try{for(const mobile of [false,true])for(const target of scenes){
 const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?3:1});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(new URL('?scene=OfficeScene&text=full',base).href);await p.waitForFunction(()=>window.game?.scene.isActive('OfficeScene'));
 if(target!=='OfficeScene')await p.evaluate(target=>window.game.scene.getScene('OfficeScene').scene.start(target),target);
 await p.waitForFunction(target=>window.game.scene.isActive(target),target);
 for(let i=0;i<40;i++){if(!await p.evaluate(t=>Boolean(window.game.scene.getScene(t).dialog?.active),target))break;await p.keyboard.press('Space');await p.waitForTimeout(110);}
 await p.waitForTimeout(500);
 const info=await p.evaluate(target=>{const s=window.game.scene.getScene(target);const all=[];const walk=list=>{for(const o of list){all.push(o);if(o.list)walk(o.list);}};walk(s.children.list);return {scene:JSON.parse(window.render_game_to_text()).scene,walls:all.filter(o=>o.name==='crisp-dungeon-wall').map(o=>({w:o.displayWidth,h:o.displayHeight,source:o.texture.getSourceImage().width})),readingFloor:!!s.children.getByName('hidden-reading-room-floor'),floor:!!s.children.getByName('guide-cavern-floor'),guide:s.children.getByName('archive-guide-detailed')?.displayHeight,copiers:all.filter(o=>o.name==='bureaucratic-wall-stone-sprite').map(o=>({key:o.texture.key,w:o.displayWidth,h:o.displayHeight})),items:all.filter(o=>o.texture?.key.startsWith('world-item-detail-v2-')).map(o=>({key:o.texture.key,w:o.displayWidth,h:o.displayHeight})),textures:s.textures.getTextureKeys().length};},target);
 assert.equal(info.scene,target);for(const w of info.walls){assert.equal(w.source,64);assert.equal(w.w,16);assert.equal(w.h,16);}for(const c of info.copiers){assert(c.key.startsWith('photocopier-cabinet-v2'));assert.equal(c.w,32);assert.equal(c.h,32);}for(const i of info.items){assert(i.w<=24.01&&i.h<=24.01,'Item must retain its logical footprint');}
 if(target==='GuideScene'){assert(info.floor);assert.equal(info.guide,40);}
 if(target==='HiddenReadingRoomScene')assert(info.readingFloor);
 assert.deepEqual(errors,[]);await p.screenshot({path:`${out}/${mobile?'phone':'desktop'}-${target}.png`});results.push({mobile,...info,errors});await p.close();
}}finally{await browser.close();}await writeFile(`${out}/result.json`,JSON.stringify(results,null,2));console.log(JSON.stringify({cases:results.length,errors:results.flatMap(r=>r.errors)}));
