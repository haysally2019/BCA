import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getAffiliateWPCredentials } from '../_shared/get-credentials.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('Testing AffiliateWP connection...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let wpUrl: string;
    let wpUsername: string;
    let wpAppPassword: string;

    try {
      const credentials = await getAffiliateWPCredentials(supabaseClient);

      if (!credentials) {
        throw new Error('Credentials are null - check app_settings table');
      }

      wpUrl = credentials.wordpress_site_url;
      wpUsername = credentials.consumer_key;
      wpAppPassword = credentials.consumer_secret;

      console.log('WordPress URL:', wpUrl);
      console.log('Username:', wpUsername);
      console.log('Password configured: Yes');
    } catch (credError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing credentials',
          details: credError instanceof Error ? credError.message : 'Failed to fetch credentials from database',
          instructions: 'Credentials should be stored in the app_settings table'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const apiUrl = `${wpUrl}/wp-json/wp/v2`;
    const testResponse = await fetch(apiUrl);
    
    if (!testResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'WordPress REST API not accessible',
          url: apiUrl,
          status: testResponse.status,
          instructions: 'Make sure your WordPress site is accessible and REST API is enabled'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    console.log('✓ WordPress REST API is accessible');

    const credentials = btoa(`${wpUsername}:${wpAppPassword}`);
    const authTestUrl = `${wpUrl}/wp-json/wp/v2/users/me`;
    
    const authResponse = await fetch(authTestUrl, {
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication failed',
          status: authResponse.status,
          details: errorText,
          instructions: 'Check your username and Application Password are correct'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const userData = await authResponse.json();
    console.log('✓ Authentication successful');
    console.log('Logged in as:', userData.name);

    const affwpUrl = `${wpUrl}/wp-json/affwp/v1/affiliates`;
    
    const affwpResponse = await fetch(affwpUrl, {
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    if (!affwpResponse.ok) {
      const errorText = await affwpResponse.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: 'AffiliateWP REST API not accessible',
          status: affwpResponse.status,
          details: errorText,
          instructions: 'Make sure AffiliateWP REST API is enabled in AffiliateWP → Settings → Advanced'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const affiliates = await affwpResponse.json();
    console.log('✓ AffiliateWP REST API is accessible');
    console.log('Found', affiliates.length, 'existing affiliates');

    return new Response(
      JSON.stringify({
        success: true,
        message: '✓ All tests passed! AffiliateWP integration is ready.',
        details: {
          wordpress_url: wpUrl,
          authenticated_as: userData.name,
          user_roles: userData.roles,
          affiliatewp_accessible: true,
          existing_affiliates: affiliates.length,
        },
        next_steps: [
          'Integration is configured correctly',
          'Test by signing up a new rep in the portal',
          'Check WordPress → AffiliateWP → Affiliates to see the new account',
          'Set up webhooks for bi-directional sync'
        ]
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Test error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        instructions: 'Check the error message above and verify your configuration'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});