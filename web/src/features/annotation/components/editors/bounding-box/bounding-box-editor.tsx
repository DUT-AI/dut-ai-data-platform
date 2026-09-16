"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Konva from "konva";
import { BaseEditorComponentProps } from "../../../registry/editor-registry";
import { useImageTransform } from "../../../hooks/use-image-transform";
import { ImageStage, EditorToolbar, EditorFooter } from "../shared";
import { BoundingBoxShape } from "./bounding-box-shape";
import { AnnotationResult } from "../../../types";
import { DEFAULT_COLORS } from "../../canvas/types";
import { Rect, Transformer, Group, Line, Text as KonvaText } from "react-konva";
import { Square } from "lucide-react";

export function BoundingBoxEditor({
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
  const transformerRef = useRef<Konva.Transformer | null>(null);
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
    normalizedToScreen,
  } = useImageTransform({
    imageUrl: assetUrl,
    containerRef,
  });

  // In-progress drawing state
  const [newRect, setNewRect] = useState<{
    startX: number;
    startY: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const [currentMousePos, setCurrentMousePos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Sync Transformer node
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

  // Tool-specific hotkeys (V: select, B: bbox, Delete: delete, Esc: cancel, Space: pan)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === "b" || e.key === "B") {
        setCurrentTool("bbox");
        setSelectedShapeId(null);
      } else if (e.key === "v" || e.key === "V") {
        setCurrentTool("select");
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedShapeId && !readOnly) {
          const updated = results.filter((r) => r.id !== selectedShapeId);
          onChange?.(updated);
          setSelectedShapeId(null);
        }
      } else if (e.key === "Escape") {
        setNewRect(null);
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
  }, [currentTool, selectedShapeId, readOnly, results, onChange, setSelectedShapeId]);

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

  // Drag End (clamp inside image bounds)
  const handleDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    if (readOnly) return;
    const node = e.target as Konva.Node;
    const normPos = screenToNormalized(node.x(), node.y());

    const isPercent = normPos.x > 1.0 || normPos.y > 1.0;
    const maxBound = isPercent ? 100 : 1;

    const updated = results.map((r) => {
      if (r.id === id && r.geometry) {
        const w = r.geometry.width || 0;
        const h = r.geometry.height || 0;
        return {
          ...r,
          geometry: {
            ...r.geometry,
            x: Math.max(0, Math.min(maxBound - w, normPos.x)),
            y: Math.max(0, Math.min(maxBound - h, normPos.y)),
          },
        };
      }
      return r;
    });

    onChange?.(updated);
  };

  // Transform End
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
            x: Math.min(p1.x, p2.x),
            y: Math.min(p1.y, p2.y),
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

  // Filter only BBox results for rendering and count
  const bboxResults = results.filter(
    (r) => r.result_type === "bbox" || r.result_type === "bounding_box"
  );

  return (
    <div className="relative flex h-full min-h-[420px] w-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      {/* Floating Toolbar */}
      <EditorToolbar
        currentTool={currentTool}
        onSelectTool={(tool) => setCurrentTool(tool)}
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
            setCurrentTool("bbox");
            setSelectedShapeId(null);
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors ${
            currentTool === "bbox"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
          title="Vẽ Bounding Box (B)"
        >
          <Square className="size-4" />
        </button>
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
              : currentTool === "bbox"
                ? "cursor-crosshair"
                : "cursor-default"
          }
          onWheel={(e) => handleWheel(e, stageRef.current)}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Render Existing BBoxes */}
          {bboxResults.map((res, idx) => {
            const color = getColor(res.category_id, idx);
            const isSelected = res.id === selectedShapeId;
            const labelName = res.category_id
              ? categoryNames[res.category_id] || "Label"
              : "Unlabeled";

            return (
              <BoundingBoxShape
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
                onSelect={(id) => setSelectedShapeId(id)}
                onDragEnd={handleDragEnd}
                onTransformEnd={handleTransformEnd}
              />
            );
          })}

          {/* Crosshair guide lines when in BBox mode */}
          {currentTool === "bbox" && currentMousePos && !readOnly && imageObj && (
            <Group opacity={0.4} listening={false}>
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

          {/* In-progress drawing Rectangle */}
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
              {newRect.width > 5 &&
                newRect.height > 5 &&
                naturalDimensions.width > 0 && (
                  <Group
                    x={newRect.x + newRect.width + 4 / stageScale}
                    y={newRect.y + newRect.height + 4 / stageScale}
                  >
                    <Rect
                      width={85 / stageScale}
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

          {/* Konva Transformer */}
          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            keepRatio={false}
            boundBoxFunc={(oldBox: any, newBox: any) => {
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
        </ImageStage>
      </div>

      {/* Footer */}
      <EditorFooter
        currentTool={currentTool}
        resultsCount={bboxResults.length}
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
