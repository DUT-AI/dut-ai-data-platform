"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { useAssetAnnotationsQuery } from "../hooks/use-annotations";
import { AnnotationViewerCanvas } from "./annotation-viewer-canvas";
import { RevisionHistoryPanel } from "./revision-history-panel";
import { RevisionDiffView } from "./revision-diff-view";
import { openAssetInLabelStudio } from "../api/annotation-api";


interface AnnotationEditorModalProps {
  assetId: string;
  assetFilename: string;
  downloadUrl?: string;
  /** ID project Platform (truyền từ context) */
  projectId?: string;
  /** ID ontology version hiện tại của project */
  ontologyVersionId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AnnotationEditorModal({
  assetId,
  assetFilename,
  downloadUrl,
  projectId,
  ontologyVersionId,
  isOpen,
  onClose,
}: AnnotationEditorModalProps) {
  const { data: annotations, isLoading } = useAssetAnnotationsQuery(assetId);
  const activeAnnotation = annotations?.[0];
  const revisions = useMemo(
    () => activeAnnotation?.revisions || [],
    [activeAnnotation]
  );

  const [selectedRevisionId, setSelectedRevisionId] = useState<string>("");
  const [isOpeningLS, setIsOpeningLS] = useState(false);
  const [lsError, setLsError] = useState<string | null>(null);

  const activeRevision = useMemo(() => {
    if (selectedRevisionId) {
      return revisions.find((r) => r.id === selectedRevisionId) || revisions[0];
    }
    return revisions[0];
  }, [revisions, selectedRevisionId]);

  const activeRevisionIdx = revisions.findIndex((r) => r.id === activeRevision?.id);
  const previousRevision = revisions[activeRevisionIdx + 1];

  // Có thể mở LS khi có downloadUrl (presigned URL của ảnh)
  // projectId và ontologyVersionId là optional — backend có fallback config
  const canOpenLS = !!downloadUrl;

  const handleOpenInLabelStudio = async () => {
    if (!canOpenLS || !downloadUrl) return;
    setIsOpeningLS(true);
    setLsError(null);
    try {
      const res = await openAssetInLabelStudio(assetId, {
        project_id: projectId || "unknown",
        ontology_version_id: ontologyVersionId || "default",
        presigned_url: downloadUrl,
      });
      window.open(res.task_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("[OpenInLS]", err);
      setLsError(
        "Không thể kết nối Label Studio. Kiểm tra LABEL_STUDIO_API_KEY trong .env"
      );
    } finally {
      setIsOpeningLS(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 bg-slate-950 text-slate-100 border-slate-800">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <DialogTitle className="text-base font-mono font-bold text-slate-100">
              🏷️ Annotation Inspection: {assetFilename}
            </DialogTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Xem và kiểm tra các kết quả gán nhãn, phiên bản sửa đổi (Revisions).
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <Button
              size="sm"
              variant="default"
              className="text-xs"
              onClick={handleOpenInLabelStudio}
              disabled={!canOpenLS || isOpeningLS}
              isLoading={isOpeningLS}
              title="Mở task trong Label Studio để gán nhãn"
            >
              ↗ Open in Label Studio
            </Button>
            {lsError && (
              <p className="text-[11px] text-red-400 max-w-[260px] text-right">{lsError}</p>
            )}
            {!downloadUrl && (
              <p className="text-[11px] text-slate-500">
                Đang tải URL ảnh...
              </p>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-400">
            Đang tải dữ liệu nhãn gán...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 flex-1 overflow-hidden">
            {/* Visual Canvas Overlay (2 cols) */}
            <div className="md:col-span-2 flex flex-col space-y-3">
              <AnnotationViewerCanvas
                imageUrl={downloadUrl}
                results={activeRevision?.results || []}
              />
            </div>

            {/* Revision Timeline & Diff Sidebar (1 col) */}
            <div className="space-y-4 flex flex-col justify-between overflow-y-auto">
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
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
