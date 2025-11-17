// netlify/functions/affiliatewp-batch-sync.ts

import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// AffiliateWP API creds
const API_BASE = process.env.AFFWP_BASE_URL!;
const PUBLIC_KEY = process.env.AFFWP_PUBLIC_KEY!;
const TOKEN = process.env.AFFWP_TOKEN!;
const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_SITE_URL!;

function authHeader() {
  const token = Buffer.from(`${PUBLIC_KEY}:${TOKEN}`).toString("base64");
  return `Basic ${token}`;
}

export const handler: Handler = async () => {
  // 1. Load profiles missing affiliate_id or affiliate_url
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, user_id")
    .or("affiliate_id.is.null,affiliate_url.is.null");

  if (error) {
    console.error("DB Error:", error);
    return { statusCode: 500, body: "Database Error" };
  }

  if (!profiles || profiles.length === 0) {
    return { statusCode: 200, body: "No profiles need syncing." };
  }

  let results: any[] = [];

  for (const profile of profiles) {
    // 2. Fetch user email from auth.users
    const { data: userData } = await supabase
      .from("auth.users")
      .select("email")
      .eq("id", profile.user_id)
      .single();

    const email = userData?.email;
    if (!email) {
      results.push({ profile_id: profile.id, ok: false, reason: "No email found" });
      continue;
    }

    // 3. Create affiliate in AffiliateWP
    const createRes = await fetch(`${API_BASE}/wp-json/affwp/v1/affiliates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
      body: JSON.stringify({
        email,
        payment_email: email,
        status: "active",
      }),
    });

    if (!createRes.ok) {
      results.push({
        profile_id: profile.id,
        ok: false,
        reason: "AffiliateWP rejected request",
      });
      continue;
    }

    const affiliate = await createRes.json();

    const affiliate_id = String(affiliate.affiliate_id);
    const affiliate_url = `${MARKETING_URL}/?ref=${affiliate_id}`;

    // 4. Update profile table
    await supabase
      .from("profiles")
      .update({ affiliate_id, affiliate_url })
      .eq("id", profile.id);

    results.push({
      profile_id: profile.id,
      ok: true,
      email,
      affiliate_id,
      affiliate_url,
    });
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ synced: results }, null, 2),
  };
};

export default handler;