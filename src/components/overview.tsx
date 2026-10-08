import type { UsageReport } from "@/lib/claude-logs/types";
import {
  formatTokens,
  splitByModel,
  tokensPerDay,
  windows,
  type Totals,
} from "@/lib/dashboard";
import { Cost, EmptyState } from "./ui";

function Card({ label, t }: { label: string; t: Totals }) {
  return (
    <div className="card">
      <h3>{label}</h3>
      <p className="big">{formatTokens(t.tokens)} tokens</p>
      <p>
        <Cost value={t.cost} unknown={t.hasUnknownModel} />
      </p>
    </div>
  );
}

function DailyChart({ data }: { data: { date: string; tokens: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.tokens));
  const w = 20;
  const h = 120;
  return (
    <svg
      role="img"
      aria-label="Tokens per day, last 30 days"
      viewBox={`0 0 ${data.length * w} ${h}`}
      className="chart"
      preserveAspectRatio="none"
    >
      {data.map((d, i) => {
        const bar = (d.tokens / max) * h;
        return (
          <rect key={d.date} x={i * w + 2} y={h - bar} width={w - 4} height={bar} fill="currentColor">
            <title>{`${d.date}: ${formatTokens(d.tokens)} tokens`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

export function OverviewView({ report, now }: { report: UsageReport; now: Date }) {
  if (report.sessions.length === 0) return <EmptyState what="usage" />;
  const w = windows(report.daily, now);
  const days = tokensPerDay(report.daily, now, 30);
  const models = splitByModel(report.daily, now, 30);
  return (
    <>
      <div className="cards">
        <Card label="Today" t={w.today} />
        <Card label="Last 7 days" t={w.week} />
        <Card label="Last 30 days" t={w.month} />
      </div>
      <h2>Tokens per day (last 30 days)</h2>
      <DailyChart data={days} />
      <p className="muted">
        {days[0].date} → {days[days.length - 1].date} (UTC) · peak{" "}
        {formatTokens(Math.max(...days.map((d) => d.tokens)))} tokens
      </p>
      <h2>By model (last 30 days)</h2>
      {models.length === 0 ? (
        <p className="muted">No usage in the last 30 days.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Model</th><th className="num">Tokens</th><th className="num">Est. cost</th></tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.model}>
                <td>{m.model}</td>
                <td className="num">{formatTokens(m.tokens)}</td>
                <td className="num"><Cost value={m.cost} unknown={m.hasUnknownModel} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {report.unknownModels.length > 0 && (
        <p className="unknown">
          ⚠ Cost excludes models without a known price: {report.unknownModels.join(", ")}
        </p>
      )}
    </>
  );
}
