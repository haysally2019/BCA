import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

let supabaseClient: any = null;

interface AffiliateWPCredentials {
  siteUrl: string;
  username: string;
  password: string;
}

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase configuration missing');
    }

    supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseClient;
}

async function getAffiliateWPCredentials(): Promise<AffiliateWPCredentials> {
  const supabase = getSupabaseClient();

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

interface UpdatePayoutRequest {
  profile_id: string;
  payout_method: string;
  paypal_email?: string;
  bank_info?: {
    account_holder_name?: string;
    bank_name?: string;
    bank_country?: string;
    bank_currency?: string;
  };
}

async function updateAffiliatePayoutEmail(
  affiliateId: number,
  paymentEmail: string,
  credentials: AffiliateWPCredentials,
  timeoutMs: number = 30000
): Promise<any> {
  const authCredentials = btoa(`${credentials.username}:${credentials.password}`);
  const apiUrl = `${credentials.siteUrl}/wp-json/affwp/v1/affiliates/${affiliateId}`;

  const payload = {
    payment_email: paymentEmail,
  };

  console.log('Updating affiliate payment email in AffiliateWP:', { affiliateId, paymentEmail });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authCredentials}`,
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AffiliateWP API Error:', response.status, errorText);
      throw new Error(`AffiliateWP API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('AffiliateWP payment email updated successfully');
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`AffiliateWP API timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  console.log('=== Update Affiliate Payout Info Function Invoked ===');
  console.log('Method:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = getSupabaseClient();
    const requestData: UpdatePayoutRequest = await req.json();
    console.log('Request data received');

    const { profile_id, payout_method, paypal_email, bank_info } = requestData;

    if (!profile_id || !payout_method) {
      throw new Error('Missing required fields: profile_id, payout_method');
    }

    console.log('Step 1: Fetching profile and AffiliateWP ID');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, affiliatewp_id, company_email')
      .eq('id', profile_id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    if (!profile) {
      throw new Error('Profile not found');
    }

    if (!profile.affiliatewp_id) {
      throw new Error('AffiliateWP account not found for this profile');
    }

    console.log('Step 2: Determining payment email');
    let paymentEmail = profile.company_email;
    if (payout_method === 'paypal' && paypal_email) {
      paymentEmail = paypal_email;
    }

    console.log('Step 3: Updating AffiliateWP payment email');
    const credentials = await getAffiliateWPCredentials();
    await updateAffiliatePayoutEmail(profile.affiliatewp_id, paymentEmail, credentials);

    console.log('Step 4: Updating profile payout preferences');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        preferred_payout_method: payout_method,
        payout_setup_completed: true,
        last_payout_sync: new Date().toISOString(),
      })
      .eq('id', profile_id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    console.log('Step 5: Storing payout information in database');
    const payoutData: any = {
      profile_id: profile_id,
      payout_method: payout_method,
      verification_status: 'pending',
    };

    if (payout_method === 'paypal' && paypal_email) {
      payoutData.paypal_email = paypal_email;
    }

    if (payout_method === 'bank_transfer' && bank_info) {
      payoutData.account_holder_name = bank_info.account_holder_name;
      payoutData.bank_name = bank_info.bank_name;
      payoutData.bank_country = bank_info.bank_country;
      payoutData.bank_currency = bank_info.bank_currency || 'USD';
    }

    const { data: existingPayout } = await supabase
      .from('payout_information')
      .select('id')
      .eq('profile_id', profile_id)
      .eq('is_default', true)
      .maybeSingle();

    let payoutResult;
    if (existingPayout) {
      const { data, error: upsertError } = await supabase
        .from('payout_information')
        .update(payoutData)
        .eq('id', existingPayout.id)
        .select()
        .single();

      payoutResult = data;
      if (upsertError) {
        console.error('Error updating payout information:', upsertError);
        throw new Error(`Failed to update payout information: ${upsertError.message}`);
      }
    } else {
      const { data, error: insertError } = await supabase
        .from('payout_information')
        .insert(payoutData)
        .select()
        .single();

      payoutResult = data;
      if (insertError) {
        console.error('Error inserting payout information:', insertError);
        throw new Error(`Failed to insert payout information: ${insertError.message}`);
      }
    }

    console.log('=== SUCCESS: Payout information updated ===');
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payout information updated successfully',
        payout_id: payoutResult.id,
        affiliatewp_synced: true,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('=== ERROR: Payout information update failed ===');
    console.error('Error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
