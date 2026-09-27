/** Earn the request through the visible desk; do not write progression flags. */
export async function completeLibraryRequest(page){
 for(const selector of ['[data-entry="2"]','[data-attach]','[data-access="1"]','[data-followup="retrieval"]','[data-followup="withdrawals"]']){
  const button=page.locator('.library-request '+selector);if(selector.includes('followup')&&await button.getAttribute('aria-pressed')==='true')continue;
  await button.scrollIntoViewIfNeeded();await button.click();await page.waitForTimeout(70);
 }
 await page.locator('.library-request .manuscript-submit').click();await page.waitForTimeout(200);
}
