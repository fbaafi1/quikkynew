

import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import type { BlogPost } from '@/lib/types';
import { AlertTriangle, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Force dynamic rendering to prevent build-time static analysis
export const dynamic = 'force-dynamic';

interface PageParams {
  slug: string;
}

interface BlogPostPageProps {
  params: PageParams;
}

async function getPost(slug: string) {
    if (!slug) {
        return { post: null, error: "Slug is missing." };
    }
    
    const { data, error: dbError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();
    
    if (dbError) {
        if (dbError.code === 'PGRST116') {
            return { post: null, error: "The blog post you're looking for could not be found." };
        }
        return { post: null, error: dbError.message };
    }
    
    return { post: data as BlogPost, error: null };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = params;
  const { post, error } = await getPost(slug);

  if (error) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-semibold text-red-700">Error</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button asChild size="sm" className="mt-4 text-muted-foreground hover:text-foreground h-8 px-3 text-xs" variant="ghost">
          <Link href="/blog"><ChevronLeft className="mr-1 h-3 w-3" /> Back to Blog</Link>
        </Button>
      </div>
    );
  }

  if (!post) {
    // This case is largely handled by the error state, but as a fallback.
    return (
        <div className="text-center py-10">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h1 className="text-2xl font-semibold">Post Not Found</h1>
            <Button asChild size="sm" className="mt-4 text-muted-foreground hover:text-foreground h-8 px-3 text-xs" variant="ghost">
                <Link href="/blog"><ChevronLeft className="mr-1 h-3 w-3" /> Back to Blog</Link>
            </Button>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-8 px-3 text-xs">
          <Link href="/blog">
            <ChevronLeft className="mr-1 h-3 w-3" />
            Back to All Posts
          </Link>
        </Button>
      </div>

      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-primary mb-4">{post.title}</h1>
        <div className="text-sm text-muted-foreground">
          <span>By {post.author || 'QuiKart Team'}</span>
          <span className="mx-2">&bull;</span>
          <span>Published on {post.created_at ? format(new Date(post.created_at), 'PPP') : 'N/A'}</span>
        </div>
      </header>
      
      {post.image_url && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-8 shadow-lg">
          <Image
            src={post.image_url}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            priority
            data-ai-hint="blog post image"
          />
        </div>
      )}

      <div className="space-y-6">
        {post.excerpt && <p className="text-xl leading-relaxed italic text-muted-foreground border-l-4 border-primary pl-4">{post.excerpt}</p>}
        {post.content && <div className="text-lg leading-relaxed whitespace-pre-line text-foreground">
          {post.content}
        </div>}
      </div>
    </article>
  );
}
