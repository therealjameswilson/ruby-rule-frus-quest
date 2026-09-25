import { researchDoorway } from '../systems/researchDoorway';
import { filedResearchPaper } from '../systems/filedResearchPaper';
import { FeedbackToast } from '../systems/feedbackToast';
import { RESEARCH_PROPS, researchProp } from '../systems/researchProps';
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { gameState, addDocumentPoints, setSceneState, setObjective, setLatestMessage, setNearestInteractable, setVisibleEntities, setVisibleThreats, setRoomTraversalState } from '../game/state';
import { LIBRARY_ASSIGNMENTS } from '../game/libraryResearch';
import { nscDungeon, nscStage, fileNscStage, nscQuestion } from '../game/nscResearch';
import { getInput, tickInput, swallowNextInputFrame } from '../input/InputState';
import { DialogBox } from '../systems/dialog';
import { ChoicePrompt } from '../systems/verification';
import { InventoryOverlay } from '../systems/inventory';
import { handleOpenOverlays } from '../systems/overlayInput';
import { saveGameNow } from '../systems/save';
import { transitionTo, drawRoomFrame } from '../systems/sceneTransitions';
import { retroAudio } from '../systems/audio';
import { addNscRoomFloor } from '../systems/nscRoomFloor';
import { addEditorialRoomWalls } from '../systems/editorialRoomWalls';
import { buildEditorE1TileLayers } from '../game/editorE1Tilemap';
const ROOMS=['CATALOG HALL','SOURCE TRAIL','ACCESS REVIEW'];
export class NscLibraryScene extends Phaser.Scene {
  private player!:Player;
  private dialog!:DialogBox;
  private choice!:ChoicePrompt;
  private inventory!:InventoryOverlay;
  private filedPaper!: Phaser.GameObjects.Container;
  private toast!: FeedbackToast;
  private doorLights!:Phaser.GameObjects.Graphics;
  private northDoor?: Phaser.GameObjects.Image | null;
  private gate!:Phaser.GameObjects.Text;
  private dossier=nscDungeon('reagan')!;
  private room=0;
  private leaving=false;
  private solids:Phaser.Geom.Rectangle[]=[];
  constructor(){super('NscLibraryScene');}
  preload(){if(!this.textures.exists(RESEARCH_PROPS.key))this.load.image(RESEARCH_PROPS.key,RESEARCH_PROPS.path);}
  create(){
    this.dossier=nscDungeon(LIBRARY_ASSIGNMENTS[gameState.sceneProgress.libraryResearchActive]?.library??'')??nscDungeon('reagan')!;
    const id=this.dossier.library,stage=nscStage(gameState.sceneProgress,id);
    this.room=Math.max(0,Math.min(2,stage,Math.floor(gameState.sceneProgress[`nscRoom_${id}`]||0)));
    this.leaving=false;this.solids=[];
    setSceneState('NscLibraryScene','explore',this.dossier.title);
    setRoomTraversalState({currentRoomId:`nsc-${id}-${this.room}`,roomTitle:`${this.dossier.title}: ${ROOMS[this.room]}`,roomType:'puzzle',visitedRoomIds:Array.from({length:this.room+1},(_,i)=>`nsc-${id}-${i}`),revealedRoomIds:[`nsc-${id}-${this.room}`],exits:{south:this.room?'Previous chamber':'PresidentialLibraryScene',north:this.room<2?'Next chamber':'PresidentialLibraryScene'},lockedExits:{},requiredItems:{}});
    setVisibleThreats([]);setVisibleEntities([this.dossier.collection,this.dossier.handle,'West desk: read holding guide','East desk: check source trail','South: back; north: continue after filing']);
    drawRoomFrame(this,'NSC RESEARCH',this.dossier.accent,{showLegacyHud:false});
    addNscRoomFloor(this,this.room);
    // Open the north and south central cells for the chamber route.
    const walls=buildEditorE1TileLayers().walls.map(row=>[...row]);
    for(const row of walls){row[0]=walls[0][0];row[row.length-1]=walls[0][0];}
    for(const y of [0,walls.length-1])for(const x of [7,8])walls[y][x]=-1;
    addEditorialRoomWalls(this,walls,0,32);
    this.northDoor=researchDoorway(this,128,66,'closed');
    researchDoorway(this,128,222,'wing');
    // Physical plaques flank the doorway so the compiler never covers the briefing.
    const plaques=this.add.graphics().setDepth(45).setName('nsc-wall-plaques');
    for(const x of [20,152]){
      plaques.fillStyle(0x151e22,.35).fillRoundedRect(x+1,46,84,39,2);
      plaques.fillStyle(0x4f4533).fillRoundedRect(x,44,84,39,2);
      plaques.fillGradientStyle(0xd4be88,0xc6ae77,0x94805b,0xa28d61,1).fillRoundedRect(x+1,45,82,37,1);
      plaques.lineStyle(.5,0xf0deb3,.8).strokeRoundedRect(x+2,46,80,35,1);
      for(const sx of [x+4,x+80])plaques.fillStyle(0x615743).fillCircle(sx,48,.7);
    }
    this.label(62,57,this.dossier.title,7).setStyle({color:'#272e30',backgroundColor:undefined,wordWrap:{width:74}});
    this.label(194,54,`${this.room+1}/3  ${ROOMS[this.room]}`,7).setStyle({color:'#272e30',backgroundColor:undefined,wordWrap:{width:74}});
    this.gate=this.label(194,73,'',6).setStyle({color:'#263637',backgroundColor:undefined,wordWrap:{width:74}});
    this.doorLights=this.add.graphics().setDepth(46).setName('nsc-door-status');
    for(const [x,y,label] of [[62,120,'READ GUIDE'],[194,120,'CHECK FILE']] as const){
      const desk=researchProp(this,'desk',x,y,48);
      if(desk)desk.setDepth(40);else this.add.rectangle(x,y,48,25,0x523c31).setStrokeStyle(1,0xb79a68).setDepth(40);
      this.label(x,y-20,label,7);this.solids.push(new Phaser.Geom.Rectangle(x-24,y-13,48,26));
    }
    this.filedPaper=filedResearchPaper(this,194,120);
    this.label(128,207,this.room?'SOUTH: PREVIOUS ROOM':'SOUTH: LIBRARY LOBBY',6);
    this.add.text(62,75,'SOURCES ↗',{fontFamily:'Arial',fontSize:'6px',color:'#243c40'}).setOrigin(.5).setDepth(50).setInteractive(new Phaser.Geom.Rectangle(-5,-6,54,22),Phaser.Geom.Rectangle.Contains).on('pointerdown',()=>window.open(`assets/research-world/nsc-research.html#${id}`,'_blank','noopener,noreferrer'));
    this.player=new Player(this,128,190);
    this.toast=new FeedbackToast(this,1200,()=>this.player.sprite.getBounds());
    this.dialog=new DialogBox(this,{aboveTouchControls:true});this.choice=new ChoicePrompt(this,{settleMs:160});this.inventory=new InventoryOverlay(this);
    this.refresh();retroAudio.startMusic('ArchiveScene');swallowNextInputFrame();
    setLatestMessage(`${this.dossier.collection}. ${this.dossier.handle}. Official source: ${this.dossier.source}`);
    saveGameNow();
  }
  private label(x:number,y:number,text:string,size:number){return this.add.text(x,y,text,{fontFamily:'Arial',fontSize:`${size}px`,color:'#f4dfac',backgroundColor:'#192630',align:'center',wordWrap:{width:206}}).setOrigin(.5).setDepth(50);}
  private refresh(){const done=nscStage(gameState.sceneProgress,this.dossier.library)>this.room;this.filedPaper.setVisible(done);if(done&&this.northDoor){researchDoorway(this,128,66,'wing');this.northDoor.destroy();this.northDoor=null;}this.gate.setText(done?(this.room===2?'FILED · RETURN ↑':'FILED · CONTINUE ↑'):'VERIFY FILE TO OPEN');this.doorLights.clear();for(const x of [109,147]){this.doorLights.fillStyle(0x172227).fillRoundedRect(x-2,39,4,10,1);this.doorLights.fillStyle(done?0x8ed7ae:0xd5a755).fillRoundedRect(x-1,41,2,6,.5);}setObjective(done?'SOURCE FILED':'GUIDE → VERIFY');}
  update(_:number,delta:number){
    tickInput();const input=getInput();if(this.leaving)return;
    if(gameState.mode==='explore')this.toast.update(delta,this.player.position);
    if(this.dialog.active){this.player.update(delta,false);if(input.aJustPressed||input.bJustPressed)this.dialog.advance();return;}
    if(this.choice.active){this.player.update(delta,false);this.choice.updateInput();return;}
    if(handleOpenOverlays(this.inventory)){this.player.update(delta,false);return;}
    if(input.menuJustPressed||input.pauseJustPressed){this.inventory.toggle();return;}
    if(input.fullscreenJustPressed)this.scale.toggleFullscreen();
    this.player.update(delta,true,{bounds:{left:22,right:234,top:84,bottom:220},solids:this.solids});
    const p=this.player.position;
    const nearWest=Math.hypot(p.x-62,p.y-145)<26,nearEast=Math.hypot(p.x-194,p.y-145)<26;
    const nearGate=Math.abs(p.x-128)<18&&p.y<94;
    setNearestInteractable(nearWest?'Holding guide':nearEast?'Source check':nearGate?'North door':null);
    if(p.y>=213&&Math.abs(p.x-128)<18&&(input.dir.y>0||input.aJustPressed)){this.go(this.room-1);return;}
    if(nearGate&&input.aJustPressed){if(nscStage(gameState.sceneProgress,this.dossier.library)>this.room)this.go(this.room+1);else this.dialog.show('MISFILED STACK','DANN-E has blocked the next chamber. Read the west guide, then verify the file at the east desk.');return;}
    if(input.bJustPressed&&nearWest)window.open(`assets/research-world/nsc-research.html#${this.dossier.library}`,'_blank','noopener,noreferrer');
    if(input.aJustPressed&&nearWest){gameState.sceneProgress[`nscGuideRead_${this.dossier.library}_${this.room}`]=1;saveGameNow();this.dialog.show('HOLDING GUIDE',[this.dossier.collection,this.dossier.handle,this.dossier.challenge.correct,`Source: ${this.dossier.sourceLabel}. Use SOURCES for the official link.`,'A collection lead is not a retrieved or cleared document. Preserve unknowns for the archivist.']);}
    if(input.aJustPressed&&nearEast)this.check();
  }
  private check(){
    const id=this.dossier.library;
    if(nscStage(gameState.sceneProgress,id)>this.room){this.dialog.show('FILED','This source check is saved. The north door is open.');return;}
    const task=nscQuestion(id,this.room),correctFirst=this.room!==1;
    this.choice.show(task.question,[{key:'A',label:correctFirst?task.correct:task.wrong,value:correctFirst?'correct':'wrong'},{key:'B',label:correctFirst?task.wrong:task.correct,value:correctFirst?'wrong':'correct'}],option=>{
      if(!fileNscStage(gameState.sceneProgress,id,this.room,option.value==='correct')){this.dialog.show('DANN-E’S MISFILE','That loses the provenance or overstates the evidence. The west guide can help; try again.');return;}
      if(nscStage(gameState.sceneProgress,id)===3)addDocumentPoints(6,`${id}: NSC source trail verified`);
      this.refresh();saveGameNow();retroAudio.fileDocket();
      if(this.room===2)this.dialog.show('SOURCE TRAIL SAVED','NSC research lead filed for human review. Return north to the library lobby.');
      else this.toast.show('SOURCE FILED · NORTH DOOR OPEN',this.player.position,'info');
    },6,()=>{});
  }
  private go(room:number){
    this.leaving=true;
    if(room<0||room>2){saveGameNow();transitionTo(this,'PresidentialLibraryScene');return;}
    gameState.sceneProgress[`nscRoom_${this.dossier.library}`]=room;saveGameNow();this.scene.restart();
  }
}
