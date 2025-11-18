export interface AffiliateWPCredentials {
  wordpress_site_url: string;
  consumer_key: string;
  consumer_secret: string;
}

export async function getCredentials(supabase: any): Promise<AffiliateWPCredentials | null> {
  try {
    const { data: settings, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["affiliatewp_site_url", "affiliatewp_api_username", "affiliatewp_api_password"]);

    if (error) {
      console.error("Error fetching AffiliateWP credentials:", error);
      return null;
    }

    if (!settings || settings.length !== 3) {
      console.warn("AffiliateWP credentials not properly configured");
      return null;
    }

    const credentials: Record<string, string> = {};
    settings.forEach((setting: any) => {
      credentials[setting.key] = setting.value;
    });

    return {
      wordpress_site_url: credentials.affiliatewp_site_url,
      consumer_key: credentials.affiliatewp_api_username,
      consumer_secret: credentials.affiliatewp_api_password,
    };
  } catch (error) {
    console.error("Exception in getCredentials:", error);
    return null;
  }
}

export const getAffiliateWPCredentials = getCredentials;