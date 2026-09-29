import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5230/';
const out = process.env.FRUS_QA_OUT ?? '/tmp/frus-demand-boss';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 960 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
const path = '**/danne-boss-forms-v2.png';
const rows = [];
try {
 await page.goto(base);
 await page.waitForFunction(() => window.game?.scene.isActive('WarningScene'));
 const startup = await page.evaluate(() => ({bytes:performance.getEntriesByType('resource').reduce((n,r)=>n+r.encodedBodySize,0), loaded:window.game.textures.exists('danne-boss-combat-hd')}));
 assert.equal(startup.loaded,false);
 for (const target of ['GuideScene','ArchiveScene','NetworkScene','ReferralVaultScene','SilentReadScene','BlackVaultLairScene']) {
  await page.goto(new URL(`?scene=${target}`,base).href);
  await page.waitForFunction(target => window.game?.scene.isActive(target),target);
  await page.waitForTimeout(450);
  const result = await page.evaluate(() => {
   const texture=window.game.textures.get('danne-boss-combat-hd');
   return { frames:texture.getFrameNames().length, width:texture.get(0).width, height:texture.get(0).height,
    animations:['colossus','swarm','cloud','ascendant'].map(form=>window.game.anims.exists('danne-boss-combat-hd-'+form)),
    requests:performance.getEntriesByType('resource').filter(r=>r.name.endsWith('danne-boss-forms-v2.png')).length,
    state:JSON.parse(window.render_game_to_text()) };
  });
  assert.equal(result.frames,16);assert.equal(result.width,128);assert.equal(result.height,192);
  assert(result.animations.every(Boolean));assert.equal(result.requests,1);
  await page.screenshot({path:`${out}/${target}.png`});
  rows.push({target,...result});
 }
 // A failed sheet must keep gameplay behind a recoverable loading screen.
 await page.route(path,route=>route.abort());
 await page.goto(new URL('?scene=GuideScene',base).href);
 await page.waitForFunction(()=>window.game?.scene.isActive('PlayerArtLoadScene') && window.game.scene.getScene('PlayerArtLoadScene').failed);
 assert.equal(await page.evaluate(()=>window.game.scene.isActive('GuideScene')),false);
 await page.waitForFunction(()=>document.getElementById('boot-loader')?.hidden);
 await page.screenshot({path:`${out}/retry.png`});
 await page.unroute(path);
 await page.keyboard.press('Enter');
 await page.waitForFunction(()=>window.game?.scene.isActive('GuideScene'));
 assert.equal(await page.evaluate(()=>window.game.textures.exists('danne-boss-combat-hd')),true);
 assert.deepEqual(errors,[]);
 await writeFile(`${out}/result.json`,JSON.stringify({scope:'Direct-entry presentation and network-failure fixtures; not earned progression',startup,rows,retryPassed:true,errors},null,2));
 console.log(JSON.stringify({startup,scenes:rows.map(r=>r.target),retryPassed:true,errors}));
}finally{await browser.close();}
