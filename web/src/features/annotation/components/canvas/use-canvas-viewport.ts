"use client";

import React, { useState, useEffect, useCallback } from "react";
import Konva from "konva";
import { Dimensions, ImageLayout } from "./types";

interface UseCanvasViewportProps {
  imageUrl?: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useCanvasViewport({
  imageUrl,
  containerRef,
}: UseCanvasViewportProps) {
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 800,
    height: 500,
  });
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // Derive Image layout directly from dimensions and imageObj
  const imageLayout: ImageLayout = React.useMemo(() => {
    if (!imageObj || dimensions.width === 0 || dimensions.height === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    const imgWidth = imageObj.width;
    const imgHeight = imageObj.height;
    const canvasWidth = dimensions.width;
    const canvasHeight = dimensions.height;

    const scale = Math.min(
      (canvasWidth * 0.95) / imgWidth,
      (canvasHeight * 0.95) / imgHeight
    );
    const renderWidth = imgWidth * scale;
    const renderHeight = imgHeight * scale;

    const x = (canvasWidth - renderWidth) / 2;
    const y = (canvasHeight - renderHeight) / 2;

    return { x, y, width: renderWidth, height: renderHeight };
  }, [imageObj, dimensions]);

  // Load Image
  useEffect(() => {
    if (!imageUrl) {
      const timer = setTimeout(() => setImageObj(null), 0);
      return () => clearTimeout(timer);
    }
    let isMounted = true;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      if (isMounted) {
        setImageObj(img);
        setStagePos({ x: 0, y: 0 });
        setStageScale(1);
      }
    };
    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  // Handle Resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight || 500,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [containerRef]);

  // Zoom handlers
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>, stage: Konva.Stage | null) => {
      e.evt.preventDefault();
      if (!stage) return;

      const scaleBy = 1.1;
      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      newScale = Math.max(0.2, Math.min(newScale, 10));

      setStageScale(newScale);
      setStagePos({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    },
    []
  );

  const zoomIn = () => setStageScale((prev) => Math.min(prev * 1.2, 10));
  const zoomOut = () => setStageScale((prev) => Math.max(prev / 1.2, 0.2));
  const resetZoom = () => {
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
  };

  // Coordinate transforms (Screen <-> Normalized %)
  const screenToNormalized = useCallback(
    (screenX: number, screenY: number) => {
      if (imageLayout.width === 0 || imageLayout.height === 0) {
        return { x: 0, y: 0 };
      }
      const relX = screenX - imageLayout.x;
      const relY = screenY - imageLayout.y;
      const normX = Math.max(
        0,
        Math.min(100, (relX / imageLayout.width) * 100)
      );
      const normY = Math.max(
        0,
        Math.min(100, (relY / imageLayout.height) * 100)
      );
      return { x: normX, y: normY };
    },
    [imageLayout]
  );

  const normalizedToScreen = useCallback(
    (normX: number, normY: number, normW: number, normH: number) => {
      return {
        x: imageLayout.x + (normX / 100) * imageLayout.width,
        y: imageLayout.y + (normY / 100) * imageLayout.height,
        width: (normW / 100) * imageLayout.width,
        height: (normH / 100) * imageLayout.height,
      };
    },
    [imageLayout]
  );

  const pointNormToScreen = useCallback(
    (normX: number, normY: number) => {
      return {
        x: imageLayout.x + (normX / 100) * imageLayout.width,
        y: imageLayout.y + (normY / 100) * imageLayout.height,
      };
    },
    [imageLayout]
  );

  const naturalDimensions = React.useMemo(() => {
    if (!imageObj) return { width: 0, height: 0 };
    return {
      width: imageObj.naturalWidth || imageObj.width || 0,
      height: imageObj.naturalHeight || imageObj.height || 0,
    };
  }, [imageObj]);

  return {
    dimensions,
    naturalDimensions,
    stageScale,
    setStageScale,
    stagePos,
    setStagePos,
    imageObj,
    imageLayout,
    handleWheel,
    zoomIn,
    zoomOut,
    resetZoom,
    screenToNormalized,
    normalizedToScreen,
    pointNormToScreen,
  };
}
