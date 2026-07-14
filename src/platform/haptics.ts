import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export type HapticResult = "native" | "web" | "none";

export interface HapticImpactDriver {
  impact(options: { style: ImpactStyle }): Promise<void>;
}

export interface VibrationTarget {
  vibrate?: (pattern: number | number[]) => boolean;
}

function browserVibrationTarget(): VibrationTarget {
  return typeof navigator === "undefined" ? {} : navigator;
}

export async function performTouchHaptic(
  nativePlatform = Capacitor.isNativePlatform(),
  driver: HapticImpactDriver = Haptics,
  vibrationTarget: VibrationTarget = browserVibrationTarget()
): Promise<HapticResult> {
  if (nativePlatform) {
    try {
      await driver.impact({ style: ImpactStyle.Light });
      return "native";
    } catch {
      // Older devices can decline an impact request; keep the web fallback.
    }
  }

  if (vibrationTarget.vibrate) {
    vibrationTarget.vibrate(8);
    return "web";
  }

  return "none";
}

export function triggerTouchHaptic() {
  void performTouchHaptic().catch(() => undefined);
}
