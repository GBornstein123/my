# SPINE — shared brief for all agents

This file is the single source of truth. Every deliverable must be consistent with it.
If your research contradicts something here, say so loudly in your output rather than silently diverging.

## The model (one paragraph)
A faceless X page built around ONE specific, expensive problem. No face, no name, no personal story.
Content describes the problem in painful specificity. A digital product on Gumroad solves it.
The page is pure distribution. Product is built BEFORE the page, because the product determines the content.

## The niche
**Independent contractor / 1099 self-employment taxes.**

Why it passes the four filters:
1. Financial consequence — underpaid quarterly estimates trigger IRS underpayment penalties plus interest;
   missed deductions cost four figures a year; a first-year 1099 worker who set aside nothing faces a
   five-figure April bill. Real money, measurable.
2. ROI is arithmetic — a $47 guide against a $3,000+ avoidable tax bill or penalty closes itself.
3. Information is scattered — split across IRS publications written for accountants, contradictory blog
   posts, and state-level rules. It exists. Nobody has organized it into a sequence a panicking person
   can follow at 11pm.
4. Window — recurring, seasonal (Jan/Apr/Jun/Sep quarterly dates), and continuously replenished by every
   person who goes independent for the first time.

## Buyer portrait (provisional — Agent 1 validates and sharpens this)
Someone 8–14 months into their first year of full-time 1099 work — a freelance designer, a contract
nurse, a rideshare/delivery driver who crossed into real income, a newly independent consultant. They
made roughly $60–95k, treated the gross like a salary, and set aside nothing or "some." They have
searched "how much should I set aside for taxes" and gotten answers between 15% and 40%. They have
heard "quarterly taxes" and don't know whether they've already missed one. They've read that they can
deduct things but are afraid of deducting wrong and being audited. They are not looking for education —
they are looking for a sequence: what do I do, in what order, by when, and what number do I write down.
They will pay to make the uncertainty stop.

## The product
Title direction: the guide a 1099 contractor actually needs — plain language, real numbers, no jargon.
Format: PDF, 6,000+ words, Canva-formatted, sold on Gumroad.
Price: $47 launch price (bottom of the $37–97 band, to accelerate review velocity), raise after 100 reviews.

## Non-negotiable constraints (apply to EVERY agent)
- **Tax content must be verifiable.** Every number, rate, threshold, deadline, or form name must be
  traceable to a primary source (IRS.gov publications, forms, and instructions). Where you state a figure,
  cite the publication/form. Where a figure is year-dependent, label the tax year explicitly and flag it
  in a "VERIFY BEFORE PUBLISH" list at the end of your file. Do not invent numbers. Do not state a rate
  from memory without marking it for verification.
- **Not tax advice.** The product and content include a plain disclaimer: educational, not tax or legal
  advice, consult a CPA for your situation. Never imply the guide replaces a professional.
- **No copied Reddit text.** Real posts are for understanding the problem, not for lifting. Any example
  must be rewritten as a composite scenario, never a quoted or lightly-reworded stranger's post.
- **Faceless, but honest.** No fake credentials, no invented CPA/EA status, no fabricated testimonials,
  no invented revenue screenshots, no claimed personal story. The page speaks about the problem, never
  about a person who doesn't exist.
- **Tone**: written for someone reading at 11pm in a panic. Short sentences. Second person. Specific
  numbers over adjectives. No motivation, no inspiration, no hustle language.

## Where to write
Write ONLY to your assigned paths under /home/user/my/faceless-page-system/. Do not edit other agents'
files. Do not touch anything else in the repo. Do not commit — the orchestrator commits.

## Environment constraint (verified 2026-09-05) — READ THIS

This build was produced in a sandbox whose network egress proxy blocks several domains outright.
Confirmed blocked, by direct test:

- **reddit.com** — denied by the egress proxy (403 on CONNECT) AND separately blocked by Reddit
  against Anthropic's fetcher user agent. No workaround exists in this environment.
- **irs.gov** — denied by the egress proxy (EGRESS_BLOCKED).

General web search works and returns secondary sources (tax blogs, CPA marketing sites, calculator
tools). It does not return IRS pages.

Two consequences, both load-bearing:

1. **No agent read Reddit.** Step 1 of the playbook — mining real threads for real problem
   situations — was NOT performed. Problem situations in these files are constructed from domain
   knowledge and secondary reporting. They are labeled as such. They are useful seed material and
   they are not field research. The Reddit pass remains the single highest-value unfinished step,
   and it has to be done by a human with a browser.

2. **No tax figure here is primary-source verified.** Every rate, threshold, deadline, and form
   reference came from secondary sources. Each is flagged and tabulated in the VERIFY BEFORE
   PUBLISH / VERIFY BEFORE POSTING sections with the IRS URL to check it against. Nothing ships
   until those tables are worked line by line against irs.gov from an unrestricted connection.

If a file anywhere in this system implies a Reddit thread was read or an IRS publication was
retrieved, that is an error — flag it and correct it rather than trusting it.
