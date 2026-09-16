"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Konva from "konva";
import {
  ImageLayout,
  CoordinateScaleMode,
  calculateFitImageLayout,
  screenToNorm as pureScreenToNorm,
  normToScreen as pureNormToScreen,
  pointNormToScreen as purePointNormToScreen,
} from "../utils/coordinate-transformer";

export interface Dimensions {
  width: number;
  height: number;
}

interface UseImageTransformProps {
  imageUrl?: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  scaleMode?: CoordinateScaleMode;
}

export function useImageTransform({
  imageUrl,
  containerRef,
  scaleMode = "percent",
}: UseImageTransformProps) {
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 800,
    height: 500,
  });
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // ResizeObserver for responsive layout tracking
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth || 800,
          height: containerRef.current.offsetHeight || 500,
        });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  // Load Image Asset
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

    img.onerror = () => {
      if (isMounted) {
        setImageObj(null);
      }
    };

    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  const naturalDimensions = useMemo(() => {
    if (!imageObj) return { width: 0, height: 0 };
    return {
      width: imageObj.naturalWidth || imageObj.width || 0,
      height: imageObj.naturalHeight || imageObj.height || 0,
    };
  }, [imageObj]);

  // Derived Image Layout (Letterboxed & Fitted)
  const imageLayout: ImageLayout = useMemo(() => {
    return calculateFitImageLayout(
      dimensions.width,
      dimensions.height,
      naturalDimensions.width,
      naturalDimensions.height
    );
  }, [dimensions, naturalDimensions]);

  // Zoom handling centered at cursor pointer
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

  const zoomIn = useCallback(
    () => setStageScale((prev) => Math.min(prev * 1.2, 10)),
    []
  );
  const zoomOut = useCallback(
    () => setStageScale((prev) => Math.max(prev / 1.2, 0.2)),
    []
  );
  const resetZoom = useCallback(() => {
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
  }, []);

  // Coordinate conversion adapters
  const screenToNormalized = useCallback(
    (screenX: number, screenY: number) => {
      return pureScreenToNorm(screenX, screenY, imageLayout, scaleMode);
    },
    [imageLayout, scaleMode]
  );

  const normalizedToScreen = useCallback(
    (normX: number, normY: number, normW: number, normH: number) => {
      return pureNormToScreen(normX, normY, normW, normH, imageLayout);
    },
    [imageLayout]
  );

  const pointNormToScreen = useCallback(
    (normX: number, normY: number) => {
      return purePointNormToScreen(normX, normY, imageLayout);
    },
    [imageLayout]
  );

  return {
    dimensions,
    naturalDimensions,
    imageObj,
    imageLayout,
    stageScale,
    setStageScale,
    stagePos,
    setStagePos,
    handleWheel,
    zoomIn,
    zoomOut,
    resetZoom,
    screenToNormalized,
    normalizedToScreen,
    pointNormToScreen,
  };
}
