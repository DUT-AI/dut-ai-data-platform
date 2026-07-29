import { use } from "react";
import { AnnotationWorkspaceView } from "@/features/annotation/components/annotation-workspace-view";

interface PageProps {
  params: Promise<{ id: string; assetId: string }>;
  searchParams: Promise<{
    ontologyVersionId?: string;
    datasetVersionId?: string;
  }>;
}

export default function AnnotateAssetPage({ params, searchParams }: PageProps) {
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);

  return (
    <AnnotationWorkspaceView
      projectId={resolvedParams.id}
      assetId={resolvedParams.assetId}
      ontologyVersionId={resolvedSearchParams.ontologyVersionId}
      datasetVersionId={resolvedSearchParams.datasetVersionId}
    />
  );
}
