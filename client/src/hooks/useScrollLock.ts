import { useEffect } from "react";

/**
 * Trava o scroll do documento enquanto `locked` for true.
 * Usado por menu mobile, lightbox e modais.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}
