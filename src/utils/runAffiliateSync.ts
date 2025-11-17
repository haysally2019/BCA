import supabase from "../lib/supabaseService";

export async function runAffiliateSync() {
  const profilesRes = await supabase
    .from("profiles")
    .select("id, user_id, affiliate_id, affiliate_url");

  if (profilesRes.error) {
    console.error("DB error:", profilesRes.error);
    return;
  }

  const profiles = profilesRes.data.filter(
    (p) => !p.affiliate_id || !p.affiliate_url
  );

  for (const p of profiles) {
    const { data: user } = await supabase
      .from("auth.users")
      .select("email")
      .eq("id", p.user_id)
      .single();

    if (!user?.email) continue;

    const res = await fetch(
      `${import.meta.env.VITE_AFFILIATEWP_BASE_URL}/wp-json/affwp/v1/affiliates`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " +
            btoa(
              import.meta.env.VITE_AFFILIATEWP_PUBLIC_KEY +
                ":" +
                import.meta.env.VITE_AFFILIATEWP_TOKEN
            ),
        },
        body: JSON.stringify({
          email: user.email,
          payment_email: user.email,
          status: "active",
        }),
      }
    );

    const affiliate = await res.json();

    await supabase
      .from("profiles")
      .update({
        affiliate_id: String(affiliate.affiliate_id),
        affiliate_url:
          import.meta.env.VITE_MARKETING_URL +
          "/?ref=" +
          String(affiliate.affiliate_id),
      })
      .eq("id", p.id);
  }

  console.log("Phase 2 complete");
}