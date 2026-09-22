"use client";

import React, { useState, useRef, useEffect } from "react";
import Konva from "konva";
import { BaseEditorComponentProps } from "../../../registry/editor-registry";
import { useImageTransform } from "../../../hooks/use-image-transform";
import { ImageStage, EditorToolbar, EditorFooter } from "../shared";
import { BrushToolbar } from "./brush-toolbar";
import { AnnotationResult } from "../../../types";
import { DEFAULT_COLORS } from "../../canvas/types";
import { Image as KonvaImage, Circle, Group } from "react-konva";

export function BrushSegmentationEditor({
  assetUrl,
  results,
  categoryColors = {},
  categoryNames = {},
  selectedCategoryId,
  availableCategories = [],
  readOnly = false,
  selectedShapeId,
  onSelectShapeId,
  onSelectCategory,
  onChange,
}: BaseEditorComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const prevToolRef = useRef<string>("brush");

  // Mask settings
  const [currentTool, setCurrentTool] = useState<string>("brush");
  const [brushSize, setBrushSize] = useState<number>(20);
  const [maskOpacity, setMaskOpacity] = useState<number>(0.4);

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
  } = useImageTransform({
    imageUrl: assetUrl,
    containerRef,
  });

  // Offscreen Canvas for raster mask buffer
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [maskCanvas, setMaskCanvas] = useState<HTMLCanvasElement | null>(null);

  // Initialize and resize offscreen canvas to match natural image dimensions
  useEffect(() => {
    if (
      !imageObj ||
      naturalDimensions.width === 0 ||
      naturalDimensions.height === 0
    ) {
      return;
    }

    if (!offscreenCanvasRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = naturalDimensions.width;
      canvas.height = naturalDimensions.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      offscreenCanvasRef.current = canvas;
      offscreenCtxRef.current = ctx;
      setMaskCanvas(canvas);
    } else if (
      offscreenCanvasRef.current.width !== naturalDimensions.width ||
      offscreenCanvasRef.current.height !== naturalDimensions.height
    ) {
      const canvas = document.createElement("canvas");
      canvas.width = naturalDimensions.width;
      canvas.height = naturalDimensions.height;
      offscreenCanvasRef.current = canvas;
      offscreenCtxRef.current = canvas.getContext("2d", {
        willReadFrequently: true,
      });
      setMaskCanvas(canvas);
    }
  }, [imageObj, naturalDimensions]);

  // Drawing state
  const isPaintingRef = useRef(false);
  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const activeColor = selectedCategoryId
    ? categoryColors[selectedCategoryId] || DEFAULT_COLORS[0]
    : DEFAULT_COLORS[0];

  // Tool-specific hotkeys (B: brush, E: eraser, Space: pan)
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
        setCurrentTool("brush");
      } else if (e.key === "e" || e.key === "E") {
        setCurrentTool("eraser");
      } else if (e.key === "v" || e.key === "V") {
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
  }, [currentTool]);

  // Stage Mouse Down -> Start Painting / Erasing
  const handleMouseDown = () => {
    if (readOnly || currentTool === "pan" || currentTool === "select") return;
    const stage = stageRef.current;
    const pointer = stage?.getRelativePointerPosition();
    if (
      !stage ||
      !pointer ||
      !offscreenCanvasRef.current ||
      !offscreenCtxRef.current
    )
      return;

    // Check if inside image bounds
    if (
      pointer.x < imageLayout.x ||
      pointer.x > imageLayout.x + imageLayout.width ||
      pointer.y < imageLayout.y ||
      pointer.y > imageLayout.y + imageLayout.height
    ) {
      return;
    }

    isPaintingRef.current = true;

    // Convert stage pointer to offscreen canvas natural coordinates
    const scaleX = naturalDimensions.width / imageLayout.width;
    const scaleY = naturalDimensions.height / imageLayout.height;

    const naturalX = (pointer.x - imageLayout.x) * scaleX;
    const naturalY = (pointer.y - imageLayout.y) * scaleY;

    lastPointerPosRef.current = { x: naturalX, y: naturalY };

    // Paint initial dot
    const ctx = offscreenCtxRef.current;
    ctx.save();
    if (currentTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = activeColor;
    }

    const scaledBrushRadius = (brushSize / stageScale) * scaleX;
    ctx.beginPath();
    ctx.arc(
      naturalX,
      naturalY,
      Math.max(1, scaledBrushRadius / 2),
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    stage.batchDraw();
  };

  // Stage Mouse Move -> Continuous Stroke Painting
  const handleMouseMove = () => {
    const stage = stageRef.current;
    const pointer = stage?.getRelativePointerPosition();
    if (!stage || !pointer) return;

    setCurrentMousePos({ x: pointer.x, y: pointer.y });

    if (
      !isPaintingRef.current ||
      !offscreenCtxRef.current ||
      !lastPointerPosRef.current
    ) {
      return;
    }

    const scaleX = naturalDimensions.width / imageLayout.width;
    const scaleY = naturalDimensions.height / imageLayout.height;

    const naturalX = (pointer.x - imageLayout.x) * scaleX;
    const naturalY = (pointer.y - imageLayout.y) * scaleY;

    const ctx = offscreenCtxRef.current;
    ctx.save();
    if (currentTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = activeColor;
    }

    const scaledBrushWidth = (brushSize / stageScale) * scaleX;
    ctx.lineWidth = Math.max(1, scaledBrushWidth);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(lastPointerPosRef.current.x, lastPointerPosRef.current.y);
    ctx.lineTo(naturalX, naturalY);
    ctx.stroke();
    ctx.restore();

    lastPointerPosRef.current = { x: naturalX, y: naturalY };
    stage.batchDraw();
  };

  // Stage Mouse Up -> Commit stroke to results
  const handleMouseUp = () => {
    if (!isPaintingRef.current) return;
    isPaintingRef.current = false;
    lastPointerPosRef.current = null;

    // Emit candidate mask result to workspace results (CP5A local representation)
    const targetCatId = selectedCategoryId || "default";
    const maskId = `mask_${targetCatId}`;

    const existingIndex = results.findIndex((r) => r.id === maskId);
    const candidateResult: AnnotationResult = {
      id: maskId,
      result_type: "brush_mask",
      category_id: targetCatId,
      value: {
        format: "candidate_raster_prototype",
      },
      created_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      const updated = [...results];
      updated[existingIndex] = candidateResult;
      onChange?.(updated);
    } else {
      onChange?.([...results, candidateResult]);
    }
  };

  // Clear current mask
  const handleClearCurrentMask = () => {
    if (readOnly || !offscreenCtxRef.current || !offscreenCanvasRef.current)
      return;
    offscreenCtxRef.current.clearRect(
      0,
      0,
      offscreenCanvasRef.current.width,
      offscreenCanvasRef.current.height
    );
    stageRef.current?.batchDraw();

    const targetCatId = selectedCategoryId || "default";
    const maskId = `mask_${targetCatId}`;
    const updated = results.filter((r) => r.id !== maskId);
    onChange?.(updated);
  };

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
        readOnly={readOnly}
      >
        <BrushToolbar
          currentTool={currentTool}
          onSelectTool={(tool) => setCurrentTool(tool)}
          brushSize={brushSize}
          onChangeBrushSize={setBrushSize}
          maskOpacity={maskOpacity}
          onChangeMaskOpacity={setMaskOpacity}
          readOnly={readOnly}
          onClearCurrentMask={handleClearCurrentMask}
        />
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
              : currentTool === "brush" || currentTool === "eraser"
                ? "cursor-crosshair"
                : "cursor-default"
          }
          onWheel={(e) => handleWheel(e, stageRef.current)}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Raster Mask Canvas Layer rendered via KonvaImage */}
          {maskCanvas && (
            <KonvaImage
              name="raster-mask-canvas"
              image={maskCanvas}
              x={imageLayout.x}
              y={imageLayout.y}
              width={imageLayout.width}
              height={imageLayout.height}
              opacity={maskOpacity}
              listening={false}
            />
          )}

          {/* Brush Cursor Indicator Ring */}
          {(currentTool === "brush" || currentTool === "eraser") &&
            currentMousePos && (
              <Group listening={false}>
                <Circle
                  x={currentMousePos.x}
                  y={currentMousePos.y}
                  radius={brushSize / 2}
                  stroke={currentTool === "eraser" ? "#EF4444" : activeColor}
                  strokeWidth={1.5 / stageScale}
                  dash={[3 / stageScale, 3 / stageScale]}
                  fill={
                    currentTool === "eraser" ? "#EF444420" : `${activeColor}20`
                  }
                />
              </Group>
            )}
        </ImageStage>
      </div>

      {/* Footer */}
      <EditorFooter
        currentTool={currentTool}
        resultsCount={
          results.filter((r) => r.result_type === "brush_mask").length
        }
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
