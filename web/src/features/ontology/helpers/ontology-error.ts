/**
 * Extract a user-friendly error message from an Axios-like API error.
 */
export function getOntologyApiError(
  error: unknown,
  fallback = "Yêu cầu thất bại. Kiểm tra dữ liệu và thử lại."
): string {
  const response = error as {
    response?: { data?: { detail?: string; message?: string } };
  };
  return (
    response.response?.data?.detail ??
    response.response?.data?.message ??
    fallback
  );
}
