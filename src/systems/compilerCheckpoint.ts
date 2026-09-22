import { compilerCheckpointComplete, nextCompilerTask, submitCompilerTask, type CompilerCheckpoint } from "../game/compilerMission";
import { gameState, setLatestMessage, setObjective } from "../game/state";
import type { ChoicePrompt } from "./verification";
import type { DialogBox } from "./dialog";
import { saveGameNow } from "./save";

export function runCompilerCheckpoint(choice: ChoicePrompt, dialog: DialogBox, checkpoint: CompilerCheckpoint, onComplete: () => void) {
  const showNext = () => {
    if (compilerCheckpointComplete(gameState.sceneProgress, checkpoint)) {
      onComplete();
      return;
    }
    const task = nextCompilerTask(gameState.sceneProgress);
    if (!task) return;
    setObjective(task.objective);
    choice.show(`${task.question}\n\n${task.context}`, [...task.options], option => {
      const result = submitCompilerTask(gameState.sceneProgress, task.id, option.value);
      setLatestMessage(result.message);
      // An incorrect training decision is feedback, not an actual alteration
      // to a historical document, and therefore does not invent a violation.
      if (result.ok) saveGameNow();
      dialog.show(result.ok ? task.phase.toUpperCase() : "RECHECK THE PACKET", result.message, showNext);
    }, 8, () => {
      setLatestMessage("Compiler checkpoint paused. Completed decisions are saved; return here to continue.");
      setObjective(checkpoint === "research_plan" ? "Return to INBOX for research approval." : "Return to the east manuscript desk.");
    });
  };
  showNext();
}
