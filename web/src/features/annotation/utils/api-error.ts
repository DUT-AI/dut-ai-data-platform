import { isAxiosError } from "axios";

/** One violated Ontology rule returned by the annotation API. */
export interface AnnotationValidationIssue {
  path: string;
  code: string;
  message: string;
}

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: { issues?: AnnotationValidationIssue[] };
  };
}

const MAX_VISIBLE_ISSUES = 3;

/**
 * Turn a failed annotation save into a message the annotator can act on:
 * the first validation issues returned by the backend, otherwise the API
 * error message, otherwise the transport error.
 */
export function getAnnotationSaveErrorMessage(err: unknown): string {
  if (isAxiosError<ApiErrorBody>(err)) {
    const apiError = err.response?.data?.error;
    const issues = apiError?.details?.issues ?? [];
    if (issues.length > 0) {
      const visible = issues
        .slice(0, MAX_VISIBLE_ISSUES)
        .map((issue) => issue.message.trim().replace(/[.;]+$/, ""))
        .join("; ");
      const hidden = issues.length - MAX_VISIBLE_ISSUES;
      return hidden > 0 ? `${visible} (+${hidden} lỗi khác)` : visible;
    }
    if (apiError?.message) {
      return apiError.message;
    }
  }
  return err instanceof Error ? err.message : "Lỗi khi lưu kết quả gán nhãn";
}
