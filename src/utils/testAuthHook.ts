/**
 * Test utility to verify that the Custom Access Token Hook is working
 *
 * This function checks if your JWT token contains the custom claims
 * (user_role and company_id) that should be added by the auth hook.
 *
 * Usage:
 * 1. Make sure you're signed in
 * 2. Call this function from the browser console or a component
 * 3. Check the console output to see if claims are present
 */

import { supabase } from '../lib/supabaseClient';

export async function testAuthHook() {
  console.log('='.repeat(60));
  console.log('AUTH HOOK TEST - Checking JWT Claims');
  console.log('='.repeat(60));

  try {
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('❌ Error getting session:', error);
      return { success: false, error };
    }

    if (!session) {
      console.warn('⚠️  No active session found. Please sign in first.');
      return { success: false, error: 'No session' };
    }

    console.log('✅ Session found');
    console.log('User ID:', session.user.id);
    console.log('User Email:', session.user.email);

    // Check for custom claims in the token
    const user = session.user;

    // Supabase stores custom claims in user.app_metadata or directly on user object
    const userRole = user.app_metadata?.user_role || user.user_metadata?.user_role;
    const companyId = user.app_metadata?.company_id || user.user_metadata?.company_id;

    console.log('\n' + '-'.repeat(60));
    console.log('CUSTOM CLAIMS CHECK:');
    console.log('-'.repeat(60));

    if (userRole !== undefined) {
      console.log('✅ user_role claim found:', userRole);
    } else {
      console.log('❌ user_role claim NOT found');
      console.log('   This means the auth hook is NOT active yet.');
    }

    if (companyId !== undefined) {
      console.log('✅ company_id claim found:', companyId);
    } else {
      console.log('❌ company_id claim NOT found');
      console.log('   This means the auth hook is NOT active yet.');
    }

    console.log('\n' + '-'.repeat(60));
    console.log('FULL USER OBJECT:');
    console.log('-'.repeat(60));
    console.log(JSON.stringify(user, null, 2));

    console.log('\n' + '-'.repeat(60));
    console.log('APP METADATA:');
    console.log('-'.repeat(60));
    console.log(JSON.stringify(user.app_metadata, null, 2));

    // Test database query to check if auth.jwt() works
    console.log('\n' + '-'.repeat(60));
    console.log('DATABASE JWT TEST:');
    console.log('-'.repeat(60));

    const { data: jwtTest, error: jwtError } = await supabase.rpc('test_jwt_claims');

    if (jwtError) {
      // Function might not exist, that's okay
      console.log('⚠️  Could not test database JWT function (this is okay)');
    } else {
      console.log('Database JWT claims:', jwtTest);
    }

    // Conclusion
    console.log('\n' + '='.repeat(60));
    console.log('CONCLUSION:');
    console.log('='.repeat(60));

    const hookIsActive = userRole !== undefined && companyId !== undefined;

    if (hookIsActive) {
      console.log('✅ AUTH HOOK IS ACTIVE AND WORKING!');
      console.log('   Your JWT tokens contain custom claims.');
      console.log('   RLS policies can now use auth.jwt() for better performance.');
    } else {
      console.log('❌ AUTH HOOK IS NOT ACTIVE');
      console.log('   Follow instructions in SUPABASE_AUTH_HOOK_SETUP.md');
      console.log('   Steps:');
      console.log('   1. Go to Supabase Dashboard > Authentication > Hooks');
      console.log('   2. Enable "Custom Access Token" hook');
      console.log('   3. Select: public.custom_access_token_hook');
      console.log('   4. Save and sign out/in to test again');
    }

    console.log('='.repeat(60));

    return {
      success: true,
      hookActive: hookIsActive,
      claims: {
        user_role: userRole,
        company_id: companyId
      },
      user
    };

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return { success: false, error };
  }
}

// Helper function to create a test database function
export async function createTestJwtFunction() {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      CREATE OR REPLACE FUNCTION public.test_jwt_claims()
      RETURNS jsonb
      LANGUAGE sql
      SECURITY DEFINER
      AS $$
        SELECT jsonb_build_object(
          'user_role', auth.jwt() ->> 'user_role',
          'company_id', auth.jwt() ->> 'company_id',
          'user_id', auth.uid()
        );
      $$;

      GRANT EXECUTE ON FUNCTION public.test_jwt_claims TO authenticated;
    `
  });

  if (error) {
    console.error('Could not create test function:', error);
    return false;
  }

  console.log('✅ Test function created successfully');
  return true;
}

// Make it available globally for easy testing in console
if (typeof window !== 'undefined') {
  (window as any).testAuthHook = testAuthHook;
  console.log('💡 Tip: Run testAuthHook() in the console to check if auth hook is active');
}
