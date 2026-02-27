import { useState, useMemo } from "react";
import { ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";

/** How many items to show before "show more" */
const INITIAL_VISIBLE = 6;

export interface FacetSectionProps {
  /** Display label for the facet group */
  label: string;
  /** Bucket value → count map */
  buckets: Record<string, number>;
  /** Currently selected values */
  selected: string[];
  /** Toggle a single value */
  onToggle: (value: string) => void;
  /** Clear all selections within this facet */
  onClear: () => void;
  /** Start collapsed? Defaults to collapsed when nothing is selected */
  defaultOpen?: boolean;
}

const FacetSection = ({
  label,
  buckets,
  selected,
  onToggle,
  onClear,
  defaultOpen,
}: FacetSectionProps) => {
  const [open, setOpen] = useState(defaultOpen ?? selected.length > 0);
  const [showAll, setShowAll] = useState(false);

  const entries = useMemo(
    () =>
      Object.entries(buckets)
        .filter(([, count]) => count > 0)
        .sort((a, b) => {
          // selected items first, then by count desc
          const aSelected = selected.includes(a[0]) ? 0 : 1;
          const bSelected = selected.includes(b[0]) ? 0 : 1;
          if (aSelected !== bSelected) return aSelected - bSelected;
          return b[1] - a[1];
        }),
    [buckets, selected]
  );

  const totalCount = useMemo(
    () => entries.reduce((sum, [, c]) => sum + c, 0),
    [entries]
  );

  if (entries.length === 0) return null;

  const visible = showAll ? entries : entries.slice(0, INITIAL_VISIBLE);
  const hiddenCount = entries.length - INITIAL_VISIBLE;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b border-border pb-3">
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-foreground hover:text-primary transition-colors group">
        <span className="flex items-center gap-2">
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="h-5 min-w-[20px] text-[10px] px-1.5">
              {selected.length}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground/50 font-normal">
            ({totalCount})
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-1 space-y-0.5">
        {/* Per-facet clear */}
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive mb-1 -ml-1"
          >
            <X className="h-3 w-3 mr-1" />
            Limpiar {label.toLowerCase()}
          </Button>
        )}

        {visible.map(([value, count]) => {
          const isSelected = selected.includes(value);
          return (
            <label
              key={value}
              className={`flex items-center gap-2 cursor-pointer text-sm py-1 px-1 rounded-sm transition-colors ${
                isSelected
                  ? "text-foreground bg-accent/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/20"
              }`}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggle(value)}
                className="h-4 w-4 shrink-0"
              />
              <span className="flex-1 capitalize truncate">{value.replace(/_/g, " ")}</span>
              <span className="text-[11px] text-muted-foreground/60 tabular-nums shrink-0">
                {count}
              </span>
            </label>
          );
        })}

        {/* Show more / less */}
        {hiddenCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="h-6 px-2 text-[11px] text-primary hover:text-primary/80 mt-1"
          >
            {showAll ? "Ver menos" : `+${hiddenCount} más`}
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default FacetSection;
