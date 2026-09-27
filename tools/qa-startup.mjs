import {mkdir,writeFile,readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5219/',out=process.env.FRUS_QA_OUT??'/tmp/frus-startup';await mkdir(out,{recursive:true});
const saved=process.env.FRUS_QA_STORAGE?JSON.parse(await readFile(process.env.FRUS_QA_STORAGE,'utf8')):undefined;
const b=await chromium.launch({args:['--disable-audio-output']});const results=[];
try{await Promise.all(Array.from({length:Number(process.env.FRUS_QA_CONCURRENCY??3)},async(_,worker)=>{
 const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,...(saved?{storageState:saved}:{})});const errors=[],failures=[];let generation=0;const requests=new WeakMap();p.on('request',r=>requests.set(r,generation));
 p.on('pageerror',e=>errors.push(String(e)));p.on('requestfailed',r=>{if(requests.get(r)===generation)failures.push({url:r.url(),error:r.failure()?.errorText});});
 for(let round=0;round<2;round++){
  generation++;errors.length=0;failures.length=0;const began=Date.now();await p.goto(base);
  let ready=true;try{await p.waitForFunction(expected=>window.game?.scene.isActive(expected),saved?'TapToStartScene':'WarningScene',{timeout:40000});}catch{ready=false;}
  const data=await p.evaluate(()=>({visibility:document.visibilityState,scenes:window.game?.scene.getScenes(true).map(s=>s.scene.key),loader:document.querySelector('#boot-loader')?.outerHTML,resources:performance.getEntriesByType('resource').map(r=>({name:r.name,ms:r.duration,bytes:r.transferSize})).sort((a,b)=>b.ms-a.ms).slice(0,10),resourceCount:performance.getEntriesByType('resource').length,totalBytes:performance.getEntriesByType('resource').reduce((s,r)=>s+r.transferSize,0)}));
  results.push({worker,round,ready,elapsedMs:Date.now()-began,...data,errors:[...errors],failures:[...failures]});
  if(!ready)await p.screenshot({path:out+`/failure-${worker}-${round}.png`});
 }
 await p.close();
}));}finally{await b.close();}
await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(({worker,round,ready,elapsedMs,scenes,resourceCount,totalBytes,errors,failures})=>({worker,round,ready,elapsedMs,scenes,resourceCount,totalBytes,errors,failures}))));
if(results.some(r=>!r.ready))process.exitCode=1;
