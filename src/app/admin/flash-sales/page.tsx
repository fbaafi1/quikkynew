
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
    <div className="min-h-screen bg-gray-50 w-full">
      <div className="w-full mx-auto px-1 sm:px-4 lg:px-6 py-4 max-w-full overflow-hidden">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-lg shadow-sm w-full">
            <h1 className="text-base sm:text-lg lg:text-xl font-bold flex items-center gap-2 text-gray-900 min-w-0">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Flash Sale Management</span>
              <span className="sm:hidden truncate">Flash Sales</span>
            </h1>
            <Button asChild className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-sm">
              <Link href="/admin/flash-sales/new" className="flex items-center justify-center gap-2 min-w-0">
                <PlusCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate">Create New Sale</span>
                <span className="sm:hidden truncate">New Sale</span>
              </Link>
            </Button>
          </div>

          <Card className="shadow-sm w-full overflow-hidden">
            <CardHeader className="pb-3 sm:pb-4 bg-gray-50 border-b px-3 sm:px-6">
              <CardTitle className="text-sm sm:text-base lg:text-lg text-gray-900">All Flash Sales</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600">
                Manage active, scheduled, and expired flash sales.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-1 sm:px-6">
              <div className="w-full">
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow className="border-b">
                        <TableHead className="min-w-[100px] w-[100px] px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </TableHead>
                        <TableHead className="min-w-[50px] w-[50px] px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Discount
                        </TableHead>
                        <TableHead className="min-w-[100px] hidden sm:table-cell px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sale Period
                        </TableHead>
                        <TableHead className="min-w-[40px] w-[40px] px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock
                        </TableHead>
                        <TableHead className="min-w-[50px] w-[50px] px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </TableHead>
                        <TableHead className="min-w-[60px] w-[60px] px-1 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.length > 0 ? sales.map(sale => {
                        const status = getStatusBadge(sale);
                        return (
                          <TableRow key={sale.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <TableCell className="px-1 py-2">
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium text-xs sm:text-sm text-gray-900 truncate max-w-[80px] sm:max-w-none">
                                  {sale.products?.name || 'Unknown Product'}
                                </span>
                                <span className="text-xs text-gray-500 sm:hidden mt-1">
                                  {format(new Date(sale.start_date), 'MMM dd')} - {format(new Date(sale.end_date), 'MMM dd')}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-1 py-2">
                              <span className="text-xs font-medium">
                                {sale.discount_type === 'percentage'
                                  ? `${sale.discount_value}%`
                                  : `GH₵${sale.discount_value.toFixed(0)}`
                                }
                              </span>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell px-1 py-2">
                              <span className="text-xs text-gray-600">
                                {format(new Date(sale.start_date), 'MMM dd')} - {format(new Date(sale.end_date), 'MMM dd')}
                              </span>
                            </TableCell>
                            <TableCell className="px-1 py-2">
                              <span className="text-xs text-gray-600">{sale.stock_cap ?? '∞'}</span>
                            </TableCell>
                            <TableCell className="px-1 py-2">
                              <Badge variant={status.variant} className="text-xs px-1 py-0.5">
                                {status.text}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-1 py-2 text-right">
                              <div className="flex items-center justify-end gap-0.5">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6 border-gray-300"
                                  asChild
                                >
                                  <Link href={`/admin/flash-sales/${sale.id}/edit`} title="Edit">
                                    <Edit className="h-2.5 w-2.5 text-gray-600" />
                                  </Link>
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                          variant="destructive"
                                          size="icon"
                                          className="h-6 w-6"
                                          title="Delete"
                                        >
                                          <Trash2 className="h-2.5 w-2.5" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="mx-2 max-w-[calc(100vw-1rem)]">
                                        <AlertDialogHeader>
                                        <AlertDialogTitle className="text-sm">Delete this flash sale?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-xs">This action cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="gap-1 sm:gap-0">
                                        <AlertDialogCancel className="text-xs px-2 py-1">Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(sale.id)} className="text-xs px-2 py-1">Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center h-20 text-gray-500 text-xs">
                            No flash sales found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
            {totalPages > 1 && (
              <CardFooter className="px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row items-center justify-between sm:justify-center gap-4 w-full mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 order-2 sm:order-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Prev</span>
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
