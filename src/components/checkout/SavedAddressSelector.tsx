import { useTranslation } from "react-i18next";
import { useAddresses, Address } from "@/hooks/useAddresses";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Check } from "lucide-react";

interface SavedAddressSelectorProps {
  selectedAddressId: string | null;
  onSelect: (address: Address) => void;
}

const SavedAddressSelector = ({ selectedAddressId, onSelect }: SavedAddressSelectorProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: addresses, isLoading } = useAddresses();

  if (!user || isLoading || !addresses || addresses.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">
        {t("checkout.savedAddresses")}
      </p>
      <div className="grid gap-2">
        {addresses.map((addr) => {
          const isSelected = selectedAddressId === addr.id;
          return (
            <Card
              key={addr.id}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:border-primary/40"
              }`}
              onClick={() => onSelect(addr)}
            >
              <CardContent className="p-3 flex items-start gap-3">
                <div className={`mt-0.5 flex-shrink-0 rounded-full border-2 w-5 h-5 flex items-center justify-center ${
                  isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                }`}>
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-medium text-foreground truncate">
                      {addr.full_name}
                    </span>
                    {addr.is_default && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5" />
                        {t("checkout.defaultAddress")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {addr.street}{addr.apartment ? `, ${addr.apartment}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {addr.postal_code} {addr.city}, {addr.province}
                  </p>
                </div>
                <MapPin className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {t("checkout.orEnterNew")}
      </p>
    </div>
  );
};

export default SavedAddressSelector;
