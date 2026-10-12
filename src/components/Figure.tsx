import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FigureView } from "../lib/types";
import { useT } from "../lib/use-lang";
import { Html } from "./Html";
import { ExpandIcon } from "./Icons";

/**
 * A figure on a white card (diagrams are drawn for light backgrounds), lazy-loaded. It can be
 * enlarged in a modal dialog: a click on the figure, or the corner button (only the button for
 * compact option images, where a click on the image selects the option).
 */
export function Figure({ figure, compact = false }: { figure: FigureView; compact?: boolean }) {
  const t = useT();
  const [zoomed, setZoomed] = useState(false);
  const image = (
    <img
      src={figure.src}
      alt={figure.alt}
      loading="lazy"
      decoding="async"
      className={`mx-auto h-auto max-w-full ${compact ? "max-h-40" : ""}`}
    />
  );
  return (
    <figure className={compact ? "mt-2" : "my-4"}>
      <div className="relative overflow-hidden rounded-lg border border-line bg-white p-2 sm:p-3">
        {compact ? (
          image
        ) : (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="block w-full cursor-zoom-in"
            aria-label={t("Enlarge figure: {alt}", { alt: figure.alt })}
          >
            {image}
          </button>
        )}
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label={
            compact ? t("Enlarge image: {alt}", { alt: figure.alt }) : t("Enlarge figure")
          }
          tabIndex={compact ? 0 : -1}
          className="absolute top-1.5 right-1.5 rounded-md border border-slate-300 bg-white/90 p-1 text-slate-600 opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100"
        >
          <ExpandIcon />
        </button>
      </div>
      {figure.captionHtml && (
        <figcaption className="mt-2 text-sm text-muted">
          <Html html={figure.captionHtml} />
        </figcaption>
      )}
      {zoomed &&
        createPortal(<Zoom figure={figure} onClose={() => setZoomed(false)} />, document.body)}
    </figure>
  );
}

/** The enlarged figure in a native modal dialog (Esc, the button or a click outside closes it). */
function Zoom({ figure, onClose }: { figure: FigureView; onClose: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [onClose]);
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Esc closes the dialog natively.
    <dialog
      ref={ref}
      aria-label={figure.alt}
      className="figure-zoom m-auto max-h-[95dvh] max-w-[95vw] rounded-xl border border-line bg-surface p-3 text-ink shadow-xl backdrop:bg-black/60"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === ref.current) ref.current.close();
      }}
    >
      <div className="rounded-lg bg-white p-2 sm:p-4">
        <img
          src={figure.src}
          alt={figure.alt}
          className="mx-auto h-auto max-h-[78dvh] w-auto max-w-full min-w-[min(80vw,40rem)] object-contain"
        />
      </div>
      <div className="mt-2 flex items-start gap-3">
        {figure.captionHtml ? (
          <Html html={figure.captionHtml} className="min-w-0 flex-1 text-sm text-muted" />
        ) : (
          <span className="flex-1" />
        )}
        <button
          type="button"
          onClick={() => ref.current?.close()}
          className="shrink-0 rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium hover:bg-subtle"
        >
          {t("Close")}
        </button>
      </div>
    </dialog>
  );
}
