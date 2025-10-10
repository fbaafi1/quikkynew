

export interface Category {
  id: string;
  name: string;
  is_visible: boolean;
  parent_id?: string | null;
  subcategories?: Category[];
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user_name?: string;
  rating: number; // 1-5
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
    id: string;
    user_id: string;
    store_name: string;
    contact_number?: string | null;
    description?: string | null;
    is_verified: boolean;
    subscription_start_date?: string | null;
    subscription_end_date?: string | null;
    created_at?: string;
    updated_at?: string;
    user?: {
      email: string;
      name: string;
    } | null;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  categoryId: string | null;
  categoryName?: string; // Added to match the data structure
  vendor_id?: string | null;
  stock: number;
  average_rating?: number;
  review_count?: number;
  is_boosted?: boolean;
  boosted_until?: string | null;
  boost_status?: 'none' | 'requested' | 'active' | 'expired';
  categories?: Category | null;
  vendors?: Vendor | null;
}

export interface CartItem extends Product {
  quantity: number;
}

export type PaymentMethod =
  | 'MTN MoMo'
  | 'Vodafone Cash'
  | 'Telecel Cash'
  | 'Cash on Delivery'
  | 'Paystack';

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Payment Failed';

export interface OrderProductItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  categoryId?: string;
  quantity: number;
  vendorName?: string;
  vendorId?: string;
}


export interface Order {
  id: string;
  userId: string;
  items: OrderProductItem[];
  totalAmount: number;
  status: OrderStatus;
  orderDate: string;
  shippingAddress: Address;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  user_profiles?: {
    email?: string;
    name?: string;
    phone?: string;
  } | null;
  order_items?: Array<{
    product_id: string;
    quantity: number;
    price_at_purchase: number;
    product_name?: string;
    product_image?: string;
    products?: {
      id: string;
      name: string;
      description?: string;
      price: number;
      images: string[];
      category_id?: string;
      stock?: number;
      vendor_id?: string;
      vendors?: {
        id: string;
        store_name: string;
      } | null;
    } | null;
  }>;
}

export interface Address {
  street: string;
  city: string;
  region: string;
  postalCode?: string;
  country: string;
}

export type UserRole = 'customer' | 'admin' | 'vendor';

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: UserRole;
  address?: Address;
}

export interface AdminOrderSummary {
  id: string;
  orderDate: string;
  customer_name: string;
  customer_email?: string;
  user_id: string;
  totalAmount: number;
  status: OrderStatus;
  item_count: number;
}

export interface Advertisement {
  id: string;
  title: string;
  media_url: string;
  media_type: 'image' | 'video';
  link_url?: string | null;
  is_active: boolean;
  start_date?: string; // Made optional to handle existing data
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BlogPost {
  id: string;
  created_at?: string;
  updated_at?: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  author?: string | null;
  image_url?: string | null;
  is_published: boolean;
}

export interface BoostRequest {
  id: number;
  product_id: string;
  vendor_id: string;
  user_id: string;
  plan_duration_days: number;
  plan_price: number;
  request_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  products?: { name: string, images: string[] } | null;
  vendors?: { store_name: string } | null;
}

export interface BoostPlan {
  id: number;
  name: string;
  description?: string | null;
  duration_days: number;
  price: number;
  is_active: boolean;
  created_at?: string;
}

export interface FlashSale {
  id: string;
  product_id: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  start_date: string; // ISO String
  end_date: string; // ISO String
  is_active: boolean;
  stock_cap: number | null;
  sales_count: number;
  created_at: string;
  updated_at: string;
  products?: Product | null; // For joined data
}
