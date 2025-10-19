

import ProductCard from '@/components/products/ProductCard';
import type { Product, Category, Advertisement, FlashSale } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Image as ImageIconLucide, Rocket, Store, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import NextImage from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import FlashSaleCard from '@/components/products/FlashSaleCard';
import Link from 'next/link';
import AdvertisementCarousel from '@/components/AdvertisementCarousel';
import type { Tables } from '@/lib/types_db';

// Helper function to shuffle an array
const shuffleArray = <T extends any[]>(array: T): T => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray as T;
};

// Data fetching function for the server component with pagination support
async function getHomePageData(offset: number = 0, limit: number = 20) {
    const now = new Date().toISOString();

    const [categoriesResult, productsResult, adsResult, flashSalesResult] = await Promise.all([
      // Only fetch essential category data for visible categories
      supabase.from('categories').select('id, name, is_visible').eq('is_visible', true).order('name', { ascending: true }),
      // Load fewer products initially for better performance
      supabase.from('products').select('id, name, price, images, category_id, average_rating, review_count, stock, vendor_id').range(offset, offset + limit - 1).order('created_at', { ascending: false }),
      // Limit advertisements for faster loading
      supabase.from('advertisements').select('id, title, media_url, media_type, link_url, start_date, end_date, is_active').eq('is_active', true).limit(3),
      supabase.from('flash_sales').select('*, products:product_id(*)').eq('is_active', true).lte('start_date', now).gte('end_date', now)
    ]);

    // Filter advertisements by date range on the client side (until migration is applied)
    const filteredAdvertisements = (adsResult.data || []).filter(ad => {
      // If no start_date column exists, show all active ads
      if (!ad.start_date) return true;

      const startDate = new Date(ad.start_date);
      const endDate = ad.end_date ? new Date(ad.end_date) : null;
      const nowDate = new Date(now);

      // Check if ad should be shown based on date range
      const isAfterStart = startDate <= nowDate;
      const isBeforeEnd = !endDate || endDate >= nowDate;

      return isAfterStart && isBeforeEnd;
    });

    return {
      categories: (categoriesResult.data as Tables<'categories'>[]) || [],
      products: (productsResult.data as Tables<'products'>[])?.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        images: p.images,
        categoryId: p.category_id || null,
        average_rating: p.average_rating,
        review_count: p.review_count,
        is_boosted: p.is_boosted,
        boosted_until: p.boosted_until,
        boost_status: p.boost_status,
        description: '', // Add default since it's not selected in query
        stock: p.stock || 0, // Use actual stock from database
        vendor_id: p.vendor_id,
        created_at: p.created_at,
        updated_at: p.updated_at
      })) || [],
      advertisements: filteredAdvertisements,
      flashSales: (flashSalesResult.data as Tables<'flash_sales'>[]) || [],
      hasMore: productsResult.data && productsResult.data.length === limit, // Check if there are more products
      nextOffset: offset + limit
    };
}


export default async function HomePage() {
  // Fetch data on the server with initial pagination
  const { categories, products, advertisements, flashSales, hasMore } = await getHomePageData(0, 20);

  const allDbVisibleCategories = categories;
  
  // This logic now runs on the server
  const isProductBoosted = (p: Product) => p.is_boosted && p.boosted_until && new Date(p.boosted_until) > new Date();
  const boostedProducts = products.filter(isProductBoosted);

  const boostedProductIds = new Set(boostedProducts.map(p => p.id));
  const flashSaleProductIds = new Set((flashSales as Tables<'flash_sales'>[]).map((fs: Tables<'flash_sales'>) => fs.product_id));

  let justForYouProducts = products.filter(product => {
      // Exclude boosted and flash sale products (they go to Featured/Flash Sales sections)
      if (boostedProductIds.has(product.id) || flashSaleProductIds.has(product.id)) {
          return false;
      }

      // If categories table is empty, include all products
      if (allDbVisibleCategories.length === 0) {
          return true;
      }

      // For products with categories, only exclude if category exists but is invisible
      if (product.categoryId) {
          const category = allDbVisibleCategories.find(cat => cat.id === product.categoryId);
          if (category && !category.is_visible) {
              return false; // Only exclude if category exists AND is invisible
          }
      }
      // Include products with no category or categories that don't exist in our fetched list

      return true; // Include the product
    });

  justForYouProducts = shuffleArray(justForYouProducts).slice(0, 12); // Show only 12 products max

  return (
    <div className="space-y-12 bg-background">
      
      {advertisements.length > 0 && (
        <AdvertisementCarousel advertisements={advertisements} />
      )}

      {flashSales.length > 0 && (
        <section className="space-y-4 pt-4 container mx-auto">
          <h2 className="text-2xl font-bold text-primary">Flash Sales</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {flashSales.map(sale => {
              // Transform the database product to match our Product type
              const dbProduct = (sale as any).products;
              if (!dbProduct) return null;

              const product: Product = {
                id: dbProduct.id,
                name: dbProduct.name,
                price: dbProduct.price,
                images: dbProduct.images,
                categoryId: dbProduct.category_id || null,
                average_rating: dbProduct.average_rating,
                review_count: dbProduct.review_count,
                is_boosted: dbProduct.is_boosted,
                boosted_until: dbProduct.boosted_until,
                boost_status: dbProduct.boost_status,
                description: dbProduct.description || '',
                stock: dbProduct.stock || 0,
                vendor_id: dbProduct.vendor_id
              };

              const saleWithProduct: FlashSale = {
                ...sale,
                products: product
              };

              return <FlashSaleCard key={sale.id} sale={saleWithProduct} />;
            })}
          </div>
        </section>
      )}
      
      {boostedProducts.length > 0 && (
        <section className="space-y-4 pt-4 container mx-auto">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-primary"><Rocket/> Featured Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {boostedProducts.map(product => <ProductCard key={product.id} product={product} />)}
            </div>
            <Separator className="pt-4"/>
        </section>
      )}

      {justForYouProducts.length > 0 && (
        <section className="container mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Just For You</h2>
            {hasMore && (
              <Button variant="outline" asChild>
                <Link href="/products">Browse All Products</Link>
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {justForYouProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
