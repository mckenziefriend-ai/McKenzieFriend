"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CourtHit = { name: string; slug: string };

export default function CourtAutocomplete({
  nameField = "court_name",
  slugField = "court_slug",
  defaultName = "",
  defaultSlug = "",
  placeholder = "Start typing a court name (e.g. East London Family Court)…",
}: {
  nameField?: string;
  slugField?: string;
  defaultName?: string;
  defaultSlug?: string;
  placeholder?: string;
}) {
  const [q, setQ] = useState(defaultName);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CourtHit[]>([]);
  const [slug, setSlug] = useState(defaultSlug);

  const abortRef = useRef<AbortController | null>(null);

  const canSearch = useMemo(() => q.trim().length >= 2, [q]);

  useEffect(() => {
    if (!open) return;

    if (!canSearch) {
      setItems([]);
      setLoading(false);
      return;
    }

    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      try {
        const res = await fetch(`/api/courts?q=${encodeURIComponent(q.trim())}`, {
          signal: ac.signal,
        });
        const data = await res.json();
        setItems(Array.isArray(data?.results) ? data.results : []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(t);
  }, [q, open, canSearch]);

  function pick(item: CourtHit) {
    setQ(item.name);
    setSlug(item.slug);
    setOpen(false);
  }

  return (
    <div className="relative">
      {/* The real fields your server action reads */}
      <input type="hidden" name={nameField} value={q} />
      <input type="hidden" name={slugField} value={slug} />

      <label className="text-xs font-semibold text-zinc-700">Court</label>
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setSlug(""); // reset slug if user changes text
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
        autoComplete="off"
      />

      {open && (loading || items.length > 0) && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-xs text-zinc-600">Searching…</div>
          )}

          {!loading && items.length === 0 && canSearch && (
            <div className="px-3 py-2 text-xs text-zinc-600">
              No matches. Try a different spelling.
            </div>
          )}

          {!loading &&
            items.map((it) => (
              <button
                key={`${it.slug}-${it.name}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(it)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
              >
                <div className="font-medium text-zinc-900">{it.name}</div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
