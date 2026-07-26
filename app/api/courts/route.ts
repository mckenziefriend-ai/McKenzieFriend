import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs"; // keep it on Node (not edge) for predictable fetch behaviour

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const rate = checkRateLimit(`courts:${user.id}`, 60, 5 * 60 * 1000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const url = `https://www.find-court-tribunal.service.gov.uk/search/results.json?q=${encodeURIComponent(
    q
  )}`;

  const res = await fetch(url, {
    // small cache helps a lot during typing
    next: { revalidate: 60 * 60 },
    headers: {
      "accept": "application/json",
    },
  });

  if (!res.ok) {
    return NextResponse.json({ results: [] }, { status: 200 });
  }

  const data: unknown = await res.json();

  // We don’t know the exact JSON shape, so normalize defensively.
  // Common pattern is an array of courts with `name` + `slug` (or similar).
  const asRecord = data as { results?: unknown; courts?: unknown };
  const rawResults: unknown[] =
    Array.isArray(data) ? data :
    Array.isArray(asRecord?.results) ? asRecord.results :
    Array.isArray(asRecord?.courts) ? asRecord.courts :
    [];

  const results = rawResults
    .map((entry) => {
      const r = (entry ?? {}) as Record<string, unknown>;
      return {
        name: String(r.name ?? r.title ?? "").trim(),
        slug: String(r.slug ?? r.id ?? "").trim(),
      };
    })
    .filter((r) => r.name.length > 0)
    .slice(0, 8);

  return NextResponse.json({ results });
}
