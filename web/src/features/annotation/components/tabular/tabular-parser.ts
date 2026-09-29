import { TabularRow } from "./tabular-types";

/**
 * Standard candidates for stable record identifiers according to domain guidelines
 */
const CANDIDATE_KEY_FIELDS = [
  "id",
  "_id",
  "__id__",
  "__row_id__",
  "record_id",
  "record_key",
  "uuid",
  "guid",
  "code",
  "pk",
  "index_id",
];

/**
 * Detect a natural stable key column from headers and rows
 */
export function detectRecordKeyField(
  headers: string[],
  rows: TabularRow[]
): { keyField: string; isSynthetic: boolean } {
  if (headers.length === 0) {
    return { keyField: "__row_id__", isSynthetic: true };
  }

  // 1. Check direct matches against candidate key names (case-insensitive)
  for (const candidate of CANDIDATE_KEY_FIELDS) {
    const found = headers.find(
      (h) => h.toLowerCase() === candidate.toLowerCase()
    );
    if (found) {
      // Validate that at least some rows have non-empty values for this candidate
      const sample = rows.slice(0, 50);
      const hasValues = sample.some((r) => r[found] !== undefined && r[found] !== null && String(r[found]).trim() !== "");
      if (hasValues) {
        return { keyField: found, isSynthetic: false };
      }
    }
  }

  // 2. Check headers that end with "_id" or "id" (e.g. "user_id", "item_id", "order_id")
  const idLike = headers.find((h) => {
    const lower = h.toLowerCase();
    return lower.endsWith("_id") || lower.endsWith(".id") || lower.endsWith("id");
  });
  if (idLike) {
    const sample = rows.slice(0, 50);
    const hasValues = sample.some((r) => r[idLike] !== undefined && r[idLike] !== null && String(r[idLike]).trim() !== "");
    if (hasValues) {
      return { keyField: idLike, isSynthetic: false };
    }
  }

  // 3. Fallback: If no candidate was found, we flag as synthetic.
  // We use the first column name if available or fallback to synthetic key.
  return { keyField: headers[0], isSynthetic: true };
}

/**
 * Robust RFC 4180-compliant CSV / TSV parser
 */
export function parseCsvOrTsv(
  text: string,
  explicitDelimiter?: string
): { headers: string[]; rows: TabularRow[] } {
  if (!text || !text.trim()) {
    return { headers: [], rows: [] };
  }

  // Auto-detect delimiter if not specified: check first line for tabs vs commas vs semicolons
  let delimiter = explicitDelimiter;
  if (!delimiter) {
    const firstLine = text.split(/\r?\n/)[0] || "";
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;

    if (tabCount > commaCount && tabCount > semicolonCount) {
      delimiter = "\t";
    } else if (semicolonCount > commaCount && semicolonCount > tabCount) {
      delimiter = ";";
    } else {
      delimiter = ",";
    }
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let insideQuotes = false;
  let i = 0;

  const len = text.length;

  while (i < len) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentVal += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        currentVal += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(currentVal.trim());
        currentVal = "";
        i++;
        continue;
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        currentRow.push(currentVal.trim());
        if (currentRow.some((c) => c !== "")) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentVal = "";
        i++;
        continue;
      } else if (char === "\n") {
        currentRow.push(currentVal.trim());
        if (currentRow.some((c) => c !== "")) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentVal = "";
        i++;
        continue;
      } else {
        currentVal += char;
        i++;
        continue;
      }
    }
  }

  // Push last value and row if non-empty
  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((c) => c !== "")) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  // First row is headers
  const rawHeaders = rows[0].map((h, idx) => (h.trim() ? h.trim() : `Column_${idx + 1}`));
  // Ensure header names are unique
  const headers: string[] = [];
  const headerCountMap = new Map<string, number>();
  for (const h of rawHeaders) {
    const count = headerCountMap.get(h) || 0;
    if (count > 0) {
      headers.push(`${h}_${count + 1}`);
    } else {
      headers.push(h);
    }
    headerCountMap.set(h, count + 1);
  }

  const parsedRows: TabularRow[] = [];
  for (let rIdx = 1; rIdx < rows.length; rIdx++) {
    const rowValues = rows[rIdx];
    const rowObj: TabularRow = {};
    for (let cIdx = 0; cIdx < headers.length; cIdx++) {
      const colName = headers[cIdx];
      rowObj[colName] = rowValues[cIdx] !== undefined ? rowValues[cIdx] : "";
    }
    parsedRows.push(rowObj);
  }

  return { headers, rows: parsedRows };
}

/**
 * Universal tabular data parser supporting JSON array and CSV/TSV
 */
export function parseTabularData(text: string): {
  headers: string[];
  rows: TabularRow[];
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { headers: [], rows: [] };
  }

  // Try JSON first
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Collect all distinct keys across the first 100 rows
        const headerSet = new Set<string>();
        const sample = parsed.slice(0, 100);
        for (const item of sample) {
          if (item && typeof item === "object") {
            Object.keys(item).forEach((k) => headerSet.add(k));
          }
        }
        const headers = Array.from(headerSet);
        const rows: TabularRow[] = parsed.map((item, idx) => {
          if (!item || typeof item !== "object") {
            return { value: item, __row_id__: `row_${idx + 1}` };
          }
          return item as TabularRow;
        });
        return { headers, rows };
      }
    } catch {
      // Continue to CSV
    }
  }

  // Parse as CSV / TSV
  return parseCsvOrTsv(trimmed);
}
