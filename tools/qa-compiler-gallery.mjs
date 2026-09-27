import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/frus-compiler-gallery';await mkdir(out,{recursive:true});const b=await chromium.launch();const results=[];
try{for(const [name,width,height,touch] of [['desktop',1280,900,false],['phone',390,844,true],['landscape',844,390,true]]){
 const p=await b.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(new URL('?scene=CharacterCreateScene&text=full',process.env.FRUS_QA_URL??'http://127.0.0.1:5219/').href);await p.waitForFunction(()=>window.game?.scene.isActive('CharacterCreateScene'));await p.waitForTimeout(300);
 const click=async(x,y)=>{const r=await p.locator('canvas').first().boundingBox();if(touch)await p.touchscreen.tap(r.x+x*r.width/256,r.y+y*r.height/240);else await p.mouse.click(r.x+x*r.width/256,r.y+y*r.height/240);await p.waitForTimeout(90);};
 if(touch)assert.equal(await p.evaluate(()=>window.game.scene.getScene('UIScene').controls.enabled),false);
 const selected=()=>p.evaluate(()=>window.game.scene.getScene('CharacterCreateScene').appearanceIndex);
 for(let i=0;i<6;i++){await click(138+i%3*40,55+Math.floor(i/3)*40);assert.equal(await selected(),i);}
 await p.screenshot({path:`${out}/${name}-gallery.png`});await p.keyboard.press('ArrowRight',{delay:50});assert.equal(await selected(),0);await p.keyboard.press('ArrowDown',{delay:50});assert.equal(await selected(),3);await p.keyboard.press('ArrowUp',{delay:50});assert.equal(await selected(),0);
 if(!touch){
  await p.evaluate(()=>{window.qaPad={connected:true,index:0,id:'QA gallery pad',mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.qaPad]});});
  const pad=async(i)=>{await p.evaluate(i=>window.qaPad.buttons[i]={pressed:true,value:1},i);await p.waitForTimeout(100);await p.evaluate(i=>window.qaPad.buttons[i]={pressed:false,value:0},i);await p.waitForTimeout(100);};
  await pad(15);assert.equal(await selected(),1);await pad(13);assert.equal(await selected(),4);await pad(12);assert.equal(await selected(),1);
 }
 await click(128,124);
 if(touch){const input=p.getByRole('textbox',{name:'Compiler name',exact:true});await input.fill('Ruby');await p.keyboard.press('Enter');}
 else {await p.keyboard.type('Ruby');await p.keyboard.press('Enter');}
 await p.waitForTimeout(150);assert(await p.evaluate(()=>window.game.scene.isActive('CharacterCreateScene')));
 await click(178,55);assert.equal(await selected(),1);await click(128,190);await p.waitForFunction(()=>window.game.scene.isActive('DanneIntroScene'));
 const state=await p.evaluate(()=>JSON.parse(window.render_game_to_text()));assert.equal(state.playerProfile.displayName,'Ruby');assert.equal(state.playerProfile.compilerAppearance,'compiler_ada');await p.keyboard.press('Escape',{delay:50});await p.waitForFunction(()=>window.game.scene.isActive('OfficeScene'));await p.waitForTimeout(400);if(touch)assert.equal(await p.evaluate(()=>window.game.scene.getScene('UIScene').controls.enabled),true);assert.deepEqual(errors,[]);results.push({name,allSixSelectable:true,gridNavigation:true,namePreserved:true,confirmedAppearance:true,errors});await p.close();
}await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(results);}finally{await b.close();}
