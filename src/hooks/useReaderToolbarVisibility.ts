import { useCallback, useEffect, useRef, useState } from "react";

interface ToolbarVisibilityOptions {
  headerZoneHeight?: number;
  footerZoneHeight?: number;
  idleTimeout?: number;
}

interface ToolbarVisibilityController {
  isHeaderVisible: boolean;
  isFooterVisible: boolean;
  handlePointerMove: (clientY: number) => void;
  showToolbarsTemporarily: (duration?: number) => void;
}

const DEFAULT_HEADER_HEIGHT = 100;
const DEFAULT_FOOTER_HEIGHT = 100;
const DEFAULT_IDLE_TIMEOUT = 2400;

export const useReaderToolbarVisibility = (
  options: ToolbarVisibilityOptions = {}
): ToolbarVisibilityController => {
  const {
    headerZoneHeight = DEFAULT_HEADER_HEIGHT,
    footerZoneHeight = DEFAULT_FOOTER_HEIGHT,
    idleTimeout = DEFAULT_IDLE_TIMEOUT,
  } = options;

  const [isHeaderVisible, setIsHeaderVisible] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);

  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = useCallback(
    (timeout = idleTimeout) => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = setTimeout(() => {
        setIsHeaderVisible(false);
        setIsFooterVisible(false);
      }, timeout);
    },
    [idleTimeout]
  );

  const showToolbarsTemporarily = useCallback(
    (duration?: number) => {
      setIsHeaderVisible(true);
      setIsFooterVisible(true);
      scheduleHide(duration ?? idleTimeout);
    },
    [idleTimeout, scheduleHide]
  );

  const handlePointerMove = useCallback(
    (clientY: number) => {
      if (typeof window === "undefined") {
        return;
      }
      const windowHeight = window.innerHeight;

      const shouldShowHeader = clientY <= headerZoneHeight;
      const shouldShowFooter = windowHeight - clientY <= footerZoneHeight;

      setIsHeaderVisible(shouldShowHeader);
      setIsFooterVisible(shouldShowFooter);

      if (shouldShowHeader || shouldShowFooter) {
        scheduleHide();
      }
    },
    [footerZoneHeight, headerZoneHeight, scheduleHide]
  );

  useEffect(() => {
    const moveListener = (event: MouseEvent) => {
      handlePointerMove(event.clientY);
    };

    const touchListener = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) {
        handlePointerMove(touch.clientY);
      }
    };

    window.addEventListener("mousemove", moveListener, { passive: true });
    window.addEventListener("touchstart", touchListener, { passive: true });

    scheduleHide();

    return () => {
      window.removeEventListener("mousemove", moveListener);
      window.removeEventListener("touchstart", touchListener);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [handlePointerMove, scheduleHide]);

  return {
    isHeaderVisible,
    isFooterVisible,
    handlePointerMove,
    showToolbarsTemporarily,
  };
};
