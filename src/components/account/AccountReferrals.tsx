import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, Gift, Wallet, Clock, Share2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  useReferralCode,
  useWallet,
  useReferralRewards,
  useWalletTransactions,
  useReferralSettings,
} from "@/hooks/useReferral";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";

const statusColors: Record<string, string> = {
  pending: "bg-warning/20 text-warning border-warning/30",
  available: "bg-primary/20 text-primary border-primary/30",
  used: "bg-secondary text-secondary-foreground",
  reversed: "bg-destructive/20 text-destructive border-destructive/30",
  expired: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, Record<string, string>> = {
  es: {
    pending: "Pendiente",
    available: "Disponible",
    used: "Usado",
    reversed: "Revertido",
    expired: "Expirado",
  },
  en: {
    pending: "Pending",
    available: "Available",
    used: "Used",
    reversed: "Reversed",
    expired: "Expired",
  },
};

const AccountReferrals = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "es" ? "es" : "en";
  const dateFnsLocale = lang === "es" ? es : enUS;

  const [copied, setCopied] = useState(false);
  const { data: referralInfo } = useReferralCode();
  const { data: wallet } = useWallet();
  const { data: rewards = [] } = useReferralRewards();
  const { data: transactions = [] } = useWalletTransactions();
  const { data: settings } = useReferralSettings();

  const pendingRewards = rewards.filter((r) => r.status === "pending");
  const approvedRewards = rewards.filter((r) => r.status === "available");
  const totalEarned = rewards
    .filter((r) => r.status === "available" || r.status === "used")
    .reduce((sum, r) => sum + r.rewardAmount, 0);

  const copyLink = async () => {
    if (!referralInfo?.link) return;
    try {
      await navigator.clipboard.writeText(referralInfo.link);
      setCopied(true);
      toast.success(t("referral.linkCopied", "Enlace copiado"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("referral.copyError", "No se pudo copiar"));
    }
  };

  const shareWhatsApp = () => {
    if (!referralInfo?.link) return;
    const text =
      lang === "es"
        ? `¡Descubre Frondaprima! Plantas exóticas seleccionadas en altitud. Usa mi enlace: ${referralInfo.link}`
        : `Discover Frondaprima! Exotic plants selected at altitude. Use my link: ${referralInfo.link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareEmail = () => {
    if (!referralInfo?.link) return;
    const subject =
      lang === "es"
        ? "Te recomiendo Frondaprima"
        : "I recommend Frondaprima";
    const body =
      lang === "es"
        ? `¡Hola! Te recomiendo Frondaprima, una tienda de plantas exóticas de altitud. Usa mi enlace para tu primera compra: ${referralInfo.link}`
        : `Hi! I recommend Frondaprima, an exotic altitude plant shop. Use my link for your first purchase: ${referralInfo.link}`;
    window.open(
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">
          {t("referral.title", "Programa de Referidos")}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {t(
            "referral.subtitle",
            "Comparte Frondaprima y gana crédito en futuras compras"
          )}
        </p>
      </div>

      {/* Referral Code & Share */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            {t("referral.yourCode", "Tu código de referido")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {referralInfo ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-lg tracking-wider text-center font-semibold text-foreground">
                  {referralInfo.code}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyLink}
                  className="h-12 w-12 shrink-0"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-primary" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyLink}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  {t("referral.copyLink", "Copiar enlace")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={shareWhatsApp}
                  className="gap-2 hover:bg-[#25D366]/10 hover:text-[#25D366] hover:border-[#25D366]/30"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={shareEmail}
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                {t(
                  "referral.howItWorks",
                  `Comparte tu enlace con amigos. Cuando hagan su primera compra (mín. ${settings?.capEur ? `${settings.capEur}€` : "25€"}), recibirás un ${settings?.rewardPercentage || 5}% en crédito (máx. ${settings?.capEur || 20}€).`
                )}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t("referral.loading", "Cargando tu código...")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Wallet Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              {t("referral.availableBalance", "Saldo disponible")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {(wallet?.availableBalance || 0).toFixed(2)} €
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t("referral.pendingBalance", "Pendiente de validar")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">
              {(wallet?.pendingBalance || 0).toFixed(2)} €
            </p>
            {pendingRewards.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("referral.pendingNote", "Se valida en {{days}} días", {
                  days: settings?.pendingDays || 14,
                })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Gift className="h-4 w-4" />
              {t("referral.totalEarned", "Total ganado")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {totalEarned.toFixed(2)} €
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {rewards.length}{" "}
              {t("referral.referralsCount", "referidos")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rewards History */}
      {rewards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("referral.rewardHistory", "Historial de recompensas")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rewards.slice(0, 10).map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[reward.status] || ""}>
                        {statusLabels[lang]?.[reward.status] || reward.status}
                      </Badge>
                      {reward.capApplied && (
                        <span className="text-xs text-muted-foreground">
                          ({t("referral.capApplied", "tope aplicado")})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(reward.createdAt), "d MMM yyyy", {
                        locale: dateFnsLocale,
                      })}
                      {reward.maturesAt && reward.status === "pending" && (
                        <>
                          {" · "}
                          {t("referral.maturesOn", "Disponible")}{" "}
                          {format(new Date(reward.maturesAt), "d MMM", {
                            locale: dateFnsLocale,
                          })}
                        </>
                      )}
                    </p>
                  </div>
                  <span className="font-semibold text-foreground">
                    +{reward.rewardAmount.toFixed(2)} €
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet Transactions */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("referral.walletHistory", "Movimientos del monedero")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transactions.slice(0, 10).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2 text-sm"
                >
                  <div>
                    <p className="text-foreground">
                      {tx.description ||
                        (tx.type === "credit"
                          ? t("referral.txCredit", "Crédito recibido")
                          : t("referral.txDebit", "Crédito utilizado"))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.createdAt), "d MMM yyyy HH:mm", {
                        locale: dateFnsLocale,
                      })}
                    </p>
                  </div>
                  <span
                    className={`font-medium ${
                      tx.type === "credit" ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {tx.type === "credit" ? "+" : "-"}
                    {tx.amount.toFixed(2)} €
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AccountReferrals;
