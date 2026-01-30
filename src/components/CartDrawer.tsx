import { ShoppingCart, Minus, Plus, Trash2, Check, Truck } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useCart, calculateTax } from "@/contexts/CartContext";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

const CartDrawer = () => {
  const { items, updateQuantity, removeFromCart, getTotalItems, getTotalPrice, clearCart } = useCart();
  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();
  const taxAmount = calculateTax(totalPrice);
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
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <ShoppingCart className="h-5 w-5" />
            {t('cart.title')}
            {totalItems > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({totalItems} {totalItems === 1 ? t('cart.item') : t('cart.items')})
              </span>
            )}
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-2">{t('cart.empty')}</p>
              <p className="text-sm text-muted-foreground/70">{t('cart.emptyMessage')}</p>
            </div>
          ) : (
            <>
              {/* Products list */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                {items.map((item) => (
                  <div key={item.plantId} className="flex gap-4">
                    {/* Product image */}
                    <Link 
                      to={`/plant/${item.plantId}`}
                      className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 bg-muted rounded-lg overflow-hidden"
                    >
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-secondary">
                          <ShoppingCart className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </Link>

                    {/* Product details */}
                    <div className="flex-1 min-w-0">
                      <Link 
                        to={`/plant/${item.plantId}`}
                        className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 italic"
                      >
                        {item.name}
                      </Link>
                      
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {item.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                      </p>

                      {item.containerSize && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="text-foreground/70">{t('cart.container')}:</span>{' '}
                          <span className="text-moss font-medium">{item.containerSize}</span>
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.plantId, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.plantId, item.quantity + 1)}
                            disabled={item.quantity >= item.maxQuantity}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeFromCart(item.plantId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary section */}
              <div className="border-t border-border pt-4 space-y-3">
                {/* Subtotal */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{t('cart.subtotal')}:</span>
                  <span className="font-medium text-foreground">
                    {totalPrice.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>

                {/* Shipping */}
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-moss" />
                  <span className="text-moss italic">{t('cart.shippingTbd')}</span>
                </div>

                <Separator className="my-2" />

                {/* Total */}
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">{t('cart.totalWithTax')}:</span>
                  <span className="font-bold text-lg text-foreground">
                    {totalPrice.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>

                {/* Included taxes */}
                <p className="text-xs text-muted-foreground">
                  {t('cart.includedTaxes')}:{' '}
                  <span className="font-medium">
                    {taxAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                  </span>
                </p>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <SheetClose asChild>
                    <Button 
                      variant="default"
                      className="flex-1 bg-moss hover:bg-moss/90 text-white"
                    >
                      {t('cart.continueShopping')}
                    </Button>
                  </SheetClose>
                  <Button 
                    className="flex-1 bg-foreground hover:bg-foreground/90 text-background"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {t('cart.checkout')}
                  </Button>
                </div>

                {/* Clear cart link */}
                <button
                  onClick={clearCart}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 pt-1"
                >
                  {t('cart.remove')}
                </button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
