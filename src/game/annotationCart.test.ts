import { describe, expect, it } from "vitest";
import { ANNOTATION_CART, annotationCartBounds, pushAnnotationCart, readAnnotationCart } from "./annotationCart";
import { buildAnnotationStackLayers, annotationStacksObjective } from "./annotationStacks";
import { archiveA1CollisionRect } from "./archiveA1Tilemap";
import { workstationFeetBlocked, safeWorkstationPosition } from "./workstationGeometry";
import { createGameSaveData, gameState, resetGameState, restoreGameSaveData } from "./state";

describe("Annotation Stacks return cart", () => {
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
