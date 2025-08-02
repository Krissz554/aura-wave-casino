-- ENHANCE EXISTING MAINTENANCE SYSTEM - COMPREHENSIVE ACTIVITY PAUSE
-- Enhances the existing admin panel maintenance system to pause ALL activity
-- Keeps admin panel accessible while blocking all user actions and edge functions

BEGIN;

-- =====================================================================
-- STEP 1: ENHANCE MAINTENANCE SETTINGS TABLE
-- =====================================================================

-- Add additional maintenance control fields to existing table
DO $$
BEGIN
  -- Add pause_edge_functions column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_settings' 
    AND column_name = 'pause_edge_functions'
  ) THEN
    ALTER TABLE public.maintenance_settings ADD COLUMN pause_edge_functions BOOLEAN DEFAULT true;
    RAISE NOTICE '✅ Added pause_edge_functions column';
  END IF;

  -- Add pause_user_actions column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_settings' 
    AND column_name = 'pause_user_actions'
  ) THEN
    ALTER TABLE public.maintenance_settings ADD COLUMN pause_user_actions BOOLEAN DEFAULT true;
    RAISE NOTICE '✅ Added pause_user_actions column';
  END IF;

  -- Add allowed_admin_actions column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_settings' 
    AND column_name = 'allowed_admin_actions'
  ) THEN
    ALTER TABLE public.maintenance_settings ADD COLUMN allowed_admin_actions TEXT[] DEFAULT ARRAY['admin_panel', 'maintenance_control', 'user_management']::TEXT[];
    RAISE NOTICE '✅ Added allowed_admin_actions column';
  END IF;

  -- Add maintenance_reason column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_settings' 
    AND column_name = 'maintenance_reason'
  ) THEN
    ALTER TABLE public.maintenance_settings ADD COLUMN maintenance_reason TEXT DEFAULT 'Scheduled maintenance';
    RAISE NOTICE '✅ Added maintenance_reason column';
  END IF;

  -- Add estimated_duration column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_settings' 
    AND column_name = 'estimated_duration'
  ) THEN
    ALTER TABLE public.maintenance_settings ADD COLUMN estimated_duration INTERVAL DEFAULT '30 minutes'::INTERVAL;
    RAISE NOTICE '✅ Added estimated_duration column';
  END IF;
END $$;

-- =====================================================================
-- STEP 2: CREATE MAINTENANCE CHECK FUNCTION
-- =====================================================================

-- Function to check if action is allowed during maintenance
CREATE OR REPLACE FUNCTION public.check_maintenance_allowed(
  p_action_type TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  maintenance_settings RECORD;
  user_is_admin BOOLEAN := false;
  is_allowed BOOLEAN := false;
BEGIN
  -- Get current maintenance settings
  SELECT * INTO maintenance_settings
  FROM public.maintenance_settings
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no maintenance settings found, allow all actions
  IF maintenance_settings IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'No maintenance configuration found'
    );
  END IF;
  
  -- If maintenance mode is disabled, allow all actions
  IF NOT maintenance_settings.is_maintenance_mode THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'Maintenance mode disabled'
    );
  END IF;
  
  -- Check if user is admin (if user_id provided)
  IF p_user_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.admin_users 
      WHERE user_id = p_user_id
    ) INTO user_is_admin;
  END IF;
  
  -- If user is admin and action is in allowed admin actions, allow
  IF user_is_admin AND p_action_type = ANY(maintenance_settings.allowed_admin_actions) THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'Admin access granted'
    );
  END IF;
  
  -- Check specific action restrictions during maintenance
  CASE p_action_type
    WHEN 'edge_function' THEN
      is_allowed := NOT maintenance_settings.pause_edge_functions;
    WHEN 'roulette_bet', 'game_action', 'user_action', 'balance_update' THEN
      is_allowed := NOT maintenance_settings.pause_user_actions;
    WHEN 'admin_panel', 'maintenance_control' THEN
      is_allowed := true; -- Always allow admin panel access
    ELSE
      is_allowed := NOT maintenance_settings.pause_user_actions; -- Default to user action restriction
  END CASE;
  
  -- Return result with maintenance info
  IF is_allowed THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'Action permitted during maintenance'
    );
  ELSE
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Action blocked due to maintenance mode',
      'maintenance_active', true,
      'maintenance_message', maintenance_settings.maintenance_message,
      'maintenance_title', maintenance_settings.maintenance_title,
      'maintenance_reason', maintenance_settings.maintenance_reason,
      'estimated_duration', EXTRACT(EPOCH FROM maintenance_settings.estimated_duration),
      'started_at', maintenance_settings.started_at
    );
  END IF;
END;
$$;

-- =====================================================================
-- STEP 3: ENHANCE TOGGLE MAINTENANCE FUNCTION
-- =====================================================================

-- Enhanced function to toggle maintenance mode with comprehensive controls
CREATE OR REPLACE FUNCTION public.toggle_maintenance_mode_enhanced(
  p_enable BOOLEAN,
  p_message TEXT DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_estimated_duration INTERVAL DEFAULT NULL,
  p_pause_edge_functions BOOLEAN DEFAULT true,
  p_pause_user_actions BOOLEAN DEFAULT true,
  p_allowed_admin_actions TEXT[] DEFAULT ARRAY['admin_panel', 'maintenance_control', 'user_management']::TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_settings RECORD;
  result JSONB;
BEGIN
  -- Get current settings
  SELECT * INTO current_settings 
  FROM public.maintenance_settings 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Update or insert maintenance settings
  IF current_settings IS NOT NULL THEN
    UPDATE public.maintenance_settings
    SET 
      is_maintenance_mode = p_enable,
      maintenance_message = COALESCE(p_message, maintenance_message),
      maintenance_title = COALESCE(p_title, maintenance_title),
      maintenance_reason = COALESCE(p_reason, maintenance_reason),
      estimated_duration = COALESCE(p_estimated_duration, estimated_duration),
      pause_edge_functions = p_pause_edge_functions,
      pause_user_actions = p_pause_user_actions,
      allowed_admin_actions = p_allowed_admin_actions,
      started_at = CASE WHEN p_enable THEN NOW() ELSE started_at END,
      ended_at = CASE WHEN NOT p_enable THEN NOW() ELSE NULL END,
      updated_at = NOW()
    WHERE id = current_settings.id;
  ELSE
    INSERT INTO public.maintenance_settings (
      is_maintenance_mode,
      maintenance_message,
      maintenance_title,
      maintenance_reason,
      estimated_duration,
      pause_edge_functions,
      pause_user_actions,
      allowed_admin_actions,
      started_at
    ) VALUES (
      p_enable,
      COALESCE(p_message, 'Website is currently under maintenance. Please check back soon.'),
      COALESCE(p_title, 'Under Maintenance'),
      COALESCE(p_reason, 'Scheduled maintenance'),
      COALESCE(p_estimated_duration, '30 minutes'::INTERVAL),
      p_pause_edge_functions,
      p_pause_user_actions,
      p_allowed_admin_actions,
      CASE WHEN p_enable THEN NOW() ELSE NULL END
    );
  END IF;
  
  -- Log the maintenance action
  INSERT INTO public.audit_logs (
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    user_id
  ) VALUES (
    CASE WHEN p_enable THEN 'maintenance_enabled' ELSE 'maintenance_disabled' END,
    'maintenance_settings',
    COALESCE(current_settings.id, (SELECT id FROM public.maintenance_settings ORDER BY created_at DESC LIMIT 1)),
    CASE WHEN current_settings IS NOT NULL THEN to_jsonb(current_settings) ELSE NULL END,
    jsonb_build_object(
      'maintenance_mode', p_enable,
      'pause_edge_functions', p_pause_edge_functions,
      'pause_user_actions', p_pause_user_actions,
      'reason', COALESCE(p_reason, 'Scheduled maintenance')
    ),
    NULL -- Will be filled by calling admin
  );
  
  -- Build response
  result := jsonb_build_object(
    'success', true,
    'maintenance_mode', p_enable,
    'message', CASE WHEN p_enable THEN 'Maintenance mode enabled - All activity paused' ELSE 'Maintenance mode disabled - All activity resumed' END,
    'settings', jsonb_build_object(
      'is_maintenance_mode', p_enable,
      'maintenance_message', COALESCE(p_message, COALESCE(current_settings.maintenance_message, 'Website is currently under maintenance. Please check back soon.')),
      'maintenance_title', COALESCE(p_title, COALESCE(current_settings.maintenance_title, 'Under Maintenance')),
      'maintenance_reason', COALESCE(p_reason, COALESCE(current_settings.maintenance_reason, 'Scheduled maintenance')),
      'estimated_duration', EXTRACT(EPOCH FROM COALESCE(p_estimated_duration, COALESCE(current_settings.estimated_duration, '30 minutes'::INTERVAL))),
      'pause_edge_functions', p_pause_edge_functions,
      'pause_user_actions', p_pause_user_actions,
      'allowed_admin_actions', p_allowed_admin_actions
    )
  );
  
  RAISE NOTICE '[MAINTENANCE] % - Edge Functions: %, User Actions: %', 
    CASE WHEN p_enable THEN 'ENABLED' ELSE 'DISABLED' END,
    CASE WHEN p_pause_edge_functions THEN 'PAUSED' ELSE 'ACTIVE' END,
    CASE WHEN p_pause_user_actions THEN 'PAUSED' ELSE 'ACTIVE' END;
  
  RETURN result;
END;
$$;

-- =====================================================================
-- STEP 4: ENHANCED MAINTENANCE STATUS FUNCTION
-- =====================================================================

-- Enhanced function to get detailed maintenance status
CREATE OR REPLACE FUNCTION public.get_maintenance_status_enhanced()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings RECORD;
  estimated_end_time TIMESTAMPTZ;
BEGIN
  SELECT * INTO settings 
  FROM public.maintenance_settings 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF settings IS NULL THEN
    RETURN jsonb_build_object(
      'is_maintenance_mode', false,
      'maintenance_active', false,
      'message', 'No maintenance configuration found'
    );
  END IF;
  
  -- Calculate estimated end time if maintenance is active
  IF settings.is_maintenance_mode AND settings.started_at IS NOT NULL THEN
    estimated_end_time := settings.started_at + settings.estimated_duration;
  END IF;
  
  RETURN jsonb_build_object(
    'is_maintenance_mode', settings.is_maintenance_mode,
    'maintenance_active', settings.is_maintenance_mode,
    'maintenance_message', settings.maintenance_message,
    'maintenance_title', settings.maintenance_title,
    'maintenance_reason', settings.maintenance_reason,
    'started_at', settings.started_at,
    'ended_at', settings.ended_at,
    'estimated_duration_seconds', EXTRACT(EPOCH FROM settings.estimated_duration),
    'estimated_end_time', estimated_end_time,
    'pause_edge_functions', settings.pause_edge_functions,
    'pause_user_actions', settings.pause_user_actions,
    'allowed_admin_actions', settings.allowed_admin_actions,
    'created_at', settings.created_at,
    'updated_at', settings.updated_at
  );
END;
$$;

-- =====================================================================
-- STEP 5: CREATE MAINTENANCE-AWARE WRAPPER FUNCTIONS
-- =====================================================================

-- Wrapper for edge functions to check maintenance
CREATE OR REPLACE FUNCTION public.edge_function_maintenance_check(
  p_function_name TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  maintenance_check JSONB;
BEGIN
  -- Check if edge function is allowed
  SELECT public.check_maintenance_allowed('edge_function', p_user_id) INTO maintenance_check;
  
  IF NOT (maintenance_check->>'allowed')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Edge function paused due to maintenance',
      'maintenance_info', maintenance_check,
      'function_name', p_function_name
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Edge function allowed',
    'function_name', p_function_name
  );
END;
$$;

-- Wrapper for user actions to check maintenance
CREATE OR REPLACE FUNCTION public.user_action_maintenance_check(
  p_action_type TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  maintenance_check JSONB;
BEGIN
  -- Check if user action is allowed
  SELECT public.check_maintenance_allowed(p_action_type, p_user_id) INTO maintenance_check;
  
  IF NOT (maintenance_check->>'allowed')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Action blocked due to maintenance mode',
      'maintenance_info', maintenance_check,
      'action_type', p_action_type
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Action allowed',
    'action_type', p_action_type
  );
END;
$$;

-- =====================================================================
-- STEP 6: ENHANCED ROULETTE FUNCTION WITH MAINTENANCE CHECK
-- =====================================================================

-- Backup and enhance the complete_roulette_round function with maintenance check
DROP FUNCTION IF EXISTS public.complete_roulette_round_with_maintenance CASCADE;

CREATE OR REPLACE FUNCTION public.complete_roulette_round_with_maintenance(p_round_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  maintenance_check JSONB;
  roulette_result JSONB;
BEGIN
  -- Check maintenance status first
  SELECT public.edge_function_maintenance_check('roulette-engine') INTO maintenance_check;
  
  IF NOT (maintenance_check->>'success')::BOOLEAN THEN
    RETURN maintenance_check;
  END IF;
  
  -- Call the original roulette function
  SELECT public.complete_roulette_round(p_round_id) INTO roulette_result;
  
  RETURN roulette_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_maintenance_allowed(TEXT, UUID) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_maintenance_mode_enhanced(BOOLEAN, TEXT, TEXT, TEXT, INTERVAL, BOOLEAN, BOOLEAN, TEXT[]) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_maintenance_status_enhanced() TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.edge_function_maintenance_check(TEXT, UUID) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_action_maintenance_check(TEXT, UUID) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_roulette_round_with_maintenance(UUID) TO postgres, anon, authenticated, service_role;

-- =====================================================================
-- STEP 7: UPDATE DEFAULT MAINTENANCE SETTINGS
-- =====================================================================

-- Update existing maintenance settings with new defaults
UPDATE public.maintenance_settings
SET 
  pause_edge_functions = COALESCE(pause_edge_functions, true),
  pause_user_actions = COALESCE(pause_user_actions, true),
  allowed_admin_actions = COALESCE(allowed_admin_actions, ARRAY['admin_panel', 'maintenance_control', 'user_management']::TEXT[]),
  maintenance_reason = COALESCE(maintenance_reason, 'Scheduled maintenance'),
  estimated_duration = COALESCE(estimated_duration, '30 minutes'::INTERVAL),
  updated_at = NOW()
WHERE id = (SELECT id FROM public.maintenance_settings ORDER BY created_at DESC LIMIT 1);

-- If no maintenance settings exist, create default
INSERT INTO public.maintenance_settings (
  is_maintenance_mode,
  maintenance_message,
  maintenance_title,
  maintenance_reason,
  estimated_duration,
  pause_edge_functions,
  pause_user_actions,
  allowed_admin_actions
)
SELECT 
  false,
  'Website is currently under maintenance. Please check back soon.',
  'Under Maintenance',
  'Scheduled maintenance',
  '30 minutes'::INTERVAL,
  true,
  true,
  ARRAY['admin_panel', 'maintenance_control', 'user_management']::TEXT[]
WHERE NOT EXISTS (SELECT 1 FROM public.maintenance_settings);

-- =====================================================================
-- STEP 8: TEST THE ENHANCED MAINTENANCE SYSTEM
-- =====================================================================

DO $$
DECLARE
  status_result JSONB;
  check_result JSONB;
BEGIN
  RAISE NOTICE '🧪 === TESTING ENHANCED MAINTENANCE SYSTEM ===';
  
  -- Test getting maintenance status
  SELECT public.get_maintenance_status_enhanced() INTO status_result;
  RAISE NOTICE 'Maintenance status: %', status_result;
  
  -- Test edge function check
  SELECT public.edge_function_maintenance_check('roulette-engine') INTO check_result;
  RAISE NOTICE 'Edge function check: %', check_result;
  
  -- Test user action check
  SELECT public.user_action_maintenance_check('roulette_bet', '00000000-0000-0000-0000-000000000000') INTO check_result;
  RAISE NOTICE 'User action check: %', check_result;
  
  RAISE NOTICE '✅ Enhanced maintenance system ready!';
  RAISE NOTICE '🧪 === END TESTING ===';
END $$;

COMMIT;

-- Show final status
SELECT 'ENHANCED MAINTENANCE SYSTEM READY - All activity can be paused while keeping admin panel accessible!' as final_status;