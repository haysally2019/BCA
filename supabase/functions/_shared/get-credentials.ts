export interface AffiliateWPCredentials {
  wordpress_site_url: string;
  consumer_key: string;
  consumer_secret: string;
}

export async function getCredentials(supabase: any): Promise<AffiliateWPCredentials | null> {
  try {
    const { data: settings, error } = await supabase
      .from("app_settings")
      .select("wordpress_site_url, consumer_key, consumer_secret")
      .eq("key", "affiliatewp_credentials")
      .maybeSingle();

    if (error) {
      console.error("Error fetching AffiliateWP credentials:", error);
      return null;
    }

    if (!settings || !settings.wordpress_site_url || !settings.consumer_key || !settings.consumer_secret) {
      console.warn("AffiliateWP credentials not properly configured");
      return null;
    }

    return settings;
  } catch (error) {
    console.error("Exception in getCredentials:", error);
    return null;
  }
}