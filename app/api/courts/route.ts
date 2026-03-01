import { NextResponse } from "next/server";

export const runtime = "nodejs"; // keep it on Node (not edge) for predictable fetch behaviour

export async function GET(req: Request) {
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

  const data = await res.json();

  // We don’t know your exact JSON shape yet, so normalize defensively.
  // Common pattern is an array of courts with `name` + `slug` (or similar).
  const rawResults: any[] =
    Array.isArray(data) ? data :
    Array.isArray(data?.results) ? data.results :
    Array.isArray(data?.courts) ? data.courts :
    [];

  const results = rawResults
    .map((r) => ({
      name: String(r.name ?? r.title ?? "").trim(),
      slug: String(r.slug ?? r.id ?? "").trim(),
    }))
    .filter((r) => r.name.length > 0)
    .slice(0, 8);

  return NextResponse.json({ results });
}
