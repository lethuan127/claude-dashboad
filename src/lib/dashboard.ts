import type { DailyModelTotals, ProjectSummary, TokenCounts } from "./claude-logs/types";

export const totalTokens = (t: TokenCounts): number =>
  t.inputTokens + t.outputTokens + t.cacheCreationTokens + t.cacheReadTokens;

export interface Totals {
  tokens: number;
  cost: number;
  hasUnknownModel: boolean;
}

/** YYYY-MM-DD (UTC) of a Date. */
export const utcDate = (d: Date): string => d.toISOString().slice(0, 10);

/** The last `days` UTC dates ending at `now`, oldest first. */
export function lastDays(now: Date, days: number): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(utcDate(new Date(now.getTime() - i * 86_400_000)));
  }
  return out;
}

/** Sum of daily rows whose date falls in the last `days` UTC days (today included). */
export function sumWindow(daily: DailyModelTotals[], now: Date, days: number): Totals {
  const dates = new Set(lastDays(now, days));
  return sumRows(daily.filter((d) => dates.has(d.date)));
}

function sumRows(rows: DailyModelTotals[]): Totals {
  const t: Totals = { tokens: 0, cost: 0, hasUnknownModel: false };
  for (const r of rows) {
    t.tokens += totalTokens(r);
    t.cost += r.cost;
    t.hasUnknownModel ||= r.hasUnknownModel;
  }
  return t;
}

export const windows = (daily: DailyModelTotals[], now: Date) => ({
  today: sumWindow(daily, now, 1),
  week: sumWindow(daily, now, 7),
  month: sumWindow(daily, now, 30),
});

/** Tokens per day for the last `days` days, zero-filled. */
export function tokensPerDay(daily: DailyModelTotals[], now: Date, days: number) {
  const byDate = new Map<string, number>();
  for (const r of daily) byDate.set(r.date, (byDate.get(r.date) ?? 0) + totalTokens(r));
  return lastDays(now, days).map((date) => ({ date, tokens: byDate.get(date) ?? 0 }));
}

export interface ModelSplit extends Totals {
  model: string;
}

/** Per-model totals in the last `days` days, biggest token count first. */
export function splitByModel(daily: DailyModelTotals[], now: Date, days: number): ModelSplit[] {
  const dates = new Set(lastDays(now, days));
  const map = new Map<string, DailyModelTotals[]>();
  for (const r of daily) {
    if (!dates.has(r.date)) continue;
    map.set(r.model, [...(map.get(r.model) ?? []), r]);
  }
  return [...map.entries()]
    .map(([model, rows]) => ({ model, ...sumRows(rows) }))
    .sort((a, b) => b.tokens - a.tokens || a.model.localeCompare(b.model));
}

/** Newest activity first; projects without a timestamp go last. */
export function sortByLastActive(projects: ProjectSummary[]): ProjectSummary[] {
  return [...projects].sort((a, b) => {
    if (a.lastActive === b.lastActive) return a.project.localeCompare(b.project);
    if (!a.lastActive) return 1;
    if (!b.lastActive) return -1;
    return b.lastActive.localeCompare(a.lastActive);
  });
}

export const formatTokens = (n: number): string => n.toLocaleString("en-US");
export const formatCost = (n: number): string => `$${n.toFixed(2)}`;
export const formatTime = (iso: string | null): string =>
  iso ? iso.slice(0, 19).replace("T", " ") + " UTC" : "—";
