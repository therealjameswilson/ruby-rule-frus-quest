// Select the researched workflow answers through controls, never by changing flags.
export async function completeCompilerCheckpoint(page) {
 const answers=[['The working group has a subseries plan.','route'],['Prepare your research plan','approve'],['Your draft has 1,100','decision'],['Assemble the chapter manuscript','packet'],['The supervisor reviews','retain'],['First review of the entire volume','second'],['Both reviews are back','revise'],["Send the volume's front matter",'clear'],['The packet includes CIA-equity','joint'],['Certify the submission packet','handoff']];
 const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
 let current=await state();
 if(!answers.some(([prefix])=>current.choice?.title.startsWith(prefix)))return;
 for(let n=0;n<100;n++){
  current=await state();
  if(current.mode==='dialog'){await page.keyboard.press('Space',{delay:45});await page.waitForTimeout(160);continue;}
  const answer=answers.find(([prefix])=>current.choice?.title.startsWith(prefix));
  if(!answer)return;
  const index=current.choice.options.findIndex(o=>o.value===answer[1]);if(index<0)throw Error('Missing workflow answer');
  console.log('Compiler decision:',current.choice.options[index].label);
  for(let i=0;i<index;i++){await page.keyboard.press('ArrowDown',{delay:45});await page.waitForTimeout(100);}
  await page.keyboard.press('Space',{delay:45});await page.waitForTimeout(180);
 }
 throw Error('Compiler checkpoint failed to finish');
}
