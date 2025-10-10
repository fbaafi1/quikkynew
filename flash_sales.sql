-- Create the ENUM type for discount options
CREATE TYPE public.discount_type AS ENUM (
    'percentage',
    'fixed_amount'
);

-- Create the flash_sales table
CREATE TABLE public.flash_sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    discount_type public.discount_type NOT NULL,
    discount_value numeric NOT NULL,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    stock_cap integer,
    sales_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT flash_sales_pkey PRIMARY KEY (id),
    CONSTRAINT flash_sales_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
    CONSTRAINT flash_sales_discount_value_check CHECK ((discount_value > 0)),
    CONSTRAINT flash_sales_stock_cap_check CHECK ((stock_cap IS NULL OR stock_cap >= 0)),
    CONSTRAINT flash_sales_sales_count_check CHECK ((sales_count >= 0)),
    CONSTRAINT flash_sales_end_date_check CHECK ((end_date > start_date))
);

-- Add comments to the table and columns for clarity
COMMENT ON TABLE public.flash_sales IS 'Stores details about promotional flash sales for products.';
COMMENT ON COLUMN public.flash_sales.stock_cap IS 'Optional limit on how many units can be sold during the sale.';
COMMENT ON COLUMN public.flash_sales.sales_count IS 'Tracks how many items have been sold during this sale.';


-- Enable Row Level Security (RLS) on the new table
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;

-- POLICIES for flash_sales table

-- 1. Public Read-Access Policy: Anyone can view active flash sales.
CREATE POLICY "Public can view active flash sales"
ON public.flash_sales
FOR SELECT
USING (is_active = true AND end_date > now());

-- 2. Admin Full-Access Policy: Admins can do anything.
CREATE POLICY "Admins have full access"
ON public.flash_sales
FOR ALL
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create a function to safely increment the sales_count
CREATE OR REPLACE FUNCTION increment_flash_sale_sales_count(sale_id uuid, increment_by integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.flash_sales
  SET sales_count = sales_count + increment_by
  WHERE id = sale_id;
END;
$$;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION increment_flash_sale_sales_count(uuid, integer) TO authenticated;


-- Add a trigger to automatically update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_flash_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_flash_sales_updated
BEFORE UPDATE ON public.flash_sales
FOR EACH ROW
EXECUTE FUNCTION public.handle_flash_sales_updated_at();
