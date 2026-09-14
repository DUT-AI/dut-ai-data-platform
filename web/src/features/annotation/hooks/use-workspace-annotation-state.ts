"use client";

import { useMemo, useState, useCallback } from "react";
import type { AnnotationResult } from "../types";
import type {
  AnnotationRelation,
  RelationDirection,
} from "../components/relations-panel";

export function useWorkspaceAnnotationState(
  initialResults: AnnotationResult[] = []
) {
  const [workingResults, setWorkingResults] =
    useState<AnnotationResult[]>(initialResults);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [hiddenResultIds, setHiddenResultIds] = useState<Set<string>>(
    new Set()
  );
  const [relations, setRelations] = useState<AnnotationRelation[]>([]);

  // Sync when initial results change (e.g. switching revision)
  const syncResults = useCallback((results: AnnotationResult[]) => {
    setWorkingResults(results || []);
    setSelectedRegionId(null);
    setHiddenResultIds(new Set());
  }, []);

  const handleToggleResultVisibility = useCallback((id: string) => {
    setHiddenResultIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDeleteResult = useCallback((id: string) => {
    setWorkingResults((prev) =>
      prev.filter((r) => (r.id || r.output_id) !== id)
    );
    setRelations((prev) =>
      prev.filter((rel) => rel.fromId !== id && rel.toId !== id)
    );
    setSelectedRegionId((prev) => (prev === id ? null : prev));
  }, []);

  const handleAddRelation = useCallback(
    (
      fromId: string,
      toId: string,
      direction: RelationDirection = "right",
      label?: string
    ) => {
      const newRel: AnnotationRelation = {
        id: `rel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        fromId,
        toId,
        direction,
        label,
        visible: true,
      };
      setRelations((prev) => [...prev, newRel]);
    },
    []
  );

  const handleUpdateRelationDirection = useCallback(
    (relationId: string, direction: RelationDirection) => {
      setRelations((prev) =>
        prev.map((r) => (r.id === relationId ? { ...r, direction } : r))
      );
    },
    []
  );

  const handleDeleteRelation = useCallback((relationId: string) => {
    setRelations((prev) => prev.filter((r) => r.id !== relationId));
  }, []);

  const handleToggleRelationVisibility = useCallback((relationId: string) => {
    setRelations((prev) =>
      prev.map((r) => (r.id === relationId ? { ...r, visible: !r.visible } : r))
    );
  }, []);

  // Filter out results that are marked hidden by outliner
  const visibleResults = useMemo(() => {
    return workingResults.filter(
      (r) => !hiddenResultIds.has(r.id || r.output_id || "")
    );
  }, [workingResults, hiddenResultIds]);

  return {
    workingResults,
    setWorkingResults,
    visibleResults,
    activeCategoryId,
    setActiveCategoryId,
    selectedRegionId,
    setSelectedRegionId,
    hiddenResultIds,
    relations,
    setRelations,
    syncResults,
    handleToggleResultVisibility,
    handleDeleteResult,
    handleAddRelation,
    handleUpdateRelationDirection,
    handleDeleteRelation,
    handleToggleRelationVisibility,
  };
}
