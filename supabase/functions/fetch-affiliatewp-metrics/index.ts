import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { affwpRequest, sqlDate } from "../_shared/affwp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function upsert(path: string, rows: unknown[]) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(await res.text());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const days = Number(url.searchParams.get("days") ?? "30");
    const requestedAffiliateId = url.searchParams.get("affiliate_id");

    const affRes = await fetch(`${SUPABASE_URL}/rest/v1/affiliates?select=affiliate_id,affiliatewp_id`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const affiliates = (await affRes.json()) as { affiliate_id: number; affiliatewp_id: string }[];

    const filteredAffiliates = requestedAffiliateId
      ? affiliates.filter(a => a.affiliatewp_id === requestedAffiliateId || String(a.affiliate_id) === requestedAffiliateId)
      : affiliates;

    const rows: any[] = [];
    const today = sqlDate(new Date());

    for (const a of filteredAffiliates) {
      try {
        const stats = await affwpRequest("affiliates", {
          affiliate_id: a.affiliate_id,
        });

        if (stats && stats[0]) {
          const affiliate = stats[0];
          rows.push({
            affiliate_id: a.affiliate_id,
            date: today,
            visits: Number(affiliate.visits ?? 0),
            referrals: Number(affiliate.referrals ?? 0),
            earnings: Number(affiliate.earnings ?? 0),
            unpaid_earnings: Number(affiliate.unpaid_earnings ?? 0),
          });
        }
      } catch (err) {
        console.error(`Failed to fetch stats for affiliate ${a.affiliate_id}:`, err);
      }
    }

    if (rows.length) {
      await upsert("affiliate_metrics_daily", rows);
    }

    return new Response(
      JSON.stringify({ ok: true, count: rows.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("Metrics fetch error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
