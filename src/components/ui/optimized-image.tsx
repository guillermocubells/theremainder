import { useState, useRef, useEffect, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onLoad" | "onError"> {
  /** Show a shimmer/blur placeholder while loading */
  placeholder?: boolean;
  /** Fallback src when image fails to load */
  fallbackSrc?: string;
  /** Aspect ratio class (e.g. "aspect-square", "aspect-[4/3]") applied to wrapper */
  aspectRatio?: string;
  /** Additional wrapper className */
  wrapperClassName?: string;
}

const FALLBACK = "/placeholder.svg";

/**
 * Optimized image component with:
 * - Native lazy loading + decoding="async"
 * - IntersectionObserver for deferred src (below-the-fold)
 * - Shimmer placeholder while loading
 * - Graceful error fallback
 */
export function OptimizedImage({
  src,
  alt = "",
  className,
  placeholder = true,
  fallbackSrc = FALLBACK,
  aspectRatio,
  wrapperClassName,
  loading = "lazy",
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(loading === "eager");
  const imgRef = useRef<HTMLImageElement>(null);

  // Use IntersectionObserver for true lazy rendering (not just lazy attribute)
  useEffect(() => {
    if (loading === "eager") {
      setIsVisible(true);
      return;
    }

    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" } // Start loading 200px before visible
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loading]);

  // Reset state when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const effectiveSrc = hasError ? fallbackSrc : src;
  const showPlaceholder = placeholder && !isLoaded && !hasError;

  const imgElement = (
    <img
      ref={imgRef}
      src={isVisible ? effectiveSrc : undefined}
      alt={alt}
      loading={loading}
      decoding="async"
      onLoad={() => setIsLoaded(true)}
      onError={() => {
        if (!hasError) setHasError(true);
      }}
      className={cn(
        "transition-opacity duration-300",
        showPlaceholder ? "opacity-0" : "opacity-100",
        className
      )}
      {...props}
    />
  );

  if (!placeholder && !aspectRatio) return imgElement;

  return (
    <div className={cn("relative overflow-hidden", aspectRatio, wrapperClassName)}>
      {/* Shimmer placeholder */}
      {showPlaceholder && (
        <div className="absolute inset-0 bg-muted animate-pulse" aria-hidden="true" />
      )}
      {imgElement}
    </div>
  );
}
