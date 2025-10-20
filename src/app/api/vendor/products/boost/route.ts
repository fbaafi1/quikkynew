import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Force Edge runtime to prevent static analysis during build
export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the vendor associated with the current user
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (vendorError || !vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const { productId, planId } = await request.json();

    if (!productId || !planId) {
      return NextResponse.json(
        { error: 'Product ID and Plan ID are required' },
        { status: 400 }
      );
    }

    // Get the boost plan details
    const { data: boostPlan, error: planError } = await supabase
      .from('boost_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !boostPlan) {
      return NextResponse.json(
        { error: 'Invalid boost plan' },
        { status: 400 }
      );
    }

    // Verify the product exists and belongs to the vendor
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, vendor_id')
      .eq('id', productId)
      .eq('vendor_id', vendor.id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found or access denied' },
        { status: 404 }
      );
    }

    // Create a boost request
    const { data: boostRequest, error: requestError } = await supabase
      .from('boost_requests')
      .insert({
        product_id: productId,
        vendor_id: vendor.id,
        user_id: user.id,
        plan_duration_days: boostPlan.duration_days,
        plan_price: boostPlan.price,
        request_status: 'pending',
      })
      .select()
      .single();

    if (requestError) {
      return NextResponse.json(
        { error: 'Failed to create boost request', details: requestError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Boost requested successfully', boostRequest },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
