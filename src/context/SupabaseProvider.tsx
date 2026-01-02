import React, { createContext, useContext, useEffect } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { useAuthStore } from "../store/authStore";

interface SupabaseContextType {
  supabase: SupabaseClient;
}

const SupabaseContext = createContext<SupabaseContextType>({ supabase });

export const useSupabase = () => useContext(SupabaseContext);

export const SupabaseProvider = ({ children }: { children: React.ReactNode }) => {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    console.log("[SupabaseProvider] Starting initialization");
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      try {
        console.log("[SupabaseProvider] Calling initialize");
        const result = await initialize();
        console.log("[SupabaseProvider] Initialize result:", result ? "Success" : "No result");
        if (result) {
          unsubscribe = result.unsubscribe;
        }
      } catch (error) {
        console.error("[SupabaseProvider] Initialize error:", error);
      }
    };

    init();

    const handleFocus = () => {
      supabase.auth.getSession();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [initialize]);

  console.log("[SupabaseProvider] Rendering children");
  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
};
