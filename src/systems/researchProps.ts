import type Phaser from 'phaser';
export const RESEARCH_PROPS={key:'research-props-v1',path:'assets/art-pack/research-props/props-v1.png'};
const frames={desk:[32,193,880,492],cart:[1135,84,591,720]} as const;
export function researchProp(scene:Phaser.Scene,kind:keyof typeof frames,x:number,y:number,width:number){
  if(!scene.textures.exists(RESEARCH_PROPS.key))return null;
  const texture=scene.textures.get(RESEARCH_PROPS.key),[fx,fy,w,h]=frames[kind];
  if(!texture.has(kind))texture.add(kind,0,fx,fy,w,h);
  return scene.add.image(x,y,RESEARCH_PROPS.key,kind).setDisplaySize(width,width*h/w);
}
