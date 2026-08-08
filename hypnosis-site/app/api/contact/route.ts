import { NextResponse } from "next/server";

/**
 * STUB — intentionally not wired to a mail provider.
 *
 * To make the contact form live, add a provider here (Resend, Postmark,
 * Formspark, …) and send `name`, `email`, `reason`, `message` on to an inbox.
 * Until then this returns 501 so the form shows its error state honestly
 * rather than pretending a message was delivered.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.email || !body?.message) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { error: "No mail provider configured yet." },
    { status: 501 },
  );
}
