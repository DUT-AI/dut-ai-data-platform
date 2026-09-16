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

interface AnnotationWorkspaceViewProps {
  projectId: string;
  assetId: string;
  ontologyVersionId?: string;
  datasetVersionId?: string;
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
}: AnnotationWorkspaceViewProps) {
  const router = useRouter();
  const workspaceContainerRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: ontology } = useProjectOntologyQuery(projectId);

  const effectiveOntologyVersionId = useMemo(() => {
    if (ontologyVersionId) return ontologyVersionId;
    if (ontology?.current_version_id) return ontology.current_version_id;
    return ontology?.versions?.[0]?.id || "";
  }, [ontologyVersionId, ontology]);

  const ontologyId = ontology?.id || "";

  const { data: exportedSchema } = useOntologySchemaQuery(
    projectId,
    ontologyId,
    effectiveOntologyVersionId
  );

  const { categoryNames, categoryColors, availableCategories } = useMemo(() => {
    const names: Record<string, string> = {};
    const colors: Record<string, string> = {};
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
            if (cat.color) colors[cat.id] = cat.color;
            list.push(cat);
          }
        });
      });
    }

    return {
      categoryNames: names,
      categoryColors: colors,
      availableCategories: list,
    };
  }, [exportedSchema]);

  const {
    data: annotations,
    isLoading: isAnnoLoading,
    refetch: refetchAnnotations,
  } = useAssetAnnotationsQuery(assetId);
  const { data: downloadData, isLoading: isDownloadLoading } =
    useAssetDownloadUrlQuery(assetId);
  const { data: assets, isLoading: isAssetsLoading } = useVersionAssetsQuery(
    datasetVersionId || ""
  );

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

  const {
    effectiveInputType,
    primaryOutputType,
    isClassificationOnly,
    isSpatialVision,
    isAudio,
  } = useMemo(() => {
    const inputType = exportedSchema?.inputs?.[0]?.schema?.type;
    const outputType = exportedSchema?.outputs?.[0]?.type;

    let effInput = inputType;
    const filename = (currentAsset?.filename || "").toLowerCase();
    if (!effInput) {
      if (filename.match(/\.(mp3|wav|ogg|m4a|aac)$/)) effInput = "audio";
      else if (filename.match(/\.(csv|json|tsv)$/)) effInput = "tabular";
      else if (filename.match(/\.(txt|md|log|docx?)$/)) effInput = "document";
      else effInput = "image";
    }

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

    return {
      effectiveInputType: effInput,
      primaryOutputType: outputType,
      isClassificationOnly: isClassOnly,
      isSpatialVision: isSpatial,
      isAudio: isAud,
    };
  }, [exportedSchema, currentAsset]);

  // Modals state
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isHotkeySettingsOpen, setIsHotkeySettingsOpen] = useState(false);

  // Audio timeline state
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration] = useState(60);
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
    if (activeRevision?.results && activeRevision.results.length > 0) {
      syncResults(activeRevision.results);
    }
  }, [activeRevisionId, activeResultsHash, syncResults]);

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
    router.push(
      `/projects/${projectId}/annotate/${targetAssetId}?ontologyVersionId=${ontologyVersionId || ""}&datasetVersionId=${datasetVersionId || ""}`
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
      setFeedbackMsg("Đã lưu kết quả gán nhãn thành công!");
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

  const isLoading = isAnnoLoading || isDownloadLoading || isAssetsLoading;
  const assetFilename = currentAsset?.filename || "Asset";

  return (
    <div
      ref={workspaceContainerRef}
      className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100"
    >
      {/* Platform Header Sub-Component */}
      <WorkspaceHeader
        projectId={projectId}
        assetFilename={assetFilename}
        activeAnnotation={activeAnnotation}
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
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas & Editor Workspace */}
        <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-slate-950 p-4">
          {feedbackMsg && (
            <div className="absolute left-6 right-6 top-3 z-50 rounded border border-blue-900/50 bg-blue-950/90 px-4 py-2 text-xs text-blue-300 shadow">
              ℹ️ {feedbackMsg}
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
            <div className="flex h-full w-full max-w-5xl flex-col space-y-2">
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
                  onChange={(newVisibleResults) =>
                    setWorkingResults(newVisibleResults)
                  }
                />

                {/* Floating Spatial Controls (Zoom / Pan) for Computer Vision */}
                {isSpatialVision && !isClassificationOnly && (
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
              {exportedSchema?.outputs?.some(
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
          isAudio={isAudio}
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
    </div>
  );
}
