import { compilerCheckpointComplete, nextCompilerTask, submitCompilerTask, type CompilerCheckpoint } from "../game/compilerMission";
import { gameState, setLatestMessage, setObjective } from "../game/state";
import type { ChoicePrompt } from "./verification";
import type { DialogBox } from "./dialog";
import { saveGameNow } from "./save";

export function runCompilerCheckpoint(choice: ChoicePrompt, _dialog: DialogBox, checkpoint: CompilerCheckpoint, onComplete: () => void) {
  const showNext = () => {
    if (compilerCheckpointComplete(gameState.sceneProgress, checkpoint)) {
      onComplete();
      return;
    }
    const task = nextCompilerTask(gameState.sceneProgress);
    if (!task) return;
    setObjective(task.objective);
    const submit = (answer: string | undefined) => {
      const result = submitCompilerTask(gameState.sceneProgress, task.id, answer);
      setLatestMessage(result.message);
      // An incorrect training decision is feedback, not an actual alteration
      // to a historical document, and therefore does not invent a violation.
      if (result.ok) saveGameNow();
      choice.showCompilerFeedback(task.phase.toUpperCase(), result.message, result.ok, showNext, cancel);
    };
    const cancel = () => {
      setLatestMessage("Compiler checkpoint paused. Completed decisions are saved; return here to continue.");
      setObjective(checkpoint === "research_plan" ? "Return to INBOX for research approval." : "Return to the east manuscript desk.");
    };
    if (task.id === "selection") {
      choice.showManuscriptDesk(gameState.sceneProgress, saveGameNow, () => submit("decision"), cancel);
    } else if (task.id === "backup") {
      choice.showChapterDesk(gameState.sceneProgress, saveGameNow, () => submit("packet"), cancel);
    } else if (task.id === "revision") {
      choice.showRevisionDesk(gameState.sceneProgress, saveGameNow, () => submit("revise"), cancel);
    } else {
      choice.showCompilerDecision(task, option => submit(option.value), cancel);
    }
  };
  showNext();
}
