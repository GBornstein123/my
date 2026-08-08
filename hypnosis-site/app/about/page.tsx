import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Who I am, how I came to this work, and what I will and won't claim for it.",
};

export default function AboutPage() {
  return (
    <div className="pb-8 pt-20 md:pt-28">
      {/* Header runs on the wider editorial column: at container-prose the
          56px display size ragged onto five lines with an 11-char stub. */}
      <header className="container-editorial max-w-3xl">
        <p className="eyebrow">About</p>
        <h1 className="display-face mt-6 text-display text-ink">
          I write about hypnosis the way I wish someone had written about it for
          me.
        </h1>
      </header>

      <div className="container-prose mt-14">
        <div className="prose-editorial">
          <p>
            Most of what is published about hypnosis falls into two piles.
            One pile is promotional and claims far more than the evidence
            carries. The other is debunking, and treats the whole subject as a
            parlour trick that stopped being interesting in 1890.
          </p>
          <p>
            Both piles miss the actual thing, which is stranger and more modest
            than either: attention can be arranged, arranged attention makes
            some difficult things easier, and nobody fully understands why it
            works as well as it does.
          </p>

          <h2>What I think this work is</h2>
          <p>
            A set of conditions, not a power. The practitioner supplies pacing,
            structure, and somewhere for attention to rest. Everything that
            actually happens is done by the person in the chair, using a
            capacity they already had.
          </p>
          <p>
            That framing is less flattering to practitioners, which may be why
            it is not the popular one. It is also the only version I have found
            that survives contact with what happens in real sessions.
          </p>

          <h2>What I won’t claim</h2>
          <p>
            I am not a doctor and none of this is medicine. Hypnosis is not a
            treatment for illness. It has real, studied uses alongside proper
            clinical care — never instead of it — and I say so to people who
            write to me, including when it costs me the conversation.
          </p>
          <p>
            I also do not do memory recovery, for reasons set out at length in{" "}
            <Link href="/writing/what-hypnosis-cannot-do">
              what hypnosis cannot do
            </Link>
            .
          </p>
        </div>

        {/* Factual bio deliberately left for Greg to fill — nothing invented. */}
        <aside className="mt-16 rounded-2xl border border-dashed border-rule bg-paper-sunk p-8">
          <p className="eyebrow text-accent">To be written by Greg</p>
          <p className="mt-4 leading-relaxed text-ink-soft">
            This is where the factual biography goes — training, how you came to
            the work, how long you have practised, where you are based, and any
            credentials you actually hold. I have left it blank rather than
            invent anything.
          </p>
        </aside>

        <div className="mt-16 rule-line pt-10">
          <p className="display-face text-xl text-ink">
            Questions, corrections, disagreements
          </p>
          <p className="mt-3 leading-relaxed text-ink-soft">
            All welcome, sceptical ones especially.{" "}
            <Link
              href="/contact"
              className="text-ink underline decoration-accent underline-offset-4"
            >
              Get in touch
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
