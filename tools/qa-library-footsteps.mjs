import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');const b=await chromium.launch({args:['--disable-audio-output']});const out='/tmp/library-footsteps';await mkdir(out,{recursive:true});
try{const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.addInitScript(()=>{window.footContacts=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){const rate=this.playbackRate.value;if(this.buffer&&(Math.abs(rate-.975)<.0001||Math.abs(rate-1.035)<.0001)){const data=this.buffer.getChannelData(0),s=window.game?.scene.getScene('PresidentialLibraryScene');window.footContacts.push({duration:this.buffer.duration,rms:Math.sqrt(data.reduce((sum,v)=>sum+v*v,0)/data.length),position:s?.player?{...s.player.position}:null});}return start.apply(this,args);};});
await p.goto('http://127.0.0.1:5211/?scene=PresidentialLibraryScene');await p.waitForFunction(()=>window.game?.scene.isActive('PresidentialLibraryScene'));
for(let i=0;i<60&&await p.evaluate(()=>window.game.scene.getScene('PresidentialLibraryScene').dialog.active);i++){await p.keyboard.press('Space');await p.waitForTimeout(110);}
const move=async(key,ms)=>{await p.keyboard.down(key);await p.waitForTimeout(ms);await p.keyboard.up(key);await p.waitForTimeout(100);};
await move('ArrowLeft',570);await p.screenshot({path:`${out}/oak-aisle.png`});await move('ArrowLeft',350);await move('ArrowRight',920);
const contactsBeforePause=await p.evaluate(()=>window.footContacts.length);await p.keyboard.press('Tab');await p.waitForTimeout(400);assert.equal(await p.evaluate(()=>window.footContacts.length),contactsBeforePause);await p.keyboard.press('Escape');await p.waitForTimeout(100);
await move('ArrowDown',550);await p.waitForFunction(()=>window.game.scene.isActive('ResearchWorldScene'));
const contacts=await p.evaluate(()=>window.footContacts);assert(contacts.length>5);const wood=contacts.filter(c=>c.duration>.08);assert(wood.length>0);const short=contacts.filter(c=>c.duration<.08);assert(new Set(short.map(c=>c.rms.toFixed(7))).size>=2,'carpet and stone must have distinct audio buffers');
await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>window.footContacts.length),contacts.length,'Released movement must not emit extra contacts');assert.deepEqual(errors,[]);
const result={contacts,woodContacts:wood.length,pauseSilent:true,releaseSilent:true,exitReached:true,errors,limitations:['Synthesized buffer routing checked; human listening and physical hardware unverified']};await writeFile(`${out}/result.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await b.close();}
