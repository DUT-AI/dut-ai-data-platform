import { datasetApi } from "../api";
import type { AssetImportJob } from "../types";

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 20 * 60 * 1000;
const MAX_CONSECUTIVE_POLL_ERRORS = 3;

const isFinished = (job: AssetImportJob) =>
  job.status === "succeeded" || job.status === "failed";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Poll an asset import job until the validation workers finish it.
 * Tolerates a few transient polling errors; the job keeps running server-side.
 */
export async function waitForAssetImport(
  jobId: string,
  onUpdate?: (job: AssetImportJob) => void
): Promise<AssetImportJob> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let consecutiveErrors = 0;

  for (;;) {
    try {
      const job = await datasetApi.getAssetImportJob(jobId);
      consecutiveErrors = 0;
      onUpdate?.(job);
      if (isFinished(job)) {
        return job;
      }
    } catch (error) {
      consecutiveErrors += 1;
      if (consecutiveErrors >= MAX_CONSECUTIVE_POLL_ERRORS) {
        throw error;
      }
    }

    if (Date.now() > deadline) {
      throw new Error(
        "Quá thời gian chờ kiểm tra tệp. Hệ thống vẫn tiếp tục xử lý; hãy tải lại trang sau ít phút để xem kết quả."
      );
    }
    await sleep(POLL_INTERVAL_MS);
  }
}
