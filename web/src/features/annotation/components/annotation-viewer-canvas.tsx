"use client";

import { AnnotationResult } from "../types/annotation";

interface AnnotationViewerCanvasProps {
  imageUrl?: string;
  results: AnnotationResult[];
  categoryColors?: Record<string, string>;
  categoryNames?: Record<string, string>;
}

const DEFAULT_COLORS = [
  "#3B82F6", // blue
  "#EF4444", // red
  "#10B981", // green
  "#F59E0B", // amber
  "#8B5CF6", // purple
  "#EC4899", // pink
];

export function AnnotationViewerCanvas({
  imageUrl,
  results,
  categoryColors = {},
  categoryNames = {},
}: AnnotationViewerCanvasProps) {
  const getColor = (catId?: string | null, idx = 0) => {
    if (catId && categoryColors[catId]) return categoryColors[catId];
    return DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
  };

  const getLabel = (catId?: string | null) => {
    if (!catId) return "Unlabeled";
    return categoryNames[catId] || catId;
  };

  return (
    <div className="relative w-full h-full min-h-[350px] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
      {imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imageUrl}
          alt="Asset Preview"
          className="max-h-[500px] w-auto object-contain select-none"
        />
      ) : (
        <div className="text-slate-600 text-sm">Preview không khả dụng</div>
      )}

      {/* SVG Overlay layer for bounding boxes and polygons */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {results.map((res, idx) => {
          const color = getColor(res.category_id, idx);
          const labelStr = getLabel(res.category_id);

          if (res.result_type === "bbox" && res.geometry) {
            const { x = 0, y = 0, width = 0, height = 0 } = res.geometry;

            // Handle percentage coordinates (0..100) vs normalized
            const posX = x <= 100 ? `${x}%` : `${x}px`;
            const posY = y <= 100 ? `${y}%` : `${y}px`;
            const w = width <= 100 ? `${width}%` : `${width}px`;
            const h = height <= 100 ? `${height}%` : `${height}px`;

            return (
              <g key={res.id || idx}>
                <rect
                  x={posX}
                  y={posY}
                  width={w}
                  height={h}
                  fill={color}
                  fillOpacity={0.2}
                  stroke={color}
                  strokeWidth={2}
                  rx={2}
                />
                <foreignObject x={posX} y={posY} width="120" height="24">
                  <div
                    style={{ backgroundColor: color }}
                    className="inline-block px-1.5 py-0.5 text-[10px] font-bold text-white rounded-br shadow truncate"
                  >
                    {labelStr}
                  </div>
                </foreignObject>
              </g>
            );
          }

          if (res.result_type === "polygon" && res.geometry?.points) {
            const pointsStr = res.geometry.points
              .map(([px, py]) => `${px}% ${py}%`)
              .join(", ");

            return (
              <g key={res.id || idx}>
                <polygon
                  points={pointsStr}
                  fill={color}
                  fillOpacity={0.25}
                  stroke={color}
                  strokeWidth={2}
                />
              </g>
            );
          }

          return null;
        })}
      </svg>
    </div>
  );
}
