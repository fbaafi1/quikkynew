

import type { Product, Category } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import ProductCard from '@/components/products/ProductCard';
import { AlertTriangle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

// Force dynamic rendering to prevent build-time static analysis
export const dynamic = 'force-dynamic';

interface PageParams {
  id: string;
}

async function getCategoryData(categoryId: string) {
    if (!categoryId) {
      throw new Error("Category ID is missing.");
    }
    
    // Fetch category details
    const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();
    
    if (categoryError && categoryError.code !== 'PGRST116') { // PGRST116 is 'No rows found'
        throw new Error(`Category: ${categoryError.message}`);
    }
    if (!categoryData) {
        return { category: null, products: [] };
    }

    let categoryIdsToFetch: string[] = [];

    // Check if the fetched category is a main category (no parent)
    if (categoryData.parent_id === null) {
        // It's a main category, so fetch its subcategories
        const { data: subcategories, error: subError } = await supabase
          .from('categories')
          .select('id')
          .eq('parent_id', categoryId);

        if (subError) throw new Error(`Subcategories: ${subError.message}`);
        
        // The list of IDs includes the main category and all its children
        categoryIdsToFetch = [categoryId, ...(subcategories?.map(sc => sc.id) || [])];
    } else {
        // It's a subcategory, so only fetch products for this specific category
        categoryIdsToFetch = [categoryId];
    }

    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*, vendors(id, store_name)')
      .in('category_id', categoryIdsToFetch);

    if (productsError) throw new Error(`Products: ${productsError.message}`);

    const fetchedProducts: Product[] = productsData?.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        images: p.images || [],
        categoryId: p.category_id,
        stock: p.stock,
        average_rating: p.average_rating,
        review_count: p.review_count,
        vendor_id: p.vendor_id,
        is_boosted: p.is_boosted,
        boosted_until: p.boosted_until,
        vendors: p.vendors,
    })) || [];

    return { category: categoryData as Category, products: fetchedProducts };
}

export default async function CategoryPage({ params }: { params: PageParams }) {
  // Await params in Next.js 15
  const { id: categoryId } = await params;

  try {
    const { category, products } = await getCategoryData(categoryId);

    if (!category) {
      return (
        <div className="text-center py-10">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-2xl font-semibold text-red-700">Category Not Found</h1>
          <p className="text-muted-foreground mt-2">The category you are looking for does not exist.</p>
          <Button asChild size="sm" className="mt-4" variant="outline">
            <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Go to Homepage</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground h-8 px-3 text-xs">
            <Link href="/"><ChevronLeft className="mr-1 h-3 w-3" /> Back to All Products</Link>
          </Button>
          <h1 className="text-3xl font-bold">
            {category?.name || 'Category'}
          </h1>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <p className="text-lg font-semibold">No products found in this category.</p>
            <p className="text-muted-foreground">Check back later or explore other categories.</p>
          </div>
        )}
      </div>
    );
  } catch (error: any) {
     return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-semibold text-red-700">Error Loading Page</h1>
        <p className="text-muted-foreground mt-2">{error.message}</p>
        <Button asChild size="sm" className="mt-4" variant="outline">
          <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Go to Homepage</Link>
        </Button>
      </div>
    );
  }
}
