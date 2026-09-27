/** Assemble the note through visible controls; do not set progression flags. */
export async function completeLibrarySourceNote(page) {
 if(!await page.locator('.library-source-note [data-field]').count()){
  await page.locator('.library-source-note .manuscript-submit').click();
  await page.waitForSelector('.library-source-note',{state:'detached'});return;
 }
 for(const field of ['kind','date','locator','scope'])await page.locator(`.library-source-note [data-field="${field}"] [data-value="1"]`).click();
 for(const item of ['lead','followups']){
  const b=page.locator(`.library-source-note [data-log="${item}"]`);
  if(await b.getAttribute('aria-pressed')!=='true')await b.click();
 }
 await page.locator('.library-source-note .manuscript-submit').click();
 await page.waitForSelector('.library-source-note',{state:'detached'});
}
