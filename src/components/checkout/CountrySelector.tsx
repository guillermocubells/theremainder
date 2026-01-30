import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ALLOWED_COUNTRIES, COUNTRY_NAMES } from "@/utils/shippingCalculator";

interface CountrySelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function CountrySelector({ value, onChange, error }: CountrySelectorProps) {
  const { t } = useTranslation();

  // Sort countries by name
  const sortedCountries = [...ALLOWED_COUNTRIES].sort((a, b) => {
    const nameA = COUNTRY_NAMES[a] || a;
    const nameB = COUNTRY_NAMES[b] || b;
    return nameA.localeCompare(nameB, "es");
  });

  return (
    <div className="space-y-2">
      <Label htmlFor="shipping-country">{t("checkout.shippingCountry")} *</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id="shipping-country"
          className={error ? "border-destructive" : ""}
        >
          <SelectValue placeholder={t("checkout.selectCountry")} />
        </SelectTrigger>
        <SelectContent>
          {sortedCountries.map((code) => (
            <SelectItem key={code} value={code}>
              {COUNTRY_NAMES[code] || code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
