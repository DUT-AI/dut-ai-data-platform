"use client";

import React from "react";
import Konva from "konva";
import { AnnotationResult } from "../../types";

import { Group, Rect, Line, Circle, Text } from "react-konva";


interface ShapeRendererProps {
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
  pointNormToScreen: (normX: number, normY: number) => { x: number; y: number };
  onSelect: (id: string) => void;
  onDragEnd: (id: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (id: string, e: Konva.KonvaEventObject<Event>) => void;
}

export function ShapeRenderer({
  result,
  index,
  isSelected,
  color,
  labelName,
  stageScale,
  readOnly = false,
  currentTool,
  normalizedToScreen,
  pointNormToScreen,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: ShapeRendererProps) {
  const shapeId = result.id || `shape_${index}`;

  // 1. Render Bounding Box (handles "bbox" and "bounding_box")
  if (
    (result.result_type === "bbox" || result.result_type === "bounding_box") &&
    result.geometry
  ) {
    const { x = 0, y = 0, width = 0, height = 0 } = result.geometry;
    const coords = normalizedToScreen(x, y, width, height);
    const confidenceText =
      result.confidence !== undefined && result.confidence !== null
        ? ` ${(result.confidence * (result.confidence <= 1 ? 100 : 1)).toFixed(0)}%`
        : "";
    const displayText = `${labelName}${confidenceText}`;
    const badgeWidth = Math.max(50, displayText.length * 7.5 + 8) / stageScale;
    const badgeHeight = 18 / stageScale;
    
    // Position badge above bbox, or inside if too close to top edge
    const badgeY = coords.y >= badgeHeight + 2 / stageScale
      ? coords.y - badgeHeight
      : coords.y;

    return (
      <Group key={shapeId}>
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
          dash={result.confidence !== undefined ? [6 / stageScale, 3 / stageScale] : undefined}
          draggable={currentTool === "select" && !readOnly}
          onClick={() => {
            if (currentTool === "select") onSelect(shapeId);
          }}
          onMouseEnter={(e) => {
            if (currentTool === "select") {
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
        {/* Category & Confidence Badge */}
        <Rect
          x={coords.x}
          y={badgeY}
          width={badgeWidth}
          height={badgeHeight}
          fill={color}
          cornerRadius={[2 / stageScale, 2 / stageScale, 0, 0]}
        />
        <Text
          x={coords.x + 4 / stageScale}
          y={badgeY + 3.5 / stageScale}
          text={displayText}
          fontSize={11 / stageScale}
          fill="#FFFFFF"
          fontStyle="bold"
        />
      </Group>
    );
  }

  // 2. Render Polygon (handles "polygon" and "segmentation")
  if (
    (result.result_type === "polygon" || result.result_type === "segmentation") &&
    result.geometry?.points &&
    Array.isArray(result.geometry.points) &&
    result.geometry.points.length > 0
  ) {
    const pointsList = result.geometry.points as number[][];
    const screenPoints: number[] = [];
    pointsList.forEach(([px, py]) => {
      const screenP = pointNormToScreen(px, py);
      screenPoints.push(screenP.x, screenP.y);
    });

    const firstP = pointNormToScreen(pointsList[0][0], pointsList[0][1]);

    return (
      <Group key={shapeId}>
        <Line
          id={`shape-${shapeId}`}
          points={screenPoints}
          closed={true}
          stroke={color}
          strokeWidth={isSelected ? 3 / stageScale : 2 / stageScale}
          fill={color}
          opacity={isSelected ? 0.35 : 0.18}
          onClick={() => {
            if (currentTool === "select") onSelect(shapeId);
          }}
        />
        <Rect
          x={firstP.x}
          y={firstP.y - 18 / stageScale}
          width={Math.max(45, labelName.length * 7) / stageScale}
          height={16 / stageScale}
          fill={color}
          cornerRadius={2 / stageScale}
        />
        <Text
          x={firstP.x + 3 / stageScale}
          y={firstP.y - 15 / stageScale}
          text={labelName}
          fontSize={11 / stageScale}
          fill="#FFFFFF"
          fontStyle="bold"
        />
      </Group>
    );
  }

  // 3. Render Keypoint (handles "keypoint" and "point")
  if (
    (result.result_type === "keypoint" || result.result_type === "point") &&
    result.geometry
  ) {
    const { x = 0, y = 0 } = result.geometry;
    const screenP = pointNormToScreen(x, y);

    return (
      <Group key={shapeId}>
        <Circle
          id={`shape-${shapeId}`}
          x={screenP.x}
          y={screenP.y}
          radius={6 / stageScale}
          fill={color}
          stroke="#FFFFFF"
          strokeWidth={2 / stageScale}
          onClick={() => {
            if (currentTool === "select") onSelect(shapeId);
          }}
        />
        <Text
          x={screenP.x + 8 / stageScale}
          y={screenP.y - 6 / stageScale}
          text={labelName}
          fontSize={10 / stageScale}
          fill={color}
          fontStyle="bold"
        />
      </Group>
    );
  }

  return null;
}
