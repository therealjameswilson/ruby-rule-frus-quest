// Use the visible HTML dock when available; callers retain canvas fallback.
export async function pressPortraitControl(page, cdp, key, milliseconds = 50) {
  const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  const direction=directions[key];
  const control=direction?'pad':key==='x'?'b':key==='Space'?'space':key==='m'?'start':null;
  if(!control)return false;
  const target=page.locator(`#portrait-touch-dock [data-control="${control}"]`);
  if(!await target.isVisible())return false;
  const box=await target.boundingBox();
  const center={x:box.x+box.width/2,y:box.y+box.height/2,id:1};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[center]});
  if(direction)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...center,x:center.x+direction[0]*box.width*.35,y:center.y+direction[1]*box.height*.35}]});
  await page.waitForTimeout(milliseconds);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  return true;
}
