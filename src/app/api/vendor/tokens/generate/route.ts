import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServerClient';
import { verifyUserRole, getUserId } from '@/lib/auth';
import QRCode from 'qrcode';

export async function POST(request: NextRequest) {
  try {
    // Verify vendor role
    await verifyUserRole('vendor', '/vendor/dashboard');

    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId, quantity } = await request.json();

    if (!productId || !quantity) {
      return NextResponse.json({ error: 'Product ID and quantity are required' }, { status: 400 });
    }

    if (quantity < 1 || quantity > 50) {
      return NextResponse.json({ error: 'Quantity must be between 1 and 50' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Get base URL from request headers (dynamic port detection)
    const host = request.headers.get('host') || 'localhost:9002';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    // Verify vendor owns the product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, vendor_id, name')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get vendor details
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (vendorError || !vendor || vendor.id !== product.vendor_id) {
      return NextResponse.json({ error: 'You do not own this product' }, { status: 403 });
    }

    // Generate unique tokens
    const tokens: string[] = [];
    const generatedTokens = new Set<string>();

    for (let i = 0; i < quantity; i++) {
      let token: string;
      let attempts = 0;

      do {
        // Generate token in format QK-ABC12345
        const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
        token = `QK-${randomPart}`;
        attempts++;
      } while (generatedTokens.has(token) && attempts < 10);

      if (attempts >= 10) {
        return NextResponse.json({ error: 'Failed to generate unique tokens' }, { status: 500 });
      }

      generatedTokens.add(token);
      tokens.push(token);
    }

    // Save tokens to database
    const tokensToInsert = tokens.map(token => ({
      product_id: productId,
      vendor_id: vendor.id,
      token,
      used: false,
    }));

    const { error: insertError } = await supabase
      .from('offline_tokens' as any)
      .insert(tokensToInsert as any);

    if (insertError) {
      console.error('Error inserting tokens:', insertError);
      return NextResponse.json({ error: 'Failed to save tokens' }, { status: 500 });
    }

    // Generate QR codes for each token
    const qrCodes: string[] = [];

    for (const token of tokens) {
      try {
        const reviewUrl = `${baseUrl}/products/${productId}/review?token=${encodeURIComponent(token)}`;
        const qrCodeDataUrl = await QRCode.toDataURL(reviewUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        qrCodes.push(qrCodeDataUrl);
      } catch (qrError) {
        console.error('Error generating QR code:', qrError);
        qrCodes.push(''); // Add empty string as fallback
      }
    }

    return NextResponse.json({
      success: true,
      tokens,
      qrCodes,
      productName: product.name,
      productDetailUrl: `${baseUrl}/products/${productId}`,
      message: `Generated ${quantity} token${quantity !== 1 ? 's' : ''} for ${product.name}`,
    });

  } catch (error) {
    console.error('Error generating tokens:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
