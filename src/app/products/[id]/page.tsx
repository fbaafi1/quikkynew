import type { Product, Review, FlashSale, Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServerClient';
import ProductDetailsClient from '@/components/products/ProductDetailsClient';
import { Separator } from '@/components/ui/separator';

// Force dynamic rendering to prevent build-time static analysis
export const dynamic = 'force-dynamic';

interface PageParams {
  id: string;
}

// Helper function to safely get image URL
function getImageUrl(images: string[] | null): string {
  return images?.[0] || '/placeholder-product.jpg';
}

// Define the vendor type separately for better reusability
type VendorInfo = {
  id: string;
  store_name: string;
  contact_number: string;
};

// Extend the base Product type with vendor information
interface ProductWithVendor extends Omit<Product, 'vendors' | 'vendor' | 'categoryId'> {
  vendors: VendorInfo | null;
  vendor: VendorInfo | null;
  category_id: string | null;
  vendor_id: string | null;
  // Add other fields that might come from the database
  [key: string]: any;
}

export default async function ProductDetailsPage({ params }: { params: PageParams }) {
  const productId = params.id;
  
  if (!productId) {
    return notFound();
  }

  try {
    const supabase = createServerSupabaseClient();
    
    // Fetch all data in parallel for better performance
    // Get current timestamp for flash sale check
    const now = new Date().toISOString();
    
    // First, fetch the main product to get its category
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select(`
        *,
        vendors:vendor_id (
          id,
          store_name,
          contact_number
        )
      `)
      .eq('id', productId)
      .single();

    if (productError || !productData) {
      console.error('Error fetching product:', productError);
      return notFound();
    }

    // Then fetch related products and other data in parallel
    const [
      { data: flashSaleData },
      { data: relatedProducts, error: relatedProductsError },
      { data: reviews, error: reviewsError }
    ] = await Promise.all([
      // Active flash sale
      supabase
        .from('flash_sales')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now)
        .single(),
      
      // Related products from the same category
      supabase
        .from('products')
        .select('id, name, images, price, category_id, stock, description')
        .eq('category_id', (productData as any).category_id)
        .neq('id', productId)   // Exclude current product
        .limit(4)
        .order('created_at', { ascending: false }),  // Show newest first
      
      // Reviews
      supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
    ]);

    // Log related products error if any (but don't fail the page load)
    if (relatedProductsError) {
      console.error('Error fetching related products:', relatedProductsError);
    }

    // Transform the product data with proper typing
    const typedProductData = productData as unknown as ProductWithVendor;
    const product: Product = {
      ...typedProductData,
      // Map database fields to the expected Product type
      id: typedProductData.id,
      name: typedProductData.name,
      description: typedProductData.description || '',
      price: typedProductData.price,
      stock: typedProductData.stock || 0,
      images: typedProductData.images || [],
      categoryId: typedProductData.category_id || '',
      vendor_id: typedProductData.vendor_id || null,
      // Map vendor information
      vendors: typedProductData.vendors ? {
        id: typedProductData.vendors.id,
        store_name: typedProductData.vendors.store_name,
        contact_number: typedProductData.vendors.contact_number
      } : null,
      vendor: typedProductData.vendor ? {
        id: typedProductData.vendor.id,
        store_name: typedProductData.vendor.store_name,
        contact_number: typedProductData.vendor.contact_number
      } : null,
      // Ensure all required Product fields have values
      created_at: typedProductData.created_at || new Date().toISOString(),
      updated_at: typedProductData.updated_at || new Date().toISOString(),
      average_rating: typedProductData.average_rating || 0,
      boost_status: typedProductData.boost_status || 'none',
      boosted_until: typedProductData.boosted_until || null,
      // Clean up any fields that shouldn't be in the Product type
      category_id: undefined
    } as unknown as Product;

    // Check vendor subscription status
    const vendor = product.vendors;
    const subscriptionEndDate = vendor?.subscription_end_date ? new Date(vendor.subscription_end_date) : null;
    const isVendorSubscriptionActive = !(subscriptionEndDate && subscriptionEndDate < new Date());

    // Transform related products with proper typing
    const transformedRelatedProducts = ((relatedProducts as any[]) || []).filter(Boolean).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      images: p.images || [],
      categoryId: p.category_id,
      stock: p.stock || 0,
      description: p.description || '',
      // Required fields with default values
      is_active: true,
      vendor_id: null,
      vendors: null,
      vendor: null,
      // Other required fields with defaults
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category_id: undefined,
      average_rating: 0,
      boost_status: 'none' as const,
      boosted_until: null
    })) as Product[];

    return (
      <main className="min-h-screen bg-background">
        <ProductDetailsClient 
          product={product} 
          flashSale={flashSaleData} 
          relatedProducts={transformedRelatedProducts}
          reviews={(reviews || []).map(review => ({ ...review, source: 'online' as const }))}
          isVendorSubscriptionActive={isVendorSubscriptionActive}
        />
      </main>
    );
  } catch (error) {
    console.error('Error in ProductDetailsPage:', error);
    return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-semibold text-red-700">Error loading product</h1>
        <p className="text-muted-foreground mt-2">
          {error instanceof Error ? error.message : 'An unknown error occurred'}
        </p>
        <Button asChild className="mt-4">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }
}
