import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Force Edge runtime to prevent static analysis during build
// Removed edge runtime to fix cookie issues

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  const { searchParams } = new URL(request.url);

  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const sortBy = searchParams.get('sort') || 'relevance';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    let queryBuilder = supabase
      .from('products')
      .select(`
        *,
        categories!inner(name),
        vendors!inner(store_name)
      `);

    // Apply search query filter - search in name AND description
    if (query.trim()) {
      const searchTerm = query.toLowerCase();
      queryBuilder = queryBuilder.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    // Apply category filter
    if (category && category !== 'all') {
      queryBuilder = queryBuilder.eq('category_id', category);
    }

    // Apply sorting
    switch (sortBy) {
      case 'price-low':
        queryBuilder = queryBuilder.order('price', { ascending: true });
        break;
      case 'price-high':
        queryBuilder = queryBuilder.order('price', { ascending: false });
        break;
      case 'name':
        queryBuilder = queryBuilder.order('name', { ascending: true });
        break;
      case 'newest':
        queryBuilder = queryBuilder.order('created_at', { ascending: false });
        break;
      case 'relevance':
      default:
        // For relevance, prioritize by search term matches and boost status
        if (query.trim()) {
          // We'll handle relevance sorting in the client for now
          queryBuilder = queryBuilder.order('is_boosted', { ascending: false });
        } else {
          queryBuilder = queryBuilder.order('created_at', { ascending: false });
        }
        break;
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    queryBuilder = queryBuilder.range(from, to);

    const { data: products, error, count } = await queryBuilder;

    if (error) {
      console.error('Search API error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch search results' },
        { status: 500 }
      );
    }

    // Transform the data
    const transformedProducts = (products || []).map((product: any) => ({
      ...product,
      categoryId: product.category_id,
      categoryName: product.categories?.name || 'Uncategorized',
      vendorName: product.vendors?.store_name || 'Unknown Vendor',
    }));

    return NextResponse.json({
      products: transformedProducts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      query,
      category,
      sortBy,
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
