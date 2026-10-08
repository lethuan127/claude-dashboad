import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { computeCost } from "./cost";
import { readSession, readUsage } from "./reader";

const FIXTURES = path.join(__dirname, "__fixtures__");

describe("computeCost", () => {
  const t = { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 };
  it("prices each token type separately", () => {
    const m = "claude-sonnet-4-5";
    expect(computeCost(m, { ...t, inputTokens: 1e6 })).toBeCloseTo(3);
    expect(computeCost(m, { ...t, outputTokens: 1e6 })).toBeCloseTo(15);
    expect(computeCost(m, { ...t, cacheCreationTokens: 1e6 })).toBeCloseTo(3.75);
    expect(computeCost(m, { ...t, cacheReadTokens: 1e6 })).toBeCloseTo(0.3);
  });
  it("returns null for unknown model", () => {
    expect(computeCost("nope", { ...t, inputTokens: 1 })).toBeNull();
  });
});

describe("readUsage", () => {
  it("returns empty report for missing dir", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "claude-empty-"));
    const r = await readUsage(dir);
    expect(r).toEqual({ sessions: [], projects: [], daily: [], unknownModels: [] });
  });

  it("aggregates sessions, skipping bad and non-assistant lines", async () => {
    const r = await readUsage(FIXTURES);
    const s1 = r.sessions.find((s) => s.id === "s1")!;
    expect(s1.messageCount).toBe(2);
    expect(s1.inputTokens).toBe(1_000_010);
    expect(s1.outputTokens).toBe(100_020);
    expect(s1.cacheCreationTokens).toBe(200_000);
    expect(s1.cacheReadTokens).toBe(500_000);
    expect(s1.project).toBe("-home-me-alpha");
    expect(s1.cwd).toBe("/home/me/alpha");
    expect(s1.gitBranch).toBe("main");
    expect(s1.firstTimestamp).toBe("2025-10-01T10:00:00.000Z");
    expect(s1.lastTimestamp).toBe("2025-10-02T09:00:00.000Z");
    expect(s1.models).toEqual(["claude-sonnet-4-5-20250929"]);
    expect(s1.cost).toBeCloseTo(5.4 + (10 * 3 + 20 * 15) / 1e6, 6);
    expect(s1.hasUnknownModel).toBe(false);
  });

  it("aggregates projects", async () => {
    const r = await readUsage(FIXTURES);
    const alpha = r.projects.find((p) => p.project === "-home-me-alpha")!;
    expect(alpha.sessionCount).toBe(2);
    expect(alpha.inputTokens).toBe(1_000_010 + 2_000_000);
    expect(alpha.cost).toBeCloseTo(5.4 + 0.00033 + 31, 5);
    expect(alpha.hasUnknownModel).toBe(false);
  });

  it("aggregates daily totals per model", async () => {
    const r = await readUsage(FIXTURES);
    const day = r.daily.filter((d) => d.date === "2025-10-01");
    expect(day.map((d) => d.model)).toEqual([
      "claude-haiku-4-5",
      "claude-mystery-9",
      "claude-opus-4-5",
      "claude-sonnet-4-5-20250929",
    ]);
    expect(day.find((d) => d.model === "claude-opus-4-5")!.cost).toBeCloseTo(30);
    expect(day.find((d) => d.model.startsWith("claude-sonnet"))!.inputTokens).toBe(1_000_000);
    expect(r.daily.some((d) => d.date === "2025-10-02")).toBe(true);
  });

  it("flags unknown models with cost 0", async () => {
    const r = await readUsage(FIXTURES);
    expect(r.unknownModels).toEqual(["claude-mystery-9"]);
    const s3 = r.sessions.find((s) => s.id === "s3")!;
    expect(s3.cost).toBe(0);
    expect(s3.hasUnknownModel).toBe(true);
    expect(r.projects.find((p) => p.project === "-home-me-beta")!.hasUnknownModel).toBe(true);
    expect(r.daily.find((d) => d.model === "claude-mystery-9")!.hasUnknownModel).toBe(true);
  });
});

describe("readSession", () => {
  it("returns one turn per assistant message", async () => {
    const d = (await readSession("s1", FIXTURES))!;
    expect(d.session.gitBranch).toBe("main");
    expect(d.session.firstTimestamp).toBe("2025-10-01T10:00:00.000Z");
    expect(d.session.lastTimestamp).toBe("2025-10-02T09:00:00.000Z");
    expect(d.turns).toHaveLength(2);
    expect(d.turns[0]).toMatchObject({
      timestamp: "2025-10-01T10:00:00.000Z",
      model: "claude-sonnet-4-5-20250929",
      inputTokens: 1_000_000,
      outputTokens: 100_000,
      cacheCreationTokens: 200_000,
      cacheReadTokens: 500_000,
      hasUnknownModel: false,
    });
    expect(d.turns[0].cost).toBeCloseTo(5.4, 6);
    expect(d.turns[1].inputTokens).toBe(10);
    expect(d.session.cost).toBeCloseTo(d.turns[0].cost + d.turns[1].cost, 9);
  });

  it("lists several models and flags unknown ones", async () => {
    const s2 = (await readSession("s2", FIXTURES))!;
    expect(s2.session.models).toEqual(["claude-haiku-4-5", "claude-opus-4-5"]);
    const s3 = (await readSession("s3", FIXTURES))!;
    expect(s3.turns[0]).toMatchObject({ cost: 0, hasUnknownModel: true });
  });

  it("returns null for unknown ids, including path-like ones", async () => {
    expect(await readSession("nope", FIXTURES)).toBeNull();
    expect(await readSession("../../etc/passwd", FIXTURES)).toBeNull();
  });
});

describe("project lastActive", () => {
  it("is the newest session lastTimestamp", async () => {
    const r = await readUsage(FIXTURES);
    expect(r.projects.find((p) => p.project === "-home-me-alpha")!.lastActive).toBe(
      "2025-10-02T09:00:00.000Z",
    );
  });
});
