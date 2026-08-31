import { useEffect } from "react";

let activeModalCount = 0;
let savedScrollY = 0;

interface SavedStyles {
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  overflow: string;
  touchAction: string;
  overscrollBehavior: string;
}

let originalBodyStyles: SavedStyles | null = null;
let originalDocOverflow: string | null = null;
let originalDocOverscroll: string | null = null;

/**
 * Custom hook to prevent background scrolling when a modal or overlay is open.
 * Locks body and document scroll position with fixed positioning and restores
 * scroll state when all modals close.
 */
export function useModalScrollLock(isOpen: boolean = true) {
  useEffect(() => {
    if (!isOpen) return;

    if (activeModalCount === 0) {
      savedScrollY = window.scrollY || window.pageYOffset || 0;

      originalBodyStyles = {
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        right: document.body.style.right,
        width: document.body.style.width,
        overflow: document.body.style.overflow,
        touchAction: document.body.style.touchAction,
        overscrollBehavior: document.body.style.overscrollBehavior,
      };

      originalDocOverflow = document.documentElement.style.overflow;
      originalDocOverscroll = document.documentElement.style.overscrollBehavior;

      document.body.style.position = "fixed";
      document.body.style.top = `-${savedScrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      document.body.style.overscrollBehavior = "none";

      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.overscrollBehavior = "none";
    }

    activeModalCount += 1;

    return () => {
      activeModalCount -= 1;

      if (activeModalCount <= 0) {
        activeModalCount = 0;

        if (originalBodyStyles) {
          document.body.style.position = originalBodyStyles.position;
          document.body.style.top = originalBodyStyles.top;
          document.body.style.left = originalBodyStyles.left;
          document.body.style.right = originalBodyStyles.right;
          document.body.style.width = originalBodyStyles.width;
          document.body.style.overflow = originalBodyStyles.overflow;
          document.body.style.touchAction = originalBodyStyles.touchAction;
          document.body.style.overscrollBehavior = originalBodyStyles.overscrollBehavior;
          originalBodyStyles = null;
        }

        if (originalDocOverflow !== null) {
          document.documentElement.style.overflow = originalDocOverflow;
          originalDocOverflow = null;
        }

        if (originalDocOverscroll !== null) {
          document.documentElement.style.overscrollBehavior = originalDocOverscroll;
          originalDocOverscroll = null;
        }

        window.scrollTo(0, savedScrollY);
      }
    };
  }, [isOpen]);
}

