import Link from "next/link";
import { formatDate, type Essay } from "@/lib/content";

export function EssayCard({
  essay,
  size = "default",
}: {
  essay: Essay;
  size?: "default" | "lead";
}) {
  const isLead = size === "lead";

  return (
    <article className="group relative">
      <Link href={`/writing/${essay.slug}`} className="block no-underline">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-ink-muted">
          <span className="text-accent">{essay.tag}</span>
          <span aria-hidden className="h-px w-4 bg-rule" />
          <time dateTime={essay.date}>{formatDate(essay.date)}</time>
        </div>

        <h3
          className={`display-face mt-4 text-ink ${
            isLead ? "text-[clamp(1.75rem,3.4vw,2.75rem)]" : "text-title"
          }`}
        >
          <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-[length:100%_1px]">
            {essay.title}
          </span>
        </h3>

        <p
          className={`mt-3 max-w-prose text-ink-soft ${
            isLead ? "text-lg leading-relaxed" : "text-[0.9375rem] leading-relaxed"
          }`}
        >
          {essay.dek}
        </p>

        {/* The lead carries an opening excerpt so it reads as the anchor of the
            section rather than a taller version of the same card. */}
        {isLead && (
          <p className="mt-6 border-l-2 border-rule pl-5 font-[family-name:var(--font-reading)] text-[1.0625rem] leading-relaxed text-ink-muted">
            {truncate(essay.body[0], 240)}
          </p>
        )}

        <p className="mt-5 text-[0.8125rem] text-ink-muted">
          {essay.readingTime} read
        </p>
      </Link>
    </article>
  );
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}
