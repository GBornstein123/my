import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-rule bg-paper-sunk">
      <div className="container-editorial py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="max-w-sm">
            <p className="display-face text-2xl text-ink">Greg Bornstein</p>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
              Essays and recorded sessions on hypnosis, attention, and
              suggestion — what the state actually is, and what it is not.
            </p>
          </div>

          <nav aria-label="Site" className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Site
            </p>
            {[
              { href: "/writing", label: "Writing" },
              { href: "/listen", label: "Listen" },
              { href: "/about", label: "About" },
              { href: "/contact", label: "Contact" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="w-fit text-[0.9375rem] text-ink-soft transition-colors hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Elsewhere
            </p>
            <a
              href="/contact"
              className="w-fit text-[0.9375rem] text-ink-soft transition-colors hover:text-ink"
            >
              Write to me
            </a>
          </div>
        </div>

        <div className="mt-16 flex flex-col justify-between gap-4 border-t border-rule pt-8 text-[0.8125rem] text-ink-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Greg Bornstein. All rights reserved.</p>
          <p className="max-w-md text-balance sm:text-right">
            Nothing here is medical advice. Hypnosis is not a treatment for
            illness and does not replace care from a clinician.
          </p>
        </div>
      </div>
    </footer>
  );
}
