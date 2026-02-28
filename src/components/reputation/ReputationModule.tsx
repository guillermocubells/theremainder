import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  useUserReputation,
  useUserBadges,
  useRecentContributions,
} from "@/hooks/useUserReputation";
import { ConfidenceMeter, ContributorBadges } from "@/components/reputation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Award,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  review_created: "Reseña publicada",
  vote_given: "Voto dado",
  upvote_received: "Voto recibido",
  comment_created: "Comentario",
  verification_approved: "Verificación aprobada",
  confirmed_abuse: "Penalización",
  grow_entry: "Entrada de cultivo",
  observation_added: "Observación añadida",
};

export default function ReputationModule() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: reputation, isLoading: repLoading } = useUserReputation(user?.id);
  const { data: badges = [], isLoading: badgesLoading } = useUserBadges(user?.id);
  const { data: contributions = [], isLoading: contribLoading } =
    useRecentContributions(user?.id, 8);

  const isLoading = repLoading || badgesLoading || contribLoading;

  if (!user) return null;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          {t("reputation.title", "Reputación")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score & confidence */}
        {isLoading ? (
          <div className="h-12 animate-pulse rounded bg-muted" />
        ) : reputation ? (
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <ConfidenceMeter
                score={reputation.total_score}
                confidence={reputation.confidence}
                level={reputation.level}
              />
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-foreground">
                {reputation.total_score}
              </span>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {t("reputation.points", "puntos")}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-3">
            <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground/50 mb-1" />
            <p className="text-sm text-muted-foreground">
              {t(
                "reputation.noActivity",
                "Contribuye para ganar reputación"
              )}
            </p>
          </div>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {t("reputation.badges", "Insignias ganadas")}
              </h3>
              <ContributorBadges badges={badges} maxVisible={6} />
            </div>
          </>
        )}

        {/* Recent contributions */}
        {contributions.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {t("reputation.recentActivity", "Actividad reciente")}
              </h3>
              <ul className="space-y-1.5">
                {contributions.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {c.delta >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 shrink-0 text-green-600 dark:text-green-400" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 shrink-0 text-destructive" />
                      )}
                      <span className="truncate text-foreground">
                        {ACTION_LABELS[c.action_key] ?? c.action_key}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={c.delta >= 0 ? "secondary" : "destructive"}
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {c.delta > 0 ? "+" : ""}
                        {c.delta}
                      </Badge>
                      <span className="text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDate(c.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
