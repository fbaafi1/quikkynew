-- Create a new ENUM type for the discount type
create type "public"."discount_type" as enum ('percentage', 'fixed_amount');

-- Create the flash_sales table
create table "public"."flash_sales" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "product_id" uuid not null,
    "discount_type" public.discount_type not null,
    "discount_value" real not null,
    "start_date" timestamp with time zone not null,
    "end_date" timestamp with time zone not null,
    "is_active" boolean not null default true,
    "stock_cap" integer,
    "sales_count" integer not null default 0,
    "updated_at" timestamp with time zone not null default now()
);

-- Add comments to the columns
comment on column "public"."flash_sales"."stock_cap" is 'Optional: limit the sale to the first X items sold.';
comment on column "public"."flash_sales"."sales_count" is 'Tracks how many items have been sold in this sale.';

-- Create Primary Key constraint
alter table "public"."flash_sales" add constraint "flash_sales_pkey" primary key ("id");

-- Add Foreign Key constraint to products table
alter table "public"."flash_sales" add constraint "flash_sales_product_id_fkey" foreign key ("product_id") references "public"."products"("id") on delete cascade;

-- Create indexes for performance
create index "idx_flash_sales_active_period" on "public"."flash_sales" using btree ("start_date", "end_date", "is_active");
create index "idx_flash_sales_product_id" on "public"."flash_sales" using btree ("product_id");

-- Create a function to update the sales_count safely
create or replace function public.increment_flash_sale_sales_count(sale_id uuid, increment_by int)
returns void as $$
begin
  update public.flash_sales
  set sales_count = sales_count + increment_by
  where id = sale_id;
end;
$$ language plpgsql;

-- ** FIX STARTS HERE: Define the missing is_admin() function **
-- This function checks if the currently authenticated user has the 'admin' role.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;
-- ** FIX ENDS HERE **


-- Policies for 'flash_sales' table
alter table "public"."flash_sales" enable row level security;

create policy "Admins can manage flash sales"
on "public"."flash_sales" for all
to authenticated
using (public.is_admin());

create policy "Users can view active flash sales"
on "public"."flash_sales" for select
to public
using (is_active = true AND start_date <= now() AND end_date >= now());

-- Grant usage on the new enum and execute on function to authenticated users
grant usage on type public.discount_type to authenticated;
grant execute on function public.increment_flash_sale_sales_count(uuid, int) to authenticated;
