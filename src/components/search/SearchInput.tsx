import { Search, MapPin, X } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  showPostalCodeIndicator?: boolean;
}

const SearchInput = ({
  value,
  onChange,
  onClear,
  placeholder,
  showPostalCodeIndicator = false
}: SearchInputProps) => {
  const { t } = useTranslation();

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        type="text"
        placeholder={placeholder || t('filters.search')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-10 h-10 border-border focus:border-primary focus:ring-primary/20"
      />
      {showPostalCodeIndicator && (
        <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
      )}
      {value && !showPostalCodeIndicator && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t('common.clear')}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
