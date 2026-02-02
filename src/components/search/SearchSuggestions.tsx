import { useTranslation } from 'react-i18next';

const SEARCH_SUGGESTIONS = [
  "plantas para código postal 28001",
  "palmeras resistentes al frío Madrid",
  "helechos que necesitan poca luz",
  "plantas para Barcelona clima mediterráneo",
  "código postal 46001 plantas",
  "plantas tropicales para Sevilla"
];

interface SearchSuggestionsProps {
  currentQuery: string;
  onSelect: (suggestion: string) => void;
}

const SearchSuggestions = ({ currentQuery, onSelect }: SearchSuggestionsProps) => {
  const { t } = useTranslation();

  const suggestions = SEARCH_SUGGESTIONS
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
