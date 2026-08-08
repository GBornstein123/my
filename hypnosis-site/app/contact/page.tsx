import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Questions, corrections, and disagreements are welcome — sceptical ones especially.",
};

export default function ContactPage() {
  return (
    <div className="container-editorial pb-8 pt-20 md:pt-28">
      <div className="grid gap-14 md:grid-cols-[1fr_1.15fr] md:gap-20">
        <header className="md:pt-2">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
            Contact
          </p>
          <h1 className="display-face mt-6 text-display text-ink">
            Write to me.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            Questions about the work, corrections to something I&apos;ve
            published, or disagreements — the last of those most of all.
          </p>

          <dl className="mt-12 flex flex-col gap-8 border-t border-rule pt-10">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Response time
              </dt>
              <dd className="mt-2 leading-relaxed text-ink-soft">
                A few days. I read and answer everything myself, which is slower
                and better.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                If you are struggling
              </dt>
              <dd className="mt-2 leading-relaxed text-ink-soft">
                Please speak to a clinician rather than waiting on me. This work
                is not a treatment for illness and is not a substitute for care.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                What I do with your message
              </dt>
              <dd className="mt-2 leading-relaxed text-ink-soft">
                Nothing except read and reply. No mailing list, no automation,
                nothing passed on.
              </dd>
            </div>
          </dl>
        </header>

        <ContactForm />
      </div>
    </div>
  );
}
