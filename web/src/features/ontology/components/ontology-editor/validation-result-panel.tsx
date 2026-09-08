import { AlertCircle, CheckCircle2, X } from "lucide-react";
import type { ValidationResult } from "../../types";

interface ValidationResultPanelProps {
  result: ValidationResult;
  onClose: () => void;
}

export function ValidationResultPanel({
  result,
  onClose,
}: ValidationResultPanelProps) {
  return (
    <section
      className={`rounded-xl border p-4 ${
        result.valid
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
          : "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30"
      }`}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {result.valid ? (
          <CheckCircle2
            className="mt-0.5 size-5 shrink-0 text-emerald-600"
            aria-hidden="true"
          />
        ) : (
          <AlertCircle
            className="mt-0.5 size-5 shrink-0 text-rose-600"
            aria-hidden="true"
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">
            {result.valid
              ? "Version hợp lệ và có thể Publish"
              : `Cần sửa ${result.issues.length} vấn đề`}
          </h3>
          {!result.valid && (
            <ul className="mt-2 space-y-1 text-xs leading-5 text-rose-800 dark:text-rose-200">
              {result.issues.map((issue, index) => (
                <li key={`${issue.path}-${issue.code}-${index}`}>
                  <code className="font-semibold">{issue.path}</code>:{" "}
                  {issue.message}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-500 hover:bg-black/5"
          aria-label="Đóng kết quả kiểm tra"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
