import { useEffect, useState } from "react";

const STORAGE_KEY = "kuharica:keepScreenOn";

export const wakeLockSupported =
  typeof navigator !== "undefined" && "wakeLock" in navigator;

// "Keep screen on" with the Screen Wake Lock API. The lock is released by the
// browser when the page is hidden, so it is requested again on return.
export function useWakeLock() {
  const [enabled, setEnabled] = useState(
    () => wakeLockSupported && localStorage.getItem(STORAGE_KEY) === "1",
  );
  const [active, setActive] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    if (!enabled || !wakeLockSupported) return;

    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await lock.release();
          return;
        }
        setActive(true);
        lock.addEventListener("release", () => setActive(false));
      } catch {
        setActive(false);
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };

    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
      setActive(false);
    };
  }, [enabled]);

  return { enabled, setEnabled, active, supported: wakeLockSupported };
}
