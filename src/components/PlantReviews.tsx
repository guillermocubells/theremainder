import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Star, MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { usePlantReviews, useCreateReview } from "@/hooks/usePlantReviews";
import { useReviewVotes } from "@/hooks/useReviewVotes";
import VoteWidget from "@/components/reviews/VoteWidget";
import { toast } from "sonner";

interface PlantReviewsProps {
  plantId: string;
  plantName: string;
}

const PlantReviews = ({ plantId, plantName }: PlantReviewsProps) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { data: reviews = [], isLoading } = usePlantReviews(plantId);
  const createReview = useCreateReview();
  const reviewIds = reviews.map((r) => r.id);
  const { data: userVotes = {} } = useReviewVotes(reviewIds);

  const [showForm, setShowForm] = useState(false);
  const [newReview, setNewReview] = useState({ author: "", rating: 5, comment: "" });

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.info(t('reviews.loginToReview', 'Inicia sesión para escribir una reseña'));
      return;
    }
    if (!newReview.author.trim() || !newReview.comment.trim()) return;

    try {
      await createReview.mutateAsync({
        plant_id: plantId,
        author_name: newReview.author,
        rating: newReview.rating,
        comment: newReview.comment,
      });
      setNewReview({ author: "", rating: 5, comment: "" });
      setShowForm(false);
      toast.success(t('reviews.published', 'Reseña publicada'));
    } catch {
      toast.error(t('reviews.errorPublishing', 'Error al publicar la reseña'));
    }
  };

  const renderStars = (rating: number, interactive = false, onSelect?: (r: number) => void) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onSelect?.(star)}
          className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
        >
          <Star className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
            star <= rating ? 'fill-rating text-rating' : 'fill-rating-muted text-rating-muted'
          }`} />
        </button>
      ))}
    </div>
  );

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-border">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-foreground">{t('reviews.title')}</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-0.5">
              {renderStars(Math.round(Number(averageRating)))}
              <span className="text-xs sm:text-sm text-muted-foreground">
                {averageRating} {t('reviews.of')} 5 ({reviews.length} {reviews.length === 1 ? t('reviews.review') : t('reviews.reviewsCount')})
              </span>
            </div>
          )}
        </div>
        {reviews.length > 0 && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} disabled={!user}>
            {t('reviews.writeReview')}
          </Button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <form onSubmit={handleSubmitReview} className="mb-4 sm:mb-6 p-3 sm:p-4 bg-secondary rounded-lg border border-border">
          <h3 className="font-semibold text-foreground text-sm sm:text-base mb-3 sm:mb-4">
            {t('reviews.yourOpinion')} {plantName}
          </h3>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1">{t('reviews.yourName')}</label>
              <Input
                value={newReview.author}
                onChange={(e) => setNewReview({ ...newReview, author: e.target.value })}
                placeholder={t('reviews.namePlaceholder')}
                className="border-border focus:border-primary text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1">{t('reviews.rating')}</label>
              {renderStars(newReview.rating, true, (rating) => setNewReview({ ...newReview, rating }))}
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1">{t('reviews.yourExperience')}</label>
              <Textarea
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                placeholder={t('reviews.experiencePlaceholder')}
                className="border-border focus:border-primary min-h-[80px] sm:min-h-[100px] text-sm"
                required
              />
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Button type="submit" size="sm" disabled={createReview.isPending}>
                {createReview.isPending ? t('common.loading') : t('reviews.publishReview')}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="text-center py-6 text-muted-foreground text-sm">{t('common.loading')}</div>
      ) : reviews.length === 0 && !showForm ? (
        <div className="text-center py-6 sm:py-8">
          <div className="p-3 bg-muted rounded-full inline-block mb-3">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm sm:text-base mb-1">{t('reviews.noReviews')}</p>
          <p className="text-xs sm:text-sm text-muted-foreground/70 mb-4">{t('reviews.beFirst')}</p>
          <Button onClick={() => { if (user) setShowForm(true); else toast.info(t('reviews.loginToReview', 'Inicia sesión para escribir una reseña')); }}>
            {t('reviews.writeReview')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="p-3 sm:p-4 bg-muted rounded-lg border border-border">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-1.5 bg-secondary rounded-full">
                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-1 mb-1.5">
                    <span className="font-medium text-foreground text-sm">{review.author_name}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-3 mb-1.5">
                    {renderStars(review.rating)}
                    <VoteWidget
                      reviewId={review.id}
                      score={review.score}
                      userVote={userVotes[review.id] ?? null}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs sm:text-sm lg:text-base leading-relaxed">{review.comment}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlantReviews;
