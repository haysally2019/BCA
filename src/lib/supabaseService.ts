// src/lib/supabaseService.ts

import { createClient } from "@supabase/supabase-js";
import { createAffiliateProfile } from "./affiliateService";

// Load Supabase credentials from Vite env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------------------------------------------------
// SIGNUP FUNCTION (with AffiliateWP integration)
// ---------------------------------------------------
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data.user) {
    console.error("[Supabase Signup Error]", error);
    return { error };
  }

  const userId = data.user.id;

  // CREATE AFFILIATE
  const affiliate = await createAffiliateProfile(email);

  // UPDATE PROFILES TABLE
  if (affiliate.ok) {
    await supabase
      .from("profiles")
      .update({
        affiliate_id: affiliate.affiliate_id,
        affiliate_url: affiliate.affiliate_url,
      })
      .eq("user_id", userId);
  }

  return { user: data.user };
}

// Default export (optional but safe)
export default supabase;