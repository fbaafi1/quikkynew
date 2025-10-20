import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Force Edge runtime to prevent static analysis during build
export const runtime = 'edge';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Find the vendor record for this user
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (vendorError || !vendor) {
      // If no vendor record found, return empty array
      return NextResponse.json([]);
    }

    // Get admin notifications for this vendor
    const { data: notifications, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    // Transform to expected format
    const formattedNotifications = (notifications || []).map(n => ({
      id: n.id,
      type: 'admin' as const,
      title: n.title,
      message: n.message,
      created_at: n.created_at,
      is_read: n.is_read,
      read_at: n.read_at,
      data: null,
    }));

    return NextResponse.json(formattedNotifications);

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
