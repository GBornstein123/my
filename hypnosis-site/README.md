# Greg Bornstein — hypnosis essays & recorded sessions

A personal-brand content hub: essays, recorded sessions, and a contact form.
Next.js 16 (App Router), React 19, Tailwind CSS v4. No database, no CMS —
content lives in `lib/content.ts`.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run build && npm run start   # production build
```

## Deploy to Vercel

The app lives in a **subdirectory** of this repo, so the root directory has to
be set during import — everything else is stock.

1. <https://vercel.com/new> → import `GBornstein123/my`
2. **Root Directory** → `hypnosis-site` (this is the step people miss; without
   it the build fails because there's no `package.json` at the repo root)
3. **Branch** → whichever branch carries this work
4. Framework preset auto-detects as Next.js. Build command, output directory,
   and install command all stay on their defaults
5. Deploy

No environment variables are required for the site to build and run.

### After the first deploy

Set `NEXT_PUBLIC_SITE_URL` to the live origin (e.g. `https://gregbornstein.com`)
in Vercel's project settings. It feeds `metadataBase` in `app/layout.tsx`, which
is what makes Open Graph and Twitter card URLs absolute when the site is shared.
Without it, metadata falls back to `http://localhost:3000`.

## Before this is actually live

Four things are deliberately unfinished, because they need Greg rather than a
build step.

**1. The contact form doesn't send.** `app/api/contact/route.ts` validates the
payload and returns 501. Wire it to a mail provider — with
[Resend](https://resend.com), that's roughly:

```ts
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: "site@yourdomain.com",
  to: "you@yourdomain.com",
  replyTo: body.email,
  subject: `${body.reason} — ${body.name}`,
  text: body.message,
});
return NextResponse.json({ ok: true });
```

The form already surfaces a real error state, so a failed send is visible
rather than silent. Add spam protection (honeypot field or Turnstile) at the
same time — a public form with no gate will collect junk within days.

**2. The About biography is blank.** `app/about/page.tsx` has a marked block
where training, credentials, how you came to the work, and where you're based
go. Nothing was invented to fill it.

**3. All essay and session copy is draft.** `lib/content.ts` — written to give
the layout real prose to hold, not to publish under your name. The voice is a
starting point; the facts and opinions should be yours.

**4. No audio files exist.** `components/session-player.tsx` looks for
`/public/audio/<slug>.mp3` and shows an honest "not published yet" message when
one is missing. Drop the recordings in and they play.

Also worth doing before launch: replace `app/favicon.ico` (still the Next.js
default) and add an OG image.

## A note on claims

Copy across the site stays experiential rather than therapeutic, and both the
footer and `/listen` carry a not-medical-advice line. This is deliberate —
health claims on a hypnosis site carry real regulatory exposure, and the
narrower claim is more credible anyway. Worth keeping that constraint if you
rewrite the copy.

## Structure

```
app/
  page.tsx              home
  writing/              essay index + [slug] template
  listen/               recorded sessions
  about/  contact/
  api/contact/route.ts  form endpoint (stubbed)
  globals.css           design tokens + editorial utilities
components/             header, footer, cards, player, form
lib/content.ts          all essay and session content
```

Design tokens live in the `@theme` block in `app/globals.css`. Note that the
font CSS variables are attached to `<html>`, not `<body>` — the `@theme` tokens
that reference them are declared at `:root`, and custom properties substitute at
their declaring element. Moving them to `<body>` silently breaks every font on
the site while the build still passes.
