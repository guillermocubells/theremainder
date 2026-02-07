import { useTranslation } from 'react-i18next';

const SUGGESTION_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6'] as const;

interface SearchSuggestionsProps {
  currentQuery: string;
  onSelect: (suggestion: string) => void;
}

const SearchSuggestions = ({ currentQuery, onSelect }: SearchSuggestionsProps) => {
  const { t } = useTranslation();

  const suggestions = SUGGESTION_KEYS
    .map(key => t(`searchSuggestions.${key}`))
    .filter(s => !s.toLowerCase().includes(currentQuery.toLowerCase()))
    .slice(0, 3);

  if (!suggestions.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">{t('filters.trySuggestions')}:</span>
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect(suggestion)}
          className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full hover:bg-muted/80 transition-colors"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};

export default SearchSuggestions;
