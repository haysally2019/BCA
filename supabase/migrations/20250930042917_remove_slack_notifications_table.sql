/*
  # Remove Slack Notifications Table

  1. Cleanup
    - Drop `slack_notifications` table and related indexes
    - Remove unused Slack notification functionality per user request
    
  2. Security
    - Clean removal of table with IF EXISTS to prevent errors
*/

-- Drop indexes first
DROP INDEX IF EXISTS idx_slack_notifications_date;
DROP INDEX IF EXISTS idx_slack_notifications_status;

-- Drop the slack_notifications table
DROP TABLE IF EXISTS slack_notifications;