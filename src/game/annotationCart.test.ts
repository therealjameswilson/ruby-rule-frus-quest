import { describe, expect, it } from "vitest";
import { ANNOTATION_CART, AnnotationCartPushHold, annotationCartContactPush, annotationCartBounds, pushAnnotationCart, readAnnotationCart } from "./annotationCart";
import { buildAnnotationStackLayers, annotationStacksObjective } from "./annotationStacks";
import { archiveA1CollisionRect } from "./archiveA1Tilemap";
import { workstationFeetBlocked, safeWorkstationPosition } from "./workstationGeometry";
import { createGameSaveData, gameState, resetGameState, restoreGameSaveData } from "./state";

describe("Annotation Stacks return cart", () => {
  it("requires cardinal pressure against the cart, not proximity or passing beside it", () => {
    expect(annotationCartContactPush({}, { x: 128, y: 170 }, { x: 0, y: -1 })).toBe(true);
    expect(annotationCartContactPush({}, { x: 128, y: 169 }, { x: 0, y: -1 })).toBe(true);
    expect(annotationCartContactPush({}, { x: 118, y: 169 }, { x: 0, y: -1 })).toBe(true);
    expect(pushAnnotationCart({}, { x: 118, y: 169 }, { x: 0, y: -1 }))
      .toMatchObject({ moved: true, position: { x: 128, y: 144 } });
    expect(annotationCartContactPush({}, { x: 128, y: 168 }, { x: 0, y: -1 })).toBe(false);
    expect(annotationCartContactPush({}, { x: 110, y: 160 }, { x: 1, y: 0 })).toBe(false);
    expect(annotationCartContactPush({}, { x: 113, y: 160 }, { x: 1, y: 0 })).toBe(true);
    for (const dir of [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: 1, y: -1 }]) {
      expect(annotationCartContactPush({}, { x: 128, y: 170 }, dir)).toBe(false);
    }
    expect(annotationCartContactPush({}, { x: 128, y: 185 }, { x: 0, y: -1 })).toBe(false);
    expect(annotationCartContactPush({}, { x: 146, y: 160 }, { x: -1, y: 0 })).toBe(false);
    expect(annotationCartContactPush({ annotationCartParked: 1 }, { x: 144, y: 122 }, { x: 0, y: -1 })).toBe(false);
  });

  it("parks from the live 12-pixel feet contact after pushing north", () => {
    const progress = { annotationCartX: 128, annotationCartY: 112 };
    const player = { x: 113, y: 111 }, right = { x: 1, y: 0 };
    expect(annotationCartContactPush(progress, player, right)).toBe(true);
    expect(pushAnnotationCart(progress, player, right)).toMatchObject({ moved: true, parked: true, position: ANNOTATION_CART.bay });
    expect(annotationCartContactPush(progress, { x: 114, y: 111 }, right)).toBe(false);
    expect(annotationCartContactPush(progress, player, { x: -1, y: 0 })).toBe(false);
  });

  it("requires a fresh deliberate hold after release, direction change or pause", () => {
    const hold = new AnnotationCartPushHold(), up = { x: 0, y: -1 };
    for (let i = 0; i < 4; i++) expect(hold.update(50, true, up)).toBe(false);
    expect(hold.update(50, true, up)).toBe(true);
    expect(hold.update(50, true, up)).toBe(false);
    hold.reset();
    expect(hold.update(5000, true, up)).toBe(false);
    for (let i = 0; i < 3; i++) hold.update(50, true, up);
    expect(hold.update(50, true, { x: 1, y: 0 })).toBe(false);
    hold.update(0, false, up);
    expect(hold.update(50, true, up)).toBe(false);
  });

  it("exposes an integer pressure cue only during an unfinished hold", () => {
    const hold = new AnnotationCartPushHold(), up = { x: 0, y: -1 };
    expect(hold.pressurePixels).toBe(0);
    hold.update(50, true, up);
    expect(hold.pressurePixels).toBe(3);
    for (let i = 0; i < 4; i++) hold.update(50, true, up);
    expect(hold.pressurePixels).toBe(0);
    hold.update(50, true, up);
    hold.update(10, false, up);
    expect(hold.pressurePixels).toBe(0);
  });
  it("requires physical pushes, not tool ownership or proximity", () => {
    expect(readAnnotationCart({})).toEqual({ position: ANNOTATION_CART.start, parked: false });
    expect(pushAnnotationCart({}, { x: 128, y: 192 }).moved).toBe(false);
    expect(pushAnnotationCart({}, { x: 128, y: 160 }).moved).toBe(false);
    expect(pushAnnotationCart({}, { x: 128, y: 178 }))
      .toMatchObject({ moved: true, parked: false, position: { x: 128, y: 144 } });
    expect(pushAnnotationCart({}, { x: 128, y: 169 }))
      .toMatchObject({ moved: true, position: { x: 128, y: 144 } });
    expect(pushAnnotationCart({}, { x: 108, y: 160 }))
      .toMatchObject({ moved: true, position: { x: 144, y: 160 } });
  });

  it("never traps the cart: every valid position has an accessible path to the bay", () => {
    const shelves = buildAnnotationStackLayers().collisionCells.map(archiveA1CollisionRect);
    for (const x of [128, 144]) for (const y of [112, 128, 144, 160]) {
      const progress: Record<string, number> = { annotationCartX: x, annotationCartY: y };
      for (let move = 0; move < 5; move++) {
        const cart = readAnnotationCart(progress);
        if (cart.parked) break;
        const player = cart.position.y > 112 ? { x: cart.position.x, y: cart.position.y + 18 }
          : { x: cart.position.x - 20, y: cart.position.y };
        expect(workstationFeetBlocked(player, [...shelves, annotationCartBounds(cart.position)])).toBe(false);
        const result = pushAnnotationCart(progress, player);
        expect(result.moved).toBe(true);
        Object.assign(progress, { annotationCartX: result.position.x, annotationCartY: result.position.y,
          annotationCartParked: result.parked ? 1 : 0 });
      }
      expect(readAnnotationCart(progress)).toEqual({ position: ANNOTATION_CART.bay, parked: true });
      expect(progress.annotationGatheredMask).toBeUndefined();
      expect(progress.annotationDraftingComplete).toBeUndefined();
    }
  });

  it("rejects off-lane pushes without consuming anything", () => {
    expect(pushAnnotationCart({}, { x: 148, y: 160 })).toMatchObject({ moved: false, position: ANNOTATION_CART.start });
    expect(pushAnnotationCart({}, { x: 128, y: 142 })).toMatchObject({ moved: false, position: ANNOTATION_CART.start });
    expect(annotationStacksObjective({})).toBe("PARK CONTEXT CART");
  });

  it("preserves previously earned context notes and completed packets", () => {
    const saves: Record<string, number>[] = [{ annotationGatheredMask: 2 }, { annotationDraftingCarried: 2 },
      { annotationDraftingStep: 2 }, { annotationDraftingComplete: 1 }];
    for (const progress of saves) {
      expect(readAnnotationCart(progress).parked).toBe(true);
      expect(pushAnnotationCart(progress, { x: 144, y: 132 }).moved).toBe(false);
    }
    expect(readAnnotationCart({ annotationGatheredMask: 4 }).parked).toBe(false);
  });

  it("restores partial cart movement and recovers old positions inside the new cart", () => {
    resetGameState();
    Object.assign(gameState.sceneProgress, { annotationCartX: 144, annotationCartY: 144 });
    const before = createGameSaveData();
    resetGameState();
    restoreGameSaveData(before);
    expect(readAnnotationCart(gameState.sceneProgress)).toEqual({ position: { x: 144, y: 144 }, parked: false });
    expect(gameState.documentPoints).toBe(before.state.documentPoints);
    const solids = [...buildAnnotationStackLayers().collisionCells.map(archiveA1CollisionRect), annotationCartBounds(ANNOTATION_CART.start)];
    expect(workstationFeetBlocked(safeWorkstationPosition(ANNOTATION_CART.start, solids), solids)).toBe(false);
    expect(safeWorkstationPosition({ x: 128, y: 192 }, solids)).toEqual({ x: 128, y: 192 });
    resetGameState();
  });
});
