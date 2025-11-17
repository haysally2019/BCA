// lib/authWithAffiliate.ts

import { supabase } from "./supabaseClient";
import { createAffiliateForEmail } from "./affiliatewpClient";

export async function signUpUserWithAffiliate(email: string, password: string) {
  // 1. Create the Supabase auth user
  const {
    data: { user },
    error: signUpError
  } = await supabase.auth.signUp({ email, password });

  if (signUpError || !user) throw signUpError;

  // 2. Create Affiliate in AffiliateWP
  const { affiliateId, affiliateUrl } = await createAffiliateForEmail(email);

  // 3. Update the CRM profile row (your schema uses user_id)
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      affiliate_id: affiliateId,
      affiliate_url: affiliateUrl
    })
    .eq("user_id", user.id);

  if (updateError) throw updateError;

  return {
    user,
    affiliateId,
    affiliateUrl
  };
}