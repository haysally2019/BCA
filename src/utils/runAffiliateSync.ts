import supabase from "../lib/supabaseService";

export async function runAffiliateSync() {
  console.log("🔄 Affiliate Sync Start");

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, user_id, email, affiliate_id, affiliate_url");

  if (error) {
    console.error("Profile query failed:", error);
    return;
  }

  for (const p of profiles) {
    if (p.affiliate_id && p.affiliate_url) {
      continue;
    }

    if (!p.email) {
      console.error("Profile missing email:", p.id);
      continue;
    }

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
      console.error("AffiliateWP Error:", json);
      continue;
    }

    const affiliate_id = String(json.affiliate_id);
    const affiliate_url =
      import.meta.env.VITE_MARKETING_URL + "/?ref=" + affiliate_id;

    await supabase
      .from("profiles")
      .update({ affiliate_id, affiliate_url })
      .eq("id", p.id);

    console.log(`✔ Updated affiliate for profile ${p.id}`);
  }

  console.log("🏁 Affiliate Sync Complete");
}