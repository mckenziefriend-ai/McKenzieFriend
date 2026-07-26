import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cross-tenant isolation (review finding C2). This exercises the RLS boundary
 * that every route and page ultimately depends on: signed in as user A, you
 * must not be able to read, update or delete user B's case or any of its child
 * rows by id.
 *
 * Env-gated — skipped unless you provide two real test accounts:
 *   TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY,
 *   TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD,
 *   TEST_USER_B_EMAIL, TEST_USER_B_PASSWORD
 * The first run IS the two-account verification the review asks for.
 */

const url = process.env.TEST_SUPABASE_URL;
const anon = process.env.TEST_SUPABASE_ANON_KEY;
const aEmail = process.env.TEST_USER_A_EMAIL;
const aPassword = process.env.TEST_USER_A_PASSWORD;
const bEmail = process.env.TEST_USER_B_EMAIL;
const bPassword = process.env.TEST_USER_B_PASSWORD;

const ready = Boolean(url && anon && aEmail && aPassword && bEmail && bPassword);

const CHILD_TABLES = [
  "case_events",
  "case_statements",
  "case_documents",
  "case_calendar_items",
  "case_bundle_items",
  "case_chat_messages",
];

describe.skipIf(!ready)("cross-tenant isolation (RLS)", () => {
  let aClient: SupabaseClient;
  let bClient: SupabaseClient;
  let bCaseId = "";

  beforeAll(async () => {
    aClient = createClient(url!, anon!);
    bClient = createClient(url!, anon!);

    const aAuth = await aClient.auth.signInWithPassword({ email: aEmail!, password: aPassword! });
    expect(aAuth.error, "user A sign-in failed").toBeNull();
    const bAuth = await bClient.auth.signInWithPassword({ email: bEmail!, password: bPassword! });
    expect(bAuth.error, "user B sign-in failed").toBeNull();

    const bUserId = bAuth.data.user!.id;
    const created = await bClient
      .from("cases")
      .insert({ user_id: bUserId, title: "B private case (integration test)" })
      .select("id")
      .single();
    expect(created.error, "creating B's case failed").toBeNull();
    bCaseId = created.data!.id;
  });

  afterAll(async () => {
    if (bCaseId) await bClient.from("cases").delete().eq("id", bCaseId);
  });

  it("A cannot SELECT B's case by id", async () => {
    const { data } = await aClient.from("cases").select("id").eq("id", bCaseId);
    expect(data ?? []).toEqual([]);
  });

  it("A cannot UPDATE B's case", async () => {
    const { data } = await aClient
      .from("cases")
      .update({ title: "hacked" })
      .eq("id", bCaseId)
      .select("id");
    expect(data ?? []).toEqual([]);

    const still = await bClient.from("cases").select("title").eq("id", bCaseId).single();
    expect(still.data?.title).toBe("B private case (integration test)");
  });

  it("A cannot DELETE B's case", async () => {
    await aClient.from("cases").delete().eq("id", bCaseId);
    const still = await bClient.from("cases").select("id").eq("id", bCaseId);
    expect(still.data?.length).toBe(1);
  });

  it("A cannot read B's child rows via case_id", async () => {
    for (const table of CHILD_TABLES) {
      const { data } = await aClient.from(table).select("*").eq("case_id", bCaseId);
      expect(data ?? [], `${table} leaked across tenants`).toEqual([]);
    }
  });
});
