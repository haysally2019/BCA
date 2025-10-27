import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateAffiliateRequest {
  profile_id: string;
  email: string;
  name: string;
  username?: string;
  rate?: number;
  rate_type?: 'percentage' | 'flat';
  status?: 'active' | 'inactive' | 'pending' | 'rejected';
}

interface AffiliateWPResponse {
  affiliate_id?: number;
  user_id?: number;
  rate?: number;
  rate_type?: string;
  status?: string;
  error?: string;
  message?: string;
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const affiliateWPSiteUrl = Deno.env.get('AFFILIATEWP_SITE_URL');
    const affiliateWPPublicKey = Deno.env.get('AFFILIATEWP_API_PUBLIC_KEY');
    const affiliateWPToken = Deno.env.get('AFFILIATEWP_API_TOKEN');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    if (!affiliateWPSiteUrl || !affiliateWPPublicKey || !affiliateWPToken) {
      console.warn('AffiliateWP API credentials not configured - skipping affiliate account creation');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'AffiliateWP API not configured',
          message: 'AffiliateWP integration is not set up. Please configure API credentials.',
          skip: true
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

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const supabaseClient = createClient(supabaseUrl, anonKey);

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized: Invalid authentication');
    }

    console.log('User authenticated:', user.id);

    const requestData: CreateAffiliateRequest = await req.json();
    console.log('Request data:', { profile_id: requestData.profile_id, email: requestData.email, name: requestData.name });

    const { profile_id, email, name, username, rate, rate_type, status } = requestData;

    if (!profile_id || !email || !name) {
      throw new Error('Missing required fields: profile_id, email, name');
    }

    const defaultUpfrontRate = parseFloat(Deno.env.get('AFFILIATEWP_DEFAULT_UPFRONT_RATE') || '15');
    const affiliateRate = rate || defaultUpfrontRate;
    const affiliateRateType = rate_type || 'percentage';
    const affiliateStatus = status || 'active';

    const syncLogData = {
      profile_id,
      operation: 'create',
      status: 'pending',
      request_payload: {
        email,
        name,
        username,
        rate: affiliateRate,
        rate_type: affiliateRateType,
        status: affiliateStatus
      },
      retry_count: 0
    };

    const { data: syncLog, error: syncLogError } = await supabaseAdmin
      .from('affiliatewp_sync_log')
      .insert(syncLogData)
      .select()
      .single();

    if (syncLogError) {
      console.error('Failed to create sync log:', syncLogError);
    }

    const syncLogId = syncLog?.id;

    console.log('Creating AffiliateWP account via REST API...');

    const generatedUsername = username || email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

    const affiliateWPEndpoint = `${affiliateWPSiteUrl}/wp-json/affwp/v1/affiliates`;
    const apiCredentials = btoa(`${affiliateWPPublicKey}:${affiliateWPToken}`);

    const affiliateWPPayload = new URLSearchParams({
      create_user: '1',
      payment_email: email,
      username: generatedUsername,
      rate: affiliateRate.toString(),
      rate_type: affiliateRateType,
      status: affiliateStatus
    });

    console.log('Calling AffiliateWP API:', affiliateWPEndpoint);

    const affiliateWPResponse = await fetch(affiliateWPEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${apiCredentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: affiliateWPPayload.toString()
    });

    const responseText = await affiliateWPResponse.text();
    console.log('AffiliateWP API Response Status:', affiliateWPResponse.status);
    console.log('AffiliateWP API Response:', responseText);

    let affiliateWPData: AffiliateWPResponse;
    try {
      affiliateWPData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse AffiliateWP response:', parseError);
      throw new Error(`Invalid response from AffiliateWP API: ${responseText.substring(0, 200)}`);
    }

    if (!affiliateWPResponse.ok || affiliateWPData.error) {
      const errorMessage = affiliateWPData.error || affiliateWPData.message || 'Unknown error from AffiliateWP API';
      console.error('AffiliateWP API Error:', errorMessage);

      if (syncLogId) {
        await supabaseAdmin
          .from('affiliatewp_sync_log')
          .update({
            status: 'failed',
            error_message: errorMessage,
            response_payload: affiliateWPData,
            updated_at: new Date().toISOString()
          })
          .eq('id', syncLogId);
      }

      throw new Error(`AffiliateWP API error: ${errorMessage}`);
    }

    const affiliateId = affiliateWPData.affiliate_id;
    const wordpressUserId = affiliateWPData.user_id;

    if (!affiliateId) {
      throw new Error('AffiliateWP API did not return affiliate_id');
    }

    console.log('AffiliateWP account created successfully:', { affiliateId, wordpressUserId });

    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        affiliatewp_id: affiliateId,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile_id);

    if (updateProfileError) {
      console.error('Failed to update profile with affiliatewp_id:', updateProfileError);
    } else {
      console.log('Profile updated with affiliatewp_id:', affiliateId);
    }

    if (syncLogId) {
      await supabaseAdmin
        .from('affiliatewp_sync_log')
        .update({
          status: 'success',
          affiliatewp_id: affiliateId,
          wordpress_user_id: wordpressUserId,
          response_payload: affiliateWPData,
          updated_at: new Date().toISOString()
        })
        .eq('id', syncLogId);
    }

    const { data: affiliateRecord, error: affiliateError } = await supabaseAdmin
      .from('affiliates')
      .select('id')
      .eq('affiliate_id', affiliateId)
      .maybeSingle();

    if (!affiliateRecord) {
      console.log('Creating affiliate record in database...');
      const { error: insertAffiliateError } = await supabaseAdmin
        .from('affiliates')
        .insert({
          affiliate_id: affiliateId,
          name: name,
          email: email,
          status: affiliateStatus,
          upfront_rate: affiliateRateType === 'percentage' ? affiliateRate : null,
          residual_rate: affiliateRateType === 'percentage' ? (affiliateRate * 0.5) : null,
          tier_level: 'standard',
          onboarding_status: 'completed'
        });

      if (insertAffiliateError) {
        console.error('Failed to create affiliate record:', insertAffiliateError);
      } else {
        console.log('Affiliate record created successfully');
      }
    } else {
      console.log('Affiliate record already exists');
    }

    console.log('=== AffiliateWP Account Creation Complete ===');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'AffiliateWP account created successfully',
        data: {
          affiliate_id: affiliateId,
          wordpress_user_id: wordpressUserId,
          rate: affiliateRate,
          rate_type: affiliateRateType,
          status: affiliateStatus,
          username: generatedUsername
        }
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
    console.error('=== Error in create-affiliatewp-account function ===');
    console.error('Error:', error);

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    let statusCode = 500;
    let errorMessage = 'An unknown error occurred';

    if (error instanceof Error) {
      errorMessage = error.message;

      if (errorMessage.includes('Unauthorized') || errorMessage.includes('authorization')) {
        statusCode = 403;
      } else if (errorMessage.includes('Missing required') || errorMessage.includes('Invalid')) {
        statusCode = 400;
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: statusCode,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});