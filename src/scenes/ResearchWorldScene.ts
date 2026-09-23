import Phaser from 'phaser';
import { DANNE_DISGUISES, disguiseIndex } from '../game/danneDisguises';
import { Player } from '../entities/Player';
import { DANNE_OUTDOOR_LINES, discoveryCount, RESEARCH_LANDMARKS, RESEARCH_ZONES, researchZone, researchHolding, type ResearchLandmark } from '../game/researchWorld';
import { gameState, setLatestMessage, setNearestInteractable, setObjective, setSceneState, setVisibleEntities, setVisibleThreats } from '../game/state';
import { bindPointerDown, getInput, swallowNextInputFrame, tickInput } from '../input/InputState';
import { DialogBox } from '../systems/dialog';
import { InventoryOverlay } from '../systems/inventory';
import { handleOpenOverlays } from '../systems/overlayInput';
import { ChoicePrompt } from '../systems/verification';
import { transitionTo } from '../systems/sceneTransitions';
import { saveGameNow } from '../systems/save';
import { retroAudio } from '../systems/audio';

type Stop = {label:string; x:number; y:number; radius:number; act:()=>void};
export class ResearchWorldScene extends Phaser.Scene {
  private player!: Player;
  private dialog!: DialogBox;
  private choice!: ChoicePrompt;
  private inventory!: InventoryOverlay;
  private zone = 1;
  private leaving = false;
  private stops: Stop[] = [];
  private solids: Phaser.Geom.Rectangle[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private travelClose!: Phaser.GameObjects.Container;
  private disguise = 0;
  private disguiseLabel!: Phaser.GameObjects.Text;
  private danne!: Phaser.GameObjects.Image;
  private tally!: Phaser.GameObjects.Text;
  private arrival?: {x:number;y:number};
  constructor() { super('ResearchWorldScene'); }

  init(data: {x?:number;y?:number} = {}) {
    this.arrival = typeof data.x === 'number' && typeof data.y === 'number' ? {x:data.x,y:data.y} : undefined;
  }
  preload() {
    this.disguise=disguiseIndex(gameState.sceneProgress.researchDanneDisguise);
    this.loadDisguise(this.disguise);
    for (const name of ['landmarks','sprites','landscape']) {
      if (!this.textures.exists(`research-${name}`)) this.load.image(`research-${name}`, `assets/research-world/${name}.png`);
    }
  }
  create() {
    this.zone = researchZone(gameState.sceneProgress.researchWorldZone);
    this.leaving = false; this.stops = []; this.solids = [];
    setSceneState('ResearchWorldScene','explore','EXPLORE THE OUTDOORS');
    setVisibleThreats([]); setNearestInteractable(null);
    retroAudio.startMusic('CherryBlossomGardenScene');
    this.cameras.main.setBackgroundColor('#b7d879');
    for (const key of ['research-landmarks','research-sprites']) this.sliceAtlas(key);
    this.add.image(128,137,'research-landscape').setDisplaySize(256,206).setDepth(-20);
    // The paths remain walkable; only the footprint of each building is solid.
    for (const [x,y,frame] of [[19,74,5],[239,75,4],[17,189,6],[239,189,7],[27,119,8],[229,119,8]]) {
      this.prop(x,y,frame,30,34);
    }
    this.solids.push(new Phaser.Geom.Rectangle(0,213,108,27),new Phaser.Geom.Rectangle(148,213,108,27));
    const landmarks = RESEARCH_LANDMARKS.filter(l=>l.zone===this.zone);
    for (const landmark of landmarks) this.drawLandmark(landmark);
    if (this.zone === 1) {
      this.prop(185,102,10,38,35);
      this.label(185,109,'READING GARDEN');
      this.stop('Rest in the garden',185,121,19,()=>this.dialog.show('GARDEN',[
        'Sunlight, birdsong, and no clearance clock. Explore at your own pace.',
        'East: Archives I and the Library of Congress. North from there: Archives II in Maryland.',
        'The rail station visits four presidential-library regions. This is a compressed travel map, not street geography.'
      ]));
    }
    if (this.zone === 2) {
      this.prop(61,165,15,25,34); this.label(61,173,'ARCHIVIST');
      this.stop('Ask the archivist',61,181,19,()=>this.dialog.show('ARCHIVIST',[
        'DANN-E is always offering to save us time. Somehow his shortcuts take all afternoon.',
        'Check the finding aid yourself. Keep a precise source trail and distinguish access from clearance.'
      ]));
    }
    this.danne=this.add.image(130,143,`danne-disguise-${this.disguise}`).setOrigin(.5,1).setDepth(143);
    this.disguiseLabel=this.label(130,147,'DANN-E 00/20');
    this.applyDisguise(this.disguise);
    this.stop('Talk to DANN-E',130,153,18,()=>{
      const visit=gameState.sceneProgress.researchDanneTalks??0;
      gameState.sceneProgress.researchDanneTalks=visit+1;
      this.dialog.show('DANN-E', [`${DANNE_DISGUISES[this.disguise].movie} disguise. ${DANNE_DISGUISES[this.disguise].title}.`, ...DANNE_OUTDOOR_LINES[visit%DANNE_OUTDOOR_LINES.length]]);
    });
    this.prop(90,213,12,17,15);
    this.stop('Inspect field satchel',90,218,15,()=>this.dialog.show('FIELD NOTES',[
      'A notebook, a pencil, and a precise citation: the best equipment for an archival expedition.',
      'Keep a research log. Record what you checked, what you found, and what remains unresolved.'
    ]));
    this.prop(163,211,9,15,27);
    this.prop(128,222,11,42,30); this.label(128,202,'RAIL');
    this.stop('Travel by rail',128,210,20,()=>this.travelMenu());
    this.prop(236,151,13,20,18); this.label(233,159,'JOURNAL');
    this.stop('Discovery journal',233,170,18,()=>this.journal());
    this.prop(20,149,14,21,24); this.label(24,154,this.zone<3?'OFFICE':'DC');
    this.stop(this.zone<3?'Return to FRUS office':'Return to Washington',24,168,18,()=>{
      if(this.zone>=3) {this.travel(0);return;}
      this.leaving=true;
      gameState.sceneProgress.officeReturnX=46; gameState.sceneProgress.officeReturnY=190;
      transitionTo(this,'OfficeScene');
    });
    const zone=RESEARCH_ZONES[this.zone];
    this.add.rectangle(128,47,256,34,0xf6edca).setDepth(300);
    this.label(128,33,zone.name,300,8);
    this.label(128,46,zone.hint,300,6);
    this.tally=this.label(128,58,'',300,6);
    const directions=zone as {west?:number;east?:number;north?:number;south?:number};
    if(directions.west!==undefined)this.label(8,132,'<',300,9);
    if(directions.east!==undefined)this.label(248,132,'>',300,9);
    if(directions.north!==undefined)this.label(128,68,'^',300,9);
    if(directions.south!==undefined)this.label(128,232,'v',300,9);
    this.player=new Player(this,this.arrival?.x??128,this.arrival?.y??188);
    this.dialog=new DialogBox(this,{aboveTouchControls:true});
    this.choice=new ChoicePrompt(this,{settleMs:200});
    this.inventory=new InventoryOverlay(this);
    const closeBox=this.add.rectangle(232,22,44,44,0x234c39).setStrokeStyle(1,0xf8edc9);
    const closeText=this.add.text(232,22,'X',{fontFamily:'monospace',fontSize:'12px',color:'#fff6cf'}).setOrigin(.5);
    this.travelClose=this.add.container(0,0,[closeBox,closeText]).setDepth(1000).setVisible(false);
    bindPointerDown(closeBox,()=>{this.choice.hide();swallowNextInputFrame();});
    this.prompt=this.add.text(128,191,'',{fontFamily:'monospace',fontSize:'7px',color:'#fff5cf',backgroundColor:'#234c39',padding:{x:3,y:2}}).setOrigin(.5).setDepth(350);
    setVisibleEntities([zone.name,...landmarks.map(l=>l.name),'DANN-E (civilian disguise)','Rail station','Discovery journal','Return to office / Washington']);
    setLatestMessage('Walk freely. Approach a landmark and press A to discover it. Rail travel is free.');
    this.refreshTally(); swallowNextInputFrame();
  }
  update(_:number,delta:number) {
    tickInput(); const input=getInput();
    if(this.leaving)return;
    this.travelClose.setVisible(this.choice.active);
    if(this.dialog.active) {
      if(input.aJustPressed||input.confirmJustPressed||input.bJustPressed||input.cancelJustPressed)this.dialog.advance();
      this.player.update(delta,false);this.prompt.setVisible(false);return;
    }
    if(this.choice.active) {this.choice.updateInput();this.player.update(delta,false);this.prompt.setVisible(false);return;}
    if(handleOpenOverlays(this.inventory)) {this.player.update(delta,false);this.prompt.setVisible(false);return;}
    if(input.pauseJustPressed||input.menuJustPressed||input.startJustPressed){this.inventory.toggle();return;}
    if(input.fullscreenJustPressed)this.scale.toggleFullscreen();
    this.player.update(delta,true,{bounds:{left:7,right:249,top: 60,bottom:230},solids:this.solids});
    const p=this.player.position;
    this.danne.setFlipX(p.x>130);
    const nearest=this.stops.map(s=>({s,d:Math.hypot(p.x-s.x,p.y-s.y)})).filter(v=>v.d<=v.s.radius).sort((a,b)=>a.d-b.d)[0]?.s;
    this.prompt.setVisible(Boolean(nearest)).setText(nearest?.label==='Talk to DANN-E'?'A: TALK  B: NEXT DISGUISE':nearest?`A: ${nearest.label}`:'');
    setNearestInteractable(nearest?.label??null);
    if(nearest?.label==='Talk to DANN-E'&&input.bJustPressed){this.changeDisguise();return;}
    if(nearest&&(input.aJustPressed||input.confirmJustPressed)){nearest.act();return;}
    const zone=RESEARCH_ZONES[this.zone] as {west?:number;east?:number;north?:number;south?:number};
    if(p.x<=8&&input.dir.x<0&&zone.west!==undefined)this.travel(zone.west,{x:239,y:p.y});
    else if(p.x>=248&&input.dir.x>0&&zone.east!==undefined)this.travel(zone.east,{x:17,y:p.y});
    else if(p.y<=61&&input.dir.y<0&&zone.north!==undefined)this.travel(zone.north,{x:p.x,y:216});
    else if(p.y>=229&&input.dir.y>0&&zone.south!==undefined)this.travel(zone.south,{x:p.x,y: 70});
  }
  private loadDisguise(index:number) {
    const key=`danne-disguise-${index}`;
    if(!this.textures.exists(key))this.load.image(key,`assets/research-world/danne-variants/${DANNE_DISGUISES[index].id}.png`);
  }
  private applyDisguise(index:number) {
    const key=`danne-disguise-${index}`,texture=this.textures.get(key);
    const [left,top,right,bottom]=DANNE_DISGUISES[index].bounds;
    if(!texture.has('body'))texture.add('body',0,left,top,right-left,bottom-top);
    this.danne.setTexture(key,'body').setScale(42/(bottom-top));
    this.disguiseLabel.setText(`DANN-E ${String(index+1).padStart(2,'0')}/20`);
    gameState.sceneProgress.researchDanneDisguise=index;
  }
  private changeDisguise() {
    if(this.load.isLoading())return;
    const next=disguiseIndex(this.disguise+1),key=`danne-disguise-${next}`;
    const target=this.danne;
    const apply=()=>{
      if(this.danne!==target||!this.sys.isActive()||!this.textures.exists(key))return;
      this.disguise=next;this.applyDisguise(next);saveGameNow();
      setLatestMessage(`DANN-E changes into his ${DANNE_DISGUISES[next].movie} disguise. ${next+1}/20. A: talk. B: next disguise.`);
    };
    if(this.textures.exists(key)){apply();return;}
    this.loadDisguise(next);this.load.once('complete',apply);this.load.start();
  }
  private sliceAtlas(key:string) {
    const texture=this.textures.get(key),source=texture.getSourceImage();
    for(let i=0;i<16;i++){
      if(texture.has(String(i)))continue;
      const x=Math.floor(i%4*source.width/4),y=Math.floor(Math.floor(i/4)*source.height/4);
      texture.add(String(i),0,x,y,Math.floor((i%4+1)*source.width/4)-x,Math.floor((Math.floor(i/4)+1)*source.height/4)-y);
    }
    // The generated station extends left of its nominal cell; the birdbath
    // must not inherit that neighboring roof edge.
    if(key==='research-sprites') {
      texture.remove('10'); texture.remove('11');
      texture.add('10',0,Math.floor(source.width*.5),Math.floor(source.height*.5),Math.floor(source.width*.19),Math.floor(source.height*.25));
      texture.add('11',0,Math.floor(source.width*.69),Math.floor(source.height*.5),Math.floor(source.width*.31),Math.floor(source.height*.25));
    }
  }
  private prop(x:number,y:number,frame:number,w:number,h:number) {
    return this.add.image(x,y,'research-sprites',String(frame)).setOrigin(.5,1).setDisplaySize(w,h).setDepth(y);
  }
  private label(x:number,y:number,text:string,depth=280,size=6) {
    const label=this.add.text(x,y,text,{fontFamily:'monospace',fontSize:`${size}px`,color:'#173e36',backgroundColor:'#f8edc9',padding:{x:2,y:1}}).setOrigin(.5,0).setDepth(depth);
    this.add.rectangle(x,y,label.width,label.height,0xf8edc9).setOrigin(.5,0).setDepth(depth-.1);
    return label;
  }
  private stop(label:string,x:number,y:number,radius:number,act:()=>void){this.stops.push({label,x,y,radius,act});}
  private drawLandmark(l:ResearchLandmark) {
    this.add.image(l.x,l.y,'research-landmarks',String(l.frame)).setOrigin(.5,1).setDisplaySize(70, 60).setDepth(l.y-10);
    this.label(l.x,l.y+2,l.label);
    this.solids.push(new Phaser.Geom.Rectangle(l.x-27,l.y-33,54,30));
    this.stop(l.label,l.x,l.y+20,21,()=>this.discover(l));
  }
  private discover(l:ResearchLandmark) {
    const first=!gameState.sceneProgress[`researchVisited_${l.id}`];
    gameState.sceneProgress[`researchVisited_${l.id}`]=1;
    this.refreshTally();
    saveGameNow();
    setLatestMessage(`${first?'Discovered':'Revisited'}: ${l.name}. ${l.location}. ${l.lesson}`);
    this.dialog.show(l.label,[`${l.name}\n${l.location}`,`HOLDINGS: ${researchHolding(l.id).text}`,l.lesson,first?'Discovery recorded in your journal. This visit is a research lead, not a cleared document.':'Already in your journal. Explore in any order.']);
  }
  private refreshTally(){this.tally.setText(`DISCOVERIES ${discoveryCount(gameState.sceneProgress)}/${RESEARCH_LANDMARKS.length}`);setObjective('EXPLORE THE OUTDOORS');}
  private travel(zone:number,arrival={x:128,y:188}) {
    if(this.leaving)return;
    this.leaving=true;gameState.sceneProgress.researchWorldZone=zone;
    gameState.sceneProgress.researchDanneDisguise=disguiseIndex(this.disguise+1);
    swallowNextInputFrame();this.scene.restart(arrival);
  }
  private travelMenu() {
    this.choice.show('FREE RESEARCH RAIL\nChoose a library region.',[
      {key:'A',label:'East: NY / MA / GA'}, {key:'B',label:'Heartland: MO / KS / MI / AR'},
      {key:'C',label:'Pacific: California'}, {key:'D',label:'Texas: Austin / Bush libraries'}
    ],option=>this.travel(({A:3,B:4,C:5,D:6} as Record<string,number>)[option.key]),6,()=>{});
  }
  private journal() {
    const found=RESEARCH_LANDMARKS.filter(l=>gameState.sceneProgress[`researchVisited_${l.id}`]);
    this.dialog.show('FIELD JOURNAL',[
      `${found.length}/${RESEARCH_LANDMARKS.length} landmarks discovered. Walk to a building and press A. No required order.`,
      'DC: Potomac Green west, Capital Commons east, Maryland Grove north. Rail links four distant library regions.',
      ...found.flatMap(l=>[`${l.name}\n${l.location}`,researchHolding(l.id).text]),
      'Research lessons are practice prompts. Catalogs and repository staff establish holdings and access. The map compresses real distances.'
    ]);
  }
}
