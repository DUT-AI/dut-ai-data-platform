"use client";

import React, { forwardRef } from "react";
import Konva from "konva";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import { ImageLayout } from "../../../utils/coordinate-transformer";
import { Dimensions } from "../../../hooks/use-image-transform";

export interface ImageStageProps {
  dimensions: Dimensions;
  stageScale: number;
  stagePos: { x: number; y: number };
  imageObj: HTMLImageElement | null;
  imageLayout: ImageLayout;
  draggable?: boolean;
  cursorClass?: string;
  onWheel?: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  onMouseDown?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseMove?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseUp?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  children?: React.ReactNode;
}

export const ImageStage = forwardRef<Konva.Stage, ImageStageProps>(
  function ImageStage(
    {
      dimensions,
      stageScale,
      stagePos,
      imageObj,
      imageLayout,
      draggable = false,
      cursorClass = "cursor-default",
      onWheel,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      children,
    },
    ref
  ) {
    if (!imageObj) {
      return (
        <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
          Đang tải ảnh hoặc preview không khả dụng...
        </div>
      );
    }

    return (
      <Stage
        ref={ref}
        width={dimensions.width}
        height={dimensions.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={draggable}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        className={`h-full w-full select-none ${cursorClass}`}
      >
        <Layer>
          {/* Main background image with event listening disabled so shapes receive pointer events */}
          <KonvaImage
            name="main-image"
            image={imageObj}
            x={imageLayout.x}
            y={imageLayout.y}
            width={imageLayout.width}
            height={imageLayout.height}
            listening={false}
          />

          {/* Children layers: Shapes, Transformers, In-progress drawings */}
          {children}
        </Layer>
      </Stage>
    );
  }
);
