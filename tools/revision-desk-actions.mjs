export async function completeRevisionDesk(page,touch=false){
 const click=async(selector)=>{const e=page.locator('.revision-desk '+selector);await e.scrollIntoViewIfNeeded();if(touch)await e.tap();else await e.click();await page.waitForTimeout(80);};
 await page.waitForSelector('.revision-desk');
 for(const id of ['coverage','support'])if(await page.locator(`[data-comment=${id}]`).getAttribute('aria-expanded')!=='true')await click(`[data-comment=${id}]`);
 await click('[data-source="2"]');await click('[data-line="1"]');await click('[data-apply]');
 if(await page.locator('[data-backup]').getAttribute('aria-pressed')!=='true')await click('[data-backup]');
 await click('.manuscript-submit');await page.waitForSelector('.revision-desk',{state:'detached'});
}
