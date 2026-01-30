import React, { createContext, useContext, useState, ReactNode } from 'react';
import { toast } from 'sonner';

export interface CartItem {
  plantId: string;
  name: string;
  quantity: number;
  maxQuantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (plantId: string, name: string, quantity: number, maxQuantity: number) => void;
  removeFromCart: (plantId: string) => void;
  updateQuantity: (plantId: string, quantity: number) => void;
  getItemQuantity: (plantId: string) => number;
  getTotalItems: () => number;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = (plantId: string, name: string, quantity: number, maxQuantity: number) => {
    setItems(prev => {
      const existing = prev.find(item => item.plantId === plantId);
      if (existing) {
        const newQuantity = Math.min(existing.quantity + quantity, maxQuantity);
        toast.success(`${name} actualizado en el carrito (${newQuantity} uds.)`);
        return prev.map(item =>
          item.plantId === plantId
            ? { ...item, quantity: newQuantity }
            : item
        );
      }
      toast.success(`${name} añadido al carrito (${quantity} uds.)`);
      return [...prev, { plantId, name, quantity, maxQuantity }];
    });
  };

  const removeFromCart = (plantId: string) => {
    setItems(prev => prev.filter(item => item.plantId !== plantId));
  };

  const updateQuantity = (plantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(plantId);
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.plantId === plantId
          ? { ...item, quantity: Math.min(quantity, item.maxQuantity) }
          : item
      )
    );
  };

  const getItemQuantity = (plantId: string) => {
    return items.find(item => item.plantId === plantId)?.quantity || 0;
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const clearCart = () => {
    setItems([]);
  };

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      getItemQuantity,
      getTotalItems,
      clearCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
