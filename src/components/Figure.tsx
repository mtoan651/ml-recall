import type { FigureView } from "../lib/types";
import { Html } from "./Html";

/** A figure on a white card (diagrams are drawn for light backgrounds), lazy-loaded. */
export function Figure({ figure, compact = false }: { figure: FigureView; compact?: boolean }) {
  return (
    <figure className={compact ? "mt-2" : "my-4"}>
      <div className="overflow-hidden rounded-lg border border-line bg-white p-2 sm:p-3">
        <img
          src={figure.src}
          alt={figure.alt}
          loading="lazy"
          decoding="async"
          className={`mx-auto h-auto max-w-full ${compact ? "max-h-40" : ""}`}
        />
      </div>
      {figure.captionHtml && (
        <figcaption className="mt-2 text-sm text-muted">
          <Html html={figure.captionHtml} />
        </figcaption>
      )}
    </figure>
  );
}
