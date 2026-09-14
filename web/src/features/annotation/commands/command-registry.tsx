"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
  useRef,
} from "react";
import {
  useHotkey,
  useHotkeyRecorder,
  useHeldKeys,
  formatForDisplay,
  type Hotkey,
} from "@tanstack/react-hotkeys";
import {
  DEFAULT_ANNOTATION_COMMANDS,
  type CommandDefinition,
  type CommandScope,
} from "./command-definitions";

interface CommandRegistryContextType {
  activeScope: CommandScope;
  setActiveScope: (scope: CommandScope) => void;
  commands: Record<string, CommandDefinition>;
  bindings: Record<string, Hotkey>;
  updateBinding: (commandId: string, newBinding: Hotkey) => void;
  resetBindings: () => void;
  registerAction: (commandId: string, action: () => void) => () => void;
  formatBinding: (hotkeyOrCommandId: string) => string;
  isRecording: boolean;
  recordingCommandId: string | null;
  startRecording: (commandId: string) => void;
  cancelRecording: () => void;
  heldKeys: string[];
}

const CommandRegistryContext = createContext<CommandRegistryContextType | null>(
  null
);

const STORAGE_KEY = "dut_annotation_custom_hotkeys_v1";

export function CommandRegistryProvider({
  children,
  defaultScope = "workspace",
}: {
  children: ReactNode;
  defaultScope?: CommandScope;
}) {
  const [activeScope, setActiveScope] = useState<CommandScope>(defaultScope);
  const [bindings, setBindings] = useState<Record<string, Hotkey>>(() => {
    if (typeof window === "undefined") {
      const initial: Record<string, Hotkey> = {};
      Object.entries(DEFAULT_ANNOTATION_COMMANDS).forEach(([id, def]) => {
        initial[id] = def.defaultBinding;
      });
      return initial;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return {
          ...Object.fromEntries(
            Object.entries(DEFAULT_ANNOTATION_COMMANDS).map(([id, def]) => [
              id,
              def.defaultBinding,
            ])
          ),
          ...JSON.parse(saved),
        };
      }
    } catch {
      // ignore
    }
    const initial: Record<string, Hotkey> = {};
    Object.entries(DEFAULT_ANNOTATION_COMMANDS).forEach(([id, def]) => {
      initial[id] = def.defaultBinding;
    });
    return initial;
  });

  const actionsRef = useRef<Record<string, () => void>>({});
  const [recordingCommandId, setRecordingCommandId] = useState<string | null>(
    null
  );

  const heldKeysObj = useHeldKeys();
  const heldKeys = useMemo(() => Array.from(heldKeysObj), [heldKeysObj]);

  const updateBinding = useCallback((commandId: string, newBinding: Hotkey) => {
    setBindings((prev) => {
      const updated = { ...prev, [commandId]: newBinding };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const resetBindings = useCallback(() => {
    const initial: Record<string, Hotkey> = {};
    Object.entries(DEFAULT_ANNOTATION_COMMANDS).forEach(([id, def]) => {
      initial[id] = def.defaultBinding;
    });
    setBindings(initial);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const registerAction = useCallback(
    (commandId: string, action: () => void) => {
      actionsRef.current[commandId] = action;
      return () => {
        delete actionsRef.current[commandId];
      };
    },
    []
  );

  // Hotkey recorder for customizing bindings
  const recorder = useHotkeyRecorder({
    onRecord: (hotkey) => {
      if (recordingCommandId) {
        updateBinding(recordingCommandId, hotkey);
        setRecordingCommandId(null);
      }
    },
    onCancel: () => {
      setRecordingCommandId(null);
    },
  });

  const startRecording = useCallback(
    (commandId: string) => {
      setRecordingCommandId(commandId);
      recorder.startRecording();
    },
    [recorder]
  );

  const cancelRecording = useCallback(() => {
    recorder.cancelRecording();
    setRecordingCommandId(null);
  }, [recorder]);

  const formatBinding = useCallback(
    (input: string): string => {
      const hotkeyStr = bindings[input] || input;
      try {
        return formatForDisplay(hotkeyStr, { useSymbols: true });
      } catch {
        return hotkeyStr;
      }
    },
    [bindings]
  );

  const value = useMemo(
    () => ({
      activeScope,
      setActiveScope,
      commands: DEFAULT_ANNOTATION_COMMANDS,
      bindings,
      updateBinding,
      resetBindings,
      registerAction,
      formatBinding,
      isRecording: !!recordingCommandId,
      recordingCommandId,
      startRecording,
      cancelRecording,
      heldKeys,
    }),
    [
      activeScope,
      bindings,
      updateBinding,
      resetBindings,
      registerAction,
      formatBinding,
      recordingCommandId,
      startRecording,
      cancelRecording,
      heldKeys,
    ]
  );

  return (
    <CommandRegistryContext.Provider value={value}>
      {children}
      {/* Global listener bridge for active scope commands */}
      <CommandDispatcher
        actionsRef={actionsRef}
        bindings={bindings}
        activeScope={activeScope}
      />
    </CommandRegistryContext.Provider>
  );
}

/**
 * Dispatches active commands through TanStack's useHotkey hook with input filtering and scoping
 */
function CommandDispatcher({
  actionsRef,
  bindings,
  activeScope,
}: {
  actionsRef: React.RefObject<Record<string, () => void>>;
  bindings: Record<string, Hotkey>;
  activeScope: CommandScope;
}) {
  const isScopeMatch = (cmdScope: CommandScope) => {
    if (cmdScope === "global") return true;
    if (cmdScope === "workspace") return true;
    return cmdScope === activeScope;
  };

  // General commands
  useHotkey(
    bindings["general.save"] || "Mod+S",
    () => actionsRef.current["general.save"]?.(),
    { enabled: isScopeMatch("workspace"), conflictBehavior: "replace" }
  );

  useHotkey(
    bindings["general.instructions"] || "H",
    () => actionsRef.current["general.instructions"]?.(),
    { enabled: isScopeMatch("workspace"), conflictBehavior: "replace" }
  );

  useHotkey(
    bindings["general.fullscreen"] || "F",
    () => actionsRef.current["general.fullscreen"]?.(),
    { enabled: isScopeMatch("workspace"), conflictBehavior: "replace" }
  );

  // Edit commands
  useHotkey(
    bindings["edit.undo"] || "Mod+Z",
    () => actionsRef.current["edit.undo"]?.(),
    { enabled: isScopeMatch("canvas"), conflictBehavior: "replace" }
  );

  useHotkey(
    bindings["edit.redo"] || "Mod+Shift+Z",
    () => actionsRef.current["edit.redo"]?.(),
    { enabled: isScopeMatch("canvas"), conflictBehavior: "replace" }
  );

  useHotkey(
    bindings["edit.delete"] || "Delete",
    () => actionsRef.current["edit.delete"]?.(),
    { enabled: isScopeMatch("canvas"), conflictBehavior: "replace" }
  );

  useHotkey(
    bindings["edit.delete_backspace"] || "Backspace",
    () => actionsRef.current["edit.delete_backspace"]?.(),
    { enabled: isScopeMatch("canvas"), conflictBehavior: "replace" }
  );

  // Tools commands
  useHotkey(
    bindings["tool.select"] || "V",
    () => actionsRef.current["tool.select"]?.(),
    { enabled: isScopeMatch("canvas"), conflictBehavior: "replace" }
  );

  useHotkey(
    bindings["tool.zoom_in"] || "=",
    () => actionsRef.current["tool.zoom_in"]?.(),
    { enabled: isScopeMatch("canvas"), conflictBehavior: "replace" }
  );

  useHotkey(
    bindings["tool.zoom_out"] || "-",
    () => actionsRef.current["tool.zoom_out"]?.(),
    { enabled: isScopeMatch("canvas"), conflictBehavior: "replace" }
  );

  useHotkey(
    bindings["tool.zoom_fit"] || "Shift+1",
    () => actionsRef.current["tool.zoom_fit"]?.(),
    { enabled: isScopeMatch("canvas"), conflictBehavior: "replace" }
  );

  useHotkey(
    bindings["tool.zoom_original"] || "Shift+0",
    () => actionsRef.current["tool.zoom_original"]?.(),
    { enabled: isScopeMatch("canvas"), conflictBehavior: "replace" }
  );

  // Navigation commands
  useHotkey(
    bindings["nav.prev_asset"] || "[",
    () => actionsRef.current["nav.prev_asset"]?.(),
    { enabled: isScopeMatch("workspace"), conflictBehavior: "replace" }
  );

  useHotkey(
    bindings["nav.next_asset"] || "]",
    () => actionsRef.current["nav.next_asset"]?.(),
    { enabled: isScopeMatch("workspace"), conflictBehavior: "replace" }
  );

  // Playback commands
  useHotkey(
    bindings["playback.toggle"] || "K",
    () => actionsRef.current["playback.toggle"]?.(),
    { enabled: isScopeMatch("timeline"), conflictBehavior: "replace" }
  );

  useHotkey(
    bindings["playback.step_back"] || "J",
    () => actionsRef.current["playback.step_back"]?.(),
    { enabled: isScopeMatch("timeline"), conflictBehavior: "replace" }
  );

  useHotkey(
    bindings["playback.step_forward"] || "L",
    () => actionsRef.current["playback.step_forward"]?.(),
    { enabled: isScopeMatch("timeline"), conflictBehavior: "replace" }
  );

  return null;
}

export function useCommandRegistry() {
  const context = useContext(CommandRegistryContext);
  if (!context) {
    throw new Error(
      "useCommandRegistry must be used within a CommandRegistryProvider"
    );
  }
  return context;
}

/**
 * Hook to register an action to a command definition
 */
export function useRegisterCommand(commandId: string, action: () => void) {
  const { registerAction } = useCommandRegistry();
  const actionRef = useRef(action);

  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  useEffect(() => {
    return registerAction(commandId, () => actionRef.current());
  }, [commandId, registerAction]);
}
