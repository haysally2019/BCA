import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function fetchFromAffiliateWP(wpUrl: string, consumerKey: string, consumerSecret: string, endpoint: string, params: Record<string, unknown> = {}) {
  const url = new URL(\`\${wpUrl}/wp-json/affwp/v2/\${endpoint}\`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.append(key, String(value));
  });
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "Authorization": "Basic " + btoa(\`\${consumerKey}:\${consumerSecret}\`), "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(\`AffiliateWP API Error: \${response.status}\`);
  return response.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: settings, error: settingsError } = await supabaseClient.from("app_settings").select("setting_key, setting_value").in("setting_key", ["affiliatewp_url", "affiliatewp_consumer_key", "affiliatewp_consumer_secret"]);
    if (settingsError) throw new Error(\`Failed to load settings: \${settingsError.message}\`);
    const settingsMap = Object.fromEntries((settings || []).map((s: { setting_key: string; setting_value: string }) => [s.setting_key, s.setting_value]));
    const wpUrl = settingsMap.affiliatewp_url;
    const consumerKey = settingsMap.affiliatewp_consumer_key;
    const consumerSecret = settingsMap.affiliatewp_consumer_secret;
    if (!wpUrl || !consumerKey || !consumerSecret) throw new Error("AffiliateWP configuration is incomplete");
    const affiliates: any[] = await fetchFromAffiliateWP(wpUrl, consumerKey, consumerSecret, "affiliates", { number: 1000 });
    let updatedCount = 0;
    for (const affiliate of affiliates) {
      const referralUrl = `${wpUrl}/?ref=${affiliate.affiliate_id}`;
      const { error } = await supabaseClient.from("profiles").update({ affiliatewp_id: affiliate.affiliate_id, affiliate_url: referralUrl, unpaid_earnings: parseFloat(affiliate.unpaid_earnings) || 0, paid_lifetime_earnings: parseFloat(affiliate.paid_earnings) || 0, referral_count: affiliate.referrals || 0, last_affiliatewp_sync: new Date().toISOString() }).eq("email", affiliate.user_email);
      if (!error) updatedCount++;
    }
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateFrom = thirtyDaysAgo.toISOString().split("T")[0];
    const referrals: any[] = await fetchFromAffiliateWP(wpUrl, consumerKey, consumerSecret, "referrals", { number: 1000, date_from: dateFrom });
    let referralsInserted = 0;
    for (const referral of referrals) {
      const { data: profileData } = await supabaseClient.from("profiles").select("user_id").eq("affiliatewp_id", referral.affiliate_id).maybeSingle();
      const { error } = await supabaseClient.from("affiliate_referrals").upsert({ affiliatewp_referral_id: referral.referral_id, affiliate_id: referral.affiliate_id, profile_id: profileData?.user_id || null, amount: parseFloat(referral.amount) || 0, description: referral.description, reference: referral.reference, context: referral.context, status: referral.status, custom: referral.custom ? JSON.parse(referral.custom) : {}, date: referral.date, updated_at: new Date().toISOString() }, { onConflict: "affiliatewp_referral_id" });
      if (!error) referralsInserted++;
    }
    await supabaseClient.from("affiliatewp_sync_log").insert({ sync_type: "full_sync", status: "completed", records_processed: affiliates.length + referrals.length, completed_at: new Date().toISOString(), metadata: { affiliates: affiliates.length, profiles_updated: updatedCount, referrals: referrals.length, referrals_inserted: referralsInserted } });
    return new Response(JSON.stringify({ success: true, message: "Sync completed successfully", stats: { affiliates: affiliates.length, profiles_updated: updatedCount, referrals: referrals.length, referrals_inserted: referralsInserted } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
