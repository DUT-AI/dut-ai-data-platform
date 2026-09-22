"use client";

import * as React from "react";
import { AlertCircle, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  confirmDisabled?: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel = "Xác nhận",
  cancelLabel = "Huỷ",
  destructive = false,
  confirmDisabled = false,
  isLoading = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const cancelBtnRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    // Focus cancel button initially for safety on destructive operations
    const timer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, isLoading, onClose]);

  if (!open) return null;

  return (
    <div
      className="backdrop-blur-xs fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-xl sm:p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                destructive
                  ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                  : "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
              )}
            >
              {destructive ? (
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <h3
                id={titleId}
                className="text-base font-bold text-slate-900 dark:text-slate-100"
              >
                {title}
              </h3>
              {description && (
                <p
                  id={descriptionId}
                  className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400"
                >
                  {description}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Đóng"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2.5">
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 sm:min-h-0 sm:py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {cancelLabel}
          </button>
          {onConfirm && (
            <button
              type="button"
              disabled={confirmDisabled || isLoading}
              onClick={onConfirm}
              className={cn(
                "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 sm:min-h-0 sm:py-2",
                destructive
                  ? "bg-rose-600 hover:bg-rose-700 focus-visible:outline-rose-600 dark:bg-rose-600 dark:hover:bg-rose-500"
                  : "bg-blue-600 hover:bg-blue-700 focus-visible:outline-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500"
              )}
            >
              {isLoading && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
