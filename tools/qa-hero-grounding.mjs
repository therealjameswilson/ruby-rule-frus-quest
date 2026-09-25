import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');const b=await chromium.launch();const out='/tmp/hero-visible-grounding';await mkdir(out,{recursive:true});const results=[];
try{
 const seed=await b.newPage();await seed.goto('http://127.0.0.1:5211/?scene=PresidentialLibraryScene');await seed.waitForFunction(()=>localStorage.getItem('rubyRuleFrusQuestSave'));const template=await seed.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));await seed.close();
 for(const appearance of ['compiler','compiler_ada','compiler_clara','compiler_maya','compiler_robin','compiler_quinn']){
  const saved=structuredClone(template);saved.state.playerProfile.compilerAppearance=appearance;saved.state.mode='explore';saved.state.activeDialog=null;saved.state.sceneProgress.libraryBriefed_reagan=1;
  const p=await b.newPage({viewport:{width:1024,height:960},storageState:{cookies:[],origins:[{origin:'http://127.0.0.1:5211',localStorage:[{name:'rubyRuleFrusQuestSave',value:JSON.stringify(saved)}]}]}}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
  await p.goto('http://127.0.0.1:5211/');await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await p.keyboard.press('Enter');await p.waitForFunction(()=>window.game.scene.isActive('PresidentialLibraryScene'));
  const measurements=await p.evaluate(()=>{
   const h=window.game.scene.getScene('PresidentialLibraryScene').player,t=h.sprite.texture,c=document.createElement('canvas');c.width=t.source[0].width;c.height=t.source[0].height;const g=c.getContext('2d');g.drawImage(t.source[0].image,0,0);const pixels=g.getImageData(0,0,c.width,c.height).data;
   return {key:t.key,frames:Array.from({length:15},(_,i)=>{const f=t.get(i);let bottom=-1;for(let y=f.cutHeight-1;y>=0&&bottom<0;y--)for(let x=0;x<f.cutWidth;x++)if(pixels[((f.cutY+y)*c.width+f.cutX+x)*4+3]>=32){bottom=y;break;}const sole=h.groundOffsets[i]+(bottom-h.sprite.displayOriginY)*h.poseScales[i]/3;return {frame:i,sole,shadow:h.shadowOffsetY,gap:h.shadowOffsetY-sole};})};
  });
  assert.equal(measurements.key,`${appearance}_hd`);for(const f of measurements.frames)assert(Math.abs(f.gap)<=2,`${appearance} frame${f.frame}: gap${f.gap}`);
  const start=await p.evaluate(()=>({...window.game.scene.getScene('PresidentialLibraryScene').player.position}));
  for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown']){const before=await p.evaluate(()=>({...window.game.scene.getScene('PresidentialLibraryScene').player.position}));await p.keyboard.down(key);await p.waitForTimeout(220);await p.keyboard.up(key);await p.waitForTimeout(100);const after=await p.evaluate(()=>({...window.game.scene.getScene('PresidentialLibraryScene').player.position}));assert(Math.hypot(after.x-before.x,after.y-before.y)>5,key+' should move');}
  const stop=await p.evaluate(()=>({...window.game.scene.getScene('PresidentialLibraryScene').player.position}));await p.waitForTimeout(150);assert.deepEqual(await p.evaluate(()=>({...window.game.scene.getScene('PresidentialLibraryScene').player.position})),stop);
  await p.screenshot({path:`${out}/${appearance}.png`});assert.deepEqual(errors,[]);results.push({appearance,measurements,start,stop,releaseStops:true,errors});await p.close();
 }
}finally{await b.close();}
await writeFile(`${out}/result.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({appearance:r.appearance,frames:r.measurements.frames.length,maxGap:Math.max(...r.measurements.frames.map(f=>Math.abs(f.gap))),errors:r.errors}))));
