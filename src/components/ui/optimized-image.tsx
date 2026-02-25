import { useState, useRef, useEffect, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { getResponsiveSources, getThumbSources, buildSrcSet } from "@/utils/imageOptimization";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onLoad" | "onError"> {
  /** Show a shimmer/blur placeholder while loading */
  placeholder?: boolean;
  /** Fallback src when image fails to load */
  fallbackSrc?: string;
  /** Aspect ratio class (e.g. "aspect-square", "aspect-[4/3]") applied to wrapper */
  aspectRatio?: string;
  /** Additional wrapper className */
  wrapperClassName?: string;
  /** Hint for responsive sizing: "thumb" for thumbnails, or max pixel width */
  responsiveHint?: "thumb" | number;
}

const FALLBACK = "/placeholder.svg";

/**
 * Optimized image component with:
 * - Native lazy loading + decoding="async"
 * - IntersectionObserver for deferred src (below-the-fold)
 * - <picture> with AVIF / WebP / fallback srcset
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
  sizes,
  responsiveHint,
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

  // Generate responsive sources
  const sources =
    responsiveHint === "thumb"
      ? getThumbSources(effectiveSrc)
      : getResponsiveSources(effectiveSrc, undefined, typeof responsiveHint === "number" ? responsiveHint : undefined);

  const hasResponsive = sources && (sources.avif.length > 0 || sources.webp.length > 0);
  const showPlaceholder = placeholder && !isLoaded && !hasError;

  const defaultSizes = sizes || "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

  const imgClassNames = cn(
    "transition-opacity duration-300",
    showPlaceholder ? "opacity-0" : "opacity-100",
    className
  );

  const imgElement = hasResponsive && isVisible ? (
    <picture>
      {sources!.avif.length > 0 && (
        <source
          type="image/avif"
          srcSet={buildSrcSet(sources!.avif)}
          sizes={defaultSizes}
        />
      )}
      {sources!.webp.length > 0 && (
        <source
          type="image/webp"
          srcSet={buildSrcSet(sources!.webp)}
          sizes={defaultSizes}
        />
      )}
      {sources!.fallback.length > 0 && (
        <source
          srcSet={buildSrcSet(sources!.fallback)}
          sizes={defaultSizes}
        />
      )}
      <img
        ref={imgRef}
        src={isVisible ? sources!.src : undefined}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (!hasError) setHasError(true);
        }}
        className={imgClassNames}
        {...props}
      />
    </picture>
  ) : (
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
      className={imgClassNames}
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
