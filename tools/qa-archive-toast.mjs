import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/archive-toast';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--disable-audio-output']});
try {for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(new URL('?scene=ArchiveScene&text=full',process.env.FRUS_QA_URL??'http://127.0.0.1:5211/').href);
 await page.waitForFunction(()=>window.game?.scene.isActive('ArchiveScene'));
 for(const [name,x,y] of [['entry',128,184],['top',128,65],['left',28,150],['right',228,150]]){
 const bounds=await page.evaluate(({x,y})=>{
  const scene=window.game.scene.getScene('ArchiveScene');scene.player.setPosition(x,y);
  scene.toast.show('Find Source Note 47\nBring it to the research table',scene.player.position,'info');
  const actor=scene.player.sprite.getBounds(),box=scene.toast.container.getBounds();
  return {actor:{top:actor.top,bottom:actor.bottom},box:{top:box.top,bottom:box.bottom,left:box.left,right:box.right,width:box.width}};
 },{x,y});
 assert(bounds.box.bottom<bounds.actor.top||bounds.box.top>bounds.actor.bottom,JSON.stringify(bounds));
 assert(bounds.box.left>=7&&bounds.box.right<=249);assert(bounds.box.width<140);
 if(name==='entry'||name==='top')await page.screenshot({path:`${out}/${mobile?'phone':'desktop'}-${name}.png`});
 }
 await page.waitForFunction(()=>!window.game.scene.getScene('ArchiveScene').toast.visible,{},{timeout:10000});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({mobile,placements:4,expired:true,errors}));await page.close();
}}finally{await browser.close();}
