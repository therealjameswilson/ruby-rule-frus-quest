import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const mobile = process.argv.includes('--mobile');
const out = process.env.FRUS_QA_OUT ?? `/tmp/frus-process-pressure-${mobile ? 'touch' : 'desktop'}`;
const base = process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/';
assert(process.env.FRUS_QA_STORAGE, 'Set FRUS_QA_STORAGE to an earned Archive entry from qa-guide-counter.mjs');
const storage = JSON.parse(await readFile(process.env.FRUS_QA_STORAGE, 'utf8'));
await mkdir(out, { recursive: true });
const browser = await chromium.launch({headless: !process.argv.includes('--headed'), ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE} : {})});
const errors = [];
async function run(name, source, query, check) {
  const originStorage = { ...source, origins:source.origins.map(origin=>({...origin,origin:new URL(base).origin})) };
  const context = await browser.newContext({storageState:originStorage,viewport:mobile?{width:375,height:667}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1});
  const page = await context.newPage(), cdp = await context.newCDPSession(page);
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => {if(m.type()==='error') errors.push(m.text());});
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  async function touch(x,y,dx=0,dy=0,ms=45) {
    const b = await page.locator('canvas').first().boundingBox();
    const point = (x,y) => ({x:b.x+x*b.width/256,y:b.y+y*b.height/240,id:1});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(x,y)]});
    if(dx||dy) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(x+dx,y+dy)]});
    await page.waitForTimeout(ms);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  async function direction(key,ms) {
    if(mobile) {const [dx,dy]={ArrowLeft:[-26,0],ArrowRight:[26,0],ArrowUp:[0,-26],ArrowDown:[0,26]}[key];await touch(48, 202,dx,dy,ms);}
    else {await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);}
    await page.waitForTimeout(60);
  }
  async function resume() {
    await page.goto(new URL('?text=full',base).href);
    await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');
    if(mobile) await touch(86,154); else await page.keyboard.press('Enter',{delay:45});
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene==='ArchiveScene');
    await page.waitForTimeout(900);
  }
  async function shot(label) {
    const s = await state(), path = `${out}/${name}-${label}`;
    await writeFile(`${path}.json`,JSON.stringify(s,null,2));
    const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
    await writeFile(`${path}-native.png`,Buffer.from(image.split(',')[1],'base64'));
    await page.screenshot({path:`${path}.png`});
    console.log(name,label,JSON.stringify({scene:s.scene,player:s.player,reliability:s.reliability,violations:s.standardsViolations,message:s.latestMessage}));
    return s;
  }
  try {
    if(query) {await page.goto(new URL(query,base).href);await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene==='GameplayMapScene');await page.waitForTimeout(500);}
    else await resume();
    await check({page,context,state,direction,resume,shot,touch});
  } catch(error) {await shot('failure').catch(()=>{});throw error;}
  finally {await context.close();}
}
try {
  await run('wall',storage,null,async ({page,context,state,direction,resume,shot,touch}) => {
    const before = await shot('before');
    assert.deepEqual(before.standardsViolations,[]);
    await direction('ArrowLeft',390);await direction('ArrowUp',520);
    await page.waitForTimeout(200);
    const hit = await shot('hit');
    assert(hit.reliability <= before.reliability-4, 'The wall must actually hit, not merely be nearby');
    assert.match(hit.latestMessage,/collision\. The record is unchanged/);
    assert.deepEqual(hit.standardsViolations,[]);
    assert.deepEqual(hit.documentCandidates,before.documentCandidates);
    assert.equal(hit.documentPoints,before.documentPoints);
    await direction('ArrowDown',230);
    if(mobile) await touch(120, 216); else await page.keyboard.press('Escape',{delay:45});
    await page.waitForTimeout(200);
    const paused=await shot('paused');assert.equal(paused.mode,'pause');
    await page.waitForTimeout(1300);
    assert.equal((await state()).reliability,paused.reliability);
    assert.deepEqual((await state()).player,paused.player);
    await context.storageState({path:`${out}/contact-storage.json`});
    await resume();const restored=await shot('continue');
    assert.equal(restored.reliability,paused.reliability);
    assert.deepEqual(restored.standardsViolations,[]);
    assert.deepEqual(restored.documentCandidates,before.documentCandidates);
  });
  if(process.env.FRUS_QA_LEGACY_STORAGE) {
    const legacy = JSON.parse(await readFile(process.env.FRUS_QA_LEGACY_STORAGE,'utf8'));
    const saved = JSON.parse(legacy.origins[0].localStorage.find(entry=>entry.name==='rubyRuleFrusQuestSave').value).state;
    assert(saved.standardsViolations.some(record=>record.unresolved),'Use an actual pre-fix contact save');
    await run('legacy',legacy,null,async ({page,shot}) => {
      await shot('continued');
      const restored = await page.evaluate(() => window.game.scene.getScene('ArchiveScene').player.position);
      assert(Math.hypot(restored.x-saved.player.x,restored.y-saved.player.y)<3);
      const current = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
      assert.equal(current.reliability,saved.reliability);
      assert.equal(current.documentPoints,saved.documentPoints);
      assert.deepEqual(current.documentCandidates,saved.documentCandidates);
      assert.deepEqual(current.standardsViolations,[],'Legacy collision must no longer be an unresolved violation');
      assert.equal(current.latestMessage,'Combat-hit labels corrected. Record review is unchanged.');
    });
  }
  await run('enemy',{cookies:[],origins:[]},'?scene=GameplayMapScene&map=nara_stacks&text=full',async ({page,state,shot,direction}) => {
    const before=await shot('before');
    for(let n=0;n<20 && (await state()).reliability===before.reliability;n++) {
      await page.waitForTimeout(500);
      if(n===7) await direction('ArrowUp',360);
    }
    const hit=await shot('hit');
    assert(hit.reliability<before.reliability,'A live DANN-E must land a hit');
    assert.match(hit.latestMessage,/DANN-E .*The record is unchanged/);
    assert.deepEqual(hit.standardsViolations,[]);
    assert.deepEqual(hit.documentCandidates,before.documentCandidates);
    assert.equal(hit.documentPoints,before.documentPoints);
    assert(hit.visibleThreats.some(threat=>threat.hp>0 && threat.roomClear?.cleared===false),'Taking damage must not clear the room');
  });
  assert.deepEqual(errors,[]);
  console.log('PASS real wall/enemy pressure, pause, Continue and legacy save repair');
} finally {await writeFile(`${out}/errors.json`,JSON.stringify(errors));await browser.close();}
