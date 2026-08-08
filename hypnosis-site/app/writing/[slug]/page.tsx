import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { essays, formatDate, getEssay } from "@/lib/content";

export function generateStaticParams() {
  return essays.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const essay = getEssay(slug);
  if (!essay) return {};
  return {
    title: essay.title,
    description: essay.dek,
    openGraph: { title: essay.title, description: essay.dek, type: "article" },
  };
}

export default async function EssayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const essay = getEssay(slug);
  if (!essay) notFound();

  const index = essays.findIndex((e) => e.slug === slug);
  const next = essays[index + 1] ?? essays[0];

  return (
    <article className="pb-8 pt-20 md:pt-28">
      <header className="container-prose">
        <div className="eyebrow flex items-center gap-3">
          <span>{essay.tag}</span>
          <span aria-hidden className="h-px w-4 bg-rule-strong" />
          <time dateTime={essay.date}>{formatDate(essay.date)}</time>
          <span aria-hidden className="h-px w-4 bg-rule-strong" />
          <span>{essay.readingTime}</span>
        </div>

        <h1 className="display-face mt-7 text-[clamp(2.25rem,5.2vw,3.75rem)] text-ink">
          {essay.title}
        </h1>
        <p className="mt-6 text-balance font-[family-name:var(--font-reading)] text-xl leading-relaxed text-ink-muted">
          {essay.dek}
        </p>
      </header>

      <div className="container-prose mt-14">
        <div className="prose-editorial">
          {essay.body.map((block, i) => {
            if (block.startsWith("## ")) {
              return <h2 key={i}>{block.slice(3)}</h2>;
            }
            if (block.startsWith("> ")) {
              return <blockquote key={i}>{block.slice(2)}</blockquote>;
            }
            return <p key={i}>{renderEmphasis(block)}</p>;
          })}
        </div>
      </div>

      <div className="container-prose mt-24">
        <div className="rule-line pt-10">
          <p className="eyebrow">
            Read next
          </p>
          <Link
            href={`/writing/${next.slug}`}
            className="group mt-5 block no-underline"
          >
            <h2 className="display-face text-title text-ink">
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-[length:100%_1px]">
                {next.title}
              </span>
            </h2>
            <p className="mt-3 text-ink-soft">{next.dek}</p>
          </Link>
        </div>

        <div className="mt-16 rounded-2xl bg-paper-sunk p-8">
          <p className="display-face-sm text-xl text-ink">
            Something here seem wrong to you?
          </p>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Corrections and disagreements are genuinely welcome —{" "}
            <Link
              href="/contact"
              className="text-ink underline decoration-accent underline-offset-4"
            >
              write to me
            </Link>
            .
          </p>
        </div>
      </div>
    </article>
  );
}

/** Minimal *emphasis* support so draft copy can carry italics. */
function renderEmphasis(text: string) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) =>
    part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
      <em key={i}>{part.slice(1, -1)}</em>
    ) : (
      part
    ),
  );
}
