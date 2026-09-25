import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/analog-quadrants';await mkdir(out,{recursive:true});
const browser=await chromium.launch();
try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.addInitScript(()=>{window.qaPad={connected:true,index:0,id:'QA analog controller',mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.qaPad]});});
 await p.goto(new URL('?scene=OfficeScene&text=full',process.env.FRUS_QA_URL??'http://127.0.0.1:5211/').href);
 await p.waitForFunction(()=>window.game?.scene.isActive('OfficeScene'));await p.waitForTimeout(1200);
 const pos=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()).player);
 const stick=async(x,y,ms=180)=>{await p.evaluate(({x,y})=>window.qaPad.axes=[x,y],{x,y});await p.waitForTimeout(ms);await p.evaluate(()=>window.qaPad.axes=[0,0]);await p.waitForTimeout(150);};
 await stick(0,-.9);const north=await pos();
 await stick(.8,.8);const southeast=await pos();assert(southeast.x>north.x+5);assert(Math.abs(southeast.y-north.y)<2,'A new southeast diagonal must not continue north');
 await stick(-.8,.8);const southwest=await pos();assert(southwest.x<southeast.x-5);assert(Math.abs(southwest.y-southeast.y)<2,'Southwest must not continue east');
 await stick(.1,.1,350);assert.deepEqual(await pos(),southwest,'Resting stick drift must not move hero');
 await p.evaluate(()=>window.qaPad.buttons[9].pressed=true);await p.waitForTimeout(100);await p.evaluate(()=>window.qaPad.buttons[9].pressed=false);await p.waitForTimeout(150);
 assert.equal(await p.evaluate(()=>JSON.parse(window.render_game_to_text()).mode),'pause');const paused=await pos();await stick(.9,0);assert.deepEqual(await pos(),paused,'Menu navigation must not move hero');
 await p.screenshot({path:`${out}/menu.png`});assert.deepEqual(errors,[]);
 await writeFile(`${out}/result.json`,JSON.stringify({north,southeast,southwest,deadzoneStops:true,menuStopsHero:true,errors},null,2));console.log('PASS analog quadrant reversal, deadzone, release and pause');
}finally{await browser.close();}
