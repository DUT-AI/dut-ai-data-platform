"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Table as TableIcon,
  Music,
  Film,
  Image as ImageIcon,
  AlertTriangle,
  FileCode,
  File,
} from "lucide-react";

export type AssetCategory =
  "image" | "video" | "audio" | "pdf" | "tabular" | "text" | "unknown";

export function getAssetCategory(
  filename: string,
  mimeType: string
): AssetCategory {
  const mime = (mimeType || "").toLowerCase();
  const ext = (filename.split(".").pop() || "").toLowerCase();

  // Image
  if (
    mime.startsWith("image/") ||
    ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico"].includes(ext)
  ) {
    return "image";
  }

  // Video
  if (
    mime.startsWith("video/") ||
    ["mp4", "webm", "ogg", "mov", "m4v", "avi", "mkv"].includes(ext)
  ) {
    return "video";
  }

  // Audio
  if (
    mime.startsWith("audio/") ||
    ["mp3", "wav", "ogg", "m4a", "aac", "flac", "wma", "opus"].includes(ext)
  ) {
    return "audio";
  }

  // PDF
  if (mime === "application/pdf" || ext === "pdf") {
    return "pdf";
  }

  // Tabular (CSV, TSV, Excel)
  if (
    mime === "text/csv" ||
    mime === "text/tab-separated-values" ||
    mime === "application/vnd.ms-excel" ||
    ["csv", "tsv"].includes(ext)
  ) {
    return "tabular";
  }

  // Text / NLP / JSON / JSONL
  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/x-jsonlines" ||
    mime === "application/jsonlines" ||
    ["txt", "json", "jsonl", "md", "log", "text", "py", "js", "ts"].includes(
      ext
    )
  ) {
    return "text";
  }

  return "unknown";
}

interface AssetPreviewProps {
  downloadUrl?: string;
  filename: string;
  mimeType: string;
  isLoading?: boolean;
}

export function AssetPreview({
  downloadUrl,
  filename,
  mimeType,
  isLoading = false,
}: AssetPreviewProps) {
  const category = getAssetCategory(filename, mimeType);

  if (isLoading || !downloadUrl) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-2 text-slate-400">
        <div className="border-primary-500 h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
        <span className="text-xs">Đang tải dữ liệu xem trước...</span>
      </div>
    );
  }

  switch (category) {
    case "image":
      return <ImagePreview src={downloadUrl} filename={filename} />;

    case "video":
      return (
        <VideoPreview
          src={downloadUrl}
          mimeType={mimeType}
          filename={filename}
        />
      );

    case "audio":
      return (
        <AudioPreview
          src={downloadUrl}
          filename={filename}
          mimeType={mimeType}
        />
      );

    case "pdf":
      return (
        <iframe
          src={downloadUrl}
          title={filename}
          className="h-72 w-full rounded-lg border-0 bg-white"
        />
      );

    case "tabular":
      return <TabularPreview src={downloadUrl} filename={filename} />;

    case "text":
      return (
        <TextPreview
          src={downloadUrl}
          filename={filename}
          mimeType={mimeType}
        />
      );

    default:
      return <GenericFilePreview filename={filename} mimeType={mimeType} />;
  }
}

// ----------------------------------------------------------------------
// Image Preview
// ----------------------------------------------------------------------
function ImagePreview({ src, filename }: { src: string; filename: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center space-y-2 text-center text-amber-400">
        <AlertTriangle className="h-8 w-8 text-amber-400" />
        <p className="text-xs font-semibold text-amber-300">
          Tập tin hình ảnh bị hỏng hoặc không thể hiển thị
        </p>
        <p className="font-mono text-[11px] text-slate-400">{filename}</p>
      </div>
    );
  }

  return (
    <div className="flex max-h-72 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-950/60 p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={filename}
        onError={() => setHasError(true)}
        className="max-h-64 rounded object-contain shadow-md"
      />
    </div>
  );
}

// ----------------------------------------------------------------------
// Video Preview
// ----------------------------------------------------------------------
function VideoPreview({
  src,
  mimeType,
  filename,
}: {
  src: string;
  mimeType: string;
  filename: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center space-y-2 p-6 text-center text-amber-400">
        <Film className="h-8 w-8 text-amber-400" />
        <p className="text-xs font-semibold text-amber-300">
          Trình duyệt không hỗ trợ xem trực tiếp video này
        </p>
        <p className="font-mono text-[11px] text-slate-400">{filename}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center justify-center rounded-lg bg-black p-2 shadow-inner">
      <video
        controls
        preload="metadata"
        onError={() => setHasError(true)}
        className="max-h-72 w-full rounded object-contain"
      >
        <source src={src} type={mimeType} />
        Trình duyệt của bạn không hỗ trợ thẻ video.
      </video>
    </div>
  );
}

// ----------------------------------------------------------------------
// Audio Preview
// ----------------------------------------------------------------------
function AudioPreview({
  src,
  filename,
  mimeType,
}: {
  src: string;
  filename: string;
  mimeType: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center space-y-2 p-6 text-center text-amber-400">
        <Music className="h-8 w-8 text-amber-400" />
        <p className="text-xs font-semibold text-amber-300">
          Trình duyệt không thể phát định dạng âm thanh này
        </p>
        <p className="font-mono text-[11px] text-slate-400">{filename}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-200 shadow-inner">
      <div className="mb-4 flex items-center gap-3">
        <div className="bg-primary-500/20 text-primary-400 flex h-12 w-12 items-center justify-center rounded-full">
          <Music className="h-6 w-6 animate-pulse" />
        </div>
        <div className="text-left">
          <div className="max-w-xs truncate font-mono text-xs font-semibold text-slate-100">
            {filename}
          </div>
          <div className="font-mono text-[11px] text-slate-400">{mimeType}</div>
        </div>
      </div>

      <audio
        controls
        preload="metadata"
        onError={() => setHasError(true)}
        className="w-full max-w-md"
      >
        <source src={src} type={mimeType} />
        Trình duyệt của bạn không hỗ trợ thẻ audio.
      </audio>
    </div>
  );
}

// ----------------------------------------------------------------------
// Tabular Preview (CSV / TSV)
// ----------------------------------------------------------------------
function TabularPreview({ src, filename }: { src: string; filename: string }) {
  const [rows, setRows] = useState<string[][]>([]);
  const [totalLinesCount, setTotalLinesCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    // Reset preview state when the selected external asset URL changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!isMounted) return;
        const rawLines = text
          .split(/\r?\n/)
          .filter((line) => line.trim().length > 0);
        setTotalLinesCount(rawLines.length);

        const delimiter = filename.endsWith(".tsv") ? "\t" : ",";
        const parsed = rawLines
          .slice(0, 15)
          .map((line) => parseCsvLine(line, delimiter));
        setRows(parsed);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Không thể tải nội dung bảng");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [src, filename]);

  if (isLoading) {
    return (
      <div className="flex h-48 flex-col items-center justify-center space-y-2 text-slate-400">
        <TableIcon className="text-primary-400 h-6 w-6 animate-pulse" />
        <span className="text-xs">
          Đang đọc và xử lý dữ liệu bảng (CSV/TSV)...
        </span>
      </div>
    );
  }

  if (error || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-2 p-6 text-center text-amber-400">
        <TableIcon className="h-8 w-8 text-amber-400" />
        <p className="text-xs font-semibold text-amber-300">
          {error || "Tập tin bảng không có dữ liệu để hiển thị"}
        </p>
      </div>
    );
  }

  const headerRow = rows[0];
  const dataRows = rows.slice(1);

  return (
    <div className="flex w-full flex-col space-y-2">
      <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
        <span className="flex items-center gap-1 font-medium text-slate-300">
          <TableIcon className="text-primary-400 h-3.5 w-3.5" />
          Xem trước bảng (Top {rows.length} / {totalLinesCount} dòng)
        </span>
        <span className="font-mono text-[10px] text-slate-500">{filename}</span>
      </div>

      <div className="max-h-64 w-full overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-1">
        <table className="w-full text-left font-mono text-[11px]">
          <thead className="sticky top-0 border-b border-slate-800 bg-slate-900 text-slate-200">
            <tr>
              <th className="w-10 px-2 py-1.5 text-center text-slate-500">#</th>
              {headerRow.map((col, idx) => (
                <th
                  key={idx}
                  className="whitespace-nowrap px-3 py-1.5 font-semibold"
                >
                  {col || `Cột ${idx + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {dataRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-900/50">
                <td className="px-2 py-1 text-center text-[10px] text-slate-600">
                  {rIdx + 1}
                </td>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="max-w-xs truncate px-3 py-1">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Simple CSV Parser helper
function parseCsvLine(line: string, delimiter: string = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ----------------------------------------------------------------------
// Text / NLP / JSON / JSONL Preview
// ----------------------------------------------------------------------
function TextPreview({
  src,
  filename,
  mimeType,
}: {
  src: string;
  filename: string;
  mimeType: string;
}) {
  const [contentLines, setContentLines] = useState<string[]>([]);
  const [totalLines, setTotalLines] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    // Reset preview state when the selected external asset URL changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!isMounted) return;

        const isJson = filename.endsWith(".json") || mimeType.includes("json");
        const isJsonl =
          filename.endsWith(".jsonl") ||
          mimeType.includes("jsonlines") ||
          mimeType.includes("x-jsonlines");

        let lines: string[] = [];

        if (isJson) {
          try {
            const parsed = JSON.parse(text);
            const formatted = JSON.stringify(parsed, null, 2);
            lines = formatted.split("\n");
          } catch {
            lines = text.split(/\r?\n/);
          }
        } else if (isJsonl) {
          lines = text.split(/\r?\n/).map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return "";
            try {
              return JSON.stringify(JSON.parse(trimmed));
            } catch {
              return trimmed;
            }
          });
        } else {
          lines = text.split(/\r?\n/);
        }

        setTotalLines(lines.length);
        setContentLines(lines.slice(0, 150));
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Không thể đọc nội dung tập tin văn bản");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [src, filename, mimeType]);

  if (isLoading) {
    return (
      <div className="flex h-48 flex-col items-center justify-center space-y-2 text-slate-400">
        <FileCode className="h-6 w-6 animate-pulse text-emerald-400" />
        <span className="text-xs">Đang tải văn bản (NLP/JSON/TXT)...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center space-y-2 p-6 text-center text-amber-400">
        <FileText className="h-8 w-8 text-amber-400" />
        <p className="text-xs font-semibold text-amber-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col space-y-1.5">
      <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
        <span className="flex items-center gap-1 font-medium text-slate-300">
          <FileCode className="h-3.5 w-3.5 text-emerald-400" />
          Xem trước văn bản ({contentLines.length} / {totalLines} dòng)
        </span>
        <span className="font-mono text-[10px] text-slate-500">{filename}</span>
      </div>

      <div className="max-h-64 w-full overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-emerald-300 shadow-inner">
        <table className="w-full text-left">
          <tbody>
            {contentLines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-900/60">
                <td className="w-10 select-none pr-3 text-right font-mono text-[10px] text-slate-600">
                  {idx + 1}
                </td>
                <td className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-slate-200">
                  {line}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Generic / Unknown File Preview
// ----------------------------------------------------------------------
function GenericFilePreview({
  filename,
  mimeType,
}: {
  filename: string;
  mimeType: string;
}) {
  return (
    <div className="flex h-52 flex-col items-center justify-center space-y-3 rounded-lg border border-slate-800 bg-slate-950 p-4 text-center text-slate-400">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-slate-400">
        <File className="h-6 w-6" />
      </div>
      <div>
        <p className="font-mono text-xs font-medium text-slate-200">
          {filename}
        </p>
        <p className="mt-1 font-mono text-[11px] text-slate-500">{mimeType}</p>
      </div>
      <p className="text-[11px] text-slate-400">
        Tập tin này không hỗ trợ xem trực tiếp. Bạn có thể bấm nút &quot;Tải tệp
        xuống&quot; bên dưới để kiểm tra.
      </p>
    </div>
  );
}
