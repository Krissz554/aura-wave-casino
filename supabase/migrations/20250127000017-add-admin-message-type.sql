-- Add admin_message type to notifications table constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('tip_sent', 'tip_received', 'achievement_unlocked', 'level_up', 'admin_message'));

-- Add policy for admin users to insert notifications
CREATE POLICY "Admins can insert notifications for any user" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);