import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');const out=process.env.FRUS_QA_OUT??'/tmp/action-labels';await mkdir(out,{recursive:true});
const b=await chromium.launch({args:['--disable-audio-output']});const results=[];try{for(const mobile of [false,true]){
 const p=await b.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.addInitScript(()=>{window.qaPad={connected:true,index:0,id:'QA controller',mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>window.qaPad.connected?[window.qaPad]:[]});});
 await p.goto(new URL('?scene=ResearchWorldScene',process.env.FRUS_QA_URL??'http://127.0.0.1:5211/').href);await p.waitForFunction(()=>window.game?.scene.isActive('ResearchWorldScene'));await p.waitForTimeout(700);await p.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').player.setPosition(130,153));
 const read=()=>p.evaluate(()=>{const s=window.game.scene.getScene('UIScene');return{badge:s.questBandVerbText.text,cue:s.questBandCueText.text};});
 const waitLabel=async(primary,secondary)=>{await p.waitForFunction(({primary,secondary})=>{const s=window.game.scene.getScene('UIScene');return s.questBandVerbText.text===primary&&s.questBandCueText.text===`TALK / ${secondary}: NEXT DISGUISE`;},{primary,secondary});return read();};
 const connected=await waitLabel('A','B');
 const disguise=()=>p.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').disguise);const before=await disguise();await p.keyboard.press('x');await p.waitForFunction(before=>window.game.scene.getScene('ResearchWorldScene').disguise!==before,before);const keyboard=await waitLabel('Z','X');await p.screenshot({path:`${out}/${mobile?'phone':'desktop'}-keyboard.png`});
 const next=await disguise();await p.evaluate(()=>window.qaPad.buttons[1].pressed=true);await p.waitForTimeout(100);await p.evaluate(()=>window.qaPad.buttons[1].pressed=false);await p.waitForFunction(next=>window.game.scene.getScene('ResearchWorldScene').disguise!==next,next);const controller=await waitLabel('A','B');
 await p.evaluate(()=>window.qaPad.connected=false);await p.waitForTimeout(150);const disconnected=await waitLabel(mobile?'A':'Z',mobile?'B':'X');
 if(mobile){await p.keyboard.press('ArrowLeft');await waitLabel('Z','X');await p.touchscreen.tap(5,5);await waitLabel('A','B');await p.waitForTimeout(1800);await p.screenshot({path:`${out}/phone-touch.png`});}
 assert.deepEqual(errors,[]);results.push({mobile,connected,keyboard,controller,disconnected,touchHandoff:mobile,errors});await p.close();
}}finally{await b.close();}await writeFile(`${out}/result.json`,JSON.stringify({results,limitations:['Simulated standard controller and phone; not physical hardware']},null,2));console.log(JSON.stringify(results));
