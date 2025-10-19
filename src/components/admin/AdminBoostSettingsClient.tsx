
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import type { BoostPlan } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';

const boostPlanSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  description: z.string().optional(),
  duration_days: z.coerce.number().int().min(1, "Duration must be at least 1 day."),
  price: z.coerce.number().min(0, "Price cannot be negative."),
  is_active: z.boolean().default(true),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

type BoostPlanFormValues = z.infer<typeof boostPlanSchema>;

const BoostPlanForm = ({ plan, onFinished }: { plan?: BoostPlan, onFinished: () => void }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const form = useForm<BoostPlanFormValues>({
        resolver: zodResolver(boostPlanSchema),
        defaultValues: {
            name: plan?.name || "",
            description: plan?.description || "",
            duration_days: plan?.duration_days || 7,
            price: plan?.price || 0,
            is_active: plan?.is_active ?? true,
            start_date: plan?.start_date ? new Date(plan.start_date).toISOString().slice(0, 16) : "",
            end_date: plan?.end_date ? new Date(plan.end_date).toISOString().slice(0, 16) : "",
        },
    });

    const onSubmit = async (values: BoostPlanFormValues) => {
        setIsSubmitting(true);
        try {
            if (plan) {
                const { error } = await supabase.from('boost_plans').update(values).eq('id', plan.id);
                if (error) throw error;
                toast({ title: "Success", description: "Boost plan updated successfully." });
            } else {
                const { error } = await supabase.from('boost_plans').insert(values);
                if (error) throw error;
                toast({ title: "Success", description: "New boost plan created." });
            }
            onFinished();
        } catch (error: any) {
            toast({ title: "Error", description: `Failed to save boost plan: ${error.message}`, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Plan Name</FormLabel><FormControl><Input placeholder="e.g., Weekly Boost" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="e.g., Feature your product for 7 days." {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="duration_days" render={({ field }) => (
                        <FormItem><FormLabel>Duration (Days)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem><FormLabel>Price (GH₵)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="start_date" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Start Date & Time (Optional)</FormLabel>
                            <FormControl>
                                <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormDescription>When the boost plan becomes active</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="end_date" render={({ field }) => (
                        <FormItem>
                            <FormLabel>End Date & Time (Optional)</FormLabel>
                            <FormControl>
                                <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormDescription>When the boost plan expires</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>
                <FormField control={form.control} name="is_active" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5"><FormLabel>Active</FormLabel><FormDescription>Is this plan available for vendors?</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )}/>
                <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                        Save Plan
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    )
}


export default function AdminBoostSettingsClient({ initialPlans, initialMaxBoosts }: { initialPlans: BoostPlan[], initialMaxBoosts: number }) {
  const [plans, setPlans] = useState<BoostPlan[]>(initialPlans);
  const [maxBoostedProducts, setMaxBoostedProducts] = useState(initialMaxBoosts);
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BoostPlan | undefined>(undefined);
  const [isSavingLimit, setIsSavingLimit] = useState(false);
  const { toast } = useToast();

  const handleUpdateMaxBoosts = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingLimit(true);
    try {
        const { error } = await supabase
            .from('app_settings')
            .upsert({ key: 'max_boosted_products', value: { limit: maxBoostedProducts } }, { onConflict: 'key' });
        if (error) throw error;
        toast({ title: "Setting Saved", description: "The max boosted product limit has been updated." });
    } catch (err: any) {
        toast({ title: "Error", description: `Failed to update limit: ${err.message}`, variant: "destructive" });
    } finally {
      setIsSavingLimit(false);
    }
  };

  const handleDeletePlan = async (planId: number) => {
    try {
        const { error } = await supabase.from('boost_plans').delete().eq('id', planId);
        if (error) throw error;
        setPlans(prev => prev.filter(p => p.id !== planId));
        toast({ title: "Success", description: "Boost plan deleted." });
    } catch(err: any) {
        toast({ title: "Error", description: `Failed to delete plan: ${err.message}`, variant: "destructive" });
    }
  }

  const handleFormFinished = () => {
    // Refetch plans from the server to get the latest state
    supabase.from('boost_plans').select('*').order('price').then(({ data, error }) => {
        if (error) {
            toast({ title: "Error", description: `Could not refresh plans: ${error.message}`, variant: "destructive" });
        } else {
            setPlans(data || []);
        }
    });
    setIsPlanFormOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg md:text-xl">Global Boost Limit</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Set the maximum number of products that can be boosted site-wide at one time.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleUpdateMaxBoosts} className="flex flex-col sm:flex-row items-start sm:items-end gap-3 sm:gap-4">
                <div className="flex-grow w-full sm:w-auto">
                    <Label htmlFor="max-boosts" className="text-sm">Max Boosted Products</Label>
                    <Input 
                        id="max-boosts" 
                        type="number"
                        value={maxBoostedProducts}
                        onChange={(e) => setMaxBoostedProducts(parseInt(e.target.value, 10) || 0)}
                        className="max-w-xs w-full"
                    />
                </div>
                <Button type="submit" disabled={isSavingLimit} size="sm" className="w-full sm:w-auto">
                  {isSavingLimit && <Spinner className="mr-2 h-4 w-4" />}
                  Save Limit
                </Button>
            </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex-1">
                <CardTitle className="text-base sm:text-lg md:text-xl">Boost Pricing Plans</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Manage the pricing plans vendors can choose from to boost their products.</CardDescription>
            </div>
             <Dialog open={isPlanFormOpen} onOpenChange={setIsPlanFormOpen}>
                <DialogTrigger asChild>
                    <Button onClick={() => setEditingPlan(undefined)} size="sm" className="w-full sm:w-auto">
                      <PlusCircle className="mr-2 h-4 w-4"/>
                      <span className="hidden sm:inline">Add Plan</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingPlan ? 'Edit' : 'Add'} Boost Plan</DialogTitle>
                    </DialogHeader>
                    <BoostPlanForm plan={editingPlan} onFinished={handleFormFinished} />
                </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan Name</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length > 0 ? (
                plans.map(plan => (
                    <TableRow key={plan.id}>
                       <TableCell className="font-medium">{plan.name}</TableCell>
                       <TableCell>{plan.duration_days} days</TableCell>
                       <TableCell>GH₵{plan.price}</TableCell>
                       <TableCell className="text-center">
                            <Badge variant={plan.is_active ? 'secondary' : 'outline'} className="flex items-center gap-1 w-fit mx-auto">
                                {plan.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                                {plan.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                       </TableCell>
                       <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" size="icon" onClick={() => { setEditingPlan(plan); setIsPlanFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                <Button variant="destructive" size="icon" onClick={() => handleDeletePlan(plan.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                       </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">No boost plans created yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 p-4">
            {plans.length > 0 ? (
              plans.map(plan => (
                <Card key={plan.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{plan.name}</h3>
                        {plan.description && (
                          <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                        )}
                      </div>
                      <Badge variant={plan.is_active ? 'secondary' : 'outline'} className="flex items-center gap-1 text-xs">
                        {plan.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium">{plan.duration_days} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-medium">GH₵{plan.price}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => { setEditingPlan(plan); setIsPlanFormOpen(true); }}
                      >
                        <Edit className="mr-1 h-3 w-3"/> Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleDeletePlan(plan.id)}
                      >
                        <Trash2 className="mr-1 h-3 w-3"/> Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No boost plans created yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
