const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
assert(process.env.FRUS_QA_STORAGE, 'Provide an earned carried-annotation checkpoint');
const out=process.env.FRUS_QA_OUT ?? '/private/tmp/frus-file-annotation';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
const mobile=process.argv.includes('--mobile');
const context=await browser.newContext({storageState:process.env.FRUS_QA_STORAGE,...(mobile?{viewport:{width:390,height:844},hasTouch:true,isMobile:true}:{})});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const westLabels = () => page.evaluate(() => window.game.scene.getScene('ArchiveScene').gateArt.get('west')
  .filter(object => typeof object.text === 'string').map(object => object.text));
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const shot=async name=>{await page.screenshot({path:`${out}/${name}.png`});await writeFile(`${out}/${name}.json`,JSON.stringify(await state(),null,2));};
const cdp=await context.newCDPSession(page);
if(mobile)for(const device of [page.keyboard,page.mouse])for(const method of ['press','down','up','click','move','type','insertText']){
 if(typeof device[method]==='function')device[method]=()=>{throw Error(`Non-touch input: ${method}`);};
}
const point=async(x,y)=>{const r=await page.locator('canvas').first().boundingBox();return{x:r.x+x*r.width/256,y:r.y+y*r.height/240};};
const tap=async(x,y)=>{const p=await point(x,y);await page.touchscreen.tap(p.x,p.y);};
const hold=async(key,ms)=>{
 if(!mobile){await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);return;}
 const [dx,dy]={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[key];
 let p;
 if(await page.locator('#portrait-touch-dock').isVisible()){
  const r=await page.locator('.portrait-dpad').boundingBox();p={x:r.x+r.width*(.5+dx*.35),y:r.y+r.height*(.5+dy*.35)};
 }else p=await point(48+dx*26,202+dy*26);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});await page.waitForTimeout(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
};
const key=async(key='Space')=>{
 if(!mobile)await page.keyboard.press(key,{delay:50});
 else if(key.startsWith('Arrow'))await hold(key,50);
 else if((await state()).scene==='TapToStartScene')await tap(86,154);
 else if(await page.locator('#portrait-touch-dock').isVisible())await page.locator('#portrait-touch-dock [data-control="space"]').tap();
 else await tap(225,205);
 await page.waitForTimeout(200);
};
async function move(x,y){for(let i=0;i<100;i++){const p=(await state()).player,dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<4&&Math.abs(dy)<4)return;const horizontal=Math.abs(dx)>=4;const k=horizontal?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp';await hold(k,Math.min(100,Math.max(25,Math.abs(horizontal?dx:dy)/72*1000)));await page.waitForTimeout(30);}throw Error(`Cannot walk to ${x},${y}`);}
try{
 await page.goto(new URL('?text=full',process.env.FRUS_QA_URL??'http://127.0.0.1:5195/').href);
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ArchiveScene');await page.waitForTimeout(1000);
 assert.equal((await state()).sceneProgress.annotationGatheredMask,7);await shot('arrival');
 assert((await westLabels()).includes('LOCK'), 'Carried packet should visibly lock the Office return');
 await move(88,84);await move(88,154);await move(128,154);await key();await shot('review');
 console.log(JSON.stringify((await state()).choice));
 const choose=async key=>{const e=page.locator('.annotation-packet-desk [data-focus-key='+key+']');await e.scrollIntoViewIfNeeded();if(mobile)await e.tap();else await e.click();await page.waitForTimeout(150);};
 await choose('file');assert(!(await state()).sceneProgress.annotationDraftingComplete);
 await choose('single_folder');await choose('file');assert(!(await state()).sceneProgress.repositoryCoverageMapComplete);await shot('rejected');
 await choose('coverage');assert(!(await state()).sceneProgress.annotationDraftingComplete);
 await choose('leave');await key();assert.equal(await page.locator('[aria-pressed=true]').count(),0);
 await choose('coverage');await choose('file');await page.waitForTimeout(600);await shot('filed');
 assert.equal((await state()).sceneProgress.annotationDraftingComplete,1);
 assert((await westLabels()).includes('OFFICE'), 'Filing must restore the Office sign without reloading the room');
 assert(!(await westLabels()).includes('LOCK'));
 assert.equal((await state()).objective,'ADD TELEGRAM TO FILE');
 assert.match((await state()).latestMessage,/Source, context, and selection notes filed together/);
 await context.storageState({path:`${out}/earned-storage.json`});
 await writeFile(`${out}/result.json`,JSON.stringify({mobile,annotationFiled:true,officeReturnRestored:true,errors},null,2));
 assert.deepEqual(errors,[]);console.log('PASS earned annotation packet filed');
}finally{await shot('last');await browser.close();}
