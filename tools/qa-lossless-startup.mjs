import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const b=await chromium.launch();try{
 const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.addInitScript(()=>performance.setResourceTimingBufferSize(10000));
 await p.goto('http://127.0.0.1:5211/');await p.waitForFunction(()=>window.game?.scene.isActive('WarningScene'));
 const startup=await p.evaluate(()=>{const r=performance.getEntriesByType('resource');return {bytes:r.reduce((s,r)=>s+r.decodedBodySize,0),urls:r.map(r=>r.name),readyMs:performance.now()};});
 const stems=['art-pack/danne-pack/vfx/19_vfx_ego_bolt_strip','art-pack/danne-pack/ui/20_ui_scroll_corners'];
 for(const stem of stems){assert(startup.urls.some(u=>u.endsWith(stem+'.webp')));assert(!startup.urls.some(u=>u.endsWith(stem+'.png')));
 const result=await p.evaluate(async stem=>{const read=async ext=>{const i=new Image();i.src='/assets/'+stem+ext;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(i,0,0);return {width:i.width,height:i.height,data:ctx.getImageData(0,0,i.width,i.height).data};};const a=await read('.png'),b=await read('.webp');let different=0;for(let i=0;i<a.data.length;i++)if(a.data[i]!==b.data[i])different++;return {width:a.width,height:a.height,sameSize:a.width===b.width&&a.height===b.height,different};},stem);
 assert(result.sameSize);assert.equal(result.different,0,stem);console.log(JSON.stringify({stem,...result}));}
 await p.goto('http://127.0.0.1:5211/?scene=ArchiveScene');await p.waitForFunction(()=>window.game?.scene.isActive('ArchiveScene'));await p.waitForTimeout(1000);
 const frames=await p.evaluate(()=>['danne-vfx-ego-bolt','pack-effects-stamps'].map(key=>{const t=window.game.textures.get(key);return {key,exists:window.game.textures.exists(key),frames:t.frameTotal};}));
 assert(frames.every(f=>f.exists&&f.frames>1),JSON.stringify(frames));assert.deepEqual(errors,[]);await p.screenshot({path:'/tmp/lossless-startup-game.png'});console.log(JSON.stringify({startupBytes:startup.bytes,readyMs:startup.readyMs,frames,errors}));
}finally{await b.close();}
