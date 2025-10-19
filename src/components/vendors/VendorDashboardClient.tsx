
"use client";

import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, ClipboardList, AlertTriangle, DollarSign, List, Eye, QrCode, Copy, Download, Plus } from 'lucide-react';
import Link from 'next/link';
import { differenceInDays, format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Product, AdminOrderSummary, OrderStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdminStatsCard from '@/components/admin/AdminStatsCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProducts } from '@/lib/queries';
import VendorAgreementModal from './VendorAgreementModal';

const LOW_STOCK_THRESHOLD = 5;

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="h-4 w-4">
      <path d="M20.52 3.48A11.89 11.89 0 0 0 12 0C5.37 0 .03 5.35.03 11.98a11.89 11.89 0 0 0 1.64 6.03L0 24l6.17-1.61a11.93 11.93 0 0 0 5.83 1.5c6.63 0 11.98-5.34 11.98-11.97 0-3.2-1.25-6.2-3.46-8.44ZM12 21.44a9.54 9.54 0 0 1-4.87-1.3l-.35-.21-3.66.95.97-3.56-.23-.37a9.45 9.45 0 0 1-1.47-5.1C2.39 6.73 6.73 2.4 12 2.4c2.58 0 5 1 6.82 2.82a9.59 9.59 0 0 1 2.81 6.8c0 5.27-4.34 9.52-9.63 9.52Zm5.3-6.86c-.29-.15-1.7-.83-1.96-.92-.26-.1-.45-.15-.64.15-.2.29-.74.92-.9 1.1-.17.19-.33.2-.62.05-.29-.15-1.22-.45-2.32-1.43-.86-.77-1.43-1.7-1.6-1.98-.17-.29-.02-.44.13-.58.13-.12.29-.33.44-.49.15-.17.2-.29.3-.48.1-.2.05-.37-.02-.53-.07-.15-.64-1.56-.88-2.14-.23-.56-.47-.49-.64-.5l-.54-.01c-.19 0-.5.07-.77.37-.26.29-1 1-.97 2.43.04 1.42 1.03 2.8 1.18 2.99.15.2 2.02 3.17 4.92 4.32.69.3 1.22.48 1.63.61.69.22 1.32.19 1.81.12.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.06-.11-.26-.17-.55-.31Z"/>
    </svg>
);

interface VendorDetails {
  id: string;
  subscription_end_date: string | null;
  agreement_accepted: boolean;
  agreement_accepted_at: string | null;
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


function VendorDashboardClient({ vendorDetails, stats, lowStockProducts, recentOrders }: VendorDashboardClientProps) {
  const adminPhoneNumber = process.env.NEXT_PUBLIC_ADMIN_PHONE_NUMBER;
  let whatsappLink = '#';
  if (adminPhoneNumber) {
    const whatsappNumber = adminPhoneNumber.startsWith('+') ? adminPhoneNumber.substring(1) : adminPhoneNumber;
    const message = encodeURIComponent(`Hello QuiKart Admin, I'd like to renew my vendor subscription.`);
    whatsappLink = `https://wa.me/${whatsappNumber}?text=${message}`;
  }

  const [showTokenGenerator, setShowTokenGenerator] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [tokenQuantity, setTokenQuantity] = useState(1);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [generatedTokens, setGeneratedTokens] = useState<string[]>([]);
  const [generatedQRCodes, setGeneratedQRCodes] = useState<string[]>([]);
  const [productDetailUrl, setProductDetailUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Check if vendor has accepted agreement and show modal if not
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  useEffect(() => {
    if (vendorDetails) {
      if (!vendorDetails.agreement_accepted) {
        setShowAgreementModal(true);
      }
    }
  }, [vendorDetails]);

  // Add loading state management
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (vendorDetails) {
      setIsLoading(false);
    }
  }, [vendorDetails]);

  // Fetch vendor's products for dropdown
  const { data: vendorProducts = [], isLoading: productsLoading, error: productsError } = useProducts(vendorDetails.id);

  let daysRemaining: number | null = null;
  if(vendorDetails?.subscription_end_date) {
      const endDate = new Date(vendorDetails.subscription_end_date);
      const now = new Date();
      daysRemaining = endDate >= now ? differenceInDays(endDate, now) : -1;
  }
  
  const showExpiryWarning = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 14;

  const downloadQR = (qrCodeDataUrl: string, token: string) => {
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `review-token-${token}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedItems(prev => new Set(prev).add(`token-${token}`));

      // Reset after 2 seconds
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(`token-${token}`);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      // Error copying token - user feedback handled by UI state
    }
  };

  const copyProductUrl = async () => {
    if (!productDetailUrl) return;

    try {
      await navigator.clipboard.writeText(productDetailUrl);
      setCopiedItems(prev => new Set(prev).add('product-url'));

      // Reset after 2 seconds
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete('product-url');
          return newSet;
        });
      }, 2000);
    } catch (error) {
      // Error copying product URL - user feedback handled by UI state
    }
  };

  const handleGenerateTokens = async () => {
    if (!selectedProduct || tokenQuantity < 1) return;

    setIsGenerating(true);
    setProductDetailUrl(''); // Clear previous URL
    setCopiedItems(new Set()); // Clear copy feedback
    try {
      const response = await fetch('/api/vendor/tokens/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: selectedProduct,
          quantity: tokenQuantity,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate tokens');
      }

      const data = await response.json();
      setGeneratedTokens(data.tokens);
      setGeneratedQRCodes(data.qrCodes);
      setProductDetailUrl(data.productDetailUrl || '');
    } catch (error) {
      // Error generating tokens - could add toast notification here
    } finally {
      setIsGenerating(false);
    }
  };
  
  const getStatusBadgeVariant = (status: OrderStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Pending': return "default"; case 'Processing': return "default"; case 'Shipped': return "secondary"; case 'Delivered': return "default";
      case 'Cancelled': case 'Payment Failed': return "destructive"; default: return "outline";
    }
  };
  
  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading vendor dashboard...</p>
          </div>
        </div>
      ) : (
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
          
          {/* Token Generation Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Review Tokens
              </CardTitle>
              <CardDescription>
                Generate tokens for offline customers to leave reviews
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button 
                  onClick={() => {
                    setShowTokenGenerator(!showTokenGenerator);
                    if (showTokenGenerator) {
                      // Clear all state when hiding
                      setSelectedProduct('');
                      setTokenQuantity(1);
                      setGeneratedTokens([]);
                      setGeneratedQRCodes([]);
                      setProductDetailUrl('');
                      setCopiedItems(new Set());
                    }
                  }}
                  variant={showTokenGenerator ? "outline" : "default"}
                >
                  {showTokenGenerator ? "Hide Generator" : "Generate Tokens"}
                </Button>
              </div>
              
              {showTokenGenerator && (
                <div className="space-y-3 p-2 border rounded-md bg-white w-full max-w-full overflow-hidden" style={{ width: '100%', maxWidth: '100vw' }}>
                  <div className="grid grid-cols-1 gap-3 w-full max-w-full" style={{ width: '100%' }}>
                    <div className="space-y-1 w-full min-w-0">
                      <label className="block text-xs font-medium text-gray-700">Select Product</label>
                      <div className="relative w-full">
                        <select
                          value={selectedProduct}
                          onChange={(e) => setSelectedProduct(e.target.value)}
                          className="w-full p-2 pr-6 border border-gray-300 rounded text-xs min-h-[32px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed bg-white appearance-none"
                          style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                          disabled={productsLoading}
                        >
                          <option value="" className="py-1">
                            {productsLoading ? 'Loading products...' : 'Choose a product...'}
                          </option>
                          {vendorProducts.map((product: Product) => (
                            <option key={product.id} value={product.id} className="py-1 text-xs truncate">
                              {product.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none">
                          <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {productsError && (
                        <p className="text-xs text-red-600 mt-1 break-words w-full">
                          Error loading products: {productsError.message}
                        </p>
                      )}
                      {!productsLoading && !productsError && vendorProducts.length === 0 && (
                        <p className="text-xs text-gray-600 mt-1 w-full">
                          No products found. <Link href="/vendor/products/new" className="text-blue-600 hover:underline text-xs">Add your first product</Link> to generate tokens.
                        </p>
                      )}
                    </div>
                    <div className="space-y-1 w-full min-w-0">
                      <label className="block text-xs font-medium text-gray-700">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        defaultValue={tokenQuantity}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value !== '') {
                            const numValue = Number(value);
                            if (!isNaN(numValue) && numValue >= 1 && numValue <= 50) {
                              setTokenQuantity(numValue);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (value === '' || value === '0') {
                            setTokenQuantity(1);
                            e.target.value = '1';
                          }
                        }}
                        className="w-full p-2 border border-gray-300 rounded text-xs min-h-[32px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                        placeholder="1-50"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateTokens}
                    disabled={!selectedProduct || tokenQuantity < 1 || isGenerating}
                    className="w-full py-3 text-base font-medium min-h-[44px]"
                  >
                    {isGenerating ? 'Generating...' : `Generate ${tokenQuantity} Token${tokenQuantity !== 1 ? 's' : ''}`}
                  </Button>

                  {generatedTokens.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-lg">Generated Tokens:</h4>

                      {/* Product Detail Link */}
                      {productDetailUrl && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Link href={productDetailUrl} className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">Product Detail Page</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 font-mono text-xs bg-white px-2 py-1 rounded border break-all text-blue-800">
                              {productDetailUrl}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyProductUrl()}
                              className="shrink-0"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              {copiedItems.has('product-url') ? 'Copied!' : 'Copy Link'}
                            </Button>
                          </div>
                          <p className="text-xs text-blue-700 mt-1">
                            Share this link with customers to view the product details
                          </p>
                        </div>
                      )}

                      <div className="space-y-3">
                        {generatedTokens.map((token, index) => (
                          <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                            <div className="flex flex-col gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-700 mb-1">Token:</p>
                                <code className="block font-mono text-sm bg-white px-3 py-2 rounded border break-all">{token}</code>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToken(token)}
                                  className="flex-1 min-h-[44px] text-sm"
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  {copiedItems.has(`token-${token}`) ? 'Copied!' : 'Copy Token'}
                                </Button>
                                {generatedQRCodes[index] && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => downloadQR(generatedQRCodes[index], token)}
                                    className="flex-1 min-h-[44px] text-sm"
                                  >
                                    <QrCode className="h-4 w-4 mr-2" />
                                    QR Code
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* QR Code Preview */}
                      {generatedQRCodes.length > 0 && generatedQRCodes[0] && (
                        <div className="mt-6 p-4 border rounded-lg bg-white">
                          <h5 className="font-medium mb-3 text-center">QR Code Preview (First Token):</h5>
                          <div className="flex justify-center">
                            <img
                              src={generatedQRCodes[0]}
                              alt={`QR Code for token ${generatedTokens[0]}`}
                              className="border rounded shadow-sm"
                              style={{ maxWidth: '200px', height: 'auto' }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-3 text-center">
                            Scan this QR code to access the review page for this product
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vendor Agreement Modal */}
          <VendorAgreementModal
            vendorId={vendorDetails.id}
            vendorName="Vendor"
            isOpen={showAgreementModal}
            onClose={() => setShowAgreementModal(false)}
          />
        </>
      )}
    </>
  );
}

export default VendorDashboardClient;
