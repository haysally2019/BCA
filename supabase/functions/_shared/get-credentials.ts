import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

export interface AffiliateWPCredentials {
  siteUrl: string;
  username: string;
  password: string;
}

export async function getAffiliateWPCredentials(): Promise<AffiliateWPCredentials> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase configuration missing');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['affiliatewp_site_url', 'affiliatewp_api_username', 'affiliatewp_api_password']);

  if (error) {
    throw new Error(`Failed to fetch credentials: ${error.message}`);
  }

  if (!data || data.length !== 3) {
    throw new Error('AffiliateWP credentials not configured in database');
  }

  const credentials: Record<string, string> = {};
  data.forEach((item: any) => {
    credentials[item.key] = item.value;
  });

  return {
    siteUrl: credentials.affiliatewp_site_url,
    username: credentials.affiliatewp_api_username,
    password: credentials.affiliatewp_api_password,
  };
}