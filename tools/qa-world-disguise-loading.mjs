import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/frus-world-disguise-loading';await mkdir(out,{recursive:true});
const b=await chromium.launch();let release=()=>{},releaseRapid=()=>{};
try{
 const p=await b.newPage({viewport:{width:1024,height:960}}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 let requested;const requestSeen=new Promise(r=>requested=r);const delayed=new Promise(r=>release=r);
 await p.route('**/02-the-town.png',async route=>{requested();await delayed;await route.continue();});
 await p.goto(new URL('?scene=ResearchWorldScene',process.env.FRUS_QA_URL??'http://127.0.0.1:5221/').href);
 await p.waitForFunction(()=>window.game?.scene.getScene('ResearchWorldScene')?.player);
 const snapshot=()=>p.evaluate(()=>{const s=window.game.scene.getScene('ResearchWorldScene');return{active:s.sys.isActive(),zone:s.zone,loading:s.load.isLoading(),children:s.children.list.length,disguise:s.disguise,texture:s.danne.texture.key,player:{x:s.player.position.x,y:s.player.position.y}};});
 const cross=async(x,key)=>{await p.evaluate(x=>window.game.scene.getScene('ResearchWorldScene').player.setPosition(x,135),x);await p.keyboard.down(key);await p.waitForTimeout(80);await p.keyboard.up(key);};
 await cross(247,'ArrowRight');await requestSeen;await p.waitForTimeout(150);
 const waiting=await snapshot();assert(waiting.active);assert.equal(waiting.zone,0);assert(waiting.loading);assert(waiting.children>30);assert.equal(waiting.texture,'danne-disguise-0');
 const before=await p.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').player.position.x);await p.keyboard.down('ArrowRight');await p.waitForTimeout(160);await p.keyboard.up('ArrowRight');
 const after=await p.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').player.position.x);assert(after>before+3,'Destination accepts movement before cosmetic image completes');
 await p.screenshot({path:out+'/while-loading.png'});release();
 await p.waitForFunction(()=>window.game.scene.getScene('ResearchWorldScene').disguise===1);const loaded=await snapshot();assert.equal(loaded.texture,'danne-disguise-1');
 // Leave again before the image finishes. A departing scene's callback must
 // not update a destroyed sprite or overwrite the active destination.
 let rapidRequested;const rapidSeen=new Promise(r=>rapidRequested=r),rapidGate=new Promise(r=>releaseRapid=r);
 await p.route('**/03-the-accountant.png',async route=>{rapidRequested();await rapidGate;await route.continue();});
 await cross(8,'ArrowLeft');await rapidSeen;await p.waitForTimeout(150);await cross(247,'ArrowRight');await p.waitForTimeout(150);
 const rapid=await snapshot();assert(rapid.active);assert.equal(rapid.zone,0);assert.equal(rapid.texture,'danne-disguise-1');
 releaseRapid();await p.waitForFunction(()=>window.game.scene.getScene('ResearchWorldScene').disguise===2);
 // A failed cosmetic request retains the cached pose; B can retry normally.
 await p.route('**/04-gone-girl.png',route=>route.abort());await cross(8,'ArrowLeft');
 await p.waitForFunction(()=>{const s=window.game.scene.getScene('ResearchWorldScene');return s.zone===1&&!s.load.isLoading();});
 const failed=await snapshot();assert(failed.active);assert(failed.children>30);assert.equal(failed.texture,'danne-disguise-2');
 await p.unroute('**/04-gone-girl.png');await p.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').player.setPosition(130,153));await p.waitForTimeout(200);await p.keyboard.press('x');
 await p.waitForFunction(()=>window.game.scene.getScene('ResearchWorldScene').disguise===3);const retried=await snapshot();assert.equal(retried.texture,'danne-disguise-3');
 assert.deepEqual(errors,[]);await p.screenshot({path:out+'/retried.png'});await writeFile(out+'/result.json',JSON.stringify({scope:'Bounded approach-placement fixtures with real movement/B input; held and failed image requests.',waiting,movement:{before,after},loaded,rapid,failed,retried,errors},null,2));console.log('PASS playable destination, rapid crossing, failed-image fallback and retry');
}finally{release();releaseRapid();await b.close();}
