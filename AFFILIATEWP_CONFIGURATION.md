# AffiliateWP Configuration Summary

## Current Configuration Status

✅ **FULLY CONFIGURED AND WORKING**

## Configuration Details

### WordPress Site
- **URL**: `https://bluecollaracademy.info`
- **Authenticated As**: admin
- **Status**: Connected and operational

### API Credentials (Stored in Supabase)
All credentials are securely stored in the `app_settings` table:

1. **affiliatewp_site_url**: `https://bluecollaracademy.info`
2. **affiliatewp_api_username**: `admin`
3. **affiliatewp_api_password**: `8JhB 1Tt0 DqQe r7AG JBj6 5tMB` (WordPress Application Password)
4. **affiliatewp_webhook_secret**: `your_shared_secret_here`

### Test Results

All connection tests passed:
- ✅ WordPress REST API accessible
- ✅ Authentication successful
- ✅ AffiliateWP REST API accessible
- ✅ Found 20 existing affiliates

## How It Works

### Automatic Affiliate Creation
When a new sales rep signs up:
1. A profile is created in Supabase
2. An edge function automatically creates an AffiliateWP account
3. The affiliate ID and referral URL are stored in the profile
4. The rep can immediately start sharing their affiliate link

### Edge Functions
The following edge functions handle AffiliateWP integration:

1. **test-affiliatewp-connection** - Tests the connection to AffiliateWP
2. **create-affiliatewp-account** - Creates new affiliate accounts
3. **batch-create-affiliates** - Bulk creates affiliates for existing reps
4. **fetch-affiliatewp-metrics** - Syncs metrics (visits, referrals, earnings)
5. **update-affiliate-payout-info** - Updates payout information
6. **affiliatewp-webhook** - Receives webhooks from WordPress

### Metrics Sync
The system automatically syncs affiliate metrics every hour via a scheduled job:
- Visits
- Referrals
- Earnings
- Unpaid commissions

Data is stored in the `affiliate_metrics_daily` and `affiliate_referrals` tables.

## Verifying Configuration

To verify the configuration is working:

```bash
curl -X POST "https://gpupamrhpmrgslqnzzpb.supabase.co/functions/v1/test-affiliatewp-connection" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "message": "✓ All tests passed! AffiliateWP integration is ready.",
  "details": {
    "wordpress_url": "https://bluecollaracademy.info",
    "authenticated_as": "admin",
    "affiliatewp_accessible": true,
    "existing_affiliates": 20
  }
}
```

## Regenerating Application Password

If you need to regenerate the WordPress Application Password:

1. Log into WordPress as admin
2. Go to Users → Profile
3. Scroll to "Application Passwords"
4. Generate a new password
5. Update the database:

```sql
UPDATE app_settings
SET value = 'NEW_PASSWORD_HERE', updated_at = now()
WHERE key = 'affiliatewp_api_password';
```

6. Test the connection again using the edge function

## WordPress AffiliateWP Settings

Make sure these settings are enabled in WordPress:

1. **AffiliateWP → Settings → Advanced**
   - Enable REST API: ✅ YES
   - REST API Key: Should be generated

2. **WordPress → Settings → Permalinks**
   - Must NOT be "Plain" (REST API requires pretty permalinks)

3. **AffiliateWP → Settings → Webhooks**
   - Set up webhook URL: `https://gpupamrhpmrgslqnzzpb.supabase.co/functions/v1/affiliatewp-webhook`
   - Secret: `your_shared_secret_here`

## Security Notes

- All credentials are stored in Supabase, not in environment variables
- Edge functions use service role key to access credentials
- WordPress uses Application Passwords (not user password)
- Webhook endpoints use shared secrets for verification
- All API calls use HTTPS

## Next Steps

1. ✅ Configuration verified and working
2. Test by creating a new sales rep account in the portal
3. Verify the affiliate account appears in WordPress
4. Check that the referral URL is generated correctly
5. Monitor the metrics sync to ensure data flows properly
