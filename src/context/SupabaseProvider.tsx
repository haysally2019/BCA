import React, { createContext, useContext } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

interface SupabaseContextType {
  supabase: SupabaseClient;
}

const SupabaseContext = createContext<SupabaseContextType>({ supabase });

export const useSupabase = () => useContext(SupabaseContext);

export const SupabaseProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
};
