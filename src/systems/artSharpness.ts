import { RENDER_DENSITY } from "./renderDensity";
import Phaser from "phaser";

export const ART_SHARPNESS = 0.10;
const PIPELINE_KEY = "frus-art-sharpness";

// A five-tap unsharp mask at native render resolution. Matching-alpha samples
// prevent dark fringes around transparent sprites and overlay scenes.
export const ART_SHARPNESS_SHADER = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec2 uTexel;
uniform float uStrength;
varying vec2 outTexCoord;

vec3 neighbor(vec2 offset, vec4 center) {
  vec4 sampleColor = texture2D(uMainSampler, outTexCoord + offset);
  return abs(sampleColor.a - center.a) < 0.01 ? sampleColor.rgb : center.rgb;
}

void main() {
  vec4 center = texture2D(uMainSampler, outTexCoord);
  vec3 average = (
    neighbor(vec2(uTexel.x, 0.0), center) +
    neighbor(vec2(-uTexel.x, 0.0), center) +
    neighbor(vec2(0.0, uTexel.y), center) +
    neighbor(vec2(0.0, -uTexel.y), center)
  ) * 0.25;
  vec3 detail = clamp((center.rgb - average) * uStrength,
    vec3(-0.03), vec3(0.03));
  gl_FragColor = vec4(clamp(center.rgb + detail, vec3(0.0), vec3(center.a)), center.a);
}
`;

class ArtSharpnessPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game: Phaser.Game) {
    super({ game, renderTarget: true, fragShader: ART_SHARPNESS_SHADER });
  }

  onDraw(target: Phaser.Renderer.WebGL.RenderTarget) {
    this.set2f("uTexel", 1 / target.width, 1 / target.height);
    this.set1f("uStrength", ART_SHARPNESS);
    this.bindAndDraw(target);
  }
}

const installed = new WeakSet<Phaser.Game>();

export function installArtSharpness(game: Phaser.Game) {
  // Dense source art no longer needs a full-screen unsharp pass on every scene.
  // Keeping it on both world and UI cameras costs substantial fill-rate.
  if (RENDER_DENSITY > 1 || installed.has(game) || game.renderer.type !== Phaser.WEBGL) return;
  installed.add(game);
  const renderer = game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
  renderer.pipelines.addPostPipeline(PIPELINE_KEY, ArtSharpnessPipeline);
  const cameras = new WeakSet<Phaser.Cameras.Scene2D.Camera>();
  const attach = () => {
    for (const scene of game.scene.scenes) {
      if (!scene.sys.isActive()) continue;
      for (const camera of scene.cameras.cameras) {
        if (cameras.has(camera)) continue;
        camera.setPostPipeline(PIPELINE_KEY);
        cameras.add(camera);
      }
    }
  };
  game.events.on(Phaser.Core.Events.PRE_RENDER, attach);
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    game.events.off(Phaser.Core.Events.PRE_RENDER, attach);
    installed.delete(game);
  });
}
