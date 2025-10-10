
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, PlusCircle, Edit, Trash2, Zap, Tag, Clock, Package, Percent, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import type { FlashSale } from '@/lib/types';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { Spinner } from '@/components/ui/spinner';
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

const ITEMS_PER_PAGE = 10;

export default function AdminFlashSalesPage() {
  const { currentUser } = useUser();
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchIndex, setRefetchIndex] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalSales, setTotalSales] = useState(0);

  const fetchFlashSales = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { count, error: countError } = await supabase
        .from('flash_sales')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;
      setTotalSales(count || 0);
      
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error: dbError } = await supabase
        .from('flash_sales')
        .select(`
          *,
          products (id, name, price)
        `)
        .order('end_date', { ascending: false })
        .range(from, to);

      if (dbError) throw dbError;
      setSales(data as any[] || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch flash sales.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    if (currentUser) {
      fetchFlashSales();
    }
  }, [currentUser, refetchIndex, fetchFlashSales]);

  const handleDelete = async (saleId: string) => {
    try {
      const { error } = await supabase.from('flash_sales').delete().eq('id', saleId);
      if (error) throw error;
      setRefetchIndex(prev => prev + 1);
    } catch (err: any) {
      console.error("Delete failed:", err.message);
    }
  };

  const getStatusBadge = (sale: FlashSale): { text: string; variant: "default" | "secondary" | "outline" } => {
    const now = new Date();
    const start = new Date(sale.start_date);
    const end = new Date(sale.end_date);
    if (now < start) return { text: "Scheduled", variant: "outline" };
    if (now > end) return { text: "Expired", variant: "outline" };
    return { text: "Active", variant: "default" };
  };

  const totalPages = Math.ceil(totalSales / ITEMS_PER_PAGE);

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen"><Spinner className="h-12 w-12 text-primary" /></div>;
  }

  if (error) {
    return <div className="text-center text-red-500 py-10"><AlertTriangle className="mx-auto" /> {error}</div>;
  }
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Zap /> Flash Sale Management</h1>
        <Button asChild>
          <Link href="/admin/flash-sales/new"><PlusCircle className="mr-2 h-4 w-4" /> Create New Sale</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Flash Sales</CardTitle>
          <CardDescription>Manage active, scheduled, and expired flash sales.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Sale Period</TableHead>
                <TableHead>Stock Cap</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length > 0 ? sales.map(sale => {
                const status = getStatusBadge(sale);
                return (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.products?.name || 'Unknown Product'}</TableCell>
                    <TableCell>
                      {sale.discount_type === 'percentage' 
                        ? `${sale.discount_value}% OFF`
                        : `GH₵${sale.discount_value.toFixed(2)} OFF`
                      }
                    </TableCell>
                    <TableCell>
                      {format(new Date(sale.start_date), 'PP p')} to {format(new Date(sale.end_date), 'PP p')}
                    </TableCell>
                    <TableCell>{sale.stock_cap ?? 'Unlimited'}</TableCell>
                    <TableCell><Badge variant={status.variant}>{status.text}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="icon" asChild>
                          <Link href={`/admin/flash-sales/${sale.id}/edit`}><Edit className="h-4 w-4" /></Link>
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" title="Delete Sale"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Delete this flash sale?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone. It will permanently remove the sale details.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(sale.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">No flash sales found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
    </div>
  );
}
