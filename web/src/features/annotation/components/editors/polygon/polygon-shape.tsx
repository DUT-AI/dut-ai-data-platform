"use client";

import React from "react";
import Konva from "konva";
import { AnnotationResult } from "../../../types";
import { Group, Line, Circle, Rect, Text } from "react-konva";

export interface PolygonShapeProps {
  result: AnnotationResult;
  index: number;
  isSelected: boolean;
  color: string;
  labelName: string;
  stageScale: number;
  readOnly?: boolean;
  currentTool: string;
  pointNormToScreen: (normX: number, normY: number) => { x: number; y: number };
  onSelect: (id: string) => void;
  onVertexDragEnd?: (id: string, vertexIndex: number, screenX: number, screenY: number) => void;
}

export function PolygonShape({
  result,
  index,
  isSelected,
  color,
  labelName,
  stageScale,
  readOnly = false,
  currentTool,
  pointNormToScreen,
  onSelect,
  onVertexDragEnd,
}: PolygonShapeProps) {
  const shapeId = result.id || `poly_${index}`;
  const pointsList = result.geometry?.points as number[][] | undefined;
  if (!pointsList || !Array.isArray(pointsList) || pointsList.length < 3) {
    return null;
  }

  // Convert normalized vertices to screen pixels
  const screenPoints: number[] = [];
  const vertexCoords: Array<{ x: number; y: number }> = [];

  pointsList.forEach(([px, py]) => {
    const sp = pointNormToScreen(px, py);
    screenPoints.push(sp.x, sp.y);
    vertexCoords.push(sp);
  });

  const firstP = vertexCoords[0];

  return (
    <Group key={shapeId}>
      {/* Main Closed Polygon Line */}
      <Line
        id={`shape-${shapeId}`}
        points={screenPoints}
        closed={true}
        stroke={color}
        strokeWidth={isSelected ? 3 / stageScale : 2 / stageScale}
        fill={color}
        opacity={isSelected ? 0.35 : 0.2}
        onClick={() => {
          if (currentTool === "select") onSelect(shapeId);
        }}
        onTap={() => {
          if (currentTool === "select") onSelect(shapeId);
        }}
        onMouseEnter={(e: any) => {
          if (currentTool === "select" && !readOnly) {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = "pointer";
          }
        }}
        onMouseLeave={(e: any) => {
          if (currentTool === "select") {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = "default";
          }
        }}
      />

      {/* Label Badge */}
      <Rect
        x={firstP.x}
        y={firstP.y - 18 / stageScale}
        width={Math.max(45, labelName.length * 7 + 8) / stageScale}
        height={16 / stageScale}
        fill={color}
        cornerRadius={2 / stageScale}
        listening={false}
      />
      <Text
        x={firstP.x + 4 / stageScale}
        y={firstP.y - 15 / stageScale}
        text={labelName}
        fontSize={10 / stageScale}
        fill="#FFFFFF"
        fontStyle="bold"
        listening={false}
      />

      {/* Interactive Vertex Anchors when Selected */}
      {isSelected && !readOnly && currentTool === "select" && (
        <Group>
          {vertexCoords.map((pos, vIdx) => (
            <Circle
              key={`vertex-${vIdx}`}
              x={pos.x}
              y={pos.y}
              radius={5 / stageScale}
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={2 / stageScale}
              draggable={true}
              onMouseEnter={(e: any) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = "move";
              }}
              onMouseLeave={(e: any) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = "default";
              }}
              onDragEnd={(e: any) => {
                const node = e.target as any;
                onVertexDragEnd?.(shapeId, vIdx, node.x(), node.y());
              }}
            />
          ))}
        </Group>
      )}
    </Group>
  );
}
