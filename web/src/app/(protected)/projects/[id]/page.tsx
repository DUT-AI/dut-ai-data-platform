import { use } from "react";
import { ProjectDetailView } from "@/features/projects";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  return <ProjectDetailView projectId={resolvedParams.id} />;
}
