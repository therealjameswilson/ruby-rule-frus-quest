import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base=process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5231/';
const out=process.env.FRUS_QA_OUT ?? '/tmp/frus-map-cues';
await mkdir(out,{recursive:true});
const browser=await chromium.launch(),rows=[],errors=[];
try {
 for(const [name,width,height] of [['phone',375,667],['landscape',844,390],['desktop',1024,960]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:name!=='desktop',isMobile:name!=='desktop'});
 page.on('pageerror',e=>errors.push(String(e)));
 for(const map of ['historian_office','nara_stacks','foggy_bottom','west_wing','black_vault','frus_floor','embassy','capitol_hill']){
  await page.goto(new URL(`?scene=GameplayMapScene&map=${map}`,base).href);
  await page.waitForFunction(()=>window.game?.scene.isActive('GameplayMapScene'));
  await page.waitForTimeout(900);
  const row=await page.evaluate(()=>{
   const scene=window.game.scene.getScene('GameplayMapScene'),ui=window.game.scene.getScene('UIScene');
   return {objective:ui.questBandText.text,action:ui.questBandCueText.text,footer:scene.hintText.text,
    prompt:scene.prompt.container.visible?scene.prompt.labelText.text:null,
    promptBounds:scene.prompt.container.visible?scene.prompt.border.getBounds():null,
    state:JSON.parse(window.render_game_to_text())};
  });
  assert(!row.objective.includes('...'),`${map} objective clips: ${row.objective}`);
  if(row.prompt){assert(row.prompt.length<=11,`${map} prompt must be a short verb`);assert(row.promptBounds.x>=0 && row.promptBounds.x+row.promptBounds.width<=256);}
  if(row.state.nearestInteractable)assert.equal(row.action,'USE MARKED TARGET');
  if(['historian_office','west_wing','frus_floor'].includes(map))await page.screenshot({path:`${out}/${name}-${map}.png`});
  rows.push({layout:name,map,objective:row.objective,action:row.action,footer:row.footer,prompt:row.prompt});
 }
 await page.close();
 }
 assert.deepEqual(errors,[]);
 await writeFile(`${out}/result.json`,JSON.stringify({scope:'24 direct-entry presentation fixtures, not progression',rows,errors},null,2));
 console.log(JSON.stringify({cases:rows.length,errors}));
}finally{await browser.close();}
