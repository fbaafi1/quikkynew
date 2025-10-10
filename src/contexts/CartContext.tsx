
"use client";

import type { CartItem, Product } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/contexts/UserContext'; // To get currentUser
import { useToast } from '@/hooks/use-toast';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  cartTotal: number;
  itemCount: number;
  isLoadingCart: boolean;
  fetchUserCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoadingCart, setIsLoadingCart] = useState(true);
  const { currentUser, loadingUser: loadingAuthUser } = useUser();
  const { toast } = useToast();

  const fetchUserCart = useCallback(async () => {
    if (!currentUser || !currentUser.id) {
      setCartItems([]);
      setIsLoadingCart(false);
      return;
    }
    setIsLoadingCart(true);
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id, quantity, product_id,
          products (
            id, name, description, price, images, category_id, stock, vendor_id, vendors(id, store_name)
          )
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: true });


      if (error) throw error;

      if (data) {
        const loadedCartItems: CartItem[] = data
          .filter((item: any) => {
            if (!item.products) {
              console.warn(`Cart item (cart_item id: ${item.id}, product_id: ${item.product_id}) is missing joined product details. This might be due to a deleted product or RLS. Skipping.`);
              return false;
            }
            return true;
          })
          .map((item: any) => {
            const productData = item.products!;
            return {
              id: productData.id,
              name: productData.name,
              description: productData.description,
              price: productData.price,
              images: productData.images || [],
              categoryId: productData.category_id,
              stock: productData.stock,
              quantity: item.quantity,
              vendor_id: productData.vendor_id,
              vendors: productData.vendors,
            } as CartItem;
          });
        setCartItems(loadedCartItems);
      } else {
        setCartItems([]);
      }
    } catch (error: any) {
      console.error("Failed to fetch user cart:", error);
      setCartItems([]);
    } finally {
      setIsLoadingCart(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!loadingAuthUser) {
      if (currentUser) {
        fetchUserCart();
      } else {
        setCartItems([]);
        setIsLoadingCart(false);
      }
    }
  }, [currentUser, loadingAuthUser, fetchUserCart]);


  const addToCart = async (product: Product, quantity: number = 1) => {
    if (!currentUser || !currentUser.id) {
      toast({ title: "Login Required", description: "Please log in to add items to your cart.", variant: "destructive" });
      return;
    }
    if (quantity <= 0) return;

    setIsLoadingCart(true);
    try {
      const { data: existingCartItem, error: fetchError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', currentUser.id)
        .eq('product_id', product.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }
      
      let newQuantity = quantity;
      const currentStock = product.stock;

      if (existingCartItem) {
        newQuantity = existingCartItem.quantity + quantity;
        if (typeof currentStock === 'number' && newQuantity > currentStock) {
          newQuantity = currentStock;
          toast({ title: "Stock Limit Reached", description: `Max ${currentStock} of ${product.name} can be added.` });
        }
        if (newQuantity <= 0) {
            await removeFromCart(product.id);
            return;
        }
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
          .eq('id', existingCartItem.id);
        if (updateError) throw updateError;

      } else {
        if (typeof currentStock === 'number' && newQuantity > currentStock) {
          newQuantity = currentStock;
           toast({ title: "Stock Limit Reached", description: `Cannot add more than ${currentStock} of ${product.name} to cart.` });
        }
         if (newQuantity <= 0 && currentStock === 0) {
            toast({ title: "Out of Stock", description: `${product.name} is out of stock.`, variant: "destructive" });
            setIsLoadingCart(false);
            return;
        }
         if (newQuantity <= 0) {
             setIsLoadingCart(false);
             return;
         }

        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({ user_id: currentUser.id, product_id: product.id, quantity: newQuantity });
        if (insertError) throw insertError;
      }
      
      await fetchUserCart();
    } catch (error: any) {
      toast({ title: "Error", description: "Could not add item to cart.", variant: "destructive" });
      console.error("Error adding to cart:", error);
    } finally {
      setIsLoadingCart(false);
    }
  };

  const removeFromCart = async (productId: string) => {
    if (!currentUser || !currentUser.id) return;
    
    // Optimistic UI update
    const originalCart = [...cartItems];
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
    
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('product_id', productId);
      if (error) throw error;
    } catch (error: any) {
      console.error("Error removing from cart:", error);
      setCartItems(originalCart); // Revert on failure
      toast({ title: "Error", description: "Could not remove item from cart.", variant: "destructive" });
    }
  };

  const updateQuantity = async (productId: string, newQuantityInput: number) => {
    if (!currentUser || !currentUser.id) return;

    const itemInCart = cartItems.find(item => item.id === productId);
    if (!itemInCart) return;

    let quantityToSet = Math.max(0, newQuantityInput);

    if (typeof itemInCart.stock === 'number' && quantityToSet > itemInCart.stock) {
        quantityToSet = itemInCart.stock;
        toast({ title: "Stock Limit Reached", description: `Only ${itemInCart.stock} of ${itemInCart.name} available.` });
    }

    if (quantityToSet === 0) {
      await removeFromCart(productId);
      return;
    }

    // Optimistic UI Update
    const originalCart = [...cartItems];
    const updatedCart = cartItems.map(item =>
      item.id === productId ? { ...item, quantity: quantityToSet } : item
    );
    setCartItems(updatedCart);

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: quantityToSet, updated_at: new Date().toISOString() })
        .eq('user_id', currentUser.id)
        .eq('product_id', productId);
      if (error) throw error;
    } catch (error: any) {
      console.error("Error updating quantity:", error);
      setCartItems(originalCart); // Revert on failure
      toast({ title: "Error", description: "Could not update item quantity.", variant: "destructive" });
    }
  };

  const clearCart = async () => {
    if (!currentUser || !currentUser.id) return;
    
    const originalCart = [...cartItems];
    setCartItems([]); // Optimistic update
    
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', currentUser.id);
      if (error) throw error;
    } catch (error: any) {
      console.error("Error clearing cart:", error);
      setCartItems(originalCart); // Revert on failure
      toast({ title: "Error", description: "Could not clear cart.", variant: "destructive" });
    }
  };

  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount, isLoadingCart, fetchUserCart }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
