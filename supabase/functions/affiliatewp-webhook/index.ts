import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { verifyAffiliateWpSignature, sqlDate } from "../_shared/affwp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-affiliatewp-signature",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("AFFILIATEWP_WEBHOOK_SECRET") || "";

async function upsert(path: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const raw = await req.text();
    const sig = req.headers.get("x-affiliatewp-signature");

    if (WEBHOOK_SECRET) {
      const ok = await verifyAffiliateWpSignature(raw, sig, WEBHOOK_SECRET);
      if (!ok) {
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const event = JSON.parse(raw);
    const now = new Date();
    const today = sqlDate(now);

    if (event.referral) {
      const r = event.referral;
      const affiliate_id = Number(r.affiliate_id ?? r.affiliate ?? 0);
      const amount = Number(r.amount ?? 0);
      const status = String(r.status ?? "unpaid");
      const created_at = r.date ? new Date(r.date).toISOString() : now.toISOString();

      await upsert("affiliate_referrals", [
        {
          affiliate_id,
          referral_id: String(r.referral_id ?? r.id ?? ""),
          status,
          amount,
          description: r.description ?? null,
          origin_url: r.url ?? null,
          order_id: r.reference ?? null,
          created_at,
        },
      ]);

      await upsert("affiliate_metrics_daily", [
        {
          affiliate_id,
          date: today,
          referrals: 1,
        },
      ]);

      await upsert("commission_entries", [
        {
          affiliate_id: String(affiliate_id),
          commission_amount: amount,
          status,
          affiliatewp_referral_id: r.referral_id ?? r.id ?? null,
          webhook_data: event,
        },
      ]);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
