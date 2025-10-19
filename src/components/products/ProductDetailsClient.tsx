"use client";

import { useState, useRef, TouchEvent, FormEvent, useEffect } from 'react';
import Image from 'next/image';
import type { Product, Review, FlashSale } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ShoppingCart, ChevronLeft, ChevronRight, ImageIcon, Heart, Send, Zap, Phone, MessageCircle } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useUser } from '@/contexts/UserContext';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import StarRatingDisplay from '@/components/ui/StarRatingDisplay';
import StarRatingInput from '@/components/ui/StarRatingInput';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';
import Countdown from 'react-countdown';
import ProductContactButtons from './ProductContactButtons';

interface ProductDetailsClientProps {
  product: Product;
  flashSale: FlashSale | null;
  relatedProducts: Product[];
  reviews: Review[];
  isVendorSubscriptionActive?: boolean;
}

// Helper functions moved from server component
const getImageAttributes = (imageUrlOrDataUriWithHint: string | undefined, productName: string = "Product") => {
  let src: string = `https://placehold.co/600x400.png?text=${encodeURIComponent(productName.split(' ').slice(0,1).join('') || 'Product')}`;
  let hint: string = productName.split(' ').slice(0, 2).join(' ').toLowerCase() || "image";

  if (imageUrlOrDataUriWithHint) {
    const parts = imageUrlOrDataUriWithHint.split('" data-ai-hint="');
    const potentialSrc = parts[0];
    const embeddedHint = parts[1]?.replace('"', '').trim();

    if (potentialSrc.startsWith('data:image/') || potentialSrc.startsWith('https://placehold.co/')) {
      src = potentialSrc; hint = embeddedHint || hint;
    } else if (potentialSrc) {
      const textForPlaceholder = productName.split(' ').slice(0, 2).join(' ') || 'Product';
      src = `https://placehold.co/600x400.png?text=${encodeURIComponent(textForPlaceholder)}`;
      hint = embeddedHint || hint;
    }
  }

  hint = hint.split(' ').slice(0, 2).join(' ');
  if (!hint) hint = "image";
  return { src, hint };
};

const getDiscountedPrice = (price: number, sale: FlashSale) => {
  if (sale.discount_type === 'percentage') return price * (1 - sale.discount_value / 100);
  return Math.max(0, price - sale.discount_value);
};

export default function ProductDetailsClient({
  product,
  flashSale,
  relatedProducts,
  reviews,
  isVendorSubscriptionActive = true
}: ProductDetailsClientProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [localReviews, setLocalReviews] = useState(reviews);
  const [purchaseType, setPurchaseType] = useState<'online' | 'offline'>('online');
  const [reviewToken, setReviewToken] = useState('');
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [isMobileImageViewerOpen, setIsMobileImageViewerOpen] = useState(false);

  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { currentUser } = useUser();
  const router = useRouter();

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Keyboard handler for mobile image viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileImageViewerOpen) {
        setIsMobileImageViewerOpen(false);
      }
    };

    if (isMobileImageViewerOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileImageViewerOpen]);

  // Validate offline token
  const validateOfflineToken = async (token: string): Promise<{ valid: boolean; message?: string }> => {
    if (!token.trim()) {
      return { valid: false, message: 'Please enter a review token' };
    }

    setIsValidatingToken(true);
    try {
      const { data: tokenData, error } = await supabase
        .from('offline_tokens' as any)
        .select('*')
        .eq('token', token.trim())
        .eq('product_id', product.id)
        .eq('used', false)
        .single();

      if (error || !tokenData) {
        return { valid: false, message: 'Invalid or expired review token' };
      }

      // Mark token as used
      await supabase
        .from('offline_tokens' as any)
        .update({ used: true } as any)
        .eq('id', (tokenData as any).id);

      return { valid: true };
    } catch (error) {
      return { valid: false, message: 'Error validating token' };
    } finally {
      setIsValidatingToken(false);
    }
  };

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) { 
      router.push(`/auth/login?redirect=/products/${product.id}`); 
      return; 
    }
    if (userRating === 0) { 
      console.error("Rating Required", "Please select a star rating."); 
      return; 
    }
    setIsSubmittingReview(true);
    
    try {
      // Validate offline token
      const tokenValidation = await validateOfflineToken(reviewToken);
      if (!tokenValidation.valid) {
        console.error("Token Validation Failed", tokenValidation.message);
        return;
      }

      const reviewSource: 'offline' = 'offline';

      // Check if user already reviewed
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('product_id', product.id)
        .limit(1);
      
      if (existingReview && existingReview.length > 0) { 
        console.error("Review Already Submitted", "You have already reviewed this product."); 
        setHasUserReviewed(true); 
        return; 
      }
    
      await supabase
        .from('reviews')
        .insert({ 
          product_id: product.id, 
          user_id: currentUser.id, 
          user_name: currentUser.name || 'Anonymous', 
          rating: userRating, 
          comment: userComment,
          source: reviewSource
        });
      
      setUserRating(0); 
      setUserComment(''); 
      setReviewToken('');
      setPurchaseType('online');
      
      // Manually add the new review to the list for immediate feedback
      const newReview: Review = { 
        id: Date.now().toString(), 
        product_id: product.id, 
        user_id: currentUser.id, 
        user_name: currentUser.name || 'Anonymous', 
        rating: userRating, 
        comment: userComment,
        source: reviewSource,
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString() 
      };
      
      setLocalReviews(prev => [newReview, ...prev]);
      setHasUserReviewed(true);

    } catch (err: any) { 
      console.error("Review Submission Failed", err); 
    } finally { 
      setIsSubmittingReview(false); 
    }
  };

  const handleAddToCart = () => { 
    if (!currentUser) { 
      router.push(`/auth/login?redirect=/products/${product.id}`); 
      return; 
    } 
    addToCart(product); 
  };

  const handleWishlistToggle = () => { 
    isInWishlist(product.id) ? removeFromWishlist(product.id) : addToWishlist(product); 
  };

  const nextImage = () => { 
    if (!product.images || product.images.length === 0) return; 
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % product.images.length); 
  };

  const prevImage = () => { 
    if (!product.images || product.images.length === 0) return; 
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + product.images.length) % product.images.length); 
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => { 
    touchStartX.current = e.targetTouches[0].clientX; 
    touchEndX.current = 0; 
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => { 
    touchEndX.current = e.targetTouches[0].clientX; 
  };

  const handleTouchEnd = () => { 
    if (touchStartX.current === 0 || touchEndX.current === 0) return; 
    const threshold = 50; 
    const swipedDistance = touchStartX.current - touchEndX.current; 
    if (swipedDistance > threshold) nextImage(); 
    else if (swipedDistance < -threshold) prevImage(); 
    touchStartX.current = 0; 
    touchEndX.current = 0; 
  };

  const { src: currentImageUrl, hint: currentImageHint } = getImageAttributes(product.images?.[currentImageIndex], product.name);
  const inWishlist = isInWishlist(product.id);
  const discountedPrice = flashSale ? getDiscountedPrice(product.price, flashSale) : null;
  const stockAvailable = flashSale && flashSale.stock_cap !== null ? 
    Math.min(product.stock, flashSale.stock_cap - flashSale.sales_count) : 
    product.stock;

  return (
    <>
      <div className="space-y-6">
        <div className="container mx-auto px-4">
          <Button variant="ghost" size="sm" asChild className="mb-6 text-muted-foreground hover:text-foreground h-8 px-3 text-xs">
            <Link href="/">
              <ChevronLeft className="mr-1 h-3 w-3" /> Back to products
            </Link>
          </Button>
        </div>
        
        <div className="md:grid md:grid-cols-2 md:gap-8 lg:gap-12 container mx-auto px-4">
          <div className="space-y-4">
            <div 
              className="relative aspect-square md:rounded-lg overflow-hidden bg-background flex items-center justify-center border cursor-pointer md:cursor-default" 
              onTouchStart={handleTouchStart} 
              onTouchMove={handleTouchMove} 
              onTouchEnd={handleTouchEnd}
              onClick={(e) => {
                // Only open mobile viewer on mobile devices (not desktop)
                if (window.innerWidth < 768) {
                  e.preventDefault();
                  setIsMobileImageViewerOpen(true);
                }
              }}
            >
              {currentImageUrl ? (
                <Image 
                  key={currentImageIndex} 
                  src={currentImageUrl} 
                  alt={`${product.name} - Image ${currentImageIndex + 1}`} 
                  fill 
                  sizes="(max-width: 768px) 100vw, 50vw" 
                  className="object-contain transition-opacity duration-300 ease-in-out" 
                  data-ai-hint={currentImageHint || "product image"}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-24 h-24 text-muted-foreground" />
                </div>
              )}
              
              {(product.images?.length || 0) > 1 && (
                <>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/50 hover:bg-background/80 shadow-md hidden md:flex" 
                    onClick={prevImage} 
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/50 hover:bg-background/80 shadow-md hidden md:flex" 
                    onClick={nextImage} 
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}
            </div>
            
            {(product.images?.length || 0) > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.images.map((imgStr, index) => {
                  const { src } = getImageAttributes(imgStr, product.name);
                  return (
                    <button 
                      key={index} 
                      onClick={() => setCurrentImageIndex(index)} 
                      className={`relative aspect-square rounded-md overflow-hidden border-2 ${
                        index === currentImageIndex ? 'border-primary' : 'border-transparent'
                      } hover:border-primary transition`}
                    >
                      <Image src={src} alt={`Thumbnail ${index + 1}`} fill sizes="20vw" className="object-cover" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col mt-6 md:mt-0">
            <div className="space-y-3 md:space-y-4 flex-grow">
              <h1 className="text-2xl lg:text-3xl font-bold text-primary">{product.name}</h1>
              <div className="flex items-center gap-2">
                <StarRatingDisplay rating={product.average_rating || 0} size={20} />
                {(product.review_count ?? 0) > 0 ? (
                  <a href="#reviews" className="text-sm text-muted-foreground hover:underline">
                    ({product.review_count} review{product.review_count !== 1 ? 's' : ''})
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">No reviews yet</span>
                )}
              </div>
              
              {flashSale && discountedPrice !== null ? (
                <div>
                  <p className="text-3xl lg:text-4xl font-semibold text-destructive">GH₵{discountedPrice.toFixed(2)}</p>
                  <div className="text-md text-muted-foreground">
                    <span className="line-through">GH₵{product.price.toFixed(2)}</span>
                    <Badge variant="destructive" className="ml-2">
                      Save {flashSale.discount_type === 'percentage' ? `${flashSale.discount_value}%` : `GH₵${flashSale.discount_value}`}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-3xl lg:text-4xl font-semibold text-foreground">GH₵{product.price.toFixed(2)}</p>
              )}
              
              {flashSale && (
                <div className="p-3 bg-destructive text-destructive-foreground rounded-lg shadow-lg">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Zap />Flash Sale Ends In:
                  </h3>
                  <Countdown 
                    date={flashSale.end_date} 
                    renderer={({days, hours, minutes, seconds, completed}) => {
                      if (completed) {
                        return <span className="font-mono text-xl tracking-wider">Sale has ended!</span>;
                      }
                      return (
                        <div className="flex items-baseline gap-2 font-mono text-xl tracking-wider">
                          <span>{String(days).padStart(2, '0')}d</span>
                          <span>:</span>
                          <span>{String(hours).padStart(2, '0')}h</span>
                          <span>:</span>
                          <span>{String(minutes).padStart(2, '0')}m</span>
                          <span>:</span>
                          <span>{String(seconds).padStart(2, '0')}s</span>
                        </div>
                      )
                    }}
                  />
                </div>
              )}

              <Badge 
                variant={stockAvailable > 0 ? "secondary" : "destructive"} 
                className="text-sm py-1 px-3"
              >
                {flashSale && flashSale.stock_cap !== null ? 
                  `Limited Stock: ${stockAvailable} left` : 
                  (stockAvailable > 0 ? `In Stock: ${stockAvailable}` : 'Out of Stock')
                }
              </Badge>
               
              {product.vendor_id && product.vendors?.store_name && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground">
                    Sold by: <Link href={`/vendors/${product.vendor_id}`} className="font-semibold text-primary hover:underline">
                      {product.vendors.store_name}
                    </Link>
                  </p>
                </div>
              )}
            </div>

            {/* Product Description Section - moved before action buttons */}
            <div className="mt-6 pt-6 border-t">
              <h2 className="text-lg sm:text-xl font-semibold mb-3">Product Description</h2>
              {product.description ? (
                <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </div>
              ) : (
                <p className="text-muted-foreground">No description available.</p>
              )}

              {/* Product Link Section */}
              {product.link_url && (
                <>
                  <Separator className="my-6"/>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-base font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Product Resources
                    </h3>
                    <p className="text-blue-700 mb-3 text-sm">Check out additional information about this product:</p>
                    <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <a
                        href={product.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2"
                      >
                        <MessageCircle className="h-3 w-3" />
                        View Product Details
                      </a>
                    </Button>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex gap-2 sm:gap-3 w-full">
                <Button
                  onClick={handleAddToCart}
                  className="flex-1 text-sm sm:text-base py-2 sm:py-3"
                  size="default"
                  disabled={stockAvailable === 0 && currentUser !== null}
                  aria-label={`Add ${product.name} to cart`}
                  title={stockAvailable > 0 ? 'Add to Cart' : (currentUser ? 'Out of Stock' : 'Login to Add to Cart')}
                >
                  <ShoppingCart className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Add to Cart
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleWishlistToggle}
                  aria-label={inWishlist ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                  title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                  className="shrink-0 p-2 sm:p-3"
                >
                  <Heart className={`h-5 w-5 sm:h-6 sm:w-6 ${inWishlist ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                </Button>
              </div>
              {stockAvailable === 0 && currentUser && (
                <p className="text-sm text-destructive mt-2 text-center sm:text-left">
                  This product is currently out of stock.
                </p>
              )}

              {/* Contact Buttons */}
              {product.vendor_id && product.vendors && (
                <div className="mt-4 pt-4 border-t">
                  <ProductContactButtons
                    vendorPhone={product.vendors.contact_number}
                    vendorName={product.vendors.store_name || 'the vendor'}
                    isVendorSubscriptionActive={isVendorSubscriptionActive}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div id="product-info" className="container mx-auto px-4 mt-12">
        <Separator className="my-8"/>

        {/* Product Link Section */}
        {product.link_url && (
          <>
            <Separator className="my-8"/>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Product Resources
              </h3>
              <p className="text-blue-700 mb-3">Check out additional information about this product:</p>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <a
                  href={product.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  View Product Details
                </a>
              </Button>
            </div>
          </>
        )}
        
        {relatedProducts.length > 0 && (
          <div id="related-products" className="mt-8">
            <Separator className="my-8"/>
            <h2 className="text-2xl font-semibold mb-4">Related Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {relatedProducts.map(related => {
                const { src: relatedImgSrc } = getImageAttributes(related.images?.[0], related.name);
                return (
                  <Link href={`/products/${related.id}`} key={related.id} className="block group">
                    <Card className="overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-200 h-full">
                      <div className="aspect-square relative w-full bg-background flex items-center justify-center">
                        <Image
                          src={relatedImgSrc || ''}
                          alt={related.name}
                          fill
                          sizes="33vw"
                          className="object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <p className="text-xs sm:text-sm font-medium p-2 text-center truncate group-hover:text-primary">
                        {related.name}
                      </p>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <Separator className="my-8"/>

        <div id="reviews">
          <h2 className="text-2xl font-semibold mb-2">Customer Reviews & Ratings</h2>
          <div className="flex items-baseline gap-2 mb-4">
            <StarRatingDisplay rating={product.average_rating || 0} size={24} />
            <p className="text-lg font-bold">{(product.average_rating || 0).toFixed(1)} out of 5</p>
            <p className="text-sm text-muted-foreground">
              ({product.review_count} review{product.review_count !== 1 ? 's' : ''})
            </p>
          </div>
          <Separator className="my-6"/>

          {currentUser && (
            hasUserReviewed ? (
              <Card className="mb-8 shadow-md p-6 text-center bg-accent/20 border border-dashed">
                <h3 className="text-lg font-semibold text-foreground">Thank You!</h3>
                <p className="text-muted-foreground">You have already reviewed this product.</p>
              </Card>
            ) : (
              <Card className="mb-8 shadow-md">
                <CardHeader>
                  <CardTitle>Write a Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    {/* Offline Token Input - Always Required */}
                    <div>
                      <label htmlFor="reviewToken" className="block text-sm font-medium text-gray-700 mb-1">
                        Review Token: <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        id="reviewToken"
                        value={reviewToken}
                        onChange={(e) => setReviewToken(e.target.value)}
                        placeholder="Enter your review token (e.g., QK-ABC123)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Get this token from the vendor when you purchase the product offline.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your Rating:</label>
                      <StarRatingInput value={userRating} onChange={setUserRating} />
                    </div>
                    <div>
                      <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">Your Review:</label>
                      <Textarea
                        id="comment"
                        value={userComment}
                        onChange={(e) => setUserComment(e.target.value)}
                        placeholder="Share your thoughts about this product..."
                        rows={4}
                      />
                    </div>
                    <Button type="submit" disabled={isSubmittingReview}>
                      {isSubmittingReview && <Spinner className="mr-2 h-4 w-4" />}
                      Submit Review <Send className="ml-2 h-4 w-4"/>
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )
          )}

          {!currentUser && (
            <Card className="mb-8 shadow-md p-6 text-center">
              <p className="text-muted-foreground">
                <Link href={`/auth/login?redirect=/products/${product.id}`} className="text-primary hover:underline font-semibold">
                  Log in
                </Link> to write a review.
              </p>
            </Card>
          )}

          {localReviews.length > 0 ? (
            <div className="space-y-6">
              {localReviews.map(review => (
                <Card key={review.id} className="p-4 shadow">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <StarRatingDisplay rating={review.rating} size={16} />
                      {review.source === 'offline' && (
                        <Badge variant="secondary" className="text-xs">Offline Verified</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-700 whitespace-pre-line">{review.comment}</p>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
          )}
        </div>
      </div>

      {/* Mobile Image Viewer Modal */}
      {isMobileImageViewerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black md:hidden"
          onClick={() => setIsMobileImageViewerOpen(false)}
        >
          <div
            className="relative w-full h-full flex items-center justify-center p-4"
            onTouchStart={(e) => {
              touchStartX.current = e.targetTouches[0].clientX;
              touchEndX.current = 0;
            }}
            onTouchMove={(e) => {
              touchEndX.current = e.targetTouches[0].clientX;
            }}
            onTouchEnd={() => {
              if (touchStartX.current === 0 || touchEndX.current === 0) return;
              const threshold = 50;
              const swipedDistance = touchStartX.current - touchEndX.current;
              if (swipedDistance > threshold && currentImageIndex < (product.images?.length || 0) - 1) {
                setCurrentImageIndex(currentImageIndex + 1);
              } else if (swipedDistance < -threshold && currentImageIndex > 0) {
                setCurrentImageIndex(currentImageIndex - 1);
              }
              touchStartX.current = 0;
              touchEndX.current = 0;
            }}
          >
            <Image
              src={currentImageUrl}
              alt={`${product.name} - Full Screen`}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />

            {/* Navigation indicators for multiple images */}
            {(product.images?.length || 0) > 1 && (
              <>
                {/* Previous button */}
                {currentImageIndex > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(currentImageIndex - 1);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-3 hover:bg-black/70 transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}

                {/* Next button */}
                {currentImageIndex < (product.images?.length || 0) - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(currentImageIndex + 1);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-3 hover:bg-black/70 transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}

                {/* Image counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 rounded-full px-3 py-1 text-sm">
                  {currentImageIndex + 1} / {product.images?.length || 0}
                </div>
              </>
            )}

            {/* Close button */}
            <button
              onClick={() => setIsMobileImageViewerOpen(false)}
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
              aria-label="Close image viewer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
