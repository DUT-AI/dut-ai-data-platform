"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { useAssetAnnotationsQuery } from "../hooks/use-annotations";
import {
  useAssetDownloadUrlQuery,
  useVersionAssetsQuery,
} from "@/features/dataset/hooks/use-datasets";
import { RevisionHistoryPanel } from "./revision-history-panel";
import { RevisionDiffView } from "./revision-diff-view";
import { openAssetInLabelStudio } from "../api/annotation-api";

interface AnnotationWorkspaceViewProps {
  projectId: string;
  assetId: string;
  ontologyVersionId?: string;
  datasetVersionId?: string;
}

export function AnnotationWorkspaceView({
  projectId,
  assetId,
  ontologyVersionId,
  datasetVersionId,
}: AnnotationWorkspaceViewProps) {
  const router = useRouter();

  // Queries
  const { data: annotations, isLoading: isAnnoLoading } =
    useAssetAnnotationsQuery(assetId);
  const { data: downloadData, isLoading: isDownloadLoading } =
    useAssetDownloadUrlQuery(assetId);
  const { data: assets, isLoading: isAssetsLoading } = useVersionAssetsQuery(
    datasetVersionId || ""
  );

  const downloadUrl = downloadData?.download_url;
  const activeAnnotation = annotations?.[0];
  const revisions = useMemo(
    () => activeAnnotation?.revisions || [],
    [activeAnnotation]
  );

  const [selectedRevisionId, setSelectedRevisionId] = useState<string>("");
  const [taskUrl, setTaskUrl] = useState<string | null>(null);
  const [isFetchingUrl, setIsFetchingUrl] = useState(true);
  const [lsError, setLsError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Active revision selector
  const activeRevision = useMemo(() => {
    if (selectedRevisionId) {
      return revisions.find((r) => r.id === selectedRevisionId) || revisions[0];
    }
    return revisions[0];
  }, [revisions, selectedRevisionId]);

  const activeRevisionIdx = revisions.findIndex(
    (r) => r.id === activeRevision?.id
  );
  const previousRevision = revisions[activeRevisionIdx + 1];

  // Navigation queue logic
  const currentAssetIdx = useMemo(() => {
    if (!assets) return -1;
    return assets.findIndex((a) => a.id === assetId);
  }, [assets, assetId]);

  const currentAsset = useMemo(() => {
    if (assets && currentAssetIdx !== -1) {
      return assets[currentAssetIdx];
    }
    return null;
  }, [assets, currentAssetIdx]);

  const hasPrev = currentAssetIdx > 0;
  const hasNext = assets && currentAssetIdx < assets.length - 1;

  const navigateToAsset = (targetAssetId: string) => {
    router.push(
      `/projects/${projectId}/annotate/${targetAssetId}?ontologyVersionId=${ontologyVersionId || ""}&datasetVersionId=${datasetVersionId || ""}`
    );
  };

  const [prevAssetId, setPrevAssetId] = useState(assetId);
  if (assetId !== prevAssetId) {
    setPrevAssetId(assetId);
    setTaskUrl(null);
    setIsFetchingUrl(true);
    setLsError(null);
  }

  // Fetch LS URL on mount / assetId change
  useEffect(() => {
    if (!assetId || !downloadUrl) {
      return;
    }

    let isSubscribed = true;

    openAssetInLabelStudio(assetId, {
      project_id: projectId,
      ontology_version_id: ontologyVersionId || "default",
      presigned_url: downloadUrl,
      dataset_version_id: datasetVersionId,
    })
      .then((res) => {
        if (isSubscribed) {
          setTaskUrl(res.task_url);
        }
      })
      .catch((err) => {
        console.error("[FetchWorkspaceLSUrl]", err);
        if (isSubscribed) {
          setLsError("Không thể kết nối Label Studio Server để chỉnh sửa.");
        }
      })
      .finally(() => {
        if (isSubscribed) {
          setIsFetchingUrl(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [assetId, downloadUrl, projectId, ontologyVersionId, datasetVersionId]);

  const handleOpenInNewTab = () => {
    if (taskUrl) {
      window.open(taskUrl, "_blank", "noopener,noreferrer");
    }
  };

  const isLoading =
    isAnnoLoading || isDownloadLoading || isAssetsLoading || isFetchingUrl;
  const assetFilename = currentAsset?.filename || "Asset";

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* Platform Header tối giản */}
      <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
        {/* Left: Back Navigation */}
        <div className="flex items-center space-x-4">
          <Link
            href={`/projects/${projectId}`}
            className="flex items-center space-x-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
          >
            <span>←</span>
            <span>Quay lại Dataset</span>
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <span
            className="max-w-[200px] truncate font-mono text-sm font-semibold"
            title={assetFilename}
          >
            📄 {assetFilename}
          </span>
        </div>

        {/* Center: Session Queue Navigation */}
        {assets && assets.length > 0 && currentAssetIdx !== -1 && (
          <div className="flex items-center space-x-3">
            <Button
              size="sm"
              variant="outline"
              disabled={!hasPrev}
              onClick={() => navigateToAsset(assets[currentAssetIdx - 1].id)}
              className="h-8 border-slate-800 bg-slate-950 px-3 text-xs text-slate-300 hover:bg-slate-900"
            >
              ◀ Trước
            </Button>
            <span className="font-mono text-xs text-slate-400">
              Tệp {currentAssetIdx + 1} / {assets.length}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={!hasNext}
              onClick={() => navigateToAsset(assets[currentAssetIdx + 1].id)}
              className="h-8 border-slate-800 bg-slate-950 px-3 text-xs text-slate-300 hover:bg-slate-900"
            >
              Sau ▶
            </Button>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center space-x-3">
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenInNewTab}
            disabled={!taskUrl}
            className="h-8 border-slate-800 bg-slate-950 text-xs text-slate-300 hover:bg-slate-900"
          >
            ↗ Mở Tab Mới (Full tab)
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="h-8 font-mono text-xs"
          >
            {isSidebarOpen ? "➡️ Ẩn Sidebar" : "⬅️ Lịch sử nhãn"}
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Workspace Canvas (Iframe) */}
        <main className="relative flex flex-1 flex-col bg-slate-950">
          {lsError && (
            <div className="absolute left-6 right-6 top-6 z-50 rounded-lg border border-red-900/50 bg-red-950/40 p-4 text-sm text-red-400">
              ⚠️ {lsError}
            </div>
          )}

          {isLoading ? (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center space-y-3 bg-slate-950/90">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
              <span className="font-mono text-xs text-slate-400">
                Đang chuẩn bị workspace gán nhãn...
              </span>
            </div>
          ) : taskUrl ? (
            <iframe
              src={taskUrl}
              className="h-full w-full border-0 bg-white"
              allow="clipboard-read; clipboard-write"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-mono text-sm text-slate-500">
              Không thể tải nội dung xem trước của tệp.
            </div>
          )}
        </main>

        {/* Right Panel Sidebar (Revision History) */}
        {isSidebarOpen && (
          <aside className="flex w-80 flex-col space-y-4 overflow-y-auto border-l border-slate-800 bg-slate-900 p-4">
            <RevisionHistoryPanel
              revisions={revisions}
              selectedRevisionId={activeRevision?.id || ""}
              onSelectRevision={(id) => setSelectedRevisionId(id)}
            />

            {activeRevision && (
              <RevisionDiffView
                currentRevision={activeRevision}
                previousRevision={previousRevision}
              />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
