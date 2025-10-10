
"use client";

import { useState, useEffect, useRef } from 'react';
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
import type { AdminOrderSummary, OrderStatus } from '@/lib/types';
import { Eye, CalendarIcon, X, ChevronLeft, ChevronRight, UserCircle, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  const [allOrders] = useState<AdminOrderSummary[]>(initialOrders);
  const [filteredOrders, setFilteredOrders] = useState<AdminOrderSummary[]>(initialOrders);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'All'>('All');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    let results = allOrders;

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
  }, [debouncedSearchTerm, statusFilter, startDate, endDate, allOrders]);

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };
  
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const renderOrderCard = (order: AdminOrderSummary) => (
    <Card key={order.id} className="overflow-hidden shadow-md mb-4">
      <CardHeader className="p-4 bg-muted/30">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-sm font-semibold">Order ID: {order.id.substring(0, 8)}...</CardTitle>
                <CardDescription className="text-xs">Customer: {order.customer_name}</CardDescription>
            </div>
            <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 text-sm space-y-1">
        <p><strong>Date:</strong> {isValid(new Date(order.orderDate)) ? format(new Date(order.orderDate), "PPP") : "Invalid Date"}</p>
        <p><strong>Items in Order:</strong> {order.item_count}</p>
        <p><strong>Order Total:</strong> GH₵{order.totalAmount.toFixed(2)}</p>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <Button variant="outline" size="sm" asChild className="w-full">
          <Link href={`/orders/${order.id}`}>
            <Eye className="mr-2 h-4 w-4" /> View Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );

  return (
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Incoming Orders</CardTitle>
          <CardDescription>This list shows all orders that contain one or more of your products. Use search and filters below.</CardDescription>
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

          <div className="md:hidden space-y-4">
            {paginatedOrders.length > 0
                ? paginatedOrders.map(order => renderOrderCard(order))
                : <p className="text-center text-muted-foreground py-10">No orders found matching your criteria.</p>}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.length > 0 ? paginatedOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id.substring(0,8)}...</TableCell>
                    <TableCell>
                        <div>{order.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{order.customer_email !== 'N/A' ? order.customer_email : (order.user_id ? `User ID: ${order.user_id.substring(0,8)}...` : 'N/A')}</div>
                    </TableCell>
                    <TableCell>{isValid(new Date(order.orderDate)) ? format(new Date(order.orderDate), "PP") : "Invalid Date"}</TableCell>
                    <TableCell className="text-right">GH₵{order.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{order.item_count}</TableCell>
                    <TableCell className="text-center"><Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge></TableCell>
                    <TableCell className="text-center">
                       <Button variant="outline" size="icon" asChild title="View Order Details">
                          <Link href={`/orders/${order.id}`}><Eye className="h-4 w-4" /><span className="sr-only">View Details</span></Link>
                        </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={7} className="text-center h-24">No orders found matching your criteria.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-6 pt-4 border-t">
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
