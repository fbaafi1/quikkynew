import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  // Handle both prefixed and non-prefixed notification IDs
  const notificationId = params.id.startsWith('admin_msg_') 
    ? params.id.replace('admin_msg_', '')
    : params.id;

  try {
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      return NextResponse.json(
        { error: 'Authentication error', details: authError.message },
        { status: 401 }
      );
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // First try to find the notification in admin_notifications
    let notification: { id: string; vendor_id: string; is_read: boolean } | null = null;
    let fetchError = null;
    
    // Try to find in admin_notifications first
    const { data: adminNotification, error: adminError } = await supabase
      .from('admin_notifications')
      .select('id, vendor_id, is_read')
      .eq('id', notificationId)
      .maybeSingle();
      
    if (adminNotification) {
      notification = adminNotification;
    } else if (adminError) {
      fetchError = adminError;
    }
    
    // If not found in admin_notifications, try the regular notifications table
    if (!notification) {
      // For regular notifications, we need to map user_id to vendor_id for consistency
      const { data: regularNotification, error: regularError } = await supabase
        .from('notifications')
        .select('id, user_id, is_read')
        .eq('id', notificationId)
        .maybeSingle();
        
      if (regularNotification) {
        notification = {
          id: regularNotification.id,
          vendor_id: regularNotification.user_id,
          is_read: regularNotification.is_read
        };
      } else if (regularError) {
        fetchError = regularError;
      }
    }

    if (!notification) {
      return NextResponse.json(
        { 
          error: 'Notification not found', 
          notificationId,
          userId: user.id,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    // If already read, just return success
    if (notification.is_read) {
      return NextResponse.json({ success: true, alreadyRead: true });
    }

    // Determine which table to update
    const tableName = params.id.startsWith('admin_msg_') ? 'admin_notifications' : 'notifications';
    
    // Mark as read
    const updateData = { 
      is_read: true, 
      read_at: new Date().toISOString() 
    };
    
    const { error: updateError } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', notificationId);

    if (updateError) {
      return NextResponse.json(
        { 
          error: 'Failed to update notification',
          details: updateError.message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      notificationId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
