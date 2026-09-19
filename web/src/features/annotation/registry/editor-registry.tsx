"use client";

import React from "react";
import dynamic from "next/dynamic";
import { AnnotationResult } from "../types";
import { InputDefinition } from "@/features/ontology/types";
import { TextAnnotationCanvas } from "../components/text/text-annotation-canvas";
import { TableAnnotationCanvas } from "../components/tabular/table-annotation-canvas";
import { AudioAnnotationCanvas } from "../components/audio/audio-annotation-canvas";
import { VideoAnnotationCanvas } from "../components/video/video-annotation-canvas";
import { ClassificationEditor } from "../components/classification-editor";
import { ImageClassificationEditor } from "../components/editors/classification/image-classification-editor";
import type { AudioLabelMode } from "../utils/audio-label-utils";

// Dynamic imports for Canvas-based Micro Editors to avoid SSR window access issues
const DynamicBoundingBoxEditor = dynamic(
  () =>
    import("../components/editors/bounding-box/bounding-box-editor").then(
      (mod) => mod.BoundingBoxEditor
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-xs text-slate-400">
        Đang tải Bounding Box Editor...
      </div>
    ),
  }
);

const DynamicPolygonEditor = dynamic(
  () =>
    import("../components/editors/polygon/polygon-editor").then(
      (mod) => mod.PolygonSegmentationEditor
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-xs text-slate-400">
        Đang tải Polygon Editor...
      </div>
    ),
  }
);

const DynamicBrushEditor = dynamic(
  () =>
    import("../components/editors/brush/brush-editor").then(
      (mod) => mod.BrushSegmentationEditor
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-xs text-slate-400">
        Đang tải Brush Mask Editor...
      </div>
    ),
  }
);

// Preserved for legacy keypoints support without regression
const LegacyKonvaAnnotationCanvas = dynamic(
  () =>
    import("../components/vision/konva-annotation-canvas").then(
      (mod) => mod.KonvaAnnotationCanvas
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-900 text-xs text-slate-400">
        Đang tải Keypoint Canvas...
      </div>
    ),
  }
);

/**
 * Standardized Props that every Editor Component in the Registry must accept
 */
export interface BaseEditorComponentProps {
  assetUrl?: string;
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
  audioLabelMode?: AudioLabelMode;
  outputId?: string;
  outputMultiple?: boolean;
  validationErrors?: string[];
  selectedShapeId?: string | null;
  onSelectShapeId?: (id: string | null) => void;
  onSelectCategory?: (categoryId: string) => void;
  onDurationChange?: (duration: number) => void;
  onChange?: (results: AnnotationResult[]) => void;
  metadata?: Record<string, unknown>;
}

export type EditorComponentType = React.ComponentType<BaseEditorComponentProps>;

export interface EditorRegistration {
  code: string;
  label: string;
  description: string;
  supportedInputTypes: Array<InputDefinition["code"]>;
  component: EditorComponentType;
}

function BoundingBoxEditorWrapper(props: BaseEditorComponentProps) {
  return <DynamicBoundingBoxEditor {...props} />;
}

function PolygonEditorWrapper(props: BaseEditorComponentProps) {
  return <DynamicPolygonEditor {...props} />;
}

function BrushEditorWrapper(props: BaseEditorComponentProps) {
  return <DynamicBrushEditor {...props} />;
}

function KeypointEditorWrapper(props: BaseEditorComponentProps) {
  return <LegacyKonvaAnnotationCanvas imageUrl={props.assetUrl} {...props} />;
}

function TextEditor(props: BaseEditorComponentProps) {
  return <TextAnnotationCanvas textUrl={props.assetUrl} {...props} />;
}

function TabularEditor(props: BaseEditorComponentProps) {
  return <TableAnnotationCanvas tableUrl={props.assetUrl} {...props} />;
}

function AudioEditor(props: BaseEditorComponentProps) {
  return (
    <AudioAnnotationCanvas
      audioUrl={props.assetUrl}
      mode={props.audioLabelMode}
      {...props}
    />
  );
}

function VideoEditor(props: BaseEditorComponentProps) {
  return <VideoAnnotationCanvas assetUrl={props.assetUrl} {...props} />;
}

/**
 * Creates a Fail-Fast error fallback component when no matching editor exists
 */
function createUnsupportedEditor(message: string): EditorComponentType {
  return function UnsupportedEditor() {
    return (
      <div className="flex h-full min-h-[380px] w-full flex-col items-center justify-center space-y-3 rounded-xl border border-red-900/40 bg-slate-950 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-950/60 text-red-400">
          ⚠️
        </div>
        <div className="text-sm font-semibold text-red-300">
          Giao diện gán nhãn không khả dụng
        </div>
        <div className="max-w-md text-xs text-slate-400">{message}</div>
      </div>
    );
  };
}

/**
 * Global Editor Registry mapping Ontology Output codes to their specialized Editor Components
 */
export const EDITOR_REGISTRY: Record<string, EditorRegistration> = {
  // 1. Computer Vision Spatial Annotations
  bounding_box: {
    code: "bounding_box",
    label: "Bounding Box Editor",
    description: "Vẽ và định vị khung chữ nhật trên ảnh / video frame",
    supportedInputTypes: ["image", "video"],
    component: BoundingBoxEditorWrapper,
  },
  polygon: {
    code: "polygon",
    label: "Polygon Segmentation Editor",
    description: "Vẽ đa giác bao quanh vật thể tự do",
    supportedInputTypes: ["image", "video"],
    component: PolygonEditorWrapper,
  },
  brush_mask: {
    code: "brush_mask",
    label: "Brush & Marks Segmentation Editor",
    description: "Tô cọ và tẩy mặt nạ pixel phân vùng ngữ nghĩa",
    supportedInputTypes: ["image"],
    component: BrushEditorWrapper,
  },
  mask: {
    code: "mask",
    label: "Mask Segmentation Editor",
    description: "Phân vùng mặt nạ cọ vẽ",
    supportedInputTypes: ["image"],
    component: BrushEditorWrapper,
  },
  keypoint: {
    code: "keypoint",
    label: "Keypoint / Landmark Editor",
    description: "Đánh dấu các điểm mốc tọa độ trên ảnh",
    supportedInputTypes: ["image", "video"],
    component: KeypointEditorWrapper,
  },

  // 2. NLP & Text Annotations
  named_entity: {
    code: "named_entity",
    label: "Text NER & Span Editor",
    description: "Bôi đen văn bản và gán nhãn thực thể (NER, Spans)",
    supportedInputTypes: ["document"],
    component: TextEditor,
  },
  text: {
    code: "text",
    label: "Text Annotation Editor",
    description: "Gán nhãn văn bản và đoạn trích",
    supportedInputTypes: ["document"],
    component: TextEditor,
  },

  // 3. Tabular & Grid Annotations
  tabular: {
    code: "tabular",
    label: "Tabular Grid Editor",
    description: "Gán nhãn ô, hàng và cột trong bảng dữ liệu CSV/JSON",
    supportedInputTypes: ["tabular"],
    component: TabularEditor,
  },

  // 4. Audio & Speech Annotations
  audio_segment: {
    code: "audio_segment",
    label: "Audio Waveform Editor",
    description: "Tạo phân đoạn thời gian và gán nhãn trên dạng sóng âm thanh",
    supportedInputTypes: ["audio"],
    component: AudioEditor,
  },
  
  video_segment: {
    code: "video_segment",
    label: "Video Segment Editor",
    description: "Cắt đoạn thời gian và phân loại video",
    supportedInputTypes: ["video"],
    component: VideoEditor,
  },

  // 5. Classification & Categories
  classification: {
    code: "classification",
    label: "Classification Editor",
    description: "Phân loại nhãn cho toàn bộ đối tượng",
    supportedInputTypes: [
      "image",
      "document",
      "tabular",
      "audio",
      "video",
      "object",
    ],
    component: ClassificationEditor,
  },
};

/**
 * Resolve the best matching editor given an Output code and Input modality.
 * Strictly fail-fast: NEVER fallback silently to BoundingBoxEditor!
 */
export function resolveEditorComponent(
  outputTypeCode?: string,
  inputTypeCode?: string
): EditorComponentType {
  // 1. Special case: Image classification needs viewport to display image
  if (outputTypeCode === "classification" && inputTypeCode === "image") {
    return ImageClassificationEditor;
  }

  // Audio text/classification tasks share the player and render task-specific panels.
  if (
    inputTypeCode === "audio" &&
    (outputTypeCode === "text" ||
      outputTypeCode === "classification" ||
      outputTypeCode === "audio_segment")
  ) {
    return AudioEditor;
  }

  // 2. Check if output type is registered
  if (outputTypeCode && EDITOR_REGISTRY[outputTypeCode]) {
    const registration = EDITOR_REGISTRY[outputTypeCode];

    // Check input modality compatibility
    if (
      inputTypeCode &&
      !registration.supportedInputTypes.includes(
        inputTypeCode as InputDefinition["code"]
      )
    ) {
      return createUnsupportedEditor(
        `Tác vụ "${registration.label}" (${outputTypeCode}) không tương thích với dữ liệu đầu vào "${inputTypeCode}".`
      );
    }

    return registration.component;
  }

  // 3. Fallback only if outputTypeCode is unspecified and input modality matches dedicated editors
  if (!outputTypeCode && inputTypeCode) {
    if (inputTypeCode === "audio") return EDITOR_REGISTRY["audio_segment"].component;
    if (inputTypeCode === "tabular") return EDITOR_REGISTRY["tabular"].component;
    if (inputTypeCode === "document") return EDITOR_REGISTRY["named_entity"].component;
  }

  // 4. Fail-fast error if no valid editor can be safely resolved
  return createUnsupportedEditor(
    `Không tìm thấy Editor cho Output Type: "${outputTypeCode || "không xác định"}" (Input: "${inputTypeCode || "không xác định"}").`
  );
}
