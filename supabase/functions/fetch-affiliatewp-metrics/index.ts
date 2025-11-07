import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCredentials } from "../_shared/get-credentials.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AffiliateStats {
  affiliate_id: number;
  earnings: number;
  unpaid_earnings: number;
  referrals: number;
  visits: number;
  rate: number;
}

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
          error: "AffiliateWP credentials not configured. Please configure credentials in Settings.",
          credentials_missing: true
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Fetch all affiliates from AffiliateWP with pagination
    const allAffiliates = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const affiliateResponse = await fetch(
        `${credentials.wordpress_site_url}/wp-json/affwp/v1/affiliates?number=${perPage}&offset=${(page - 1) * perPage}`,
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

      const pageAffiliates = await affiliateResponse.json();
      console.log(`Page ${page}: Fetched ${pageAffiliates.length} affiliates`);

      if (pageAffiliates.length === 0) {
        break;
      }

      allAffiliates.push(...pageAffiliates);

      if (pageAffiliates.length < perPage) {
        break;
      }

      page++;
    }

    const affiliates = allAffiliates;
    console.log(`Fetched ${affiliates.length} total affiliates from AffiliateWP`);

    // Extract metrics for each affiliate
    const metrics: AffiliateStats[] = affiliates.map((affiliate: any) => {
      const rate = parseFloat(affiliate.rate || "0");
      // AffiliateWP may return rate as decimal (0.30) or percentage (30)
      // If rate is less than 1, it's likely a decimal, convert to percentage
      const normalizedRate = rate < 1 && rate > 0 ? rate * 100 : rate;

      return {
        affiliate_id: affiliate.affiliate_id,
        earnings: parseFloat(affiliate.earnings || "0"),
        unpaid_earnings: parseFloat(affiliate.unpaid_earnings || "0"),
        referrals: parseInt(affiliate.referrals || "0", 10),
        visits: parseInt(affiliate.visits || "0", 10),
        rate: normalizedRate,
      };
    });

    // Update profiles with latest metrics
    let updatedCount = 0;
    for (const metric of metrics) {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          affiliatewp_earnings: metric.earnings,
          affiliatewp_unpaid_earnings: metric.unpaid_earnings,
          affiliatewp_referrals: metric.referrals,
          affiliatewp_visits: metric.visits,
          commission_rate: metric.rate > 0 ? metric.rate : undefined,
          last_metrics_sync: new Date().toISOString(),
        })
        .eq("affiliatewp_id", metric.affiliate_id)
        .select();

      if (data && data.length > 0) {
        updatedCount++;
        console.log(`Updated affiliate ${metric.affiliate_id} with rate ${metric.rate}%`);
      } else if (error) {
        console.error(`Failed to update affiliate ${metric.affiliate_id}:`, error);
      } else {
        console.log(`No profile found for affiliate_id ${metric.affiliate_id}`);
      }
    }

    console.log(`Successfully updated ${updatedCount} out of ${metrics.length} profiles`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Affiliate metrics synced successfully",
        metrics_count: metrics.length,
        updated_count: updatedCount,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching affiliate metrics:", error);
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