"use client";

import React, { useState } from "react";
import { useCommandRegistry } from "./command-registry";
import { Button } from "@/components/ui";

interface HotkeySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HotkeySettingsModal({
  isOpen,
  onClose,
}: HotkeySettingsModalProps) {
  const {
    commands,
    bindings,
    resetBindings,
    formatBinding,
    recordingCommandId,
    startRecording,
    cancelRecording,
    heldKeys,
  } = useCommandRegistry();

  const [filterCategory, setFilterCategory] = useState<string>("All");

  if (!isOpen) return null;

  const categories = [
    "All",
    "General",
    "Tools",
    "Edit",
    "Navigation",
    "Playback",
  ];
  const commandList = Object.values(commands).filter((cmd) =>
    filterCategory === "All" ? true : cmd.category === filterCategory
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex h-[560px] w-full max-w-2xl flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Cài đặt Phím Tắt (Hotkeys & Commands)
            </h2>
            <p className="text-xs text-slate-400">
              Hệ thống phím tắt TanStack hỗ trợ ghi nhận và tùy chỉnh từng thao
              tác
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 border-b border-slate-800/80 bg-slate-950/40 px-6 py-2.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filterCategory === cat
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
          <div className="flex-1" />
          {heldKeys.length > 0 && (
            <div className="flex items-center space-x-1 font-mono text-[10px] text-amber-400">
              <span>Đang nhấn:</span>
              {heldKeys.map((k) => (
                <kbd
                  key={k}
                  className="rounded border border-amber-800 bg-amber-950/80 px-1 py-0.5"
                >
                  {k}
                </kbd>
              ))}
            </div>
          )}
        </div>

        {/* Command List Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-2">
            {commandList.map((cmd) => {
              const currentBinding = bindings[cmd.id] || cmd.defaultBinding;
              const isCurrentlyRecording = recordingCommandId === cmd.id;

              return (
                <div
                  key={cmd.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 p-3 transition-colors hover:border-slate-700"
                >
                  <div className="space-y-0.5 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-slate-200">
                        {cmd.name}
                      </span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                        {cmd.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {cmd.description}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isCurrentlyRecording ? (
                      <div className="flex animate-pulse items-center space-x-1.5">
                        <span className="rounded border border-blue-500/80 bg-blue-950/80 px-2.5 py-1 font-mono text-xs text-blue-300">
                          Nhấn phím mới...
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelRecording}
                          className="h-7 px-2 text-xs text-slate-400"
                        >
                          Hủy
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startRecording(cmd.id)}
                        title="Click để ghi đè phím tắt"
                        className="group flex items-center space-x-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 font-mono text-xs font-semibold text-slate-200 transition-all hover:border-blue-500 hover:bg-slate-700"
                      >
                        <span>{formatBinding(currentBinding)}</span>
                        <span className="text-[10px] text-slate-500 group-hover:text-blue-300">
                          ✎
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/60 px-6 py-3">
          <Button
            size="sm"
            variant="outline"
            onClick={resetBindings}
            className="h-8 border-slate-800 text-xs text-slate-400 hover:text-slate-200"
          >
            Khôi phục mặc định
          </Button>
          <Button
            size="sm"
            onClick={onClose}
            className="h-8 text-xs font-medium"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
