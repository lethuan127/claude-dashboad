export interface TokenCounts {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export interface CostInfo {
  /** USD. 0 when the model is unknown. */
  cost: number;
  /** True if any usage in this row came from a model missing in the price table. */
  hasUnknownModel: boolean;
}

export interface SessionSummary extends TokenCounts, CostInfo {
  id: string;
  /** Folder name under projects/. */
  project: string;
  cwd: string | null;
  gitBranch: string | null;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  models: string[];
  messageCount: number;
}

export interface ProjectSummary extends TokenCounts, CostInfo {
  /** Folder name under projects/. */
  project: string;
  sessionCount: number;
}

export interface DailyModelTotals extends TokenCounts, CostInfo {
  /** YYYY-MM-DD (UTC). */
  date: string;
  model: string;
}

export interface UsageReport {
  sessions: SessionSummary[];
  projects: ProjectSummary[];
  daily: DailyModelTotals[];
  unknownModels: string[];
}
