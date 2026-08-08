"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

const reasons = [
  "A question about the work",
  "Working together",
  "Something I wrote",
  "Other",
];

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));

    try {
      // STUB: no backend wired up. Point this at Resend / Formspark /
      // a route handler before launch.
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-rule bg-paper-raised p-8 md:p-10">
        <p className="display-face text-2xl text-ink">Thank you — that arrived.</p>
        <p className="mt-3 text-ink-soft">
          I read everything myself, so replies take a few days rather than a few
          minutes.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 text-[0.9375rem] text-accent underline underline-offset-4"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-rule bg-paper-raised p-6 md:p-9"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" name="name" autoComplete="name" required />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div className="mt-5">
        <label
          htmlFor="reason"
          className="block text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted"
        >
          What's this about
        </label>
        <select
          id="reason"
          name="reason"
          defaultValue={reasons[0]}
          className="mt-2 w-full appearance-none rounded-xl border border-rule bg-paper px-4 py-3 text-ink outline-none transition-colors focus:border-accent"
        >
          {reasons.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        <label
          htmlFor="message"
          className="block text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted"
        >
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          placeholder="As much or as little as you like."
          className="mt-2 w-full resize-y rounded-xl border border-rule bg-paper px-4 py-3 text-ink placeholder:text-ink-muted/70 outline-none transition-colors focus:border-accent"
        />
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-full bg-ink px-7 py-3 text-paper transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send"}
        </button>
        <p className="text-[0.8125rem] text-ink-muted">
          No list, no automation. This goes to an inbox.
        </p>
      </div>

      {status === "error" && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-rule bg-paper-sunk px-4 py-3 text-[0.9375rem] text-ink-soft"
        >
          That didn't send — the form has no backend connected yet. Wire{" "}
          <code className="text-accent">/api/contact</code> to a mail provider.
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        className="mt-2 w-full rounded-xl border border-rule bg-paper px-4 py-3 text-ink placeholder:text-ink-muted/70 outline-none transition-colors focus:border-accent"
        {...rest}
      />
    </div>
  );
}
