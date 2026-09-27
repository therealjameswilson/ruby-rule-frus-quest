import type Phaser from 'phaser';

export const BOOT_STALL_MS=15000;
/** A quiet connection may recover: offer retry without declaring the load failed. */
export function installBootProgress(scene: Phaser.Scene) {
  const loader=document.getElementById('boot-loader');
  const bar=document.getElementById('boot-loader-bar');
  const fill=bar?.querySelector('span');
  const message=document.getElementById('boot-loader-text');
  const retry=document.getElementById('boot-loader-retry');
  let failed=false,complete=false,lastProgress=Date.now(),percentage=-1;
  if(loader)loader.dataset.state='loading';
  const update=(value:number)=>{
    if(failed||complete)return;
    const next=Math.round(Math.min(1,Math.max(0,value))*100);
    // Small files can complete without changing the rounded percent.
    lastProgress=Date.now();percentage=next;
    if(loader)loader.dataset.state='loading';
    if(message)message.textContent='Loading archive…';
    if(retry)retry.hidden=true;
    bar?.setAttribute('aria-valuenow',String(percentage));
    if(fill)fill.style.width=`${percentage}%`;
  };
  update(0);
  const timer=window.setInterval(()=>{
    if(failed||complete||Date.now()-lastProgress<BOOT_STALL_MS)return;
    if(loader)loader.dataset.state='waiting';
    if(message)message.textContent='Loading is taking longer than usual. Keep waiting, or try again.';
    if(retry)retry.hidden=false;
  },1000);
  const fail=()=>{
    failed=true;window.clearInterval(timer);
    if(loader)loader.dataset.state='error';
    if(message)message.textContent='The archive could not load. Check your connection and try again.';
    if(retry)retry.hidden=false;
  };
  const finish=()=>{
    window.clearInterval(timer);if(failed)return;
    update(1);complete=true;
    if(message)message.textContent='Preparing your adventure…';
  };
  const reload=()=>window.location.reload();
  scene.load.on('progress',update);scene.load.on('loaderror',fail);scene.load.once('complete',finish);
  retry?.addEventListener('click',reload);
  scene.events.once('shutdown',()=>{
    window.clearInterval(timer);scene.load.off('progress',update);scene.load.off('loaderror',fail);scene.load.off('complete',finish);
    retry?.removeEventListener('click',reload);
  });
  return ()=>failed;
}
