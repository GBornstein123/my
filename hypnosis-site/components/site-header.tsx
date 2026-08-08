"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const nav = [
  { href: "/writing", label: "Writing" },
  { href: "/listen", label: "Listen" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isCurrent = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/85 backdrop-blur-md">
      <div className="container-editorial flex h-16 items-center justify-between gap-4 md:h-20">
        <Link
          href="/"
          className="group flex shrink-0 items-baseline gap-2.5 text-ink no-underline"
        >
          <span className="display-face-sm whitespace-nowrap text-lg md:text-xl">
            Greg Bornstein
          </span>
          <span
            aria-hidden
            className="hidden h-px w-6 bg-rule-strong transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-10 group-hover:bg-accent md:block"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 sm:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent(item.href) ? "page" : undefined}
              className="rounded-full px-3.5 py-2 text-[0.9375rem] text-ink-soft transition-colors duration-200 hover:text-ink aria-[current=page]:text-ink"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="ml-2 shrink-0 whitespace-nowrap rounded-full border border-transparent bg-cta px-5 py-2 text-[0.9375rem] text-paper transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px"
          >
            Get in touch
          </Link>
        </nav>

        {/* Mobile trigger */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="-mr-2 flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-[0.9375rem] text-ink-soft sm:hidden"
        >
          Menu
          <svg viewBox="0 0 20 20" className="size-4" aria-hidden>
            <path
              d={open ? "M5 5l10 10M15 5L5 15" : "M3 6h14M3 12h14"}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          className="container-editorial border-t border-rule pb-6 pt-2 sm:hidden"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={isCurrent(item.href) ? "page" : undefined}
              className="block border-b border-rule py-3.5 text-ink-soft aria-[current=page]:text-ink"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/contact"
            onClick={() => setOpen(false)}
            className="mt-5 block w-full rounded-full bg-cta px-5 py-3 text-center text-paper"
          >
            Get in touch
          </Link>
        </nav>
      )}
    </header>
  );
}
