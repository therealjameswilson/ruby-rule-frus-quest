import { afterEach, describe, expect, it } from "vitest";
import { getLanguage, getString, setLanguage } from "./i18n";
import enStrings from "../data/i18n/en.json";
import esStrings from "../data/i18n/es.json";
import frStrings from "../data/i18n/fr.json";

function flattenKeys(tree: unknown, prefix = ""): string[] {
  if (typeof tree !== "object" || tree === null) return [prefix];
  return Object.entries(tree as Record<string, unknown>).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key)
  );
}

describe("localization helper", () => {
  afterEach(() => {
    setLanguage("en");
  });

  it("falls back to English for unknown selected-language keys", () => {
    setLanguage("es");

    expect(getString("pause.title")).toBe("SUBPANTALLA FRUS QUEST");
    expect(getString("missing.key")).toBe("missing.key");
  });

  it("interpolates translated and fallback strings", () => {
    setLanguage("fr");

    expect(getString("hud.carryItem", { item: "SOURCE NOTE 47" })).toBe("Porte SOURCE NOTE 47.");
    expect(getString("title.skipWarning", { mark: "X" })).toBe("B : IGNORER L'AVIS [X]");
  });

  it("persists the in-memory language selection", () => {
    setLanguage("en");
    expect(getLanguage()).toBe("en");

    setLanguage("es");
    expect(getLanguage()).toBe("es");
    expect(getString("title.pressStart")).toBe("PULSA START PARA EMPEZAR");
  });

  it("keeps the extended scene catalogs available for incremental wiring", () => {
    setLanguage("es");
    expect(getString("characterCreate.title")).toBe("CREA TU ROL EN FRUS");
    expect(getString("ending.bad.title")).toBe("FINAL MALO");

    setLanguage("fr");
    expect(getString("characterCreate.title")).toBe("CRÉE TON RÔLE FRUS");
    expect(getString("ending.bad.title")).toBe("MAUVAISE FIN");
  });
});

describe("localization data covers the English runtime baseline", () => {
  const enKeys = flattenKeys(enStrings).sort();

  it("Spanish contains every live English key", () => {
    const spanishKeys = new Set(flattenKeys(esStrings));
    expect(enKeys.filter((key) => !spanishKeys.has(key))).toEqual([]);
  });

  it("French contains every live English key", () => {
    const frenchKeys = new Set(flattenKeys(frStrings));
    expect(enKeys.filter((key) => !frenchKeys.has(key))).toEqual([]);
  });
});
