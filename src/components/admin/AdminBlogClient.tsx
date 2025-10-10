
"use client";

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { BlogPost } from '@/lib/types';
import { Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const ITEMS_PER_PAGE = 10;

export default function AdminBlogClient({ initialPosts }: { initialPosts: BlogPost[] }) {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const handleDeletePost = async (postId: string, postTitle: string, imageUrl: string | null | undefined) => {
    try {
      const { error: deleteDbError } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postId);
      if (deleteDbError) throw deleteDbError;

      if (imageUrl) {
        const bucketName = 'blog-images';
        const fileName = imageUrl.split('/').pop();
        if (fileName) {
          const { error: deleteStorageError } = await supabase.storage
            .from(bucketName)
            .remove([fileName]);
          if (deleteStorageError) {
             console.warn(`DB record for post '${postTitle}' deleted, but failed to delete image from storage: ${deleteStorageError.message}`);
          }
        }
      }
      toast({ title: "Post Deleted", description: `"${postTitle}" has been deleted.` });
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err: any) {
      toast({ title: "Deletion Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleTogglePublished = async (post: BlogPost) => {
    try {
      const newStatus = !post.is_published;
      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({ is_published: newStatus, updated_at: new Date().toISOString() })
        .eq('id', post.id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      toast({ title: `Post ${newStatus ? "Published" : "Unpublished"}`, description: `"${post.title}" is now ${newStatus ? "visible" : "hidden"}.` });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_published: newStatus, updated_at: updateError.updated_at } : p));
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    }
  };
  
  const totalPages = Math.ceil(posts.length / ITEMS_PER_PAGE);
  const paginatedPosts = posts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Blog Posts</CardTitle>
          <CardDescription>Manage articles on the public blog.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-center">Published</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPosts.length > 0 ? paginatedPosts.map(post => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell>{post.author || 'N/A'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {post.created_at ? format(new Date(post.created_at), "PP") : 'N/A'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                        id={`publish-switch-${post.id}`}
                        checked={post.is_published}
                        onCheckedChange={() => handleTogglePublished(post)}
                        aria-label={`Toggle ${post.title} published status`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="icon" asChild title="Edit Post">
                          <Link href={`/admin/blog/${post.id}/edit`}><Edit className="h-4 w-4" /></Link>
                      </Button>
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon" title="Delete Post"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{post.title}"?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone and will permanently delete the post.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePost(post.id, post.title, post.image_url)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No blog posts found. Click "Add New Post" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {totalPages > 1 && (
          <CardFooter>
             <div className="flex items-center justify-center space-x-2 w-full mt-6 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
  );
}
