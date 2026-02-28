import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");

  const expected = process.env.DASHBOARD_CHRONOLOGY_PASSWORD ?? "";
  if (!expected) {
    return NextResponse.json(
      { error: "Missing DASHBOARD_CHRONOLOGY_PASSWORD env var" },
      { status: 500 }
    );
  }

  if (password !== expected) {
    return NextResponse.redirect(new URL("/dashboard?unlock=wrong", req.url), {
      status: 303,
    });
  }

  const cookieStore = await cookies();
  cookieStore.set("chrono_unlocked", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return NextResponse.redirect(new URL("/dashboard?unlock=ok", req.url), {
    status: 303,
  });
}
