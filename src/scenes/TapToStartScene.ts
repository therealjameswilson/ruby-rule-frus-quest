import { getCharacterKeyForProcessRole, heroCharacterKey } from '../art/characters';
import { characterAnimKey } from '../art/character_anims';
import { VOLUME_ASSEMBLY_ASSETS } from '../systems/volumeAssembly';
import { startWithPlayerArt } from "../systems/playerArtLoading";
import Phaser from "phaser";
import { PALETTE, PROCESS_STAMPS } from "../game/constants";
import { setSceneState, setVisibleEntities } from "../game/state";
import { resumeLabel } from "../game/resumeLabel";
import { addInputGestureListener, bindPointerPress, getInput, getPrimaryActionBadge, isTouchInputCapable, swallowNextInputFrame, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { clearSavedGame, getSavedGameSummary, readSavedGame, loadSavedGame } from "../systems/save";

export class TapToStartScene extends Phaser.Scene {
  private started = false;
  private removeGestureListener?: () => void;
  private hasSave = false;
  private selectedAction: "continue" | "new" = "continue";
  private continueText?: Phaser.GameObjects.Text;
  private newGameText?: Phaser.GameObjects.Text;
  private confirmingNew = false;
  private heading?: Phaser.GameObjects.Text;
  private detail?: Phaser.GameObjects.Text;
  private detailLabel?: Phaser.GameObjects.Text;
  private buttonFrames:Phaser.GameObjects.Rectangle[]=[];
  private savedObjective='';

  constructor() {
    super("TapToStartScene");
  }

  create() {
    this.started = false;
    this.confirmingNew = false;
    this.selectedAction = "continue";
    setSceneState("TapToStartScene", "title", "Tap or press start to unlock audio.");
    const saveSummary = getSavedGameSummary();
    this.hasSave = Boolean(saveSummary);
    this.buttonFrames=[];
    this.cameras.main.setBackgroundColor('#102128');
    this.add.rectangle(128,120,256,240,0x102128);
    this.add.rectangle(128,20,256,40,0x243c40);
    this.add.text(20,12,'RUBY RULE',{fontFamily:'Arial',fontSize:'17px',fontStyle:'bold',color:'#edd498'}).setName('resume-brand');
    this.add.text(21,32,'THE FRUS QUEST',{fontFamily:'Arial',fontSize:'7px',color:'#abc3be',letterSpacing:2});
    this.add.rectangle(128,89,216,86,0x20363a).setStrokeStyle(1,0x728980);
    this.add.rectangle(49,91,46,70,0x10272c).setStrokeStyle(1,0x48665f);
    const saved=readSavedGame(),profile=saved?.state.playerProfile;
    const key=heroCharacterKey(getCharacterKeyForProcessRole(profile?.roleId??'compiler',saved?.state.ngPlusActive??false,profile?.compilerAppearance??'compiler'));
    if(this.textures.exists(key)){
      this.add.ellipse(49,120,27,5,0x081315,.7);
      this.add.sprite(49,121,key).setOrigin(.5,1).setDisplaySize(40,60).play(characterAnimKey(key,'idle-down')).setName('resume-compiler');
    }
    this.heading=this.add.text(80,54,this.hasSave?'YOUR SAVED QUEST':'YOUR NEXT CHAPTER',{
      fontFamily:'Arial',fontSize:'8px',fontStyle:'bold',color:'#ebd092'
    }).setName('resume-heading');
    this.add.text(80,68,saveSummary?.displayName??'FRUS compiler',{fontFamily:'Arial',fontSize:'13px',fontStyle:'bold',color:'#f3edde'}).setName('resume-name');
    const place=saveSummary?resumeLabel(saveSummary.currentScene,saveSummary.documentPoints).split('  |  ')[0]:'COMPILE A FRUS VOLUME';
    const location=this.add.text(80,87,place,{fontFamily:'Arial',fontSize:'9px',color:'#b7d4ca',wordWrap:{width:148}}).setName('resume-location');
    if(location.height>24)location.setFontSize(8);
    this.add.text(80,113,saveSummary?`${saveSummary.processStamps.length} / ${PROCESS_STAMPS.length} CHECKPOINTS`:'RESEARCH · SELECT · PUBLISH',{fontFamily:'Arial',fontSize:'8px',color:'#ded3b9'}).setName('resume-progress');
    this.savedObjective=saveSummary?.objective??'Start an archival adventure. Build a documented record, one decision at a time.';
    this.add.rectangle(128,201,216,48,0x172c32).setStrokeStyle(1,0x48655f);
    this.detailLabel=this.add.text(28,181,this.hasSave?'PICK UP WHERE YOU LEFT OFF':'YOUR MISSION',{fontFamily:'Arial',fontSize:'7px',fontStyle:'bold',color:'#edcf8c'});
    this.detail=this.add.text(28,193,this.savedObjective,{fontFamily:'Arial',fontSize:'9px',color:'#e4e9df',wordWrap:{width:174},lineSpacing:2}).setName('resume-objective');
    if(this.detail.height>29)this.detail.setFontSize(8);
    if(this.textures.exists(VOLUME_ASSEMBLY_ASSETS.completedHero.key))this.add.image(219,204,VOLUME_ASSEMBLY_ASSETS.completedHero.key).setDisplaySize(23,23).setName('resume-volume');
    setVisibleEntities([saveSummary?.displayName??'FRUS compiler',place,this.savedObjective,...(this.hasSave?['Continue saved quest','New game requires confirmation']:['Press Start'])]);
    if(this.hasSave)this.createSaveChoice();
    else this.add.text(128,154,'PRESS START',{fontFamily:'Arial',fontSize:'12px',fontStyle:'bold',color:'#edcf8c'}).setOrigin(.5);
    this.removeGestureListener = addInputGestureListener(() => {
      if (!this.hasSave) void this.startTitle();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.removeGestureListener?.());
  }

  update() {
    tickInput();
    const input = getInput();
    if(input.fullscreenJustPressed)this.scale.toggleFullscreen();
    if (this.hasSave) {
      if (input.navLeftJustPressed || input.navRightJustPressed || input.navUpJustPressed || input.navDownJustPressed) {
        this.selectedAction = this.selectedAction === "continue" ? "new" : "continue";
        this.renderChoice();
      }
      if (input.bJustPressed) {
        this.confirmingNew = false;
        this.selectedAction = "continue";
        this.renderChoice();
        return;
      }
      // Save actions have explicit pointer targets; background taps must not
      // activate a keyboard-selected destructive choice.
      if (input.aJustPressed || input.startJustPressed) void this.confirmSaveChoice();
      return;
    }
    if (input.aJustPressed || input.startJustPressed || input.pointerPrimaryJustPressed) void this.startTitle();
  }

  private async startTitle() {
    if (this.started) return;
    this.started = true;
    this.removeGestureListener?.();
    await retroAudio.unlock();
    this.cameras.main.fadeOut(120, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("TitleScene");
    });
  }

  private createSaveChoice() {
    const continueHit = this.add.rectangle(86,154,78,32,0xcdb679).setStrokeStyle(1,0xf5dfaa).setName("resume-continue-button");
    const newHit = this.add.rectangle(170,154,78,32,0x243b3f).setStrokeStyle(1,0x728980).setName("resume-new-button");
    this.buttonFrames=[continueHit,newHit];
    bindPointerPress(continueHit, {
      down: () => {
        this.selectedAction = "continue";
        void this.confirmSaveChoice();
      }
    });
    bindPointerPress(newHit, {
      down: () => {
        this.selectedAction = "new";
        void this.confirmSaveChoice();
      }
    });
    this.continueText = this.add.text(86, 154, "CONTINUE", {
      fontFamily: "Arial",
      fontSize: "10px",
      fontStyle:"bold",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);
    this.newGameText = this.add.text(170, 154, "NEW GAME", {
      fontFamily: "Arial",
      fontSize: "10px",
      fontStyle:"bold",
      color: PALETTE.creamPaper
    }).setOrigin(0.5);
    this.add.text(128, 233, isTouchInputCapable() ? "TAP A BUTTON TO BEGIN" : `LEFT/RIGHT SELECT  ${getPrimaryActionBadge()}`, {
      fontFamily: "Arial",
      fontSize: "8px",
      color: "#abc3be"
    }).setOrigin(0.5);
    this.renderChoice();
  }

  private renderChoice() {
    setVisibleEntities(this.confirmingNew
      ? ['Replace this quest?', 'Keep Save', 'Replace', 'Replacing clears this saved run.', `Selected: ${this.selectedAction === 'continue' ? 'Keep Save' : 'Replace'}`]
      : [this.savedObjective, 'Continue saved quest', 'New game requires confirmation', `Selected: ${this.selectedAction === 'continue' ? 'Continue' : 'New Game'}`]);
    this.heading?.setText(this.confirmingNew?'REPLACE THIS QUEST?':'YOUR SAVED QUEST');
    this.continueText?.setText(this.confirmingNew?'KEEP SAVE':'CONTINUE');
    this.newGameText?.setText(this.confirmingNew?'REPLACE':'NEW GAME');
    this.detailLabel?.setText(this.confirmingNew?'THIS REPLACES YOUR SAVED PROGRESS':'PICK UP WHERE YOU LEFT OFF');
    this.detail?.setText(this.confirmingNew?'Keep your save to return. Replace starts a new compiler and clears this run.':this.savedObjective);
    this.buttonFrames.forEach((frame,i)=>frame.setFillStyle((i===0)===(this.selectedAction==='continue')?0xcdb679:0x243b3f).setStrokeStyle(1,(i===0)===(this.selectedAction==='continue')?0xf5dfaa:0x728980));
    this.continueText?.setColor(this.selectedAction==='continue'?'#18282b':'#e4e9df');
    this.newGameText?.setColor(this.selectedAction==='new'?'#18282b':'#e4e9df');
  }

  private async confirmSaveChoice() {
    if (this.started) return;
    if (this.selectedAction === "new" && !this.confirmingNew) {
      this.confirmingNew = true;
      this.selectedAction = "continue";
      this.renderChoice();
      swallowNextInputFrame();
      return;
    }
    if (this.confirmingNew && this.selectedAction === "continue") {
      this.confirmingNew = false;
      this.renderChoice();
      swallowNextInputFrame();
      return;
    }
    this.started = true;
    this.removeGestureListener?.();
    await retroAudio.unlock();
    if (this.selectedAction === "new") {
      clearSavedGame();
      this.cameras.main.fadeOut(120, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start("TitleScene");
      });
      return;
    }
    const sceneKey = loadSavedGame();
    this.cameras.main.fadeOut(120, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      startWithPlayerArt(this, sceneKey ?? "TitleScene");
    });
  }
}
