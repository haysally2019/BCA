import { createAffiliateProfile } from "./affiliateService";

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) return { error };

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