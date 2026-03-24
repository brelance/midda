/**
 * useImageReaderZoom — custom hook for zoom + pan in the image reader.
 *
 * Features:
 * - ⌘+/- keyboard zoom (0.25 step, range 0.25–5.0)
 * - ⌘0 reset to default
 * - Trackpad pinch-to-zoom (ctrl+wheel)
 * - Three preset modes: fit-width, fit-page, actual
 * - Drag-to-pan when zoomed in (zoomLevel > fitted size)
 * - Pan offset resets on page change
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ZoomMode = "fit-width" | "fit-page" | "actual" | "custom";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5.0;
const ZOOM_STEP = 0.25;
const PINCH_SENSITIVITY = 0.005;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));
}

interface ZoomState {
  zoomLevel: number;
  zoomMode: ZoomMode;
  panOffset: { x: number; y: number };
}

interface UseImageReaderZoomOptions {
  /** Natural (unscaled) width of the current page image */
  imageWidth: number;
  /** Natural (unscaled) height of the current page image */
  imageHeight: number;
  /** Called when zoom changes so parent can re-render */
  onZoomChange?: (level: number, mode: ZoomMode) => void;
  /** Optional external container ref (e.g. from a scroll viewer) */
  externalContainerRef?: React.RefObject<HTMLDivElement>;
}

export function useImageReaderZoom({
  imageWidth,
  imageHeight,
  onZoomChange,
  externalContainerRef,
}: UseImageReaderZoomOptions) {
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef ?? internalContainerRef;
  const hasAutoFittedRef = useRef(false);
  const fittedZoomRef = useRef(1);

  // DPR — shared across computeFittedZoom and imageTransformStyle
  const dpr = (typeof window !== "undefined" ? window.devicePixelRatio : 2) || 2;
  const [state, setState] = useState<ZoomState>({
    zoomLevel: 1,
    zoomMode: "fit-page",
    panOffset: { x: 0, y: 0 },
  });

  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetStartRef = useRef({ x: 0, y: 0 });
  const onZoomChangeRef = useRef(onZoomChange);
  useEffect(() => {
    onZoomChangeRef.current = onZoomChange;
  }, [onZoomChange]);

  // ── Compute fitted zoom level based on container vs image size ──────
  const computeFittedZoom = useCallback(
    (mode: "fit-width" | "fit-page"): number => {
      const container = containerRef.current;
      if (!container || !imageWidth || !imageHeight) return 1;

      const cw = container.clientWidth;
      const ch = container.clientHeight;

      // imageWidth/imageHeight are the canvas pixel dimensions (rendered at 2x for retina).
      // The <img> natural size in CSS pixels = imageWidth / devicePixelRatio.
      // But since different screens have different DPR, we use the raw pixel
      // dimensions and compute the scale that would make the image fit.
      const iw = imageWidth / dpr;
      const ih = imageHeight / dpr;

      if (mode === "fit-width") {
        return clampZoom(cw / iw);
      }
      // fit-page: fit both dimensions with some padding
      const padding = 16; // px breathing room
      const scaleW = (cw - padding) / iw;
      const scaleH = (ch - padding) / ih;
      return clampZoom(Math.min(scaleW, scaleH));
    },
    [imageWidth, imageHeight, dpr]
  );

  // ── Auto-apply fit-page when image dimensions change ────────────────
  useEffect(() => {
    if (!imageWidth || !imageHeight) return;
    const container = containerRef.current;
    if (!container) return;

    // Auto-fit on first load, or re-fit when in a preset mode
    if (!hasAutoFittedRef.current || state.zoomMode === "fit-page" || state.zoomMode === "fit-width") {
      const mode = (state.zoomMode === "fit-width") ? "fit-width" : "fit-page";
      const fitted = computeFittedZoom(mode);
      fittedZoomRef.current = fitted;
      hasAutoFittedRef.current = true;
      setState((prev) => ({
        ...prev,
        zoomLevel: fitted,
        zoomMode: mode,
        panOffset: { x: 0, y: 0 },
      }));
      onZoomChangeRef.current?.(fitted, mode);
    }
  }, [imageWidth, imageHeight, computeFittedZoom, state.zoomMode]);

  // ── Setters ─────────────────────────────────────────────────────────
  const setZoomLevel = useCallback(
    (level: number, mode: ZoomMode = "custom") => {
      const clamped = clampZoom(level);
      setState((prev) => ({
        ...prev,
        zoomLevel: clamped,
        zoomMode: mode,
        // Reset pan when switching to a preset mode
        panOffset: mode !== "custom" ? { x: 0, y: 0 } : prev.panOffset,
      }));
      onZoomChangeRef.current?.(clamped, mode);
    },
    []
  );

  const setZoomMode = useCallback(
    (mode: "fit-width" | "fit-page" | "actual") => {
      if (mode === "actual") {
        setZoomLevel(1, "actual");
      } else {
        const fitted = computeFittedZoom(mode);
        setZoomLevel(fitted, mode);
      }
    },
    [computeFittedZoom, setZoomLevel]
  );

  const zoomIn = useCallback(() => {
    setState((prev) => {
      const next = clampZoom(prev.zoomLevel + ZOOM_STEP);
      onZoomChangeRef.current?.(next, "custom");
      return { ...prev, zoomLevel: next, zoomMode: "custom" };
    });
  }, []);

  const zoomOut = useCallback(() => {
    setState((prev) => {
      const next = clampZoom(prev.zoomLevel - ZOOM_STEP);
      onZoomChangeRef.current?.(next, "custom");
      return { ...prev, zoomLevel: next, zoomMode: "custom" };
    });
  }, []);

  // ── Reset pan (call on page change) ─────────────────────────────────
  const resetPan = useCallback(() => {
    setState((prev) => ({
      ...prev,
      panOffset: { x: 0, y: 0 },
    }));
    // If in a preset mode, re-fit on page change (page dimensions might differ)
    hasAutoFittedRef.current = false;
  }, []);

  // ── Keyboard handler ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta) return;

      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        setZoomMode("fit-page");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zoomIn, zoomOut, setZoomMode]);

  // ── Wheel handler (pinch-to-zoom) ───────────────────────────────────
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      // ctrlKey is true for trackpad pinch gestures
      if (!e.ctrlKey) return;
      e.preventDefault();
      e.stopPropagation();

      const delta = -e.deltaY * PINCH_SENSITIVITY;
      setState((prev) => {
        const next = clampZoom(prev.zoomLevel + delta);
        onZoomChangeRef.current?.(next, "custom");
        return { ...prev, zoomLevel: next, zoomMode: "custom" };
      });
    },
    []
  );

  // ── Pan handlers ────────────────────────────────────────────────────
  const handlePanStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Only pan when zoomed beyond the fitted size
      if (state.zoomLevel <= fittedZoomRef.current) return;
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panOffsetStartRef.current = { ...state.panOffset };
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    },
    [state.zoomLevel, state.panOffset]
  );

  const handlePanMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setState((prev) => ({
        ...prev,
        panOffset: {
          x: panOffsetStartRef.current.x + dx,
          y: panOffsetStartRef.current.y + dy,
        },
      }));
    },
    []
  );

  const handlePanEnd = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const panHandlers = useMemo(
    () => ({
      onPointerDown: handlePanStart,
      onPointerMove: handlePanMove,
      onPointerUp: handlePanEnd,
      onPointerCancel: handlePanEnd,
    }),
    [handlePanStart, handlePanMove, handlePanEnd]
  );

  // ── Derived style for the image ─────────────────────────────────────
  // We use pixel-based width/height instead of CSS transform scale
  // so the image is properly sized within the flex container.
  const displayWidth = imageWidth ? (imageWidth / dpr) * state.zoomLevel : undefined;
  const displayHeight = imageHeight ? (imageHeight / dpr) * state.zoomLevel : undefined;

  const imageTransformStyle: React.CSSProperties = {
    width: displayWidth ? `${displayWidth}px` : undefined,
    height: displayHeight ? `${displayHeight}px` : undefined,
    transform: (state.panOffset.x || state.panOffset.y)
      ? `translate(${state.panOffset.x}px, ${state.panOffset.y}px)`
      : undefined,
    cursor: state.zoomLevel > 1 ? (isPanningRef.current ? "grabbing" : "grab") : "default",
    transition: isPanningRef.current ? "none" : "transform 150ms ease-out",
    flexShrink: 0,
  };

  return {
    zoomLevel: state.zoomLevel,
    zoomMode: state.zoomMode,
    fittedZoom: fittedZoomRef.current,
    panOffset: state.panOffset,
    containerRef,
    setZoomLevel,
    setZoomMode,
    zoomIn,
    zoomOut,
    resetPan,
    handleWheel,
    panHandlers,
    imageTransformStyle,
  };
}
