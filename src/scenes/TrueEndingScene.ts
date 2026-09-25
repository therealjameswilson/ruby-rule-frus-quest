import Phaser from "phaser";
import { FRUS_VOLUMES } from "../assets/registry";
import { SNES_PUBLISHED_FRUS_PRIZE_ASSET } from "../game/snesAtlas";
import {
  gameState,
  getCompletionStatsReadout,
  getStatutoryClockStateReadout,
  getDanneItemReadout,
  getFinalGateReadiness,
  getProductionBoardReadout,
  getPublicationReadinessReadout,
  setLatestMessage,
  setNearestInteractable,
  setSceneState,
  setVisibleEntities,
  setVisibleThreats
} from "../game/state";
import { buildTrueEndingCertificate } from "../game/trueEndingCertificate";
import { getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { PublicationSummary } from "../systems/publicationSummary";
import { transitionTo } from "../systems/sceneTransitions";
import { VOLUME_ASSEMBLY_ASSETS } from "../systems/volumeAssembly";

const FALLBACK_VOLUME_TEXTURE: keyof typeof FRUS_VOLUMES = "reward_legendary";

export class TrueEndingScene extends Phaser.Scene {
  private summary?: PublicationSummary;
  private readyAt = 0;
  private leaving = false;

  constructor() {
    super("TrueEndingScene");
  }

  preload() {
    if (!this.textures.exists("published-volume-v2")) this.load.image("published-volume-v2", "assets/presentation/publication/volume-v2.png");
  }

  create() {
    this.leaving = false;
    this.readyAt = this.time.now + 350;
    const readiness = getFinalGateReadiness();
    const publication = getPublicationReadinessReadout();
    const board = getProductionBoardReadout();
    const treatyFragments = getDanneItemReadout().find((item) => item.id === "treaty-fragments")?.count ?? 0;
    const certificate = buildTrueEndingCertificate({
      processStamps: gameState.processStamps,
      documentCandidates: gameState.documentCandidates,
      volumeFragments: gameState.volumeFragments,
      reliability: gameState.reliability,
      documentPoints: gameState.documentPoints,
      treatyFragmentsCollected: treatyFragments,
      publicationBoardCompleted: board.completed,
      publicationBoardTotal: board.total,
      publicationApparatusCompleted: readiness.publicationApparatus.completed,
      publicationApparatusTotal: readiness.publicationApparatus.total,
      buckramGateOpen: publication.buckramGateOpen,
      standardsClear: publication.standards.clear,
      publicRecordComplete: Boolean(gameState.sceneProgress.publicCitationComplete)
        && Boolean(gameState.sceneProgress.releaseCalendarComplete)
        && gameState.finalGateCertification?.status === "published"
    });

    // The bindery owns certification, completion stats, and the saved run count.
    // Revisiting this presentation must never award or finalize a second volume.
    setSceneState("TrueEndingScene", "ending", certificate.complete
      ? "FRUS VOLUME CERTIFIED"
      : "CERTIFICATION STILL OPEN");
    setLatestMessage(certificate.complete
      ? "DANN-E defeated. The complete treaty record is published."
      : "The certification record still shows open checks.");
    retroAudio.startMusic("EndingScene");
    this.summary = new PublicationSummary(this, {
      clock: getStatutoryClockStateReadout(),
      compiler: gameState.playerProfile.displayName,
      stats: getCompletionStatsReadout(),
      volumesCompleted: gameState.volumesCompleted,
      certificate,
      textureKeys: [
        "published-volume-v2",
        VOLUME_ASSEMBLY_ASSETS.completedHero.key,
        SNES_PUBLISHED_FRUS_PRIZE_ASSET.key,
        FALLBACK_VOLUME_TEXTURE
      ],
      canAct: () => !this.leaving && this.time.now >= this.readyAt,
      onTitle: () => {
        this.leaving = true;
        transitionTo(this, "TitleScene");
      },
      onPageChange: (page) => {
        setVisibleEntities(page === "volume"
          ? [certificate.title, "Ruby Buckram Certified Volume", `Treaty Record ${Math.min(treatyFragments, 3)}/3`, "Certificate button", "Title button"]
          : page === "certificate"
            ? ["Certification record", ...certificate.checklist.map((line) => `${line.label}: ${line.value}${line.complete ? "" : " (open)"}`), "Record button", "Title button"]
            : ["Publication record", "Completion stats", "Skills practiced", "Volume button", "Title button"]);
        setVisibleThreats([]);
        setNearestInteractable(null);
      }
    });
  }

  update() {
    tickInput();
    this.summary?.update(getInput());
  }
}
