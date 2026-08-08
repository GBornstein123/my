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
        <div className="container-editorial pb-24 pt-24 md:pb-36 md:pt-36">
          <p className="rise text-xs uppercase tracking-[0.18em] text-ink-muted">
            Essays &amp; recorded sessions
          </p>
          <h1
            className="rise display-face mt-7 max-w-4xl text-hero text-ink"
            style={{ animationDelay: "80ms" }}
          >
            Hypnosis is not a trick.
            <br />
            It is attention, arranged.
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
            className="rise mt-11 flex flex-wrap items-center gap-4"
            style={{ animationDelay: "240ms" }}
          >
            <Link
              href="/writing"
              className="rounded-full bg-ink px-7 py-3.5 text-paper no-underline transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px"
            >
              Read the essays
            </Link>
            <Link
              href="/listen"
              className="rounded-full border border-rule px-7 py-3.5 text-ink no-underline transition-colors duration-300 hover:border-accent hover:text-accent"
            >
              Listen to a session
            </Link>
          </div>
        </div>
      </section>

      {/* Writing */}
      <section className="container-editorial pt-8">
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
      <section className="container-editorial mt-32">
        <div className="rounded-3xl bg-paper-sunk px-gutter py-16 md:py-20">
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

          <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-2">
            {sessions.map((session) => (
              <li key={session.slug} className="bg-paper p-7 md:p-8">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="display-face text-xl text-ink">
                    {session.title}
                  </h3>
                  <span className="shrink-0 text-[0.8125rem] tabular-nums text-ink-muted">
                    {session.duration}
                  </span>
                </div>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {session.description}
                </p>
                <p className="mt-5 inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs text-accent-ink">
                  {session.best}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="container-editorial mt-32">
        <div className="grid gap-12 md:grid-cols-[1fr_1.15fr] md:gap-20">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
              Contact
            </p>
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
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
          {eyebrow}
        </p>
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
