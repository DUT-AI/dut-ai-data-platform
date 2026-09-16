"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Konva from "konva";
import { BaseEditorComponentProps } from "../../../registry/editor-registry";
import { useImageTransform } from "../../../hooks/use-image-transform";
import { ImageStage, EditorToolbar, EditorFooter } from "../shared";
import { PolygonShape } from "./polygon-shape";
import { AnnotationResult } from "../../../types";
import { DEFAULT_COLORS } from "../../canvas/types";
import { Group, Line, Circle } from "react-konva";
import { Hexagon, Check } from "lucide-react";

export function PolygonSegmentationEditor({
  assetUrl,
  results,
  categoryColors = {},
  categoryNames = {},
  selectedCategoryId,
  availableCategories = [],
  readOnly = false,
  selectedShapeId: externalSelectedShapeId,
  onSelectShapeId,
  onSelectCategory,
  onChange,
}: BaseEditorComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const prevToolRef = useRef<string>("select");

  const [currentTool, setCurrentTool] = useState<string>("select");
  const [internalSelectedShapeId, setInternalSelectedShapeId] = useState<string | null>(null);

  const selectedShapeId =
    externalSelectedShapeId !== undefined
      ? externalSelectedShapeId
      : internalSelectedShapeId;

  const setSelectedShapeId = useCallback(
    (id: string | null) => {
      setInternalSelectedShapeId(id);
      onSelectShapeId?.(id);
    },
    [onSelectShapeId]
  );

  const {
    dimensions,
    naturalDimensions,
    imageObj,
    imageLayout,
    stageScale,
    stagePos,
    handleWheel,
    zoomIn,
    zoomOut,
    resetZoom,
    screenToNormalized,
    pointNormToScreen,
  } = useImageTransform({
    imageUrl: assetUrl,
    containerRef,
  });

  // Active in-progress drawing points
  const [polygonPoints, setPolygonPoints] = useState<Array<[number, number]>>([]);
  const [currentMousePos, setCurrentMousePos] = useState<{ x: number; y: number } | null>(null);

  const getColor = useCallback(
    (catId?: string | null, idx = 0) => {
      if (catId && categoryColors[catId]) return categoryColors[catId];
      return DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    },
    [categoryColors]
  );

  // Finish polygon drawing
  const finishPolygon = useCallback(() => {
    if (polygonPoints.length >= 3) {
      const normPoints = polygonPoints.map(([px, py]) => {
        const norm = screenToNormalized(px, py);
        return [norm.x, norm.y];
      });

      const uniqueId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID().slice(0, 8)
          : Math.random().toString(36).substring(2, 8);
      const newShapeId = `poly_${uniqueId}`;

      const newResult: AnnotationResult = {
        id: newShapeId,
        result_type: "polygon",
        category_id: selectedCategoryId || null,
        geometry: {
          points: normPoints,
        },
        created_at: new Date().toISOString(),
      };

      const updated = [...results, newResult];
      onChange?.(updated);
      setSelectedShapeId(newShapeId);
    }
    setPolygonPoints([]);
    setCurrentMousePos(null);
    setCurrentTool("select");
  }, [polygonPoints, screenToNormalized, selectedCategoryId, results, onChange, setSelectedShapeId]);

  // Keyboard shortcuts (P: polygon, V: select, Enter: finish, Esc: cancel, Delete: delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === "p" || e.key === "P") {
        setCurrentTool("polygon");
        setSelectedShapeId(null);
      } else if (e.key === "v" || e.key === "V") {
        setCurrentTool("select");
      } else if (e.key === "Enter") {
        if (currentTool === "polygon" && polygonPoints.length >= 3) {
          finishPolygon();
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedShapeId && !readOnly) {
          const updated = results.filter((r) => r.id !== selectedShapeId);
          onChange?.(updated);
          setSelectedShapeId(null);
        }
      } else if (e.key === "Escape") {
        setPolygonPoints([]);
        setCurrentMousePos(null);
        setSelectedShapeId(null);
        setCurrentTool("select");
      } else if (e.code === "Space" && !e.repeat) {
        prevToolRef.current = currentTool;
        setCurrentTool("pan");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setCurrentTool(prevToolRef.current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    currentTool,
    polygonPoints,
    finishPolygon,
    selectedShapeId,
    readOnly,
    results,
    onChange,
    setSelectedShapeId,
  ]);

  // Stage Mouse Down
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === stageRef.current || e.target.name() === "main-image") {
      if (currentTool === "select") {
        setSelectedShapeId(null);
      }
    }

    const stage = stageRef.current;
    const pointer = stage?.getRelativePointerPosition();
    if (!pointer) return;

    if (currentTool === "polygon" && !readOnly) {
      // Snapping to first point to close polygon
      if (polygonPoints.length >= 3) {
        const [firstX, firstY] = polygonPoints[0];
        const dist = Math.hypot(pointer.x - firstX, pointer.y - firstY);
        if (dist < 15 / stageScale) {
          finishPolygon();
          return;
        }
      }
      setPolygonPoints((prev) => [...prev, [pointer.x, pointer.y]]);
    }
  };

  // Stage Mouse Move
  const handleMouseMove = () => {
    const stage = stageRef.current;
    const pointer = stage?.getRelativePointerPosition();
    if (!pointer) return;

    setCurrentMousePos({ x: pointer.x, y: pointer.y });
  };

  // Vertex Drag End (Editing an existing polygon vertex)
  const handleVertexDragEnd = (
    id: string,
    vertexIndex: number,
    screenX: number,
    screenY: number
  ) => {
    if (readOnly) return;
    const norm = screenToNormalized(screenX, screenY);

    const updated = results.map((r) => {
      if (r.id === id && r.geometry?.points) {
        const pts = [...(r.geometry.points as number[][])];
        pts[vertexIndex] = [norm.x, norm.y];
        return {
          ...r,
          geometry: {
            ...r.geometry,
            points: pts,
          },
        };
      }
      return r;
    });

    onChange?.(updated);
  };

  // Delete selected
  const handleDeleteSelected = () => {
    if (!selectedShapeId || readOnly) return;
    const updated = results.filter((r) => r.id !== selectedShapeId);
    onChange?.(updated);
    setSelectedShapeId(null);
  };

  const polygonResults = results.filter(
    (r) => r.result_type === "polygon" || r.result_type === "segmentation"
  );

  return (
    <div className="relative flex h-full min-h-[420px] w-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      {/* Floating Toolbar */}
      <EditorToolbar
        currentTool={currentTool}
        onSelectTool={(tool) => {
          setCurrentTool(tool);
          setPolygonPoints([]);
        }}
        stageScale={stageScale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        selectedShapeId={selectedShapeId}
        readOnly={readOnly}
        onDeleteSelected={handleDeleteSelected}
      >
        <button
          type="button"
          onClick={() => {
            setCurrentTool("polygon");
            setSelectedShapeId(null);
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors ${
            currentTool === "polygon"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
          title="Vẽ Đa Giác - Polygon (P)"
        >
          <Hexagon className="size-4" />
        </button>

        {currentTool === "polygon" && polygonPoints.length >= 3 && (
          <button
            type="button"
            onClick={finishPolygon}
            className="flex h-8 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
            title="Khép góc đa giác (Enter)"
          >
            <Check className="size-3.5" />
            <span>Xong</span>
          </button>
        )}
      </EditorToolbar>

      {/* Stage Viewport */}
      <div ref={containerRef} className="relative h-full w-full flex-1">
        <ImageStage
          ref={stageRef}
          dimensions={dimensions}
          stageScale={stageScale}
          stagePos={stagePos}
          imageObj={imageObj}
          imageLayout={imageLayout}
          draggable={currentTool === "pan"}
          cursorClass={
            currentTool === "pan"
              ? "cursor-grab active:cursor-grabbing"
              : currentTool === "polygon"
                ? "cursor-crosshair"
                : "cursor-default"
          }
          onWheel={(e) => handleWheel(e, stageRef.current)}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          {/* Render Existing Polygons */}
          {polygonResults.map((res, idx) => {
            const color = getColor(res.category_id, idx);
            const isSelected = res.id === selectedShapeId;
            const labelName = res.category_id
              ? categoryNames[res.category_id] || "Label"
              : "Unlabeled";

            return (
              <PolygonShape
                key={res.id || idx}
                result={res}
                index={idx}
                isSelected={isSelected}
                color={color}
                labelName={labelName}
                stageScale={stageScale}
                readOnly={readOnly}
                currentTool={currentTool}
                pointNormToScreen={pointNormToScreen}
                onSelect={(id) => setSelectedShapeId(id)}
                onVertexDragEnd={handleVertexDragEnd}
              />
            );
          })}

          {/* In-progress drawing Polygon lines & vertices with rubber-band */}
          {polygonPoints.length > 0 && (
            <Group>
              <Line
                points={[
                  ...polygonPoints.flat(),
                  ...(currentMousePos ? [currentMousePos.x, currentMousePos.y] : []),
                ]}
                stroke={getColor(selectedCategoryId)}
                strokeWidth={2 / stageScale}
                dash={[4 / stageScale, 4 / stageScale]}
              />
              {polygonPoints.map(([px, py], pIdx) => (
                <Circle
                  key={pIdx}
                  x={px}
                  y={py}
                  radius={pIdx === 0 ? 6 / stageScale : 4 / stageScale}
                  fill={pIdx === 0 ? "#10B981" : getColor(selectedCategoryId)}
                  stroke="#FFFFFF"
                  strokeWidth={1.5 / stageScale}
                />
              ))}
            </Group>
          )}
        </ImageStage>
      </div>

      {/* Footer */}
      <EditorFooter
        currentTool={currentTool}
        resultsCount={polygonResults.length}
        stageScale={stageScale}
        naturalDimensions={naturalDimensions}
        cursorNormPos={
          currentMousePos
            ? screenToNormalized(currentMousePos.x, currentMousePos.y)
            : null
        }
      />
    </div>
  );
}
