export type Essay = {
  slug: string;
  title: string;
  dek: string;
  date: string;
  readingTime: string;
  tag: "Essay" | "Note" | "Field notes";
  featured?: boolean;
  body: string[];
};

export type Session = {
  slug: string;
  title: string;
  description: string;
  duration: string;
  minutes: number;
  best: string;
};

/**
 * DRAFT CONTENT.
 * Every essay and session below is placeholder written to give the layout
 * real prose to hold. Replace with Greg’s own writing before launch.
 */
export const essays: Essay[] = [
  {
    slug: "the-trance-youre-already-in",
    title: "The trance you’re already in",
    dek: "You have been hypnotised many times this week. Nobody swung a watch.",
    date: "2026-07-14",
    readingTime: "8 min",
    tag: "Essay",
    featured: true,
    body: [
      "There is a stretch of road on my drive home where I have no memory of driving. Not once — every time. The exit appears, and the twenty minutes before it are simply gone. I was awake. I was steering. Somebody was operating the car with real competence, checking mirrors, adjusting speed. It just wasn’t the part of me that narrates.",
      "This is the thing people find hardest to believe about hypnosis: you already know what it feels like. The state is not exotic. It is Tuesday.",
      "What we call trance is a particular arrangement of attention — narrow, absorbed, and comfortable with suggestion. It happens in a cinema when you forget you are sitting in a room with strangers. It happens when a book takes an hour that felt like ten minutes. It happens in the gap between the third and fourth rep, when the count keeps itself.",
      "The stage hypnotist did not invent this state. He found a reliable way to walk people into it in front of an audience, and then — this is the important part — he took the credit for the walking.",
      "## Absorption is the whole mechanism",
      "Strip away the theatre and hypnosis is two things stacked. First, attention narrows onto something — a voice, a sensation, a counted breath. Second, the ordinary editorial function that stands between a suggestion and its uptake goes quiet.",
      "That second part sounds sinister until you notice you drop it constantly. You drop it for novels. You drop it for advertising, mostly against your will. You drop it for anyone you have decided is worth listening to. The editor is expensive to run, and the mind switches it off whenever the situation looks safe enough to coast.",
      "Hypnosis is the deliberate version. That is the only difference between the trance on the motorway and the trance in the chair — one is an accident of a boring road, and one is on purpose, with someone keeping track of where you are going.",
      "## Which means the subject is doing the work",
      "If absorption is the mechanism, then the practitioner is not the source of anything. He is a set of conditions. He gives the attention somewhere to rest and a reason to stay there.",
      "This is why the question people ask first — *can you hypnotise anyone?* — has such an unsatisfying answer. Not anyone. Anyone who is willing, in a room that feels safe, with enough capacity for absorption to lose themselves in a film. Which is most people, most of the time, and almost nobody who has arrived determined to prove it won’t work.",
      "The resistant subject is not defeating the hypnotist. He is simply doing something else with his attention, which is his to spend.",
      "## The disappointment is the point",
      "Every honest account of this work has to survive the same letdown. People arrive expecting to be taken somewhere. What actually happens is quieter: they sit, they listen, their attention narrows, and afterwards they are unsure whether anything happened at all.",
      "“I don’t think I was under,” they say, having not moved for thirty-five minutes.",
      "The expectation of spectacle is the last thing to go. It survives the explanation, the induction, and usually the first two sessions. It goes when someone notices they have stopped checking whether it is working — which is, of course, exactly when it started.",
    ],
  },
  {
    slug: "suggestion-is-not-control",
    title: "Suggestion is not control",
    dek: "The most persistent myth in the field, and why the truth is stranger than the myth.",
    date: "2026-06-02",
    readingTime: "6 min",
    tag: "Essay",
    featured: true,
    body: [
      "The popular picture of hypnosis is a transfer of will. One person empties out, another moves in. It makes for excellent films and it is close to the opposite of what happens.",
      "A suggestion is an offer. It is taken up or it is not, and the taking up is done by the person receiving it. You can watch this happen in real time: give someone a suggestion that runs against something they actually care about and it simply fails to land. No struggle, no drama. It just doesn’t take, the way a joke doesn’t take.",
      "## What the offer actually does",
      "If suggestion cannot install anything, what is it for?",
      "It changes what is easy. That is the honest description. A suggestion does not make you do something you would refuse; it lowers the friction on something you were already willing to do but could not reach from the ordinary state.",
      "Somebody who wants to stop smoking has wanted to stop for years. The wanting was never the problem. What suggestion offers is a route around the part of the mind that has spent those years producing extremely good reasons to start again this afternoon.",
      "## Why the truth is stranger",
      "Here is the part that unsettles people more than the myth did.",
      "If suggestion works by lowering friction rather than overriding will, then the effect is not coming from the practitioner at all. It is coming from a capacity the person already had and could not access on demand. The room, the voice, the counted breath — these are scaffolding for something that was already in the building.",
      "Which means the control was never anyone’s to take. It also means the thing people find reassuring — *nobody can make me do anything* — arrives bundled with something less reassuring: nobody is going to do this for you either.",
      "> The practitioner is not a driver. He is a road, and roads do not decide where anyone is going.",
      "## The useful consequence",
      "Take the transfer-of-will picture seriously and you will spend the session braced, waiting to be overpowered, monitoring for the moment your will goes. That vigilance is itself the thing that keeps attention wide and unsettled.",
      "Drop it and there is nothing to brace against. The offer arrives, and you take it or you don’t.",
    ],
  },
  {
    slug: "what-hypnosis-cannot-do",
    title: "What hypnosis cannot do",
    dek: "A short and deliberately unglamorous list, kept honest.",
    date: "2026-04-21",
    readingTime: "5 min",
    tag: "Note",
    featured: true,
    body: [
      "Most writing in this field is promotional. This is the correction — the list of things I will not claim, kept short so it is easy to hold on to.",
      "## It cannot recover reliable memories",
      "This is the most serious one, so it goes first. Attention in a suggestible state does not work like a tape being rewound. What it produces feels like recollection and carries the full emotional weight of recollection, while being partly constructed in the moment.",
      "The confidence a person feels about a hypnotically retrieved memory is not evidence for it. This is well documented and it is the reason such material is treated with enormous caution in legal settings. Anyone offering to recover your past this way is selling something.",
      "## It cannot make anyone act against themselves",
      "Covered elsewhere, but it belongs on the list. Suggestion lowers friction on the willing. It does not manufacture willingness.",
      "## It is not a treatment for illness",
      "I am not a doctor and this work is not medicine. Hypnosis has genuine, well-studied uses as an adjunct — alongside proper care, not instead of it. Anyone in distress, in pain, or managing a diagnosed condition should be under the care of a clinician, and I will say so rather than take the booking.",
      "## It does not work on schedule",
      "Some people go deep in the first ten minutes. Some take four sessions to stop auditing the process. Some never find it useful and are better served elsewhere.",
      "There is no way to know in advance, and any confident prediction about which one you will be is a guess wearing a costume.",
      "## It is not permanent by itself",
      "A session is not an installation. Whatever shifts in the room has to be practised outside it, or it fades the way any unrehearsed thing fades.",
      "This is the least popular item on the list and the one that most determines whether the work is worth anything.",
      "## Why publish this",
      "Because the field’s credibility problem is self-inflicted. It is not caused by sceptics. It is caused by practitioners claiming more than the evidence carries, and then being right often enough to keep going.",
      "The narrower claim is more useful anyway. Attention can be arranged. Arranged attention makes some difficult things easier. That is a real thing to offer, and it does not need embellishing.",
    ],
  },
  {
    slug: "attention-as-the-only-instrument",
    title: "Attention as the only instrument",
    dek: "Everything in the room — the voice, the pacing, the counting — is doing one job.",
    date: "2026-03-08",
    readingTime: "7 min",
    tag: "Field notes",
    body: [
      "Strip a session down and there is remarkably little in it. A voice at a particular pace. A few sensations named out loud. Some counting. A person sitting still.",
      "None of these are active ingredients. They are all doing the same single job, which is giving attention somewhere to rest that is more interesting than the ordinary churn.",
      "## Pace does most of it",
      "The voice matters less than the pacing of the voice. Slightly slower than conversation, with pauses that are longer than feels natural to the speaker, because the pause is where the listener’s attention actually settles.",
      "New practitioners fill the pauses. It is the hardest habit to break and the most costly one, because a filled pause is a voice being listened to rather than a state being entered.",
      "## Naming what is already true",
      "The early part of any induction is a series of statements that cannot be argued with. The weight of the hands. The temperature of the air. Sounds in the next room.",
      "This is sometimes described as building trust, which is vague. What it does is more mechanical: each unarguable statement that lands is a small confirmation that the voice is tracking reality accurately, and a listener who has confirmed that several times stops checking.",
      "## Counting is a banister",
      "Counting down is not mystical. It gives attention a structure with a known shape and a known end, which makes it safe to stop navigating.",
      "You can replace it with a staircase, a corridor, a descent of any kind. The metaphor is interchangeable. What is not interchangeable is that it has a direction and a floor.",
      "## What this means for the practitioner",
      "If attention is the only instrument, the skill is not persuasion, dramatic delivery, or reading people. It is noticing where someone’s attention actually is — as opposed to where the script assumes it is — and adjusting.",
      "A person whose attention has snagged on a noise outside is not going anywhere until the noise is named. The script cannot know about the noise. Only the practitioner in the room can.",
    ],
  },
  {
    slug: "the-stage-and-the-consulting-room",
    title: "The stage and the consulting room",
    dek: "Same mechanism, opposite purpose. The confusion between them costs the field dearly.",
    date: "2026-01-19",
    readingTime: "6 min",
    tag: "Essay",
    body: [
      "Stage hypnosis is real. This is worth stating plainly, because the usual defensive move is to imply the theatrical version is fake and the therapeutic version is genuine. They run on the same mechanism.",
      "The difference is selection and purpose, and both differences are larger than they look.",
      "## Selection does the heavy lifting",
      "A stage performer works with volunteers who came to a show about hypnosis, walked up in front of a crowd, and stayed after a screening routine quietly removed everyone slow to respond.",
      "By the time the act proper begins, the performer has a small group pre-selected for high suggestibility and social willingness. The apparent power of the performance is mostly the arithmetic of that filter.",
      "## Purpose changes everything downstream",
      "The stage wants visible, immediate, funny compliance. That is a legitimate thing to want from an entertainment.",
      "It also means every technique is optimised for spectacle over durability, and nothing that happens on stage needs to survive contact with Wednesday.",
      "> The consulting room wants the opposite: nothing visible, nothing immediate, and everything durable.",
      "## The cost of the confusion",
      "People arrive having only seen the stage version. So they expect to be a spectacle, and they arrive braced against being made ridiculous.",
      "That bracing is not a minor inconvenience. It is precisely the wide, vigilant attention that makes absorption impossible. The first twenty minutes of many first sessions are spent undoing an expectation set by an entertainer years earlier.",
      "I do not think stage hypnosis should stop. It is genuinely skilled work. But it is the field’s only mass-market shop window, and the window shows something we do not sell.",
    ],
  },
];

export const sessions: Session[] = [
  {
    slug: "settling",
    title: "Settling",
    description:
      "A short induction with no destination. Useful the first few times, when the only goal is finding out what the state feels like from the inside.",
    duration: "12 min",
    minutes: 12,
    best: "First listens",
  },
  {
    slug: "the-staircase",
    title: "The staircase",
    description:
      "The classic descent, unhurried. Ten steps, a long pause on each, and a floor that stays put for as long as you want it.",
    duration: "18 min",
    minutes: 18,
    best: "Once the state is familiar",
  },
  {
    slug: "before-sleep",
    title: "Before sleep",
    description:
      "Recorded to be listened to lying down, with no return at the end. It simply stops. Not intended for anything other than the transition into sleep.",
    duration: "24 min",
    minutes: 24,
    best: "Lying down, lights out",
  },
  {
    slug: "the-narrow-corridor",
    title: "The narrow corridor",
    description:
      "A longer session for people who find counting too abstract to hold on to. The structure is spatial rather than numeric.",
    duration: "31 min",
    minutes: 31,
    best: "When counting doesn’t land",
  },
];

export const featuredEssays = essays.filter((e) => e.featured);

export function getEssay(slug: string) {
  return essays.find((e) => e.slug === slug);
}

export function formatDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
