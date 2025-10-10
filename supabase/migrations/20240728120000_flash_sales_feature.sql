
-- Create a custom ENUM type for the discount type
CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed_amount');

-- Create the flash_sales table
CREATE TABLE public.flash_sales (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL,
    discount_type public.discount_type NOT NULL,
    discount_value real NOT NULL,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    stock_cap integer,
    sales_count integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT flash_sales_pkey PRIMARY KEY (id),
    CONSTRAINT flash_sales_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT flash_sales_discount_value_check CHECK ((discount_value > (0)::double precision)),
    CONSTRAINT flash_sales_stock_cap_check CHECK ((stock_cap IS NULL) OR (stock_cap >= 0)),
    CONSTRAINT flash_sales_sales_count_check CHECK ((sales_count >= 0)),
    CONSTRAINT flash_sales_end_date_check CHECK ((end_date > start_date))
);

-- Add comments to the table and columns for clarity
COMMENT ON TABLE public.flash_sales IS 'Stores details about limited-time sales promotions for products.';
COMMENT ON COLUMN public.flash_sales.product_id IS 'The product that is on sale.';
COMMENT ON COLUMN public.flash_sales.discount_type IS 'Whether the discount is a percentage or a fixed amount.';
COMMENT ON COLUMN public.flash_sales.discount_value IS 'The value of the discount (e.g., 20 for 20% or 15 for 15 GHS).';
COMMENT ON COLUMN public.flash_sales.start_date IS 'When the flash sale becomes active.';
COMMENT ON COLUMN public.flash_sales.end_date IS 'When the flash sale ends.';
COMMENT ON COLUMN public.flash_sales.is_active IS 'Allows admins to manually enable or disable the sale.';
COMMENT ON COLUMN public.flash_sales.stock_cap IS 'Optional limit on how many items can be sold at the sale price.';
COMMENT ON COLUMN public.flash_sales.sales_count IS 'How many items have been sold during this sale.';


-- Create a function to safely increment the sales count
CREATE OR REPLACE FUNCTION public.increment_flash_sale_sales_count(sale_id uuid, increment_by integer)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.flash_sales
  SET sales_count = sales_count + increment_by
  WHERE id = sale_id;
END;
$$;


-- Enable Row Level Security on the table
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;

-- POLICIES for flash_sales table

-- 1. Allow public read access to active flash sales
CREATE POLICY "Allow public read access to active sales" ON public.flash_sales
AS PERMISSIVE FOR SELECT
TO public
USING (is_active = true AND start_date <= now() AND end_date >= now());

-- 2. Allow admins to manage all flash sales
CREATE POLICY "Allow admins full access" ON public.flash_sales
AS PERMISSIVE FOR ALL
TO authenticated
USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin');

-- 3. Allow vendors to view flash sales related to their own products
CREATE POLICY "Allow vendors to view their own product sales" ON public.flash_sales
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'vendor' AND
  product_id IN (SELECT id FROM public.products WHERE vendor_id = (SELECT id FROM public.vendors WHERE user_id = auth.uid()))
);
