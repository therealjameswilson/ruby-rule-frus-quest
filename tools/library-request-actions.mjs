/** Earn the request through the visible desk; do not write progression flags. */
export async function completeLibraryRequest(page,target){
 target??=(await page.locator('.request-catalog h2').innerText()).includes('Condoleezza Rice')?1:2;
 for(const selector of [`[data-entry="${target}"]`,'[data-attach]','[data-access="1"]','[data-followup="retrieval"]','[data-followup="withdrawals"]']){
  const button=page.locator('.library-request '+selector);if(selector.includes('followup')&&await button.getAttribute('aria-pressed')==='true')continue;
  await button.scrollIntoViewIfNeeded();await button.click();await page.waitForTimeout(70);
 }
 await page.locator('.library-request .manuscript-submit').click();await page.waitForTimeout(200);
}
