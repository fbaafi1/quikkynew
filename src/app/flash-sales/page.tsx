
import type { FlashSale } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import { Rocket } from 'lucide-react';
import FlashSaleCard from '@/components/products/FlashSaleCard';

async function getActiveFlashSales() {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('flash_sales')
      .select('*, products:product_id(*, vendors(id, store_name))')
      .eq('is_active', true)
      .lte('start_date', now)
      .gte('end_date', now)
      .order('end_date', { ascending: true });

    if (error) {
        console.error("Error fetching flash sales:", error.message);
        throw new Error("Could not fetch active flash sales.");
    }
    return data as FlashSale[];
}

export default async function FlashSalesPage() {
  const flashSales = await getActiveFlashSales();

  return (
    <div className="space-y-8">
      <div className="text-center bg-accent/20 border-y-2 border-accent py-8 px-4 rounded-lg">
        <h1 className="text-4xl font-extrabold text-accent flex items-center justify-center gap-3">
          <Rocket size={40} className="animate-pulse" />
          Flash Sales
        </h1>
        <p className="text-lg text-muted-foreground mt-2">Hurry! These deals won't last forever.</p>
      </div>
      
      {flashSales.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {flashSales.map(sale => sale.products ? <FlashSaleCard key={sale.id} sale={sale} /> : null)}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <Rocket className="mx-auto h-20 w-20 text-muted-foreground mb-6"/>
            <h2 className="text-2xl font-semibold text-muted-foreground">No Flash Sales Right Now!</h2>
            <p className="text-muted-foreground mt-2 mb-6">There are no active flash sales at the moment. Please check back soon!</p>
        </div>
      )}
    </div>
  );
}
