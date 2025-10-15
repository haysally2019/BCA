import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateAccountRequest {
  email: string;
  name: string;
  phone?: string;
  user_role: string;
  territory?: string;
  commission_rate?: number;
  affiliatewp_id?: number;
  company_id: string;
  position?: string;
  department?: string;
  employee_id?: string;
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
  console.log('=== Edge Function Invoked ===');
  console.log('Method:', req.method);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('Step 1: Checking authorization header');
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
      console.error('SUPABASE_URL:', supabaseUrl ? 'present' : 'missing');
      console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'present' : 'missing');
      console.error('SUPABASE_ANON_KEY:', anonKey ? 'present' : 'missing');
      throw new Error('Server configuration error: Missing environment variables');
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
    const requestData: CreateAccountRequest = await req.json();
    console.log('SUCCESS: Request body parsed');
    console.log('Request data:', { email: requestData.email, name: requestData.name, company_id: requestData.company_id, user_role: requestData.user_role });

    const { email, name, phone, user_role, territory, commission_rate, affiliatewp_id, company_id, position, department, employee_id } = requestData;

    if (!email || !name || !company_id) {
      console.error('FAILED: Missing required fields');
      throw new Error('Missing required fields: email, name, company_id');
    }
    console.log('SUCCESS: All required fields present');

    console.log('Step 5: Fetching requesting user profile');
    const { data: requestingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, user_role')
      .eq('user_id', requestingUser.id)
      .maybeSingle();

    if (profileCheckError) {
      console.error('FAILED: Error fetching requesting user profile:', profileCheckError);
      throw new Error(`Database error: ${profileCheckError.message}`);
    }

    if (!requestingProfile) {
      console.error('FAILED: Profile not found for user:', requestingUser.id);
      throw new Error('Unauthorized: Profile not found');
    }

    console.log('SUCCESS: Requesting user profile found:', requestingProfile.id);
    const managerProfileId = requestingProfile.id;

    if (company_id !== managerProfileId) {
      console.error(`FAILED: Authorization - company_id (${company_id}) != manager's profile ID (${managerProfileId})`);
      throw new Error('Unauthorized: You can only create team members for your own company');
    }
    console.log('SUCCESS: Authorization check passed');

    console.log('Step 6: Checking for existing email');
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUser?.users.some(u => u.email === email);
    if (emailExists) {
      console.error('FAILED: Email already exists:', email);
      throw new Error('Email address already exists in the system');
    }
    console.log('SUCCESS: Email is unique');

    if (affiliatewp_id) {
      console.log('Step 7: Checking AffiliateWP ID');
      const { data: existingProfile, error: affiliateCheckError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('affiliatewp_id', affiliatewp_id)
        .maybeSingle();

      if (affiliateCheckError) {
        console.error('Warning: Error checking AffiliateWP ID:', affiliateCheckError);
      }

      if (existingProfile) {
        console.error('FAILED: AffiliateWP ID already in use:', affiliatewp_id);
        throw new Error('AffiliateWP ID already in use');
      }
      console.log('SUCCESS: AffiliateWP ID is unique');
    }

    console.log('Step 8: Generating password and creating auth user');
    const password = generateSecurePassword();

    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        company_id,
        user_role,
        created_by: requestingUser.id,
        must_change_password: true,
        temporary_password: password,
      },
    });

    if (createError || !authData.user) {
      console.error('FAILED: Error creating auth user:', createError);
      throw new Error(`Failed to create user account: ${createError?.message || 'Unknown error'}`);
    }
    console.log('SUCCESS: Auth user created:', authData.user.id);

    console.log('Step 9: Creating profile');
    const profilePayload = {
      user_id: authData.user.id,
      company_name: 'Tartan Builders Inc',
      full_name: name,
      company_email: email,
      company_phone: phone,
      personal_phone: phone,
      user_role: user_role || 'sales_rep',
      territory: territory || null,
      commission_rate: commission_rate || 15,
      affiliatewp_id: affiliatewp_id || null,
      subscription_plan: 'professional',
      is_active: true,
      manager_id: managerProfileId,
      created_by: managerProfileId,
      must_change_password: true,
    };
    console.log('Profile payload:', profilePayload);

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert(profilePayload)
      .select()
      .single();

    if (profileError) {
      console.error('FAILED: Error creating profile:', profileError);
      console.error('Profile error details:', JSON.stringify(profileError, null, 2));
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Failed to create profile: ${profileError.message} (Code: ${profileError.code})`);
    }
    console.log('SUCCESS: Profile created:', profileData.id);

    console.log('Step 10: Creating team member');
    const teamMemberPayload = {
      profile_id: profileData.id,
      company_id: managerProfileId,
      user_id: authData.user.id,
      employee_id: employee_id || null,
      hire_date: new Date().toISOString().split('T')[0],
      employment_status: 'active',
      position: position || null,
      department: department || null,
    };
    console.log('Team member payload:', teamMemberPayload);

    const { data: teamMemberData, error: teamMemberError } = await supabaseAdmin
      .from('team_members')
      .insert(teamMemberPayload)
      .select()
      .single();

    if (teamMemberError) {
      console.error('FAILED: Error creating team member:', teamMemberError);
      console.error('Team member error details:', JSON.stringify(teamMemberError, null, 2));
      try {
        await supabaseAdmin.from('profiles').delete().eq('id', profileData.id);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        console.log('Cleanup completed');
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
      throw new Error(`Failed to create team member: ${teamMemberError.message} (Code: ${teamMemberError.code})`);
    }
    console.log('SUCCESS: Team member created:', teamMemberData.id);

    console.log('Step 11: Sending welcome email (optional)');
    let emailSent = false;
    try {
      const siteUrl = Deno.env.get('SITE_URL') || 'https://0ec90b57d6e95fcbda19832f.supabase.co';

      const { data: inviteData, error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo: `${siteUrl}/auth/callback`,
          data: {
            name,
            temporary_password: password,
            user_role,
            must_change_password: true,
          }
        }
      );

      if (emailError) {
        console.error('Warning: Error sending welcome email:', emailError);
        emailSent = false;
      } else {
        console.log('SUCCESS: Welcome email sent to:', email);
        emailSent = true;
      }
    } catch (emailErr) {
      console.error('Warning: Failed to send welcome email:', emailErr);
      emailSent = false;
    }

    console.log('Step 12: Logging activity');
    try {
      const { error: activityLogError } = await supabaseAdmin
        .from('team_activity_log')
        .insert({
          team_member_id: teamMemberData.id,
          company_id: managerProfileId,
          activity_type: 'account_created',
          description: `Sales rep account created for ${name} (${email})`,
          performed_by: managerProfileId,
          metadata: {
            email,
            user_role,
            affiliatewp_id,
          },
        });

      if (activityLogError) {
        console.error('Warning: Failed to log activity:', activityLogError);
        console.error('Activity log error code:', activityLogError.code);
        console.error('Activity log error message:', activityLogError.message);
        console.error('Activity log error details:', activityLogError.details);
      } else {
        console.log('SUCCESS: Activity logged');
      }
    } catch (logError) {
      console.error('Warning: Exception logging activity (non-fatal):', logError);
    }

    console.log('=== COMPLETE SUCCESS ===');
    console.log('Account created successfully for:', email);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account created successfully',
        data: {
          user_id: authData.user.id,
          profile_id: profileData.id,
          team_member_id: teamMemberData.id,
          email,
          temporary_password: password,
          name,
          user_role,
          affiliatewp_id,
          email_sent: emailSent,
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
    console.error('=== COMPLETE FAILURE ===');
    console.error('Error in create-sales-rep-account function:', error);

    if (error instanceof Error) {
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Non-Error object thrown:', typeof error, error);
    }

    let statusCode = 500;
    let errorMessage = 'An unknown error occurred';

    if (error instanceof Error) {
      errorMessage = error.message;

      if (errorMessage.includes('Unauthorized') || errorMessage.includes('authorization')) {
        statusCode = 403;
      } else if (errorMessage.includes('Missing required') || errorMessage.includes('already exists')) {
        statusCode = 400;
      } else if (errorMessage.includes('Database error') || errorMessage.includes('Failed to create')) {
        statusCode = 500;
      }
    }

    console.error(`Returning error response with status ${statusCode}:`, errorMessage);

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