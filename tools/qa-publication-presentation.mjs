import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
if(!process.env.FRUS_QA_STORAGE)throw Error('Provide an earned publication save');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5211/';
const out=process.env.FRUS_QA_OUT??'/tmp/publication-presentation';await mkdir(out,{recursive:true});
const storage=JSON.parse(await readFile(process.env.FRUS_QA_STORAGE));for(const origin of storage.origins)origin.origin=new URL(base).origin;
const browser=await chromium.launch({args:['--disable-audio-output']});const results=[];
try{for(const [name,width,height,touch]of [['desktop',1280,720,false],['phone',390,844,true],['landscape',844,390,true]]){
const p=await browser.newPage({storageState:storage,viewport:{width,height},hasTouch:touch,isMobile:touch});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
const tap=async(x,y)=>{const r=await p.locator('canvas').first().boundingBox();if(touch)await p.touchscreen.tap(r.x+x*r.width/256,r.y+y*r.height/240);else await p.mouse.click(r.x+x*r.width/256,r.y+y*r.height/240);await p.waitForTimeout(250);};
const enter=async()=>{await p.goto(new URL('?text=full',base).href);await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));if(touch)await tap(86,154);else await p.keyboard.press('Enter');await p.waitForFunction(()=>window.game?.scene.isActive('EndingScene'));await p.waitForTimeout(2500);};
await enter();
const layout=await p.evaluate(()=>{const summary=window.game.scene.getScene('EndingScene').children.getByName('publication-summary');const book=summary.getByName('published-frus-volume-hero'),r=book.getBounds();return {key:book.texture.key,bounds:{top:r.top,bottom:r.bottom,left:r.left,right:r.right},page:summary.getData('page')};});
assert.equal(layout.key,'published-volume-v2');assert(layout.bounds.top>=35&&layout.bounds.bottom<=166);assert.equal(layout.page,'volume');await p.screenshot({path:`${out}/${name}-volume.png`});
await tap(67,216);assert.equal(await p.evaluate(()=>window.game.scene.getScene('EndingScene').children.getByName('publication-summary').getData('page')),'record');await p.screenshot({path:`${out}/${name}-record.png`});
await tap(67,216);assert.equal(await p.evaluate(()=>window.game.scene.getScene('EndingScene').children.getByName('publication-summary').getData('page')),'volume');
await tap(189,216);await p.waitForFunction(()=>window.game?.scene.isActive('TitleScene'));await enter();assert.equal(await p.evaluate(()=>JSON.parse(window.render_game_to_text()).finalGateCertification.status),'published');
assert.deepEqual(errors,[]);results.push({name,layout,recordNavigation:true,title:true,continue:true,errors});await p.close();}
await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();}
