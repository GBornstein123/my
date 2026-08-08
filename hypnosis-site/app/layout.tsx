import type { Metadata } from "next";
import { Fraunces, Inter, Newsreader } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Greg Bornstein — Hypnosis, attention, and the shape of the mind",
    template: "%s — Greg Bornstein",
  },
  description:
    "Essays and recorded sessions on hypnosis, attention, and suggestion — what the trance state actually is, and what it is not.",
  openGraph: {
    type: "website",
    title: "Greg Bornstein — Hypnosis, attention, and the shape of the mind",
    description:
      "Essays and recorded sessions on hypnosis, attention, and suggestion.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Font vars must live on :root — the @theme tokens that reference them
    // (--font-display, --font-body) are declared there and substitute locally.
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${newsreader.variable}`}
    >
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-2.5 focus:text-sm focus:text-paper"
        >
          Skip to content
        </a>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
