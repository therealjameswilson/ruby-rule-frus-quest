import { describe, expect, it } from "vitest";
import { resumeLabel } from "./resumeLabel";

describe("readable resume labels", () => {
  it("replaces implementation names and identifies the final locations separately", () => {
    expect(resumeLabel("OfficeScene", 0)).toBe("NAVY HILL OFFICE  |  0 PTS");
    expect(resumeLabel("BlackVaultLairScene", 201)).toBe("BLACK VAULT  |  201 PTS");
    expect(resumeLabel("EndingScene", 241)).toBe("FRUS BINDERY  |  241 PTS");
  });
  it("uses the existing area registry and handles unknown scenes safely", () => {
    expect(resumeLabel("NetworkScene", 12)).toBe("TWO NETWORKS  |  12 PTS");
    expect(resumeLabel("FutureScene", NaN)).toBe("SAVED QUEST  |  0 PTS");
    expect(resumeLabel("OfficeScene", -2)).toBe("NAVY HILL OFFICE  |  0 PTS");
  });
});
