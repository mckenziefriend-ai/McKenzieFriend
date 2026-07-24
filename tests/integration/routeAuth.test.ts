import { describe, it, expect } from "vitest";

/**
 * Every API route and dashboard page must reject an unauthenticated caller
 * (review findings C3/H5 — no open, billable AI endpoints; no unguarded pages).
 * This is the portable HTTP-level half of the cross-tenant story: if a request
 * with no session can't get in at all, it can't reach another user's caseId.
 *
 * Env-gated on TEST_BASE_URL (a running instance, e.g. http://localhost:3000).
 * Full A-cannot-reach-B's-caseId-over-HTTP coverage needs browser-based auth
 * and is covered by the RLS suite (crossTenant.test.ts) plus an e2e step.
 */

const base = process.env.TEST_BASE_URL?.replace(/\/$/, "");
const ready = Boolean(base);
const someCaseId = "00000000-0000-0000-0000-000000000000";

const API_POSTS = [
  "/api/ai/case-chat",
  "/api/ai/statement",
  "/api/ai/statement-event",
  "/api/ai/statement-tools",
  "/api/case-actions",
];

const DASHBOARD_PAGES = [
  "/dashboard",
  "/dashboard/cases",
  `/dashboard/cases/${someCaseId}/chat`,
  `/dashboard/cases/${someCaseId}/chronology`,
  `/dashboard/cases/${someCaseId}/documents`,
  `/dashboard/cases/${someCaseId}/statements`,
  `/dashboard/cases/${someCaseId}/calendar`,
  `/dashboard/cases/${someCaseId}/bundle`,
];

describe.skipIf(!ready)("unauthenticated access is rejected", () => {
  it.each(API_POSTS)("POST %s returns 401 without a session", async (path) => {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: someCaseId, notes: "x", mode: "review", statementText: "x" }),
    });
    expect(res.status).toBe(401);
  });

  it("GET /api/courts returns 401 without a session", async () => {
    const res = await fetch(`${base}/api/courts?q=leeds`);
    expect(res.status).toBe(401);
  });

  it("DELETE /api/ai/case-chat returns 401 without a session", async () => {
    const res = await fetch(`${base}/api/ai/case-chat?caseId=${someCaseId}`, { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  it.each(DASHBOARD_PAGES)("GET %s redirects an unauthenticated user to /login", async (path) => {
    const res = await fetch(`${base}${path}`, { redirect: "manual" });
    // Next redirects (307/308) or renders login; either way it must not 200 the page.
    expect([302, 303, 307, 308]).toContain(res.status);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/login");
  });
});
