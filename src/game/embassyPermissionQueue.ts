import {
  FOREIGN_GOVERNMENT_PERMISSION_PROMPTS,
  FOREIGN_GOVERNMENT_PERMISSION_SOURCE_URL
} from "./foreignGovernmentPermission";

export const FOREIGN_PERMISSION_NOTE_ITEM_LABEL = "Foreign Permission Note";
export const VISIBLE_WITHHOLDING_NOTE_ITEM_LABEL = "Visible Withholding Note";
export const EMBASSY_PERMISSION_POINT_VALUE = 5;

export interface EmbassyPermissionQueueInput {
  embassyCableLogged?: boolean;
  alreadyFiled?: boolean;
  inventory?: readonly string[];
  currentStep?: number;
}

export interface EmbassyPermissionQueueResult {
  ok: boolean;
  alreadyFiled: boolean;
  documentPoints: number;
  nextStep: number;
  shouldFilePermission: boolean;
  itemsToAward: readonly string[];
  sourceUrl: string;
  sourceBasis: string;
  objective: string;
  message: string;
  pages: readonly string[];
}

export const EMBASSY_PERMISSION_SOURCE_BASIS =
  "The FRUS stages page says permission may be sought when selected documents include foreign-government information.";

const VISIBLE_OUTCOME_BASIS =
  "The publication packet must preserve a visible permission or withholding outcome rather than turning review into a silent gap.";

function missingAwards(inventory: readonly string[]) {
  return [FOREIGN_PERMISSION_NOTE_ITEM_LABEL, VISIBLE_WITHHOLDING_NOTE_ITEM_LABEL]
    .filter((item) => !inventory.includes(item));
}

export function fileEmbassyPermissionQueue(input: EmbassyPermissionQueueInput = {}): EmbassyPermissionQueueResult {
  const inventory = input.inventory ?? [];
  const alreadyFiled = Boolean(input.alreadyFiled);
  if (!input.embassyCableLogged) {
    const message = "Consular queue waiting: copy the chancery cable before routing foreign-government information.";
    return {
      ok: false,
      alreadyFiled,
      documentPoints: 0,
      nextStep: input.currentStep ?? 0,
      shouldFilePermission: false,
      itemsToAward: [],
      sourceUrl: FOREIGN_GOVERNMENT_PERMISSION_SOURCE_URL,
      sourceBasis: EMBASSY_PERMISSION_SOURCE_BASIS,
      objective: "Need embassy cable: collect the diplomatic record before seeking foreign-government permission.",
      message,
      pages: [
        message,
        EMBASSY_PERMISSION_SOURCE_BASIS,
        "The queue cannot infer consent from an absent document."
      ]
    };
  }

  const nextStep = Math.max(input.currentStep ?? 0, FOREIGN_GOVERNMENT_PERMISSION_PROMPTS.length);
  const message = alreadyFiled
    ? "Foreign-government permission note already filed: the visible outcome remains attached."
    : "Foreign-government permission note filed: request channel and visible outcome recorded.";

  return {
    ok: true,
    alreadyFiled,
    documentPoints: alreadyFiled ? 0 : EMBASSY_PERMISSION_POINT_VALUE,
    nextStep,
    shouldFilePermission: !alreadyFiled,
    itemsToAward: missingAwards(inventory),
    sourceUrl: FOREIGN_GOVERNMENT_PERMISSION_SOURCE_URL,
    sourceBasis: `${EMBASSY_PERMISSION_SOURCE_BASIS} ${VISIBLE_OUTCOME_BASIS}`,
    objective: "Foreign-government permission filed. Keep the permission or withholding note visible.",
    message,
    pages: [
      message,
      EMBASSY_PERMISSION_SOURCE_BASIS,
      VISIBLE_OUTCOME_BASIS
    ]
  };
}
