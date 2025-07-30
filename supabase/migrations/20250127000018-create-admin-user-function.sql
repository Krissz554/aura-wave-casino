-- Create function for admins to get all users
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE (
  id UUID,
  email TEXT,
  username TEXT,
  level INTEGER,
  xp INTEGER,
  balance NUMERIC,
  total_wagered NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE,
  last_seen TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Return all users
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.username,
    p.level,
    p.xp,
    p.balance,
    p.total_wagered,
    p.created_at,
    p.last_seen
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin() TO authenticated;

-- Add policy to allow admins to execute this function
CREATE POLICY "Admins can execute get_all_users_for_admin"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  )
);