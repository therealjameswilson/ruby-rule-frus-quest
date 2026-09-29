import {completeLibraryPacket} from './library-packet-actions.mjs';
import {completeLibrarySourceNote} from './library-source-note-actions.mjs';
import {completeLibraryComparison} from './library-comparison-actions.mjs';
import {completeLibraryRequest} from './library-request-actions.mjs';
import {completeChapterDesk} from './chapter-desk-actions.mjs';
import {completeRevisionDesk} from './revision-desk-actions.mjs';
// Select the researched workflow answers through controls, never by changing flags.
export async function completeCompilerCheckpoint(page,touch=false,observe=async()=>{}) {
 const click=async selector=>{const element=page.locator(selector);await element.scrollIntoViewIfNeeded();if(touch)await element.tap();else await element.click();};
 const canvasTap=async(x,y)=>{const r=await page.locator('canvas').first().boundingBox();await page.touchscreen.tap(r.x+x*r.width/256,r.y+y*r.height/240);};
 const advance=async()=>{if(!touch)await page.keyboard.press('Space',{delay:45});else if(await page.locator('#portrait-touch-dock').isVisible())await click('#portrait-touch-dock [data-control="space"]');else await canvasTap(225,205);};
 const answers=[['The working group has a subseries plan.','route'],['Prepare your research plan','approve'],['Your draft has 1,100','decision'],['Assemble the chapter manuscript','packet'],['The supervisor reviews','retain'],['First review of the entire volume','second'],['Both reviews are back','revise'],["Send the volume's front matter",'clear'],['The packet includes CIA-equity','joint'],['Certify the submission packet','handoff']];
 const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
 let current=await state();
 const nativeDesk=()=>page.locator('.manuscript-desk').count();
 if(!answers.some(([prefix])=>current.choice?.title.startsWith(prefix))&&!(await nativeDesk()))return;
 for(let n=0;n<100;n++){
  current=await state();
  await observe(current);
  if(current.mode==='dialog'){await advance();await page.waitForTimeout(160);continue;}
  if(await page.locator('.compiler-feedback-desk').count()){await click('.compiler-feedback-desk [data-focus-key=continue]');await page.waitForTimeout(180);continue;}
  if(await page.locator('.library-packet').count()){await completeLibraryPacket(page);continue;}
  if(await page.locator('.library-source-note').count()){await completeLibrarySourceNote(page);continue;}
  if(await page.locator('.library-comparison').count()){await completeLibraryComparison(page);continue;}
  if(await page.locator('.library-request').count()){await completeLibraryRequest(page);continue;}
  if(await page.locator('.revision-desk').count()){await completeRevisionDesk(page,touch);continue;}
  if(await page.locator('.chapter-desk').count()){await completeChapterDesk(page,touch);continue;}
  if(await page.locator('.compiler-decision-desk').count()){
   const answer=answers.find(([prefix])=>current.choice?.title.startsWith(prefix));if(!answer)throw Error('Unrecognized compiler decision');
   await click('[data-compiler-answer='+answer[1]+']');await page.waitForTimeout(180);continue;
  }
  if(await nativeDesk()){
   for(const [id,wanted] of [['decision',true],['routine',false]]){
    const button=page.locator(`[data-packet=${id}]`);
    if((await button.getAttribute('aria-pressed')==='true')!==wanted)await click(`[data-packet=${id}]`);
   }
   await click('.manuscript-submit');await page.waitForTimeout(180);continue;
  }
  const answer=answers.find(([prefix])=>current.choice?.title.startsWith(prefix));
  if(!answer)return;
  const index=current.choice.options.findIndex(o=>o.value===answer[1]);if(index<0)throw Error('Missing workflow answer');
  console.log('Compiler decision:',current.choice.options[index].label);
  if(touch){
   const point=await page.evaluate(index=>{const s=window.game.scene.getScene(JSON.parse(window.render_game_to_text()).scene);const choice=[s.researchChoice,s.choice].find(c=>c?.active);if(!choice)throw Error('Active choice missing');const r=choice.rows[index].getBounds();return{x:r.centerX,y:r.centerY};},index);
   await canvasTap(point.x,point.y);
  }else{
   for(let i=0;i<index;i++){await page.keyboard.press('ArrowDown',{delay:45});await page.waitForTimeout(100);}
   await advance();
  }
  await page.waitForTimeout(180);
 }
 throw Error('Compiler checkpoint failed to finish');
}
