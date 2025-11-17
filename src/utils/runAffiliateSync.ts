import supabase from "../lib/supabaseService";

export async function runAffiliateSync() {
  console.log("🔄 Starting Affiliate Sync...");

  // 1. Load profiles missing data
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, user_id, affiliate_id, affiliate_url");

  if (profileError) {
    console.error("❌ Profile load error:", profileError);
    return;
  }

  console.log("🔍 Found profiles:", profiles);

  for (const p of profiles) {
    if (p.affiliate_id && p.affiliate_url) {
      console.log(`✔ Skipping ${p.id}, already synced`);
      continue;
    }

    // 2. Get email from auth.users
    const { data: authUser, error: userError } = await supabase
      .from("auth.users")
      .select("email")
      .eq("id", p.user_id)
      .single();

    if (userError || !authUser) {
      console.error(`❌ No email found for profile ${p.id}`);
      continue;
    }

    console.log(`📧 Syncing ${authUser.email}`);

    // 3. Create affiliate in AffiliateWP
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
          email: authUser.email,
          payment_email: authUser.email,
          status: "active",
        }),
      }
    );

    const json = await res.json();

    if (!res.ok) {
      console.error(`❌ AffiliateWP error for ${authUser.email}`, json);
      continue;
    }

    console.log(`🎉 Created affiliate for ${authUser.email}`, json);

    // 4. Update profile
    await supabase
      .from("profiles")
      .update({
        affiliate_id: String(json.affiliate_id),
        affiliate_url:
          import.meta.env.VITE_MARKETING_URL +
          "/?ref=" +
          String(json.affiliate_id),
      })
      .eq("id", p.id);

    console.log(`✔ Updated profile ${p.id}`);
  }

  console.log("🏁 Sync complete!");
}