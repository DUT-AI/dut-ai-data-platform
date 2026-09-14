/**
 * Color manipulation, contrast calculation, and deterministic hashing
 * Adapted from Label Studio utils/colors.js & hooks/useRegionColor.ts
 */

const COLOR_PALETTE = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
];

/**
 * Deterministically hash any string (e.g. category ID or name) into a vibrant color
 */
export function stringToColor(str: string): string {
  if (!str) return "#3b82f6";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

/**
 * Convert Hex to RGBA array [r, g, b, a]
 */
export function hexToRGBArray(hex: string): [number, number, number] {
  let cleanHex = hex.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (cleanHex.length !== 6) {
    return [59, 130, 246]; // default blue
  }
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return [r, g, b];
}

/**
 * Convert hex color to rgba string
 */
export function hexToRGBA(hex: string, alpha = 0.25): string {
  const [r, g, b] = hexToRGBArray(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Determine contrasting text color (black or white) for a given hex color
 * Uses official W3C YIQ formula
 */
export function getContrastTextColor(hexColor: string): "#000000" | "#ffffff" {
  const [r, g, b] = hexToRGBArray(hexColor);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#ffffff";
}

export interface RegionStyleConfig {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
}

/**
 * Computes rendering styles for annotation regions (BBox, Polygon, Keypoints, Text Spans)
 */
export function getRegionStyles(
  baseColor = "#3b82f6",
  isSelected = false,
  isHovered = false
): RegionStyleConfig {
  const strokeWidth = isSelected ? 3 : isHovered ? 2.5 : 1.75;
  const opacity = isSelected ? 0.35 : isHovered ? 0.25 : 0.15;
  const fillColor = hexToRGBA(baseColor, opacity);

  return {
    strokeColor: baseColor,
    fillColor,
    strokeWidth,
    opacity,
  };
}
