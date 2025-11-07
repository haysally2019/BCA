/*
  # Remove Unused Database Tables

  This migration removes tables that are not used anywhere in the application codebase.
  
  ## Tables Being Removed:
  
  1. **analytics_events** - No code references
  2. **appointment_types** - No code references  
  3. **calls** - No code references
  4. **call_scripts** - No code references
  5. **commission_payments** - No code references
  6. **commission_structures** - No code references
  7. **integrations** - No code references
  8. **lead_sources** - No code references
  9. **sms_campaigns** - No code references
  10. **sms_messages** - No code references
  11. **workflow_executions** - No code references
  12. **workflows** - No code references
  
  ## Impact:
  - Reduces database complexity
  - Improves maintainability
  - Removes confusion about which tables are actively used
  - No data loss as these tables are not being used
*/

-- Drop unused tables (if they exist)
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS appointment_types CASCADE;
DROP TABLE IF EXISTS calls CASCADE;
DROP TABLE IF EXISTS call_scripts CASCADE;
DROP TABLE IF EXISTS commission_payments CASCADE;
DROP TABLE IF EXISTS commission_structures CASCADE;
DROP TABLE IF EXISTS integrations CASCADE;
DROP TABLE IF EXISTS lead_sources CASCADE;
DROP TABLE IF EXISTS sms_campaigns CASCADE;
DROP TABLE IF EXISTS sms_messages CASCADE;
DROP TABLE IF EXISTS workflow_executions CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;
