import type { SessionDetail } from "@/lib/claude-logs/types";
import { formatTime, formatTokens, totalTokens } from "@/lib/dashboard";
import { Cost } from "./ui";

export function SessionView({ detail }: { detail: SessionDetail }) {
  const { session: s, turns } = detail;
  return (
    <>
      <h1>Session {s.id}</h1>
      <dl className="meta">
        <dt>Model(s)</dt><dd>{s.models.join(", ")}</dd>
        <dt>Started</dt><dd>{formatTime(s.firstTimestamp)}</dd>
        <dt>Ended</dt><dd>{formatTime(s.lastTimestamp)}</dd>
        <dt>Git branch</dt><dd>{s.gitBranch ?? "—"}</dd>
        <dt>Project</dt><dd>{s.cwd ?? s.project}</dd>
        <dt>Total</dt>
        <dd>
          {formatTokens(totalTokens(s))} tokens · <Cost value={s.cost} unknown={s.hasUnknownModel} />
        </dd>
      </dl>
      <h2>Tokens per turn</h2>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Time</th><th>Model</th><th className="num">Input</th>
            <th className="num">Output</th><th className="num">Cache write</th>
            <th className="num">Cache read</th><th className="num">Est. cost</th>
          </tr>
        </thead>
        <tbody>
          {turns.map((t, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{formatTime(t.timestamp)}</td>
              <td>{t.model}</td>
              <td className="num">{formatTokens(t.inputTokens)}</td>
              <td className="num">{formatTokens(t.outputTokens)}</td>
              <td className="num">{formatTokens(t.cacheCreationTokens)}</td>
              <td className="num">{formatTokens(t.cacheReadTokens)}</td>
              <td className="num"><Cost value={t.cost} unknown={t.hasUnknownModel} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
