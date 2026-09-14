"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type ToolType =
  "select" | "bbox" | "polygon" | "keypoint" | "pan" | "zoom" | "relation";

interface ToolManagerContextType {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  isDrawing: boolean;
  setIsDrawing: (drawing: boolean) => void;
  resetDrawing: () => void;
}

const ToolManagerContext = createContext<ToolManagerContextType | null>(null);

const STORAGE_TOOL_KEY = "dut_annotation_selected_tool";

/**
 * Centralized tool manager pattern adapted from Label Studio tools/Manager.js
 * Manages active canvas tool, drawing state, and persistence across sessions
 */
export function ToolManagerProvider({
  children,
  defaultTool = "select",
}: {
  children: ReactNode;
  defaultTool?: ToolType;
}) {
  const [activeTool, setActiveToolState] = useState<ToolType>(() => {
    if (typeof window === "undefined") return defaultTool;
    const preserved = localStorage.getItem(STORAGE_TOOL_KEY) as ToolType;
    return preserved || defaultTool;
  });

  const [isDrawing, setIsDrawing] = useState(false);

  const setActiveTool = useCallback((tool: ToolType) => {
    setActiveToolState(tool);
    setIsDrawing(false);
    try {
      localStorage.setItem(STORAGE_TOOL_KEY, tool);
    } catch {
      // ignore
    }
  }, []);

  const resetDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  return (
    <ToolManagerContext.Provider
      value={{
        activeTool,
        setActiveTool,
        isDrawing,
        setIsDrawing,
        resetDrawing,
      }}
    >
      {children}
    </ToolManagerContext.Provider>
  );
}

export function useToolManager() {
  const context = useContext(ToolManagerContext);
  if (!context) {
    throw new Error("useToolManager must be used within a ToolManagerProvider");
  }
  return context;
}
