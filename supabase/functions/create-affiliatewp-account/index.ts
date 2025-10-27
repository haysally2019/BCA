import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateAffiliateRequest {
  profile_id: string;
  user_id: string;
  email: string;
  name: string;
  phone?: string;
}

interface AffiliateWPResponse {
  affiliate_id: number;
  user_id: number;
  rest_id: string;
  username: string;
  status: string;
}

async function createAffiliateInWordPress(
  email: string,
  name: string,
  phone?: string
): Promise<AffiliateWPResponse> {
  const wpUrl = Deno.env.get('AFFILIATEWP_SITE_URL');
  const wpUsername = Deno.env.get('AFFILIATEWP_API_USERNAME');
  const wpAppPassword = Deno.env.get('AFFILIATEWP_API_PASSWORD');

  if (!wpUrl || !wpUsername || !wpAppPassword) {
    throw new Error('AffiliateWP API credentials not configured');
  }

  console.log('Creating affiliate in WordPress:', { email, name });

  const apiUrl = `${wpUrl}/wp-json/affwp/v2/affiliates`;
  const credentials = btoa(`${wpUsername}:${wpAppPassword}`);

  const nameParts = name.split(' ');
  const firstName = nameParts[0] || name;
  const lastName = nameParts.slice(1).join(' ') || '';
  const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

  const payload = {
    user_login: username,
    user_email: email,
    first_name: firstName,
    last_name: lastName,
    payment_email: email,
    status: 'active',
    rate_type: 'percentage',
    flat_rate_basis: 'per_product',
    dynamic_coupon: 0,
  };

  console.log('Sending request to AffiliateWP API:', apiUrl);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AffiliateWP API Error:', response.status, errorText);
    throw new Error(`AffiliateWP API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('AffiliateWP API Success:', JSON.stringify(result, null, 2));

  return result;
}

async function logSyncOperation(
  supabase: any,
  profileId: string,
  affiliatewpId: number | null,
  status: 'pending' | 'processing' | 'success' | 'failed',
  requestData: any,
  responseData: any = null,
  errorMessage: string | null = null
): Promise<void> {
  try {
    const logEntry = {
      profile_id: profileId,
      affiliatewp_id: affiliatewpId,
      operation: 'create',
      sync_direction: 'portal_to_affiliatewp',
      status,
      request_payload: requestData,
      response_payload: responseData,
      error_message: errorMessage,
      processed_at: status === 'success' || status === 'failed' ? new Date().toISOString() : null,
    };

    const { error } = await supabase
      .from('affiliatewp_sync_log')
      .insert(logEntry);

    if (error) {
      console.error('Failed to log sync operation:', error);
    } else {
      console.log('Sync operation logged successfully');
    }
  } catch (err) {
    console.error('Exception logging sync operation:', err);
  }
}

Deno.serve(async (req: Request) => {
  console.log('=== Create AffiliateWP Account Function Invoked ===');
  console.log('Method:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
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

    console.log('Step 1: Parsing request body');
    const requestData: CreateAffiliateRequest = await req.json();
    console.log('Request data:', { 
      profile_id: requestData.profile_id, 
      email: requestData.email, 
      name: requestData.name 
    });

    const { profile_id, email, name, phone } = requestData;

    if (!profile_id || !email || !name) {
      throw new Error('Missing required fields: profile_id, email, name');
    }

    console.log('Step 2: Checking if profile already has AffiliateWP ID');
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('affiliatewp_id, affiliatewp_sync_status')
      .eq('id', profile_id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    if (existingProfile?.affiliatewp_id) {
      console.log('Profile already has AffiliateWP ID:', existingProfile.affiliatewp_id);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Profile already has an AffiliateWP account',
          affiliatewp_id: existingProfile.affiliatewp_id,
          skipped: true,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('Step 3: Updating profile sync status to syncing');
    await supabase
      .from('profiles')
      .update({ affiliatewp_sync_status: 'syncing' })
      .eq('id', profile_id);

    console.log('Step 4: Creating affiliate in WordPress');
    await logSyncOperation(supabase, profile_id, null, 'processing', { email, name, phone });

    let affiliateResponse: AffiliateWPResponse;
    try {
      affiliateResponse = await createAffiliateInWordPress(email, name, phone);
      console.log('Successfully created affiliate:', affiliateResponse);
    } catch (wpError) {
      console.error('WordPress API error:', wpError);
      await logSyncOperation(
        supabase, 
        profile_id, 
        null, 
        'failed', 
        { email, name, phone },
        null,
        wpError instanceof Error ? wpError.message : String(wpError)
      );
      throw wpError;
    }

    console.log('Step 5: Updating profile with AffiliateWP ID');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        affiliatewp_id: affiliateResponse.affiliate_id,
        affiliatewp_sync_status: 'synced',
        affiliatewp_account_status: 'active',
        last_affiliatewp_sync: new Date().toISOString(),
        affiliatewp_sync_error: null,
      })
      .eq('id', profile_id);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      await logSyncOperation(
        supabase,
        profile_id,
        affiliateResponse.affiliate_id,
        'failed',
        { email, name, phone },
        affiliateResponse,
        `Profile update failed: ${updateError.message}`
      );
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    console.log('Step 6: Logging successful sync operation');
    await logSyncOperation(
      supabase,
      profile_id,
      affiliateResponse.affiliate_id,
      'success',
      { email, name, phone },
      affiliateResponse
    );

    console.log('Step 7: Creating affiliate record in affiliates table');
    try {
      const { error: affiliateError } = await supabase
        .from('affiliates')
        .insert({
          affiliate_id: affiliateResponse.affiliate_id,
          name: name,
          email: email,
          phone: phone,
          status: 'active',
          upfront_rate: 10.00,
          residual_rate: 5.00,
          tier_level: 'standard',
          onboarding_status: 'completed',
        });

      if (affiliateError && affiliateError.code !== '23505') {
        console.error('Warning: Failed to create affiliate record:', affiliateError);
      } else {
        console.log('Affiliate record created successfully');
      }
    } catch (err) {
      console.error('Exception creating affiliate record (non-fatal):', err);
    }

    console.log('=== SUCCESS: AffiliateWP account created ===' );
    return new Response(
      JSON.stringify({
        success: true,
        message: 'AffiliateWP account created successfully',
        affiliatewp_id: affiliateResponse.affiliate_id,
        wordpress_user_id: affiliateResponse.user_id,
        username: affiliateResponse.username,
        status: affiliateResponse.status,
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
    console.error('=== ERROR: AffiliateWP account creation failed ===');
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