import { registerDanneAnims } from '../art/danne_anims';
import Phaser from 'phaser';
import { preloadAttackPoses } from '../art/attackPoses';
import { selectedAttackSheet, preloadCombatEffects, gameplayArtReady } from '../systems/playerArtLoading';
import { getInput, tickInput, swallowNextInputFrame } from '../input/InputState';

/** A recoverable loading boundary. Never changes the saved campaign location. */
export class PlayerArtLoadScene extends Phaser.Scene {
  private destination!: {target: string; data?: object};
  private failed = false;
  private retrying = false;
  constructor() { super('PlayerArtLoadScene'); }
  init(destination: {target: string; data?: object}) {
    this.destination = destination;
    this.failed = false;
    this.retrying = false;
  }
  preload() {
    const ui = this.scene.get('UIScene');
    const hudWasVisible = ui.sys.settings.visible;
    ui.sys.settings.visible = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { ui.sys.settings.visible = hudWasVisible; });
    this.cameras.main.setBackgroundColor('#101925');
    this.add.rectangle(128, 120, 256, 240, 0x101925).setDepth(30000);
    this.add.text(128, 96, 'PREPARING YOUR COMPILER', {
      fontFamily:'monospace', fontSize:'8px', color:'#f5efdd'
    }).setOrigin(.5).setDepth(30001);
    const status = this.add.text(128, 120, 'Loading combat artwork…', {
      fontFamily:'monospace', fontSize:'7px', color:'#aebac5', align:'center', wordWrap:{width:210}
    }).setOrigin(.5).setDepth(30001);
    const progress = (value: number) => { if (!this.failed) status.setText(`Loading combat artwork… ${Math.round(value * 100)}%`); };
    const error = () => { this.failed = true; status.setText('Artwork could not load.\nCheck your connection.'); };
    this.load.on('progress', progress);
    this.load.on('loaderror', error);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.load.off('progress', progress); this.load.off('loaderror', error);
    });
    const sheet = selectedAttackSheet();
    if (sheet) preloadAttackPoses(this, [sheet]);
    preloadCombatEffects(this);
  }
  create() {
    if (!this.failed && gameplayArtReady(this)) {
      registerDanneAnims(this);
      this.scene.start(this.destination.target, this.destination.data);
      return;
    }
    this.failed = true;
    this.add.rectangle(128, 159, 140, 32, 0x273544).setStrokeStyle(1, 0xd4b66d)
      .setDepth(30001).setInteractive().on('pointerup', () => this.retry());
    this.add.text(128, 159, 'A / ENTER: TRY AGAIN', {
      fontFamily:'monospace', fontSize:'7px', color:'#f5efdd'
    }).setOrigin(.5).setDepth(30002);
  }
  update() {
    tickInput();
    const input = getInput();
    if (this.failed && (input.aJustPressed || input.startJustPressed)) this.retry();
  }
  private retry() {
    if (this.retrying) return;
    this.retrying = true;
    swallowNextInputFrame();
    this.scene.restart(this.destination);
  }
}
