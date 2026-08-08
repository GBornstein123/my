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
        <p className="eyebrow">Writing</p>
        <h1 className="display-face mt-6 text-display text-ink">
          Everything I’ve published, most recent first.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-ink-soft">
          Long pieces on the mechanism, shorter notes on things that come up
          often, and field notes from actual sessions with details changed.
        </p>
      </header>

      {/* A dated list reads like an archive; a 3-up card wall left a permanent
          empty cell at five essays and will at any odd count. */}
      <div className="mt-20 flex flex-col border-t border-rule">
        {essays.map((essay) => (
          <div key={essay.slug} className="border-b border-rule py-12">
            <EssayCard essay={essay} />
          </div>
        ))}
      </div>
    </div>
  );
}
