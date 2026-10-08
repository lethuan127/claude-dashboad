import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { readSession } from "@/lib/claude-logs";
import { SessionView } from "@/components/session";
import { Loading } from "@/components/ui";

async function Session({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const detail = await readSession(decodeURIComponent(id));
  if (!detail) notFound();
  return <SessionView detail={detail} />;
}

export default function SessionPage({ params }: PageProps<"/sessions/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Session params={params} />
    </Suspense>
  );
}
