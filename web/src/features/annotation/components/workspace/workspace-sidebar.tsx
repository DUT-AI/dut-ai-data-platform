"use client";

import React, { useState } from "react";
import { Clock3, ListTree, Share2 } from "lucide-react";
import { OutlinerPanel } from "../outliner-panel";
import {
  RelationsPanel,
  type AnnotationRelation,
  type RelationDirection,
} from "../relations-panel";
import { RevisionHistoryPanel } from "../revision-history-panel";
import { RevisionDiffView } from "../revision-diff-view";
import type { AnnotationResult, AnnotationRevision } from "../../types";

export type SidebarTab = "outliner" | "relations" | "history";

interface WorkspaceSidebarProps {
  isOpen: boolean;
  isClassificationOnly?: boolean;
  isAudio?: boolean;
  workingResults: AnnotationResult[];
  relations: AnnotationRelation[];
  revisions: AnnotationRevision[];
  activeRevision?: AnnotationRevision;
  previousRevision?: AnnotationRevision;
  selectedRevisionId: string;
  selectedRegionId: string | null;
  hiddenResultIds: Set<string>;
  categoryNames: Record<string, string>;
  categoryColors: Record<string, string>;
  onSelectRevision: (id: string) => void;
  onSelectResult: (id: string) => void;
  onToggleResultVisibility: (id: string) => void;
  onDeleteResult: (id: string) => void;
  onAddRelation: (
    fromId: string,
    toId: string,
    direction?: RelationDirection,
    label?: string
  ) => void;
  onUpdateRelationDirection: (
    relationId: string,
    direction: RelationDirection
  ) => void;
  onDeleteRelation: (relationId: string) => void;
  onToggleRelationVisibility: (relationId: string) => void;
}

/**
 * Adaptive Right dockable sidebar with task-aware tabs (Outliner, Relations, History)
 */
export function WorkspaceSidebar({
  isOpen,
  isClassificationOnly = false,
  isAudio = false,
  workingResults,
  relations,
  revisions,
  activeRevision,
  previousRevision,
  selectedRevisionId,
  selectedRegionId,
  hiddenResultIds,
  categoryNames,
  categoryColors,
  onSelectRevision,
  onSelectResult,
  onToggleResultVisibility,
  onDeleteResult,
  onAddRelation,
  onUpdateRelationDirection,
  onDeleteRelation,
  onToggleRelationVisibility,
}: WorkspaceSidebarProps) {
  const [userSidebarTab, setUserSidebarTab] = useState<SidebarTab>("outliner");
  const sidebarTab: SidebarTab = isClassificationOnly
    ? "history"
    : userSidebarTab;
  const setSidebarTab = setUserSidebarTab;

  if (!isOpen) return null;

  return (
    <aside className="lg:w-84 flex w-full shrink-0 select-none flex-col overflow-hidden border-t border-slate-800 bg-slate-900 lg:border-l lg:border-t-0">
      {/* Sidebar Tabs Switcher - Adaptive to task modality */}
      <div className="flex shrink-0 items-center border-b border-slate-800 bg-slate-950/60 p-1.5">
        {!isClassificationOnly && (
          <button
            type="button"
            onClick={() => setSidebarTab("outliner")}
            className={`flex-1 rounded py-1 text-center text-xs font-semibold transition-colors ${
              sidebarTab === "outliner"
                ? "bg-slate-800 text-blue-400 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ListTree className="mr-1 inline h-3.5 w-3.5" />
            {isAudio ? "Phân đoạn" : "Vùng"} ({workingResults.length})
          </button>
        )}

        {!isClassificationOnly && !isAudio && (
          <button
            type="button"
            onClick={() => setSidebarTab("relations")}
            className={`flex-1 rounded py-1 text-center text-xs font-semibold transition-colors ${
              sidebarTab === "relations"
                ? "bg-slate-800 text-blue-400 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Share2 className="mr-1 inline h-3.5 w-3.5" />
            Quan hệ ({relations.length})
          </button>
        )}

        <button
          type="button"
          onClick={() => setSidebarTab("history")}
          className={`flex-1 rounded py-1 text-center text-xs font-semibold transition-colors ${
            sidebarTab === "history"
              ? "bg-slate-800 text-blue-400 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock3 className="mr-1 inline h-3.5 w-3.5" />
          Lịch sử ({revisions.length})
        </button>
      </div>

      {/* Tab Panel Content */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {sidebarTab === "outliner" && !isClassificationOnly && (
          <OutlinerPanel
            results={workingResults}
            selectedId={selectedRegionId}
            categoryNames={categoryNames}
            categoryColors={categoryColors}
            hiddenResultIds={hiddenResultIds}
            onSelectResult={onSelectResult}
            onToggleVisibility={onToggleResultVisibility}
            onDeleteResult={onDeleteResult}
          />
        )}

        {sidebarTab === "relations" && !isClassificationOnly && !isAudio && (
          <RelationsPanel
            relations={relations}
            results={workingResults}
            categoryNames={categoryNames}
            categoryColors={categoryColors}
            onAddRelation={onAddRelation}
            onUpdateRelationDirection={onUpdateRelationDirection}
            onDeleteRelation={onDeleteRelation}
            onToggleRelationVisibility={onToggleRelationVisibility}
          />
        )}

        {sidebarTab === "history" && (
          <div className="space-y-4">
            <RevisionHistoryPanel
              revisions={revisions}
              selectedRevisionId={selectedRevisionId}
              onSelectRevision={onSelectRevision}
              categoryColors={categoryColors}
              categoryNames={categoryNames}
            />

            {activeRevision && (
              <RevisionDiffView
                currentRevision={activeRevision}
                previousRevision={previousRevision}
              />
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
