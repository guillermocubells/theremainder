import { useState, useRef, useCallback } from "react";

interface UseImageCarouselProps {
  imagesCount: number;
}

interface UseImageCarouselResult {
  currentIndex: number;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: (e: React.TouchEvent) => void;
  handleClick: (e: React.MouseEvent) => void;
  isSwipingRef: React.MutableRefObject<boolean>;
}

export const useImageCarousel = ({ imagesCount }: UseImageCarouselProps): UseImageCarouselResult => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isSwipingRef = useRef(false);

  const hasMultipleImages = imagesCount > 1;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwipingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = Math.abs(currentX - touchStartX.current);
    const diffY = Math.abs(currentY - touchStartY.current);
    
    // If horizontal swipe is more prominent than vertical, prevent link navigation
    if (diffX > diffY && diffX > 10) {
      isSwipingRef.current = true;
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || !hasMultipleImages) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const swipeThreshold = 50;
    
    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swipe left - next image
        setCurrentIndex(prev => (prev + 1) % imagesCount);
      } else {
        // Swipe right - previous image
        setCurrentIndex(prev => (prev - 1 + imagesCount) % imagesCount);
      }
      isSwipingRef.current = true;
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
  }, [imagesCount, hasMultipleImages]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Prevent navigation if we were swiping
    if (isSwipingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isSwipingRef.current = false;
    }
  }, []);

  return {
    currentIndex,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleClick,
    isSwipingRef
  };
};
