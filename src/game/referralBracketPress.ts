import type { ProcessItemId } from "./constants";

interface Bounds { x: number; y: number; width: number; height: number }

export const REFERRAL_BRACKET_PRESS = { x: 180, y: 144, width: 32, height: 24 } as const;

export function referralBracketStrike(input: {
  reviewed: boolean;
  step: number;
  carried: number;
  ownsStamp: boolean;
  tool: ProcessItemId;
  hitbox: Bounds | null;
}): "miss" | "wrong-tool" | "print" {
  const hit = input.hitbox;
  const press = REFERRAL_BRACKET_PRESS;
  if (!input.reviewed || input.step !== 2 || input.carried !== 3 || !hit
    || hit.x >= press.x + press.width || hit.x + hit.width <= press.x
    || hit.y >= press.y + press.height || hit.y + hit.height <= press.y) return "miss";
  return input.ownsStamp && input.tool === "citation_stamp" ? "print" : "wrong-tool";
}
