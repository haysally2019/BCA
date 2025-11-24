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

    const payload = await req.json();
    console.log("Received payload:", payload);

    const { email, name, user_id, profile_id } = payload;

    if (!email || !profile_id) {
      throw new Error("Missing required fields: email or profile_id");
    }

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

    const authString = btoa(
      `${config.affiliatewp_api_username}:${config.affiliatewp_api_password}`
    );
    const wpUrl = config.affiliatewp_site_url.replace(/\/$/, "");
    const apiUrl = `${wpUrl}/wp-json/affwp/v1/affiliates`;

    console.log(`Creating affiliate for ${email} at ${apiUrl}`);

    const userLogin = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const wpUserUrl = `${wpUrl}/wp-json/wp/v2/users`;

    console.log(`Creating WordPress user at ${wpUserUrl}`);

    const userResponse = await fetch(wpUserUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: userLogin,
        email: email,
        name: name || userLogin,
        password: Math.random().toString(36).slice(-12) + "Aa1!",
        roles: ["subscriber"],
      }),
    });

    let wpUserId: number;

    if (!userResponse.ok) {
      const userData = await userResponse.json();
      if (userData.code === "existing_user_login" || userData.code === "existing_user_email") {
        console.log("User already exists, fetching existing user ID");
        const getUserUrl = `${wpUrl}/wp-json/wp/v2/users?search=${encodeURIComponent(email)}`;
        const existingUserResponse = await fetch(getUserUrl, {
          headers: {
            Authorization: `Basic ${authString}`,
          },
        });
        const existingUsers = await existingUserResponse.json();
        if (existingUsers && existingUsers.length > 0) {
          wpUserId = existingUsers[0].id;
          console.log(`Found existing user ID: ${wpUserId}`);
        } else {
          throw new Error("User exists but could not fetch user ID");
        }
      } else {
        throw new Error(`WordPress user creation failed: ${userData.message || JSON.stringify(userData)}`);
      }
    } else {
      const userData = await userResponse.json();
      wpUserId = userData.id;
      console.log(`Created new WordPress user ID: ${wpUserId}`);
    }

    const wpResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: wpUserId,
        payment_email: email,
        rate: 0,
        rate_type: "percentage",
        status: "active",
      }),
    });

    const wpData = await wpResponse.json();
    console.log("AffiliateWP Response:", wpData);

    if (!wpResponse.ok) {
      if (wpData.error_code === "user_exists" || wpData.code === "existing_user_login") {
        console.log("User exists, attempting to link existing affiliate...");
      }
      throw new Error(
        `AffiliateWP API Error: ${wpData.message || wpData.error || "Unknown error"}`
      );
    }

    const newAffiliateId = wpData.affiliate_id;
    const referralUrl = `${wpUrl}/?ref=${newAffiliateId}`;

    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({
        affiliatewp_id: newAffiliateId,
        affiliate_url: referralUrl,
        affiliatewp_sync_status: "completed",
        affiliatewp_account_status: "active",
        last_affiliatewp_sync: new Date().toISOString(),
      })
      .eq("user_id", profile_id);

    if (updateError) throw updateError;

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
        status: 500,
      }
    );
  }
});
