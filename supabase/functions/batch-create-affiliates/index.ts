import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  console.log('=== Batch Create Affiliates Function Invoked ===');

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

    console.log('Fetching users without AffiliateWP accounts...');

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        personal_phone,
        user_id
      `)
      .is('affiliatewp_id', null)
      .eq('user_type', 'sales_rep')
      .not('full_name', 'is', null);

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    console.log(`Found ${profiles.length} users to process`);

    const results = {
      total: profiles.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[],
    };

    for (const profile of profiles) {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
      const email = authUser?.user?.email;

      if (!email) {
        console.log(`✗ Skipped: ${profile.full_name} - No email found`);
        results.skipped++;
        results.details.push({
          name: profile.full_name,
          email: 'No email',
          status: 'skipped',
          error: 'No email found',
        });
        continue;
      }

      console.log(`\n--- Processing: ${profile.full_name} (${email}) ---`);

      try {
        const createUrl = `${supabaseUrl}/functions/v1/create-affiliatewp-account`;

        const response = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            profile_id: profile.id,
            email: email,
            name: profile.full_name,
            phone: profile.personal_phone || null,
          }),
        });

        const result = await response.json();

        if (result.success) {
          if (result.skipped) {
            results.skipped++;
            console.log(`✓ Skipped: ${profile.full_name} (already has account)`);
          } else {
            results.successful++;
            console.log(`✓ Success: ${profile.full_name} - AffiliateWP ID: ${result.affiliatewp_id}`);
          }

          results.details.push({
            name: profile.full_name,
            email: email,
            status: result.skipped ? 'skipped' : 'success',
            affiliatewp_id: result.affiliatewp_id,
          });
        } else {
          results.failed++;
          console.error(`✗ Failed: ${profile.full_name} - ${result.error}`);

          results.details.push({
            name: profile.full_name,
            email: email,
            status: 'failed',
            error: result.error,
          });
        }
      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`✗ Exception: ${profile.full_name} - ${errorMsg}`);

        results.details.push({
          name: profile.full_name,
          email: email,
          status: 'failed',
          error: errorMsg,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n=== Batch Processing Complete ===');
    console.log(`Total: ${results.total}`);
    console.log(`Successful: ${results.successful}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Failed: ${results.failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Batch creation completed',
        results,
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
    console.error('=== ERROR: Batch processing failed ===');
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