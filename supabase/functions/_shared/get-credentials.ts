export async function getCredentials(supabase: any) {
  const { data: settings, error } = await supabase
    .from("app_settings")
    .select("wordpress_site_url, consumer_key, consumer_secret")
    .eq("key", "affiliatewp_credentials")
    .maybeSingle();

  if (error || !settings) {
    throw new Error("AffiliateWP credentials not configured");
  }

  return settings;
}