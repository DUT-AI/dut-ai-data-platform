import { AnnotationResult } from "../../types";

export type TabularRow = Record<string, unknown>;

export type TabularFilterStatus = "all" | "labeled" | "unlabeled" | string;

export interface TabularSortConfig {
  column: string;
  direction: "asc" | "desc";
}

export type TabularLabelMode =
  | "binary"
  | "single-class"
  | "multi-label"
  | "number"
  | "legacy-cell";

export interface TabularRecordResult extends AnnotationResult {
  id: string;
  output_id?: string;
  result_type: "classification" | "number" | "tabular_record" | "table_cell";
  category_id?: string | null;
  value?: unknown;
  geometry?: {
    record_key: string;
    key_field: string;
    row_index?: number;
    [key: string]: unknown;
  } | null;
  created_at?: string;
}

export interface TabularGridState {
  dataRows: TabularRow[];
  headers: string[];
  keyField: string;
  isKeyFieldSynthetic: boolean;
  pageIndex: number;
  pageSize: number;
  searchQuery: string;
  filterStatus: TabularFilterStatus;
  sortConfig: TabularSortConfig | null;
  hiddenColumns: Set<string>;
  selectedRowKeys: Set<string>;
  focusedRowKey: string | null;
}
