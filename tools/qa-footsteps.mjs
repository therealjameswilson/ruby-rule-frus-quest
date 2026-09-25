import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser=await chromium.launch({args:['--disable-audio-output']});
try{
const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.addInitScript(()=>{window.steps=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer?.duration>=.07&&this.buffer.duration<=.11)window.steps.push({duration:this.buffer.duration,rate:this.playbackRate.value});return start.apply(this,args);};});
await p.goto(new URL('?scene=ResearchWorldScene',process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5211/').href);await p.waitForFunction(()=>window.game?.scene.isActive('ResearchWorldScene'));await p.waitForTimeout(300);
const bounds=await p.locator('canvas').first().boundingBox();await p.mouse.click(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
const checks=[];
// Position fixtures isolate terrain; each contact is produced by real movement input.
for(const [surface,x,y,key,duration] of [['gravel',128,180,'ArrowUp',.105],['grass',160,180,'ArrowRight',.09],['stone',128,232,'ArrowUp',.075]]){
 await p.evaluate(({x,y})=>{window.game.scene.getScene('ResearchWorldScene').player.setPosition(x,y);window.steps=[];},{x,y});
 await p.keyboard.down(key);await p.waitForTimeout(430);await p.keyboard.up(key);await p.waitForTimeout(150);
 const steps=await p.evaluate(()=>window.steps);assert(steps.some(s=>Math.abs(s.duration-duration)<.001),surface+' contact missing');
 await p.waitForTimeout(450);assert.equal((await p.evaluate(()=>window.steps)).length,steps.length);checks.push({surface,steps,idleSilent:true});
}
await p.screenshot({path:'/tmp/footstep-world.png'});assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors}));
}finally{await browser.close();}
