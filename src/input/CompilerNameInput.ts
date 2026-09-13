import { setNativeTextEntryActive } from "./InputState";

export function sanitizeCompilerNameInput(value: string) {
  return value.replace(/[^a-zA-Z]/g, "").slice(0, 10);
}

/** A real, synchronously focused input lets touch browsers show their keyboard. */
export class CompilerNameInput {
  private dialog?: HTMLDialogElement;
  private resize?: () => void;

  get active() { return Boolean(this.dialog?.open); }

  open(value: string, onDone: (name: string | null) => void) {
    if (this.active) return;
    const dialog = document.createElement("dialog");
    dialog.id = "compiler-name-dialog";
    dialog.setAttribute("aria-labelledby", "compiler-name-label");
    const form = document.createElement("form");
    const label = document.createElement("label");
    label.id = "compiler-name-label";
    label.htmlFor = "compiler-name-input";
    label.textContent = "Compiler name";
    const input = document.createElement("input");
    input.id = "compiler-name-input";
    input.type = "text";
    input.inputMode = "text";
    input.enterKeyHint = "done";
    input.autocomplete = "off";
    input.autocapitalize = "words";
    input.spellcheck = false;
    input.maxLength = 10;
    input.placeholder = "Sam";
    input.value = value;
    const actions = document.createElement("div");
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    const done = document.createElement("button");
    done.type = "submit";
    done.textContent = "Done";
    actions.append(cancel, done);
    form.append(label, input, actions);
    dialog.append(form);
    const finish = (name: string | null) => {
      this.destroy();
      onDone(name);
    };
    form.addEventListener("submit", event => {
      event.preventDefault();
      finish(sanitizeCompilerNameInput(input.value));
    });
    cancel.addEventListener("click", () => finish(null));
    dialog.addEventListener("cancel", event => {
      event.preventDefault();
      finish(null);
    });
    // Keep dismissal keys out of the gameplay listener after the dialog closes.
    dialog.addEventListener("keydown", event => {
      event.stopPropagation();
      if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault();
        finish(sanitizeCompilerNameInput(input.value));
      }
    });
    dialog.addEventListener("keyup", event => event.stopPropagation());
    document.body.append(dialog);
    this.dialog = dialog;
    this.resize = () => {
      const viewport = window.visualViewport;
      dialog.style.maxHeight = `${Math.max(44, Math.floor((viewport?.height ?? window.innerHeight) - 24))}px`;
      dialog.style.top = `max(${Math.round((viewport?.offsetTop ?? 0) + 12)}px, env(safe-area-inset-top))`;
    };
    window.visualViewport?.addEventListener("resize", this.resize);
    window.visualViewport?.addEventListener("scroll", this.resize);
    this.resize();
    setNativeTextEntryActive(true);
    dialog.showModal();
    input.focus({ preventScroll: true });
  }

  destroy() {
    if (!this.dialog) return;
    if (this.resize) {
      window.visualViewport?.removeEventListener("resize", this.resize);
      window.visualViewport?.removeEventListener("scroll", this.resize);
      this.resize = undefined;
    }
    this.dialog.close();
    this.dialog.remove();
    this.dialog = undefined;
    setNativeTextEntryActive(false);
  }
}
