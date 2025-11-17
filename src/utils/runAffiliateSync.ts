import supabase from "../lib/supabaseService";

export async function runAffiliateSync() {
  console.log("🔄 Starting Affiliate Sync...");

  // 1. LOAD PROFILES MISSING AFFILIATE INFO
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, user_id, email, affiliate_id, affiliate_url");

  if (error) {
    console.error("❌ Profile query failed:", error);
    return;
  }

  console.log("🔍 Profiles loaded:", profiles);

  for (const p of profiles) {
    // Skip users who already have affiliate info
    if (p.affiliate_id && p.affiliate_url) {
      console.log(`✔ Skipping ${p.id}, already synced`);
      continue;
    }

    // ❗ EMAIL MUST BE STORED IN PROFILES NOW
    if (!p.email) {
      console.error(`❌ Profile ${p.id} has no email → cannot sync`);
      continue;
    }

    console.log(`📧 Syncing AffiliateWP for: ${p.email}`);

    // 2. CREATE AFFILIATE IN AFFILIATEWP
    const res = await fetch(
      `${import.meta.env.VITE_AFFWP_BASE_URL}/wp-json/affwp/v1/affiliates`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " +
            btoa(
              import.meta.env.VITE_AFFWP_PUBLIC_KEY +
                ":" +
                import.meta.env.VITE_AFFWP_TOKEN
            ),
        },
        body: JSON.stringify({
          email: p.email,
          payment_email: p.email,
          status: "active",
        }),
      }
    );

    const json = await res.json();

    if (!res.ok) {
      console.error(`❌ AffiliateWP error for ${p.email}:`, json);
      continue;
    }

    console.log(`🎉 Affiliate created:`, json);

    const affiliate_id = String(json.affiliate_id);
    const affiliate_url =
      import.meta.env.VITE_MARKETING_URL + "/?ref=" + affiliate_id;

    // 3. UPDATE PROFILE WITH GENERATED LINK
    await supabase
      .from("profiles")
      .update({
        affiliate_id,
        affiliate_url,
      })
      .eq("id", p.id);

    console.log(`✔ Profile updated: ${p.id}`);
  }

  console.log("🏁 Affiliate Sync Complete");
}