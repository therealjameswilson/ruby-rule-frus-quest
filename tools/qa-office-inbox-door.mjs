import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/tmp/office-inbox-door';
await mkdir(out, {recursive:true});
const browser = await chromium.launch();
try {
 for (const mobile of [false,true]) {
  const context = await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile,storageState:process.env.FRUS_QA_STORAGE});
  const page=await context.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(new URL('?text=full', process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5211/').href);
  await page.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));
  const rect=await page.locator('canvas').first().boundingBox();
  const tap=async(x,y)=>page.touchscreen.tap(rect.x+x*rect.width/256,rect.y+y*rect.height/240);
  if(mobile) await tap(86,154); else await page.keyboard.press('Enter');
  await page.waitForFunction(()=>window.game.scene.isActive('OfficeScene') && JSON.parse(window.render_game_to_text()).sceneProgress);
  await page.waitForTimeout(700);
  const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
  const cdp=await context.newCDPSession(page);
  const act=async()=>{if(mobile)await tap(225,205);else await page.keyboard.press('Space');await page.waitForTimeout(250);};
  const move=async(x,y)=>{
   for(let i=0;i<120;i++){
    const s=await state(),dx=x-s.player.x,dy=y-s.player.y;
    if(Math.hypot(dx,dy)<3)return;
    assert.equal(s.mode,'explore');
    const horizontal=Math.abs(dx)>Math.abs(dy),sign=Math.sign(horizontal?dx:dy),duration=Math.max(20,Math.min(75,Math.max(Math.abs(dx),Math.abs(dy))*7));
    if(mobile){
     const p=(a,b)=>({x:rect.x+a*rect.width/256,y:rect.y+b*rect.height/240,id:1});
     await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p(48,202)]});
     await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p(48+(horizontal?sign*26:0),202+(horizontal?0:sign*26))]});
     await page.waitForTimeout(duration);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }else{
     const key=horizontal?(sign>0?'ArrowRight':'ArrowLeft'):(sign>0?'ArrowDown':'ArrowUp');
     await page.keyboard.down(key);await page.waitForTimeout(duration);await page.keyboard.up(key);
    }
    await page.waitForTimeout(40);
   }throw Error('Could not walk to '+x+','+y);
  };
  assert.equal((await state()).sceneProgress.officeStarterMemoStatus,1);
  await move(128,185);await move(60,185);
  assert.equal((await state()).nearestInteractable,'Route Memo');
  await page.screenshot({path:`${out}/${mobile?'phone':'desktop'}-inbox.png`});
  await act();assert.equal((await state()).sceneProgress.officeStarterMemoStatus,2);
  await act();
  for(let i=0;i<100;i++){
   const s=await state();
   if(s.mode==='explore')break;
   if(s.mode==='dialog'){await act();continue;}
   const index=s.choice?.options.findIndex(o=>['route','approve'].includes(o.value));
   assert(index>=0,'Expected an opening workflow decision');
   if(mobile){
    const point=await page.evaluate(i=>{const r=window.game.scene.getScene('OfficeScene').choice.rows[i].getBounds();return {x:r.centerX,y:r.centerY};},index);
    await tap(point.x,point.y);await page.waitForTimeout(250);
   }else{
    for(let j=0;j<index;j++)await page.keyboard.press('ArrowDown');
    await act();
   }
  }
  assert.equal((await state()).sceneProgress.officeStarterMemoStatus,3);
  await move(43,190);
  assert.equal((await state()).nearestInteractable,'Outside: Research World');
  await act();await page.waitForFunction(()=>window.game.scene.isActive('ResearchWorldScene'));
  assert.deepEqual(errors,[]);
  const result={mobile,memoRouted:true,memoStamped:true,walkedOutside:true,errors};
  await writeFile(`${out}/${mobile?'phone':'desktop'}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  await context.close();
 }
}finally{await browser.close();}
