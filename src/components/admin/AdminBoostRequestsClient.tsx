
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Check, X, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { BoostRequest } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

const ITEMS_PER_PAGE = 10;

// Helper to get image src and ai-hint from product.images[0]
const getProductImageAttributes = (imageString: string | undefined, productName: string) => {
  if (imageString) {
    const parts = imageString.split('" data-ai-hint="');
    const src = parts[0];
    const hint = parts[1]?.replace('"', '').trim() || productName.split(' ').slice(0,2).join(' ').toLowerCase();
    return { src, hint };
  }
  return { src: `https://placehold.co/40x40.png?text=${encodeURIComponent(productName.slice(0,1))}`, hint: productName.split(' ').slice(0,2).join(' ').toLowerCase() };
};

export default function AdminBoostRequestsClient({ initialRequests }: { initialRequests: BoostRequest[] }) {
  const [requests, setRequests] = useState<BoostRequest[]>(initialRequests);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<BoostRequest | null>(null);
  const { toast } = useToast();

  const handleRequestUpdate = async (request: BoostRequest, newStatus: 'approved' | 'rejected') => {
    try {
        const updatePromises = [];

        // Update the boost_requests table
        updatePromises.push(
            supabase
                .from('boost_requests')
                .update({ request_status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', request.id)
        );

        // If approved, update the products table
        if (newStatus === 'approved') {
            const boostedUntil = new Date();
            boostedUntil.setDate(boostedUntil.getDate() + request.plan_duration_days);
            updatePromises.push(
                supabase
                    .from('products')
                    .update({
                        is_boosted: true,
                        boost_status: 'active',
                        boosted_until: boostedUntil.toISOString(),
                    })
                    .eq('id', request.product_id)
            );
        } else { // If rejected, reset product boost status
             updatePromises.push(
                supabase
                    .from('products')
                    .update({ boost_status: 'none' })
                    .eq('id', request.product_id)
            );
        }
        
        await Promise.all(updatePromises.map(p => p.then(res => { if (res.error) throw res.error; })));

        setRequests(prev => prev.map(r => r.id === request.id ? { ...r, request_status: newStatus } : r));
        toast({ title: `Request ${newStatus}`, description: `The boost request for "${request.products?.name}" has been ${newStatus}.` });

    } catch (err: any) {
        toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteRequest = async () => {
    if (!requestToDelete) {
      return;
    }

    try {
      const { error } = await supabase
        .from('boost_requests')
        .delete()
        .eq('id', requestToDelete.id);

      if (error) {
        throw error;
      }

      setRequests(prev => prev.filter(r => r.id !== requestToDelete.id));

      toast({
        title: "Request Deleted",
        description: `The boost request for "${requestToDelete.products?.name}" has been deleted.`
      });

      setDeleteDialogOpen(false);
      setRequestToDelete(null);

    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.message || 'An unknown error occurred',
        variant: "destructive"
      });
    }
  };
  
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'pending': return "default";
      case 'approved': return "secondary";
      case 'rejected': return "destructive";
      default: return "outline";
    }
  };

  const totalPages = Math.ceil(requests.length / ITEMS_PER_PAGE);
  const paginatedRequests = requests.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg md:text-xl">Vendor Boost Requests</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Review, approve, or reject boost requests from vendors. Approve requests after confirming offline payment.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Requested On</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {paginatedRequests.length > 0 ? (
                paginatedRequests.map(req => {
                   const { src: productImageUrl } = getProductImageAttributes(req.products?.images?.[0], req.products?.name || "Product");
                  return (
                    <TableRow key={req.id}>
                       <TableCell className="flex items-center gap-2">
                        <Image src={productImageUrl} alt={req.products?.name || 'product'} width={40} height={40} className="rounded-md object-cover" />
                        <span className="font-medium">{req.products?.name || 'Unknown Product'}</span>
                      </TableCell>
                      <TableCell>{req.vendors?.store_name || 'Unknown Vendor'}</TableCell>
                      <TableCell>{req.plan_duration_days} days (GH₵{req.plan_price})</TableCell>
                      <TableCell>{format(new Date(req.created_at), "PP")}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getStatusBadgeVariant(req.request_status)} className="capitalize">{req.request_status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {req.request_status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleRequestUpdate(req, 'approved')}><ThumbsUp className="mr-2 h-4 w-4"/> Approve</Button>
                            <Button variant="destructive" size="sm" onClick={() => handleRequestUpdate(req, 'rejected')}><ThumbsDown className="mr-2 h-4 w-4"/> Reject</Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {req.request_status === 'approved' && <Badge variant="secondary"><Check className="mr-2 h-4 w-4"/>Approved</Badge>}
                            {req.request_status === 'rejected' && <Badge variant="destructive"><X className="mr-2 h-4 w-4"/>Rejected</Badge>}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setRequestToDelete(req);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">No boost requests found.</TableCell>
                </TableRow>
              )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 p-4">
            {paginatedRequests.length > 0 ? (
              paginatedRequests.map(req => {
                const { src: productImageUrl } = getProductImageAttributes(req.products?.images?.[0], req.products?.name || "Product");
                return (
                  <Card key={req.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Image 
                          src={productImageUrl} 
                          alt={req.products?.name || 'product'} 
                          width={60} 
                          height={60} 
                          className="rounded-md object-cover flex-shrink-0" 
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{req.products?.name || 'Unknown Product'}</h3>
                          <p className="text-xs text-muted-foreground">{req.vendors?.store_name || 'Unknown Vendor'}</p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(req.request_status)} className="capitalize text-xs">
                          {req.request_status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Plan:</span>
                          <span className="font-medium">{req.plan_duration_days} days (GH₵{req.plan_price})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Requested:</span>
                          <span>{format(new Date(req.created_at), "PP")}</span>
                        </div>
                      </div>

                      {req.request_status === 'pending' ? (
                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleRequestUpdate(req, 'approved')}
                          >
                            <ThumbsUp className="mr-1 h-3 w-3"/> Approve
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleRequestUpdate(req, 'rejected')}
                          >
                            <ThumbsDown className="mr-1 h-3 w-3"/> Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-2">
                          {req.request_status === 'approved' && (
                            <Badge variant="secondary" className="w-full justify-center">
                              <Check className="mr-2 h-4 w-4"/>Approved
                            </Badge>
                          )}
                          {req.request_status === 'rejected' && (
                            <Badge variant="destructive" className="w-full justify-center">
                              <X className="mr-2 h-4 w-4"/>Rejected
                            </Badge>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => {
                              setRequestToDelete(req);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4"/> Delete Request
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No boost requests found.
              </div>
            )}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Boost Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the boost request for "{requestToDelete?.products?.name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRequestToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRequest} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
