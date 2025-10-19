import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Tags } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { verifyUserRole } from '@/lib/auth';
import AdminCategoriesClient from '@/components/admin/AdminCategoriesClient';
import type { Category } from '@/lib/types';

async function getCategories() {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) {
        console.error("Error fetching categories:", error.message);
        throw new Error("Could not fetch categories. Please check Supabase connection and permissions.");
    }
    return data as Category[];
}

export default async function AdminCategoriesPage() {
  await verifyUserRole('admin', '/admin/categories');
  const categories = await getCategories();

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <Tags className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
          <span className="hidden sm:inline">Category Management</span>
          <span className="sm:hidden">Categories</span>
        </h1>
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link href="/admin/categories/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add New Category</span>
            <span className="sm:hidden">Add Category</span>
          </Link>
        </Button>
      </div>
      <AdminCategoriesClient initialCategories={categories} />
    </div>
  );
}
