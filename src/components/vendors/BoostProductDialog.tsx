'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';
import { toast } from 'sonner';

export interface BoostPlan {
  id: number;
  name: string;
  description?: string | null;
  duration_days: number;
  price: number;
  is_active: boolean;
  created_at?: string;
}

interface BoostProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  boostPlans: BoostPlan[];
  onBoostRequested?: () => void;
}

export function BoostProductDialog({
  open,
  onOpenChange,
  productId,
  productName,
  boostPlans = [],
  onBoostRequested,
}: BoostProductDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBoost = async () => {
    if (!selectedPlan) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/vendor/products/boost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          planId: selectedPlan,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to request boost');
      }

      toast.success('Boost requested successfully!');
      onOpenChange(false);
      onBoostRequested?.();
    } catch (error) {
      toast.error('Failed to request boost. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Rocket className="h-6 w-6 text-primary" />
            <DialogTitle>Boost Product Visibility</DialogTitle>
          </div>
          <DialogDescription>
            Select a boost plan to increase visibility for <span className="font-medium">{productName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {boostPlans && boostPlans.length > 0 ? (
            boostPlans.map((plan) => (
              <div
                key={plan.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedPlan === plan.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">GH₵{plan.price.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{plan.duration_days} days</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No boost plans available at the moment.</p>
              <p className="text-xs mt-2">Please contact the administrator to set up boost plans.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleBoost} 
            disabled={!selectedPlan || isSubmitting}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isSubmitting ? 'Processing...' : 'Request Boost'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
