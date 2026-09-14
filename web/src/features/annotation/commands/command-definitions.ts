import type { Hotkey } from "@tanstack/react-hotkeys";

export type CommandScope = "global" | "workspace" | "canvas" | "timeline";

export interface CommandDefinition {
  id: string;
  name: string;
  description: string;
  category: "General" | "Tools" | "Navigation" | "Edit" | "Playback";
  scope: CommandScope;
  defaultBinding: Hotkey;
  sequence?: string[];
}

/**
 * Pre-defined platform annotation commands separated cleanly from bindings
 * Allows user-level hotkey customization, conflict prevention, and platform-aware rendering.
 */
export const DEFAULT_ANNOTATION_COMMANDS: Record<string, CommandDefinition> = {
  // General
  "general.save": {
    id: "general.save",
    name: "Lưu phiên bản (Save)",
    description: "Lưu bản gán nhãn hiện tại thành Revision mới",
    category: "General",
    scope: "workspace",
    defaultBinding: "Mod+S",
  },
  "general.instructions": {
    id: "general.instructions",
    name: "Mở hướng dẫn (Guidelines)",
    description: "Xem hướng dẫn gán nhãn chi tiết cho tác vụ",
    category: "General",
    scope: "workspace",
    defaultBinding: "H",
  },
  "general.fullscreen": {
    id: "general.fullscreen",
    name: "Toàn màn hình (Fullscreen)",
    description: "Bật/Tắt chế độ làm việc toàn màn hình",
    category: "General",
    scope: "workspace",
    defaultBinding: "F",
  },

  // Edit
  "edit.undo": {
    id: "edit.undo",
    name: "Hoàn tác (Undo)",
    description: "Hoàn tác hành động vẽ/chỉnh sửa gần nhất",
    category: "Edit",
    scope: "canvas",
    defaultBinding: "Mod+Z",
  },
  "edit.redo": {
    id: "edit.redo",
    name: "Làm lại (Redo)",
    description: "Khôi phục hành động vừa hoàn tác",
    category: "Edit",
    scope: "canvas",
    defaultBinding: "Mod+Shift+Z",
  },
  "edit.delete": {
    id: "edit.delete",
    name: "Xóa vùng chọn (Delete Region)",
    description: "Xóa region hoặc nhãn đang được chọn",
    category: "Edit",
    scope: "canvas",
    defaultBinding: "Delete",
  },
  "edit.delete_backspace": {
    id: "edit.delete_backspace",
    name: "Xóa vùng chọn (Backspace)",
    description: "Xóa region hoặc nhãn đang được chọn bằng phím Backspace",
    category: "Edit",
    scope: "canvas",
    defaultBinding: "Backspace",
  },

  // Tools
  "tool.select": {
    id: "tool.select",
    name: "Công cụ Chọn (Select Tool)",
    description: "Chọn và biến đổi hình khối hoặc đoạn nhãn",
    category: "Tools",
    scope: "canvas",
    defaultBinding: "V",
  },
  "tool.pan": {
    id: "tool.pan",
    name: "Công cụ Di chuyển (Pan / Hand)",
    description: "Kéo rê khung vẽ",
    category: "Tools",
    scope: "canvas",
    defaultBinding: "Space",
  },
  "tool.zoom_in": {
    id: "tool.zoom_in",
    name: "Phóng to (Zoom In)",
    description: "Phóng to khung nhìn",
    category: "Tools",
    scope: "canvas",
    defaultBinding: "=",
  },
  "tool.zoom_out": {
    id: "tool.zoom_out",
    name: "Thu nhỏ (Zoom Out)",
    description: "Thu nhỏ khung nhìn",
    category: "Tools",
    scope: "canvas",
    defaultBinding: "-",
  },
  "tool.zoom_fit": {
    id: "tool.zoom_fit",
    name: "Khung nhìn vừa vặn (Zoom to Fit)",
    description: "Căn chỉnh toàn bộ asset vừa với màn hình",
    category: "Tools",
    scope: "canvas",
    defaultBinding: "Shift+1",
  },
  "tool.zoom_original": {
    id: "tool.zoom_original",
    name: "Kích thước gốc (100%)",
    description: "Đặt lại tỷ lệ hiển thị về kích thước chuẩn 100%",
    category: "Tools",
    scope: "canvas",
    defaultBinding: "Shift+0",
  },

  // Navigation
  "nav.prev_asset": {
    id: "nav.prev_asset",
    name: "Tệp trước (Previous Asset)",
    description: "Chuyển sang tệp dữ liệu liền trước",
    category: "Navigation",
    scope: "workspace",
    defaultBinding: "[",
  },
  "nav.next_asset": {
    id: "nav.next_asset",
    name: "Tệp tiếp theo (Next Asset)",
    description: "Chuyển sang tệp dữ liệu tiếp theo",
    category: "Navigation",
    scope: "workspace",
    defaultBinding: "]",
  },

  // Audio / Video Playback
  "playback.toggle": {
    id: "playback.toggle",
    name: "Phát / Tạm dừng (Play/Pause)",
    description: "Bắt đầu hoặc dừng phát audio/video",
    category: "Playback",
    scope: "timeline",
    defaultBinding: "K",
  },
  "playback.step_back": {
    id: "playback.step_back",
    name: "Lùi 1 khung hình (Step Backward)",
    description: "Lùi về trước 1 frame hoặc 100ms",
    category: "Playback",
    scope: "timeline",
    defaultBinding: "J",
  },
  "playback.step_forward": {
    id: "playback.step_forward",
    name: "Tiến 1 khung hình (Step Forward)",
    description: "Tiến về sau 1 frame hoặc 100ms",
    category: "Playback",
    scope: "timeline",
    defaultBinding: "L",
  },
};
