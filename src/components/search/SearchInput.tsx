import { useState, useRef, useCallback } from "react";
import { Search, MapPin, X } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Plant } from "@/data/plants";
import AutocompleteDropdown from "./AutocompleteDropdown";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  showPostalCodeIndicator?: boolean;
  plants?: Plant[];
}

const SearchInput = ({
  value,
  onChange,
  onClear,
  placeholder,
  showPostalCodeIndicator = false,
  plants = [],
}: SearchInputProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowDropdown(true);
  }, [onChange]);

  const handleFocus = useCallback(() => {
    if (value.trim().length >= 2) setShowDropdown(true);
  }, [value]);

  const handleSelect = useCallback((plant: Plant) => {
    setShowDropdown(false);
    navigate(`/plant/${plant.id}`);
  }, [navigate]);

  const handleClose = useCallback(() => {
    setShowDropdown(false);
  }, []);

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder || t('filters.search')}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        className="pl-10 pr-10 h-10 border-border focus:border-primary focus:ring-primary/20"
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
      />
      {showPostalCodeIndicator && (
        <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary z-10" />
      )}
      {value && !showPostalCodeIndicator && (
        <button
          onClick={() => { onClear(); setShowDropdown(false); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
          aria-label={t('common.clear')}
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Autocomplete dropdown */}
      {plants.length > 0 && (
        <AutocompleteDropdown
          query={value}
          plants={plants}
          visible={showDropdown}
          onClose={handleClose}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
};

export default SearchInput;
