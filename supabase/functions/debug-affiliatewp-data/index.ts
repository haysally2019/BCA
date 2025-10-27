import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCredentials } from "./_shared/get-credentials.ts";

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

    // Get AffiliateWP credentials
    const credentials = await getCredentials(supabase);

    // Fetch all affiliates from AffiliateWP
    const affiliateResponse = await fetch(
      `${credentials.wordpress_site_url}/wp-json/affwp/v1/affiliates`,
      {
        method: "GET",
        headers: {
          "Authorization": `Basic ${btoa(`${credentials.consumer_key}:${credentials.consumer_secret}`)}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!affiliateResponse.ok) {
      throw new Error(`AffiliateWP API error: ${affiliateResponse.status}`);
    }

    const affiliates = await affiliateResponse.json();

    // Find haydensalyer4 and return raw data
    const hayden = affiliates.find((a: any) =>
      a.username?.toLowerCase().includes('hayden') ||
      a.user_login?.toLowerCase().includes('hayden')
    );

    // Also get all profiles to check matching
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, affiliatewp_id, commission_rate")
      .not("affiliatewp_id", "is", null);

    return new Response(
      JSON.stringify({
        success: true,
        hayden_from_api: hayden,
        sample_affiliates: affiliates.slice(0, 3),
        profiles_in_db: profiles,
        total_affiliates_from_api: affiliates.length,
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