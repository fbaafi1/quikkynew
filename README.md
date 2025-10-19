# QuiKart: A Ghanaian Mobile E-commerce Platform

QuiKart is a mobile-first e-commerce web application designed to simulate a vibrant online shopping experience in Ghana. It provides a comprehensive marketplace for customers, vendors, and administrators with modern features and Ghanaian market localization.

Built with a modern tech stack including **Next.js 14**, **React**, **TypeScript**, **Tailwind CSS**, and **ShadCN UI**, QuiKart offers a complete e-commerce solution with role-based access control, inventory management, and localized payment simulation.

---

## Core Features & Functionalities

The platform supports three distinct user roles: **customers**, **vendors**, and **administrators**, each with specialized dashboards and capabilities.

### I. Customer Experience

The main storefront where users can browse, wishlist, and purchase products using a simulated payment system.

1.  **Authentication:**
    *   Users can sign up and log into their accounts with email/password or social login (Google)
    *   Role-based redirection to appropriate dashboards

2.  **Product Discovery:**
    *   **Category-based browsing** with intuitive filtering
    *   **Product search and discovery** with detailed product pages
    *   **Flash sales** with time-limited discounts and countdown timers
    *   **Wishlist functionality** for saving favorite items

3.  **Shopping Experience:**
    *   **Persistent shopping cart** with real-time updates and stock validation
    *   **Multi-vendor cart** support with vendor-grouped items
    *   **Cash on Delivery** payment simulation
    *   **Order tracking** and history with status updates

4.  **Profile Management:**
    *   Users can manage personal information and delivery addresses
    *   **Ghanaian regions** integration for localized addressing

### II. Vendor Experience

A comprehensive dashboard for vendors to manage their products, orders, and business metrics.

1.  **Vendor Dashboard:**
    *   **Analytics overview** with product count, orders, and revenue tracking
    *   **Low-stock alerts** and inventory management
    *   **Subscription management** with expiration warnings

2.  **Product Management:**
    *   **Full CRUD operations** for product listings
    *   **Image upload** and rich product descriptions
    *   **Category assignment** and inventory tracking
    *   **Product boost system** for featured listings

3.  **Order Management:**
    *   **Order fulfillment** tracking for vendor's products
    *   **QR code generation** for product promotion
    *   **Revenue analytics** and sales reporting

### III. Admin Experience

A powerful administrative panel for platform oversight and content management.

1.  **Admin Dashboard:**
    *   **Platform statistics** and user management
    *   **Revenue tracking** and customer analytics

2.  **Content Management:**
    *   **Category management** with hierarchical structure
    *   **Advertisement system** with scheduling and targeting
    *   **Flash sales oversight** and boost request approvals
    *   **Blog content management** and notification system

3.  **Platform Administration:**
    *   **Vendor management** and subscription oversight
    *   **User administration** and role management
    *   **System notifications** and promotional campaigns

---

## Technical Architecture

### **Technology Stack**

*   **Framework:** Next.js 14 (App Router) with Server-Side Rendering
*   **Frontend:** React 18, TypeScript, Tailwind CSS
*   **UI Components:** ShadCN UI component library
*   **Database:** Supabase (PostgreSQL) with Row Level Security
*   **Authentication:** Supabase Auth with social providers
*   **State Management:** React Context + TanStack React Query
*   **Deployment:** Netlify with continuous deployment

### **Key Technical Features**

*   **Role-based access control** with three user types
*   **Real-time updates** using Supabase subscriptions
*   **Image optimization** with Next.js Image component
*   **Responsive design** optimized for mobile-first experience
*   **Type-safe development** with comprehensive TypeScript coverage
*   **Error boundaries** and loading states throughout
*   **Database relationships** with proper foreign key constraints

### **Database Schema**

*   **Users & Profiles:** Multi-role authentication with vendor subscriptions
*   **Products:** Comprehensive catalog with categories, vendors, and inventory
*   **Orders:** Complete order lifecycle with items, payments, and fulfillment
*   **Flash Sales:** Time-based promotions with discount management
*   **Advertisements:** Promotional content with scheduling
*   **Wishlist:** User-specific saved products

---

## Design & User Experience

### **Ghanaian Market Focus**

*   **Local currency** (GH₵) throughout the application
*   **Regional addressing** with all 16 Ghanaian regions
*   **Mobile-first design** optimized for local usage patterns
*   **Cultural considerations** in UI/UX design choices

### **Design Philosophy**

*   **Clean, modern interface** with intuitive navigation
*   **Consistent design language** across all user roles
*   **Mobile-responsive layouts** for all screen sizes
*   **Accessibility considerations** for diverse user needs

### **Color Scheme**

*   **Primary:** Vibrant orange (`#FF9500`) - energetic and attention-grabbing
*   **Background:** Light beige (`#F5F5DC`) - warm and inviting
*   **Accent:** Soft yellow (`#FAF089`) - complementary and modern
*   **Typography:** Clear, readable fonts optimized for mobile viewing

---

## Business Model

### **Multi-Vendor Marketplace**

*   **Vendor subscriptions** for platform access and product listings
*   **Product boost fees** for featured placement in search results
*   **Commission structure** on successful sales (framework implemented)
*   **Premium features** for enhanced vendor visibility

### **Revenue Streams**

1. **Vendor Subscriptions** - Monthly/annual fees for platform access
2. **Product Boosts** - Featured listing fees for increased visibility
3. **Premium Services** - Advanced analytics and promotional tools
4. **Commission Model** - Percentage-based fees on completed transactions

---

## Getting Started

### **Prerequisites**

*   Node.js 18+ and npm/yarn
*   Supabase account for database and authentication
*   Netlify account for deployment

### **Installation**

```bash
# Clone the repository
git clone [repository-url]
cd quikart

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Configure your Supabase credentials

# Run development server
npm run dev
```

### **Environment Configuration**

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_ADMIN_PHONE_NUMBER=your_admin_contact
```

---

## Project Structure

```
src/
├── app/                    # Next.js App Router structure
│   ├── admin/             # Admin panel pages and components
│   ├── vendor/            # Vendor dashboard and management
│   ├── auth/              # Authentication pages
│   ├── api/               # API routes
│   └── components/        # Reusable UI components
├── contexts/              # React Context providers
├── lib/                   # Utility functions and configurations
└── ai/                    # AI-powered features (notification flows)
```

---

## Contributing

This project follows modern React/Next.js best practices:

*   **Component composition** for reusable UI elements
*   **TypeScript** for type safety and better DX
*   **Responsive design** with mobile-first approach
*   **Server-side rendering** for performance and SEO

---

## License

This project is designed as a demonstration of modern e-commerce architecture with Ghanaian market localization.
