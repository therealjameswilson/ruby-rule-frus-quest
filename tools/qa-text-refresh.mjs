import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const b=await chromium.launch();const p=await b.newPage();await p.goto('http://127.0.0.1:5211/?scene=ArchiveScene');await p.waitForFunction(()=>window.game?.scene.isActive('ArchiveScene'));await p.waitForTimeout(2000);await p.evaluate(()=>{window.textCounts=[];const walk=o=>{if(o.type==='Text'){const entry={name:o.name,text:o.text,calls:0};window.textCounts.push(entry);const fn=o.updateText;o.updateText=function(...args){entry.calls++;entry.text=this.text;return fn.apply(this,args)};}o.list?.forEach(walk)};window.game.scene.getScenes(true).forEach(s=>s.children.list.forEach(walk));});await p.waitForTimeout(3000);const counts=await p.evaluate(()=>window.textCounts.filter(x=>x.calls).sort((a,b)=>b.calls-a.calls));
assert(counts.every(x=>x.calls<10),JSON.stringify(counts));
// Explicit stun fixture exercises both color transitions, without claiming an earned counter.
const colors=await p.evaluate(()=>{const s=window.game.scene.getScene('ArchiveScene'),e=s.danneLurker;s.scene.pause();const now=s.time.now;e.stunnedUntil=now+1000;e.update(now,0,{x:128,y:184},true);const stunned={text:e.cue.text,color:e.cue.style.color};e.stunnedUntil=0;e.update(now+1001,0,{x:128,y:184},true);return {stunned,normal:{text:e.cue.text,color:e.cue.style.color}};});
assert.equal(colors.stunned.text,'STUN');assert.equal(colors.normal.text,'30YR');assert.notEqual(colors.stunned.color,colors.normal.color);
await p.screenshot({path:'/tmp/text-refresh-verified.png'});
console.log(JSON.stringify({counts,colors}));await b.close();
