
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { Vendor } from '@/lib/types';
import { PlusCircle, Edit, Trash2, Store, ExternalLink, ShieldCheck, Search, UserCircle, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const DEBOUNCE_DELAY = 300;
const ITEMS_PER_PAGE = 10;

// Mobile Card Component
function VendorMobileCard({ vendor, onToggleVerification, onDelete }: { vendor: Vendor, onToggleVerification: (vendor: Vendor) => void, onDelete: (vendor: Vendor) => void }) {
  const isSubExpired = vendor.subscription_end_date && new Date(vendor.subscription_end_date) < new Date();
  return (
    <Card key={vendor.id} className="shadow-md mb-4">
      <CardHeader>
        <div className="flex items-start justify-between">
            <CardTitle>{vendor.store_name}</CardTitle>
            {vendor.is_verified && (
                <Badge className="bg-green-600 hover:bg-green-700 text-white text-xs">
                    <ShieldCheck className="mr-1 h-3 w-3"/> Verified
                </Badge>
            )}
        </div>
        <CardDescription>
            {vendor.user?.name || 'N/A'} ({vendor.user?.email || 'N/A'})
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-3">
        <div>
            <p className="font-medium">Subscription End</p>
             {vendor.subscription_end_date ? (
                <Badge variant={isSubExpired ? "destructive" : "secondary"}>
                  {format(new Date(vendor.subscription_end_date), "PPP")}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground italic">No end date</span>
              )}
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
                <Label htmlFor={`verify-switch-card-${vendor.id}`} className="font-medium">Verification Status</Label>
            </div>
            <Switch
                id={`verify-switch-card-${vendor.id}`}
                checked={vendor.is_verified}
                onCheckedChange={() => onToggleVerification(vendor)}
                aria-label={`Toggle verification for ${vendor.store_name}`}
            />
        </div>
      </CardContent>
      <CardFooter className="p-3 border-t grid grid-cols-3 gap-2">
          <Button variant="ghost" size="sm" asChild className="w-full" title="View Public Storefront" disabled={isSubExpired}>
              <Link href={`/vendors/${vendor.id}`} target="_blank"><ExternalLink className="mr-2 h-4 w-4"/> Store</Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="w-full" title="Edit Vendor">
              <Link href={`/admin/vendors/${vendor.id}/edit`}><Edit className="mr-2 h-4 w-4"/> Edit</Link>
          </Button>
          <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full" title="Delete Vendor"><Trash2 className="mr-2 h-4 w-4"/> Del</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{vendor.store_name}"?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete the vendor, all of their products, and revert the user's role to 'customer'. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(vendor)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
      </CardFooter>
    </Card>
  );
}

export default function AdminVendorsClient({ initialVendors }: { initialVendors: Vendor[] }) {
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>(initialVendors);
  const { toast } = useToast();

  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    let results = vendors;
    if (debouncedSearchTerm) {
        const term = debouncedSearchTerm.toLowerCase();
        results = vendors.filter(v => 
            v.store_name.toLowerCase().includes(term) ||
            v.user?.name?.toLowerCase().includes(term) ||
            v.user?.email?.toLowerCase().includes(term)
        );
    }
    setFilteredVendors(results);
    setCurrentPage(1);
  }, [debouncedSearchTerm, vendors]);

  const handleDeleteVendor = async (vendor: Vendor) => {
    try {
      const { error: deleteError } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendor.id);
      
      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ role: 'customer' })
        .eq('id', vendor.user_id);

      if (updateError) {
        throw new Error(`Vendor profile deleted, but role reversion failed: ${updateError.message}`);
      }
      setVendors(prev => prev.filter(v => v.id !== vendor.id));
      toast({ title: "Success", description: `Vendor "${vendor.store_name}" deleted and user role reverted.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };
  
  const handleToggleVerification = async (vendor: Vendor) => {
    try {
      const newStatus = !vendor.is_verified;
      const { error: updateError } = await supabase
        .from('vendors')
        .update({ is_verified: newStatus, updated_at: new Date().toISOString() })
        .eq('id', vendor.id);

      if (updateError) throw updateError;
      
      setVendors(prev =>
        prev.map(v =>
          v.id === vendor.id ? { ...v, is_verified: newStatus } : v
        )
      );
      toast({ title: "Success", description: `Verification for "${vendor.store_name}" set to ${newStatus}.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };
  
  const totalPages = Math.ceil(filteredVendors.length / ITEMS_PER_PAGE);
  const paginatedVendors = filteredVendors.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Vendor List</CardTitle>
          <CardDescription>Manage sellers registered on the platform. Toggle the switch to verify a vendor for special status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-start">
            <div className="relative flex-grow w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by store name, user name/email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
            </div>
          </div>
          <div className="md:hidden space-y-4">
            {paginatedVendors.length > 0 ? (
              paginatedVendors.map(vendor => (
                <VendorMobileCard 
                  key={vendor.id} 
                  vendor={vendor} 
                  onToggleVerification={handleToggleVerification} 
                  onDelete={handleDeleteVendor} 
                />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-10">No vendors found matching your search.</p>
            )}
          </div>
          
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store Name</TableHead>
                  <TableHead>Vendor (User)</TableHead>
                  <TableHead>Subscription End</TableHead>
                  <TableHead className="text-center">Verified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVendors.length > 0 ? paginatedVendors.map(vendor => {
                  const isSubExpired = vendor.subscription_end_date && new Date(vendor.subscription_end_date) < new Date();
                  return (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.store_name}</TableCell>
                      <TableCell>
                        <div>{vendor.user?.name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">{vendor.user?.email || 'N/A'}</div>
                      </TableCell>
                      <TableCell>
                        {vendor.subscription_end_date ? (
                          <Badge variant={isSubExpired ? "destructive" : "secondary"}>
                            {format(new Date(vendor.subscription_end_date), "PPP")}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No end date</span>
                        )}
                      </TableCell>
                       <TableCell className="text-center">
                          <Switch
                              checked={vendor.is_verified}
                              onCheckedChange={() => handleToggleVerification(vendor)}
                              aria-label={`Toggle verification for ${vendor.store_name}`}
                              title={vendor.is_verified ? "Verified" : "Not Verified"}
                          />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                           <Button variant="ghost" size="icon" asChild title="View Public Storefront" disabled={isSubExpired}>
                            <Link href={`/vendors/${vendor.id}`} target="_blank"><ExternalLink className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="outline" size="icon" asChild title="Edit Vendor">
                            <Link href={`/admin/vendors/${vendor.id}/edit`}><Edit className="h-4 w-4" /></Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon" title="Delete Vendor"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{vendor.store_name}"?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete the vendor, all of their products, and revert the user's role to 'customer'. This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteVendor(vendor)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                }) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      No vendors found matching your search.
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
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </CardFooter>
        )}
      </Card>
  );
}
