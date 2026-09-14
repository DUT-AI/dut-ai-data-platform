"use client";

import React from "react";
import dynamic from "next/dynamic";
import Konva from "konva";
import { AnnotationResult } from "../../types";

const Group = dynamic(() => import("react-konva").then((mod) => mod.Group), {
  ssr: false,
});
const Rect = dynamic(() => import("react-konva").then((mod) => mod.Rect), {
  ssr: false,
});
const Line = dynamic(() => import("react-konva").then((mod) => mod.Line), {
  ssr: false,
});
const Circle = dynamic(() => import("react-konva").then((mod) => mod.Circle), {
  ssr: false,
});
const Text = dynamic(() => import("react-konva").then((mod) => mod.Text), {
  ssr: false,
});

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

  // 1. Render Bounding Box
  if (result.result_type === "bbox" && result.geometry) {
    const { x = 0, y = 0, width = 0, height = 0 } = result.geometry;
    const coords = normalizedToScreen(x, y, width, height);

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
          opacity={isSelected ? 0.35 : 0.18}
          draggable={currentTool === "select" && !readOnly}
          onClick={() => {
            if (currentTool === "select") onSelect(shapeId);
          }}
          onDragEnd={(e) => onDragEnd(shapeId, e)}
          onTransformEnd={(e) => onTransformEnd(shapeId, e)}
        />
        <Rect
          x={coords.x}
          y={coords.y - 18 / stageScale}
          width={Math.max(45, labelName.length * 7) / stageScale}
          height={16 / stageScale}
          fill={color}
          cornerRadius={2 / stageScale}
        />
        <Text
          x={coords.x + 3 / stageScale}
          y={coords.y - 15 / stageScale}
          text={labelName}
          fontSize={11 / stageScale}
          fill="#FFFFFF"
          fontStyle="bold"
        />
      </Group>
    );
  }

  // 2. Render Polygon
  if (result.result_type === "polygon" && result.geometry?.points) {
    const screenPoints: number[] = [];
    (result.geometry.points as number[][]).forEach(([px, py]) => {
      const screenP = pointNormToScreen(px, py);
      screenPoints.push(screenP.x, screenP.y);
    });

    const firstP = pointNormToScreen(
      (result.geometry.points as number[][])[0][0],
      (result.geometry.points as number[][])[0][1]
    );

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

  // 3. Render Keypoint
  if (result.result_type === "keypoint" && result.geometry) {
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
