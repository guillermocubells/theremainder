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
      className={`gap-2 ${className}`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSubscribed ? (
        <BellOff className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
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
