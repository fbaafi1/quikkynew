
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect } from "react";
import type { FlashSale, Product } from "@/lib/types";
import { Loader2, Calendar as CalendarIcon, ChevronsUpDown, Check, Percent, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { Switch } from "../ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

const flashSaleSchema = z.object({
  product_id: z.string({ required_error: "You must select a product." }),
  discount_type: z.enum(['percentage', 'fixed_amount']),
  discount_value: z.coerce.number().positive({ message: "Discount value must be positive." }),
  start_date: z.date({ required_error: "Start date is required." }),
  end_date: z.date({ required_error: "End date is required." }),
  stock_cap: z.coerce.number().int().min(0).optional().nullable(),
  is_active: z.boolean().default(true),
}).refine(data => {
  if (data.discount_type === 'percentage' && (data.discount_value <= 0 || data.discount_value >= 100)) {
    return false;
  }
  return true;
}, {
  message: "Percentage must be between 1 and 99.",
  path: ['discount_value']
}).refine(data => data.end_date > data.start_date, {
  message: "End date must be after the start date.",
  path: ['end_date']
});


type FlashSaleFormValues = z.infer<typeof flashSaleSchema>;

interface FlashSaleFormProps {
  sale?: FlashSale;
}

export default function FlashSaleForm({ sale }: FlashSaleFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isFetchingProducts, setIsFetchingProducts] = useState(true);
  const [productComboboxOpen, setProductComboboxOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!sale;

  const form = useForm<FlashSaleFormValues>({
    resolver: zodResolver(flashSaleSchema),
    defaultValues: {
      product_id: sale?.product_id || "",
      discount_type: sale?.discount_type || 'percentage',
      discount_value: sale?.discount_value || 0,
      start_date: sale ? new Date(sale.start_date) : undefined,
      end_date: sale ? new Date(sale.end_date) : undefined,
      stock_cap: sale?.stock_cap || null,
      is_active: sale?.is_active ?? true,
    },
  });

  const discountType = form.watch('discount_type');

  useEffect(() => {
    const fetchProducts = async () => {
      setIsFetchingProducts(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('name', { ascending: true });
          
        if (error) throw error;

        // Map the data to match the Product type
        const formattedProducts = (data || []).map(product => ({
          ...product,
          // Map any fields that need renaming here
          // For example, if your Product type expects 'categoryId' but your DB has 'category_id':
          categoryId: product.category_id,
          // Ensure all required fields are present
          id: product.id,
          name: product.name || 'Unnamed Product',
          price: product.price || 0,
          description: product.description || '',
          images: product.images || [],
          stock: product.stock || 0
        }));

        setProducts(formattedProducts);
      } catch (err: any) {
        console.error("Failed to fetch products:", err.message);
        setError("Failed to load products. Please try again later.");
      } finally {
        setIsFetchingProducts(false);
      }
    };
    
    fetchProducts();
  }, []);

  async function onSubmit(values: FlashSaleFormValues) {
    setIsLoading(true);
    setError(null);

    const dbPayload = {
      ...values,
      start_date: values.start_date.toISOString(),
      end_date: values.end_date.toISOString(),
    };

    try {
      let error;
      if (isEditing) {
        const { error: updateError } = await supabase
          .from('flash_sales')
          .update(dbPayload)
          .eq('id', sale!.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('flash_sales')
          .insert(dbPayload)
          .select()
          .single();
        error = insertError;
      }

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || 'Failed to save flash sale');
      }

      router.push('/admin/flash-sales');
      router.refresh();
    } catch (err: any) {
      console.error('Error in onSubmit:', err);
      setError(err.message || 'An error occurred while saving the flash sale');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Flash Sale" : "Create New Flash Sale"}</CardTitle>
        <CardDescription>
          Set up a limited-time deal for a specific product.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <FormField
              control={form.control}
              name="product_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Product</FormLabel>
                  <Popover open={productComboboxOpen} onOpenChange={setProductComboboxOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                            disabled={isFetchingProducts}
                          >
                            {isFetchingProducts ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            {field.value
                              ? products.find((p) => p.id === field.value)?.name
                              : "Select a product..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                           <CommandInput placeholder="Search products..." />
                           <CommandList>
                            <CommandEmpty>No products found.</CommandEmpty>
                            <CommandGroup>
                              {products.map((p) => (
                                <CommandItem
                                  value={p.name}
                                  key={p.id}
                                  onSelect={() => {
                                    form.setValue("product_id", p.id);
                                    setProductComboboxOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", p.id === field.value ? "opacity-100" : "opacity-0")}/>
                                  {p.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                           </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discount_type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Discount Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value="percentage" /></FormControl>
                        <FormLabel className="font-normal flex items-center gap-1"><Percent /> Percentage</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value="fixed_amount" /></FormControl>
                        <FormLabel className="font-normal flex items-center gap-1"><FileText /> Fixed Amount</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

             <FormField
              control={form.control}
              name="discount_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Value</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormDescription>
                    {discountType === 'percentage' ? 'Enter a number between 1 and 99.' : 'Enter the amount in GH₵ to subtract from the price.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date & Time</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PP p") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                         <Input type="time" className="border-t" onChange={e => {
                            if (!field.value) return;
                            const [h, m] = e.target.value.split(':');
                            const newDate = new Date(field.value);
                            newDate.setHours(Number(h), Number(m));
                            field.onChange(newDate);
                         }}/>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date & Time</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PP p") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                       <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                         <Input type="time" className="border-t" onChange={e => {
                            if (!field.value) return;
                            const [h, m] = e.target.value.split(':');
                            const newDate = new Date(field.value);
                            newDate.setHours(Number(h), Number(m));
                            field.onChange(newDate);
                         }}/>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="stock_cap"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limited Stock Cap (Optional)</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 50" {...field} value={field.value ?? ''} /></FormControl>
                    <FormDescription>Limit the sale to the first X number of items sold. Leave blank for no limit.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Activate Sale</FormLabel>
                    <FormDescription>If turned off, the sale will not run even if within the date range.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange}/>
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading || isFetchingProducts} className="w-full md:w-auto">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Flash Sale"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
