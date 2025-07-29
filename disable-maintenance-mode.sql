-- Disable Maintenance Mode SQL Script
-- This script will disable maintenance mode by updating the maintenance_settings table
-- Run this script directly in your database to disable maintenance mode

-- Method 1: Direct table update (if you have direct database access)
UPDATE public.maintenance_settings 
SET 
  is_maintenance_mode = false,
  ended_at = now(),
  updated_at = now()
WHERE id = (SELECT id FROM public.maintenance_settings LIMIT 1);

-- Method 2: Using the toggle function (if you have service role access)
-- SELECT public.toggle_maintenance_mode(false);

-- Verify the change
SELECT 
  is_maintenance_mode,
  maintenance_message,
  maintenance_title,
  started_at,
  ended_at,
  updated_at
FROM public.maintenance_settings;

-- Additional verification query
SELECT public.get_maintenance_status();