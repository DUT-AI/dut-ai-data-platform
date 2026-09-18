/**
 * Coordinate Transformer Utility
 * Provides pure functions to convert between Screen/Stage pixels and Normalized coordinates.
 * Supports backward-compatible percentage coordinates (0..100) and normalized coordinates (0..1).
 */

export interface ImageLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CoordinateScaleMode = "percent" | "normalized";

/**
 * Auto-detects whether coordinates are in 0..1 scale or 0..100 scale.
 * If max value is <= 1.0 (and > 0), assumes 0..1; otherwise 0..100.
 */
export function detectCoordinateScale(values: number[]): CoordinateScaleMode {
  const maxVal = Math.max(0, ...values.filter((v) => !isNaN(v)));
  if (maxVal <= 1.0) {
    return "normalized";
  }
  return "percent";
}

/**
 * Clamps a number between min and max.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Converts screen/stage coordinates to normalized image coordinates.
 * @param screenX Absolute X on the Konva stage
 * @param screenY Absolute Y on the Konva stage
 * @param imageLayout Layout bounds of the image on the stage
 * @param targetMode "percent" (0..100, current DUT contract) or "normalized" (0.0..1.0)
 */
export function screenToNorm(
  screenX: number,
  screenY: number,
  imageLayout: ImageLayout,
  targetMode: CoordinateScaleMode = "percent"
): { x: number; y: number } {
  if (imageLayout.width === 0 || imageLayout.height === 0) {
    return { x: 0, y: 0 };
  }

  const relX = screenX - imageLayout.x;
  const relY = screenY - imageLayout.y;

  const ratioX = clamp(relX / imageLayout.width, 0, 1);
  const ratioY = clamp(relY / imageLayout.height, 0, 1);

  const multiplier = targetMode === "percent" ? 100 : 1;

  return {
    x: ratioX * multiplier,
    y: ratioY * multiplier,
  };
}

/**
 * Converts normalized image coordinates to screen/stage pixel coordinates.
 * Automatically adapts if input is in 0..1 or 0..100 scale.
 */
export function normToScreen(
  normX: number,
  normY: number,
  normW: number,
  normH: number,
  imageLayout: ImageLayout
): { x: number; y: number; width: number; height: number } {
  if (imageLayout.width === 0 || imageLayout.height === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  // Detect scale: if max value > 1.0, it's 0..100 percentage
  const isPercent = normX > 1.0 || normY > 1.0 || normW > 1.0 || normH > 1.0;
  const divisor = isPercent ? 100 : 1;

  return {
    x: imageLayout.x + (normX / divisor) * imageLayout.width,
    y: imageLayout.y + (normY / divisor) * imageLayout.height,
    width: (normW / divisor) * imageLayout.width,
    height: (normH / divisor) * imageLayout.height,
  };
}

/**
 * Converts a single normalized point (normX, normY) to screen pixel coordinates.
 */
export function pointNormToScreen(
  normX: number,
  normY: number,
  imageLayout: ImageLayout
): { x: number; y: number } {
  if (imageLayout.width === 0 || imageLayout.height === 0) {
    return { x: 0, y: 0 };
  }

  const isPercent = normX > 1.0 || normY > 1.0;
  const divisor = isPercent ? 100 : 1;

  return {
    x: imageLayout.x + (normX / divisor) * imageLayout.width,
    y: imageLayout.y + (normY / divisor) * imageLayout.height,
  };
}

/**
 * Calculates a letterboxed/fitted layout of an image within container dimensions.
 */
export function calculateFitImageLayout(
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number,
  paddingFactor = 0.95
): ImageLayout {
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    naturalWidth <= 0 ||
    naturalHeight <= 0
  ) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const scale = Math.min(
    (containerWidth * paddingFactor) / naturalWidth,
    (containerHeight * paddingFactor) / naturalHeight
  );

  const renderWidth = naturalWidth * scale;
  const renderHeight = naturalHeight * scale;

  const x = (containerWidth - renderWidth) / 2;
  const y = (containerHeight - renderHeight) / 2;

  return { x, y, width: renderWidth, height: renderHeight };
}
