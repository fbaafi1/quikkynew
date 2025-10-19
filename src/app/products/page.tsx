import { Suspense } from 'react';
import ProductsClient from '@/components/products/ProductsClient';
import type { Metadata } from 'next';

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    page?: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Products - QuikKart',
  description: 'Browse all products on QuikKart',
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  // Await searchParams as required by Next.js 15
  const params = await searchParams;
  const query = params.q || '';
  const category = params.category || '';
  const page = parseInt(params.page || '1');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {query ? `Search results for "${query}"` : 'All Products'}
          </h1>
          <p className="text-muted-foreground">
            {query ? 'Products matching your search' : 'Browse our complete collection'}
          </p>
        </div>

        <Suspense fallback={<ProductsSkeleton />}>
          <ProductsClient
            initialQuery={query}
            initialCategory={category}
            initialPage={page}
          />
        </Suspense>
      </div>
    </div>
  );
}

// Loading skeleton for products
function ProductsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filters skeleton */}
      <div className="flex gap-4">
        <div className="h-10 flex-1 bg-muted animate-pulse rounded" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>

      {/* Products grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[4/3] bg-muted animate-pulse rounded-lg" />
            <div className="space-y-2">
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
              <div className="h-6 w-1/4 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
