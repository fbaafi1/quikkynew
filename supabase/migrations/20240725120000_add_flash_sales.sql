
-- Create the ENUM type for the discount
CREATE TYPE public.discount_type AS ENUM (
    'percentage',
    'fixed_amount'
);

-- Create the flash_sales table
CREATE TABLE public.flash_sales (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL,
    discount_type public.discount_type NOT NULL,
    discount_value numeric NOT NULL,
    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    stock_cap integer,
    sales_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT flash_sales_pkey PRIMARY KEY (id),
    CONSTRAINT flash_sales_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
    CONSTRAINT flash_sales_discount_value_check CHECK (discount_value > 0),
    CONSTRAINT flash_sales_stock_cap_check CHECK (stock_cap IS NULL OR stock_cap >= 0),
    CONSTRAINT flash_sales_sales_count_check CHECK (sales_count >= 0)
);

-- Add indexes for performance
CREATE INDEX idx_flash_sales_product_id ON public.flash_sales(product_id);
CREATE INDEX idx_flash_sales_active_dates ON public.flash_sales(is_active, start_date, end_date);


-- Enable Row Level Security (RLS)
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;

-- POLICIES for flash_sales table

-- 1. Public can read active flash sales
CREATE POLICY "Public can read active flash sales"
ON public.flash_sales
FOR SELECT
USING (
  is_active = true AND
  start_date <= now() AND
  end_date >= now()
);

-- 2. Admins have full access
CREATE POLICY "Admins have full access"
ON public.flash_sales
FOR ALL
USING (auth.jwt() ->> 'user_role' = 'admin')
WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');

-- Function to increment the sales_count safely
CREATE OR REPLACE FUNCTION increment_flash_sale_sales_count(sale_id uuid, increment_by integer)
RETURNS void AS $$
BEGIN
  UPDATE public.flash_sales
  SET sales_count = sales_count + increment_by
  WHERE id = sale_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION increment_flash_sale_sales_count(uuid, integer) TO authenticated;

-- Add a comment to the function for clarity
COMMENT ON FUNCTION increment_flash_sale_sales_count(uuid, integer) IS 'Safely increments the sales_count for a flash sale by a given amount.';

