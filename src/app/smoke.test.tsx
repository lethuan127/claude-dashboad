import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OverviewView } from "@/components/overview";
import { ProjectsView } from "@/components/projects";
import { SessionView } from "@/components/session";
import { readSession, readUsage } from "@/lib/claude-logs";

const FIXTURES = path.join(import.meta.dirname, "../lib/claude-logs/__fixtures__");

describe("pages rendered from the fixtures folder", () => {
  it("renders numbers on all three views", async () => {
    const report = await readUsage(FIXTURES);
    const now = new Date("2025-10-02T12:00:00Z");
    const overview = renderToStaticMarkup(<OverviewView report={report} now={now} />);
    expect(overview).toContain("Last 30 days");
    expect(overview).toContain("4,801,030 tokens");
    expect(overview).toContain("claude-mystery-9");
    expect(overview).toContain("partial");

    const projects = renderToStaticMarkup(<ProjectsView report={report} />);
    expect(projects).toContain("/home/me/alpha");
    expect(projects.indexOf("/home/me/alpha")).toBeLessThan(projects.indexOf("/home/me/beta"));

    const detail = (await readSession("s1", FIXTURES))!;
    const session = renderToStaticMarkup(<SessionView detail={detail} />);
    expect(session).toContain("1,000,000");
    expect(session).toContain("main");
  });
});
