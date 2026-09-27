/** Complete the visible comparison without writing progression flags. */
export async function completeLibraryComparison(page) {
  for (const [id,lane] of [[1,1],[2,2],[3,2],[4,3]]) {
    await page.locator(`.library-comparison [data-card="${id}"] [data-lane="${lane}"]`).click();
  }
  for (const id of [1,2]) {
    const button=page.locator(`.library-comparison [data-followup="${id}"]`);
    if(await button.getAttribute('aria-pressed')!=='true')await button.click();
  }
  await page.locator('.library-comparison .manuscript-submit').click();
  await page.waitForSelector('.library-comparison',{state:'detached'});
}
