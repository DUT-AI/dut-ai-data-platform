"use client";

import React from "react";
import dynamic from "next/dynamic";
import { AnnotationResult } from "../types";
import { InputDefinition } from "@/features/ontology/types";
import { TextAnnotationCanvas } from "../components/text-annotation-canvas";
import { TableAnnotationCanvas } from "../components/table-annotation-canvas";
import { AudioAnnotationCanvas } from "../components/audio-annotation-canvas";
import { ClassificationEditor } from "../components/classification-editor";
import { NerAnnotationCanvas } from "../components/ner-annotation-canvas";
import { TextClassificationCanvas } from "../components/text-classification-canvas";
import { QaAnnotationCanvas } from "../components/qa-annotation-canvas";
// TODO: import { ImageClassificationEditor } from "../components/editors/classification/image-classification-editor"; — component chưa tồn tại, cần implement từ nhánh dev

const KonvaAnnotationCanvas = dynamic(
  () =>
    import("../components/konva-annotation-canvas").then(
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

function NerEditor(props: BaseEditorComponentProps) {
  return (
    <NerAnnotationCanvas
      textContent={(props.metadata as Record<string, unknown> | undefined)?.textContent as string | undefined}
      {...props}
    />
  );
}

function TextClassificationEditor(props: BaseEditorComponentProps) {
  return (
    <TextClassificationCanvas
      textContent={(props.metadata as Record<string, unknown> | undefined)?.textContent as string | undefined}
      multiple={!!(props.metadata as Record<string, unknown> | undefined)?.multiple}
      {...props}
    />
  );
}

function QaEditor(props: BaseEditorComponentProps) {
  return <QaAnnotationCanvas {...props} />;
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
  // `named_entity` is the catalog code (OutputDefinition.code) used by the
  // ontology schema export. Route it directly to the upgraded NerEditor so that
  // resolveEditorComponent picks it up correctly.
  named_entity: {
    code: "named_entity",
    label: "Named Entity Recognition Editor",
    description: "Bôi đen văn bản và gán nhãn thực thể (NER, Spans) — editor nâng cao với inline popover",
    supportedInputTypes: ["document"],
    component: NerEditor,
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

  // 6. NLP — Named Entity Recognition (alias kept for backward-compat)
  // NOTE: The canonical catalog code is `named_entity` (see above).
  // `named_entity_recognition` is NOT a valid OutputDefinition.code; it will
  // only be selected if passed explicitly as outputTypeCode.
  named_entity_recognition: {
    code: "named_entity_recognition",
    label: "Named Entity Recognition Editor (alias)",
    description: "Bôi đen văn bản, chọn loại thực thể từ popover (PER, LOC, ORG…)",
    supportedInputTypes: ["document"],
    component: NerEditor,
  },

  // 7. NLP — Text Classification
  // NOTE: `text_classification` is NOT a valid OutputDefinition.code.
  // To activate this editor via the registry, add a custom output type to
  // the ontology schema or pass the code directly as outputTypeCode.
  text_classification: {
    code: "text_classification",
    label: "Text Classification Editor",
    description: "Đọc văn bản và gán nhãn phân loại toàn đoạn (single / multi-label)",
    supportedInputTypes: ["document"],
    component: TextClassificationEditor,
  },

  // 8. NLP — Question Answering
  // NOTE: `question_answering` is NOT a valid OutputDefinition.code.
  // Wire metadata.question from the ontology value_schema before relying on
  // this editor; see annotation-workspace-view.tsx editorMetadata.
  question_answering: {
    code: "question_answering",
    label: "Question Answering Editor",
    description: "Highlight đoạn trả lời trong Context cho câu hỏi đã cho",
    supportedInputTypes: ["document"],
    component: QaEditor,
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
  if (inputTypeCode === "audio")
    return EDITOR_REGISTRY["audio_segment"].component;
  if (inputTypeCode === "tabular") return EDITOR_REGISTRY["tabular"].component;
  if (inputTypeCode === "document")
    return EDITOR_REGISTRY["named_entity"].component;

  // 3. Default fallback: Vision canvas
  return EDITOR_REGISTRY["bounding_box"].component;
}
