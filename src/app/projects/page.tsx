import { Suspense } from "react";
import { connection } from "next/server";
import { readUsage } from "@/lib/claude-logs";
import { ProjectsView } from "@/components/projects";
import { Loading } from "@/components/ui";

async function Projects() {
  await connection();
  return <ProjectsView report={await readUsage()} />;
}

export default function ProjectsPage() {
  return (
    <>
      <h1>Projects</h1>
      <Suspense fallback={<Loading />}>
        <Projects />
      </Suspense>
    </>
  );
}
