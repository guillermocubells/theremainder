import { useCurrency } from "@/contexts/CurrencyContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CURRENCY_LABELS: Record<string, string> = {
  EUR: "€ EUR",
  USD: "$ USD",
  GBP: "£ GBP",
  CHF: "CHF",
  SEK: "kr SEK",
  NOK: "kr NOK",
  DKK: "kr DKK",
  PLN: "zł PLN",
  CZK: "Kč CZK",
  JPY: "¥ JPY",
  CAD: "CA$ CAD",
  AUD: "A$ AUD",
};

const CURRENCY_FLAGS: Record<string, string> = {
  EUR: "🇪🇺",
  USD: "🇺🇸",
  GBP: "🇬🇧",
  CHF: "🇨🇭",
  SEK: "🇸🇪",
  NOK: "🇳🇴",
  DKK: "🇩🇰",
  PLN: "🇵🇱",
  CZK: "🇨🇿",
  JPY: "🇯🇵",
  CAD: "🇨🇦",
  AUD: "🇦🇺",
};

export function CurrencySelector() {
  const { currency, setCurrency, availableCurrencies } = useCurrency();

  if (availableCurrencies.length <= 1) return null;

  return (
    <Select value={currency} onValueChange={setCurrency}>
      <SelectTrigger className="w-auto min-w-[90px] h-8 text-xs gap-1 border-border/50 bg-transparent hover:bg-muted/50 transition-colors">
        <SelectValue>
          <span className="flex items-center gap-1">
            <span>{CURRENCY_FLAGS[currency] || ""}</span>
            <span className="font-medium">{currency}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {availableCurrencies.map((code) => (
          <SelectItem key={code} value={code} className="text-sm">
            <span className="flex items-center gap-2">
              <span>{CURRENCY_FLAGS[code] || "💱"}</span>
              <span>{CURRENCY_LABELS[code] || code}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
