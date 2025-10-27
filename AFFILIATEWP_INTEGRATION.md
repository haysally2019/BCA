# AffiliateWP Auto-Creation Integration Guide

## Overview

This portal now features automatic AffiliateWP account creation for new sales reps during signup. The integration provides bi-directional sync between your WordPress AffiliateWP installation and the sales portal, ensuring commission tracking stays synchronized.

## Features

- **Automatic Account Creation**: New reps get AffiliateWP accounts automatically during signup
- **Bi-Directional Sync**: Changes in AffiliateWP flow back to the portal
- **Commission Tracking**: Real-time commission data syncs from WordPress to the portal
- **Retry Logic**: Failed creations are automatically retried up to 5 times
- **Comprehensive Logging**: All sync operations are tracked for debugging
- **Status Monitoring**: Dashboard shows sync status for each rep

## Setup Instructions

### 1. WordPress AffiliateWP Configuration

#### Install Required Plugin
On your WordPress site with AffiliateWP installed, you need to enable the REST API:

1. Go to **AffiliateWP > Settings > Advanced**
2. Enable **REST API** option
3. Save settings

#### Create API Credentials
1. In WordPress, go to **Users > Your Profile**
2. Scroll to **Application Passwords** section
3. Enter name: `Sales Portal Integration`
4. Click **Add New Application Password**
5. Copy the generated password (you won't see it again)

### 2. Environment Variables

Add these to your `.env` file:

```bash
# AffiliateWP WordPress Site Configuration
AFFILIATEWP_SITE_URL=https://your-wordpress-site.com
AFFILIATEWP_API_USERNAME=your_wordpress_username
AFFILIATEWP_API_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx

# Optional: Webhook signature verification
AFFILIATEWP_WEBHOOK_SECRET=your_secret_key_here
```

**Important Notes:**
- `AFFILIATEWP_SITE_URL` should be your WordPress site URL without trailing slash
- `AFFILIATEWP_API_USERNAME` is your WordPress admin username
- `AFFILIATEWP_API_PASSWORD` is the Application Password (spaces are okay)
- `AFFILIATEWP_WEBHOOK_SECRET` is optional but recommended for security

### 3. WordPress Webhook Configuration

Configure AffiliateWP to send webhooks to your portal:

1. In WordPress, install a webhook plugin (e.g., WP Webhooks)
2. Create a new webhook with these settings:
   - **Trigger**: AffiliateWP events (affiliate created, updated, referral created, etc.)
   - **URL**: `https://your-supabase-url.supabase.co/functions/v1/affiliatewp-webhook`
   - **Method**: POST
   - **Headers**: (optional) `x-affiliatewp-signature: your_secret_key`

#### Supported Webhook Events
- `affiliate_created` - New affiliate account created
- `affiliate_updated` - Affiliate account information updated
- `affiliate_status_changed` - Affiliate status changed
- `referral_created` - New referral/commission created
- `referral_updated` - Referral status or amount updated
- `referral_paid` - Commission marked as paid

## How It Works

### New Rep Signup Flow

1. **Rep Fills Signup Form**
   - Rep enters email, name, and optional AffiliateWP ID
   - Form submitted to portal

2. **Account Created in Portal**
   - Supabase auth user created
   - Profile record created with `affiliatewp_sync_status: 'pending'`
   - Database trigger queues affiliate creation

3. **Affiliate Account Created (Background)**
   - Edge function calls WordPress REST API
   - Creates affiliate account with:
     - Username from email
     - Email as payment email
     - Status: active
     - Default commission rates
   - Returns AffiliateWP ID

4. **Portal Updated**
   - Profile updated with AffiliateWP ID
   - Sync status set to 'synced'
   - Sync log entry created

5. **Rep Can Login**
   - Signup completes immediately (non-blocking)
   - Affiliate creation happens in background
   - Rep sees their affiliate status in dashboard

### Commission Sync Flow

1. **Sale Made in WordPress/WooCommerce**
   - Customer purchases through affiliate link
   - AffiliateWP records referral

2. **Webhook Sent to Portal**
   - WordPress sends webhook with commission data
   - Portal validates signature (if configured)

3. **Commission Created/Updated**
   - Portal finds or creates affiliate record
   - Creates commission entry
   - Links to rep profile if AffiliateWP ID matches

4. **Rep Views Commission**
   - Commission appears in rep dashboard
   - Real-time tracking of earnings
   - Status updates sync automatically

## Database Schema

### New Tables

#### `affiliatewp_sync_log`
Tracks all sync operations between portal and WordPress:
- `profile_id` - Portal profile being synced
- `affiliatewp_id` - AffiliateWP affiliate ID
- `operation` - Type: create, update, webhook, manual, retry
- `sync_direction` - portal_to_affiliatewp or affiliatewp_to_portal
- `status` - pending, processing, success, failed
- `request_payload` - Data sent to WordPress
- `response_payload` - Data received from WordPress
- `error_message` - Error if failed
- `retry_count` - Number of retry attempts
- `processed_at` - Completion timestamp

#### `commission_rate_templates`
Predefined commission rate tiers:
- `name` - Template name
- `tier_level` - bronze, silver, gold, platinum, standard
- `upfront_rate` - Upfront commission percentage
- `residual_rate` - Residual commission percentage
- `is_active` - Whether template is available
- `is_default` - Default template for new affiliates

### Updated Tables

#### `profiles` (Added Fields)
- `affiliatewp_sync_status` - pending, syncing, synced, failed, manual
- `last_affiliatewp_sync` - Last successful sync timestamp
- `affiliatewp_sync_error` - Last error message if failed
- `affiliatewp_account_status` - active, inactive, pending, rejected

## Edge Functions

### `create-affiliatewp-account`
Creates affiliate accounts in WordPress AffiliateWP.

**Endpoint**: `/functions/v1/create-affiliatewp-account`

**Request**:
```json
{
  "profile_id": "uuid",
  "user_id": "uuid",
  "email": "rep@example.com",
  "name": "John Doe",
  "phone": "+1234567890"
}
```

**Response**:
```json
{
  "success": true,
  "affiliatewp_id": 123,
  "wordpress_user_id": 456,
  "username": "johndoe",
  "status": "active"
}
```

### `affiliatewp-webhook`
Receives webhooks from WordPress AffiliateWP.

**Endpoint**: `/functions/v1/affiliatewp-webhook`

**Supported Actions**:
- Affiliate status changes
- New referrals/commissions
- Commission updates
- Commission payments

## Database Functions

### `process_pending_affiliatewp_creations()`
Processes queued affiliate creation operations.

```sql
SELECT * FROM process_pending_affiliatewp_creations();
```

Returns:
```json
{
  "success": true,
  "processed": 5,
  "errors": 0,
  "records": [...]
}
```

### `manual_create_affiliatewp_account(profile_id)`
Manually trigger affiliate creation for a specific profile.

```sql
SELECT * FROM manual_create_affiliatewp_account('profile-uuid-here');
```

### `retry_failed_affiliatewp_sync(log_id)`
Retry a failed sync operation.

```sql
SELECT * FROM retry_failed_affiliatewp_sync('log-uuid-here');
```

### `get_affiliatewp_sync_stats()`
Get sync statistics across all profiles.

```sql
SELECT * FROM get_affiliatewp_sync_stats();
```

Returns:
```json
{
  "total_profiles": 50,
  "synced": 45,
  "pending": 3,
  "failed": 2,
  "with_affiliatewp_id": 45,
  "active_accounts": 44,
  "last_sync": "2025-10-27T10:30:00Z"
}
```

## Admin Dashboard Features

### View Sync Status
Monitor affiliate sync status for all reps:
- Sync status indicators (synced, pending, failed)
- Last sync timestamp
- Error messages for failures
- Retry button for failed syncs

### Manual Operations
- Manually trigger affiliate creation
- Retry failed syncs
- View sync logs
- Test webhook connectivity

### Monitoring
- Real-time sync statistics
- Webhook processing logs
- Commission sync status
- Error tracking and alerts

## Troubleshooting

### Common Issues

#### 1. Affiliate Creation Fails
**Symptoms**: Profile shows `affiliatewp_sync_status: 'failed'`

**Solutions**:
- Check WordPress REST API is enabled
- Verify API credentials are correct
- Check Application Password hasn't expired
- Review sync log for specific error
- Manually retry using `retry_failed_affiliatewp_sync()`

#### 2. Webhooks Not Received
**Symptoms**: Commissions don't sync to portal

**Solutions**:
- Verify webhook URL is correct
- Check webhook plugin is installed and active
- Test webhook manually from WordPress
- Review webhook logs in portal
- Ensure webhook secret matches if configured

#### 3. Duplicate Affiliate Creation
**Symptoms**: Multiple AffiliateWP accounts for same rep

**Solutions**:
- System automatically prevents duplicates
- If AffiliateWP ID exists, creation is skipped
- Check affiliatewp_sync_log for existing operations
- Manually link existing affiliate ID to profile

#### 4. Commission Not Linking to Rep
**Symptoms**: Commission created but not showing in rep dashboard

**Solutions**:
- Ensure rep profile has correct AffiliateWP ID
- Check affiliate_id matches in commission_entries
- Verify webhook payload includes affiliate_id
- Review commission_entries table for orphaned entries

### Debug Mode

Enable detailed logging by checking:

1. **Supabase Edge Function Logs**
   ```
   supabase functions logs create-affiliatewp-account
   supabase functions logs affiliatewp-webhook
   ```

2. **Database Sync Logs**
   ```sql
   SELECT * FROM affiliatewp_sync_log
   WHERE status = 'failed'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

3. **Webhook Logs**
   ```sql
   SELECT * FROM webhook_logs
   WHERE webhook_type = 'affiliatewp'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

## Security Best Practices

1. **Use HTTPS**: Always use HTTPS for WordPress site
2. **Application Passwords**: Use WordPress Application Passwords, not main password
3. **Webhook Signatures**: Configure and verify webhook signatures
4. **Regular Monitoring**: Review sync logs regularly
5. **Access Control**: Restrict API access in WordPress
6. **Rotate Credentials**: Periodically rotate Application Passwords

## Performance Considerations

- Affiliate creation is asynchronous (non-blocking)
- Retry logic prevents failed operations from blocking system
- Webhooks processed in real-time
- Sync operations logged for audit trail
- Database indexes optimize query performance

## Support

For issues or questions:
1. Check sync logs in database
2. Review edge function logs in Supabase
3. Verify WordPress configuration
4. Test API connectivity manually
5. Check webhook delivery in WordPress

## Future Enhancements

Potential improvements:
- Bulk affiliate sync from existing WordPress users
- Custom commission rate assignment during signup
- Affiliate performance reports
- Automated payout tracking
- Multi-tier commission structures
- Commission dispute resolution workflow
