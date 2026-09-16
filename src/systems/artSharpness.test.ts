import { describe, expect, it, vi } from "vitest";
import type Phaser from "phaser";

vi.mock("phaser", () => ({ default: {
  WEBGL: 2,
  Core: { Events: { PRE_RENDER: "prerender", DESTROY: "destroy" } },
  Renderer: { WebGL: { Pipelines: { PostFXPipeline: class {} } } }
} }));

import { ART_SHARPNESS, installArtSharpness } from "./artSharpness";

function harness(type = 2) {
  const callbacks = new Map<string, () => void>();
  const camera = { setPostPipeline: vi.fn() };
  const game = {
    renderer: { type, pipelines: { addPostPipeline: vi.fn() } },
    scene: { scenes: [{ sys: { isActive: () => true }, cameras: { cameras: [camera] } }] },
    events: {
      on: vi.fn((event: string, cb: () => void) => callbacks.set(event, cb)),
      once: vi.fn((event: string, cb: () => void) => callbacks.set(event, cb)),
      off: vi.fn()
    }
  };
  return { game, camera, callbacks, install: () => installArtSharpness(game as unknown as Phaser.Game) };
}

describe("subtle global art sharpening", () => {
  it("uses ten-percent detail strength", () => expect(ART_SHARPNESS).toBe(0.1));

  it("attaches once per camera and includes cameras created on later scenes", () => {
    const h = harness();
    h.install(); h.install();
    h.callbacks.get("prerender")!(); h.callbacks.get("prerender")!();
    expect(h.camera.setPostPipeline).toHaveBeenCalledTimes(1);
    expect(h.game.renderer.pipelines.addPostPipeline).toHaveBeenCalledTimes(1);
    const next = { setPostPipeline: vi.fn() };
    h.game.scene.scenes[0].cameras.cameras.push(next);
    h.callbacks.get("prerender")!();
    expect(next.setPostPipeline).toHaveBeenCalledTimes(1);
    h.callbacks.get("destroy")!();
    expect(h.game.events.off).toHaveBeenCalledWith("prerender", expect.any(Function));
  });

  it("leaves Canvas fallback rendering intact", () => {
    const h = harness(1); h.install();
    expect(h.game.events.on).not.toHaveBeenCalled();
  });
});
