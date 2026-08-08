import type { Metadata } from "next";
import { sessions } from "@/lib/content";
import { SessionPlayer } from "@/components/session-player";

export const metadata: Metadata = {
  title: "Listen",
  description:
    "Recorded hypnosis sessions — free, no account, no email required.",
};

export default function ListenPage() {
  return (
    <div className="container-editorial pb-8 pt-20 md:pt-28">
      <header className="max-w-2xl">
        <p className="eyebrow">Listen</p>
        <h1 className="display-face mt-6 text-display text-ink">
          Recorded sessions, free and without conditions.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-ink-soft">
          No account, no email capture, no upsell at the end. Headphones help
          but are not required.
        </p>
      </header>

      <div
        role="note"
        className="mt-12 max-w-2xl rounded-2xl border border-rule bg-paper-sunk p-6"
      >
        <p className="text-[0.9375rem] leading-relaxed text-ink-soft">
          <strong className="font-semibold text-ink">Before you start.</strong>{" "}
          Never listen while driving or operating machinery. These recordings
          are not treatment for any condition — if you are in distress or
          managing a diagnosis, speak to a clinician.
        </p>
      </div>

      {/* Same column as the header — the players were the widest and emptiest
          element on the page, with 217px of dead gutter per card. */}
      <div className="mt-16 flex max-w-3xl flex-col gap-px overflow-hidden rounded-2xl border border-rule bg-rule">
        {sessions.map((session) => (
          <SessionPlayer key={session.slug} session={session} />
        ))}
      </div>
    </div>
  );
}
