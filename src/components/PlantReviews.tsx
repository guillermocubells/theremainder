import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Star, MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

interface PlantReviewsProps {
  plantId: string;
  plantName: string;
}

const PlantReviews = ({ plantId, plantName }: PlantReviewsProps) => {
  const { t, i18n } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newReview, setNewReview] = useState({
    author: "",
    rating: 5,
    comment: ""
  });

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.author.trim() || !newReview.comment.trim()) return;

    const review: Review = {
      id: `${plantId}-${Date.now()}`,
      author: newReview.author,
      rating: newReview.rating,
      comment: newReview.comment,
      date: new Date().toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };

    setReviews([review, ...reviews]);
    setNewReview({ author: "", rating: 5, comment: "" });
    setShowForm(false);
  };

  const renderStars = (rating: number, interactive = false, onSelect?: (rating: number) => void) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onSelect?.(star)}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
          >
            <Star
              className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                star <= rating
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-gray-200 text-gray-200'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-green-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <div className="p-1 sm:p-1.5 bg-green-100 rounded-lg">
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-green-800">
              {t('reviews.title')}
            </h2>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mt-0.5">
                {renderStars(Math.round(Number(averageRating)))}
                <span className="text-xs sm:text-sm text-gray-600">
                  {averageRating} {t('reviews.of')} 5 ({reviews.length} {reviews.length === 1 ? t('reviews.review') : t('reviews.reviewsCount')})
                </span>
              </div>
            )}
          </div>
        </div>
        
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {t('reviews.writeReview')}
          </Button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <form onSubmit={handleSubmitReview} className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="font-semibold text-gray-800 text-sm sm:text-base mb-3 sm:mb-4">{t('reviews.yourOpinion')} {plantName}</h3>
          
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                {t('reviews.yourName')}
              </label>
              <Input
                value={newReview.author}
                onChange={(e) => setNewReview({ ...newReview, author: e.target.value })}
                placeholder={t('reviews.namePlaceholder')}
                className="border-green-200 focus:border-green-400 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                {t('reviews.rating')}
              </label>
              {renderStars(newReview.rating, true, (rating) => 
                setNewReview({ ...newReview, rating })
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                {t('reviews.yourExperience')}
              </label>
              <Textarea
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                placeholder={t('reviews.experiencePlaceholder')}
                className="border-green-200 focus:border-green-400 min-h-[80px] sm:min-h-[100px] text-sm"
                required
              />
            </div>

            <div className="flex gap-2 sm:gap-3">
              <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm">
                {t('reviews.publishReview')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowForm(false)}
                className="border-gray-300 text-xs sm:text-sm"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-6 sm:py-8">
          <div className="p-3 bg-gray-100 rounded-full inline-block mb-3">
            <MessageSquare className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-600 text-sm sm:text-base mb-1">{t('reviews.noReviews')}</p>
          <p className="text-xs sm:text-sm text-gray-500">
            {t('reviews.beFirst')}
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-100"
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-1.5 bg-green-100 rounded-full">
                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-green-700" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-1 mb-1.5">
                    <span className="font-medium text-gray-800 text-sm">{review.author}</span>
                    <span className="text-xs text-gray-500">{review.date}</span>
                  </div>
                  <div className="mb-1.5">
                    {renderStars(review.rating)}
                  </div>
                  <p className="text-gray-700 text-xs sm:text-sm lg:text-base leading-relaxed">{review.comment}</p>
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
