import { addMisfiledStack } from '../systems/misfiledStacks';
import { preloadLibraryStationArt, libraryStationArt } from '../systems/libraryStationArt';
import { addEditorialRoomFloor } from '../systems/editorialRoomFloor';
import { addEditorialRoomWalls } from '../systems/editorialRoomWalls';
import { buildEditorE1TileLayers } from '../game/editorE1Tilemap';
import { nscDungeon } from '../game/nscResearch';
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { gameState, addDocumentPoints, setSceneState, setObjective, setLatestMessage, setNearestInteractable, setVisibleEntities, setVisibleThreats, setRoomTraversalState } from '../game/state';
import { RESEARCH_LANDMARKS } from '../game/researchWorld';
import { LIBRARY_ASSIGNMENTS, LIBRARY_STATUS_CHECKED, libraryAssignment, libraryStage, fileLibraryStage } from '../game/libraryResearch';
import { getInput, tickInput, swallowNextInputFrame } from '../input/InputState';
import { DialogBox } from '../systems/dialog';
import { ChoicePrompt } from '../systems/verification';
import { InventoryOverlay } from '../systems/inventory';
import { handleOpenOverlays } from '../systems/overlayInput';
import { saveGameNow } from '../systems/save';
import { transitionTo, drawRoomFrame } from '../systems/sceneTransitions';
import { retroAudio } from '../systems/audio';

const STATIONS = [
  { x:48, y:95, label:'1 FINDING AID', name:'FINDING AID' },
  { x:202, y:95, label:'2 COMPARE', name:'COMPARE RECORDS' },
  { x:202, y:163, label:'3 SOURCE NOTE', name:'SOURCE NOTE' },
  { x:48, y:163, label:'4 FILE PACKET', name:'FILE PACKET' }
] as const;

export class PresidentialLibraryScene extends Phaser.Scene {
  private player!: Player;
  private dialog!: DialogBox;
  private choice!: ChoicePrompt;
  private inventory!: InventoryOverlay;
  private prompt!: Phaser.GameObjects.Text;
  private stageText!: Phaser.GameObjects.Text;
  private marks: Phaser.GameObjects.Text[] = [];
  private barriers: (Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle)[] = [];
  private solids: Phaser.Geom.Rectangle[] = [];
  private leaving = false;
  private assignment = LIBRARY_ASSIGNMENTS[8];
  constructor() { super('PresidentialLibraryScene'); }
  preload() { preloadLibraryStationArt(this); }
  create() {
    const index = gameState.sceneProgress.libraryResearchActive;
    this.assignment = LIBRARY_ASSIGNMENTS[Number.isInteger(index) ? index : -1] ?? libraryAssignment('reagan')!;
    const id = this.assignment.library;
    const library = RESEARCH_LANDMARKS.find(l=>l.id===id)!;
    this.leaving=false;this.marks=[];this.barriers=[];this.solids=[];
    setSceneState('PresidentialLibraryScene','explore','RESEARCH THE VOLUME');
    setRoomTraversalState({currentRoomId:`library-${id}`,roomTitle:library.name,roomType:'puzzle',visitedRoomIds:[`library-${id}`],revealedRoomIds:[`library-${id}`],exits:{south:'ResearchWorldScene'},lockedExits:{},requiredItems:{}});
    setVisibleThreats([]);
    setVisibleEntities([library.name, this.assignment.title, ...STATIONS.map(s=>s.name),...(nscDungeon(id)?['North-center: NSC research wing']:[]),'DANN-E misfiled-record barriers','South: return to library grounds']);
    drawRoomFrame(this, library.label, '#d6a23a', {showLegacyHud:false});
    this.cameras.main.setBackgroundColor('#29343e');
    addEditorialRoomFloor(this,false);
    const walls=buildEditorE1TileLayers().walls.map(row=>[...row]);
    for(const row of walls){row[0]=walls[0][0];row[row.length-1]=walls[0][0];}
    for(const x of [7,8])walls[walls.length-1][x]=-1;
    addEditorialRoomWalls(this,walls,0,32);
    this.add.text(128,49,library.label,{fontFamily:'monospace',fontSize:'7px',color:'#ffe0a3'}).setOrigin(.5).setDepth(50);
    this.add.text(128,61,this.assignment.topic,{fontFamily:'monospace',fontSize:'6px',color:'#f6efdb'}).setOrigin(.5).setDepth(50);
    this.stageText=this.add.text(128,73,'',{fontFamily:'monospace',fontSize:'6px',color:'#75e4db'}).setOrigin(.5).setDepth(50);
    STATIONS.forEach((s,i)=>{
      const desk=libraryStationArt(this,i,s.x,s.y);
      if(desk)desk.setDepth(12).setName(`library-desk-${i}`);
      else this.add.rectangle(s.x,s.y,47,22,0x5d392c).setStrokeStyle(2,0xad8c5d).setDepth(12);
      this.marks.push(this.add.text(s.x,s.y-18,'',{fontFamily:'Arial',fontSize:'6px',color:'#81e9c9',backgroundColor:'#192630'}).setOrigin(.5).setDepth(50));
      this.solids.push(new Phaser.Geom.Rectangle(s.x-23,s.y-11,46,22));
    });
    // DANN-E's misfiled stacks close cross-aisles until each research check is filed.
    this.barriers.push(addMisfiledStack(this,128,104,28,20));
    this.barriers.push(addMisfiledStack(this,193,134,54,8));
    this.add.text(128,126,'DANN-E: "SKIP THE SOURCES!"',{fontFamily:'Arial',fontSize:'6px',color:'#ffbd99'}).setOrigin(.5).setDepth(50);
    this.add.text(128,197,'SOUTH: RETURN OUTSIDE',{fontFamily:'monospace',fontSize:'6px',color:'#ffe0a3'}).setOrigin(.5).setDepth(50);
    this.add.rectangle(128,215,30,12,0x71aa7f).setDepth(45);
    this.add.text(224,60,'SOURCES',{fontFamily:'monospace',fontSize:'6px',color:'#ffe0a3',backgroundColor:'#17232d'})
      .setOrigin(.5,.5).setPadding(5).setDepth(350).setInteractive({useHandCursor:true})
      .on('pointerdown',()=>window.open(`assets/research-world/library-research.html#${id}`,'_blank','noopener,noreferrer'));
    if(nscDungeon(id))this.add.text(128,88,'NSC WING ↑',{fontFamily:'Arial',fontSize:'7px',color:'#b9eee5',backgroundColor:'#17232d'}).setOrigin(.5).setDepth(50);
    this.player=new Player(this,128,183);
    this.dialog=new DialogBox(this,{aboveTouchControls:true});
    this.choice=new ChoicePrompt(this,{settleMs:160});
    this.inventory=new InventoryOverlay(this);
    this.prompt=this.add.text(128,184,'',{fontFamily:'monospace',fontSize:'6px',color:'#fff4c9',backgroundColor:'#17232d'}).setOrigin(.5).setDepth(350);
    retroAudio.startMusic('ArchiveScene');this.refresh();swallowNextInputFrame();
    setLatestMessage(`${this.assignment.title}. Status: ${this.assignment.status}. ${this.assignment.task}`);
    if (!gameState.sceneProgress[`libraryBriefed_${id}`]) {
      gameState.sceneProgress[`libraryBriefed_${id}`]=1;
      this.dialog.show('RESEARCH ASSIGNMENT',[
        this.assignment.title,
        `Official list: ${this.assignment.status}. Checked ${LIBRARY_STATUS_CHECKED}.`,
        this.assignment.task,
        this.assignment.backgroundOnly ? 'Background assignment: no matching Kennedy/Johnson production volume is listed. Keep these earlier leads outside the later manuscript date range.' : 'This dungeon is a game research exercise based on the listed volume, not a claim about specific archival files or unreleased contents.',
        'Find the aid, compare records, write a source note, then file the packet. The south exit stays open.',
        ...(nscDungeon(id)?['The north-center NSC WING leads to three extra chambers based on actual online holdings. Your FRUS assignment stays separate.']:[])
      ],()=>saveGameNow());
    }
    saveGameNow();
  }
  update(_:number,delta:number) {
    tickInput();const input=getInput();if(this.leaving)return;
    if(this.dialog.active){this.player.update(delta,false);this.prompt.setVisible(false);if(input.aJustPressed||input.bJustPressed)this.dialog.advance();return;}
    if(this.choice.active){this.player.update(delta,false);this.prompt.setVisible(false);this.choice.updateInput();return;}
    if(handleOpenOverlays(this.inventory)){this.player.update(delta,false);this.prompt.setVisible(false);return;}
    if(input.menuJustPressed||input.pauseJustPressed){this.inventory.toggle();return;}
    if(input.fullscreenJustPressed)this.scale.toggleFullscreen();
    const stage=libraryStage(gameState.sceneProgress,this.assignment.library);
    const gates = [new Phaser.Geom.Rectangle(114,94,28,20),new Phaser.Geom.Rectangle(166,130,54,8)].filter((_,i)=>stage<i+1);
    this.player.update(delta,true,{bounds:{left:19,right:237,top:82,bottom:218},solids:[...this.solids,...gates]});
    const p=this.player.position;
    if(p.y>=212&&p.x>=111&&p.x<=145&&(input.dir.y>0||input.aJustPressed)){this.exit();return;}
    if(nscDungeon(this.assignment.library)&&Math.hypot(p.x-128,p.y-86)<18){
      this.prompt.setVisible(true).setText('ENTER NSC WING');setNearestInteractable('NSC research wing');
      if(input.aJustPressed){this.leaving=true;saveGameNow();transitionTo(this,'NscLibraryScene');}return;
    }
    const nearest=STATIONS.map((s,i)=>({s,i,d:Math.hypot(p.x-s.x,p.y-(s.y+23))})).filter(o=>o.d<25).sort((a,b)=>a.d-b.d)[0];
    this.prompt.setVisible(Boolean(nearest)).setText(nearest?(nearest.i<stage?'SAVED — REVIEW':nearest.i>stage?`FIRST: ${STATIONS[stage].name}`:nearest.s.name):'');setNearestInteractable(nearest?.s.name??null);
    if(nearest&&input.aJustPressed)this.research(nearest.i);
  }
  private refresh() {
    const stage=libraryStage(gameState.sceneProgress,this.assignment.library);
    this.stageText.setText(`${this.assignment.backgroundOnly?'BACKGROUND':'RESEARCH'} PACKET ${stage}/4`);
    this.marks.forEach((m,i)=>m.setText(`${STATIONS[i].label} · ${i<stage?'FILED':i===stage?'NEXT':'LOCKED'}`)
      .setColor(i===stage?'#fff3bf':i<stage?'#a7bfb4':'#a5afbd')
      .setBackgroundColor(i===stage?'#49371d':'#192630'));
    this.barriers.forEach((b,i)=>b.setVisible(stage<i+1));
    setObjective(stage===4?'PACKET FILED':STATIONS[stage].label);
  }
  private research(station:number) {
    const a=this.assignment,stage=libraryStage(gameState.sceneProgress,a.library);
    if(station<stage){this.dialog.show('FILED',`This step is saved. ${stage===4?'Your packet is complete. Return south.':`Next: ${STATIONS[stage].name}.`}`);return;}
    if(station!==stage){this.dialog.show('RESEARCH ORDER',`First complete ${STATIONS[stage].name}. DANN-E cannot replace a source trail with a shortcut.`);return;}
    const questions=[
      {q:a.task, good:`Log the finding-aid lead, dates, access limits, and request trail.`,bad:'Treat the catalog title as a retrieved document.'},
      {q:a.comparison,good:`Keep ${a.selection}.`,bad:'Use DANN-E’s summary and discard conflicting evidence.'},
      {q:'How should the source note document this research?',good:'Record repository, collection, box/folder, document date and access limits; leave unknowns unresolved.',bad:'Invent a plausible box and folder to finish quickly.'},
      {q:`Official stage: ${a.status}. What can this packet establish?`,good:a.backgroundOnly?'Background leads only; preserve the later volume date boundary.':a.status.startsWith('Planned')?'A planning source survey; manuscript research is not claimed complete.':a.status.startsWith('Being Cleared')?'A clearance follow-up packet, not permission to publish.':'A research packet for human review, not a cleared manuscript.',bad:'The entire FRUS volume is cleared and ready to publish.'}
    ];
    const task=questions[station];const goodKey=station%2?'B':'A';
    this.choice.show(task.q,[{key:'A',label:goodKey==='A'?task.good:task.bad,value:goodKey==='A'?'correct':'wrong'},{key:'B',label:goodKey==='B'?task.good:task.bad,value:goodKey==='B'?'correct':'wrong'}],option=>{
      if(!fileLibraryStage(gameState.sceneProgress,a.library,station,option.value==='correct')){this.dialog.show('CHECK THE RECORD','That shortcut loses the source trail or overstates the evidence. Return to this station and try again.');return;}
      const complete=libraryStage(gameState.sceneProgress,a.library)===4;
      if(complete)addDocumentPoints(8,`${a.library}: research packet filed for ${a.title}`);
      this.refresh();saveGameNow();retroAudio.confirm();
      this.dialog.show(complete?'PACKET FILED':'SOURCE CHECK FILED',complete?'Research packet saved. This is progress toward the volume, not publication clearance. Return outside through the south door.':'The research trail is saved. Continue to the next numbered station.');
    },6,()=>{});
  }
  private exit() {
    this.leaving=true;const landmark=RESEARCH_LANDMARKS.find(l=>l.id===this.assignment.library)!;
    gameState.sceneProgress.researchWorldZone=landmark.zone;
    gameState.sceneProgress.libraryReturnX=landmark.x;gameState.sceneProgress.libraryReturnY=landmark.y+28;
    saveGameNow();transitionTo(this,'ResearchWorldScene');
  }
}
