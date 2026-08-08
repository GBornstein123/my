import Link from "next/link";
import { AmbientField } from "@/components/ambient-field";
import { EssayCard } from "@/components/essay-card";
import { ContactForm } from "@/components/contact-form";
import { essays, featuredEssays, sessions } from "@/lib/content";

export default function Home() {
  const [lead, ...rest] = featuredEssays;

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <AmbientField />
        <div className="container-editorial pb-24 pt-24 md:pb-32 md:pt-32">
          <p className="rise eyebrow">Essays &amp; recorded sessions</p>
          <h1
            className="rise display-face mt-6 max-w-4xl text-hero text-ink"
            style={{ animationDelay: "80ms" }}
          >
            Hypnosis is not a trick.
            {/* Hard break composes the desktop two-liner; on mobile it fights
                the natural wrap and strands "arranged." on its own line. */}
            <br className="hidden md:inline" /> It is attention, arranged.
          </h1>
          <p
            className="rise mt-8 max-w-xl text-lg leading-relaxed text-ink-soft md:text-xl"
            style={{ animationDelay: "160ms" }}
          >
            Writing about the trance state without the mysticism or the
            marketing — what it actually is, what it can be used for, and the
            fairly short list of things it cannot do.
          </p>
          <div
            className="rise mt-12 flex flex-wrap items-center gap-4"
            style={{ animationDelay: "240ms" }}
          >
            {/* Both carry a border so the 1px outline can't make the outlined
                button 2px taller than the filled one. */}
            <Link
              href="/writing"
              className="rounded-full border border-transparent bg-cta px-7 py-3.5 text-paper no-underline transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px"
            >
              Read the essays
            </Link>
            <Link
              href="/listen"
              className="rounded-full border border-rule-strong px-7 py-3.5 text-ink no-underline transition-colors duration-300 hover:border-accent hover:text-accent"
            >
              Listen to a session
            </Link>
          </div>
        </div>
      </section>

      {/* Writing */}
      <section className="container-editorial">
        <SectionHead
          eyebrow="Writing"
          title="Recent essays"
          href="/writing"
          linkLabel={`All ${essays.length} essays`}
        />

        <div className="mt-12 grid gap-14 md:grid-cols-[1.35fr_1fr] md:gap-16">
          {lead && <EssayCard essay={lead} size="lead" />}
          <div className="flex flex-col gap-12 border-rule md:border-l md:pl-16">
            {rest.map((essay) => (
              <EssayCard key={essay.slug} essay={essay} />
            ))}
          </div>
        </div>
      </section>

      {/* Listen */}
      <section className="container-editorial mt-section">
        {/* Bleed out by exactly the gutter it re-applies, so panel content
            lands on the same left edge as every other section. */}
        <div className="-mx-gutter rounded-none bg-paper-sunk px-gutter py-16 md:rounded-3xl md:py-20">
          <SectionHead
            eyebrow="Listen"
            title="Recorded sessions"
            href="/listen"
            linkLabel="All sessions"
          />
          <p className="mt-6 max-w-xl text-ink-soft">
            Free to listen to, no account, no email required. Headphones help.
            Never listen while driving or operating anything.
          </p>

          {/* A divided list on the real grid — not cards nested in a box in a
              panel, which read as a component demo and left dead gutter. */}
          <ul className="mt-12 grid gap-x-16 sm:grid-cols-2">
            {sessions.map((session) => (
              <li
                key={session.slug}
                className="border-t border-rule-strong py-7"
              >
                <div className="flex items-baseline gap-3">
                  <h3 className="display-face-sm text-xl text-ink">
                    {session.title}
                  </h3>
                  <span className="text-[0.8125rem] tabular-nums text-ink-muted">
                    {session.duration}
                  </span>
                </div>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {session.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="container-editorial mt-section">
        <div className="grid gap-12 md:grid-cols-[1fr_1.15fr] md:gap-20">
          <div>
            <p className="eyebrow">Contact</p>
            <h2 className="display-face mt-5 text-display text-ink">
              Questions are welcome.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft">
              Sceptical ones especially. If something here seems overstated, I
              would rather hear it than not.
            </p>
            <p className="mt-4 leading-relaxed text-ink-muted">
              If you are in distress or managing a diagnosed condition, please
              speak to a clinician. I will say the same thing if you write, so
              this saves us both a step.
            </p>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}

function SectionHead({
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-rule pb-6">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="display-face mt-4 text-display text-ink">{title}</h2>
      </div>
      <Link
        href={href}
        className="group text-[0.9375rem] text-ink-soft no-underline transition-colors hover:text-accent"
      >
        {linkLabel}
        <span
          aria-hidden
          className="ml-2 inline-block transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
        >
          →
        </span>
      </Link>
    </div>
  );
}
