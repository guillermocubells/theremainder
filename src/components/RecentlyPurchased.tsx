import { useTranslation } from "react-i18next";
import { ShoppingBag, MapPin } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { Plant } from "@/data/plants";
import { useRecentPurchases, type RecentPurchase } from "@/hooks/useRecentPurchases";

interface RecentlyPurchasedProps {
  currentPlant: Plant;
  maxItems?: number;
}

function formatRelativeTime(hoursAgo: number): string {
  if (hoursAgo < 1) return "Hace un momento";
  if (hoursAgo === 1) return "Hace 1 hora";
  if (hoursAgo < 24) return `Hace ${hoursAgo} horas`;
  const days = Math.floor(hoursAgo / 24);
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}

function PurchaseItem({ purchase }: { purchase: RecentPurchase }) {
  const { t } = useTranslation();
  const timeStr = formatRelativeTime(purchase.hoursAgo);

  const sentence =
    purchase.quantity > 1
      ? `${purchase.quantity} ${t("recentPurchases.unitsBought", "uds. compradas")} ${timeStr.toLowerCase()}`
      : `${t("recentPurchases.someonePurchased", "Comprado")} ${timeStr.toLowerCase()}`;

  return (
    <div className="flex items-center gap-3 min-w-[260px] max-w-[320px] bg-card/60 border border-border/40 rounded-lg p-3 flex-shrink-0">
      {/* Thumbnail */}
      {purchase.productImage && (
        <div className="h-10 w-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
          <img
            src={purchase.productImage}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            aria-hidden="true"
          />
        </div>
      )}

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm text-foreground/80 leading-snug line-clamp-2">
          {sentence}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {purchase.city}
          </span>
        </div>
      </div>
    </div>
  );
}

const RecentlyPurchased = ({ currentPlant, maxItems = 5 }: RecentlyPurchasedProps) => {
  const { t } = useTranslation();
  const purchases = useRecentPurchases(currentPlant, maxItems);

  if (purchases.length === 0) return null;

  return (
    <section className="mt-8 sm:mt-12" aria-label={t("recentPurchases.title", "Compras recientes")}>
      <div className="flex items-center gap-2 mb-4 sm:mb-5">
        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm sm:text-base font-semibold text-foreground">
          {t("recentPurchases.title", "Compras recientes")}
        </h2>
      </div>

      <ScrollArea className="w-full" type="scroll">
        <div className="flex gap-3 pb-3" role="list">
          {purchases.map((p) => (
            <div key={p.id} role="listitem">
              <PurchaseItem purchase={p} />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
};

export default RecentlyPurchased;
