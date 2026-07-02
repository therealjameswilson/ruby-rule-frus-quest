export const FRUS_BOOKSHELF_SOURCE_URL = "https://history.state.gov/historicaldocuments/about-frus";
export const FRUS_BOOKSHELF_FRAGMENT = "Reference Shelf Fragment";
export const FRUS_BOOKSHELF_POINT_VALUE = 4;

export interface FrusBookshelfInput {
  alreadyBrowsed?: boolean;
  currentFragments?: readonly string[];
}

export interface FrusBookshelfResult {
  alreadyBrowsed: boolean;
  documentPoints: number;
  fragmentLabel: typeof FRUS_BOOKSHELF_FRAGMENT;
  shouldAwardFragment: boolean;
  visibleShelfCount: number;
  sourceUrl: string;
  sourceBasis: string;
  objective: string;
  message: string;
  pages: readonly string[];
}

export const FRUS_BOOKSHELF_SOURCE_BASIS =
  "The About FRUS page identifies the series as the official documentary record since 1861, built from full access to pertinent records at 20 years and published 30 years after the events documented.";

export const FRUS_BOOKSHELF_SOURCE_SCOPE =
  "The same page describes a broad source base: White House, NSC, State, Defense, CIA, other foreign affairs agencies, and private papers.";

export function browseFrusBookshelf(input: FrusBookshelfInput = {}): FrusBookshelfResult {
  const currentFragments = input.currentFragments ?? [];
  const alreadyBrowsed = Boolean(input.alreadyBrowsed);
  const shouldAwardFragment = !currentFragments.includes(FRUS_BOOKSHELF_FRAGMENT);
  const visibleShelfCount = currentFragments.length + (shouldAwardFragment ? 1 : 0);
  const message = alreadyBrowsed
    ? `FRUS shelf reviewed: ${visibleShelfCount} cover fragments indexed against the public record.`
    : "FRUS shelf opened: public-series reference trail added to the working volume.";

  return {
    alreadyBrowsed,
    documentPoints: alreadyBrowsed ? 0 : FRUS_BOOKSHELF_POINT_VALUE,
    fragmentLabel: FRUS_BOOKSHELF_FRAGMENT,
    shouldAwardFragment,
    visibleShelfCount,
    sourceUrl: FRUS_BOOKSHELF_SOURCE_URL,
    sourceBasis: FRUS_BOOKSHELF_SOURCE_BASIS,
    objective: "Reference shelf indexed. Use the public record to keep the volume broad, sourced, and publishable.",
    message,
    pages: [
      message,
      FRUS_BOOKSHELF_SOURCE_BASIS,
      FRUS_BOOKSHELF_SOURCE_SCOPE
    ]
  };
}
