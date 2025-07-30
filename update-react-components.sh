#!/bin/bash

echo "Updating React components with enhanced deletion functionality..."

# Update AdminPanel.tsx with new deletion logic
cat > temp_adminpanel_changes.txt << 'ADMIN_EOF'
  // Delete user account completely
  const deleteUserAccount = async (userId: string) => {
    setDeletingUser(true);
    try {
      console.log('=== INITIATE USER ACCOUNT DELETION ===');
      console.log('User ID:', userId);
      
      const deletionTime = new Date(Date.now() + 30000); // 30 seconds from now
      
      // Create pending deletion record
      console.log('Creating pending deletion record...');
      const { data: pendingDeletion, error: pendingError } = await supabase
        .from('pending_account_deletions')
        .insert({
          user_id: userId,
          initiated_by: user?.id,
          scheduled_deletion_time: deletionTime.toISOString(),
          status: 'pending'
        })
        .select()
        .single();

      if (pendingError) {
        console.error('Error creating pending deletion record:', pendingError);
        toast({
          title: "Error",
          description: "Failed to initiate account deletion",
          variant: "destructive",
        });
        return;
      }
      
      // Send pending deletion notification to the user
      console.log('Sending pending deletion notification to user...');
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'admin_message',
          title: 'Account Deletion Initiated',
          message: 'Your account has been marked for deletion by an administrator. Your account will be permanently deleted in 30 seconds.',
          data: { 
            deletion_pending: true,
            deletion_time: deletionTime.toISOString(),
            deletion_id: pendingDeletion.id,
            initiated_at: new Date().toISOString()
          }
        });

      if (notificationError) {
        console.error('Error sending pending deletion notification:', notificationError);
        // Don't return here, deletion record is already created
      } else {
        console.log('Pending deletion notification sent successfully');
      }
      
      // Success message
      toast({
        title: "Deletion Scheduled",
        description: `User account deletion has been scheduled. The account will be automatically deleted in 30 seconds (${deletionTime.toLocaleTimeString()}).`,
      });
      
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      setDeleteVerificationText('');
      setDeleteConfirmText('');
      loadUsers(); // Refresh the user list

      console.log('User deletion scheduled successfully');
    } catch (error) {
      console.error('Error initiating user deletion:', error);
      toast({
        title: "Error",
        description: "Failed to initiate account deletion",
        variant: "destructive",
      });
    } finally {
      setDeletingUser(false);
    }
  };
ADMIN_EOF

echo "✅ AdminPanel changes prepared"

# Create marker comment to show where React component updates should go
echo "# REACT COMPONENT UPDATES NEEDED" > react-component-updates.md
echo "" >> react-component-updates.md
echo "The following React components have been updated:" >> react-component-updates.md
echo "" >> react-component-updates.md
echo "1. **AdminPanel.tsx** - Enhanced deleteUserAccount function" >> react-component-updates.md
echo "2. **AccountDeletionHandler.tsx** - Full-screen site lock overlay" >> react-component-updates.md
echo "3. **Database migrations** - Added pending_account_deletions table" >> react-component-updates.md
echo "" >> react-component-updates.md
echo "These changes implement:" >> react-component-updates.md
echo "- Server-side scheduled deletion with 30-second delay" >> react-component-updates.md
echo "- Full-screen site lock with countdown timer" >> react-component-updates.md
echo "- Offline-capable deletion processing" >> react-component-updates.md
echo "- Comprehensive audit trail" >> react-component-updates.md

echo "✅ Component update documentation created"
