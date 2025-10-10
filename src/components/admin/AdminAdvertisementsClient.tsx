
"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
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
import type { Advertisement } from '@/lib/types';
import { PlusCircle, Edit, Trash2, Video as VideoIconComponent, Image as ImageIcon, ExternalLink, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

interface AdvertisementMobileCardProps {
  ad: Advertisement;
  onToggleStatus: (ad: Advertisement) => void;
  onDelete: (adId: string, adTitle: string, mediaUrl: string | null | undefined) => void;
}

function AdvertisementMobileCard({ ad, onToggleStatus, onDelete }: AdvertisementMobileCardProps) {
  return (
    <Card key={ad.id} className="overflow-hidden shadow-md mb-4 group">
      <CardHeader className="p-0 relative">
        <div className="relative w-full aspect-video bg-muted flex items-center justify-center">
          {ad.media_type === 'image' && ad.media_url ? (
            <NextImage
              src={ad.media_url}
              alt={ad.title}
              fill
              sizes="(max-width: 640px) 100vw, 300px"
              className="object-cover group-hover:scale-105 transition-transform"
              data-ai-hint="advertisement banner"
            />
          ) : ad.media_type === 'video' && ad.media_url ? (
            <video
              src={ad.media_url}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              autoPlay
              loop
              muted
              playsInline
              data-ai-hint="advertisement video"
            />
          ) : (
            ad.media_type === 'video' ?
            <VideoIconComponent size={48} className="text-muted-foreground" /> :
            <ImageIcon size={48} className="text-muted-foreground" />
          )}
          <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/70 via-black/50 to-transparent">
            <CardTitle className="text-md font-semibold text-white drop-shadow-md">{ad.title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {ad.link_url && (
          <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 break-all">
            <ExternalLink size={12}/> {ad.link_url}
          </a>
        )}
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Start: {ad.start_date ? format(new Date(ad.start_date), "MMM dd, yyyy HH:mm") : 'Not set'}</span>
            <Badge variant={ad.is_active ? "secondary" : "outline"} className="capitalize">
                {ad.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>End: {ad.end_date ? format(new Date(ad.end_date), "MMM dd, yyyy HH:mm") : 'No end date'}</span>
            <span>Created: {ad.created_at ? format(new Date(ad.created_at), "PP") : 'N/A'}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-3 border-t flex flex-col sm:flex-row gap-2">
        <div className="flex items-center space-x-2">
            <Switch
                id={`active-switch-card-${ad.id}`}
                checked={ad.is_active}
                onCheckedChange={() => onToggleStatus(ad)}
                aria-label={`Toggle ${ad.title} active status`}
            />
            <label htmlFor={`active-switch-card-${ad.id}`} className="text-sm">
                {ad.is_active ? 'Active' : 'Inactive'}
            </label>
        </div>
        <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" asChild title="Edit Advertisement">
                <Link href={`/admin/advertisements/${ad.id}/edit`}><Edit className="h-3 w-3"/></Link>
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" title="Delete Advertisement"><Trash2 className="h-3 w-3"/></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{ad.title}"?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. The media file will also be deleted from storage.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(ad.id, ad.title, ad.media_url)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function AdminAdvertisementsClient({ initialAdvertisements }: { initialAdvertisements: Advertisement[] }) {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>(initialAdvertisements);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const handleDeleteAdvertisement = async (adId: string, adTitle: string, mediaUrl: string | null | undefined) => {
    try {
      const { error: deleteDbError } = await supabase
        .from('advertisements')
        .delete()
        .eq('id', adId);
      if (deleteDbError) throw deleteDbError;

      if (mediaUrl) {
        const bucketName = 'advertisement-media';
        const basePathSegment = `/storage/v1/object/public/${bucketName}/`;
        const basePathIndex = mediaUrl.indexOf(basePathSegment);
        let filePathToDelete = '';

        if (basePathIndex !== -1) {
          filePathToDelete = decodeURIComponent(mediaUrl.substring(basePathIndex + basePathSegment.length));
        }
        
        if (filePathToDelete) {
          const { error: deleteStorageError } = await supabase.storage
            .from(bucketName)
            .remove([filePathToDelete]);

          if (deleteStorageError && deleteStorageError.message.toLowerCase().includes("object not found")) {
            console.warn(`Storage object '${filePathToDelete}' not found for ad '${adTitle}'. It might have been already deleted.`);
          } else if (deleteStorageError) {
             console.error(`Failed to delete '${filePathToDelete}': ${deleteStorageError.message}`);
          }
        }
      }
      setAdvertisements(prev => prev.filter(ad => ad.id !== adId));
      toast({ title: "Success", description: `Advertisement "${adTitle}" deleted.` });
    } catch (err: any) {
      toast({ title: "Error", description: `Failed to delete: ${err.message}`, variant: "destructive" });
    }
  };

  const handleToggleActiveStatus = async (ad: Advertisement) => {
    try {
      const newStatus = !ad.is_active;
      const { error: updateError } = await supabase
        .from('advertisements')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', ad.id);

      if (updateError) throw updateError;

      setAdvertisements(prevAds =>
        prevAds.map(currentAd =>
          currentAd.id === ad.id ? { ...currentAd, is_active: newStatus } : currentAd
        )
      );
      toast({ title: "Status Updated", description: `"${ad.title}" is now ${newStatus ? 'active' : 'inactive'}.` });
    } catch (err: any) {
      toast({ title: "Error", description: `Failed to update status: ${err.message}`, variant: "destructive" });
    }
  };

  const totalPages = Math.ceil(advertisements.length / ITEMS_PER_PAGE);
  const paginatedAds = advertisements.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Advertisement List</CardTitle>
          <CardDescription>Manage promotional banners, images, and videos displayed on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="md:hidden space-y-4">
            {paginatedAds.length > 0
                ? paginatedAds.map(ad => (
                    <AdvertisementMobileCard
                      key={ad.id}
                      ad={ad} 
                      onToggleStatus={handleToggleActiveStatus} 
                      onDelete={handleDeleteAdvertisement} 
                    />
                  ))
                : <p className="text-center text-muted-foreground py-10">No advertisements found. Add one to get started!</p>}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Media</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Link URL</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAds.length > 0 ? paginatedAds.map(ad => (
                  <TableRow key={ad.id}>
                    <TableCell>
                      <div className="relative w-20 h-12 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                        {ad.media_type === 'image' && ad.media_url ? (
                          <NextImage
                            src={ad.media_url}
                            alt={ad.title}
                            fill
                            sizes="80px"
                            className="object-cover"
                            data-ai-hint="ad preview"
                          />
                        ) : ad.media_type === 'video' && ad.media_url ? (
                            <video
                              src={ad.media_url}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                              data-ai-hint="ad video preview"
                            />
                        ) : (
                           ad.media_type === 'video' ?
                           <VideoIconComponent size={24} className="text-muted-foreground" /> :
                           <ImageIcon size={24} className="text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{ad.title}</TableCell>
                    <TableCell className="capitalize text-xs">
                        <Badge variant="outline">{ad.media_type || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      {ad.link_url ? (
                        <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                          <ExternalLink size={12}/> {ad.link_url.length > 30 ? `${ad.link_url.substring(0,27)}...` : ad.link_url}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">No link</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ad.start_date ? format(new Date(ad.start_date), "MMM dd, yyyy HH:mm") : 'Not set'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ad.end_date ? format(new Date(ad.end_date), "MMM dd, yyyy HH:mm") : 'No end date'}
                    </TableCell>
                    <TableCell className="text-center">
                        <Switch
                            id={`active-switch-table-${ad.id}`}
                            checked={ad.is_active}
                            onCheckedChange={() => handleToggleActiveStatus(ad)}
                            aria-label={`Toggle ${ad.title} active status`}
                        />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                        {ad.created_at ? format(new Date(ad.created_at), "PP") : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="icon" asChild title="Edit Advertisement">
                            <Link href={`/admin/advertisements/${ad.id}/edit`}><Edit className="h-4 w-4" /></Link>
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" title="Delete Advertisement"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure you want to delete "{ad.title}"?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone. The media file will also be deleted from storage.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteAdvertisement(ad.id, ad.title, ad.media_url)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center h-24">
                      No advertisements found. Click "Add New Advertisement" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
