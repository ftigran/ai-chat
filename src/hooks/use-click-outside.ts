"use client";

import { useEffect, useRef, type RefObject } from "react";

export function useClickOutside(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  const callbackRef = useRef(onClose);
  callbackRef.current = onClose;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callbackRef.current();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref]);
}
