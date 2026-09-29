"use client";

import React from "react";
import { AnnotationResult } from "../../types";
import {
  TabularAnnotationWorkspace,
  TabularAnnotationWorkspaceProps,
} from "./tabular-annotation-workspace";
import { CategoryOption } from "./tabular-label-cell";

export interface TableAnnotationCanvasProps
  extends Omit<TabularAnnotationWorkspaceProps, "results"> {
  tableUrl?: string;
  assetUrl?: string;
  results: AnnotationResult[];
  categoryColors?: Record<string, string>;
  categoryNames?: Record<string, string>;
  selectedCategoryId?: string | null;
  availableCategories?: CategoryOption[];
  readOnly?: boolean;
  onChange?: (results: AnnotationResult[]) => void;
  metadata?: Record<string, unknown>;
}

/**
 * TableAnnotationCanvas is the canonical tabular annotation editor in the registry.
 * It now delegates to TabularAnnotationWorkspace, providing row-level annotation,
 * high-performance pagination, fast search/filter, and bulk labeling.
 */
export function TableAnnotationCanvas(props: TableAnnotationCanvasProps) {
  return <TabularAnnotationWorkspace {...props} />;
}

export { TabularAnnotationWorkspace } from "./tabular-annotation-workspace";
export * from "./tabular-types";
