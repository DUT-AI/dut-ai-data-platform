export type ModalityCode =
  | "image"
  | "document"
  | "text"
  | "chat"
  | "audio"
  | "video"
  | "tabular";

export interface ModalityMeta {
  code: ModalityCode;
  label: string;
  shortLabel: string;
  domainGroup: string;
  allowedExtensions: string[];
  acceptAttribute: string;
  exampleDatasetName: string;
  exampleDescription: string;
  iconName: "image" | "file-text" | "headphones" | "video" | "table" | "layers";
  defaultTools: Array<{ name: string; type: string }>;
  defaultLabels: Array<{ name: string; color: string }>;
}

const MODALITY_CONFIGS: Record<ModalityCode, ModalityMeta> = {
  image: {
    code: "image",
    label: "Thị giác máy tính (Computer Vision)",
    shortLabel: "Hình ảnh (Image)",
    domainGroup: "Computer Vision",
    allowedExtensions: ["jpg", "jpeg", "png", "webp", "bmp", "gif"],
    acceptAttribute: "image/jpeg,image/png,image/webp,image/bmp,image/gif",
    exampleDatasetName: "VD: Dữ liệu ảnh camera giao thông ngã tư",
    exampleDescription:
      "Tập hợp các tệp ảnh chất lượng cao phục vụ huấn luyện nhận diện và phát hiện vật thể (Object Detection)...",
    iconName: "image",
    defaultTools: [
      { name: "Hộp chữ nhật (Bounding Box)", type: "bounding_box" },
      { name: "Đa giác (Polygon)", type: "polygon" },
    ],
    defaultLabels: [
      { name: "Person", color: "#2563eb" },
      { name: "Car", color: "#10b981" },
      { name: "Bicycle", color: "#f59e0b" },
    ],
  },
  document: {
    code: "document",
    label: "Xử lý ngôn ngữ tự nhiên (NLP / Text)",
    shortLabel: "Văn bản (Document / Text)",
    domainGroup: "Natural Language Processing",
    allowedExtensions: ["txt", "json", "jsonl", "csv", "pdf"],
    acceptAttribute: ".txt,.json,.jsonl,.csv,.pdf,text/plain,application/json,text/csv,application/pdf",
    exampleDatasetName: "VD: Tập văn bản đánh giá sản phẩm khách hàng",
    exampleDescription:
      "Dữ liệu văn bản phục vụ phân loại ý kiến và trích xuất thực thể tên riêng (NER)...",
    iconName: "file-text",
    defaultTools: [
      { name: "Gán nhãn thực thể (NER)", type: "named_entity" },
      { name: "Phân loại văn bản (Classification)", type: "classification" },
    ],
    defaultLabels: [
      { name: "Person", color: "#2563eb" },
      { name: "Organization", color: "#10b981" },
      { name: "Location", color: "#f59e0b" },
    ],
  },
  text: {
    code: "text",
    label: "Xử lý ngôn ngữ tự nhiên (NLP / Text)",
    shortLabel: "Văn bản (Text)",
    domainGroup: "Natural Language Processing",
    allowedExtensions: ["txt", "json", "jsonl", "csv"],
    acceptAttribute: ".txt,.json,.jsonl,.csv,text/plain,application/json,text/csv",
    exampleDatasetName: "VD: Tập ngữ liệu hỏi đáp tiếng Việt",
    exampleDescription:
      "Tập ngữ liệu câu văn phục vụ bài toán trả lời câu hỏi và tóm tắt văn bản...",
    iconName: "file-text",
    defaultTools: [
      { name: "Gán nhãn thực thể (NER)", type: "named_entity" },
      { name: "Phân loại (Classification)", type: "classification" },
    ],
    defaultLabels: [
      { name: "Positive", color: "#10b981" },
      { name: "Neutral", color: "#64748b" },
      { name: "Negative", color: "#ef4444" },
    ],
  },
  chat: {
    code: "chat",
    label: "Hội thoại & Đánh giá LLM (Conversational)",
    shortLabel: "Đoạn hội thoại (Chat)",
    domainGroup: "Conversational AI / LLM",
    allowedExtensions: ["json", "jsonl", "txt", "csv"],
    acceptAttribute: ".json,.jsonl,.txt,.csv,application/json,text/plain",
    exampleDatasetName: "VD: Tập hội thoại trợ lý ảo đa lượt",
    exampleDescription:
      "Dữ liệu đối thoại nhiều lượt phục vụ tinh chỉnh mô hình ngôn ngữ lớn (RLHF / Chat)...",
    iconName: "file-text",
    defaultTools: [
      { name: "Đánh giá xếp hạng (LLM Ranker)", type: "classification" },
      { name: "Phản hồi mẫu (Response Generation)", type: "text" },
    ],
    defaultLabels: [
      { name: "Helpful", color: "#10b981" },
      { name: "Unhelpful", color: "#ef4444" },
    ],
  },
  audio: {
    code: "audio",
    label: "Xử lý âm thanh & Giọng nói (Audio / Speech)",
    shortLabel: "Âm thanh (Audio)",
    domainGroup: "Audio & Speech Processing",
    allowedExtensions: ["wav", "mp3", "flac", "ogg", "m4a", "aac"],
    acceptAttribute: "audio/*,.wav,.mp3,.flac,.ogg,.m4a,.aac",
    exampleDatasetName: "VD: Dữ liệu ghi âm giọng nói tiếng Việt",
    exampleDescription:
      "Các tệp âm thanh ghi âm chuẩn phục vụ huấn luyện mô hình nhận dạng giọng nói (ASR)...",
    iconName: "headphones",
    defaultTools: [
      { name: "Phân đoạn âm thanh (Audio Segment)", type: "audio_segment" },
      { name: "Phiên âm giọng nói (Transcription)", type: "text" },
    ],
    defaultLabels: [
      { name: "Speech", color: "#2563eb" },
      { name: "Music", color: "#10b981" },
      { name: "Noise", color: "#64748b" },
    ],
  },
  video: {
    code: "video",
    label: "Thị giác máy tính (Video Processing)",
    shortLabel: "Video",
    domainGroup: "Computer Vision",
    allowedExtensions: ["mp4", "avi", "mov", "mkv", "webm"],
    acceptAttribute: "video/*,.mp4,.avi,.mov,.mkv,.webm",
    exampleDatasetName: "VD: Video camera giám sát luồng giao thông",
    exampleDescription:
      "Các đoạn video ghi lại chuyển động phục vụ phân đoạn hành động và theo dõi đối tượng...",
    iconName: "video",
    defaultTools: [
      { name: "Phân đoạn video (Video Segment)", type: "video_segment" },
      { name: "Phát hiện đối tượng (Bounding Box)", type: "bounding_box" },
    ],
    defaultLabels: [
      { name: "Action", color: "#2563eb" },
      { name: "Vehicle", color: "#10b981" },
    ],
  },
  tabular: {
    code: "tabular",
    label: "Dữ liệu dạng bảng (Tabular Data)",
    shortLabel: "Bảng dữ liệu (Tabular)",
    domainGroup: "Tabular & Structured Data",
    allowedExtensions: ["csv", "parquet", "xlsx", "json"],
    acceptAttribute: ".csv,.parquet,.xlsx,.json,text/csv,application/vnd.ms-excel",
    exampleDatasetName: "VD: Bảng thông tin giao dịch khách hàng",
    exampleDescription:
      "Bảng dữ liệu có cấu trúc phục vụ phân tích hồi quy và phân lớp hành vi...",
    iconName: "table",
    defaultTools: [
      { name: "Gán nhãn bảng (Tabular Annotation)", type: "tabular" },
      { name: "Phân loại (Classification)", type: "classification" },
    ],
    defaultLabels: [
      { name: "Fraud", color: "#ef4444" },
      { name: "Normal", color: "#10b981" },
    ],
  },
};

/**
 * Resolve modality metadata based on raw modality string or template group.
 */
export function resolveModalityMeta(
  modality?: string | null,
  templateGroup?: string | null
): ModalityMeta {
  const normModality = (modality || "").toLowerCase().trim();
  const normGroup = (templateGroup || "").toLowerCase().trim();

  if (normModality && normModality in MODALITY_CONFIGS) {
    return MODALITY_CONFIGS[normModality as ModalityCode];
  }

  // Infer from group if modality is missing or generic
  if (normGroup.includes("vision") || normGroup.includes("image")) {
    return MODALITY_CONFIGS.image;
  }
  if (
    normGroup.includes("language") ||
    normGroup.includes("nlp") ||
    normGroup.includes("text")
  ) {
    return MODALITY_CONFIGS.document;
  }
  if (normGroup.includes("audio") || normGroup.includes("speech")) {
    return MODALITY_CONFIGS.audio;
  }
  if (normGroup.includes("tabular") || normGroup.includes("table")) {
    return MODALITY_CONFIGS.tabular;
  }
  if (normGroup.includes("conversational") || normGroup.includes("llm")) {
    return MODALITY_CONFIGS.chat;
  }

  // Substring matching on modality
  if (normModality.includes("doc") || normModality.includes("text")) {
    return MODALITY_CONFIGS.document;
  }
  if (normModality.includes("audio") || normModality.includes("sound")) {
    return MODALITY_CONFIGS.audio;
  }
  if (normModality.includes("video")) {
    return MODALITY_CONFIGS.video;
  }
  if (normModality.includes("table") || normModality.includes("tabular")) {
    return MODALITY_CONFIGS.tabular;
  }

  // Default to Computer Vision (image)
  return MODALITY_CONFIGS.image;
}

/**
 * Validate a file against the modality constraints.
 */
export function validateFileForModality(
  file: File,
  meta: ModalityMeta
): { valid: boolean; reason?: string } {
  const ext = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase() || ""
    : "";

  if (!ext) {
    return {
      valid: false,
      reason: `Tập tin "${file.name}" không có phần mở rộng định dạng (extension).`,
    };
  }

  const isAllowedExt = meta.allowedExtensions.includes(ext);
  if (!isAllowedExt) {
    return {
      valid: false,
      reason: `Định dạng .${ext} của tập tin "${file.name}" không tương thích với phân loại ${meta.label}. Chỉ chấp nhận: ${meta.allowedExtensions.map((e) => e.toUpperCase()).join(", ")}.`,
    };
  }

  return { valid: true };
}
