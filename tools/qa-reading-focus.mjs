// Real audio engine with bounded modal fixtures; requires a Vite dev server.
import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/frus-reading-focus';await mkdir(out,{recursive:true});
const b=await chromium.launch({args:['--disable-audio-output','--autoplay-policy=no-user-gesture-required']});
try{
 const p=await b.newPage({viewport:{width:1024,height:960}}),errors=[],results=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(new URL('?scene=ArchiveScene',process.env.FRUS_QA_URL??'http://127.0.0.1:5217/').href);
 await p.waitForFunction(()=>window.game?.scene.getScene('ArchiveScene')?.sourceNoteBoard);
 await p.evaluate(async()=>{window.qaModule=path=>import(performance.getEntriesByType('resource').map(e=>e.name).find(url=>new URL(url).pathname===path)??path);window.qaAudio=(await window.qaModule('/src/systems/audio.ts')).retroAudio;await window.qaAudio.unlock();window.qaAudio.setChannelVolume('music',.8);window.qaAudio.startMusic('ArchiveScene');});
 const check=async(label,active,gain,preference)=>{await p.waitForTimeout(700);const state=await p.evaluate(()=>({time:window.qaAudio.context?.currentTime,audio:window.qaAudio.getDebugState(),mix:window.qaAudio.getMix()}));assert.equal(state.audio.contextState,'running');assert.equal(state.audio.readingMixActive,active,JSON.stringify({label,state,ui:await p.evaluate(()=>{const s=window.game.scene.getScene('UIScene');return {visible:s.sys.settings.visible,active:s.sys.settings.active,lease:typeof s.releaseReadingMix,game:JSON.parse(window.render_game_to_text()).mode};})}));assert(Math.abs(state.audio.musicGainValue-gain)<.01,JSON.stringify({label,state,gain}));assert.equal(state.mix.music,preference,label);results.push({label,...state});};
 const show=()=>p.evaluate(()=>window.game.scene.getScene('ArchiveScene').sourceNoteBoard.show(false,()=>{},()=>{},()=>{}));
 const hide=()=>p.evaluate(()=>window.game.scene.getScene('ArchiveScene').sourceNoteBoard.hide());
 await check('exploration',false,.8,.8);await show();await check('canvas review',true,.36,.8);await p.screenshot({path:out+'/canvas-review.png'});
 await p.evaluate(async()=>{const {ManuscriptDesk}=await window.qaModule('/src/systems/manuscriptDesk.ts');window.qaDesk=new ManuscriptDesk({},()=>{},()=>{},()=>window.qaDesk.close());});
 await check('nested native desk',true,.36,.8);await hide();await check('canvas closed, native still open',true,.36,.8);
 await p.evaluate(()=>window.qaDesk.close());await check('both closed',false,.8,.8);
 await show();await p.evaluate(()=>window.qaAudio.setChannelVolume('music',.6));await check('changed preference during reading',true,.27,.6);
 await hide();await check('restored changed preference',false,.6,.6);
 await show();await p.evaluate(()=>window.qaAudio.setChannelVolume('music',0));await hide();await check('muted music stays muted',false,0,0);
 await p.evaluate(()=>window.qaAudio.setChannelVolume('music',.8));await show();await check('reading before UI shutdown',true,.36,.8);
 await p.evaluate(()=>window.game.scene.stop('UIScene'));await check('shutdown releases reading mix',false,.8,.8);
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({results,errors,scope:'Audio gain and lifecycle verification; not physical listening approval.'},null,2));console.log('PASS reading mix, nested ownership, preferences, mute and shutdown');
}finally{await b.close();}
