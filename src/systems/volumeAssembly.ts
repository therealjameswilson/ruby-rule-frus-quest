import type { DanneEnemyVariantId } from "../entities/danneVariants";

export type VolumeAssemblyPieceId = "spine" | "front_board" | "title_plate" | "ribbon_marker" | "seal_stamp";

export interface VolumeAssemblyPieceDefinition {
  id: VolumeAssemblyPieceId;
  label: string;
  shortLabel: string;
  legacyFragmentLabel: string;
  source: string;
}

export interface VolumeAssemblyState {
  earnedPieces: VolumeAssemblyPieceId[];
  earnedAt: Partial<Record<VolumeAssemblyPieceId, string>>;
  ceremonyUnlocked: boolean;
  ceremonyPlayed: boolean;
  lastEarnedPiece: VolumeAssemblyPieceId | null;
}

export interface VolumeAssemblyPieceReadout extends VolumeAssemblyPieceDefinition {
  earned: boolean;
  earnedAt: string | null;
}

export interface VolumeAssemblyReadout {
  pieces: VolumeAssemblyPieceReadout[];
  earnedPieces: VolumeAssemblyPieceId[];
  earnedCount: number;
  total: number;
  missingCount: number;
  complete: boolean;
  ceremonyUnlocked: boolean;
  ceremonyPlayed: boolean;
  lastEarnedPiece: VolumeAssemblyPieceId | null;
  hudLabel: string;
}

export const VOLUME_ASSEMBLY_ASSETS = {
  hudBar: {
    key: "volume-assembly-hud-bar",
    path: "assets/art-pack/volume-assembly/volume_assembly_hud_bar.png"
  },
  bindingAnimation: {
    key: "volume-binding-animation",
    path: "assets/art-pack/volume-assembly/volume_binding_animation_6x128.png",
    frameWidth: 128,
    frameHeight: 128,
    frameCount: 6
  },
  completedHero: {
    key: "volume-completed-hero",
    path: "assets/art-pack/volume-assembly/completed_volume_hero.png"
  }
} as const;

export const VOLUME_ASSEMBLY_PIECES = [
  {
    id: "spine",
    label: "Spine",
    shortLabel: "SPINE",
    legacyFragmentLabel: "Front Matter Fragment",
    source: "DANN-E Mark I prototype review"
  },
  {
    id: "front_board",
    label: "Front Board",
    shortLabel: "BOARD",
    legacyFragmentLabel: "Source Note Fragment",
    source: "DANN-E Colossus Black Vault review"
  },
  {
    id: "title_plate",
    label: "Title Plate",
    shortLabel: "TITLE",
    legacyFragmentLabel: "Routing Fragment",
    source: "DANN-E Cloud provenance review"
  },
  {
    id: "ribbon_marker",
    label: "Ribbon Marker",
    shortLabel: "RIBBON",
    legacyFragmentLabel: "Referral Fragment",
    source: "DANN-E Executive hearing review"
  },
  {
    id: "seal_stamp",
    label: "Seal Stamp",
    shortLabel: "SEAL",
    legacyFragmentLabel: "Proof Fragment",
    source: "DANN-E Ascendant final standards review"
  }
] as const satisfies readonly VolumeAssemblyPieceDefinition[];

const PIECE_IDS = VOLUME_ASSEMBLY_PIECES.map((piece) => piece.id);

export const VOLUME_ASSEMBLY_DANNE_REWARDS: Partial<Record<DanneEnemyVariantId, VolumeAssemblyPieceId>> = {
  "danne-mark-i-prototype": "spine",
  "danne-colossus-final-form": "front_board",
  "danne-cloud-form": "title_plate",
  "danne-executive-suit": "ribbon_marker",
  "danne-ascendant": "seal_stamp"
} as const;

export function createInitialVolumeAssemblyState(): VolumeAssemblyState {
  return {
    earnedPieces: [],
    earnedAt: {},
    ceremonyUnlocked: false,
    ceremonyPlayed: false,
    lastEarnedPiece: null
  };
}

export function normalizeVolumeAssemblyState(
  state?: Partial<VolumeAssemblyState> | null,
  legacyFragments: readonly string[] = []
): VolumeAssemblyState {
  const earned = new Set<VolumeAssemblyPieceId>();
  for (const piece of state?.earnedPieces ?? []) {
    if ((PIECE_IDS as string[]).includes(piece)) earned.add(piece);
  }
  for (const piece of VOLUME_ASSEMBLY_PIECES) {
    if (legacyFragments.includes(piece.legacyFragmentLabel)) earned.add(piece.id);
  }
  const earnedPieces = PIECE_IDS.filter((pieceId) => earned.has(pieceId));
  const complete = earnedPieces.length >= VOLUME_ASSEMBLY_PIECES.length;
  return {
    earnedPieces,
    earnedAt: Object.fromEntries(earnedPieces.map((pieceId) => [pieceId, state?.earnedAt?.[pieceId] ?? "legacy"])) as Partial<Record<VolumeAssemblyPieceId, string>>,
    ceremonyUnlocked: Boolean(state?.ceremonyUnlocked) || complete,
    ceremonyPlayed: Boolean(state?.ceremonyPlayed),
    lastEarnedPiece: state?.lastEarnedPiece && (PIECE_IDS as string[]).includes(state.lastEarnedPiece)
      ? state.lastEarnedPiece
      : earnedPieces[earnedPieces.length - 1] ?? null
  };
}

export function volumeAssemblyPiece(pieceId: VolumeAssemblyPieceId) {
  return VOLUME_ASSEMBLY_PIECES.find((piece) => piece.id === pieceId) ?? null;
}

export function pieceForDanneVariant(variantId: DanneEnemyVariantId) {
  return VOLUME_ASSEMBLY_DANNE_REWARDS[variantId] ?? null;
}

export function earnVolumeAssemblyPiece(
  state: VolumeAssemblyState,
  pieceId: VolumeAssemblyPieceId,
  earnedAt = new Date().toISOString()
) {
  const normalized = normalizeVolumeAssemblyState(state);
  if (normalized.earnedPieces.includes(pieceId)) {
    return { state: normalized, changed: false, piece: volumeAssemblyPiece(pieceId) };
  }
  const earnedPieces = [...normalized.earnedPieces, pieceId];
  const complete = earnedPieces.length >= VOLUME_ASSEMBLY_PIECES.length;
  return {
    state: {
      ...normalized,
      earnedPieces,
      earnedAt: {
        ...normalized.earnedAt,
        [pieceId]: earnedAt
      },
      ceremonyUnlocked: normalized.ceremonyUnlocked || complete,
      lastEarnedPiece: pieceId
    },
    changed: true,
    piece: volumeAssemblyPiece(pieceId)
  };
}

export function markVolumeAssemblyCeremonyPlayed(state: VolumeAssemblyState) {
  return {
    ...normalizeVolumeAssemblyState(state),
    ceremonyPlayed: true
  };
}

export function volumeAssemblyReadout(state: VolumeAssemblyState): VolumeAssemblyReadout {
  const normalized = normalizeVolumeAssemblyState(state);
  const earned = new Set(normalized.earnedPieces);
  const pieces = VOLUME_ASSEMBLY_PIECES.map((piece) => ({
    ...piece,
    earned: earned.has(piece.id),
    earnedAt: normalized.earnedAt[piece.id] ?? null
  }));
  const earnedCount = normalized.earnedPieces.length;
  const total = VOLUME_ASSEMBLY_PIECES.length;
  return {
    pieces,
    earnedPieces: [...normalized.earnedPieces],
    earnedCount,
    total,
    missingCount: Math.max(0, total - earnedCount),
    complete: earnedCount >= total,
    ceremonyUnlocked: normalized.ceremonyUnlocked,
    ceremonyPlayed: normalized.ceremonyPlayed,
    lastEarnedPiece: normalized.lastEarnedPiece,
    hudLabel: `VOLUME ${earnedCount}/${total}`
  };
}
