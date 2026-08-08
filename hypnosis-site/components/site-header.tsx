import Link from "next/link";

const nav = [
  { href: "/writing", label: "Writing" },
  { href: "/listen", label: "Listen" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/85 backdrop-blur-md">
      <div className="container-editorial flex h-16 items-center justify-between gap-6 md:h-20">
        <Link
          href="/"
          className="group flex items-baseline gap-2.5 text-ink no-underline"
        >
          <span className="display-face text-lg leading-none md:text-xl">
            Greg Bornstein
          </span>
          <span
            aria-hidden
            className="hidden h-px w-6 bg-rule transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-10 group-hover:bg-accent sm:block"
          />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-2.5 py-2 text-[0.9375rem] text-ink-soft transition-colors duration-200 hover:text-ink sm:px-3.5"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="ml-1 rounded-full bg-ink px-4 py-2 text-[0.9375rem] text-paper transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px sm:ml-2 sm:px-5"
          >
            Get in touch
          </Link>
        </nav>
      </div>
    </header>
  );
}
