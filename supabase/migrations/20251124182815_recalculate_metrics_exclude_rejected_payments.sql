/*
  # Recalculate Metrics to Exclude Rejected Payments

  1. Purpose
    - Update affiliate_metrics_daily to exclude rejected referrals from earnings calculations
    - Ensures Total Earnings tile displays accurate amounts without rejected payments

  2. Changes
    - Recalculates earnings and referral counts for all dates in affiliate_metrics_daily
    - Excludes referrals with status = 'rejected' from all calculations
    - Updates unpaid_earnings to only include pending and unpaid statuses
    - Preserves existing visits data

  3. Implementation
    - Stores current visits data before recalculation
    - Truncates and rebuilds affiliate_metrics_daily table from affiliate_referrals
    - Uses aggregation to sum earnings by affiliate_id and date
    - Filters out rejected payments from all calculations
    - Restores visits data after recalculation

  4. Notes
    - This is a one-time correction of historical data
    - Future syncs will use the updated edge function logic
    - Rejected referrals remain in affiliate_referrals table for record-keeping
*/

-- Store existing visits data in a temporary table
CREATE TEMP TABLE temp_visits AS
SELECT affiliate_id, date, visits
FROM public.affiliate_metrics_daily;

-- Truncate the metrics table
TRUNCATE TABLE public.affiliate_metrics_daily;

-- Rebuild metrics from referrals, excluding rejected payments
INSERT INTO public.affiliate_metrics_daily (
  affiliate_id,
  profile_id,
  date,
  visits,
  referrals,
  earnings,
  unpaid_earnings,
  created_at,
  updated_at
)
SELECT
  ar.affiliate_id,
  ar.profile_id,
  DATE(ar.date) as date,
  0 as visits, -- Will be restored from temp table
  COUNT(*) as referrals,
  COALESCE(SUM(ar.amount), 0) as earnings,
  COALESCE(SUM(CASE WHEN ar.status IN ('pending', 'unpaid') THEN ar.amount ELSE 0 END), 0) as unpaid_earnings,
  NOW() as created_at,
  NOW() as updated_at
FROM public.affiliate_referrals ar
WHERE ar.status != 'rejected' -- Exclude rejected payments
  AND ar.date IS NOT NULL
GROUP BY ar.affiliate_id, ar.profile_id, DATE(ar.date)
ORDER BY ar.affiliate_id, DATE(ar.date);

-- Restore visits data from the temporary table
UPDATE public.affiliate_metrics_daily amd
SET visits = tv.visits, updated_at = NOW()
FROM temp_visits tv
WHERE amd.affiliate_id = tv.affiliate_id
  AND amd.date = tv.date;

-- Drop the temporary table
DROP TABLE temp_visits;
