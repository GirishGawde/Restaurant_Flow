/**
 * src/hooks/usePolling.js
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Custom React hook that runs a callback function every N milliseconds
 * (default: 10,000 ms = 10 seconds, matching the Kitchen Display & Dashboard polling spec).
 * Automatically handles cleanup when the component unmounts or dependencies change.
 */

import { useEffect, useRef } from "react";

export function usePolling(callback, intervalMs = 10000, enabled = true) {
  const savedCallback = useRef(callback);

  // Keep ref updated to the latest callback without restarting interval
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || !intervalMs || intervalMs <= 0) return;

    const tick = () => {
      if (savedCallback.current) {
        savedCallback.current();
      }
    };

    const timerId = setInterval(tick, intervalMs);

    return () => clearInterval(timerId);
  }, [intervalMs, enabled]);
}
