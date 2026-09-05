# REVIEW ENGINE
Step 5 of the playbook — the system that turns buyers into reviewers, honestly.

Research date for every external fact in this file: **2026-09-05**. Platform behavior and
policy change without notice. Re-verify anything marked VERIFY before you act on it.

> ### RETRIEVAL STATUS — read this first
>
> **`gumroad.com` and `help.gumroad.com` were blocked by this environment's network egress
> proxy on 2026-09-05.** I could not open Gumroad's help articles, Terms of Service, or
> Prohibited Activities page directly.
>
> Everything in this file about Gumroad's mechanics and policy comes from **search-engine
> summaries of those pages**, not from the pages themselves. That is second-hand. It is good
> enough to design a system against; it is **not** good enough to rely on legally or
> operationally.
>
> **Before you send a single follow-up email, open these four URLs yourself and confirm:**
> - https://gumroad.com/help/article/222-product-ratings-on-gumroad
> - https://gumroad.com/help/article/131-using-workflows-to-send-automated-updates
> - https://help.gumroad.com/article/77-interacting-with-customers
> - https://gumroad.com/terms and https://gumroad.com/prohibited
>
> The follow-up messages in §5 are deliberately written **conservatively** so they stay on the
> right side of any reasonable reading of any marketplace review policy: they ask for an
> **honest** review, they offer **nothing** in exchange, and they never mention stars, ratings,
> or sentiment. Even if Gumroad's policy turns out to be stricter than the summaries suggest,
> these messages should survive it. What would *not* survive is anything you add to them.
>
> The FTC rule in §4.1 is a separate matter — I could not open `ftc.gov` either (also blocked),
> so those provisions are likewise summarized second-hand and are on the VERIFY list. Note that
> **the FTC rule binds you regardless of what Gumroad permits**, so verify it directly.

---

## 0. The one-paragraph version

Reviews are the only trust signal a faceless page can produce, because you have deliberately
given up the other ones — no face, no name, no credentials, no personal story. A buyer landing
on your Gumroad page has nothing to evaluate except the copy and the review block. That makes
review count the leading indicator: it moves before revenue does, and it is the thing that
makes later revenue possible. So you build a system to earn reviews — a day-7 message, a
day-21 message, a day-45 variant for non-responders, a tracking sheet, and a protocol for
handling a bad one. You do not buy reviews, write your own, or trade anything for a positive
rating. Those are federal law violations now, not just bad manners.

---

## 1. Why review count is the leading indicator — what the evidence actually says

### 1.1 What is reasonably well supported

**Going from zero reviews to a handful is the single biggest jump.**
Northwestern's Medill Spiegel Research Center, working with PowerReviews (published 2017),
found that a product page displaying five reviews converted roughly **270% better** than the
same page with no reviews, and that the marginal benefit of each additional review **drops
off rapidly after about five**. The same study found the effect was larger for higher-priced
items (~+380%) than lower-priced ones (~+190%).

Two things follow from this for your $47 guide:
- The first five reviews are worth more than the next fifty. Your review engine should be
  tuned to get from 0 → 5 as fast as honestly possible, not to grind toward 25.
- The price-sensitivity finding is mildly encouraging for a later price raise: reviews matter
  *more* as price goes up, which is an argument for raising price only after review count is
  established, not before. That matches the SPINE's sequencing ($47 launch, raise after
  reviews accumulate).

**Review *volume* tends to matter more than average *score*.**
Research on the App Store market (Lee & Raghu-style download studies, and follow-on work on
review impact on app downloads) has repeatedly found that the **number** of ratings has a
positive and statistically significant effect on downloads, while the **average rating score**
has a positive but comparatively small effect. Related e-commerce work (review volume and Q&A
valence on marketplace sales) points the same direction. The plain reading: a product with 40
reviews averaging 4.4 usually outperforms one with 4 reviews averaging 5.0.

**Why the mechanism is plausible for your specific buyer.**
Your buyer is buying a *tax* product from an anonymous account, at 11pm, while anxious. Their
dominant question is not "is this the best guide" — it is "is this a scam, and will I regret
spending $47." Reviews reduce perceived risk. That is exactly the mechanism the review
literature describes, and it is strongest precisely when the seller has no other credibility
signal. Facelessness raises the value of reviews to you above the published averages.

### 1.2 What the source playbook claims — and why you should not treat it as fact

The playbook this project is built from asserts two specific numbers:

| Playbook claim | Status |
|---|---|
| "34% conversion increase at 25 reviews" | **UNVERIFIED.** Single anonymous source. No study, sample size, product category, or measurement window given. |
| "Review rate goes from 11% to 31% with follow-up" | **UNVERIFIED.** Same. No baseline definition, no control group, no time window. |

Treat both as **marketing claims from one anonymous operator**, not as findings. Specifically:

- Neither figure is traceable to any published study. I searched for supporting public data on
  review-count-to-conversion effects in digital marketplaces and found the Spiegel/PowerReviews
  work and the app-store literature above. Neither produces a 34%-at-25-reviews result.
- The *shape* of the "34% at 25 reviews" claim is in tension with the best public evidence.
  Spiegel found sharply diminishing returns after ~5 reviews. A claim that a specific large
  jump happens at 25 implies a threshold effect that the published data does not show. It is
  not impossible — 25 reviews may be where a Gumroad page starts looking "established" rather
  than "new," which is a different mechanism — but nobody has measured it.
- An 11% → 31% review rate from follow-up is a near-tripling. It is directionally believable
  (asking works better than not asking) but the magnitude is unverifiable, and it is also
  confounded on Gumroad specifically, because **Gumroad already sends its own review reminder
  at day 5** (see §3). Any operator measuring "no follow-up" on Gumroad is not measuring a
  true zero-ask baseline.

**Do not repeat these numbers in your own marketing, to a VA, or to yourself.** If you
internalize "31% review rate" as a target you will conclude the system is broken when you get
9%, and you will start doing things you should not do to close the gap. That is exactly how
people end up buying reviews.

### 1.3 The honest framing to hold instead

> Reviews reduce a stranger's perceived risk of buying from an anonymous seller. The evidence
> that the first few reviews matter a great deal is solid. The evidence for any specific
> percentage at any specific count is not. Build the system, measure your own numbers, and
> trust those.

---

## 2. Measure your OWN conversion — the only numbers you should trust

You have a native, free way to measure this. Gumroad's sales analytics dashboard tracks
**views, sales, and conversion rate** per product, plus a referrer breakdown showing views,
purchases and conversion % per traffic source. That is everything you need for a before/after.

### 2.1 The measurement you can actually run

You cannot run a clean A/B test — Gumroad does not let you show reviews to half your visitors.
What you *can* run is a **pre/post with a fixed traffic source**, which is weaker but honest if
you report it honestly.

**Setup (do this before your first review lands):**

1. **Freeze your product page.** From the day of launch, do not change price, headline, cover
   image, bullet list, or description. Any change contaminates the comparison. Write the launch
   version into `page-copy-frozen-YYYY-MM-DD.md` so you can prove to yourself what it said.
2. **Record the baseline.** Every Sunday, open Gumroad Analytics → filter to this product →
   record views, sales, conversion rate for the trailing 7 days. Also record review count at
   that moment.
3. **Hold the traffic source constant.** Only count traffic from your X page (Gumroad's referrer
   table lets you isolate it). Traffic from a viral post, a newsletter mention, or Gumroad
   Discover converts at a completely different rate and will swamp the review effect.
4. **Wait for volume, not for time.** A week with 40 views tells you nothing. A conversion rate
   computed on fewer than ~200 views in a bucket is noise. Do not draw a conclusion until each
   side of the comparison has 200+ views from the same source.

**The comparison:**

```
Conversion rate, X-page traffic only, weeks where review count was 0
   = total purchases in those weeks / total views in those weeks

Conversion rate, X-page traffic only, weeks where review count was 5+
   = total purchases in those weeks / total views in those weeks

Lift = (post / pre) - 1
```

**Report it to yourself with the caveats attached**, e.g.:
"X-page traffic converted at 2.1% across 340 views with 0 reviews, and 3.0% across 410 views
with 6–9 reviews. Apparent lift ~43%. Confounded by: 6 weeks of page growth, different posts,
seasonality (Q3 vs Q4 tax anxiety). Directionally positive. Not a clean result."

That sentence is worth more than the playbook's 34%, because it is yours and you know exactly
how wrong it might be.

### 2.2 The second thing to measure: your own review rate

```
Review rate = reviews received / purchases delivered ≥ 21 days ago
```

Compute it monthly. Compute it separately for the cohort *before* you turned on the follow-up
sequence and the cohort *after*. That is your real answer to "does follow-up work" — and unlike
the playbook's 11%→31%, it will be a number about your product, your buyer, and your wording.

Expect it to be lower than you want. Digital-product review rates in the single digits to low
teens are common. If you get 15%+ with follow-up you are doing well.

---

## 3. How Gumroad reviews actually work (verified 2026-09-05)

**Provenance warning.** `gumroad.com` and `help.gumroad.com` were egress-blocked on
2026-09-05. Everything below is **reported from search-engine summaries** of Gumroad help
articles 222 ("Product ratings on Gumroad"), 344 ("Rate and review your purchase"), 131
("Using workflows to send automated updates") and 77 ("Interacting with customers"). I have
not read those pages. **Open them and confirm before building on them** — VERIFY list, §9.

What the summaries of Gumroad's help documentation report:

- **Who can review:** customers who purchased the product. They can rate and leave a written
  review **within one year of purchase**.
- **Gumroad's own reminder:** if a customer has not left a review, **Gumroad automatically emails
  them a reminder 5 days after purchase**. Customers can unsubscribe from these reminders via a
  link in that email.
- **Creator notification:** Gumroad emails you when a written review is submitted. You can turn
  these notifications off in settings (don't).
- **Creator response:** you can reply publicly to a review using the **"Respond"** control.
  Gumroad's own documentation frames this as a way to address dissatisfied customers and to
  update prospective buyers on fixes.
- **Soliciting reviews:** Gumroad's documentation explicitly contemplates creators soliciting
  reviews — by sending an email or building a **Workflow** targeted at customers of a specific
  product. Asking is allowed. *What* you offer in exchange for the ask is where the rules bite
  (§4).

### 3.1 The two delivery mechanisms

**Workflows (use this — it's the engine).**
A Gumroad Workflow is an automated email sequence triggered by a customer action. Documented
triggers include **new purchase**, new subscriber, member cancellation, new affiliate, and
abandoned cart. You set a **delay in hours, days, weeks, or months** after the trigger. This is
exactly the shape of a day-7 / day-21 / day-45 sequence: one workflow, three emails, three
delays. Gumroad sends them; you do nothing per-buyer.

**Emails / Posts (use this for one-offs).**
The manual customer-email feature lets you compose a message and send it to a filtered slice of
your customers — e.g. everyone who bought a specific product. Use this for things a workflow
can't do: shipping a corrected version of the guide to all existing buyers, or a deadline alert
tied to a calendar date rather than a purchase date.

### 3.2 The timing collision nobody mentions

Gumroad already emails a review reminder at **day 5**. If your first message lands at **day 7**,
your buyer gets two review-adjacent emails in 48 hours from the same product. That reads as
nagging and it is the fastest way to get unsubscribed.

Two ways to handle it, pick one and note it in your tracker so your data stays interpretable:

- **Option A (recommended): shift to day 10.** Same message, three days later, clear of
  Gumroad's reminder. You lose nothing.
- **Option B: keep day 7, but make it not-an-ask-first.** The day-7 message below is written
  value-first for exactly this reason — the review request is the last line, not the subject.
  This is survivable at day 7.

The messages below are written as day-7 / day-21 / day-45 because that is the specified cadence.
If you shift to day 10, shift the others to day 24 / day 48 to preserve the spacing, and update
your tracking sheet column headers.

---

## 4. The rules — what you will never do

These are not style preferences. The first three are federal law.

### 4.1 The FTC rule (16 CFR Part 465), effective 2024-10-21

The FTC's Rule on the Use of Consumer Reviews and Testimonials makes the following unlawful and
subject to **civil penalties**:

- **Fake reviews.** Creating, buying, selling, or disseminating reviews from anyone with no
  actual experience of the product. The rule **explicitly covers AI-generated reviews**. Writing
  a review for your own guide, or having a language model write five, is squarely inside this.
- **Insider reviews without disclosure.** A review by you, an employee, a VA, a friend, or a
  family member must disclose that relationship. In practice: don't.
- **Conditional incentivized reviews.** Providing compensation or any incentive **contingent on
  a review expressing a particular sentiment** — positive or negative. "Leave a 5-star review and
  I'll send you the bonus checklist" is a violation. So is anything that signals the desired
  sentiment while nominally asking for honesty.
- **Review suppression.** Using unfounded legal threats, intimidation, or false claims to get a
  negative review taken down, or misrepresenting that the reviews shown are all the reviews.

**The refund-to-delete trap.** Public reporting on Gumroad notes that refunding a purchase can
remove the associated review. Do not use refunds as a review-deletion tool. Refund because the
buyer deserves a refund; if a review disappears as a side effect of a legitimate refund, fine.
Refunding *in order to* erase criticism is review suppression, and on top of that a refund rate
above 25% can get your Gumroad account suspended (§ Gumroad ToS). You would be committing a
federal violation to acquire an account-termination risk. Don't.

### 4.2 What Gumroad allows, specifically

| Action | Allowed? | Basis |
|---|---|---|
| Emailing your buyers to ask for a review | **Yes** | Gumroad help docs describe soliciting reviews by email or Workflow as a normal creator action. |
| Targeting the ask to buyers of one specific product | **Yes** | Documented Workflow/email filtering. |
| Replying publicly to a review | **Yes** | The "Respond" control, documented. |
| Turning off review notifications | Yes (but don't) | Settings. |
| Offering a discount/bonus **conditioned on a positive review** | **No** | FTC 16 CFR 465. Also bad. |
| Writing or commissioning reviews | **No** | FTC 16 CFR 465. |
| Refunding to remove a negative review | **No** | FTC review suppression + Gumroad refund-rate risk. |

**VERIFY — this table is not authoritative.** Gumroad's *Terms of Service* and *Prohibited
Products and Activities* pages were **egress-blocked on 2026-09-05 and I could not read them**.
The "Allowed?" column above reflects what search summaries of Gumroad's *help* articles
describe as normal creator behavior — it is **not** a reading of Gumroad's actual policy
documents. Before launch, read `gumroad.com/terms` and `gumroad.com/prohibited` yourself and
confirm there is no additional or stricter clause on review solicitation. If you find one, it
governs and this table is wrong.

Two things are true regardless of what Gumroad's terms say:
- **The FTC rule binds you independently of any platform's policy.** A platform permitting
  something does not make it lawful.
- **The §5 messages are written to be safe under a stricter policy than the one described
  here.** They ask for honesty and offer nothing. If Gumroad turns out to prohibit *any*
  solicitation — which nothing in the available summaries suggests, but which you have not
  ruled out — turn the workflow off and keep the value-first content, which is useful on its
  own.

### 4.3 The house rules that go beyond the law

1. **Never ask for a *good* review. Ask for an *honest* one.** Every message below says
   "honest." This is not decoration — it is the line between a legal ask and an illegal one.
2. **Never offer anything in exchange for a review at all**, even unconditionally. The safe
   harbor is narrow, the FTC has said unconditional incentives can still be problematic if the
   framing signals a desired sentiment, and you do not need the risk to get 20 reviews.
3. **Never ask a buyer to change or remove a review.** You may reply. You may fix the product.
   You may tell them it's fixed. You may not ask them to edit.
4. **Your VA never touches reviews.** Not writing them, not responding to them, not asking about
   them. Review responses are owner-only. (See VA-PLAYBOOK.md §escalation.)

---

## 5. The messages

Tone rules from SPINE: short sentences, second person, specific numbers over adjectives, no
motivation, no hustle language, written for someone reading at 11pm. Every message leads with
something useful and ends with the ask, because a message that is only an ask gets deleted and
teaches the buyer to ignore your sender name.

Every message must carry the standard disclaimer. It is at the bottom of each one below.

> **Placeholder convention:** `[[NEXT_DEADLINE]]` means the next quarterly estimated tax due
> date. **Do not hardcode it from memory.** Pull it from the IRS Form 1040-ES instructions for
> the current tax year and update the workflow each quarter. See VERIFY list.

---

### 5.1 Day 7 — the "did you get to the number" message

**Subject:** The one page most people skip

**Body:**

```
You bought the guide a week ago.

Most people who buy it read the first section, feel better, and stop. If that's you, here's
the part that actually changes your April: the worksheet in the "set aside" section. It's the
only page where you write down a number.

Do that page tonight. It takes about fifteen minutes and you need your year-to-date income
and your business bank balance. When you're done you'll have one number — what to move into
a separate account — and one date — when it's due.

The next quarterly deadline is [[NEXT_DEADLINE]]. If you haven't set money aside yet, the
worksheet is what tells you whether you're behind and by how much.

Two things:

1. If you got stuck anywhere, reply to this email. I read every one. Tell me which page and
   what confused you — that's how the guide gets fixed.

2. If you've already used it, an honest review on the product page helps the next person
   decide whether it's worth $47. Good or bad. It takes a minute:
   [PRODUCT REVIEW LINK]

That's it.

--
This guide is educational information, not tax or legal advice. Your situation may differ.
For advice specific to you, talk to a CPA or enrolled agent.
```

**Why it's built this way:**
- The subject is not "leave a review." It survives landing near Gumroad's day-5 reminder.
- It gives one concrete instruction with a time estimate and a required-inputs list. Your buyer
  is anxious and executive-function-limited; "read the guide" is not an instruction, "do the
  worksheet, 15 minutes, have these two numbers ready" is.
- The reply invitation comes *before* the review ask. Replies are worth more than reviews at
  this stage — they are your product feedback loop and your negative-review prevention system.
  A buyer who tells you the guide confused them by email is a buyer who does not write a 2-star
  review about it.
- "Good or bad" is doing legal work. It is the honest-review framing in four words.

---

### 5.2 Day 21 — the "did it work" message

**Subject:** Did the number hold up?

**Body:**

```
Three weeks since you bought the guide.

By now you've either moved money into a separate account or you haven't. If you have: check it
against your actual income for the last three weeks. Freelance income moves. The percentage you
calculated on week one is wrong by now if your invoicing changed. Redo the worksheet — it's
five minutes the second time.

If you haven't moved anything yet, the honest read is that something in the guide didn't land.
That's useful to me. Reply and tell me where you stopped. I'd rather fix the page than have you
sitting on a guide you didn't use.

One more thing worth knowing: the deadline is [[NEXT_DEADLINE]]. Underpaying an estimate isn't
a fine you can talk your way out of later — the IRS charges interest on the shortfall from the
date it was due. Paying something is meaningfully better than paying nothing.

If the guide did what you needed, would you leave an honest review? Two sentences is plenty.
It's the only thing on the product page that isn't written by me:
[PRODUCT REVIEW LINK]

If it didn't, reply instead. I'd rather hear it directly.

--
This guide is educational information, not tax or legal advice. Your situation may differ.
For advice specific to you, talk to a CPA or enrolled agent.
```

**Why it's built this way:**
- Day 21 is the first point where the buyer can assess whether the product *worked*, which is
  the honest moment to ask for a verdict.
- "It's the only thing on the product page that isn't written by me" is the most effective true
  sentence available to a faceless seller. It names the exact reason reviews matter here.
- The explicit "if it didn't, reply instead" is not review suppression — you are not asking them
  to withhold a negative review, you are offering an additional channel. If they do both, fine.
  Do not follow it with "before you review, let me fix it." That crosses the line.

---

### 5.3 Day 45 — the non-responder variant

Send **only** to buyers who have not reviewed and have not replied to either prior message.
This is a last touch. It must be short, must contain no guilt, and must offer an exit.

**Subject:** Last one from me

**Body:**

```
Last email about this one.

Quick status check, then I'll leave you alone.

The next quarterly deadline is [[NEXT_DEADLINE]]. If you've set money aside and know your
number, you're done — nothing to do here.

If you bought the guide and never opened it, that happens, and it's worth ten minutes now
rather than a bad surprise in April. The section you want is the setup checklist. It's four
steps.

If you did use it, an honest review — even one line, even a critical one — is genuinely useful
to the next person deciding whether to spend $47 on something written by someone they've never
heard of:
[PRODUCT REVIEW LINK]

And if you'd rather not hear from me again, unsubscribe at the bottom. No hard feelings.

--
This guide is educational information, not tax or legal advice. Your situation may differ.
For advice specific to you, talk to a CPA or enrolled agent.
```

**Why it's built this way:**
- Announcing it's the last email raises response rate and, more importantly, is true. Send a
  fourth and you are a spammer.
- "even a critical one" is a deliberate, repeated signal that you are not fishing.
- The unsubscribe line is not optional. It is a legal requirement in most jurisdictions and
  Gumroad handles the mechanics, but saying it in plain language costs nothing and buys trust.

---

### 5.4 Setting the sequence up in Gumroad

1. Gumroad dashboard → **Workflows** → **New workflow**.
2. Trigger: **Purchase** (new purchase of a product).
3. Audience: filter to **this product only**. If you later add a second product, each gets its
   own workflow — the messages reference specific pages of a specific guide.
4. Email 1: delay **7 days** (or 10, per §3.2). Paste §5.1.
5. Email 2: delay **21 days**. Paste §5.2.
6. Email 3: delay **45 days**. Paste §5.3.
7. **Publish** the workflow. An unpublished workflow does nothing and gives no warning.
8. **Buy your own product** with a separate email address, at the real price, and let the
   sequence run against you. Check every link, the review link especially, and check how it
   renders on a phone. This costs you the Gumroad fee on one $47 sale. Do it anyway.

**The one thing a workflow can't do:** exclude people who already reviewed or replied.
Gumroad's workflow targeting is trigger-and-delay, not conditional-on-behavior. So the day-45
email will go to people who already left you a review unless you handle it manually.

Two options:
- **Manual (recommended at low volume):** make the day-45 email a **manual Emails/Posts send**
  rather than a workflow step. Once a month, filter your tracking sheet to buyers at day 45+
  with no review and no reply, and send to that list.
- **Accept the leak:** leave it in the workflow, and add one line to the top of §5.3:
  *"If you already left a review or replied — thank you, ignore this."* Less clean, zero effort.

Pick one, write which one you picked at the top of your tracking sheet, and don't drift.

---

## 6. Tracking sheet schema

One sheet, one row per purchase. Google Sheets or Airtable; the formulas below are Sheets
syntax. Do not put this in a database. You will not maintain a database.

**Sheet name:** `BUYERS`

| Col | Header | Type | How it's filled | Notes |
|---|---|---|---|---|
| A | `purchase_id` | text | Gumroad sale ID, from CSV export | Primary key. Never reuse. |
| B | `buyer_email` | text | Gumroad export | **PII.** See §6.3. |
| C | `buyer_name` | text | Gumroad export | Used to match reviews to buyers. |
| D | `purchase_date` | date | Gumroad export | `YYYY-MM-DD`. Everything else derives from this. |
| E | `product` | text | Gumroad export | Matters once you have >1 product. |
| F | `price_paid` | number | Gumroad export | Catches discount-code cohorts. |
| G | `day7_due` | date | formula | `=D2+7` |
| H | `day7_sent` | date | auto/manual | Workflow: same as G. Manual: date you actually sent. |
| I | `day21_due` | date | formula | `=D2+21` |
| J | `day21_sent` | date | auto/manual | |
| K | `day45_due` | date | formula | `=D2+45` |
| L | `day45_sent` | date | manual | Blank if suppressed — see M/N. |
| M | `replied` | date | manual | Date of any inbound reply. Suppresses day-45. |
| N | `review_received` | date | manual | Date the review appeared. Suppresses day-45. |
| O | `review_stars` | number | manual | 1–5. |
| P | `review_text` | text | manual | Paste it. You will want to search these later. |
| Q | `review_theme` | text | manual | One tag: `clarity` / `state-rules` / `too-basic` / `formatting` / `worked` / `other`. This is your product roadmap. |
| R | `refunded` | date | manual | Watch the rate. >25% risks account suspension. |
| S | `notes` | text | manual | Free text. |

### 6.1 Derived cells (put these in a `SUMMARY` tab)

```
Purchases to date            =COUNTA(BUYERS!A2:A)
Eligible for review          =COUNTIFS(BUYERS!D2:D,"<="&TODAY()-21)
Reviews received             =COUNTA(BUYERS!N2:N)
Review rate                  =IF(B3=0,"",B4/B3)          ' reviews / eligible, NOT / purchases
Avg stars                    =IFERROR(AVERAGE(BUYERS!O2:O),"")
Reply rate                   =IFERROR(COUNTA(BUYERS!M2:M)/B2,"")
Refund rate                  =IFERROR(COUNTA(BUYERS!R2:R)/B2,"")   ' red flag above 10%
Day-45 send list             =FILTER(BUYERS!B2:C, (BUYERS!D2:D<=TODAY()-45)*(BUYERS!N2:N="")*(BUYERS!M2:M="")*(BUYERS!L2:L=""))
```

The `Day-45 send list` formula is the whole reason the sheet exists. It outputs exactly the
people to paste into a manual Emails/Posts send. Run it once a month.

### 6.2 Cohort tracking — the part that answers §2.2

Add a `COHORT` tab with one row per month:

| month | purchases | reviews_from_that_cohort | review_rate | followup_active | notes |
|---|---|---|---|---|---|

`followup_active` is `N` for every month before you turned the workflow on and `Y` after. Wait
until you have at least three months on each side before you draw any conclusion, and write the
conclusion with its confounders attached (§2.1).

### 6.3 Handling buyer data

You are keeping a spreadsheet of email addresses of people who told you they have a tax
problem. Treat it accordingly:

- The sheet lives in **your** Drive, not shared, not "anyone with the link."
- **The VA never gets access to this sheet.** They do not need it. (VA-PLAYBOOK.md §scope.)
- Do not export it anywhere, do not upload it to a tool, do not paste buyer emails into a chat
  window. Gumroad is your system of record; this sheet is a working copy.
- Delete the `buyer_email` column for rows older than 18 months. You will never email them again
  and holding it is pure liability.

---

## 7. The negative review protocol

You will get one. Plan for it now, because the moment it arrives you will want to do something
stupid and fast.

### 7.1 The 24-hour rule

Do not respond the day it lands. Read it, log it in the tracker (columns O/P/Q), and respond the
next day. Nothing bad happens in 24 hours. Plenty of bad happens in the first hour.

### 7.2 Triage — three kinds of negative review

**Type 1: They're right.** The guide is wrong, unclear, missing something, or a number is out
of date. → §7.3. This is the valuable kind.

**Type 2: Expectation mismatch.** The guide is accurate but they wanted something else — usually
state-specific rules, or hands-on help, or something more advanced. → §7.4. This is a sales-page
problem, not a product problem.

**Type 3: Not really about the product.** Angry about the price, angry about taxes, angry in
general. → §7.5. Respond once, briefly, and move on.

### 7.3 Type 1 — they're right

This is a four-step sequence and you do all four. In order.

**Step 1 — Reply publicly, same day + 1.** Use Gumroad's "Respond" control. Short, specific,
no defensiveness, no explanation of why it happened.

```
You're right, and thank you for writing it up. The [SECTION] figure was [WHAT WAS WRONG].
I'm fixing it this week and every existing buyer gets the corrected version free — you'll
get an email when it's up. If anything else in there tripped you, reply to that email and
tell me.
```

What is not in that reply: "I'm sorry you feel that way." A request to change the review.
An excuse. A defense of the original text. A promise with no date.

**Step 2 — Actually fix the guide.** Within one week. Not "add a note." Fix the source.
- Correct the figure, and re-verify it against the primary source (IRS publication, form, or
  instructions) per the SPINE constraint. Cite the source in the guide.
- If the problem was clarity rather than accuracy, rewrite the section, don't append to it.
- Bump the version: `v1.1`, and add a one-page **changelog** at the front of the PDF listing
  what changed and when. The changelog is the single most credibility-generating page in the
  document for an anonymous seller. It proves the guide is maintained.

**Step 3 — Ship it free to every existing buyer.** Gumroad: replace the file on the product,
which updates it for existing buyers, then send a manual **Emails/Posts** message to all buyers
of that product:

```
Subject: Updated version — v1.1 is in your library

A buyer pointed out that [WHAT WAS WRONG]. They were right. It's fixed.

What changed:
- [CHANGE 1]
- [CHANGE 2]

The updated file is already in your Gumroad library — same link you got when you bought it.
Nothing to pay, nothing to do except re-download if you saved a copy.

If you spot anything else that's wrong or unclear, reply. Every correction so far came from a
buyer.

--
This guide is educational information, not tax or legal advice. Your situation may differ.
For advice specific to you, talk to a CPA or enrolled agent.
```

**VERIFY:** confirm in Gumroad's help docs how file replacement propagates to existing
buyers and whether they are auto-notified, before you promise it.

**Step 4 — Reply once more on the review thread.** One line, with the date.

```
Fixed in v1.1, shipped to all buyers on [DATE]. Thanks again.
```

Then stop. Do not ask them to update the review. If they do, good. If they don't, you still
have a public record showing a prospective buyer that criticism gets acted on within a week —
which converts better than the 5-star review would have.

### 7.4 Type 2 — expectation mismatch

The review is a symptom of your sales page over-promising. Fix the page, not the reviewer.

**Reply:**
```
That's a fair criticism and it's my fault for not being clearer up front. The guide covers
[WHAT IT COVERS] and deliberately doesn't cover [WHAT IT DOESN'T] because [ONE-CLAUSE REASON].
I've updated the product page to say that above the fold so the next person knows before
buying. If it's not what you needed, email me for a refund — no argument.
```

Then **actually change the product page**, that day, to state the boundary. The most common
version of this in your niche will be **state-specific rules**. Your sales page should say, in
the first three lines, exactly which states' rules are and are not covered. Ambiguity there will
generate this review repeatedly.

Offering the refund here is fine and correct — you are refunding a mismatch, not buying silence.
Do not condition it on anything. If they take it and the review disappears as a Gumroad side
effect, that is not suppression; you did not ask for it. Note the refund in column R.

### 7.5 Type 3 — not really about the product

One reply, neutral, factual, then done.

```
Sorry it wasn't what you needed. If you'd like a refund, email [ADDRESS] with your order
number and I'll process it.
```

Do not argue. Do not explain. Do not reply twice. A visible argument under a review costs you
more conversions than the review does.

### 7.6 What a mixed review page actually looks like to a buyer

A 4.6 average with 30 reviews and two visible 3-stars that you responded to substantively is a
**stronger** page than a 5.0 with 30 reviews. The 5.0 reads as filtered. Research on review
psychology consistently finds all-perfect ratings reduce trust. Do not chase 5.0. Chase volume,
honest responses, and a visible changelog.

---

## 8. The weekly and monthly ritual

**Weekly, 15 minutes:**
1. Export Gumroad sales CSV → paste new rows into `BUYERS`.
2. Check for new reviews. Log stars, text, and a `review_theme` tag.
3. Respond to any review that needs it (§7). Reviews are owner-only work — never delegated.
4. Record views / sales / conversion rate for the week (§2.1).

**Monthly, 45 minutes:**
1. Run the `Day-45 send list` formula, send that batch manually.
2. Update the `COHORT` tab.
3. Read every `review_theme` tag from the month. If one theme appears three times, it is a
   product defect and it goes on the fix list, whether or not the reviews were negative.
4. Ship a `v1.x` update if the fix list has anything on it. Announce it to all buyers. A guide
   that visibly updates monthly is a guide worth $47 and later worth more.

---

## 9. VERIFY BEFORE PUBLISH

Do not launch the review engine until every line here is checked off against a primary source.

| # | Item | Where to verify | Status |
|---|---|---|---|
| 1 | Gumroad sends an automatic review reminder at day 5, and buyers can unsubscribe | Gumroad help article 222 — read it directly | ☐ |
| 2 | Buyers can review within 1 year of purchase | Gumroad help article 222 / 344 | ☐ |
| 3 | Creators can respond publicly to reviews ("Respond") | Gumroad help article 222 | ☐ |
| 4 | Workflow triggers include new purchase; delays in hours/days/weeks/months | Gumroad help article 131 | ☐ |
| 5 | Emails/Posts can be filtered to buyers of a single product | Gumroad help article 77 | ☐ |
| 6 | Replacing a product file updates it for existing buyers, and whether they're notified | Gumroad help — file management | ☐ |
| 7 | Whether refunding removes the associated review | Gumroad help / test it yourself | ☐ |
| 8 | Gumroad Terms of Service and Prohibited Activities contain no additional review clause | gumroad.com/terms, gumroad.com/prohibited | ☐ |
| 9 | Gumroad refund-rate threshold for account action (reported as 25%) | gumroad.com/terms | ☐ |
| 10 | FTC 16 CFR Part 465 text and effective date (reported: effective 2024-10-21) | ftc.gov — "Rule on the Use of Consumer Reviews and Testimonials"; also the FTC's Q&A business-guidance page | ☐ |
| 11 | `[[NEXT_DEADLINE]]` — the actual quarterly estimated tax due date for the current tax year | IRS Form 1040-ES instructions for the applicable tax year. **Do not write this date from memory.** Update the workflow every quarter. | ☐ |
| 12 | The claim in §5.2 that the IRS charges interest on an underpaid estimate from its due date — confirm exact mechanism and wording | IRS Form 2210 and its instructions; IRS Publication 505 | ☐ |
| 13 | Spiegel/PowerReviews figures (270% / 190% / 380% / diminishing after 5) | spiegel.medill.northwestern.edu — "How Online Reviews Influence Sales" (2017 eBook PDF) | ☐ |

### Claims explicitly labeled UNVERIFIED in this document

- "34% conversion increase at 25 reviews" — source playbook, single anonymous source, no
  supporting public data found. **Do not use.**
- "Review rate goes from 11% to 31% with follow-up" — source playbook, single anonymous source,
  no supporting public data found, and confounded on Gumroad by the platform's own day-5
  reminder. **Do not use.**

### Sources consulted (2026-09-05)

- [Product ratings on Gumroad — Gumroad Help Center](https://gumroad.com/help/article/222-product-ratings-on-gumroad)
- [Rate and review your purchase — Gumroad Help Center](https://gumroad.com/help/article/344-rate-and-review-your-purchase)
- [Using workflows to send automated updates — Gumroad Help Center](https://gumroad.com/help/article/131-using-workflows-to-send-automated-updates)
- [Interacting with customers — Gumroad Help Center](https://help.gumroad.com/article/77-interacting-with-customers)
- [The sales analytics dashboard — Gumroad Help Center](https://help.gumroad.com/article/74-the-analytics-dashboard)
- [Gumroad Terms of Service](https://gumroad.com/terms)
- [Gumroad Prohibited Products and Activities](https://gumroad.com/prohibited)
- [How Online Reviews Influence Sales — Medill Spiegel Research Center](https://spiegel.medill.northwestern.edu/how-online-reviews-influence-sales/)
- [Spiegel/PowerReviews eBook (PDF, 2017)](https://spiegel.medill.northwestern.edu/wp-content/uploads/sites/2/2021/04/Spiegel_Online-Review_eBook_Jun2017_FINAL.pdf)
- [16 CFR Part 465 — Rule on the Use of Consumer Reviews and Testimonials (FTC final rule)](https://www.ftc.gov/legal-library/browse/federal-register-notices/16-cfr-part-465-trade-regulation-rule-use-consumer-reviews-testimonials-final-rule)
- [The Consumer Reviews and Testimonials Rule: Questions and Answers — FTC](https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers)
- [eCFR: 16 CFR Part 465](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465)
- [The Impact of Online Reviews on Download Numbers of Mobile Apps — Springer](https://link.springer.com/chapter/10.1007/978-981-19-4960-9_7)
- [Online reviews, customer Q&As, and product sales: A PVAR approach — PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10655965/)
- [How to see negative reviews on Gumroad — Foliovision](https://foliovision.com/2025/06/negative-reviews-gumroad)
