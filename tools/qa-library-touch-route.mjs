import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5219/',out=process.env.FRUS_QA_OUT??'/tmp/frus-library-touch-route';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--disable-audio-output']});const results=[];
try {for(const [name,width,height] of [['portrait',390,844],['landscape',844,390]]) {
 const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});const cdp=await page.context().newCDPSession(page),errors=[],trajectory=[];page.on('pageerror',e=>errors.push(String(e)));
 const start=Date.now();let touchActions=0,dialogTaps=0;
 const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
 const position=()=>page.evaluate(()=>({...window.game.scene.getScene(window.game.scene.isActive('NscLibraryScene')?'NscLibraryScene':'PresidentialLibraryScene').player.position}));
 const scene=()=>page.evaluate(()=>window.game.scene.getScenes(true).map(s=>s.scene.key));
 const canvasPoint=async(x,y)=>{const r=await page.locator('canvas').first().boundingBox();return{x:r.x+x*r.width/256,y:r.y+y*r.height/240};};
 const action=async(key='space')=>{
  if(height>width)await page.locator(`#portrait-touch-dock [data-control="${key}"]`).tap();
  else {const closing=key==='start'&&(await state()).mode==='pause';const point=await canvasPoint(closing?224:key==='space'?225:key==='start'?120:174,closing?34:key==='space'?205:216);await page.touchscreen.tap(point.x,point.y);}
  touchActions++;await page.waitForTimeout(180);
 };
 const hold=async(direction,ms,cancel=false)=>{
  const [dx,dy]={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[direction];let point;
  if(height>width){const r=await page.locator('.portrait-dpad').boundingBox();point={x:r.x+r.width*(.5+dx*.35),y:r.y+r.height*(.5+dy*.35)};}
  else point=await canvasPoint(48+dx*25,202+dy*25);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});await page.waitForTimeout(ms);
  await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});touchActions++;await page.waitForTimeout(70);
 };
 const walk=async(axis,target)=>{
  let stuck=0;
  for(let n=0;n<24;n++){
   const before=await position(),gap=target-before[axis];if(Math.abs(gap)<=6){trajectory.push({axis,target,position:before});return;}
   await hold(axis==='x'?(gap>0?'right':'left'):(gap>0?'down':'up'),Math.max(20,Math.min(180,Math.abs(gap)/90*1000)));
   const after=await position();if(process.env.FRUS_QA_TRACE)console.log(JSON.stringify({name,axis,target,before,after}));if(Math.abs(after[axis]-before[axis])<.4)stuck++;else stuck=0;
   assert(stuck<3,`${name} blocked on ${axis} toward ${target}: ${JSON.stringify(after)}`);
  }
  throw Error(`${name}: did not reach ${axis}=${target}`);
 };
 const tap=async selector=>{const el=page.locator(selector);await el.scrollIntoViewIfNeeded();await el.tap();touchActions++;await page.waitForTimeout(80);};
 const dismiss=async()=>{for(let n=0;n<35;n++){if((await state()).mode!=='dialog')return;dialogTaps++;await action();}throw Error('Dialog did not end');};
 const open=async(selector)=>{await action();await page.waitForSelector(selector);};
 await page.goto(base+'?scene=PresidentialLibraryScene');await page.waitForFunction(()=>window.game?.scene.isActive('PresidentialLibraryScene'));await page.waitForSelector('#boot-loader',{state:'hidden'});assert.equal((await state()).mode,'explore','arrival allows immediate movement');
 const beforePoints=(await state()).documentPoints;await page.screenshot({path:out+'/'+name+'-arrival.png'});
 await hold('right',100,true);const released=await position();await page.waitForTimeout(200);assert.deepEqual(await position(),released,'touch cancel releases movement');
 await walk('x',86);await walk('y',118);await walk('x',48);await open('.library-request');
 const stationary=await position();
 for(const selector of ['[data-entry="2"]','[data-attach]','[data-access="1"]','[data-followup="retrieval"]','[data-followup="withdrawals"]'])await tap('.library-request '+selector);
 assert.deepEqual(await position(),stationary,'reading does not move the hero');await tap('.library-request .manuscript-submit');assert.equal((await state()).mode,'explore','receipt does not block movement');assert.equal((await state()).mode,'explore');
 assert.equal((await state()).libraryResearch.find(l=>l.library==='reagan').completed,1);
 await action('start');await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='pause');const paused=await position();await hold('right',200);assert.deepEqual(await position(),paused);await action('start');await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='explore');
 const savedPosition=await position();await page.goto(base);await page.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await page.waitForSelector('#boot-loader',{state:'hidden'});const resume=await canvasPoint(86,154);await page.touchscreen.tap(resume.x,resume.y);touchActions++;await page.waitForFunction(()=>window.game.scene.isActive('PresidentialLibraryScene'));const restored=await position();assert(Math.hypot(restored.x-savedPosition.x,restored.y-savedPosition.y)<1);
 await walk('x',202);await open('.library-comparison');
 for(const [id,lane] of [[1,1],[2,2],[3,2],[4,3]])await tap(`.library-comparison [data-card="${id}"] [data-lane="${lane}"]`);
 for(const id of [1,2])await tap(`.library-comparison [data-followup="${id}"]`);
 await tap('.library-comparison .manuscript-submit');assert.equal((await state()).mode,'explore','receipt does not block movement');
 await walk('x',152);await walk('y',186);await walk('x',202);await open('.library-source-note');
 for(const field of ['kind','date','locator','scope'])await tap(`.library-source-note [data-field="${field}"] [data-value="1"]`);
 for(const item of ['lead','followups'])await tap(`.library-source-note [data-log="${item}"]`);
 await tap('.library-source-note .manuscript-submit');assert.equal((await state()).mode,'explore','receipt does not block movement');
 await walk('x',48);await open('.library-packet');
 for(const id of [1,2,3]){await tap(`.library-packet [data-part="${id}"]`);await tap('.library-packet [data-attach]');}
 await tap('.library-packet .manuscript-submit');await dismiss();
 assert((await state()).libraryPacket.filed);assert.equal((await state()).documentPoints,beforePoints+8);
 await page.screenshot({path:out+'/'+name+'-filed-room.png'});
 await walk('x',86);await walk('y',118);await walk('x',128);await walk('y',88);await action();await page.waitForFunction(()=>window.game.scene.isActive('NscLibraryScene'));
 await action('start');await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='pause');await action('start');await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='explore');
 await hold('down',320);await page.waitForFunction(()=>window.game.scene.isActive('PresidentialLibraryScene'));
 await walk('x',128);await hold('down',420);await page.waitForFunction(()=>window.game.scene.isActive('ResearchWorldScene'));await page.waitForTimeout(250);await page.screenshot({path:out+'/'+name+'-outside.png'});
 assert.deepEqual(errors,[]);results.push({name,touchActions,dialogTaps,elapsedSeconds:(Date.now()-start)/1000,trajectory,allFourDesksEarned:true,keyboardEvents:0,positionWrites:0,pauseStationary:true,nscPauseReturned:true,cancelReleased:true,resumedPosition:restored,exitScene:await scene(),errors});await page.close();
}}catch(error){for(const c of browser.contexts())for(const p of c.pages()){console.error(await p.evaluate(()=>window.render_game_to_text?.()).catch(String));await p.screenshot({path:out+'/failure.png'}).catch(()=>{});}throw error;}finally{await browser.close();}
await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
