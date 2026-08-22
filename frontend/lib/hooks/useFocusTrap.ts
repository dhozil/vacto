"use client";

import { useEffect, useRef } from "react";

/**
 * Traps keyboard focus inside a modal container and closes it on Escape.
 * @param active - whether the modal is open
 * @param onClose - called when Escape is pressed
 * @returns a ref to attach to the modal container
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  active: boolean,
  onClose?: () => void
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;

    const root = ref.current;
    if (!root) return;

    const focusables = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;

      if (e.shiftKey && (current === first || !root.contains(current))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !root.contains(current))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Move initial focus inside the modal.
    const initial = focusables()[0] as HTMLElement | undefined;
    initial?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [active, onClose]);

  return ref;
}

export default useFocusTrap;