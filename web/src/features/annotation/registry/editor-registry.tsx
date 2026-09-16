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

const KonvaAnnotationCanvas = dynamic(
  () =>
    import("../components/vision/konva-annotation-canvas").then(
      (mod) => mod.KonvaAnnotationCanvas
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-900 text-xs text-slate-400">
        Đang tải Canvas gán nhãn...
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
  selectedShapeId?: string | null;
  onSelectShapeId?: (id: string | null) => void;
  onSelectCategory?: (categoryId: string) => void;
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

function BoundingBoxEditor(props: BaseEditorComponentProps) {
  return <KonvaAnnotationCanvas imageUrl={props.assetUrl} {...props} />;
}

function TextEditor(props: BaseEditorComponentProps) {
  return <TextAnnotationCanvas textUrl={props.assetUrl} {...props} />;
}

function TabularEditor(props: BaseEditorComponentProps) {
  return <TableAnnotationCanvas tableUrl={props.assetUrl} {...props} />;
}

function AudioEditor(props: BaseEditorComponentProps) {
  return <AudioAnnotationCanvas audioUrl={props.assetUrl} {...props} />;
}

function VideoEditor(props: BaseEditorComponentProps) {
  return <VideoAnnotationCanvas assetUrl={props.assetUrl} {...props} />;
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
    component: BoundingBoxEditor,
  },
  polygon: {
    code: "polygon",
    label: "Polygon Editor",
    description: "Vẽ đa giác bao quanh vật thể tự do",
    supportedInputTypes: ["image", "video"],
    component: BoundingBoxEditor,
  },
  keypoint: {
    code: "keypoint",
    label: "Keypoint / Landmark Editor",
    description: "Đánh dấu các điểm mốc tọa độ trên ảnh",
    supportedInputTypes: ["image", "video"],
    component: BoundingBoxEditor,
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
 * Resolve the best matching editor given an Output code and fallback Input type
 */
export function resolveEditorComponent(
  outputTypeCode?: string,
  inputTypeCode?: string
): EditorComponentType {
  // 1. Match by Output Type first
  if (outputTypeCode && EDITOR_REGISTRY[outputTypeCode]) {
    return EDITOR_REGISTRY[outputTypeCode].component;
  }

  // 2. Fallback match by Input Modality
  if (inputTypeCode === "video") return EDITOR_REGISTRY["video_segment"].component;
  if (inputTypeCode === "audio")
    return EDITOR_REGISTRY["audio_segment"].component;
  if (inputTypeCode === "tabular") return EDITOR_REGISTRY["tabular"].component;
  if (inputTypeCode === "document")
    return EDITOR_REGISTRY["named_entity"].component;

  // 3. Default fallback: Vision canvas
  return EDITOR_REGISTRY["bounding_box"].component;
}
