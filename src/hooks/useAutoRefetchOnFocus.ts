import { useEffect } from "react";

/**
 * Global focus/visibility hook.
 * Any component can subscribe to auto-refetch when the tab regains focus.
 * Example:
 *   const loadData = async () => { ... };
 *   useAutoRefetchOnFocus(loadData);
 */
export const useAutoRefetchOnFocus = (callback: () => void) => {
  useEffect(() => {
    const run = () => callback();

    window.addEventListener("refresh-data", run);

    return () => {
      window.removeEventListener("refresh-data", run);
    };
  }, [callback]);
};

/**
 * Initializes a global visibility + focus listener.
 * Should be called ONCE at the top of the app (e.g., in App.tsx).
 */
export const initGlobalFocusWatcher = () => {
  const broadcast = () => {
    if (document.visibilityState === "visible") {
      window.dispatchEvent(new Event("refresh-data"));
    }
  };

  window.addEventListener("focus", broadcast);
  document.addEventListener("visibilitychange", broadcast);
};
