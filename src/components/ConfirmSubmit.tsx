import { useEffect, useRef } from "react";

interface ConfirmSubmitProps {
  open: boolean;
  unanswered: number;
  flagged: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Modal "Submit the test?" when questions are unanswered or flagged. */
export function ConfirmSubmit({
  open,
  unanswered,
  flagged,
  onCancel,
  onConfirm,
}: ConfirmSubmitProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const parts = [];
  if (unanswered > 0) {
    parts.push(`${unanswered} ${unanswered === 1 ? "question is" : "questions are"} unanswered`);
  }
  if (flagged > 0) {
    parts.push(`${flagged} ${flagged === 1 ? "is" : "are"} flagged for review`);
  }
  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      aria-labelledby="exam-confirm-title"
      aria-describedby="exam-confirm-text"
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-line bg-surface p-5 text-ink shadow-xl backdrop:bg-black/50 sm:p-6"
    >
      <h2 id="exam-confirm-title" className="text-lg font-semibold">
        Submit the test?
      </h2>
      <p id="exam-confirm-text" className="mt-2 text-muted">
        {parts.length > 0 && `${capitalize(parts.join(" and "))}. `}
        {unanswered > 0 ? "Unanswered questions count as wrong. " : ""}
        Answers cannot be changed after submitting.
      </p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          // biome-ignore lint/a11y/noAutofocus: the safe choice gets focus when the dialog opens.
          autoFocus
          onClick={onCancel}
          className="rounded-lg border border-line-strong bg-surface px-4 py-2 font-medium hover:bg-subtle"
        >
          Keep working
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink hover:bg-accent-hover"
        >
          Submit test
        </button>
      </div>
    </dialog>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
