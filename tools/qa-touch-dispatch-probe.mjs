import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out='/tmp/touch-dispatch-probe';await mkdir(out,{recursive:true});
const browser=await chromium.launch();
try{
 const context=await browser.newContext({storageState:'/tmp/referral-floor-route-desktop/earned-storage.json',viewport:{width:375,height:667},hasTouch:true,isMobile:true,deviceScaleFactor:3});
 const page=await context.newPage();const cdp=await context.newCDPSession(page);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5211/?text=full');await page.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));
 let b=await page.locator('canvas').first().boundingBox();await page.touchscreen.tap(b.x+86*b.width/256,b.y+154*b.height/240);
 await page.waitForFunction(()=>window.game.scene.isActive('ReferralVaultScene'));await page.waitForTimeout(1000);
 // Diagnostic scene/position fixtures, not campaign progression evidence.
 await page.evaluate(()=>{const s=window.game.scene.getScene('ReferralVaultScene');s.currentRoomId='R3';s.redrawReferralRoom({x:141,y:84});});
 const observe=()=>page.evaluate(()=>{const s=window.game.scene.getScene('ReferralVaultScene');return {position:s.player.position,debug:window.rubyRuleTouchControls};});
 const results=[];
 for(const cached of [false,true])for(const duration of [50,100,200]){
  await page.evaluate(()=>window.game.scene.getScene('ReferralVaultScene').player.setPosition(141,84));await page.waitForTimeout(150);
  b=await page.locator('canvas').first().boundingBox();
  const send=async(type,points)=>{const started=Date.now();if(!cached)b=await page.locator('canvas').first().boundingBox();await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y])=>({id:1,x:b.x+x*b.width/256,y:b.y+y*b.height/240}))});return Date.now()-started;};
  const before=await observe();const startMs=await send('touchStart',[[48,202]]);const moveMs=await send('touchMove',[[22,202]]);await page.waitForTimeout(duration);const held=await observe();const endMs=await send('touchEnd',[]);await page.waitForTimeout(150);const after=await observe();
  results.push({cached,duration,startMs,moveMs,endMs,before,held,after});console.log(JSON.stringify(results.at(-1)));
 }
 await page.screenshot({path:`${out}/room.png`});await writeFile(`${out}/results.json`,JSON.stringify({results,errors},null,2));
}finally{await browser.close();}
