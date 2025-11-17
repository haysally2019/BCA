import { useEffect } from "react";
import toast from "react-hot-toast";

export const useAutoRefetchOnFocus = (callback: () => void) => {
  useEffect(() => {
    const handler = async () => {
      const id = toast.loading("Syncing data...");
      try {
        await callback();
        toast.success("Data synced!", { id });
      } catch {
        toast.error("Sync failed", { id });
      }
    };

    window.addEventListener("refresh-data", handler);
    return () => window.removeEventListener("refresh-data", handler);
  }, [callback]);
};

export const initGlobalFocusWatcher = () => {
  const broadcast = () => {
    if (document.visibilityState === "visible") {
      window.dispatchEvent(new Event("refresh-data"));
    }
  };
  window.addEventListener("focus", broadcast);
  document.addEventListener("visibilitychange", broadcast);
};
