import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');await mkdir('/tmp/gate-art',{recursive:true});
const browser=await chromium.launch({args:['--disable-audio-output']});
try {
 for(const mobile of [false,true]) {
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:5211/?scene=ArchiveScene');await page.waitForFunction(()=>window.game?.scene.getScene('ArchiveScene').gateArt?.size===4);await page.waitForTimeout(2500);
  for(const unlocked of [false,true]) {
   const result=await page.evaluate(unlocked=>{
    const s=window.game.scene.getScene('ArchiveScene');const previous=[...s.gateArt.values()].flat();
    for(const dir of ['north','south','west','east'])s.drawGate(dir,true,unlocked,undefined,'OFFICE');
    return {removed:previous.every(o=>!o.scene),gates:[...s.gateArt.entries()].map(([dir,objects])=>{const a=objects.find(o=>o.name==='snes-gate-detailed-frame');return {dir,key:a.texture.key,width:a.displayWidth,height:a.displayHeight,angle:a.angle,source:a.texture.getSourceImage().width,label:objects.some(o=>o.name===(unlocked?'snes-gate-route-label':'snes-gate-lock-label'))};})};
   },unlocked);
   assert(result.removed);assert.equal(result.gates.length,4);
   for(const g of result.gates){assert(g.key.includes(unlocked?'-open-':'-locked-'));assert.equal(g.width,40);assert.equal(g.height,16);assert.equal(g.source,160);assert(g.label);assert.equal(g.angle,{north:0,south:-180,west:-90,east:90}[g.dir]);}
   await page.screenshot({path:`/tmp/gate-art/${mobile?'phone':'desktop'}-${unlocked?'open':'locked'}.png`});
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({mobile,orientations:4,openAndLocked:true,replacedCleanly:true,errors}));await page.close();
 }
}finally{await browser.close();}
