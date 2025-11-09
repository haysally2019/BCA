import { useEffect } from "react";

/**
 * useAutoRefetchOnFocus
 * Triggers a callback whenever the tab regains focus or visibility.
 * Perfect for refreshing Supabase data after tab sleep or idle.
 *
 * Example:
 *   useAutoRefetchOnFocus(loadData)
 */
export const useAutoRefetchOnFocus = (callback: () => void) => {
  useEffect(() => {
    const handleFocus = () => {
      callback();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") callback();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [callback]);
};
