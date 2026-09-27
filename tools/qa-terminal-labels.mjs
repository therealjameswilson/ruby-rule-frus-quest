import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/frus-terminal-labels';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const [name,width,height] of [['desktop',1024,960],['phone',390,844]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:name==='phone',isMobile:name==='phone'}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5217/?scene=NetworkScene');await page.waitForFunction(()=>window.game?.scene.isActive('NetworkScene'));await page.waitForSelector('#boot-loader',{state:'hidden'});await page.waitForTimeout(800);
 const bounds=await page.evaluate(()=>{
  const s=window.game.scene.getScene('NetworkScene');return ['opennet','classnet'].map(id=>{
   const c=s.children.getByName('terminal-'+id),plate=c.getByName('terminal-nameplate').getBounds(),label=c.getByName('terminal-network-label'),screen=c.getByName('terminal-screen-status'),glass=c.getByName('terminal-screen-glass').getBounds();return{id,plate,label:label.getBounds(),text:label.text,screen:screen.getBounds(),status:screen.text,glass};
  });
 });
 for(const t of bounds){for(const [inner,outer] of [[t.label,t.plate],[t.screen,t.glass]]){assert(inner.x>=outer.x&&inner.y>=outer.y&&inner.x+inner.width<=outer.x+outer.width&&inner.y+inner.height<=outer.y+outer.height,JSON.stringify(t));}assert.equal(t.text,t.id.toUpperCase());}
 assert.deepEqual(errors,[]);await page.screenshot({path:out+'/'+name+'.png'});results.push({name,bounds,errors});await page.close();
}await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close()}
