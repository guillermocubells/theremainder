import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Camera, Clock, Eye, EyeOff, Globe } from "lucide-react";
import type { GrowLog } from "@/hooks/garden/useGrowLogs";

const ENTRY_TYPE_LABELS: Record<string, string> = {
  observation: "Observación",
  watering: "Riego",
  fertilizing: "Abono",
  pruning: "Poda",
  repotting: "Trasplante",
  outcome: "Resultado",
};

const VISIBILITY_ICON: Record<string, React.ReactNode> = {
  private: <EyeOff className="h-3.5 w-3.5" />,
  link: <Eye className="h-3.5 w-3.5" />,
  public: <Globe className="h-3.5 w-3.5" />,
};

export default function GrowLogCard({ log }: { log: GrowLog }) {
  const snippet = log.last_entry?.notes
    ? log.last_entry.notes.length > 120
      ? log.last_entry.notes.slice(0, 120) + "…"
      : log.last_entry.notes
    : null;

  return (
    <Link to={`/garden/logs/${log.id}`} className="block group">
      <Card className="overflow-hidden transition-shadow hover:shadow-md border-border">
        <CardContent className="p-0 flex">
          {/* Thumbnail */}
          <div className="w-24 sm:w-32 flex-shrink-0 bg-muted relative">
            {log.last_photo_url ? (
              <img
                src={log.last_photo_url}
                alt={log.title}
                className="w-full h-full object-cover aspect-square"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center aspect-square">
                <BookOpen className="h-8 w-8 text-muted-foreground/40" />
              </div>
            )}
            {/* Entry count badge */}
            <span className="absolute bottom-1 right-1 bg-background/80 backdrop-blur text-xs font-medium px-1.5 py-0.5 rounded-md">
              {log.entry_count}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors text-sm sm:text-base">
                  {log.title}
                </h3>
                <span className="text-muted-foreground flex-shrink-0" title={log.visibility}>
                  {VISIBILITY_ICON[log.visibility]}
                </span>
              </div>

              {log.species && (
                <p className="text-xs text-muted-foreground italic truncate mb-1.5">
                  {log.species}
                </p>
              )}

              {/* Last entry preview */}
              {log.last_entry && (
                <div className="mt-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {ENTRY_TYPE_LABELS[log.last_entry.type] ?? log.last_entry.type}
                    </Badge>
                    {log.last_entry.media_count > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Camera className="h-3 w-3" />
                        {log.last_entry.media_count}
                      </span>
                    )}
                  </div>
                  {snippet && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                      {snippet}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-2">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(log.updated_at), { addSuffix: true, locale: es })}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
