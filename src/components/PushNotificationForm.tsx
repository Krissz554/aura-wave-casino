import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Send, AlertTriangle, Users } from 'lucide-react';

interface PushNotificationFormProps {
  onClose?: () => void;
}

export function PushNotificationForm({ onClose }: PushNotificationFormProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both a title and message for the notification.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get all users (including unauthenticated users)
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, username');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        toast({
          title: "Error fetching users",
          description: usersError.message || String(usersError),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      if (!users || users.length === 0) {
        toast({
          title: "No users found",
          description: "No users were found in the profiles table.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Create notifications for all users
      const notifications = users.map(user => ({
        user_id: user.id,
        type: 'admin_message',
        title: title.trim(),
        message: message.trim(),
        data: {
          sent_by: 'admin',
          timestamp: new Date().toISOString(),
          broadcast: true
        }
      }));

      // Insert notifications in batches
      const batchSize = 100;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(batch);

        if (insertError) {
          console.error('Error inserting notifications:', insertError);
          toast({
            title: "Error inserting notifications",
            description: insertError.message || String(insertError),
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // Log the broadcast action
      const { error: logError } = await supabase
        .from('audit_logs')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'broadcast_notification',
          details: {
            title: title.trim(),
            message: message.trim(),
            recipients_count: users.length,
            timestamp: new Date().toISOString()
          }
        });

      if (logError) {
        console.error('Error logging broadcast:', logError);
        toast({
          title: "Error logging broadcast",
          description: logError.message || String(logError),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Notification Sent!",
        description: `Successfully sent notification to ${users.length} users.`,
        variant: "default",
      });

      // Reset form
      setTitle('');
      setMessage('');
      setShowConfirm(false);

    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast({
        title: "Error sending notification",
        description: error.message || String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-primary" />
          <span>Push Notifications</span>
          <Badge variant="secondary" className="ml-2">Broadcast</Badge>
        </CardTitle>
        <CardDescription>
          Send notifications to all users on the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Notification Title
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title..."
              maxLength={100}
              required
            />
            <div className="text-xs text-muted-foreground">
              {title.length}/100 characters
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium">
              Notification Message
            </label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter notification message..."
              rows={4}
              maxLength={500}
              required
            />
            <div className="text-xs text-muted-foreground">
              {message.length}/500 characters
            </div>
          </div>

          <div className="flex items-center space-x-2 p-3 bg-warning/10 rounded-lg border border-warning/20">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm text-warning-foreground">
              This notification will be sent to ALL users on the platform.
            </span>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            
            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
              <AlertDialogTrigger asChild>
                <Button
                  type="submit"
                  disabled={loading || !title.trim() || !message.trim()}
                  className="gradient-primary text-white"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Notification
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    <span>Confirm Broadcast</span>
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to send this notification to ALL users on the platform? 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleSendNotification}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Send to All Users
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}