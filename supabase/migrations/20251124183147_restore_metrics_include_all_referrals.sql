/*
  # Restore Metrics to Include All Referrals

  1. Purpose
    - Restore affiliate_metrics_daily to include ALL referrals regardless of status
    - This reverts the previous migration that excluded rejected payments

  2. Changes
    - Recalculates earnings to include rejected, pending, unpaid, and paid referrals
    - Updates unpaid_earnings to only include pending and unpaid statuses
    - Includes all referrals in the referral count

  3. Implementation
    - Stores current visits data before recalculation
    - Truncates and rebuilds affiliate_metrics_daily from all affiliate_referrals
    - Restores visits data after recalculation

  4. Notes
    - This ensures visits and referrals display correctly
    - Total earnings will include rejected payments in the calculation
*/

-- Store existing visits data in a temporary table
CREATE TEMP TABLE temp_visits_restore AS
SELECT affiliate_id, date, visits
FROM public.affiliate_metrics_daily;

-- Truncate the metrics table
TRUNCATE TABLE public.affiliate_metrics_daily;

-- Rebuild metrics from ALL referrals (including rejected)
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
WHERE ar.date IS NOT NULL
GROUP BY ar.affiliate_id, ar.profile_id, DATE(ar.date)
ORDER BY ar.affiliate_id, DATE(ar.date);

-- Restore visits data from the temporary table
UPDATE public.affiliate_metrics_daily amd
SET visits = tv.visits, updated_at = NOW()
FROM temp_visits_restore tv
WHERE amd.affiliate_id = tv.affiliate_id
  AND amd.date = tv.date;

-- Drop the temporary table
DROP TABLE temp_visits_restore;
