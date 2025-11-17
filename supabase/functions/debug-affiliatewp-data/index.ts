import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['affiliatewp_site_url', 'affiliatewp_api_username', 'affiliatewp_api_password']);

    if (settingsError || !settings || settings.length !== 3) {
      throw new Error('Failed to fetch AffiliateWP credentials');
    }

    const credentials: Record<string, string> = {};
    settings.forEach((item: any) => {
      credentials[item.key] = item.value;
    });

    const affiliateResponse = await fetch(
      `${credentials.affiliatewp_site_url}/wp-json/affwp/v1/affiliates`,
      {
        method: "GET",
        headers: {
          "Authorization": `Basic ${btoa(`${credentials.affiliatewp_api_username}:${credentials.affiliatewp_api_password}`)}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!affiliateResponse.ok) {
      throw new Error(`AffiliateWP API error: ${affiliateResponse.status}`);
    }

    const affiliates = await affiliateResponse.json();

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, affiliatewp_id")
      .not("affiliatewp_id", "is", null);

    return new Response(
      JSON.stringify({
        success: true,
        total_affiliates_from_api: affiliates.length,
        sample_affiliates: affiliates.slice(0, 5),
        profiles_in_db_with_affiliate_id: profiles?.length || 0,
        all_affiliates: affiliates,
      }, null, 2),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching affiliate data:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});