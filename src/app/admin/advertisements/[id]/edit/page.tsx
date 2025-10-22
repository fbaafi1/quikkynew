
import AdvertisementForm from '@/components/admin/AdvertisementForm';
import type { Advertisement } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface PageParams {
  id: string;
}

interface EditAdvertisementPageProps {
  params: PageParams;
}

async function getAdvertisement(id: string) {
    const { data, error } = await supabase
      .from('advertisements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
        console.error("Error fetching advertisement:", error);
        return null;
    }
    return data as Advertisement;
}


export default async function EditAdvertisementPage({ params }: EditAdvertisementPageProps) {
  // Await params in Next.js 15
  const { id } = await params;
  const advertisement = await getAdvertisement(id);

  if (!advertisement) {
    return (
        <div className="text-center py-10">
            <AlertTriangle className="mx-auto h-12 w-12 mb-4 text-red-500" />
            <h1 className="text-2xl font-semibold">Advertisement Not Found</h1>
            <p className="text-muted-foreground mt-2">The advertisement you are trying to edit does not exist.</p>
            <Button asChild size="sm" className="mt-4" variant="outline">
                <Link href="/admin/advertisements"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Advertisement List</Link>
            </Button>
        </div>
    );
  }

  return (
    <div className="space-y-6">
        <Button variant="outline" size="sm" asChild>
            <Link href="/admin/advertisements"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Advertisement List</Link>
        </Button>
        <AdvertisementForm advertisement={advertisement} />
    </div>
  );
}
