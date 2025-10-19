"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Eye, EyeOff, CalendarIcon, X, ChevronLeft, ChevronRight, CalendarDays, RefreshCw } from 'lucide-react';
import type { AdminOrderSummary, OrderStatus } from '@/lib/types';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';


const orderStatusOptions: (OrderStatus | 'All')[] = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Payment Failed'];
const ITEMS_PER_PAGE = 10;
const DEBOUNCE_DELAY = 300;

interface Suggestion {
  id: string;
  type: 'order' | 'customer';
  name: string;
  secondaryText?: string;
}

const getStatusBadgeVariant = (status: OrderStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Pending': return "default";
      case 'Processing': return "default";
      case 'Shipped': return "secondary";
      case 'Delivered': return "default";
      case 'Cancelled':
      case 'Payment Failed': return "destructive";
      default: return "outline";
    }
};

export default function VendorOrdersClient({ initialOrders }: { initialOrders: AdminOrderSummary[] }) {
  const [allOrders, setAllOrders] = useState<AdminOrderSummary[]>(initialOrders);
  const [filteredOrders, setFilteredOrders] = useState<AdminOrderSummary[]>(initialOrders);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'All'>('All');
  const [showDeliveredOrders, setShowDeliveredOrders] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const [currentPage, setCurrentPage] = useState(1);
  const [notificationCount, setNotificationCount] = useState(0);
  const { toast } = useToast();

  // Calculate notification count (Pending + Processing orders)
  useEffect(() => {
    const count = allOrders.filter(order => order.status === 'Pending' || order.status === 'Processing').length;
    setNotificationCount(count);
  }, [allOrders]);

  // Function to refresh orders data
  const refreshOrders = async () => {
    try {
      const response = await fetch('/api/vendor/orders');
      if (response.ok) {
        const data = await response.json();
        setAllOrders(data);
      }
    } catch (error) {
      console.error('Failed to refresh orders:', error);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    let results = allOrders;

    // Filter out delivered orders unless specifically requested
    if (!showDeliveredOrders) {
        results = results.filter(order => order.status !== 'Delivered');
    }

    if (statusFilter !== 'All') {
        results = results.filter(order => order.status === statusFilter);
    }
    if (startDate) {
        results = results.filter(order => new Date(order.orderDate) >= startDate);
    }
    if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setUTCHours(23, 59, 59, 999);
        results = results.filter(order => new Date(order.orderDate) <= endOfDay);
    }
    if(debouncedSearchTerm) {
        const term = debouncedSearchTerm.toLowerCase();
        results = results.filter(order => 
            order.id.toLowerCase().includes(term) ||
            order.customer_name?.toLowerCase().includes(term) ||
            order.customer_email?.toLowerCase().includes(term)
        );
    }

    setFilteredOrders(results);
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, startDate, endDate, showDeliveredOrders, allOrders]);

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };
  
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const renderOrderCard = (order: AdminOrderSummary) => (
    <div key={order.id} className="border rounded-lg p-2 hover:bg-muted/50 transition-colors">
      {/* Order Header - Ultra Compact */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="text-xs font-medium text-muted-foreground">#{order.id.substring(0, 8)}...</div>
          <Badge variant={getStatusBadgeVariant(order.status)} className="text-xs px-1.5 py-0.5">
            {order.status}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays size={10} />
          {isValid(new Date(order.orderDate)) ? format(new Date(order.orderDate), "PP") : "Invalid Date"}
        </div>
      </div>

      {/* Order Info - Compact */}
      <div className="space-y-1 mb-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Customer:</span>
          <span className="font-medium truncate ml-2">{order.customer_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Items:</span>
          <span className="font-medium">{order.item_count}</span>
        </div>
        {order.products && order.products.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <div className="text-muted-foreground text-xs mb-1">Products:</div>
            <div className="space-y-1">
              {order.products.slice(0, 2).map((product, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <div className="relative w-6 h-6 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="24px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">?</div>
                    )}
                  </div>
                  <span className="flex-1 truncate font-medium">{product.name}</span>
                  <span className="text-muted-foreground">×{product.quantity}</span>
                </div>
              ))}
              {order.products.length > 2 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{order.products.length - 2} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Order Footer - Ultra Compact */}
      <div className="flex items-center justify-between pt-1.5 border-t">
        <div className="text-xs">
          <span className="text-muted-foreground">Total: </span>
          <span className="font-bold text-primary">GH₵{order.totalAmount.toFixed(2)}</span>
        </div>
        <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs">
          <Link href={`/orders/${order.id}`}>
            <Eye className="mr-1 h-2.5 w-2.5" />
            Details
          </Link>
        </Button>
      </div>
    </div>
  );

  return (
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Incoming Orders</CardTitle>
              <CardDescription>This list shows all orders that contain one or more of your products. Completed orders are hidden by default - use the "Show Completed" toggle to view them.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshOrders}
                className="h-8"
                title="Refresh orders"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
              {notificationCount > 0 && (
                <Badge variant="destructive" className="text-xs px-2 py-1">
                  {notificationCount} pending
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-start">
            <div className="relative flex-grow w-full md:w-auto">
              <Input
                type="text"
                placeholder="Search by Order ID, customer name/email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="w-full md:w-auto md:min-w-[180px]">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus | 'All')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by status..." />
                </SelectTrigger>
                <SelectContent>
                  {orderStatusOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Button
                variant={showDeliveredOrders ? "default" : "outline"}
                size="sm"
                onClick={() => setShowDeliveredOrders(!showDeliveredOrders)}
                className="w-full sm:w-auto"
              >
                {showDeliveredOrders ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                {showDeliveredOrders ? 'Hide' : 'Show'} Completed
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full sm:w-[200px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Start Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} disabled={(date) => (endDate && date > endDate) || date > new Date()} initialFocus /></PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full sm:w-[200px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>End Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(date) => (startDate && date < startDate) || date > new Date()} initialFocus /></PopoverContent>
                </Popover>
                {(startDate || endDate) && (
                    <Button variant="ghost" onClick={clearDateFilters} className="w-full sm:w-auto" title="Clear date filters">
                        <X className="h-4 w-4" /><span className="sm:hidden ml-2">Clear Dates</span>
                    </Button>
                )}
            </div>
          </div>

          <div className="md:hidden space-y-2">
            {paginatedOrders.length > 0
                ? paginatedOrders.map(order => renderOrderCard(order))
                : <p className="text-center text-muted-foreground py-8 text-sm">No orders found matching your criteria.</p>}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Order ID</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Products</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs text-center">Items</TableHead>
                  <TableHead className="text-xs text-center">Status</TableHead>
                  <TableHead className="text-xs text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.length > 0 ? paginatedOrders.map(order => (
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-xs py-2">{order.id.substring(0,8)}...</TableCell>
                    <TableCell className="py-2">
                        <div className="text-xs font-medium">{order.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{order.customer_email !== 'N/A' ? order.customer_email : (order.user_id ? `ID: ${order.user_id.substring(0,8)}...` : 'N/A')}</div>
                    </TableCell>
                    <TableCell className="py-2">
                      {order.products && order.products.length > 0 ? (
                        <div className="space-y-1">
                          {order.products.slice(0, 2).map((product, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <div className="relative w-5 h-5 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                {product.image ? (
                                  <Image
                                    src={product.image}
                                    alt={product.name}
                                    fill
                                    sizes="20px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">?</div>
                                )}
                              </div>
                              <span className="truncate font-medium">{product.name}</span>
                              <span className="text-muted-foreground">×{product.quantity}</span>
                            </div>
                          ))}
                          {order.products.length > 2 && (
                            <div className="text-xs text-muted-foreground text-center">
                              +{order.products.length - 2} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No products</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs py-2">{isValid(new Date(order.orderDate)) ? format(new Date(order.orderDate), "PP") : "Invalid"}</TableCell>
                    <TableCell className="text-xs text-right py-2 font-semibold">GH₵{order.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-center py-2">{order.item_count}</TableCell>
                    <TableCell className="text-xs text-center py-2"><Badge variant={getStatusBadgeVariant(order.status)} className="text-xs">{order.status}</Badge></TableCell>
                    <TableCell className="text-xs text-center py-2">
                       <Button variant="outline" size="sm" asChild className="h-7 px-2 text-xs">
                          <Link href={`/orders/${order.id}`}>
                            <Eye className="mr-1 h-2.5 w-2.5" />
                            View
                          </Link>
                        </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={8} className="text-center h-16 text-sm text-muted-foreground">No orders found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-4 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
  );
}
