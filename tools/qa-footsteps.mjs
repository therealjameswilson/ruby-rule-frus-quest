import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser=await chromium.launch({args:['--disable-audio-output']});
try{
const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.addInitScript(()=>{window.steps=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer?.duration>=.07&&this.buffer.duration<=.11)window.steps.push({duration:this.buffer.duration,rate:this.playbackRate.value});return start.apply(this,args);};});
await p.goto(new URL('?scene=ResearchWorldScene',process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5173/').href);await p.waitForFunction(()=>window.game?.scene.isActive('ResearchWorldScene'));await p.waitForTimeout(300);await p.mouse.click(600,450);
await p.keyboard.down('ArrowRight');await p.waitForTimeout(700);await p.keyboard.up('ArrowRight');await p.waitForTimeout(100);
const steps=await p.evaluate(()=>window.steps);assert(steps.length>=2);assert(steps.every(s=>Math.abs(s.duration-.105)<.001));
await p.waitForTimeout(450);assert.equal((await p.evaluate(()=>window.steps)).length,steps.length);
await p.screenshot({path:'/tmp/footstep-world.png'});assert.deepEqual(errors,[]);console.log(JSON.stringify({steps,idleSilent:true,errors}));
}finally{await browser.close();}
