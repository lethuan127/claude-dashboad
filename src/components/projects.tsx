import Link from "next/link";
import type { UsageReport } from "@/lib/claude-logs/types";
import { formatTime, formatTokens, sortByLastActive, totalTokens } from "@/lib/dashboard";
import { Cost, EmptyState } from "./ui";

export function ProjectsView({ report }: { report: UsageReport }) {
  const projects = sortByLastActive(report.projects.filter((p) => p.sessionCount > 0));
  if (projects.length === 0) return <EmptyState what="projects" />;
  return (
    <table>
      <thead>
        <tr>
          <th>Project</th><th className="num">Sessions</th><th className="num">Tokens</th>
          <th className="num">Est. cost</th><th>Last active</th>
        </tr>
      </thead>
      <tbody>
        {projects.map((p) => {
          const latest = report.sessions
            .filter((s) => s.project === p.project)
            .sort((a, b) => (b.lastTimestamp ?? "").localeCompare(a.lastTimestamp ?? ""))[0];
          return (
            <tr key={p.project}>
              <td>
                {latest?.cwd ?? p.project}
                {latest && (
                  <>
                    {" "}
                    <Link href={`/sessions/${encodeURIComponent(latest.id)}`}>latest session</Link>
                  </>
                )}
              </td>
              <td className="num">{p.sessionCount}</td>
              <td className="num">{formatTokens(totalTokens(p))}</td>
              <td className="num"><Cost value={p.cost} unknown={p.hasUnknownModel} /></td>
              <td>{formatTime(p.lastActive)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
