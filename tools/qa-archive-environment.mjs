const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out=process.env.FRUS_QA_OUT ?? '/tmp/archive-environment';
const base=process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5173/';
fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({args:['--disable-audio-output']});
for(const [name,width,height,touch] of [['desktop',1024,960,false],['phone',390,844,true]]){
const p=await b.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch,deviceScaleFactor:touch?3:1});
const errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.goto(new URL('?scene=NaraStacksScene&text=full',base).href);
await p.waitForFunction(()=>window.game?.scene.isActive('NaraStacksScene'));await p.waitForTimeout(800);
const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
assert(await p.evaluate(()=>!!window.game.scene.getScene('NaraStacksScene').children.getByName('archive-environment')));
await p.screenshot({path:`${out}/${name}-entry.png`});
const cdp=await p.context().newCDPSession(p);
const point=async(x,y)=>{const r=await p.locator('canvas').first().boundingBox();return{x:r.x+x*r.width/256,y:r.y+y*r.height/240,id:1};};
const move=async(key,ms)=>{if(touch){const [x,y]={ArrowUp:[48,176],ArrowDown:[48,228],ArrowLeft:[22,202],ArrowRight:[74,202]}[key];await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[await point(x,y)]});await p.waitForTimeout(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await p.keyboard.down(key);await p.waitForTimeout(ms);await p.keyboard.up(key);}await p.waitForTimeout(100);};
const action=async()=>{if(touch){const q=await point(225,205);await p.touchscreen.tap(q.x,q.y);}else await p.keyboard.press('Space',{delay:40});await p.waitForTimeout(180);};
await action();assert.equal((await state()).sceneProgress.naraStackNotePage,1);
await move('ArrowUp',1350);
const stopped=await state();assert(stopped.player.y>=143,'shelf remains solid');assert(stopped.player.y<180,'aisle is traversable');
await p.screenshot({path:`${out}/${name}-shelf.png`});
await move('ArrowDown',1400);
// The south stairway must still transition back to the Archive.
for(let i=0;i<5 && (await state()).scene==='NaraStacksScene';i++){await move('ArrowDown',300);await action();}
assert.equal((await state()).scene,'ArchiveScene');assert.deepEqual(errors,[]);
fs.writeFileSync(`${out}/${name}.json`,JSON.stringify({stopped,after:await state(),errors},null,2));console.log(name,'art, note, solid shelf, movement and exit PASS');await p.close();
}await b.close();
