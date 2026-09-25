import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
import {readFile} from 'node:fs/promises';
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5213/';
if(!process.env.FRUS_CAMPAIGN_OUT)throw Error('Provide earned campaign directory');
const browser=await chromium.launch({args:['--disable-audio-output']});
try{for(const [name,path]of [['annotation','02-earned-source-note'],['source','03-earned-annotation']]){
const storage=JSON.parse(await readFile(`${process.env.FRUS_CAMPAIGN_OUT}/${path}/earned-storage.json`));for(const o of storage.origins)o.origin=new URL(base).origin;
const p=await browser.newPage({storageState:storage,viewport:{width:1024,height:960}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto(new URL('?text=full',base).href);await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await p.keyboard.press('Enter');await p.waitForFunction(()=>window.game?.scene.isActive('ArchiveScene'));await p.waitForTimeout(2300);await p.screenshot({path:`/tmp/research-floor-${name}.png`});assert.deepEqual(errors,[]);assert(await p.evaluate(()=>!!window.game.scene.getScene('ArchiveScene').children.getByName('research-terrazzo-floor')));console.log(name,await p.evaluate(()=>({room:window.game.scene.getScene('ArchiveScene').currentRoomId,floor:!!window.game.scene.getScene('ArchiveScene').children.getByName('research-terrazzo-floor')})),errors);await p.close();}
}finally{await browser.close();}
