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
      .select("key, value")
      .in("key", [
        "affiliatewp_site_url",
        "affiliatewp_api_username",
        "affiliatewp_api_password",
      ]);

    if (settingsError || !settings) {
      throw new Error("Could not load AffiliateWP settings from database");
    }

    const config = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    if (
      !config.affiliatewp_site_url ||
      !config.affiliatewp_api_username ||
      !config.affiliatewp_api_password
    ) {
      throw new Error("Incomplete AffiliateWP configuration in app_settings");
    }

    // 3. Call AffiliateWP API to create the affiliate
    // We use the /affiliates endpoint with create_user=true
    const authString = btoa(
      `${config.affiliatewp_api_username}:${config.affiliatewp_api_password}`
    );
    const wpUrl = config.affiliatewp_site_url.replace(/\/$/, ""); // Remove trailing slash
    const apiUrl = `${wpUrl}/wp-json/affwp/v1/affiliates`;

    console.log(`Creating affiliate for ${email} at ${apiUrl}`);

    const wpResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        create_user: true, // Auto-create WP user
        user_email: email,
        user_login: email,
        user_name: name || email.split("@")[0],
        payment_email: email,
        rate: 20, // Default commission rate (adjust as needed)
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
        affiliate_url: referralUrl,
        affiliatewp_status: "active",
        last_metrics_sync: new Date().toISOString(),
      })
      .eq("id", profile_id);

    if (updateError) throw updateError;

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