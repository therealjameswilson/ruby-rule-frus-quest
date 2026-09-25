import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');const base=process.env.FRUS_QA_CAMPAIGN??'/tmp/frus-campaign-current-1c8c477';await mkdir('/tmp/terminal-cabinets',{recursive:true});const browser=await chromium.launch({args:['--disable-audio-output']});
try{for(const [scene,stage,expected] of [['NetworkScene','05-earned-network',2],['ReferralVaultScene','07-earned-clearance',1],['SilentReadScene','09-earned-referral-manifest',1]]){
 const storage=JSON.parse(await readFile(`${base}/${stage}/earned-storage.json`,'utf8'));
 const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,storageState:storage});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5211/?text=full');await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));const b=await p.locator('canvas').first().boundingBox();await p.touchscreen.tap(b.x+86*b.width/256,b.y+154*b.height/240);await p.waitForFunction(s=>window.game.scene.isActive(s),scene);await p.waitForTimeout(1800);
 const terminals=await p.evaluate(scene=>window.game.scene.getScene(scene).children.list.filter(o=>['terminal-opennet','terminal-classnet','terminal-statechat'].includes(o.name)).map(o=>({name:o.name,x:o.x,y:o.y,depth:o.depth,count:o.list.length,owned:o.list.every(c=>c.parentContainer===o),cabinet:o.list.find(c=>c.name==='terminal-detailed-cabinet')?.texture.key,status:o.list.find(c=>c.name==='terminal-screen-status')?.text})),scene);
 assert.equal(terminals.length,expected);for(const t of terminals){assert.equal(t.count,6);assert(t.owned);assert.equal(t.depth,t.y);assert.equal(t.cabinet,'archive-terminal-cabinet-v1');assert(t.status);if(t.name==='terminal-statechat')assert.equal(t.status,'TEXT ONLY');}
 if(scene==='NetworkScene')assert.deepEqual(terminals.map(t=>[t.x,t.y]),[[60,124],[196,124]]);
 await p.screenshot({path:`/tmp/terminal-cabinets/${scene}-phone.png`});assert.deepEqual(errors,[]);console.log(JSON.stringify({scene,terminals,errors}));await p.close();
}}finally{await browser.close();}
