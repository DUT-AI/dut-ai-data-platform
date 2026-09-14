"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Konva from "konva";
import { AnnotationResult } from "../types";
import {
  ToolMode,
  KonvaAnnotationCanvasProps,
  DEFAULT_COLORS,
  useCanvasViewport,
  CanvasToolbar,
  CanvasFooter,
  ShapeRenderer,
} from "./canvas";

import {
  Stage,
  Layer,
  Image as KonvaImage,
  Rect,
  Line,
  Circle,
  Transformer,
  Group,
  Text as KonvaText,
} from "react-konva";


export function KonvaAnnotationCanvas({
  imageUrl,
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
}: KonvaAnnotationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const prevToolRef = useRef<ToolMode>("select");

  // Viewport, Zoom, Pan and Image layout hook
  const {
    dimensions,
    naturalDimensions,
    stageScale,
    stagePos,
    imageObj,
    imageLayout,
    handleWheel,
    zoomIn,
    zoomOut,
    resetZoom,
    screenToNormalized,
    normalizedToScreen,
    pointNormToScreen,
  } = useCanvasViewport({ imageUrl, containerRef });

  // Tool and selection state
  const [currentTool, setCurrentTool] = useState<ToolMode>("select");
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

  // Drawing states
  const [newRect, setNewRect] = useState<{
    startX: number;
    startY: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const [polygonPoints, setPolygonPoints] = useState<number[][]>([]);
  const [currentMousePos, setCurrentMousePos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Transformer node sync with selected shape
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    if (selectedShapeId && currentTool === "select" && !readOnly) {
      const stage = stageRef.current;
      const selectedNode = stage.findOne(`#shape-${selectedShapeId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer()?.batchDraw();
        return;
      }
    }
    transformerRef.current.nodes([]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedShapeId, currentTool, readOnly, results]);

  const getColor = useCallback(
    (catId?: string | null, idx = 0) => {
      if (catId && categoryColors[catId]) return categoryColors[catId];
      return DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    },
    [categoryColors]
  );

  // Keyboard shortcuts engine
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is typing in inputs or textareas
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === "r" || e.key === "R") {
        setCurrentTool("bbox");
        setPolygonPoints([]);
      } else if (e.key === "v" || e.key === "V") {
        setCurrentTool("select");
      } else if (e.key === "h" || e.key === "H") {
        setCurrentTool("pan");
      } else if (e.key === "p" || e.key === "P") {
        setCurrentTool("polygon");
      } else if (e.key === "k" || e.key === "K") {
        setCurrentTool("point");
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedShapeId && !readOnly) {
          const updated = results.filter((r) => r.id !== selectedShapeId);
          onChange?.(updated);
          setSelectedShapeId(null);
        }
      } else if (e.key === "Escape") {
        setNewRect(null);
        setPolygonPoints([]);
        setSelectedShapeId(null);
        setCurrentTool("select");
      } else if (e.code === "Space" && !e.repeat) {
        prevToolRef.current = currentTool;
        setCurrentTool("pan");
      } else if (
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        /^[1-9]$/.test(e.key) &&
        availableCategories.length > 0
      ) {
        const catIdx = parseInt(e.key, 10) - 1;
        if (catIdx < availableCategories.length) {
          const targetCat = availableCategories[catIdx];
          onSelectCategory?.(targetCat.id);

          // If a shape is currently selected, reassign its category immediately
          if (selectedShapeId && !readOnly) {
            const updated = results.map((r) => {
              if (r.id === selectedShapeId) {
                return { ...r, category_id: targetCat.id };
              }
              return r;
            });
            onChange?.(updated);
          }
        }
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
    selectedShapeId,
    readOnly,
    results,
    availableCategories,
    onSelectCategory,
    setSelectedShapeId,
    onChange,
  ]);

  // Finish polygon drawing
  const finishPolygon = useCallback(() => {
    if (polygonPoints.length >= 3) {
      const normPoints = polygonPoints.map(([px, py]) => {
        const norm = screenToNormalized(px, py);
        return [norm.x, norm.y];
      });

      const newShapeId = `poly_${Date.now()}`;
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
  }, [
    polygonPoints,
    screenToNormalized,
    selectedCategoryId,
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

    if (currentTool === "bbox" && !readOnly) {
      setNewRect({
        startX: pointer.x,
        startY: pointer.y,
        x: pointer.x,
        y: pointer.y,
        width: 0,
        height: 0,
      });
      return;
    }

    if (currentTool === "polygon" && !readOnly) {
      if (polygonPoints.length >= 3) {
        const [firstX, firstY] = polygonPoints[0];
        const dist = Math.hypot(pointer.x - firstX, pointer.y - firstY);
        if (dist < 15 / stageScale) {
          finishPolygon();
          return;
        }
      }
      setPolygonPoints((prev) => [...prev, [pointer.x, pointer.y]]);
      return;
    }

    if (currentTool === "point" && !readOnly) {
      const norm = screenToNormalized(pointer.x, pointer.y);
      const uniqueId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID().slice(0, 8)
          : Math.random().toString(36).substring(2, 8);
      const newShapeId = `point_${uniqueId}`;
      const newResult: AnnotationResult = {
        id: newShapeId,
        result_type: "keypoint",
        category_id: selectedCategoryId || null,
        geometry: {
          x: norm.x,
          y: norm.y,
        },
        created_at: new Date().toISOString(),
      };
      const updated = [...results, newResult];
      onChange?.(updated);
      setSelectedShapeId(newShapeId);
      setCurrentTool("select");
      return;
    }
  };

  // Stage Mouse Move
  const handleMouseMove = () => {
    const stage = stageRef.current;
    const pointer = stage?.getRelativePointerPosition();
    if (!pointer) return;

    setCurrentMousePos({ x: pointer.x, y: pointer.y });

    if (currentTool === "bbox" && newRect && !readOnly) {
      const currentX = pointer.x;
      const currentY = pointer.y;

      const x = Math.min(newRect.startX, currentX);
      const y = Math.min(newRect.startY, currentY);
      const width = Math.abs(currentX - newRect.startX);
      const height = Math.abs(currentY - newRect.startY);

      setNewRect({
        ...newRect,
        x,
        y,
        width,
        height,
      });
    }
  };

  // Stage Mouse Up
  const handleMouseUp = () => {
    if (currentTool === "bbox" && newRect && !readOnly) {
      if (newRect.width > 5 && newRect.height > 5) {
        const p1 = screenToNormalized(newRect.x, newRect.y);
        const p2 = screenToNormalized(
          newRect.x + newRect.width,
          newRect.y + newRect.height
        );

        const normW = Math.abs(p2.x - p1.x);
        const normH = Math.abs(p2.y - p1.y);

        const uniqueId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID().slice(0, 8)
            : Math.random().toString(36).substring(2, 8);
        const newShapeId = `box_${uniqueId}`;
        const newResult: AnnotationResult = {
          id: newShapeId,
          result_type: "bbox",
          category_id: selectedCategoryId || null,
          geometry: {
            x: Math.min(p1.x, p2.x),
            y: Math.min(p1.y, p2.y),
            width: normW,
            height: normH,
          },
          created_at: new Date().toISOString(),
        };

        const updated = [...results, newResult];
        onChange?.(updated);
        setSelectedShapeId(newShapeId);
        setCurrentTool("select");
      }
      setNewRect(null);
    }
  };

  // Shape drag end
  const handleDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    if (readOnly) return;
    const node = e.target as Konva.Node;
    const normPos = screenToNormalized(node.x(), node.y());

    const updated = results.map((r) => {
      if (r.id === id && r.geometry) {
        return {
          ...r,
          geometry: {
            ...r.geometry,
            x: Math.max(0, Math.min(100 - (r.geometry.width || 0), normPos.x)),
            y: Math.max(0, Math.min(100 - (r.geometry.height || 0), normPos.y)),
          },
        };
      }
      return r;
    });

    onChange?.(updated);
  };

  // Shape transform end
  const handleTransformEnd = (id: string, e: Konva.KonvaEventObject<Event>) => {
    if (readOnly) return;
    const node = e.target as Konva.Node;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    const newScreenX = node.x();
    const newScreenY = node.y();
    const newScreenW = Math.max(5, node.width() * scaleX);
    const newScreenH = Math.max(5, node.height() * scaleY);

    const p1 = screenToNormalized(newScreenX, newScreenY);
    const p2 = screenToNormalized(
      newScreenX + newScreenW,
      newScreenY + newScreenH
    );

    const updated = results.map((r) => {
      if (r.id === id && r.geometry) {
        return {
          ...r,
          geometry: {
            ...r.geometry,
            x: p1.x,
            y: p1.y,
            width: Math.abs(p2.x - p1.x),
            height: Math.abs(p2.y - p1.y),
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

  return (
    <div className="relative flex h-full min-h-[420px] w-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      {/* Top Floating Action Toolbar */}
      <CanvasToolbar
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
        polygonPointsCount={polygonPoints.length}
        onFinishPolygon={finishPolygon}
      />

      {/* Canvas Viewport */}
      <div ref={containerRef} className="relative h-full w-full flex-1">
        {imageObj ? (
          <Stage
            ref={stageRef}
            width={dimensions.width}
            height={dimensions.height}
            scaleX={stageScale}
            scaleY={stageScale}
            x={stagePos.x}
            y={stagePos.y}
            draggable={currentTool === "pan"}
            onWheel={(e) => handleWheel(e, stageRef.current)}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className={`h-full w-full ${
              currentTool === "pan"
                ? "cursor-grab active:cursor-grabbing"
                : currentTool === "bbox" ||
                    currentTool === "polygon" ||
                    currentTool === "point"
                  ? "cursor-crosshair"
                  : "cursor-default"
            }`}
          >
            <Layer>
              {/* Background Main Image */}
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <KonvaImage
                name="main-image"
                image={imageObj}
                x={imageLayout.x}
                y={imageLayout.y}
                width={imageLayout.width}
                height={imageLayout.height}
              />

              {/* Render Existing Annotations (BBox, Polygon, Keypoint) */}
              {results.map((res, idx) => {
                const color = getColor(res.category_id, idx);
                const isSelected = res.id === selectedShapeId;
                const labelName = res.category_id
                  ? categoryNames[res.category_id] || "Label"
                  : "Unlabeled";

                return (
                  <ShapeRenderer
                    key={res.id || idx}
                    result={res}
                    index={idx}
                    isSelected={isSelected}
                    color={color}
                    labelName={labelName}
                    stageScale={stageScale}
                    readOnly={readOnly}
                    currentTool={currentTool}
                    normalizedToScreen={normalizedToScreen}
                    pointNormToScreen={pointNormToScreen}
                    onSelect={(id) => setSelectedShapeId(id)}
                    onDragEnd={handleDragEnd}
                    onTransformEnd={handleTransformEnd}
                  />
                );
              })}

              {/* Crosshair Guides for Pixel Precision in BBox mode */}
              {currentTool === "bbox" && currentMousePos && !readOnly && imageObj && (
                <Group opacity={0.4} listening={false}>
                  {/* Horizontal crosshair */}
                  <Line
                    points={[
                      imageLayout.x,
                      currentMousePos.y,
                      imageLayout.x + imageLayout.width,
                      currentMousePos.y,
                    ]}
                    stroke="#38BDF8"
                    strokeWidth={1 / stageScale}
                    dash={[4 / stageScale, 4 / stageScale]}
                  />
                  {/* Vertical crosshair */}
                  <Line
                    points={[
                      currentMousePos.x,
                      imageLayout.y,
                      currentMousePos.x,
                      imageLayout.y + imageLayout.height,
                    ]}
                    stroke="#38BDF8"
                    strokeWidth={1 / stageScale}
                    dash={[4 / stageScale, 4 / stageScale]}
                  />
                </Group>
              )}

              {/* In-progress drawing rectangle with live Dimension HUD */}
              {newRect && (
                <Group>
                  <Rect
                    x={newRect.x}
                    y={newRect.y}
                    width={newRect.width}
                    height={newRect.height}
                    stroke={getColor(selectedCategoryId)}
                    strokeWidth={2 / stageScale}
                    dash={[4 / stageScale, 4 / stageScale]}
                    fill={getColor(selectedCategoryId)}
                    opacity={0.25}
                  />
                  {newRect.width > 5 && newRect.height > 5 && naturalDimensions.width > 0 && (
                    <Group
                      x={newRect.x + newRect.width + 4 / stageScale}
                      y={newRect.y + newRect.height + 4 / stageScale}
                    >
                      <Rect
                        width={90 / stageScale}
                        height={18 / stageScale}
                        fill="#0F172A"
                        opacity={0.9}
                        cornerRadius={2 / stageScale}
                      />
                      <KonvaText
                        x={4 / stageScale}
                        y={4 / stageScale}
                        text={`${Math.round((newRect.width / imageLayout.width) * naturalDimensions.width)} × ${Math.round((newRect.height / imageLayout.height) * naturalDimensions.height)} px`}
                        fontSize={10 / stageScale}
                        fill="#38BDF8"
                        fontFamily="monospace"
                      />
                    </Group>
                  )}
                </Group>
              )}

              {/* In-progress drawing Polygon lines and vertices */}
              {polygonPoints.length > 0 && (
                <Group>
                  <Line
                    points={[
                      ...polygonPoints.flat(),
                      ...(currentMousePos
                        ? [currentMousePos.x, currentMousePos.y]
                        : []),
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
                      fill={
                        pIdx === 0 ? "#10B981" : getColor(selectedCategoryId)
                      }
                      stroke="#FFFFFF"
                      strokeWidth={1.5 / stageScale}
                    />
                  ))}
                </Group>
              )}

              {/* Konva Transformer Handle */}
              <Transformer
                ref={transformerRef}
                rotateEnabled={false}
                keepRatio={false}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 5 || newBox.height < 5) return oldBox;
                  return newBox;
                }}
                anchorSize={8 / stageScale}
                anchorCornerRadius={2 / stageScale}
                anchorStroke="#3B82F6"
                anchorFill="#FFFFFF"
                borderStroke="#3B82F6"
                borderStrokeWidth={1.5 / stageScale}
              />
            </Layer>
          </Stage>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
            {imageUrl ? "Đang tải ảnh..." : "Preview không khả dụng"}
          </div>
        )}
      </div>

      {/* Footer Info / Coordinate Indicator */}
      <CanvasFooter
        currentTool={currentTool}
        resultsCount={results.length}
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
