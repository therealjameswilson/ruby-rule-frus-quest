import { describe, expect, it } from "vitest";
import {
  evaluateRecordCollectionAnswer,
  FIELD_CABLE_COLLECTION_DOCUMENT_ID,
  FIELD_CABLE_COLLECTION_POINT_VALUE,
  FIELD_CABLE_COLLECTION_STEP,
  getRecordCollectionPrompt,
  logFieldCableCollection,
  recordCollectionComplete,
  RECORD_COLLECTION_PROMPTS
} from "./recordCollection";

describe("record collection prompts", () => {
  it("keeps the source-backed collection sequence stable", () => {
    expect(RECORD_COLLECTION_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "identify_search",
      "copy_or_note",
      "context_records"
    ]);
  });

  it("accepts the correct collection answer for every prompt", () => {
    for (const prompt of RECORD_COLLECTION_PROMPTS) {
      const result = evaluateRecordCollectionAnswer(prompt.id, prompt.correctValue);

      expect(result.ok).toBe(true);
      expect(result.violation).toBeNull();
      expect(result.message).toBe(prompt.successMessage);
      expect(result.prompt.sourceBasis.length).toBeGreaterThan(50);
    }
  });

  it("maps collection shortcuts to standards damage categories", () => {
    const easyFolder = evaluateRecordCollectionAnswer("identify_search", "easy_folder");
    const machineHarvest = evaluateRecordCollectionAnswer("identify_search", "machine_harvest");
    const copyEverything = evaluateRecordCollectionAnswer("copy_or_note", "copy_everything");

    expect(easyFolder.ok).toBe(false);
    expect(easyFolder.violation).toBe("omitted_material_fact");
    expect(machineHarvest.violation).toBe("altered_text");
    expect(copyEverything.violation).toBe("missed_30_year_deadline");
  });

  it("reports completion only after all collection prompts are answered", () => {
    expect(recordCollectionComplete(0)).toBe(false);
    expect(recordCollectionComplete(RECORD_COLLECTION_PROMPTS.length - 1)).toBe(false);
    expect(recordCollectionComplete(RECORD_COLLECTION_PROMPTS.length)).toBe(true);
  });

  it("clamps prompt lookup to the collection sequence", () => {
    expect(getRecordCollectionPrompt(-1).id).toBe("identify_search");
    expect(getRecordCollectionPrompt(99).id).toBe("context_records");
  });

  it("logs an embassy cable as a one-time field collection note", () => {
    const result = logFieldCableCollection(0, false);

    expect(result.alreadyLogged).toBe(false);
    expect(result.documentId).toBe(FIELD_CABLE_COLLECTION_DOCUMENT_ID);
    expect(result.documentPoints).toBe(FIELD_CABLE_COLLECTION_POINT_VALUE);
    expect(result.nextRecordCollectionStep).toBe(FIELD_CABLE_COLLECTION_STEP);
    expect(result.sourceUrl).toBe("https://history.state.gov/historicaldocuments/frus-history/stages");
    expect(result.sourceBasis).toContain("copies or notes");
  });

  it("does not farm document points or rewind collection progress on repeat cable logs", () => {
    const result = logFieldCableCollection(RECORD_COLLECTION_PROMPTS.length, true);

    expect(result.alreadyLogged).toBe(true);
    expect(result.documentPoints).toBe(0);
    expect(result.nextRecordCollectionStep).toBe(RECORD_COLLECTION_PROMPTS.length);
    expect(result.message).toContain("already logged");
  });
});
