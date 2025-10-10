
-- ### Flash Sales Feature SQL Script ###
-- This script sets up the necessary database tables, types,
-- and functions for the QuiKart Flash Sales feature.

-- 1. Create ENUM type for discount types
-- This prevents invalid discount types from being saved.
CREATE TYPE public.discount_type AS ENUM (
    'percentage',
    'fixed_amount'
);

-- 2. Create the flash_sales table
-- This table will store all the details for each flash sale event.
CREATE TABLE public.flash_sales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    discount_type public.discount_type NOT NULL,
    discount_value numeric(10, 2) NOT NULL,
    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    stock_cap integer,
    sales_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT discount_value_positive CHECK (discount_value > 0),
    CONSTRAINT stock_cap_non_negative CHECK (stock_cap >= 0),
    CONSTRAINT end_date_after_start_date CHECK (end_date > start_date)
);

-- Add comments for clarity
COMMENT ON TABLE public.flash_sales IS 'Stores details for limited-time product sales.';
COMMENT ON COLUMN public.flash_sales.product_id IS 'The product that is on sale.';
COMMENT ON COLUMN public.flash_sales.discount_type IS 'Whether the discount is a percentage or a fixed amount.';
COMMENT ON COLUMN public.flash_sales.discount_value IS 'The value of the discount (e.g., 20 for 20% or 15.00 for GH₵15).';
COMMENT ON COLUMN public.flash_sales.start_date IS 'When the flash sale becomes active.';
COMMENT ON COLUMN public.flash_sales.end_date IS 'When the flash sale ends.';
COMMENT ON COLUMN public.flash_sales.is_active IS 'Admin toggle to enable or disable the sale.';
COMMENT ON COLUMN public.flash_sales.stock_cap IS 'Optional: The maximum number of units that can be sold at the sale price.';
COMMENT ON COLUMN public.flash_sales.sales_count IS 'The number of units sold during this flash sale.';


-- 3. Set up Row Level Security (RLS) for the flash_sales table
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;

-- Allow public, read-only access to active flash sales.
CREATE POLICY "Allow public read access to active flash sales"
ON public.flash_sales
FOR SELECT
USING (is_active = true AND start_date <= now() AND end_date >= now());

-- Allow admins full access to all flash sales.
CREATE POLICY "Allow admin full access"
ON public.flash_sales
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Create a function to increment the sales count safely
-- This function prevents race conditions when multiple orders are placed.
CREATE OR REPLACE FUNCTION increment_flash_sale_sales_count(sale_id uuid, increment_by int)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.flash_sales
  SET sales_count = sales_count + increment_by
  WHERE id = sale_id;
END;
$$;

-- 5. Grant permissions on the new function
GRANT EXECUTE ON FUNCTION increment_flash_sale_sales_count(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_flash_sale_sales_count(uuid, int) TO service_role;

-- 6. Add indexes for performance
CREATE INDEX idx_flash_sales_product_id ON public.flash_sales(product_id);
CREATE INDEX idx_flash_sales_active_period ON public.flash_sales(is_active, start_date, end_date);

-- Make sure you have a helper function is_admin() defined, for example:
-- CREATE OR REPLACE FUNCTION is_admin()
-- RETURNS boolean
-- LANGUAGE sql
-- SECURITY DEFINER
-- AS $$
--   SELECT COALESCE((auth.jwt()->>'user_role')::jsonb ? 'admin', false);
-- $$;
-- GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
-- GRANT EXECUTE ON FUNCTION is_admin() TO service_role;


-- End of script
