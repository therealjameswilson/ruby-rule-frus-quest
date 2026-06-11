import type { Interactable, WorkflowTool } from "./types";

export const WORKFLOW_TOOL_PRIORITY: readonly WorkflowTool[] = [
  "citation_stamp",
  "source_note_card",
  "cross_reference_thread",
  "referral_manifest",
  "excision_bracket_marker",
  "red_pencil",
  "proof_lens",
  "buckram_key"
] as const;

export interface WorkflowToolDefinition {
  id: WorkflowTool;
  displayName: string;
  shortLabel: string;
  icon: string;
  priority: number;
  targetKinds: readonly Interactable["kind"][];
  use: string;
}

export const WORKFLOW_TOOL_REGISTRY: readonly WorkflowToolDefinition[] = WORKFLOW_TOOL_PRIORITY.map((id, index) => {
  const priority = index + 1;
  if (id === "citation_stamp") {
    return {
      id,
      displayName: "Citation Stamp",
      shortLabel: "CITE",
      icon: "citation-stamp",
      priority,
      targetKinds: ["document", "manuscript", "enemy", "door"],
      use: "Verify provenance and clear source-note locks."
    };
  }
  if (id === "source_note_card") {
    return {
      id,
      displayName: "Source Note Card",
      shortLabel: "SRC",
      icon: "source-note",
      priority,
      targetKinds: ["document", "manuscript", "terminal"],
      use: "Carry repository, collection, box, folder, and document trail."
    };
  }
  if (id === "cross_reference_thread") {
    return {
      id,
      displayName: "Cross-Reference Thread",
      shortLabel: "XREF",
      icon: "cross-reference",
      priority,
      targetKinds: ["document", "terminal"],
      use: "Trace published status and related FRUS references."
    };
  }
  if (id === "referral_manifest") {
    return {
      id,
      displayName: "Referral Manifest",
      shortLabel: "REF",
      icon: "referral-manifest",
      priority,
      targetKinds: ["document", "terminal", "enemy"],
      use: "Route equities to the correct human referral queue."
    };
  }
  if (id === "excision_bracket_marker") {
    return {
      id,
      displayName: "Excision Bracket Marker",
      shortLabel: "EXC",
      icon: "excision-bracket-marker",
      priority,
      targetKinds: ["document", "manuscript"],
      use: "Mark withheld text visibly rather than silently erasing it."
    };
  }
  if (id === "red_pencil") {
    return {
      id,
      displayName: "Red Pencil",
      shortLabel: "PENCIL",
      icon: "red-pencil",
      priority,
      targetKinds: ["document", "manuscript"],
      use: "Apply editor judgment to unsupported or unclear text."
    };
  }
  if (id === "proof_lens") {
    return {
      id,
      displayName: "Proof Lens",
      shortLabel: "LENS",
      icon: "proof-lens",
      priority,
      targetKinds: ["document", "manuscript", "door"],
      use: "Reveal tiny discrepancies during silent read."
    };
  }
  return {
    id,
    displayName: "Buckram Key",
    shortLabel: "KEY",
    icon: "buckram-key",
    priority,
    targetKinds: ["door"],
    use: "Open the final publication gate once the volume is certified."
  };
});

export function getWorkflowToolDefinition(toolId: WorkflowTool) {
  return WORKFLOW_TOOL_REGISTRY.find((tool) => tool.id === toolId);
}

export function selectWorkflowToolForInteractable(
  availableTools: readonly WorkflowTool[],
  interactable: Pick<Interactable, "kind"> | null
) {
  if (!interactable) return null;
  for (const toolId of WORKFLOW_TOOL_PRIORITY) {
    if (!availableTools.includes(toolId)) continue;
    const definition = getWorkflowToolDefinition(toolId);
    if (definition?.targetKinds.includes(interactable.kind)) return definition;
  }
  return null;
}
