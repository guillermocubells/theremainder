import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { toast } from 'sonner';
import { ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

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
const CART_STORAGE_KEY = 'frondaprima-cart';

// --- localStorage helpers ---

const loadCartFromStorage = (): CartItem[] => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Corrupted data — ignore
  }
  return [];
};

const saveCartToStorage = (items: CartItem[]) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or unavailable — ignore
  }
};

// --- Server helpers ---

const fetchServerCart = async (userId: string): Promise<CartItem[]> => {
  const { data, error } = await supabase
    .from('cart_items')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching server cart:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    plantId: row.plant_id,
    name: row.name,
    quantity: row.quantity,
    maxQuantity: row.max_quantity,
    price: Number(row.price),
    image: row.image ?? undefined,
    containerSize: row.container_size ?? undefined,
  }));
};

const syncCartToServer = async (userId: string, items: CartItem[]) => {
  try {
    // Delete all current items then upsert new ones in one go
    await supabase.from('cart_items').delete().eq('user_id', userId);

    if (items.length > 0) {
      const rows = items.map(item => ({
        user_id: userId,
        plant_id: item.plantId,
        name: item.name,
        quantity: item.quantity,
        max_quantity: item.maxQuantity,
        price: item.price,
        image: item.image ?? null,
        container_size: item.containerSize ?? null,
      }));

      await supabase.from('cart_items').insert(rows);
    }
  } catch (err) {
    console.error('Error syncing cart to server:', err);
  }
};

/** Merge guest (localStorage) items into server items. Guest items win on conflict (fresher intent). */
const mergeCarts = (serverItems: CartItem[], guestItems: CartItem[]): CartItem[] => {
  const merged = new Map<string, CartItem>();

  for (const item of serverItems) {
    merged.set(item.plantId, item);
  }

  for (const item of guestItems) {
    const existing = merged.get(item.plantId);
    if (existing) {
      // Guest quantity adds on top, capped at maxQuantity
      merged.set(item.plantId, {
        ...item,
        quantity: Math.min(existing.quantity + item.quantity, item.maxQuantity),
      });
    } else {
      merged.set(item.plantId, item);
    }
  }

  return Array.from(merged.values());
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>(loadCartFromStorage);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const prevUserIdRef = useRef<string | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Auth change: load server cart & merge guest cart on login ----
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    const previousUserId = prevUserIdRef.current;
    prevUserIdRef.current = currentUserId;

    if (currentUserId && !previousUserId) {
      // User just logged in → merge guest cart with server cart
      (async () => {
        const guestItems = loadCartFromStorage();
        const serverItems = await fetchServerCart(currentUserId);
        const merged = mergeCarts(serverItems, guestItems);

        setItems(merged);
        saveCartToStorage(merged);

        // Persist merged cart to server
        await syncCartToServer(currentUserId, merged);
      })();
    } else if (!currentUserId && previousUserId) {
      // User logged out → keep localStorage cart as-is (items state stays)
    } else if (currentUserId && previousUserId && currentUserId === previousUserId) {
      // Same user on mount – load from server
      (async () => {
        const serverItems = await fetchServerCart(currentUserId);
        if (serverItems.length > 0) {
          setItems(serverItems);
          saveCartToStorage(serverItems);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ---- Persist to localStorage always; debounce server sync ----
  useEffect(() => {
    saveCartToStorage(items);

    if (user?.id) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        syncCartToServer(user.id, items);
      }, 1000); // debounce 1s
    }

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [items, user?.id]);

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

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
    if (user?.id) {
      supabase.from('cart_items').delete().eq('user_id', user.id).then(() => {});
    }
  }, [user?.id]);

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
