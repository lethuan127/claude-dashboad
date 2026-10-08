import "server-only";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { computeCost } from "./cost";
import type {
  DailyModelTotals,
  ProjectSummary,
  SessionDetail,
  SessionSummary,
  SessionTurn,
  TokenCounts,
  UsageReport,
} from "./types";

export function getClaudeDir(): string {
  return process.env.CLAUDE_DIR || path.join(os.homedir(), ".claude");
}

const zero = (): TokenCounts => ({
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
});

function add(a: TokenCounts, b: TokenCounts) {
  a.inputTokens += b.inputTokens;
  a.outputTokens += b.outputTokens;
  a.cacheCreationTokens += b.cacheCreationTokens;
  a.cacheReadTokens += b.cacheReadTokens;
}

const num = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;
const str = (v: unknown): string | null =>
  typeof v === "string" && v ? v : null;

async function readDirNames(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

interface Entry {
  sessionId: string | null;
  model: string;
  timestamp: string | null;
  cwd: string | null;
  gitBranch: string | null;
  tokens: TokenCounts;
}

function parseLine(line: string): Entry | null {
  if (!line.trim()) return null;
  let obj: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    obj = JSON.parse(line);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object" || obj.type !== "assistant") return null;
  const msg = obj.message ?? {};
  const u = msg.usage ?? {};
  return {
    sessionId: str(obj.sessionId),
    model: str(msg.model) ?? "unknown",
    timestamp: str(obj.timestamp),
    cwd: str(obj.cwd),
    gitBranch: str(obj.gitBranch),
    tokens: {
      inputTokens: num(u.input_tokens),
      outputTokens: num(u.output_tokens),
      cacheCreationTokens: num(u.cache_creation_input_tokens),
      cacheReadTokens: num(u.cache_read_input_tokens),
    },
  };
}

/**
 * Reads `<claudeDir>/projects/*\/*.jsonl` and aggregates usage and cost.
 * Read-only; a missing directory yields an empty report.
 */
export async function readUsage(
  claudeDir: string = getClaudeDir(),
): Promise<UsageReport> {
  const projectsDir = path.join(claudeDir, "projects");
  const sessions: SessionSummary[] = [];
  const projects: ProjectSummary[] = [];
  const dailyMap = new Map<string, DailyModelTotals>();
  const unknown = new Set<string>();

  for (const project of await readDirNames(projectsDir)) {
    const projDir = path.join(projectsDir, project);
    let files: string[] = [];
    try {
      files = (await fs.readdir(projDir)).filter((f) => f.endsWith(".jsonl")).sort();
    } catch {}

    const proj: ProjectSummary = {
      project,
      sessionCount: 0,
      lastActive: null,
      ...zero(),
      cost: 0,
      hasUnknownModel: false,
    };

    for (const file of files) {
      let text: string;
      try {
        text = await fs.readFile(path.join(projDir, file), "utf8");
      } catch {
        continue;
      }
      const session: SessionSummary = {
        id: file.replace(/\.jsonl$/, ""),
        project,
        cwd: null,
        gitBranch: null,
        firstTimestamp: null,
        lastTimestamp: null,
        models: [],
        messageCount: 0,
        ...zero(),
        cost: 0,
        hasUnknownModel: false,
      };
      const models = new Set<string>();

      for (const line of text.split("\n")) {
        const e = parseLine(line);
        if (!e) continue;
        session.messageCount++;
        if (e.sessionId && session.messageCount === 1) session.id = e.sessionId;
        session.cwd ??= e.cwd;
        session.gitBranch ??= e.gitBranch;
        if (e.timestamp) {
          if (!session.firstTimestamp || e.timestamp < session.firstTimestamp)
            session.firstTimestamp = e.timestamp;
          if (!session.lastTimestamp || e.timestamp > session.lastTimestamp)
            session.lastTimestamp = e.timestamp;
        }
        models.add(e.model);
        add(session, e.tokens);

        const cost = computeCost(e.model, e.tokens);
        if (cost === null) {
          unknown.add(e.model);
          session.hasUnknownModel = true;
        } else {
          session.cost += cost;
        }

        if (e.timestamp) {
          const date = e.timestamp.slice(0, 10);
          const key = `${date}\u0000${e.model}`;
          let d = dailyMap.get(key);
          if (!d) {
            d = { date, model: e.model, ...zero(), cost: 0, hasUnknownModel: false };
            dailyMap.set(key, d);
          }
          add(d, e.tokens);
          if (cost === null) d.hasUnknownModel = true;
          else d.cost += cost;
        }
      }

      if (session.messageCount === 0) continue;
      session.models = [...models].sort();
      sessions.push(session);
      proj.sessionCount++;
      add(proj, session);
      proj.cost += session.cost;
      if (
        session.lastTimestamp &&
        (!proj.lastActive || session.lastTimestamp > proj.lastActive)
      )
        proj.lastActive = session.lastTimestamp;
      proj.hasUnknownModel ||= session.hasUnknownModel;
    }
    projects.push(proj);
  }

  const daily = [...dailyMap.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.model.localeCompare(b.model),
  );
  return { sessions, projects, daily, unknownModels: [...unknown].sort() };
}

/**
 * Reads one session's per-turn usage (one row per assistant message).
 * The id is only compared against log contents, never used as a path.
 * Returns null if no session has that id.
 */
export async function readSession(
  id: string,
  claudeDir: string = getClaudeDir(),
): Promise<SessionDetail | null> {
  const projectsDir = path.join(claudeDir, "projects");
  for (const project of await readDirNames(projectsDir)) {
    const projDir = path.join(projectsDir, project);
    let files: string[] = [];
    try {
      files = (await fs.readdir(projDir)).filter((f) => f.endsWith(".jsonl")).sort();
    } catch {}
    for (const file of files) {
      let text: string;
      try {
        text = await fs.readFile(path.join(projDir, file), "utf8");
      } catch {
        continue;
      }
      const entries = text.split("\n").map(parseLine).filter((e) => e !== null);
      if (entries.length === 0) continue;
      // Same id rule as readUsage: first entry's sessionId, else file name.
      if ((entries[0].sessionId ?? file.replace(/\.jsonl$/, "")) !== id) continue;

      const session: SessionSummary = {
        id,
        project,
        cwd: null,
        gitBranch: null,
        firstTimestamp: null,
        lastTimestamp: null,
        models: [],
        messageCount: entries.length,
        ...zero(),
        cost: 0,
        hasUnknownModel: false,
      };
      const models = new Set<string>();
      const turns: SessionTurn[] = [];
      for (const e of entries) {
        session.cwd ??= e.cwd;
        session.gitBranch ??= e.gitBranch;
        if (e.timestamp) {
          if (!session.firstTimestamp || e.timestamp < session.firstTimestamp)
            session.firstTimestamp = e.timestamp;
          if (!session.lastTimestamp || e.timestamp > session.lastTimestamp)
            session.lastTimestamp = e.timestamp;
        }
        models.add(e.model);
        add(session, e.tokens);
        const c = computeCost(e.model, e.tokens);
        if (c === null) session.hasUnknownModel = true;
        else session.cost += c;
        turns.push({
          timestamp: e.timestamp,
          model: e.model,
          ...e.tokens,
          cost: c ?? 0,
          hasUnknownModel: c === null,
        });
      }
      session.models = [...models].sort();
      return { session, turns };
    }
  }
  return null;
}
