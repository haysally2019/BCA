import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ResetPasswordRequest {
  user_id: string;
  team_member_id: string;
}

function generateSecurePassword(): string {
  const length = 16;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;

  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
}

Deno.serve(async (req: Request) => {
  console.log('=== Reset Password Edge Function Invoked ===');
  console.log('Method:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('Step 1: Checking authorization');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('FAILED: Missing authorization header');
      throw new Error('Missing authorization header');
    }
    console.log('SUCCESS: Authorization header present');

    const token = authHeader.replace('Bearer ', '');

    console.log('Step 2: Creating Supabase clients');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error('FAILED: Missing environment variables');
      throw new Error('Server configuration error');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const supabaseClient = createClient(supabaseUrl, anonKey);
    console.log('SUCCESS: Supabase clients created');

    console.log('Step 3: Verifying user authentication');
    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !requestingUser) {
      console.error('FAILED: Auth verification error:', authError);
      throw new Error('Unauthorized: Invalid authentication');
    }
    console.log('SUCCESS: User authenticated:', requestingUser.id);

    console.log('Step 4: Parsing request body');
    const requestData: ResetPasswordRequest = await req.json();
    console.log('Request data:', { user_id: requestData.user_id, team_member_id: requestData.team_member_id });

    const { user_id, team_member_id } = requestData;

    if (!user_id || !team_member_id) {
      console.error('FAILED: Missing required fields');
      throw new Error('Missing required fields: user_id, team_member_id');
    }

    console.log('Step 5: Fetching requesting user profile');
    const { data: requestingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_role')
      .eq('user_id', requestingUser.id)
      .maybeSingle();

    if (profileCheckError || !requestingProfile) {
      console.error('FAILED: Error fetching requesting user profile');
      throw new Error('Unauthorized: Profile not found');
    }
    console.log('SUCCESS: Requesting user profile found');

    console.log('Step 6: Verifying team member belongs to requesting user');
    const { data: teamMember, error: teamMemberError } = await supabaseAdmin
      .from('team_members')
      .select('id, company_id, profile_id, user_id')
      .eq('id', team_member_id)
      .maybeSingle();

    if (teamMemberError || !teamMember) {
      console.error('FAILED: Team member not found');
      throw new Error('Team member not found');
    }

    if (teamMember.company_id !== requestingProfile.id) {
      console.error('FAILED: Authorization - team member does not belong to requesting user');
      throw new Error('Unauthorized: You can only reset passwords for your team members');
    }
    console.log('SUCCESS: Authorization verified');

    console.log('Step 7: Verifying user_id matches team member');
    if (teamMember.user_id !== user_id) {
      console.error('FAILED: user_id mismatch');
      throw new Error('User ID does not match team member record');
    }

    console.log('Step 8: Generating new password');
    const newPassword = generateSecurePassword();
    console.log('SUCCESS: Password generated');

    console.log('Step 9: Updating user password');
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      {
        password: newPassword,
        user_metadata: {
          must_change_password: true,
          password_reset_at: new Date().toISOString(),
          reset_by: requestingUser.id,
        },
      }
    );

    if (updateError) {
      console.error('FAILED: Error updating password:', updateError);
      throw new Error(`Failed to reset password: ${updateError.message}`);
    }
    console.log('SUCCESS: Password updated');

    console.log('Step 9.5: Updating profile must_change_password flag');
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('user_id', user_id);

    if (profileUpdateError) {
      console.error('Warning: Error updating profile flag (non-fatal):', profileUpdateError);
    } else {
      console.log('SUCCESS: Profile flag updated');
    }

    console.log('Step 10: Logging activity');
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('company_email')
        .eq('id', teamMember.profile_id)
        .maybeSingle();

      await supabaseAdmin
        .from('team_activity_log')
        .insert({
          team_member_id: team_member_id,
          company_id: teamMember.company_id,
          activity_type: 'password_reset',
          description: `Password reset for ${profile?.company_email || 'team member'}`,
          performed_by: requestingProfile.id,
          metadata: {
            reset_by_user_id: requestingUser.id,
            reset_at: new Date().toISOString(),
          },
        });
      console.log('SUCCESS: Activity logged');
    } catch (logError) {
      console.error('Warning: Error logging activity (non-fatal):', logError);
    }

    console.log('=== PASSWORD RESET COMPLETE ===');
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password reset successfully',
        data: {
          user_id,
          team_member_id,
          temporary_password: newPassword,
          reset_at: new Date().toISOString(),
        },
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
    console.error('=== PASSWORD RESET FAILED ===');
    console.error('Error:', error);

    let statusCode = 500;
    let errorMessage = 'An unknown error occurred';

    if (error instanceof Error) {
      errorMessage = error.message;

      if (errorMessage.includes('Unauthorized') || errorMessage.includes('authorization')) {
        statusCode = 403;
      } else if (errorMessage.includes('Missing required') || errorMessage.includes('not found')) {
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
