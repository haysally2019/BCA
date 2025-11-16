# Supabase Custom Access Token Hook Setup

## Overview
Your database has a custom access token hook function that adds `user_role` and `company_id` claims to JWT tokens. However, this hook needs to be **activated** in Supabase to start working.

## Current Status
✅ Hook function exists: `public.custom_access_token_hook`
✅ Permissions configured correctly (supabase_auth_admin has EXECUTE)
❌ Hook is NOT activated in Supabase Auth configuration

## Why This Matters
When activated, this hook will:
- Automatically add `user_role` and `company_id` to every JWT token
- Make RLS policies faster (no need to query profiles table)
- Allow access to claims via `auth.jwt()` in SQL policies
- Update claims automatically on token refresh

## Activation Instructions

### Option 1: Supabase Dashboard (Recommended)

**IMPORTANT: How to Access Your Supabase Dashboard**

Your Supabase project reference: `gpupamrhpmrgslqnzzpb`

**To access the Supabase Dashboard:**
1. Go to: **https://supabase.com/dashboard**
2. Sign in with your Supabase account credentials (the account you used to create the project)
3. You'll see a list of your projects
4. Click on the project **gpupamrhpmrgslqnzzpb** to open the dashboard

**Steps to Enable the Hook:**

1. **Navigate to Authentication Settings:**
   - In the left sidebar, click on "Authentication" (shield icon)
   - Click on the "Hooks" tab at the top of the page

2. **Enable Custom Access Token Hook:**
   - Scroll down to find the "Custom Access Token" section
   - Toggle the switch to "Enabled"
   - In the dropdown menu, select: `public.custom_access_token_hook`
   - Click "Save" or "Confirm" button

3. **Verify Configuration:**
   - The hook should now show as "Enabled"
   - Status indicator should be green/active
   - You should see "public.custom_access_token_hook" listed as the active function

### Option 2: Supabase CLI (For Local Development)

If you're using Supabase CLI for local development, add this to your `supabase/config.toml`:

```toml
[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/public/custom_access_token_hook"
```

Then restart your local Supabase instance:
```bash
supabase stop
supabase start
```

### Option 3: Edge Function Configuration (Alternative)

If you need to configure this programmatically, you can use the Supabase Management API, but Dashboard configuration is simpler and recommended.

## How to Test

After activating the hook:

1. **Sign out completely:**
   ```javascript
   await supabase.auth.signOut()
   ```

2. **Sign back in:**
   - This will generate a new JWT token with the custom claims

3. **Inspect your token:**
   ```javascript
   const { data: { session } } = await supabase.auth.getSession()
   console.log(session?.user)
   // Look for user_role and company_id in the token
   ```

4. **Check JWT claims in database:**
   ```sql
   -- This should now work in RLS policies
   SELECT auth.jwt() ->> 'user_role' AS user_role;
   SELECT auth.jwt() ->> 'company_id' AS company_id;
   ```

## What Gets Added to JWT

The hook adds these custom claims to your JWT token:

```json
{
  "user_role": "sales_rep",  // or "manager"
  "company_id": "uuid-string"
}
```

Default values if not set in profiles:
- `user_role`: defaults to `"sales_rep"`
- `company_id`: defaults to the user's own user_id

## Benefits After Activation

### Before (Current State):
```sql
-- RLS policy must query profiles table
CREATE POLICY "Users see own data"
ON some_table
FOR SELECT
USING (
  user_id = auth.uid()
  AND company_id = (
    SELECT company_id FROM profiles WHERE user_id = auth.uid()
  )
);
```

### After (With Hook Active):
```sql
-- RLS policy reads directly from JWT (faster!)
CREATE POLICY "Users see own data"
ON some_table
FOR SELECT
USING (
  user_id = auth.uid()
  AND company_id = (auth.jwt() ->> 'company_id')::uuid
);
```

## Troubleshooting

### Hook not working after activation?
1. Sign out completely and sign back in
2. Old tokens need to be refreshed to get new claims
3. Check that the hook shows as "Enabled" in Dashboard

### Claims still not in token?
1. Verify your profile has `user_role` and `company_id` set
2. Check the function is granted to `supabase_auth_admin` (already done ✅)
3. Look at Supabase logs for any hook execution errors

### Testing locally?
If using local Supabase CLI, make sure you've added the hook config to `supabase/config.toml` and restarted.

## Next Steps

1. ✅ Activate the hook using Option 1 (Dashboard) above
2. ✅ Sign out and sign back in to test
3. ✅ Verify claims appear in your JWT token
4. ✅ Optional: Update RLS policies to use `auth.jwt()` for better performance

## Support

- Supabase Auth Hooks Documentation: https://supabase.com/docs/guides/auth/auth-hooks
- Custom Access Token Hook Guide: https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
