# Batch AffiliateWP Account Creation Instructions

## Overview
This document explains how to create AffiliateWP accounts for all existing users who don't have one yet.

## Current Status
- **Total Users**: 59
- **Users with AffiliateWP Accounts**: 5
- **Users without Accounts**: 54

## Method 1: Using the Admin Page (Recommended)

1. **Open the batch creation page** in your browser:
   ```
   http://localhost:5173/batch-affiliate-creation.html
   ```
   (Or the production URL once deployed)

2. **Click "Start Batch Creation"** button

3. **Wait for completion**:
   - The page will process each user one by one
   - You'll see real-time logs of each account creation
   - Statistics will update showing success/failure counts
   - Processing includes a 2-second delay between each user to avoid rate limits

4. **Review results**:
   - Check the success/failure counts
   - Review the log for any errors
   - Failed accounts can be retried individually

## What Happens During Batch Creation

For each user without an AffiliateWP account:

1. Creates a WordPress user account
2. Creates an AffiliateWP affiliate account
3. Updates the profile in Supabase with:
   - `affiliatewp_id` - The unique affiliate ID
   - `affiliate_referral_url` - The personalized referral URL (e.g., https://bluecollaracademy.info/?ref=123)
   - `affiliatewp_sync_status` - Set to 'synced'
   - `affiliatewp_account_status` - Set to 'active'

4. Logs the sync operation in `affiliatewp_sync_log` table

## After Creation

Once all accounts are created:

1. Each user will see their unique affiliate URL in Settings
2. The URL format will be: `https://bluecollaracademy.info/?ref=[their_unique_id]`
3. Users can copy and share their URL to track referrals
4. All referrals will be tracked in AffiliateWP

## Troubleshooting

If account creation fails for a user:
- Check the error message in the log
- Verify the user has a valid email and name
- Check AffiliateWP credentials in `app_settings` table
- Retry individual users if needed

## Manual Creation (Alternative)

If you prefer to create accounts one at a time, you can use the edge function directly:

```bash
curl -X POST \
  https://gpupamrhpmrgslqnzzpb.supabase.co/functions/v1/create-affiliatewp-account \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "profile_id": "USER_ID",
    "email": "user@example.com",
    "name": "User Name"
  }'
```

## Important Notes

- Account creation is idempotent - if a user already has an account, it will skip them
- The process respects WordPress API rate limits with delays between requests
- All operations are logged for audit purposes
- Failed creations can be retried without issues
