"use client";

import { useCallback, useMemo, useState } from "react";
import type { OntologyCompositionPayload, OntologyVersion } from "../types";

export interface VersionOutputLink {
  outputId: string;
  inputId: string;
  categoryIds: string[];
}

interface VersionGraphState {
  inputIds: string[];
  outputLinks: VersionOutputLink[];
}

const graphFromVersion = (version?: OntologyVersion): VersionGraphState => ({
  inputIds:
    version?.inputs
      .slice()
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((item) => item.ontology_input_id) ?? [],
  outputLinks:
    version?.outputs
      .slice()
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((item) => ({
        outputId: item.ontology_output_id,
        inputId: item.ontology_input_id,
        categoryIds: item.categories
          .slice()
          .sort((left, right) => left.sort_order - right.sort_order)
          .map((category) => category.category_id),
      })) ?? [],
});

const serializeGraph = (graph: VersionGraphState): string =>
  JSON.stringify({
    inputIds: graph.inputIds,
    outputLinks: graph.outputLinks.map((link) => ({
      ...link,
      categoryIds: [...link.categoryIds],
    })),
  });

export function useVersionGraph(version?: OntologyVersion) {
  const initialGraph = useMemo(() => graphFromVersion(version), [version]);
  const initialSignature = serializeGraph(initialGraph);
  const [localState, setLocalState] = useState({
    versionId: version?.id,
    sourceSignature: initialSignature,
    graph: initialGraph,
  });
  const localHasChanges =
    serializeGraph(localState.graph) !== localState.sourceSignature;
  const shouldUseServerGraph =
    localState.versionId !== version?.id ||
    (localState.sourceSignature !== initialSignature && !localHasChanges);
  const graph = shouldUseServerGraph ? initialGraph : localState.graph;

  const updateGraph = useCallback(
    (update: (current: VersionGraphState) => VersionGraphState): void => {
      setLocalState((current) => {
        const currentHasChanges =
          serializeGraph(current.graph) !== current.sourceSignature;
        const base =
          current.versionId !== version?.id ||
          (current.sourceSignature !== initialSignature && !currentHasChanges)
            ? initialGraph
            : current.graph;
        return {
          versionId: version?.id,
          sourceSignature: initialSignature,
          graph: update(base),
        };
      });
    },
    [initialGraph, initialSignature, version?.id]
  );

  const addInput = useCallback(
    (inputId: string): void => {
      updateGraph((current) =>
        current.inputIds.includes(inputId)
          ? current
          : { ...current, inputIds: [...current.inputIds, inputId] }
      );
    },
    [updateGraph]
  );

  const connectInputToOutput = useCallback(
    (inputId: string, outputId: string): void => {
      updateGraph((current) => {
        const existing = current.outputLinks.find(
          (link) => link.outputId === outputId
        );
        const outputLinks = existing
          ? current.outputLinks.map((link) =>
              link.outputId === outputId ? { ...link, inputId } : link
            )
          : [...current.outputLinks, { outputId, inputId, categoryIds: [] }];
        return {
          inputIds: current.inputIds.includes(inputId)
            ? current.inputIds
            : [...current.inputIds, inputId],
          outputLinks,
        };
      });
    },
    [updateGraph]
  );

  const toggleOutputCategory = useCallback(
    (outputId: string, categoryId: string): void => {
      updateGraph((current) => ({
        ...current,
        outputLinks: current.outputLinks.map((link) => {
          if (link.outputId !== outputId) return link;
          return {
            ...link,
            categoryIds: link.categoryIds.includes(categoryId)
              ? link.categoryIds.filter((id) => id !== categoryId)
              : [...link.categoryIds, categoryId],
          };
        }),
      }));
    },
    [updateGraph]
  );

  const disconnectOutput = useCallback(
    (outputId: string): void => {
      updateGraph((current) => ({
        ...current,
        outputLinks: current.outputLinks.filter(
          (link) => link.outputId !== outputId
        ),
      }));
    },
    [updateGraph]
  );

  const removeInput = useCallback(
    (inputId: string): void => {
      updateGraph((current) => ({
        inputIds: current.inputIds.filter((id) => id !== inputId),
        outputLinks: current.outputLinks.filter(
          (link) => link.inputId !== inputId
        ),
      }));
    },
    [updateGraph]
  );

  const removeOutput = useCallback(
    (outputId: string): void => {
      updateGraph((current) => ({
        ...current,
        outputLinks: current.outputLinks.filter(
          (link) => link.outputId !== outputId
        ),
      }));
    },
    [updateGraph]
  );

  const removeCategory = useCallback(
    (categoryId: string): void => {
      updateGraph((current) => ({
        ...current,
        outputLinks: current.outputLinks.map((link) => ({
          ...link,
          categoryIds: link.categoryIds.filter((id) => id !== categoryId),
        })),
      }));
    },
    [updateGraph]
  );

  const replaceGraph = useCallback(
    (next: VersionGraphState): void => {
      setLocalState({
        versionId: version?.id,
        sourceSignature: serializeGraph(next),
        graph: next,
      });
    },
    [version?.id]
  );

  const payload = useMemo<OntologyCompositionPayload>(
    () => ({
      inputs: graph.inputIds.map((inputId, sortOrder) => ({
        input_id: inputId,
        sort_order: sortOrder,
      })),
      outputs: graph.outputLinks.map((link, sortOrder) => ({
        output_id: link.outputId,
        input_id: link.inputId,
        category_ids: link.categoryIds,
        sort_order: sortOrder,
      })),
    }),
    [graph]
  );

  return {
    ...graph,
    payload,
    dirty: serializeGraph(graph) !== initialSignature,
    addInput,
    connectInputToOutput,
    toggleOutputCategory,
    disconnectOutput,
    removeInput,
    removeOutput,
    removeCategory,
    replaceGraph,
  };
}
