import { describe, expect, it, vi } from "vitest";
import { ImpactStyle } from "@capacitor/haptics";
import { performTouchHaptic, type HapticImpactDriver, type VibrationTarget } from "./haptics";

function driver(impact: HapticImpactDriver["impact"]): HapticImpactDriver {
  return { impact };
}

describe("touch haptics", () => {
  it("uses a light native impact in the iPhone app", async () => {
    const impact = vi.fn(async () => undefined);
    const vibrate = vi.fn(() => true);

    await expect(performTouchHaptic(true, driver(impact), { vibrate })).resolves.toBe("native");
    expect(impact).toHaveBeenCalledWith({ style: ImpactStyle.Light });
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("keeps the browser vibration fallback", async () => {
    const impact = vi.fn(async () => undefined);
    const vibrate = vi.fn(() => true);

    await expect(performTouchHaptic(false, driver(impact), { vibrate })).resolves.toBe("web");
    expect(impact).not.toHaveBeenCalled();
    expect(vibrate).toHaveBeenCalledWith(8);
  });

  it("falls back when native impact feedback is unavailable", async () => {
    const impact = vi.fn(async () => Promise.reject(new Error("unavailable")));
    const vibrate = vi.fn(() => true);

    await expect(performTouchHaptic(true, driver(impact), { vibrate })).resolves.toBe("web");
    expect(vibrate).toHaveBeenCalledWith(8);
  });

  it("reports when no haptic path exists", async () => {
    const target: VibrationTarget = {};
    await expect(performTouchHaptic(false, driver(async () => undefined), target)).resolves.toBe("none");
  });
});
