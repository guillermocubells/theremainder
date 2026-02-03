import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const useStockNotification = (plantId: string) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && plantId) {
      checkSubscription();
    } else {
      setIsSubscribed(false);
    }
  }, [user, plantId]);

  const checkSubscription = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("stock_notifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("plant_id", plantId)
      .maybeSingle();

    if (!error && data) {
      setIsSubscribed(true);
    }
  };

  const subscribe = async () => {
    if (!user) {
      toast.error(t("stockNotification.loginRequired"));
      return false;
    }

    setIsLoading(true);
    
    const { error } = await supabase
      .from("stock_notifications")
      .insert({
        user_id: user.id,
        plant_id: plantId,
        email: user.email || "",
      });

    setIsLoading(false);

    if (error) {
      if (error.code === "23505") {
        // Already subscribed
        setIsSubscribed(true);
        return true;
      }
      console.error("Error subscribing:", error);
      toast.error(t("stockNotification.error"));
      return false;
    }

    setIsSubscribed(true);
    toast.success(t("stockNotification.subscribed"));
    return true;
  };

  const unsubscribe = async () => {
    if (!user) return false;

    setIsLoading(true);

    const { error } = await supabase
      .from("stock_notifications")
      .delete()
      .eq("user_id", user.id)
      .eq("plant_id", plantId);

    setIsLoading(false);

    if (error) {
      console.error("Error unsubscribing:", error);
      toast.error(t("stockNotification.error"));
      return false;
    }

    setIsSubscribed(false);
    toast.success(t("stockNotification.unsubscribed"));
    return true;
  };

  return {
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    isAuthenticated: !!user,
  };
};
