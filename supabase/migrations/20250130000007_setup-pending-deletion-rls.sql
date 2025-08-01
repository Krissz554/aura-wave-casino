-- Setup RLS policies for pending_account_deletions table
-- This allows users to check their own pending deletion status

-- =============================================================================
-- 1. ENABLE RLS ON PENDING_ACCOUNT_DELETIONS TABLE
-- =============================================================================

-- Enable RLS if not already enabled
ALTER TABLE public.pending_account_deletions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. DROP EXISTING POLICIES (IF ANY)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view their own pending deletions" ON public.pending_account_deletions;
DROP POLICY IF EXISTS "Users can select their own pending deletions" ON public.pending_account_deletions;
DROP POLICY IF EXISTS "Admins can manage all pending deletions" ON public.pending_account_deletions;
DROP POLICY IF EXISTS "pending_deletions_select_own" ON public.pending_account_deletions;
DROP POLICY IF EXISTS "pending_deletions_admin_all" ON public.pending_account_deletions;

-- =============================================================================
-- 3. CREATE RLS POLICIES
-- =============================================================================

-- Allow users to view their own pending deletion records
CREATE POLICY "pending_deletions_select_own" 
ON public.pending_account_deletions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow admins to manage all pending deletion records
CREATE POLICY "pending_deletions_admin_all" 
ON public.pending_account_deletions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);

-- =============================================================================
-- 4. GRANT PERMISSIONS
-- =============================================================================

-- Grant SELECT permission to authenticated users (for their own records)
GRANT SELECT ON public.pending_account_deletions TO authenticated;

-- =============================================================================
-- 5. TEST THE POLICIES
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Pending account deletions RLS policies have been set up successfully!';
  RAISE NOTICE 'Users can now check their own pending deletion status.';
  RAISE NOTICE 'Admins can manage all pending deletion records.';
END;
$$;