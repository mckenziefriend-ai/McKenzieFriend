import { NextResponse } from "next/server";
import { Resend } from "resend";

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

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.CONTACT_FROM_EMAIL;
    const to = process.env.CONTACT_TO_EMAIL;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing RESEND_API_KEY." }, { status: 500 });
    }
    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing CONTACT_FROM_EMAIL or CONTACT_TO_EMAIL." },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    const subject = `New enquiry — ${name}`;
    const text = `New contact enquiry

Name: ${name}
Email: ${email}

Message:
${message}
`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5">
        <h2 style="margin:0 0 12px">New contact enquiry</h2>
        <p style="margin:0 0 6px"><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p style="margin:0 0 14px"><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p style="margin:0 0 6px"><strong>Message:</strong></p>
        <pre style="white-space:pre-wrap;background:#f4f4f5;padding:12px;border-radius:8px;border:1px solid #e4e4e7">${escapeHtml(
          message
        )}</pre>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from, // e.g. "McKenzieFriend.ai <onboarding@resend.dev>"
      to,   // your inbox email
      reply_to: email, // so you can reply directly to the user
      subject,
      text,
      html,
    });

    if (error) {
      console.error("RESEND_ERROR", error);
      return NextResponse.json(
        { error: error.message || "Email send failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: data?.id ?? null }, { status: 200 });
  } catch (err) {
    console.error("CONTACT_ROUTE_ERROR", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

// basic HTML escaping so user input can't break the email HTML
function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
