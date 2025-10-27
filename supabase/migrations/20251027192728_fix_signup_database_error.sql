/*
  # Fix Signup Database Error - Comprehensive Diagnosis and Fix

  ## Problem
  User reports "Database error saving new user during sign up"

  ## Root Cause Analysis
  The issue could be:
  1. Missing required fields during profile creation
  2. RLS policy blocking the trigger
  3. Trigger execution order causing issues
  4. Column mismatch between what trigger sets and what's required

  ## Solution
  1. Ensure all required columns have defaults or are provided
  2. Make full_name nullable if not already
  3. Ensure the handle_new_user trigger properly sets all fields
  4. Add better error logging to identify the exact issue

  ## Changes
  1. Make full_name nullable if it's causing issues
  2. Update handle_new_user to better handle missing data
  3. Add fallback values for all fields
  4. Improve error handling and logging
*/

-- First, let's make sure full_name can be null temporarily (for backward compatibility)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' 
    AND column_name = 'full_name'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN full_name DROP NOT NULL;
    RAISE NOTICE 'Made full_name nullable for better signup reliability';
  END IF;
END $$;

-- Recreate the handle_new_user function with improved error handling and defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path TO 'public', 'auth'
LANGUAGE plpgsql
AS $$
DECLARE
  tartan_manager_user_id UUID := '173a9b7a-d5ab-402e-8225-0e8263dffcc5';
  tartan_company_profile_id UUID := '28eef186-2734-4c06-ae5f-b80de7f28da9';
  new_profile_id UUID;
  user_full_name TEXT;
  user_email TEXT;
BEGIN
  -- Only create profile if one doesn't exist
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RAISE LOG 'Profile already exists for user %, skipping creation', NEW.id;
    RETURN NEW;
  END IF;

  -- Get email (use raw_user_meta_data if available, otherwise email from auth.users)
  user_email := COALESCE(NEW.email, 'unknown@example.com');
  
  -- Extract name from email (first part before @) as default
  user_full_name := SPLIT_PART(user_email, '@', 1);
  
  -- Capitalize first letter of each word
  user_full_name := INITCAP(REPLACE(user_full_name, '.', ' '));
  user_full_name := INITCAP(REPLACE(user_full_name, '_', ' '));
  
  -- Ensure we have a valid name
  IF user_full_name IS NULL OR TRIM(user_full_name) = '' THEN
    user_full_name := 'New User';
  END IF;

  RAISE LOG 'Creating profile for user %: email=%, name=%', NEW.id, user_email, user_full_name;

  -- Insert into profiles with all necessary defaults
  BEGIN
    INSERT INTO public.profiles (
      user_id,
      company_name,
      full_name,
      company_email,
      subscription_plan,
      user_role,
      manager_id,
      created_by,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      'Tartan Builders Inc',
      user_full_name,
      user_email,
      'professional',
      'sales_rep',
      tartan_company_profile_id,
      tartan_company_profile_id,
      true,
      NOW(),
      NOW()
    ) RETURNING id INTO new_profile_id;
    
    RAISE LOG 'Profile created successfully: profile_id=%', new_profile_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE LOG 'Profile already exists for user % (unique_violation), skipping', NEW.id;
      RETURN NEW;
    WHEN foreign_key_violation THEN
      RAISE LOG 'Foreign key violation creating profile for user %: % %', NEW.id, SQLSTATE, SQLERRM;
      RAISE EXCEPTION 'Cannot create profile: invalid manager or created_by reference';
    WHEN check_violation THEN
      RAISE LOG 'Check constraint violation creating profile for user %: % %', NEW.id, SQLSTATE, SQLERRM;
      RAISE EXCEPTION 'Cannot create profile: data validation failed';
    WHEN OTHERS THEN
      RAISE LOG 'Unexpected error creating profile for user %: % %', NEW.id, SQLSTATE, SQLERRM;
      RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
  END;

  -- Create team_members record
  BEGIN
    INSERT INTO public.team_members (
      profile_id,
      user_id,
      company_id,
      manager_id,
      position,
      department,
      employment_status,
      hire_date,
      created_at,
      updated_at
    ) VALUES (
      new_profile_id,
      NEW.id,
      tartan_company_profile_id,
      tartan_company_profile_id,
      'Sales Representative',
      'Sales',
      'active',
      CURRENT_DATE,
      NOW(),
      NOW()
    );
    
    RAISE LOG 'Team member record created for profile %', new_profile_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE LOG 'Team member already exists for profile % (unique_violation), skipping', new_profile_id;
    WHEN OTHERS THEN
      RAISE LOG 'Error creating team_member for profile %: % %. Continuing anyway.', new_profile_id, SQLSTATE, SQLERRM;
      -- Don't raise exception here - profile creation is more important
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Critical error in handle_new_user for user %: % %', NEW.id, SQLSTATE, SQLERRM;
    -- Re-raise to prevent user creation if profile fails
    RAISE;
END;
$$;

-- Set the function owner to postgres to bypass all RLS
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Ensure the trigger exists and is correct
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update the queue_affiliatewp_account_creation trigger to handle missing data gracefully
CREATE OR REPLACE FUNCTION queue_affiliatewp_account_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if this is a sales_rep and doesn't already have an affiliate ID
    IF NEW.user_role = 'sales_rep' AND (NEW.affiliatewp_id IS NULL OR NEW.affiliatewp_id = 0) THEN
        -- Create a sync log entry to track this operation
        BEGIN
            INSERT INTO public.affiliatewp_sync_log (
                profile_id,
                affiliatewp_id,
                operation,
                sync_direction,
                status,
                request_payload,
                retry_count
            ) VALUES (
                NEW.id,
                NULL,
                'create',
                'portal_to_affiliatewp',
                'pending',
                jsonb_build_object(
                    'profile_id', NEW.id,
                    'user_id', NEW.user_id,
                    'email', COALESCE(NEW.company_email, NEW.email, 'unknown@example.com'),
                    'name', COALESCE(NEW.full_name, NEW.company_name, 'New User'),
                    'phone', COALESCE(NEW.company_phone, NEW.personal_phone, NULL),
                    'trigger', 'auto_signup'
                ),
                0
            );

            -- Update profile sync status
            NEW.affiliatewp_sync_status := 'pending';
            NEW.affiliatewp_account_status := 'pending';
            
            RAISE LOG 'Queued AffiliateWP account creation for profile: %, email: %', NEW.id, COALESCE(NEW.company_email, NEW.email);
        EXCEPTION
            WHEN OTHERS THEN
                -- Log error but don't fail the profile creation
                RAISE LOG 'Failed to queue AffiliateWP creation for profile %: % %. Profile creation will continue.', NEW.id, SQLSTATE, SQLERRM;
                -- Set sync status to failed so we can retry later
                NEW.affiliatewp_sync_status := 'failed';
                NEW.affiliatewp_account_status := 'pending';
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set owner to postgres
ALTER FUNCTION public.queue_affiliatewp_account_creation() OWNER TO postgres;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_queue_affiliatewp_creation ON public.profiles;
CREATE TRIGGER trigger_queue_affiliatewp_creation
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION queue_affiliatewp_account_creation();

-- Add helpful comments
COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates profile and team member record for new signups. Includes comprehensive error handling and logging. All users assigned as sales_rep under Tartan Builders Inc.';

COMMENT ON FUNCTION public.queue_affiliatewp_account_creation() IS
  'Queues AffiliateWP account creation for new sales rep profiles. Runs as BEFORE INSERT trigger with graceful error handling.';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Signup error fixes applied successfully';
    RAISE NOTICE 'Enhanced error logging and graceful fallbacks enabled';
    RAISE NOTICE 'Profile creation should now work reliably even if AffiliateWP queueing fails';
END $$;
