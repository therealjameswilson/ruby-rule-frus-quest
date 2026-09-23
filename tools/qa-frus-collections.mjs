import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5202/';
const out=process.env.FRUS_QA_OUT??'/tmp/frus-collections-qa';await mkdir(out,{recursive:true});
const browser=await chromium.launch();const results=[];
try{for(const phone of [false,true]){
 const ctx=await browser.newContext({viewport:phone?{width:375,height:667}:{width:1024,height:960},isMobile:phone,hasTouch:phone});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base+'?scene=ResearchWorldScene');await page.waitForFunction(()=>window.game?.scene.getScene('ResearchWorldScene')?.player);await page.waitForTimeout(500);
 await page.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').travel(0));await page.waitForTimeout(500);
 const act=async b=>{if(phone){const r=await page.locator('canvas').first().boundingBox();await page.touchscreen.tap(r.x+(b?173:223)*r.width/256,r.y+(b?216:206)*r.height/240);}else await page.keyboard.press(b?'x':'Space');await page.waitForTimeout(120);};
 for(const [id,x,term] of [['nara',64,'Carl Marcy'],['loc',192,'Cordell Hull']]){
  await page.evaluate(x=>window.game.scene.getScene('ResearchWorldScene').player.setPosition(x,134),x);await page.waitForTimeout(80);await act(false);
  const pages=await page.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').dialog.pages.join(' '));assert(pages.includes(term));assert(pages.includes('FRUS'));
  await page.screenshot({path:`${out}/${phone?'phone':'desktop'}-${id}.png`});
  await page.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').dialog.hide());await page.waitForTimeout(100);
  const opened=ctx.waitForEvent('page');await act(true);const guide=await opened;await guide.waitForLoadState();await guide.waitForSelector('article');
  assert(guide.url().endsWith('#'+id));assert.equal(await guide.locator('article').count(),6);
  assert.equal(await guide.locator('a[href^="https://history.state.gov/historicaldocuments/"]').count(),6);
  assert(await guide.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await guide.screenshot({path:`${out}/${phone?'phone':'desktop'}-${id}-guide.png`});await guide.close();
 }
 await page.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').journal());
 assert((await page.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').dialog.pages.join(' '))).includes('Carl Marcy'));
 assert.deepEqual(errors,[]);results.push({phone,passed:['landmark collection dialogue','B source guide','six cited records','mobile layout','journal entries'],errors});await ctx.close();
}console.log(JSON.stringify(results));await writeFile(out+'/results.json',JSON.stringify(results,null,2));}finally{await browser.close();}
