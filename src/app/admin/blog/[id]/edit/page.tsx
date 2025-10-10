
import BlogPostForm from '@/components/admin/BlogPostForm';
import type { BlogPost } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface PageParams {
  id: string;
}

interface EditBlogPostPageProps {
  params: PageParams;
}

async function getPost(id: string) {
    const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        console.error("Error fetching post:", error);
        return null;
    }
    return data as BlogPost;
}


export default async function EditBlogPostPage({ params }: EditBlogPostPageProps) {
  const { id } = params;
  const post = await getPost(id);

  if (!post) {
     return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 mb-4 text-red-500" />
        <h1 className="text-2xl font-semibold">Blog Post Not Found</h1>
        <p className="text-muted-foreground mt-2">The post you are trying to edit could not be found.</p>
        <Button asChild size="sm" className="mt-4" variant="outline">
            <Link href="/admin/blog"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Blog Posts</Link>
        </Button>
      </div>
    );
  }


  return (
    <div className="space-y-6">
        <Button variant="outline" size="sm" asChild>
            <Link href="/admin/blog"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Blog Posts</Link>
        </Button>
        <BlogPostForm post={post} />
    </div>
  );
}
