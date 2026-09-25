import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/copier-recoil';await mkdir(out,{recursive:true});
const b=await chromium.launch();try{
 const p=await b.newPage({viewport:{width:1024,height:960}}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto((process.env.FRUS_QA_URL??'http://127.0.0.1:5212/')+'?scene=ArchiveScene');await p.waitForFunction(()=>window.game?.scene.isActive('ArchiveScene'));await p.waitForTimeout(1500);
 await p.evaluate(async()=>{const {BureaucraticWall}=await import('/src/entities/BureaucraticWall.ts');const s=window.game.scene.getScene('ArchiveScene');s.scene.pause();const a=new BureaucraticWall(s,'qa-hit','NO REPO',128,145,{behavior:'horizontal-patrol'}),c=new BureaucraticWall(s,'qa-control','NO REPO',128,145,{behavior:'horizontal-patrol'});for(const w of [a,c]){w.currentX=151;w.wobbleOffset=0;}c.container.setVisible(false);window.qaWalls={a,c};a.markHit();a.update(1000,20);c.update(1000,20);});
 const read=()=>p.evaluate(()=>{const {a,c}=window.qaWalls;return{logical:a.position,control:c.position,visualOffset:a.container.x-c.container.x,remaining:a.hitRecoilMs,bounds:{x:a.bounds.x,y:a.bounds.y},controlBounds:{x:c.bounds.x,y:c.bounds.y}}});
 const first=await read();assert.deepEqual(first.logical,first.control);assert.deepEqual(first.bounds,first.controlBounds);assert(Math.abs(first.visualOffset)>0&&Math.abs(first.visualOffset)<=2);
 await p.screenshot({path:`${out}/impact.png`});
 await p.waitForTimeout(150);assert.equal((await read()).remaining,first.remaining,'Paused recoil must not expire');
 const samples=await p.evaluate(()=>{const {a,c}=window.qaWalls;const result=[];for(let i=1;i<=12;i++){a.update(1000+i*20,20);c.update(1000+i*20,20);result.push({offset:a.container.x-c.container.x,logicalDelta:Math.hypot(a.position.x-c.position.x,a.position.y-c.position.y)});}return result;});
 assert(samples.every(s=>Math.abs(s.offset)<=2&&s.logicalDelta===0));assert.equal(samples.at(-1).offset,0);
 await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>{const {a,c}=window.qaWalls;a.markHit();a.update(1500,20);c.update(1500,20);});const reduced=await read();assert.equal(reduced.visualOffset,0);assert.deepEqual(reduced.logical,reduced.control);assert.deepEqual(errors,[]);
 await p.screenshot({path:`${out}/reduced-motion.png`});const result={first,samples,reduced,pauseHeld:true,errors,limitations:['Fixture positions; not an unaided combat playthrough']};await writeFile(`${out}/result.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await b.close();}
