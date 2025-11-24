import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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

    const wpUrl = config.affiliatewp_site_url.replace(/\/$/, "");
    const authString = btoa(
      `${config.affiliatewp_api_username}:${config.affiliatewp_api_password}`
    );

    const { data: profiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("user_id, email, full_name")
      .is("affiliatewp_id", null)
      .not("email", "is", null);

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No users need AffiliateWP accounts",
          stats: { processed: 0, created: 0, failed: 0 },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Creating AffiliateWP accounts for ${profiles.length} users`);

    let created = 0;
    let failed = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (const profile of profiles) {
      try {
        const wpUsersUrl = `${wpUrl}/wp-json/wp/v2/users?search=${encodeURIComponent(profile.email)}`;
        const wpUsersResponse = await fetch(wpUsersUrl, {
          headers: {
            Authorization: `Basic ${authString}`,
          },
        });

        let wpUserId = null;
        if (wpUsersResponse.ok) {
          const wpUsers = await wpUsersResponse.json();
          if (wpUsers.length > 0) {
            wpUserId = wpUsers[0].id;
          }
        }

        if (!wpUserId) {
          console.log(`No WordPress user found for ${profile.email}, creating WordPress user first`);
          const createUserUrl = `${wpUrl}/wp-json/wp/v2/users`;
          const createUserResponse = await fetch(createUserUrl, {
            method: "POST",
            headers: {
              Authorization: `Basic ${authString}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: profile.email.split("@")[0] + "_" + Date.now(),
              email: profile.email,
              name: profile.full_name || profile.email.split("@")[0],
              password: crypto.randomUUID(),
              roles: ["subscriber"],
            }),
          });

          if (createUserResponse.ok) {
            const newUser = await createUserResponse.json();
            wpUserId = newUser.id;
          } else {
            const errorData = await createUserResponse.json();
            throw new Error(`Failed to create WordPress user: ${errorData.message || errorData.code}`);
          }
        }

        const apiUrl = `${wpUrl}/wp-json/affwp/v1/affiliates`;
        const wpResponse = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${authString}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: wpUserId,
            payment_email: profile.email,
            rate: 20,
            status: "active",
          }),
        });

        const wpData = await wpResponse.json();

        if (!wpResponse.ok) {
          if (wpData.error_code === "user_exists" || wpData.code === "existing_user_login") {
            console.log(`User ${profile.email} already exists in WordPress, skipping`);
            continue;
          }
          throw new Error(
            wpData.message || wpData.error || `WordPress API Error: ${wpResponse.status}`
          );
        }

        const newAffiliateId = wpData.affiliate_id;
        const referralUrl = `${wpUrl}/?ref=${newAffiliateId}`;

        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({
            affiliatewp_id: newAffiliateId,
            affiliate_url: referralUrl,
            last_affiliatewp_sync: new Date().toISOString(),
          })
          .eq("user_id", profile.user_id);

        if (updateError) {
          console.error(`Failed to update profile for ${profile.email}:`, updateError);
          throw updateError;
        }

        created++;
        console.log(`✓ Created affiliate account for ${profile.email} (ID: ${newAffiliateId})`);
      } catch (error: any) {
        failed++;
        const errorMsg = error.message || "Unknown error";
        errors.push({ email: profile.email, error: errorMsg });
        console.error(`✗ Failed to create affiliate for ${profile.email}:`, errorMsg);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Batch creation completed`,
        stats: {
          processed: profiles.length,
          created,
          failed,
        },
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Batch creation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
