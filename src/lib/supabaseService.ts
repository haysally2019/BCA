// src/lib/supabaseService.ts

import { createClient } from "@supabase/supabase-js";
import { createAffiliateProfile } from "./affiliateService";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signUp(email: string, password: string) {
  // 🔥 CREATE USER IN SUPABASE AUTH
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error || !data.user) {
    console.error("Signup error:", error);
    return { error };
  }

  const userId = data.user.id;

  // 🔥 CREATE AFFILIATEWP ACCOUNT
  const affiliate = await createAffiliateProfile(email);

  let affiliate_id = null;
  let affiliate_url = null;

  if (affiliate.ok) {
    affiliate_id = affiliate.affiliate_id;
    affiliate_url = affiliate.affiliate_url;
  }

  // 🔥 STORE EMAIL + AFFILIATE DATA IN PROFILES
  await supabase
    .from("profiles")
    .update({
      email,           // NEW
      user_id: userId, // ensure profile is attached correctly
      affiliate_id,
      affiliate_url,
    })
    .eq("id", userId);

  return { user: data.user };
}

export default supabase;