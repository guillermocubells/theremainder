import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, Smartphone, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface NotificationPrefs {
  email_enabled: boolean;
  push_enabled: boolean;
  notify_outbid: boolean;
  notify_auction_starting: boolean;
  notify_auction_ending: boolean;
  notify_auction_won: boolean;
  notify_auction_lost: boolean;
  notify_new_bid_seller: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  email_enabled: true,
  push_enabled: false,
  notify_outbid: true,
  notify_auction_starting: true,
  notify_auction_ending: true,
  notify_auction_won: true,
  notify_auction_lost: true,
  notify_new_bid_seller: true,
};

const AccountNotifications = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  useEffect(() => {
    setPushSupported("serviceWorker" in navigator && "PushManager" in window);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadPrefs();
    checkPushSubscription();
  }, [user]);

  const loadPrefs = async () => {
    const { data } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (data) {
      setPrefs({
        email_enabled: data.email_enabled,
        push_enabled: data.push_enabled,
        notify_outbid: (data as Record<string, unknown>).notify_outbid as boolean ?? true,
        notify_auction_starting: (data as Record<string, unknown>).notify_auction_starting as boolean ?? true,
        notify_auction_ending: (data as Record<string, unknown>).notify_auction_ending as boolean ?? true,
        notify_auction_won: (data as Record<string, unknown>).notify_auction_won as boolean ?? true,
        notify_auction_lost: (data as Record<string, unknown>).notify_auction_lost as boolean ?? true,
        notify_new_bid_seller: (data as Record<string, unknown>).notify_new_bid_seller as boolean ?? true,
      });
    }
    setLoading(false);
  };

  const checkPushSubscription = async () => {
    if (!("serviceWorker" in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const pm = (reg as unknown as { pushManager: { getSubscription: () => Promise<PushSubscription | null> } }).pushManager;
      const sub = await pm.getSubscription();
      setPushSubscribed(!!sub);
    } catch {
      // Push not available
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const row = {
      user_id: user.id,
      email_enabled: prefs.email_enabled,
      push_enabled: prefs.push_enabled,
      notify_outbid: prefs.notify_outbid,
      notify_auction_starting: prefs.notify_auction_starting,
      notify_auction_ending: prefs.notify_auction_ending,
      notify_auction_won: prefs.notify_auction_won,
      notify_auction_lost: prefs.notify_auction_lost,
      notify_new_bid_seller: prefs.notify_new_bid_seller,
    };

    const { error } = await supabase
      .from("notification_preferences")
      .upsert(row, { onConflict: "user_id" });

    setSaving(false);
    if (error) {
      toast.error(t("account.notifications.saveError", "Error al guardar preferencias"));
    } else {
      toast.success(t("account.notifications.saved", "Preferencias guardadas"));
    }
  };

  const update = (key: keyof NotificationPrefs, value: boolean) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  };

  const togglePush = async () => {
    if (!pushSupported) return;
    try {
      if (pushSubscribed) {
        const reg = await navigator.serviceWorker.ready;
        const pm = (reg as unknown as { pushManager: { getSubscription: () => Promise<PushSubscription | null> } }).pushManager;
        const sub = await pm.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await supabase.from("push_subscriptions").delete().eq("user_id", user!.id).eq("endpoint", sub.endpoint);
        }
        setPushSubscribed(false);
        update("push_enabled", false);
        toast.success(t("account.notifications.pushDisabled", "Notificaciones push desactivadas"));
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error(t("account.notifications.pushDenied", "Permiso de notificaciones denegado"));
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const pm = (reg as unknown as { pushManager: { subscribe: (opts: { userVisibleOnly: boolean; applicationServerKey?: undefined }) => Promise<PushSubscription> } }).pushManager;
        const sub = await pm.subscribe({
          userVisibleOnly: true,
          applicationServerKey: undefined,
        });
        const keys = sub.toJSON().keys || {};
        await supabase.from("push_subscriptions").upsert({
          user_id: user!.id,
          endpoint: sub.endpoint,
          p256dh: keys.p256dh || "",
          auth: keys.auth || "",
          user_agent: navigator.userAgent,
        }, { onConflict: "user_id,endpoint" });
        setPushSubscribed(true);
        update("push_enabled", true);
        toast.success(t("account.notifications.pushEnabled", "Notificaciones push activadas"));
      }
    } catch (err) {
      console.error("Push toggle error:", err);
      toast.error(t("account.notifications.pushError", "Error al configurar notificaciones push"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const auctionPrefs: { key: keyof NotificationPrefs; label: string; desc: string }[] = [
    { key: "notify_outbid", label: t("account.notifications.outbid", "Superado en puja"), desc: t("account.notifications.outbidDesc", "Cuando alguien supere tu puja") },
    { key: "notify_auction_starting", label: t("account.notifications.auctionStarting", "Subasta a punto de empezar"), desc: t("account.notifications.auctionStartingDesc", "Recordatorio antes del inicio") },
    { key: "notify_auction_ending", label: t("account.notifications.auctionEnding", "Subasta a punto de terminar"), desc: t("account.notifications.auctionEndingDesc", "Aviso antes del cierre") },
    { key: "notify_auction_won", label: t("account.notifications.auctionWon", "Subasta ganada"), desc: t("account.notifications.auctionWonDesc", "Confirmación de puja ganadora") },
    { key: "notify_auction_lost", label: t("account.notifications.auctionLost", "Subasta no ganada"), desc: t("account.notifications.auctionLostDesc", "Aviso cuando no ganes una subasta") },
    { key: "notify_new_bid_seller", label: t("account.notifications.newBidSeller", "Nueva puja (vendedor)"), desc: t("account.notifications.newBidSellerDesc", "Cuando pujen en tu subasta") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          {t("account.notifications.title", "Notificaciones")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("account.notifications.subtitle", "Configura cómo quieres recibir avisos de subastas y actividad.")}
        </p>
      </div>

      {/* Channels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("account.notifications.channels", "Canales de notificación")}</CardTitle>
          <CardDescription>{t("account.notifications.channelsDesc", "Elige cómo recibir tus notificaciones")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">{t("account.notifications.email", "Email")}</Label>
                <p className="text-xs text-muted-foreground">{t("account.notifications.emailDesc", "Recibir notificaciones por correo electrónico")}</p>
              </div>
            </div>
            <Switch checked={prefs.email_enabled} onCheckedChange={v => update("email_enabled", v)} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">{t("account.notifications.push", "Push (navegador)")}</Label>
                <p className="text-xs text-muted-foreground">
                  {pushSupported
                    ? t("account.notifications.pushDesc", "Notificaciones del navegador en tiempo real")
                    : t("account.notifications.pushNotSupported", "Tu navegador no soporta notificaciones push")}
                </p>
              </div>
            </div>
            <Switch
              checked={pushSubscribed}
              onCheckedChange={togglePush}
              disabled={!pushSupported}
            />
          </div>
        </CardContent>
      </Card>

      {/* Auction notification types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {t("account.notifications.auctionEvents", "Eventos de subastas")}
          </CardTitle>
          <CardDescription>{t("account.notifications.auctionEventsDesc", "Selecciona qué eventos quieres recibir")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {auctionPrefs.map((pref, i) => (
            <div key={pref.key}>
              {i > 0 && <Separator className="mb-3" />}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">{pref.label}</Label>
                  <p className="text-xs text-muted-foreground">{pref.desc}</p>
                </div>
                <Switch
                  checked={prefs[pref.key] as boolean}
                  onCheckedChange={v => update(pref.key, v)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {t("account.notifications.save", "Guardar preferencias")}
      </Button>
    </div>
  );
};

export default AccountNotifications;
