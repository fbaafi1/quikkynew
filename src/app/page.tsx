

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

// Helper function to shuffle an array
const shuffleArray = <T extends any[]>(array: T): T => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray as T;
};

// Data fetching function for the server component
async function getHomePageData() {
    const now = new Date().toISOString();

    const [categoriesResult, productsResult, adsResult, flashSalesResult] = await Promise.all([
      supabase.from('categories').select('*').eq('is_visible', true).order('name', { ascending: true }),
      // Let's fetch a limited random set for "Just for You" later
      supabase.from('products').select('id, name, description, price, images, category_id, stock, average_rating, review_count, vendor_id, is_boosted, boosted_until, vendors (id, store_name)'),
      supabase.from('advertisements').select('id, title, media_url, media_type, link_url, start_date, end_date').eq('is_active', true).limit(5),
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
      categories: categoriesResult.data || [],
      products: (productsResult.data as any[])?.map(p => ({ ...p })) || [],
      advertisements: filteredAdvertisements,
      flashSales: (flashSalesResult.data as any[]) || []
    };
}


export default async function HomePage() {
  // Fetch data on the server
  const { categories, products, advertisements, flashSales } = await getHomePageData();

  const allDbVisibleCategories = categories;
  
  // This logic now runs on the server
  const isProductBoosted = (p: Product) => p.is_boosted && p.boosted_until && new Date(p.boosted_until) > new Date();
  const boostedProducts = products.filter(isProductBoosted);

  const boostedProductIds = new Set(boostedProducts.map(p => p.id));
  const flashSaleProductIds = new Set(flashSales.map(fs => fs.product_id));

  let justForYouProducts = products.filter(product => {
      if (boostedProductIds.has(product.id) || flashSaleProductIds.has(product.id)) return false;
      if (product.categoryId && !allDbVisibleCategories.some(cat => cat.id === product.categoryId && cat.is_visible)) return false;
      return true;
    });

  justForYouProducts = shuffleArray(justForYouProducts).slice(0, 18); // Limit to 18 random products

  return (
    <div className="space-y-12 bg-background">
      
      {advertisements.length > 0 && (
        <section className="relative w-full max-w-4xl mx-auto px-4 overflow-hidden rounded-lg shadow-lg bg-muted aspect-video md:aspect-[2.4/1]">
           <NextImage 
              src={advertisements[0].media_url || `https://placehold.co/1280x720.png?text=${encodeURIComponent(advertisements[0].title)}`}
              alt={advertisements[0].title} 
              fill 
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 60vw" 
              className="object-cover" 
              data-ai-hint="advertisement banner"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent flex items-end p-6">
                 <div>
                    <h3 className="font-semibold text-white text-xl drop-shadow-md">{advertisements[0].title}</h3>
                </div>
            </div>
        </section>
      )}

      {flashSales.length > 0 && (
        <section className="space-y-4 pt-4 container mx-auto">
          <h2 className="text-2xl font-bold text-primary">Flash Sales</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {flashSales.map(sale => sale.products ? <FlashSaleCard key={sale.id} sale={sale} /> : null)}
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
          <h2 className="text-2xl font-bold mb-4">Just For You</h2>
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
