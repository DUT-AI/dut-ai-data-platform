import type { CategoryPayload, InputScope, JsonObject } from "../types";

export interface OntologyPreset {
  id: string;
  name: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  input: {
    definitionCode: string;
    name: string;
    description: string;
    scope: InputScope;
    allowedExtensions: string[];
    item: JsonObject | null;
  };
  output: {
    definitionCode: string;
    name: string;
    description: string;
    multiple: boolean;
    required: boolean;
  };
  categories: CategoryPayload[];
}

const imageInput = {
  definitionCode: "image",
  name: "Ảnh đầu vào",
  description: "Mỗi Asset ảnh được xử lý như một item hoàn chỉnh.",
  scope: "ONE_ITEM" as const,
  allowedExtensions: ["png", "jpg", "jpeg", "webp"],
  item: null,
};

export const ONTOLOGY_PRESETS: OntologyPreset[] = [
  {
    id: "vehicle_detection",
    name: "Phát hiện xe cộ",
    description: "Tìm vị trí và loại của nhiều phương tiện trên một ảnh.",
    inputFormat: "Image · 1 Asset = 1 Item · PNG/JPG/WEBP",
    outputFormat: "Bounding Box (nhiều kết quả) · car/bus/truck/...",
    input: { ...imageInput, name: "Ảnh giao thông" },
    output: {
      definitionCode: "bounding_box",
      name: "Phương tiện được phát hiện",
      description: "Danh sách vùng bao và loại phương tiện trong ảnh.",
      multiple: true,
      required: true,
    },
    categories: [
      {
        key: "car",
        name: "Ô tô",
        color: "#2563EB",
        description: "Xe con và xe gia đình.",
      },
      {
        key: "motorcycle",
        name: "Xe máy",
        color: "#F97316",
        description: "Xe mô tô hai bánh.",
      },
      {
        key: "bus",
        name: "Xe buýt",
        color: "#8B5CF6",
        description: "Xe chở khách cỡ lớn.",
      },
      {
        key: "truck",
        name: "Xe tải",
        color: "#EF4444",
        description: "Xe vận chuyển hàng hóa.",
      },
      {
        key: "bicycle",
        name: "Xe đạp",
        color: "#10B981",
        description: "Xe đạp không động cơ.",
      },
    ],
  },
  {
    id: "image_classification",
    name: "Phân loại ảnh",
    description: "Chọn một nhãn chính cho toàn bộ ảnh.",
    inputFormat: "Image · 1 Asset = 1 Item",
    outputFormat: "Classification · một Category",
    input: { ...imageInput, name: "Ảnh cần phân loại" },
    output: {
      definitionCode: "classification",
      name: "Nhãn của ảnh",
      description: "Nhãn phân loại đại diện cho toàn bộ ảnh.",
      multiple: false,
      required: true,
    },
    categories: [
      { key: "class_a", name: "Lớp A", color: "#2563EB" },
      { key: "class_b", name: "Lớp B", color: "#F97316" },
    ],
  },
  {
    id: "document_ner",
    name: "Nhận dạng thực thể",
    description: "Đánh dấu người, tổ chức và địa điểm trong tài liệu.",
    inputFormat: "Document · 1 Asset = 1 Item · TXT/PDF/DOCX",
    outputFormat: "Named Entity (nhiều kết quả) · Category",
    input: {
      definitionCode: "document",
      name: "Tài liệu nguồn",
      description: "Tài liệu chứa nội dung cần tìm thực thể.",
      scope: "ONE_ITEM",
      allowedExtensions: ["txt", "pdf", "docx"],
      item: null,
    },
    output: {
      definitionCode: "named_entity",
      name: "Các thực thể",
      description: "Các đoạn văn bản kèm vị trí và loại thực thể.",
      multiple: true,
      required: true,
    },
    categories: [
      { key: "person", name: "Người", color: "#2563EB" },
      { key: "organization", name: "Tổ chức", color: "#8B5CF6" },
      { key: "location", name: "Địa điểm", color: "#10B981" },
    ],
  },
  {
    id: "tabular_scoring",
    name: "Chấm điểm từng bản ghi",
    description: "Mỗi dòng trong file bảng là một item và nhận một điểm số.",
    inputFormat: "Tabular · 1 Asset = N Items · CSV/XLSX/JSONL",
    outputFormat: "Number · một điểm cho mỗi item",
    input: {
      definitionCode: "tabular",
      name: "Các bản ghi cần chấm",
      description: "Một file chứa nhiều bản ghi được xử lý độc lập.",
      scope: "MANY_ITEMS",
      allowedExtensions: ["csv", "xlsx", "jsonl"],
      item: {
        type: "object",
        properties: {
          record_id: { type: "string" },
          text: { type: "string" },
        },
        required: ["record_id", "text"],
      },
    },
    output: {
      definitionCode: "number",
      name: "Điểm của bản ghi",
      description: "Giá trị số được tạo cho từng item.",
      multiple: false,
      required: true,
    },
    categories: [],
  },
];

export const INPUT_SCOPE_HELP: Record<InputScope, string> = {
  ONE_ITEM: "Một Asset là một đơn vị xử lý, ví dụ một ảnh hoặc một file audio.",
  MANY_ITEMS:
    "Một Asset chứa nhiều item; object Item mô tả cấu trúc của mỗi item.",
};

export const INPUT_TYPE_HELP: Record<string, string> = {
  image: "Ảnh hoặc frame ảnh dùng làm dữ liệu đầu vào.",
  tabular: "File bảng như CSV, XLSX, JSONL hoặc Parquet.",
  video: "File video được xử lý như một Asset.",
  audio: "File âm thanh được xử lý như một Asset.",
  document: "Văn bản hoặc tài liệu như TXT, PDF, DOCX.",
  object: "Object JSON theo cấu trúc nghiệp vụ riêng.",
  link: "Đường dẫn URL tới dữ liệu.",
};

export const OUTPUT_TYPE_HELP: Record<string, string> = {
  classification: "Chọn một hoặc nhiều nhãn cho toàn bộ item.",
  bounding_box: "Khoanh vùng hình chữ nhật trên ảnh hoặc video frame.",
  polygon: "Đánh dấu một vùng bằng nhiều điểm.",
  keypoint: "Đánh dấu điểm mốc tọa độ trên ảnh hoặc video.",
  video_segment: "Cắt đoạn thời gian và gán nhãn phân đoạn video.",
  audio_segment: "Cắt đoạn thời gian và gán nhãn phân đoạn âm thanh.",
  text: "Trả về nội dung văn bản tự do.",
  named_entity: "Đánh dấu thực thể và vị trí của nó trong văn bản.",
  relation: "Mô tả quan hệ giữa hai kết quả.",
  number: "Trả về một giá trị số như điểm hoặc phép đo.",
  custom_object: "Trả về object theo cấu trúc tự định nghĩa.",
};
