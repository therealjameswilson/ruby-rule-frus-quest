import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5219/',out=process.env.FRUS_QA_OUT??'/tmp/frus-boot-recovery';await mkdir(out,{recursive:true});
const storage=JSON.parse(await readFile(process.env.FRUS_QA_STORAGE??'/tmp/frus-fresh-opening/earned-storage.json','utf8'));
const expected=storage.origins.flatMap(o=>o.localStorage).find(v=>v.name==='rubyRuleFrusQuestSave').value;
const b=await chromium.launch({args:['--disable-audio-output']});const results=[];
try{for(const mode of ['stall','error']){
 const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,storageState:storage}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 let release,blocked=true;
 await p.route('**/assets/data/items.json',async r=>{if(mode==='stall'){await new Promise(resolve=>release=resolve);await r.continue();}else if(blocked)await r.abort('failed');else await r.continue();});
 await p.goto(base);await p.waitForFunction(state=>document.querySelector('#boot-loader')?.dataset.state===state,mode==='stall'?'waiting':'error',{timeout:25000});
 assert(await p.locator('#boot-loader-retry').isVisible());assert.equal(await p.evaluate(()=>localStorage.getItem('rubyRuleFrusQuestSave')),expected);
 await p.screenshot({path:out+'/'+mode+'.png'});
 if(mode==='stall')release();else{blocked=false;await p.locator('#boot-loader-retry').tap();}
 await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await p.waitForSelector('#boot-loader',{state:'hidden'});
 assert.equal(await p.evaluate(()=>localStorage.getItem('rubyRuleFrusQuestSave')),expected);assert.deepEqual(errors,[]);
 await p.screenshot({path:out+'/'+mode+'-recovered.png'});results.push({mode,recovered:true,saveUnchanged:true,errors});await p.close();
}}finally{await b.close();}
await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
