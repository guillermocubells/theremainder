import React, { createContext, useContext, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import { ShoppingCart } from 'lucide-react';

export interface CartItem {
  plantId: string;
  name: string;
  quantity: number;
  maxQuantity: number;
  price: number;
  image?: string;
  containerSize?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity: number }) => void;
  removeFromCart: (plantId: string) => void;
  updateQuantity: (plantId: string, quantity: number) => void;
  getItemQuantity: (plantId: string) => number;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const TAX_RATE = 0.21; // 21% IVA

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const showCartToast = (message: string) => {
    toast.success(
      <div 
        className="flex items-center gap-2 cursor-pointer w-full" 
        onClick={() => setIsCartOpen(true)}
      >
        <span>{message}</span>
      </div>,
      {
        icon: <ShoppingCart className="h-4 w-4" />,
        action: {
          label: "Ver carrito",
          onClick: () => setIsCartOpen(true),
        },
      }
    );
  };

  const addToCart = (newItem: Omit<CartItem, 'quantity'> & { quantity: number }) => {
    setItems(prev => {
      const existing = prev.find(item => item.plantId === newItem.plantId);
      if (existing) {
        const newQuantity = Math.min(existing.quantity + newItem.quantity, newItem.maxQuantity);
        showCartToast(`${newItem.name} actualizado en el carrito (${newQuantity} uds.)`);
        return prev.map(item =>
          item.plantId === newItem.plantId
            ? { ...item, quantity: newQuantity, price: newItem.price, image: newItem.image, containerSize: newItem.containerSize }
            : item
        );
      }
      showCartToast(`${newItem.name} añadido al carrito (${newItem.quantity} uds.)`);
      return [...prev, newItem];
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

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
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
      getTotalPrice,
      clearCart,
      isCartOpen,
      setIsCartOpen
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

export const calculateTax = (totalPrice: number) => {
  return totalPrice - (totalPrice / (1 + TAX_RATE));
};
