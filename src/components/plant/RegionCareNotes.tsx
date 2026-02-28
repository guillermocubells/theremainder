import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen, MapPin, Globe, ExternalLink, ThumbsUp, ChevronDown,
  Leaf, Droplets, Sun, Scissors, Bug, Snowflake, Sprout,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useCareNotes, type CareNote } from "@/hooks/useCareNotes";

// ── Category config ──────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { icon: typeof Leaf; labelEs: string; labelEn: string }> = {
  watering:      { icon: Droplets,  labelEs: "Riego",          labelEn: "Watering" },
  light:         { icon: Sun,       labelEs: "Luz",            labelEn: "Light" },
  pruning:       { icon: Scissors,  labelEs: "Poda",           labelEn: "Pruning" },
  fertilizing:   { icon: Sprout,    labelEs: "Fertilización",  labelEn: "Fertilizing" },
  pests:         { icon: Bug,       labelEs: "Plagas",         labelEn: "Pests" },
  winter:        { icon: Snowflake, labelEs: "Invierno",       labelEn: "Winter" },
  general:       { icon: Leaf,      labelEs: "General",        labelEn: "General" },
};

const SEASON_LABELS: Record<string, { es: string; en: string }> = {
  spring: { es: "Primavera", en: "Spring" },
  summer: { es: "Verano",    en: "Summer" },
  autumn: { es: "Otoño",     en: "Autumn" },
  winter: { es: "Invierno",  en: "Winter" },
  all:    { es: "Todo el año", en: "Year-round" },
};

// ── Relevance badge ──────────────────────────────────────────────────

function RelevanceBadge({ relevance, isEs }: { relevance: CareNote["regionRelevance"]; isEs: boolean }) {
  if (relevance === "exact") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 text-[10px] h-5 bg-success-muted text-success-muted-foreground border-success/20">
            <MapPin className="h-2.5 w-2.5" aria-hidden="true" />
            {isEs ? "Tu zona" : "Your zone"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{isEs ? "Verificado para tu zona climática" : "Verified for your climate zone"}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  if (relevance === "country") {
    return (
      <Badge variant="outline" className="gap-1 text-[10px] h-5 bg-info-muted text-info-muted-foreground border-info/20">
        <Globe className="h-2.5 w-2.5" aria-hidden="true" />
        {isEs ? "Tu país" : "Your country"}
      </Badge>
    );
  }
  return null; // fallback — no badge
}

// ── Source attribution ───────────────────────────────────────────────

function SourceAttribution({ note, isEs }: { note: CareNote; isEs: boolean }) {
  if (!note.source_type && !note.source_title) return null;

  const sourceLabel =
    note.source_type === "scientific" ? (isEs ? "Fuente científica" : "Scientific source")
    : note.source_type === "expert" ? (isEs ? "Experto" : "Expert")
    : note.source_type === "community" ? (isEs ? "Comunidad" : "Community")
    : (isEs ? "Fuente" : "Source");

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1.5">
      <BookOpen className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{sourceLabel}</span>
      {note.source_title && <span className="truncate max-w-[160px]">· {note.source_title}</span>}
      {note.source_url && (
        <a
          href={note.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-primary hover:underline shrink-0"
          aria-label={isEs ? "Ver fuente original" : "View original source"}
        >
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      )}
    </div>
  );
}

// ── Single note card ─────────────────────────────────────────────────

function CareNoteCard({ note, isEs }: { note: CareNote; isEs: boolean }) {
  const cat = CATEGORY_CONFIG[note.category] || CATEGORY_CONFIG.general;
  const Icon = cat.icon;
  const catLabel = isEs ? cat.labelEs : cat.labelEn;
  const seasonLabel = note.season ? (isEs ? SEASON_LABELS[note.season]?.es : SEASON_LABELS[note.season]?.en) : null;
  const isFallbackLocale = isEs ? note.locale !== "es" : note.locale !== "en";

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-1.5 transition-colors",
        note.regionRelevance === "exact"
          ? "border-success/20 bg-success-muted/30"
          : "border-border bg-card"
      )}
      role="article"
      aria-label={note.title || catLabel}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground truncate">
            {note.title || catLabel}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <RelevanceBadge relevance={note.regionRelevance} isEs={isEs} />
          {seasonLabel && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {seasonLabel}
            </Badge>
          )}
          {isFallbackLocale && (
            <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground">
              {note.locale.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
        {note.body}
      </p>

      {/* Footer: source + votes */}
      <div className="flex items-center justify-between">
        <SourceAttribution note={note} isEs={isEs} />
        {(note.upvote_count > 0 || note.region_verified) && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {note.upvote_count > 0 && (
              <span className="flex items-center gap-0.5">
                <ThumbsUp className="h-2.5 w-2.5" aria-hidden="true" />
                {note.upvote_count}
              </span>
            )}
            {note.region_verified && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <MapPin className="h-2.5 w-2.5 text-success" aria-label={isEs ? "Verificado regionalmente" : "Region verified"} />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{isEs ? "Verificado por usuarios de esta región" : "Verified by users in this region"}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

interface RegionCareNotesProps {
  plantId: string | undefined;
  className?: string;
  /** How many notes to show before "show more" */
  initialLimit?: number;
}

const RegionCareNotes = ({ plantId, className, initialLimit = 4 }: RegionCareNotesProps) => {
  const { t, i18n } = useTranslation();
  const { data: notes, isLoading } = useCareNotes(plantId);
  const [expanded, setExpanded] = useState(false);
  const isEs = i18n.language.startsWith("es");

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!notes || notes.length === 0) return null;

  const displayed = expanded ? notes : notes.slice(0, initialLimit);
  const hasMore = notes.length > initialLimit;

  // Group by category for a11y landmark
  const regionCount = notes.filter((n) => n.regionRelevance !== "fallback").length;

  return (
    <Card className={className} role="region" aria-label={isEs ? "Notas de cuidado" : "Care notes"}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
            {isEs ? "Notas de cuidado" : "Care notes"}
          </CardTitle>
          {regionCount > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {regionCount} {isEs ? "de tu zona" : "for your zone"}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isEs
            ? "Consejos de la comunidad, priorizados para tu ubicación"
            : "Community tips, prioritized for your location"}
        </p>
      </CardHeader>

      <CardContent className="space-y-2">
        {displayed.map((note) => (
          <CareNoteCard key={note.id} note={note} isEs={isEs} />
        ))}

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 mr-1 transition-transform",
                expanded && "rotate-180"
              )}
            />
            {expanded
              ? (isEs ? "Mostrar menos" : "Show less")
              : (isEs ? `Ver ${notes.length - initialLimit} más` : `Show ${notes.length - initialLimit} more`)}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default RegionCareNotes;
