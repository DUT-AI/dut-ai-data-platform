"use client";

import { useEffect, useRef } from "react";

const enterFullscreen = (el: HTMLElement) => {
  if ("webkitRequestFullscreen" in el) {
    (
      el as unknown as { webkitRequestFullscreen: () => void }
    ).webkitRequestFullscreen();
  } else if (el.requestFullscreen) {
    el.requestFullscreen();
  }
};

const exitFullscreen = () => {
  const doc = document as unknown as {
    webkitCancelFullScreen?: () => void;
    exitFullscreen?: () => Promise<void>;
  };
  if (typeof doc.webkitCancelFullScreen === "function") {
    doc.webkitCancelFullScreen();
  } else if (typeof doc.exitFullscreen === "function") {
    doc.exitFullscreen();
  }
};

const getFullscreenElement = (): HTMLElement | null => {
  const doc = document as unknown as {
    webkitCurrentFullScreenElement?: HTMLElement;
    fullscreenElement?: Element;
  };
  const el =
    doc.webkitCurrentFullScreenElement ?? doc.fullscreenElement ?? null;
  return (el as HTMLElement) ?? null;
};

export interface UseFullscreenOptions {
  onEnter?: () => void;
  onExit?: () => void;
}

export function useFullscreen(options: UseFullscreenOptions = {}) {
  const handlers = useRef(options);

  useEffect(() => {
    handlers.current = options;
  }, [options]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const el = getFullscreenElement();
      if (!el) {
        handlers.current.onExit?.();
      } else {
        handlers.current.onEnter?.();
      }
    };

    const evt =
      "onwebkitfullscreenchange" in document
        ? "webkitfullscreenchange"
        : "fullscreenchange";
    document.addEventListener(evt, handleFullscreenChange);

    return () => {
      document.removeEventListener(evt, handleFullscreenChange);
    };
  }, []);

  const toggle = (targetElement?: HTMLElement | null) => {
    const active = getFullscreenElement();
    if (active) {
      exitFullscreen();
    } else {
      const target = targetElement || document.documentElement;
      enterFullscreen(target);
    }
  };

  return {
    isFullscreen: !!getFullscreenElement(),
    enter: (el: HTMLElement) => enterFullscreen(el),
    exit: exitFullscreen,
    toggle,
  };
}
