import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStockNotification } from "@/hooks/useStockNotification";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface StockNotificationButtonProps {
  plantId: string;
  className?: string;
}

const StockNotificationButton = ({ plantId, className = "" }: StockNotificationButtonProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isSubscribed, isLoading, subscribe, unsubscribe, isAuthenticated } = useStockNotification(plantId);

  const handleClick = async () => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }

    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <Button
      variant={isSubscribed ? "secondary" : "default"}
      onClick={handleClick}
      disabled={isLoading}
      size="lg"
      className={`gap-2 text-sm sm:text-base px-6 sm:px-8 ${isSubscribed ? "" : "bg-rose-600 hover:bg-rose-700 text-white"} ${className}`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
      ) : isSubscribed ? (
        <BellOff className="h-4 w-4 sm:h-5 sm:w-5" />
      ) : (
        <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
      )}
      <span>
        {isSubscribed 
          ? t("stockNotification.cancelNotification")
          : t("stockNotification.notifyMe")
        }
      </span>
    </Button>
  );
};

export default StockNotificationButton;
