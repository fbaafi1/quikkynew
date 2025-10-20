import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Rss } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { verifyUserRole } from '@/lib/auth';
import AdminBlogClient from '@/components/admin/AdminBlogClient';
import type { BlogPost } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getBlogPosts() {
    const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching blog posts:", error.message);
        throw new Error("Could not fetch blog posts. Please check your Supabase connection and permissions.");
    }
    return data as BlogPost[];
}


export default async function AdminBlogPage() {
  await verifyUserRole('admin', '/admin/blog');
  const posts = await getBlogPosts();
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2"><Rss size={30}/> Blog Management</h1>
        <Button asChild>
          <Link href="/admin/blog/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Post
          </Link>
        </Button>
      </div>
      <AdminBlogClient initialPosts={posts} />
    </div>
  );
}
