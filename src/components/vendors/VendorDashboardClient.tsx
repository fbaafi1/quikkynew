
"use client";

import { useState } from 'react';
import { LayoutDashboard, Package, ClipboardList, AlertTriangle, DollarSign, List, Eye } from 'lucide-react';
import Link from 'next/link';
import { differenceInDays, format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Product, AdminOrderSummary, OrderStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import AdminStatsCard from '@/components/admin/AdminStatsCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const LOW_STOCK_THRESHOLD = 5;

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="h-4 w-4">
      <path d="M20.52 3.48A11.89 11.89 0 0 0 12 0C5.37 0 .03 5.35.03 11.98a11.89 11.89 0 0 0 1.64 6.03L0 24l6.17-1.61a11.93 11.93 0 0 0 5.83 1.5c6.63 0 11.98-5.34 11.98-11.97 0-3.2-1.25-6.2-3.46-8.44ZM12 21.44a9.54 9.54 0 0 1-4.87-1.3l-.35-.21-3.66.95.97-3.56-.23-.37a9.45 9.45 0 0 1-1.47-5.1C2.39 6.73 6.73 2.4 12 2.4c2.58 0 5 1 6.82 2.82a9.59 9.59 0 0 1 2.81 6.8c0 5.27-4.34 9.52-9.63 9.52Zm5.3-6.86c-.29-.15-1.7-.83-1.96-.92-.26-.1-.45-.15-.64.15-.2.29-.74.92-.9 1.1-.17.19-.33.2-.62.05-.29-.15-1.22-.45-2.32-1.43-.86-.77-1.43-1.7-1.6-1.98-.17-.29-.02-.44.13-.58.13-.12.29-.33.44-.49.15-.17.2-.29.3-.48.1-.2.05-.37-.02-.53-.07-.15-.64-1.56-.88-2.14-.23-.56-.47-.49-.64-.5l-.54-.01c-.19 0-.5.07-.77.37-.26.29-1 1-.97 2.43.04 1.42 1.03 2.8 1.18 2.99.15.2 2.02 3.17 4.92 4.32.69.3 1.22.48 1.63.61.69.22 1.32.19 1.81.12.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.06-.11-.26-.17-.55-.31Z"/>
    </svg>
);

interface VendorDetails {
  id: string;
  subscription_end_date: string | null;
}

interface VendorStats {
  productCount: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
}

interface VendorDashboardClientProps {
    vendorDetails: VendorDetails;
    stats: VendorStats;
    lowStockProducts: Product[];
    recentOrders: AdminOrderSummary[];
}


export default function VendorDashboardClient({ vendorDetails, stats, lowStockProducts, recentOrders }: VendorDashboardClientProps) {
  const adminPhoneNumber = process.env.NEXT_PUBLIC_ADMIN_PHONE_NUMBER;
  let whatsappLink = '#'; 
  if (adminPhoneNumber) {
    const whatsappNumber = adminPhoneNumber.startsWith('+') ? adminPhoneNumber.substring(1) : adminPhoneNumber;
    const message = encodeURIComponent(`Hello QuiKart Admin, I'd like to renew my vendor subscription.`);
    whatsappLink = `https://wa.me/${whatsappNumber}?text=${message}`;
  }

  let daysRemaining: number | null = null;
  if(vendorDetails?.subscription_end_date) {
      const endDate = new Date(vendorDetails.subscription_end_date);
      const now = new Date();
      daysRemaining = endDate >= now ? differenceInDays(endDate, now) : -1;
  }
  
  const showExpiryWarning = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 14;

  const getStatusBadgeVariant = (status: OrderStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Pending': return "default"; case 'Processing': return "default"; case 'Shipped': return "secondary"; case 'Delivered': return "default";
      case 'Cancelled': case 'Payment Failed': return "destructive"; default: return "outline";
    }
  };
  
  return (
    <>
      {showExpiryWarning && vendorDetails?.subscription_end_date && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Subscription Expiring Soon!</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>Your subscription expires in <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong> on {format(new Date(vendorDetails.subscription_end_date), 'PPP')}.</span>
            <Button asChild size="sm" className="bg-white text-destructive hover:bg-white/90 shrink-0 mt-2 sm:mt-0">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1"><WhatsAppIcon/> Contact Support to Renew</a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {lowStockProducts.length > 0 && (
        <Alert variant="default" className="border-yellow-500 text-yellow-800 [&>svg]:text-yellow-600">
           <AlertTriangle className="h-4 w-4" />
           <AlertTitle className="text-yellow-900 font-semibold">Low Stock Alert</AlertTitle>
           <AlertDescription>
              The following products are running low (stock is {LOW_STOCK_THRESHOLD} or less):
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {lowStockProducts.map(p => <li key={p.id}><Link href={`/vendor/products/${p.id}/edit`} className="font-semibold text-foreground hover:underline">{p.name}</Link> - {p.stock} unit(s) left</li>)}
              </ul>
           </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <AdminStatsCard title="Total Revenue" value={`GH₵${stats.totalRevenue.toFixed(2)}`} icon={DollarSign} description="From delivered orders"/>
          <AdminStatsCard title="Total Products" value={stats.productCount} icon={Package} description="All products in your store"/>
          <AdminStatsCard title="Total Orders" value={stats.totalOrders} icon={ClipboardList} description="All orders containing your items"/>
          <AdminStatsCard title="Pending Orders" value={stats.pendingOrders} icon={List} description="Orders awaiting processing"/>
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Here are the latest 5 orders containing your products.</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="md:hidden space-y-4">
                  {recentOrders.length > 0 ? recentOrders.map(order => (
                      <div key={order.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-sm font-semibold">Order #{order.id.substring(0,8)}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(order.orderDate), "PP")}</p>
                            </div>
                            <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                          </div>
                          <p className="text-sm"><span className="text-muted-foreground">Customer:</span> {order.customer_name}</p>
                          <p className="text-sm font-medium">Total: GH₵{order.totalAmount.toFixed(2)}</p>
                          <Button variant="outline" size="sm" asChild className="w-full mt-3">
                              <Link href={`/orders/${order.id}`}><Eye className="mr-2 h-4 w-4" /> View Details</Link>
                          </Button>
                      </div>
                  )) : (
                      <p className="text-center text-muted-foreground py-10">You have no recent orders.</p>
                  )}
              </div>
              
              <div className="hidden md:block">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Order ID</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="text-center">Actions</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {recentOrders.length > 0 ? recentOrders.map(order => (
                              <TableRow key={order.id}>
                                  <TableCell className="font-medium">{order.id.substring(0,8)}...</TableCell>
                                  <TableCell>{format(new Date(order.orderDate), "PP")}</TableCell>
                                  <TableCell>{order.customer_name}</TableCell>
                                  <TableCell><Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge></TableCell>
                                  <TableCell className="text-right">GH₵{order.totalAmount.toFixed(2)}</TableCell>
                                  <TableCell className="text-center">
                                      <Button variant="outline" size="icon" asChild title="View Order">
                                          <Link href={`/orders/${order.id}`}><Eye className="h-4 w-4"/></Link>
                                      </Button>
                                  </TableCell>
                              </TableRow>
                          )) : (
                              <TableRow>
                                  <TableCell colSpan={6} className="text-center h-24">You have no recent orders.</TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
              </div>
          </CardContent>
      </Card>
    </>
  );
}
