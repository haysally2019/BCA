import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Get the payload from the database trigger
    const payload = await req.json();
    console.log("Received payload:", payload);

    const { email, name, user_id, profile_id } = payload;

    if (!email || !profile_id) {
      throw new Error("Missing required fields: email or profile_id");
    }

    // 2. Get AffiliateWP Credentials from App Settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from("app_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "affiliatewp_site_url",
        "affiliatewp_consumer_key",
        "affiliatewp_consumer_secret",
      ]);

    if (settingsError || !settings) {
      throw new Error("Could not load AffiliateWP settings from database");
    }

    const config = settings.reduce((acc, curr) => {
      acc[curr.setting_key] = curr.setting_value;
      return acc;
    }, {} as Record<string, string>);

    if (
      !config.affiliatewp_site_url ||
      !config.affiliatewp_consumer_key ||
      !config.affiliatewp_consumer_secret
    ) {
      throw new Error("Incomplete AffiliateWP configuration in app_settings");
    }

    // 3. Call AffiliateWP API to create the affiliate
    // We use the v2 /affiliates endpoint
    const authString = btoa(
      `${config.affiliatewp_consumer_key}:${config.affiliatewp_consumer_secret}`
    );
    const wpUrl = config.affiliatewp_site_url.replace(/\/$/, ""); // Remove trailing slash
    const apiUrl = `${wpUrl}/wp-json/affwp/v2/affiliates`;

    console.log(`Creating affiliate for ${email} at ${apiUrl}`);

    // Generate unique user_login from email
    const userLogin = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_");

    const wpResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_email: email,
        user_login: userLogin,
        user_nicename: name || userLogin,
        payment_email: email,
        rate: 0, // Default commission rate (0 = use site-wide rate)
        rate_type: "percentage",
        status: "active",
      }),
    });

    const wpData = await wpResponse.json();
    console.log("AffiliateWP Response:", wpData);

    if (!wpResponse.ok) {
      // If user already exists, try to fetch their ID instead of failing
      if (wpData.error_code === "user_exists" || wpData.code === "existing_user_login") {
        console.log("User exists, attempting to link existing affiliate...");
        // Logic to find existing affiliate could go here, or we just return an error
      }
      throw new Error(
        `AffiliateWP API Error: ${wpData.message || wpData.error || "Unknown error"}`
      );
    }

    const newAffiliateId = wpData.affiliate_id;
    const referralUrl = `${wpUrl}/?ref=${newAffiliateId}`;

    // 4. Update Supabase Profile with new ID
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({
        affiliatewp_id: newAffiliateId,
        affiliate_referral_url: referralUrl,
        affiliatewp_sync_status: "completed",
        affiliatewp_account_status: "active",
        last_affiliatewp_sync: new Date().toISOString(),
      })
      .eq("id", profile_id);

    if (updateError) throw updateError;

    // 5. Update sync log to mark as completed
    const { error: syncLogError } = await supabaseClient
      .from("affiliatewp_sync_log")
      .update({
        status: "completed",
        affiliatewp_id: newAffiliateId,
        completed_at: new Date().toISOString(),
      })
      .eq("profile_id", profile_id)
      .eq("operation", "create")
      .eq("status", "pending");

    if (syncLogError) {
      console.warn("Could not update sync log:", syncLogError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        affiliate_id: newAffiliateId,
        referral_url: referralUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error creating affiliate:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500, // Return 500 so pg_net/pg_cron knows to retry if needed
      }
    );
  }
});
