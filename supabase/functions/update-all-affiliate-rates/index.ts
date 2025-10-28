import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

interface AffiliateWPCredentials {
  wordpress_site_url: string;
  consumer_key: string;
  consumer_secret: string;
}

async function getCredentials(supabase: any): Promise<AffiliateWPCredentials | null> {
  try {
    const { data: settings, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["affiliatewp_site_url", "affiliatewp_api_username", "affiliatewp_api_password"]);

    if (error) {
      console.error("Error fetching AffiliateWP credentials:", error);
      return null;
    }

    if (!settings || settings.length !== 3) {
      console.warn("AffiliateWP credentials not properly configured");
      return null;
    }

    const credentials: Record<string, string> = {};
    settings.forEach((setting: any) => {
      credentials[setting.key] = setting.value;
    });

    return {
      wordpress_site_url: credentials.affiliatewp_site_url,
      consumer_key: credentials.affiliatewp_api_username,
      consumer_secret: credentials.affiliatewp_api_password,
    };
  } catch (error) {
    console.error("Exception in getCredentials:", error);
    return null;
  }
}

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

    if (!credentials) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "AffiliateWP credentials not configured",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("Fetching all affiliates from AffiliateWP...");

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
    console.log(`Found ${affiliates.length} affiliates to update`);

    const results = {
      total: affiliates.length,
      updated: 0,
      skipped: 0,
      errors: [] as any[],
    };

    // Update each affiliate to 30% rate
    for (const affiliate of affiliates) {
      const currentRate = parseFloat(affiliate.rate || "0");

      // Skip if already at 30%
      if (currentRate === 30 || currentRate === 0.30) {
        console.log(`Affiliate ${affiliate.affiliate_id} already at 30%, skipping`);
        results.skipped++;
        continue;
      }

      console.log(`Updating affiliate ${affiliate.affiliate_id} from ${currentRate}% to 30%`);

      try {
        const updateResponse = await fetch(
          `${credentials.wordpress_site_url}/wp-json/affwp/v1/affiliates/${affiliate.affiliate_id}`,
          {
            method: "POST",
            headers: {
              "Authorization": `Basic ${btoa(`${credentials.consumer_key}:${credentials.consumer_secret}`)}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              rate: "30",
              rate_type: "percentage",
            }),
          }
        );

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error(`Failed to update affiliate ${affiliate.affiliate_id}:`, errorText);
          results.errors.push({
            affiliate_id: affiliate.affiliate_id,
            name: affiliate.name || affiliate.username,
            error: errorText,
          });
        } else {
          console.log(`Successfully updated affiliate ${affiliate.affiliate_id} to 30%`);
          results.updated++;
        }
      } catch (error) {
        console.error(`Error updating affiliate ${affiliate.affiliate_id}:`, error);
        results.errors.push({
          affiliate_id: affiliate.affiliate_id,
          name: affiliate.name || affiliate.username,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(`Update complete: ${results.updated} updated, ${results.skipped} skipped, ${results.errors.length} errors`);

    // Now sync the updated rates back to the portal
    console.log("Syncing updated rates to portal profiles...");
    const syncResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/fetch-affiliatewp-metrics`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          "Content-Type": "application/json",
        },
      }
    );

    const syncData = await syncResponse.json();
    console.log("Sync response:", syncData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Affiliate rates updated successfully",
        results: {
          total_affiliates: results.total,
          updated_to_30_percent: results.updated,
          already_at_30_percent: results.skipped,
          errors: results.errors.length,
          error_details: results.errors,
        },
        sync_results: syncData,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error updating affiliate rates:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
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