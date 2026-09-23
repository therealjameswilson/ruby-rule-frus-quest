import Phaser from "phaser";
import { AlexPosterEncounter, ALEX_KARATE_DAMAGE } from "../game/alexPosterEncounter";
import type { Player } from "../entities/Player";
import { adjustReliability } from "./reliability";
export const ALEX_TEXTURE = "alex-poster-eric-roberts-inspired";
export const ALEX_ART_PATH = "assets/characters/alex-poster/eric-roberts-inspired.png";

export class AlexPoster {
  readonly encounter = new AlexPosterEncounter();
  readonly sprite: Phaser.GameObjects.Image;
  private readonly speech: Phaser.GameObjects.Text;
  private readonly attackLine: Phaser.GameObjects.Graphics;
  private from = { x: 158, y: 143 };
  private target = { x: 158, y: 143 };
  private hit = false;
  constructor(private scene: Phaser.Scene) {
    this.sprite = scene.add.image(158, 143, ALEX_TEXTURE).setDisplaySize(44, 48).setOrigin(0.5, 0.8).setDepth(155).setName("alex-poster");
    this.speech = scene.add.text(128, 68, "", { fontFamily: "monospace", fontSize: "6px", color: "#fff0cf", backgroundColor: "#251d35", align: "center" }).setOrigin(0.5, 0).setPadding(3).setDepth(180).setName("alex-film-question");
    this.attackLine = scene.add.graphics().setDepth(153);
    this.refresh();
  }
  answer() { this.encounter.answer(); this.sprite.clearTint().setAngle(0); this.attackLine.clear(); this.refresh(); }
  update(delta: number, player: Player) {
    if (document.hidden) return;
    const previous = this.encounter.phase;
    this.encounter.update(delta);
    const phase = this.encounter.phase;
    if (phase === "windup" && previous !== phase) {
      this.from = { x: this.sprite.x, y: this.sprite.y };
      const dx = player.position.x - this.from.x, dy = player.position.y - this.from.y;
      const length = Math.hypot(dx, dy) || 1;
      const travel = Math.min(105, length);
      this.target = { x: Phaser.Math.Clamp(this.from.x + dx / length * travel, 26, 230), y: Phaser.Math.Clamp(this.from.y + dy / length * travel, 113, 190) };
      this.sprite.setTint(0xffb64b);
      this.attackLine.lineStyle(3, 0xffaa44, 0.7).lineBetween(this.from.x, this.from.y, this.target.x, this.target.y);
      this.hit = false;
    }
    if (phase === "attack") {
      const t = this.encounter.elapsed / 350;
      this.sprite.setPosition(Math.round(Phaser.Math.Linear(this.from.x, this.target.x, t)), Math.round(Phaser.Math.Linear(this.from.y, this.target.y, t))).setAngle(this.target.x < this.from.x ? -20 : 20);
      this.attackLine.clear().lineStyle(5, 0xffe7aa, 0.9).lineBetween(this.sprite.x, this.sprite.y - 5, this.sprite.x + (this.target.x < this.from.x ? -17 : 17), this.sprite.y - 10);
      if (!this.hit && Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.position.x, player.position.y) < 23 && player.takeHit(this.from, 10, 800)) {
        this.hit = true;
        adjustReliability(-ALEX_KARATE_DAMAGE, "Alex Poster: unanswered movie question, karate strike");
      }
    } else if (phase === "recovery") { this.sprite.clearTint().setAngle(0); this.attackLine.clear(); }
    this.sprite.setFlipX(player.position.x > this.sprite.x);
    this.refresh();
  }
  private refresh() {
    const e = this.encounter;
    this.speech.setText(e.phase === "asking" ? `Have you seen\n${e.film}?\nA: ANSWER  (${e.remainingSeconds}s)` : e.phase === "windup" ? "No answer? KARATE!\nDODGE THE GOLD LINE!" : e.phase === "attack" ? "HI-YAH!" : "So... about those movies...");
  }
  destroy() { this.sprite.destroy(); this.speech.destroy(); this.attackLine.destroy(); }
}
