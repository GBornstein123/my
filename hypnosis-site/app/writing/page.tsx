import type { Metadata } from "next";
import { EssayCard } from "@/components/essay-card";
import { essays } from "@/lib/content";

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Essays on hypnosis, attention, and suggestion — without the mysticism or the marketing.",
};

export default function WritingIndex() {
  return (
    <div className="container-editorial pb-8 pt-20 md:pt-28">
      <header className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
          Writing
        </p>
        <h1 className="display-face mt-6 text-display text-ink">
          Everything I&apos;ve published, most recent first.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-ink-soft">
          Long pieces on the mechanism, shorter notes on things that come up
          often, and field notes from actual sessions with details changed.
        </p>
      </header>

      <div className="mt-20 grid gap-x-16 gap-y-16 border-t border-rule pt-14 sm:grid-cols-2 lg:grid-cols-3">
        {essays.map((essay) => (
          <EssayCard key={essay.slug} essay={essay} />
        ))}
      </div>
    </div>
  );
}
