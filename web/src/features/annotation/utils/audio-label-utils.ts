import type { AnnotationResult } from "../types";
import type { ExportedOntologySchema } from "@/features/ontology/types";

export type AudioLabelMode =
  | "asr_segments"
  | "intent_classification"
  | "asr";

export type OntologyOutputContract = ExportedOntologySchema["outputs"][number];

const AUDIO_TEMPLATE_MODES: Record<string, AudioLabelMode> = {
  "automatic-speech-recognition-using-segments": "asr_segments",
  "intent-classification": "intent_classification",
  "automatic-speech-recognition": "asr",
};

function normalizeTemplateId(templateId?: string | null): string {
  return (templateId || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

function schemaDefinesTimeRange(schema: Record<string, unknown>): boolean {
  const properties = schema.properties;
  if (!properties || typeof properties !== "object") return false;

  const keys = Object.keys(properties as Record<string, unknown>);
  return (
    (keys.includes("start") || keys.includes("start_time")) &&
    (keys.includes("end") || keys.includes("end_time"))
  );
}

export function resolveAudioLabelMode(
  templateId: string | null | undefined,
  output: OntologyOutputContract | undefined
): AudioLabelMode | null {
  const templateMode = AUDIO_TEMPLATE_MODES[normalizeTemplateId(templateId)];
  if (templateMode) return templateMode;

  if (!output) return null;
  if (output.type === "classification") return "intent_classification";
  if (output.type !== "text") return null;

  if (output.multiple || schemaDefinesTimeRange(output.value_schema)) {
    return "asr_segments";
  }

  return "asr";
}

export function getResultTimeRange(
  result: AnnotationResult
): { start: number; end: number } | null {
  const value =
    result.value && typeof result.value === "object"
      ? (result.value as Record<string, unknown>)
      : undefined;
  const geometry = result.geometry || undefined;
  const start = Number(
    geometry?.start ?? geometry?.start_time ?? value?.start ?? value?.start_time
  );
  const end = Number(
    geometry?.end ?? geometry?.end_time ?? value?.end ?? value?.end_time
  );

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return { start, end };
}

export function getResultTranscript(result?: AnnotationResult): string {
  if (!result) return "";
  if (typeof result.value === "string") return result.value;

  const value =
    result.value && typeof result.value === "object"
      ? (result.value as Record<string, unknown>)
      : undefined;
  const transcript =
    value?.transcript ??
    value?.transcription ??
    value?.text ??
    result.payload?.transcript ??
    result.payload?.transcription ??
    result.geometry?.transcript ??
    result.geometry?.transcription ??
    result.geometry?.text;

  return typeof transcript === "string" ? transcript : "";
}

export function isAudioSegmentResult(result: AnnotationResult): boolean {
  return (
    result.result_type === "audio_segment" ||
    (result.result_type === "text" && getResultTimeRange(result) !== null)
  );
}

export function isFullTranscriptResult(result: AnnotationResult): boolean {
  return (
    (result.result_type === "text" ||
      result.result_type === "transcription" ||
      result.result_type === "asr") &&
    getResultTimeRange(result) === null
  );
}

function allowsOverlappingSegments(schema: Record<string, unknown>): boolean {
  return schema.allow_overlap === true || schema.allow_overlaps === true;
}

function requiresTranscript(schema: Record<string, unknown>): boolean {
  const required = schema.required;
  return (
    Array.isArray(required) &&
    required.some((field) =>
      ["text", "transcript", "transcription"].includes(String(field))
    )
  );
}

export interface AudioValidationOptions {
  mode: AudioLabelMode;
  results: AnnotationResult[];
  output?: OntologyOutputContract;
  duration: number;
  categoryNames: Record<string, string>;
  categoryKeys: Record<string, string>;
}

export function validateAudioAnnotation({
  mode,
  results,
  output,
  duration,
  categoryNames,
  categoryKeys,
}: AudioValidationOptions): string[] {
  const errors: string[] = [];
  const required = output?.required ?? false;

  if (mode === "intent_classification") {
    const choices = results.filter(
      (result) =>
        result.result_type === "classification" &&
        (!output?.id || !result.output_id || result.output_id === output.id)
    );
    if (required && choices.length === 0) {
      errors.push("Vui lòng chọn một intent trước khi lưu.");
    }
    return errors;
  }

  if (mode === "asr") {
    const transcript = results.find(isFullTranscriptResult);
    if (required && !getResultTranscript(transcript).trim()) {
      errors.push("Transcript toàn bộ audio không được để trống.");
    }
    return errors;
  }

  const segments = results
    .filter(isAudioSegmentResult)
    .map((result) => ({ result, range: getResultTimeRange(result) }))
    .filter(
      (item): item is { result: AnnotationResult; range: { start: number; end: number } } =>
        item.range !== null
    )
    .sort((a, b) => a.range.start - b.range.start);

  if (required && segments.length === 0) {
    errors.push("Cần tạo ít nhất một segment trước khi lưu.");
  }

  segments.forEach(({ result, range }, index) => {
    const label = `Segment ${index + 1}`;
    if (range.start < 0) errors.push(`${label}: thời gian bắt đầu phải từ 0 trở lên.`);
    if (range.end <= range.start) {
      errors.push(`${label}: thời gian kết thúc phải lớn hơn thời gian bắt đầu.`);
    }
    if (duration > 0 && range.end > duration + 0.01) {
      errors.push(`${label}: thời gian kết thúc vượt quá thời lượng audio.`);
    }
    if ((output?.categories.length || 0) > 0 && !result.category_id) {
      errors.push(`${label}: chưa chọn loại segment.`);
    }

    const categoryName = categoryNames[result.category_id || ""] || "";
    const categoryKey = categoryKeys[result.category_id || ""] || "";
    const isSpeech = /speech|voice|spoken|lời nói/i.test(
      `${categoryKey} ${categoryName}`
    );
    const transcriptIsRequired =
      requiresTranscript(output?.value_schema || {}) ||
      (required && ((output?.categories.length || 0) === 0 || isSpeech));
    if (transcriptIsRequired && !getResultTranscript(result).trim()) {
      errors.push(`${label}: transcript không được để trống.`);
    }
  });

  if (!allowsOverlappingSegments(output?.value_schema || {})) {
    for (let index = 1; index < segments.length; index += 1) {
      if (segments[index].range.start < segments[index - 1].range.end) {
        errors.push(
          `Segment ${index} và ${index + 1} đang chồng lấn thời gian.`
        );
      }
    }
  }

  return errors;
}

export function serializeAnnotationResults(results: AnnotationResult[]): string {
  return JSON.stringify(results);
}
