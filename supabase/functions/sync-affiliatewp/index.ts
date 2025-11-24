import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function fetchFromAffiliateWP(wpUrl: string, consumerKey: string, consumerSecret: string, endpoint: string, params: Record<string, unknown> = {}) {
  const url = new URL(`${wpUrl}/wp-json/affwp/v1/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.append(key, String(value));
  });
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "Authorization": "Basic " + btoa(`${consumerKey}:${consumerSecret}`), "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AffiliateWP API Error: ${response.status} - ${text}`);
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Failed to parse AffiliateWP response: ${text.substring(0, 200)}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: settings, error: settingsError } = await supabaseClient.from("app_settings").select("key, value").in("key", ["affiliatewp_site_url", "affiliatewp_api_username", "affiliatewp_api_password"]);
    if (settingsError) throw new Error(`Failed to load settings: ${settingsError.message}`);
    const settingsMap = Object.fromEntries((settings || []).map((s: { key: string; value: string }) => [s.key, s.value]));
    const wpUrl = settingsMap.affiliatewp_site_url?.replace(/\/$/, '');
    const consumerKey = settingsMap.affiliatewp_api_username;
    const consumerSecret = settingsMap.affiliatewp_api_password;
    if (!wpUrl || !consumerKey || !consumerSecret) throw new Error("AffiliateWP configuration is incomplete");
    const affiliates: any[] = await fetchFromAffiliateWP(wpUrl, consumerKey, consumerSecret, "affiliates", { number: 1000 });
    let updatedCount = 0;
    for (const affiliate of affiliates) {
      let userEmail = affiliate.payment_email;
      if (!userEmail && affiliate.user_id) {
        try {
          const wpUserUrl = new URL(`${wpUrl}/wp-json/wp/v2/users/${affiliate.user_id}`);
          const userResponse = await fetch(wpUserUrl.toString(), {
            headers: { "Authorization": "Basic " + btoa(`${consumerKey}:${consumerSecret}`) }
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            userEmail = userData.email;
          }
        } catch (e) {
          console.error(`Failed to fetch user ${affiliate.user_id}:`, e);
        }
      }
      if (!userEmail) continue;
      const referralUrl = `${wpUrl}/?ref=${affiliate.affiliate_id}`;
      const { error } = await supabaseClient.from("profiles").update({ affiliatewp_id: affiliate.affiliate_id, affiliate_url: referralUrl, unpaid_earnings: parseFloat(affiliate.unpaid_earnings) || 0, paid_lifetime_earnings: parseFloat(affiliate.paid_earnings) || 0, referral_count: affiliate.referrals || 0, last_affiliatewp_sync: new Date().toISOString() }).eq("email", userEmail);
      if (!error) updatedCount++;
    }
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateFrom = thirtyDaysAgo.toISOString().split("T")[0];
    const referrals: any[] = await fetchFromAffiliateWP(wpUrl, consumerKey, consumerSecret, "referrals", { number: 1000, date_from: dateFrom });
    let referralsInserted = 0;
    for (const referral of referrals) {
      const { data: profileData } = await supabaseClient.from("profiles").select("user_id").eq("affiliatewp_id", referral.affiliate_id).maybeSingle();
      let customData = {};
      if (referral.custom) {
        customData = typeof referral.custom === 'string' ? JSON.parse(referral.custom) : referral.custom;
      }
      const { error } = await supabaseClient.from("affiliate_referrals").upsert({ affiliatewp_referral_id: referral.referral_id, affiliate_id: referral.affiliate_id, profile_id: profileData?.user_id || null, amount: parseFloat(referral.amount) || 0, description: referral.description, reference: referral.reference, context: referral.context, status: referral.status, custom: customData, date: referral.date, updated_at: new Date().toISOString() }, { onConflict: "affiliatewp_referral_id" });
      if (!error) referralsInserted++;
    }
    let metricsInserted = 0;
    const metricsMap = new Map<string, { visits: number; referrals: number; earnings: number; unpaid_earnings: number }>();

    // First, collect all referrals data by date
    for (const referral of referrals) {
      const date = referral.date ? new Date(referral.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
      const key = `${referral.affiliate_id}_${date}`;
      const current = metricsMap.get(key) || { visits: 0, referrals: 0, earnings: 0, unpaid_earnings: 0 };
      current.referrals += 1;
      const amount = parseFloat(referral.amount) || 0;
      current.earnings += amount;
      if (referral.status === "unpaid" || referral.status === "pending") {
        current.unpaid_earnings += amount;
      }
      metricsMap.set(key, current);
    }

    // Calculate visit estimates for each affiliate
    // Since AffiliateWP doesn't provide daily visit breakdowns, we estimate based on referral patterns
    for (const affiliate of affiliates) {
      const totalVisits = affiliate.visits || 0;
      const totalReferrals = affiliate.referrals || 0;

      // Calculate average conversion rate for this affiliate
      const conversionRate = totalReferrals > 0 && totalVisits > 0 ? totalReferrals / totalVisits : 0.02; // Default 2% if unknown

      // For each date with referrals, estimate visits based on referrals and conversion rate
      for (const [key, metrics] of metricsMap.entries()) {
        if (key.startsWith(`${affiliate.affiliate_id}_`)) {
          if (metrics.referrals > 0 && conversionRate > 0) {
            // Estimate visits: referrals / conversion rate
            const estimatedVisits = Math.round(metrics.referrals / conversionRate);
            metrics.visits = estimatedVisits;
          } else {
            // No referrals on this date, estimate minimal traffic
            metrics.visits = 0;
          }
        }
      }

      // Also ensure today has the current total visits recorded
      const today = new Date().toISOString().split("T")[0];
      const todayKey = `${affiliate.affiliate_id}_${today}`;
      if (!metricsMap.has(todayKey)) {
        metricsMap.set(todayKey, {
          visits: totalVisits,
          referrals: 0,
          earnings: 0,
          unpaid_earnings: parseFloat(affiliate.unpaid_earnings) || 0
        });
      } else {
        // Update today's entry with actual visit count
        const todayMetrics = metricsMap.get(todayKey)!;
        todayMetrics.visits = totalVisits;
      }
    }
    for (const [key, metrics] of metricsMap.entries()) {
      const [affiliateId, date] = key.split("_");
      const { error } = await supabaseClient.from("affiliate_metrics_daily").upsert({ affiliate_id: parseInt(affiliateId), date, visits: metrics.visits, referrals: metrics.referrals, earnings: metrics.earnings, unpaid_earnings: metrics.unpaid_earnings }, { onConflict: "affiliate_id,date" });
      if (!error) metricsInserted++;
    }
    await supabaseClient.from("affiliatewp_sync_log").insert({ sync_type: "full_sync", status: "completed", records_processed: affiliates.length + referrals.length, completed_at: new Date().toISOString(), metadata: { affiliates: affiliates.length, profiles_updated: updatedCount, referrals: referrals.length, referrals_inserted: referralsInserted, metrics_inserted: metricsInserted } });
    return new Response(JSON.stringify({ success: true, message: "Sync completed successfully", stats: { affiliates: affiliates.length, profiles_updated: updatedCount, referrals: referrals.length, referrals_inserted: referralsInserted, metrics_inserted: metricsInserted } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
