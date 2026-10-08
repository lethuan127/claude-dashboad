import { Suspense } from "react";
import { connection } from "next/server";
import { readUsage } from "@/lib/claude-logs";
import { OverviewView } from "@/components/overview";
import { Loading } from "@/components/ui";

async function Overview() {
  await connection(); // render per request, never at build time
  const report = await readUsage();
  return <OverviewView report={report} now={new Date()} />;
}

export default function Home() {
  return (
    <>
      <h1>Overview</h1>
      <Suspense fallback={<Loading />}>
        <Overview />
      </Suspense>
    </>
  );
}
