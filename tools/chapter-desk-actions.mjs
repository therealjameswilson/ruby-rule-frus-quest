// Fast earned completion for broader route fixtures; detailed failure/reload QA is separate.
export async function completeChapterDesk(page,touch=false){
 const click=async(selector)=>{const e=page.locator(selector);await e.scrollIntoViewIfNeeded();if(touch)await e.tap();else await e.click();await page.waitForTimeout(80);};
 await page.waitForSelector('.chapter-desk');
 if(await page.locator('.chapter-desk').getAttribute('data-step')==='0'){
  for(let i=0;i<2;i++){const order=await page.locator('[data-record]').evaluateAll(nodes=>nodes.map(n=>n.dataset.record));if(order[0]==='A')break;await click('[data-focus-key="move-A--1"]');}
  if((await page.locator('[data-record]').evaluateAll(nodes=>nodes.map(n=>n.dataset.record)))[1]!=='B')await click('[data-focus-key="move-B--1"]');
  await click('.chapter-desk .manuscript-submit');
 }
 if(await page.locator('.chapter-desk').getAttribute('data-step')==='1'){
  await click('[data-source=C]');await click('[data-line="1"]');await click('.chapter-desk .manuscript-submit');
 }
 for(const id of ['documents','annotations','backup']){if(await page.locator(`[data-component=${id}]`).getAttribute('aria-pressed')!=='true')await click(`[data-component=${id}]`);}
 await click('.chapter-desk .manuscript-submit');await page.waitForSelector('.chapter-desk',{state:'detached'});
}
