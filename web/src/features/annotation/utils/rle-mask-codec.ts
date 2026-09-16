/**
 * Run-Length Encoding (RLE) Codec for Brush Masks
 * Compactly compresses 2D binary raster masks for storage in JSONB.
 */

export interface RLEData {
  counts: number[];
  width: number;
  height: number;
}

/**
 * Encodes an HTML5 Canvas ImageData into standard Run-Length Encoding (counts array).
 * Reads pixel alpha values: alpha > 0 is foreground (1), alpha === 0 is background (0).
 */
export function encodeImageDataToRLE(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): RLEData {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const totalPixels = width * height;

  const counts: number[] = [];
  let currentVal = 0; // Starts counting 0s (background)
  let runLength = 0;

  for (let i = 0; i < totalPixels; i++) {
    // 4th byte is alpha channel
    const alpha = data[i * 4 + 3];
    const val = alpha > 10 ? 1 : 0;

    if (val === currentVal) {
      runLength++;
    } else {
      counts.push(runLength);
      currentVal = val;
      runLength = 1;
    }
  }

  // Push final run
  if (runLength > 0) {
    counts.push(runLength);
  }

  return {
    counts,
    width,
    height,
  };
}

/**
 * Decodes RLE counts array and renders it into a CanvasRenderingContext2D.
 */
export function decodeRLEToContext(
  rle: RLEData,
  ctx: CanvasRenderingContext2D,
  color: [number, number, number] = [59, 130, 246]
) {
  const { counts, width, height } = rle;
  if (width <= 0 || height <= 0 || !counts || counts.length === 0) return;

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  let currentVal = 0; // starts at 0 (transparent)
  let pixelIndex = 0;

  for (let c = 0; c < counts.length; c++) {
    const len = counts[c];
    if (currentVal === 1) {
      for (let k = 0; k < len; k++) {
        const offset = (pixelIndex + k) * 4;
        data[offset] = color[0];     // R
        data[offset + 1] = color[1]; // G
        data[offset + 2] = color[2]; // B
        data[offset + 3] = 255;      // A
      }
    }
    pixelIndex += len;
    currentVal = 1 - currentVal;
  }

  ctx.putImageData(imgData, 0, 0);
}
