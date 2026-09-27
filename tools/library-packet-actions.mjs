export async function completeLibraryPacket(page) {
 if(await page.locator('.library-packet [data-attach]').count()){
  for(const id of [1,2,3]) {
   await page.locator(`.library-packet [data-part="${id}"]`).click();
   const attach=page.locator('.library-packet [data-attach]');
   if((await attach.innerText()).startsWith('Attach'))await attach.click();
  }
 }
 await page.locator('.library-packet .manuscript-submit').click();await page.waitForSelector('.library-packet',{state:'detached'});
}
