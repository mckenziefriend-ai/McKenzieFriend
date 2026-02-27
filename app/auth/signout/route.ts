import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const url = new URL(req.url);
  url.pathname = "/";
  url.search = "";
  url.searchParams.set("signedout", "1");

  return NextResponse.redirect(url, { status: 303 });
}
