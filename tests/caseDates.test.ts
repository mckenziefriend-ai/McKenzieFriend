import { describe, it, expect } from "vitest";
import { londonToday, relativeDayTag } from "@/lib/ai/caseDates";

describe("londonToday", () => {
  it("gives an ISO day key and a human label in London time", () => {
    // 10 Aug 2026, 09:00 UTC — plainly the 10th in London (BST).
    const { key, label } = londonToday(new Date("2026-08-10T09:00:00Z"));
    expect(key).toBe("2026-08-10");
    expect(label).toBe("Monday, 10 August 2026");
  });

  it("rolls to the next London day for a late-evening UTC instant (BST)", () => {
    // 23:30 UTC on 10 Aug is 00:30 on 11 Aug in British Summer Time.
    expect(londonToday(new Date("2026-08-10T23:30:00Z")).key).toBe("2026-08-11");
  });
});

describe("relativeDayTag", () => {
  const today = "2026-08-10";

  it("labels a past hearing as PAST, not upcoming", () => {
    // The exact bug: a 25 March 2026 hearing while today is 10 August 2026.
    const tag = relativeDayTag("2026-03-25T10:00:00Z", today);
    expect(tag).toContain("PAST");
    expect(tag).not.toContain("upcoming");
  });

  it("counts upcoming days", () => {
    expect(relativeDayTag("2026-08-22T10:00:00Z", today)).toBe("upcoming — in 12 days");
  });

  it("recognises today, tomorrow and yesterday", () => {
    expect(relativeDayTag("2026-08-10T14:00:00Z", today)).toBe("TODAY");
    expect(relativeDayTag("2026-08-11T09:00:00Z", today)).toBe("tomorrow");
    expect(relativeDayTag("2026-08-09T09:00:00Z", today)).toBe("PAST — yesterday");
  });

  it("returns nothing for a missing or unparseable date", () => {
    expect(relativeDayTag(null, today)).toBe("");
    expect(relativeDayTag(undefined, today)).toBe("");
    expect(relativeDayTag("not a date", today)).toBe("");
  });
});
