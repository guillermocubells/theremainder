import { ShoppingCart, Minus, Plus, Trash2 } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/contexts/CartContext";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const CartDrawer = () => {
  const { items, updateQuantity, removeFromCart, getTotalItems, clearCart } = useCart();
  const totalItems = getTotalItems();
  const { t } = useTranslation();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="hover:bg-secondary text-primary relative">
          <ShoppingCart className="h-5 w-5" />
          {totalItems > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive hover:bg-destructive"
            >
              {totalItems > 99 ? "99+" : totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <ShoppingCart className="h-5 w-5" />
            {t('cart.title')}
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 flex flex-col h-[calc(100vh-8rem)]">
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-2">{t('cart.empty')}</p>
              <p className="text-sm text-muted-foreground/70">{t('cart.emptyMessage')}</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {items.map((item) => (
                  <div key={item.plantId} className="bg-secondary/50 rounded-lg p-4 border border-border">
                    <div className="flex justify-between items-start mb-3">
                      <Link 
                        to={`/plant/${item.plantId}`}
                        className="font-medium text-foreground hover:text-primary transition-colors line-clamp-2 flex-1 pr-2"
                      >
                        {item.name}
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                        onClick={() => removeFromCart(item.plantId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.plantId, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.plantId, item.quantity + 1)}
                          disabled={item.quantity >= item.maxQuantity}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        máx. {item.maxQuantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('cart.total')}:</span>
                  <span className="font-bold text-lg text-foreground">{totalItems}</span>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90"
                    size="lg"
                  >
                    {t('cart.checkout')}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full text-muted-foreground"
                    onClick={clearCart}
                  >
                    {t('cart.remove')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
