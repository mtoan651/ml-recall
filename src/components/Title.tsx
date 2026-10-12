import { viTitle } from "../lib/i18n";
import { useLang } from "../lib/use-lang";

/**
 * A topic or domain title in an island: English, or in the Vietnamese interface the Vietnamese
 * title followed by the muted English one — the same markup as I18nTitle.astro.
 */
function TitleText({ vi, en }: { vi: string | undefined; en: string }) {
  const lang = useLang();
  if (lang !== "vi" || !vi || vi === en) return <>{en}</>;
  return (
    <>
      {vi}
      <span className="i18n-en" lang="en">
        {` · ${en}`}
      </span>
    </>
  );
}

export function TopicTitle({ id, en }: { id: string; en: string }) {
  return <TitleText vi={viTitle({ topic: id, en })} en={en} />;
}

export function DomainTitle({ id, en }: { id: string; en: string }) {
  return <TitleText vi={viTitle({ domain: id, en })} en={en} />;
}
