"use client";

import React from "react";
import Konva from "konva";
import { AnnotationResult } from "../../../types";
import { Group, Rect, Text } from "react-konva";

export interface BoundingBoxShapeProps {
  result: AnnotationResult;
  index: number;
  isSelected: boolean;
  color: string;
  labelName: string;
  stageScale: number;
  readOnly?: boolean;
  currentTool: string;
  normalizedToScreen: (
    normX: number,
    normY: number,
    normW: number,
    normH: number
  ) => { x: number; y: number; width: number; height: number };
  onSelect: (id: string) => void;
  onDragEnd: (id: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (id: string, e: Konva.KonvaEventObject<Event>) => void;
}

export function BoundingBoxShape({
  result,
  index,
  isSelected,
  color,
  labelName,
  stageScale,
  readOnly = false,
  currentTool,
  normalizedToScreen,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: BoundingBoxShapeProps) {
  const shapeId = result.id || `box_${index}`;
  const geometry = result.geometry;
  if (!geometry) return null;

  const { x = 0, y = 0, width = 0, height = 0 } = geometry;
  const coords = normalizedToScreen(x, y, width, height);

  const confidenceText =
    result.confidence !== undefined && result.confidence !== null
      ? ` ${(result.confidence * (result.confidence <= 1 ? 100 : 1)).toFixed(0)}%`
      : "";
  const displayText = `${labelName}${confidenceText}`;
  const badgeWidth = Math.max(45, displayText.length * 7 + 8) / stageScale;
  const badgeHeight = 16 / stageScale;

  // Position label badge above bbox, or inside if too close to top edge
  const badgeY =
    coords.y >= badgeHeight + 2 / stageScale
      ? coords.y - badgeHeight
      : coords.y;

  return (
    <Group key={shapeId}>
      {/* Interactive / Draggable Rectangle */}
      <Rect
        id={`shape-${shapeId}`}
        x={coords.x}
        y={coords.y}
        width={coords.width}
        height={coords.height}
        stroke={color}
        strokeWidth={isSelected ? 3 / stageScale : 2 / stageScale}
        fill={color}
        opacity={isSelected ? 0.35 : 0.15}
        draggable={currentTool === "select" && !readOnly}
        onClick={() => {
          if (currentTool === "select") onSelect(shapeId);
        }}
        onTap={() => {
          if (currentTool === "select") onSelect(shapeId);
        }}
        onMouseEnter={(e) => {
          if (currentTool === "select" && !readOnly) {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = "pointer";
          }
        }}
        onMouseLeave={(e) => {
          if (currentTool === "select") {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = "default";
          }
        }}
        onDragEnd={(e) => onDragEnd(shapeId, e)}
        onTransformEnd={(e) => onTransformEnd(shapeId, e)}
      />

      {/* Label Badge Container */}
      <Rect
        x={coords.x}
        y={badgeY}
        width={badgeWidth}
        height={badgeHeight}
        fill={color}
        cornerRadius={[2 / stageScale, 2 / stageScale, 0, 0]}
        listening={false}
      />

      {/* Label Badge Text */}
      <Text
        x={coords.x + 4 / stageScale}
        y={badgeY + 3 / stageScale}
        text={displayText}
        fontSize={10 / stageScale}
        fill="#FFFFFF"
        fontStyle="bold"
        listening={false}
      />
    </Group>
  );
}
