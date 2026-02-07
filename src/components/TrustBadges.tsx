import { Shield, Truck, Leaf } from "lucide-react";
import { useTranslation } from "react-i18next";

const TrustBadges = () => {
  const { t } = useTranslation();

  const badges = [
    {
      icon: Truck,
      label: t('trust.secureShipping', 'Envío seguro'),
    },
    {
      icon: Leaf,
      label: t('trust.plantGuarantee', 'Planta garantizada'),
    },
    {
      icon: Shield,
      label: t('trust.encryptedPayment', 'Pago cifrado'),
    },
  ];

  return (
    <div className="flex flex-wrap gap-3 sm:gap-4">
      {badges.map((badge) => (
        <div
          key={badge.label}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <badge.icon className="h-3.5 w-3.5 text-primary/70" />
          <span>{badge.label}</span>
        </div>
      ))}
    </div>
  );
};

export default TrustBadges;
