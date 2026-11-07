"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useAssetAnnotationsQuery,
  useFullscreen,
  useRegionClipboard,
  useWorkspaceAnnotationState,
} from "../hooks";
import {
  useAssetDownloadUrlQuery,
  useVersionAssetsQuery,
} from "@/features/dataset";
import {
  useProjectOntologyQuery,
  useOntologySchemaQuery,
} from "@/features/ontology";
import { AlertCircle, Check, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useProjectQuery } from "@/features/projects";
import { AnnotationEditorDispatcher } from "./annotation-editor-dispatcher";
import { ClassificationEditor } from "./classification-editor";
import { InstructionsModal } from "./instructions-modal";
import { ZoomPanControls } from "./zoom-pan-controls";
import { TimelineController } from "./timeline-controller";
import { HotkeySettingsModal } from "../commands/hotkey-settings-modal";
import { CommandRegistryProvider, useRegisterCommand } from "../commands";
import { ToolManagerProvider } from "../tools/tool-manager";
import {
  WorkspaceHeader,
  WorkspaceCategoryBar,
  WorkspaceSidebar,
} from "./workspace";
import { createAnnotation, createRevision } from "../api";
import {
  resolveAudioLabelMode,
  serializeAnnotationResults,
} from "../utils/audio-label-utils";
import {
  ReviewCommentModal,
  useRecordAssetReviewMutation,
  useWorkItemDetailQuery,
} from "@/features/workflow";
import type { AssetReviewItem } from "@/features/workflow";

interface AnnotationWorkspaceViewProps {
  projectId: string;
  assetId: string;
  ontologyVersionId?: string;
  datasetVersionId?: string;
  workItemId?: string;
}

export function AnnotationWorkspaceView(props: AnnotationWorkspaceViewProps) {
  return (
    <CommandRegistryProvider defaultScope="workspace">
      <ToolManagerProvider defaultTool="select">
        <AnnotationWorkspaceInner {...props} />
      </ToolManagerProvider>
    </CommandRegistryProvider>
  );
}

function AnnotationWorkspaceInner({
  projectId,
  assetId,
  ontologyVersionId,
  datasetVersionId,
  workItemId,
}: AnnotationWorkspaceViewProps) {
  const router = useRouter();
  const workspaceContainerRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: workItem } = useWorkItemDetailQuery(workItemId);
  const batchName = workItem?.resource_id;
  const batchAssetIds = useMemo(() => {
    const meta = workItem?.metadata as Record<string, unknown> | undefined;
    if (meta && Array.isArray(meta.asset_ids)) {
      return meta.asset_ids as string[];
    }
    return [];
  }, [workItem]);

  const {
    data: project,
    isLoading: isProjectLoading,
    error: projectError,
  } = useProjectQuery(projectId);
  const {
    data: ontology,
    isLoading: isOntologyLoading,
    error: ontologyError,
  } = useProjectOntologyQuery(projectId);

  const effectiveOntologyVersionId = useMemo(() => {
    if (ontologyVersionId) return ontologyVersionId;
    if (ontology?.current_version_id) return ontology.current_version_id;
    return ontology?.versions?.[0]?.id || "";
  }, [ontologyVersionId, ontology]);

  const ontologyId = ontology?.id || "";

  const {
    data: exportedSchema,
    isLoading: isSchemaLoading,
    error: schemaError,
  } = useOntologySchemaQuery(projectId, ontologyId, effectiveOntologyVersionId);

  const { categoryNames, categoryColors, categoryKeys, availableCategories } =
    useMemo(() => {
      const names: Record<string, string> = {};
      const colors: Record<string, string> = {};
      const keys: Record<string, string> = {};
      const list: Array<{
        id: string;
        name: string;
        color?: string | null;
        key: string;
      }> = [];

      if (exportedSchema?.outputs) {
        exportedSchema.outputs.forEach((output) => {
          output.categories?.forEach((cat) => {
            if (!names[cat.id]) {
              names[cat.id] = cat.name;
              keys[cat.id] = cat.key;
              if (cat.color) colors[cat.id] = cat.color;
              list.push(cat);
            }
          });
        });
      }

      return {
        categoryNames: names,
        categoryColors: colors,
        categoryKeys: keys,
        availableCategories: list,
      };
    }, [exportedSchema]);

  // Derive editor-level metadata from the primary output definition.
  // This is forwarded to specialized editors:
  //   - TextClassificationCanvas reads `metadata.multiple`
  //   - NerAnnotationCanvas reads `metadata.outputId` to stamp output_id on results
  // NOTE: `value_schema` is only persisted for custom_object outputs by the backend;
  //       do NOT read task-specific config (e.g. QA question) from it for other types.
  const editorMetadata = useMemo(() => {
    const primaryOutput = exportedSchema?.outputs?.[0];
    if (!primaryOutput) return undefined;
    return {
      // Used by TextClassificationCanvas for multi-label mode
      multiple: primaryOutput.multiple,
      // Passed to NER/QA editors so created results carry the correct output_id,
      // enabling multi-output ontologies to associate each span unambiguously.
      outputId: primaryOutput.id,
    };
  }, [exportedSchema]);

  const {
    data: annotations,
    isLoading: isAnnoLoading,
    error: annotationError,
    refetch: refetchAnnotations,
  } = useAssetAnnotationsQuery(assetId);
  const {
    data: downloadData,
    isLoading: isDownloadLoading,
    error: downloadError,
  } = useAssetDownloadUrlQuery(assetId);
  const {
    data: rawVersionAssets,
    isLoading: isAssetsLoading,
    error: assetsError,
  } = useVersionAssetsQuery(datasetVersionId || "");

  // Scope assets strictly to batch assets when workItemId / batchAssetIds is provided
  const assets = useMemo(() => {
    if (!rawVersionAssets || rawVersionAssets.length === 0) return [];
    if (batchAssetIds.length > 0) {
      const assetMap = new Map(rawVersionAssets.map((a) => [a.id, a]));
      const scoped = batchAssetIds
        .map((id) => assetMap.get(id))
        .filter((a): a is (typeof rawVersionAssets)[0] => Boolean(a));
      if (scoped.length > 0) return scoped;
    }
    return rawVersionAssets;
  }, [rawVersionAssets, batchAssetIds]);

  const downloadUrl = downloadData?.download_url;
  const activeAnnotation = annotations?.[0];
  const revisions = useMemo(() => {
    if (!activeAnnotation) return [];
    const list = activeAnnotation.revisions
      ? [...activeAnnotation.revisions]
      : [];
    if (list.length === 0 && activeAnnotation.latest_revision) {
      list.push(activeAnnotation.latest_revision);
    }
    // Sort descending so the latest revision is always first (index 0)
    list.sort((a, b) => (b.revision_number || 0) - (a.revision_number || 0));
    return list;
  }, [activeAnnotation]);

  const [selectedRevisionId, setSelectedRevisionId] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [savedResultsHash, setSavedResultsHash] = useState("[]");
  const [isReviewCommentModalOpen, setIsReviewCommentModalOpen] = useState(false);
  const recordAssetReviewMutation = useRecordAssetReviewMutation();

  const assetReviews = useMemo(() => {
    const meta = workItem?.metadata as Record<string, unknown> | undefined;
    return (meta?.asset_reviews || {}) as Record<string, AssetReviewItem>;
  }, [workItem]);
  const currentAssetReview = assetReviews[assetId];

  // Modality & Task Type Detection
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

  const assetFilename = currentAsset?.filename || "Asset";

  const {
    effectiveInputType,
    primaryOutput,
    primaryOutputType,
    audioLabelMode,
    isClassificationOnly,
    isSpatialVision,
    isAudio,
    isVideo,
  } = useMemo(() => {
    const inputType = exportedSchema?.inputs?.[0]?.schema?.type;
    const firstOutput = exportedSchema?.outputs?.[0];

    let effInput = inputType;
    const filename = (currentAsset?.filename || "").toLowerCase();
    if (!effInput) {
      if (filename.match(/\.(mp3|wav|ogg|m4a|aac)$/)) effInput = "audio";
      else if (filename.match(/\.(mp4|webm|avi|mov|mkv)$/)) effInput = "video";
      else if (filename.match(/\.(csv|json|tsv)$/)) effInput = "tabular";
      else if (filename.match(/\.(txt|md|log|docx?)$/)) effInput = "document";
      else effInput = "image";
    }

    const preliminaryAudioMode =
      effInput === "audio"
        ? resolveAudioLabelMode(project?.template_id, firstOutput)
        : null;
    const selectedOutput =
      preliminaryAudioMode === "intent_classification"
        ? exportedSchema?.outputs?.find(
            (output) => output.type === "classification"
          ) || firstOutput
        : preliminaryAudioMode === "asr" ||
            preliminaryAudioMode === "asr_segments"
          ? exportedSchema?.outputs?.find((output) => output.type === "text") ||
            firstOutput
          : firstOutput;
    let defaultOutputType: string | undefined = undefined;
    if (!selectedOutput) {
      const templateId = (project?.template_id || "").toLowerCase();
      if (templateId.includes("polygon")) {
        defaultOutputType = "polygon";
      } else if (templateId.includes("mask") || templateId.includes("brush")) {
        defaultOutputType = "brush_mask";
      } else if (templateId.includes("classification")) {
        defaultOutputType = "classification";
      } else if (templateId.includes("keypoint")) {
        defaultOutputType = "keypoint";
      } else if (
        templateId.includes("bounding") ||
        templateId.includes("bbox") ||
        templateId.includes("detection")
      ) {
        defaultOutputType = "bounding_box";
      } else if (effInput === "image") {
        defaultOutputType = "bounding_box";
      } else if (effInput === "video") {
        defaultOutputType = "video_segment";
      } else if (effInput === "audio") {
        defaultOutputType = "audio_segment";
      } else if (effInput === "tabular") {
        defaultOutputType = "tabular";
      } else if (effInput === "document") {
        defaultOutputType = "named_entity";
      }
    }

    const outputType = selectedOutput?.type || defaultOutputType;
    const resolvedAudioMode =
      effInput === "audio"
        ? resolveAudioLabelMode(project?.template_id, selectedOutput)
        : null;

    const isClassOnly =
      outputType === "classification" &&
      (!exportedSchema?.outputs || exportedSchema.outputs.length <= 1);
    const isSpatial =
      outputType === "bounding_box" ||
      outputType === "polygon" ||
      (outputType as string) === "brush_mask" ||
      (outputType as string) === "mask" ||
      (outputType as string) === "keypoint" ||
      effInput === "image";
    const isAud =
      effInput === "audio" || (outputType as string) === "audio_segment";
    const isVid =
      effInput === "video" || (outputType as string) === "video_segment";

    return {
      effectiveInputType: effInput,
      primaryOutput: selectedOutput,
      primaryOutputType: outputType,
      audioLabelMode: resolvedAudioMode,
      isClassificationOnly: isClassOnly,
      isSpatialVision: isSpatial,
      isAudio: isAud,
      isVideo: isVid,
    };
  }, [exportedSchema, currentAsset, project?.template_id]);

  // Modals state
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isHotkeySettingsOpen, setIsHotkeySettingsOpen] = useState(false);

  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Vision Pan & Zoom state
  const [zoomScale, setZoomScale] = useState(1);
  const [isPanActive, setIsPanActive] = useState(false);

  // Active revision selector (defaults to the newest/latest revision)
  const activeRevision = useMemo(() => {
    if (selectedRevisionId) {
      return (
        revisions.find((r) => r.id === selectedRevisionId) ||
        revisions[0] ||
        activeAnnotation?.latest_revision
      );
    }
    return revisions[0] || activeAnnotation?.latest_revision;
  }, [revisions, selectedRevisionId, activeAnnotation]);

  // Working results and relations custom hook
  const {
    workingResults,
    setWorkingResults,
    visibleResults,
    activeCategoryId,
    setActiveCategoryId,
    selectedRegionId,
    setSelectedRegionId,
    hiddenResultIds,
    relations,
    syncResults,
    handleToggleResultVisibility,
    handleDeleteResult,
    handleAddRelation,
    handleUpdateRelationDirection,
    handleDeleteRelation,
    handleToggleRelationVisibility,
  } = useWorkspaceAnnotationState(activeRevision?.results || []);

  // Sync results when active revision or its results change
  const activeRevisionId = activeRevision?.id || "";
  const activeResultsHash = JSON.stringify(activeRevision?.results || []);

  useEffect(() => {
    const nextResults = activeRevision?.results || [];
    syncResults(nextResults);
    // React Query data is the external source being synchronized here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedResultsHash(serializeAnnotationResults(nextResults));
  }, [assetId, activeRevisionId, activeResultsHash, syncResults]);

  const workingResultsHash = useMemo(
    () => serializeAnnotationResults(workingResults),
    [workingResults]
  );
  const hasUnsavedChanges = workingResultsHash !== savedResultsHash;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Set default selected category from ontology
  useEffect(() => {
    if (availableCategories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(availableCategories[0].id);
    }
  }, [availableCategories, activeCategoryId, setActiveCategoryId]);

  const activeRevisionIdx = revisions.findIndex(
    (r) => r.id === activeRevision?.id
  );
  const previousRevision = revisions[activeRevisionIdx + 1];

  const hasPrev = currentAssetIdx > 0;
  const hasNext = !!(assets && currentAssetIdx < assets.length - 1);

  const navigateToAsset = (targetAssetId: string) => {
    const query = new URLSearchParams();
    if (ontologyVersionId) query.set("ontologyVersionId", ontologyVersionId);
    if (datasetVersionId) query.set("datasetVersionId", datasetVersionId);
    if (workItemId) query.set("workItemId", workItemId);
    router.push(
      `/projects/${projectId}/annotate/${targetAssetId}?${query.toString()}`
    );
  };

  const handleQuickSubmitNewRevision = async () => {
    if (!effectiveOntologyVersionId) {
      setFeedbackMsg("Lỗi: Không tìm thấy Ontology Version của dự án.");
      return;
    }
    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      if (activeAnnotation) {
        await createRevision(activeAnnotation.id, {
          ontology_version_id: effectiveOntologyVersionId,
          source: "human",
          results: workingResults,
        });
      } else {
        await createAnnotation({
          asset_id: assetId,
          project_id: projectId,
          ontology_version_id: effectiveOntologyVersionId,
          target_type: "FULL_ASSET",
          target_selector: {},
          source: "human",
          results: workingResults,
        });
      }
      if (workItemId && currentAssetReview?.status === "NEEDS_REVISION") {
        try {
          await recordAssetReviewMutation.mutateAsync({
            workItemId,
            data: {
              asset_id: assetId,
              status: "FIXED",
              comment: currentAssetReview.comment,
              asset_filename: assetFilename,
            },
          });
          setFeedbackMsg("✓ Đã lưu kết quả gán nhãn & đánh dấu hoàn thành sửa theo góp ý!");
        } catch {
          setFeedbackMsg("Đã lưu kết quả gán nhãn thành công!");
        }
      } else {
        setFeedbackMsg("Đã lưu kết quả gán nhãn thành công!");
      }
      await refetchAnnotations();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Lỗi khi lưu kết quả gán nhãn";
      setFeedbackMsg(`Lỗi: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fullscreen hook
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  // Region clipboard hook (Ctrl+C, Ctrl+V, Ctrl+X)
  useRegionClipboard({
    selectedRegionId,
    results: workingResults,
    onAddResults: (newItems) => {
      setWorkingResults((prev) => [...prev, ...newItems]);
      if (newItems[0]?.id) setSelectedRegionId(newItems[0].id);
    },
    onDeleteSelected: handleDeleteResult,
  });

  // TanStack Hotkeys Command Registrations
  useRegisterCommand("general.save", () => {
    handleQuickSubmitNewRevision();
  });

  useRegisterCommand("general.fullscreen", () => {
    toggleFullscreen(workspaceContainerRef.current);
  });

  useRegisterCommand("general.instructions", () => {
    setIsInstructionsOpen(true);
  });

  useRegisterCommand("edit.delete", () => {
    if (selectedRegionId) handleDeleteResult(selectedRegionId);
  });

  useRegisterCommand("edit.delete_backspace", () => {
    if (selectedRegionId) handleDeleteResult(selectedRegionId);
  });

  useRegisterCommand("nav.prev_asset", () => {
    if (hasPrev && assets) navigateToAsset(assets[currentAssetIdx - 1].id);
  });

  useRegisterCommand("nav.next_asset", () => {
    if (hasNext && assets) navigateToAsset(assets[currentAssetIdx + 1].id);
  });

  // Fallback Global keydown for [ and ] navigation across all workspace editors
  useEffect(() => {
    const handleGlobalNavKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "[") {
        if (hasPrev && assets) {
          e.preventDefault();
          navigateToAsset(assets[currentAssetIdx - 1].id);
        }
      } else if (e.key === "]") {
        if (hasNext && assets) {
          e.preventDefault();
          navigateToAsset(assets[currentAssetIdx + 1].id);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalNavKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalNavKeyDown);
  }, [hasPrev, hasNext, assets, currentAssetIdx]);

  const isLoading = isAnnoLoading || isDownloadLoading || isAssetsLoading;

  const handleApproveCurrentAsset = async () => {
    if (!workItemId || !assetId) return;
    try {
      await recordAssetReviewMutation.mutateAsync({
        workItemId,
        data: {
          asset_id: assetId,
          status: "APPROVED",
          asset_filename: assetFilename,
        },
      });
      setFeedbackMsg(`✓ Đã duyệt đạt asset ${assetFilename}`);
      setTimeout(() => setFeedbackMsg(null), 2500);
      if (hasNext && assets) {
        navigateToAsset(assets[currentAssetIdx + 1].id);
      }
    } catch {
      // Handled
    }
  };

  const handleMarkAsFixed = async () => {
    if (!workItemId || !assetId) return;
    try {
      await recordAssetReviewMutation.mutateAsync({
        workItemId,
        data: {
          asset_id: assetId,
          status: "FIXED",
          comment: currentAssetReview?.comment,
          asset_filename: assetFilename,
        },
      });
      setFeedbackMsg(`✓ Đã đánh dấu hoàn thành sửa cho asset ${assetFilename}`);
      setTimeout(() => setFeedbackMsg(null), 2500);
    } catch {
      // Handled
    }
  };

  const handleRevertNeedsRevision = async () => {
    if (!workItemId || !assetId) return;
    try {
      await recordAssetReviewMutation.mutateAsync({
        workItemId,
        data: {
          asset_id: assetId,
          status: "NEEDS_REVISION",
          comment: currentAssetReview?.comment,
          asset_filename: assetFilename,
        },
      });
      setFeedbackMsg(`Đã chuyển lại trạng thái Cần sửa cho ${assetFilename}`);
      setTimeout(() => setFeedbackMsg(null), 2500);
    } catch {
      // Handled
    }
  };

  return (
    <div
      ref={workspaceContainerRef}
      className="flex h-dvh w-full flex-col overflow-hidden bg-slate-950 text-slate-100"
    >
      {/* Platform Header Sub-Component */}
      <WorkspaceHeader
        projectId={projectId}
        assetFilename={assetFilename}
        activeAnnotation={activeAnnotation}
        batchName={batchName}
        onNavigateBack={() =>
          router.push(
            workItemId
              ? `/projects/${projectId}?tab=workflow`
              : `/projects/${projectId}`
          )
        }
        currentAssetIdx={currentAssetIdx}
        totalAssets={assets?.length || 0}
        hasPrev={hasPrev}
        hasNext={hasNext}
        isSubmitting={isSubmitting}
        isSidebarOpen={isSidebarOpen}
        isFullscreen={isFullscreen}
        onNavigatePrev={() =>
          hasPrev && assets && navigateToAsset(assets[currentAssetIdx - 1].id)
        }
        onNavigateNext={() =>
          hasNext && assets && navigateToAsset(assets[currentAssetIdx + 1].id)
        }
        onSaveRevision={handleQuickSubmitNewRevision}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onToggleFullscreen={() =>
          toggleFullscreen(workspaceContainerRef.current)
        }
        onOpenInstructions={() => setIsInstructionsOpen(true)}
        onOpenHotkeySettings={() => setIsHotkeySettingsOpen(true)}
        isReviewMode={Boolean(
          workItem && (workItem.status === "IN_REVIEW" || workItem.status === "SUBMITTED")
        )}
        assetReviewStatus={currentAssetReview?.status || null}
        onApproveAsset={handleApproveCurrentAsset}
        onRequestRevisionAsset={() => setIsReviewCommentModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Canvas & Editor Workspace */}
        <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto bg-slate-950 p-2 sm:p-4">
          {feedbackMsg && (
            <div className="absolute left-6 right-6 top-3 z-50 rounded border border-blue-900/50 bg-blue-950/90 px-4 py-2 text-xs text-blue-300 shadow">
              <Info className="mr-1 inline h-3.5 w-3.5" />
              {feedbackMsg}
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
              <span className="font-mono text-xs text-slate-400">
                Đang chuẩn bị workspace gán nhãn...
              </span>
            </div>
          ) : (
            <div
              className={cn(
                "flex h-full w-full flex-col space-y-2",
                effectiveInputType === "tabular"
                  ? "max-w-full px-1 sm:px-2"
                  : "max-w-5xl"
              )}
            >
              {/* Prominent Reviewer Feedback Banner on this Asset */}
              {currentAssetReview?.status === "NEEDS_REVISION" && (
                <div className="flex shrink-0 items-start justify-between gap-3 rounded-lg border border-rose-500/50 bg-rose-950/70 p-3 text-xs text-rose-200 shadow-sm animate-fade-in">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 mt-0.5">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-rose-300">
                        <span>Reviewer yêu cầu sửa lại nhãn asset này:</span>
                        {currentAssetReview.reviewed_at && (
                          <span className="text-[11px] font-normal text-rose-400/80">
                            ({new Date(currentAssetReview.reviewed_at).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                            })})
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-white whitespace-pre-wrap">
                        {currentAssetReview.comment || "Vui lòng kiểm tra và hiệu chỉnh lại nhãn theo nhận xét."}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleMarkAsFixed}
                    className="shrink-0 h-7 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
                    title="Bấm để đánh dấu đã hoàn thành sửa cho asset này"
                  >
                    <Check className="h-3 w-3" />
                    <span>Đánh dấu đã sửa</span>
                  </Button>
                </div>
              )}

              {currentAssetReview?.status === "FIXED" && (
                <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-blue-500/50 bg-blue-950/70 p-2.5 text-xs text-blue-200 shadow-sm animate-fade-in">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-blue-300">
                        Đã sửa nhãn theo góp ý của Reviewer:
                      </span>{" "}
                      <span className="text-slate-300 italic">
                        &ldquo;{currentAssetReview.comment || "Đã điều chỉnh lại nhãn"}&rdquo;
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRevertNeedsRevision}
                    className="h-6 px-2 text-[11px] text-blue-300 hover:text-blue-100 hover:bg-blue-900/40"
                    title="Chuyển lại về trạng thái Cần sửa"
                  >
                    Đánh dấu cần sửa lại
                  </Button>
                </div>
              )}

              {currentAssetReview?.status === "APPROVED" && (
                <div className="flex shrink-0 items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="font-medium">Asset này đã được Reviewer đánh giá: Đạt yêu cầu.</span>
                  </div>
                </div>
              )}

              {/* Category Legend, Label Selector & Quick Action Bar */}
              <WorkspaceCategoryBar
                categories={availableCategories}
                activeCategoryId={activeCategoryId}
                onSelectCategory={(id) => setActiveCategoryId(id)}
                onSaveRevision={handleQuickSubmitNewRevision}
                isSubmitting={isSubmitting}
                onOpenHotkeySettings={() => setIsHotkeySettingsOpen(true)}
                onOpenInstructions={() => setIsInstructionsOpen(true)}
                hasPrev={hasPrev}
                hasNext={hasNext}
                onNavigatePrev={() =>
                  hasPrev &&
                  assets &&
                  navigateToAsset(assets[currentAssetIdx - 1].id)
                }
                onNavigateNext={() =>
                  hasNext &&
                  assets &&
                  navigateToAsset(assets[currentAssetIdx + 1].id)
                }
              />

              {/* Guidance hint when no categories are defined in ontology */}
              {availableCategories.length === 0 && (
                <div className="flex shrink-0 items-center justify-between rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-1.5 text-xs text-amber-300">
                  <span>
                    Chưa có nhãn (Category) trong cấu hình Ontology. Bạn vẫn có
                    thể vẽ gán nhãn, hoặc vào tab{" "}
                    <span className="font-semibold underline">Ontology</span> để
                    thêm danh mục nhãn.
                  </span>
                </div>
              )}

              {/* Dynamic Annotation Canvas Workspace */}
              <div className="relative flex min-h-0 flex-1 flex-col justify-center">
                <AnnotationEditorDispatcher
                  outputTypeCode={primaryOutputType}
                  inputTypeCode={effectiveInputType}
                  assetUrl={downloadUrl}
                  results={visibleResults}
                  categoryColors={categoryColors}
                  categoryNames={categoryNames}
                  selectedCategoryId={activeCategoryId}
                  availableCategories={availableCategories}
                  selectedShapeId={selectedRegionId}
                  onSelectShapeId={setSelectedRegionId}
                  onSelectCategory={setActiveCategoryId}
                  metadata={editorMetadata}
                  outputId={editorMetadata?.outputId}
                  outputMultiple={editorMetadata?.multiple}
                  onChange={(newVisibleResults) => {
                    // Preserve currently hidden results so they are not
                    // discarded when the editor only sees visibleResults.
                    const hiddenResults = workingResults.filter((r) =>
                      hiddenResultIds.has(r.id ?? r.output_id ?? "")
                    );
                    setWorkingResults([...hiddenResults, ...newVisibleResults]);
                  }}
                />

                {/* Floating Spatial Controls (Zoom / Pan) for Computer Vision */}
                {isSpatialVision && !isClassificationOnly && !isVideo && (
                  <div className="absolute bottom-3 right-3 z-30">
                    <ZoomPanControls
                      scale={zoomScale}
                      isPanActive={isPanActive}
                      onZoomIn={() =>
                        setZoomScale((s) => Math.min(4, s + 0.25))
                      }
                      onZoomOut={() =>
                        setZoomScale((s) => Math.max(0.25, s - 0.25))
                      }
                      onZoomReset={() => setZoomScale(1)}
                      onZoomFit={() => setZoomScale(1)}
                      onTogglePan={() => setIsPanActive(!isPanActive)}
                    />
                  </div>
                )}
              </div>

              {/* Audio Scrubber & Timeline for Audio Tasks */}
              {isAudio && (
                <div className="shrink-0 pt-2">
                  <TimelineController
                    currentTime={audioCurrentTime}
                    duration={audioDuration}
                    isPlaying={isAudioPlaying}
                    onPlayToggle={() => setIsAudioPlaying(!isAudioPlaying)}
                    onTimeChange={(t) => setAudioCurrentTime(t)}
                    keyframes={workingResults
                      .filter((r) => {
                        const val = r.value as
                          Record<string, unknown> | undefined;
                        return (
                          r.result_type === "audio_segment" ||
                          val?.start !== undefined
                        );
                      })
                      .map((r, i) => {
                        const val = r.value as
                          Record<string, unknown> | undefined;
                        return {
                          id: r.id || String(i),
                          time: Number(val?.start || 0),
                          label:
                            categoryNames[r.category_id || ""] || "Segment",
                          color: categoryColors[r.category_id || ""],
                        };
                      })}
                  />
                </div>
              )}

              {/* Classification Output Section */}
              {effectiveInputType !== "tabular" &&
                exportedSchema?.outputs?.some(
                  (o) => o.type === "classification"
                ) &&
                exportedSchema?.outputs?.[0]?.type !== "classification" && (
                  <div className="shrink-0 pt-1">
                    <ClassificationEditor
                      results={workingResults}
                      categoryColors={categoryColors}
                      categoryNames={categoryNames}
                      availableCategories={availableCategories}
                      multiple={
                        exportedSchema?.outputs?.find(
                          (o) => o.type === "classification"
                        )?.multiple
                      }
                      onChange={(newResults) => setWorkingResults(newResults)}
                    />
                  </div>
                )}
            </div>
          )}
        </main>

        {/* Adaptive Right Sidebar Sub-Component */}
        <WorkspaceSidebar
          isOpen={isSidebarOpen}
          isClassificationOnly={isClassificationOnly}
          isAudio={isAudio || isVideo}
          workingResults={workingResults}
          relations={relations}
          revisions={revisions}
          activeRevision={activeRevision}
          previousRevision={previousRevision}
          selectedRevisionId={activeRevision?.id || ""}
          selectedRegionId={selectedRegionId}
          hiddenResultIds={hiddenResultIds}
          categoryNames={categoryNames}
          categoryColors={categoryColors}
          onSelectRevision={(id) => setSelectedRevisionId(id)}
          onSelectResult={(id) => setSelectedRegionId(id)}
          onToggleResultVisibility={handleToggleResultVisibility}
          onDeleteResult={handleDeleteResult}
          onAddRelation={handleAddRelation}
          onUpdateRelationDirection={handleUpdateRelationDirection}
          onDeleteRelation={handleDeleteRelation}
          onToggleRelationVisibility={handleToggleRelationVisibility}
        />
      </div>

      {/* Guidelines Modal */}
      <InstructionsModal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
      />

      {/* Hotkey Customization Modal */}
      <HotkeySettingsModal
        isOpen={isHotkeySettingsOpen}
        onClose={() => setIsHotkeySettingsOpen(false)}
      />

      {/* Reviewer Comment Modal */}
      {workItem && (
        <ReviewCommentModal
          isOpen={isReviewCommentModalOpen}
          onClose={() => setIsReviewCommentModalOpen(false)}
          workItemId={workItem.id}
          batchName={workItem.resource_id}
          assetId={assetId}
          assetFilename={assetFilename}
          existingComment={currentAssetReview?.comment || ""}
        />
      )}
    </div>
  );
}
