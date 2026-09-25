import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/clearance-desks';await mkdir(out,{recursive:true});
const browser=await chromium.launch();
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile,storageState:process.env.FRUS_QA_STORAGE});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));
  await p.goto(new URL('?text=full',process.env.FRUS_QA_URL??'http://127.0.0.1:5211/').href);
  await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));
  if(mobile){const b=await p.locator('canvas').first().boundingBox();await p.touchscreen.tap(b.x+b.width*86/256,b.y+b.height*154/240);}else await p.keyboard.press('Enter');
  await p.waitForFunction(()=>window.game.scene.isActive('NetworkScene'));await p.waitForTimeout(2400);
  const stations=await p.evaluate(()=>window.game.scene.getScene('NetworkScene').children.list.filter(o=>o.name?.startsWith('classnet-station-')).map(c=>({name:c.name,depth:c.depth,y:c.y,desk:c.list.filter(o=>o.name==='classnet-research-desk').map(o=>({texture:o.texture.key,width:o.displayWidth,height:o.displayHeight,top:o.getBounds().top,bottom:o.getBounds().bottom})),plaqueBottom:c.list.find(o=>o.name==="classnet-station-plaque").getBounds().bottom,labels:c.list.filter(o=>typeof o.text==='string').map(o=>o.text)})));
  assert.equal(stations.length,3);for(const s of stations){assert.equal(s.desk.length,1);assert(Math.abs(s.desk[0].width-58)<0.001);assert.equal(s.depth,s.y+12);if(s.name!=='classnet-station-release_board')assert(s.plaqueBottom<150,'South station label must stay above touch controls');}
  assert.equal(new Set(stations.map(s=>s.desk[0].texture)).size,3,'Every station needs distinct furniture');
  for(const s of stations){assert(s.desk[0].texture.startsWith('clearance-'));assert(s.desk[0].height<=36);}
  assert.deepEqual(stations.flatMap(s=>s.labels).sort(),['HUMAN','LEDGER','RELEASE']);
  await p.screenshot({path:`${out}/${mobile?'phone':'desktop'}.png`});
  assert.deepEqual(errors,[]);await writeFile(`${out}/${mobile?'phone':'desktop'}.json`,JSON.stringify({mobile,stations,errors},null,2));console.log(JSON.stringify({mobile,stations:3,errors}));await context.close();
 }
}finally{await browser.close();}
