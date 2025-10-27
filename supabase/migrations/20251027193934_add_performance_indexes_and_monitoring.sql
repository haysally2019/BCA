/*
  # Add Performance Indexes and Monitoring for AffiliateWP Auto-Creation
  
  1. Performance Indexes
    - Optimize affiliatewp_sync_log queries for pending status lookups
    - Index profiles table for sync status queries
    - Composite indexes for common query patterns
    - pg_net request tracking optimization
  
  2. Monitoring Views
    - Real-time sync statistics dashboard
    - Error rate monitoring
    - Processing performance metrics
    - Dead letter queue tracking
  
  3. Utility Functions
    - Get sync statistics
    - Retry failed syncs
    - Manual affiliate creation trigger
    - Cleanup old completed logs
  
  4. Dead Letter Queue Management
    - View permanently failed entries
    - Manual retry mechanism
    - Investigation tools
*/

-- =========================================
-- PART 1: Performance Indexes
-- =========================================

-- Index for pending operations query (used by pg_cron batch processor)
CREATE INDEX IF NOT EXISTS idx_affiliatewp_sync_pending_status 
ON affiliatewp_sync_log(status, created_at, retry_count)
WHERE status IN ('pending', 'failed') AND operation = 'create';

-- Index for profile sync status lookups
CREATE INDEX IF NOT EXISTS idx_profiles_affiliatewp_sync_status
ON profiles(affiliatewp_sync_status, user_role)
WHERE user_role = 'sales_rep';

-- Index for finding existing sync logs by profile
CREATE INDEX IF NOT EXISTS idx_affiliatewp_sync_profile_operation
ON affiliatewp_sync_log(profile_id, operation, status, created_at DESC);

-- Index for dead letter queue queries
CREATE INDEX IF NOT EXISTS idx_affiliatewp_sync_dlq
ON affiliatewp_sync_log(status, updated_at)
WHERE status = 'dead_letter_queue';

-- =========================================
-- PART 2: Monitoring Views
-- =========================================

-- Real-time sync statistics view
CREATE OR REPLACE VIEW affiliatewp_sync_dashboard AS
SELECT
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
    COUNT(*) FILTER (WHERE status = 'success') as success_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE status = 'dead_letter_queue') as dlq_count,
    COUNT(*) as total_operations,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'success') / NULLIF(COUNT(*), 0), 2) as success_rate,
    MAX(processed_at) FILTER (WHERE status = 'success') as last_success,
    COUNT(*) FILTER (WHERE status = 'failed' AND updated_at > now() - interval '1 hour') as failed_last_hour,
    AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) FILTER (WHERE status = 'success') as avg_processing_seconds
FROM affiliatewp_sync_log
WHERE operation = 'create'
    AND created_at > now() - interval '7 days';

-- Recent failures view for debugging
CREATE OR REPLACE VIEW affiliatewp_recent_failures AS
SELECT
    sl.id,
    sl.profile_id,
    p.company_email,
    p.full_name,
    sl.status,
    sl.retry_count,
    sl.error_message,
    sl.created_at,
    sl.updated_at,
    sl.request_payload
FROM affiliatewp_sync_log sl
LEFT JOIN profiles p ON p.id = sl.profile_id
WHERE sl.status IN ('failed', 'dead_letter_queue')
    AND sl.operation = 'create'
ORDER BY sl.updated_at DESC
LIMIT 100;

-- Profiles awaiting AffiliateWP creation
CREATE OR REPLACE VIEW profiles_pending_affiliatewp AS
SELECT
    p.id as profile_id,
    p.company_email,
    p.full_name,
    p.affiliatewp_sync_status,
    p.affiliatewp_sync_error,
    p.created_at,
    sl.id as sync_log_id,
    sl.status as sync_status,
    sl.retry_count,
    sl.error_message as sync_error_message
FROM profiles p
LEFT JOIN affiliatewp_sync_log sl ON sl.profile_id = p.id AND sl.operation = 'create'
WHERE p.user_role = 'sales_rep'
    AND p.affiliatewp_id IS NULL
    AND p.created_at > now() - interval '30 days'
ORDER BY p.created_at DESC;

-- =========================================
-- PART 3: Utility Functions
-- =========================================

-- Get comprehensive sync statistics
CREATE OR REPLACE FUNCTION get_affiliatewp_sync_stats()
RETURNS jsonb AS $$
DECLARE
    stats jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_profiles', (SELECT COUNT(*) FROM profiles WHERE user_role = 'sales_rep'),
        'with_affiliatewp_id', (SELECT COUNT(*) FROM profiles WHERE user_role = 'sales_rep' AND affiliatewp_id IS NOT NULL),
        'pending_creation', (SELECT COUNT(*) FROM profiles WHERE user_role = 'sales_rep' AND affiliatewp_id IS NULL AND affiliatewp_sync_status IN ('pending', 'syncing')),
        'failed_creation', (SELECT COUNT(*) FROM profiles WHERE user_role = 'sales_rep' AND affiliatewp_id IS NULL AND affiliatewp_sync_status = 'failed'),
        'sync_operations', jsonb_build_object(
            'total', (SELECT COUNT(*) FROM affiliatewp_sync_log WHERE operation = 'create'),
            'pending', (SELECT COUNT(*) FROM affiliatewp_sync_log WHERE operation = 'create' AND status = 'pending'),
            'processing', (SELECT COUNT(*) FROM affiliatewp_sync_log WHERE operation = 'create' AND status = 'processing'),
            'success', (SELECT COUNT(*) FROM affiliatewp_sync_log WHERE operation = 'create' AND status = 'success'),
            'failed', (SELECT COUNT(*) FROM affiliatewp_sync_log WHERE operation = 'create' AND status = 'failed'),
            'dead_letter_queue', (SELECT COUNT(*) FROM affiliatewp_sync_log WHERE operation = 'create' AND status = 'dead_letter_queue')
        ),
        'last_24_hours', jsonb_build_object(
            'created', (SELECT COUNT(*) FROM affiliatewp_sync_log WHERE operation = 'create' AND created_at > now() - interval '24 hours'),
            'success', (SELECT COUNT(*) FROM affiliatewp_sync_log WHERE operation = 'create' AND status = 'success' AND processed_at > now() - interval '24 hours'),
            'failed', (SELECT COUNT(*) FROM affiliatewp_sync_log WHERE operation = 'create' AND status = 'failed' AND updated_at > now() - interval '24 hours')
        ),
        'performance', jsonb_build_object(
            'avg_processing_time_seconds', (
                SELECT ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - created_at)))::numeric, 2)
                FROM affiliatewp_sync_log
                WHERE operation = 'create' AND status = 'success' AND processed_at > now() - interval '24 hours'
            ),
            'success_rate_24h', (
                SELECT ROUND(
                    100.0 * COUNT(*) FILTER (WHERE status = 'success') / 
                    NULLIF(COUNT(*), 0), 
                    2
                )
                FROM affiliatewp_sync_log
                WHERE operation = 'create' AND created_at > now() - interval '24 hours'
            )
        ),
        'timestamp', now()
    ) INTO stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Retry specific failed sync
CREATE OR REPLACE FUNCTION retry_failed_affiliatewp_sync(log_id_param uuid)
RETURNS jsonb AS $$
DECLARE
    log_record RECORD;
    new_retry_count integer;
BEGIN
    -- Get the log entry
    SELECT
        sl.id,
        sl.profile_id,
        sl.retry_count,
        sl.status,
        p.company_email,
        p.full_name,
        p.affiliatewp_id
    INTO log_record
    FROM affiliatewp_sync_log sl
    INNER JOIN profiles p ON p.id = sl.profile_id
    WHERE sl.id = log_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Sync log entry not found'
        );
    END IF;
    
    IF log_record.affiliatewp_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Profile already has an AffiliateWP account',
            'affiliatewp_id', log_record.affiliatewp_id
        );
    END IF;
    
    IF log_record.status NOT IN ('failed', 'dead_letter_queue') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Can only retry failed or dead letter queue entries',
            'current_status', log_record.status
        );
    END IF;
    
    -- Reset the entry for retry
    new_retry_count := CASE
        WHEN log_record.status = 'dead_letter_queue' THEN 0
        ELSE log_record.retry_count
    END;
    
    UPDATE affiliatewp_sync_log
    SET
        status = 'pending',
        retry_count = new_retry_count,
        error_message = NULL,
        updated_at = now()
    WHERE id = log_id_param;
    
    UPDATE profiles
    SET
        affiliatewp_sync_status = 'pending',
        affiliatewp_sync_error = NULL
    WHERE id = log_record.profile_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Sync entry reset for retry',
        'log_id', log_id_param,
        'profile_id', log_record.profile_id,
        'email', log_record.company_email,
        'retry_count_reset_to', new_retry_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old completed logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_affiliatewp_logs()
RETURNS jsonb AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM affiliatewp_sync_log
    WHERE status = 'success'
        AND processed_at < now() - interval '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'deleted_count', deleted_count,
        'message', format('Deleted %s old completed sync logs', deleted_count)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON affiliatewp_sync_dashboard TO authenticated, service_role;
GRANT SELECT ON affiliatewp_recent_failures TO authenticated, service_role;
GRANT SELECT ON profiles_pending_affiliatewp TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_affiliatewp_sync_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION retry_failed_affiliatewp_sync(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_affiliatewp_logs() TO service_role;

-- Schedule cleanup to run weekly (Sundays at 2 AM)
SELECT cron.schedule(
    'cleanup-old-affiliatewp-logs',
    '0 2 * * 0',
    $$SELECT cleanup_old_affiliatewp_logs()$$
);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Performance Indexes and Monitoring Added';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Indexes created for optimized query performance';
    RAISE NOTICE 'Monitoring views available:';
    RAISE NOTICE '  - affiliatewp_sync_dashboard (real-time stats)';
    RAISE NOTICE '  - affiliatewp_recent_failures (debugging)';
    RAISE NOTICE '  - profiles_pending_affiliatewp (awaiting creation)';
    RAISE NOTICE '';
    RAISE NOTICE 'Utility functions:';
    RAISE NOTICE '  - get_affiliatewp_sync_stats(): Get comprehensive statistics';
    RAISE NOTICE '  - retry_failed_affiliatewp_sync(log_id): Retry a failed sync';
    RAISE NOTICE '  - cleanup_old_affiliatewp_logs(): Clean old logs (auto-scheduled weekly)';
    RAISE NOTICE '';
    RAISE NOTICE 'To view stats: SELECT * FROM affiliatewp_sync_dashboard;';
    RAISE NOTICE 'To view failures: SELECT * FROM affiliatewp_recent_failures LIMIT 10;';
END $$;
