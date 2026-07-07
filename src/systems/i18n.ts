import enStrings from "../data/i18n/en.json";
import esStrings from "../data/i18n/es.json";
import frStrings from "../data/i18n/fr.json";

export const LANGUAGES = ["en", "es", "fr"] as const;
export type LanguageCode = (typeof LANGUAGES)[number];

type TranslationValue = string | TranslationTree;
type TranslationTree = { readonly [key: string]: TranslationValue };
type StringParams = Record<string, string | number>;

const STORAGE_KEY = "ruby-rule.language";

const TRANSLATIONS: Record<LanguageCode, TranslationTree> = {
  en: enStrings as TranslationTree,
  es: esStrings as TranslationTree,
  fr: frStrings as TranslationTree
};

const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: "English",
  es: "Español",
  fr: "Français"
};

let selectedLanguage: LanguageCode = readStoredLanguage();
const listeners = new Set<(language: LanguageCode) => void>();

function isLanguageCode(value: string | null): value is LanguageCode {
  return LANGUAGES.includes(value as LanguageCode);
}

function readStoredLanguage(): LanguageCode {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLanguageCode(stored) ? stored : "en";
  } catch {
    return "en";
  }
}

function persistLanguage(language: LanguageCode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // localStorage may be unavailable in privacy modes; keep the in-memory language.
  }
}

function lookup(tree: TranslationTree, key: string): string | null {
  let cursor: TranslationValue | undefined = tree;
  for (const segment of key.split(".")) {
    if (!cursor || typeof cursor === "string") return null;
    cursor = cursor[segment];
  }
  return typeof cursor === "string" ? cursor : null;
}

function interpolate(template: string, params: StringParams) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function getLanguage() {
  return selectedLanguage;
}

export function languageDisplayName(language: LanguageCode = selectedLanguage) {
  return LANGUAGE_NAMES[language];
}

export function setLanguage(language: LanguageCode) {
  if (language === selectedLanguage) return selectedLanguage;
  selectedLanguage = language;
  persistLanguage(language);
  for (const listener of listeners) listener(language);
  return selectedLanguage;
}

export function cycleLanguage() {
  const index = LANGUAGES.indexOf(selectedLanguage);
  return setLanguage(LANGUAGES[(index + 1) % LANGUAGES.length]);
}

export function addLanguageChangeListener(listener: (language: LanguageCode) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getString(key: string, params: StringParams = {}) {
  const localized = lookup(TRANSLATIONS[selectedLanguage], key);
  const fallback = lookup(TRANSLATIONS.en, key);
  return interpolate(localized ?? fallback ?? key, params);
}
