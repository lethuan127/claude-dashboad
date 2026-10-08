import { describe, expect, it } from "vitest";
import type { DailyModelTotals, ProjectSummary } from "./claude-logs/types";
import { lastDays, sortByLastActive, splitByModel, sumWindow, tokensPerDay } from "./dashboard";

const now = new Date("2026-10-08T15:00:00Z");
const row = (date: string, model: string, inputTokens: number, cost: number, unknown = false): DailyModelTotals => ({
  date, model, inputTokens, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, cost, hasUnknownModel: unknown,
});
const daily = [
  row("2026-10-08", "a", 10, 1),
  row("2026-10-02", "a", 20, 2),
  row("2026-10-01", "b", 40, 4, true),
  row("2026-09-09", "a", 80, 8),
  row("2026-09-08", "a", 160, 16),
];

describe("windows", () => {
  it("lastDays is inclusive of today, oldest first", () => {
    expect(lastDays(now, 3)).toEqual(["2026-10-06", "2026-10-07", "2026-10-08"]);
  });
  it("sums today, 7 and 30 days", () => {
    expect(sumWindow(daily, now, 1)).toEqual({ tokens: 10, cost: 1, hasUnknownModel: false });
    expect(sumWindow(daily, now, 7)).toMatchObject({ tokens: 30, cost: 3 });
    const m = sumWindow(daily, now, 30);
    expect(m).toMatchObject({ tokens: 150, cost: 15, hasUnknownModel: true });
  });
  it("tokensPerDay zero-fills", () => {
    const d = tokensPerDay(daily, now, 30);
    expect(d).toHaveLength(30);
    expect(d[29]).toEqual({ date: "2026-10-08", tokens: 10 });
    expect(d[28].tokens).toBe(0);
  });
  it("splitByModel orders by tokens", () => {
    expect(splitByModel(daily, now, 30).map((s) => [s.model, s.tokens])).toEqual([["a", 110], ["b", 40]]);
  });
});

describe("sortByLastActive", () => {
  const p = (project: string, lastActive: string | null): ProjectSummary => ({
    project, sessionCount: 1, lastActive, inputTokens: 0, outputTokens: 0,
    cacheCreationTokens: 0, cacheReadTokens: 0, cost: 0, hasUnknownModel: false,
  });
  it("puts newest first and null last without mutating", () => {
    const input = [p("old", "2025-01-01T00:00:00Z"), p("none", null), p("new", "2026-01-01T00:00:00Z")];
    expect(sortByLastActive(input).map((x) => x.project)).toEqual(["new", "old", "none"]);
    expect(input[0].project).toBe("old");
  });
});
