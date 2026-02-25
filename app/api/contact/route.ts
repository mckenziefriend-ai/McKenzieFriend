import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const message = String(body?.message ?? "").trim();

    if (name.length < 2) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!email.includes("@") || !email.includes(".")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }
    if (message.length < 10) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // For now: log server-side (safe starting point).
    // Next step: send email via Resend/SMTP, or store to DB.
    console.log("CONTACT_ENQUIRY", {
      service: body?.service,
      name,
      email,
      courtType: body?.courtType,
      stage: body?.stage,
      urgency: body?.urgency,
      hearingDate: body?.hearingDate,
      courtLocation: body?.courtLocation,
      preferredContact: body?.preferredContact,
      message,
      at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
