"use client";

import React from "react";
import { Button } from "@/components/ui";

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  guidelines?: string;
}

/**
 * Annotation Instructions & Guidelines Modal
 * Adapted from Label Studio components/InstructionsModal/InstructionsModal.tsx
 */
export function InstructionsModal({
  isOpen,
  onClose,
  title = "Hướng dẫn gán nhãn dữ liệu",
  guidelines,
}: InstructionsModalProps) {
  if (!isOpen) return null;

  const defaultGuidelines = `
### 1. Mục tiêu và Tiêu chuẩn
- Đảm bảo các khung bao (Bounding Box) ôm sát đường biên của đối tượng, không bị thừa hoặc thiếu biên độ.
- Với văn bản (NER): Gán nhãn trọn vẹn cả cụm từ, tránh cắt nửa từ hoặc thiếu dấu câu phụ thuộc.
- Với Audio: Đánh dấu đoạn bắt đầu và kết thúc khi phát âm thanh rõ ràng, không bao gồm khoảng lặng quá dài.

### 2. Phím tắt thao tác nhanh
- **V**: Chuyển về công cụ chọn (Select).
- **Space**: Giữ để kéo rê (Pan) khung nhìn.
- **+ / -**: Phóng to / Thu nhỏ.
- **Delete / Backspace**: Xóa vùng đang chọn.
- **Ctrl + Z / Ctrl + Shift + Z**: Hoàn tác / Làm lại.
- **Ctrl + S**: Lưu phiên bản gán nhãn mới.
- **[ / ]**: Di chuyển qua lại giữa các tệp trong hàng đợi.

### 3. Lưu ý chất lượng
- Nếu dữ liệu bị hỏng, mờ hoặc không thể nhận dạng, hãy đánh dấu nhãn hoặc gắn cờ để người kiểm thử (Reviewer) xem xét.
`;

  const content = guidelines || defaultGuidelines;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/50 px-6 py-4">
          <div className="flex items-center space-x-2">
            <span className="text-base">📖</span>
            <h2 className="text-base font-semibold text-slate-100">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6 text-xs leading-relaxed text-slate-300">
          <div className="prose prose-invert max-w-none whitespace-pre-wrap font-sans">
            {content}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-800 bg-slate-950/60 px-6 py-3">
          <Button
            size="sm"
            onClick={onClose}
            className="h-8 text-xs font-medium"
          >
            Đã hiểu & Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
