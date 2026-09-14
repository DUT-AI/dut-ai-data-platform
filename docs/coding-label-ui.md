Để xây dựng hệ thống gán nhãn đa dạng cho nhiều bài toán (Computer Vision, NLP, Audio, Tabular, LLM...) một cách chuyên nghiệp và dễ mở rộng (tương tự như Scale AI, Label Studio, CVAT), bạn nên tiếp cận theo kiến trúc **Contract-Driven / Plugin-based Editor** như hệ thống hiện tại của dự án.

Dưới đây là cẩm nang kiến trúc và lộ trình triển khai chi tiết cho từng bài toán:

---

### 1. Kiến trúc tổng thể: Mô hình Shell + Canvas Dispatcher

Giao diện gán nhãn nên được chia tách thành 2 tầng độc lập:

```
┌────────────────────────────────────────────────────────────────────────┐
│  WORKSPACE SHELL (Dùng chung cho TẤT CẢ các loại project)              │
│  - Thanh công cụ trên (Breadcrumbs, Save, Submit, Reject, Zoom/Pan)     │
│  - Sidebar trái (Danh sách Assets, Lọc trạng thái)                     │
│  - Sidebar phải (Taxonomy / Classes, Phím tắt, Outliner / Layers)      │
│  - Footer (Revision history, Progress, Stats)                          │
├────────────────────────────────────────────────────────────────────────┤
│  CENTRAL VIEWPORT (Hoán đổi theo bài toán nhờ `EditorRegistry`)        │
│                                                                        │
│   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌────────────┐ │
│   │ CV (Canvas)   │ │ NLP (Spans)   │ │ Audio (Wave)  │ │ Grid (CSV) │ │
│   └───────────────┘ └───────────────┘ └───────────────┘ └────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

- **Workspace Shell ([annotation-workspace-view.tsx](file:///Users/nguyenhuynh/Documents/projects/dut-ai-data-platform/web/src/features/annotation/components/annotation-workspace-view.tsx))**: Xử lý lifecycle dữ liệu, tải asset, quản lý undo/redo, lưu annotation, hotkey toàn cục.
- **Micro-Editor ([editor-registry.tsx](file:///Users/nguyenhuynh/Documents/projects/dut-ai-data-platform/web/src/features/annotation/registry/editor-registry.tsx))**: Chỉ tập trung vào việc hiển thị asset và bắt tương tác của người dùng để sinh ra dữ liệu gán nhãn.

---

### 2. Thiết kế chi tiết cho từng miền bài toán

#### A. Computer Vision (CV)
*Áp dụng cho: Bounding Box, Polygon Segmentation, Keypoints, OCR Bounding Poly, Line Detection.*

- **Công nghệ nên dùng**: `Konva` / `react-konva` (đã có sẵn trong dự án) hoặc `Fabric.js` / HTML5 Canvas原生.
- **Cách lập trình giao diện**:
  1. **Background**: Ảnh/Frame video được vẽ vừa vặn (fit/fill) với Stage.
  2. **Coordinate Normalization**: Tọa độ lưu trữ nên được chuẩn hóa về tỉ lệ `0.0 -> 1.0` (Relative coordinates: `x/width`, `y/height`) thay vì pixel tuyệt đối, giúp nhãn không bị lệch khi ảnh zoom hoặc đổi kích thước màn hình.
  3. **Interaction**:
     - *Detection*: Kéo thả chuột tạo hình chữ nhật (`Rect`).
     - *Segmentation*: Click từng điểm nối đa giác (`Line` closed).
     - *Keypoint*: Click đặt điểm mốc (`Circle`), có thể gom nhóm theo skeleton (khung xương).
  4. **Transformer & Snapping**: Cho phép chọn lại shape, kéo dãn góc, xoay, hiển thị badge class ngay trên góc bbox.

#### B. NLP & Text Processing
*Áp dụng cho: Named Entity Recognition (NER), Text Span Classification, POS Tagging, Sentiment, QA / Chat.*

- **Công nghệ nên dùng**: DOM Selection API, hoặc các thư viện Token Highlighting (như `react-highlight-words`, Slate.js).
- **Cách lập trình giao diện**:
  1. **NER / Span Highlight**:
     - Render văn bản thành các đoạn (Tokens hoặc Chars).
     - Khi user bôi đen một đoạn text (sự kiện `window.getSelection()` / `onMouseUp`), lấy `start_offset` và `end_offset` + text trích xuất.
     - Áp dụng màu nền (`category.color`) và tag label nhỏ phía trên đoạn text được chọn.
     - Click vào entity đã gán để xóa hoặc đổi nhãn.
  2. **Text Pair / Translation / QA**:
     - Hiển thị 2 cột (Source Context / Document bên trái, Target/Question-Answer bên phải).

#### C. Audio & Speech
*Áp dụng cho: Speech-to-Text (ASR), Voice Activity Detection (VAD), Speaker Diarization, Audio Classification.*

- **Công nghệ nên dùng**: `wavesurfer.js` (rất trực quan và mạnh mẽ) + `regions-plugin`.
- **Cách lập trình giao diện**:
  1. **Waveform Player**: Hiển thị sóng âm thanh có thanh trỏ Playhead chạy theo thời gian thực (hỗ trợ phím `Space` để Play/Pause).
  2. **Timeline Regions**: User kéo chuột trên dạng sóng để tạo một vùng âm thanh (`start_time` -> `end_time`).
  3. **Transcript Input**: Mỗi region đính kèm một ô nhập text (đối với ASR) hoặc chọn người nói Speaker A/B (đối với Diarization).

#### D. Tabular & Structured Data
*Áp dụng cho: Gán nhãn dữ liệu dạng bảng, dự đoán cột/hàng, phân loại dữ liệu CSV/JSON.*

- **Công nghệ nên dùng**: `@tanstack/react-table` kết hợp ảo hóa `@tanstack/react-virtual`.
- **Cách lập trình giao diện**:
  1. Render bảng dữ liệu với chức năng Highlight ô (Cell), dòng (Row) hoặc cột (Column).
  2. Popup gán nhãn nhanh xuất hiện ngay cạnh con trỏ chuột khi chọn ô.

#### E. LLM Evaluation & RLHF / DPO (GenAI)
*Áp dụng cho: Đánh giá câu trả lời của Chatbot, so sánh Response A vs Response B, chấm điểm tiêu chí (Helpfulness, Truthfulness, Safety).*

- **Cách lập trình giao diện**:
  1. **Side-by-side Layout**: Cột trái hiển thị Model A, cột phải hiển thị Model B (hỗ trợ Markdown & Code Syntax Highlight).
  2. **Evaluation Widgets**: Star ratings, Likert scale (1-5), Likert sliders, Thumbs up/down, ô nhập lý do (Critique).

---

### 3. Chuẩn hóa Hợp đồng Dữ liệu (Standard Interface Contract)

Tất cả các Editor đều tuân theo một khuôn mẫu props duy nhất:

```typescript
export interface BaseEditorComponentProps {
  assetUrl?: string;                    // Link ảnh, audio, file text, json
  results: AnnotationResult[];          // Danh sách các kết quả gán nhãn hiện tại
  availableCategories?: CategoryItem[]; // Danh sách nhãn (Labels, Tags, Colors)
  selectedCategoryId?: string | null;   // Nhãn đang được chọn
  readOnly?: boolean;                   // Chế độ chỉ xem (Review / History)
  onChange?: (results: AnnotationResult[]) => void; // Bắn kết quả cập nhật về Store
}
```

Và định dạng kết quả lưu trữ chung (`AnnotationResult`):

```typescript
export interface AnnotationResult {
  id: string;
  categoryId: string;                  // ID nhãn (vd: "person", "LOC", "positive")
  type: "bbox" | "polygon" | "span" | "region" | "classification" | "text";
  
  // Dữ liệu hình học / tọa độ linh hoạt theo bài toán
  data: {
    // Cho CV:
    x?: number; y?: number; width?: number; height?: number; points?: number[];
    // Cho NLP:
    startOffset?: number; endOffset?: number; text?: string;
    // Cho Audio:
    startTime?: number; endTime?: number; transcription?: string;
    // Cho Classification / Choice:
    selectedValues?: string[];
  };
}
```

---

### 4. Quy trình 3 bước khi Dev thêm một bài toán mới

1. **Bước 1: Viết Editor Component mới**
   Tạo file trong `src/features/annotation/components/your-editor-canvas.tsx` tuân theo `BaseEditorComponentProps`.
2. **Bước 2: Đăng ký vào [editor-registry.tsx](file:///Users/nguyenhuynh/Documents/projects/dut-ai-data-platform/web/src/features/annotation/registry/editor-registry.tsx)**
   Khai báo định danh `code`, `supportedInputTypes`, và component tương ứng.
3. **Bước 3: Tạo Template tương ứng trong Catalog**
   Khai báo trong `modules/project/data/templates.json` với `input_type` và `output_types` phù hợp. Hệ thống sẽ tự động bắt cặp và mở đúng giao diện bạn đã viết!

---

### 5. Kinh nghiệm UX/DX thực tế
- **Hệ thống phím tắt (Hotkeys)**: Người gán nhãn làm việc với tốc độ cao. Luôn gắn phím `1`, `2`, `3`... cho việc đổi nhãn; `Ctrl+Z` / `Ctrl+Y` cho Undo/Redo; `Space` để di chuyển/phát nhạc; `Del` để xóa shape.
- **Tối ưu hiệu năng**: Với dữ liệu lớn (ảnh 4K, văn bản hàng vạn từ, bảng hàng ngàn dòng), luôn dùng **Canvas ảo hóa** hoặc **DOM Virtualization** để tránh lag giật.