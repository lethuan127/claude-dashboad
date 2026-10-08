import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OverviewView } from "@/components/overview";
import { SessionView } from "@/components/session";
import { ProjectsView } from "@/components/projects";
import type { UsageReport } from "@/lib/claude-logs/types";
import { metadata } from "./layout";

const empty: UsageReport = { sessions: [], projects: [], daily: [], unknownModels: [] };
const t = { inputTokens: 100, outputTokens: 50, cacheCreationTokens: 0, cacheReadTokens: 0 };
const session = {
  id: "s1", project: "-p", cwd: "/p", gitBranch: "main", firstTimestamp: "2026-10-08T10:00:00Z",
  lastTimestamp: "2026-10-08T11:00:00Z", models: ["claude-sonnet-4-5"], messageCount: 1, ...t, cost: 1.5, hasUnknownModel: false,
};
const report: UsageReport = {
  sessions: [session],
  projects: [{ project: "-p", sessionCount: 1, lastActive: session.lastTimestamp, ...t, cost: 1.5, hasUnknownModel: true }],
  daily: [{ date: "2026-10-08", model: "claude-sonnet-4-5", ...t, cost: 1.5, hasUnknownModel: true }],
  unknownModels: ["mystery"],
};
const now = new Date("2026-10-08T12:00:00Z");

describe("views", () => {
  it("shows an empty state mentioning CLAUDE_DIR", () => {
    expect(renderToStaticMarkup(<OverviewView report={empty} now={now} />)).toContain("CLAUDE_DIR");
    expect(renderToStaticMarkup(<ProjectsView report={empty} />)).toContain("CLAUDE_DIR");
  });
  it("overview shows totals and the unknown-model marker", () => {
    const html = renderToStaticMarkup(<OverviewView report={report} now={now} />);
    expect(html).toContain("150 tokens");
    expect(html).toContain("$1.50");
    expect(html).toContain("partial");
    expect(html).toContain("<svg");
  });
  it("projects links to a session", () => {
    expect(renderToStaticMarkup(<ProjectsView report={report} />)).toContain('href="/sessions/s1"');
  });
  it("session lists turns", () => {
    const html = renderToStaticMarkup(
      <SessionView detail={{ session, turns: [{ timestamp: session.firstTimestamp, model: "claude-sonnet-4-5", ...t, cost: 1.5, hasUnknownModel: false }] }} />,
    );
    expect(html).toContain("main");
    expect(html).toContain("2026-10-08 10:00:00 UTC");
  });
  it("sets the page title", () => {
    expect(metadata.title).toBe("Claude Dashboard");
  });
});
