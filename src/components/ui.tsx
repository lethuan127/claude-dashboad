import type { ReactNode } from "react";
import { formatCost } from "@/lib/dashboard";

export function Cost({ value, unknown }: { value: number; unknown: boolean }) {
  return (
    <>
      {formatCost(value)}
      {unknown && (
        <abbr
          className="unknown"
          title="Includes usage from models without a known price; the real cost is higher."
        >
          {" "}
          ⚠ partial
        </abbr>
      )}
    </>
  );
}

export function EmptyState({ what }: { what: string }) {
  return (
    <section className="empty">
      <h2>No Claude Code logs found</h2>
      <p>
        There is no {what} to show. This dashboard reads <code>projects/*/*.jsonl</code> from{" "}
        <code>~/.claude</code>. To read another folder, start the server with{" "}
        <code>CLAUDE_DIR=/path/to/.claude</code>.
      </p>
    </section>
  );
}

export function Loading({ children }: { children?: ReactNode }) {
  return <p className="muted">{children ?? "Reading logs…"}</p>;
}
