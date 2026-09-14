import { AnnotationResult } from "../../types";

export type ToolMode = "select" | "bbox" | "polygon" | "point" | "pan";

export interface Dimensions {
  width: number;
  height: number;
}

export interface ImageLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface KonvaAnnotationCanvasProps {
  imageUrl?: string;
  results: AnnotationResult[];
  categoryColors?: Record<string, string>;
  categoryNames?: Record<string, string>;
  selectedCategoryId?: string | null;
  availableCategories?: Array<{
    id: string;
    name: string;
    color?: string | null;
    key: string;
  }>;
  readOnly?: boolean;
  selectedShapeId?: string | null;
  onSelectShapeId?: (id: string | null) => void;
  onSelectCategory?: (categoryId: string) => void;
  onChange?: (results: AnnotationResult[]) => void;
}

export const DEFAULT_COLORS = [
  "#3B82F6", // blue
  "#EF4444", // red
  "#10B981", // green
  "#F59E0B", // amber
  "#8B5CF6", // purple
  "#EC4899", // pink
];
