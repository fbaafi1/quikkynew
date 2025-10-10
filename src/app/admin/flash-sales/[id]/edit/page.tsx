
import FlashSaleForm from '@/components/admin/FlashSaleForm';
import type { FlashSale } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface PageParams {
  id: string;
}

interface EditFlashSalePageProps {
  params: PageParams;
}

async function getSale(id: string) {
    const { data, error } = await supabase
      .from('flash_sales')
      .select('*, products(id, name)')
      .eq('id', id)
      .single();

    if (error) {
      console.error("Error fetching flash sale:", error);
      return null;
    }
    return data as any;
}


export default async function EditFlashSalePage({ params }: EditFlashSalePageProps) {
  const { id } = params;
  const sale = await getSale(id);

  if (!sale) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 mb-4 text-red-500" />
        <h1 className="text-2xl font-semibold">Flash Sale not found</h1>
        <p className="text-muted-foreground mt-2">The flash sale you are trying to edit does not exist.</p>
        <Button asChild size="sm" className="mt-4" variant="outline">
            <Link href="/admin/flash-sales"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Flash Sales</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <Button variant="outline" size="sm" asChild>
            <Link href="/admin/flash-sales"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Flash Sales</Link>
        </Button>
        <FlashSaleForm sale={sale} />
    </div>
  );
}
