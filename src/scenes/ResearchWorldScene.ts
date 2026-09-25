import { OutdoorAtmosphere } from "../systems/outdoorAtmosphere";
import { nscDungeon, nscStage } from '../game/nscResearch';
import { presentationPanel, PANEL_COLORS } from "../systems/presentationPanel";
import { LIBRARY_ASSIGNMENTS, libraryAssignment, libraryStage } from "../game/libraryResearch";
import Phaser from 'phaser';
import { DANNE_DISGUISES, disguiseIndex } from '../game/danneDisguises';
import { Player } from '../entities/Player';
import { DANNE_OUTDOOR_LINES, discoveryCount, RESEARCH_LANDMARKS, RESEARCH_ZONES, researchZone, researchHolding, researchCollections, collectionPages, type ResearchLandmark } from '../game/researchWorld';
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
  private atmosphere!: OutdoorAtmosphere;
  private leaving = false;
  private stops: Stop[] = [];
  private solids: Phaser.Geom.Rectangle[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private travelClose!: Phaser.GameObjects.Container;
  private disguise = 0;
  private disguiseLabel!: Phaser.GameObjects.Text;
  private danne!: Phaser.GameObjects.Image;
  private tally!: Phaser.GameObjects.Text;
  private worldLabels: Phaser.GameObjects.Text[] = [];
  private arrival?: {x:number;y:number};
  constructor() { super('ResearchWorldScene'); }

  init(data: {x?:number;y?:number} = {}) {
    this.arrival = typeof data.x === 'number' && typeof data.y === 'number' ? {x:data.x,y:data.y} : undefined;
  }
  preload() {
    this.disguise=disguiseIndex(gameState.sceneProgress.researchDanneDisguise);
    this.loadDisguise(this.disguise);
    if (researchZone(gameState.sceneProgress.researchWorldZone) === 1) {
      for (const name of ['sweetgreen','james']) {
        if (!this.textures.exists(`research-${name}-v2`)) this.load.image(`research-${name}-v2`, `assets/research-world/presentation/${name}-v2.png`);
      }
    }
    for (const name of ['landmarks','sprites','landscape']) {
      if (!this.textures.exists(`research-${name}`)) this.load.image(`research-${name}`, `assets/research-world/${name}.png`);
    }
  }
  create() {
    if (gameState.sceneProgress.libraryReturnX) {
      this.arrival = {x:gameState.sceneProgress.libraryReturnX,y:gameState.sceneProgress.libraryReturnY};
      delete gameState.sceneProgress.libraryReturnX; delete gameState.sceneProgress.libraryReturnY;
    }
    this.zone = researchZone(gameState.sceneProgress.researchWorldZone);
    this.leaving = false; this.stops = []; this.solids = []; this.worldLabels = [];
    setSceneState('ResearchWorldScene','explore','EXPLORE THE OUTDOORS');
    setVisibleThreats([]); setNearestInteractable(null);
    retroAudio.startMusic('CherryBlossomGardenScene');
    this.cameras.main.setBackgroundColor('#b7d879');
    for (const key of ['research-landmarks','research-sprites']) this.sliceAtlas(key);
    this.add.image(128,137,'research-landscape').setDisplaySize(256,206).setDepth(-20);
    this.atmosphere = new OutdoorAtmosphere(this);
    // The paths remain walkable; only the footprint of each building is solid.
    for (const [x,y,frame] of [[19,74,5],[239,75,4],[17,189,6],[239,189,7],[27,119,8],[229,119,8]]) {
      this.prop(x,y,frame,30,34);
    }
    this.solids.push(new Phaser.Geom.Rectangle(0,213,108,27),new Phaser.Geom.Rectangle(148,213,108,27));
    const landmarks = RESEARCH_LANDMARKS.filter(l=>l.zone===this.zone);
    for (const landmark of landmarks) this.drawLandmark(landmark);
    if (this.zone === 1) {
      this.drawSweetgreen();
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
    const regionPanel = presentationPanel(this,8,32,240,26);
    for (const object of regionPanel.objects) (object as Phaser.GameObjects.Rectangle).setDepth(300);
    this.add.text(16,35,zone.name,{fontFamily:'Arial',fontSize:'8px',color:PANEL_COLORS.text}).setDepth(301).setName('research-region-title');
    this.add.text(16,47,zone.hint,{fontFamily:'Arial',fontSize:'6.5px',color:PANEL_COLORS.muted}).setDepth(301);
    this.tally=this.add.text(240,36,'',{fontFamily:'Arial',fontSize:'6px',color:'#d4b66d'}).setOrigin(1,0).setDepth(301);
    const directions=zone as {west?:number;east?:number;north?:number;south?:number};
    if(directions.west!==undefined)this.label(8,132,'<',300,9);
    if(directions.east!==undefined)this.label(248,132,'>',300,9);
    if(directions.north!==undefined)this.label(128,68,'^',300,9);
    if(directions.south!==undefined)this.label(128,232,'v',300,9);
    this.player=new Player(this,this.arrival?.x??128,this.arrival?.y??188);
    this.dialog=new DialogBox(this,{aboveTouchControls:true});
    this.choice=new ChoicePrompt(this,{settleMs:200,cancelOnBack:true});
    this.inventory=new InventoryOverlay(this);
    // Keep the close control below the HUD and above the choice panel.
    const closeBox=this.add.rectangle(232,36,32,24,0x101925).setStrokeStyle(1,0xd4b66d);
    const closeText=this.add.text(232,36,'CLOSE',{fontFamily:'Arial',fontSize:'7px',color:'#fff6cf'}).setOrigin(.5);
    this.travelClose=this.add.container(0,0,[closeBox,closeText]).setDepth(1000).setVisible(false);
    bindPointerDown(closeBox,()=>{this.choice.hide();swallowNextInputFrame();});
    this.prompt=this.add.text(128,166,'',{fontFamily:'Arial',fontSize:'8px',color:PANEL_COLORS.text,backgroundColor:'#101925',padding:{x:6,y:4},wordWrap:{width:218,useAdvancedWrap:true},align:'center'}).setOrigin(.5,1).setDepth(350).setName('research-action-prompt');
    setVisibleEntities([zone.name,...landmarks.map(l=>l.name),...(this.zone===1?['Sweetgreen','James at Sweetgreen']:[]),'DANN-E (civilian disguise)','Rail station','Discovery journal','Return to office / Washington']);
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
    if(handleOpenOverlays(this.inventory,undefined,true)) {this.player.update(delta,false);this.prompt.setVisible(false);return;}
    if(input.pauseJustPressed||input.menuJustPressed||input.startJustPressed){this.inventory.toggle();return;}
    if(input.fullscreenJustPressed)this.scale.toggleFullscreen();
    this.atmosphere.update(delta);
    this.player.update(delta,true,{bounds:{left:7,right:249,top: 60,bottom:230},solids:this.solids});
    const heroBounds=this.player.sprite.getBounds();
    for(const label of this.worldLabels) label.setVisible(!Phaser.Geom.Intersects.RectangleToRectangle(heroBounds,label.getBounds()));
    const p=this.player.position;
    this.danne.setFlipX(p.x>130);
    const nearest=this.stops.map(s=>({s,d:Math.hypot(p.x-s.x,p.y-s.y)})).filter(v=>v.d<=v.s.radius).sort((a,b)=>a.d-b.d)[0]?.s;
    const collectionStop = RESEARCH_LANDMARKS.find(l=>l.label===nearest?.label && researchCollections(l.id).length);
    this.prompt.setVisible(Boolean(nearest)).setText(nearest?.label==='Talk to DANN-E'?'A: TALK  B: NEXT DISGUISE':collectionStop?'A: COLLECTIONS  B: SOURCES':nearest&&RESEARCH_LANDMARKS.some(l=>l.label===nearest.label&&libraryAssignment(l.id))?'A: ENTER LIBRARY  B: ABOUT':nearest?`A: ${nearest.label}`:'');
    setNearestInteractable(nearest?.label??null);
    if(nearest?.label==='Talk to DANN-E'&&input.bJustPressed){this.changeDisguise();return;}
    if(collectionStop && input.bJustPressed){window.open(`assets/research-world/frus-collections.html#${collectionStop.id}`, '_blank', 'noopener,noreferrer');return;}
    const libraryStop=RESEARCH_LANDMARKS.find(l=>l.label===nearest?.label&&libraryAssignment(l.id));
    if(libraryStop&&input.bJustPressed){this.discover(libraryStop);return;}
    if(nearest&&(input.aJustPressed||input.confirmJustPressed)){nearest.act();return;}
    const zone=RESEARCH_ZONES[this.zone] as {west?:number;east?:number;north?:number;south?:number};
    if(p.x<=8&&input.dir.x<0&&zone.west!==undefined)this.travel(zone.west,{x:239,y:p.y});
    else if(p.x>=248&&input.dir.x>0&&zone.east!==undefined)this.travel(zone.east,{x:17,y:p.y});
    else if(p.y<=61&&input.dir.y<0&&zone.north!==undefined)this.travel(zone.north,{x:p.x,y:216});
    else if(p.y>=229&&input.dir.y>0&&zone.south!==undefined)this.travel(zone.south,{x:p.x,y: 70});
  }
  private drawSweetgreen() {
    // A fictional stop in the compressed Potomac map, separate from archival discoveries.
    const g = this.add.graphics().setDepth(145);
    if (this.textures.exists('research-sweetgreen-v2')) {
      const texture=this.textures.get('research-sweetgreen-v2');
      if(!texture.has('building'))texture.add('building',0,50,83,1677,670);
      this.add.image(70,174,'research-sweetgreen-v2','building').setOrigin(.5,1).setDisplaySize(64,31).setDepth(174).setName('sweetgreen-storefront');
    } else {
      g.fillStyle(0xf5eed9).fillRect(38,143,64,31);
      g.fillStyle(0x255844).fillRect(38,143,64,8);
      this.add.text(70,143,'sweetgreen',{fontFamily:'Arial',fontSize:'6px',color:'#f7f3d7'}).setOrigin(.5,0).setDepth(146);
    }
    this.solids.push(new Phaser.Geom.Rectangle(38,143,64,31));
    this.add.ellipse(91,192,13,3,0x294536,.25).setDepth(179);
    if (this.textures.exists('research-james-v2')) {
      const texture=this.textures.get('research-james-v2');
      if(!texture.has('body'))texture.add('body',0,250,20,540,1490);
      this.add.image(91,192,'research-james-v2','body').setOrigin(.5,1).setScale(42/1490).setDepth(192).setName('james-sweetgreen');
    } else this.add.sprite(91,190,'compiler_veteran',0).setOrigin(.5,.9).setDisplaySize(24,36).setDepth(190).setName('james-sweetgreen');
    this.label(104,194,'JAMES',280,7).setName('sweetgreen-james-label');
    // Salad bowl on the outdoor counter.
    g.fillStyle(0x173e2c,.24).fillEllipse(55,186,20,4);
    g.fillStyle(0xd3d8c4).fillEllipse(55,182,18,8);
    g.fillStyle(0xf5f0de).fillEllipse(55,180,20,6);
    g.fillStyle(0x3b7535).fillEllipse(55,180,16,4);
    for (const [x,y] of [[50,179],[54,178],[58,179],[52,181],[57,181]]) {
      g.fillStyle(0x86b84d).fillEllipse(x,y,4,2.5);
    }
    g.fillStyle(0xc95936).fillCircle(52,179,1.1).fillCircle(58,180,1);
    g.fillStyle(0xe8cd7b).fillCircle(55,181,.7).fillCircle(59,179,.7);
    this.label(70,131,'ORDER SALAD',280,7).setName('sweetgreen-order-label');
    this.stop('Order a salad',64,183,16,()=>this.orderSalad());
    this.stop('Talk to James',91,199,19,()=>{
      gameState.sceneProgress.researchJamesWarningHeard=1;
      setLatestMessage("James at Sweetgreen: Don't trust DANN-E. His helpful act hides an effort to derail your FRUS volume.");
      this.dialog.show('JAMES AT SWEETGREEN',[
        "Don't trust DANN-E. He acts mild-mannered out here, but he wants to get in the way of your FRUS volume.",
        "He'll offer a shortcut, misplace a folder, or send you down the wrong path. Check his advice against the finding aids and your own notes.",
        "Keep your source trail, talk to Kathy, and keep compiling. Don't let his friendly smile fool you.",
        "Order a salad at the counter. Lunch is on me!"
      ],()=>saveGameNow());
    });
  }

  private orderSalad() {
    const salads = ['Garden greens', 'Chicken salad', 'Harvest bowl'];
    this.choice.show('SWEETGREEN\nChoose your salad. James is paying.', [
      ...salads.map((label,index)=>({key:(["A","B","C"] as const)[index],label})),
      {key:'D',label:'Maybe later'}
    ], option => {
      const index=option.key.charCodeAt(0)-65;
      if(index<0 || index>=salads.length) return;
      gameState.sceneProgress.sweetgreenSaladsOrdered=(gameState.sceneProgress.sweetgreenSaladsOrdered??0)+1;
      gameState.sceneProgress.sweetgreenLastSalad=index+1;
      gameState.sceneProgress.sweetgreenPaidByJames=1;
      retroAudio.confirm();
      setLatestMessage(`${salads[index]} ordered. James paid for your salad.`);
      saveGameNow();
      this.dialog.show('JAMES — LUNCH IS ON ME',[
        `Your ${salads[index].toLowerCase()} is ready. James picks up the tab.`,
        'Enjoy your lunch! Then back to compiling that FRUS volume. And remember: do not trust DANN-E.'
      ]);
    },8,()=>{});
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
    const label=this.add.text(x,y,text,{fontFamily:'Arial',fontSize:`${Math.max(7,size)}px`,color:'#f5efdd',backgroundColor:'#19392f',padding:{x:3,y:2}}).setOrigin(.5,0).setDepth(depth);
    // Text owns its backing so changing a name or count cannot leave a stale panel.
    this.worldLabels.push(label);
    return label;
  }
  private stop(label:string,x:number,y:number,radius:number,act:()=>void){this.stops.push({label,x,y,radius,act});}
  private drawLandmark(l:ResearchLandmark) {
    this.add.image(l.x,l.y,'research-landmarks',String(l.frame)).setOrigin(.5,1).setDisplaySize(70, 60).setDepth(l.y-10);
    this.label(l.x,l.y>150?154:l.y+2,l.label);
    this.solids.push(new Phaser.Geom.Rectangle(l.x-27,l.y-33,54,30));
    this.stop(l.label,l.x,l.y+20,21,()=>libraryAssignment(l.id)?this.enterLibrary(l):this.discover(l));
  }
  private enterLibrary(l:ResearchLandmark) {
    if(this.leaving)return;
    this.leaving=true;
    gameState.sceneProgress[`researchVisited_${l.id}`]=1;
    gameState.sceneProgress.libraryResearchActive=LIBRARY_ASSIGNMENTS.findIndex(a=>a.library===l.id);
    saveGameNow();transitionTo(this,'PresidentialLibraryScene');
  }
  private discover(l:ResearchLandmark) {
    const first=!gameState.sceneProgress[`researchVisited_${l.id}`];
    gameState.sceneProgress[`researchVisited_${l.id}`]=1;
    this.refreshTally();
    saveGameNow();
    setLatestMessage(`${first?'Discovered':'Revisited'}: ${l.name}. ${l.location}. ${l.lesson}`);
    this.dialog.show(l.label,[`${l.name}\n${l.location}`,`HOLDINGS: ${researchHolding(l.id).text}`,...collectionPages(l.id),l.lesson,first?'Discovery recorded in your journal. This visit is a research lead, not a cleared document.':'Already in your journal. Explore in any order.']);
  }
  private refreshTally(){this.tally.setText(`DISCOVERIES ${discoveryCount(gameState.sceneProgress)}/${RESEARCH_LANDMARKS.length}`);setObjective('EXPLORE THE OUTDOORS');}
  private travel(zone:number,arrival={x:128,y:188}) {
    if(this.leaving)return;
    this.leaving=true;gameState.sceneProgress.researchWorldZone=zone;
    gameState.sceneProgress.researchDanneDisguise=disguiseIndex(this.disguise+1);
    swallowNextInputFrame();this.scene.restart(arrival);
  }
  private travelMenu() {
    this.choice.show('FREE RESEARCH RAIL\nChoose a destination.',[
      {key:'A',label:'East: NY / MA / GA'}, {key:'B',label:'Heartland: MO / KS / MI / AR'},
      {key:'C',label:'Reagan Library / California'}, {key:'D',label:'Texas: Austin / Bush libraries'}
    ],option=>this.travel(({A:3,B:4,C:5,D:6} as Record<string,number>)[option.key], option.key==='C'?{x:192,y:142}:{x:128,y:188}),6,()=>{});
  }
  private journal() {
    const found=RESEARCH_LANDMARKS.filter(l=>gameState.sceneProgress[`researchVisited_${l.id}`]);
    this.dialog.show('FIELD JOURNAL',[
      `${found.length}/${RESEARCH_LANDMARKS.length} landmarks discovered. Walk to a building and press A. No required order.`,
      'DC: Potomac Green west, Capital Commons east, Maryland Grove north. Rail links four distant library regions.',
      'Choose Reagan Library / California at the rail station for direct arrival at the Reagan Library. The Nixon Library is also on the California map.',
      ...found.flatMap(l=>[`${l.name}\n${l.location}`, ...(libraryAssignment(l.id)?[`Dungeon research packet: ${libraryStage(gameState.sceneProgress,l.id)}/4`]:[]),...(nscDungeon(l.id)?[`NSC wing: ${nscStage(gameState.sceneProgress,l.id)}/3 checks filed`]:[]),researchHolding(l.id).text,...collectionPages(l.id)]),
      'Research lessons are practice prompts. Catalogs and repository staff establish holdings and access. The map compresses real distances.'
    ]);
  }
}
