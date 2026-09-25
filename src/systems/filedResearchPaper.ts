import type Phaser from 'phaser';

/** A permanent, readable paper receipt on the desk; no flashing success overlay. */
export function filedResearchPaper(scene: Phaser.Scene, x: number, y: number) {
  const shadow = scene.add.rectangle(1, 1.5, 25, 16, 0x14191b, .35);
  const paper = scene.add.rectangle(0, 0, 25, 16, 0xf2e7c9).setStrokeStyle(.4, 0xb2a17c);
  const rules = scene.add.graphics();
  rules.lineStyle(.4, 0x9d987d, .75);
  for (const yy of [-5, -3]) rules.lineBetween(-9, yy, 7, yy);
  const stamp = scene.add.rectangle(0, 2.5, 21, 8).setStrokeStyle(.6, 0x286656);
  const text = scene.add.text(0, 2.5, 'FILED', {fontFamily:'Arial',fontStyle:'bold',fontSize:'6px',color:'#286656'}).setOrigin(.5);
  return scene.add.container(x, y, [shadow, paper, rules, stamp, text])
    .setAngle(-7).setDepth(46).setName('filed-research-paper').setVisible(false);
}
